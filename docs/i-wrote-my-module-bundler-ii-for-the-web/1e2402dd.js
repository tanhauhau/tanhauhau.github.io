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

var __build_img_webp__2 = "574ab990c5488a44.webp";

var __build_img__2 = "574ab990c5488a44.png";

var __build_img_webp__1 = "804912f930114d08.webp";

var __build_img__1 = "804912f930114d08.png";

var __build_img_webp__0 = "7449f3690b9af7f1.webp";

var __build_img__0 = "7449f3690b9af7f1.png";

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

var image = "https://lihautan.com/i-wrote-my-module-bundler-ii-for-the-web/assets/hero-twitter-ac20dd41.jpg";

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
					"@id": "https%3A%2F%2Flihautan.com%2Fi-wrote-my-module-bundler-ii-for-the-web",
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
			attr(meta11, "content", "https%3A%2F%2Flihautan.com%2Fi-wrote-my-module-bundler-ii-for-the-web");
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
							"@id": "https%3A%2F%2Flihautan.com%2Fi-wrote-my-module-bundler-ii-for-the-web",
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

/* content/blog/i-wrote-my-module-bundler-ii-for-the-web/@@page-markup.svelte generated by Svelte v3.24.0 */

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
	let li5;
	let a5;
	let t5;
	let li6;
	let a6;
	let t6;
	let li7;
	let a7;
	let t7;
	let t8;
	let p0;
	let t9;
	let a8;
	let t10;
	let t11;
	let t12;
	let p1;
	let picture0;
	let source0;
	let source1;
	let img0;
	let img0_src_value;
	let t13;
	let p2;
	let t14;
	let t15;
	let p3;
	let t16;
	let t17;
	let ul2;
	let li8;
	let a9;
	let t18;
	let t19;
	let li9;
	let a10;
	let t20;
	let t21;
	let li10;
	let a11;
	let t22;
	let t23;
	let hr0;
	let t24;
	let p4;
	let t25;
	let strong0;
	let t26;
	let t27;
	let t28;
	let hr1;
	let t29;
	let section1;
	let h20;
	let a12;
	let t30;
	let t31;
	let p5;
	let t32;
	let t33;
	let p6;
	let t34;
	let t35;
	let pre0;

	let raw0_value = `<code class="language-js"><span class="token keyword">function</span> <span class="token function">toModuleMap</span><span class="token punctuation">(</span><span class="token parameter">modules</span><span class="token punctuation">)</span> <span class="token punctuation">&#123;</span>

<span class="token keyword">for</span> <span class="token punctuation">(</span><span class="token keyword">const</span> module <span class="token keyword">of</span> modules<span class="token punctuation">)</span> <span class="token punctuation">&#123;</span>
  module<span class="token punctuation">.</span><span class="token function">transformModuleInterface</span><span class="token punctuation">(</span><span class="token punctuation">)</span><span class="token punctuation">;</span>
  <span class="token comment">// highlight-next-line</span>
  moduleMap <span class="token operator">+=</span> <span class="token template-string"><span class="token template-punctuation string">&#96;</span><span class="token string">"</span><span class="token interpolation"><span class="token interpolation-punctuation punctuation">$&#123;</span>module<span class="token punctuation">.</span>filePath<span class="token interpolation-punctuation punctuation">&#125;</span></span><span class="token string">": function(exports, require) &#123; </span><span class="token interpolation"><span class="token interpolation-punctuation punctuation">$&#123;</span>module<span class="token punctuation">.</span>content<span class="token interpolation-punctuation punctuation">&#125;</span></span><span class="token string">&#92;n &#125;,</span><span class="token template-punctuation string">&#96;</span></span><span class="token punctuation">;</span>
<span class="token punctuation">&#125;</span></code>` + "";

	let t36;
	let p7;
	let t37;
	let t38;
	let p8;
	let t39;
	let t40;
	let pre1;

	let raw1_value = `<code class="language-js"><span class="token keyword">function</span> <span class="token function">resolveRequest</span><span class="token punctuation">(</span><span class="token parameter">requester<span class="token punctuation">,</span> requestPath</span><span class="token punctuation">)</span> <span class="token punctuation">&#123;</span>
  <span class="token comment">// highlight-start</span>
  <span class="token keyword">if</span> <span class="token punctuation">(</span>requestPath<span class="token punctuation">[</span><span class="token number">0</span><span class="token punctuation">]</span> <span class="token operator">===</span> <span class="token string">'.'</span><span class="token punctuation">)</span> <span class="token punctuation">&#123;</span>
    <span class="token comment">// relative import</span>
    <span class="token keyword">return</span> path<span class="token punctuation">.</span><span class="token function">join</span><span class="token punctuation">(</span>path<span class="token punctuation">.</span><span class="token function">dirname</span><span class="token punctuation">(</span>requester<span class="token punctuation">)</span><span class="token punctuation">,</span> requestPath<span class="token punctuation">)</span><span class="token punctuation">;</span>
  <span class="token punctuation">&#125;</span> <span class="token keyword">else</span> <span class="token punctuation">&#123;</span>
    <span class="token keyword">const</span> requesterParts <span class="token operator">=</span> requester<span class="token punctuation">.</span><span class="token function">split</span><span class="token punctuation">(</span><span class="token string">'/'</span><span class="token punctuation">)</span><span class="token punctuation">;</span>
    <span class="token keyword">const</span> requestPaths <span class="token operator">=</span> <span class="token punctuation">[</span><span class="token punctuation">]</span><span class="token punctuation">;</span>
    <span class="token keyword">for</span> <span class="token punctuation">(</span><span class="token keyword">let</span> i <span class="token operator">=</span> requesterParts<span class="token punctuation">.</span>length <span class="token operator">-</span> <span class="token number">1</span><span class="token punctuation">;</span> i <span class="token operator">></span> <span class="token number">0</span><span class="token punctuation">;</span> i<span class="token operator">--</span><span class="token punctuation">)</span> <span class="token punctuation">&#123;</span>
      requestPaths<span class="token punctuation">.</span><span class="token function">push</span><span class="token punctuation">(</span>requesterParts<span class="token punctuation">.</span><span class="token function">slice</span><span class="token punctuation">(</span><span class="token number">0</span><span class="token punctuation">,</span> i<span class="token punctuation">)</span><span class="token punctuation">.</span><span class="token function">join</span><span class="token punctuation">(</span><span class="token string">'/'</span><span class="token punctuation">)</span> <span class="token operator">+</span> <span class="token string">'/node_modules'</span><span class="token punctuation">)</span><span class="token punctuation">;</span>
    <span class="token punctuation">&#125;</span>
    <span class="token comment">// absolute import</span>
    <span class="token keyword">return</span> require<span class="token punctuation">.</span><span class="token function">resolve</span><span class="token punctuation">(</span>requestPath<span class="token punctuation">,</span> <span class="token punctuation">&#123;</span> paths<span class="token punctuation">:</span> requestPaths <span class="token punctuation">&#125;</span><span class="token punctuation">)</span><span class="token punctuation">;</span>
  <span class="token punctuation">&#125;</span>
  <span class="token comment">// highlight-end</span>
<span class="token punctuation">&#125;</span></code>` + "";

	let t41;
	let p9;
	let t42;
	let code0;
	let t43;
	let t44;
	let t45;
	let p10;
	let em0;
	let t46;
	let t47;
	let t48;
	let section2;
	let h21;
	let a13;
	let t49;
	let t50;
	let p11;
	let t51;
	let t52;
	let p12;
	let t53;
	let code1;
	let t54;
	let t55;
	let t56;
	let p13;
	let t57;
	let t58;
	let pre2;

	let raw2_value = `<code class="language-html"><span class="token comment">&lt;!-- filename: index.html --></span>
<span class="token tag"><span class="token tag"><span class="token punctuation">&lt;</span>html</span><span class="token punctuation">></span></span>
  <span class="token tag"><span class="token tag"><span class="token punctuation">&lt;</span>body</span><span class="token punctuation">></span></span><span class="token tag"><span class="token tag"><span class="token punctuation">&lt;/</span>body</span><span class="token punctuation">></span></span>
<span class="token tag"><span class="token tag"><span class="token punctuation">&lt;/</span>html</span><span class="token punctuation">></span></span></code>` + "";

	let t59;
	let p14;
	let t60;
	let t61;
	let pre3;
	let raw3_value = `<code class="language-yml"><span class="token punctuation">-</span> bundle.js</code>` + "";
	let t62;
	let p15;
	let t63;
	let code2;
	let t64;
	let t65;
	let t66;
	let pre4;

	let raw4_value = `<code class="language-html"><span class="token comment">&lt;!-- filename: index.html --></span>
<span class="token tag"><span class="token tag"><span class="token punctuation">&lt;</span>html</span><span class="token punctuation">></span></span>
  <span class="token tag"><span class="token tag"><span class="token punctuation">&lt;</span>body</span><span class="token punctuation">></span></span>
    <span class="token tag"><span class="token tag"><span class="token punctuation">&lt;</span>script</span> <span class="token attr-name">src</span><span class="token attr-value"><span class="token punctuation">=</span><span class="token punctuation">"</span>/bundle.js<span class="token punctuation">"</span></span><span class="token punctuation">></span></span>
  <span class="token tag"><span class="token tag"><span class="token punctuation">&lt;/</span>body</span><span class="token punctuation">></span></span>
<span class="token tag"><span class="token tag"><span class="token punctuation">&lt;/</span>html</span><span class="token punctuation">></span></span></code>` + "";

	let t67;
	let blockquote0;
	let small0;
	let t68;
	let t69;
	let p16;
	let t70;
	let t71;
	let pre5;

	let raw5_value = `<code class="language-js"><span class="token comment">// filename: index.js</span>
<span class="token keyword">function</span> <span class="token function">build</span><span class="token punctuation">(</span><span class="token parameter"><span class="token punctuation">&#123;</span> entryFile<span class="token punctuation">,</span> outputFolder<span class="token punctuation">,</span> htmlTemplatePath <span class="token punctuation">&#125;</span></span><span class="token punctuation">)</span> <span class="token punctuation">&#123;</span>
  <span class="token comment">// ...</span>
  <span class="token keyword">const</span> outputFiles <span class="token operator">=</span> <span class="token function">bundle</span><span class="token punctuation">(</span>graph<span class="token punctuation">)</span><span class="token punctuation">;</span>
  <span class="token comment">// highlight-next-line</span>
  outputFiles<span class="token punctuation">.</span><span class="token function">push</span><span class="token punctuation">(</span><span class="token function">generateHTMLTemplate</span><span class="token punctuation">(</span>htmlTemplatePath<span class="token punctuation">,</span> outputFiles<span class="token punctuation">)</span><span class="token punctuation">)</span><span class="token punctuation">;</span>
  <span class="token comment">// ...</span>
<span class="token punctuation">&#125;</span>

<span class="token comment">// highlight-start</span>
<span class="token keyword">const</span> <span class="token constant">END_BODY_TAG</span> <span class="token operator">=</span> <span class="token string">'&lt;/body>'</span><span class="token punctuation">;</span>
<span class="token keyword">function</span> <span class="token function">generateHTMLTemplate</span><span class="token punctuation">(</span><span class="token parameter">htmlTemplatePath<span class="token punctuation">,</span> outputFiles</span><span class="token punctuation">)</span> <span class="token punctuation">&#123;</span>
  <span class="token keyword">let</span> htmlTemplate <span class="token operator">=</span> fs<span class="token punctuation">.</span><span class="token function">readFileSync</span><span class="token punctuation">(</span>htmlTemplatePath<span class="token punctuation">,</span> <span class="token string">'utf-8'</span><span class="token punctuation">)</span><span class="token punctuation">;</span>
  htmlTemplate <span class="token operator">=</span> htmlTemplate<span class="token punctuation">.</span><span class="token function">replace</span><span class="token punctuation">(</span>
    <span class="token constant">END_BODY_TAG</span><span class="token punctuation">,</span>
    outputFiles<span class="token punctuation">.</span><span class="token function">map</span><span class="token punctuation">(</span><span class="token punctuation">(</span><span class="token parameter"><span class="token punctuation">&#123;</span> name <span class="token punctuation">&#125;</span></span><span class="token punctuation">)</span> <span class="token operator">=></span> <span class="token template-string"><span class="token template-punctuation string">&#96;</span><span class="token string">&lt;script src="/</span><span class="token interpolation"><span class="token interpolation-punctuation punctuation">$&#123;</span>name<span class="token interpolation-punctuation punctuation">&#125;</span></span><span class="token string">">&lt;/script></span><span class="token template-punctuation string">&#96;</span></span><span class="token punctuation">)</span><span class="token punctuation">.</span><span class="token function">join</span><span class="token punctuation">(</span><span class="token string">''</span><span class="token punctuation">)</span> <span class="token operator">+</span>
      <span class="token constant">END_BODY_TAG</span>
  <span class="token punctuation">)</span><span class="token punctuation">;</span>
  <span class="token keyword">return</span> <span class="token punctuation">&#123;</span> name<span class="token punctuation">:</span> <span class="token string">'index.html'</span><span class="token punctuation">,</span> content<span class="token punctuation">:</span> htmlTemplate <span class="token punctuation">&#125;</span><span class="token punctuation">;</span>
<span class="token punctuation">&#125;</span></code>` + "";

	let t72;
	let p17;
	let t73;
	let code3;
	let t74;
	let t75;
	let code4;
	let t76;
	let t77;
	let code5;
	let t78;
	let t79;
	let t80;
	let blockquote1;
	let small1;
	let t81;
	let body;
	let t82;
	let t83;
	let section3;
	let h22;
	let a14;
	let t84;
	let t85;
	let p18;
	let t86;
	let t87;
	let p19;
	let t88;
	let code6;
	let t89;
	let t90;
	let t91;
	let pre6;

	let raw6_value = `<code class="language-js"><span class="token comment">// filename: index.js</span>
<span class="token keyword">import</span> <span class="token string">'./style.css'</span><span class="token punctuation">;</span></code>` + "";

	let t92;
	let pre7;

	let raw7_value = `<code class="language-css"><span class="token comment">/* filename: style.css */</span>
<span class="token selector">.square</span> <span class="token punctuation">&#123;</span>
  <span class="token property">color</span><span class="token punctuation">:</span> blue<span class="token punctuation">;</span>
<span class="token punctuation">&#125;</span>
<span class="token selector">.circle</span> <span class="token punctuation">&#123;</span>
  <span class="token property">color</span><span class="token punctuation">:</span> red<span class="token punctuation">;</span>
<span class="token punctuation">&#125;</span></code>` + "";

	let t93;
	let p20;
	let t94;
	let code7;
	let t95;
	let t96;
	let t97;
	let pre8;

	let raw8_value = `
<code class="language-">SyntaxError: unknown: Unexpected token (1:0)
&gt; 1 | .square &#123;
    | ^
  2 |   color: blue;
  3 | &#125;
  4 | .circle &#123;
    at Parser.raise (node_modules/@babel/parser/lib/index.js:6344:17)</code>` + "";

	let t98;
	let p21;
	let t99;
	let t100;
	let p22;
	let t101;
	let code8;
	let t102;
	let t103;
	let code9;
	let t104;
	let t105;
	let code10;
	let t106;
	let t107;
	let t108;
	let pre9;

	let raw9_value = `<code class="language-js"><span class="token comment">// filename: index.js</span>
<span class="token keyword">class</span> <span class="token class-name">Module</span> <span class="token punctuation">&#123;</span>
  <span class="token function">constructor</span><span class="token punctuation">(</span><span class="token parameter">filePath</span><span class="token punctuation">)</span> <span class="token punctuation">&#123;</span>
    <span class="token keyword">this</span><span class="token punctuation">.</span>filePath <span class="token operator">=</span> filePath<span class="token punctuation">;</span>
    <span class="token keyword">this</span><span class="token punctuation">.</span>content <span class="token operator">=</span> fs<span class="token punctuation">.</span><span class="token function">readFileSync</span><span class="token punctuation">(</span>filePath<span class="token punctuation">,</span> <span class="token string">'utf-8'</span><span class="token punctuation">)</span><span class="token punctuation">;</span>
  <span class="token punctuation">&#125;</span>
  <span class="token function">initDependencies</span><span class="token punctuation">(</span><span class="token punctuation">)</span> <span class="token punctuation">&#123;</span>
    <span class="token keyword">this</span><span class="token punctuation">.</span>dependencies <span class="token operator">=</span> <span class="token punctuation">[</span><span class="token punctuation">]</span><span class="token punctuation">;</span>
  <span class="token punctuation">&#125;</span>
  <span class="token function">transformModuleInterface</span><span class="token punctuation">(</span><span class="token punctuation">)</span> <span class="token punctuation">&#123;</span><span class="token punctuation">&#125;</span>
<span class="token punctuation">&#125;</span>

<span class="token keyword">class</span> <span class="token class-name">JSModule</span> <span class="token keyword">extends</span> <span class="token class-name">Module</span> <span class="token punctuation">&#123;</span><span class="token punctuation">&#125;</span>

<span class="token keyword">class</span> <span class="token class-name">CSSModule</span> <span class="token keyword">extends</span> <span class="token class-name">Module</span> <span class="token punctuation">&#123;</span><span class="token punctuation">&#125;</span></code>` + "";

	let t109;
	let p23;
	let t110;
	let code11;
	let t111;
	let t112;
	let code12;
	let t113;
	let t114;
	let t115;
	let pre10;

	let raw10_value = `<code class="language-js"><span class="token comment">// filename: index.js</span>

<span class="token comment">// highlight-start</span>
<span class="token keyword">const</span> <span class="token constant">MODULE_LOADERS</span> <span class="token operator">=</span> <span class="token punctuation">&#123;</span>
  <span class="token string">'.css'</span><span class="token punctuation">:</span> CSSModule<span class="token punctuation">,</span>
  <span class="token string">'.js'</span><span class="token punctuation">:</span> JSModule<span class="token punctuation">,</span>
<span class="token punctuation">&#125;</span>
<span class="token comment">// highlight-end</span>

<span class="token keyword">function</span> <span class="token function">createModule</span><span class="token punctuation">(</span><span class="token parameter">filePath</span><span class="token punctuation">)</span> <span class="token punctuation">&#123;</span>
  <span class="token comment">// ...</span>
    <span class="token comment">// highlight-start</span>
    <span class="token keyword">const</span> fileExtension <span class="token operator">=</span> path<span class="token punctuation">.</span><span class="token function">extname</span><span class="token punctuation">(</span>filePath<span class="token punctuation">)</span><span class="token punctuation">;</span>
    <span class="token keyword">const</span> ModuleCls <span class="token operator">=</span> <span class="token constant">MODULE_LOADERS</span><span class="token punctuation">[</span>fileExtension<span class="token punctuation">]</span><span class="token punctuation">;</span>
    <span class="token keyword">if</span> <span class="token punctuation">(</span><span class="token operator">!</span>ModuleCls<span class="token punctuation">)</span> <span class="token punctuation">&#123;</span>
      <span class="token keyword">throw</span> <span class="token keyword">new</span> <span class="token class-name">Error</span><span class="token punctuation">(</span><span class="token template-string"><span class="token template-punctuation string">&#96;</span><span class="token string">Unsupported extension "</span><span class="token interpolation"><span class="token interpolation-punctuation punctuation">$&#123;</span>fileExtension<span class="token interpolation-punctuation punctuation">&#125;</span></span><span class="token string">".</span><span class="token template-punctuation string">&#96;</span></span><span class="token punctuation">)</span><span class="token punctuation">;</span>
    <span class="token punctuation">&#125;</span>
    <span class="token keyword">const</span> module <span class="token operator">=</span> <span class="token keyword">new</span> <span class="token class-name">ModuleCls</span><span class="token punctuation">(</span>filePath<span class="token punctuation">)</span><span class="token punctuation">;</span>
    <span class="token comment">// hightlight-end</span>
    <span class="token constant">MODULE_CACHE</span><span class="token punctuation">.</span><span class="token function">set</span><span class="token punctuation">(</span>filePath<span class="token punctuation">,</span> module<span class="token punctuation">)</span><span class="token punctuation">;</span>
    <span class="token comment">// ...</span>
  <span class="token punctuation">&#125;</span>
<span class="token punctuation">&#125;</span></code>` + "";

	let t116;
	let section4;
	let h3;
	let a15;
	let t117;
	let t118;
	let p24;
	let t119;
	let code13;
	let t120;
	let t121;
	let a16;
	let t122;
	let t123;
	let t124;
	let p25;
	let t125;
	let em1;
	let t126;
	let a17;
	let t127;
	let t128;
	let t129;
	let p26;
	let t130;
	let strong1;
	let t131;
	let t132;
	let strong2;
	let t133;
	let t134;
	let t135;
	let p27;
	let t136;
	let t137;
	let p28;
	let strong3;
	let t138;
	let t139;
	let p29;
	let t140;
	let code14;
	let t141;
	let t142;
	let code15;
	let t143;
	let t144;
	let t145;
	let p30;
	let t146;
	let t147;
	let pre11;

	let raw11_value = `<code class="language-css"><span class="token selector">.square</span> <span class="token punctuation">&#123;</span>
  <span class="token property">color</span><span class="token punctuation">:</span> blue<span class="token punctuation">;</span>
<span class="token punctuation">&#125;</span>
<span class="token selector">.circle</span> <span class="token punctuation">&#123;</span>
  <span class="token property">color</span><span class="token punctuation">:</span> red<span class="token punctuation">;</span>
<span class="token punctuation">&#125;</span></code>` + "";

	let t148;
	let p31;
	let t149;
	let t150;
	let pre12;

	let raw12_value = `<code class="language-js"><span class="token keyword">const</span> content <span class="token operator">=</span> <span class="token template-string"><span class="token template-punctuation string">&#96;</span><span class="token string">.square &#123; color: blue; &#125; .circle &#123; color: red; &#125;</span><span class="token template-punctuation string">&#96;</span></span><span class="token punctuation">;</span>
<span class="token comment">// create style tag</span>
<span class="token keyword">const</span> style <span class="token operator">=</span> document<span class="token punctuation">.</span><span class="token function">createElement</span><span class="token punctuation">(</span><span class="token string">'style'</span><span class="token punctuation">)</span><span class="token punctuation">;</span>
style<span class="token punctuation">.</span>type <span class="token operator">=</span> <span class="token string">'text/css'</span><span class="token punctuation">;</span>
<span class="token comment">// for ie compatibility</span>
<span class="token keyword">if</span> <span class="token punctuation">(</span>style<span class="token punctuation">.</span>styleSheet<span class="token punctuation">)</span> style<span class="token punctuation">.</span>styleSheet<span class="token punctuation">.</span>cssText <span class="token operator">=</span> content<span class="token punctuation">;</span>
<span class="token keyword">else</span> style<span class="token punctuation">.</span><span class="token function">appendChild</span><span class="token punctuation">(</span>document<span class="token punctuation">.</span><span class="token function">createTextNode</span><span class="token punctuation">(</span>content<span class="token punctuation">)</span><span class="token punctuation">)</span><span class="token punctuation">;</span>
<span class="token comment">// append to the head</span>
document<span class="token punctuation">.</span>head<span class="token punctuation">.</span><span class="token function">appendChild</span><span class="token punctuation">(</span>style<span class="token punctuation">)</span><span class="token punctuation">;</span></code>` + "";

	let t151;
	let p32;
	let t152;
	let a18;
	let t153;
	let t154;
	let code16;
	let t155;
	let t156;
	let t157;
	let ul3;
	let li11;
	let t158;
	let t159;
	let li12;
	let t160;
	let code17;
	let t161;
	let t162;
	let code18;
	let t163;
	let t164;
	let code19;
	let t165;
	let t166;
	let t167;
	let li13;
	let t168;
	let t169;
	let p33;
	let strong4;
	let t170;
	let t171;
	let p34;
	let t172;
	let a19;
	let t173;
	let t174;
	let t175;
	let hr2;
	let t176;
	let p35;
	let t177;
	let a20;
	let t178;
	let t179;
	let t180;
	let pre13;

	let raw13_value = `<code class="language-js"><span class="token comment">// filename: index.js</span>
<span class="token keyword">class</span> <span class="token class-name">Module</span> <span class="token punctuation">&#123;</span>
  <span class="token function">constructor</span><span class="token punctuation">(</span><span class="token parameter">filePath</span><span class="token punctuation">)</span> <span class="token punctuation">&#123;</span>
    <span class="token comment">// ...</span>
    <span class="token comment">// highlight-next-line</span>
    <span class="token keyword">this</span><span class="token punctuation">.</span><span class="token function">transform</span><span class="token punctuation">(</span><span class="token punctuation">)</span><span class="token punctuation">;</span>
  <span class="token punctuation">&#125;</span>
<span class="token punctuation">&#125;</span>

<span class="token keyword">class</span> <span class="token class-name">CSSModule</span> <span class="token keyword">extends</span> <span class="token class-name">Module</span> <span class="token punctuation">&#123;</span>
  <span class="token comment">// highlight-start</span>
  <span class="token function">transform</span><span class="token punctuation">(</span><span class="token punctuation">)</span> <span class="token punctuation">&#123;</span>
    <span class="token keyword">this</span><span class="token punctuation">.</span>content <span class="token operator">=</span> <span class="token function">trim</span><span class="token punctuation">(</span><span class="token template-string"><span class="token template-punctuation string">&#96;</span><span class="token string">
      const content = '</span><span class="token interpolation"><span class="token interpolation-punctuation punctuation">$&#123;</span><span class="token keyword">this</span><span class="token punctuation">.</span>content<span class="token punctuation">.</span><span class="token function">replace</span><span class="token punctuation">(</span><span class="token regex">/&#92;n/g</span><span class="token punctuation">,</span> <span class="token string">''</span><span class="token punctuation">)</span><span class="token interpolation-punctuation punctuation">&#125;</span></span><span class="token string">';
      const style = document.createElement('style');
      style.type = 'text/css';
      if (style.styleSheet) style.styleSheet.cssText = content;
      else style.appendChild(document.createTextNode(content));
      document.head.appendChild(style);
    </span><span class="token template-punctuation string">&#96;</span></span><span class="token punctuation">)</span><span class="token punctuation">;</span>
  <span class="token punctuation">&#125;</span>
  <span class="token comment">// highlight-end</span>
<span class="token punctuation">&#125;</span></code>` + "";

	let t181;
	let section5;
	let h23;
	let a21;
	let t182;
	let t183;
	let p36;
	let t184;
	let t185;
	let ul4;
	let li14;
	let t186;
	let t187;
	let li15;
	let t188;
	let t189;
	let li16;
	let t190;
	let t191;
	let p37;
	let t192;
	let a22;
	let t193;
	let t194;
	let t195;
	let p38;
	let t196;
	let code20;
	let t197;
	let t198;
	let code21;
	let t199;
	let t200;
	let code22;
	let t201;
	let t202;
	let t203;
	let pre14;

	let raw14_value = `<code class="language-js"><span class="token comment">// filename: index.js</span>

<span class="token comment">// highlight-start</span>
<span class="token keyword">function</span> <span class="token function">_build</span><span class="token punctuation">(</span><span class="token parameter"><span class="token punctuation">&#123;</span> entryFile<span class="token punctuation">,</span> htmlTemplatePath <span class="token punctuation">&#125;</span></span><span class="token punctuation">)</span> <span class="token punctuation">&#123;</span>
  <span class="token comment">// build dependency graph</span>
  <span class="token keyword">const</span> graph <span class="token operator">=</span> <span class="token function">createDependencyGraph</span><span class="token punctuation">(</span>entryFile<span class="token punctuation">)</span><span class="token punctuation">;</span>
  <span class="token comment">// bundle the asset</span>
  <span class="token keyword">const</span> outputFiles <span class="token operator">=</span> <span class="token function">bundle</span><span class="token punctuation">(</span>graph<span class="token punctuation">)</span><span class="token punctuation">;</span>
  outputFiles<span class="token punctuation">.</span><span class="token function">push</span><span class="token punctuation">(</span><span class="token function">generateHTMLTemplate</span><span class="token punctuation">(</span>htmlTemplatePath<span class="token punctuation">,</span> outputFiles<span class="token punctuation">)</span><span class="token punctuation">)</span><span class="token punctuation">;</span>
  <span class="token keyword">return</span> <span class="token punctuation">&#123;</span> outputFiles<span class="token punctuation">,</span> graph <span class="token punctuation">&#125;</span><span class="token punctuation">;</span>
<span class="token punctuation">&#125;</span>
<span class="token comment">// highlight-end</span>

<span class="token keyword">function</span> <span class="token function">build</span><span class="token punctuation">(</span><span class="token parameter"><span class="token punctuation">&#123;</span> entryFile<span class="token punctuation">,</span> outputFolder<span class="token punctuation">,</span> htmlTemplatePath <span class="token punctuation">&#125;</span></span><span class="token punctuation">)</span> <span class="token punctuation">&#123;</span>
  <span class="token comment">// highlight-next-line</span>
  <span class="token keyword">const</span> <span class="token punctuation">&#123;</span> outputFiles <span class="token punctuation">&#125;</span> <span class="token operator">=</span> <span class="token function">_build</span><span class="token punctuation">(</span><span class="token punctuation">&#123;</span> entryFile<span class="token punctuation">,</span> htmlTemplatePath <span class="token punctuation">&#125;</span><span class="token punctuation">)</span><span class="token punctuation">;</span>
  <span class="token comment">// write to output folder</span>
  <span class="token comment">// ...</span>
<span class="token punctuation">&#125;</span>

<span class="token comment">// highlight-start</span>
<span class="token keyword">function</span> <span class="token function">dev</span><span class="token punctuation">(</span><span class="token parameter"><span class="token punctuation">&#123;</span> entryFile<span class="token punctuation">,</span> outputFolder<span class="token punctuation">,</span> htmlTemplatePath<span class="token punctuation">,</span> devServerOptions <span class="token punctuation">&#125;</span></span><span class="token punctuation">)</span> <span class="token punctuation">&#123;</span>
  <span class="token keyword">const</span> <span class="token punctuation">&#123;</span> outputFiles <span class="token punctuation">&#125;</span> <span class="token operator">=</span> <span class="token function">_build</span><span class="token punctuation">(</span><span class="token punctuation">&#123;</span> entryFile<span class="token punctuation">,</span> htmlTemplatePath <span class="token punctuation">&#125;</span><span class="token punctuation">)</span><span class="token punctuation">;</span>
<span class="token punctuation">&#125;</span></code>` + "";

	let t204;
	let p39;
	let t205;
	let code23;
	let t206;
	let t207;
	let a23;
	let t208;
	let t209;
	let t210;
	let pre15;

	let raw15_value = `<code class="language-js"><span class="token comment">// filename: index.js</span>
<span class="token keyword">function</span> <span class="token function">dev</span><span class="token punctuation">(</span><span class="token parameter"><span class="token punctuation">&#123;</span> entryFile<span class="token punctuation">,</span> outputFolder<span class="token punctuation">,</span> htmlTemplatePath<span class="token punctuation">,</span> devServerOptions <span class="token punctuation">&#125;</span></span><span class="token punctuation">)</span> <span class="token punctuation">&#123;</span>
  <span class="token keyword">const</span> <span class="token punctuation">&#123;</span> outputFiles <span class="token punctuation">&#125;</span> <span class="token operator">=</span> <span class="token function">_build</span><span class="token punctuation">(</span><span class="token punctuation">&#123;</span> entryFile<span class="token punctuation">,</span> htmlTemplatePath <span class="token punctuation">&#125;</span><span class="token punctuation">)</span><span class="token punctuation">;</span>

  <span class="token comment">// highlight-start</span>
  <span class="token comment">// create a map of [filename] -> content</span>
  <span class="token keyword">const</span> outputFileMap <span class="token operator">=</span> <span class="token punctuation">&#123;</span><span class="token punctuation">&#125;</span><span class="token punctuation">;</span>
  <span class="token keyword">for</span> <span class="token punctuation">(</span><span class="token keyword">const</span> outputFile <span class="token keyword">of</span> outputFiles<span class="token punctuation">)</span> <span class="token punctuation">&#123;</span>
    outputFileMap<span class="token punctuation">[</span>outputFile<span class="token punctuation">.</span>name<span class="token punctuation">]</span> <span class="token operator">=</span> outputFile<span class="token punctuation">.</span>content<span class="token punctuation">;</span>
  <span class="token punctuation">&#125;</span>
  <span class="token keyword">const</span> indexHtml <span class="token operator">=</span> outputFileMap<span class="token punctuation">[</span><span class="token string">'index.html'</span><span class="token punctuation">]</span><span class="token punctuation">;</span>

  <span class="token keyword">const</span> app <span class="token operator">=</span> <span class="token function">express</span><span class="token punctuation">(</span><span class="token punctuation">)</span><span class="token punctuation">;</span>
  app<span class="token punctuation">.</span><span class="token function">use</span><span class="token punctuation">(</span><span class="token punctuation">(</span><span class="token parameter">req<span class="token punctuation">,</span> res</span><span class="token punctuation">)</span> <span class="token operator">=></span> <span class="token punctuation">&#123;</span>
    <span class="token comment">// trim off preceding slash '/'</span>
    <span class="token keyword">const</span> requestFile <span class="token operator">=</span> req<span class="token punctuation">.</span>path<span class="token punctuation">.</span><span class="token function">slice</span><span class="token punctuation">(</span><span class="token number">1</span><span class="token punctuation">)</span><span class="token punctuation">;</span>
    <span class="token keyword">if</span> <span class="token punctuation">(</span>outputFileMap<span class="token punctuation">[</span>requestFile<span class="token punctuation">]</span><span class="token punctuation">)</span> <span class="token punctuation">&#123;</span>
      <span class="token keyword">return</span> res<span class="token punctuation">.</span><span class="token function">send</span><span class="token punctuation">(</span>outputFileMap<span class="token punctuation">[</span>requestFile<span class="token punctuation">]</span><span class="token punctuation">)</span><span class="token punctuation">;</span>
    <span class="token punctuation">&#125;</span>
    res<span class="token punctuation">.</span><span class="token function">send</span><span class="token punctuation">(</span>indexHtml<span class="token punctuation">)</span><span class="token punctuation">;</span>
  <span class="token punctuation">&#125;</span><span class="token punctuation">)</span><span class="token punctuation">;</span>
  app<span class="token punctuation">.</span><span class="token function">listen</span><span class="token punctuation">(</span>devServerOptions<span class="token punctuation">.</span>port<span class="token punctuation">,</span> <span class="token punctuation">(</span><span class="token punctuation">)</span> <span class="token operator">=></span>
    console<span class="token punctuation">.</span><span class="token function">log</span><span class="token punctuation">(</span>
      <span class="token template-string"><span class="token template-punctuation string">&#96;</span><span class="token string">Dev server starts at http://localhost:</span><span class="token interpolation"><span class="token interpolation-punctuation punctuation">$&#123;</span>devServerOptions<span class="token punctuation">.</span>port<span class="token interpolation-punctuation punctuation">&#125;</span></span><span class="token template-punctuation string">&#96;</span></span>
    <span class="token punctuation">)</span>
  <span class="token punctuation">)</span><span class="token punctuation">;</span>
  <span class="token comment">// highlight-end</span>
<span class="token punctuation">&#125;</span></code>` + "";

	let t211;
	let p40;
	let t212;
	let t213;
	let section6;
	let h24;
	let a24;
	let t214;
	let t215;
	let p41;
	let t216;
	let a25;
	let t217;
	let t218;
	let t219;
	let pre16;

	let raw16_value = `<code class="language-js"><span class="token comment">// filename: main.js</span>
<span class="token keyword">import</span> squareArea <span class="token keyword">from</span> <span class="token string">'./square.js'</span><span class="token punctuation">;</span>
<span class="token keyword">import</span> circleArea <span class="token keyword">from</span> <span class="token string">'./circle.js'</span><span class="token punctuation">;</span>

<span class="token keyword">import</span> <span class="token punctuation">&#123;</span> createElement<span class="token punctuation">,</span> render <span class="token punctuation">&#125;</span> <span class="token keyword">from</span> <span class="token string">'preact'</span><span class="token punctuation">;</span>
<span class="token keyword">import</span> <span class="token string">'./style.css'</span><span class="token punctuation">;</span>
<span class="token keyword">export</span> <span class="token keyword">const</span> <span class="token constant">PI</span> <span class="token operator">=</span> <span class="token number">3.141</span><span class="token punctuation">;</span>

<span class="token function">render</span><span class="token punctuation">(</span>
  <span class="token function">createElement</span><span class="token punctuation">(</span>
    <span class="token string">'p'</span><span class="token punctuation">,</span>
    <span class="token punctuation">&#123;</span><span class="token punctuation">&#125;</span><span class="token punctuation">,</span>
    <span class="token function">createElement</span><span class="token punctuation">(</span><span class="token string">'p'</span><span class="token punctuation">,</span> <span class="token punctuation">&#123;</span> <span class="token keyword">class</span><span class="token punctuation">:</span> <span class="token string">'square'</span> <span class="token punctuation">&#125;</span><span class="token punctuation">,</span> <span class="token string">'area of square: '</span> <span class="token operator">+</span> <span class="token function">squareArea</span><span class="token punctuation">(</span><span class="token number">5</span><span class="token punctuation">)</span><span class="token punctuation">)</span><span class="token punctuation">,</span>
    <span class="token function">createElement</span><span class="token punctuation">(</span><span class="token string">'p'</span><span class="token punctuation">,</span> <span class="token punctuation">&#123;</span> <span class="token keyword">class</span><span class="token punctuation">:</span> <span class="token string">'circle'</span> <span class="token punctuation">&#125;</span><span class="token punctuation">,</span> <span class="token string">'area of circle: '</span> <span class="token operator">+</span> <span class="token function">circleArea</span><span class="token punctuation">(</span><span class="token number">5</span><span class="token punctuation">)</span><span class="token punctuation">)</span>
  <span class="token punctuation">)</span><span class="token punctuation">,</span>
  document<span class="token punctuation">.</span><span class="token function">getElementById</span><span class="token punctuation">(</span><span class="token string">'root'</span><span class="token punctuation">)</span>
<span class="token punctuation">)</span><span class="token punctuation">;</span></code>` + "";

	let t220;
	let pre17;

	let raw17_value = `<code class="language-css"><span class="token comment">/* filename: style.css */</span>
<span class="token selector">.square</span> <span class="token punctuation">&#123;</span>
  <span class="token property">color</span><span class="token punctuation">:</span> blue<span class="token punctuation">;</span>
<span class="token punctuation">&#125;</span>
<span class="token selector">.circle</span> <span class="token punctuation">&#123;</span>
  <span class="token property">color</span><span class="token punctuation">:</span> red<span class="token punctuation">;</span>
<span class="token punctuation">&#125;</span></code>` + "";

	let t221;
	let p42;
	let t222;
	let t223;
	let pre18;

	let raw18_value = `<code class="language-html"><span class="token comment">&lt;!-- filename: index.html --></span>
<span class="token tag"><span class="token tag"><span class="token punctuation">&lt;</span>html</span><span class="token punctuation">></span></span>
  <span class="token tag"><span class="token tag"><span class="token punctuation">&lt;</span>body</span><span class="token punctuation">></span></span>
    <span class="token tag"><span class="token tag"><span class="token punctuation">&lt;</span>div</span> <span class="token attr-name">id</span><span class="token attr-value"><span class="token punctuation">=</span><span class="token punctuation">"</span>root<span class="token punctuation">"</span></span><span class="token punctuation">></span></span><span class="token tag"><span class="token tag"><span class="token punctuation">&lt;/</span>div</span><span class="token punctuation">></span></span>
  <span class="token tag"><span class="token tag"><span class="token punctuation">&lt;/</span>body</span><span class="token punctuation">></span></span>
<span class="token tag"><span class="token tag"><span class="token punctuation">&lt;/</span>html</span><span class="token punctuation">></span></span></code>` + "";

	let t224;
	let p43;
	let t225;
	let t226;
	let p44;
	let picture1;
	let source2;
	let source3;
	let img1;
	let img1_src_value;
	let t227;
	let p45;
	let t228;
	let t229;
	let p46;
	let picture2;
	let source4;
	let source5;
	let img2;
	let img2_src_value;
	let t230;
	let section7;
	let h25;
	let a26;
	let t231;
	let t232;
	let p47;
	let t233;
	let t234;
	let ul5;
	let li17;
	let t235;
	let t236;
	let li18;
	let t237;
	let t238;
	let p48;
	let t239;
	let t240;
	let p49;
	let t241;
	let t242;
	let section8;
	let h26;
	let a27;
	let t243;
	let t244;
	let ul6;
	let li19;
	let a28;
	let t245;
	let t246;
	let li20;
	let a29;
	let t247;

	return {
		c() {
			section0 = element("section");
			ul1 = element("ul");
			li0 = element("li");
			a0 = element("a");
			t0 = text("Before we begin");
			li1 = element("li");
			a1 = element("a");
			t1 = text("Adding HTML Template");
			li2 = element("li");
			a2 = element("a");
			t2 = text("Adding CSS");
			ul0 = element("ul");
			li3 = element("li");
			a3 = element("a");
			t3 = text("Loaders");
			li4 = element("li");
			a4 = element("a");
			t4 = text("Dev Server");
			li5 = element("li");
			a5 = element("a");
			t5 = text("Wrap it up");
			li6 = element("li");
			a6 = element("a");
			t6 = text("Whats next?");
			li7 = element("li");
			a7 = element("a");
			t7 = text("References");
			t8 = space();
			p0 = element("p");
			t9 = text("In my ");
			a8 = element("a");
			t10 = text("previous article");
			t11 = text(", I showed you how I built a module bundler. With the module bundler I built, I bundled a simple Nodejs script to calculate the area for a square and a circle:");
			t12 = space();
			p1 = element("p");
			picture0 = element("picture");
			source0 = element("source");
			source1 = element("source");
			img0 = element("img");
			t13 = space();
			p2 = element("p");
			t14 = text("Today, I am going to share with y'all how I enhanced on my basic module bundler so that I can use it to bundle not just a NodeJS script, but a web application.");
			t15 = space();
			p3 = element("p");
			t16 = text("I will be showing how I added the following features:");
			t17 = space();
			ul2 = element("ul");
			li8 = element("li");
			a9 = element("a");
			t18 = text("Adding HTML Template");
			t19 = space();
			li9 = element("li");
			a10 = element("a");
			t20 = text("Adding CSS");
			t21 = space();
			li10 = element("li");
			a11 = element("a");
			t22 = text("Provide a dev server");
			t23 = space();
			hr0 = element("hr");
			t24 = space();
			p4 = element("p");
			t25 = text("⚠️ ");
			strong0 = element("strong");
			t26 = text("Warning: Tons of JavaScript code ahead. 🙈😱😨");
			t27 = text(" ⚠️");
			t28 = space();
			hr1 = element("hr");
			t29 = space();
			section1 = element("section");
			h20 = element("h2");
			a12 = element("a");
			t30 = text("Before we begin");
			t31 = space();
			p5 = element("p");
			t32 = text("I found an edge case bug in my module bundler if the module ends with a line comment, the output bundle might have a syntax error.");
			t33 = space();
			p6 = element("p");
			t34 = text("I've fixed the bug by appending a newline character to the end of the module code:");
			t35 = space();
			pre0 = element("pre");
			t36 = space();
			p7 = element("p");
			t37 = text("😎");
			t38 = space();
			p8 = element("p");
			t39 = text("Also, I've changed the resolver code, which used to only be able to resolve the relative path:");
			t40 = space();
			pre1 = element("pre");
			t41 = space();
			p9 = element("p");
			t42 = text("Now I can import libraries from ");
			code0 = element("code");
			t43 = text("node_modules/");
			t44 = text(".");
			t45 = space();
			p10 = element("p");
			em0 = element("em");
			t46 = text("Did I just said \"import libraries\"?");
			t47 = text(" 🙊");
			t48 = space();
			section2 = element("section");
			h21 = element("h2");
			a13 = element("a");
			t49 = text("Adding HTML Template");
			t50 = space();
			p11 = element("p");
			t51 = text("To bundle for the web, the most important piece is to have the HTML.");
			t52 = space();
			p12 = element("p");
			t53 = text("Usually, we provide an HTML template to the module bundler. And when the module bundler finishes the bundling process, it will come up with a list of files that is required to start the application and add them into the HTML file in the form of a ");
			code1 = element("code");
			t54 = text("<script>");
			t55 = text(" tag.");
			t56 = space();
			p13 = element("p");
			t57 = text("To illustrate here is the HTML template that I've prepared:");
			t58 = space();
			pre2 = element("pre");
			t59 = space();
			p14 = element("p");
			t60 = text("And at the end of the bundling process, the bundler generated the following files:");
			t61 = space();
			pre3 = element("pre");
			t62 = space();
			p15 = element("p");
			t63 = text("So the ");
			code2 = element("code");
			t64 = text("bundle.js");
			t65 = text(" is added into the final HTML file like this:");
			t66 = space();
			pre4 = element("pre");
			t67 = space();
			blockquote0 = element("blockquote");
			small0 = element("small");
			t68 = text("**NOTE:** the preceding slash (`/`) allows us to always fetch the JavaScript file relative from the root path. This is extremely useful for Single Page Application (SPA), where we serve the same HTML file irrelevant to the URL path.");
			t69 = space();
			p16 = element("p");
			t70 = text("Code wise, it is quite straightforward to implement this:");
			t71 = space();
			pre5 = element("pre");
			t72 = space();
			p17 = element("p");
			t73 = text("Here, I used a ");
			code3 = element("code");
			t74 = text(".replace(END_BODY_TAG, '...' + END_BODY_TAG)");
			t75 = text(" to insert the ");
			code4 = element("code");
			t76 = text("<script>");
			t77 = text(" tags before the end of the ");
			code5 = element("code");
			t78 = text("</body>");
			t79 = text(" tag.");
			t80 = space();
			blockquote1 = element("blockquote");
			small1 = element("small");
			t81 = text("**Note:** Read [here](https://www.codecademy.com/forum_questions/55dee24b937676fb5e000139) to learn why it's a best practice to add `<script>` tag at the end of the `");
			body = element("body");
			t82 = text("` tag.");
			t83 = space();
			section3 = element("section");
			h22 = element("h2");
			a14 = element("a");
			t84 = text("Adding CSS");
			t85 = space();
			p18 = element("p");
			t86 = text("Every web app has to have CSS in one way or another.");
			t87 = space();
			p19 = element("p");
			t88 = text("I added a css file and imported it from ");
			code6 = element("code");
			t89 = text("index.js");
			t90 = text(":");
			t91 = space();
			pre6 = element("pre");
			t92 = space();
			pre7 = element("pre");
			t93 = space();
			p20 = element("p");
			t94 = text("If I bundle my application now, I would see a ");
			code7 = element("code");
			t95 = text("SyntaxError");
			t96 = text(":");
			t97 = space();
			pre8 = element("pre");
			t98 = space();
			p21 = element("p");
			t99 = text("That is because I assumed all files are JavaScript files, and Babel would complain when trying to parse out the import statements.");
			t100 = space();
			p22 = element("p");
			t101 = text("So, I abstracted out ");
			code8 = element("code");
			t102 = text("Module");
			t103 = text(" as a base class, and created ");
			code9 = element("code");
			t104 = text("JSModule");
			t105 = text(" and ");
			code10 = element("code");
			t106 = text("CSSModule");
			t107 = text(":");
			t108 = space();
			pre9 = element("pre");
			t109 = space();
			p23 = element("p");
			t110 = text("In the ");
			code11 = element("code");
			t111 = text("createModule");
			t112 = text(" function, I need to create different ");
			code12 = element("code");
			t113 = text("Module");
			t114 = text(" based on the file extension:");
			t115 = space();
			pre10 = element("pre");
			t116 = space();
			section4 = element("section");
			h3 = element("h3");
			a15 = element("a");
			t117 = text("Loaders");
			t118 = space();
			p24 = element("p");
			t119 = text("Here I used the word ");
			code13 = element("code");
			t120 = text("\"LOADERS\"");
			t121 = text(", which I borrowed from ");
			a16 = element("a");
			t122 = text("webpack");
			t123 = text(".");
			t124 = space();
			p25 = element("p");
			t125 = text("According to webpack, ");
			em1 = element("em");
			t126 = text("\"");
			a17 = element("a");
			t127 = text("[loaders]");
			t128 = text(" enable webpack to preprocess files, [which] allows you to bundle any static resource way beyond JavaScript.\"");
			t129 = space();
			p26 = element("p");
			t130 = text("To take it from a different perspective, ");
			strong1 = element("strong");
			t131 = text("loaders");
			t132 = text(" are simple functions that transform any code into ");
			strong2 = element("strong");
			t133 = text("browser-executable JavaScript code");
			t134 = text(".");
			t135 = space();
			p27 = element("p");
			t136 = text("For example, if you import a CSS file, the CSS code in the file will pass through the loader function to be transformed into JS code. So that you can import a CSS file as if you are importing a JS file.");
			t137 = space();
			p28 = element("p");
			strong3 = element("strong");
			t138 = text("Wait, how are we going to transform CSS code into JS code?");
			t139 = space();
			p29 = element("p");
			t140 = text("Well, one way you can do that is to make the CSS code into a string by wrapping it around with quote marks ");
			code14 = element("code");
			t141 = text("'");
			t142 = text(", and programmatically add the CSS code into the HTML ");
			code15 = element("code");
			t143 = text("<head />");
			t144 = text(".");
			t145 = space();
			p30 = element("p");
			t146 = text("For example, taking the following CSS code:");
			t147 = space();
			pre11 = element("pre");
			t148 = space();
			p31 = element("p");
			t149 = text("and transform it into the following JS code:");
			t150 = space();
			pre12 = element("pre");
			t151 = space();
			p32 = element("p");
			t152 = text("This is in essence what ");
			a18 = element("a");
			t153 = text("style-loader");
			t154 = text(" is doing, except ");
			code16 = element("code");
			t155 = text("style-loader");
			t156 = text(" does even more:");
			t157 = space();
			ul3 = element("ul");
			li11 = element("li");
			t158 = text("supports hot reloading");
			t159 = space();
			li12 = element("li");
			t160 = text("provides different mode of injecting, ");
			code17 = element("code");
			t161 = text("styleTag");
			t162 = text(", ");
			code18 = element("code");
			t163 = text("singletonStyleTag");
			t164 = text(", ");
			code19 = element("code");
			t165 = text("linkTag");
			t166 = text(", ... etc.");
			t167 = space();
			li13 = element("li");
			t168 = text("provides different points in dom for injecting the style tag.");
			t169 = space();
			p33 = element("p");
			strong4 = element("strong");
			t170 = text("Did I mentioned \"browser-executable JavaScript code\"?");
			t171 = space();
			p34 = element("p");
			t172 = text("Yes, not all JavaScript code is executable in a browser if you are using next-generation syntaxes or constructs that is not yet available in the browser. That's why you need ");
			a19 = element("a");
			t173 = text("babel-loader");
			t174 = text(" for your JavaScript files, to make sure they can be run in all supported browsers.");
			t175 = space();
			hr2 = element("hr");
			t176 = space();
			p35 = element("p");
			t177 = text("So, I implemented the loader transform in CSSModule with ");
			a20 = element("a");
			t178 = text("template literals");
			t179 = text(":");
			t180 = space();
			pre13 = element("pre");
			t181 = space();
			section5 = element("section");
			h23 = element("h2");
			a21 = element("a");
			t182 = text("Dev Server");
			t183 = space();
			p36 = element("p");
			t184 = text("Dev server is a default feature for frontend build tools nowadays, it's common feature are:");
			t185 = space();
			ul4 = element("ul");
			li14 = element("li");
			t186 = text("Serving generated assets, assets can be either served from the filesystem or in memory");
			t187 = space();
			li15 = element("li");
			t188 = text("Supports watch mode, reloading and hot module replacement");
			t189 = space();
			li16 = element("li");
			t190 = text("Act as a proxy to external APIs");
			t191 = space();
			p37 = element("p");
			t192 = text("In this post, I will show you how I created a basic dev server using ");
			a22 = element("a");
			t193 = text("Express");
			t194 = text(" for serving the generated assets in memory, we will discuss the watch mode in the future post.");
			t195 = space();
			p38 = element("p");
			t196 = text("I abstracted out the ");
			code20 = element("code");
			t197 = text("_build");
			t198 = text(" function and supports both ");
			code21 = element("code");
			t199 = text("build");
			t200 = text(" and ");
			code22 = element("code");
			t201 = text("dev");
			t202 = text(" mode.");
			t203 = space();
			pre14 = element("pre");
			t204 = space();
			p39 = element("p");
			t205 = text("In ");
			code23 = element("code");
			t206 = text("dev");
			t207 = text(" mode, I did not write files to the file system, instead I served them directly through the ");
			a23 = element("a");
			t208 = text("Express");
			t209 = text(" server:");
			t210 = space();
			pre15 = element("pre");
			t211 = space();
			p40 = element("p");
			t212 = text("And that's it. You have a basic dev server that serves the bundled files!");
			t213 = space();
			section6 = element("section");
			h24 = element("h2");
			a24 = element("a");
			t214 = text("Wrap it up");
			t215 = space();
			p41 = element("p");
			t216 = text("I've added ");
			a25 = element("a");
			t217 = text("Preact");
			t218 = text(" and CSS into my app:");
			t219 = space();
			pre16 = element("pre");
			t220 = space();
			pre17 = element("pre");
			t221 = space();
			p42 = element("p");
			t222 = text("And also an HTML template:");
			t223 = space();
			pre18 = element("pre");
			t224 = space();
			p43 = element("p");
			t225 = text("Starting my bundler:");
			t226 = space();
			p44 = element("p");
			picture1 = element("picture");
			source2 = element("source");
			source3 = element("source");
			img1 = element("img");
			t227 = space();
			p45 = element("p");
			t228 = text("And voila!");
			t229 = space();
			p46 = element("p");
			picture2 = element("picture");
			source4 = element("source");
			source5 = element("source");
			img2 = element("img");
			t230 = space();
			section7 = element("section");
			h25 = element("h2");
			a26 = element("a");
			t231 = text("Whats next?");
			t232 = space();
			p47 = element("p");
			t233 = text("I have promised in my previous post, features that I will implement:");
			t234 = space();
			ul5 = element("ul");
			li17 = element("li");
			t235 = text("code splitting");
			t236 = space();
			li18 = element("li");
			t237 = text("watch mode");
			t238 = space();
			p48 = element("p");
			t239 = text("and yes, I will implement them!");
			t240 = space();
			p49 = element("p");
			t241 = text("Till then. Cheers. 😎");
			t242 = space();
			section8 = element("section");
			h26 = element("h2");
			a27 = element("a");
			t243 = text("References");
			t244 = space();
			ul6 = element("ul");
			li19 = element("li");
			a28 = element("a");
			t245 = text("Webpack Dev Server");
			t246 = space();
			li20 = element("li");
			a29 = element("a");
			t247 = text("style-loader");
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
			t0 = claim_text(a0_nodes, "Before we begin");
			a0_nodes.forEach(detach);
			li0_nodes.forEach(detach);
			li1 = claim_element(ul1_nodes, "LI", {});
			var li1_nodes = children(li1);
			a1 = claim_element(li1_nodes, "A", { href: true });
			var a1_nodes = children(a1);
			t1 = claim_text(a1_nodes, "Adding HTML Template");
			a1_nodes.forEach(detach);
			li1_nodes.forEach(detach);
			li2 = claim_element(ul1_nodes, "LI", {});
			var li2_nodes = children(li2);
			a2 = claim_element(li2_nodes, "A", { href: true });
			var a2_nodes = children(a2);
			t2 = claim_text(a2_nodes, "Adding CSS");
			a2_nodes.forEach(detach);
			li2_nodes.forEach(detach);
			ul0 = claim_element(ul1_nodes, "UL", {});
			var ul0_nodes = children(ul0);
			li3 = claim_element(ul0_nodes, "LI", {});
			var li3_nodes = children(li3);
			a3 = claim_element(li3_nodes, "A", { href: true });
			var a3_nodes = children(a3);
			t3 = claim_text(a3_nodes, "Loaders");
			a3_nodes.forEach(detach);
			li3_nodes.forEach(detach);
			ul0_nodes.forEach(detach);
			li4 = claim_element(ul1_nodes, "LI", {});
			var li4_nodes = children(li4);
			a4 = claim_element(li4_nodes, "A", { href: true });
			var a4_nodes = children(a4);
			t4 = claim_text(a4_nodes, "Dev Server");
			a4_nodes.forEach(detach);
			li4_nodes.forEach(detach);
			li5 = claim_element(ul1_nodes, "LI", {});
			var li5_nodes = children(li5);
			a5 = claim_element(li5_nodes, "A", { href: true });
			var a5_nodes = children(a5);
			t5 = claim_text(a5_nodes, "Wrap it up");
			a5_nodes.forEach(detach);
			li5_nodes.forEach(detach);
			li6 = claim_element(ul1_nodes, "LI", {});
			var li6_nodes = children(li6);
			a6 = claim_element(li6_nodes, "A", { href: true });
			var a6_nodes = children(a6);
			t6 = claim_text(a6_nodes, "Whats next?");
			a6_nodes.forEach(detach);
			li6_nodes.forEach(detach);
			li7 = claim_element(ul1_nodes, "LI", {});
			var li7_nodes = children(li7);
			a7 = claim_element(li7_nodes, "A", { href: true });
			var a7_nodes = children(a7);
			t7 = claim_text(a7_nodes, "References");
			a7_nodes.forEach(detach);
			li7_nodes.forEach(detach);
			ul1_nodes.forEach(detach);
			section0_nodes.forEach(detach);
			t8 = claim_space(nodes);
			p0 = claim_element(nodes, "P", {});
			var p0_nodes = children(p0);
			t9 = claim_text(p0_nodes, "In my ");
			a8 = claim_element(p0_nodes, "A", { href: true });
			var a8_nodes = children(a8);
			t10 = claim_text(a8_nodes, "previous article");
			a8_nodes.forEach(detach);
			t11 = claim_text(p0_nodes, ", I showed you how I built a module bundler. With the module bundler I built, I bundled a simple Nodejs script to calculate the area for a square and a circle:");
			p0_nodes.forEach(detach);
			t12 = claim_space(nodes);
			p1 = claim_element(nodes, "P", {});
			var p1_nodes = children(p1);
			picture0 = claim_element(p1_nodes, "PICTURE", {});
			var picture0_nodes = children(picture0);
			source0 = claim_element(picture0_nodes, "SOURCE", { type: true, srcset: true });
			source1 = claim_element(picture0_nodes, "SOURCE", { type: true, srcset: true });
			img0 = claim_element(picture0_nodes, "IMG", { alt: true, src: true });
			picture0_nodes.forEach(detach);
			p1_nodes.forEach(detach);
			t13 = claim_space(nodes);
			p2 = claim_element(nodes, "P", {});
			var p2_nodes = children(p2);
			t14 = claim_text(p2_nodes, "Today, I am going to share with y'all how I enhanced on my basic module bundler so that I can use it to bundle not just a NodeJS script, but a web application.");
			p2_nodes.forEach(detach);
			t15 = claim_space(nodes);
			p3 = claim_element(nodes, "P", {});
			var p3_nodes = children(p3);
			t16 = claim_text(p3_nodes, "I will be showing how I added the following features:");
			p3_nodes.forEach(detach);
			t17 = claim_space(nodes);
			ul2 = claim_element(nodes, "UL", {});
			var ul2_nodes = children(ul2);
			li8 = claim_element(ul2_nodes, "LI", {});
			var li8_nodes = children(li8);
			a9 = claim_element(li8_nodes, "A", { href: true });
			var a9_nodes = children(a9);
			t18 = claim_text(a9_nodes, "Adding HTML Template");
			a9_nodes.forEach(detach);
			li8_nodes.forEach(detach);
			t19 = claim_space(ul2_nodes);
			li9 = claim_element(ul2_nodes, "LI", {});
			var li9_nodes = children(li9);
			a10 = claim_element(li9_nodes, "A", { href: true });
			var a10_nodes = children(a10);
			t20 = claim_text(a10_nodes, "Adding CSS");
			a10_nodes.forEach(detach);
			li9_nodes.forEach(detach);
			t21 = claim_space(ul2_nodes);
			li10 = claim_element(ul2_nodes, "LI", {});
			var li10_nodes = children(li10);
			a11 = claim_element(li10_nodes, "A", { href: true });
			var a11_nodes = children(a11);
			t22 = claim_text(a11_nodes, "Provide a dev server");
			a11_nodes.forEach(detach);
			li10_nodes.forEach(detach);
			ul2_nodes.forEach(detach);
			t23 = claim_space(nodes);
			hr0 = claim_element(nodes, "HR", {});
			t24 = claim_space(nodes);
			p4 = claim_element(nodes, "P", {});
			var p4_nodes = children(p4);
			t25 = claim_text(p4_nodes, "⚠️ ");
			strong0 = claim_element(p4_nodes, "STRONG", {});
			var strong0_nodes = children(strong0);
			t26 = claim_text(strong0_nodes, "Warning: Tons of JavaScript code ahead. 🙈😱😨");
			strong0_nodes.forEach(detach);
			t27 = claim_text(p4_nodes, " ⚠️");
			p4_nodes.forEach(detach);
			t28 = claim_space(nodes);
			hr1 = claim_element(nodes, "HR", {});
			t29 = claim_space(nodes);
			section1 = claim_element(nodes, "SECTION", {});
			var section1_nodes = children(section1);
			h20 = claim_element(section1_nodes, "H2", {});
			var h20_nodes = children(h20);
			a12 = claim_element(h20_nodes, "A", { href: true, id: true });
			var a12_nodes = children(a12);
			t30 = claim_text(a12_nodes, "Before we begin");
			a12_nodes.forEach(detach);
			h20_nodes.forEach(detach);
			t31 = claim_space(section1_nodes);
			p5 = claim_element(section1_nodes, "P", {});
			var p5_nodes = children(p5);
			t32 = claim_text(p5_nodes, "I found an edge case bug in my module bundler if the module ends with a line comment, the output bundle might have a syntax error.");
			p5_nodes.forEach(detach);
			t33 = claim_space(section1_nodes);
			p6 = claim_element(section1_nodes, "P", {});
			var p6_nodes = children(p6);
			t34 = claim_text(p6_nodes, "I've fixed the bug by appending a newline character to the end of the module code:");
			p6_nodes.forEach(detach);
			t35 = claim_space(section1_nodes);
			pre0 = claim_element(section1_nodes, "PRE", { class: true });
			var pre0_nodes = children(pre0);
			pre0_nodes.forEach(detach);
			t36 = claim_space(section1_nodes);
			p7 = claim_element(section1_nodes, "P", {});
			var p7_nodes = children(p7);
			t37 = claim_text(p7_nodes, "😎");
			p7_nodes.forEach(detach);
			t38 = claim_space(section1_nodes);
			p8 = claim_element(section1_nodes, "P", {});
			var p8_nodes = children(p8);
			t39 = claim_text(p8_nodes, "Also, I've changed the resolver code, which used to only be able to resolve the relative path:");
			p8_nodes.forEach(detach);
			t40 = claim_space(section1_nodes);
			pre1 = claim_element(section1_nodes, "PRE", { class: true });
			var pre1_nodes = children(pre1);
			pre1_nodes.forEach(detach);
			t41 = claim_space(section1_nodes);
			p9 = claim_element(section1_nodes, "P", {});
			var p9_nodes = children(p9);
			t42 = claim_text(p9_nodes, "Now I can import libraries from ");
			code0 = claim_element(p9_nodes, "CODE", {});
			var code0_nodes = children(code0);
			t43 = claim_text(code0_nodes, "node_modules/");
			code0_nodes.forEach(detach);
			t44 = claim_text(p9_nodes, ".");
			p9_nodes.forEach(detach);
			t45 = claim_space(section1_nodes);
			p10 = claim_element(section1_nodes, "P", {});
			var p10_nodes = children(p10);
			em0 = claim_element(p10_nodes, "EM", {});
			var em0_nodes = children(em0);
			t46 = claim_text(em0_nodes, "Did I just said \"import libraries\"?");
			em0_nodes.forEach(detach);
			t47 = claim_text(p10_nodes, " 🙊");
			p10_nodes.forEach(detach);
			section1_nodes.forEach(detach);
			t48 = claim_space(nodes);
			section2 = claim_element(nodes, "SECTION", {});
			var section2_nodes = children(section2);
			h21 = claim_element(section2_nodes, "H2", {});
			var h21_nodes = children(h21);
			a13 = claim_element(h21_nodes, "A", { href: true, id: true });
			var a13_nodes = children(a13);
			t49 = claim_text(a13_nodes, "Adding HTML Template");
			a13_nodes.forEach(detach);
			h21_nodes.forEach(detach);
			t50 = claim_space(section2_nodes);
			p11 = claim_element(section2_nodes, "P", {});
			var p11_nodes = children(p11);
			t51 = claim_text(p11_nodes, "To bundle for the web, the most important piece is to have the HTML.");
			p11_nodes.forEach(detach);
			t52 = claim_space(section2_nodes);
			p12 = claim_element(section2_nodes, "P", {});
			var p12_nodes = children(p12);
			t53 = claim_text(p12_nodes, "Usually, we provide an HTML template to the module bundler. And when the module bundler finishes the bundling process, it will come up with a list of files that is required to start the application and add them into the HTML file in the form of a ");
			code1 = claim_element(p12_nodes, "CODE", {});
			var code1_nodes = children(code1);
			t54 = claim_text(code1_nodes, "<script>");
			code1_nodes.forEach(detach);
			t55 = claim_text(p12_nodes, " tag.");
			p12_nodes.forEach(detach);
			t56 = claim_space(section2_nodes);
			p13 = claim_element(section2_nodes, "P", {});
			var p13_nodes = children(p13);
			t57 = claim_text(p13_nodes, "To illustrate here is the HTML template that I've prepared:");
			p13_nodes.forEach(detach);
			t58 = claim_space(section2_nodes);
			pre2 = claim_element(section2_nodes, "PRE", { class: true });
			var pre2_nodes = children(pre2);
			pre2_nodes.forEach(detach);
			t59 = claim_space(section2_nodes);
			p14 = claim_element(section2_nodes, "P", {});
			var p14_nodes = children(p14);
			t60 = claim_text(p14_nodes, "And at the end of the bundling process, the bundler generated the following files:");
			p14_nodes.forEach(detach);
			t61 = claim_space(section2_nodes);
			pre3 = claim_element(section2_nodes, "PRE", { class: true });
			var pre3_nodes = children(pre3);
			pre3_nodes.forEach(detach);
			t62 = claim_space(section2_nodes);
			p15 = claim_element(section2_nodes, "P", {});
			var p15_nodes = children(p15);
			t63 = claim_text(p15_nodes, "So the ");
			code2 = claim_element(p15_nodes, "CODE", {});
			var code2_nodes = children(code2);
			t64 = claim_text(code2_nodes, "bundle.js");
			code2_nodes.forEach(detach);
			t65 = claim_text(p15_nodes, " is added into the final HTML file like this:");
			p15_nodes.forEach(detach);
			t66 = claim_space(section2_nodes);
			pre4 = claim_element(section2_nodes, "PRE", { class: true });
			var pre4_nodes = children(pre4);
			pre4_nodes.forEach(detach);
			t67 = claim_space(section2_nodes);
			blockquote0 = claim_element(section2_nodes, "BLOCKQUOTE", {});
			var blockquote0_nodes = children(blockquote0);
			small0 = claim_element(blockquote0_nodes, "SMALL", {});
			var small0_nodes = children(small0);
			t68 = claim_text(small0_nodes, "**NOTE:** the preceding slash (`/`) allows us to always fetch the JavaScript file relative from the root path. This is extremely useful for Single Page Application (SPA), where we serve the same HTML file irrelevant to the URL path.");
			small0_nodes.forEach(detach);
			blockquote0_nodes.forEach(detach);
			t69 = claim_space(section2_nodes);
			p16 = claim_element(section2_nodes, "P", {});
			var p16_nodes = children(p16);
			t70 = claim_text(p16_nodes, "Code wise, it is quite straightforward to implement this:");
			p16_nodes.forEach(detach);
			t71 = claim_space(section2_nodes);
			pre5 = claim_element(section2_nodes, "PRE", { class: true });
			var pre5_nodes = children(pre5);
			pre5_nodes.forEach(detach);
			t72 = claim_space(section2_nodes);
			p17 = claim_element(section2_nodes, "P", {});
			var p17_nodes = children(p17);
			t73 = claim_text(p17_nodes, "Here, I used a ");
			code3 = claim_element(p17_nodes, "CODE", {});
			var code3_nodes = children(code3);
			t74 = claim_text(code3_nodes, ".replace(END_BODY_TAG, '...' + END_BODY_TAG)");
			code3_nodes.forEach(detach);
			t75 = claim_text(p17_nodes, " to insert the ");
			code4 = claim_element(p17_nodes, "CODE", {});
			var code4_nodes = children(code4);
			t76 = claim_text(code4_nodes, "<script>");
			code4_nodes.forEach(detach);
			t77 = claim_text(p17_nodes, " tags before the end of the ");
			code5 = claim_element(p17_nodes, "CODE", {});
			var code5_nodes = children(code5);
			t78 = claim_text(code5_nodes, "</body>");
			code5_nodes.forEach(detach);
			t79 = claim_text(p17_nodes, " tag.");
			p17_nodes.forEach(detach);
			t80 = claim_space(section2_nodes);
			blockquote1 = claim_element(section2_nodes, "BLOCKQUOTE", {});
			var blockquote1_nodes = children(blockquote1);
			small1 = claim_element(blockquote1_nodes, "SMALL", {});
			var small1_nodes = children(small1);
			t81 = claim_text(small1_nodes, "**Note:** Read [here](https://www.codecademy.com/forum_questions/55dee24b937676fb5e000139) to learn why it's a best practice to add `<script>` tag at the end of the `");
			body = claim_element(small1_nodes, "BODY", {});
			var body_nodes = children(body);
			t82 = claim_text(body_nodes, "` tag.");
			body_nodes.forEach(detach);
			small1_nodes.forEach(detach);
			blockquote1_nodes.forEach(detach);
			section2_nodes.forEach(detach);
			t83 = claim_space(nodes);
			section3 = claim_element(nodes, "SECTION", {});
			var section3_nodes = children(section3);
			h22 = claim_element(section3_nodes, "H2", {});
			var h22_nodes = children(h22);
			a14 = claim_element(h22_nodes, "A", { href: true, id: true });
			var a14_nodes = children(a14);
			t84 = claim_text(a14_nodes, "Adding CSS");
			a14_nodes.forEach(detach);
			h22_nodes.forEach(detach);
			t85 = claim_space(section3_nodes);
			p18 = claim_element(section3_nodes, "P", {});
			var p18_nodes = children(p18);
			t86 = claim_text(p18_nodes, "Every web app has to have CSS in one way or another.");
			p18_nodes.forEach(detach);
			t87 = claim_space(section3_nodes);
			p19 = claim_element(section3_nodes, "P", {});
			var p19_nodes = children(p19);
			t88 = claim_text(p19_nodes, "I added a css file and imported it from ");
			code6 = claim_element(p19_nodes, "CODE", {});
			var code6_nodes = children(code6);
			t89 = claim_text(code6_nodes, "index.js");
			code6_nodes.forEach(detach);
			t90 = claim_text(p19_nodes, ":");
			p19_nodes.forEach(detach);
			t91 = claim_space(section3_nodes);
			pre6 = claim_element(section3_nodes, "PRE", { class: true });
			var pre6_nodes = children(pre6);
			pre6_nodes.forEach(detach);
			t92 = claim_space(section3_nodes);
			pre7 = claim_element(section3_nodes, "PRE", { class: true });
			var pre7_nodes = children(pre7);
			pre7_nodes.forEach(detach);
			t93 = claim_space(section3_nodes);
			p20 = claim_element(section3_nodes, "P", {});
			var p20_nodes = children(p20);
			t94 = claim_text(p20_nodes, "If I bundle my application now, I would see a ");
			code7 = claim_element(p20_nodes, "CODE", {});
			var code7_nodes = children(code7);
			t95 = claim_text(code7_nodes, "SyntaxError");
			code7_nodes.forEach(detach);
			t96 = claim_text(p20_nodes, ":");
			p20_nodes.forEach(detach);
			t97 = claim_space(section3_nodes);
			pre8 = claim_element(section3_nodes, "PRE", { class: true });
			var pre8_nodes = children(pre8);
			pre8_nodes.forEach(detach);
			t98 = claim_space(section3_nodes);
			p21 = claim_element(section3_nodes, "P", {});
			var p21_nodes = children(p21);
			t99 = claim_text(p21_nodes, "That is because I assumed all files are JavaScript files, and Babel would complain when trying to parse out the import statements.");
			p21_nodes.forEach(detach);
			t100 = claim_space(section3_nodes);
			p22 = claim_element(section3_nodes, "P", {});
			var p22_nodes = children(p22);
			t101 = claim_text(p22_nodes, "So, I abstracted out ");
			code8 = claim_element(p22_nodes, "CODE", {});
			var code8_nodes = children(code8);
			t102 = claim_text(code8_nodes, "Module");
			code8_nodes.forEach(detach);
			t103 = claim_text(p22_nodes, " as a base class, and created ");
			code9 = claim_element(p22_nodes, "CODE", {});
			var code9_nodes = children(code9);
			t104 = claim_text(code9_nodes, "JSModule");
			code9_nodes.forEach(detach);
			t105 = claim_text(p22_nodes, " and ");
			code10 = claim_element(p22_nodes, "CODE", {});
			var code10_nodes = children(code10);
			t106 = claim_text(code10_nodes, "CSSModule");
			code10_nodes.forEach(detach);
			t107 = claim_text(p22_nodes, ":");
			p22_nodes.forEach(detach);
			t108 = claim_space(section3_nodes);
			pre9 = claim_element(section3_nodes, "PRE", { class: true });
			var pre9_nodes = children(pre9);
			pre9_nodes.forEach(detach);
			t109 = claim_space(section3_nodes);
			p23 = claim_element(section3_nodes, "P", {});
			var p23_nodes = children(p23);
			t110 = claim_text(p23_nodes, "In the ");
			code11 = claim_element(p23_nodes, "CODE", {});
			var code11_nodes = children(code11);
			t111 = claim_text(code11_nodes, "createModule");
			code11_nodes.forEach(detach);
			t112 = claim_text(p23_nodes, " function, I need to create different ");
			code12 = claim_element(p23_nodes, "CODE", {});
			var code12_nodes = children(code12);
			t113 = claim_text(code12_nodes, "Module");
			code12_nodes.forEach(detach);
			t114 = claim_text(p23_nodes, " based on the file extension:");
			p23_nodes.forEach(detach);
			t115 = claim_space(section3_nodes);
			pre10 = claim_element(section3_nodes, "PRE", { class: true });
			var pre10_nodes = children(pre10);
			pre10_nodes.forEach(detach);
			section3_nodes.forEach(detach);
			t116 = claim_space(nodes);
			section4 = claim_element(nodes, "SECTION", {});
			var section4_nodes = children(section4);
			h3 = claim_element(section4_nodes, "H3", {});
			var h3_nodes = children(h3);
			a15 = claim_element(h3_nodes, "A", { href: true, id: true });
			var a15_nodes = children(a15);
			t117 = claim_text(a15_nodes, "Loaders");
			a15_nodes.forEach(detach);
			h3_nodes.forEach(detach);
			t118 = claim_space(section4_nodes);
			p24 = claim_element(section4_nodes, "P", {});
			var p24_nodes = children(p24);
			t119 = claim_text(p24_nodes, "Here I used the word ");
			code13 = claim_element(p24_nodes, "CODE", {});
			var code13_nodes = children(code13);
			t120 = claim_text(code13_nodes, "\"LOADERS\"");
			code13_nodes.forEach(detach);
			t121 = claim_text(p24_nodes, ", which I borrowed from ");
			a16 = claim_element(p24_nodes, "A", { href: true, rel: true });
			var a16_nodes = children(a16);
			t122 = claim_text(a16_nodes, "webpack");
			a16_nodes.forEach(detach);
			t123 = claim_text(p24_nodes, ".");
			p24_nodes.forEach(detach);
			t124 = claim_space(section4_nodes);
			p25 = claim_element(section4_nodes, "P", {});
			var p25_nodes = children(p25);
			t125 = claim_text(p25_nodes, "According to webpack, ");
			em1 = claim_element(p25_nodes, "EM", {});
			var em1_nodes = children(em1);
			t126 = claim_text(em1_nodes, "\"");
			a17 = claim_element(em1_nodes, "A", { href: true, rel: true });
			var a17_nodes = children(a17);
			t127 = claim_text(a17_nodes, "[loaders]");
			a17_nodes.forEach(detach);
			t128 = claim_text(em1_nodes, " enable webpack to preprocess files, [which] allows you to bundle any static resource way beyond JavaScript.\"");
			em1_nodes.forEach(detach);
			p25_nodes.forEach(detach);
			t129 = claim_space(section4_nodes);
			p26 = claim_element(section4_nodes, "P", {});
			var p26_nodes = children(p26);
			t130 = claim_text(p26_nodes, "To take it from a different perspective, ");
			strong1 = claim_element(p26_nodes, "STRONG", {});
			var strong1_nodes = children(strong1);
			t131 = claim_text(strong1_nodes, "loaders");
			strong1_nodes.forEach(detach);
			t132 = claim_text(p26_nodes, " are simple functions that transform any code into ");
			strong2 = claim_element(p26_nodes, "STRONG", {});
			var strong2_nodes = children(strong2);
			t133 = claim_text(strong2_nodes, "browser-executable JavaScript code");
			strong2_nodes.forEach(detach);
			t134 = claim_text(p26_nodes, ".");
			p26_nodes.forEach(detach);
			t135 = claim_space(section4_nodes);
			p27 = claim_element(section4_nodes, "P", {});
			var p27_nodes = children(p27);
			t136 = claim_text(p27_nodes, "For example, if you import a CSS file, the CSS code in the file will pass through the loader function to be transformed into JS code. So that you can import a CSS file as if you are importing a JS file.");
			p27_nodes.forEach(detach);
			t137 = claim_space(section4_nodes);
			p28 = claim_element(section4_nodes, "P", {});
			var p28_nodes = children(p28);
			strong3 = claim_element(p28_nodes, "STRONG", {});
			var strong3_nodes = children(strong3);
			t138 = claim_text(strong3_nodes, "Wait, how are we going to transform CSS code into JS code?");
			strong3_nodes.forEach(detach);
			p28_nodes.forEach(detach);
			t139 = claim_space(section4_nodes);
			p29 = claim_element(section4_nodes, "P", {});
			var p29_nodes = children(p29);
			t140 = claim_text(p29_nodes, "Well, one way you can do that is to make the CSS code into a string by wrapping it around with quote marks ");
			code14 = claim_element(p29_nodes, "CODE", {});
			var code14_nodes = children(code14);
			t141 = claim_text(code14_nodes, "'");
			code14_nodes.forEach(detach);
			t142 = claim_text(p29_nodes, ", and programmatically add the CSS code into the HTML ");
			code15 = claim_element(p29_nodes, "CODE", {});
			var code15_nodes = children(code15);
			t143 = claim_text(code15_nodes, "<head />");
			code15_nodes.forEach(detach);
			t144 = claim_text(p29_nodes, ".");
			p29_nodes.forEach(detach);
			t145 = claim_space(section4_nodes);
			p30 = claim_element(section4_nodes, "P", {});
			var p30_nodes = children(p30);
			t146 = claim_text(p30_nodes, "For example, taking the following CSS code:");
			p30_nodes.forEach(detach);
			t147 = claim_space(section4_nodes);
			pre11 = claim_element(section4_nodes, "PRE", { class: true });
			var pre11_nodes = children(pre11);
			pre11_nodes.forEach(detach);
			t148 = claim_space(section4_nodes);
			p31 = claim_element(section4_nodes, "P", {});
			var p31_nodes = children(p31);
			t149 = claim_text(p31_nodes, "and transform it into the following JS code:");
			p31_nodes.forEach(detach);
			t150 = claim_space(section4_nodes);
			pre12 = claim_element(section4_nodes, "PRE", { class: true });
			var pre12_nodes = children(pre12);
			pre12_nodes.forEach(detach);
			t151 = claim_space(section4_nodes);
			p32 = claim_element(section4_nodes, "P", {});
			var p32_nodes = children(p32);
			t152 = claim_text(p32_nodes, "This is in essence what ");
			a18 = claim_element(p32_nodes, "A", { href: true, rel: true });
			var a18_nodes = children(a18);
			t153 = claim_text(a18_nodes, "style-loader");
			a18_nodes.forEach(detach);
			t154 = claim_text(p32_nodes, " is doing, except ");
			code16 = claim_element(p32_nodes, "CODE", {});
			var code16_nodes = children(code16);
			t155 = claim_text(code16_nodes, "style-loader");
			code16_nodes.forEach(detach);
			t156 = claim_text(p32_nodes, " does even more:");
			p32_nodes.forEach(detach);
			t157 = claim_space(section4_nodes);
			ul3 = claim_element(section4_nodes, "UL", {});
			var ul3_nodes = children(ul3);
			li11 = claim_element(ul3_nodes, "LI", {});
			var li11_nodes = children(li11);
			t158 = claim_text(li11_nodes, "supports hot reloading");
			li11_nodes.forEach(detach);
			t159 = claim_space(ul3_nodes);
			li12 = claim_element(ul3_nodes, "LI", {});
			var li12_nodes = children(li12);
			t160 = claim_text(li12_nodes, "provides different mode of injecting, ");
			code17 = claim_element(li12_nodes, "CODE", {});
			var code17_nodes = children(code17);
			t161 = claim_text(code17_nodes, "styleTag");
			code17_nodes.forEach(detach);
			t162 = claim_text(li12_nodes, ", ");
			code18 = claim_element(li12_nodes, "CODE", {});
			var code18_nodes = children(code18);
			t163 = claim_text(code18_nodes, "singletonStyleTag");
			code18_nodes.forEach(detach);
			t164 = claim_text(li12_nodes, ", ");
			code19 = claim_element(li12_nodes, "CODE", {});
			var code19_nodes = children(code19);
			t165 = claim_text(code19_nodes, "linkTag");
			code19_nodes.forEach(detach);
			t166 = claim_text(li12_nodes, ", ... etc.");
			li12_nodes.forEach(detach);
			t167 = claim_space(ul3_nodes);
			li13 = claim_element(ul3_nodes, "LI", {});
			var li13_nodes = children(li13);
			t168 = claim_text(li13_nodes, "provides different points in dom for injecting the style tag.");
			li13_nodes.forEach(detach);
			ul3_nodes.forEach(detach);
			t169 = claim_space(section4_nodes);
			p33 = claim_element(section4_nodes, "P", {});
			var p33_nodes = children(p33);
			strong4 = claim_element(p33_nodes, "STRONG", {});
			var strong4_nodes = children(strong4);
			t170 = claim_text(strong4_nodes, "Did I mentioned \"browser-executable JavaScript code\"?");
			strong4_nodes.forEach(detach);
			p33_nodes.forEach(detach);
			t171 = claim_space(section4_nodes);
			p34 = claim_element(section4_nodes, "P", {});
			var p34_nodes = children(p34);
			t172 = claim_text(p34_nodes, "Yes, not all JavaScript code is executable in a browser if you are using next-generation syntaxes or constructs that is not yet available in the browser. That's why you need ");
			a19 = claim_element(p34_nodes, "A", { href: true, rel: true });
			var a19_nodes = children(a19);
			t173 = claim_text(a19_nodes, "babel-loader");
			a19_nodes.forEach(detach);
			t174 = claim_text(p34_nodes, " for your JavaScript files, to make sure they can be run in all supported browsers.");
			p34_nodes.forEach(detach);
			t175 = claim_space(section4_nodes);
			hr2 = claim_element(section4_nodes, "HR", {});
			t176 = claim_space(section4_nodes);
			p35 = claim_element(section4_nodes, "P", {});
			var p35_nodes = children(p35);
			t177 = claim_text(p35_nodes, "So, I implemented the loader transform in CSSModule with ");
			a20 = claim_element(p35_nodes, "A", { href: true, rel: true });
			var a20_nodes = children(a20);
			t178 = claim_text(a20_nodes, "template literals");
			a20_nodes.forEach(detach);
			t179 = claim_text(p35_nodes, ":");
			p35_nodes.forEach(detach);
			t180 = claim_space(section4_nodes);
			pre13 = claim_element(section4_nodes, "PRE", { class: true });
			var pre13_nodes = children(pre13);
			pre13_nodes.forEach(detach);
			section4_nodes.forEach(detach);
			t181 = claim_space(nodes);
			section5 = claim_element(nodes, "SECTION", {});
			var section5_nodes = children(section5);
			h23 = claim_element(section5_nodes, "H2", {});
			var h23_nodes = children(h23);
			a21 = claim_element(h23_nodes, "A", { href: true, id: true });
			var a21_nodes = children(a21);
			t182 = claim_text(a21_nodes, "Dev Server");
			a21_nodes.forEach(detach);
			h23_nodes.forEach(detach);
			t183 = claim_space(section5_nodes);
			p36 = claim_element(section5_nodes, "P", {});
			var p36_nodes = children(p36);
			t184 = claim_text(p36_nodes, "Dev server is a default feature for frontend build tools nowadays, it's common feature are:");
			p36_nodes.forEach(detach);
			t185 = claim_space(section5_nodes);
			ul4 = claim_element(section5_nodes, "UL", {});
			var ul4_nodes = children(ul4);
			li14 = claim_element(ul4_nodes, "LI", {});
			var li14_nodes = children(li14);
			t186 = claim_text(li14_nodes, "Serving generated assets, assets can be either served from the filesystem or in memory");
			li14_nodes.forEach(detach);
			t187 = claim_space(ul4_nodes);
			li15 = claim_element(ul4_nodes, "LI", {});
			var li15_nodes = children(li15);
			t188 = claim_text(li15_nodes, "Supports watch mode, reloading and hot module replacement");
			li15_nodes.forEach(detach);
			t189 = claim_space(ul4_nodes);
			li16 = claim_element(ul4_nodes, "LI", {});
			var li16_nodes = children(li16);
			t190 = claim_text(li16_nodes, "Act as a proxy to external APIs");
			li16_nodes.forEach(detach);
			ul4_nodes.forEach(detach);
			t191 = claim_space(section5_nodes);
			p37 = claim_element(section5_nodes, "P", {});
			var p37_nodes = children(p37);
			t192 = claim_text(p37_nodes, "In this post, I will show you how I created a basic dev server using ");
			a22 = claim_element(p37_nodes, "A", { href: true, rel: true });
			var a22_nodes = children(a22);
			t193 = claim_text(a22_nodes, "Express");
			a22_nodes.forEach(detach);
			t194 = claim_text(p37_nodes, " for serving the generated assets in memory, we will discuss the watch mode in the future post.");
			p37_nodes.forEach(detach);
			t195 = claim_space(section5_nodes);
			p38 = claim_element(section5_nodes, "P", {});
			var p38_nodes = children(p38);
			t196 = claim_text(p38_nodes, "I abstracted out the ");
			code20 = claim_element(p38_nodes, "CODE", {});
			var code20_nodes = children(code20);
			t197 = claim_text(code20_nodes, "_build");
			code20_nodes.forEach(detach);
			t198 = claim_text(p38_nodes, " function and supports both ");
			code21 = claim_element(p38_nodes, "CODE", {});
			var code21_nodes = children(code21);
			t199 = claim_text(code21_nodes, "build");
			code21_nodes.forEach(detach);
			t200 = claim_text(p38_nodes, " and ");
			code22 = claim_element(p38_nodes, "CODE", {});
			var code22_nodes = children(code22);
			t201 = claim_text(code22_nodes, "dev");
			code22_nodes.forEach(detach);
			t202 = claim_text(p38_nodes, " mode.");
			p38_nodes.forEach(detach);
			t203 = claim_space(section5_nodes);
			pre14 = claim_element(section5_nodes, "PRE", { class: true });
			var pre14_nodes = children(pre14);
			pre14_nodes.forEach(detach);
			t204 = claim_space(section5_nodes);
			p39 = claim_element(section5_nodes, "P", {});
			var p39_nodes = children(p39);
			t205 = claim_text(p39_nodes, "In ");
			code23 = claim_element(p39_nodes, "CODE", {});
			var code23_nodes = children(code23);
			t206 = claim_text(code23_nodes, "dev");
			code23_nodes.forEach(detach);
			t207 = claim_text(p39_nodes, " mode, I did not write files to the file system, instead I served them directly through the ");
			a23 = claim_element(p39_nodes, "A", { href: true, rel: true });
			var a23_nodes = children(a23);
			t208 = claim_text(a23_nodes, "Express");
			a23_nodes.forEach(detach);
			t209 = claim_text(p39_nodes, " server:");
			p39_nodes.forEach(detach);
			t210 = claim_space(section5_nodes);
			pre15 = claim_element(section5_nodes, "PRE", { class: true });
			var pre15_nodes = children(pre15);
			pre15_nodes.forEach(detach);
			t211 = claim_space(section5_nodes);
			p40 = claim_element(section5_nodes, "P", {});
			var p40_nodes = children(p40);
			t212 = claim_text(p40_nodes, "And that's it. You have a basic dev server that serves the bundled files!");
			p40_nodes.forEach(detach);
			section5_nodes.forEach(detach);
			t213 = claim_space(nodes);
			section6 = claim_element(nodes, "SECTION", {});
			var section6_nodes = children(section6);
			h24 = claim_element(section6_nodes, "H2", {});
			var h24_nodes = children(h24);
			a24 = claim_element(h24_nodes, "A", { href: true, id: true });
			var a24_nodes = children(a24);
			t214 = claim_text(a24_nodes, "Wrap it up");
			a24_nodes.forEach(detach);
			h24_nodes.forEach(detach);
			t215 = claim_space(section6_nodes);
			p41 = claim_element(section6_nodes, "P", {});
			var p41_nodes = children(p41);
			t216 = claim_text(p41_nodes, "I've added ");
			a25 = claim_element(p41_nodes, "A", { href: true, rel: true });
			var a25_nodes = children(a25);
			t217 = claim_text(a25_nodes, "Preact");
			a25_nodes.forEach(detach);
			t218 = claim_text(p41_nodes, " and CSS into my app:");
			p41_nodes.forEach(detach);
			t219 = claim_space(section6_nodes);
			pre16 = claim_element(section6_nodes, "PRE", { class: true });
			var pre16_nodes = children(pre16);
			pre16_nodes.forEach(detach);
			t220 = claim_space(section6_nodes);
			pre17 = claim_element(section6_nodes, "PRE", { class: true });
			var pre17_nodes = children(pre17);
			pre17_nodes.forEach(detach);
			t221 = claim_space(section6_nodes);
			p42 = claim_element(section6_nodes, "P", {});
			var p42_nodes = children(p42);
			t222 = claim_text(p42_nodes, "And also an HTML template:");
			p42_nodes.forEach(detach);
			t223 = claim_space(section6_nodes);
			pre18 = claim_element(section6_nodes, "PRE", { class: true });
			var pre18_nodes = children(pre18);
			pre18_nodes.forEach(detach);
			t224 = claim_space(section6_nodes);
			p43 = claim_element(section6_nodes, "P", {});
			var p43_nodes = children(p43);
			t225 = claim_text(p43_nodes, "Starting my bundler:");
			p43_nodes.forEach(detach);
			t226 = claim_space(section6_nodes);
			p44 = claim_element(section6_nodes, "P", {});
			var p44_nodes = children(p44);
			picture1 = claim_element(p44_nodes, "PICTURE", {});
			var picture1_nodes = children(picture1);
			source2 = claim_element(picture1_nodes, "SOURCE", { type: true, srcset: true });
			source3 = claim_element(picture1_nodes, "SOURCE", { type: true, srcset: true });
			img1 = claim_element(picture1_nodes, "IMG", { alt: true, src: true });
			picture1_nodes.forEach(detach);
			p44_nodes.forEach(detach);
			t227 = claim_space(section6_nodes);
			p45 = claim_element(section6_nodes, "P", {});
			var p45_nodes = children(p45);
			t228 = claim_text(p45_nodes, "And voila!");
			p45_nodes.forEach(detach);
			t229 = claim_space(section6_nodes);
			p46 = claim_element(section6_nodes, "P", {});
			var p46_nodes = children(p46);
			picture2 = claim_element(p46_nodes, "PICTURE", {});
			var picture2_nodes = children(picture2);
			source4 = claim_element(picture2_nodes, "SOURCE", { type: true, srcset: true });
			source5 = claim_element(picture2_nodes, "SOURCE", { type: true, srcset: true });
			img2 = claim_element(picture2_nodes, "IMG", { alt: true, src: true });
			picture2_nodes.forEach(detach);
			p46_nodes.forEach(detach);
			section6_nodes.forEach(detach);
			t230 = claim_space(nodes);
			section7 = claim_element(nodes, "SECTION", {});
			var section7_nodes = children(section7);
			h25 = claim_element(section7_nodes, "H2", {});
			var h25_nodes = children(h25);
			a26 = claim_element(h25_nodes, "A", { href: true, id: true });
			var a26_nodes = children(a26);
			t231 = claim_text(a26_nodes, "Whats next?");
			a26_nodes.forEach(detach);
			h25_nodes.forEach(detach);
			t232 = claim_space(section7_nodes);
			p47 = claim_element(section7_nodes, "P", {});
			var p47_nodes = children(p47);
			t233 = claim_text(p47_nodes, "I have promised in my previous post, features that I will implement:");
			p47_nodes.forEach(detach);
			t234 = claim_space(section7_nodes);
			ul5 = claim_element(section7_nodes, "UL", {});
			var ul5_nodes = children(ul5);
			li17 = claim_element(ul5_nodes, "LI", {});
			var li17_nodes = children(li17);
			t235 = claim_text(li17_nodes, "code splitting");
			li17_nodes.forEach(detach);
			t236 = claim_space(ul5_nodes);
			li18 = claim_element(ul5_nodes, "LI", {});
			var li18_nodes = children(li18);
			t237 = claim_text(li18_nodes, "watch mode");
			li18_nodes.forEach(detach);
			ul5_nodes.forEach(detach);
			t238 = claim_space(section7_nodes);
			p48 = claim_element(section7_nodes, "P", {});
			var p48_nodes = children(p48);
			t239 = claim_text(p48_nodes, "and yes, I will implement them!");
			p48_nodes.forEach(detach);
			t240 = claim_space(section7_nodes);
			p49 = claim_element(section7_nodes, "P", {});
			var p49_nodes = children(p49);
			t241 = claim_text(p49_nodes, "Till then. Cheers. 😎");
			p49_nodes.forEach(detach);
			section7_nodes.forEach(detach);
			t242 = claim_space(nodes);
			section8 = claim_element(nodes, "SECTION", {});
			var section8_nodes = children(section8);
			h26 = claim_element(section8_nodes, "H2", {});
			var h26_nodes = children(h26);
			a27 = claim_element(h26_nodes, "A", { href: true, id: true });
			var a27_nodes = children(a27);
			t243 = claim_text(a27_nodes, "References");
			a27_nodes.forEach(detach);
			h26_nodes.forEach(detach);
			t244 = claim_space(section8_nodes);
			ul6 = claim_element(section8_nodes, "UL", {});
			var ul6_nodes = children(ul6);
			li19 = claim_element(ul6_nodes, "LI", {});
			var li19_nodes = children(li19);
			a28 = claim_element(li19_nodes, "A", { href: true, rel: true });
			var a28_nodes = children(a28);
			t245 = claim_text(a28_nodes, "Webpack Dev Server");
			a28_nodes.forEach(detach);
			li19_nodes.forEach(detach);
			t246 = claim_space(ul6_nodes);
			li20 = claim_element(ul6_nodes, "LI", {});
			var li20_nodes = children(li20);
			a29 = claim_element(li20_nodes, "A", { href: true, rel: true });
			var a29_nodes = children(a29);
			t247 = claim_text(a29_nodes, "style-loader");
			a29_nodes.forEach(detach);
			li20_nodes.forEach(detach);
			ul6_nodes.forEach(detach);
			section8_nodes.forEach(detach);
			this.h();
		},
		h() {
			attr(a0, "href", "#before-we-begin");
			attr(a1, "href", "#adding-html-template");
			attr(a2, "href", "#adding-css");
			attr(a3, "href", "#loaders");
			attr(a4, "href", "#dev-server");
			attr(a5, "href", "#wrap-it-up");
			attr(a6, "href", "#whats-next");
			attr(a7, "href", "#references");
			attr(ul1, "class", "sitemap");
			attr(ul1, "id", "sitemap");
			attr(ul1, "role", "navigation");
			attr(ul1, "aria-label", "Table of Contents");
			attr(a8, "href", "/i-wrote-my-module-bundler/");
			attr(source0, "type", "image/webp");
			attr(source0, "srcset", __build_img_webp__0);
			attr(source1, "type", "image/jpeg");
			attr(source1, "srcset", __build_img__0);
			attr(img0, "alt", "bundled code demo");
			if (img0.src !== (img0_src_value = __build_img__0)) attr(img0, "src", img0_src_value);
			attr(a9, "href", "#adding-html-template");
			attr(a10, "href", "#adding-css");
			attr(a11, "href", "#dev-server");
			attr(a12, "href", "#before-we-begin");
			attr(a12, "id", "before-we-begin");
			attr(pre0, "class", "language-js");
			attr(pre1, "class", "language-js");
			attr(a13, "href", "#adding-html-template");
			attr(a13, "id", "adding-html-template");
			attr(pre2, "class", "language-html");
			attr(pre3, "class", "language-yml");
			attr(pre4, "class", "language-html");
			attr(pre5, "class", "language-js");
			attr(a14, "href", "#adding-css");
			attr(a14, "id", "adding-css");
			attr(pre6, "class", "language-js");
			attr(pre7, "class", "language-css");
			attr(pre8, "class", "language-null");
			attr(pre9, "class", "language-js");
			attr(pre10, "class", "language-js");
			attr(a15, "href", "#loaders");
			attr(a15, "id", "loaders");
			attr(a16, "href", "https://webpack.js.org/loaders/");
			attr(a16, "rel", "nofollow");
			attr(a17, "href", "https://webpack.js.org/loaders/");
			attr(a17, "rel", "nofollow");
			attr(pre11, "class", "language-css");
			attr(pre12, "class", "language-js");
			attr(a18, "href", "https://github.com/webpack-contrib/style-loader");
			attr(a18, "rel", "nofollow");
			attr(a19, "href", "https://github.com/babel/babel-loader");
			attr(a19, "rel", "nofollow");
			attr(a20, "href", "https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Template_literals");
			attr(a20, "rel", "nofollow");
			attr(pre13, "class", "language-js");
			attr(a21, "href", "#dev-server");
			attr(a21, "id", "dev-server");
			attr(a22, "href", "https://expressjs.com");
			attr(a22, "rel", "nofollow");
			attr(pre14, "class", "language-js");
			attr(a23, "href", "https://expressjs.com");
			attr(a23, "rel", "nofollow");
			attr(pre15, "class", "language-js");
			attr(a24, "href", "#wrap-it-up");
			attr(a24, "id", "wrap-it-up");
			attr(a25, "href", "https://preactjs.com/");
			attr(a25, "rel", "nofollow");
			attr(pre16, "class", "language-js");
			attr(pre17, "class", "language-css");
			attr(pre18, "class", "language-html");
			attr(source2, "type", "image/webp");
			attr(source2, "srcset", __build_img_webp__1);
			attr(source3, "type", "image/jpeg");
			attr(source3, "srcset", __build_img__1);
			attr(img1, "alt", "Running bundler + dev server");
			if (img1.src !== (img1_src_value = __build_img__1)) attr(img1, "src", img1_src_value);
			attr(source4, "type", "image/webp");
			attr(source4, "srcset", __build_img_webp__2);
			attr(source5, "type", "image/jpeg");
			attr(source5, "srcset", __build_img__2);
			attr(img2, "alt", "Served results");
			if (img2.src !== (img2_src_value = __build_img__2)) attr(img2, "src", img2_src_value);
			attr(a26, "href", "#whats-next");
			attr(a26, "id", "whats-next");
			attr(a27, "href", "#references");
			attr(a27, "id", "references");
			attr(a28, "href", "https://github.com/webpack/webpack-dev-server");
			attr(a28, "rel", "nofollow");
			attr(a29, "href", "https://github.com/webpack-contrib/style-loader");
			attr(a29, "rel", "nofollow");
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
			append(ul1, li4);
			append(li4, a4);
			append(a4, t4);
			append(ul1, li5);
			append(li5, a5);
			append(a5, t5);
			append(ul1, li6);
			append(li6, a6);
			append(a6, t6);
			append(ul1, li7);
			append(li7, a7);
			append(a7, t7);
			insert(target, t8, anchor);
			insert(target, p0, anchor);
			append(p0, t9);
			append(p0, a8);
			append(a8, t10);
			append(p0, t11);
			insert(target, t12, anchor);
			insert(target, p1, anchor);
			append(p1, picture0);
			append(picture0, source0);
			append(picture0, source1);
			append(picture0, img0);
			insert(target, t13, anchor);
			insert(target, p2, anchor);
			append(p2, t14);
			insert(target, t15, anchor);
			insert(target, p3, anchor);
			append(p3, t16);
			insert(target, t17, anchor);
			insert(target, ul2, anchor);
			append(ul2, li8);
			append(li8, a9);
			append(a9, t18);
			append(ul2, t19);
			append(ul2, li9);
			append(li9, a10);
			append(a10, t20);
			append(ul2, t21);
			append(ul2, li10);
			append(li10, a11);
			append(a11, t22);
			insert(target, t23, anchor);
			insert(target, hr0, anchor);
			insert(target, t24, anchor);
			insert(target, p4, anchor);
			append(p4, t25);
			append(p4, strong0);
			append(strong0, t26);
			append(p4, t27);
			insert(target, t28, anchor);
			insert(target, hr1, anchor);
			insert(target, t29, anchor);
			insert(target, section1, anchor);
			append(section1, h20);
			append(h20, a12);
			append(a12, t30);
			append(section1, t31);
			append(section1, p5);
			append(p5, t32);
			append(section1, t33);
			append(section1, p6);
			append(p6, t34);
			append(section1, t35);
			append(section1, pre0);
			pre0.innerHTML = raw0_value;
			append(section1, t36);
			append(section1, p7);
			append(p7, t37);
			append(section1, t38);
			append(section1, p8);
			append(p8, t39);
			append(section1, t40);
			append(section1, pre1);
			pre1.innerHTML = raw1_value;
			append(section1, t41);
			append(section1, p9);
			append(p9, t42);
			append(p9, code0);
			append(code0, t43);
			append(p9, t44);
			append(section1, t45);
			append(section1, p10);
			append(p10, em0);
			append(em0, t46);
			append(p10, t47);
			insert(target, t48, anchor);
			insert(target, section2, anchor);
			append(section2, h21);
			append(h21, a13);
			append(a13, t49);
			append(section2, t50);
			append(section2, p11);
			append(p11, t51);
			append(section2, t52);
			append(section2, p12);
			append(p12, t53);
			append(p12, code1);
			append(code1, t54);
			append(p12, t55);
			append(section2, t56);
			append(section2, p13);
			append(p13, t57);
			append(section2, t58);
			append(section2, pre2);
			pre2.innerHTML = raw2_value;
			append(section2, t59);
			append(section2, p14);
			append(p14, t60);
			append(section2, t61);
			append(section2, pre3);
			pre3.innerHTML = raw3_value;
			append(section2, t62);
			append(section2, p15);
			append(p15, t63);
			append(p15, code2);
			append(code2, t64);
			append(p15, t65);
			append(section2, t66);
			append(section2, pre4);
			pre4.innerHTML = raw4_value;
			append(section2, t67);
			append(section2, blockquote0);
			append(blockquote0, small0);
			append(small0, t68);
			append(section2, t69);
			append(section2, p16);
			append(p16, t70);
			append(section2, t71);
			append(section2, pre5);
			pre5.innerHTML = raw5_value;
			append(section2, t72);
			append(section2, p17);
			append(p17, t73);
			append(p17, code3);
			append(code3, t74);
			append(p17, t75);
			append(p17, code4);
			append(code4, t76);
			append(p17, t77);
			append(p17, code5);
			append(code5, t78);
			append(p17, t79);
			append(section2, t80);
			append(section2, blockquote1);
			append(blockquote1, small1);
			append(small1, t81);
			append(small1, body);
			append(body, t82);
			insert(target, t83, anchor);
			insert(target, section3, anchor);
			append(section3, h22);
			append(h22, a14);
			append(a14, t84);
			append(section3, t85);
			append(section3, p18);
			append(p18, t86);
			append(section3, t87);
			append(section3, p19);
			append(p19, t88);
			append(p19, code6);
			append(code6, t89);
			append(p19, t90);
			append(section3, t91);
			append(section3, pre6);
			pre6.innerHTML = raw6_value;
			append(section3, t92);
			append(section3, pre7);
			pre7.innerHTML = raw7_value;
			append(section3, t93);
			append(section3, p20);
			append(p20, t94);
			append(p20, code7);
			append(code7, t95);
			append(p20, t96);
			append(section3, t97);
			append(section3, pre8);
			pre8.innerHTML = raw8_value;
			append(section3, t98);
			append(section3, p21);
			append(p21, t99);
			append(section3, t100);
			append(section3, p22);
			append(p22, t101);
			append(p22, code8);
			append(code8, t102);
			append(p22, t103);
			append(p22, code9);
			append(code9, t104);
			append(p22, t105);
			append(p22, code10);
			append(code10, t106);
			append(p22, t107);
			append(section3, t108);
			append(section3, pre9);
			pre9.innerHTML = raw9_value;
			append(section3, t109);
			append(section3, p23);
			append(p23, t110);
			append(p23, code11);
			append(code11, t111);
			append(p23, t112);
			append(p23, code12);
			append(code12, t113);
			append(p23, t114);
			append(section3, t115);
			append(section3, pre10);
			pre10.innerHTML = raw10_value;
			insert(target, t116, anchor);
			insert(target, section4, anchor);
			append(section4, h3);
			append(h3, a15);
			append(a15, t117);
			append(section4, t118);
			append(section4, p24);
			append(p24, t119);
			append(p24, code13);
			append(code13, t120);
			append(p24, t121);
			append(p24, a16);
			append(a16, t122);
			append(p24, t123);
			append(section4, t124);
			append(section4, p25);
			append(p25, t125);
			append(p25, em1);
			append(em1, t126);
			append(em1, a17);
			append(a17, t127);
			append(em1, t128);
			append(section4, t129);
			append(section4, p26);
			append(p26, t130);
			append(p26, strong1);
			append(strong1, t131);
			append(p26, t132);
			append(p26, strong2);
			append(strong2, t133);
			append(p26, t134);
			append(section4, t135);
			append(section4, p27);
			append(p27, t136);
			append(section4, t137);
			append(section4, p28);
			append(p28, strong3);
			append(strong3, t138);
			append(section4, t139);
			append(section4, p29);
			append(p29, t140);
			append(p29, code14);
			append(code14, t141);
			append(p29, t142);
			append(p29, code15);
			append(code15, t143);
			append(p29, t144);
			append(section4, t145);
			append(section4, p30);
			append(p30, t146);
			append(section4, t147);
			append(section4, pre11);
			pre11.innerHTML = raw11_value;
			append(section4, t148);
			append(section4, p31);
			append(p31, t149);
			append(section4, t150);
			append(section4, pre12);
			pre12.innerHTML = raw12_value;
			append(section4, t151);
			append(section4, p32);
			append(p32, t152);
			append(p32, a18);
			append(a18, t153);
			append(p32, t154);
			append(p32, code16);
			append(code16, t155);
			append(p32, t156);
			append(section4, t157);
			append(section4, ul3);
			append(ul3, li11);
			append(li11, t158);
			append(ul3, t159);
			append(ul3, li12);
			append(li12, t160);
			append(li12, code17);
			append(code17, t161);
			append(li12, t162);
			append(li12, code18);
			append(code18, t163);
			append(li12, t164);
			append(li12, code19);
			append(code19, t165);
			append(li12, t166);
			append(ul3, t167);
			append(ul3, li13);
			append(li13, t168);
			append(section4, t169);
			append(section4, p33);
			append(p33, strong4);
			append(strong4, t170);
			append(section4, t171);
			append(section4, p34);
			append(p34, t172);
			append(p34, a19);
			append(a19, t173);
			append(p34, t174);
			append(section4, t175);
			append(section4, hr2);
			append(section4, t176);
			append(section4, p35);
			append(p35, t177);
			append(p35, a20);
			append(a20, t178);
			append(p35, t179);
			append(section4, t180);
			append(section4, pre13);
			pre13.innerHTML = raw13_value;
			insert(target, t181, anchor);
			insert(target, section5, anchor);
			append(section5, h23);
			append(h23, a21);
			append(a21, t182);
			append(section5, t183);
			append(section5, p36);
			append(p36, t184);
			append(section5, t185);
			append(section5, ul4);
			append(ul4, li14);
			append(li14, t186);
			append(ul4, t187);
			append(ul4, li15);
			append(li15, t188);
			append(ul4, t189);
			append(ul4, li16);
			append(li16, t190);
			append(section5, t191);
			append(section5, p37);
			append(p37, t192);
			append(p37, a22);
			append(a22, t193);
			append(p37, t194);
			append(section5, t195);
			append(section5, p38);
			append(p38, t196);
			append(p38, code20);
			append(code20, t197);
			append(p38, t198);
			append(p38, code21);
			append(code21, t199);
			append(p38, t200);
			append(p38, code22);
			append(code22, t201);
			append(p38, t202);
			append(section5, t203);
			append(section5, pre14);
			pre14.innerHTML = raw14_value;
			append(section5, t204);
			append(section5, p39);
			append(p39, t205);
			append(p39, code23);
			append(code23, t206);
			append(p39, t207);
			append(p39, a23);
			append(a23, t208);
			append(p39, t209);
			append(section5, t210);
			append(section5, pre15);
			pre15.innerHTML = raw15_value;
			append(section5, t211);
			append(section5, p40);
			append(p40, t212);
			insert(target, t213, anchor);
			insert(target, section6, anchor);
			append(section6, h24);
			append(h24, a24);
			append(a24, t214);
			append(section6, t215);
			append(section6, p41);
			append(p41, t216);
			append(p41, a25);
			append(a25, t217);
			append(p41, t218);
			append(section6, t219);
			append(section6, pre16);
			pre16.innerHTML = raw16_value;
			append(section6, t220);
			append(section6, pre17);
			pre17.innerHTML = raw17_value;
			append(section6, t221);
			append(section6, p42);
			append(p42, t222);
			append(section6, t223);
			append(section6, pre18);
			pre18.innerHTML = raw18_value;
			append(section6, t224);
			append(section6, p43);
			append(p43, t225);
			append(section6, t226);
			append(section6, p44);
			append(p44, picture1);
			append(picture1, source2);
			append(picture1, source3);
			append(picture1, img1);
			append(section6, t227);
			append(section6, p45);
			append(p45, t228);
			append(section6, t229);
			append(section6, p46);
			append(p46, picture2);
			append(picture2, source4);
			append(picture2, source5);
			append(picture2, img2);
			insert(target, t230, anchor);
			insert(target, section7, anchor);
			append(section7, h25);
			append(h25, a26);
			append(a26, t231);
			append(section7, t232);
			append(section7, p47);
			append(p47, t233);
			append(section7, t234);
			append(section7, ul5);
			append(ul5, li17);
			append(li17, t235);
			append(ul5, t236);
			append(ul5, li18);
			append(li18, t237);
			append(section7, t238);
			append(section7, p48);
			append(p48, t239);
			append(section7, t240);
			append(section7, p49);
			append(p49, t241);
			insert(target, t242, anchor);
			insert(target, section8, anchor);
			append(section8, h26);
			append(h26, a27);
			append(a27, t243);
			append(section8, t244);
			append(section8, ul6);
			append(ul6, li19);
			append(li19, a28);
			append(a28, t245);
			append(ul6, t246);
			append(ul6, li20);
			append(li20, a29);
			append(a29, t247);
		},
		p: noop,
		d(detaching) {
			if (detaching) detach(section0);
			if (detaching) detach(t8);
			if (detaching) detach(p0);
			if (detaching) detach(t12);
			if (detaching) detach(p1);
			if (detaching) detach(t13);
			if (detaching) detach(p2);
			if (detaching) detach(t15);
			if (detaching) detach(p3);
			if (detaching) detach(t17);
			if (detaching) detach(ul2);
			if (detaching) detach(t23);
			if (detaching) detach(hr0);
			if (detaching) detach(t24);
			if (detaching) detach(p4);
			if (detaching) detach(t28);
			if (detaching) detach(hr1);
			if (detaching) detach(t29);
			if (detaching) detach(section1);
			if (detaching) detach(t48);
			if (detaching) detach(section2);
			if (detaching) detach(t83);
			if (detaching) detach(section3);
			if (detaching) detach(t116);
			if (detaching) detach(section4);
			if (detaching) detach(t181);
			if (detaching) detach(section5);
			if (detaching) detach(t213);
			if (detaching) detach(section6);
			if (detaching) detach(t230);
			if (detaching) detach(section7);
			if (detaching) detach(t242);
			if (detaching) detach(section8);
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
	"title": "I wrote my module bundler II",
	"date": "2019-10-16T08:00:00Z",
	"tags": ["JavaScript", "module bundler", "dev tool", "webpack"],
	"description": "We've built a simple bundler to bundle javascript code. Let's add CSS, HTML and serve it in the browser!",
	"series": "Write a module bundler",
	"slug": "i-wrote-my-module-bundler-ii-for-the-web",
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
