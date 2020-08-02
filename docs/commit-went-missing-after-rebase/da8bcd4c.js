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

var __build_img_webp__7 = "f59a717175b39c06.webp";

var __build_img__7 = "f59a717175b39c06.png";

var __build_img_webp__6 = "c408c27be468ade1.webp";

var __build_img__6 = "c408c27be468ade1.png";

var __build_img_webp__5 = "0608659b1cbe3765.webp";

var __build_img__5 = "0608659b1cbe3765.png";

var __build_img_webp__4 = "9db4f31b31d918d6.webp";

var __build_img__4 = "9db4f31b31d918d6.png";

var __build_img_webp__3 = "ad143013f3fe6bea.webp";

var __build_img__3 = "ad143013f3fe6bea.png";

var __build_img_webp__2 = "a5247ecfc8849061.webp";

var __build_img__2 = "a5247ecfc8849061.png";

var __build_img_webp__1 = "8d472d36809b9042.webp";

var __build_img__1 = "8d472d36809b9042.png";

var __build_img_webp__0 = "6b6ec60eeb00814a.webp";

var __build_img__0 = "6b6ec60eeb00814a.png";

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
			svg0 = claim_element(a6_nodes, "svg", { viewBox: true, class: true }, 1);
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
			svg1 = claim_element(a7_nodes, "svg", { viewBox: true, class: true }, 1);
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
			attr(svg0, "class", "svelte-f3e4uo");
			attr(a6, "aria-label", "Twitter account");
			attr(a6, "href", "https://twitter.com/lihautan");
			attr(a6, "class", "svelte-f3e4uo");
			attr(path1, "d", "M9 19c-5 1.5-5-2.5-7-3m14 6v-3.87a3.37 3.37 0 0\n    0-.94-2.61c3.14-.35 6.44-1.54 6.44-7A5.44 5.44 0 0 0 20 4.77 5.07\n    5.07 0 0 0 19.91 1S18.73.65 16 2.48a13.38 13.38 0 0 0-7 0C6.27.65\n    5.09 1 5.09 1A5.07 5.07 0 0 0 5 4.77a5.44 5.44 0 0 0-1.5 3.78c0 5.42\n    3.3 6.61 6.44 7A3.37 3.37 0 0 0 9 18.13V22");
			attr(svg1, "viewBox", "0 0 24 24");
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
			attr(span, "class", "svelte-2w4dum");
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
				"position": 1
			},
			{
				"@type": "ListItem",
				"item": {
					"@id": "https%3A%2F%2Flihautan.com%2Fcommit-went-missing-after-rebase",
					"name": /*title*/ ctx[0]
				},
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
	let t9;
	let html_tag_2;
	let raw2_value = "<script async src=\"https://platform.twitter.com/widgets.js\" charset=\"utf-8\"></script>" + "";
	let html_anchor_2;
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
			t9 = space();
			html_anchor_2 = empty();
			this.h();
		},
		l(nodes) {
			const head_nodes = query_selector_all("[data-svelte=\"svelte-n0q11s\"]", document.head);
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
			t9 = claim_space(nodes);
			html_anchor_2 = empty();
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
			attr(meta11, "content", "https%3A%2F%2Flihautan.com%2Fcommit-went-missing-after-rebase");
			attr(meta12, "itemprop", "image");
			attr(meta12, "content", image);
			html_tag = new HtmlTag(html_anchor);
			html_tag_1 = new HtmlTag(html_anchor_1);
			attr(a, "href", "#content");
			attr(a, "class", "skip svelte-2w4dum");
			attr(main, "id", "content");
			attr(main, "class", "blog svelte-2w4dum");
			attr(footer, "class", "svelte-2w4dum");
			html_tag_2 = new HtmlTag(html_anchor_2);
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
			insert(target, t9, anchor);
			html_tag_2.m(raw2_value, target, anchor);
			insert(target, html_anchor_2, anchor);
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
						"position": 1
					},
					{
						"@type": "ListItem",
						"item": {
							"@id": "https%3A%2F%2Flihautan.com%2Fcommit-went-missing-after-rebase",
							"name": /*title*/ ctx[0]
						},
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
			if (detaching) detach(t9);
			if (detaching) detach(html_anchor_2);
			if (detaching) html_tag_2.d();
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

/* content/blog/commit-went-missing-after-rebase/@@page-markup.svelte generated by Svelte v3.24.0 */

function create_default_slot(ctx) {
	let section0;
	let ul0;
	let li0;
	let a0;
	let t0;
	let t1;
	let p0;
	let t2;
	let a1;
	let t3;
	let t4;
	let a2;
	let t5;
	let t6;
	let code0;
	let t7;
	let t8;
	let t9;
	let p1;
	let t10;
	let t11;
	let p2;
	let t12;
	let t13;
	let blockquote0;
	let p3;
	let t14;
	let code1;
	let t15;
	let t16;
	let code2;
	let t17;
	let t18;
	let code3;
	let t19;
	let t20;
	let code4;
	let t21;
	let t22;
	let t23;
	let p4;
	let t24;
	let code5;
	let t25;
	let t26;
	let code6;
	let t27;
	let t28;
	let t29;
	let p5;
	let t30;
	let code7;
	let t31;
	let t32;
	let code8;
	let t33;
	let t34;
	let code9;
	let t35;
	let t36;
	let code10;
	let t37;
	let t38;
	let t39;
	let p6;
	let t40;
	let code11;
	let t41;
	let t42;
	let code12;
	let t43;
	let t44;
	let code13;
	let t45;
	let t46;
	let t47;
	let p7;
	let t48;
	let code14;
	let t49;
	let t50;
	let code15;
	let t51;
	let t52;
	let code16;
	let t53;
	let t54;
	let code17;
	let t55;
	let t56;
	let code18;
	let t57;
	let t58;
	let code19;
	let t59;
	let t60;
	let t61;
	let p8;
	let t62;
	let t63;
	let p9;
	let picture0;
	let source0;
	let source1;
	let img0;
	let img0_src_value;
	let t64;
	let p10;
	let t65;
	let code20;
	let t66;
	let t67;
	let code21;
	let t68;
	let t69;
	let code22;
	let t70;
	let t71;
	let t72;
	let p11;
	let picture1;
	let source2;
	let source3;
	let img1;
	let img1_src_value;
	let t73;
	let p12;
	let t74;
	let t75;
	let p13;
	let t76;
	let code23;
	let t77;
	let t78;
	let code24;
	let t79;
	let t80;
	let t81;
	let pre0;

	let raw0_value = `
<code class="language-">$ git checkout feat/a
$ git rebase origin/feat/a</code>` + "";

	let t82;
	let p14;
	let t83;
	let code25;
	let t84;
	let t85;
	let t86;
	let p15;
	let picture2;
	let source4;
	let source5;
	let img2;
	let img2_src_value;
	let t87;
	let p16;
	let t88;
	let t89;
	let pre1;

	let raw1_value = `
<code class="language-">$ git rebase origin/feat/a</code>` + "";

	let t90;
	let p17;
	let t91;
	let t92;
	let pre2;

	let raw2_value = `
<code class="language-">$ git rebase --onto origin/feat/a origin/feat/a feat/a</code>` + "";

	let t93;
	let ul1;
	let li1;
	let code26;
	let t94;
	let t95;
	let code27;
	let t96;
	let t97;
	let li2;
	let code28;
	let t98;
	let t99;
	let code29;
	let t100;
	let t101;
	let li3;
	let code30;
	let t102;
	let t103;
	let code31;
	let t104;
	let t105;
	let p18;
	let t106;
	let code32;
	let t107;
	let t108;
	let code33;
	let t109;
	let t110;
	let code34;
	let t111;
	let t112;
	let t113;
	let p19;
	let picture3;
	let source6;
	let source7;
	let img3;
	let img3_src_value;
	let t114;
	let p20;
	let t115;
	let code35;
	let t116;
	let t117;
	let code36;
	let t118;
	let t119;
	let t120;
	let p21;
	let picture4;
	let source8;
	let source9;
	let img4;
	let img4_src_value;
	let t121;
	let p22;
	let t122;
	let code37;
	let t123;
	let t124;
	let code38;
	let t125;
	let t126;
	let code39;
	let t127;
	let t128;
	let code40;
	let t129;
	let t130;
	let code41;
	let t131;
	let t132;
	let code42;
	let t133;
	let t134;
	let t135;
	let blockquote1;
	let p23;
	let t136;
	let a3;
	let t137;
	let t138;
	let p24;
	let t139;
	let code43;
	let t140;
	let t141;
	let code44;
	let t142;
	let t143;
	let code45;
	let t144;
	let t145;
	let t146;
	let p25;
	let picture5;
	let source10;
	let source11;
	let img5;
	let img5_src_value;
	let t147;
	let p26;
	let t148;
	let code46;
	let t149;
	let t150;
	let t151;
	let p27;
	let picture6;
	let source12;
	let source13;
	let img6;
	let img6_src_value;
	let t152;
	let pre3;

	let raw3_value = `
<code class="language-">$ git rebase --onto origin/feat/a master feat/a</code>` + "";

	let t153;
	let p28;
	let t154;
	let t155;
	let p29;
	let picture7;
	let source14;
	let source15;
	let img7;
	let img7_src_value;
	let t156;
	let p30;
	let t157;
	let code47;
	let t158;
	let t159;
	let code48;
	let t160;
	let t161;
	let t162;
	let section1;
	let h2;
	let a4;
	let t163;
	let t164;
	let p31;
	let t165;
	let code49;
	let t166;
	let t167;
	let code50;
	let t168;
	let t169;
	let code51;
	let t170;
	let t171;
	let code52;
	let t172;
	let t173;

	return {
		c() {
			section0 = element("section");
			ul0 = element("ul");
			li0 = element("li");
			a0 = element("a");
			t0 = text("Summary");
			t1 = space();
			p0 = element("p");
			t2 = text("Last week, I ");
			a1 = element("a");
			t3 = text("shared about git commands");
			t4 = text(" at ");
			a2 = element("a");
			t5 = text("Shopee React Knowledgeable");
			t6 = text(". At the end of the talk, one of my colleague approached me and asked me about git rebase. She somehow ended up with a messed up git history with ");
			code0 = element("code");
			t7 = text("git rebase");
			t8 = text(", and she couldn't comprehend how she ended up there.");
			t9 = space();
			p1 = element("p");
			t10 = text("I found that her scenario was interesting, and decided to write it out here.");
			t11 = space();
			p2 = element("p");
			t12 = text("This was what she told me:");
			t13 = space();
			blockquote0 = element("blockquote");
			p3 = element("p");
			t14 = text("I branched out ");
			code1 = element("code");
			t15 = text("feat/a");
			t16 = text(" branch from ");
			code2 = element("code");
			t17 = text("master");
			t18 = text(" and made a few commits (");
			code3 = element("code");
			t19 = text("commit #1");
			t20 = text(", ");
			code4 = element("code");
			t21 = text("commit #2");
			t22 = text(").");
			t23 = space();
			p4 = element("p");
			t24 = text("I noticed that master branch has new commits, so I pulled ");
			code5 = element("code");
			t25 = text("master");
			t26 = text(" branch, and rebased my branch ");
			code6 = element("code");
			t27 = text("feat/a");
			t28 = text(" onto master branch.");
			t29 = space();
			p5 = element("p");
			t30 = text("Then, instead of ");
			code7 = element("code");
			t31 = text("git push --force");
			t32 = text(" my local ");
			code8 = element("code");
			t33 = text("feat/a");
			t34 = text(" to remote ");
			code9 = element("code");
			t35 = text("origin");
			t36 = text(", I ");
			code10 = element("code");
			t37 = text("git pull --rebase origin feat/a");
			t38 = text(".");
			t39 = space();
			p6 = element("p");
			t40 = text("And, my commits on ");
			code11 = element("code");
			t41 = text("feat/a");
			t42 = text(", eg ");
			code12 = element("code");
			t43 = text("commit #1");
			t44 = text(", ");
			code13 = element("code");
			t45 = text("commit #2");
			t46 = text(" were gone!");
			t47 = space();
			p7 = element("p");
			t48 = text("So, we expected to see ");
			code14 = element("code");
			t49 = text("commit #1");
			t50 = text(", ");
			code15 = element("code");
			t51 = text("commit #2");
			t52 = text(" at ");
			code16 = element("code");
			t53 = text("HEAD");
			t54 = text(" after rebasing onto ");
			code17 = element("code");
			t55 = text("origin/feat/a");
			t56 = text(" after the ");
			code18 = element("code");
			t57 = text("git pull --rebase");
			t58 = text(", yet, the only commits we saw were a bunch of commits from the ");
			code19 = element("code");
			t59 = text("master");
			t60 = text(" branch.");
			t61 = space();
			p8 = element("p");
			t62 = text("To understand what happened, I decided to draw diagrams to visualize what had happened:");
			t63 = space();
			p9 = element("p");
			picture0 = element("picture");
			source0 = element("source");
			source1 = element("source");
			img0 = element("img");
			t64 = space();
			p10 = element("p");
			t65 = text("So, the first thing she did was to ");
			code20 = element("code");
			t66 = text("git rebase");
			t67 = space();
			code21 = element("code");
			t68 = text("feat/a");
			t69 = text(" on top of ");
			code22 = element("code");
			t70 = text("master");
			t71 = text(":");
			t72 = space();
			p11 = element("p");
			picture1 = element("picture");
			source2 = element("source");
			source3 = element("source");
			img1 = element("img");
			t73 = space();
			p12 = element("p");
			t74 = text("So far, everything looked normal. The next command was the tricky one.");
			t75 = space();
			p13 = element("p");
			t76 = text("She rebased ");
			code23 = element("code");
			t77 = text("feat/a");
			t78 = text(" on top of ");
			code24 = element("code");
			t79 = text("origin/feat/a");
			t80 = text(", she ran:");
			t81 = space();
			pre0 = element("pre");
			t82 = space();
			p14 = element("p");
			t83 = text("The most important thing on ");
			code25 = element("code");
			t84 = text("git rebase");
			t85 = text(" is the 3 reference points of rebasing:");
			t86 = space();
			p15 = element("p");
			picture2 = element("picture");
			source4 = element("source");
			source5 = element("source");
			img2 = element("img");
			t87 = space();
			p16 = element("p");
			t88 = text("So, when she typed");
			t89 = space();
			pre1 = element("pre");
			t90 = space();
			p17 = element("p");
			t91 = text(", it meant:");
			t92 = space();
			pre2 = element("pre");
			t93 = space();
			ul1 = element("ul");
			li1 = element("li");
			code26 = element("code");
			t94 = text("new base");
			t95 = text(": ");
			code27 = element("code");
			t96 = text("origin/feat/a");
			t97 = space();
			li2 = element("li");
			code28 = element("code");
			t98 = text("upstream");
			t99 = text(": ");
			code29 = element("code");
			t100 = text("origin/feat/a");
			t101 = space();
			li3 = element("li");
			code30 = element("code");
			t102 = text("branch");
			t103 = text(": ");
			code31 = element("code");
			t104 = text("feat/a");
			t105 = space();
			p18 = element("p");
			t106 = text("So what happened was all the commits in master after branching out ");
			code32 = element("code");
			t107 = text("feat/a");
			t108 = text(" all the way to the newly rebased commits in ");
			code33 = element("code");
			t109 = text("feat/a");
			t110 = text(" were rebased onto ");
			code34 = element("code");
			t111 = text("origin/feat/a");
			t112 = text(":");
			t113 = space();
			p19 = element("p");
			picture3 = element("picture");
			source6 = element("source");
			source7 = element("source");
			img3 = element("img");
			t114 = space();
			p20 = element("p");
			t115 = text("However, if you look at the history right now, the commit ");
			code35 = element("code");
			t116 = text("commit #1");
			t117 = text(" and ");
			code36 = element("code");
			t118 = text("commit #2");
			t119 = text(" was written twice, first the original commit, second the rebased commit. In cases like this, git would not rewrote the commits again, if git could figure out whether it was a duplicate:");
			t120 = space();
			p21 = element("p");
			picture4 = element("picture");
			source8 = element("source");
			source9 = element("source");
			img4 = element("img");
			t121 = space();
			p22 = element("p");
			t122 = text("It was as though both commit ");
			code37 = element("code");
			t123 = text("commit #1");
			t124 = text(" and ");
			code38 = element("code");
			t125 = text("commit #2");
			t126 = text(" were gone, and left with commits from ");
			code39 = element("code");
			t127 = text("master");
			t128 = text(" branch, because git did not rewrote them when rebasing ");
			code40 = element("code");
			t129 = text("feat/a");
			t130 = text(". And actually the changes made in ");
			code41 = element("code");
			t131 = text("commit #1");
			t132 = text(" and ");
			code42 = element("code");
			t133 = text("commit #2");
			t134 = text(" were still available.");
			t135 = space();
			blockquote1 = element("blockquote");
			p23 = element("p");
			t136 = text("You can read more about this behaviour in ");
			a3 = element("a");
			t137 = text("git's documentation");
			t138 = space();
			p24 = element("p");
			t139 = text("So, what she should have done if she wanted to actually rebased the local ");
			code43 = element("code");
			t140 = text("feat/a");
			t141 = text(" on top of ");
			code44 = element("code");
			t142 = text("origin/feat/a");
			t143 = text(", especially after she made another commit, ");
			code45 = element("code");
			t144 = text("commit #0");
			t145 = text("?");
			t146 = space();
			p25 = element("p");
			picture5 = element("picture");
			source10 = element("source");
			source11 = element("source");
			img5 = element("img");
			t147 = space();
			p26 = element("p");
			t148 = text("Well, she should specify the ");
			code46 = element("code");
			t149 = text("<upstream>");
			t150 = text(" reference point:");
			t151 = space();
			p27 = element("p");
			picture6 = element("picture");
			source12 = element("source");
			source13 = element("source");
			img6 = element("img");
			t152 = space();
			pre3 = element("pre");
			t153 = space();
			p28 = element("p");
			t154 = text("And you would get:");
			t155 = space();
			p29 = element("p");
			picture7 = element("picture");
			source14 = element("source");
			source15 = element("source");
			img7 = element("img");
			t156 = space();
			p30 = element("p");
			t157 = text("Here again, git is smart enough not to rewrite ");
			code47 = element("code");
			t158 = text("commit #1");
			t159 = text(" and ");
			code48 = element("code");
			t160 = text("commit #2");
			t161 = text(".");
			t162 = space();
			section1 = element("section");
			h2 = element("h2");
			a4 = element("a");
			t163 = text("Summary");
			t164 = space();
			p31 = element("p");
			t165 = text("When using ");
			code49 = element("code");
			t166 = text("git rebase");
			t167 = text(", always remember the 3 reference points of rebase, the ");
			code50 = element("code");
			t168 = text("new base");
			t169 = text(", ");
			code51 = element("code");
			t170 = text("upstream");
			t171 = text(" and ");
			code52 = element("code");
			t172 = text("branch");
			t173 = text(".");
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
			t0 = claim_text(a0_nodes, "Summary");
			a0_nodes.forEach(detach);
			li0_nodes.forEach(detach);
			ul0_nodes.forEach(detach);
			section0_nodes.forEach(detach);
			t1 = claim_space(nodes);
			p0 = claim_element(nodes, "P", {});
			var p0_nodes = children(p0);
			t2 = claim_text(p0_nodes, "Last week, I ");
			a1 = claim_element(p0_nodes, "A", { href: true });
			var a1_nodes = children(a1);
			t3 = claim_text(a1_nodes, "shared about git commands");
			a1_nodes.forEach(detach);
			t4 = claim_text(p0_nodes, " at ");
			a2 = claim_element(p0_nodes, "A", { href: true, rel: true });
			var a2_nodes = children(a2);
			t5 = claim_text(a2_nodes, "Shopee React Knowledgeable");
			a2_nodes.forEach(detach);
			t6 = claim_text(p0_nodes, ". At the end of the talk, one of my colleague approached me and asked me about git rebase. She somehow ended up with a messed up git history with ");
			code0 = claim_element(p0_nodes, "CODE", {});
			var code0_nodes = children(code0);
			t7 = claim_text(code0_nodes, "git rebase");
			code0_nodes.forEach(detach);
			t8 = claim_text(p0_nodes, ", and she couldn't comprehend how she ended up there.");
			p0_nodes.forEach(detach);
			t9 = claim_space(nodes);
			p1 = claim_element(nodes, "P", {});
			var p1_nodes = children(p1);
			t10 = claim_text(p1_nodes, "I found that her scenario was interesting, and decided to write it out here.");
			p1_nodes.forEach(detach);
			t11 = claim_space(nodes);
			p2 = claim_element(nodes, "P", {});
			var p2_nodes = children(p2);
			t12 = claim_text(p2_nodes, "This was what she told me:");
			p2_nodes.forEach(detach);
			t13 = claim_space(nodes);
			blockquote0 = claim_element(nodes, "BLOCKQUOTE", {});
			var blockquote0_nodes = children(blockquote0);
			p3 = claim_element(blockquote0_nodes, "P", {});
			var p3_nodes = children(p3);
			t14 = claim_text(p3_nodes, "I branched out ");
			code1 = claim_element(p3_nodes, "CODE", {});
			var code1_nodes = children(code1);
			t15 = claim_text(code1_nodes, "feat/a");
			code1_nodes.forEach(detach);
			t16 = claim_text(p3_nodes, " branch from ");
			code2 = claim_element(p3_nodes, "CODE", {});
			var code2_nodes = children(code2);
			t17 = claim_text(code2_nodes, "master");
			code2_nodes.forEach(detach);
			t18 = claim_text(p3_nodes, " and made a few commits (");
			code3 = claim_element(p3_nodes, "CODE", {});
			var code3_nodes = children(code3);
			t19 = claim_text(code3_nodes, "commit #1");
			code3_nodes.forEach(detach);
			t20 = claim_text(p3_nodes, ", ");
			code4 = claim_element(p3_nodes, "CODE", {});
			var code4_nodes = children(code4);
			t21 = claim_text(code4_nodes, "commit #2");
			code4_nodes.forEach(detach);
			t22 = claim_text(p3_nodes, ").");
			p3_nodes.forEach(detach);
			t23 = claim_space(blockquote0_nodes);
			p4 = claim_element(blockquote0_nodes, "P", {});
			var p4_nodes = children(p4);
			t24 = claim_text(p4_nodes, "I noticed that master branch has new commits, so I pulled ");
			code5 = claim_element(p4_nodes, "CODE", {});
			var code5_nodes = children(code5);
			t25 = claim_text(code5_nodes, "master");
			code5_nodes.forEach(detach);
			t26 = claim_text(p4_nodes, " branch, and rebased my branch ");
			code6 = claim_element(p4_nodes, "CODE", {});
			var code6_nodes = children(code6);
			t27 = claim_text(code6_nodes, "feat/a");
			code6_nodes.forEach(detach);
			t28 = claim_text(p4_nodes, " onto master branch.");
			p4_nodes.forEach(detach);
			t29 = claim_space(blockquote0_nodes);
			p5 = claim_element(blockquote0_nodes, "P", {});
			var p5_nodes = children(p5);
			t30 = claim_text(p5_nodes, "Then, instead of ");
			code7 = claim_element(p5_nodes, "CODE", {});
			var code7_nodes = children(code7);
			t31 = claim_text(code7_nodes, "git push --force");
			code7_nodes.forEach(detach);
			t32 = claim_text(p5_nodes, " my local ");
			code8 = claim_element(p5_nodes, "CODE", {});
			var code8_nodes = children(code8);
			t33 = claim_text(code8_nodes, "feat/a");
			code8_nodes.forEach(detach);
			t34 = claim_text(p5_nodes, " to remote ");
			code9 = claim_element(p5_nodes, "CODE", {});
			var code9_nodes = children(code9);
			t35 = claim_text(code9_nodes, "origin");
			code9_nodes.forEach(detach);
			t36 = claim_text(p5_nodes, ", I ");
			code10 = claim_element(p5_nodes, "CODE", {});
			var code10_nodes = children(code10);
			t37 = claim_text(code10_nodes, "git pull --rebase origin feat/a");
			code10_nodes.forEach(detach);
			t38 = claim_text(p5_nodes, ".");
			p5_nodes.forEach(detach);
			t39 = claim_space(blockquote0_nodes);
			p6 = claim_element(blockquote0_nodes, "P", {});
			var p6_nodes = children(p6);
			t40 = claim_text(p6_nodes, "And, my commits on ");
			code11 = claim_element(p6_nodes, "CODE", {});
			var code11_nodes = children(code11);
			t41 = claim_text(code11_nodes, "feat/a");
			code11_nodes.forEach(detach);
			t42 = claim_text(p6_nodes, ", eg ");
			code12 = claim_element(p6_nodes, "CODE", {});
			var code12_nodes = children(code12);
			t43 = claim_text(code12_nodes, "commit #1");
			code12_nodes.forEach(detach);
			t44 = claim_text(p6_nodes, ", ");
			code13 = claim_element(p6_nodes, "CODE", {});
			var code13_nodes = children(code13);
			t45 = claim_text(code13_nodes, "commit #2");
			code13_nodes.forEach(detach);
			t46 = claim_text(p6_nodes, " were gone!");
			p6_nodes.forEach(detach);
			blockquote0_nodes.forEach(detach);
			t47 = claim_space(nodes);
			p7 = claim_element(nodes, "P", {});
			var p7_nodes = children(p7);
			t48 = claim_text(p7_nodes, "So, we expected to see ");
			code14 = claim_element(p7_nodes, "CODE", {});
			var code14_nodes = children(code14);
			t49 = claim_text(code14_nodes, "commit #1");
			code14_nodes.forEach(detach);
			t50 = claim_text(p7_nodes, ", ");
			code15 = claim_element(p7_nodes, "CODE", {});
			var code15_nodes = children(code15);
			t51 = claim_text(code15_nodes, "commit #2");
			code15_nodes.forEach(detach);
			t52 = claim_text(p7_nodes, " at ");
			code16 = claim_element(p7_nodes, "CODE", {});
			var code16_nodes = children(code16);
			t53 = claim_text(code16_nodes, "HEAD");
			code16_nodes.forEach(detach);
			t54 = claim_text(p7_nodes, " after rebasing onto ");
			code17 = claim_element(p7_nodes, "CODE", {});
			var code17_nodes = children(code17);
			t55 = claim_text(code17_nodes, "origin/feat/a");
			code17_nodes.forEach(detach);
			t56 = claim_text(p7_nodes, " after the ");
			code18 = claim_element(p7_nodes, "CODE", {});
			var code18_nodes = children(code18);
			t57 = claim_text(code18_nodes, "git pull --rebase");
			code18_nodes.forEach(detach);
			t58 = claim_text(p7_nodes, ", yet, the only commits we saw were a bunch of commits from the ");
			code19 = claim_element(p7_nodes, "CODE", {});
			var code19_nodes = children(code19);
			t59 = claim_text(code19_nodes, "master");
			code19_nodes.forEach(detach);
			t60 = claim_text(p7_nodes, " branch.");
			p7_nodes.forEach(detach);
			t61 = claim_space(nodes);
			p8 = claim_element(nodes, "P", {});
			var p8_nodes = children(p8);
			t62 = claim_text(p8_nodes, "To understand what happened, I decided to draw diagrams to visualize what had happened:");
			p8_nodes.forEach(detach);
			t63 = claim_space(nodes);
			p9 = claim_element(nodes, "P", {});
			var p9_nodes = children(p9);
			picture0 = claim_element(p9_nodes, "PICTURE", {});
			var picture0_nodes = children(picture0);
			source0 = claim_element(picture0_nodes, "SOURCE", { type: true, srcset: true });
			source1 = claim_element(picture0_nodes, "SOURCE", { type: true, srcset: true });
			img0 = claim_element(picture0_nodes, "IMG", { alt: true, src: true });
			picture0_nodes.forEach(detach);
			p9_nodes.forEach(detach);
			t64 = claim_space(nodes);
			p10 = claim_element(nodes, "P", {});
			var p10_nodes = children(p10);
			t65 = claim_text(p10_nodes, "So, the first thing she did was to ");
			code20 = claim_element(p10_nodes, "CODE", {});
			var code20_nodes = children(code20);
			t66 = claim_text(code20_nodes, "git rebase");
			code20_nodes.forEach(detach);
			t67 = claim_space(p10_nodes);
			code21 = claim_element(p10_nodes, "CODE", {});
			var code21_nodes = children(code21);
			t68 = claim_text(code21_nodes, "feat/a");
			code21_nodes.forEach(detach);
			t69 = claim_text(p10_nodes, " on top of ");
			code22 = claim_element(p10_nodes, "CODE", {});
			var code22_nodes = children(code22);
			t70 = claim_text(code22_nodes, "master");
			code22_nodes.forEach(detach);
			t71 = claim_text(p10_nodes, ":");
			p10_nodes.forEach(detach);
			t72 = claim_space(nodes);
			p11 = claim_element(nodes, "P", {});
			var p11_nodes = children(p11);
			picture1 = claim_element(p11_nodes, "PICTURE", {});
			var picture1_nodes = children(picture1);
			source2 = claim_element(picture1_nodes, "SOURCE", { type: true, srcset: true });
			source3 = claim_element(picture1_nodes, "SOURCE", { type: true, srcset: true });
			img1 = claim_element(picture1_nodes, "IMG", { alt: true, src: true });
			picture1_nodes.forEach(detach);
			p11_nodes.forEach(detach);
			t73 = claim_space(nodes);
			p12 = claim_element(nodes, "P", {});
			var p12_nodes = children(p12);
			t74 = claim_text(p12_nodes, "So far, everything looked normal. The next command was the tricky one.");
			p12_nodes.forEach(detach);
			t75 = claim_space(nodes);
			p13 = claim_element(nodes, "P", {});
			var p13_nodes = children(p13);
			t76 = claim_text(p13_nodes, "She rebased ");
			code23 = claim_element(p13_nodes, "CODE", {});
			var code23_nodes = children(code23);
			t77 = claim_text(code23_nodes, "feat/a");
			code23_nodes.forEach(detach);
			t78 = claim_text(p13_nodes, " on top of ");
			code24 = claim_element(p13_nodes, "CODE", {});
			var code24_nodes = children(code24);
			t79 = claim_text(code24_nodes, "origin/feat/a");
			code24_nodes.forEach(detach);
			t80 = claim_text(p13_nodes, ", she ran:");
			p13_nodes.forEach(detach);
			t81 = claim_space(nodes);
			pre0 = claim_element(nodes, "PRE", { class: true });
			var pre0_nodes = children(pre0);
			pre0_nodes.forEach(detach);
			t82 = claim_space(nodes);
			p14 = claim_element(nodes, "P", {});
			var p14_nodes = children(p14);
			t83 = claim_text(p14_nodes, "The most important thing on ");
			code25 = claim_element(p14_nodes, "CODE", {});
			var code25_nodes = children(code25);
			t84 = claim_text(code25_nodes, "git rebase");
			code25_nodes.forEach(detach);
			t85 = claim_text(p14_nodes, " is the 3 reference points of rebasing:");
			p14_nodes.forEach(detach);
			t86 = claim_space(nodes);
			p15 = claim_element(nodes, "P", {});
			var p15_nodes = children(p15);
			picture2 = claim_element(p15_nodes, "PICTURE", {});
			var picture2_nodes = children(picture2);
			source4 = claim_element(picture2_nodes, "SOURCE", { type: true, srcset: true });
			source5 = claim_element(picture2_nodes, "SOURCE", { type: true, srcset: true });
			img2 = claim_element(picture2_nodes, "IMG", { alt: true, src: true });
			picture2_nodes.forEach(detach);
			p15_nodes.forEach(detach);
			t87 = claim_space(nodes);
			p16 = claim_element(nodes, "P", {});
			var p16_nodes = children(p16);
			t88 = claim_text(p16_nodes, "So, when she typed");
			p16_nodes.forEach(detach);
			t89 = claim_space(nodes);
			pre1 = claim_element(nodes, "PRE", { class: true });
			var pre1_nodes = children(pre1);
			pre1_nodes.forEach(detach);
			t90 = claim_space(nodes);
			p17 = claim_element(nodes, "P", {});
			var p17_nodes = children(p17);
			t91 = claim_text(p17_nodes, ", it meant:");
			p17_nodes.forEach(detach);
			t92 = claim_space(nodes);
			pre2 = claim_element(nodes, "PRE", { class: true });
			var pre2_nodes = children(pre2);
			pre2_nodes.forEach(detach);
			t93 = claim_space(nodes);
			ul1 = claim_element(nodes, "UL", {});
			var ul1_nodes = children(ul1);
			li1 = claim_element(ul1_nodes, "LI", {});
			var li1_nodes = children(li1);
			code26 = claim_element(li1_nodes, "CODE", {});
			var code26_nodes = children(code26);
			t94 = claim_text(code26_nodes, "new base");
			code26_nodes.forEach(detach);
			t95 = claim_text(li1_nodes, ": ");
			code27 = claim_element(li1_nodes, "CODE", {});
			var code27_nodes = children(code27);
			t96 = claim_text(code27_nodes, "origin/feat/a");
			code27_nodes.forEach(detach);
			li1_nodes.forEach(detach);
			t97 = claim_space(ul1_nodes);
			li2 = claim_element(ul1_nodes, "LI", {});
			var li2_nodes = children(li2);
			code28 = claim_element(li2_nodes, "CODE", {});
			var code28_nodes = children(code28);
			t98 = claim_text(code28_nodes, "upstream");
			code28_nodes.forEach(detach);
			t99 = claim_text(li2_nodes, ": ");
			code29 = claim_element(li2_nodes, "CODE", {});
			var code29_nodes = children(code29);
			t100 = claim_text(code29_nodes, "origin/feat/a");
			code29_nodes.forEach(detach);
			li2_nodes.forEach(detach);
			t101 = claim_space(ul1_nodes);
			li3 = claim_element(ul1_nodes, "LI", {});
			var li3_nodes = children(li3);
			code30 = claim_element(li3_nodes, "CODE", {});
			var code30_nodes = children(code30);
			t102 = claim_text(code30_nodes, "branch");
			code30_nodes.forEach(detach);
			t103 = claim_text(li3_nodes, ": ");
			code31 = claim_element(li3_nodes, "CODE", {});
			var code31_nodes = children(code31);
			t104 = claim_text(code31_nodes, "feat/a");
			code31_nodes.forEach(detach);
			li3_nodes.forEach(detach);
			ul1_nodes.forEach(detach);
			t105 = claim_space(nodes);
			p18 = claim_element(nodes, "P", {});
			var p18_nodes = children(p18);
			t106 = claim_text(p18_nodes, "So what happened was all the commits in master after branching out ");
			code32 = claim_element(p18_nodes, "CODE", {});
			var code32_nodes = children(code32);
			t107 = claim_text(code32_nodes, "feat/a");
			code32_nodes.forEach(detach);
			t108 = claim_text(p18_nodes, " all the way to the newly rebased commits in ");
			code33 = claim_element(p18_nodes, "CODE", {});
			var code33_nodes = children(code33);
			t109 = claim_text(code33_nodes, "feat/a");
			code33_nodes.forEach(detach);
			t110 = claim_text(p18_nodes, " were rebased onto ");
			code34 = claim_element(p18_nodes, "CODE", {});
			var code34_nodes = children(code34);
			t111 = claim_text(code34_nodes, "origin/feat/a");
			code34_nodes.forEach(detach);
			t112 = claim_text(p18_nodes, ":");
			p18_nodes.forEach(detach);
			t113 = claim_space(nodes);
			p19 = claim_element(nodes, "P", {});
			var p19_nodes = children(p19);
			picture3 = claim_element(p19_nodes, "PICTURE", {});
			var picture3_nodes = children(picture3);
			source6 = claim_element(picture3_nodes, "SOURCE", { type: true, srcset: true });
			source7 = claim_element(picture3_nodes, "SOURCE", { type: true, srcset: true });
			img3 = claim_element(picture3_nodes, "IMG", { alt: true, src: true });
			picture3_nodes.forEach(detach);
			p19_nodes.forEach(detach);
			t114 = claim_space(nodes);
			p20 = claim_element(nodes, "P", {});
			var p20_nodes = children(p20);
			t115 = claim_text(p20_nodes, "However, if you look at the history right now, the commit ");
			code35 = claim_element(p20_nodes, "CODE", {});
			var code35_nodes = children(code35);
			t116 = claim_text(code35_nodes, "commit #1");
			code35_nodes.forEach(detach);
			t117 = claim_text(p20_nodes, " and ");
			code36 = claim_element(p20_nodes, "CODE", {});
			var code36_nodes = children(code36);
			t118 = claim_text(code36_nodes, "commit #2");
			code36_nodes.forEach(detach);
			t119 = claim_text(p20_nodes, " was written twice, first the original commit, second the rebased commit. In cases like this, git would not rewrote the commits again, if git could figure out whether it was a duplicate:");
			p20_nodes.forEach(detach);
			t120 = claim_space(nodes);
			p21 = claim_element(nodes, "P", {});
			var p21_nodes = children(p21);
			picture4 = claim_element(p21_nodes, "PICTURE", {});
			var picture4_nodes = children(picture4);
			source8 = claim_element(picture4_nodes, "SOURCE", { type: true, srcset: true });
			source9 = claim_element(picture4_nodes, "SOURCE", { type: true, srcset: true });
			img4 = claim_element(picture4_nodes, "IMG", { alt: true, src: true });
			picture4_nodes.forEach(detach);
			p21_nodes.forEach(detach);
			t121 = claim_space(nodes);
			p22 = claim_element(nodes, "P", {});
			var p22_nodes = children(p22);
			t122 = claim_text(p22_nodes, "It was as though both commit ");
			code37 = claim_element(p22_nodes, "CODE", {});
			var code37_nodes = children(code37);
			t123 = claim_text(code37_nodes, "commit #1");
			code37_nodes.forEach(detach);
			t124 = claim_text(p22_nodes, " and ");
			code38 = claim_element(p22_nodes, "CODE", {});
			var code38_nodes = children(code38);
			t125 = claim_text(code38_nodes, "commit #2");
			code38_nodes.forEach(detach);
			t126 = claim_text(p22_nodes, " were gone, and left with commits from ");
			code39 = claim_element(p22_nodes, "CODE", {});
			var code39_nodes = children(code39);
			t127 = claim_text(code39_nodes, "master");
			code39_nodes.forEach(detach);
			t128 = claim_text(p22_nodes, " branch, because git did not rewrote them when rebasing ");
			code40 = claim_element(p22_nodes, "CODE", {});
			var code40_nodes = children(code40);
			t129 = claim_text(code40_nodes, "feat/a");
			code40_nodes.forEach(detach);
			t130 = claim_text(p22_nodes, ". And actually the changes made in ");
			code41 = claim_element(p22_nodes, "CODE", {});
			var code41_nodes = children(code41);
			t131 = claim_text(code41_nodes, "commit #1");
			code41_nodes.forEach(detach);
			t132 = claim_text(p22_nodes, " and ");
			code42 = claim_element(p22_nodes, "CODE", {});
			var code42_nodes = children(code42);
			t133 = claim_text(code42_nodes, "commit #2");
			code42_nodes.forEach(detach);
			t134 = claim_text(p22_nodes, " were still available.");
			p22_nodes.forEach(detach);
			t135 = claim_space(nodes);
			blockquote1 = claim_element(nodes, "BLOCKQUOTE", {});
			var blockquote1_nodes = children(blockquote1);
			p23 = claim_element(blockquote1_nodes, "P", {});
			var p23_nodes = children(p23);
			t136 = claim_text(p23_nodes, "You can read more about this behaviour in ");
			a3 = claim_element(p23_nodes, "A", { href: true, rel: true });
			var a3_nodes = children(a3);
			t137 = claim_text(a3_nodes, "git's documentation");
			a3_nodes.forEach(detach);
			p23_nodes.forEach(detach);
			blockquote1_nodes.forEach(detach);
			t138 = claim_space(nodes);
			p24 = claim_element(nodes, "P", {});
			var p24_nodes = children(p24);
			t139 = claim_text(p24_nodes, "So, what she should have done if she wanted to actually rebased the local ");
			code43 = claim_element(p24_nodes, "CODE", {});
			var code43_nodes = children(code43);
			t140 = claim_text(code43_nodes, "feat/a");
			code43_nodes.forEach(detach);
			t141 = claim_text(p24_nodes, " on top of ");
			code44 = claim_element(p24_nodes, "CODE", {});
			var code44_nodes = children(code44);
			t142 = claim_text(code44_nodes, "origin/feat/a");
			code44_nodes.forEach(detach);
			t143 = claim_text(p24_nodes, ", especially after she made another commit, ");
			code45 = claim_element(p24_nodes, "CODE", {});
			var code45_nodes = children(code45);
			t144 = claim_text(code45_nodes, "commit #0");
			code45_nodes.forEach(detach);
			t145 = claim_text(p24_nodes, "?");
			p24_nodes.forEach(detach);
			t146 = claim_space(nodes);
			p25 = claim_element(nodes, "P", {});
			var p25_nodes = children(p25);
			picture5 = claim_element(p25_nodes, "PICTURE", {});
			var picture5_nodes = children(picture5);
			source10 = claim_element(picture5_nodes, "SOURCE", { type: true, srcset: true });
			source11 = claim_element(picture5_nodes, "SOURCE", { type: true, srcset: true });
			img5 = claim_element(picture5_nodes, "IMG", { alt: true, src: true });
			picture5_nodes.forEach(detach);
			p25_nodes.forEach(detach);
			t147 = claim_space(nodes);
			p26 = claim_element(nodes, "P", {});
			var p26_nodes = children(p26);
			t148 = claim_text(p26_nodes, "Well, she should specify the ");
			code46 = claim_element(p26_nodes, "CODE", {});
			var code46_nodes = children(code46);
			t149 = claim_text(code46_nodes, "<upstream>");
			code46_nodes.forEach(detach);
			t150 = claim_text(p26_nodes, " reference point:");
			p26_nodes.forEach(detach);
			t151 = claim_space(nodes);
			p27 = claim_element(nodes, "P", {});
			var p27_nodes = children(p27);
			picture6 = claim_element(p27_nodes, "PICTURE", {});
			var picture6_nodes = children(picture6);
			source12 = claim_element(picture6_nodes, "SOURCE", { type: true, srcset: true });
			source13 = claim_element(picture6_nodes, "SOURCE", { type: true, srcset: true });
			img6 = claim_element(picture6_nodes, "IMG", { alt: true, src: true });
			picture6_nodes.forEach(detach);
			p27_nodes.forEach(detach);
			t152 = claim_space(nodes);
			pre3 = claim_element(nodes, "PRE", { class: true });
			var pre3_nodes = children(pre3);
			pre3_nodes.forEach(detach);
			t153 = claim_space(nodes);
			p28 = claim_element(nodes, "P", {});
			var p28_nodes = children(p28);
			t154 = claim_text(p28_nodes, "And you would get:");
			p28_nodes.forEach(detach);
			t155 = claim_space(nodes);
			p29 = claim_element(nodes, "P", {});
			var p29_nodes = children(p29);
			picture7 = claim_element(p29_nodes, "PICTURE", {});
			var picture7_nodes = children(picture7);
			source14 = claim_element(picture7_nodes, "SOURCE", { type: true, srcset: true });
			source15 = claim_element(picture7_nodes, "SOURCE", { type: true, srcset: true });
			img7 = claim_element(picture7_nodes, "IMG", { alt: true, src: true });
			picture7_nodes.forEach(detach);
			p29_nodes.forEach(detach);
			t156 = claim_space(nodes);
			p30 = claim_element(nodes, "P", {});
			var p30_nodes = children(p30);
			t157 = claim_text(p30_nodes, "Here again, git is smart enough not to rewrite ");
			code47 = claim_element(p30_nodes, "CODE", {});
			var code47_nodes = children(code47);
			t158 = claim_text(code47_nodes, "commit #1");
			code47_nodes.forEach(detach);
			t159 = claim_text(p30_nodes, " and ");
			code48 = claim_element(p30_nodes, "CODE", {});
			var code48_nodes = children(code48);
			t160 = claim_text(code48_nodes, "commit #2");
			code48_nodes.forEach(detach);
			t161 = claim_text(p30_nodes, ".");
			p30_nodes.forEach(detach);
			t162 = claim_space(nodes);
			section1 = claim_element(nodes, "SECTION", {});
			var section1_nodes = children(section1);
			h2 = claim_element(section1_nodes, "H2", {});
			var h2_nodes = children(h2);
			a4 = claim_element(h2_nodes, "A", { href: true, id: true });
			var a4_nodes = children(a4);
			t163 = claim_text(a4_nodes, "Summary");
			a4_nodes.forEach(detach);
			h2_nodes.forEach(detach);
			t164 = claim_space(section1_nodes);
			p31 = claim_element(section1_nodes, "P", {});
			var p31_nodes = children(p31);
			t165 = claim_text(p31_nodes, "When using ");
			code49 = claim_element(p31_nodes, "CODE", {});
			var code49_nodes = children(code49);
			t166 = claim_text(code49_nodes, "git rebase");
			code49_nodes.forEach(detach);
			t167 = claim_text(p31_nodes, ", always remember the 3 reference points of rebase, the ");
			code50 = claim_element(p31_nodes, "CODE", {});
			var code50_nodes = children(code50);
			t168 = claim_text(code50_nodes, "new base");
			code50_nodes.forEach(detach);
			t169 = claim_text(p31_nodes, ", ");
			code51 = claim_element(p31_nodes, "CODE", {});
			var code51_nodes = children(code51);
			t170 = claim_text(code51_nodes, "upstream");
			code51_nodes.forEach(detach);
			t171 = claim_text(p31_nodes, " and ");
			code52 = claim_element(p31_nodes, "CODE", {});
			var code52_nodes = children(code52);
			t172 = claim_text(code52_nodes, "branch");
			code52_nodes.forEach(detach);
			t173 = claim_text(p31_nodes, ".");
			p31_nodes.forEach(detach);
			section1_nodes.forEach(detach);
			this.h();
		},
		h() {
			attr(a0, "href", "#summary");
			attr(ul0, "class", "sitemap");
			attr(ul0, "id", "sitemap");
			attr(ul0, "role", "navigation");
			attr(ul0, "aria-label", "Table of Contents");
			attr(a1, "href", "/git-gudder/");
			attr(a2, "href", "https://github.com/Shopee/shopee-react-knowledgeable");
			attr(a2, "rel", "nofollow");
			attr(source0, "type", "image/webp");
			attr(source0, "srcset", __build_img_webp__0);
			attr(source1, "type", "image/jpeg");
			attr(source1, "srcset", __build_img__0);
			attr(img0, "alt", "initil");
			if (img0.src !== (img0_src_value = __build_img__0)) attr(img0, "src", img0_src_value);
			attr(source2, "type", "image/webp");
			attr(source2, "srcset", __build_img_webp__1);
			attr(source3, "type", "image/jpeg");
			attr(source3, "srcset", __build_img__1);
			attr(img1, "alt", "first rebase");
			if (img1.src !== (img1_src_value = __build_img__1)) attr(img1, "src", img1_src_value);
			attr(pre0, "class", "language-null");
			attr(source4, "type", "image/webp");
			attr(source4, "srcset", __build_img_webp__2);
			attr(source5, "type", "image/jpeg");
			attr(source5, "srcset", __build_img__2);
			attr(img2, "alt", "3 reference points");
			if (img2.src !== (img2_src_value = __build_img__2)) attr(img2, "src", img2_src_value);
			attr(pre1, "class", "language-null");
			attr(pre2, "class", "language-null");
			attr(source6, "type", "image/webp");
			attr(source6, "srcset", __build_img_webp__3);
			attr(source7, "type", "image/jpeg");
			attr(source7, "srcset", __build_img__3);
			attr(img3, "alt", "rebase again");
			if (img3.src !== (img3_src_value = __build_img__3)) attr(img3, "src", img3_src_value);
			attr(source8, "type", "image/webp");
			attr(source8, "srcset", __build_img_webp__4);
			attr(source9, "type", "image/jpeg");
			attr(source9, "srcset", __build_img__4);
			attr(img4, "alt", "actual rebase again result");
			if (img4.src !== (img4_src_value = __build_img__4)) attr(img4, "src", img4_src_value);
			attr(a3, "href", "https://git-scm.com/book/en/v2/Git-Branching-Rebasing#_rebase_rebase");
			attr(a3, "rel", "nofollow");
			attr(source10, "type", "image/webp");
			attr(source10, "srcset", __build_img_webp__5);
			attr(source11, "type", "image/jpeg");
			attr(source11, "srcset", __build_img__5);
			attr(img5, "alt", "adding one more commit");
			if (img5.src !== (img5_src_value = __build_img__5)) attr(img5, "src", img5_src_value);
			attr(source12, "type", "image/webp");
			attr(source12, "srcset", __build_img_webp__6);
			attr(source13, "type", "image/jpeg");
			attr(source13, "srcset", __build_img__6);
			attr(img6, "alt", "reference points");
			if (img6.src !== (img6_src_value = __build_img__6)) attr(img6, "src", img6_src_value);
			attr(pre3, "class", "language-null");
			attr(source14, "type", "image/webp");
			attr(source14, "srcset", __build_img_webp__7);
			attr(source15, "type", "image/jpeg");
			attr(source15, "srcset", __build_img__7);
			attr(img7, "alt", "result");
			if (img7.src !== (img7_src_value = __build_img__7)) attr(img7, "src", img7_src_value);
			attr(a4, "href", "#summary");
			attr(a4, "id", "summary");
		},
		m(target, anchor) {
			insert(target, section0, anchor);
			append(section0, ul0);
			append(ul0, li0);
			append(li0, a0);
			append(a0, t0);
			insert(target, t1, anchor);
			insert(target, p0, anchor);
			append(p0, t2);
			append(p0, a1);
			append(a1, t3);
			append(p0, t4);
			append(p0, a2);
			append(a2, t5);
			append(p0, t6);
			append(p0, code0);
			append(code0, t7);
			append(p0, t8);
			insert(target, t9, anchor);
			insert(target, p1, anchor);
			append(p1, t10);
			insert(target, t11, anchor);
			insert(target, p2, anchor);
			append(p2, t12);
			insert(target, t13, anchor);
			insert(target, blockquote0, anchor);
			append(blockquote0, p3);
			append(p3, t14);
			append(p3, code1);
			append(code1, t15);
			append(p3, t16);
			append(p3, code2);
			append(code2, t17);
			append(p3, t18);
			append(p3, code3);
			append(code3, t19);
			append(p3, t20);
			append(p3, code4);
			append(code4, t21);
			append(p3, t22);
			append(blockquote0, t23);
			append(blockquote0, p4);
			append(p4, t24);
			append(p4, code5);
			append(code5, t25);
			append(p4, t26);
			append(p4, code6);
			append(code6, t27);
			append(p4, t28);
			append(blockquote0, t29);
			append(blockquote0, p5);
			append(p5, t30);
			append(p5, code7);
			append(code7, t31);
			append(p5, t32);
			append(p5, code8);
			append(code8, t33);
			append(p5, t34);
			append(p5, code9);
			append(code9, t35);
			append(p5, t36);
			append(p5, code10);
			append(code10, t37);
			append(p5, t38);
			append(blockquote0, t39);
			append(blockquote0, p6);
			append(p6, t40);
			append(p6, code11);
			append(code11, t41);
			append(p6, t42);
			append(p6, code12);
			append(code12, t43);
			append(p6, t44);
			append(p6, code13);
			append(code13, t45);
			append(p6, t46);
			insert(target, t47, anchor);
			insert(target, p7, anchor);
			append(p7, t48);
			append(p7, code14);
			append(code14, t49);
			append(p7, t50);
			append(p7, code15);
			append(code15, t51);
			append(p7, t52);
			append(p7, code16);
			append(code16, t53);
			append(p7, t54);
			append(p7, code17);
			append(code17, t55);
			append(p7, t56);
			append(p7, code18);
			append(code18, t57);
			append(p7, t58);
			append(p7, code19);
			append(code19, t59);
			append(p7, t60);
			insert(target, t61, anchor);
			insert(target, p8, anchor);
			append(p8, t62);
			insert(target, t63, anchor);
			insert(target, p9, anchor);
			append(p9, picture0);
			append(picture0, source0);
			append(picture0, source1);
			append(picture0, img0);
			insert(target, t64, anchor);
			insert(target, p10, anchor);
			append(p10, t65);
			append(p10, code20);
			append(code20, t66);
			append(p10, t67);
			append(p10, code21);
			append(code21, t68);
			append(p10, t69);
			append(p10, code22);
			append(code22, t70);
			append(p10, t71);
			insert(target, t72, anchor);
			insert(target, p11, anchor);
			append(p11, picture1);
			append(picture1, source2);
			append(picture1, source3);
			append(picture1, img1);
			insert(target, t73, anchor);
			insert(target, p12, anchor);
			append(p12, t74);
			insert(target, t75, anchor);
			insert(target, p13, anchor);
			append(p13, t76);
			append(p13, code23);
			append(code23, t77);
			append(p13, t78);
			append(p13, code24);
			append(code24, t79);
			append(p13, t80);
			insert(target, t81, anchor);
			insert(target, pre0, anchor);
			pre0.innerHTML = raw0_value;
			insert(target, t82, anchor);
			insert(target, p14, anchor);
			append(p14, t83);
			append(p14, code25);
			append(code25, t84);
			append(p14, t85);
			insert(target, t86, anchor);
			insert(target, p15, anchor);
			append(p15, picture2);
			append(picture2, source4);
			append(picture2, source5);
			append(picture2, img2);
			insert(target, t87, anchor);
			insert(target, p16, anchor);
			append(p16, t88);
			insert(target, t89, anchor);
			insert(target, pre1, anchor);
			pre1.innerHTML = raw1_value;
			insert(target, t90, anchor);
			insert(target, p17, anchor);
			append(p17, t91);
			insert(target, t92, anchor);
			insert(target, pre2, anchor);
			pre2.innerHTML = raw2_value;
			insert(target, t93, anchor);
			insert(target, ul1, anchor);
			append(ul1, li1);
			append(li1, code26);
			append(code26, t94);
			append(li1, t95);
			append(li1, code27);
			append(code27, t96);
			append(ul1, t97);
			append(ul1, li2);
			append(li2, code28);
			append(code28, t98);
			append(li2, t99);
			append(li2, code29);
			append(code29, t100);
			append(ul1, t101);
			append(ul1, li3);
			append(li3, code30);
			append(code30, t102);
			append(li3, t103);
			append(li3, code31);
			append(code31, t104);
			insert(target, t105, anchor);
			insert(target, p18, anchor);
			append(p18, t106);
			append(p18, code32);
			append(code32, t107);
			append(p18, t108);
			append(p18, code33);
			append(code33, t109);
			append(p18, t110);
			append(p18, code34);
			append(code34, t111);
			append(p18, t112);
			insert(target, t113, anchor);
			insert(target, p19, anchor);
			append(p19, picture3);
			append(picture3, source6);
			append(picture3, source7);
			append(picture3, img3);
			insert(target, t114, anchor);
			insert(target, p20, anchor);
			append(p20, t115);
			append(p20, code35);
			append(code35, t116);
			append(p20, t117);
			append(p20, code36);
			append(code36, t118);
			append(p20, t119);
			insert(target, t120, anchor);
			insert(target, p21, anchor);
			append(p21, picture4);
			append(picture4, source8);
			append(picture4, source9);
			append(picture4, img4);
			insert(target, t121, anchor);
			insert(target, p22, anchor);
			append(p22, t122);
			append(p22, code37);
			append(code37, t123);
			append(p22, t124);
			append(p22, code38);
			append(code38, t125);
			append(p22, t126);
			append(p22, code39);
			append(code39, t127);
			append(p22, t128);
			append(p22, code40);
			append(code40, t129);
			append(p22, t130);
			append(p22, code41);
			append(code41, t131);
			append(p22, t132);
			append(p22, code42);
			append(code42, t133);
			append(p22, t134);
			insert(target, t135, anchor);
			insert(target, blockquote1, anchor);
			append(blockquote1, p23);
			append(p23, t136);
			append(p23, a3);
			append(a3, t137);
			insert(target, t138, anchor);
			insert(target, p24, anchor);
			append(p24, t139);
			append(p24, code43);
			append(code43, t140);
			append(p24, t141);
			append(p24, code44);
			append(code44, t142);
			append(p24, t143);
			append(p24, code45);
			append(code45, t144);
			append(p24, t145);
			insert(target, t146, anchor);
			insert(target, p25, anchor);
			append(p25, picture5);
			append(picture5, source10);
			append(picture5, source11);
			append(picture5, img5);
			insert(target, t147, anchor);
			insert(target, p26, anchor);
			append(p26, t148);
			append(p26, code46);
			append(code46, t149);
			append(p26, t150);
			insert(target, t151, anchor);
			insert(target, p27, anchor);
			append(p27, picture6);
			append(picture6, source12);
			append(picture6, source13);
			append(picture6, img6);
			insert(target, t152, anchor);
			insert(target, pre3, anchor);
			pre3.innerHTML = raw3_value;
			insert(target, t153, anchor);
			insert(target, p28, anchor);
			append(p28, t154);
			insert(target, t155, anchor);
			insert(target, p29, anchor);
			append(p29, picture7);
			append(picture7, source14);
			append(picture7, source15);
			append(picture7, img7);
			insert(target, t156, anchor);
			insert(target, p30, anchor);
			append(p30, t157);
			append(p30, code47);
			append(code47, t158);
			append(p30, t159);
			append(p30, code48);
			append(code48, t160);
			append(p30, t161);
			insert(target, t162, anchor);
			insert(target, section1, anchor);
			append(section1, h2);
			append(h2, a4);
			append(a4, t163);
			append(section1, t164);
			append(section1, p31);
			append(p31, t165);
			append(p31, code49);
			append(code49, t166);
			append(p31, t167);
			append(p31, code50);
			append(code50, t168);
			append(p31, t169);
			append(p31, code51);
			append(code51, t170);
			append(p31, t171);
			append(p31, code52);
			append(code52, t172);
			append(p31, t173);
		},
		p: noop,
		d(detaching) {
			if (detaching) detach(section0);
			if (detaching) detach(t1);
			if (detaching) detach(p0);
			if (detaching) detach(t9);
			if (detaching) detach(p1);
			if (detaching) detach(t11);
			if (detaching) detach(p2);
			if (detaching) detach(t13);
			if (detaching) detach(blockquote0);
			if (detaching) detach(t47);
			if (detaching) detach(p7);
			if (detaching) detach(t61);
			if (detaching) detach(p8);
			if (detaching) detach(t63);
			if (detaching) detach(p9);
			if (detaching) detach(t64);
			if (detaching) detach(p10);
			if (detaching) detach(t72);
			if (detaching) detach(p11);
			if (detaching) detach(t73);
			if (detaching) detach(p12);
			if (detaching) detach(t75);
			if (detaching) detach(p13);
			if (detaching) detach(t81);
			if (detaching) detach(pre0);
			if (detaching) detach(t82);
			if (detaching) detach(p14);
			if (detaching) detach(t86);
			if (detaching) detach(p15);
			if (detaching) detach(t87);
			if (detaching) detach(p16);
			if (detaching) detach(t89);
			if (detaching) detach(pre1);
			if (detaching) detach(t90);
			if (detaching) detach(p17);
			if (detaching) detach(t92);
			if (detaching) detach(pre2);
			if (detaching) detach(t93);
			if (detaching) detach(ul1);
			if (detaching) detach(t105);
			if (detaching) detach(p18);
			if (detaching) detach(t113);
			if (detaching) detach(p19);
			if (detaching) detach(t114);
			if (detaching) detach(p20);
			if (detaching) detach(t120);
			if (detaching) detach(p21);
			if (detaching) detach(t121);
			if (detaching) detach(p22);
			if (detaching) detach(t135);
			if (detaching) detach(blockquote1);
			if (detaching) detach(t138);
			if (detaching) detach(p24);
			if (detaching) detach(t146);
			if (detaching) detach(p25);
			if (detaching) detach(t147);
			if (detaching) detach(p26);
			if (detaching) detach(t151);
			if (detaching) detach(p27);
			if (detaching) detach(t152);
			if (detaching) detach(pre3);
			if (detaching) detach(t153);
			if (detaching) detach(p28);
			if (detaching) detach(t155);
			if (detaching) detach(p29);
			if (detaching) detach(t156);
			if (detaching) detach(p30);
			if (detaching) detach(t162);
			if (detaching) detach(section1);
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
	"title": "Git commits went missing after a rebase",
	"date": "2019-09-04T08:00:00Z",
	"description": "What happened when you do a rebase",
	"tags": ["JavaScript", "git", "rebase", "scm"],
	"slug": "commit-went-missing-after-rebase",
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
}, 3000);
