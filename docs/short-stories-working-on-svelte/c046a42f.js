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

var __build_img__6 = "6b5e0dce610211c6.png";

var __build_img__5 = "b83331e0a7098f2f.png";

var __build_img__4 = "e8186a5386e991fb.png";

var __build_img__3 = "663ce748564e907b.png";

var __build_img__2 = "fe06b752d5f629ca.png";

var __build_img__1 = "3c11b14ac94692d2.jpg";

var __build_img__0 = "043e15a1a859e7f7.png";

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

var baseCss = "https://lihautan.com/short-stories-working-on-svelte/assets/_blog-299aa480.css";

var image = "https://lihautan.com/short-stories-working-on-svelte/assets/hero-twitter-5254bb38.jpg";

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
					"@id": "https%3A%2F%2Flihautan.com%2Fshort-stories-working-on-svelte",
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
			attr(meta11, "content", "https%3A%2F%2Flihautan.com%2Fshort-stories-working-on-svelte");
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
							"@id": "https%3A%2F%2Flihautan.com%2Fshort-stories-working-on-svelte",
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

/* content/talk/short-stories-working-on-svelte/@@page-markup.svelte generated by Svelte v3.24.0 */

function create_default_slot(ctx) {
	let section0;
	let ul1;
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
	let t5;
	let p0;
	let t6;
	let t7;
	let section1;
	let h20;
	let a5;
	let t8;
	let t9;
	let p1;
	let t10;
	let a6;
	let t11;
	let t12;
	let t13;
	let p2;
	let img0;
	let img0_src_value;
	let t14;
	let p3;
	let t15;
	let t16;
	let p4;
	let t17;
	let a7;
	let t18;
	let t19;
	let a8;
	let t20;
	let t21;
	let t22;
	let p5;
	let t23;
	let a9;
	let t24;
	let t25;
	let t26;
	let p6;
	let img1;
	let img1_src_value;
	let t27;
	let p7;
	let t28;
	let a10;
	let t29;
	let t30;
	let t31;
	let p8;
	let t32;
	let a11;
	let t33;
	let t34;
	let t35;
	let p9;
	let t36;
	let t37;
	let p10;
	let t38;
	let t39;
	let pre0;

	let raw0_value = `
<code class="language-html"><span class="token tag"><span class="token tag"><span class="token punctuation">&lt;</span>style</span><span class="token punctuation">></span></span><span class="token style"><span class="token language-css">
  <span class="token selector">div</span> <span class="token punctuation">&#123;</span> <span class="token property">color</span><span class="token punctuation">:</span> blue<span class="token punctuation">;</span> <span class="token punctuation">&#125;</span>
</span></span><span class="token tag"><span class="token tag"><span class="token punctuation">&lt;/</span>style</span><span class="token punctuation">></span></span>

<span class="token tag"><span class="token tag"><span class="token punctuation">&lt;</span>script</span><span class="token punctuation">></span></span><span class="token script"><span class="token language-javascript">
 <span class="token keyword">let</span> greeting <span class="token operator">=</span> <span class="token string">'Hello world!'</span><span class="token punctuation">;</span>
</span></span><span class="token tag"><span class="token tag"><span class="token punctuation">&lt;/</span>script</span><span class="token punctuation">></span></span>

<span class="token tag"><span class="token tag"><span class="token punctuation">&lt;</span>div</span><span class="token punctuation">></span></span>&#123;greeting&#125;<span class="token tag"><span class="token tag"><span class="token punctuation">&lt;/</span>div</span><span class="token punctuation">></span></span></code>` + "";

	let t40;
	let p11;
	let t41;
	let t42;
	let pre1;

	let raw1_value = `
<code class="language-js"><span class="token keyword">let</span> greeting <span class="token operator">=</span> <span class="token string">'Hello world!'</span><span class="token punctuation">;</span>
<span class="token keyword">const</span> div <span class="token operator">=</span> <span class="token dom variable">document</span><span class="token punctuation">.</span><span class="token method function property-access">createElement</span><span class="token punctuation">(</span><span class="token string">'div'</span><span class="token punctuation">)</span><span class="token punctuation">;</span>
<span class="token keyword">const</span> text <span class="token operator">=</span> <span class="token dom variable">document</span><span class="token punctuation">.</span><span class="token method function property-access">createTextNode</span><span class="token punctuation">(</span>greeting<span class="token punctuation">)</span><span class="token punctuation">;</span>

target<span class="token punctuation">.</span><span class="token method function property-access">appendChild</span><span class="token punctuation">(</span>div<span class="token punctuation">)</span><span class="token punctuation">;</span>
div<span class="token punctuation">.</span><span class="token method function property-access">appendChild</span><span class="token punctuation">(</span>text<span class="token punctuation">)</span><span class="token punctuation">;</span></code>` + "";

	let t43;
	let p12;
	let t44;
	let t45;
	let p13;
	let t46;
	let t47;
	let p14;
	let t48;
	let t49;
	let pre2;

	let raw2_value = `
<code class="language-html"><span class="token tag"><span class="token tag"><span class="token punctuation">&lt;</span>script</span><span class="token punctuation">></span></span><span class="token script"><span class="token language-javascript">
 <span class="token keyword">let</span> greeting <span class="token operator">=</span> <span class="token string">'Hello world!'</span><span class="token punctuation">;</span>
</span></span><span class="token tag"><span class="token tag"><span class="token punctuation">&lt;/</span>script</span><span class="token punctuation">></span></span>

<span class="token tag"><span class="token tag"><span class="token punctuation">&lt;</span>div</span><span class="token punctuation">></span></span>
 <span class="token tag"><span class="token tag"><span class="token punctuation">&lt;</span>div</span><span class="token punctuation">></span></span>Header<span class="token tag"><span class="token tag"><span class="token punctuation">&lt;/</span>div</span><span class="token punctuation">></span></span>
 <span class="token tag"><span class="token tag"><span class="token punctuation">&lt;</span>div</span><span class="token punctuation">></span></span>
   <span class="token tag"><span class="token tag"><span class="token punctuation">&lt;</span>div</span><span class="token punctuation">></span></span>Lorem ipsum<span class="token tag"><span class="token tag"><span class="token punctuation">&lt;/</span>div</span><span class="token punctuation">></span></span>
   <span class="token tag"><span class="token tag"><span class="token punctuation">&lt;</span>div</span><span class="token punctuation">></span></span>&#123;greeting&#125;<span class="token tag"><span class="token tag"><span class="token punctuation">&lt;/</span>div</span><span class="token punctuation">></span></span>
 <span class="token tag"><span class="token tag"><span class="token punctuation">&lt;/</span>div</span><span class="token punctuation">></span></span>
<span class="token tag"><span class="token tag"><span class="token punctuation">&lt;/</span>div</span><span class="token punctuation">></span></span></code>` + "";

	let t50;
	let p15;
	let t51;
	let t52;
	let pre3;

	let raw3_value = `
<code class="language-js"><span class="token keyword">let</span> greeting <span class="token operator">=</span> <span class="token string">'Hello world'</span><span class="token punctuation">;</span>

<span class="token keyword">const</span> div1 <span class="token operator">=</span> <span class="token dom variable">document</span><span class="token punctuation">.</span><span class="token method function property-access">createElement</span><span class="token punctuation">(</span><span class="token string">'div'</span><span class="token punctuation">)</span><span class="token punctuation">;</span>
<span class="token keyword">const</span> div2 <span class="token operator">=</span> <span class="token dom variable">document</span><span class="token punctuation">.</span><span class="token method function property-access">createElement</span><span class="token punctuation">(</span><span class="token string">'div'</span><span class="token punctuation">)</span><span class="token punctuation">;</span>
div2<span class="token punctuation">.</span><span class="token property-access">textContent</span> <span class="token operator">=</span> <span class="token string">'Header'</span><span class="token punctuation">;</span>
<span class="token keyword">const</span> div3 <span class="token operator">=</span> <span class="token dom variable">document</span><span class="token punctuation">.</span><span class="token method function property-access">createElement</span><span class="token punctuation">(</span><span class="token string">'div'</span><span class="token punctuation">)</span><span class="token punctuation">;</span>
<span class="token keyword">const</span> div4 <span class="token operator">=</span> <span class="token dom variable">document</span><span class="token punctuation">.</span><span class="token method function property-access">createElement</span><span class="token punctuation">(</span><span class="token string">'div'</span><span class="token punctuation">)</span><span class="token punctuation">;</span>
div4<span class="token punctuation">.</span><span class="token property-access">textContent</span> <span class="token operator">=</span> <span class="token string">'Lorem ipsum'</span>
<span class="token keyword">const</span> div5 <span class="token operator">=</span> <span class="token dom variable">document</span><span class="token punctuation">.</span><span class="token method function property-access">createElement</span><span class="token punctuation">(</span><span class="token string">'div'</span><span class="token punctuation">)</span><span class="token punctuation">;</span>
<span class="token keyword">const</span> text <span class="token operator">=</span> <span class="token dom variable">document</span><span class="token punctuation">.</span><span class="token method function property-access">createTextNode</span><span class="token punctuation">(</span>greeting<span class="token punctuation">)</span><span class="token punctuation">;</span>

target<span class="token punctuation">.</span><span class="token method function property-access">appendChild</span><span class="token punctuation">(</span>div1<span class="token punctuation">)</span><span class="token punctuation">;</span>
div1<span class="token punctuation">.</span><span class="token method function property-access">appendChild</span><span class="token punctuation">(</span>div2<span class="token punctuation">)</span><span class="token punctuation">;</span>
div3<span class="token punctuation">.</span><span class="token method function property-access">appendChild</span><span class="token punctuation">(</span>div4<span class="token punctuation">)</span><span class="token punctuation">;</span>
div4<span class="token punctuation">.</span><span class="token method function property-access">appendChild</span><span class="token punctuation">(</span>div5<span class="token punctuation">)</span><span class="token punctuation">;</span>
div1<span class="token punctuation">.</span><span class="token method function property-access">appendChild</span><span class="token punctuation">(</span>div3<span class="token punctuation">)</span><span class="token punctuation">;</span></code>` + "";

	let t53;
	let p16;
	let t54;
	let t55;
	let p17;
	let t56;
	let a12;
	let t57;
	let t58;
	let code0;
	let t59;
	let t60;
	let t61;
	let pre4;

	let raw4_value = `
<code class="language-js"><span class="token keyword">let</span> greeting <span class="token operator">=</span> <span class="token string">'Hello world'</span><span class="token punctuation">;</span>

target<span class="token punctuation">.</span><span class="token property-access">innerHTML</span> <span class="token operator">=</span> <span class="token template-string"><span class="token template-punctuation string">&#96;</span><span class="token html language-html">
 <span class="token tag"><span class="token tag"><span class="token punctuation">&lt;</span>div</span><span class="token punctuation">></span></span>
   <span class="token tag"><span class="token tag"><span class="token punctuation">&lt;</span>div</span><span class="token punctuation">></span></span>Header<span class="token tag"><span class="token tag"><span class="token punctuation">&lt;/</span>div</span><span class="token punctuation">></span></span>
   <span class="token tag"><span class="token tag"><span class="token punctuation">&lt;</span>div</span><span class="token punctuation">></span></span>
     <span class="token tag"><span class="token tag"><span class="token punctuation">&lt;</span>div</span><span class="token punctuation">></span></span>Lorem ipsum<span class="token tag"><span class="token tag"><span class="token punctuation">&lt;/</span>div</span><span class="token punctuation">></span></span>
     <span class="token tag"><span class="token tag"><span class="token punctuation">&lt;</span>div</span><span class="token punctuation">></span></span><span class="token interpolation"><span class="token interpolation-punctuation punctuation">$&#123;</span>greeting<span class="token interpolation-punctuation punctuation">&#125;</span></span><span class="token tag"><span class="token tag"><span class="token punctuation">&lt;/</span>div</span><span class="token punctuation">></span></span>
   <span class="token tag"><span class="token tag"><span class="token punctuation">&lt;/</span>div</span><span class="token punctuation">></span></span>
 <span class="token tag"><span class="token tag"><span class="token punctuation">&lt;/</span>div</span><span class="token punctuation">></span></span></span><span class="token template-punctuation string">&#96;</span></span></code>` + "";

	let t62;
	let p18;
	let t63;
	let a13;
	let t64;
	let t65;
	let t66;
	let p19;
	let t67;
	let a14;
	let t68;
	let t69;
	let t70;
	let p20;
	let t71;
	let a15;
	let t72;
	let t73;
	let t74;
	let p21;
	let t75;
	let t76;
	let p22;
	let t77;
	let t78;
	let pre5;

	let raw5_value = `
<code class="language-js"><span class="token keyword">let</span> greeting <span class="token operator">=</span> <span class="token string">'&lt;div onclick="alert(&amp;quot;oh no&amp;quot;);">click me&lt;/div>'</span><span class="token punctuation">;</span>

target<span class="token punctuation">.</span><span class="token property-access">innerHTML</span> <span class="token operator">=</span> <span class="token template-string"><span class="token template-punctuation string">&#96;</span><span class="token html language-html">
 <span class="token tag"><span class="token tag"><span class="token punctuation">&lt;</span>div</span><span class="token punctuation">></span></span>
   <span class="token tag"><span class="token tag"><span class="token punctuation">&lt;</span>div</span><span class="token punctuation">></span></span>Header<span class="token tag"><span class="token tag"><span class="token punctuation">&lt;/</span>div</span><span class="token punctuation">></span></span>
   <span class="token tag"><span class="token tag"><span class="token punctuation">&lt;</span>div</span><span class="token punctuation">></span></span>
     <span class="token tag"><span class="token tag"><span class="token punctuation">&lt;</span>div</span><span class="token punctuation">></span></span>Lorem ipsum<span class="token tag"><span class="token tag"><span class="token punctuation">&lt;/</span>div</span><span class="token punctuation">></span></span>
     <span class="token tag"><span class="token tag"><span class="token punctuation">&lt;</span>div</span><span class="token punctuation">></span></span><span class="token interpolation"><span class="token interpolation-punctuation punctuation">$&#123;</span>greeting<span class="token interpolation-punctuation punctuation">&#125;</span></span><span class="token tag"><span class="token tag"><span class="token punctuation">&lt;/</span>div</span><span class="token punctuation">></span></span>
   <span class="token tag"><span class="token tag"><span class="token punctuation">&lt;/</span>div</span><span class="token punctuation">></span></span>
 <span class="token tag"><span class="token tag"><span class="token punctuation">&lt;/</span>div</span><span class="token punctuation">></span></span></span><span class="token template-punctuation string">&#96;</span></span></code>` + "";

	let t79;
	let p23;
	let t80;
	let t81;
	let p24;
	let t82;
	let a16;
	let t83;
	let t84;
	let a17;
	let t85;
	let t86;
	let t87;
	let p25;
	let img2;
	let img2_src_value;
	let t88;
	let p26;
	let t89;
	let a18;
	let t90;
	let t91;
	let t92;
	let p27;
	let t93;
	let t94;
	let p28;
	let t95;
	let t96;
	let p29;
	let t97;
	let code1;
	let t98;
	let t99;
	let code2;
	let t100;
	let t101;
	let t102;
	let pre6;

	let raw6_value = `
<code class="language-js"><span class="token comment">// instead of this,</span>
$<span class="token number">0.</span>innerHTML <span class="token operator">=</span> <span class="token string">'&amp;amp;&amp;gt;'</span>
<span class="token comment">// it is now this:</span>
$<span class="token number">0.</span>textContent <span class="token operator">=</span> <span class="token string">'&amp;amp;&amp;gt;'</span></code>` + "";

	let t103;
	let p30;
	let t104;
	let t105;
	let pre7;

	let raw7_value = `
<code class="language-html"><span class="token comment">&lt;!-- with innerHTML --></span>
<span class="token tag"><span class="token tag"><span class="token punctuation">&lt;</span>div</span><span class="token punctuation">></span></span>&amp;><span class="token tag"><span class="token tag"><span class="token punctuation">&lt;/</span>div</span><span class="token punctuation">></span></span>
<span class="token comment">&lt;!-- with textContent --></span>
<span class="token tag"><span class="token tag"><span class="token punctuation">&lt;</span>div</span><span class="token punctuation">></span></span><span class="token entity" title="&amp;">&amp;amp;</span><span class="token entity" title="&gt;">&amp;gt;</span><span class="token tag"><span class="token tag"><span class="token punctuation">&lt;/</span>div</span><span class="token punctuation">></span></span></code>` + "";

	let t106;
	let p31;
	let code3;
	let t107;
	let t108;
	let t109;
	let p32;
	let t110;
	let a19;
	let t111;
	let t112;
	let t113;
	let p33;
	let t114;
	let t115;
	let p34;
	let t116;
	let t117;
	let ul2;
	let li5;
	let p35;
	let t118;
	let code4;
	let t119;
	let t120;
	let t121;
	let li6;
	let p36;
	let t122;
	let t123;
	let section2;
	let h21;
	let a20;
	let t124;
	let t125;
	let p37;
	let t126;
	let t127;
	let p38;
	let t128;
	let t129;
	let pre8;

	let raw8_value = `
<code class="language-html"><span class="token tag"><span class="token tag"><span class="token punctuation">&lt;</span>style</span><span class="token punctuation">></span></span><span class="token style"><span class="token language-css">
  <span class="token selector">div</span> <span class="token punctuation">&#123;</span>
    <span class="token property">padding</span><span class="token punctuation">:</span> <span class="token number">5</span><span class="token unit">px</span><span class="token punctuation">;</span>
  <span class="token punctuation">&#125;</span>
</span></span><span class="token tag"><span class="token tag"><span class="token punctuation">&lt;/</span>style</span><span class="token punctuation">></span></span>

<span class="token tag"><span class="token tag"><span class="token punctuation">&lt;</span>div</span><span class="token punctuation">></span></span>
  <span class="token tag"><span class="token tag"><span class="token punctuation">&lt;</span>Component</span> <span class="token punctuation">/></span></span>
<span class="token tag"><span class="token tag"><span class="token punctuation">&lt;/</span>div</span><span class="token punctuation">></span></span></code>` + "";

	let t130;
	let p39;
	let t131;
	let code5;
	let t132;
	let t133;
	let code6;
	let t134;
	let t135;
	let code7;
	let t136;
	let t137;
	let code8;
	let t138;
	let t139;
	let t140;
	let p40;
	let t141;
	let t142;
	let p41;
	let t143;
	let code9;
	let t144;
	let t145;
	let t146;
	let p42;
	let t147;
	let code10;
	let t148;
	let t149;
	let t150;
	let p43;
	let t151;
	let code11;
	let t152;
	let t153;
	let code12;
	let t154;
	let t155;
	let t156;
	let pre9;

	let raw9_value = `
<code class="language-html"><span class="token tag"><span class="token tag"><span class="token punctuation">&lt;</span>style</span><span class="token punctuation">></span></span><span class="token style"><span class="token language-css">
  <span class="token selector"><span class="token pseudo-class">:global</span><span class="token punctuation">(</span>div<span class="token punctuation">)</span></span> <span class="token punctuation">&#123;</span>
    <span class="token property">padding</span><span class="token punctuation">:</span> <span class="token number">5</span><span class="token unit">px</span><span class="token punctuation">;</span>
  <span class="token punctuation">&#125;</span>
</span></span><span class="token tag"><span class="token tag"><span class="token punctuation">&lt;/</span>style</span><span class="token punctuation">></span></span>

<span class="token tag"><span class="token tag"><span class="token punctuation">&lt;</span>div</span><span class="token punctuation">></span></span>
  <span class="token tag"><span class="token tag"><span class="token punctuation">&lt;</span>Component</span> <span class="token punctuation">/></span></span>
<span class="token tag"><span class="token tag"><span class="token punctuation">&lt;/</span>div</span><span class="token punctuation">></span></span></code>` + "";

	let t157;
	let p44;
	let t158;
	let t159;
	let p45;
	let t160;
	let code13;
	let t161;
	let t162;
	let t163;
	let p46;
	let t164;
	let code14;
	let t165;
	let t166;
	let code15;
	let t167;
	let t168;
	let t169;
	let p47;
	let t170;
	let code16;
	let t171;
	let t172;
	let code17;
	let t173;
	let t174;
	let t175;
	let section3;
	let h30;
	let a21;
	let t176;
	let t177;
	let p48;
	let t178;
	let t179;
	let pre10;

	let raw10_value = `
<code class="language-html"><span class="token comment">&lt;!-- filename: Component.svelte --></span>
<span class="token tag"><span class="token tag"><span class="token punctuation">&lt;</span>style</span><span class="token punctuation">></span></span><span class="token style"><span class="token language-css">
  <span class="token selector"><span class="token class">.header</span></span> <span class="token punctuation">&#123;</span>
    <span class="token property">padding</span><span class="token punctuation">:</span> <span class="token function">var</span><span class="token punctuation">(</span><span class="token variable">--header-padding</span><span class="token punctuation">,</span> <span class="token number">5</span><span class="token unit">px</span><span class="token punctuation">)</span><span class="token punctuation">;</span>
  <span class="token punctuation">&#125;</span>
</span></span><span class="token tag"><span class="token tag"><span class="token punctuation">&lt;/</span>style</span><span class="token punctuation">></span></span>

<span class="token tag"><span class="token tag"><span class="token punctuation">&lt;</span>div</span> <span class="token attr-name">class</span><span class="token attr-value"><span class="token punctuation">=</span><span class="token punctuation">"</span>header<span class="token punctuation">"</span></span><span class="token punctuation">></span></span>Lorem ipsum<span class="token tag"><span class="token tag"><span class="token punctuation">&lt;/</span>div</span><span class="token punctuation">></span></span>
<span class="token tag"><span class="token tag"><span class="token punctuation">&lt;</span>div</span><span class="token punctuation">></span></span>Lorem ipsum<span class="token tag"><span class="token tag"><span class="token punctuation">&lt;/</span>div</span><span class="token punctuation">></span></span></code>` + "";

	let t180;
	let p49;
	let t181;
	let t182;
	let p50;
	let t183;
	let t184;
	let p51;
	let t185;
	let code18;
	let t186;
	let t187;
	let t188;
	let pre11;

	let raw11_value = `
<code class="language-html"><span class="token comment">&lt;!-- filename: index.svelte --></span>
<span class="token tag"><span class="token tag"><span class="token punctuation">&lt;</span>div</span> <span class="token attr-name">styles</span><span class="token attr-value"><span class="token punctuation">=</span><span class="token punctuation">"</span>--header-padding: 5px;<span class="token punctuation">"</span></span><span class="token punctuation">></span></span>
   <span class="token tag"><span class="token tag"><span class="token punctuation">&lt;</span>Component</span> <span class="token punctuation">/></span></span>
<span class="token tag"><span class="token tag"><span class="token punctuation">&lt;/</span>div</span><span class="token punctuation">></span></span></code>` + "";

	let t189;
	let p52;
	let t190;
	let a22;
	let t191;
	let t192;
	let t193;
	let pre12;

	let raw12_value = `
<code class="language-html"><span class="token tag"><span class="token tag"><span class="token punctuation">&lt;</span>Slider</span>
  <span class="token attr-name"><span class="token namespace">bind:</span>value</span>
  <span class="token attr-name">min</span><span class="token attr-value"><span class="token punctuation">=</span>&#123;0&#125;</span>
  <span class="token attr-name">max</span><span class="token attr-value"><span class="token punctuation">=</span>&#123;100&#125;</span>
  <span class="token attr-name">--rail-color</span><span class="token attr-value"><span class="token punctuation">=</span><span class="token punctuation">"</span>black<span class="token punctuation">"</span></span>
  <span class="token attr-name">--track-color</span><span class="token attr-value"><span class="token punctuation">=</span><span class="token punctuation">"</span>red<span class="token punctuation">"</span></span>
<span class="token punctuation">/></span></span>
<span class="token comment">&lt;!-- desugars into --></span>
<span class="token comment">&lt;!-- ↓↓↓↓↓↓↓↓↓↓↓↓↓ --></span>
<span class="token tag"><span class="token tag"><span class="token punctuation">&lt;</span>div</span><span class="token style-attr language-css"><span class="token attr-name"> <span class="token attr-name">style</span></span><span class="token punctuation">="</span>
<span class="token attr-value">  <span class="token variable">--rail-color</span><span class="token punctuation">:</span> black<span class="token punctuation">;</span></span>
<span class="token attr-value">  <span class="token variable">--track-color</span><span class="token punctuation">:</span> red<span class="token punctuation">;</span></span>
<span class="token punctuation">"</span></span><span class="token punctuation">></span></span>
    <span class="token tag"><span class="token tag"><span class="token punctuation">&lt;</span>Slider</span>
      <span class="token attr-name"><span class="token namespace">bind:</span>value</span>
      <span class="token attr-name">min</span><span class="token attr-value"><span class="token punctuation">=</span>&#123;0&#125;</span>
      <span class="token attr-name">max</span><span class="token attr-value"><span class="token punctuation">=</span>&#123;100&#125;</span>
    <span class="token punctuation">/></span></span>
<span class="token tag"><span class="token tag"><span class="token punctuation">&lt;/</span>div</span><span class="token punctuation">></span></span></code>` + "";

	let t194;
	let p53;
	let t195;
	let code19;
	let t196;
	let t197;
	let t198;
	let p54;
	let t199;
	let a23;
	let t200;
	let t201;
	let t202;
	let p55;
	let img3;
	let img3_src_value;
	let t203;
	let p56;
	let t204;
	let t205;
	let p57;
	let t206;
	let a24;
	let t207;
	let t208;
	let t209;
	let p58;
	let t210;
	let t211;
	let p59;
	let img4;
	let img4_src_value;
	let t212;
	let p60;
	let t213;
	let t214;
	let p61;
	let t215;
	let t216;
	let p62;
	let t217;
	let t218;
	let p63;
	let t219;
	let code20;
	let t220;
	let t221;
	let t222;
	let p64;
	let img5;
	let img5_src_value;
	let t223;
	let p65;
	let t224;
	let code21;
	let t225;
	let t226;
	let code22;
	let t227;
	let t228;
	let t229;
	let p66;
	let img6;
	let img6_src_value;
	let t230;
	let p67;
	let t231;
	let t232;
	let pre13;

	let raw13_value = `
<code class="language-html"><span class="token tag"><span class="token tag"><span class="token punctuation">&lt;</span>div</span> <span class="token attr-name">class</span><span class="token attr-value"><span class="token punctuation">=</span><span class="token punctuation">"</span>header-group<span class="token punctuation">"</span></span><span class="token punctuation">></span></span>
  <span class="token tag"><span class="token tag"><span class="token punctuation">&lt;</span>ul</span> <span class="token attr-name">class</span><span class="token attr-value"><span class="token punctuation">=</span><span class="token punctuation">"</span>headers<span class="token punctuation">"</span></span><span class="token punctuation">></span></span>
    <span class="token tag"><span class="token tag"><span class="token punctuation">&lt;</span>li</span><span class="token punctuation">></span></span>Header 1<span class="token tag"><span class="token tag"><span class="token punctuation">&lt;/</span>li</span><span class="token punctuation">></span></span>
    <span class="token tag"><span class="token tag"><span class="token punctuation">&lt;</span>li</span><span class="token punctuation">></span></span>Header 2<span class="token tag"><span class="token tag"><span class="token punctuation">&lt;/</span>li</span><span class="token punctuation">></span></span>
    <span class="token tag"><span class="token tag"><span class="token punctuation">&lt;</span>li</span><span class="token punctuation">></span></span>Header 3<span class="token tag"><span class="token tag"><span class="token punctuation">&lt;/</span>li</span><span class="token punctuation">></span></span>
  <span class="token tag"><span class="token tag"><span class="token punctuation">&lt;/</span>ul</span><span class="token punctuation">></span></span>
<span class="token tag"><span class="token tag"><span class="token punctuation">&lt;/</span>div</span><span class="token punctuation">></span></span>
<span class="token tag"><span class="token tag"><span class="token punctuation">&lt;</span>div</span> <span class="token attr-name">class</span><span class="token attr-value"><span class="token punctuation">=</span><span class="token punctuation">"</span>swimlane<span class="token punctuation">"</span></span><span class="token punctuation">></span></span>
  <span class="token tag"><span class="token tag"><span class="token punctuation">&lt;</span>div</span> <span class="token attr-name">class</span><span class="token attr-value"><span class="token punctuation">=</span><span class="token punctuation">"</span>swimlane header<span class="token punctuation">"</span></span><span class="token punctuation">></span></span><span class="token tag"><span class="token tag"><span class="token punctuation">&lt;/</span>div</span><span class="token punctuation">></span></span>
  <span class="token tag"><span class="token tag"><span class="token punctuation">&lt;</span>ul</span> <span class="token attr-name">class</span><span class="token attr-value"><span class="token punctuation">=</span><span class="token punctuation">"</span>columns<span class="token punctuation">"</span></span><span class="token punctuation">></span></span>
    <span class="token tag"><span class="token tag"><span class="token punctuation">&lt;</span>li</span><span class="token punctuation">></span></span>Content 1<span class="token tag"><span class="token tag"><span class="token punctuation">&lt;/</span>li</span><span class="token punctuation">></span></span>
    <span class="token tag"><span class="token tag"><span class="token punctuation">&lt;</span>li</span><span class="token punctuation">></span></span>Content 2<span class="token tag"><span class="token tag"><span class="token punctuation">&lt;/</span>li</span><span class="token punctuation">></span></span>
    <span class="token tag"><span class="token tag"><span class="token punctuation">&lt;</span>li</span><span class="token punctuation">></span></span>Content 3<span class="token tag"><span class="token tag"><span class="token punctuation">&lt;/</span>li</span><span class="token punctuation">></span></span>
  <span class="token tag"><span class="token tag"><span class="token punctuation">&lt;/</span>ul</span><span class="token punctuation">></span></span>
<span class="token tag"><span class="token tag"><span class="token punctuation">&lt;/</span>div</span><span class="token punctuation">></span></span></code>` + "";

	let t233;
	let p68;
	let t234;
	let code23;
	let t235;
	let t236;
	let code24;
	let t237;
	let t238;
	let t239;
	let p69;
	let t240;
	let a25;
	let code25;
	let t241;
	let t242;
	let t243;
	let p70;
	let t244;
	let t245;
	let p71;
	let t246;
	let t247;
	let pre14;

	let raw14_value = `
<code class="language-css"><span class="token selector">div</span> <span class="token punctuation">&#123;</span>
  <span class="token property">display</span><span class="token punctuation">:</span> contents
<span class="token punctuation">&#125;</span></code>` + "";

	let t248;
	let p72;
	let t249;
	let code26;
	let t250;
	let t251;
	let code27;
	let t252;
	let t253;
	let code28;
	let t254;
	let t255;
	let code29;
	let t256;
	let t257;
	let code30;
	let t258;
	let t259;
	let code31;
	let t260;
	let t261;
	let code32;
	let t262;
	let t263;
	let t264;
	let p73;
	let t265;
	let code33;
	let t266;
	let t267;
	let t268;
	let p74;
	let t269;
	let a26;
	let t270;
	let t271;
	let t272;
	let p75;
	let t273;
	let t274;
	let blockquote;
	let p76;
	let t275;
	let t276;
	let p77;
	let t277;
	let t278;
	let p78;
	let t279;
	let t280;
	let section4;
	let h31;
	let a27;
	let t281;
	let t282;
	let p79;
	let t283;
	let t284;
	let p80;
	let em0;
	let t285;
	let t286;
	let section5;
	let h32;
	let a28;
	let t287;
	let t288;
	let p81;
	let t289;
	let t290;
	let p82;
	let em1;
	let t291;
	let t292;

	return {
		c() {
			section0 = element("section");
			ul1 = element("ul");
			li0 = element("li");
			a0 = element("a");
			t0 = text("First Story");
			li1 = element("li");
			a1 = element("a");
			t1 = text("Second Story");
			ul0 = element("ul");
			li2 = element("li");
			a2 = element("a");
			t2 = text("CSS Custom Properties aka CSS Variables");
			li3 = element("li");
			a3 = element("a");
			t3 = text("Please do sharing more often.");
			li4 = element("li");
			a4 = element("a");
			t4 = text("Please do participate in RK more often");
			t5 = space();
			p0 = element("p");
			t6 = text("It's Friday evening, so I've decided to go light and easy, and share with y'all 2 interesting anecdote while I was working on Svelte.");
			t7 = space();
			section1 = element("section");
			h20 = element("h2");
			a5 = element("a");
			t8 = text("First Story");
			t9 = space();
			p1 = element("p");
			t10 = text("The first story started with ");
			a6 = element("a");
			t11 = text("Hacktoberfest");
			t12 = text(".");
			t13 = space();
			p2 = element("p");
			img0 = element("img");
			t14 = space();
			p3 = element("p");
			t15 = text("Anyone knows about Hacktoberfest? Anyone finished Hacktoberfest?");
			t16 = space();
			p4 = element("p");
			t17 = text("So for to benefit of those who don't know about Hacktoberfest, Hacktoberfest is an annual event organised by ");
			a7 = element("a");
			t18 = text("DigitalOcean");
			t19 = text(", and this year they partnered with ");
			a8 = element("a");
			t20 = text("dev.to");
			t21 = text(".");
			t22 = space();
			p5 = element("p");
			t23 = text("So during the month of October, if you managed to make 4 PRs to any public ");
			a9 = element("a");
			t24 = text("Github");
			t25 = text(" repository, you will get a free T-shirts and swags.");
			t26 = space();
			p6 = element("p");
			img1 = element("img");
			t27 = space();
			p7 = element("p");
			t28 = text("So this year Hacktoberfest, I was working on this frontend framework called ");
			a10 = element("a");
			t29 = text("Svelte");
			t30 = text(".");
			t31 = space();
			p8 = element("p");
			t32 = text("If you never heard about Svelte, I recommend you to watch Rich Harris talk on ");
			a11 = element("a");
			t33 = text("\"Rethinking Reactivity\"");
			t34 = text(".");
			t35 = space();
			p9 = element("p");
			t36 = text("So what so special about this new frontend framework?");
			t37 = space();
			p10 = element("p");
			t38 = text("Well, firstly, a svelte component is a single file component, just like Vue. You have your script, styles and HTML elements all in one place:");
			t39 = space();
			pre0 = element("pre");
			t40 = space();
			p11 = element("p");
			t41 = text("Secondly, Svelte is a compiler. It compiles the single file component into simple JavaScript statements like these:");
			t42 = space();
			pre1 = element("pre");
			t43 = space();
			p12 = element("p");
			t44 = text("It is the simplest way of creating DOM nodes, not much overhead code, no work loop like React, nothing.");
			t45 = space();
			p13 = element("p");
			t46 = text("The benefit of doing this is that the bundle size can be very small, and it can run without much runtime overheads.");
			t47 = space();
			p14 = element("p");
			t48 = text("However, if you look at a slightly more complex component like the one below:");
			t49 = space();
			pre2 = element("pre");
			t50 = space();
			p15 = element("p");
			t51 = text("it gets compiled into more code:");
			t52 = space();
			pre3 = element("pre");
			t53 = space();
			p16 = element("p");
			t54 = text("Which is natural right?");
			t55 = space();
			p17 = element("p");
			t56 = text("But, when I was fiddling the ");
			a12 = element("a");
			t57 = text("Svelte REPL");
			t58 = text(", I was looking at the code, thinking to myself, in this component, greeting has never changed, so there's no need for any reactivity, so why should we still build element one by one, why not just use ");
			code0 = element("code");
			t59 = text("innerHTML");
			t60 = text("?");
			t61 = space();
			pre4 = element("pre");
			t62 = space();
			p18 = element("p");
			t63 = text("So, that was what I did, and I ");
			a13 = element("a");
			t64 = text("submitted an PR");
			t65 = text(".");
			t66 = space();
			p19 = element("p");
			t67 = text("I was ecstatic when it got merged, and ");
			a14 = element("a");
			t68 = text("Rich commented \"Damn, this is nice!\"");
			t69 = text(".");
			t70 = space();
			p20 = element("p");
			t71 = text("But little did I know a few days later, someone commented on the PR ");
			a15 = element("a");
			t72 = text("about opening up to XSS risk");
			t73 = text(".");
			t74 = space();
			p21 = element("p");
			t75 = text("XSS (Cross-Site Scripting)? What?!");
			t76 = space();
			p22 = element("p");
			t77 = text("So imagine instead of a friendly greeting, someone with a malicious intent changed it to something else:");
			t78 = space();
			pre5 = element("pre");
			t79 = space();
			p23 = element("p");
			t80 = text("Then you would have a malicious click me button on the screen! 😱");
			t81 = space();
			p24 = element("p");
			t82 = text("So I googled, and I found this ");
			a16 = element("a");
			t83 = text("Open Web Application Security Project (OWASP)");
			t84 = text(", which they have a long list of ");
			a17 = element("a");
			t85 = text("cheatsheets about and how to prevent web vulnerability");
			t86 = text(".");
			t87 = space();
			p25 = element("p");
			img2 = element("img");
			t88 = space();
			p26 = element("p");
			t89 = text("I read up on them and got to learn more about methods to prevent XSS, and so I ");
			a18 = element("a");
			t90 = text("made another PR");
			t91 = text(".");
			t92 = space();
			p27 = element("p");
			t93 = text("And it got fixed! Finally!");
			t94 = space();
			p28 = element("p");
			t95 = text("Or is it? 🤔");
			t96 = space();
			p29 = element("p");
			t97 = text("Well in my new PR, I did not revert all the changes I made previously, I still attempt to have some optimisation with static content. So instead of using ");
			code1 = element("code");
			t98 = text("innerHTML");
			t99 = text(", I used ");
			code2 = element("code");
			t100 = text("textContent");
			t101 = text(", which is safe for XSS attacks.");
			t102 = space();
			pre6 = element("pre");
			t103 = space();
			p30 = element("p");
			t104 = text("So, although they looked similar, but when it got executed, they are different:");
			t105 = space();
			pre7 = element("pre");
			t106 = space();
			p31 = element("p");
			code3 = element("code");
			t107 = text("textContent");
			t108 = text(" will not unescape the string content.");
			t109 = space();
			p32 = element("p");
			t110 = text("Someone found it and raised an issue, so I ");
			a19 = element("a");
			t111 = text("made another PR");
			t112 = text(".");
			t113 = space();
			p33 = element("p");
			t114 = text("So, that's my first story, of how I innocently trying to optimise the bundle, ending up creating a XSS risk, and how I made multiple PRs to fixed them.");
			t115 = space();
			p34 = element("p");
			t116 = text("Before I moved on to the 2nd story, I have a few takeaways I would like to share:");
			t117 = space();
			ul2 = element("ul");
			li5 = element("li");
			p35 = element("p");
			t118 = text("As a React developer, I have been so used to have React taking care of the XSS vulnerability for me. As long as i dont use ");
			code4 = element("code");
			t119 = text("dangeourslySetInnerHtml");
			t120 = text(", I'm all good. Therefore, it has never occur to me that it is still a potential threat.");
			t121 = space();
			li6 = element("li");
			p36 = element("p");
			t122 = text("I find it interesting to work on technologies/stack that we don't use it at work during free time. Having to work on 1 tech stack full time during the day, I felt like I've been trapped inside my own bubble, with no idea what is happening outside. So while working on Svelte, I learned a lot of things that I could never got it from work.");
			t123 = space();
			section2 = element("section");
			h21 = element("h2");
			a20 = element("a");
			t124 = text("Second Story");
			t125 = space();
			p37 = element("p");
			t126 = text("The second story, is about connecting the dots.");
			t127 = space();
			p38 = element("p");
			t128 = text("In Svelte, CSS is scoped in the component that you are writing. In this example:");
			t129 = space();
			pre8 = element("pre");
			t130 = space();
			p39 = element("p");
			t131 = text("the ");
			code5 = element("code");
			t132 = text("padding: 5px");
			t133 = text(" will only apply to the all the ");
			code6 = element("code");
			t134 = text("<div>");
			t135 = text("s written in this component file. Any ");
			code7 = element("code");
			t136 = text("<div>");
			t137 = text(" inside ");
			code8 = element("code");
			t138 = text("<Component />");
			t139 = text(" will not be affected.");
			t140 = space();
			p40 = element("p");
			t141 = text("This is great, but it has its shortcoming too.");
			t142 = space();
			p41 = element("p");
			t143 = text("The problem with this is that, there’s no idiomatic way to override styles in the ");
			code9 = element("code");
			t144 = text("<Component />");
			t145 = text(".");
			t146 = space();
			p42 = element("p");
			t147 = text("To achieve scoped CSS, when Svelte compiles the style tags, it converts all the CSS selectors into a hashed version, and replacted it on the element. And there's no way you can access the hashed CSS selector, let alone passing it into ");
			code10 = element("code");
			t148 = text("<Component />");
			t149 = text(" as class name.");
			t150 = space();
			p43 = element("p");
			t151 = text("To override the styles inside ");
			code11 = element("code");
			t152 = text("<Component />");
			t153 = text(", a common solution would be to use the ");
			code12 = element("code");
			t154 = text(":global");
			t155 = text(" selector:");
			t156 = space();
			pre9 = element("pre");
			t157 = space();
			p44 = element("p");
			t158 = text("Which basically forego the benefit of scoped css, and applied it to all inner divs in this component.");
			t159 = space();
			p45 = element("p");
			t160 = text("One thing I wanted to point out is that, the ");
			code13 = element("code");
			t161 = text("<Component />");
			t162 = text(" should have control on what styles can be modified and what cannot be changed.");
			t163 = space();
			p46 = element("p");
			t164 = text("In React, when we passing in a ");
			code14 = element("code");
			t165 = text("className");
			t166 = text(", we kind of have to understand the DOM structure of the ");
			code15 = element("code");
			t167 = text("<Component />");
			t168 = text(", which should be well encapsulated and private to the user.");
			t169 = space();
			p47 = element("p");
			t170 = text("And secondly, any styles you pass in through the ");
			code16 = element("code");
			t171 = text("className");
			t172 = text(", could potentially break things unwantedly. The ");
			code17 = element("code");
			t173 = text("<Component />");
			t174 = text(" has no control of what could be changed by the user.");
			t175 = space();
			section3 = element("section");
			h30 = element("h3");
			a21 = element("a");
			t176 = text("CSS Custom Properties aka CSS Variables");
			t177 = space();
			p48 = element("p");
			t178 = text("So a better solution that has been proposed, is to use CSS Variables:");
			t179 = space();
			pre10 = element("pre");
			t180 = space();
			p49 = element("p");
			t181 = text("You can expose the CSS custom properties you allow to modify, without having to leak out the DOM structure of your component.");
			t182 = space();
			p50 = element("p");
			t183 = text("You can expose the CSS custom properties as meaningful css variable names, and when you are using it, you can have a fallback if the CSS custom property is not presentavailable, you can have a fallback.");
			t184 = space();
			p51 = element("p");
			t185 = text("So the user of the ");
			code18 = element("code");
			t186 = text("Component");
			t187 = text(" can set the custom properties like this:");
			t188 = space();
			pre11 = element("pre");
			t189 = space();
			p52 = element("p");
			t190 = text("So there is a ");
			a22 = element("a");
			t191 = text("RFC proposed");
			t192 = text(" along with a sugar syntax to have custom attributes for Svelte components:");
			t193 = space();
			pre12 = element("pre");
			t194 = space();
			p53 = element("p");
			t195 = text("But the very problem of this is to have another ");
			code19 = element("code");
			t196 = text("<div>");
			t197 = text(" element that wasn't there in the first place, which could break the layout.");
			t198 = space();
			p54 = element("p");
			t199 = text("So Rich was asking in the ");
			a23 = element("a");
			t200 = text("Svelte Discord chat");
			t201 = text(" whether is there anyway to have the divs disappear in terms of layout:");
			t202 = space();
			p55 = element("p");
			img3 = element("img");
			t203 = space();
			p56 = element("p");
			t204 = text("That brings me to another dot of my story... which was more than 1 year ago in Shopee, long before RK, where we had weekly sharings in a small meeting room.");
			t205 = space();
			p57 = element("p");
			t206 = text("It was when ");
			a24 = element("a");
			t207 = text("Gao Wei");
			t208 = text(" did her sharing.");
			t209 = space();
			p58 = element("p");
			t210 = text("So this is a normal Jira board:");
			t211 = space();
			p59 = element("p");
			img4 = element("img");
			t212 = space();
			p60 = element("p");
			t213 = text("But it is not cool enough for cool kids for Wei, so she tried to customise it with CSS.");
			t214 = space();
			p61 = element("p");
			t215 = text("One of the issue with the Jira board is that the columns are fixed width, it doesn't stretch/resize when the ticket title is long.");
			t216 = space();
			p62 = element("p");
			t217 = text("But it is not an easy feat to resize the width with CSS, where she explained how the complexity of the DOM structure aggravate the problem.");
			t218 = space();
			p63 = element("p");
			t219 = text("In the Jira board, the header and the swimlane sections are made up of different ");
			code20 = element("code");
			t220 = text("div");
			t221 = text(" container.");
			t222 = space();
			p64 = element("p");
			img5 = element("img");
			t223 = space();
			p65 = element("p");
			t224 = text("And after a few nested ");
			code21 = element("code");
			t225 = text("div");
			t226 = text("s, you get ");
			code22 = element("code");
			t227 = text("div");
			t228 = text(" for each column:");
			t229 = space();
			p66 = element("p");
			img6 = element("img");
			t230 = space();
			p67 = element("p");
			t231 = text("So, in the end, it looks something like this in the DOM tree structure:");
			t232 = space();
			pre13 = element("pre");
			t233 = space();
			p68 = element("p");
			t234 = text("So how are you going to automatically resize both ");
			code23 = element("code");
			t235 = text("Content 1");
			t236 = text(" and ");
			code24 = element("code");
			t237 = text("Header 1");
			t238 = text(" based on their content, and maintain the same width for both of them?");
			t239 = space();
			p69 = element("p");
			t240 = text("You can do it with ");
			a25 = element("a");
			code25 = element("code");
			t241 = text("display: table-column");
			t242 = text(", but there's too many intermediate DOM elements between the cells and the whole container.");
			t243 = space();
			p70 = element("p");
			t244 = text("What she needs is a magical CSS values to make the intermediate DOM elements disappear in terms of layout.");
			t245 = space();
			p71 = element("p");
			t246 = text("And she revealed her magic secret:");
			t247 = space();
			pre14 = element("pre");
			t248 = space();
			p72 = element("p");
			t249 = text("In the same example, say if you apply a ");
			code26 = element("code");
			t250 = text("display: flex");
			t251 = text(" to the ");
			code27 = element("code");
			t252 = text(".header-group");
			t253 = text(", the ");
			code28 = element("code");
			t254 = text(".header-group");
			t255 = text(" only got 1 flex item right? If you put ");
			code29 = element("code");
			t256 = text("display: contents");
			t257 = text(" to the ");
			code30 = element("code");
			t258 = text(".headers");
			t259 = text(", it will disappear in terms of layout, and now, to ");
			code31 = element("code");
			t260 = text(".header-group");
			t261 = text(", it has 3 flex items, the 3 header ");
			code32 = element("code");
			t262 = text("li");
			t263 = text("s.");
			t264 = space();
			p73 = element("p");
			t265 = text("The ");
			code33 = element("code");
			t266 = text("display: contents");
			t267 = text(" was so magical, that somehow it etched into me since.");
			t268 = space();
			p74 = element("p");
			t269 = text("So I proposed it to Rich in the chat, and now it is part of the proposed solution in the ");
			a26 = element("a");
			t270 = text("RFC");
			t271 = text(".");
			t272 = space();
			p75 = element("p");
			t273 = text("So I would like to end my stories with one of my favourite quote, from Steve Jobs,");
			t274 = space();
			blockquote = element("blockquote");
			p76 = element("p");
			t275 = text("You can't connect the dots looking forward, you can only connect them looking backwards.");
			t276 = space();
			p77 = element("p");
			t277 = text("So you have to trust that the dots will somehow connect in your future.");
			t278 = space();
			p78 = element("p");
			t279 = text("So I would like to end the sharing with 2 shoutouts:");
			t280 = space();
			section4 = element("section");
			h31 = element("h3");
			a27 = element("a");
			t281 = text("Please do sharing more often.");
			t282 = space();
			p79 = element("p");
			t283 = text("What you have learned or tried, ever small or simple, it maybe useful for someone in the audience in ways you can never imagine.");
			t284 = space();
			p80 = element("p");
			em0 = element("em");
			t285 = text("You can't connect the dots looking forward.");
			t286 = space();
			section5 = element("section");
			h32 = element("h3");
			a28 = element("a");
			t287 = text("Please do participate in RK more often");
			t288 = space();
			p81 = element("p");
			t289 = text("Our weekly internal RK is not mandatory. But still, make an effort to join us every week. You never know what you've just learned may be useful to you some day in the future.");
			t290 = space();
			p82 = element("p");
			em1 = element("em");
			t291 = text("You got to trust the dots will somehow connect in your future");
			t292 = text(".");
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
			t0 = claim_text(a0_nodes, "First Story");
			a0_nodes.forEach(detach);
			li0_nodes.forEach(detach);
			li1 = claim_element(ul1_nodes, "LI", {});
			var li1_nodes = children(li1);
			a1 = claim_element(li1_nodes, "A", { href: true });
			var a1_nodes = children(a1);
			t1 = claim_text(a1_nodes, "Second Story");
			a1_nodes.forEach(detach);
			li1_nodes.forEach(detach);
			ul0 = claim_element(ul1_nodes, "UL", {});
			var ul0_nodes = children(ul0);
			li2 = claim_element(ul0_nodes, "LI", {});
			var li2_nodes = children(li2);
			a2 = claim_element(li2_nodes, "A", { href: true });
			var a2_nodes = children(a2);
			t2 = claim_text(a2_nodes, "CSS Custom Properties aka CSS Variables");
			a2_nodes.forEach(detach);
			li2_nodes.forEach(detach);
			li3 = claim_element(ul0_nodes, "LI", {});
			var li3_nodes = children(li3);
			a3 = claim_element(li3_nodes, "A", { href: true });
			var a3_nodes = children(a3);
			t3 = claim_text(a3_nodes, "Please do sharing more often.");
			a3_nodes.forEach(detach);
			li3_nodes.forEach(detach);
			li4 = claim_element(ul0_nodes, "LI", {});
			var li4_nodes = children(li4);
			a4 = claim_element(li4_nodes, "A", { href: true });
			var a4_nodes = children(a4);
			t4 = claim_text(a4_nodes, "Please do participate in RK more often");
			a4_nodes.forEach(detach);
			li4_nodes.forEach(detach);
			ul0_nodes.forEach(detach);
			ul1_nodes.forEach(detach);
			section0_nodes.forEach(detach);
			t5 = claim_space(nodes);
			p0 = claim_element(nodes, "P", {});
			var p0_nodes = children(p0);
			t6 = claim_text(p0_nodes, "It's Friday evening, so I've decided to go light and easy, and share with y'all 2 interesting anecdote while I was working on Svelte.");
			p0_nodes.forEach(detach);
			t7 = claim_space(nodes);
			section1 = claim_element(nodes, "SECTION", {});
			var section1_nodes = children(section1);
			h20 = claim_element(section1_nodes, "H2", {});
			var h20_nodes = children(h20);
			a5 = claim_element(h20_nodes, "A", { href: true, id: true });
			var a5_nodes = children(a5);
			t8 = claim_text(a5_nodes, "First Story");
			a5_nodes.forEach(detach);
			h20_nodes.forEach(detach);
			t9 = claim_space(section1_nodes);
			p1 = claim_element(section1_nodes, "P", {});
			var p1_nodes = children(p1);
			t10 = claim_text(p1_nodes, "The first story started with ");
			a6 = claim_element(p1_nodes, "A", { href: true, rel: true });
			var a6_nodes = children(a6);
			t11 = claim_text(a6_nodes, "Hacktoberfest");
			a6_nodes.forEach(detach);
			t12 = claim_text(p1_nodes, ".");
			p1_nodes.forEach(detach);
			t13 = claim_space(section1_nodes);
			p2 = claim_element(section1_nodes, "P", {});
			var p2_nodes = children(p2);
			img0 = claim_element(p2_nodes, "IMG", { src: true, alt: true });
			p2_nodes.forEach(detach);
			t14 = claim_space(section1_nodes);
			p3 = claim_element(section1_nodes, "P", {});
			var p3_nodes = children(p3);
			t15 = claim_text(p3_nodes, "Anyone knows about Hacktoberfest? Anyone finished Hacktoberfest?");
			p3_nodes.forEach(detach);
			t16 = claim_space(section1_nodes);
			p4 = claim_element(section1_nodes, "P", {});
			var p4_nodes = children(p4);
			t17 = claim_text(p4_nodes, "So for to benefit of those who don't know about Hacktoberfest, Hacktoberfest is an annual event organised by ");
			a7 = claim_element(p4_nodes, "A", { href: true, rel: true });
			var a7_nodes = children(a7);
			t18 = claim_text(a7_nodes, "DigitalOcean");
			a7_nodes.forEach(detach);
			t19 = claim_text(p4_nodes, ", and this year they partnered with ");
			a8 = claim_element(p4_nodes, "A", { href: true, rel: true });
			var a8_nodes = children(a8);
			t20 = claim_text(a8_nodes, "dev.to");
			a8_nodes.forEach(detach);
			t21 = claim_text(p4_nodes, ".");
			p4_nodes.forEach(detach);
			t22 = claim_space(section1_nodes);
			p5 = claim_element(section1_nodes, "P", {});
			var p5_nodes = children(p5);
			t23 = claim_text(p5_nodes, "So during the month of October, if you managed to make 4 PRs to any public ");
			a9 = claim_element(p5_nodes, "A", { href: true, rel: true });
			var a9_nodes = children(a9);
			t24 = claim_text(a9_nodes, "Github");
			a9_nodes.forEach(detach);
			t25 = claim_text(p5_nodes, " repository, you will get a free T-shirts and swags.");
			p5_nodes.forEach(detach);
			t26 = claim_space(section1_nodes);
			p6 = claim_element(section1_nodes, "P", {});
			var p6_nodes = children(p6);
			img1 = claim_element(p6_nodes, "IMG", { src: true, alt: true, title: true });
			p6_nodes.forEach(detach);
			t27 = claim_space(section1_nodes);
			p7 = claim_element(section1_nodes, "P", {});
			var p7_nodes = children(p7);
			t28 = claim_text(p7_nodes, "So this year Hacktoberfest, I was working on this frontend framework called ");
			a10 = claim_element(p7_nodes, "A", { href: true, rel: true });
			var a10_nodes = children(a10);
			t29 = claim_text(a10_nodes, "Svelte");
			a10_nodes.forEach(detach);
			t30 = claim_text(p7_nodes, ".");
			p7_nodes.forEach(detach);
			t31 = claim_space(section1_nodes);
			p8 = claim_element(section1_nodes, "P", {});
			var p8_nodes = children(p8);
			t32 = claim_text(p8_nodes, "If you never heard about Svelte, I recommend you to watch Rich Harris talk on ");
			a11 = claim_element(p8_nodes, "A", { href: true, rel: true });
			var a11_nodes = children(a11);
			t33 = claim_text(a11_nodes, "\"Rethinking Reactivity\"");
			a11_nodes.forEach(detach);
			t34 = claim_text(p8_nodes, ".");
			p8_nodes.forEach(detach);
			t35 = claim_space(section1_nodes);
			p9 = claim_element(section1_nodes, "P", {});
			var p9_nodes = children(p9);
			t36 = claim_text(p9_nodes, "So what so special about this new frontend framework?");
			p9_nodes.forEach(detach);
			t37 = claim_space(section1_nodes);
			p10 = claim_element(section1_nodes, "P", {});
			var p10_nodes = children(p10);
			t38 = claim_text(p10_nodes, "Well, firstly, a svelte component is a single file component, just like Vue. You have your script, styles and HTML elements all in one place:");
			p10_nodes.forEach(detach);
			t39 = claim_space(section1_nodes);
			pre0 = claim_element(section1_nodes, "PRE", { class: true });
			var pre0_nodes = children(pre0);
			pre0_nodes.forEach(detach);
			t40 = claim_space(section1_nodes);
			p11 = claim_element(section1_nodes, "P", {});
			var p11_nodes = children(p11);
			t41 = claim_text(p11_nodes, "Secondly, Svelte is a compiler. It compiles the single file component into simple JavaScript statements like these:");
			p11_nodes.forEach(detach);
			t42 = claim_space(section1_nodes);
			pre1 = claim_element(section1_nodes, "PRE", { class: true });
			var pre1_nodes = children(pre1);
			pre1_nodes.forEach(detach);
			t43 = claim_space(section1_nodes);
			p12 = claim_element(section1_nodes, "P", {});
			var p12_nodes = children(p12);
			t44 = claim_text(p12_nodes, "It is the simplest way of creating DOM nodes, not much overhead code, no work loop like React, nothing.");
			p12_nodes.forEach(detach);
			t45 = claim_space(section1_nodes);
			p13 = claim_element(section1_nodes, "P", {});
			var p13_nodes = children(p13);
			t46 = claim_text(p13_nodes, "The benefit of doing this is that the bundle size can be very small, and it can run without much runtime overheads.");
			p13_nodes.forEach(detach);
			t47 = claim_space(section1_nodes);
			p14 = claim_element(section1_nodes, "P", {});
			var p14_nodes = children(p14);
			t48 = claim_text(p14_nodes, "However, if you look at a slightly more complex component like the one below:");
			p14_nodes.forEach(detach);
			t49 = claim_space(section1_nodes);
			pre2 = claim_element(section1_nodes, "PRE", { class: true });
			var pre2_nodes = children(pre2);
			pre2_nodes.forEach(detach);
			t50 = claim_space(section1_nodes);
			p15 = claim_element(section1_nodes, "P", {});
			var p15_nodes = children(p15);
			t51 = claim_text(p15_nodes, "it gets compiled into more code:");
			p15_nodes.forEach(detach);
			t52 = claim_space(section1_nodes);
			pre3 = claim_element(section1_nodes, "PRE", { class: true });
			var pre3_nodes = children(pre3);
			pre3_nodes.forEach(detach);
			t53 = claim_space(section1_nodes);
			p16 = claim_element(section1_nodes, "P", {});
			var p16_nodes = children(p16);
			t54 = claim_text(p16_nodes, "Which is natural right?");
			p16_nodes.forEach(detach);
			t55 = claim_space(section1_nodes);
			p17 = claim_element(section1_nodes, "P", {});
			var p17_nodes = children(p17);
			t56 = claim_text(p17_nodes, "But, when I was fiddling the ");
			a12 = claim_element(p17_nodes, "A", { href: true, rel: true });
			var a12_nodes = children(a12);
			t57 = claim_text(a12_nodes, "Svelte REPL");
			a12_nodes.forEach(detach);
			t58 = claim_text(p17_nodes, ", I was looking at the code, thinking to myself, in this component, greeting has never changed, so there's no need for any reactivity, so why should we still build element one by one, why not just use ");
			code0 = claim_element(p17_nodes, "CODE", {});
			var code0_nodes = children(code0);
			t59 = claim_text(code0_nodes, "innerHTML");
			code0_nodes.forEach(detach);
			t60 = claim_text(p17_nodes, "?");
			p17_nodes.forEach(detach);
			t61 = claim_space(section1_nodes);
			pre4 = claim_element(section1_nodes, "PRE", { class: true });
			var pre4_nodes = children(pre4);
			pre4_nodes.forEach(detach);
			t62 = claim_space(section1_nodes);
			p18 = claim_element(section1_nodes, "P", {});
			var p18_nodes = children(p18);
			t63 = claim_text(p18_nodes, "So, that was what I did, and I ");
			a13 = claim_element(p18_nodes, "A", { href: true, rel: true });
			var a13_nodes = children(a13);
			t64 = claim_text(a13_nodes, "submitted an PR");
			a13_nodes.forEach(detach);
			t65 = claim_text(p18_nodes, ".");
			p18_nodes.forEach(detach);
			t66 = claim_space(section1_nodes);
			p19 = claim_element(section1_nodes, "P", {});
			var p19_nodes = children(p19);
			t67 = claim_text(p19_nodes, "I was ecstatic when it got merged, and ");
			a14 = claim_element(p19_nodes, "A", { href: true, rel: true });
			var a14_nodes = children(a14);
			t68 = claim_text(a14_nodes, "Rich commented \"Damn, this is nice!\"");
			a14_nodes.forEach(detach);
			t69 = claim_text(p19_nodes, ".");
			p19_nodes.forEach(detach);
			t70 = claim_space(section1_nodes);
			p20 = claim_element(section1_nodes, "P", {});
			var p20_nodes = children(p20);
			t71 = claim_text(p20_nodes, "But little did I know a few days later, someone commented on the PR ");
			a15 = claim_element(p20_nodes, "A", { href: true, rel: true });
			var a15_nodes = children(a15);
			t72 = claim_text(a15_nodes, "about opening up to XSS risk");
			a15_nodes.forEach(detach);
			t73 = claim_text(p20_nodes, ".");
			p20_nodes.forEach(detach);
			t74 = claim_space(section1_nodes);
			p21 = claim_element(section1_nodes, "P", {});
			var p21_nodes = children(p21);
			t75 = claim_text(p21_nodes, "XSS (Cross-Site Scripting)? What?!");
			p21_nodes.forEach(detach);
			t76 = claim_space(section1_nodes);
			p22 = claim_element(section1_nodes, "P", {});
			var p22_nodes = children(p22);
			t77 = claim_text(p22_nodes, "So imagine instead of a friendly greeting, someone with a malicious intent changed it to something else:");
			p22_nodes.forEach(detach);
			t78 = claim_space(section1_nodes);
			pre5 = claim_element(section1_nodes, "PRE", { class: true });
			var pre5_nodes = children(pre5);
			pre5_nodes.forEach(detach);
			t79 = claim_space(section1_nodes);
			p23 = claim_element(section1_nodes, "P", {});
			var p23_nodes = children(p23);
			t80 = claim_text(p23_nodes, "Then you would have a malicious click me button on the screen! 😱");
			p23_nodes.forEach(detach);
			t81 = claim_space(section1_nodes);
			p24 = claim_element(section1_nodes, "P", {});
			var p24_nodes = children(p24);
			t82 = claim_text(p24_nodes, "So I googled, and I found this ");
			a16 = claim_element(p24_nodes, "A", { href: true, rel: true });
			var a16_nodes = children(a16);
			t83 = claim_text(a16_nodes, "Open Web Application Security Project (OWASP)");
			a16_nodes.forEach(detach);
			t84 = claim_text(p24_nodes, ", which they have a long list of ");
			a17 = claim_element(p24_nodes, "A", { href: true, rel: true });
			var a17_nodes = children(a17);
			t85 = claim_text(a17_nodes, "cheatsheets about and how to prevent web vulnerability");
			a17_nodes.forEach(detach);
			t86 = claim_text(p24_nodes, ".");
			p24_nodes.forEach(detach);
			t87 = claim_space(section1_nodes);
			p25 = claim_element(section1_nodes, "P", {});
			var p25_nodes = children(p25);
			img2 = claim_element(p25_nodes, "IMG", { src: true, alt: true });
			p25_nodes.forEach(detach);
			t88 = claim_space(section1_nodes);
			p26 = claim_element(section1_nodes, "P", {});
			var p26_nodes = children(p26);
			t89 = claim_text(p26_nodes, "I read up on them and got to learn more about methods to prevent XSS, and so I ");
			a18 = claim_element(p26_nodes, "A", { href: true, rel: true });
			var a18_nodes = children(a18);
			t90 = claim_text(a18_nodes, "made another PR");
			a18_nodes.forEach(detach);
			t91 = claim_text(p26_nodes, ".");
			p26_nodes.forEach(detach);
			t92 = claim_space(section1_nodes);
			p27 = claim_element(section1_nodes, "P", {});
			var p27_nodes = children(p27);
			t93 = claim_text(p27_nodes, "And it got fixed! Finally!");
			p27_nodes.forEach(detach);
			t94 = claim_space(section1_nodes);
			p28 = claim_element(section1_nodes, "P", {});
			var p28_nodes = children(p28);
			t95 = claim_text(p28_nodes, "Or is it? 🤔");
			p28_nodes.forEach(detach);
			t96 = claim_space(section1_nodes);
			p29 = claim_element(section1_nodes, "P", {});
			var p29_nodes = children(p29);
			t97 = claim_text(p29_nodes, "Well in my new PR, I did not revert all the changes I made previously, I still attempt to have some optimisation with static content. So instead of using ");
			code1 = claim_element(p29_nodes, "CODE", {});
			var code1_nodes = children(code1);
			t98 = claim_text(code1_nodes, "innerHTML");
			code1_nodes.forEach(detach);
			t99 = claim_text(p29_nodes, ", I used ");
			code2 = claim_element(p29_nodes, "CODE", {});
			var code2_nodes = children(code2);
			t100 = claim_text(code2_nodes, "textContent");
			code2_nodes.forEach(detach);
			t101 = claim_text(p29_nodes, ", which is safe for XSS attacks.");
			p29_nodes.forEach(detach);
			t102 = claim_space(section1_nodes);
			pre6 = claim_element(section1_nodes, "PRE", { class: true });
			var pre6_nodes = children(pre6);
			pre6_nodes.forEach(detach);
			t103 = claim_space(section1_nodes);
			p30 = claim_element(section1_nodes, "P", {});
			var p30_nodes = children(p30);
			t104 = claim_text(p30_nodes, "So, although they looked similar, but when it got executed, they are different:");
			p30_nodes.forEach(detach);
			t105 = claim_space(section1_nodes);
			pre7 = claim_element(section1_nodes, "PRE", { class: true });
			var pre7_nodes = children(pre7);
			pre7_nodes.forEach(detach);
			t106 = claim_space(section1_nodes);
			p31 = claim_element(section1_nodes, "P", {});
			var p31_nodes = children(p31);
			code3 = claim_element(p31_nodes, "CODE", {});
			var code3_nodes = children(code3);
			t107 = claim_text(code3_nodes, "textContent");
			code3_nodes.forEach(detach);
			t108 = claim_text(p31_nodes, " will not unescape the string content.");
			p31_nodes.forEach(detach);
			t109 = claim_space(section1_nodes);
			p32 = claim_element(section1_nodes, "P", {});
			var p32_nodes = children(p32);
			t110 = claim_text(p32_nodes, "Someone found it and raised an issue, so I ");
			a19 = claim_element(p32_nodes, "A", { href: true, rel: true });
			var a19_nodes = children(a19);
			t111 = claim_text(a19_nodes, "made another PR");
			a19_nodes.forEach(detach);
			t112 = claim_text(p32_nodes, ".");
			p32_nodes.forEach(detach);
			t113 = claim_space(section1_nodes);
			p33 = claim_element(section1_nodes, "P", {});
			var p33_nodes = children(p33);
			t114 = claim_text(p33_nodes, "So, that's my first story, of how I innocently trying to optimise the bundle, ending up creating a XSS risk, and how I made multiple PRs to fixed them.");
			p33_nodes.forEach(detach);
			t115 = claim_space(section1_nodes);
			p34 = claim_element(section1_nodes, "P", {});
			var p34_nodes = children(p34);
			t116 = claim_text(p34_nodes, "Before I moved on to the 2nd story, I have a few takeaways I would like to share:");
			p34_nodes.forEach(detach);
			t117 = claim_space(section1_nodes);
			ul2 = claim_element(section1_nodes, "UL", {});
			var ul2_nodes = children(ul2);
			li5 = claim_element(ul2_nodes, "LI", {});
			var li5_nodes = children(li5);
			p35 = claim_element(li5_nodes, "P", {});
			var p35_nodes = children(p35);
			t118 = claim_text(p35_nodes, "As a React developer, I have been so used to have React taking care of the XSS vulnerability for me. As long as i dont use ");
			code4 = claim_element(p35_nodes, "CODE", {});
			var code4_nodes = children(code4);
			t119 = claim_text(code4_nodes, "dangeourslySetInnerHtml");
			code4_nodes.forEach(detach);
			t120 = claim_text(p35_nodes, ", I'm all good. Therefore, it has never occur to me that it is still a potential threat.");
			p35_nodes.forEach(detach);
			li5_nodes.forEach(detach);
			t121 = claim_space(ul2_nodes);
			li6 = claim_element(ul2_nodes, "LI", {});
			var li6_nodes = children(li6);
			p36 = claim_element(li6_nodes, "P", {});
			var p36_nodes = children(p36);
			t122 = claim_text(p36_nodes, "I find it interesting to work on technologies/stack that we don't use it at work during free time. Having to work on 1 tech stack full time during the day, I felt like I've been trapped inside my own bubble, with no idea what is happening outside. So while working on Svelte, I learned a lot of things that I could never got it from work.");
			p36_nodes.forEach(detach);
			li6_nodes.forEach(detach);
			ul2_nodes.forEach(detach);
			section1_nodes.forEach(detach);
			t123 = claim_space(nodes);
			section2 = claim_element(nodes, "SECTION", {});
			var section2_nodes = children(section2);
			h21 = claim_element(section2_nodes, "H2", {});
			var h21_nodes = children(h21);
			a20 = claim_element(h21_nodes, "A", { href: true, id: true });
			var a20_nodes = children(a20);
			t124 = claim_text(a20_nodes, "Second Story");
			a20_nodes.forEach(detach);
			h21_nodes.forEach(detach);
			t125 = claim_space(section2_nodes);
			p37 = claim_element(section2_nodes, "P", {});
			var p37_nodes = children(p37);
			t126 = claim_text(p37_nodes, "The second story, is about connecting the dots.");
			p37_nodes.forEach(detach);
			t127 = claim_space(section2_nodes);
			p38 = claim_element(section2_nodes, "P", {});
			var p38_nodes = children(p38);
			t128 = claim_text(p38_nodes, "In Svelte, CSS is scoped in the component that you are writing. In this example:");
			p38_nodes.forEach(detach);
			t129 = claim_space(section2_nodes);
			pre8 = claim_element(section2_nodes, "PRE", { class: true });
			var pre8_nodes = children(pre8);
			pre8_nodes.forEach(detach);
			t130 = claim_space(section2_nodes);
			p39 = claim_element(section2_nodes, "P", {});
			var p39_nodes = children(p39);
			t131 = claim_text(p39_nodes, "the ");
			code5 = claim_element(p39_nodes, "CODE", {});
			var code5_nodes = children(code5);
			t132 = claim_text(code5_nodes, "padding: 5px");
			code5_nodes.forEach(detach);
			t133 = claim_text(p39_nodes, " will only apply to the all the ");
			code6 = claim_element(p39_nodes, "CODE", {});
			var code6_nodes = children(code6);
			t134 = claim_text(code6_nodes, "<div>");
			code6_nodes.forEach(detach);
			t135 = claim_text(p39_nodes, "s written in this component file. Any ");
			code7 = claim_element(p39_nodes, "CODE", {});
			var code7_nodes = children(code7);
			t136 = claim_text(code7_nodes, "<div>");
			code7_nodes.forEach(detach);
			t137 = claim_text(p39_nodes, " inside ");
			code8 = claim_element(p39_nodes, "CODE", {});
			var code8_nodes = children(code8);
			t138 = claim_text(code8_nodes, "<Component />");
			code8_nodes.forEach(detach);
			t139 = claim_text(p39_nodes, " will not be affected.");
			p39_nodes.forEach(detach);
			t140 = claim_space(section2_nodes);
			p40 = claim_element(section2_nodes, "P", {});
			var p40_nodes = children(p40);
			t141 = claim_text(p40_nodes, "This is great, but it has its shortcoming too.");
			p40_nodes.forEach(detach);
			t142 = claim_space(section2_nodes);
			p41 = claim_element(section2_nodes, "P", {});
			var p41_nodes = children(p41);
			t143 = claim_text(p41_nodes, "The problem with this is that, there’s no idiomatic way to override styles in the ");
			code9 = claim_element(p41_nodes, "CODE", {});
			var code9_nodes = children(code9);
			t144 = claim_text(code9_nodes, "<Component />");
			code9_nodes.forEach(detach);
			t145 = claim_text(p41_nodes, ".");
			p41_nodes.forEach(detach);
			t146 = claim_space(section2_nodes);
			p42 = claim_element(section2_nodes, "P", {});
			var p42_nodes = children(p42);
			t147 = claim_text(p42_nodes, "To achieve scoped CSS, when Svelte compiles the style tags, it converts all the CSS selectors into a hashed version, and replacted it on the element. And there's no way you can access the hashed CSS selector, let alone passing it into ");
			code10 = claim_element(p42_nodes, "CODE", {});
			var code10_nodes = children(code10);
			t148 = claim_text(code10_nodes, "<Component />");
			code10_nodes.forEach(detach);
			t149 = claim_text(p42_nodes, " as class name.");
			p42_nodes.forEach(detach);
			t150 = claim_space(section2_nodes);
			p43 = claim_element(section2_nodes, "P", {});
			var p43_nodes = children(p43);
			t151 = claim_text(p43_nodes, "To override the styles inside ");
			code11 = claim_element(p43_nodes, "CODE", {});
			var code11_nodes = children(code11);
			t152 = claim_text(code11_nodes, "<Component />");
			code11_nodes.forEach(detach);
			t153 = claim_text(p43_nodes, ", a common solution would be to use the ");
			code12 = claim_element(p43_nodes, "CODE", {});
			var code12_nodes = children(code12);
			t154 = claim_text(code12_nodes, ":global");
			code12_nodes.forEach(detach);
			t155 = claim_text(p43_nodes, " selector:");
			p43_nodes.forEach(detach);
			t156 = claim_space(section2_nodes);
			pre9 = claim_element(section2_nodes, "PRE", { class: true });
			var pre9_nodes = children(pre9);
			pre9_nodes.forEach(detach);
			t157 = claim_space(section2_nodes);
			p44 = claim_element(section2_nodes, "P", {});
			var p44_nodes = children(p44);
			t158 = claim_text(p44_nodes, "Which basically forego the benefit of scoped css, and applied it to all inner divs in this component.");
			p44_nodes.forEach(detach);
			t159 = claim_space(section2_nodes);
			p45 = claim_element(section2_nodes, "P", {});
			var p45_nodes = children(p45);
			t160 = claim_text(p45_nodes, "One thing I wanted to point out is that, the ");
			code13 = claim_element(p45_nodes, "CODE", {});
			var code13_nodes = children(code13);
			t161 = claim_text(code13_nodes, "<Component />");
			code13_nodes.forEach(detach);
			t162 = claim_text(p45_nodes, " should have control on what styles can be modified and what cannot be changed.");
			p45_nodes.forEach(detach);
			t163 = claim_space(section2_nodes);
			p46 = claim_element(section2_nodes, "P", {});
			var p46_nodes = children(p46);
			t164 = claim_text(p46_nodes, "In React, when we passing in a ");
			code14 = claim_element(p46_nodes, "CODE", {});
			var code14_nodes = children(code14);
			t165 = claim_text(code14_nodes, "className");
			code14_nodes.forEach(detach);
			t166 = claim_text(p46_nodes, ", we kind of have to understand the DOM structure of the ");
			code15 = claim_element(p46_nodes, "CODE", {});
			var code15_nodes = children(code15);
			t167 = claim_text(code15_nodes, "<Component />");
			code15_nodes.forEach(detach);
			t168 = claim_text(p46_nodes, ", which should be well encapsulated and private to the user.");
			p46_nodes.forEach(detach);
			t169 = claim_space(section2_nodes);
			p47 = claim_element(section2_nodes, "P", {});
			var p47_nodes = children(p47);
			t170 = claim_text(p47_nodes, "And secondly, any styles you pass in through the ");
			code16 = claim_element(p47_nodes, "CODE", {});
			var code16_nodes = children(code16);
			t171 = claim_text(code16_nodes, "className");
			code16_nodes.forEach(detach);
			t172 = claim_text(p47_nodes, ", could potentially break things unwantedly. The ");
			code17 = claim_element(p47_nodes, "CODE", {});
			var code17_nodes = children(code17);
			t173 = claim_text(code17_nodes, "<Component />");
			code17_nodes.forEach(detach);
			t174 = claim_text(p47_nodes, " has no control of what could be changed by the user.");
			p47_nodes.forEach(detach);
			section2_nodes.forEach(detach);
			t175 = claim_space(nodes);
			section3 = claim_element(nodes, "SECTION", {});
			var section3_nodes = children(section3);
			h30 = claim_element(section3_nodes, "H3", {});
			var h30_nodes = children(h30);
			a21 = claim_element(h30_nodes, "A", { href: true, id: true });
			var a21_nodes = children(a21);
			t176 = claim_text(a21_nodes, "CSS Custom Properties aka CSS Variables");
			a21_nodes.forEach(detach);
			h30_nodes.forEach(detach);
			t177 = claim_space(section3_nodes);
			p48 = claim_element(section3_nodes, "P", {});
			var p48_nodes = children(p48);
			t178 = claim_text(p48_nodes, "So a better solution that has been proposed, is to use CSS Variables:");
			p48_nodes.forEach(detach);
			t179 = claim_space(section3_nodes);
			pre10 = claim_element(section3_nodes, "PRE", { class: true });
			var pre10_nodes = children(pre10);
			pre10_nodes.forEach(detach);
			t180 = claim_space(section3_nodes);
			p49 = claim_element(section3_nodes, "P", {});
			var p49_nodes = children(p49);
			t181 = claim_text(p49_nodes, "You can expose the CSS custom properties you allow to modify, without having to leak out the DOM structure of your component.");
			p49_nodes.forEach(detach);
			t182 = claim_space(section3_nodes);
			p50 = claim_element(section3_nodes, "P", {});
			var p50_nodes = children(p50);
			t183 = claim_text(p50_nodes, "You can expose the CSS custom properties as meaningful css variable names, and when you are using it, you can have a fallback if the CSS custom property is not presentavailable, you can have a fallback.");
			p50_nodes.forEach(detach);
			t184 = claim_space(section3_nodes);
			p51 = claim_element(section3_nodes, "P", {});
			var p51_nodes = children(p51);
			t185 = claim_text(p51_nodes, "So the user of the ");
			code18 = claim_element(p51_nodes, "CODE", {});
			var code18_nodes = children(code18);
			t186 = claim_text(code18_nodes, "Component");
			code18_nodes.forEach(detach);
			t187 = claim_text(p51_nodes, " can set the custom properties like this:");
			p51_nodes.forEach(detach);
			t188 = claim_space(section3_nodes);
			pre11 = claim_element(section3_nodes, "PRE", { class: true });
			var pre11_nodes = children(pre11);
			pre11_nodes.forEach(detach);
			t189 = claim_space(section3_nodes);
			p52 = claim_element(section3_nodes, "P", {});
			var p52_nodes = children(p52);
			t190 = claim_text(p52_nodes, "So there is a ");
			a22 = claim_element(p52_nodes, "A", { href: true, rel: true });
			var a22_nodes = children(a22);
			t191 = claim_text(a22_nodes, "RFC proposed");
			a22_nodes.forEach(detach);
			t192 = claim_text(p52_nodes, " along with a sugar syntax to have custom attributes for Svelte components:");
			p52_nodes.forEach(detach);
			t193 = claim_space(section3_nodes);
			pre12 = claim_element(section3_nodes, "PRE", { class: true });
			var pre12_nodes = children(pre12);
			pre12_nodes.forEach(detach);
			t194 = claim_space(section3_nodes);
			p53 = claim_element(section3_nodes, "P", {});
			var p53_nodes = children(p53);
			t195 = claim_text(p53_nodes, "But the very problem of this is to have another ");
			code19 = claim_element(p53_nodes, "CODE", {});
			var code19_nodes = children(code19);
			t196 = claim_text(code19_nodes, "<div>");
			code19_nodes.forEach(detach);
			t197 = claim_text(p53_nodes, " element that wasn't there in the first place, which could break the layout.");
			p53_nodes.forEach(detach);
			t198 = claim_space(section3_nodes);
			p54 = claim_element(section3_nodes, "P", {});
			var p54_nodes = children(p54);
			t199 = claim_text(p54_nodes, "So Rich was asking in the ");
			a23 = claim_element(p54_nodes, "A", { href: true, rel: true });
			var a23_nodes = children(a23);
			t200 = claim_text(a23_nodes, "Svelte Discord chat");
			a23_nodes.forEach(detach);
			t201 = claim_text(p54_nodes, " whether is there anyway to have the divs disappear in terms of layout:");
			p54_nodes.forEach(detach);
			t202 = claim_space(section3_nodes);
			p55 = claim_element(section3_nodes, "P", {});
			var p55_nodes = children(p55);
			img3 = claim_element(p55_nodes, "IMG", { src: true, alt: true });
			p55_nodes.forEach(detach);
			t203 = claim_space(section3_nodes);
			p56 = claim_element(section3_nodes, "P", {});
			var p56_nodes = children(p56);
			t204 = claim_text(p56_nodes, "That brings me to another dot of my story... which was more than 1 year ago in Shopee, long before RK, where we had weekly sharings in a small meeting room.");
			p56_nodes.forEach(detach);
			t205 = claim_space(section3_nodes);
			p57 = claim_element(section3_nodes, "P", {});
			var p57_nodes = children(p57);
			t206 = claim_text(p57_nodes, "It was when ");
			a24 = claim_element(p57_nodes, "A", { href: true, rel: true });
			var a24_nodes = children(a24);
			t207 = claim_text(a24_nodes, "Gao Wei");
			a24_nodes.forEach(detach);
			t208 = claim_text(p57_nodes, " did her sharing.");
			p57_nodes.forEach(detach);
			t209 = claim_space(section3_nodes);
			p58 = claim_element(section3_nodes, "P", {});
			var p58_nodes = children(p58);
			t210 = claim_text(p58_nodes, "So this is a normal Jira board:");
			p58_nodes.forEach(detach);
			t211 = claim_space(section3_nodes);
			p59 = claim_element(section3_nodes, "P", {});
			var p59_nodes = children(p59);
			img4 = claim_element(p59_nodes, "IMG", { src: true, alt: true, title: true });
			p59_nodes.forEach(detach);
			t212 = claim_space(section3_nodes);
			p60 = claim_element(section3_nodes, "P", {});
			var p60_nodes = children(p60);
			t213 = claim_text(p60_nodes, "But it is not cool enough for cool kids for Wei, so she tried to customise it with CSS.");
			p60_nodes.forEach(detach);
			t214 = claim_space(section3_nodes);
			p61 = claim_element(section3_nodes, "P", {});
			var p61_nodes = children(p61);
			t215 = claim_text(p61_nodes, "One of the issue with the Jira board is that the columns are fixed width, it doesn't stretch/resize when the ticket title is long.");
			p61_nodes.forEach(detach);
			t216 = claim_space(section3_nodes);
			p62 = claim_element(section3_nodes, "P", {});
			var p62_nodes = children(p62);
			t217 = claim_text(p62_nodes, "But it is not an easy feat to resize the width with CSS, where she explained how the complexity of the DOM structure aggravate the problem.");
			p62_nodes.forEach(detach);
			t218 = claim_space(section3_nodes);
			p63 = claim_element(section3_nodes, "P", {});
			var p63_nodes = children(p63);
			t219 = claim_text(p63_nodes, "In the Jira board, the header and the swimlane sections are made up of different ");
			code20 = claim_element(p63_nodes, "CODE", {});
			var code20_nodes = children(code20);
			t220 = claim_text(code20_nodes, "div");
			code20_nodes.forEach(detach);
			t221 = claim_text(p63_nodes, " container.");
			p63_nodes.forEach(detach);
			t222 = claim_space(section3_nodes);
			p64 = claim_element(section3_nodes, "P", {});
			var p64_nodes = children(p64);
			img5 = claim_element(p64_nodes, "IMG", { src: true, alt: true });
			p64_nodes.forEach(detach);
			t223 = claim_space(section3_nodes);
			p65 = claim_element(section3_nodes, "P", {});
			var p65_nodes = children(p65);
			t224 = claim_text(p65_nodes, "And after a few nested ");
			code21 = claim_element(p65_nodes, "CODE", {});
			var code21_nodes = children(code21);
			t225 = claim_text(code21_nodes, "div");
			code21_nodes.forEach(detach);
			t226 = claim_text(p65_nodes, "s, you get ");
			code22 = claim_element(p65_nodes, "CODE", {});
			var code22_nodes = children(code22);
			t227 = claim_text(code22_nodes, "div");
			code22_nodes.forEach(detach);
			t228 = claim_text(p65_nodes, " for each column:");
			p65_nodes.forEach(detach);
			t229 = claim_space(section3_nodes);
			p66 = claim_element(section3_nodes, "P", {});
			var p66_nodes = children(p66);
			img6 = claim_element(p66_nodes, "IMG", { src: true, alt: true });
			p66_nodes.forEach(detach);
			t230 = claim_space(section3_nodes);
			p67 = claim_element(section3_nodes, "P", {});
			var p67_nodes = children(p67);
			t231 = claim_text(p67_nodes, "So, in the end, it looks something like this in the DOM tree structure:");
			p67_nodes.forEach(detach);
			t232 = claim_space(section3_nodes);
			pre13 = claim_element(section3_nodes, "PRE", { class: true });
			var pre13_nodes = children(pre13);
			pre13_nodes.forEach(detach);
			t233 = claim_space(section3_nodes);
			p68 = claim_element(section3_nodes, "P", {});
			var p68_nodes = children(p68);
			t234 = claim_text(p68_nodes, "So how are you going to automatically resize both ");
			code23 = claim_element(p68_nodes, "CODE", {});
			var code23_nodes = children(code23);
			t235 = claim_text(code23_nodes, "Content 1");
			code23_nodes.forEach(detach);
			t236 = claim_text(p68_nodes, " and ");
			code24 = claim_element(p68_nodes, "CODE", {});
			var code24_nodes = children(code24);
			t237 = claim_text(code24_nodes, "Header 1");
			code24_nodes.forEach(detach);
			t238 = claim_text(p68_nodes, " based on their content, and maintain the same width for both of them?");
			p68_nodes.forEach(detach);
			t239 = claim_space(section3_nodes);
			p69 = claim_element(section3_nodes, "P", {});
			var p69_nodes = children(p69);
			t240 = claim_text(p69_nodes, "You can do it with ");
			a25 = claim_element(p69_nodes, "A", { href: true, rel: true });
			var a25_nodes = children(a25);
			code25 = claim_element(a25_nodes, "CODE", {});
			var code25_nodes = children(code25);
			t241 = claim_text(code25_nodes, "display: table-column");
			code25_nodes.forEach(detach);
			a25_nodes.forEach(detach);
			t242 = claim_text(p69_nodes, ", but there's too many intermediate DOM elements between the cells and the whole container.");
			p69_nodes.forEach(detach);
			t243 = claim_space(section3_nodes);
			p70 = claim_element(section3_nodes, "P", {});
			var p70_nodes = children(p70);
			t244 = claim_text(p70_nodes, "What she needs is a magical CSS values to make the intermediate DOM elements disappear in terms of layout.");
			p70_nodes.forEach(detach);
			t245 = claim_space(section3_nodes);
			p71 = claim_element(section3_nodes, "P", {});
			var p71_nodes = children(p71);
			t246 = claim_text(p71_nodes, "And she revealed her magic secret:");
			p71_nodes.forEach(detach);
			t247 = claim_space(section3_nodes);
			pre14 = claim_element(section3_nodes, "PRE", { class: true });
			var pre14_nodes = children(pre14);
			pre14_nodes.forEach(detach);
			t248 = claim_space(section3_nodes);
			p72 = claim_element(section3_nodes, "P", {});
			var p72_nodes = children(p72);
			t249 = claim_text(p72_nodes, "In the same example, say if you apply a ");
			code26 = claim_element(p72_nodes, "CODE", {});
			var code26_nodes = children(code26);
			t250 = claim_text(code26_nodes, "display: flex");
			code26_nodes.forEach(detach);
			t251 = claim_text(p72_nodes, " to the ");
			code27 = claim_element(p72_nodes, "CODE", {});
			var code27_nodes = children(code27);
			t252 = claim_text(code27_nodes, ".header-group");
			code27_nodes.forEach(detach);
			t253 = claim_text(p72_nodes, ", the ");
			code28 = claim_element(p72_nodes, "CODE", {});
			var code28_nodes = children(code28);
			t254 = claim_text(code28_nodes, ".header-group");
			code28_nodes.forEach(detach);
			t255 = claim_text(p72_nodes, " only got 1 flex item right? If you put ");
			code29 = claim_element(p72_nodes, "CODE", {});
			var code29_nodes = children(code29);
			t256 = claim_text(code29_nodes, "display: contents");
			code29_nodes.forEach(detach);
			t257 = claim_text(p72_nodes, " to the ");
			code30 = claim_element(p72_nodes, "CODE", {});
			var code30_nodes = children(code30);
			t258 = claim_text(code30_nodes, ".headers");
			code30_nodes.forEach(detach);
			t259 = claim_text(p72_nodes, ", it will disappear in terms of layout, and now, to ");
			code31 = claim_element(p72_nodes, "CODE", {});
			var code31_nodes = children(code31);
			t260 = claim_text(code31_nodes, ".header-group");
			code31_nodes.forEach(detach);
			t261 = claim_text(p72_nodes, ", it has 3 flex items, the 3 header ");
			code32 = claim_element(p72_nodes, "CODE", {});
			var code32_nodes = children(code32);
			t262 = claim_text(code32_nodes, "li");
			code32_nodes.forEach(detach);
			t263 = claim_text(p72_nodes, "s.");
			p72_nodes.forEach(detach);
			t264 = claim_space(section3_nodes);
			p73 = claim_element(section3_nodes, "P", {});
			var p73_nodes = children(p73);
			t265 = claim_text(p73_nodes, "The ");
			code33 = claim_element(p73_nodes, "CODE", {});
			var code33_nodes = children(code33);
			t266 = claim_text(code33_nodes, "display: contents");
			code33_nodes.forEach(detach);
			t267 = claim_text(p73_nodes, " was so magical, that somehow it etched into me since.");
			p73_nodes.forEach(detach);
			t268 = claim_space(section3_nodes);
			p74 = claim_element(section3_nodes, "P", {});
			var p74_nodes = children(p74);
			t269 = claim_text(p74_nodes, "So I proposed it to Rich in the chat, and now it is part of the proposed solution in the ");
			a26 = claim_element(p74_nodes, "A", { href: true, rel: true });
			var a26_nodes = children(a26);
			t270 = claim_text(a26_nodes, "RFC");
			a26_nodes.forEach(detach);
			t271 = claim_text(p74_nodes, ".");
			p74_nodes.forEach(detach);
			t272 = claim_space(section3_nodes);
			p75 = claim_element(section3_nodes, "P", {});
			var p75_nodes = children(p75);
			t273 = claim_text(p75_nodes, "So I would like to end my stories with one of my favourite quote, from Steve Jobs,");
			p75_nodes.forEach(detach);
			t274 = claim_space(section3_nodes);
			blockquote = claim_element(section3_nodes, "BLOCKQUOTE", {});
			var blockquote_nodes = children(blockquote);
			p76 = claim_element(blockquote_nodes, "P", {});
			var p76_nodes = children(p76);
			t275 = claim_text(p76_nodes, "You can't connect the dots looking forward, you can only connect them looking backwards.");
			p76_nodes.forEach(detach);
			t276 = claim_space(blockquote_nodes);
			p77 = claim_element(blockquote_nodes, "P", {});
			var p77_nodes = children(p77);
			t277 = claim_text(p77_nodes, "So you have to trust that the dots will somehow connect in your future.");
			p77_nodes.forEach(detach);
			blockquote_nodes.forEach(detach);
			t278 = claim_space(section3_nodes);
			p78 = claim_element(section3_nodes, "P", {});
			var p78_nodes = children(p78);
			t279 = claim_text(p78_nodes, "So I would like to end the sharing with 2 shoutouts:");
			p78_nodes.forEach(detach);
			section3_nodes.forEach(detach);
			t280 = claim_space(nodes);
			section4 = claim_element(nodes, "SECTION", {});
			var section4_nodes = children(section4);
			h31 = claim_element(section4_nodes, "H3", {});
			var h31_nodes = children(h31);
			a27 = claim_element(h31_nodes, "A", { href: true, id: true });
			var a27_nodes = children(a27);
			t281 = claim_text(a27_nodes, "Please do sharing more often.");
			a27_nodes.forEach(detach);
			h31_nodes.forEach(detach);
			t282 = claim_space(section4_nodes);
			p79 = claim_element(section4_nodes, "P", {});
			var p79_nodes = children(p79);
			t283 = claim_text(p79_nodes, "What you have learned or tried, ever small or simple, it maybe useful for someone in the audience in ways you can never imagine.");
			p79_nodes.forEach(detach);
			t284 = claim_space(section4_nodes);
			p80 = claim_element(section4_nodes, "P", {});
			var p80_nodes = children(p80);
			em0 = claim_element(p80_nodes, "EM", {});
			var em0_nodes = children(em0);
			t285 = claim_text(em0_nodes, "You can't connect the dots looking forward.");
			em0_nodes.forEach(detach);
			p80_nodes.forEach(detach);
			section4_nodes.forEach(detach);
			t286 = claim_space(nodes);
			section5 = claim_element(nodes, "SECTION", {});
			var section5_nodes = children(section5);
			h32 = claim_element(section5_nodes, "H3", {});
			var h32_nodes = children(h32);
			a28 = claim_element(h32_nodes, "A", { href: true, id: true });
			var a28_nodes = children(a28);
			t287 = claim_text(a28_nodes, "Please do participate in RK more often");
			a28_nodes.forEach(detach);
			h32_nodes.forEach(detach);
			t288 = claim_space(section5_nodes);
			p81 = claim_element(section5_nodes, "P", {});
			var p81_nodes = children(p81);
			t289 = claim_text(p81_nodes, "Our weekly internal RK is not mandatory. But still, make an effort to join us every week. You never know what you've just learned may be useful to you some day in the future.");
			p81_nodes.forEach(detach);
			t290 = claim_space(section5_nodes);
			p82 = claim_element(section5_nodes, "P", {});
			var p82_nodes = children(p82);
			em1 = claim_element(p82_nodes, "EM", {});
			var em1_nodes = children(em1);
			t291 = claim_text(em1_nodes, "You got to trust the dots will somehow connect in your future");
			em1_nodes.forEach(detach);
			t292 = claim_text(p82_nodes, ".");
			p82_nodes.forEach(detach);
			section5_nodes.forEach(detach);
			this.h();
		},
		h() {
			attr(a0, "href", "#first-story");
			attr(a1, "href", "#second-story");
			attr(a2, "href", "#css-custom-properties-aka-css-variables");
			attr(a3, "href", "#please-do-sharing-more-often");
			attr(a4, "href", "#please-do-participate-in-rk-more-often");
			attr(ul1, "class", "sitemap");
			attr(ul1, "id", "sitemap");
			attr(ul1, "role", "navigation");
			attr(ul1, "aria-label", "Table of Contents");
			attr(a5, "href", "#first-story");
			attr(a5, "id", "first-story");
			attr(a6, "href", "https://hacktoberfest.digitalocean.com/");
			attr(a6, "rel", "nofollow");
			if (img0.src !== (img0_src_value = __build_img__0)) attr(img0, "src", img0_src_value);
			attr(img0, "alt", "hacktoberfest");
			attr(a7, "href", "https://www.digitalocean.com/");
			attr(a7, "rel", "nofollow");
			attr(a8, "href", "http://dev.to/");
			attr(a8, "rel", "nofollow");
			attr(a9, "href", "http://github.com/");
			attr(a9, "rel", "nofollow");
			if (img1.src !== (img1_src_value = __build_img__1)) attr(img1, "src", img1_src_value);
			attr(img1, "alt", "hacktoberfest swags");
			attr(img1, "title", "Hacktoberfest T-shirt and swags");
			attr(a10, "href", "https://svelte.dev/");
			attr(a10, "rel", "nofollow");
			attr(a11, "href", "https://www.youtube.com/watch?v=AdNJ3fydeao");
			attr(a11, "rel", "nofollow");
			attr(pre0, "class", "language-html");
			attr(pre1, "class", "language-js");
			attr(pre2, "class", "language-html");
			attr(pre3, "class", "language-js");
			attr(a12, "href", "http://svelte.dev/repl");
			attr(a12, "rel", "nofollow");
			attr(pre4, "class", "language-js");
			attr(a13, "href", "https://github.com/sveltejs/svelte/pull/3808");
			attr(a13, "rel", "nofollow");
			attr(a14, "href", "https://github.com/sveltejs/svelte/pull/3808#issuecomment-546704569");
			attr(a14, "rel", "nofollow");
			attr(a15, "href", "https://github.com/sveltejs/svelte/pull/3808#issuecomment-546723297");
			attr(a15, "rel", "nofollow");
			attr(pre5, "class", "language-js");
			attr(a16, "href", "https://github.com/OWASP/CheatSheetSeries");
			attr(a16, "rel", "nofollow");
			attr(a17, "href", "https://github.com/OWASP/CheatSheetSeries/tree/master/cheatsheets");
			attr(a17, "rel", "nofollow");
			if (img2.src !== (img2_src_value = __build_img__2)) attr(img2, "src", img2_src_value);
			attr(img2, "alt", "OWASP");
			attr(a18, "href", "https://github.com/sveltejs/svelte/pull/3816");
			attr(a18, "rel", "nofollow");
			attr(pre6, "class", "language-js");
			attr(pre7, "class", "language-html");
			attr(a19, "href", "https://github.com/sveltejs/svelte/pull/3916");
			attr(a19, "rel", "nofollow");
			attr(a20, "href", "#second-story");
			attr(a20, "id", "second-story");
			attr(pre8, "class", "language-html");
			attr(pre9, "class", "language-html");
			attr(a21, "href", "#css-custom-properties-aka-css-variables");
			attr(a21, "id", "css-custom-properties-aka-css-variables");
			attr(pre10, "class", "language-html");
			attr(pre11, "class", "language-html");
			attr(a22, "href", "https://github.com/sveltejs/rfcs/blob/52e20b91ef5b301bd4b3f2a9461b929ac05aca0c/text/0000-style-properties.md");
			attr(a22, "rel", "nofollow");
			attr(pre12, "class", "language-html");
			attr(a23, "href", "https://svelte.dev/chat");
			attr(a23, "rel", "nofollow");
			if (img3.src !== (img3_src_value = __build_img__3)) attr(img3, "src", img3_src_value);
			attr(img3, "alt", "discord chat 1");
			attr(a24, "href", "https://twitter.com/wgao19");
			attr(a24, "rel", "nofollow");
			if (img4.src !== (img4_src_value = __build_img__4)) attr(img4, "src", img4_src_value);
			attr(img4, "alt", "Jira board");
			attr(img4, "title", "Image from https://confluence.atlassian.com/jirasoftwareserver081/using-active-sprints-970611214.html\"");
			if (img5.src !== (img5_src_value = __build_img__5)) attr(img5, "src", img5_src_value);
			attr(img5, "alt", "jira layout 1");
			if (img6.src !== (img6_src_value = __build_img__6)) attr(img6, "src", img6_src_value);
			attr(img6, "alt", "jira layout 2");
			attr(pre13, "class", "language-html");
			attr(a25, "href", "https://css-tricks.com/complete-guide-table-element/");
			attr(a25, "rel", "nofollow");
			attr(pre14, "class", "language-css");
			attr(a26, "href", "https://github.com/sveltejs/rfcs/blob/52e20b91ef5b301bd4b3f2a9461b929ac05aca0c/text/0000-style-properties.md");
			attr(a26, "rel", "nofollow");
			attr(a27, "href", "#please-do-sharing-more-often");
			attr(a27, "id", "please-do-sharing-more-often");
			attr(a28, "href", "#please-do-participate-in-rk-more-often");
			attr(a28, "id", "please-do-participate-in-rk-more-often");
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
			append(ul1, ul0);
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
			insert(target, section1, anchor);
			append(section1, h20);
			append(h20, a5);
			append(a5, t8);
			append(section1, t9);
			append(section1, p1);
			append(p1, t10);
			append(p1, a6);
			append(a6, t11);
			append(p1, t12);
			append(section1, t13);
			append(section1, p2);
			append(p2, img0);
			append(section1, t14);
			append(section1, p3);
			append(p3, t15);
			append(section1, t16);
			append(section1, p4);
			append(p4, t17);
			append(p4, a7);
			append(a7, t18);
			append(p4, t19);
			append(p4, a8);
			append(a8, t20);
			append(p4, t21);
			append(section1, t22);
			append(section1, p5);
			append(p5, t23);
			append(p5, a9);
			append(a9, t24);
			append(p5, t25);
			append(section1, t26);
			append(section1, p6);
			append(p6, img1);
			append(section1, t27);
			append(section1, p7);
			append(p7, t28);
			append(p7, a10);
			append(a10, t29);
			append(p7, t30);
			append(section1, t31);
			append(section1, p8);
			append(p8, t32);
			append(p8, a11);
			append(a11, t33);
			append(p8, t34);
			append(section1, t35);
			append(section1, p9);
			append(p9, t36);
			append(section1, t37);
			append(section1, p10);
			append(p10, t38);
			append(section1, t39);
			append(section1, pre0);
			pre0.innerHTML = raw0_value;
			append(section1, t40);
			append(section1, p11);
			append(p11, t41);
			append(section1, t42);
			append(section1, pre1);
			pre1.innerHTML = raw1_value;
			append(section1, t43);
			append(section1, p12);
			append(p12, t44);
			append(section1, t45);
			append(section1, p13);
			append(p13, t46);
			append(section1, t47);
			append(section1, p14);
			append(p14, t48);
			append(section1, t49);
			append(section1, pre2);
			pre2.innerHTML = raw2_value;
			append(section1, t50);
			append(section1, p15);
			append(p15, t51);
			append(section1, t52);
			append(section1, pre3);
			pre3.innerHTML = raw3_value;
			append(section1, t53);
			append(section1, p16);
			append(p16, t54);
			append(section1, t55);
			append(section1, p17);
			append(p17, t56);
			append(p17, a12);
			append(a12, t57);
			append(p17, t58);
			append(p17, code0);
			append(code0, t59);
			append(p17, t60);
			append(section1, t61);
			append(section1, pre4);
			pre4.innerHTML = raw4_value;
			append(section1, t62);
			append(section1, p18);
			append(p18, t63);
			append(p18, a13);
			append(a13, t64);
			append(p18, t65);
			append(section1, t66);
			append(section1, p19);
			append(p19, t67);
			append(p19, a14);
			append(a14, t68);
			append(p19, t69);
			append(section1, t70);
			append(section1, p20);
			append(p20, t71);
			append(p20, a15);
			append(a15, t72);
			append(p20, t73);
			append(section1, t74);
			append(section1, p21);
			append(p21, t75);
			append(section1, t76);
			append(section1, p22);
			append(p22, t77);
			append(section1, t78);
			append(section1, pre5);
			pre5.innerHTML = raw5_value;
			append(section1, t79);
			append(section1, p23);
			append(p23, t80);
			append(section1, t81);
			append(section1, p24);
			append(p24, t82);
			append(p24, a16);
			append(a16, t83);
			append(p24, t84);
			append(p24, a17);
			append(a17, t85);
			append(p24, t86);
			append(section1, t87);
			append(section1, p25);
			append(p25, img2);
			append(section1, t88);
			append(section1, p26);
			append(p26, t89);
			append(p26, a18);
			append(a18, t90);
			append(p26, t91);
			append(section1, t92);
			append(section1, p27);
			append(p27, t93);
			append(section1, t94);
			append(section1, p28);
			append(p28, t95);
			append(section1, t96);
			append(section1, p29);
			append(p29, t97);
			append(p29, code1);
			append(code1, t98);
			append(p29, t99);
			append(p29, code2);
			append(code2, t100);
			append(p29, t101);
			append(section1, t102);
			append(section1, pre6);
			pre6.innerHTML = raw6_value;
			append(section1, t103);
			append(section1, p30);
			append(p30, t104);
			append(section1, t105);
			append(section1, pre7);
			pre7.innerHTML = raw7_value;
			append(section1, t106);
			append(section1, p31);
			append(p31, code3);
			append(code3, t107);
			append(p31, t108);
			append(section1, t109);
			append(section1, p32);
			append(p32, t110);
			append(p32, a19);
			append(a19, t111);
			append(p32, t112);
			append(section1, t113);
			append(section1, p33);
			append(p33, t114);
			append(section1, t115);
			append(section1, p34);
			append(p34, t116);
			append(section1, t117);
			append(section1, ul2);
			append(ul2, li5);
			append(li5, p35);
			append(p35, t118);
			append(p35, code4);
			append(code4, t119);
			append(p35, t120);
			append(ul2, t121);
			append(ul2, li6);
			append(li6, p36);
			append(p36, t122);
			insert(target, t123, anchor);
			insert(target, section2, anchor);
			append(section2, h21);
			append(h21, a20);
			append(a20, t124);
			append(section2, t125);
			append(section2, p37);
			append(p37, t126);
			append(section2, t127);
			append(section2, p38);
			append(p38, t128);
			append(section2, t129);
			append(section2, pre8);
			pre8.innerHTML = raw8_value;
			append(section2, t130);
			append(section2, p39);
			append(p39, t131);
			append(p39, code5);
			append(code5, t132);
			append(p39, t133);
			append(p39, code6);
			append(code6, t134);
			append(p39, t135);
			append(p39, code7);
			append(code7, t136);
			append(p39, t137);
			append(p39, code8);
			append(code8, t138);
			append(p39, t139);
			append(section2, t140);
			append(section2, p40);
			append(p40, t141);
			append(section2, t142);
			append(section2, p41);
			append(p41, t143);
			append(p41, code9);
			append(code9, t144);
			append(p41, t145);
			append(section2, t146);
			append(section2, p42);
			append(p42, t147);
			append(p42, code10);
			append(code10, t148);
			append(p42, t149);
			append(section2, t150);
			append(section2, p43);
			append(p43, t151);
			append(p43, code11);
			append(code11, t152);
			append(p43, t153);
			append(p43, code12);
			append(code12, t154);
			append(p43, t155);
			append(section2, t156);
			append(section2, pre9);
			pre9.innerHTML = raw9_value;
			append(section2, t157);
			append(section2, p44);
			append(p44, t158);
			append(section2, t159);
			append(section2, p45);
			append(p45, t160);
			append(p45, code13);
			append(code13, t161);
			append(p45, t162);
			append(section2, t163);
			append(section2, p46);
			append(p46, t164);
			append(p46, code14);
			append(code14, t165);
			append(p46, t166);
			append(p46, code15);
			append(code15, t167);
			append(p46, t168);
			append(section2, t169);
			append(section2, p47);
			append(p47, t170);
			append(p47, code16);
			append(code16, t171);
			append(p47, t172);
			append(p47, code17);
			append(code17, t173);
			append(p47, t174);
			insert(target, t175, anchor);
			insert(target, section3, anchor);
			append(section3, h30);
			append(h30, a21);
			append(a21, t176);
			append(section3, t177);
			append(section3, p48);
			append(p48, t178);
			append(section3, t179);
			append(section3, pre10);
			pre10.innerHTML = raw10_value;
			append(section3, t180);
			append(section3, p49);
			append(p49, t181);
			append(section3, t182);
			append(section3, p50);
			append(p50, t183);
			append(section3, t184);
			append(section3, p51);
			append(p51, t185);
			append(p51, code18);
			append(code18, t186);
			append(p51, t187);
			append(section3, t188);
			append(section3, pre11);
			pre11.innerHTML = raw11_value;
			append(section3, t189);
			append(section3, p52);
			append(p52, t190);
			append(p52, a22);
			append(a22, t191);
			append(p52, t192);
			append(section3, t193);
			append(section3, pre12);
			pre12.innerHTML = raw12_value;
			append(section3, t194);
			append(section3, p53);
			append(p53, t195);
			append(p53, code19);
			append(code19, t196);
			append(p53, t197);
			append(section3, t198);
			append(section3, p54);
			append(p54, t199);
			append(p54, a23);
			append(a23, t200);
			append(p54, t201);
			append(section3, t202);
			append(section3, p55);
			append(p55, img3);
			append(section3, t203);
			append(section3, p56);
			append(p56, t204);
			append(section3, t205);
			append(section3, p57);
			append(p57, t206);
			append(p57, a24);
			append(a24, t207);
			append(p57, t208);
			append(section3, t209);
			append(section3, p58);
			append(p58, t210);
			append(section3, t211);
			append(section3, p59);
			append(p59, img4);
			append(section3, t212);
			append(section3, p60);
			append(p60, t213);
			append(section3, t214);
			append(section3, p61);
			append(p61, t215);
			append(section3, t216);
			append(section3, p62);
			append(p62, t217);
			append(section3, t218);
			append(section3, p63);
			append(p63, t219);
			append(p63, code20);
			append(code20, t220);
			append(p63, t221);
			append(section3, t222);
			append(section3, p64);
			append(p64, img5);
			append(section3, t223);
			append(section3, p65);
			append(p65, t224);
			append(p65, code21);
			append(code21, t225);
			append(p65, t226);
			append(p65, code22);
			append(code22, t227);
			append(p65, t228);
			append(section3, t229);
			append(section3, p66);
			append(p66, img6);
			append(section3, t230);
			append(section3, p67);
			append(p67, t231);
			append(section3, t232);
			append(section3, pre13);
			pre13.innerHTML = raw13_value;
			append(section3, t233);
			append(section3, p68);
			append(p68, t234);
			append(p68, code23);
			append(code23, t235);
			append(p68, t236);
			append(p68, code24);
			append(code24, t237);
			append(p68, t238);
			append(section3, t239);
			append(section3, p69);
			append(p69, t240);
			append(p69, a25);
			append(a25, code25);
			append(code25, t241);
			append(p69, t242);
			append(section3, t243);
			append(section3, p70);
			append(p70, t244);
			append(section3, t245);
			append(section3, p71);
			append(p71, t246);
			append(section3, t247);
			append(section3, pre14);
			pre14.innerHTML = raw14_value;
			append(section3, t248);
			append(section3, p72);
			append(p72, t249);
			append(p72, code26);
			append(code26, t250);
			append(p72, t251);
			append(p72, code27);
			append(code27, t252);
			append(p72, t253);
			append(p72, code28);
			append(code28, t254);
			append(p72, t255);
			append(p72, code29);
			append(code29, t256);
			append(p72, t257);
			append(p72, code30);
			append(code30, t258);
			append(p72, t259);
			append(p72, code31);
			append(code31, t260);
			append(p72, t261);
			append(p72, code32);
			append(code32, t262);
			append(p72, t263);
			append(section3, t264);
			append(section3, p73);
			append(p73, t265);
			append(p73, code33);
			append(code33, t266);
			append(p73, t267);
			append(section3, t268);
			append(section3, p74);
			append(p74, t269);
			append(p74, a26);
			append(a26, t270);
			append(p74, t271);
			append(section3, t272);
			append(section3, p75);
			append(p75, t273);
			append(section3, t274);
			append(section3, blockquote);
			append(blockquote, p76);
			append(p76, t275);
			append(blockquote, t276);
			append(blockquote, p77);
			append(p77, t277);
			append(section3, t278);
			append(section3, p78);
			append(p78, t279);
			insert(target, t280, anchor);
			insert(target, section4, anchor);
			append(section4, h31);
			append(h31, a27);
			append(a27, t281);
			append(section4, t282);
			append(section4, p79);
			append(p79, t283);
			append(section4, t284);
			append(section4, p80);
			append(p80, em0);
			append(em0, t285);
			insert(target, t286, anchor);
			insert(target, section5, anchor);
			append(section5, h32);
			append(h32, a28);
			append(a28, t287);
			append(section5, t288);
			append(section5, p81);
			append(p81, t289);
			append(section5, t290);
			append(section5, p82);
			append(p82, em1);
			append(em1, t291);
			append(p82, t292);
		},
		p: noop,
		d(detaching) {
			if (detaching) detach(section0);
			if (detaching) detach(t5);
			if (detaching) detach(p0);
			if (detaching) detach(t7);
			if (detaching) detach(section1);
			if (detaching) detach(t123);
			if (detaching) detach(section2);
			if (detaching) detach(t175);
			if (detaching) detach(section3);
			if (detaching) detach(t280);
			if (detaching) detach(section4);
			if (detaching) detach(t286);
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
	"title": "Short Stories working on Svelte",
	"occasion": "Shopee React Knowledgeable",
	"occasionLink": "https://github.com/Shopee/shopee-react-knowledgeable/issues/162",
	"venue": "Shopee SG",
	"venueLink": "https://www.google.com/maps/place/Shopee+SG/@1.291278,103.7846628,15z/data=!4m2!3m1!1s0x0:0x7ddf2e854cf6e4e4?ved=2ahUKEwi5jbz6z_vgAhVBP48KHWSEAmMQ_BIwFXoECAEQCA",
	"date": "2019-12-06",
	"description": "Short stories while working on Svelte, and some personal takeaway.",
	"slug": "short-stories-working-on-svelte",
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
