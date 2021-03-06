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

var __build_img_webp__5 = "15dcca7d3b1a22fa.webp";

var __build_img__5 = "15dcca7d3b1a22fa.png";

var __build_img_webp__4 = "e43a9c3249f8bb4a.webp";

var __build_img__4 = "e43a9c3249f8bb4a.png";

var __build_img_webp__3 = "16b672cca46f68c4.webp";

var __build_img__3 = "16b672cca46f68c4.png";

var __build_img_webp__2 = "d226f8139ecb84fe.webp";

var __build_img__2 = "d226f8139ecb84fe.png";

var __build_img_webp__1 = "a00250dfaf4363ff.webp";

var __build_img__1 = "a00250dfaf4363ff.png";

var __build_img_webp__0 = "30285200e85d7abf.webp";

var __build_img__0 = "30285200e85d7abf.png";

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

var image = null;

/* src/layout/blog.svelte generated by Svelte v3.24.0 */

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

// (34:2) {#each tags as tag}
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

// (73:2) {#each tags as tag}
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
			attr(span, "class", "svelte-142ghl5");
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
		author: /*jsonLdAuthor*/ ctx[3],
		copyrightHolder: /*jsonLdAuthor*/ ctx[3],
		copyrightYear: "2020",
		creator: /*jsonLdAuthor*/ ctx[3],
		publisher: /*jsonLdAuthor*/ ctx[3],
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
					"@id": "https%3A%2F%2Flihautan.com%2F5-steps-to-build-nodejs-using-travis-ci",
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
	let article;
	let t7;
	let footer;
	let newsletter;
	let t8;
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

	const default_slot_template = /*$$slots*/ ctx[5].default;
	const default_slot = create_slot(default_slot_template, ctx, /*$$scope*/ ctx[4], null);
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
			article = element("article");
			if (default_slot) default_slot.c();
			t7 = space();
			footer = element("footer");
			create_component(newsletter.$$.fragment);
			t8 = space();
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
			article = claim_element(main_nodes, "ARTICLE", {});
			var article_nodes = children(article);
			if (default_slot) default_slot.l(article_nodes);
			article_nodes.forEach(detach);
			main_nodes.forEach(detach);
			t7 = claim_space(nodes);
			footer = claim_element(nodes, "FOOTER", { class: true });
			var footer_nodes = children(footer);
			claim_component(newsletter.$$.fragment, footer_nodes);
			t8 = claim_space(footer_nodes);
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
			attr(meta11, "content", "https%3A%2F%2Flihautan.com%2F5-steps-to-build-nodejs-using-travis-ci");
			attr(meta12, "itemprop", "image");
			attr(meta12, "content", image);
			html_tag = new HtmlTag(html_anchor);
			html_tag_1 = new HtmlTag(html_anchor_1);
			attr(a, "href", "#content");
			attr(a, "class", "skip svelte-142ghl5");
			attr(main, "id", "content");
			attr(main, "class", "blog svelte-142ghl5");
			attr(footer, "class", "svelte-142ghl5");
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
			append(main, article);

			if (default_slot) {
				default_slot.m(article, null);
			}

			insert(target, t7, anchor);
			insert(target, footer, anchor);
			mount_component(newsletter, footer, null);
			append(footer, t8);
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
				author: /*jsonLdAuthor*/ ctx[3],
				copyrightHolder: /*jsonLdAuthor*/ ctx[3],
				copyrightYear: "2020",
				creator: /*jsonLdAuthor*/ ctx[3],
				publisher: /*jsonLdAuthor*/ ctx[3],
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
							"@id": "https%3A%2F%2Flihautan.com%2F5-steps-to-build-nodejs-using-travis-ci",
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

			if (default_slot) {
				if (default_slot.p && dirty & /*$$scope*/ 16) {
					update_slot(default_slot, default_slot_template, ctx, /*$$scope*/ ctx[4], dirty, null, null);
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
			if (default_slot) default_slot.d(detaching);
			if (detaching) detach(t7);
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
	const jsonLdAuthor = { ["@type"]: "Person", name: "Tan Li Hau" };
	let { $$slots = {}, $$scope } = $$props;

	$$self.$set = $$props => {
		if ("title" in $$props) $$invalidate(0, title = $$props.title);
		if ("description" in $$props) $$invalidate(1, description = $$props.description);
		if ("tags" in $$props) $$invalidate(2, tags = $$props.tags);
		if ("$$scope" in $$props) $$invalidate(4, $$scope = $$props.$$scope);
	};

	return [title, description, tags, jsonLdAuthor, $$scope, $$slots];
}

class Blog extends SvelteComponent {
	constructor(options) {
		super();
		init(this, options, instance$2, create_fragment$2, safe_not_equal, { title: 0, description: 1, tags: 2 });
	}
}

/* content/blog/5-steps-to-build-nodejs-using-travis-ci/@@page-markup.svelte generated by Svelte v3.24.0 */

function create_default_slot(ctx) {
	let section0;
	let ul;
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
	let t5;
	let section1;
	let h20;
	let a5;
	let t6;
	let t7;
	let blockquote0;
	let p0;
	let strong0;
	let a6;
	let t8;
	let t9;
	let strong1;
	let t10;
	let t11;
	let a7;
	let t12;
	let t13;
	let t14;
	let p1;
	let t15;
	let t16;
	let p2;
	let t17;
	let t18;
	let section2;
	let h21;
	let a8;
	let t19;
	let t20;
	let p3;
	let t21;
	let a9;
	let t22;
	let t23;
	let t24;
	let p4;
	let t25;
	let t26;
	let p5;
	let picture0;
	let source0;
	let source1;
	let img0;
	let t27;
	let p6;
	let t28;
	let t29;
	let p7;
	let t30;
	let code0;
	let t31;
	let t32;
	let em;
	let t33;
	let t34;
	let t35;
	let p8;
	let t36;
	let t37;
	let p9;
	let picture1;
	let source2;
	let source3;
	let img1;
	let t38;
	let p10;
	let t39;
	let t40;
	let p11;
	let t41;
	let t42;
	let p12;
	let t43;
	let t44;
	let section3;
	let h22;
	let a10;
	let t45;
	let t46;
	let p13;
	let t47;
	let code1;
	let t48;
	let t49;
	let t50;
	let p14;
	let t51;
	let t52;
	let p15;
	let strong2;
	let t53;
	let t54;
	let pre0;

	let raw0_value = `<code class="language-yml">language: node_js
node_js:
  - 4.2</code>` + "";

	let t55;
	let p16;
	let t56;
	let t57;
	let p17;
	let t58;
	let t59;
	let pre1;
	let raw1_value = `<code class="language-sh">curl https://gist.githubusercontent.com/tanhauhau/405e39884e80288615a7b51181fd5228/raw/9045c2e219547f0a228da630abff345d8add0c47/.travis.yml &gt; .travis.yml</code>` + "";
	let t60;
	let p18;
	let t61;
	let t62;
	let blockquote1;
	let p19;
	let t63;
	let t64;
	let p20;
	let t65;
	let code2;
	let t66;
	let t67;
	let t68;
	let p21;
	let picture2;
	let source4;
	let source5;
	let img2;
	let t69;
	let section4;
	let h23;
	let a11;
	let t70;
	let t71;
	let p22;
	let t72;
	let t73;
	let pre2;

	let raw2_value = `<code class="language-yml">language: node_js
node_js:
  - 4.2
before_script:
  - npm install -g bower
  - bower install</code>` + "";

	let t74;
	let p23;
	let t75;
	let t76;
	let pre3;
	let raw3_value = `<code class="language-sh">curl https://gist.githubusercontent.com/tanhauhau/71998bf221810186f046db94cda10c4e/raw/d1e8aee0981a96c20f94de6db386da048face423/.travis.yml &gt; .travis.yml</code>` + "";
	let t77;
	let p24;
	let t78;
	let t79;
	let p25;
	let picture3;
	let source6;
	let source7;
	let img3;
	let t80;
	let blockquote2;
	let p26;
	let t81;
	let a12;
	let t82;
	let t83;
	let t84;
	let section5;
	let h24;
	let a13;
	let t85;
	let t86;
	let p27;
	let t87;
	let code3;
	let t88;
	let t89;
	let t90;
	let p28;
	let t91;
	let t92;
	let p29;
	let t93;
	let t94;
	let p30;
	let picture4;
	let source8;
	let source9;
	let img4;
	let t95;
	let p31;
	let t96;
	let t97;
	let p32;
	let t98;
	let t99;
	let p33;
	let t100;
	let t101;
	let p34;
	let picture5;
	let source10;
	let source11;
	let img5;

	return {
		c() {
			section0 = element("section");
			ul = element("ul");
			li0 = element("li");
			a0 = element("a");
			t0 = text("1. What is Travis CI");
			li1 = element("li");
			a1 = element("a");
			t1 = text("2. How do I use Travis CI");
			li2 = element("li");
			a2 = element("a");
			t2 = text("3. How to build a Node.js project using Travis CI");
			li3 = element("li");
			a3 = element("a");
			t3 = text("4. How do I use bower and install bower dependencies");
			li4 = element("li");
			a4 = element("a");
			t4 = text("5. Include a Travis CI badge");
			t5 = space();
			section1 = element("section");
			h20 = element("h2");
			a5 = element("a");
			t6 = text("1. What is Travis CI");
			t7 = space();
			blockquote0 = element("blockquote");
			p0 = element("p");
			strong0 = element("strong");
			a6 = element("a");
			t8 = text("Travis CI");
			t9 = text(" is a ");
			strong1 = element("strong");
			t10 = text("Continuous Integration");
			t11 = text(" service used to build and test software projects hosted at ");
			a7 = element("a");
			t12 = text("GitHub");
			t13 = text(".");
			t14 = space();
			p1 = element("p");
			t15 = text("Or in simple terms, when you push a commit to the master branch of your project hosted at GitHub, Travis CI will run tests and build the latest commit of your master branch.");
			t16 = space();
			p2 = element("p");
			t17 = text("It’s that simple. You push a commit → Travis CI run tests and build. Automatically.");
			t18 = space();
			section2 = element("section");
			h21 = element("h2");
			a8 = element("a");
			t19 = text("2. How do I use Travis CI");
			t20 = space();
			p3 = element("p");
			t21 = text("Go to ");
			a9 = element("a");
			t22 = text("Travis CI");
			t23 = text(". Sign in using your GitHub account. You will be prompted to authorise Travis CI to your GitHub account. Approved that.");
			t24 = space();
			p4 = element("p");
			t25 = text("When you see something like this:");
			t26 = space();
			p5 = element("p");
			picture0 = element("picture");
			source0 = element("source");
			source1 = element("source");
			img0 = element("img");
			t27 = space();
			p6 = element("p");
			t28 = text("Voila. You have created a Travis CI account.");
			t29 = space();
			p7 = element("p");
			t30 = text("Next thing you are going to do is to click the ");
			code0 = element("code");
			t31 = text("(+)");
			t32 = text(" button beside the ");
			em = element("em");
			t33 = text("“My Repositories”");
			t34 = text(" on the left.");
			t35 = space();
			p8 = element("p");
			t36 = text("You will then see a list of projects on your GitHub.");
			t37 = space();
			p9 = element("p");
			picture1 = element("picture");
			source2 = element("source");
			source3 = element("source");
			img1 = element("img");
			t38 = space();
			p10 = element("p");
			t39 = text("If the list of repositories is empty, click “Sync account” to fetch all your repositories.");
			t40 = space();
			p11 = element("p");
			t41 = text("Turn on one of your project for Continuous Integration!");
			t42 = space();
			p12 = element("p");
			t43 = text("That’s all.");
			t44 = space();
			section3 = element("section");
			h22 = element("h2");
			a10 = element("a");
			t45 = text("3. How to build a Node.js project using Travis CI");
			t46 = space();
			p13 = element("p");
			t47 = text("Create a file name ");
			code1 = element("code");
			t48 = text(".travis.yml");
			t49 = text(" at the root folder of your project.");
			t50 = space();
			p14 = element("p");
			t51 = text("Copy this into the file.");
			t52 = space();
			p15 = element("p");
			strong2 = element("strong");
			t53 = text("travis.yml:");
			t54 = space();
			pre0 = element("pre");
			t55 = space();
			p16 = element("p");
			t56 = text("Commit and Push. That’s simple.");
			t57 = space();
			p17 = element("p");
			t58 = text("Or if you are lazy, run this:");
			t59 = space();
			pre1 = element("pre");
			t60 = space();
			p18 = element("p");
			t61 = text("The version of Node.js I am using is 4.2 at the time of writing this article. To be safe, you can run “node — version” on your command line to determine which version of Node.js you are running.");
			t62 = space();
			blockquote1 = element("blockquote");
			p19 = element("p");
			t63 = text("Make sure that you have all your dependencies persists to the package.json as Travis CI will install all the dependencies from it by calling npm install.");
			t64 = space();
			p20 = element("p");
			t65 = text("Another thing to take note is that if you wanna run your test script, make sure to include it in the ");
			code2 = element("code");
			t66 = text("package.json");
			t67 = text(".");
			t68 = space();
			p21 = element("p");
			picture2 = element("picture");
			source4 = element("source");
			source5 = element("source");
			img2 = element("img");
			t69 = space();
			section4 = element("section");
			h23 = element("h2");
			a11 = element("a");
			t70 = text("4. How do I use bower and install bower dependencies");
			t71 = space();
			p22 = element("p");
			t72 = text("If you are using bower, add a before_script for .travis.yml");
			t73 = space();
			pre2 = element("pre");
			t74 = space();
			p23 = element("p");
			t75 = text("Or likewise if you are lazy, copy and paste this to your command line.");
			t76 = space();
			pre3 = element("pre");
			t77 = space();
			p24 = element("p");
			t78 = text("One thing to take note for bower is that when there is dependency conflict, bower will ask you to choose which version of the dependency to be installed interactively. In the case for Travis CI, Travis CI will not know which version to install it for you where you will see an error like this:");
			t79 = space();
			p25 = element("p");
			picture3 = element("picture");
			source6 = element("source");
			source7 = element("source");
			img3 = element("img");
			t80 = space();
			blockquote2 = element("blockquote");
			p26 = element("p");
			t81 = text("Therefore, you will have to ");
			a12 = element("a");
			t82 = text("persists the resolution to bower.json");
			t83 = text(" to avoid the build error.");
			t84 = space();
			section5 = element("section");
			h24 = element("h2");
			a13 = element("a");
			t85 = text("5. Include a Travis CI badge");
			t86 = space();
			p27 = element("p");
			t87 = text("To summarise, you have set up your Travis CI, copied and pasted the ");
			code3 = element("code");
			t88 = text(".travis.yml");
			t89 = text(" to your project, commited and pushed your project to GitHub, and Travis CI had built and tested your project.");
			t90 = space();
			p28 = element("p");
			t91 = text("Now, it’s time to add a badge to your GitHub repository!");
			t92 = space();
			p29 = element("p");
			t93 = text("Simply clicked the badge in Travis CI and choose for Markdown.");
			t94 = space();
			p30 = element("p");
			picture4 = element("picture");
			source8 = element("source");
			source9 = element("source");
			img4 = element("img");
			t95 = space();
			p31 = element("p");
			t96 = text("Copy and paste the line into your README.md.");
			t97 = space();
			p32 = element("p");
			t98 = text("Commit and Push.");
			t99 = space();
			p33 = element("p");
			t100 = text("And now you have a Travis CI badge on your repo!");
			t101 = space();
			p34 = element("p");
			picture5 = element("picture");
			source10 = element("source");
			source11 = element("source");
			img5 = element("img");
			this.h();
		},
		l(nodes) {
			section0 = claim_element(nodes, "SECTION", {});
			var section0_nodes = children(section0);

			ul = claim_element(section0_nodes, "UL", {
				class: true,
				id: true,
				role: true,
				"aria-label": true
			});

			var ul_nodes = children(ul);
			li0 = claim_element(ul_nodes, "LI", {});
			var li0_nodes = children(li0);
			a0 = claim_element(li0_nodes, "A", { href: true });
			var a0_nodes = children(a0);
			t0 = claim_text(a0_nodes, "1. What is Travis CI");
			a0_nodes.forEach(detach);
			li0_nodes.forEach(detach);
			li1 = claim_element(ul_nodes, "LI", {});
			var li1_nodes = children(li1);
			a1 = claim_element(li1_nodes, "A", { href: true });
			var a1_nodes = children(a1);
			t1 = claim_text(a1_nodes, "2. How do I use Travis CI");
			a1_nodes.forEach(detach);
			li1_nodes.forEach(detach);
			li2 = claim_element(ul_nodes, "LI", {});
			var li2_nodes = children(li2);
			a2 = claim_element(li2_nodes, "A", { href: true });
			var a2_nodes = children(a2);
			t2 = claim_text(a2_nodes, "3. How to build a Node.js project using Travis CI");
			a2_nodes.forEach(detach);
			li2_nodes.forEach(detach);
			li3 = claim_element(ul_nodes, "LI", {});
			var li3_nodes = children(li3);
			a3 = claim_element(li3_nodes, "A", { href: true });
			var a3_nodes = children(a3);
			t3 = claim_text(a3_nodes, "4. How do I use bower and install bower dependencies");
			a3_nodes.forEach(detach);
			li3_nodes.forEach(detach);
			li4 = claim_element(ul_nodes, "LI", {});
			var li4_nodes = children(li4);
			a4 = claim_element(li4_nodes, "A", { href: true });
			var a4_nodes = children(a4);
			t4 = claim_text(a4_nodes, "5. Include a Travis CI badge");
			a4_nodes.forEach(detach);
			li4_nodes.forEach(detach);
			ul_nodes.forEach(detach);
			section0_nodes.forEach(detach);
			t5 = claim_space(nodes);
			section1 = claim_element(nodes, "SECTION", {});
			var section1_nodes = children(section1);
			h20 = claim_element(section1_nodes, "H2", {});
			var h20_nodes = children(h20);
			a5 = claim_element(h20_nodes, "A", { href: true, id: true });
			var a5_nodes = children(a5);
			t6 = claim_text(a5_nodes, "1. What is Travis CI");
			a5_nodes.forEach(detach);
			h20_nodes.forEach(detach);
			t7 = claim_space(section1_nodes);
			blockquote0 = claim_element(section1_nodes, "BLOCKQUOTE", {});
			var blockquote0_nodes = children(blockquote0);
			p0 = claim_element(blockquote0_nodes, "P", {});
			var p0_nodes = children(p0);
			strong0 = claim_element(p0_nodes, "STRONG", {});
			var strong0_nodes = children(strong0);
			a6 = claim_element(strong0_nodes, "A", { href: true, rel: true });
			var a6_nodes = children(a6);
			t8 = claim_text(a6_nodes, "Travis CI");
			a6_nodes.forEach(detach);
			strong0_nodes.forEach(detach);
			t9 = claim_text(p0_nodes, " is a ");
			strong1 = claim_element(p0_nodes, "STRONG", {});
			var strong1_nodes = children(strong1);
			t10 = claim_text(strong1_nodes, "Continuous Integration");
			strong1_nodes.forEach(detach);
			t11 = claim_text(p0_nodes, " service used to build and test software projects hosted at ");
			a7 = claim_element(p0_nodes, "A", { href: true, rel: true });
			var a7_nodes = children(a7);
			t12 = claim_text(a7_nodes, "GitHub");
			a7_nodes.forEach(detach);
			t13 = claim_text(p0_nodes, ".");
			p0_nodes.forEach(detach);
			blockquote0_nodes.forEach(detach);
			t14 = claim_space(section1_nodes);
			p1 = claim_element(section1_nodes, "P", {});
			var p1_nodes = children(p1);
			t15 = claim_text(p1_nodes, "Or in simple terms, when you push a commit to the master branch of your project hosted at GitHub, Travis CI will run tests and build the latest commit of your master branch.");
			p1_nodes.forEach(detach);
			t16 = claim_space(section1_nodes);
			p2 = claim_element(section1_nodes, "P", {});
			var p2_nodes = children(p2);
			t17 = claim_text(p2_nodes, "It’s that simple. You push a commit → Travis CI run tests and build. Automatically.");
			p2_nodes.forEach(detach);
			section1_nodes.forEach(detach);
			t18 = claim_space(nodes);
			section2 = claim_element(nodes, "SECTION", {});
			var section2_nodes = children(section2);
			h21 = claim_element(section2_nodes, "H2", {});
			var h21_nodes = children(h21);
			a8 = claim_element(h21_nodes, "A", { href: true, id: true });
			var a8_nodes = children(a8);
			t19 = claim_text(a8_nodes, "2. How do I use Travis CI");
			a8_nodes.forEach(detach);
			h21_nodes.forEach(detach);
			t20 = claim_space(section2_nodes);
			p3 = claim_element(section2_nodes, "P", {});
			var p3_nodes = children(p3);
			t21 = claim_text(p3_nodes, "Go to ");
			a9 = claim_element(p3_nodes, "A", { href: true, rel: true });
			var a9_nodes = children(a9);
			t22 = claim_text(a9_nodes, "Travis CI");
			a9_nodes.forEach(detach);
			t23 = claim_text(p3_nodes, ". Sign in using your GitHub account. You will be prompted to authorise Travis CI to your GitHub account. Approved that.");
			p3_nodes.forEach(detach);
			t24 = claim_space(section2_nodes);
			p4 = claim_element(section2_nodes, "P", {});
			var p4_nodes = children(p4);
			t25 = claim_text(p4_nodes, "When you see something like this:");
			p4_nodes.forEach(detach);
			t26 = claim_space(section2_nodes);
			p5 = claim_element(section2_nodes, "P", {});
			var p5_nodes = children(p5);
			picture0 = claim_element(p5_nodes, "PICTURE", {});
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
			p5_nodes.forEach(detach);
			t27 = claim_space(section2_nodes);
			p6 = claim_element(section2_nodes, "P", {});
			var p6_nodes = children(p6);
			t28 = claim_text(p6_nodes, "Voila. You have created a Travis CI account.");
			p6_nodes.forEach(detach);
			t29 = claim_space(section2_nodes);
			p7 = claim_element(section2_nodes, "P", {});
			var p7_nodes = children(p7);
			t30 = claim_text(p7_nodes, "Next thing you are going to do is to click the ");
			code0 = claim_element(p7_nodes, "CODE", {});
			var code0_nodes = children(code0);
			t31 = claim_text(code0_nodes, "(+)");
			code0_nodes.forEach(detach);
			t32 = claim_text(p7_nodes, " button beside the ");
			em = claim_element(p7_nodes, "EM", {});
			var em_nodes = children(em);
			t33 = claim_text(em_nodes, "“My Repositories”");
			em_nodes.forEach(detach);
			t34 = claim_text(p7_nodes, " on the left.");
			p7_nodes.forEach(detach);
			t35 = claim_space(section2_nodes);
			p8 = claim_element(section2_nodes, "P", {});
			var p8_nodes = children(p8);
			t36 = claim_text(p8_nodes, "You will then see a list of projects on your GitHub.");
			p8_nodes.forEach(detach);
			t37 = claim_space(section2_nodes);
			p9 = claim_element(section2_nodes, "P", {});
			var p9_nodes = children(p9);
			picture1 = claim_element(p9_nodes, "PICTURE", {});
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
			p9_nodes.forEach(detach);
			t38 = claim_space(section2_nodes);
			p10 = claim_element(section2_nodes, "P", {});
			var p10_nodes = children(p10);
			t39 = claim_text(p10_nodes, "If the list of repositories is empty, click “Sync account” to fetch all your repositories.");
			p10_nodes.forEach(detach);
			t40 = claim_space(section2_nodes);
			p11 = claim_element(section2_nodes, "P", {});
			var p11_nodes = children(p11);
			t41 = claim_text(p11_nodes, "Turn on one of your project for Continuous Integration!");
			p11_nodes.forEach(detach);
			t42 = claim_space(section2_nodes);
			p12 = claim_element(section2_nodes, "P", {});
			var p12_nodes = children(p12);
			t43 = claim_text(p12_nodes, "That’s all.");
			p12_nodes.forEach(detach);
			section2_nodes.forEach(detach);
			t44 = claim_space(nodes);
			section3 = claim_element(nodes, "SECTION", {});
			var section3_nodes = children(section3);
			h22 = claim_element(section3_nodes, "H2", {});
			var h22_nodes = children(h22);
			a10 = claim_element(h22_nodes, "A", { href: true, id: true });
			var a10_nodes = children(a10);
			t45 = claim_text(a10_nodes, "3. How to build a Node.js project using Travis CI");
			a10_nodes.forEach(detach);
			h22_nodes.forEach(detach);
			t46 = claim_space(section3_nodes);
			p13 = claim_element(section3_nodes, "P", {});
			var p13_nodes = children(p13);
			t47 = claim_text(p13_nodes, "Create a file name ");
			code1 = claim_element(p13_nodes, "CODE", {});
			var code1_nodes = children(code1);
			t48 = claim_text(code1_nodes, ".travis.yml");
			code1_nodes.forEach(detach);
			t49 = claim_text(p13_nodes, " at the root folder of your project.");
			p13_nodes.forEach(detach);
			t50 = claim_space(section3_nodes);
			p14 = claim_element(section3_nodes, "P", {});
			var p14_nodes = children(p14);
			t51 = claim_text(p14_nodes, "Copy this into the file.");
			p14_nodes.forEach(detach);
			t52 = claim_space(section3_nodes);
			p15 = claim_element(section3_nodes, "P", {});
			var p15_nodes = children(p15);
			strong2 = claim_element(p15_nodes, "STRONG", {});
			var strong2_nodes = children(strong2);
			t53 = claim_text(strong2_nodes, "travis.yml:");
			strong2_nodes.forEach(detach);
			p15_nodes.forEach(detach);
			t54 = claim_space(section3_nodes);
			pre0 = claim_element(section3_nodes, "PRE", { class: true });
			var pre0_nodes = children(pre0);
			pre0_nodes.forEach(detach);
			t55 = claim_space(section3_nodes);
			p16 = claim_element(section3_nodes, "P", {});
			var p16_nodes = children(p16);
			t56 = claim_text(p16_nodes, "Commit and Push. That’s simple.");
			p16_nodes.forEach(detach);
			t57 = claim_space(section3_nodes);
			p17 = claim_element(section3_nodes, "P", {});
			var p17_nodes = children(p17);
			t58 = claim_text(p17_nodes, "Or if you are lazy, run this:");
			p17_nodes.forEach(detach);
			t59 = claim_space(section3_nodes);
			pre1 = claim_element(section3_nodes, "PRE", { class: true });
			var pre1_nodes = children(pre1);
			pre1_nodes.forEach(detach);
			t60 = claim_space(section3_nodes);
			p18 = claim_element(section3_nodes, "P", {});
			var p18_nodes = children(p18);
			t61 = claim_text(p18_nodes, "The version of Node.js I am using is 4.2 at the time of writing this article. To be safe, you can run “node — version” on your command line to determine which version of Node.js you are running.");
			p18_nodes.forEach(detach);
			t62 = claim_space(section3_nodes);
			blockquote1 = claim_element(section3_nodes, "BLOCKQUOTE", {});
			var blockquote1_nodes = children(blockquote1);
			p19 = claim_element(blockquote1_nodes, "P", {});
			var p19_nodes = children(p19);
			t63 = claim_text(p19_nodes, "Make sure that you have all your dependencies persists to the package.json as Travis CI will install all the dependencies from it by calling npm install.");
			p19_nodes.forEach(detach);
			blockquote1_nodes.forEach(detach);
			t64 = claim_space(section3_nodes);
			p20 = claim_element(section3_nodes, "P", {});
			var p20_nodes = children(p20);
			t65 = claim_text(p20_nodes, "Another thing to take note is that if you wanna run your test script, make sure to include it in the ");
			code2 = claim_element(p20_nodes, "CODE", {});
			var code2_nodes = children(code2);
			t66 = claim_text(code2_nodes, "package.json");
			code2_nodes.forEach(detach);
			t67 = claim_text(p20_nodes, ".");
			p20_nodes.forEach(detach);
			t68 = claim_space(section3_nodes);
			p21 = claim_element(section3_nodes, "P", {});
			var p21_nodes = children(p21);
			picture2 = claim_element(p21_nodes, "PICTURE", {});
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
			p21_nodes.forEach(detach);
			section3_nodes.forEach(detach);
			t69 = claim_space(nodes);
			section4 = claim_element(nodes, "SECTION", {});
			var section4_nodes = children(section4);
			h23 = claim_element(section4_nodes, "H2", {});
			var h23_nodes = children(h23);
			a11 = claim_element(h23_nodes, "A", { href: true, id: true });
			var a11_nodes = children(a11);
			t70 = claim_text(a11_nodes, "4. How do I use bower and install bower dependencies");
			a11_nodes.forEach(detach);
			h23_nodes.forEach(detach);
			t71 = claim_space(section4_nodes);
			p22 = claim_element(section4_nodes, "P", {});
			var p22_nodes = children(p22);
			t72 = claim_text(p22_nodes, "If you are using bower, add a before_script for .travis.yml");
			p22_nodes.forEach(detach);
			t73 = claim_space(section4_nodes);
			pre2 = claim_element(section4_nodes, "PRE", { class: true });
			var pre2_nodes = children(pre2);
			pre2_nodes.forEach(detach);
			t74 = claim_space(section4_nodes);
			p23 = claim_element(section4_nodes, "P", {});
			var p23_nodes = children(p23);
			t75 = claim_text(p23_nodes, "Or likewise if you are lazy, copy and paste this to your command line.");
			p23_nodes.forEach(detach);
			t76 = claim_space(section4_nodes);
			pre3 = claim_element(section4_nodes, "PRE", { class: true });
			var pre3_nodes = children(pre3);
			pre3_nodes.forEach(detach);
			t77 = claim_space(section4_nodes);
			p24 = claim_element(section4_nodes, "P", {});
			var p24_nodes = children(p24);
			t78 = claim_text(p24_nodes, "One thing to take note for bower is that when there is dependency conflict, bower will ask you to choose which version of the dependency to be installed interactively. In the case for Travis CI, Travis CI will not know which version to install it for you where you will see an error like this:");
			p24_nodes.forEach(detach);
			t79 = claim_space(section4_nodes);
			p25 = claim_element(section4_nodes, "P", {});
			var p25_nodes = children(p25);
			picture3 = claim_element(p25_nodes, "PICTURE", {});
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
			p25_nodes.forEach(detach);
			t80 = claim_space(section4_nodes);
			blockquote2 = claim_element(section4_nodes, "BLOCKQUOTE", {});
			var blockquote2_nodes = children(blockquote2);
			p26 = claim_element(blockquote2_nodes, "P", {});
			var p26_nodes = children(p26);
			t81 = claim_text(p26_nodes, "Therefore, you will have to ");
			a12 = claim_element(p26_nodes, "A", { href: true, rel: true });
			var a12_nodes = children(a12);
			t82 = claim_text(a12_nodes, "persists the resolution to bower.json");
			a12_nodes.forEach(detach);
			t83 = claim_text(p26_nodes, " to avoid the build error.");
			p26_nodes.forEach(detach);
			blockquote2_nodes.forEach(detach);
			section4_nodes.forEach(detach);
			t84 = claim_space(nodes);
			section5 = claim_element(nodes, "SECTION", {});
			var section5_nodes = children(section5);
			h24 = claim_element(section5_nodes, "H2", {});
			var h24_nodes = children(h24);
			a13 = claim_element(h24_nodes, "A", { href: true, id: true });
			var a13_nodes = children(a13);
			t85 = claim_text(a13_nodes, "5. Include a Travis CI badge");
			a13_nodes.forEach(detach);
			h24_nodes.forEach(detach);
			t86 = claim_space(section5_nodes);
			p27 = claim_element(section5_nodes, "P", {});
			var p27_nodes = children(p27);
			t87 = claim_text(p27_nodes, "To summarise, you have set up your Travis CI, copied and pasted the ");
			code3 = claim_element(p27_nodes, "CODE", {});
			var code3_nodes = children(code3);
			t88 = claim_text(code3_nodes, ".travis.yml");
			code3_nodes.forEach(detach);
			t89 = claim_text(p27_nodes, " to your project, commited and pushed your project to GitHub, and Travis CI had built and tested your project.");
			p27_nodes.forEach(detach);
			t90 = claim_space(section5_nodes);
			p28 = claim_element(section5_nodes, "P", {});
			var p28_nodes = children(p28);
			t91 = claim_text(p28_nodes, "Now, it’s time to add a badge to your GitHub repository!");
			p28_nodes.forEach(detach);
			t92 = claim_space(section5_nodes);
			p29 = claim_element(section5_nodes, "P", {});
			var p29_nodes = children(p29);
			t93 = claim_text(p29_nodes, "Simply clicked the badge in Travis CI and choose for Markdown.");
			p29_nodes.forEach(detach);
			t94 = claim_space(section5_nodes);
			p30 = claim_element(section5_nodes, "P", {});
			var p30_nodes = children(p30);
			picture4 = claim_element(p30_nodes, "PICTURE", {});
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
			p30_nodes.forEach(detach);
			t95 = claim_space(section5_nodes);
			p31 = claim_element(section5_nodes, "P", {});
			var p31_nodes = children(p31);
			t96 = claim_text(p31_nodes, "Copy and paste the line into your README.md.");
			p31_nodes.forEach(detach);
			t97 = claim_space(section5_nodes);
			p32 = claim_element(section5_nodes, "P", {});
			var p32_nodes = children(p32);
			t98 = claim_text(p32_nodes, "Commit and Push.");
			p32_nodes.forEach(detach);
			t99 = claim_space(section5_nodes);
			p33 = claim_element(section5_nodes, "P", {});
			var p33_nodes = children(p33);
			t100 = claim_text(p33_nodes, "And now you have a Travis CI badge on your repo!");
			p33_nodes.forEach(detach);
			t101 = claim_space(section5_nodes);
			p34 = claim_element(section5_nodes, "P", {});
			var p34_nodes = children(p34);
			picture5 = claim_element(p34_nodes, "PICTURE", {});
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
			p34_nodes.forEach(detach);
			section5_nodes.forEach(detach);
			this.h();
		},
		h() {
			attr(a0, "href", "#what-is-travis-ci");
			attr(a1, "href", "#how-do-i-use-travis-ci");
			attr(a2, "href", "#how-to-build-a-node-js-project-using-travis-ci");
			attr(a3, "href", "#how-do-i-use-bower-and-install-bower-dependencies");
			attr(a4, "href", "#include-a-travis-ci-badge");
			attr(ul, "class", "sitemap");
			attr(ul, "id", "sitemap");
			attr(ul, "role", "navigation");
			attr(ul, "aria-label", "Table of Contents");
			attr(a5, "href", "#what-is-travis-ci");
			attr(a5, "id", "what-is-travis-ci");
			attr(a6, "href", "https://travis-ci.org");
			attr(a6, "rel", "nofollow");
			attr(a7, "href", "https://github.com");
			attr(a7, "rel", "nofollow");
			attr(a8, "href", "#how-do-i-use-travis-ci");
			attr(a8, "id", "how-do-i-use-travis-ci");
			attr(a9, "href", "https://travis-ci.org");
			attr(a9, "rel", "nofollow");
			attr(source0, "type", "image/webp");
			attr(source0, "srcset", __build_img_webp__0);
			attr(source1, "type", "image/jpeg");
			attr(source1, "srcset", __build_img__0);
			attr(img0, "title", "null");
			attr(img0, "alt", "travis");
			attr(img0, "data-src", __build_img__0);
			attr(img0, "loading", "lazy");
			attr(source2, "type", "image/webp");
			attr(source2, "srcset", __build_img_webp__1);
			attr(source3, "type", "image/jpeg");
			attr(source3, "srcset", __build_img__1);
			attr(img1, "title", "null");
			attr(img1, "alt", "travis");
			attr(img1, "data-src", __build_img__1);
			attr(img1, "loading", "lazy");
			attr(a10, "href", "#how-to-build-a-node-js-project-using-travis-ci");
			attr(a10, "id", "how-to-build-a-node-js-project-using-travis-ci");
			attr(pre0, "class", "language-yml");
			attr(pre1, "class", "language-sh");
			attr(source4, "type", "image/webp");
			attr(source4, "srcset", __build_img_webp__2);
			attr(source5, "type", "image/jpeg");
			attr(source5, "srcset", __build_img__2);
			attr(img2, "title", "null");
			attr(img2, "alt", "packagejson");
			attr(img2, "data-src", __build_img__2);
			attr(img2, "loading", "lazy");
			attr(a11, "href", "#how-do-i-use-bower-and-install-bower-dependencies");
			attr(a11, "id", "how-do-i-use-bower-and-install-bower-dependencies");
			attr(pre2, "class", "language-yml");
			attr(pre3, "class", "language-sh");
			attr(source6, "type", "image/webp");
			attr(source6, "srcset", __build_img_webp__3);
			attr(source7, "type", "image/jpeg");
			attr(source7, "srcset", __build_img__3);
			attr(img3, "title", "null");
			attr(img3, "alt", "bower");
			attr(img3, "data-src", __build_img__3);
			attr(img3, "loading", "lazy");
			attr(a12, "href", "https://jaketrent.com/post/bower-resolutions/");
			attr(a12, "rel", "nofollow");
			attr(a13, "href", "#include-a-travis-ci-badge");
			attr(a13, "id", "include-a-travis-ci-badge");
			attr(source8, "type", "image/webp");
			attr(source8, "srcset", __build_img_webp__4);
			attr(source9, "type", "image/jpeg");
			attr(source9, "srcset", __build_img__4);
			attr(img4, "title", "null");
			attr(img4, "alt", "badge");
			attr(img4, "data-src", __build_img__4);
			attr(img4, "loading", "lazy");
			attr(source10, "type", "image/webp");
			attr(source10, "srcset", __build_img_webp__5);
			attr(source11, "type", "image/jpeg");
			attr(source11, "srcset", __build_img__5);
			attr(img5, "title", "null");
			attr(img5, "alt", "badge");
			attr(img5, "data-src", __build_img__5);
			attr(img5, "loading", "lazy");
		},
		m(target, anchor) {
			insert(target, section0, anchor);
			append(section0, ul);
			append(ul, li0);
			append(li0, a0);
			append(a0, t0);
			append(ul, li1);
			append(li1, a1);
			append(a1, t1);
			append(ul, li2);
			append(li2, a2);
			append(a2, t2);
			append(ul, li3);
			append(li3, a3);
			append(a3, t3);
			append(ul, li4);
			append(li4, a4);
			append(a4, t4);
			insert(target, t5, anchor);
			insert(target, section1, anchor);
			append(section1, h20);
			append(h20, a5);
			append(a5, t6);
			append(section1, t7);
			append(section1, blockquote0);
			append(blockquote0, p0);
			append(p0, strong0);
			append(strong0, a6);
			append(a6, t8);
			append(p0, t9);
			append(p0, strong1);
			append(strong1, t10);
			append(p0, t11);
			append(p0, a7);
			append(a7, t12);
			append(p0, t13);
			append(section1, t14);
			append(section1, p1);
			append(p1, t15);
			append(section1, t16);
			append(section1, p2);
			append(p2, t17);
			insert(target, t18, anchor);
			insert(target, section2, anchor);
			append(section2, h21);
			append(h21, a8);
			append(a8, t19);
			append(section2, t20);
			append(section2, p3);
			append(p3, t21);
			append(p3, a9);
			append(a9, t22);
			append(p3, t23);
			append(section2, t24);
			append(section2, p4);
			append(p4, t25);
			append(section2, t26);
			append(section2, p5);
			append(p5, picture0);
			append(picture0, source0);
			append(picture0, source1);
			append(picture0, img0);
			append(section2, t27);
			append(section2, p6);
			append(p6, t28);
			append(section2, t29);
			append(section2, p7);
			append(p7, t30);
			append(p7, code0);
			append(code0, t31);
			append(p7, t32);
			append(p7, em);
			append(em, t33);
			append(p7, t34);
			append(section2, t35);
			append(section2, p8);
			append(p8, t36);
			append(section2, t37);
			append(section2, p9);
			append(p9, picture1);
			append(picture1, source2);
			append(picture1, source3);
			append(picture1, img1);
			append(section2, t38);
			append(section2, p10);
			append(p10, t39);
			append(section2, t40);
			append(section2, p11);
			append(p11, t41);
			append(section2, t42);
			append(section2, p12);
			append(p12, t43);
			insert(target, t44, anchor);
			insert(target, section3, anchor);
			append(section3, h22);
			append(h22, a10);
			append(a10, t45);
			append(section3, t46);
			append(section3, p13);
			append(p13, t47);
			append(p13, code1);
			append(code1, t48);
			append(p13, t49);
			append(section3, t50);
			append(section3, p14);
			append(p14, t51);
			append(section3, t52);
			append(section3, p15);
			append(p15, strong2);
			append(strong2, t53);
			append(section3, t54);
			append(section3, pre0);
			pre0.innerHTML = raw0_value;
			append(section3, t55);
			append(section3, p16);
			append(p16, t56);
			append(section3, t57);
			append(section3, p17);
			append(p17, t58);
			append(section3, t59);
			append(section3, pre1);
			pre1.innerHTML = raw1_value;
			append(section3, t60);
			append(section3, p18);
			append(p18, t61);
			append(section3, t62);
			append(section3, blockquote1);
			append(blockquote1, p19);
			append(p19, t63);
			append(section3, t64);
			append(section3, p20);
			append(p20, t65);
			append(p20, code2);
			append(code2, t66);
			append(p20, t67);
			append(section3, t68);
			append(section3, p21);
			append(p21, picture2);
			append(picture2, source4);
			append(picture2, source5);
			append(picture2, img2);
			insert(target, t69, anchor);
			insert(target, section4, anchor);
			append(section4, h23);
			append(h23, a11);
			append(a11, t70);
			append(section4, t71);
			append(section4, p22);
			append(p22, t72);
			append(section4, t73);
			append(section4, pre2);
			pre2.innerHTML = raw2_value;
			append(section4, t74);
			append(section4, p23);
			append(p23, t75);
			append(section4, t76);
			append(section4, pre3);
			pre3.innerHTML = raw3_value;
			append(section4, t77);
			append(section4, p24);
			append(p24, t78);
			append(section4, t79);
			append(section4, p25);
			append(p25, picture3);
			append(picture3, source6);
			append(picture3, source7);
			append(picture3, img3);
			append(section4, t80);
			append(section4, blockquote2);
			append(blockquote2, p26);
			append(p26, t81);
			append(p26, a12);
			append(a12, t82);
			append(p26, t83);
			insert(target, t84, anchor);
			insert(target, section5, anchor);
			append(section5, h24);
			append(h24, a13);
			append(a13, t85);
			append(section5, t86);
			append(section5, p27);
			append(p27, t87);
			append(p27, code3);
			append(code3, t88);
			append(p27, t89);
			append(section5, t90);
			append(section5, p28);
			append(p28, t91);
			append(section5, t92);
			append(section5, p29);
			append(p29, t93);
			append(section5, t94);
			append(section5, p30);
			append(p30, picture4);
			append(picture4, source8);
			append(picture4, source9);
			append(picture4, img4);
			append(section5, t95);
			append(section5, p31);
			append(p31, t96);
			append(section5, t97);
			append(section5, p32);
			append(p32, t98);
			append(section5, t99);
			append(section5, p33);
			append(p33, t100);
			append(section5, t101);
			append(section5, p34);
			append(p34, picture5);
			append(picture5, source10);
			append(picture5, source11);
			append(picture5, img5);
		},
		p: noop,
		d(detaching) {
			if (detaching) detach(section0);
			if (detaching) detach(t5);
			if (detaching) detach(section1);
			if (detaching) detach(t18);
			if (detaching) detach(section2);
			if (detaching) detach(t44);
			if (detaching) detach(section3);
			if (detaching) detach(t69);
			if (detaching) detach(section4);
			if (detaching) detach(t84);
			if (detaching) detach(section5);
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

	layout_mdsvex_default = new Blog({ props: layout_mdsvex_default_props });

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
	"title": "5 Steps to build NodeJS using Travis CI",
	"date": "2016-04-13T08:00:00Z",
	"description": "Setting up Travis CI for your NodeJS Github repo!",
	"slug": "5-steps-to-build-nodejs-using-travis-ci",
	"type": "blog"
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
