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

var __build_img_webp__2 = "b99de16c0c7080a6.webp";

var __build_img__2 = "b99de16c0c7080a6.png";

var __build_img_webp__1 = "b4e3a6db6c4065ee.webp";

var __build_img__1 = "b4e3a6db6c4065ee.png";

var __build_img_webp__0 = "3916853a3ce3a171.webp";

var __build_img__0 = "3916853a3ce3a171.png";

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

var baseCss = "https://lihautan.com/notes/css-podcast-021-gradients/assets/blog-base-248115e4.css";

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
			attr(meta8, "content", "https%3A%2F%2Flihautan.com%2Fnotes%2Fcss-podcast-021-gradients");
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
	let ul0;
	let li0;
	let a0;
	let t0;
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
	let t7;
	let section1;
	let h20;
	let a7;
	let t8;
	let t9;
	let p0;
	let t10;
	let t11;
	let p1;
	let strong0;
	let t12;
	let t13;
	let strong1;
	let t14;
	let t15;
	let strong2;
	let t16;
	let t17;
	let t18;
	let section2;
	let h21;
	let a8;
	let t19;
	let t20;
	let pre0;

	let raw0_value = `<code class="language-">linear-gradient(
  [ &lt;angle&gt; | to &lt;side-or-corner&gt; ]? ,
  &lt;color-stop-list&gt;
)
&lt;side-or-corner&gt; = [left | right] || [top | bottom]</code>` + "";

	let t21;
	let p2;
	let t22;
	let t23;
	let ul1;
	let li7;
	let t24;
	let t25;
	let li8;
	let t26;
	let t27;
	let pre1;

	let raw1_value = `<code class="language-css"><span class="token selector">.element</span> <span class="token punctuation">&#123;</span>
  <span class="token function">linear-graident</span><span class="token punctuation">(</span>pink<span class="token punctuation">,</span> orange<span class="token punctuation">)</span><span class="token punctuation">;</span> <span class="token comment">/* default color transition hints at 50% */</span>
  <span class="token function">linear-gradient</span><span class="token punctuation">(</span>pink<span class="token punctuation">,</span> 50%<span class="token punctuation">,</span> orange<span class="token punctuation">)</span><span class="token punctuation">;</span> <span class="token comment">/* color stop fixup, starting color at 0%, final color at 100% */</span>
  <span class="token function">linear-gradient</span><span class="token punctuation">(</span>pink 0%<span class="token punctuation">,</span> orange 100%<span class="token punctuation">)</span><span class="token punctuation">;</span>
  <span class="token function">linear-gradient</span><span class="token punctuation">(</span>pink 0%<span class="token punctuation">,</span> 50%<span class="token punctuation">,</span> orange 100%<span class="token punctuation">)</span><span class="token punctuation">;</span>
<span class="token punctuation">&#125;</span></code>` + "";

	let t28;
	let section3;
	let h22;
	let a9;
	let t29;
	let t30;
	let pre2;

	let raw2_value = `<code class="language-">radial-gradient(
  [ &lt;ending-shape&gt; || &lt;size&gt; ]? [ at &lt;position&gt; ]? ,
  &lt;color-stop-list&gt;
)</code>` + "";

	let t31;
	let ul4;
	let li9;
	let p3;
	let t32;
	let t33;
	let li10;
	let p4;
	let t34;
	let t35;
	let li11;
	let p5;
	let t36;
	let t37;
	let li16;
	let p6;
	let t38;
	let t39;
	let ul3;
	let li12;
	let t40;
	let t41;
	let li13;
	let t42;
	let t43;
	let li15;
	let t44;
	let ul2;
	let li14;
	let t45;
	let t46;
	let pre3;

	let raw3_value = `<code class="language-css">&lt;section>
  &lt;div id=<span class="token string">"closest-side"</span>>&lt;/div>
  &lt;div id=<span class="token string">"farthest-side"</span>>&lt;/div>
  &lt;div id=<span class="token string">"closest-corner"</span>>&lt;/div>
  &lt;div id=<span class="token string">"farthest-corner"</span>>&lt;/div>
&lt;/section></code>` + "";

	let t47;
	let pre4;

	let raw4_value = `<code class="language-css"><span class="token selector">#closest-side</span> <span class="token punctuation">&#123;</span>
  <span class="token property">background</span><span class="token punctuation">:</span> <span class="token function">radial-gradient</span><span class="token punctuation">(</span>circle closest-side<span class="token punctuation">,</span> yellow 100%<span class="token punctuation">,</span> 100%<span class="token punctuation">,</span> red<span class="token punctuation">)</span><span class="token punctuation">;</span>
<span class="token punctuation">&#125;</span>
<span class="token selector">#farthest-side</span> <span class="token punctuation">&#123;</span>
  <span class="token property">background</span><span class="token punctuation">:</span> <span class="token function">radial-gradient</span><span class="token punctuation">(</span>circle farthest-side<span class="token punctuation">,</span> yellow 100%<span class="token punctuation">,</span> 100%<span class="token punctuation">,</span> red<span class="token punctuation">)</span><span class="token punctuation">;</span>
<span class="token punctuation">&#125;</span>
<span class="token selector">#closest-corner</span> <span class="token punctuation">&#123;</span>
  <span class="token property">background</span><span class="token punctuation">:</span> <span class="token function">radial-gradient</span><span class="token punctuation">(</span>circle closest-corner at 30px 30px<span class="token punctuation">,</span> yellow 100%<span class="token punctuation">,</span> 100%<span class="token punctuation">,</span> red<span class="token punctuation">)</span><span class="token punctuation">;</span>
<span class="token punctuation">&#125;</span>
<span class="token selector">#farthest-corner</span> <span class="token punctuation">&#123;</span>
  <span class="token property">background</span><span class="token punctuation">:</span> <span class="token function">radial-gradient</span><span class="token punctuation">(</span>circle farthest-corner at 30px 30px<span class="token punctuation">,</span> yellow 100%<span class="token punctuation">,</span> 100%<span class="token punctuation">,</span> red<span class="token punctuation">)</span><span class="token punctuation">;</span>
<span class="token punctuation">&#125;</span></code>` + "";

	let t48;
	let p7;
	let picture0;
	let source0;
	let source1;
	let img0;
	let t49;
	let ul5;
	let li17;
	let t50;
	let a10;
	let t51;
	let t52;
	let section4;
	let h23;
	let a11;
	let t53;
	let t54;
	let ul6;
	let li18;
	let t55;
	let t56;
	let pre5;

	let raw5_value = `<code class="language-">conic-gradient() = conic-gradient(
  [ from &lt;angle&gt; ]? [ at &lt;position&gt; ]?,
  &lt;angular-color-stop-list&gt;</code>` + "";

	let t57;
	let ul7;
	let li19;
	let t58;
	let t59;
	let section5;
	let h24;
	let a12;
	let t60;
	let t61;
	let ul9;
	let li20;
	let t62;
	let code0;
	let t63;
	let t64;
	let code1;
	let t65;
	let t66;
	let code2;
	let t67;
	let t68;
	let li21;
	let t69;
	let t70;
	let li22;
	let t71;
	let t72;
	let li24;
	let t73;
	let ul8;
	let li23;
	let a13;
	let t74;
	let t75;
	let section6;
	let h25;
	let a14;
	let t76;
	let t77;
	let ul10;
	let li25;
	let t78;
	let a15;
	let t79;
	let t80;
	let t81;
	let li26;
	let t82;
	let t83;
	let pre6;

	let raw6_value = `<code class="language-html"><span class="token tag"><span class="token tag"><span class="token punctuation">&lt;</span>style</span><span class="token punctuation">></span></span><span class="token style"><span class="token language-css">
  <span class="token selector">div</span> <span class="token punctuation">&#123;</span>
    <span class="token property">background</span><span class="token punctuation">:</span> <span class="token function">repeating-conic-gradient</span><span class="token punctuation">(</span>from <span class="token function">calc</span><span class="token punctuation">(</span><span class="token function">var</span><span class="token punctuation">(</span>--number<span class="token punctuation">,</span> 0<span class="token punctuation">)</span> * 1turn<span class="token punctuation">)</span> at center<span class="token punctuation">,</span> red 0 4deg<span class="token punctuation">,</span> transparent 0 8deg<span class="token punctuation">)</span> fixed<span class="token punctuation">;</span>
    <span class="token property">animation</span><span class="token punctuation">:</span> to1 600s linear infinite<span class="token punctuation">;</span>
  <span class="token punctuation">&#125;</span>
  <span class="token atrule"><span class="token rule">@keyframes</span> to1</span> <span class="token punctuation">&#123;</span>
    <span class="token selector">to</span> <span class="token punctuation">&#123;</span>
      <span class="token property">--number</span><span class="token punctuation">:</span> 1<span class="token punctuation">;</span>
    <span class="token punctuation">&#125;</span>
  <span class="token punctuation">&#125;</span>
</span></span><span class="token tag"><span class="token tag"><span class="token punctuation">&lt;/</span>style</span><span class="token punctuation">></span></span>
<span class="token tag"><span class="token tag"><span class="token punctuation">&lt;</span>script</span><span class="token punctuation">></span></span><span class="token script"><span class="token language-javascript">
  <span class="token keyword">if</span> <span class="token punctuation">(</span>window<span class="token punctuation">.</span><span class="token constant">CSS</span> <span class="token operator">&amp;&amp;</span> <span class="token constant">CSS</span><span class="token punctuation">.</span>registerProperty<span class="token punctuation">)</span> <span class="token punctuation">&#123;</span>
    <span class="token constant">CSS</span><span class="token punctuation">.</span><span class="token function">registerProperty</span><span class="token punctuation">(</span><span class="token punctuation">&#123;</span>
      name<span class="token punctuation">:</span> <span class="token string">'--number'</span><span class="token punctuation">,</span>
      syntax<span class="token punctuation">:</span> <span class="token string">'&lt;number>'</span><span class="token punctuation">,</span>
      inherits<span class="token punctuation">:</span> <span class="token boolean">true</span><span class="token punctuation">,</span>
      initialValue<span class="token punctuation">:</span> <span class="token string">'0'</span><span class="token punctuation">,</span>
    <span class="token punctuation">&#125;</span><span class="token punctuation">)</span><span class="token punctuation">;</span>
  <span class="token punctuation">&#125;</span>
</span></span><span class="token tag"><span class="token tag"><span class="token punctuation">&lt;/</span>script</span><span class="token punctuation">></span></span></code>` + "";

	let t84;
	let section7;
	let h26;
	let a16;
	let t85;
	let code3;
	let t86;
	let t87;
	let ul11;
	let li27;
	let t88;
	let t89;
	let li28;
	let t90;
	let t91;
	let p8;
	let t92;
	let picture1;
	let source2;
	let source3;
	let img1;
	let t93;
	let p9;
	let t94;
	let picture2;
	let source4;
	let source5;
	let img2;
	let t95;
	let p10;
	let t96;
	let t97;
	let ul13;
	let li29;
	let t98;
	let a17;
	let t99;
	let t100;
	let li31;
	let t101;
	let a18;
	let t102;
	let ul12;
	let li30;
	let t103;
	let t104;
	let li32;
	let t105;
	let a19;
	let t106;
	let t107;
	let li33;
	let t108;
	let a20;
	let t109;

	return {
		c() {
			section0 = element("section");
			ul0 = element("ul");
			li0 = element("li");
			a0 = element("a");
			t0 = text("CSS Gradients");
			li1 = element("li");
			a1 = element("a");
			t1 = text("linear-gradient()");
			li2 = element("li");
			a2 = element("a");
			t2 = text("radial-gradient()");
			li3 = element("li");
			a3 = element("a");
			t3 = text("conic-gradient()");
			li4 = element("li");
			a4 = element("a");
			t4 = text("repeating-linear-gradient, repeating-radial-gradient, repeating-conic-gradient");
			li5 = element("li");
			a5 = element("a");
			t5 = text("animating repeating-conic-gradient");
			li6 = element("li");
			a6 = element("a");
			t6 = text("Avoid  transparent");
			t7 = space();
			section1 = element("section");
			h20 = element("h2");
			a7 = element("a");
			t8 = text("CSS Gradients");
			t9 = space();
			p0 = element("p");
			t10 = text("Gradient is an image that smoothly fading from 1 color to another");
			t11 = space();
			p1 = element("p");
			strong0 = element("strong");
			t12 = text("Color stops");
			t13 = text(" - a color and a corresponding position on the gradient line\n");
			strong1 = element("strong");
			t14 = text("Color transition hints");
			t15 = text(" - a position to decide whether the middle point should be for the 2 color stops\n");
			strong2 = element("strong");
			t16 = text("Color stop fixup");
			t17 = text(" - automatically assigning a length to color stops");
			t18 = space();
			section2 = element("section");
			h21 = element("h2");
			a8 = element("a");
			t19 = text("linear-gradient()");
			t20 = space();
			pre0 = element("pre");
			t21 = space();
			p2 = element("p");
			t22 = text("angle");
			t23 = space();
			ul1 = element("ul");
			li7 = element("li");
			t24 = text("example: 180deg, 3.14rad, 0.5turn");
			t25 = space();
			li8 = element("li");
			t26 = text("to bottom, to right, to top left");
			t27 = space();
			pre1 = element("pre");
			t28 = space();
			section3 = element("section");
			h22 = element("h2");
			a9 = element("a");
			t29 = text("radial-gradient()");
			t30 = space();
			pre2 = element("pre");
			t31 = space();
			ul4 = element("ul");
			li9 = element("li");
			p3 = element("p");
			t32 = text("ending shape is either circle / ellipse");
			t33 = space();
			li10 = element("li");
			p4 = element("p");
			t34 = text("can provide ending shape or size");
			t35 = space();
			li11 = element("li");
			p5 = element("p");
			t36 = text("if only passing size, if only 1 size -> circle, multiple sizes -> ellipse");
			t37 = space();
			li16 = element("li");
			p6 = element("p");
			t38 = text("size");
			t39 = space();
			ul3 = element("ul");
			li12 = element("li");
			t40 = text("cannot be negative");
			t41 = space();
			li13 = element("li");
			t42 = text("absolute length (eg: 5rem, 10px) / relative length (eg: 30%)");
			t43 = space();
			li15 = element("li");
			t44 = text("closest-side, farthest-side, closest-corner, farthest-corner");
			ul2 = element("ul");
			li14 = element("li");
			t45 = text("the circle / ellipse must passes through");
			t46 = space();
			pre3 = element("pre");
			t47 = space();
			pre4 = element("pre");
			t48 = space();
			p7 = element("p");
			picture0 = element("picture");
			source0 = element("source");
			source1 = element("source");
			img0 = element("img");
			t49 = space();
			ul5 = element("ul");
			li17 = element("li");
			t50 = text("Codepen ");
			a10 = element("a");
			t51 = text("https://codepen.io/tanhauhau/pen/poyRgOj?editors=1100");
			t52 = space();
			section4 = element("section");
			h23 = element("h2");
			a11 = element("a");
			t53 = text("conic-gradient()");
			t54 = space();
			ul6 = element("ul");
			li18 = element("li");
			t55 = text("part of CSS images module level 4");
			t56 = space();
			pre5 = element("pre");
			t57 = space();
			ul7 = element("ul");
			li19 = element("li");
			t58 = text("color stops uses deg / rad / turn units");
			t59 = space();
			section5 = element("section");
			h24 = element("h2");
			a12 = element("a");
			t60 = text("repeating-linear-gradient, repeating-radial-gradient, repeating-conic-gradient");
			t61 = space();
			ul9 = element("ul");
			li20 = element("li");
			t62 = text("same color stop list as ");
			code0 = element("code");
			t63 = text("linear-gradient");
			t64 = text(", ");
			code1 = element("code");
			t65 = text("radial-gradient");
			t66 = text(", ");
			code2 = element("code");
			t67 = text("conic-gradient");
			t68 = space();
			li21 = element("li");
			t69 = text("common pitfall of gradient not repeating is because gradient size of 100%");
			t70 = space();
			li22 = element("li");
			t71 = text("tip: use % based color stops for fixed size gradient, length based color stops for unknown size gradient");
			t72 = space();
			li24 = element("li");
			t73 = text("tip: pair it with background size, repeat and position to create a pattern");
			ul8 = element("ul");
			li23 = element("li");
			a13 = element("a");
			t74 = text("https://leaverou.github.io/css3patterns/");
			t75 = space();
			section6 = element("section");
			h25 = element("h2");
			a14 = element("a");
			t76 = text("animating repeating-conic-gradient");
			t77 = space();
			ul10 = element("ul");
			li25 = element("li");
			t78 = text("from ");
			a15 = element("a");
			t79 = text("https://lea.verou.me/");
			t80 = text(" header");
			t81 = space();
			li26 = element("li");
			t82 = text("using CSS Houdini to make css variable animatable");
			t83 = space();
			pre6 = element("pre");
			t84 = space();
			section7 = element("section");
			h26 = element("h2");
			a16 = element("a");
			t85 = text("Avoid ");
			code3 = element("code");
			t86 = text("transparent");
			t87 = space();
			ul11 = element("ul");
			li27 = element("li");
			t88 = text("avoid transparent in gradients");
			t89 = space();
			li28 = element("li");
			t90 = text("maybe transitioning to white transparent / black transparent");
			t91 = space();
			p8 = element("p");
			t92 = text("safari:\n");
			picture1 = element("picture");
			source2 = element("source");
			source3 = element("source");
			img1 = element("img");
			t93 = space();
			p9 = element("p");
			t94 = text("chrome:\n");
			picture2 = element("picture");
			source4 = element("source");
			source5 = element("source");
			img2 = element("img");
			t95 = space();
			p10 = element("p");
			t96 = text("Links:");
			t97 = space();
			ul13 = element("ul");
			li29 = element("li");
			t98 = text("CSS Image Module Level 3 - Gradients ");
			a17 = element("a");
			t99 = text("https://www.w3.org/TR/css-images-3/#gradients");
			t100 = space();
			li31 = element("li");
			t101 = text("CSS Image Module Level 4 - Gradients ");
			a18 = element("a");
			t102 = text("https://drafts.csswg.org/css-images-4/#gradients");
			ul12 = element("ul");
			li30 = element("li");
			t103 = text("conic-gradient, repeating-conic-gradient");
			t104 = space();
			li32 = element("li");
			t105 = text("Gradient generator ");
			a19 = element("a");
			t106 = text("https://www.colorzilla.com/gradient-editor/");
			t107 = space();
			li33 = element("li");
			t108 = text("Cicada Principle ");
			a20 = element("a");
			t109 = text("https://lea.verou.me/2020/07/the-cicada-principle-revisited-with-css-variables/");
			this.h();
		},
		l(nodes) {
			section0 = claim_element(nodes, "SECTION", {});
			var section0_nodes = children(section0);

			ul0 = claim_element(section0_nodes, "UL", {
				class: true,
				id: true,
				role: true,
				"aria-label": true
			});

			var ul0_nodes = children(ul0);
			li0 = claim_element(ul0_nodes, "LI", {});
			var li0_nodes = children(li0);
			a0 = claim_element(li0_nodes, "A", { href: true });
			var a0_nodes = children(a0);
			t0 = claim_text(a0_nodes, "CSS Gradients");
			a0_nodes.forEach(detach);
			li0_nodes.forEach(detach);
			li1 = claim_element(ul0_nodes, "LI", {});
			var li1_nodes = children(li1);
			a1 = claim_element(li1_nodes, "A", { href: true });
			var a1_nodes = children(a1);
			t1 = claim_text(a1_nodes, "linear-gradient()");
			a1_nodes.forEach(detach);
			li1_nodes.forEach(detach);
			li2 = claim_element(ul0_nodes, "LI", {});
			var li2_nodes = children(li2);
			a2 = claim_element(li2_nodes, "A", { href: true });
			var a2_nodes = children(a2);
			t2 = claim_text(a2_nodes, "radial-gradient()");
			a2_nodes.forEach(detach);
			li2_nodes.forEach(detach);
			li3 = claim_element(ul0_nodes, "LI", {});
			var li3_nodes = children(li3);
			a3 = claim_element(li3_nodes, "A", { href: true });
			var a3_nodes = children(a3);
			t3 = claim_text(a3_nodes, "conic-gradient()");
			a3_nodes.forEach(detach);
			li3_nodes.forEach(detach);
			li4 = claim_element(ul0_nodes, "LI", {});
			var li4_nodes = children(li4);
			a4 = claim_element(li4_nodes, "A", { href: true });
			var a4_nodes = children(a4);
			t4 = claim_text(a4_nodes, "repeating-linear-gradient, repeating-radial-gradient, repeating-conic-gradient");
			a4_nodes.forEach(detach);
			li4_nodes.forEach(detach);
			li5 = claim_element(ul0_nodes, "LI", {});
			var li5_nodes = children(li5);
			a5 = claim_element(li5_nodes, "A", { href: true });
			var a5_nodes = children(a5);
			t5 = claim_text(a5_nodes, "animating repeating-conic-gradient");
			a5_nodes.forEach(detach);
			li5_nodes.forEach(detach);
			li6 = claim_element(ul0_nodes, "LI", {});
			var li6_nodes = children(li6);
			a6 = claim_element(li6_nodes, "A", { href: true });
			var a6_nodes = children(a6);
			t6 = claim_text(a6_nodes, "Avoid  transparent");
			a6_nodes.forEach(detach);
			li6_nodes.forEach(detach);
			ul0_nodes.forEach(detach);
			section0_nodes.forEach(detach);
			t7 = claim_space(nodes);
			section1 = claim_element(nodes, "SECTION", {});
			var section1_nodes = children(section1);
			h20 = claim_element(section1_nodes, "H2", {});
			var h20_nodes = children(h20);
			a7 = claim_element(h20_nodes, "A", { href: true, id: true });
			var a7_nodes = children(a7);
			t8 = claim_text(a7_nodes, "CSS Gradients");
			a7_nodes.forEach(detach);
			h20_nodes.forEach(detach);
			t9 = claim_space(section1_nodes);
			p0 = claim_element(section1_nodes, "P", {});
			var p0_nodes = children(p0);
			t10 = claim_text(p0_nodes, "Gradient is an image that smoothly fading from 1 color to another");
			p0_nodes.forEach(detach);
			t11 = claim_space(section1_nodes);
			p1 = claim_element(section1_nodes, "P", {});
			var p1_nodes = children(p1);
			strong0 = claim_element(p1_nodes, "STRONG", {});
			var strong0_nodes = children(strong0);
			t12 = claim_text(strong0_nodes, "Color stops");
			strong0_nodes.forEach(detach);
			t13 = claim_text(p1_nodes, " - a color and a corresponding position on the gradient line\n");
			strong1 = claim_element(p1_nodes, "STRONG", {});
			var strong1_nodes = children(strong1);
			t14 = claim_text(strong1_nodes, "Color transition hints");
			strong1_nodes.forEach(detach);
			t15 = claim_text(p1_nodes, " - a position to decide whether the middle point should be for the 2 color stops\n");
			strong2 = claim_element(p1_nodes, "STRONG", {});
			var strong2_nodes = children(strong2);
			t16 = claim_text(strong2_nodes, "Color stop fixup");
			strong2_nodes.forEach(detach);
			t17 = claim_text(p1_nodes, " - automatically assigning a length to color stops");
			p1_nodes.forEach(detach);
			section1_nodes.forEach(detach);
			t18 = claim_space(nodes);
			section2 = claim_element(nodes, "SECTION", {});
			var section2_nodes = children(section2);
			h21 = claim_element(section2_nodes, "H2", {});
			var h21_nodes = children(h21);
			a8 = claim_element(h21_nodes, "A", { href: true, id: true });
			var a8_nodes = children(a8);
			t19 = claim_text(a8_nodes, "linear-gradient()");
			a8_nodes.forEach(detach);
			h21_nodes.forEach(detach);
			t20 = claim_space(section2_nodes);
			pre0 = claim_element(section2_nodes, "PRE", { class: true });
			var pre0_nodes = children(pre0);
			pre0_nodes.forEach(detach);
			t21 = claim_space(section2_nodes);
			p2 = claim_element(section2_nodes, "P", {});
			var p2_nodes = children(p2);
			t22 = claim_text(p2_nodes, "angle");
			p2_nodes.forEach(detach);
			t23 = claim_space(section2_nodes);
			ul1 = claim_element(section2_nodes, "UL", {});
			var ul1_nodes = children(ul1);
			li7 = claim_element(ul1_nodes, "LI", {});
			var li7_nodes = children(li7);
			t24 = claim_text(li7_nodes, "example: 180deg, 3.14rad, 0.5turn");
			li7_nodes.forEach(detach);
			t25 = claim_space(ul1_nodes);
			li8 = claim_element(ul1_nodes, "LI", {});
			var li8_nodes = children(li8);
			t26 = claim_text(li8_nodes, "to bottom, to right, to top left");
			li8_nodes.forEach(detach);
			ul1_nodes.forEach(detach);
			t27 = claim_space(section2_nodes);
			pre1 = claim_element(section2_nodes, "PRE", { class: true });
			var pre1_nodes = children(pre1);
			pre1_nodes.forEach(detach);
			section2_nodes.forEach(detach);
			t28 = claim_space(nodes);
			section3 = claim_element(nodes, "SECTION", {});
			var section3_nodes = children(section3);
			h22 = claim_element(section3_nodes, "H2", {});
			var h22_nodes = children(h22);
			a9 = claim_element(h22_nodes, "A", { href: true, id: true });
			var a9_nodes = children(a9);
			t29 = claim_text(a9_nodes, "radial-gradient()");
			a9_nodes.forEach(detach);
			h22_nodes.forEach(detach);
			t30 = claim_space(section3_nodes);
			pre2 = claim_element(section3_nodes, "PRE", { class: true });
			var pre2_nodes = children(pre2);
			pre2_nodes.forEach(detach);
			t31 = claim_space(section3_nodes);
			ul4 = claim_element(section3_nodes, "UL", {});
			var ul4_nodes = children(ul4);
			li9 = claim_element(ul4_nodes, "LI", {});
			var li9_nodes = children(li9);
			p3 = claim_element(li9_nodes, "P", {});
			var p3_nodes = children(p3);
			t32 = claim_text(p3_nodes, "ending shape is either circle / ellipse");
			p3_nodes.forEach(detach);
			li9_nodes.forEach(detach);
			t33 = claim_space(ul4_nodes);
			li10 = claim_element(ul4_nodes, "LI", {});
			var li10_nodes = children(li10);
			p4 = claim_element(li10_nodes, "P", {});
			var p4_nodes = children(p4);
			t34 = claim_text(p4_nodes, "can provide ending shape or size");
			p4_nodes.forEach(detach);
			li10_nodes.forEach(detach);
			t35 = claim_space(ul4_nodes);
			li11 = claim_element(ul4_nodes, "LI", {});
			var li11_nodes = children(li11);
			p5 = claim_element(li11_nodes, "P", {});
			var p5_nodes = children(p5);
			t36 = claim_text(p5_nodes, "if only passing size, if only 1 size -> circle, multiple sizes -> ellipse");
			p5_nodes.forEach(detach);
			li11_nodes.forEach(detach);
			t37 = claim_space(ul4_nodes);
			li16 = claim_element(ul4_nodes, "LI", {});
			var li16_nodes = children(li16);
			p6 = claim_element(li16_nodes, "P", {});
			var p6_nodes = children(p6);
			t38 = claim_text(p6_nodes, "size");
			p6_nodes.forEach(detach);
			t39 = claim_space(li16_nodes);
			ul3 = claim_element(li16_nodes, "UL", {});
			var ul3_nodes = children(ul3);
			li12 = claim_element(ul3_nodes, "LI", {});
			var li12_nodes = children(li12);
			t40 = claim_text(li12_nodes, "cannot be negative");
			li12_nodes.forEach(detach);
			t41 = claim_space(ul3_nodes);
			li13 = claim_element(ul3_nodes, "LI", {});
			var li13_nodes = children(li13);
			t42 = claim_text(li13_nodes, "absolute length (eg: 5rem, 10px) / relative length (eg: 30%)");
			li13_nodes.forEach(detach);
			t43 = claim_space(ul3_nodes);
			li15 = claim_element(ul3_nodes, "LI", {});
			var li15_nodes = children(li15);
			t44 = claim_text(li15_nodes, "closest-side, farthest-side, closest-corner, farthest-corner");
			ul2 = claim_element(li15_nodes, "UL", {});
			var ul2_nodes = children(ul2);
			li14 = claim_element(ul2_nodes, "LI", {});
			var li14_nodes = children(li14);
			t45 = claim_text(li14_nodes, "the circle / ellipse must passes through");
			li14_nodes.forEach(detach);
			ul2_nodes.forEach(detach);
			li15_nodes.forEach(detach);
			ul3_nodes.forEach(detach);
			li16_nodes.forEach(detach);
			ul4_nodes.forEach(detach);
			t46 = claim_space(section3_nodes);
			pre3 = claim_element(section3_nodes, "PRE", { class: true });
			var pre3_nodes = children(pre3);
			pre3_nodes.forEach(detach);
			t47 = claim_space(section3_nodes);
			pre4 = claim_element(section3_nodes, "PRE", { class: true });
			var pre4_nodes = children(pre4);
			pre4_nodes.forEach(detach);
			t48 = claim_space(section3_nodes);
			p7 = claim_element(section3_nodes, "P", {});
			var p7_nodes = children(p7);
			picture0 = claim_element(p7_nodes, "PICTURE", {});
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
			p7_nodes.forEach(detach);
			t49 = claim_space(section3_nodes);
			ul5 = claim_element(section3_nodes, "UL", {});
			var ul5_nodes = children(ul5);
			li17 = claim_element(ul5_nodes, "LI", {});
			var li17_nodes = children(li17);
			t50 = claim_text(li17_nodes, "Codepen ");
			a10 = claim_element(li17_nodes, "A", { href: true, rel: true });
			var a10_nodes = children(a10);
			t51 = claim_text(a10_nodes, "https://codepen.io/tanhauhau/pen/poyRgOj?editors=1100");
			a10_nodes.forEach(detach);
			li17_nodes.forEach(detach);
			ul5_nodes.forEach(detach);
			section3_nodes.forEach(detach);
			t52 = claim_space(nodes);
			section4 = claim_element(nodes, "SECTION", {});
			var section4_nodes = children(section4);
			h23 = claim_element(section4_nodes, "H2", {});
			var h23_nodes = children(h23);
			a11 = claim_element(h23_nodes, "A", { href: true, id: true });
			var a11_nodes = children(a11);
			t53 = claim_text(a11_nodes, "conic-gradient()");
			a11_nodes.forEach(detach);
			h23_nodes.forEach(detach);
			t54 = claim_space(section4_nodes);
			ul6 = claim_element(section4_nodes, "UL", {});
			var ul6_nodes = children(ul6);
			li18 = claim_element(ul6_nodes, "LI", {});
			var li18_nodes = children(li18);
			t55 = claim_text(li18_nodes, "part of CSS images module level 4");
			li18_nodes.forEach(detach);
			ul6_nodes.forEach(detach);
			t56 = claim_space(section4_nodes);
			pre5 = claim_element(section4_nodes, "PRE", { class: true });
			var pre5_nodes = children(pre5);
			pre5_nodes.forEach(detach);
			t57 = claim_space(section4_nodes);
			ul7 = claim_element(section4_nodes, "UL", {});
			var ul7_nodes = children(ul7);
			li19 = claim_element(ul7_nodes, "LI", {});
			var li19_nodes = children(li19);
			t58 = claim_text(li19_nodes, "color stops uses deg / rad / turn units");
			li19_nodes.forEach(detach);
			ul7_nodes.forEach(detach);
			section4_nodes.forEach(detach);
			t59 = claim_space(nodes);
			section5 = claim_element(nodes, "SECTION", {});
			var section5_nodes = children(section5);
			h24 = claim_element(section5_nodes, "H2", {});
			var h24_nodes = children(h24);
			a12 = claim_element(h24_nodes, "A", { href: true, id: true });
			var a12_nodes = children(a12);
			t60 = claim_text(a12_nodes, "repeating-linear-gradient, repeating-radial-gradient, repeating-conic-gradient");
			a12_nodes.forEach(detach);
			h24_nodes.forEach(detach);
			t61 = claim_space(section5_nodes);
			ul9 = claim_element(section5_nodes, "UL", {});
			var ul9_nodes = children(ul9);
			li20 = claim_element(ul9_nodes, "LI", {});
			var li20_nodes = children(li20);
			t62 = claim_text(li20_nodes, "same color stop list as ");
			code0 = claim_element(li20_nodes, "CODE", {});
			var code0_nodes = children(code0);
			t63 = claim_text(code0_nodes, "linear-gradient");
			code0_nodes.forEach(detach);
			t64 = claim_text(li20_nodes, ", ");
			code1 = claim_element(li20_nodes, "CODE", {});
			var code1_nodes = children(code1);
			t65 = claim_text(code1_nodes, "radial-gradient");
			code1_nodes.forEach(detach);
			t66 = claim_text(li20_nodes, ", ");
			code2 = claim_element(li20_nodes, "CODE", {});
			var code2_nodes = children(code2);
			t67 = claim_text(code2_nodes, "conic-gradient");
			code2_nodes.forEach(detach);
			li20_nodes.forEach(detach);
			t68 = claim_space(ul9_nodes);
			li21 = claim_element(ul9_nodes, "LI", {});
			var li21_nodes = children(li21);
			t69 = claim_text(li21_nodes, "common pitfall of gradient not repeating is because gradient size of 100%");
			li21_nodes.forEach(detach);
			t70 = claim_space(ul9_nodes);
			li22 = claim_element(ul9_nodes, "LI", {});
			var li22_nodes = children(li22);
			t71 = claim_text(li22_nodes, "tip: use % based color stops for fixed size gradient, length based color stops for unknown size gradient");
			li22_nodes.forEach(detach);
			t72 = claim_space(ul9_nodes);
			li24 = claim_element(ul9_nodes, "LI", {});
			var li24_nodes = children(li24);
			t73 = claim_text(li24_nodes, "tip: pair it with background size, repeat and position to create a pattern");
			ul8 = claim_element(li24_nodes, "UL", {});
			var ul8_nodes = children(ul8);
			li23 = claim_element(ul8_nodes, "LI", {});
			var li23_nodes = children(li23);
			a13 = claim_element(li23_nodes, "A", { href: true, rel: true });
			var a13_nodes = children(a13);
			t74 = claim_text(a13_nodes, "https://leaverou.github.io/css3patterns/");
			a13_nodes.forEach(detach);
			li23_nodes.forEach(detach);
			ul8_nodes.forEach(detach);
			li24_nodes.forEach(detach);
			ul9_nodes.forEach(detach);
			section5_nodes.forEach(detach);
			t75 = claim_space(nodes);
			section6 = claim_element(nodes, "SECTION", {});
			var section6_nodes = children(section6);
			h25 = claim_element(section6_nodes, "H2", {});
			var h25_nodes = children(h25);
			a14 = claim_element(h25_nodes, "A", { href: true, id: true });
			var a14_nodes = children(a14);
			t76 = claim_text(a14_nodes, "animating repeating-conic-gradient");
			a14_nodes.forEach(detach);
			h25_nodes.forEach(detach);
			t77 = claim_space(section6_nodes);
			ul10 = claim_element(section6_nodes, "UL", {});
			var ul10_nodes = children(ul10);
			li25 = claim_element(ul10_nodes, "LI", {});
			var li25_nodes = children(li25);
			t78 = claim_text(li25_nodes, "from ");
			a15 = claim_element(li25_nodes, "A", { href: true, rel: true });
			var a15_nodes = children(a15);
			t79 = claim_text(a15_nodes, "https://lea.verou.me/");
			a15_nodes.forEach(detach);
			t80 = claim_text(li25_nodes, " header");
			li25_nodes.forEach(detach);
			t81 = claim_space(ul10_nodes);
			li26 = claim_element(ul10_nodes, "LI", {});
			var li26_nodes = children(li26);
			t82 = claim_text(li26_nodes, "using CSS Houdini to make css variable animatable");
			li26_nodes.forEach(detach);
			ul10_nodes.forEach(detach);
			t83 = claim_space(section6_nodes);
			pre6 = claim_element(section6_nodes, "PRE", { class: true });
			var pre6_nodes = children(pre6);
			pre6_nodes.forEach(detach);
			section6_nodes.forEach(detach);
			t84 = claim_space(nodes);
			section7 = claim_element(nodes, "SECTION", {});
			var section7_nodes = children(section7);
			h26 = claim_element(section7_nodes, "H2", {});
			var h26_nodes = children(h26);
			a16 = claim_element(h26_nodes, "A", { href: true, id: true });
			var a16_nodes = children(a16);
			t85 = claim_text(a16_nodes, "Avoid ");
			code3 = claim_element(a16_nodes, "CODE", {});
			var code3_nodes = children(code3);
			t86 = claim_text(code3_nodes, "transparent");
			code3_nodes.forEach(detach);
			a16_nodes.forEach(detach);
			h26_nodes.forEach(detach);
			t87 = claim_space(section7_nodes);
			ul11 = claim_element(section7_nodes, "UL", {});
			var ul11_nodes = children(ul11);
			li27 = claim_element(ul11_nodes, "LI", {});
			var li27_nodes = children(li27);
			t88 = claim_text(li27_nodes, "avoid transparent in gradients");
			li27_nodes.forEach(detach);
			t89 = claim_space(ul11_nodes);
			li28 = claim_element(ul11_nodes, "LI", {});
			var li28_nodes = children(li28);
			t90 = claim_text(li28_nodes, "maybe transitioning to white transparent / black transparent");
			li28_nodes.forEach(detach);
			ul11_nodes.forEach(detach);
			t91 = claim_space(section7_nodes);
			p8 = claim_element(section7_nodes, "P", {});
			var p8_nodes = children(p8);
			t92 = claim_text(p8_nodes, "safari:\n");
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
			t93 = claim_space(section7_nodes);
			p9 = claim_element(section7_nodes, "P", {});
			var p9_nodes = children(p9);
			t94 = claim_text(p9_nodes, "chrome:\n");
			picture2 = claim_element(p9_nodes, "PICTURE", {});
			var picture2_nodes = children(picture2);
			source4 = claim_element(picture2_nodes, "SOURCE", { type: true, srcset: true });
			source5 = claim_element(picture2_nodes, "SOURCE", { type: true, srcset: true });

			img2 = claim_element(picture2_nodes, "IMG", {
				title: true,
				alt: true,
				"data-src": true,
				loading: true
			});

			picture2_nodes.forEach(detach);
			p9_nodes.forEach(detach);
			t95 = claim_space(section7_nodes);
			p10 = claim_element(section7_nodes, "P", {});
			var p10_nodes = children(p10);
			t96 = claim_text(p10_nodes, "Links:");
			p10_nodes.forEach(detach);
			t97 = claim_space(section7_nodes);
			ul13 = claim_element(section7_nodes, "UL", {});
			var ul13_nodes = children(ul13);
			li29 = claim_element(ul13_nodes, "LI", {});
			var li29_nodes = children(li29);
			t98 = claim_text(li29_nodes, "CSS Image Module Level 3 - Gradients ");
			a17 = claim_element(li29_nodes, "A", { href: true, rel: true });
			var a17_nodes = children(a17);
			t99 = claim_text(a17_nodes, "https://www.w3.org/TR/css-images-3/#gradients");
			a17_nodes.forEach(detach);
			li29_nodes.forEach(detach);
			t100 = claim_space(ul13_nodes);
			li31 = claim_element(ul13_nodes, "LI", {});
			var li31_nodes = children(li31);
			t101 = claim_text(li31_nodes, "CSS Image Module Level 4 - Gradients ");
			a18 = claim_element(li31_nodes, "A", { href: true, rel: true });
			var a18_nodes = children(a18);
			t102 = claim_text(a18_nodes, "https://drafts.csswg.org/css-images-4/#gradients");
			a18_nodes.forEach(detach);
			ul12 = claim_element(li31_nodes, "UL", {});
			var ul12_nodes = children(ul12);
			li30 = claim_element(ul12_nodes, "LI", {});
			var li30_nodes = children(li30);
			t103 = claim_text(li30_nodes, "conic-gradient, repeating-conic-gradient");
			li30_nodes.forEach(detach);
			ul12_nodes.forEach(detach);
			li31_nodes.forEach(detach);
			t104 = claim_space(ul13_nodes);
			li32 = claim_element(ul13_nodes, "LI", {});
			var li32_nodes = children(li32);
			t105 = claim_text(li32_nodes, "Gradient generator ");
			a19 = claim_element(li32_nodes, "A", { href: true, rel: true });
			var a19_nodes = children(a19);
			t106 = claim_text(a19_nodes, "https://www.colorzilla.com/gradient-editor/");
			a19_nodes.forEach(detach);
			li32_nodes.forEach(detach);
			t107 = claim_space(ul13_nodes);
			li33 = claim_element(ul13_nodes, "LI", {});
			var li33_nodes = children(li33);
			t108 = claim_text(li33_nodes, "Cicada Principle ");
			a20 = claim_element(li33_nodes, "A", { href: true, rel: true });
			var a20_nodes = children(a20);
			t109 = claim_text(a20_nodes, "https://lea.verou.me/2020/07/the-cicada-principle-revisited-with-css-variables/");
			a20_nodes.forEach(detach);
			li33_nodes.forEach(detach);
			ul13_nodes.forEach(detach);
			section7_nodes.forEach(detach);
			this.h();
		},
		h() {
			attr(a0, "href", "#css-gradients");
			attr(a1, "href", "#linear-gradient");
			attr(a2, "href", "#radial-gradient");
			attr(a3, "href", "#conic-gradient");
			attr(a4, "href", "#repeating-linear-gradient-repeating-radial-gradient-repeating-conic-gradient");
			attr(a5, "href", "#animating-repeating-conic-gradient");
			attr(a6, "href", "#avoid-transparent");
			attr(ul0, "class", "sitemap");
			attr(ul0, "id", "sitemap");
			attr(ul0, "role", "navigation");
			attr(ul0, "aria-label", "Table of Contents");
			attr(a7, "href", "#css-gradients");
			attr(a7, "id", "css-gradients");
			attr(a8, "href", "#linear-gradient");
			attr(a8, "id", "linear-gradient");
			attr(pre0, "class", "language-null");
			attr(pre1, "class", "language-css");
			attr(a9, "href", "#radial-gradient");
			attr(a9, "id", "radial-gradient");
			attr(pre2, "class", "language-null");
			attr(pre3, "class", "language-css");
			attr(pre4, "class", "language-css");
			attr(source0, "type", "image/webp");
			attr(source0, "srcset", __build_img_webp__0);
			attr(source1, "type", "image/jpeg");
			attr(source1, "srcset", __build_img__0);
			attr(img0, "title", "null");
			attr(img0, "alt", "radial graident sizes");
			attr(img0, "data-src", __build_img__0);
			attr(img0, "loading", "lazy");
			attr(a10, "href", "https://codepen.io/tanhauhau/pen/poyRgOj?editors=1100");
			attr(a10, "rel", "nofollow");
			attr(a11, "href", "#conic-gradient");
			attr(a11, "id", "conic-gradient");
			attr(pre5, "class", "language-null");
			attr(a12, "href", "#repeating-linear-gradient-repeating-radial-gradient-repeating-conic-gradient");
			attr(a12, "id", "repeating-linear-gradient-repeating-radial-gradient-repeating-conic-gradient");
			attr(a13, "href", "https://leaverou.github.io/css3patterns/");
			attr(a13, "rel", "nofollow");
			attr(a14, "href", "#animating-repeating-conic-gradient");
			attr(a14, "id", "animating-repeating-conic-gradient");
			attr(a15, "href", "https://lea.verou.me/");
			attr(a15, "rel", "nofollow");
			attr(pre6, "class", "language-html");
			attr(a16, "href", "#avoid-transparent");
			attr(a16, "id", "avoid-transparent");
			attr(source2, "type", "image/webp");
			attr(source2, "srcset", __build_img_webp__1);
			attr(source3, "type", "image/jpeg");
			attr(source3, "srcset", __build_img__1);
			attr(img1, "title", "null");
			attr(img1, "alt", "transparent safari");
			attr(img1, "data-src", __build_img__1);
			attr(img1, "loading", "lazy");
			attr(source4, "type", "image/webp");
			attr(source4, "srcset", __build_img_webp__2);
			attr(source5, "type", "image/jpeg");
			attr(source5, "srcset", __build_img__2);
			attr(img2, "title", "null");
			attr(img2, "alt", "transparent chrome");
			attr(img2, "data-src", __build_img__2);
			attr(img2, "loading", "lazy");
			attr(a17, "href", "https://www.w3.org/TR/css-images-3/#gradients");
			attr(a17, "rel", "nofollow");
			attr(a18, "href", "https://drafts.csswg.org/css-images-4/#gradients");
			attr(a18, "rel", "nofollow");
			attr(a19, "href", "https://www.colorzilla.com/gradient-editor/");
			attr(a19, "rel", "nofollow");
			attr(a20, "href", "https://lea.verou.me/2020/07/the-cicada-principle-revisited-with-css-variables/");
			attr(a20, "rel", "nofollow");
		},
		m(target, anchor) {
			insert(target, section0, anchor);
			append(section0, ul0);
			append(ul0, li0);
			append(li0, a0);
			append(a0, t0);
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
			insert(target, t7, anchor);
			insert(target, section1, anchor);
			append(section1, h20);
			append(h20, a7);
			append(a7, t8);
			append(section1, t9);
			append(section1, p0);
			append(p0, t10);
			append(section1, t11);
			append(section1, p1);
			append(p1, strong0);
			append(strong0, t12);
			append(p1, t13);
			append(p1, strong1);
			append(strong1, t14);
			append(p1, t15);
			append(p1, strong2);
			append(strong2, t16);
			append(p1, t17);
			insert(target, t18, anchor);
			insert(target, section2, anchor);
			append(section2, h21);
			append(h21, a8);
			append(a8, t19);
			append(section2, t20);
			append(section2, pre0);
			pre0.innerHTML = raw0_value;
			append(section2, t21);
			append(section2, p2);
			append(p2, t22);
			append(section2, t23);
			append(section2, ul1);
			append(ul1, li7);
			append(li7, t24);
			append(ul1, t25);
			append(ul1, li8);
			append(li8, t26);
			append(section2, t27);
			append(section2, pre1);
			pre1.innerHTML = raw1_value;
			insert(target, t28, anchor);
			insert(target, section3, anchor);
			append(section3, h22);
			append(h22, a9);
			append(a9, t29);
			append(section3, t30);
			append(section3, pre2);
			pre2.innerHTML = raw2_value;
			append(section3, t31);
			append(section3, ul4);
			append(ul4, li9);
			append(li9, p3);
			append(p3, t32);
			append(ul4, t33);
			append(ul4, li10);
			append(li10, p4);
			append(p4, t34);
			append(ul4, t35);
			append(ul4, li11);
			append(li11, p5);
			append(p5, t36);
			append(ul4, t37);
			append(ul4, li16);
			append(li16, p6);
			append(p6, t38);
			append(li16, t39);
			append(li16, ul3);
			append(ul3, li12);
			append(li12, t40);
			append(ul3, t41);
			append(ul3, li13);
			append(li13, t42);
			append(ul3, t43);
			append(ul3, li15);
			append(li15, t44);
			append(li15, ul2);
			append(ul2, li14);
			append(li14, t45);
			append(section3, t46);
			append(section3, pre3);
			pre3.innerHTML = raw3_value;
			append(section3, t47);
			append(section3, pre4);
			pre4.innerHTML = raw4_value;
			append(section3, t48);
			append(section3, p7);
			append(p7, picture0);
			append(picture0, source0);
			append(picture0, source1);
			append(picture0, img0);
			append(section3, t49);
			append(section3, ul5);
			append(ul5, li17);
			append(li17, t50);
			append(li17, a10);
			append(a10, t51);
			insert(target, t52, anchor);
			insert(target, section4, anchor);
			append(section4, h23);
			append(h23, a11);
			append(a11, t53);
			append(section4, t54);
			append(section4, ul6);
			append(ul6, li18);
			append(li18, t55);
			append(section4, t56);
			append(section4, pre5);
			pre5.innerHTML = raw5_value;
			append(section4, t57);
			append(section4, ul7);
			append(ul7, li19);
			append(li19, t58);
			insert(target, t59, anchor);
			insert(target, section5, anchor);
			append(section5, h24);
			append(h24, a12);
			append(a12, t60);
			append(section5, t61);
			append(section5, ul9);
			append(ul9, li20);
			append(li20, t62);
			append(li20, code0);
			append(code0, t63);
			append(li20, t64);
			append(li20, code1);
			append(code1, t65);
			append(li20, t66);
			append(li20, code2);
			append(code2, t67);
			append(ul9, t68);
			append(ul9, li21);
			append(li21, t69);
			append(ul9, t70);
			append(ul9, li22);
			append(li22, t71);
			append(ul9, t72);
			append(ul9, li24);
			append(li24, t73);
			append(li24, ul8);
			append(ul8, li23);
			append(li23, a13);
			append(a13, t74);
			insert(target, t75, anchor);
			insert(target, section6, anchor);
			append(section6, h25);
			append(h25, a14);
			append(a14, t76);
			append(section6, t77);
			append(section6, ul10);
			append(ul10, li25);
			append(li25, t78);
			append(li25, a15);
			append(a15, t79);
			append(li25, t80);
			append(ul10, t81);
			append(ul10, li26);
			append(li26, t82);
			append(section6, t83);
			append(section6, pre6);
			pre6.innerHTML = raw6_value;
			insert(target, t84, anchor);
			insert(target, section7, anchor);
			append(section7, h26);
			append(h26, a16);
			append(a16, t85);
			append(a16, code3);
			append(code3, t86);
			append(section7, t87);
			append(section7, ul11);
			append(ul11, li27);
			append(li27, t88);
			append(ul11, t89);
			append(ul11, li28);
			append(li28, t90);
			append(section7, t91);
			append(section7, p8);
			append(p8, t92);
			append(p8, picture1);
			append(picture1, source2);
			append(picture1, source3);
			append(picture1, img1);
			append(section7, t93);
			append(section7, p9);
			append(p9, t94);
			append(p9, picture2);
			append(picture2, source4);
			append(picture2, source5);
			append(picture2, img2);
			append(section7, t95);
			append(section7, p10);
			append(p10, t96);
			append(section7, t97);
			append(section7, ul13);
			append(ul13, li29);
			append(li29, t98);
			append(li29, a17);
			append(a17, t99);
			append(ul13, t100);
			append(ul13, li31);
			append(li31, t101);
			append(li31, a18);
			append(a18, t102);
			append(li31, ul12);
			append(ul12, li30);
			append(li30, t103);
			append(ul13, t104);
			append(ul13, li32);
			append(li32, t105);
			append(li32, a19);
			append(a19, t106);
			append(ul13, t107);
			append(ul13, li33);
			append(li33, t108);
			append(li33, a20);
			append(a20, t109);
		},
		p: noop,
		d(detaching) {
			if (detaching) detach(section0);
			if (detaching) detach(t7);
			if (detaching) detach(section1);
			if (detaching) detach(t18);
			if (detaching) detach(section2);
			if (detaching) detach(t28);
			if (detaching) detach(section3);
			if (detaching) detach(t52);
			if (detaching) detach(section4);
			if (detaching) detach(t59);
			if (detaching) detach(section5);
			if (detaching) detach(t75);
			if (detaching) detach(section6);
			if (detaching) detach(t84);
			if (detaching) detach(section7);
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
	"title": "The CSS Podcast: 021: Gradients",
	"tags": ["css gradients", "The CSS Podcast"],
	"slug": "notes/css-podcast-021-gradients",
	"type": "notes",
	"name": "css-podcast-021-gradients",
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
