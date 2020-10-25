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

var __build_img__11 = "64f5d9a1141a72a3.gif";

var __build_img__10 = "7389e6a539dfb96f.gif";

var __build_img__9 = "18a984f07300b1dc.gif";

var __build_img__8 = "4872d6162e49daf5.gif";

var __build_img__7 = "17c1d118d0a12e79.gif";

var __build_img__6 = "31d9f3dce60ad133.gif";

var __build_img__5 = "47b1f5deb78bee6f.gif";

var __build_img__4 = "0b1134a15417c434.gif";

var __build_img__3 = "70061f3da10e51f5.gif";

var __build_img__2 = "bce856342e382d9d.gif";

var __build_img_webp__1 = "4d47b6e0b8d2c4ed.webp";

var __build_img__1 = "4d47b6e0b8d2c4ed.png";

var __build_img_webp__0 = "b7914d00236be824.webp";

var __build_img__0 = "b7914d00236be824.png";

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
	let svg0;
	let path0;
	let t12;
	let a7;
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
			t6 = text("Talks");
			t7 = space();
			li4 = element("li");
			a4 = element("a");
			t8 = text("Notes");
			t9 = space();
			li5 = element("li");
			a5 = element("a");
			t10 = text("Newsletter");
			t11 = space();
			li6 = element("li");
			a6 = element("a");
			svg0 = svg_element("svg");
			path0 = svg_element("path");
			t12 = space();
			a7 = element("a");
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
			t6 = claim_text(a3_nodes, "Talks");
			a3_nodes.forEach(detach);
			li3_nodes.forEach(detach);
			t7 = claim_space(ul_nodes);
			li4 = claim_element(ul_nodes, "LI", { class: true });
			var li4_nodes = children(li4);
			a4 = claim_element(li4_nodes, "A", { href: true, class: true });
			var a4_nodes = children(a4);
			t8 = claim_text(a4_nodes, "Notes");
			a4_nodes.forEach(detach);
			li4_nodes.forEach(detach);
			t9 = claim_space(ul_nodes);
			li5 = claim_element(ul_nodes, "LI", { class: true });
			var li5_nodes = children(li5);
			a5 = claim_element(li5_nodes, "A", { href: true, class: true });
			var a5_nodes = children(a5);
			t10 = claim_text(a5_nodes, "Newsletter");
			a5_nodes.forEach(detach);
			li5_nodes.forEach(detach);
			t11 = claim_space(ul_nodes);
			li6 = claim_element(ul_nodes, "LI", { class: true });
			var li6_nodes = children(li6);

			a6 = claim_element(li6_nodes, "A", {
				"aria-label": true,
				href: true,
				class: true
			});

			var a6_nodes = children(a6);

			svg0 = claim_element(
				a6_nodes,
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
			a6_nodes.forEach(detach);
			t12 = claim_space(li6_nodes);

			a7 = claim_element(li6_nodes, "A", {
				"aria-label": true,
				href: true,
				class: true
			});

			var a7_nodes = children(a7);

			svg1 = claim_element(
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

			var svg1_nodes = children(svg1);
			path1 = claim_element(svg1_nodes, "path", { d: true }, 1);
			children(path1).forEach(detach);
			svg1_nodes.forEach(detach);
			a7_nodes.forEach(detach);
			li6_nodes.forEach(detach);
			ul_nodes.forEach(detach);
			nav_nodes.forEach(detach);
			header_nodes.forEach(detach);
			this.h();
		},
		h() {
			attr(a0, "href", "/");
			attr(a0, "class", "svelte-f3e4uo");
			attr(li0, "class", "svelte-f3e4uo");
			attr(a1, "href", "/about");
			attr(a1, "class", "svelte-f3e4uo");
			attr(li1, "class", "svelte-f3e4uo");
			attr(a2, "href", "/blogs");
			attr(a2, "class", "svelte-f3e4uo");
			attr(li2, "class", "svelte-f3e4uo");
			attr(a3, "href", "/talks");
			attr(a3, "class", "svelte-f3e4uo");
			attr(li3, "class", "svelte-f3e4uo");
			attr(a4, "href", "/notes");
			attr(a4, "class", "svelte-f3e4uo");
			attr(li4, "class", "svelte-f3e4uo");
			attr(a5, "href", "/newsletter");
			attr(a5, "class", "svelte-f3e4uo");
			attr(li5, "class", "svelte-f3e4uo");
			attr(path0, "d", "M23 3a10.9 10.9 0 0 1-3.14 1.53 4.48 4.48 0 0 0-7.86 3v1A10.66\n    10.66 0 0 1 3 4s-4 9 5 13a11.64 11.64 0 0 1-7 2c9 5 20 0 20-11.5a4.5\n    4.5 0 0 0-.08-.83A7.72 7.72 0 0 0 23 3z");
			attr(svg0, "viewBox", "0 0 24 24");
			attr(svg0, "width", "1em");
			attr(svg0, "height", "1em");
			attr(svg0, "class", "svelte-f3e4uo");
			attr(a6, "aria-label", "Twitter account");
			attr(a6, "href", "https://twitter.com/lihautan");
			attr(a6, "class", "svelte-f3e4uo");
			attr(path1, "d", "M9 19c-5 1.5-5-2.5-7-3m14 6v-3.87a3.37 3.37 0 0\n    0-.94-2.61c3.14-.35 6.44-1.54 6.44-7A5.44 5.44 0 0 0 20 4.77 5.07\n    5.07 0 0 0 19.91 1S18.73.65 16 2.48a13.38 13.38 0 0 0-7 0C6.27.65\n    5.09 1 5.09 1A5.07 5.07 0 0 0 5 4.77a5.44 5.44 0 0 0-1.5 3.78c0 5.42\n    3.3 6.61 6.44 7A3.37 3.37 0 0 0 9 18.13V22");
			attr(svg1, "viewBox", "0 0 24 24");
			attr(svg1, "width", "1em");
			attr(svg1, "height", "1em");
			attr(svg1, "class", "svelte-f3e4uo");
			attr(a7, "aria-label", "Github account");
			attr(a7, "href", "https://github.com/tanhauhau");
			attr(a7, "class", "svelte-f3e4uo");
			attr(li6, "class", "social svelte-f3e4uo");
			attr(ul, "class", "svelte-f3e4uo");
			attr(header, "class", "svelte-f3e4uo");
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
			append(a6, svg0);
			append(svg0, path0);
			append(li6, t12);
			append(li6, a7);
			append(a7, svg1);
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

var baseCss = "https://lihautan.com/notes/svelte-summit-2020-summary/assets/blog-base-3554d53c.css";

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
			attr(span, "class", "svelte-186dllz");
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
			attr(meta8, "content", "https%3A%2F%2Flihautan.com%2Fnotes%2Fsvelte-summit-2020-summary");
			attr(a, "href", "#content");
			attr(a, "class", "skip svelte-186dllz");
			attr(article, "class", "svelte-186dllz");
			attr(main, "id", "content");
			attr(main, "class", "blog svelte-186dllz");
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

/* content/notes/svelte-summit-2020-summary/@@page-markup.svelte generated by Svelte v3.24.0 */

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
	let a10;
	let t12;
	let t13;
	let t14;
	let p1;
	let t15;
	let a11;
	let t16;
	let t17;
	let a12;
	let t18;
	let t19;
	let t20;
	let blockquote0;
	let p2;
	let t21;
	let a13;
	let t22;
	let t23;
	let t24;
	let blockquote1;
	let p3;
	let t25;
	let t26;
	let ul1;
	let li9;
	let t27;
	let a14;
	let t28;
	let t29;
	let t30;
	let blockquote2;
	let p4;
	let t31;
	let t32;
	let ul2;
	let li10;
	let t33;
	let a15;
	let t34;
	let t35;
	let blockquote3;
	let p5;
	let t36;
	let t37;
	let ul3;
	let li11;
	let t38;
	let a16;
	let t39;
	let t40;
	let blockquote4;
	let p6;
	let t41;
	let t42;
	let ul4;
	let li12;
	let t43;
	let a17;
	let t44;
	let t45;
	let p7;
	let t46;
	let t47;
	let ul5;
	let li13;
	let t48;
	let t49;
	let li14;
	let t50;
	let t51;
	let p8;
	let strong0;
	let t52;
	let t53;
	let ul6;
	let li15;
	let t54;
	let a18;
	let t55;
	let t56;
	let li16;
	let t57;
	let a19;
	let t58;
	let t59;
	let li17;
	let t60;
	let a20;
	let t61;
	let t62;
	let a21;
	let t63;
	let t64;
	let li18;
	let t65;
	let a22;
	let t66;
	let t67;
	let blockquote5;
	let p9;
	let t68;
	let t69;
	let section2;
	let h21;
	let a23;
	let t70;
	let t71;
	let p10;
	let a24;
	let t72;
	let t73;
	let t74;
	let p11;
	let t75;
	let a25;
	let t76;
	let t77;
	let p12;
	let t78;
	let t79;
	let ul7;
	let li19;
	let t80;
	let t81;
	let li20;
	let t82;
	let t83;
	let li21;
	let t84;
	let t85;
	let p13;
	let t86;
	let t87;
	let ul8;
	let li22;
	let t88;
	let a26;
	let t89;
	let t90;
	let li23;
	let t91;
	let a27;
	let t92;
	let t93;
	let blockquote6;
	let p14;
	let t94;
	let t95;
	let section3;
	let h22;
	let a28;
	let t96;
	let t97;
	let p15;
	let a29;
	let t98;
	let t99;
	let ul9;
	let li24;
	let t100;
	let t101;
	let li25;
	let t102;
	let t103;
	let li26;
	let t104;
	let t105;
	let p16;
	let picture0;
	let source0;
	let source1;
	let img0;
	let t106;
	let p17;
	let t107;
	let t108;
	let ul10;
	let li27;
	let t109;
	let t110;
	let li28;
	let t111;
	let t112;
	let li29;
	let t113;
	let t114;
	let p18;
	let picture1;
	let source2;
	let source3;
	let img1;
	let t115;
	let p19;
	let t116;
	let t117;
	let ul11;
	let li30;
	let t118;
	let code0;
	let t119;
	let t120;
	let li31;
	let t121;
	let code1;
	let t122;
	let t123;
	let p20;
	let t124;
	let t125;
	let pre0;

	let raw0_value = `<code class="language-svelte"><span class="token tag"><span class="token tag"><span class="token punctuation">&lt;</span>script</span><span class="token punctuation">></span></span><span class="token script"><span class="token language-javascript">
  <span class="token keyword">import</span> <span class="token punctuation">&#123;</span> slide <span class="token punctuation">&#125;</span> <span class="token keyword">from</span> <span class="token string">'svelte/transition'</span><span class="token punctuation">;</span>
</span></span><span class="token tag"><span class="token tag"><span class="token punctuation">&lt;/</span>script</span><span class="token punctuation">></span></span>

<span class="token tag"><span class="token tag"><span class="token punctuation">&lt;</span>div</span> <span class="token attr-name"><span class="token namespace">in:</span>slide</span> <span class="token punctuation">/></span></span>
<span class="token tag"><span class="token tag"><span class="token punctuation">&lt;</span>div</span> <span class="token attr-name"><span class="token namespace">out:</span>slide</span> <span class="token punctuation">/></span></span></code>` + "";

	let t126;
	let ul12;
	let li32;
	let t127;
	let t128;
	let li33;
	let t129;
	let t130;
	let li34;
	let t131;
	let t132;
	let li35;
	let t133;
	let t134;
	let p21;
	let img2;
	let t135;
	let ul13;
	let li36;
	let t136;
	let code2;
	let t137;
	let t138;
	let code3;
	let t139;
	let t140;
	let li37;
	let t141;
	let code4;
	let t142;
	let t143;
	let code5;
	let t144;
	let t145;
	let li38;
	let t146;
	let t147;
	let pre1;

	let raw1_value = `<code class="language-svelte"><span class="token tag"><span class="token tag"><span class="token punctuation">&lt;</span>script</span><span class="token punctuation">></span></span><span class="token script"><span class="token language-javascript">
  <span class="token keyword">import</span> <span class="token punctuation">&#123;</span> crossfade <span class="token punctuation">&#125;</span> <span class="token keyword">from</span> <span class="token string">'svelte/transition'</span><span class="token punctuation">;</span>
  <span class="token keyword">const</span> <span class="token punctuation">[</span>send<span class="token punctuation">,</span> receive<span class="token punctuation">]</span> <span class="token operator">=</span> <span class="token function">crossfade</span><span class="token punctuation">(</span><span class="token punctuation">&#123;</span>
    fallback<span class="token punctuation">:</span> <span class="token keyword">null</span><span class="token punctuation">,</span>
  <span class="token punctuation">&#125;</span><span class="token punctuation">)</span><span class="token punctuation">;</span>
</span></span><span class="token tag"><span class="token tag"><span class="token punctuation">&lt;/</span>script</span><span class="token punctuation">></span></span>

<span class="token tag"><span class="token tag"><span class="token punctuation">&lt;</span>div</span> <span class="token attr-name">id</span><span class="token attr-value"><span class="token punctuation">=</span><span class="token punctuation">"</span>a<span class="token punctuation">"</span></span><span class="token punctuation">></span></span>
  <span class="token language-javascript"><span class="token punctuation">&#123;</span>#<span class="token keyword">if</span> position <span class="token operator">===</span> <span class="token string">'a'</span><span class="token punctuation">&#125;</span></span>
    <span class="token tag"><span class="token tag"><span class="token punctuation">&lt;</span>div</span> <span class="token attr-name"><span class="token namespace">out:</span>send=</span><span class="token language-javascript"><span class="token punctuation">&#123;</span><span class="token punctuation">&#123;</span>key<span class="token punctuation">:</span><span class="token string">"box"</span><span class="token punctuation">&#125;</span><span class="token punctuation">&#125;</span></span><span class="token punctuation">></span></span>
      ...
    <span class="token tag"><span class="token tag"><span class="token punctuation">&lt;/</span>div</span><span class="token punctuation">></span></span>
  <span class="token language-javascript"><span class="token punctuation">&#123;</span><span class="token operator">/</span><span class="token keyword">if</span><span class="token punctuation">&#125;</span></span>
<span class="token tag"><span class="token tag"><span class="token punctuation">&lt;/</span>div</span><span class="token punctuation">></span></span>
<span class="token tag"><span class="token tag"><span class="token punctuation">&lt;</span>div</span> <span class="token attr-name">id</span><span class="token attr-value"><span class="token punctuation">=</span><span class="token punctuation">"</span>b<span class="token punctuation">"</span></span><span class="token punctuation">></span></span>
  <span class="token language-javascript"><span class="token punctuation">&#123;</span>#<span class="token keyword">if</span> position <span class="token operator">===</span> <span class="token string">'b'</span><span class="token punctuation">&#125;</span></span>
    <span class="token tag"><span class="token tag"><span class="token punctuation">&lt;</span>div</span> <span class="token attr-name"><span class="token namespace">in:</span>receive=</span><span class="token language-javascript"><span class="token punctuation">&#123;</span><span class="token punctuation">&#123;</span>key<span class="token punctuation">:</span><span class="token string">"box"</span><span class="token punctuation">&#125;</span><span class="token punctuation">&#125;</span></span><span class="token punctuation">></span></span>
      ...
    <span class="token tag"><span class="token tag"><span class="token punctuation">&lt;/</span>div</span><span class="token punctuation">></span></span>
  <span class="token language-javascript"><span class="token punctuation">&#123;</span><span class="token operator">/</span><span class="token keyword">if</span><span class="token punctuation">&#125;</span></span>
<span class="token tag"><span class="token tag"><span class="token punctuation">&lt;/</span>div</span><span class="token punctuation">></span></span></code>` + "";

	let t148;
	let p22;
	let t149;
	let a30;
	let t150;
	let t151;
	let a31;
	let t152;
	let t153;
	let t154;
	let p23;
	let img3;
	let t155;
	let section4;
	let h23;
	let a32;
	let t156;
	let t157;
	let p24;
	let a33;
	let t158;
	let t159;
	let a34;
	let t160;
	let t161;
	let t162;
	let p25;
	let strong1;
	let t163;
	let t164;
	let ul14;
	let li39;
	let t165;
	let t166;
	let li40;
	let t167;
	let t168;
	let li41;
	let t169;
	let t170;
	let li42;
	let t171;
	let t172;
	let li43;
	let t173;
	let t174;
	let li44;
	let t175;
	let t176;
	let li45;
	let t177;
	let t178;
	let li46;
	let t179;
	let t180;
	let p26;
	let strong2;
	let t181;
	let t182;
	let ul15;
	let li47;
	let t183;
	let t184;
	let li48;
	let t185;
	let t186;
	let pre2;

	let raw2_value = `<code class="language-sh"><span class="token comment"># mac (homebrew)</span>
brew tap plentico/homebrew-plenti
brew <span class="token function">install</span> plenti

<span class="token comment"># linux (snap)</span>
snap <span class="token function">install</span> plenti

<span class="token comment"># windows (scoop)</span>
scoop bucket <span class="token function">add</span> plenti https://github.com/plentico/scoop-plenti</code>` + "";

	let t187;
	let p27;
	let strong3;
	let t188;
	let t189;
	let pre3;

	let raw3_value = `<code class="language-sh"><span class="token comment"># create a new site</span>
plenti new site svelte-summit
<span class="token comment"># create a new type</span>
plenti new <span class="token builtin class-name">type</span> events

<span class="token comment"># starts a lightweight webserver for local development</span>
plenti serve</code>` + "";

	let t190;
	let blockquote7;
	let p28;
	let t191;
	let t192;
	let section5;
	let h24;
	let a35;
	let t193;
	let t194;
	let p29;
	let a36;
	let t195;
	let t196;
	let t197;
	let p30;
	let t198;
	let t199;
	let ul16;
	let li49;
	let t200;
	let t201;
	let li50;
	let t202;
	let t203;
	let p31;
	let t204;
	let t205;
	let p32;
	let strong4;
	let t206;
	let t207;
	let ul17;
	let li51;
	let t208;
	let t209;
	let p33;
	let img4;
	let t210;
	let p34;
	let strong5;
	let t211;
	let t212;
	let ul18;
	let li52;
	let t213;
	let t214;
	let li53;
	let t215;
	let code6;
	let t216;
	let t217;
	let code7;
	let t218;
	let t219;
	let pre4;

	let raw4_value = `<code class="language-svelte"><span class="token comment">&lt;!-- src/components/Balloon.svelte --></span>
<span class="token tag"><span class="token tag"><span class="token punctuation">&lt;</span>g</span> <span class="token attr-name">class</span><span class="token attr-value"><span class="token punctuation">=</span><span class="token punctuation">"</span>balloon<span class="token punctuation">"</span></span>
   <span class="token attr-name"><span class="token namespace">in:</span>fade|local=</span><span class="token language-javascript"><span class="token punctuation">&#123;</span><span class="token punctuation">&#123;</span>duration<span class="token punctuation">:</span> bloomDuration<span class="token punctuation">,</span> delay<span class="token punctuation">:</span> growDuration <span class="token operator">+</span> timePoint<span class="token punctuation">.</span>id <span class="token operator">*</span> jitterFactor<span class="token punctuation">&#125;</span><span class="token punctuation">&#125;</span></span>
   <span class="token attr-name"><span class="token namespace">out:</span>fade|local=</span><span class="token language-javascript"><span class="token punctuation">&#123;</span><span class="token punctuation">&#123;</span>duration<span class="token punctuation">:</span> bloomDuration<span class="token punctuation">,</span> delay<span class="token punctuation">:</span> timePoint<span class="token punctuation">.</span>id <span class="token operator">*</span> jitterFactor<span class="token punctuation">&#125;</span><span class="token punctuation">&#125;</span></span><span class="token punctuation">></span></span>
  <span class="token tag"><span class="token tag"><span class="token punctuation">&lt;</span>circle</span> <span class="token attr-name">...</span> <span class="token punctuation">/></span></span>
<span class="token tag"><span class="token tag"><span class="token punctuation">&lt;/</span>g</span><span class="token punctuation">></span></span>
<span class="token comment">&lt;!-- src/components/SourceLink.svelte --></span>
<span class="token language-javascript"><span class="token punctuation">&#123;</span>#<span class="token keyword">if</span> <span class="token punctuation">(</span>source<span class="token punctuation">.</span>show<span class="token punctuation">)</span><span class="token punctuation">&#125;</span></span>
  <span class="token tag"><span class="token tag"><span class="token punctuation">&lt;</span>g</span> <span class="token attr-name">class</span><span class="token attr-value"><span class="token punctuation">=</span><span class="token punctuation">"</span>source-link<span class="token punctuation">"</span></span><span class="token punctuation">></span></span>
    <span class="token tag"><span class="token tag"><span class="token punctuation">&lt;</span>path</span> <span class="token attr-name">d=</span><span class="token language-javascript"><span class="token punctuation">&#123;</span><span class="token operator">...</span><span class="token punctuation">&#125;</span></span>
      <span class="token attr-name">stroke-width=</span><span class="token language-javascript"><span class="token punctuation">&#123;</span>$minDim <span class="token operator">/</span> <span class="token number">200</span><span class="token punctuation">&#125;</span></span>
      <span class="token attr-name"><span class="token namespace">in:</span>draw|local=</span><span class="token language-javascript"><span class="token punctuation">&#123;</span><span class="token punctuation">&#123;</span>duration<span class="token punctuation">:</span> growDuration<span class="token punctuation">,</span> delay<span class="token punctuation">:</span> source<span class="token punctuation">.</span>id <span class="token operator">*</span> jitterFactor<span class="token punctuation">,</span> easing<span class="token punctuation">:</span> linear<span class="token punctuation">&#125;</span><span class="token punctuation">&#125;</span></span>
      <span class="token attr-name"><span class="token namespace">out:</span>draw|local=</span><span class="token language-javascript"><span class="token punctuation">&#123;</span><span class="token punctuation">&#123;</span>duration<span class="token punctuation">:</span> growDuration<span class="token punctuation">,</span> delay<span class="token punctuation">:</span> bloomDuration <span class="token operator">+</span> source<span class="token punctuation">.</span>id <span class="token operator">*</span> jitterFactor<span class="token punctuation">,</span> easing<span class="token punctuation">:</span> linear<span class="token punctuation">&#125;</span><span class="token punctuation">&#125;</span></span><span class="token punctuation">></span></span><span class="token tag"><span class="token tag"><span class="token punctuation">&lt;/</span>path</span><span class="token punctuation">></span></span>
  <span class="token tag"><span class="token tag"><span class="token punctuation">&lt;/</span>g</span><span class="token punctuation">></span></span>
<span class="token language-javascript"><span class="token punctuation">&#123;</span><span class="token operator">/</span><span class="token keyword">if</span><span class="token punctuation">&#125;</span></span></code>` + "";

	let t220;
	let p35;
	let img5;
	let t221;
	let p36;
	let strong6;
	let t222;
	let t223;
	let ul19;
	let li54;
	let t224;
	let t225;
	let li55;
	let t226;
	let t227;
	let pre5;

	let raw5_value = `<code class="language-svelte"><span class="token comment">&lt;!-- src/components/Slider.svelte --></span>
<span class="token tag"><span class="token tag"><span class="token punctuation">&lt;</span>div</span> <span class="token attr-name">class</span><span class="token attr-value"><span class="token punctuation">=</span><span class="token punctuation">"</span>slider-handle<span class="token punctuation">"</span></span>
  <span class="token attr-name"><span class="token namespace">use:</span>slidable</span>
  <span class="token attr-name"><span class="token namespace">on:</span>slide=</span><span class="token language-javascript"><span class="token punctuation">&#123;</span><span class="token punctuation">(</span><span class="token parameter">e</span><span class="token punctuation">)</span> <span class="token operator">=></span> <span class="token function">handleSlide</span><span class="token punctuation">(</span>e<span class="token punctuation">,</span> <span class="token string">'right'</span><span class="token punctuation">)</span><span class="token punctuation">&#125;</span></span>
  <span class="token attr-name"><span class="token namespace">on:</span>slideend=</span><span class="token language-javascript"><span class="token punctuation">&#123;</span><span class="token punctuation">(</span><span class="token parameter">e</span><span class="token punctuation">)</span> <span class="token operator">=></span> <span class="token function">handleSlideEnd</span><span class="token punctuation">(</span>e<span class="token punctuation">,</span> <span class="token string">'right'</span><span class="token punctuation">)</span><span class="token punctuation">&#125;</span></span><span class="token punctuation">></span></span>
  ...
<span class="token tag"><span class="token tag"><span class="token punctuation">&lt;/</span>div</span><span class="token punctuation">></span></span></code>` + "";

	let t228;
	let p37;
	let t229;
	let t230;
	let ul20;
	let li56;
	let t231;
	let a37;
	let t232;
	let t233;
	let li57;
	let t234;
	let a38;
	let t235;
	let t236;
	let li58;
	let t237;
	let a39;
	let t238;
	let t239;
	let li59;
	let t240;
	let a40;
	let t241;
	let t242;
	let p38;
	let a41;
	let t243;
	let t244;
	let section6;
	let h25;
	let a42;
	let t245;
	let t246;
	let p39;
	let a43;
	let t247;
	let t248;
	let t249;
	let p40;
	let t250;
	let t251;
	let ul25;
	let li61;
	let t252;
	let ul21;
	let li60;
	let t253;
	let t254;
	let li63;
	let t255;
	let ul22;
	let li62;
	let t256;
	let t257;
	let li66;
	let t258;
	let ul23;
	let li64;
	let t259;
	let t260;
	let li65;
	let t261;
	let t262;
	let li69;
	let t263;
	let ul24;
	let li67;
	let t264;
	let t265;
	let li68;
	let t266;
	let t267;
	let p41;
	let t268;
	let t269;
	let ul26;
	let li70;
	let t270;
	let t271;
	let li71;
	let t272;
	let t273;
	let li72;
	let t274;
	let t275;
	let p42;
	let t276;
	let t277;
	let ul29;
	let li74;
	let t278;
	let ul27;
	let li73;
	let t279;
	let t280;
	let li77;
	let t281;
	let ul28;
	let li75;
	let t282;
	let t283;
	let li76;
	let t284;
	let t285;
	let p43;
	let t286;
	let t287;
	let ul31;
	let li78;
	let code8;
	let t288;
	let t289;
	let t290;
	let li79;
	let t291;
	let t292;
	let li82;
	let t293;
	let ul30;
	let li80;
	let t294;
	let t295;
	let li81;
	let code9;
	let t296;
	let t297;
	let p44;
	let a44;
	let t298;
	let t299;
	let p45;
	let t300;
	let t301;
	let ul32;
	let li83;
	let a45;
	let t302;
	let t303;
	let li84;
	let a46;
	let t304;
	let t305;
	let li85;
	let a47;
	let t306;
	let t307;
	let p46;
	let a48;
	let t308;
	let t309;
	let t310;
	let p47;
	let a49;
	let t311;
	let t312;
	let p48;
	let t313;
	let t314;
	let section7;
	let h26;
	let a50;
	let t315;
	let t316;
	let p49;
	let t317;
	let a51;
	let t318;
	let t319;
	let t320;
	let p50;
	let t321;
	let t322;
	let p51;
	let t323;
	let t324;
	let p52;
	let t325;
	let t326;
	let ul33;
	let li86;
	let t327;
	let t328;
	let li87;
	let t329;
	let t330;
	let li88;
	let t331;
	let t332;
	let li89;
	let t333;
	let code10;
	let t334;
	let t335;
	let t336;
	let p53;
	let t337;
	let t338;
	let ul34;
	let li90;
	let t339;
	let a52;
	let t340;
	let t341;
	let li91;
	let t342;
	let a53;
	let t343;
	let t344;
	let li92;
	let t345;
	let a54;
	let t346;
	let t347;
	let p54;
	let t348;
	let t349;
	let ul35;
	let li93;
	let t350;
	let a55;
	let t351;
	let t352;
	let li94;
	let t353;
	let a56;
	let t354;
	let t355;
	let li95;
	let t356;
	let a57;
	let t357;
	let t358;
	let p55;
	let t359;
	let t360;
	let p56;
	let a58;
	let t361;
	let t362;
	let section8;
	let h27;
	let a59;
	let t363;
	let t364;
	let p57;
	let t365;
	let t366;
	let p58;
	let t367;
	let t368;
	let pre6;

	let raw6_value = `<code class="language-bash"><span class="token comment"># create a new svite project from template</span>
svite create hello-submit

<span class="token comment"># start the dev server</span>
svite dev

<span class="token comment"># build for production</span>
svite build</code>` + "";

	let t369;
	let p59;
	let t370;
	let t371;
	let p60;
	let img6;
	let t372;
	let p61;
	let t373;
	let t374;
	let ul36;
	let li96;
	let t375;
	let t376;
	let li97;
	let t377;
	let t378;
	let li98;
	let t379;
	let t380;
	let li99;
	let t381;
	let t382;
	let li100;
	let t383;
	let t384;
	let p62;
	let t385;
	let a60;
	let t386;
	let t387;
	let section9;
	let h28;
	let a61;
	let t388;
	let t389;
	let p63;
	let a62;
	let t390;
	let t391;
	let t392;
	let p64;
	let t393;
	let t394;
	let ul39;
	let li102;
	let t395;
	let ul37;
	let li101;
	let t396;
	let t397;
	let li104;
	let t398;
	let ul38;
	let li103;
	let t399;
	let t400;
	let p65;
	let t401;
	let t402;
	let ul41;
	let li105;
	let t403;
	let t404;
	let li106;
	let t405;
	let a63;
	let t406;
	let t407;
	let li110;
	let t408;
	let code11;
	let t409;
	let t410;
	let code12;
	let t411;
	let t412;
	let code13;
	let t413;
	let ul40;
	let li107;
	let code14;
	let t414;
	let t415;
	let t416;
	let li108;
	let code15;
	let t417;
	let t418;
	let t419;
	let li109;
	let code16;
	let t420;
	let t421;
	let t422;
	let p66;
	let t423;
	let t424;
	let ul42;
	let li111;
	let t425;
	let code17;
	let t426;
	let t427;
	let t428;
	let li112;
	let t429;
	let code18;
	let t430;
	let t431;
	let code19;
	let t432;
	let t433;
	let code20;
	let t434;
	let t435;
	let p67;
	let img7;
	let t436;
	let p68;
	let a64;
	let t437;
	let t438;
	let p69;
	let code21;
	let t439;
	let t440;
	let ul43;
	let li113;
	let code22;
	let t441;
	let t442;
	let code23;
	let t443;
	let t444;
	let t445;
	let pre7;

	let raw7_value = `<code class="language-svelte"><span class="token tag"><span class="token tag"><span class="token punctuation">&lt;</span>script</span><span class="token punctuation">></span></span><span class="token script"><span class="token language-javascript">
  <span class="token keyword">import</span> <span class="token punctuation">&#123;</span> spring<span class="token punctuation">,</span> tweened <span class="token punctuation">&#125;</span> <span class="token keyword">from</span> <span class="token string">'svelte/motion'</span><span class="token punctuation">;</span>
  <span class="token keyword">let</span> percent <span class="token operator">=</span> <span class="token number">0</span><span class="token punctuation">;</span>
  <span class="token keyword">const</span> tweenedStore <span class="token operator">=</span> <span class="token function">tweened</span><span class="token punctuation">(</span><span class="token number">0</span><span class="token punctuation">,</span> <span class="token punctuation">&#123;</span>duration<span class="token punctuation">:</span> <span class="token number">1000</span><span class="token punctuation">&#125;</span><span class="token punctuation">)</span><span class="token punctuation">;</span>
  <span class="token keyword">const</span> springStore <span class="token operator">=</span> <span class="token function">spring</span><span class="token punctuation">(</span><span class="token number">0</span><span class="token punctuation">,</span> <span class="token punctuation">&#123;</span>stiffness<span class="token punctuation">:</span> <span class="token number">0.3</span><span class="token punctuation">,</span> damping<span class="token punctuation">:</span> <span class="token number">0.3</span><span class="token punctuation">&#125;</span><span class="token punctuation">)</span><span class="token punctuation">;</span>

  $<span class="token punctuation">:</span> tweenedValue<span class="token punctuation">.</span><span class="token function">set</span><span class="token punctuation">(</span>percent<span class="token punctuation">)</span><span class="token punctuation">;</span>
  $<span class="token punctuation">:</span> springValue<span class="token punctuation">.</span><span class="token function">set</span><span class="token punctuation">(</span>percent<span class="token punctuation">)</span><span class="token punctuation">;</span>
</span></span><span class="token tag"><span class="token tag"><span class="token punctuation">&lt;/</span>script</span><span class="token punctuation">></span></span>

<span class="token tag"><span class="token tag"><span class="token punctuation">&lt;</span>input</span> <span class="token attr-name">type</span><span class="token attr-value"><span class="token punctuation">=</span><span class="token punctuation">"</span>number<span class="token punctuation">"</span></span> <span class="token attr-name">min=</span><span class="token language-javascript"><span class="token punctuation">&#123;</span><span class="token number">0</span><span class="token punctuation">&#125;</span></span> <span class="token attr-name">max=</span><span class="token language-javascript"><span class="token punctuation">&#123;</span><span class="token number">100</span><span class="token punctuation">&#125;</span></span> <span class="token attr-name"><span class="token namespace">bind:</span>value=</span><span class="token language-javascript"><span class="token punctuation">&#123;</span>percent<span class="token punctuation">&#125;</span></span> <span class="token punctuation">/></span></span>
<span class="token language-javascript"><span class="token punctuation">&#123;</span>$tweenedStore<span class="token punctuation">&#125;</span></span> <span class="token language-javascript"><span class="token punctuation">&#123;</span>$springStore<span class="token punctuation">&#125;</span></span></code>` + "";

	let t446;
	let p70;
	let img8;
	let t447;
	let p71;
	let a65;
	let t448;
	let t449;
	let ul44;
	let li114;
	let t450;
	let t451;
	let pre8;

	let raw8_value = `<code class="language-svelte"><span class="token tag"><span class="token tag"><span class="token punctuation">&lt;</span>script</span><span class="token punctuation">></span></span><span class="token script"><span class="token language-javascript">
	<span class="token keyword">import</span> <span class="token punctuation">&#123;</span>tweened<span class="token punctuation">&#125;</span> <span class="token keyword">from</span> <span class="token string">'svelte/motion'</span><span class="token punctuation">;</span>

	<span class="token keyword">function</span> <span class="token function">rgbInterpolate</span><span class="token punctuation">(</span><span class="token parameter">fromColor<span class="token punctuation">,</span> toColor</span><span class="token punctuation">)</span> <span class="token punctuation">&#123;</span>
    <span class="token comment">// ...</span>
		<span class="token keyword">return</span> <span class="token parameter">t</span> <span class="token operator">=></span> <span class="token punctuation">&#123;</span>
      <span class="token comment">// ...</span>
			<span class="token keyword">return</span> <span class="token function">calculateColr</span><span class="token punctuation">(</span>fromColor<span class="token punctuation">,</span> toColor<span class="token punctuation">,</span> t<span class="token punctuation">)</span><span class="token punctuation">;</span>
		<span class="token punctuation">&#125;</span><span class="token punctuation">;</span>
	<span class="token punctuation">&#125;</span>
	
	<span class="token keyword">const</span> color <span class="token operator">=</span> <span class="token function">tweened</span><span class="token punctuation">(</span><span class="token string">'#ff0000'</span><span class="token punctuation">,</span> <span class="token punctuation">&#123;</span>duration<span class="token punctuation">:</span> <span class="token number">1000</span><span class="token punctuation">,</span> interpolate<span class="token punctuation">:</span> rgbInterpolate<span class="token punctuation">&#125;</span><span class="token punctuation">)</span><span class="token punctuation">;</span>
</span></span><span class="token tag"><span class="token tag"><span class="token punctuation">&lt;/</span>script</span><span class="token punctuation">></span></span>

<span class="token tag"><span class="token tag"><span class="token punctuation">&lt;</span>h1</span> <span class="token attr-name"><span class="token namespace">style="color:</span></span> <span class="token attr-name">#</span><span class="token language-javascript"><span class="token punctuation">&#123;</span>$color<span class="token punctuation">&#125;</span></span><span class="token attr-name">"</span><span class="token punctuation">></span></span>Tweened Color: <span class="token language-javascript"><span class="token punctuation">&#123;</span>$color<span class="token punctuation">&#125;</span></span><span class="token tag"><span class="token tag"><span class="token punctuation">&lt;/</span>h1</span><span class="token punctuation">></span></span></code>` + "";

	let t452;
	let p72;
	let a66;
	let t453;
	let t454;
	let p73;
	let t455;
	let t456;
	let ul45;
	let li115;
	let code24;
	let t457;
	let t458;
	let code25;
	let t459;
	let t460;
	let code26;
	let t461;
	let t462;
	let code27;
	let t463;
	let t464;
	let code28;
	let t465;
	let t466;
	let code29;
	let t467;
	let t468;
	let code30;
	let t469;
	let t470;
	let li116;
	let t471;
	let code31;
	let t472;
	let t473;
	let code32;
	let t474;
	let t475;
	let code33;
	let t476;
	let t477;
	let li117;
	let t478;
	let t479;
	let p74;
	let img9;
	let t480;
	let p75;
	let code34;
	let t481;
	let t482;
	let ul46;
	let li118;
	let t483;
	let code35;
	let t484;
	let t485;
	let t486;
	let p76;
	let img10;
	let t487;
	let p77;
	let a67;
	let t488;
	let t489;
	let p78;
	let code36;
	let t490;
	let t491;
	let t492;
	let ul47;
	let li119;
	let t493;
	let code37;
	let t494;
	let t495;
	let code38;
	let t496;
	let t497;
	let t498;
	let p79;
	let img11;
	let t499;
	let a68;
	let t500;
	let t501;
	let p80;
	let t502;
	let t503;
	let ul49;
	let li120;
	let t504;
	let t505;
	let li121;
	let t506;
	let t507;
	let li124;
	let t508;
	let ul48;
	let li122;
	let t509;
	let t510;
	let li123;
	let t511;
	let t512;
	let li125;
	let a69;
	let t513;
	let t514;
	let pre9;

	let raw9_value = `<code class="language-js"><span class="token operator">&lt;</span>script<span class="token operator">></span>
	<span class="token keyword">import</span> <span class="token punctuation">&#123;</span>backInOut<span class="token punctuation">,</span> linear<span class="token punctuation">&#125;</span> <span class="token keyword">from</span> <span class="token string">'svelte/easing'</span><span class="token punctuation">;</span>

	<span class="token keyword">function</span> <span class="token function">spin</span><span class="token punctuation">(</span><span class="token parameter">node<span class="token punctuation">,</span> options</span><span class="token punctuation">)</span> <span class="token punctuation">&#123;</span>
		<span class="token keyword">const</span> <span class="token punctuation">&#123;</span>easing<span class="token punctuation">,</span> times <span class="token operator">=</span> <span class="token number">1</span><span class="token punctuation">&#125;</span> <span class="token operator">=</span> options<span class="token punctuation">;</span>
		<span class="token keyword">return</span> <span class="token punctuation">&#123;</span>
			<span class="token comment">// The value of t passed to the css method</span>
			<span class="token comment">// varies between zero and one during an "in" transition</span>
			<span class="token comment">// and between one and zero during an "out" transition.</span>
			<span class="token function">css</span><span class="token punctuation">(</span><span class="token parameter">t</span><span class="token punctuation">)</span> <span class="token punctuation">&#123;</span>
				<span class="token keyword">const</span> degrees <span class="token operator">=</span> <span class="token number">360</span> <span class="token operator">*</span> times<span class="token punctuation">;</span> <span class="token comment">// through which to spin</span>
				<span class="token keyword">return</span> <span class="token template-string"><span class="token template-punctuation string">&#96;</span><span class="token string">transform: scale(</span><span class="token interpolation"><span class="token interpolation-punctuation punctuation">$&#123;</span>t<span class="token interpolation-punctuation punctuation">&#125;</span></span><span class="token string">) rotate(</span><span class="token interpolation"><span class="token interpolation-punctuation punctuation">$&#123;</span>t <span class="token operator">*</span> degrees<span class="token interpolation-punctuation punctuation">&#125;</span></span><span class="token string">deg);</span><span class="token template-punctuation string">&#96;</span></span><span class="token punctuation">;</span>
			<span class="token punctuation">&#125;</span>
		<span class="token punctuation">&#125;</span><span class="token punctuation">;</span>
	<span class="token punctuation">&#125;</span>
<span class="token operator">&lt;</span><span class="token operator">/</span>script<span class="token operator">></span>

<span class="token operator">&lt;</span>div <span class="token keyword">class</span><span class="token operator">=</span><span class="token string">"center"</span> transition<span class="token punctuation">:</span>spin<span class="token operator">=</span><span class="token punctuation">&#123;</span>options<span class="token punctuation">&#125;</span><span class="token operator">></span>
  <span class="token operator">&lt;</span>div <span class="token keyword">class</span><span class="token operator">=</span><span class="token string">"content"</span><span class="token operator">></span>Take me <span class="token keyword">for</span> a spin<span class="token operator">!</span><span class="token operator">&lt;</span><span class="token operator">/</span>div<span class="token operator">></span>
<span class="token operator">&lt;</span><span class="token operator">/</span>div<span class="token operator">></span></code>` + "";

	let t515;
	let p81;
	let t516;
	let t517;
	let ul50;
	let li126;
	let code39;
	let t518;
	let t519;
	let t520;
	let li127;
	let code40;
	let t521;
	let t522;
	let t523;
	let li128;
	let code41;
	let t524;
	let t525;
	let t526;
	let li129;
	let code42;
	let t527;
	let t528;
	let t529;
	let p82;
	let t530;
	let t531;
	let ul51;
	let li130;
	let t532;
	let a70;
	let t533;
	let t534;
	let li131;
	let t535;
	let a71;
	let t536;

	return {
		c() {
			section0 = element("section");
			ul0 = element("ul");
			li0 = element("li");
			a0 = element("a");
			t0 = text("1️⃣ The Zen of Svelte");
			li1 = element("li");
			a1 = element("a");
			t1 = text("2️⃣ Prototyping Design with Real Data Models");
			li2 = element("li");
			a2 = element("a");
			t2 = text("3️⃣ How does Svelte's crossfade function work?");
			li3 = element("li");
			a3 = element("a");
			t3 = text("4️⃣ Zero config Svelte websites with Plenti");
			li4 = element("li");
			a4 = element("a");
			t4 = text("5️⃣ How you setup data visualization with Svelte");
			li5 = element("li");
			a5 = element("a");
			t5 = text("6️⃣ Svelte at the Edge: Powering Svelte Apps with Cloudflare Workers");
			li6 = element("li");
			a6 = element("a");
			t6 = text("7️⃣ Svelte à la Mode");
			li7 = element("li");
			a7 = element("a");
			t7 = text("8️⃣ Introduction to Svite");
			li8 = element("li");
			a8 = element("a");
			t8 = text("9️⃣ Svelte Animations");
			t9 = space();
			section1 = element("section");
			h20 = element("h2");
			a9 = element("a");
			t10 = text("1️⃣ The Zen of Svelte");
			t11 = space();
			p0 = element("p");
			a10 = element("a");
			t12 = text("@mrgnw");
			t13 = text(" did a ton of research comparing Svelte with Python, which is apparent on the references used in his talk.");
			t14 = space();
			p1 = element("p");
			t15 = text("I believe the talk is inspired by\n");
			a11 = element("a");
			t16 = text("@feltcoop");
			t17 = text("'s ");
			a12 = element("a");
			t18 = text("\"Why Svelte\"");
			t19 = text(", where it says");
			t20 = space();
			blockquote0 = element("blockquote");
			p2 = element("p");
			t21 = text("\"Svelte is easy to learn. Its design philosophy shares much with ");
			a13 = element("a");
			t22 = text("The Zen of Python");
			t23 = text("\"");
			t24 = space();
			blockquote1 = element("blockquote");
			p3 = element("p");
			t25 = text("\"programming languages are how programmers express and communicate ideas — and the audience for those ideas is other programmers, not computers.\"");
			t26 = space();
			ul1 = element("ul");
			li9 = element("li");
			t27 = text("Guido van Rossum, King's Day Speech 2016 (");
			a14 = element("a");
			t28 = text("http://neopythonic.blogspot.com/2016/04/kings-day-speech.html");
			t29 = text(")");
			t30 = space();
			blockquote2 = element("blockquote");
			p4 = element("p");
			t31 = text("\"Frameworks are not tools for organising your code, they are tools for organising your mind\"");
			t32 = space();
			ul2 = element("ul");
			li10 = element("li");
			t33 = text("Rich Harris, You Gotta Love Frontend Code Camp 2019 ");
			a15 = element("a");
			t34 = text("https://www.youtube.com/watch?v=AdNJ3fydeao");
			t35 = space();
			blockquote3 = element("blockquote");
			p5 = element("p");
			t36 = text("People who's day job has nothing to do with software development but who need to use software to process their data, can use Python to make their data processing doing exactly what they want to happen");
			t37 = space();
			ul3 = element("ul");
			li11 = element("li");
			t38 = text("Guido van Rossum, Oxford Union 2019 ");
			a16 = element("a");
			t39 = text("https://www.youtube.com/watch?v=7kn7NtlV6g0");
			t40 = space();
			blockquote4 = element("blockquote");
			p6 = element("p");
			t41 = text("Because the best thing about jQuery was its inclusivitiy, jQuery said to people like me, with no discrenible programming skill, you too can be part of this thing (bringing creativity to the web)");
			t42 = space();
			ul4 = element("ul");
			li12 = element("li");
			t43 = text("Rich Harris, JSCamp 2019, \"The Return of 'Write Less, Do More'\" ");
			a17 = element("a");
			t44 = text("https://www.youtube.com/watch?v=BzX4aTRPzno");
			t45 = space();
			p7 = element("p");
			t46 = text("It works with what you already know, rather than replaces it with something new");
			t47 = space();
			ul5 = element("ul");
			li13 = element("li");
			t48 = text("if you can write HTML, you can write Svelte");
			t49 = space();
			li14 = element("li");
			t50 = text("with preprocessor, you can write Svelte component with Jade, or Markdown");
			t51 = space();
			p8 = element("p");
			strong0 = element("strong");
			t52 = text("Resources to learn Svelte");
			t53 = space();
			ul6 = element("ul");
			li15 = element("li");
			t54 = text("📺 Svelte Master Youtube channel ");
			a18 = element("a");
			t55 = text("https://www.youtube.com/channel/UCg6SQd5jnWo5Y70rZD9SQFA");
			t56 = space();
			li16 = element("li");
			t57 = text("🎮 Svelte Interactive Tutorial ");
			a19 = element("a");
			t58 = text("http://svelte.dev/tutorial");
			t59 = space();
			li17 = element("li");
			t60 = text("🛠 Starter Template - ");
			a20 = element("a");
			t61 = text("https://github.com/sveltejs/template");
			t62 = text(", ");
			a21 = element("a");
			t63 = text("https://github.com/sveltejs/sapper-template");
			t64 = space();
			li18 = element("li");
			t65 = text("🎪 MadeWithSvelte - ");
			a22 = element("a");
			t66 = text("https://madewithsvelte.com/");
			t67 = space();
			blockquote5 = element("blockquote");
			p9 = element("p");
			t68 = text("Svelte is Zen, because it's for people who wanna make things");
			t69 = space();
			section2 = element("section");
			h21 = element("h2");
			a23 = element("a");
			t70 = text("2️⃣ Prototyping Design with Real Data Models");
			t71 = space();
			p10 = element("p");
			a24 = element("a");
			t72 = text("@d3sandoval");
			t73 = text(" performed a live coding in the talk. He showed us how he used Svelte to quickly implement an interactive prototype based on a Figma design for user testing.");
			t74 = space();
			p11 = element("p");
			t75 = text("If you find him familiar, that's because he's the one who wrote the ");
			a25 = element("a");
			t76 = text("\"What's new in Svelte October 2020\"");
			t77 = space();
			p12 = element("p");
			t78 = text("Benefits of building interactive mockup with Svelte");
			t79 = space();
			ul7 = element("ul");
			li19 = element("li");
			t80 = text("Fast to get started and going");
			t81 = space();
			li20 = element("li");
			t82 = text("Allow user to explore different variations, rather than sticking to the golden path in the user interview");
			t83 = space();
			li21 = element("li");
			t84 = text("Faster iteration, faster to test assumptions");
			t85 = space();
			p13 = element("p");
			t86 = text("Things people asked in the chat:");
			t87 = space();
			ul8 = element("ul");
			li22 = element("li");
			t88 = text("Official Svelte VSCode Plugin ");
			a26 = element("a");
			t89 = text("svelte-vscode");
			t90 = space();
			li23 = element("li");
			t91 = text("the code ");
			a27 = element("a");
			t92 = text("https://github.com/d3sandoval/svelte-summit-example");
			t93 = space();
			blockquote6 = element("blockquote");
			p14 = element("p");
			t94 = text("\"Using a production-like data model in application that is quick to build, which may otherwise take longer in our design file, allow us to respond to feedback quickly in prototyping\"");
			t95 = space();
			section3 = element("section");
			h22 = element("h2");
			a28 = element("a");
			t96 = text("3️⃣ How does Svelte's crossfade function work?");
			t97 = space();
			p15 = element("p");
			a29 = element("a");
			t98 = text("@nicolodavis");
			t99 = space();
			ul9 = element("ul");
			li24 = element("li");
			t100 = text("1️⃣ what it is");
			t101 = space();
			li25 = element("li");
			t102 = text("2️⃣ how it works");
			t103 = space();
			li26 = element("li");
			t104 = text("3️⃣ real world example");
			t105 = space();
			p16 = element("p");
			picture0 = element("picture");
			source0 = element("source");
			source1 = element("source");
			img0 = element("img");
			t106 = space();
			p17 = element("p");
			t107 = text("If you describe how to move content imperatively");
			t108 = space();
			ul10 = element("ul");
			li27 = element("li");
			t109 = text("Copy the HTML from the source container");
			t110 = space();
			li28 = element("li");
			t111 = text("Paste it into the target container");
			t112 = space();
			li29 = element("li");
			t113 = text("Remove it from the source container");
			t114 = space();
			p18 = element("p");
			picture1 = element("picture");
			source2 = element("source");
			source3 = element("source");
			img1 = element("img");
			t115 = space();
			p19 = element("p");
			t116 = text("If you want to describe it declaratively in Svelte,");
			t117 = space();
			ul11 = element("ul");
			li30 = element("li");
			t118 = text("use ");
			code0 = element("code");
			t119 = text("{#if position === 'a'}");
			t120 = space();
			li31 = element("li");
			t121 = text("change ");
			code1 = element("code");
			t122 = text("position");
			t123 = space();
			p20 = element("p");
			t124 = text("Svelte transition allows you to specify how an element is transition in when it's created, and transition out when it is destroyed.");
			t125 = space();
			pre0 = element("pre");
			t126 = space();
			ul12 = element("ul");
			li32 = element("li");
			t127 = text("📝 crossfade coordinates the transition from 1 location to another");
			t128 = space();
			li33 = element("li");
			t129 = text("📝 element is destroyed in its old position and created in its new position");
			t130 = space();
			li34 = element("li");
			t131 = text("📝 both transitions are played simulatenously over each other");
			t132 = space();
			li35 = element("li");
			t133 = text("📝 fades out the 1st transition, fades in the 2nd transition");
			t134 = space();
			p21 = element("p");
			img2 = element("img");
			t135 = space();
			ul13 = element("ul");
			li36 = element("li");
			t136 = text("📝 call crossfade to get ");
			code2 = element("code");
			t137 = text("send");
			t138 = text(" and ");
			code3 = element("code");
			t139 = text("release");
			t140 = space();
			li37 = element("li");
			t141 = text("📝 using ");
			code4 = element("code");
			t142 = text("out:send");
			t143 = text(" and ");
			code5 = element("code");
			t144 = text("in:receive");
			t145 = space();
			li38 = element("li");
			t146 = text("📝 the key needs to be the same");
			t147 = space();
			pre1 = element("pre");
			t148 = space();
			p22 = element("p");
			t149 = text("See how @nicolodavis uses crossfade in a real-world application, ");
			a30 = element("a");
			t150 = text("@boardgamelabapp");
			t151 = space();
			a31 = element("a");
			t152 = text("https://boardgamelab.app/");
			t153 = text(".");
			t154 = space();
			p23 = element("p");
			img3 = element("img");
			t155 = space();
			section4 = element("section");
			h23 = element("h2");
			a32 = element("a");
			t156 = text("4️⃣ Zero config Svelte websites with Plenti");
			t157 = space();
			p24 = element("p");
			a33 = element("a");
			t158 = text("@jimafisk");
			t159 = text(" shared a static site generator, ");
			a34 = element("a");
			t160 = text("Plenti");
			t161 = text(".");
			t162 = space();
			p25 = element("p");
			strong1 = element("strong");
			t163 = text("Plenti");
			t164 = space();
			ul14 = element("ul");
			li39 = element("li");
			t165 = text("🎪 Static Site Generator");
			t166 = space();
			li40 = element("li");
			t167 = text("🏎 Go backend");
			t168 = space();
			li41 = element("li");
			t169 = text("🛠 Build code in Go, no webpack / rollup, inspired by snowpack, called gopack");
			t170 = space();
			li42 = element("li");
			t171 = text("⚡️ Reach to v8 engine directly to compile svelte components");
			t172 = space();
			li43 = element("li");
			t173 = text("✨ Does not depend on Node.js / npm");
			t174 = space();
			li44 = element("li");
			t175 = text("📖 JSON as data source");
			t176 = space();
			li45 = element("li");
			t177 = text("👓 Optimised for screen reader users");
			t178 = space();
			li46 = element("li");
			t179 = text("🍺 Hydrates app into single page application + client-side routing + automatically connects to JSON data source");
			t180 = space();
			p26 = element("p");
			strong2 = element("strong");
			t181 = text("Install plenti");
			t182 = space();
			ul15 = element("ul");
			li47 = element("li");
			t183 = text("⬇️ Download the binary");
			t184 = space();
			li48 = element("li");
			t185 = text("📦 Install using package manager");
			t186 = space();
			pre2 = element("pre");
			t187 = space();
			p27 = element("p");
			strong3 = element("strong");
			t188 = text("Plenti command");
			t189 = space();
			pre3 = element("pre");
			t190 = space();
			blockquote7 = element("blockquote");
			p28 = element("p");
			t191 = text("\"You be so productive that you forget to check Twitter\"");
			t192 = space();
			section5 = element("section");
			h24 = element("h2");
			a35 = element("a");
			t193 = text("5️⃣ How you setup data visualization with Svelte");
			t194 = space();
			p29 = element("p");
			a36 = element("a");
			t195 = text("@h_i_g_s_c_h");
			t196 = text(" showed us how to use svelte to defend democracy. 🏹🛡🐉");
			t197 = space();
			p30 = element("p");
			t198 = text("Check out his talk if you want to learn");
			t199 = space();
			ul16 = element("ul");
			li49 = element("li");
			t200 = text("✨ how to produce great nice visualisation with svelte");
			t201 = space();
			li50 = element("li");
			t202 = text("🎨 how to use all the nice features that svelte comes with to produce cool visualisation");
			t203 = space();
			p31 = element("p");
			t204 = text("3 things to love svelte + data visualisation");
			t205 = space();
			p32 = element("p");
			strong4 = element("strong");
			t206 = text("1️⃣ modularisation");
			t207 = space();
			ul17 = element("ul");
			li51 = element("li");
			t208 = text("organise code in components");
			t209 = space();
			p33 = element("p");
			img4 = element("img");
			t210 = space();
			p34 = element("p");
			strong5 = element("strong");
			t211 = text("2️⃣ transitions");
			t212 = space();
			ul18 = element("ul");
			li52 = element("li");
			t213 = text("✨ easy to use");
			t214 = space();
			li53 = element("li");
			t215 = text("🎭 built-in transitions, such as ");
			code6 = element("code");
			t216 = text("fade");
			t217 = text(", ");
			code7 = element("code");
			t218 = text("draw");
			t219 = space();
			pre4 = element("pre");
			t220 = space();
			p35 = element("p");
			img5 = element("img");
			t221 = space();
			p36 = element("p");
			strong6 = element("strong");
			t222 = text("3️⃣ actions");
			t223 = space();
			ul19 = element("ul");
			li54 = element("li");
			t224 = text("allow reusable logics");
			t225 = space();
			li55 = element("li");
			t226 = text("can reuse across projects");
			t227 = space();
			pre5 = element("pre");
			t228 = space();
			p37 = element("p");
			t229 = text("Resources");
			t230 = space();
			ul20 = element("ul");
			li56 = element("li");
			t231 = text("🔗 ");
			a37 = element("a");
			t232 = text("https://github.com/DFRLab/interference2020");
			t233 = space();
			li57 = element("li");
			t234 = text("🔗 ");
			a38 = element("a");
			t235 = text("https://interference2020.org");
			t236 = space();
			li58 = element("li");
			t237 = text("🔗 ");
			a39 = element("a");
			t238 = text("https://twitter.com/h_i_g_s_c_h");
			t239 = space();
			li59 = element("li");
			t240 = text("🔗 ");
			a40 = element("a");
			t241 = text("https://www.higsch.com/");
			t242 = space();
			p38 = element("p");
			a41 = element("a");
			t243 = text("Is that \"Svelte\" in German accent?");
			t244 = space();
			section6 = element("section");
			h25 = element("h2");
			a42 = element("a");
			t245 = text("6️⃣ Svelte at the Edge: Powering Svelte Apps with Cloudflare Workers");
			t246 = space();
			p39 = element("p");
			a43 = element("a");
			t247 = text("@lukeed05");
			t248 = text(" shared with us how to deploying server-side rendering + Svelte + Cloudflare Workers at global scale 🌎");
			t249 = space();
			p40 = element("p");
			t250 = text("Types of workers");
			t251 = space();
			ul25 = element("ul");
			li61 = element("li");
			t252 = text("Web Workers ");
			ul21 = element("ul");
			li60 = element("li");
			t253 = text("most common, general purpose, execute tasks off main thread");
			t254 = space();
			li63 = element("li");
			t255 = text("Worklets");
			ul22 = element("ul");
			li62 = element("li");
			t256 = text("very lightweight, access to low-level render processes");
			t257 = space();
			li66 = element("li");
			t258 = text("Service Workers");
			ul23 = element("ul");
			li64 = element("li");
			t259 = text("proxy between client and network / cache");
			t260 = space();
			li65 = element("li");
			t261 = text("may intercept HTTP requests entirely");
			t262 = space();
			li69 = element("li");
			t263 = text("Cloudflare Workers");
			ul24 = element("ul");
			li67 = element("li");
			t264 = text("works similarly as Service Workers, as a proxy between client and network / cache");
			t265 = space();
			li68 = element("li");
			t266 = text("difference is its physical location");
			t267 = space();
			p41 = element("p");
			t268 = text("Workers KV");
			t269 = space();
			ul26 = element("ul");
			li70 = element("li");
			t270 = text("key value store");
			t271 = space();
			li71 = element("li");
			t272 = text("available in every network location");
			t273 = space();
			li72 = element("li");
			t274 = text("extra persistent layer the worker can write into and read from anywhere");
			t275 = space();
			p42 = element("p");
			t276 = text("Worker Sites");
			t277 = space();
			ul29 = element("ul");
			li74 = element("li");
			t278 = text("upload the built assets into Workers KV");
			ul27 = element("ul");
			li73 = element("li");
			t279 = text("filepath as key, file content as value");
			t280 = space();
			li77 = element("li");
			t281 = text("handle request by ");
			ul28 = element("ul");
			li75 = element("li");
			t282 = text("serve from cache");
			t283 = space();
			li76 = element("li");
			t284 = text("cache miss, respond with content in Workers KV");
			t285 = space();
			p43 = element("p");
			t286 = text("To build a svelte app for Cloudflare, make sure");
			t287 = space();
			ul31 = element("ul");
			li78 = element("li");
			code8 = element("code");
			t288 = text("hydrate: true");
			t289 = text(", so it hydrates on the browser");
			t290 = space();
			li79 = element("li");
			t291 = text("no assumptions on being within the browser context");
			t292 = space();
			li82 = element("li");
			t293 = text("build the site twice");
			ul30 = element("ul");
			li80 = element("li");
			t294 = text("1 for the DOM output, 1 for SSR output");
			t295 = space();
			li81 = element("li");
			code9 = element("code");
			t296 = text("generate: 'dom' | 'ssr'");
			t297 = space();
			p44 = element("p");
			a44 = element("a");
			t298 = text("Demo code");
			t299 = space();
			p45 = element("p");
			t300 = text("Tools");
			t301 = space();
			ul32 = element("ul");
			li83 = element("li");
			a45 = element("a");
			t302 = text("https://developers.cloudflare.com/workers/cli-wrangler");
			t303 = space();
			li84 = element("li");
			a46 = element("a");
			t304 = text("https://github.com/lukeed/cfw");
			t305 = space();
			li85 = element("li");
			a47 = element("a");
			t306 = text("https://github.com/lukeed/freshie");
			t307 = space();
			p46 = element("p");
			a48 = element("a");
			t308 = text("cfw");
			t309 = text("\nSuite of utilities for building and deploying Cloudflare Workers");
			t310 = space();
			p47 = element("p");
			a49 = element("a");
			t311 = text("freshie");
			t312 = space();
			p48 = element("p");
			t313 = text("CLI to build universal applications, supporting different backends (Node.js, Cloudflare Workers) X different frontends (Svelte, Vue, Preact)");
			t314 = space();
			section7 = element("section");
			h26 = element("h2");
			a50 = element("a");
			t315 = text("7️⃣ Svelte à la Mode");
			t316 = space();
			p49 = element("p");
			t317 = text("A fun, cheeky talk by ");
			a51 = element("a");
			t318 = text("@ronvoluted");
			t319 = text(", where he draws comparison of web + svelte to Pie à la Mode");
			t320 = space();
			p50 = element("p");
			t321 = text("The pie 🥧, represent the web, the juicy things you can do with the web, it's a wondrous platform and it's prevalent. 🤤");
			t322 = space();
			p51 = element("p");
			t323 = text("Svelte helps us embracing these qualities by sweetening the deal. That's the ice cream on top. 🍨");
			t324 = space();
			p52 = element("p");
			t325 = text("@ronvoluted reminded us how easy to create a @sveltejs app");
			t326 = space();
			ul33 = element("ul");
			li86 = element("li");
			t327 = text("1️⃣ copy HTML markup from source elements panel of a website you like");
			t328 = space();
			li87 = element("li");
			t329 = text("2️⃣ paste it in svelte.dev/repl");
			t330 = space();
			li88 = element("li");
			t331 = text("3️⃣ copy + paste in the styles from the styles panel");
			t332 = space();
			li89 = element("li");
			t333 = text("4️⃣ add ");
			code10 = element("code");
			t334 = text("<script>");
			t335 = text(" tag to sprinkle some logic");
			t336 = space();
			p53 = element("p");
			t337 = text("Resources to check what's available in the web platform");
			t338 = space();
			ul34 = element("ul");
			li90 = element("li");
			t339 = text("🔗 ");
			a52 = element("a");
			t340 = text("https://developer.mozilla.org/en-US/docs/Web/API");
			t341 = space();
			li91 = element("li");
			t342 = text("🔗 ");
			a53 = element("a");
			t343 = text("http://developers.google.com/web/updates");
			t344 = space();
			li92 = element("li");
			t345 = text("🔗 ");
			a54 = element("a");
			t346 = text("https://whatwebcando.today/");
			t347 = space();
			p54 = element("p");
			t348 = text("Check out these cool cats who made the web interactions that were showcased:");
			t349 = space();
			ul35 = element("ul");
			li93 = element("li");
			t350 = text("A Century of Surface Temperature Anomalies by Aodhan Sweeney ");
			a55 = element("a");
			t351 = text("http://students.washington.edu/aodhan/webgl_globe.html");
			t352 = space();
			li94 = element("li");
			t353 = text("Dr Who Dalek ring modulator by @BBCRD ");
			a56 = element("a");
			t354 = text("https://webaudio.prototyping.bbc.co.uk");
			t355 = space();
			li95 = element("li");
			t356 = text("Creepy Mouth SVG by @shepazu ");
			a57 = element("a");
			t357 = text("http://svg-whiz.com/svg/linguistics/theCreepyMouth.svg");
			t358 = space();
			p55 = element("p");
			t359 = text("Behind the scenes of his floating head in the talk Rolling on the floor laughing");
			t360 = space();
			p56 = element("p");
			a58 = element("a");
			t361 = text("https://twitter.com/SvelteSociety/status/1318196128769134592?s=20");
			t362 = space();
			section8 = element("section");
			h27 = element("h2");
			a59 = element("a");
			t363 = text("8️⃣ Introduction to Svite");
			t364 = space();
			p57 = element("p");
			t365 = text("Dominik G introduce us to Svite, a Svelte integration for vite.");
			t366 = space();
			p58 = element("p");
			t367 = text("He walked us through the 3 basic commands of svite");
			t368 = space();
			pre6 = element("pre");
			t369 = space();
			p59 = element("p");
			t370 = text("Svite supports hot-module reloading, and this is how fast it is");
			t371 = space();
			p60 = element("p");
			img6 = element("img");
			t372 = space();
			p61 = element("p");
			t373 = text("🛣 Roadmap");
			t374 = space();
			ul36 = element("ul");
			li96 = element("li");
			t375 = text("prerender HTML after build");
			t376 = space();
			li97 = element("li");
			t377 = text("improved typescript support");
			t378 = space();
			li98 = element("li");
			t379 = text("template for library development");
			t380 = space();
			li99 = element("li");
			t381 = text("website and more documentation");
			t382 = space();
			li100 = element("li");
			t383 = text("or your next great idea");
			t384 = space();
			p62 = element("p");
			t385 = text("🔗 ");
			a60 = element("a");
			t386 = text("https://github.com/dominikg/svite");
			t387 = space();
			section9 = element("section");
			h28 = element("h2");
			a61 = element("a");
			t388 = text("9️⃣ Svelte Animations");
			t389 = space();
			p63 = element("p");
			a62 = element("a");
			t390 = text("@mark_volkmann");
			t391 = text(" talked about transitions in svelte");
			t392 = space();
			p64 = element("p");
			t393 = text("2 kinds of animations");
			t394 = space();
			ul39 = element("ul");
			li102 = element("li");
			t395 = text("1️⃣ when an element is added or removed ");
			ul37 = element("ul");
			li101 = element("li");
			t396 = text("eg: fade in when added, slide out when removed");
			t397 = space();
			li104 = element("li");
			t398 = text("2️⃣ when a value changes");
			ul38 = element("ul");
			li103 = element("li");
			t399 = text("eg: gradually change from current value to new value");
			t400 = space();
			p65 = element("p");
			t401 = text("Easing functions");
			t402 = space();
			ul41 = element("ul");
			li105 = element("li");
			t403 = text("animations can proceed at varying rates over duration");
			t404 = space();
			li106 = element("li");
			t405 = text("Ease visualiser ");
			a63 = element("a");
			t406 = text("https://svelte.dev/examples#easing");
			t407 = space();
			li110 = element("li");
			t408 = text("easing names end with ");
			code11 = element("code");
			t409 = text("In");
			t410 = text(", ");
			code12 = element("code");
			t411 = text("Out");
			t412 = text(", ");
			code13 = element("code");
			t413 = text("InOut");
			ul40 = element("ul");
			li107 = element("li");
			code14 = element("code");
			t414 = text("In");
			t415 = text(" affects the beginning of a transition");
			t416 = space();
			li108 = element("li");
			code15 = element("code");
			t417 = text("Out");
			t418 = text(" affects the beginning of a transition");
			t419 = space();
			li109 = element("li");
			code16 = element("code");
			t420 = text("InOut");
			t421 = text(" affects the beginning and ending of a transition");
			t422 = space();
			p66 = element("p");
			t423 = text("animate:flip");
			t424 = space();
			ul42 = element("ul");
			li111 = element("li");
			t425 = text("moves element in an ");
			code17 = element("code");
			t426 = text("{#each}");
			t427 = text(" block to the target location when it changes");
			t428 = space();
			li112 = element("li");
			t429 = text("like other transitions, accept custom ");
			code18 = element("code");
			t430 = text("delay");
			t431 = text(", ");
			code19 = element("code");
			t432 = text("duration");
			t433 = text(", ");
			code20 = element("code");
			t434 = text("easing");
			t435 = space();
			p67 = element("p");
			img7 = element("img");
			t436 = space();
			p68 = element("p");
			a64 = element("a");
			t437 = text("https://svelte.dev/repl/b4cceba5e8a14e379e1b07f47b792eef?version=3.26.0");
			t438 = space();
			p69 = element("p");
			code21 = element("code");
			t439 = text("svelte/motion");
			t440 = space();
			ul43 = element("ul");
			li113 = element("li");
			code22 = element("code");
			t441 = text("spring");
			t442 = text(" and ");
			code23 = element("code");
			t443 = text("tweened");
			t444 = text(" allow you to create writable stores whose values animate from old to new values");
			t445 = space();
			pre7 = element("pre");
			t446 = space();
			p70 = element("p");
			img8 = element("img");
			t447 = space();
			p71 = element("p");
			a65 = element("a");
			t448 = text("https://svelte.dev/repl/2625cd905ee24bc0ba462ea6ab61284f?version=3.26.0");
			t449 = space();
			ul44 = element("ul");
			li114 = element("li");
			t450 = text("custom interpolation function");
			t451 = space();
			pre8 = element("pre");
			t452 = space();
			p72 = element("p");
			a66 = element("a");
			t453 = text("https://svelte.dev/repl/073c71dbdd9c4250b2ad5c9343e2e053?version=3.26.0");
			t454 = space();
			p73 = element("p");
			t455 = text("transitions");
			t456 = space();
			ul45 = element("ul");
			li115 = element("li");
			code24 = element("code");
			t457 = text("blur");
			t458 = text(", ");
			code25 = element("code");
			t459 = text("draw");
			t460 = text(", ");
			code26 = element("code");
			t461 = text("fade");
			t462 = text(", ");
			code27 = element("code");
			t463 = text("fly");
			t464 = text(", ");
			code28 = element("code");
			t465 = text("scale");
			t466 = text(", ");
			code29 = element("code");
			t467 = text("slide");
			t468 = text(", ");
			code30 = element("code");
			t469 = text("crossfade");
			t470 = space();
			li116 = element("li");
			t471 = text("using directives, ");
			code31 = element("code");
			t472 = text("in:");
			t473 = text(", ");
			code32 = element("code");
			t474 = text("out:");
			t475 = text(", ");
			code33 = element("code");
			t476 = text("transition:");
			t477 = space();
			li117 = element("li");
			t478 = text("apply to HTML element");
			t479 = space();
			p74 = element("p");
			img9 = element("img");
			t480 = space();
			p75 = element("p");
			code34 = element("code");
			t481 = text("transition:draw");
			t482 = space();
			ul46 = element("ul");
			li118 = element("li");
			t483 = text("for SVG ");
			code35 = element("code");
			t484 = text("path");
			t485 = text(" element");
			t486 = space();
			p76 = element("p");
			img10 = element("img");
			t487 = space();
			p77 = element("p");
			a67 = element("a");
			t488 = text("https://svelte.dev/repl/149a5c35040343daa9477e0d54412398?version=3.26.0");
			t489 = space();
			p78 = element("p");
			code36 = element("code");
			t490 = text("crossfade");
			t491 = text(" transition");
			t492 = space();
			ul47 = element("ul");
			li119 = element("li");
			t493 = text("creates ");
			code37 = element("code");
			t494 = text("send");
			t495 = text(" and ");
			code38 = element("code");
			t496 = text("receive");
			t497 = text(" transitions, used to coordinate movement of an element from one parent to another");
			t498 = space();
			p79 = element("p");
			img11 = element("img");
			t499 = space();
			a68 = element("a");
			t500 = text("https://svelte.dev/repl/5fc4b5dd5dec49d2be3fa160693372ce?version=3.26.0");
			t501 = space();
			p80 = element("p");
			t502 = text("Custom transitions");
			t503 = space();
			ul49 = element("ul");
			li120 = element("li");
			t504 = text("a function that follows a few basic rules");
			t505 = space();
			li121 = element("li");
			t506 = text("take 2 arguments, the DOM node and the options");
			t507 = space();
			li124 = element("li");
			t508 = text("return an object whose properties include");
			ul48 = element("ul");
			li122 = element("li");
			t509 = text("transition options");
			t510 = space();
			li123 = element("li");
			t511 = text("css method, which passed a time value between 0 and 1, and must return a string containing CSS properties to be applied to the DOM node for the time value");
			t512 = space();
			li125 = element("li");
			a69 = element("a");
			t513 = text("https://svelte.dev/repl/082e308f9fe44bcb98621dab346c2e85?version=3.26.0");
			t514 = space();
			pre9 = element("pre");
			t515 = space();
			p81 = element("p");
			t516 = text("Transition events");
			t517 = space();
			ul50 = element("ul");
			li126 = element("li");
			code39 = element("code");
			t518 = text("introstart");
			t519 = text(" when an \"in\" transition begins");
			t520 = space();
			li127 = element("li");
			code40 = element("code");
			t521 = text("introend");
			t522 = text(" when an \"in\" transition ends");
			t523 = space();
			li128 = element("li");
			code41 = element("code");
			t524 = text("outrostart");
			t525 = text(" when an \"out\" transition begins");
			t526 = space();
			li129 = element("li");
			code42 = element("code");
			t527 = text("outroend");
			t528 = text(" when an \"out\" transition ends");
			t529 = space();
			p82 = element("p");
			t530 = text("Resources");
			t531 = space();
			ul51 = element("ul");
			li130 = element("li");
			t532 = text("Slides ");
			a70 = element("a");
			t533 = text("https://github.com/mvolkmann/talks/blob/master/svelte-animations.key.pdf");
			t534 = space();
			li131 = element("li");
			t535 = text("Mark Volkmann's book, Svelte and Sapper in Action ");
			a71 = element("a");
			t536 = text("https://www.manning.com/books/svelte-and-sapper-in-action");
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
			t0 = claim_text(a0_nodes, "1️⃣ The Zen of Svelte");
			a0_nodes.forEach(detach);
			li0_nodes.forEach(detach);
			li1 = claim_element(ul0_nodes, "LI", {});
			var li1_nodes = children(li1);
			a1 = claim_element(li1_nodes, "A", { href: true });
			var a1_nodes = children(a1);
			t1 = claim_text(a1_nodes, "2️⃣ Prototyping Design with Real Data Models");
			a1_nodes.forEach(detach);
			li1_nodes.forEach(detach);
			li2 = claim_element(ul0_nodes, "LI", {});
			var li2_nodes = children(li2);
			a2 = claim_element(li2_nodes, "A", { href: true });
			var a2_nodes = children(a2);
			t2 = claim_text(a2_nodes, "3️⃣ How does Svelte's crossfade function work?");
			a2_nodes.forEach(detach);
			li2_nodes.forEach(detach);
			li3 = claim_element(ul0_nodes, "LI", {});
			var li3_nodes = children(li3);
			a3 = claim_element(li3_nodes, "A", { href: true });
			var a3_nodes = children(a3);
			t3 = claim_text(a3_nodes, "4️⃣ Zero config Svelte websites with Plenti");
			a3_nodes.forEach(detach);
			li3_nodes.forEach(detach);
			li4 = claim_element(ul0_nodes, "LI", {});
			var li4_nodes = children(li4);
			a4 = claim_element(li4_nodes, "A", { href: true });
			var a4_nodes = children(a4);
			t4 = claim_text(a4_nodes, "5️⃣ How you setup data visualization with Svelte");
			a4_nodes.forEach(detach);
			li4_nodes.forEach(detach);
			li5 = claim_element(ul0_nodes, "LI", {});
			var li5_nodes = children(li5);
			a5 = claim_element(li5_nodes, "A", { href: true });
			var a5_nodes = children(a5);
			t5 = claim_text(a5_nodes, "6️⃣ Svelte at the Edge: Powering Svelte Apps with Cloudflare Workers");
			a5_nodes.forEach(detach);
			li5_nodes.forEach(detach);
			li6 = claim_element(ul0_nodes, "LI", {});
			var li6_nodes = children(li6);
			a6 = claim_element(li6_nodes, "A", { href: true });
			var a6_nodes = children(a6);
			t6 = claim_text(a6_nodes, "7️⃣ Svelte à la Mode");
			a6_nodes.forEach(detach);
			li6_nodes.forEach(detach);
			li7 = claim_element(ul0_nodes, "LI", {});
			var li7_nodes = children(li7);
			a7 = claim_element(li7_nodes, "A", { href: true });
			var a7_nodes = children(a7);
			t7 = claim_text(a7_nodes, "8️⃣ Introduction to Svite");
			a7_nodes.forEach(detach);
			li7_nodes.forEach(detach);
			li8 = claim_element(ul0_nodes, "LI", {});
			var li8_nodes = children(li8);
			a8 = claim_element(li8_nodes, "A", { href: true });
			var a8_nodes = children(a8);
			t8 = claim_text(a8_nodes, "9️⃣ Svelte Animations");
			a8_nodes.forEach(detach);
			li8_nodes.forEach(detach);
			ul0_nodes.forEach(detach);
			section0_nodes.forEach(detach);
			t9 = claim_space(nodes);
			section1 = claim_element(nodes, "SECTION", {});
			var section1_nodes = children(section1);
			h20 = claim_element(section1_nodes, "H2", {});
			var h20_nodes = children(h20);
			a9 = claim_element(h20_nodes, "A", { href: true, id: true });
			var a9_nodes = children(a9);
			t10 = claim_text(a9_nodes, "1️⃣ The Zen of Svelte");
			a9_nodes.forEach(detach);
			h20_nodes.forEach(detach);
			t11 = claim_space(section1_nodes);
			p0 = claim_element(section1_nodes, "P", {});
			var p0_nodes = children(p0);
			a10 = claim_element(p0_nodes, "A", { href: true, rel: true });
			var a10_nodes = children(a10);
			t12 = claim_text(a10_nodes, "@mrgnw");
			a10_nodes.forEach(detach);
			t13 = claim_text(p0_nodes, " did a ton of research comparing Svelte with Python, which is apparent on the references used in his talk.");
			p0_nodes.forEach(detach);
			t14 = claim_space(section1_nodes);
			p1 = claim_element(section1_nodes, "P", {});
			var p1_nodes = children(p1);
			t15 = claim_text(p1_nodes, "I believe the talk is inspired by\n");
			a11 = claim_element(p1_nodes, "A", { href: true, rel: true });
			var a11_nodes = children(a11);
			t16 = claim_text(a11_nodes, "@feltcoop");
			a11_nodes.forEach(detach);
			t17 = claim_text(p1_nodes, "'s ");
			a12 = claim_element(p1_nodes, "A", { href: true, rel: true });
			var a12_nodes = children(a12);
			t18 = claim_text(a12_nodes, "\"Why Svelte\"");
			a12_nodes.forEach(detach);
			t19 = claim_text(p1_nodes, ", where it says");
			p1_nodes.forEach(detach);
			t20 = claim_space(section1_nodes);
			blockquote0 = claim_element(section1_nodes, "BLOCKQUOTE", {});
			var blockquote0_nodes = children(blockquote0);
			p2 = claim_element(blockquote0_nodes, "P", {});
			var p2_nodes = children(p2);
			t21 = claim_text(p2_nodes, "\"Svelte is easy to learn. Its design philosophy shares much with ");
			a13 = claim_element(p2_nodes, "A", { href: true, rel: true });
			var a13_nodes = children(a13);
			t22 = claim_text(a13_nodes, "The Zen of Python");
			a13_nodes.forEach(detach);
			t23 = claim_text(p2_nodes, "\"");
			p2_nodes.forEach(detach);
			blockquote0_nodes.forEach(detach);
			t24 = claim_space(section1_nodes);
			blockquote1 = claim_element(section1_nodes, "BLOCKQUOTE", {});
			var blockquote1_nodes = children(blockquote1);
			p3 = claim_element(blockquote1_nodes, "P", {});
			var p3_nodes = children(p3);
			t25 = claim_text(p3_nodes, "\"programming languages are how programmers express and communicate ideas — and the audience for those ideas is other programmers, not computers.\"");
			p3_nodes.forEach(detach);
			t26 = claim_space(blockquote1_nodes);
			ul1 = claim_element(blockquote1_nodes, "UL", {});
			var ul1_nodes = children(ul1);
			li9 = claim_element(ul1_nodes, "LI", {});
			var li9_nodes = children(li9);
			t27 = claim_text(li9_nodes, "Guido van Rossum, King's Day Speech 2016 (");
			a14 = claim_element(li9_nodes, "A", { href: true, rel: true });
			var a14_nodes = children(a14);
			t28 = claim_text(a14_nodes, "http://neopythonic.blogspot.com/2016/04/kings-day-speech.html");
			a14_nodes.forEach(detach);
			t29 = claim_text(li9_nodes, ")");
			li9_nodes.forEach(detach);
			ul1_nodes.forEach(detach);
			blockquote1_nodes.forEach(detach);
			t30 = claim_space(section1_nodes);
			blockquote2 = claim_element(section1_nodes, "BLOCKQUOTE", {});
			var blockquote2_nodes = children(blockquote2);
			p4 = claim_element(blockquote2_nodes, "P", {});
			var p4_nodes = children(p4);
			t31 = claim_text(p4_nodes, "\"Frameworks are not tools for organising your code, they are tools for organising your mind\"");
			p4_nodes.forEach(detach);
			t32 = claim_space(blockquote2_nodes);
			ul2 = claim_element(blockquote2_nodes, "UL", {});
			var ul2_nodes = children(ul2);
			li10 = claim_element(ul2_nodes, "LI", {});
			var li10_nodes = children(li10);
			t33 = claim_text(li10_nodes, "Rich Harris, You Gotta Love Frontend Code Camp 2019 ");
			a15 = claim_element(li10_nodes, "A", { href: true, rel: true });
			var a15_nodes = children(a15);
			t34 = claim_text(a15_nodes, "https://www.youtube.com/watch?v=AdNJ3fydeao");
			a15_nodes.forEach(detach);
			li10_nodes.forEach(detach);
			ul2_nodes.forEach(detach);
			blockquote2_nodes.forEach(detach);
			t35 = claim_space(section1_nodes);
			blockquote3 = claim_element(section1_nodes, "BLOCKQUOTE", {});
			var blockquote3_nodes = children(blockquote3);
			p5 = claim_element(blockquote3_nodes, "P", {});
			var p5_nodes = children(p5);
			t36 = claim_text(p5_nodes, "People who's day job has nothing to do with software development but who need to use software to process their data, can use Python to make their data processing doing exactly what they want to happen");
			p5_nodes.forEach(detach);
			t37 = claim_space(blockquote3_nodes);
			ul3 = claim_element(blockquote3_nodes, "UL", {});
			var ul3_nodes = children(ul3);
			li11 = claim_element(ul3_nodes, "LI", {});
			var li11_nodes = children(li11);
			t38 = claim_text(li11_nodes, "Guido van Rossum, Oxford Union 2019 ");
			a16 = claim_element(li11_nodes, "A", { href: true, rel: true });
			var a16_nodes = children(a16);
			t39 = claim_text(a16_nodes, "https://www.youtube.com/watch?v=7kn7NtlV6g0");
			a16_nodes.forEach(detach);
			li11_nodes.forEach(detach);
			ul3_nodes.forEach(detach);
			blockquote3_nodes.forEach(detach);
			t40 = claim_space(section1_nodes);
			blockquote4 = claim_element(section1_nodes, "BLOCKQUOTE", {});
			var blockquote4_nodes = children(blockquote4);
			p6 = claim_element(blockquote4_nodes, "P", {});
			var p6_nodes = children(p6);
			t41 = claim_text(p6_nodes, "Because the best thing about jQuery was its inclusivitiy, jQuery said to people like me, with no discrenible programming skill, you too can be part of this thing (bringing creativity to the web)");
			p6_nodes.forEach(detach);
			blockquote4_nodes.forEach(detach);
			t42 = claim_space(section1_nodes);
			ul4 = claim_element(section1_nodes, "UL", {});
			var ul4_nodes = children(ul4);
			li12 = claim_element(ul4_nodes, "LI", {});
			var li12_nodes = children(li12);
			t43 = claim_text(li12_nodes, "Rich Harris, JSCamp 2019, \"The Return of 'Write Less, Do More'\" ");
			a17 = claim_element(li12_nodes, "A", { href: true, rel: true });
			var a17_nodes = children(a17);
			t44 = claim_text(a17_nodes, "https://www.youtube.com/watch?v=BzX4aTRPzno");
			a17_nodes.forEach(detach);
			li12_nodes.forEach(detach);
			ul4_nodes.forEach(detach);
			t45 = claim_space(section1_nodes);
			p7 = claim_element(section1_nodes, "P", {});
			var p7_nodes = children(p7);
			t46 = claim_text(p7_nodes, "It works with what you already know, rather than replaces it with something new");
			p7_nodes.forEach(detach);
			t47 = claim_space(section1_nodes);
			ul5 = claim_element(section1_nodes, "UL", {});
			var ul5_nodes = children(ul5);
			li13 = claim_element(ul5_nodes, "LI", {});
			var li13_nodes = children(li13);
			t48 = claim_text(li13_nodes, "if you can write HTML, you can write Svelte");
			li13_nodes.forEach(detach);
			t49 = claim_space(ul5_nodes);
			li14 = claim_element(ul5_nodes, "LI", {});
			var li14_nodes = children(li14);
			t50 = claim_text(li14_nodes, "with preprocessor, you can write Svelte component with Jade, or Markdown");
			li14_nodes.forEach(detach);
			ul5_nodes.forEach(detach);
			t51 = claim_space(section1_nodes);
			p8 = claim_element(section1_nodes, "P", {});
			var p8_nodes = children(p8);
			strong0 = claim_element(p8_nodes, "STRONG", {});
			var strong0_nodes = children(strong0);
			t52 = claim_text(strong0_nodes, "Resources to learn Svelte");
			strong0_nodes.forEach(detach);
			p8_nodes.forEach(detach);
			t53 = claim_space(section1_nodes);
			ul6 = claim_element(section1_nodes, "UL", {});
			var ul6_nodes = children(ul6);
			li15 = claim_element(ul6_nodes, "LI", {});
			var li15_nodes = children(li15);
			t54 = claim_text(li15_nodes, "📺 Svelte Master Youtube channel ");
			a18 = claim_element(li15_nodes, "A", { href: true, rel: true });
			var a18_nodes = children(a18);
			t55 = claim_text(a18_nodes, "https://www.youtube.com/channel/UCg6SQd5jnWo5Y70rZD9SQFA");
			a18_nodes.forEach(detach);
			li15_nodes.forEach(detach);
			t56 = claim_space(ul6_nodes);
			li16 = claim_element(ul6_nodes, "LI", {});
			var li16_nodes = children(li16);
			t57 = claim_text(li16_nodes, "🎮 Svelte Interactive Tutorial ");
			a19 = claim_element(li16_nodes, "A", { href: true, rel: true });
			var a19_nodes = children(a19);
			t58 = claim_text(a19_nodes, "http://svelte.dev/tutorial");
			a19_nodes.forEach(detach);
			li16_nodes.forEach(detach);
			t59 = claim_space(ul6_nodes);
			li17 = claim_element(ul6_nodes, "LI", {});
			var li17_nodes = children(li17);
			t60 = claim_text(li17_nodes, "🛠 Starter Template - ");
			a20 = claim_element(li17_nodes, "A", { href: true, rel: true });
			var a20_nodes = children(a20);
			t61 = claim_text(a20_nodes, "https://github.com/sveltejs/template");
			a20_nodes.forEach(detach);
			t62 = claim_text(li17_nodes, ", ");
			a21 = claim_element(li17_nodes, "A", { href: true, rel: true });
			var a21_nodes = children(a21);
			t63 = claim_text(a21_nodes, "https://github.com/sveltejs/sapper-template");
			a21_nodes.forEach(detach);
			li17_nodes.forEach(detach);
			t64 = claim_space(ul6_nodes);
			li18 = claim_element(ul6_nodes, "LI", {});
			var li18_nodes = children(li18);
			t65 = claim_text(li18_nodes, "🎪 MadeWithSvelte - ");
			a22 = claim_element(li18_nodes, "A", { href: true, rel: true });
			var a22_nodes = children(a22);
			t66 = claim_text(a22_nodes, "https://madewithsvelte.com/");
			a22_nodes.forEach(detach);
			li18_nodes.forEach(detach);
			ul6_nodes.forEach(detach);
			t67 = claim_space(section1_nodes);
			blockquote5 = claim_element(section1_nodes, "BLOCKQUOTE", {});
			var blockquote5_nodes = children(blockquote5);
			p9 = claim_element(blockquote5_nodes, "P", {});
			var p9_nodes = children(p9);
			t68 = claim_text(p9_nodes, "Svelte is Zen, because it's for people who wanna make things");
			p9_nodes.forEach(detach);
			blockquote5_nodes.forEach(detach);
			section1_nodes.forEach(detach);
			t69 = claim_space(nodes);
			section2 = claim_element(nodes, "SECTION", {});
			var section2_nodes = children(section2);
			h21 = claim_element(section2_nodes, "H2", {});
			var h21_nodes = children(h21);
			a23 = claim_element(h21_nodes, "A", { href: true, id: true });
			var a23_nodes = children(a23);
			t70 = claim_text(a23_nodes, "2️⃣ Prototyping Design with Real Data Models");
			a23_nodes.forEach(detach);
			h21_nodes.forEach(detach);
			t71 = claim_space(section2_nodes);
			p10 = claim_element(section2_nodes, "P", {});
			var p10_nodes = children(p10);
			a24 = claim_element(p10_nodes, "A", { href: true, rel: true });
			var a24_nodes = children(a24);
			t72 = claim_text(a24_nodes, "@d3sandoval");
			a24_nodes.forEach(detach);
			t73 = claim_text(p10_nodes, " performed a live coding in the talk. He showed us how he used Svelte to quickly implement an interactive prototype based on a Figma design for user testing.");
			p10_nodes.forEach(detach);
			t74 = claim_space(section2_nodes);
			p11 = claim_element(section2_nodes, "P", {});
			var p11_nodes = children(p11);
			t75 = claim_text(p11_nodes, "If you find him familiar, that's because he's the one who wrote the ");
			a25 = claim_element(p11_nodes, "A", { href: true, rel: true });
			var a25_nodes = children(a25);
			t76 = claim_text(a25_nodes, "\"What's new in Svelte October 2020\"");
			a25_nodes.forEach(detach);
			p11_nodes.forEach(detach);
			t77 = claim_space(section2_nodes);
			p12 = claim_element(section2_nodes, "P", {});
			var p12_nodes = children(p12);
			t78 = claim_text(p12_nodes, "Benefits of building interactive mockup with Svelte");
			p12_nodes.forEach(detach);
			t79 = claim_space(section2_nodes);
			ul7 = claim_element(section2_nodes, "UL", {});
			var ul7_nodes = children(ul7);
			li19 = claim_element(ul7_nodes, "LI", {});
			var li19_nodes = children(li19);
			t80 = claim_text(li19_nodes, "Fast to get started and going");
			li19_nodes.forEach(detach);
			t81 = claim_space(ul7_nodes);
			li20 = claim_element(ul7_nodes, "LI", {});
			var li20_nodes = children(li20);
			t82 = claim_text(li20_nodes, "Allow user to explore different variations, rather than sticking to the golden path in the user interview");
			li20_nodes.forEach(detach);
			t83 = claim_space(ul7_nodes);
			li21 = claim_element(ul7_nodes, "LI", {});
			var li21_nodes = children(li21);
			t84 = claim_text(li21_nodes, "Faster iteration, faster to test assumptions");
			li21_nodes.forEach(detach);
			ul7_nodes.forEach(detach);
			t85 = claim_space(section2_nodes);
			p13 = claim_element(section2_nodes, "P", {});
			var p13_nodes = children(p13);
			t86 = claim_text(p13_nodes, "Things people asked in the chat:");
			p13_nodes.forEach(detach);
			t87 = claim_space(section2_nodes);
			ul8 = claim_element(section2_nodes, "UL", {});
			var ul8_nodes = children(ul8);
			li22 = claim_element(ul8_nodes, "LI", {});
			var li22_nodes = children(li22);
			t88 = claim_text(li22_nodes, "Official Svelte VSCode Plugin ");
			a26 = claim_element(li22_nodes, "A", { href: true, rel: true });
			var a26_nodes = children(a26);
			t89 = claim_text(a26_nodes, "svelte-vscode");
			a26_nodes.forEach(detach);
			li22_nodes.forEach(detach);
			t90 = claim_space(ul8_nodes);
			li23 = claim_element(ul8_nodes, "LI", {});
			var li23_nodes = children(li23);
			t91 = claim_text(li23_nodes, "the code ");
			a27 = claim_element(li23_nodes, "A", { href: true, rel: true });
			var a27_nodes = children(a27);
			t92 = claim_text(a27_nodes, "https://github.com/d3sandoval/svelte-summit-example");
			a27_nodes.forEach(detach);
			li23_nodes.forEach(detach);
			ul8_nodes.forEach(detach);
			t93 = claim_space(section2_nodes);
			blockquote6 = claim_element(section2_nodes, "BLOCKQUOTE", {});
			var blockquote6_nodes = children(blockquote6);
			p14 = claim_element(blockquote6_nodes, "P", {});
			var p14_nodes = children(p14);
			t94 = claim_text(p14_nodes, "\"Using a production-like data model in application that is quick to build, which may otherwise take longer in our design file, allow us to respond to feedback quickly in prototyping\"");
			p14_nodes.forEach(detach);
			blockquote6_nodes.forEach(detach);
			section2_nodes.forEach(detach);
			t95 = claim_space(nodes);
			section3 = claim_element(nodes, "SECTION", {});
			var section3_nodes = children(section3);
			h22 = claim_element(section3_nodes, "H2", {});
			var h22_nodes = children(h22);
			a28 = claim_element(h22_nodes, "A", { href: true, id: true });
			var a28_nodes = children(a28);
			t96 = claim_text(a28_nodes, "3️⃣ How does Svelte's crossfade function work?");
			a28_nodes.forEach(detach);
			h22_nodes.forEach(detach);
			t97 = claim_space(section3_nodes);
			p15 = claim_element(section3_nodes, "P", {});
			var p15_nodes = children(p15);
			a29 = claim_element(p15_nodes, "A", { href: true, rel: true });
			var a29_nodes = children(a29);
			t98 = claim_text(a29_nodes, "@nicolodavis");
			a29_nodes.forEach(detach);
			p15_nodes.forEach(detach);
			t99 = claim_space(section3_nodes);
			ul9 = claim_element(section3_nodes, "UL", {});
			var ul9_nodes = children(ul9);
			li24 = claim_element(ul9_nodes, "LI", {});
			var li24_nodes = children(li24);
			t100 = claim_text(li24_nodes, "1️⃣ what it is");
			li24_nodes.forEach(detach);
			t101 = claim_space(ul9_nodes);
			li25 = claim_element(ul9_nodes, "LI", {});
			var li25_nodes = children(li25);
			t102 = claim_text(li25_nodes, "2️⃣ how it works");
			li25_nodes.forEach(detach);
			t103 = claim_space(ul9_nodes);
			li26 = claim_element(ul9_nodes, "LI", {});
			var li26_nodes = children(li26);
			t104 = claim_text(li26_nodes, "3️⃣ real world example");
			li26_nodes.forEach(detach);
			ul9_nodes.forEach(detach);
			t105 = claim_space(section3_nodes);
			p16 = claim_element(section3_nodes, "P", {});
			var p16_nodes = children(p16);
			picture0 = claim_element(p16_nodes, "PICTURE", {});
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
			p16_nodes.forEach(detach);
			t106 = claim_space(section3_nodes);
			p17 = claim_element(section3_nodes, "P", {});
			var p17_nodes = children(p17);
			t107 = claim_text(p17_nodes, "If you describe how to move content imperatively");
			p17_nodes.forEach(detach);
			t108 = claim_space(section3_nodes);
			ul10 = claim_element(section3_nodes, "UL", {});
			var ul10_nodes = children(ul10);
			li27 = claim_element(ul10_nodes, "LI", {});
			var li27_nodes = children(li27);
			t109 = claim_text(li27_nodes, "Copy the HTML from the source container");
			li27_nodes.forEach(detach);
			t110 = claim_space(ul10_nodes);
			li28 = claim_element(ul10_nodes, "LI", {});
			var li28_nodes = children(li28);
			t111 = claim_text(li28_nodes, "Paste it into the target container");
			li28_nodes.forEach(detach);
			t112 = claim_space(ul10_nodes);
			li29 = claim_element(ul10_nodes, "LI", {});
			var li29_nodes = children(li29);
			t113 = claim_text(li29_nodes, "Remove it from the source container");
			li29_nodes.forEach(detach);
			ul10_nodes.forEach(detach);
			t114 = claim_space(section3_nodes);
			p18 = claim_element(section3_nodes, "P", {});
			var p18_nodes = children(p18);
			picture1 = claim_element(p18_nodes, "PICTURE", {});
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
			p18_nodes.forEach(detach);
			t115 = claim_space(section3_nodes);
			p19 = claim_element(section3_nodes, "P", {});
			var p19_nodes = children(p19);
			t116 = claim_text(p19_nodes, "If you want to describe it declaratively in Svelte,");
			p19_nodes.forEach(detach);
			t117 = claim_space(section3_nodes);
			ul11 = claim_element(section3_nodes, "UL", {});
			var ul11_nodes = children(ul11);
			li30 = claim_element(ul11_nodes, "LI", {});
			var li30_nodes = children(li30);
			t118 = claim_text(li30_nodes, "use ");
			code0 = claim_element(li30_nodes, "CODE", {});
			var code0_nodes = children(code0);
			t119 = claim_text(code0_nodes, "{#if position === 'a'}");
			code0_nodes.forEach(detach);
			li30_nodes.forEach(detach);
			t120 = claim_space(ul11_nodes);
			li31 = claim_element(ul11_nodes, "LI", {});
			var li31_nodes = children(li31);
			t121 = claim_text(li31_nodes, "change ");
			code1 = claim_element(li31_nodes, "CODE", {});
			var code1_nodes = children(code1);
			t122 = claim_text(code1_nodes, "position");
			code1_nodes.forEach(detach);
			li31_nodes.forEach(detach);
			ul11_nodes.forEach(detach);
			t123 = claim_space(section3_nodes);
			p20 = claim_element(section3_nodes, "P", {});
			var p20_nodes = children(p20);
			t124 = claim_text(p20_nodes, "Svelte transition allows you to specify how an element is transition in when it's created, and transition out when it is destroyed.");
			p20_nodes.forEach(detach);
			t125 = claim_space(section3_nodes);
			pre0 = claim_element(section3_nodes, "PRE", { class: true });
			var pre0_nodes = children(pre0);
			pre0_nodes.forEach(detach);
			t126 = claim_space(section3_nodes);
			ul12 = claim_element(section3_nodes, "UL", {});
			var ul12_nodes = children(ul12);
			li32 = claim_element(ul12_nodes, "LI", {});
			var li32_nodes = children(li32);
			t127 = claim_text(li32_nodes, "📝 crossfade coordinates the transition from 1 location to another");
			li32_nodes.forEach(detach);
			t128 = claim_space(ul12_nodes);
			li33 = claim_element(ul12_nodes, "LI", {});
			var li33_nodes = children(li33);
			t129 = claim_text(li33_nodes, "📝 element is destroyed in its old position and created in its new position");
			li33_nodes.forEach(detach);
			t130 = claim_space(ul12_nodes);
			li34 = claim_element(ul12_nodes, "LI", {});
			var li34_nodes = children(li34);
			t131 = claim_text(li34_nodes, "📝 both transitions are played simulatenously over each other");
			li34_nodes.forEach(detach);
			t132 = claim_space(ul12_nodes);
			li35 = claim_element(ul12_nodes, "LI", {});
			var li35_nodes = children(li35);
			t133 = claim_text(li35_nodes, "📝 fades out the 1st transition, fades in the 2nd transition");
			li35_nodes.forEach(detach);
			ul12_nodes.forEach(detach);
			t134 = claim_space(section3_nodes);
			p21 = claim_element(section3_nodes, "P", {});
			var p21_nodes = children(p21);

			img2 = claim_element(p21_nodes, "IMG", {
				title: true,
				alt: true,
				"data-src": true,
				loading: true
			});

			p21_nodes.forEach(detach);
			t135 = claim_space(section3_nodes);
			ul13 = claim_element(section3_nodes, "UL", {});
			var ul13_nodes = children(ul13);
			li36 = claim_element(ul13_nodes, "LI", {});
			var li36_nodes = children(li36);
			t136 = claim_text(li36_nodes, "📝 call crossfade to get ");
			code2 = claim_element(li36_nodes, "CODE", {});
			var code2_nodes = children(code2);
			t137 = claim_text(code2_nodes, "send");
			code2_nodes.forEach(detach);
			t138 = claim_text(li36_nodes, " and ");
			code3 = claim_element(li36_nodes, "CODE", {});
			var code3_nodes = children(code3);
			t139 = claim_text(code3_nodes, "release");
			code3_nodes.forEach(detach);
			li36_nodes.forEach(detach);
			t140 = claim_space(ul13_nodes);
			li37 = claim_element(ul13_nodes, "LI", {});
			var li37_nodes = children(li37);
			t141 = claim_text(li37_nodes, "📝 using ");
			code4 = claim_element(li37_nodes, "CODE", {});
			var code4_nodes = children(code4);
			t142 = claim_text(code4_nodes, "out:send");
			code4_nodes.forEach(detach);
			t143 = claim_text(li37_nodes, " and ");
			code5 = claim_element(li37_nodes, "CODE", {});
			var code5_nodes = children(code5);
			t144 = claim_text(code5_nodes, "in:receive");
			code5_nodes.forEach(detach);
			li37_nodes.forEach(detach);
			t145 = claim_space(ul13_nodes);
			li38 = claim_element(ul13_nodes, "LI", {});
			var li38_nodes = children(li38);
			t146 = claim_text(li38_nodes, "📝 the key needs to be the same");
			li38_nodes.forEach(detach);
			ul13_nodes.forEach(detach);
			t147 = claim_space(section3_nodes);
			pre1 = claim_element(section3_nodes, "PRE", { class: true });
			var pre1_nodes = children(pre1);
			pre1_nodes.forEach(detach);
			t148 = claim_space(section3_nodes);
			p22 = claim_element(section3_nodes, "P", {});
			var p22_nodes = children(p22);
			t149 = claim_text(p22_nodes, "See how @nicolodavis uses crossfade in a real-world application, ");
			a30 = claim_element(p22_nodes, "A", { href: true, rel: true });
			var a30_nodes = children(a30);
			t150 = claim_text(a30_nodes, "@boardgamelabapp");
			a30_nodes.forEach(detach);
			t151 = claim_space(p22_nodes);
			a31 = claim_element(p22_nodes, "A", { href: true, rel: true });
			var a31_nodes = children(a31);
			t152 = claim_text(a31_nodes, "https://boardgamelab.app/");
			a31_nodes.forEach(detach);
			t153 = claim_text(p22_nodes, ".");
			p22_nodes.forEach(detach);
			t154 = claim_space(section3_nodes);
			p23 = claim_element(section3_nodes, "P", {});
			var p23_nodes = children(p23);

			img3 = claim_element(p23_nodes, "IMG", {
				title: true,
				alt: true,
				"data-src": true,
				loading: true
			});

			p23_nodes.forEach(detach);
			section3_nodes.forEach(detach);
			t155 = claim_space(nodes);
			section4 = claim_element(nodes, "SECTION", {});
			var section4_nodes = children(section4);
			h23 = claim_element(section4_nodes, "H2", {});
			var h23_nodes = children(h23);
			a32 = claim_element(h23_nodes, "A", { href: true, id: true });
			var a32_nodes = children(a32);
			t156 = claim_text(a32_nodes, "4️⃣ Zero config Svelte websites with Plenti");
			a32_nodes.forEach(detach);
			h23_nodes.forEach(detach);
			t157 = claim_space(section4_nodes);
			p24 = claim_element(section4_nodes, "P", {});
			var p24_nodes = children(p24);
			a33 = claim_element(p24_nodes, "A", { href: true, rel: true });
			var a33_nodes = children(a33);
			t158 = claim_text(a33_nodes, "@jimafisk");
			a33_nodes.forEach(detach);
			t159 = claim_text(p24_nodes, " shared a static site generator, ");
			a34 = claim_element(p24_nodes, "A", { href: true, rel: true });
			var a34_nodes = children(a34);
			t160 = claim_text(a34_nodes, "Plenti");
			a34_nodes.forEach(detach);
			t161 = claim_text(p24_nodes, ".");
			p24_nodes.forEach(detach);
			t162 = claim_space(section4_nodes);
			p25 = claim_element(section4_nodes, "P", {});
			var p25_nodes = children(p25);
			strong1 = claim_element(p25_nodes, "STRONG", {});
			var strong1_nodes = children(strong1);
			t163 = claim_text(strong1_nodes, "Plenti");
			strong1_nodes.forEach(detach);
			p25_nodes.forEach(detach);
			t164 = claim_space(section4_nodes);
			ul14 = claim_element(section4_nodes, "UL", {});
			var ul14_nodes = children(ul14);
			li39 = claim_element(ul14_nodes, "LI", {});
			var li39_nodes = children(li39);
			t165 = claim_text(li39_nodes, "🎪 Static Site Generator");
			li39_nodes.forEach(detach);
			t166 = claim_space(ul14_nodes);
			li40 = claim_element(ul14_nodes, "LI", {});
			var li40_nodes = children(li40);
			t167 = claim_text(li40_nodes, "🏎 Go backend");
			li40_nodes.forEach(detach);
			t168 = claim_space(ul14_nodes);
			li41 = claim_element(ul14_nodes, "LI", {});
			var li41_nodes = children(li41);
			t169 = claim_text(li41_nodes, "🛠 Build code in Go, no webpack / rollup, inspired by snowpack, called gopack");
			li41_nodes.forEach(detach);
			t170 = claim_space(ul14_nodes);
			li42 = claim_element(ul14_nodes, "LI", {});
			var li42_nodes = children(li42);
			t171 = claim_text(li42_nodes, "⚡️ Reach to v8 engine directly to compile svelte components");
			li42_nodes.forEach(detach);
			t172 = claim_space(ul14_nodes);
			li43 = claim_element(ul14_nodes, "LI", {});
			var li43_nodes = children(li43);
			t173 = claim_text(li43_nodes, "✨ Does not depend on Node.js / npm");
			li43_nodes.forEach(detach);
			t174 = claim_space(ul14_nodes);
			li44 = claim_element(ul14_nodes, "LI", {});
			var li44_nodes = children(li44);
			t175 = claim_text(li44_nodes, "📖 JSON as data source");
			li44_nodes.forEach(detach);
			t176 = claim_space(ul14_nodes);
			li45 = claim_element(ul14_nodes, "LI", {});
			var li45_nodes = children(li45);
			t177 = claim_text(li45_nodes, "👓 Optimised for screen reader users");
			li45_nodes.forEach(detach);
			t178 = claim_space(ul14_nodes);
			li46 = claim_element(ul14_nodes, "LI", {});
			var li46_nodes = children(li46);
			t179 = claim_text(li46_nodes, "🍺 Hydrates app into single page application + client-side routing + automatically connects to JSON data source");
			li46_nodes.forEach(detach);
			ul14_nodes.forEach(detach);
			t180 = claim_space(section4_nodes);
			p26 = claim_element(section4_nodes, "P", {});
			var p26_nodes = children(p26);
			strong2 = claim_element(p26_nodes, "STRONG", {});
			var strong2_nodes = children(strong2);
			t181 = claim_text(strong2_nodes, "Install plenti");
			strong2_nodes.forEach(detach);
			p26_nodes.forEach(detach);
			t182 = claim_space(section4_nodes);
			ul15 = claim_element(section4_nodes, "UL", {});
			var ul15_nodes = children(ul15);
			li47 = claim_element(ul15_nodes, "LI", {});
			var li47_nodes = children(li47);
			t183 = claim_text(li47_nodes, "⬇️ Download the binary");
			li47_nodes.forEach(detach);
			t184 = claim_space(ul15_nodes);
			li48 = claim_element(ul15_nodes, "LI", {});
			var li48_nodes = children(li48);
			t185 = claim_text(li48_nodes, "📦 Install using package manager");
			li48_nodes.forEach(detach);
			ul15_nodes.forEach(detach);
			t186 = claim_space(section4_nodes);
			pre2 = claim_element(section4_nodes, "PRE", { class: true });
			var pre2_nodes = children(pre2);
			pre2_nodes.forEach(detach);
			t187 = claim_space(section4_nodes);
			p27 = claim_element(section4_nodes, "P", {});
			var p27_nodes = children(p27);
			strong3 = claim_element(p27_nodes, "STRONG", {});
			var strong3_nodes = children(strong3);
			t188 = claim_text(strong3_nodes, "Plenti command");
			strong3_nodes.forEach(detach);
			p27_nodes.forEach(detach);
			t189 = claim_space(section4_nodes);
			pre3 = claim_element(section4_nodes, "PRE", { class: true });
			var pre3_nodes = children(pre3);
			pre3_nodes.forEach(detach);
			t190 = claim_space(section4_nodes);
			blockquote7 = claim_element(section4_nodes, "BLOCKQUOTE", {});
			var blockquote7_nodes = children(blockquote7);
			p28 = claim_element(blockquote7_nodes, "P", {});
			var p28_nodes = children(p28);
			t191 = claim_text(p28_nodes, "\"You be so productive that you forget to check Twitter\"");
			p28_nodes.forEach(detach);
			blockquote7_nodes.forEach(detach);
			section4_nodes.forEach(detach);
			t192 = claim_space(nodes);
			section5 = claim_element(nodes, "SECTION", {});
			var section5_nodes = children(section5);
			h24 = claim_element(section5_nodes, "H2", {});
			var h24_nodes = children(h24);
			a35 = claim_element(h24_nodes, "A", { href: true, id: true });
			var a35_nodes = children(a35);
			t193 = claim_text(a35_nodes, "5️⃣ How you setup data visualization with Svelte");
			a35_nodes.forEach(detach);
			h24_nodes.forEach(detach);
			t194 = claim_space(section5_nodes);
			p29 = claim_element(section5_nodes, "P", {});
			var p29_nodes = children(p29);
			a36 = claim_element(p29_nodes, "A", { href: true, rel: true });
			var a36_nodes = children(a36);
			t195 = claim_text(a36_nodes, "@h_i_g_s_c_h");
			a36_nodes.forEach(detach);
			t196 = claim_text(p29_nodes, " showed us how to use svelte to defend democracy. 🏹🛡🐉");
			p29_nodes.forEach(detach);
			t197 = claim_space(section5_nodes);
			p30 = claim_element(section5_nodes, "P", {});
			var p30_nodes = children(p30);
			t198 = claim_text(p30_nodes, "Check out his talk if you want to learn");
			p30_nodes.forEach(detach);
			t199 = claim_space(section5_nodes);
			ul16 = claim_element(section5_nodes, "UL", {});
			var ul16_nodes = children(ul16);
			li49 = claim_element(ul16_nodes, "LI", {});
			var li49_nodes = children(li49);
			t200 = claim_text(li49_nodes, "✨ how to produce great nice visualisation with svelte");
			li49_nodes.forEach(detach);
			t201 = claim_space(ul16_nodes);
			li50 = claim_element(ul16_nodes, "LI", {});
			var li50_nodes = children(li50);
			t202 = claim_text(li50_nodes, "🎨 how to use all the nice features that svelte comes with to produce cool visualisation");
			li50_nodes.forEach(detach);
			ul16_nodes.forEach(detach);
			t203 = claim_space(section5_nodes);
			p31 = claim_element(section5_nodes, "P", {});
			var p31_nodes = children(p31);
			t204 = claim_text(p31_nodes, "3 things to love svelte + data visualisation");
			p31_nodes.forEach(detach);
			t205 = claim_space(section5_nodes);
			p32 = claim_element(section5_nodes, "P", {});
			var p32_nodes = children(p32);
			strong4 = claim_element(p32_nodes, "STRONG", {});
			var strong4_nodes = children(strong4);
			t206 = claim_text(strong4_nodes, "1️⃣ modularisation");
			strong4_nodes.forEach(detach);
			p32_nodes.forEach(detach);
			t207 = claim_space(section5_nodes);
			ul17 = claim_element(section5_nodes, "UL", {});
			var ul17_nodes = children(ul17);
			li51 = claim_element(ul17_nodes, "LI", {});
			var li51_nodes = children(li51);
			t208 = claim_text(li51_nodes, "organise code in components");
			li51_nodes.forEach(detach);
			ul17_nodes.forEach(detach);
			t209 = claim_space(section5_nodes);
			p33 = claim_element(section5_nodes, "P", {});
			var p33_nodes = children(p33);

			img4 = claim_element(p33_nodes, "IMG", {
				title: true,
				alt: true,
				"data-src": true,
				loading: true
			});

			p33_nodes.forEach(detach);
			t210 = claim_space(section5_nodes);
			p34 = claim_element(section5_nodes, "P", {});
			var p34_nodes = children(p34);
			strong5 = claim_element(p34_nodes, "STRONG", {});
			var strong5_nodes = children(strong5);
			t211 = claim_text(strong5_nodes, "2️⃣ transitions");
			strong5_nodes.forEach(detach);
			p34_nodes.forEach(detach);
			t212 = claim_space(section5_nodes);
			ul18 = claim_element(section5_nodes, "UL", {});
			var ul18_nodes = children(ul18);
			li52 = claim_element(ul18_nodes, "LI", {});
			var li52_nodes = children(li52);
			t213 = claim_text(li52_nodes, "✨ easy to use");
			li52_nodes.forEach(detach);
			t214 = claim_space(ul18_nodes);
			li53 = claim_element(ul18_nodes, "LI", {});
			var li53_nodes = children(li53);
			t215 = claim_text(li53_nodes, "🎭 built-in transitions, such as ");
			code6 = claim_element(li53_nodes, "CODE", {});
			var code6_nodes = children(code6);
			t216 = claim_text(code6_nodes, "fade");
			code6_nodes.forEach(detach);
			t217 = claim_text(li53_nodes, ", ");
			code7 = claim_element(li53_nodes, "CODE", {});
			var code7_nodes = children(code7);
			t218 = claim_text(code7_nodes, "draw");
			code7_nodes.forEach(detach);
			li53_nodes.forEach(detach);
			ul18_nodes.forEach(detach);
			t219 = claim_space(section5_nodes);
			pre4 = claim_element(section5_nodes, "PRE", { class: true });
			var pre4_nodes = children(pre4);
			pre4_nodes.forEach(detach);
			t220 = claim_space(section5_nodes);
			p35 = claim_element(section5_nodes, "P", {});
			var p35_nodes = children(p35);

			img5 = claim_element(p35_nodes, "IMG", {
				title: true,
				alt: true,
				"data-src": true,
				loading: true
			});

			p35_nodes.forEach(detach);
			t221 = claim_space(section5_nodes);
			p36 = claim_element(section5_nodes, "P", {});
			var p36_nodes = children(p36);
			strong6 = claim_element(p36_nodes, "STRONG", {});
			var strong6_nodes = children(strong6);
			t222 = claim_text(strong6_nodes, "3️⃣ actions");
			strong6_nodes.forEach(detach);
			p36_nodes.forEach(detach);
			t223 = claim_space(section5_nodes);
			ul19 = claim_element(section5_nodes, "UL", {});
			var ul19_nodes = children(ul19);
			li54 = claim_element(ul19_nodes, "LI", {});
			var li54_nodes = children(li54);
			t224 = claim_text(li54_nodes, "allow reusable logics");
			li54_nodes.forEach(detach);
			t225 = claim_space(ul19_nodes);
			li55 = claim_element(ul19_nodes, "LI", {});
			var li55_nodes = children(li55);
			t226 = claim_text(li55_nodes, "can reuse across projects");
			li55_nodes.forEach(detach);
			ul19_nodes.forEach(detach);
			t227 = claim_space(section5_nodes);
			pre5 = claim_element(section5_nodes, "PRE", { class: true });
			var pre5_nodes = children(pre5);
			pre5_nodes.forEach(detach);
			t228 = claim_space(section5_nodes);
			p37 = claim_element(section5_nodes, "P", {});
			var p37_nodes = children(p37);
			t229 = claim_text(p37_nodes, "Resources");
			p37_nodes.forEach(detach);
			t230 = claim_space(section5_nodes);
			ul20 = claim_element(section5_nodes, "UL", {});
			var ul20_nodes = children(ul20);
			li56 = claim_element(ul20_nodes, "LI", {});
			var li56_nodes = children(li56);
			t231 = claim_text(li56_nodes, "🔗 ");
			a37 = claim_element(li56_nodes, "A", { href: true, rel: true });
			var a37_nodes = children(a37);
			t232 = claim_text(a37_nodes, "https://github.com/DFRLab/interference2020");
			a37_nodes.forEach(detach);
			li56_nodes.forEach(detach);
			t233 = claim_space(ul20_nodes);
			li57 = claim_element(ul20_nodes, "LI", {});
			var li57_nodes = children(li57);
			t234 = claim_text(li57_nodes, "🔗 ");
			a38 = claim_element(li57_nodes, "A", { href: true, rel: true });
			var a38_nodes = children(a38);
			t235 = claim_text(a38_nodes, "https://interference2020.org");
			a38_nodes.forEach(detach);
			li57_nodes.forEach(detach);
			t236 = claim_space(ul20_nodes);
			li58 = claim_element(ul20_nodes, "LI", {});
			var li58_nodes = children(li58);
			t237 = claim_text(li58_nodes, "🔗 ");
			a39 = claim_element(li58_nodes, "A", { href: true, rel: true });
			var a39_nodes = children(a39);
			t238 = claim_text(a39_nodes, "https://twitter.com/h_i_g_s_c_h");
			a39_nodes.forEach(detach);
			li58_nodes.forEach(detach);
			t239 = claim_space(ul20_nodes);
			li59 = claim_element(ul20_nodes, "LI", {});
			var li59_nodes = children(li59);
			t240 = claim_text(li59_nodes, "🔗 ");
			a40 = claim_element(li59_nodes, "A", { href: true, rel: true });
			var a40_nodes = children(a40);
			t241 = claim_text(a40_nodes, "https://www.higsch.com/");
			a40_nodes.forEach(detach);
			li59_nodes.forEach(detach);
			ul20_nodes.forEach(detach);
			t242 = claim_space(section5_nodes);
			p38 = claim_element(section5_nodes, "P", {});
			var p38_nodes = children(p38);
			a41 = claim_element(p38_nodes, "A", { href: true, rel: true });
			var a41_nodes = children(a41);
			t243 = claim_text(a41_nodes, "Is that \"Svelte\" in German accent?");
			a41_nodes.forEach(detach);
			p38_nodes.forEach(detach);
			section5_nodes.forEach(detach);
			t244 = claim_space(nodes);
			section6 = claim_element(nodes, "SECTION", {});
			var section6_nodes = children(section6);
			h25 = claim_element(section6_nodes, "H2", {});
			var h25_nodes = children(h25);
			a42 = claim_element(h25_nodes, "A", { href: true, id: true });
			var a42_nodes = children(a42);
			t245 = claim_text(a42_nodes, "6️⃣ Svelte at the Edge: Powering Svelte Apps with Cloudflare Workers");
			a42_nodes.forEach(detach);
			h25_nodes.forEach(detach);
			t246 = claim_space(section6_nodes);
			p39 = claim_element(section6_nodes, "P", {});
			var p39_nodes = children(p39);
			a43 = claim_element(p39_nodes, "A", { href: true, rel: true });
			var a43_nodes = children(a43);
			t247 = claim_text(a43_nodes, "@lukeed05");
			a43_nodes.forEach(detach);
			t248 = claim_text(p39_nodes, " shared with us how to deploying server-side rendering + Svelte + Cloudflare Workers at global scale 🌎");
			p39_nodes.forEach(detach);
			t249 = claim_space(section6_nodes);
			p40 = claim_element(section6_nodes, "P", {});
			var p40_nodes = children(p40);
			t250 = claim_text(p40_nodes, "Types of workers");
			p40_nodes.forEach(detach);
			t251 = claim_space(section6_nodes);
			ul25 = claim_element(section6_nodes, "UL", {});
			var ul25_nodes = children(ul25);
			li61 = claim_element(ul25_nodes, "LI", {});
			var li61_nodes = children(li61);
			t252 = claim_text(li61_nodes, "Web Workers ");
			ul21 = claim_element(li61_nodes, "UL", {});
			var ul21_nodes = children(ul21);
			li60 = claim_element(ul21_nodes, "LI", {});
			var li60_nodes = children(li60);
			t253 = claim_text(li60_nodes, "most common, general purpose, execute tasks off main thread");
			li60_nodes.forEach(detach);
			ul21_nodes.forEach(detach);
			li61_nodes.forEach(detach);
			t254 = claim_space(ul25_nodes);
			li63 = claim_element(ul25_nodes, "LI", {});
			var li63_nodes = children(li63);
			t255 = claim_text(li63_nodes, "Worklets");
			ul22 = claim_element(li63_nodes, "UL", {});
			var ul22_nodes = children(ul22);
			li62 = claim_element(ul22_nodes, "LI", {});
			var li62_nodes = children(li62);
			t256 = claim_text(li62_nodes, "very lightweight, access to low-level render processes");
			li62_nodes.forEach(detach);
			ul22_nodes.forEach(detach);
			li63_nodes.forEach(detach);
			t257 = claim_space(ul25_nodes);
			li66 = claim_element(ul25_nodes, "LI", {});
			var li66_nodes = children(li66);
			t258 = claim_text(li66_nodes, "Service Workers");
			ul23 = claim_element(li66_nodes, "UL", {});
			var ul23_nodes = children(ul23);
			li64 = claim_element(ul23_nodes, "LI", {});
			var li64_nodes = children(li64);
			t259 = claim_text(li64_nodes, "proxy between client and network / cache");
			li64_nodes.forEach(detach);
			t260 = claim_space(ul23_nodes);
			li65 = claim_element(ul23_nodes, "LI", {});
			var li65_nodes = children(li65);
			t261 = claim_text(li65_nodes, "may intercept HTTP requests entirely");
			li65_nodes.forEach(detach);
			ul23_nodes.forEach(detach);
			li66_nodes.forEach(detach);
			t262 = claim_space(ul25_nodes);
			li69 = claim_element(ul25_nodes, "LI", {});
			var li69_nodes = children(li69);
			t263 = claim_text(li69_nodes, "Cloudflare Workers");
			ul24 = claim_element(li69_nodes, "UL", {});
			var ul24_nodes = children(ul24);
			li67 = claim_element(ul24_nodes, "LI", {});
			var li67_nodes = children(li67);
			t264 = claim_text(li67_nodes, "works similarly as Service Workers, as a proxy between client and network / cache");
			li67_nodes.forEach(detach);
			t265 = claim_space(ul24_nodes);
			li68 = claim_element(ul24_nodes, "LI", {});
			var li68_nodes = children(li68);
			t266 = claim_text(li68_nodes, "difference is its physical location");
			li68_nodes.forEach(detach);
			ul24_nodes.forEach(detach);
			li69_nodes.forEach(detach);
			ul25_nodes.forEach(detach);
			t267 = claim_space(section6_nodes);
			p41 = claim_element(section6_nodes, "P", {});
			var p41_nodes = children(p41);
			t268 = claim_text(p41_nodes, "Workers KV");
			p41_nodes.forEach(detach);
			t269 = claim_space(section6_nodes);
			ul26 = claim_element(section6_nodes, "UL", {});
			var ul26_nodes = children(ul26);
			li70 = claim_element(ul26_nodes, "LI", {});
			var li70_nodes = children(li70);
			t270 = claim_text(li70_nodes, "key value store");
			li70_nodes.forEach(detach);
			t271 = claim_space(ul26_nodes);
			li71 = claim_element(ul26_nodes, "LI", {});
			var li71_nodes = children(li71);
			t272 = claim_text(li71_nodes, "available in every network location");
			li71_nodes.forEach(detach);
			t273 = claim_space(ul26_nodes);
			li72 = claim_element(ul26_nodes, "LI", {});
			var li72_nodes = children(li72);
			t274 = claim_text(li72_nodes, "extra persistent layer the worker can write into and read from anywhere");
			li72_nodes.forEach(detach);
			ul26_nodes.forEach(detach);
			t275 = claim_space(section6_nodes);
			p42 = claim_element(section6_nodes, "P", {});
			var p42_nodes = children(p42);
			t276 = claim_text(p42_nodes, "Worker Sites");
			p42_nodes.forEach(detach);
			t277 = claim_space(section6_nodes);
			ul29 = claim_element(section6_nodes, "UL", {});
			var ul29_nodes = children(ul29);
			li74 = claim_element(ul29_nodes, "LI", {});
			var li74_nodes = children(li74);
			t278 = claim_text(li74_nodes, "upload the built assets into Workers KV");
			ul27 = claim_element(li74_nodes, "UL", {});
			var ul27_nodes = children(ul27);
			li73 = claim_element(ul27_nodes, "LI", {});
			var li73_nodes = children(li73);
			t279 = claim_text(li73_nodes, "filepath as key, file content as value");
			li73_nodes.forEach(detach);
			ul27_nodes.forEach(detach);
			li74_nodes.forEach(detach);
			t280 = claim_space(ul29_nodes);
			li77 = claim_element(ul29_nodes, "LI", {});
			var li77_nodes = children(li77);
			t281 = claim_text(li77_nodes, "handle request by ");
			ul28 = claim_element(li77_nodes, "UL", {});
			var ul28_nodes = children(ul28);
			li75 = claim_element(ul28_nodes, "LI", {});
			var li75_nodes = children(li75);
			t282 = claim_text(li75_nodes, "serve from cache");
			li75_nodes.forEach(detach);
			t283 = claim_space(ul28_nodes);
			li76 = claim_element(ul28_nodes, "LI", {});
			var li76_nodes = children(li76);
			t284 = claim_text(li76_nodes, "cache miss, respond with content in Workers KV");
			li76_nodes.forEach(detach);
			ul28_nodes.forEach(detach);
			li77_nodes.forEach(detach);
			ul29_nodes.forEach(detach);
			t285 = claim_space(section6_nodes);
			p43 = claim_element(section6_nodes, "P", {});
			var p43_nodes = children(p43);
			t286 = claim_text(p43_nodes, "To build a svelte app for Cloudflare, make sure");
			p43_nodes.forEach(detach);
			t287 = claim_space(section6_nodes);
			ul31 = claim_element(section6_nodes, "UL", {});
			var ul31_nodes = children(ul31);
			li78 = claim_element(ul31_nodes, "LI", {});
			var li78_nodes = children(li78);
			code8 = claim_element(li78_nodes, "CODE", {});
			var code8_nodes = children(code8);
			t288 = claim_text(code8_nodes, "hydrate: true");
			code8_nodes.forEach(detach);
			t289 = claim_text(li78_nodes, ", so it hydrates on the browser");
			li78_nodes.forEach(detach);
			t290 = claim_space(ul31_nodes);
			li79 = claim_element(ul31_nodes, "LI", {});
			var li79_nodes = children(li79);
			t291 = claim_text(li79_nodes, "no assumptions on being within the browser context");
			li79_nodes.forEach(detach);
			t292 = claim_space(ul31_nodes);
			li82 = claim_element(ul31_nodes, "LI", {});
			var li82_nodes = children(li82);
			t293 = claim_text(li82_nodes, "build the site twice");
			ul30 = claim_element(li82_nodes, "UL", {});
			var ul30_nodes = children(ul30);
			li80 = claim_element(ul30_nodes, "LI", {});
			var li80_nodes = children(li80);
			t294 = claim_text(li80_nodes, "1 for the DOM output, 1 for SSR output");
			li80_nodes.forEach(detach);
			t295 = claim_space(ul30_nodes);
			li81 = claim_element(ul30_nodes, "LI", {});
			var li81_nodes = children(li81);
			code9 = claim_element(li81_nodes, "CODE", {});
			var code9_nodes = children(code9);
			t296 = claim_text(code9_nodes, "generate: 'dom' | 'ssr'");
			code9_nodes.forEach(detach);
			li81_nodes.forEach(detach);
			ul30_nodes.forEach(detach);
			li82_nodes.forEach(detach);
			ul31_nodes.forEach(detach);
			t297 = claim_space(section6_nodes);
			p44 = claim_element(section6_nodes, "P", {});
			var p44_nodes = children(p44);
			a44 = claim_element(p44_nodes, "A", { href: true, rel: true });
			var a44_nodes = children(a44);
			t298 = claim_text(a44_nodes, "Demo code");
			a44_nodes.forEach(detach);
			p44_nodes.forEach(detach);
			t299 = claim_space(section6_nodes);
			p45 = claim_element(section6_nodes, "P", {});
			var p45_nodes = children(p45);
			t300 = claim_text(p45_nodes, "Tools");
			p45_nodes.forEach(detach);
			t301 = claim_space(section6_nodes);
			ul32 = claim_element(section6_nodes, "UL", {});
			var ul32_nodes = children(ul32);
			li83 = claim_element(ul32_nodes, "LI", {});
			var li83_nodes = children(li83);
			a45 = claim_element(li83_nodes, "A", { href: true, rel: true });
			var a45_nodes = children(a45);
			t302 = claim_text(a45_nodes, "https://developers.cloudflare.com/workers/cli-wrangler");
			a45_nodes.forEach(detach);
			li83_nodes.forEach(detach);
			t303 = claim_space(ul32_nodes);
			li84 = claim_element(ul32_nodes, "LI", {});
			var li84_nodes = children(li84);
			a46 = claim_element(li84_nodes, "A", { href: true, rel: true });
			var a46_nodes = children(a46);
			t304 = claim_text(a46_nodes, "https://github.com/lukeed/cfw");
			a46_nodes.forEach(detach);
			li84_nodes.forEach(detach);
			t305 = claim_space(ul32_nodes);
			li85 = claim_element(ul32_nodes, "LI", {});
			var li85_nodes = children(li85);
			a47 = claim_element(li85_nodes, "A", { href: true, rel: true });
			var a47_nodes = children(a47);
			t306 = claim_text(a47_nodes, "https://github.com/lukeed/freshie");
			a47_nodes.forEach(detach);
			li85_nodes.forEach(detach);
			ul32_nodes.forEach(detach);
			t307 = claim_space(section6_nodes);
			p46 = claim_element(section6_nodes, "P", {});
			var p46_nodes = children(p46);
			a48 = claim_element(p46_nodes, "A", { href: true, rel: true });
			var a48_nodes = children(a48);
			t308 = claim_text(a48_nodes, "cfw");
			a48_nodes.forEach(detach);
			t309 = claim_text(p46_nodes, "\nSuite of utilities for building and deploying Cloudflare Workers");
			p46_nodes.forEach(detach);
			t310 = claim_space(section6_nodes);
			p47 = claim_element(section6_nodes, "P", {});
			var p47_nodes = children(p47);
			a49 = claim_element(p47_nodes, "A", { href: true, rel: true });
			var a49_nodes = children(a49);
			t311 = claim_text(a49_nodes, "freshie");
			a49_nodes.forEach(detach);
			p47_nodes.forEach(detach);
			t312 = claim_space(section6_nodes);
			p48 = claim_element(section6_nodes, "P", {});
			var p48_nodes = children(p48);
			t313 = claim_text(p48_nodes, "CLI to build universal applications, supporting different backends (Node.js, Cloudflare Workers) X different frontends (Svelte, Vue, Preact)");
			p48_nodes.forEach(detach);
			section6_nodes.forEach(detach);
			t314 = claim_space(nodes);
			section7 = claim_element(nodes, "SECTION", {});
			var section7_nodes = children(section7);
			h26 = claim_element(section7_nodes, "H2", {});
			var h26_nodes = children(h26);
			a50 = claim_element(h26_nodes, "A", { href: true, id: true });
			var a50_nodes = children(a50);
			t315 = claim_text(a50_nodes, "7️⃣ Svelte à la Mode");
			a50_nodes.forEach(detach);
			h26_nodes.forEach(detach);
			t316 = claim_space(section7_nodes);
			p49 = claim_element(section7_nodes, "P", {});
			var p49_nodes = children(p49);
			t317 = claim_text(p49_nodes, "A fun, cheeky talk by ");
			a51 = claim_element(p49_nodes, "A", { href: true, rel: true });
			var a51_nodes = children(a51);
			t318 = claim_text(a51_nodes, "@ronvoluted");
			a51_nodes.forEach(detach);
			t319 = claim_text(p49_nodes, ", where he draws comparison of web + svelte to Pie à la Mode");
			p49_nodes.forEach(detach);
			t320 = claim_space(section7_nodes);
			p50 = claim_element(section7_nodes, "P", {});
			var p50_nodes = children(p50);
			t321 = claim_text(p50_nodes, "The pie 🥧, represent the web, the juicy things you can do with the web, it's a wondrous platform and it's prevalent. 🤤");
			p50_nodes.forEach(detach);
			t322 = claim_space(section7_nodes);
			p51 = claim_element(section7_nodes, "P", {});
			var p51_nodes = children(p51);
			t323 = claim_text(p51_nodes, "Svelte helps us embracing these qualities by sweetening the deal. That's the ice cream on top. 🍨");
			p51_nodes.forEach(detach);
			t324 = claim_space(section7_nodes);
			p52 = claim_element(section7_nodes, "P", {});
			var p52_nodes = children(p52);
			t325 = claim_text(p52_nodes, "@ronvoluted reminded us how easy to create a @sveltejs app");
			p52_nodes.forEach(detach);
			t326 = claim_space(section7_nodes);
			ul33 = claim_element(section7_nodes, "UL", {});
			var ul33_nodes = children(ul33);
			li86 = claim_element(ul33_nodes, "LI", {});
			var li86_nodes = children(li86);
			t327 = claim_text(li86_nodes, "1️⃣ copy HTML markup from source elements panel of a website you like");
			li86_nodes.forEach(detach);
			t328 = claim_space(ul33_nodes);
			li87 = claim_element(ul33_nodes, "LI", {});
			var li87_nodes = children(li87);
			t329 = claim_text(li87_nodes, "2️⃣ paste it in svelte.dev/repl");
			li87_nodes.forEach(detach);
			t330 = claim_space(ul33_nodes);
			li88 = claim_element(ul33_nodes, "LI", {});
			var li88_nodes = children(li88);
			t331 = claim_text(li88_nodes, "3️⃣ copy + paste in the styles from the styles panel");
			li88_nodes.forEach(detach);
			t332 = claim_space(ul33_nodes);
			li89 = claim_element(ul33_nodes, "LI", {});
			var li89_nodes = children(li89);
			t333 = claim_text(li89_nodes, "4️⃣ add ");
			code10 = claim_element(li89_nodes, "CODE", {});
			var code10_nodes = children(code10);
			t334 = claim_text(code10_nodes, "<script>");
			code10_nodes.forEach(detach);
			t335 = claim_text(li89_nodes, " tag to sprinkle some logic");
			li89_nodes.forEach(detach);
			ul33_nodes.forEach(detach);
			t336 = claim_space(section7_nodes);
			p53 = claim_element(section7_nodes, "P", {});
			var p53_nodes = children(p53);
			t337 = claim_text(p53_nodes, "Resources to check what's available in the web platform");
			p53_nodes.forEach(detach);
			t338 = claim_space(section7_nodes);
			ul34 = claim_element(section7_nodes, "UL", {});
			var ul34_nodes = children(ul34);
			li90 = claim_element(ul34_nodes, "LI", {});
			var li90_nodes = children(li90);
			t339 = claim_text(li90_nodes, "🔗 ");
			a52 = claim_element(li90_nodes, "A", { href: true, rel: true });
			var a52_nodes = children(a52);
			t340 = claim_text(a52_nodes, "https://developer.mozilla.org/en-US/docs/Web/API");
			a52_nodes.forEach(detach);
			li90_nodes.forEach(detach);
			t341 = claim_space(ul34_nodes);
			li91 = claim_element(ul34_nodes, "LI", {});
			var li91_nodes = children(li91);
			t342 = claim_text(li91_nodes, "🔗 ");
			a53 = claim_element(li91_nodes, "A", { href: true, rel: true });
			var a53_nodes = children(a53);
			t343 = claim_text(a53_nodes, "http://developers.google.com/web/updates");
			a53_nodes.forEach(detach);
			li91_nodes.forEach(detach);
			t344 = claim_space(ul34_nodes);
			li92 = claim_element(ul34_nodes, "LI", {});
			var li92_nodes = children(li92);
			t345 = claim_text(li92_nodes, "🔗 ");
			a54 = claim_element(li92_nodes, "A", { href: true, rel: true });
			var a54_nodes = children(a54);
			t346 = claim_text(a54_nodes, "https://whatwebcando.today/");
			a54_nodes.forEach(detach);
			li92_nodes.forEach(detach);
			ul34_nodes.forEach(detach);
			t347 = claim_space(section7_nodes);
			p54 = claim_element(section7_nodes, "P", {});
			var p54_nodes = children(p54);
			t348 = claim_text(p54_nodes, "Check out these cool cats who made the web interactions that were showcased:");
			p54_nodes.forEach(detach);
			t349 = claim_space(section7_nodes);
			ul35 = claim_element(section7_nodes, "UL", {});
			var ul35_nodes = children(ul35);
			li93 = claim_element(ul35_nodes, "LI", {});
			var li93_nodes = children(li93);
			t350 = claim_text(li93_nodes, "A Century of Surface Temperature Anomalies by Aodhan Sweeney ");
			a55 = claim_element(li93_nodes, "A", { href: true, rel: true });
			var a55_nodes = children(a55);
			t351 = claim_text(a55_nodes, "http://students.washington.edu/aodhan/webgl_globe.html");
			a55_nodes.forEach(detach);
			li93_nodes.forEach(detach);
			t352 = claim_space(ul35_nodes);
			li94 = claim_element(ul35_nodes, "LI", {});
			var li94_nodes = children(li94);
			t353 = claim_text(li94_nodes, "Dr Who Dalek ring modulator by @BBCRD ");
			a56 = claim_element(li94_nodes, "A", { href: true, rel: true });
			var a56_nodes = children(a56);
			t354 = claim_text(a56_nodes, "https://webaudio.prototyping.bbc.co.uk");
			a56_nodes.forEach(detach);
			li94_nodes.forEach(detach);
			t355 = claim_space(ul35_nodes);
			li95 = claim_element(ul35_nodes, "LI", {});
			var li95_nodes = children(li95);
			t356 = claim_text(li95_nodes, "Creepy Mouth SVG by @shepazu ");
			a57 = claim_element(li95_nodes, "A", { href: true, rel: true });
			var a57_nodes = children(a57);
			t357 = claim_text(a57_nodes, "http://svg-whiz.com/svg/linguistics/theCreepyMouth.svg");
			a57_nodes.forEach(detach);
			li95_nodes.forEach(detach);
			ul35_nodes.forEach(detach);
			t358 = claim_space(section7_nodes);
			p55 = claim_element(section7_nodes, "P", {});
			var p55_nodes = children(p55);
			t359 = claim_text(p55_nodes, "Behind the scenes of his floating head in the talk Rolling on the floor laughing");
			p55_nodes.forEach(detach);
			t360 = claim_space(section7_nodes);
			p56 = claim_element(section7_nodes, "P", {});
			var p56_nodes = children(p56);
			a58 = claim_element(p56_nodes, "A", { href: true, rel: true });
			var a58_nodes = children(a58);
			t361 = claim_text(a58_nodes, "https://twitter.com/SvelteSociety/status/1318196128769134592?s=20");
			a58_nodes.forEach(detach);
			p56_nodes.forEach(detach);
			section7_nodes.forEach(detach);
			t362 = claim_space(nodes);
			section8 = claim_element(nodes, "SECTION", {});
			var section8_nodes = children(section8);
			h27 = claim_element(section8_nodes, "H2", {});
			var h27_nodes = children(h27);
			a59 = claim_element(h27_nodes, "A", { href: true, id: true });
			var a59_nodes = children(a59);
			t363 = claim_text(a59_nodes, "8️⃣ Introduction to Svite");
			a59_nodes.forEach(detach);
			h27_nodes.forEach(detach);
			t364 = claim_space(section8_nodes);
			p57 = claim_element(section8_nodes, "P", {});
			var p57_nodes = children(p57);
			t365 = claim_text(p57_nodes, "Dominik G introduce us to Svite, a Svelte integration for vite.");
			p57_nodes.forEach(detach);
			t366 = claim_space(section8_nodes);
			p58 = claim_element(section8_nodes, "P", {});
			var p58_nodes = children(p58);
			t367 = claim_text(p58_nodes, "He walked us through the 3 basic commands of svite");
			p58_nodes.forEach(detach);
			t368 = claim_space(section8_nodes);
			pre6 = claim_element(section8_nodes, "PRE", { class: true });
			var pre6_nodes = children(pre6);
			pre6_nodes.forEach(detach);
			t369 = claim_space(section8_nodes);
			p59 = claim_element(section8_nodes, "P", {});
			var p59_nodes = children(p59);
			t370 = claim_text(p59_nodes, "Svite supports hot-module reloading, and this is how fast it is");
			p59_nodes.forEach(detach);
			t371 = claim_space(section8_nodes);
			p60 = claim_element(section8_nodes, "P", {});
			var p60_nodes = children(p60);

			img6 = claim_element(p60_nodes, "IMG", {
				title: true,
				alt: true,
				"data-src": true,
				loading: true
			});

			p60_nodes.forEach(detach);
			t372 = claim_space(section8_nodes);
			p61 = claim_element(section8_nodes, "P", {});
			var p61_nodes = children(p61);
			t373 = claim_text(p61_nodes, "🛣 Roadmap");
			p61_nodes.forEach(detach);
			t374 = claim_space(section8_nodes);
			ul36 = claim_element(section8_nodes, "UL", {});
			var ul36_nodes = children(ul36);
			li96 = claim_element(ul36_nodes, "LI", {});
			var li96_nodes = children(li96);
			t375 = claim_text(li96_nodes, "prerender HTML after build");
			li96_nodes.forEach(detach);
			t376 = claim_space(ul36_nodes);
			li97 = claim_element(ul36_nodes, "LI", {});
			var li97_nodes = children(li97);
			t377 = claim_text(li97_nodes, "improved typescript support");
			li97_nodes.forEach(detach);
			t378 = claim_space(ul36_nodes);
			li98 = claim_element(ul36_nodes, "LI", {});
			var li98_nodes = children(li98);
			t379 = claim_text(li98_nodes, "template for library development");
			li98_nodes.forEach(detach);
			t380 = claim_space(ul36_nodes);
			li99 = claim_element(ul36_nodes, "LI", {});
			var li99_nodes = children(li99);
			t381 = claim_text(li99_nodes, "website and more documentation");
			li99_nodes.forEach(detach);
			t382 = claim_space(ul36_nodes);
			li100 = claim_element(ul36_nodes, "LI", {});
			var li100_nodes = children(li100);
			t383 = claim_text(li100_nodes, "or your next great idea");
			li100_nodes.forEach(detach);
			ul36_nodes.forEach(detach);
			t384 = claim_space(section8_nodes);
			p62 = claim_element(section8_nodes, "P", {});
			var p62_nodes = children(p62);
			t385 = claim_text(p62_nodes, "🔗 ");
			a60 = claim_element(p62_nodes, "A", { href: true, rel: true });
			var a60_nodes = children(a60);
			t386 = claim_text(a60_nodes, "https://github.com/dominikg/svite");
			a60_nodes.forEach(detach);
			p62_nodes.forEach(detach);
			section8_nodes.forEach(detach);
			t387 = claim_space(nodes);
			section9 = claim_element(nodes, "SECTION", {});
			var section9_nodes = children(section9);
			h28 = claim_element(section9_nodes, "H2", {});
			var h28_nodes = children(h28);
			a61 = claim_element(h28_nodes, "A", { href: true, id: true });
			var a61_nodes = children(a61);
			t388 = claim_text(a61_nodes, "9️⃣ Svelte Animations");
			a61_nodes.forEach(detach);
			h28_nodes.forEach(detach);
			t389 = claim_space(section9_nodes);
			p63 = claim_element(section9_nodes, "P", {});
			var p63_nodes = children(p63);
			a62 = claim_element(p63_nodes, "A", { href: true, rel: true });
			var a62_nodes = children(a62);
			t390 = claim_text(a62_nodes, "@mark_volkmann");
			a62_nodes.forEach(detach);
			t391 = claim_text(p63_nodes, " talked about transitions in svelte");
			p63_nodes.forEach(detach);
			t392 = claim_space(section9_nodes);
			p64 = claim_element(section9_nodes, "P", {});
			var p64_nodes = children(p64);
			t393 = claim_text(p64_nodes, "2 kinds of animations");
			p64_nodes.forEach(detach);
			t394 = claim_space(section9_nodes);
			ul39 = claim_element(section9_nodes, "UL", {});
			var ul39_nodes = children(ul39);
			li102 = claim_element(ul39_nodes, "LI", {});
			var li102_nodes = children(li102);
			t395 = claim_text(li102_nodes, "1️⃣ when an element is added or removed ");
			ul37 = claim_element(li102_nodes, "UL", {});
			var ul37_nodes = children(ul37);
			li101 = claim_element(ul37_nodes, "LI", {});
			var li101_nodes = children(li101);
			t396 = claim_text(li101_nodes, "eg: fade in when added, slide out when removed");
			li101_nodes.forEach(detach);
			ul37_nodes.forEach(detach);
			li102_nodes.forEach(detach);
			t397 = claim_space(ul39_nodes);
			li104 = claim_element(ul39_nodes, "LI", {});
			var li104_nodes = children(li104);
			t398 = claim_text(li104_nodes, "2️⃣ when a value changes");
			ul38 = claim_element(li104_nodes, "UL", {});
			var ul38_nodes = children(ul38);
			li103 = claim_element(ul38_nodes, "LI", {});
			var li103_nodes = children(li103);
			t399 = claim_text(li103_nodes, "eg: gradually change from current value to new value");
			li103_nodes.forEach(detach);
			ul38_nodes.forEach(detach);
			li104_nodes.forEach(detach);
			ul39_nodes.forEach(detach);
			t400 = claim_space(section9_nodes);
			p65 = claim_element(section9_nodes, "P", {});
			var p65_nodes = children(p65);
			t401 = claim_text(p65_nodes, "Easing functions");
			p65_nodes.forEach(detach);
			t402 = claim_space(section9_nodes);
			ul41 = claim_element(section9_nodes, "UL", {});
			var ul41_nodes = children(ul41);
			li105 = claim_element(ul41_nodes, "LI", {});
			var li105_nodes = children(li105);
			t403 = claim_text(li105_nodes, "animations can proceed at varying rates over duration");
			li105_nodes.forEach(detach);
			t404 = claim_space(ul41_nodes);
			li106 = claim_element(ul41_nodes, "LI", {});
			var li106_nodes = children(li106);
			t405 = claim_text(li106_nodes, "Ease visualiser ");
			a63 = claim_element(li106_nodes, "A", { href: true, rel: true });
			var a63_nodes = children(a63);
			t406 = claim_text(a63_nodes, "https://svelte.dev/examples#easing");
			a63_nodes.forEach(detach);
			li106_nodes.forEach(detach);
			t407 = claim_space(ul41_nodes);
			li110 = claim_element(ul41_nodes, "LI", {});
			var li110_nodes = children(li110);
			t408 = claim_text(li110_nodes, "easing names end with ");
			code11 = claim_element(li110_nodes, "CODE", {});
			var code11_nodes = children(code11);
			t409 = claim_text(code11_nodes, "In");
			code11_nodes.forEach(detach);
			t410 = claim_text(li110_nodes, ", ");
			code12 = claim_element(li110_nodes, "CODE", {});
			var code12_nodes = children(code12);
			t411 = claim_text(code12_nodes, "Out");
			code12_nodes.forEach(detach);
			t412 = claim_text(li110_nodes, ", ");
			code13 = claim_element(li110_nodes, "CODE", {});
			var code13_nodes = children(code13);
			t413 = claim_text(code13_nodes, "InOut");
			code13_nodes.forEach(detach);
			ul40 = claim_element(li110_nodes, "UL", {});
			var ul40_nodes = children(ul40);
			li107 = claim_element(ul40_nodes, "LI", {});
			var li107_nodes = children(li107);
			code14 = claim_element(li107_nodes, "CODE", {});
			var code14_nodes = children(code14);
			t414 = claim_text(code14_nodes, "In");
			code14_nodes.forEach(detach);
			t415 = claim_text(li107_nodes, " affects the beginning of a transition");
			li107_nodes.forEach(detach);
			t416 = claim_space(ul40_nodes);
			li108 = claim_element(ul40_nodes, "LI", {});
			var li108_nodes = children(li108);
			code15 = claim_element(li108_nodes, "CODE", {});
			var code15_nodes = children(code15);
			t417 = claim_text(code15_nodes, "Out");
			code15_nodes.forEach(detach);
			t418 = claim_text(li108_nodes, " affects the beginning of a transition");
			li108_nodes.forEach(detach);
			t419 = claim_space(ul40_nodes);
			li109 = claim_element(ul40_nodes, "LI", {});
			var li109_nodes = children(li109);
			code16 = claim_element(li109_nodes, "CODE", {});
			var code16_nodes = children(code16);
			t420 = claim_text(code16_nodes, "InOut");
			code16_nodes.forEach(detach);
			t421 = claim_text(li109_nodes, " affects the beginning and ending of a transition");
			li109_nodes.forEach(detach);
			ul40_nodes.forEach(detach);
			li110_nodes.forEach(detach);
			ul41_nodes.forEach(detach);
			t422 = claim_space(section9_nodes);
			p66 = claim_element(section9_nodes, "P", {});
			var p66_nodes = children(p66);
			t423 = claim_text(p66_nodes, "animate:flip");
			p66_nodes.forEach(detach);
			t424 = claim_space(section9_nodes);
			ul42 = claim_element(section9_nodes, "UL", {});
			var ul42_nodes = children(ul42);
			li111 = claim_element(ul42_nodes, "LI", {});
			var li111_nodes = children(li111);
			t425 = claim_text(li111_nodes, "moves element in an ");
			code17 = claim_element(li111_nodes, "CODE", {});
			var code17_nodes = children(code17);
			t426 = claim_text(code17_nodes, "{#each}");
			code17_nodes.forEach(detach);
			t427 = claim_text(li111_nodes, " block to the target location when it changes");
			li111_nodes.forEach(detach);
			t428 = claim_space(ul42_nodes);
			li112 = claim_element(ul42_nodes, "LI", {});
			var li112_nodes = children(li112);
			t429 = claim_text(li112_nodes, "like other transitions, accept custom ");
			code18 = claim_element(li112_nodes, "CODE", {});
			var code18_nodes = children(code18);
			t430 = claim_text(code18_nodes, "delay");
			code18_nodes.forEach(detach);
			t431 = claim_text(li112_nodes, ", ");
			code19 = claim_element(li112_nodes, "CODE", {});
			var code19_nodes = children(code19);
			t432 = claim_text(code19_nodes, "duration");
			code19_nodes.forEach(detach);
			t433 = claim_text(li112_nodes, ", ");
			code20 = claim_element(li112_nodes, "CODE", {});
			var code20_nodes = children(code20);
			t434 = claim_text(code20_nodes, "easing");
			code20_nodes.forEach(detach);
			li112_nodes.forEach(detach);
			ul42_nodes.forEach(detach);
			t435 = claim_space(section9_nodes);
			p67 = claim_element(section9_nodes, "P", {});
			var p67_nodes = children(p67);

			img7 = claim_element(p67_nodes, "IMG", {
				title: true,
				alt: true,
				"data-src": true,
				loading: true
			});

			p67_nodes.forEach(detach);
			t436 = claim_space(section9_nodes);
			p68 = claim_element(section9_nodes, "P", {});
			var p68_nodes = children(p68);
			a64 = claim_element(p68_nodes, "A", { href: true, rel: true });
			var a64_nodes = children(a64);
			t437 = claim_text(a64_nodes, "https://svelte.dev/repl/b4cceba5e8a14e379e1b07f47b792eef?version=3.26.0");
			a64_nodes.forEach(detach);
			p68_nodes.forEach(detach);
			t438 = claim_space(section9_nodes);
			p69 = claim_element(section9_nodes, "P", {});
			var p69_nodes = children(p69);
			code21 = claim_element(p69_nodes, "CODE", {});
			var code21_nodes = children(code21);
			t439 = claim_text(code21_nodes, "svelte/motion");
			code21_nodes.forEach(detach);
			p69_nodes.forEach(detach);
			t440 = claim_space(section9_nodes);
			ul43 = claim_element(section9_nodes, "UL", {});
			var ul43_nodes = children(ul43);
			li113 = claim_element(ul43_nodes, "LI", {});
			var li113_nodes = children(li113);
			code22 = claim_element(li113_nodes, "CODE", {});
			var code22_nodes = children(code22);
			t441 = claim_text(code22_nodes, "spring");
			code22_nodes.forEach(detach);
			t442 = claim_text(li113_nodes, " and ");
			code23 = claim_element(li113_nodes, "CODE", {});
			var code23_nodes = children(code23);
			t443 = claim_text(code23_nodes, "tweened");
			code23_nodes.forEach(detach);
			t444 = claim_text(li113_nodes, " allow you to create writable stores whose values animate from old to new values");
			li113_nodes.forEach(detach);
			ul43_nodes.forEach(detach);
			t445 = claim_space(section9_nodes);
			pre7 = claim_element(section9_nodes, "PRE", { class: true });
			var pre7_nodes = children(pre7);
			pre7_nodes.forEach(detach);
			t446 = claim_space(section9_nodes);
			p70 = claim_element(section9_nodes, "P", {});
			var p70_nodes = children(p70);

			img8 = claim_element(p70_nodes, "IMG", {
				title: true,
				alt: true,
				"data-src": true,
				loading: true
			});

			p70_nodes.forEach(detach);
			t447 = claim_space(section9_nodes);
			p71 = claim_element(section9_nodes, "P", {});
			var p71_nodes = children(p71);
			a65 = claim_element(p71_nodes, "A", { href: true, rel: true });
			var a65_nodes = children(a65);
			t448 = claim_text(a65_nodes, "https://svelte.dev/repl/2625cd905ee24bc0ba462ea6ab61284f?version=3.26.0");
			a65_nodes.forEach(detach);
			p71_nodes.forEach(detach);
			t449 = claim_space(section9_nodes);
			ul44 = claim_element(section9_nodes, "UL", {});
			var ul44_nodes = children(ul44);
			li114 = claim_element(ul44_nodes, "LI", {});
			var li114_nodes = children(li114);
			t450 = claim_text(li114_nodes, "custom interpolation function");
			li114_nodes.forEach(detach);
			ul44_nodes.forEach(detach);
			t451 = claim_space(section9_nodes);
			pre8 = claim_element(section9_nodes, "PRE", { class: true });
			var pre8_nodes = children(pre8);
			pre8_nodes.forEach(detach);
			t452 = claim_space(section9_nodes);
			p72 = claim_element(section9_nodes, "P", {});
			var p72_nodes = children(p72);
			a66 = claim_element(p72_nodes, "A", { href: true, rel: true });
			var a66_nodes = children(a66);
			t453 = claim_text(a66_nodes, "https://svelte.dev/repl/073c71dbdd9c4250b2ad5c9343e2e053?version=3.26.0");
			a66_nodes.forEach(detach);
			p72_nodes.forEach(detach);
			t454 = claim_space(section9_nodes);
			p73 = claim_element(section9_nodes, "P", {});
			var p73_nodes = children(p73);
			t455 = claim_text(p73_nodes, "transitions");
			p73_nodes.forEach(detach);
			t456 = claim_space(section9_nodes);
			ul45 = claim_element(section9_nodes, "UL", {});
			var ul45_nodes = children(ul45);
			li115 = claim_element(ul45_nodes, "LI", {});
			var li115_nodes = children(li115);
			code24 = claim_element(li115_nodes, "CODE", {});
			var code24_nodes = children(code24);
			t457 = claim_text(code24_nodes, "blur");
			code24_nodes.forEach(detach);
			t458 = claim_text(li115_nodes, ", ");
			code25 = claim_element(li115_nodes, "CODE", {});
			var code25_nodes = children(code25);
			t459 = claim_text(code25_nodes, "draw");
			code25_nodes.forEach(detach);
			t460 = claim_text(li115_nodes, ", ");
			code26 = claim_element(li115_nodes, "CODE", {});
			var code26_nodes = children(code26);
			t461 = claim_text(code26_nodes, "fade");
			code26_nodes.forEach(detach);
			t462 = claim_text(li115_nodes, ", ");
			code27 = claim_element(li115_nodes, "CODE", {});
			var code27_nodes = children(code27);
			t463 = claim_text(code27_nodes, "fly");
			code27_nodes.forEach(detach);
			t464 = claim_text(li115_nodes, ", ");
			code28 = claim_element(li115_nodes, "CODE", {});
			var code28_nodes = children(code28);
			t465 = claim_text(code28_nodes, "scale");
			code28_nodes.forEach(detach);
			t466 = claim_text(li115_nodes, ", ");
			code29 = claim_element(li115_nodes, "CODE", {});
			var code29_nodes = children(code29);
			t467 = claim_text(code29_nodes, "slide");
			code29_nodes.forEach(detach);
			t468 = claim_text(li115_nodes, ", ");
			code30 = claim_element(li115_nodes, "CODE", {});
			var code30_nodes = children(code30);
			t469 = claim_text(code30_nodes, "crossfade");
			code30_nodes.forEach(detach);
			li115_nodes.forEach(detach);
			t470 = claim_space(ul45_nodes);
			li116 = claim_element(ul45_nodes, "LI", {});
			var li116_nodes = children(li116);
			t471 = claim_text(li116_nodes, "using directives, ");
			code31 = claim_element(li116_nodes, "CODE", {});
			var code31_nodes = children(code31);
			t472 = claim_text(code31_nodes, "in:");
			code31_nodes.forEach(detach);
			t473 = claim_text(li116_nodes, ", ");
			code32 = claim_element(li116_nodes, "CODE", {});
			var code32_nodes = children(code32);
			t474 = claim_text(code32_nodes, "out:");
			code32_nodes.forEach(detach);
			t475 = claim_text(li116_nodes, ", ");
			code33 = claim_element(li116_nodes, "CODE", {});
			var code33_nodes = children(code33);
			t476 = claim_text(code33_nodes, "transition:");
			code33_nodes.forEach(detach);
			li116_nodes.forEach(detach);
			t477 = claim_space(ul45_nodes);
			li117 = claim_element(ul45_nodes, "LI", {});
			var li117_nodes = children(li117);
			t478 = claim_text(li117_nodes, "apply to HTML element");
			li117_nodes.forEach(detach);
			ul45_nodes.forEach(detach);
			t479 = claim_space(section9_nodes);
			p74 = claim_element(section9_nodes, "P", {});
			var p74_nodes = children(p74);

			img9 = claim_element(p74_nodes, "IMG", {
				title: true,
				alt: true,
				"data-src": true,
				loading: true
			});

			p74_nodes.forEach(detach);
			t480 = claim_space(section9_nodes);
			p75 = claim_element(section9_nodes, "P", {});
			var p75_nodes = children(p75);
			code34 = claim_element(p75_nodes, "CODE", {});
			var code34_nodes = children(code34);
			t481 = claim_text(code34_nodes, "transition:draw");
			code34_nodes.forEach(detach);
			p75_nodes.forEach(detach);
			t482 = claim_space(section9_nodes);
			ul46 = claim_element(section9_nodes, "UL", {});
			var ul46_nodes = children(ul46);
			li118 = claim_element(ul46_nodes, "LI", {});
			var li118_nodes = children(li118);
			t483 = claim_text(li118_nodes, "for SVG ");
			code35 = claim_element(li118_nodes, "CODE", {});
			var code35_nodes = children(code35);
			t484 = claim_text(code35_nodes, "path");
			code35_nodes.forEach(detach);
			t485 = claim_text(li118_nodes, " element");
			li118_nodes.forEach(detach);
			ul46_nodes.forEach(detach);
			t486 = claim_space(section9_nodes);
			p76 = claim_element(section9_nodes, "P", {});
			var p76_nodes = children(p76);

			img10 = claim_element(p76_nodes, "IMG", {
				title: true,
				alt: true,
				"data-src": true,
				loading: true
			});

			p76_nodes.forEach(detach);
			t487 = claim_space(section9_nodes);
			p77 = claim_element(section9_nodes, "P", {});
			var p77_nodes = children(p77);
			a67 = claim_element(p77_nodes, "A", { href: true, rel: true });
			var a67_nodes = children(a67);
			t488 = claim_text(a67_nodes, "https://svelte.dev/repl/149a5c35040343daa9477e0d54412398?version=3.26.0");
			a67_nodes.forEach(detach);
			p77_nodes.forEach(detach);
			t489 = claim_space(section9_nodes);
			p78 = claim_element(section9_nodes, "P", {});
			var p78_nodes = children(p78);
			code36 = claim_element(p78_nodes, "CODE", {});
			var code36_nodes = children(code36);
			t490 = claim_text(code36_nodes, "crossfade");
			code36_nodes.forEach(detach);
			t491 = claim_text(p78_nodes, " transition");
			p78_nodes.forEach(detach);
			t492 = claim_space(section9_nodes);
			ul47 = claim_element(section9_nodes, "UL", {});
			var ul47_nodes = children(ul47);
			li119 = claim_element(ul47_nodes, "LI", {});
			var li119_nodes = children(li119);
			t493 = claim_text(li119_nodes, "creates ");
			code37 = claim_element(li119_nodes, "CODE", {});
			var code37_nodes = children(code37);
			t494 = claim_text(code37_nodes, "send");
			code37_nodes.forEach(detach);
			t495 = claim_text(li119_nodes, " and ");
			code38 = claim_element(li119_nodes, "CODE", {});
			var code38_nodes = children(code38);
			t496 = claim_text(code38_nodes, "receive");
			code38_nodes.forEach(detach);
			t497 = claim_text(li119_nodes, " transitions, used to coordinate movement of an element from one parent to another");
			li119_nodes.forEach(detach);
			ul47_nodes.forEach(detach);
			t498 = claim_space(section9_nodes);
			p79 = claim_element(section9_nodes, "P", {});
			var p79_nodes = children(p79);

			img11 = claim_element(p79_nodes, "IMG", {
				title: true,
				alt: true,
				"data-src": true,
				loading: true
			});

			t499 = claim_space(p79_nodes);
			a68 = claim_element(p79_nodes, "A", { href: true, rel: true });
			var a68_nodes = children(a68);
			t500 = claim_text(a68_nodes, "https://svelte.dev/repl/5fc4b5dd5dec49d2be3fa160693372ce?version=3.26.0");
			a68_nodes.forEach(detach);
			p79_nodes.forEach(detach);
			t501 = claim_space(section9_nodes);
			p80 = claim_element(section9_nodes, "P", {});
			var p80_nodes = children(p80);
			t502 = claim_text(p80_nodes, "Custom transitions");
			p80_nodes.forEach(detach);
			t503 = claim_space(section9_nodes);
			ul49 = claim_element(section9_nodes, "UL", {});
			var ul49_nodes = children(ul49);
			li120 = claim_element(ul49_nodes, "LI", {});
			var li120_nodes = children(li120);
			t504 = claim_text(li120_nodes, "a function that follows a few basic rules");
			li120_nodes.forEach(detach);
			t505 = claim_space(ul49_nodes);
			li121 = claim_element(ul49_nodes, "LI", {});
			var li121_nodes = children(li121);
			t506 = claim_text(li121_nodes, "take 2 arguments, the DOM node and the options");
			li121_nodes.forEach(detach);
			t507 = claim_space(ul49_nodes);
			li124 = claim_element(ul49_nodes, "LI", {});
			var li124_nodes = children(li124);
			t508 = claim_text(li124_nodes, "return an object whose properties include");
			ul48 = claim_element(li124_nodes, "UL", {});
			var ul48_nodes = children(ul48);
			li122 = claim_element(ul48_nodes, "LI", {});
			var li122_nodes = children(li122);
			t509 = claim_text(li122_nodes, "transition options");
			li122_nodes.forEach(detach);
			t510 = claim_space(ul48_nodes);
			li123 = claim_element(ul48_nodes, "LI", {});
			var li123_nodes = children(li123);
			t511 = claim_text(li123_nodes, "css method, which passed a time value between 0 and 1, and must return a string containing CSS properties to be applied to the DOM node for the time value");
			li123_nodes.forEach(detach);
			ul48_nodes.forEach(detach);
			li124_nodes.forEach(detach);
			t512 = claim_space(ul49_nodes);
			li125 = claim_element(ul49_nodes, "LI", {});
			var li125_nodes = children(li125);
			a69 = claim_element(li125_nodes, "A", { href: true, rel: true });
			var a69_nodes = children(a69);
			t513 = claim_text(a69_nodes, "https://svelte.dev/repl/082e308f9fe44bcb98621dab346c2e85?version=3.26.0");
			a69_nodes.forEach(detach);
			li125_nodes.forEach(detach);
			ul49_nodes.forEach(detach);
			t514 = claim_space(section9_nodes);
			pre9 = claim_element(section9_nodes, "PRE", { class: true });
			var pre9_nodes = children(pre9);
			pre9_nodes.forEach(detach);
			t515 = claim_space(section9_nodes);
			p81 = claim_element(section9_nodes, "P", {});
			var p81_nodes = children(p81);
			t516 = claim_text(p81_nodes, "Transition events");
			p81_nodes.forEach(detach);
			t517 = claim_space(section9_nodes);
			ul50 = claim_element(section9_nodes, "UL", {});
			var ul50_nodes = children(ul50);
			li126 = claim_element(ul50_nodes, "LI", {});
			var li126_nodes = children(li126);
			code39 = claim_element(li126_nodes, "CODE", {});
			var code39_nodes = children(code39);
			t518 = claim_text(code39_nodes, "introstart");
			code39_nodes.forEach(detach);
			t519 = claim_text(li126_nodes, " when an \"in\" transition begins");
			li126_nodes.forEach(detach);
			t520 = claim_space(ul50_nodes);
			li127 = claim_element(ul50_nodes, "LI", {});
			var li127_nodes = children(li127);
			code40 = claim_element(li127_nodes, "CODE", {});
			var code40_nodes = children(code40);
			t521 = claim_text(code40_nodes, "introend");
			code40_nodes.forEach(detach);
			t522 = claim_text(li127_nodes, " when an \"in\" transition ends");
			li127_nodes.forEach(detach);
			t523 = claim_space(ul50_nodes);
			li128 = claim_element(ul50_nodes, "LI", {});
			var li128_nodes = children(li128);
			code41 = claim_element(li128_nodes, "CODE", {});
			var code41_nodes = children(code41);
			t524 = claim_text(code41_nodes, "outrostart");
			code41_nodes.forEach(detach);
			t525 = claim_text(li128_nodes, " when an \"out\" transition begins");
			li128_nodes.forEach(detach);
			t526 = claim_space(ul50_nodes);
			li129 = claim_element(ul50_nodes, "LI", {});
			var li129_nodes = children(li129);
			code42 = claim_element(li129_nodes, "CODE", {});
			var code42_nodes = children(code42);
			t527 = claim_text(code42_nodes, "outroend");
			code42_nodes.forEach(detach);
			t528 = claim_text(li129_nodes, " when an \"out\" transition ends");
			li129_nodes.forEach(detach);
			ul50_nodes.forEach(detach);
			t529 = claim_space(section9_nodes);
			p82 = claim_element(section9_nodes, "P", {});
			var p82_nodes = children(p82);
			t530 = claim_text(p82_nodes, "Resources");
			p82_nodes.forEach(detach);
			t531 = claim_space(section9_nodes);
			ul51 = claim_element(section9_nodes, "UL", {});
			var ul51_nodes = children(ul51);
			li130 = claim_element(ul51_nodes, "LI", {});
			var li130_nodes = children(li130);
			t532 = claim_text(li130_nodes, "Slides ");
			a70 = claim_element(li130_nodes, "A", { href: true, rel: true });
			var a70_nodes = children(a70);
			t533 = claim_text(a70_nodes, "https://github.com/mvolkmann/talks/blob/master/svelte-animations.key.pdf");
			a70_nodes.forEach(detach);
			li130_nodes.forEach(detach);
			t534 = claim_space(ul51_nodes);
			li131 = claim_element(ul51_nodes, "LI", {});
			var li131_nodes = children(li131);
			t535 = claim_text(li131_nodes, "Mark Volkmann's book, Svelte and Sapper in Action ");
			a71 = claim_element(li131_nodes, "A", { href: true, rel: true });
			var a71_nodes = children(a71);
			t536 = claim_text(a71_nodes, "https://www.manning.com/books/svelte-and-sapper-in-action");
			a71_nodes.forEach(detach);
			li131_nodes.forEach(detach);
			ul51_nodes.forEach(detach);
			section9_nodes.forEach(detach);
			this.h();
		},
		h() {
			attr(a0, "href", "#the-zen-of-svelte");
			attr(a1, "href", "#prototyping-design-with-real-data-models");
			attr(a2, "href", "#how-does-svelte-s-crossfade-function-work");
			attr(a3, "href", "#zero-config-svelte-websites-with-plenti");
			attr(a4, "href", "#how-you-setup-data-visualization-with-svelte");
			attr(a5, "href", "#svelte-at-the-edge-powering-svelte-apps-with-cloudflare-workers");
			attr(a6, "href", "#svelte-la-mode");
			attr(a7, "href", "#introduction-to-svite");
			attr(a8, "href", "#svelte-animations");
			attr(ul0, "class", "sitemap");
			attr(ul0, "id", "sitemap");
			attr(ul0, "role", "navigation");
			attr(ul0, "aria-label", "Table of Contents");
			attr(a9, "href", "#the-zen-of-svelte");
			attr(a9, "id", "the-zen-of-svelte");
			attr(a10, "href", "http://twitter.com/mrgnw");
			attr(a10, "rel", "nofollow");
			attr(a11, "href", "https://twitter.com/feltcoop");
			attr(a11, "rel", "nofollow");
			attr(a12, "href", "https://github.com/feltcoop/why-svelte");
			attr(a12, "rel", "nofollow");
			attr(a13, "href", "https://www.python.org/dev/peps/pep-0020/");
			attr(a13, "rel", "nofollow");
			attr(a14, "href", "http://neopythonic.blogspot.com/2016/04/kings-day-speech.html");
			attr(a14, "rel", "nofollow");
			attr(a15, "href", "https://www.youtube.com/watch?v=AdNJ3fydeao");
			attr(a15, "rel", "nofollow");
			attr(a16, "href", "https://www.youtube.com/watch?v=7kn7NtlV6g0");
			attr(a16, "rel", "nofollow");
			attr(a17, "href", "https://www.youtube.com/watch?v=BzX4aTRPzno");
			attr(a17, "rel", "nofollow");
			attr(a18, "href", "https://www.youtube.com/channel/UCg6SQd5jnWo5Y70rZD9SQFA");
			attr(a18, "rel", "nofollow");
			attr(a19, "href", "http://svelte.dev/tutorial");
			attr(a19, "rel", "nofollow");
			attr(a20, "href", "https://github.com/sveltejs/template");
			attr(a20, "rel", "nofollow");
			attr(a21, "href", "https://github.com/sveltejs/sapper-template");
			attr(a21, "rel", "nofollow");
			attr(a22, "href", "https://madewithsvelte.com/");
			attr(a22, "rel", "nofollow");
			attr(a23, "href", "#prototyping-design-with-real-data-models");
			attr(a23, "id", "prototyping-design-with-real-data-models");
			attr(a24, "href", "https://twitter.com/d3sandoval");
			attr(a24, "rel", "nofollow");
			attr(a25, "href", "https://svelte.dev/blog/whats-new-in-svelte-october-2020");
			attr(a25, "rel", "nofollow");
			attr(a26, "href", "https://marketplace.visualstudio.com/items?itemName=svelte.svelte-vscode");
			attr(a26, "rel", "nofollow");
			attr(a27, "href", "https://github.com/d3sandoval/svelte-summit-example");
			attr(a27, "rel", "nofollow");
			attr(a28, "href", "#how-does-svelte-s-crossfade-function-work");
			attr(a28, "id", "how-does-svelte-s-crossfade-function-work");
			attr(a29, "href", "https://twitter.com/nicolodavis");
			attr(a29, "rel", "nofollow");
			attr(source0, "type", "image/webp");
			attr(source0, "srcset", __build_img_webp__0);
			attr(source1, "type", "image/jpeg");
			attr(source1, "srcset", __build_img__0);
			attr(img0, "title", "null");
			attr(img0, "alt", "crossfade-vanilla");
			attr(img0, "data-src", __build_img__0);
			attr(img0, "loading", "lazy");
			attr(source2, "type", "image/webp");
			attr(source2, "srcset", __build_img_webp__1);
			attr(source3, "type", "image/jpeg");
			attr(source3, "srcset", __build_img__1);
			attr(img1, "title", "null");
			attr(img1, "alt", "crossfade-if");
			attr(img1, "data-src", __build_img__1);
			attr(img1, "loading", "lazy");
			attr(pre0, "class", "language-svelte");
			attr(img2, "title", "null");
			attr(img2, "alt", "crossfade");
			attr(img2, "data-src", __build_img__2);
			attr(img2, "loading", "lazy");
			attr(pre1, "class", "language-svelte");
			attr(a30, "href", "https://twitter.com/boardgamelabapp");
			attr(a30, "rel", "nofollow");
			attr(a31, "href", "https://boardgamelab.app/");
			attr(a31, "rel", "nofollow");
			attr(img3, "title", "null");
			attr(img3, "alt", "real world example");
			attr(img3, "data-src", __build_img__3);
			attr(img3, "loading", "lazy");
			attr(a32, "href", "#zero-config-svelte-websites-with-plenti");
			attr(a32, "id", "zero-config-svelte-websites-with-plenti");
			attr(a33, "href", "https://twitter.com/jimafisk");
			attr(a33, "rel", "nofollow");
			attr(a34, "href", "https://plenti.co");
			attr(a34, "rel", "nofollow");
			attr(pre2, "class", "language-sh");
			attr(pre3, "class", "language-sh");
			attr(a35, "href", "#how-you-setup-data-visualization-with-svelte");
			attr(a35, "id", "how-you-setup-data-visualization-with-svelte");
			attr(a36, "href", "http://twitter.com/h_i_g_s_c_h");
			attr(a36, "rel", "nofollow");
			attr(img4, "title", "null");
			attr(img4, "alt", "modular");
			attr(img4, "data-src", __build_img__4);
			attr(img4, "loading", "lazy");
			attr(pre4, "class", "language-svelte");
			attr(img5, "title", "null");
			attr(img5, "alt", "transition");
			attr(img5, "data-src", __build_img__5);
			attr(img5, "loading", "lazy");
			attr(pre5, "class", "language-svelte");
			attr(a37, "href", "https://github.com/DFRLab/interference2020");
			attr(a37, "rel", "nofollow");
			attr(a38, "href", "https://interference2020.org");
			attr(a38, "rel", "nofollow");
			attr(a39, "href", "https://twitter.com/h_i_g_s_c_h");
			attr(a39, "rel", "nofollow");
			attr(a40, "href", "https://www.higsch.com/");
			attr(a40, "rel", "nofollow");
			attr(a41, "href", "https://twitter.com/h_i_g_s_c_h/status/1317963855201554433?s=20");
			attr(a41, "rel", "nofollow");
			attr(a42, "href", "#svelte-at-the-edge-powering-svelte-apps-with-cloudflare-workers");
			attr(a42, "id", "svelte-at-the-edge-powering-svelte-apps-with-cloudflare-workers");
			attr(a43, "href", "https://twitter.com/lukeed05");
			attr(a43, "rel", "nofollow");
			attr(a44, "href", "https://github.com/lukeed/svelte-ssr-worker");
			attr(a44, "rel", "nofollow");
			attr(a45, "href", "https://developers.cloudflare.com/workers/cli-wrangler");
			attr(a45, "rel", "nofollow");
			attr(a46, "href", "https://github.com/lukeed/cfw");
			attr(a46, "rel", "nofollow");
			attr(a47, "href", "https://github.com/lukeed/freshie");
			attr(a47, "rel", "nofollow");
			attr(a48, "href", "https://github.com/lukeed/cfw");
			attr(a48, "rel", "nofollow");
			attr(a49, "href", "https://github.com/lukeed/freshie");
			attr(a49, "rel", "nofollow");
			attr(a50, "href", "#svelte-la-mode");
			attr(a50, "id", "svelte-la-mode");
			attr(a51, "href", "https://twitter.com/ronvoluted");
			attr(a51, "rel", "nofollow");
			attr(a52, "href", "https://developer.mozilla.org/en-US/docs/Web/API");
			attr(a52, "rel", "nofollow");
			attr(a53, "href", "http://developers.google.com/web/updates");
			attr(a53, "rel", "nofollow");
			attr(a54, "href", "https://whatwebcando.today/");
			attr(a54, "rel", "nofollow");
			attr(a55, "href", "http://students.washington.edu/aodhan/webgl_globe.html");
			attr(a55, "rel", "nofollow");
			attr(a56, "href", "https://webaudio.prototyping.bbc.co.uk");
			attr(a56, "rel", "nofollow");
			attr(a57, "href", "http://svg-whiz.com/svg/linguistics/theCreepyMouth.svg");
			attr(a57, "rel", "nofollow");
			attr(a58, "href", "https://twitter.com/SvelteSociety/status/1318196128769134592?s=20");
			attr(a58, "rel", "nofollow");
			attr(a59, "href", "#introduction-to-svite");
			attr(a59, "id", "introduction-to-svite");
			attr(pre6, "class", "language-bash");
			attr(img6, "title", "null");
			attr(img6, "alt", "svite hmr");
			attr(img6, "data-src", __build_img__6);
			attr(img6, "loading", "lazy");
			attr(a60, "href", "https://github.com/dominikg/svite");
			attr(a60, "rel", "nofollow");
			attr(a61, "href", "#svelte-animations");
			attr(a61, "id", "svelte-animations");
			attr(a62, "href", "https://twitter.com/mark_volkmann");
			attr(a62, "rel", "nofollow");
			attr(a63, "href", "https://svelte.dev/examples#easing");
			attr(a63, "rel", "nofollow");
			attr(img7, "title", "null");
			attr(img7, "alt", "flip");
			attr(img7, "data-src", __build_img__7);
			attr(img7, "loading", "lazy");
			attr(a64, "href", "https://svelte.dev/repl/b4cceba5e8a14e379e1b07f47b792eef?version=3.26.0");
			attr(a64, "rel", "nofollow");
			attr(pre7, "class", "language-svelte");
			attr(img8, "title", "null");
			attr(img8, "alt", "tweened");
			attr(img8, "data-src", __build_img__8);
			attr(img8, "loading", "lazy");
			attr(a65, "href", "https://svelte.dev/repl/2625cd905ee24bc0ba462ea6ab61284f?version=3.26.0");
			attr(a65, "rel", "nofollow");
			attr(pre8, "class", "language-svelte");
			attr(a66, "href", "https://svelte.dev/repl/073c71dbdd9c4250b2ad5c9343e2e053?version=3.26.0");
			attr(a66, "rel", "nofollow");
			attr(img9, "title", "null");
			attr(img9, "alt", "transitions");
			attr(img9, "data-src", __build_img__9);
			attr(img9, "loading", "lazy");
			attr(img10, "title", "null");
			attr(img10, "alt", "draw");
			attr(img10, "data-src", __build_img__10);
			attr(img10, "loading", "lazy");
			attr(a67, "href", "https://svelte.dev/repl/149a5c35040343daa9477e0d54412398?version=3.26.0");
			attr(a67, "rel", "nofollow");
			attr(img11, "title", "null");
			attr(img11, "alt", "transition crossfade");
			attr(img11, "data-src", __build_img__11);
			attr(img11, "loading", "lazy");
			attr(a68, "href", "https://svelte.dev/repl/5fc4b5dd5dec49d2be3fa160693372ce?version=3.26.0");
			attr(a68, "rel", "nofollow");
			attr(a69, "href", "https://svelte.dev/repl/082e308f9fe44bcb98621dab346c2e85?version=3.26.0");
			attr(a69, "rel", "nofollow");
			attr(pre9, "class", "language-js");
			attr(a70, "href", "https://github.com/mvolkmann/talks/blob/master/svelte-animations.key.pdf");
			attr(a70, "rel", "nofollow");
			attr(a71, "href", "https://www.manning.com/books/svelte-and-sapper-in-action");
			attr(a71, "rel", "nofollow");
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
			append(ul0, li7);
			append(li7, a7);
			append(a7, t7);
			append(ul0, li8);
			append(li8, a8);
			append(a8, t8);
			insert(target, t9, anchor);
			insert(target, section1, anchor);
			append(section1, h20);
			append(h20, a9);
			append(a9, t10);
			append(section1, t11);
			append(section1, p0);
			append(p0, a10);
			append(a10, t12);
			append(p0, t13);
			append(section1, t14);
			append(section1, p1);
			append(p1, t15);
			append(p1, a11);
			append(a11, t16);
			append(p1, t17);
			append(p1, a12);
			append(a12, t18);
			append(p1, t19);
			append(section1, t20);
			append(section1, blockquote0);
			append(blockquote0, p2);
			append(p2, t21);
			append(p2, a13);
			append(a13, t22);
			append(p2, t23);
			append(section1, t24);
			append(section1, blockquote1);
			append(blockquote1, p3);
			append(p3, t25);
			append(blockquote1, t26);
			append(blockquote1, ul1);
			append(ul1, li9);
			append(li9, t27);
			append(li9, a14);
			append(a14, t28);
			append(li9, t29);
			append(section1, t30);
			append(section1, blockquote2);
			append(blockquote2, p4);
			append(p4, t31);
			append(blockquote2, t32);
			append(blockquote2, ul2);
			append(ul2, li10);
			append(li10, t33);
			append(li10, a15);
			append(a15, t34);
			append(section1, t35);
			append(section1, blockquote3);
			append(blockquote3, p5);
			append(p5, t36);
			append(blockquote3, t37);
			append(blockquote3, ul3);
			append(ul3, li11);
			append(li11, t38);
			append(li11, a16);
			append(a16, t39);
			append(section1, t40);
			append(section1, blockquote4);
			append(blockquote4, p6);
			append(p6, t41);
			append(section1, t42);
			append(section1, ul4);
			append(ul4, li12);
			append(li12, t43);
			append(li12, a17);
			append(a17, t44);
			append(section1, t45);
			append(section1, p7);
			append(p7, t46);
			append(section1, t47);
			append(section1, ul5);
			append(ul5, li13);
			append(li13, t48);
			append(ul5, t49);
			append(ul5, li14);
			append(li14, t50);
			append(section1, t51);
			append(section1, p8);
			append(p8, strong0);
			append(strong0, t52);
			append(section1, t53);
			append(section1, ul6);
			append(ul6, li15);
			append(li15, t54);
			append(li15, a18);
			append(a18, t55);
			append(ul6, t56);
			append(ul6, li16);
			append(li16, t57);
			append(li16, a19);
			append(a19, t58);
			append(ul6, t59);
			append(ul6, li17);
			append(li17, t60);
			append(li17, a20);
			append(a20, t61);
			append(li17, t62);
			append(li17, a21);
			append(a21, t63);
			append(ul6, t64);
			append(ul6, li18);
			append(li18, t65);
			append(li18, a22);
			append(a22, t66);
			append(section1, t67);
			append(section1, blockquote5);
			append(blockquote5, p9);
			append(p9, t68);
			insert(target, t69, anchor);
			insert(target, section2, anchor);
			append(section2, h21);
			append(h21, a23);
			append(a23, t70);
			append(section2, t71);
			append(section2, p10);
			append(p10, a24);
			append(a24, t72);
			append(p10, t73);
			append(section2, t74);
			append(section2, p11);
			append(p11, t75);
			append(p11, a25);
			append(a25, t76);
			append(section2, t77);
			append(section2, p12);
			append(p12, t78);
			append(section2, t79);
			append(section2, ul7);
			append(ul7, li19);
			append(li19, t80);
			append(ul7, t81);
			append(ul7, li20);
			append(li20, t82);
			append(ul7, t83);
			append(ul7, li21);
			append(li21, t84);
			append(section2, t85);
			append(section2, p13);
			append(p13, t86);
			append(section2, t87);
			append(section2, ul8);
			append(ul8, li22);
			append(li22, t88);
			append(li22, a26);
			append(a26, t89);
			append(ul8, t90);
			append(ul8, li23);
			append(li23, t91);
			append(li23, a27);
			append(a27, t92);
			append(section2, t93);
			append(section2, blockquote6);
			append(blockquote6, p14);
			append(p14, t94);
			insert(target, t95, anchor);
			insert(target, section3, anchor);
			append(section3, h22);
			append(h22, a28);
			append(a28, t96);
			append(section3, t97);
			append(section3, p15);
			append(p15, a29);
			append(a29, t98);
			append(section3, t99);
			append(section3, ul9);
			append(ul9, li24);
			append(li24, t100);
			append(ul9, t101);
			append(ul9, li25);
			append(li25, t102);
			append(ul9, t103);
			append(ul9, li26);
			append(li26, t104);
			append(section3, t105);
			append(section3, p16);
			append(p16, picture0);
			append(picture0, source0);
			append(picture0, source1);
			append(picture0, img0);
			append(section3, t106);
			append(section3, p17);
			append(p17, t107);
			append(section3, t108);
			append(section3, ul10);
			append(ul10, li27);
			append(li27, t109);
			append(ul10, t110);
			append(ul10, li28);
			append(li28, t111);
			append(ul10, t112);
			append(ul10, li29);
			append(li29, t113);
			append(section3, t114);
			append(section3, p18);
			append(p18, picture1);
			append(picture1, source2);
			append(picture1, source3);
			append(picture1, img1);
			append(section3, t115);
			append(section3, p19);
			append(p19, t116);
			append(section3, t117);
			append(section3, ul11);
			append(ul11, li30);
			append(li30, t118);
			append(li30, code0);
			append(code0, t119);
			append(ul11, t120);
			append(ul11, li31);
			append(li31, t121);
			append(li31, code1);
			append(code1, t122);
			append(section3, t123);
			append(section3, p20);
			append(p20, t124);
			append(section3, t125);
			append(section3, pre0);
			pre0.innerHTML = raw0_value;
			append(section3, t126);
			append(section3, ul12);
			append(ul12, li32);
			append(li32, t127);
			append(ul12, t128);
			append(ul12, li33);
			append(li33, t129);
			append(ul12, t130);
			append(ul12, li34);
			append(li34, t131);
			append(ul12, t132);
			append(ul12, li35);
			append(li35, t133);
			append(section3, t134);
			append(section3, p21);
			append(p21, img2);
			append(section3, t135);
			append(section3, ul13);
			append(ul13, li36);
			append(li36, t136);
			append(li36, code2);
			append(code2, t137);
			append(li36, t138);
			append(li36, code3);
			append(code3, t139);
			append(ul13, t140);
			append(ul13, li37);
			append(li37, t141);
			append(li37, code4);
			append(code4, t142);
			append(li37, t143);
			append(li37, code5);
			append(code5, t144);
			append(ul13, t145);
			append(ul13, li38);
			append(li38, t146);
			append(section3, t147);
			append(section3, pre1);
			pre1.innerHTML = raw1_value;
			append(section3, t148);
			append(section3, p22);
			append(p22, t149);
			append(p22, a30);
			append(a30, t150);
			append(p22, t151);
			append(p22, a31);
			append(a31, t152);
			append(p22, t153);
			append(section3, t154);
			append(section3, p23);
			append(p23, img3);
			insert(target, t155, anchor);
			insert(target, section4, anchor);
			append(section4, h23);
			append(h23, a32);
			append(a32, t156);
			append(section4, t157);
			append(section4, p24);
			append(p24, a33);
			append(a33, t158);
			append(p24, t159);
			append(p24, a34);
			append(a34, t160);
			append(p24, t161);
			append(section4, t162);
			append(section4, p25);
			append(p25, strong1);
			append(strong1, t163);
			append(section4, t164);
			append(section4, ul14);
			append(ul14, li39);
			append(li39, t165);
			append(ul14, t166);
			append(ul14, li40);
			append(li40, t167);
			append(ul14, t168);
			append(ul14, li41);
			append(li41, t169);
			append(ul14, t170);
			append(ul14, li42);
			append(li42, t171);
			append(ul14, t172);
			append(ul14, li43);
			append(li43, t173);
			append(ul14, t174);
			append(ul14, li44);
			append(li44, t175);
			append(ul14, t176);
			append(ul14, li45);
			append(li45, t177);
			append(ul14, t178);
			append(ul14, li46);
			append(li46, t179);
			append(section4, t180);
			append(section4, p26);
			append(p26, strong2);
			append(strong2, t181);
			append(section4, t182);
			append(section4, ul15);
			append(ul15, li47);
			append(li47, t183);
			append(ul15, t184);
			append(ul15, li48);
			append(li48, t185);
			append(section4, t186);
			append(section4, pre2);
			pre2.innerHTML = raw2_value;
			append(section4, t187);
			append(section4, p27);
			append(p27, strong3);
			append(strong3, t188);
			append(section4, t189);
			append(section4, pre3);
			pre3.innerHTML = raw3_value;
			append(section4, t190);
			append(section4, blockquote7);
			append(blockquote7, p28);
			append(p28, t191);
			insert(target, t192, anchor);
			insert(target, section5, anchor);
			append(section5, h24);
			append(h24, a35);
			append(a35, t193);
			append(section5, t194);
			append(section5, p29);
			append(p29, a36);
			append(a36, t195);
			append(p29, t196);
			append(section5, t197);
			append(section5, p30);
			append(p30, t198);
			append(section5, t199);
			append(section5, ul16);
			append(ul16, li49);
			append(li49, t200);
			append(ul16, t201);
			append(ul16, li50);
			append(li50, t202);
			append(section5, t203);
			append(section5, p31);
			append(p31, t204);
			append(section5, t205);
			append(section5, p32);
			append(p32, strong4);
			append(strong4, t206);
			append(section5, t207);
			append(section5, ul17);
			append(ul17, li51);
			append(li51, t208);
			append(section5, t209);
			append(section5, p33);
			append(p33, img4);
			append(section5, t210);
			append(section5, p34);
			append(p34, strong5);
			append(strong5, t211);
			append(section5, t212);
			append(section5, ul18);
			append(ul18, li52);
			append(li52, t213);
			append(ul18, t214);
			append(ul18, li53);
			append(li53, t215);
			append(li53, code6);
			append(code6, t216);
			append(li53, t217);
			append(li53, code7);
			append(code7, t218);
			append(section5, t219);
			append(section5, pre4);
			pre4.innerHTML = raw4_value;
			append(section5, t220);
			append(section5, p35);
			append(p35, img5);
			append(section5, t221);
			append(section5, p36);
			append(p36, strong6);
			append(strong6, t222);
			append(section5, t223);
			append(section5, ul19);
			append(ul19, li54);
			append(li54, t224);
			append(ul19, t225);
			append(ul19, li55);
			append(li55, t226);
			append(section5, t227);
			append(section5, pre5);
			pre5.innerHTML = raw5_value;
			append(section5, t228);
			append(section5, p37);
			append(p37, t229);
			append(section5, t230);
			append(section5, ul20);
			append(ul20, li56);
			append(li56, t231);
			append(li56, a37);
			append(a37, t232);
			append(ul20, t233);
			append(ul20, li57);
			append(li57, t234);
			append(li57, a38);
			append(a38, t235);
			append(ul20, t236);
			append(ul20, li58);
			append(li58, t237);
			append(li58, a39);
			append(a39, t238);
			append(ul20, t239);
			append(ul20, li59);
			append(li59, t240);
			append(li59, a40);
			append(a40, t241);
			append(section5, t242);
			append(section5, p38);
			append(p38, a41);
			append(a41, t243);
			insert(target, t244, anchor);
			insert(target, section6, anchor);
			append(section6, h25);
			append(h25, a42);
			append(a42, t245);
			append(section6, t246);
			append(section6, p39);
			append(p39, a43);
			append(a43, t247);
			append(p39, t248);
			append(section6, t249);
			append(section6, p40);
			append(p40, t250);
			append(section6, t251);
			append(section6, ul25);
			append(ul25, li61);
			append(li61, t252);
			append(li61, ul21);
			append(ul21, li60);
			append(li60, t253);
			append(ul25, t254);
			append(ul25, li63);
			append(li63, t255);
			append(li63, ul22);
			append(ul22, li62);
			append(li62, t256);
			append(ul25, t257);
			append(ul25, li66);
			append(li66, t258);
			append(li66, ul23);
			append(ul23, li64);
			append(li64, t259);
			append(ul23, t260);
			append(ul23, li65);
			append(li65, t261);
			append(ul25, t262);
			append(ul25, li69);
			append(li69, t263);
			append(li69, ul24);
			append(ul24, li67);
			append(li67, t264);
			append(ul24, t265);
			append(ul24, li68);
			append(li68, t266);
			append(section6, t267);
			append(section6, p41);
			append(p41, t268);
			append(section6, t269);
			append(section6, ul26);
			append(ul26, li70);
			append(li70, t270);
			append(ul26, t271);
			append(ul26, li71);
			append(li71, t272);
			append(ul26, t273);
			append(ul26, li72);
			append(li72, t274);
			append(section6, t275);
			append(section6, p42);
			append(p42, t276);
			append(section6, t277);
			append(section6, ul29);
			append(ul29, li74);
			append(li74, t278);
			append(li74, ul27);
			append(ul27, li73);
			append(li73, t279);
			append(ul29, t280);
			append(ul29, li77);
			append(li77, t281);
			append(li77, ul28);
			append(ul28, li75);
			append(li75, t282);
			append(ul28, t283);
			append(ul28, li76);
			append(li76, t284);
			append(section6, t285);
			append(section6, p43);
			append(p43, t286);
			append(section6, t287);
			append(section6, ul31);
			append(ul31, li78);
			append(li78, code8);
			append(code8, t288);
			append(li78, t289);
			append(ul31, t290);
			append(ul31, li79);
			append(li79, t291);
			append(ul31, t292);
			append(ul31, li82);
			append(li82, t293);
			append(li82, ul30);
			append(ul30, li80);
			append(li80, t294);
			append(ul30, t295);
			append(ul30, li81);
			append(li81, code9);
			append(code9, t296);
			append(section6, t297);
			append(section6, p44);
			append(p44, a44);
			append(a44, t298);
			append(section6, t299);
			append(section6, p45);
			append(p45, t300);
			append(section6, t301);
			append(section6, ul32);
			append(ul32, li83);
			append(li83, a45);
			append(a45, t302);
			append(ul32, t303);
			append(ul32, li84);
			append(li84, a46);
			append(a46, t304);
			append(ul32, t305);
			append(ul32, li85);
			append(li85, a47);
			append(a47, t306);
			append(section6, t307);
			append(section6, p46);
			append(p46, a48);
			append(a48, t308);
			append(p46, t309);
			append(section6, t310);
			append(section6, p47);
			append(p47, a49);
			append(a49, t311);
			append(section6, t312);
			append(section6, p48);
			append(p48, t313);
			insert(target, t314, anchor);
			insert(target, section7, anchor);
			append(section7, h26);
			append(h26, a50);
			append(a50, t315);
			append(section7, t316);
			append(section7, p49);
			append(p49, t317);
			append(p49, a51);
			append(a51, t318);
			append(p49, t319);
			append(section7, t320);
			append(section7, p50);
			append(p50, t321);
			append(section7, t322);
			append(section7, p51);
			append(p51, t323);
			append(section7, t324);
			append(section7, p52);
			append(p52, t325);
			append(section7, t326);
			append(section7, ul33);
			append(ul33, li86);
			append(li86, t327);
			append(ul33, t328);
			append(ul33, li87);
			append(li87, t329);
			append(ul33, t330);
			append(ul33, li88);
			append(li88, t331);
			append(ul33, t332);
			append(ul33, li89);
			append(li89, t333);
			append(li89, code10);
			append(code10, t334);
			append(li89, t335);
			append(section7, t336);
			append(section7, p53);
			append(p53, t337);
			append(section7, t338);
			append(section7, ul34);
			append(ul34, li90);
			append(li90, t339);
			append(li90, a52);
			append(a52, t340);
			append(ul34, t341);
			append(ul34, li91);
			append(li91, t342);
			append(li91, a53);
			append(a53, t343);
			append(ul34, t344);
			append(ul34, li92);
			append(li92, t345);
			append(li92, a54);
			append(a54, t346);
			append(section7, t347);
			append(section7, p54);
			append(p54, t348);
			append(section7, t349);
			append(section7, ul35);
			append(ul35, li93);
			append(li93, t350);
			append(li93, a55);
			append(a55, t351);
			append(ul35, t352);
			append(ul35, li94);
			append(li94, t353);
			append(li94, a56);
			append(a56, t354);
			append(ul35, t355);
			append(ul35, li95);
			append(li95, t356);
			append(li95, a57);
			append(a57, t357);
			append(section7, t358);
			append(section7, p55);
			append(p55, t359);
			append(section7, t360);
			append(section7, p56);
			append(p56, a58);
			append(a58, t361);
			insert(target, t362, anchor);
			insert(target, section8, anchor);
			append(section8, h27);
			append(h27, a59);
			append(a59, t363);
			append(section8, t364);
			append(section8, p57);
			append(p57, t365);
			append(section8, t366);
			append(section8, p58);
			append(p58, t367);
			append(section8, t368);
			append(section8, pre6);
			pre6.innerHTML = raw6_value;
			append(section8, t369);
			append(section8, p59);
			append(p59, t370);
			append(section8, t371);
			append(section8, p60);
			append(p60, img6);
			append(section8, t372);
			append(section8, p61);
			append(p61, t373);
			append(section8, t374);
			append(section8, ul36);
			append(ul36, li96);
			append(li96, t375);
			append(ul36, t376);
			append(ul36, li97);
			append(li97, t377);
			append(ul36, t378);
			append(ul36, li98);
			append(li98, t379);
			append(ul36, t380);
			append(ul36, li99);
			append(li99, t381);
			append(ul36, t382);
			append(ul36, li100);
			append(li100, t383);
			append(section8, t384);
			append(section8, p62);
			append(p62, t385);
			append(p62, a60);
			append(a60, t386);
			insert(target, t387, anchor);
			insert(target, section9, anchor);
			append(section9, h28);
			append(h28, a61);
			append(a61, t388);
			append(section9, t389);
			append(section9, p63);
			append(p63, a62);
			append(a62, t390);
			append(p63, t391);
			append(section9, t392);
			append(section9, p64);
			append(p64, t393);
			append(section9, t394);
			append(section9, ul39);
			append(ul39, li102);
			append(li102, t395);
			append(li102, ul37);
			append(ul37, li101);
			append(li101, t396);
			append(ul39, t397);
			append(ul39, li104);
			append(li104, t398);
			append(li104, ul38);
			append(ul38, li103);
			append(li103, t399);
			append(section9, t400);
			append(section9, p65);
			append(p65, t401);
			append(section9, t402);
			append(section9, ul41);
			append(ul41, li105);
			append(li105, t403);
			append(ul41, t404);
			append(ul41, li106);
			append(li106, t405);
			append(li106, a63);
			append(a63, t406);
			append(ul41, t407);
			append(ul41, li110);
			append(li110, t408);
			append(li110, code11);
			append(code11, t409);
			append(li110, t410);
			append(li110, code12);
			append(code12, t411);
			append(li110, t412);
			append(li110, code13);
			append(code13, t413);
			append(li110, ul40);
			append(ul40, li107);
			append(li107, code14);
			append(code14, t414);
			append(li107, t415);
			append(ul40, t416);
			append(ul40, li108);
			append(li108, code15);
			append(code15, t417);
			append(li108, t418);
			append(ul40, t419);
			append(ul40, li109);
			append(li109, code16);
			append(code16, t420);
			append(li109, t421);
			append(section9, t422);
			append(section9, p66);
			append(p66, t423);
			append(section9, t424);
			append(section9, ul42);
			append(ul42, li111);
			append(li111, t425);
			append(li111, code17);
			append(code17, t426);
			append(li111, t427);
			append(ul42, t428);
			append(ul42, li112);
			append(li112, t429);
			append(li112, code18);
			append(code18, t430);
			append(li112, t431);
			append(li112, code19);
			append(code19, t432);
			append(li112, t433);
			append(li112, code20);
			append(code20, t434);
			append(section9, t435);
			append(section9, p67);
			append(p67, img7);
			append(section9, t436);
			append(section9, p68);
			append(p68, a64);
			append(a64, t437);
			append(section9, t438);
			append(section9, p69);
			append(p69, code21);
			append(code21, t439);
			append(section9, t440);
			append(section9, ul43);
			append(ul43, li113);
			append(li113, code22);
			append(code22, t441);
			append(li113, t442);
			append(li113, code23);
			append(code23, t443);
			append(li113, t444);
			append(section9, t445);
			append(section9, pre7);
			pre7.innerHTML = raw7_value;
			append(section9, t446);
			append(section9, p70);
			append(p70, img8);
			append(section9, t447);
			append(section9, p71);
			append(p71, a65);
			append(a65, t448);
			append(section9, t449);
			append(section9, ul44);
			append(ul44, li114);
			append(li114, t450);
			append(section9, t451);
			append(section9, pre8);
			pre8.innerHTML = raw8_value;
			append(section9, t452);
			append(section9, p72);
			append(p72, a66);
			append(a66, t453);
			append(section9, t454);
			append(section9, p73);
			append(p73, t455);
			append(section9, t456);
			append(section9, ul45);
			append(ul45, li115);
			append(li115, code24);
			append(code24, t457);
			append(li115, t458);
			append(li115, code25);
			append(code25, t459);
			append(li115, t460);
			append(li115, code26);
			append(code26, t461);
			append(li115, t462);
			append(li115, code27);
			append(code27, t463);
			append(li115, t464);
			append(li115, code28);
			append(code28, t465);
			append(li115, t466);
			append(li115, code29);
			append(code29, t467);
			append(li115, t468);
			append(li115, code30);
			append(code30, t469);
			append(ul45, t470);
			append(ul45, li116);
			append(li116, t471);
			append(li116, code31);
			append(code31, t472);
			append(li116, t473);
			append(li116, code32);
			append(code32, t474);
			append(li116, t475);
			append(li116, code33);
			append(code33, t476);
			append(ul45, t477);
			append(ul45, li117);
			append(li117, t478);
			append(section9, t479);
			append(section9, p74);
			append(p74, img9);
			append(section9, t480);
			append(section9, p75);
			append(p75, code34);
			append(code34, t481);
			append(section9, t482);
			append(section9, ul46);
			append(ul46, li118);
			append(li118, t483);
			append(li118, code35);
			append(code35, t484);
			append(li118, t485);
			append(section9, t486);
			append(section9, p76);
			append(p76, img10);
			append(section9, t487);
			append(section9, p77);
			append(p77, a67);
			append(a67, t488);
			append(section9, t489);
			append(section9, p78);
			append(p78, code36);
			append(code36, t490);
			append(p78, t491);
			append(section9, t492);
			append(section9, ul47);
			append(ul47, li119);
			append(li119, t493);
			append(li119, code37);
			append(code37, t494);
			append(li119, t495);
			append(li119, code38);
			append(code38, t496);
			append(li119, t497);
			append(section9, t498);
			append(section9, p79);
			append(p79, img11);
			append(p79, t499);
			append(p79, a68);
			append(a68, t500);
			append(section9, t501);
			append(section9, p80);
			append(p80, t502);
			append(section9, t503);
			append(section9, ul49);
			append(ul49, li120);
			append(li120, t504);
			append(ul49, t505);
			append(ul49, li121);
			append(li121, t506);
			append(ul49, t507);
			append(ul49, li124);
			append(li124, t508);
			append(li124, ul48);
			append(ul48, li122);
			append(li122, t509);
			append(ul48, t510);
			append(ul48, li123);
			append(li123, t511);
			append(ul49, t512);
			append(ul49, li125);
			append(li125, a69);
			append(a69, t513);
			append(section9, t514);
			append(section9, pre9);
			pre9.innerHTML = raw9_value;
			append(section9, t515);
			append(section9, p81);
			append(p81, t516);
			append(section9, t517);
			append(section9, ul50);
			append(ul50, li126);
			append(li126, code39);
			append(code39, t518);
			append(li126, t519);
			append(ul50, t520);
			append(ul50, li127);
			append(li127, code40);
			append(code40, t521);
			append(li127, t522);
			append(ul50, t523);
			append(ul50, li128);
			append(li128, code41);
			append(code41, t524);
			append(li128, t525);
			append(ul50, t526);
			append(ul50, li129);
			append(li129, code42);
			append(code42, t527);
			append(li129, t528);
			append(section9, t529);
			append(section9, p82);
			append(p82, t530);
			append(section9, t531);
			append(section9, ul51);
			append(ul51, li130);
			append(li130, t532);
			append(li130, a70);
			append(a70, t533);
			append(ul51, t534);
			append(ul51, li131);
			append(li131, t535);
			append(li131, a71);
			append(a71, t536);
		},
		p: noop,
		d(detaching) {
			if (detaching) detach(section0);
			if (detaching) detach(t9);
			if (detaching) detach(section1);
			if (detaching) detach(t69);
			if (detaching) detach(section2);
			if (detaching) detach(t95);
			if (detaching) detach(section3);
			if (detaching) detach(t155);
			if (detaching) detach(section4);
			if (detaching) detach(t192);
			if (detaching) detach(section5);
			if (detaching) detach(t244);
			if (detaching) detach(section6);
			if (detaching) detach(t314);
			if (detaching) detach(section7);
			if (detaching) detach(t362);
			if (detaching) detach(section8);
			if (detaching) detach(t387);
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
	"title": "Svelte Summit 2020 Summary",
	"tags": ["svelte", "conference"],
	"slug": "notes/svelte-summit-2020-summary",
	"type": "notes",
	"name": "svelte-summit-2020-summary",
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
