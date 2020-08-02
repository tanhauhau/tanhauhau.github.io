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

var __build_img__4 = "80e8f823e5b4f2cb.gif";

var __build_img__3 = "d10911dd5e5290cb.gif";

var __build_img__2 = "b807723ed9b9c3e8.gif";

var __build_img__1 = "02beb1668798238e.png";

var __build_img__0 = "9f7a3d90c2f3afab.png";

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

var image = "https://lihautan.com/personalised-development-workspace-with-chrome-extension/assets/hero-twitter-27164106.jpg";

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

// (33:2) {#each tags as tag}
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

// (72:2) {#each tags as tag}
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
					"@id": "https%3A%2F%2Flihautan.com%2Fpersonalised-development-workspace-with-chrome-extension",
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
			footer_nodes.forEach(detach);
			t8 = claim_space(nodes);
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
			attr(meta11, "content", "https%3A%2F%2Flihautan.com%2Fpersonalised-development-workspace-with-chrome-extension");
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
			insert(target, t8, anchor);
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
							"@id": "https%3A%2F%2Flihautan.com%2Fpersonalised-development-workspace-with-chrome-extension",
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
			current = true;
		},
		o(local) {
			transition_out(header.$$.fragment, local);
			transition_out(default_slot, local);
			transition_out(newsletter.$$.fragment, local);
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
			if (detaching) detach(t8);
			if (detaching) detach(html_anchor_2);
			if (detaching) html_tag_2.d();
		}
	};
}

function instance$1($$self, $$props, $$invalidate) {
	let { title } = $$props;
	let { description } = $$props;
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
		init(this, options, instance$1, create_fragment$2, safe_not_equal, { title: 0, description: 1, tags: 2 });
	}
}

/* content/talk/personalised-development-workspace-with-chrome-extension/@@page-markup.svelte generated by Svelte v3.24.0 */

function create_default_slot(ctx) {
	let section0;
	let ul3;
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
	let ul1;
	let li4;
	let a4;
	let t4;
	let ul0;
	let li5;
	let a5;
	let t5;
	let li6;
	let a6;
	let t6;
	let ul2;
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
	let t12;
	let p0;
	let t13;
	let t14;
	let p1;
	let t15;
	let t16;
	let section1;
	let h20;
	let a12;
	let t17;
	let t18;
	let p2;
	let t19;
	let t20;
	let p3;
	let t21;
	let a13;
	let t22;
	let t23;
	let a14;
	let t24;
	let t25;
	let t26;
	let p4;
	let t27;
	let t28;
	let section2;
	let h21;
	let a15;
	let t29;
	let t30;
	let p5;
	let t31;
	let a16;
	let t32;
	let t33;
	let a17;
	let t34;
	let t35;
	let a18;
	let t36;
	let t37;
	let a19;
	let t38;
	let t39;
	let t40;
	let p6;
	let t41;
	let strong0;
	let t42;
	let t43;
	let t44;
	let p7;
	let strong1;
	let t45;
	let t46;
	let t47;
	let p8;
	let strong2;
	let t48;
	let t49;
	let t50;
	let p9;
	let t51;
	let strong3;
	let t52;
	let t53;
	let t54;
	let ul4;
	let li12;
	let a20;
	let t55;
	let t56;
	let em0;
	let t57;
	let t58;
	let li13;
	let a21;
	let t59;
	let t60;
	let em1;
	let t61;
	let t62;
	let li14;
	let a22;
	let t63;
	let t64;
	let em2;
	let t65;
	let t66;
	let li15;
	let a23;
	let t67;
	let t68;
	let em3;
	let t69;
	let t70;
	let li16;
	let a24;
	let t71;
	let t72;
	let em4;
	let t73;
	let t74;
	let p10;
	let img0;
	let img0_src_value;
	let t75;
	let p11;
	let t76;
	let code0;
	let t77;
	let t78;
	let t79;
	let section3;
	let h22;
	let a25;
	let t80;
	let t81;
	let p12;
	let code1;
	let t82;
	let t83;
	let t84;
	let pre0;

	let raw0_value = `
<code class="language-json"><span class="token punctuation">&#123;</span>
  <span class="token comment">// information about extension</span>
  <span class="token property">"manifest_version"</span><span class="token operator">:</span> <span class="token number">2</span><span class="token punctuation">,</span>
  <span class="token property">"name"</span><span class="token operator">:</span> <span class="token string">"My Chrome extension 😎"</span><span class="token punctuation">,</span>
  <span class="token property">"version"</span><span class="token operator">:</span> <span class="token string">"1.0.0"</span><span class="token punctuation">,</span>
  <span class="token property">"description"</span><span class="token operator">:</span> <span class="token string">"My Chrome extension 😎"</span><span class="token punctuation">,</span>
  <span class="token comment">// icons</span>
  <span class="token property">"icons"</span><span class="token operator">:</span> <span class="token punctuation">&#123;</span>
    <span class="token property">"16"</span><span class="token operator">:</span> <span class="token string">"img_16.png"</span><span class="token punctuation">,</span>
    <span class="token property">"32"</span><span class="token operator">:</span> <span class="token string">"img_32.png"</span><span class="token punctuation">,</span>
    <span class="token property">"64"</span><span class="token operator">:</span> <span class="token string">"img_64.png"</span>
  <span class="token punctuation">&#125;</span><span class="token punctuation">,</span>
  <span class="token comment">// background script</span>
  <span class="token property">"background"</span><span class="token operator">:</span> <span class="token punctuation">&#123;</span>
    <span class="token property">"scripts"</span><span class="token operator">:</span> <span class="token punctuation">[</span><span class="token string">"background.js"</span><span class="token punctuation">]</span><span class="token punctuation">,</span>
    <span class="token property">"persistent"</span><span class="token operator">:</span> <span class="token boolean">false</span>
  <span class="token punctuation">&#125;</span><span class="token punctuation">,</span>
  <span class="token comment">// content script</span>
  <span class="token property">"content_scripts"</span><span class="token operator">:</span> <span class="token punctuation">[</span>
    <span class="token punctuation">&#123;</span>
      <span class="token property">"matches"</span><span class="token operator">:</span> <span class="token punctuation">[</span><span class="token string">"&lt;all_urls>"</span><span class="token punctuation">]</span><span class="token punctuation">,</span>
      <span class="token property">"js"</span><span class="token operator">:</span> <span class="token punctuation">[</span><span class="token string">"content.js"</span><span class="token punctuation">]</span><span class="token punctuation">,</span>
      <span class="token property">"run_at"</span><span class="token operator">:</span> <span class="token string">"document_start"</span><span class="token punctuation">,</span>
      <span class="token property">"all_frames"</span><span class="token operator">:</span> <span class="token boolean">true</span>
    <span class="token punctuation">&#125;</span>
  <span class="token punctuation">]</span><span class="token punctuation">,</span>
  <span class="token comment">// options page</span>
  <span class="token property">"options_page"</span><span class="token operator">:</span> <span class="token string">"options.html"</span><span class="token punctuation">,</span>
  <span class="token comment">// ui elements</span>
  <span class="token property">"browser_action"</span><span class="token operator">:</span> <span class="token punctuation">&#123;</span>
    <span class="token property">"default_title"</span><span class="token operator">:</span> <span class="token string">"My Chrome extension 😎"</span><span class="token punctuation">,</span>
    <span class="token property">"default_popup"</span><span class="token operator">:</span> <span class="token string">"popup.html"</span><span class="token punctuation">,</span>
    <span class="token property">"default_icon"</span><span class="token operator">:</span> <span class="token punctuation">&#123;</span>
      <span class="token property">"16"</span><span class="token operator">:</span> <span class="token string">"img_16.png"</span><span class="token punctuation">,</span>
      <span class="token property">"32"</span><span class="token operator">:</span> <span class="token string">"img_32.png"</span><span class="token punctuation">,</span>
      <span class="token property">"64"</span><span class="token operator">:</span> <span class="token string">"img_64.png"</span>
    <span class="token punctuation">&#125;</span>
  <span class="token punctuation">&#125;</span><span class="token punctuation">,</span>
  <span class="token property">"devtools_page"</span><span class="token operator">:</span> <span class="token string">"devtools.html"</span>
<span class="token punctuation">&#125;</span></code>` + "";

	let t85;
	let p13;
	let t86;
	let code2;
	let t87;
	let t88;
	let t89;
	let p14;
	let t90;
	let t91;
	let pre1;

	let raw1_value = `
<code class="language-js"><span class="token comment">// filename: background.js</span>
<span class="token keyword">const</span> iconPath <span class="token operator">=</span> <span class="token function">getIconBasedOnReactVersion</span><span class="token punctuation">(</span><span class="token punctuation">)</span><span class="token punctuation">;</span>
chrome<span class="token punctuation">.</span><span class="token property-access">browserAction</span><span class="token punctuation">.</span><span class="token method function property-access">setIcon</span><span class="token punctuation">(</span><span class="token punctuation">&#123;</span> tabId<span class="token punctuation">,</span> path<span class="token punctuation">:</span> iconPath <span class="token punctuation">&#125;</span><span class="token punctuation">)</span><span class="token punctuation">;</span>

<span class="token keyword">function</span> <span class="token function">getIconBasedOnReactVersion</span><span class="token punctuation">(</span><span class="token punctuation">)</span> <span class="token punctuation">&#123;</span>
  <span class="token keyword">if</span> <span class="token punctuation">(</span>noReactDetected<span class="token punctuation">)</span> <span class="token punctuation">&#123;</span>
    <span class="token keyword">return</span> <span class="token string">'disabled-react-icon.png'</span><span class="token punctuation">;</span>
  <span class="token punctuation">&#125;</span>
  <span class="token keyword">if</span> <span class="token punctuation">(</span>isReactDevelopment<span class="token punctuation">)</span> <span class="token punctuation">&#123;</span>
    <span class="token keyword">return</span> <span class="token string">'development-react-icon.png'</span><span class="token punctuation">;</span>
  <span class="token punctuation">&#125;</span>
  <span class="token keyword">return</span> <span class="token string">'production-react-icon.png'</span><span class="token punctuation">;</span>
<span class="token punctuation">&#125;</span></code>` + "";

	let t92;
	let p15;
	let t93;
	let code3;
	let t94;
	let t95;
	let code4;
	let t96;
	let t97;
	let code5;
	let t98;
	let t99;
	let code6;
	let t100;
	let t101;
	let t102;
	let pre2;

	let raw2_value = `
<code class="language-html"><span class="token comment">&lt;!-- filename: popup.html --></span>
<span class="token tag"><span class="token tag"><span class="token punctuation">&lt;</span>html</span><span class="token punctuation">></span></span>
  <span class="token tag"><span class="token tag"><span class="token punctuation">&lt;</span>body</span><span class="token punctuation">></span></span>
    <span class="token tag"><span class="token tag"><span class="token punctuation">&lt;</span>script</span> <span class="token attr-name">src</span><span class="token attr-value"><span class="token punctuation">=</span><span class="token punctuation">"</span>popup.js<span class="token punctuation">"</span></span><span class="token punctuation">></span></span><span class="token script"></span><span class="token tag"><span class="token tag"><span class="token punctuation">&lt;/</span>script</span><span class="token punctuation">></span></span>
  <span class="token tag"><span class="token tag"><span class="token punctuation">&lt;/</span>body</span><span class="token punctuation">></span></span>
<span class="token tag"><span class="token tag"><span class="token punctuation">&lt;/</span>html</span><span class="token punctuation">></span></span></code>` + "";

	let t103;
	let p16;
	let em5;
	let t104;
	let t105;
	let p17;
	let t106;
	let t107;
	let pre3;

	let raw3_value = `
<code class="language-js"><span class="token comment">// filename: devtools.js</span>
chrome<span class="token punctuation">.</span><span class="token property-access">devtools</span><span class="token punctuation">.</span><span class="token property-access">panels</span><span class="token punctuation">.</span><span class="token method function property-access">create</span><span class="token punctuation">(</span>
  <span class="token string">'My Devtools Panel 1'</span><span class="token punctuation">,</span>
  <span class="token string">'img_16.png'</span><span class="token punctuation">,</span>
  <span class="token string">'panel.html'</span>
<span class="token punctuation">)</span><span class="token punctuation">;</span></code>` + "";

	let t108;
	let section4;
	let h23;
	let a26;
	let t109;
	let t110;
	let p18;
	let t111;
	let t112;
	let p19;
	let t113;
	let t114;
	let p20;
	let t115;
	let a27;
	let t116;
	let t117;
	let a28;
	let t118;
	let t119;
	let a29;
	let t120;
	let t121;
	let t122;
	let p21;
	let t123;
	let t124;
	let p22;
	let t125;
	let a30;
	let t126;
	let t127;
	let a31;
	let t128;
	let t129;
	let t130;
	let p23;
	let t131;
	let t132;
	let ul5;
	let li17;
	let t133;
	let t134;
	let li18;
	let t135;
	let t136;
	let li19;
	let t137;
	let a32;
	let t138;
	let t139;
	let t140;
	let p24;
	let img1;
	let img1_src_value;
	let t141;
	let section5;
	let h30;
	let a33;
	let t142;
	let t143;
	let p25;
	let t144;
	let t145;
	let p26;
	let t146;
	let t147;
	let p27;
	let t148;
	let code7;
	let t149;
	let t150;
	let t151;
	let pre4;

	let raw4_value = `
<code class="language-html"><span class="token comment">&lt;!-- http://any.page --></span>
<span class="token tag"><span class="token tag"><span class="token punctuation">&lt;</span>script</span><span class="token punctuation">></span></span><span class="token script"><span class="token language-javascript">
  <span class="token keyword">var</span> foo <span class="token operator">=</span> <span class="token number">1</span><span class="token punctuation">;</span>
</span></span><span class="token tag"><span class="token tag"><span class="token punctuation">&lt;/</span>script</span><span class="token punctuation">></span></span></code>` + "";

	let t152;
	let pre5;

	let raw5_value = `
<code class="language-js"><span class="token comment">// content script</span>
<span class="token console class-name">console</span><span class="token punctuation">.</span><span class="token method function property-access">log</span><span class="token punctuation">(</span><span class="token keyword">typeof</span> foo<span class="token punctuation">,</span> <span class="token keyword">typeof</span> <span class="token dom variable">window</span><span class="token punctuation">.</span><span class="token property-access">foo</span><span class="token punctuation">)</span><span class="token punctuation">;</span> <span class="token comment">// undefined undefined</span></code>` + "";

	let t153;
	let p28;
	let t154;
	let t155;
	let pre6;

	let raw6_value = `
<code class="language-js"><span class="token comment">// content script</span>
<span class="token keyword">var</span> bar <span class="token operator">=</span> <span class="token number">1</span><span class="token punctuation">;</span></code>` + "";

	let t156;
	let pre7;

	let raw7_value = `
<code class="language-html"><span class="token comment">&lt;!-- http://any.page --></span>
<span class="token tag"><span class="token tag"><span class="token punctuation">&lt;</span>script</span><span class="token punctuation">></span></span><span class="token script"><span class="token language-javascript">
  <span class="token console class-name">console</span><span class="token punctuation">.</span><span class="token method function property-access">log</span><span class="token punctuation">(</span><span class="token keyword">typeof</span> bar<span class="token punctuation">,</span> <span class="token keyword">typeof</span> <span class="token dom variable">window</span><span class="token punctuation">.</span><span class="token property-access">bar</span><span class="token punctuation">)</span><span class="token punctuation">;</span> <span class="token comment">// undefined undefined</span>
</span></span><span class="token tag"><span class="token tag"><span class="token punctuation">&lt;/</span>script</span><span class="token punctuation">></span></span></code>` + "";

	let t157;
	let p29;
	let t158;
	let t159;
	let pre8;

	let raw8_value = `
<code class="language-js"><span class="token comment">// content script</span>
<span class="token keyword">const</span> script <span class="token operator">=</span> <span class="token dom variable">document</span><span class="token punctuation">.</span><span class="token method function property-access">createElement</span><span class="token punctuation">(</span><span class="token string">'script'</span><span class="token punctuation">)</span><span class="token punctuation">;</span>
script<span class="token punctuation">.</span><span class="token property-access">textContent</span> <span class="token operator">=</span> <span class="token string">'var baz = 1;'</span><span class="token punctuation">;</span>
<span class="token dom variable">document</span><span class="token punctuation">.</span><span class="token property-access">documentElement</span><span class="token punctuation">.</span><span class="token method function property-access">appendChild</span><span class="token punctuation">(</span>script<span class="token punctuation">)</span><span class="token punctuation">;</span></code>` + "";

	let t160;
	let pre9;

	let raw9_value = `
<code class="language-html"><span class="token comment">&lt;!-- http://any.page --></span>
<span class="token tag"><span class="token tag"><span class="token punctuation">&lt;</span>script</span><span class="token punctuation">></span></span><span class="token script"><span class="token language-javascript">
  <span class="token console class-name">console</span><span class="token punctuation">.</span><span class="token method function property-access">log</span><span class="token punctuation">(</span>baz<span class="token punctuation">,</span> <span class="token dom variable">window</span><span class="token punctuation">.</span><span class="token property-access">baz</span><span class="token punctuation">)</span><span class="token punctuation">;</span> <span class="token comment">// 1 1</span>
</span></span><span class="token tag"><span class="token tag"><span class="token punctuation">&lt;/</span>script</span><span class="token punctuation">></span></span></code>` + "";

	let t161;
	let blockquote0;
	let p30;
	let strong4;
	let t162;
	let t163;
	let a34;
	let t164;
	let t165;
	let t166;
	let p31;
	let t167;
	let t168;
	let p32;
	let t169;
	let t170;
	let pre10;

	let raw10_value = `
<code class="language-html"><span class="token comment">&lt;!-- http://any.page --></span>
<span class="token tag"><span class="token tag"><span class="token punctuation">&lt;</span>div</span><span class="token style-attr language-css"><span class="token attr-name"> <span class="token attr-name">style</span></span><span class="token punctuation">="</span><span class="token attr-value"><span class="token property">display</span><span class="token punctuation">:</span>none<span class="token punctuation">;</span></span><span class="token punctuation">"</span></span> <span class="token attr-name">id</span><span class="token attr-value"><span class="token punctuation">=</span><span class="token punctuation">"</span>for-content-script-only<span class="token punctuation">"</span></span><span class="token punctuation">></span></span>
  baz = 1;
<span class="token tag"><span class="token tag"><span class="token punctuation">&lt;/</span>div</span><span class="token punctuation">></span></span></code>` + "";

	let t171;
	let pre11;

	let raw11_value = `
<code class="language-js"><span class="token comment">// content script</span>
<span class="token keyword">const</span> result <span class="token operator">=</span> <span class="token dom variable">document</span><span class="token punctuation">.</span><span class="token method function property-access">querySelector</span><span class="token punctuation">(</span><span class="token string">'#for-content-script-only'</span><span class="token punctuation">)</span><span class="token punctuation">;</span>
<span class="token keyword">let</span> baz<span class="token punctuation">;</span>
<span class="token function">eval</span><span class="token punctuation">(</span>result<span class="token punctuation">.</span><span class="token property-access">textContent</span><span class="token punctuation">)</span><span class="token punctuation">;</span>
<span class="token console class-name">console</span><span class="token punctuation">.</span><span class="token method function property-access">log</span><span class="token punctuation">(</span><span class="token string">'baz ='</span><span class="token punctuation">,</span> baz<span class="token punctuation">)</span><span class="token punctuation">;</span> <span class="token comment">// baz = 1</span></code>` + "";

	let t172;
	let p33;
	let t173;
	let t174;
	let p34;
	let t175;
	let a35;
	let t176;
	let t177;
	let t178;
	let pre12;

	let raw12_value = `
<code class="language-html"><span class="token comment">&lt;!-- http://any.page --></span>
<span class="token tag"><span class="token tag"><span class="token punctuation">&lt;</span>script</span><span class="token punctuation">></span></span><span class="token script"><span class="token language-javascript">
  <span class="token comment">// listen to content script</span>
  <span class="token dom variable">window</span><span class="token punctuation">.</span><span class="token method function property-access">addEventListener</span><span class="token punctuation">(</span><span class="token string">'message'</span><span class="token punctuation">,</span> listenFromContentScript<span class="token punctuation">)</span><span class="token punctuation">;</span>
  <span class="token keyword">function</span> <span class="token function">listenFromContentScript</span><span class="token punctuation">(</span><span class="token parameter">event</span><span class="token punctuation">)</span> <span class="token punctuation">&#123;</span>
    <span class="token keyword">if</span> <span class="token punctuation">(</span>
      event<span class="token punctuation">.</span><span class="token property-access">source</span> <span class="token operator">===</span> <span class="token dom variable">window</span> <span class="token operator">&amp;&amp;</span>
      event<span class="token punctuation">.</span><span class="token property-access">data</span> <span class="token operator">&amp;&amp;</span>
      event<span class="token punctuation">.</span><span class="token property-access">data</span><span class="token punctuation">.</span><span class="token property-access">source</span> <span class="token operator">===</span> <span class="token string">'my-chrome-extension-content-script'</span>
    <span class="token punctuation">)</span> <span class="token punctuation">&#123;</span>
      <span class="token comment">// handle the event</span>
      <span class="token console class-name">console</span><span class="token punctuation">.</span><span class="token method function property-access">log</span><span class="token punctuation">(</span>event<span class="token punctuation">.</span><span class="token property-access">data</span><span class="token punctuation">.</span><span class="token property-access">text</span><span class="token punctuation">)</span><span class="token punctuation">;</span> <span class="token comment">// hello from content script</span>
    <span class="token punctuation">&#125;</span>
  <span class="token punctuation">&#125;</span>
  <span class="token comment">// send to content script</span>
  <span class="token dom variable">window</span><span class="token punctuation">.</span><span class="token method function property-access">postMessage</span><span class="token punctuation">(</span><span class="token punctuation">&#123;</span>
    source<span class="token punctuation">:</span> <span class="token string">'my-chrome-extension-web-page'</span><span class="token punctuation">,</span>
    text<span class="token punctuation">:</span> <span class="token string">'hello from web page'</span><span class="token punctuation">,</span>
  <span class="token punctuation">&#125;</span><span class="token punctuation">)</span><span class="token punctuation">;</span>
</span></span><span class="token tag"><span class="token tag"><span class="token punctuation">&lt;/</span>script</span><span class="token punctuation">></span></span></code>` + "";

	let t179;
	let pre13;

	let raw13_value = `
<code class="language-js"><span class="token comment">// content script</span>
<span class="token comment">// listen to web page</span>
<span class="token dom variable">window</span><span class="token punctuation">.</span><span class="token method function property-access">addEventListener</span><span class="token punctuation">(</span><span class="token string">'message'</span><span class="token punctuation">,</span> listenFromWebPage<span class="token punctuation">)</span><span class="token punctuation">;</span>
<span class="token keyword">function</span> <span class="token function">listenFromWebPage</span><span class="token punctuation">(</span><span class="token parameter">event</span><span class="token punctuation">)</span> <span class="token punctuation">&#123;</span>
  <span class="token keyword">if</span> <span class="token punctuation">(</span>event<span class="token punctuation">.</span><span class="token property-access">data</span> <span class="token operator">&amp;&amp;</span> event<span class="token punctuation">.</span><span class="token property-access">data</span><span class="token punctuation">.</span><span class="token property-access">source</span> <span class="token operator">===</span> <span class="token string">'my-chrome-extension-web-page'</span><span class="token punctuation">)</span> <span class="token punctuation">&#123;</span>
    <span class="token comment">// handle the event</span>
    <span class="token console class-name">console</span><span class="token punctuation">.</span><span class="token method function property-access">log</span><span class="token punctuation">(</span>event<span class="token punctuation">.</span><span class="token property-access">data</span><span class="token punctuation">.</span><span class="token property-access">text</span><span class="token punctuation">)</span><span class="token punctuation">;</span> <span class="token comment">// hello from web page</span>
  <span class="token punctuation">&#125;</span>
<span class="token punctuation">&#125;</span>
<span class="token comment">// send to web page</span>
<span class="token dom variable">window</span><span class="token punctuation">.</span><span class="token method function property-access">postMessage</span><span class="token punctuation">(</span><span class="token punctuation">&#123;</span>
  source<span class="token punctuation">:</span> <span class="token string">'my-chrome-extension-content-script'</span><span class="token punctuation">,</span>
  text<span class="token punctuation">:</span> <span class="token string">'hello from content script'</span><span class="token punctuation">,</span>
<span class="token punctuation">&#125;</span><span class="token punctuation">)</span><span class="token punctuation">;</span></code>` + "";

	let t180;
	let blockquote1;
	let p35;
	let strong5;
	let t181;
	let t182;
	let code8;
	let t183;
	let t184;
	let code9;
	let t185;
	let t186;
	let t187;
	let section6;
	let h4;
	let a36;
	let t188;
	let t189;
	let p36;
	let t190;
	let a37;
	let t191;
	let t192;
	let code10;
	let t193;
	let t194;
	let t195;
	let p37;
	let t196;
	let t197;
	let pre14;

	let raw14_value = `
<code class="language-html"><span class="token comment">&lt;!-- http://any.page --></span>
<span class="token tag"><span class="token tag"><span class="token punctuation">&lt;</span>script</span><span class="token punctuation">></span></span><span class="token script"><span class="token language-javascript">
  <span class="token comment">// if &#96;__MY_EXTENSION_HOOK__&#96; is not defined, </span>
  <span class="token comment">// meaning the user did not install the extension.</span>
  <span class="token keyword">if</span> <span class="token punctuation">(</span><span class="token keyword">typeof</span> __MY_EXTENSION_HOOK__ <span class="token operator">!==</span> <span class="token string">'undefined'</span><span class="token punctuation">)</span> <span class="token punctuation">&#123;</span>
    __MY_EXTENSION_HOOK__<span class="token punctuation">.</span><span class="token method function property-access">subscribe</span><span class="token punctuation">(</span><span class="token string">'event_a'</span><span class="token punctuation">,</span> <span class="token parameter">event</span> <span class="token arrow operator">=></span> <span class="token punctuation">&#123;</span>
      <span class="token console class-name">console</span><span class="token punctuation">.</span><span class="token method function property-access">log</span><span class="token punctuation">(</span>event<span class="token punctuation">)</span><span class="token punctuation">;</span>
      __MY_EXTENSION_HOOK__<span class="token punctuation">.</span><span class="token method function property-access">sendMessage</span><span class="token punctuation">(</span><span class="token punctuation">&#123;</span> data<span class="token punctuation">:</span> <span class="token string">'foo'</span> <span class="token punctuation">&#125;</span><span class="token punctuation">)</span><span class="token punctuation">;</span>
    <span class="token punctuation">&#125;</span><span class="token punctuation">)</span><span class="token punctuation">;</span>
  <span class="token punctuation">&#125;</span> <span class="token keyword">else</span> <span class="token punctuation">&#123;</span>
    <span class="token console class-name">console</span><span class="token punctuation">.</span><span class="token method function property-access">log</span><span class="token punctuation">(</span><span class="token string">'Please install my awesome chrome extension 🙏'</span><span class="token punctuation">)</span><span class="token punctuation">;</span>
  <span class="token punctuation">&#125;</span>
</span></span><span class="token tag"><span class="token tag"><span class="token punctuation">&lt;/</span>script</span><span class="token punctuation">></span></span></code>` + "";

	let t198;
	let pre15;

	let raw15_value = `
<code class="language-js"><span class="token comment">// content script</span>
<span class="token keyword">function</span> <span class="token function">installHook</span><span class="token punctuation">(</span><span class="token punctuation">)</span> <span class="token punctuation">&#123;</span>
  <span class="token keyword">const</span> listeners <span class="token operator">=</span> <span class="token keyword">new</span> <span class="token class-name">Map</span><span class="token punctuation">(</span><span class="token punctuation">)</span><span class="token punctuation">;</span>
  <span class="token keyword">const</span> hook <span class="token operator">=</span> <span class="token punctuation">&#123;</span>
    <span class="token function">subscribe</span><span class="token punctuation">(</span><span class="token parameter">eventName<span class="token punctuation">,</span> listener</span><span class="token punctuation">)</span> <span class="token punctuation">&#123;</span>
      <span class="token keyword">if</span> <span class="token punctuation">(</span><span class="token operator">!</span>listeners<span class="token punctuation">.</span><span class="token method function property-access">has</span><span class="token punctuation">(</span>eventName<span class="token punctuation">)</span><span class="token punctuation">)</span> listeners<span class="token punctuation">.</span><span class="token method function property-access">set</span><span class="token punctuation">(</span>eventName<span class="token punctuation">,</span> <span class="token punctuation">[</span><span class="token punctuation">]</span><span class="token punctuation">)</span><span class="token punctuation">;</span>
      listeners<span class="token punctuation">.</span><span class="token method function property-access">get</span><span class="token punctuation">(</span>eventName<span class="token punctuation">)</span><span class="token punctuation">.</span><span class="token method function property-access">push</span><span class="token punctuation">(</span>listener<span class="token punctuation">)</span><span class="token punctuation">;</span>
    <span class="token punctuation">&#125;</span><span class="token punctuation">,</span>
    <span class="token function">sendMessage</span><span class="token punctuation">(</span><span class="token parameter">data</span><span class="token punctuation">)</span> <span class="token punctuation">&#123;</span>
      <span class="token dom variable">window</span><span class="token punctuation">.</span><span class="token method function property-access">postMessage</span><span class="token punctuation">(</span><span class="token punctuation">&#123;</span>
        source<span class="token punctuation">:</span> <span class="token string">'my-chrome-extension-web-page'</span><span class="token punctuation">,</span>
        data<span class="token punctuation">,</span>
      <span class="token punctuation">&#125;</span><span class="token punctuation">)</span><span class="token punctuation">;</span>
    <span class="token punctuation">&#125;</span><span class="token punctuation">,</span>
  <span class="token punctuation">&#125;</span><span class="token punctuation">;</span>
  <span class="token comment">// listen for events</span>
  <span class="token dom variable">window</span><span class="token punctuation">.</span><span class="token method function property-access">addEventListener</span><span class="token punctuation">(</span><span class="token string">'message'</span><span class="token punctuation">,</span> listenFromContentScript<span class="token punctuation">)</span><span class="token punctuation">;</span>
  <span class="token keyword">function</span> <span class="token function">listenFromContentScript</span><span class="token punctuation">(</span><span class="token parameter">event</span><span class="token punctuation">)</span> <span class="token punctuation">&#123;</span>
    <span class="token keyword">if</span> <span class="token punctuation">(</span>
      event<span class="token punctuation">.</span><span class="token property-access">source</span> <span class="token operator">===</span> <span class="token dom variable">window</span> <span class="token operator">&amp;&amp;</span>
      event<span class="token punctuation">.</span><span class="token property-access">data</span> <span class="token operator">&amp;&amp;</span>
      event<span class="token punctuation">.</span><span class="token property-access">data</span><span class="token punctuation">.</span><span class="token property-access">source</span> <span class="token operator">===</span> <span class="token string">'my-chrome-extension-content-script'</span>
    <span class="token punctuation">)</span> <span class="token punctuation">&#123;</span>
      <span class="token keyword">if</span> <span class="token punctuation">(</span>listeners<span class="token punctuation">.</span><span class="token method function property-access">has</span><span class="token punctuation">(</span>event<span class="token punctuation">.</span><span class="token property-access">data</span><span class="token punctuation">.</span><span class="token property-access">type</span><span class="token punctuation">)</span><span class="token punctuation">)</span> <span class="token punctuation">&#123;</span>
        listeners
          <span class="token punctuation">.</span><span class="token method function property-access">get</span><span class="token punctuation">(</span>event<span class="token punctuation">.</span><span class="token property-access">data</span><span class="token punctuation">.</span><span class="token property-access">type</span><span class="token punctuation">)</span>
          <span class="token punctuation">.</span><span class="token method function property-access">forEach</span><span class="token punctuation">(</span><span class="token parameter">listener</span> <span class="token arrow operator">=></span> <span class="token function">listener</span><span class="token punctuation">(</span>event<span class="token punctuation">.</span><span class="token property-access">data</span><span class="token punctuation">)</span><span class="token punctuation">)</span><span class="token punctuation">;</span>
      <span class="token punctuation">&#125;</span>
    <span class="token punctuation">&#125;</span>
  <span class="token punctuation">&#125;</span>
  <span class="token comment">// define a read only, non-overridable and couldn't be found on globalThis property keys</span>
  <span class="token known-class-name class-name">Object</span><span class="token punctuation">.</span><span class="token method function property-access">defineProperty</span><span class="token punctuation">(</span>globalThis<span class="token punctuation">,</span> <span class="token string">'__MY_EXTENSION_HOOK__'</span><span class="token punctuation">,</span> <span class="token punctuation">&#123;</span>
    configurable<span class="token punctuation">:</span> <span class="token boolean">false</span><span class="token punctuation">,</span>
    enumerable<span class="token punctuation">:</span> <span class="token boolean">false</span><span class="token punctuation">,</span>
    <span class="token keyword">get</span><span class="token punctuation">(</span><span class="token punctuation">)</span> <span class="token punctuation">&#123;</span>
      <span class="token keyword">return</span> hook<span class="token punctuation">;</span>
    <span class="token punctuation">&#125;</span><span class="token punctuation">,</span>
  <span class="token punctuation">&#125;</span><span class="token punctuation">)</span><span class="token punctuation">;</span>
<span class="token punctuation">&#125;</span>
<span class="token comment">// execute the install hook in web page context</span>
<span class="token keyword">const</span> script <span class="token operator">=</span> <span class="token dom variable">document</span><span class="token punctuation">.</span><span class="token method function property-access">createElement</span><span class="token punctuation">(</span><span class="token string">'script'</span><span class="token punctuation">)</span><span class="token punctuation">;</span>
script<span class="token punctuation">.</span><span class="token property-access">textContent</span> <span class="token operator">=</span> <span class="token template-string"><span class="token template-punctuation string">&#96;</span><span class="token string">;(</span><span class="token interpolation"><span class="token interpolation-punctuation punctuation">$&#123;</span>installHook<span class="token punctuation">.</span><span class="token method function property-access">toString</span><span class="token punctuation">(</span><span class="token punctuation">)</span><span class="token interpolation-punctuation punctuation">&#125;</span></span><span class="token string">)();</span><span class="token template-punctuation string">&#96;</span></span><span class="token punctuation">;</span>
<span class="token dom variable">document</span><span class="token punctuation">.</span><span class="token property-access">documentElement</span><span class="token punctuation">.</span><span class="token method function property-access">appendChild</span><span class="token punctuation">(</span>script<span class="token punctuation">)</span><span class="token punctuation">;</span></code>` + "";

	let t199;
	let p38;
	let t200;
	let a38;
	let t201;
	let t202;
	let t203;
	let p39;
	let t204;
	let t205;
	let p40;
	let t206;
	let t207;
	let section7;
	let h24;
	let a39;
	let t208;
	let t209;
	let p41;
	let t210;
	let a40;
	let t211;
	let t212;
	let a41;
	let t213;
	let t214;
	let a42;
	let t215;
	let t216;
	let a43;
	let t217;
	let t218;
	let code11;
	let t219;
	let t220;
	let a44;
	let t221;
	let t222;
	let t223;
	let p42;
	let t224;
	let t225;
	let ul6;
	let li20;
	let strong6;
	let t226;
	let t227;
	let t228;
	let li21;
	let strong7;
	let t229;
	let t230;
	let t231;
	let li22;
	let strong8;
	let t232;
	let t233;
	let t234;
	let li23;
	let t235;
	let t236;
	let p43;
	let t237;
	let t238;
	let p44;
	let t239;
	let t240;
	let section8;
	let h31;
	let a45;
	let t241;
	let t242;
	let p45;
	let t243;
	let em6;
	let t244;
	let t245;
	let em7;
	let t246;
	let t247;
	let t248;
	let p46;
	let t249;
	let t250;
	let p47;
	let t251;
	let t252;
	let p48;
	let t253;
	let t254;
	let p49;
	let img2;
	let img2_src_value;
	let t255;
	let p50;
	let t256;
	let t257;
	let p51;
	let t258;
	let t259;
	let p52;
	let a46;
	let t260;
	let t261;
	let section9;
	let h32;
	let a47;
	let t262;
	let t263;
	let p53;
	let t264;
	let a48;
	let t265;
	let t266;
	let t267;
	let p54;
	let t268;
	let a49;
	let t269;
	let t270;
	let t271;
	let p55;
	let t272;
	let a50;
	let t273;
	let t274;
	let a51;
	let t275;
	let t276;
	let t277;
	let p56;
	let t278;
	let a52;
	let t279;
	let t280;
	let a53;
	let t281;
	let t282;
	let a54;
	let t283;
	let t284;
	let t285;
	let p57;
	let t286;
	let t287;
	let p58;
	let img3;
	let img3_src_value;
	let t288;
	let p59;
	let a55;
	let t289;
	let t290;
	let section10;
	let h33;
	let a56;
	let t291;
	let t292;
	let p60;
	let t293;
	let t294;
	let p61;
	let t295;
	let t296;
	let p62;
	let t297;
	let t298;
	let p63;
	let t299;
	let a57;
	let t300;
	let t301;
	let t302;
	let pre16;

	let raw16_value = `
<code class="language-html"><span class="token comment">&lt;!-- http://any.page --></span>
<span class="token tag"><span class="token tag"><span class="token punctuation">&lt;</span>script</span><span class="token punctuation">></span></span><span class="token script"><span class="token language-javascript">
  <span class="token keyword">function</span> <span class="token function">sendEvent</span><span class="token punctuation">(</span><span class="token parameter">event</span><span class="token punctuation">)</span> <span class="token punctuation">&#123;</span>
    <span class="token keyword">if</span> <span class="token punctuation">(</span><span class="token keyword">typeof</span> __MY_EXTENSION_HOOK__ <span class="token operator">!==</span> <span class="token string">"undefined"</span><span class="token punctuation">)</span> <span class="token punctuation">&#123;</span>
      __MY_EXTENSION_HOOK__<span class="token punctuation">.</span><span class="token method function property-access">recordEvent</span><span class="token punctuation">(</span>event<span class="token punctuation">)</span><span class="token punctuation">;</span>
    <span class="token punctuation">&#125;</span>
    <span class="token comment">// proceed with sending the event to backend server</span>
  <span class="token punctuation">&#125;</span>
</span></span><span class="token tag"><span class="token tag"><span class="token punctuation">&lt;/</span>script</span><span class="token punctuation">></span></span></code>` + "";

	let t303;
	let p64;
	let img4;
	let img4_src_value;
	let t304;
	let p65;
	let a58;
	let t305;
	let t306;
	let section11;
	let h25;
	let a59;
	let t307;
	let t308;
	let p66;
	let t309;
	let t310;
	let p67;
	let t311;
	let t312;
	let section12;
	let h26;
	let a60;
	let t313;
	let t314;
	let ul7;
	let li24;
	let a61;
	let t315;
	let t316;
	let t317;
	let li25;
	let a62;
	let t318;
	let t319;
	let t320;
	let li26;
	let a63;
	let t321;
	let t322;
	let t323;
	let li27;
	let a64;
	let t324;
	let t325;
	let t326;
	let li28;
	let a65;
	let t327;
	let t328;
	let t329;
	let li29;
	let a66;
	let t330;
	let t331;
	let t332;
	let li30;
	let a67;
	let t333;
	let t334;
	let t335;
	let li31;
	let a68;
	let t336;
	let t337;
	let t338;
	let li32;
	let strong9;
	let t339;
	let t340;
	let a69;
	let t341;
	let t342;
	let strong10;
	let t343;
	let t344;

	return {
		c() {
			section0 = element("section");
			ul3 = element("ul");
			li0 = element("li");
			a0 = element("a");
			t0 = text("Abstract");
			li1 = element("li");
			a1 = element("a");
			t1 = text("Overview");
			li2 = element("li");
			a2 = element("a");
			t2 = text("manifest.json");
			li3 = element("li");
			a3 = element("a");
			t3 = text("Communicating between components");
			ul1 = element("ul");
			li4 = element("li");
			a4 = element("a");
			t4 = text("Communicating between the Content script and the web page");
			ul0 = element("ul");
			li5 = element("li");
			a5 = element("a");
			t5 = text("Providing a hook to your extension");
			li6 = element("li");
			a6 = element("a");
			t6 = text("What you can do with Chrome Extension");
			ul2 = element("ul");
			li7 = element("li");
			a7 = element("a");
			t7 = text("Switching environments and feature toggles");
			li8 = element("li");
			a8 = element("a");
			t8 = text("Reporting bugs with screen recording");
			li9 = element("li");
			a9 = element("a");
			t9 = text("Debugging events and analytics");
			li10 = element("li");
			a10 = element("a");
			t10 = text("Closing Note");
			li11 = element("li");
			a11 = element("a");
			t11 = text("Extensions that has helped my daily development");
			t12 = space();
			p0 = element("p");
			t13 = text("I prepared this talk for Chrome Dev Summit Extended 2020 in Singapore. Unfortunately, due to the Coronavirus Outbreak, and having the Ministry of Health raising the alert to DORSCON Orange, the event was cancelled.");
			t14 = space();
			p1 = element("p");
			t15 = text("Still, I feel this talk deserves to be \"heard\" by everyone interested, so I decided to write the talk out into writing.");
			t16 = space();
			section1 = element("section");
			h20 = element("h2");
			a12 = element("a");
			t17 = text("Abstract");
			t18 = space();
			p2 = element("p");
			t19 = text("Chrome extension allows us to add features to our browser, personalize our development experience. One good example is React DevTools, which allows React Developers to inspect and debug virtual DOM through the Chrome DevTools.");
			t20 = space();
			p3 = element("p");
			t21 = text("In this talk, I will be exploring ");
			a13 = element("a");
			t22 = text("how you can develop your Chrome extension");
			t23 = text(", and ");
			a14 = element("a");
			t24 = text("how you can use it to improve your development workflow");
			t25 = text(".");
			t26 = space();
			p4 = element("p");
			t27 = text("Hopefully, at the end of the talk, you would be able to write your Chrome extension for your development workspace.");
			t28 = space();
			section2 = element("section");
			h21 = element("h2");
			a15 = element("a");
			t29 = text("Overview");
			t30 = space();
			p5 = element("p");
			t31 = text("A Chrome extension is made up of several components, which can broken down into the ");
			a16 = element("a");
			t32 = text("background scripts");
			t33 = text(", ");
			a17 = element("a");
			t34 = text("content scripts");
			t35 = text(", an ");
			a18 = element("a");
			t36 = text("options page");
			t37 = text(", ");
			a19 = element("a");
			t38 = text("UI elements");
			t39 = text(".");
			t40 = space();
			p6 = element("p");
			t41 = text("The ");
			strong0 = element("strong");
			t42 = text("background scripts");
			t43 = text(" is like a background thread of your Chrome extension. It is where you can observe browser events and modify browser behaviors.");
			t44 = space();
			p7 = element("p");
			strong1 = element("strong");
			t45 = text("Content scripts");
			t46 = text(" run in the context of web pages. It is allowed to access and modify the DOM of the web pages. It is where you provide web pages information to the extension, as well as providing hooks for the web pages to communicate with the extension.");
			t47 = space();
			p8 = element("p");
			strong2 = element("strong");
			t48 = text("Options page");
			t49 = text(" is a standalone page, where users can modify the behavior of your Chrome extension.");
			t50 = space();
			p9 = element("p");
			t51 = text("The ");
			strong3 = element("strong");
			t52 = text("UI elements");
			t53 = text(" are what we usually perceived of a chrome extension, which includes:");
			t54 = space();
			ul4 = element("ul");
			li12 = element("li");
			a20 = element("a");
			t55 = text("browser action");
			t56 = space();
			em0 = element("em");
			t57 = text("(the small icon in the toolbar beside the address bar)");
			t58 = space();
			li13 = element("li");
			a21 = element("a");
			t59 = text("popup");
			t60 = space();
			em1 = element("em");
			t61 = text("(the floating window shown when clicked on the toolbar icon)");
			t62 = space();
			li14 = element("li");
			a22 = element("a");
			t63 = text("context menu");
			t64 = space();
			em2 = element("em");
			t65 = text("(yes, you can customise your right-click context menu)");
			t66 = space();
			li15 = element("li");
			a23 = element("a");
			t67 = text("devtools panel");
			t68 = space();
			em3 = element("em");
			t69 = text("(a new panel in the devtools)");
			t70 = space();
			li16 = element("li");
			a24 = element("a");
			t71 = text("custom pages");
			t72 = space();
			em4 = element("em");
			t73 = text("(Overriding the History, New Tab, or Bookmarks page)");
			t74 = space();
			p10 = element("p");
			img0 = element("img");
			t75 = space();
			p11 = element("p");
			t76 = text("Now you know the different components of a Chrome extension, let's look at the most important file in every extension, the ");
			code0 = element("code");
			t77 = text("manifest.json");
			t78 = text(".");
			t79 = space();
			section3 = element("section");
			h22 = element("h2");
			a25 = element("a");
			t80 = text("manifest.json");
			t81 = space();
			p12 = element("p");
			code1 = element("code");
			t82 = text("manifest.json");
			t83 = text(" is where you declare everything about the chrome extension:");
			t84 = space();
			pre0 = element("pre");
			t85 = space();
			p13 = element("p");
			t86 = text("You can declare all the UI elements inside the ");
			code2 = element("code");
			t87 = text("manifest.json");
			t88 = text(". You can also programmatically enable them inside the background script.");
			t89 = space();
			p14 = element("p");
			t90 = text("For example, React Devtools shows a different React logo when the site does not use React, uses development React and uses production React:");
			t91 = space();
			pre1 = element("pre");
			t92 = space();
			p15 = element("p");
			t93 = text("Notice that the ");
			code3 = element("code");
			t94 = text("options_page");
			t95 = text(", ");
			code4 = element("code");
			t96 = text("popup");
			t97 = text(" of the ");
			code5 = element("code");
			t98 = text("browser_action");
			t99 = text(", and ");
			code6 = element("code");
			t100 = text("devtools_page");
			t101 = text(" field takes in a path to a HTML page. You can treat the HTML page as any web app, which you can use any framework of your liking to build it. For example, React Devtools is built with React!");
			t102 = space();
			pre2 = element("pre");
			t103 = space();
			p16 = element("p");
			em5 = element("em");
			t104 = text("popup.html is just like any web app, that can be build with any web framework");
			t105 = space();
			p17 = element("p");
			t106 = text("For the devtools page, you need to programmatically add panels to the devtools:");
			t107 = space();
			pre3 = element("pre");
			t108 = space();
			section4 = element("section");
			h23 = element("h2");
			a26 = element("a");
			t109 = text("Communicating between components");
			t110 = space();
			p18 = element("p");
			t111 = text("Since only the content script runs in the context of the web page, if your extension requires to interact with the web page, you would need some way to communicate from the content script to the rest of the extension.");
			t112 = space();
			p19 = element("p");
			t113 = text("For example, the React Devtools uses the content script to detect React version, and notify the background script to update the page action icon appropriately.");
			t114 = space();
			p20 = element("p");
			t115 = text("The communication between different components of the Chrome extension works by using ");
			a27 = element("a");
			t116 = text("message passing");
			t117 = text(". There is API for ");
			a28 = element("a");
			t118 = text("one-time request");
			t119 = text(" as well as ");
			a29 = element("a");
			t120 = text("long-lived connections");
			t121 = text(".");
			t122 = space();
			p21 = element("p");
			t123 = text("The one-time request API works fine for a simple extension, but it gets messier when you have more communications going on between different parts of your extension.");
			t124 = space();
			p22 = element("p");
			t125 = text("I studied how ");
			a30 = element("a");
			t126 = text("React Devtools");
			t127 = space();
			a31 = element("a");
			t128 = text("works");
			t129 = text(" in particular, because to show the updated React virtual DOM tree inside the devtools panel, a lot of communication is needed between the devtools and the content script.");
			t130 = space();
			p23 = element("p");
			t131 = text("After some study and experimentation, I came up with the following architecture for my Chrome extension:");
			t132 = space();
			ul5 = element("ul");
			li17 = element("li");
			t133 = text("All the extension components (eg: popup, content script, devtools) maintained a long-lived connection with the background script");
			t134 = space();
			li18 = element("li");
			t135 = text("The background script act as a central controller that receives messages from each component and dispatches them out to the relevant components");
			t136 = space();
			li19 = element("li");
			t137 = text("Each component is like an actor in the ");
			a32 = element("a");
			t138 = text("actor model");
			t139 = text(", where it acts on the messages received and sends out messages to the other actors where needed.");
			t140 = space();
			p24 = element("p");
			img1 = element("img");
			t141 = space();
			section5 = element("section");
			h30 = element("h3");
			a33 = element("a");
			t142 = text("Communicating between the Content script and the web page");
			t143 = space();
			p25 = element("p");
			t144 = text("The content script runs in the context of the web page, which means it can interact with the DOM, such as manipulating the DOM structure and adding event listeners to the DOM elements.");
			t145 = space();
			p26 = element("p");
			t146 = text("Besides, the content script can access the page history, cookies, local storage and other browsers' APIs in the context of the web page.");
			t147 = space();
			p27 = element("p");
			t148 = text("However, the content script lives in a different global scope of the web page. Meaning, if your web application declared a global variable ");
			code7 = element("code");
			t149 = text("foo");
			t150 = text(", it is not possible for the content script to access it.");
			t151 = space();
			pre4 = element("pre");
			t152 = space();
			pre5 = element("pre");
			t153 = space();
			p28 = element("p");
			t154 = text("and the converse is true too:");
			t155 = space();
			pre6 = element("pre");
			t156 = space();
			pre7 = element("pre");
			t157 = space();
			p29 = element("p");
			t158 = text("However, it is still possible for the content script to declare a variable into the web application, since it has access to the same DOM, it can do so by adding a script tag:");
			t159 = space();
			pre8 = element("pre");
			t160 = space();
			pre9 = element("pre");
			t161 = space();
			blockquote0 = element("blockquote");
			p30 = element("p");
			strong4 = element("strong");
			t162 = text("Note:");
			t163 = text(" Depending on ");
			a34 = element("a");
			t164 = text("when you start running your content script");
			t165 = text(", the DOM may or may not have constructed when your content script is executed.");
			t166 = space();
			p31 = element("p");
			t167 = text("Still, you can't declare a variable from a web application into the content script scope.");
			t168 = space();
			p32 = element("p");
			t169 = text("I stumbled upon an idea where your web application can \"declare a variable\" through the dom by creating a special DOM element for content script consumption only:");
			t170 = space();
			pre10 = element("pre");
			t171 = space();
			pre11 = element("pre");
			t172 = space();
			p33 = element("p");
			t173 = text("It is technically possible, though I wouldn't recommend it.");
			t174 = space();
			p34 = element("p");
			t175 = text("Instead, you should use ");
			a35 = element("a");
			t176 = text("window.postMessage");
			t177 = text(" to communicate between the web page and the content script.");
			t178 = space();
			pre12 = element("pre");
			t179 = space();
			pre13 = element("pre");
			t180 = space();
			blockquote1 = element("blockquote");
			p35 = element("p");
			strong5 = element("strong");
			t181 = text("Note:");
			t182 = text(" Be sure to add an identifier field, eg: ");
			code8 = element("code");
			t183 = text("\"source\"");
			t184 = text(", to the event data for filtering, you will be amazed by how much data is communicated through ");
			code9 = element("code");
			t185 = text("window.postMessage");
			t186 = text(" if you don't filter out events that are sent from your use.");
			t187 = space();
			section6 = element("section");
			h4 = element("h4");
			a36 = element("a");
			t188 = text("Providing a hook to your extension");
			t189 = space();
			p36 = element("p");
			t190 = text("If you installed ");
			a37 = element("a");
			t191 = text("React Devtools");
			t192 = text(", try type ");
			code10 = element("code");
			t193 = text("__REACT_DEVTOOLS_GLOBAL_HOOK__");
			t194 = text(" in your console. This is a global object that was injected by React Devtools content script, to provide a simple interface for your web page to communicate with the content script.");
			t195 = space();
			p37 = element("p");
			t196 = text("You can do so too:");
			t197 = space();
			pre14 = element("pre");
			t198 = space();
			pre15 = element("pre");
			t199 = space();
			p38 = element("p");
			t200 = text("You can ");
			a38 = element("a");
			t201 = text("check out my repo");
			t202 = text(" for a basic Chrome extension setup that includes all the code above.");
			t203 = space();
			p39 = element("p");
			t204 = text("Congrats, we've cleared through the arguably hardest part developing Chrome extension!");
			t205 = space();
			p40 = element("p");
			t206 = text("Now, let's see what kind of Chrome extension we can develop that can help us with our daily development.");
			t207 = space();
			section7 = element("section");
			h24 = element("h2");
			a39 = element("a");
			t208 = text("What you can do with Chrome Extension");
			t209 = space();
			p41 = element("p");
			t210 = text("I don't know about you, but ");
			a40 = element("a");
			t211 = text("React DevTools");
			t212 = text(" and ");
			a41 = element("a");
			t213 = text("Redux DevTools");
			t214 = text(" have been extremely helpful for my daily React development. Besides that, I've been using ");
			a42 = element("a");
			t215 = text("EditThisCookie");
			t216 = text(" for cookie management, ");
			a43 = element("a");
			t217 = text("JSON Formatter");
			t218 = text(" has been helping me with inspecting ");
			code11 = element("code");
			t219 = text(".json");
			t220 = text(" files in Chrome, and there are a lot more extensions that made my development work easier, which I ");
			a44 = element("a");
			t221 = text("listed at the end of this article");
			t222 = text(".");
			t223 = space();
			p42 = element("p");
			t224 = text("As you can see, these extensions are specialised and helpful in a certain aspect of my development:");
			t225 = space();
			ul6 = element("ul");
			li20 = element("li");
			strong6 = element("strong");
			t226 = text("React Devtools");
			t227 = text(" for debugging React Virtual DOM");
			t228 = space();
			li21 = element("li");
			strong7 = element("strong");
			t229 = text("Redux Devtools");
			t230 = text(" for debugging Redux store and time travel");
			t231 = space();
			li22 = element("li");
			strong8 = element("strong");
			t232 = text("EditThisCookie");
			t233 = text(" for debugging cookie");
			t234 = space();
			li23 = element("li");
			t235 = text("...");
			t236 = space();
			p43 = element("p");
			t237 = text("They are specialised for a generic React or Redux project, yet not specialised enough for your personal or your teams' development workspace.");
			t238 = space();
			p44 = element("p");
			t239 = text("In the following, I will show you a few examples, along with source code for each example, and hopefully, these examples will inspire you to create your Chrome extension.");
			t240 = space();
			section8 = element("section");
			h31 = element("h3");
			a45 = element("a");
			t241 = text("Switching environments and feature toggles");
			t242 = space();
			p45 = element("p");
			t243 = text("A web application is usually served in different environments ");
			em6 = element("em");
			t244 = text("(eg: test, staging, live)");
			t245 = text(", different languages ");
			em7 = element("em");
			t246 = text("(eg: english, chinese)");
			t247 = text(", and may have different feature toggles to enable / disable features on the web app.");
			t248 = space();
			p46 = element("p");
			t249 = text("Depending on your web app setup, switching environments, language or feature toggles may require you to mock it, or manually editing cookie / local storage (if your flags are persisted there).");
			t250 = space();
			p47 = element("p");
			t251 = text("Think about how you would need to educate every new developer / QA / PM on how to manually switching environments, language, or feature toggles.");
			t252 = space();
			p48 = element("p");
			t253 = text("What if instead, you have a Chrome extension that provides an intuitive UI that allows you to do that?");
			t254 = space();
			p49 = element("p");
			img2 = element("img");
			t255 = space();
			p50 = element("p");
			t256 = text("You can have the extension write into cookie / local storage. You can subscribe to events from extension and make changes appropriately in your web app.");
			t257 = space();
			p51 = element("p");
			t258 = text("Do it however you like, it's your Chrome extension.");
			t259 = space();
			p52 = element("p");
			a46 = element("a");
			t260 = text("Code for demo");
			t261 = space();
			section9 = element("section");
			h32 = element("h3");
			a47 = element("a");
			t262 = text("Reporting bugs with screen recording");
			t263 = space();
			p53 = element("p");
			t264 = text("Maybe you are using a screen recording tool to record bugs, or you are using some paid service, like ");
			a48 = element("a");
			t265 = text("LogRocket");
			t266 = text(" to record down every user interaction, but how well are they integrated with your bug tracking system?");
			t267 = space();
			p54 = element("p");
			t268 = text("You can have a Chrome extension that uses ");
			a49 = element("a");
			t269 = text("chrome.tabCapture");
			t270 = text(" API to record video recordings of the tab, getting essential information of your application, such as the state of your web app, console errors, network requests, and send them to your bug tracking system.");
			t271 = space();
			p55 = element("p");
			t272 = text("You can pass along information that is unique to your development setup, such as Redux store / ");
			a50 = element("a");
			t273 = text("Vuex");
			t274 = text(" store / ");
			a51 = element("a");
			t275 = text("Svelte store");
			t276 = text(" state and actions history, feature toggles, request ids...");
			t277 = space();
			p56 = element("p");
			t278 = text("And you can integrate with your bug tracking system, be it ");
			a52 = element("a");
			t279 = text("Jira");
			t280 = text(", ");
			a53 = element("a");
			t281 = text("Trello");
			t282 = text(", ");
			a54 = element("a");
			t283 = text("Google Sheets");
			t284 = text(", email or some in-house systems.");
			t285 = space();
			p57 = element("p");
			t286 = text("The idea is that your extension can be personalised to your development workspace setup.");
			t287 = space();
			p58 = element("p");
			img3 = element("img");
			t288 = space();
			p59 = element("p");
			a55 = element("a");
			t289 = text("Code for demo");
			t290 = space();
			section10 = element("section");
			h33 = element("h3");
			a56 = element("a");
			t291 = text("Debugging events and analytics");
			t292 = space();
			p60 = element("p");
			t293 = text("Debugging and testing log and analytic events is usually a hassle.");
			t294 = space();
			p61 = element("p");
			t295 = text("Usually, especially production build, events are not logged out in the console. Hence, the only way to inspect and debug those events is to use the network inspector, inspecting the request body when those events are being sent out to a backend server.");
			t296 = space();
			p62 = element("p");
			t297 = text("What if we log those events out only when the extension is installed?");
			t298 = space();
			p63 = element("p");
			t299 = text("Just like ");
			a57 = element("a");
			t300 = text("Google Analytics Debuger");
			t301 = text(", the extension provides a switch to turn on the debug mode of the google analytics client.");
			t302 = space();
			pre16 = element("pre");
			t303 = space();
			p64 = element("p");
			img4 = element("img");
			t304 = space();
			p65 = element("p");
			a58 = element("a");
			t305 = text("Code for demo");
			t306 = space();
			section11 = element("section");
			h25 = element("h2");
			a59 = element("a");
			t307 = text("Closing Note");
			t308 = space();
			p66 = element("p");
			t309 = text("I've shown you how you can create your Chrome extension, and also provided some extension ideas you can have. It's your turn to write your Chrome extension and create your personalised development workspace.");
			t310 = space();
			p67 = element("p");
			t311 = text("Share with me what your Chrome extension can do, looking forward to seeing them!");
			t312 = space();
			section12 = element("section");
			h26 = element("h2");
			a60 = element("a");
			t313 = text("Extensions that has helped my daily development");
			t314 = space();
			ul7 = element("ul");
			li24 = element("li");
			a61 = element("a");
			t315 = text("React Devtools");
			t316 = text(" - Inspect React virtual DOM");
			t317 = space();
			li25 = element("li");
			a62 = element("a");
			t318 = text("Redux DevTools");
			t319 = text(" - Redux store inspection and time travel");
			t320 = space();
			li26 = element("li");
			a63 = element("a");
			t321 = text("JSON Formatter");
			t322 = text(" - Makes JSON easy to read.");
			t323 = space();
			li27 = element("li");
			a64 = element("a");
			t324 = text("EditThisCookie");
			t325 = text(" - Debugging cookie on a page");
			t326 = space();
			li28 = element("li");
			a65 = element("a");
			t327 = text("Google Analytics Debuger");
			t328 = text(" - Debugging Google Analytics");
			t329 = space();
			li29 = element("li");
			a66 = element("a");
			t330 = text("OpenLink Structured Data Sniffer");
			t331 = text(" - Debugging structured metadata within the web page");
			t332 = space();
			li30 = element("li");
			a67 = element("a");
			t333 = text("VisBug");
			t334 = text(" - Web design debug tool");
			t335 = space();
			li31 = element("li");
			a68 = element("a");
			t336 = text("Wappalyzer");
			t337 = text(" - Detect web technologies on a web page");
			t338 = space();
			li32 = element("li");
			strong9 = element("strong");
			t339 = text("Shopee DevTools");
			t340 = text(" - Only available in-house, ");
			a69 = element("a");
			t341 = text("join our team");
			t342 = text(" and I'll show you what other amazing things you can do with ");
			strong10 = element("strong");
			t343 = text("Shopee DevTools");
			t344 = text("!");
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
			t0 = claim_text(a0_nodes, "Abstract");
			a0_nodes.forEach(detach);
			li0_nodes.forEach(detach);
			li1 = claim_element(ul3_nodes, "LI", {});
			var li1_nodes = children(li1);
			a1 = claim_element(li1_nodes, "A", { href: true });
			var a1_nodes = children(a1);
			t1 = claim_text(a1_nodes, "Overview");
			a1_nodes.forEach(detach);
			li1_nodes.forEach(detach);
			li2 = claim_element(ul3_nodes, "LI", {});
			var li2_nodes = children(li2);
			a2 = claim_element(li2_nodes, "A", { href: true });
			var a2_nodes = children(a2);
			t2 = claim_text(a2_nodes, "manifest.json");
			a2_nodes.forEach(detach);
			li2_nodes.forEach(detach);
			li3 = claim_element(ul3_nodes, "LI", {});
			var li3_nodes = children(li3);
			a3 = claim_element(li3_nodes, "A", { href: true });
			var a3_nodes = children(a3);
			t3 = claim_text(a3_nodes, "Communicating between components");
			a3_nodes.forEach(detach);
			li3_nodes.forEach(detach);
			ul1 = claim_element(ul3_nodes, "UL", {});
			var ul1_nodes = children(ul1);
			li4 = claim_element(ul1_nodes, "LI", {});
			var li4_nodes = children(li4);
			a4 = claim_element(li4_nodes, "A", { href: true });
			var a4_nodes = children(a4);
			t4 = claim_text(a4_nodes, "Communicating between the Content script and the web page");
			a4_nodes.forEach(detach);
			li4_nodes.forEach(detach);
			ul0 = claim_element(ul1_nodes, "UL", {});
			var ul0_nodes = children(ul0);
			li5 = claim_element(ul0_nodes, "LI", {});
			var li5_nodes = children(li5);
			a5 = claim_element(li5_nodes, "A", { href: true });
			var a5_nodes = children(a5);
			t5 = claim_text(a5_nodes, "Providing a hook to your extension");
			a5_nodes.forEach(detach);
			li5_nodes.forEach(detach);
			ul0_nodes.forEach(detach);
			ul1_nodes.forEach(detach);
			li6 = claim_element(ul3_nodes, "LI", {});
			var li6_nodes = children(li6);
			a6 = claim_element(li6_nodes, "A", { href: true });
			var a6_nodes = children(a6);
			t6 = claim_text(a6_nodes, "What you can do with Chrome Extension");
			a6_nodes.forEach(detach);
			li6_nodes.forEach(detach);
			ul2 = claim_element(ul3_nodes, "UL", {});
			var ul2_nodes = children(ul2);
			li7 = claim_element(ul2_nodes, "LI", {});
			var li7_nodes = children(li7);
			a7 = claim_element(li7_nodes, "A", { href: true });
			var a7_nodes = children(a7);
			t7 = claim_text(a7_nodes, "Switching environments and feature toggles");
			a7_nodes.forEach(detach);
			li7_nodes.forEach(detach);
			li8 = claim_element(ul2_nodes, "LI", {});
			var li8_nodes = children(li8);
			a8 = claim_element(li8_nodes, "A", { href: true });
			var a8_nodes = children(a8);
			t8 = claim_text(a8_nodes, "Reporting bugs with screen recording");
			a8_nodes.forEach(detach);
			li8_nodes.forEach(detach);
			li9 = claim_element(ul2_nodes, "LI", {});
			var li9_nodes = children(li9);
			a9 = claim_element(li9_nodes, "A", { href: true });
			var a9_nodes = children(a9);
			t9 = claim_text(a9_nodes, "Debugging events and analytics");
			a9_nodes.forEach(detach);
			li9_nodes.forEach(detach);
			ul2_nodes.forEach(detach);
			li10 = claim_element(ul3_nodes, "LI", {});
			var li10_nodes = children(li10);
			a10 = claim_element(li10_nodes, "A", { href: true });
			var a10_nodes = children(a10);
			t10 = claim_text(a10_nodes, "Closing Note");
			a10_nodes.forEach(detach);
			li10_nodes.forEach(detach);
			li11 = claim_element(ul3_nodes, "LI", {});
			var li11_nodes = children(li11);
			a11 = claim_element(li11_nodes, "A", { href: true });
			var a11_nodes = children(a11);
			t11 = claim_text(a11_nodes, "Extensions that has helped my daily development");
			a11_nodes.forEach(detach);
			li11_nodes.forEach(detach);
			ul3_nodes.forEach(detach);
			section0_nodes.forEach(detach);
			t12 = claim_space(nodes);
			p0 = claim_element(nodes, "P", {});
			var p0_nodes = children(p0);
			t13 = claim_text(p0_nodes, "I prepared this talk for Chrome Dev Summit Extended 2020 in Singapore. Unfortunately, due to the Coronavirus Outbreak, and having the Ministry of Health raising the alert to DORSCON Orange, the event was cancelled.");
			p0_nodes.forEach(detach);
			t14 = claim_space(nodes);
			p1 = claim_element(nodes, "P", {});
			var p1_nodes = children(p1);
			t15 = claim_text(p1_nodes, "Still, I feel this talk deserves to be \"heard\" by everyone interested, so I decided to write the talk out into writing.");
			p1_nodes.forEach(detach);
			t16 = claim_space(nodes);
			section1 = claim_element(nodes, "SECTION", {});
			var section1_nodes = children(section1);
			h20 = claim_element(section1_nodes, "H2", {});
			var h20_nodes = children(h20);
			a12 = claim_element(h20_nodes, "A", { href: true, id: true });
			var a12_nodes = children(a12);
			t17 = claim_text(a12_nodes, "Abstract");
			a12_nodes.forEach(detach);
			h20_nodes.forEach(detach);
			t18 = claim_space(section1_nodes);
			p2 = claim_element(section1_nodes, "P", {});
			var p2_nodes = children(p2);
			t19 = claim_text(p2_nodes, "Chrome extension allows us to add features to our browser, personalize our development experience. One good example is React DevTools, which allows React Developers to inspect and debug virtual DOM through the Chrome DevTools.");
			p2_nodes.forEach(detach);
			t20 = claim_space(section1_nodes);
			p3 = claim_element(section1_nodes, "P", {});
			var p3_nodes = children(p3);
			t21 = claim_text(p3_nodes, "In this talk, I will be exploring ");
			a13 = claim_element(p3_nodes, "A", { href: true });
			var a13_nodes = children(a13);
			t22 = claim_text(a13_nodes, "how you can develop your Chrome extension");
			a13_nodes.forEach(detach);
			t23 = claim_text(p3_nodes, ", and ");
			a14 = claim_element(p3_nodes, "A", { href: true });
			var a14_nodes = children(a14);
			t24 = claim_text(a14_nodes, "how you can use it to improve your development workflow");
			a14_nodes.forEach(detach);
			t25 = claim_text(p3_nodes, ".");
			p3_nodes.forEach(detach);
			t26 = claim_space(section1_nodes);
			p4 = claim_element(section1_nodes, "P", {});
			var p4_nodes = children(p4);
			t27 = claim_text(p4_nodes, "Hopefully, at the end of the talk, you would be able to write your Chrome extension for your development workspace.");
			p4_nodes.forEach(detach);
			section1_nodes.forEach(detach);
			t28 = claim_space(nodes);
			section2 = claim_element(nodes, "SECTION", {});
			var section2_nodes = children(section2);
			h21 = claim_element(section2_nodes, "H2", {});
			var h21_nodes = children(h21);
			a15 = claim_element(h21_nodes, "A", { href: true, id: true });
			var a15_nodes = children(a15);
			t29 = claim_text(a15_nodes, "Overview");
			a15_nodes.forEach(detach);
			h21_nodes.forEach(detach);
			t30 = claim_space(section2_nodes);
			p5 = claim_element(section2_nodes, "P", {});
			var p5_nodes = children(p5);
			t31 = claim_text(p5_nodes, "A Chrome extension is made up of several components, which can broken down into the ");
			a16 = claim_element(p5_nodes, "A", { href: true, rel: true });
			var a16_nodes = children(a16);
			t32 = claim_text(a16_nodes, "background scripts");
			a16_nodes.forEach(detach);
			t33 = claim_text(p5_nodes, ", ");
			a17 = claim_element(p5_nodes, "A", { href: true, rel: true });
			var a17_nodes = children(a17);
			t34 = claim_text(a17_nodes, "content scripts");
			a17_nodes.forEach(detach);
			t35 = claim_text(p5_nodes, ", an ");
			a18 = claim_element(p5_nodes, "A", { href: true, rel: true });
			var a18_nodes = children(a18);
			t36 = claim_text(a18_nodes, "options page");
			a18_nodes.forEach(detach);
			t37 = claim_text(p5_nodes, ", ");
			a19 = claim_element(p5_nodes, "A", { href: true, rel: true });
			var a19_nodes = children(a19);
			t38 = claim_text(a19_nodes, "UI elements");
			a19_nodes.forEach(detach);
			t39 = claim_text(p5_nodes, ".");
			p5_nodes.forEach(detach);
			t40 = claim_space(section2_nodes);
			p6 = claim_element(section2_nodes, "P", {});
			var p6_nodes = children(p6);
			t41 = claim_text(p6_nodes, "The ");
			strong0 = claim_element(p6_nodes, "STRONG", {});
			var strong0_nodes = children(strong0);
			t42 = claim_text(strong0_nodes, "background scripts");
			strong0_nodes.forEach(detach);
			t43 = claim_text(p6_nodes, " is like a background thread of your Chrome extension. It is where you can observe browser events and modify browser behaviors.");
			p6_nodes.forEach(detach);
			t44 = claim_space(section2_nodes);
			p7 = claim_element(section2_nodes, "P", {});
			var p7_nodes = children(p7);
			strong1 = claim_element(p7_nodes, "STRONG", {});
			var strong1_nodes = children(strong1);
			t45 = claim_text(strong1_nodes, "Content scripts");
			strong1_nodes.forEach(detach);
			t46 = claim_text(p7_nodes, " run in the context of web pages. It is allowed to access and modify the DOM of the web pages. It is where you provide web pages information to the extension, as well as providing hooks for the web pages to communicate with the extension.");
			p7_nodes.forEach(detach);
			t47 = claim_space(section2_nodes);
			p8 = claim_element(section2_nodes, "P", {});
			var p8_nodes = children(p8);
			strong2 = claim_element(p8_nodes, "STRONG", {});
			var strong2_nodes = children(strong2);
			t48 = claim_text(strong2_nodes, "Options page");
			strong2_nodes.forEach(detach);
			t49 = claim_text(p8_nodes, " is a standalone page, where users can modify the behavior of your Chrome extension.");
			p8_nodes.forEach(detach);
			t50 = claim_space(section2_nodes);
			p9 = claim_element(section2_nodes, "P", {});
			var p9_nodes = children(p9);
			t51 = claim_text(p9_nodes, "The ");
			strong3 = claim_element(p9_nodes, "STRONG", {});
			var strong3_nodes = children(strong3);
			t52 = claim_text(strong3_nodes, "UI elements");
			strong3_nodes.forEach(detach);
			t53 = claim_text(p9_nodes, " are what we usually perceived of a chrome extension, which includes:");
			p9_nodes.forEach(detach);
			t54 = claim_space(section2_nodes);
			ul4 = claim_element(section2_nodes, "UL", {});
			var ul4_nodes = children(ul4);
			li12 = claim_element(ul4_nodes, "LI", {});
			var li12_nodes = children(li12);
			a20 = claim_element(li12_nodes, "A", { href: true, rel: true });
			var a20_nodes = children(a20);
			t55 = claim_text(a20_nodes, "browser action");
			a20_nodes.forEach(detach);
			t56 = claim_space(li12_nodes);
			em0 = claim_element(li12_nodes, "EM", {});
			var em0_nodes = children(em0);
			t57 = claim_text(em0_nodes, "(the small icon in the toolbar beside the address bar)");
			em0_nodes.forEach(detach);
			li12_nodes.forEach(detach);
			t58 = claim_space(ul4_nodes);
			li13 = claim_element(ul4_nodes, "LI", {});
			var li13_nodes = children(li13);
			a21 = claim_element(li13_nodes, "A", { href: true, rel: true });
			var a21_nodes = children(a21);
			t59 = claim_text(a21_nodes, "popup");
			a21_nodes.forEach(detach);
			t60 = claim_space(li13_nodes);
			em1 = claim_element(li13_nodes, "EM", {});
			var em1_nodes = children(em1);
			t61 = claim_text(em1_nodes, "(the floating window shown when clicked on the toolbar icon)");
			em1_nodes.forEach(detach);
			li13_nodes.forEach(detach);
			t62 = claim_space(ul4_nodes);
			li14 = claim_element(ul4_nodes, "LI", {});
			var li14_nodes = children(li14);
			a22 = claim_element(li14_nodes, "A", { href: true, rel: true });
			var a22_nodes = children(a22);
			t63 = claim_text(a22_nodes, "context menu");
			a22_nodes.forEach(detach);
			t64 = claim_space(li14_nodes);
			em2 = claim_element(li14_nodes, "EM", {});
			var em2_nodes = children(em2);
			t65 = claim_text(em2_nodes, "(yes, you can customise your right-click context menu)");
			em2_nodes.forEach(detach);
			li14_nodes.forEach(detach);
			t66 = claim_space(ul4_nodes);
			li15 = claim_element(ul4_nodes, "LI", {});
			var li15_nodes = children(li15);
			a23 = claim_element(li15_nodes, "A", { href: true, rel: true });
			var a23_nodes = children(a23);
			t67 = claim_text(a23_nodes, "devtools panel");
			a23_nodes.forEach(detach);
			t68 = claim_space(li15_nodes);
			em3 = claim_element(li15_nodes, "EM", {});
			var em3_nodes = children(em3);
			t69 = claim_text(em3_nodes, "(a new panel in the devtools)");
			em3_nodes.forEach(detach);
			li15_nodes.forEach(detach);
			t70 = claim_space(ul4_nodes);
			li16 = claim_element(ul4_nodes, "LI", {});
			var li16_nodes = children(li16);
			a24 = claim_element(li16_nodes, "A", { href: true, rel: true });
			var a24_nodes = children(a24);
			t71 = claim_text(a24_nodes, "custom pages");
			a24_nodes.forEach(detach);
			t72 = claim_space(li16_nodes);
			em4 = claim_element(li16_nodes, "EM", {});
			var em4_nodes = children(em4);
			t73 = claim_text(em4_nodes, "(Overriding the History, New Tab, or Bookmarks page)");
			em4_nodes.forEach(detach);
			li16_nodes.forEach(detach);
			ul4_nodes.forEach(detach);
			t74 = claim_space(section2_nodes);
			p10 = claim_element(section2_nodes, "P", {});
			var p10_nodes = children(p10);
			img0 = claim_element(p10_nodes, "IMG", { src: true, alt: true });
			p10_nodes.forEach(detach);
			t75 = claim_space(section2_nodes);
			p11 = claim_element(section2_nodes, "P", {});
			var p11_nodes = children(p11);
			t76 = claim_text(p11_nodes, "Now you know the different components of a Chrome extension, let's look at the most important file in every extension, the ");
			code0 = claim_element(p11_nodes, "CODE", {});
			var code0_nodes = children(code0);
			t77 = claim_text(code0_nodes, "manifest.json");
			code0_nodes.forEach(detach);
			t78 = claim_text(p11_nodes, ".");
			p11_nodes.forEach(detach);
			section2_nodes.forEach(detach);
			t79 = claim_space(nodes);
			section3 = claim_element(nodes, "SECTION", {});
			var section3_nodes = children(section3);
			h22 = claim_element(section3_nodes, "H2", {});
			var h22_nodes = children(h22);
			a25 = claim_element(h22_nodes, "A", { href: true, id: true });
			var a25_nodes = children(a25);
			t80 = claim_text(a25_nodes, "manifest.json");
			a25_nodes.forEach(detach);
			h22_nodes.forEach(detach);
			t81 = claim_space(section3_nodes);
			p12 = claim_element(section3_nodes, "P", {});
			var p12_nodes = children(p12);
			code1 = claim_element(p12_nodes, "CODE", {});
			var code1_nodes = children(code1);
			t82 = claim_text(code1_nodes, "manifest.json");
			code1_nodes.forEach(detach);
			t83 = claim_text(p12_nodes, " is where you declare everything about the chrome extension:");
			p12_nodes.forEach(detach);
			t84 = claim_space(section3_nodes);
			pre0 = claim_element(section3_nodes, "PRE", { class: true });
			var pre0_nodes = children(pre0);
			pre0_nodes.forEach(detach);
			t85 = claim_space(section3_nodes);
			p13 = claim_element(section3_nodes, "P", {});
			var p13_nodes = children(p13);
			t86 = claim_text(p13_nodes, "You can declare all the UI elements inside the ");
			code2 = claim_element(p13_nodes, "CODE", {});
			var code2_nodes = children(code2);
			t87 = claim_text(code2_nodes, "manifest.json");
			code2_nodes.forEach(detach);
			t88 = claim_text(p13_nodes, ". You can also programmatically enable them inside the background script.");
			p13_nodes.forEach(detach);
			t89 = claim_space(section3_nodes);
			p14 = claim_element(section3_nodes, "P", {});
			var p14_nodes = children(p14);
			t90 = claim_text(p14_nodes, "For example, React Devtools shows a different React logo when the site does not use React, uses development React and uses production React:");
			p14_nodes.forEach(detach);
			t91 = claim_space(section3_nodes);
			pre1 = claim_element(section3_nodes, "PRE", { class: true });
			var pre1_nodes = children(pre1);
			pre1_nodes.forEach(detach);
			t92 = claim_space(section3_nodes);
			p15 = claim_element(section3_nodes, "P", {});
			var p15_nodes = children(p15);
			t93 = claim_text(p15_nodes, "Notice that the ");
			code3 = claim_element(p15_nodes, "CODE", {});
			var code3_nodes = children(code3);
			t94 = claim_text(code3_nodes, "options_page");
			code3_nodes.forEach(detach);
			t95 = claim_text(p15_nodes, ", ");
			code4 = claim_element(p15_nodes, "CODE", {});
			var code4_nodes = children(code4);
			t96 = claim_text(code4_nodes, "popup");
			code4_nodes.forEach(detach);
			t97 = claim_text(p15_nodes, " of the ");
			code5 = claim_element(p15_nodes, "CODE", {});
			var code5_nodes = children(code5);
			t98 = claim_text(code5_nodes, "browser_action");
			code5_nodes.forEach(detach);
			t99 = claim_text(p15_nodes, ", and ");
			code6 = claim_element(p15_nodes, "CODE", {});
			var code6_nodes = children(code6);
			t100 = claim_text(code6_nodes, "devtools_page");
			code6_nodes.forEach(detach);
			t101 = claim_text(p15_nodes, " field takes in a path to a HTML page. You can treat the HTML page as any web app, which you can use any framework of your liking to build it. For example, React Devtools is built with React!");
			p15_nodes.forEach(detach);
			t102 = claim_space(section3_nodes);
			pre2 = claim_element(section3_nodes, "PRE", { class: true });
			var pre2_nodes = children(pre2);
			pre2_nodes.forEach(detach);
			t103 = claim_space(section3_nodes);
			p16 = claim_element(section3_nodes, "P", {});
			var p16_nodes = children(p16);
			em5 = claim_element(p16_nodes, "EM", {});
			var em5_nodes = children(em5);
			t104 = claim_text(em5_nodes, "popup.html is just like any web app, that can be build with any web framework");
			em5_nodes.forEach(detach);
			p16_nodes.forEach(detach);
			t105 = claim_space(section3_nodes);
			p17 = claim_element(section3_nodes, "P", {});
			var p17_nodes = children(p17);
			t106 = claim_text(p17_nodes, "For the devtools page, you need to programmatically add panels to the devtools:");
			p17_nodes.forEach(detach);
			t107 = claim_space(section3_nodes);
			pre3 = claim_element(section3_nodes, "PRE", { class: true });
			var pre3_nodes = children(pre3);
			pre3_nodes.forEach(detach);
			section3_nodes.forEach(detach);
			t108 = claim_space(nodes);
			section4 = claim_element(nodes, "SECTION", {});
			var section4_nodes = children(section4);
			h23 = claim_element(section4_nodes, "H2", {});
			var h23_nodes = children(h23);
			a26 = claim_element(h23_nodes, "A", { href: true, id: true });
			var a26_nodes = children(a26);
			t109 = claim_text(a26_nodes, "Communicating between components");
			a26_nodes.forEach(detach);
			h23_nodes.forEach(detach);
			t110 = claim_space(section4_nodes);
			p18 = claim_element(section4_nodes, "P", {});
			var p18_nodes = children(p18);
			t111 = claim_text(p18_nodes, "Since only the content script runs in the context of the web page, if your extension requires to interact with the web page, you would need some way to communicate from the content script to the rest of the extension.");
			p18_nodes.forEach(detach);
			t112 = claim_space(section4_nodes);
			p19 = claim_element(section4_nodes, "P", {});
			var p19_nodes = children(p19);
			t113 = claim_text(p19_nodes, "For example, the React Devtools uses the content script to detect React version, and notify the background script to update the page action icon appropriately.");
			p19_nodes.forEach(detach);
			t114 = claim_space(section4_nodes);
			p20 = claim_element(section4_nodes, "P", {});
			var p20_nodes = children(p20);
			t115 = claim_text(p20_nodes, "The communication between different components of the Chrome extension works by using ");
			a27 = claim_element(p20_nodes, "A", { href: true, rel: true });
			var a27_nodes = children(a27);
			t116 = claim_text(a27_nodes, "message passing");
			a27_nodes.forEach(detach);
			t117 = claim_text(p20_nodes, ". There is API for ");
			a28 = claim_element(p20_nodes, "A", { href: true, rel: true });
			var a28_nodes = children(a28);
			t118 = claim_text(a28_nodes, "one-time request");
			a28_nodes.forEach(detach);
			t119 = claim_text(p20_nodes, " as well as ");
			a29 = claim_element(p20_nodes, "A", { href: true, rel: true });
			var a29_nodes = children(a29);
			t120 = claim_text(a29_nodes, "long-lived connections");
			a29_nodes.forEach(detach);
			t121 = claim_text(p20_nodes, ".");
			p20_nodes.forEach(detach);
			t122 = claim_space(section4_nodes);
			p21 = claim_element(section4_nodes, "P", {});
			var p21_nodes = children(p21);
			t123 = claim_text(p21_nodes, "The one-time request API works fine for a simple extension, but it gets messier when you have more communications going on between different parts of your extension.");
			p21_nodes.forEach(detach);
			t124 = claim_space(section4_nodes);
			p22 = claim_element(section4_nodes, "P", {});
			var p22_nodes = children(p22);
			t125 = claim_text(p22_nodes, "I studied how ");
			a30 = claim_element(p22_nodes, "A", { href: true, rel: true });
			var a30_nodes = children(a30);
			t126 = claim_text(a30_nodes, "React Devtools");
			a30_nodes.forEach(detach);
			t127 = claim_space(p22_nodes);
			a31 = claim_element(p22_nodes, "A", { href: true, rel: true });
			var a31_nodes = children(a31);
			t128 = claim_text(a31_nodes, "works");
			a31_nodes.forEach(detach);
			t129 = claim_text(p22_nodes, " in particular, because to show the updated React virtual DOM tree inside the devtools panel, a lot of communication is needed between the devtools and the content script.");
			p22_nodes.forEach(detach);
			t130 = claim_space(section4_nodes);
			p23 = claim_element(section4_nodes, "P", {});
			var p23_nodes = children(p23);
			t131 = claim_text(p23_nodes, "After some study and experimentation, I came up with the following architecture for my Chrome extension:");
			p23_nodes.forEach(detach);
			t132 = claim_space(section4_nodes);
			ul5 = claim_element(section4_nodes, "UL", {});
			var ul5_nodes = children(ul5);
			li17 = claim_element(ul5_nodes, "LI", {});
			var li17_nodes = children(li17);
			t133 = claim_text(li17_nodes, "All the extension components (eg: popup, content script, devtools) maintained a long-lived connection with the background script");
			li17_nodes.forEach(detach);
			t134 = claim_space(ul5_nodes);
			li18 = claim_element(ul5_nodes, "LI", {});
			var li18_nodes = children(li18);
			t135 = claim_text(li18_nodes, "The background script act as a central controller that receives messages from each component and dispatches them out to the relevant components");
			li18_nodes.forEach(detach);
			t136 = claim_space(ul5_nodes);
			li19 = claim_element(ul5_nodes, "LI", {});
			var li19_nodes = children(li19);
			t137 = claim_text(li19_nodes, "Each component is like an actor in the ");
			a32 = claim_element(li19_nodes, "A", { href: true, rel: true });
			var a32_nodes = children(a32);
			t138 = claim_text(a32_nodes, "actor model");
			a32_nodes.forEach(detach);
			t139 = claim_text(li19_nodes, ", where it acts on the messages received and sends out messages to the other actors where needed.");
			li19_nodes.forEach(detach);
			ul5_nodes.forEach(detach);
			t140 = claim_space(section4_nodes);
			p24 = claim_element(section4_nodes, "P", {});
			var p24_nodes = children(p24);
			img1 = claim_element(p24_nodes, "IMG", { src: true, alt: true });
			p24_nodes.forEach(detach);
			section4_nodes.forEach(detach);
			t141 = claim_space(nodes);
			section5 = claim_element(nodes, "SECTION", {});
			var section5_nodes = children(section5);
			h30 = claim_element(section5_nodes, "H3", {});
			var h30_nodes = children(h30);
			a33 = claim_element(h30_nodes, "A", { href: true, id: true });
			var a33_nodes = children(a33);
			t142 = claim_text(a33_nodes, "Communicating between the Content script and the web page");
			a33_nodes.forEach(detach);
			h30_nodes.forEach(detach);
			t143 = claim_space(section5_nodes);
			p25 = claim_element(section5_nodes, "P", {});
			var p25_nodes = children(p25);
			t144 = claim_text(p25_nodes, "The content script runs in the context of the web page, which means it can interact with the DOM, such as manipulating the DOM structure and adding event listeners to the DOM elements.");
			p25_nodes.forEach(detach);
			t145 = claim_space(section5_nodes);
			p26 = claim_element(section5_nodes, "P", {});
			var p26_nodes = children(p26);
			t146 = claim_text(p26_nodes, "Besides, the content script can access the page history, cookies, local storage and other browsers' APIs in the context of the web page.");
			p26_nodes.forEach(detach);
			t147 = claim_space(section5_nodes);
			p27 = claim_element(section5_nodes, "P", {});
			var p27_nodes = children(p27);
			t148 = claim_text(p27_nodes, "However, the content script lives in a different global scope of the web page. Meaning, if your web application declared a global variable ");
			code7 = claim_element(p27_nodes, "CODE", {});
			var code7_nodes = children(code7);
			t149 = claim_text(code7_nodes, "foo");
			code7_nodes.forEach(detach);
			t150 = claim_text(p27_nodes, ", it is not possible for the content script to access it.");
			p27_nodes.forEach(detach);
			t151 = claim_space(section5_nodes);
			pre4 = claim_element(section5_nodes, "PRE", { class: true });
			var pre4_nodes = children(pre4);
			pre4_nodes.forEach(detach);
			t152 = claim_space(section5_nodes);
			pre5 = claim_element(section5_nodes, "PRE", { class: true });
			var pre5_nodes = children(pre5);
			pre5_nodes.forEach(detach);
			t153 = claim_space(section5_nodes);
			p28 = claim_element(section5_nodes, "P", {});
			var p28_nodes = children(p28);
			t154 = claim_text(p28_nodes, "and the converse is true too:");
			p28_nodes.forEach(detach);
			t155 = claim_space(section5_nodes);
			pre6 = claim_element(section5_nodes, "PRE", { class: true });
			var pre6_nodes = children(pre6);
			pre6_nodes.forEach(detach);
			t156 = claim_space(section5_nodes);
			pre7 = claim_element(section5_nodes, "PRE", { class: true });
			var pre7_nodes = children(pre7);
			pre7_nodes.forEach(detach);
			t157 = claim_space(section5_nodes);
			p29 = claim_element(section5_nodes, "P", {});
			var p29_nodes = children(p29);
			t158 = claim_text(p29_nodes, "However, it is still possible for the content script to declare a variable into the web application, since it has access to the same DOM, it can do so by adding a script tag:");
			p29_nodes.forEach(detach);
			t159 = claim_space(section5_nodes);
			pre8 = claim_element(section5_nodes, "PRE", { class: true });
			var pre8_nodes = children(pre8);
			pre8_nodes.forEach(detach);
			t160 = claim_space(section5_nodes);
			pre9 = claim_element(section5_nodes, "PRE", { class: true });
			var pre9_nodes = children(pre9);
			pre9_nodes.forEach(detach);
			t161 = claim_space(section5_nodes);
			blockquote0 = claim_element(section5_nodes, "BLOCKQUOTE", {});
			var blockquote0_nodes = children(blockquote0);
			p30 = claim_element(blockquote0_nodes, "P", {});
			var p30_nodes = children(p30);
			strong4 = claim_element(p30_nodes, "STRONG", {});
			var strong4_nodes = children(strong4);
			t162 = claim_text(strong4_nodes, "Note:");
			strong4_nodes.forEach(detach);
			t163 = claim_text(p30_nodes, " Depending on ");
			a34 = claim_element(p30_nodes, "A", { href: true, rel: true });
			var a34_nodes = children(a34);
			t164 = claim_text(a34_nodes, "when you start running your content script");
			a34_nodes.forEach(detach);
			t165 = claim_text(p30_nodes, ", the DOM may or may not have constructed when your content script is executed.");
			p30_nodes.forEach(detach);
			blockquote0_nodes.forEach(detach);
			t166 = claim_space(section5_nodes);
			p31 = claim_element(section5_nodes, "P", {});
			var p31_nodes = children(p31);
			t167 = claim_text(p31_nodes, "Still, you can't declare a variable from a web application into the content script scope.");
			p31_nodes.forEach(detach);
			t168 = claim_space(section5_nodes);
			p32 = claim_element(section5_nodes, "P", {});
			var p32_nodes = children(p32);
			t169 = claim_text(p32_nodes, "I stumbled upon an idea where your web application can \"declare a variable\" through the dom by creating a special DOM element for content script consumption only:");
			p32_nodes.forEach(detach);
			t170 = claim_space(section5_nodes);
			pre10 = claim_element(section5_nodes, "PRE", { class: true });
			var pre10_nodes = children(pre10);
			pre10_nodes.forEach(detach);
			t171 = claim_space(section5_nodes);
			pre11 = claim_element(section5_nodes, "PRE", { class: true });
			var pre11_nodes = children(pre11);
			pre11_nodes.forEach(detach);
			t172 = claim_space(section5_nodes);
			p33 = claim_element(section5_nodes, "P", {});
			var p33_nodes = children(p33);
			t173 = claim_text(p33_nodes, "It is technically possible, though I wouldn't recommend it.");
			p33_nodes.forEach(detach);
			t174 = claim_space(section5_nodes);
			p34 = claim_element(section5_nodes, "P", {});
			var p34_nodes = children(p34);
			t175 = claim_text(p34_nodes, "Instead, you should use ");
			a35 = claim_element(p34_nodes, "A", { href: true, rel: true });
			var a35_nodes = children(a35);
			t176 = claim_text(a35_nodes, "window.postMessage");
			a35_nodes.forEach(detach);
			t177 = claim_text(p34_nodes, " to communicate between the web page and the content script.");
			p34_nodes.forEach(detach);
			t178 = claim_space(section5_nodes);
			pre12 = claim_element(section5_nodes, "PRE", { class: true });
			var pre12_nodes = children(pre12);
			pre12_nodes.forEach(detach);
			t179 = claim_space(section5_nodes);
			pre13 = claim_element(section5_nodes, "PRE", { class: true });
			var pre13_nodes = children(pre13);
			pre13_nodes.forEach(detach);
			t180 = claim_space(section5_nodes);
			blockquote1 = claim_element(section5_nodes, "BLOCKQUOTE", {});
			var blockquote1_nodes = children(blockquote1);
			p35 = claim_element(blockquote1_nodes, "P", {});
			var p35_nodes = children(p35);
			strong5 = claim_element(p35_nodes, "STRONG", {});
			var strong5_nodes = children(strong5);
			t181 = claim_text(strong5_nodes, "Note:");
			strong5_nodes.forEach(detach);
			t182 = claim_text(p35_nodes, " Be sure to add an identifier field, eg: ");
			code8 = claim_element(p35_nodes, "CODE", {});
			var code8_nodes = children(code8);
			t183 = claim_text(code8_nodes, "\"source\"");
			code8_nodes.forEach(detach);
			t184 = claim_text(p35_nodes, ", to the event data for filtering, you will be amazed by how much data is communicated through ");
			code9 = claim_element(p35_nodes, "CODE", {});
			var code9_nodes = children(code9);
			t185 = claim_text(code9_nodes, "window.postMessage");
			code9_nodes.forEach(detach);
			t186 = claim_text(p35_nodes, " if you don't filter out events that are sent from your use.");
			p35_nodes.forEach(detach);
			blockquote1_nodes.forEach(detach);
			section5_nodes.forEach(detach);
			t187 = claim_space(nodes);
			section6 = claim_element(nodes, "SECTION", {});
			var section6_nodes = children(section6);
			h4 = claim_element(section6_nodes, "H4", {});
			var h4_nodes = children(h4);
			a36 = claim_element(h4_nodes, "A", { href: true, id: true });
			var a36_nodes = children(a36);
			t188 = claim_text(a36_nodes, "Providing a hook to your extension");
			a36_nodes.forEach(detach);
			h4_nodes.forEach(detach);
			t189 = claim_space(section6_nodes);
			p36 = claim_element(section6_nodes, "P", {});
			var p36_nodes = children(p36);
			t190 = claim_text(p36_nodes, "If you installed ");
			a37 = claim_element(p36_nodes, "A", { href: true, rel: true });
			var a37_nodes = children(a37);
			t191 = claim_text(a37_nodes, "React Devtools");
			a37_nodes.forEach(detach);
			t192 = claim_text(p36_nodes, ", try type ");
			code10 = claim_element(p36_nodes, "CODE", {});
			var code10_nodes = children(code10);
			t193 = claim_text(code10_nodes, "__REACT_DEVTOOLS_GLOBAL_HOOK__");
			code10_nodes.forEach(detach);
			t194 = claim_text(p36_nodes, " in your console. This is a global object that was injected by React Devtools content script, to provide a simple interface for your web page to communicate with the content script.");
			p36_nodes.forEach(detach);
			t195 = claim_space(section6_nodes);
			p37 = claim_element(section6_nodes, "P", {});
			var p37_nodes = children(p37);
			t196 = claim_text(p37_nodes, "You can do so too:");
			p37_nodes.forEach(detach);
			t197 = claim_space(section6_nodes);
			pre14 = claim_element(section6_nodes, "PRE", { class: true });
			var pre14_nodes = children(pre14);
			pre14_nodes.forEach(detach);
			t198 = claim_space(section6_nodes);
			pre15 = claim_element(section6_nodes, "PRE", { class: true });
			var pre15_nodes = children(pre15);
			pre15_nodes.forEach(detach);
			t199 = claim_space(section6_nodes);
			p38 = claim_element(section6_nodes, "P", {});
			var p38_nodes = children(p38);
			t200 = claim_text(p38_nodes, "You can ");
			a38 = claim_element(p38_nodes, "A", { href: true, rel: true });
			var a38_nodes = children(a38);
			t201 = claim_text(a38_nodes, "check out my repo");
			a38_nodes.forEach(detach);
			t202 = claim_text(p38_nodes, " for a basic Chrome extension setup that includes all the code above.");
			p38_nodes.forEach(detach);
			t203 = claim_space(section6_nodes);
			p39 = claim_element(section6_nodes, "P", {});
			var p39_nodes = children(p39);
			t204 = claim_text(p39_nodes, "Congrats, we've cleared through the arguably hardest part developing Chrome extension!");
			p39_nodes.forEach(detach);
			t205 = claim_space(section6_nodes);
			p40 = claim_element(section6_nodes, "P", {});
			var p40_nodes = children(p40);
			t206 = claim_text(p40_nodes, "Now, let's see what kind of Chrome extension we can develop that can help us with our daily development.");
			p40_nodes.forEach(detach);
			section6_nodes.forEach(detach);
			t207 = claim_space(nodes);
			section7 = claim_element(nodes, "SECTION", {});
			var section7_nodes = children(section7);
			h24 = claim_element(section7_nodes, "H2", {});
			var h24_nodes = children(h24);
			a39 = claim_element(h24_nodes, "A", { href: true, id: true });
			var a39_nodes = children(a39);
			t208 = claim_text(a39_nodes, "What you can do with Chrome Extension");
			a39_nodes.forEach(detach);
			h24_nodes.forEach(detach);
			t209 = claim_space(section7_nodes);
			p41 = claim_element(section7_nodes, "P", {});
			var p41_nodes = children(p41);
			t210 = claim_text(p41_nodes, "I don't know about you, but ");
			a40 = claim_element(p41_nodes, "A", { href: true, rel: true });
			var a40_nodes = children(a40);
			t211 = claim_text(a40_nodes, "React DevTools");
			a40_nodes.forEach(detach);
			t212 = claim_text(p41_nodes, " and ");
			a41 = claim_element(p41_nodes, "A", { href: true, rel: true });
			var a41_nodes = children(a41);
			t213 = claim_text(a41_nodes, "Redux DevTools");
			a41_nodes.forEach(detach);
			t214 = claim_text(p41_nodes, " have been extremely helpful for my daily React development. Besides that, I've been using ");
			a42 = claim_element(p41_nodes, "A", { href: true, rel: true });
			var a42_nodes = children(a42);
			t215 = claim_text(a42_nodes, "EditThisCookie");
			a42_nodes.forEach(detach);
			t216 = claim_text(p41_nodes, " for cookie management, ");
			a43 = claim_element(p41_nodes, "A", { href: true, rel: true });
			var a43_nodes = children(a43);
			t217 = claim_text(a43_nodes, "JSON Formatter");
			a43_nodes.forEach(detach);
			t218 = claim_text(p41_nodes, " has been helping me with inspecting ");
			code11 = claim_element(p41_nodes, "CODE", {});
			var code11_nodes = children(code11);
			t219 = claim_text(code11_nodes, ".json");
			code11_nodes.forEach(detach);
			t220 = claim_text(p41_nodes, " files in Chrome, and there are a lot more extensions that made my development work easier, which I ");
			a44 = claim_element(p41_nodes, "A", { href: true });
			var a44_nodes = children(a44);
			t221 = claim_text(a44_nodes, "listed at the end of this article");
			a44_nodes.forEach(detach);
			t222 = claim_text(p41_nodes, ".");
			p41_nodes.forEach(detach);
			t223 = claim_space(section7_nodes);
			p42 = claim_element(section7_nodes, "P", {});
			var p42_nodes = children(p42);
			t224 = claim_text(p42_nodes, "As you can see, these extensions are specialised and helpful in a certain aspect of my development:");
			p42_nodes.forEach(detach);
			t225 = claim_space(section7_nodes);
			ul6 = claim_element(section7_nodes, "UL", {});
			var ul6_nodes = children(ul6);
			li20 = claim_element(ul6_nodes, "LI", {});
			var li20_nodes = children(li20);
			strong6 = claim_element(li20_nodes, "STRONG", {});
			var strong6_nodes = children(strong6);
			t226 = claim_text(strong6_nodes, "React Devtools");
			strong6_nodes.forEach(detach);
			t227 = claim_text(li20_nodes, " for debugging React Virtual DOM");
			li20_nodes.forEach(detach);
			t228 = claim_space(ul6_nodes);
			li21 = claim_element(ul6_nodes, "LI", {});
			var li21_nodes = children(li21);
			strong7 = claim_element(li21_nodes, "STRONG", {});
			var strong7_nodes = children(strong7);
			t229 = claim_text(strong7_nodes, "Redux Devtools");
			strong7_nodes.forEach(detach);
			t230 = claim_text(li21_nodes, " for debugging Redux store and time travel");
			li21_nodes.forEach(detach);
			t231 = claim_space(ul6_nodes);
			li22 = claim_element(ul6_nodes, "LI", {});
			var li22_nodes = children(li22);
			strong8 = claim_element(li22_nodes, "STRONG", {});
			var strong8_nodes = children(strong8);
			t232 = claim_text(strong8_nodes, "EditThisCookie");
			strong8_nodes.forEach(detach);
			t233 = claim_text(li22_nodes, " for debugging cookie");
			li22_nodes.forEach(detach);
			t234 = claim_space(ul6_nodes);
			li23 = claim_element(ul6_nodes, "LI", {});
			var li23_nodes = children(li23);
			t235 = claim_text(li23_nodes, "...");
			li23_nodes.forEach(detach);
			ul6_nodes.forEach(detach);
			t236 = claim_space(section7_nodes);
			p43 = claim_element(section7_nodes, "P", {});
			var p43_nodes = children(p43);
			t237 = claim_text(p43_nodes, "They are specialised for a generic React or Redux project, yet not specialised enough for your personal or your teams' development workspace.");
			p43_nodes.forEach(detach);
			t238 = claim_space(section7_nodes);
			p44 = claim_element(section7_nodes, "P", {});
			var p44_nodes = children(p44);
			t239 = claim_text(p44_nodes, "In the following, I will show you a few examples, along with source code for each example, and hopefully, these examples will inspire you to create your Chrome extension.");
			p44_nodes.forEach(detach);
			section7_nodes.forEach(detach);
			t240 = claim_space(nodes);
			section8 = claim_element(nodes, "SECTION", {});
			var section8_nodes = children(section8);
			h31 = claim_element(section8_nodes, "H3", {});
			var h31_nodes = children(h31);
			a45 = claim_element(h31_nodes, "A", { href: true, id: true });
			var a45_nodes = children(a45);
			t241 = claim_text(a45_nodes, "Switching environments and feature toggles");
			a45_nodes.forEach(detach);
			h31_nodes.forEach(detach);
			t242 = claim_space(section8_nodes);
			p45 = claim_element(section8_nodes, "P", {});
			var p45_nodes = children(p45);
			t243 = claim_text(p45_nodes, "A web application is usually served in different environments ");
			em6 = claim_element(p45_nodes, "EM", {});
			var em6_nodes = children(em6);
			t244 = claim_text(em6_nodes, "(eg: test, staging, live)");
			em6_nodes.forEach(detach);
			t245 = claim_text(p45_nodes, ", different languages ");
			em7 = claim_element(p45_nodes, "EM", {});
			var em7_nodes = children(em7);
			t246 = claim_text(em7_nodes, "(eg: english, chinese)");
			em7_nodes.forEach(detach);
			t247 = claim_text(p45_nodes, ", and may have different feature toggles to enable / disable features on the web app.");
			p45_nodes.forEach(detach);
			t248 = claim_space(section8_nodes);
			p46 = claim_element(section8_nodes, "P", {});
			var p46_nodes = children(p46);
			t249 = claim_text(p46_nodes, "Depending on your web app setup, switching environments, language or feature toggles may require you to mock it, or manually editing cookie / local storage (if your flags are persisted there).");
			p46_nodes.forEach(detach);
			t250 = claim_space(section8_nodes);
			p47 = claim_element(section8_nodes, "P", {});
			var p47_nodes = children(p47);
			t251 = claim_text(p47_nodes, "Think about how you would need to educate every new developer / QA / PM on how to manually switching environments, language, or feature toggles.");
			p47_nodes.forEach(detach);
			t252 = claim_space(section8_nodes);
			p48 = claim_element(section8_nodes, "P", {});
			var p48_nodes = children(p48);
			t253 = claim_text(p48_nodes, "What if instead, you have a Chrome extension that provides an intuitive UI that allows you to do that?");
			p48_nodes.forEach(detach);
			t254 = claim_space(section8_nodes);
			p49 = claim_element(section8_nodes, "P", {});
			var p49_nodes = children(p49);
			img2 = claim_element(p49_nodes, "IMG", { src: true, alt: true });
			p49_nodes.forEach(detach);
			t255 = claim_space(section8_nodes);
			p50 = claim_element(section8_nodes, "P", {});
			var p50_nodes = children(p50);
			t256 = claim_text(p50_nodes, "You can have the extension write into cookie / local storage. You can subscribe to events from extension and make changes appropriately in your web app.");
			p50_nodes.forEach(detach);
			t257 = claim_space(section8_nodes);
			p51 = claim_element(section8_nodes, "P", {});
			var p51_nodes = children(p51);
			t258 = claim_text(p51_nodes, "Do it however you like, it's your Chrome extension.");
			p51_nodes.forEach(detach);
			t259 = claim_space(section8_nodes);
			p52 = claim_element(section8_nodes, "P", {});
			var p52_nodes = children(p52);
			a46 = claim_element(p52_nodes, "A", { href: true, rel: true });
			var a46_nodes = children(a46);
			t260 = claim_text(a46_nodes, "Code for demo");
			a46_nodes.forEach(detach);
			p52_nodes.forEach(detach);
			section8_nodes.forEach(detach);
			t261 = claim_space(nodes);
			section9 = claim_element(nodes, "SECTION", {});
			var section9_nodes = children(section9);
			h32 = claim_element(section9_nodes, "H3", {});
			var h32_nodes = children(h32);
			a47 = claim_element(h32_nodes, "A", { href: true, id: true });
			var a47_nodes = children(a47);
			t262 = claim_text(a47_nodes, "Reporting bugs with screen recording");
			a47_nodes.forEach(detach);
			h32_nodes.forEach(detach);
			t263 = claim_space(section9_nodes);
			p53 = claim_element(section9_nodes, "P", {});
			var p53_nodes = children(p53);
			t264 = claim_text(p53_nodes, "Maybe you are using a screen recording tool to record bugs, or you are using some paid service, like ");
			a48 = claim_element(p53_nodes, "A", { href: true, rel: true });
			var a48_nodes = children(a48);
			t265 = claim_text(a48_nodes, "LogRocket");
			a48_nodes.forEach(detach);
			t266 = claim_text(p53_nodes, " to record down every user interaction, but how well are they integrated with your bug tracking system?");
			p53_nodes.forEach(detach);
			t267 = claim_space(section9_nodes);
			p54 = claim_element(section9_nodes, "P", {});
			var p54_nodes = children(p54);
			t268 = claim_text(p54_nodes, "You can have a Chrome extension that uses ");
			a49 = claim_element(p54_nodes, "A", { href: true, rel: true });
			var a49_nodes = children(a49);
			t269 = claim_text(a49_nodes, "chrome.tabCapture");
			a49_nodes.forEach(detach);
			t270 = claim_text(p54_nodes, " API to record video recordings of the tab, getting essential information of your application, such as the state of your web app, console errors, network requests, and send them to your bug tracking system.");
			p54_nodes.forEach(detach);
			t271 = claim_space(section9_nodes);
			p55 = claim_element(section9_nodes, "P", {});
			var p55_nodes = children(p55);
			t272 = claim_text(p55_nodes, "You can pass along information that is unique to your development setup, such as Redux store / ");
			a50 = claim_element(p55_nodes, "A", { href: true, rel: true });
			var a50_nodes = children(a50);
			t273 = claim_text(a50_nodes, "Vuex");
			a50_nodes.forEach(detach);
			t274 = claim_text(p55_nodes, " store / ");
			a51 = claim_element(p55_nodes, "A", { href: true, rel: true });
			var a51_nodes = children(a51);
			t275 = claim_text(a51_nodes, "Svelte store");
			a51_nodes.forEach(detach);
			t276 = claim_text(p55_nodes, " state and actions history, feature toggles, request ids...");
			p55_nodes.forEach(detach);
			t277 = claim_space(section9_nodes);
			p56 = claim_element(section9_nodes, "P", {});
			var p56_nodes = children(p56);
			t278 = claim_text(p56_nodes, "And you can integrate with your bug tracking system, be it ");
			a52 = claim_element(p56_nodes, "A", { href: true, rel: true });
			var a52_nodes = children(a52);
			t279 = claim_text(a52_nodes, "Jira");
			a52_nodes.forEach(detach);
			t280 = claim_text(p56_nodes, ", ");
			a53 = claim_element(p56_nodes, "A", { href: true, rel: true });
			var a53_nodes = children(a53);
			t281 = claim_text(a53_nodes, "Trello");
			a53_nodes.forEach(detach);
			t282 = claim_text(p56_nodes, ", ");
			a54 = claim_element(p56_nodes, "A", { href: true, rel: true });
			var a54_nodes = children(a54);
			t283 = claim_text(a54_nodes, "Google Sheets");
			a54_nodes.forEach(detach);
			t284 = claim_text(p56_nodes, ", email or some in-house systems.");
			p56_nodes.forEach(detach);
			t285 = claim_space(section9_nodes);
			p57 = claim_element(section9_nodes, "P", {});
			var p57_nodes = children(p57);
			t286 = claim_text(p57_nodes, "The idea is that your extension can be personalised to your development workspace setup.");
			p57_nodes.forEach(detach);
			t287 = claim_space(section9_nodes);
			p58 = claim_element(section9_nodes, "P", {});
			var p58_nodes = children(p58);
			img3 = claim_element(p58_nodes, "IMG", { src: true, alt: true });
			p58_nodes.forEach(detach);
			t288 = claim_space(section9_nodes);
			p59 = claim_element(section9_nodes, "P", {});
			var p59_nodes = children(p59);
			a55 = claim_element(p59_nodes, "A", { href: true, rel: true });
			var a55_nodes = children(a55);
			t289 = claim_text(a55_nodes, "Code for demo");
			a55_nodes.forEach(detach);
			p59_nodes.forEach(detach);
			section9_nodes.forEach(detach);
			t290 = claim_space(nodes);
			section10 = claim_element(nodes, "SECTION", {});
			var section10_nodes = children(section10);
			h33 = claim_element(section10_nodes, "H3", {});
			var h33_nodes = children(h33);
			a56 = claim_element(h33_nodes, "A", { href: true, id: true });
			var a56_nodes = children(a56);
			t291 = claim_text(a56_nodes, "Debugging events and analytics");
			a56_nodes.forEach(detach);
			h33_nodes.forEach(detach);
			t292 = claim_space(section10_nodes);
			p60 = claim_element(section10_nodes, "P", {});
			var p60_nodes = children(p60);
			t293 = claim_text(p60_nodes, "Debugging and testing log and analytic events is usually a hassle.");
			p60_nodes.forEach(detach);
			t294 = claim_space(section10_nodes);
			p61 = claim_element(section10_nodes, "P", {});
			var p61_nodes = children(p61);
			t295 = claim_text(p61_nodes, "Usually, especially production build, events are not logged out in the console. Hence, the only way to inspect and debug those events is to use the network inspector, inspecting the request body when those events are being sent out to a backend server.");
			p61_nodes.forEach(detach);
			t296 = claim_space(section10_nodes);
			p62 = claim_element(section10_nodes, "P", {});
			var p62_nodes = children(p62);
			t297 = claim_text(p62_nodes, "What if we log those events out only when the extension is installed?");
			p62_nodes.forEach(detach);
			t298 = claim_space(section10_nodes);
			p63 = claim_element(section10_nodes, "P", {});
			var p63_nodes = children(p63);
			t299 = claim_text(p63_nodes, "Just like ");
			a57 = claim_element(p63_nodes, "A", { href: true, rel: true });
			var a57_nodes = children(a57);
			t300 = claim_text(a57_nodes, "Google Analytics Debuger");
			a57_nodes.forEach(detach);
			t301 = claim_text(p63_nodes, ", the extension provides a switch to turn on the debug mode of the google analytics client.");
			p63_nodes.forEach(detach);
			t302 = claim_space(section10_nodes);
			pre16 = claim_element(section10_nodes, "PRE", { class: true });
			var pre16_nodes = children(pre16);
			pre16_nodes.forEach(detach);
			t303 = claim_space(section10_nodes);
			p64 = claim_element(section10_nodes, "P", {});
			var p64_nodes = children(p64);
			img4 = claim_element(p64_nodes, "IMG", { src: true, alt: true });
			p64_nodes.forEach(detach);
			t304 = claim_space(section10_nodes);
			p65 = claim_element(section10_nodes, "P", {});
			var p65_nodes = children(p65);
			a58 = claim_element(p65_nodes, "A", { href: true, rel: true });
			var a58_nodes = children(a58);
			t305 = claim_text(a58_nodes, "Code for demo");
			a58_nodes.forEach(detach);
			p65_nodes.forEach(detach);
			section10_nodes.forEach(detach);
			t306 = claim_space(nodes);
			section11 = claim_element(nodes, "SECTION", {});
			var section11_nodes = children(section11);
			h25 = claim_element(section11_nodes, "H2", {});
			var h25_nodes = children(h25);
			a59 = claim_element(h25_nodes, "A", { href: true, id: true });
			var a59_nodes = children(a59);
			t307 = claim_text(a59_nodes, "Closing Note");
			a59_nodes.forEach(detach);
			h25_nodes.forEach(detach);
			t308 = claim_space(section11_nodes);
			p66 = claim_element(section11_nodes, "P", {});
			var p66_nodes = children(p66);
			t309 = claim_text(p66_nodes, "I've shown you how you can create your Chrome extension, and also provided some extension ideas you can have. It's your turn to write your Chrome extension and create your personalised development workspace.");
			p66_nodes.forEach(detach);
			t310 = claim_space(section11_nodes);
			p67 = claim_element(section11_nodes, "P", {});
			var p67_nodes = children(p67);
			t311 = claim_text(p67_nodes, "Share with me what your Chrome extension can do, looking forward to seeing them!");
			p67_nodes.forEach(detach);
			section11_nodes.forEach(detach);
			t312 = claim_space(nodes);
			section12 = claim_element(nodes, "SECTION", {});
			var section12_nodes = children(section12);
			h26 = claim_element(section12_nodes, "H2", {});
			var h26_nodes = children(h26);
			a60 = claim_element(h26_nodes, "A", { href: true, id: true });
			var a60_nodes = children(a60);
			t313 = claim_text(a60_nodes, "Extensions that has helped my daily development");
			a60_nodes.forEach(detach);
			h26_nodes.forEach(detach);
			t314 = claim_space(section12_nodes);
			ul7 = claim_element(section12_nodes, "UL", {});
			var ul7_nodes = children(ul7);
			li24 = claim_element(ul7_nodes, "LI", {});
			var li24_nodes = children(li24);
			a61 = claim_element(li24_nodes, "A", { href: true, rel: true });
			var a61_nodes = children(a61);
			t315 = claim_text(a61_nodes, "React Devtools");
			a61_nodes.forEach(detach);
			t316 = claim_text(li24_nodes, " - Inspect React virtual DOM");
			li24_nodes.forEach(detach);
			t317 = claim_space(ul7_nodes);
			li25 = claim_element(ul7_nodes, "LI", {});
			var li25_nodes = children(li25);
			a62 = claim_element(li25_nodes, "A", { href: true, rel: true });
			var a62_nodes = children(a62);
			t318 = claim_text(a62_nodes, "Redux DevTools");
			a62_nodes.forEach(detach);
			t319 = claim_text(li25_nodes, " - Redux store inspection and time travel");
			li25_nodes.forEach(detach);
			t320 = claim_space(ul7_nodes);
			li26 = claim_element(ul7_nodes, "LI", {});
			var li26_nodes = children(li26);
			a63 = claim_element(li26_nodes, "A", { href: true, rel: true });
			var a63_nodes = children(a63);
			t321 = claim_text(a63_nodes, "JSON Formatter");
			a63_nodes.forEach(detach);
			t322 = claim_text(li26_nodes, " - Makes JSON easy to read.");
			li26_nodes.forEach(detach);
			t323 = claim_space(ul7_nodes);
			li27 = claim_element(ul7_nodes, "LI", {});
			var li27_nodes = children(li27);
			a64 = claim_element(li27_nodes, "A", { href: true, rel: true });
			var a64_nodes = children(a64);
			t324 = claim_text(a64_nodes, "EditThisCookie");
			a64_nodes.forEach(detach);
			t325 = claim_text(li27_nodes, " - Debugging cookie on a page");
			li27_nodes.forEach(detach);
			t326 = claim_space(ul7_nodes);
			li28 = claim_element(ul7_nodes, "LI", {});
			var li28_nodes = children(li28);
			a65 = claim_element(li28_nodes, "A", { href: true, rel: true });
			var a65_nodes = children(a65);
			t327 = claim_text(a65_nodes, "Google Analytics Debuger");
			a65_nodes.forEach(detach);
			t328 = claim_text(li28_nodes, " - Debugging Google Analytics");
			li28_nodes.forEach(detach);
			t329 = claim_space(ul7_nodes);
			li29 = claim_element(ul7_nodes, "LI", {});
			var li29_nodes = children(li29);
			a66 = claim_element(li29_nodes, "A", { href: true, rel: true });
			var a66_nodes = children(a66);
			t330 = claim_text(a66_nodes, "OpenLink Structured Data Sniffer");
			a66_nodes.forEach(detach);
			t331 = claim_text(li29_nodes, " - Debugging structured metadata within the web page");
			li29_nodes.forEach(detach);
			t332 = claim_space(ul7_nodes);
			li30 = claim_element(ul7_nodes, "LI", {});
			var li30_nodes = children(li30);
			a67 = claim_element(li30_nodes, "A", { href: true, rel: true });
			var a67_nodes = children(a67);
			t333 = claim_text(a67_nodes, "VisBug");
			a67_nodes.forEach(detach);
			t334 = claim_text(li30_nodes, " - Web design debug tool");
			li30_nodes.forEach(detach);
			t335 = claim_space(ul7_nodes);
			li31 = claim_element(ul7_nodes, "LI", {});
			var li31_nodes = children(li31);
			a68 = claim_element(li31_nodes, "A", { href: true, rel: true });
			var a68_nodes = children(a68);
			t336 = claim_text(a68_nodes, "Wappalyzer");
			a68_nodes.forEach(detach);
			t337 = claim_text(li31_nodes, " - Detect web technologies on a web page");
			li31_nodes.forEach(detach);
			t338 = claim_space(ul7_nodes);
			li32 = claim_element(ul7_nodes, "LI", {});
			var li32_nodes = children(li32);
			strong9 = claim_element(li32_nodes, "STRONG", {});
			var strong9_nodes = children(strong9);
			t339 = claim_text(strong9_nodes, "Shopee DevTools");
			strong9_nodes.forEach(detach);
			t340 = claim_text(li32_nodes, " - Only available in-house, ");
			a69 = claim_element(li32_nodes, "A", { href: true, rel: true });
			var a69_nodes = children(a69);
			t341 = claim_text(a69_nodes, "join our team");
			a69_nodes.forEach(detach);
			t342 = claim_text(li32_nodes, " and I'll show you what other amazing things you can do with ");
			strong10 = claim_element(li32_nodes, "STRONG", {});
			var strong10_nodes = children(strong10);
			t343 = claim_text(strong10_nodes, "Shopee DevTools");
			strong10_nodes.forEach(detach);
			t344 = claim_text(li32_nodes, "!");
			li32_nodes.forEach(detach);
			ul7_nodes.forEach(detach);
			section12_nodes.forEach(detach);
			this.h();
		},
		h() {
			attr(a0, "href", "#abstract");
			attr(a1, "href", "#overview");
			attr(a2, "href", "#manifest-json");
			attr(a3, "href", "#communicating-between-components");
			attr(a4, "href", "#communicating-between-the-content-script-and-the-web-page");
			attr(a5, "href", "#providing-a-hook-to-your-extension");
			attr(a6, "href", "#what-you-can-do-with-chrome-extension");
			attr(a7, "href", "#switching-environments-and-feature-toggles");
			attr(a8, "href", "#reporting-bugs-with-screen-recording");
			attr(a9, "href", "#debugging-events-and-analytics");
			attr(a10, "href", "#closing-note");
			attr(a11, "href", "#extensions-that-has-helped-my-daily-development");
			attr(ul3, "class", "sitemap");
			attr(ul3, "id", "sitemap");
			attr(ul3, "role", "navigation");
			attr(ul3, "aria-label", "Table of Contents");
			attr(a12, "href", "#abstract");
			attr(a12, "id", "abstract");
			attr(a13, "href", "#overview");
			attr(a14, "href", "#what-you-can-do-with-chrome-extension");
			attr(a15, "href", "#overview");
			attr(a15, "id", "overview");
			attr(a16, "href", "https://developer.chrome.com/extensions/background_pages");
			attr(a16, "rel", "nofollow");
			attr(a17, "href", "https://developer.chrome.com/extensions/content_scripts");
			attr(a17, "rel", "nofollow");
			attr(a18, "href", "https://developer.chrome.com/extensions/options");
			attr(a18, "rel", "nofollow");
			attr(a19, "href", "https://developer.chrome.com/extensions/user_interface");
			attr(a19, "rel", "nofollow");
			attr(a20, "href", "https://developer.chrome.com/extensions/user_interface#browser_action");
			attr(a20, "rel", "nofollow");
			attr(a21, "href", "https://developer.chrome.com/extensions/user_interface#popup");
			attr(a21, "rel", "nofollow");
			attr(a22, "href", "https://developer.chrome.com/extensions/user_interface#context_menu");
			attr(a22, "rel", "nofollow");
			attr(a23, "href", "https://developer.chrome.com/extensions/devtools");
			attr(a23, "rel", "nofollow");
			attr(a24, "href", "https://developer.chrome.com/extensions/user_interface#override");
			attr(a24, "rel", "nofollow");
			if (img0.src !== (img0_src_value = __build_img__0)) attr(img0, "src", img0_src_value);
			attr(img0, "alt", "ui elements on extension");
			attr(a25, "href", "#manifest-json");
			attr(a25, "id", "manifest-json");
			attr(pre0, "class", "language-json");
			attr(pre1, "class", "language-js");
			attr(pre2, "class", "language-html");
			attr(pre3, "class", "language-js");
			attr(a26, "href", "#communicating-between-components");
			attr(a26, "id", "communicating-between-components");
			attr(a27, "href", "https://developer.chrome.com/extensions/messaging");
			attr(a27, "rel", "nofollow");
			attr(a28, "href", "https://developer.chrome.com/extensions/messaging#simple");
			attr(a28, "rel", "nofollow");
			attr(a29, "href", "https://developer.chrome.com/extensions/messaging#connect");
			attr(a29, "rel", "nofollow");
			attr(a30, "href", "https://github.com/facebook/react/tree/master/packages/react-devtools-core");
			attr(a30, "rel", "nofollow");
			attr(a31, "href", "https://github.com/facebook/react/blob/master/packages/react-devtools/OVERVIEW.md");
			attr(a31, "rel", "nofollow");
			attr(a32, "href", "https://en.wikipedia.org/wiki/Actor_model");
			attr(a32, "rel", "nofollow");
			if (img1.src !== (img1_src_value = __build_img__1)) attr(img1, "src", img1_src_value);
			attr(img1, "alt", "communication between components");
			attr(a33, "href", "#communicating-between-the-content-script-and-the-web-page");
			attr(a33, "id", "communicating-between-the-content-script-and-the-web-page");
			attr(pre4, "class", "language-html");
			attr(pre5, "class", "language-js");
			attr(pre6, "class", "language-js");
			attr(pre7, "class", "language-html");
			attr(pre8, "class", "language-js");
			attr(pre9, "class", "language-html");
			attr(a34, "href", "https://developer.chrome.com/extensions/content_scripts#run_time");
			attr(a34, "rel", "nofollow");
			attr(pre10, "class", "language-html");
			attr(pre11, "class", "language-js");
			attr(a35, "href", "https://developer.mozilla.org/en-US/docs/Web/API/Window/postMessage");
			attr(a35, "rel", "nofollow");
			attr(pre12, "class", "language-html");
			attr(pre13, "class", "language-js");
			attr(a36, "href", "#providing-a-hook-to-your-extension");
			attr(a36, "id", "providing-a-hook-to-your-extension");
			attr(a37, "href", "https://chrome.google.com/webstore/detail/react-developer-tools/fmkadmapgofadopljbjfkapdkoienihi");
			attr(a37, "rel", "nofollow");
			attr(pre14, "class", "language-html");
			attr(pre15, "class", "language-js");
			attr(a38, "href", "https://github.com/tanhauhau/chrome-extension-demo/tree/master/basic");
			attr(a38, "rel", "nofollow");
			attr(a39, "href", "#what-you-can-do-with-chrome-extension");
			attr(a39, "id", "what-you-can-do-with-chrome-extension");
			attr(a40, "href", "https://chrome.google.com/webstore/detail/react-developer-tools/fmkadmapgofadopljbjfkapdkoienihi?hl=en");
			attr(a40, "rel", "nofollow");
			attr(a41, "href", "https://chrome.google.com/webstore/detail/redux-devtools/lmhkpmbekcpmknklioeibfkpmmfibljd?hl=en");
			attr(a41, "rel", "nofollow");
			attr(a42, "href", "https://chrome.google.com/webstore/detail/editthiscookie/fngmhnnpilhplaeedifhccceomclgfbg");
			attr(a42, "rel", "nofollow");
			attr(a43, "href", "https://chrome.google.com/webstore/detail/json-formatter/bcjindcccaagfpapjjmafapmmgkkhgoa");
			attr(a43, "rel", "nofollow");
			attr(a44, "href", "#extensions-that-has-helped-my-daily-development");
			attr(a45, "href", "#switching-environments-and-feature-toggles");
			attr(a45, "id", "switching-environments-and-feature-toggles");
			if (img2.src !== (img2_src_value = __build_img__2)) attr(img2, "src", img2_src_value);
			attr(img2, "alt", "switching feature toggles with chrome extension");
			attr(a46, "href", "https://github.com/tanhauhau/chrome-extension-demo/tree/master/feature-toggles");
			attr(a46, "rel", "nofollow");
			attr(a47, "href", "#reporting-bugs-with-screen-recording");
			attr(a47, "id", "reporting-bugs-with-screen-recording");
			attr(a48, "href", "https://logrocket.com/");
			attr(a48, "rel", "nofollow");
			attr(a49, "href", "https://developer.chrome.com/extensions/tabCapture");
			attr(a49, "rel", "nofollow");
			attr(a50, "href", "https://vuex.vuejs.org/guide/");
			attr(a50, "rel", "nofollow");
			attr(a51, "href", "https://svelte.dev/tutorial/writable-stores");
			attr(a51, "rel", "nofollow");
			attr(a52, "href", "https://www.atlassian.com/software/jira");
			attr(a52, "rel", "nofollow");
			attr(a53, "href", "http://trello.com/");
			attr(a53, "rel", "nofollow");
			attr(a54, "href", "http://sheets.google.com/");
			attr(a54, "rel", "nofollow");
			if (img3.src !== (img3_src_value = __build_img__3)) attr(img3, "src", img3_src_value);
			attr(img3, "alt", "bug reporter");
			attr(a55, "href", "https://github.com/tanhauhau/chrome-extension-demo/tree/master/bug-recording");
			attr(a55, "rel", "nofollow");
			attr(a56, "href", "#debugging-events-and-analytics");
			attr(a56, "id", "debugging-events-and-analytics");
			attr(a57, "href", "https://chrome.google.com/webstore/detail/google-analytics-debugger/jnkmfdileelhofjcijamephohjechhna");
			attr(a57, "rel", "nofollow");
			attr(pre16, "class", "language-html");
			if (img4.src !== (img4_src_value = __build_img__4)) attr(img4, "src", img4_src_value);
			attr(img4, "alt", "events analytics");
			attr(a58, "href", "https://github.com/tanhauhau/chrome-extension-demo/tree/master/events-analytics");
			attr(a58, "rel", "nofollow");
			attr(a59, "href", "#closing-note");
			attr(a59, "id", "closing-note");
			attr(a60, "href", "#extensions-that-has-helped-my-daily-development");
			attr(a60, "id", "extensions-that-has-helped-my-daily-development");
			attr(a61, "href", "https://chrome.google.com/webstore/detail/react-developer-tools/fmkadmapgofadopljbjfkapdkoienihi");
			attr(a61, "rel", "nofollow");
			attr(a62, "href", "https://chrome.google.com/webstore/detail/redux-devtools/lmhkpmbekcpmknklioeibfkpmmfibljd?hl=en");
			attr(a62, "rel", "nofollow");
			attr(a63, "href", "https://chrome.google.com/webstore/detail/json-formatter/bcjindcccaagfpapjjmafapmmgkkhgoa");
			attr(a63, "rel", "nofollow");
			attr(a64, "href", "https://chrome.google.com/webstore/detail/editthiscookie/fngmhnnpilhplaeedifhccceomclgfbg");
			attr(a64, "rel", "nofollow");
			attr(a65, "href", "https://chrome.google.com/webstore/detail/google-analytics-debugger/jnkmfdileelhofjcijamephohjechhna");
			attr(a65, "rel", "nofollow");
			attr(a66, "href", "https://chrome.google.com/webstore/detail/openlink-structured-data/egdaiaihbdoiibopledjahjaihbmjhdj");
			attr(a66, "rel", "nofollow");
			attr(a67, "href", "https://chrome.google.com/webstore/detail/cdockenadnadldjbbgcallicgledbeoc");
			attr(a67, "rel", "nofollow");
			attr(a68, "href", "https://chrome.google.com/webstore/detail/wappalyzer/gppongmhjkpfnbhagpmjfkannfbllamg");
			attr(a68, "rel", "nofollow");
			attr(a69, "href", "https://grnh.se/2cf965792");
			attr(a69, "rel", "nofollow");
		},
		m(target, anchor) {
			insert(target, section0, anchor);
			append(section0, ul3);
			append(ul3, li0);
			append(li0, a0);
			append(a0, t0);
			append(ul3, li1);
			append(li1, a1);
			append(a1, t1);
			append(ul3, li2);
			append(li2, a2);
			append(a2, t2);
			append(ul3, li3);
			append(li3, a3);
			append(a3, t3);
			append(ul3, ul1);
			append(ul1, li4);
			append(li4, a4);
			append(a4, t4);
			append(ul1, ul0);
			append(ul0, li5);
			append(li5, a5);
			append(a5, t5);
			append(ul3, li6);
			append(li6, a6);
			append(a6, t6);
			append(ul3, ul2);
			append(ul2, li7);
			append(li7, a7);
			append(a7, t7);
			append(ul2, li8);
			append(li8, a8);
			append(a8, t8);
			append(ul2, li9);
			append(li9, a9);
			append(a9, t9);
			append(ul3, li10);
			append(li10, a10);
			append(a10, t10);
			append(ul3, li11);
			append(li11, a11);
			append(a11, t11);
			insert(target, t12, anchor);
			insert(target, p0, anchor);
			append(p0, t13);
			insert(target, t14, anchor);
			insert(target, p1, anchor);
			append(p1, t15);
			insert(target, t16, anchor);
			insert(target, section1, anchor);
			append(section1, h20);
			append(h20, a12);
			append(a12, t17);
			append(section1, t18);
			append(section1, p2);
			append(p2, t19);
			append(section1, t20);
			append(section1, p3);
			append(p3, t21);
			append(p3, a13);
			append(a13, t22);
			append(p3, t23);
			append(p3, a14);
			append(a14, t24);
			append(p3, t25);
			append(section1, t26);
			append(section1, p4);
			append(p4, t27);
			insert(target, t28, anchor);
			insert(target, section2, anchor);
			append(section2, h21);
			append(h21, a15);
			append(a15, t29);
			append(section2, t30);
			append(section2, p5);
			append(p5, t31);
			append(p5, a16);
			append(a16, t32);
			append(p5, t33);
			append(p5, a17);
			append(a17, t34);
			append(p5, t35);
			append(p5, a18);
			append(a18, t36);
			append(p5, t37);
			append(p5, a19);
			append(a19, t38);
			append(p5, t39);
			append(section2, t40);
			append(section2, p6);
			append(p6, t41);
			append(p6, strong0);
			append(strong0, t42);
			append(p6, t43);
			append(section2, t44);
			append(section2, p7);
			append(p7, strong1);
			append(strong1, t45);
			append(p7, t46);
			append(section2, t47);
			append(section2, p8);
			append(p8, strong2);
			append(strong2, t48);
			append(p8, t49);
			append(section2, t50);
			append(section2, p9);
			append(p9, t51);
			append(p9, strong3);
			append(strong3, t52);
			append(p9, t53);
			append(section2, t54);
			append(section2, ul4);
			append(ul4, li12);
			append(li12, a20);
			append(a20, t55);
			append(li12, t56);
			append(li12, em0);
			append(em0, t57);
			append(ul4, t58);
			append(ul4, li13);
			append(li13, a21);
			append(a21, t59);
			append(li13, t60);
			append(li13, em1);
			append(em1, t61);
			append(ul4, t62);
			append(ul4, li14);
			append(li14, a22);
			append(a22, t63);
			append(li14, t64);
			append(li14, em2);
			append(em2, t65);
			append(ul4, t66);
			append(ul4, li15);
			append(li15, a23);
			append(a23, t67);
			append(li15, t68);
			append(li15, em3);
			append(em3, t69);
			append(ul4, t70);
			append(ul4, li16);
			append(li16, a24);
			append(a24, t71);
			append(li16, t72);
			append(li16, em4);
			append(em4, t73);
			append(section2, t74);
			append(section2, p10);
			append(p10, img0);
			append(section2, t75);
			append(section2, p11);
			append(p11, t76);
			append(p11, code0);
			append(code0, t77);
			append(p11, t78);
			insert(target, t79, anchor);
			insert(target, section3, anchor);
			append(section3, h22);
			append(h22, a25);
			append(a25, t80);
			append(section3, t81);
			append(section3, p12);
			append(p12, code1);
			append(code1, t82);
			append(p12, t83);
			append(section3, t84);
			append(section3, pre0);
			pre0.innerHTML = raw0_value;
			append(section3, t85);
			append(section3, p13);
			append(p13, t86);
			append(p13, code2);
			append(code2, t87);
			append(p13, t88);
			append(section3, t89);
			append(section3, p14);
			append(p14, t90);
			append(section3, t91);
			append(section3, pre1);
			pre1.innerHTML = raw1_value;
			append(section3, t92);
			append(section3, p15);
			append(p15, t93);
			append(p15, code3);
			append(code3, t94);
			append(p15, t95);
			append(p15, code4);
			append(code4, t96);
			append(p15, t97);
			append(p15, code5);
			append(code5, t98);
			append(p15, t99);
			append(p15, code6);
			append(code6, t100);
			append(p15, t101);
			append(section3, t102);
			append(section3, pre2);
			pre2.innerHTML = raw2_value;
			append(section3, t103);
			append(section3, p16);
			append(p16, em5);
			append(em5, t104);
			append(section3, t105);
			append(section3, p17);
			append(p17, t106);
			append(section3, t107);
			append(section3, pre3);
			pre3.innerHTML = raw3_value;
			insert(target, t108, anchor);
			insert(target, section4, anchor);
			append(section4, h23);
			append(h23, a26);
			append(a26, t109);
			append(section4, t110);
			append(section4, p18);
			append(p18, t111);
			append(section4, t112);
			append(section4, p19);
			append(p19, t113);
			append(section4, t114);
			append(section4, p20);
			append(p20, t115);
			append(p20, a27);
			append(a27, t116);
			append(p20, t117);
			append(p20, a28);
			append(a28, t118);
			append(p20, t119);
			append(p20, a29);
			append(a29, t120);
			append(p20, t121);
			append(section4, t122);
			append(section4, p21);
			append(p21, t123);
			append(section4, t124);
			append(section4, p22);
			append(p22, t125);
			append(p22, a30);
			append(a30, t126);
			append(p22, t127);
			append(p22, a31);
			append(a31, t128);
			append(p22, t129);
			append(section4, t130);
			append(section4, p23);
			append(p23, t131);
			append(section4, t132);
			append(section4, ul5);
			append(ul5, li17);
			append(li17, t133);
			append(ul5, t134);
			append(ul5, li18);
			append(li18, t135);
			append(ul5, t136);
			append(ul5, li19);
			append(li19, t137);
			append(li19, a32);
			append(a32, t138);
			append(li19, t139);
			append(section4, t140);
			append(section4, p24);
			append(p24, img1);
			insert(target, t141, anchor);
			insert(target, section5, anchor);
			append(section5, h30);
			append(h30, a33);
			append(a33, t142);
			append(section5, t143);
			append(section5, p25);
			append(p25, t144);
			append(section5, t145);
			append(section5, p26);
			append(p26, t146);
			append(section5, t147);
			append(section5, p27);
			append(p27, t148);
			append(p27, code7);
			append(code7, t149);
			append(p27, t150);
			append(section5, t151);
			append(section5, pre4);
			pre4.innerHTML = raw4_value;
			append(section5, t152);
			append(section5, pre5);
			pre5.innerHTML = raw5_value;
			append(section5, t153);
			append(section5, p28);
			append(p28, t154);
			append(section5, t155);
			append(section5, pre6);
			pre6.innerHTML = raw6_value;
			append(section5, t156);
			append(section5, pre7);
			pre7.innerHTML = raw7_value;
			append(section5, t157);
			append(section5, p29);
			append(p29, t158);
			append(section5, t159);
			append(section5, pre8);
			pre8.innerHTML = raw8_value;
			append(section5, t160);
			append(section5, pre9);
			pre9.innerHTML = raw9_value;
			append(section5, t161);
			append(section5, blockquote0);
			append(blockquote0, p30);
			append(p30, strong4);
			append(strong4, t162);
			append(p30, t163);
			append(p30, a34);
			append(a34, t164);
			append(p30, t165);
			append(section5, t166);
			append(section5, p31);
			append(p31, t167);
			append(section5, t168);
			append(section5, p32);
			append(p32, t169);
			append(section5, t170);
			append(section5, pre10);
			pre10.innerHTML = raw10_value;
			append(section5, t171);
			append(section5, pre11);
			pre11.innerHTML = raw11_value;
			append(section5, t172);
			append(section5, p33);
			append(p33, t173);
			append(section5, t174);
			append(section5, p34);
			append(p34, t175);
			append(p34, a35);
			append(a35, t176);
			append(p34, t177);
			append(section5, t178);
			append(section5, pre12);
			pre12.innerHTML = raw12_value;
			append(section5, t179);
			append(section5, pre13);
			pre13.innerHTML = raw13_value;
			append(section5, t180);
			append(section5, blockquote1);
			append(blockquote1, p35);
			append(p35, strong5);
			append(strong5, t181);
			append(p35, t182);
			append(p35, code8);
			append(code8, t183);
			append(p35, t184);
			append(p35, code9);
			append(code9, t185);
			append(p35, t186);
			insert(target, t187, anchor);
			insert(target, section6, anchor);
			append(section6, h4);
			append(h4, a36);
			append(a36, t188);
			append(section6, t189);
			append(section6, p36);
			append(p36, t190);
			append(p36, a37);
			append(a37, t191);
			append(p36, t192);
			append(p36, code10);
			append(code10, t193);
			append(p36, t194);
			append(section6, t195);
			append(section6, p37);
			append(p37, t196);
			append(section6, t197);
			append(section6, pre14);
			pre14.innerHTML = raw14_value;
			append(section6, t198);
			append(section6, pre15);
			pre15.innerHTML = raw15_value;
			append(section6, t199);
			append(section6, p38);
			append(p38, t200);
			append(p38, a38);
			append(a38, t201);
			append(p38, t202);
			append(section6, t203);
			append(section6, p39);
			append(p39, t204);
			append(section6, t205);
			append(section6, p40);
			append(p40, t206);
			insert(target, t207, anchor);
			insert(target, section7, anchor);
			append(section7, h24);
			append(h24, a39);
			append(a39, t208);
			append(section7, t209);
			append(section7, p41);
			append(p41, t210);
			append(p41, a40);
			append(a40, t211);
			append(p41, t212);
			append(p41, a41);
			append(a41, t213);
			append(p41, t214);
			append(p41, a42);
			append(a42, t215);
			append(p41, t216);
			append(p41, a43);
			append(a43, t217);
			append(p41, t218);
			append(p41, code11);
			append(code11, t219);
			append(p41, t220);
			append(p41, a44);
			append(a44, t221);
			append(p41, t222);
			append(section7, t223);
			append(section7, p42);
			append(p42, t224);
			append(section7, t225);
			append(section7, ul6);
			append(ul6, li20);
			append(li20, strong6);
			append(strong6, t226);
			append(li20, t227);
			append(ul6, t228);
			append(ul6, li21);
			append(li21, strong7);
			append(strong7, t229);
			append(li21, t230);
			append(ul6, t231);
			append(ul6, li22);
			append(li22, strong8);
			append(strong8, t232);
			append(li22, t233);
			append(ul6, t234);
			append(ul6, li23);
			append(li23, t235);
			append(section7, t236);
			append(section7, p43);
			append(p43, t237);
			append(section7, t238);
			append(section7, p44);
			append(p44, t239);
			insert(target, t240, anchor);
			insert(target, section8, anchor);
			append(section8, h31);
			append(h31, a45);
			append(a45, t241);
			append(section8, t242);
			append(section8, p45);
			append(p45, t243);
			append(p45, em6);
			append(em6, t244);
			append(p45, t245);
			append(p45, em7);
			append(em7, t246);
			append(p45, t247);
			append(section8, t248);
			append(section8, p46);
			append(p46, t249);
			append(section8, t250);
			append(section8, p47);
			append(p47, t251);
			append(section8, t252);
			append(section8, p48);
			append(p48, t253);
			append(section8, t254);
			append(section8, p49);
			append(p49, img2);
			append(section8, t255);
			append(section8, p50);
			append(p50, t256);
			append(section8, t257);
			append(section8, p51);
			append(p51, t258);
			append(section8, t259);
			append(section8, p52);
			append(p52, a46);
			append(a46, t260);
			insert(target, t261, anchor);
			insert(target, section9, anchor);
			append(section9, h32);
			append(h32, a47);
			append(a47, t262);
			append(section9, t263);
			append(section9, p53);
			append(p53, t264);
			append(p53, a48);
			append(a48, t265);
			append(p53, t266);
			append(section9, t267);
			append(section9, p54);
			append(p54, t268);
			append(p54, a49);
			append(a49, t269);
			append(p54, t270);
			append(section9, t271);
			append(section9, p55);
			append(p55, t272);
			append(p55, a50);
			append(a50, t273);
			append(p55, t274);
			append(p55, a51);
			append(a51, t275);
			append(p55, t276);
			append(section9, t277);
			append(section9, p56);
			append(p56, t278);
			append(p56, a52);
			append(a52, t279);
			append(p56, t280);
			append(p56, a53);
			append(a53, t281);
			append(p56, t282);
			append(p56, a54);
			append(a54, t283);
			append(p56, t284);
			append(section9, t285);
			append(section9, p57);
			append(p57, t286);
			append(section9, t287);
			append(section9, p58);
			append(p58, img3);
			append(section9, t288);
			append(section9, p59);
			append(p59, a55);
			append(a55, t289);
			insert(target, t290, anchor);
			insert(target, section10, anchor);
			append(section10, h33);
			append(h33, a56);
			append(a56, t291);
			append(section10, t292);
			append(section10, p60);
			append(p60, t293);
			append(section10, t294);
			append(section10, p61);
			append(p61, t295);
			append(section10, t296);
			append(section10, p62);
			append(p62, t297);
			append(section10, t298);
			append(section10, p63);
			append(p63, t299);
			append(p63, a57);
			append(a57, t300);
			append(p63, t301);
			append(section10, t302);
			append(section10, pre16);
			pre16.innerHTML = raw16_value;
			append(section10, t303);
			append(section10, p64);
			append(p64, img4);
			append(section10, t304);
			append(section10, p65);
			append(p65, a58);
			append(a58, t305);
			insert(target, t306, anchor);
			insert(target, section11, anchor);
			append(section11, h25);
			append(h25, a59);
			append(a59, t307);
			append(section11, t308);
			append(section11, p66);
			append(p66, t309);
			append(section11, t310);
			append(section11, p67);
			append(p67, t311);
			insert(target, t312, anchor);
			insert(target, section12, anchor);
			append(section12, h26);
			append(h26, a60);
			append(a60, t313);
			append(section12, t314);
			append(section12, ul7);
			append(ul7, li24);
			append(li24, a61);
			append(a61, t315);
			append(li24, t316);
			append(ul7, t317);
			append(ul7, li25);
			append(li25, a62);
			append(a62, t318);
			append(li25, t319);
			append(ul7, t320);
			append(ul7, li26);
			append(li26, a63);
			append(a63, t321);
			append(li26, t322);
			append(ul7, t323);
			append(ul7, li27);
			append(li27, a64);
			append(a64, t324);
			append(li27, t325);
			append(ul7, t326);
			append(ul7, li28);
			append(li28, a65);
			append(a65, t327);
			append(li28, t328);
			append(ul7, t329);
			append(ul7, li29);
			append(li29, a66);
			append(a66, t330);
			append(li29, t331);
			append(ul7, t332);
			append(ul7, li30);
			append(li30, a67);
			append(a67, t333);
			append(li30, t334);
			append(ul7, t335);
			append(ul7, li31);
			append(li31, a68);
			append(a68, t336);
			append(li31, t337);
			append(ul7, t338);
			append(ul7, li32);
			append(li32, strong9);
			append(strong9, t339);
			append(li32, t340);
			append(li32, a69);
			append(a69, t341);
			append(li32, t342);
			append(li32, strong10);
			append(strong10, t343);
			append(li32, t344);
		},
		p: noop,
		d(detaching) {
			if (detaching) detach(section0);
			if (detaching) detach(t12);
			if (detaching) detach(p0);
			if (detaching) detach(t14);
			if (detaching) detach(p1);
			if (detaching) detach(t16);
			if (detaching) detach(section1);
			if (detaching) detach(t28);
			if (detaching) detach(section2);
			if (detaching) detach(t79);
			if (detaching) detach(section3);
			if (detaching) detach(t108);
			if (detaching) detach(section4);
			if (detaching) detach(t141);
			if (detaching) detach(section5);
			if (detaching) detach(t187);
			if (detaching) detach(section6);
			if (detaching) detach(t207);
			if (detaching) detach(section7);
			if (detaching) detach(t240);
			if (detaching) detach(section8);
			if (detaching) detach(t261);
			if (detaching) detach(section9);
			if (detaching) detach(t290);
			if (detaching) detach(section10);
			if (detaching) detach(t306);
			if (detaching) detach(section11);
			if (detaching) detach(t312);
			if (detaching) detach(section12);
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
	"title": "Personalised Development Workspace With Chrome Extension",
	"venue": "Google Singapore",
	"venueLink": "https://www.google.com/maps/place/Google+Singapore/@1.2763254,103.7972592,17z/data=!3m1!4b1!4m5!3m4!1s0x31da1911f12998e9:0x43e454b88753032a!8m2!3d1.2763254!4d103.7994479",
	"occasion": "Chrome Developer Summit Extended (Cancelled)",
	"occasionLink": "https://www.meetup.com/en-AU/gdg-singapore/events/267717354/",
	"video": "",
	"date": "2020-02-08",
	"description": "In this talk, I will be exploring how you can develop your Chrome extension, and how you can use it to improve your development workflow",
	"slug": "personalised-development-workspace-with-chrome-extension",
	"type": "talk"
};

class Page_markup extends SvelteComponent {
	constructor(options) {
		super();
		init(this, options, null, create_fragment$3, safe_not_equal, {});
	}
}

const app = new Page_markup({
  target: document.querySelector('#app'),
  hydrate: true,
});
