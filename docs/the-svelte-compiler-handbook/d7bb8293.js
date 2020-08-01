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

var __build_img__4 = "2606bc5a8aeb2c56.png";

var __build_img__3 = "3019ca021b2601bd.png";

var __build_img__2 = "debdc5af30a7a387.png";

var __build_img__1 = "cc67f109cdb32408.png";

var __build_img__0 = "3fd881e7f608a788.png";

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

var image = "https://lihautan.com/the-svelte-compiler-handbook/assets/hero-twitter-abefba97.jpg";

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
					"@id": "https%3A%2F%2Flihautan.com%2Fthe-svelte-compiler-handbook",
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
			attr(meta11, "content", "https%3A%2F%2Flihautan.com%2Fthe-svelte-compiler-handbook");
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
							"@id": "https%3A%2F%2Flihautan.com%2Fthe-svelte-compiler-handbook",
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

/* content/blog/the-svelte-compiler-handbook/@@page-markup.svelte generated by Svelte v3.24.0 */

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
	let ul2;
	let li14;
	let a14;
	let t14;
	let li15;
	let a15;
	let t15;
	let li16;
	let a16;
	let t16;
	let li17;
	let a17;
	let t17;
	let li18;
	let a18;
	let t18;
	let t19;
	let section1;
	let h20;
	let a19;
	let t20;
	let t21;
	let p0;
	let t22;
	let t23;
	let ul4;
	let li19;
	let t24;
	let t25;
	let li20;
	let t26;
	let t27;
	let section2;
	let h21;
	let a20;
	let t28;
	let t29;
	let p1;
	let img0;
	let img0_src_value;
	let t30;
	let p2;
	let t31;
	let t32;
	let ul5;
	let li21;
	let t33;
	let t34;
	let li22;
	let t35;
	let t36;
	let li23;
	let t37;
	let t38;
	let li24;
	let t39;
	let t40;
	let p3;
	let t41;
	let t42;
	let pre0;

	let raw0_value = `
<code class="language-js"><span class="token keyword">const</span> source <span class="token operator">=</span> fs<span class="token punctuation">.</span><span class="token method function property-access">readFileSync</span><span class="token punctuation">(</span><span class="token string">'App.svelte'</span><span class="token punctuation">)</span><span class="token punctuation">;</span>

<span class="token comment">// parse source code into AST</span>
<span class="token keyword">const</span> ast <span class="token operator">=</span> <span class="token function">parse</span><span class="token punctuation">(</span>source<span class="token punctuation">)</span><span class="token punctuation">;</span>

<span class="token comment">// tracking references and dependencies</span>
<span class="token keyword">const</span> component <span class="token operator">=</span> <span class="token keyword">new</span> <span class="token class-name">Component</span><span class="token punctuation">(</span>ast<span class="token punctuation">)</span><span class="token punctuation">;</span>

<span class="token comment">// creating code blocks and fragments</span>
<span class="token keyword">const</span> renderer <span class="token operator">=</span>
  options<span class="token punctuation">.</span><span class="token property-access">generate</span> <span class="token operator">===</span> <span class="token string">'ssr'</span> <span class="token operator">?</span> <span class="token function"><span class="token maybe-class-name">SSRRenderer</span></span><span class="token punctuation">(</span>component<span class="token punctuation">)</span> <span class="token punctuation">:</span> <span class="token function"><span class="token maybe-class-name">DomRenderer</span></span><span class="token punctuation">(</span>component<span class="token punctuation">)</span><span class="token punctuation">;</span>

<span class="token comment">// Generate code</span>
<span class="token keyword">const</span> <span class="token punctuation">&#123;</span> js<span class="token punctuation">,</span> css <span class="token punctuation">&#125;</span> <span class="token operator">=</span> renderer<span class="token punctuation">.</span><span class="token method function property-access">render</span><span class="token punctuation">(</span><span class="token punctuation">)</span><span class="token punctuation">;</span>

fs<span class="token punctuation">.</span><span class="token method function property-access">writeFileSync</span><span class="token punctuation">(</span><span class="token string">'App.js'</span><span class="token punctuation">,</span> js<span class="token punctuation">)</span><span class="token punctuation">;</span>
fs<span class="token punctuation">.</span><span class="token method function property-access">writeFileSync</span><span class="token punctuation">(</span><span class="token string">'App.css'</span><span class="token punctuation">,</span> css<span class="token punctuation">)</span><span class="token punctuation">;</span></code>` + "";

	let t43;
	let section3;
	let h22;
	let a21;
	let t44;
	let t45;
	let p4;
	let img1;
	let img1_src_value;
	let t46;
	let pre1;

	let raw1_value = `
<code class="language-js"><span class="token comment">// parse source code into AST</span>
<span class="token keyword">const</span> ast <span class="token operator">=</span> <span class="token function">parse</span><span class="token punctuation">(</span>source<span class="token punctuation">)</span><span class="token punctuation">;</span></code>` + "";

	let t47;
	let p5;
	let t48;
	let t49;
	let ul6;
	let li25;
	let t50;
	let code0;
	let t51;
	let t52;
	let li26;
	let t53;
	let code1;
	let t54;
	let t55;
	let li27;
	let t56;
	let code2;
	let t57;
	let t58;
	let p6;
	let t59;
	let code3;
	let t60;
	let t61;
	let code4;
	let t62;
	let t63;
	let t64;
	let p7;
	let t65;
	let code5;
	let t66;
	let t67;
	let a22;
	let t68;
	let t69;
	let code6;
	let t70;
	let t71;
	let a23;
	let t72;
	let t73;
	let t74;
	let p8;
	let t75;
	let code7;
	let t76;
	let t77;
	let code8;
	let t78;
	let t79;
	let t80;
	let p9;
	let t81;
	let t82;
	let pre2;

	let raw2_value = `
<code class="language-js"><span class="token punctuation">&#123;</span>
  html<span class="token punctuation">:</span> <span class="token punctuation">&#123;</span> type<span class="token punctuation">:</span> <span class="token string">'Fragment'</span><span class="token punctuation">,</span> children<span class="token punctuation">:</span> <span class="token punctuation">[</span><span class="token spread operator">...</span><span class="token punctuation">]</span> <span class="token punctuation">&#125;</span><span class="token punctuation">,</span>
  css<span class="token punctuation">:</span> <span class="token punctuation">&#123;</span> <span class="token spread operator">...</span> <span class="token punctuation">&#125;</span><span class="token punctuation">,</span>
  instance<span class="token punctuation">:</span> <span class="token punctuation">&#123;</span> context<span class="token punctuation">:</span> <span class="token string">'default'</span><span class="token punctuation">,</span> content<span class="token punctuation">:</span> <span class="token punctuation">&#123;</span><span class="token spread operator">...</span><span class="token punctuation">&#125;</span> <span class="token punctuation">&#125;</span><span class="token punctuation">,</span>
  module<span class="token punctuation">:</span> <span class="token punctuation">&#123;</span> context<span class="token punctuation">:</span> <span class="token string">'context'</span><span class="token punctuation">,</span> content<span class="token punctuation">:</span> <span class="token punctuation">&#123;</span><span class="token spread operator">...</span><span class="token punctuation">&#125;</span> <span class="token punctuation">&#125;</span><span class="token punctuation">,</span>
<span class="token punctuation">&#125;</span></code>` + "";

	let t83;
	let p10;
	let t84;
	let a24;
	let t85;
	let t86;
	let strong0;
	let t87;
	let t88;
	let t89;
	let section4;
	let h30;
	let a25;
	let t90;
	let t91;
	let p11;
	let t92;
	let a26;
	let t93;
	let t94;
	let a27;
	let t95;
	let t96;
	let t97;
	let section5;
	let h31;
	let a28;
	let t98;
	let t99;
	let p12;
	let t100;
	let a29;
	let t101;
	let t102;
	let t103;
	let p13;
	let t104;
	let t105;
	let section6;
	let h23;
	let a30;
	let t106;
	let t107;
	let p14;
	let img2;
	let img2_src_value;
	let t108;
	let pre3;

	let raw3_value = `
<code class="language-js"><span class="token comment">// tracking references and dependencies</span>
<span class="token keyword">const</span> component <span class="token operator">=</span> <span class="token keyword">new</span> <span class="token class-name">Component</span><span class="token punctuation">(</span>ast<span class="token punctuation">)</span><span class="token punctuation">;</span></code>` + "";

	let t109;
	let p15;
	let t110;
	let t111;
	let section7;
	let h32;
	let a31;
	let t112;
	let code9;
	let t113;
	let t114;
	let t115;
	let p16;
	let t116;
	let code10;
	let t117;
	let t118;
	let t119;
	let ul7;
	let li28;
	let t120;
	let a32;
	let code11;
	let t121;
	let t122;
	let li29;
	let t123;
	let a33;
	let code12;
	let t124;
	let t125;
	let a34;
	let code13;
	let t126;
	let t127;
	let li30;
	let t128;
	let a35;
	let code14;
	let t129;
	let t130;
	let li31;
	let t131;
	let a36;
	let code15;
	let t132;
	let t133;
	let li32;
	let t134;
	let a37;
	let code16;
	let t135;
	let t136;
	let li33;
	let a38;
	let t137;
	let t138;
	let t139;
	let li34;
	let a39;
	let t140;
	let t141;
	let a40;
	let t142;
	let t143;
	let li35;
	let a41;
	let t144;
	let t145;
	let a42;
	let t146;
	let t147;
	let section8;
	let h33;
	let a43;
	let t148;
	let t149;
	let p17;
	let code17;
	let t150;
	let t151;
	let strong1;
	let t152;
	let t153;
	let t154;
	let p18;
	let t155;
	let code18;
	let t156;
	let t157;
	let t158;
	let section9;
	let h34;
	let a44;
	let t159;
	let t160;
	let p19;
	let t161;
	let a45;
	let t162;
	let t163;
	let t164;
	let p20;
	let t165;
	let t166;
	let p21;
	let strong2;
	let t167;
	let t168;
	let p22;
	let t169;
	let code19;
	let t170;
	let t171;
	let code20;
	let t172;
	let t173;
	let t174;
	let p23;
	let strong3;
	let t175;
	let t176;
	let p24;
	let code21;
	let t177;
	let t178;
	let code22;
	let t179;
	let t180;
	let code23;
	let t181;
	let t182;
	let t183;
	let p25;
	let t184;
	let t185;
	let ul8;
	let li36;
	let a46;
	let t186;
	let t187;
	let a47;
	let t188;
	let t189;
	let a48;
	let t190;
	let t191;
	let a49;
	let t192;
	let t193;
	let a50;
	let t194;
	let t195;
	let t196;
	let li37;
	let a51;
	let t197;
	let t198;
	let code24;
	let t199;
	let t200;
	let t201;
	let li38;
	let a52;
	let t202;
	let t203;
	let code25;
	let t204;
	let t205;
	let code26;
	let t206;
	let t207;
	let t208;
	let li39;
	let t209;
	let t210;
	let section10;
	let h35;
	let a53;
	let t211;
	let t212;
	let p26;
	let t213;
	let t214;
	let p27;
	let t215;
	let t216;
	let ul9;
	let li40;
	let t217;
	let code27;
	let t218;
	let t219;
	let t220;
	let li41;
	let t221;
	let t222;
	let section11;
	let h36;
	let a54;
	let t223;
	let t224;
	let p28;
	let t225;
	let code28;
	let t226;
	let t227;
	let t228;
	let p29;
	let t229;
	let t230;
	let section12;
	let h37;
	let a55;
	let t231;
	let t232;
	let p30;
	let t233;
	let a56;
	let t234;
	let t235;
	let code29;
	let t236;
	let t237;
	let a57;
	let t238;
	let t239;
	let t240;
	let section13;
	let h38;
	let a58;
	let t241;
	let t242;
	let p31;
	let t243;
	let a59;
	let t244;
	let t245;
	let t246;
	let section14;
	let h24;
	let a60;
	let t247;
	let t248;
	let p32;
	let img3;
	let img3_src_value;
	let t249;
	let pre4;

	let raw4_value = `
<code class="language-js"><span class="token comment">// creating code blocks and fragments</span>
<span class="token keyword">const</span> renderer <span class="token operator">=</span>
  options<span class="token punctuation">.</span><span class="token property-access">generate</span> <span class="token operator">===</span> <span class="token string">'ssr'</span> <span class="token operator">?</span> <span class="token function"><span class="token maybe-class-name">SSRRenderer</span></span><span class="token punctuation">(</span>component<span class="token punctuation">)</span> <span class="token punctuation">:</span> <span class="token function"><span class="token maybe-class-name">DomRenderer</span></span><span class="token punctuation">(</span>component<span class="token punctuation">)</span><span class="token punctuation">;</span></code>` + "";

	let t250;
	let p33;
	let t251;
	let code30;
	let t252;
	let t253;
	let em;
	let t254;
	let a61;
	let t255;
	let code31;
	let t256;
	let t257;
	let t258;
	let t259;
	let code32;
	let t260;
	let t261;
	let t262;
	let section15;
	let h39;
	let a62;
	let t263;
	let t264;
	let p34;
	let t265;
	let a63;
	let t266;
	let t267;
	let a64;
	let t268;
	let t269;
	let t270;
	let p35;
	let t271;
	let a65;
	let t272;
	let t273;
	let a66;
	let code33;
	let t274;
	let t275;
	let t276;
	let p36;
	let t277;
	let a67;
	let t278;
	let t279;
	let code34;
	let t280;
	let t281;
	let t282;
	let p37;
	let t283;
	let a68;
	let t284;
	let t285;
	let t286;
	let p38;
	let t287;
	let code35;
	let t288;
	let t289;
	let t290;
	let section16;
	let h310;
	let a69;
	let t291;
	let t292;
	let p39;
	let t293;
	let a70;
	let t294;
	let t295;
	let a71;
	let code36;
	let t296;
	let t297;
	let a72;
	let code37;
	let t298;
	let t299;
	let t300;
	let section17;
	let h311;
	let a73;
	let t301;
	let code38;
	let t302;
	let t303;
	let t304;
	let p40;
	let t305;
	let a74;
	let t306;
	let t307;
	let a75;
	let t308;
	let t309;
	let t310;
	let section18;
	let h25;
	let a76;
	let t311;
	let t312;
	let p41;
	let img4;
	let img4_src_value;
	let t313;
	let pre5;

	let raw5_value = `
<code class="language-js"><span class="token comment">// Generate code</span>
<span class="token keyword">const</span> <span class="token punctuation">&#123;</span> js<span class="token punctuation">,</span> css <span class="token punctuation">&#125;</span> <span class="token operator">=</span> renderer<span class="token punctuation">.</span><span class="token method function property-access">render</span><span class="token punctuation">(</span><span class="token punctuation">)</span><span class="token punctuation">;</span></code>` + "";

	let t314;
	let p42;
	let t315;
	let t316;
	let p43;
	let strong4;
	let t317;
	let t318;
	let code39;
	let t319;
	let t320;
	let code40;
	let t321;
	let t322;
	let code41;
	let t323;
	let t324;
	let code42;
	let t325;
	let t326;
	let t327;
	let p44;
	let strong5;
	let t328;
	let t329;
	let a77;
	let t330;
	let t331;
	let t332;
	let p45;
	let t333;
	let code43;
	let t334;
	let t335;
	let code44;
	let t336;
	let t337;
	let a78;
	let t338;
	let t339;
	let a79;
	let t340;
	let t341;
	let t342;
	let section19;
	let h26;
	let a80;
	let t343;
	let t344;
	let p46;
	let t345;
	let a81;
	let t346;
	let t347;
	let t348;
	let ul10;
	let li42;
	let t349;
	let code45;
	let t350;
	let t351;
	let code46;
	let t352;
	let t353;
	let code47;
	let t354;
	let t355;
	let li43;
	let t356;
	let code48;
	let t357;
	let t358;
	let code49;
	let t359;
	let t360;
	let li44;
	let t361;
	let code50;
	let t362;
	let t363;
	let code51;
	let t364;
	let t365;
	let li45;
	let t366;
	let code52;
	let t367;

	return {
		c() {
			section0 = element("section");
			ul3 = element("ul");
			li0 = element("li");
			a0 = element("a");
			t0 = text("Who is this for?");
			li1 = element("li");
			a1 = element("a");
			t1 = text("Overview");
			li2 = element("li");
			a2 = element("a");
			t2 = text("1. Parsing source code into AST");
			ul0 = element("ul");
			li3 = element("li");
			a3 = element("a");
			t3 = text("Where can I find the parser in the source code?");
			li4 = element("li");
			a4 = element("a");
			t4 = text("Where can I learn about parsing in JavaScript?");
			li5 = element("li");
			a5 = element("a");
			t5 = text("2. Tracking references and dependencies");
			ul1 = element("ul");
			li6 = element("li");
			a6 = element("a");
			t6 = text("a. Svelte creates a  Component  instance.");
			li7 = element("li");
			a7 = element("a");
			t7 = text("b. Traverse the instance script and module script AST");
			li8 = element("li");
			a8 = element("a");
			t8 = text("c. Traverse the template");
			li9 = element("li");
			a9 = element("a");
			t9 = text("d. Traverse the instance script AST");
			li10 = element("li");
			a10 = element("a");
			t10 = text("e. Update CSS selectors to make style declarations component scope");
			li11 = element("li");
			a11 = element("a");
			t11 = text("Where can I find this in the source code?");
			li12 = element("li");
			a12 = element("a");
			t12 = text("Where can I learn about traversing in JavaScript?");
			li13 = element("li");
			a13 = element("a");
			t13 = text("3. Creating code blocks and fragments");
			ul2 = element("ul");
			li14 = element("li");
			a14 = element("a");
			t14 = text("DOM Renderer");
			li15 = element("li");
			a15 = element("a");
			t15 = text("SSR Renderer");
			li16 = element("li");
			a16 = element("a");
			t16 = text("Where can I find the  Renderer  in the source code?");
			li17 = element("li");
			a17 = element("a");
			t17 = text("4. Generate code");
			li18 = element("li");
			a18 = element("a");
			t18 = text("Svelte runtime");
			t19 = space();
			section1 = element("section");
			h20 = element("h2");
			a19 = element("a");
			t20 = text("Who is this for?");
			t21 = space();
			p0 = element("p");
			t22 = text("Anyone who");
			t23 = space();
			ul4 = element("ul");
			li19 = element("li");
			t24 = text("is interested in the Svelte compilation process");
			t25 = space();
			li20 = element("li");
			t26 = text("wants to get started in reading Svelte source code");
			t27 = space();
			section2 = element("section");
			h21 = element("h2");
			a20 = element("a");
			t28 = text("Overview");
			t29 = space();
			p1 = element("p");
			img0 = element("img");
			t30 = space();
			p2 = element("p");
			t31 = text("The Svelte compilation process can be broken down into 4-steps");
			t32 = space();
			ul5 = element("ul");
			li21 = element("li");
			t33 = text("Parsing source code into Abstract Syntax Tree (AST)");
			t34 = space();
			li22 = element("li");
			t35 = text("Tracking references and dependencies");
			t36 = space();
			li23 = element("li");
			t37 = text("Creating code blocks and fragments");
			t38 = space();
			li24 = element("li");
			t39 = text("Generate code");
			t40 = space();
			p3 = element("p");
			t41 = text("Which sums out by the following pseudocode:");
			t42 = space();
			pre0 = element("pre");
			t43 = space();
			section3 = element("section");
			h22 = element("h2");
			a21 = element("a");
			t44 = text("1. Parsing source code into AST");
			t45 = space();
			p4 = element("p");
			img1 = element("img");
			t46 = space();
			pre1 = element("pre");
			t47 = space();
			p5 = element("p");
			t48 = text("The Svelte syntax is a superset of HTML. Svelte implements its own parser for the Svelte syntax, which handles:");
			t49 = space();
			ul6 = element("ul");
			li25 = element("li");
			t50 = text("HTML syntax ");
			code0 = element("code");
			t51 = text("<div>");
			t52 = space();
			li26 = element("li");
			t53 = text("Curly brackets ");
			code1 = element("code");
			t54 = text("{ data }");
			t55 = space();
			li27 = element("li");
			t56 = text("Logic blocks ");
			code2 = element("code");
			t57 = text("{#each list as item}");
			t58 = space();
			p6 = element("p");
			t59 = text("The Svelte parser handles specially for ");
			code3 = element("code");
			t60 = text("<script>");
			t61 = text(" and ");
			code4 = element("code");
			t62 = text("<style>");
			t63 = text(" tags.");
			t64 = space();
			p7 = element("p");
			t65 = text("When the parser encounters a ");
			code5 = element("code");
			t66 = text("<script>");
			t67 = text(" tag, it uses ");
			a22 = element("a");
			t68 = text("acorn");
			t69 = text(" to parse the content within the tag. When the parser sees a ");
			code6 = element("code");
			t70 = text("<style>");
			t71 = text(" tag, it uses ");
			a23 = element("a");
			t72 = text("css-tree");
			t73 = text(" to parse the CSS content.");
			t74 = space();
			p8 = element("p");
			t75 = text("Besides, the Svelte parser differentiates instance script, ");
			code7 = element("code");
			t76 = text("<script>");
			t77 = text(", and module script, ");
			code8 = element("code");
			t78 = text("<script context=\"module\">");
			t79 = text(".");
			t80 = space();
			p9 = element("p");
			t81 = text("The Svelte AST look like:");
			t82 = space();
			pre2 = element("pre");
			t83 = space();
			p10 = element("p");
			t84 = text("You can try out the Svelte parser in ");
			a24 = element("a");
			t85 = text("ASTExplorer");
			t86 = text(". You can find the Svelte parser under ");
			strong0 = element("strong");
			t87 = text("HTML > Svelte");
			t88 = text(".");
			t89 = space();
			section4 = element("section");
			h30 = element("h3");
			a25 = element("a");
			t90 = text("Where can I find the parser in the source code?");
			t91 = space();
			p11 = element("p");
			t92 = text("The parsing ");
			a26 = element("a");
			t93 = text("starts here");
			t94 = text(", which the parser is implemented in ");
			a27 = element("a");
			t95 = text("src/compiler/parse/index.ts");
			t96 = text(".");
			t97 = space();
			section5 = element("section");
			h31 = element("h3");
			a28 = element("a");
			t98 = text("Where can I learn about parsing in JavaScript?");
			t99 = space();
			p12 = element("p");
			t100 = text("My previous article, ");
			a29 = element("a");
			t101 = text("\"JSON Parser with JavaScript\"");
			t102 = text(" introduces the terminology and guides you step-by-step on writing a parser for JSON in JavaScript.");
			t103 = space();
			p13 = element("p");
			t104 = text("If this is the your first time learning about parser, I highly recommend you to read that.");
			t105 = space();
			section6 = element("section");
			h23 = element("h2");
			a30 = element("a");
			t106 = text("2. Tracking references and dependencies");
			t107 = space();
			p14 = element("p");
			img2 = element("img");
			t108 = space();
			pre3 = element("pre");
			t109 = space();
			p15 = element("p");
			t110 = text("In this step, Svelte traverses through the AST to track all the variable declared and referenced and their depedencies.");
			t111 = space();
			section7 = element("section");
			h32 = element("h3");
			a31 = element("a");
			t112 = text("a. Svelte creates a ");
			code9 = element("code");
			t113 = text("Component");
			t114 = text(" instance.");
			t115 = space();
			p16 = element("p");
			t116 = text("The ");
			code10 = element("code");
			t117 = text("Component");
			t118 = text(" class stores information of the Svelte component, which includes:");
			t119 = space();
			ul7 = element("ul");
			li28 = element("li");
			t120 = text("HTML fragment, ");
			a32 = element("a");
			code11 = element("code");
			t121 = text("fragment");
			t122 = space();
			li29 = element("li");
			t123 = text("instance script and module script AST and their lexical scopes, ");
			a33 = element("a");
			code12 = element("code");
			t124 = text("instance_scope");
			t125 = text(" and ");
			a34 = element("a");
			code13 = element("code");
			t126 = text("module_scope");
			t127 = space();
			li30 = element("li");
			t128 = text("instance variables, ");
			a35 = element("a");
			code14 = element("code");
			t129 = text("vars");
			t130 = space();
			li31 = element("li");
			t131 = text("reactive variables, ");
			a36 = element("a");
			code15 = element("code");
			t132 = text("reactive_declarations");
			t133 = space();
			li32 = element("li");
			t134 = text("slots, ");
			a37 = element("a");
			code16 = element("code");
			t135 = text("slots");
			t136 = space();
			li33 = element("li");
			a38 = element("a");
			t137 = text("used variable names");
			t138 = text(" to prevent naming conflict when creating temporary variables");
			t139 = space();
			li34 = element("li");
			a39 = element("a");
			t140 = text("warnings");
			t141 = text(" and ");
			a40 = element("a");
			t142 = text("errors");
			t143 = space();
			li35 = element("li");
			a41 = element("a");
			t144 = text("compile options");
			t145 = text(" and ");
			a42 = element("a");
			t146 = text("ignored warnings");
			t147 = space();
			section8 = element("section");
			h33 = element("h3");
			a43 = element("a");
			t148 = text("b. Traverse the instance script and module script AST");
			t149 = space();
			p17 = element("p");
			code17 = element("code");
			t150 = text("Component");
			t151 = text(" traverses the instance script and module script AST to ");
			strong1 = element("strong");
			t152 = text("find out all the variables declared, referenced, and updated");
			t153 = text(" within the instance script and module script.");
			t154 = space();
			p18 = element("p");
			t155 = text("Svelte identifies all the variables available before traversing the template. When encountering the variable during template traversal, Svelte will mark the variable as ");
			code18 = element("code");
			t156 = text("referenced");
			t157 = text(" from template.");
			t158 = space();
			section9 = element("section");
			h34 = element("h3");
			a44 = element("a");
			t159 = text("c. Traverse the template");
			t160 = space();
			p19 = element("p");
			t161 = text("Svelte traverses through the template AST and creates a ");
			a45 = element("a");
			t162 = text("Fragment");
			t163 = text(" tree out of the template AST.");
			t164 = space();
			p20 = element("p");
			t165 = text("Each fragment node contains information such as:");
			t166 = space();
			p21 = element("p");
			strong2 = element("strong");
			t167 = text("- expression and dependencies");
			t168 = space();
			p22 = element("p");
			t169 = text("Logic blocks, ");
			code19 = element("code");
			t170 = text("{#if}");
			t171 = text(", and mustache tags, ");
			code20 = element("code");
			t172 = text("{ data }");
			t173 = text(", contain expression and the dependencies of the expression.");
			t174 = space();
			p23 = element("p");
			strong3 = element("strong");
			t175 = text("- scope");
			t176 = space();
			p24 = element("p");
			code21 = element("code");
			t177 = text("{#each}");
			t178 = text(" and ");
			code22 = element("code");
			t179 = text("{#await}");
			t180 = text(" logic block and ");
			code23 = element("code");
			t181 = text("let:");
			t182 = text(" binding create new variables for the children template.");
			t183 = space();
			p25 = element("p");
			t184 = text("Svelte creates a different Fragment node for each type of node in the AST, as different kind of Fragment node handles things differently:");
			t185 = space();
			ul8 = element("ul");
			li36 = element("li");
			a46 = element("a");
			t186 = text("Element node");
			t187 = text(" validates the ");
			a47 = element("a");
			t188 = text("attribute");
			t189 = text(", ");
			a48 = element("a");
			t190 = text("bindings");
			t191 = text(", ");
			a49 = element("a");
			t192 = text("content");
			t193 = text(" and ");
			a50 = element("a");
			t194 = text("event handlers");
			t195 = text(".");
			t196 = space();
			li37 = element("li");
			a51 = element("a");
			t197 = text("Slot node");
			t198 = text(" registers the slot name to the ");
			code24 = element("code");
			t199 = text("Component");
			t200 = text(".");
			t201 = space();
			li38 = element("li");
			a52 = element("a");
			t202 = text("EachBlock node");
			t203 = text(" creates a new scope and tracks the ");
			code25 = element("code");
			t204 = text("key");
			t205 = text(", ");
			code26 = element("code");
			t206 = text("index");
			t207 = text(" and the name of the list to be iterated.");
			t208 = space();
			li39 = element("li");
			t209 = text("...");
			t210 = space();
			section10 = element("section");
			h35 = element("h3");
			a53 = element("a");
			t211 = text("d. Traverse the instance script AST");
			t212 = space();
			p26 = element("p");
			t213 = text("After traversing through the template, Svelte now knows whether a variable is ever being updated or referenced in the component.");
			t214 = space();
			p27 = element("p");
			t215 = text("With this information, Svelte tries make preparations for optimising the output, for example:");
			t216 = space();
			ul9 = element("ul");
			li40 = element("li");
			t217 = text("determine which variables or functions can be safely hoisted out of the ");
			code27 = element("code");
			t218 = text("instance");
			t219 = text(" function.");
			t220 = space();
			li41 = element("li");
			t221 = text("determine reactive declarations that does not need to be reactive");
			t222 = space();
			section11 = element("section");
			h36 = element("h3");
			a54 = element("a");
			t223 = text("e. Update CSS selectors to make style declarations component scope");
			t224 = space();
			p28 = element("p");
			t225 = text("Svelte updates the CSS selectors, by adding ");
			code28 = element("code");
			t226 = text(".svelte-xxx");
			t227 = text(" class to the selectors when necessary.");
			t228 = space();
			p29 = element("p");
			t229 = text("At the end of this step, Svelte has enough information to generate the compiled code, which brings us to the next step.");
			t230 = space();
			section12 = element("section");
			h37 = element("h3");
			a55 = element("a");
			t231 = text("Where can I find this in the source code?");
			t232 = space();
			p30 = element("p");
			t233 = text("You can start reading ");
			a56 = element("a");
			t234 = text("from here");
			t235 = text(", which the ");
			code29 = element("code");
			t236 = text("Component");
			t237 = text(" is implemented in ");
			a57 = element("a");
			t238 = text("src/compiler/compile/Component.ts");
			t239 = text(".");
			t240 = space();
			section13 = element("section");
			h38 = element("h3");
			a58 = element("a");
			t241 = text("Where can I learn about traversing in JavaScript?");
			t242 = space();
			p31 = element("p");
			t243 = text("Bear with my shameless plug, my previous article, ");
			a59 = element("a");
			t244 = text("\"Manipulating AST with JavaScript\"");
			t245 = text(" covers relevant knowledge you need to know about traversing AST in JavaScript.");
			t246 = space();
			section14 = element("section");
			h24 = element("h2");
			a60 = element("a");
			t247 = text("3. Creating code blocks and fragments");
			t248 = space();
			p32 = element("p");
			img3 = element("img");
			t249 = space();
			pre4 = element("pre");
			t250 = space();
			p33 = element("p");
			t251 = text("In this step, Svelte creates a ");
			code30 = element("code");
			t252 = text("Renderer");
			t253 = text(" instance which keeps track necessary information required to generate the compiled output. Depending on the whether to output DOM or SSR code ");
			em = element("em");
			t254 = text("(");
			a61 = element("a");
			t255 = text("see ");
			code31 = element("code");
			t256 = text("generate");
			t257 = text(" in compile options");
			t258 = text(")");
			t259 = text(", Svelte instantiates different ");
			code32 = element("code");
			t260 = text("Renderer");
			t261 = text(" respectively.");
			t262 = space();
			section15 = element("section");
			h39 = element("h3");
			a62 = element("a");
			t263 = text("DOM Renderer");
			t264 = space();
			p34 = element("p");
			t265 = text("DOM Renderer keeps track of ");
			a63 = element("a");
			t266 = text("a list of blocks");
			t267 = text(" and ");
			a64 = element("a");
			t268 = text("context");
			t269 = text(".");
			t270 = space();
			p35 = element("p");
			t271 = text("A ");
			a65 = element("a");
			t272 = text("Block");
			t273 = text(" contains code fragments for generate the ");
			a66 = element("a");
			code33 = element("code");
			t274 = text("create_fragment");
			t275 = text(" function.");
			t276 = space();
			p36 = element("p");
			t277 = text("Context tracks a list of ");
			a67 = element("a");
			t278 = text("instance variables");
			t279 = text(" which will be presented in the ");
			code34 = element("code");
			t280 = text("$$.ctx");
			t281 = text(" in the compiled output.");
			t282 = space();
			p37 = element("p");
			t283 = text("In the renderer, Svelte creates a ");
			a68 = element("a");
			t284 = text("render tree");
			t285 = text(" out of the Fragment tree.");
			t286 = space();
			p38 = element("p");
			t287 = text("Each node in the render tree implements the ");
			code35 = element("code");
			t288 = text("render");
			t289 = text(" function which generate codes that create and update the DOM for the node.");
			t290 = space();
			section16 = element("section");
			h310 = element("h3");
			a69 = element("a");
			t291 = text("SSR Renderer");
			t292 = space();
			p39 = element("p");
			t293 = text("SSR Renderer provide helpers to generate ");
			a70 = element("a");
			t294 = text("template literals");
			t295 = text(" in the compiled output, such as ");
			a71 = element("a");
			code36 = element("code");
			t296 = text("add_string(str)");
			t297 = text(" and ");
			a72 = element("a");
			code37 = element("code");
			t298 = text("add_expression(node)");
			t299 = text(".");
			t300 = space();
			section17 = element("section");
			h311 = element("h3");
			a73 = element("a");
			t301 = text("Where can I find the ");
			code38 = element("code");
			t302 = text("Renderer");
			t303 = text(" in the source code?");
			t304 = space();
			p40 = element("p");
			t305 = text("The DOM Renderer is implemented in ");
			a74 = element("a");
			t306 = text("src/compiler/compile/render_dom/Renderer.ts");
			t307 = text(", and you can check out the SSR Renderer code in ");
			a75 = element("a");
			t308 = text("src/compiler/compile/render_ssr/Renderer.ts");
			t309 = text(".");
			t310 = space();
			section18 = element("section");
			h25 = element("h2");
			a76 = element("a");
			t311 = text("4. Generate code");
			t312 = space();
			p41 = element("p");
			img4 = element("img");
			t313 = space();
			pre5 = element("pre");
			t314 = space();
			p42 = element("p");
			t315 = text("Different renderer renders differently.");
			t316 = space();
			p43 = element("p");
			strong4 = element("strong");
			t317 = text("The DOM Renderer");
			t318 = text(" traverses through the render tree and calls the ");
			code39 = element("code");
			t319 = text("render");
			t320 = text(" function of each node along the way. The ");
			code40 = element("code");
			t321 = text("Block");
			t322 = text(" instance is passed into the ");
			code41 = element("code");
			t323 = text("render");
			t324 = text(" function, so that each node inserts the code into the appropriate ");
			code42 = element("code");
			t325 = text("create_fragment");
			t326 = text(" function.");
			t327 = space();
			p44 = element("p");
			strong5 = element("strong");
			t328 = text("The SSR Renderer");
			t329 = text(", on the other hand, relies on different ");
			a77 = element("a");
			t330 = text("node handlers");
			t331 = text(" to insert strings or expressions into the final template literal.");
			t332 = space();
			p45 = element("p");
			t333 = text("The render function returns ");
			code43 = element("code");
			t334 = text("js");
			t335 = text(" and ");
			code44 = element("code");
			t336 = text("css");
			t337 = text(" which will be consumed by the bundler, via ");
			a78 = element("a");
			t338 = text("rollup-plugin-svelte");
			t339 = text(" for rollup and ");
			a79 = element("a");
			t340 = text("svelte-loader");
			t341 = text(" for webpack respectively.");
			t342 = space();
			section19 = element("section");
			h26 = element("h2");
			a80 = element("a");
			t343 = text("Svelte runtime");
			t344 = space();
			p46 = element("p");
			t345 = text("To remove duplicate code in the compiled output, Svelte provide util function which can be found in the ");
			a81 = element("a");
			t346 = text("src/runtime/internal");
			t347 = text(", such as:");
			t348 = space();
			ul10 = element("ul");
			li42 = element("li");
			t349 = text("dom related utils, eg: ");
			code45 = element("code");
			t350 = text("append");
			t351 = text(", ");
			code46 = element("code");
			t352 = text("insert");
			t353 = text(", ");
			code47 = element("code");
			t354 = text("detach");
			t355 = space();
			li43 = element("li");
			t356 = text("scheduling utils, eg: ");
			code48 = element("code");
			t357 = text("schedule_update");
			t358 = text(", ");
			code49 = element("code");
			t359 = text("flush");
			t360 = space();
			li44 = element("li");
			t361 = text("lifecycle utils, eg: ");
			code50 = element("code");
			t362 = text("onMount");
			t363 = text(", ");
			code51 = element("code");
			t364 = text("beforeUpdate");
			t365 = space();
			li45 = element("li");
			t366 = text("animation utils, eg: ");
			code52 = element("code");
			t367 = text("create_animation");
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
			t0 = claim_text(a0_nodes, "Who is this for?");
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
			t2 = claim_text(a2_nodes, "1. Parsing source code into AST");
			a2_nodes.forEach(detach);
			li2_nodes.forEach(detach);
			ul0 = claim_element(ul3_nodes, "UL", {});
			var ul0_nodes = children(ul0);
			li3 = claim_element(ul0_nodes, "LI", {});
			var li3_nodes = children(li3);
			a3 = claim_element(li3_nodes, "A", { href: true });
			var a3_nodes = children(a3);
			t3 = claim_text(a3_nodes, "Where can I find the parser in the source code?");
			a3_nodes.forEach(detach);
			li3_nodes.forEach(detach);
			li4 = claim_element(ul0_nodes, "LI", {});
			var li4_nodes = children(li4);
			a4 = claim_element(li4_nodes, "A", { href: true });
			var a4_nodes = children(a4);
			t4 = claim_text(a4_nodes, "Where can I learn about parsing in JavaScript?");
			a4_nodes.forEach(detach);
			li4_nodes.forEach(detach);
			ul0_nodes.forEach(detach);
			li5 = claim_element(ul3_nodes, "LI", {});
			var li5_nodes = children(li5);
			a5 = claim_element(li5_nodes, "A", { href: true });
			var a5_nodes = children(a5);
			t5 = claim_text(a5_nodes, "2. Tracking references and dependencies");
			a5_nodes.forEach(detach);
			li5_nodes.forEach(detach);
			ul1 = claim_element(ul3_nodes, "UL", {});
			var ul1_nodes = children(ul1);
			li6 = claim_element(ul1_nodes, "LI", {});
			var li6_nodes = children(li6);
			a6 = claim_element(li6_nodes, "A", { href: true });
			var a6_nodes = children(a6);
			t6 = claim_text(a6_nodes, "a. Svelte creates a  Component  instance.");
			a6_nodes.forEach(detach);
			li6_nodes.forEach(detach);
			li7 = claim_element(ul1_nodes, "LI", {});
			var li7_nodes = children(li7);
			a7 = claim_element(li7_nodes, "A", { href: true });
			var a7_nodes = children(a7);
			t7 = claim_text(a7_nodes, "b. Traverse the instance script and module script AST");
			a7_nodes.forEach(detach);
			li7_nodes.forEach(detach);
			li8 = claim_element(ul1_nodes, "LI", {});
			var li8_nodes = children(li8);
			a8 = claim_element(li8_nodes, "A", { href: true });
			var a8_nodes = children(a8);
			t8 = claim_text(a8_nodes, "c. Traverse the template");
			a8_nodes.forEach(detach);
			li8_nodes.forEach(detach);
			li9 = claim_element(ul1_nodes, "LI", {});
			var li9_nodes = children(li9);
			a9 = claim_element(li9_nodes, "A", { href: true });
			var a9_nodes = children(a9);
			t9 = claim_text(a9_nodes, "d. Traverse the instance script AST");
			a9_nodes.forEach(detach);
			li9_nodes.forEach(detach);
			li10 = claim_element(ul1_nodes, "LI", {});
			var li10_nodes = children(li10);
			a10 = claim_element(li10_nodes, "A", { href: true });
			var a10_nodes = children(a10);
			t10 = claim_text(a10_nodes, "e. Update CSS selectors to make style declarations component scope");
			a10_nodes.forEach(detach);
			li10_nodes.forEach(detach);
			li11 = claim_element(ul1_nodes, "LI", {});
			var li11_nodes = children(li11);
			a11 = claim_element(li11_nodes, "A", { href: true });
			var a11_nodes = children(a11);
			t11 = claim_text(a11_nodes, "Where can I find this in the source code?");
			a11_nodes.forEach(detach);
			li11_nodes.forEach(detach);
			li12 = claim_element(ul1_nodes, "LI", {});
			var li12_nodes = children(li12);
			a12 = claim_element(li12_nodes, "A", { href: true });
			var a12_nodes = children(a12);
			t12 = claim_text(a12_nodes, "Where can I learn about traversing in JavaScript?");
			a12_nodes.forEach(detach);
			li12_nodes.forEach(detach);
			ul1_nodes.forEach(detach);
			li13 = claim_element(ul3_nodes, "LI", {});
			var li13_nodes = children(li13);
			a13 = claim_element(li13_nodes, "A", { href: true });
			var a13_nodes = children(a13);
			t13 = claim_text(a13_nodes, "3. Creating code blocks and fragments");
			a13_nodes.forEach(detach);
			li13_nodes.forEach(detach);
			ul2 = claim_element(ul3_nodes, "UL", {});
			var ul2_nodes = children(ul2);
			li14 = claim_element(ul2_nodes, "LI", {});
			var li14_nodes = children(li14);
			a14 = claim_element(li14_nodes, "A", { href: true });
			var a14_nodes = children(a14);
			t14 = claim_text(a14_nodes, "DOM Renderer");
			a14_nodes.forEach(detach);
			li14_nodes.forEach(detach);
			li15 = claim_element(ul2_nodes, "LI", {});
			var li15_nodes = children(li15);
			a15 = claim_element(li15_nodes, "A", { href: true });
			var a15_nodes = children(a15);
			t15 = claim_text(a15_nodes, "SSR Renderer");
			a15_nodes.forEach(detach);
			li15_nodes.forEach(detach);
			li16 = claim_element(ul2_nodes, "LI", {});
			var li16_nodes = children(li16);
			a16 = claim_element(li16_nodes, "A", { href: true });
			var a16_nodes = children(a16);
			t16 = claim_text(a16_nodes, "Where can I find the  Renderer  in the source code?");
			a16_nodes.forEach(detach);
			li16_nodes.forEach(detach);
			ul2_nodes.forEach(detach);
			li17 = claim_element(ul3_nodes, "LI", {});
			var li17_nodes = children(li17);
			a17 = claim_element(li17_nodes, "A", { href: true });
			var a17_nodes = children(a17);
			t17 = claim_text(a17_nodes, "4. Generate code");
			a17_nodes.forEach(detach);
			li17_nodes.forEach(detach);
			li18 = claim_element(ul3_nodes, "LI", {});
			var li18_nodes = children(li18);
			a18 = claim_element(li18_nodes, "A", { href: true });
			var a18_nodes = children(a18);
			t18 = claim_text(a18_nodes, "Svelte runtime");
			a18_nodes.forEach(detach);
			li18_nodes.forEach(detach);
			ul3_nodes.forEach(detach);
			section0_nodes.forEach(detach);
			t19 = claim_space(nodes);
			section1 = claim_element(nodes, "SECTION", {});
			var section1_nodes = children(section1);
			h20 = claim_element(section1_nodes, "H2", {});
			var h20_nodes = children(h20);
			a19 = claim_element(h20_nodes, "A", { href: true, id: true });
			var a19_nodes = children(a19);
			t20 = claim_text(a19_nodes, "Who is this for?");
			a19_nodes.forEach(detach);
			h20_nodes.forEach(detach);
			t21 = claim_space(section1_nodes);
			p0 = claim_element(section1_nodes, "P", {});
			var p0_nodes = children(p0);
			t22 = claim_text(p0_nodes, "Anyone who");
			p0_nodes.forEach(detach);
			t23 = claim_space(section1_nodes);
			ul4 = claim_element(section1_nodes, "UL", {});
			var ul4_nodes = children(ul4);
			li19 = claim_element(ul4_nodes, "LI", {});
			var li19_nodes = children(li19);
			t24 = claim_text(li19_nodes, "is interested in the Svelte compilation process");
			li19_nodes.forEach(detach);
			t25 = claim_space(ul4_nodes);
			li20 = claim_element(ul4_nodes, "LI", {});
			var li20_nodes = children(li20);
			t26 = claim_text(li20_nodes, "wants to get started in reading Svelte source code");
			li20_nodes.forEach(detach);
			ul4_nodes.forEach(detach);
			section1_nodes.forEach(detach);
			t27 = claim_space(nodes);
			section2 = claim_element(nodes, "SECTION", {});
			var section2_nodes = children(section2);
			h21 = claim_element(section2_nodes, "H2", {});
			var h21_nodes = children(h21);
			a20 = claim_element(h21_nodes, "A", { href: true, id: true });
			var a20_nodes = children(a20);
			t28 = claim_text(a20_nodes, "Overview");
			a20_nodes.forEach(detach);
			h21_nodes.forEach(detach);
			t29 = claim_space(section2_nodes);
			p1 = claim_element(section2_nodes, "P", {});
			var p1_nodes = children(p1);
			img0 = claim_element(p1_nodes, "IMG", { src: true, alt: true });
			p1_nodes.forEach(detach);
			t30 = claim_space(section2_nodes);
			p2 = claim_element(section2_nodes, "P", {});
			var p2_nodes = children(p2);
			t31 = claim_text(p2_nodes, "The Svelte compilation process can be broken down into 4-steps");
			p2_nodes.forEach(detach);
			t32 = claim_space(section2_nodes);
			ul5 = claim_element(section2_nodes, "UL", {});
			var ul5_nodes = children(ul5);
			li21 = claim_element(ul5_nodes, "LI", {});
			var li21_nodes = children(li21);
			t33 = claim_text(li21_nodes, "Parsing source code into Abstract Syntax Tree (AST)");
			li21_nodes.forEach(detach);
			t34 = claim_space(ul5_nodes);
			li22 = claim_element(ul5_nodes, "LI", {});
			var li22_nodes = children(li22);
			t35 = claim_text(li22_nodes, "Tracking references and dependencies");
			li22_nodes.forEach(detach);
			t36 = claim_space(ul5_nodes);
			li23 = claim_element(ul5_nodes, "LI", {});
			var li23_nodes = children(li23);
			t37 = claim_text(li23_nodes, "Creating code blocks and fragments");
			li23_nodes.forEach(detach);
			t38 = claim_space(ul5_nodes);
			li24 = claim_element(ul5_nodes, "LI", {});
			var li24_nodes = children(li24);
			t39 = claim_text(li24_nodes, "Generate code");
			li24_nodes.forEach(detach);
			ul5_nodes.forEach(detach);
			t40 = claim_space(section2_nodes);
			p3 = claim_element(section2_nodes, "P", {});
			var p3_nodes = children(p3);
			t41 = claim_text(p3_nodes, "Which sums out by the following pseudocode:");
			p3_nodes.forEach(detach);
			t42 = claim_space(section2_nodes);
			pre0 = claim_element(section2_nodes, "PRE", { class: true });
			var pre0_nodes = children(pre0);
			pre0_nodes.forEach(detach);
			section2_nodes.forEach(detach);
			t43 = claim_space(nodes);
			section3 = claim_element(nodes, "SECTION", {});
			var section3_nodes = children(section3);
			h22 = claim_element(section3_nodes, "H2", {});
			var h22_nodes = children(h22);
			a21 = claim_element(h22_nodes, "A", { href: true, id: true });
			var a21_nodes = children(a21);
			t44 = claim_text(a21_nodes, "1. Parsing source code into AST");
			a21_nodes.forEach(detach);
			h22_nodes.forEach(detach);
			t45 = claim_space(section3_nodes);
			p4 = claim_element(section3_nodes, "P", {});
			var p4_nodes = children(p4);
			img1 = claim_element(p4_nodes, "IMG", { src: true, alt: true });
			p4_nodes.forEach(detach);
			t46 = claim_space(section3_nodes);
			pre1 = claim_element(section3_nodes, "PRE", { class: true });
			var pre1_nodes = children(pre1);
			pre1_nodes.forEach(detach);
			t47 = claim_space(section3_nodes);
			p5 = claim_element(section3_nodes, "P", {});
			var p5_nodes = children(p5);
			t48 = claim_text(p5_nodes, "The Svelte syntax is a superset of HTML. Svelte implements its own parser for the Svelte syntax, which handles:");
			p5_nodes.forEach(detach);
			t49 = claim_space(section3_nodes);
			ul6 = claim_element(section3_nodes, "UL", {});
			var ul6_nodes = children(ul6);
			li25 = claim_element(ul6_nodes, "LI", {});
			var li25_nodes = children(li25);
			t50 = claim_text(li25_nodes, "HTML syntax ");
			code0 = claim_element(li25_nodes, "CODE", {});
			var code0_nodes = children(code0);
			t51 = claim_text(code0_nodes, "<div>");
			code0_nodes.forEach(detach);
			li25_nodes.forEach(detach);
			t52 = claim_space(ul6_nodes);
			li26 = claim_element(ul6_nodes, "LI", {});
			var li26_nodes = children(li26);
			t53 = claim_text(li26_nodes, "Curly brackets ");
			code1 = claim_element(li26_nodes, "CODE", {});
			var code1_nodes = children(code1);
			t54 = claim_text(code1_nodes, "{ data }");
			code1_nodes.forEach(detach);
			li26_nodes.forEach(detach);
			t55 = claim_space(ul6_nodes);
			li27 = claim_element(ul6_nodes, "LI", {});
			var li27_nodes = children(li27);
			t56 = claim_text(li27_nodes, "Logic blocks ");
			code2 = claim_element(li27_nodes, "CODE", {});
			var code2_nodes = children(code2);
			t57 = claim_text(code2_nodes, "{#each list as item}");
			code2_nodes.forEach(detach);
			li27_nodes.forEach(detach);
			ul6_nodes.forEach(detach);
			t58 = claim_space(section3_nodes);
			p6 = claim_element(section3_nodes, "P", {});
			var p6_nodes = children(p6);
			t59 = claim_text(p6_nodes, "The Svelte parser handles specially for ");
			code3 = claim_element(p6_nodes, "CODE", {});
			var code3_nodes = children(code3);
			t60 = claim_text(code3_nodes, "<script>");
			code3_nodes.forEach(detach);
			t61 = claim_text(p6_nodes, " and ");
			code4 = claim_element(p6_nodes, "CODE", {});
			var code4_nodes = children(code4);
			t62 = claim_text(code4_nodes, "<style>");
			code4_nodes.forEach(detach);
			t63 = claim_text(p6_nodes, " tags.");
			p6_nodes.forEach(detach);
			t64 = claim_space(section3_nodes);
			p7 = claim_element(section3_nodes, "P", {});
			var p7_nodes = children(p7);
			t65 = claim_text(p7_nodes, "When the parser encounters a ");
			code5 = claim_element(p7_nodes, "CODE", {});
			var code5_nodes = children(code5);
			t66 = claim_text(code5_nodes, "<script>");
			code5_nodes.forEach(detach);
			t67 = claim_text(p7_nodes, " tag, it uses ");
			a22 = claim_element(p7_nodes, "A", { href: true, rel: true });
			var a22_nodes = children(a22);
			t68 = claim_text(a22_nodes, "acorn");
			a22_nodes.forEach(detach);
			t69 = claim_text(p7_nodes, " to parse the content within the tag. When the parser sees a ");
			code6 = claim_element(p7_nodes, "CODE", {});
			var code6_nodes = children(code6);
			t70 = claim_text(code6_nodes, "<style>");
			code6_nodes.forEach(detach);
			t71 = claim_text(p7_nodes, " tag, it uses ");
			a23 = claim_element(p7_nodes, "A", { href: true, rel: true });
			var a23_nodes = children(a23);
			t72 = claim_text(a23_nodes, "css-tree");
			a23_nodes.forEach(detach);
			t73 = claim_text(p7_nodes, " to parse the CSS content.");
			p7_nodes.forEach(detach);
			t74 = claim_space(section3_nodes);
			p8 = claim_element(section3_nodes, "P", {});
			var p8_nodes = children(p8);
			t75 = claim_text(p8_nodes, "Besides, the Svelte parser differentiates instance script, ");
			code7 = claim_element(p8_nodes, "CODE", {});
			var code7_nodes = children(code7);
			t76 = claim_text(code7_nodes, "<script>");
			code7_nodes.forEach(detach);
			t77 = claim_text(p8_nodes, ", and module script, ");
			code8 = claim_element(p8_nodes, "CODE", {});
			var code8_nodes = children(code8);
			t78 = claim_text(code8_nodes, "<script context=\"module\">");
			code8_nodes.forEach(detach);
			t79 = claim_text(p8_nodes, ".");
			p8_nodes.forEach(detach);
			t80 = claim_space(section3_nodes);
			p9 = claim_element(section3_nodes, "P", {});
			var p9_nodes = children(p9);
			t81 = claim_text(p9_nodes, "The Svelte AST look like:");
			p9_nodes.forEach(detach);
			t82 = claim_space(section3_nodes);
			pre2 = claim_element(section3_nodes, "PRE", { class: true });
			var pre2_nodes = children(pre2);
			pre2_nodes.forEach(detach);
			t83 = claim_space(section3_nodes);
			p10 = claim_element(section3_nodes, "P", {});
			var p10_nodes = children(p10);
			t84 = claim_text(p10_nodes, "You can try out the Svelte parser in ");
			a24 = claim_element(p10_nodes, "A", { href: true, rel: true });
			var a24_nodes = children(a24);
			t85 = claim_text(a24_nodes, "ASTExplorer");
			a24_nodes.forEach(detach);
			t86 = claim_text(p10_nodes, ". You can find the Svelte parser under ");
			strong0 = claim_element(p10_nodes, "STRONG", {});
			var strong0_nodes = children(strong0);
			t87 = claim_text(strong0_nodes, "HTML > Svelte");
			strong0_nodes.forEach(detach);
			t88 = claim_text(p10_nodes, ".");
			p10_nodes.forEach(detach);
			section3_nodes.forEach(detach);
			t89 = claim_space(nodes);
			section4 = claim_element(nodes, "SECTION", {});
			var section4_nodes = children(section4);
			h30 = claim_element(section4_nodes, "H3", {});
			var h30_nodes = children(h30);
			a25 = claim_element(h30_nodes, "A", { href: true, id: true });
			var a25_nodes = children(a25);
			t90 = claim_text(a25_nodes, "Where can I find the parser in the source code?");
			a25_nodes.forEach(detach);
			h30_nodes.forEach(detach);
			t91 = claim_space(section4_nodes);
			p11 = claim_element(section4_nodes, "P", {});
			var p11_nodes = children(p11);
			t92 = claim_text(p11_nodes, "The parsing ");
			a26 = claim_element(p11_nodes, "A", { href: true, rel: true });
			var a26_nodes = children(a26);
			t93 = claim_text(a26_nodes, "starts here");
			a26_nodes.forEach(detach);
			t94 = claim_text(p11_nodes, ", which the parser is implemented in ");
			a27 = claim_element(p11_nodes, "A", { href: true, rel: true });
			var a27_nodes = children(a27);
			t95 = claim_text(a27_nodes, "src/compiler/parse/index.ts");
			a27_nodes.forEach(detach);
			t96 = claim_text(p11_nodes, ".");
			p11_nodes.forEach(detach);
			section4_nodes.forEach(detach);
			t97 = claim_space(nodes);
			section5 = claim_element(nodes, "SECTION", {});
			var section5_nodes = children(section5);
			h31 = claim_element(section5_nodes, "H3", {});
			var h31_nodes = children(h31);
			a28 = claim_element(h31_nodes, "A", { href: true, id: true });
			var a28_nodes = children(a28);
			t98 = claim_text(a28_nodes, "Where can I learn about parsing in JavaScript?");
			a28_nodes.forEach(detach);
			h31_nodes.forEach(detach);
			t99 = claim_space(section5_nodes);
			p12 = claim_element(section5_nodes, "P", {});
			var p12_nodes = children(p12);
			t100 = claim_text(p12_nodes, "My previous article, ");
			a29 = claim_element(p12_nodes, "A", { href: true });
			var a29_nodes = children(a29);
			t101 = claim_text(a29_nodes, "\"JSON Parser with JavaScript\"");
			a29_nodes.forEach(detach);
			t102 = claim_text(p12_nodes, " introduces the terminology and guides you step-by-step on writing a parser for JSON in JavaScript.");
			p12_nodes.forEach(detach);
			t103 = claim_space(section5_nodes);
			p13 = claim_element(section5_nodes, "P", {});
			var p13_nodes = children(p13);
			t104 = claim_text(p13_nodes, "If this is the your first time learning about parser, I highly recommend you to read that.");
			p13_nodes.forEach(detach);
			section5_nodes.forEach(detach);
			t105 = claim_space(nodes);
			section6 = claim_element(nodes, "SECTION", {});
			var section6_nodes = children(section6);
			h23 = claim_element(section6_nodes, "H2", {});
			var h23_nodes = children(h23);
			a30 = claim_element(h23_nodes, "A", { href: true, id: true });
			var a30_nodes = children(a30);
			t106 = claim_text(a30_nodes, "2. Tracking references and dependencies");
			a30_nodes.forEach(detach);
			h23_nodes.forEach(detach);
			t107 = claim_space(section6_nodes);
			p14 = claim_element(section6_nodes, "P", {});
			var p14_nodes = children(p14);
			img2 = claim_element(p14_nodes, "IMG", { src: true, alt: true });
			p14_nodes.forEach(detach);
			t108 = claim_space(section6_nodes);
			pre3 = claim_element(section6_nodes, "PRE", { class: true });
			var pre3_nodes = children(pre3);
			pre3_nodes.forEach(detach);
			t109 = claim_space(section6_nodes);
			p15 = claim_element(section6_nodes, "P", {});
			var p15_nodes = children(p15);
			t110 = claim_text(p15_nodes, "In this step, Svelte traverses through the AST to track all the variable declared and referenced and their depedencies.");
			p15_nodes.forEach(detach);
			section6_nodes.forEach(detach);
			t111 = claim_space(nodes);
			section7 = claim_element(nodes, "SECTION", {});
			var section7_nodes = children(section7);
			h32 = claim_element(section7_nodes, "H3", {});
			var h32_nodes = children(h32);
			a31 = claim_element(h32_nodes, "A", { href: true, id: true });
			var a31_nodes = children(a31);
			t112 = claim_text(a31_nodes, "a. Svelte creates a ");
			code9 = claim_element(a31_nodes, "CODE", {});
			var code9_nodes = children(code9);
			t113 = claim_text(code9_nodes, "Component");
			code9_nodes.forEach(detach);
			t114 = claim_text(a31_nodes, " instance.");
			a31_nodes.forEach(detach);
			h32_nodes.forEach(detach);
			t115 = claim_space(section7_nodes);
			p16 = claim_element(section7_nodes, "P", {});
			var p16_nodes = children(p16);
			t116 = claim_text(p16_nodes, "The ");
			code10 = claim_element(p16_nodes, "CODE", {});
			var code10_nodes = children(code10);
			t117 = claim_text(code10_nodes, "Component");
			code10_nodes.forEach(detach);
			t118 = claim_text(p16_nodes, " class stores information of the Svelte component, which includes:");
			p16_nodes.forEach(detach);
			t119 = claim_space(section7_nodes);
			ul7 = claim_element(section7_nodes, "UL", {});
			var ul7_nodes = children(ul7);
			li28 = claim_element(ul7_nodes, "LI", {});
			var li28_nodes = children(li28);
			t120 = claim_text(li28_nodes, "HTML fragment, ");
			a32 = claim_element(li28_nodes, "A", { href: true, rel: true });
			var a32_nodes = children(a32);
			code11 = claim_element(a32_nodes, "CODE", {});
			var code11_nodes = children(code11);
			t121 = claim_text(code11_nodes, "fragment");
			code11_nodes.forEach(detach);
			a32_nodes.forEach(detach);
			li28_nodes.forEach(detach);
			t122 = claim_space(ul7_nodes);
			li29 = claim_element(ul7_nodes, "LI", {});
			var li29_nodes = children(li29);
			t123 = claim_text(li29_nodes, "instance script and module script AST and their lexical scopes, ");
			a33 = claim_element(li29_nodes, "A", { href: true, rel: true });
			var a33_nodes = children(a33);
			code12 = claim_element(a33_nodes, "CODE", {});
			var code12_nodes = children(code12);
			t124 = claim_text(code12_nodes, "instance_scope");
			code12_nodes.forEach(detach);
			a33_nodes.forEach(detach);
			t125 = claim_text(li29_nodes, " and ");
			a34 = claim_element(li29_nodes, "A", { href: true, rel: true });
			var a34_nodes = children(a34);
			code13 = claim_element(a34_nodes, "CODE", {});
			var code13_nodes = children(code13);
			t126 = claim_text(code13_nodes, "module_scope");
			code13_nodes.forEach(detach);
			a34_nodes.forEach(detach);
			li29_nodes.forEach(detach);
			t127 = claim_space(ul7_nodes);
			li30 = claim_element(ul7_nodes, "LI", {});
			var li30_nodes = children(li30);
			t128 = claim_text(li30_nodes, "instance variables, ");
			a35 = claim_element(li30_nodes, "A", { href: true, rel: true });
			var a35_nodes = children(a35);
			code14 = claim_element(a35_nodes, "CODE", {});
			var code14_nodes = children(code14);
			t129 = claim_text(code14_nodes, "vars");
			code14_nodes.forEach(detach);
			a35_nodes.forEach(detach);
			li30_nodes.forEach(detach);
			t130 = claim_space(ul7_nodes);
			li31 = claim_element(ul7_nodes, "LI", {});
			var li31_nodes = children(li31);
			t131 = claim_text(li31_nodes, "reactive variables, ");
			a36 = claim_element(li31_nodes, "A", { href: true, rel: true });
			var a36_nodes = children(a36);
			code15 = claim_element(a36_nodes, "CODE", {});
			var code15_nodes = children(code15);
			t132 = claim_text(code15_nodes, "reactive_declarations");
			code15_nodes.forEach(detach);
			a36_nodes.forEach(detach);
			li31_nodes.forEach(detach);
			t133 = claim_space(ul7_nodes);
			li32 = claim_element(ul7_nodes, "LI", {});
			var li32_nodes = children(li32);
			t134 = claim_text(li32_nodes, "slots, ");
			a37 = claim_element(li32_nodes, "A", { href: true, rel: true });
			var a37_nodes = children(a37);
			code16 = claim_element(a37_nodes, "CODE", {});
			var code16_nodes = children(code16);
			t135 = claim_text(code16_nodes, "slots");
			code16_nodes.forEach(detach);
			a37_nodes.forEach(detach);
			li32_nodes.forEach(detach);
			t136 = claim_space(ul7_nodes);
			li33 = claim_element(ul7_nodes, "LI", {});
			var li33_nodes = children(li33);
			a38 = claim_element(li33_nodes, "A", { href: true, rel: true });
			var a38_nodes = children(a38);
			t137 = claim_text(a38_nodes, "used variable names");
			a38_nodes.forEach(detach);
			t138 = claim_text(li33_nodes, " to prevent naming conflict when creating temporary variables");
			li33_nodes.forEach(detach);
			t139 = claim_space(ul7_nodes);
			li34 = claim_element(ul7_nodes, "LI", {});
			var li34_nodes = children(li34);
			a39 = claim_element(li34_nodes, "A", { href: true, rel: true });
			var a39_nodes = children(a39);
			t140 = claim_text(a39_nodes, "warnings");
			a39_nodes.forEach(detach);
			t141 = claim_text(li34_nodes, " and ");
			a40 = claim_element(li34_nodes, "A", { href: true, rel: true });
			var a40_nodes = children(a40);
			t142 = claim_text(a40_nodes, "errors");
			a40_nodes.forEach(detach);
			li34_nodes.forEach(detach);
			t143 = claim_space(ul7_nodes);
			li35 = claim_element(ul7_nodes, "LI", {});
			var li35_nodes = children(li35);
			a41 = claim_element(li35_nodes, "A", { href: true, rel: true });
			var a41_nodes = children(a41);
			t144 = claim_text(a41_nodes, "compile options");
			a41_nodes.forEach(detach);
			t145 = claim_text(li35_nodes, " and ");
			a42 = claim_element(li35_nodes, "A", { href: true, rel: true });
			var a42_nodes = children(a42);
			t146 = claim_text(a42_nodes, "ignored warnings");
			a42_nodes.forEach(detach);
			li35_nodes.forEach(detach);
			ul7_nodes.forEach(detach);
			section7_nodes.forEach(detach);
			t147 = claim_space(nodes);
			section8 = claim_element(nodes, "SECTION", {});
			var section8_nodes = children(section8);
			h33 = claim_element(section8_nodes, "H3", {});
			var h33_nodes = children(h33);
			a43 = claim_element(h33_nodes, "A", { href: true, id: true });
			var a43_nodes = children(a43);
			t148 = claim_text(a43_nodes, "b. Traverse the instance script and module script AST");
			a43_nodes.forEach(detach);
			h33_nodes.forEach(detach);
			t149 = claim_space(section8_nodes);
			p17 = claim_element(section8_nodes, "P", {});
			var p17_nodes = children(p17);
			code17 = claim_element(p17_nodes, "CODE", {});
			var code17_nodes = children(code17);
			t150 = claim_text(code17_nodes, "Component");
			code17_nodes.forEach(detach);
			t151 = claim_text(p17_nodes, " traverses the instance script and module script AST to ");
			strong1 = claim_element(p17_nodes, "STRONG", {});
			var strong1_nodes = children(strong1);
			t152 = claim_text(strong1_nodes, "find out all the variables declared, referenced, and updated");
			strong1_nodes.forEach(detach);
			t153 = claim_text(p17_nodes, " within the instance script and module script.");
			p17_nodes.forEach(detach);
			t154 = claim_space(section8_nodes);
			p18 = claim_element(section8_nodes, "P", {});
			var p18_nodes = children(p18);
			t155 = claim_text(p18_nodes, "Svelte identifies all the variables available before traversing the template. When encountering the variable during template traversal, Svelte will mark the variable as ");
			code18 = claim_element(p18_nodes, "CODE", {});
			var code18_nodes = children(code18);
			t156 = claim_text(code18_nodes, "referenced");
			code18_nodes.forEach(detach);
			t157 = claim_text(p18_nodes, " from template.");
			p18_nodes.forEach(detach);
			section8_nodes.forEach(detach);
			t158 = claim_space(nodes);
			section9 = claim_element(nodes, "SECTION", {});
			var section9_nodes = children(section9);
			h34 = claim_element(section9_nodes, "H3", {});
			var h34_nodes = children(h34);
			a44 = claim_element(h34_nodes, "A", { href: true, id: true });
			var a44_nodes = children(a44);
			t159 = claim_text(a44_nodes, "c. Traverse the template");
			a44_nodes.forEach(detach);
			h34_nodes.forEach(detach);
			t160 = claim_space(section9_nodes);
			p19 = claim_element(section9_nodes, "P", {});
			var p19_nodes = children(p19);
			t161 = claim_text(p19_nodes, "Svelte traverses through the template AST and creates a ");
			a45 = claim_element(p19_nodes, "A", { href: true, rel: true });
			var a45_nodes = children(a45);
			t162 = claim_text(a45_nodes, "Fragment");
			a45_nodes.forEach(detach);
			t163 = claim_text(p19_nodes, " tree out of the template AST.");
			p19_nodes.forEach(detach);
			t164 = claim_space(section9_nodes);
			p20 = claim_element(section9_nodes, "P", {});
			var p20_nodes = children(p20);
			t165 = claim_text(p20_nodes, "Each fragment node contains information such as:");
			p20_nodes.forEach(detach);
			t166 = claim_space(section9_nodes);
			p21 = claim_element(section9_nodes, "P", {});
			var p21_nodes = children(p21);
			strong2 = claim_element(p21_nodes, "STRONG", {});
			var strong2_nodes = children(strong2);
			t167 = claim_text(strong2_nodes, "- expression and dependencies");
			strong2_nodes.forEach(detach);
			p21_nodes.forEach(detach);
			t168 = claim_space(section9_nodes);
			p22 = claim_element(section9_nodes, "P", {});
			var p22_nodes = children(p22);
			t169 = claim_text(p22_nodes, "Logic blocks, ");
			code19 = claim_element(p22_nodes, "CODE", {});
			var code19_nodes = children(code19);
			t170 = claim_text(code19_nodes, "{#if}");
			code19_nodes.forEach(detach);
			t171 = claim_text(p22_nodes, ", and mustache tags, ");
			code20 = claim_element(p22_nodes, "CODE", {});
			var code20_nodes = children(code20);
			t172 = claim_text(code20_nodes, "{ data }");
			code20_nodes.forEach(detach);
			t173 = claim_text(p22_nodes, ", contain expression and the dependencies of the expression.");
			p22_nodes.forEach(detach);
			t174 = claim_space(section9_nodes);
			p23 = claim_element(section9_nodes, "P", {});
			var p23_nodes = children(p23);
			strong3 = claim_element(p23_nodes, "STRONG", {});
			var strong3_nodes = children(strong3);
			t175 = claim_text(strong3_nodes, "- scope");
			strong3_nodes.forEach(detach);
			p23_nodes.forEach(detach);
			t176 = claim_space(section9_nodes);
			p24 = claim_element(section9_nodes, "P", {});
			var p24_nodes = children(p24);
			code21 = claim_element(p24_nodes, "CODE", {});
			var code21_nodes = children(code21);
			t177 = claim_text(code21_nodes, "{#each}");
			code21_nodes.forEach(detach);
			t178 = claim_text(p24_nodes, " and ");
			code22 = claim_element(p24_nodes, "CODE", {});
			var code22_nodes = children(code22);
			t179 = claim_text(code22_nodes, "{#await}");
			code22_nodes.forEach(detach);
			t180 = claim_text(p24_nodes, " logic block and ");
			code23 = claim_element(p24_nodes, "CODE", {});
			var code23_nodes = children(code23);
			t181 = claim_text(code23_nodes, "let:");
			code23_nodes.forEach(detach);
			t182 = claim_text(p24_nodes, " binding create new variables for the children template.");
			p24_nodes.forEach(detach);
			t183 = claim_space(section9_nodes);
			p25 = claim_element(section9_nodes, "P", {});
			var p25_nodes = children(p25);
			t184 = claim_text(p25_nodes, "Svelte creates a different Fragment node for each type of node in the AST, as different kind of Fragment node handles things differently:");
			p25_nodes.forEach(detach);
			t185 = claim_space(section9_nodes);
			ul8 = claim_element(section9_nodes, "UL", {});
			var ul8_nodes = children(ul8);
			li36 = claim_element(ul8_nodes, "LI", {});
			var li36_nodes = children(li36);
			a46 = claim_element(li36_nodes, "A", { href: true, rel: true });
			var a46_nodes = children(a46);
			t186 = claim_text(a46_nodes, "Element node");
			a46_nodes.forEach(detach);
			t187 = claim_text(li36_nodes, " validates the ");
			a47 = claim_element(li36_nodes, "A", { href: true, rel: true });
			var a47_nodes = children(a47);
			t188 = claim_text(a47_nodes, "attribute");
			a47_nodes.forEach(detach);
			t189 = claim_text(li36_nodes, ", ");
			a48 = claim_element(li36_nodes, "A", { href: true, rel: true });
			var a48_nodes = children(a48);
			t190 = claim_text(a48_nodes, "bindings");
			a48_nodes.forEach(detach);
			t191 = claim_text(li36_nodes, ", ");
			a49 = claim_element(li36_nodes, "A", { href: true, rel: true });
			var a49_nodes = children(a49);
			t192 = claim_text(a49_nodes, "content");
			a49_nodes.forEach(detach);
			t193 = claim_text(li36_nodes, " and ");
			a50 = claim_element(li36_nodes, "A", { href: true, rel: true });
			var a50_nodes = children(a50);
			t194 = claim_text(a50_nodes, "event handlers");
			a50_nodes.forEach(detach);
			t195 = claim_text(li36_nodes, ".");
			li36_nodes.forEach(detach);
			t196 = claim_space(ul8_nodes);
			li37 = claim_element(ul8_nodes, "LI", {});
			var li37_nodes = children(li37);
			a51 = claim_element(li37_nodes, "A", { href: true, rel: true });
			var a51_nodes = children(a51);
			t197 = claim_text(a51_nodes, "Slot node");
			a51_nodes.forEach(detach);
			t198 = claim_text(li37_nodes, " registers the slot name to the ");
			code24 = claim_element(li37_nodes, "CODE", {});
			var code24_nodes = children(code24);
			t199 = claim_text(code24_nodes, "Component");
			code24_nodes.forEach(detach);
			t200 = claim_text(li37_nodes, ".");
			li37_nodes.forEach(detach);
			t201 = claim_space(ul8_nodes);
			li38 = claim_element(ul8_nodes, "LI", {});
			var li38_nodes = children(li38);
			a52 = claim_element(li38_nodes, "A", { href: true, rel: true });
			var a52_nodes = children(a52);
			t202 = claim_text(a52_nodes, "EachBlock node");
			a52_nodes.forEach(detach);
			t203 = claim_text(li38_nodes, " creates a new scope and tracks the ");
			code25 = claim_element(li38_nodes, "CODE", {});
			var code25_nodes = children(code25);
			t204 = claim_text(code25_nodes, "key");
			code25_nodes.forEach(detach);
			t205 = claim_text(li38_nodes, ", ");
			code26 = claim_element(li38_nodes, "CODE", {});
			var code26_nodes = children(code26);
			t206 = claim_text(code26_nodes, "index");
			code26_nodes.forEach(detach);
			t207 = claim_text(li38_nodes, " and the name of the list to be iterated.");
			li38_nodes.forEach(detach);
			t208 = claim_space(ul8_nodes);
			li39 = claim_element(ul8_nodes, "LI", {});
			var li39_nodes = children(li39);
			t209 = claim_text(li39_nodes, "...");
			li39_nodes.forEach(detach);
			ul8_nodes.forEach(detach);
			section9_nodes.forEach(detach);
			t210 = claim_space(nodes);
			section10 = claim_element(nodes, "SECTION", {});
			var section10_nodes = children(section10);
			h35 = claim_element(section10_nodes, "H3", {});
			var h35_nodes = children(h35);
			a53 = claim_element(h35_nodes, "A", { href: true, id: true });
			var a53_nodes = children(a53);
			t211 = claim_text(a53_nodes, "d. Traverse the instance script AST");
			a53_nodes.forEach(detach);
			h35_nodes.forEach(detach);
			t212 = claim_space(section10_nodes);
			p26 = claim_element(section10_nodes, "P", {});
			var p26_nodes = children(p26);
			t213 = claim_text(p26_nodes, "After traversing through the template, Svelte now knows whether a variable is ever being updated or referenced in the component.");
			p26_nodes.forEach(detach);
			t214 = claim_space(section10_nodes);
			p27 = claim_element(section10_nodes, "P", {});
			var p27_nodes = children(p27);
			t215 = claim_text(p27_nodes, "With this information, Svelte tries make preparations for optimising the output, for example:");
			p27_nodes.forEach(detach);
			t216 = claim_space(section10_nodes);
			ul9 = claim_element(section10_nodes, "UL", {});
			var ul9_nodes = children(ul9);
			li40 = claim_element(ul9_nodes, "LI", {});
			var li40_nodes = children(li40);
			t217 = claim_text(li40_nodes, "determine which variables or functions can be safely hoisted out of the ");
			code27 = claim_element(li40_nodes, "CODE", {});
			var code27_nodes = children(code27);
			t218 = claim_text(code27_nodes, "instance");
			code27_nodes.forEach(detach);
			t219 = claim_text(li40_nodes, " function.");
			li40_nodes.forEach(detach);
			t220 = claim_space(ul9_nodes);
			li41 = claim_element(ul9_nodes, "LI", {});
			var li41_nodes = children(li41);
			t221 = claim_text(li41_nodes, "determine reactive declarations that does not need to be reactive");
			li41_nodes.forEach(detach);
			ul9_nodes.forEach(detach);
			section10_nodes.forEach(detach);
			t222 = claim_space(nodes);
			section11 = claim_element(nodes, "SECTION", {});
			var section11_nodes = children(section11);
			h36 = claim_element(section11_nodes, "H3", {});
			var h36_nodes = children(h36);
			a54 = claim_element(h36_nodes, "A", { href: true, id: true });
			var a54_nodes = children(a54);
			t223 = claim_text(a54_nodes, "e. Update CSS selectors to make style declarations component scope");
			a54_nodes.forEach(detach);
			h36_nodes.forEach(detach);
			t224 = claim_space(section11_nodes);
			p28 = claim_element(section11_nodes, "P", {});
			var p28_nodes = children(p28);
			t225 = claim_text(p28_nodes, "Svelte updates the CSS selectors, by adding ");
			code28 = claim_element(p28_nodes, "CODE", {});
			var code28_nodes = children(code28);
			t226 = claim_text(code28_nodes, ".svelte-xxx");
			code28_nodes.forEach(detach);
			t227 = claim_text(p28_nodes, " class to the selectors when necessary.");
			p28_nodes.forEach(detach);
			t228 = claim_space(section11_nodes);
			p29 = claim_element(section11_nodes, "P", {});
			var p29_nodes = children(p29);
			t229 = claim_text(p29_nodes, "At the end of this step, Svelte has enough information to generate the compiled code, which brings us to the next step.");
			p29_nodes.forEach(detach);
			section11_nodes.forEach(detach);
			t230 = claim_space(nodes);
			section12 = claim_element(nodes, "SECTION", {});
			var section12_nodes = children(section12);
			h37 = claim_element(section12_nodes, "H3", {});
			var h37_nodes = children(h37);
			a55 = claim_element(h37_nodes, "A", { href: true, id: true });
			var a55_nodes = children(a55);
			t231 = claim_text(a55_nodes, "Where can I find this in the source code?");
			a55_nodes.forEach(detach);
			h37_nodes.forEach(detach);
			t232 = claim_space(section12_nodes);
			p30 = claim_element(section12_nodes, "P", {});
			var p30_nodes = children(p30);
			t233 = claim_text(p30_nodes, "You can start reading ");
			a56 = claim_element(p30_nodes, "A", { href: true, rel: true });
			var a56_nodes = children(a56);
			t234 = claim_text(a56_nodes, "from here");
			a56_nodes.forEach(detach);
			t235 = claim_text(p30_nodes, ", which the ");
			code29 = claim_element(p30_nodes, "CODE", {});
			var code29_nodes = children(code29);
			t236 = claim_text(code29_nodes, "Component");
			code29_nodes.forEach(detach);
			t237 = claim_text(p30_nodes, " is implemented in ");
			a57 = claim_element(p30_nodes, "A", { href: true, rel: true });
			var a57_nodes = children(a57);
			t238 = claim_text(a57_nodes, "src/compiler/compile/Component.ts");
			a57_nodes.forEach(detach);
			t239 = claim_text(p30_nodes, ".");
			p30_nodes.forEach(detach);
			section12_nodes.forEach(detach);
			t240 = claim_space(nodes);
			section13 = claim_element(nodes, "SECTION", {});
			var section13_nodes = children(section13);
			h38 = claim_element(section13_nodes, "H3", {});
			var h38_nodes = children(h38);
			a58 = claim_element(h38_nodes, "A", { href: true, id: true });
			var a58_nodes = children(a58);
			t241 = claim_text(a58_nodes, "Where can I learn about traversing in JavaScript?");
			a58_nodes.forEach(detach);
			h38_nodes.forEach(detach);
			t242 = claim_space(section13_nodes);
			p31 = claim_element(section13_nodes, "P", {});
			var p31_nodes = children(p31);
			t243 = claim_text(p31_nodes, "Bear with my shameless plug, my previous article, ");
			a59 = claim_element(p31_nodes, "A", { href: true });
			var a59_nodes = children(a59);
			t244 = claim_text(a59_nodes, "\"Manipulating AST with JavaScript\"");
			a59_nodes.forEach(detach);
			t245 = claim_text(p31_nodes, " covers relevant knowledge you need to know about traversing AST in JavaScript.");
			p31_nodes.forEach(detach);
			section13_nodes.forEach(detach);
			t246 = claim_space(nodes);
			section14 = claim_element(nodes, "SECTION", {});
			var section14_nodes = children(section14);
			h24 = claim_element(section14_nodes, "H2", {});
			var h24_nodes = children(h24);
			a60 = claim_element(h24_nodes, "A", { href: true, id: true });
			var a60_nodes = children(a60);
			t247 = claim_text(a60_nodes, "3. Creating code blocks and fragments");
			a60_nodes.forEach(detach);
			h24_nodes.forEach(detach);
			t248 = claim_space(section14_nodes);
			p32 = claim_element(section14_nodes, "P", {});
			var p32_nodes = children(p32);
			img3 = claim_element(p32_nodes, "IMG", { src: true, alt: true });
			p32_nodes.forEach(detach);
			t249 = claim_space(section14_nodes);
			pre4 = claim_element(section14_nodes, "PRE", { class: true });
			var pre4_nodes = children(pre4);
			pre4_nodes.forEach(detach);
			t250 = claim_space(section14_nodes);
			p33 = claim_element(section14_nodes, "P", {});
			var p33_nodes = children(p33);
			t251 = claim_text(p33_nodes, "In this step, Svelte creates a ");
			code30 = claim_element(p33_nodes, "CODE", {});
			var code30_nodes = children(code30);
			t252 = claim_text(code30_nodes, "Renderer");
			code30_nodes.forEach(detach);
			t253 = claim_text(p33_nodes, " instance which keeps track necessary information required to generate the compiled output. Depending on the whether to output DOM or SSR code ");
			em = claim_element(p33_nodes, "EM", {});
			var em_nodes = children(em);
			t254 = claim_text(em_nodes, "(");
			a61 = claim_element(em_nodes, "A", { href: true, rel: true });
			var a61_nodes = children(a61);
			t255 = claim_text(a61_nodes, "see ");
			code31 = claim_element(a61_nodes, "CODE", {});
			var code31_nodes = children(code31);
			t256 = claim_text(code31_nodes, "generate");
			code31_nodes.forEach(detach);
			t257 = claim_text(a61_nodes, " in compile options");
			a61_nodes.forEach(detach);
			t258 = claim_text(em_nodes, ")");
			em_nodes.forEach(detach);
			t259 = claim_text(p33_nodes, ", Svelte instantiates different ");
			code32 = claim_element(p33_nodes, "CODE", {});
			var code32_nodes = children(code32);
			t260 = claim_text(code32_nodes, "Renderer");
			code32_nodes.forEach(detach);
			t261 = claim_text(p33_nodes, " respectively.");
			p33_nodes.forEach(detach);
			section14_nodes.forEach(detach);
			t262 = claim_space(nodes);
			section15 = claim_element(nodes, "SECTION", {});
			var section15_nodes = children(section15);
			h39 = claim_element(section15_nodes, "H3", {});
			var h39_nodes = children(h39);
			a62 = claim_element(h39_nodes, "A", { href: true, id: true });
			var a62_nodes = children(a62);
			t263 = claim_text(a62_nodes, "DOM Renderer");
			a62_nodes.forEach(detach);
			h39_nodes.forEach(detach);
			t264 = claim_space(section15_nodes);
			p34 = claim_element(section15_nodes, "P", {});
			var p34_nodes = children(p34);
			t265 = claim_text(p34_nodes, "DOM Renderer keeps track of ");
			a63 = claim_element(p34_nodes, "A", { href: true, rel: true });
			var a63_nodes = children(a63);
			t266 = claim_text(a63_nodes, "a list of blocks");
			a63_nodes.forEach(detach);
			t267 = claim_text(p34_nodes, " and ");
			a64 = claim_element(p34_nodes, "A", { href: true, rel: true });
			var a64_nodes = children(a64);
			t268 = claim_text(a64_nodes, "context");
			a64_nodes.forEach(detach);
			t269 = claim_text(p34_nodes, ".");
			p34_nodes.forEach(detach);
			t270 = claim_space(section15_nodes);
			p35 = claim_element(section15_nodes, "P", {});
			var p35_nodes = children(p35);
			t271 = claim_text(p35_nodes, "A ");
			a65 = claim_element(p35_nodes, "A", { href: true, rel: true });
			var a65_nodes = children(a65);
			t272 = claim_text(a65_nodes, "Block");
			a65_nodes.forEach(detach);
			t273 = claim_text(p35_nodes, " contains code fragments for generate the ");
			a66 = claim_element(p35_nodes, "A", { href: true });
			var a66_nodes = children(a66);
			code33 = claim_element(a66_nodes, "CODE", {});
			var code33_nodes = children(code33);
			t274 = claim_text(code33_nodes, "create_fragment");
			code33_nodes.forEach(detach);
			a66_nodes.forEach(detach);
			t275 = claim_text(p35_nodes, " function.");
			p35_nodes.forEach(detach);
			t276 = claim_space(section15_nodes);
			p36 = claim_element(section15_nodes, "P", {});
			var p36_nodes = children(p36);
			t277 = claim_text(p36_nodes, "Context tracks a list of ");
			a67 = claim_element(p36_nodes, "A", { href: true });
			var a67_nodes = children(a67);
			t278 = claim_text(a67_nodes, "instance variables");
			a67_nodes.forEach(detach);
			t279 = claim_text(p36_nodes, " which will be presented in the ");
			code34 = claim_element(p36_nodes, "CODE", {});
			var code34_nodes = children(code34);
			t280 = claim_text(code34_nodes, "$$.ctx");
			code34_nodes.forEach(detach);
			t281 = claim_text(p36_nodes, " in the compiled output.");
			p36_nodes.forEach(detach);
			t282 = claim_space(section15_nodes);
			p37 = claim_element(section15_nodes, "P", {});
			var p37_nodes = children(p37);
			t283 = claim_text(p37_nodes, "In the renderer, Svelte creates a ");
			a68 = claim_element(p37_nodes, "A", { href: true, rel: true });
			var a68_nodes = children(a68);
			t284 = claim_text(a68_nodes, "render tree");
			a68_nodes.forEach(detach);
			t285 = claim_text(p37_nodes, " out of the Fragment tree.");
			p37_nodes.forEach(detach);
			t286 = claim_space(section15_nodes);
			p38 = claim_element(section15_nodes, "P", {});
			var p38_nodes = children(p38);
			t287 = claim_text(p38_nodes, "Each node in the render tree implements the ");
			code35 = claim_element(p38_nodes, "CODE", {});
			var code35_nodes = children(code35);
			t288 = claim_text(code35_nodes, "render");
			code35_nodes.forEach(detach);
			t289 = claim_text(p38_nodes, " function which generate codes that create and update the DOM for the node.");
			p38_nodes.forEach(detach);
			section15_nodes.forEach(detach);
			t290 = claim_space(nodes);
			section16 = claim_element(nodes, "SECTION", {});
			var section16_nodes = children(section16);
			h310 = claim_element(section16_nodes, "H3", {});
			var h310_nodes = children(h310);
			a69 = claim_element(h310_nodes, "A", { href: true, id: true });
			var a69_nodes = children(a69);
			t291 = claim_text(a69_nodes, "SSR Renderer");
			a69_nodes.forEach(detach);
			h310_nodes.forEach(detach);
			t292 = claim_space(section16_nodes);
			p39 = claim_element(section16_nodes, "P", {});
			var p39_nodes = children(p39);
			t293 = claim_text(p39_nodes, "SSR Renderer provide helpers to generate ");
			a70 = claim_element(p39_nodes, "A", { href: true, rel: true });
			var a70_nodes = children(a70);
			t294 = claim_text(a70_nodes, "template literals");
			a70_nodes.forEach(detach);
			t295 = claim_text(p39_nodes, " in the compiled output, such as ");
			a71 = claim_element(p39_nodes, "A", { href: true, rel: true });
			var a71_nodes = children(a71);
			code36 = claim_element(a71_nodes, "CODE", {});
			var code36_nodes = children(code36);
			t296 = claim_text(code36_nodes, "add_string(str)");
			code36_nodes.forEach(detach);
			a71_nodes.forEach(detach);
			t297 = claim_text(p39_nodes, " and ");
			a72 = claim_element(p39_nodes, "A", { href: true, rel: true });
			var a72_nodes = children(a72);
			code37 = claim_element(a72_nodes, "CODE", {});
			var code37_nodes = children(code37);
			t298 = claim_text(code37_nodes, "add_expression(node)");
			code37_nodes.forEach(detach);
			a72_nodes.forEach(detach);
			t299 = claim_text(p39_nodes, ".");
			p39_nodes.forEach(detach);
			section16_nodes.forEach(detach);
			t300 = claim_space(nodes);
			section17 = claim_element(nodes, "SECTION", {});
			var section17_nodes = children(section17);
			h311 = claim_element(section17_nodes, "H3", {});
			var h311_nodes = children(h311);
			a73 = claim_element(h311_nodes, "A", { href: true, id: true });
			var a73_nodes = children(a73);
			t301 = claim_text(a73_nodes, "Where can I find the ");
			code38 = claim_element(a73_nodes, "CODE", {});
			var code38_nodes = children(code38);
			t302 = claim_text(code38_nodes, "Renderer");
			code38_nodes.forEach(detach);
			t303 = claim_text(a73_nodes, " in the source code?");
			a73_nodes.forEach(detach);
			h311_nodes.forEach(detach);
			t304 = claim_space(section17_nodes);
			p40 = claim_element(section17_nodes, "P", {});
			var p40_nodes = children(p40);
			t305 = claim_text(p40_nodes, "The DOM Renderer is implemented in ");
			a74 = claim_element(p40_nodes, "A", { href: true, rel: true });
			var a74_nodes = children(a74);
			t306 = claim_text(a74_nodes, "src/compiler/compile/render_dom/Renderer.ts");
			a74_nodes.forEach(detach);
			t307 = claim_text(p40_nodes, ", and you can check out the SSR Renderer code in ");
			a75 = claim_element(p40_nodes, "A", { href: true, rel: true });
			var a75_nodes = children(a75);
			t308 = claim_text(a75_nodes, "src/compiler/compile/render_ssr/Renderer.ts");
			a75_nodes.forEach(detach);
			t309 = claim_text(p40_nodes, ".");
			p40_nodes.forEach(detach);
			section17_nodes.forEach(detach);
			t310 = claim_space(nodes);
			section18 = claim_element(nodes, "SECTION", {});
			var section18_nodes = children(section18);
			h25 = claim_element(section18_nodes, "H2", {});
			var h25_nodes = children(h25);
			a76 = claim_element(h25_nodes, "A", { href: true, id: true });
			var a76_nodes = children(a76);
			t311 = claim_text(a76_nodes, "4. Generate code");
			a76_nodes.forEach(detach);
			h25_nodes.forEach(detach);
			t312 = claim_space(section18_nodes);
			p41 = claim_element(section18_nodes, "P", {});
			var p41_nodes = children(p41);
			img4 = claim_element(p41_nodes, "IMG", { src: true, alt: true });
			p41_nodes.forEach(detach);
			t313 = claim_space(section18_nodes);
			pre5 = claim_element(section18_nodes, "PRE", { class: true });
			var pre5_nodes = children(pre5);
			pre5_nodes.forEach(detach);
			t314 = claim_space(section18_nodes);
			p42 = claim_element(section18_nodes, "P", {});
			var p42_nodes = children(p42);
			t315 = claim_text(p42_nodes, "Different renderer renders differently.");
			p42_nodes.forEach(detach);
			t316 = claim_space(section18_nodes);
			p43 = claim_element(section18_nodes, "P", {});
			var p43_nodes = children(p43);
			strong4 = claim_element(p43_nodes, "STRONG", {});
			var strong4_nodes = children(strong4);
			t317 = claim_text(strong4_nodes, "The DOM Renderer");
			strong4_nodes.forEach(detach);
			t318 = claim_text(p43_nodes, " traverses through the render tree and calls the ");
			code39 = claim_element(p43_nodes, "CODE", {});
			var code39_nodes = children(code39);
			t319 = claim_text(code39_nodes, "render");
			code39_nodes.forEach(detach);
			t320 = claim_text(p43_nodes, " function of each node along the way. The ");
			code40 = claim_element(p43_nodes, "CODE", {});
			var code40_nodes = children(code40);
			t321 = claim_text(code40_nodes, "Block");
			code40_nodes.forEach(detach);
			t322 = claim_text(p43_nodes, " instance is passed into the ");
			code41 = claim_element(p43_nodes, "CODE", {});
			var code41_nodes = children(code41);
			t323 = claim_text(code41_nodes, "render");
			code41_nodes.forEach(detach);
			t324 = claim_text(p43_nodes, " function, so that each node inserts the code into the appropriate ");
			code42 = claim_element(p43_nodes, "CODE", {});
			var code42_nodes = children(code42);
			t325 = claim_text(code42_nodes, "create_fragment");
			code42_nodes.forEach(detach);
			t326 = claim_text(p43_nodes, " function.");
			p43_nodes.forEach(detach);
			t327 = claim_space(section18_nodes);
			p44 = claim_element(section18_nodes, "P", {});
			var p44_nodes = children(p44);
			strong5 = claim_element(p44_nodes, "STRONG", {});
			var strong5_nodes = children(strong5);
			t328 = claim_text(strong5_nodes, "The SSR Renderer");
			strong5_nodes.forEach(detach);
			t329 = claim_text(p44_nodes, ", on the other hand, relies on different ");
			a77 = claim_element(p44_nodes, "A", { href: true, rel: true });
			var a77_nodes = children(a77);
			t330 = claim_text(a77_nodes, "node handlers");
			a77_nodes.forEach(detach);
			t331 = claim_text(p44_nodes, " to insert strings or expressions into the final template literal.");
			p44_nodes.forEach(detach);
			t332 = claim_space(section18_nodes);
			p45 = claim_element(section18_nodes, "P", {});
			var p45_nodes = children(p45);
			t333 = claim_text(p45_nodes, "The render function returns ");
			code43 = claim_element(p45_nodes, "CODE", {});
			var code43_nodes = children(code43);
			t334 = claim_text(code43_nodes, "js");
			code43_nodes.forEach(detach);
			t335 = claim_text(p45_nodes, " and ");
			code44 = claim_element(p45_nodes, "CODE", {});
			var code44_nodes = children(code44);
			t336 = claim_text(code44_nodes, "css");
			code44_nodes.forEach(detach);
			t337 = claim_text(p45_nodes, " which will be consumed by the bundler, via ");
			a78 = claim_element(p45_nodes, "A", { href: true, rel: true });
			var a78_nodes = children(a78);
			t338 = claim_text(a78_nodes, "rollup-plugin-svelte");
			a78_nodes.forEach(detach);
			t339 = claim_text(p45_nodes, " for rollup and ");
			a79 = claim_element(p45_nodes, "A", { href: true, rel: true });
			var a79_nodes = children(a79);
			t340 = claim_text(a79_nodes, "svelte-loader");
			a79_nodes.forEach(detach);
			t341 = claim_text(p45_nodes, " for webpack respectively.");
			p45_nodes.forEach(detach);
			section18_nodes.forEach(detach);
			t342 = claim_space(nodes);
			section19 = claim_element(nodes, "SECTION", {});
			var section19_nodes = children(section19);
			h26 = claim_element(section19_nodes, "H2", {});
			var h26_nodes = children(h26);
			a80 = claim_element(h26_nodes, "A", { href: true, id: true });
			var a80_nodes = children(a80);
			t343 = claim_text(a80_nodes, "Svelte runtime");
			a80_nodes.forEach(detach);
			h26_nodes.forEach(detach);
			t344 = claim_space(section19_nodes);
			p46 = claim_element(section19_nodes, "P", {});
			var p46_nodes = children(p46);
			t345 = claim_text(p46_nodes, "To remove duplicate code in the compiled output, Svelte provide util function which can be found in the ");
			a81 = claim_element(p46_nodes, "A", { href: true, rel: true });
			var a81_nodes = children(a81);
			t346 = claim_text(a81_nodes, "src/runtime/internal");
			a81_nodes.forEach(detach);
			t347 = claim_text(p46_nodes, ", such as:");
			p46_nodes.forEach(detach);
			t348 = claim_space(section19_nodes);
			ul10 = claim_element(section19_nodes, "UL", {});
			var ul10_nodes = children(ul10);
			li42 = claim_element(ul10_nodes, "LI", {});
			var li42_nodes = children(li42);
			t349 = claim_text(li42_nodes, "dom related utils, eg: ");
			code45 = claim_element(li42_nodes, "CODE", {});
			var code45_nodes = children(code45);
			t350 = claim_text(code45_nodes, "append");
			code45_nodes.forEach(detach);
			t351 = claim_text(li42_nodes, ", ");
			code46 = claim_element(li42_nodes, "CODE", {});
			var code46_nodes = children(code46);
			t352 = claim_text(code46_nodes, "insert");
			code46_nodes.forEach(detach);
			t353 = claim_text(li42_nodes, ", ");
			code47 = claim_element(li42_nodes, "CODE", {});
			var code47_nodes = children(code47);
			t354 = claim_text(code47_nodes, "detach");
			code47_nodes.forEach(detach);
			li42_nodes.forEach(detach);
			t355 = claim_space(ul10_nodes);
			li43 = claim_element(ul10_nodes, "LI", {});
			var li43_nodes = children(li43);
			t356 = claim_text(li43_nodes, "scheduling utils, eg: ");
			code48 = claim_element(li43_nodes, "CODE", {});
			var code48_nodes = children(code48);
			t357 = claim_text(code48_nodes, "schedule_update");
			code48_nodes.forEach(detach);
			t358 = claim_text(li43_nodes, ", ");
			code49 = claim_element(li43_nodes, "CODE", {});
			var code49_nodes = children(code49);
			t359 = claim_text(code49_nodes, "flush");
			code49_nodes.forEach(detach);
			li43_nodes.forEach(detach);
			t360 = claim_space(ul10_nodes);
			li44 = claim_element(ul10_nodes, "LI", {});
			var li44_nodes = children(li44);
			t361 = claim_text(li44_nodes, "lifecycle utils, eg: ");
			code50 = claim_element(li44_nodes, "CODE", {});
			var code50_nodes = children(code50);
			t362 = claim_text(code50_nodes, "onMount");
			code50_nodes.forEach(detach);
			t363 = claim_text(li44_nodes, ", ");
			code51 = claim_element(li44_nodes, "CODE", {});
			var code51_nodes = children(code51);
			t364 = claim_text(code51_nodes, "beforeUpdate");
			code51_nodes.forEach(detach);
			li44_nodes.forEach(detach);
			t365 = claim_space(ul10_nodes);
			li45 = claim_element(ul10_nodes, "LI", {});
			var li45_nodes = children(li45);
			t366 = claim_text(li45_nodes, "animation utils, eg: ");
			code52 = claim_element(li45_nodes, "CODE", {});
			var code52_nodes = children(code52);
			t367 = claim_text(code52_nodes, "create_animation");
			code52_nodes.forEach(detach);
			li45_nodes.forEach(detach);
			ul10_nodes.forEach(detach);
			section19_nodes.forEach(detach);
			this.h();
		},
		h() {
			attr(a0, "href", "#who-is-this-for");
			attr(a1, "href", "#overview");
			attr(a2, "href", "#parsing-source-code-into-ast");
			attr(a3, "href", "#where-can-i-find-the-parser-in-the-source-code");
			attr(a4, "href", "#where-can-i-learn-about-parsing-in-javascript");
			attr(a5, "href", "#tracking-references-and-dependencies");
			attr(a6, "href", "#a-svelte-creates-a-component-instance");
			attr(a7, "href", "#b-traverse-the-instance-script-and-module-script-ast");
			attr(a8, "href", "#c-traverse-the-template");
			attr(a9, "href", "#d-traverse-the-instance-script-ast");
			attr(a10, "href", "#e-update-css-selectors-to-make-style-declarations-component-scope");
			attr(a11, "href", "#where-can-i-find-this-in-the-source-code");
			attr(a12, "href", "#where-can-i-learn-about-traversing-in-javascript");
			attr(a13, "href", "#creating-code-blocks-and-fragments");
			attr(a14, "href", "#dom-renderer");
			attr(a15, "href", "#ssr-renderer");
			attr(a16, "href", "#where-can-i-find-the-renderer-in-the-source-code");
			attr(a17, "href", "#generate-code");
			attr(a18, "href", "#svelte-runtime");
			attr(ul3, "class", "sitemap");
			attr(ul3, "id", "sitemap");
			attr(ul3, "role", "navigation");
			attr(ul3, "aria-label", "Table of Contents");
			attr(a19, "href", "#who-is-this-for");
			attr(a19, "id", "who-is-this-for");
			attr(a20, "href", "#overview");
			attr(a20, "id", "overview");
			if (img0.src !== (img0_src_value = __build_img__0)) attr(img0, "src", img0_src_value);
			attr(img0, "alt", "Overview");
			attr(pre0, "class", "language-js");
			attr(a21, "href", "#parsing-source-code-into-ast");
			attr(a21, "id", "parsing-source-code-into-ast");
			if (img1.src !== (img1_src_value = __build_img__1)) attr(img1, "src", img1_src_value);
			attr(img1, "alt", "Step 1");
			attr(pre1, "class", "language-js");
			attr(a22, "href", "https://www.npmjs.com/package/acorn");
			attr(a22, "rel", "nofollow");
			attr(a23, "href", "https://www.npmjs.com/package/css-tree");
			attr(a23, "rel", "nofollow");
			attr(pre2, "class", "language-js");
			attr(a24, "href", "https://astexplorer.net/#/gist/828907dd1600c208a4e315962c635b4a/e1c895d49e8899a3be849a137fc557ba66eb2423");
			attr(a24, "rel", "nofollow");
			attr(a25, "href", "#where-can-i-find-the-parser-in-the-source-code");
			attr(a25, "id", "where-can-i-find-the-parser-in-the-source-code");
			attr(a26, "href", "https://github.com/sveltejs/svelte/blob/aa3dcc06d6b0fcb079ccd993fa6e3455242a2a96/src/compiler/compile/index.ts#L79");
			attr(a26, "rel", "nofollow");
			attr(a27, "href", "https://github.com/sveltejs/svelte/blob/aa3dcc06d6b0fcb079ccd993fa6e3455242a2a96/src/compiler/parse/index.ts");
			attr(a27, "rel", "nofollow");
			attr(a28, "href", "#where-can-i-learn-about-parsing-in-javascript");
			attr(a28, "id", "where-can-i-learn-about-parsing-in-javascript");
			attr(a29, "href", "/json-parser-with-javascript");
			attr(a30, "href", "#tracking-references-and-dependencies");
			attr(a30, "id", "tracking-references-and-dependencies");
			if (img2.src !== (img2_src_value = __build_img__2)) attr(img2, "src", img2_src_value);
			attr(img2, "alt", "Step 2");
			attr(pre3, "class", "language-js");
			attr(a31, "href", "#a-svelte-creates-a-component-instance");
			attr(a31, "id", "a-svelte-creates-a-component-instance");
			attr(a32, "href", "https://github.com/sveltejs/svelte/blob/aa3dcc06d6b0fcb079ccd993fa6e3455242a2a96/src/compiler/compile/Component.ts#L52");
			attr(a32, "rel", "nofollow");
			attr(a33, "href", "https://github.com/sveltejs/svelte/blob/aa3dcc06d6b0fcb079ccd993fa6e3455242a2a96/src/compiler/compile/Component.ts#L54");
			attr(a33, "rel", "nofollow");
			attr(a34, "href", "https://github.com/sveltejs/svelte/blob/aa3dcc06d6b0fcb079ccd993fa6e3455242a2a96/src/compiler/compile/Component.ts#L53");
			attr(a34, "rel", "nofollow");
			attr(a35, "href", "https://github.com/sveltejs/svelte/blob/aa3dcc06d6b0fcb079ccd993fa6e3455242a2a96/src/compiler/compile/Component.ts#L62");
			attr(a35, "rel", "nofollow");
			attr(a36, "href", "https://github.com/sveltejs/svelte/blob/aa3dcc06d6b0fcb079ccd993fa6e3455242a2a96/src/compiler/compile/Component.ts#L71");
			attr(a36, "rel", "nofollow");
			attr(a37, "href", "https://github.com/sveltejs/svelte/blob/aa3dcc06d6b0fcb079ccd993fa6e3455242a2a96/src/compiler/compile/Component.ts#L94");
			attr(a37, "rel", "nofollow");
			attr(a38, "href", "https://github.com/sveltejs/svelte/blob/aa3dcc06d6b0fcb079ccd993fa6e3455242a2a96/src/compiler/compile/Component.ts#L351");
			attr(a38, "rel", "nofollow");
			attr(a39, "href", "https://github.com/sveltejs/svelte/blob/aa3dcc06d6b0fcb079ccd993fa6e3455242a2a96/src/compiler/compile/Component.ts#L43");
			attr(a39, "rel", "nofollow");
			attr(a40, "href", "https://github.com/sveltejs/svelte/blob/aa3dcc06d6b0fcb079ccd993fa6e3455242a2a96/src/compiler/compile/Component.ts#L396");
			attr(a40, "rel", "nofollow");
			attr(a41, "href", "https://github.com/sveltejs/svelte/blob/aa3dcc06d6b0fcb079ccd993fa6e3455242a2a96/src/compiler/compile/Component.ts#L51");
			attr(a41, "rel", "nofollow");
			attr(a42, "href", "https://github.com/sveltejs/svelte/blob/aa3dcc06d6b0fcb079ccd993fa6e3455242a2a96/src/compiler/compile/Component.ts#L44");
			attr(a42, "rel", "nofollow");
			attr(a43, "href", "#b-traverse-the-instance-script-and-module-script-ast");
			attr(a43, "id", "b-traverse-the-instance-script-and-module-script-ast");
			attr(a44, "href", "#c-traverse-the-template");
			attr(a44, "id", "c-traverse-the-template");
			attr(a45, "href", "https://github.com/sveltejs/svelte/blob/aa3dcc06d6b0fcb079ccd993fa6e3455242a2a96/src/compiler/compile/nodes/Fragment.ts");
			attr(a45, "rel", "nofollow");
			attr(a46, "href", "https://github.com/sveltejs/svelte/blob/aa3dcc06d6b0fcb079ccd993fa6e3455242a2a96/src/compiler/compile/nodes/Element.ts");
			attr(a46, "rel", "nofollow");
			attr(a47, "href", "https://github.com/sveltejs/svelte/blob/aa3dcc06d6b0fcb079ccd993fa6e3455242a2a96/src/compiler/compile/nodes/Element.ts#L280");
			attr(a47, "rel", "nofollow");
			attr(a48, "href", "https://github.com/sveltejs/svelte/blob/aa3dcc06d6b0fcb079ccd993fa6e3455242a2a96/src/compiler/compile/nodes/Element.ts#L461");
			attr(a48, "rel", "nofollow");
			attr(a49, "href", "https://github.com/sveltejs/svelte/blob/aa3dcc06d6b0fcb079ccd993fa6e3455242a2a96/src/compiler/compile/nodes/Element.ts#L647");
			attr(a49, "rel", "nofollow");
			attr(a50, "href", "https://github.com/sveltejs/svelte/blob/aa3dcc06d6b0fcb079ccd993fa6e3455242a2a96/src/compiler/compile/nodes/Element.ts#L658");
			attr(a50, "rel", "nofollow");
			attr(a51, "href", "https://github.com/sveltejs/svelte/blob/aa3dcc06d6b0fcb079ccd993fa6e3455242a2a96/src/compiler/compile/nodes/Slot.ts");
			attr(a51, "rel", "nofollow");
			attr(a52, "href", "https://github.com/sveltejs/svelte/blob/aa3dcc06d6b0fcb079ccd993fa6e3455242a2a96/src/compiler/compile/nodes/EachBlock.ts");
			attr(a52, "rel", "nofollow");
			attr(a53, "href", "#d-traverse-the-instance-script-ast");
			attr(a53, "id", "d-traverse-the-instance-script-ast");
			attr(a54, "href", "#e-update-css-selectors-to-make-style-declarations-component-scope");
			attr(a54, "id", "e-update-css-selectors-to-make-style-declarations-component-scope");
			attr(a55, "href", "#where-can-i-find-this-in-the-source-code");
			attr(a55, "id", "where-can-i-find-this-in-the-source-code");
			attr(a56, "href", "https://github.com/sveltejs/svelte/blob/aa3dcc06d6b0fcb079ccd993fa6e3455242a2a96/src/compiler/compile/index.ts#L83-L90");
			attr(a56, "rel", "nofollow");
			attr(a57, "href", "https://github.com/sveltejs/svelte/blob/aa3dcc06d6b0fcb079ccd993fa6e3455242a2a96/src/compiler/compile/Component.ts");
			attr(a57, "rel", "nofollow");
			attr(a58, "href", "#where-can-i-learn-about-traversing-in-javascript");
			attr(a58, "id", "where-can-i-learn-about-traversing-in-javascript");
			attr(a59, "href", "/manipulating-ast-with-javascript#traversing-an-ast");
			attr(a60, "href", "#creating-code-blocks-and-fragments");
			attr(a60, "id", "creating-code-blocks-and-fragments");
			if (img3.src !== (img3_src_value = __build_img__3)) attr(img3, "src", img3_src_value);
			attr(img3, "alt", "Step 3");
			attr(pre4, "class", "language-js");
			attr(a61, "href", "https://svelte.dev/docs#svelte_compile");
			attr(a61, "rel", "nofollow");
			attr(a62, "href", "#dom-renderer");
			attr(a62, "id", "dom-renderer");
			attr(a63, "href", "https://github.com/sveltejs/svelte/blob/aa3dcc06d6b0fcb079ccd993fa6e3455242a2a96/src/compiler/compile/render_dom/Renderer.ts#L31");
			attr(a63, "rel", "nofollow");
			attr(a64, "href", "https://github.com/sveltejs/svelte/blob/aa3dcc06d6b0fcb079ccd993fa6e3455242a2a96/src/compiler/compile/render_dom/Renderer.ts#L28");
			attr(a64, "rel", "nofollow");
			attr(a65, "href", "https://github.com/sveltejs/svelte/blob/aa3dcc06d6b0fcb079ccd993fa6e3455242a2a96/src/compiler/compile/render_dom/Block.ts");
			attr(a65, "rel", "nofollow");
			attr(a66, "href", "/compile-svelte-in-your-head-part-1/#create_fragment");
			attr(a67, "href", "/compile-svelte-in-your-head-part-2/#ctx");
			attr(a68, "href", "https://github.com/sveltejs/svelte/blob/aa3dcc06d6b0fcb079ccd993fa6e3455242a2a96/src/compiler/compile/render_dom/wrappers/Fragment.ts");
			attr(a68, "rel", "nofollow");
			attr(a69, "href", "#ssr-renderer");
			attr(a69, "id", "ssr-renderer");
			attr(a70, "href", "https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Template_literals");
			attr(a70, "rel", "nofollow");
			attr(a71, "href", "https://github.com/sveltejs/svelte/blob/aa3dcc06d6b0fcb079ccd993fa6e3455242a2a96/src/compiler/compile/render_ssr/Renderer.ts#L63");
			attr(a71, "rel", "nofollow");
			attr(a72, "href", "https://github.com/sveltejs/svelte/blob/aa3dcc06d6b0fcb079ccd993fa6e3455242a2a96/src/compiler/compile/render_ssr/Renderer.ts#L67");
			attr(a72, "rel", "nofollow");
			attr(a73, "href", "#where-can-i-find-the-renderer-in-the-source-code");
			attr(a73, "id", "where-can-i-find-the-renderer-in-the-source-code");
			attr(a74, "href", "https://github.com/sveltejs/svelte/blob/aa3dcc06d6b0fcb079ccd993fa6e3455242a2a96/src/compiler/compile/render_dom/Renderer.ts");
			attr(a74, "rel", "nofollow");
			attr(a75, "href", "https://github.com/sveltejs/svelte/blob/aa3dcc06d6b0fcb079ccd993fa6e3455242a2a96/src/compiler/compile/render_ssr/Renderer.ts");
			attr(a75, "rel", "nofollow");
			attr(a76, "href", "#generate-code");
			attr(a76, "id", "generate-code");
			if (img4.src !== (img4_src_value = __build_img__4)) attr(img4, "src", img4_src_value);
			attr(img4, "alt", "Step 4");
			attr(pre5, "class", "language-js");
			attr(a77, "href", "https://github.com/sveltejs/svelte/blob/aa3dcc06d6b0fcb079ccd993fa6e3455242a2a96/src/compiler/compile/render_ssr/Renderer.ts#L23-L40");
			attr(a77, "rel", "nofollow");
			attr(a78, "href", "https://github.com/sveltejs/rollup-plugin-svelte");
			attr(a78, "rel", "nofollow");
			attr(a79, "href", "https://github.com/sveltejs/svelte-loader");
			attr(a79, "rel", "nofollow");
			attr(a80, "href", "#svelte-runtime");
			attr(a80, "id", "svelte-runtime");
			attr(a81, "href", "https://github.com/sveltejs/svelte/tree/aa3dcc06d6b0fcb079ccd993fa6e3455242a2a96/src/runtime/internal");
			attr(a81, "rel", "nofollow");
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
			append(ul3, ul0);
			append(ul0, li3);
			append(li3, a3);
			append(a3, t3);
			append(ul0, li4);
			append(li4, a4);
			append(a4, t4);
			append(ul3, li5);
			append(li5, a5);
			append(a5, t5);
			append(ul3, ul1);
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
			append(ul1, li12);
			append(li12, a12);
			append(a12, t12);
			append(ul3, li13);
			append(li13, a13);
			append(a13, t13);
			append(ul3, ul2);
			append(ul2, li14);
			append(li14, a14);
			append(a14, t14);
			append(ul2, li15);
			append(li15, a15);
			append(a15, t15);
			append(ul2, li16);
			append(li16, a16);
			append(a16, t16);
			append(ul3, li17);
			append(li17, a17);
			append(a17, t17);
			append(ul3, li18);
			append(li18, a18);
			append(a18, t18);
			insert(target, t19, anchor);
			insert(target, section1, anchor);
			append(section1, h20);
			append(h20, a19);
			append(a19, t20);
			append(section1, t21);
			append(section1, p0);
			append(p0, t22);
			append(section1, t23);
			append(section1, ul4);
			append(ul4, li19);
			append(li19, t24);
			append(ul4, t25);
			append(ul4, li20);
			append(li20, t26);
			insert(target, t27, anchor);
			insert(target, section2, anchor);
			append(section2, h21);
			append(h21, a20);
			append(a20, t28);
			append(section2, t29);
			append(section2, p1);
			append(p1, img0);
			append(section2, t30);
			append(section2, p2);
			append(p2, t31);
			append(section2, t32);
			append(section2, ul5);
			append(ul5, li21);
			append(li21, t33);
			append(ul5, t34);
			append(ul5, li22);
			append(li22, t35);
			append(ul5, t36);
			append(ul5, li23);
			append(li23, t37);
			append(ul5, t38);
			append(ul5, li24);
			append(li24, t39);
			append(section2, t40);
			append(section2, p3);
			append(p3, t41);
			append(section2, t42);
			append(section2, pre0);
			pre0.innerHTML = raw0_value;
			insert(target, t43, anchor);
			insert(target, section3, anchor);
			append(section3, h22);
			append(h22, a21);
			append(a21, t44);
			append(section3, t45);
			append(section3, p4);
			append(p4, img1);
			append(section3, t46);
			append(section3, pre1);
			pre1.innerHTML = raw1_value;
			append(section3, t47);
			append(section3, p5);
			append(p5, t48);
			append(section3, t49);
			append(section3, ul6);
			append(ul6, li25);
			append(li25, t50);
			append(li25, code0);
			append(code0, t51);
			append(ul6, t52);
			append(ul6, li26);
			append(li26, t53);
			append(li26, code1);
			append(code1, t54);
			append(ul6, t55);
			append(ul6, li27);
			append(li27, t56);
			append(li27, code2);
			append(code2, t57);
			append(section3, t58);
			append(section3, p6);
			append(p6, t59);
			append(p6, code3);
			append(code3, t60);
			append(p6, t61);
			append(p6, code4);
			append(code4, t62);
			append(p6, t63);
			append(section3, t64);
			append(section3, p7);
			append(p7, t65);
			append(p7, code5);
			append(code5, t66);
			append(p7, t67);
			append(p7, a22);
			append(a22, t68);
			append(p7, t69);
			append(p7, code6);
			append(code6, t70);
			append(p7, t71);
			append(p7, a23);
			append(a23, t72);
			append(p7, t73);
			append(section3, t74);
			append(section3, p8);
			append(p8, t75);
			append(p8, code7);
			append(code7, t76);
			append(p8, t77);
			append(p8, code8);
			append(code8, t78);
			append(p8, t79);
			append(section3, t80);
			append(section3, p9);
			append(p9, t81);
			append(section3, t82);
			append(section3, pre2);
			pre2.innerHTML = raw2_value;
			append(section3, t83);
			append(section3, p10);
			append(p10, t84);
			append(p10, a24);
			append(a24, t85);
			append(p10, t86);
			append(p10, strong0);
			append(strong0, t87);
			append(p10, t88);
			insert(target, t89, anchor);
			insert(target, section4, anchor);
			append(section4, h30);
			append(h30, a25);
			append(a25, t90);
			append(section4, t91);
			append(section4, p11);
			append(p11, t92);
			append(p11, a26);
			append(a26, t93);
			append(p11, t94);
			append(p11, a27);
			append(a27, t95);
			append(p11, t96);
			insert(target, t97, anchor);
			insert(target, section5, anchor);
			append(section5, h31);
			append(h31, a28);
			append(a28, t98);
			append(section5, t99);
			append(section5, p12);
			append(p12, t100);
			append(p12, a29);
			append(a29, t101);
			append(p12, t102);
			append(section5, t103);
			append(section5, p13);
			append(p13, t104);
			insert(target, t105, anchor);
			insert(target, section6, anchor);
			append(section6, h23);
			append(h23, a30);
			append(a30, t106);
			append(section6, t107);
			append(section6, p14);
			append(p14, img2);
			append(section6, t108);
			append(section6, pre3);
			pre3.innerHTML = raw3_value;
			append(section6, t109);
			append(section6, p15);
			append(p15, t110);
			insert(target, t111, anchor);
			insert(target, section7, anchor);
			append(section7, h32);
			append(h32, a31);
			append(a31, t112);
			append(a31, code9);
			append(code9, t113);
			append(a31, t114);
			append(section7, t115);
			append(section7, p16);
			append(p16, t116);
			append(p16, code10);
			append(code10, t117);
			append(p16, t118);
			append(section7, t119);
			append(section7, ul7);
			append(ul7, li28);
			append(li28, t120);
			append(li28, a32);
			append(a32, code11);
			append(code11, t121);
			append(ul7, t122);
			append(ul7, li29);
			append(li29, t123);
			append(li29, a33);
			append(a33, code12);
			append(code12, t124);
			append(li29, t125);
			append(li29, a34);
			append(a34, code13);
			append(code13, t126);
			append(ul7, t127);
			append(ul7, li30);
			append(li30, t128);
			append(li30, a35);
			append(a35, code14);
			append(code14, t129);
			append(ul7, t130);
			append(ul7, li31);
			append(li31, t131);
			append(li31, a36);
			append(a36, code15);
			append(code15, t132);
			append(ul7, t133);
			append(ul7, li32);
			append(li32, t134);
			append(li32, a37);
			append(a37, code16);
			append(code16, t135);
			append(ul7, t136);
			append(ul7, li33);
			append(li33, a38);
			append(a38, t137);
			append(li33, t138);
			append(ul7, t139);
			append(ul7, li34);
			append(li34, a39);
			append(a39, t140);
			append(li34, t141);
			append(li34, a40);
			append(a40, t142);
			append(ul7, t143);
			append(ul7, li35);
			append(li35, a41);
			append(a41, t144);
			append(li35, t145);
			append(li35, a42);
			append(a42, t146);
			insert(target, t147, anchor);
			insert(target, section8, anchor);
			append(section8, h33);
			append(h33, a43);
			append(a43, t148);
			append(section8, t149);
			append(section8, p17);
			append(p17, code17);
			append(code17, t150);
			append(p17, t151);
			append(p17, strong1);
			append(strong1, t152);
			append(p17, t153);
			append(section8, t154);
			append(section8, p18);
			append(p18, t155);
			append(p18, code18);
			append(code18, t156);
			append(p18, t157);
			insert(target, t158, anchor);
			insert(target, section9, anchor);
			append(section9, h34);
			append(h34, a44);
			append(a44, t159);
			append(section9, t160);
			append(section9, p19);
			append(p19, t161);
			append(p19, a45);
			append(a45, t162);
			append(p19, t163);
			append(section9, t164);
			append(section9, p20);
			append(p20, t165);
			append(section9, t166);
			append(section9, p21);
			append(p21, strong2);
			append(strong2, t167);
			append(section9, t168);
			append(section9, p22);
			append(p22, t169);
			append(p22, code19);
			append(code19, t170);
			append(p22, t171);
			append(p22, code20);
			append(code20, t172);
			append(p22, t173);
			append(section9, t174);
			append(section9, p23);
			append(p23, strong3);
			append(strong3, t175);
			append(section9, t176);
			append(section9, p24);
			append(p24, code21);
			append(code21, t177);
			append(p24, t178);
			append(p24, code22);
			append(code22, t179);
			append(p24, t180);
			append(p24, code23);
			append(code23, t181);
			append(p24, t182);
			append(section9, t183);
			append(section9, p25);
			append(p25, t184);
			append(section9, t185);
			append(section9, ul8);
			append(ul8, li36);
			append(li36, a46);
			append(a46, t186);
			append(li36, t187);
			append(li36, a47);
			append(a47, t188);
			append(li36, t189);
			append(li36, a48);
			append(a48, t190);
			append(li36, t191);
			append(li36, a49);
			append(a49, t192);
			append(li36, t193);
			append(li36, a50);
			append(a50, t194);
			append(li36, t195);
			append(ul8, t196);
			append(ul8, li37);
			append(li37, a51);
			append(a51, t197);
			append(li37, t198);
			append(li37, code24);
			append(code24, t199);
			append(li37, t200);
			append(ul8, t201);
			append(ul8, li38);
			append(li38, a52);
			append(a52, t202);
			append(li38, t203);
			append(li38, code25);
			append(code25, t204);
			append(li38, t205);
			append(li38, code26);
			append(code26, t206);
			append(li38, t207);
			append(ul8, t208);
			append(ul8, li39);
			append(li39, t209);
			insert(target, t210, anchor);
			insert(target, section10, anchor);
			append(section10, h35);
			append(h35, a53);
			append(a53, t211);
			append(section10, t212);
			append(section10, p26);
			append(p26, t213);
			append(section10, t214);
			append(section10, p27);
			append(p27, t215);
			append(section10, t216);
			append(section10, ul9);
			append(ul9, li40);
			append(li40, t217);
			append(li40, code27);
			append(code27, t218);
			append(li40, t219);
			append(ul9, t220);
			append(ul9, li41);
			append(li41, t221);
			insert(target, t222, anchor);
			insert(target, section11, anchor);
			append(section11, h36);
			append(h36, a54);
			append(a54, t223);
			append(section11, t224);
			append(section11, p28);
			append(p28, t225);
			append(p28, code28);
			append(code28, t226);
			append(p28, t227);
			append(section11, t228);
			append(section11, p29);
			append(p29, t229);
			insert(target, t230, anchor);
			insert(target, section12, anchor);
			append(section12, h37);
			append(h37, a55);
			append(a55, t231);
			append(section12, t232);
			append(section12, p30);
			append(p30, t233);
			append(p30, a56);
			append(a56, t234);
			append(p30, t235);
			append(p30, code29);
			append(code29, t236);
			append(p30, t237);
			append(p30, a57);
			append(a57, t238);
			append(p30, t239);
			insert(target, t240, anchor);
			insert(target, section13, anchor);
			append(section13, h38);
			append(h38, a58);
			append(a58, t241);
			append(section13, t242);
			append(section13, p31);
			append(p31, t243);
			append(p31, a59);
			append(a59, t244);
			append(p31, t245);
			insert(target, t246, anchor);
			insert(target, section14, anchor);
			append(section14, h24);
			append(h24, a60);
			append(a60, t247);
			append(section14, t248);
			append(section14, p32);
			append(p32, img3);
			append(section14, t249);
			append(section14, pre4);
			pre4.innerHTML = raw4_value;
			append(section14, t250);
			append(section14, p33);
			append(p33, t251);
			append(p33, code30);
			append(code30, t252);
			append(p33, t253);
			append(p33, em);
			append(em, t254);
			append(em, a61);
			append(a61, t255);
			append(a61, code31);
			append(code31, t256);
			append(a61, t257);
			append(em, t258);
			append(p33, t259);
			append(p33, code32);
			append(code32, t260);
			append(p33, t261);
			insert(target, t262, anchor);
			insert(target, section15, anchor);
			append(section15, h39);
			append(h39, a62);
			append(a62, t263);
			append(section15, t264);
			append(section15, p34);
			append(p34, t265);
			append(p34, a63);
			append(a63, t266);
			append(p34, t267);
			append(p34, a64);
			append(a64, t268);
			append(p34, t269);
			append(section15, t270);
			append(section15, p35);
			append(p35, t271);
			append(p35, a65);
			append(a65, t272);
			append(p35, t273);
			append(p35, a66);
			append(a66, code33);
			append(code33, t274);
			append(p35, t275);
			append(section15, t276);
			append(section15, p36);
			append(p36, t277);
			append(p36, a67);
			append(a67, t278);
			append(p36, t279);
			append(p36, code34);
			append(code34, t280);
			append(p36, t281);
			append(section15, t282);
			append(section15, p37);
			append(p37, t283);
			append(p37, a68);
			append(a68, t284);
			append(p37, t285);
			append(section15, t286);
			append(section15, p38);
			append(p38, t287);
			append(p38, code35);
			append(code35, t288);
			append(p38, t289);
			insert(target, t290, anchor);
			insert(target, section16, anchor);
			append(section16, h310);
			append(h310, a69);
			append(a69, t291);
			append(section16, t292);
			append(section16, p39);
			append(p39, t293);
			append(p39, a70);
			append(a70, t294);
			append(p39, t295);
			append(p39, a71);
			append(a71, code36);
			append(code36, t296);
			append(p39, t297);
			append(p39, a72);
			append(a72, code37);
			append(code37, t298);
			append(p39, t299);
			insert(target, t300, anchor);
			insert(target, section17, anchor);
			append(section17, h311);
			append(h311, a73);
			append(a73, t301);
			append(a73, code38);
			append(code38, t302);
			append(a73, t303);
			append(section17, t304);
			append(section17, p40);
			append(p40, t305);
			append(p40, a74);
			append(a74, t306);
			append(p40, t307);
			append(p40, a75);
			append(a75, t308);
			append(p40, t309);
			insert(target, t310, anchor);
			insert(target, section18, anchor);
			append(section18, h25);
			append(h25, a76);
			append(a76, t311);
			append(section18, t312);
			append(section18, p41);
			append(p41, img4);
			append(section18, t313);
			append(section18, pre5);
			pre5.innerHTML = raw5_value;
			append(section18, t314);
			append(section18, p42);
			append(p42, t315);
			append(section18, t316);
			append(section18, p43);
			append(p43, strong4);
			append(strong4, t317);
			append(p43, t318);
			append(p43, code39);
			append(code39, t319);
			append(p43, t320);
			append(p43, code40);
			append(code40, t321);
			append(p43, t322);
			append(p43, code41);
			append(code41, t323);
			append(p43, t324);
			append(p43, code42);
			append(code42, t325);
			append(p43, t326);
			append(section18, t327);
			append(section18, p44);
			append(p44, strong5);
			append(strong5, t328);
			append(p44, t329);
			append(p44, a77);
			append(a77, t330);
			append(p44, t331);
			append(section18, t332);
			append(section18, p45);
			append(p45, t333);
			append(p45, code43);
			append(code43, t334);
			append(p45, t335);
			append(p45, code44);
			append(code44, t336);
			append(p45, t337);
			append(p45, a78);
			append(a78, t338);
			append(p45, t339);
			append(p45, a79);
			append(a79, t340);
			append(p45, t341);
			insert(target, t342, anchor);
			insert(target, section19, anchor);
			append(section19, h26);
			append(h26, a80);
			append(a80, t343);
			append(section19, t344);
			append(section19, p46);
			append(p46, t345);
			append(p46, a81);
			append(a81, t346);
			append(p46, t347);
			append(section19, t348);
			append(section19, ul10);
			append(ul10, li42);
			append(li42, t349);
			append(li42, code45);
			append(code45, t350);
			append(li42, t351);
			append(li42, code46);
			append(code46, t352);
			append(li42, t353);
			append(li42, code47);
			append(code47, t354);
			append(ul10, t355);
			append(ul10, li43);
			append(li43, t356);
			append(li43, code48);
			append(code48, t357);
			append(li43, t358);
			append(li43, code49);
			append(code49, t359);
			append(ul10, t360);
			append(ul10, li44);
			append(li44, t361);
			append(li44, code50);
			append(code50, t362);
			append(li44, t363);
			append(li44, code51);
			append(code51, t364);
			append(ul10, t365);
			append(ul10, li45);
			append(li45, t366);
			append(li45, code52);
			append(code52, t367);
		},
		p: noop,
		d(detaching) {
			if (detaching) detach(section0);
			if (detaching) detach(t19);
			if (detaching) detach(section1);
			if (detaching) detach(t27);
			if (detaching) detach(section2);
			if (detaching) detach(t43);
			if (detaching) detach(section3);
			if (detaching) detach(t89);
			if (detaching) detach(section4);
			if (detaching) detach(t97);
			if (detaching) detach(section5);
			if (detaching) detach(t105);
			if (detaching) detach(section6);
			if (detaching) detach(t111);
			if (detaching) detach(section7);
			if (detaching) detach(t147);
			if (detaching) detach(section8);
			if (detaching) detach(t158);
			if (detaching) detach(section9);
			if (detaching) detach(t210);
			if (detaching) detach(section10);
			if (detaching) detach(t222);
			if (detaching) detach(section11);
			if (detaching) detach(t230);
			if (detaching) detach(section12);
			if (detaching) detach(t240);
			if (detaching) detach(section13);
			if (detaching) detach(t246);
			if (detaching) detach(section14);
			if (detaching) detach(t262);
			if (detaching) detach(section15);
			if (detaching) detach(t290);
			if (detaching) detach(section16);
			if (detaching) detach(t300);
			if (detaching) detach(section17);
			if (detaching) detach(t310);
			if (detaching) detach(section18);
			if (detaching) detach(t342);
			if (detaching) detach(section19);
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
	"title": "The Svelte Compiler Handbook",
	"date": "2020-04-05T08:00:00Z",
	"tags": ["Svelte", "JavaScript", "compiler"],
	"description": "The Svelte compilation process can be broken down into 4-steps, 1) parsing source code into AST, 2) tracking references and dependencies, 3) creating code blocks and fragments, and 4) generate code.",
	"slug": "the-svelte-compiler-handbook",
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
