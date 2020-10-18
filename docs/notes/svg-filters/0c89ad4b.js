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
function action_destroyer(action_result) {
    return action_result && is_function(action_result.destroy) ? action_result.destroy : noop;
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
function listen(node, event, handler, options) {
    node.addEventListener(event, handler, options);
    return () => node.removeEventListener(event, handler, options);
}
function attr(node, attribute, value) {
    if (value == null)
        node.removeAttribute(attribute);
    else if (node.getAttribute(attribute) !== value)
        node.setAttribute(attribute, value);
}
function to_number(value) {
    return value === '' ? undefined : +value;
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
function set_input_value(input, value) {
    input.value = value == null ? '' : value;
}
function set_style(node, key, value, important) {
    node.style.setProperty(key, value, important ? 'important' : '');
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

var __build_img__18 = "4a80bfb52a6aebf0.gif";

var __build_img__17 = "8f1e1a2d1be8770f.gif";

var __build_img__16 = "067a84843b246200.gif";

var __build_img_webp__15 = "9a13eb4b9b06160b.webp";

var __build_img__15 = "9a13eb4b9b06160b.png";

var __build_img_webp__14 = "a98065268ec41c1f.webp";

var __build_img__14 = "a98065268ec41c1f.png";

var __build_img_webp__13 = "bdd747d7ecb59460.webp";

var __build_img__13 = "bdd747d7ecb59460.png";

var __build_img_webp__12 = "43a9e9dc5ed26d98.webp";

var __build_img__12 = "43a9e9dc5ed26d98.png";

var __build_img_webp__11 = "6baab518756be78e.webp";

var __build_img__11 = "6baab518756be78e.png";

var __build_img_webp__10 = "b150743b60631123.webp";

var __build_img__10 = "b150743b60631123.png";

var __build_img_webp__9 = "d1e7d15ad25cb832.webp";

var __build_img__9 = "d1e7d15ad25cb832.png";

var __build_img_webp__8 = "748140ca3f00989a.webp";

var __build_img__8 = "748140ca3f00989a.png";

var __build_img_webp__7 = "e3917c5feb79a558.webp";

var __build_img__7 = "e3917c5feb79a558.png";

var __build_img_webp__6 = "3cf77cf408da38cd.webp";

var __build_img__6 = "3cf77cf408da38cd.png";

var __build_img_webp__5 = "4b225a4c4286bfc5.webp";

var __build_img__5 = "4b225a4c4286bfc5.png";

var __build_img_webp__4 = "f157786df0a1c183.webp";

var __build_img__4 = "f157786df0a1c183.png";

var __build_img_webp__3 = "66be419a66ca9e4c.webp";

var __build_img__3 = "66be419a66ca9e4c.png";

var __build_img_webp__2 = "891d4bbd44dfa9ef.webp";

var __build_img__2 = "891d4bbd44dfa9ef.png";

var __build_img_webp__1 = "6c59a6820e28923a.webp";

var __build_img__1 = "6c59a6820e28923a.png";

var __build_img_webp__0 = "b96b9552ac226c8b.webp";

var __build_img__0 = "b96b9552ac226c8b.png";

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

var baseCss = "https://lihautan.com/notes/svg-filters/assets/blog-base-3554d53c.css";

var image = "https://lihautan.com/notes/svg-filters/assets/hero-twitter-2dee70e6.jpg";

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
			attr(meta8, "content", "https%3A%2F%2Flihautan.com%2Fnotes%2Fsvg-filters");
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

var commonjsGlobal = typeof globalThis !== 'undefined' ? globalThis : typeof window !== 'undefined' ? window : typeof global !== 'undefined' ? global : typeof self !== 'undefined' ? self : {};

function createCommonjsModule(fn, basedir, module) {
	return module = {
	  path: basedir,
	  exports: {},
	  require: function (path, base) {
      return commonjsRequire(path, (base === undefined || base === null) ? module.path : base);
    }
	}, fn(module, module.exports), module.exports;
}

function commonjsRequire () {
	throw new Error('Dynamic requires are not currently supported by @rollup/plugin-commonjs');
}

var prism = createCommonjsModule(function (module) {
/* **********************************************
     Begin prism-core.js
********************************************** */

var _self = (typeof window !== 'undefined')
	? window   // if in browser
	: (
		(typeof WorkerGlobalScope !== 'undefined' && self instanceof WorkerGlobalScope)
		? self // if in worker
		: {}   // if in node js
	);

/**
 * Prism: Lightweight, robust, elegant syntax highlighting
 * MIT license http://www.opensource.org/licenses/mit-license.php/
 * @author Lea Verou http://lea.verou.me
 */

var Prism = (function (_self){

// Private helper vars
var lang = /\blang(?:uage)?-([\w-]+)\b/i;
var uniqueId = 0;

var _ = {
	manual: _self.Prism && _self.Prism.manual,
	disableWorkerMessageHandler: _self.Prism && _self.Prism.disableWorkerMessageHandler,
	util: {
		encode: function (tokens) {
			if (tokens instanceof Token) {
				return new Token(tokens.type, _.util.encode(tokens.content), tokens.alias);
			} else if (Array.isArray(tokens)) {
				return tokens.map(_.util.encode);
			} else {
				return tokens.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/\u00a0/g, ' ');
			}
		},

		type: function (o) {
			return Object.prototype.toString.call(o).slice(8, -1);
		},

		objId: function (obj) {
			if (!obj['__id']) {
				Object.defineProperty(obj, '__id', { value: ++uniqueId });
			}
			return obj['__id'];
		},

		// Deep clone a language definition (e.g. to extend it)
		clone: function deepClone(o, visited) {
			var clone, id, type = _.util.type(o);
			visited = visited || {};

			switch (type) {
				case 'Object':
					id = _.util.objId(o);
					if (visited[id]) {
						return visited[id];
					}
					clone = {};
					visited[id] = clone;

					for (var key in o) {
						if (o.hasOwnProperty(key)) {
							clone[key] = deepClone(o[key], visited);
						}
					}

					return clone;

				case 'Array':
					id = _.util.objId(o);
					if (visited[id]) {
						return visited[id];
					}
					clone = [];
					visited[id] = clone;

					o.forEach(function (v, i) {
						clone[i] = deepClone(v, visited);
					});

					return clone;

				default:
					return o;
			}
		}
	},

	languages: {
		extend: function (id, redef) {
			var lang = _.util.clone(_.languages[id]);

			for (var key in redef) {
				lang[key] = redef[key];
			}

			return lang;
		},

		/**
		 * Insert a token before another token in a language literal
		 * As this needs to recreate the object (we cannot actually insert before keys in object literals),
		 * we cannot just provide an object, we need an object and a key.
		 * @param inside The key (or language id) of the parent
		 * @param before The key to insert before.
		 * @param insert Object with the key/value pairs to insert
		 * @param root The object that contains `inside`. If equal to Prism.languages, it can be omitted.
		 */
		insertBefore: function (inside, before, insert, root) {
			root = root || _.languages;
			var grammar = root[inside];
			var ret = {};

			for (var token in grammar) {
				if (grammar.hasOwnProperty(token)) {

					if (token == before) {
						for (var newToken in insert) {
							if (insert.hasOwnProperty(newToken)) {
								ret[newToken] = insert[newToken];
							}
						}
					}

					// Do not insert token which also occur in insert. See #1525
					if (!insert.hasOwnProperty(token)) {
						ret[token] = grammar[token];
					}
				}
			}

			var old = root[inside];
			root[inside] = ret;

			// Update references in other language definitions
			_.languages.DFS(_.languages, function(key, value) {
				if (value === old && key != inside) {
					this[key] = ret;
				}
			});

			return ret;
		},

		// Traverse a language definition with Depth First Search
		DFS: function DFS(o, callback, type, visited) {
			visited = visited || {};

			var objId = _.util.objId;

			for (var i in o) {
				if (o.hasOwnProperty(i)) {
					callback.call(o, i, o[i], type || i);

					var property = o[i],
					    propertyType = _.util.type(property);

					if (propertyType === 'Object' && !visited[objId(property)]) {
						visited[objId(property)] = true;
						DFS(property, callback, null, visited);
					}
					else if (propertyType === 'Array' && !visited[objId(property)]) {
						visited[objId(property)] = true;
						DFS(property, callback, i, visited);
					}
				}
			}
		}
	},
	plugins: {},

	highlightAll: function(async, callback) {
		_.highlightAllUnder(document, async, callback);
	},

	highlightAllUnder: function(container, async, callback) {
		var env = {
			callback: callback,
			selector: 'code[class*="language-"], [class*="language-"] code, code[class*="lang-"], [class*="lang-"] code'
		};

		_.hooks.run('before-highlightall', env);

		var elements = container.querySelectorAll(env.selector);

		for (var i=0, element; element = elements[i++];) {
			_.highlightElement(element, async === true, env.callback);
		}
	},

	highlightElement: function(element, async, callback) {
		// Find language
		var language = 'none', grammar, parent = element;

		while (parent && !lang.test(parent.className)) {
			parent = parent.parentNode;
		}

		if (parent) {
			language = (parent.className.match(lang) || [,'none'])[1].toLowerCase();
			grammar = _.languages[language];
		}

		// Set language on the element, if not present
		element.className = element.className.replace(lang, '').replace(/\s+/g, ' ') + ' language-' + language;

		if (element.parentNode) {
			// Set language on the parent, for styling
			parent = element.parentNode;

			if (/pre/i.test(parent.nodeName)) {
				parent.className = parent.className.replace(lang, '').replace(/\s+/g, ' ') + ' language-' + language;
			}
		}

		var code = element.textContent;

		var env = {
			element: element,
			language: language,
			grammar: grammar,
			code: code
		};

		var insertHighlightedCode = function (highlightedCode) {
			env.highlightedCode = highlightedCode;

			_.hooks.run('before-insert', env);

			env.element.innerHTML = env.highlightedCode;

			_.hooks.run('after-highlight', env);
			_.hooks.run('complete', env);
			callback && callback.call(env.element);
		};

		_.hooks.run('before-sanity-check', env);

		if (!env.code) {
			_.hooks.run('complete', env);
			return;
		}

		_.hooks.run('before-highlight', env);

		if (!env.grammar) {
			insertHighlightedCode(_.util.encode(env.code));
			return;
		}

		if (async && _self.Worker) {
			var worker = new Worker(_.filename);

			worker.onmessage = function(evt) {
				insertHighlightedCode(evt.data);
			};

			worker.postMessage(JSON.stringify({
				language: env.language,
				code: env.code,
				immediateClose: true
			}));
		}
		else {
			insertHighlightedCode(_.highlight(env.code, env.grammar, env.language));
		}
	},

	highlight: function (text, grammar, language) {
		var env = {
			code: text,
			grammar: grammar,
			language: language
		};
		_.hooks.run('before-tokenize', env);
		env.tokens = _.tokenize(env.code, env.grammar);
		_.hooks.run('after-tokenize', env);
		return Token.stringify(_.util.encode(env.tokens), env.language);
	},

	matchGrammar: function (text, strarr, grammar, index, startPos, oneshot, target) {
		for (var token in grammar) {
			if(!grammar.hasOwnProperty(token) || !grammar[token]) {
				continue;
			}

			if (token == target) {
				return;
			}

			var patterns = grammar[token];
			patterns = (_.util.type(patterns) === "Array") ? patterns : [patterns];

			for (var j = 0; j < patterns.length; ++j) {
				var pattern = patterns[j],
					inside = pattern.inside,
					lookbehind = !!pattern.lookbehind,
					greedy = !!pattern.greedy,
					lookbehindLength = 0,
					alias = pattern.alias;

				if (greedy && !pattern.pattern.global) {
					// Without the global flag, lastIndex won't work
					var flags = pattern.pattern.toString().match(/[imuy]*$/)[0];
					pattern.pattern = RegExp(pattern.pattern.source, flags + "g");
				}

				pattern = pattern.pattern || pattern;

				// Don’t cache length as it changes during the loop
				for (var i = index, pos = startPos; i < strarr.length; pos += strarr[i].length, ++i) {

					var str = strarr[i];

					if (strarr.length > text.length) {
						// Something went terribly wrong, ABORT, ABORT!
						return;
					}

					if (str instanceof Token) {
						continue;
					}

					if (greedy && i != strarr.length - 1) {
						pattern.lastIndex = pos;
						var match = pattern.exec(text);
						if (!match) {
							break;
						}

						var from = match.index + (lookbehind ? match[1].length : 0),
						    to = match.index + match[0].length,
						    k = i,
						    p = pos;

						for (var len = strarr.length; k < len && (p < to || (!strarr[k].type && !strarr[k - 1].greedy)); ++k) {
							p += strarr[k].length;
							// Move the index i to the element in strarr that is closest to from
							if (from >= p) {
								++i;
								pos = p;
							}
						}

						// If strarr[i] is a Token, then the match starts inside another Token, which is invalid
						if (strarr[i] instanceof Token) {
							continue;
						}

						// Number of tokens to delete and replace with the new match
						delNum = k - i;
						str = text.slice(pos, p);
						match.index -= pos;
					} else {
						pattern.lastIndex = 0;

						var match = pattern.exec(str),
							delNum = 1;
					}

					if (!match) {
						if (oneshot) {
							break;
						}

						continue;
					}

					if(lookbehind) {
						lookbehindLength = match[1] ? match[1].length : 0;
					}

					var from = match.index + lookbehindLength,
					    match = match[0].slice(lookbehindLength),
					    to = from + match.length,
					    before = str.slice(0, from),
					    after = str.slice(to);

					var args = [i, delNum];

					if (before) {
						++i;
						pos += before.length;
						args.push(before);
					}

					var wrapped = new Token(token, inside? _.tokenize(match, inside) : match, alias, match, greedy);

					args.push(wrapped);

					if (after) {
						args.push(after);
					}

					Array.prototype.splice.apply(strarr, args);

					if (delNum != 1)
						_.matchGrammar(text, strarr, grammar, i, pos, true, token);

					if (oneshot)
						break;
				}
			}
		}
	},

	tokenize: function(text, grammar) {
		var strarr = [text];

		var rest = grammar.rest;

		if (rest) {
			for (var token in rest) {
				grammar[token] = rest[token];
			}

			delete grammar.rest;
		}

		_.matchGrammar(text, strarr, grammar, 0, 0, false);

		return strarr;
	},

	hooks: {
		all: {},

		add: function (name, callback) {
			var hooks = _.hooks.all;

			hooks[name] = hooks[name] || [];

			hooks[name].push(callback);
		},

		run: function (name, env) {
			var callbacks = _.hooks.all[name];

			if (!callbacks || !callbacks.length) {
				return;
			}

			for (var i=0, callback; callback = callbacks[i++];) {
				callback(env);
			}
		}
	},

	Token: Token
};

_self.Prism = _;

function Token(type, content, alias, matchedStr, greedy) {
	this.type = type;
	this.content = content;
	this.alias = alias;
	// Copy of the full string this token was created from
	this.length = (matchedStr || "").length|0;
	this.greedy = !!greedy;
}

Token.stringify = function(o, language) {
	if (typeof o == 'string') {
		return o;
	}

	if (Array.isArray(o)) {
		return o.map(function(element) {
			return Token.stringify(element, language);
		}).join('');
	}

	var env = {
		type: o.type,
		content: Token.stringify(o.content, language),
		tag: 'span',
		classes: ['token', o.type],
		attributes: {},
		language: language
	};

	if (o.alias) {
		var aliases = Array.isArray(o.alias) ? o.alias : [o.alias];
		Array.prototype.push.apply(env.classes, aliases);
	}

	_.hooks.run('wrap', env);

	var attributes = Object.keys(env.attributes).map(function(name) {
		return name + '="' + (env.attributes[name] || '').replace(/"/g, '&quot;') + '"';
	}).join(' ');

	return '<' + env.tag + ' class="' + env.classes.join(' ') + '"' + (attributes ? ' ' + attributes : '') + '>' + env.content + '</' + env.tag + '>';
};

if (!_self.document) {
	if (!_self.addEventListener) {
		// in Node.js
		return _;
	}

	if (!_.disableWorkerMessageHandler) {
		// In worker
		_self.addEventListener('message', function (evt) {
			var message = JSON.parse(evt.data),
				lang = message.language,
				code = message.code,
				immediateClose = message.immediateClose;

			_self.postMessage(_.highlight(code, _.languages[lang], lang));
			if (immediateClose) {
				_self.close();
			}
		}, false);
	}

	return _;
}

//Get current script and highlight
var script = document.currentScript || [].slice.call(document.getElementsByTagName("script")).pop();

if (script) {
	_.filename = script.src;

	if (!_.manual && !script.hasAttribute('data-manual')) {
		if(document.readyState !== "loading") {
			if (window.requestAnimationFrame) {
				window.requestAnimationFrame(_.highlightAll);
			} else {
				window.setTimeout(_.highlightAll, 16);
			}
		}
		else {
			document.addEventListener('DOMContentLoaded', _.highlightAll);
		}
	}
}

return _;

})(_self);

if ( module.exports) {
	module.exports = Prism;
}

// hack for components to work correctly in node.js
if (typeof commonjsGlobal !== 'undefined') {
	commonjsGlobal.Prism = Prism;
}


/* **********************************************
     Begin prism-markup.js
********************************************** */

Prism.languages.markup = {
	'comment': /<!--[\s\S]*?-->/,
	'prolog': /<\?[\s\S]+?\?>/,
	'doctype': /<!DOCTYPE[\s\S]+?>/i,
	'cdata': /<!\[CDATA\[[\s\S]*?]]>/i,
	'tag': {
		pattern: /<\/?(?!\d)[^\s>\/=$<%]+(?:\s(?:\s*[^\s>\/=]+(?:\s*=\s*(?:"[^"]*"|'[^']*'|[^\s'">=]+(?=[\s>]))|(?=[\s/>])))+)?\s*\/?>/i,
		greedy: true,
		inside: {
			'tag': {
				pattern: /^<\/?[^\s>\/]+/i,
				inside: {
					'punctuation': /^<\/?/,
					'namespace': /^[^\s>\/:]+:/
				}
			},
			'attr-value': {
				pattern: /=\s*(?:"[^"]*"|'[^']*'|[^\s'">=]+)/i,
				inside: {
					'punctuation': [
						/^=/,
						{
							pattern: /^(\s*)["']|["']$/,
							lookbehind: true
						}
					]
				}
			},
			'punctuation': /\/?>/,
			'attr-name': {
				pattern: /[^\s>\/]+/,
				inside: {
					'namespace': /^[^\s>\/:]+:/
				}
			}

		}
	},
	'entity': /&#?[\da-z]{1,8};/i
};

Prism.languages.markup['tag'].inside['attr-value'].inside['entity'] =
	Prism.languages.markup['entity'];

// Plugin to make entity title show the real entity, idea by Roman Komarov
Prism.hooks.add('wrap', function(env) {

	if (env.type === 'entity') {
		env.attributes['title'] = env.content.replace(/&amp;/, '&');
	}
});

Object.defineProperty(Prism.languages.markup.tag, 'addInlined', {
	/**
	 * Adds an inlined language to markup.
	 *
	 * An example of an inlined language is CSS with `<style>` tags.
	 *
	 * @param {string} tagName The name of the tag that contains the inlined language. This name will be treated as
	 * case insensitive.
	 * @param {string} lang The language key.
	 * @example
	 * addInlined('style', 'css');
	 */
	value: function addInlined(tagName, lang) {
		var includedCdataInside = {};
		includedCdataInside['language-' + lang] = {
			pattern: /(^<!\[CDATA\[)[\s\S]+?(?=\]\]>$)/i,
			lookbehind: true,
			inside: Prism.languages[lang]
		};
		includedCdataInside['cdata'] = /^<!\[CDATA\[|\]\]>$/i;

		var inside = {
			'included-cdata': {
				pattern: /<!\[CDATA\[[\s\S]*?\]\]>/i,
				inside: includedCdataInside
			}
		};
		inside['language-' + lang] = {
			pattern: /[\s\S]+/,
			inside: Prism.languages[lang]
		};

		var def = {};
		def[tagName] = {
			pattern: RegExp(/(<__[\s\S]*?>)(?:<!\[CDATA\[[\s\S]*?\]\]>\s*|[\s\S])*?(?=<\/__>)/.source.replace(/__/g, tagName), 'i'),
			lookbehind: true,
			greedy: true,
			inside: inside
		};

		Prism.languages.insertBefore('markup', 'cdata', def);
	}
});

Prism.languages.xml = Prism.languages.extend('markup', {});
Prism.languages.html = Prism.languages.markup;
Prism.languages.mathml = Prism.languages.markup;
Prism.languages.svg = Prism.languages.markup;


/* **********************************************
     Begin prism-css.js
********************************************** */

(function (Prism) {

	var string = /("|')(?:\\(?:\r\n|[\s\S])|(?!\1)[^\\\r\n])*\1/;

	Prism.languages.css = {
		'comment': /\/\*[\s\S]*?\*\//,
		'atrule': {
			pattern: /@[\w-]+[\s\S]*?(?:;|(?=\s*\{))/,
			inside: {
				'rule': /@[\w-]+/
				// See rest below
			}
		},
		'url': {
			pattern: RegExp('url\\((?:' + string.source + '|[^\n\r()]*)\\)', 'i'),
			inside: {
				'function': /^url/i,
				'punctuation': /^\(|\)$/
			}
		},
		'selector': RegExp('[^{}\\s](?:[^{};"\']|' + string.source + ')*?(?=\\s*\\{)'),
		'string': {
			pattern: string,
			greedy: true
		},
		'property': /[-_a-z\xA0-\uFFFF][-\w\xA0-\uFFFF]*(?=\s*:)/i,
		'important': /!important\b/i,
		'function': /[-a-z0-9]+(?=\()/i,
		'punctuation': /[(){};:,]/
	};

	Prism.languages.css['atrule'].inside.rest = Prism.languages.css;

	var markup = Prism.languages.markup;
	if (markup) {
		markup.tag.addInlined('style', 'css');

		Prism.languages.insertBefore('inside', 'attr-value', {
			'style-attr': {
				pattern: /\s*style=("|')(?:\\[\s\S]|(?!\1)[^\\])*\1/i,
				inside: {
					'attr-name': {
						pattern: /^\s*style/i,
						inside: markup.tag.inside
					},
					'punctuation': /^\s*=\s*['"]|['"]\s*$/,
					'attr-value': {
						pattern: /.+/i,
						inside: Prism.languages.css
					}
				},
				alias: 'language-css'
			}
		}, markup.tag);
	}

}(Prism));


/* **********************************************
     Begin prism-clike.js
********************************************** */

Prism.languages.clike = {
	'comment': [
		{
			pattern: /(^|[^\\])\/\*[\s\S]*?(?:\*\/|$)/,
			lookbehind: true
		},
		{
			pattern: /(^|[^\\:])\/\/.*/,
			lookbehind: true,
			greedy: true
		}
	],
	'string': {
		pattern: /(["'])(?:\\(?:\r\n|[\s\S])|(?!\1)[^\\\r\n])*\1/,
		greedy: true
	},
	'class-name': {
		pattern: /((?:\b(?:class|interface|extends|implements|trait|instanceof|new)\s+)|(?:catch\s+\())[\w.\\]+/i,
		lookbehind: true,
		inside: {
			punctuation: /[.\\]/
		}
	},
	'keyword': /\b(?:if|else|while|do|for|return|in|instanceof|function|new|try|throw|catch|finally|null|break|continue)\b/,
	'boolean': /\b(?:true|false)\b/,
	'function': /\w+(?=\()/,
	'number': /\b0x[\da-f]+\b|(?:\b\d+\.?\d*|\B\.\d+)(?:e[+-]?\d+)?/i,
	'operator': /--?|\+\+?|!=?=?|<=?|>=?|==?=?|&&?|\|\|?|\?|\*|\/|~|\^|%/,
	'punctuation': /[{}[\];(),.:]/
};


/* **********************************************
     Begin prism-javascript.js
********************************************** */

Prism.languages.javascript = Prism.languages.extend('clike', {
	'class-name': [
		Prism.languages.clike['class-name'],
		{
			pattern: /(^|[^$\w\xA0-\uFFFF])[_$A-Z\xA0-\uFFFF][$\w\xA0-\uFFFF]*(?=\.(?:prototype|constructor))/,
			lookbehind: true
		}
	],
	'keyword': [
		{
			pattern: /((?:^|})\s*)(?:catch|finally)\b/,
			lookbehind: true
		},
		{
			pattern: /(^|[^.])\b(?:as|async(?=\s*(?:function\b|\(|[$\w\xA0-\uFFFF]|$))|await|break|case|class|const|continue|debugger|default|delete|do|else|enum|export|extends|for|from|function|get|if|implements|import|in|instanceof|interface|let|new|null|of|package|private|protected|public|return|set|static|super|switch|this|throw|try|typeof|undefined|var|void|while|with|yield)\b/,
			lookbehind: true
		},
	],
	'number': /\b(?:(?:0[xX](?:[\dA-Fa-f](?:_[\dA-Fa-f])?)+|0[bB](?:[01](?:_[01])?)+|0[oO](?:[0-7](?:_[0-7])?)+)n?|(?:\d(?:_\d)?)+n|NaN|Infinity)\b|(?:\b(?:\d(?:_\d)?)+\.?(?:\d(?:_\d)?)*|\B\.(?:\d(?:_\d)?)+)(?:[Ee][+-]?(?:\d(?:_\d)?)+)?/,
	// Allow for all non-ASCII characters (See http://stackoverflow.com/a/2008444)
	'function': /#?[_$a-zA-Z\xA0-\uFFFF][$\w\xA0-\uFFFF]*(?=\s*(?:\.\s*(?:apply|bind|call)\s*)?\()/,
	'operator': /-[-=]?|\+[+=]?|!=?=?|<<?=?|>>?>?=?|=(?:==?|>)?|&[&=]?|\|[|=]?|\*\*?=?|\/=?|~|\^=?|%=?|\?|\.{3}/
});

Prism.languages.javascript['class-name'][0].pattern = /(\b(?:class|interface|extends|implements|instanceof|new)\s+)[\w.\\]+/;

Prism.languages.insertBefore('javascript', 'keyword', {
	'regex': {
		pattern: /((?:^|[^$\w\xA0-\uFFFF."'\])\s])\s*)\/(\[(?:[^\]\\\r\n]|\\.)*]|\\.|[^/\\\[\r\n])+\/[gimyus]{0,6}(?=\s*($|[\r\n,.;})\]]))/,
		lookbehind: true,
		greedy: true
	},
	// This must be declared before keyword because we use "function" inside the look-forward
	'function-variable': {
		pattern: /#?[_$a-zA-Z\xA0-\uFFFF][$\w\xA0-\uFFFF]*(?=\s*[=:]\s*(?:async\s*)?(?:\bfunction\b|(?:\((?:[^()]|\([^()]*\))*\)|[_$a-zA-Z\xA0-\uFFFF][$\w\xA0-\uFFFF]*)\s*=>))/,
		alias: 'function'
	},
	'parameter': [
		{
			pattern: /(function(?:\s+[_$A-Za-z\xA0-\uFFFF][$\w\xA0-\uFFFF]*)?\s*\(\s*)(?!\s)(?:[^()]|\([^()]*\))+?(?=\s*\))/,
			lookbehind: true,
			inside: Prism.languages.javascript
		},
		{
			pattern: /[_$a-z\xA0-\uFFFF][$\w\xA0-\uFFFF]*(?=\s*=>)/i,
			inside: Prism.languages.javascript
		},
		{
			pattern: /(\(\s*)(?!\s)(?:[^()]|\([^()]*\))+?(?=\s*\)\s*=>)/,
			lookbehind: true,
			inside: Prism.languages.javascript
		},
		{
			pattern: /((?:\b|\s|^)(?!(?:as|async|await|break|case|catch|class|const|continue|debugger|default|delete|do|else|enum|export|extends|finally|for|from|function|get|if|implements|import|in|instanceof|interface|let|new|null|of|package|private|protected|public|return|set|static|super|switch|this|throw|try|typeof|undefined|var|void|while|with|yield)(?![$\w\xA0-\uFFFF]))(?:[_$A-Za-z\xA0-\uFFFF][$\w\xA0-\uFFFF]*\s*)\(\s*)(?!\s)(?:[^()]|\([^()]*\))+?(?=\s*\)\s*\{)/,
			lookbehind: true,
			inside: Prism.languages.javascript
		}
	],
	'constant': /\b[A-Z](?:[A-Z_]|\dx?)*\b/
});

Prism.languages.insertBefore('javascript', 'string', {
	'template-string': {
		pattern: /`(?:\\[\s\S]|\${(?:[^{}]|{(?:[^{}]|{[^}]*})*})+}|(?!\${)[^\\`])*`/,
		greedy: true,
		inside: {
			'template-punctuation': {
				pattern: /^`|`$/,
				alias: 'string'
			},
			'interpolation': {
				pattern: /((?:^|[^\\])(?:\\{2})*)\${(?:[^{}]|{(?:[^{}]|{[^}]*})*})+}/,
				lookbehind: true,
				inside: {
					'interpolation-punctuation': {
						pattern: /^\${|}$/,
						alias: 'punctuation'
					},
					rest: Prism.languages.javascript
				}
			},
			'string': /[\s\S]+/
		}
	}
});

if (Prism.languages.markup) {
	Prism.languages.markup.tag.addInlined('script', 'javascript');
}

Prism.languages.js = Prism.languages.javascript;


/* **********************************************
     Begin prism-file-highlight.js
********************************************** */

(function () {
	if (typeof self === 'undefined' || !self.Prism || !self.document || !document.querySelector) {
		return;
	}

	/**
	 * @param {Element} [container=document]
	 */
	self.Prism.fileHighlight = function(container) {
		container = container || document;

		var Extensions = {
			'js': 'javascript',
			'py': 'python',
			'rb': 'ruby',
			'ps1': 'powershell',
			'psm1': 'powershell',
			'sh': 'bash',
			'bat': 'batch',
			'h': 'c',
			'tex': 'latex'
		};

		Array.prototype.slice.call(container.querySelectorAll('pre[data-src]')).forEach(function (pre) {
			// ignore if already loaded
			if (pre.hasAttribute('data-src-loaded')) {
				return;
			}

			// load current
			var src = pre.getAttribute('data-src');

			var language, parent = pre;
			var lang = /\blang(?:uage)?-([\w-]+)\b/i;
			while (parent && !lang.test(parent.className)) {
				parent = parent.parentNode;
			}

			if (parent) {
				language = (pre.className.match(lang) || [, ''])[1];
			}

			if (!language) {
				var extension = (src.match(/\.(\w+)$/) || [, ''])[1];
				language = Extensions[extension] || extension;
			}

			var code = document.createElement('code');
			code.className = 'language-' + language;

			pre.textContent = '';

			code.textContent = 'Loading…';

			pre.appendChild(code);

			var xhr = new XMLHttpRequest();

			xhr.open('GET', src, true);

			xhr.onreadystatechange = function () {
				if (xhr.readyState == 4) {

					if (xhr.status < 400 && xhr.responseText) {
						code.textContent = xhr.responseText;

						Prism.highlightElement(code);
						// mark as loaded
						pre.setAttribute('data-src-loaded', '');
					}
					else if (xhr.status >= 400) {
						code.textContent = '✖ Error ' + xhr.status + ' while fetching file: ' + xhr.statusText;
					}
					else {
						code.textContent = '✖ Error: File does not exist or is empty';
					}
				}
			};

			xhr.send(null);
		});

		if (Prism.plugins.toolbar) {
			Prism.plugins.toolbar.registerButton('download-file', function (env) {
				var pre = env.element.parentNode;
				if (!pre || !/pre/i.test(pre.nodeName) || !pre.hasAttribute('data-src') || !pre.hasAttribute('data-download-link')) {
					return;
				}
				var src = pre.getAttribute('data-src');
				var a = document.createElement('a');
				a.textContent = pre.getAttribute('data-download-link-label') || 'Download';
				a.setAttribute('download', '');
				a.href = src;
				return a;
			});
		}

	};

	document.addEventListener('DOMContentLoaded', function () {
		// execute inside handler, for dropping Event as argument
		self.Prism.fileHighlight();
	});

})();
});

/* content/notes/svg-filters/components/Morphology.svelte generated by Svelte v3.24.0 */

function create_fragment$2(ctx) {
	let div5;
	let div0;
	let img0;
	let img0_src_value;
	let t0;
	let div2;
	let img1;
	let img1_src_value;
	let t1;
	let div1;
	let highlight_action;
	let t2;
	let div4;
	let img2;
	let img2_src_value;
	let t3;
	let div3;
	let highlight_action_1;
	let t4;
	let svg;
	let filter0;
	let feMorphology0;
	let filter1;
	let feMorphology1;
	let t5;
	let div6;
	let t6;
	let t7;
	let t8;
	let input;
	let mounted;
	let dispose;

	return {
		c() {
			div5 = element("div");
			div0 = element("div");
			img0 = element("img");
			t0 = space();
			div2 = element("div");
			img1 = element("img");
			t1 = space();
			div1 = element("div");
			t2 = space();
			div4 = element("div");
			img2 = element("img");
			t3 = space();
			div3 = element("div");
			t4 = space();
			svg = svg_element("svg");
			filter0 = svg_element("filter");
			feMorphology0 = svg_element("feMorphology");
			filter1 = svg_element("filter");
			feMorphology1 = svg_element("feMorphology");
			t5 = space();
			div6 = element("div");
			t6 = text("Radius: ");
			t7 = text(/*radius*/ ctx[0]);
			t8 = space();
			input = element("input");
			this.h();
		},
		l(nodes) {
			div5 = claim_element(nodes, "DIV", { class: true });
			var div5_nodes = children(div5);
			div0 = claim_element(div5_nodes, "DIV", { class: true });
			var div0_nodes = children(div0);
			img0 = claim_element(div0_nodes, "IMG", { src: true, alt: true, class: true });
			div0_nodes.forEach(detach);
			t0 = claim_space(div5_nodes);
			div2 = claim_element(div5_nodes, "DIV", { class: true });
			var div2_nodes = children(div2);
			img1 = claim_element(div2_nodes, "IMG", { class: true, src: true, alt: true });
			t1 = claim_space(div2_nodes);
			div1 = claim_element(div2_nodes, "DIV", {});
			children(div1).forEach(detach);
			div2_nodes.forEach(detach);
			t2 = claim_space(div5_nodes);
			div4 = claim_element(div5_nodes, "DIV", { class: true });
			var div4_nodes = children(div4);
			img2 = claim_element(div4_nodes, "IMG", { class: true, src: true, alt: true });
			t3 = claim_space(div4_nodes);
			div3 = claim_element(div4_nodes, "DIV", {});
			children(div3).forEach(detach);
			div4_nodes.forEach(detach);
			t4 = claim_space(div5_nodes);
			svg = claim_element(div5_nodes, "svg", { class: true }, 1);
			var svg_nodes = children(svg);
			filter0 = claim_element(svg_nodes, "filter", { id: true }, 1);
			var filter0_nodes = children(filter0);
			feMorphology0 = claim_element(filter0_nodes, "feMorphology", { radius: true, operator: true }, 1);
			children(feMorphology0).forEach(detach);
			filter0_nodes.forEach(detach);
			filter1 = claim_element(svg_nodes, "filter", { id: true }, 1);
			var filter1_nodes = children(filter1);
			feMorphology1 = claim_element(filter1_nodes, "feMorphology", { radius: true, operator: true }, 1);
			children(feMorphology1).forEach(detach);
			filter1_nodes.forEach(detach);
			svg_nodes.forEach(detach);
			div5_nodes.forEach(detach);
			t5 = claim_space(nodes);
			div6 = claim_element(nodes, "DIV", { class: true });
			var div6_nodes = children(div6);
			t6 = claim_text(div6_nodes, "Radius: ");
			t7 = claim_text(div6_nodes, /*radius*/ ctx[0]);
			t8 = claim_space(div6_nodes);

			input = claim_element(div6_nodes, "INPUT", {
				type: true,
				min: true,
				max: true,
				step: true,
				class: true
			});

			div6_nodes.forEach(detach);
			this.h();
		},
		h() {
			if (img0.src !== (img0_src_value = "https://lihautan.com/03b36a9f76000493.png")) attr(img0, "src", img0_src_value);
			attr(img0, "alt", "");
			attr(img0, "class", "svelte-16gcny3");
			attr(div0, "class", "container svelte-16gcny3");
			attr(img1, "class", "dilate svelte-16gcny3");
			if (img1.src !== (img1_src_value = "https://lihautan.com/03b36a9f76000493.png")) attr(img1, "src", img1_src_value);
			attr(img1, "alt", "");
			attr(div2, "class", "container svelte-16gcny3");
			attr(img2, "class", "erode svelte-16gcny3");
			if (img2.src !== (img2_src_value = "https://lihautan.com/03b36a9f76000493.png")) attr(img2, "src", img2_src_value);
			attr(img2, "alt", "");
			attr(div4, "class", "container svelte-16gcny3");
			attr(feMorphology0, "radius", /*radius*/ ctx[0]);
			attr(feMorphology0, "operator", "dilate");
			attr(filter0, "id", "dilate");
			attr(feMorphology1, "radius", /*radius*/ ctx[0]);
			attr(feMorphology1, "operator", "erode");
			attr(filter1, "id", "erode");
			attr(svg, "class", "svelte-16gcny3");
			attr(div5, "class", "row svelte-16gcny3");
			attr(input, "type", "range");
			attr(input, "min", "0");
			attr(input, "max", "20");
			attr(input, "step", "1");
			attr(input, "class", "svelte-16gcny3");
			attr(div6, "class", "input svelte-16gcny3");
		},
		m(target, anchor) {
			insert(target, div5, anchor);
			append(div5, div0);
			append(div0, img0);
			append(div5, t0);
			append(div5, div2);
			append(div2, img1);
			append(div2, t1);
			append(div2, div1);
			append(div5, t2);
			append(div5, div4);
			append(div4, img2);
			append(div4, t3);
			append(div4, div3);
			append(div5, t4);
			append(div5, svg);
			append(svg, filter0);
			append(filter0, feMorphology0);
			append(svg, filter1);
			append(filter1, feMorphology1);
			insert(target, t5, anchor);
			insert(target, div6, anchor);
			append(div6, t6);
			append(div6, t7);
			append(div6, t8);
			append(div6, input);
			set_input_value(input, /*radius*/ ctx[0]);

			if (!mounted) {
				dispose = [
					action_destroyer(highlight_action = /*highlight*/ ctx[1].call(null, div1, `
<filter>
	<feMorphology
		operator="dilate"
		radius="${/*radius*/ ctx[0]}" />
</filter>`)),
					action_destroyer(highlight_action_1 = /*highlight*/ ctx[1].call(null, div3, `
<filter>
	<feMorphology
		operator="erode"
		radius="${/*radius*/ ctx[0]}" />
</filter>`)),
					listen(input, "change", /*input_change_input_handler*/ ctx[2]),
					listen(input, "input", /*input_change_input_handler*/ ctx[2])
				];

				mounted = true;
			}
		},
		p(ctx, [dirty]) {
			if (highlight_action && is_function(highlight_action.update) && dirty & /*radius*/ 1) highlight_action.update.call(null, `
<filter>
	<feMorphology
		operator="dilate"
		radius="${/*radius*/ ctx[0]}" />
</filter>`);

			if (highlight_action_1 && is_function(highlight_action_1.update) && dirty & /*radius*/ 1) highlight_action_1.update.call(null, `
<filter>
	<feMorphology
		operator="erode"
		radius="${/*radius*/ ctx[0]}" />
</filter>`);

			if (dirty & /*radius*/ 1) {
				attr(feMorphology0, "radius", /*radius*/ ctx[0]);
			}

			if (dirty & /*radius*/ 1) {
				attr(feMorphology1, "radius", /*radius*/ ctx[0]);
			}

			if (dirty & /*radius*/ 1) set_data(t7, /*radius*/ ctx[0]);

			if (dirty & /*radius*/ 1) {
				set_input_value(input, /*radius*/ ctx[0]);
			}
		},
		i: noop,
		o: noop,
		d(detaching) {
			if (detaching) detach(div5);
			if (detaching) detach(t5);
			if (detaching) detach(div6);
			mounted = false;
			run_all(dispose);
		}
	};
}

function instance$1($$self, $$props, $$invalidate) {
	let radius = 0;

	function highlight(node, str) {
		function h(str) {
			node.innerHTML = prism.highlight(str.trim(), prism.languages.html).split("\n").map(line => line.replace(/^(\s+)/, (_, m) => ("<span class=\"tab\"></span>").repeat(m.length))).join("<br />");
		}

		h(str);

		return {
			update(str) {
				h(str);
			}
		};
	}

	function input_change_input_handler() {
		radius = to_number(this.value);
		$$invalidate(0, radius);
	}

	return [radius, highlight, input_change_input_handler];
}

class Morphology extends SvelteComponent {
	constructor(options) {
		super();
		init(this, options, instance$1, create_fragment$2, safe_not_equal, {});
	}
}

/* content/notes/svg-filters/components/KnockoutText.svelte generated by Svelte v3.24.0 */

function create_fragment$3(ctx) {
	let div;
	let h1;
	let t0;
	let t1;
	let input0;
	let t2;
	let input1;
	let t3;
	let input2;
	let t4;
	let svg;
	let filter;
	let feMorphology;
	let feComposite;
	let mounted;
	let dispose;

	return {
		c() {
			div = element("div");
			h1 = element("h1");
			t0 = text(/*text*/ ctx[0]);
			t1 = space();
			input0 = element("input");
			t2 = space();
			input1 = element("input");
			t3 = space();
			input2 = element("input");
			t4 = space();
			svg = svg_element("svg");
			filter = svg_element("filter");
			feMorphology = svg_element("feMorphology");
			feComposite = svg_element("feComposite");
			this.h();
		},
		l(nodes) {
			div = claim_element(nodes, "DIV", { class: true, style: true });
			var div_nodes = children(div);
			h1 = claim_element(div_nodes, "H1", { style: true, class: true });
			var h1_nodes = children(h1);
			t0 = claim_text(h1_nodes, /*text*/ ctx[0]);
			h1_nodes.forEach(detach);
			div_nodes.forEach(detach);
			t1 = claim_space(nodes);
			input0 = claim_element(nodes, "INPUT", {});
			t2 = claim_space(nodes);
			input1 = claim_element(nodes, "INPUT", { type: true });
			t3 = claim_space(nodes);
			input2 = claim_element(nodes, "INPUT", { type: true });
			t4 = claim_space(nodes);
			svg = claim_element(nodes, "svg", { height: true, class: true }, 1);
			var svg_nodes = children(svg);
			filter = claim_element(svg_nodes, "filter", { id: true }, 1);
			var filter_nodes = children(filter);

			feMorphology = claim_element(
				filter_nodes,
				"feMorphology",
				{
					result: true,
					operator: true,
					radius: true
				},
				1
			);

			children(feMorphology).forEach(detach);
			feComposite = claim_element(filter_nodes, "feComposite", { operator: true, in: true, in2: true }, 1);
			children(feComposite).forEach(detach);
			filter_nodes.forEach(detach);
			svg_nodes.forEach(detach);
			this.h();
		},
		h() {
			set_style(h1, "filter", "url(#outline)");
			set_style(h1, "color", /*color*/ ctx[1]);
			attr(h1, "class", "svelte-1foi548");
			attr(div, "class", "canvas svelte-1foi548");
			set_style(div, "background", /*background*/ ctx[2]);
			attr(input1, "type", "color");
			attr(input2, "type", "color");
			attr(feMorphology, "result", "THICK");
			attr(feMorphology, "operator", "dilate");
			attr(feMorphology, "radius", "4");
			attr(feComposite, "operator", "out");
			attr(feComposite, "in", "THICK");
			attr(feComposite, "in2", "SourceGraphic");
			attr(filter, "id", "outline");
			attr(svg, "height", "0");
			attr(svg, "class", "svelte-1foi548");
		},
		m(target, anchor) {
			insert(target, div, anchor);
			append(div, h1);
			append(h1, t0);
			insert(target, t1, anchor);
			insert(target, input0, anchor);
			set_input_value(input0, /*text*/ ctx[0]);
			insert(target, t2, anchor);
			insert(target, input1, anchor);
			set_input_value(input1, /*color*/ ctx[1]);
			insert(target, t3, anchor);
			insert(target, input2, anchor);
			set_input_value(input2, /*background*/ ctx[2]);
			insert(target, t4, anchor);
			insert(target, svg, anchor);
			append(svg, filter);
			append(filter, feMorphology);
			append(filter, feComposite);

			if (!mounted) {
				dispose = [
					listen(input0, "input", /*input0_input_handler*/ ctx[3]),
					listen(input1, "input", /*input1_input_handler*/ ctx[4]),
					listen(input2, "input", /*input2_input_handler*/ ctx[5])
				];

				mounted = true;
			}
		},
		p(ctx, [dirty]) {
			if (dirty & /*text*/ 1) set_data(t0, /*text*/ ctx[0]);

			if (dirty & /*color*/ 2) {
				set_style(h1, "color", /*color*/ ctx[1]);
			}

			if (dirty & /*background*/ 4) {
				set_style(div, "background", /*background*/ ctx[2]);
			}

			if (dirty & /*text*/ 1 && input0.value !== /*text*/ ctx[0]) {
				set_input_value(input0, /*text*/ ctx[0]);
			}

			if (dirty & /*color*/ 2) {
				set_input_value(input1, /*color*/ ctx[1]);
			}

			if (dirty & /*background*/ 4) {
				set_input_value(input2, /*background*/ ctx[2]);
			}
		},
		i: noop,
		o: noop,
		d(detaching) {
			if (detaching) detach(div);
			if (detaching) detach(t1);
			if (detaching) detach(input0);
			if (detaching) detach(t2);
			if (detaching) detach(input1);
			if (detaching) detach(t3);
			if (detaching) detach(input2);
			if (detaching) detach(t4);
			if (detaching) detach(svg);
			mounted = false;
			run_all(dispose);
		}
	};
}

function instance$2($$self, $$props, $$invalidate) {
	let text = "Hello World";
	let color = "#ff0000";
	let background = "#ffff00";

	function input0_input_handler() {
		text = this.value;
		$$invalidate(0, text);
	}

	function input1_input_handler() {
		color = this.value;
		$$invalidate(1, color);
	}

	function input2_input_handler() {
		background = this.value;
		$$invalidate(2, background);
	}

	return [
		text,
		color,
		background,
		input0_input_handler,
		input1_input_handler,
		input2_input_handler
	];
}

class KnockoutText extends SvelteComponent {
	constructor(options) {
		super();
		init(this, options, instance$2, create_fragment$3, safe_not_equal, {});
	}
}

/* content/notes/svg-filters/@@page-markup.svelte generated by Svelte v3.24.0 */

function create_default_slot(ctx) {
	let section0;
	let ul3;
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
	let ul1;
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
	let ul2;
	let li12;
	let a12;
	let t12;
	let li13;
	let a13;
	let t13;
	let t14;
	let section1;
	let h20;
	let a14;
	let t15;
	let t16;
	let p0;
	let t17;
	let a15;
	let t18;
	let t19;
	let t20;
	let ul4;
	let li14;
	let t21;
	let code0;
	let t22;
	let t23;
	let t24;
	let li15;
	let t25;
	let t26;
	let li16;
	let t27;
	let strong0;
	let t28;
	let t29;
	let strong1;
	let t30;
	let t31;
	let t32;
	let section2;
	let h30;
	let a16;
	let t33;
	let t34;
	let ul5;
	let li17;
	let t35;
	let code1;
	let t36;
	let t37;
	let t38;
	let li18;
	let t39;
	let t40;
	let li19;
	let code2;
	let t41;
	let t42;
	let code3;
	let t43;
	let t44;
	let code4;
	let t45;
	let t46;
	let t47;
	let li20;
	let t48;
	let code5;
	let t49;
	let t50;
	let code6;
	let t51;
	let t52;
	let pre0;

	let raw0_value = `<code class="language-html"><span class="token tag"><span class="token tag"><span class="token punctuation">&lt;</span>svg</span><span class="token punctuation">></span></span>
  <span class="token tag"><span class="token tag"><span class="token punctuation">&lt;</span>filter</span> <span class="token attr-name">id</span><span class="token attr-value"><span class="token punctuation">=</span><span class="token punctuation">"</span>my-filter<span class="token punctuation">"</span></span><span class="token punctuation">></span></span>
    <span class="token comment">&lt;!-- take in 1 input &#96;in&#96; --></span>
    <span class="token tag"><span class="token tag"><span class="token punctuation">&lt;</span>feGaussianBlur</span> <span class="token attr-name">in</span><span class="token attr-value"><span class="token punctuation">=</span><span class="token punctuation">"</span>INPUT_NAME<span class="token punctuation">"</span></span> <span class="token punctuation">/></span></span>

    <span class="token comment">&lt;!-- take in 2 inputs &#96;in&#96; and &#96;in2&#96; --></span>
    <span class="token tag"><span class="token tag"><span class="token punctuation">&lt;</span>feComposite</span> <span class="token attr-name">in</span><span class="token attr-value"><span class="token punctuation">=</span><span class="token punctuation">"</span>INPUT_NAME_1<span class="token punctuation">"</span></span> <span class="token attr-name">in2</span><span class="token attr-value"><span class="token punctuation">=</span><span class="token punctuation">"</span>INPUT_NAME_2<span class="token punctuation">"</span></span> <span class="token punctuation">/></span></span>
    
    <span class="token comment">&lt;!-- &#96;result&#96; defines the result name, 
		which can be passed in as input for the next filter --></span>
    <span class="token tag"><span class="token tag"><span class="token punctuation">&lt;</span>feGaussianBlur</span> <span class="token attr-name">result</span><span class="token attr-value"><span class="token punctuation">=</span><span class="token punctuation">"</span>OUTPUT_1<span class="token punctuation">"</span></span> <span class="token punctuation">/></span></span>
    <span class="token tag"><span class="token tag"><span class="token punctuation">&lt;</span>feGaussianBlur</span> <span class="token attr-name">in</span><span class="token attr-value"><span class="token punctuation">=</span><span class="token punctuation">"</span>OUTPUT_1<span class="token punctuation">"</span></span> <span class="token punctuation">/></span></span>
    
    <span class="token comment">&lt;!-- use the source as input for the filter primitive --></span>
    <span class="token comment">&lt;!-- apply filter on the source element --></span>
	<span class="token tag"><span class="token tag"><span class="token punctuation">&lt;</span>feGaussianBlur</span> <span class="token attr-name">in</span><span class="token attr-value"><span class="token punctuation">=</span><span class="token punctuation">"</span>SourceGraphic<span class="token punctuation">"</span></span> <span class="token punctuation">/></span></span>

    <span class="token comment">&lt;!-- apply filter on the alpha channel of the source element,
		the silhouette of the source --></span>
	<span class="token tag"><span class="token tag"><span class="token punctuation">&lt;</span>feGaussianBlur</span> <span class="token attr-name">in</span><span class="token attr-value"><span class="token punctuation">=</span><span class="token punctuation">"</span>SourceAlpha<span class="token punctuation">"</span></span> <span class="token punctuation">/></span></span>
  <span class="token tag"><span class="token tag"><span class="token punctuation">&lt;/</span>filter</span><span class="token punctuation">></span></span>
<span class="token tag"><span class="token tag"><span class="token punctuation">&lt;/</span>svg</span><span class="token punctuation">></span></span></code>` + "";

	let t53;
	let section3;
	let h31;
	let a17;
	let t54;
	let t55;
	let ul6;
	let li21;
	let t56;
	let t57;
	let li22;
	let t58;
	let t59;
	let li23;
	let t60;
	let t61;
	let pre1;

	let raw1_value = `<code class="language-html"><span class="token comment">&lt;!-- x, y, width, height sets the filter region --></span>
<span class="token tag"><span class="token tag"><span class="token punctuation">&lt;</span>filter</span>
  <span class="token attr-name">x</span><span class="token attr-value"><span class="token punctuation">=</span><span class="token punctuation">"</span>-10%<span class="token punctuation">"</span></span> <span class="token attr-name">y</span><span class="token attr-value"><span class="token punctuation">=</span><span class="token punctuation">"</span>-10%<span class="token punctuation">"</span></span> <span class="token attr-name">width</span><span class="token attr-value"><span class="token punctuation">=</span><span class="token punctuation">"</span>120%<span class="token punctuation">"</span></span> <span class="token attr-name">height</span><span class="token attr-value"><span class="token punctuation">=</span><span class="token punctuation">"</span>120%<span class="token punctuation">"</span></span>
  <span class="token attr-name">filterUnits</span><span class="token attr-value"><span class="token punctuation">=</span><span class="token punctuation">"</span>objectBoundingBox<span class="token punctuation">"</span></span><span class="token punctuation">></span></span>
  <span class="token comment">&lt;!-- filter primitives here --></span>
<span class="token tag"><span class="token tag"><span class="token punctuation">&lt;/</span>filter</span><span class="token punctuation">></span></span></code>` + "";

	let t62;
	let ul7;
	let li24;
	let t63;
	let code7;
	let t64;
	let t65;
	let t66;
	let pre2;

	let raw2_value = `<code class="language-html"><span class="token tag"><span class="token tag"><span class="token punctuation">&lt;</span>filter</span><span class="token punctuation">></span></span>
  <span class="token tag"><span class="token tag"><span class="token punctuation">&lt;</span>feFlood</span>
    <span class="token attr-name">flood-color</span><span class="token attr-value"><span class="token punctuation">=</span><span class="token punctuation">"</span>#EB0066<span class="token punctuation">"</span></span> <span class="token attr-name">flood-opacity</span><span class="token attr-value"><span class="token punctuation">=</span><span class="token punctuation">"</span>0.5<span class="token punctuation">"</span></span>
    <span class="token attr-name">result</span><span class="token attr-value"><span class="token punctuation">=</span><span class="token punctuation">"</span>flood<span class="token punctuation">"</span></span><span class="token punctuation">></span></span><span class="token tag"><span class="token tag"><span class="token punctuation">&lt;/</span>feFlood</span><span class="token punctuation">></span></span>
  <span class="token tag"><span class="token tag"><span class="token punctuation">&lt;</span>feMerge</span><span class="token punctuation">></span></span>
    <span class="token tag"><span class="token tag"><span class="token punctuation">&lt;</span>feMergeNode</span> <span class="token attr-name">in</span><span class="token attr-value"><span class="token punctuation">=</span><span class="token punctuation">"</span>SourceGraphic<span class="token punctuation">"</span></span> <span class="token punctuation">/></span></span>
    <span class="token tag"><span class="token tag"><span class="token punctuation">&lt;</span>feMergeNode</span> <span class="token attr-name">in</span><span class="token attr-value"><span class="token punctuation">=</span><span class="token punctuation">"</span>flood<span class="token punctuation">"</span></span> <span class="token punctuation">/></span></span>
  <span class="token tag"><span class="token tag"><span class="token punctuation">&lt;/</span>feMerge</span><span class="token punctuation">></span></span>
<span class="token tag"><span class="token tag"><span class="token punctuation">&lt;/</span>filter</span><span class="token punctuation">></span></span></code>` + "";

	let t67;
	let section4;
	let h32;
	let a18;
	let t68;
	let t69;
	let ol0;
	let li25;
	let t70;
	let t71;
	let pre3;

	let raw3_value = `<code class="language-xml"><span class="token tag"><span class="token tag"><span class="token punctuation">&lt;</span>filter</span> <span class="token attr-name">id</span><span class="token attr-value"><span class="token punctuation">=</span><span class="token punctuation">"</span>my-filter<span class="token punctuation">"</span></span><span class="token punctuation">></span></span>
  <span class="token tag"><span class="token tag"><span class="token punctuation">&lt;</span>feGaussianBlur</span>
    <span class="token attr-name">in</span><span class="token attr-value"><span class="token punctuation">=</span><span class="token punctuation">"</span>SourceAlpha<span class="token punctuation">"</span></span> <span class="token attr-name">stdDeviation</span><span class="token attr-value"><span class="token punctuation">=</span><span class="token punctuation">"</span>10<span class="token punctuation">"</span></span> <span class="token attr-name">result</span><span class="token attr-value"><span class="token punctuation">=</span><span class="token punctuation">"</span>DROP<span class="token punctuation">"</span></span> <span class="token punctuation">/></span></span>
<span class="token tag"><span class="token tag"><span class="token punctuation">&lt;/</span>filter</span><span class="token punctuation">></span></span></code>` + "";

	let t72;
	let p1;
	let picture0;
	let source0;
	let source1;
	let img0;
	let t73;
	let ol1;
	let li26;
	let t74;
	let t75;
	let ul8;
	let li27;
	let t76;
	let a19;
	let t77;
	let t78;
	let pre4;

	let raw4_value = `<code class="language-xml"><span class="token tag"><span class="token tag"><span class="token punctuation">&lt;</span>filter</span> <span class="token attr-name">id</span><span class="token attr-value"><span class="token punctuation">=</span><span class="token punctuation">"</span>my-filter<span class="token punctuation">"</span></span><span class="token punctuation">></span></span>
  <span class="token tag"><span class="token tag"><span class="token punctuation">&lt;</span>feGaussianBlur</span> <span class="token attr-name">in</span><span class="token attr-value"><span class="token punctuation">=</span><span class="token punctuation">"</span>SourceAlpha<span class="token punctuation">"</span></span> <span class="token attr-name">stdDeviation</span><span class="token attr-value"><span class="token punctuation">=</span><span class="token punctuation">"</span>10<span class="token punctuation">"</span></span> <span class="token attr-name">result</span><span class="token attr-value"><span class="token punctuation">=</span><span class="token punctuation">"</span>DROP<span class="token punctuation">"</span></span><span class="token punctuation">></span></span><span class="token tag"><span class="token tag"><span class="token punctuation">&lt;/</span>feGaussianBlur</span><span class="token punctuation">></span></span>
  <span class="token tag"><span class="token tag"><span class="token punctuation">&lt;</span>feFlood</span> <span class="token attr-name">flood-color</span><span class="token attr-value"><span class="token punctuation">=</span><span class="token punctuation">"</span>#EB0066<span class="token punctuation">"</span></span> <span class="token attr-name">result</span><span class="token attr-value"><span class="token punctuation">=</span><span class="token punctuation">"</span>COLOR<span class="token punctuation">"</span></span> <span class="token punctuation">/></span></span>
  <span class="token tag"><span class="token tag"><span class="token punctuation">&lt;</span>feComposite</span> <span class="token attr-name">in</span><span class="token attr-value"><span class="token punctuation">=</span><span class="token punctuation">"</span>COLOR<span class="token punctuation">"</span></span> <span class="token attr-name">in2</span><span class="token attr-value"><span class="token punctuation">=</span><span class="token punctuation">"</span>DROP<span class="token punctuation">"</span></span> <span class="token attr-name">operator</span><span class="token attr-value"><span class="token punctuation">=</span><span class="token punctuation">"</span>in<span class="token punctuation">"</span></span> <span class="token attr-name">result</span><span class="token attr-value"><span class="token punctuation">=</span><span class="token punctuation">"</span>SHADOW<span class="token punctuation">"</span></span> <span class="token punctuation">/></span></span>
<span class="token tag"><span class="token tag"><span class="token punctuation">&lt;/</span>filter</span><span class="token punctuation">></span></span></code>` + "";

	let t79;
	let p2;
	let picture1;
	let source2;
	let source3;
	let img1;
	let t80;
	let ol2;
	let li28;
	let t81;
	let code8;
	let t82;
	let t83;
	let pre5;

	let raw5_value = `<code class="language-xml"><span class="token tag"><span class="token tag"><span class="token punctuation">&lt;</span>filter</span> <span class="token attr-name">id</span><span class="token attr-value"><span class="token punctuation">=</span><span class="token punctuation">"</span>my-filter<span class="token punctuation">"</span></span><span class="token punctuation">></span></span>
  <span class="token tag"><span class="token tag"><span class="token punctuation">&lt;</span>feGaussianBlur</span> <span class="token attr-name">in</span><span class="token attr-value"><span class="token punctuation">=</span><span class="token punctuation">"</span>SourceAlpha<span class="token punctuation">"</span></span> <span class="token attr-name">stdDeviation</span><span class="token attr-value"><span class="token punctuation">=</span><span class="token punctuation">"</span>10<span class="token punctuation">"</span></span> <span class="token attr-name">result</span><span class="token attr-value"><span class="token punctuation">=</span><span class="token punctuation">"</span>DROP<span class="token punctuation">"</span></span><span class="token punctuation">></span></span><span class="token tag"><span class="token tag"><span class="token punctuation">&lt;/</span>feGaussianBlur</span><span class="token punctuation">></span></span>
  <span class="token tag"><span class="token tag"><span class="token punctuation">&lt;</span>feFlood</span> <span class="token attr-name">flood-color</span><span class="token attr-value"><span class="token punctuation">=</span><span class="token punctuation">"</span>#EB0066<span class="token punctuation">"</span></span> <span class="token attr-name">result</span><span class="token attr-value"><span class="token punctuation">=</span><span class="token punctuation">"</span>COLOR<span class="token punctuation">"</span></span> <span class="token punctuation">/></span></span>
  <span class="token tag"><span class="token tag"><span class="token punctuation">&lt;</span>feComposite</span> <span class="token attr-name">in</span><span class="token attr-value"><span class="token punctuation">=</span><span class="token punctuation">"</span>COLOR<span class="token punctuation">"</span></span> <span class="token attr-name">in2</span><span class="token attr-value"><span class="token punctuation">=</span><span class="token punctuation">"</span>DROP<span class="token punctuation">"</span></span> <span class="token attr-name">operator</span><span class="token attr-value"><span class="token punctuation">=</span><span class="token punctuation">"</span>in<span class="token punctuation">"</span></span> <span class="token attr-name">result</span><span class="token attr-value"><span class="token punctuation">=</span><span class="token punctuation">"</span>SHADOW<span class="token punctuation">"</span></span> <span class="token punctuation">/></span></span>
  <span class="token tag"><span class="token tag"><span class="token punctuation">&lt;</span>feOffset</span> <span class="token attr-name">in</span><span class="token attr-value"><span class="token punctuation">=</span><span class="token punctuation">"</span>SHADOW<span class="token punctuation">"</span></span> <span class="token attr-name">dx</span><span class="token attr-value"><span class="token punctuation">=</span><span class="token punctuation">"</span>10<span class="token punctuation">"</span></span> <span class="token attr-name">dy</span><span class="token attr-value"><span class="token punctuation">=</span><span class="token punctuation">"</span>10<span class="token punctuation">"</span></span> <span class="token attr-name">result</span><span class="token attr-value"><span class="token punctuation">=</span><span class="token punctuation">"</span>DROPSHADOW<span class="token punctuation">"</span></span> <span class="token punctuation">/></span></span>
<span class="token tag"><span class="token tag"><span class="token punctuation">&lt;/</span>filter</span><span class="token punctuation">></span></span></code>` + "";

	let t84;
	let p3;
	let picture2;
	let source4;
	let source5;
	let img2;
	let t85;
	let ol3;
	let li29;
	let t86;
	let t87;
	let ul9;
	let li30;
	let t88;
	let t89;
	let pre6;

	let raw6_value = `<code class="language-xml"><span class="token tag"><span class="token tag"><span class="token punctuation">&lt;</span>filter</span> <span class="token attr-name">id</span><span class="token attr-value"><span class="token punctuation">=</span><span class="token punctuation">"</span>my-filter<span class="token punctuation">"</span></span><span class="token punctuation">></span></span>
  <span class="token tag"><span class="token tag"><span class="token punctuation">&lt;</span>feGaussianBlur</span> <span class="token attr-name">in</span><span class="token attr-value"><span class="token punctuation">=</span><span class="token punctuation">"</span>SourceAlpha<span class="token punctuation">"</span></span> <span class="token attr-name">stdDeviation</span><span class="token attr-value"><span class="token punctuation">=</span><span class="token punctuation">"</span>10<span class="token punctuation">"</span></span> <span class="token attr-name">result</span><span class="token attr-value"><span class="token punctuation">=</span><span class="token punctuation">"</span>DROP<span class="token punctuation">"</span></span><span class="token punctuation">></span></span><span class="token tag"><span class="token tag"><span class="token punctuation">&lt;/</span>feGaussianBlur</span><span class="token punctuation">></span></span>
  <span class="token tag"><span class="token tag"><span class="token punctuation">&lt;</span>feFlood</span> <span class="token attr-name">flood-color</span><span class="token attr-value"><span class="token punctuation">=</span><span class="token punctuation">"</span>#EB0066<span class="token punctuation">"</span></span> <span class="token attr-name">result</span><span class="token attr-value"><span class="token punctuation">=</span><span class="token punctuation">"</span>COLOR<span class="token punctuation">"</span></span> <span class="token punctuation">/></span></span>
  <span class="token tag"><span class="token tag"><span class="token punctuation">&lt;</span>feComposite</span> <span class="token attr-name">in</span><span class="token attr-value"><span class="token punctuation">=</span><span class="token punctuation">"</span>COLOR<span class="token punctuation">"</span></span> <span class="token attr-name">in2</span><span class="token attr-value"><span class="token punctuation">=</span><span class="token punctuation">"</span>DROP<span class="token punctuation">"</span></span> <span class="token attr-name">operator</span><span class="token attr-value"><span class="token punctuation">=</span><span class="token punctuation">"</span>in<span class="token punctuation">"</span></span> <span class="token attr-name">result</span><span class="token attr-value"><span class="token punctuation">=</span><span class="token punctuation">"</span>SHADOW<span class="token punctuation">"</span></span> <span class="token punctuation">/></span></span>
  <span class="token tag"><span class="token tag"><span class="token punctuation">&lt;</span>feOffset</span> <span class="token attr-name">in</span><span class="token attr-value"><span class="token punctuation">=</span><span class="token punctuation">"</span>SHADOW<span class="token punctuation">"</span></span> <span class="token attr-name">dx</span><span class="token attr-value"><span class="token punctuation">=</span><span class="token punctuation">"</span>10<span class="token punctuation">"</span></span> <span class="token attr-name">dy</span><span class="token attr-value"><span class="token punctuation">=</span><span class="token punctuation">"</span>10<span class="token punctuation">"</span></span> <span class="token attr-name">result</span><span class="token attr-value"><span class="token punctuation">=</span><span class="token punctuation">"</span>DROPSHADOW<span class="token punctuation">"</span></span> <span class="token punctuation">/></span></span>
  <span class="token tag"><span class="token tag"><span class="token punctuation">&lt;</span>feMerge</span><span class="token punctuation">></span></span>
    <span class="token tag"><span class="token tag"><span class="token punctuation">&lt;</span>feMergeNode</span> <span class="token attr-name">in</span><span class="token attr-value"><span class="token punctuation">=</span><span class="token punctuation">"</span>DROPSHADOW<span class="token punctuation">"</span></span> <span class="token punctuation">/></span></span>
    <span class="token tag"><span class="token tag"><span class="token punctuation">&lt;</span>feMergeNode</span> <span class="token attr-name">in</span><span class="token attr-value"><span class="token punctuation">=</span><span class="token punctuation">"</span>SourceGraphic<span class="token punctuation">"</span></span> <span class="token punctuation">/></span></span>
  <span class="token tag"><span class="token tag"><span class="token punctuation">&lt;/</span>feMerge</span><span class="token punctuation">></span></span>
<span class="token tag"><span class="token tag"><span class="token punctuation">&lt;/</span>filter</span><span class="token punctuation">></span></span></code>` + "";

	let t90;
	let p4;
	let picture3;
	let source6;
	let source7;
	let img3;
	let t91;
	let section5;
	let h21;
	let a20;
	let t92;
	let code9;
	let t93;
	let t94;
	let p5;
	let t95;
	let a21;
	let t96;
	let t97;
	let t98;
	let pre7;

	let raw7_value = `<code class="language-xml"><span class="token tag"><span class="token tag"><span class="token punctuation">&lt;</span>filter</span> <span class="token attr-name">id</span><span class="token attr-value"><span class="token punctuation">=</span><span class="token punctuation">"</span>linear<span class="token punctuation">"</span></span><span class="token punctuation">></span></span>
  <span class="token tag"><span class="token tag"><span class="token punctuation">&lt;</span>feColorMatrix</span>
    <span class="token attr-name">type</span><span class="token attr-value"><span class="token punctuation">=</span><span class="token punctuation">"</span>matrix<span class="token punctuation">"</span></span>
    <span class="token attr-name">values</span><span class="token attr-value"><span class="token punctuation">=</span><span class="token punctuation">"</span>R 0 0 0 0
            0 G 0 0 0
            0 0 B 0 0
            0 0 0 A 0 <span class="token punctuation">"</span></span><span class="token punctuation">/></span></span>
<span class="token tag"><span class="token tag"><span class="token punctuation">&lt;/</span>filter</span><span class="token punctuation">></span></span></code>` + "";

	let t99;
	let pre8;

	let raw8_value = `<code class="language-js"><span class="token comment">/* R G B A 1 */</span>
<span class="token number">1</span> <span class="token number">0</span> <span class="token number">0</span> <span class="token number">0</span> <span class="token number">0</span> <span class="token comment">// R = 1*R + 0*G + 0*B + 0*A + 0</span>
<span class="token number">0</span> <span class="token number">1</span> <span class="token number">0</span> <span class="token number">0</span> <span class="token number">0</span> <span class="token comment">// G = 0*R + 1*G + 0*B + 0*A + 0</span>
<span class="token number">0</span> <span class="token number">0</span> <span class="token number">1</span> <span class="token number">0</span> <span class="token number">0</span> <span class="token comment">// B = 0*R + 0*G + 1*B + 0*A + 0</span>
<span class="token number">0</span> <span class="token number">0</span> <span class="token number">0</span> <span class="token number">1</span> <span class="token number">0</span> <span class="token comment">// A = 0*R + 0*G + 0*B + 1*A + 0</span></code>` + "";

	let t100;
	let ul10;
	let li31;
	let a22;
	let t101;
	let t102;
	let section6;
	let h33;
	let a23;
	let t103;
	let t104;
	let p6;
	let picture4;
	let source8;
	let source9;
	let img4;
	let t105;
	let ul11;
	let li32;
	let t106;
	let t107;
	let li33;
	let t108;
	let picture5;
	let source10;
	let source11;
	let img5;
	let t109;
	let li34;
	let t110;
	let picture6;
	let source12;
	let source13;
	let img6;
	let t111;
	let section7;
	let h34;
	let a24;
	let t112;
	let t113;
	let ul13;
	let li38;
	let p7;
	let t114;
	let t115;
	let ul12;
	let li35;
	let t116;
	let t117;
	let li36;
	let t118;
	let t119;
	let li37;
	let t120;
	let picture7;
	let source14;
	let source15;
	let img7;
	let t121;
	let li39;
	let p8;
	let t122;
	let picture8;
	let source16;
	let source17;
	let img8;
	let t123;
	let li40;
	let p9;
	let t124;
	let picture9;
	let source18;
	let source19;
	let img9;
	let t125;
	let ul15;
	let li42;
	let t126;
	let picture10;
	let source20;
	let source21;
	let img10;
	let ul14;
	let li41;
	let t127;
	let t128;
	let pre9;

	let raw9_value = `<code class="language-xml"><span class="token tag"><span class="token tag"><span class="token punctuation">&lt;</span>filter</span><span class="token punctuation">></span></span>
  <span class="token tag"><span class="token tag"><span class="token punctuation">&lt;</span>feColorMatrix</span>
    <span class="token attr-name">type</span><span class="token attr-value"><span class="token punctuation">=</span><span class="token punctuation">"</span>matrix<span class="token punctuation">"</span></span>
    <span class="token attr-name">values</span><span class="token attr-value"><span class="token punctuation">=</span><span class="token punctuation">"</span>1  0  0  0  0
            0  1  0  0  0
            0  0  1 -1  0
            0  0  0  1  0 <span class="token punctuation">"</span></span><span class="token punctuation">/></span></span>
<span class="token tag"><span class="token tag"><span class="token punctuation">&lt;/</span>filter</span><span class="token punctuation">></span></span>

<span class="token tag"><span class="token tag"><span class="token punctuation">&lt;</span>filter</span><span class="token punctuation">></span></span>
  <span class="token tag"><span class="token tag"><span class="token punctuation">&lt;</span>feColorMatrix</span>
    <span class="token attr-name">type</span><span class="token attr-value"><span class="token punctuation">=</span><span class="token punctuation">"</span>matrix<span class="token punctuation">"</span></span>
    <span class="token attr-name">values</span><span class="token attr-value"><span class="token punctuation">=</span><span class="token punctuation">"</span>1  0  0  0  0
            0  1  0  0  0
            0  0  0  0  0
            0  0  0  1  0 <span class="token punctuation">"</span></span><span class="token punctuation">/></span></span>
<span class="token tag"><span class="token tag"><span class="token punctuation">&lt;/</span>filter</span><span class="token punctuation">></span></span></code>` + "";

	let t129;
	let section8;
	let h35;
	let a25;
	let t130;
	let t131;
	let ul16;
	let li43;
	let t132;
	let t133;
	let li44;
	let t134;
	let code10;
	let t135;
	let t136;
	let picture11;
	let source22;
	let source23;
	let img11;
	let t137;
	let section9;
	let h36;
	let a26;
	let t138;
	let t139;
	let ul17;
	let li45;
	let t140;
	let picture12;
	let source24;
	let source25;
	let img12;
	let t141;
	let section10;
	let h37;
	let a27;
	let t142;
	let t143;
	let ul18;
	let li46;
	let t144;
	let picture13;
	let source26;
	let source27;
	let img13;
	let t145;
	let picture14;
	let source28;
	let source29;
	let img14;
	let t146;
	let section11;
	let h38;
	let a28;
	let t147;
	let t148;
	let ul19;
	let li47;
	let t149;
	let picture15;
	let source30;
	let source31;
	let img15;
	let t150;
	let section12;
	let h22;
	let a29;
	let t151;
	let code11;
	let t152;
	let t153;
	let p10;
	let t154;
	let a30;
	let t155;
	let t156;
	let t157;
	let ul20;
	let li48;
	let t158;
	let code12;
	let t159;
	let t160;
	let code13;
	let t161;
	let t162;
	let li49;
	let t163;
	let t164;
	let li50;
	let t165;
	let code14;
	let t166;
	let t167;
	let t168;
	let li51;
	let t169;
	let code15;
	let t170;
	let t171;
	let t172;
	let pre10;

	let raw10_value = `<code class="language-html"><span class="token tag"><span class="token tag"><span class="token punctuation">&lt;</span>filter</span><span class="token punctuation">></span></span>
  <span class="token tag"><span class="token tag"><span class="token punctuation">&lt;</span>feMorphology</span> 
    <span class="token attr-name">in</span><span class="token attr-value"><span class="token punctuation">=</span><span class="token punctuation">"</span>..<span class="token punctuation">"</span></span> <span class="token attr-name">result</span><span class="token attr-value"><span class="token punctuation">=</span><span class="token punctuation">"</span>..<span class="token punctuation">"</span></span> 
    <span class="token attr-name">operator</span><span class="token attr-value"><span class="token punctuation">=</span><span class="token punctuation">"</span>dilate || erode<span class="token punctuation">"</span></span> <span class="token attr-name">radius</span><span class="token attr-value"><span class="token punctuation">=</span><span class="token punctuation">"</span><span class="token punctuation">"</span></span> <span class="token punctuation">/></span></span>
<span class="token tag"><span class="token tag"><span class="token punctuation">&lt;/</span>filter</span><span class="token punctuation">></span></span></code>` + "";

	let t173;
	let p11;
	let img16;
	let t174;
	let morphology;
	let t175;
	let p12;
	let a31;
	let t176;
	let t177;
	let t178;
	let section13;
	let h39;
	let a32;
	let t179;
	let code16;
	let t180;
	let t181;
	let p13;
	let t182;
	let code17;
	let t183;
	let t184;
	let code18;
	let t185;
	let t186;
	let code19;
	let t187;
	let t188;
	let t189;
	let pre11;

	let raw11_value = `<code class="language-html"><span class="token tag"><span class="token tag"><span class="token punctuation">&lt;</span>h1</span><span class="token style-attr language-css"><span class="token attr-name"> <span class="token attr-name">style</span></span><span class="token punctuation">="</span><span class="token attr-value"><span class="token property">filter</span><span class="token punctuation">:</span> <span class="token url"><span class="token function">url</span><span class="token punctuation">(</span>#outline<span class="token punctuation">)</span></span></span><span class="token punctuation">"</span></span><span class="token punctuation">></span></span>Hello World<span class="token tag"><span class="token tag"><span class="token punctuation">&lt;/</span>h1</span><span class="token punctuation">></span></span>

<span class="token tag"><span class="token tag"><span class="token punctuation">&lt;</span>svg</span><span class="token punctuation">></span></span>
	<span class="token tag"><span class="token tag"><span class="token punctuation">&lt;</span>filter</span> <span class="token attr-name">id</span><span class="token attr-value"><span class="token punctuation">=</span><span class="token punctuation">"</span>outline<span class="token punctuation">"</span></span><span class="token punctuation">></span></span>
		<span class="token tag"><span class="token tag"><span class="token punctuation">&lt;</span>feMorphology</span> <span class="token attr-name">result</span><span class="token attr-value"><span class="token punctuation">=</span><span class="token punctuation">"</span>THICK<span class="token punctuation">"</span></span> <span class="token attr-name">operator</span><span class="token attr-value"><span class="token punctuation">=</span><span class="token punctuation">"</span>dilate<span class="token punctuation">"</span></span> <span class="token attr-name">radius</span><span class="token attr-value"><span class="token punctuation">=</span><span class="token punctuation">"</span>4<span class="token punctuation">"</span></span> <span class="token punctuation">/></span></span>
		<span class="token tag"><span class="token tag"><span class="token punctuation">&lt;</span>feFlood</span> <span class="token attr-name">flood-color</span><span class="token attr-value"><span class="token punctuation">=</span><span class="token punctuation">"</span>#32DFEC<span class="token punctuation">"</span></span> <span class="token attr-name">flood-opacity</span><span class="token attr-value"><span class="token punctuation">=</span><span class="token punctuation">"</span>1<span class="token punctuation">"</span></span> <span class="token attr-name">result</span><span class="token attr-value"><span class="token punctuation">=</span><span class="token punctuation">"</span>COLOR<span class="token punctuation">"</span></span> <span class="token punctuation">/></span></span>
		<span class="token tag"><span class="token tag"><span class="token punctuation">&lt;</span>feComposite</span> <span class="token attr-name">in</span><span class="token attr-value"><span class="token punctuation">=</span><span class="token punctuation">"</span>COLOR<span class="token punctuation">"</span></span> <span class="token attr-name">in2</span><span class="token attr-value"><span class="token punctuation">=</span><span class="token punctuation">"</span>THICK<span class="token punctuation">"</span></span> <span class="token attr-name">operator</span><span class="token attr-value"><span class="token punctuation">=</span><span class="token punctuation">"</span>in<span class="token punctuation">"</span></span> <span class="token attr-name">result</span><span class="token attr-value"><span class="token punctuation">=</span><span class="token punctuation">"</span>OUTLINE<span class="token punctuation">"</span></span> <span class="token punctuation">/></span></span>
		<span class="token tag"><span class="token tag"><span class="token punctuation">&lt;</span>feMerge</span><span class="token punctuation">></span></span>
			<span class="token tag"><span class="token tag"><span class="token punctuation">&lt;</span>feMergeNode</span> <span class="token attr-name">in</span><span class="token attr-value"><span class="token punctuation">=</span><span class="token punctuation">"</span>OUTLINE<span class="token punctuation">"</span></span> <span class="token punctuation">/></span></span>
			<span class="token tag"><span class="token tag"><span class="token punctuation">&lt;</span>feMergeNode</span> <span class="token attr-name">in</span><span class="token attr-value"><span class="token punctuation">=</span><span class="token punctuation">"</span>SourceGraphic<span class="token punctuation">"</span></span> <span class="token punctuation">/></span></span>
		<span class="token tag"><span class="token tag"><span class="token punctuation">&lt;/</span>feMerge</span><span class="token punctuation">></span></span>
	<span class="token tag"><span class="token tag"><span class="token punctuation">&lt;/</span>filter</span><span class="token punctuation">></span></span>
<span class="token tag"><span class="token tag"><span class="token punctuation">&lt;/</span>svg</span><span class="token punctuation">></span></span></code>` + "";

	let t190;
	let p14;
	let img17;
	let t191;
	let p15;
	let a33;
	let t192;
	let t193;
	let code20;
	let t194;
	let t195;
	let section14;
	let h310;
	let a34;
	let t196;
	let code21;
	let t197;
	let t198;
	let p16;
	let t199;
	let code22;
	let t200;
	let t201;
	let code23;
	let t202;
	let t203;
	let code24;
	let t204;
	let t205;
	let t206;
	let pre12;

	let raw12_value = `<code class="language-html"><span class="token tag"><span class="token tag"><span class="token punctuation">&lt;</span>h1</span><span class="token style-attr language-css"><span class="token attr-name"> <span class="token attr-name">style</span></span><span class="token punctuation">="</span><span class="token attr-value"><span class="token property">filter</span><span class="token punctuation">:</span> <span class="token url"><span class="token function">url</span><span class="token punctuation">(</span>#outline<span class="token punctuation">)</span></span></span><span class="token punctuation">"</span></span><span class="token punctuation">></span></span>Hello World<span class="token tag"><span class="token tag"><span class="token punctuation">&lt;/</span>h1</span><span class="token punctuation">></span></span>

<span class="token tag"><span class="token tag"><span class="token punctuation">&lt;</span>svg</span><span class="token punctuation">></span></span>
	<span class="token tag"><span class="token tag"><span class="token punctuation">&lt;</span>filter</span> <span class="token attr-name">id</span><span class="token attr-value"><span class="token punctuation">=</span><span class="token punctuation">"</span>outline<span class="token punctuation">"</span></span><span class="token punctuation">></span></span>
		<span class="token tag"><span class="token tag"><span class="token punctuation">&lt;</span>feMorphology</span> <span class="token attr-name">result</span><span class="token attr-value"><span class="token punctuation">=</span><span class="token punctuation">"</span>THICK<span class="token punctuation">"</span></span> <span class="token attr-name">operator</span><span class="token attr-value"><span class="token punctuation">=</span><span class="token punctuation">"</span>dilate<span class="token punctuation">"</span></span> <span class="token attr-name">radius</span><span class="token attr-value"><span class="token punctuation">=</span><span class="token punctuation">"</span>4<span class="token punctuation">"</span></span> <span class="token punctuation">/></span></span>
		<span class="token tag"><span class="token tag"><span class="token punctuation">&lt;</span>feComposite</span> <span class="token attr-name">in</span><span class="token attr-value"><span class="token punctuation">=</span><span class="token punctuation">"</span>THICK<span class="token punctuation">"</span></span> <span class="token attr-name">in2</span><span class="token attr-value"><span class="token punctuation">=</span><span class="token punctuation">"</span>SourceGraphic<span class="token punctuation">"</span></span> <span class="token attr-name">operator</span><span class="token attr-value"><span class="token punctuation">=</span><span class="token punctuation">"</span>out<span class="token punctuation">"</span></span> <span class="token punctuation">/></span></span>
	<span class="token tag"><span class="token tag"><span class="token punctuation">&lt;/</span>filter</span><span class="token punctuation">></span></span>
<span class="token tag"><span class="token tag"><span class="token punctuation">&lt;/</span>svg</span><span class="token punctuation">></span></span></code>` + "";

	let t207;
	let p17;
	let img18;
	let t208;
	let knockouttext;
	let t209;
	let p18;
	let a35;
	let t210;
	let t211;
	let current;
	morphology = new Morphology({});
	knockouttext = new KnockoutText({});

	return {
		c() {
			section0 = element("section");
			ul3 = element("ul");
			li0 = element("li");
			a0 = element("a");
			t0 = text("SVG Filters 101");
			ul0 = element("ul");
			li1 = element("li");
			a1 = element("a");
			t1 = text("filter primitives");
			li2 = element("li");
			a2 = element("a");
			t2 = text("Filter region");
			li3 = element("li");
			a3 = element("a");
			t3 = text("Create a drop shadow");
			li4 = element("li");
			a4 = element("a");
			t4 = text("Finessing  feColorMatrix");
			ul1 = element("ul");
			li5 = element("li");
			a5 = element("a");
			t5 = text("1. Colorizing");
			li6 = element("li");
			a6 = element("a");
			t6 = text("2. Alpha values");
			li7 = element("li");
			a7 = element("a");
			t7 = text("3. Blowing out channels");
			li8 = element("li");
			a8 = element("a");
			t8 = text("4. Change color");
			li9 = element("li");
			a9 = element("a");
			t9 = text("5. Lighten or darken");
			li10 = element("li");
			a10 = element("a");
			t10 = text("6. Grayscale");
			li11 = element("li");
			a11 = element("a");
			t11 = text("Outline Text with  <feMorphology>");
			ul2 = element("ul");
			li12 = element("li");
			a12 = element("a");
			t12 = text("Adding Colored Outline to Text with  <feMorphology />");
			li13 = element("li");
			a13 = element("a");
			t13 = text("Knockout text with  <feMorphology />");
			t14 = space();
			section1 = element("section");
			h20 = element("h2");
			a14 = element("a");
			t15 = text("SVG Filters 101");
			t16 = space();
			p0 = element("p");
			t17 = text("[ ");
			a15 = element("a");
			t18 = text("Source");
			t19 = text(" ]");
			t20 = space();
			ul4 = element("ul");
			li14 = element("li");
			t21 = text("defined in ");
			code0 = element("code");
			t22 = text("<filter>");
			t23 = text(" element");
			t24 = space();
			li15 = element("li");
			t25 = text("define a series of one or more filter primitives");
			t26 = space();
			li16 = element("li");
			t27 = text("1 filter primitive performs ");
			strong0 = element("strong");
			t28 = text("1 single fundamental graphic operation");
			t29 = text(" on ");
			strong1 = element("strong");
			t30 = text("one or more");
			t31 = text(" inputs");
			t32 = space();
			section2 = element("section");
			h30 = element("h3");
			a16 = element("a");
			t33 = text("filter primitives");
			t34 = space();
			ul5 = element("ul");
			li17 = element("li");
			t35 = text("filter primitives named start with ");
			code1 = element("code");
			t36 = text("fe");
			t37 = text(", short for \"filter effect\"");
			t38 = space();
			li18 = element("li");
			t39 = text("filter primitives take 1-2 inputs and output 1 result");
			t40 = space();
			li19 = element("li");
			code2 = element("code");
			t41 = text("in");
			t42 = text(" and ");
			code3 = element("code");
			t43 = text("in2");
			t44 = text(" attribute for input, ");
			code4 = element("code");
			t45 = text("result");
			t46 = text(" attribute for output");
			t47 = space();
			li20 = element("li");
			t48 = text("input takes in result, ");
			code5 = element("code");
			t49 = text("SourceGraphic");
			t50 = text(" and ");
			code6 = element("code");
			t51 = text("SourceAlpha");
			t52 = space();
			pre0 = element("pre");
			t53 = space();
			section3 = element("section");
			h31 = element("h3");
			a17 = element("a");
			t54 = text("Filter region");
			t55 = space();
			ul6 = element("ul");
			li21 = element("li");
			t56 = text("filter region is based on the bounding box of the element");
			t57 = space();
			li22 = element("li");
			t58 = text("filter result beyond filter region will be clipped off");
			t59 = space();
			li23 = element("li");
			t60 = text("default filter region extends 10% the width and height of bounding box in all 4 directions");
			t61 = space();
			pre1 = element("pre");
			t62 = space();
			ul7 = element("ul");
			li24 = element("li");
			t63 = text("use ");
			code7 = element("code");
			t64 = text("<feFlood>");
			t65 = text(" to figure out the filter region");
			t66 = space();
			pre2 = element("pre");
			t67 = space();
			section4 = element("section");
			h32 = element("h3");
			a18 = element("a");
			t68 = text("Create a drop shadow");
			t69 = space();
			ol0 = element("ol");
			li25 = element("li");
			t70 = text("Blur the silhouette of the layer");
			t71 = space();
			pre3 = element("pre");
			t72 = space();
			p1 = element("p");
			picture0 = element("picture");
			source0 = element("source");
			source1 = element("source");
			img0 = element("img");
			t73 = space();
			ol1 = element("ol");
			li26 = element("li");
			t74 = text("Composite the blur layer with a solid color layer to create a colored blur");
			t75 = space();
			ul8 = element("ul");
			li27 = element("li");
			t76 = text("Learn compositing + blending in ");
			a19 = element("a");
			t77 = text("https://www.sarasoueidan.com/blog/compositing-and-blending-in-css/");
			t78 = space();
			pre4 = element("pre");
			t79 = space();
			p2 = element("p");
			picture1 = element("picture");
			source2 = element("source");
			source3 = element("source");
			img1 = element("img");
			t80 = space();
			ol2 = element("ol");
			li28 = element("li");
			t81 = text("Shift the shadow bottom-right with ");
			code8 = element("code");
			t82 = text("<feOffset>");
			t83 = space();
			pre5 = element("pre");
			t84 = space();
			p3 = element("p");
			picture2 = element("picture");
			source4 = element("source");
			source5 = element("source");
			img2 = element("img");
			t85 = space();
			ol3 = element("ol");
			li29 = element("li");
			t86 = text("Combine the shadow with the original image");
			t87 = space();
			ul9 = element("ul");
			li30 = element("li");
			t88 = text("layer merge in order of declaration, latter layer stacks on top of previous layer");
			t89 = space();
			pre6 = element("pre");
			t90 = space();
			p4 = element("p");
			picture3 = element("picture");
			source6 = element("source");
			source7 = element("source");
			img3 = element("img");
			t91 = space();
			section5 = element("section");
			h21 = element("h2");
			a20 = element("a");
			t92 = text("Finessing ");
			code9 = element("code");
			t93 = text("feColorMatrix");
			t94 = space();
			p5 = element("p");
			t95 = text("[ ");
			a21 = element("a");
			t96 = text("Source");
			t97 = text(" ]");
			t98 = space();
			pre7 = element("pre");
			t99 = space();
			pre8 = element("pre");
			t100 = space();
			ul10 = element("ul");
			li31 = element("li");
			a22 = element("a");
			t101 = text("color matrix playground");
			t102 = space();
			section6 = element("section");
			h33 = element("h3");
			a23 = element("a");
			t103 = text("1. Colorizing");
			t104 = space();
			p6 = element("p");
			picture4 = element("picture");
			source8 = element("source");
			source9 = element("source");
			img4 = element("img");
			t105 = space();
			ul11 = element("ul");
			li32 = element("li");
			t106 = text("Removing other color to colorise image into the remaining color");
			t107 = space();
			li33 = element("li");
			t108 = text("colorise red -> remove blue & green\n");
			picture5 = element("picture");
			source10 = element("source");
			source11 = element("source");
			img5 = element("img");
			t109 = space();
			li34 = element("li");
			t110 = text("colorise yellow -> remove blue (red + green = yellow)\n");
			picture6 = element("picture");
			source12 = element("source");
			source13 = element("source");
			img6 = element("img");
			t111 = space();
			section7 = element("section");
			h34 = element("h3");
			a24 = element("a");
			t112 = text("2. Alpha values");
			t113 = space();
			ul13 = element("ul");
			li38 = element("li");
			p7 = element("p");
			t114 = text("add opacity level to the red channel");
			t115 = space();
			ul12 = element("ul");
			li35 = element("li");
			t116 = text("any red remaining red");
			t117 = space();
			li36 = element("li");
			t118 = text("green -> yellow (red + green = yellow)");
			t119 = space();
			li37 = element("li");
			t120 = text("blue -> magenta (red + blue = magenta)\n");
			picture7 = element("picture");
			source14 = element("source");
			source15 = element("source");
			img7 = element("img");
			t121 = space();
			li39 = element("li");
			p8 = element("p");
			t122 = text("hard yellow filter\n");
			picture8 = element("picture");
			source16 = element("source");
			source17 = element("source");
			img8 = element("img");
			t123 = space();
			li40 = element("li");
			p9 = element("p");
			t124 = text("have a value some where between 0-1 to see the mixture in the shadow\n");
			picture9 = element("picture");
			source18 = element("source");
			source19 = element("source");
			img9 = element("img");
			t125 = space();
			ul15 = element("ul");
			li42 = element("li");
			t126 = text("negative value could offset the channel by the amount of opacity\n");
			picture10 = element("picture");
			source20 = element("source");
			source21 = element("source");
			img10 = element("img");
			ul14 = element("ul");
			li41 = element("li");
			t127 = text("the following 2 color matrix is identical");
			t128 = space();
			pre9 = element("pre");
			t129 = space();
			section8 = element("section");
			h35 = element("h3");
			a25 = element("a");
			t130 = text("3. Blowing out channels");
			t131 = space();
			ul16 = element("ul");
			li43 = element("li");
			t132 = text("turn 1 color to white");
			t133 = space();
			li44 = element("li");
			t134 = text("set the alpha channel to ");
			code10 = element("code");
			t135 = text("-2");
			t136 = space();
			picture11 = element("picture");
			source22 = element("source");
			source23 = element("source");
			img11 = element("img");
			t137 = space();
			section9 = element("section");
			h36 = element("h3");
			a26 = element("a");
			t138 = text("4. Change color");
			t139 = space();
			ul17 = element("ul");
			li45 = element("li");
			t140 = text("No more green, any green looks like magenta now. (luminosity of green is lost)\n");
			picture12 = element("picture");
			source24 = element("source");
			source25 = element("source");
			img12 = element("img");
			t141 = space();
			section10 = element("section");
			h37 = element("h3");
			a27 = element("a");
			t142 = text("5. Lighten or darken");
			t143 = space();
			ul18 = element("ul");
			li46 = element("li");
			t144 = text("increase intensity to lighten, decrease to darken\n");
			picture13 = element("picture");
			source26 = element("source");
			source27 = element("source");
			img13 = element("img");
			t145 = space();
			picture14 = element("picture");
			source28 = element("source");
			source29 = element("source");
			img14 = element("img");
			t146 = space();
			section11 = element("section");
			h38 = element("h3");
			a28 = element("a");
			t147 = text("6. Grayscale");
			t148 = space();
			ul19 = element("ul");
			li47 = element("li");
			t149 = text("make sure red, green, blue have the same value\n");
			picture15 = element("picture");
			source30 = element("source");
			source31 = element("source");
			img15 = element("img");
			t150 = space();
			section12 = element("section");
			h22 = element("h2");
			a29 = element("a");
			t151 = text("Outline Text with ");
			code11 = element("code");
			t152 = text("<feMorphology>");
			t153 = space();
			p10 = element("p");
			t154 = text("[ ");
			a30 = element("a");
			t155 = text("Source");
			t156 = text(" ]");
			t157 = space();
			ul20 = element("ul");
			li48 = element("li");
			t158 = text("🖼 image size gets smaller when ");
			code12 = element("code");
			t159 = text("erode");
			t160 = text(", larger when ");
			code13 = element("code");
			t161 = text("dilate");
			t162 = space();
			li49 = element("li");
			t163 = text("🖼 image looks like painted with large brush 🖌");
			t164 = space();
			li50 = element("li");
			t165 = text("📝 ");
			code14 = element("code");
			t166 = text("erode");
			t167 = text(" sets each pixel to the darkest / most transparent neighbor");
			t168 = space();
			li51 = element("li");
			t169 = text("📝 ");
			code15 = element("code");
			t170 = text("dilate");
			t171 = text(" sets each pixel to the brightest / least transparent neighbor");
			t172 = space();
			pre10 = element("pre");
			t173 = space();
			p11 = element("p");
			img16 = element("img");
			t174 = space();
			create_component(morphology.$$.fragment);
			t175 = space();
			p12 = element("p");
			a31 = element("a");
			t176 = text("REPL");
			t177 = text(" to see effect with different radius.");
			t178 = space();
			section13 = element("section");
			h39 = element("h3");
			a32 = element("a");
			t179 = text("Adding Colored Outline to Text with ");
			code16 = element("code");
			t180 = text("<feMorphology />");
			t181 = space();
			p13 = element("p");
			t182 = text("1️⃣ expand the text with ");
			code17 = element("code");
			t183 = text("<feMorphology operator=\"dilate\" />");
			t184 = text("\n2️⃣ colorize via ");
			code18 = element("code");
			t185 = text("<feFlood>");
			t186 = text(" with solid color and ");
			code19 = element("code");
			t187 = text("<feComposite />");
			t188 = text("\n3️⃣ merge the expanded colored text with the original text");
			t189 = space();
			pre11 = element("pre");
			t190 = space();
			p14 = element("p");
			img17 = element("img");
			t191 = space();
			p15 = element("p");
			a33 = element("a");
			t192 = text("REPL");
			t193 = text(" to visualise ");
			code20 = element("code");
			t194 = text("<feMorphology>");
			t195 = space();
			section14 = element("section");
			h310 = element("h3");
			a34 = element("a");
			t196 = text("Knockout text with ");
			code21 = element("code");
			t197 = text("<feMorphology />");
			t198 = space();
			p16 = element("p");
			t199 = text("1️⃣ expand the text with ");
			code22 = element("code");
			t200 = text("<feMorphology operator=\"dilate\" />");
			t201 = text("\n2️⃣ composite with the source with ");
			code23 = element("code");
			t202 = text("<feComposite />");
			t203 = text(" using ");
			code24 = element("code");
			t204 = text("out");
			t205 = text(" operator");
			t206 = space();
			pre12 = element("pre");
			t207 = space();
			p17 = element("p");
			img18 = element("img");
			t208 = space();
			create_component(knockouttext.$$.fragment);
			t209 = space();
			p18 = element("p");
			a35 = element("a");
			t210 = text("REPL");
			t211 = text(" to visualise the build up the knock-out text.");
			this.h();
		},
		l(nodes) {
			section0 = claim_element(nodes, "SECTION", {});
			var section0_nodes = children(section0);

			ul3 = claim_element(section0_nodes, "UL", {
				class: true,
				id: true,
				role: true,
				"aria-label": true
			});

			var ul3_nodes = children(ul3);
			li0 = claim_element(ul3_nodes, "LI", {});
			var li0_nodes = children(li0);
			a0 = claim_element(li0_nodes, "A", { href: true });
			var a0_nodes = children(a0);
			t0 = claim_text(a0_nodes, "SVG Filters 101");
			a0_nodes.forEach(detach);
			li0_nodes.forEach(detach);
			ul0 = claim_element(ul3_nodes, "UL", {});
			var ul0_nodes = children(ul0);
			li1 = claim_element(ul0_nodes, "LI", {});
			var li1_nodes = children(li1);
			a1 = claim_element(li1_nodes, "A", { href: true });
			var a1_nodes = children(a1);
			t1 = claim_text(a1_nodes, "filter primitives");
			a1_nodes.forEach(detach);
			li1_nodes.forEach(detach);
			li2 = claim_element(ul0_nodes, "LI", {});
			var li2_nodes = children(li2);
			a2 = claim_element(li2_nodes, "A", { href: true });
			var a2_nodes = children(a2);
			t2 = claim_text(a2_nodes, "Filter region");
			a2_nodes.forEach(detach);
			li2_nodes.forEach(detach);
			li3 = claim_element(ul0_nodes, "LI", {});
			var li3_nodes = children(li3);
			a3 = claim_element(li3_nodes, "A", { href: true });
			var a3_nodes = children(a3);
			t3 = claim_text(a3_nodes, "Create a drop shadow");
			a3_nodes.forEach(detach);
			li3_nodes.forEach(detach);
			ul0_nodes.forEach(detach);
			li4 = claim_element(ul3_nodes, "LI", {});
			var li4_nodes = children(li4);
			a4 = claim_element(li4_nodes, "A", { href: true });
			var a4_nodes = children(a4);
			t4 = claim_text(a4_nodes, "Finessing  feColorMatrix");
			a4_nodes.forEach(detach);
			li4_nodes.forEach(detach);
			ul1 = claim_element(ul3_nodes, "UL", {});
			var ul1_nodes = children(ul1);
			li5 = claim_element(ul1_nodes, "LI", {});
			var li5_nodes = children(li5);
			a5 = claim_element(li5_nodes, "A", { href: true });
			var a5_nodes = children(a5);
			t5 = claim_text(a5_nodes, "1. Colorizing");
			a5_nodes.forEach(detach);
			li5_nodes.forEach(detach);
			li6 = claim_element(ul1_nodes, "LI", {});
			var li6_nodes = children(li6);
			a6 = claim_element(li6_nodes, "A", { href: true });
			var a6_nodes = children(a6);
			t6 = claim_text(a6_nodes, "2. Alpha values");
			a6_nodes.forEach(detach);
			li6_nodes.forEach(detach);
			li7 = claim_element(ul1_nodes, "LI", {});
			var li7_nodes = children(li7);
			a7 = claim_element(li7_nodes, "A", { href: true });
			var a7_nodes = children(a7);
			t7 = claim_text(a7_nodes, "3. Blowing out channels");
			a7_nodes.forEach(detach);
			li7_nodes.forEach(detach);
			li8 = claim_element(ul1_nodes, "LI", {});
			var li8_nodes = children(li8);
			a8 = claim_element(li8_nodes, "A", { href: true });
			var a8_nodes = children(a8);
			t8 = claim_text(a8_nodes, "4. Change color");
			a8_nodes.forEach(detach);
			li8_nodes.forEach(detach);
			li9 = claim_element(ul1_nodes, "LI", {});
			var li9_nodes = children(li9);
			a9 = claim_element(li9_nodes, "A", { href: true });
			var a9_nodes = children(a9);
			t9 = claim_text(a9_nodes, "5. Lighten or darken");
			a9_nodes.forEach(detach);
			li9_nodes.forEach(detach);
			li10 = claim_element(ul1_nodes, "LI", {});
			var li10_nodes = children(li10);
			a10 = claim_element(li10_nodes, "A", { href: true });
			var a10_nodes = children(a10);
			t10 = claim_text(a10_nodes, "6. Grayscale");
			a10_nodes.forEach(detach);
			li10_nodes.forEach(detach);
			ul1_nodes.forEach(detach);
			li11 = claim_element(ul3_nodes, "LI", {});
			var li11_nodes = children(li11);
			a11 = claim_element(li11_nodes, "A", { href: true });
			var a11_nodes = children(a11);
			t11 = claim_text(a11_nodes, "Outline Text with  <feMorphology>");
			a11_nodes.forEach(detach);
			li11_nodes.forEach(detach);
			ul2 = claim_element(ul3_nodes, "UL", {});
			var ul2_nodes = children(ul2);
			li12 = claim_element(ul2_nodes, "LI", {});
			var li12_nodes = children(li12);
			a12 = claim_element(li12_nodes, "A", { href: true });
			var a12_nodes = children(a12);
			t12 = claim_text(a12_nodes, "Adding Colored Outline to Text with  <feMorphology />");
			a12_nodes.forEach(detach);
			li12_nodes.forEach(detach);
			li13 = claim_element(ul2_nodes, "LI", {});
			var li13_nodes = children(li13);
			a13 = claim_element(li13_nodes, "A", { href: true });
			var a13_nodes = children(a13);
			t13 = claim_text(a13_nodes, "Knockout text with  <feMorphology />");
			a13_nodes.forEach(detach);
			li13_nodes.forEach(detach);
			ul2_nodes.forEach(detach);
			ul3_nodes.forEach(detach);
			section0_nodes.forEach(detach);
			t14 = claim_space(nodes);
			section1 = claim_element(nodes, "SECTION", {});
			var section1_nodes = children(section1);
			h20 = claim_element(section1_nodes, "H2", {});
			var h20_nodes = children(h20);
			a14 = claim_element(h20_nodes, "A", { href: true, id: true });
			var a14_nodes = children(a14);
			t15 = claim_text(a14_nodes, "SVG Filters 101");
			a14_nodes.forEach(detach);
			h20_nodes.forEach(detach);
			t16 = claim_space(section1_nodes);
			p0 = claim_element(section1_nodes, "P", {});
			var p0_nodes = children(p0);
			t17 = claim_text(p0_nodes, "[ ");
			a15 = claim_element(p0_nodes, "A", { href: true, rel: true });
			var a15_nodes = children(a15);
			t18 = claim_text(a15_nodes, "Source");
			a15_nodes.forEach(detach);
			t19 = claim_text(p0_nodes, " ]");
			p0_nodes.forEach(detach);
			t20 = claim_space(section1_nodes);
			ul4 = claim_element(section1_nodes, "UL", {});
			var ul4_nodes = children(ul4);
			li14 = claim_element(ul4_nodes, "LI", {});
			var li14_nodes = children(li14);
			t21 = claim_text(li14_nodes, "defined in ");
			code0 = claim_element(li14_nodes, "CODE", {});
			var code0_nodes = children(code0);
			t22 = claim_text(code0_nodes, "<filter>");
			code0_nodes.forEach(detach);
			t23 = claim_text(li14_nodes, " element");
			li14_nodes.forEach(detach);
			t24 = claim_space(ul4_nodes);
			li15 = claim_element(ul4_nodes, "LI", {});
			var li15_nodes = children(li15);
			t25 = claim_text(li15_nodes, "define a series of one or more filter primitives");
			li15_nodes.forEach(detach);
			t26 = claim_space(ul4_nodes);
			li16 = claim_element(ul4_nodes, "LI", {});
			var li16_nodes = children(li16);
			t27 = claim_text(li16_nodes, "1 filter primitive performs ");
			strong0 = claim_element(li16_nodes, "STRONG", {});
			var strong0_nodes = children(strong0);
			t28 = claim_text(strong0_nodes, "1 single fundamental graphic operation");
			strong0_nodes.forEach(detach);
			t29 = claim_text(li16_nodes, " on ");
			strong1 = claim_element(li16_nodes, "STRONG", {});
			var strong1_nodes = children(strong1);
			t30 = claim_text(strong1_nodes, "one or more");
			strong1_nodes.forEach(detach);
			t31 = claim_text(li16_nodes, " inputs");
			li16_nodes.forEach(detach);
			ul4_nodes.forEach(detach);
			section1_nodes.forEach(detach);
			t32 = claim_space(nodes);
			section2 = claim_element(nodes, "SECTION", {});
			var section2_nodes = children(section2);
			h30 = claim_element(section2_nodes, "H3", {});
			var h30_nodes = children(h30);
			a16 = claim_element(h30_nodes, "A", { href: true, id: true });
			var a16_nodes = children(a16);
			t33 = claim_text(a16_nodes, "filter primitives");
			a16_nodes.forEach(detach);
			h30_nodes.forEach(detach);
			t34 = claim_space(section2_nodes);
			ul5 = claim_element(section2_nodes, "UL", {});
			var ul5_nodes = children(ul5);
			li17 = claim_element(ul5_nodes, "LI", {});
			var li17_nodes = children(li17);
			t35 = claim_text(li17_nodes, "filter primitives named start with ");
			code1 = claim_element(li17_nodes, "CODE", {});
			var code1_nodes = children(code1);
			t36 = claim_text(code1_nodes, "fe");
			code1_nodes.forEach(detach);
			t37 = claim_text(li17_nodes, ", short for \"filter effect\"");
			li17_nodes.forEach(detach);
			t38 = claim_space(ul5_nodes);
			li18 = claim_element(ul5_nodes, "LI", {});
			var li18_nodes = children(li18);
			t39 = claim_text(li18_nodes, "filter primitives take 1-2 inputs and output 1 result");
			li18_nodes.forEach(detach);
			t40 = claim_space(ul5_nodes);
			li19 = claim_element(ul5_nodes, "LI", {});
			var li19_nodes = children(li19);
			code2 = claim_element(li19_nodes, "CODE", {});
			var code2_nodes = children(code2);
			t41 = claim_text(code2_nodes, "in");
			code2_nodes.forEach(detach);
			t42 = claim_text(li19_nodes, " and ");
			code3 = claim_element(li19_nodes, "CODE", {});
			var code3_nodes = children(code3);
			t43 = claim_text(code3_nodes, "in2");
			code3_nodes.forEach(detach);
			t44 = claim_text(li19_nodes, " attribute for input, ");
			code4 = claim_element(li19_nodes, "CODE", {});
			var code4_nodes = children(code4);
			t45 = claim_text(code4_nodes, "result");
			code4_nodes.forEach(detach);
			t46 = claim_text(li19_nodes, " attribute for output");
			li19_nodes.forEach(detach);
			t47 = claim_space(ul5_nodes);
			li20 = claim_element(ul5_nodes, "LI", {});
			var li20_nodes = children(li20);
			t48 = claim_text(li20_nodes, "input takes in result, ");
			code5 = claim_element(li20_nodes, "CODE", {});
			var code5_nodes = children(code5);
			t49 = claim_text(code5_nodes, "SourceGraphic");
			code5_nodes.forEach(detach);
			t50 = claim_text(li20_nodes, " and ");
			code6 = claim_element(li20_nodes, "CODE", {});
			var code6_nodes = children(code6);
			t51 = claim_text(code6_nodes, "SourceAlpha");
			code6_nodes.forEach(detach);
			li20_nodes.forEach(detach);
			ul5_nodes.forEach(detach);
			t52 = claim_space(section2_nodes);
			pre0 = claim_element(section2_nodes, "PRE", { class: true });
			var pre0_nodes = children(pre0);
			pre0_nodes.forEach(detach);
			section2_nodes.forEach(detach);
			t53 = claim_space(nodes);
			section3 = claim_element(nodes, "SECTION", {});
			var section3_nodes = children(section3);
			h31 = claim_element(section3_nodes, "H3", {});
			var h31_nodes = children(h31);
			a17 = claim_element(h31_nodes, "A", { href: true, id: true });
			var a17_nodes = children(a17);
			t54 = claim_text(a17_nodes, "Filter region");
			a17_nodes.forEach(detach);
			h31_nodes.forEach(detach);
			t55 = claim_space(section3_nodes);
			ul6 = claim_element(section3_nodes, "UL", {});
			var ul6_nodes = children(ul6);
			li21 = claim_element(ul6_nodes, "LI", {});
			var li21_nodes = children(li21);
			t56 = claim_text(li21_nodes, "filter region is based on the bounding box of the element");
			li21_nodes.forEach(detach);
			t57 = claim_space(ul6_nodes);
			li22 = claim_element(ul6_nodes, "LI", {});
			var li22_nodes = children(li22);
			t58 = claim_text(li22_nodes, "filter result beyond filter region will be clipped off");
			li22_nodes.forEach(detach);
			t59 = claim_space(ul6_nodes);
			li23 = claim_element(ul6_nodes, "LI", {});
			var li23_nodes = children(li23);
			t60 = claim_text(li23_nodes, "default filter region extends 10% the width and height of bounding box in all 4 directions");
			li23_nodes.forEach(detach);
			ul6_nodes.forEach(detach);
			t61 = claim_space(section3_nodes);
			pre1 = claim_element(section3_nodes, "PRE", { class: true });
			var pre1_nodes = children(pre1);
			pre1_nodes.forEach(detach);
			t62 = claim_space(section3_nodes);
			ul7 = claim_element(section3_nodes, "UL", {});
			var ul7_nodes = children(ul7);
			li24 = claim_element(ul7_nodes, "LI", {});
			var li24_nodes = children(li24);
			t63 = claim_text(li24_nodes, "use ");
			code7 = claim_element(li24_nodes, "CODE", {});
			var code7_nodes = children(code7);
			t64 = claim_text(code7_nodes, "<feFlood>");
			code7_nodes.forEach(detach);
			t65 = claim_text(li24_nodes, " to figure out the filter region");
			li24_nodes.forEach(detach);
			ul7_nodes.forEach(detach);
			t66 = claim_space(section3_nodes);
			pre2 = claim_element(section3_nodes, "PRE", { class: true });
			var pre2_nodes = children(pre2);
			pre2_nodes.forEach(detach);
			section3_nodes.forEach(detach);
			t67 = claim_space(nodes);
			section4 = claim_element(nodes, "SECTION", {});
			var section4_nodes = children(section4);
			h32 = claim_element(section4_nodes, "H3", {});
			var h32_nodes = children(h32);
			a18 = claim_element(h32_nodes, "A", { href: true, id: true });
			var a18_nodes = children(a18);
			t68 = claim_text(a18_nodes, "Create a drop shadow");
			a18_nodes.forEach(detach);
			h32_nodes.forEach(detach);
			t69 = claim_space(section4_nodes);
			ol0 = claim_element(section4_nodes, "OL", {});
			var ol0_nodes = children(ol0);
			li25 = claim_element(ol0_nodes, "LI", {});
			var li25_nodes = children(li25);
			t70 = claim_text(li25_nodes, "Blur the silhouette of the layer");
			li25_nodes.forEach(detach);
			ol0_nodes.forEach(detach);
			t71 = claim_space(section4_nodes);
			pre3 = claim_element(section4_nodes, "PRE", { class: true });
			var pre3_nodes = children(pre3);
			pre3_nodes.forEach(detach);
			t72 = claim_space(section4_nodes);
			p1 = claim_element(section4_nodes, "P", {});
			var p1_nodes = children(p1);
			picture0 = claim_element(p1_nodes, "PICTURE", {});
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
			p1_nodes.forEach(detach);
			t73 = claim_space(section4_nodes);
			ol1 = claim_element(section4_nodes, "OL", { start: true });
			var ol1_nodes = children(ol1);
			li26 = claim_element(ol1_nodes, "LI", {});
			var li26_nodes = children(li26);
			t74 = claim_text(li26_nodes, "Composite the blur layer with a solid color layer to create a colored blur");
			li26_nodes.forEach(detach);
			ol1_nodes.forEach(detach);
			t75 = claim_space(section4_nodes);
			ul8 = claim_element(section4_nodes, "UL", {});
			var ul8_nodes = children(ul8);
			li27 = claim_element(ul8_nodes, "LI", {});
			var li27_nodes = children(li27);
			t76 = claim_text(li27_nodes, "Learn compositing + blending in ");
			a19 = claim_element(li27_nodes, "A", { href: true, rel: true });
			var a19_nodes = children(a19);
			t77 = claim_text(a19_nodes, "https://www.sarasoueidan.com/blog/compositing-and-blending-in-css/");
			a19_nodes.forEach(detach);
			li27_nodes.forEach(detach);
			ul8_nodes.forEach(detach);
			t78 = claim_space(section4_nodes);
			pre4 = claim_element(section4_nodes, "PRE", { class: true });
			var pre4_nodes = children(pre4);
			pre4_nodes.forEach(detach);
			t79 = claim_space(section4_nodes);
			p2 = claim_element(section4_nodes, "P", {});
			var p2_nodes = children(p2);
			picture1 = claim_element(p2_nodes, "PICTURE", {});
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
			p2_nodes.forEach(detach);
			t80 = claim_space(section4_nodes);
			ol2 = claim_element(section4_nodes, "OL", { start: true });
			var ol2_nodes = children(ol2);
			li28 = claim_element(ol2_nodes, "LI", {});
			var li28_nodes = children(li28);
			t81 = claim_text(li28_nodes, "Shift the shadow bottom-right with ");
			code8 = claim_element(li28_nodes, "CODE", {});
			var code8_nodes = children(code8);
			t82 = claim_text(code8_nodes, "<feOffset>");
			code8_nodes.forEach(detach);
			li28_nodes.forEach(detach);
			ol2_nodes.forEach(detach);
			t83 = claim_space(section4_nodes);
			pre5 = claim_element(section4_nodes, "PRE", { class: true });
			var pre5_nodes = children(pre5);
			pre5_nodes.forEach(detach);
			t84 = claim_space(section4_nodes);
			p3 = claim_element(section4_nodes, "P", {});
			var p3_nodes = children(p3);
			picture2 = claim_element(p3_nodes, "PICTURE", {});
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
			p3_nodes.forEach(detach);
			t85 = claim_space(section4_nodes);
			ol3 = claim_element(section4_nodes, "OL", { start: true });
			var ol3_nodes = children(ol3);
			li29 = claim_element(ol3_nodes, "LI", {});
			var li29_nodes = children(li29);
			t86 = claim_text(li29_nodes, "Combine the shadow with the original image");
			li29_nodes.forEach(detach);
			ol3_nodes.forEach(detach);
			t87 = claim_space(section4_nodes);
			ul9 = claim_element(section4_nodes, "UL", {});
			var ul9_nodes = children(ul9);
			li30 = claim_element(ul9_nodes, "LI", {});
			var li30_nodes = children(li30);
			t88 = claim_text(li30_nodes, "layer merge in order of declaration, latter layer stacks on top of previous layer");
			li30_nodes.forEach(detach);
			ul9_nodes.forEach(detach);
			t89 = claim_space(section4_nodes);
			pre6 = claim_element(section4_nodes, "PRE", { class: true });
			var pre6_nodes = children(pre6);
			pre6_nodes.forEach(detach);
			t90 = claim_space(section4_nodes);
			p4 = claim_element(section4_nodes, "P", {});
			var p4_nodes = children(p4);
			picture3 = claim_element(p4_nodes, "PICTURE", {});
			var picture3_nodes = children(picture3);
			source6 = claim_element(picture3_nodes, "SOURCE", { type: true, srcset: true });
			source7 = claim_element(picture3_nodes, "SOURCE", { type: true, srcset: true });

			img3 = claim_element(picture3_nodes, "IMG", {
				title: true,
				alt: true,
				"data-src": true,
				loading: true
			});

			picture3_nodes.forEach(detach);
			p4_nodes.forEach(detach);
			section4_nodes.forEach(detach);
			t91 = claim_space(nodes);
			section5 = claim_element(nodes, "SECTION", {});
			var section5_nodes = children(section5);
			h21 = claim_element(section5_nodes, "H2", {});
			var h21_nodes = children(h21);
			a20 = claim_element(h21_nodes, "A", { href: true, id: true });
			var a20_nodes = children(a20);
			t92 = claim_text(a20_nodes, "Finessing ");
			code9 = claim_element(a20_nodes, "CODE", {});
			var code9_nodes = children(code9);
			t93 = claim_text(code9_nodes, "feColorMatrix");
			code9_nodes.forEach(detach);
			a20_nodes.forEach(detach);
			h21_nodes.forEach(detach);
			t94 = claim_space(section5_nodes);
			p5 = claim_element(section5_nodes, "P", {});
			var p5_nodes = children(p5);
			t95 = claim_text(p5_nodes, "[ ");
			a21 = claim_element(p5_nodes, "A", { href: true, rel: true });
			var a21_nodes = children(a21);
			t96 = claim_text(a21_nodes, "Source");
			a21_nodes.forEach(detach);
			t97 = claim_text(p5_nodes, " ]");
			p5_nodes.forEach(detach);
			t98 = claim_space(section5_nodes);
			pre7 = claim_element(section5_nodes, "PRE", { class: true });
			var pre7_nodes = children(pre7);
			pre7_nodes.forEach(detach);
			t99 = claim_space(section5_nodes);
			pre8 = claim_element(section5_nodes, "PRE", { class: true });
			var pre8_nodes = children(pre8);
			pre8_nodes.forEach(detach);
			t100 = claim_space(section5_nodes);
			ul10 = claim_element(section5_nodes, "UL", {});
			var ul10_nodes = children(ul10);
			li31 = claim_element(ul10_nodes, "LI", {});
			var li31_nodes = children(li31);
			a22 = claim_element(li31_nodes, "A", { href: true, rel: true });
			var a22_nodes = children(a22);
			t101 = claim_text(a22_nodes, "color matrix playground");
			a22_nodes.forEach(detach);
			li31_nodes.forEach(detach);
			ul10_nodes.forEach(detach);
			section5_nodes.forEach(detach);
			t102 = claim_space(nodes);
			section6 = claim_element(nodes, "SECTION", {});
			var section6_nodes = children(section6);
			h33 = claim_element(section6_nodes, "H3", {});
			var h33_nodes = children(h33);
			a23 = claim_element(h33_nodes, "A", { href: true, id: true });
			var a23_nodes = children(a23);
			t103 = claim_text(a23_nodes, "1. Colorizing");
			a23_nodes.forEach(detach);
			h33_nodes.forEach(detach);
			t104 = claim_space(section6_nodes);
			p6 = claim_element(section6_nodes, "P", {});
			var p6_nodes = children(p6);
			picture4 = claim_element(p6_nodes, "PICTURE", {});
			var picture4_nodes = children(picture4);
			source8 = claim_element(picture4_nodes, "SOURCE", { type: true, srcset: true });
			source9 = claim_element(picture4_nodes, "SOURCE", { type: true, srcset: true });

			img4 = claim_element(picture4_nodes, "IMG", {
				title: true,
				alt: true,
				"data-src": true,
				loading: true
			});

			picture4_nodes.forEach(detach);
			p6_nodes.forEach(detach);
			t105 = claim_space(section6_nodes);
			ul11 = claim_element(section6_nodes, "UL", {});
			var ul11_nodes = children(ul11);
			li32 = claim_element(ul11_nodes, "LI", {});
			var li32_nodes = children(li32);
			t106 = claim_text(li32_nodes, "Removing other color to colorise image into the remaining color");
			li32_nodes.forEach(detach);
			t107 = claim_space(ul11_nodes);
			li33 = claim_element(ul11_nodes, "LI", {});
			var li33_nodes = children(li33);
			t108 = claim_text(li33_nodes, "colorise red -> remove blue & green\n");
			picture5 = claim_element(li33_nodes, "PICTURE", {});
			var picture5_nodes = children(picture5);
			source10 = claim_element(picture5_nodes, "SOURCE", { type: true, srcset: true });
			source11 = claim_element(picture5_nodes, "SOURCE", { type: true, srcset: true });

			img5 = claim_element(picture5_nodes, "IMG", {
				title: true,
				alt: true,
				"data-src": true,
				loading: true
			});

			picture5_nodes.forEach(detach);
			li33_nodes.forEach(detach);
			t109 = claim_space(ul11_nodes);
			li34 = claim_element(ul11_nodes, "LI", {});
			var li34_nodes = children(li34);
			t110 = claim_text(li34_nodes, "colorise yellow -> remove blue (red + green = yellow)\n");
			picture6 = claim_element(li34_nodes, "PICTURE", {});
			var picture6_nodes = children(picture6);
			source12 = claim_element(picture6_nodes, "SOURCE", { type: true, srcset: true });
			source13 = claim_element(picture6_nodes, "SOURCE", { type: true, srcset: true });

			img6 = claim_element(picture6_nodes, "IMG", {
				title: true,
				alt: true,
				"data-src": true,
				loading: true
			});

			picture6_nodes.forEach(detach);
			li34_nodes.forEach(detach);
			ul11_nodes.forEach(detach);
			section6_nodes.forEach(detach);
			t111 = claim_space(nodes);
			section7 = claim_element(nodes, "SECTION", {});
			var section7_nodes = children(section7);
			h34 = claim_element(section7_nodes, "H3", {});
			var h34_nodes = children(h34);
			a24 = claim_element(h34_nodes, "A", { href: true, id: true });
			var a24_nodes = children(a24);
			t112 = claim_text(a24_nodes, "2. Alpha values");
			a24_nodes.forEach(detach);
			h34_nodes.forEach(detach);
			t113 = claim_space(section7_nodes);
			ul13 = claim_element(section7_nodes, "UL", {});
			var ul13_nodes = children(ul13);
			li38 = claim_element(ul13_nodes, "LI", {});
			var li38_nodes = children(li38);
			p7 = claim_element(li38_nodes, "P", {});
			var p7_nodes = children(p7);
			t114 = claim_text(p7_nodes, "add opacity level to the red channel");
			p7_nodes.forEach(detach);
			t115 = claim_space(li38_nodes);
			ul12 = claim_element(li38_nodes, "UL", {});
			var ul12_nodes = children(ul12);
			li35 = claim_element(ul12_nodes, "LI", {});
			var li35_nodes = children(li35);
			t116 = claim_text(li35_nodes, "any red remaining red");
			li35_nodes.forEach(detach);
			t117 = claim_space(ul12_nodes);
			li36 = claim_element(ul12_nodes, "LI", {});
			var li36_nodes = children(li36);
			t118 = claim_text(li36_nodes, "green -> yellow (red + green = yellow)");
			li36_nodes.forEach(detach);
			t119 = claim_space(ul12_nodes);
			li37 = claim_element(ul12_nodes, "LI", {});
			var li37_nodes = children(li37);
			t120 = claim_text(li37_nodes, "blue -> magenta (red + blue = magenta)\n");
			picture7 = claim_element(li37_nodes, "PICTURE", {});
			var picture7_nodes = children(picture7);
			source14 = claim_element(picture7_nodes, "SOURCE", { type: true, srcset: true });
			source15 = claim_element(picture7_nodes, "SOURCE", { type: true, srcset: true });

			img7 = claim_element(picture7_nodes, "IMG", {
				title: true,
				alt: true,
				"data-src": true,
				loading: true
			});

			picture7_nodes.forEach(detach);
			li37_nodes.forEach(detach);
			ul12_nodes.forEach(detach);
			li38_nodes.forEach(detach);
			t121 = claim_space(ul13_nodes);
			li39 = claim_element(ul13_nodes, "LI", {});
			var li39_nodes = children(li39);
			p8 = claim_element(li39_nodes, "P", {});
			var p8_nodes = children(p8);
			t122 = claim_text(p8_nodes, "hard yellow filter\n");
			picture8 = claim_element(p8_nodes, "PICTURE", {});
			var picture8_nodes = children(picture8);
			source16 = claim_element(picture8_nodes, "SOURCE", { type: true, srcset: true });
			source17 = claim_element(picture8_nodes, "SOURCE", { type: true, srcset: true });

			img8 = claim_element(picture8_nodes, "IMG", {
				title: true,
				alt: true,
				"data-src": true,
				loading: true
			});

			picture8_nodes.forEach(detach);
			p8_nodes.forEach(detach);
			li39_nodes.forEach(detach);
			t123 = claim_space(ul13_nodes);
			li40 = claim_element(ul13_nodes, "LI", {});
			var li40_nodes = children(li40);
			p9 = claim_element(li40_nodes, "P", {});
			var p9_nodes = children(p9);
			t124 = claim_text(p9_nodes, "have a value some where between 0-1 to see the mixture in the shadow\n");
			picture9 = claim_element(p9_nodes, "PICTURE", {});
			var picture9_nodes = children(picture9);
			source18 = claim_element(picture9_nodes, "SOURCE", { type: true, srcset: true });
			source19 = claim_element(picture9_nodes, "SOURCE", { type: true, srcset: true });

			img9 = claim_element(picture9_nodes, "IMG", {
				title: true,
				alt: true,
				"data-src": true,
				loading: true
			});

			picture9_nodes.forEach(detach);
			p9_nodes.forEach(detach);
			li40_nodes.forEach(detach);
			ul13_nodes.forEach(detach);
			t125 = claim_space(section7_nodes);
			ul15 = claim_element(section7_nodes, "UL", {});
			var ul15_nodes = children(ul15);
			li42 = claim_element(ul15_nodes, "LI", {});
			var li42_nodes = children(li42);
			t126 = claim_text(li42_nodes, "negative value could offset the channel by the amount of opacity\n");
			picture10 = claim_element(li42_nodes, "PICTURE", {});
			var picture10_nodes = children(picture10);
			source20 = claim_element(picture10_nodes, "SOURCE", { type: true, srcset: true });
			source21 = claim_element(picture10_nodes, "SOURCE", { type: true, srcset: true });

			img10 = claim_element(picture10_nodes, "IMG", {
				title: true,
				alt: true,
				"data-src": true,
				loading: true
			});

			picture10_nodes.forEach(detach);
			ul14 = claim_element(li42_nodes, "UL", {});
			var ul14_nodes = children(ul14);
			li41 = claim_element(ul14_nodes, "LI", {});
			var li41_nodes = children(li41);
			t127 = claim_text(li41_nodes, "the following 2 color matrix is identical");
			li41_nodes.forEach(detach);
			ul14_nodes.forEach(detach);
			li42_nodes.forEach(detach);
			ul15_nodes.forEach(detach);
			t128 = claim_space(section7_nodes);
			pre9 = claim_element(section7_nodes, "PRE", { class: true });
			var pre9_nodes = children(pre9);
			pre9_nodes.forEach(detach);
			section7_nodes.forEach(detach);
			t129 = claim_space(nodes);
			section8 = claim_element(nodes, "SECTION", {});
			var section8_nodes = children(section8);
			h35 = claim_element(section8_nodes, "H3", {});
			var h35_nodes = children(h35);
			a25 = claim_element(h35_nodes, "A", { href: true, id: true });
			var a25_nodes = children(a25);
			t130 = claim_text(a25_nodes, "3. Blowing out channels");
			a25_nodes.forEach(detach);
			h35_nodes.forEach(detach);
			t131 = claim_space(section8_nodes);
			ul16 = claim_element(section8_nodes, "UL", {});
			var ul16_nodes = children(ul16);
			li43 = claim_element(ul16_nodes, "LI", {});
			var li43_nodes = children(li43);
			t132 = claim_text(li43_nodes, "turn 1 color to white");
			li43_nodes.forEach(detach);
			t133 = claim_space(ul16_nodes);
			li44 = claim_element(ul16_nodes, "LI", {});
			var li44_nodes = children(li44);
			t134 = claim_text(li44_nodes, "set the alpha channel to ");
			code10 = claim_element(li44_nodes, "CODE", {});
			var code10_nodes = children(code10);
			t135 = claim_text(code10_nodes, "-2");
			code10_nodes.forEach(detach);
			t136 = claim_space(li44_nodes);
			picture11 = claim_element(li44_nodes, "PICTURE", {});
			var picture11_nodes = children(picture11);
			source22 = claim_element(picture11_nodes, "SOURCE", { type: true, srcset: true });
			source23 = claim_element(picture11_nodes, "SOURCE", { type: true, srcset: true });

			img11 = claim_element(picture11_nodes, "IMG", {
				title: true,
				alt: true,
				"data-src": true,
				loading: true
			});

			picture11_nodes.forEach(detach);
			li44_nodes.forEach(detach);
			ul16_nodes.forEach(detach);
			section8_nodes.forEach(detach);
			t137 = claim_space(nodes);
			section9 = claim_element(nodes, "SECTION", {});
			var section9_nodes = children(section9);
			h36 = claim_element(section9_nodes, "H3", {});
			var h36_nodes = children(h36);
			a26 = claim_element(h36_nodes, "A", { href: true, id: true });
			var a26_nodes = children(a26);
			t138 = claim_text(a26_nodes, "4. Change color");
			a26_nodes.forEach(detach);
			h36_nodes.forEach(detach);
			t139 = claim_space(section9_nodes);
			ul17 = claim_element(section9_nodes, "UL", {});
			var ul17_nodes = children(ul17);
			li45 = claim_element(ul17_nodes, "LI", {});
			var li45_nodes = children(li45);
			t140 = claim_text(li45_nodes, "No more green, any green looks like magenta now. (luminosity of green is lost)\n");
			picture12 = claim_element(li45_nodes, "PICTURE", {});
			var picture12_nodes = children(picture12);
			source24 = claim_element(picture12_nodes, "SOURCE", { type: true, srcset: true });
			source25 = claim_element(picture12_nodes, "SOURCE", { type: true, srcset: true });

			img12 = claim_element(picture12_nodes, "IMG", {
				title: true,
				alt: true,
				"data-src": true,
				loading: true
			});

			picture12_nodes.forEach(detach);
			li45_nodes.forEach(detach);
			ul17_nodes.forEach(detach);
			section9_nodes.forEach(detach);
			t141 = claim_space(nodes);
			section10 = claim_element(nodes, "SECTION", {});
			var section10_nodes = children(section10);
			h37 = claim_element(section10_nodes, "H3", {});
			var h37_nodes = children(h37);
			a27 = claim_element(h37_nodes, "A", { href: true, id: true });
			var a27_nodes = children(a27);
			t142 = claim_text(a27_nodes, "5. Lighten or darken");
			a27_nodes.forEach(detach);
			h37_nodes.forEach(detach);
			t143 = claim_space(section10_nodes);
			ul18 = claim_element(section10_nodes, "UL", {});
			var ul18_nodes = children(ul18);
			li46 = claim_element(ul18_nodes, "LI", {});
			var li46_nodes = children(li46);
			t144 = claim_text(li46_nodes, "increase intensity to lighten, decrease to darken\n");
			picture13 = claim_element(li46_nodes, "PICTURE", {});
			var picture13_nodes = children(picture13);
			source26 = claim_element(picture13_nodes, "SOURCE", { type: true, srcset: true });
			source27 = claim_element(picture13_nodes, "SOURCE", { type: true, srcset: true });

			img13 = claim_element(picture13_nodes, "IMG", {
				title: true,
				alt: true,
				"data-src": true,
				loading: true
			});

			picture13_nodes.forEach(detach);
			t145 = claim_space(li46_nodes);
			picture14 = claim_element(li46_nodes, "PICTURE", {});
			var picture14_nodes = children(picture14);
			source28 = claim_element(picture14_nodes, "SOURCE", { type: true, srcset: true });
			source29 = claim_element(picture14_nodes, "SOURCE", { type: true, srcset: true });

			img14 = claim_element(picture14_nodes, "IMG", {
				title: true,
				alt: true,
				"data-src": true,
				loading: true
			});

			picture14_nodes.forEach(detach);
			li46_nodes.forEach(detach);
			ul18_nodes.forEach(detach);
			section10_nodes.forEach(detach);
			t146 = claim_space(nodes);
			section11 = claim_element(nodes, "SECTION", {});
			var section11_nodes = children(section11);
			h38 = claim_element(section11_nodes, "H3", {});
			var h38_nodes = children(h38);
			a28 = claim_element(h38_nodes, "A", { href: true, id: true });
			var a28_nodes = children(a28);
			t147 = claim_text(a28_nodes, "6. Grayscale");
			a28_nodes.forEach(detach);
			h38_nodes.forEach(detach);
			t148 = claim_space(section11_nodes);
			ul19 = claim_element(section11_nodes, "UL", {});
			var ul19_nodes = children(ul19);
			li47 = claim_element(ul19_nodes, "LI", {});
			var li47_nodes = children(li47);
			t149 = claim_text(li47_nodes, "make sure red, green, blue have the same value\n");
			picture15 = claim_element(li47_nodes, "PICTURE", {});
			var picture15_nodes = children(picture15);
			source30 = claim_element(picture15_nodes, "SOURCE", { type: true, srcset: true });
			source31 = claim_element(picture15_nodes, "SOURCE", { type: true, srcset: true });

			img15 = claim_element(picture15_nodes, "IMG", {
				title: true,
				alt: true,
				"data-src": true,
				loading: true
			});

			picture15_nodes.forEach(detach);
			li47_nodes.forEach(detach);
			ul19_nodes.forEach(detach);
			section11_nodes.forEach(detach);
			t150 = claim_space(nodes);
			section12 = claim_element(nodes, "SECTION", {});
			var section12_nodes = children(section12);
			h22 = claim_element(section12_nodes, "H2", {});
			var h22_nodes = children(h22);
			a29 = claim_element(h22_nodes, "A", { href: true, id: true });
			var a29_nodes = children(a29);
			t151 = claim_text(a29_nodes, "Outline Text with ");
			code11 = claim_element(a29_nodes, "CODE", {});
			var code11_nodes = children(code11);
			t152 = claim_text(code11_nodes, "<feMorphology>");
			code11_nodes.forEach(detach);
			a29_nodes.forEach(detach);
			h22_nodes.forEach(detach);
			t153 = claim_space(section12_nodes);
			p10 = claim_element(section12_nodes, "P", {});
			var p10_nodes = children(p10);
			t154 = claim_text(p10_nodes, "[ ");
			a30 = claim_element(p10_nodes, "A", { href: true, rel: true });
			var a30_nodes = children(a30);
			t155 = claim_text(a30_nodes, "Source");
			a30_nodes.forEach(detach);
			t156 = claim_text(p10_nodes, " ]");
			p10_nodes.forEach(detach);
			t157 = claim_space(section12_nodes);
			ul20 = claim_element(section12_nodes, "UL", {});
			var ul20_nodes = children(ul20);
			li48 = claim_element(ul20_nodes, "LI", {});
			var li48_nodes = children(li48);
			t158 = claim_text(li48_nodes, "🖼 image size gets smaller when ");
			code12 = claim_element(li48_nodes, "CODE", {});
			var code12_nodes = children(code12);
			t159 = claim_text(code12_nodes, "erode");
			code12_nodes.forEach(detach);
			t160 = claim_text(li48_nodes, ", larger when ");
			code13 = claim_element(li48_nodes, "CODE", {});
			var code13_nodes = children(code13);
			t161 = claim_text(code13_nodes, "dilate");
			code13_nodes.forEach(detach);
			li48_nodes.forEach(detach);
			t162 = claim_space(ul20_nodes);
			li49 = claim_element(ul20_nodes, "LI", {});
			var li49_nodes = children(li49);
			t163 = claim_text(li49_nodes, "🖼 image looks like painted with large brush 🖌");
			li49_nodes.forEach(detach);
			t164 = claim_space(ul20_nodes);
			li50 = claim_element(ul20_nodes, "LI", {});
			var li50_nodes = children(li50);
			t165 = claim_text(li50_nodes, "📝 ");
			code14 = claim_element(li50_nodes, "CODE", {});
			var code14_nodes = children(code14);
			t166 = claim_text(code14_nodes, "erode");
			code14_nodes.forEach(detach);
			t167 = claim_text(li50_nodes, " sets each pixel to the darkest / most transparent neighbor");
			li50_nodes.forEach(detach);
			t168 = claim_space(ul20_nodes);
			li51 = claim_element(ul20_nodes, "LI", {});
			var li51_nodes = children(li51);
			t169 = claim_text(li51_nodes, "📝 ");
			code15 = claim_element(li51_nodes, "CODE", {});
			var code15_nodes = children(code15);
			t170 = claim_text(code15_nodes, "dilate");
			code15_nodes.forEach(detach);
			t171 = claim_text(li51_nodes, " sets each pixel to the brightest / least transparent neighbor");
			li51_nodes.forEach(detach);
			ul20_nodes.forEach(detach);
			t172 = claim_space(section12_nodes);
			pre10 = claim_element(section12_nodes, "PRE", { class: true });
			var pre10_nodes = children(pre10);
			pre10_nodes.forEach(detach);
			t173 = claim_space(section12_nodes);
			p11 = claim_element(section12_nodes, "P", {});
			var p11_nodes = children(p11);

			img16 = claim_element(p11_nodes, "IMG", {
				title: true,
				alt: true,
				"data-src": true,
				loading: true
			});

			p11_nodes.forEach(detach);
			t174 = claim_space(section12_nodes);
			claim_component(morphology.$$.fragment, section12_nodes);
			t175 = claim_space(section12_nodes);
			p12 = claim_element(section12_nodes, "P", {});
			var p12_nodes = children(p12);
			a31 = claim_element(p12_nodes, "A", { href: true, rel: true });
			var a31_nodes = children(a31);
			t176 = claim_text(a31_nodes, "REPL");
			a31_nodes.forEach(detach);
			t177 = claim_text(p12_nodes, " to see effect with different radius.");
			p12_nodes.forEach(detach);
			section12_nodes.forEach(detach);
			t178 = claim_space(nodes);
			section13 = claim_element(nodes, "SECTION", {});
			var section13_nodes = children(section13);
			h39 = claim_element(section13_nodes, "H3", {});
			var h39_nodes = children(h39);
			a32 = claim_element(h39_nodes, "A", { href: true, id: true });
			var a32_nodes = children(a32);
			t179 = claim_text(a32_nodes, "Adding Colored Outline to Text with ");
			code16 = claim_element(a32_nodes, "CODE", {});
			var code16_nodes = children(code16);
			t180 = claim_text(code16_nodes, "<feMorphology />");
			code16_nodes.forEach(detach);
			a32_nodes.forEach(detach);
			h39_nodes.forEach(detach);
			t181 = claim_space(section13_nodes);
			p13 = claim_element(section13_nodes, "P", {});
			var p13_nodes = children(p13);
			t182 = claim_text(p13_nodes, "1️⃣ expand the text with ");
			code17 = claim_element(p13_nodes, "CODE", {});
			var code17_nodes = children(code17);
			t183 = claim_text(code17_nodes, "<feMorphology operator=\"dilate\" />");
			code17_nodes.forEach(detach);
			t184 = claim_text(p13_nodes, "\n2️⃣ colorize via ");
			code18 = claim_element(p13_nodes, "CODE", {});
			var code18_nodes = children(code18);
			t185 = claim_text(code18_nodes, "<feFlood>");
			code18_nodes.forEach(detach);
			t186 = claim_text(p13_nodes, " with solid color and ");
			code19 = claim_element(p13_nodes, "CODE", {});
			var code19_nodes = children(code19);
			t187 = claim_text(code19_nodes, "<feComposite />");
			code19_nodes.forEach(detach);
			t188 = claim_text(p13_nodes, "\n3️⃣ merge the expanded colored text with the original text");
			p13_nodes.forEach(detach);
			t189 = claim_space(section13_nodes);
			pre11 = claim_element(section13_nodes, "PRE", { class: true });
			var pre11_nodes = children(pre11);
			pre11_nodes.forEach(detach);
			t190 = claim_space(section13_nodes);
			p14 = claim_element(section13_nodes, "P", {});
			var p14_nodes = children(p14);

			img17 = claim_element(p14_nodes, "IMG", {
				title: true,
				alt: true,
				"data-src": true,
				loading: true
			});

			p14_nodes.forEach(detach);
			t191 = claim_space(section13_nodes);
			p15 = claim_element(section13_nodes, "P", {});
			var p15_nodes = children(p15);
			a33 = claim_element(p15_nodes, "A", { href: true, rel: true });
			var a33_nodes = children(a33);
			t192 = claim_text(a33_nodes, "REPL");
			a33_nodes.forEach(detach);
			t193 = claim_text(p15_nodes, " to visualise ");
			code20 = claim_element(p15_nodes, "CODE", {});
			var code20_nodes = children(code20);
			t194 = claim_text(code20_nodes, "<feMorphology>");
			code20_nodes.forEach(detach);
			p15_nodes.forEach(detach);
			section13_nodes.forEach(detach);
			t195 = claim_space(nodes);
			section14 = claim_element(nodes, "SECTION", {});
			var section14_nodes = children(section14);
			h310 = claim_element(section14_nodes, "H3", {});
			var h310_nodes = children(h310);
			a34 = claim_element(h310_nodes, "A", { href: true, id: true });
			var a34_nodes = children(a34);
			t196 = claim_text(a34_nodes, "Knockout text with ");
			code21 = claim_element(a34_nodes, "CODE", {});
			var code21_nodes = children(code21);
			t197 = claim_text(code21_nodes, "<feMorphology />");
			code21_nodes.forEach(detach);
			a34_nodes.forEach(detach);
			h310_nodes.forEach(detach);
			t198 = claim_space(section14_nodes);
			p16 = claim_element(section14_nodes, "P", {});
			var p16_nodes = children(p16);
			t199 = claim_text(p16_nodes, "1️⃣ expand the text with ");
			code22 = claim_element(p16_nodes, "CODE", {});
			var code22_nodes = children(code22);
			t200 = claim_text(code22_nodes, "<feMorphology operator=\"dilate\" />");
			code22_nodes.forEach(detach);
			t201 = claim_text(p16_nodes, "\n2️⃣ composite with the source with ");
			code23 = claim_element(p16_nodes, "CODE", {});
			var code23_nodes = children(code23);
			t202 = claim_text(code23_nodes, "<feComposite />");
			code23_nodes.forEach(detach);
			t203 = claim_text(p16_nodes, " using ");
			code24 = claim_element(p16_nodes, "CODE", {});
			var code24_nodes = children(code24);
			t204 = claim_text(code24_nodes, "out");
			code24_nodes.forEach(detach);
			t205 = claim_text(p16_nodes, " operator");
			p16_nodes.forEach(detach);
			t206 = claim_space(section14_nodes);
			pre12 = claim_element(section14_nodes, "PRE", { class: true });
			var pre12_nodes = children(pre12);
			pre12_nodes.forEach(detach);
			t207 = claim_space(section14_nodes);
			p17 = claim_element(section14_nodes, "P", {});
			var p17_nodes = children(p17);

			img18 = claim_element(p17_nodes, "IMG", {
				title: true,
				alt: true,
				"data-src": true,
				loading: true
			});

			p17_nodes.forEach(detach);
			t208 = claim_space(section14_nodes);
			claim_component(knockouttext.$$.fragment, section14_nodes);
			t209 = claim_space(section14_nodes);
			p18 = claim_element(section14_nodes, "P", {});
			var p18_nodes = children(p18);
			a35 = claim_element(p18_nodes, "A", { href: true, rel: true });
			var a35_nodes = children(a35);
			t210 = claim_text(a35_nodes, "REPL");
			a35_nodes.forEach(detach);
			t211 = claim_text(p18_nodes, " to visualise the build up the knock-out text.");
			p18_nodes.forEach(detach);
			section14_nodes.forEach(detach);
			this.h();
		},
		h() {
			attr(a0, "href", "#svg-filters");
			attr(a1, "href", "#filter-primitives");
			attr(a2, "href", "#filter-region");
			attr(a3, "href", "#create-a-drop-shadow");
			attr(a4, "href", "#finessing-fecolormatrix");
			attr(a5, "href", "#colorizing");
			attr(a6, "href", "#alpha-values");
			attr(a7, "href", "#blowing-out-channels");
			attr(a8, "href", "#change-color");
			attr(a9, "href", "#lighten-or-darken");
			attr(a10, "href", "#grayscale");
			attr(a11, "href", "#outline-text-with-lt-femorphology-gt");
			attr(a12, "href", "#adding-colored-outline-to-text-with-lt-femorphology-gt");
			attr(a13, "href", "#knockout-text-with-lt-femorphology-gt");
			attr(ul3, "class", "sitemap");
			attr(ul3, "id", "sitemap");
			attr(ul3, "role", "navigation");
			attr(ul3, "aria-label", "Table of Contents");
			attr(a14, "href", "#svg-filters");
			attr(a14, "id", "svg-filters");
			attr(a15, "href", "https://tympanus.net/codrops/2019/01/15/svg-filters-101/");
			attr(a15, "rel", "nofollow");
			attr(a16, "href", "#filter-primitives");
			attr(a16, "id", "filter-primitives");
			attr(pre0, "class", "language-html");
			attr(a17, "href", "#filter-region");
			attr(a17, "id", "filter-region");
			attr(pre1, "class", "language-html");
			attr(pre2, "class", "language-html");
			attr(a18, "href", "#create-a-drop-shadow");
			attr(a18, "id", "create-a-drop-shadow");
			attr(pre3, "class", "language-xml");
			attr(source0, "type", "image/webp");
			attr(source0, "srcset", __build_img_webp__0);
			attr(source1, "type", "image/jpeg");
			attr(source1, "srcset", __build_img__0);
			attr(img0, "title", "null");
			attr(img0, "alt", "step-1");
			attr(img0, "data-src", __build_img__0);
			attr(img0, "loading", "lazy");
			attr(ol1, "start", "2");
			attr(a19, "href", "https://www.sarasoueidan.com/blog/compositing-and-blending-in-css/");
			attr(a19, "rel", "nofollow");
			attr(pre4, "class", "language-xml");
			attr(source2, "type", "image/webp");
			attr(source2, "srcset", __build_img_webp__1);
			attr(source3, "type", "image/jpeg");
			attr(source3, "srcset", __build_img__1);
			attr(img1, "title", "null");
			attr(img1, "alt", "step-2");
			attr(img1, "data-src", __build_img__1);
			attr(img1, "loading", "lazy");
			attr(ol2, "start", "3");
			attr(pre5, "class", "language-xml");
			attr(source4, "type", "image/webp");
			attr(source4, "srcset", __build_img_webp__2);
			attr(source5, "type", "image/jpeg");
			attr(source5, "srcset", __build_img__2);
			attr(img2, "title", "null");
			attr(img2, "alt", "step-3");
			attr(img2, "data-src", __build_img__2);
			attr(img2, "loading", "lazy");
			attr(ol3, "start", "4");
			attr(pre6, "class", "language-xml");
			attr(source6, "type", "image/webp");
			attr(source6, "srcset", __build_img_webp__3);
			attr(source7, "type", "image/jpeg");
			attr(source7, "srcset", __build_img__3);
			attr(img3, "title", "null");
			attr(img3, "alt", "step-4");
			attr(img3, "data-src", __build_img__3);
			attr(img3, "loading", "lazy");
			attr(a20, "href", "#finessing-fecolormatrix");
			attr(a20, "id", "finessing-fecolormatrix");
			attr(a21, "href", "https://alistapart.com/article/finessing-fecolormatrix/");
			attr(a21, "rel", "nofollow");
			attr(pre7, "class", "language-xml");
			attr(pre8, "class", "language-js");
			attr(a22, "href", "https://svelte.dev/repl/1fa3e758ef2442d1bcc1eba37a2bdd58");
			attr(a22, "rel", "nofollow");
			attr(a23, "href", "#colorizing");
			attr(a23, "id", "colorizing");
			attr(source8, "type", "image/webp");
			attr(source8, "srcset", __build_img_webp__4);
			attr(source9, "type", "image/jpeg");
			attr(source9, "srcset", __build_img__4);
			attr(img4, "title", "null");
			attr(img4, "alt", "colorise default");
			attr(img4, "data-src", __build_img__4);
			attr(img4, "loading", "lazy");
			attr(source10, "type", "image/webp");
			attr(source10, "srcset", __build_img_webp__5);
			attr(source11, "type", "image/jpeg");
			attr(source11, "srcset", __build_img__5);
			attr(img5, "title", "null");
			attr(img5, "alt", "colorise red");
			attr(img5, "data-src", __build_img__5);
			attr(img5, "loading", "lazy");
			attr(source12, "type", "image/webp");
			attr(source12, "srcset", __build_img_webp__6);
			attr(source13, "type", "image/jpeg");
			attr(source13, "srcset", __build_img__6);
			attr(img6, "title", "null");
			attr(img6, "alt", "colorise yellow");
			attr(img6, "data-src", __build_img__6);
			attr(img6, "loading", "lazy");
			attr(a24, "href", "#alpha-values");
			attr(a24, "id", "alpha-values");
			attr(source14, "type", "image/webp");
			attr(source14, "srcset", __build_img_webp__7);
			attr(source15, "type", "image/jpeg");
			attr(source15, "srcset", __build_img__7);
			attr(img7, "title", "null");
			attr(img7, "alt", "red filter");
			attr(img7, "data-src", __build_img__7);
			attr(img7, "loading", "lazy");
			attr(source16, "type", "image/webp");
			attr(source16, "srcset", __build_img_webp__8);
			attr(source17, "type", "image/jpeg");
			attr(source17, "srcset", __build_img__8);
			attr(img8, "title", "null");
			attr(img8, "alt", "yellow filter");
			attr(img8, "data-src", __build_img__8);
			attr(img8, "loading", "lazy");
			attr(source18, "type", "image/webp");
			attr(source18, "srcset", __build_img_webp__9);
			attr(source19, "type", "image/jpeg");
			attr(source19, "srcset", __build_img__9);
			attr(img9, "title", "null");
			attr(img9, "alt", "yellow filter 2");
			attr(img9, "data-src", __build_img__9);
			attr(img9, "loading", "lazy");
			attr(source20, "type", "image/webp");
			attr(source20, "srcset", __build_img_webp__10);
			attr(source21, "type", "image/jpeg");
			attr(source21, "srcset", __build_img__10);
			attr(img10, "title", "null");
			attr(img10, "alt", "negative alpha");
			attr(img10, "data-src", __build_img__10);
			attr(img10, "loading", "lazy");
			attr(pre9, "class", "language-xml");
			attr(a25, "href", "#blowing-out-channels");
			attr(a25, "id", "blowing-out-channels");
			attr(source22, "type", "image/webp");
			attr(source22, "srcset", __build_img_webp__11);
			attr(source23, "type", "image/jpeg");
			attr(source23, "srcset", __build_img__11);
			attr(img11, "title", "null");
			attr(img11, "alt", "blow-out-green");
			attr(img11, "data-src", __build_img__11);
			attr(img11, "loading", "lazy");
			attr(a26, "href", "#change-color");
			attr(a26, "id", "change-color");
			attr(source24, "type", "image/webp");
			attr(source24, "srcset", __build_img_webp__12);
			attr(source25, "type", "image/jpeg");
			attr(source25, "srcset", __build_img__12);
			attr(img12, "title", "null");
			attr(img12, "alt", "change-color");
			attr(img12, "data-src", __build_img__12);
			attr(img12, "loading", "lazy");
			attr(a27, "href", "#lighten-or-darken");
			attr(a27, "id", "lighten-or-darken");
			attr(source26, "type", "image/webp");
			attr(source26, "srcset", __build_img_webp__13);
			attr(source27, "type", "image/jpeg");
			attr(source27, "srcset", __build_img__13);
			attr(img13, "title", "null");
			attr(img13, "alt", "lighten");
			attr(img13, "data-src", __build_img__13);
			attr(img13, "loading", "lazy");
			attr(source28, "type", "image/webp");
			attr(source28, "srcset", __build_img_webp__14);
			attr(source29, "type", "image/jpeg");
			attr(source29, "srcset", __build_img__14);
			attr(img14, "title", "null");
			attr(img14, "alt", "darken");
			attr(img14, "data-src", __build_img__14);
			attr(img14, "loading", "lazy");
			attr(a28, "href", "#grayscale");
			attr(a28, "id", "grayscale");
			attr(source30, "type", "image/webp");
			attr(source30, "srcset", __build_img_webp__15);
			attr(source31, "type", "image/jpeg");
			attr(source31, "srcset", __build_img__15);
			attr(img15, "title", "null");
			attr(img15, "alt", "grayscale");
			attr(img15, "data-src", __build_img__15);
			attr(img15, "loading", "lazy");
			attr(a29, "href", "#outline-text-with-lt-femorphology-gt");
			attr(a29, "id", "outline-text-with-lt-femorphology-gt");
			attr(a30, "href", "https://tympanus.net/codrops/2019/01/22/svg-filter-effects-outline-text-with-femorphology/");
			attr(a30, "rel", "nofollow");
			attr(pre10, "class", "language-html");
			attr(img16, "title", "null");
			attr(img16, "alt", "feMorphology");
			attr(img16, "data-src", __build_img__16);
			attr(img16, "loading", "lazy");
			attr(a31, "href", "https://svelte.dev/repl/1f0a2c16650541d082beeecc2a046c9f?version=3.29.0");
			attr(a31, "rel", "nofollow");
			attr(a32, "href", "#adding-colored-outline-to-text-with-lt-femorphology-gt");
			attr(a32, "id", "adding-colored-outline-to-text-with-lt-femorphology-gt");
			attr(pre11, "class", "language-html");
			attr(img17, "title", "null");
			attr(img17, "alt", "feMorphology outline text");
			attr(img17, "data-src", __build_img__17);
			attr(img17, "loading", "lazy");
			attr(a33, "href", "https://svelte.dev/repl/a1a3aa1cc844476b9ca96fec3f0164ed?version=3.29.0");
			attr(a33, "rel", "nofollow");
			attr(a34, "href", "#knockout-text-with-lt-femorphology-gt");
			attr(a34, "id", "knockout-text-with-lt-femorphology-gt");
			attr(pre12, "class", "language-html");
			attr(img18, "title", "null");
			attr(img18, "alt", "feMorphology knockout text");
			attr(img18, "data-src", __build_img__18);
			attr(img18, "loading", "lazy");
			attr(a35, "href", "https://svelte.dev/repl/30153d68324d475189d34afa26a3186f?version=3.29.0");
			attr(a35, "rel", "nofollow");
		},
		m(target, anchor) {
			insert(target, section0, anchor);
			append(section0, ul3);
			append(ul3, li0);
			append(li0, a0);
			append(a0, t0);
			append(ul3, ul0);
			append(ul0, li1);
			append(li1, a1);
			append(a1, t1);
			append(ul0, li2);
			append(li2, a2);
			append(a2, t2);
			append(ul0, li3);
			append(li3, a3);
			append(a3, t3);
			append(ul3, li4);
			append(li4, a4);
			append(a4, t4);
			append(ul3, ul1);
			append(ul1, li5);
			append(li5, a5);
			append(a5, t5);
			append(ul1, li6);
			append(li6, a6);
			append(a6, t6);
			append(ul1, li7);
			append(li7, a7);
			append(a7, t7);
			append(ul1, li8);
			append(li8, a8);
			append(a8, t8);
			append(ul1, li9);
			append(li9, a9);
			append(a9, t9);
			append(ul1, li10);
			append(li10, a10);
			append(a10, t10);
			append(ul3, li11);
			append(li11, a11);
			append(a11, t11);
			append(ul3, ul2);
			append(ul2, li12);
			append(li12, a12);
			append(a12, t12);
			append(ul2, li13);
			append(li13, a13);
			append(a13, t13);
			insert(target, t14, anchor);
			insert(target, section1, anchor);
			append(section1, h20);
			append(h20, a14);
			append(a14, t15);
			append(section1, t16);
			append(section1, p0);
			append(p0, t17);
			append(p0, a15);
			append(a15, t18);
			append(p0, t19);
			append(section1, t20);
			append(section1, ul4);
			append(ul4, li14);
			append(li14, t21);
			append(li14, code0);
			append(code0, t22);
			append(li14, t23);
			append(ul4, t24);
			append(ul4, li15);
			append(li15, t25);
			append(ul4, t26);
			append(ul4, li16);
			append(li16, t27);
			append(li16, strong0);
			append(strong0, t28);
			append(li16, t29);
			append(li16, strong1);
			append(strong1, t30);
			append(li16, t31);
			insert(target, t32, anchor);
			insert(target, section2, anchor);
			append(section2, h30);
			append(h30, a16);
			append(a16, t33);
			append(section2, t34);
			append(section2, ul5);
			append(ul5, li17);
			append(li17, t35);
			append(li17, code1);
			append(code1, t36);
			append(li17, t37);
			append(ul5, t38);
			append(ul5, li18);
			append(li18, t39);
			append(ul5, t40);
			append(ul5, li19);
			append(li19, code2);
			append(code2, t41);
			append(li19, t42);
			append(li19, code3);
			append(code3, t43);
			append(li19, t44);
			append(li19, code4);
			append(code4, t45);
			append(li19, t46);
			append(ul5, t47);
			append(ul5, li20);
			append(li20, t48);
			append(li20, code5);
			append(code5, t49);
			append(li20, t50);
			append(li20, code6);
			append(code6, t51);
			append(section2, t52);
			append(section2, pre0);
			pre0.innerHTML = raw0_value;
			insert(target, t53, anchor);
			insert(target, section3, anchor);
			append(section3, h31);
			append(h31, a17);
			append(a17, t54);
			append(section3, t55);
			append(section3, ul6);
			append(ul6, li21);
			append(li21, t56);
			append(ul6, t57);
			append(ul6, li22);
			append(li22, t58);
			append(ul6, t59);
			append(ul6, li23);
			append(li23, t60);
			append(section3, t61);
			append(section3, pre1);
			pre1.innerHTML = raw1_value;
			append(section3, t62);
			append(section3, ul7);
			append(ul7, li24);
			append(li24, t63);
			append(li24, code7);
			append(code7, t64);
			append(li24, t65);
			append(section3, t66);
			append(section3, pre2);
			pre2.innerHTML = raw2_value;
			insert(target, t67, anchor);
			insert(target, section4, anchor);
			append(section4, h32);
			append(h32, a18);
			append(a18, t68);
			append(section4, t69);
			append(section4, ol0);
			append(ol0, li25);
			append(li25, t70);
			append(section4, t71);
			append(section4, pre3);
			pre3.innerHTML = raw3_value;
			append(section4, t72);
			append(section4, p1);
			append(p1, picture0);
			append(picture0, source0);
			append(picture0, source1);
			append(picture0, img0);
			append(section4, t73);
			append(section4, ol1);
			append(ol1, li26);
			append(li26, t74);
			append(section4, t75);
			append(section4, ul8);
			append(ul8, li27);
			append(li27, t76);
			append(li27, a19);
			append(a19, t77);
			append(section4, t78);
			append(section4, pre4);
			pre4.innerHTML = raw4_value;
			append(section4, t79);
			append(section4, p2);
			append(p2, picture1);
			append(picture1, source2);
			append(picture1, source3);
			append(picture1, img1);
			append(section4, t80);
			append(section4, ol2);
			append(ol2, li28);
			append(li28, t81);
			append(li28, code8);
			append(code8, t82);
			append(section4, t83);
			append(section4, pre5);
			pre5.innerHTML = raw5_value;
			append(section4, t84);
			append(section4, p3);
			append(p3, picture2);
			append(picture2, source4);
			append(picture2, source5);
			append(picture2, img2);
			append(section4, t85);
			append(section4, ol3);
			append(ol3, li29);
			append(li29, t86);
			append(section4, t87);
			append(section4, ul9);
			append(ul9, li30);
			append(li30, t88);
			append(section4, t89);
			append(section4, pre6);
			pre6.innerHTML = raw6_value;
			append(section4, t90);
			append(section4, p4);
			append(p4, picture3);
			append(picture3, source6);
			append(picture3, source7);
			append(picture3, img3);
			insert(target, t91, anchor);
			insert(target, section5, anchor);
			append(section5, h21);
			append(h21, a20);
			append(a20, t92);
			append(a20, code9);
			append(code9, t93);
			append(section5, t94);
			append(section5, p5);
			append(p5, t95);
			append(p5, a21);
			append(a21, t96);
			append(p5, t97);
			append(section5, t98);
			append(section5, pre7);
			pre7.innerHTML = raw7_value;
			append(section5, t99);
			append(section5, pre8);
			pre8.innerHTML = raw8_value;
			append(section5, t100);
			append(section5, ul10);
			append(ul10, li31);
			append(li31, a22);
			append(a22, t101);
			insert(target, t102, anchor);
			insert(target, section6, anchor);
			append(section6, h33);
			append(h33, a23);
			append(a23, t103);
			append(section6, t104);
			append(section6, p6);
			append(p6, picture4);
			append(picture4, source8);
			append(picture4, source9);
			append(picture4, img4);
			append(section6, t105);
			append(section6, ul11);
			append(ul11, li32);
			append(li32, t106);
			append(ul11, t107);
			append(ul11, li33);
			append(li33, t108);
			append(li33, picture5);
			append(picture5, source10);
			append(picture5, source11);
			append(picture5, img5);
			append(ul11, t109);
			append(ul11, li34);
			append(li34, t110);
			append(li34, picture6);
			append(picture6, source12);
			append(picture6, source13);
			append(picture6, img6);
			insert(target, t111, anchor);
			insert(target, section7, anchor);
			append(section7, h34);
			append(h34, a24);
			append(a24, t112);
			append(section7, t113);
			append(section7, ul13);
			append(ul13, li38);
			append(li38, p7);
			append(p7, t114);
			append(li38, t115);
			append(li38, ul12);
			append(ul12, li35);
			append(li35, t116);
			append(ul12, t117);
			append(ul12, li36);
			append(li36, t118);
			append(ul12, t119);
			append(ul12, li37);
			append(li37, t120);
			append(li37, picture7);
			append(picture7, source14);
			append(picture7, source15);
			append(picture7, img7);
			append(ul13, t121);
			append(ul13, li39);
			append(li39, p8);
			append(p8, t122);
			append(p8, picture8);
			append(picture8, source16);
			append(picture8, source17);
			append(picture8, img8);
			append(ul13, t123);
			append(ul13, li40);
			append(li40, p9);
			append(p9, t124);
			append(p9, picture9);
			append(picture9, source18);
			append(picture9, source19);
			append(picture9, img9);
			append(section7, t125);
			append(section7, ul15);
			append(ul15, li42);
			append(li42, t126);
			append(li42, picture10);
			append(picture10, source20);
			append(picture10, source21);
			append(picture10, img10);
			append(li42, ul14);
			append(ul14, li41);
			append(li41, t127);
			append(section7, t128);
			append(section7, pre9);
			pre9.innerHTML = raw9_value;
			insert(target, t129, anchor);
			insert(target, section8, anchor);
			append(section8, h35);
			append(h35, a25);
			append(a25, t130);
			append(section8, t131);
			append(section8, ul16);
			append(ul16, li43);
			append(li43, t132);
			append(ul16, t133);
			append(ul16, li44);
			append(li44, t134);
			append(li44, code10);
			append(code10, t135);
			append(li44, t136);
			append(li44, picture11);
			append(picture11, source22);
			append(picture11, source23);
			append(picture11, img11);
			insert(target, t137, anchor);
			insert(target, section9, anchor);
			append(section9, h36);
			append(h36, a26);
			append(a26, t138);
			append(section9, t139);
			append(section9, ul17);
			append(ul17, li45);
			append(li45, t140);
			append(li45, picture12);
			append(picture12, source24);
			append(picture12, source25);
			append(picture12, img12);
			insert(target, t141, anchor);
			insert(target, section10, anchor);
			append(section10, h37);
			append(h37, a27);
			append(a27, t142);
			append(section10, t143);
			append(section10, ul18);
			append(ul18, li46);
			append(li46, t144);
			append(li46, picture13);
			append(picture13, source26);
			append(picture13, source27);
			append(picture13, img13);
			append(li46, t145);
			append(li46, picture14);
			append(picture14, source28);
			append(picture14, source29);
			append(picture14, img14);
			insert(target, t146, anchor);
			insert(target, section11, anchor);
			append(section11, h38);
			append(h38, a28);
			append(a28, t147);
			append(section11, t148);
			append(section11, ul19);
			append(ul19, li47);
			append(li47, t149);
			append(li47, picture15);
			append(picture15, source30);
			append(picture15, source31);
			append(picture15, img15);
			insert(target, t150, anchor);
			insert(target, section12, anchor);
			append(section12, h22);
			append(h22, a29);
			append(a29, t151);
			append(a29, code11);
			append(code11, t152);
			append(section12, t153);
			append(section12, p10);
			append(p10, t154);
			append(p10, a30);
			append(a30, t155);
			append(p10, t156);
			append(section12, t157);
			append(section12, ul20);
			append(ul20, li48);
			append(li48, t158);
			append(li48, code12);
			append(code12, t159);
			append(li48, t160);
			append(li48, code13);
			append(code13, t161);
			append(ul20, t162);
			append(ul20, li49);
			append(li49, t163);
			append(ul20, t164);
			append(ul20, li50);
			append(li50, t165);
			append(li50, code14);
			append(code14, t166);
			append(li50, t167);
			append(ul20, t168);
			append(ul20, li51);
			append(li51, t169);
			append(li51, code15);
			append(code15, t170);
			append(li51, t171);
			append(section12, t172);
			append(section12, pre10);
			pre10.innerHTML = raw10_value;
			append(section12, t173);
			append(section12, p11);
			append(p11, img16);
			append(section12, t174);
			mount_component(morphology, section12, null);
			append(section12, t175);
			append(section12, p12);
			append(p12, a31);
			append(a31, t176);
			append(p12, t177);
			insert(target, t178, anchor);
			insert(target, section13, anchor);
			append(section13, h39);
			append(h39, a32);
			append(a32, t179);
			append(a32, code16);
			append(code16, t180);
			append(section13, t181);
			append(section13, p13);
			append(p13, t182);
			append(p13, code17);
			append(code17, t183);
			append(p13, t184);
			append(p13, code18);
			append(code18, t185);
			append(p13, t186);
			append(p13, code19);
			append(code19, t187);
			append(p13, t188);
			append(section13, t189);
			append(section13, pre11);
			pre11.innerHTML = raw11_value;
			append(section13, t190);
			append(section13, p14);
			append(p14, img17);
			append(section13, t191);
			append(section13, p15);
			append(p15, a33);
			append(a33, t192);
			append(p15, t193);
			append(p15, code20);
			append(code20, t194);
			insert(target, t195, anchor);
			insert(target, section14, anchor);
			append(section14, h310);
			append(h310, a34);
			append(a34, t196);
			append(a34, code21);
			append(code21, t197);
			append(section14, t198);
			append(section14, p16);
			append(p16, t199);
			append(p16, code22);
			append(code22, t200);
			append(p16, t201);
			append(p16, code23);
			append(code23, t202);
			append(p16, t203);
			append(p16, code24);
			append(code24, t204);
			append(p16, t205);
			append(section14, t206);
			append(section14, pre12);
			pre12.innerHTML = raw12_value;
			append(section14, t207);
			append(section14, p17);
			append(p17, img18);
			append(section14, t208);
			mount_component(knockouttext, section14, null);
			append(section14, t209);
			append(section14, p18);
			append(p18, a35);
			append(a35, t210);
			append(p18, t211);
			current = true;
		},
		p: noop,
		i(local) {
			if (current) return;
			transition_in(morphology.$$.fragment, local);
			transition_in(knockouttext.$$.fragment, local);
			current = true;
		},
		o(local) {
			transition_out(morphology.$$.fragment, local);
			transition_out(knockouttext.$$.fragment, local);
			current = false;
		},
		d(detaching) {
			if (detaching) detach(section0);
			if (detaching) detach(t14);
			if (detaching) detach(section1);
			if (detaching) detach(t32);
			if (detaching) detach(section2);
			if (detaching) detach(t53);
			if (detaching) detach(section3);
			if (detaching) detach(t67);
			if (detaching) detach(section4);
			if (detaching) detach(t91);
			if (detaching) detach(section5);
			if (detaching) detach(t102);
			if (detaching) detach(section6);
			if (detaching) detach(t111);
			if (detaching) detach(section7);
			if (detaching) detach(t129);
			if (detaching) detach(section8);
			if (detaching) detach(t137);
			if (detaching) detach(section9);
			if (detaching) detach(t141);
			if (detaching) detach(section10);
			if (detaching) detach(t146);
			if (detaching) detach(section11);
			if (detaching) detach(t150);
			if (detaching) detach(section12);
			destroy_component(morphology);
			if (detaching) detach(t178);
			if (detaching) detach(section13);
			if (detaching) detach(t195);
			if (detaching) detach(section14);
			destroy_component(knockouttext);
		}
	};
}

function create_fragment$4(ctx) {
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
	"title": "SVG Filters",
	"tags": ["svg filters", "filters", "svg"],
	"slug": "notes/svg-filters",
	"type": "notes",
	"name": "svg-filters",
	"layout": "note"
};

class Page_markup extends SvelteComponent {
	constructor(options) {
		super();
		init(this, options, null, create_fragment$4, safe_not_equal, {});
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
