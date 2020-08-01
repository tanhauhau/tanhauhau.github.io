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

var __build_img__3 = "e562d3abc67cbf1b.png";

var __build_img__2 = "21ed545adc4e6012.png";

var __build_img__1 = "7dd71cf690a27943.png";

var __build_img__0 = "dce1233e424bfec6.png";

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

var image = "https://lihautan.com/12-line-rollup-plugin/assets/hero-twitter-2f46c1f3.jpg";

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
					"@id": "https%3A%2F%2Flihautan.com%2F12-line-rollup-plugin",
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
			attr(meta11, "content", "https%3A%2F%2Flihautan.com%2F12-line-rollup-plugin");
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
							"@id": "https%3A%2F%2Flihautan.com%2F12-line-rollup-plugin",
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

/* content/blog/12-line-rollup-plugin/@@page-markup.svelte generated by Svelte v3.24.0 */

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
	let t4;
	let section1;
	let h20;
	let a4;
	let t5;
	let t6;
	let p0;
	let t7;
	let a5;
	let t8;
	let t9;
	let a6;
	let t10;
	let t11;
	let a7;
	let t12;
	let t13;
	let t14;
	let pre0;

	let raw0_value = `
<code class="language-js"><span class="token keyword">const</span> worker <span class="token operator">=</span> <span class="token keyword">new</span> <span class="token class-name">Worker</span><span class="token punctuation">(</span><span class="token string">'/build/worker.js'</span><span class="token punctuation">)</span><span class="token punctuation">;</span></code>` + "";

	let t15;
	let p1;
	let t16;
	let em0;
	let t17;
	let t18;
	let em1;
	let t19;
	let t20;
	let t21;
	let p2;
	let t22;
	let a8;
	let t23;
	let t24;
	let t25;
	let pre1;

	let raw1_value = `
<code class="language-js"><span class="token comment">// filename: /build/worker.js</span>
<span class="token punctuation">(</span><span class="token keyword">function</span><span class="token punctuation">(</span><span class="token parameter">l<span class="token punctuation">,</span> r</span><span class="token punctuation">)</span> <span class="token punctuation">&#123;</span> <span class="token keyword">if</span> <span class="token punctuation">(</span>l<span class="token punctuation">.</span><span class="token function">getElementById</span><span class="token punctuation">(</span><span class="token string">'livereloadscript'</span><span class="token punctuation">)</span><span class="token punctuation">)</span> <span class="token keyword">return</span><span class="token punctuation">;</span> r <span class="token operator">=</span> l<span class="token punctuation">.</span><span class="token function">createElement</span><span class="token punctuation">(</span><span class="token string">'script'</span><span class="token punctuation">)</span><span class="token punctuation">;</span> r<span class="token punctuation">.</span>async <span class="token operator">=</span> <span class="token number">1</span><span class="token punctuation">;</span> r<span class="token punctuation">.</span>src <span class="token operator">=</span> <span class="token string">'//'</span> <span class="token operator">+</span> <span class="token punctuation">(</span>window<span class="token punctuation">.</span>location<span class="token punctuation">.</span>host <span class="token operator">||</span> <span class="token string">'localhost'</span><span class="token punctuation">)</span><span class="token punctuation">.</span><span class="token function">split</span><span class="token punctuation">(</span><span class="token string">':'</span><span class="token punctuation">)</span><span class="token punctuation">[</span><span class="token number">0</span><span class="token punctuation">]</span> <span class="token operator">+</span> <span class="token string">':35729/livereload.js?snipver=1'</span><span class="token punctuation">;</span> r<span class="token punctuation">.</span>id <span class="token operator">=</span> <span class="token string">'livereloadscript'</span><span class="token punctuation">;</span> l<span class="token punctuation">.</span>head<span class="token punctuation">.</span><span class="token function">appendChild</span><span class="token punctuation">(</span>r<span class="token punctuation">)</span> <span class="token punctuation">&#125;</span><span class="token punctuation">)</span><span class="token punctuation">(</span>window<span class="token punctuation">.</span>document<span class="token punctuation">)</span><span class="token punctuation">;</span>

<span class="token comment">// worker code ...</span></code>` + "";

	let t26;
	let p3;
	let t27;
	let code0;
	let t28;
	let t29;
	let t30;
	let p4;
	let img0;
	let img0_src_value;
	let t31;
	let p5;
	let t32;
	let a9;
	let t33;
	let t34;
	let em2;
	let t35;
	let t36;
	let t37;
	let p6;
	let t38;
	let em3;
	let t39;
	let t40;
	let p7;
	let t41;
	let t42;
	let section2;
	let h21;
	let a10;
	let t43;
	let t44;
	let p8;
	let t45;
	let em4;
	let t46;
	let t47;
	let t48;
	let p9;
	let t49;
	let a11;
	let t50;
	let t51;
	let em5;
	let t52;
	let t53;
	let t54;
	let p10;
	let img1;
	let img1_src_value;
	let t55;
	let p11;
	let t56;
	let t57;
	let p12;
	let img2;
	let img2_src_value;
	let t58;
	let p13;
	let t59;
	let t60;
	let p14;
	let img3;
	let img3_src_value;
	let t61;
	let p15;
	let t62;
	let t63;
	let blockquote0;
	let p16;
	let strong0;
	let t64;
	let t65;
	let p17;
	let t66;
	let em6;
	let t67;
	let t68;
	let t69;
	let p18;
	let t70;
	let t71;
	let blockquote1;
	let p19;
	let t72;
	let strong1;
	let t73;
	let t74;
	let strong2;
	let t75;
	let t76;
	let t77;
	let section3;
	let h22;
	let a12;
	let t78;
	let t79;
	let p20;
	let t80;
	let em7;
	let t81;
	let t82;
	let t83;
	let p21;
	let t84;
	let code1;
	let t85;
	let t86;
	let a13;
	let t87;
	let t88;
	let a14;
	let t89;
	let t90;
	let a15;
	let t91;
	let t92;
	let t93;
	let p22;
	let t94;
	let t95;
	let pre2;

	let raw2_value = `
<code class="language-js"><span class="token comment">// filename: rollup-plugin-xxx.js</span>

module<span class="token punctuation">.</span><span class="token function-variable function">exports</span> <span class="token operator">=</span> <span class="token keyword">function</span><span class="token punctuation">(</span><span class="token parameter">options</span><span class="token punctuation">)</span> <span class="token punctuation">&#123;</span>
  <span class="token comment">// ...</span>
  <span class="token keyword">return</span> <span class="token punctuation">&#123;</span>
    name<span class="token punctuation">:</span> <span class="token string">'plugin-name'</span><span class="token punctuation">,</span>
    <span class="token function">load</span><span class="token punctuation">(</span><span class="token punctuation">)</span> <span class="token punctuation">&#123;</span> <span class="token comment">/* ... */</span> <span class="token punctuation">&#125;</span><span class="token punctuation">,</span>
    <span class="token function">resolveId</span><span class="token punctuation">(</span><span class="token punctuation">)</span> <span class="token punctuation">&#123;</span> <span class="token comment">/* ... */</span> <span class="token punctuation">&#125;</span><span class="token punctuation">,</span>
    <span class="token function">generateBundle</span><span class="token punctuation">(</span><span class="token punctuation">)</span> <span class="token punctuation">&#123;</span> <span class="token comment">/* ... */</span> <span class="token punctuation">&#125;</span><span class="token punctuation">,</span>
    <span class="token comment">// ...</span>
  <span class="token punctuation">&#125;</span>
<span class="token punctuation">&#125;</span></code>` + "";

	let t96;
	let p23;
	let t97;
	let t98;
	let ul1;
	let li4;
	let t99;
	let t100;
	let li5;
	let t101;
	let code2;
	let t102;
	let t103;
	let t104;
	let li6;
	let t105;
	let em8;
	let t106;
	let t107;
	let em9;
	let t108;
	let t109;
	let t110;
	let p24;
	let t111;
	let code3;
	let t112;
	let t113;
	let t114;
	let pre3;

	let raw3_value = `
<code class="language-js"><span class="token comment">// filename: rollup.config.js</span>
<span class="token keyword">export</span> <span class="token keyword">default</span> <span class="token punctuation">&#123;</span>
  plugins<span class="token punctuation">:</span> <span class="token punctuation">[</span>
    <span class="token comment">// ...</span>
    <span class="token comment">// highlight-start</span>
    <span class="token punctuation">&#123;</span>
      name<span class="token punctuation">:</span> <span class="token string">'copy-worker'</span><span class="token punctuation">,</span>
      <span class="token function">generateBundle</span><span class="token punctuation">(</span><span class="token punctuation">)</span> <span class="token punctuation">&#123;</span>
        fs<span class="token punctuation">.</span><span class="token function">copyFileSync</span><span class="token punctuation">(</span>
          path<span class="token punctuation">.</span><span class="token function">resolve</span><span class="token punctuation">(</span><span class="token string">'./src/worker.js'</span><span class="token punctuation">)</span><span class="token punctuation">,</span>
          path<span class="token punctuation">.</span><span class="token function">resolve</span><span class="token punctuation">(</span><span class="token string">'./public/build/worker.js'</span><span class="token punctuation">)</span>
        <span class="token punctuation">)</span><span class="token punctuation">;</span>
      <span class="token punctuation">&#125;</span>
    <span class="token punctuation">&#125;</span>
    <span class="token comment">// highlight-end</span>
  <span class="token punctuation">]</span><span class="token punctuation">,</span>
<span class="token punctuation">&#125;</span></code>` + "";

	let t115;
	let p25;
	let t116;
	let t117;
	let p26;
	let t118;
	let code4;
	let t119;
	let t120;
	let code5;
	let t121;
	let t122;
	let t123;
	let p27;
	let t124;
	let code6;
	let t125;
	let t126;
	let t127;
	let p28;
	let t128;
	let a16;
	let t129;
	let t130;
	let t131;
	let p29;
	let t132;
	let em10;
	let t133;
	let t134;
	let em11;
	let t135;
	let t136;
	let a17;
	let t137;
	let t138;
	let t139;
	let p30;
	let t140;
	let a18;
	let code7;
	let t141;
	let t142;
	let a19;
	let t143;
	let t144;
	let t145;
	let blockquote2;
	let p31;
	let t146;
	let t147;
	let p32;
	let t148;
	let t149;
	let pre4;

	let raw4_value = `
<code class="language-js"><span class="token keyword">export</span> <span class="token keyword">default</span> <span class="token punctuation">&#123;</span>
  plugins<span class="token punctuation">:</span> <span class="token punctuation">[</span>
    <span class="token comment">// ...</span>
    <span class="token punctuation">&#123;</span>
      name<span class="token punctuation">:</span> <span class="token string">'copy-worker'</span><span class="token punctuation">,</span>
      <span class="token comment">// highlight-start</span>
      <span class="token function">load</span><span class="token punctuation">(</span><span class="token punctuation">)</span> <span class="token punctuation">&#123;</span>
        <span class="token keyword">this</span><span class="token punctuation">.</span><span class="token function">addWatchFile</span><span class="token punctuation">(</span>path<span class="token punctuation">.</span><span class="token function">resolve</span><span class="token punctuation">(</span><span class="token string">'./src/worker.js'</span><span class="token punctuation">)</span><span class="token punctuation">)</span><span class="token punctuation">;</span>
      <span class="token punctuation">&#125;</span><span class="token punctuation">,</span>
      <span class="token comment">// highlight-end</span>
      <span class="token function">generateBundle</span><span class="token punctuation">(</span><span class="token punctuation">)</span> <span class="token punctuation">&#123;</span>
        fs<span class="token punctuation">.</span><span class="token function">copyFileSync</span><span class="token punctuation">(</span>
          path<span class="token punctuation">.</span><span class="token function">resolve</span><span class="token punctuation">(</span><span class="token string">'./src/worker.js'</span><span class="token punctuation">)</span><span class="token punctuation">,</span>
          path<span class="token punctuation">.</span><span class="token function">resolve</span><span class="token punctuation">(</span><span class="token string">'./public/build/worker.js'</span><span class="token punctuation">)</span>
        <span class="token punctuation">)</span><span class="token punctuation">;</span>
      <span class="token punctuation">&#125;</span>
    <span class="token punctuation">&#125;</span>
  <span class="token punctuation">]</span><span class="token punctuation">,</span>
<span class="token punctuation">&#125;</span></code>` + "";

	let t150;
	let p33;
	let t151;
	let t152;
	let section4;
	let h23;
	let a20;
	let t153;
	let t154;
	let p34;
	let t155;
	let t156;
	let p35;
	let t157;
	let strong3;
	let t158;
	let t159;
	let t160;
	let p36;
	let t161;
	let t162;
	let p37;
	let strong4;
	let t163;
	let t164;
	let p38;
	let t165;
	let t166;
	let p39;
	let t167;
	let code8;
	let t168;
	let t169;
	let t170;
	let p40;
	let strong5;
	let t171;
	let t172;
	let p41;
	let t173;
	let strong6;
	let t174;
	let t175;
	let strong7;
	let t176;
	let t177;
	let t178;
	let p42;
	let t179;

	return {
		c() {
			section0 = element("section");
			ul0 = element("ul");
			li0 = element("li");
			a0 = element("a");
			t0 = text("Background");
			li1 = element("li");
			a1 = element("a");
			t1 = text("Need something? Install a plugin!");
			li2 = element("li");
			a2 = element("a");
			t2 = text("Writing a Rollup plugin");
			li3 = element("li");
			a3 = element("a");
			t3 = text("Closing Notes");
			t4 = space();
			section1 = element("section");
			h20 = element("h2");
			a4 = element("a");
			t5 = text("Background");
			t6 = space();
			p0 = element("p");
			t7 = text("I was building a web application using ");
			a5 = element("a");
			t8 = text("Svelte");
			t9 = text(" and ");
			a6 = element("a");
			t10 = text("Rollup");
			t11 = text(" this morning. I needed to use a ");
			a7 = element("a");
			t12 = text("web worker");
			t13 = text(", which the worker script has to be in another file:");
			t14 = space();
			pre0 = element("pre");
			t15 = space();
			p1 = element("p");
			t16 = text("So naturally, I was thinking of having 2 entries for my rollup application: ");
			em0 = element("em");
			t17 = text("the main app");
			t18 = text(" and ");
			em1 = element("em");
			t19 = text("the worker");
			t20 = text(".");
			t21 = space();
			p2 = element("p");
			t22 = text("It works fine, except the fact that the ");
			a8 = element("a");
			t23 = text("rollup-plugin-livereload");
			t24 = text(" injected a livereload script to every output file:");
			t25 = space();
			pre1 = element("pre");
			t26 = space();
			p3 = element("p");
			t27 = text("The livereload script includes a reference to ");
			code0 = element("code");
			t28 = text("window");
			t29 = text(", which is not available to the worker script:");
			t30 = space();
			p4 = element("p");
			img0 = element("img");
			t31 = space();
			p5 = element("p");
			t32 = text("I looked into ");
			a9 = element("a");
			t33 = text("the docs of the rollup-plugin-livereload");
			t34 = text(", it doesn't seemed to have a option to exclude files from adding the ");
			em2 = element("em");
			t35 = text("livereload script");
			t36 = text(".");
			t37 = space();
			p6 = element("p");
			t38 = text("At this point, I was thinking to myself, ");
			em3 = element("em");
			t39 = text("\"I just need to copy the worker.js into the 'build/' folder, I don't need anything else, how hard can that be?\"");
			t40 = space();
			p7 = element("p");
			t41 = text("It turns out harder than I imagined. 🤮");
			t42 = space();
			section2 = element("section");
			h21 = element("h2");
			a10 = element("a");
			t43 = text("Need something? Install a plugin!");
			t44 = space();
			p8 = element("p");
			t45 = text("In todays JavaScript landscape, there's a ");
			em4 = element("em");
			t46 = text("\"node_module\"");
			t47 = text(" for everything.");
			t48 = space();
			p9 = element("p");
			t49 = text("So I ");
			a11 = element("a");
			t50 = text("googled");
			t51 = space();
			em5 = element("em");
			t52 = text("\"rollup plugin copy files\"");
			t53 = text(", without a suprise, there are multiple rollup plugins published to npm:");
			t54 = space();
			p10 = element("p");
			img1 = element("img");
			t55 = space();
			p11 = element("p");
			t56 = text("So I decided to install the first plugin, because it has the highest weekly downloads:");
			t57 = space();
			p12 = element("p");
			img2 = element("img");
			t58 = space();
			p13 = element("p");
			t59 = text("When I installed the plugin, I realise I was installing much more than I needed:");
			t60 = space();
			p14 = element("p");
			img3 = element("img");
			t61 = space();
			p15 = element("p");
			t62 = text("Remember, my use case is simple:");
			t63 = space();
			blockquote0 = element("blockquote");
			p16 = element("p");
			strong0 = element("strong");
			t64 = text("I just need to copy the worker.js into the 'build/' folder.");
			t65 = space();
			p17 = element("p");
			t66 = text("I ");
			em6 = element("em");
			t67 = text("don't need any bells and whistles");
			t68 = text(" this plugin is providing me. 🙈");
			t69 = space();
			p18 = element("p");
			t70 = text("So I uninstalled the plugin, thinking:");
			t71 = space();
			blockquote1 = element("blockquote");
			p19 = element("p");
			t72 = text("How hard is it to ");
			strong1 = element("strong");
			t73 = text("write a plugin");
			t74 = text(" that ");
			strong2 = element("strong");
			t75 = text("just");
			t76 = text(" copy the worker.js into the 'build/' folder?");
			t77 = space();
			section3 = element("section");
			h22 = element("h2");
			a12 = element("a");
			t78 = text("Writing a Rollup plugin");
			t79 = space();
			p20 = element("p");
			t80 = text("Senpai once told me, ");
			em7 = element("em");
			t81 = text("\"writing rollup plugins is very straightforward,\"");
			t82 = text(", yet, no one told me how to get started writing it.");
			t83 = space();
			p21 = element("p");
			t84 = text("So, I dug into ");
			code1 = element("code");
			t85 = text("node_modules/");
			t86 = text(", and start skimming through the rollup plugins I have installed: ");
			a13 = element("a");
			t87 = text("rollup-plugin-svelte");
			t88 = text(", ");
			a14 = element("a");
			t89 = text("rollup-plugin-node-resolve");
			t90 = text(", ");
			a15 = element("a");
			t91 = text("rollup-plugin-terser");
			t92 = text(", ...");
			t93 = space();
			p22 = element("p");
			t94 = text("And I noticed a common pattern:");
			t95 = space();
			pre2 = element("pre");
			t96 = space();
			p23 = element("p");
			t97 = text("So I guess, this is the general structure of a rollup plugin:");
			t98 = space();
			ul1 = element("ul");
			li4 = element("li");
			t99 = text("It's an object, ...");
			t100 = space();
			li5 = element("li");
			t101 = text("with a property called ");
			code2 = element("code");
			t102 = text("name");
			t103 = text(" for the name of the plugin,");
			t104 = space();
			li6 = element("li");
			t105 = text("and functions like ");
			em8 = element("em");
			t106 = text("\"load\"");
			t107 = text(", ");
			em9 = element("em");
			t108 = text("\"load\"");
			t109 = text(", ... that would be called by rollup when the time is right 🤔");
			t110 = space();
			p24 = element("p");
			t111 = text("OK. I know what I need, I need to copy my ");
			code3 = element("code");
			t112 = text("worker.js");
			t113 = text(" when rollup is generating a bundle:");
			t114 = space();
			pre3 = element("pre");
			t115 = space();
			p25 = element("p");
			t116 = text("Great! It works! 😎");
			t117 = space();
			p26 = element("p");
			t118 = text("But, when I change the ");
			code4 = element("code");
			t119 = text("worker.js");
			t120 = text(" file, the ");
			code5 = element("code");
			t121 = text("build/worker.js");
			t122 = text(" is not updated. 😞");
			t123 = space();
			p27 = element("p");
			t124 = text("That's because the ");
			code6 = element("code");
			t125 = text("worker.js");
			t126 = text(" is not watched!");
			t127 = space();
			p28 = element("p");
			t128 = text("After much googling, I ended up reading through the official docs of ");
			a16 = element("a");
			t129 = text("Rollup");
			t130 = text(".");
			t131 = space();
			p29 = element("p");
			t132 = text("I learned that the functions like ");
			em10 = element("em");
			t133 = text("\"load\"");
			t134 = text(", ");
			em11 = element("em");
			t135 = text("\"generateBundle\"");
			t136 = text(", ... are called ");
			a17 = element("a");
			t137 = text("\"hooks\"");
			t138 = text(", and the docs explained when these hooks will be called, the arguments and the expected return value.");
			t139 = space();
			p30 = element("p");
			t140 = text("In the docs, I found ");
			a18 = element("a");
			code7 = element("code");
			t141 = text("this.addWatchFile(id: string)");
			t142 = text(" under ");
			a19 = element("a");
			t143 = text("plugin context");
			t144 = text(", which according to the docs,");
			t145 = space();
			blockquote2 = element("blockquote");
			p31 = element("p");
			t146 = text("[...] can be used to add additional files to be monitored by watch mode.");
			t147 = space();
			p32 = element("p");
			t148 = text("Sounds exactly what I am looking for! 😁");
			t149 = space();
			pre4 = element("pre");
			t150 = space();
			p33 = element("p");
			t151 = text("Great! It works! 🎉🎉");
			t152 = space();
			section4 = element("section");
			h23 = element("h2");
			a20 = element("a");
			t153 = text("Closing Notes");
			t154 = space();
			p34 = element("p");
			t155 = text("After some researching, I wrote simple rollup plugin in 12 lines of code, that copies the worker.js into \"build/\" folder.");
			t156 = space();
			p35 = element("p");
			t157 = text("This is something custom and specific, and ");
			strong3 = element("strong");
			t158 = text("it works perfectly fine");
			t159 = text(".");
			t160 = space();
			p36 = element("p");
			t161 = text("So, why would I install a package that has so many files and dependencies, just to do a simple and specific task?");
			t162 = space();
			p37 = element("p");
			strong4 = element("strong");
			t163 = text("Am I going to publish my plugin to npm?");
			t164 = space();
			p38 = element("p");
			t165 = text("No. If you have a similar use case, you are free to copy these 12 lines of code.");
			t166 = space();
			p39 = element("p");
			t167 = text("At the moment, I am having these 12 lines of code in my ");
			code8 = element("code");
			t168 = text("rollup.config.js");
			t169 = text(" and have no intention to extract it out into its own package.");
			t170 = space();
			p40 = element("p");
			strong5 = element("strong");
			t171 = text("What about DRY? What if you/someone else have the same use case, wouldn't it great to have it as a package?");
			t172 = space();
			p41 = element("p");
			t173 = text("Sorry. No. Before ");
			strong6 = element("strong");
			t174 = text("DRY (Dont Repeat Yourself)");
			t175 = text(", there's ");
			strong7 = element("strong");
			t176 = text("YAGNI (You aren't gonna need it)");
			t177 = text(".");
			t178 = space();
			p42 = element("p");
			t179 = text("Abstract code only when you need to.");
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
			t0 = claim_text(a0_nodes, "Background");
			a0_nodes.forEach(detach);
			li0_nodes.forEach(detach);
			li1 = claim_element(ul0_nodes, "LI", {});
			var li1_nodes = children(li1);
			a1 = claim_element(li1_nodes, "A", { href: true });
			var a1_nodes = children(a1);
			t1 = claim_text(a1_nodes, "Need something? Install a plugin!");
			a1_nodes.forEach(detach);
			li1_nodes.forEach(detach);
			li2 = claim_element(ul0_nodes, "LI", {});
			var li2_nodes = children(li2);
			a2 = claim_element(li2_nodes, "A", { href: true });
			var a2_nodes = children(a2);
			t2 = claim_text(a2_nodes, "Writing a Rollup plugin");
			a2_nodes.forEach(detach);
			li2_nodes.forEach(detach);
			li3 = claim_element(ul0_nodes, "LI", {});
			var li3_nodes = children(li3);
			a3 = claim_element(li3_nodes, "A", { href: true });
			var a3_nodes = children(a3);
			t3 = claim_text(a3_nodes, "Closing Notes");
			a3_nodes.forEach(detach);
			li3_nodes.forEach(detach);
			ul0_nodes.forEach(detach);
			section0_nodes.forEach(detach);
			t4 = claim_space(nodes);
			section1 = claim_element(nodes, "SECTION", {});
			var section1_nodes = children(section1);
			h20 = claim_element(section1_nodes, "H2", {});
			var h20_nodes = children(h20);
			a4 = claim_element(h20_nodes, "A", { href: true, id: true });
			var a4_nodes = children(a4);
			t5 = claim_text(a4_nodes, "Background");
			a4_nodes.forEach(detach);
			h20_nodes.forEach(detach);
			t6 = claim_space(section1_nodes);
			p0 = claim_element(section1_nodes, "P", {});
			var p0_nodes = children(p0);
			t7 = claim_text(p0_nodes, "I was building a web application using ");
			a5 = claim_element(p0_nodes, "A", { href: true, rel: true });
			var a5_nodes = children(a5);
			t8 = claim_text(a5_nodes, "Svelte");
			a5_nodes.forEach(detach);
			t9 = claim_text(p0_nodes, " and ");
			a6 = claim_element(p0_nodes, "A", { href: true, rel: true });
			var a6_nodes = children(a6);
			t10 = claim_text(a6_nodes, "Rollup");
			a6_nodes.forEach(detach);
			t11 = claim_text(p0_nodes, " this morning. I needed to use a ");
			a7 = claim_element(p0_nodes, "A", { href: true, rel: true });
			var a7_nodes = children(a7);
			t12 = claim_text(a7_nodes, "web worker");
			a7_nodes.forEach(detach);
			t13 = claim_text(p0_nodes, ", which the worker script has to be in another file:");
			p0_nodes.forEach(detach);
			t14 = claim_space(section1_nodes);
			pre0 = claim_element(section1_nodes, "PRE", { class: true });
			var pre0_nodes = children(pre0);
			pre0_nodes.forEach(detach);
			t15 = claim_space(section1_nodes);
			p1 = claim_element(section1_nodes, "P", {});
			var p1_nodes = children(p1);
			t16 = claim_text(p1_nodes, "So naturally, I was thinking of having 2 entries for my rollup application: ");
			em0 = claim_element(p1_nodes, "EM", {});
			var em0_nodes = children(em0);
			t17 = claim_text(em0_nodes, "the main app");
			em0_nodes.forEach(detach);
			t18 = claim_text(p1_nodes, " and ");
			em1 = claim_element(p1_nodes, "EM", {});
			var em1_nodes = children(em1);
			t19 = claim_text(em1_nodes, "the worker");
			em1_nodes.forEach(detach);
			t20 = claim_text(p1_nodes, ".");
			p1_nodes.forEach(detach);
			t21 = claim_space(section1_nodes);
			p2 = claim_element(section1_nodes, "P", {});
			var p2_nodes = children(p2);
			t22 = claim_text(p2_nodes, "It works fine, except the fact that the ");
			a8 = claim_element(p2_nodes, "A", { href: true, rel: true });
			var a8_nodes = children(a8);
			t23 = claim_text(a8_nodes, "rollup-plugin-livereload");
			a8_nodes.forEach(detach);
			t24 = claim_text(p2_nodes, " injected a livereload script to every output file:");
			p2_nodes.forEach(detach);
			t25 = claim_space(section1_nodes);
			pre1 = claim_element(section1_nodes, "PRE", { class: true });
			var pre1_nodes = children(pre1);
			pre1_nodes.forEach(detach);
			t26 = claim_space(section1_nodes);
			p3 = claim_element(section1_nodes, "P", {});
			var p3_nodes = children(p3);
			t27 = claim_text(p3_nodes, "The livereload script includes a reference to ");
			code0 = claim_element(p3_nodes, "CODE", {});
			var code0_nodes = children(code0);
			t28 = claim_text(code0_nodes, "window");
			code0_nodes.forEach(detach);
			t29 = claim_text(p3_nodes, ", which is not available to the worker script:");
			p3_nodes.forEach(detach);
			t30 = claim_space(section1_nodes);
			p4 = claim_element(section1_nodes, "P", {});
			var p4_nodes = children(p4);
			img0 = claim_element(p4_nodes, "IMG", { src: true, alt: true, title: true });
			p4_nodes.forEach(detach);
			t31 = claim_space(section1_nodes);
			p5 = claim_element(section1_nodes, "P", {});
			var p5_nodes = children(p5);
			t32 = claim_text(p5_nodes, "I looked into ");
			a9 = claim_element(p5_nodes, "A", { href: true, rel: true });
			var a9_nodes = children(a9);
			t33 = claim_text(a9_nodes, "the docs of the rollup-plugin-livereload");
			a9_nodes.forEach(detach);
			t34 = claim_text(p5_nodes, ", it doesn't seemed to have a option to exclude files from adding the ");
			em2 = claim_element(p5_nodes, "EM", {});
			var em2_nodes = children(em2);
			t35 = claim_text(em2_nodes, "livereload script");
			em2_nodes.forEach(detach);
			t36 = claim_text(p5_nodes, ".");
			p5_nodes.forEach(detach);
			t37 = claim_space(section1_nodes);
			p6 = claim_element(section1_nodes, "P", {});
			var p6_nodes = children(p6);
			t38 = claim_text(p6_nodes, "At this point, I was thinking to myself, ");
			em3 = claim_element(p6_nodes, "EM", {});
			var em3_nodes = children(em3);
			t39 = claim_text(em3_nodes, "\"I just need to copy the worker.js into the 'build/' folder, I don't need anything else, how hard can that be?\"");
			em3_nodes.forEach(detach);
			p6_nodes.forEach(detach);
			t40 = claim_space(section1_nodes);
			p7 = claim_element(section1_nodes, "P", {});
			var p7_nodes = children(p7);
			t41 = claim_text(p7_nodes, "It turns out harder than I imagined. 🤮");
			p7_nodes.forEach(detach);
			section1_nodes.forEach(detach);
			t42 = claim_space(nodes);
			section2 = claim_element(nodes, "SECTION", {});
			var section2_nodes = children(section2);
			h21 = claim_element(section2_nodes, "H2", {});
			var h21_nodes = children(h21);
			a10 = claim_element(h21_nodes, "A", { href: true, id: true });
			var a10_nodes = children(a10);
			t43 = claim_text(a10_nodes, "Need something? Install a plugin!");
			a10_nodes.forEach(detach);
			h21_nodes.forEach(detach);
			t44 = claim_space(section2_nodes);
			p8 = claim_element(section2_nodes, "P", {});
			var p8_nodes = children(p8);
			t45 = claim_text(p8_nodes, "In todays JavaScript landscape, there's a ");
			em4 = claim_element(p8_nodes, "EM", {});
			var em4_nodes = children(em4);
			t46 = claim_text(em4_nodes, "\"node_module\"");
			em4_nodes.forEach(detach);
			t47 = claim_text(p8_nodes, " for everything.");
			p8_nodes.forEach(detach);
			t48 = claim_space(section2_nodes);
			p9 = claim_element(section2_nodes, "P", {});
			var p9_nodes = children(p9);
			t49 = claim_text(p9_nodes, "So I ");
			a11 = claim_element(p9_nodes, "A", { href: true, rel: true });
			var a11_nodes = children(a11);
			t50 = claim_text(a11_nodes, "googled");
			a11_nodes.forEach(detach);
			t51 = claim_space(p9_nodes);
			em5 = claim_element(p9_nodes, "EM", {});
			var em5_nodes = children(em5);
			t52 = claim_text(em5_nodes, "\"rollup plugin copy files\"");
			em5_nodes.forEach(detach);
			t53 = claim_text(p9_nodes, ", without a suprise, there are multiple rollup plugins published to npm:");
			p9_nodes.forEach(detach);
			t54 = claim_space(section2_nodes);
			p10 = claim_element(section2_nodes, "P", {});
			var p10_nodes = children(p10);
			img1 = claim_element(p10_nodes, "IMG", { src: true, alt: true, title: true });
			p10_nodes.forEach(detach);
			t55 = claim_space(section2_nodes);
			p11 = claim_element(section2_nodes, "P", {});
			var p11_nodes = children(p11);
			t56 = claim_text(p11_nodes, "So I decided to install the first plugin, because it has the highest weekly downloads:");
			p11_nodes.forEach(detach);
			t57 = claim_space(section2_nodes);
			p12 = claim_element(section2_nodes, "P", {});
			var p12_nodes = children(p12);
			img2 = claim_element(p12_nodes, "IMG", { src: true, alt: true, title: true });
			p12_nodes.forEach(detach);
			t58 = claim_space(section2_nodes);
			p13 = claim_element(section2_nodes, "P", {});
			var p13_nodes = children(p13);
			t59 = claim_text(p13_nodes, "When I installed the plugin, I realise I was installing much more than I needed:");
			p13_nodes.forEach(detach);
			t60 = claim_space(section2_nodes);
			p14 = claim_element(section2_nodes, "P", {});
			var p14_nodes = children(p14);
			img3 = claim_element(p14_nodes, "IMG", { src: true, alt: true });
			p14_nodes.forEach(detach);
			t61 = claim_space(section2_nodes);
			p15 = claim_element(section2_nodes, "P", {});
			var p15_nodes = children(p15);
			t62 = claim_text(p15_nodes, "Remember, my use case is simple:");
			p15_nodes.forEach(detach);
			t63 = claim_space(section2_nodes);
			blockquote0 = claim_element(section2_nodes, "BLOCKQUOTE", {});
			var blockquote0_nodes = children(blockquote0);
			p16 = claim_element(blockquote0_nodes, "P", {});
			var p16_nodes = children(p16);
			strong0 = claim_element(p16_nodes, "STRONG", {});
			var strong0_nodes = children(strong0);
			t64 = claim_text(strong0_nodes, "I just need to copy the worker.js into the 'build/' folder.");
			strong0_nodes.forEach(detach);
			p16_nodes.forEach(detach);
			blockquote0_nodes.forEach(detach);
			t65 = claim_space(section2_nodes);
			p17 = claim_element(section2_nodes, "P", {});
			var p17_nodes = children(p17);
			t66 = claim_text(p17_nodes, "I ");
			em6 = claim_element(p17_nodes, "EM", {});
			var em6_nodes = children(em6);
			t67 = claim_text(em6_nodes, "don't need any bells and whistles");
			em6_nodes.forEach(detach);
			t68 = claim_text(p17_nodes, " this plugin is providing me. 🙈");
			p17_nodes.forEach(detach);
			t69 = claim_space(section2_nodes);
			p18 = claim_element(section2_nodes, "P", {});
			var p18_nodes = children(p18);
			t70 = claim_text(p18_nodes, "So I uninstalled the plugin, thinking:");
			p18_nodes.forEach(detach);
			t71 = claim_space(section2_nodes);
			blockquote1 = claim_element(section2_nodes, "BLOCKQUOTE", {});
			var blockquote1_nodes = children(blockquote1);
			p19 = claim_element(blockquote1_nodes, "P", {});
			var p19_nodes = children(p19);
			t72 = claim_text(p19_nodes, "How hard is it to ");
			strong1 = claim_element(p19_nodes, "STRONG", {});
			var strong1_nodes = children(strong1);
			t73 = claim_text(strong1_nodes, "write a plugin");
			strong1_nodes.forEach(detach);
			t74 = claim_text(p19_nodes, " that ");
			strong2 = claim_element(p19_nodes, "STRONG", {});
			var strong2_nodes = children(strong2);
			t75 = claim_text(strong2_nodes, "just");
			strong2_nodes.forEach(detach);
			t76 = claim_text(p19_nodes, " copy the worker.js into the 'build/' folder?");
			p19_nodes.forEach(detach);
			blockquote1_nodes.forEach(detach);
			section2_nodes.forEach(detach);
			t77 = claim_space(nodes);
			section3 = claim_element(nodes, "SECTION", {});
			var section3_nodes = children(section3);
			h22 = claim_element(section3_nodes, "H2", {});
			var h22_nodes = children(h22);
			a12 = claim_element(h22_nodes, "A", { href: true, id: true });
			var a12_nodes = children(a12);
			t78 = claim_text(a12_nodes, "Writing a Rollup plugin");
			a12_nodes.forEach(detach);
			h22_nodes.forEach(detach);
			t79 = claim_space(section3_nodes);
			p20 = claim_element(section3_nodes, "P", {});
			var p20_nodes = children(p20);
			t80 = claim_text(p20_nodes, "Senpai once told me, ");
			em7 = claim_element(p20_nodes, "EM", {});
			var em7_nodes = children(em7);
			t81 = claim_text(em7_nodes, "\"writing rollup plugins is very straightforward,\"");
			em7_nodes.forEach(detach);
			t82 = claim_text(p20_nodes, ", yet, no one told me how to get started writing it.");
			p20_nodes.forEach(detach);
			t83 = claim_space(section3_nodes);
			p21 = claim_element(section3_nodes, "P", {});
			var p21_nodes = children(p21);
			t84 = claim_text(p21_nodes, "So, I dug into ");
			code1 = claim_element(p21_nodes, "CODE", {});
			var code1_nodes = children(code1);
			t85 = claim_text(code1_nodes, "node_modules/");
			code1_nodes.forEach(detach);
			t86 = claim_text(p21_nodes, ", and start skimming through the rollup plugins I have installed: ");
			a13 = claim_element(p21_nodes, "A", { href: true, rel: true });
			var a13_nodes = children(a13);
			t87 = claim_text(a13_nodes, "rollup-plugin-svelte");
			a13_nodes.forEach(detach);
			t88 = claim_text(p21_nodes, ", ");
			a14 = claim_element(p21_nodes, "A", { href: true, rel: true });
			var a14_nodes = children(a14);
			t89 = claim_text(a14_nodes, "rollup-plugin-node-resolve");
			a14_nodes.forEach(detach);
			t90 = claim_text(p21_nodes, ", ");
			a15 = claim_element(p21_nodes, "A", { href: true, rel: true });
			var a15_nodes = children(a15);
			t91 = claim_text(a15_nodes, "rollup-plugin-terser");
			a15_nodes.forEach(detach);
			t92 = claim_text(p21_nodes, ", ...");
			p21_nodes.forEach(detach);
			t93 = claim_space(section3_nodes);
			p22 = claim_element(section3_nodes, "P", {});
			var p22_nodes = children(p22);
			t94 = claim_text(p22_nodes, "And I noticed a common pattern:");
			p22_nodes.forEach(detach);
			t95 = claim_space(section3_nodes);
			pre2 = claim_element(section3_nodes, "PRE", { class: true });
			var pre2_nodes = children(pre2);
			pre2_nodes.forEach(detach);
			t96 = claim_space(section3_nodes);
			p23 = claim_element(section3_nodes, "P", {});
			var p23_nodes = children(p23);
			t97 = claim_text(p23_nodes, "So I guess, this is the general structure of a rollup plugin:");
			p23_nodes.forEach(detach);
			t98 = claim_space(section3_nodes);
			ul1 = claim_element(section3_nodes, "UL", {});
			var ul1_nodes = children(ul1);
			li4 = claim_element(ul1_nodes, "LI", {});
			var li4_nodes = children(li4);
			t99 = claim_text(li4_nodes, "It's an object, ...");
			li4_nodes.forEach(detach);
			t100 = claim_space(ul1_nodes);
			li5 = claim_element(ul1_nodes, "LI", {});
			var li5_nodes = children(li5);
			t101 = claim_text(li5_nodes, "with a property called ");
			code2 = claim_element(li5_nodes, "CODE", {});
			var code2_nodes = children(code2);
			t102 = claim_text(code2_nodes, "name");
			code2_nodes.forEach(detach);
			t103 = claim_text(li5_nodes, " for the name of the plugin,");
			li5_nodes.forEach(detach);
			t104 = claim_space(ul1_nodes);
			li6 = claim_element(ul1_nodes, "LI", {});
			var li6_nodes = children(li6);
			t105 = claim_text(li6_nodes, "and functions like ");
			em8 = claim_element(li6_nodes, "EM", {});
			var em8_nodes = children(em8);
			t106 = claim_text(em8_nodes, "\"load\"");
			em8_nodes.forEach(detach);
			t107 = claim_text(li6_nodes, ", ");
			em9 = claim_element(li6_nodes, "EM", {});
			var em9_nodes = children(em9);
			t108 = claim_text(em9_nodes, "\"load\"");
			em9_nodes.forEach(detach);
			t109 = claim_text(li6_nodes, ", ... that would be called by rollup when the time is right 🤔");
			li6_nodes.forEach(detach);
			ul1_nodes.forEach(detach);
			t110 = claim_space(section3_nodes);
			p24 = claim_element(section3_nodes, "P", {});
			var p24_nodes = children(p24);
			t111 = claim_text(p24_nodes, "OK. I know what I need, I need to copy my ");
			code3 = claim_element(p24_nodes, "CODE", {});
			var code3_nodes = children(code3);
			t112 = claim_text(code3_nodes, "worker.js");
			code3_nodes.forEach(detach);
			t113 = claim_text(p24_nodes, " when rollup is generating a bundle:");
			p24_nodes.forEach(detach);
			t114 = claim_space(section3_nodes);
			pre3 = claim_element(section3_nodes, "PRE", { class: true });
			var pre3_nodes = children(pre3);
			pre3_nodes.forEach(detach);
			t115 = claim_space(section3_nodes);
			p25 = claim_element(section3_nodes, "P", {});
			var p25_nodes = children(p25);
			t116 = claim_text(p25_nodes, "Great! It works! 😎");
			p25_nodes.forEach(detach);
			t117 = claim_space(section3_nodes);
			p26 = claim_element(section3_nodes, "P", {});
			var p26_nodes = children(p26);
			t118 = claim_text(p26_nodes, "But, when I change the ");
			code4 = claim_element(p26_nodes, "CODE", {});
			var code4_nodes = children(code4);
			t119 = claim_text(code4_nodes, "worker.js");
			code4_nodes.forEach(detach);
			t120 = claim_text(p26_nodes, " file, the ");
			code5 = claim_element(p26_nodes, "CODE", {});
			var code5_nodes = children(code5);
			t121 = claim_text(code5_nodes, "build/worker.js");
			code5_nodes.forEach(detach);
			t122 = claim_text(p26_nodes, " is not updated. 😞");
			p26_nodes.forEach(detach);
			t123 = claim_space(section3_nodes);
			p27 = claim_element(section3_nodes, "P", {});
			var p27_nodes = children(p27);
			t124 = claim_text(p27_nodes, "That's because the ");
			code6 = claim_element(p27_nodes, "CODE", {});
			var code6_nodes = children(code6);
			t125 = claim_text(code6_nodes, "worker.js");
			code6_nodes.forEach(detach);
			t126 = claim_text(p27_nodes, " is not watched!");
			p27_nodes.forEach(detach);
			t127 = claim_space(section3_nodes);
			p28 = claim_element(section3_nodes, "P", {});
			var p28_nodes = children(p28);
			t128 = claim_text(p28_nodes, "After much googling, I ended up reading through the official docs of ");
			a16 = claim_element(p28_nodes, "A", { href: true, rel: true });
			var a16_nodes = children(a16);
			t129 = claim_text(a16_nodes, "Rollup");
			a16_nodes.forEach(detach);
			t130 = claim_text(p28_nodes, ".");
			p28_nodes.forEach(detach);
			t131 = claim_space(section3_nodes);
			p29 = claim_element(section3_nodes, "P", {});
			var p29_nodes = children(p29);
			t132 = claim_text(p29_nodes, "I learned that the functions like ");
			em10 = claim_element(p29_nodes, "EM", {});
			var em10_nodes = children(em10);
			t133 = claim_text(em10_nodes, "\"load\"");
			em10_nodes.forEach(detach);
			t134 = claim_text(p29_nodes, ", ");
			em11 = claim_element(p29_nodes, "EM", {});
			var em11_nodes = children(em11);
			t135 = claim_text(em11_nodes, "\"generateBundle\"");
			em11_nodes.forEach(detach);
			t136 = claim_text(p29_nodes, ", ... are called ");
			a17 = claim_element(p29_nodes, "A", { href: true, rel: true });
			var a17_nodes = children(a17);
			t137 = claim_text(a17_nodes, "\"hooks\"");
			a17_nodes.forEach(detach);
			t138 = claim_text(p29_nodes, ", and the docs explained when these hooks will be called, the arguments and the expected return value.");
			p29_nodes.forEach(detach);
			t139 = claim_space(section3_nodes);
			p30 = claim_element(section3_nodes, "P", {});
			var p30_nodes = children(p30);
			t140 = claim_text(p30_nodes, "In the docs, I found ");
			a18 = claim_element(p30_nodes, "A", { href: true, rel: true });
			var a18_nodes = children(a18);
			code7 = claim_element(a18_nodes, "CODE", {});
			var code7_nodes = children(code7);
			t141 = claim_text(code7_nodes, "this.addWatchFile(id: string)");
			code7_nodes.forEach(detach);
			a18_nodes.forEach(detach);
			t142 = claim_text(p30_nodes, " under ");
			a19 = claim_element(p30_nodes, "A", { href: true, rel: true });
			var a19_nodes = children(a19);
			t143 = claim_text(a19_nodes, "plugin context");
			a19_nodes.forEach(detach);
			t144 = claim_text(p30_nodes, ", which according to the docs,");
			p30_nodes.forEach(detach);
			t145 = claim_space(section3_nodes);
			blockquote2 = claim_element(section3_nodes, "BLOCKQUOTE", {});
			var blockquote2_nodes = children(blockquote2);
			p31 = claim_element(blockquote2_nodes, "P", {});
			var p31_nodes = children(p31);
			t146 = claim_text(p31_nodes, "[...] can be used to add additional files to be monitored by watch mode.");
			p31_nodes.forEach(detach);
			blockquote2_nodes.forEach(detach);
			t147 = claim_space(section3_nodes);
			p32 = claim_element(section3_nodes, "P", {});
			var p32_nodes = children(p32);
			t148 = claim_text(p32_nodes, "Sounds exactly what I am looking for! 😁");
			p32_nodes.forEach(detach);
			t149 = claim_space(section3_nodes);
			pre4 = claim_element(section3_nodes, "PRE", { class: true });
			var pre4_nodes = children(pre4);
			pre4_nodes.forEach(detach);
			t150 = claim_space(section3_nodes);
			p33 = claim_element(section3_nodes, "P", {});
			var p33_nodes = children(p33);
			t151 = claim_text(p33_nodes, "Great! It works! 🎉🎉");
			p33_nodes.forEach(detach);
			section3_nodes.forEach(detach);
			t152 = claim_space(nodes);
			section4 = claim_element(nodes, "SECTION", {});
			var section4_nodes = children(section4);
			h23 = claim_element(section4_nodes, "H2", {});
			var h23_nodes = children(h23);
			a20 = claim_element(h23_nodes, "A", { href: true, id: true });
			var a20_nodes = children(a20);
			t153 = claim_text(a20_nodes, "Closing Notes");
			a20_nodes.forEach(detach);
			h23_nodes.forEach(detach);
			t154 = claim_space(section4_nodes);
			p34 = claim_element(section4_nodes, "P", {});
			var p34_nodes = children(p34);
			t155 = claim_text(p34_nodes, "After some researching, I wrote simple rollup plugin in 12 lines of code, that copies the worker.js into \"build/\" folder.");
			p34_nodes.forEach(detach);
			t156 = claim_space(section4_nodes);
			p35 = claim_element(section4_nodes, "P", {});
			var p35_nodes = children(p35);
			t157 = claim_text(p35_nodes, "This is something custom and specific, and ");
			strong3 = claim_element(p35_nodes, "STRONG", {});
			var strong3_nodes = children(strong3);
			t158 = claim_text(strong3_nodes, "it works perfectly fine");
			strong3_nodes.forEach(detach);
			t159 = claim_text(p35_nodes, ".");
			p35_nodes.forEach(detach);
			t160 = claim_space(section4_nodes);
			p36 = claim_element(section4_nodes, "P", {});
			var p36_nodes = children(p36);
			t161 = claim_text(p36_nodes, "So, why would I install a package that has so many files and dependencies, just to do a simple and specific task?");
			p36_nodes.forEach(detach);
			t162 = claim_space(section4_nodes);
			p37 = claim_element(section4_nodes, "P", {});
			var p37_nodes = children(p37);
			strong4 = claim_element(p37_nodes, "STRONG", {});
			var strong4_nodes = children(strong4);
			t163 = claim_text(strong4_nodes, "Am I going to publish my plugin to npm?");
			strong4_nodes.forEach(detach);
			p37_nodes.forEach(detach);
			t164 = claim_space(section4_nodes);
			p38 = claim_element(section4_nodes, "P", {});
			var p38_nodes = children(p38);
			t165 = claim_text(p38_nodes, "No. If you have a similar use case, you are free to copy these 12 lines of code.");
			p38_nodes.forEach(detach);
			t166 = claim_space(section4_nodes);
			p39 = claim_element(section4_nodes, "P", {});
			var p39_nodes = children(p39);
			t167 = claim_text(p39_nodes, "At the moment, I am having these 12 lines of code in my ");
			code8 = claim_element(p39_nodes, "CODE", {});
			var code8_nodes = children(code8);
			t168 = claim_text(code8_nodes, "rollup.config.js");
			code8_nodes.forEach(detach);
			t169 = claim_text(p39_nodes, " and have no intention to extract it out into its own package.");
			p39_nodes.forEach(detach);
			t170 = claim_space(section4_nodes);
			p40 = claim_element(section4_nodes, "P", {});
			var p40_nodes = children(p40);
			strong5 = claim_element(p40_nodes, "STRONG", {});
			var strong5_nodes = children(strong5);
			t171 = claim_text(strong5_nodes, "What about DRY? What if you/someone else have the same use case, wouldn't it great to have it as a package?");
			strong5_nodes.forEach(detach);
			p40_nodes.forEach(detach);
			t172 = claim_space(section4_nodes);
			p41 = claim_element(section4_nodes, "P", {});
			var p41_nodes = children(p41);
			t173 = claim_text(p41_nodes, "Sorry. No. Before ");
			strong6 = claim_element(p41_nodes, "STRONG", {});
			var strong6_nodes = children(strong6);
			t174 = claim_text(strong6_nodes, "DRY (Dont Repeat Yourself)");
			strong6_nodes.forEach(detach);
			t175 = claim_text(p41_nodes, ", there's ");
			strong7 = claim_element(p41_nodes, "STRONG", {});
			var strong7_nodes = children(strong7);
			t176 = claim_text(strong7_nodes, "YAGNI (You aren't gonna need it)");
			strong7_nodes.forEach(detach);
			t177 = claim_text(p41_nodes, ".");
			p41_nodes.forEach(detach);
			t178 = claim_space(section4_nodes);
			p42 = claim_element(section4_nodes, "P", {});
			var p42_nodes = children(p42);
			t179 = claim_text(p42_nodes, "Abstract code only when you need to.");
			p42_nodes.forEach(detach);
			section4_nodes.forEach(detach);
			this.h();
		},
		h() {
			attr(a0, "href", "#background");
			attr(a1, "href", "#need-something-install-a-plugin");
			attr(a2, "href", "#writing-a-rollup-plugin");
			attr(a3, "href", "#closing-notes");
			attr(ul0, "class", "sitemap");
			attr(ul0, "id", "sitemap");
			attr(ul0, "role", "navigation");
			attr(ul0, "aria-label", "Table of Contents");
			attr(a4, "href", "#background");
			attr(a4, "id", "background");
			attr(a5, "href", "http://svelte.dev/");
			attr(a5, "rel", "nofollow");
			attr(a6, "href", "https://rollupjs.org/guide/en/");
			attr(a6, "rel", "nofollow");
			attr(a7, "href", "https://developer.mozilla.org/en-US/docs/Web/API/Web_Workers_API/Using_web_workers");
			attr(a7, "rel", "nofollow");
			attr(pre0, "class", "language-js");
			attr(a8, "href", "https://www.npmjs.com/package/rollup-plugin-livereload");
			attr(a8, "rel", "nofollow");
			attr(pre1, "class", "language-js");
			if (img0.src !== (img0_src_value = __build_img__0)) attr(img0, "src", img0_src_value);
			attr(img0, "alt", "window reference error");
			attr(img0, "title", "window is not defined");
			attr(a9, "href", "https://www.npmjs.com/package/rollup-plugin-livereload");
			attr(a9, "rel", "nofollow");
			attr(a10, "href", "#need-something-install-a-plugin");
			attr(a10, "id", "need-something-install-a-plugin");
			attr(a11, "href", "https://www.google.com/search?q=rollup+plugin+copy+files");
			attr(a11, "rel", "nofollow");
			if (img1.src !== (img1_src_value = __build_img__1)) attr(img1, "src", img1_src_value);
			attr(img1, "alt", "google search");
			attr(img1, "title", "Google result for \"rollup plugin copy files\"");
			if (img2.src !== (img2_src_value = __build_img__2)) attr(img2, "src", img2_src_value);
			attr(img2, "alt", "rollup-plugin-copy weekly downloads");
			attr(img2, "title", "17K weekly downloads");
			if (img3.src !== (img3_src_value = __build_img__3)) attr(img3, "src", img3_src_value);
			attr(img3, "alt", "rollup-plugin-copy dependencies");
			attr(a12, "href", "#writing-a-rollup-plugin");
			attr(a12, "id", "writing-a-rollup-plugin");
			attr(a13, "href", "https://github.com/sveltejs/rollup-plugin-svelte");
			attr(a13, "rel", "nofollow");
			attr(a14, "href", "https://github.com/rollup/rollup-plugin-node-resolve");
			attr(a14, "rel", "nofollow");
			attr(a15, "href", "https://github.com/TrySound/rollup-plugin-terser");
			attr(a15, "rel", "nofollow");
			attr(pre2, "class", "language-js");
			attr(pre3, "class", "language-js");
			attr(a16, "href", "https://rollupjs.org/guide/en/#plugin-development");
			attr(a16, "rel", "nofollow");
			attr(a17, "href", "https://rollupjs.org/guide/en/#hooks");
			attr(a17, "rel", "nofollow");
			attr(a18, "href", "https://rollupjs.org/guide/en/#thisaddwatchfileid-string--void");
			attr(a18, "rel", "nofollow");
			attr(a19, "href", "https://rollupjs.org/guide/en/#plugin-context");
			attr(a19, "rel", "nofollow");
			attr(pre4, "class", "language-js");
			attr(a20, "href", "#closing-notes");
			attr(a20, "id", "closing-notes");
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
			insert(target, t4, anchor);
			insert(target, section1, anchor);
			append(section1, h20);
			append(h20, a4);
			append(a4, t5);
			append(section1, t6);
			append(section1, p0);
			append(p0, t7);
			append(p0, a5);
			append(a5, t8);
			append(p0, t9);
			append(p0, a6);
			append(a6, t10);
			append(p0, t11);
			append(p0, a7);
			append(a7, t12);
			append(p0, t13);
			append(section1, t14);
			append(section1, pre0);
			pre0.innerHTML = raw0_value;
			append(section1, t15);
			append(section1, p1);
			append(p1, t16);
			append(p1, em0);
			append(em0, t17);
			append(p1, t18);
			append(p1, em1);
			append(em1, t19);
			append(p1, t20);
			append(section1, t21);
			append(section1, p2);
			append(p2, t22);
			append(p2, a8);
			append(a8, t23);
			append(p2, t24);
			append(section1, t25);
			append(section1, pre1);
			pre1.innerHTML = raw1_value;
			append(section1, t26);
			append(section1, p3);
			append(p3, t27);
			append(p3, code0);
			append(code0, t28);
			append(p3, t29);
			append(section1, t30);
			append(section1, p4);
			append(p4, img0);
			append(section1, t31);
			append(section1, p5);
			append(p5, t32);
			append(p5, a9);
			append(a9, t33);
			append(p5, t34);
			append(p5, em2);
			append(em2, t35);
			append(p5, t36);
			append(section1, t37);
			append(section1, p6);
			append(p6, t38);
			append(p6, em3);
			append(em3, t39);
			append(section1, t40);
			append(section1, p7);
			append(p7, t41);
			insert(target, t42, anchor);
			insert(target, section2, anchor);
			append(section2, h21);
			append(h21, a10);
			append(a10, t43);
			append(section2, t44);
			append(section2, p8);
			append(p8, t45);
			append(p8, em4);
			append(em4, t46);
			append(p8, t47);
			append(section2, t48);
			append(section2, p9);
			append(p9, t49);
			append(p9, a11);
			append(a11, t50);
			append(p9, t51);
			append(p9, em5);
			append(em5, t52);
			append(p9, t53);
			append(section2, t54);
			append(section2, p10);
			append(p10, img1);
			append(section2, t55);
			append(section2, p11);
			append(p11, t56);
			append(section2, t57);
			append(section2, p12);
			append(p12, img2);
			append(section2, t58);
			append(section2, p13);
			append(p13, t59);
			append(section2, t60);
			append(section2, p14);
			append(p14, img3);
			append(section2, t61);
			append(section2, p15);
			append(p15, t62);
			append(section2, t63);
			append(section2, blockquote0);
			append(blockquote0, p16);
			append(p16, strong0);
			append(strong0, t64);
			append(section2, t65);
			append(section2, p17);
			append(p17, t66);
			append(p17, em6);
			append(em6, t67);
			append(p17, t68);
			append(section2, t69);
			append(section2, p18);
			append(p18, t70);
			append(section2, t71);
			append(section2, blockquote1);
			append(blockquote1, p19);
			append(p19, t72);
			append(p19, strong1);
			append(strong1, t73);
			append(p19, t74);
			append(p19, strong2);
			append(strong2, t75);
			append(p19, t76);
			insert(target, t77, anchor);
			insert(target, section3, anchor);
			append(section3, h22);
			append(h22, a12);
			append(a12, t78);
			append(section3, t79);
			append(section3, p20);
			append(p20, t80);
			append(p20, em7);
			append(em7, t81);
			append(p20, t82);
			append(section3, t83);
			append(section3, p21);
			append(p21, t84);
			append(p21, code1);
			append(code1, t85);
			append(p21, t86);
			append(p21, a13);
			append(a13, t87);
			append(p21, t88);
			append(p21, a14);
			append(a14, t89);
			append(p21, t90);
			append(p21, a15);
			append(a15, t91);
			append(p21, t92);
			append(section3, t93);
			append(section3, p22);
			append(p22, t94);
			append(section3, t95);
			append(section3, pre2);
			pre2.innerHTML = raw2_value;
			append(section3, t96);
			append(section3, p23);
			append(p23, t97);
			append(section3, t98);
			append(section3, ul1);
			append(ul1, li4);
			append(li4, t99);
			append(ul1, t100);
			append(ul1, li5);
			append(li5, t101);
			append(li5, code2);
			append(code2, t102);
			append(li5, t103);
			append(ul1, t104);
			append(ul1, li6);
			append(li6, t105);
			append(li6, em8);
			append(em8, t106);
			append(li6, t107);
			append(li6, em9);
			append(em9, t108);
			append(li6, t109);
			append(section3, t110);
			append(section3, p24);
			append(p24, t111);
			append(p24, code3);
			append(code3, t112);
			append(p24, t113);
			append(section3, t114);
			append(section3, pre3);
			pre3.innerHTML = raw3_value;
			append(section3, t115);
			append(section3, p25);
			append(p25, t116);
			append(section3, t117);
			append(section3, p26);
			append(p26, t118);
			append(p26, code4);
			append(code4, t119);
			append(p26, t120);
			append(p26, code5);
			append(code5, t121);
			append(p26, t122);
			append(section3, t123);
			append(section3, p27);
			append(p27, t124);
			append(p27, code6);
			append(code6, t125);
			append(p27, t126);
			append(section3, t127);
			append(section3, p28);
			append(p28, t128);
			append(p28, a16);
			append(a16, t129);
			append(p28, t130);
			append(section3, t131);
			append(section3, p29);
			append(p29, t132);
			append(p29, em10);
			append(em10, t133);
			append(p29, t134);
			append(p29, em11);
			append(em11, t135);
			append(p29, t136);
			append(p29, a17);
			append(a17, t137);
			append(p29, t138);
			append(section3, t139);
			append(section3, p30);
			append(p30, t140);
			append(p30, a18);
			append(a18, code7);
			append(code7, t141);
			append(p30, t142);
			append(p30, a19);
			append(a19, t143);
			append(p30, t144);
			append(section3, t145);
			append(section3, blockquote2);
			append(blockquote2, p31);
			append(p31, t146);
			append(section3, t147);
			append(section3, p32);
			append(p32, t148);
			append(section3, t149);
			append(section3, pre4);
			pre4.innerHTML = raw4_value;
			append(section3, t150);
			append(section3, p33);
			append(p33, t151);
			insert(target, t152, anchor);
			insert(target, section4, anchor);
			append(section4, h23);
			append(h23, a20);
			append(a20, t153);
			append(section4, t154);
			append(section4, p34);
			append(p34, t155);
			append(section4, t156);
			append(section4, p35);
			append(p35, t157);
			append(p35, strong3);
			append(strong3, t158);
			append(p35, t159);
			append(section4, t160);
			append(section4, p36);
			append(p36, t161);
			append(section4, t162);
			append(section4, p37);
			append(p37, strong4);
			append(strong4, t163);
			append(section4, t164);
			append(section4, p38);
			append(p38, t165);
			append(section4, t166);
			append(section4, p39);
			append(p39, t167);
			append(p39, code8);
			append(code8, t168);
			append(p39, t169);
			append(section4, t170);
			append(section4, p40);
			append(p40, strong5);
			append(strong5, t171);
			append(section4, t172);
			append(section4, p41);
			append(p41, t173);
			append(p41, strong6);
			append(strong6, t174);
			append(p41, t175);
			append(p41, strong7);
			append(strong7, t176);
			append(p41, t177);
			append(section4, t178);
			append(section4, p42);
			append(p42, t179);
		},
		p: noop,
		d(detaching) {
			if (detaching) detach(section0);
			if (detaching) detach(t4);
			if (detaching) detach(section1);
			if (detaching) detach(t42);
			if (detaching) detach(section2);
			if (detaching) detach(t77);
			if (detaching) detach(section3);
			if (detaching) detach(t152);
			if (detaching) detach(section4);
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
	"title": "I wrote a 12-line Rollup plugin",
	"date": "2019-11-30T08:00:00Z",
	"description": "Why would I install a package with so many files and dependencies, just to do a something simple that can be done in 12 lines of code?",
	"tags": ["JavaScript", "rollup", "plugin"],
	"slug": "12-line-rollup-plugin",
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
