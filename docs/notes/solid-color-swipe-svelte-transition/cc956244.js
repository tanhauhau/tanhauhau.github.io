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

var __build_img__4 = "4f06b1586ebf000c.gif";

var __build_img__3 = "d6a282e8ff5d67b0.gif";

var __build_img__2 = "68ccb6b19e3a26d8.gif";

var __build_img__1 = "2203d1fe5c6300b3.gif";

var __build_img__0 = "12a1bacee0437b49.gif";

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

var baseCss = "https://lihautan.com/notes/solid-color-swipe-svelte-transition/assets/blog-base-248115e4.css";

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
			attr(meta8, "content", "https%3A%2F%2Flihautan.com%2Fnotes%2Fsolid-color-swipe-svelte-transition");
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

/* content/notes/solid-color-swipe-svelte-transition/@@page-markup.svelte generated by Svelte v3.24.0 */

function create_default_slot(ctx) {
	let section0;
	let ul1;
	let li0;
	let a0;
	let t0;
	let li1;
	let a1;
	let t1;
	let ul0;
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
	let t9;
	let section1;
	let h20;
	let a9;
	let t10;
	let t11;
	let p0;
	let img0;
	let t12;
	let section2;
	let h21;
	let a10;
	let t13;
	let t14;
	let p1;
	let img1;
	let t15;
	let p2;
	let t16;
	let t17;
	let ul2;
	let li9;
	let t18;
	let t19;
	let li10;
	let t20;
	let t21;
	let section3;
	let h30;
	let a11;
	let t22;
	let t23;
	let pre0;

	let raw0_value = `<code class="language-js"><span class="token keyword">function</span> <span class="token function">swipeColor</span><span class="token punctuation">(</span><span class="token parameter">node<span class="token punctuation">,</span> params</span><span class="token punctuation">)</span> <span class="token punctuation">&#123;</span>
  <span class="token keyword">const</span> <span class="token punctuation">&#123;</span> color <span class="token punctuation">&#125;</span> <span class="token operator">=</span> window<span class="token punctuation">.</span><span class="token function">getComputedStyle</span><span class="token punctuation">(</span>node<span class="token punctuation">)</span><span class="token punctuation">;</span>
<span class="token punctuation">&#125;</span></code>` + "";

	let t24;
	let section4;
	let h31;
	let a12;
	let t25;
	let t26;
	let ul3;
	let li11;
	let t27;
	let code0;
	let t28;
	let t29;
	let t30;
	let pre1;

	let raw1_value = `<code class="language-js"><span class="token function">css</span><span class="token punctuation">(</span><span class="token parameter">t</span><span class="token punctuation">)</span> <span class="token punctuation">&#123;</span>
  <span class="token keyword">if</span> <span class="token punctuation">(</span>t <span class="token operator">></span> <span class="token number">0.5</span><span class="token punctuation">)</span> <span class="token punctuation">&#123;</span>
    <span class="token comment">// transform t from range [0.5, 1] into percentage [0, 100]</span>
    <span class="token comment">// t: 0.5 -> 1</span>
    <span class="token comment">// u: 0 -> 0.5</span>
    <span class="token keyword">const</span> u <span class="token operator">=</span> t <span class="token operator">-</span> <span class="token number">0.5</span><span class="token punctuation">;</span>
    <span class="token comment">// percentage: 0 -> 100</span>
    <span class="token keyword">const</span> percentage <span class="token operator">=</span> u <span class="token operator">*</span> <span class="token number">200</span><span class="token punctuation">;</span>
    <span class="token keyword">return</span> <span class="token template-string"><span class="token template-punctuation string">&#96;</span><span class="token string">background: linear-gradient(to right, transparent 0, </span><span class="token interpolation"><span class="token interpolation-punctuation punctuation">$&#123;</span>percentage<span class="token interpolation-punctuation punctuation">&#125;</span></span><span class="token string">%, </span><span class="token interpolation"><span class="token interpolation-punctuation punctuation">$&#123;</span>color<span class="token interpolation-punctuation punctuation">&#125;</span></span><span class="token string"> </span><span class="token interpolation"><span class="token interpolation-punctuation punctuation">$&#123;</span>percentage<span class="token interpolation-punctuation punctuation">&#125;</span></span><span class="token string">%);</span><span class="token template-punctuation string">&#96;</span></span><span class="token punctuation">;</span>
  <span class="token punctuation">&#125;</span> <span class="token keyword">else</span> <span class="token punctuation">&#123;</span>
    <span class="token comment">// transform t from range [0, 0.5] into percentage [0, 100]</span>
    <span class="token comment">// t: 0 -> 0.5</span>
    <span class="token comment">// percentage: 0 -> 100</span>
    <span class="token keyword">const</span> percentage <span class="token operator">=</span> t <span class="token operator">*</span> <span class="token number">200</span><span class="token punctuation">;</span>
    <span class="token keyword">return</span> <span class="token template-string"><span class="token template-punctuation string">&#96;</span><span class="token string">background: linear-gradient(to right, </span><span class="token interpolation"><span class="token interpolation-punctuation punctuation">$&#123;</span>color<span class="token interpolation-punctuation punctuation">&#125;</span></span><span class="token string"> 0, </span><span class="token interpolation"><span class="token interpolation-punctuation punctuation">$&#123;</span>percentage<span class="token interpolation-punctuation punctuation">&#125;</span></span><span class="token string">%, transparent </span><span class="token interpolation"><span class="token interpolation-punctuation punctuation">$&#123;</span>percentage<span class="token interpolation-punctuation punctuation">&#125;</span></span><span class="token string">%);</span><span class="token template-punctuation string">&#96;</span></span><span class="token punctuation">;</span>
  <span class="token punctuation">&#125;</span>
<span class="token punctuation">&#125;</span><span class="token punctuation">,</span></code>` + "";

	let t31;
	let p3;
	let img2;
	let t32;
	let section5;
	let h32;
	let a13;
	let t33;
	let t34;
	let ul4;
	let li12;
	let t35;
	let t36;
	let pre2;

	let raw2_value = `<code class="language-js"><span class="token function">css</span><span class="token punctuation">(</span><span class="token parameter">t</span><span class="token punctuation">)</span> <span class="token punctuation">&#123;</span>
  <span class="token keyword">if</span> <span class="token punctuation">(</span>t <span class="token operator">></span> <span class="token number">0.5</span><span class="token punctuation">)</span> <span class="token punctuation">&#123;</span>
    <span class="token keyword">return</span> <span class="token template-string"><span class="token template-punctuation string">&#96;</span><span class="token string">color: </span><span class="token interpolation"><span class="token interpolation-punctuation punctuation">$&#123;</span>color<span class="token interpolation-punctuation punctuation">&#125;</span></span><span class="token template-punctuation string">&#96;</span></span><span class="token punctuation">;</span>
  <span class="token punctuation">&#125;</span> <span class="token keyword">else</span> <span class="token punctuation">&#123;</span>
    <span class="token keyword">return</span> <span class="token template-string"><span class="token template-punctuation string">&#96;</span><span class="token string">color: transparent</span><span class="token template-punctuation string">&#96;</span></span><span class="token punctuation">;</span>
  <span class="token punctuation">&#125;</span>
<span class="token punctuation">&#125;</span></code>` + "";

	let t37;
	let p4;
	let img3;
	let t38;
	let section6;
	let h33;
	let a14;
	let t39;
	let t40;
	let pre3;

	let raw3_value = `<code class="language-js"><span class="token function">css</span><span class="token punctuation">(</span><span class="token parameter">t</span><span class="token punctuation">)</span> <span class="token punctuation">&#123;</span>
  <span class="token keyword">if</span> <span class="token punctuation">(</span>t <span class="token operator">></span> <span class="token number">0.5</span><span class="token punctuation">)</span> <span class="token punctuation">&#123;</span>
    <span class="token comment">// transform t from range [0.5, 1] into percentage [0, 100]</span>
    <span class="token comment">// t: 0.5 -> 1</span>
    <span class="token comment">// u: 0 -> 0.5</span>
    <span class="token keyword">const</span> u <span class="token operator">=</span> t <span class="token operator">-</span> <span class="token number">0.5</span><span class="token punctuation">;</span>
    <span class="token comment">// percentage: 0 -> 100</span>
    <span class="token keyword">const</span> percentage <span class="token operator">=</span> u <span class="token operator">*</span> <span class="token number">200</span><span class="token punctuation">;</span>
    <span class="token keyword">return</span> <span class="token template-string"><span class="token template-punctuation string">&#96;</span><span class="token string">
      background: linear-gradient(to right, transparent 0, </span><span class="token interpolation"><span class="token interpolation-punctuation punctuation">$&#123;</span>percentage<span class="token interpolation-punctuation punctuation">&#125;</span></span><span class="token string">%, </span><span class="token interpolation"><span class="token interpolation-punctuation punctuation">$&#123;</span>color<span class="token interpolation-punctuation punctuation">&#125;</span></span><span class="token string"> </span><span class="token interpolation"><span class="token interpolation-punctuation punctuation">$&#123;</span>percentage<span class="token interpolation-punctuation punctuation">&#125;</span></span><span class="token string">%);
      color: </span><span class="token interpolation"><span class="token interpolation-punctuation punctuation">$&#123;</span>color<span class="token interpolation-punctuation punctuation">&#125;</span></span><span class="token string">;
    </span><span class="token template-punctuation string">&#96;</span></span><span class="token punctuation">;</span>
  <span class="token punctuation">&#125;</span> <span class="token keyword">else</span> <span class="token punctuation">&#123;</span>
    <span class="token comment">// transform t from range [0, 0.5] into percentage [0, 100]</span>
    <span class="token comment">// t: 0 -> 0.5</span>
    <span class="token comment">// percentage: 0 -> 100</span>
    <span class="token keyword">const</span> percentage <span class="token operator">=</span> t <span class="token operator">*</span> <span class="token number">200</span><span class="token punctuation">;</span>
    <span class="token keyword">return</span> <span class="token template-string"><span class="token template-punctuation string">&#96;</span><span class="token string">
      background: linear-gradient(to right, </span><span class="token interpolation"><span class="token interpolation-punctuation punctuation">$&#123;</span>color<span class="token interpolation-punctuation punctuation">&#125;</span></span><span class="token string"> 0, </span><span class="token interpolation"><span class="token interpolation-punctuation punctuation">$&#123;</span>percentage<span class="token interpolation-punctuation punctuation">&#125;</span></span><span class="token string">%, transparent </span><span class="token interpolation"><span class="token interpolation-punctuation punctuation">$&#123;</span>percentage<span class="token interpolation-punctuation punctuation">&#125;</span></span><span class="token string">%);
      color: transparent;
    </span><span class="token template-punctuation string">&#96;</span></span><span class="token punctuation">;</span>
  <span class="token punctuation">&#125;</span>
<span class="token punctuation">&#125;</span><span class="token punctuation">,</span></code>` + "";

	let t41;
	let section7;
	let h34;
	let a15;
	let t42;
	let code1;
	let t43;
	let t44;
	let code2;
	let t45;
	let t46;
	let code3;
	let t47;
	let t48;
	let t49;
	let pre4;

	let raw4_value = `<code class="language-svelte"><span class="token tag"><span class="token tag"><span class="token punctuation">&lt;</span>script</span><span class="token punctuation">></span></span><span class="token script"><span class="token language-javascript">
  <span class="token keyword">function</span> <span class="token function">swipeColor</span><span class="token punctuation">(</span><span class="token parameter">node<span class="token punctuation">,</span> params</span><span class="token punctuation">)</span> <span class="token punctuation">&#123;</span>
    <span class="token keyword">const</span> <span class="token punctuation">&#123;</span> duration<span class="token punctuation">,</span> delay<span class="token punctuation">,</span> easing <span class="token punctuation">&#125;</span> <span class="token operator">=</span> params <span class="token operator">||</span> <span class="token punctuation">&#123;</span><span class="token punctuation">&#125;</span><span class="token punctuation">;</span>
    <span class="token keyword">return</span> <span class="token punctuation">&#123;</span>
      duration<span class="token punctuation">,</span>
      delay<span class="token punctuation">,</span>
      easing<span class="token punctuation">,</span>
      <span class="token function">css</span><span class="token punctuation">(</span><span class="token parameter">t</span><span class="token punctuation">)</span> <span class="token punctuation">&#123;</span> <span class="token comment">/* ... */</span> <span class="token punctuation">&#125;</span><span class="token punctuation">,</span>
    <span class="token punctuation">&#125;</span><span class="token punctuation">;</span>
  <span class="token punctuation">&#125;</span>
</span></span><span class="token tag"><span class="token tag"><span class="token punctuation">&lt;/</span>script</span><span class="token punctuation">></span></span>

<span class="token language-javascript"><span class="token punctuation">&#123;</span>#<span class="token keyword">if</span> show<span class="token punctuation">&#125;</span></span>
  <span class="token tag"><span class="token tag"><span class="token punctuation">&lt;</span>span</span> <span class="token attr-name"><span class="token namespace">transition:</span>swipeColor</span><span class="token punctuation">></span></span>Hello world<span class="token tag"><span class="token tag"><span class="token punctuation">&lt;/</span>span</span><span class="token punctuation">></span></span>
  <span class="token tag"><span class="token tag"><span class="token punctuation">&lt;</span>span</span> <span class="token attr-name"><span class="token namespace">transition:</span>swipeColor=</span><span class="token language-javascript"><span class="token punctuation">&#123;</span><span class="token punctuation">&#123;</span> delay<span class="token punctuation">:</span> <span class="token number">300</span> <span class="token punctuation">&#125;</span><span class="token punctuation">&#125;</span></span><span class="token punctuation">></span></span>Hello world<span class="token tag"><span class="token tag"><span class="token punctuation">&lt;/</span>span</span><span class="token punctuation">></span></span>
<span class="token language-javascript"><span class="token punctuation">&#123;</span><span class="token operator">/</span><span class="token keyword">if</span><span class="token punctuation">&#125;</span></span></code>` + "";

	let t50;
	let section8;
	let h22;
	let a16;
	let t51;
	let t52;
	let pre5;

	let raw5_value = `<code class="language-js"><span class="token keyword">function</span> <span class="token function">swipeColor</span><span class="token punctuation">(</span><span class="token parameter">node<span class="token punctuation">,</span> params</span><span class="token punctuation">)</span> <span class="token punctuation">&#123;</span>
  <span class="token keyword">const</span> <span class="token punctuation">&#123;</span> duration<span class="token punctuation">,</span> delay<span class="token punctuation">,</span> easing <span class="token punctuation">&#125;</span> <span class="token operator">=</span> params <span class="token operator">||</span> <span class="token punctuation">&#123;</span><span class="token punctuation">&#125;</span><span class="token punctuation">;</span>
  <span class="token keyword">const</span> <span class="token punctuation">&#123;</span> color <span class="token punctuation">&#125;</span> <span class="token operator">=</span> window<span class="token punctuation">.</span><span class="token function">getComputedStyle</span><span class="token punctuation">(</span>node<span class="token punctuation">)</span><span class="token punctuation">;</span>
  <span class="token keyword">return</span> <span class="token punctuation">&#123;</span>
    duration<span class="token punctuation">,</span>
    delay<span class="token punctuation">,</span>
    easing<span class="token punctuation">,</span>
    <span class="token function">css</span><span class="token punctuation">(</span><span class="token parameter">t</span><span class="token punctuation">)</span> <span class="token punctuation">&#123;</span>
      <span class="token keyword">if</span> <span class="token punctuation">(</span>t <span class="token operator">></span> <span class="token number">0.5</span><span class="token punctuation">)</span> <span class="token punctuation">&#123;</span>
        <span class="token comment">// transform t from range [0.5, 1] into percentage [0, 100]</span>
        <span class="token comment">// t: 0.5 -> 1</span>
        <span class="token comment">// u: 0 -> 0.5</span>
        <span class="token keyword">const</span> u <span class="token operator">=</span> t <span class="token operator">-</span> <span class="token number">0.5</span><span class="token punctuation">;</span>
        <span class="token comment">// percentage: 0 -> 100</span>
        <span class="token keyword">const</span> percentage <span class="token operator">=</span> u <span class="token operator">*</span> <span class="token number">200</span><span class="token punctuation">;</span>
        <span class="token keyword">return</span> <span class="token template-string"><span class="token template-punctuation string">&#96;</span><span class="token string">
          background: linear-gradient(to right, transparent 0, </span><span class="token interpolation"><span class="token interpolation-punctuation punctuation">$&#123;</span>percentage<span class="token interpolation-punctuation punctuation">&#125;</span></span><span class="token string">%, </span><span class="token interpolation"><span class="token interpolation-punctuation punctuation">$&#123;</span>color<span class="token interpolation-punctuation punctuation">&#125;</span></span><span class="token string"> </span><span class="token interpolation"><span class="token interpolation-punctuation punctuation">$&#123;</span>percentage<span class="token interpolation-punctuation punctuation">&#125;</span></span><span class="token string">%);
          color: </span><span class="token interpolation"><span class="token interpolation-punctuation punctuation">$&#123;</span>color<span class="token interpolation-punctuation punctuation">&#125;</span></span><span class="token string">;
        </span><span class="token template-punctuation string">&#96;</span></span><span class="token punctuation">;</span>
      <span class="token punctuation">&#125;</span> <span class="token keyword">else</span> <span class="token punctuation">&#123;</span>
        <span class="token comment">// transform t from range [0, 0.5] into percentage [0, 100]</span>
        <span class="token comment">// t: 0 -> 0.5</span>
        <span class="token comment">// percentage: 0 -> 100</span>
        <span class="token keyword">const</span> percentage <span class="token operator">=</span> t <span class="token operator">*</span> <span class="token number">200</span><span class="token punctuation">;</span>
        <span class="token keyword">return</span> <span class="token template-string"><span class="token template-punctuation string">&#96;</span><span class="token string">
          background: linear-gradient(to right, </span><span class="token interpolation"><span class="token interpolation-punctuation punctuation">$&#123;</span>color<span class="token interpolation-punctuation punctuation">&#125;</span></span><span class="token string"> 0, </span><span class="token interpolation"><span class="token interpolation-punctuation punctuation">$&#123;</span>percentage<span class="token interpolation-punctuation punctuation">&#125;</span></span><span class="token string">%, transparent </span><span class="token interpolation"><span class="token interpolation-punctuation punctuation">$&#123;</span>percentage<span class="token interpolation-punctuation punctuation">&#125;</span></span><span class="token string">%);
          color: transparent;
        </span><span class="token template-punctuation string">&#96;</span></span><span class="token punctuation">;</span>
      <span class="token punctuation">&#125;</span>
    <span class="token punctuation">&#125;</span><span class="token punctuation">,</span>
  <span class="token punctuation">&#125;</span><span class="token punctuation">;</span>
<span class="token punctuation">&#125;</span></code>` + "";

	let t53;
	let section9;
	let h23;
	let a17;
	let t54;
	let t55;
	let p5;
	let t56;
	let t57;
	let p6;
	let img4;

	return {
		c() {
			section0 = element("section");
			ul1 = element("ul");
			li0 = element("li");
			a0 = element("a");
			t0 = text("The Result");
			li1 = element("li");
			a1 = element("a");
			t1 = text("Break it down slowly");
			ul0 = element("ul");
			li2 = element("li");
			a2 = element("a");
			t2 = text("1. The first thing is to figure out the color of the text");
			li3 = element("li");
			a3 = element("a");
			t3 = text("2. I tried using linear-gradient to draw the background");
			li4 = element("li");
			a4 = element("a");
			t4 = text("3. Next I need to hide / reveal the text at the right time");
			li5 = element("li");
			a5 = element("a");
			t5 = text("4. Combining the both 2. and 3. together");
			li6 = element("li");
			a6 = element("a");
			t6 = text("5. final touches, pass the  duration ,  delay , and  easing  into the returned object");
			li7 = element("li");
			a7 = element("a");
			t7 = text("Final code");
			li8 = element("li");
			a8 = element("a");
			t8 = text("Extra");
			t9 = space();
			section1 = element("section");
			h20 = element("h2");
			a9 = element("a");
			t10 = text("The Result");
			t11 = space();
			p0 = element("p");
			img0 = element("img");
			t12 = space();
			section2 = element("section");
			h21 = element("h2");
			a10 = element("a");
			t13 = text("Break it down slowly");
			t14 = space();
			p1 = element("p");
			img1 = element("img");
			t15 = space();
			p2 = element("p");
			t16 = text("The transition can be broken down into 2 halves:");
			t17 = space();
			ul2 = element("ul");
			li9 = element("li");
			t18 = text("1️⃣ a solid color growing from the left covering the whole text area");
			t19 = space();
			li10 = element("li");
			t20 = text("2️⃣ as the solid color shrinks, it reveals the text");
			t21 = space();
			section3 = element("section");
			h30 = element("h3");
			a11 = element("a");
			t22 = text("1. The first thing is to figure out the color of the text");
			t23 = space();
			pre0 = element("pre");
			t24 = space();
			section4 = element("section");
			h31 = element("h3");
			a12 = element("a");
			t25 = text("2. I tried using linear-gradient to draw the background");
			t26 = space();
			ul3 = element("ul");
			li11 = element("li");
			t27 = text("I use the value of ");
			code0 = element("code");
			t28 = text("t");
			t29 = text(" to determine how wide the solid color should be");
			t30 = space();
			pre1 = element("pre");
			t31 = space();
			p3 = element("p");
			img2 = element("img");
			t32 = space();
			section5 = element("section");
			h32 = element("h3");
			a13 = element("a");
			t33 = text("3. Next I need to hide / reveal the text at the right time");
			t34 = space();
			ul4 = element("ul");
			li12 = element("li");
			t35 = text("I hid the text by setting the text color to transparent");
			t36 = space();
			pre2 = element("pre");
			t37 = space();
			p4 = element("p");
			img3 = element("img");
			t38 = space();
			section6 = element("section");
			h33 = element("h3");
			a14 = element("a");
			t39 = text("4. Combining the both 2. and 3. together");
			t40 = space();
			pre3 = element("pre");
			t41 = space();
			section7 = element("section");
			h34 = element("h3");
			a15 = element("a");
			t42 = text("5. final touches, pass the ");
			code1 = element("code");
			t43 = text("duration");
			t44 = text(", ");
			code2 = element("code");
			t45 = text("delay");
			t46 = text(", and ");
			code3 = element("code");
			t47 = text("easing");
			t48 = text(" into the returned object");
			t49 = space();
			pre4 = element("pre");
			t50 = space();
			section8 = element("section");
			h22 = element("h2");
			a16 = element("a");
			t51 = text("Final code");
			t52 = space();
			pre5 = element("pre");
			t53 = space();
			section9 = element("section");
			h23 = element("h2");
			a17 = element("a");
			t54 = text("Extra");
			t55 = space();
			p5 = element("p");
			t56 = text("Svelte has make writing custom transitions simple, with the code above, the transition itself is able to pause / reverse halfway through the transition");
			t57 = space();
			p6 = element("p");
			img4 = element("img");
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
			t0 = claim_text(a0_nodes, "The Result");
			a0_nodes.forEach(detach);
			li0_nodes.forEach(detach);
			li1 = claim_element(ul1_nodes, "LI", {});
			var li1_nodes = children(li1);
			a1 = claim_element(li1_nodes, "A", { href: true });
			var a1_nodes = children(a1);
			t1 = claim_text(a1_nodes, "Break it down slowly");
			a1_nodes.forEach(detach);
			li1_nodes.forEach(detach);
			ul0 = claim_element(ul1_nodes, "UL", {});
			var ul0_nodes = children(ul0);
			li2 = claim_element(ul0_nodes, "LI", {});
			var li2_nodes = children(li2);
			a2 = claim_element(li2_nodes, "A", { href: true });
			var a2_nodes = children(a2);
			t2 = claim_text(a2_nodes, "1. The first thing is to figure out the color of the text");
			a2_nodes.forEach(detach);
			li2_nodes.forEach(detach);
			li3 = claim_element(ul0_nodes, "LI", {});
			var li3_nodes = children(li3);
			a3 = claim_element(li3_nodes, "A", { href: true });
			var a3_nodes = children(a3);
			t3 = claim_text(a3_nodes, "2. I tried using linear-gradient to draw the background");
			a3_nodes.forEach(detach);
			li3_nodes.forEach(detach);
			li4 = claim_element(ul0_nodes, "LI", {});
			var li4_nodes = children(li4);
			a4 = claim_element(li4_nodes, "A", { href: true });
			var a4_nodes = children(a4);
			t4 = claim_text(a4_nodes, "3. Next I need to hide / reveal the text at the right time");
			a4_nodes.forEach(detach);
			li4_nodes.forEach(detach);
			li5 = claim_element(ul0_nodes, "LI", {});
			var li5_nodes = children(li5);
			a5 = claim_element(li5_nodes, "A", { href: true });
			var a5_nodes = children(a5);
			t5 = claim_text(a5_nodes, "4. Combining the both 2. and 3. together");
			a5_nodes.forEach(detach);
			li5_nodes.forEach(detach);
			li6 = claim_element(ul0_nodes, "LI", {});
			var li6_nodes = children(li6);
			a6 = claim_element(li6_nodes, "A", { href: true });
			var a6_nodes = children(a6);
			t6 = claim_text(a6_nodes, "5. final touches, pass the  duration ,  delay , and  easing  into the returned object");
			a6_nodes.forEach(detach);
			li6_nodes.forEach(detach);
			ul0_nodes.forEach(detach);
			li7 = claim_element(ul1_nodes, "LI", {});
			var li7_nodes = children(li7);
			a7 = claim_element(li7_nodes, "A", { href: true });
			var a7_nodes = children(a7);
			t7 = claim_text(a7_nodes, "Final code");
			a7_nodes.forEach(detach);
			li7_nodes.forEach(detach);
			li8 = claim_element(ul1_nodes, "LI", {});
			var li8_nodes = children(li8);
			a8 = claim_element(li8_nodes, "A", { href: true });
			var a8_nodes = children(a8);
			t8 = claim_text(a8_nodes, "Extra");
			a8_nodes.forEach(detach);
			li8_nodes.forEach(detach);
			ul1_nodes.forEach(detach);
			section0_nodes.forEach(detach);
			t9 = claim_space(nodes);
			section1 = claim_element(nodes, "SECTION", {});
			var section1_nodes = children(section1);
			h20 = claim_element(section1_nodes, "H2", {});
			var h20_nodes = children(h20);
			a9 = claim_element(h20_nodes, "A", { href: true, id: true });
			var a9_nodes = children(a9);
			t10 = claim_text(a9_nodes, "The Result");
			a9_nodes.forEach(detach);
			h20_nodes.forEach(detach);
			t11 = claim_space(section1_nodes);
			p0 = claim_element(section1_nodes, "P", {});
			var p0_nodes = children(p0);

			img0 = claim_element(p0_nodes, "IMG", {
				title: true,
				alt: true,
				"data-src": true,
				loading: true
			});

			p0_nodes.forEach(detach);
			section1_nodes.forEach(detach);
			t12 = claim_space(nodes);
			section2 = claim_element(nodes, "SECTION", {});
			var section2_nodes = children(section2);
			h21 = claim_element(section2_nodes, "H2", {});
			var h21_nodes = children(h21);
			a10 = claim_element(h21_nodes, "A", { href: true, id: true });
			var a10_nodes = children(a10);
			t13 = claim_text(a10_nodes, "Break it down slowly");
			a10_nodes.forEach(detach);
			h21_nodes.forEach(detach);
			t14 = claim_space(section2_nodes);
			p1 = claim_element(section2_nodes, "P", {});
			var p1_nodes = children(p1);

			img1 = claim_element(p1_nodes, "IMG", {
				title: true,
				alt: true,
				"data-src": true,
				loading: true
			});

			p1_nodes.forEach(detach);
			t15 = claim_space(section2_nodes);
			p2 = claim_element(section2_nodes, "P", {});
			var p2_nodes = children(p2);
			t16 = claim_text(p2_nodes, "The transition can be broken down into 2 halves:");
			p2_nodes.forEach(detach);
			t17 = claim_space(section2_nodes);
			ul2 = claim_element(section2_nodes, "UL", {});
			var ul2_nodes = children(ul2);
			li9 = claim_element(ul2_nodes, "LI", {});
			var li9_nodes = children(li9);
			t18 = claim_text(li9_nodes, "1️⃣ a solid color growing from the left covering the whole text area");
			li9_nodes.forEach(detach);
			t19 = claim_space(ul2_nodes);
			li10 = claim_element(ul2_nodes, "LI", {});
			var li10_nodes = children(li10);
			t20 = claim_text(li10_nodes, "2️⃣ as the solid color shrinks, it reveals the text");
			li10_nodes.forEach(detach);
			ul2_nodes.forEach(detach);
			section2_nodes.forEach(detach);
			t21 = claim_space(nodes);
			section3 = claim_element(nodes, "SECTION", {});
			var section3_nodes = children(section3);
			h30 = claim_element(section3_nodes, "H3", {});
			var h30_nodes = children(h30);
			a11 = claim_element(h30_nodes, "A", { href: true, id: true });
			var a11_nodes = children(a11);
			t22 = claim_text(a11_nodes, "1. The first thing is to figure out the color of the text");
			a11_nodes.forEach(detach);
			h30_nodes.forEach(detach);
			t23 = claim_space(section3_nodes);
			pre0 = claim_element(section3_nodes, "PRE", { class: true });
			var pre0_nodes = children(pre0);
			pre0_nodes.forEach(detach);
			section3_nodes.forEach(detach);
			t24 = claim_space(nodes);
			section4 = claim_element(nodes, "SECTION", {});
			var section4_nodes = children(section4);
			h31 = claim_element(section4_nodes, "H3", {});
			var h31_nodes = children(h31);
			a12 = claim_element(h31_nodes, "A", { href: true, id: true });
			var a12_nodes = children(a12);
			t25 = claim_text(a12_nodes, "2. I tried using linear-gradient to draw the background");
			a12_nodes.forEach(detach);
			h31_nodes.forEach(detach);
			t26 = claim_space(section4_nodes);
			ul3 = claim_element(section4_nodes, "UL", {});
			var ul3_nodes = children(ul3);
			li11 = claim_element(ul3_nodes, "LI", {});
			var li11_nodes = children(li11);
			t27 = claim_text(li11_nodes, "I use the value of ");
			code0 = claim_element(li11_nodes, "CODE", {});
			var code0_nodes = children(code0);
			t28 = claim_text(code0_nodes, "t");
			code0_nodes.forEach(detach);
			t29 = claim_text(li11_nodes, " to determine how wide the solid color should be");
			li11_nodes.forEach(detach);
			ul3_nodes.forEach(detach);
			t30 = claim_space(section4_nodes);
			pre1 = claim_element(section4_nodes, "PRE", { class: true });
			var pre1_nodes = children(pre1);
			pre1_nodes.forEach(detach);
			t31 = claim_space(section4_nodes);
			p3 = claim_element(section4_nodes, "P", {});
			var p3_nodes = children(p3);

			img2 = claim_element(p3_nodes, "IMG", {
				title: true,
				alt: true,
				"data-src": true,
				loading: true
			});

			p3_nodes.forEach(detach);
			section4_nodes.forEach(detach);
			t32 = claim_space(nodes);
			section5 = claim_element(nodes, "SECTION", {});
			var section5_nodes = children(section5);
			h32 = claim_element(section5_nodes, "H3", {});
			var h32_nodes = children(h32);
			a13 = claim_element(h32_nodes, "A", { href: true, id: true });
			var a13_nodes = children(a13);
			t33 = claim_text(a13_nodes, "3. Next I need to hide / reveal the text at the right time");
			a13_nodes.forEach(detach);
			h32_nodes.forEach(detach);
			t34 = claim_space(section5_nodes);
			ul4 = claim_element(section5_nodes, "UL", {});
			var ul4_nodes = children(ul4);
			li12 = claim_element(ul4_nodes, "LI", {});
			var li12_nodes = children(li12);
			t35 = claim_text(li12_nodes, "I hid the text by setting the text color to transparent");
			li12_nodes.forEach(detach);
			ul4_nodes.forEach(detach);
			t36 = claim_space(section5_nodes);
			pre2 = claim_element(section5_nodes, "PRE", { class: true });
			var pre2_nodes = children(pre2);
			pre2_nodes.forEach(detach);
			t37 = claim_space(section5_nodes);
			p4 = claim_element(section5_nodes, "P", {});
			var p4_nodes = children(p4);

			img3 = claim_element(p4_nodes, "IMG", {
				title: true,
				alt: true,
				"data-src": true,
				loading: true
			});

			p4_nodes.forEach(detach);
			section5_nodes.forEach(detach);
			t38 = claim_space(nodes);
			section6 = claim_element(nodes, "SECTION", {});
			var section6_nodes = children(section6);
			h33 = claim_element(section6_nodes, "H3", {});
			var h33_nodes = children(h33);
			a14 = claim_element(h33_nodes, "A", { href: true, id: true });
			var a14_nodes = children(a14);
			t39 = claim_text(a14_nodes, "4. Combining the both 2. and 3. together");
			a14_nodes.forEach(detach);
			h33_nodes.forEach(detach);
			t40 = claim_space(section6_nodes);
			pre3 = claim_element(section6_nodes, "PRE", { class: true });
			var pre3_nodes = children(pre3);
			pre3_nodes.forEach(detach);
			section6_nodes.forEach(detach);
			t41 = claim_space(nodes);
			section7 = claim_element(nodes, "SECTION", {});
			var section7_nodes = children(section7);
			h34 = claim_element(section7_nodes, "H3", {});
			var h34_nodes = children(h34);
			a15 = claim_element(h34_nodes, "A", { href: true, id: true });
			var a15_nodes = children(a15);
			t42 = claim_text(a15_nodes, "5. final touches, pass the ");
			code1 = claim_element(a15_nodes, "CODE", {});
			var code1_nodes = children(code1);
			t43 = claim_text(code1_nodes, "duration");
			code1_nodes.forEach(detach);
			t44 = claim_text(a15_nodes, ", ");
			code2 = claim_element(a15_nodes, "CODE", {});
			var code2_nodes = children(code2);
			t45 = claim_text(code2_nodes, "delay");
			code2_nodes.forEach(detach);
			t46 = claim_text(a15_nodes, ", and ");
			code3 = claim_element(a15_nodes, "CODE", {});
			var code3_nodes = children(code3);
			t47 = claim_text(code3_nodes, "easing");
			code3_nodes.forEach(detach);
			t48 = claim_text(a15_nodes, " into the returned object");
			a15_nodes.forEach(detach);
			h34_nodes.forEach(detach);
			t49 = claim_space(section7_nodes);
			pre4 = claim_element(section7_nodes, "PRE", { class: true });
			var pre4_nodes = children(pre4);
			pre4_nodes.forEach(detach);
			section7_nodes.forEach(detach);
			t50 = claim_space(nodes);
			section8 = claim_element(nodes, "SECTION", {});
			var section8_nodes = children(section8);
			h22 = claim_element(section8_nodes, "H2", {});
			var h22_nodes = children(h22);
			a16 = claim_element(h22_nodes, "A", { href: true, id: true });
			var a16_nodes = children(a16);
			t51 = claim_text(a16_nodes, "Final code");
			a16_nodes.forEach(detach);
			h22_nodes.forEach(detach);
			t52 = claim_space(section8_nodes);
			pre5 = claim_element(section8_nodes, "PRE", { class: true });
			var pre5_nodes = children(pre5);
			pre5_nodes.forEach(detach);
			section8_nodes.forEach(detach);
			t53 = claim_space(nodes);
			section9 = claim_element(nodes, "SECTION", {});
			var section9_nodes = children(section9);
			h23 = claim_element(section9_nodes, "H2", {});
			var h23_nodes = children(h23);
			a17 = claim_element(h23_nodes, "A", { href: true, id: true });
			var a17_nodes = children(a17);
			t54 = claim_text(a17_nodes, "Extra");
			a17_nodes.forEach(detach);
			h23_nodes.forEach(detach);
			t55 = claim_space(section9_nodes);
			p5 = claim_element(section9_nodes, "P", {});
			var p5_nodes = children(p5);
			t56 = claim_text(p5_nodes, "Svelte has make writing custom transitions simple, with the code above, the transition itself is able to pause / reverse halfway through the transition");
			p5_nodes.forEach(detach);
			t57 = claim_space(section9_nodes);
			p6 = claim_element(section9_nodes, "P", {});
			var p6_nodes = children(p6);

			img4 = claim_element(p6_nodes, "IMG", {
				title: true,
				alt: true,
				"data-src": true,
				loading: true
			});

			p6_nodes.forEach(detach);
			section9_nodes.forEach(detach);
			this.h();
		},
		h() {
			attr(a0, "href", "#the-result");
			attr(a1, "href", "#break-it-down-slowly");
			attr(a2, "href", "#the-first-thing-is-to-figure-out-the-color-of-the-text");
			attr(a3, "href", "#i-tried-using-linear-gradient-to-draw-the-background");
			attr(a4, "href", "#next-i-need-to-hide-reveal-the-text-at-the-right-time");
			attr(a5, "href", "#combining-the-both-and-together");
			attr(a6, "href", "#final-touches-pass-the-duration-delay-and-easing-into-the-returned-object");
			attr(a7, "href", "#final-code");
			attr(a8, "href", "#extra");
			attr(ul1, "class", "sitemap");
			attr(ul1, "id", "sitemap");
			attr(ul1, "role", "navigation");
			attr(ul1, "aria-label", "Table of Contents");
			attr(a9, "href", "#the-result");
			attr(a9, "id", "the-result");
			attr(img0, "title", "null");
			attr(img0, "alt", "the-result");
			attr(img0, "data-src", __build_img__0);
			attr(img0, "loading", "lazy");
			attr(a10, "href", "#break-it-down-slowly");
			attr(a10, "id", "break-it-down-slowly");
			attr(img1, "title", "null");
			attr(img1, "alt", "breakdown");
			attr(img1, "data-src", __build_img__1);
			attr(img1, "loading", "lazy");
			attr(a11, "href", "#the-first-thing-is-to-figure-out-the-color-of-the-text");
			attr(a11, "id", "the-first-thing-is-to-figure-out-the-color-of-the-text");
			attr(pre0, "class", "language-js");
			attr(a12, "href", "#i-tried-using-linear-gradient-to-draw-the-background");
			attr(a12, "id", "i-tried-using-linear-gradient-to-draw-the-background");
			attr(pre1, "class", "language-js");
			attr(img2, "title", "null");
			attr(img2, "alt", "breakdown 2");
			attr(img2, "data-src", __build_img__2);
			attr(img2, "loading", "lazy");
			attr(a13, "href", "#next-i-need-to-hide-reveal-the-text-at-the-right-time");
			attr(a13, "id", "next-i-need-to-hide-reveal-the-text-at-the-right-time");
			attr(pre2, "class", "language-js");
			attr(img3, "title", "null");
			attr(img3, "alt", "breakdown 3");
			attr(img3, "data-src", __build_img__3);
			attr(img3, "loading", "lazy");
			attr(a14, "href", "#combining-the-both-and-together");
			attr(a14, "id", "combining-the-both-and-together");
			attr(pre3, "class", "language-js");
			attr(a15, "href", "#final-touches-pass-the-duration-delay-and-easing-into-the-returned-object");
			attr(a15, "id", "final-touches-pass-the-duration-delay-and-easing-into-the-returned-object");
			attr(pre4, "class", "language-svelte");
			attr(a16, "href", "#final-code");
			attr(a16, "id", "final-code");
			attr(pre5, "class", "language-js");
			attr(a17, "href", "#extra");
			attr(a17, "id", "extra");
			attr(img4, "title", "null");
			attr(img4, "alt", "reversible");
			attr(img4, "data-src", __build_img__4);
			attr(img4, "loading", "lazy");
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
			append(ul1, ul0);
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
			append(ul1, li7);
			append(li7, a7);
			append(a7, t7);
			append(ul1, li8);
			append(li8, a8);
			append(a8, t8);
			insert(target, t9, anchor);
			insert(target, section1, anchor);
			append(section1, h20);
			append(h20, a9);
			append(a9, t10);
			append(section1, t11);
			append(section1, p0);
			append(p0, img0);
			insert(target, t12, anchor);
			insert(target, section2, anchor);
			append(section2, h21);
			append(h21, a10);
			append(a10, t13);
			append(section2, t14);
			append(section2, p1);
			append(p1, img1);
			append(section2, t15);
			append(section2, p2);
			append(p2, t16);
			append(section2, t17);
			append(section2, ul2);
			append(ul2, li9);
			append(li9, t18);
			append(ul2, t19);
			append(ul2, li10);
			append(li10, t20);
			insert(target, t21, anchor);
			insert(target, section3, anchor);
			append(section3, h30);
			append(h30, a11);
			append(a11, t22);
			append(section3, t23);
			append(section3, pre0);
			pre0.innerHTML = raw0_value;
			insert(target, t24, anchor);
			insert(target, section4, anchor);
			append(section4, h31);
			append(h31, a12);
			append(a12, t25);
			append(section4, t26);
			append(section4, ul3);
			append(ul3, li11);
			append(li11, t27);
			append(li11, code0);
			append(code0, t28);
			append(li11, t29);
			append(section4, t30);
			append(section4, pre1);
			pre1.innerHTML = raw1_value;
			append(section4, t31);
			append(section4, p3);
			append(p3, img2);
			insert(target, t32, anchor);
			insert(target, section5, anchor);
			append(section5, h32);
			append(h32, a13);
			append(a13, t33);
			append(section5, t34);
			append(section5, ul4);
			append(ul4, li12);
			append(li12, t35);
			append(section5, t36);
			append(section5, pre2);
			pre2.innerHTML = raw2_value;
			append(section5, t37);
			append(section5, p4);
			append(p4, img3);
			insert(target, t38, anchor);
			insert(target, section6, anchor);
			append(section6, h33);
			append(h33, a14);
			append(a14, t39);
			append(section6, t40);
			append(section6, pre3);
			pre3.innerHTML = raw3_value;
			insert(target, t41, anchor);
			insert(target, section7, anchor);
			append(section7, h34);
			append(h34, a15);
			append(a15, t42);
			append(a15, code1);
			append(code1, t43);
			append(a15, t44);
			append(a15, code2);
			append(code2, t45);
			append(a15, t46);
			append(a15, code3);
			append(code3, t47);
			append(a15, t48);
			append(section7, t49);
			append(section7, pre4);
			pre4.innerHTML = raw4_value;
			insert(target, t50, anchor);
			insert(target, section8, anchor);
			append(section8, h22);
			append(h22, a16);
			append(a16, t51);
			append(section8, t52);
			append(section8, pre5);
			pre5.innerHTML = raw5_value;
			insert(target, t53, anchor);
			insert(target, section9, anchor);
			append(section9, h23);
			append(h23, a17);
			append(a17, t54);
			append(section9, t55);
			append(section9, p5);
			append(p5, t56);
			append(section9, t57);
			append(section9, p6);
			append(p6, img4);
		},
		p: noop,
		d(detaching) {
			if (detaching) detach(section0);
			if (detaching) detach(t9);
			if (detaching) detach(section1);
			if (detaching) detach(t12);
			if (detaching) detach(section2);
			if (detaching) detach(t21);
			if (detaching) detach(section3);
			if (detaching) detach(t24);
			if (detaching) detach(section4);
			if (detaching) detach(t32);
			if (detaching) detach(section5);
			if (detaching) detach(t38);
			if (detaching) detach(section6);
			if (detaching) detach(t41);
			if (detaching) detach(section7);
			if (detaching) detach(t50);
			if (detaching) detach(section8);
			if (detaching) detach(t53);
			if (detaching) detach(section9);
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
	"title": "Solid color swipe Svelte Transition",
	"tags": ["svelte", "transition"],
	"slug": "notes/solid-color-swipe-svelte-transition",
	"type": "notes",
	"name": "solid-color-swipe-svelte-transition",
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
