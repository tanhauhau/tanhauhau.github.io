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

var __build_img__4 = "cf3a697a0203e1b2.png";

var __build_img__3 = "05ec205cbdb5f60c.png";

var __build_img__2 = "54250c6650448530.png";

var __build_img__1 = "c8f21ec77863da60.png";

var __build_img__0 = "e3d0c6d0d74d1bb0.png";

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

var baseCss = "http://127.0.0.1:8080/javascript-modules/assets/_blog-299aa480.css";

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
					"@id": "http%3A%2F%2F127.0.0.1%3A8080%2Fjavascript-modules",
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
			attr(meta11, "content", "http%3A%2F%2F127.0.0.1%3A8080%2Fjavascript-modules");
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
							"@id": "http%3A%2F%2F127.0.0.1%3A8080%2Fjavascript-modules",
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

/* content/talk/javascript-modules/@@page-markup.svelte generated by Svelte v3.24.0 */

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
	let li5;
	let a5;
	let t5;
	let li6;
	let a6;
	let t6;
	let t7;
	let section1;
	let h20;
	let a7;
	let t8;
	let t9;
	let p0;
	let t10;
	let a8;
	let t11;
	let t12;
	let t13;
	let p1;
	let t14;
	let t15;
	let blockquote0;
	let p2;
	let strong0;
	let t16;
	let t17;
	let strong1;
	let t18;
	let t19;
	let strong2;
	let t20;
	let t21;
	let t22;
	let p3;
	let t23;
	let t24;
	let section2;
	let h21;
	let a9;
	let t25;
	let t26;
	let p4;
	let t27;
	let t28;
	let p5;
	let t29;
	let code0;
	let t30;
	let t31;
	let code1;
	let t32;
	let t33;
	let code2;
	let t34;
	let t35;
	let t36;
	let pre0;

	let raw0_value = `
<code class="language-html"><span class="token comment">&lt;!-- filename: index.html --></span>
<span class="token tag"><span class="token tag"><span class="token punctuation">&lt;</span>body</span><span class="token punctuation">></span></span>
  // highlight-start
  <span class="token tag"><span class="token tag"><span class="token punctuation">&lt;</span>script</span> <span class="token attr-name">src</span><span class="token attr-value"><span class="token punctuation">=</span><span class="token punctuation">"</span>/app.js<span class="token punctuation">"</span></span><span class="token punctuation">></span></span><span class="token script"></span><span class="token tag"><span class="token tag"><span class="token punctuation">&lt;/</span>script</span><span class="token punctuation">></span></span>
  // highlight-end
<span class="token tag"><span class="token tag"><span class="token punctuation">&lt;/</span>body</span><span class="token punctuation">></span></span></code>` + "";

	let t37;
	let p6;
	let t38;
	let t39;
	let p7;
	let strong3;
	let t40;
	let t41;
	let p8;
	let t42;
	let t43;
	let ul1;
	let li7;
	let t44;
	let a10;
	let t45;
	let t46;
	let li8;
	let t47;
	let t48;
	let li9;
	let t49;
	let t50;
	let li10;
	let t51;
	let code3;
	let t52;
	let t53;
	let t54;
	let p9;
	let img0;
	let img0_src_value;
	let t55;
	let pre1;

	let raw1_value = `
<code class="language-html"><span class="token comment">&lt;!-- filename: index.html --></span>
<span class="token tag"><span class="token tag"><span class="token punctuation">&lt;</span>body</span><span class="token punctuation">></span></span>
  // highlight-start
  <span class="token tag"><span class="token tag"><span class="token punctuation">&lt;</span>script</span> <span class="token attr-name">src</span><span class="token attr-value"><span class="token punctuation">=</span><span class="token punctuation">"</span>/jquery.js<span class="token punctuation">"</span></span><span class="token punctuation">></span></span><span class="token script"></span><span class="token tag"><span class="token tag"><span class="token punctuation">&lt;/</span>script</span><span class="token punctuation">></span></span>
  // highlight-end
  <span class="token tag"><span class="token tag"><span class="token punctuation">&lt;</span>script</span> <span class="token attr-name">src</span><span class="token attr-value"><span class="token punctuation">=</span><span class="token punctuation">"</span>/app.js<span class="token punctuation">"</span></span><span class="token punctuation">></span></span><span class="token script"></span><span class="token tag"><span class="token tag"><span class="token punctuation">&lt;/</span>script</span><span class="token punctuation">></span></span>
<span class="token tag"><span class="token tag"><span class="token punctuation">&lt;/</span>body</span><span class="token punctuation">></span></span></code>` + "";

	let t56;
	let p10;
	let em0;
	let t57;
	let code4;
	let t58;
	let t59;
	let t60;
	let p11;
	let t61;
	let strong4;
	let t62;
	let t63;
	let t64;
	let blockquote1;
	let p12;
	let strong5;
	let t65;
	let t66;
	let t67;
	let p13;
	let t68;
	let code5;
	let t69;
	let t70;
	let t71;
	let pre2;

	let raw2_value = `
<code class="language-html"><span class="token comment">&lt;!-- filename: index.html --></span>
<span class="token tag"><span class="token tag"><span class="token punctuation">&lt;</span>body</span><span class="token punctuation">></span></span>
  <span class="token tag"><span class="token tag"><span class="token punctuation">&lt;</span>script</span> <span class="token attr-name">src</span><span class="token attr-value"><span class="token punctuation">=</span><span class="token punctuation">"</span>/jquery.js<span class="token punctuation">"</span></span><span class="token punctuation">></span></span><span class="token script"></span><span class="token tag"><span class="token tag"><span class="token punctuation">&lt;/</span>script</span><span class="token punctuation">></span></span>
  // highlight-start
  <span class="token tag"><span class="token tag"><span class="token punctuation">&lt;</span>script</span> <span class="token attr-name">src</span><span class="token attr-value"><span class="token punctuation">=</span><span class="token punctuation">"</span>/utils.js<span class="token punctuation">"</span></span><span class="token punctuation">></span></span><span class="token script"></span><span class="token tag"><span class="token tag"><span class="token punctuation">&lt;/</span>script</span><span class="token punctuation">></span></span>
  // highlight-end
  <span class="token tag"><span class="token tag"><span class="token punctuation">&lt;</span>script</span> <span class="token attr-name">src</span><span class="token attr-value"><span class="token punctuation">=</span><span class="token punctuation">"</span>/app.js<span class="token punctuation">"</span></span><span class="token punctuation">></span></span><span class="token script"></span><span class="token tag"><span class="token tag"><span class="token punctuation">&lt;/</span>script</span><span class="token punctuation">></span></span>
<span class="token tag"><span class="token tag"><span class="token punctuation">&lt;/</span>body</span><span class="token punctuation">></span></span></code>` + "";

	let t72;
	let pre3;

	let raw3_value = `
<code class="language-js"><span class="token comment">// filename: utils.js</span>
<span class="token keyword">var</span> pi <span class="token operator">=</span> <span class="token number">3.142</span><span class="token punctuation">;</span>
<span class="token keyword">function</span> <span class="token function">area</span><span class="token punctuation">(</span><span class="token parameter">radius</span><span class="token punctuation">)</span> <span class="token punctuation">&#123;</span>
  <span class="token keyword">return</span> pi <span class="token operator">*</span> radius <span class="token operator">*</span> radius<span class="token punctuation">;</span>
<span class="token punctuation">&#125;</span></code>` + "";

	let t73;
	let p14;
	let t74;
	let code6;
	let t75;
	let t76;
	let code7;
	let t77;
	let t78;
	let code8;
	let t79;
	let t80;
	let code9;
	let t81;
	let t82;
	let code10;
	let t83;
	let t84;
	let t85;
	let pre4;

	let raw4_value = `
<code class="language-js"><span class="token comment">// filename: app.js</span>
<span class="token console class-name">console</span><span class="token punctuation">.</span><span class="token method function property-access">log</span><span class="token punctuation">(</span><span class="token function">area</span><span class="token punctuation">(</span><span class="token number">5</span><span class="token punctuation">)</span><span class="token punctuation">)</span><span class="token punctuation">;</span> <span class="token comment">// 78.55</span>

<span class="token comment">// pi is available too!</span>
<span class="token console class-name">console</span><span class="token punctuation">.</span><span class="token method function property-access">log</span><span class="token punctuation">(</span>pi<span class="token punctuation">)</span><span class="token punctuation">;</span> <span class="token comment">// 3.142</span></code>` + "";

	let t86;
	let p15;
	let t87;
	let strong6;
	let t88;
	let t89;
	let t90;
	let p16;
	let t91;
	let t92;
	let pre5;

	let raw5_value = `
<code class="language-js"><span class="token comment">// filename: utils.js</span>
<span class="token keyword">var</span> utils <span class="token operator">=</span> <span class="token punctuation">(</span><span class="token keyword">function</span><span class="token punctuation">(</span><span class="token punctuation">)</span> <span class="token punctuation">&#123;</span>
  <span class="token comment">// you hide &#96;pi&#96; within the function scope</span>
  <span class="token keyword">var</span> pi <span class="token operator">=</span> <span class="token number">3.142</span><span class="token punctuation">;</span>
  <span class="token keyword">function</span> <span class="token function">area</span><span class="token punctuation">(</span><span class="token parameter">radius</span><span class="token punctuation">)</span> <span class="token punctuation">&#123;</span>
    <span class="token keyword">return</span> pi <span class="token operator">*</span> radius <span class="token operator">*</span> radius<span class="token punctuation">;</span>
  <span class="token punctuation">&#125;</span>
  <span class="token keyword">return</span> <span class="token punctuation">&#123;</span> area <span class="token punctuation">&#125;</span><span class="token punctuation">;</span>
<span class="token punctuation">&#125;</span><span class="token punctuation">)</span><span class="token punctuation">(</span><span class="token punctuation">)</span><span class="token punctuation">;</span></code>` + "";

	let t93;
	let pre6;

	let raw6_value = `
<code class="language-js"><span class="token comment">// filename: app.js</span>
<span class="token console class-name">console</span><span class="token punctuation">.</span><span class="token method function property-access">log</span><span class="token punctuation">(</span>utils<span class="token punctuation">.</span><span class="token method function property-access">area</span><span class="token punctuation">(</span><span class="token number">5</span><span class="token punctuation">)</span><span class="token punctuation">)</span><span class="token punctuation">;</span> <span class="token comment">// 78.55</span>

<span class="token console class-name">console</span><span class="token punctuation">.</span><span class="token method function property-access">log</span><span class="token punctuation">(</span>pi<span class="token punctuation">)</span><span class="token punctuation">;</span> <span class="token comment">// Reference error, &#96;pi&#96; is not defined</span></code>` + "";

	let t94;
	let p17;
	let t95;
	let strong7;
	let t96;
	let t97;
	let t98;
	let blockquote2;
	let p18;
	let strong8;
	let t99;
	let t100;
	let strong9;
	let t101;
	let t102;
	let t103;
	let p19;
	let t104;
	let code11;
	let t105;
	let t106;
	let code12;
	let t107;
	let t108;
	let t109;
	let p20;
	let t110;
	let em1;
	let t111;
	let t112;
	let t113;
	let blockquote3;
	let p21;
	let strong10;
	let t114;
	let t115;
	let t116;
	let p22;
	let t117;
	let t118;
	let ul2;
	let li11;
	let strong11;
	let t119;
	let t120;
	let t121;
	let li12;
	let strong12;
	let t122;
	let t123;
	let t124;
	let li13;
	let strong13;
	let t125;
	let t126;
	let t127;
	let p23;
	let t128;
	let t129;
	let p24;
	let t130;
	let t131;
	let section3;
	let h22;
	let a11;
	let t132;
	let t133;
	let blockquote4;
	let p25;
	let t134;
	let t135;
	let p26;
	let t136;
	let t137;
	let p27;
	let img1;
	let img1_src_value;
	let t138;
	let p28;
	let t139;
	let a12;
	let t140;
	let t141;
	let a13;
	let t142;
	let t143;
	let code13;
	let t144;
	let t145;
	let t146;
	let p29;
	let img2;
	let img2_src_value;
	let t147;
	let p30;
	let t148;
	let a14;
	let t149;
	let t150;
	let a15;
	let t151;
	let t152;
	let em2;
	let t153;
	let t154;
	let code14;
	let t155;
	let t156;
	let code15;
	let t157;
	let t158;
	let t159;
	let p31;
	let t160;
	let em3;
	let t161;
	let t162;
	let code16;
	let t163;
	let t164;
	let code17;
	let t165;
	let t166;
	let em4;
	let t167;
	let code18;
	let t168;
	let t169;
	let code19;
	let t170;
	let t171;
	let t172;
	let pre7;

	let raw7_value = `
<code class="language-html"><span class="token tag"><span class="token tag"><span class="token punctuation">&lt;</span>body</span><span class="token punctuation">></span></span>
  <span class="token comment">&lt;!-- This will not work out of the box! --></span>
  // highlight-start
  <span class="token tag"><span class="token tag"><span class="token punctuation">&lt;</span>script</span> <span class="token attr-name">src</span><span class="token attr-value"><span class="token punctuation">=</span><span class="token punctuation">"</span>/node_modules/foo/bar.js<span class="token punctuation">"</span></span><span class="token punctuation">></span></span><span class="token script"></span><span class="token tag"><span class="token tag"><span class="token punctuation">&lt;/</span>script</span><span class="token punctuation">></span></span>
  // highlight-end
<span class="token tag"><span class="token tag"><span class="token punctuation">&lt;/</span>body</span><span class="token punctuation">></span></span></code>` + "";

	let t173;
	let p32;
	let t174;
	let a16;
	let t175;
	let t176;
	let code20;
	let t177;
	let t178;
	let t179;
	let p33;
	let img3;
	let img3_src_value;
	let t180;
	let pre8;

	let raw8_value = `
<code class="language-html{2-3}">/project
  /bower_components
  /node_modules
  /app
  /bower.json
  /package.json</code>` + "";

	let pre8_class_value;
	let t181;
	let p34;
	let em5;
	let t182;
	let t183;
	let pre9;

	let raw9_value = `
<code class="language-html"><span class="token comment">&lt;!-- filename: index.html --></span>
<span class="token tag"><span class="token tag"><span class="token punctuation">&lt;</span>script</span> <span class="token attr-name">src</span><span class="token attr-value"><span class="token punctuation">=</span><span class="token punctuation">"</span>bower_components/jquery/dist/jquery.min.js<span class="token punctuation">"</span></span><span class="token punctuation">></span></span><span class="token script"></span><span class="token tag"><span class="token tag"><span class="token punctuation">&lt;/</span>script</span><span class="token punctuation">></span></span></code>` + "";

	let t184;
	let p35;
	let em6;
	let t185;
	let t186;
	let p36;
	let t187;
	let t188;
	let p37;
	let a17;
	let t189;
	let t190;
	let code21;
	let t191;
	let t192;
	let code22;
	let t193;
	let t194;
	let t195;
	let p38;
	let img4;
	let img4_src_value;
	let t196;
	let p39;
	let t197;
	let a18;
	let t198;
	let t199;
	let a19;
	let t200;
	let t201;
	let a20;
	let t202;
	let t203;
	let code23;
	let t204;
	let t205;
	let t206;
	let section4;
	let h23;
	let a21;
	let t207;
	let t208;
	let blockquote5;
	let p40;
	let t209;
	let t210;
	let p41;
	let t211;
	let em7;
	let t212;
	let t213;
	let t214;
	let p42;
	let t215;
	let em8;
	let t216;
	let t217;
	let code24;
	let t218;
	let t219;
	let em9;
	let t220;
	let t221;
	let em10;
	let t222;
	let t223;
	let t224;
	let p43;
	let t225;
	let a22;
	let t226;
	let t227;
	let code25;
	let t228;
	let t229;
	let code26;
	let t230;
	let t231;
	let t232;
	let pre10;

	let raw10_value = `
<code class="language-js"><span class="token function">require</span><span class="token punctuation">(</span><span class="token string">'./circle'</span><span class="token punctuation">)</span><span class="token punctuation">;</span>

exports<span class="token punctuation">.</span><span class="token property-access">pi</span> <span class="token operator">=</span> <span class="token number">3.142</span><span class="token punctuation">;</span></code>` + "";

	let t233;
	let p44;
	let em11;
	let t234;
	let t235;
	let p45;
	let t236;
	let code27;
	let t237;
	let t238;
	let strong14;
	let t239;
	let t240;
	let t241;
	let p46;
	let t242;
	let code28;
	let t243;
	let t244;
	let t245;
	let ul3;
	let li14;
	let t246;
	let code29;
	let t247;
	let t248;
	let t249;
	let li15;
	let t250;
	let t251;
	let li16;
	let t252;
	let code30;
	let t253;
	let t254;
	let t255;
	let p47;
	let t256;
	let code31;
	let t257;
	let t258;
	let code32;
	let t259;
	let t260;
	let t261;
	let pre11;

	let raw11_value = `
<code class="language-js"><span class="token function">require</span><span class="token punctuation">(</span><span class="token string">'./circle.js'</span><span class="token punctuation">,</span> <span class="token keyword">function</span><span class="token punctuation">(</span><span class="token parameter">circle</span><span class="token punctuation">)</span> <span class="token punctuation">&#123;</span>
  <span class="token comment">// callback when circle is ready</span>
<span class="token punctuation">&#125;</span><span class="token punctuation">)</span><span class="token punctuation">;</span></code>` + "";

	let t262;
	let p48;
	let t263;
	let a23;
	let strong15;
	let t264;
	let t265;
	let t266;
	let p49;
	let t267;
	let t268;
	let pre12;

	let raw12_value = `
<code class="language-js"><span class="token comment">// script loading</span>
<span class="token function">load</span><span class="token punctuation">(</span><span class="token string">'lib/jquery.min.js'</span><span class="token punctuation">,</span> callback<span class="token punctuation">)</span><span class="token punctuation">;</span>
<span class="token comment">// dynamic import</span>
<span class="token keyword module">import</span><span class="token punctuation">(</span><span class="token string">'lib/jquery.min.js'</span><span class="token punctuation">)</span><span class="token punctuation">.</span><span class="token method function property-access">then</span><span class="token punctuation">(</span>callback<span class="token punctuation">)</span><span class="token punctuation">;</span></code>` + "";

	let t269;
	let p50;
	let t270;
	let code33;
	let t271;
	let t272;
	let a24;
	let t273;
	let t274;
	let t275;
	let p51;
	let t276;
	let code34;
	let t277;
	let t278;
	let t279;
	let pre13;

	let raw13_value = `
<code class="language-js"><span class="token comment">// filename: main.js</span>
<span class="token function">require</span><span class="token punctuation">(</span><span class="token punctuation">[</span><span class="token string">'jquery'</span><span class="token punctuation">,</span> <span class="token string">'circle'</span><span class="token punctuation">]</span><span class="token punctuation">,</span> <span class="token keyword">function</span><span class="token punctuation">(</span><span class="token parameter">$<span class="token punctuation">,</span> circle</span><span class="token punctuation">)</span> <span class="token punctuation">&#123;</span>
  <span class="token comment">// we can use &#96;$&#96; and &#96;circle&#96; now!</span>
<span class="token punctuation">&#125;</span><span class="token punctuation">)</span><span class="token punctuation">;</span></code>` + "";

	let t280;
	let p52;
	let t281;
	let a25;
	let t282;
	let t283;
	let t284;
	let p53;
	let t285;
	let a26;
	let t286;
	let t287;
	let a27;
	let t288;
	let t289;
	let t290;
	let p54;
	let t291;
	let code35;
	let t292;
	let t293;
	let code36;
	let t294;
	let t295;
	let t296;
	let pre14;

	let raw14_value = `
<code class="language-js"><span class="token comment">// importing &#96;circle&#96; from './circle'</span>
<span class="token keyword module">import</span> circle <span class="token keyword module">from</span> <span class="token string">'./circle'</span><span class="token punctuation">;</span>

<span class="token comment">// export the constant &#96;PI&#96;</span>
<span class="token keyword module">export</span> <span class="token keyword">const</span> pi <span class="token operator">=</span> <span class="token number">3.142</span><span class="token punctuation">;</span></code>` + "";

	let t297;
	let p55;
	let t298;
	let a28;
	let t299;
	let t300;
	let a29;
	let t301;
	let t302;
	let code37;
	let t303;
	let t304;
	let code38;
	let t305;
	let t306;
	let t307;
	let p56;
	let t308;
	let a30;
	let t309;
	let code39;
	let t310;
	let t311;
	let code40;
	let t312;
	let t313;
	let code41;
	let t314;
	let t315;
	let t316;
	let p57;
	let t317;
	let a31;
	let t318;
	let t319;
	let a32;
	let t320;
	let t321;
	let a33;
	let t322;
	let t323;
	let code42;
	let t324;
	let t325;
	let code43;
	let t326;
	let t327;
	let code44;
	let t328;
	let t329;
	let t330;
	let section5;
	let h24;
	let a34;
	let t331;
	let t332;
	let blockquote6;
	let p58;
	let t333;
	let t334;
	let p59;
	let t335;
	let t336;
	let ul4;
	let li17;
	let t337;
	let t338;
	let li18;
	let t339;
	let t340;
	let p60;
	let t341;
	let t342;
	let p61;
	let t343;
	let a35;
	let t344;
	let t345;
	let a36;
	let t346;
	let t347;
	let t348;
	let pre15;

	let raw15_value = `
<code class="language-js">goog<span class="token punctuation">.</span><span class="token method function property-access">provide</span><span class="token punctuation">(</span><span class="token string">'tutorial.notepad'</span><span class="token punctuation">)</span><span class="token punctuation">;</span>
goog<span class="token punctuation">.</span><span class="token method function property-access">require</span><span class="token punctuation">(</span><span class="token string">'goog.dom'</span><span class="token punctuation">)</span><span class="token punctuation">;</span>

tutorial<span class="token punctuation">.</span><span class="token property-access">notepad</span><span class="token punctuation">.</span><span class="token method-variable function-variable method function property-access">makeNotes</span> <span class="token operator">=</span> <span class="token keyword">function</span><span class="token punctuation">(</span><span class="token parameter">data</span><span class="token punctuation">)</span> <span class="token punctuation">&#123;</span>
  <span class="token comment">//...</span>
  goog<span class="token punctuation">.</span><span class="token property-access">dom</span><span class="token punctuation">.</span><span class="token method function property-access">appendChild</span><span class="token punctuation">(</span><span class="token keyword">this</span><span class="token punctuation">.</span><span class="token property-access">parent</span><span class="token punctuation">,</span> data<span class="token punctuation">)</span><span class="token punctuation">;</span>
<span class="token punctuation">&#125;</span><span class="token punctuation">;</span></code>` + "";

	let t349;
	let p62;
	let em12;
	let t350;
	let t351;
	let p63;
	let t352;
	let t353;
	let pre16;

	let raw16_value = `
<code class="language-js"><span class="token comment">// goog.provide('tutorial.notepad');</span>
tutorial <span class="token operator">=</span> tutorial <span class="token operator">||</span> <span class="token punctuation">&#123;</span><span class="token punctuation">&#125;</span><span class="token punctuation">;</span>
tutorial<span class="token punctuation">.</span><span class="token property-access">notepad</span> <span class="token operator">=</span> tutorial<span class="token punctuation">.</span><span class="token property-access">notepad</span> <span class="token operator">||</span> <span class="token punctuation">&#123;</span><span class="token punctuation">&#125;</span><span class="token punctuation">;</span>
<span class="token comment">// goog.require('goog.dom');</span>
goog <span class="token operator">=</span> goog <span class="token operator">||</span> <span class="token punctuation">&#123;</span><span class="token punctuation">&#125;</span><span class="token punctuation">;</span>
goog<span class="token punctuation">.</span><span class="token property-access">dom</span> <span class="token operator">=</span> goog<span class="token punctuation">.</span><span class="token property-access">dom</span> <span class="token operator">||</span> <span class="token keyword">function</span><span class="token punctuation">(</span><span class="token punctuation">)</span> <span class="token punctuation">&#123;</span> <span class="token spread operator">...</span> <span class="token punctuation">&#125;</span><span class="token punctuation">;</span>

tutorial<span class="token punctuation">.</span><span class="token property-access">notepad</span><span class="token punctuation">.</span><span class="token method-variable function-variable method function property-access">makeNotes</span> <span class="token operator">=</span> <span class="token keyword">function</span><span class="token punctuation">(</span><span class="token parameter">data</span><span class="token punctuation">)</span> <span class="token punctuation">&#123;</span>
  <span class="token comment">//...</span>
  goog<span class="token punctuation">.</span><span class="token property-access">dom</span><span class="token punctuation">.</span><span class="token method function property-access">appendChild</span><span class="token punctuation">(</span><span class="token keyword">this</span><span class="token punctuation">.</span><span class="token property-access">parent</span><span class="token punctuation">,</span> data<span class="token punctuation">)</span><span class="token punctuation">;</span>
<span class="token punctuation">&#125;</span><span class="token punctuation">;</span></code>` + "";

	let t354;
	let p64;
	let t355;
	let t356;
	let p65;
	let t357;
	let t358;
	let pre17;

	let raw17_value = `
<code class="language-js"><span class="token function">define</span><span class="token punctuation">(</span><span class="token string">'goog/dom'</span><span class="token punctuation">,</span> <span class="token keyword">function</span><span class="token punctuation">(</span><span class="token punctuation">)</span> <span class="token punctuation">&#123;</span> <span class="token spread operator">...</span> <span class="token punctuation">&#125;</span><span class="token punctuation">)</span><span class="token punctuation">;</span>

<span class="token function">define</span><span class="token punctuation">(</span><span class="token string">'tutorial/notepad'</span><span class="token punctuation">,</span> <span class="token punctuation">[</span><span class="token string">'goog/dom'</span><span class="token punctuation">]</span><span class="token punctuation">,</span> <span class="token keyword">function</span> <span class="token punctuation">(</span><span class="token parameter">googDom</span><span class="token punctuation">)</span> <span class="token punctuation">&#123;</span>
  <span class="token keyword">return</span> <span class="token punctuation">&#123;</span>
    <span class="token function-variable function">makeNotes</span><span class="token punctuation">:</span> <span class="token keyword">function</span><span class="token punctuation">(</span><span class="token parameter">data</span><span class="token punctuation">)</span> <span class="token punctuation">&#123;</span>
      <span class="token comment">//...</span>
      goog<span class="token punctuation">.</span><span class="token property-access">dom</span><span class="token punctuation">.</span><span class="token method function property-access">appendChild</span><span class="token punctuation">(</span><span class="token keyword">this</span><span class="token punctuation">.</span><span class="token property-access">parent</span><span class="token punctuation">,</span> data<span class="token punctuation">)</span><span class="token punctuation">;</span>
    <span class="token punctuation">&#125;</span><span class="token punctuation">,</span>
  <span class="token punctuation">&#125;</span><span class="token punctuation">,</span>
<span class="token punctuation">&#125;</span><span class="token punctuation">)</span><span class="token punctuation">;</span></code>` + "";

	let t359;
	let p66;
	let t360;
	let code45;
	let t361;
	let t362;
	let code46;
	let t363;
	let t364;
	let t365;
	let p67;
	let t366;
	let t367;
	let p68;
	let t368;
	let t369;
	let section6;
	let h25;
	let a37;
	let t370;
	let t371;
	let p69;
	let t372;
	let strong16;
	let t373;
	let t374;
	let strong17;
	let t375;
	let t376;
	let strong18;
	let t377;
	let t378;
	let t379;
	let section7;
	let h26;
	let a38;
	let t380;
	let t381;
	let ul5;
	let li19;
	let a39;
	let t382;
	let t383;
	let li20;
	let a40;
	let t384;
	let t385;
	let li21;
	let a41;
	let t386;
	let t387;
	let li22;
	let a42;
	let t388;

	return {
		c() {
			section0 = element("section");
			ul0 = element("ul");
			li0 = element("li");
			a0 = element("a");
			t0 = text("Motivation");
			li1 = element("li");
			a1 = element("a");
			t1 = text("The Vanilla way");
			li2 = element("li");
			a2 = element("a");
			t2 = text("Installability");
			li3 = element("li");
			a3 = element("a");
			t3 = text("Importability");
			li4 = element("li");
			a4 = element("a");
			t4 = text("Scopability");
			li5 = element("li");
			a5 = element("a");
			t5 = text("Summary");
			li6 = element("li");
			a6 = element("a");
			t6 = text("Further Readings");
			t7 = space();
			section1 = element("section");
			h20 = element("h2");
			a7 = element("a");
			t8 = text("Motivation");
			t9 = space();
			p0 = element("p");
			t10 = text("A while ago, I posted an article about ");
			a8 = element("a");
			t11 = text("understanding frontend tools");
			t12 = text(". I mentioned that the way I make sense of all the tools and frameworks out there in the JavaScript world, is to try writing a web application with plain JavaScript, and start asking questions.");
			t13 = space();
			p1 = element("p");
			t14 = text("One of the question is:");
			t15 = space();
			blockquote0 = element("blockquote");
			p2 = element("p");
			strong0 = element("strong");
			t16 = text("How do we make our JavaScript code modular");
			t17 = text(", having each piece of code ");
			strong1 = element("strong");
			t18 = text("independent");
			t19 = text(" of each other, without having to worry other parts of code affecting it, yet able to ");
			strong2 = element("strong");
			t20 = text("share functionality");
			t21 = text(" among different modules.");
			t22 = space();
			p3 = element("p");
			t23 = text("So I will attempt to answer the question by first exploring how things are done in a \"Vanilla\" way, and my two cents about the inherent problem with it and how each tooling come about solving those problems.");
			t24 = space();
			section2 = element("section");
			h21 = element("h2");
			a9 = element("a");
			t25 = text("The Vanilla way");
			t26 = space();
			p4 = element("p");
			t27 = text("Imagine the following scenario:");
			t28 = space();
			p5 = element("p");
			t29 = text("You are writing a web application. You created a script, ");
			code0 = element("code");
			t30 = text("app.js");
			t31 = text(", and you added a ");
			code1 = element("code");
			t32 = text("<script>");
			t33 = text(" tag into your ");
			code2 = element("code");
			t34 = text("index.html");
			t35 = text(".");
			t36 = space();
			pre0 = element("pre");
			t37 = space();
			p6 = element("p");
			t38 = text("Then you decided to add jQuery, because you heard that jQuery is amazing.");
			t39 = space();
			p7 = element("p");
			strong3 = element("strong");
			t40 = text("So how would you add jQuery into your application?");
			t41 = space();
			p8 = element("p");
			t42 = text("There's a few ways to go about, but the easiest would be:");
			t43 = space();
			ul1 = element("ul");
			li7 = element("li");
			t44 = text("heading to ");
			a10 = element("a");
			t45 = text("jQuery's website");
			t46 = space();
			li8 = element("li");
			t47 = text("click download");
			t48 = space();
			li9 = element("li");
			t49 = text("dragged the downloaded file to your project folder");
			t50 = space();
			li10 = element("li");
			t51 = text("and add another script tag before your ");
			code3 = element("code");
			t52 = text("app.js");
			t53 = text(".");
			t54 = space();
			p9 = element("p");
			img0 = element("img");
			t55 = space();
			pre1 = element("pre");
			t56 = space();
			p10 = element("p");
			em0 = element("em");
			t57 = text("Adding ");
			code4 = element("code");
			t58 = text("jquery");
			t59 = text(" into html");
			t60 = space();
			p11 = element("p");
			t61 = text("Although jQuery is awesome, but adding it takes ");
			strong4 = element("strong");
			t62 = text("a lot of steps and effort");
			t63 = text(". And to upgrade jQuery, you would have to redo all the step.");
			t64 = space();
			blockquote1 = element("blockquote");
			p12 = element("p");
			strong5 = element("strong");
			t65 = text("Installing a library");
			t66 = text(" is a hassle back then.");
			t67 = space();
			p13 = element("p");
			t68 = text("Let's say we add another file, ");
			code5 = element("code");
			t69 = text("utils.js");
			t70 = text(" for all our utility functions.");
			t71 = space();
			pre2 = element("pre");
			t72 = space();
			pre3 = element("pre");
			t73 = space();
			p14 = element("p");
			t74 = text("Although you meant to just share the function ");
			code6 = element("code");
			t75 = text("area");
			t76 = text(" from ");
			code7 = element("code");
			t77 = text("utils.js");
			t78 = text(", in ");
			code8 = element("code");
			t79 = text("app.js");
			t80 = text(", you would notice that both ");
			code9 = element("code");
			t81 = text("pi");
			t82 = text(" and ");
			code10 = element("code");
			t83 = text("area");
			t84 = text(" are available.");
			t85 = space();
			pre4 = element("pre");
			t86 = space();
			p15 = element("p");
			t87 = text("That is because when you declare a variable or a function within a script, it will be available to the ");
			strong6 = element("strong");
			t88 = text("global scope");
			t89 = text(".");
			t90 = space();
			p16 = element("p");
			t91 = text("The only way to hide it, is to use Immediately Invoked Function Expression (IIFE).");
			t92 = space();
			pre5 = element("pre");
			t93 = space();
			pre6 = element("pre");
			t94 = space();
			p17 = element("p");
			t95 = text("This is called the ");
			strong7 = element("strong");
			t96 = text("module pattern");
			t97 = text(". The only way to control what to exposed to the global scope.");
			t98 = space();
			blockquote2 = element("blockquote");
			p18 = element("p");
			strong8 = element("strong");
			t99 = text("Scoping the variables");
			t100 = text(" within the module is hard, and you can only do it via the ");
			strong9 = element("strong");
			t101 = text("module pattern");
			t102 = text(".");
			t103 = space();
			p19 = element("p");
			t104 = text("If you have noticed, we access ");
			code11 = element("code");
			t105 = text("utils");
			t106 = text(" freely, because it is defined in the global scope. If you have another module / library that named ");
			code12 = element("code");
			t107 = text("utils");
			t108 = text(", they would have conflicted against each other.");
			t109 = space();
			p20 = element("p");
			t110 = text("We want to ");
			em1 = element("em");
			t111 = text("\"import\"");
			t112 = text(" the modules freely, and renamed it anyway we want, without worrying naming conflicts amongst modules / libraries.");
			t113 = space();
			blockquote3 = element("blockquote");
			p21 = element("p");
			strong10 = element("strong");
			t114 = text("Importing");
			t115 = text(" without naming conflicts is what we want.");
			t116 = space();
			p22 = element("p");
			t117 = text("So I hereby summarize, the \"module\" problem in JavaScript,");
			t118 = space();
			ul2 = element("ul");
			li11 = element("li");
			strong11 = element("strong");
			t119 = text("Installability");
			t120 = text(" - the ability to install easily");
			t121 = space();
			li12 = element("li");
			strong12 = element("strong");
			t122 = text("Scopability");
			t123 = text(" - the ability of having clearly defined scoped within modules");
			t124 = space();
			li13 = element("li");
			strong13 = element("strong");
			t125 = text("Importability");
			t126 = text(" - the ability to import modules freely without worry");
			t127 = space();
			p23 = element("p");
			t128 = text("Well, I am not sure some of these word existed, I think I might have made up some of them to make it rhyme.");
			t129 = space();
			p24 = element("p");
			t130 = text("The problems above are no longer a concern any more in the 2019 world, yet it is still interesting to see what the JavaScript community has created to solve these problems.");
			t131 = space();
			section3 = element("section");
			h22 = element("h2");
			a11 = element("a");
			t132 = text("Installability");
			t133 = space();
			blockquote4 = element("blockquote");
			p25 = element("p");
			t134 = text("The \"how easy is it to install\" problem.");
			t135 = space();
			p26 = element("p");
			t136 = text("As mentioned in the earlier example, to \"install\" jQuery into your web app is to download jQuery from their main website. To \"install\" a different version would mean to visit their \"Past Releases\" Page to download the specific version you want.");
			t137 = space();
			p27 = element("p");
			img1 = element("img");
			t138 = space();
			p28 = element("p");
			t139 = text("A \"faster\" alternative to this, is to get jQuery served from a CDN provider. ");
			a12 = element("a");
			t140 = text("cdnjs.com");
			t141 = text(" is a site that catalogues the CDN url for different libraries. The CDN will serve the script faster to the user, because of their delivery network, as well as if multiple sites are using the same CDN url, the file will be cached by browser. And it is faster to \"install\", as ");
			a13 = element("a");
			t142 = text("cdnjs.com");
			t143 = text(" provides a one-click to \"Copy as script tag\", all you only need to do is to paste it in to your ");
			code13 = element("code");
			t144 = text("html");
			t145 = text(" file.");
			t146 = space();
			p29 = element("p");
			img2 = element("img");
			t147 = space();
			p30 = element("p");
			t148 = text("Parallelly in the ");
			a14 = element("a");
			t149 = text("Node.js");
			t150 = text(" world, ");
			a15 = element("a");
			t151 = text("npm");
			t152 = text(", the Node.js Package Manager was created. With npm, it is much easier to install and maintain packages and their version, ");
			em2 = element("em");
			t153 = text("(a \"package\" can be seen as a group of JavaScript modules and their description file)");
			t154 = text(", for a Node.js project. All a developer need to do list out the dependencies and their version in ");
			code14 = element("code");
			t155 = text("package.json");
			t156 = text(" and run ");
			code15 = element("code");
			t157 = text("npm install");
			t158 = text(".");
			t159 = space();
			p31 = element("p");
			t160 = text("If you think the ");
			em3 = element("em");
			t161 = text("problem of installability");
			t162 = text(" stops here, well, not quite. See, npm was created for Node.js application, packages that are published to the npm registry was not meant for browser use. The JavaScript \"modules\" uses \"syntax\" like the ");
			code16 = element("code");
			t163 = text("module.exports");
			t164 = text(" and ");
			code17 = element("code");
			t165 = text("require");
			t166 = text(" which are not readily understandable by the browser. Therefore you can't add a script tag to include files you just installed from npm. ");
			em4 = element("em");
			t167 = text("(I will explain what ");
			code18 = element("code");
			t168 = text("module.exports");
			t169 = text(" and ");
			code19 = element("code");
			t170 = text("require");
			t171 = text(" syntax are in the later part of this article)");
			t172 = space();
			pre7 = element("pre");
			t173 = space();
			p32 = element("p");
			t174 = text("That's why ");
			a16 = element("a");
			t175 = text("bower");
			t176 = text(" was created. It is called the package manager for the web, because the \"package\" you installed from bower are readily to be used in the ");
			code20 = element("code");
			t177 = text("html");
			t178 = text(".");
			t179 = space();
			p33 = element("p");
			img3 = element("img");
			t180 = space();
			pre8 = element("pre");
			t181 = space();
			p34 = element("p");
			em5 = element("em");
			t182 = text("A typical web application project setup with both bower and npm");
			t183 = space();
			pre9 = element("pre");
			t184 = space();
			p35 = element("p");
			em6 = element("em");
			t185 = text("Adding bower packages into index.html");
			t186 = space();
			p36 = element("p");
			t187 = text("Bower components for browser libraries and npm packages for build tools, had been a common web app projects setup until the next tool comes up to change it.");
			t188 = space();
			p37 = element("p");
			a17 = element("a");
			t189 = text("Browserify");
			t190 = text(" tries to bring the vast registry of packages from ");
			code21 = element("code");
			t191 = text("npm");
			t192 = text(" to the web. Browserify is a module bundler, it reads and understands the ");
			code22 = element("code");
			t193 = text("require");
			t194 = text(" syntax, and tries to bundle all the modules into one file.");
			t195 = space();
			p38 = element("p");
			img4 = element("img");
			t196 = space();
			p39 = element("p");
			t197 = text("With ");
			a18 = element("a");
			t198 = text("Browserify");
			t199 = text(", and other module bundler, eg ");
			a19 = element("a");
			t200 = text("webpack");
			t201 = text(", ");
			a20 = element("a");
			t202 = text("rollup");
			t203 = text(" etc, we are now able to freely share code among Node.js and browser application, and use ");
			code23 = element("code");
			t204 = text("npm");
			t205 = text(" as a package manager for installing and upgrading packages.");
			t206 = space();
			section4 = element("section");
			h23 = element("h2");
			a21 = element("a");
			t207 = text("Importability");
			t208 = space();
			blockquote5 = element("blockquote");
			p40 = element("p");
			t209 = text("The \"how easy is it to import\" problem.");
			t210 = space();
			p41 = element("p");
			t211 = text("Let's recap the problem of ");
			em7 = element("em");
			t212 = text("\"importability\"");
			t213 = text(" with the example earlier. We mentioned that everything we declare within each file, are available to other files via the global scope. There is no control of what you are importing, the sequence of the importing. At this point of time, each JavaScript files is just a script, until module systems were introduced.");
			t214 = space();
			p42 = element("p");
			t215 = text("With the advent of Node.js, there's a need to ");
			em8 = element("em");
			t216 = text("require");
			t217 = text(" common modules into your JavaScript code. Because in Node.js context, there's no ");
			code24 = element("code");
			t218 = text("index.html");
			t219 = text(" where you can ");
			em9 = element("em");
			t220 = text("\"insert script tags\"");
			t221 = text(". At some point you need to ");
			em10 = element("em");
			t222 = text("require");
			t223 = text(" some external modules, or else you will end up writing a very long JavaScript file.");
			t224 = space();
			p43 = element("p");
			t225 = text("So ");
			a22 = element("a");
			t226 = text("CommonJS");
			t227 = text(" were introduced into Node.js. It allows your JavaScript code to ");
			code25 = element("code");
			t228 = text("require");
			t229 = text(" and ");
			code26 = element("code");
			t230 = text("export");
			t231 = text(" other JavaScript modules.");
			t232 = space();
			pre10 = element("pre");
			t233 = space();
			p44 = element("p");
			em11 = element("em");
			t234 = text("the commonjs \"require\" and \"export\" syntax");
			t235 = space();
			p45 = element("p");
			t236 = text("Note that ");
			code27 = element("code");
			t237 = text("require()");
			t238 = text(" is ");
			strong14 = element("strong");
			t239 = text("synchronous");
			t240 = text(".");
			t241 = space();
			p46 = element("p");
			t242 = text("When you call ");
			code28 = element("code");
			t243 = text("require('./circle.js')");
			t244 = text(", Node runtime will:");
			t245 = space();
			ul3 = element("ul");
			li14 = element("li");
			t246 = text("find the file you are ");
			code29 = element("code");
			t247 = text("require");
			t248 = text("ing");
			t249 = space();
			li15 = element("li");
			t250 = text("parse and eval the content");
			t251 = space();
			li16 = element("li");
			t252 = text("return what is assigned to ");
			code30 = element("code");
			t253 = text("exports");
			t254 = text(".");
			t255 = space();
			p47 = element("p");
			t256 = text("But, if we are going to port the ");
			code31 = element("code");
			t257 = text("require");
			t258 = text(" syntax into the browser, it will not be able to be synchronous. Because, fetching content involves network call, and it will have to be asynchronous. So, it only make sense to have a asynchronous ");
			code32 = element("code");
			t259 = text("require");
			t260 = text(":");
			t261 = space();
			pre11 = element("pre");
			t262 = space();
			p48 = element("p");
			t263 = text("And this is exactly how ");
			a23 = element("a");
			strong15 = element("strong");
			t264 = text("script loaders");
			t265 = text(" work!");
			t266 = space();
			p49 = element("p");
			t267 = text("If you find the concept of script loading similar, that's because it is the exact same concept of dynamic import we have today. In fact, if you look at the code, they have the same mechanics of loading the script asynchronously!");
			t268 = space();
			pre12 = element("pre");
			t269 = space();
			p50 = element("p");
			t270 = text("CommonJS's ");
			code33 = element("code");
			t271 = text("require");
			t272 = text(" statement did not take into consideration of the asynchronicity of the browser land, therefore the JavaScript community came up with another module system, ");
			a24 = element("a");
			t273 = text("AMD (Asynchronous Module Definition)");
			t274 = text(".");
			t275 = space();
			p51 = element("p");
			t276 = text("AMD uses an asynchronous ");
			code34 = element("code");
			t277 = text("require");
			t278 = text(" syntax, that takes a callback that would be called only after the dependency is available.");
			t279 = space();
			pre13 = element("pre");
			t280 = space();
			p52 = element("p");
			t281 = text("We have both module system in JavaScript, CommonJS and AMD, with both seemed valid and useful, yet troubling, because it meant to library owners to support both module system, by means such as a unified module definition via ");
			a25 = element("a");
			t282 = text("UMDjs");
			t283 = text(".");
			t284 = space();
			p53 = element("p");
			t285 = text("So, ");
			a26 = element("a");
			t286 = text("TC39");
			t287 = text(", the standards body charged with defining the syntax and semantics of ECMAScript decided to introduce the ");
			a27 = element("a");
			t288 = text("ES modules");
			t289 = text(" in ES6 (ES2015).");
			t290 = space();
			p54 = element("p");
			t291 = text("ES Modules introduced 2 new syntax, the ");
			code35 = element("code");
			t292 = text("import");
			t293 = text(" and ");
			code36 = element("code");
			t294 = text("export");
			t295 = text(".");
			t296 = space();
			pre14 = element("pre");
			t297 = space();
			p55 = element("p");
			t298 = text("Although at that point of time, most browser still does not support the syntax. So module bundler, like ");
			a28 = element("a");
			t299 = text("webpack");
			t300 = text(" came into picture. ");
			a29 = element("a");
			t301 = text("webpack");
			t302 = text(" transform the code with ");
			code37 = element("code");
			t303 = text("import");
			t304 = text(" and ");
			code38 = element("code");
			t305 = text("export");
			t306 = text(" syntax, by concatenating \"import\"ed modules, and link them together.");
			t307 = space();
			p56 = element("p");
			t308 = text("Now, most ");
			a30 = element("a");
			t309 = text("modern browsers have supported ");
			code39 = element("code");
			t310 = text("<script type=\"module\">");
			t311 = text(", which means, the ");
			code40 = element("code");
			t312 = text("import");
			t313 = text(" and ");
			code41 = element("code");
			t314 = text("export");
			t315 = text(" syntax is supported by default without needing any build tools.");
			t316 = space();
			p57 = element("p");
			t317 = text("Over the years, the JavaScript community have been trying to split JavaScript code into multiple files, and link them together with some module system, such as CommonJS and AMD. ");
			a31 = element("a");
			t318 = text("TC39");
			t319 = text(" introduced ");
			a32 = element("a");
			t320 = text("ES modules");
			t321 = text(" in ES6 (ES2015) to offer an official module syntax in JavaScript, and before browsers supporting the ES modules syntax, we have to rely on build tools such as ");
			a33 = element("a");
			t322 = text("webpack");
			t323 = text(". Finally, modern browsers are now supporting ");
			code42 = element("code");
			t324 = text("<script type=\"module\">");
			t325 = text(", which means we can now use ");
			code43 = element("code");
			t326 = text("import");
			t327 = text(" and ");
			code44 = element("code");
			t328 = text("export");
			t329 = text(" in our JavaScript application without any configurations.");
			t330 = space();
			section5 = element("section");
			h24 = element("h2");
			a34 = element("a");
			t331 = text("Scopability");
			t332 = space();
			blockquote6 = element("blockquote");
			p58 = element("p");
			t333 = text("The \"scope pollution\" problem.");
			t334 = space();
			p59 = element("p");
			t335 = text("There are 2 ways to look at the scope polution problem:");
			t336 = space();
			ul4 = element("ul");
			li17 = element("li");
			t337 = text("2 modules are declaring into the same scope, which might have naming conflicts");
			t338 = space();
			li18 = element("li");
			t339 = text("variables declared within a module is now \"public\" and available to other modules, which wasn't intended");
			t340 = space();
			p60 = element("p");
			t341 = text("In this aspect, there are 2 solutions in general for the problem, and I am going to bring out 2 different tools for each solution as an example.");
			t342 = space();
			p61 = element("p");
			t343 = text("Firstly, scope naming conflicts can be solved via ");
			a35 = element("a");
			t344 = text("namespace");
			t345 = text(". If you read the compiled code from ");
			a36 = element("a");
			t346 = text("Google Closure Tools");
			t347 = text(", you will find that the built-in libraries from Google Closure Tools are namespaced:");
			t348 = space();
			pre15 = element("pre");
			t349 = space();
			p62 = element("p");
			em12 = element("em");
			t350 = text("Examples from \"Building an Application with the Closure Library\" tutorial");
			t351 = space();
			p63 = element("p");
			t352 = text("Compiled into:");
			t353 = space();
			pre16 = element("pre");
			t354 = space();
			p64 = element("p");
			t355 = text("All the code will get concatenated, and declared on the same scope, yet because it is namespace-d, you will have less chance of having a conflict.");
			t356 = space();
			p65 = element("p");
			t357 = text("The other solution for the scope problem, is to wrap each module with a function to create a scope for each module. If you look at AMD's way of writing, you would end up into something like the following:");
			t358 = space();
			pre17 = element("pre");
			t359 = space();
			p66 = element("p");
			t360 = text("You have modules wrapped into their own scope, and hence the only way for 2 modules to interact is through the module systems' ");
			code45 = element("code");
			t361 = text("import");
			t362 = text(" and ");
			code46 = element("code");
			t363 = text("export");
			t364 = text(".");
			t365 = space();
			p67 = element("p");
			t366 = text("In terms of \"scopeability\", the solutions are namespace it or create a new function scope.");
			t367 = space();
			p68 = element("p");
			t368 = text("In fact, these are the 2 different ways module bundlers bundled JavaScript modules into 1 JavaScript file. (which I will explained them further in my future talk).");
			t369 = space();
			section6 = element("section");
			h25 = element("h2");
			a37 = element("a");
			t370 = text("Summary");
			t371 = space();
			p69 = element("p");
			t372 = text("We've seen how module system was introduced into JavaScript, and how different tools, standards, or syntax come about in solving the ");
			strong16 = element("strong");
			t373 = text("Installability");
			t374 = text(", ");
			strong17 = element("strong");
			t375 = text("Scopability");
			t376 = text(" and ");
			strong18 = element("strong");
			t377 = text("Importability");
			t378 = text(" problem.");
			t379 = space();
			section7 = element("section");
			h26 = element("h2");
			a38 = element("a");
			t380 = text("Further Readings");
			t381 = space();
			ul5 = element("ul");
			li19 = element("li");
			a39 = element("a");
			t382 = text("CommonJS effort sets javascript on path for world domination");
			t383 = space();
			li20 = element("li");
			a40 = element("a");
			t384 = text("Writing Modular JavaScript With AMD, CommonJS & ES Harmony");
			t385 = space();
			li21 = element("li");
			a41 = element("a");
			t386 = text("What server side JavaScript needs");
			t387 = space();
			li22 = element("li");
			a42 = element("a");
			t388 = text("ES Modules: a cartoon deep dive");
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
			t0 = claim_text(a0_nodes, "Motivation");
			a0_nodes.forEach(detach);
			li0_nodes.forEach(detach);
			li1 = claim_element(ul0_nodes, "LI", {});
			var li1_nodes = children(li1);
			a1 = claim_element(li1_nodes, "A", { href: true });
			var a1_nodes = children(a1);
			t1 = claim_text(a1_nodes, "The Vanilla way");
			a1_nodes.forEach(detach);
			li1_nodes.forEach(detach);
			li2 = claim_element(ul0_nodes, "LI", {});
			var li2_nodes = children(li2);
			a2 = claim_element(li2_nodes, "A", { href: true });
			var a2_nodes = children(a2);
			t2 = claim_text(a2_nodes, "Installability");
			a2_nodes.forEach(detach);
			li2_nodes.forEach(detach);
			li3 = claim_element(ul0_nodes, "LI", {});
			var li3_nodes = children(li3);
			a3 = claim_element(li3_nodes, "A", { href: true });
			var a3_nodes = children(a3);
			t3 = claim_text(a3_nodes, "Importability");
			a3_nodes.forEach(detach);
			li3_nodes.forEach(detach);
			li4 = claim_element(ul0_nodes, "LI", {});
			var li4_nodes = children(li4);
			a4 = claim_element(li4_nodes, "A", { href: true });
			var a4_nodes = children(a4);
			t4 = claim_text(a4_nodes, "Scopability");
			a4_nodes.forEach(detach);
			li4_nodes.forEach(detach);
			li5 = claim_element(ul0_nodes, "LI", {});
			var li5_nodes = children(li5);
			a5 = claim_element(li5_nodes, "A", { href: true });
			var a5_nodes = children(a5);
			t5 = claim_text(a5_nodes, "Summary");
			a5_nodes.forEach(detach);
			li5_nodes.forEach(detach);
			li6 = claim_element(ul0_nodes, "LI", {});
			var li6_nodes = children(li6);
			a6 = claim_element(li6_nodes, "A", { href: true });
			var a6_nodes = children(a6);
			t6 = claim_text(a6_nodes, "Further Readings");
			a6_nodes.forEach(detach);
			li6_nodes.forEach(detach);
			ul0_nodes.forEach(detach);
			section0_nodes.forEach(detach);
			t7 = claim_space(nodes);
			section1 = claim_element(nodes, "SECTION", {});
			var section1_nodes = children(section1);
			h20 = claim_element(section1_nodes, "H2", {});
			var h20_nodes = children(h20);
			a7 = claim_element(h20_nodes, "A", { href: true, id: true });
			var a7_nodes = children(a7);
			t8 = claim_text(a7_nodes, "Motivation");
			a7_nodes.forEach(detach);
			h20_nodes.forEach(detach);
			t9 = claim_space(section1_nodes);
			p0 = claim_element(section1_nodes, "P", {});
			var p0_nodes = children(p0);
			t10 = claim_text(p0_nodes, "A while ago, I posted an article about ");
			a8 = claim_element(p0_nodes, "A", { href: true, rel: true });
			var a8_nodes = children(a8);
			t11 = claim_text(a8_nodes, "understanding frontend tools");
			a8_nodes.forEach(detach);
			t12 = claim_text(p0_nodes, ". I mentioned that the way I make sense of all the tools and frameworks out there in the JavaScript world, is to try writing a web application with plain JavaScript, and start asking questions.");
			p0_nodes.forEach(detach);
			t13 = claim_space(section1_nodes);
			p1 = claim_element(section1_nodes, "P", {});
			var p1_nodes = children(p1);
			t14 = claim_text(p1_nodes, "One of the question is:");
			p1_nodes.forEach(detach);
			t15 = claim_space(section1_nodes);
			blockquote0 = claim_element(section1_nodes, "BLOCKQUOTE", {});
			var blockquote0_nodes = children(blockquote0);
			p2 = claim_element(blockquote0_nodes, "P", {});
			var p2_nodes = children(p2);
			strong0 = claim_element(p2_nodes, "STRONG", {});
			var strong0_nodes = children(strong0);
			t16 = claim_text(strong0_nodes, "How do we make our JavaScript code modular");
			strong0_nodes.forEach(detach);
			t17 = claim_text(p2_nodes, ", having each piece of code ");
			strong1 = claim_element(p2_nodes, "STRONG", {});
			var strong1_nodes = children(strong1);
			t18 = claim_text(strong1_nodes, "independent");
			strong1_nodes.forEach(detach);
			t19 = claim_text(p2_nodes, " of each other, without having to worry other parts of code affecting it, yet able to ");
			strong2 = claim_element(p2_nodes, "STRONG", {});
			var strong2_nodes = children(strong2);
			t20 = claim_text(strong2_nodes, "share functionality");
			strong2_nodes.forEach(detach);
			t21 = claim_text(p2_nodes, " among different modules.");
			p2_nodes.forEach(detach);
			blockquote0_nodes.forEach(detach);
			t22 = claim_space(section1_nodes);
			p3 = claim_element(section1_nodes, "P", {});
			var p3_nodes = children(p3);
			t23 = claim_text(p3_nodes, "So I will attempt to answer the question by first exploring how things are done in a \"Vanilla\" way, and my two cents about the inherent problem with it and how each tooling come about solving those problems.");
			p3_nodes.forEach(detach);
			section1_nodes.forEach(detach);
			t24 = claim_space(nodes);
			section2 = claim_element(nodes, "SECTION", {});
			var section2_nodes = children(section2);
			h21 = claim_element(section2_nodes, "H2", {});
			var h21_nodes = children(h21);
			a9 = claim_element(h21_nodes, "A", { href: true, id: true });
			var a9_nodes = children(a9);
			t25 = claim_text(a9_nodes, "The Vanilla way");
			a9_nodes.forEach(detach);
			h21_nodes.forEach(detach);
			t26 = claim_space(section2_nodes);
			p4 = claim_element(section2_nodes, "P", {});
			var p4_nodes = children(p4);
			t27 = claim_text(p4_nodes, "Imagine the following scenario:");
			p4_nodes.forEach(detach);
			t28 = claim_space(section2_nodes);
			p5 = claim_element(section2_nodes, "P", {});
			var p5_nodes = children(p5);
			t29 = claim_text(p5_nodes, "You are writing a web application. You created a script, ");
			code0 = claim_element(p5_nodes, "CODE", {});
			var code0_nodes = children(code0);
			t30 = claim_text(code0_nodes, "app.js");
			code0_nodes.forEach(detach);
			t31 = claim_text(p5_nodes, ", and you added a ");
			code1 = claim_element(p5_nodes, "CODE", {});
			var code1_nodes = children(code1);
			t32 = claim_text(code1_nodes, "<script>");
			code1_nodes.forEach(detach);
			t33 = claim_text(p5_nodes, " tag into your ");
			code2 = claim_element(p5_nodes, "CODE", {});
			var code2_nodes = children(code2);
			t34 = claim_text(code2_nodes, "index.html");
			code2_nodes.forEach(detach);
			t35 = claim_text(p5_nodes, ".");
			p5_nodes.forEach(detach);
			t36 = claim_space(section2_nodes);
			pre0 = claim_element(section2_nodes, "PRE", { class: true });
			var pre0_nodes = children(pre0);
			pre0_nodes.forEach(detach);
			t37 = claim_space(section2_nodes);
			p6 = claim_element(section2_nodes, "P", {});
			var p6_nodes = children(p6);
			t38 = claim_text(p6_nodes, "Then you decided to add jQuery, because you heard that jQuery is amazing.");
			p6_nodes.forEach(detach);
			t39 = claim_space(section2_nodes);
			p7 = claim_element(section2_nodes, "P", {});
			var p7_nodes = children(p7);
			strong3 = claim_element(p7_nodes, "STRONG", {});
			var strong3_nodes = children(strong3);
			t40 = claim_text(strong3_nodes, "So how would you add jQuery into your application?");
			strong3_nodes.forEach(detach);
			p7_nodes.forEach(detach);
			t41 = claim_space(section2_nodes);
			p8 = claim_element(section2_nodes, "P", {});
			var p8_nodes = children(p8);
			t42 = claim_text(p8_nodes, "There's a few ways to go about, but the easiest would be:");
			p8_nodes.forEach(detach);
			t43 = claim_space(section2_nodes);
			ul1 = claim_element(section2_nodes, "UL", {});
			var ul1_nodes = children(ul1);
			li7 = claim_element(ul1_nodes, "LI", {});
			var li7_nodes = children(li7);
			t44 = claim_text(li7_nodes, "heading to ");
			a10 = claim_element(li7_nodes, "A", { href: true, rel: true });
			var a10_nodes = children(a10);
			t45 = claim_text(a10_nodes, "jQuery's website");
			a10_nodes.forEach(detach);
			li7_nodes.forEach(detach);
			t46 = claim_space(ul1_nodes);
			li8 = claim_element(ul1_nodes, "LI", {});
			var li8_nodes = children(li8);
			t47 = claim_text(li8_nodes, "click download");
			li8_nodes.forEach(detach);
			t48 = claim_space(ul1_nodes);
			li9 = claim_element(ul1_nodes, "LI", {});
			var li9_nodes = children(li9);
			t49 = claim_text(li9_nodes, "dragged the downloaded file to your project folder");
			li9_nodes.forEach(detach);
			t50 = claim_space(ul1_nodes);
			li10 = claim_element(ul1_nodes, "LI", {});
			var li10_nodes = children(li10);
			t51 = claim_text(li10_nodes, "and add another script tag before your ");
			code3 = claim_element(li10_nodes, "CODE", {});
			var code3_nodes = children(code3);
			t52 = claim_text(code3_nodes, "app.js");
			code3_nodes.forEach(detach);
			t53 = claim_text(li10_nodes, ".");
			li10_nodes.forEach(detach);
			ul1_nodes.forEach(detach);
			t54 = claim_space(section2_nodes);
			p9 = claim_element(section2_nodes, "P", {});
			var p9_nodes = children(p9);
			img0 = claim_element(p9_nodes, "IMG", { src: true, alt: true, title: true });
			p9_nodes.forEach(detach);
			t55 = claim_space(section2_nodes);
			pre1 = claim_element(section2_nodes, "PRE", { class: true });
			var pre1_nodes = children(pre1);
			pre1_nodes.forEach(detach);
			t56 = claim_space(section2_nodes);
			p10 = claim_element(section2_nodes, "P", {});
			var p10_nodes = children(p10);
			em0 = claim_element(p10_nodes, "EM", {});
			var em0_nodes = children(em0);
			t57 = claim_text(em0_nodes, "Adding ");
			code4 = claim_element(em0_nodes, "CODE", {});
			var code4_nodes = children(code4);
			t58 = claim_text(code4_nodes, "jquery");
			code4_nodes.forEach(detach);
			t59 = claim_text(em0_nodes, " into html");
			em0_nodes.forEach(detach);
			p10_nodes.forEach(detach);
			t60 = claim_space(section2_nodes);
			p11 = claim_element(section2_nodes, "P", {});
			var p11_nodes = children(p11);
			t61 = claim_text(p11_nodes, "Although jQuery is awesome, but adding it takes ");
			strong4 = claim_element(p11_nodes, "STRONG", {});
			var strong4_nodes = children(strong4);
			t62 = claim_text(strong4_nodes, "a lot of steps and effort");
			strong4_nodes.forEach(detach);
			t63 = claim_text(p11_nodes, ". And to upgrade jQuery, you would have to redo all the step.");
			p11_nodes.forEach(detach);
			t64 = claim_space(section2_nodes);
			blockquote1 = claim_element(section2_nodes, "BLOCKQUOTE", {});
			var blockquote1_nodes = children(blockquote1);
			p12 = claim_element(blockquote1_nodes, "P", {});
			var p12_nodes = children(p12);
			strong5 = claim_element(p12_nodes, "STRONG", {});
			var strong5_nodes = children(strong5);
			t65 = claim_text(strong5_nodes, "Installing a library");
			strong5_nodes.forEach(detach);
			t66 = claim_text(p12_nodes, " is a hassle back then.");
			p12_nodes.forEach(detach);
			blockquote1_nodes.forEach(detach);
			t67 = claim_space(section2_nodes);
			p13 = claim_element(section2_nodes, "P", {});
			var p13_nodes = children(p13);
			t68 = claim_text(p13_nodes, "Let's say we add another file, ");
			code5 = claim_element(p13_nodes, "CODE", {});
			var code5_nodes = children(code5);
			t69 = claim_text(code5_nodes, "utils.js");
			code5_nodes.forEach(detach);
			t70 = claim_text(p13_nodes, " for all our utility functions.");
			p13_nodes.forEach(detach);
			t71 = claim_space(section2_nodes);
			pre2 = claim_element(section2_nodes, "PRE", { class: true });
			var pre2_nodes = children(pre2);
			pre2_nodes.forEach(detach);
			t72 = claim_space(section2_nodes);
			pre3 = claim_element(section2_nodes, "PRE", { class: true });
			var pre3_nodes = children(pre3);
			pre3_nodes.forEach(detach);
			t73 = claim_space(section2_nodes);
			p14 = claim_element(section2_nodes, "P", {});
			var p14_nodes = children(p14);
			t74 = claim_text(p14_nodes, "Although you meant to just share the function ");
			code6 = claim_element(p14_nodes, "CODE", {});
			var code6_nodes = children(code6);
			t75 = claim_text(code6_nodes, "area");
			code6_nodes.forEach(detach);
			t76 = claim_text(p14_nodes, " from ");
			code7 = claim_element(p14_nodes, "CODE", {});
			var code7_nodes = children(code7);
			t77 = claim_text(code7_nodes, "utils.js");
			code7_nodes.forEach(detach);
			t78 = claim_text(p14_nodes, ", in ");
			code8 = claim_element(p14_nodes, "CODE", {});
			var code8_nodes = children(code8);
			t79 = claim_text(code8_nodes, "app.js");
			code8_nodes.forEach(detach);
			t80 = claim_text(p14_nodes, ", you would notice that both ");
			code9 = claim_element(p14_nodes, "CODE", {});
			var code9_nodes = children(code9);
			t81 = claim_text(code9_nodes, "pi");
			code9_nodes.forEach(detach);
			t82 = claim_text(p14_nodes, " and ");
			code10 = claim_element(p14_nodes, "CODE", {});
			var code10_nodes = children(code10);
			t83 = claim_text(code10_nodes, "area");
			code10_nodes.forEach(detach);
			t84 = claim_text(p14_nodes, " are available.");
			p14_nodes.forEach(detach);
			t85 = claim_space(section2_nodes);
			pre4 = claim_element(section2_nodes, "PRE", { class: true });
			var pre4_nodes = children(pre4);
			pre4_nodes.forEach(detach);
			t86 = claim_space(section2_nodes);
			p15 = claim_element(section2_nodes, "P", {});
			var p15_nodes = children(p15);
			t87 = claim_text(p15_nodes, "That is because when you declare a variable or a function within a script, it will be available to the ");
			strong6 = claim_element(p15_nodes, "STRONG", {});
			var strong6_nodes = children(strong6);
			t88 = claim_text(strong6_nodes, "global scope");
			strong6_nodes.forEach(detach);
			t89 = claim_text(p15_nodes, ".");
			p15_nodes.forEach(detach);
			t90 = claim_space(section2_nodes);
			p16 = claim_element(section2_nodes, "P", {});
			var p16_nodes = children(p16);
			t91 = claim_text(p16_nodes, "The only way to hide it, is to use Immediately Invoked Function Expression (IIFE).");
			p16_nodes.forEach(detach);
			t92 = claim_space(section2_nodes);
			pre5 = claim_element(section2_nodes, "PRE", { class: true });
			var pre5_nodes = children(pre5);
			pre5_nodes.forEach(detach);
			t93 = claim_space(section2_nodes);
			pre6 = claim_element(section2_nodes, "PRE", { class: true });
			var pre6_nodes = children(pre6);
			pre6_nodes.forEach(detach);
			t94 = claim_space(section2_nodes);
			p17 = claim_element(section2_nodes, "P", {});
			var p17_nodes = children(p17);
			t95 = claim_text(p17_nodes, "This is called the ");
			strong7 = claim_element(p17_nodes, "STRONG", {});
			var strong7_nodes = children(strong7);
			t96 = claim_text(strong7_nodes, "module pattern");
			strong7_nodes.forEach(detach);
			t97 = claim_text(p17_nodes, ". The only way to control what to exposed to the global scope.");
			p17_nodes.forEach(detach);
			t98 = claim_space(section2_nodes);
			blockquote2 = claim_element(section2_nodes, "BLOCKQUOTE", {});
			var blockquote2_nodes = children(blockquote2);
			p18 = claim_element(blockquote2_nodes, "P", {});
			var p18_nodes = children(p18);
			strong8 = claim_element(p18_nodes, "STRONG", {});
			var strong8_nodes = children(strong8);
			t99 = claim_text(strong8_nodes, "Scoping the variables");
			strong8_nodes.forEach(detach);
			t100 = claim_text(p18_nodes, " within the module is hard, and you can only do it via the ");
			strong9 = claim_element(p18_nodes, "STRONG", {});
			var strong9_nodes = children(strong9);
			t101 = claim_text(strong9_nodes, "module pattern");
			strong9_nodes.forEach(detach);
			t102 = claim_text(p18_nodes, ".");
			p18_nodes.forEach(detach);
			blockquote2_nodes.forEach(detach);
			t103 = claim_space(section2_nodes);
			p19 = claim_element(section2_nodes, "P", {});
			var p19_nodes = children(p19);
			t104 = claim_text(p19_nodes, "If you have noticed, we access ");
			code11 = claim_element(p19_nodes, "CODE", {});
			var code11_nodes = children(code11);
			t105 = claim_text(code11_nodes, "utils");
			code11_nodes.forEach(detach);
			t106 = claim_text(p19_nodes, " freely, because it is defined in the global scope. If you have another module / library that named ");
			code12 = claim_element(p19_nodes, "CODE", {});
			var code12_nodes = children(code12);
			t107 = claim_text(code12_nodes, "utils");
			code12_nodes.forEach(detach);
			t108 = claim_text(p19_nodes, ", they would have conflicted against each other.");
			p19_nodes.forEach(detach);
			t109 = claim_space(section2_nodes);
			p20 = claim_element(section2_nodes, "P", {});
			var p20_nodes = children(p20);
			t110 = claim_text(p20_nodes, "We want to ");
			em1 = claim_element(p20_nodes, "EM", {});
			var em1_nodes = children(em1);
			t111 = claim_text(em1_nodes, "\"import\"");
			em1_nodes.forEach(detach);
			t112 = claim_text(p20_nodes, " the modules freely, and renamed it anyway we want, without worrying naming conflicts amongst modules / libraries.");
			p20_nodes.forEach(detach);
			t113 = claim_space(section2_nodes);
			blockquote3 = claim_element(section2_nodes, "BLOCKQUOTE", {});
			var blockquote3_nodes = children(blockquote3);
			p21 = claim_element(blockquote3_nodes, "P", {});
			var p21_nodes = children(p21);
			strong10 = claim_element(p21_nodes, "STRONG", {});
			var strong10_nodes = children(strong10);
			t114 = claim_text(strong10_nodes, "Importing");
			strong10_nodes.forEach(detach);
			t115 = claim_text(p21_nodes, " without naming conflicts is what we want.");
			p21_nodes.forEach(detach);
			blockquote3_nodes.forEach(detach);
			t116 = claim_space(section2_nodes);
			p22 = claim_element(section2_nodes, "P", {});
			var p22_nodes = children(p22);
			t117 = claim_text(p22_nodes, "So I hereby summarize, the \"module\" problem in JavaScript,");
			p22_nodes.forEach(detach);
			t118 = claim_space(section2_nodes);
			ul2 = claim_element(section2_nodes, "UL", {});
			var ul2_nodes = children(ul2);
			li11 = claim_element(ul2_nodes, "LI", {});
			var li11_nodes = children(li11);
			strong11 = claim_element(li11_nodes, "STRONG", {});
			var strong11_nodes = children(strong11);
			t119 = claim_text(strong11_nodes, "Installability");
			strong11_nodes.forEach(detach);
			t120 = claim_text(li11_nodes, " - the ability to install easily");
			li11_nodes.forEach(detach);
			t121 = claim_space(ul2_nodes);
			li12 = claim_element(ul2_nodes, "LI", {});
			var li12_nodes = children(li12);
			strong12 = claim_element(li12_nodes, "STRONG", {});
			var strong12_nodes = children(strong12);
			t122 = claim_text(strong12_nodes, "Scopability");
			strong12_nodes.forEach(detach);
			t123 = claim_text(li12_nodes, " - the ability of having clearly defined scoped within modules");
			li12_nodes.forEach(detach);
			t124 = claim_space(ul2_nodes);
			li13 = claim_element(ul2_nodes, "LI", {});
			var li13_nodes = children(li13);
			strong13 = claim_element(li13_nodes, "STRONG", {});
			var strong13_nodes = children(strong13);
			t125 = claim_text(strong13_nodes, "Importability");
			strong13_nodes.forEach(detach);
			t126 = claim_text(li13_nodes, " - the ability to import modules freely without worry");
			li13_nodes.forEach(detach);
			ul2_nodes.forEach(detach);
			t127 = claim_space(section2_nodes);
			p23 = claim_element(section2_nodes, "P", {});
			var p23_nodes = children(p23);
			t128 = claim_text(p23_nodes, "Well, I am not sure some of these word existed, I think I might have made up some of them to make it rhyme.");
			p23_nodes.forEach(detach);
			t129 = claim_space(section2_nodes);
			p24 = claim_element(section2_nodes, "P", {});
			var p24_nodes = children(p24);
			t130 = claim_text(p24_nodes, "The problems above are no longer a concern any more in the 2019 world, yet it is still interesting to see what the JavaScript community has created to solve these problems.");
			p24_nodes.forEach(detach);
			section2_nodes.forEach(detach);
			t131 = claim_space(nodes);
			section3 = claim_element(nodes, "SECTION", {});
			var section3_nodes = children(section3);
			h22 = claim_element(section3_nodes, "H2", {});
			var h22_nodes = children(h22);
			a11 = claim_element(h22_nodes, "A", { href: true, id: true });
			var a11_nodes = children(a11);
			t132 = claim_text(a11_nodes, "Installability");
			a11_nodes.forEach(detach);
			h22_nodes.forEach(detach);
			t133 = claim_space(section3_nodes);
			blockquote4 = claim_element(section3_nodes, "BLOCKQUOTE", {});
			var blockquote4_nodes = children(blockquote4);
			p25 = claim_element(blockquote4_nodes, "P", {});
			var p25_nodes = children(p25);
			t134 = claim_text(p25_nodes, "The \"how easy is it to install\" problem.");
			p25_nodes.forEach(detach);
			blockquote4_nodes.forEach(detach);
			t135 = claim_space(section3_nodes);
			p26 = claim_element(section3_nodes, "P", {});
			var p26_nodes = children(p26);
			t136 = claim_text(p26_nodes, "As mentioned in the earlier example, to \"install\" jQuery into your web app is to download jQuery from their main website. To \"install\" a different version would mean to visit their \"Past Releases\" Page to download the specific version you want.");
			p26_nodes.forEach(detach);
			t137 = claim_space(section3_nodes);
			p27 = claim_element(section3_nodes, "P", {});
			var p27_nodes = children(p27);
			img1 = claim_element(p27_nodes, "IMG", { src: true, alt: true, title: true });
			p27_nodes.forEach(detach);
			t138 = claim_space(section3_nodes);
			p28 = claim_element(section3_nodes, "P", {});
			var p28_nodes = children(p28);
			t139 = claim_text(p28_nodes, "A \"faster\" alternative to this, is to get jQuery served from a CDN provider. ");
			a12 = claim_element(p28_nodes, "A", { href: true, rel: true });
			var a12_nodes = children(a12);
			t140 = claim_text(a12_nodes, "cdnjs.com");
			a12_nodes.forEach(detach);
			t141 = claim_text(p28_nodes, " is a site that catalogues the CDN url for different libraries. The CDN will serve the script faster to the user, because of their delivery network, as well as if multiple sites are using the same CDN url, the file will be cached by browser. And it is faster to \"install\", as ");
			a13 = claim_element(p28_nodes, "A", { href: true, rel: true });
			var a13_nodes = children(a13);
			t142 = claim_text(a13_nodes, "cdnjs.com");
			a13_nodes.forEach(detach);
			t143 = claim_text(p28_nodes, " provides a one-click to \"Copy as script tag\", all you only need to do is to paste it in to your ");
			code13 = claim_element(p28_nodes, "CODE", {});
			var code13_nodes = children(code13);
			t144 = claim_text(code13_nodes, "html");
			code13_nodes.forEach(detach);
			t145 = claim_text(p28_nodes, " file.");
			p28_nodes.forEach(detach);
			t146 = claim_space(section3_nodes);
			p29 = claim_element(section3_nodes, "P", {});
			var p29_nodes = children(p29);
			img2 = claim_element(p29_nodes, "IMG", { src: true, alt: true, title: true });
			p29_nodes.forEach(detach);
			t147 = claim_space(section3_nodes);
			p30 = claim_element(section3_nodes, "P", {});
			var p30_nodes = children(p30);
			t148 = claim_text(p30_nodes, "Parallelly in the ");
			a14 = claim_element(p30_nodes, "A", { href: true, rel: true });
			var a14_nodes = children(a14);
			t149 = claim_text(a14_nodes, "Node.js");
			a14_nodes.forEach(detach);
			t150 = claim_text(p30_nodes, " world, ");
			a15 = claim_element(p30_nodes, "A", { href: true, rel: true });
			var a15_nodes = children(a15);
			t151 = claim_text(a15_nodes, "npm");
			a15_nodes.forEach(detach);
			t152 = claim_text(p30_nodes, ", the Node.js Package Manager was created. With npm, it is much easier to install and maintain packages and their version, ");
			em2 = claim_element(p30_nodes, "EM", {});
			var em2_nodes = children(em2);
			t153 = claim_text(em2_nodes, "(a \"package\" can be seen as a group of JavaScript modules and their description file)");
			em2_nodes.forEach(detach);
			t154 = claim_text(p30_nodes, ", for a Node.js project. All a developer need to do list out the dependencies and their version in ");
			code14 = claim_element(p30_nodes, "CODE", {});
			var code14_nodes = children(code14);
			t155 = claim_text(code14_nodes, "package.json");
			code14_nodes.forEach(detach);
			t156 = claim_text(p30_nodes, " and run ");
			code15 = claim_element(p30_nodes, "CODE", {});
			var code15_nodes = children(code15);
			t157 = claim_text(code15_nodes, "npm install");
			code15_nodes.forEach(detach);
			t158 = claim_text(p30_nodes, ".");
			p30_nodes.forEach(detach);
			t159 = claim_space(section3_nodes);
			p31 = claim_element(section3_nodes, "P", {});
			var p31_nodes = children(p31);
			t160 = claim_text(p31_nodes, "If you think the ");
			em3 = claim_element(p31_nodes, "EM", {});
			var em3_nodes = children(em3);
			t161 = claim_text(em3_nodes, "problem of installability");
			em3_nodes.forEach(detach);
			t162 = claim_text(p31_nodes, " stops here, well, not quite. See, npm was created for Node.js application, packages that are published to the npm registry was not meant for browser use. The JavaScript \"modules\" uses \"syntax\" like the ");
			code16 = claim_element(p31_nodes, "CODE", {});
			var code16_nodes = children(code16);
			t163 = claim_text(code16_nodes, "module.exports");
			code16_nodes.forEach(detach);
			t164 = claim_text(p31_nodes, " and ");
			code17 = claim_element(p31_nodes, "CODE", {});
			var code17_nodes = children(code17);
			t165 = claim_text(code17_nodes, "require");
			code17_nodes.forEach(detach);
			t166 = claim_text(p31_nodes, " which are not readily understandable by the browser. Therefore you can't add a script tag to include files you just installed from npm. ");
			em4 = claim_element(p31_nodes, "EM", {});
			var em4_nodes = children(em4);
			t167 = claim_text(em4_nodes, "(I will explain what ");
			code18 = claim_element(em4_nodes, "CODE", {});
			var code18_nodes = children(code18);
			t168 = claim_text(code18_nodes, "module.exports");
			code18_nodes.forEach(detach);
			t169 = claim_text(em4_nodes, " and ");
			code19 = claim_element(em4_nodes, "CODE", {});
			var code19_nodes = children(code19);
			t170 = claim_text(code19_nodes, "require");
			code19_nodes.forEach(detach);
			t171 = claim_text(em4_nodes, " syntax are in the later part of this article)");
			em4_nodes.forEach(detach);
			p31_nodes.forEach(detach);
			t172 = claim_space(section3_nodes);
			pre7 = claim_element(section3_nodes, "PRE", { class: true });
			var pre7_nodes = children(pre7);
			pre7_nodes.forEach(detach);
			t173 = claim_space(section3_nodes);
			p32 = claim_element(section3_nodes, "P", {});
			var p32_nodes = children(p32);
			t174 = claim_text(p32_nodes, "That's why ");
			a16 = claim_element(p32_nodes, "A", { href: true, rel: true });
			var a16_nodes = children(a16);
			t175 = claim_text(a16_nodes, "bower");
			a16_nodes.forEach(detach);
			t176 = claim_text(p32_nodes, " was created. It is called the package manager for the web, because the \"package\" you installed from bower are readily to be used in the ");
			code20 = claim_element(p32_nodes, "CODE", {});
			var code20_nodes = children(code20);
			t177 = claim_text(code20_nodes, "html");
			code20_nodes.forEach(detach);
			t178 = claim_text(p32_nodes, ".");
			p32_nodes.forEach(detach);
			t179 = claim_space(section3_nodes);
			p33 = claim_element(section3_nodes, "P", {});
			var p33_nodes = children(p33);
			img3 = claim_element(p33_nodes, "IMG", { src: true, alt: true });
			p33_nodes.forEach(detach);
			t180 = claim_space(section3_nodes);
			pre8 = claim_element(section3_nodes, "PRE", { class: true });
			var pre8_nodes = children(pre8);
			pre8_nodes.forEach(detach);
			t181 = claim_space(section3_nodes);
			p34 = claim_element(section3_nodes, "P", {});
			var p34_nodes = children(p34);
			em5 = claim_element(p34_nodes, "EM", {});
			var em5_nodes = children(em5);
			t182 = claim_text(em5_nodes, "A typical web application project setup with both bower and npm");
			em5_nodes.forEach(detach);
			p34_nodes.forEach(detach);
			t183 = claim_space(section3_nodes);
			pre9 = claim_element(section3_nodes, "PRE", { class: true });
			var pre9_nodes = children(pre9);
			pre9_nodes.forEach(detach);
			t184 = claim_space(section3_nodes);
			p35 = claim_element(section3_nodes, "P", {});
			var p35_nodes = children(p35);
			em6 = claim_element(p35_nodes, "EM", {});
			var em6_nodes = children(em6);
			t185 = claim_text(em6_nodes, "Adding bower packages into index.html");
			em6_nodes.forEach(detach);
			p35_nodes.forEach(detach);
			t186 = claim_space(section3_nodes);
			p36 = claim_element(section3_nodes, "P", {});
			var p36_nodes = children(p36);
			t187 = claim_text(p36_nodes, "Bower components for browser libraries and npm packages for build tools, had been a common web app projects setup until the next tool comes up to change it.");
			p36_nodes.forEach(detach);
			t188 = claim_space(section3_nodes);
			p37 = claim_element(section3_nodes, "P", {});
			var p37_nodes = children(p37);
			a17 = claim_element(p37_nodes, "A", { href: true, rel: true });
			var a17_nodes = children(a17);
			t189 = claim_text(a17_nodes, "Browserify");
			a17_nodes.forEach(detach);
			t190 = claim_text(p37_nodes, " tries to bring the vast registry of packages from ");
			code21 = claim_element(p37_nodes, "CODE", {});
			var code21_nodes = children(code21);
			t191 = claim_text(code21_nodes, "npm");
			code21_nodes.forEach(detach);
			t192 = claim_text(p37_nodes, " to the web. Browserify is a module bundler, it reads and understands the ");
			code22 = claim_element(p37_nodes, "CODE", {});
			var code22_nodes = children(code22);
			t193 = claim_text(code22_nodes, "require");
			code22_nodes.forEach(detach);
			t194 = claim_text(p37_nodes, " syntax, and tries to bundle all the modules into one file.");
			p37_nodes.forEach(detach);
			t195 = claim_space(section3_nodes);
			p38 = claim_element(section3_nodes, "P", {});
			var p38_nodes = children(p38);
			img4 = claim_element(p38_nodes, "IMG", { src: true, alt: true });
			p38_nodes.forEach(detach);
			t196 = claim_space(section3_nodes);
			p39 = claim_element(section3_nodes, "P", {});
			var p39_nodes = children(p39);
			t197 = claim_text(p39_nodes, "With ");
			a18 = claim_element(p39_nodes, "A", { href: true, rel: true });
			var a18_nodes = children(a18);
			t198 = claim_text(a18_nodes, "Browserify");
			a18_nodes.forEach(detach);
			t199 = claim_text(p39_nodes, ", and other module bundler, eg ");
			a19 = claim_element(p39_nodes, "A", { href: true, rel: true });
			var a19_nodes = children(a19);
			t200 = claim_text(a19_nodes, "webpack");
			a19_nodes.forEach(detach);
			t201 = claim_text(p39_nodes, ", ");
			a20 = claim_element(p39_nodes, "A", { href: true, rel: true });
			var a20_nodes = children(a20);
			t202 = claim_text(a20_nodes, "rollup");
			a20_nodes.forEach(detach);
			t203 = claim_text(p39_nodes, " etc, we are now able to freely share code among Node.js and browser application, and use ");
			code23 = claim_element(p39_nodes, "CODE", {});
			var code23_nodes = children(code23);
			t204 = claim_text(code23_nodes, "npm");
			code23_nodes.forEach(detach);
			t205 = claim_text(p39_nodes, " as a package manager for installing and upgrading packages.");
			p39_nodes.forEach(detach);
			section3_nodes.forEach(detach);
			t206 = claim_space(nodes);
			section4 = claim_element(nodes, "SECTION", {});
			var section4_nodes = children(section4);
			h23 = claim_element(section4_nodes, "H2", {});
			var h23_nodes = children(h23);
			a21 = claim_element(h23_nodes, "A", { href: true, id: true });
			var a21_nodes = children(a21);
			t207 = claim_text(a21_nodes, "Importability");
			a21_nodes.forEach(detach);
			h23_nodes.forEach(detach);
			t208 = claim_space(section4_nodes);
			blockquote5 = claim_element(section4_nodes, "BLOCKQUOTE", {});
			var blockquote5_nodes = children(blockquote5);
			p40 = claim_element(blockquote5_nodes, "P", {});
			var p40_nodes = children(p40);
			t209 = claim_text(p40_nodes, "The \"how easy is it to import\" problem.");
			p40_nodes.forEach(detach);
			blockquote5_nodes.forEach(detach);
			t210 = claim_space(section4_nodes);
			p41 = claim_element(section4_nodes, "P", {});
			var p41_nodes = children(p41);
			t211 = claim_text(p41_nodes, "Let's recap the problem of ");
			em7 = claim_element(p41_nodes, "EM", {});
			var em7_nodes = children(em7);
			t212 = claim_text(em7_nodes, "\"importability\"");
			em7_nodes.forEach(detach);
			t213 = claim_text(p41_nodes, " with the example earlier. We mentioned that everything we declare within each file, are available to other files via the global scope. There is no control of what you are importing, the sequence of the importing. At this point of time, each JavaScript files is just a script, until module systems were introduced.");
			p41_nodes.forEach(detach);
			t214 = claim_space(section4_nodes);
			p42 = claim_element(section4_nodes, "P", {});
			var p42_nodes = children(p42);
			t215 = claim_text(p42_nodes, "With the advent of Node.js, there's a need to ");
			em8 = claim_element(p42_nodes, "EM", {});
			var em8_nodes = children(em8);
			t216 = claim_text(em8_nodes, "require");
			em8_nodes.forEach(detach);
			t217 = claim_text(p42_nodes, " common modules into your JavaScript code. Because in Node.js context, there's no ");
			code24 = claim_element(p42_nodes, "CODE", {});
			var code24_nodes = children(code24);
			t218 = claim_text(code24_nodes, "index.html");
			code24_nodes.forEach(detach);
			t219 = claim_text(p42_nodes, " where you can ");
			em9 = claim_element(p42_nodes, "EM", {});
			var em9_nodes = children(em9);
			t220 = claim_text(em9_nodes, "\"insert script tags\"");
			em9_nodes.forEach(detach);
			t221 = claim_text(p42_nodes, ". At some point you need to ");
			em10 = claim_element(p42_nodes, "EM", {});
			var em10_nodes = children(em10);
			t222 = claim_text(em10_nodes, "require");
			em10_nodes.forEach(detach);
			t223 = claim_text(p42_nodes, " some external modules, or else you will end up writing a very long JavaScript file.");
			p42_nodes.forEach(detach);
			t224 = claim_space(section4_nodes);
			p43 = claim_element(section4_nodes, "P", {});
			var p43_nodes = children(p43);
			t225 = claim_text(p43_nodes, "So ");
			a22 = claim_element(p43_nodes, "A", { href: true, rel: true });
			var a22_nodes = children(a22);
			t226 = claim_text(a22_nodes, "CommonJS");
			a22_nodes.forEach(detach);
			t227 = claim_text(p43_nodes, " were introduced into Node.js. It allows your JavaScript code to ");
			code25 = claim_element(p43_nodes, "CODE", {});
			var code25_nodes = children(code25);
			t228 = claim_text(code25_nodes, "require");
			code25_nodes.forEach(detach);
			t229 = claim_text(p43_nodes, " and ");
			code26 = claim_element(p43_nodes, "CODE", {});
			var code26_nodes = children(code26);
			t230 = claim_text(code26_nodes, "export");
			code26_nodes.forEach(detach);
			t231 = claim_text(p43_nodes, " other JavaScript modules.");
			p43_nodes.forEach(detach);
			t232 = claim_space(section4_nodes);
			pre10 = claim_element(section4_nodes, "PRE", { class: true });
			var pre10_nodes = children(pre10);
			pre10_nodes.forEach(detach);
			t233 = claim_space(section4_nodes);
			p44 = claim_element(section4_nodes, "P", {});
			var p44_nodes = children(p44);
			em11 = claim_element(p44_nodes, "EM", {});
			var em11_nodes = children(em11);
			t234 = claim_text(em11_nodes, "the commonjs \"require\" and \"export\" syntax");
			em11_nodes.forEach(detach);
			p44_nodes.forEach(detach);
			t235 = claim_space(section4_nodes);
			p45 = claim_element(section4_nodes, "P", {});
			var p45_nodes = children(p45);
			t236 = claim_text(p45_nodes, "Note that ");
			code27 = claim_element(p45_nodes, "CODE", {});
			var code27_nodes = children(code27);
			t237 = claim_text(code27_nodes, "require()");
			code27_nodes.forEach(detach);
			t238 = claim_text(p45_nodes, " is ");
			strong14 = claim_element(p45_nodes, "STRONG", {});
			var strong14_nodes = children(strong14);
			t239 = claim_text(strong14_nodes, "synchronous");
			strong14_nodes.forEach(detach);
			t240 = claim_text(p45_nodes, ".");
			p45_nodes.forEach(detach);
			t241 = claim_space(section4_nodes);
			p46 = claim_element(section4_nodes, "P", {});
			var p46_nodes = children(p46);
			t242 = claim_text(p46_nodes, "When you call ");
			code28 = claim_element(p46_nodes, "CODE", {});
			var code28_nodes = children(code28);
			t243 = claim_text(code28_nodes, "require('./circle.js')");
			code28_nodes.forEach(detach);
			t244 = claim_text(p46_nodes, ", Node runtime will:");
			p46_nodes.forEach(detach);
			t245 = claim_space(section4_nodes);
			ul3 = claim_element(section4_nodes, "UL", {});
			var ul3_nodes = children(ul3);
			li14 = claim_element(ul3_nodes, "LI", {});
			var li14_nodes = children(li14);
			t246 = claim_text(li14_nodes, "find the file you are ");
			code29 = claim_element(li14_nodes, "CODE", {});
			var code29_nodes = children(code29);
			t247 = claim_text(code29_nodes, "require");
			code29_nodes.forEach(detach);
			t248 = claim_text(li14_nodes, "ing");
			li14_nodes.forEach(detach);
			t249 = claim_space(ul3_nodes);
			li15 = claim_element(ul3_nodes, "LI", {});
			var li15_nodes = children(li15);
			t250 = claim_text(li15_nodes, "parse and eval the content");
			li15_nodes.forEach(detach);
			t251 = claim_space(ul3_nodes);
			li16 = claim_element(ul3_nodes, "LI", {});
			var li16_nodes = children(li16);
			t252 = claim_text(li16_nodes, "return what is assigned to ");
			code30 = claim_element(li16_nodes, "CODE", {});
			var code30_nodes = children(code30);
			t253 = claim_text(code30_nodes, "exports");
			code30_nodes.forEach(detach);
			t254 = claim_text(li16_nodes, ".");
			li16_nodes.forEach(detach);
			ul3_nodes.forEach(detach);
			t255 = claim_space(section4_nodes);
			p47 = claim_element(section4_nodes, "P", {});
			var p47_nodes = children(p47);
			t256 = claim_text(p47_nodes, "But, if we are going to port the ");
			code31 = claim_element(p47_nodes, "CODE", {});
			var code31_nodes = children(code31);
			t257 = claim_text(code31_nodes, "require");
			code31_nodes.forEach(detach);
			t258 = claim_text(p47_nodes, " syntax into the browser, it will not be able to be synchronous. Because, fetching content involves network call, and it will have to be asynchronous. So, it only make sense to have a asynchronous ");
			code32 = claim_element(p47_nodes, "CODE", {});
			var code32_nodes = children(code32);
			t259 = claim_text(code32_nodes, "require");
			code32_nodes.forEach(detach);
			t260 = claim_text(p47_nodes, ":");
			p47_nodes.forEach(detach);
			t261 = claim_space(section4_nodes);
			pre11 = claim_element(section4_nodes, "PRE", { class: true });
			var pre11_nodes = children(pre11);
			pre11_nodes.forEach(detach);
			t262 = claim_space(section4_nodes);
			p48 = claim_element(section4_nodes, "P", {});
			var p48_nodes = children(p48);
			t263 = claim_text(p48_nodes, "And this is exactly how ");
			a23 = claim_element(p48_nodes, "A", { href: true, rel: true });
			var a23_nodes = children(a23);
			strong15 = claim_element(a23_nodes, "STRONG", {});
			var strong15_nodes = children(strong15);
			t264 = claim_text(strong15_nodes, "script loaders");
			strong15_nodes.forEach(detach);
			a23_nodes.forEach(detach);
			t265 = claim_text(p48_nodes, " work!");
			p48_nodes.forEach(detach);
			t266 = claim_space(section4_nodes);
			p49 = claim_element(section4_nodes, "P", {});
			var p49_nodes = children(p49);
			t267 = claim_text(p49_nodes, "If you find the concept of script loading similar, that's because it is the exact same concept of dynamic import we have today. In fact, if you look at the code, they have the same mechanics of loading the script asynchronously!");
			p49_nodes.forEach(detach);
			t268 = claim_space(section4_nodes);
			pre12 = claim_element(section4_nodes, "PRE", { class: true });
			var pre12_nodes = children(pre12);
			pre12_nodes.forEach(detach);
			t269 = claim_space(section4_nodes);
			p50 = claim_element(section4_nodes, "P", {});
			var p50_nodes = children(p50);
			t270 = claim_text(p50_nodes, "CommonJS's ");
			code33 = claim_element(p50_nodes, "CODE", {});
			var code33_nodes = children(code33);
			t271 = claim_text(code33_nodes, "require");
			code33_nodes.forEach(detach);
			t272 = claim_text(p50_nodes, " statement did not take into consideration of the asynchronicity of the browser land, therefore the JavaScript community came up with another module system, ");
			a24 = claim_element(p50_nodes, "A", { href: true, rel: true });
			var a24_nodes = children(a24);
			t273 = claim_text(a24_nodes, "AMD (Asynchronous Module Definition)");
			a24_nodes.forEach(detach);
			t274 = claim_text(p50_nodes, ".");
			p50_nodes.forEach(detach);
			t275 = claim_space(section4_nodes);
			p51 = claim_element(section4_nodes, "P", {});
			var p51_nodes = children(p51);
			t276 = claim_text(p51_nodes, "AMD uses an asynchronous ");
			code34 = claim_element(p51_nodes, "CODE", {});
			var code34_nodes = children(code34);
			t277 = claim_text(code34_nodes, "require");
			code34_nodes.forEach(detach);
			t278 = claim_text(p51_nodes, " syntax, that takes a callback that would be called only after the dependency is available.");
			p51_nodes.forEach(detach);
			t279 = claim_space(section4_nodes);
			pre13 = claim_element(section4_nodes, "PRE", { class: true });
			var pre13_nodes = children(pre13);
			pre13_nodes.forEach(detach);
			t280 = claim_space(section4_nodes);
			p52 = claim_element(section4_nodes, "P", {});
			var p52_nodes = children(p52);
			t281 = claim_text(p52_nodes, "We have both module system in JavaScript, CommonJS and AMD, with both seemed valid and useful, yet troubling, because it meant to library owners to support both module system, by means such as a unified module definition via ");
			a25 = claim_element(p52_nodes, "A", { href: true, rel: true });
			var a25_nodes = children(a25);
			t282 = claim_text(a25_nodes, "UMDjs");
			a25_nodes.forEach(detach);
			t283 = claim_text(p52_nodes, ".");
			p52_nodes.forEach(detach);
			t284 = claim_space(section4_nodes);
			p53 = claim_element(section4_nodes, "P", {});
			var p53_nodes = children(p53);
			t285 = claim_text(p53_nodes, "So, ");
			a26 = claim_element(p53_nodes, "A", { href: true, rel: true });
			var a26_nodes = children(a26);
			t286 = claim_text(a26_nodes, "TC39");
			a26_nodes.forEach(detach);
			t287 = claim_text(p53_nodes, ", the standards body charged with defining the syntax and semantics of ECMAScript decided to introduce the ");
			a27 = claim_element(p53_nodes, "A", { href: true, rel: true });
			var a27_nodes = children(a27);
			t288 = claim_text(a27_nodes, "ES modules");
			a27_nodes.forEach(detach);
			t289 = claim_text(p53_nodes, " in ES6 (ES2015).");
			p53_nodes.forEach(detach);
			t290 = claim_space(section4_nodes);
			p54 = claim_element(section4_nodes, "P", {});
			var p54_nodes = children(p54);
			t291 = claim_text(p54_nodes, "ES Modules introduced 2 new syntax, the ");
			code35 = claim_element(p54_nodes, "CODE", {});
			var code35_nodes = children(code35);
			t292 = claim_text(code35_nodes, "import");
			code35_nodes.forEach(detach);
			t293 = claim_text(p54_nodes, " and ");
			code36 = claim_element(p54_nodes, "CODE", {});
			var code36_nodes = children(code36);
			t294 = claim_text(code36_nodes, "export");
			code36_nodes.forEach(detach);
			t295 = claim_text(p54_nodes, ".");
			p54_nodes.forEach(detach);
			t296 = claim_space(section4_nodes);
			pre14 = claim_element(section4_nodes, "PRE", { class: true });
			var pre14_nodes = children(pre14);
			pre14_nodes.forEach(detach);
			t297 = claim_space(section4_nodes);
			p55 = claim_element(section4_nodes, "P", {});
			var p55_nodes = children(p55);
			t298 = claim_text(p55_nodes, "Although at that point of time, most browser still does not support the syntax. So module bundler, like ");
			a28 = claim_element(p55_nodes, "A", { href: true, rel: true });
			var a28_nodes = children(a28);
			t299 = claim_text(a28_nodes, "webpack");
			a28_nodes.forEach(detach);
			t300 = claim_text(p55_nodes, " came into picture. ");
			a29 = claim_element(p55_nodes, "A", { href: true, rel: true });
			var a29_nodes = children(a29);
			t301 = claim_text(a29_nodes, "webpack");
			a29_nodes.forEach(detach);
			t302 = claim_text(p55_nodes, " transform the code with ");
			code37 = claim_element(p55_nodes, "CODE", {});
			var code37_nodes = children(code37);
			t303 = claim_text(code37_nodes, "import");
			code37_nodes.forEach(detach);
			t304 = claim_text(p55_nodes, " and ");
			code38 = claim_element(p55_nodes, "CODE", {});
			var code38_nodes = children(code38);
			t305 = claim_text(code38_nodes, "export");
			code38_nodes.forEach(detach);
			t306 = claim_text(p55_nodes, " syntax, by concatenating \"import\"ed modules, and link them together.");
			p55_nodes.forEach(detach);
			t307 = claim_space(section4_nodes);
			p56 = claim_element(section4_nodes, "P", {});
			var p56_nodes = children(p56);
			t308 = claim_text(p56_nodes, "Now, most ");
			a30 = claim_element(p56_nodes, "A", { href: true, rel: true });
			var a30_nodes = children(a30);
			t309 = claim_text(a30_nodes, "modern browsers have supported ");
			code39 = claim_element(a30_nodes, "CODE", {});
			var code39_nodes = children(code39);
			t310 = claim_text(code39_nodes, "<script type=\"module\">");
			code39_nodes.forEach(detach);
			a30_nodes.forEach(detach);
			t311 = claim_text(p56_nodes, ", which means, the ");
			code40 = claim_element(p56_nodes, "CODE", {});
			var code40_nodes = children(code40);
			t312 = claim_text(code40_nodes, "import");
			code40_nodes.forEach(detach);
			t313 = claim_text(p56_nodes, " and ");
			code41 = claim_element(p56_nodes, "CODE", {});
			var code41_nodes = children(code41);
			t314 = claim_text(code41_nodes, "export");
			code41_nodes.forEach(detach);
			t315 = claim_text(p56_nodes, " syntax is supported by default without needing any build tools.");
			p56_nodes.forEach(detach);
			t316 = claim_space(section4_nodes);
			p57 = claim_element(section4_nodes, "P", {});
			var p57_nodes = children(p57);
			t317 = claim_text(p57_nodes, "Over the years, the JavaScript community have been trying to split JavaScript code into multiple files, and link them together with some module system, such as CommonJS and AMD. ");
			a31 = claim_element(p57_nodes, "A", { href: true, rel: true });
			var a31_nodes = children(a31);
			t318 = claim_text(a31_nodes, "TC39");
			a31_nodes.forEach(detach);
			t319 = claim_text(p57_nodes, " introduced ");
			a32 = claim_element(p57_nodes, "A", { href: true, rel: true });
			var a32_nodes = children(a32);
			t320 = claim_text(a32_nodes, "ES modules");
			a32_nodes.forEach(detach);
			t321 = claim_text(p57_nodes, " in ES6 (ES2015) to offer an official module syntax in JavaScript, and before browsers supporting the ES modules syntax, we have to rely on build tools such as ");
			a33 = claim_element(p57_nodes, "A", { href: true, rel: true });
			var a33_nodes = children(a33);
			t322 = claim_text(a33_nodes, "webpack");
			a33_nodes.forEach(detach);
			t323 = claim_text(p57_nodes, ". Finally, modern browsers are now supporting ");
			code42 = claim_element(p57_nodes, "CODE", {});
			var code42_nodes = children(code42);
			t324 = claim_text(code42_nodes, "<script type=\"module\">");
			code42_nodes.forEach(detach);
			t325 = claim_text(p57_nodes, ", which means we can now use ");
			code43 = claim_element(p57_nodes, "CODE", {});
			var code43_nodes = children(code43);
			t326 = claim_text(code43_nodes, "import");
			code43_nodes.forEach(detach);
			t327 = claim_text(p57_nodes, " and ");
			code44 = claim_element(p57_nodes, "CODE", {});
			var code44_nodes = children(code44);
			t328 = claim_text(code44_nodes, "export");
			code44_nodes.forEach(detach);
			t329 = claim_text(p57_nodes, " in our JavaScript application without any configurations.");
			p57_nodes.forEach(detach);
			section4_nodes.forEach(detach);
			t330 = claim_space(nodes);
			section5 = claim_element(nodes, "SECTION", {});
			var section5_nodes = children(section5);
			h24 = claim_element(section5_nodes, "H2", {});
			var h24_nodes = children(h24);
			a34 = claim_element(h24_nodes, "A", { href: true, id: true });
			var a34_nodes = children(a34);
			t331 = claim_text(a34_nodes, "Scopability");
			a34_nodes.forEach(detach);
			h24_nodes.forEach(detach);
			t332 = claim_space(section5_nodes);
			blockquote6 = claim_element(section5_nodes, "BLOCKQUOTE", {});
			var blockquote6_nodes = children(blockquote6);
			p58 = claim_element(blockquote6_nodes, "P", {});
			var p58_nodes = children(p58);
			t333 = claim_text(p58_nodes, "The \"scope pollution\" problem.");
			p58_nodes.forEach(detach);
			blockquote6_nodes.forEach(detach);
			t334 = claim_space(section5_nodes);
			p59 = claim_element(section5_nodes, "P", {});
			var p59_nodes = children(p59);
			t335 = claim_text(p59_nodes, "There are 2 ways to look at the scope polution problem:");
			p59_nodes.forEach(detach);
			t336 = claim_space(section5_nodes);
			ul4 = claim_element(section5_nodes, "UL", {});
			var ul4_nodes = children(ul4);
			li17 = claim_element(ul4_nodes, "LI", {});
			var li17_nodes = children(li17);
			t337 = claim_text(li17_nodes, "2 modules are declaring into the same scope, which might have naming conflicts");
			li17_nodes.forEach(detach);
			t338 = claim_space(ul4_nodes);
			li18 = claim_element(ul4_nodes, "LI", {});
			var li18_nodes = children(li18);
			t339 = claim_text(li18_nodes, "variables declared within a module is now \"public\" and available to other modules, which wasn't intended");
			li18_nodes.forEach(detach);
			ul4_nodes.forEach(detach);
			t340 = claim_space(section5_nodes);
			p60 = claim_element(section5_nodes, "P", {});
			var p60_nodes = children(p60);
			t341 = claim_text(p60_nodes, "In this aspect, there are 2 solutions in general for the problem, and I am going to bring out 2 different tools for each solution as an example.");
			p60_nodes.forEach(detach);
			t342 = claim_space(section5_nodes);
			p61 = claim_element(section5_nodes, "P", {});
			var p61_nodes = children(p61);
			t343 = claim_text(p61_nodes, "Firstly, scope naming conflicts can be solved via ");
			a35 = claim_element(p61_nodes, "A", { href: true, rel: true });
			var a35_nodes = children(a35);
			t344 = claim_text(a35_nodes, "namespace");
			a35_nodes.forEach(detach);
			t345 = claim_text(p61_nodes, ". If you read the compiled code from ");
			a36 = claim_element(p61_nodes, "A", { href: true, rel: true });
			var a36_nodes = children(a36);
			t346 = claim_text(a36_nodes, "Google Closure Tools");
			a36_nodes.forEach(detach);
			t347 = claim_text(p61_nodes, ", you will find that the built-in libraries from Google Closure Tools are namespaced:");
			p61_nodes.forEach(detach);
			t348 = claim_space(section5_nodes);
			pre15 = claim_element(section5_nodes, "PRE", { class: true });
			var pre15_nodes = children(pre15);
			pre15_nodes.forEach(detach);
			t349 = claim_space(section5_nodes);
			p62 = claim_element(section5_nodes, "P", {});
			var p62_nodes = children(p62);
			em12 = claim_element(p62_nodes, "EM", {});
			var em12_nodes = children(em12);
			t350 = claim_text(em12_nodes, "Examples from \"Building an Application with the Closure Library\" tutorial");
			em12_nodes.forEach(detach);
			p62_nodes.forEach(detach);
			t351 = claim_space(section5_nodes);
			p63 = claim_element(section5_nodes, "P", {});
			var p63_nodes = children(p63);
			t352 = claim_text(p63_nodes, "Compiled into:");
			p63_nodes.forEach(detach);
			t353 = claim_space(section5_nodes);
			pre16 = claim_element(section5_nodes, "PRE", { class: true });
			var pre16_nodes = children(pre16);
			pre16_nodes.forEach(detach);
			t354 = claim_space(section5_nodes);
			p64 = claim_element(section5_nodes, "P", {});
			var p64_nodes = children(p64);
			t355 = claim_text(p64_nodes, "All the code will get concatenated, and declared on the same scope, yet because it is namespace-d, you will have less chance of having a conflict.");
			p64_nodes.forEach(detach);
			t356 = claim_space(section5_nodes);
			p65 = claim_element(section5_nodes, "P", {});
			var p65_nodes = children(p65);
			t357 = claim_text(p65_nodes, "The other solution for the scope problem, is to wrap each module with a function to create a scope for each module. If you look at AMD's way of writing, you would end up into something like the following:");
			p65_nodes.forEach(detach);
			t358 = claim_space(section5_nodes);
			pre17 = claim_element(section5_nodes, "PRE", { class: true });
			var pre17_nodes = children(pre17);
			pre17_nodes.forEach(detach);
			t359 = claim_space(section5_nodes);
			p66 = claim_element(section5_nodes, "P", {});
			var p66_nodes = children(p66);
			t360 = claim_text(p66_nodes, "You have modules wrapped into their own scope, and hence the only way for 2 modules to interact is through the module systems' ");
			code45 = claim_element(p66_nodes, "CODE", {});
			var code45_nodes = children(code45);
			t361 = claim_text(code45_nodes, "import");
			code45_nodes.forEach(detach);
			t362 = claim_text(p66_nodes, " and ");
			code46 = claim_element(p66_nodes, "CODE", {});
			var code46_nodes = children(code46);
			t363 = claim_text(code46_nodes, "export");
			code46_nodes.forEach(detach);
			t364 = claim_text(p66_nodes, ".");
			p66_nodes.forEach(detach);
			t365 = claim_space(section5_nodes);
			p67 = claim_element(section5_nodes, "P", {});
			var p67_nodes = children(p67);
			t366 = claim_text(p67_nodes, "In terms of \"scopeability\", the solutions are namespace it or create a new function scope.");
			p67_nodes.forEach(detach);
			t367 = claim_space(section5_nodes);
			p68 = claim_element(section5_nodes, "P", {});
			var p68_nodes = children(p68);
			t368 = claim_text(p68_nodes, "In fact, these are the 2 different ways module bundlers bundled JavaScript modules into 1 JavaScript file. (which I will explained them further in my future talk).");
			p68_nodes.forEach(detach);
			section5_nodes.forEach(detach);
			t369 = claim_space(nodes);
			section6 = claim_element(nodes, "SECTION", {});
			var section6_nodes = children(section6);
			h25 = claim_element(section6_nodes, "H2", {});
			var h25_nodes = children(h25);
			a37 = claim_element(h25_nodes, "A", { href: true, id: true });
			var a37_nodes = children(a37);
			t370 = claim_text(a37_nodes, "Summary");
			a37_nodes.forEach(detach);
			h25_nodes.forEach(detach);
			t371 = claim_space(section6_nodes);
			p69 = claim_element(section6_nodes, "P", {});
			var p69_nodes = children(p69);
			t372 = claim_text(p69_nodes, "We've seen how module system was introduced into JavaScript, and how different tools, standards, or syntax come about in solving the ");
			strong16 = claim_element(p69_nodes, "STRONG", {});
			var strong16_nodes = children(strong16);
			t373 = claim_text(strong16_nodes, "Installability");
			strong16_nodes.forEach(detach);
			t374 = claim_text(p69_nodes, ", ");
			strong17 = claim_element(p69_nodes, "STRONG", {});
			var strong17_nodes = children(strong17);
			t375 = claim_text(strong17_nodes, "Scopability");
			strong17_nodes.forEach(detach);
			t376 = claim_text(p69_nodes, " and ");
			strong18 = claim_element(p69_nodes, "STRONG", {});
			var strong18_nodes = children(strong18);
			t377 = claim_text(strong18_nodes, "Importability");
			strong18_nodes.forEach(detach);
			t378 = claim_text(p69_nodes, " problem.");
			p69_nodes.forEach(detach);
			section6_nodes.forEach(detach);
			t379 = claim_space(nodes);
			section7 = claim_element(nodes, "SECTION", {});
			var section7_nodes = children(section7);
			h26 = claim_element(section7_nodes, "H2", {});
			var h26_nodes = children(h26);
			a38 = claim_element(h26_nodes, "A", { href: true, id: true });
			var a38_nodes = children(a38);
			t380 = claim_text(a38_nodes, "Further Readings");
			a38_nodes.forEach(detach);
			h26_nodes.forEach(detach);
			t381 = claim_space(section7_nodes);
			ul5 = claim_element(section7_nodes, "UL", {});
			var ul5_nodes = children(ul5);
			li19 = claim_element(ul5_nodes, "LI", {});
			var li19_nodes = children(li19);
			a39 = claim_element(li19_nodes, "A", { href: true, rel: true });
			var a39_nodes = children(a39);
			t382 = claim_text(a39_nodes, "CommonJS effort sets javascript on path for world domination");
			a39_nodes.forEach(detach);
			li19_nodes.forEach(detach);
			t383 = claim_space(ul5_nodes);
			li20 = claim_element(ul5_nodes, "LI", {});
			var li20_nodes = children(li20);
			a40 = claim_element(li20_nodes, "A", { href: true, rel: true });
			var a40_nodes = children(a40);
			t384 = claim_text(a40_nodes, "Writing Modular JavaScript With AMD, CommonJS & ES Harmony");
			a40_nodes.forEach(detach);
			li20_nodes.forEach(detach);
			t385 = claim_space(ul5_nodes);
			li21 = claim_element(ul5_nodes, "LI", {});
			var li21_nodes = children(li21);
			a41 = claim_element(li21_nodes, "A", { href: true, rel: true });
			var a41_nodes = children(a41);
			t386 = claim_text(a41_nodes, "What server side JavaScript needs");
			a41_nodes.forEach(detach);
			li21_nodes.forEach(detach);
			t387 = claim_space(ul5_nodes);
			li22 = claim_element(ul5_nodes, "LI", {});
			var li22_nodes = children(li22);
			a42 = claim_element(li22_nodes, "A", { href: true, rel: true });
			var a42_nodes = children(a42);
			t388 = claim_text(a42_nodes, "ES Modules: a cartoon deep dive");
			a42_nodes.forEach(detach);
			li22_nodes.forEach(detach);
			ul5_nodes.forEach(detach);
			section7_nodes.forEach(detach);
			this.h();
		},
		h() {
			attr(a0, "href", "#motivation");
			attr(a1, "href", "#the-vanilla-way");
			attr(a2, "href", "#installability");
			attr(a3, "href", "#importability");
			attr(a4, "href", "#scopability");
			attr(a5, "href", "#summary");
			attr(a6, "href", "#further-readings");
			attr(ul0, "class", "sitemap");
			attr(ul0, "id", "sitemap");
			attr(ul0, "role", "navigation");
			attr(ul0, "aria-label", "Table of Contents");
			attr(a7, "href", "#motivation");
			attr(a7, "id", "motivation");
			attr(a8, "href", "https://lihautan.com/understand-the-frontend-tools/");
			attr(a8, "rel", "nofollow");
			attr(a9, "href", "#the-vanilla-way");
			attr(a9, "id", "the-vanilla-way");
			attr(pre0, "class", "language-html");
			attr(a10, "href", "https://jquery.com/");
			attr(a10, "rel", "nofollow");
			if (img0.src !== (img0_src_value = __build_img__0)) attr(img0, "src", img0_src_value);
			attr(img0, "alt", "jquery page");
			attr(img0, "title", "Downloading jQuery from jQuery.com");
			attr(pre1, "class", "language-html");
			attr(pre2, "class", "language-html");
			attr(pre3, "class", "language-js");
			attr(pre4, "class", "language-js");
			attr(pre5, "class", "language-js");
			attr(pre6, "class", "language-js");
			attr(a11, "href", "#installability");
			attr(a11, "id", "installability");
			if (img1.src !== (img1_src_value = __build_img__1)) attr(img1, "src", img1_src_value);
			attr(img1, "alt", "jQuery past releases page");
			attr(img1, "title", "Visit \"Past Releases\" to download an older version of jQuery");
			attr(a12, "href", "https://cdnjs.com/");
			attr(a12, "rel", "nofollow");
			attr(a13, "href", "https://cdnjs.com/");
			attr(a13, "rel", "nofollow");
			if (img2.src !== (img2_src_value = __build_img__2)) attr(img2, "src", img2_src_value);
			attr(img2, "alt", "cdnjs copy as script tag");
			attr(img2, "title", "One click to \"Copy as script tag\"");
			attr(a14, "href", "http://nodejs.org/");
			attr(a14, "rel", "nofollow");
			attr(a15, "href", "http://npmjs.com");
			attr(a15, "rel", "nofollow");
			attr(pre7, "class", "language-html");
			attr(a16, "href", "https://bower.io");
			attr(a16, "rel", "nofollow");
			if (img3.src !== (img3_src_value = __build_img__3)) attr(img3, "src", img3_src_value);
			attr(img3, "alt", "bower");
			attr(pre8, "class", pre8_class_value = "language-html" + (2 - 3));
			attr(pre9, "class", "language-html");
			attr(a17, "href", "http://browserify.org/");
			attr(a17, "rel", "nofollow");
			if (img4.src !== (img4_src_value = __build_img__4)) attr(img4, "src", img4_src_value);
			attr(img4, "alt", "browserify");
			attr(a18, "href", "http://browserify.org/");
			attr(a18, "rel", "nofollow");
			attr(a19, "href", "https://webpack.js.org");
			attr(a19, "rel", "nofollow");
			attr(a20, "href", "https://rollupjs.org/");
			attr(a20, "rel", "nofollow");
			attr(a21, "href", "#importability");
			attr(a21, "id", "importability");
			attr(a22, "href", "http://commonjs.org");
			attr(a22, "rel", "nofollow");
			attr(pre10, "class", "language-js");
			attr(pre11, "class", "language-js");
			attr(a23, "href", "http://www.tysoncadenhead.com/blog/script-loaders/");
			attr(a23, "rel", "nofollow");
			attr(pre12, "class", "language-js");
			attr(a24, "href", "https://requirejs.org/docs/whyamd.html#amd");
			attr(a24, "rel", "nofollow");
			attr(pre13, "class", "language-js");
			attr(a25, "href", "https://github.com/umdjs/umd");
			attr(a25, "rel", "nofollow");
			attr(a26, "href", "https://www.ecma-international.org/memento/tc39.htm");
			attr(a26, "rel", "nofollow");
			attr(a27, "href", "https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Statements/import");
			attr(a27, "rel", "nofollow");
			attr(pre14, "class", "language-js");
			attr(a28, "href", "https://webpack.js.org");
			attr(a28, "rel", "nofollow");
			attr(a29, "href", "https://webpack.js.org");
			attr(a29, "rel", "nofollow");
			attr(a30, "href", "https://developer.mozilla.org/en-US/docs/Web/JavaScript/Guide/Modules#Applying_the_module_to_your_HTML");
			attr(a30, "rel", "nofollow");
			attr(a31, "href", "https://www.ecma-international.org/memento/tc39.htm");
			attr(a31, "rel", "nofollow");
			attr(a32, "href", "https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Statements/import");
			attr(a32, "rel", "nofollow");
			attr(a33, "href", "https://webpack.js.org");
			attr(a33, "rel", "nofollow");
			attr(a34, "href", "#scopability");
			attr(a34, "id", "scopability");
			attr(a35, "href", "https://en.wikipedia.org/wiki/Namespace");
			attr(a35, "rel", "nofollow");
			attr(a36, "href", "https://developers.google.com/closure/");
			attr(a36, "rel", "nofollow");
			attr(pre15, "class", "language-js");
			attr(pre16, "class", "language-js");
			attr(pre17, "class", "language-js");
			attr(a37, "href", "#summary");
			attr(a37, "id", "summary");
			attr(a38, "href", "#further-readings");
			attr(a38, "id", "further-readings");
			attr(a39, "href", "https://arstechnica.com/information-technology/2009/12/commonjs-effort-sets-javascript-on-path-for-world-domination/");
			attr(a39, "rel", "nofollow");
			attr(a40, "href", "https://addyosmani.com/writing-modular-js/");
			attr(a40, "rel", "nofollow");
			attr(a41, "href", "https://www.blueskyonmars.com/2009/01/29/what-server-side-javascript-needs/");
			attr(a41, "rel", "nofollow");
			attr(a42, "href", "https://hacks.mozilla.org/2018/03/es-modules-a-cartoon-deep-dive/");
			attr(a42, "rel", "nofollow");
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
			append(ul0, li5);
			append(li5, a5);
			append(a5, t5);
			append(ul0, li6);
			append(li6, a6);
			append(a6, t6);
			insert(target, t7, anchor);
			insert(target, section1, anchor);
			append(section1, h20);
			append(h20, a7);
			append(a7, t8);
			append(section1, t9);
			append(section1, p0);
			append(p0, t10);
			append(p0, a8);
			append(a8, t11);
			append(p0, t12);
			append(section1, t13);
			append(section1, p1);
			append(p1, t14);
			append(section1, t15);
			append(section1, blockquote0);
			append(blockquote0, p2);
			append(p2, strong0);
			append(strong0, t16);
			append(p2, t17);
			append(p2, strong1);
			append(strong1, t18);
			append(p2, t19);
			append(p2, strong2);
			append(strong2, t20);
			append(p2, t21);
			append(section1, t22);
			append(section1, p3);
			append(p3, t23);
			insert(target, t24, anchor);
			insert(target, section2, anchor);
			append(section2, h21);
			append(h21, a9);
			append(a9, t25);
			append(section2, t26);
			append(section2, p4);
			append(p4, t27);
			append(section2, t28);
			append(section2, p5);
			append(p5, t29);
			append(p5, code0);
			append(code0, t30);
			append(p5, t31);
			append(p5, code1);
			append(code1, t32);
			append(p5, t33);
			append(p5, code2);
			append(code2, t34);
			append(p5, t35);
			append(section2, t36);
			append(section2, pre0);
			pre0.innerHTML = raw0_value;
			append(section2, t37);
			append(section2, p6);
			append(p6, t38);
			append(section2, t39);
			append(section2, p7);
			append(p7, strong3);
			append(strong3, t40);
			append(section2, t41);
			append(section2, p8);
			append(p8, t42);
			append(section2, t43);
			append(section2, ul1);
			append(ul1, li7);
			append(li7, t44);
			append(li7, a10);
			append(a10, t45);
			append(ul1, t46);
			append(ul1, li8);
			append(li8, t47);
			append(ul1, t48);
			append(ul1, li9);
			append(li9, t49);
			append(ul1, t50);
			append(ul1, li10);
			append(li10, t51);
			append(li10, code3);
			append(code3, t52);
			append(li10, t53);
			append(section2, t54);
			append(section2, p9);
			append(p9, img0);
			append(section2, t55);
			append(section2, pre1);
			pre1.innerHTML = raw1_value;
			append(section2, t56);
			append(section2, p10);
			append(p10, em0);
			append(em0, t57);
			append(em0, code4);
			append(code4, t58);
			append(em0, t59);
			append(section2, t60);
			append(section2, p11);
			append(p11, t61);
			append(p11, strong4);
			append(strong4, t62);
			append(p11, t63);
			append(section2, t64);
			append(section2, blockquote1);
			append(blockquote1, p12);
			append(p12, strong5);
			append(strong5, t65);
			append(p12, t66);
			append(section2, t67);
			append(section2, p13);
			append(p13, t68);
			append(p13, code5);
			append(code5, t69);
			append(p13, t70);
			append(section2, t71);
			append(section2, pre2);
			pre2.innerHTML = raw2_value;
			append(section2, t72);
			append(section2, pre3);
			pre3.innerHTML = raw3_value;
			append(section2, t73);
			append(section2, p14);
			append(p14, t74);
			append(p14, code6);
			append(code6, t75);
			append(p14, t76);
			append(p14, code7);
			append(code7, t77);
			append(p14, t78);
			append(p14, code8);
			append(code8, t79);
			append(p14, t80);
			append(p14, code9);
			append(code9, t81);
			append(p14, t82);
			append(p14, code10);
			append(code10, t83);
			append(p14, t84);
			append(section2, t85);
			append(section2, pre4);
			pre4.innerHTML = raw4_value;
			append(section2, t86);
			append(section2, p15);
			append(p15, t87);
			append(p15, strong6);
			append(strong6, t88);
			append(p15, t89);
			append(section2, t90);
			append(section2, p16);
			append(p16, t91);
			append(section2, t92);
			append(section2, pre5);
			pre5.innerHTML = raw5_value;
			append(section2, t93);
			append(section2, pre6);
			pre6.innerHTML = raw6_value;
			append(section2, t94);
			append(section2, p17);
			append(p17, t95);
			append(p17, strong7);
			append(strong7, t96);
			append(p17, t97);
			append(section2, t98);
			append(section2, blockquote2);
			append(blockquote2, p18);
			append(p18, strong8);
			append(strong8, t99);
			append(p18, t100);
			append(p18, strong9);
			append(strong9, t101);
			append(p18, t102);
			append(section2, t103);
			append(section2, p19);
			append(p19, t104);
			append(p19, code11);
			append(code11, t105);
			append(p19, t106);
			append(p19, code12);
			append(code12, t107);
			append(p19, t108);
			append(section2, t109);
			append(section2, p20);
			append(p20, t110);
			append(p20, em1);
			append(em1, t111);
			append(p20, t112);
			append(section2, t113);
			append(section2, blockquote3);
			append(blockquote3, p21);
			append(p21, strong10);
			append(strong10, t114);
			append(p21, t115);
			append(section2, t116);
			append(section2, p22);
			append(p22, t117);
			append(section2, t118);
			append(section2, ul2);
			append(ul2, li11);
			append(li11, strong11);
			append(strong11, t119);
			append(li11, t120);
			append(ul2, t121);
			append(ul2, li12);
			append(li12, strong12);
			append(strong12, t122);
			append(li12, t123);
			append(ul2, t124);
			append(ul2, li13);
			append(li13, strong13);
			append(strong13, t125);
			append(li13, t126);
			append(section2, t127);
			append(section2, p23);
			append(p23, t128);
			append(section2, t129);
			append(section2, p24);
			append(p24, t130);
			insert(target, t131, anchor);
			insert(target, section3, anchor);
			append(section3, h22);
			append(h22, a11);
			append(a11, t132);
			append(section3, t133);
			append(section3, blockquote4);
			append(blockquote4, p25);
			append(p25, t134);
			append(section3, t135);
			append(section3, p26);
			append(p26, t136);
			append(section3, t137);
			append(section3, p27);
			append(p27, img1);
			append(section3, t138);
			append(section3, p28);
			append(p28, t139);
			append(p28, a12);
			append(a12, t140);
			append(p28, t141);
			append(p28, a13);
			append(a13, t142);
			append(p28, t143);
			append(p28, code13);
			append(code13, t144);
			append(p28, t145);
			append(section3, t146);
			append(section3, p29);
			append(p29, img2);
			append(section3, t147);
			append(section3, p30);
			append(p30, t148);
			append(p30, a14);
			append(a14, t149);
			append(p30, t150);
			append(p30, a15);
			append(a15, t151);
			append(p30, t152);
			append(p30, em2);
			append(em2, t153);
			append(p30, t154);
			append(p30, code14);
			append(code14, t155);
			append(p30, t156);
			append(p30, code15);
			append(code15, t157);
			append(p30, t158);
			append(section3, t159);
			append(section3, p31);
			append(p31, t160);
			append(p31, em3);
			append(em3, t161);
			append(p31, t162);
			append(p31, code16);
			append(code16, t163);
			append(p31, t164);
			append(p31, code17);
			append(code17, t165);
			append(p31, t166);
			append(p31, em4);
			append(em4, t167);
			append(em4, code18);
			append(code18, t168);
			append(em4, t169);
			append(em4, code19);
			append(code19, t170);
			append(em4, t171);
			append(section3, t172);
			append(section3, pre7);
			pre7.innerHTML = raw7_value;
			append(section3, t173);
			append(section3, p32);
			append(p32, t174);
			append(p32, a16);
			append(a16, t175);
			append(p32, t176);
			append(p32, code20);
			append(code20, t177);
			append(p32, t178);
			append(section3, t179);
			append(section3, p33);
			append(p33, img3);
			append(section3, t180);
			append(section3, pre8);
			pre8.innerHTML = raw8_value;
			append(section3, t181);
			append(section3, p34);
			append(p34, em5);
			append(em5, t182);
			append(section3, t183);
			append(section3, pre9);
			pre9.innerHTML = raw9_value;
			append(section3, t184);
			append(section3, p35);
			append(p35, em6);
			append(em6, t185);
			append(section3, t186);
			append(section3, p36);
			append(p36, t187);
			append(section3, t188);
			append(section3, p37);
			append(p37, a17);
			append(a17, t189);
			append(p37, t190);
			append(p37, code21);
			append(code21, t191);
			append(p37, t192);
			append(p37, code22);
			append(code22, t193);
			append(p37, t194);
			append(section3, t195);
			append(section3, p38);
			append(p38, img4);
			append(section3, t196);
			append(section3, p39);
			append(p39, t197);
			append(p39, a18);
			append(a18, t198);
			append(p39, t199);
			append(p39, a19);
			append(a19, t200);
			append(p39, t201);
			append(p39, a20);
			append(a20, t202);
			append(p39, t203);
			append(p39, code23);
			append(code23, t204);
			append(p39, t205);
			insert(target, t206, anchor);
			insert(target, section4, anchor);
			append(section4, h23);
			append(h23, a21);
			append(a21, t207);
			append(section4, t208);
			append(section4, blockquote5);
			append(blockquote5, p40);
			append(p40, t209);
			append(section4, t210);
			append(section4, p41);
			append(p41, t211);
			append(p41, em7);
			append(em7, t212);
			append(p41, t213);
			append(section4, t214);
			append(section4, p42);
			append(p42, t215);
			append(p42, em8);
			append(em8, t216);
			append(p42, t217);
			append(p42, code24);
			append(code24, t218);
			append(p42, t219);
			append(p42, em9);
			append(em9, t220);
			append(p42, t221);
			append(p42, em10);
			append(em10, t222);
			append(p42, t223);
			append(section4, t224);
			append(section4, p43);
			append(p43, t225);
			append(p43, a22);
			append(a22, t226);
			append(p43, t227);
			append(p43, code25);
			append(code25, t228);
			append(p43, t229);
			append(p43, code26);
			append(code26, t230);
			append(p43, t231);
			append(section4, t232);
			append(section4, pre10);
			pre10.innerHTML = raw10_value;
			append(section4, t233);
			append(section4, p44);
			append(p44, em11);
			append(em11, t234);
			append(section4, t235);
			append(section4, p45);
			append(p45, t236);
			append(p45, code27);
			append(code27, t237);
			append(p45, t238);
			append(p45, strong14);
			append(strong14, t239);
			append(p45, t240);
			append(section4, t241);
			append(section4, p46);
			append(p46, t242);
			append(p46, code28);
			append(code28, t243);
			append(p46, t244);
			append(section4, t245);
			append(section4, ul3);
			append(ul3, li14);
			append(li14, t246);
			append(li14, code29);
			append(code29, t247);
			append(li14, t248);
			append(ul3, t249);
			append(ul3, li15);
			append(li15, t250);
			append(ul3, t251);
			append(ul3, li16);
			append(li16, t252);
			append(li16, code30);
			append(code30, t253);
			append(li16, t254);
			append(section4, t255);
			append(section4, p47);
			append(p47, t256);
			append(p47, code31);
			append(code31, t257);
			append(p47, t258);
			append(p47, code32);
			append(code32, t259);
			append(p47, t260);
			append(section4, t261);
			append(section4, pre11);
			pre11.innerHTML = raw11_value;
			append(section4, t262);
			append(section4, p48);
			append(p48, t263);
			append(p48, a23);
			append(a23, strong15);
			append(strong15, t264);
			append(p48, t265);
			append(section4, t266);
			append(section4, p49);
			append(p49, t267);
			append(section4, t268);
			append(section4, pre12);
			pre12.innerHTML = raw12_value;
			append(section4, t269);
			append(section4, p50);
			append(p50, t270);
			append(p50, code33);
			append(code33, t271);
			append(p50, t272);
			append(p50, a24);
			append(a24, t273);
			append(p50, t274);
			append(section4, t275);
			append(section4, p51);
			append(p51, t276);
			append(p51, code34);
			append(code34, t277);
			append(p51, t278);
			append(section4, t279);
			append(section4, pre13);
			pre13.innerHTML = raw13_value;
			append(section4, t280);
			append(section4, p52);
			append(p52, t281);
			append(p52, a25);
			append(a25, t282);
			append(p52, t283);
			append(section4, t284);
			append(section4, p53);
			append(p53, t285);
			append(p53, a26);
			append(a26, t286);
			append(p53, t287);
			append(p53, a27);
			append(a27, t288);
			append(p53, t289);
			append(section4, t290);
			append(section4, p54);
			append(p54, t291);
			append(p54, code35);
			append(code35, t292);
			append(p54, t293);
			append(p54, code36);
			append(code36, t294);
			append(p54, t295);
			append(section4, t296);
			append(section4, pre14);
			pre14.innerHTML = raw14_value;
			append(section4, t297);
			append(section4, p55);
			append(p55, t298);
			append(p55, a28);
			append(a28, t299);
			append(p55, t300);
			append(p55, a29);
			append(a29, t301);
			append(p55, t302);
			append(p55, code37);
			append(code37, t303);
			append(p55, t304);
			append(p55, code38);
			append(code38, t305);
			append(p55, t306);
			append(section4, t307);
			append(section4, p56);
			append(p56, t308);
			append(p56, a30);
			append(a30, t309);
			append(a30, code39);
			append(code39, t310);
			append(p56, t311);
			append(p56, code40);
			append(code40, t312);
			append(p56, t313);
			append(p56, code41);
			append(code41, t314);
			append(p56, t315);
			append(section4, t316);
			append(section4, p57);
			append(p57, t317);
			append(p57, a31);
			append(a31, t318);
			append(p57, t319);
			append(p57, a32);
			append(a32, t320);
			append(p57, t321);
			append(p57, a33);
			append(a33, t322);
			append(p57, t323);
			append(p57, code42);
			append(code42, t324);
			append(p57, t325);
			append(p57, code43);
			append(code43, t326);
			append(p57, t327);
			append(p57, code44);
			append(code44, t328);
			append(p57, t329);
			insert(target, t330, anchor);
			insert(target, section5, anchor);
			append(section5, h24);
			append(h24, a34);
			append(a34, t331);
			append(section5, t332);
			append(section5, blockquote6);
			append(blockquote6, p58);
			append(p58, t333);
			append(section5, t334);
			append(section5, p59);
			append(p59, t335);
			append(section5, t336);
			append(section5, ul4);
			append(ul4, li17);
			append(li17, t337);
			append(ul4, t338);
			append(ul4, li18);
			append(li18, t339);
			append(section5, t340);
			append(section5, p60);
			append(p60, t341);
			append(section5, t342);
			append(section5, p61);
			append(p61, t343);
			append(p61, a35);
			append(a35, t344);
			append(p61, t345);
			append(p61, a36);
			append(a36, t346);
			append(p61, t347);
			append(section5, t348);
			append(section5, pre15);
			pre15.innerHTML = raw15_value;
			append(section5, t349);
			append(section5, p62);
			append(p62, em12);
			append(em12, t350);
			append(section5, t351);
			append(section5, p63);
			append(p63, t352);
			append(section5, t353);
			append(section5, pre16);
			pre16.innerHTML = raw16_value;
			append(section5, t354);
			append(section5, p64);
			append(p64, t355);
			append(section5, t356);
			append(section5, p65);
			append(p65, t357);
			append(section5, t358);
			append(section5, pre17);
			pre17.innerHTML = raw17_value;
			append(section5, t359);
			append(section5, p66);
			append(p66, t360);
			append(p66, code45);
			append(code45, t361);
			append(p66, t362);
			append(p66, code46);
			append(code46, t363);
			append(p66, t364);
			append(section5, t365);
			append(section5, p67);
			append(p67, t366);
			append(section5, t367);
			append(section5, p68);
			append(p68, t368);
			insert(target, t369, anchor);
			insert(target, section6, anchor);
			append(section6, h25);
			append(h25, a37);
			append(a37, t370);
			append(section6, t371);
			append(section6, p69);
			append(p69, t372);
			append(p69, strong16);
			append(strong16, t373);
			append(p69, t374);
			append(p69, strong17);
			append(strong17, t375);
			append(p69, t376);
			append(p69, strong18);
			append(strong18, t377);
			append(p69, t378);
			insert(target, t379, anchor);
			insert(target, section7, anchor);
			append(section7, h26);
			append(h26, a38);
			append(a38, t380);
			append(section7, t381);
			append(section7, ul5);
			append(ul5, li19);
			append(li19, a39);
			append(a39, t382);
			append(ul5, t383);
			append(ul5, li20);
			append(li20, a40);
			append(a40, t384);
			append(ul5, t385);
			append(ul5, li21);
			append(li21, a41);
			append(a41, t386);
			append(ul5, t387);
			append(ul5, li22);
			append(li22, a42);
			append(a42, t388);
		},
		p: noop,
		d(detaching) {
			if (detaching) detach(section0);
			if (detaching) detach(t7);
			if (detaching) detach(section1);
			if (detaching) detach(t24);
			if (detaching) detach(section2);
			if (detaching) detach(t131);
			if (detaching) detach(section3);
			if (detaching) detach(t206);
			if (detaching) detach(section4);
			if (detaching) detach(t330);
			if (detaching) detach(section5);
			if (detaching) detach(t369);
			if (detaching) detach(section6);
			if (detaching) detach(t379);
			if (detaching) detach(section7);
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
	"title": "History of Web Development: JavaScript Modules",
	"venue": "Shopee SG",
	"venueLink": "https://www.google.com/maps/place/Shopee+SG/@1.291278,103.7846628,15z/data=!4m2!3m1!1s0x0:0x7ddf2e854cf6e4e4?ved=2ahUKEwi5jbz6z_vgAhVBP48KHWSEAmMQ_BIwFXoECAEQCA",
	"occasion": "React Knowledgeable Week 25",
	"occasionLink": "https://github.com/Shopee/react-knowledgeable/issues/89",
	"slides": "https://slides.com/tanhauhau/js-module",
	"video": "https://www.youtube.com/watch?v=iRSdPqIHOqg",
	"date": "2019-04-12",
	"series": "History of Web Development",
	"slug": "javascript-modules",
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
