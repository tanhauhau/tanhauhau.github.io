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

var __build_img__2 = "aa140e7ffe777036.png";

var __build_img__1 = "1b4b7b8861eb17f0.png";

var __build_img__0 = "bacd2ed2088b43ce.png";

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
			a6 = claim_element(li6_nodes, "A", { href: true, class: true });
			var a6_nodes = children(a6);
			svg0 = claim_element(a6_nodes, "svg", { viewBox: true, class: true }, 1);
			var svg0_nodes = children(svg0);
			path0 = claim_element(svg0_nodes, "path", { d: true }, 1);
			children(path0).forEach(detach);
			svg0_nodes.forEach(detach);
			a6_nodes.forEach(detach);
			t12 = claim_space(li6_nodes);
			a7 = claim_element(li6_nodes, "A", { href: true, class: true });
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
			attr(a6, "href", "https://twitter.com/lihautan");
			attr(a6, "class", "svelte-f3e4uo");
			attr(path1, "d", "M9 19c-5 1.5-5-2.5-7-3m14 6v-3.87a3.37 3.37 0 0\n    0-.94-2.61c3.14-.35 6.44-1.54 6.44-7A5.44 5.44 0 0 0 20 4.77 5.07\n    5.07 0 0 0 19.91 1S18.73.65 16 2.48a13.38 13.38 0 0 0-7 0C6.27.65\n    5.09 1 5.09 1A5.07 5.07 0 0 0 5 4.77a5.44 5.44 0 0 0-1.5 3.78c0 5.42\n    3.3 6.61 6.44 7A3.37 3.37 0 0 0 9 18.13V22");
			attr(svg1, "viewBox", "0 0 24 24");
			attr(svg1, "class", "svelte-f3e4uo");
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

var image = "https://lihautan.com/step-by-step-guide-for-writing-a-babel-transformation/assets/hero-twitter-7e567f5d.jpg";

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
					"@id": "https%3A%2F%2Flihautan.com%2Fstep-by-step-guide-for-writing-a-babel-transformation",
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
			attr(meta11, "content", "https%3A%2F%2Flihautan.com%2Fstep-by-step-guide-for-writing-a-babel-transformation");
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
							"@id": "https%3A%2F%2Flihautan.com%2Fstep-by-step-guide-for-writing-a-babel-transformation",
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

/* content/blog/step-by-step-guide-for-writing-a-babel-transformation/@@page-markup.svelte generated by Svelte v3.24.0 */

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
	let ul2;
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
	let ul1;
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
	let a12;
	let t14;
	let t15;
	let t16;
	let section1;
	let h20;
	let a13;
	let t17;
	let t18;
	let p1;
	let a14;
	let t19;
	let t20;
	let a15;
	let t21;
	let t22;
	let t23;
	let p2;
	let t24;
	let a16;
	let t25;
	let t26;
	let t27;
	let section2;
	let h30;
	let a17;
	let t28;
	let t29;
	let p3;
	let t30;
	let t31;
	let ul4;
	let li12;
	let a18;
	let t32;
	let t33;
	let a19;
	let t34;
	let t35;
	let em0;
	let t36;
	let t37;
	let li13;
	let t38;
	let a20;
	let t39;
	let t40;
	let li14;
	let a21;
	let t41;
	let t42;
	let a22;
	let t43;
	let t44;
	let p4;
	let t45;
	let a23;
	let t46;
	let t47;
	let t48;
	let p5;
	let t49;
	let a24;
	let t50;
	let t51;
	let t52;
	let p6;
	let t53;
	let t54;
	let section3;
	let h21;
	let a25;
	let t55;
	let t56;
	let p7;
	let t57;
	let t58;
	let pre0;

	let raw0_value = `
<code class="language-js"><span class="token keyword module">import</span> <span class="token punctuation">&#123;</span> parse <span class="token punctuation">&#125;</span> <span class="token keyword module">from</span> <span class="token string">'@babel/parser'</span><span class="token punctuation">;</span>
<span class="token keyword module">import</span> traverse <span class="token keyword module">from</span> <span class="token string">'@babel/traverse'</span><span class="token punctuation">;</span>
<span class="token keyword module">import</span> generate <span class="token keyword module">from</span> <span class="token string">'@babel/generator'</span><span class="token punctuation">;</span>

<span class="token keyword">const</span> code <span class="token operator">=</span> <span class="token string">'const n = 1'</span><span class="token punctuation">;</span>

<span class="token comment">// parse the code -> ast</span>
<span class="token keyword">const</span> ast <span class="token operator">=</span> <span class="token function">parse</span><span class="token punctuation">(</span>code<span class="token punctuation">)</span><span class="token punctuation">;</span>

<span class="token comment">// transform the ast</span>
<span class="token function">traverse</span><span class="token punctuation">(</span>ast<span class="token punctuation">,</span> <span class="token punctuation">&#123;</span>
  <span class="token function">enter</span><span class="token punctuation">(</span><span class="token parameter">path</span><span class="token punctuation">)</span> <span class="token punctuation">&#123;</span>
    <span class="token comment">// in this example change all the variable &#96;n&#96; to &#96;x&#96;</span>
    <span class="token keyword">if</span> <span class="token punctuation">(</span>path<span class="token punctuation">.</span><span class="token method function property-access">isIdentifier</span><span class="token punctuation">(</span><span class="token punctuation">&#123;</span> name<span class="token punctuation">:</span> <span class="token string">'n'</span> <span class="token punctuation">&#125;</span><span class="token punctuation">)</span><span class="token punctuation">)</span> <span class="token punctuation">&#123;</span>
      path<span class="token punctuation">.</span><span class="token property-access">node</span><span class="token punctuation">.</span><span class="token property-access">name</span> <span class="token operator">=</span> <span class="token string">'x'</span><span class="token punctuation">;</span>
    <span class="token punctuation">&#125;</span>
  <span class="token punctuation">&#125;</span><span class="token punctuation">,</span>
<span class="token punctuation">&#125;</span><span class="token punctuation">)</span><span class="token punctuation">;</span>

<span class="token comment">// generate code &lt;- ast</span>
<span class="token keyword">const</span> output <span class="token operator">=</span> <span class="token function">generate</span><span class="token punctuation">(</span>ast<span class="token punctuation">,</span> code<span class="token punctuation">)</span><span class="token punctuation">;</span>
<span class="token console class-name">console</span><span class="token punctuation">.</span><span class="token method function property-access">log</span><span class="token punctuation">(</span>output<span class="token punctuation">.</span><span class="token property-access">code</span><span class="token punctuation">)</span><span class="token punctuation">;</span> <span class="token comment">// 'const x = 1;'</span></code>` + "";

	let t59;
	let blockquote0;
	let p8;
	let t60;
	let a26;
	let t61;
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
	let code3;
	let t69;
	let t70;
	let code4;
	let t71;
	let t72;
	let t73;
	let p9;
	let t74;
	let t75;
	let pre1;

	let raw1_value = `
<code class="language-">code -&gt; AST -&gt; transformed AST -&gt; transformed code</code>` + "";

	let t76;
	let p10;
	let t77;
	let code5;
	let t78;
	let t79;
	let t80;
	let pre2;

	let raw2_value = `
<code class="language-js"><span class="token keyword module">import</span> babel <span class="token keyword module">from</span> <span class="token string">'@babel/core'</span><span class="token punctuation">;</span>

<span class="token keyword">const</span> code <span class="token operator">=</span> <span class="token string">'const n = 1'</span><span class="token punctuation">;</span>

<span class="token keyword">const</span> output <span class="token operator">=</span> babel<span class="token punctuation">.</span><span class="token method function property-access">transformSync</span><span class="token punctuation">(</span>code<span class="token punctuation">,</span> <span class="token punctuation">&#123;</span>
  plugins<span class="token punctuation">:</span> <span class="token punctuation">[</span>
    <span class="token comment">// your first babel plugin 😎😎</span>
    <span class="token keyword">function</span> <span class="token function">myCustomPlugin</span><span class="token punctuation">(</span><span class="token punctuation">)</span> <span class="token punctuation">&#123;</span>
      <span class="token keyword">return</span> <span class="token punctuation">&#123;</span>
        visitor<span class="token punctuation">:</span> <span class="token punctuation">&#123;</span>
          <span class="token function"><span class="token maybe-class-name">Identifier</span></span><span class="token punctuation">(</span><span class="token parameter">path</span><span class="token punctuation">)</span> <span class="token punctuation">&#123;</span>
            <span class="token comment">// in this example change all the variable &#96;n&#96; to &#96;x&#96;</span>
            <span class="token keyword">if</span> <span class="token punctuation">(</span>path<span class="token punctuation">.</span><span class="token method function property-access">isIdentifier</span><span class="token punctuation">(</span><span class="token punctuation">&#123;</span> name<span class="token punctuation">:</span> <span class="token string">'n'</span> <span class="token punctuation">&#125;</span><span class="token punctuation">)</span><span class="token punctuation">)</span> <span class="token punctuation">&#123;</span>
              path<span class="token punctuation">.</span><span class="token property-access">node</span><span class="token punctuation">.</span><span class="token property-access">name</span> <span class="token operator">=</span> <span class="token string">'x'</span><span class="token punctuation">;</span>
            <span class="token punctuation">&#125;</span>
          <span class="token punctuation">&#125;</span><span class="token punctuation">,</span>
        <span class="token punctuation">&#125;</span><span class="token punctuation">,</span>
      <span class="token punctuation">&#125;</span><span class="token punctuation">;</span>
    <span class="token punctuation">&#125;</span><span class="token punctuation">,</span>
  <span class="token punctuation">]</span><span class="token punctuation">,</span>
<span class="token punctuation">&#125;</span><span class="token punctuation">)</span><span class="token punctuation">;</span>

<span class="token console class-name">console</span><span class="token punctuation">.</span><span class="token method function property-access">log</span><span class="token punctuation">(</span>output<span class="token punctuation">.</span><span class="token property-access">code</span><span class="token punctuation">)</span><span class="token punctuation">;</span> <span class="token comment">// 'const x = 1;'</span></code>` + "";

	let t81;
	let p11;
	let t82;
	let a27;
	let t83;
	let t84;
	let code6;
	let t85;
	let t86;
	let code7;
	let t87;
	let t88;
	let t89;
	let blockquote1;
	let p12;
	let t90;
	let code8;
	let t91;
	let t92;
	let a28;
	let t93;
	let t94;
	let t95;
	let p13;
	let t96;
	let em1;
	let t97;
	let t98;
	let t99;
	let p14;
	let t100;
	let t101;
	let section4;
	let h31;
	let a29;
	let t102;
	let t103;
	let p15;
	let t104;
	let t105;
	let ul5;
	let li15;
	let t106;
	let t107;
	let li16;
	let t108;
	let t109;
	let pre3;

	let raw3_value = `
<code class="language-js"><span class="token keyword">function</span> <span class="token function">greet</span><span class="token punctuation">(</span><span class="token parameter">name</span><span class="token punctuation">)</span> <span class="token punctuation">&#123;</span>
  <span class="token keyword">return</span> <span class="token string">'Hello '</span> <span class="token operator">+</span> name<span class="token punctuation">;</span>
<span class="token punctuation">&#125;</span>

<span class="token console class-name">console</span><span class="token punctuation">.</span><span class="token method function property-access">log</span><span class="token punctuation">(</span><span class="token function">greet</span><span class="token punctuation">(</span><span class="token string">'tanhauhau'</span><span class="token punctuation">)</span><span class="token punctuation">)</span><span class="token punctuation">;</span> <span class="token comment">// Hello tanhauhau</span></code>` + "";

	let t110;
	let p16;
	let t111;
	let t112;
	let pre4;

	let raw4_value = `
<code class="language-js"><span class="token keyword">function</span> <span class="token function">teerg</span><span class="token punctuation">(</span><span class="token parameter">eman</span><span class="token punctuation">)</span> <span class="token punctuation">&#123;</span>
  <span class="token keyword">return</span> <span class="token string">'H'</span> <span class="token operator">+</span> <span class="token string">'e'</span> <span class="token operator">+</span> <span class="token string">'l'</span> <span class="token operator">+</span> <span class="token string">'l'</span> <span class="token operator">+</span> <span class="token string">'o'</span> <span class="token operator">+</span> <span class="token string">' '</span> <span class="token operator">+</span> eman<span class="token punctuation">;</span>
<span class="token punctuation">&#125;</span>

<span class="token console class-name">console</span><span class="token punctuation">.</span><span class="token method function property-access">log</span><span class="token punctuation">(</span><span class="token function">teerg</span><span class="token punctuation">(</span><span class="token string">'t'</span> <span class="token operator">+</span> <span class="token string">'a'</span> <span class="token operator">+</span> <span class="token string">'n'</span> <span class="token operator">+</span> <span class="token string">'h'</span> <span class="token operator">+</span> <span class="token string">'a'</span> <span class="token operator">+</span> <span class="token string">'u'</span> <span class="token operator">+</span> <span class="token string">'h'</span> <span class="token operator">+</span> <span class="token string">'a'</span> <span class="token operator">+</span> <span class="token string">'u'</span><span class="token punctuation">)</span><span class="token punctuation">)</span><span class="token punctuation">;</span> <span class="token comment">// Hello tanhauhau</span></code>` + "";

	let t113;
	let p17;
	let t114;
	let code9;
	let t115;
	let t116;
	let em2;
	let t117;
	let t118;
	let section5;
	let h32;
	let a30;
	let t119;
	let t120;
	let p18;
	let t121;
	let a31;
	let t122;
	let t123;
	let t124;
	let p19;
	let img0;
	let img0_src_value;
	let t125;
	let p20;
	let t126;
	let t127;
	let p21;
	let t128;
	let t129;
	let ul6;
	let li17;
	let strong0;
	let t130;
	let t131;
	let t132;
	let li18;
	let strong1;
	let t133;
	let t134;
	let t135;
	let section6;
	let h33;
	let a32;
	let t136;
	let t137;
	let p22;
	let t138;
	let a33;
	let t139;
	let t140;
	let t141;
	let p23;
	let img1;
	let img1_src_value;
	let t142;
	let p24;
	let t143;
	let t144;
	let p25;
	let t145;
	let code10;
	let t146;
	let t147;
	let code11;
	let t148;
	let t149;
	let code12;
	let t150;
	let t151;
	let t152;
	let section7;
	let h34;
	let a34;
	let t153;
	let t154;
	let p26;
	let t155;
	let t156;
	let pre5;

	let raw5_value = `
<code class="language-js"><span class="token keyword">function</span> <span class="token function">myCustomPlugin</span><span class="token punctuation">(</span><span class="token punctuation">)</span> <span class="token punctuation">&#123;</span>
  <span class="token keyword">return</span> <span class="token punctuation">&#123;</span>
    <span class="token comment">// highlight-start</span>
    visitor<span class="token punctuation">:</span> <span class="token punctuation">&#123;</span>
      <span class="token function"><span class="token maybe-class-name">Identifier</span></span><span class="token punctuation">(</span><span class="token parameter">path</span><span class="token punctuation">)</span> <span class="token punctuation">&#123;</span>
        <span class="token comment">// ...</span>
      <span class="token punctuation">&#125;</span><span class="token punctuation">,</span>
    <span class="token punctuation">&#125;</span><span class="token punctuation">,</span>
    <span class="token comment">// highlight-end</span>
  <span class="token punctuation">&#125;</span><span class="token punctuation">;</span>
<span class="token punctuation">&#125;</span></code>` + "";

	let t157;
	let p27;
	let t158;
	let a35;
	let t159;
	let t160;
	let t161;
	let p28;
	let t162;
	let a36;
	let t163;
	let t164;
	let t165;
	let p29;
	let t166;
	let code13;
	let t167;
	let t168;
	let t169;
	let pre6;

	let raw6_value = `
<code class="language-js"><span class="token keyword">function</span> <span class="token function">myCustomPlugin</span><span class="token punctuation">(</span><span class="token punctuation">)</span> <span class="token punctuation">&#123;</span>
  <span class="token keyword">return</span> <span class="token punctuation">&#123;</span>
    visitor<span class="token punctuation">:</span> <span class="token punctuation">&#123;</span>
      <span class="token function"><span class="token maybe-class-name">Identifier</span></span><span class="token punctuation">(</span><span class="token parameter">path</span><span class="token punctuation">)</span> <span class="token punctuation">&#123;</span>
        <span class="token console class-name">console</span><span class="token punctuation">.</span><span class="token method function property-access">log</span><span class="token punctuation">(</span><span class="token string">'identifier'</span><span class="token punctuation">)</span><span class="token punctuation">;</span>
      <span class="token punctuation">&#125;</span><span class="token punctuation">,</span>
      <span class="token function"><span class="token maybe-class-name">StringLiteral</span></span><span class="token punctuation">(</span><span class="token parameter">path</span><span class="token punctuation">)</span> <span class="token punctuation">&#123;</span>
        <span class="token console class-name">console</span><span class="token punctuation">.</span><span class="token method function property-access">log</span><span class="token punctuation">(</span><span class="token string">'string literal'</span><span class="token punctuation">)</span><span class="token punctuation">;</span>
      <span class="token punctuation">&#125;</span><span class="token punctuation">,</span>
    <span class="token punctuation">&#125;</span><span class="token punctuation">,</span>
  <span class="token punctuation">&#125;</span><span class="token punctuation">;</span>
<span class="token punctuation">&#125;</span></code>` + "";

	let t170;
	let p30;
	let t171;
	let t172;
	let pre7;

	let raw7_value = `
<code class="language-">identifier
identifier
string literal
identifier
identifier
identifier
identifier
string literal</code>` + "";

	let t173;
	let hr0;
	let t174;
	let p31;
	let t175;
	let code14;
	let t176;
	let t177;
	let code15;
	let t178;
	let t179;
	let code16;
	let t180;
	let t181;
	let code17;
	let t182;
	let t183;
	let code18;
	let t184;
	let t185;
	let t186;
	let p32;
	let t187;
	let code19;
	let t188;
	let t189;
	let code20;
	let t190;
	let t191;
	let code21;
	let t192;
	let t193;
	let code22;
	let t194;
	let t195;
	let code23;
	let t196;
	let t197;
	let code24;
	let t198;
	let t199;
	let code25;
	let t200;
	let t201;
	let code26;
	let t202;
	let t203;
	let code27;
	let t204;
	let t205;
	let t206;
	let blockquote2;
	let p33;
	let t207;
	let code28;
	let t208;
	let t209;
	let a37;
	let t210;
	let t211;
	let a38;
	let t212;
	let t213;
	let hr1;
	let t214;
	let p34;
	let t215;
	let t216;
	let section8;
	let h40;
	let a39;
	let t217;
	let t218;
	let p35;
	let t219;
	let a40;
	let t220;
	let t221;
	let code29;
	let t222;
	let t223;
	let code30;
	let t224;
	let t225;
	let code31;
	let t226;
	let t227;
	let t228;
	let pre8;

	let raw8_value = `
<code class="language-js"><span class="token function"><span class="token maybe-class-name">Identifier</span></span><span class="token punctuation">(</span><span class="token parameter">path</span><span class="token punctuation">)</span> <span class="token punctuation">&#123;</span>
  path<span class="token punctuation">.</span><span class="token property-access">node</span><span class="token punctuation">.</span><span class="token property-access">name</span> <span class="token operator">=</span> path<span class="token punctuation">.</span><span class="token property-access">node</span><span class="token punctuation">.</span><span class="token property-access">name</span>
    <span class="token punctuation">.</span><span class="token method function property-access">split</span><span class="token punctuation">(</span><span class="token string">''</span><span class="token punctuation">)</span>
    <span class="token punctuation">.</span><span class="token method function property-access">reverse</span><span class="token punctuation">(</span><span class="token punctuation">)</span>
    <span class="token punctuation">.</span><span class="token method function property-access">join</span><span class="token punctuation">(</span><span class="token string">''</span><span class="token punctuation">)</span><span class="token punctuation">;</span>
<span class="token punctuation">&#125;</span></code>` + "";

	let t229;
	let p36;
	let t230;
	let t231;
	let pre9;

	let raw9_value = `
<code class="language-js"><span class="token keyword">function</span> <span class="token function">teerg</span><span class="token punctuation">(</span><span class="token parameter">eman</span><span class="token punctuation">)</span> <span class="token punctuation">&#123;</span>
  <span class="token keyword">return</span> <span class="token string">'Hello '</span> <span class="token operator">+</span> eman<span class="token punctuation">;</span>
<span class="token punctuation">&#125;</span>

elosnoc<span class="token punctuation">.</span><span class="token method function property-access">gol</span><span class="token punctuation">(</span><span class="token function">teerg</span><span class="token punctuation">(</span><span class="token string">'tanhauhau'</span><span class="token punctuation">)</span><span class="token punctuation">)</span><span class="token punctuation">;</span> <span class="token comment">// Hello tanhauhau</span></code>` + "";

	let t232;
	let p37;
	let t233;
	let code32;
	let t234;
	let t235;
	let t236;
	let p38;
	let t237;
	let t238;
	let p39;
	let img2;
	let img2_src_value;
	let t239;
	let p40;
	let code33;
	let t240;
	let t241;
	let code34;
	let t242;
	let t243;
	let code35;
	let t244;
	let t245;
	let code36;
	let t246;
	let t247;
	let code37;
	let t248;
	let t249;
	let code38;
	let t250;
	let t251;
	let t252;
	let p41;
	let t253;
	let code39;
	let t254;
	let t255;
	let code40;
	let t256;
	let t257;
	let t258;
	let pre10;

	let raw10_value = `
<code class="language-js"><span class="token function"><span class="token maybe-class-name">Identifier</span></span><span class="token punctuation">(</span><span class="token parameter">path</span><span class="token punctuation">)</span> <span class="token punctuation">&#123;</span>
  <span class="token keyword">if</span> <span class="token punctuation">(</span>
    <span class="token operator">!</span><span class="token punctuation">(</span>
      path<span class="token punctuation">.</span><span class="token property-access">parentPath</span><span class="token punctuation">.</span><span class="token method function property-access">isMemberExpression</span><span class="token punctuation">(</span><span class="token punctuation">)</span> <span class="token operator">&amp;&amp;</span>
      path<span class="token punctuation">.</span><span class="token property-access">parentPath</span>
        <span class="token punctuation">.</span><span class="token method function property-access">get</span><span class="token punctuation">(</span><span class="token string">'object'</span><span class="token punctuation">)</span>
        <span class="token punctuation">.</span><span class="token method function property-access">isIdentifier</span><span class="token punctuation">(</span><span class="token punctuation">&#123;</span> name<span class="token punctuation">:</span> <span class="token string">'console'</span> <span class="token punctuation">&#125;</span><span class="token punctuation">)</span> <span class="token operator">&amp;&amp;</span>
      path<span class="token punctuation">.</span><span class="token property-access">parentPath</span><span class="token punctuation">.</span><span class="token method function property-access">get</span><span class="token punctuation">(</span><span class="token string">'property'</span><span class="token punctuation">)</span><span class="token punctuation">.</span><span class="token method function property-access">isIdentifier</span><span class="token punctuation">(</span><span class="token punctuation">&#123;</span> name<span class="token punctuation">:</span> <span class="token string">'log'</span> <span class="token punctuation">&#125;</span><span class="token punctuation">)</span>
    <span class="token punctuation">)</span>
  <span class="token punctuation">)</span> <span class="token punctuation">&#123;</span>
   path<span class="token punctuation">.</span><span class="token property-access">node</span><span class="token punctuation">.</span><span class="token property-access">name</span> <span class="token operator">=</span> path<span class="token punctuation">.</span><span class="token property-access">node</span><span class="token punctuation">.</span><span class="token property-access">name</span>
     <span class="token punctuation">.</span><span class="token method function property-access">split</span><span class="token punctuation">(</span><span class="token string">''</span><span class="token punctuation">)</span>
     <span class="token punctuation">.</span><span class="token method function property-access">reverse</span><span class="token punctuation">(</span><span class="token punctuation">)</span>
     <span class="token punctuation">.</span><span class="token method function property-access">join</span><span class="token punctuation">(</span><span class="token string">''</span><span class="token punctuation">)</span><span class="token punctuation">;</span>
 <span class="token punctuation">&#125;</span>
<span class="token punctuation">&#125;</span></code>` + "";

	let t259;
	let p42;
	let t260;
	let t261;
	let pre11;

	let raw11_value = `
<code class="language-js"><span class="token keyword">function</span> <span class="token function">teerg</span><span class="token punctuation">(</span><span class="token parameter">eman</span><span class="token punctuation">)</span> <span class="token punctuation">&#123;</span>
  <span class="token keyword">return</span> <span class="token string">'Hello '</span> <span class="token operator">+</span> eman<span class="token punctuation">;</span>
<span class="token punctuation">&#125;</span>

<span class="token console class-name">console</span><span class="token punctuation">.</span><span class="token method function property-access">log</span><span class="token punctuation">(</span><span class="token function">teerg</span><span class="token punctuation">(</span><span class="token string">'tanhauhau'</span><span class="token punctuation">)</span><span class="token punctuation">)</span><span class="token punctuation">;</span> <span class="token comment">// Hello tanhauhau</span></code>` + "";

	let t262;
	let p43;
	let t263;
	let code41;
	let t264;
	let t265;
	let code42;
	let t266;
	let t267;
	let code43;
	let t268;
	let t269;
	let code44;
	let t270;
	let t271;
	let t272;
	let p44;
	let t273;
	let code45;
	let t274;
	let t275;
	let code46;
	let t276;
	let t277;
	let t278;
	let pre12;

	let raw12_value = `
<code class="language-js"><span class="token keyword">const</span> log <span class="token operator">=</span> <span class="token number">1</span><span class="token punctuation">;</span></code>` + "";

	let t279;
	let blockquote3;
	let p45;
	let t280;
	let code47;
	let t281;
	let t282;
	let code48;
	let t283;
	let t284;
	let a41;
	let t285;
	let t286;
	let code49;
	let t287;
	let t288;
	let code50;
	let t289;
	let t290;
	let code51;
	let t291;
	let t292;
	let a42;
	let t293;
	let t294;
	let t295;
	let section9;
	let h41;
	let a43;
	let t296;
	let t297;
	let p46;
	let t298;
	let code52;
	let t299;
	let t300;
	let code53;
	let t301;
	let t302;
	let t303;
	let p47;
	let t304;
	let a44;
	let code54;
	let t305;
	let t306;
	let code55;
	let t307;
	let t308;
	let code56;
	let t309;
	let t310;
	let code57;
	let t311;
	let t312;
	let t313;
	let pre13;

	let raw13_value = `
<code class="language-js"><span class="token function"><span class="token maybe-class-name">StringLiteral</span></span><span class="token punctuation">(</span><span class="token parameter">path</span><span class="token punctuation">)</span> <span class="token punctuation">&#123;</span>
  <span class="token keyword">const</span> newNode <span class="token operator">=</span> path<span class="token punctuation">.</span><span class="token property-access">node</span><span class="token punctuation">.</span><span class="token property-access">value</span>
    <span class="token punctuation">.</span><span class="token method function property-access">split</span><span class="token punctuation">(</span><span class="token string">''</span><span class="token punctuation">)</span>
    <span class="token punctuation">.</span><span class="token method function property-access">map</span><span class="token punctuation">(</span><span class="token parameter">c</span> <span class="token arrow operator">=></span> babel<span class="token punctuation">.</span><span class="token property-access">types</span><span class="token punctuation">.</span><span class="token method function property-access">stringLiteral</span><span class="token punctuation">(</span>c<span class="token punctuation">)</span><span class="token punctuation">)</span>
    <span class="token punctuation">.</span><span class="token method function property-access">reduce</span><span class="token punctuation">(</span><span class="token punctuation">(</span><span class="token parameter">prev<span class="token punctuation">,</span> curr</span><span class="token punctuation">)</span> <span class="token arrow operator">=></span> <span class="token punctuation">&#123;</span>
      <span class="token keyword">return</span> babel<span class="token punctuation">.</span><span class="token property-access">types</span><span class="token punctuation">.</span><span class="token method function property-access">binaryExpression</span><span class="token punctuation">(</span><span class="token string">'+'</span><span class="token punctuation">,</span> prev<span class="token punctuation">,</span> curr<span class="token punctuation">)</span><span class="token punctuation">;</span>
    <span class="token punctuation">&#125;</span><span class="token punctuation">)</span><span class="token punctuation">;</span>
  path<span class="token punctuation">.</span><span class="token method function property-access">replaceWith</span><span class="token punctuation">(</span>newNode<span class="token punctuation">)</span><span class="token punctuation">;</span>
<span class="token punctuation">&#125;</span></code>` + "";

	let t314;
	let p48;
	let t315;
	let code58;
	let t316;
	let t317;
	let code59;
	let t318;
	let t319;
	let code60;
	let t320;
	let t321;
	let code61;
	let t322;
	let t323;
	let code62;
	let t324;
	let t325;
	let t326;
	let p49;
	let t327;
	let t328;
	let pre14;

	let raw14_value = `
<code class="language-">RangeError: Maximum call stack size exceeded</code>` + "";

	let t329;
	let p50;
	let t330;
	let t331;
	let p51;
	let t332;
	let code63;
	let t333;
	let t334;
	let code64;
	let t335;
	let t336;
	let code65;
	let t337;
	let t338;
	let code66;
	let t339;
	let t340;
	let code67;
	let t341;
	let t342;
	let code68;
	let t343;
	let t344;
	let code69;
	let t345;
	let t346;
	let t347;
	let p52;
	let t348;
	let code70;
	let t349;
	let t350;
	let code71;
	let t351;
	let t352;
	let t353;
	let p53;
	let t354;
	let code72;
	let t355;
	let t356;
	let t357;
	let pre15;

	let raw15_value = `
<code class="language-js"><span class="token function"><span class="token maybe-class-name">StringLiteral</span></span><span class="token punctuation">(</span><span class="token parameter">path</span><span class="token punctuation">)</span> <span class="token punctuation">&#123;</span>
  <span class="token keyword">const</span> newNode <span class="token operator">=</span> path<span class="token punctuation">.</span><span class="token property-access">node</span><span class="token punctuation">.</span><span class="token property-access">value</span>
    <span class="token punctuation">.</span><span class="token method function property-access">split</span><span class="token punctuation">(</span><span class="token string">''</span><span class="token punctuation">)</span>
    <span class="token punctuation">.</span><span class="token method function property-access">map</span><span class="token punctuation">(</span><span class="token parameter">c</span> <span class="token arrow operator">=></span> babel<span class="token punctuation">.</span><span class="token property-access">types</span><span class="token punctuation">.</span><span class="token method function property-access">stringLiteral</span><span class="token punctuation">(</span>c<span class="token punctuation">)</span><span class="token punctuation">)</span>
    <span class="token punctuation">.</span><span class="token method function property-access">reduce</span><span class="token punctuation">(</span><span class="token punctuation">(</span><span class="token parameter">prev<span class="token punctuation">,</span> curr</span><span class="token punctuation">)</span> <span class="token arrow operator">=></span> <span class="token punctuation">&#123;</span>
      <span class="token keyword">return</span> babel<span class="token punctuation">.</span><span class="token property-access">types</span><span class="token punctuation">.</span><span class="token method function property-access">binaryExpression</span><span class="token punctuation">(</span><span class="token string">'+'</span><span class="token punctuation">,</span> prev<span class="token punctuation">,</span> curr<span class="token punctuation">)</span><span class="token punctuation">;</span>
    <span class="token punctuation">&#125;</span><span class="token punctuation">)</span><span class="token punctuation">;</span>
  path<span class="token punctuation">.</span><span class="token method function property-access">replaceWith</span><span class="token punctuation">(</span>newNode<span class="token punctuation">)</span><span class="token punctuation">;</span>
  <span class="token comment">// highlight-next-line</span>
  path<span class="token punctuation">.</span><span class="token method function property-access">skip</span><span class="token punctuation">(</span><span class="token punctuation">)</span><span class="token punctuation">;</span>
<span class="token punctuation">&#125;</span></code>` + "";

	let t358;
	let p54;
	let t359;
	let t360;
	let section10;
	let h22;
	let a45;
	let t361;
	let t362;
	let p55;
	let t363;
	let t364;
	let pre16;

	let raw16_value = `
<code class="language-js"><span class="token keyword">const</span> babel <span class="token operator">=</span> <span class="token function">require</span><span class="token punctuation">(</span><span class="token string">'@babel/core'</span><span class="token punctuation">)</span><span class="token punctuation">;</span>
<span class="token keyword">const</span> code <span class="token operator">=</span> <span class="token template-string"><span class="token template-punctuation string">&#96;</span><span class="token string">
function greet(name) &#123;
  return 'Hello ' + name;
&#125;
console.log(greet('tanhauhau')); // Hello tanhauhau
</span><span class="token template-punctuation string">&#96;</span></span><span class="token punctuation">;</span>
<span class="token keyword">const</span> output <span class="token operator">=</span> babel<span class="token punctuation">.</span><span class="token method function property-access">transformSync</span><span class="token punctuation">(</span>code<span class="token punctuation">,</span> <span class="token punctuation">&#123;</span>
  plugins<span class="token punctuation">:</span> <span class="token punctuation">[</span>
    <span class="token keyword">function</span> <span class="token function">myCustomPlugin</span><span class="token punctuation">(</span><span class="token punctuation">)</span> <span class="token punctuation">&#123;</span>
      <span class="token keyword">return</span> <span class="token punctuation">&#123;</span>
        visitor<span class="token punctuation">:</span> <span class="token punctuation">&#123;</span>
          <span class="token function"><span class="token maybe-class-name">StringLiteral</span></span><span class="token punctuation">(</span><span class="token parameter">path</span><span class="token punctuation">)</span> <span class="token punctuation">&#123;</span>
            <span class="token keyword">const</span> concat <span class="token operator">=</span> path<span class="token punctuation">.</span><span class="token property-access">node</span><span class="token punctuation">.</span><span class="token property-access">value</span>
              <span class="token punctuation">.</span><span class="token method function property-access">split</span><span class="token punctuation">(</span><span class="token string">''</span><span class="token punctuation">)</span>
              <span class="token punctuation">.</span><span class="token method function property-access">map</span><span class="token punctuation">(</span><span class="token parameter">c</span> <span class="token arrow operator">=></span> babel<span class="token punctuation">.</span><span class="token property-access">types</span><span class="token punctuation">.</span><span class="token method function property-access">stringLiteral</span><span class="token punctuation">(</span>c<span class="token punctuation">)</span><span class="token punctuation">)</span>
              <span class="token punctuation">.</span><span class="token method function property-access">reduce</span><span class="token punctuation">(</span><span class="token punctuation">(</span><span class="token parameter">prev<span class="token punctuation">,</span> curr</span><span class="token punctuation">)</span> <span class="token arrow operator">=></span> <span class="token punctuation">&#123;</span>
                <span class="token keyword">return</span> babel<span class="token punctuation">.</span><span class="token property-access">types</span><span class="token punctuation">.</span><span class="token method function property-access">binaryExpression</span><span class="token punctuation">(</span><span class="token string">'+'</span><span class="token punctuation">,</span> prev<span class="token punctuation">,</span> curr<span class="token punctuation">)</span><span class="token punctuation">;</span>
              <span class="token punctuation">&#125;</span><span class="token punctuation">)</span><span class="token punctuation">;</span>
            path<span class="token punctuation">.</span><span class="token method function property-access">replaceWith</span><span class="token punctuation">(</span>concat<span class="token punctuation">)</span><span class="token punctuation">;</span>
            path<span class="token punctuation">.</span><span class="token method function property-access">skip</span><span class="token punctuation">(</span><span class="token punctuation">)</span><span class="token punctuation">;</span>
          <span class="token punctuation">&#125;</span><span class="token punctuation">,</span>
          <span class="token function"><span class="token maybe-class-name">Identifier</span></span><span class="token punctuation">(</span><span class="token parameter">path</span><span class="token punctuation">)</span> <span class="token punctuation">&#123;</span>
            <span class="token keyword">if</span> <span class="token punctuation">(</span>
              <span class="token operator">!</span><span class="token punctuation">(</span>
                path<span class="token punctuation">.</span><span class="token property-access">parentPath</span><span class="token punctuation">.</span><span class="token method function property-access">isMemberExpression</span><span class="token punctuation">(</span><span class="token punctuation">)</span> <span class="token operator">&amp;&amp;</span>
                path<span class="token punctuation">.</span><span class="token property-access">parentPath</span>
                  <span class="token punctuation">.</span><span class="token method function property-access">get</span><span class="token punctuation">(</span><span class="token string">'object'</span><span class="token punctuation">)</span>
                  <span class="token punctuation">.</span><span class="token method function property-access">isIdentifier</span><span class="token punctuation">(</span><span class="token punctuation">&#123;</span> name<span class="token punctuation">:</span> <span class="token string">'console'</span> <span class="token punctuation">&#125;</span><span class="token punctuation">)</span> <span class="token operator">&amp;&amp;</span>
                path<span class="token punctuation">.</span><span class="token property-access">parentPath</span><span class="token punctuation">.</span><span class="token method function property-access">get</span><span class="token punctuation">(</span><span class="token string">'property'</span><span class="token punctuation">)</span><span class="token punctuation">.</span><span class="token method function property-access">isIdentifier</span><span class="token punctuation">(</span><span class="token punctuation">&#123;</span> name<span class="token punctuation">:</span> <span class="token string">'log'</span> <span class="token punctuation">&#125;</span><span class="token punctuation">)</span>
              <span class="token punctuation">)</span>
            <span class="token punctuation">)</span> <span class="token punctuation">&#123;</span>
              path<span class="token punctuation">.</span><span class="token property-access">node</span><span class="token punctuation">.</span><span class="token property-access">name</span> <span class="token operator">=</span> path<span class="token punctuation">.</span><span class="token property-access">node</span><span class="token punctuation">.</span><span class="token property-access">name</span>
                <span class="token punctuation">.</span><span class="token method function property-access">split</span><span class="token punctuation">(</span><span class="token string">''</span><span class="token punctuation">)</span>
                <span class="token punctuation">.</span><span class="token method function property-access">reverse</span><span class="token punctuation">(</span><span class="token punctuation">)</span>
                <span class="token punctuation">.</span><span class="token method function property-access">join</span><span class="token punctuation">(</span><span class="token string">''</span><span class="token punctuation">)</span><span class="token punctuation">;</span>
            <span class="token punctuation">&#125;</span>
          <span class="token punctuation">&#125;</span><span class="token punctuation">,</span>
        <span class="token punctuation">&#125;</span><span class="token punctuation">,</span>
      <span class="token punctuation">&#125;</span><span class="token punctuation">;</span>
    <span class="token punctuation">&#125;</span><span class="token punctuation">,</span>
  <span class="token punctuation">]</span><span class="token punctuation">,</span>
<span class="token punctuation">&#125;</span><span class="token punctuation">)</span><span class="token punctuation">;</span>
<span class="token console class-name">console</span><span class="token punctuation">.</span><span class="token method function property-access">log</span><span class="token punctuation">(</span>output<span class="token punctuation">.</span><span class="token property-access">code</span><span class="token punctuation">)</span><span class="token punctuation">;</span></code>` + "";

	let t365;
	let p56;
	let t366;
	let t367;
	let ol;
	let li19;
	let t368;
	let t369;
	let li20;
	let t370;
	let t371;
	let li21;
	let t372;
	let t373;
	let li22;
	let t374;
	let t375;
	let section11;
	let h23;
	let a46;
	let t376;
	let t377;
	let p57;
	let t378;
	let a47;
	let t379;
	let t380;
	let t381;
	let p58;
	let t382;
	let a48;
	let t383;
	let t384;
	let code73;
	let t385;
	let t386;
	let code74;
	let t387;
	let t388;
	let a49;
	let t389;
	let t390;
	let a50;
	let t391;
	let t392;
	let t393;
	let section12;
	let h24;
	let a51;
	let t394;
	let t395;
	let ul7;
	let li23;
	let a52;
	let t396;
	let t397;
	let a53;
	let t398;
	let t399;
	let li24;
	let a54;
	let t400;
	let t401;
	let a55;
	let t402;
	let t403;
	let li25;
	let a56;
	let t404;
	let t405;
	let a57;
	let t406;

	return {
		c() {
			section0 = element("section");
			ul3 = element("ul");
			li0 = element("li");
			a0 = element("a");
			t0 = text("What is babel?");
			ul0 = element("ul");
			li1 = element("li");
			a1 = element("a");
			t1 = text("What is Abstract Syntax Tree (AST)?");
			li2 = element("li");
			a2 = element("a");
			t2 = text("How to use babel to transform code");
			ul2 = element("ul");
			li3 = element("li");
			a3 = element("a");
			t3 = text("1. Have in mind what you want to transform from and transform into");
			li4 = element("li");
			a4 = element("a");
			t4 = text("2. Know what to target on the AST");
			li5 = element("li");
			a5 = element("a");
			t5 = text("3. Know how the transformed AST looks like");
			li6 = element("li");
			a6 = element("a");
			t6 = text("4. Write code");
			ul1 = element("ul");
			li7 = element("li");
			a7 = element("a");
			t7 = text("Transforming variable name");
			li8 = element("li");
			a8 = element("a");
			t8 = text("Transforming strings");
			li9 = element("li");
			a9 = element("a");
			t9 = text("Summary");
			li10 = element("li");
			a10 = element("a");
			t10 = text("Further resources");
			li11 = element("li");
			a11 = element("a");
			t11 = text("Reference");
			t12 = space();
			p0 = element("p");
			t13 = text("Today, I will share a step-by-step guide for writing a custom ");
			a12 = element("a");
			t14 = text("babel");
			t15 = text(" transformation. You can use this technique to write your own automated code modifications, refactoring and code generation.");
			t16 = space();
			section1 = element("section");
			h20 = element("h2");
			a13 = element("a");
			t17 = text("What is babel?");
			t18 = space();
			p1 = element("p");
			a14 = element("a");
			t19 = text("Babel");
			t20 = text(" is a JavaScript compiler that is mainly used to convert ECMAScript 2015+ code into backward compatible version of JavaScript in current and older browsers or environments. Babel uses a ");
			a15 = element("a");
			t21 = text("plugin system");
			t22 = text(" to do code transformation, so anyone can write their own transformation plugin for babel.");
			t23 = space();
			p2 = element("p");
			t24 = text("Before you get started writing a transformation plugin for babel, you would need to know what is an ");
			a16 = element("a");
			t25 = text("Abstract Syntax Tree (AST)");
			t26 = text(".");
			t27 = space();
			section2 = element("section");
			h30 = element("h3");
			a17 = element("a");
			t28 = text("What is Abstract Syntax Tree (AST)?");
			t29 = space();
			p3 = element("p");
			t30 = text("I am not sure I can explain this better than the amazing articles out there on the web:");
			t31 = space();
			ul4 = element("ul");
			li12 = element("li");
			a18 = element("a");
			t32 = text("Leveling Up One’s Parsing Game With ASTs");
			t33 = text(" by ");
			a19 = element("a");
			t34 = text("Vaidehi Joshi");
			t35 = text(" * ");
			em0 = element("em");
			t36 = text("(Highly recommend this one! 👍)");
			t37 = space();
			li13 = element("li");
			t38 = text("Wikipedia's ");
			a20 = element("a");
			t39 = text("Abstract syntax tree");
			t40 = space();
			li14 = element("li");
			a21 = element("a");
			t41 = text("What is an Abstract Syntax Tree");
			t42 = text(" by ");
			a22 = element("a");
			t43 = text("Chidume Nnamdi");
			t44 = space();
			p4 = element("p");
			t45 = text("To summarize, AST is a tree representation of your code. In the case of JavaScript, the JavaScript AST follows the ");
			a23 = element("a");
			t46 = text("estree specification");
			t47 = text(".");
			t48 = space();
			p5 = element("p");
			t49 = text("AST represents your code, the structure and the meaning of your code. So it allows the compiler like ");
			a24 = element("a");
			t50 = text("babel");
			t51 = text(" to understand the code and make specific meaningful transformation to it.");
			t52 = space();
			p6 = element("p");
			t53 = text("So now you know what is AST, let's write a custom babel transformation to modify your code using AST.");
			t54 = space();
			section3 = element("section");
			h21 = element("h2");
			a25 = element("a");
			t55 = text("How to use babel to transform code");
			t56 = space();
			p7 = element("p");
			t57 = text("The following is the general template of using babel to do code transformation:");
			t58 = space();
			pre0 = element("pre");
			t59 = space();
			blockquote0 = element("blockquote");
			p8 = element("p");
			t60 = text("You would need to install ");
			a26 = element("a");
			t61 = text("@babel/core");
			t62 = text(" to run this. ");
			code0 = element("code");
			t63 = text("@babel/parser");
			t64 = text(", ");
			code1 = element("code");
			t65 = text("@babel/traverse");
			t66 = text(", ");
			code2 = element("code");
			t67 = text("@babel/generator");
			t68 = text(" are all dependencies of ");
			code3 = element("code");
			t69 = text("@babel/core");
			t70 = text(", so installing ");
			code4 = element("code");
			t71 = text("@babel/core");
			t72 = text(" would suffice.");
			t73 = space();
			p9 = element("p");
			t74 = text("So the general idea is to parse your code to AST, transform the AST, and then generate code from the transformed AST.");
			t75 = space();
			pre1 = element("pre");
			t76 = space();
			p10 = element("p");
			t77 = text("However, we can use another API from ");
			code5 = element("code");
			t78 = text("babel");
			t79 = text(" to do all the above:");
			t80 = space();
			pre2 = element("pre");
			t81 = space();
			p11 = element("p");
			t82 = text("Now, you have written your first ");
			a27 = element("a");
			t83 = text("babel transform plugin");
			t84 = text(" that replace all variable named ");
			code6 = element("code");
			t85 = text("n");
			t86 = text(" to ");
			code7 = element("code");
			t87 = text("x");
			t88 = text(", how cool is that?!");
			t89 = space();
			blockquote1 = element("blockquote");
			p12 = element("p");
			t90 = text("Extract out the function ");
			code8 = element("code");
			t91 = text("myCustomPlugin");
			t92 = text(" to a new file and export it. ");
			a28 = element("a");
			t93 = text("Package and publish your file as a npm package");
			t94 = text(" and you can proudly say you have published a babel plugin! 🎉🎉");
			t95 = space();
			p13 = element("p");
			t96 = text("At this point, you must have thought: ");
			em1 = element("em");
			t97 = text("\"Yes I've just written a babel plugin, but I have no idea how it works...\"");
			t98 = text(", so fret not, let's dive in on how you can write the babel transformation plugin yourself!");
			t99 = space();
			p14 = element("p");
			t100 = text("So, here is the step-by-step guide to do it:");
			t101 = space();
			section4 = element("section");
			h31 = element("h3");
			a29 = element("a");
			t102 = text("1. Have in mind what you want to transform from and transform into");
			t103 = space();
			p15 = element("p");
			t104 = text("In this example, I want to prank my colleague by creating a babel plugin that will:");
			t105 = space();
			ul5 = element("ul");
			li15 = element("li");
			t106 = text("reverse all the variables' and functions' names");
			t107 = space();
			li16 = element("li");
			t108 = text("split out string into individual characters");
			t109 = space();
			pre3 = element("pre");
			t110 = space();
			p16 = element("p");
			t111 = text("into");
			t112 = space();
			pre4 = element("pre");
			t113 = space();
			p17 = element("p");
			t114 = text("Well, we have to keep the ");
			code9 = element("code");
			t115 = text("console.log");
			t116 = text(", so that even the code is hardly readable, it is still working fine. ");
			em2 = element("em");
			t117 = text("(I wouldn't want to break the production code!)");
			t118 = space();
			section5 = element("section");
			h32 = element("h3");
			a30 = element("a");
			t119 = text("2. Know what to target on the AST");
			t120 = space();
			p18 = element("p");
			t121 = text("Head down to a ");
			a31 = element("a");
			t122 = text("babel AST explorer");
			t123 = text(", click on different parts of the code and see where / how it is represented on the AST:");
			t124 = space();
			p19 = element("p");
			img0 = element("img");
			t125 = space();
			p20 = element("p");
			t126 = text("If this is your first time seeing the AST, play around with it for a little while and get the sense of how is it look like, and get to know the names of the node on the AST with respect to your code.");
			t127 = space();
			p21 = element("p");
			t128 = text("So, now we know that we need to target:");
			t129 = space();
			ul6 = element("ul");
			li17 = element("li");
			strong0 = element("strong");
			t130 = text("Identifier");
			t131 = text(" for variable and function names");
			t132 = space();
			li18 = element("li");
			strong1 = element("strong");
			t133 = text("StringLiteral");
			t134 = text(" for the string.");
			t135 = space();
			section6 = element("section");
			h33 = element("h3");
			a32 = element("a");
			t136 = text("3. Know how the transformed AST looks like");
			t137 = space();
			p22 = element("p");
			t138 = text("Head down to the ");
			a33 = element("a");
			t139 = text("babel AST explorer");
			t140 = text(" again, but this time around with the output code you want to generate.");
			t141 = space();
			p23 = element("p");
			img1 = element("img");
			t142 = space();
			p24 = element("p");
			t143 = text("Play around and think how you can transform from the previous AST to the current AST.");
			t144 = space();
			p25 = element("p");
			t145 = text("For example, you can see that ");
			code10 = element("code");
			t146 = text("'H' + 'e' + 'l' + 'l' + 'o' + ' ' + eman");
			t147 = text(" is formed by nested ");
			code11 = element("code");
			t148 = text("BinaryExpression");
			t149 = text(" with ");
			code12 = element("code");
			t150 = text("StringLiteral");
			t151 = text(".");
			t152 = space();
			section7 = element("section");
			h34 = element("h3");
			a34 = element("a");
			t153 = text("4. Write code");
			t154 = space();
			p26 = element("p");
			t155 = text("Now look at our code again:");
			t156 = space();
			pre5 = element("pre");
			t157 = space();
			p27 = element("p");
			t158 = text("The transformation uses ");
			a35 = element("a");
			t159 = text("the visitor pattern");
			t160 = text(".");
			t161 = space();
			p28 = element("p");
			t162 = text("During the traversal phase, babel will do a ");
			a36 = element("a");
			t163 = text("depth-first search traversal");
			t164 = text(" and visit each node in the AST. You can specify a callback method in the visitor, such that while visiting the node, babel will call the callback method with the node it is currently visiting.");
			t165 = space();
			p29 = element("p");
			t166 = text("In the visitor object, you can specify the name of the node you want to be ");
			code13 = element("code");
			t167 = text("callback");
			t168 = text("ed:");
			t169 = space();
			pre6 = element("pre");
			t170 = space();
			p30 = element("p");
			t171 = text("Run it and you will see that \"string literal\" and \"identifier\" is being called whenever babel encounters it:");
			t172 = space();
			pre7 = element("pre");
			t173 = space();
			hr0 = element("hr");
			t174 = space();
			p31 = element("p");
			t175 = text("Before we continue, let's look at the parameter of ");
			code14 = element("code");
			t176 = text("Identifer(path) {}");
			t177 = text(". It says ");
			code15 = element("code");
			t178 = text("path");
			t179 = text(" instead of ");
			code16 = element("code");
			t180 = text("node");
			t181 = text(", what is the difference between ");
			code17 = element("code");
			t182 = text("path");
			t183 = text(" and ");
			code18 = element("code");
			t184 = text("node");
			t185 = text("? 🤷‍");
			t186 = space();
			p32 = element("p");
			t187 = text("In babel, ");
			code19 = element("code");
			t188 = text("path");
			t189 = text(" is an abstraction above ");
			code20 = element("code");
			t190 = text("node");
			t191 = text(", it provides the link between nodes, ie the ");
			code21 = element("code");
			t192 = text("parent");
			t193 = text(" of the node, as well as information such as the ");
			code22 = element("code");
			t194 = text("scope");
			t195 = text(", ");
			code23 = element("code");
			t196 = text("context");
			t197 = text(", etc. Besides, the ");
			code24 = element("code");
			t198 = text("path");
			t199 = text(" provides method such as ");
			code25 = element("code");
			t200 = text("replaceWith");
			t201 = text(", ");
			code26 = element("code");
			t202 = text("insertBefore");
			t203 = text(", ");
			code27 = element("code");
			t204 = text("remove");
			t205 = text(", etc that will update and reflect on the underlying AST node.");
			t206 = space();
			blockquote2 = element("blockquote");
			p33 = element("p");
			t207 = text("You can read more detail about ");
			code28 = element("code");
			t208 = text("path");
			t209 = text(" in ");
			a37 = element("a");
			t210 = text("Jamie Kyle");
			t211 = text("'s ");
			a38 = element("a");
			t212 = text("babel handbook");
			t213 = space();
			hr1 = element("hr");
			t214 = space();
			p34 = element("p");
			t215 = text("So let's continue writing our babel plugin.");
			t216 = space();
			section8 = element("section");
			h40 = element("h4");
			a39 = element("a");
			t217 = text("Transforming variable name");
			t218 = space();
			p35 = element("p");
			t219 = text("As we can see from the ");
			a40 = element("a");
			t220 = text("AST explorer");
			t221 = text(", the name of the ");
			code29 = element("code");
			t222 = text("Identifier");
			t223 = text(" is stored in the property called ");
			code30 = element("code");
			t224 = text("name");
			t225 = text(", so what we will do is to reverse the ");
			code31 = element("code");
			t226 = text("name");
			t227 = text(".");
			t228 = space();
			pre8 = element("pre");
			t229 = space();
			p36 = element("p");
			t230 = text("Run it and you will see:");
			t231 = space();
			pre9 = element("pre");
			t232 = space();
			p37 = element("p");
			t233 = text("We are almost there, except we've accidentally reversed ");
			code32 = element("code");
			t234 = text("console.log");
			t235 = text(" as well. How can we prevent that?");
			t236 = space();
			p38 = element("p");
			t237 = text("Take a look at the AST again:");
			t238 = space();
			p39 = element("p");
			img2 = element("img");
			t239 = space();
			p40 = element("p");
			code33 = element("code");
			t240 = text("console.log");
			t241 = text(" is part of the ");
			code34 = element("code");
			t242 = text("MemberExpression");
			t243 = text(", with the ");
			code35 = element("code");
			t244 = text("object");
			t245 = text(" as ");
			code36 = element("code");
			t246 = text("\"console\"");
			t247 = text(" and ");
			code37 = element("code");
			t248 = text("property");
			t249 = text(" as ");
			code38 = element("code");
			t250 = text("\"log\"");
			t251 = text(".");
			t252 = space();
			p41 = element("p");
			t253 = text("So let's check that if our current ");
			code39 = element("code");
			t254 = text("Identifier");
			t255 = text(" is within this ");
			code40 = element("code");
			t256 = text("MemberExpression");
			t257 = text(" and we will not reverse the name:");
			t258 = space();
			pre10 = element("pre");
			t259 = space();
			p42 = element("p");
			t260 = text("And yes, now you get it right!");
			t261 = space();
			pre11 = element("pre");
			t262 = space();
			p43 = element("p");
			t263 = text("So, why do we have to check whether the ");
			code41 = element("code");
			t264 = text("Identifier");
			t265 = text("'s parent is not a ");
			code42 = element("code");
			t266 = text("console.log");
			t267 = space();
			code43 = element("code");
			t268 = text("MemberExpression");
			t269 = text("? Why don't we just compare whether the current ");
			code44 = element("code");
			t270 = text("Identifier.name === 'console' || Identifier.name === 'log'");
			t271 = text("?");
			t272 = space();
			p44 = element("p");
			t273 = text("You can do that, except that it will not reverse the variable name if it is named ");
			code45 = element("code");
			t274 = text("console");
			t275 = text(" or ");
			code46 = element("code");
			t276 = text("log");
			t277 = text(":");
			t278 = space();
			pre12 = element("pre");
			t279 = space();
			blockquote3 = element("blockquote");
			p45 = element("p");
			t280 = text("So, how do I know the method ");
			code47 = element("code");
			t281 = text("isMemberExpression");
			t282 = text(" and ");
			code48 = element("code");
			t283 = text("isIdentifier");
			t284 = text("? Well, all the node types specified in the ");
			a41 = element("a");
			t285 = text("@babel/types");
			t286 = text(" have the ");
			code49 = element("code");
			t287 = text("isXxxx");
			t288 = text(" validator function counterpart, eg: ");
			code50 = element("code");
			t289 = text("anyTypeAnnotation");
			t290 = text(" function will have a ");
			code51 = element("code");
			t291 = text("isAnyTypeAnnotation");
			t292 = text(" validator. If you want to know the exhaustive list of the validator functions, you can head over ");
			a42 = element("a");
			t293 = text("to the actual source code");
			t294 = text(".");
			t295 = space();
			section9 = element("section");
			h41 = element("h4");
			a43 = element("a");
			t296 = text("Transforming strings");
			t297 = space();
			p46 = element("p");
			t298 = text("The next step is to generate a nested ");
			code52 = element("code");
			t299 = text("BinaryExpression");
			t300 = text(" out of ");
			code53 = element("code");
			t301 = text("StringLiteral");
			t302 = text(".");
			t303 = space();
			p47 = element("p");
			t304 = text("To create an AST node, you can use the utility function from ");
			a44 = element("a");
			code54 = element("code");
			t305 = text("@babel/types");
			t306 = text(". ");
			code55 = element("code");
			t307 = text("@babel/types");
			t308 = text(" is also available via ");
			code56 = element("code");
			t309 = text("babel.types");
			t310 = text(" from ");
			code57 = element("code");
			t311 = text("@babel/core");
			t312 = text(".");
			t313 = space();
			pre13 = element("pre");
			t314 = space();
			p48 = element("p");
			t315 = text("So, we split the content of the ");
			code58 = element("code");
			t316 = text("StringLiteral");
			t317 = text(", which is in ");
			code59 = element("code");
			t318 = text("path.node.value");
			t319 = text(", make each character a ");
			code60 = element("code");
			t320 = text("StringLiteral");
			t321 = text(", and combine them with ");
			code61 = element("code");
			t322 = text("BinaryExpression");
			t323 = text(". Finally, we replace the ");
			code62 = element("code");
			t324 = text("StringLiteral");
			t325 = text(" with the newly created node.");
			t326 = space();
			p49 = element("p");
			t327 = text("...And that's it! Except, we ran into Stack Overflow 😅:");
			t328 = space();
			pre14 = element("pre");
			t329 = space();
			p50 = element("p");
			t330 = text("Why 🤷‍ ?");
			t331 = space();
			p51 = element("p");
			t332 = text("Well, that's because for each ");
			code63 = element("code");
			t333 = text("StringLiteral");
			t334 = text(" we created more ");
			code64 = element("code");
			t335 = text("StringLiteral");
			t336 = text(", and in each of those ");
			code65 = element("code");
			t337 = text("StringLiteral");
			t338 = text(", we are \"creating\" more ");
			code66 = element("code");
			t339 = text("StringLiteral");
			t340 = text(". Although we will replace a ");
			code67 = element("code");
			t341 = text("StringLiteral");
			t342 = text(" with another ");
			code68 = element("code");
			t343 = text("StringLiteral");
			t344 = text(", babel will treat it as a new node and will visit the newly created ");
			code69 = element("code");
			t345 = text("StringLiteral");
			t346 = text(", thus the infinite recursive and stack overflow.");
			t347 = space();
			p52 = element("p");
			t348 = text("So, how do we tell babel that once we replaced the ");
			code70 = element("code");
			t349 = text("StringLiteral");
			t350 = text(" with the ");
			code71 = element("code");
			t351 = text("newNode");
			t352 = text(", babel can stop and don't have to go down and visit the newly created node anymore?");
			t353 = space();
			p53 = element("p");
			t354 = text("We can use ");
			code72 = element("code");
			t355 = text("path.skip()");
			t356 = text(" to skip traversing the children of the current path:");
			t357 = space();
			pre15 = element("pre");
			t358 = space();
			p54 = element("p");
			t359 = text("...And yes it works now with now stack overflow!");
			t360 = space();
			section10 = element("section");
			h22 = element("h2");
			a45 = element("a");
			t361 = text("Summary");
			t362 = space();
			p55 = element("p");
			t363 = text("So, here we have it, our first code transformation with babel:");
			t364 = space();
			pre16 = element("pre");
			t365 = space();
			p56 = element("p");
			t366 = text("A summary of the steps on how we get here:");
			t367 = space();
			ol = element("ol");
			li19 = element("li");
			t368 = text("Have in mind what you want to transform from and transform into");
			t369 = space();
			li20 = element("li");
			t370 = text("Know what to target on the AST");
			t371 = space();
			li21 = element("li");
			t372 = text("Know how the transformed AST looks like");
			t373 = space();
			li22 = element("li");
			t374 = text("Write code");
			t375 = space();
			section11 = element("section");
			h23 = element("h2");
			a46 = element("a");
			t376 = text("Further resources");
			t377 = space();
			p57 = element("p");
			t378 = text("If you are interested to learn more, ");
			a47 = element("a");
			t379 = text("babel's Github repo");
			t380 = text(" is always the best place to find out more code examples of writing a babel transformation.");
			t381 = space();
			p58 = element("p");
			t382 = text("Head down to ");
			a48 = element("a");
			t383 = text("https://github.com/babel/babel");
			t384 = text(", and look for ");
			code73 = element("code");
			t385 = text("babel-plugin-transform-*");
			t386 = text(" or ");
			code74 = element("code");
			t387 = text("babel-plugin-proposal-*");
			t388 = text(" folders, they are all babel transformation plugin, where you can find code on how babel ");
			a49 = element("a");
			t389 = text("transform the nullish coalescing operator");
			t390 = text(", ");
			a50 = element("a");
			t391 = text("optional chaining");
			t392 = text(" and many more.");
			t393 = space();
			section12 = element("section");
			h24 = element("h2");
			a51 = element("a");
			t394 = text("Reference");
			t395 = space();
			ul7 = element("ul");
			li23 = element("li");
			a52 = element("a");
			t396 = text("Babel docs");
			t397 = text(" & ");
			a53 = element("a");
			t398 = text("Github repo");
			t399 = space();
			li24 = element("li");
			a54 = element("a");
			t400 = text("Babel Handbook");
			t401 = text(" by ");
			a55 = element("a");
			t402 = text("Jamie Kyle");
			t403 = space();
			li25 = element("li");
			a56 = element("a");
			t404 = text("Leveling Up One’s Parsing Game With ASTs");
			t405 = text(" by ");
			a57 = element("a");
			t406 = text("Vaidehi Joshi");
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
			t0 = claim_text(a0_nodes, "What is babel?");
			a0_nodes.forEach(detach);
			li0_nodes.forEach(detach);
			ul0 = claim_element(ul3_nodes, "UL", {});
			var ul0_nodes = children(ul0);
			li1 = claim_element(ul0_nodes, "LI", {});
			var li1_nodes = children(li1);
			a1 = claim_element(li1_nodes, "A", { href: true });
			var a1_nodes = children(a1);
			t1 = claim_text(a1_nodes, "What is Abstract Syntax Tree (AST)?");
			a1_nodes.forEach(detach);
			li1_nodes.forEach(detach);
			ul0_nodes.forEach(detach);
			li2 = claim_element(ul3_nodes, "LI", {});
			var li2_nodes = children(li2);
			a2 = claim_element(li2_nodes, "A", { href: true });
			var a2_nodes = children(a2);
			t2 = claim_text(a2_nodes, "How to use babel to transform code");
			a2_nodes.forEach(detach);
			li2_nodes.forEach(detach);
			ul2 = claim_element(ul3_nodes, "UL", {});
			var ul2_nodes = children(ul2);
			li3 = claim_element(ul2_nodes, "LI", {});
			var li3_nodes = children(li3);
			a3 = claim_element(li3_nodes, "A", { href: true });
			var a3_nodes = children(a3);
			t3 = claim_text(a3_nodes, "1. Have in mind what you want to transform from and transform into");
			a3_nodes.forEach(detach);
			li3_nodes.forEach(detach);
			li4 = claim_element(ul2_nodes, "LI", {});
			var li4_nodes = children(li4);
			a4 = claim_element(li4_nodes, "A", { href: true });
			var a4_nodes = children(a4);
			t4 = claim_text(a4_nodes, "2. Know what to target on the AST");
			a4_nodes.forEach(detach);
			li4_nodes.forEach(detach);
			li5 = claim_element(ul2_nodes, "LI", {});
			var li5_nodes = children(li5);
			a5 = claim_element(li5_nodes, "A", { href: true });
			var a5_nodes = children(a5);
			t5 = claim_text(a5_nodes, "3. Know how the transformed AST looks like");
			a5_nodes.forEach(detach);
			li5_nodes.forEach(detach);
			li6 = claim_element(ul2_nodes, "LI", {});
			var li6_nodes = children(li6);
			a6 = claim_element(li6_nodes, "A", { href: true });
			var a6_nodes = children(a6);
			t6 = claim_text(a6_nodes, "4. Write code");
			a6_nodes.forEach(detach);
			li6_nodes.forEach(detach);
			ul1 = claim_element(ul2_nodes, "UL", {});
			var ul1_nodes = children(ul1);
			li7 = claim_element(ul1_nodes, "LI", {});
			var li7_nodes = children(li7);
			a7 = claim_element(li7_nodes, "A", { href: true });
			var a7_nodes = children(a7);
			t7 = claim_text(a7_nodes, "Transforming variable name");
			a7_nodes.forEach(detach);
			li7_nodes.forEach(detach);
			li8 = claim_element(ul1_nodes, "LI", {});
			var li8_nodes = children(li8);
			a8 = claim_element(li8_nodes, "A", { href: true });
			var a8_nodes = children(a8);
			t8 = claim_text(a8_nodes, "Transforming strings");
			a8_nodes.forEach(detach);
			li8_nodes.forEach(detach);
			ul1_nodes.forEach(detach);
			ul2_nodes.forEach(detach);
			li9 = claim_element(ul3_nodes, "LI", {});
			var li9_nodes = children(li9);
			a9 = claim_element(li9_nodes, "A", { href: true });
			var a9_nodes = children(a9);
			t9 = claim_text(a9_nodes, "Summary");
			a9_nodes.forEach(detach);
			li9_nodes.forEach(detach);
			li10 = claim_element(ul3_nodes, "LI", {});
			var li10_nodes = children(li10);
			a10 = claim_element(li10_nodes, "A", { href: true });
			var a10_nodes = children(a10);
			t10 = claim_text(a10_nodes, "Further resources");
			a10_nodes.forEach(detach);
			li10_nodes.forEach(detach);
			li11 = claim_element(ul3_nodes, "LI", {});
			var li11_nodes = children(li11);
			a11 = claim_element(li11_nodes, "A", { href: true });
			var a11_nodes = children(a11);
			t11 = claim_text(a11_nodes, "Reference");
			a11_nodes.forEach(detach);
			li11_nodes.forEach(detach);
			ul3_nodes.forEach(detach);
			section0_nodes.forEach(detach);
			t12 = claim_space(nodes);
			p0 = claim_element(nodes, "P", {});
			var p0_nodes = children(p0);
			t13 = claim_text(p0_nodes, "Today, I will share a step-by-step guide for writing a custom ");
			a12 = claim_element(p0_nodes, "A", { href: true, rel: true });
			var a12_nodes = children(a12);
			t14 = claim_text(a12_nodes, "babel");
			a12_nodes.forEach(detach);
			t15 = claim_text(p0_nodes, " transformation. You can use this technique to write your own automated code modifications, refactoring and code generation.");
			p0_nodes.forEach(detach);
			t16 = claim_space(nodes);
			section1 = claim_element(nodes, "SECTION", {});
			var section1_nodes = children(section1);
			h20 = claim_element(section1_nodes, "H2", {});
			var h20_nodes = children(h20);
			a13 = claim_element(h20_nodes, "A", { href: true, id: true });
			var a13_nodes = children(a13);
			t17 = claim_text(a13_nodes, "What is babel?");
			a13_nodes.forEach(detach);
			h20_nodes.forEach(detach);
			t18 = claim_space(section1_nodes);
			p1 = claim_element(section1_nodes, "P", {});
			var p1_nodes = children(p1);
			a14 = claim_element(p1_nodes, "A", { href: true, rel: true });
			var a14_nodes = children(a14);
			t19 = claim_text(a14_nodes, "Babel");
			a14_nodes.forEach(detach);
			t20 = claim_text(p1_nodes, " is a JavaScript compiler that is mainly used to convert ECMAScript 2015+ code into backward compatible version of JavaScript in current and older browsers or environments. Babel uses a ");
			a15 = claim_element(p1_nodes, "A", { href: true, rel: true });
			var a15_nodes = children(a15);
			t21 = claim_text(a15_nodes, "plugin system");
			a15_nodes.forEach(detach);
			t22 = claim_text(p1_nodes, " to do code transformation, so anyone can write their own transformation plugin for babel.");
			p1_nodes.forEach(detach);
			t23 = claim_space(section1_nodes);
			p2 = claim_element(section1_nodes, "P", {});
			var p2_nodes = children(p2);
			t24 = claim_text(p2_nodes, "Before you get started writing a transformation plugin for babel, you would need to know what is an ");
			a16 = claim_element(p2_nodes, "A", { href: true, rel: true });
			var a16_nodes = children(a16);
			t25 = claim_text(a16_nodes, "Abstract Syntax Tree (AST)");
			a16_nodes.forEach(detach);
			t26 = claim_text(p2_nodes, ".");
			p2_nodes.forEach(detach);
			section1_nodes.forEach(detach);
			t27 = claim_space(nodes);
			section2 = claim_element(nodes, "SECTION", {});
			var section2_nodes = children(section2);
			h30 = claim_element(section2_nodes, "H3", {});
			var h30_nodes = children(h30);
			a17 = claim_element(h30_nodes, "A", { href: true, id: true });
			var a17_nodes = children(a17);
			t28 = claim_text(a17_nodes, "What is Abstract Syntax Tree (AST)?");
			a17_nodes.forEach(detach);
			h30_nodes.forEach(detach);
			t29 = claim_space(section2_nodes);
			p3 = claim_element(section2_nodes, "P", {});
			var p3_nodes = children(p3);
			t30 = claim_text(p3_nodes, "I am not sure I can explain this better than the amazing articles out there on the web:");
			p3_nodes.forEach(detach);
			t31 = claim_space(section2_nodes);
			ul4 = claim_element(section2_nodes, "UL", {});
			var ul4_nodes = children(ul4);
			li12 = claim_element(ul4_nodes, "LI", {});
			var li12_nodes = children(li12);
			a18 = claim_element(li12_nodes, "A", { href: true, rel: true });
			var a18_nodes = children(a18);
			t32 = claim_text(a18_nodes, "Leveling Up One’s Parsing Game With ASTs");
			a18_nodes.forEach(detach);
			t33 = claim_text(li12_nodes, " by ");
			a19 = claim_element(li12_nodes, "A", { href: true, rel: true });
			var a19_nodes = children(a19);
			t34 = claim_text(a19_nodes, "Vaidehi Joshi");
			a19_nodes.forEach(detach);
			t35 = claim_text(li12_nodes, " * ");
			em0 = claim_element(li12_nodes, "EM", {});
			var em0_nodes = children(em0);
			t36 = claim_text(em0_nodes, "(Highly recommend this one! 👍)");
			em0_nodes.forEach(detach);
			li12_nodes.forEach(detach);
			t37 = claim_space(ul4_nodes);
			li13 = claim_element(ul4_nodes, "LI", {});
			var li13_nodes = children(li13);
			t38 = claim_text(li13_nodes, "Wikipedia's ");
			a20 = claim_element(li13_nodes, "A", { href: true, rel: true });
			var a20_nodes = children(a20);
			t39 = claim_text(a20_nodes, "Abstract syntax tree");
			a20_nodes.forEach(detach);
			li13_nodes.forEach(detach);
			t40 = claim_space(ul4_nodes);
			li14 = claim_element(ul4_nodes, "LI", {});
			var li14_nodes = children(li14);
			a21 = claim_element(li14_nodes, "A", { href: true, rel: true });
			var a21_nodes = children(a21);
			t41 = claim_text(a21_nodes, "What is an Abstract Syntax Tree");
			a21_nodes.forEach(detach);
			t42 = claim_text(li14_nodes, " by ");
			a22 = claim_element(li14_nodes, "A", { href: true, rel: true });
			var a22_nodes = children(a22);
			t43 = claim_text(a22_nodes, "Chidume Nnamdi");
			a22_nodes.forEach(detach);
			li14_nodes.forEach(detach);
			ul4_nodes.forEach(detach);
			t44 = claim_space(section2_nodes);
			p4 = claim_element(section2_nodes, "P", {});
			var p4_nodes = children(p4);
			t45 = claim_text(p4_nodes, "To summarize, AST is a tree representation of your code. In the case of JavaScript, the JavaScript AST follows the ");
			a23 = claim_element(p4_nodes, "A", { href: true, rel: true });
			var a23_nodes = children(a23);
			t46 = claim_text(a23_nodes, "estree specification");
			a23_nodes.forEach(detach);
			t47 = claim_text(p4_nodes, ".");
			p4_nodes.forEach(detach);
			t48 = claim_space(section2_nodes);
			p5 = claim_element(section2_nodes, "P", {});
			var p5_nodes = children(p5);
			t49 = claim_text(p5_nodes, "AST represents your code, the structure and the meaning of your code. So it allows the compiler like ");
			a24 = claim_element(p5_nodes, "A", { href: true, rel: true });
			var a24_nodes = children(a24);
			t50 = claim_text(a24_nodes, "babel");
			a24_nodes.forEach(detach);
			t51 = claim_text(p5_nodes, " to understand the code and make specific meaningful transformation to it.");
			p5_nodes.forEach(detach);
			t52 = claim_space(section2_nodes);
			p6 = claim_element(section2_nodes, "P", {});
			var p6_nodes = children(p6);
			t53 = claim_text(p6_nodes, "So now you know what is AST, let's write a custom babel transformation to modify your code using AST.");
			p6_nodes.forEach(detach);
			section2_nodes.forEach(detach);
			t54 = claim_space(nodes);
			section3 = claim_element(nodes, "SECTION", {});
			var section3_nodes = children(section3);
			h21 = claim_element(section3_nodes, "H2", {});
			var h21_nodes = children(h21);
			a25 = claim_element(h21_nodes, "A", { href: true, id: true });
			var a25_nodes = children(a25);
			t55 = claim_text(a25_nodes, "How to use babel to transform code");
			a25_nodes.forEach(detach);
			h21_nodes.forEach(detach);
			t56 = claim_space(section3_nodes);
			p7 = claim_element(section3_nodes, "P", {});
			var p7_nodes = children(p7);
			t57 = claim_text(p7_nodes, "The following is the general template of using babel to do code transformation:");
			p7_nodes.forEach(detach);
			t58 = claim_space(section3_nodes);
			pre0 = claim_element(section3_nodes, "PRE", { class: true });
			var pre0_nodes = children(pre0);
			pre0_nodes.forEach(detach);
			t59 = claim_space(section3_nodes);
			blockquote0 = claim_element(section3_nodes, "BLOCKQUOTE", {});
			var blockquote0_nodes = children(blockquote0);
			p8 = claim_element(blockquote0_nodes, "P", {});
			var p8_nodes = children(p8);
			t60 = claim_text(p8_nodes, "You would need to install ");
			a26 = claim_element(p8_nodes, "A", { href: true, rel: true });
			var a26_nodes = children(a26);
			t61 = claim_text(a26_nodes, "@babel/core");
			a26_nodes.forEach(detach);
			t62 = claim_text(p8_nodes, " to run this. ");
			code0 = claim_element(p8_nodes, "CODE", {});
			var code0_nodes = children(code0);
			t63 = claim_text(code0_nodes, "@babel/parser");
			code0_nodes.forEach(detach);
			t64 = claim_text(p8_nodes, ", ");
			code1 = claim_element(p8_nodes, "CODE", {});
			var code1_nodes = children(code1);
			t65 = claim_text(code1_nodes, "@babel/traverse");
			code1_nodes.forEach(detach);
			t66 = claim_text(p8_nodes, ", ");
			code2 = claim_element(p8_nodes, "CODE", {});
			var code2_nodes = children(code2);
			t67 = claim_text(code2_nodes, "@babel/generator");
			code2_nodes.forEach(detach);
			t68 = claim_text(p8_nodes, " are all dependencies of ");
			code3 = claim_element(p8_nodes, "CODE", {});
			var code3_nodes = children(code3);
			t69 = claim_text(code3_nodes, "@babel/core");
			code3_nodes.forEach(detach);
			t70 = claim_text(p8_nodes, ", so installing ");
			code4 = claim_element(p8_nodes, "CODE", {});
			var code4_nodes = children(code4);
			t71 = claim_text(code4_nodes, "@babel/core");
			code4_nodes.forEach(detach);
			t72 = claim_text(p8_nodes, " would suffice.");
			p8_nodes.forEach(detach);
			blockquote0_nodes.forEach(detach);
			t73 = claim_space(section3_nodes);
			p9 = claim_element(section3_nodes, "P", {});
			var p9_nodes = children(p9);
			t74 = claim_text(p9_nodes, "So the general idea is to parse your code to AST, transform the AST, and then generate code from the transformed AST.");
			p9_nodes.forEach(detach);
			t75 = claim_space(section3_nodes);
			pre1 = claim_element(section3_nodes, "PRE", { class: true });
			var pre1_nodes = children(pre1);
			pre1_nodes.forEach(detach);
			t76 = claim_space(section3_nodes);
			p10 = claim_element(section3_nodes, "P", {});
			var p10_nodes = children(p10);
			t77 = claim_text(p10_nodes, "However, we can use another API from ");
			code5 = claim_element(p10_nodes, "CODE", {});
			var code5_nodes = children(code5);
			t78 = claim_text(code5_nodes, "babel");
			code5_nodes.forEach(detach);
			t79 = claim_text(p10_nodes, " to do all the above:");
			p10_nodes.forEach(detach);
			t80 = claim_space(section3_nodes);
			pre2 = claim_element(section3_nodes, "PRE", { class: true });
			var pre2_nodes = children(pre2);
			pre2_nodes.forEach(detach);
			t81 = claim_space(section3_nodes);
			p11 = claim_element(section3_nodes, "P", {});
			var p11_nodes = children(p11);
			t82 = claim_text(p11_nodes, "Now, you have written your first ");
			a27 = claim_element(p11_nodes, "A", { href: true, rel: true });
			var a27_nodes = children(a27);
			t83 = claim_text(a27_nodes, "babel transform plugin");
			a27_nodes.forEach(detach);
			t84 = claim_text(p11_nodes, " that replace all variable named ");
			code6 = claim_element(p11_nodes, "CODE", {});
			var code6_nodes = children(code6);
			t85 = claim_text(code6_nodes, "n");
			code6_nodes.forEach(detach);
			t86 = claim_text(p11_nodes, " to ");
			code7 = claim_element(p11_nodes, "CODE", {});
			var code7_nodes = children(code7);
			t87 = claim_text(code7_nodes, "x");
			code7_nodes.forEach(detach);
			t88 = claim_text(p11_nodes, ", how cool is that?!");
			p11_nodes.forEach(detach);
			t89 = claim_space(section3_nodes);
			blockquote1 = claim_element(section3_nodes, "BLOCKQUOTE", {});
			var blockquote1_nodes = children(blockquote1);
			p12 = claim_element(blockquote1_nodes, "P", {});
			var p12_nodes = children(p12);
			t90 = claim_text(p12_nodes, "Extract out the function ");
			code8 = claim_element(p12_nodes, "CODE", {});
			var code8_nodes = children(code8);
			t91 = claim_text(code8_nodes, "myCustomPlugin");
			code8_nodes.forEach(detach);
			t92 = claim_text(p12_nodes, " to a new file and export it. ");
			a28 = claim_element(p12_nodes, "A", { href: true, rel: true });
			var a28_nodes = children(a28);
			t93 = claim_text(a28_nodes, "Package and publish your file as a npm package");
			a28_nodes.forEach(detach);
			t94 = claim_text(p12_nodes, " and you can proudly say you have published a babel plugin! 🎉🎉");
			p12_nodes.forEach(detach);
			blockquote1_nodes.forEach(detach);
			t95 = claim_space(section3_nodes);
			p13 = claim_element(section3_nodes, "P", {});
			var p13_nodes = children(p13);
			t96 = claim_text(p13_nodes, "At this point, you must have thought: ");
			em1 = claim_element(p13_nodes, "EM", {});
			var em1_nodes = children(em1);
			t97 = claim_text(em1_nodes, "\"Yes I've just written a babel plugin, but I have no idea how it works...\"");
			em1_nodes.forEach(detach);
			t98 = claim_text(p13_nodes, ", so fret not, let's dive in on how you can write the babel transformation plugin yourself!");
			p13_nodes.forEach(detach);
			t99 = claim_space(section3_nodes);
			p14 = claim_element(section3_nodes, "P", {});
			var p14_nodes = children(p14);
			t100 = claim_text(p14_nodes, "So, here is the step-by-step guide to do it:");
			p14_nodes.forEach(detach);
			section3_nodes.forEach(detach);
			t101 = claim_space(nodes);
			section4 = claim_element(nodes, "SECTION", {});
			var section4_nodes = children(section4);
			h31 = claim_element(section4_nodes, "H3", {});
			var h31_nodes = children(h31);
			a29 = claim_element(h31_nodes, "A", { href: true, id: true });
			var a29_nodes = children(a29);
			t102 = claim_text(a29_nodes, "1. Have in mind what you want to transform from and transform into");
			a29_nodes.forEach(detach);
			h31_nodes.forEach(detach);
			t103 = claim_space(section4_nodes);
			p15 = claim_element(section4_nodes, "P", {});
			var p15_nodes = children(p15);
			t104 = claim_text(p15_nodes, "In this example, I want to prank my colleague by creating a babel plugin that will:");
			p15_nodes.forEach(detach);
			t105 = claim_space(section4_nodes);
			ul5 = claim_element(section4_nodes, "UL", {});
			var ul5_nodes = children(ul5);
			li15 = claim_element(ul5_nodes, "LI", {});
			var li15_nodes = children(li15);
			t106 = claim_text(li15_nodes, "reverse all the variables' and functions' names");
			li15_nodes.forEach(detach);
			t107 = claim_space(ul5_nodes);
			li16 = claim_element(ul5_nodes, "LI", {});
			var li16_nodes = children(li16);
			t108 = claim_text(li16_nodes, "split out string into individual characters");
			li16_nodes.forEach(detach);
			ul5_nodes.forEach(detach);
			t109 = claim_space(section4_nodes);
			pre3 = claim_element(section4_nodes, "PRE", { class: true });
			var pre3_nodes = children(pre3);
			pre3_nodes.forEach(detach);
			t110 = claim_space(section4_nodes);
			p16 = claim_element(section4_nodes, "P", {});
			var p16_nodes = children(p16);
			t111 = claim_text(p16_nodes, "into");
			p16_nodes.forEach(detach);
			t112 = claim_space(section4_nodes);
			pre4 = claim_element(section4_nodes, "PRE", { class: true });
			var pre4_nodes = children(pre4);
			pre4_nodes.forEach(detach);
			t113 = claim_space(section4_nodes);
			p17 = claim_element(section4_nodes, "P", {});
			var p17_nodes = children(p17);
			t114 = claim_text(p17_nodes, "Well, we have to keep the ");
			code9 = claim_element(p17_nodes, "CODE", {});
			var code9_nodes = children(code9);
			t115 = claim_text(code9_nodes, "console.log");
			code9_nodes.forEach(detach);
			t116 = claim_text(p17_nodes, ", so that even the code is hardly readable, it is still working fine. ");
			em2 = claim_element(p17_nodes, "EM", {});
			var em2_nodes = children(em2);
			t117 = claim_text(em2_nodes, "(I wouldn't want to break the production code!)");
			em2_nodes.forEach(detach);
			p17_nodes.forEach(detach);
			section4_nodes.forEach(detach);
			t118 = claim_space(nodes);
			section5 = claim_element(nodes, "SECTION", {});
			var section5_nodes = children(section5);
			h32 = claim_element(section5_nodes, "H3", {});
			var h32_nodes = children(h32);
			a30 = claim_element(h32_nodes, "A", { href: true, id: true });
			var a30_nodes = children(a30);
			t119 = claim_text(a30_nodes, "2. Know what to target on the AST");
			a30_nodes.forEach(detach);
			h32_nodes.forEach(detach);
			t120 = claim_space(section5_nodes);
			p18 = claim_element(section5_nodes, "P", {});
			var p18_nodes = children(p18);
			t121 = claim_text(p18_nodes, "Head down to a ");
			a31 = claim_element(p18_nodes, "A", { href: true, rel: true });
			var a31_nodes = children(a31);
			t122 = claim_text(a31_nodes, "babel AST explorer");
			a31_nodes.forEach(detach);
			t123 = claim_text(p18_nodes, ", click on different parts of the code and see where / how it is represented on the AST:");
			p18_nodes.forEach(detach);
			t124 = claim_space(section5_nodes);
			p19 = claim_element(section5_nodes, "P", {});
			var p19_nodes = children(p19);
			img0 = claim_element(p19_nodes, "IMG", { src: true, alt: true, title: true });
			p19_nodes.forEach(detach);
			t125 = claim_space(section5_nodes);
			p20 = claim_element(section5_nodes, "P", {});
			var p20_nodes = children(p20);
			t126 = claim_text(p20_nodes, "If this is your first time seeing the AST, play around with it for a little while and get the sense of how is it look like, and get to know the names of the node on the AST with respect to your code.");
			p20_nodes.forEach(detach);
			t127 = claim_space(section5_nodes);
			p21 = claim_element(section5_nodes, "P", {});
			var p21_nodes = children(p21);
			t128 = claim_text(p21_nodes, "So, now we know that we need to target:");
			p21_nodes.forEach(detach);
			t129 = claim_space(section5_nodes);
			ul6 = claim_element(section5_nodes, "UL", {});
			var ul6_nodes = children(ul6);
			li17 = claim_element(ul6_nodes, "LI", {});
			var li17_nodes = children(li17);
			strong0 = claim_element(li17_nodes, "STRONG", {});
			var strong0_nodes = children(strong0);
			t130 = claim_text(strong0_nodes, "Identifier");
			strong0_nodes.forEach(detach);
			t131 = claim_text(li17_nodes, " for variable and function names");
			li17_nodes.forEach(detach);
			t132 = claim_space(ul6_nodes);
			li18 = claim_element(ul6_nodes, "LI", {});
			var li18_nodes = children(li18);
			strong1 = claim_element(li18_nodes, "STRONG", {});
			var strong1_nodes = children(strong1);
			t133 = claim_text(strong1_nodes, "StringLiteral");
			strong1_nodes.forEach(detach);
			t134 = claim_text(li18_nodes, " for the string.");
			li18_nodes.forEach(detach);
			ul6_nodes.forEach(detach);
			section5_nodes.forEach(detach);
			t135 = claim_space(nodes);
			section6 = claim_element(nodes, "SECTION", {});
			var section6_nodes = children(section6);
			h33 = claim_element(section6_nodes, "H3", {});
			var h33_nodes = children(h33);
			a32 = claim_element(h33_nodes, "A", { href: true, id: true });
			var a32_nodes = children(a32);
			t136 = claim_text(a32_nodes, "3. Know how the transformed AST looks like");
			a32_nodes.forEach(detach);
			h33_nodes.forEach(detach);
			t137 = claim_space(section6_nodes);
			p22 = claim_element(section6_nodes, "P", {});
			var p22_nodes = children(p22);
			t138 = claim_text(p22_nodes, "Head down to the ");
			a33 = claim_element(p22_nodes, "A", { href: true, rel: true });
			var a33_nodes = children(a33);
			t139 = claim_text(a33_nodes, "babel AST explorer");
			a33_nodes.forEach(detach);
			t140 = claim_text(p22_nodes, " again, but this time around with the output code you want to generate.");
			p22_nodes.forEach(detach);
			t141 = claim_space(section6_nodes);
			p23 = claim_element(section6_nodes, "P", {});
			var p23_nodes = children(p23);
			img1 = claim_element(p23_nodes, "IMG", { src: true, alt: true, title: true });
			p23_nodes.forEach(detach);
			t142 = claim_space(section6_nodes);
			p24 = claim_element(section6_nodes, "P", {});
			var p24_nodes = children(p24);
			t143 = claim_text(p24_nodes, "Play around and think how you can transform from the previous AST to the current AST.");
			p24_nodes.forEach(detach);
			t144 = claim_space(section6_nodes);
			p25 = claim_element(section6_nodes, "P", {});
			var p25_nodes = children(p25);
			t145 = claim_text(p25_nodes, "For example, you can see that ");
			code10 = claim_element(p25_nodes, "CODE", {});
			var code10_nodes = children(code10);
			t146 = claim_text(code10_nodes, "'H' + 'e' + 'l' + 'l' + 'o' + ' ' + eman");
			code10_nodes.forEach(detach);
			t147 = claim_text(p25_nodes, " is formed by nested ");
			code11 = claim_element(p25_nodes, "CODE", {});
			var code11_nodes = children(code11);
			t148 = claim_text(code11_nodes, "BinaryExpression");
			code11_nodes.forEach(detach);
			t149 = claim_text(p25_nodes, " with ");
			code12 = claim_element(p25_nodes, "CODE", {});
			var code12_nodes = children(code12);
			t150 = claim_text(code12_nodes, "StringLiteral");
			code12_nodes.forEach(detach);
			t151 = claim_text(p25_nodes, ".");
			p25_nodes.forEach(detach);
			section6_nodes.forEach(detach);
			t152 = claim_space(nodes);
			section7 = claim_element(nodes, "SECTION", {});
			var section7_nodes = children(section7);
			h34 = claim_element(section7_nodes, "H3", {});
			var h34_nodes = children(h34);
			a34 = claim_element(h34_nodes, "A", { href: true, id: true });
			var a34_nodes = children(a34);
			t153 = claim_text(a34_nodes, "4. Write code");
			a34_nodes.forEach(detach);
			h34_nodes.forEach(detach);
			t154 = claim_space(section7_nodes);
			p26 = claim_element(section7_nodes, "P", {});
			var p26_nodes = children(p26);
			t155 = claim_text(p26_nodes, "Now look at our code again:");
			p26_nodes.forEach(detach);
			t156 = claim_space(section7_nodes);
			pre5 = claim_element(section7_nodes, "PRE", { class: true });
			var pre5_nodes = children(pre5);
			pre5_nodes.forEach(detach);
			t157 = claim_space(section7_nodes);
			p27 = claim_element(section7_nodes, "P", {});
			var p27_nodes = children(p27);
			t158 = claim_text(p27_nodes, "The transformation uses ");
			a35 = claim_element(p27_nodes, "A", { href: true, rel: true });
			var a35_nodes = children(a35);
			t159 = claim_text(a35_nodes, "the visitor pattern");
			a35_nodes.forEach(detach);
			t160 = claim_text(p27_nodes, ".");
			p27_nodes.forEach(detach);
			t161 = claim_space(section7_nodes);
			p28 = claim_element(section7_nodes, "P", {});
			var p28_nodes = children(p28);
			t162 = claim_text(p28_nodes, "During the traversal phase, babel will do a ");
			a36 = claim_element(p28_nodes, "A", { href: true, rel: true });
			var a36_nodes = children(a36);
			t163 = claim_text(a36_nodes, "depth-first search traversal");
			a36_nodes.forEach(detach);
			t164 = claim_text(p28_nodes, " and visit each node in the AST. You can specify a callback method in the visitor, such that while visiting the node, babel will call the callback method with the node it is currently visiting.");
			p28_nodes.forEach(detach);
			t165 = claim_space(section7_nodes);
			p29 = claim_element(section7_nodes, "P", {});
			var p29_nodes = children(p29);
			t166 = claim_text(p29_nodes, "In the visitor object, you can specify the name of the node you want to be ");
			code13 = claim_element(p29_nodes, "CODE", {});
			var code13_nodes = children(code13);
			t167 = claim_text(code13_nodes, "callback");
			code13_nodes.forEach(detach);
			t168 = claim_text(p29_nodes, "ed:");
			p29_nodes.forEach(detach);
			t169 = claim_space(section7_nodes);
			pre6 = claim_element(section7_nodes, "PRE", { class: true });
			var pre6_nodes = children(pre6);
			pre6_nodes.forEach(detach);
			t170 = claim_space(section7_nodes);
			p30 = claim_element(section7_nodes, "P", {});
			var p30_nodes = children(p30);
			t171 = claim_text(p30_nodes, "Run it and you will see that \"string literal\" and \"identifier\" is being called whenever babel encounters it:");
			p30_nodes.forEach(detach);
			t172 = claim_space(section7_nodes);
			pre7 = claim_element(section7_nodes, "PRE", { class: true });
			var pre7_nodes = children(pre7);
			pre7_nodes.forEach(detach);
			t173 = claim_space(section7_nodes);
			hr0 = claim_element(section7_nodes, "HR", {});
			t174 = claim_space(section7_nodes);
			p31 = claim_element(section7_nodes, "P", {});
			var p31_nodes = children(p31);
			t175 = claim_text(p31_nodes, "Before we continue, let's look at the parameter of ");
			code14 = claim_element(p31_nodes, "CODE", {});
			var code14_nodes = children(code14);
			t176 = claim_text(code14_nodes, "Identifer(path) {}");
			code14_nodes.forEach(detach);
			t177 = claim_text(p31_nodes, ". It says ");
			code15 = claim_element(p31_nodes, "CODE", {});
			var code15_nodes = children(code15);
			t178 = claim_text(code15_nodes, "path");
			code15_nodes.forEach(detach);
			t179 = claim_text(p31_nodes, " instead of ");
			code16 = claim_element(p31_nodes, "CODE", {});
			var code16_nodes = children(code16);
			t180 = claim_text(code16_nodes, "node");
			code16_nodes.forEach(detach);
			t181 = claim_text(p31_nodes, ", what is the difference between ");
			code17 = claim_element(p31_nodes, "CODE", {});
			var code17_nodes = children(code17);
			t182 = claim_text(code17_nodes, "path");
			code17_nodes.forEach(detach);
			t183 = claim_text(p31_nodes, " and ");
			code18 = claim_element(p31_nodes, "CODE", {});
			var code18_nodes = children(code18);
			t184 = claim_text(code18_nodes, "node");
			code18_nodes.forEach(detach);
			t185 = claim_text(p31_nodes, "? 🤷‍");
			p31_nodes.forEach(detach);
			t186 = claim_space(section7_nodes);
			p32 = claim_element(section7_nodes, "P", {});
			var p32_nodes = children(p32);
			t187 = claim_text(p32_nodes, "In babel, ");
			code19 = claim_element(p32_nodes, "CODE", {});
			var code19_nodes = children(code19);
			t188 = claim_text(code19_nodes, "path");
			code19_nodes.forEach(detach);
			t189 = claim_text(p32_nodes, " is an abstraction above ");
			code20 = claim_element(p32_nodes, "CODE", {});
			var code20_nodes = children(code20);
			t190 = claim_text(code20_nodes, "node");
			code20_nodes.forEach(detach);
			t191 = claim_text(p32_nodes, ", it provides the link between nodes, ie the ");
			code21 = claim_element(p32_nodes, "CODE", {});
			var code21_nodes = children(code21);
			t192 = claim_text(code21_nodes, "parent");
			code21_nodes.forEach(detach);
			t193 = claim_text(p32_nodes, " of the node, as well as information such as the ");
			code22 = claim_element(p32_nodes, "CODE", {});
			var code22_nodes = children(code22);
			t194 = claim_text(code22_nodes, "scope");
			code22_nodes.forEach(detach);
			t195 = claim_text(p32_nodes, ", ");
			code23 = claim_element(p32_nodes, "CODE", {});
			var code23_nodes = children(code23);
			t196 = claim_text(code23_nodes, "context");
			code23_nodes.forEach(detach);
			t197 = claim_text(p32_nodes, ", etc. Besides, the ");
			code24 = claim_element(p32_nodes, "CODE", {});
			var code24_nodes = children(code24);
			t198 = claim_text(code24_nodes, "path");
			code24_nodes.forEach(detach);
			t199 = claim_text(p32_nodes, " provides method such as ");
			code25 = claim_element(p32_nodes, "CODE", {});
			var code25_nodes = children(code25);
			t200 = claim_text(code25_nodes, "replaceWith");
			code25_nodes.forEach(detach);
			t201 = claim_text(p32_nodes, ", ");
			code26 = claim_element(p32_nodes, "CODE", {});
			var code26_nodes = children(code26);
			t202 = claim_text(code26_nodes, "insertBefore");
			code26_nodes.forEach(detach);
			t203 = claim_text(p32_nodes, ", ");
			code27 = claim_element(p32_nodes, "CODE", {});
			var code27_nodes = children(code27);
			t204 = claim_text(code27_nodes, "remove");
			code27_nodes.forEach(detach);
			t205 = claim_text(p32_nodes, ", etc that will update and reflect on the underlying AST node.");
			p32_nodes.forEach(detach);
			t206 = claim_space(section7_nodes);
			blockquote2 = claim_element(section7_nodes, "BLOCKQUOTE", {});
			var blockquote2_nodes = children(blockquote2);
			p33 = claim_element(blockquote2_nodes, "P", {});
			var p33_nodes = children(p33);
			t207 = claim_text(p33_nodes, "You can read more detail about ");
			code28 = claim_element(p33_nodes, "CODE", {});
			var code28_nodes = children(code28);
			t208 = claim_text(code28_nodes, "path");
			code28_nodes.forEach(detach);
			t209 = claim_text(p33_nodes, " in ");
			a37 = claim_element(p33_nodes, "A", { href: true, rel: true });
			var a37_nodes = children(a37);
			t210 = claim_text(a37_nodes, "Jamie Kyle");
			a37_nodes.forEach(detach);
			t211 = claim_text(p33_nodes, "'s ");
			a38 = claim_element(p33_nodes, "A", { href: true, rel: true });
			var a38_nodes = children(a38);
			t212 = claim_text(a38_nodes, "babel handbook");
			a38_nodes.forEach(detach);
			p33_nodes.forEach(detach);
			blockquote2_nodes.forEach(detach);
			t213 = claim_space(section7_nodes);
			hr1 = claim_element(section7_nodes, "HR", {});
			t214 = claim_space(section7_nodes);
			p34 = claim_element(section7_nodes, "P", {});
			var p34_nodes = children(p34);
			t215 = claim_text(p34_nodes, "So let's continue writing our babel plugin.");
			p34_nodes.forEach(detach);
			section7_nodes.forEach(detach);
			t216 = claim_space(nodes);
			section8 = claim_element(nodes, "SECTION", {});
			var section8_nodes = children(section8);
			h40 = claim_element(section8_nodes, "H4", {});
			var h40_nodes = children(h40);
			a39 = claim_element(h40_nodes, "A", { href: true, id: true });
			var a39_nodes = children(a39);
			t217 = claim_text(a39_nodes, "Transforming variable name");
			a39_nodes.forEach(detach);
			h40_nodes.forEach(detach);
			t218 = claim_space(section8_nodes);
			p35 = claim_element(section8_nodes, "P", {});
			var p35_nodes = children(p35);
			t219 = claim_text(p35_nodes, "As we can see from the ");
			a40 = claim_element(p35_nodes, "A", { href: true, rel: true });
			var a40_nodes = children(a40);
			t220 = claim_text(a40_nodes, "AST explorer");
			a40_nodes.forEach(detach);
			t221 = claim_text(p35_nodes, ", the name of the ");
			code29 = claim_element(p35_nodes, "CODE", {});
			var code29_nodes = children(code29);
			t222 = claim_text(code29_nodes, "Identifier");
			code29_nodes.forEach(detach);
			t223 = claim_text(p35_nodes, " is stored in the property called ");
			code30 = claim_element(p35_nodes, "CODE", {});
			var code30_nodes = children(code30);
			t224 = claim_text(code30_nodes, "name");
			code30_nodes.forEach(detach);
			t225 = claim_text(p35_nodes, ", so what we will do is to reverse the ");
			code31 = claim_element(p35_nodes, "CODE", {});
			var code31_nodes = children(code31);
			t226 = claim_text(code31_nodes, "name");
			code31_nodes.forEach(detach);
			t227 = claim_text(p35_nodes, ".");
			p35_nodes.forEach(detach);
			t228 = claim_space(section8_nodes);
			pre8 = claim_element(section8_nodes, "PRE", { class: true });
			var pre8_nodes = children(pre8);
			pre8_nodes.forEach(detach);
			t229 = claim_space(section8_nodes);
			p36 = claim_element(section8_nodes, "P", {});
			var p36_nodes = children(p36);
			t230 = claim_text(p36_nodes, "Run it and you will see:");
			p36_nodes.forEach(detach);
			t231 = claim_space(section8_nodes);
			pre9 = claim_element(section8_nodes, "PRE", { class: true });
			var pre9_nodes = children(pre9);
			pre9_nodes.forEach(detach);
			t232 = claim_space(section8_nodes);
			p37 = claim_element(section8_nodes, "P", {});
			var p37_nodes = children(p37);
			t233 = claim_text(p37_nodes, "We are almost there, except we've accidentally reversed ");
			code32 = claim_element(p37_nodes, "CODE", {});
			var code32_nodes = children(code32);
			t234 = claim_text(code32_nodes, "console.log");
			code32_nodes.forEach(detach);
			t235 = claim_text(p37_nodes, " as well. How can we prevent that?");
			p37_nodes.forEach(detach);
			t236 = claim_space(section8_nodes);
			p38 = claim_element(section8_nodes, "P", {});
			var p38_nodes = children(p38);
			t237 = claim_text(p38_nodes, "Take a look at the AST again:");
			p38_nodes.forEach(detach);
			t238 = claim_space(section8_nodes);
			p39 = claim_element(section8_nodes, "P", {});
			var p39_nodes = children(p39);
			img2 = claim_element(p39_nodes, "IMG", { src: true, alt: true });
			p39_nodes.forEach(detach);
			t239 = claim_space(section8_nodes);
			p40 = claim_element(section8_nodes, "P", {});
			var p40_nodes = children(p40);
			code33 = claim_element(p40_nodes, "CODE", {});
			var code33_nodes = children(code33);
			t240 = claim_text(code33_nodes, "console.log");
			code33_nodes.forEach(detach);
			t241 = claim_text(p40_nodes, " is part of the ");
			code34 = claim_element(p40_nodes, "CODE", {});
			var code34_nodes = children(code34);
			t242 = claim_text(code34_nodes, "MemberExpression");
			code34_nodes.forEach(detach);
			t243 = claim_text(p40_nodes, ", with the ");
			code35 = claim_element(p40_nodes, "CODE", {});
			var code35_nodes = children(code35);
			t244 = claim_text(code35_nodes, "object");
			code35_nodes.forEach(detach);
			t245 = claim_text(p40_nodes, " as ");
			code36 = claim_element(p40_nodes, "CODE", {});
			var code36_nodes = children(code36);
			t246 = claim_text(code36_nodes, "\"console\"");
			code36_nodes.forEach(detach);
			t247 = claim_text(p40_nodes, " and ");
			code37 = claim_element(p40_nodes, "CODE", {});
			var code37_nodes = children(code37);
			t248 = claim_text(code37_nodes, "property");
			code37_nodes.forEach(detach);
			t249 = claim_text(p40_nodes, " as ");
			code38 = claim_element(p40_nodes, "CODE", {});
			var code38_nodes = children(code38);
			t250 = claim_text(code38_nodes, "\"log\"");
			code38_nodes.forEach(detach);
			t251 = claim_text(p40_nodes, ".");
			p40_nodes.forEach(detach);
			t252 = claim_space(section8_nodes);
			p41 = claim_element(section8_nodes, "P", {});
			var p41_nodes = children(p41);
			t253 = claim_text(p41_nodes, "So let's check that if our current ");
			code39 = claim_element(p41_nodes, "CODE", {});
			var code39_nodes = children(code39);
			t254 = claim_text(code39_nodes, "Identifier");
			code39_nodes.forEach(detach);
			t255 = claim_text(p41_nodes, " is within this ");
			code40 = claim_element(p41_nodes, "CODE", {});
			var code40_nodes = children(code40);
			t256 = claim_text(code40_nodes, "MemberExpression");
			code40_nodes.forEach(detach);
			t257 = claim_text(p41_nodes, " and we will not reverse the name:");
			p41_nodes.forEach(detach);
			t258 = claim_space(section8_nodes);
			pre10 = claim_element(section8_nodes, "PRE", { class: true });
			var pre10_nodes = children(pre10);
			pre10_nodes.forEach(detach);
			t259 = claim_space(section8_nodes);
			p42 = claim_element(section8_nodes, "P", {});
			var p42_nodes = children(p42);
			t260 = claim_text(p42_nodes, "And yes, now you get it right!");
			p42_nodes.forEach(detach);
			t261 = claim_space(section8_nodes);
			pre11 = claim_element(section8_nodes, "PRE", { class: true });
			var pre11_nodes = children(pre11);
			pre11_nodes.forEach(detach);
			t262 = claim_space(section8_nodes);
			p43 = claim_element(section8_nodes, "P", {});
			var p43_nodes = children(p43);
			t263 = claim_text(p43_nodes, "So, why do we have to check whether the ");
			code41 = claim_element(p43_nodes, "CODE", {});
			var code41_nodes = children(code41);
			t264 = claim_text(code41_nodes, "Identifier");
			code41_nodes.forEach(detach);
			t265 = claim_text(p43_nodes, "'s parent is not a ");
			code42 = claim_element(p43_nodes, "CODE", {});
			var code42_nodes = children(code42);
			t266 = claim_text(code42_nodes, "console.log");
			code42_nodes.forEach(detach);
			t267 = claim_space(p43_nodes);
			code43 = claim_element(p43_nodes, "CODE", {});
			var code43_nodes = children(code43);
			t268 = claim_text(code43_nodes, "MemberExpression");
			code43_nodes.forEach(detach);
			t269 = claim_text(p43_nodes, "? Why don't we just compare whether the current ");
			code44 = claim_element(p43_nodes, "CODE", {});
			var code44_nodes = children(code44);
			t270 = claim_text(code44_nodes, "Identifier.name === 'console' || Identifier.name === 'log'");
			code44_nodes.forEach(detach);
			t271 = claim_text(p43_nodes, "?");
			p43_nodes.forEach(detach);
			t272 = claim_space(section8_nodes);
			p44 = claim_element(section8_nodes, "P", {});
			var p44_nodes = children(p44);
			t273 = claim_text(p44_nodes, "You can do that, except that it will not reverse the variable name if it is named ");
			code45 = claim_element(p44_nodes, "CODE", {});
			var code45_nodes = children(code45);
			t274 = claim_text(code45_nodes, "console");
			code45_nodes.forEach(detach);
			t275 = claim_text(p44_nodes, " or ");
			code46 = claim_element(p44_nodes, "CODE", {});
			var code46_nodes = children(code46);
			t276 = claim_text(code46_nodes, "log");
			code46_nodes.forEach(detach);
			t277 = claim_text(p44_nodes, ":");
			p44_nodes.forEach(detach);
			t278 = claim_space(section8_nodes);
			pre12 = claim_element(section8_nodes, "PRE", { class: true });
			var pre12_nodes = children(pre12);
			pre12_nodes.forEach(detach);
			t279 = claim_space(section8_nodes);
			blockquote3 = claim_element(section8_nodes, "BLOCKQUOTE", {});
			var blockquote3_nodes = children(blockquote3);
			p45 = claim_element(blockquote3_nodes, "P", {});
			var p45_nodes = children(p45);
			t280 = claim_text(p45_nodes, "So, how do I know the method ");
			code47 = claim_element(p45_nodes, "CODE", {});
			var code47_nodes = children(code47);
			t281 = claim_text(code47_nodes, "isMemberExpression");
			code47_nodes.forEach(detach);
			t282 = claim_text(p45_nodes, " and ");
			code48 = claim_element(p45_nodes, "CODE", {});
			var code48_nodes = children(code48);
			t283 = claim_text(code48_nodes, "isIdentifier");
			code48_nodes.forEach(detach);
			t284 = claim_text(p45_nodes, "? Well, all the node types specified in the ");
			a41 = claim_element(p45_nodes, "A", { href: true, rel: true });
			var a41_nodes = children(a41);
			t285 = claim_text(a41_nodes, "@babel/types");
			a41_nodes.forEach(detach);
			t286 = claim_text(p45_nodes, " have the ");
			code49 = claim_element(p45_nodes, "CODE", {});
			var code49_nodes = children(code49);
			t287 = claim_text(code49_nodes, "isXxxx");
			code49_nodes.forEach(detach);
			t288 = claim_text(p45_nodes, " validator function counterpart, eg: ");
			code50 = claim_element(p45_nodes, "CODE", {});
			var code50_nodes = children(code50);
			t289 = claim_text(code50_nodes, "anyTypeAnnotation");
			code50_nodes.forEach(detach);
			t290 = claim_text(p45_nodes, " function will have a ");
			code51 = claim_element(p45_nodes, "CODE", {});
			var code51_nodes = children(code51);
			t291 = claim_text(code51_nodes, "isAnyTypeAnnotation");
			code51_nodes.forEach(detach);
			t292 = claim_text(p45_nodes, " validator. If you want to know the exhaustive list of the validator functions, you can head over ");
			a42 = claim_element(p45_nodes, "A", { href: true, rel: true });
			var a42_nodes = children(a42);
			t293 = claim_text(a42_nodes, "to the actual source code");
			a42_nodes.forEach(detach);
			t294 = claim_text(p45_nodes, ".");
			p45_nodes.forEach(detach);
			blockquote3_nodes.forEach(detach);
			section8_nodes.forEach(detach);
			t295 = claim_space(nodes);
			section9 = claim_element(nodes, "SECTION", {});
			var section9_nodes = children(section9);
			h41 = claim_element(section9_nodes, "H4", {});
			var h41_nodes = children(h41);
			a43 = claim_element(h41_nodes, "A", { href: true, id: true });
			var a43_nodes = children(a43);
			t296 = claim_text(a43_nodes, "Transforming strings");
			a43_nodes.forEach(detach);
			h41_nodes.forEach(detach);
			t297 = claim_space(section9_nodes);
			p46 = claim_element(section9_nodes, "P", {});
			var p46_nodes = children(p46);
			t298 = claim_text(p46_nodes, "The next step is to generate a nested ");
			code52 = claim_element(p46_nodes, "CODE", {});
			var code52_nodes = children(code52);
			t299 = claim_text(code52_nodes, "BinaryExpression");
			code52_nodes.forEach(detach);
			t300 = claim_text(p46_nodes, " out of ");
			code53 = claim_element(p46_nodes, "CODE", {});
			var code53_nodes = children(code53);
			t301 = claim_text(code53_nodes, "StringLiteral");
			code53_nodes.forEach(detach);
			t302 = claim_text(p46_nodes, ".");
			p46_nodes.forEach(detach);
			t303 = claim_space(section9_nodes);
			p47 = claim_element(section9_nodes, "P", {});
			var p47_nodes = children(p47);
			t304 = claim_text(p47_nodes, "To create an AST node, you can use the utility function from ");
			a44 = claim_element(p47_nodes, "A", { href: true, rel: true });
			var a44_nodes = children(a44);
			code54 = claim_element(a44_nodes, "CODE", {});
			var code54_nodes = children(code54);
			t305 = claim_text(code54_nodes, "@babel/types");
			code54_nodes.forEach(detach);
			a44_nodes.forEach(detach);
			t306 = claim_text(p47_nodes, ". ");
			code55 = claim_element(p47_nodes, "CODE", {});
			var code55_nodes = children(code55);
			t307 = claim_text(code55_nodes, "@babel/types");
			code55_nodes.forEach(detach);
			t308 = claim_text(p47_nodes, " is also available via ");
			code56 = claim_element(p47_nodes, "CODE", {});
			var code56_nodes = children(code56);
			t309 = claim_text(code56_nodes, "babel.types");
			code56_nodes.forEach(detach);
			t310 = claim_text(p47_nodes, " from ");
			code57 = claim_element(p47_nodes, "CODE", {});
			var code57_nodes = children(code57);
			t311 = claim_text(code57_nodes, "@babel/core");
			code57_nodes.forEach(detach);
			t312 = claim_text(p47_nodes, ".");
			p47_nodes.forEach(detach);
			t313 = claim_space(section9_nodes);
			pre13 = claim_element(section9_nodes, "PRE", { class: true });
			var pre13_nodes = children(pre13);
			pre13_nodes.forEach(detach);
			t314 = claim_space(section9_nodes);
			p48 = claim_element(section9_nodes, "P", {});
			var p48_nodes = children(p48);
			t315 = claim_text(p48_nodes, "So, we split the content of the ");
			code58 = claim_element(p48_nodes, "CODE", {});
			var code58_nodes = children(code58);
			t316 = claim_text(code58_nodes, "StringLiteral");
			code58_nodes.forEach(detach);
			t317 = claim_text(p48_nodes, ", which is in ");
			code59 = claim_element(p48_nodes, "CODE", {});
			var code59_nodes = children(code59);
			t318 = claim_text(code59_nodes, "path.node.value");
			code59_nodes.forEach(detach);
			t319 = claim_text(p48_nodes, ", make each character a ");
			code60 = claim_element(p48_nodes, "CODE", {});
			var code60_nodes = children(code60);
			t320 = claim_text(code60_nodes, "StringLiteral");
			code60_nodes.forEach(detach);
			t321 = claim_text(p48_nodes, ", and combine them with ");
			code61 = claim_element(p48_nodes, "CODE", {});
			var code61_nodes = children(code61);
			t322 = claim_text(code61_nodes, "BinaryExpression");
			code61_nodes.forEach(detach);
			t323 = claim_text(p48_nodes, ". Finally, we replace the ");
			code62 = claim_element(p48_nodes, "CODE", {});
			var code62_nodes = children(code62);
			t324 = claim_text(code62_nodes, "StringLiteral");
			code62_nodes.forEach(detach);
			t325 = claim_text(p48_nodes, " with the newly created node.");
			p48_nodes.forEach(detach);
			t326 = claim_space(section9_nodes);
			p49 = claim_element(section9_nodes, "P", {});
			var p49_nodes = children(p49);
			t327 = claim_text(p49_nodes, "...And that's it! Except, we ran into Stack Overflow 😅:");
			p49_nodes.forEach(detach);
			t328 = claim_space(section9_nodes);
			pre14 = claim_element(section9_nodes, "PRE", { class: true });
			var pre14_nodes = children(pre14);
			pre14_nodes.forEach(detach);
			t329 = claim_space(section9_nodes);
			p50 = claim_element(section9_nodes, "P", {});
			var p50_nodes = children(p50);
			t330 = claim_text(p50_nodes, "Why 🤷‍ ?");
			p50_nodes.forEach(detach);
			t331 = claim_space(section9_nodes);
			p51 = claim_element(section9_nodes, "P", {});
			var p51_nodes = children(p51);
			t332 = claim_text(p51_nodes, "Well, that's because for each ");
			code63 = claim_element(p51_nodes, "CODE", {});
			var code63_nodes = children(code63);
			t333 = claim_text(code63_nodes, "StringLiteral");
			code63_nodes.forEach(detach);
			t334 = claim_text(p51_nodes, " we created more ");
			code64 = claim_element(p51_nodes, "CODE", {});
			var code64_nodes = children(code64);
			t335 = claim_text(code64_nodes, "StringLiteral");
			code64_nodes.forEach(detach);
			t336 = claim_text(p51_nodes, ", and in each of those ");
			code65 = claim_element(p51_nodes, "CODE", {});
			var code65_nodes = children(code65);
			t337 = claim_text(code65_nodes, "StringLiteral");
			code65_nodes.forEach(detach);
			t338 = claim_text(p51_nodes, ", we are \"creating\" more ");
			code66 = claim_element(p51_nodes, "CODE", {});
			var code66_nodes = children(code66);
			t339 = claim_text(code66_nodes, "StringLiteral");
			code66_nodes.forEach(detach);
			t340 = claim_text(p51_nodes, ". Although we will replace a ");
			code67 = claim_element(p51_nodes, "CODE", {});
			var code67_nodes = children(code67);
			t341 = claim_text(code67_nodes, "StringLiteral");
			code67_nodes.forEach(detach);
			t342 = claim_text(p51_nodes, " with another ");
			code68 = claim_element(p51_nodes, "CODE", {});
			var code68_nodes = children(code68);
			t343 = claim_text(code68_nodes, "StringLiteral");
			code68_nodes.forEach(detach);
			t344 = claim_text(p51_nodes, ", babel will treat it as a new node and will visit the newly created ");
			code69 = claim_element(p51_nodes, "CODE", {});
			var code69_nodes = children(code69);
			t345 = claim_text(code69_nodes, "StringLiteral");
			code69_nodes.forEach(detach);
			t346 = claim_text(p51_nodes, ", thus the infinite recursive and stack overflow.");
			p51_nodes.forEach(detach);
			t347 = claim_space(section9_nodes);
			p52 = claim_element(section9_nodes, "P", {});
			var p52_nodes = children(p52);
			t348 = claim_text(p52_nodes, "So, how do we tell babel that once we replaced the ");
			code70 = claim_element(p52_nodes, "CODE", {});
			var code70_nodes = children(code70);
			t349 = claim_text(code70_nodes, "StringLiteral");
			code70_nodes.forEach(detach);
			t350 = claim_text(p52_nodes, " with the ");
			code71 = claim_element(p52_nodes, "CODE", {});
			var code71_nodes = children(code71);
			t351 = claim_text(code71_nodes, "newNode");
			code71_nodes.forEach(detach);
			t352 = claim_text(p52_nodes, ", babel can stop and don't have to go down and visit the newly created node anymore?");
			p52_nodes.forEach(detach);
			t353 = claim_space(section9_nodes);
			p53 = claim_element(section9_nodes, "P", {});
			var p53_nodes = children(p53);
			t354 = claim_text(p53_nodes, "We can use ");
			code72 = claim_element(p53_nodes, "CODE", {});
			var code72_nodes = children(code72);
			t355 = claim_text(code72_nodes, "path.skip()");
			code72_nodes.forEach(detach);
			t356 = claim_text(p53_nodes, " to skip traversing the children of the current path:");
			p53_nodes.forEach(detach);
			t357 = claim_space(section9_nodes);
			pre15 = claim_element(section9_nodes, "PRE", { class: true });
			var pre15_nodes = children(pre15);
			pre15_nodes.forEach(detach);
			t358 = claim_space(section9_nodes);
			p54 = claim_element(section9_nodes, "P", {});
			var p54_nodes = children(p54);
			t359 = claim_text(p54_nodes, "...And yes it works now with now stack overflow!");
			p54_nodes.forEach(detach);
			section9_nodes.forEach(detach);
			t360 = claim_space(nodes);
			section10 = claim_element(nodes, "SECTION", {});
			var section10_nodes = children(section10);
			h22 = claim_element(section10_nodes, "H2", {});
			var h22_nodes = children(h22);
			a45 = claim_element(h22_nodes, "A", { href: true, id: true });
			var a45_nodes = children(a45);
			t361 = claim_text(a45_nodes, "Summary");
			a45_nodes.forEach(detach);
			h22_nodes.forEach(detach);
			t362 = claim_space(section10_nodes);
			p55 = claim_element(section10_nodes, "P", {});
			var p55_nodes = children(p55);
			t363 = claim_text(p55_nodes, "So, here we have it, our first code transformation with babel:");
			p55_nodes.forEach(detach);
			t364 = claim_space(section10_nodes);
			pre16 = claim_element(section10_nodes, "PRE", { class: true });
			var pre16_nodes = children(pre16);
			pre16_nodes.forEach(detach);
			t365 = claim_space(section10_nodes);
			p56 = claim_element(section10_nodes, "P", {});
			var p56_nodes = children(p56);
			t366 = claim_text(p56_nodes, "A summary of the steps on how we get here:");
			p56_nodes.forEach(detach);
			t367 = claim_space(section10_nodes);
			ol = claim_element(section10_nodes, "OL", {});
			var ol_nodes = children(ol);
			li19 = claim_element(ol_nodes, "LI", {});
			var li19_nodes = children(li19);
			t368 = claim_text(li19_nodes, "Have in mind what you want to transform from and transform into");
			li19_nodes.forEach(detach);
			t369 = claim_space(ol_nodes);
			li20 = claim_element(ol_nodes, "LI", {});
			var li20_nodes = children(li20);
			t370 = claim_text(li20_nodes, "Know what to target on the AST");
			li20_nodes.forEach(detach);
			t371 = claim_space(ol_nodes);
			li21 = claim_element(ol_nodes, "LI", {});
			var li21_nodes = children(li21);
			t372 = claim_text(li21_nodes, "Know how the transformed AST looks like");
			li21_nodes.forEach(detach);
			t373 = claim_space(ol_nodes);
			li22 = claim_element(ol_nodes, "LI", {});
			var li22_nodes = children(li22);
			t374 = claim_text(li22_nodes, "Write code");
			li22_nodes.forEach(detach);
			ol_nodes.forEach(detach);
			section10_nodes.forEach(detach);
			t375 = claim_space(nodes);
			section11 = claim_element(nodes, "SECTION", {});
			var section11_nodes = children(section11);
			h23 = claim_element(section11_nodes, "H2", {});
			var h23_nodes = children(h23);
			a46 = claim_element(h23_nodes, "A", { href: true, id: true });
			var a46_nodes = children(a46);
			t376 = claim_text(a46_nodes, "Further resources");
			a46_nodes.forEach(detach);
			h23_nodes.forEach(detach);
			t377 = claim_space(section11_nodes);
			p57 = claim_element(section11_nodes, "P", {});
			var p57_nodes = children(p57);
			t378 = claim_text(p57_nodes, "If you are interested to learn more, ");
			a47 = claim_element(p57_nodes, "A", { href: true, rel: true });
			var a47_nodes = children(a47);
			t379 = claim_text(a47_nodes, "babel's Github repo");
			a47_nodes.forEach(detach);
			t380 = claim_text(p57_nodes, " is always the best place to find out more code examples of writing a babel transformation.");
			p57_nodes.forEach(detach);
			t381 = claim_space(section11_nodes);
			p58 = claim_element(section11_nodes, "P", {});
			var p58_nodes = children(p58);
			t382 = claim_text(p58_nodes, "Head down to ");
			a48 = claim_element(p58_nodes, "A", { href: true, rel: true });
			var a48_nodes = children(a48);
			t383 = claim_text(a48_nodes, "https://github.com/babel/babel");
			a48_nodes.forEach(detach);
			t384 = claim_text(p58_nodes, ", and look for ");
			code73 = claim_element(p58_nodes, "CODE", {});
			var code73_nodes = children(code73);
			t385 = claim_text(code73_nodes, "babel-plugin-transform-*");
			code73_nodes.forEach(detach);
			t386 = claim_text(p58_nodes, " or ");
			code74 = claim_element(p58_nodes, "CODE", {});
			var code74_nodes = children(code74);
			t387 = claim_text(code74_nodes, "babel-plugin-proposal-*");
			code74_nodes.forEach(detach);
			t388 = claim_text(p58_nodes, " folders, they are all babel transformation plugin, where you can find code on how babel ");
			a49 = claim_element(p58_nodes, "A", { href: true, rel: true });
			var a49_nodes = children(a49);
			t389 = claim_text(a49_nodes, "transform the nullish coalescing operator");
			a49_nodes.forEach(detach);
			t390 = claim_text(p58_nodes, ", ");
			a50 = claim_element(p58_nodes, "A", { href: true, rel: true });
			var a50_nodes = children(a50);
			t391 = claim_text(a50_nodes, "optional chaining");
			a50_nodes.forEach(detach);
			t392 = claim_text(p58_nodes, " and many more.");
			p58_nodes.forEach(detach);
			section11_nodes.forEach(detach);
			t393 = claim_space(nodes);
			section12 = claim_element(nodes, "SECTION", {});
			var section12_nodes = children(section12);
			h24 = claim_element(section12_nodes, "H2", {});
			var h24_nodes = children(h24);
			a51 = claim_element(h24_nodes, "A", { href: true, id: true });
			var a51_nodes = children(a51);
			t394 = claim_text(a51_nodes, "Reference");
			a51_nodes.forEach(detach);
			h24_nodes.forEach(detach);
			t395 = claim_space(section12_nodes);
			ul7 = claim_element(section12_nodes, "UL", {});
			var ul7_nodes = children(ul7);
			li23 = claim_element(ul7_nodes, "LI", {});
			var li23_nodes = children(li23);
			a52 = claim_element(li23_nodes, "A", { href: true, rel: true });
			var a52_nodes = children(a52);
			t396 = claim_text(a52_nodes, "Babel docs");
			a52_nodes.forEach(detach);
			t397 = claim_text(li23_nodes, " & ");
			a53 = claim_element(li23_nodes, "A", { href: true, rel: true });
			var a53_nodes = children(a53);
			t398 = claim_text(a53_nodes, "Github repo");
			a53_nodes.forEach(detach);
			li23_nodes.forEach(detach);
			t399 = claim_space(ul7_nodes);
			li24 = claim_element(ul7_nodes, "LI", {});
			var li24_nodes = children(li24);
			a54 = claim_element(li24_nodes, "A", { href: true, rel: true });
			var a54_nodes = children(a54);
			t400 = claim_text(a54_nodes, "Babel Handbook");
			a54_nodes.forEach(detach);
			t401 = claim_text(li24_nodes, " by ");
			a55 = claim_element(li24_nodes, "A", { href: true, rel: true });
			var a55_nodes = children(a55);
			t402 = claim_text(a55_nodes, "Jamie Kyle");
			a55_nodes.forEach(detach);
			li24_nodes.forEach(detach);
			t403 = claim_space(ul7_nodes);
			li25 = claim_element(ul7_nodes, "LI", {});
			var li25_nodes = children(li25);
			a56 = claim_element(li25_nodes, "A", { href: true, rel: true });
			var a56_nodes = children(a56);
			t404 = claim_text(a56_nodes, "Leveling Up One’s Parsing Game With ASTs");
			a56_nodes.forEach(detach);
			t405 = claim_text(li25_nodes, " by ");
			a57 = claim_element(li25_nodes, "A", { href: true, rel: true });
			var a57_nodes = children(a57);
			t406 = claim_text(a57_nodes, "Vaidehi Joshi");
			a57_nodes.forEach(detach);
			li25_nodes.forEach(detach);
			ul7_nodes.forEach(detach);
			section12_nodes.forEach(detach);
			this.h();
		},
		h() {
			attr(a0, "href", "#what-is-babel");
			attr(a1, "href", "#what-is-abstract-syntax-tree-ast");
			attr(a2, "href", "#how-to-use-babel-to-transform-code");
			attr(a3, "href", "#have-in-mind-what-you-want-to-transform-from-and-transform-into");
			attr(a4, "href", "#know-what-to-target-on-the-ast");
			attr(a5, "href", "#know-how-the-transformed-ast-looks-like");
			attr(a6, "href", "#write-code");
			attr(a7, "href", "#transforming-variable-name");
			attr(a8, "href", "#transforming-strings");
			attr(a9, "href", "#summary");
			attr(a10, "href", "#further-resources");
			attr(a11, "href", "#reference");
			attr(ul3, "class", "sitemap");
			attr(ul3, "id", "sitemap");
			attr(ul3, "role", "navigation");
			attr(ul3, "aria-label", "Table of Contents");
			attr(a12, "href", "https://babeljs.io/docs/en/babel-core");
			attr(a12, "rel", "nofollow");
			attr(a13, "href", "#what-is-babel");
			attr(a13, "id", "what-is-babel");
			attr(a14, "href", "https://babeljs.io/docs/en/");
			attr(a14, "rel", "nofollow");
			attr(a15, "href", "https://babeljs.io/docs/en/plugins");
			attr(a15, "rel", "nofollow");
			attr(a16, "href", "https://en.wikipedia.org/wiki/Abstract_syntax_tree");
			attr(a16, "rel", "nofollow");
			attr(a17, "href", "#what-is-abstract-syntax-tree-ast");
			attr(a17, "id", "what-is-abstract-syntax-tree-ast");
			attr(a18, "href", "https://medium.com/basecs/leveling-up-ones-parsing-game-with-asts-d7a6fc2400ff");
			attr(a18, "rel", "nofollow");
			attr(a19, "href", "https://twitter.com/vaidehijoshi");
			attr(a19, "rel", "nofollow");
			attr(a20, "href", "https://en.wikipedia.org/wiki/Abstract_syntax_tree");
			attr(a20, "rel", "nofollow");
			attr(a21, "href", "https://blog.bitsrc.io/what-is-an-abstract-syntax-tree-7502b71bde27");
			attr(a21, "rel", "nofollow");
			attr(a22, "href", "https://twitter.com/ngArchangel");
			attr(a22, "rel", "nofollow");
			attr(a23, "href", "https://github.com/estree/estree");
			attr(a23, "rel", "nofollow");
			attr(a24, "href", "https://babeljs.io");
			attr(a24, "rel", "nofollow");
			attr(a25, "href", "#how-to-use-babel-to-transform-code");
			attr(a25, "id", "how-to-use-babel-to-transform-code");
			attr(pre0, "class", "language-js");
			attr(a26, "href", "https://www.npmjs.com/package/@babel/core");
			attr(a26, "rel", "nofollow");
			attr(pre1, "class", "language-null");
			attr(pre2, "class", "language-js");
			attr(a27, "href", "https://babeljs.io/docs/en/plugins");
			attr(a27, "rel", "nofollow");
			attr(a28, "href", "https://medium.com/@bretcameron/how-to-publish-your-first-npm-package-b224296fc57b");
			attr(a28, "rel", "nofollow");
			attr(a29, "href", "#have-in-mind-what-you-want-to-transform-from-and-transform-into");
			attr(a29, "id", "have-in-mind-what-you-want-to-transform-from-and-transform-into");
			attr(pre3, "class", "language-js");
			attr(pre4, "class", "language-js");
			attr(a30, "href", "#know-what-to-target-on-the-ast");
			attr(a30, "id", "know-what-to-target-on-the-ast");
			attr(a31, "href", "https://lihautan.com/babel-ast-explorer/#?eyJiYWJlbFNldHRpbmdzIjp7InZlcnNpb24iOiI3LjQuNSJ9LCJ0cmVlU2V0dGluZ3MiOnsiaGlkZUVtcHR5Ijp0cnVlLCJoaWRlTG9jYXRpb24iOnRydWUsImhpZGVUeXBlIjp0cnVlfSwiY29kZSI6ImZ1bmN0aW9uIGdyZWV0KG5hbWUpIHtcbiAgcmV0dXJuICdIZWxsbyAnICsgbmFtZTtcbn1cblxuY29uc29sZS5sb2coZ3JlZXQoJ3RhbmhhdWhhdScpKTsgLy8gSGVsbG8gdGFuaGF1aGF1In0=");
			attr(a31, "rel", "nofollow");
			if (img0.src !== (img0_src_value = __build_img__0)) attr(img0, "src", img0_src_value);
			attr(img0, "alt", "targeting");
			attr(img0, "title", "Selecting the code on the left and see the corresponding part of the AST light up on the right");
			attr(a32, "href", "#know-how-the-transformed-ast-looks-like");
			attr(a32, "id", "know-how-the-transformed-ast-looks-like");
			attr(a33, "href", "https://lihautan.com/babel-ast-explorer/#?eyJiYWJlbFNldHRpbmdzIjp7InZlcnNpb24iOiI3LjQuNSJ9LCJ0cmVlU2V0dGluZ3MiOnsiaGlkZUVtcHR5Ijp0cnVlLCJoaWRlTG9jYXRpb24iOnRydWUsImhpZGVUeXBlIjp0cnVlLCJoaWRlQ29tbWVudHMiOnRydWV9LCJjb2RlIjoiZnVuY3Rpb24gdGVlcmcoZW1hbikge1xuICByZXR1cm4gXCJIXCIgKyBcImVcIiArIFwibFwiICsgXCJsXCIgKyBcIm9cIiArIFwiIFwiICsgZW1hbjtcbn1cblxuY29uc29sZS5sb2codGVlcmcoXCJ0XCIgKyBcImFcIiArIFwiblwiICsgXCJoXCIgKyBcImFcIiArIFwidVwiICsgXCJoXCIgKyBcImFcIiArIFwidVwiKSk7IC8vIEhlbGxvIHRhbmhhdWhhdVxuIn0=");
			attr(a33, "rel", "nofollow");
			if (img1.src !== (img1_src_value = __build_img__1)) attr(img1, "src", img1_src_value);
			attr(img1, "alt", "output");
			attr(img1, "title", "You can see that what used to be a `StringLiteral` is now a nested `BinaryExpression`");
			attr(a34, "href", "#write-code");
			attr(a34, "id", "write-code");
			attr(pre5, "class", "language-js");
			attr(a35, "href", "https://en.wikipedia.org/wiki/Visitor_pattern");
			attr(a35, "rel", "nofollow");
			attr(a36, "href", "https://en.wikipedia.org/wiki/Depth-first_search");
			attr(a36, "rel", "nofollow");
			attr(pre6, "class", "language-js");
			attr(pre7, "class", "language-null");
			attr(a37, "href", "https://jamie.build");
			attr(a37, "rel", "nofollow");
			attr(a38, "href", "https://github.com/jamiebuilds/babel-handbook/blob/master/translations/en/plugin-handbook.md#paths");
			attr(a38, "rel", "nofollow");
			attr(a39, "href", "#transforming-variable-name");
			attr(a39, "id", "transforming-variable-name");
			attr(a40, "href", "https://lihautan.com/babel-ast-explorer/#?eyJiYWJlbFNldHRpbmdzIjp7InZlcnNpb24iOiI3LjQuNSJ9LCJ0cmVlU2V0dGluZ3MiOnsiaGlkZUVtcHR5Ijp0cnVlLCJoaWRlTG9jYXRpb24iOnRydWUsImhpZGVUeXBlIjp0cnVlfSwiY29kZSI6ImZ1bmN0aW9uIGdyZWV0KG5hbWUpIHtcbiAgcmV0dXJuICdIZWxsbyAnICsgbmFtZTtcbn1cblxuY29uc29sZS5sb2coZ3JlZXQoJ3RhbmhhdWhhdScpKTsgLy8gSGVsbG8gdGFuaGF1aGF1In0=");
			attr(a40, "rel", "nofollow");
			attr(pre8, "class", "language-js");
			attr(pre9, "class", "language-js");
			if (img2.src !== (img2_src_value = __build_img__2)) attr(img2, "src", img2_src_value);
			attr(img2, "alt", "member expression");
			attr(pre10, "class", "language-js");
			attr(pre11, "class", "language-js");
			attr(pre12, "class", "language-js");
			attr(a41, "href", "https://babeljs.io/docs/en/babel-types");
			attr(a41, "rel", "nofollow");
			attr(a42, "href", "https://github.com/babel/babel/blob/master/packages/babel-types/src/validators/generated/index.js");
			attr(a42, "rel", "nofollow");
			attr(a43, "href", "#transforming-strings");
			attr(a43, "id", "transforming-strings");
			attr(a44, "href", "https://babeljs.io/docs/en/babel-types");
			attr(a44, "rel", "nofollow");
			attr(pre13, "class", "language-js");
			attr(pre14, "class", "language-null");
			attr(pre15, "class", "language-js");
			attr(a45, "href", "#summary");
			attr(a45, "id", "summary");
			attr(pre16, "class", "language-js");
			attr(a46, "href", "#further-resources");
			attr(a46, "id", "further-resources");
			attr(a47, "href", "https://github.com/babel/babel/tree/master/packages");
			attr(a47, "rel", "nofollow");
			attr(a48, "href", "https://github.com/babel/babel/tree/master/packages");
			attr(a48, "rel", "nofollow");
			attr(a49, "href", "https://github.com/babel/babel/tree/master/packages/babel-plugin-proposal-nullish-coalescing-operator");
			attr(a49, "rel", "nofollow");
			attr(a50, "href", "https://github.com/babel/babel/tree/master/packages/babel-plugin-proposal-optional-chaining");
			attr(a50, "rel", "nofollow");
			attr(a51, "href", "#reference");
			attr(a51, "id", "reference");
			attr(a52, "href", "https://babeljs.io/docs/en/");
			attr(a52, "rel", "nofollow");
			attr(a53, "href", "https://github.com/babel/babel");
			attr(a53, "rel", "nofollow");
			attr(a54, "href", "https://github.com/jamiebuilds/babel-handbook");
			attr(a54, "rel", "nofollow");
			attr(a55, "href", "https://jamie.build/");
			attr(a55, "rel", "nofollow");
			attr(a56, "href", "https://medium.com/basecs/leveling-up-ones-parsing-game-with-asts-d7a6fc2400ff");
			attr(a56, "rel", "nofollow");
			attr(a57, "href", "https://twitter.com/vaidehijoshi");
			attr(a57, "rel", "nofollow");
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
			append(ul3, li2);
			append(li2, a2);
			append(a2, t2);
			append(ul3, ul2);
			append(ul2, li3);
			append(li3, a3);
			append(a3, t3);
			append(ul2, li4);
			append(li4, a4);
			append(a4, t4);
			append(ul2, li5);
			append(li5, a5);
			append(a5, t5);
			append(ul2, li6);
			append(li6, a6);
			append(a6, t6);
			append(ul2, ul1);
			append(ul1, li7);
			append(li7, a7);
			append(a7, t7);
			append(ul1, li8);
			append(li8, a8);
			append(a8, t8);
			append(ul3, li9);
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
			append(p0, a12);
			append(a12, t14);
			append(p0, t15);
			insert(target, t16, anchor);
			insert(target, section1, anchor);
			append(section1, h20);
			append(h20, a13);
			append(a13, t17);
			append(section1, t18);
			append(section1, p1);
			append(p1, a14);
			append(a14, t19);
			append(p1, t20);
			append(p1, a15);
			append(a15, t21);
			append(p1, t22);
			append(section1, t23);
			append(section1, p2);
			append(p2, t24);
			append(p2, a16);
			append(a16, t25);
			append(p2, t26);
			insert(target, t27, anchor);
			insert(target, section2, anchor);
			append(section2, h30);
			append(h30, a17);
			append(a17, t28);
			append(section2, t29);
			append(section2, p3);
			append(p3, t30);
			append(section2, t31);
			append(section2, ul4);
			append(ul4, li12);
			append(li12, a18);
			append(a18, t32);
			append(li12, t33);
			append(li12, a19);
			append(a19, t34);
			append(li12, t35);
			append(li12, em0);
			append(em0, t36);
			append(ul4, t37);
			append(ul4, li13);
			append(li13, t38);
			append(li13, a20);
			append(a20, t39);
			append(ul4, t40);
			append(ul4, li14);
			append(li14, a21);
			append(a21, t41);
			append(li14, t42);
			append(li14, a22);
			append(a22, t43);
			append(section2, t44);
			append(section2, p4);
			append(p4, t45);
			append(p4, a23);
			append(a23, t46);
			append(p4, t47);
			append(section2, t48);
			append(section2, p5);
			append(p5, t49);
			append(p5, a24);
			append(a24, t50);
			append(p5, t51);
			append(section2, t52);
			append(section2, p6);
			append(p6, t53);
			insert(target, t54, anchor);
			insert(target, section3, anchor);
			append(section3, h21);
			append(h21, a25);
			append(a25, t55);
			append(section3, t56);
			append(section3, p7);
			append(p7, t57);
			append(section3, t58);
			append(section3, pre0);
			pre0.innerHTML = raw0_value;
			append(section3, t59);
			append(section3, blockquote0);
			append(blockquote0, p8);
			append(p8, t60);
			append(p8, a26);
			append(a26, t61);
			append(p8, t62);
			append(p8, code0);
			append(code0, t63);
			append(p8, t64);
			append(p8, code1);
			append(code1, t65);
			append(p8, t66);
			append(p8, code2);
			append(code2, t67);
			append(p8, t68);
			append(p8, code3);
			append(code3, t69);
			append(p8, t70);
			append(p8, code4);
			append(code4, t71);
			append(p8, t72);
			append(section3, t73);
			append(section3, p9);
			append(p9, t74);
			append(section3, t75);
			append(section3, pre1);
			pre1.innerHTML = raw1_value;
			append(section3, t76);
			append(section3, p10);
			append(p10, t77);
			append(p10, code5);
			append(code5, t78);
			append(p10, t79);
			append(section3, t80);
			append(section3, pre2);
			pre2.innerHTML = raw2_value;
			append(section3, t81);
			append(section3, p11);
			append(p11, t82);
			append(p11, a27);
			append(a27, t83);
			append(p11, t84);
			append(p11, code6);
			append(code6, t85);
			append(p11, t86);
			append(p11, code7);
			append(code7, t87);
			append(p11, t88);
			append(section3, t89);
			append(section3, blockquote1);
			append(blockquote1, p12);
			append(p12, t90);
			append(p12, code8);
			append(code8, t91);
			append(p12, t92);
			append(p12, a28);
			append(a28, t93);
			append(p12, t94);
			append(section3, t95);
			append(section3, p13);
			append(p13, t96);
			append(p13, em1);
			append(em1, t97);
			append(p13, t98);
			append(section3, t99);
			append(section3, p14);
			append(p14, t100);
			insert(target, t101, anchor);
			insert(target, section4, anchor);
			append(section4, h31);
			append(h31, a29);
			append(a29, t102);
			append(section4, t103);
			append(section4, p15);
			append(p15, t104);
			append(section4, t105);
			append(section4, ul5);
			append(ul5, li15);
			append(li15, t106);
			append(ul5, t107);
			append(ul5, li16);
			append(li16, t108);
			append(section4, t109);
			append(section4, pre3);
			pre3.innerHTML = raw3_value;
			append(section4, t110);
			append(section4, p16);
			append(p16, t111);
			append(section4, t112);
			append(section4, pre4);
			pre4.innerHTML = raw4_value;
			append(section4, t113);
			append(section4, p17);
			append(p17, t114);
			append(p17, code9);
			append(code9, t115);
			append(p17, t116);
			append(p17, em2);
			append(em2, t117);
			insert(target, t118, anchor);
			insert(target, section5, anchor);
			append(section5, h32);
			append(h32, a30);
			append(a30, t119);
			append(section5, t120);
			append(section5, p18);
			append(p18, t121);
			append(p18, a31);
			append(a31, t122);
			append(p18, t123);
			append(section5, t124);
			append(section5, p19);
			append(p19, img0);
			append(section5, t125);
			append(section5, p20);
			append(p20, t126);
			append(section5, t127);
			append(section5, p21);
			append(p21, t128);
			append(section5, t129);
			append(section5, ul6);
			append(ul6, li17);
			append(li17, strong0);
			append(strong0, t130);
			append(li17, t131);
			append(ul6, t132);
			append(ul6, li18);
			append(li18, strong1);
			append(strong1, t133);
			append(li18, t134);
			insert(target, t135, anchor);
			insert(target, section6, anchor);
			append(section6, h33);
			append(h33, a32);
			append(a32, t136);
			append(section6, t137);
			append(section6, p22);
			append(p22, t138);
			append(p22, a33);
			append(a33, t139);
			append(p22, t140);
			append(section6, t141);
			append(section6, p23);
			append(p23, img1);
			append(section6, t142);
			append(section6, p24);
			append(p24, t143);
			append(section6, t144);
			append(section6, p25);
			append(p25, t145);
			append(p25, code10);
			append(code10, t146);
			append(p25, t147);
			append(p25, code11);
			append(code11, t148);
			append(p25, t149);
			append(p25, code12);
			append(code12, t150);
			append(p25, t151);
			insert(target, t152, anchor);
			insert(target, section7, anchor);
			append(section7, h34);
			append(h34, a34);
			append(a34, t153);
			append(section7, t154);
			append(section7, p26);
			append(p26, t155);
			append(section7, t156);
			append(section7, pre5);
			pre5.innerHTML = raw5_value;
			append(section7, t157);
			append(section7, p27);
			append(p27, t158);
			append(p27, a35);
			append(a35, t159);
			append(p27, t160);
			append(section7, t161);
			append(section7, p28);
			append(p28, t162);
			append(p28, a36);
			append(a36, t163);
			append(p28, t164);
			append(section7, t165);
			append(section7, p29);
			append(p29, t166);
			append(p29, code13);
			append(code13, t167);
			append(p29, t168);
			append(section7, t169);
			append(section7, pre6);
			pre6.innerHTML = raw6_value;
			append(section7, t170);
			append(section7, p30);
			append(p30, t171);
			append(section7, t172);
			append(section7, pre7);
			pre7.innerHTML = raw7_value;
			append(section7, t173);
			append(section7, hr0);
			append(section7, t174);
			append(section7, p31);
			append(p31, t175);
			append(p31, code14);
			append(code14, t176);
			append(p31, t177);
			append(p31, code15);
			append(code15, t178);
			append(p31, t179);
			append(p31, code16);
			append(code16, t180);
			append(p31, t181);
			append(p31, code17);
			append(code17, t182);
			append(p31, t183);
			append(p31, code18);
			append(code18, t184);
			append(p31, t185);
			append(section7, t186);
			append(section7, p32);
			append(p32, t187);
			append(p32, code19);
			append(code19, t188);
			append(p32, t189);
			append(p32, code20);
			append(code20, t190);
			append(p32, t191);
			append(p32, code21);
			append(code21, t192);
			append(p32, t193);
			append(p32, code22);
			append(code22, t194);
			append(p32, t195);
			append(p32, code23);
			append(code23, t196);
			append(p32, t197);
			append(p32, code24);
			append(code24, t198);
			append(p32, t199);
			append(p32, code25);
			append(code25, t200);
			append(p32, t201);
			append(p32, code26);
			append(code26, t202);
			append(p32, t203);
			append(p32, code27);
			append(code27, t204);
			append(p32, t205);
			append(section7, t206);
			append(section7, blockquote2);
			append(blockquote2, p33);
			append(p33, t207);
			append(p33, code28);
			append(code28, t208);
			append(p33, t209);
			append(p33, a37);
			append(a37, t210);
			append(p33, t211);
			append(p33, a38);
			append(a38, t212);
			append(section7, t213);
			append(section7, hr1);
			append(section7, t214);
			append(section7, p34);
			append(p34, t215);
			insert(target, t216, anchor);
			insert(target, section8, anchor);
			append(section8, h40);
			append(h40, a39);
			append(a39, t217);
			append(section8, t218);
			append(section8, p35);
			append(p35, t219);
			append(p35, a40);
			append(a40, t220);
			append(p35, t221);
			append(p35, code29);
			append(code29, t222);
			append(p35, t223);
			append(p35, code30);
			append(code30, t224);
			append(p35, t225);
			append(p35, code31);
			append(code31, t226);
			append(p35, t227);
			append(section8, t228);
			append(section8, pre8);
			pre8.innerHTML = raw8_value;
			append(section8, t229);
			append(section8, p36);
			append(p36, t230);
			append(section8, t231);
			append(section8, pre9);
			pre9.innerHTML = raw9_value;
			append(section8, t232);
			append(section8, p37);
			append(p37, t233);
			append(p37, code32);
			append(code32, t234);
			append(p37, t235);
			append(section8, t236);
			append(section8, p38);
			append(p38, t237);
			append(section8, t238);
			append(section8, p39);
			append(p39, img2);
			append(section8, t239);
			append(section8, p40);
			append(p40, code33);
			append(code33, t240);
			append(p40, t241);
			append(p40, code34);
			append(code34, t242);
			append(p40, t243);
			append(p40, code35);
			append(code35, t244);
			append(p40, t245);
			append(p40, code36);
			append(code36, t246);
			append(p40, t247);
			append(p40, code37);
			append(code37, t248);
			append(p40, t249);
			append(p40, code38);
			append(code38, t250);
			append(p40, t251);
			append(section8, t252);
			append(section8, p41);
			append(p41, t253);
			append(p41, code39);
			append(code39, t254);
			append(p41, t255);
			append(p41, code40);
			append(code40, t256);
			append(p41, t257);
			append(section8, t258);
			append(section8, pre10);
			pre10.innerHTML = raw10_value;
			append(section8, t259);
			append(section8, p42);
			append(p42, t260);
			append(section8, t261);
			append(section8, pre11);
			pre11.innerHTML = raw11_value;
			append(section8, t262);
			append(section8, p43);
			append(p43, t263);
			append(p43, code41);
			append(code41, t264);
			append(p43, t265);
			append(p43, code42);
			append(code42, t266);
			append(p43, t267);
			append(p43, code43);
			append(code43, t268);
			append(p43, t269);
			append(p43, code44);
			append(code44, t270);
			append(p43, t271);
			append(section8, t272);
			append(section8, p44);
			append(p44, t273);
			append(p44, code45);
			append(code45, t274);
			append(p44, t275);
			append(p44, code46);
			append(code46, t276);
			append(p44, t277);
			append(section8, t278);
			append(section8, pre12);
			pre12.innerHTML = raw12_value;
			append(section8, t279);
			append(section8, blockquote3);
			append(blockquote3, p45);
			append(p45, t280);
			append(p45, code47);
			append(code47, t281);
			append(p45, t282);
			append(p45, code48);
			append(code48, t283);
			append(p45, t284);
			append(p45, a41);
			append(a41, t285);
			append(p45, t286);
			append(p45, code49);
			append(code49, t287);
			append(p45, t288);
			append(p45, code50);
			append(code50, t289);
			append(p45, t290);
			append(p45, code51);
			append(code51, t291);
			append(p45, t292);
			append(p45, a42);
			append(a42, t293);
			append(p45, t294);
			insert(target, t295, anchor);
			insert(target, section9, anchor);
			append(section9, h41);
			append(h41, a43);
			append(a43, t296);
			append(section9, t297);
			append(section9, p46);
			append(p46, t298);
			append(p46, code52);
			append(code52, t299);
			append(p46, t300);
			append(p46, code53);
			append(code53, t301);
			append(p46, t302);
			append(section9, t303);
			append(section9, p47);
			append(p47, t304);
			append(p47, a44);
			append(a44, code54);
			append(code54, t305);
			append(p47, t306);
			append(p47, code55);
			append(code55, t307);
			append(p47, t308);
			append(p47, code56);
			append(code56, t309);
			append(p47, t310);
			append(p47, code57);
			append(code57, t311);
			append(p47, t312);
			append(section9, t313);
			append(section9, pre13);
			pre13.innerHTML = raw13_value;
			append(section9, t314);
			append(section9, p48);
			append(p48, t315);
			append(p48, code58);
			append(code58, t316);
			append(p48, t317);
			append(p48, code59);
			append(code59, t318);
			append(p48, t319);
			append(p48, code60);
			append(code60, t320);
			append(p48, t321);
			append(p48, code61);
			append(code61, t322);
			append(p48, t323);
			append(p48, code62);
			append(code62, t324);
			append(p48, t325);
			append(section9, t326);
			append(section9, p49);
			append(p49, t327);
			append(section9, t328);
			append(section9, pre14);
			pre14.innerHTML = raw14_value;
			append(section9, t329);
			append(section9, p50);
			append(p50, t330);
			append(section9, t331);
			append(section9, p51);
			append(p51, t332);
			append(p51, code63);
			append(code63, t333);
			append(p51, t334);
			append(p51, code64);
			append(code64, t335);
			append(p51, t336);
			append(p51, code65);
			append(code65, t337);
			append(p51, t338);
			append(p51, code66);
			append(code66, t339);
			append(p51, t340);
			append(p51, code67);
			append(code67, t341);
			append(p51, t342);
			append(p51, code68);
			append(code68, t343);
			append(p51, t344);
			append(p51, code69);
			append(code69, t345);
			append(p51, t346);
			append(section9, t347);
			append(section9, p52);
			append(p52, t348);
			append(p52, code70);
			append(code70, t349);
			append(p52, t350);
			append(p52, code71);
			append(code71, t351);
			append(p52, t352);
			append(section9, t353);
			append(section9, p53);
			append(p53, t354);
			append(p53, code72);
			append(code72, t355);
			append(p53, t356);
			append(section9, t357);
			append(section9, pre15);
			pre15.innerHTML = raw15_value;
			append(section9, t358);
			append(section9, p54);
			append(p54, t359);
			insert(target, t360, anchor);
			insert(target, section10, anchor);
			append(section10, h22);
			append(h22, a45);
			append(a45, t361);
			append(section10, t362);
			append(section10, p55);
			append(p55, t363);
			append(section10, t364);
			append(section10, pre16);
			pre16.innerHTML = raw16_value;
			append(section10, t365);
			append(section10, p56);
			append(p56, t366);
			append(section10, t367);
			append(section10, ol);
			append(ol, li19);
			append(li19, t368);
			append(ol, t369);
			append(ol, li20);
			append(li20, t370);
			append(ol, t371);
			append(ol, li21);
			append(li21, t372);
			append(ol, t373);
			append(ol, li22);
			append(li22, t374);
			insert(target, t375, anchor);
			insert(target, section11, anchor);
			append(section11, h23);
			append(h23, a46);
			append(a46, t376);
			append(section11, t377);
			append(section11, p57);
			append(p57, t378);
			append(p57, a47);
			append(a47, t379);
			append(p57, t380);
			append(section11, t381);
			append(section11, p58);
			append(p58, t382);
			append(p58, a48);
			append(a48, t383);
			append(p58, t384);
			append(p58, code73);
			append(code73, t385);
			append(p58, t386);
			append(p58, code74);
			append(code74, t387);
			append(p58, t388);
			append(p58, a49);
			append(a49, t389);
			append(p58, t390);
			append(p58, a50);
			append(a50, t391);
			append(p58, t392);
			insert(target, t393, anchor);
			insert(target, section12, anchor);
			append(section12, h24);
			append(h24, a51);
			append(a51, t394);
			append(section12, t395);
			append(section12, ul7);
			append(ul7, li23);
			append(li23, a52);
			append(a52, t396);
			append(li23, t397);
			append(li23, a53);
			append(a53, t398);
			append(ul7, t399);
			append(ul7, li24);
			append(li24, a54);
			append(a54, t400);
			append(li24, t401);
			append(li24, a55);
			append(a55, t402);
			append(ul7, t403);
			append(ul7, li25);
			append(li25, a56);
			append(a56, t404);
			append(li25, t405);
			append(li25, a57);
			append(a57, t406);
		},
		p: noop,
		d(detaching) {
			if (detaching) detach(section0);
			if (detaching) detach(t12);
			if (detaching) detach(p0);
			if (detaching) detach(t16);
			if (detaching) detach(section1);
			if (detaching) detach(t27);
			if (detaching) detach(section2);
			if (detaching) detach(t54);
			if (detaching) detach(section3);
			if (detaching) detach(t101);
			if (detaching) detach(section4);
			if (detaching) detach(t118);
			if (detaching) detach(section5);
			if (detaching) detach(t135);
			if (detaching) detach(section6);
			if (detaching) detach(t152);
			if (detaching) detach(section7);
			if (detaching) detach(t216);
			if (detaching) detach(section8);
			if (detaching) detach(t295);
			if (detaching) detach(section9);
			if (detaching) detach(t360);
			if (detaching) detach(section10);
			if (detaching) detach(t375);
			if (detaching) detach(section11);
			if (detaching) detach(t393);
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
	"title": "Step-by-step guide for writing a custom babel transformation",
	"date": "2019-09-12T08:00:00Z",
	"tags": ["JavaScript", "babel", "ast", "transform"],
	"description": "Writing your first babel plugin",
	"series": "Intermediate Babel",
	"slug": "step-by-step-guide-for-writing-a-babel-transformation",
	"type": "blog"
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
