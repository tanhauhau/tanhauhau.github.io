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

var __build_img_webp__2 = "8d1ebac87309bb83.webp";

var __build_img__2 = "8d1ebac87309bb83.png";

var __build_img_webp__1 = "039520751fea8cdc.webp";

var __build_img__1 = "039520751fea8cdc.png";

var __build_img_webp__0 = "eeb559c6f8d1496e.webp";

var __build_img__0 = "eeb559c6f8d1496e.png";

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

var baseCss = "https://lihautan.com/notes/css-podcast-023-filters/assets/blog-base-248115e4.css";

var image = null;

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
			attr(meta8, "content", "https%3A%2F%2Flihautan.com%2Fnotes%2Fcss-podcast-023-filters");
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

/* content/notes/@@page-markup.svelte generated by Svelte v3.24.0 */

function create_default_slot(ctx) {
	let section0;
	let ul2;
	let li0;
	let a0;
	let t0;
	let ul0;
	let li1;
	let a1;
	let t1;
	let li2;
	let a2;
	let t2;
	let li3;
	let a3;
	let t3;
	let li4;
	let a4;
	let t4;
	let li5;
	let a5;
	let t5;
	let li6;
	let a6;
	let t6;
	let li7;
	let a7;
	let t7;
	let li8;
	let a8;
	let t8;
	let li9;
	let a9;
	let t9;
	let li10;
	let a10;
	let t10;
	let li11;
	let a11;
	let t11;
	let li12;
	let a12;
	let t12;
	let li13;
	let a13;
	let t13;
	let ul1;
	let li14;
	let a14;
	let t14;
	let t15;
	let section1;
	let h20;
	let a15;
	let t16;
	let t17;
	let ul3;
	let li15;
	let t18;
	let t19;
	let li16;
	let t20;
	let t21;
	let pre0;

	let raw0_value = `<code class="language-css"><span class="token selector">.element</span> <span class="token punctuation">&#123;</span>
  <span class="token property">filter</span><span class="token punctuation">:</span> <span class="token function">blur</span><span class="token punctuation">(</span>1px<span class="token punctuation">)</span><span class="token punctuation">;</span>
  <span class="token property">filter</span><span class="token punctuation">:</span> <span class="token url"><span class="token function">url</span><span class="token punctuation">(</span>#blur<span class="token punctuation">)</span></span><span class="token punctuation">;</span>
  <span class="token property">filter</span><span class="token punctuation">:</span> <span class="token url"><span class="token function">url</span><span class="token punctuation">(</span>commonfilters.xml#blur<span class="token punctuation">)</span></span><span class="token punctuation">;</span>
<span class="token punctuation">&#125;</span></code>` + "";

	let t22;
	let section2;
	let h30;
	let a16;
	let t23;
	let t24;
	let ul4;
	let li17;
	let t25;
	let t26;
	let li18;
	let t27;
	let t28;
	let pre1;

	let raw1_value = `<code class="language-css"><span class="token selector">.center</span> <span class="token punctuation">&#123;</span>
  <span class="token property">filter</span><span class="token punctuation">:</span> <span class="token function">blur</span><span class="token punctuation">(</span>3px<span class="token punctuation">)</span><span class="token punctuation">;</span>
<span class="token punctuation">&#125;</span>
<span class="token selector">.right</span> <span class="token punctuation">&#123;</span>
  <span class="token property">filter</span><span class="token punctuation">:</span> <span class="token function">blur</span><span class="token punctuation">(</span>10px<span class="token punctuation">)</span><span class="token punctuation">;</span>
<span class="token punctuation">&#125;</span></code>` + "";

	let t29;
	let p0;
	let picture0;
	let source0;
	let source1;
	let img0;
	let t30;
	let section3;
	let h31;
	let a17;
	let t31;
	let t32;
	let ul5;
	let li19;
	let t33;
	let t34;
	let li20;
	let t35;
	let t36;
	let li21;
	let t37;
	let t38;
	let li22;
	let t39;
	let t40;
	let pre2;

	let raw2_value = `<code class="language-css"><span class="token selector">.left</span> <span class="token punctuation">&#123;</span>
  <span class="token property">filter</span><span class="token punctuation">:</span> <span class="token function">brightness</span><span class="token punctuation">(</span>0.5<span class="token punctuation">)</span>
<span class="token punctuation">&#125;</span>
<span class="token selector">.right</span> <span class="token punctuation">&#123;</span>
  <span class="token property">filter</span><span class="token punctuation">:</span> <span class="token function">brightness</span><span class="token punctuation">(</span>1.5<span class="token punctuation">)</span>
<span class="token punctuation">&#125;</span></code>` + "";

	let t41;
	let p1;
	let picture1;
	let source2;
	let source3;
	let img1;
	let t42;
	let section4;
	let h32;
	let a18;
	let t43;
	let t44;
	let ul6;
	let li23;
	let t45;
	let t46;
	let li24;
	let t47;
	let t48;
	let li25;
	let t49;
	let t50;
	let pre3;

	let raw3_value = `<code class="language-css"><span class="token selector">.left</span> <span class="token punctuation">&#123;</span>
  <span class="token property">filter</span><span class="token punctuation">:</span> <span class="token function">contrast</span><span class="token punctuation">(</span>0.5<span class="token punctuation">)</span>
<span class="token punctuation">&#125;</span>
<span class="token selector">.right</span> <span class="token punctuation">&#123;</span>
  <span class="token property">filter</span><span class="token punctuation">:</span> <span class="token function">contrast</span><span class="token punctuation">(</span>1.5<span class="token punctuation">)</span>
<span class="token punctuation">&#125;</span></code>` + "";

	let t51;
	let p2;
	let picture2;
	let source4;
	let source5;
	let img2;
	let t52;
	let section5;
	let h33;
	let a19;
	let t53;
	let t54;
	let ul8;
	let li27;
	let t55;
	let ul7;
	let li26;
	let t56;
	let t57;
	let section6;
	let h34;
	let a20;
	let t58;
	let t59;
	let ul9;
	let li28;
	let t60;
	let t61;
	let li29;
	let code0;
	let t62;
	let t63;
	let t64;
	let li30;
	let code1;
	let t65;
	let t66;
	let t67;
	let li31;
	let t68;
	let t69;
	let section7;
	let h35;
	let a21;
	let t70;
	let t71;
	let ul10;
	let li32;
	let t72;
	let t73;
	let section8;
	let h36;
	let a22;
	let t74;
	let t75;
	let ul11;
	let li33;
	let t76;
	let t77;
	let li34;
	let t78;
	let t79;
	let li35;
	let t80;
	let t81;
	let section9;
	let h37;
	let a23;
	let t82;
	let t83;
	let ul12;
	let li36;
	let t84;
	let t85;
	let li37;
	let t86;
	let t87;
	let li38;
	let t88;
	let t89;
	let section10;
	let h38;
	let a24;
	let t90;
	let t91;
	let ul13;
	let li39;
	let t92;
	let t93;
	let li40;
	let t94;
	let t95;
	let section11;
	let h39;
	let a25;
	let t96;
	let t97;
	let ul14;
	let li41;
	let t98;
	let t99;
	let li42;
	let t100;
	let t101;
	let section12;
	let h310;
	let a26;
	let t102;
	let t103;
	let ul15;
	let li43;
	let t104;
	let t105;
	let li44;
	let t106;
	let t107;
	let pre4;

	let raw4_value = `<code class="language-html"><span class="token tag"><span class="token tag"><span class="token punctuation">&lt;</span>style</span><span class="token punctuation">></span></span><span class="token style"><span class="token language-css">
  <span class="token selector">.element</span> <span class="token punctuation">&#123;</span>
    <span class="token property">filter</span><span class="token punctuation">:</span> <span class="token url"><span class="token function">url</span><span class="token punctuation">(</span>#my-filter<span class="token punctuation">)</span></span>
  <span class="token punctuation">&#125;</span>
</span></span><span class="token tag"><span class="token tag"><span class="token punctuation">&lt;/</span>style</span><span class="token punctuation">></span></span>
 
<span class="token tag"><span class="token tag"><span class="token punctuation">&lt;</span>svg</span><span class="token punctuation">></span></span>
  <span class="token tag"><span class="token tag"><span class="token punctuation">&lt;</span>filter</span> <span class="token attr-name">id</span><span class="token attr-value"><span class="token punctuation">=</span><span class="token punctuation">"</span>my-filter<span class="token punctuation">"</span></span><span class="token punctuation">></span></span>
     <span class="token tag"><span class="token tag"><span class="token punctuation">&lt;</span>feGaussianBlur</span> <span class="token attr-name">in</span><span class="token attr-value"><span class="token punctuation">=</span><span class="token punctuation">"</span>SourceGraphic<span class="token punctuation">"</span></span> <span class="token attr-name">stdDeviation</span><span class="token attr-value"><span class="token punctuation">=</span><span class="token punctuation">"</span>5<span class="token punctuation">"</span></span> <span class="token punctuation">/></span></span>
  <span class="token tag"><span class="token tag"><span class="token punctuation">&lt;/</span>filter</span><span class="token punctuation">></span></span>
<span class="token tag"><span class="token tag"><span class="token punctuation">&lt;/</span>svg</span><span class="token punctuation">></span></span></code>` + "";

	let t108;
	let section13;
	let h311;
	let a27;
	let code2;
	let t109;
	let t110;
	let ul16;
	let li45;
	let t111;
	let t112;
	let li46;
	let a28;
	let t113;
	let t114;
	let section14;
	let h21;
	let a29;
	let t115;
	let t116;
	let section15;
	let h312;
	let a30;
	let t117;
	let t118;
	let ul17;
	let li47;
	let a31;
	let t119;
	let t120;
	let li48;
	let a32;
	let t121;
	let t122;
	let ul18;
	let li49;
	let t123;
	let t124;
	let p3;
	let t125;
	let t126;
	let ul19;
	let li50;
	let t127;
	let t128;
	let li51;
	let t129;
	let t130;
	let p4;
	let t131;
	let t132;
	let p5;
	let t133;
	let t134;
	let ul20;
	let li52;
	let t135;
	let t136;
	let p6;
	let t137;
	let t138;
	let p7;
	let t139;
	let t140;
	let p8;
	let t141;
	let t142;
	let p9;
	let t143;
	let t144;
	let p10;
	let t145;
	let t146;
	let p11;
	let t147;
	let code3;
	let t148;
	let t149;
	let t150;
	let p12;
	let t151;
	let t152;
	let p13;
	let t153;
	let t154;
	let p14;
	let t155;
	let t156;
	let p15;
	let t157;
	let t158;
	let p16;
	let t159;
	let t160;
	let p17;
	let t161;
	let t162;
	let p18;
	let t163;
	let t164;
	let p19;
	let a33;
	let t165;
	let t166;
	let ul21;
	let li53;
	let a34;
	let t167;
	let t168;
	let li54;
	let a35;
	let t169;
	let t170;
	let li55;
	let a36;
	let t171;
	let t172;
	let li56;
	let a37;
	let t173;
	let t174;
	let li57;
	let a38;
	let t175;

	return {
		c() {
			section0 = element("section");
			ul2 = element("ul");
			li0 = element("li");
			a0 = element("a");
			t0 = text("CSS Filters");
			ul0 = element("ul");
			li1 = element("li");
			a1 = element("a");
			t1 = text("blur()");
			li2 = element("li");
			a2 = element("a");
			t2 = text("brightness()");
			li3 = element("li");
			a3 = element("a");
			t3 = text("contrast()");
			li4 = element("li");
			a4 = element("a");
			t4 = text("grayscale()");
			li5 = element("li");
			a5 = element("a");
			t5 = text("invert()");
			li6 = element("li");
			a6 = element("a");
			t6 = text("opacity()");
			li7 = element("li");
			a7 = element("a");
			t7 = text("saturate()");
			li8 = element("li");
			a8 = element("a");
			t8 = text("sepia()");
			li9 = element("li");
			a9 = element("a");
			t9 = text("hue-rotate()");
			li10 = element("li");
			a10 = element("a");
			t10 = text("drop-shadow()");
			li11 = element("li");
			a11 = element("a");
			t11 = text("url()");
			li12 = element("li");
			a12 = element("a");
			t12 = text("backdrop-filter");
			li13 = element("li");
			a13 = element("a");
			t13 = text("SVG Filters");
			ul1 = element("ul");
			li14 = element("li");
			a14 = element("a");
			t14 = text("Color Matrix");
			t15 = space();
			section1 = element("section");
			h20 = element("h2");
			a15 = element("a");
			t16 = text("CSS Filters");
			t17 = space();
			ul3 = element("ul");
			li15 = element("li");
			t18 = text("applied in order provided");
			t19 = space();
			li16 = element("li");
			t20 = text("you can use filter functions or url to svg filters");
			t21 = space();
			pre0 = element("pre");
			t22 = space();
			section2 = element("section");
			h30 = element("h3");
			a16 = element("a");
			t23 = text("blur()");
			t24 = space();
			ul4 = element("ul");
			li17 = element("li");
			t25 = text("uses gaussian blur");
			t26 = space();
			li18 = element("li");
			t27 = text("specify blur radius");
			t28 = space();
			pre1 = element("pre");
			t29 = space();
			p0 = element("p");
			picture0 = element("picture");
			source0 = element("source");
			source1 = element("source");
			img0 = element("img");
			t30 = space();
			section3 = element("section");
			h31 = element("h3");
			a17 = element("a");
			t31 = text("brightness()");
			t32 = space();
			ul5 = element("ul");
			li19 = element("li");
			t33 = text("takes in percentage value");
			t34 = space();
			li20 = element("li");
			t35 = text("greater than 100% - lightening");
			t36 = space();
			li21 = element("li");
			t37 = text("less than 100% - darkening");
			t38 = space();
			li22 = element("li");
			t39 = text("0 - complete black");
			t40 = space();
			pre2 = element("pre");
			t41 = space();
			p1 = element("p");
			picture1 = element("picture");
			source2 = element("source");
			source3 = element("source");
			img1 = element("img");
			t42 = space();
			section4 = element("section");
			h32 = element("h3");
			a18 = element("a");
			t43 = text("contrast()");
			t44 = space();
			ul6 = element("ul");
			li23 = element("li");
			t45 = text("takes in percentage value");
			t46 = space();
			li24 = element("li");
			t47 = text("greater than 100% - increasing contrast");
			t48 = space();
			li25 = element("li");
			t49 = text("less than 100% - decreasing contrast");
			t50 = space();
			pre3 = element("pre");
			t51 = space();
			p2 = element("p");
			picture2 = element("picture");
			source4 = element("source");
			source5 = element("source");
			img2 = element("img");
			t52 = space();
			section5 = element("section");
			h33 = element("h3");
			a19 = element("a");
			t53 = text("grayscale()");
			t54 = space();
			ul8 = element("ul");
			li27 = element("li");
			t55 = text("grayscale vs desaturation");
			ul7 = element("ul");
			li26 = element("li");
			t56 = text("grayscale: perceptual information of the color will be maintained");
			t57 = space();
			section6 = element("section");
			h34 = element("h3");
			a20 = element("a");
			t58 = text("invert()");
			t59 = space();
			ul9 = element("ul");
			li28 = element("li");
			t60 = text("inverts the dark and light");
			t61 = space();
			li29 = element("li");
			code0 = element("code");
			t62 = text("invert(1)");
			t63 = text(" is the default, which completely inverts");
			t64 = space();
			li30 = element("li");
			code1 = element("code");
			t65 = text("invert(0.5)");
			t66 = text(" will end up a 50% color gray (light increase and dark decrease at the same amount and meet at 50%)");
			t67 = space();
			li31 = element("li");
			t68 = text("can be used to implement dark mode (invert everything, then invert the image again)");
			t69 = space();
			section7 = element("section");
			h35 = element("h3");
			a21 = element("a");
			t70 = text("opacity()");
			t71 = space();
			ul10 = element("ul");
			li32 = element("li");
			t72 = text("similar to opacity property");
			t73 = space();
			section8 = element("section");
			h36 = element("h3");
			a22 = element("a");
			t74 = text("saturate()");
			t75 = space();
			ul11 = element("ul");
			li33 = element("li");
			t76 = text("takes in percentage value");
			t77 = space();
			li34 = element("li");
			t78 = text("greater than 100% - increasing saturation");
			t79 = space();
			li35 = element("li");
			t80 = text("less than 100% - decreasing saturation");
			t81 = space();
			section9 = element("section");
			h37 = element("h3");
			a23 = element("a");
			t82 = text("sepia()");
			t83 = space();
			ul12 = element("ul");
			li36 = element("li");
			t84 = text("sepia has a warm, yellow/brown appearance");
			t85 = space();
			li37 = element("li");
			t86 = text("takes in percentage value");
			t87 = space();
			li38 = element("li");
			t88 = text("value from 0% - 100%, 100% is complete sepia, 0% is no effect");
			t89 = space();
			section10 = element("section");
			h38 = element("h3");
			a24 = element("a");
			t90 = text("hue-rotate()");
			t91 = space();
			ul13 = element("ul");
			li39 = element("li");
			t92 = text("rotates the color along the color wheel");
			t93 = space();
			li40 = element("li");
			t94 = text("takes in an angle");
			t95 = space();
			section11 = element("section");
			h39 = element("h3");
			a25 = element("a");
			t96 = text("drop-shadow()");
			t97 = space();
			ul14 = element("ul");
			li41 = element("li");
			t98 = text("works on the painted space instead of the box");
			t99 = space();
			li42 = element("li");
			t100 = text("not casting shadow if it is transparent");
			t101 = space();
			section12 = element("section");
			h310 = element("h3");
			a26 = element("a");
			t102 = text("url()");
			t103 = space();
			ul15 = element("ul");
			li43 = element("li");
			t104 = text("point to svg filter");
			t105 = space();
			li44 = element("li");
			t106 = text("svg must be inline, cannot be a url as an image, so that it can be referenced");
			t107 = space();
			pre4 = element("pre");
			t108 = space();
			section13 = element("section");
			h311 = element("h3");
			a27 = element("a");
			code2 = element("code");
			t109 = text("backdrop-filter");
			t110 = space();
			ul16 = element("ul");
			li45 = element("li");
			t111 = text("apply behind the element, instead on the element");
			t112 = space();
			li46 = element("li");
			a28 = element("a");
			t113 = text("https://css-tricks.com/almanac/properties/b/backdrop-filter/");
			t114 = space();
			section14 = element("section");
			h21 = element("h2");
			a29 = element("a");
			t115 = text("SVG Filters");
			t116 = space();
			section15 = element("section");
			h312 = element("h3");
			a30 = element("a");
			t117 = text("Color Matrix");
			t118 = space();
			ul17 = element("ul");
			li47 = element("li");
			a31 = element("a");
			t119 = text("https://alistapart.com/article/finessing-fecolormatrix/");
			t120 = space();
			li48 = element("li");
			a32 = element("a");
			t121 = text("https://css-tricks.com/color-filters-can-turn-your-gray-skies-blue/");
			t122 = space();
			ul18 = element("ul");
			li49 = element("li");
			t123 = text("feMerge");
			t124 = space();
			p3 = element("p");
			t125 = text("svg filter effects\nfe color matrix");
			t126 = space();
			ul19 = element("ul");
			li50 = element("li");
			t127 = text("4x4 matrix\n[1000,0100,0010,0001]");
			t128 = space();
			li51 = element("li");
			t129 = text("a");
			t130 = space();
			p4 = element("p");
			t131 = text("svg filter");
			t132 = space();
			p5 = element("p");
			t133 = text("feBlend");
			t134 = space();
			ul20 = element("ul");
			li52 = element("li");
			t135 = text("just like how blend mode works\nfeComponentTransfer");
			t136 = space();
			p6 = element("p");
			t137 = text("feComposite\npixel level image interactions, how each pixels composite together");
			t138 = space();
			p7 = element("p");
			t139 = text("feConvolve\nhow pixels interacte with its neighbour, this results in blurring, sharpening");
			t140 = space();
			p8 = element("p");
			t141 = text("feDiffuseLighting\ndefines a light source");
			t142 = space();
			p9 = element("p");
			t143 = text("feDisplacementMap\ndisplaces an image, in, using another image in2 to displace the in image");
			t144 = space();
			p10 = element("p");
			t145 = text("feFlood\nfills the filter subregion with the specified color and opacity");
			t146 = space();
			p11 = element("p");
			t147 = text("feGaussianBlur\nsame as what ");
			code3 = element("code");
			t148 = text("blur()");
			t149 = text(" use");
			t150 = space();
			p12 = element("p");
			t151 = text("feImage\nto use with other filters, feBlend or feComposite");
			t152 = space();
			p13 = element("p");
			t153 = text("feMerge\nasynchronous operations in the filter effects instead of layering them");
			t154 = space();
			p14 = element("p");
			t155 = text("feMorphology\nerods or dilates the input image");
			t156 = space();
			p15 = element("p");
			t157 = text("feOffset\nuseful for creating dropShadow");
			t158 = space();
			p16 = element("p");
			t159 = text("feSpecularLighting\nuse alpha channel as bump map");
			t160 = space();
			p17 = element("p");
			t161 = text("feTile\nhow image repeated to fill the space");
			t162 = space();
			p18 = element("p");
			t163 = text("feTurbulence\ncreates image using Perlin turbulence function");
			t164 = space();
			p19 = element("p");
			a33 = element("a");
			t165 = text("https://www.w3.org/TR/filter-effects-1/#ShorthandEquivalents");
			t166 = space();
			ul21 = element("ul");
			li53 = element("li");
			a34 = element("a");
			t167 = text("https://tympanus.net/codrops/2019/01/15/svg-filters-101");
			t168 = space();
			li54 = element("li");
			a35 = element("a");
			t169 = text("https://www.sarasoueidan.com/blog/compositing-and-blending-in-css/");
			t170 = space();
			li55 = element("li");
			a36 = element("a");
			t171 = text("https://alistapart.com/article/finessing-fecolormatrix/");
			t172 = space();
			li56 = element("li");
			a37 = element("a");
			t173 = text("https://css-tricks.com/color-filters-can-turn-your-gray-skies-blue/");
			t174 = space();
			li57 = element("li");
			a38 = element("a");
			t175 = text("https://css-tricks.com/look-svg-light-source-filters/");
			this.h();
		},
		l(nodes) {
			section0 = claim_element(nodes, "SECTION", {});
			var section0_nodes = children(section0);

			ul2 = claim_element(section0_nodes, "UL", {
				class: true,
				id: true,
				role: true,
				"aria-label": true
			});

			var ul2_nodes = children(ul2);
			li0 = claim_element(ul2_nodes, "LI", {});
			var li0_nodes = children(li0);
			a0 = claim_element(li0_nodes, "A", { href: true });
			var a0_nodes = children(a0);
			t0 = claim_text(a0_nodes, "CSS Filters");
			a0_nodes.forEach(detach);
			li0_nodes.forEach(detach);
			ul0 = claim_element(ul2_nodes, "UL", {});
			var ul0_nodes = children(ul0);
			li1 = claim_element(ul0_nodes, "LI", {});
			var li1_nodes = children(li1);
			a1 = claim_element(li1_nodes, "A", { href: true });
			var a1_nodes = children(a1);
			t1 = claim_text(a1_nodes, "blur()");
			a1_nodes.forEach(detach);
			li1_nodes.forEach(detach);
			li2 = claim_element(ul0_nodes, "LI", {});
			var li2_nodes = children(li2);
			a2 = claim_element(li2_nodes, "A", { href: true });
			var a2_nodes = children(a2);
			t2 = claim_text(a2_nodes, "brightness()");
			a2_nodes.forEach(detach);
			li2_nodes.forEach(detach);
			li3 = claim_element(ul0_nodes, "LI", {});
			var li3_nodes = children(li3);
			a3 = claim_element(li3_nodes, "A", { href: true });
			var a3_nodes = children(a3);
			t3 = claim_text(a3_nodes, "contrast()");
			a3_nodes.forEach(detach);
			li3_nodes.forEach(detach);
			li4 = claim_element(ul0_nodes, "LI", {});
			var li4_nodes = children(li4);
			a4 = claim_element(li4_nodes, "A", { href: true });
			var a4_nodes = children(a4);
			t4 = claim_text(a4_nodes, "grayscale()");
			a4_nodes.forEach(detach);
			li4_nodes.forEach(detach);
			li5 = claim_element(ul0_nodes, "LI", {});
			var li5_nodes = children(li5);
			a5 = claim_element(li5_nodes, "A", { href: true });
			var a5_nodes = children(a5);
			t5 = claim_text(a5_nodes, "invert()");
			a5_nodes.forEach(detach);
			li5_nodes.forEach(detach);
			li6 = claim_element(ul0_nodes, "LI", {});
			var li6_nodes = children(li6);
			a6 = claim_element(li6_nodes, "A", { href: true });
			var a6_nodes = children(a6);
			t6 = claim_text(a6_nodes, "opacity()");
			a6_nodes.forEach(detach);
			li6_nodes.forEach(detach);
			li7 = claim_element(ul0_nodes, "LI", {});
			var li7_nodes = children(li7);
			a7 = claim_element(li7_nodes, "A", { href: true });
			var a7_nodes = children(a7);
			t7 = claim_text(a7_nodes, "saturate()");
			a7_nodes.forEach(detach);
			li7_nodes.forEach(detach);
			li8 = claim_element(ul0_nodes, "LI", {});
			var li8_nodes = children(li8);
			a8 = claim_element(li8_nodes, "A", { href: true });
			var a8_nodes = children(a8);
			t8 = claim_text(a8_nodes, "sepia()");
			a8_nodes.forEach(detach);
			li8_nodes.forEach(detach);
			li9 = claim_element(ul0_nodes, "LI", {});
			var li9_nodes = children(li9);
			a9 = claim_element(li9_nodes, "A", { href: true });
			var a9_nodes = children(a9);
			t9 = claim_text(a9_nodes, "hue-rotate()");
			a9_nodes.forEach(detach);
			li9_nodes.forEach(detach);
			li10 = claim_element(ul0_nodes, "LI", {});
			var li10_nodes = children(li10);
			a10 = claim_element(li10_nodes, "A", { href: true });
			var a10_nodes = children(a10);
			t10 = claim_text(a10_nodes, "drop-shadow()");
			a10_nodes.forEach(detach);
			li10_nodes.forEach(detach);
			li11 = claim_element(ul0_nodes, "LI", {});
			var li11_nodes = children(li11);
			a11 = claim_element(li11_nodes, "A", { href: true });
			var a11_nodes = children(a11);
			t11 = claim_text(a11_nodes, "url()");
			a11_nodes.forEach(detach);
			li11_nodes.forEach(detach);
			li12 = claim_element(ul0_nodes, "LI", {});
			var li12_nodes = children(li12);
			a12 = claim_element(li12_nodes, "A", { href: true });
			var a12_nodes = children(a12);
			t12 = claim_text(a12_nodes, "backdrop-filter");
			a12_nodes.forEach(detach);
			li12_nodes.forEach(detach);
			ul0_nodes.forEach(detach);
			li13 = claim_element(ul2_nodes, "LI", {});
			var li13_nodes = children(li13);
			a13 = claim_element(li13_nodes, "A", { href: true });
			var a13_nodes = children(a13);
			t13 = claim_text(a13_nodes, "SVG Filters");
			a13_nodes.forEach(detach);
			li13_nodes.forEach(detach);
			ul1 = claim_element(ul2_nodes, "UL", {});
			var ul1_nodes = children(ul1);
			li14 = claim_element(ul1_nodes, "LI", {});
			var li14_nodes = children(li14);
			a14 = claim_element(li14_nodes, "A", { href: true });
			var a14_nodes = children(a14);
			t14 = claim_text(a14_nodes, "Color Matrix");
			a14_nodes.forEach(detach);
			li14_nodes.forEach(detach);
			ul1_nodes.forEach(detach);
			ul2_nodes.forEach(detach);
			section0_nodes.forEach(detach);
			t15 = claim_space(nodes);
			section1 = claim_element(nodes, "SECTION", {});
			var section1_nodes = children(section1);
			h20 = claim_element(section1_nodes, "H2", {});
			var h20_nodes = children(h20);
			a15 = claim_element(h20_nodes, "A", { href: true, id: true });
			var a15_nodes = children(a15);
			t16 = claim_text(a15_nodes, "CSS Filters");
			a15_nodes.forEach(detach);
			h20_nodes.forEach(detach);
			t17 = claim_space(section1_nodes);
			ul3 = claim_element(section1_nodes, "UL", {});
			var ul3_nodes = children(ul3);
			li15 = claim_element(ul3_nodes, "LI", {});
			var li15_nodes = children(li15);
			t18 = claim_text(li15_nodes, "applied in order provided");
			li15_nodes.forEach(detach);
			t19 = claim_space(ul3_nodes);
			li16 = claim_element(ul3_nodes, "LI", {});
			var li16_nodes = children(li16);
			t20 = claim_text(li16_nodes, "you can use filter functions or url to svg filters");
			li16_nodes.forEach(detach);
			ul3_nodes.forEach(detach);
			t21 = claim_space(section1_nodes);
			pre0 = claim_element(section1_nodes, "PRE", { class: true });
			var pre0_nodes = children(pre0);
			pre0_nodes.forEach(detach);
			section1_nodes.forEach(detach);
			t22 = claim_space(nodes);
			section2 = claim_element(nodes, "SECTION", {});
			var section2_nodes = children(section2);
			h30 = claim_element(section2_nodes, "H3", {});
			var h30_nodes = children(h30);
			a16 = claim_element(h30_nodes, "A", { href: true, id: true });
			var a16_nodes = children(a16);
			t23 = claim_text(a16_nodes, "blur()");
			a16_nodes.forEach(detach);
			h30_nodes.forEach(detach);
			t24 = claim_space(section2_nodes);
			ul4 = claim_element(section2_nodes, "UL", {});
			var ul4_nodes = children(ul4);
			li17 = claim_element(ul4_nodes, "LI", {});
			var li17_nodes = children(li17);
			t25 = claim_text(li17_nodes, "uses gaussian blur");
			li17_nodes.forEach(detach);
			t26 = claim_space(ul4_nodes);
			li18 = claim_element(ul4_nodes, "LI", {});
			var li18_nodes = children(li18);
			t27 = claim_text(li18_nodes, "specify blur radius");
			li18_nodes.forEach(detach);
			ul4_nodes.forEach(detach);
			t28 = claim_space(section2_nodes);
			pre1 = claim_element(section2_nodes, "PRE", { class: true });
			var pre1_nodes = children(pre1);
			pre1_nodes.forEach(detach);
			t29 = claim_space(section2_nodes);
			p0 = claim_element(section2_nodes, "P", {});
			var p0_nodes = children(p0);
			picture0 = claim_element(p0_nodes, "PICTURE", {});
			var picture0_nodes = children(picture0);
			source0 = claim_element(picture0_nodes, "SOURCE", { type: true, srcset: true });
			source1 = claim_element(picture0_nodes, "SOURCE", { type: true, srcset: true });

			img0 = claim_element(picture0_nodes, "IMG", {
				title: true,
				alt: true,
				"data-src": true,
				loading: true,
				class: true
			});

			picture0_nodes.forEach(detach);
			p0_nodes.forEach(detach);
			section2_nodes.forEach(detach);
			t30 = claim_space(nodes);
			section3 = claim_element(nodes, "SECTION", {});
			var section3_nodes = children(section3);
			h31 = claim_element(section3_nodes, "H3", {});
			var h31_nodes = children(h31);
			a17 = claim_element(h31_nodes, "A", { href: true, id: true });
			var a17_nodes = children(a17);
			t31 = claim_text(a17_nodes, "brightness()");
			a17_nodes.forEach(detach);
			h31_nodes.forEach(detach);
			t32 = claim_space(section3_nodes);
			ul5 = claim_element(section3_nodes, "UL", {});
			var ul5_nodes = children(ul5);
			li19 = claim_element(ul5_nodes, "LI", {});
			var li19_nodes = children(li19);
			t33 = claim_text(li19_nodes, "takes in percentage value");
			li19_nodes.forEach(detach);
			t34 = claim_space(ul5_nodes);
			li20 = claim_element(ul5_nodes, "LI", {});
			var li20_nodes = children(li20);
			t35 = claim_text(li20_nodes, "greater than 100% - lightening");
			li20_nodes.forEach(detach);
			t36 = claim_space(ul5_nodes);
			li21 = claim_element(ul5_nodes, "LI", {});
			var li21_nodes = children(li21);
			t37 = claim_text(li21_nodes, "less than 100% - darkening");
			li21_nodes.forEach(detach);
			t38 = claim_space(ul5_nodes);
			li22 = claim_element(ul5_nodes, "LI", {});
			var li22_nodes = children(li22);
			t39 = claim_text(li22_nodes, "0 - complete black");
			li22_nodes.forEach(detach);
			ul5_nodes.forEach(detach);
			t40 = claim_space(section3_nodes);
			pre2 = claim_element(section3_nodes, "PRE", { class: true });
			var pre2_nodes = children(pre2);
			pre2_nodes.forEach(detach);
			t41 = claim_space(section3_nodes);
			p1 = claim_element(section3_nodes, "P", {});
			var p1_nodes = children(p1);
			picture1 = claim_element(p1_nodes, "PICTURE", {});
			var picture1_nodes = children(picture1);
			source2 = claim_element(picture1_nodes, "SOURCE", { type: true, srcset: true });
			source3 = claim_element(picture1_nodes, "SOURCE", { type: true, srcset: true });

			img1 = claim_element(picture1_nodes, "IMG", {
				title: true,
				alt: true,
				"data-src": true,
				loading: true,
				class: true
			});

			picture1_nodes.forEach(detach);
			p1_nodes.forEach(detach);
			section3_nodes.forEach(detach);
			t42 = claim_space(nodes);
			section4 = claim_element(nodes, "SECTION", {});
			var section4_nodes = children(section4);
			h32 = claim_element(section4_nodes, "H3", {});
			var h32_nodes = children(h32);
			a18 = claim_element(h32_nodes, "A", { href: true, id: true });
			var a18_nodes = children(a18);
			t43 = claim_text(a18_nodes, "contrast()");
			a18_nodes.forEach(detach);
			h32_nodes.forEach(detach);
			t44 = claim_space(section4_nodes);
			ul6 = claim_element(section4_nodes, "UL", {});
			var ul6_nodes = children(ul6);
			li23 = claim_element(ul6_nodes, "LI", {});
			var li23_nodes = children(li23);
			t45 = claim_text(li23_nodes, "takes in percentage value");
			li23_nodes.forEach(detach);
			t46 = claim_space(ul6_nodes);
			li24 = claim_element(ul6_nodes, "LI", {});
			var li24_nodes = children(li24);
			t47 = claim_text(li24_nodes, "greater than 100% - increasing contrast");
			li24_nodes.forEach(detach);
			t48 = claim_space(ul6_nodes);
			li25 = claim_element(ul6_nodes, "LI", {});
			var li25_nodes = children(li25);
			t49 = claim_text(li25_nodes, "less than 100% - decreasing contrast");
			li25_nodes.forEach(detach);
			ul6_nodes.forEach(detach);
			t50 = claim_space(section4_nodes);
			pre3 = claim_element(section4_nodes, "PRE", { class: true });
			var pre3_nodes = children(pre3);
			pre3_nodes.forEach(detach);
			t51 = claim_space(section4_nodes);
			p2 = claim_element(section4_nodes, "P", {});
			var p2_nodes = children(p2);
			picture2 = claim_element(p2_nodes, "PICTURE", {});
			var picture2_nodes = children(picture2);
			source4 = claim_element(picture2_nodes, "SOURCE", { type: true, srcset: true });
			source5 = claim_element(picture2_nodes, "SOURCE", { type: true, srcset: true });

			img2 = claim_element(picture2_nodes, "IMG", {
				title: true,
				alt: true,
				"data-src": true,
				loading: true,
				class: true
			});

			picture2_nodes.forEach(detach);
			p2_nodes.forEach(detach);
			section4_nodes.forEach(detach);
			t52 = claim_space(nodes);
			section5 = claim_element(nodes, "SECTION", {});
			var section5_nodes = children(section5);
			h33 = claim_element(section5_nodes, "H3", {});
			var h33_nodes = children(h33);
			a19 = claim_element(h33_nodes, "A", { href: true, id: true });
			var a19_nodes = children(a19);
			t53 = claim_text(a19_nodes, "grayscale()");
			a19_nodes.forEach(detach);
			h33_nodes.forEach(detach);
			t54 = claim_space(section5_nodes);
			ul8 = claim_element(section5_nodes, "UL", {});
			var ul8_nodes = children(ul8);
			li27 = claim_element(ul8_nodes, "LI", {});
			var li27_nodes = children(li27);
			t55 = claim_text(li27_nodes, "grayscale vs desaturation");
			ul7 = claim_element(li27_nodes, "UL", {});
			var ul7_nodes = children(ul7);
			li26 = claim_element(ul7_nodes, "LI", {});
			var li26_nodes = children(li26);
			t56 = claim_text(li26_nodes, "grayscale: perceptual information of the color will be maintained");
			li26_nodes.forEach(detach);
			ul7_nodes.forEach(detach);
			li27_nodes.forEach(detach);
			ul8_nodes.forEach(detach);
			section5_nodes.forEach(detach);
			t57 = claim_space(nodes);
			section6 = claim_element(nodes, "SECTION", {});
			var section6_nodes = children(section6);
			h34 = claim_element(section6_nodes, "H3", {});
			var h34_nodes = children(h34);
			a20 = claim_element(h34_nodes, "A", { href: true, id: true });
			var a20_nodes = children(a20);
			t58 = claim_text(a20_nodes, "invert()");
			a20_nodes.forEach(detach);
			h34_nodes.forEach(detach);
			t59 = claim_space(section6_nodes);
			ul9 = claim_element(section6_nodes, "UL", {});
			var ul9_nodes = children(ul9);
			li28 = claim_element(ul9_nodes, "LI", {});
			var li28_nodes = children(li28);
			t60 = claim_text(li28_nodes, "inverts the dark and light");
			li28_nodes.forEach(detach);
			t61 = claim_space(ul9_nodes);
			li29 = claim_element(ul9_nodes, "LI", {});
			var li29_nodes = children(li29);
			code0 = claim_element(li29_nodes, "CODE", {});
			var code0_nodes = children(code0);
			t62 = claim_text(code0_nodes, "invert(1)");
			code0_nodes.forEach(detach);
			t63 = claim_text(li29_nodes, " is the default, which completely inverts");
			li29_nodes.forEach(detach);
			t64 = claim_space(ul9_nodes);
			li30 = claim_element(ul9_nodes, "LI", {});
			var li30_nodes = children(li30);
			code1 = claim_element(li30_nodes, "CODE", {});
			var code1_nodes = children(code1);
			t65 = claim_text(code1_nodes, "invert(0.5)");
			code1_nodes.forEach(detach);
			t66 = claim_text(li30_nodes, " will end up a 50% color gray (light increase and dark decrease at the same amount and meet at 50%)");
			li30_nodes.forEach(detach);
			t67 = claim_space(ul9_nodes);
			li31 = claim_element(ul9_nodes, "LI", {});
			var li31_nodes = children(li31);
			t68 = claim_text(li31_nodes, "can be used to implement dark mode (invert everything, then invert the image again)");
			li31_nodes.forEach(detach);
			ul9_nodes.forEach(detach);
			section6_nodes.forEach(detach);
			t69 = claim_space(nodes);
			section7 = claim_element(nodes, "SECTION", {});
			var section7_nodes = children(section7);
			h35 = claim_element(section7_nodes, "H3", {});
			var h35_nodes = children(h35);
			a21 = claim_element(h35_nodes, "A", { href: true, id: true });
			var a21_nodes = children(a21);
			t70 = claim_text(a21_nodes, "opacity()");
			a21_nodes.forEach(detach);
			h35_nodes.forEach(detach);
			t71 = claim_space(section7_nodes);
			ul10 = claim_element(section7_nodes, "UL", {});
			var ul10_nodes = children(ul10);
			li32 = claim_element(ul10_nodes, "LI", {});
			var li32_nodes = children(li32);
			t72 = claim_text(li32_nodes, "similar to opacity property");
			li32_nodes.forEach(detach);
			ul10_nodes.forEach(detach);
			section7_nodes.forEach(detach);
			t73 = claim_space(nodes);
			section8 = claim_element(nodes, "SECTION", {});
			var section8_nodes = children(section8);
			h36 = claim_element(section8_nodes, "H3", {});
			var h36_nodes = children(h36);
			a22 = claim_element(h36_nodes, "A", { href: true, id: true });
			var a22_nodes = children(a22);
			t74 = claim_text(a22_nodes, "saturate()");
			a22_nodes.forEach(detach);
			h36_nodes.forEach(detach);
			t75 = claim_space(section8_nodes);
			ul11 = claim_element(section8_nodes, "UL", {});
			var ul11_nodes = children(ul11);
			li33 = claim_element(ul11_nodes, "LI", {});
			var li33_nodes = children(li33);
			t76 = claim_text(li33_nodes, "takes in percentage value");
			li33_nodes.forEach(detach);
			t77 = claim_space(ul11_nodes);
			li34 = claim_element(ul11_nodes, "LI", {});
			var li34_nodes = children(li34);
			t78 = claim_text(li34_nodes, "greater than 100% - increasing saturation");
			li34_nodes.forEach(detach);
			t79 = claim_space(ul11_nodes);
			li35 = claim_element(ul11_nodes, "LI", {});
			var li35_nodes = children(li35);
			t80 = claim_text(li35_nodes, "less than 100% - decreasing saturation");
			li35_nodes.forEach(detach);
			ul11_nodes.forEach(detach);
			section8_nodes.forEach(detach);
			t81 = claim_space(nodes);
			section9 = claim_element(nodes, "SECTION", {});
			var section9_nodes = children(section9);
			h37 = claim_element(section9_nodes, "H3", {});
			var h37_nodes = children(h37);
			a23 = claim_element(h37_nodes, "A", { href: true, id: true });
			var a23_nodes = children(a23);
			t82 = claim_text(a23_nodes, "sepia()");
			a23_nodes.forEach(detach);
			h37_nodes.forEach(detach);
			t83 = claim_space(section9_nodes);
			ul12 = claim_element(section9_nodes, "UL", {});
			var ul12_nodes = children(ul12);
			li36 = claim_element(ul12_nodes, "LI", {});
			var li36_nodes = children(li36);
			t84 = claim_text(li36_nodes, "sepia has a warm, yellow/brown appearance");
			li36_nodes.forEach(detach);
			t85 = claim_space(ul12_nodes);
			li37 = claim_element(ul12_nodes, "LI", {});
			var li37_nodes = children(li37);
			t86 = claim_text(li37_nodes, "takes in percentage value");
			li37_nodes.forEach(detach);
			t87 = claim_space(ul12_nodes);
			li38 = claim_element(ul12_nodes, "LI", {});
			var li38_nodes = children(li38);
			t88 = claim_text(li38_nodes, "value from 0% - 100%, 100% is complete sepia, 0% is no effect");
			li38_nodes.forEach(detach);
			ul12_nodes.forEach(detach);
			section9_nodes.forEach(detach);
			t89 = claim_space(nodes);
			section10 = claim_element(nodes, "SECTION", {});
			var section10_nodes = children(section10);
			h38 = claim_element(section10_nodes, "H3", {});
			var h38_nodes = children(h38);
			a24 = claim_element(h38_nodes, "A", { href: true, id: true });
			var a24_nodes = children(a24);
			t90 = claim_text(a24_nodes, "hue-rotate()");
			a24_nodes.forEach(detach);
			h38_nodes.forEach(detach);
			t91 = claim_space(section10_nodes);
			ul13 = claim_element(section10_nodes, "UL", {});
			var ul13_nodes = children(ul13);
			li39 = claim_element(ul13_nodes, "LI", {});
			var li39_nodes = children(li39);
			t92 = claim_text(li39_nodes, "rotates the color along the color wheel");
			li39_nodes.forEach(detach);
			t93 = claim_space(ul13_nodes);
			li40 = claim_element(ul13_nodes, "LI", {});
			var li40_nodes = children(li40);
			t94 = claim_text(li40_nodes, "takes in an angle");
			li40_nodes.forEach(detach);
			ul13_nodes.forEach(detach);
			section10_nodes.forEach(detach);
			t95 = claim_space(nodes);
			section11 = claim_element(nodes, "SECTION", {});
			var section11_nodes = children(section11);
			h39 = claim_element(section11_nodes, "H3", {});
			var h39_nodes = children(h39);
			a25 = claim_element(h39_nodes, "A", { href: true, id: true });
			var a25_nodes = children(a25);
			t96 = claim_text(a25_nodes, "drop-shadow()");
			a25_nodes.forEach(detach);
			h39_nodes.forEach(detach);
			t97 = claim_space(section11_nodes);
			ul14 = claim_element(section11_nodes, "UL", {});
			var ul14_nodes = children(ul14);
			li41 = claim_element(ul14_nodes, "LI", {});
			var li41_nodes = children(li41);
			t98 = claim_text(li41_nodes, "works on the painted space instead of the box");
			li41_nodes.forEach(detach);
			t99 = claim_space(ul14_nodes);
			li42 = claim_element(ul14_nodes, "LI", {});
			var li42_nodes = children(li42);
			t100 = claim_text(li42_nodes, "not casting shadow if it is transparent");
			li42_nodes.forEach(detach);
			ul14_nodes.forEach(detach);
			section11_nodes.forEach(detach);
			t101 = claim_space(nodes);
			section12 = claim_element(nodes, "SECTION", {});
			var section12_nodes = children(section12);
			h310 = claim_element(section12_nodes, "H3", {});
			var h310_nodes = children(h310);
			a26 = claim_element(h310_nodes, "A", { href: true, id: true });
			var a26_nodes = children(a26);
			t102 = claim_text(a26_nodes, "url()");
			a26_nodes.forEach(detach);
			h310_nodes.forEach(detach);
			t103 = claim_space(section12_nodes);
			ul15 = claim_element(section12_nodes, "UL", {});
			var ul15_nodes = children(ul15);
			li43 = claim_element(ul15_nodes, "LI", {});
			var li43_nodes = children(li43);
			t104 = claim_text(li43_nodes, "point to svg filter");
			li43_nodes.forEach(detach);
			t105 = claim_space(ul15_nodes);
			li44 = claim_element(ul15_nodes, "LI", {});
			var li44_nodes = children(li44);
			t106 = claim_text(li44_nodes, "svg must be inline, cannot be a url as an image, so that it can be referenced");
			li44_nodes.forEach(detach);
			ul15_nodes.forEach(detach);
			t107 = claim_space(section12_nodes);
			pre4 = claim_element(section12_nodes, "PRE", { class: true });
			var pre4_nodes = children(pre4);
			pre4_nodes.forEach(detach);
			section12_nodes.forEach(detach);
			t108 = claim_space(nodes);
			section13 = claim_element(nodes, "SECTION", {});
			var section13_nodes = children(section13);
			h311 = claim_element(section13_nodes, "H3", {});
			var h311_nodes = children(h311);
			a27 = claim_element(h311_nodes, "A", { href: true, id: true });
			var a27_nodes = children(a27);
			code2 = claim_element(a27_nodes, "CODE", {});
			var code2_nodes = children(code2);
			t109 = claim_text(code2_nodes, "backdrop-filter");
			code2_nodes.forEach(detach);
			a27_nodes.forEach(detach);
			h311_nodes.forEach(detach);
			t110 = claim_space(section13_nodes);
			ul16 = claim_element(section13_nodes, "UL", {});
			var ul16_nodes = children(ul16);
			li45 = claim_element(ul16_nodes, "LI", {});
			var li45_nodes = children(li45);
			t111 = claim_text(li45_nodes, "apply behind the element, instead on the element");
			li45_nodes.forEach(detach);
			t112 = claim_space(ul16_nodes);
			li46 = claim_element(ul16_nodes, "LI", {});
			var li46_nodes = children(li46);
			a28 = claim_element(li46_nodes, "A", { href: true, rel: true });
			var a28_nodes = children(a28);
			t113 = claim_text(a28_nodes, "https://css-tricks.com/almanac/properties/b/backdrop-filter/");
			a28_nodes.forEach(detach);
			li46_nodes.forEach(detach);
			ul16_nodes.forEach(detach);
			section13_nodes.forEach(detach);
			t114 = claim_space(nodes);
			section14 = claim_element(nodes, "SECTION", {});
			var section14_nodes = children(section14);
			h21 = claim_element(section14_nodes, "H2", {});
			var h21_nodes = children(h21);
			a29 = claim_element(h21_nodes, "A", { href: true, id: true });
			var a29_nodes = children(a29);
			t115 = claim_text(a29_nodes, "SVG Filters");
			a29_nodes.forEach(detach);
			h21_nodes.forEach(detach);
			section14_nodes.forEach(detach);
			t116 = claim_space(nodes);
			section15 = claim_element(nodes, "SECTION", {});
			var section15_nodes = children(section15);
			h312 = claim_element(section15_nodes, "H3", {});
			var h312_nodes = children(h312);
			a30 = claim_element(h312_nodes, "A", { href: true, id: true });
			var a30_nodes = children(a30);
			t117 = claim_text(a30_nodes, "Color Matrix");
			a30_nodes.forEach(detach);
			h312_nodes.forEach(detach);
			t118 = claim_space(section15_nodes);
			ul17 = claim_element(section15_nodes, "UL", {});
			var ul17_nodes = children(ul17);
			li47 = claim_element(ul17_nodes, "LI", {});
			var li47_nodes = children(li47);
			a31 = claim_element(li47_nodes, "A", { href: true, rel: true });
			var a31_nodes = children(a31);
			t119 = claim_text(a31_nodes, "https://alistapart.com/article/finessing-fecolormatrix/");
			a31_nodes.forEach(detach);
			li47_nodes.forEach(detach);
			t120 = claim_space(ul17_nodes);
			li48 = claim_element(ul17_nodes, "LI", {});
			var li48_nodes = children(li48);
			a32 = claim_element(li48_nodes, "A", { href: true, rel: true });
			var a32_nodes = children(a32);
			t121 = claim_text(a32_nodes, "https://css-tricks.com/color-filters-can-turn-your-gray-skies-blue/");
			a32_nodes.forEach(detach);
			li48_nodes.forEach(detach);
			ul17_nodes.forEach(detach);
			t122 = claim_space(section15_nodes);
			ul18 = claim_element(section15_nodes, "UL", {});
			var ul18_nodes = children(ul18);
			li49 = claim_element(ul18_nodes, "LI", {});
			var li49_nodes = children(li49);
			t123 = claim_text(li49_nodes, "feMerge");
			li49_nodes.forEach(detach);
			ul18_nodes.forEach(detach);
			t124 = claim_space(section15_nodes);
			p3 = claim_element(section15_nodes, "P", {});
			var p3_nodes = children(p3);
			t125 = claim_text(p3_nodes, "svg filter effects\nfe color matrix");
			p3_nodes.forEach(detach);
			t126 = claim_space(section15_nodes);
			ul19 = claim_element(section15_nodes, "UL", {});
			var ul19_nodes = children(ul19);
			li50 = claim_element(ul19_nodes, "LI", {});
			var li50_nodes = children(li50);
			t127 = claim_text(li50_nodes, "4x4 matrix\n[1000,0100,0010,0001]");
			li50_nodes.forEach(detach);
			t128 = claim_space(ul19_nodes);
			li51 = claim_element(ul19_nodes, "LI", {});
			var li51_nodes = children(li51);
			t129 = claim_text(li51_nodes, "a");
			li51_nodes.forEach(detach);
			ul19_nodes.forEach(detach);
			t130 = claim_space(section15_nodes);
			p4 = claim_element(section15_nodes, "P", {});
			var p4_nodes = children(p4);
			t131 = claim_text(p4_nodes, "svg filter");
			p4_nodes.forEach(detach);
			t132 = claim_space(section15_nodes);
			p5 = claim_element(section15_nodes, "P", {});
			var p5_nodes = children(p5);
			t133 = claim_text(p5_nodes, "feBlend");
			p5_nodes.forEach(detach);
			t134 = claim_space(section15_nodes);
			ul20 = claim_element(section15_nodes, "UL", {});
			var ul20_nodes = children(ul20);
			li52 = claim_element(ul20_nodes, "LI", {});
			var li52_nodes = children(li52);
			t135 = claim_text(li52_nodes, "just like how blend mode works\nfeComponentTransfer");
			li52_nodes.forEach(detach);
			ul20_nodes.forEach(detach);
			t136 = claim_space(section15_nodes);
			p6 = claim_element(section15_nodes, "P", {});
			var p6_nodes = children(p6);
			t137 = claim_text(p6_nodes, "feComposite\npixel level image interactions, how each pixels composite together");
			p6_nodes.forEach(detach);
			t138 = claim_space(section15_nodes);
			p7 = claim_element(section15_nodes, "P", {});
			var p7_nodes = children(p7);
			t139 = claim_text(p7_nodes, "feConvolve\nhow pixels interacte with its neighbour, this results in blurring, sharpening");
			p7_nodes.forEach(detach);
			t140 = claim_space(section15_nodes);
			p8 = claim_element(section15_nodes, "P", {});
			var p8_nodes = children(p8);
			t141 = claim_text(p8_nodes, "feDiffuseLighting\ndefines a light source");
			p8_nodes.forEach(detach);
			t142 = claim_space(section15_nodes);
			p9 = claim_element(section15_nodes, "P", {});
			var p9_nodes = children(p9);
			t143 = claim_text(p9_nodes, "feDisplacementMap\ndisplaces an image, in, using another image in2 to displace the in image");
			p9_nodes.forEach(detach);
			t144 = claim_space(section15_nodes);
			p10 = claim_element(section15_nodes, "P", {});
			var p10_nodes = children(p10);
			t145 = claim_text(p10_nodes, "feFlood\nfills the filter subregion with the specified color and opacity");
			p10_nodes.forEach(detach);
			t146 = claim_space(section15_nodes);
			p11 = claim_element(section15_nodes, "P", {});
			var p11_nodes = children(p11);
			t147 = claim_text(p11_nodes, "feGaussianBlur\nsame as what ");
			code3 = claim_element(p11_nodes, "CODE", {});
			var code3_nodes = children(code3);
			t148 = claim_text(code3_nodes, "blur()");
			code3_nodes.forEach(detach);
			t149 = claim_text(p11_nodes, " use");
			p11_nodes.forEach(detach);
			t150 = claim_space(section15_nodes);
			p12 = claim_element(section15_nodes, "P", {});
			var p12_nodes = children(p12);
			t151 = claim_text(p12_nodes, "feImage\nto use with other filters, feBlend or feComposite");
			p12_nodes.forEach(detach);
			t152 = claim_space(section15_nodes);
			p13 = claim_element(section15_nodes, "P", {});
			var p13_nodes = children(p13);
			t153 = claim_text(p13_nodes, "feMerge\nasynchronous operations in the filter effects instead of layering them");
			p13_nodes.forEach(detach);
			t154 = claim_space(section15_nodes);
			p14 = claim_element(section15_nodes, "P", {});
			var p14_nodes = children(p14);
			t155 = claim_text(p14_nodes, "feMorphology\nerods or dilates the input image");
			p14_nodes.forEach(detach);
			t156 = claim_space(section15_nodes);
			p15 = claim_element(section15_nodes, "P", {});
			var p15_nodes = children(p15);
			t157 = claim_text(p15_nodes, "feOffset\nuseful for creating dropShadow");
			p15_nodes.forEach(detach);
			t158 = claim_space(section15_nodes);
			p16 = claim_element(section15_nodes, "P", {});
			var p16_nodes = children(p16);
			t159 = claim_text(p16_nodes, "feSpecularLighting\nuse alpha channel as bump map");
			p16_nodes.forEach(detach);
			t160 = claim_space(section15_nodes);
			p17 = claim_element(section15_nodes, "P", {});
			var p17_nodes = children(p17);
			t161 = claim_text(p17_nodes, "feTile\nhow image repeated to fill the space");
			p17_nodes.forEach(detach);
			t162 = claim_space(section15_nodes);
			p18 = claim_element(section15_nodes, "P", {});
			var p18_nodes = children(p18);
			t163 = claim_text(p18_nodes, "feTurbulence\ncreates image using Perlin turbulence function");
			p18_nodes.forEach(detach);
			t164 = claim_space(section15_nodes);
			p19 = claim_element(section15_nodes, "P", {});
			var p19_nodes = children(p19);
			a33 = claim_element(p19_nodes, "A", { href: true, rel: true });
			var a33_nodes = children(a33);
			t165 = claim_text(a33_nodes, "https://www.w3.org/TR/filter-effects-1/#ShorthandEquivalents");
			a33_nodes.forEach(detach);
			p19_nodes.forEach(detach);
			t166 = claim_space(section15_nodes);
			ul21 = claim_element(section15_nodes, "UL", {});
			var ul21_nodes = children(ul21);
			li53 = claim_element(ul21_nodes, "LI", {});
			var li53_nodes = children(li53);
			a34 = claim_element(li53_nodes, "A", { href: true, rel: true });
			var a34_nodes = children(a34);
			t167 = claim_text(a34_nodes, "https://tympanus.net/codrops/2019/01/15/svg-filters-101");
			a34_nodes.forEach(detach);
			li53_nodes.forEach(detach);
			t168 = claim_space(ul21_nodes);
			li54 = claim_element(ul21_nodes, "LI", {});
			var li54_nodes = children(li54);
			a35 = claim_element(li54_nodes, "A", { href: true, rel: true });
			var a35_nodes = children(a35);
			t169 = claim_text(a35_nodes, "https://www.sarasoueidan.com/blog/compositing-and-blending-in-css/");
			a35_nodes.forEach(detach);
			li54_nodes.forEach(detach);
			t170 = claim_space(ul21_nodes);
			li55 = claim_element(ul21_nodes, "LI", {});
			var li55_nodes = children(li55);
			a36 = claim_element(li55_nodes, "A", { href: true, rel: true });
			var a36_nodes = children(a36);
			t171 = claim_text(a36_nodes, "https://alistapart.com/article/finessing-fecolormatrix/");
			a36_nodes.forEach(detach);
			li55_nodes.forEach(detach);
			t172 = claim_space(ul21_nodes);
			li56 = claim_element(ul21_nodes, "LI", {});
			var li56_nodes = children(li56);
			a37 = claim_element(li56_nodes, "A", { href: true, rel: true });
			var a37_nodes = children(a37);
			t173 = claim_text(a37_nodes, "https://css-tricks.com/color-filters-can-turn-your-gray-skies-blue/");
			a37_nodes.forEach(detach);
			li56_nodes.forEach(detach);
			t174 = claim_space(ul21_nodes);
			li57 = claim_element(ul21_nodes, "LI", {});
			var li57_nodes = children(li57);
			a38 = claim_element(li57_nodes, "A", { href: true, rel: true });
			var a38_nodes = children(a38);
			t175 = claim_text(a38_nodes, "https://css-tricks.com/look-svg-light-source-filters/");
			a38_nodes.forEach(detach);
			li57_nodes.forEach(detach);
			ul21_nodes.forEach(detach);
			section15_nodes.forEach(detach);
			this.h();
		},
		h() {
			attr(a0, "href", "#css-filters");
			attr(a1, "href", "#blur");
			attr(a2, "href", "#brightness");
			attr(a3, "href", "#contrast");
			attr(a4, "href", "#grayscale");
			attr(a5, "href", "#invert");
			attr(a6, "href", "#opacity");
			attr(a7, "href", "#saturate");
			attr(a8, "href", "#sepia");
			attr(a9, "href", "#hue-rotate");
			attr(a10, "href", "#drop-shadow");
			attr(a11, "href", "#url");
			attr(a12, "href", "#backdrop-filter");
			attr(a13, "href", "#svg-filters");
			attr(a14, "href", "#color-matrix");
			attr(ul2, "class", "sitemap");
			attr(ul2, "id", "sitemap");
			attr(ul2, "role", "navigation");
			attr(ul2, "aria-label", "Table of Contents");
			attr(a15, "href", "#css-filters");
			attr(a15, "id", "css-filters");
			attr(pre0, "class", "language-css");
			attr(a16, "href", "#blur");
			attr(a16, "id", "blur");
			attr(pre1, "class", "language-css");
			attr(source0, "type", "image/webp");
			attr(source0, "srcset", __build_img_webp__0);
			attr(source1, "type", "image/jpeg");
			attr(source1, "srcset", __build_img__0);
			attr(img0, "title", "null");
			attr(img0, "alt", "filter blur");
			attr(img0, "data-src", __build_img__0);
			attr(img0, "loading", "lazy");
			attr(img0, "class", "svelte-pzh0pi");
			attr(a17, "href", "#brightness");
			attr(a17, "id", "brightness");
			attr(pre2, "class", "language-css");
			attr(source2, "type", "image/webp");
			attr(source2, "srcset", __build_img_webp__1);
			attr(source3, "type", "image/jpeg");
			attr(source3, "srcset", __build_img__1);
			attr(img1, "title", "null");
			attr(img1, "alt", "filter brightness");
			attr(img1, "data-src", __build_img__1);
			attr(img1, "loading", "lazy");
			attr(img1, "class", "svelte-pzh0pi");
			attr(a18, "href", "#contrast");
			attr(a18, "id", "contrast");
			attr(pre3, "class", "language-css");
			attr(source4, "type", "image/webp");
			attr(source4, "srcset", __build_img_webp__2);
			attr(source5, "type", "image/jpeg");
			attr(source5, "srcset", __build_img__2);
			attr(img2, "title", "null");
			attr(img2, "alt", "filter contrast");
			attr(img2, "data-src", __build_img__2);
			attr(img2, "loading", "lazy");
			attr(img2, "class", "svelte-pzh0pi");
			attr(a19, "href", "#grayscale");
			attr(a19, "id", "grayscale");
			attr(a20, "href", "#invert");
			attr(a20, "id", "invert");
			attr(a21, "href", "#opacity");
			attr(a21, "id", "opacity");
			attr(a22, "href", "#saturate");
			attr(a22, "id", "saturate");
			attr(a23, "href", "#sepia");
			attr(a23, "id", "sepia");
			attr(a24, "href", "#hue-rotate");
			attr(a24, "id", "hue-rotate");
			attr(a25, "href", "#drop-shadow");
			attr(a25, "id", "drop-shadow");
			attr(a26, "href", "#url");
			attr(a26, "id", "url");
			attr(pre4, "class", "language-html");
			attr(a27, "href", "#backdrop-filter");
			attr(a27, "id", "backdrop-filter");
			attr(a28, "href", "https://css-tricks.com/almanac/properties/b/backdrop-filter/");
			attr(a28, "rel", "nofollow");
			attr(a29, "href", "#svg-filters");
			attr(a29, "id", "svg-filters");
			attr(a30, "href", "#color-matrix");
			attr(a30, "id", "color-matrix");
			attr(a31, "href", "https://alistapart.com/article/finessing-fecolormatrix/");
			attr(a31, "rel", "nofollow");
			attr(a32, "href", "https://css-tricks.com/color-filters-can-turn-your-gray-skies-blue/");
			attr(a32, "rel", "nofollow");
			attr(a33, "href", "https://www.w3.org/TR/filter-effects-1/#ShorthandEquivalents");
			attr(a33, "rel", "nofollow");
			attr(a34, "href", "https://tympanus.net/codrops/2019/01/15/svg-filters-101");
			attr(a34, "rel", "nofollow");
			attr(a35, "href", "https://www.sarasoueidan.com/blog/compositing-and-blending-in-css/");
			attr(a35, "rel", "nofollow");
			attr(a36, "href", "https://alistapart.com/article/finessing-fecolormatrix/");
			attr(a36, "rel", "nofollow");
			attr(a37, "href", "https://css-tricks.com/color-filters-can-turn-your-gray-skies-blue/");
			attr(a37, "rel", "nofollow");
			attr(a38, "href", "https://css-tricks.com/look-svg-light-source-filters/");
			attr(a38, "rel", "nofollow");
		},
		m(target, anchor) {
			insert(target, section0, anchor);
			append(section0, ul2);
			append(ul2, li0);
			append(li0, a0);
			append(a0, t0);
			append(ul2, ul0);
			append(ul0, li1);
			append(li1, a1);
			append(a1, t1);
			append(ul0, li2);
			append(li2, a2);
			append(a2, t2);
			append(ul0, li3);
			append(li3, a3);
			append(a3, t3);
			append(ul0, li4);
			append(li4, a4);
			append(a4, t4);
			append(ul0, li5);
			append(li5, a5);
			append(a5, t5);
			append(ul0, li6);
			append(li6, a6);
			append(a6, t6);
			append(ul0, li7);
			append(li7, a7);
			append(a7, t7);
			append(ul0, li8);
			append(li8, a8);
			append(a8, t8);
			append(ul0, li9);
			append(li9, a9);
			append(a9, t9);
			append(ul0, li10);
			append(li10, a10);
			append(a10, t10);
			append(ul0, li11);
			append(li11, a11);
			append(a11, t11);
			append(ul0, li12);
			append(li12, a12);
			append(a12, t12);
			append(ul2, li13);
			append(li13, a13);
			append(a13, t13);
			append(ul2, ul1);
			append(ul1, li14);
			append(li14, a14);
			append(a14, t14);
			insert(target, t15, anchor);
			insert(target, section1, anchor);
			append(section1, h20);
			append(h20, a15);
			append(a15, t16);
			append(section1, t17);
			append(section1, ul3);
			append(ul3, li15);
			append(li15, t18);
			append(ul3, t19);
			append(ul3, li16);
			append(li16, t20);
			append(section1, t21);
			append(section1, pre0);
			pre0.innerHTML = raw0_value;
			insert(target, t22, anchor);
			insert(target, section2, anchor);
			append(section2, h30);
			append(h30, a16);
			append(a16, t23);
			append(section2, t24);
			append(section2, ul4);
			append(ul4, li17);
			append(li17, t25);
			append(ul4, t26);
			append(ul4, li18);
			append(li18, t27);
			append(section2, t28);
			append(section2, pre1);
			pre1.innerHTML = raw1_value;
			append(section2, t29);
			append(section2, p0);
			append(p0, picture0);
			append(picture0, source0);
			append(picture0, source1);
			append(picture0, img0);
			insert(target, t30, anchor);
			insert(target, section3, anchor);
			append(section3, h31);
			append(h31, a17);
			append(a17, t31);
			append(section3, t32);
			append(section3, ul5);
			append(ul5, li19);
			append(li19, t33);
			append(ul5, t34);
			append(ul5, li20);
			append(li20, t35);
			append(ul5, t36);
			append(ul5, li21);
			append(li21, t37);
			append(ul5, t38);
			append(ul5, li22);
			append(li22, t39);
			append(section3, t40);
			append(section3, pre2);
			pre2.innerHTML = raw2_value;
			append(section3, t41);
			append(section3, p1);
			append(p1, picture1);
			append(picture1, source2);
			append(picture1, source3);
			append(picture1, img1);
			insert(target, t42, anchor);
			insert(target, section4, anchor);
			append(section4, h32);
			append(h32, a18);
			append(a18, t43);
			append(section4, t44);
			append(section4, ul6);
			append(ul6, li23);
			append(li23, t45);
			append(ul6, t46);
			append(ul6, li24);
			append(li24, t47);
			append(ul6, t48);
			append(ul6, li25);
			append(li25, t49);
			append(section4, t50);
			append(section4, pre3);
			pre3.innerHTML = raw3_value;
			append(section4, t51);
			append(section4, p2);
			append(p2, picture2);
			append(picture2, source4);
			append(picture2, source5);
			append(picture2, img2);
			insert(target, t52, anchor);
			insert(target, section5, anchor);
			append(section5, h33);
			append(h33, a19);
			append(a19, t53);
			append(section5, t54);
			append(section5, ul8);
			append(ul8, li27);
			append(li27, t55);
			append(li27, ul7);
			append(ul7, li26);
			append(li26, t56);
			insert(target, t57, anchor);
			insert(target, section6, anchor);
			append(section6, h34);
			append(h34, a20);
			append(a20, t58);
			append(section6, t59);
			append(section6, ul9);
			append(ul9, li28);
			append(li28, t60);
			append(ul9, t61);
			append(ul9, li29);
			append(li29, code0);
			append(code0, t62);
			append(li29, t63);
			append(ul9, t64);
			append(ul9, li30);
			append(li30, code1);
			append(code1, t65);
			append(li30, t66);
			append(ul9, t67);
			append(ul9, li31);
			append(li31, t68);
			insert(target, t69, anchor);
			insert(target, section7, anchor);
			append(section7, h35);
			append(h35, a21);
			append(a21, t70);
			append(section7, t71);
			append(section7, ul10);
			append(ul10, li32);
			append(li32, t72);
			insert(target, t73, anchor);
			insert(target, section8, anchor);
			append(section8, h36);
			append(h36, a22);
			append(a22, t74);
			append(section8, t75);
			append(section8, ul11);
			append(ul11, li33);
			append(li33, t76);
			append(ul11, t77);
			append(ul11, li34);
			append(li34, t78);
			append(ul11, t79);
			append(ul11, li35);
			append(li35, t80);
			insert(target, t81, anchor);
			insert(target, section9, anchor);
			append(section9, h37);
			append(h37, a23);
			append(a23, t82);
			append(section9, t83);
			append(section9, ul12);
			append(ul12, li36);
			append(li36, t84);
			append(ul12, t85);
			append(ul12, li37);
			append(li37, t86);
			append(ul12, t87);
			append(ul12, li38);
			append(li38, t88);
			insert(target, t89, anchor);
			insert(target, section10, anchor);
			append(section10, h38);
			append(h38, a24);
			append(a24, t90);
			append(section10, t91);
			append(section10, ul13);
			append(ul13, li39);
			append(li39, t92);
			append(ul13, t93);
			append(ul13, li40);
			append(li40, t94);
			insert(target, t95, anchor);
			insert(target, section11, anchor);
			append(section11, h39);
			append(h39, a25);
			append(a25, t96);
			append(section11, t97);
			append(section11, ul14);
			append(ul14, li41);
			append(li41, t98);
			append(ul14, t99);
			append(ul14, li42);
			append(li42, t100);
			insert(target, t101, anchor);
			insert(target, section12, anchor);
			append(section12, h310);
			append(h310, a26);
			append(a26, t102);
			append(section12, t103);
			append(section12, ul15);
			append(ul15, li43);
			append(li43, t104);
			append(ul15, t105);
			append(ul15, li44);
			append(li44, t106);
			append(section12, t107);
			append(section12, pre4);
			pre4.innerHTML = raw4_value;
			insert(target, t108, anchor);
			insert(target, section13, anchor);
			append(section13, h311);
			append(h311, a27);
			append(a27, code2);
			append(code2, t109);
			append(section13, t110);
			append(section13, ul16);
			append(ul16, li45);
			append(li45, t111);
			append(ul16, t112);
			append(ul16, li46);
			append(li46, a28);
			append(a28, t113);
			insert(target, t114, anchor);
			insert(target, section14, anchor);
			append(section14, h21);
			append(h21, a29);
			append(a29, t115);
			insert(target, t116, anchor);
			insert(target, section15, anchor);
			append(section15, h312);
			append(h312, a30);
			append(a30, t117);
			append(section15, t118);
			append(section15, ul17);
			append(ul17, li47);
			append(li47, a31);
			append(a31, t119);
			append(ul17, t120);
			append(ul17, li48);
			append(li48, a32);
			append(a32, t121);
			append(section15, t122);
			append(section15, ul18);
			append(ul18, li49);
			append(li49, t123);
			append(section15, t124);
			append(section15, p3);
			append(p3, t125);
			append(section15, t126);
			append(section15, ul19);
			append(ul19, li50);
			append(li50, t127);
			append(ul19, t128);
			append(ul19, li51);
			append(li51, t129);
			append(section15, t130);
			append(section15, p4);
			append(p4, t131);
			append(section15, t132);
			append(section15, p5);
			append(p5, t133);
			append(section15, t134);
			append(section15, ul20);
			append(ul20, li52);
			append(li52, t135);
			append(section15, t136);
			append(section15, p6);
			append(p6, t137);
			append(section15, t138);
			append(section15, p7);
			append(p7, t139);
			append(section15, t140);
			append(section15, p8);
			append(p8, t141);
			append(section15, t142);
			append(section15, p9);
			append(p9, t143);
			append(section15, t144);
			append(section15, p10);
			append(p10, t145);
			append(section15, t146);
			append(section15, p11);
			append(p11, t147);
			append(p11, code3);
			append(code3, t148);
			append(p11, t149);
			append(section15, t150);
			append(section15, p12);
			append(p12, t151);
			append(section15, t152);
			append(section15, p13);
			append(p13, t153);
			append(section15, t154);
			append(section15, p14);
			append(p14, t155);
			append(section15, t156);
			append(section15, p15);
			append(p15, t157);
			append(section15, t158);
			append(section15, p16);
			append(p16, t159);
			append(section15, t160);
			append(section15, p17);
			append(p17, t161);
			append(section15, t162);
			append(section15, p18);
			append(p18, t163);
			append(section15, t164);
			append(section15, p19);
			append(p19, a33);
			append(a33, t165);
			append(section15, t166);
			append(section15, ul21);
			append(ul21, li53);
			append(li53, a34);
			append(a34, t167);
			append(ul21, t168);
			append(ul21, li54);
			append(li54, a35);
			append(a35, t169);
			append(ul21, t170);
			append(ul21, li55);
			append(li55, a36);
			append(a36, t171);
			append(ul21, t172);
			append(ul21, li56);
			append(li56, a37);
			append(a37, t173);
			append(ul21, t174);
			append(ul21, li57);
			append(li57, a38);
			append(a38, t175);
		},
		p: noop,
		d(detaching) {
			if (detaching) detach(section0);
			if (detaching) detach(t15);
			if (detaching) detach(section1);
			if (detaching) detach(t22);
			if (detaching) detach(section2);
			if (detaching) detach(t30);
			if (detaching) detach(section3);
			if (detaching) detach(t42);
			if (detaching) detach(section4);
			if (detaching) detach(t52);
			if (detaching) detach(section5);
			if (detaching) detach(t57);
			if (detaching) detach(section6);
			if (detaching) detach(t69);
			if (detaching) detach(section7);
			if (detaching) detach(t73);
			if (detaching) detach(section8);
			if (detaching) detach(t81);
			if (detaching) detach(section9);
			if (detaching) detach(t89);
			if (detaching) detach(section10);
			if (detaching) detach(t95);
			if (detaching) detach(section11);
			if (detaching) detach(t101);
			if (detaching) detach(section12);
			if (detaching) detach(t108);
			if (detaching) detach(section13);
			if (detaching) detach(t114);
			if (detaching) detach(section14);
			if (detaching) detach(t116);
			if (detaching) detach(section15);
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
	"title": "The CSS Podcast: 023: Filters",
	"tags": ["css filters", "The CSS Podcast"],
	"slug": "notes/css-podcast-023-filters",
	"type": "notes",
	"name": "css-podcast-023-filters",
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
