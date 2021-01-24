function noop() { }
function assign(tar, src) {
    // @ts-ignore
    for (const k in src)
        tar[k] = src[k];
    return tar;
}
function run(fn) {
    return fn();
}
function blank_object() {
    return Object.create(null);
}
function run_all(fns) {
    fns.forEach(run);
}
function is_function(thing) {
    return typeof thing === 'function';
}
function safe_not_equal(a, b) {
    return a != a ? b == b : a !== b || ((a && typeof a === 'object') || typeof a === 'function');
}
function create_slot(definition, ctx, $$scope, fn) {
    if (definition) {
        const slot_ctx = get_slot_context(definition, ctx, $$scope, fn);
        return definition[0](slot_ctx);
    }
}
function get_slot_context(definition, ctx, $$scope, fn) {
    return definition[1] && fn
        ? assign($$scope.ctx.slice(), definition[1](fn(ctx)))
        : $$scope.ctx;
}
function get_slot_changes(definition, $$scope, dirty, fn) {
    if (definition[2] && fn) {
        const lets = definition[2](fn(dirty));
        if ($$scope.dirty === undefined) {
            return lets;
        }
        if (typeof lets === 'object') {
            const merged = [];
            const len = Math.max($$scope.dirty.length, lets.length);
            for (let i = 0; i < len; i += 1) {
                merged[i] = $$scope.dirty[i] | lets[i];
            }
            return merged;
        }
        return $$scope.dirty | lets;
    }
    return $$scope.dirty;
}
function update_slot(slot, slot_definition, ctx, $$scope, dirty, get_slot_changes_fn, get_slot_context_fn) {
    const slot_changes = get_slot_changes(slot_definition, $$scope, dirty, get_slot_changes_fn);
    if (slot_changes) {
        const slot_context = get_slot_context(slot_definition, ctx, $$scope, get_slot_context_fn);
        slot.p(slot_context, slot_changes);
    }
}

function append(target, node) {
    target.appendChild(node);
}
function insert(target, node, anchor) {
    target.insertBefore(node, anchor || null);
}
function detach(node) {
    node.parentNode.removeChild(node);
}
function destroy_each(iterations, detaching) {
    for (let i = 0; i < iterations.length; i += 1) {
        if (iterations[i])
            iterations[i].d(detaching);
    }
}
function element(name) {
    return document.createElement(name);
}
function svg_element(name) {
    return document.createElementNS('http://www.w3.org/2000/svg', name);
}
function text(data) {
    return document.createTextNode(data);
}
function space() {
    return text(' ');
}
function attr(node, attribute, value) {
    if (value == null)
        node.removeAttribute(attribute);
    else if (node.getAttribute(attribute) !== value)
        node.setAttribute(attribute, value);
}
function children(element) {
    return Array.from(element.childNodes);
}
function claim_element(nodes, name, attributes, svg) {
    for (let i = 0; i < nodes.length; i += 1) {
        const node = nodes[i];
        if (node.nodeName === name) {
            let j = 0;
            const remove = [];
            while (j < node.attributes.length) {
                const attribute = node.attributes[j++];
                if (!attributes[attribute.name]) {
                    remove.push(attribute.name);
                }
            }
            for (let k = 0; k < remove.length; k++) {
                node.removeAttribute(remove[k]);
            }
            return nodes.splice(i, 1)[0];
        }
    }
    return svg ? svg_element(name) : element(name);
}
function claim_text(nodes, data) {
    for (let i = 0; i < nodes.length; i += 1) {
        const node = nodes[i];
        if (node.nodeType === 3) {
            node.data = '' + data;
            return nodes.splice(i, 1)[0];
        }
    }
    return text(data);
}
function claim_space(nodes) {
    return claim_text(nodes, ' ');
}
function set_data(text, data) {
    data = '' + data;
    if (text.wholeText !== data)
        text.data = data;
}
function query_selector_all(selector, parent = document.body) {
    return Array.from(parent.querySelectorAll(selector));
}

let current_component;
function set_current_component(component) {
    current_component = component;
}

const dirty_components = [];
const binding_callbacks = [];
const render_callbacks = [];
const flush_callbacks = [];
const resolved_promise = Promise.resolve();
let update_scheduled = false;
function schedule_update() {
    if (!update_scheduled) {
        update_scheduled = true;
        resolved_promise.then(flush);
    }
}
function add_render_callback(fn) {
    render_callbacks.push(fn);
}
let flushing = false;
const seen_callbacks = new Set();
function flush() {
    if (flushing)
        return;
    flushing = true;
    do {
        // first, call beforeUpdate functions
        // and update components
        for (let i = 0; i < dirty_components.length; i += 1) {
            const component = dirty_components[i];
            set_current_component(component);
            update(component.$$);
        }
        dirty_components.length = 0;
        while (binding_callbacks.length)
            binding_callbacks.pop()();
        // then, once components are updated, call
        // afterUpdate functions. This may cause
        // subsequent updates...
        for (let i = 0; i < render_callbacks.length; i += 1) {
            const callback = render_callbacks[i];
            if (!seen_callbacks.has(callback)) {
                // ...so guard against infinite loops
                seen_callbacks.add(callback);
                callback();
            }
        }
        render_callbacks.length = 0;
    } while (dirty_components.length);
    while (flush_callbacks.length) {
        flush_callbacks.pop()();
    }
    update_scheduled = false;
    flushing = false;
    seen_callbacks.clear();
}
function update($$) {
    if ($$.fragment !== null) {
        $$.update();
        run_all($$.before_update);
        const dirty = $$.dirty;
        $$.dirty = [-1];
        $$.fragment && $$.fragment.p($$.ctx, dirty);
        $$.after_update.forEach(add_render_callback);
    }
}
const outroing = new Set();
let outros;
function transition_in(block, local) {
    if (block && block.i) {
        outroing.delete(block);
        block.i(local);
    }
}
function transition_out(block, local, detach, callback) {
    if (block && block.o) {
        if (outroing.has(block))
            return;
        outroing.add(block);
        outros.c.push(() => {
            outroing.delete(block);
            if (callback) {
                if (detach)
                    block.d(1);
                callback();
            }
        });
        block.o(local);
    }
}

function get_spread_update(levels, updates) {
    const update = {};
    const to_null_out = {};
    const accounted_for = { $$scope: 1 };
    let i = levels.length;
    while (i--) {
        const o = levels[i];
        const n = updates[i];
        if (n) {
            for (const key in o) {
                if (!(key in n))
                    to_null_out[key] = 1;
            }
            for (const key in n) {
                if (!accounted_for[key]) {
                    update[key] = n[key];
                    accounted_for[key] = 1;
                }
            }
            levels[i] = n;
        }
        else {
            for (const key in o) {
                accounted_for[key] = 1;
            }
        }
    }
    for (const key in to_null_out) {
        if (!(key in update))
            update[key] = undefined;
    }
    return update;
}
function get_spread_object(spread_props) {
    return typeof spread_props === 'object' && spread_props !== null ? spread_props : {};
}
function create_component(block) {
    block && block.c();
}
function claim_component(block, parent_nodes) {
    block && block.l(parent_nodes);
}
function mount_component(component, target, anchor) {
    const { fragment, on_mount, on_destroy, after_update } = component.$$;
    fragment && fragment.m(target, anchor);
    // onMount happens before the initial afterUpdate
    add_render_callback(() => {
        const new_on_destroy = on_mount.map(run).filter(is_function);
        if (on_destroy) {
            on_destroy.push(...new_on_destroy);
        }
        else {
            // Edge case - component was destroyed immediately,
            // most likely as a result of a binding initialising
            run_all(new_on_destroy);
        }
        component.$$.on_mount = [];
    });
    after_update.forEach(add_render_callback);
}
function destroy_component(component, detaching) {
    const $$ = component.$$;
    if ($$.fragment !== null) {
        run_all($$.on_destroy);
        $$.fragment && $$.fragment.d(detaching);
        // TODO null out other refs, including component.$$ (but need to
        // preserve final state?)
        $$.on_destroy = $$.fragment = null;
        $$.ctx = [];
    }
}
function make_dirty(component, i) {
    if (component.$$.dirty[0] === -1) {
        dirty_components.push(component);
        schedule_update();
        component.$$.dirty.fill(0);
    }
    component.$$.dirty[(i / 31) | 0] |= (1 << (i % 31));
}
function init(component, options, instance, create_fragment, not_equal, props, dirty = [-1]) {
    const parent_component = current_component;
    set_current_component(component);
    const prop_values = options.props || {};
    const $$ = component.$$ = {
        fragment: null,
        ctx: null,
        // state
        props,
        update: noop,
        not_equal,
        bound: blank_object(),
        // lifecycle
        on_mount: [],
        on_destroy: [],
        before_update: [],
        after_update: [],
        context: new Map(parent_component ? parent_component.$$.context : []),
        // everything else
        callbacks: blank_object(),
        dirty
    };
    let ready = false;
    $$.ctx = instance
        ? instance(component, prop_values, (i, ret, ...rest) => {
            const value = rest.length ? rest[0] : ret;
            if ($$.ctx && not_equal($$.ctx[i], $$.ctx[i] = value)) {
                if ($$.bound[i])
                    $$.bound[i](value);
                if (ready)
                    make_dirty(component, i);
            }
            return ret;
        })
        : [];
    $$.update();
    ready = true;
    run_all($$.before_update);
    // `false` as a special case of no DOM component
    $$.fragment = create_fragment ? create_fragment($$.ctx) : false;
    if (options.target) {
        if (options.hydrate) {
            const nodes = children(options.target);
            // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
            $$.fragment && $$.fragment.l(nodes);
            nodes.forEach(detach);
        }
        else {
            // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
            $$.fragment && $$.fragment.c();
        }
        if (options.intro)
            transition_in(component.$$.fragment);
        mount_component(component, options.target, options.anchor);
        flush();
    }
    set_current_component(parent_component);
}
class SvelteComponent {
    $destroy() {
        destroy_component(this, 1);
        this.$destroy = noop;
    }
    $on(type, callback) {
        const callbacks = (this.$$.callbacks[type] || (this.$$.callbacks[type] = []));
        callbacks.push(callback);
        return () => {
            const index = callbacks.indexOf(callback);
            if (index !== -1)
                callbacks.splice(index, 1);
        };
    }
    $set() {
        // overridden by instance, if it has props
    }
}

var __build_img_webp__1 = "91857ea85c3a1298.webp";

var __build_img__1 = "91857ea85c3a1298.png";

var __build_img_webp__0 = "0feeed5331f6367e.webp";

var __build_img__0 = "0feeed5331f6367e.png";

/* src/layout/Header.svelte generated by Svelte v3.24.0 */

function create_fragment(ctx) {
	let header;
	let nav;
	let ul;
	let li0;
	let a0;
	let t0;
	let t1;
	let li1;
	let a1;
	let t2;
	let t3;
	let li2;
	let a2;
	let t4;
	let t5;
	let li3;
	let a3;
	let t6;
	let t7;
	let li4;
	let a4;
	let t8;
	let t9;
	let li5;
	let a5;
	let t10;
	let t11;
	let li6;
	let a6;
	let t12;
	let t13;
	let li7;
	let a7;
	let svg0;
	let path0;
	let t14;
	let a8;
	let svg1;
	let path1;

	return {
		c() {
			header = element("header");
			nav = element("nav");
			ul = element("ul");
			li0 = element("li");
			a0 = element("a");
			t0 = text("Tan Li Hau");
			t1 = space();
			li1 = element("li");
			a1 = element("a");
			t2 = text("About");
			t3 = space();
			li2 = element("li");
			a2 = element("a");
			t4 = text("Writings");
			t5 = space();
			li3 = element("li");
			a3 = element("a");
			t6 = text("Videos");
			t7 = space();
			li4 = element("li");
			a4 = element("a");
			t8 = text("Talks");
			t9 = space();
			li5 = element("li");
			a5 = element("a");
			t10 = text("Notes");
			t11 = space();
			li6 = element("li");
			a6 = element("a");
			t12 = text("Newsletter");
			t13 = space();
			li7 = element("li");
			a7 = element("a");
			svg0 = svg_element("svg");
			path0 = svg_element("path");
			t14 = space();
			a8 = element("a");
			svg1 = svg_element("svg");
			path1 = svg_element("path");
			this.h();
		},
		l(nodes) {
			header = claim_element(nodes, "HEADER", { class: true });
			var header_nodes = children(header);
			nav = claim_element(header_nodes, "NAV", {});
			var nav_nodes = children(nav);
			ul = claim_element(nav_nodes, "UL", { class: true });
			var ul_nodes = children(ul);
			li0 = claim_element(ul_nodes, "LI", { class: true });
			var li0_nodes = children(li0);
			a0 = claim_element(li0_nodes, "A", { href: true, class: true });
			var a0_nodes = children(a0);
			t0 = claim_text(a0_nodes, "Tan Li Hau");
			a0_nodes.forEach(detach);
			li0_nodes.forEach(detach);
			t1 = claim_space(ul_nodes);
			li1 = claim_element(ul_nodes, "LI", { class: true });
			var li1_nodes = children(li1);
			a1 = claim_element(li1_nodes, "A", { href: true, class: true });
			var a1_nodes = children(a1);
			t2 = claim_text(a1_nodes, "About");
			a1_nodes.forEach(detach);
			li1_nodes.forEach(detach);
			t3 = claim_space(ul_nodes);
			li2 = claim_element(ul_nodes, "LI", { class: true });
			var li2_nodes = children(li2);
			a2 = claim_element(li2_nodes, "A", { href: true, class: true });
			var a2_nodes = children(a2);
			t4 = claim_text(a2_nodes, "Writings");
			a2_nodes.forEach(detach);
			li2_nodes.forEach(detach);
			t5 = claim_space(ul_nodes);
			li3 = claim_element(ul_nodes, "LI", { class: true });
			var li3_nodes = children(li3);
			a3 = claim_element(li3_nodes, "A", { href: true, class: true });
			var a3_nodes = children(a3);
			t6 = claim_text(a3_nodes, "Videos");
			a3_nodes.forEach(detach);
			li3_nodes.forEach(detach);
			t7 = claim_space(ul_nodes);
			li4 = claim_element(ul_nodes, "LI", { class: true });
			var li4_nodes = children(li4);
			a4 = claim_element(li4_nodes, "A", { href: true, class: true });
			var a4_nodes = children(a4);
			t8 = claim_text(a4_nodes, "Talks");
			a4_nodes.forEach(detach);
			li4_nodes.forEach(detach);
			t9 = claim_space(ul_nodes);
			li5 = claim_element(ul_nodes, "LI", { class: true });
			var li5_nodes = children(li5);
			a5 = claim_element(li5_nodes, "A", { href: true, class: true });
			var a5_nodes = children(a5);
			t10 = claim_text(a5_nodes, "Notes");
			a5_nodes.forEach(detach);
			li5_nodes.forEach(detach);
			t11 = claim_space(ul_nodes);
			li6 = claim_element(ul_nodes, "LI", { class: true });
			var li6_nodes = children(li6);
			a6 = claim_element(li6_nodes, "A", { href: true, class: true });
			var a6_nodes = children(a6);
			t12 = claim_text(a6_nodes, "Newsletter");
			a6_nodes.forEach(detach);
			li6_nodes.forEach(detach);
			t13 = claim_space(ul_nodes);
			li7 = claim_element(ul_nodes, "LI", { class: true });
			var li7_nodes = children(li7);

			a7 = claim_element(li7_nodes, "A", {
				"aria-label": true,
				href: true,
				class: true
			});

			var a7_nodes = children(a7);

			svg0 = claim_element(
				a7_nodes,
				"svg",
				{
					viewBox: true,
					width: true,
					height: true,
					class: true
				},
				1
			);

			var svg0_nodes = children(svg0);
			path0 = claim_element(svg0_nodes, "path", { d: true }, 1);
			children(path0).forEach(detach);
			svg0_nodes.forEach(detach);
			a7_nodes.forEach(detach);
			t14 = claim_space(li7_nodes);

			a8 = claim_element(li7_nodes, "A", {
				"aria-label": true,
				href: true,
				class: true
			});

			var a8_nodes = children(a8);

			svg1 = claim_element(
				a8_nodes,
				"svg",
				{
					viewBox: true,
					width: true,
					height: true,
					class: true
				},
				1
			);

			var svg1_nodes = children(svg1);
			path1 = claim_element(svg1_nodes, "path", { d: true }, 1);
			children(path1).forEach(detach);
			svg1_nodes.forEach(detach);
			a8_nodes.forEach(detach);
			li7_nodes.forEach(detach);
			ul_nodes.forEach(detach);
			nav_nodes.forEach(detach);
			header_nodes.forEach(detach);
			this.h();
		},
		h() {
			attr(a0, "href", "/");
			attr(a0, "class", "svelte-1axnxyd");
			attr(li0, "class", "svelte-1axnxyd");
			attr(a1, "href", "/about");
			attr(a1, "class", "svelte-1axnxyd");
			attr(li1, "class", "svelte-1axnxyd");
			attr(a2, "href", "/blogs");
			attr(a2, "class", "svelte-1axnxyd");
			attr(li2, "class", "svelte-1axnxyd");
			attr(a3, "href", "/videos");
			attr(a3, "class", "svelte-1axnxyd");
			attr(li3, "class", "svelte-1axnxyd");
			attr(a4, "href", "/talks");
			attr(a4, "class", "svelte-1axnxyd");
			attr(li4, "class", "svelte-1axnxyd");
			attr(a5, "href", "/notes");
			attr(a5, "class", "svelte-1axnxyd");
			attr(li5, "class", "svelte-1axnxyd");
			attr(a6, "href", "/newsletter");
			attr(a6, "class", "svelte-1axnxyd");
			attr(li6, "class", "svelte-1axnxyd");
			attr(path0, "d", "M23 3a10.9 10.9 0 0 1-3.14 1.53 4.48 4.48 0 0 0-7.86 3v1A10.66\n    10.66 0 0 1 3 4s-4 9 5 13a11.64 11.64 0 0 1-7 2c9 5 20 0 20-11.5a4.5\n    4.5 0 0 0-.08-.83A7.72 7.72 0 0 0 23 3z");
			attr(svg0, "viewBox", "0 0 24 24");
			attr(svg0, "width", "1em");
			attr(svg0, "height", "1em");
			attr(svg0, "class", "svelte-1axnxyd");
			attr(a7, "aria-label", "Twitter account");
			attr(a7, "href", "https://twitter.com/lihautan");
			attr(a7, "class", "svelte-1axnxyd");
			attr(path1, "d", "M9 19c-5 1.5-5-2.5-7-3m14 6v-3.87a3.37 3.37 0 0\n    0-.94-2.61c3.14-.35 6.44-1.54 6.44-7A5.44 5.44 0 0 0 20 4.77 5.07\n    5.07 0 0 0 19.91 1S18.73.65 16 2.48a13.38 13.38 0 0 0-7 0C6.27.65\n    5.09 1 5.09 1A5.07 5.07 0 0 0 5 4.77a5.44 5.44 0 0 0-1.5 3.78c0 5.42\n    3.3 6.61 6.44 7A3.37 3.37 0 0 0 9 18.13V22");
			attr(svg1, "viewBox", "0 0 24 24");
			attr(svg1, "width", "1em");
			attr(svg1, "height", "1em");
			attr(svg1, "class", "svelte-1axnxyd");
			attr(a8, "aria-label", "Github account");
			attr(a8, "href", "https://github.com/tanhauhau");
			attr(a8, "class", "svelte-1axnxyd");
			attr(li7, "class", "social svelte-1axnxyd");
			attr(ul, "class", "svelte-1axnxyd");
			attr(header, "class", "svelte-1axnxyd");
		},
		m(target, anchor) {
			insert(target, header, anchor);
			append(header, nav);
			append(nav, ul);
			append(ul, li0);
			append(li0, a0);
			append(a0, t0);
			append(ul, t1);
			append(ul, li1);
			append(li1, a1);
			append(a1, t2);
			append(ul, t3);
			append(ul, li2);
			append(li2, a2);
			append(a2, t4);
			append(ul, t5);
			append(ul, li3);
			append(li3, a3);
			append(a3, t6);
			append(ul, t7);
			append(ul, li4);
			append(li4, a4);
			append(a4, t8);
			append(ul, t9);
			append(ul, li5);
			append(li5, a5);
			append(a5, t10);
			append(ul, t11);
			append(ul, li6);
			append(li6, a6);
			append(a6, t12);
			append(ul, t13);
			append(ul, li7);
			append(li7, a7);
			append(a7, svg0);
			append(svg0, path0);
			append(li7, t14);
			append(li7, a8);
			append(a8, svg1);
			append(svg1, path1);
		},
		p: noop,
		i: noop,
		o: noop,
		d(detaching) {
			if (detaching) detach(header);
		}
	};
}

class Header extends SvelteComponent {
	constructor(options) {
		super();
		init(this, options, null, create_fragment, safe_not_equal, {});
	}
}

var baseCss = "https://lihautan.com/notes/svelte-with-prism/assets/blog-base-248115e4.css";

var image = "https://lihautan.com/notes/svelte-with-prism/assets/hero-twitter-ccb986e5.jpg";

/* src/layout/note.svelte generated by Svelte v3.24.0 */

function get_each_context(ctx, list, i) {
	const child_ctx = ctx.slice();
	child_ctx[6] = list[i];
	return child_ctx;
}

function get_each_context_1(ctx, list, i) {
	const child_ctx = ctx.slice();
	child_ctx[6] = list[i];
	return child_ctx;
}

// (25:2) {#each tags as tag}
function create_each_block_1(ctx) {
	let meta;
	let meta_content_value;

	return {
		c() {
			meta = element("meta");
			this.h();
		},
		l(nodes) {
			meta = claim_element(nodes, "META", { name: true, content: true });
			this.h();
		},
		h() {
			attr(meta, "name", "keywords");
			attr(meta, "content", meta_content_value = /*tag*/ ctx[6]);
		},
		m(target, anchor) {
			insert(target, meta, anchor);
		},
		p(ctx, dirty) {
			if (dirty & /*tags*/ 4 && meta_content_value !== (meta_content_value = /*tag*/ ctx[6])) {
				attr(meta, "content", meta_content_value);
			}
		},
		d(detaching) {
			if (detaching) detach(meta);
		}
	};
}

// (43:2) {#each tags as tag}
function create_each_block(ctx) {
	let span;
	let t_value = /*tag*/ ctx[6] + "";
	let t;

	return {
		c() {
			span = element("span");
			t = text(t_value);
			this.h();
		},
		l(nodes) {
			span = claim_element(nodes, "SPAN", { class: true });
			var span_nodes = children(span);
			t = claim_text(span_nodes, t_value);
			span_nodes.forEach(detach);
			this.h();
		},
		h() {
			attr(span, "class", "svelte-8ynu44");
		},
		m(target, anchor) {
			insert(target, span, anchor);
			append(span, t);
		},
		p(ctx, dirty) {
			if (dirty & /*tags*/ 4 && t_value !== (t_value = /*tag*/ ctx[6] + "")) set_data(t, t_value);
		},
		d(detaching) {
			if (detaching) detach(span);
		}
	};
}

function create_fragment$1(ctx) {
	let title_value;
	let link;
	let meta0;
	let meta1;
	let meta2;
	let meta3;
	let meta4;
	let meta5;
	let meta6;
	let meta7;
	let meta8;
	let t0;
	let a;
	let t1;
	let t2;
	let header;
	let t3;
	let main;
	let h1;
	let t4;
	let t5;
	let t6;
	let article;
	let current;
	document.title = title_value = "Note: " + /*title*/ ctx[1] + " | Tan Li Hau";
	let each_value_1 = /*tags*/ ctx[2];
	let each_blocks_1 = [];

	for (let i = 0; i < each_value_1.length; i += 1) {
		each_blocks_1[i] = create_each_block_1(get_each_context_1(ctx, each_value_1, i));
	}

	header = new Header({});
	let each_value = /*tags*/ ctx[2];
	let each_blocks = [];

	for (let i = 0; i < each_value.length; i += 1) {
		each_blocks[i] = create_each_block(get_each_context(ctx, each_value, i));
	}

	const default_slot_template = /*$$slots*/ ctx[4].default;
	const default_slot = create_slot(default_slot_template, ctx, /*$$scope*/ ctx[3], null);

	return {
		c() {
			link = element("link");
			meta0 = element("meta");
			meta1 = element("meta");
			meta2 = element("meta");
			meta3 = element("meta");

			for (let i = 0; i < each_blocks_1.length; i += 1) {
				each_blocks_1[i].c();
			}

			meta4 = element("meta");
			meta5 = element("meta");
			meta6 = element("meta");
			meta7 = element("meta");
			meta8 = element("meta");
			t0 = space();
			a = element("a");
			t1 = text("Skip to content");
			t2 = space();
			create_component(header.$$.fragment);
			t3 = space();
			main = element("main");
			h1 = element("h1");
			t4 = text(/*title*/ ctx[1]);
			t5 = space();

			for (let i = 0; i < each_blocks.length; i += 1) {
				each_blocks[i].c();
			}

			t6 = space();
			article = element("article");
			if (default_slot) default_slot.c();
			this.h();
		},
		l(nodes) {
			const head_nodes = query_selector_all("[data-svelte=\"svelte-179iwio\"]", document.head);
			link = claim_element(head_nodes, "LINK", { href: true, rel: true });
			meta0 = claim_element(head_nodes, "META", { name: true, content: true });
			meta1 = claim_element(head_nodes, "META", { name: true, content: true });
			meta2 = claim_element(head_nodes, "META", { name: true, content: true });
			meta3 = claim_element(head_nodes, "META", { name: true, content: true });

			for (let i = 0; i < each_blocks_1.length; i += 1) {
				each_blocks_1[i].l(head_nodes);
			}

			meta4 = claim_element(head_nodes, "META", { name: true, content: true });
			meta5 = claim_element(head_nodes, "META", { name: true, content: true });
			meta6 = claim_element(head_nodes, "META", { name: true, content: true });
			meta7 = claim_element(head_nodes, "META", { name: true, content: true });
			meta8 = claim_element(head_nodes, "META", { itemprop: true, content: true });
			head_nodes.forEach(detach);
			t0 = claim_space(nodes);
			a = claim_element(nodes, "A", { href: true, class: true });
			var a_nodes = children(a);
			t1 = claim_text(a_nodes, "Skip to content");
			a_nodes.forEach(detach);
			t2 = claim_space(nodes);
			claim_component(header.$$.fragment, nodes);
			t3 = claim_space(nodes);
			main = claim_element(nodes, "MAIN", { id: true, class: true });
			var main_nodes = children(main);
			h1 = claim_element(main_nodes, "H1", {});
			var h1_nodes = children(h1);
			t4 = claim_text(h1_nodes, /*title*/ ctx[1]);
			h1_nodes.forEach(detach);
			t5 = claim_space(main_nodes);

			for (let i = 0; i < each_blocks.length; i += 1) {
				each_blocks[i].l(main_nodes);
			}

			t6 = claim_space(main_nodes);
			article = claim_element(main_nodes, "ARTICLE", { class: true });
			var article_nodes = children(article);
			if (default_slot) default_slot.l(article_nodes);
			article_nodes.forEach(detach);
			main_nodes.forEach(detach);
			this.h();
		},
		h() {
			attr(link, "href", baseCss);
			attr(link, "rel", "stylesheet");
			attr(meta0, "name", "image");
			attr(meta0, "content", image);
			attr(meta1, "name", "og:image");
			attr(meta1, "content", image);
			attr(meta2, "name", "og:title");
			attr(meta2, "content", /*name*/ ctx[0]);
			attr(meta3, "name", "og:type");
			attr(meta3, "content", "website");
			attr(meta4, "name", "twitter:card");
			attr(meta4, "content", "summary_large_image");
			attr(meta5, "name", "twitter:creator");
			attr(meta5, "content", "@lihautan");
			attr(meta6, "name", "twitter:title");
			attr(meta6, "content", /*title*/ ctx[1]);
			attr(meta7, "name", "twitter:image");
			attr(meta7, "content", image);
			attr(meta8, "itemprop", "url");
			attr(meta8, "content", "https%3A%2F%2Flihautan.com%2Fnotes%2Fsvelte-with-prism");
			attr(a, "href", "#content");
			attr(a, "class", "skip svelte-8ynu44");
			attr(article, "class", "svelte-8ynu44");
			attr(main, "id", "content");
			attr(main, "class", "blog svelte-8ynu44");
		},
		m(target, anchor) {
			append(document.head, link);
			append(document.head, meta0);
			append(document.head, meta1);
			append(document.head, meta2);
			append(document.head, meta3);

			for (let i = 0; i < each_blocks_1.length; i += 1) {
				each_blocks_1[i].m(document.head, null);
			}

			append(document.head, meta4);
			append(document.head, meta5);
			append(document.head, meta6);
			append(document.head, meta7);
			append(document.head, meta8);
			insert(target, t0, anchor);
			insert(target, a, anchor);
			append(a, t1);
			insert(target, t2, anchor);
			mount_component(header, target, anchor);
			insert(target, t3, anchor);
			insert(target, main, anchor);
			append(main, h1);
			append(h1, t4);
			append(main, t5);

			for (let i = 0; i < each_blocks.length; i += 1) {
				each_blocks[i].m(main, null);
			}

			append(main, t6);
			append(main, article);

			if (default_slot) {
				default_slot.m(article, null);
			}

			current = true;
		},
		p(ctx, [dirty]) {
			if ((!current || dirty & /*title*/ 2) && title_value !== (title_value = "Note: " + /*title*/ ctx[1] + " | Tan Li Hau")) {
				document.title = title_value;
			}

			if (!current || dirty & /*name*/ 1) {
				attr(meta2, "content", /*name*/ ctx[0]);
			}

			if (dirty & /*tags*/ 4) {
				each_value_1 = /*tags*/ ctx[2];
				let i;

				for (i = 0; i < each_value_1.length; i += 1) {
					const child_ctx = get_each_context_1(ctx, each_value_1, i);

					if (each_blocks_1[i]) {
						each_blocks_1[i].p(child_ctx, dirty);
					} else {
						each_blocks_1[i] = create_each_block_1(child_ctx);
						each_blocks_1[i].c();
						each_blocks_1[i].m(meta4.parentNode, meta4);
					}
				}

				for (; i < each_blocks_1.length; i += 1) {
					each_blocks_1[i].d(1);
				}

				each_blocks_1.length = each_value_1.length;
			}

			if (!current || dirty & /*title*/ 2) {
				attr(meta6, "content", /*title*/ ctx[1]);
			}

			if (!current || dirty & /*title*/ 2) set_data(t4, /*title*/ ctx[1]);

			if (dirty & /*tags*/ 4) {
				each_value = /*tags*/ ctx[2];
				let i;

				for (i = 0; i < each_value.length; i += 1) {
					const child_ctx = get_each_context(ctx, each_value, i);

					if (each_blocks[i]) {
						each_blocks[i].p(child_ctx, dirty);
					} else {
						each_blocks[i] = create_each_block(child_ctx);
						each_blocks[i].c();
						each_blocks[i].m(main, t6);
					}
				}

				for (; i < each_blocks.length; i += 1) {
					each_blocks[i].d(1);
				}

				each_blocks.length = each_value.length;
			}

			if (default_slot) {
				if (default_slot.p && dirty & /*$$scope*/ 8) {
					update_slot(default_slot, default_slot_template, ctx, /*$$scope*/ ctx[3], dirty, null, null);
				}
			}
		},
		i(local) {
			if (current) return;
			transition_in(header.$$.fragment, local);
			transition_in(default_slot, local);
			current = true;
		},
		o(local) {
			transition_out(header.$$.fragment, local);
			transition_out(default_slot, local);
			current = false;
		},
		d(detaching) {
			detach(link);
			detach(meta0);
			detach(meta1);
			detach(meta2);
			detach(meta3);
			destroy_each(each_blocks_1, detaching);
			detach(meta4);
			detach(meta5);
			detach(meta6);
			detach(meta7);
			detach(meta8);
			if (detaching) detach(t0);
			if (detaching) detach(a);
			if (detaching) detach(t2);
			destroy_component(header, detaching);
			if (detaching) detach(t3);
			if (detaching) detach(main);
			destroy_each(each_blocks, detaching);
			if (default_slot) default_slot.d(detaching);
		}
	};
}

function instance($$self, $$props, $$invalidate) {
	let { name } = $$props;
	let { title } = $$props;
	let { tags = [] } = $$props;
	let { $$slots = {}, $$scope } = $$props;

	$$self.$set = $$props => {
		if ("name" in $$props) $$invalidate(0, name = $$props.name);
		if ("title" in $$props) $$invalidate(1, title = $$props.title);
		if ("tags" in $$props) $$invalidate(2, tags = $$props.tags);
		if ("$$scope" in $$props) $$invalidate(3, $$scope = $$props.$$scope);
	};

	return [name, title, tags, $$scope, $$slots];
}

class Note extends SvelteComponent {
	constructor(options) {
		super();
		init(this, options, instance, create_fragment$1, safe_not_equal, { name: 0, title: 1, tags: 2 });
	}
}

/* content/notes/svelte-with-prism/@@page-markup.svelte generated by Svelte v3.24.0 */

function create_default_slot(ctx) {
	let section0;
	let ul1;
	let li0;
	let a0;
	let t0;
	let li1;
	let a1;
	let t1;
	let li2;
	let a2;
	let t2;
	let ul0;
	let li3;
	let a3;
	let t3;
	let li4;
	let a4;
	let t4;
	let t5;
	let p0;
	let t6;
	let a5;
	let t7;
	let t8;
	let a6;
	let t9;
	let t10;
	let a7;
	let t11;
	let t12;
	let t13;
	let section1;
	let h20;
	let a8;
	let t14;
	let t15;
	let ul2;
	let li5;
	let t16;
	let code0;
	let t17;
	let t18;
	let t19;
	let li6;
	let t20;
	let code1;
	let t21;
	let t22;
	let code2;
	let t23;
	let t24;
	let t25;
	let li7;
	let t26;
	let code3;
	let t27;
	let t28;
	let t29;
	let section2;
	let h21;
	let a9;
	let t30;
	let t31;
	let pre0;

	let raw0_value = `<code class="language-svelte"><span class="token tag"><span class="token tag"><span class="token punctuation">&lt;</span>script</span><span class="token punctuation">></span></span><span class="token script"><span class="token language-javascript">
  <span class="token keyword">import</span> Prism <span class="token keyword">from</span> <span class="token string">'prismjs'</span><span class="token punctuation">;</span>
  <span class="token keyword">export</span> <span class="token keyword">let</span> code<span class="token punctuation">;</span>
  <span class="token keyword">export</span> <span class="token keyword">let</span> language<span class="token punctuation">;</span>
</span></span><span class="token tag"><span class="token tag"><span class="token punctuation">&lt;/</span>script</span><span class="token punctuation">></span></span>

<span class="token tag"><span class="token tag"><span class="token punctuation">&lt;</span>div</span> <span class="token attr-name">class</span><span class="token attr-value"><span class="token punctuation">=</span><span class="token punctuation">"</span>code<span class="token punctuation">"</span></span><span class="token punctuation">></span></span>
  <span class="token language-javascript"><span class="token punctuation">&#123;</span>@html Prism<span class="token punctuation">.</span><span class="token function">highlight</span><span class="token punctuation">(</span>code<span class="token punctuation">,</span> Prism<span class="token punctuation">.</span>languages<span class="token punctuation">[</span>language<span class="token punctuation">]</span><span class="token punctuation">)</span><span class="token punctuation">&#125;</span></span>
<span class="token tag"><span class="token tag"><span class="token punctuation">&lt;/</span>div</span><span class="token punctuation">></span></span>

<span class="token tag"><span class="token tag"><span class="token punctuation">&lt;</span><span class="token namespace">svelte:</span>head</span><span class="token punctuation">></span></span>
  <span class="token tag"><span class="token tag"><span class="token punctuation">&lt;</span>link</span> <span class="token attr-name">href</span><span class="token attr-value"><span class="token punctuation">=</span><span class="token punctuation">"</span>https://cdnjs.cloudflare.com/ajax/libs/prism/1.22.0/themes/prism-dark.min.css<span class="token punctuation">"</span></span> <span class="token attr-name">rel</span><span class="token attr-value"><span class="token punctuation">=</span><span class="token punctuation">"</span>stylesheet<span class="token punctuation">"</span></span> <span class="token punctuation">/></span></span>
<span class="token tag"><span class="token tag"><span class="token punctuation">&lt;/</span><span class="token namespace">svelte:</span>head</span><span class="token punctuation">></span></span>

<span class="token tag"><span class="token tag"><span class="token punctuation">&lt;</span>style</span><span class="token punctuation">></span></span><span class="token style"><span class="token language-css">
  <span class="token selector">.code</span> <span class="token punctuation">&#123;</span>
    <span class="token property">white-space</span><span class="token punctuation">:</span> pre-wrap<span class="token punctuation">;</span>
  <span class="token punctuation">&#125;</span>
</span></span><span class="token tag"><span class="token tag"><span class="token punctuation">&lt;/</span>style</span><span class="token punctuation">></span></span></code>` + "";

	let t32;
	let section3;
	let h22;
	let a10;
	let t33;
	let t34;
	let p1;
	let t35;
	let code4;
	let t36;
	let t37;
	let t38;
	let pre1;

	let raw1_value = `<code class="language-svelte"><span class="token tag"><span class="token tag"><span class="token punctuation">&lt;</span>script</span><span class="token punctuation">></span></span><span class="token script"><span class="token language-javascript">
  <span class="token keyword">import</span> Prism <span class="token keyword">from</span> <span class="token string">'prismjs'</span><span class="token punctuation">;</span>
  <span class="token keyword">let</span> code <span class="token operator">=</span> <span class="token string">'console.log("Hello world");'</span><span class="token punctuation">;</span>
  <span class="token keyword">let</span> html <span class="token operator">=</span> Prism<span class="token punctuation">.</span><span class="token function">highlight</span><span class="token punctuation">(</span>code<span class="token punctuation">,</span> Prism<span class="token punctuation">.</span>languages<span class="token punctuation">.</span>javascript<span class="token punctuation">)</span><span class="token punctuation">;</span>
</span></span><span class="token tag"><span class="token tag"><span class="token punctuation">&lt;/</span>script</span><span class="token punctuation">></span></span></code>` + "";

	let t39;
	let p2;
	let t40;
	let code5;
	let t41;
	let t42;
	let pre2;

	let raw2_value = `<code class="language-svelte"><span class="token tag"><span class="token tag"><span class="token punctuation">&lt;</span>script</span><span class="token punctuation">></span></span><span class="token script"><span class="token language-javascript">
  <span class="token keyword">import</span> Prism <span class="token keyword">from</span> <span class="token string">'prismjs'</span><span class="token punctuation">;</span>
  <span class="token keyword">let</span> code <span class="token operator">=</span> <span class="token string">'console.log("Hello world");'</span><span class="token punctuation">;</span>
</span></span><span class="token tag"><span class="token tag"><span class="token punctuation">&lt;/</span>script</span><span class="token punctuation">></span></span>

<span class="token language-javascript"><span class="token punctuation">&#123;</span>@html Prism<span class="token punctuation">.</span><span class="token function">highlight</span><span class="token punctuation">(</span>code<span class="token punctuation">,</span> Prism<span class="token punctuation">.</span>languages<span class="token punctuation">.</span>javascript<span class="token punctuation">)</span><span class="token punctuation">&#125;</span></span></code>` + "";

	let t43;
	let p3;
	let t44;
	let t45;
	let pre3;

	let raw3_value = `<code class="language-svelte"><span class="token tag"><span class="token tag"><span class="token punctuation">&lt;</span>script</span><span class="token punctuation">></span></span><span class="token script"><span class="token language-javascript">
  <span class="token keyword">import</span> Prism <span class="token keyword">from</span> <span class="token string">'prismjs'</span><span class="token punctuation">;</span>
  <span class="token keyword">let</span> code <span class="token operator">=</span> <span class="token string">'console.log("Hello world");'</span><span class="token punctuation">;</span>

  <span class="token keyword">function</span> <span class="token function">prism</span><span class="token punctuation">(</span><span class="token parameter">node<span class="token punctuation">,</span> code</span><span class="token punctuation">)</span> <span class="token punctuation">&#123;</span>
    node<span class="token punctuation">.</span>innerHTML <span class="token operator">=</span> Prism<span class="token punctuation">.</span><span class="token function">highlight</span><span class="token punctuation">(</span>code<span class="token punctuation">,</span> Prism<span class="token punctuation">.</span>languages<span class="token punctuation">.</span>javascript<span class="token punctuation">)</span><span class="token punctuation">;</span>
    <span class="token keyword">return</span> <span class="token punctuation">&#123;</span>
      <span class="token function">update</span><span class="token punctuation">(</span><span class="token parameter">code</span><span class="token punctuation">)</span> <span class="token punctuation">&#123;</span>
        node<span class="token punctuation">.</span>innerHTML <span class="token operator">=</span> Prism<span class="token punctuation">.</span><span class="token function">highlight</span><span class="token punctuation">(</span>code<span class="token punctuation">,</span> Prism<span class="token punctuation">.</span>languages<span class="token punctuation">.</span>javascript<span class="token punctuation">)</span><span class="token punctuation">;</span>
      <span class="token punctuation">&#125;</span>
    <span class="token punctuation">&#125;</span>
  <span class="token punctuation">&#125;</span>
</span></span><span class="token tag"><span class="token tag"><span class="token punctuation">&lt;/</span>script</span><span class="token punctuation">></span></span>

<span class="token tag"><span class="token tag"><span class="token punctuation">&lt;</span>div</span> <span class="token attr-name"><span class="token namespace">use:</span>prism=</span><span class="token language-javascript"><span class="token punctuation">&#123;</span>code<span class="token punctuation">&#125;</span></span> <span class="token punctuation">/></span></span></code>` + "";

	let t46;
	let p4;
	let picture0;
	let source0;
	let source1;
	let img0;
	let t47;
	let p5;
	let t48;
	let code6;
	let t49;
	let t50;
	let t51;
	let pre4;

	let raw4_value = `<code class="language-svelte"><span class="token tag"><span class="token tag"><span class="token punctuation">&lt;</span><span class="token namespace">svelte:</span>head</span><span class="token punctuation">></span></span>
  <span class="token tag"><span class="token tag"><span class="token punctuation">&lt;</span>link</span> <span class="token attr-name">href</span><span class="token attr-value"><span class="token punctuation">=</span><span class="token punctuation">"</span>https://cdnjs.cloudflare.com/ajax/libs/prism/1.22.0/themes/prism-dark.min.css<span class="token punctuation">"</span></span> <span class="token attr-name">rel</span><span class="token attr-value"><span class="token punctuation">=</span><span class="token punctuation">"</span>stylesheet<span class="token punctuation">"</span></span> <span class="token punctuation">/></span></span>
<span class="token tag"><span class="token tag"><span class="token punctuation">&lt;/</span><span class="token namespace">svelte:</span>head</span><span class="token punctuation">></span></span>

<span class="token tag"><span class="token tag"><span class="token punctuation">&lt;</span>script</span><span class="token punctuation">></span></span><span class="token script"><span class="token language-javascript">
  <span class="token keyword">import</span> Prism <span class="token keyword">from</span> <span class="token string">'prismjs'</span><span class="token punctuation">;</span>
  <span class="token keyword">let</span> code <span class="token operator">=</span> <span class="token string">'console.log("Hello world");'</span><span class="token punctuation">;</span>
</span></span><span class="token tag"><span class="token tag"><span class="token punctuation">&lt;/</span>script</span><span class="token punctuation">></span></span>

<span class="token language-javascript"><span class="token punctuation">&#123;</span>@html Prism<span class="token punctuation">.</span><span class="token function">highlight</span><span class="token punctuation">(</span>code<span class="token punctuation">,</span> Prism<span class="token punctuation">.</span>languages<span class="token punctuation">.</span>javascript<span class="token punctuation">)</span><span class="token punctuation">&#125;</span></span></code>` + "";

	let t52;
	let p6;
	let t53;
	let a11;
	let t54;
	let t55;
	let t56;
	let p7;
	let t57;
	let t58;
	let p8;
	let picture1;
	let source2;
	let source3;
	let img1;
	let t59;
	let p9;
	let t60;
	let code7;
	let t61;
	let t62;
	let t63;
	let p10;
	let t64;
	let code8;
	let t65;
	let t66;
	let t67;
	let pre5;

	let raw5_value = `<code class="language-svelte"><span class="token tag"><span class="token tag"><span class="token punctuation">&lt;</span>pre</span><span class="token punctuation">></span></span>
  <span class="token language-javascript"><span class="token punctuation">&#123;</span>@html html<span class="token punctuation">&#125;</span></span>
<span class="token tag"><span class="token tag"><span class="token punctuation">&lt;/</span>pre</span><span class="token punctuation">></span></span></code>` + "";

	let t68;
	let p11;
	let t69;
	let code9;
	let t70;
	let t71;
	let code10;
	let t72;
	let t73;
	let t74;
	let pre6;
	let raw6_value = `<code class="language-svelte">&#123;@html html.replace(/&#92;n/g, '<span class="token tag"><span class="token tag"><span class="token punctuation">&lt;</span>br</span> <span class="token punctuation">/></span></span>')&#125;</code>` + "";
	let t75;
	let p12;
	let t76;
	let t77;
	let pre7;

	let raw7_value = `<code class="language-svelte"><span class="token tag"><span class="token tag"><span class="token punctuation">&lt;</span>div</span><span class="token punctuation">></span></span>
  <span class="token language-javascript"><span class="token punctuation">&#123;</span>@html html<span class="token punctuation">&#125;</span></span>
<span class="token tag"><span class="token tag"><span class="token punctuation">&lt;/</span>div</span><span class="token punctuation">></span></span>

<span class="token tag"><span class="token tag"><span class="token punctuation">&lt;</span>style</span><span class="token punctuation">></span></span><span class="token style"><span class="token language-css">
  <span class="token selector">div</span> <span class="token punctuation">&#123;</span>
    <span class="token property">white-space</span><span class="token punctuation">:</span> pre-wrap<span class="token punctuation">;</span>
  <span class="token punctuation">&#125;</span>
</span></span><span class="token tag"><span class="token tag"><span class="token punctuation">&lt;/</span>style</span><span class="token punctuation">></span></span></code>` + "";

	let t78;
	let p13;
	let t79;
	let code11;
	let t80;
	let t81;
	let code12;
	let t82;
	let t83;
	let t84;
	let pre8;

	let raw8_value = `<code class="language-svelte">&#123;@html html
  .split('&#92;n')
  .map(str => str.replace(/^(\s+)/, (_, space) => '<span class="token tag"><span class="token tag"><span class="token punctuation">&lt;</span>span</span> <span class="token attr-name">class</span><span class="token attr-value"><span class="token punctuation">=</span><span class="token punctuation">"</span>tab<span class="token punctuation">"</span></span><span class="token punctuation">></span></span><span class="token tag"><span class="token tag"><span class="token punctuation">&lt;/</span>span</span><span class="token punctuation">></span></span>'.repeat(space.length)))
  .join('<span class="token tag"><span class="token tag"><span class="token punctuation">&lt;</span>br</span> <span class="token punctuation">/></span></span>')&#125;

<span class="token tag"><span class="token tag"><span class="token punctuation">&lt;</span>style</span><span class="token punctuation">></span></span><span class="token style"><span class="token language-css">
  <span class="token selector">:global(span.tab)</span> <span class="token punctuation">&#123;</span>
    <span class="token property">display</span><span class="token punctuation">:</span> inline-block<span class="token punctuation">;</span>
    <span class="token property">width</span><span class="token punctuation">:</span> 2ch<span class="token punctuation">;</span>
  <span class="token punctuation">&#125;</span>
</span></span><span class="token tag"><span class="token tag"><span class="token punctuation">&lt;/</span>style</span><span class="token punctuation">></span></span></code>` + "";

	let t85;
	let p14;
	let t86;
	let t87;
	let section4;
	let h30;
	let a12;
	let t88;
	let code13;
	let t89;
	let t90;
	let pre9;

	let raw9_value = `<code class="language-svelte"><span class="token tag"><span class="token tag"><span class="token punctuation">&lt;</span>script</span><span class="token punctuation">></span></span>
	import Prism from 'prismjs';
  import 'prism-svelte';
  let code = &#96;
<span class="token each"><span class="token punctuation">&#123;</span><span class="token keyword">#each</span> <span class="token language-javascript">list </span><span class="token keyword">as</span> <span class="token language-javascript">item<span class="token punctuation">&#125;</span></span></span>
  <span class="token tag"><span class="token tag"><span class="token punctuation">&lt;</span>div</span><span class="token punctuation">></span></span><span class="token language-javascript"><span class="token punctuation">&#123;</span>item<span class="token punctuation">&#125;</span></span><span class="token tag"><span class="token tag"><span class="token punctuation">&lt;/</span>div</span><span class="token punctuation">></span></span>
<span class="token language-javascript"><span class="token punctuation">&#123;</span><span class="token operator">/</span>each<span class="token punctuation">&#125;</span></span>&#96;.trim();
<span class="token tag"><span class="token tag"><span class="token punctuation">&lt;</span>script</span><span class="token punctuation">></span></span>

<span class="token language-javascript"><span class="token punctuation">&#123;</span>@html Prism<span class="token punctuation">.</span><span class="token function">highlight</span><span class="token punctuation">(</span>code<span class="token punctuation">,</span> Prism<span class="token punctuation">.</span>languages<span class="token punctuation">.</span>svelte<span class="token punctuation">)</span><span class="token punctuation">&#125;</span></span></code>` + "";

	let t91;
	let section5;
	let h31;
	let a13;
	let t92;
	let code14;
	let t93;
	let t94;
	let pre10;

	let raw10_value = `<code class="language-svelte"><span class="token tag"><span class="token tag"><span class="token punctuation">&lt;</span>script</span><span class="token punctuation">></span></span><span class="token script"><span class="token language-javascript">
	<span class="token keyword">import</span> Prism <span class="token keyword">from</span> <span class="token string">'prismjs'</span><span class="token punctuation">;</span>
	<span class="token keyword">import</span> <span class="token string">'prismjs/components/prism-diff'</span><span class="token punctuation">;</span>
	<span class="token keyword">import</span> <span class="token string">'prismjs/plugins/diff-highlight/prism-diff-highlight'</span><span class="token punctuation">;</span>

	<span class="token keyword">let</span> code <span class="token operator">=</span> <span class="token template-string"><span class="token template-punctuation string">&#96;</span><span class="token string">
+ console.log('a');
- console.log('b');
  console.log('c');
</span><span class="token template-punctuation string">&#96;</span></span>
</span></span><span class="token tag"><span class="token tag"><span class="token punctuation">&lt;/</span>script</span><span class="token punctuation">></span></span>

<span class="token tag"><span class="token tag"><span class="token punctuation">&lt;</span>div</span><span class="token punctuation">></span></span>
	<span class="token language-javascript"><span class="token punctuation">&#123;</span>@html Prism<span class="token punctuation">.</span><span class="token function">highlight</span><span class="token punctuation">(</span>code<span class="token punctuation">,</span> Prism<span class="token punctuation">.</span>languages<span class="token punctuation">[</span><span class="token string">'diff'</span><span class="token punctuation">]</span><span class="token punctuation">,</span> <span class="token string">'diff-javascript'</span><span class="token punctuation">)</span><span class="token punctuation">&#125;</span></span>
<span class="token tag"><span class="token tag"><span class="token punctuation">&lt;/</span>div</span><span class="token punctuation">></span></span></code>` + "";

	return {
		c() {
			section0 = element("section");
			ul1 = element("ul");
			li0 = element("li");
			a0 = element("a");
			t0 = text("tl;dr");
			li1 = element("li");
			a1 = element("a");
			t1 = text("Snippet");
			li2 = element("li");
			a2 = element("a");
			t2 = text("Highlighting with Prism");
			ul0 = element("ul");
			li3 = element("li");
			a3 = element("a");
			t3 = text("With  prism-svelte");
			li4 = element("li");
			a4 = element("a");
			t4 = text("With  diff-highlight");
			t5 = space();
			p0 = element("p");
			t6 = text("I've been using Svelte to show code snippets, such as ");
			a5 = element("a");
			t7 = text("this");
			t8 = text(" and ");
			a6 = element("a");
			t9 = text("this");
			t10 = text(", in which the code are dynamically generated and highlighted in the browser. In these examples, I used ");
			a7 = element("a");
			t11 = text("Prism");
			t12 = text(" to do syntax highlighting.");
			t13 = space();
			section1 = element("section");
			h20 = element("h2");
			a8 = element("a");
			t14 = text("tl;dr");
			t15 = space();
			ul2 = element("ul");
			li5 = element("li");
			t16 = text("Prism provides an API, ");
			code0 = element("code");
			t17 = text("Prism.highlight(code, language)");
			t18 = text(", which returns a highlighted HTML.");
			t19 = space();
			li6 = element("li");
			t20 = text("Use ");
			code1 = element("code");
			t21 = text("{@html}");
			t22 = text(" or Svelte actions, ");
			code2 = element("code");
			t23 = text("use:");
			t24 = text(" to insert the highlighted HTML into Svelte component");
			t25 = space();
			li7 = element("li");
			t26 = text("Need special handling of ");
			code3 = element("code");
			t27 = text("\\n");
			t28 = text(" newline character, space and tab character.");
			t29 = space();
			section2 = element("section");
			h21 = element("h2");
			a9 = element("a");
			t30 = text("Snippet");
			t31 = space();
			pre0 = element("pre");
			t32 = space();
			section3 = element("section");
			h22 = element("h2");
			a10 = element("a");
			t33 = text("Highlighting with Prism");
			t34 = space();
			p1 = element("p");
			t35 = text("Prism provides an API ");
			code4 = element("code");
			t36 = text("Prism.highlight(code, language)");
			t37 = text(", which returns a highlighted HTML:");
			t38 = space();
			pre1 = element("pre");
			t39 = space();
			p2 = element("p");
			t40 = text("To insert the HTML into the Svelte component, you can use ");
			code5 = element("code");
			t41 = text("{@html}");
			t42 = space();
			pre2 = element("pre");
			t43 = space();
			p3 = element("p");
			t44 = text("or Svelte actions");
			t45 = space();
			pre3 = element("pre");
			t46 = space();
			p4 = element("p");
			picture0 = element("picture");
			source0 = element("source");
			source1 = element("source");
			img0 = element("img");
			t47 = space();
			p5 = element("p");
			t48 = text("At this point, you may not see any syntax highlighting yet, that's because you need to add ");
			code6 = element("code");
			t49 = text("prism.css");
			t50 = text(" or any other prism theme CSS.");
			t51 = space();
			pre4 = element("pre");
			t52 = space();
			p6 = element("p");
			t53 = text("You can find more Prism themes over ");
			a11 = element("a");
			t54 = text("prism themes");
			t55 = text(".");
			t56 = space();
			p7 = element("p");
			t57 = text("If you have a multiline code, you may notice that they all appear in 1 single line.");
			t58 = space();
			p8 = element("p");
			picture1 = element("picture");
			source2 = element("source");
			source3 = element("source");
			img1 = element("img");
			t59 = space();
			p9 = element("p");
			t60 = text("That's because Prism syntax highlighting still maintains the newline character ");
			code7 = element("code");
			t61 = text("\\n");
			t62 = text(".");
			t63 = space();
			p10 = element("p");
			t64 = text("You can either wrap the html within a ");
			code8 = element("code");
			t65 = text("<pre>");
			t66 = text(" tag:");
			t67 = space();
			pre5 = element("pre");
			t68 = space();
			p11 = element("p");
			t69 = text("or, replace all the ");
			code9 = element("code");
			t70 = text("\\n");
			t71 = text(" to ");
			code10 = element("code");
			t72 = text("<br />");
			t73 = text(":");
			t74 = space();
			pre6 = element("pre");
			t75 = space();
			p12 = element("p");
			t76 = text("or, with CSS:");
			t77 = space();
			pre7 = element("pre");
			t78 = space();
			p13 = element("p");
			t79 = text("However, if you are not using the CSS ");
			code11 = element("code");
			t80 = text("white-space");
			t81 = text(" property or a ");
			code12 = element("code");
			t82 = text("<pre>");
			t83 = text(" tag, you may need to preserve white-space such as tab or space in the beginning of each line too, for proper indentation of your code:");
			t84 = space();
			pre8 = element("pre");
			t85 = space();
			p14 = element("p");
			t86 = text("To support syntax highlighting for different languages, you can install them. In most cases, they will be enhancing the Prism \"automatically\"");
			t87 = space();
			section4 = element("section");
			h30 = element("h3");
			a12 = element("a");
			t88 = text("With ");
			code13 = element("code");
			t89 = text("prism-svelte");
			t90 = space();
			pre9 = element("pre");
			t91 = space();
			section5 = element("section");
			h31 = element("h3");
			a13 = element("a");
			t92 = text("With ");
			code14 = element("code");
			t93 = text("diff-highlight");
			t94 = space();
			pre10 = element("pre");
			this.h();
		},
		l(nodes) {
			section0 = claim_element(nodes, "SECTION", {});
			var section0_nodes = children(section0);

			ul1 = claim_element(section0_nodes, "UL", {
				class: true,
				id: true,
				role: true,
				"aria-label": true
			});

			var ul1_nodes = children(ul1);
			li0 = claim_element(ul1_nodes, "LI", {});
			var li0_nodes = children(li0);
			a0 = claim_element(li0_nodes, "A", { href: true });
			var a0_nodes = children(a0);
			t0 = claim_text(a0_nodes, "tl;dr");
			a0_nodes.forEach(detach);
			li0_nodes.forEach(detach);
			li1 = claim_element(ul1_nodes, "LI", {});
			var li1_nodes = children(li1);
			a1 = claim_element(li1_nodes, "A", { href: true });
			var a1_nodes = children(a1);
			t1 = claim_text(a1_nodes, "Snippet");
			a1_nodes.forEach(detach);
			li1_nodes.forEach(detach);
			li2 = claim_element(ul1_nodes, "LI", {});
			var li2_nodes = children(li2);
			a2 = claim_element(li2_nodes, "A", { href: true });
			var a2_nodes = children(a2);
			t2 = claim_text(a2_nodes, "Highlighting with Prism");
			a2_nodes.forEach(detach);
			li2_nodes.forEach(detach);
			ul0 = claim_element(ul1_nodes, "UL", {});
			var ul0_nodes = children(ul0);
			li3 = claim_element(ul0_nodes, "LI", {});
			var li3_nodes = children(li3);
			a3 = claim_element(li3_nodes, "A", { href: true });
			var a3_nodes = children(a3);
			t3 = claim_text(a3_nodes, "With  prism-svelte");
			a3_nodes.forEach(detach);
			li3_nodes.forEach(detach);
			li4 = claim_element(ul0_nodes, "LI", {});
			var li4_nodes = children(li4);
			a4 = claim_element(li4_nodes, "A", { href: true });
			var a4_nodes = children(a4);
			t4 = claim_text(a4_nodes, "With  diff-highlight");
			a4_nodes.forEach(detach);
			li4_nodes.forEach(detach);
			ul0_nodes.forEach(detach);
			ul1_nodes.forEach(detach);
			section0_nodes.forEach(detach);
			t5 = claim_space(nodes);
			p0 = claim_element(nodes, "P", {});
			var p0_nodes = children(p0);
			t6 = claim_text(p0_nodes, "I've been using Svelte to show code snippets, such as ");
			a5 = claim_element(p0_nodes, "A", { href: true, rel: true });
			var a5_nodes = children(a5);
			t7 = claim_text(a5_nodes, "this");
			a5_nodes.forEach(detach);
			t8 = claim_text(p0_nodes, " and ");
			a6 = claim_element(p0_nodes, "A", { href: true, rel: true });
			var a6_nodes = children(a6);
			t9 = claim_text(a6_nodes, "this");
			a6_nodes.forEach(detach);
			t10 = claim_text(p0_nodes, ", in which the code are dynamically generated and highlighted in the browser. In these examples, I used ");
			a7 = claim_element(p0_nodes, "A", { href: true, rel: true });
			var a7_nodes = children(a7);
			t11 = claim_text(a7_nodes, "Prism");
			a7_nodes.forEach(detach);
			t12 = claim_text(p0_nodes, " to do syntax highlighting.");
			p0_nodes.forEach(detach);
			t13 = claim_space(nodes);
			section1 = claim_element(nodes, "SECTION", {});
			var section1_nodes = children(section1);
			h20 = claim_element(section1_nodes, "H2", {});
			var h20_nodes = children(h20);
			a8 = claim_element(h20_nodes, "A", { href: true, id: true });
			var a8_nodes = children(a8);
			t14 = claim_text(a8_nodes, "tl;dr");
			a8_nodes.forEach(detach);
			h20_nodes.forEach(detach);
			t15 = claim_space(section1_nodes);
			ul2 = claim_element(section1_nodes, "UL", {});
			var ul2_nodes = children(ul2);
			li5 = claim_element(ul2_nodes, "LI", {});
			var li5_nodes = children(li5);
			t16 = claim_text(li5_nodes, "Prism provides an API, ");
			code0 = claim_element(li5_nodes, "CODE", {});
			var code0_nodes = children(code0);
			t17 = claim_text(code0_nodes, "Prism.highlight(code, language)");
			code0_nodes.forEach(detach);
			t18 = claim_text(li5_nodes, ", which returns a highlighted HTML.");
			li5_nodes.forEach(detach);
			t19 = claim_space(ul2_nodes);
			li6 = claim_element(ul2_nodes, "LI", {});
			var li6_nodes = children(li6);
			t20 = claim_text(li6_nodes, "Use ");
			code1 = claim_element(li6_nodes, "CODE", {});
			var code1_nodes = children(code1);
			t21 = claim_text(code1_nodes, "{@html}");
			code1_nodes.forEach(detach);
			t22 = claim_text(li6_nodes, " or Svelte actions, ");
			code2 = claim_element(li6_nodes, "CODE", {});
			var code2_nodes = children(code2);
			t23 = claim_text(code2_nodes, "use:");
			code2_nodes.forEach(detach);
			t24 = claim_text(li6_nodes, " to insert the highlighted HTML into Svelte component");
			li6_nodes.forEach(detach);
			t25 = claim_space(ul2_nodes);
			li7 = claim_element(ul2_nodes, "LI", {});
			var li7_nodes = children(li7);
			t26 = claim_text(li7_nodes, "Need special handling of ");
			code3 = claim_element(li7_nodes, "CODE", {});
			var code3_nodes = children(code3);
			t27 = claim_text(code3_nodes, "\\n");
			code3_nodes.forEach(detach);
			t28 = claim_text(li7_nodes, " newline character, space and tab character.");
			li7_nodes.forEach(detach);
			ul2_nodes.forEach(detach);
			section1_nodes.forEach(detach);
			t29 = claim_space(nodes);
			section2 = claim_element(nodes, "SECTION", {});
			var section2_nodes = children(section2);
			h21 = claim_element(section2_nodes, "H2", {});
			var h21_nodes = children(h21);
			a9 = claim_element(h21_nodes, "A", { href: true, id: true });
			var a9_nodes = children(a9);
			t30 = claim_text(a9_nodes, "Snippet");
			a9_nodes.forEach(detach);
			h21_nodes.forEach(detach);
			t31 = claim_space(section2_nodes);
			pre0 = claim_element(section2_nodes, "PRE", { class: true });
			var pre0_nodes = children(pre0);
			pre0_nodes.forEach(detach);
			section2_nodes.forEach(detach);
			t32 = claim_space(nodes);
			section3 = claim_element(nodes, "SECTION", {});
			var section3_nodes = children(section3);
			h22 = claim_element(section3_nodes, "H2", {});
			var h22_nodes = children(h22);
			a10 = claim_element(h22_nodes, "A", { href: true, id: true });
			var a10_nodes = children(a10);
			t33 = claim_text(a10_nodes, "Highlighting with Prism");
			a10_nodes.forEach(detach);
			h22_nodes.forEach(detach);
			t34 = claim_space(section3_nodes);
			p1 = claim_element(section3_nodes, "P", {});
			var p1_nodes = children(p1);
			t35 = claim_text(p1_nodes, "Prism provides an API ");
			code4 = claim_element(p1_nodes, "CODE", {});
			var code4_nodes = children(code4);
			t36 = claim_text(code4_nodes, "Prism.highlight(code, language)");
			code4_nodes.forEach(detach);
			t37 = claim_text(p1_nodes, ", which returns a highlighted HTML:");
			p1_nodes.forEach(detach);
			t38 = claim_space(section3_nodes);
			pre1 = claim_element(section3_nodes, "PRE", { class: true });
			var pre1_nodes = children(pre1);
			pre1_nodes.forEach(detach);
			t39 = claim_space(section3_nodes);
			p2 = claim_element(section3_nodes, "P", {});
			var p2_nodes = children(p2);
			t40 = claim_text(p2_nodes, "To insert the HTML into the Svelte component, you can use ");
			code5 = claim_element(p2_nodes, "CODE", {});
			var code5_nodes = children(code5);
			t41 = claim_text(code5_nodes, "{@html}");
			code5_nodes.forEach(detach);
			p2_nodes.forEach(detach);
			t42 = claim_space(section3_nodes);
			pre2 = claim_element(section3_nodes, "PRE", { class: true });
			var pre2_nodes = children(pre2);
			pre2_nodes.forEach(detach);
			t43 = claim_space(section3_nodes);
			p3 = claim_element(section3_nodes, "P", {});
			var p3_nodes = children(p3);
			t44 = claim_text(p3_nodes, "or Svelte actions");
			p3_nodes.forEach(detach);
			t45 = claim_space(section3_nodes);
			pre3 = claim_element(section3_nodes, "PRE", { class: true });
			var pre3_nodes = children(pre3);
			pre3_nodes.forEach(detach);
			t46 = claim_space(section3_nodes);
			p4 = claim_element(section3_nodes, "P", {});
			var p4_nodes = children(p4);
			picture0 = claim_element(p4_nodes, "PICTURE", {});
			var picture0_nodes = children(picture0);
			source0 = claim_element(picture0_nodes, "SOURCE", { type: true, srcset: true });
			source1 = claim_element(picture0_nodes, "SOURCE", { type: true, srcset: true });

			img0 = claim_element(picture0_nodes, "IMG", {
				title: true,
				alt: true,
				"data-src": true,
				loading: true
			});

			picture0_nodes.forEach(detach);
			p4_nodes.forEach(detach);
			t47 = claim_space(section3_nodes);
			p5 = claim_element(section3_nodes, "P", {});
			var p5_nodes = children(p5);
			t48 = claim_text(p5_nodes, "At this point, you may not see any syntax highlighting yet, that's because you need to add ");
			code6 = claim_element(p5_nodes, "CODE", {});
			var code6_nodes = children(code6);
			t49 = claim_text(code6_nodes, "prism.css");
			code6_nodes.forEach(detach);
			t50 = claim_text(p5_nodes, " or any other prism theme CSS.");
			p5_nodes.forEach(detach);
			t51 = claim_space(section3_nodes);
			pre4 = claim_element(section3_nodes, "PRE", { class: true });
			var pre4_nodes = children(pre4);
			pre4_nodes.forEach(detach);
			t52 = claim_space(section3_nodes);
			p6 = claim_element(section3_nodes, "P", {});
			var p6_nodes = children(p6);
			t53 = claim_text(p6_nodes, "You can find more Prism themes over ");
			a11 = claim_element(p6_nodes, "A", { href: true, rel: true });
			var a11_nodes = children(a11);
			t54 = claim_text(a11_nodes, "prism themes");
			a11_nodes.forEach(detach);
			t55 = claim_text(p6_nodes, ".");
			p6_nodes.forEach(detach);
			t56 = claim_space(section3_nodes);
			p7 = claim_element(section3_nodes, "P", {});
			var p7_nodes = children(p7);
			t57 = claim_text(p7_nodes, "If you have a multiline code, you may notice that they all appear in 1 single line.");
			p7_nodes.forEach(detach);
			t58 = claim_space(section3_nodes);
			p8 = claim_element(section3_nodes, "P", {});
			var p8_nodes = children(p8);
			picture1 = claim_element(p8_nodes, "PICTURE", {});
			var picture1_nodes = children(picture1);
			source2 = claim_element(picture1_nodes, "SOURCE", { type: true, srcset: true });
			source3 = claim_element(picture1_nodes, "SOURCE", { type: true, srcset: true });

			img1 = claim_element(picture1_nodes, "IMG", {
				title: true,
				alt: true,
				"data-src": true,
				loading: true
			});

			picture1_nodes.forEach(detach);
			p8_nodes.forEach(detach);
			t59 = claim_space(section3_nodes);
			p9 = claim_element(section3_nodes, "P", {});
			var p9_nodes = children(p9);
			t60 = claim_text(p9_nodes, "That's because Prism syntax highlighting still maintains the newline character ");
			code7 = claim_element(p9_nodes, "CODE", {});
			var code7_nodes = children(code7);
			t61 = claim_text(code7_nodes, "\\n");
			code7_nodes.forEach(detach);
			t62 = claim_text(p9_nodes, ".");
			p9_nodes.forEach(detach);
			t63 = claim_space(section3_nodes);
			p10 = claim_element(section3_nodes, "P", {});
			var p10_nodes = children(p10);
			t64 = claim_text(p10_nodes, "You can either wrap the html within a ");
			code8 = claim_element(p10_nodes, "CODE", {});
			var code8_nodes = children(code8);
			t65 = claim_text(code8_nodes, "<pre>");
			code8_nodes.forEach(detach);
			t66 = claim_text(p10_nodes, " tag:");
			p10_nodes.forEach(detach);
			t67 = claim_space(section3_nodes);
			pre5 = claim_element(section3_nodes, "PRE", { class: true });
			var pre5_nodes = children(pre5);
			pre5_nodes.forEach(detach);
			t68 = claim_space(section3_nodes);
			p11 = claim_element(section3_nodes, "P", {});
			var p11_nodes = children(p11);
			t69 = claim_text(p11_nodes, "or, replace all the ");
			code9 = claim_element(p11_nodes, "CODE", {});
			var code9_nodes = children(code9);
			t70 = claim_text(code9_nodes, "\\n");
			code9_nodes.forEach(detach);
			t71 = claim_text(p11_nodes, " to ");
			code10 = claim_element(p11_nodes, "CODE", {});
			var code10_nodes = children(code10);
			t72 = claim_text(code10_nodes, "<br />");
			code10_nodes.forEach(detach);
			t73 = claim_text(p11_nodes, ":");
			p11_nodes.forEach(detach);
			t74 = claim_space(section3_nodes);
			pre6 = claim_element(section3_nodes, "PRE", { class: true });
			var pre6_nodes = children(pre6);
			pre6_nodes.forEach(detach);
			t75 = claim_space(section3_nodes);
			p12 = claim_element(section3_nodes, "P", {});
			var p12_nodes = children(p12);
			t76 = claim_text(p12_nodes, "or, with CSS:");
			p12_nodes.forEach(detach);
			t77 = claim_space(section3_nodes);
			pre7 = claim_element(section3_nodes, "PRE", { class: true });
			var pre7_nodes = children(pre7);
			pre7_nodes.forEach(detach);
			t78 = claim_space(section3_nodes);
			p13 = claim_element(section3_nodes, "P", {});
			var p13_nodes = children(p13);
			t79 = claim_text(p13_nodes, "However, if you are not using the CSS ");
			code11 = claim_element(p13_nodes, "CODE", {});
			var code11_nodes = children(code11);
			t80 = claim_text(code11_nodes, "white-space");
			code11_nodes.forEach(detach);
			t81 = claim_text(p13_nodes, " property or a ");
			code12 = claim_element(p13_nodes, "CODE", {});
			var code12_nodes = children(code12);
			t82 = claim_text(code12_nodes, "<pre>");
			code12_nodes.forEach(detach);
			t83 = claim_text(p13_nodes, " tag, you may need to preserve white-space such as tab or space in the beginning of each line too, for proper indentation of your code:");
			p13_nodes.forEach(detach);
			t84 = claim_space(section3_nodes);
			pre8 = claim_element(section3_nodes, "PRE", { class: true });
			var pre8_nodes = children(pre8);
			pre8_nodes.forEach(detach);
			t85 = claim_space(section3_nodes);
			p14 = claim_element(section3_nodes, "P", {});
			var p14_nodes = children(p14);
			t86 = claim_text(p14_nodes, "To support syntax highlighting for different languages, you can install them. In most cases, they will be enhancing the Prism \"automatically\"");
			p14_nodes.forEach(detach);
			section3_nodes.forEach(detach);
			t87 = claim_space(nodes);
			section4 = claim_element(nodes, "SECTION", {});
			var section4_nodes = children(section4);
			h30 = claim_element(section4_nodes, "H3", {});
			var h30_nodes = children(h30);
			a12 = claim_element(h30_nodes, "A", { href: true, id: true });
			var a12_nodes = children(a12);
			t88 = claim_text(a12_nodes, "With ");
			code13 = claim_element(a12_nodes, "CODE", {});
			var code13_nodes = children(code13);
			t89 = claim_text(code13_nodes, "prism-svelte");
			code13_nodes.forEach(detach);
			a12_nodes.forEach(detach);
			h30_nodes.forEach(detach);
			t90 = claim_space(section4_nodes);
			pre9 = claim_element(section4_nodes, "PRE", { class: true });
			var pre9_nodes = children(pre9);
			pre9_nodes.forEach(detach);
			section4_nodes.forEach(detach);
			t91 = claim_space(nodes);
			section5 = claim_element(nodes, "SECTION", {});
			var section5_nodes = children(section5);
			h31 = claim_element(section5_nodes, "H3", {});
			var h31_nodes = children(h31);
			a13 = claim_element(h31_nodes, "A", { href: true, id: true });
			var a13_nodes = children(a13);
			t92 = claim_text(a13_nodes, "With ");
			code14 = claim_element(a13_nodes, "CODE", {});
			var code14_nodes = children(code14);
			t93 = claim_text(code14_nodes, "diff-highlight");
			code14_nodes.forEach(detach);
			a13_nodes.forEach(detach);
			h31_nodes.forEach(detach);
			t94 = claim_space(section5_nodes);
			pre10 = claim_element(section5_nodes, "PRE", { class: true });
			var pre10_nodes = children(pre10);
			pre10_nodes.forEach(detach);
			section5_nodes.forEach(detach);
			this.h();
		},
		h() {
			attr(a0, "href", "#tl-dr");
			attr(a1, "href", "#snippet");
			attr(a2, "href", "#highlighting-with-prism");
			attr(a3, "href", "#with-prism-svelte");
			attr(a4, "href", "#with-diff-highlight");
			attr(ul1, "class", "sitemap");
			attr(ul1, "id", "sitemap");
			attr(ul1, "role", "navigation");
			attr(ul1, "aria-label", "Table of Contents");
			attr(a5, "href", "https://svelte.dev/repl/30153d68324d475189d34afa26a3186f?version=3.29.0");
			attr(a5, "rel", "nofollow");
			attr(a6, "href", "https://svelte.dev/repl/51e813279e2247809426f40d88faf84e?version=3.29.0");
			attr(a6, "rel", "nofollow");
			attr(a7, "href", "https://prismjs.com/");
			attr(a7, "rel", "nofollow");
			attr(a8, "href", "#tl-dr");
			attr(a8, "id", "tl-dr");
			attr(a9, "href", "#snippet");
			attr(a9, "id", "snippet");
			attr(pre0, "class", "language-svelte");
			attr(a10, "href", "#highlighting-with-prism");
			attr(a10, "id", "highlighting-with-prism");
			attr(pre1, "class", "language-svelte");
			attr(pre2, "class", "language-svelte");
			attr(pre3, "class", "language-svelte");
			attr(source0, "type", "image/webp");
			attr(source0, "srcset", __build_img_webp__0);
			attr(source1, "type", "image/jpeg");
			attr(source1, "srcset", __build_img__0);
			attr(img0, "title", "null");
			attr(img0, "alt", "no css");
			attr(img0, "data-src", __build_img__0);
			attr(img0, "loading", "lazy");
			attr(pre4, "class", "language-svelte");
			attr(a11, "href", "https://github.com/PrismJS/prism-themes");
			attr(a11, "rel", "nofollow");
			attr(source2, "type", "image/webp");
			attr(source2, "srcset", __build_img_webp__1);
			attr(source3, "type", "image/jpeg");
			attr(source3, "srcset", __build_img__1);
			attr(img1, "title", "null");
			attr(img1, "alt", "multiline");
			attr(img1, "data-src", __build_img__1);
			attr(img1, "loading", "lazy");
			attr(pre5, "class", "language-svelte");
			attr(pre6, "class", "language-svelte");
			attr(pre7, "class", "language-svelte");
			attr(pre8, "class", "language-svelte");
			attr(a12, "href", "#with-prism-svelte");
			attr(a12, "id", "with-prism-svelte");
			attr(pre9, "class", "language-svelte");
			attr(a13, "href", "#with-diff-highlight");
			attr(a13, "id", "with-diff-highlight");
			attr(pre10, "class", "language-svelte");
		},
		m(target, anchor) {
			insert(target, section0, anchor);
			append(section0, ul1);
			append(ul1, li0);
			append(li0, a0);
			append(a0, t0);
			append(ul1, li1);
			append(li1, a1);
			append(a1, t1);
			append(ul1, li2);
			append(li2, a2);
			append(a2, t2);
			append(ul1, ul0);
			append(ul0, li3);
			append(li3, a3);
			append(a3, t3);
			append(ul0, li4);
			append(li4, a4);
			append(a4, t4);
			insert(target, t5, anchor);
			insert(target, p0, anchor);
			append(p0, t6);
			append(p0, a5);
			append(a5, t7);
			append(p0, t8);
			append(p0, a6);
			append(a6, t9);
			append(p0, t10);
			append(p0, a7);
			append(a7, t11);
			append(p0, t12);
			insert(target, t13, anchor);
			insert(target, section1, anchor);
			append(section1, h20);
			append(h20, a8);
			append(a8, t14);
			append(section1, t15);
			append(section1, ul2);
			append(ul2, li5);
			append(li5, t16);
			append(li5, code0);
			append(code0, t17);
			append(li5, t18);
			append(ul2, t19);
			append(ul2, li6);
			append(li6, t20);
			append(li6, code1);
			append(code1, t21);
			append(li6, t22);
			append(li6, code2);
			append(code2, t23);
			append(li6, t24);
			append(ul2, t25);
			append(ul2, li7);
			append(li7, t26);
			append(li7, code3);
			append(code3, t27);
			append(li7, t28);
			insert(target, t29, anchor);
			insert(target, section2, anchor);
			append(section2, h21);
			append(h21, a9);
			append(a9, t30);
			append(section2, t31);
			append(section2, pre0);
			pre0.innerHTML = raw0_value;
			insert(target, t32, anchor);
			insert(target, section3, anchor);
			append(section3, h22);
			append(h22, a10);
			append(a10, t33);
			append(section3, t34);
			append(section3, p1);
			append(p1, t35);
			append(p1, code4);
			append(code4, t36);
			append(p1, t37);
			append(section3, t38);
			append(section3, pre1);
			pre1.innerHTML = raw1_value;
			append(section3, t39);
			append(section3, p2);
			append(p2, t40);
			append(p2, code5);
			append(code5, t41);
			append(section3, t42);
			append(section3, pre2);
			pre2.innerHTML = raw2_value;
			append(section3, t43);
			append(section3, p3);
			append(p3, t44);
			append(section3, t45);
			append(section3, pre3);
			pre3.innerHTML = raw3_value;
			append(section3, t46);
			append(section3, p4);
			append(p4, picture0);
			append(picture0, source0);
			append(picture0, source1);
			append(picture0, img0);
			append(section3, t47);
			append(section3, p5);
			append(p5, t48);
			append(p5, code6);
			append(code6, t49);
			append(p5, t50);
			append(section3, t51);
			append(section3, pre4);
			pre4.innerHTML = raw4_value;
			append(section3, t52);
			append(section3, p6);
			append(p6, t53);
			append(p6, a11);
			append(a11, t54);
			append(p6, t55);
			append(section3, t56);
			append(section3, p7);
			append(p7, t57);
			append(section3, t58);
			append(section3, p8);
			append(p8, picture1);
			append(picture1, source2);
			append(picture1, source3);
			append(picture1, img1);
			append(section3, t59);
			append(section3, p9);
			append(p9, t60);
			append(p9, code7);
			append(code7, t61);
			append(p9, t62);
			append(section3, t63);
			append(section3, p10);
			append(p10, t64);
			append(p10, code8);
			append(code8, t65);
			append(p10, t66);
			append(section3, t67);
			append(section3, pre5);
			pre5.innerHTML = raw5_value;
			append(section3, t68);
			append(section3, p11);
			append(p11, t69);
			append(p11, code9);
			append(code9, t70);
			append(p11, t71);
			append(p11, code10);
			append(code10, t72);
			append(p11, t73);
			append(section3, t74);
			append(section3, pre6);
			pre6.innerHTML = raw6_value;
			append(section3, t75);
			append(section3, p12);
			append(p12, t76);
			append(section3, t77);
			append(section3, pre7);
			pre7.innerHTML = raw7_value;
			append(section3, t78);
			append(section3, p13);
			append(p13, t79);
			append(p13, code11);
			append(code11, t80);
			append(p13, t81);
			append(p13, code12);
			append(code12, t82);
			append(p13, t83);
			append(section3, t84);
			append(section3, pre8);
			pre8.innerHTML = raw8_value;
			append(section3, t85);
			append(section3, p14);
			append(p14, t86);
			insert(target, t87, anchor);
			insert(target, section4, anchor);
			append(section4, h30);
			append(h30, a12);
			append(a12, t88);
			append(a12, code13);
			append(code13, t89);
			append(section4, t90);
			append(section4, pre9);
			pre9.innerHTML = raw9_value;
			insert(target, t91, anchor);
			insert(target, section5, anchor);
			append(section5, h31);
			append(h31, a13);
			append(a13, t92);
			append(a13, code14);
			append(code14, t93);
			append(section5, t94);
			append(section5, pre10);
			pre10.innerHTML = raw10_value;
		},
		p: noop,
		d(detaching) {
			if (detaching) detach(section0);
			if (detaching) detach(t5);
			if (detaching) detach(p0);
			if (detaching) detach(t13);
			if (detaching) detach(section1);
			if (detaching) detach(t29);
			if (detaching) detach(section2);
			if (detaching) detach(t32);
			if (detaching) detach(section3);
			if (detaching) detach(t87);
			if (detaching) detach(section4);
			if (detaching) detach(t91);
			if (detaching) detach(section5);
		}
	};
}

function create_fragment$2(ctx) {
	let layout_mdsvex_default;
	let current;
	const layout_mdsvex_default_spread_levels = [metadata];

	let layout_mdsvex_default_props = {
		$$slots: { default: [create_default_slot] },
		$$scope: { ctx }
	};

	for (let i = 0; i < layout_mdsvex_default_spread_levels.length; i += 1) {
		layout_mdsvex_default_props = assign(layout_mdsvex_default_props, layout_mdsvex_default_spread_levels[i]);
	}

	layout_mdsvex_default = new Note({ props: layout_mdsvex_default_props });

	return {
		c() {
			create_component(layout_mdsvex_default.$$.fragment);
		},
		l(nodes) {
			claim_component(layout_mdsvex_default.$$.fragment, nodes);
		},
		m(target, anchor) {
			mount_component(layout_mdsvex_default, target, anchor);
			current = true;
		},
		p(ctx, [dirty]) {
			const layout_mdsvex_default_changes = (dirty & /*metadata*/ 0)
			? get_spread_update(layout_mdsvex_default_spread_levels, [get_spread_object(metadata)])
			: {};

			if (dirty & /*$$scope*/ 1) {
				layout_mdsvex_default_changes.$$scope = { dirty, ctx };
			}

			layout_mdsvex_default.$set(layout_mdsvex_default_changes);
		},
		i(local) {
			if (current) return;
			transition_in(layout_mdsvex_default.$$.fragment, local);
			current = true;
		},
		o(local) {
			transition_out(layout_mdsvex_default.$$.fragment, local);
			current = false;
		},
		d(detaching) {
			destroy_component(layout_mdsvex_default, detaching);
		}
	};
}

const metadata = {
	"title": "Syntax highlighting Svelte with Prism",
	"tags": ["svelte", "prism", "syntax highlighting"],
	"slug": "notes/svelte-with-prism",
	"type": "notes",
	"name": "svelte-with-prism",
	"layout": "note"
};

class Page_markup extends SvelteComponent {
	constructor(options) {
		super();
		init(this, options, null, create_fragment$2, safe_not_equal, {});
	}
}

setTimeout(() => {
  const app = new Page_markup({
    target: document.querySelector('#app'),
    hydrate: true,
  });

  if (document.querySelector('.twitter-tweet')) {
    const script = document.createElement('script');
    script.async = true;
    script.src = 'https://platform.twitter.com/widgets.js';
    script.charset = 'utf-8';
    document.body.appendChild(script);
  }

  // TODO
  if ('loading' in HTMLImageElement.prototype) {
    const images = document.querySelectorAll('img[loading="lazy"]');
    images.forEach(img => {
      img.src = img.dataset.src;
    });
  } else {
    const script = document.createElement('script');
    script.src =
      'https://cdnjs.cloudflare.com/ajax/libs/lazysizes/5.1.2/lazysizes.min.js';
    document.body.appendChild(script);
  }
}, 3000);
