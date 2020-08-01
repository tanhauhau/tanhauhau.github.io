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

var __build_img__3 = "de8e3ee6e82019d1.png";

var __build_img__2 = "290837455fa987e5.png";

var __build_img__1 = "0cf8eaf1f058ddd0.png";

var __build_img__0 = "8ac1c8e1326d8b89.png";

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

var baseCss = "http://127.0.0.1:8080/random-stuff-i-learned-from-browser-console/assets/_blog-299aa480.css";

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
					"@id": "http%3A%2F%2F127.0.0.1%3A8080%2Frandom-stuff-i-learned-from-browser-console",
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
			link = element("link");
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
			const head_nodes = query_selector_all("[data-svelte=\"svelte-1k4ncsr\"]", document.head);
			link = claim_element(head_nodes, "LINK", { href: true, rel: true });
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
			attr(link, "href", baseCss);
			attr(link, "rel", "stylesheet");
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
			attr(meta11, "content", "http%3A%2F%2F127.0.0.1%3A8080%2Frandom-stuff-i-learned-from-browser-console");
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
			append(document.head, link);
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
							"@id": "http%3A%2F%2F127.0.0.1%3A8080%2Frandom-stuff-i-learned-from-browser-console",
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
			detach(link);
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

/* content/blog/random-stuff-i-learned-from-browser-console/@@page-markup.svelte generated by Svelte v3.24.0 */

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
	let p0;
	let t6;
	let t7;
	let p1;
	let img0;
	let img0_src_value;
	let t8;
	let p2;
	let t9;
	let t10;
	let section1;
	let h20;
	let a5;
	let t11;
	let t12;
	let p3;
	let t13;
	let strong0;
	let t14;
	let t15;
	let p4;
	let t16;
	let t17;
	let p5;
	let img1;
	let img1_src_value;
	let t18;
	let t19;
	let p6;
	let img2;
	let img2_src_value;
	let t20;
	let t21;
	let p7;
	let t22;
	let t23;
	let section2;
	let h21;
	let a6;
	let t24;
	let t25;
	let p8;
	let t26;
	let a7;
	let t27;
	let t28;
	let t29;
	let section3;
	let h22;
	let a8;
	let t30;
	let t31;
	let p9;
	let t32;
	let strong1;
	let t33;
	let t34;
	let t35;
	let p10;
	let t36;
	let a9;
	let t37;
	let t38;
	let t39;
	let section4;
	let h23;
	let a10;
	let t40;
	let t41;
	let p11;
	let t42;
	let a11;
	let t43;
	let t44;
	let t45;
	let p12;
	let t46;
	let a12;
	let t47;
	let t48;
	let t49;
	let p13;
	let t50;
	let t51;
	let p14;
	let t52;
	let t53;
	let p15;
	let t54;
	let t55;
	let pre;

	let raw_value = `
<code class="language-js"><span class="token keyword">var</span> express <span class="token operator">=</span> <span class="token function">require</span><span class="token punctuation">(</span><span class="token string">'express'</span><span class="token punctuation">)</span><span class="token punctuation">,</span>
        app <span class="token operator">=</span> <span class="token function">express</span><span class="token punctuation">(</span><span class="token punctuation">)</span><span class="token punctuation">,</span>
	hr <span class="token operator">=</span> <span class="token function">require</span><span class="token punctuation">(</span><span class="token string">'express-console-warning'</span><span class="token punctuation">)</span><span class="token punctuation">;</span>
	
app<span class="token punctuation">.</span><span class="token method function property-access">use</span><span class="token punctuation">(</span>hr<span class="token punctuation">.</span><span class="token constant">LOG</span><span class="token punctuation">(</span><span class="token string">'Hello world'</span><span class="token punctuation">)</span>
	  <span class="token punctuation">.</span><span class="token method function property-access">text</span><span class="token punctuation">(</span><span class="token string">'This is a blue text'</span><span class="token punctuation">,</span> <span class="token punctuation">&#123;</span>color<span class="token punctuation">:</span> <span class="token string">'blue'</span><span class="token punctuation">,</span> fontSize<span class="token punctuation">:</span> <span class="token string">'x-large'</span><span class="token punctuation">&#125;</span><span class="token punctuation">)</span>
	  <span class="token punctuation">.</span><span class="token method function property-access">text</span><span class="token punctuation">(</span><span class="token string">'and this is red'</span><span class="token punctuation">,</span> <span class="token punctuation">&#123;</span>color<span class="token punctuation">:</span> <span class="token string">'red'</span><span class="token punctuation">,</span> fontSize<span class="token punctuation">:</span> <span class="token string">'x-large'</span><span class="token punctuation">&#125;</span><span class="token punctuation">)</span>
	  <span class="token punctuation">.</span><span class="token method function property-access">image</span><span class="token punctuation">(</span><span class="token string">'http://memesvault.com/wp-content/uploads/Best-Meme-Faces-14.png'</span><span class="token punctuation">,</span><span class="token number">0.1</span><span class="token punctuation">)</span>
	  <span class="token punctuation">.</span><span class="token method function property-access">build</span><span class="token punctuation">(</span><span class="token punctuation">)</span><span class="token punctuation">)</span><span class="token punctuation">;</span>
app<span class="token punctuation">.</span><span class="token method function property-access">use</span><span class="token punctuation">(</span>express<span class="token punctuation">.</span><span class="token method function property-access">static</span><span class="token punctuation">(</span><span class="token string">'client'</span><span class="token punctuation">)</span><span class="token punctuation">)</span><span class="token punctuation">;</span></code>` + "";

	let t56;
	let p16;
	let t57;
	let t58;
	let p17;
	let img3;
	let img3_src_value;
	let t59;
	let p18;
	let em;
	let t60;
	let t61;
	let section5;
	let h24;
	let a13;
	let t62;
	let t63;
	let p19;
	let t64;
	let t65;
	let p20;
	let t66;
	let a14;
	let t67;
	let t68;
	let a15;
	let t69;

	return {
		c() {
			section0 = element("section");
			ul = element("ul");
			li0 = element("li");
			a0 = element("a");
			t0 = text("1. Is Facebook the only site that leaves message in the console?");
			li1 = element("li");
			a1 = element("a");
			t1 = text("2. How did the Facebook printed out a styled text in the console?");
			li2 = element("li");
			a2 = element("a");
			t2 = text("3. So can the console print out images?");
			li3 = element("li");
			a3 = element("a");
			t3 = text("So, why not create an express middleware for this?");
			li4 = element("li");
			a4 = element("a");
			t4 = text("Conclusion");
			t5 = space();
			p0 = element("p");
			t6 = text("On one normal day, I opened up my browser’s developer console for no reason. The page I was on, at that moment, was Facebook. And I saw a big red “Stop” in the console, and followed by a big bolded text of “This is a browser feature intended for developers….”.");
			t7 = space();
			p1 = element("p");
			img0 = element("img");
			t8 = space();
			p2 = element("p");
			t9 = text("I paused for a while, amazed by what I’ve discovered randomly. This is quite interesting and I have two questions come up to my mind.");
			t10 = space();
			section1 = element("section");
			h20 = element("h2");
			a5 = element("a");
			t11 = text("1. Is Facebook the only site that leaves message in the console?");
			t12 = space();
			p3 = element("p");
			t13 = text("It turns out to be ");
			strong0 = element("strong");
			t14 = text("NO. It’s not just Facebook.");
			t15 = space();
			p4 = element("p");
			t16 = text("This is what I found out after some random searches: Oculus and Coursera are hiring people through the console!");
			t17 = space();
			p5 = element("p");
			img1 = element("img");
			t18 = text("\nOculus hiring people through the console");
			t19 = space();
			p6 = element("p");
			img2 = element("img");
			t20 = text("\nCoursera did the same thing too!");
			t21 = space();
			p7 = element("p");
			t22 = text("It seems like this is a good place to hire web stack developer. Since the only person who is going to look into the console of your page is a web developer, or a full stack developer, hiring them through your console isn’t a bad idea after all.");
			t23 = space();
			section2 = element("section");
			h21 = element("h2");
			a6 = element("a");
			t24 = text("2. How did the Facebook printed out a styled text in the console?");
			t25 = space();
			p8 = element("p");
			t26 = text("Actually it turns out it is very simple indeed. You can follow ");
			a7 = element("a");
			t27 = text("the StackOverflow thread");
			t28 = text(" to see how it is done.");
			t29 = space();
			section3 = element("section");
			h22 = element("h2");
			a8 = element("a");
			t30 = text("3. So can the console print out images?");
			t31 = space();
			p9 = element("p");
			t32 = text("It’s a ");
			strong1 = element("strong");
			t33 = text("YES");
			t34 = text(" again. But how?");
			t35 = space();
			p10 = element("p");
			t36 = text("You can refer to this awesome ");
			a9 = element("a");
			t37 = text("console.image");
			t38 = text(" library developed by adriancooney. He will explain how he did it to you.");
			t39 = space();
			section4 = element("section");
			h23 = element("h2");
			a10 = element("a");
			t40 = text("So, why not create an express middleware for this?");
			t41 = space();
			p11 = element("p");
			t42 = text("This was the random idea that came out from my mind after seeing websites leaving messages in the console. Why not have an express middleware that injects a script that prints to the console for each html pages served from the ");
			a11 = element("a");
			t43 = text("express server");
			t44 = text(". It should have an simple intuitive API, and should not pollute to the global namespace at all.");
			t45 = space();
			p12 = element("p");
			t46 = text("So, ");
			a12 = element("a");
			t47 = text("this is what I’ve come up");
			t48 = text(".");
			t49 = space();
			p13 = element("p");
			t50 = text("I know, the name is mouthful and awkward. This is because initially I intended the middleware to just print out a warning message. After a bit of consideration, turns out that hiring in the console should be a good use case too. But the name of the package just stuck there.");
			t51 = space();
			p14 = element("p");
			t52 = text("So, how do you use it?");
			t53 = space();
			p15 = element("p");
			t54 = text("It’s simple. See the code snippet below:");
			t55 = space();
			pre = element("pre");
			t56 = space();
			p16 = element("p");
			t57 = text("And there you go.");
			t58 = space();
			p17 = element("p");
			img3 = element("img");
			t59 = space();
			p18 = element("p");
			em = element("em");
			t60 = text("Disclaimer: I did not own the meme. I got the link from Google search just to try out the API.");
			t61 = space();
			section5 = element("section");
			h24 = element("h2");
			a13 = element("a");
			t62 = text("Conclusion");
			t63 = space();
			p19 = element("p");
			t64 = text("So, these are what I’ve learned from a random action (open the developer console) and what I’ve created from it (express-console-warning).");
			t65 = space();
			p20 = element("p");
			t66 = text("express-console-warning ");
			a14 = element("a");
			t67 = text("github");
			t68 = space();
			a15 = element("a");
			t69 = text("npm");
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
			t0 = claim_text(a0_nodes, "1. Is Facebook the only site that leaves message in the console?");
			a0_nodes.forEach(detach);
			li0_nodes.forEach(detach);
			li1 = claim_element(ul_nodes, "LI", {});
			var li1_nodes = children(li1);
			a1 = claim_element(li1_nodes, "A", { href: true });
			var a1_nodes = children(a1);
			t1 = claim_text(a1_nodes, "2. How did the Facebook printed out a styled text in the console?");
			a1_nodes.forEach(detach);
			li1_nodes.forEach(detach);
			li2 = claim_element(ul_nodes, "LI", {});
			var li2_nodes = children(li2);
			a2 = claim_element(li2_nodes, "A", { href: true });
			var a2_nodes = children(a2);
			t2 = claim_text(a2_nodes, "3. So can the console print out images?");
			a2_nodes.forEach(detach);
			li2_nodes.forEach(detach);
			li3 = claim_element(ul_nodes, "LI", {});
			var li3_nodes = children(li3);
			a3 = claim_element(li3_nodes, "A", { href: true });
			var a3_nodes = children(a3);
			t3 = claim_text(a3_nodes, "So, why not create an express middleware for this?");
			a3_nodes.forEach(detach);
			li3_nodes.forEach(detach);
			li4 = claim_element(ul_nodes, "LI", {});
			var li4_nodes = children(li4);
			a4 = claim_element(li4_nodes, "A", { href: true });
			var a4_nodes = children(a4);
			t4 = claim_text(a4_nodes, "Conclusion");
			a4_nodes.forEach(detach);
			li4_nodes.forEach(detach);
			ul_nodes.forEach(detach);
			section0_nodes.forEach(detach);
			t5 = claim_space(nodes);
			p0 = claim_element(nodes, "P", {});
			var p0_nodes = children(p0);
			t6 = claim_text(p0_nodes, "On one normal day, I opened up my browser’s developer console for no reason. The page I was on, at that moment, was Facebook. And I saw a big red “Stop” in the console, and followed by a big bolded text of “This is a browser feature intended for developers….”.");
			p0_nodes.forEach(detach);
			t7 = claim_space(nodes);
			p1 = claim_element(nodes, "P", {});
			var p1_nodes = children(p1);
			img0 = claim_element(p1_nodes, "IMG", { src: true, alt: true });
			p1_nodes.forEach(detach);
			t8 = claim_space(nodes);
			p2 = claim_element(nodes, "P", {});
			var p2_nodes = children(p2);
			t9 = claim_text(p2_nodes, "I paused for a while, amazed by what I’ve discovered randomly. This is quite interesting and I have two questions come up to my mind.");
			p2_nodes.forEach(detach);
			t10 = claim_space(nodes);
			section1 = claim_element(nodes, "SECTION", {});
			var section1_nodes = children(section1);
			h20 = claim_element(section1_nodes, "H2", {});
			var h20_nodes = children(h20);
			a5 = claim_element(h20_nodes, "A", { href: true, id: true });
			var a5_nodes = children(a5);
			t11 = claim_text(a5_nodes, "1. Is Facebook the only site that leaves message in the console?");
			a5_nodes.forEach(detach);
			h20_nodes.forEach(detach);
			t12 = claim_space(section1_nodes);
			p3 = claim_element(section1_nodes, "P", {});
			var p3_nodes = children(p3);
			t13 = claim_text(p3_nodes, "It turns out to be ");
			strong0 = claim_element(p3_nodes, "STRONG", {});
			var strong0_nodes = children(strong0);
			t14 = claim_text(strong0_nodes, "NO. It’s not just Facebook.");
			strong0_nodes.forEach(detach);
			p3_nodes.forEach(detach);
			t15 = claim_space(section1_nodes);
			p4 = claim_element(section1_nodes, "P", {});
			var p4_nodes = children(p4);
			t16 = claim_text(p4_nodes, "This is what I found out after some random searches: Oculus and Coursera are hiring people through the console!");
			p4_nodes.forEach(detach);
			t17 = claim_space(section1_nodes);
			p5 = claim_element(section1_nodes, "P", {});
			var p5_nodes = children(p5);
			img1 = claim_element(p5_nodes, "IMG", { src: true, alt: true });
			t18 = claim_text(p5_nodes, "\nOculus hiring people through the console");
			p5_nodes.forEach(detach);
			t19 = claim_space(section1_nodes);
			p6 = claim_element(section1_nodes, "P", {});
			var p6_nodes = children(p6);
			img2 = claim_element(p6_nodes, "IMG", { src: true, alt: true });
			t20 = claim_text(p6_nodes, "\nCoursera did the same thing too!");
			p6_nodes.forEach(detach);
			t21 = claim_space(section1_nodes);
			p7 = claim_element(section1_nodes, "P", {});
			var p7_nodes = children(p7);
			t22 = claim_text(p7_nodes, "It seems like this is a good place to hire web stack developer. Since the only person who is going to look into the console of your page is a web developer, or a full stack developer, hiring them through your console isn’t a bad idea after all.");
			p7_nodes.forEach(detach);
			section1_nodes.forEach(detach);
			t23 = claim_space(nodes);
			section2 = claim_element(nodes, "SECTION", {});
			var section2_nodes = children(section2);
			h21 = claim_element(section2_nodes, "H2", {});
			var h21_nodes = children(h21);
			a6 = claim_element(h21_nodes, "A", { href: true, id: true });
			var a6_nodes = children(a6);
			t24 = claim_text(a6_nodes, "2. How did the Facebook printed out a styled text in the console?");
			a6_nodes.forEach(detach);
			h21_nodes.forEach(detach);
			t25 = claim_space(section2_nodes);
			p8 = claim_element(section2_nodes, "P", {});
			var p8_nodes = children(p8);
			t26 = claim_text(p8_nodes, "Actually it turns out it is very simple indeed. You can follow ");
			a7 = claim_element(p8_nodes, "A", { href: true, rel: true });
			var a7_nodes = children(a7);
			t27 = claim_text(a7_nodes, "the StackOverflow thread");
			a7_nodes.forEach(detach);
			t28 = claim_text(p8_nodes, " to see how it is done.");
			p8_nodes.forEach(detach);
			section2_nodes.forEach(detach);
			t29 = claim_space(nodes);
			section3 = claim_element(nodes, "SECTION", {});
			var section3_nodes = children(section3);
			h22 = claim_element(section3_nodes, "H2", {});
			var h22_nodes = children(h22);
			a8 = claim_element(h22_nodes, "A", { href: true, id: true });
			var a8_nodes = children(a8);
			t30 = claim_text(a8_nodes, "3. So can the console print out images?");
			a8_nodes.forEach(detach);
			h22_nodes.forEach(detach);
			t31 = claim_space(section3_nodes);
			p9 = claim_element(section3_nodes, "P", {});
			var p9_nodes = children(p9);
			t32 = claim_text(p9_nodes, "It’s a ");
			strong1 = claim_element(p9_nodes, "STRONG", {});
			var strong1_nodes = children(strong1);
			t33 = claim_text(strong1_nodes, "YES");
			strong1_nodes.forEach(detach);
			t34 = claim_text(p9_nodes, " again. But how?");
			p9_nodes.forEach(detach);
			t35 = claim_space(section3_nodes);
			p10 = claim_element(section3_nodes, "P", {});
			var p10_nodes = children(p10);
			t36 = claim_text(p10_nodes, "You can refer to this awesome ");
			a9 = claim_element(p10_nodes, "A", { href: true, rel: true });
			var a9_nodes = children(a9);
			t37 = claim_text(a9_nodes, "console.image");
			a9_nodes.forEach(detach);
			t38 = claim_text(p10_nodes, " library developed by adriancooney. He will explain how he did it to you.");
			p10_nodes.forEach(detach);
			section3_nodes.forEach(detach);
			t39 = claim_space(nodes);
			section4 = claim_element(nodes, "SECTION", {});
			var section4_nodes = children(section4);
			h23 = claim_element(section4_nodes, "H2", {});
			var h23_nodes = children(h23);
			a10 = claim_element(h23_nodes, "A", { href: true, id: true });
			var a10_nodes = children(a10);
			t40 = claim_text(a10_nodes, "So, why not create an express middleware for this?");
			a10_nodes.forEach(detach);
			h23_nodes.forEach(detach);
			t41 = claim_space(section4_nodes);
			p11 = claim_element(section4_nodes, "P", {});
			var p11_nodes = children(p11);
			t42 = claim_text(p11_nodes, "This was the random idea that came out from my mind after seeing websites leaving messages in the console. Why not have an express middleware that injects a script that prints to the console for each html pages served from the ");
			a11 = claim_element(p11_nodes, "A", { href: true, rel: true });
			var a11_nodes = children(a11);
			t43 = claim_text(a11_nodes, "express server");
			a11_nodes.forEach(detach);
			t44 = claim_text(p11_nodes, ". It should have an simple intuitive API, and should not pollute to the global namespace at all.");
			p11_nodes.forEach(detach);
			t45 = claim_space(section4_nodes);
			p12 = claim_element(section4_nodes, "P", {});
			var p12_nodes = children(p12);
			t46 = claim_text(p12_nodes, "So, ");
			a12 = claim_element(p12_nodes, "A", { href: true, rel: true });
			var a12_nodes = children(a12);
			t47 = claim_text(a12_nodes, "this is what I’ve come up");
			a12_nodes.forEach(detach);
			t48 = claim_text(p12_nodes, ".");
			p12_nodes.forEach(detach);
			t49 = claim_space(section4_nodes);
			p13 = claim_element(section4_nodes, "P", {});
			var p13_nodes = children(p13);
			t50 = claim_text(p13_nodes, "I know, the name is mouthful and awkward. This is because initially I intended the middleware to just print out a warning message. After a bit of consideration, turns out that hiring in the console should be a good use case too. But the name of the package just stuck there.");
			p13_nodes.forEach(detach);
			t51 = claim_space(section4_nodes);
			p14 = claim_element(section4_nodes, "P", {});
			var p14_nodes = children(p14);
			t52 = claim_text(p14_nodes, "So, how do you use it?");
			p14_nodes.forEach(detach);
			t53 = claim_space(section4_nodes);
			p15 = claim_element(section4_nodes, "P", {});
			var p15_nodes = children(p15);
			t54 = claim_text(p15_nodes, "It’s simple. See the code snippet below:");
			p15_nodes.forEach(detach);
			t55 = claim_space(section4_nodes);
			pre = claim_element(section4_nodes, "PRE", { class: true });
			var pre_nodes = children(pre);
			pre_nodes.forEach(detach);
			t56 = claim_space(section4_nodes);
			p16 = claim_element(section4_nodes, "P", {});
			var p16_nodes = children(p16);
			t57 = claim_text(p16_nodes, "And there you go.");
			p16_nodes.forEach(detach);
			t58 = claim_space(section4_nodes);
			p17 = claim_element(section4_nodes, "P", {});
			var p17_nodes = children(p17);
			img3 = claim_element(p17_nodes, "IMG", { src: true, alt: true });
			p17_nodes.forEach(detach);
			t59 = claim_space(section4_nodes);
			p18 = claim_element(section4_nodes, "P", {});
			var p18_nodes = children(p18);
			em = claim_element(p18_nodes, "EM", {});
			var em_nodes = children(em);
			t60 = claim_text(em_nodes, "Disclaimer: I did not own the meme. I got the link from Google search just to try out the API.");
			em_nodes.forEach(detach);
			p18_nodes.forEach(detach);
			section4_nodes.forEach(detach);
			t61 = claim_space(nodes);
			section5 = claim_element(nodes, "SECTION", {});
			var section5_nodes = children(section5);
			h24 = claim_element(section5_nodes, "H2", {});
			var h24_nodes = children(h24);
			a13 = claim_element(h24_nodes, "A", { href: true, id: true });
			var a13_nodes = children(a13);
			t62 = claim_text(a13_nodes, "Conclusion");
			a13_nodes.forEach(detach);
			h24_nodes.forEach(detach);
			t63 = claim_space(section5_nodes);
			p19 = claim_element(section5_nodes, "P", {});
			var p19_nodes = children(p19);
			t64 = claim_text(p19_nodes, "So, these are what I’ve learned from a random action (open the developer console) and what I’ve created from it (express-console-warning).");
			p19_nodes.forEach(detach);
			t65 = claim_space(section5_nodes);
			p20 = claim_element(section5_nodes, "P", {});
			var p20_nodes = children(p20);
			t66 = claim_text(p20_nodes, "express-console-warning ");
			a14 = claim_element(p20_nodes, "A", { href: true, rel: true });
			var a14_nodes = children(a14);
			t67 = claim_text(a14_nodes, "github");
			a14_nodes.forEach(detach);
			t68 = claim_space(p20_nodes);
			a15 = claim_element(p20_nodes, "A", { href: true, rel: true });
			var a15_nodes = children(a15);
			t69 = claim_text(a15_nodes, "npm");
			a15_nodes.forEach(detach);
			p20_nodes.forEach(detach);
			section5_nodes.forEach(detach);
			this.h();
		},
		h() {
			attr(a0, "href", "#is-facebook-the-only-site-that-leaves-message-in-the-console");
			attr(a1, "href", "#how-did-the-facebook-printed-out-a-styled-text-in-the-console");
			attr(a2, "href", "#so-can-the-console-print-out-images");
			attr(a3, "href", "#so-why-not-create-an-express-middleware-for-this");
			attr(a4, "href", "#conclusion");
			attr(ul, "class", "sitemap");
			attr(ul, "id", "sitemap");
			attr(ul, "role", "navigation");
			attr(ul, "aria-label", "Table of Contents");
			if (img0.src !== (img0_src_value = __build_img__0)) attr(img0, "src", img0_src_value);
			attr(img0, "alt", "fb");
			attr(a5, "href", "#is-facebook-the-only-site-that-leaves-message-in-the-console");
			attr(a5, "id", "is-facebook-the-only-site-that-leaves-message-in-the-console");
			if (img1.src !== (img1_src_value = __build_img__1)) attr(img1, "src", img1_src_value);
			attr(img1, "alt", "oc");
			if (img2.src !== (img2_src_value = __build_img__2)) attr(img2, "src", img2_src_value);
			attr(img2, "alt", "coursera");
			attr(a6, "href", "#how-did-the-facebook-printed-out-a-styled-text-in-the-console");
			attr(a6, "id", "how-did-the-facebook-printed-out-a-styled-text-in-the-console");
			attr(a7, "href", "http://stackoverflow.com/a/22156044/1513547");
			attr(a7, "rel", "nofollow");
			attr(a8, "href", "#so-can-the-console-print-out-images");
			attr(a8, "id", "so-can-the-console-print-out-images");
			attr(a9, "href", "https://github.com/adriancooney/console.image");
			attr(a9, "rel", "nofollow");
			attr(a10, "href", "#so-why-not-create-an-express-middleware-for-this");
			attr(a10, "id", "so-why-not-create-an-express-middleware-for-this");
			attr(a11, "href", "http://expressjs.com/");
			attr(a11, "rel", "nofollow");
			attr(a12, "href", "https://www.npmjs.com/package/express-console-warning");
			attr(a12, "rel", "nofollow");
			attr(pre, "class", "language-js");
			if (img3.src !== (img3_src_value = __build_img__3)) attr(img3, "src", img3_src_value);
			attr(img3, "alt", "express-console-warning");
			attr(a13, "href", "#conclusion");
			attr(a13, "id", "conclusion");
			attr(a14, "href", "https://github.com/tanhauhau/express-console-warning");
			attr(a14, "rel", "nofollow");
			attr(a15, "href", "http://npmjs.com/package/express-console-warning");
			attr(a15, "rel", "nofollow");
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
			insert(target, p0, anchor);
			append(p0, t6);
			insert(target, t7, anchor);
			insert(target, p1, anchor);
			append(p1, img0);
			insert(target, t8, anchor);
			insert(target, p2, anchor);
			append(p2, t9);
			insert(target, t10, anchor);
			insert(target, section1, anchor);
			append(section1, h20);
			append(h20, a5);
			append(a5, t11);
			append(section1, t12);
			append(section1, p3);
			append(p3, t13);
			append(p3, strong0);
			append(strong0, t14);
			append(section1, t15);
			append(section1, p4);
			append(p4, t16);
			append(section1, t17);
			append(section1, p5);
			append(p5, img1);
			append(p5, t18);
			append(section1, t19);
			append(section1, p6);
			append(p6, img2);
			append(p6, t20);
			append(section1, t21);
			append(section1, p7);
			append(p7, t22);
			insert(target, t23, anchor);
			insert(target, section2, anchor);
			append(section2, h21);
			append(h21, a6);
			append(a6, t24);
			append(section2, t25);
			append(section2, p8);
			append(p8, t26);
			append(p8, a7);
			append(a7, t27);
			append(p8, t28);
			insert(target, t29, anchor);
			insert(target, section3, anchor);
			append(section3, h22);
			append(h22, a8);
			append(a8, t30);
			append(section3, t31);
			append(section3, p9);
			append(p9, t32);
			append(p9, strong1);
			append(strong1, t33);
			append(p9, t34);
			append(section3, t35);
			append(section3, p10);
			append(p10, t36);
			append(p10, a9);
			append(a9, t37);
			append(p10, t38);
			insert(target, t39, anchor);
			insert(target, section4, anchor);
			append(section4, h23);
			append(h23, a10);
			append(a10, t40);
			append(section4, t41);
			append(section4, p11);
			append(p11, t42);
			append(p11, a11);
			append(a11, t43);
			append(p11, t44);
			append(section4, t45);
			append(section4, p12);
			append(p12, t46);
			append(p12, a12);
			append(a12, t47);
			append(p12, t48);
			append(section4, t49);
			append(section4, p13);
			append(p13, t50);
			append(section4, t51);
			append(section4, p14);
			append(p14, t52);
			append(section4, t53);
			append(section4, p15);
			append(p15, t54);
			append(section4, t55);
			append(section4, pre);
			pre.innerHTML = raw_value;
			append(section4, t56);
			append(section4, p16);
			append(p16, t57);
			append(section4, t58);
			append(section4, p17);
			append(p17, img3);
			append(section4, t59);
			append(section4, p18);
			append(p18, em);
			append(em, t60);
			insert(target, t61, anchor);
			insert(target, section5, anchor);
			append(section5, h24);
			append(h24, a13);
			append(a13, t62);
			append(section5, t63);
			append(section5, p19);
			append(p19, t64);
			append(section5, t65);
			append(section5, p20);
			append(p20, t66);
			append(p20, a14);
			append(a14, t67);
			append(p20, t68);
			append(p20, a15);
			append(a15, t69);
		},
		p: noop,
		d(detaching) {
			if (detaching) detach(section0);
			if (detaching) detach(t5);
			if (detaching) detach(p0);
			if (detaching) detach(t7);
			if (detaching) detach(p1);
			if (detaching) detach(t8);
			if (detaching) detach(p2);
			if (detaching) detach(t10);
			if (detaching) detach(section1);
			if (detaching) detach(t23);
			if (detaching) detach(section2);
			if (detaching) detach(t29);
			if (detaching) detach(section3);
			if (detaching) detach(t39);
			if (detaching) detach(section4);
			if (detaching) detach(t61);
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
	"title": "Random stuff that I’ve learned from a browser’s developer console",
	"date": "2016-04-20T08:00:00Z",
	"description": "I opened up my browser’s developer console for no reason, and I found this",
	"slug": "random-stuff-i-learned-from-browser-console",
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
