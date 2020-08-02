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

var __build_img__0 = "45c8d1207d7caa4c.png";

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

var image = "https://lihautan.com/debugging-build-failed-error-from-terser/assets/hero-twitter-3dd2a5b4.jpg";

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
					"@id": "https%3A%2F%2Flihautan.com%2Fdebugging-build-failed-error-from-terser",
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
			attr(meta11, "content", "https%3A%2F%2Flihautan.com%2Fdebugging-build-failed-error-from-terser");
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
							"@id": "https%3A%2F%2Flihautan.com%2Fdebugging-build-failed-error-from-terser",
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

/* content/blog/debugging-build-failed-error-from-terser/@@page-markup.svelte generated by Svelte v3.24.0 */

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
	let t5;
	let p0;
	let t6;
	let t7;
	let p1;
	let t8;
	let t9;
	let pre0;

	let raw0_value = `
<code class="language-">ERROR in bundle.xxxx.js from Terser
undefined

...

Command failed with exit code 2
Visit https://yarnpkg.com/en/docs/cli/run for documentation about this command.
Error: Command failed: yarn build</code>` + "";

	let t10;
	let p2;
	let t11;
	let t12;
	let p3;
	let strong0;
	let t13;
	let t14;
	let section1;
	let h20;
	let a5;
	let t15;
	let t16;
	let p4;
	let t17;
	let code0;
	let t18;
	let t19;
	let code1;
	let t20;
	let t21;
	let t22;
	let pre1;

	let raw1_value = `
<code class="language-js"><span class="token comment">// filename: webpackConfig.prod.js</span>

module<span class="token punctuation">.</span>exports <span class="token operator">=</span> <span class="token punctuation">&#123;</span>
  plugins<span class="token punctuation">:</span> <span class="token punctuation">[</span>
    <span class="token comment">// ...</span>
    <span class="token comment">// disable terser first</span>
    <span class="token comment">// new TerserPlugin(&#123;</span>
    <span class="token comment">// 	terserOptions: &#123;</span>
    <span class="token comment">//     // ...</span>
    <span class="token comment">//   &#125;,</span>
    <span class="token comment">// &#125;),</span>
  <span class="token punctuation">]</span><span class="token punctuation">,</span>
<span class="token punctuation">&#125;</span><span class="token punctuation">;</span></code>` + "";

	let t23;
	let p5;
	let t24;
	let t25;
	let p6;
	let t26;
	let t27;
	let pre2;

	let raw2_value = `
<code class="language-js"><span class="token keyword">const</span> terser <span class="token operator">=</span> <span class="token function">require</span><span class="token punctuation">(</span><span class="token string">'terser'</span><span class="token punctuation">)</span><span class="token punctuation">;</span>
<span class="token keyword">const</span> fs <span class="token operator">=</span> <span class="token function">require</span><span class="token punctuation">(</span><span class="token string">'fs'</span><span class="token punctuation">)</span><span class="token punctuation">;</span>
<span class="token keyword">const</span> path <span class="token operator">=</span> <span class="token function">require</span><span class="token punctuation">(</span><span class="token string">'path'</span><span class="token punctuation">)</span><span class="token punctuation">;</span>
<span class="token keyword">const</span> input <span class="token operator">=</span> fs<span class="token punctuation">.</span><span class="token function">readFileSync</span><span class="token punctuation">(</span>
  path<span class="token punctuation">.</span><span class="token function">join</span><span class="token punctuation">(</span>__dirname<span class="token punctuation">,</span> <span class="token string">'dist/bundle.xxxx.js'</span><span class="token punctuation">)</span><span class="token punctuation">,</span>
  <span class="token string">'utf-8'</span>
<span class="token punctuation">)</span><span class="token punctuation">;</span>

<span class="token keyword">const</span> output <span class="token operator">=</span> terser<span class="token punctuation">.</span><span class="token function">minify</span><span class="token punctuation">(</span>input<span class="token punctuation">,</span> <span class="token punctuation">&#123;</span>
  <span class="token comment">// ...terser options</span>
<span class="token punctuation">&#125;</span><span class="token punctuation">)</span><span class="token punctuation">;</span>
console<span class="token punctuation">.</span><span class="token function">log</span><span class="token punctuation">(</span>output<span class="token punctuation">)</span><span class="token punctuation">;</span></code>` + "";

	let t28;
	let p7;
	let t29;
	let t30;
	let pre3;

	let raw3_value = `
<code class="language-">&#123;
  &quot;error&quot;:
  TypeError: Cannot read property &#39;name&#39; of undefined
      at A.f (node_modules/terser/dist/bundle.js:44:146028)
      at D (node_modules/terser/dist/bundle.js:44:2863)
      at A (node_modules/terser/dist/bundle.js:44:146075)
      at k (node_modules/terser/dist/bundle.js:44:146998)
      at vn (node_modules/terser/dist/bundle.js:44:133003)
      at node_modules/terser/dist/bundle.js:44:165250
      at AST_BlockStatement.optimize (node_modules/terser/dist/bundle.js:44:121400)
      at Ct.before (node_modules/terser/dist/bundle.js:44:121157)
      at AST_BlockStatement.transform (node_modules/terser/dist/bundle.js:44:78200)
      at node_modules/terser/dist/bundle.js:44:78849
&#125;</code>` + "";

	let t31;
	let p8;
	let t32;
	let em;
	let t33;
	let t34;
	let p9;
	let t35;
	let t36;
	let p10;
	let code2;
	let t37;
	let t38;
	let t39;
	let p11;
	let t40;
	let t41;
	let pre4;

	let raw4_value = `
<code class="language-">...
s) &#125; else if (u instanceof Se &amp;&amp; r === u.expression &amp;&amp; (p(e, t, i, u, o = n(o, u.property), a + 1,
  s + 1), o)) return; a &gt; 0 || u instanceof Be &amp;&amp; r !== u.tail_node() || u instanceof S ||
(t.direct_access = !0) &#125; e(F, u); var d = new qn(function (e) &#123; if (e instanceof Je) &#123; var n =
e.definition(); n &amp;&amp; (e instanceof hn &amp;&amp; n.references.push(e), n.fixed = !1) &#125; &#125;); function h(e, n,
t) &#123; this.inlined = !1; var r = e.safe_ids; return e.safe_ids = Object.create(null), i(e, t, this),
n(), e.safe_ids = r, !0 &#125; function m(e, n, t) &#123; var r, o = this; return o.inlined = !1, a(e), i(e,
t, o), !o.name &amp;&amp; (r = e.parent()) instanceof ke &amp;&amp; r.expression === o &amp;&amp; o.argnames.forEach(
function (n, t) &#123; if (n.definition) &#123; var i = n.definition(); void 0 !== i.fixed || o.uses_arguments
&amp;&amp; !e.has_directive(&quot;use strict&quot;) ? i.fixed = !1 : (i.fixed = function () &#123; return r.args[t] || v(kn, r)
...</code>` + "";

	let t42;
	let p12;
	let t43;
	let t44;
	let p13;
	let t45;
	let t46;
	let section2;
	let h21;
	let a6;
	let t47;
	let t48;
	let p14;
	let t49;
	let t50;
	let p15;
	let t51;
	let code3;
	let t52;
	let t53;
	let t54;
	let p16;
	let t55;
	let code4;
	let t56;
	let t57;
	let code5;
	let t58;
	let t59;
	let t60;
	let p17;
	let strong1;
	let t61;
	let t62;
	let code6;
	let t63;
	let t64;
	let code7;
	let t65;
	let t66;
	let code8;
	let t67;
	let t68;
	let t69;
	let p18;
	let t70;
	let t71;
	let pre5;

	let raw5_value = `
<code class="language-js"><span class="token keyword">return</span> <span class="token keyword">new</span> <span class="token class-name">Error</span><span class="token punctuation">(</span><span class="token template-string"><span class="token template-punctuation string">&#96;</span><span class="token interpolation"><span class="token interpolation-punctuation punctuation">$&#123;</span>file<span class="token interpolation-punctuation punctuation">&#125;</span></span><span class="token string"> from Terser&#92;n</span><span class="token interpolation"><span class="token interpolation-punctuation punctuation">$&#123;</span>err<span class="token punctuation">.</span>message<span class="token interpolation-punctuation punctuation">&#125;</span></span><span class="token template-punctuation string">&#96;</span></span><span class="token punctuation">)</span><span class="token punctuation">;</span></code>` + "";

	let t72;
	let p19;
	let t73;
	let code9;
	let t74;
	let t75;
	let code10;
	let t76;
	let t77;
	let code11;
	let t78;
	let t79;
	let code12;
	let t80;
	let t81;
	let t82;
	let p20;
	let t83;
	let code13;
	let t84;
	let t85;
	let t86;
	let p21;
	let strong2;
	let t87;
	let t88;
	let t89;
	let ul1;
	let li5;
	let t90;
	let a7;
	let t91;
	let t92;
	let t93;
	let li6;
	let t94;
	let t95;
	let pre6;

	let raw6_value = `
<code class="language-js"><span class="token keyword">function</span> <span class="token function">someFunction</span><span class="token punctuation">(</span><span class="token punctuation">)</span> <span class="token punctuation">&#123;</span>
  <span class="token keyword">if</span> <span class="token punctuation">(</span>someConditionThatLeadsToErrorLaterOn<span class="token punctuation">)</span> <span class="token punctuation">&#123;</span>
    <span class="token keyword">try</span> <span class="token punctuation">&#123;</span>
      <span class="token keyword">throw</span> <span class="token keyword">new</span> <span class="token class-name">Error</span><span class="token punctuation">(</span><span class="token punctuation">)</span><span class="token punctuation">;</span>
    <span class="token punctuation">&#125;</span> <span class="token keyword">catch</span> <span class="token punctuation">(</span>error<span class="token punctuation">)</span> <span class="token punctuation">&#123;</span>
      console<span class="token punctuation">.</span><span class="token function">log</span><span class="token punctuation">(</span>error<span class="token punctuation">)</span><span class="token punctuation">;</span>
    <span class="token punctuation">&#125;</span>
  <span class="token punctuation">&#125;</span>
<span class="token punctuation">&#125;</span></code>` + "";

	let t96;
	let p22;
	let t97;
	let t98;
	let p23;
	let t99;
	let code14;
	let t100;
	let t101;
	let t102;
	let pre7;

	let raw7_value = `
<code class="language-">&#123;
  &quot;error&quot;:
  TypeError: Cannot read property &#39;name&#39; of undefined
      at A.f (node_modules/terser/dist/bundle.js:44:146028)
      at D (node_modules/terser/dist/bundle.js:44:2863)
      at A (node_modules/terser/dist/bundle.js:44:146075)
      at k (node_modules/terser/dist/bundle.js:44:146998)
      at vn (node_modules/terser/dist/bundle.js:44:133003)
      at node_modules/terser/dist/bundle.js:44:165250
      at AST_BlockStatement.optimize (node_modules/terser/dist/bundle.js:44:121400)
      at Ct.before (node_modules/terser/dist/bundle.js:44:121157)
      at AST_BlockStatement.transform (node_modules/terser/dist/bundle.js:44:78200)
      at node_modules/terser/dist/bundle.js:44:78849
&#125;</code>` + "";

	let t103;
	let p24;
	let t104;
	let t105;
	let p25;
	let strong3;
	let t106;
	let t107;
	let code15;
	let t108;
	let t109;
	let code16;
	let t110;
	let t111;
	let t112;
	let section3;
	let h22;
	let a8;
	let t113;
	let t114;
	let p26;
	let t115;
	let t116;
	let p27;
	let t117;
	let t118;
	let pre8;

	let raw8_value = `
<code class="language-js"><span class="token keyword">var</span> f <span class="token operator">=</span> n<span class="token punctuation">.</span><span class="token function">option</span><span class="token punctuation">(</span><span class="token string">"ecma"</span><span class="token punctuation">)</span> <span class="token operator">&lt;</span> <span class="token number">6</span> <span class="token operator">&amp;&amp;</span> n<span class="token punctuation">.</span><span class="token function">has_directive</span><span class="token punctuation">(</span><span class="token string">"use strict"</span><span class="token punctuation">)</span> <span class="token operator">?</span>
<span class="token keyword">function</span> <span class="token punctuation">(</span><span class="token parameter">e</span><span class="token punctuation">)</span> <span class="token punctuation">&#123;</span> <span class="token keyword">return</span> e<span class="token punctuation">.</span>key<span class="token operator">!=</span>u <span class="token operator">&amp;&amp;</span> e<span class="token punctuation">.</span>key<span class="token punctuation">.</span>name<span class="token operator">!=</span>u <span class="token punctuation">&#125;</span>
                                        <span class="token operator">^</span></code>` + "";

	let t119;
	let p28;
	let t120;
	let t121;
	let p29;
	let t122;
	let code17;
	let t123;
	let t124;
	let t125;
	let p30;
	let t126;
	let a9;
	let t127;
	let t128;
	let t129;
	let p31;
	let strong4;
	let t130;
	let t131;
	let a10;
	let t132;
	let t133;
	let code18;
	let t134;
	let t135;
	let code19;
	let t136;
	let t137;
	let t138;
	let p32;
	let t139;
	let t140;
	let p33;
	let t141;
	let code20;
	let t142;
	let t143;
	let t144;
	let pre9;

	let raw9_value = `
<code class="language-js"><span class="token keyword">var</span> diff <span class="token operator">=</span>
  compressor<span class="token punctuation">.</span><span class="token function">option</span><span class="token punctuation">(</span><span class="token string">'ecma'</span><span class="token punctuation">)</span> <span class="token operator">&lt;</span> <span class="token number">6</span> <span class="token operator">&amp;&amp;</span> compressor<span class="token punctuation">.</span><span class="token function">has_directive</span><span class="token punctuation">(</span><span class="token string">'use strict'</span><span class="token punctuation">)</span>
    <span class="token operator">?</span> <span class="token keyword">function</span><span class="token punctuation">(</span><span class="token parameter">node</span><span class="token punctuation">)</span> <span class="token punctuation">&#123;</span>
        <span class="token keyword">return</span> node<span class="token punctuation">.</span>key <span class="token operator">!=</span> prop <span class="token operator">&amp;&amp;</span> node<span class="token punctuation">.</span>key<span class="token punctuation">.</span>name <span class="token operator">!=</span> prop<span class="token punctuation">;</span>
      <span class="token punctuation">&#125;</span>
    <span class="token punctuation">:</span> <span class="token keyword">function</span><span class="token punctuation">(</span><span class="token parameter">node</span><span class="token punctuation">)</span> <span class="token punctuation">&#123;</span>
        <span class="token keyword">return</span> node<span class="token punctuation">.</span>key<span class="token punctuation">.</span>name <span class="token operator">!=</span> prop<span class="token punctuation">;</span>
      <span class="token punctuation">&#125;</span><span class="token punctuation">;</span></code>` + "";

	let t145;
	let p34;
	let t146;
	let t147;
	let p35;
	let t148;
	let code21;
	let t149;
	let t150;
	let t151;
	let pre10;

	let raw10_value = `
<code class="language-js"><span class="token keyword">var</span> f <span class="token operator">=</span> n<span class="token punctuation">.</span><span class="token function">option</span><span class="token punctuation">(</span><span class="token string">"ecma"</span><span class="token punctuation">)</span> <span class="token operator">&lt;</span> <span class="token number">6</span> <span class="token operator">&amp;&amp;</span> n<span class="token punctuation">.</span><span class="token function">has_directive</span><span class="token punctuation">(</span><span class="token string">"use strict"</span><span class="token punctuation">)</span> <span class="token operator">?</span>
<span class="token keyword">function</span> <span class="token punctuation">(</span><span class="token parameter">e</span><span class="token punctuation">)</span> <span class="token punctuation">&#123;</span> <span class="token keyword">if</span> <span class="token punctuation">(</span><span class="token operator">!</span>e<span class="token punctuation">.</span>key<span class="token punctuation">)</span> <span class="token punctuation">&#123;</span> console<span class="token punctuation">.</span><span class="token function">log</span><span class="token punctuation">(</span>e<span class="token punctuation">)</span><span class="token punctuation">;</span> <span class="token punctuation">&#125;</span> <span class="token keyword">return</span> e<span class="token punctuation">.</span>key<span class="token operator">!=</span>u
               <span class="token operator">^</span><span class="token operator">^</span><span class="token operator">^</span><span class="token operator">^</span><span class="token operator">^</span><span class="token operator">^</span><span class="token operator">^</span><span class="token operator">^</span><span class="token operator">^</span><span class="token operator">^</span><span class="token operator">^</span><span class="token operator">^</span><span class="token operator">^</span><span class="token operator">^</span><span class="token operator">^</span><span class="token operator">^</span><span class="token operator">^</span><span class="token operator">^</span><span class="token operator">^</span><span class="token operator">^</span><span class="token operator">^</span><span class="token operator">^</span><span class="token operator">^</span><span class="token operator">^</span><span class="token operator">^</span><span class="token operator">^</span><span class="token operator">^</span><span class="token operator">^</span><span class="token operator">^</span><span class="token operator">^</span><span class="token operator">^</span>
<span class="token operator">&amp;&amp;</span> e<span class="token punctuation">.</span>key<span class="token punctuation">.</span>name<span class="token operator">!=</span>u <span class="token punctuation">&#125;</span></code>` + "";

	let t152;
	let p36;
	let t153;
	let code22;
	let t154;
	let t155;
	let code23;
	let t156;
	let t157;
	let code24;
	let t158;
	let t159;
	let code25;
	let t160;
	let t161;
	let code26;
	let t162;
	let t163;
	let code27;
	let t164;
	let t165;
	let t166;
	let p37;
	let t167;
	let t168;
	let section4;
	let h23;
	let a11;
	let t169;
	let t170;
	let p38;
	let t171;
	let t172;
	let p39;
	let t173;
	let t174;
	let pre11;

	let raw11_value = `
<code class="language-js"><span class="token keyword">var</span> diff <span class="token operator">=</span> compressor<span class="token punctuation">.</span><span class="token function">option</span><span class="token punctuation">(</span><span class="token string">"ecma"</span><span class="token punctuation">)</span> <span class="token operator">&lt;</span> <span class="token number">2015</span>
    <span class="token operator">&amp;&amp;</span> compressor<span class="token punctuation">.</span><span class="token function">has_directive</span><span class="token punctuation">(</span><span class="token string">"use strict"</span><span class="token punctuation">)</span> <span class="token operator">?</span> <span class="token keyword">function</span><span class="token punctuation">(</span><span class="token parameter">node</span><span class="token punctuation">)</span> <span class="token punctuation">&#123;</span>
    <span class="token keyword">return</span> node<span class="token punctuation">.</span>key <span class="token operator">!=</span> prop <span class="token operator">&amp;&amp;</span> <span class="token punctuation">(</span>node<span class="token punctuation">.</span>key <span class="token operator">&amp;&amp;</span> node<span class="token punctuation">.</span>key<span class="token punctuation">.</span>name <span class="token operator">!=</span> prop<span class="token punctuation">)</span><span class="token punctuation">;</span>
<span class="token punctuation">&#125;</span> <span class="token punctuation">:</span> <span class="token keyword">function</span><span class="token punctuation">(</span><span class="token parameter">node</span><span class="token punctuation">)</span> <span class="token punctuation">&#123;</span>
    <span class="token keyword">return</span> node<span class="token punctuation">.</span>key <span class="token operator">&amp;&amp;</span> node<span class="token punctuation">.</span>key<span class="token punctuation">.</span>name <span class="token operator">!=</span> prop<span class="token punctuation">;</span>
<span class="token punctuation">&#125;</span><span class="token punctuation">;</span></code>` + "";

	let t175;
	let p40;
	let code28;
	let t176;
	let t177;
	let code29;
	let t178;
	let t179;
	let t180;
	let p41;
	let t181;
	let t182;
	let p42;
	let t183;
	let t184;
	let p43;
	let t185;
	let t186;
	let p44;
	let strong5;
	let t187;
	let t188;
	let t189;
	let p45;
	let img;
	let img_src_value;
	let t190;
	let p46;
	let t191;
	let t192;
	let blockquote;
	let p47;
	let a12;
	let t193;
	let t194;
	let p48;
	let t195;
	let a13;
	let t196;
	let t197;
	let t198;
	let p49;
	let t199;
	let t200;
	let p50;
	let code30;
	let t201;
	let t202;
	let code31;
	let t203;
	let t204;
	let code32;
	let t205;
	let t206;
	let t207;
	let pre12;

	let raw12_value = `
<code class="language-json"><span class="token punctuation">&#123;</span>
  <span class="token property">"resolution"</span><span class="token operator">:</span> <span class="token punctuation">&#123;</span>
    <span class="token property">"terser"</span><span class="token operator">:</span> <span class="token string">"3.17.0"</span>
  <span class="token punctuation">&#125;</span>
<span class="token punctuation">&#125;</span></code>` + "";

	let t208;
	let p51;
	let t209;
	let t210;
	let p52;
	let t211;
	let t212;
	let section5;
	let h24;
	let a14;
	let t213;
	let t214;
	let p53;
	let t215;
	let t216;
	let p54;
	let t217;

	return {
		c() {
			section0 = element("section");
			ul0 = element("ul");
			li0 = element("li");
			a0 = element("a");
			t0 = text("Act I - The First Attempt");
			li1 = element("li");
			a1 = element("a");
			t1 = text("Act II - terser-webpack-plugin");
			li2 = element("li");
			a2 = element("a");
			t2 = text("Act III - Terser");
			li3 = element("li");
			a3 = element("a");
			t3 = text("Final Act - The Resolution");
			li4 = element("li");
			a4 = element("a");
			t4 = text("Closing Note");
			t5 = space();
			p0 = element("p");
			t6 = text("The following is a record of the steps I went through when debugging a build-time bug I encountered during work.");
			t7 = space();
			p1 = element("p");
			t8 = text("It all started with an error message during the build.");
			t9 = space();
			pre0 = element("pre");
			t10 = space();
			p2 = element("p");
			t11 = text("What is wrong with Terser and our code?");
			t12 = space();
			p3 = element("p");
			strong0 = element("strong");
			t13 = text("I must find the root cause of this!");
			t14 = space();
			section1 = element("section");
			h20 = element("h2");
			a5 = element("a");
			t15 = text("Act I - The First Attempt");
			t16 = space();
			p4 = element("p");
			t17 = text("We used Terser to minify our build code. It was part of our webpack pipeline, installed through ");
			code0 = element("code");
			t18 = text("terser-webpack-plugin");
			t19 = text(". Since terser is throwing an error, so I disabled ");
			code1 = element("code");
			t20 = text("terser-webpack-plugin");
			t21 = text(" and build again.");
			t22 = space();
			pre1 = element("pre");
			t23 = space();
			p5 = element("p");
			t24 = text("Ok. The build was successful. Nothing wrong with the code nor the build.");
			t25 = space();
			p6 = element("p");
			t26 = text("So, I run the terser manually:");
			t27 = space();
			pre2 = element("pre");
			t28 = space();
			p7 = element("p");
			t29 = text("The console output an error that was cryptic");
			t30 = space();
			pre3 = element("pre");
			t31 = space();
			p8 = element("p");
			t32 = text("I clicked into the terser source code to see what was going wrong over there. ");
			em = element("em");
			t33 = text("(Maybe it's my chance to contribute to terser?)");
			t34 = space();
			p9 = element("p");
			t35 = text("Little did I know, how wrong I could be.");
			t36 = space();
			p10 = element("p");
			code2 = element("code");
			t37 = text("terser/dist/bundle.js");
			t38 = text(" was a minified code and it wasn't meant for humans eyes 😭");
			t39 = space();
			p11 = element("p");
			t40 = text("Allow me to share a small snippet of what I saw:");
			t41 = space();
			pre4 = element("pre");
			t42 = space();
			p12 = element("p");
			t43 = text("At this point in time, I had another meeting to attend, so I stopped at this juncture.");
			t44 = space();
			p13 = element("p");
			t45 = text("On my way there, I was thinking, well, maybe I should probe this later in another direction.");
			t46 = space();
			section2 = element("section");
			h21 = element("h2");
			a6 = element("a");
			t47 = text("Act II - terser-webpack-plugin");
			t48 = space();
			p14 = element("p");
			t49 = text("After the meeting, I was thinking, well let me reenable the terser plugin, and try to probe through the plugin.");
			t50 = space();
			p15 = element("p");
			t51 = text("Remember the error message: ");
			code3 = element("code");
			t52 = text("\"ERROR in bundle.xxxx.js from Terser\"");
			t53 = text(" ?");
			t54 = space();
			p16 = element("p");
			t55 = text("I looked into the ");
			code4 = element("code");
			t56 = text("node_modules/terser-webpack/plugin/dist/index.js");
			t57 = text(" and search for the word ");
			code5 = element("code");
			t58 = text("\"from Terser\"");
			t59 = text(".");
			t60 = space();
			p17 = element("p");
			strong1 = element("strong");
			t61 = text("Tip:");
			t62 = text(" Usually when you want to debug a library installed in ");
			code6 = element("code");
			t63 = text("node_modules");
			t64 = text(", you can first look at the ");
			code7 = element("code");
			t65 = text("package.json");
			t66 = text(", it usually has an entry called ");
			code8 = element("code");
			t67 = text("\"main\"");
			t68 = text(" that tells you the entry file to first look into. The main file usually exports all the public API that you use, so it is a good place to start diving into.");
			t69 = space();
			p18 = element("p");
			t70 = text("So I found the line:");
			t71 = space();
			pre5 = element("pre");
			t72 = space();
			p19 = element("p");
			t73 = text("After adding logs ");
			code9 = element("code");
			t74 = text("console.log(err)");
			t75 = text(" and run the build again, I realised the err is an empty object ");
			code10 = element("code");
			t76 = text("{}");
			t77 = text(", which explained why I saw ");
			code11 = element("code");
			t78 = text("undefined");
			t79 = text(" after the ");
			code12 = element("code");
			t80 = text("ERROR in ... from Terser");
			t81 = text(".");
			t82 = space();
			p20 = element("p");
			t83 = text("So, I slowly traced back the caller, and find out where this ");
			code13 = element("code");
			t84 = text("err");
			t85 = text(" object was initially created.");
			t86 = space();
			p21 = element("p");
			strong2 = element("strong");
			t87 = text("Tip:");
			t88 = text(" To trace the callers of a function that leads up to a certain state of your application, you can:");
			t89 = space();
			ul1 = element("ul");
			li5 = element("li");
			t90 = text("Use a ");
			a7 = element("a");
			t91 = text("conditional breakpoint");
			t92 = text(" if you are debugging through a debugger");
			t93 = space();
			li6 = element("li");
			t94 = text("Throw an error within a try catch");
			t95 = space();
			pre6 = element("pre");
			t96 = space();
			p22 = element("p");
			t97 = text("This is especially useful if you are tracing an unfamiliar code, you can quickly get a call stack that leads up to the current condition.");
			t98 = space();
			p23 = element("p");
			t99 = text("After tracing through the call stack, I ended up at the line where the ");
			code14 = element("code");
			t100 = text("terser-webpack-plugin");
			t101 = text(" calls the terser, and when I logged out the error, it shows:");
			t102 = space();
			pre7 = element("pre");
			t103 = space();
			p24 = element("p");
			t104 = text("So familiar! After an hour of tracing and debugging, I ended up at the same place.");
			t105 = space();
			p25 = element("p");
			strong3 = element("strong");
			t106 = text("Note:");
			t107 = text(" the error must have lost somewhere from the terser to the actual print out of ");
			code15 = element("code");
			t108 = text("terser-webpack-plugin");
			t109 = text(", it might have fixed in a later version of ");
			code16 = element("code");
			t110 = text("terser-webpack-plugin");
			t111 = text(", but I'm not sure of it yet. Anyone interested can help check.");
			t112 = space();
			section3 = element("section");
			h22 = element("h2");
			a8 = element("a");
			t113 = text("Act III - Terser");
			t114 = space();
			p26 = element("p");
			t115 = text("The circumstances left me with no choice. I needed to face the cryptic minified code.");
			t116 = space();
			p27 = element("p");
			t117 = text("Luckily VSCode still able to open the huge minified file, and able to set the cursor to the right line and column:");
			t118 = space();
			pre8 = element("pre");
			t119 = space();
			p28 = element("p");
			t120 = text("(By the way, in the minified code, all the code is in one line. 🤦‍♂️)");
			t121 = space();
			p29 = element("p");
			t122 = text("Well, this may seem like the right place to throw the ");
			code17 = element("code");
			t123 = text("\"Cannot read property 'name' of undefined\"");
			t124 = text(" error.");
			t125 = space();
			p30 = element("p");
			t126 = text("To understand what is going on in this line, I cloned ");
			a9 = element("a");
			t127 = text("terser");
			t128 = text(", checked out to the version tag that was installed in our codebase, and tried to figure out where that line was in the original code.");
			t129 = space();
			p31 = element("p");
			strong4 = element("strong");
			t130 = text("Tip:");
			t131 = text(" String, property and method names are usually the best marker to trace a ");
			a10 = element("a");
			t132 = text("mangled code");
			t133 = text(". Even though all the variables have mangled into a single character variable name, you can still clearly see the method ");
			code18 = element("code");
			t134 = text("has_directive()");
			t135 = text(" and the string ");
			code19 = element("code");
			t136 = text("\"use strict\"");
			t137 = text(".");
			t138 = space();
			p32 = element("p");
			t139 = text("Conversely, please don't write long windy property / method names, it doesn't mangle well.");
			t140 = space();
			p33 = element("p");
			t141 = text("So I global searched the keyword ");
			code20 = element("code");
			t142 = text("has_directive(\"use strict\")");
			t143 = text(" and landed with a small number of results, which I looked through every one of them and ended up with the following line:");
			t144 = space();
			pre9 = element("pre");
			t145 = space();
			p34 = element("p");
			t146 = text("Which I was and still am clueless of what this code was trying to do.");
			t147 = space();
			p35 = element("p");
			t148 = text("So I did the most reasonable thing, add a ");
			code21 = element("code");
			t149 = text("console.log(node)");
			t150 = text(".");
			t151 = space();
			pre10 = element("pre");
			t152 = space();
			p36 = element("p");
			t153 = text("I found out that the ");
			code22 = element("code");
			t154 = text("node");
			t155 = text(" is an object, that does not have a property ");
			code23 = element("code");
			t156 = text("key");
			t157 = text(", which explains the error. And ");
			code24 = element("code");
			t158 = text("node");
			t159 = text(" has a property call ");
			code25 = element("code");
			t160 = text("name");
			t161 = text(" that has a value ");
			code26 = element("code");
			t162 = text("\"foobar\"");
			t163 = text(", which I assumed is a variable name in our codebase. Luckily ");
			code27 = element("code");
			t164 = text("foobar");
			t165 = text(" wasn't commonly used in our codebase, and I managed to find only 1 instance of it, and astonishingly, the code was last changed 1 year ago!");
			t166 = space();
			p37 = element("p");
			t167 = text("So Terser just decided to break, without a sign, on a line of code that was written 1 year ago. This is the life of a programmer.");
			t168 = space();
			section4 = element("section");
			h23 = element("h2");
			a11 = element("a");
			t169 = text("Final Act - The Resolution");
			t170 = space();
			p38 = element("p");
			t171 = text("I kind of concluded that the root cause was a Terser bug, (because I can't just change the code that wasn't touched for nearly 1 year for no good reason), so the obvious thing to do next was to figured out whether someone fixed it on Terser upstream.");
			t172 = space();
			p39 = element("p");
			t173 = text("So, I checked out the master branch of Terser, found out the code has changed to");
			t174 = space();
			pre11 = element("pre");
			t175 = space();
			p40 = element("p");
			code28 = element("code");
			t176 = text("node.key");
			t177 = text(" is checked to be existed before checking ");
			code29 = element("code");
			t178 = text("node.key.name");
			t179 = text(". What a simple patch!");
			t180 = space();
			p41 = element("p");
			t181 = text("The next thing I needed to figure out was when was this fix landed, whether I can upgrade it.");
			t182 = space();
			p42 = element("p");
			t183 = text("The Terser in the codebase was one major version behind the latest Terser version, so, I was more reserved to upgrade to the latest version.");
			t184 = space();
			p43 = element("p");
			t185 = text("The git blame for the line of code was for some code refactoring, so I went to Github to trace the blame.");
			t186 = space();
			p44 = element("p");
			strong5 = element("strong");
			t187 = text("Tip:");
			t188 = text(" Github blame has this very useful button, that allows you to view blame prior to the change.");
			t189 = space();
			p45 = element("p");
			img = element("img");
			t190 = space();
			p46 = element("p");
			t191 = text("A few blame traces later, I ended up with a commit that fixed the bug:");
			t192 = space();
			blockquote = element("blockquote");
			p47 = element("p");
			a12 = element("a");
			t193 = text("fix node.key crashing lib/compress by hytromo · Pull Request #286 · terser/terser");
			t194 = space();
			p48 = element("p");
			t195 = text("By looking at the MR merged date, I found that the commit was landed in between ");
			a13 = element("a");
			t196 = text("v3.16.0 and v3.17.0");
			t197 = text(".");
			t198 = space();
			p49 = element("p");
			t199 = text("v3.17.0 was a minor version bump for our codebase, so I assumed it has no breaking changes.");
			t200 = space();
			p50 = element("p");
			code30 = element("code");
			t201 = text("terser");
			t202 = text(" was installed as a dependency of ");
			code31 = element("code");
			t203 = text("terser-webpack-plugin");
			t204 = text(", which we had no control on the terser version, so I added a resolution to our ");
			code32 = element("code");
			t205 = text("package.json");
			t206 = text(":");
			t207 = space();
			pre12 = element("pre");
			t208 = space();
			p51 = element("p");
			t209 = text("After I upgraded terser, I build the code again.");
			t210 = space();
			p52 = element("p");
			t211 = text("The build was successful! 🎉");
			t212 = space();
			section5 = element("section");
			h24 = element("h2");
			a14 = element("a");
			t213 = text("Closing Note");
			t214 = space();
			p53 = element("p");
			t215 = text("As I was explaining all these to my colleague, I realised that should I upgraded the terser once I found out that it was a terser error, it would have fixed the bug as well. I wouldn't need to go through all these to end up in the same fix.");
			t216 = space();
			p54 = element("p");
			t217 = text("Oh well. 🤷‍♂️");
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
			t0 = claim_text(a0_nodes, "Act I - The First Attempt");
			a0_nodes.forEach(detach);
			li0_nodes.forEach(detach);
			li1 = claim_element(ul0_nodes, "LI", {});
			var li1_nodes = children(li1);
			a1 = claim_element(li1_nodes, "A", { href: true });
			var a1_nodes = children(a1);
			t1 = claim_text(a1_nodes, "Act II - terser-webpack-plugin");
			a1_nodes.forEach(detach);
			li1_nodes.forEach(detach);
			li2 = claim_element(ul0_nodes, "LI", {});
			var li2_nodes = children(li2);
			a2 = claim_element(li2_nodes, "A", { href: true });
			var a2_nodes = children(a2);
			t2 = claim_text(a2_nodes, "Act III - Terser");
			a2_nodes.forEach(detach);
			li2_nodes.forEach(detach);
			li3 = claim_element(ul0_nodes, "LI", {});
			var li3_nodes = children(li3);
			a3 = claim_element(li3_nodes, "A", { href: true });
			var a3_nodes = children(a3);
			t3 = claim_text(a3_nodes, "Final Act - The Resolution");
			a3_nodes.forEach(detach);
			li3_nodes.forEach(detach);
			li4 = claim_element(ul0_nodes, "LI", {});
			var li4_nodes = children(li4);
			a4 = claim_element(li4_nodes, "A", { href: true });
			var a4_nodes = children(a4);
			t4 = claim_text(a4_nodes, "Closing Note");
			a4_nodes.forEach(detach);
			li4_nodes.forEach(detach);
			ul0_nodes.forEach(detach);
			section0_nodes.forEach(detach);
			t5 = claim_space(nodes);
			p0 = claim_element(nodes, "P", {});
			var p0_nodes = children(p0);
			t6 = claim_text(p0_nodes, "The following is a record of the steps I went through when debugging a build-time bug I encountered during work.");
			p0_nodes.forEach(detach);
			t7 = claim_space(nodes);
			p1 = claim_element(nodes, "P", {});
			var p1_nodes = children(p1);
			t8 = claim_text(p1_nodes, "It all started with an error message during the build.");
			p1_nodes.forEach(detach);
			t9 = claim_space(nodes);
			pre0 = claim_element(nodes, "PRE", { class: true });
			var pre0_nodes = children(pre0);
			pre0_nodes.forEach(detach);
			t10 = claim_space(nodes);
			p2 = claim_element(nodes, "P", {});
			var p2_nodes = children(p2);
			t11 = claim_text(p2_nodes, "What is wrong with Terser and our code?");
			p2_nodes.forEach(detach);
			t12 = claim_space(nodes);
			p3 = claim_element(nodes, "P", {});
			var p3_nodes = children(p3);
			strong0 = claim_element(p3_nodes, "STRONG", {});
			var strong0_nodes = children(strong0);
			t13 = claim_text(strong0_nodes, "I must find the root cause of this!");
			strong0_nodes.forEach(detach);
			p3_nodes.forEach(detach);
			t14 = claim_space(nodes);
			section1 = claim_element(nodes, "SECTION", {});
			var section1_nodes = children(section1);
			h20 = claim_element(section1_nodes, "H2", {});
			var h20_nodes = children(h20);
			a5 = claim_element(h20_nodes, "A", { href: true, id: true });
			var a5_nodes = children(a5);
			t15 = claim_text(a5_nodes, "Act I - The First Attempt");
			a5_nodes.forEach(detach);
			h20_nodes.forEach(detach);
			t16 = claim_space(section1_nodes);
			p4 = claim_element(section1_nodes, "P", {});
			var p4_nodes = children(p4);
			t17 = claim_text(p4_nodes, "We used Terser to minify our build code. It was part of our webpack pipeline, installed through ");
			code0 = claim_element(p4_nodes, "CODE", {});
			var code0_nodes = children(code0);
			t18 = claim_text(code0_nodes, "terser-webpack-plugin");
			code0_nodes.forEach(detach);
			t19 = claim_text(p4_nodes, ". Since terser is throwing an error, so I disabled ");
			code1 = claim_element(p4_nodes, "CODE", {});
			var code1_nodes = children(code1);
			t20 = claim_text(code1_nodes, "terser-webpack-plugin");
			code1_nodes.forEach(detach);
			t21 = claim_text(p4_nodes, " and build again.");
			p4_nodes.forEach(detach);
			t22 = claim_space(section1_nodes);
			pre1 = claim_element(section1_nodes, "PRE", { class: true });
			var pre1_nodes = children(pre1);
			pre1_nodes.forEach(detach);
			t23 = claim_space(section1_nodes);
			p5 = claim_element(section1_nodes, "P", {});
			var p5_nodes = children(p5);
			t24 = claim_text(p5_nodes, "Ok. The build was successful. Nothing wrong with the code nor the build.");
			p5_nodes.forEach(detach);
			t25 = claim_space(section1_nodes);
			p6 = claim_element(section1_nodes, "P", {});
			var p6_nodes = children(p6);
			t26 = claim_text(p6_nodes, "So, I run the terser manually:");
			p6_nodes.forEach(detach);
			t27 = claim_space(section1_nodes);
			pre2 = claim_element(section1_nodes, "PRE", { class: true });
			var pre2_nodes = children(pre2);
			pre2_nodes.forEach(detach);
			t28 = claim_space(section1_nodes);
			p7 = claim_element(section1_nodes, "P", {});
			var p7_nodes = children(p7);
			t29 = claim_text(p7_nodes, "The console output an error that was cryptic");
			p7_nodes.forEach(detach);
			t30 = claim_space(section1_nodes);
			pre3 = claim_element(section1_nodes, "PRE", { class: true });
			var pre3_nodes = children(pre3);
			pre3_nodes.forEach(detach);
			t31 = claim_space(section1_nodes);
			p8 = claim_element(section1_nodes, "P", {});
			var p8_nodes = children(p8);
			t32 = claim_text(p8_nodes, "I clicked into the terser source code to see what was going wrong over there. ");
			em = claim_element(p8_nodes, "EM", {});
			var em_nodes = children(em);
			t33 = claim_text(em_nodes, "(Maybe it's my chance to contribute to terser?)");
			em_nodes.forEach(detach);
			p8_nodes.forEach(detach);
			t34 = claim_space(section1_nodes);
			p9 = claim_element(section1_nodes, "P", {});
			var p9_nodes = children(p9);
			t35 = claim_text(p9_nodes, "Little did I know, how wrong I could be.");
			p9_nodes.forEach(detach);
			t36 = claim_space(section1_nodes);
			p10 = claim_element(section1_nodes, "P", {});
			var p10_nodes = children(p10);
			code2 = claim_element(p10_nodes, "CODE", {});
			var code2_nodes = children(code2);
			t37 = claim_text(code2_nodes, "terser/dist/bundle.js");
			code2_nodes.forEach(detach);
			t38 = claim_text(p10_nodes, " was a minified code and it wasn't meant for humans eyes 😭");
			p10_nodes.forEach(detach);
			t39 = claim_space(section1_nodes);
			p11 = claim_element(section1_nodes, "P", {});
			var p11_nodes = children(p11);
			t40 = claim_text(p11_nodes, "Allow me to share a small snippet of what I saw:");
			p11_nodes.forEach(detach);
			t41 = claim_space(section1_nodes);
			pre4 = claim_element(section1_nodes, "PRE", { class: true });
			var pre4_nodes = children(pre4);
			pre4_nodes.forEach(detach);
			t42 = claim_space(section1_nodes);
			p12 = claim_element(section1_nodes, "P", {});
			var p12_nodes = children(p12);
			t43 = claim_text(p12_nodes, "At this point in time, I had another meeting to attend, so I stopped at this juncture.");
			p12_nodes.forEach(detach);
			t44 = claim_space(section1_nodes);
			p13 = claim_element(section1_nodes, "P", {});
			var p13_nodes = children(p13);
			t45 = claim_text(p13_nodes, "On my way there, I was thinking, well, maybe I should probe this later in another direction.");
			p13_nodes.forEach(detach);
			section1_nodes.forEach(detach);
			t46 = claim_space(nodes);
			section2 = claim_element(nodes, "SECTION", {});
			var section2_nodes = children(section2);
			h21 = claim_element(section2_nodes, "H2", {});
			var h21_nodes = children(h21);
			a6 = claim_element(h21_nodes, "A", { href: true, id: true });
			var a6_nodes = children(a6);
			t47 = claim_text(a6_nodes, "Act II - terser-webpack-plugin");
			a6_nodes.forEach(detach);
			h21_nodes.forEach(detach);
			t48 = claim_space(section2_nodes);
			p14 = claim_element(section2_nodes, "P", {});
			var p14_nodes = children(p14);
			t49 = claim_text(p14_nodes, "After the meeting, I was thinking, well let me reenable the terser plugin, and try to probe through the plugin.");
			p14_nodes.forEach(detach);
			t50 = claim_space(section2_nodes);
			p15 = claim_element(section2_nodes, "P", {});
			var p15_nodes = children(p15);
			t51 = claim_text(p15_nodes, "Remember the error message: ");
			code3 = claim_element(p15_nodes, "CODE", {});
			var code3_nodes = children(code3);
			t52 = claim_text(code3_nodes, "\"ERROR in bundle.xxxx.js from Terser\"");
			code3_nodes.forEach(detach);
			t53 = claim_text(p15_nodes, " ?");
			p15_nodes.forEach(detach);
			t54 = claim_space(section2_nodes);
			p16 = claim_element(section2_nodes, "P", {});
			var p16_nodes = children(p16);
			t55 = claim_text(p16_nodes, "I looked into the ");
			code4 = claim_element(p16_nodes, "CODE", {});
			var code4_nodes = children(code4);
			t56 = claim_text(code4_nodes, "node_modules/terser-webpack/plugin/dist/index.js");
			code4_nodes.forEach(detach);
			t57 = claim_text(p16_nodes, " and search for the word ");
			code5 = claim_element(p16_nodes, "CODE", {});
			var code5_nodes = children(code5);
			t58 = claim_text(code5_nodes, "\"from Terser\"");
			code5_nodes.forEach(detach);
			t59 = claim_text(p16_nodes, ".");
			p16_nodes.forEach(detach);
			t60 = claim_space(section2_nodes);
			p17 = claim_element(section2_nodes, "P", {});
			var p17_nodes = children(p17);
			strong1 = claim_element(p17_nodes, "STRONG", {});
			var strong1_nodes = children(strong1);
			t61 = claim_text(strong1_nodes, "Tip:");
			strong1_nodes.forEach(detach);
			t62 = claim_text(p17_nodes, " Usually when you want to debug a library installed in ");
			code6 = claim_element(p17_nodes, "CODE", {});
			var code6_nodes = children(code6);
			t63 = claim_text(code6_nodes, "node_modules");
			code6_nodes.forEach(detach);
			t64 = claim_text(p17_nodes, ", you can first look at the ");
			code7 = claim_element(p17_nodes, "CODE", {});
			var code7_nodes = children(code7);
			t65 = claim_text(code7_nodes, "package.json");
			code7_nodes.forEach(detach);
			t66 = claim_text(p17_nodes, ", it usually has an entry called ");
			code8 = claim_element(p17_nodes, "CODE", {});
			var code8_nodes = children(code8);
			t67 = claim_text(code8_nodes, "\"main\"");
			code8_nodes.forEach(detach);
			t68 = claim_text(p17_nodes, " that tells you the entry file to first look into. The main file usually exports all the public API that you use, so it is a good place to start diving into.");
			p17_nodes.forEach(detach);
			t69 = claim_space(section2_nodes);
			p18 = claim_element(section2_nodes, "P", {});
			var p18_nodes = children(p18);
			t70 = claim_text(p18_nodes, "So I found the line:");
			p18_nodes.forEach(detach);
			t71 = claim_space(section2_nodes);
			pre5 = claim_element(section2_nodes, "PRE", { class: true });
			var pre5_nodes = children(pre5);
			pre5_nodes.forEach(detach);
			t72 = claim_space(section2_nodes);
			p19 = claim_element(section2_nodes, "P", {});
			var p19_nodes = children(p19);
			t73 = claim_text(p19_nodes, "After adding logs ");
			code9 = claim_element(p19_nodes, "CODE", {});
			var code9_nodes = children(code9);
			t74 = claim_text(code9_nodes, "console.log(err)");
			code9_nodes.forEach(detach);
			t75 = claim_text(p19_nodes, " and run the build again, I realised the err is an empty object ");
			code10 = claim_element(p19_nodes, "CODE", {});
			var code10_nodes = children(code10);
			t76 = claim_text(code10_nodes, "{}");
			code10_nodes.forEach(detach);
			t77 = claim_text(p19_nodes, ", which explained why I saw ");
			code11 = claim_element(p19_nodes, "CODE", {});
			var code11_nodes = children(code11);
			t78 = claim_text(code11_nodes, "undefined");
			code11_nodes.forEach(detach);
			t79 = claim_text(p19_nodes, " after the ");
			code12 = claim_element(p19_nodes, "CODE", {});
			var code12_nodes = children(code12);
			t80 = claim_text(code12_nodes, "ERROR in ... from Terser");
			code12_nodes.forEach(detach);
			t81 = claim_text(p19_nodes, ".");
			p19_nodes.forEach(detach);
			t82 = claim_space(section2_nodes);
			p20 = claim_element(section2_nodes, "P", {});
			var p20_nodes = children(p20);
			t83 = claim_text(p20_nodes, "So, I slowly traced back the caller, and find out where this ");
			code13 = claim_element(p20_nodes, "CODE", {});
			var code13_nodes = children(code13);
			t84 = claim_text(code13_nodes, "err");
			code13_nodes.forEach(detach);
			t85 = claim_text(p20_nodes, " object was initially created.");
			p20_nodes.forEach(detach);
			t86 = claim_space(section2_nodes);
			p21 = claim_element(section2_nodes, "P", {});
			var p21_nodes = children(p21);
			strong2 = claim_element(p21_nodes, "STRONG", {});
			var strong2_nodes = children(strong2);
			t87 = claim_text(strong2_nodes, "Tip:");
			strong2_nodes.forEach(detach);
			t88 = claim_text(p21_nodes, " To trace the callers of a function that leads up to a certain state of your application, you can:");
			p21_nodes.forEach(detach);
			t89 = claim_space(section2_nodes);
			ul1 = claim_element(section2_nodes, "UL", {});
			var ul1_nodes = children(ul1);
			li5 = claim_element(ul1_nodes, "LI", {});
			var li5_nodes = children(li5);
			t90 = claim_text(li5_nodes, "Use a ");
			a7 = claim_element(li5_nodes, "A", { href: true, rel: true });
			var a7_nodes = children(a7);
			t91 = claim_text(a7_nodes, "conditional breakpoint");
			a7_nodes.forEach(detach);
			t92 = claim_text(li5_nodes, " if you are debugging through a debugger");
			li5_nodes.forEach(detach);
			t93 = claim_space(ul1_nodes);
			li6 = claim_element(ul1_nodes, "LI", {});
			var li6_nodes = children(li6);
			t94 = claim_text(li6_nodes, "Throw an error within a try catch");
			li6_nodes.forEach(detach);
			ul1_nodes.forEach(detach);
			t95 = claim_space(section2_nodes);
			pre6 = claim_element(section2_nodes, "PRE", { class: true });
			var pre6_nodes = children(pre6);
			pre6_nodes.forEach(detach);
			t96 = claim_space(section2_nodes);
			p22 = claim_element(section2_nodes, "P", {});
			var p22_nodes = children(p22);
			t97 = claim_text(p22_nodes, "This is especially useful if you are tracing an unfamiliar code, you can quickly get a call stack that leads up to the current condition.");
			p22_nodes.forEach(detach);
			t98 = claim_space(section2_nodes);
			p23 = claim_element(section2_nodes, "P", {});
			var p23_nodes = children(p23);
			t99 = claim_text(p23_nodes, "After tracing through the call stack, I ended up at the line where the ");
			code14 = claim_element(p23_nodes, "CODE", {});
			var code14_nodes = children(code14);
			t100 = claim_text(code14_nodes, "terser-webpack-plugin");
			code14_nodes.forEach(detach);
			t101 = claim_text(p23_nodes, " calls the terser, and when I logged out the error, it shows:");
			p23_nodes.forEach(detach);
			t102 = claim_space(section2_nodes);
			pre7 = claim_element(section2_nodes, "PRE", { class: true });
			var pre7_nodes = children(pre7);
			pre7_nodes.forEach(detach);
			t103 = claim_space(section2_nodes);
			p24 = claim_element(section2_nodes, "P", {});
			var p24_nodes = children(p24);
			t104 = claim_text(p24_nodes, "So familiar! After an hour of tracing and debugging, I ended up at the same place.");
			p24_nodes.forEach(detach);
			t105 = claim_space(section2_nodes);
			p25 = claim_element(section2_nodes, "P", {});
			var p25_nodes = children(p25);
			strong3 = claim_element(p25_nodes, "STRONG", {});
			var strong3_nodes = children(strong3);
			t106 = claim_text(strong3_nodes, "Note:");
			strong3_nodes.forEach(detach);
			t107 = claim_text(p25_nodes, " the error must have lost somewhere from the terser to the actual print out of ");
			code15 = claim_element(p25_nodes, "CODE", {});
			var code15_nodes = children(code15);
			t108 = claim_text(code15_nodes, "terser-webpack-plugin");
			code15_nodes.forEach(detach);
			t109 = claim_text(p25_nodes, ", it might have fixed in a later version of ");
			code16 = claim_element(p25_nodes, "CODE", {});
			var code16_nodes = children(code16);
			t110 = claim_text(code16_nodes, "terser-webpack-plugin");
			code16_nodes.forEach(detach);
			t111 = claim_text(p25_nodes, ", but I'm not sure of it yet. Anyone interested can help check.");
			p25_nodes.forEach(detach);
			section2_nodes.forEach(detach);
			t112 = claim_space(nodes);
			section3 = claim_element(nodes, "SECTION", {});
			var section3_nodes = children(section3);
			h22 = claim_element(section3_nodes, "H2", {});
			var h22_nodes = children(h22);
			a8 = claim_element(h22_nodes, "A", { href: true, id: true });
			var a8_nodes = children(a8);
			t113 = claim_text(a8_nodes, "Act III - Terser");
			a8_nodes.forEach(detach);
			h22_nodes.forEach(detach);
			t114 = claim_space(section3_nodes);
			p26 = claim_element(section3_nodes, "P", {});
			var p26_nodes = children(p26);
			t115 = claim_text(p26_nodes, "The circumstances left me with no choice. I needed to face the cryptic minified code.");
			p26_nodes.forEach(detach);
			t116 = claim_space(section3_nodes);
			p27 = claim_element(section3_nodes, "P", {});
			var p27_nodes = children(p27);
			t117 = claim_text(p27_nodes, "Luckily VSCode still able to open the huge minified file, and able to set the cursor to the right line and column:");
			p27_nodes.forEach(detach);
			t118 = claim_space(section3_nodes);
			pre8 = claim_element(section3_nodes, "PRE", { class: true });
			var pre8_nodes = children(pre8);
			pre8_nodes.forEach(detach);
			t119 = claim_space(section3_nodes);
			p28 = claim_element(section3_nodes, "P", {});
			var p28_nodes = children(p28);
			t120 = claim_text(p28_nodes, "(By the way, in the minified code, all the code is in one line. 🤦‍♂️)");
			p28_nodes.forEach(detach);
			t121 = claim_space(section3_nodes);
			p29 = claim_element(section3_nodes, "P", {});
			var p29_nodes = children(p29);
			t122 = claim_text(p29_nodes, "Well, this may seem like the right place to throw the ");
			code17 = claim_element(p29_nodes, "CODE", {});
			var code17_nodes = children(code17);
			t123 = claim_text(code17_nodes, "\"Cannot read property 'name' of undefined\"");
			code17_nodes.forEach(detach);
			t124 = claim_text(p29_nodes, " error.");
			p29_nodes.forEach(detach);
			t125 = claim_space(section3_nodes);
			p30 = claim_element(section3_nodes, "P", {});
			var p30_nodes = children(p30);
			t126 = claim_text(p30_nodes, "To understand what is going on in this line, I cloned ");
			a9 = claim_element(p30_nodes, "A", { href: true, rel: true });
			var a9_nodes = children(a9);
			t127 = claim_text(a9_nodes, "terser");
			a9_nodes.forEach(detach);
			t128 = claim_text(p30_nodes, ", checked out to the version tag that was installed in our codebase, and tried to figure out where that line was in the original code.");
			p30_nodes.forEach(detach);
			t129 = claim_space(section3_nodes);
			p31 = claim_element(section3_nodes, "P", {});
			var p31_nodes = children(p31);
			strong4 = claim_element(p31_nodes, "STRONG", {});
			var strong4_nodes = children(strong4);
			t130 = claim_text(strong4_nodes, "Tip:");
			strong4_nodes.forEach(detach);
			t131 = claim_text(p31_nodes, " String, property and method names are usually the best marker to trace a ");
			a10 = claim_element(p31_nodes, "A", { href: true, rel: true });
			var a10_nodes = children(a10);
			t132 = claim_text(a10_nodes, "mangled code");
			a10_nodes.forEach(detach);
			t133 = claim_text(p31_nodes, ". Even though all the variables have mangled into a single character variable name, you can still clearly see the method ");
			code18 = claim_element(p31_nodes, "CODE", {});
			var code18_nodes = children(code18);
			t134 = claim_text(code18_nodes, "has_directive()");
			code18_nodes.forEach(detach);
			t135 = claim_text(p31_nodes, " and the string ");
			code19 = claim_element(p31_nodes, "CODE", {});
			var code19_nodes = children(code19);
			t136 = claim_text(code19_nodes, "\"use strict\"");
			code19_nodes.forEach(detach);
			t137 = claim_text(p31_nodes, ".");
			p31_nodes.forEach(detach);
			t138 = claim_space(section3_nodes);
			p32 = claim_element(section3_nodes, "P", {});
			var p32_nodes = children(p32);
			t139 = claim_text(p32_nodes, "Conversely, please don't write long windy property / method names, it doesn't mangle well.");
			p32_nodes.forEach(detach);
			t140 = claim_space(section3_nodes);
			p33 = claim_element(section3_nodes, "P", {});
			var p33_nodes = children(p33);
			t141 = claim_text(p33_nodes, "So I global searched the keyword ");
			code20 = claim_element(p33_nodes, "CODE", {});
			var code20_nodes = children(code20);
			t142 = claim_text(code20_nodes, "has_directive(\"use strict\")");
			code20_nodes.forEach(detach);
			t143 = claim_text(p33_nodes, " and landed with a small number of results, which I looked through every one of them and ended up with the following line:");
			p33_nodes.forEach(detach);
			t144 = claim_space(section3_nodes);
			pre9 = claim_element(section3_nodes, "PRE", { class: true });
			var pre9_nodes = children(pre9);
			pre9_nodes.forEach(detach);
			t145 = claim_space(section3_nodes);
			p34 = claim_element(section3_nodes, "P", {});
			var p34_nodes = children(p34);
			t146 = claim_text(p34_nodes, "Which I was and still am clueless of what this code was trying to do.");
			p34_nodes.forEach(detach);
			t147 = claim_space(section3_nodes);
			p35 = claim_element(section3_nodes, "P", {});
			var p35_nodes = children(p35);
			t148 = claim_text(p35_nodes, "So I did the most reasonable thing, add a ");
			code21 = claim_element(p35_nodes, "CODE", {});
			var code21_nodes = children(code21);
			t149 = claim_text(code21_nodes, "console.log(node)");
			code21_nodes.forEach(detach);
			t150 = claim_text(p35_nodes, ".");
			p35_nodes.forEach(detach);
			t151 = claim_space(section3_nodes);
			pre10 = claim_element(section3_nodes, "PRE", { class: true });
			var pre10_nodes = children(pre10);
			pre10_nodes.forEach(detach);
			t152 = claim_space(section3_nodes);
			p36 = claim_element(section3_nodes, "P", {});
			var p36_nodes = children(p36);
			t153 = claim_text(p36_nodes, "I found out that the ");
			code22 = claim_element(p36_nodes, "CODE", {});
			var code22_nodes = children(code22);
			t154 = claim_text(code22_nodes, "node");
			code22_nodes.forEach(detach);
			t155 = claim_text(p36_nodes, " is an object, that does not have a property ");
			code23 = claim_element(p36_nodes, "CODE", {});
			var code23_nodes = children(code23);
			t156 = claim_text(code23_nodes, "key");
			code23_nodes.forEach(detach);
			t157 = claim_text(p36_nodes, ", which explains the error. And ");
			code24 = claim_element(p36_nodes, "CODE", {});
			var code24_nodes = children(code24);
			t158 = claim_text(code24_nodes, "node");
			code24_nodes.forEach(detach);
			t159 = claim_text(p36_nodes, " has a property call ");
			code25 = claim_element(p36_nodes, "CODE", {});
			var code25_nodes = children(code25);
			t160 = claim_text(code25_nodes, "name");
			code25_nodes.forEach(detach);
			t161 = claim_text(p36_nodes, " that has a value ");
			code26 = claim_element(p36_nodes, "CODE", {});
			var code26_nodes = children(code26);
			t162 = claim_text(code26_nodes, "\"foobar\"");
			code26_nodes.forEach(detach);
			t163 = claim_text(p36_nodes, ", which I assumed is a variable name in our codebase. Luckily ");
			code27 = claim_element(p36_nodes, "CODE", {});
			var code27_nodes = children(code27);
			t164 = claim_text(code27_nodes, "foobar");
			code27_nodes.forEach(detach);
			t165 = claim_text(p36_nodes, " wasn't commonly used in our codebase, and I managed to find only 1 instance of it, and astonishingly, the code was last changed 1 year ago!");
			p36_nodes.forEach(detach);
			t166 = claim_space(section3_nodes);
			p37 = claim_element(section3_nodes, "P", {});
			var p37_nodes = children(p37);
			t167 = claim_text(p37_nodes, "So Terser just decided to break, without a sign, on a line of code that was written 1 year ago. This is the life of a programmer.");
			p37_nodes.forEach(detach);
			section3_nodes.forEach(detach);
			t168 = claim_space(nodes);
			section4 = claim_element(nodes, "SECTION", {});
			var section4_nodes = children(section4);
			h23 = claim_element(section4_nodes, "H2", {});
			var h23_nodes = children(h23);
			a11 = claim_element(h23_nodes, "A", { href: true, id: true });
			var a11_nodes = children(a11);
			t169 = claim_text(a11_nodes, "Final Act - The Resolution");
			a11_nodes.forEach(detach);
			h23_nodes.forEach(detach);
			t170 = claim_space(section4_nodes);
			p38 = claim_element(section4_nodes, "P", {});
			var p38_nodes = children(p38);
			t171 = claim_text(p38_nodes, "I kind of concluded that the root cause was a Terser bug, (because I can't just change the code that wasn't touched for nearly 1 year for no good reason), so the obvious thing to do next was to figured out whether someone fixed it on Terser upstream.");
			p38_nodes.forEach(detach);
			t172 = claim_space(section4_nodes);
			p39 = claim_element(section4_nodes, "P", {});
			var p39_nodes = children(p39);
			t173 = claim_text(p39_nodes, "So, I checked out the master branch of Terser, found out the code has changed to");
			p39_nodes.forEach(detach);
			t174 = claim_space(section4_nodes);
			pre11 = claim_element(section4_nodes, "PRE", { class: true });
			var pre11_nodes = children(pre11);
			pre11_nodes.forEach(detach);
			t175 = claim_space(section4_nodes);
			p40 = claim_element(section4_nodes, "P", {});
			var p40_nodes = children(p40);
			code28 = claim_element(p40_nodes, "CODE", {});
			var code28_nodes = children(code28);
			t176 = claim_text(code28_nodes, "node.key");
			code28_nodes.forEach(detach);
			t177 = claim_text(p40_nodes, " is checked to be existed before checking ");
			code29 = claim_element(p40_nodes, "CODE", {});
			var code29_nodes = children(code29);
			t178 = claim_text(code29_nodes, "node.key.name");
			code29_nodes.forEach(detach);
			t179 = claim_text(p40_nodes, ". What a simple patch!");
			p40_nodes.forEach(detach);
			t180 = claim_space(section4_nodes);
			p41 = claim_element(section4_nodes, "P", {});
			var p41_nodes = children(p41);
			t181 = claim_text(p41_nodes, "The next thing I needed to figure out was when was this fix landed, whether I can upgrade it.");
			p41_nodes.forEach(detach);
			t182 = claim_space(section4_nodes);
			p42 = claim_element(section4_nodes, "P", {});
			var p42_nodes = children(p42);
			t183 = claim_text(p42_nodes, "The Terser in the codebase was one major version behind the latest Terser version, so, I was more reserved to upgrade to the latest version.");
			p42_nodes.forEach(detach);
			t184 = claim_space(section4_nodes);
			p43 = claim_element(section4_nodes, "P", {});
			var p43_nodes = children(p43);
			t185 = claim_text(p43_nodes, "The git blame for the line of code was for some code refactoring, so I went to Github to trace the blame.");
			p43_nodes.forEach(detach);
			t186 = claim_space(section4_nodes);
			p44 = claim_element(section4_nodes, "P", {});
			var p44_nodes = children(p44);
			strong5 = claim_element(p44_nodes, "STRONG", {});
			var strong5_nodes = children(strong5);
			t187 = claim_text(strong5_nodes, "Tip:");
			strong5_nodes.forEach(detach);
			t188 = claim_text(p44_nodes, " Github blame has this very useful button, that allows you to view blame prior to the change.");
			p44_nodes.forEach(detach);
			t189 = claim_space(section4_nodes);
			p45 = claim_element(section4_nodes, "P", {});
			var p45_nodes = children(p45);
			img = claim_element(p45_nodes, "IMG", { src: true, alt: true });
			p45_nodes.forEach(detach);
			t190 = claim_space(section4_nodes);
			p46 = claim_element(section4_nodes, "P", {});
			var p46_nodes = children(p46);
			t191 = claim_text(p46_nodes, "A few blame traces later, I ended up with a commit that fixed the bug:");
			p46_nodes.forEach(detach);
			t192 = claim_space(section4_nodes);
			blockquote = claim_element(section4_nodes, "BLOCKQUOTE", {});
			var blockquote_nodes = children(blockquote);
			p47 = claim_element(blockquote_nodes, "P", {});
			var p47_nodes = children(p47);
			a12 = claim_element(p47_nodes, "A", { href: true, rel: true });
			var a12_nodes = children(a12);
			t193 = claim_text(a12_nodes, "fix node.key crashing lib/compress by hytromo · Pull Request #286 · terser/terser");
			a12_nodes.forEach(detach);
			p47_nodes.forEach(detach);
			blockquote_nodes.forEach(detach);
			t194 = claim_space(section4_nodes);
			p48 = claim_element(section4_nodes, "P", {});
			var p48_nodes = children(p48);
			t195 = claim_text(p48_nodes, "By looking at the MR merged date, I found that the commit was landed in between ");
			a13 = claim_element(p48_nodes, "A", { href: true, rel: true });
			var a13_nodes = children(a13);
			t196 = claim_text(a13_nodes, "v3.16.0 and v3.17.0");
			a13_nodes.forEach(detach);
			t197 = claim_text(p48_nodes, ".");
			p48_nodes.forEach(detach);
			t198 = claim_space(section4_nodes);
			p49 = claim_element(section4_nodes, "P", {});
			var p49_nodes = children(p49);
			t199 = claim_text(p49_nodes, "v3.17.0 was a minor version bump for our codebase, so I assumed it has no breaking changes.");
			p49_nodes.forEach(detach);
			t200 = claim_space(section4_nodes);
			p50 = claim_element(section4_nodes, "P", {});
			var p50_nodes = children(p50);
			code30 = claim_element(p50_nodes, "CODE", {});
			var code30_nodes = children(code30);
			t201 = claim_text(code30_nodes, "terser");
			code30_nodes.forEach(detach);
			t202 = claim_text(p50_nodes, " was installed as a dependency of ");
			code31 = claim_element(p50_nodes, "CODE", {});
			var code31_nodes = children(code31);
			t203 = claim_text(code31_nodes, "terser-webpack-plugin");
			code31_nodes.forEach(detach);
			t204 = claim_text(p50_nodes, ", which we had no control on the terser version, so I added a resolution to our ");
			code32 = claim_element(p50_nodes, "CODE", {});
			var code32_nodes = children(code32);
			t205 = claim_text(code32_nodes, "package.json");
			code32_nodes.forEach(detach);
			t206 = claim_text(p50_nodes, ":");
			p50_nodes.forEach(detach);
			t207 = claim_space(section4_nodes);
			pre12 = claim_element(section4_nodes, "PRE", { class: true });
			var pre12_nodes = children(pre12);
			pre12_nodes.forEach(detach);
			t208 = claim_space(section4_nodes);
			p51 = claim_element(section4_nodes, "P", {});
			var p51_nodes = children(p51);
			t209 = claim_text(p51_nodes, "After I upgraded terser, I build the code again.");
			p51_nodes.forEach(detach);
			t210 = claim_space(section4_nodes);
			p52 = claim_element(section4_nodes, "P", {});
			var p52_nodes = children(p52);
			t211 = claim_text(p52_nodes, "The build was successful! 🎉");
			p52_nodes.forEach(detach);
			section4_nodes.forEach(detach);
			t212 = claim_space(nodes);
			section5 = claim_element(nodes, "SECTION", {});
			var section5_nodes = children(section5);
			h24 = claim_element(section5_nodes, "H2", {});
			var h24_nodes = children(h24);
			a14 = claim_element(h24_nodes, "A", { href: true, id: true });
			var a14_nodes = children(a14);
			t213 = claim_text(a14_nodes, "Closing Note");
			a14_nodes.forEach(detach);
			h24_nodes.forEach(detach);
			t214 = claim_space(section5_nodes);
			p53 = claim_element(section5_nodes, "P", {});
			var p53_nodes = children(p53);
			t215 = claim_text(p53_nodes, "As I was explaining all these to my colleague, I realised that should I upgraded the terser once I found out that it was a terser error, it would have fixed the bug as well. I wouldn't need to go through all these to end up in the same fix.");
			p53_nodes.forEach(detach);
			t216 = claim_space(section5_nodes);
			p54 = claim_element(section5_nodes, "P", {});
			var p54_nodes = children(p54);
			t217 = claim_text(p54_nodes, "Oh well. 🤷‍♂️");
			p54_nodes.forEach(detach);
			section5_nodes.forEach(detach);
			this.h();
		},
		h() {
			attr(a0, "href", "#act-i-the-first-attempt");
			attr(a1, "href", "#act-ii-terser-webpack-plugin");
			attr(a2, "href", "#act-iii-terser");
			attr(a3, "href", "#final-act-the-resolution");
			attr(a4, "href", "#closing-note");
			attr(ul0, "class", "sitemap");
			attr(ul0, "id", "sitemap");
			attr(ul0, "role", "navigation");
			attr(ul0, "aria-label", "Table of Contents");
			attr(pre0, "class", "language-null");
			attr(a5, "href", "#act-i-the-first-attempt");
			attr(a5, "id", "act-i-the-first-attempt");
			attr(pre1, "class", "language-js");
			attr(pre2, "class", "language-js");
			attr(pre3, "class", "language-null");
			attr(pre4, "class", "language-null");
			attr(a6, "href", "#act-ii-terser-webpack-plugin");
			attr(a6, "id", "act-ii-terser-webpack-plugin");
			attr(pre5, "class", "language-js");
			attr(a7, "href", "https://blittle.github.io/chrome-dev-tools/sources/conditional-breakpoints.html");
			attr(a7, "rel", "nofollow");
			attr(pre6, "class", "language-js");
			attr(pre7, "class", "language-null");
			attr(a8, "href", "#act-iii-terser");
			attr(a8, "id", "act-iii-terser");
			attr(pre8, "class", "language-js");
			attr(a9, "href", "https://github.com/terser/terser");
			attr(a9, "rel", "nofollow");
			attr(a10, "href", "http://lisperator.net/uglifyjs/mangle");
			attr(a10, "rel", "nofollow");
			attr(pre9, "class", "language-js");
			attr(pre10, "class", "language-js");
			attr(a11, "href", "#final-act-the-resolution");
			attr(a11, "id", "final-act-the-resolution");
			attr(pre11, "class", "language-js");
			if (img.src !== (img_src_value = __build_img__0)) attr(img, "src", img_src_value);
			attr(img, "alt", "Github: view blame prior to the change");
			attr(a12, "href", "https://github.com/terser/terser/pull/286");
			attr(a12, "rel", "nofollow");
			attr(a13, "href", "https://github.com/terser/terser/compare/v3.16.0...v3.17.0");
			attr(a13, "rel", "nofollow");
			attr(pre12, "class", "language-json");
			attr(a14, "href", "#closing-note");
			attr(a14, "id", "closing-note");
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
			insert(target, t5, anchor);
			insert(target, p0, anchor);
			append(p0, t6);
			insert(target, t7, anchor);
			insert(target, p1, anchor);
			append(p1, t8);
			insert(target, t9, anchor);
			insert(target, pre0, anchor);
			pre0.innerHTML = raw0_value;
			insert(target, t10, anchor);
			insert(target, p2, anchor);
			append(p2, t11);
			insert(target, t12, anchor);
			insert(target, p3, anchor);
			append(p3, strong0);
			append(strong0, t13);
			insert(target, t14, anchor);
			insert(target, section1, anchor);
			append(section1, h20);
			append(h20, a5);
			append(a5, t15);
			append(section1, t16);
			append(section1, p4);
			append(p4, t17);
			append(p4, code0);
			append(code0, t18);
			append(p4, t19);
			append(p4, code1);
			append(code1, t20);
			append(p4, t21);
			append(section1, t22);
			append(section1, pre1);
			pre1.innerHTML = raw1_value;
			append(section1, t23);
			append(section1, p5);
			append(p5, t24);
			append(section1, t25);
			append(section1, p6);
			append(p6, t26);
			append(section1, t27);
			append(section1, pre2);
			pre2.innerHTML = raw2_value;
			append(section1, t28);
			append(section1, p7);
			append(p7, t29);
			append(section1, t30);
			append(section1, pre3);
			pre3.innerHTML = raw3_value;
			append(section1, t31);
			append(section1, p8);
			append(p8, t32);
			append(p8, em);
			append(em, t33);
			append(section1, t34);
			append(section1, p9);
			append(p9, t35);
			append(section1, t36);
			append(section1, p10);
			append(p10, code2);
			append(code2, t37);
			append(p10, t38);
			append(section1, t39);
			append(section1, p11);
			append(p11, t40);
			append(section1, t41);
			append(section1, pre4);
			pre4.innerHTML = raw4_value;
			append(section1, t42);
			append(section1, p12);
			append(p12, t43);
			append(section1, t44);
			append(section1, p13);
			append(p13, t45);
			insert(target, t46, anchor);
			insert(target, section2, anchor);
			append(section2, h21);
			append(h21, a6);
			append(a6, t47);
			append(section2, t48);
			append(section2, p14);
			append(p14, t49);
			append(section2, t50);
			append(section2, p15);
			append(p15, t51);
			append(p15, code3);
			append(code3, t52);
			append(p15, t53);
			append(section2, t54);
			append(section2, p16);
			append(p16, t55);
			append(p16, code4);
			append(code4, t56);
			append(p16, t57);
			append(p16, code5);
			append(code5, t58);
			append(p16, t59);
			append(section2, t60);
			append(section2, p17);
			append(p17, strong1);
			append(strong1, t61);
			append(p17, t62);
			append(p17, code6);
			append(code6, t63);
			append(p17, t64);
			append(p17, code7);
			append(code7, t65);
			append(p17, t66);
			append(p17, code8);
			append(code8, t67);
			append(p17, t68);
			append(section2, t69);
			append(section2, p18);
			append(p18, t70);
			append(section2, t71);
			append(section2, pre5);
			pre5.innerHTML = raw5_value;
			append(section2, t72);
			append(section2, p19);
			append(p19, t73);
			append(p19, code9);
			append(code9, t74);
			append(p19, t75);
			append(p19, code10);
			append(code10, t76);
			append(p19, t77);
			append(p19, code11);
			append(code11, t78);
			append(p19, t79);
			append(p19, code12);
			append(code12, t80);
			append(p19, t81);
			append(section2, t82);
			append(section2, p20);
			append(p20, t83);
			append(p20, code13);
			append(code13, t84);
			append(p20, t85);
			append(section2, t86);
			append(section2, p21);
			append(p21, strong2);
			append(strong2, t87);
			append(p21, t88);
			append(section2, t89);
			append(section2, ul1);
			append(ul1, li5);
			append(li5, t90);
			append(li5, a7);
			append(a7, t91);
			append(li5, t92);
			append(ul1, t93);
			append(ul1, li6);
			append(li6, t94);
			append(section2, t95);
			append(section2, pre6);
			pre6.innerHTML = raw6_value;
			append(section2, t96);
			append(section2, p22);
			append(p22, t97);
			append(section2, t98);
			append(section2, p23);
			append(p23, t99);
			append(p23, code14);
			append(code14, t100);
			append(p23, t101);
			append(section2, t102);
			append(section2, pre7);
			pre7.innerHTML = raw7_value;
			append(section2, t103);
			append(section2, p24);
			append(p24, t104);
			append(section2, t105);
			append(section2, p25);
			append(p25, strong3);
			append(strong3, t106);
			append(p25, t107);
			append(p25, code15);
			append(code15, t108);
			append(p25, t109);
			append(p25, code16);
			append(code16, t110);
			append(p25, t111);
			insert(target, t112, anchor);
			insert(target, section3, anchor);
			append(section3, h22);
			append(h22, a8);
			append(a8, t113);
			append(section3, t114);
			append(section3, p26);
			append(p26, t115);
			append(section3, t116);
			append(section3, p27);
			append(p27, t117);
			append(section3, t118);
			append(section3, pre8);
			pre8.innerHTML = raw8_value;
			append(section3, t119);
			append(section3, p28);
			append(p28, t120);
			append(section3, t121);
			append(section3, p29);
			append(p29, t122);
			append(p29, code17);
			append(code17, t123);
			append(p29, t124);
			append(section3, t125);
			append(section3, p30);
			append(p30, t126);
			append(p30, a9);
			append(a9, t127);
			append(p30, t128);
			append(section3, t129);
			append(section3, p31);
			append(p31, strong4);
			append(strong4, t130);
			append(p31, t131);
			append(p31, a10);
			append(a10, t132);
			append(p31, t133);
			append(p31, code18);
			append(code18, t134);
			append(p31, t135);
			append(p31, code19);
			append(code19, t136);
			append(p31, t137);
			append(section3, t138);
			append(section3, p32);
			append(p32, t139);
			append(section3, t140);
			append(section3, p33);
			append(p33, t141);
			append(p33, code20);
			append(code20, t142);
			append(p33, t143);
			append(section3, t144);
			append(section3, pre9);
			pre9.innerHTML = raw9_value;
			append(section3, t145);
			append(section3, p34);
			append(p34, t146);
			append(section3, t147);
			append(section3, p35);
			append(p35, t148);
			append(p35, code21);
			append(code21, t149);
			append(p35, t150);
			append(section3, t151);
			append(section3, pre10);
			pre10.innerHTML = raw10_value;
			append(section3, t152);
			append(section3, p36);
			append(p36, t153);
			append(p36, code22);
			append(code22, t154);
			append(p36, t155);
			append(p36, code23);
			append(code23, t156);
			append(p36, t157);
			append(p36, code24);
			append(code24, t158);
			append(p36, t159);
			append(p36, code25);
			append(code25, t160);
			append(p36, t161);
			append(p36, code26);
			append(code26, t162);
			append(p36, t163);
			append(p36, code27);
			append(code27, t164);
			append(p36, t165);
			append(section3, t166);
			append(section3, p37);
			append(p37, t167);
			insert(target, t168, anchor);
			insert(target, section4, anchor);
			append(section4, h23);
			append(h23, a11);
			append(a11, t169);
			append(section4, t170);
			append(section4, p38);
			append(p38, t171);
			append(section4, t172);
			append(section4, p39);
			append(p39, t173);
			append(section4, t174);
			append(section4, pre11);
			pre11.innerHTML = raw11_value;
			append(section4, t175);
			append(section4, p40);
			append(p40, code28);
			append(code28, t176);
			append(p40, t177);
			append(p40, code29);
			append(code29, t178);
			append(p40, t179);
			append(section4, t180);
			append(section4, p41);
			append(p41, t181);
			append(section4, t182);
			append(section4, p42);
			append(p42, t183);
			append(section4, t184);
			append(section4, p43);
			append(p43, t185);
			append(section4, t186);
			append(section4, p44);
			append(p44, strong5);
			append(strong5, t187);
			append(p44, t188);
			append(section4, t189);
			append(section4, p45);
			append(p45, img);
			append(section4, t190);
			append(section4, p46);
			append(p46, t191);
			append(section4, t192);
			append(section4, blockquote);
			append(blockquote, p47);
			append(p47, a12);
			append(a12, t193);
			append(section4, t194);
			append(section4, p48);
			append(p48, t195);
			append(p48, a13);
			append(a13, t196);
			append(p48, t197);
			append(section4, t198);
			append(section4, p49);
			append(p49, t199);
			append(section4, t200);
			append(section4, p50);
			append(p50, code30);
			append(code30, t201);
			append(p50, t202);
			append(p50, code31);
			append(code31, t203);
			append(p50, t204);
			append(p50, code32);
			append(code32, t205);
			append(p50, t206);
			append(section4, t207);
			append(section4, pre12);
			pre12.innerHTML = raw12_value;
			append(section4, t208);
			append(section4, p51);
			append(p51, t209);
			append(section4, t210);
			append(section4, p52);
			append(p52, t211);
			insert(target, t212, anchor);
			insert(target, section5, anchor);
			append(section5, h24);
			append(h24, a14);
			append(a14, t213);
			append(section5, t214);
			append(section5, p53);
			append(p53, t215);
			append(section5, t216);
			append(section5, p54);
			append(p54, t217);
		},
		p: noop,
		d(detaching) {
			if (detaching) detach(section0);
			if (detaching) detach(t5);
			if (detaching) detach(p0);
			if (detaching) detach(t7);
			if (detaching) detach(p1);
			if (detaching) detach(t9);
			if (detaching) detach(pre0);
			if (detaching) detach(t10);
			if (detaching) detach(p2);
			if (detaching) detach(t12);
			if (detaching) detach(p3);
			if (detaching) detach(t14);
			if (detaching) detach(section1);
			if (detaching) detach(t46);
			if (detaching) detach(section2);
			if (detaching) detach(t112);
			if (detaching) detach(section3);
			if (detaching) detach(t168);
			if (detaching) detach(section4);
			if (detaching) detach(t212);
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
	"title": "Debugging Story: Build failed, error from Terser",
	"date": "2020-01-08T08:00:00Z",
	"tags": ["debugging"],
	"description": "It all started with an error message during the build: 'ERROR in bundle.xxx.js from Terser'.",
	"slug": "debugging-build-failed-error-from-terser",
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
