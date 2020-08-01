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
function set_style(node, key, value, important) {
    node.style.setProperty(key, value, important ? 'important' : '');
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

var __build_img__3 = "4325833eef29ed21.gif";

var __build_img__2 = "75a034faffa701aa.png";

var __build_img__1 = "9d2558b42a6dcb5a.png";

var __build_img__0 = "c7ce0c4a376bfa80.png";

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

var baseCss = "https://lihautan.com/creating-custom-javascript-syntax-with-babel/assets/_blog-299aa480.css";

var image = "https://lihautan.com/creating-custom-javascript-syntax-with-babel/assets/hero-twitter-ebb286c0.jpg";

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
					"@id": "https%3A%2F%2Flihautan.com%2Fcreating-custom-javascript-syntax-with-babel",
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
			attr(meta11, "content", "https%3A%2F%2Flihautan.com%2Fcreating-custom-javascript-syntax-with-babel");
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
							"@id": "https%3A%2F%2Flihautan.com%2Fcreating-custom-javascript-syntax-with-babel",
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

/* content/blog/creating-custom-javascript-syntax-with-babel/@@page-markup.svelte generated by Svelte v3.24.0 */

function create_default_slot(ctx) {
	let section0;
	let ul4;
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
	let ul2;
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
	let ul3;
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
	let t14;
	let p0;
	let t15;
	let a14;
	let t16;
	let t17;
	let t18;
	let section1;
	let h20;
	let a15;
	let t19;
	let t20;
	let p1;
	let t21;
	let t22;
	let pre0;

	let raw0_value = `
<code class="language-js"><span class="token comment">// '@@' makes the function &#96;foo&#96; curried</span>
<span class="token keyword">function</span> @@ <span class="token function">foo</span><span class="token punctuation">(</span><span class="token parameter">a<span class="token punctuation">,</span> b<span class="token punctuation">,</span> c</span><span class="token punctuation">)</span> <span class="token punctuation">&#123;</span>
  <span class="token keyword">return</span> a <span class="token operator">+</span> b <span class="token operator">+</span> c<span class="token punctuation">;</span>
<span class="token punctuation">&#125;</span>
console<span class="token punctuation">.</span><span class="token function">log</span><span class="token punctuation">(</span><span class="token function">foo</span><span class="token punctuation">(</span><span class="token number">1</span><span class="token punctuation">,</span> <span class="token number">2</span><span class="token punctuation">)</span><span class="token punctuation">(</span><span class="token number">3</span><span class="token punctuation">)</span><span class="token punctuation">)</span><span class="token punctuation">;</span> <span class="token comment">// 6</span></code>` + "";

	let t23;
	let p2;
	let t24;
	let a16;
	let t25;
	let t26;
	let code0;
	let t27;
	let t28;
	let a17;
	let t29;
	let t30;
	let code1;
	let t31;
	let t32;
	let code2;
	let t33;
	let t34;
	let code3;
	let t35;
	let t36;
	let code4;
	let t37;
	let t38;
	let t39;
	let p3;
	let t40;
	let a18;
	let t41;
	let t42;
	let code5;
	let t43;
	let t44;
	let code6;
	let t45;
	let t46;
	let t47;
	let pre1;

	let raw1_value = `
<code class="language-js"><span class="token function">foo</span><span class="token punctuation">(</span><span class="token number">1</span><span class="token punctuation">,</span> <span class="token number">2</span><span class="token punctuation">,</span> <span class="token number">3</span><span class="token punctuation">)</span><span class="token punctuation">;</span> <span class="token comment">// 6</span>

<span class="token keyword">const</span> bar <span class="token operator">=</span> <span class="token function">foo</span><span class="token punctuation">(</span><span class="token number">1</span><span class="token punctuation">,</span> <span class="token number">2</span><span class="token punctuation">)</span><span class="token punctuation">;</span> <span class="token comment">// (n) => 1 + 2 + n</span>
<span class="token function">bar</span><span class="token punctuation">(</span><span class="token number">3</span><span class="token punctuation">)</span><span class="token punctuation">;</span> <span class="token comment">// 6</span></code>` + "";

	let t48;
	let blockquote0;
	let p4;
	let t49;
	let code7;
	let t50;
	let t51;
	let code8;
	let t52;
	let t53;
	let code9;
	let t54;
	let t55;
	let code10;
	let t56;
	let t57;
	let a19;
	let t58;
	let t59;
	let code11;
	let t60;
	let t61;
	let t62;
	let p5;
	let t63;
	let t64;
	let ul5;
	let li14;
	let t65;
	let t66;
	let li15;
	let t67;
	let t68;
	let p6;
	let t69;
	let t70;
	let p7;
	let t71;
	let t72;
	let section2;
	let h21;
	let a20;
	let t73;
	let t74;
	let p8;
	let t75;
	let a21;
	let t76;
	let t77;
	let t78;
	let p9;
	let img0;
	let img0_src_value;
	let t79;
	let p10;
	let t80;
	let t81;
	let p11;
	let t82;
	let a22;
	let t83;
	let t84;
	let t85;
	let pre2;

	let raw2_value = `
<code class="language-sh">$ git clone https://github.com/tanhauhau/babel.git

# set up
$ cd babel
$ make bootstrap
$ make build</code>` + "";

	let t86;
	let p12;
	let t87;
	let t88;
	let p13;
	let t89;
	let code12;
	let t90;
	let t91;
	let code13;
	let t92;
	let t93;
	let code14;
	let t94;
	let t95;
	let code15;
	let t96;
	let t97;
	let t98;
	let pre3;

	let raw3_value = `
<code class="language-yml"><span class="token punctuation">-</span> doc
<span class="token punctuation">-</span> packages
  <span class="token punctuation">-</span> babel<span class="token punctuation">-</span>core
  <span class="token punctuation">-</span> babel<span class="token punctuation">-</span>parser
  <span class="token punctuation">-</span> babel<span class="token punctuation">-</span>plugin<span class="token punctuation">-</span>transform<span class="token punctuation">-</span>react<span class="token punctuation">-</span>jsx
  <span class="token punctuation">-</span> <span class="token punctuation">...</span>
<span class="token punctuation">-</span> Gulpfile.js
<span class="token punctuation">-</span> Makefile
<span class="token punctuation">-</span> <span class="token punctuation">...</span></code>` + "";

	let t99;
	let blockquote1;
	let small0;
	let t100;
	let t101;
	let section3;
	let h30;
	let a23;
	let t102;
	let t103;
	let p14;
	let t104;
	let a24;
	let t105;
	let t106;
	let a25;
	let t107;
	let t108;
	let t109;
	let p15;
	let t110;
	let t111;
	let ul6;
	let li16;
	let t112;
	let code16;
	let t113;
	let t114;
	let code17;
	let t115;
	let t116;
	let li17;
	let t117;
	let strong0;
	let t118;
	let t119;
	let em0;
	let t120;
	let t121;
	let code18;
	let t122;
	let t123;
	let li18;
	let t124;
	let strong1;
	let t125;
	let t126;
	let a26;
	let t127;
	let t128;
	let t129;
	let p16;
	let t130;
	let a27;
	let t131;
	let t132;
	let a28;
	let t133;
	let t134;
	let t135;
	let blockquote2;
	let small1;
	let t136;
	let t137;
	let section4;
	let h22;
	let a29;
	let t138;
	let t139;
	let p17;
	let t140;
	let code19;
	let t141;
	let t142;
	let t143;
	let pre4;

	let raw4_value = `
<code class="language-">- src/
  - tokenizer/
  - parser/
  - plugins/
    - jsx/
    - typescript/
    - flow/
    - ...
- test/</code>` + "";

	let t144;
	let p18;
	let t145;
	let em1;
	let t146;
	let t147;
	let em2;
	let t148;
	let t149;
	let code20;
	let t150;
	let t151;
	let code21;
	let t152;
	let t153;
	let code22;
	let t154;
	let t155;
	let t156;
	let p19;
	let t157;
	let a30;
	let t158;
	let t159;
	let t160;
	let pre5;

	let raw5_value = `
<code class="language-js"><span class="token comment">// filename: packages/babel-parser/test/curry-function.js</span>

<span class="token keyword">import</span> <span class="token punctuation">&#123;</span> parse <span class="token punctuation">&#125;</span> <span class="token keyword">from</span> <span class="token string">'../lib'</span><span class="token punctuation">;</span>

<span class="token keyword">function</span> <span class="token function">getParser</span><span class="token punctuation">(</span><span class="token parameter">code</span><span class="token punctuation">)</span> <span class="token punctuation">&#123;</span>
  <span class="token keyword">return</span> <span class="token punctuation">(</span><span class="token punctuation">)</span> <span class="token operator">=></span> <span class="token function">parse</span><span class="token punctuation">(</span>code<span class="token punctuation">,</span> <span class="token punctuation">&#123;</span> sourceType<span class="token punctuation">:</span> <span class="token string">'module'</span> <span class="token punctuation">&#125;</span><span class="token punctuation">)</span><span class="token punctuation">;</span>
<span class="token punctuation">&#125;</span>

<span class="token function">describe</span><span class="token punctuation">(</span><span class="token string">'curry function syntax'</span><span class="token punctuation">,</span> <span class="token keyword">function</span><span class="token punctuation">(</span><span class="token punctuation">)</span> <span class="token punctuation">&#123;</span>
  <span class="token function">it</span><span class="token punctuation">(</span><span class="token string">'should parse'</span><span class="token punctuation">,</span> <span class="token keyword">function</span><span class="token punctuation">(</span><span class="token punctuation">)</span> <span class="token punctuation">&#123;</span>
    <span class="token function">expect</span><span class="token punctuation">(</span><span class="token function">getParser</span><span class="token punctuation">(</span><span class="token template-string"><span class="token template-punctuation string">&#96;</span><span class="token string">function @@ foo() &#123;&#125;</span><span class="token template-punctuation string">&#96;</span></span><span class="token punctuation">)</span><span class="token punctuation">(</span><span class="token punctuation">)</span><span class="token punctuation">)</span><span class="token punctuation">.</span><span class="token function">toMatchSnapshot</span><span class="token punctuation">(</span><span class="token punctuation">)</span><span class="token punctuation">;</span>
  <span class="token punctuation">&#125;</span><span class="token punctuation">)</span><span class="token punctuation">;</span>
<span class="token punctuation">&#125;</span><span class="token punctuation">)</span><span class="token punctuation">;</span></code>` + "";

	let t161;
	let p20;
	let t162;
	let code23;
	let t163;
	let t164;
	let code24;
	let t165;
	let t166;
	let t167;
	let pre6;

	let raw6_value = `
<code class="language-sh">SyntaxError: Unexpected token (1:9)

at Parser.raise (packages/babel-parser/src/parser/location.js:39:63)
at Parser.raise [as unexpected] (packages/babel-parser/src/parser/util.js:133:16)
at Parser.unexpected [as parseIdentifierName] (packages/babel-parser/src/parser/expression.js:2090:18)
at Parser.parseIdentifierName [as parseIdentifier] (packages/babel-parser/src/parser/expression.js:2052:23)
at Parser.parseIdentifier (packages/babel-parser/src/parser/statement.js:1096:52)</code>` + "";

	let t168;
	let blockquote3;
	let small2;
	let t169;
	let t170;
	let pre7;

	let raw7_value = `
<code class="language-sh">BABEL_ENV=test node_modules/.bin/jest -u packages/babel-parser/test/curry-function.js</code>` + "";

	let t171;
	let p21;
	let t172;
	let code25;
	let t173;
	let t174;
	let t175;
	let p22;
	let t176;
	let code26;
	let t177;
	let t178;
	let t179;
	let p23;
	let t180;
	let a31;
	let code27;
	let t181;
	let t182;
	let code28;
	let t183;
	let t184;
	let t185;
	let p24;
	let t186;
	let code29;
	let t187;
	let t188;
	let t189;
	let pre8;

	let raw8_value = `
<code class="language-js"><span class="token comment">// filename: packages/babel-parser/src/parser/expression.js</span>
<span class="token function">parseIdentifierName</span><span class="token punctuation">(</span>pos<span class="token punctuation">:</span> number<span class="token punctuation">,</span> liberal<span class="token operator">?</span><span class="token punctuation">:</span> boolean<span class="token punctuation">)</span><span class="token punctuation">:</span> string <span class="token punctuation">&#123;</span>
  <span class="token keyword">if</span> <span class="token punctuation">(</span><span class="token keyword">this</span><span class="token punctuation">.</span><span class="token function">match</span><span class="token punctuation">(</span>tt<span class="token punctuation">.</span>name<span class="token punctuation">)</span><span class="token punctuation">)</span> <span class="token punctuation">&#123;</span>
    <span class="token comment">// ...</span>
  <span class="token punctuation">&#125;</span> <span class="token keyword">else</span> <span class="token punctuation">&#123;</span>
    console<span class="token punctuation">.</span><span class="token function">log</span><span class="token punctuation">(</span><span class="token keyword">this</span><span class="token punctuation">.</span>state<span class="token punctuation">.</span>type<span class="token punctuation">)</span><span class="token punctuation">;</span> <span class="token comment">// current token</span>
    console<span class="token punctuation">.</span><span class="token function">log</span><span class="token punctuation">(</span><span class="token keyword">this</span><span class="token punctuation">.</span><span class="token function">lookahead</span><span class="token punctuation">(</span><span class="token punctuation">)</span><span class="token punctuation">.</span>type<span class="token punctuation">)</span><span class="token punctuation">;</span> <span class="token comment">// next token</span>
    <span class="token keyword">throw</span> <span class="token keyword">this</span><span class="token punctuation">.</span><span class="token function">unexpected</span><span class="token punctuation">(</span><span class="token punctuation">)</span><span class="token punctuation">;</span>
  <span class="token punctuation">&#125;</span>
<span class="token punctuation">&#125;</span></code>` + "";

	let t190;
	let p25;
	let t191;
	let code30;
	let t192;
	let t193;
	let t194;
	let pre9;

	let raw9_value = `
<code class="language-js">TokenType <span class="token punctuation">&#123;</span>
  label<span class="token punctuation">:</span> <span class="token string">'@'</span><span class="token punctuation">,</span>
  <span class="token comment">// ...</span>
<span class="token punctuation">&#125;</span></code>` + "";

	let t195;
	let p26;
	let t196;
	let code31;
	let t197;
	let t198;
	let code32;
	let t199;
	let t200;
	let t201;
	let p27;
	let t202;
	let a32;
	let t203;
	let t204;
	let t205;
	let p28;
	let t206;
	let t207;
	let ul7;
	let li19;
	let t208;
	let code33;
	let t209;
	let t210;
	let li20;
	let t211;
	let code34;
	let t212;
	let t213;
	let t214;
	let li21;
	let t215;
	let code35;
	let t216;
	let t217;
	let li22;
	let t218;
	let code36;
	let t219;
	let t220;
	let p29;
	let t221;
	let t222;
	let p30;
	let t223;
	let code37;
	let t224;
	let t225;
	let code38;
	let t226;
	let t227;
	let t228;
	let section5;
	let h31;
	let a33;
	let t229;
	let t230;
	let p31;
	let t231;
	let a34;
	let t232;
	let t233;
	let t234;
	let p32;
	let t235;
	let t236;
	let pre10;

	let raw10_value = `
<code class="language-js"><span class="token comment">// filename: packages/babel-parser/src/tokenizer/types.js</span>

<span class="token keyword">export</span> <span class="token keyword">const</span> types<span class="token punctuation">:</span> <span class="token punctuation">&#123;</span> <span class="token punctuation">[</span>name<span class="token punctuation">:</span> string<span class="token punctuation">]</span><span class="token punctuation">:</span> TokenType <span class="token punctuation">&#125;</span> <span class="token operator">=</span> <span class="token punctuation">&#123;</span>
  <span class="token comment">// ...</span>
  at<span class="token punctuation">:</span> <span class="token keyword">new</span> <span class="token class-name">TokenType</span><span class="token punctuation">(</span><span class="token string">'@'</span><span class="token punctuation">)</span><span class="token punctuation">,</span>
  <span class="token comment">// highlight-next-line</span>
  atat<span class="token punctuation">:</span> <span class="token keyword">new</span> <span class="token class-name">TokenType</span><span class="token punctuation">(</span><span class="token string">'@@'</span><span class="token punctuation">)</span><span class="token punctuation">,</span>
<span class="token punctuation">&#125;</span><span class="token punctuation">;</span></code>` + "";

	let t237;
	let p33;
	let t238;
	let em3;
	let t239;
	let t240;
	let code39;
	let t241;
	let t242;
	let code40;
	let t243;
	let t244;
	let a35;
	let t245;
	let t246;
	let blockquote4;
	let small3;
	let t247;
	let t248;
	let p34;
	let t249;
	let code41;
	let t250;
	let t251;
	let code42;
	let t252;
	let t253;
	let code43;
	let t254;
	let t255;
	let code44;
	let t256;
	let t257;
	let t258;
	let pre11;

	let raw11_value = `
<code class="language-js"><span class="token comment">// filename: packages/babel-parser/src/tokenizer/index.js</span>

<span class="token function">getTokenFromCode</span><span class="token punctuation">(</span>code<span class="token punctuation">:</span> number<span class="token punctuation">)</span><span class="token punctuation">:</span> <span class="token keyword">void</span> <span class="token punctuation">&#123;</span>
  <span class="token keyword">switch</span> <span class="token punctuation">(</span>code<span class="token punctuation">)</span> <span class="token punctuation">&#123;</span>
    <span class="token comment">// ...</span>
    <span class="token keyword">case</span> charCodes<span class="token punctuation">.</span>atSign<span class="token punctuation">:</span>
      <span class="token comment">// highlight-start</span>
      <span class="token comment">// if the next character is a &#96;@&#96;</span>
      <span class="token keyword">if</span> <span class="token punctuation">(</span><span class="token keyword">this</span><span class="token punctuation">.</span>input<span class="token punctuation">.</span><span class="token function">charCodeAt</span><span class="token punctuation">(</span><span class="token keyword">this</span><span class="token punctuation">.</span>state<span class="token punctuation">.</span>pos <span class="token operator">+</span> <span class="token number">1</span><span class="token punctuation">)</span> <span class="token operator">===</span> charCodes<span class="token punctuation">.</span>atSign<span class="token punctuation">)</span> <span class="token punctuation">&#123;</span>
        <span class="token comment">// create &#96;tt.atat&#96; instead</span>
        <span class="token keyword">this</span><span class="token punctuation">.</span><span class="token function">finishOp</span><span class="token punctuation">(</span>tt<span class="token punctuation">.</span>atat<span class="token punctuation">,</span> <span class="token number">2</span><span class="token punctuation">)</span><span class="token punctuation">;</span>
      <span class="token punctuation">&#125;</span> <span class="token keyword">else</span> <span class="token punctuation">&#123;</span>
        <span class="token keyword">this</span><span class="token punctuation">.</span><span class="token function">finishOp</span><span class="token punctuation">(</span>tt<span class="token punctuation">.</span>at<span class="token punctuation">,</span> <span class="token number">1</span><span class="token punctuation">)</span><span class="token punctuation">;</span>
      <span class="token punctuation">&#125;</span>
      <span class="token keyword">return</span><span class="token punctuation">;</span>
      <span class="token comment">// highlight-end</span>
    <span class="token comment">// ...</span>
  <span class="token punctuation">&#125;</span>
<span class="token punctuation">&#125;</span></code>` + "";

	let t259;
	let p35;
	let t260;
	let t261;
	let pre12;

	let raw12_value = `
<code class="language-js"><span class="token comment">// current token</span>
TokenType <span class="token punctuation">&#123;</span>
  label<span class="token punctuation">:</span> <span class="token string">'@@'</span><span class="token punctuation">,</span>
  <span class="token comment">// ...</span>
<span class="token punctuation">&#125;</span>

<span class="token comment">// next token</span>
TokenType <span class="token punctuation">&#123;</span>
  label<span class="token punctuation">:</span> <span class="token string">'name'</span><span class="token punctuation">,</span>
  <span class="token comment">// ...</span>
<span class="token punctuation">&#125;</span></code>` + "";

	let t262;
	let p36;
	let t263;
	let span;
	let t264;
	let t265;
	let section6;
	let h32;
	let a36;
	let t266;
	let t267;
	let p37;
	let t268;
	let a37;
	let t269;
	let t270;
	let t271;
	let p38;
	let img1;
	let img1_src_value;
	let t272;
	let p39;
	let t273;
	let code45;
	let t274;
	let t275;
	let code46;
	let t276;
	let t277;
	let t278;
	let p40;
	let t279;
	let code47;
	let t280;
	let t281;
	let code48;
	let t282;
	let t283;
	let t284;
	let p41;
	let img2;
	let img2_src_value;
	let t285;
	let p42;
	let t286;
	let t287;
	let p43;
	let t288;
	let em4;
	let t289;
	let t290;
	let code49;
	let t291;
	let t292;
	let a38;
	let t293;
	let t294;
	let code50;
	let t295;
	let t296;
	let t297;
	let pre13;

	let raw13_value = `
<code class="language-js"><span class="token comment">// filename: packages/babel-parser/src/parser/statement.js</span>

<span class="token keyword">export</span> <span class="token keyword">default</span> <span class="token keyword">class</span> <span class="token class-name">StatementParser</span> <span class="token keyword">extends</span> <span class="token class-name">ExpressionParser</span> <span class="token punctuation">&#123;</span>
  <span class="token comment">// ...</span>
  parseFunction<span class="token operator">&lt;</span><span class="token constant">T</span><span class="token punctuation">:</span> <span class="token constant">N</span><span class="token punctuation">.</span>NormalFunction<span class="token operator">></span><span class="token punctuation">(</span>
    node<span class="token punctuation">:</span> <span class="token constant">T</span><span class="token punctuation">,</span>
    statement<span class="token operator">?</span><span class="token punctuation">:</span> number <span class="token operator">=</span> <span class="token constant">FUNC_NO_FLAGS</span><span class="token punctuation">,</span>
    isAsync<span class="token operator">?</span><span class="token punctuation">:</span> boolean <span class="token operator">=</span> <span class="token boolean">false</span>
  <span class="token punctuation">)</span><span class="token punctuation">:</span> <span class="token constant">T</span> <span class="token punctuation">&#123;</span>
    <span class="token comment">// ...</span>
    node<span class="token punctuation">.</span>generator <span class="token operator">=</span> <span class="token keyword">this</span><span class="token punctuation">.</span><span class="token function">eat</span><span class="token punctuation">(</span>tt<span class="token punctuation">.</span>star<span class="token punctuation">)</span><span class="token punctuation">;</span>
    <span class="token comment">// highlight-next-line</span>
    node<span class="token punctuation">.</span>curry <span class="token operator">=</span> <span class="token keyword">this</span><span class="token punctuation">.</span><span class="token function">eat</span><span class="token punctuation">(</span>tt<span class="token punctuation">.</span>atat<span class="token punctuation">)</span><span class="token punctuation">;</span>
  <span class="token punctuation">&#125;</span>
<span class="token punctuation">&#125;</span></code>` + "";

	let t298;
	let p44;
	let t299;
	let t300;
	let pre14;

	let raw14_value = `
<code class="language-sh"> PASS  packages/babel-parser/test/curry-function.js
  curry function syntax
    ✓ should parse (12ms)</code>` + "";

	let t301;
	let p45;
	let t302;
	let t303;
	let p46;
	let t304;
	let t305;
	let section7;
	let h33;
	let a39;
	let t306;
	let t307;
	let p47;
	let t308;
	let em5;
	let t309;
	let t310;
	let t311;
	let p48;
	let t312;
	let t313;
	let pre15;

	let raw15_value = `
<code class="language-">...
ExponentiationExpression -&gt; UnaryExpression
                            UpdateExpression ** ExponentiationExpression
MultiplicativeExpression -&gt; ExponentiationExpression
                            MultiplicativeExpression (&quot;*&quot; or &quot;/&quot; or &quot;%&quot;) ExponentiationExpression
AdditiveExpression       -&gt; MultiplicativeExpression
                            AdditiveExpression + MultiplicativeExpression
                            AdditiveExpression - MultiplicativeExpression
...</code>` + "";

	let t314;
	let p49;
	let t315;
	let code51;
	let t316;
	let t317;
	let t318;
	let ul8;
	let li23;
	let t319;
	let code52;
	let t320;
	let t321;
	let t322;
	let li24;
	let t323;
	let code53;
	let t324;
	let t325;
	let code54;
	let t326;
	let t327;
	let code55;
	let t328;
	let t329;
	let t330;
	let li25;
	let t331;
	let code56;
	let t332;
	let t333;
	let code57;
	let t334;
	let t335;
	let code58;
	let t336;
	let t337;
	let t338;
	let p50;
	let t339;
	let code59;
	let t340;
	let t341;
	let t342;
	let pre16;

	let raw16_value = `
<code class="language-">(AdditiveExpression &quot;+&quot; 1 (MultiplicativeExpression &quot;*&quot; 2 3))</code>` + "";

	let t343;
	let p51;
	let t344;
	let t345;
	let pre17;

	let raw17_value = `
<code class="language-">(MultiplicativeExpression &quot;*&quot; (AdditiveExpression &quot;+&quot; 1 2) 3)</code>` + "";

	let t346;
	let p52;
	let t347;
	let t348;
	let pre18;

	let raw18_value = `
<code class="language-js"><span class="token keyword">class</span> <span class="token class-name">Parser</span> <span class="token punctuation">&#123;</span>
  <span class="token comment">// ...</span>
  <span class="token function">parseAdditiveExpression</span><span class="token punctuation">(</span><span class="token punctuation">)</span> <span class="token punctuation">&#123;</span>
    <span class="token keyword">const</span> left <span class="token operator">=</span> <span class="token keyword">this</span><span class="token punctuation">.</span><span class="token function">parseMultiplicativeExpression</span><span class="token punctuation">(</span><span class="token punctuation">)</span><span class="token punctuation">;</span>
    <span class="token comment">// if the current token is &#96;+&#96; or &#96;-&#96;</span>
    <span class="token keyword">if</span> <span class="token punctuation">(</span><span class="token keyword">this</span><span class="token punctuation">.</span><span class="token function">match</span><span class="token punctuation">(</span>tt<span class="token punctuation">.</span>plus<span class="token punctuation">)</span> <span class="token operator">||</span> <span class="token keyword">this</span><span class="token punctuation">.</span><span class="token function">match</span><span class="token punctuation">(</span>tt<span class="token punctuation">.</span>minus<span class="token punctuation">)</span><span class="token punctuation">)</span> <span class="token punctuation">&#123;</span>
      <span class="token keyword">const</span> operator <span class="token operator">=</span> <span class="token keyword">this</span><span class="token punctuation">.</span>state<span class="token punctuation">.</span>type<span class="token punctuation">;</span>
      <span class="token comment">// move on to the next token</span>
      <span class="token keyword">this</span><span class="token punctuation">.</span><span class="token function">nextToken</span><span class="token punctuation">(</span><span class="token punctuation">)</span><span class="token punctuation">;</span>
      <span class="token keyword">const</span> right <span class="token operator">=</span> <span class="token keyword">this</span><span class="token punctuation">.</span><span class="token function">parseMultiplicativeExpression</span><span class="token punctuation">(</span><span class="token punctuation">)</span><span class="token punctuation">;</span>

      <span class="token comment">// create the node</span>
      <span class="token keyword">this</span><span class="token punctuation">.</span><span class="token function">finishNode</span><span class="token punctuation">(</span>
        <span class="token punctuation">&#123;</span>
          operator<span class="token punctuation">,</span>
          left<span class="token punctuation">,</span>
          right<span class="token punctuation">,</span>
        <span class="token punctuation">&#125;</span><span class="token punctuation">,</span>
        <span class="token string">'BinaryExpression'</span>
      <span class="token punctuation">)</span><span class="token punctuation">;</span>
    <span class="token punctuation">&#125;</span> <span class="token keyword">else</span> <span class="token punctuation">&#123;</span>
      <span class="token comment">// return as MultiplicativeExpression</span>
      <span class="token keyword">return</span> left<span class="token punctuation">;</span>
    <span class="token punctuation">&#125;</span>
  <span class="token punctuation">&#125;</span>
<span class="token punctuation">&#125;</span></code>` + "";

	let t349;
	let p53;
	let em6;
	let t350;
	let t351;
	let p54;
	let t352;
	let code60;
	let t353;
	let t354;
	let code61;
	let t355;
	let t356;
	let code62;
	let t357;
	let t358;
	let a40;
	let t359;
	let t360;
	let t361;
	let section8;
	let h4;
	let a41;
	let t362;
	let t363;
	let p55;
	let t364;
	let code63;
	let t365;
	let t366;
	let code64;
	let t367;
	let t368;
	let code65;
	let t369;
	let t370;
	let t371;
	let ul10;
	let li26;
	let strong2;
	let code66;
	let t372;
	let t373;
	let code67;
	let t374;
	let t375;
	let t376;
	let li27;
	let strong3;
	let code68;
	let t377;
	let t378;
	let t379;
	let li29;
	let strong4;
	let code69;
	let t380;
	let t381;
	let code70;
	let t382;
	let t383;
	let code71;
	let t384;
	let t385;
	let code72;
	let t386;
	let t387;
	let code73;
	let t388;
	let ul9;
	let li28;
	let code74;
	let t389;
	let t390;
	let code75;
	let t391;
	let t392;
	let code76;
	let t393;
	let t394;
	let code77;
	let t395;
	let t396;
	let t397;
	let li30;
	let strong5;
	let code78;
	let t398;
	let t399;
	let t400;
	let p56;
	let t401;
	let t402;
	let pre19;

	let raw19_value = `
<code class="language-js"><span class="token comment">// filename: packages/babel-parser/src/parser/statement.js</span>

<span class="token keyword">export</span> <span class="token keyword">default</span> <span class="token keyword">class</span> <span class="token class-name">StatementParser</span> <span class="token keyword">extends</span> <span class="token class-name">ExpressionParser</span> <span class="token punctuation">&#123;</span>
  <span class="token function">parseStatementContent</span><span class="token punctuation">(</span><span class="token comment">/* ...*/</span><span class="token punctuation">)</span> <span class="token punctuation">&#123;</span>
    <span class="token comment">// ...</span>
    <span class="token comment">// NOTE: we call match to check the current token</span>
    <span class="token keyword">if</span> <span class="token punctuation">(</span><span class="token keyword">this</span><span class="token punctuation">.</span><span class="token function">match</span><span class="token punctuation">(</span>tt<span class="token punctuation">.</span>_function<span class="token punctuation">)</span><span class="token punctuation">)</span> <span class="token punctuation">&#123;</span>
      <span class="token keyword">this</span><span class="token punctuation">.</span><span class="token function">next</span><span class="token punctuation">(</span><span class="token punctuation">)</span><span class="token punctuation">;</span>
      <span class="token comment">// NOTE: function statement has a higher precendence than a generic statement</span>
      <span class="token keyword">this</span><span class="token punctuation">.</span><span class="token function">parseFunction</span><span class="token punctuation">(</span><span class="token punctuation">)</span><span class="token punctuation">;</span>
    <span class="token punctuation">&#125;</span>
  <span class="token punctuation">&#125;</span>
  <span class="token comment">// ...</span>
  <span class="token function">parseFunction</span><span class="token punctuation">(</span><span class="token comment">/* ... */</span><span class="token punctuation">)</span> <span class="token punctuation">&#123;</span>
    <span class="token comment">// NOTE: we call eat to check whether the optional token exists</span>
    node<span class="token punctuation">.</span>generator <span class="token operator">=</span> <span class="token keyword">this</span><span class="token punctuation">.</span><span class="token function">eat</span><span class="token punctuation">(</span>tt<span class="token punctuation">.</span>star<span class="token punctuation">)</span><span class="token punctuation">;</span>
    <span class="token comment">// highlight-next-line</span>
    node<span class="token punctuation">.</span>curry <span class="token operator">=</span> <span class="token keyword">this</span><span class="token punctuation">.</span><span class="token function">eat</span><span class="token punctuation">(</span>tt<span class="token punctuation">.</span>atat<span class="token punctuation">)</span><span class="token punctuation">;</span>
    node<span class="token punctuation">.</span>id <span class="token operator">=</span> <span class="token keyword">this</span><span class="token punctuation">.</span><span class="token function">parseFunctionId</span><span class="token punctuation">(</span><span class="token punctuation">)</span><span class="token punctuation">;</span>
  <span class="token punctuation">&#125;</span>
<span class="token punctuation">&#125;</span></code>` + "";

	let t403;
	let p57;
	let t404;
	let t405;
	let ul11;
	let li31;
	let a42;
	let t406;
	let t407;
	let a43;
	let t408;
	let t409;
	let li32;
	let a44;
	let t410;
	let t411;
	let t412;
	let hr0;
	let t413;
	let p58;
	let strong6;
	let t414;
	let t415;
	let t416;
	let p59;
	let t417;
	let t418;
	let p60;
	let t419;
	let code79;
	let t420;
	let t421;
	let code80;
	let t422;
	let t423;
	let t424;
	let p61;
	let img3;
	let img3_src_value;
	let t425;
	let hr1;
	let t426;
	let section9;
	let h23;
	let a45;
	let t427;
	let t428;
	let p62;
	let t429;
	let t430;
	let p63;
	let t431;
	let t432;
	let p64;
	let t433;
	let a46;
	let t434;
	let t435;
	let pre20;

	let raw20_value = `
<code class="language-js"><span class="token comment">// filename: babel-plugin-transformation-curry-function.js</span>
<span class="token keyword">import</span> customParser <span class="token keyword">from</span> <span class="token string">'./custom-parser'</span><span class="token punctuation">;</span>

<span class="token keyword">export</span> <span class="token keyword">default</span> <span class="token keyword">function</span> <span class="token function">ourBabelPlugin</span><span class="token punctuation">(</span><span class="token punctuation">)</span> <span class="token punctuation">&#123;</span>
  <span class="token keyword">return</span> <span class="token punctuation">&#123;</span>
    <span class="token function">parserOverride</span><span class="token punctuation">(</span><span class="token parameter">code<span class="token punctuation">,</span> opts</span><span class="token punctuation">)</span> <span class="token punctuation">&#123;</span>
      <span class="token keyword">return</span> customParser<span class="token punctuation">.</span><span class="token function">parse</span><span class="token punctuation">(</span>code<span class="token punctuation">,</span> opts<span class="token punctuation">)</span><span class="token punctuation">;</span>
    <span class="token punctuation">&#125;</span><span class="token punctuation">,</span>
  <span class="token punctuation">&#125;</span><span class="token punctuation">;</span>
<span class="token punctuation">&#125;</span></code>` + "";

	let t436;
	let p65;
	let t437;
	let t438;
	let p66;
	let t439;
	let em7;
	let t440;
	let t441;
	let hr2;
	let t442;
	let p67;
	let t443;
	let t444;
	let p68;
	let t445;
	let a47;
	let t446;
	let t447;
	let code81;
	let t448;
	let t449;
	let code82;
	let t450;
	let t451;
	let t452;
	let blockquote5;
	let p69;
	let t453;
	let a48;
	let t454;
	let t455;
	let t456;
	let hr3;
	let t457;
	let p70;
	let t458;
	let code83;
	let t459;
	let t460;
	let t461;
	let pre21;

	let raw21_value = `
<code class="language-js"><span class="token keyword">function</span> <span class="token function">currying</span><span class="token punctuation">(</span><span class="token parameter">fn</span><span class="token punctuation">)</span> <span class="token punctuation">&#123;</span>
  <span class="token keyword">const</span> numParamsRequired <span class="token operator">=</span> fn<span class="token punctuation">.</span>length<span class="token punctuation">;</span>
  <span class="token keyword">function</span> <span class="token function">curryFactory</span><span class="token punctuation">(</span><span class="token parameter">params</span><span class="token punctuation">)</span> <span class="token punctuation">&#123;</span>
    <span class="token keyword">return</span> <span class="token keyword">function</span> <span class="token punctuation">(</span><span class="token parameter"><span class="token operator">...</span>args</span><span class="token punctuation">)</span> <span class="token punctuation">&#123;</span>
      <span class="token keyword">const</span> newParams <span class="token operator">=</span> params<span class="token punctuation">.</span><span class="token function">concat</span><span class="token punctuation">(</span>args<span class="token punctuation">)</span><span class="token punctuation">;</span>
      <span class="token keyword">if</span> <span class="token punctuation">(</span>newParams<span class="token punctuation">.</span>length <span class="token operator">>=</span> numParamsRequired<span class="token punctuation">)</span> <span class="token punctuation">&#123;</span>
        <span class="token keyword">return</span> <span class="token function">fn</span><span class="token punctuation">(</span><span class="token operator">...</span>newParams<span class="token punctuation">)</span><span class="token punctuation">;</span>
      <span class="token punctuation">&#125;</span>
      <span class="token keyword">return</span> <span class="token function">curryFactory</span><span class="token punctuation">(</span>newParams<span class="token punctuation">)</span><span class="token punctuation">;</span>
    <span class="token punctuation">&#125;</span>
  <span class="token punctuation">&#125;</span>
  <span class="token keyword">return</span> <span class="token function">curryFactory</span><span class="token punctuation">(</span><span class="token punctuation">[</span><span class="token punctuation">]</span><span class="token punctuation">)</span><span class="token punctuation">;</span>
<span class="token punctuation">&#125;</span></code>` + "";

	let t462;
	let blockquote6;
	let p71;
	let t463;
	let a49;
	let t464;
	let t465;
	let a50;
	let t466;
	let t467;
	let p72;
	let t468;
	let t469;
	let pre22;

	let raw22_value = `
<code class="language-js"><span class="token comment">// from</span>
<span class="token keyword">function</span> @@ <span class="token function">foo</span><span class="token punctuation">(</span><span class="token parameter">a<span class="token punctuation">,</span> b<span class="token punctuation">,</span> c</span><span class="token punctuation">)</span> <span class="token punctuation">&#123;</span>
  <span class="token keyword">return</span> a <span class="token operator">+</span> b <span class="token operator">+</span> c<span class="token punctuation">;</span>
<span class="token punctuation">&#125;</span>

<span class="token comment">// to</span>
<span class="token keyword">const</span> foo <span class="token operator">=</span> <span class="token function">currying</span><span class="token punctuation">(</span><span class="token keyword">function</span> <span class="token function">foo</span><span class="token punctuation">(</span><span class="token parameter">a<span class="token punctuation">,</span> b<span class="token punctuation">,</span> c</span><span class="token punctuation">)</span> <span class="token punctuation">&#123;</span>
  <span class="token keyword">return</span> a <span class="token operator">+</span> b <span class="token operator">+</span> c<span class="token punctuation">;</span>
<span class="token punctuation">&#125;</span><span class="token punctuation">)</span></code>` + "";

	let t470;
	let blockquote7;
	let p73;
	let t471;
	let a51;
	let t472;
	let t473;
	let code84;
	let t474;
	let t475;
	let t476;
	let p74;
	let t477;
	let a52;
	let t478;
	let t479;
	let t480;
	let pre23;

	let raw23_value = `
<code class="language-js"><span class="token comment">// filename: babel-plugin-transformation-curry-function.js</span>
<span class="token keyword">export</span> <span class="token keyword">default</span> <span class="token keyword">function</span> <span class="token function">ourBabelPlugin</span><span class="token punctuation">(</span><span class="token punctuation">)</span> <span class="token punctuation">&#123;</span>
  <span class="token keyword">return</span> <span class="token punctuation">&#123;</span>
    <span class="token comment">// ...</span>
    <span class="token comment">// highlight-start</span>
    visitor<span class="token punctuation">:</span> <span class="token punctuation">&#123;</span>
      <span class="token function">FunctionDeclaration</span><span class="token punctuation">(</span><span class="token parameter">path</span><span class="token punctuation">)</span> <span class="token punctuation">&#123;</span>
        <span class="token keyword">if</span> <span class="token punctuation">(</span>path<span class="token punctuation">.</span><span class="token function">get</span><span class="token punctuation">(</span><span class="token string">'curry'</span><span class="token punctuation">)</span><span class="token punctuation">.</span>node<span class="token punctuation">)</span> <span class="token punctuation">&#123;</span>
          <span class="token comment">// const foo = curry(function () &#123; ... &#125;);</span>
          path<span class="token punctuation">.</span>node<span class="token punctuation">.</span>curry <span class="token operator">=</span> <span class="token boolean">false</span><span class="token punctuation">;</span>
          path<span class="token punctuation">.</span><span class="token function">replaceWith</span><span class="token punctuation">(</span>
            t<span class="token punctuation">.</span><span class="token function">variableDeclaration</span><span class="token punctuation">(</span><span class="token string">'const'</span><span class="token punctuation">,</span> <span class="token punctuation">[</span>
              t<span class="token punctuation">.</span><span class="token function">variableDeclarator</span><span class="token punctuation">(</span>
                t<span class="token punctuation">.</span><span class="token function">identifier</span><span class="token punctuation">(</span>path<span class="token punctuation">.</span><span class="token function">get</span><span class="token punctuation">(</span><span class="token string">'id.name'</span><span class="token punctuation">)</span><span class="token punctuation">.</span>node<span class="token punctuation">)</span><span class="token punctuation">,</span>
                t<span class="token punctuation">.</span><span class="token function">callExpression</span><span class="token punctuation">(</span>t<span class="token punctuation">.</span><span class="token function">identifier</span><span class="token punctuation">(</span><span class="token string">'currying'</span><span class="token punctuation">)</span><span class="token punctuation">,</span> <span class="token punctuation">[</span>
                  t<span class="token punctuation">.</span><span class="token function">toExpression</span><span class="token punctuation">(</span>path<span class="token punctuation">.</span>node<span class="token punctuation">)</span><span class="token punctuation">,</span>
                <span class="token punctuation">]</span><span class="token punctuation">)</span>
              <span class="token punctuation">)</span><span class="token punctuation">,</span>
            <span class="token punctuation">]</span><span class="token punctuation">)</span>
          <span class="token punctuation">)</span><span class="token punctuation">;</span>
        <span class="token punctuation">&#125;</span>
      <span class="token punctuation">&#125;</span><span class="token punctuation">,</span>
    <span class="token punctuation">&#125;</span><span class="token punctuation">,</span>
    <span class="token comment">// highlight-end</span>
  <span class="token punctuation">&#125;</span><span class="token punctuation">;</span>
<span class="token punctuation">&#125;</span></code>` + "";

	let t481;
	let p75;
	let t482;
	let code85;
	let t483;
	let t484;
	let t485;
	let p76;
	let t486;
	let t487;
	let section10;
	let h34;
	let a53;
	let t488;
	let code86;
	let t489;
	let t490;
	let t491;
	let p77;
	let t492;
	let t493;
	let p78;
	let t494;
	let code87;
	let t495;
	let t496;
	let em8;
	let t497;
	let t498;
	let a54;
	let t499;
	let t500;
	let t501;
	let p79;
	let t502;
	let code88;
	let t503;
	let t504;
	let code89;
	let t505;
	let t506;
	let t507;
	let section11;
	let h35;
	let a55;
	let t508;
	let code90;
	let t509;
	let t510;
	let p80;
	let t511;
	let code91;
	let t512;
	let t513;
	let code92;
	let t514;
	let t515;
	let code93;
	let t516;
	let t517;
	let code94;
	let t518;
	let t519;
	let t520;
	let pre24;

	let raw24_value = `
<code class="language-js"><span class="token comment">// filename: package.json</span>
<span class="token punctuation">&#123;</span>
  <span class="token string">"resolutions"</span><span class="token punctuation">:</span> <span class="token punctuation">&#123;</span>
    <span class="token string">"@babel/helpers"</span><span class="token punctuation">:</span> <span class="token string">"7.6.0--your-custom-forked-version"</span><span class="token punctuation">,</span>
  <span class="token punctuation">&#125;</span>
<span class="token punctuation">&#125;</span></code>` + "";

	let t521;
	let p81;
	let em9;
	let strong7;
	let t522;
	let t523;
	let a56;
	let t524;
	let t525;
	let t526;
	let p82;
	let t527;
	let code95;
	let t528;
	let t529;
	let t530;
	let p83;
	let t531;
	let a57;
	let t532;
	let t533;
	let t534;
	let pre25;

	let raw25_value = `
<code class="language-js">helpers<span class="token punctuation">.</span>currying <span class="token operator">=</span> <span class="token function">helper</span><span class="token punctuation">(</span><span class="token string">"7.6.0"</span><span class="token punctuation">)</span><span class="token template-string"><span class="token template-punctuation string">&#96;</span><span class="token string">
  export default function currying(fn) &#123;
    const numParamsRequired = fn.length;
    function curryFactory(params) &#123;
      return function (...args) &#123;
        const newParams = params.concat(args);
        if (newParams.length >= numParamsRequired) &#123;
          return fn(...newParams);
        &#125;
        return curryFactory(newParams);
      &#125;
    &#125;
    return curryFactory([]);
  &#125;
</span><span class="token template-punctuation string">&#96;</span></span><span class="token punctuation">;</span></code>` + "";

	let t535;
	let p84;
	let t536;
	let code96;
	let t537;
	let t538;
	let code97;
	let t539;
	let t540;
	let code98;
	let t541;
	let t542;
	let t543;
	let p85;
	let t544;
	let code99;
	let t545;
	let t546;
	let t547;
	let pre26;

	let raw26_value = `
<code class="language-js"><span class="token comment">// ...</span>
path<span class="token punctuation">.</span><span class="token function">replaceWith</span><span class="token punctuation">(</span>
  t<span class="token punctuation">.</span><span class="token function">variableDeclaration</span><span class="token punctuation">(</span><span class="token string">'const'</span><span class="token punctuation">,</span> <span class="token punctuation">[</span>
    t<span class="token punctuation">.</span><span class="token function">variableDeclarator</span><span class="token punctuation">(</span>
      t<span class="token punctuation">.</span><span class="token function">identifier</span><span class="token punctuation">(</span>path<span class="token punctuation">.</span><span class="token function">get</span><span class="token punctuation">(</span><span class="token string">'id.name'</span><span class="token punctuation">)</span><span class="token punctuation">.</span>node<span class="token punctuation">)</span><span class="token punctuation">,</span>
      t<span class="token punctuation">.</span><span class="token function">callExpression</span><span class="token punctuation">(</span><span class="token keyword">this</span><span class="token punctuation">.</span><span class="token function">addHelper</span><span class="token punctuation">(</span><span class="token string">"currying"</span><span class="token punctuation">)</span><span class="token punctuation">,</span> <span class="token punctuation">[</span>
        t<span class="token punctuation">.</span><span class="token function">toExpression</span><span class="token punctuation">(</span>path<span class="token punctuation">.</span>node<span class="token punctuation">)</span><span class="token punctuation">,</span>
      <span class="token punctuation">]</span><span class="token punctuation">)</span>
    <span class="token punctuation">)</span><span class="token punctuation">,</span>
  <span class="token punctuation">]</span><span class="token punctuation">)</span>
<span class="token punctuation">)</span><span class="token punctuation">;</span></code>` + "";

	let t548;
	let p86;
	let t549;
	let code100;
	let t550;
	let t551;
	let code101;
	let t552;
	let t553;
	let t554;
	let section12;
	let h24;
	let a58;
	let t555;
	let t556;
	let p87;
	let t557;
	let em10;
	let t558;
	let a59;
	let t559;
	let t560;
	let t561;
	let code102;
	let t562;
	let t563;
	let code103;
	let t564;
	let t565;
	let t566;
	let p88;
	let t567;
	let a60;
	let t568;
	let t569;
	let t570;
	let p89;
	let t571;
	let a61;
	let t572;
	let t573;
	let a62;
	let t574;
	let t575;
	let t576;
	let p90;
	let t577;
	let a63;
	let t578;
	let t579;
	let t580;
	let hr4;
	let t581;
	let section13;
	let h25;
	let a64;
	let t582;
	let t583;
	let p91;
	let t584;
	let t585;
	let p92;
	let t586;
	let t587;
	let p93;
	let t588;
	let code104;
	let t589;
	let t590;
	let t591;
	let p94;
	let t592;
	let a65;
	let t593;
	let t594;
	let t595;
	let section14;
	let h26;
	let a66;
	let t596;
	let t597;
	let p95;
	let t598;
	let t599;
	let ul12;
	let li33;
	let a67;
	let t600;
	let t601;
	let a68;
	let t602;
	let t603;
	let li34;
	let a69;
	let t604;
	let t605;
	let t606;
	let li35;
	let a70;
	let t607;
	let t608;
	let a71;
	let t609;
	let t610;
	let p96;
	let t611;
	let t612;
	let ul13;
	let li36;
	let a72;
	let t613;
	let t614;
	let a73;
	let t615;
	let t616;
	let li37;
	let a74;
	let t617;
	let t618;
	let a75;
	let t619;
	let t620;
	let li38;
	let a76;
	let t621;
	let t622;
	let li39;
	let a77;
	let t623;

	return {
		c() {
			section0 = element("section");
			ul4 = element("ul");
			li0 = element("li");
			a0 = element("a");
			t0 = text("Overview");
			li1 = element("li");
			a1 = element("a");
			t1 = text("Fork the babel");
			ul0 = element("ul");
			li2 = element("li");
			a2 = element("a");
			t2 = text("Crash Course on Parsing Code to AST");
			li3 = element("li");
			a3 = element("a");
			t3 = text("Our custom babel parser");
			ul2 = element("ul");
			li4 = element("li");
			a4 = element("a");
			t4 = text("A new token: '@@'");
			li5 = element("li");
			a5 = element("a");
			t5 = text("The new parser");
			li6 = element("li");
			a6 = element("a");
			t6 = text("How parsing works");
			ul1 = element("ul");
			li7 = element("li");
			a7 = element("a");
			t7 = text("this.eat, this.match, this.next");
			li8 = element("li");
			a8 = element("a");
			t8 = text("Our babel plugin");
			ul3 = element("ul");
			li9 = element("li");
			a9 = element("a");
			t9 = text("1. Assume  currying  has been declared in the global scope.");
			li10 = element("li");
			a10 = element("a");
			t10 = text("2. Use the  @babel/helpers");
			li11 = element("li");
			a11 = element("a");
			t11 = text("Closing Note");
			li12 = element("li");
			a12 = element("a");
			t12 = text("Editor's Note");
			li13 = element("li");
			a13 = element("a");
			t13 = text("Further Reading");
			t14 = space();
			p0 = element("p");
			t15 = text("Following my previous post on ");
			a14 = element("a");
			t16 = text("writing a custom babel transformation");
			t17 = text(", today I am going to show you how you can create a custom JavaScript syntax with Babel.");
			t18 = space();
			section1 = element("section");
			h20 = element("h2");
			a15 = element("a");
			t19 = text("Overview");
			t20 = space();
			p1 = element("p");
			t21 = text("Let me show you what we will achieve at the end of this article:");
			t22 = space();
			pre0 = element("pre");
			t23 = space();
			p2 = element("p");
			t24 = text("We are going to create a ");
			a16 = element("a");
			t25 = text("curry function");
			t26 = text(" syntax ");
			code0 = element("code");
			t27 = text("@@");
			t28 = text(". The syntax is like the ");
			a17 = element("a");
			t29 = text("generator function");
			t30 = text(", except you place ");
			code1 = element("code");
			t31 = text("@@");
			t32 = text(" instead of ");
			code2 = element("code");
			t33 = text("*");
			t34 = text(" in between the ");
			code3 = element("code");
			t35 = text("function");
			t36 = text(" keyword and the function name, eg ");
			code4 = element("code");
			t37 = text("function @@ name(arg1, arg2)");
			t38 = text(".");
			t39 = space();
			p3 = element("p");
			t40 = text("In this example, you can have ");
			a18 = element("a");
			t41 = text("partial application");
			t42 = text(" with the function ");
			code5 = element("code");
			t43 = text("foo");
			t44 = text(". Calling ");
			code6 = element("code");
			t45 = text("foo");
			t46 = text(" with the number of parameters less than the arguments required will return a new function of the remaining arguments:");
			t47 = space();
			pre1 = element("pre");
			t48 = space();
			blockquote0 = element("blockquote");
			p4 = element("p");
			t49 = text("The reason I choose ");
			code7 = element("code");
			t50 = text("@@");
			t51 = text(" is that you can't have ");
			code8 = element("code");
			t52 = text("@");
			t53 = text(" in a variable name, so ");
			code9 = element("code");
			t54 = text("function@@foo(){}");
			t55 = text(" is still a valid syntax. And the \"operator\" ");
			code10 = element("code");
			t56 = text("@");
			t57 = text(" is used for ");
			a19 = element("a");
			t58 = text("decorator functions");
			t59 = text(" but I wanted to use something entirely new, thus ");
			code11 = element("code");
			t60 = text("@@");
			t61 = text(".");
			t62 = space();
			p5 = element("p");
			t63 = text("To achieve this, we are going to:");
			t64 = space();
			ul5 = element("ul");
			li14 = element("li");
			t65 = text("Fork the babel parser");
			t66 = space();
			li15 = element("li");
			t67 = text("Create a custom babel transformation plugin");
			t68 = space();
			p6 = element("p");
			t69 = text("Sounds impossible 😨?");
			t70 = space();
			p7 = element("p");
			t71 = text("Don't worry, I will guide you through every step. Hopefully, at the end of this article, you will be the babel master amongst your peers. 🤠");
			t72 = space();
			section2 = element("section");
			h21 = element("h2");
			a20 = element("a");
			t73 = text("Fork the babel");
			t74 = space();
			p8 = element("p");
			t75 = text("Head over to ");
			a21 = element("a");
			t76 = text("babel's Github repo");
			t77 = text(", click the \"Fork\" button located at the top left of the page.");
			t78 = space();
			p9 = element("p");
			img0 = element("img");
			t79 = space();
			p10 = element("p");
			t80 = text("If this is your first time forking a popular open-source project, congratulations! 🎉");
			t81 = space();
			p11 = element("p");
			t82 = text("Clone your forked babel to your local workspace and ");
			a22 = element("a");
			t83 = text("set it up");
			t84 = text(":");
			t85 = space();
			pre2 = element("pre");
			t86 = space();
			p12 = element("p");
			t87 = text("Meanwhile, let me briefly walk you through how the babel repository is organised.");
			t88 = space();
			p13 = element("p");
			t89 = text("Babel uses a monorepo structure, all the packages, eg: ");
			code12 = element("code");
			t90 = text("@babel/core");
			t91 = text(", ");
			code13 = element("code");
			t92 = text("@babel/parser");
			t93 = text(", ");
			code14 = element("code");
			t94 = text("@babel/plugin-transform-react-jsx");
			t95 = text(", etc are in the ");
			code15 = element("code");
			t96 = text("packages/");
			t97 = text(" folder:");
			t98 = space();
			pre3 = element("pre");
			t99 = space();
			blockquote1 = element("blockquote");
			small0 = element("small");
			t100 = text("**Trivia:** Babel uses [Makefile](https://opensource.com/article/18/8/what-how-makefile) for automating tasks. For build task, such as `make build`, it will use [Gulp](https://gulpjs.com) as the task runner.");
			t101 = space();
			section3 = element("section");
			h30 = element("h3");
			a23 = element("a");
			t102 = text("Crash Course on Parsing Code to AST");
			t103 = space();
			p14 = element("p");
			t104 = text("Before we proceed, if you are unfamiliar with parsers and Abstract Syntax Tree (AST), I highly recommend to checkout ");
			a24 = element("a");
			t105 = text("Vaidehi Joshi");
			t106 = text("'s ");
			a25 = element("a");
			t107 = text("Leveling Up One’s Parsing Game With ASTs");
			t108 = text(".");
			t109 = space();
			p15 = element("p");
			t110 = text("To summarise, this is what happened when babel is parsing your code:");
			t111 = space();
			ul6 = element("ul");
			li16 = element("li");
			t112 = text("Your code as a ");
			code16 = element("code");
			t113 = text("string");
			t114 = text(" is a long list of characters: ");
			code17 = element("code");
			t115 = text("f, u, n, c, t, i, o, n, , @, @, f, ...");
			t116 = space();
			li17 = element("li");
			t117 = text("The first step is called ");
			strong0 = element("strong");
			t118 = text("tokenization");
			t119 = text(", where babel scans through each character and creates ");
			em0 = element("em");
			t120 = text("tokens");
			t121 = text(", like ");
			code18 = element("code");
			t122 = text("function, @@, foo, (, a, ...");
			t123 = space();
			li18 = element("li");
			t124 = text("The tokens then pass through a parser for ");
			strong1 = element("strong");
			t125 = text("Syntax analysis");
			t126 = text(", where babel creates an AST based on ");
			a26 = element("a");
			t127 = text("JavaScript language specification");
			t128 = text(".");
			t129 = space();
			p16 = element("p");
			t130 = text("If you want to learn more in-depth on compilers in general, ");
			a27 = element("a");
			t131 = text("Robert Nystrom");
			t132 = text("'s ");
			a28 = element("a");
			t133 = text("Crafting Interpreters");
			t134 = text(" is a gem.");
			t135 = space();
			blockquote2 = element("blockquote");
			small1 = element("small");
			t136 = text("Don't get scared of by the word **compiler**, it is nothing but parsing your code and generate XXX out of it. XXX could be machine code, which is the compiler most of us have in mind; XXX could be JavaScript compatible with older browsers, which is the case for Babel.");
			t137 = space();
			section4 = element("section");
			h22 = element("h2");
			a29 = element("a");
			t138 = text("Our custom babel parser");
			t139 = space();
			p17 = element("p");
			t140 = text("The folder we are going to work on is ");
			code19 = element("code");
			t141 = text("packages/babel-parser/");
			t142 = text(":");
			t143 = space();
			pre4 = element("pre");
			t144 = space();
			p18 = element("p");
			t145 = text("We've talked about ");
			em1 = element("em");
			t146 = text("tokenization");
			t147 = text(" and ");
			em2 = element("em");
			t148 = text("parsing");
			t149 = text(", now it's clear where to find the code for each process. ");
			code20 = element("code");
			t150 = text("plugins/");
			t151 = text(" folder contains plugins that extend the base parser and add custom syntaxes, such as ");
			code21 = element("code");
			t152 = text("jsx");
			t153 = text(" and ");
			code22 = element("code");
			t154 = text("flow");
			t155 = text(".");
			t156 = space();
			p19 = element("p");
			t157 = text("Let's do a ");
			a30 = element("a");
			t158 = text("Test-driven development (TDD)");
			t159 = text(". I find it easier to define the test case then slowly work our way to \"fix\" it. It is especially true in an unfamiliar codebase, TDD allows you to \"easily\" point out code places you need to change.");
			t160 = space();
			pre5 = element("pre");
			t161 = space();
			p20 = element("p");
			t162 = text("You can run ");
			code23 = element("code");
			t163 = text("TEST_ONLY=babel-parser TEST_GREP=\"curry function\" make test-only");
			t164 = text(" to run tests for ");
			code24 = element("code");
			t165 = text("babel-parser");
			t166 = text(" and see your failing case:");
			t167 = space();
			pre6 = element("pre");
			t168 = space();
			blockquote3 = element("blockquote");
			small2 = element("small");
			t169 = text("If you find scanning through all the test cases takes time, you can directly call `jest` to run the test:");
			t170 = space();
			pre7 = element("pre");
			t171 = space();
			p21 = element("p");
			t172 = text("Our parser found 2 seemingly innocent ");
			code25 = element("code");
			t173 = text("@");
			t174 = text(" tokens at a place where they shouldn't be present.");
			t175 = space();
			p22 = element("p");
			t176 = text("How do I know that? Let's start the watch mode, ");
			code26 = element("code");
			t177 = text("make watch");
			t178 = text(", wear our detective cap 🕵️‍ and start digging!");
			t179 = space();
			p23 = element("p");
			t180 = text("Tracing the stack trace, led us to ");
			a31 = element("a");
			code27 = element("code");
			t181 = text("packages/babel-parser/src/parser/expression.js");
			t182 = text(" where it throws ");
			code28 = element("code");
			t183 = text("this.unexpected()");
			t184 = text(".");
			t185 = space();
			p24 = element("p");
			t186 = text("Let us add some ");
			code29 = element("code");
			t187 = text("console.log");
			t188 = text(":");
			t189 = space();
			pre8 = element("pre");
			t190 = space();
			p25 = element("p");
			t191 = text("As you can see, both tokens are ");
			code30 = element("code");
			t192 = text("@");
			t193 = text(" token:");
			t194 = space();
			pre9 = element("pre");
			t195 = space();
			p26 = element("p");
			t196 = text("How do I know ");
			code31 = element("code");
			t197 = text("this.state.type");
			t198 = text(" and ");
			code32 = element("code");
			t199 = text("this.lookahead().type");
			t200 = text(" will give me the current and the next token?");
			t201 = space();
			p27 = element("p");
			t202 = text("Well, I'll explained them ");
			a32 = element("a");
			t203 = text("later");
			t204 = text(".");
			t205 = space();
			p28 = element("p");
			t206 = text("Let's recap what we've done so far before we move on:");
			t207 = space();
			ul7 = element("ul");
			li19 = element("li");
			t208 = text("We've written a test case for ");
			code33 = element("code");
			t209 = text("babel-parser");
			t210 = space();
			li20 = element("li");
			t211 = text("We ran ");
			code34 = element("code");
			t212 = text("make test-only");
			t213 = text(" to run the test case");
			t214 = space();
			li21 = element("li");
			t215 = text("We've started the watch mode via ");
			code35 = element("code");
			t216 = text("make watch");
			t217 = space();
			li22 = element("li");
			t218 = text("We've learned about parser state, and console out the current token type, ");
			code36 = element("code");
			t219 = text("this.state.type");
			t220 = space();
			p29 = element("p");
			t221 = text("Here's what we are going to do next:");
			t222 = space();
			p30 = element("p");
			t223 = text("If there's 2 consecutive ");
			code37 = element("code");
			t224 = text("@");
			t225 = text(", it should not be separate tokens, it should be a ");
			code38 = element("code");
			t226 = text("@@");
			t227 = text(" token, the new token we just defined for our curry function");
			t228 = space();
			section5 = element("section");
			h31 = element("h3");
			a33 = element("a");
			t229 = text("A new token: '@@'");
			t230 = space();
			p31 = element("p");
			t231 = text("Let's first look at where a token type is defined: ");
			a34 = element("a");
			t232 = text("packages/babel-parser/src/tokenizer/types.js");
			t233 = text(".");
			t234 = space();
			p32 = element("p");
			t235 = text("Here you see a list of tokens, so let's add our new token definition in as well:");
			t236 = space();
			pre10 = element("pre");
			t237 = space();
			p33 = element("p");
			t238 = text("Next, let's find out where the token gets created during ");
			em3 = element("em");
			t239 = text("tokenization");
			t240 = text(". A quick search on ");
			code39 = element("code");
			t241 = text("tt.at");
			t242 = text(" within ");
			code40 = element("code");
			t243 = text("babel-parser/src/tokenizer");
			t244 = text(" lead us to ");
			a35 = element("a");
			t245 = text("packages/babel-parser/src/tokenizer/index.js");
			t246 = space();
			blockquote4 = element("blockquote");
			small3 = element("small");
			t247 = text("Well, token types are import as `tt` throughout the babel-parser.");
			t248 = space();
			p34 = element("p");
			t249 = text("Let's create the token ");
			code41 = element("code");
			t250 = text("tt.atat");
			t251 = text(" instead of ");
			code42 = element("code");
			t252 = text("tt.at");
			t253 = text(" if there's another ");
			code43 = element("code");
			t254 = text("@");
			t255 = text(" succeed the current ");
			code44 = element("code");
			t256 = text("@");
			t257 = text(":");
			t258 = space();
			pre11 = element("pre");
			t259 = space();
			p35 = element("p");
			t260 = text("If you run the test again, you will see that the current token and the next token has changed:");
			t261 = space();
			pre12 = element("pre");
			t262 = space();
			p36 = element("p");
			t263 = text("Yeah! It looks good and lets move on. ");
			span = element("span");
			t264 = text("🏃‍");
			t265 = space();
			section6 = element("section");
			h32 = element("h3");
			a36 = element("a");
			t266 = text("The new parser");
			t267 = space();
			p37 = element("p");
			t268 = text("Before we move on, let's inspect how ");
			a37 = element("a");
			t269 = text("generator functions are represented in AST");
			t270 = text(":");
			t271 = space();
			p38 = element("p");
			img1 = element("img");
			t272 = space();
			p39 = element("p");
			t273 = text("As you can see, a generator function is represented by the ");
			code45 = element("code");
			t274 = text("generator: true");
			t275 = text(" attribute of a ");
			code46 = element("code");
			t276 = text("FunctionDeclaration");
			t277 = text(".");
			t278 = space();
			p40 = element("p");
			t279 = text("Similarly, we can add a ");
			code47 = element("code");
			t280 = text("curry: true");
			t281 = text(" attribute of the ");
			code48 = element("code");
			t282 = text("FunctionDeclaration");
			t283 = text(" too if it is a curry function:");
			t284 = space();
			p41 = element("p");
			img2 = element("img");
			t285 = space();
			p42 = element("p");
			t286 = text("We have a plan now, let's implement it.");
			t287 = space();
			p43 = element("p");
			t288 = text("A quick search on ");
			em4 = element("em");
			t289 = text("\"FunctionDeclaration\"");
			t290 = text(" leads us to a function called ");
			code49 = element("code");
			t291 = text("parseFunction");
			t292 = text(" in ");
			a38 = element("a");
			t293 = text("packages/babel-parser/src/parser/statement.js");
			t294 = text(", and here we find a line that sets the ");
			code50 = element("code");
			t295 = text("generator");
			t296 = text(" attribute, let's add one more line:");
			t297 = space();
			pre13 = element("pre");
			t298 = space();
			p44 = element("p");
			t299 = text("If you run the test again, you will be amazed that it passed!");
			t300 = space();
			pre14 = element("pre");
			t301 = space();
			p45 = element("p");
			t302 = text("That's it? How did we miraculously fix it?");
			t303 = space();
			p46 = element("p");
			t304 = text("I am going to briefly explain how parsing works, and in the process hopefully, you understood what that one-liner change did.");
			t305 = space();
			section7 = element("section");
			h33 = element("h3");
			a39 = element("a");
			t306 = text("How parsing works");
			t307 = space();
			p47 = element("p");
			t308 = text("With the list of tokens from the ");
			em5 = element("em");
			t309 = text("tokenizer");
			t310 = text(", the parser consumes the token one by one and constructs the AST. The parser uses the language grammar specification to decide how to use the tokens, which token to expect next.");
			t311 = space();
			p48 = element("p");
			t312 = text("The grammar specification looks something like this:");
			t313 = space();
			pre15 = element("pre");
			t314 = space();
			p49 = element("p");
			t315 = text("It explains the precedence of each expressions/statements. For example, an ");
			code51 = element("code");
			t316 = text("AdditiveExpression");
			t317 = text(" is made up of either:");
			t318 = space();
			ul8 = element("ul");
			li23 = element("li");
			t319 = text("a ");
			code52 = element("code");
			t320 = text("MultiplicativeExpression");
			t321 = text(", or");
			t322 = space();
			li24 = element("li");
			t323 = text("an ");
			code53 = element("code");
			t324 = text("AdditiveExpression");
			t325 = text(" followed by ");
			code54 = element("code");
			t326 = text("+");
			t327 = text(" operator token followed by ");
			code55 = element("code");
			t328 = text("MultiplicativeExpression");
			t329 = text(", or");
			t330 = space();
			li25 = element("li");
			t331 = text("an ");
			code56 = element("code");
			t332 = text("AdditiveExpression");
			t333 = text(" followed by ");
			code57 = element("code");
			t334 = text("-");
			t335 = text(" operator token followed by ");
			code58 = element("code");
			t336 = text("MultiplicativeExpression");
			t337 = text(".");
			t338 = space();
			p50 = element("p");
			t339 = text("So if you have an expression ");
			code59 = element("code");
			t340 = text("1 + 2 * 3");
			t341 = text(", it will be like:");
			t342 = space();
			pre16 = element("pre");
			t343 = space();
			p51 = element("p");
			t344 = text("instead of");
			t345 = space();
			pre17 = element("pre");
			t346 = space();
			p52 = element("p");
			t347 = text("With these rules, we translate them into parser code:");
			t348 = space();
			pre18 = element("pre");
			t349 = space();
			p53 = element("p");
			em6 = element("em");
			t350 = text("This is a made-up code that oversimplifies what babel have, but I hope you get the gist of it.");
			t351 = space();
			p54 = element("p");
			t352 = text("As you can see here, the parser is recursively in nature, and it goes from the lowest precedence to the highest precedence expressions/statements. Eg: ");
			code60 = element("code");
			t353 = text("parseAdditiveExpression");
			t354 = text(" calls ");
			code61 = element("code");
			t355 = text("parseMultiplicativeExpression");
			t356 = text(", which in turn calls ");
			code62 = element("code");
			t357 = text("parseExponentiationExpression");
			t358 = text(", which in turn calls ... . This recursive process is called the ");
			a40 = element("a");
			t359 = text("Recursive Descent Parsing");
			t360 = text(".");
			t361 = space();
			section8 = element("section");
			h4 = element("h4");
			a41 = element("a");
			t362 = text("this.eat, this.match, this.next");
			t363 = space();
			p55 = element("p");
			t364 = text("If you have noticed, in my examples above, I used some utility function, such as ");
			code63 = element("code");
			t365 = text("this.eat");
			t366 = text(", ");
			code64 = element("code");
			t367 = text("this.match");
			t368 = text(", ");
			code65 = element("code");
			t369 = text("this.next");
			t370 = text(", etc. These are babel parser's internal functions, yet they are quite ubiquitous amongst parsers as well:");
			t371 = space();
			ul10 = element("ul");
			li26 = element("li");
			strong2 = element("strong");
			code66 = element("code");
			t372 = text("this.match");
			t373 = text(" returns a ");
			code67 = element("code");
			t374 = text("boolean");
			t375 = text(" indicating whether the current token matches the condition");
			t376 = space();
			li27 = element("li");
			strong3 = element("strong");
			code68 = element("code");
			t377 = text("this.next");
			t378 = text(" moves the token list forward to point to the next token");
			t379 = space();
			li29 = element("li");
			strong4 = element("strong");
			code69 = element("code");
			t380 = text("this.eat");
			t381 = text(" return what ");
			code70 = element("code");
			t382 = text("this.match");
			t383 = text(" returns and if ");
			code71 = element("code");
			t384 = text("this.match");
			t385 = text(" returns ");
			code72 = element("code");
			t386 = text("true");
			t387 = text(", will do ");
			code73 = element("code");
			t388 = text("this.next");
			ul9 = element("ul");
			li28 = element("li");
			code74 = element("code");
			t389 = text("this.eat");
			t390 = text(" is commonly used for optional operators, like ");
			code75 = element("code");
			t391 = text("*");
			t392 = text(" in generator function, ");
			code76 = element("code");
			t393 = text(";");
			t394 = text(" at the end of statements, and ");
			code77 = element("code");
			t395 = text("?");
			t396 = text(" in typescript types.");
			t397 = space();
			li30 = element("li");
			strong5 = element("strong");
			code78 = element("code");
			t398 = text("this.lookahead");
			t399 = text(" get the next token without moving forward to make a decision on the current node");
			t400 = space();
			p56 = element("p");
			t401 = text("If you take a look again the parser code we just changed, it's easier to read it in now.");
			t402 = space();
			pre19 = element("pre");
			t403 = space();
			p57 = element("p");
			t404 = text("I know I didn't do a good job explaining how a parser works. Here are some resources that I learned from, and I highly recommend them:");
			t405 = space();
			ul11 = element("ul");
			li31 = element("li");
			a42 = element("a");
			t406 = text("Crafting Interpreters");
			t407 = text(" by ");
			a43 = element("a");
			t408 = text("Robert Nystrom");
			t409 = space();
			li32 = element("li");
			a44 = element("a");
			t410 = text("Free Udacity course: \"Compilers: Theory and Practice\"");
			t411 = text(", offered by Georgia Tech");
			t412 = space();
			hr0 = element("hr");
			t413 = space();
			p58 = element("p");
			strong6 = element("strong");
			t414 = text("Side Note");
			t415 = text(": You might be curious how am I able to visualize the custom syntax in the Babel AST Explorer, where I showed you the new \"curry\" attribute in the AST.");
			t416 = space();
			p59 = element("p");
			t417 = text("That's because I've added a new feature in the Babel AST Explorer where you can upload your custom parser!");
			t418 = space();
			p60 = element("p");
			t419 = text("If you go to ");
			code79 = element("code");
			t420 = text("packages/babel-parser/lib");
			t421 = text(", you would find the compiled version of your parser and the source map. Open the drawer of the Babel AST Explorer, you will see a button to upload a custom parser. Drag the ");
			code80 = element("code");
			t422 = text("packages/babel-parser/lib/index.js");
			t423 = text(" in and you will be visualizing the AST generated via your custom parser!");
			t424 = space();
			p61 = element("p");
			img3 = element("img");
			t425 = space();
			hr1 = element("hr");
			t426 = space();
			section9 = element("section");
			h23 = element("h2");
			a45 = element("a");
			t427 = text("Our babel plugin");
			t428 = space();
			p62 = element("p");
			t429 = text("With our custom babel parser done, let's move on to write our babel plugin.");
			t430 = space();
			p63 = element("p");
			t431 = text("But maybe before that, you may have some doubts on how are we going to use our custom babel parser, especially with whatever build stack we are using right now?");
			t432 = space();
			p64 = element("p");
			t433 = text("Well, fret not. A babel plugin can provide a custom parser, which is ");
			a46 = element("a");
			t434 = text("documented on the babel website");
			t435 = space();
			pre20 = element("pre");
			t436 = space();
			p65 = element("p");
			t437 = text("Since we forked out the babel parser, all existing babel parser options or built-in plugins will still work perfectly.");
			t438 = space();
			p66 = element("p");
			t439 = text("With this doubt out of the way, let see how we can make our curry function curryable? ");
			em7 = element("em");
			t440 = text("(not entirely sure there's such word)");
			t441 = space();
			hr2 = element("hr");
			t442 = space();
			p67 = element("p");
			t443 = text("Before we start, if you have eagerly tried to add our plugin into your build system, you would notice that the curry function gets compiled to a normal function.");
			t444 = space();
			p68 = element("p");
			t445 = text("This is because, after parsing + transformation, babel will use ");
			a47 = element("a");
			t446 = text("@babel/generator");
			t447 = text(" to generate code from the transformed AST. Since the ");
			code81 = element("code");
			t448 = text("@babel/generator");
			t449 = text(" has no idea about the new ");
			code82 = element("code");
			t450 = text("curry");
			t451 = text(" attribute we added, it will be omitted.");
			t452 = space();
			blockquote5 = element("blockquote");
			p69 = element("p");
			t453 = text("If one day curry function becomes the new JavaScript syntax, you may want to make a pull request to add one more line ");
			a48 = element("a");
			t454 = text("here");
			t455 = text("!");
			t456 = space();
			hr3 = element("hr");
			t457 = space();
			p70 = element("p");
			t458 = text("Ok, to make our function curryable, we can wrap it with a ");
			code83 = element("code");
			t459 = text("currying");
			t460 = text(" helper higher-order function:");
			t461 = space();
			pre21 = element("pre");
			t462 = space();
			blockquote6 = element("blockquote");
			p71 = element("p");
			t463 = text("If you want to learn how to write a currying function, you can read this ");
			a49 = element("a");
			t464 = text("Currying in JS");
			t465 = text(" by ");
			a50 = element("a");
			t466 = text("Shirsh Zibbu");
			t467 = space();
			p72 = element("p");
			t468 = text("So when we transform our curry function, we can transform it into the following:");
			t469 = space();
			pre22 = element("pre");
			t470 = space();
			blockquote7 = element("blockquote");
			p73 = element("p");
			t471 = text("Let's first ignore ");
			a51 = element("a");
			t472 = text("function hoisting");
			t473 = text(" in JavaScript, where you can call ");
			code84 = element("code");
			t474 = text("foo");
			t475 = text(" before it is defined.");
			t476 = space();
			p74 = element("p");
			t477 = text("If you have read my ");
			a52 = element("a");
			t478 = text("step-by-step guide on babel transformation");
			t479 = text(", writing this transformation should be manageable:");
			t480 = space();
			pre23 = element("pre");
			t481 = space();
			p75 = element("p");
			t482 = text("The question is how do we provide the ");
			code85 = element("code");
			t483 = text("currying");
			t484 = text(" function?");
			t485 = space();
			p76 = element("p");
			t486 = text("There are 2 ways:");
			t487 = space();
			section10 = element("section");
			h34 = element("h3");
			a53 = element("a");
			t488 = text("1. Assume ");
			code86 = element("code");
			t489 = text("currying");
			t490 = text(" has been declared in the global scope.");
			t491 = space();
			p77 = element("p");
			t492 = text("Basically, your job is done here.");
			t493 = space();
			p78 = element("p");
			t494 = text("If ");
			code87 = element("code");
			t495 = text("currying");
			t496 = text(" is not defined, then when executing the compiled code, the runtime will scream out ");
			em8 = element("em");
			t497 = text("\"currying is not defined\"");
			t498 = text(", just like the ");
			a54 = element("a");
			t499 = text("\"regeneratorRuntime is not defined\"");
			t500 = text(".");
			t501 = space();
			p79 = element("p");
			t502 = text("So probably you have to educate the users to install ");
			code88 = element("code");
			t503 = text("currying");
			t504 = text(" polyfills in order to use your ");
			code89 = element("code");
			t505 = text("babel-plugin-transformation-curry-function");
			t506 = text(".");
			t507 = space();
			section11 = element("section");
			h35 = element("h3");
			a55 = element("a");
			t508 = text("2. Use the ");
			code90 = element("code");
			t509 = text("@babel/helpers");
			t510 = space();
			p80 = element("p");
			t511 = text("You can add a new helper to ");
			code91 = element("code");
			t512 = text("@babel/helpers");
			t513 = text(", which of course you are unlikely to merge that into the official ");
			code92 = element("code");
			t514 = text("@babel/helpers");
			t515 = text(", so you would have to figure a way to make ");
			code93 = element("code");
			t516 = text("@babel/core");
			t517 = text(" to resolve to your ");
			code94 = element("code");
			t518 = text("@babel/helpers");
			t519 = text(":");
			t520 = space();
			pre24 = element("pre");
			t521 = space();
			p81 = element("p");
			em9 = element("em");
			strong7 = element("strong");
			t522 = text("Disclaimer:");
			t523 = text(" I have not personally tried this, but I believe it will work. If you encountered problems trying this, ");
			a56 = element("a");
			t524 = text("DM me");
			t525 = text(", I am very happy to discuss it with you.");
			t526 = space();
			p82 = element("p");
			t527 = text("Adding a new helper function into ");
			code95 = element("code");
			t528 = text("@babel/helpers");
			t529 = text(" is very easy.");
			t530 = space();
			p83 = element("p");
			t531 = text("Head over to ");
			a57 = element("a");
			t532 = text("packages/babel-helpers/src/helpers.js");
			t533 = text(" and add a new entry:");
			t534 = space();
			pre25 = element("pre");
			t535 = space();
			p84 = element("p");
			t536 = text("The helper tag function specifies the ");
			code96 = element("code");
			t537 = text("@babel/core");
			t538 = text(" version required. The trick here is to ");
			code97 = element("code");
			t539 = text("export default");
			t540 = text(" the ");
			code98 = element("code");
			t541 = text("currying");
			t542 = text(" function.");
			t543 = space();
			p85 = element("p");
			t544 = text("To use the helper, just call the ");
			code99 = element("code");
			t545 = text("this.addHelper()");
			t546 = text(":");
			t547 = space();
			pre26 = element("pre");
			t548 = space();
			p86 = element("p");
			t549 = text("The ");
			code100 = element("code");
			t550 = text("this.addHelper");
			t551 = text(" will inject the helper at the top of the file if needed, and returns an ");
			code101 = element("code");
			t552 = text("Identifier");
			t553 = text(" to the injected function.");
			t554 = space();
			section12 = element("section");
			h24 = element("h2");
			a58 = element("a");
			t555 = text("Closing Note");
			t556 = space();
			p87 = element("p");
			t557 = text("We've seen how we can modify the babel parser function, write our own babel transform plugin ");
			em10 = element("em");
			t558 = text("(which was brief mainly because I have ");
			a59 = element("a");
			t559 = text("a detailed cover in my previous post");
			t560 = text(")");
			t561 = text(", a brief touch on ");
			code102 = element("code");
			t562 = text("@babel/generator");
			t563 = text(" and also how we can add helper functions via ");
			code103 = element("code");
			t564 = text("@babel/helpers");
			t565 = text(".");
			t566 = space();
			p88 = element("p");
			t567 = text("Along the way, we had a crash course on how a parser works, which I will provide the links to ");
			a60 = element("a");
			t568 = text("further reading");
			t569 = text(" at the bottom.");
			t570 = space();
			p89 = element("p");
			t571 = text("The steps we've gone through above is similar to part of the ");
			a61 = element("a");
			t572 = text("TC39 proposal");
			t573 = space();
			a62 = element("a");
			t574 = text("process");
			t575 = text(" when defining a new JavaScript specification. When proposing a new specification, the champion of the proposal usually write polyfills or forked out babel to write proof-of-concept demos. As you've seen, forking a parser or writing polyfills is not the hardest part of the process, but to define the problem space, plan and think through the use cases and edge cases, and gather opinions and suggestions from the community. To this end, I am grateful to the proposal champion, for their effort in pushing the JavaScript language forward.");
			t576 = space();
			p90 = element("p");
			t577 = text("Finally, if you want to see the code we've done so far in a full picture, you can ");
			a63 = element("a");
			t578 = text("check it out from Github");
			t579 = text(".");
			t580 = space();
			hr4 = element("hr");
			t581 = space();
			section13 = element("section");
			h25 = element("h2");
			a64 = element("a");
			t582 = text("Editor's Note");
			t583 = space();
			p91 = element("p");
			t584 = text("I've worked on the babel repository for a while, yet I've never added a new syntax to the babel parser before. Most of my contributions were just fixing bugs and specs compliance feature.");
			t585 = space();
			p92 = element("p");
			t586 = text("Yet this idea of creating a new syntax has been in my mind for a while. So I took the chance of writing a blog to try it out. It is an exhilarating experience to see it work as expected.");
			t587 = space();
			p93 = element("p");
			t588 = text("Having the ability to manipulate the syntax of the language you are writing is invigorating. It empowers us the possibility of writing less code or more straightforward code and shifts that complexity to compile time. Just as how ");
			code104 = element("code");
			t589 = text("async-await");
			t590 = text(" solves the callback hell and promise-chaining hell.");
			t591 = space();
			p94 = element("p");
			t592 = text("If this article inspires you to some great idea, and you wish to discuss it with somebody, you are always more than welcome to reach out to me through ");
			a65 = element("a");
			t593 = text("Twitter");
			t594 = text(".");
			t595 = space();
			section14 = element("section");
			h26 = element("h2");
			a66 = element("a");
			t596 = text("Further Reading");
			t597 = space();
			p95 = element("p");
			t598 = text("About compilers:");
			t599 = space();
			ul12 = element("ul");
			li33 = element("li");
			a67 = element("a");
			t600 = text("Crafting Interpreters");
			t601 = text(" by ");
			a68 = element("a");
			t602 = text("Robert Nystrom");
			t603 = space();
			li34 = element("li");
			a69 = element("a");
			t604 = text("Free Udacity course: \"Compilers: Theory and Practice\"");
			t605 = text(", offered by Georgia Tech");
			t606 = space();
			li35 = element("li");
			a70 = element("a");
			t607 = text("Leveling Up One’s Parsing Game With ASTs");
			t608 = text(" by ");
			a71 = element("a");
			t609 = text("Vaidehi Joshi");
			t610 = space();
			p96 = element("p");
			t611 = text("Misc:");
			t612 = space();
			ul13 = element("ul");
			li36 = element("li");
			a72 = element("a");
			t613 = text("Understanding hoisting in JavaScript");
			t614 = text(" by ");
			a73 = element("a");
			t615 = text("Mabishi Wakio");
			t616 = space();
			li37 = element("li");
			a74 = element("a");
			t617 = text("Currying in JS");
			t618 = text(" by ");
			a75 = element("a");
			t619 = text("Shirsh Zibbu");
			t620 = space();
			li38 = element("li");
			a76 = element("a");
			t621 = text("TC39 Proposals");
			t622 = space();
			li39 = element("li");
			a77 = element("a");
			t623 = text("TC39 Process Document");
			this.h();
		},
		l(nodes) {
			section0 = claim_element(nodes, "SECTION", {});
			var section0_nodes = children(section0);

			ul4 = claim_element(section0_nodes, "UL", {
				class: true,
				id: true,
				role: true,
				"aria-label": true
			});

			var ul4_nodes = children(ul4);
			li0 = claim_element(ul4_nodes, "LI", {});
			var li0_nodes = children(li0);
			a0 = claim_element(li0_nodes, "A", { href: true });
			var a0_nodes = children(a0);
			t0 = claim_text(a0_nodes, "Overview");
			a0_nodes.forEach(detach);
			li0_nodes.forEach(detach);
			li1 = claim_element(ul4_nodes, "LI", {});
			var li1_nodes = children(li1);
			a1 = claim_element(li1_nodes, "A", { href: true });
			var a1_nodes = children(a1);
			t1 = claim_text(a1_nodes, "Fork the babel");
			a1_nodes.forEach(detach);
			li1_nodes.forEach(detach);
			ul0 = claim_element(ul4_nodes, "UL", {});
			var ul0_nodes = children(ul0);
			li2 = claim_element(ul0_nodes, "LI", {});
			var li2_nodes = children(li2);
			a2 = claim_element(li2_nodes, "A", { href: true });
			var a2_nodes = children(a2);
			t2 = claim_text(a2_nodes, "Crash Course on Parsing Code to AST");
			a2_nodes.forEach(detach);
			li2_nodes.forEach(detach);
			ul0_nodes.forEach(detach);
			li3 = claim_element(ul4_nodes, "LI", {});
			var li3_nodes = children(li3);
			a3 = claim_element(li3_nodes, "A", { href: true });
			var a3_nodes = children(a3);
			t3 = claim_text(a3_nodes, "Our custom babel parser");
			a3_nodes.forEach(detach);
			li3_nodes.forEach(detach);
			ul2 = claim_element(ul4_nodes, "UL", {});
			var ul2_nodes = children(ul2);
			li4 = claim_element(ul2_nodes, "LI", {});
			var li4_nodes = children(li4);
			a4 = claim_element(li4_nodes, "A", { href: true });
			var a4_nodes = children(a4);
			t4 = claim_text(a4_nodes, "A new token: '@@'");
			a4_nodes.forEach(detach);
			li4_nodes.forEach(detach);
			li5 = claim_element(ul2_nodes, "LI", {});
			var li5_nodes = children(li5);
			a5 = claim_element(li5_nodes, "A", { href: true });
			var a5_nodes = children(a5);
			t5 = claim_text(a5_nodes, "The new parser");
			a5_nodes.forEach(detach);
			li5_nodes.forEach(detach);
			li6 = claim_element(ul2_nodes, "LI", {});
			var li6_nodes = children(li6);
			a6 = claim_element(li6_nodes, "A", { href: true });
			var a6_nodes = children(a6);
			t6 = claim_text(a6_nodes, "How parsing works");
			a6_nodes.forEach(detach);
			li6_nodes.forEach(detach);
			ul1 = claim_element(ul2_nodes, "UL", {});
			var ul1_nodes = children(ul1);
			li7 = claim_element(ul1_nodes, "LI", {});
			var li7_nodes = children(li7);
			a7 = claim_element(li7_nodes, "A", { href: true });
			var a7_nodes = children(a7);
			t7 = claim_text(a7_nodes, "this.eat, this.match, this.next");
			a7_nodes.forEach(detach);
			li7_nodes.forEach(detach);
			ul1_nodes.forEach(detach);
			ul2_nodes.forEach(detach);
			li8 = claim_element(ul4_nodes, "LI", {});
			var li8_nodes = children(li8);
			a8 = claim_element(li8_nodes, "A", { href: true });
			var a8_nodes = children(a8);
			t8 = claim_text(a8_nodes, "Our babel plugin");
			a8_nodes.forEach(detach);
			li8_nodes.forEach(detach);
			ul3 = claim_element(ul4_nodes, "UL", {});
			var ul3_nodes = children(ul3);
			li9 = claim_element(ul3_nodes, "LI", {});
			var li9_nodes = children(li9);
			a9 = claim_element(li9_nodes, "A", { href: true });
			var a9_nodes = children(a9);
			t9 = claim_text(a9_nodes, "1. Assume  currying  has been declared in the global scope.");
			a9_nodes.forEach(detach);
			li9_nodes.forEach(detach);
			li10 = claim_element(ul3_nodes, "LI", {});
			var li10_nodes = children(li10);
			a10 = claim_element(li10_nodes, "A", { href: true });
			var a10_nodes = children(a10);
			t10 = claim_text(a10_nodes, "2. Use the  @babel/helpers");
			a10_nodes.forEach(detach);
			li10_nodes.forEach(detach);
			ul3_nodes.forEach(detach);
			li11 = claim_element(ul4_nodes, "LI", {});
			var li11_nodes = children(li11);
			a11 = claim_element(li11_nodes, "A", { href: true });
			var a11_nodes = children(a11);
			t11 = claim_text(a11_nodes, "Closing Note");
			a11_nodes.forEach(detach);
			li11_nodes.forEach(detach);
			li12 = claim_element(ul4_nodes, "LI", {});
			var li12_nodes = children(li12);
			a12 = claim_element(li12_nodes, "A", { href: true });
			var a12_nodes = children(a12);
			t12 = claim_text(a12_nodes, "Editor's Note");
			a12_nodes.forEach(detach);
			li12_nodes.forEach(detach);
			li13 = claim_element(ul4_nodes, "LI", {});
			var li13_nodes = children(li13);
			a13 = claim_element(li13_nodes, "A", { href: true });
			var a13_nodes = children(a13);
			t13 = claim_text(a13_nodes, "Further Reading");
			a13_nodes.forEach(detach);
			li13_nodes.forEach(detach);
			ul4_nodes.forEach(detach);
			section0_nodes.forEach(detach);
			t14 = claim_space(nodes);
			p0 = claim_element(nodes, "P", {});
			var p0_nodes = children(p0);
			t15 = claim_text(p0_nodes, "Following my previous post on ");
			a14 = claim_element(p0_nodes, "A", { href: true });
			var a14_nodes = children(a14);
			t16 = claim_text(a14_nodes, "writing a custom babel transformation");
			a14_nodes.forEach(detach);
			t17 = claim_text(p0_nodes, ", today I am going to show you how you can create a custom JavaScript syntax with Babel.");
			p0_nodes.forEach(detach);
			t18 = claim_space(nodes);
			section1 = claim_element(nodes, "SECTION", {});
			var section1_nodes = children(section1);
			h20 = claim_element(section1_nodes, "H2", {});
			var h20_nodes = children(h20);
			a15 = claim_element(h20_nodes, "A", { href: true, id: true });
			var a15_nodes = children(a15);
			t19 = claim_text(a15_nodes, "Overview");
			a15_nodes.forEach(detach);
			h20_nodes.forEach(detach);
			t20 = claim_space(section1_nodes);
			p1 = claim_element(section1_nodes, "P", {});
			var p1_nodes = children(p1);
			t21 = claim_text(p1_nodes, "Let me show you what we will achieve at the end of this article:");
			p1_nodes.forEach(detach);
			t22 = claim_space(section1_nodes);
			pre0 = claim_element(section1_nodes, "PRE", { class: true });
			var pre0_nodes = children(pre0);
			pre0_nodes.forEach(detach);
			t23 = claim_space(section1_nodes);
			p2 = claim_element(section1_nodes, "P", {});
			var p2_nodes = children(p2);
			t24 = claim_text(p2_nodes, "We are going to create a ");
			a16 = claim_element(p2_nodes, "A", { href: true, rel: true });
			var a16_nodes = children(a16);
			t25 = claim_text(a16_nodes, "curry function");
			a16_nodes.forEach(detach);
			t26 = claim_text(p2_nodes, " syntax ");
			code0 = claim_element(p2_nodes, "CODE", {});
			var code0_nodes = children(code0);
			t27 = claim_text(code0_nodes, "@@");
			code0_nodes.forEach(detach);
			t28 = claim_text(p2_nodes, ". The syntax is like the ");
			a17 = claim_element(p2_nodes, "A", { href: true, rel: true });
			var a17_nodes = children(a17);
			t29 = claim_text(a17_nodes, "generator function");
			a17_nodes.forEach(detach);
			t30 = claim_text(p2_nodes, ", except you place ");
			code1 = claim_element(p2_nodes, "CODE", {});
			var code1_nodes = children(code1);
			t31 = claim_text(code1_nodes, "@@");
			code1_nodes.forEach(detach);
			t32 = claim_text(p2_nodes, " instead of ");
			code2 = claim_element(p2_nodes, "CODE", {});
			var code2_nodes = children(code2);
			t33 = claim_text(code2_nodes, "*");
			code2_nodes.forEach(detach);
			t34 = claim_text(p2_nodes, " in between the ");
			code3 = claim_element(p2_nodes, "CODE", {});
			var code3_nodes = children(code3);
			t35 = claim_text(code3_nodes, "function");
			code3_nodes.forEach(detach);
			t36 = claim_text(p2_nodes, " keyword and the function name, eg ");
			code4 = claim_element(p2_nodes, "CODE", {});
			var code4_nodes = children(code4);
			t37 = claim_text(code4_nodes, "function @@ name(arg1, arg2)");
			code4_nodes.forEach(detach);
			t38 = claim_text(p2_nodes, ".");
			p2_nodes.forEach(detach);
			t39 = claim_space(section1_nodes);
			p3 = claim_element(section1_nodes, "P", {});
			var p3_nodes = children(p3);
			t40 = claim_text(p3_nodes, "In this example, you can have ");
			a18 = claim_element(p3_nodes, "A", { href: true, rel: true });
			var a18_nodes = children(a18);
			t41 = claim_text(a18_nodes, "partial application");
			a18_nodes.forEach(detach);
			t42 = claim_text(p3_nodes, " with the function ");
			code5 = claim_element(p3_nodes, "CODE", {});
			var code5_nodes = children(code5);
			t43 = claim_text(code5_nodes, "foo");
			code5_nodes.forEach(detach);
			t44 = claim_text(p3_nodes, ". Calling ");
			code6 = claim_element(p3_nodes, "CODE", {});
			var code6_nodes = children(code6);
			t45 = claim_text(code6_nodes, "foo");
			code6_nodes.forEach(detach);
			t46 = claim_text(p3_nodes, " with the number of parameters less than the arguments required will return a new function of the remaining arguments:");
			p3_nodes.forEach(detach);
			t47 = claim_space(section1_nodes);
			pre1 = claim_element(section1_nodes, "PRE", { class: true });
			var pre1_nodes = children(pre1);
			pre1_nodes.forEach(detach);
			t48 = claim_space(section1_nodes);
			blockquote0 = claim_element(section1_nodes, "BLOCKQUOTE", {});
			var blockquote0_nodes = children(blockquote0);
			p4 = claim_element(blockquote0_nodes, "P", {});
			var p4_nodes = children(p4);
			t49 = claim_text(p4_nodes, "The reason I choose ");
			code7 = claim_element(p4_nodes, "CODE", {});
			var code7_nodes = children(code7);
			t50 = claim_text(code7_nodes, "@@");
			code7_nodes.forEach(detach);
			t51 = claim_text(p4_nodes, " is that you can't have ");
			code8 = claim_element(p4_nodes, "CODE", {});
			var code8_nodes = children(code8);
			t52 = claim_text(code8_nodes, "@");
			code8_nodes.forEach(detach);
			t53 = claim_text(p4_nodes, " in a variable name, so ");
			code9 = claim_element(p4_nodes, "CODE", {});
			var code9_nodes = children(code9);
			t54 = claim_text(code9_nodes, "function@@foo(){}");
			code9_nodes.forEach(detach);
			t55 = claim_text(p4_nodes, " is still a valid syntax. And the \"operator\" ");
			code10 = claim_element(p4_nodes, "CODE", {});
			var code10_nodes = children(code10);
			t56 = claim_text(code10_nodes, "@");
			code10_nodes.forEach(detach);
			t57 = claim_text(p4_nodes, " is used for ");
			a19 = claim_element(p4_nodes, "A", { href: true, rel: true });
			var a19_nodes = children(a19);
			t58 = claim_text(a19_nodes, "decorator functions");
			a19_nodes.forEach(detach);
			t59 = claim_text(p4_nodes, " but I wanted to use something entirely new, thus ");
			code11 = claim_element(p4_nodes, "CODE", {});
			var code11_nodes = children(code11);
			t60 = claim_text(code11_nodes, "@@");
			code11_nodes.forEach(detach);
			t61 = claim_text(p4_nodes, ".");
			p4_nodes.forEach(detach);
			blockquote0_nodes.forEach(detach);
			t62 = claim_space(section1_nodes);
			p5 = claim_element(section1_nodes, "P", {});
			var p5_nodes = children(p5);
			t63 = claim_text(p5_nodes, "To achieve this, we are going to:");
			p5_nodes.forEach(detach);
			t64 = claim_space(section1_nodes);
			ul5 = claim_element(section1_nodes, "UL", {});
			var ul5_nodes = children(ul5);
			li14 = claim_element(ul5_nodes, "LI", {});
			var li14_nodes = children(li14);
			t65 = claim_text(li14_nodes, "Fork the babel parser");
			li14_nodes.forEach(detach);
			t66 = claim_space(ul5_nodes);
			li15 = claim_element(ul5_nodes, "LI", {});
			var li15_nodes = children(li15);
			t67 = claim_text(li15_nodes, "Create a custom babel transformation plugin");
			li15_nodes.forEach(detach);
			ul5_nodes.forEach(detach);
			t68 = claim_space(section1_nodes);
			p6 = claim_element(section1_nodes, "P", {});
			var p6_nodes = children(p6);
			t69 = claim_text(p6_nodes, "Sounds impossible 😨?");
			p6_nodes.forEach(detach);
			t70 = claim_space(section1_nodes);
			p7 = claim_element(section1_nodes, "P", {});
			var p7_nodes = children(p7);
			t71 = claim_text(p7_nodes, "Don't worry, I will guide you through every step. Hopefully, at the end of this article, you will be the babel master amongst your peers. 🤠");
			p7_nodes.forEach(detach);
			section1_nodes.forEach(detach);
			t72 = claim_space(nodes);
			section2 = claim_element(nodes, "SECTION", {});
			var section2_nodes = children(section2);
			h21 = claim_element(section2_nodes, "H2", {});
			var h21_nodes = children(h21);
			a20 = claim_element(h21_nodes, "A", { href: true, id: true });
			var a20_nodes = children(a20);
			t73 = claim_text(a20_nodes, "Fork the babel");
			a20_nodes.forEach(detach);
			h21_nodes.forEach(detach);
			t74 = claim_space(section2_nodes);
			p8 = claim_element(section2_nodes, "P", {});
			var p8_nodes = children(p8);
			t75 = claim_text(p8_nodes, "Head over to ");
			a21 = claim_element(p8_nodes, "A", { href: true, rel: true });
			var a21_nodes = children(a21);
			t76 = claim_text(a21_nodes, "babel's Github repo");
			a21_nodes.forEach(detach);
			t77 = claim_text(p8_nodes, ", click the \"Fork\" button located at the top left of the page.");
			p8_nodes.forEach(detach);
			t78 = claim_space(section2_nodes);
			p9 = claim_element(section2_nodes, "P", {});
			var p9_nodes = children(p9);
			img0 = claim_element(p9_nodes, "IMG", { src: true, alt: true, title: true });
			p9_nodes.forEach(detach);
			t79 = claim_space(section2_nodes);
			p10 = claim_element(section2_nodes, "P", {});
			var p10_nodes = children(p10);
			t80 = claim_text(p10_nodes, "If this is your first time forking a popular open-source project, congratulations! 🎉");
			p10_nodes.forEach(detach);
			t81 = claim_space(section2_nodes);
			p11 = claim_element(section2_nodes, "P", {});
			var p11_nodes = children(p11);
			t82 = claim_text(p11_nodes, "Clone your forked babel to your local workspace and ");
			a22 = claim_element(p11_nodes, "A", { href: true, rel: true });
			var a22_nodes = children(a22);
			t83 = claim_text(a22_nodes, "set it up");
			a22_nodes.forEach(detach);
			t84 = claim_text(p11_nodes, ":");
			p11_nodes.forEach(detach);
			t85 = claim_space(section2_nodes);
			pre2 = claim_element(section2_nodes, "PRE", { class: true });
			var pre2_nodes = children(pre2);
			pre2_nodes.forEach(detach);
			t86 = claim_space(section2_nodes);
			p12 = claim_element(section2_nodes, "P", {});
			var p12_nodes = children(p12);
			t87 = claim_text(p12_nodes, "Meanwhile, let me briefly walk you through how the babel repository is organised.");
			p12_nodes.forEach(detach);
			t88 = claim_space(section2_nodes);
			p13 = claim_element(section2_nodes, "P", {});
			var p13_nodes = children(p13);
			t89 = claim_text(p13_nodes, "Babel uses a monorepo structure, all the packages, eg: ");
			code12 = claim_element(p13_nodes, "CODE", {});
			var code12_nodes = children(code12);
			t90 = claim_text(code12_nodes, "@babel/core");
			code12_nodes.forEach(detach);
			t91 = claim_text(p13_nodes, ", ");
			code13 = claim_element(p13_nodes, "CODE", {});
			var code13_nodes = children(code13);
			t92 = claim_text(code13_nodes, "@babel/parser");
			code13_nodes.forEach(detach);
			t93 = claim_text(p13_nodes, ", ");
			code14 = claim_element(p13_nodes, "CODE", {});
			var code14_nodes = children(code14);
			t94 = claim_text(code14_nodes, "@babel/plugin-transform-react-jsx");
			code14_nodes.forEach(detach);
			t95 = claim_text(p13_nodes, ", etc are in the ");
			code15 = claim_element(p13_nodes, "CODE", {});
			var code15_nodes = children(code15);
			t96 = claim_text(code15_nodes, "packages/");
			code15_nodes.forEach(detach);
			t97 = claim_text(p13_nodes, " folder:");
			p13_nodes.forEach(detach);
			t98 = claim_space(section2_nodes);
			pre3 = claim_element(section2_nodes, "PRE", { class: true });
			var pre3_nodes = children(pre3);
			pre3_nodes.forEach(detach);
			t99 = claim_space(section2_nodes);
			blockquote1 = claim_element(section2_nodes, "BLOCKQUOTE", {});
			var blockquote1_nodes = children(blockquote1);
			small0 = claim_element(blockquote1_nodes, "SMALL", {});
			var small0_nodes = children(small0);
			t100 = claim_text(small0_nodes, "**Trivia:** Babel uses [Makefile](https://opensource.com/article/18/8/what-how-makefile) for automating tasks. For build task, such as `make build`, it will use [Gulp](https://gulpjs.com) as the task runner.");
			small0_nodes.forEach(detach);
			blockquote1_nodes.forEach(detach);
			section2_nodes.forEach(detach);
			t101 = claim_space(nodes);
			section3 = claim_element(nodes, "SECTION", {});
			var section3_nodes = children(section3);
			h30 = claim_element(section3_nodes, "H3", {});
			var h30_nodes = children(h30);
			a23 = claim_element(h30_nodes, "A", { href: true, id: true });
			var a23_nodes = children(a23);
			t102 = claim_text(a23_nodes, "Crash Course on Parsing Code to AST");
			a23_nodes.forEach(detach);
			h30_nodes.forEach(detach);
			t103 = claim_space(section3_nodes);
			p14 = claim_element(section3_nodes, "P", {});
			var p14_nodes = children(p14);
			t104 = claim_text(p14_nodes, "Before we proceed, if you are unfamiliar with parsers and Abstract Syntax Tree (AST), I highly recommend to checkout ");
			a24 = claim_element(p14_nodes, "A", { href: true, rel: true });
			var a24_nodes = children(a24);
			t105 = claim_text(a24_nodes, "Vaidehi Joshi");
			a24_nodes.forEach(detach);
			t106 = claim_text(p14_nodes, "'s ");
			a25 = claim_element(p14_nodes, "A", { href: true, rel: true });
			var a25_nodes = children(a25);
			t107 = claim_text(a25_nodes, "Leveling Up One’s Parsing Game With ASTs");
			a25_nodes.forEach(detach);
			t108 = claim_text(p14_nodes, ".");
			p14_nodes.forEach(detach);
			t109 = claim_space(section3_nodes);
			p15 = claim_element(section3_nodes, "P", {});
			var p15_nodes = children(p15);
			t110 = claim_text(p15_nodes, "To summarise, this is what happened when babel is parsing your code:");
			p15_nodes.forEach(detach);
			t111 = claim_space(section3_nodes);
			ul6 = claim_element(section3_nodes, "UL", {});
			var ul6_nodes = children(ul6);
			li16 = claim_element(ul6_nodes, "LI", {});
			var li16_nodes = children(li16);
			t112 = claim_text(li16_nodes, "Your code as a ");
			code16 = claim_element(li16_nodes, "CODE", {});
			var code16_nodes = children(code16);
			t113 = claim_text(code16_nodes, "string");
			code16_nodes.forEach(detach);
			t114 = claim_text(li16_nodes, " is a long list of characters: ");
			code17 = claim_element(li16_nodes, "CODE", {});
			var code17_nodes = children(code17);
			t115 = claim_text(code17_nodes, "f, u, n, c, t, i, o, n, , @, @, f, ...");
			code17_nodes.forEach(detach);
			li16_nodes.forEach(detach);
			t116 = claim_space(ul6_nodes);
			li17 = claim_element(ul6_nodes, "LI", {});
			var li17_nodes = children(li17);
			t117 = claim_text(li17_nodes, "The first step is called ");
			strong0 = claim_element(li17_nodes, "STRONG", {});
			var strong0_nodes = children(strong0);
			t118 = claim_text(strong0_nodes, "tokenization");
			strong0_nodes.forEach(detach);
			t119 = claim_text(li17_nodes, ", where babel scans through each character and creates ");
			em0 = claim_element(li17_nodes, "EM", {});
			var em0_nodes = children(em0);
			t120 = claim_text(em0_nodes, "tokens");
			em0_nodes.forEach(detach);
			t121 = claim_text(li17_nodes, ", like ");
			code18 = claim_element(li17_nodes, "CODE", {});
			var code18_nodes = children(code18);
			t122 = claim_text(code18_nodes, "function, @@, foo, (, a, ...");
			code18_nodes.forEach(detach);
			li17_nodes.forEach(detach);
			t123 = claim_space(ul6_nodes);
			li18 = claim_element(ul6_nodes, "LI", {});
			var li18_nodes = children(li18);
			t124 = claim_text(li18_nodes, "The tokens then pass through a parser for ");
			strong1 = claim_element(li18_nodes, "STRONG", {});
			var strong1_nodes = children(strong1);
			t125 = claim_text(strong1_nodes, "Syntax analysis");
			strong1_nodes.forEach(detach);
			t126 = claim_text(li18_nodes, ", where babel creates an AST based on ");
			a26 = claim_element(li18_nodes, "A", { href: true, rel: true });
			var a26_nodes = children(a26);
			t127 = claim_text(a26_nodes, "JavaScript language specification");
			a26_nodes.forEach(detach);
			t128 = claim_text(li18_nodes, ".");
			li18_nodes.forEach(detach);
			ul6_nodes.forEach(detach);
			t129 = claim_space(section3_nodes);
			p16 = claim_element(section3_nodes, "P", {});
			var p16_nodes = children(p16);
			t130 = claim_text(p16_nodes, "If you want to learn more in-depth on compilers in general, ");
			a27 = claim_element(p16_nodes, "A", { href: true, rel: true });
			var a27_nodes = children(a27);
			t131 = claim_text(a27_nodes, "Robert Nystrom");
			a27_nodes.forEach(detach);
			t132 = claim_text(p16_nodes, "'s ");
			a28 = claim_element(p16_nodes, "A", { href: true, rel: true });
			var a28_nodes = children(a28);
			t133 = claim_text(a28_nodes, "Crafting Interpreters");
			a28_nodes.forEach(detach);
			t134 = claim_text(p16_nodes, " is a gem.");
			p16_nodes.forEach(detach);
			t135 = claim_space(section3_nodes);
			blockquote2 = claim_element(section3_nodes, "BLOCKQUOTE", {});
			var blockquote2_nodes = children(blockquote2);
			small1 = claim_element(blockquote2_nodes, "SMALL", {});
			var small1_nodes = children(small1);
			t136 = claim_text(small1_nodes, "Don't get scared of by the word **compiler**, it is nothing but parsing your code and generate XXX out of it. XXX could be machine code, which is the compiler most of us have in mind; XXX could be JavaScript compatible with older browsers, which is the case for Babel.");
			small1_nodes.forEach(detach);
			blockquote2_nodes.forEach(detach);
			section3_nodes.forEach(detach);
			t137 = claim_space(nodes);
			section4 = claim_element(nodes, "SECTION", {});
			var section4_nodes = children(section4);
			h22 = claim_element(section4_nodes, "H2", {});
			var h22_nodes = children(h22);
			a29 = claim_element(h22_nodes, "A", { href: true, id: true });
			var a29_nodes = children(a29);
			t138 = claim_text(a29_nodes, "Our custom babel parser");
			a29_nodes.forEach(detach);
			h22_nodes.forEach(detach);
			t139 = claim_space(section4_nodes);
			p17 = claim_element(section4_nodes, "P", {});
			var p17_nodes = children(p17);
			t140 = claim_text(p17_nodes, "The folder we are going to work on is ");
			code19 = claim_element(p17_nodes, "CODE", {});
			var code19_nodes = children(code19);
			t141 = claim_text(code19_nodes, "packages/babel-parser/");
			code19_nodes.forEach(detach);
			t142 = claim_text(p17_nodes, ":");
			p17_nodes.forEach(detach);
			t143 = claim_space(section4_nodes);
			pre4 = claim_element(section4_nodes, "PRE", { class: true });
			var pre4_nodes = children(pre4);
			pre4_nodes.forEach(detach);
			t144 = claim_space(section4_nodes);
			p18 = claim_element(section4_nodes, "P", {});
			var p18_nodes = children(p18);
			t145 = claim_text(p18_nodes, "We've talked about ");
			em1 = claim_element(p18_nodes, "EM", {});
			var em1_nodes = children(em1);
			t146 = claim_text(em1_nodes, "tokenization");
			em1_nodes.forEach(detach);
			t147 = claim_text(p18_nodes, " and ");
			em2 = claim_element(p18_nodes, "EM", {});
			var em2_nodes = children(em2);
			t148 = claim_text(em2_nodes, "parsing");
			em2_nodes.forEach(detach);
			t149 = claim_text(p18_nodes, ", now it's clear where to find the code for each process. ");
			code20 = claim_element(p18_nodes, "CODE", {});
			var code20_nodes = children(code20);
			t150 = claim_text(code20_nodes, "plugins/");
			code20_nodes.forEach(detach);
			t151 = claim_text(p18_nodes, " folder contains plugins that extend the base parser and add custom syntaxes, such as ");
			code21 = claim_element(p18_nodes, "CODE", {});
			var code21_nodes = children(code21);
			t152 = claim_text(code21_nodes, "jsx");
			code21_nodes.forEach(detach);
			t153 = claim_text(p18_nodes, " and ");
			code22 = claim_element(p18_nodes, "CODE", {});
			var code22_nodes = children(code22);
			t154 = claim_text(code22_nodes, "flow");
			code22_nodes.forEach(detach);
			t155 = claim_text(p18_nodes, ".");
			p18_nodes.forEach(detach);
			t156 = claim_space(section4_nodes);
			p19 = claim_element(section4_nodes, "P", {});
			var p19_nodes = children(p19);
			t157 = claim_text(p19_nodes, "Let's do a ");
			a30 = claim_element(p19_nodes, "A", { href: true, rel: true });
			var a30_nodes = children(a30);
			t158 = claim_text(a30_nodes, "Test-driven development (TDD)");
			a30_nodes.forEach(detach);
			t159 = claim_text(p19_nodes, ". I find it easier to define the test case then slowly work our way to \"fix\" it. It is especially true in an unfamiliar codebase, TDD allows you to \"easily\" point out code places you need to change.");
			p19_nodes.forEach(detach);
			t160 = claim_space(section4_nodes);
			pre5 = claim_element(section4_nodes, "PRE", { class: true });
			var pre5_nodes = children(pre5);
			pre5_nodes.forEach(detach);
			t161 = claim_space(section4_nodes);
			p20 = claim_element(section4_nodes, "P", {});
			var p20_nodes = children(p20);
			t162 = claim_text(p20_nodes, "You can run ");
			code23 = claim_element(p20_nodes, "CODE", {});
			var code23_nodes = children(code23);
			t163 = claim_text(code23_nodes, "TEST_ONLY=babel-parser TEST_GREP=\"curry function\" make test-only");
			code23_nodes.forEach(detach);
			t164 = claim_text(p20_nodes, " to run tests for ");
			code24 = claim_element(p20_nodes, "CODE", {});
			var code24_nodes = children(code24);
			t165 = claim_text(code24_nodes, "babel-parser");
			code24_nodes.forEach(detach);
			t166 = claim_text(p20_nodes, " and see your failing case:");
			p20_nodes.forEach(detach);
			t167 = claim_space(section4_nodes);
			pre6 = claim_element(section4_nodes, "PRE", { class: true });
			var pre6_nodes = children(pre6);
			pre6_nodes.forEach(detach);
			t168 = claim_space(section4_nodes);
			blockquote3 = claim_element(section4_nodes, "BLOCKQUOTE", {});
			var blockquote3_nodes = children(blockquote3);
			small2 = claim_element(blockquote3_nodes, "SMALL", {});
			var small2_nodes = children(small2);
			t169 = claim_text(small2_nodes, "If you find scanning through all the test cases takes time, you can directly call `jest` to run the test:");
			small2_nodes.forEach(detach);
			t170 = claim_space(blockquote3_nodes);
			pre7 = claim_element(blockquote3_nodes, "PRE", { class: true });
			var pre7_nodes = children(pre7);
			pre7_nodes.forEach(detach);
			blockquote3_nodes.forEach(detach);
			t171 = claim_space(section4_nodes);
			p21 = claim_element(section4_nodes, "P", {});
			var p21_nodes = children(p21);
			t172 = claim_text(p21_nodes, "Our parser found 2 seemingly innocent ");
			code25 = claim_element(p21_nodes, "CODE", {});
			var code25_nodes = children(code25);
			t173 = claim_text(code25_nodes, "@");
			code25_nodes.forEach(detach);
			t174 = claim_text(p21_nodes, " tokens at a place where they shouldn't be present.");
			p21_nodes.forEach(detach);
			t175 = claim_space(section4_nodes);
			p22 = claim_element(section4_nodes, "P", {});
			var p22_nodes = children(p22);
			t176 = claim_text(p22_nodes, "How do I know that? Let's start the watch mode, ");
			code26 = claim_element(p22_nodes, "CODE", {});
			var code26_nodes = children(code26);
			t177 = claim_text(code26_nodes, "make watch");
			code26_nodes.forEach(detach);
			t178 = claim_text(p22_nodes, ", wear our detective cap 🕵️‍ and start digging!");
			p22_nodes.forEach(detach);
			t179 = claim_space(section4_nodes);
			p23 = claim_element(section4_nodes, "P", {});
			var p23_nodes = children(p23);
			t180 = claim_text(p23_nodes, "Tracing the stack trace, led us to ");
			a31 = claim_element(p23_nodes, "A", { href: true, rel: true });
			var a31_nodes = children(a31);
			code27 = claim_element(a31_nodes, "CODE", {});
			var code27_nodes = children(code27);
			t181 = claim_text(code27_nodes, "packages/babel-parser/src/parser/expression.js");
			code27_nodes.forEach(detach);
			a31_nodes.forEach(detach);
			t182 = claim_text(p23_nodes, " where it throws ");
			code28 = claim_element(p23_nodes, "CODE", {});
			var code28_nodes = children(code28);
			t183 = claim_text(code28_nodes, "this.unexpected()");
			code28_nodes.forEach(detach);
			t184 = claim_text(p23_nodes, ".");
			p23_nodes.forEach(detach);
			t185 = claim_space(section4_nodes);
			p24 = claim_element(section4_nodes, "P", {});
			var p24_nodes = children(p24);
			t186 = claim_text(p24_nodes, "Let us add some ");
			code29 = claim_element(p24_nodes, "CODE", {});
			var code29_nodes = children(code29);
			t187 = claim_text(code29_nodes, "console.log");
			code29_nodes.forEach(detach);
			t188 = claim_text(p24_nodes, ":");
			p24_nodes.forEach(detach);
			t189 = claim_space(section4_nodes);
			pre8 = claim_element(section4_nodes, "PRE", { class: true });
			var pre8_nodes = children(pre8);
			pre8_nodes.forEach(detach);
			t190 = claim_space(section4_nodes);
			p25 = claim_element(section4_nodes, "P", {});
			var p25_nodes = children(p25);
			t191 = claim_text(p25_nodes, "As you can see, both tokens are ");
			code30 = claim_element(p25_nodes, "CODE", {});
			var code30_nodes = children(code30);
			t192 = claim_text(code30_nodes, "@");
			code30_nodes.forEach(detach);
			t193 = claim_text(p25_nodes, " token:");
			p25_nodes.forEach(detach);
			t194 = claim_space(section4_nodes);
			pre9 = claim_element(section4_nodes, "PRE", { class: true });
			var pre9_nodes = children(pre9);
			pre9_nodes.forEach(detach);
			t195 = claim_space(section4_nodes);
			p26 = claim_element(section4_nodes, "P", {});
			var p26_nodes = children(p26);
			t196 = claim_text(p26_nodes, "How do I know ");
			code31 = claim_element(p26_nodes, "CODE", {});
			var code31_nodes = children(code31);
			t197 = claim_text(code31_nodes, "this.state.type");
			code31_nodes.forEach(detach);
			t198 = claim_text(p26_nodes, " and ");
			code32 = claim_element(p26_nodes, "CODE", {});
			var code32_nodes = children(code32);
			t199 = claim_text(code32_nodes, "this.lookahead().type");
			code32_nodes.forEach(detach);
			t200 = claim_text(p26_nodes, " will give me the current and the next token?");
			p26_nodes.forEach(detach);
			t201 = claim_space(section4_nodes);
			p27 = claim_element(section4_nodes, "P", {});
			var p27_nodes = children(p27);
			t202 = claim_text(p27_nodes, "Well, I'll explained them ");
			a32 = claim_element(p27_nodes, "A", { href: true });
			var a32_nodes = children(a32);
			t203 = claim_text(a32_nodes, "later");
			a32_nodes.forEach(detach);
			t204 = claim_text(p27_nodes, ".");
			p27_nodes.forEach(detach);
			t205 = claim_space(section4_nodes);
			p28 = claim_element(section4_nodes, "P", {});
			var p28_nodes = children(p28);
			t206 = claim_text(p28_nodes, "Let's recap what we've done so far before we move on:");
			p28_nodes.forEach(detach);
			t207 = claim_space(section4_nodes);
			ul7 = claim_element(section4_nodes, "UL", {});
			var ul7_nodes = children(ul7);
			li19 = claim_element(ul7_nodes, "LI", {});
			var li19_nodes = children(li19);
			t208 = claim_text(li19_nodes, "We've written a test case for ");
			code33 = claim_element(li19_nodes, "CODE", {});
			var code33_nodes = children(code33);
			t209 = claim_text(code33_nodes, "babel-parser");
			code33_nodes.forEach(detach);
			li19_nodes.forEach(detach);
			t210 = claim_space(ul7_nodes);
			li20 = claim_element(ul7_nodes, "LI", {});
			var li20_nodes = children(li20);
			t211 = claim_text(li20_nodes, "We ran ");
			code34 = claim_element(li20_nodes, "CODE", {});
			var code34_nodes = children(code34);
			t212 = claim_text(code34_nodes, "make test-only");
			code34_nodes.forEach(detach);
			t213 = claim_text(li20_nodes, " to run the test case");
			li20_nodes.forEach(detach);
			t214 = claim_space(ul7_nodes);
			li21 = claim_element(ul7_nodes, "LI", {});
			var li21_nodes = children(li21);
			t215 = claim_text(li21_nodes, "We've started the watch mode via ");
			code35 = claim_element(li21_nodes, "CODE", {});
			var code35_nodes = children(code35);
			t216 = claim_text(code35_nodes, "make watch");
			code35_nodes.forEach(detach);
			li21_nodes.forEach(detach);
			t217 = claim_space(ul7_nodes);
			li22 = claim_element(ul7_nodes, "LI", {});
			var li22_nodes = children(li22);
			t218 = claim_text(li22_nodes, "We've learned about parser state, and console out the current token type, ");
			code36 = claim_element(li22_nodes, "CODE", {});
			var code36_nodes = children(code36);
			t219 = claim_text(code36_nodes, "this.state.type");
			code36_nodes.forEach(detach);
			li22_nodes.forEach(detach);
			ul7_nodes.forEach(detach);
			t220 = claim_space(section4_nodes);
			p29 = claim_element(section4_nodes, "P", {});
			var p29_nodes = children(p29);
			t221 = claim_text(p29_nodes, "Here's what we are going to do next:");
			p29_nodes.forEach(detach);
			t222 = claim_space(section4_nodes);
			p30 = claim_element(section4_nodes, "P", {});
			var p30_nodes = children(p30);
			t223 = claim_text(p30_nodes, "If there's 2 consecutive ");
			code37 = claim_element(p30_nodes, "CODE", {});
			var code37_nodes = children(code37);
			t224 = claim_text(code37_nodes, "@");
			code37_nodes.forEach(detach);
			t225 = claim_text(p30_nodes, ", it should not be separate tokens, it should be a ");
			code38 = claim_element(p30_nodes, "CODE", {});
			var code38_nodes = children(code38);
			t226 = claim_text(code38_nodes, "@@");
			code38_nodes.forEach(detach);
			t227 = claim_text(p30_nodes, " token, the new token we just defined for our curry function");
			p30_nodes.forEach(detach);
			section4_nodes.forEach(detach);
			t228 = claim_space(nodes);
			section5 = claim_element(nodes, "SECTION", {});
			var section5_nodes = children(section5);
			h31 = claim_element(section5_nodes, "H3", {});
			var h31_nodes = children(h31);
			a33 = claim_element(h31_nodes, "A", { href: true, id: true });
			var a33_nodes = children(a33);
			t229 = claim_text(a33_nodes, "A new token: '@@'");
			a33_nodes.forEach(detach);
			h31_nodes.forEach(detach);
			t230 = claim_space(section5_nodes);
			p31 = claim_element(section5_nodes, "P", {});
			var p31_nodes = children(p31);
			t231 = claim_text(p31_nodes, "Let's first look at where a token type is defined: ");
			a34 = claim_element(p31_nodes, "A", { href: true, rel: true });
			var a34_nodes = children(a34);
			t232 = claim_text(a34_nodes, "packages/babel-parser/src/tokenizer/types.js");
			a34_nodes.forEach(detach);
			t233 = claim_text(p31_nodes, ".");
			p31_nodes.forEach(detach);
			t234 = claim_space(section5_nodes);
			p32 = claim_element(section5_nodes, "P", {});
			var p32_nodes = children(p32);
			t235 = claim_text(p32_nodes, "Here you see a list of tokens, so let's add our new token definition in as well:");
			p32_nodes.forEach(detach);
			t236 = claim_space(section5_nodes);
			pre10 = claim_element(section5_nodes, "PRE", { class: true });
			var pre10_nodes = children(pre10);
			pre10_nodes.forEach(detach);
			t237 = claim_space(section5_nodes);
			p33 = claim_element(section5_nodes, "P", {});
			var p33_nodes = children(p33);
			t238 = claim_text(p33_nodes, "Next, let's find out where the token gets created during ");
			em3 = claim_element(p33_nodes, "EM", {});
			var em3_nodes = children(em3);
			t239 = claim_text(em3_nodes, "tokenization");
			em3_nodes.forEach(detach);
			t240 = claim_text(p33_nodes, ". A quick search on ");
			code39 = claim_element(p33_nodes, "CODE", {});
			var code39_nodes = children(code39);
			t241 = claim_text(code39_nodes, "tt.at");
			code39_nodes.forEach(detach);
			t242 = claim_text(p33_nodes, " within ");
			code40 = claim_element(p33_nodes, "CODE", {});
			var code40_nodes = children(code40);
			t243 = claim_text(code40_nodes, "babel-parser/src/tokenizer");
			code40_nodes.forEach(detach);
			t244 = claim_text(p33_nodes, " lead us to ");
			a35 = claim_element(p33_nodes, "A", { href: true, rel: true });
			var a35_nodes = children(a35);
			t245 = claim_text(a35_nodes, "packages/babel-parser/src/tokenizer/index.js");
			a35_nodes.forEach(detach);
			p33_nodes.forEach(detach);
			t246 = claim_space(section5_nodes);
			blockquote4 = claim_element(section5_nodes, "BLOCKQUOTE", {});
			var blockquote4_nodes = children(blockquote4);
			small3 = claim_element(blockquote4_nodes, "SMALL", {});
			var small3_nodes = children(small3);
			t247 = claim_text(small3_nodes, "Well, token types are import as `tt` throughout the babel-parser.");
			small3_nodes.forEach(detach);
			blockquote4_nodes.forEach(detach);
			t248 = claim_space(section5_nodes);
			p34 = claim_element(section5_nodes, "P", {});
			var p34_nodes = children(p34);
			t249 = claim_text(p34_nodes, "Let's create the token ");
			code41 = claim_element(p34_nodes, "CODE", {});
			var code41_nodes = children(code41);
			t250 = claim_text(code41_nodes, "tt.atat");
			code41_nodes.forEach(detach);
			t251 = claim_text(p34_nodes, " instead of ");
			code42 = claim_element(p34_nodes, "CODE", {});
			var code42_nodes = children(code42);
			t252 = claim_text(code42_nodes, "tt.at");
			code42_nodes.forEach(detach);
			t253 = claim_text(p34_nodes, " if there's another ");
			code43 = claim_element(p34_nodes, "CODE", {});
			var code43_nodes = children(code43);
			t254 = claim_text(code43_nodes, "@");
			code43_nodes.forEach(detach);
			t255 = claim_text(p34_nodes, " succeed the current ");
			code44 = claim_element(p34_nodes, "CODE", {});
			var code44_nodes = children(code44);
			t256 = claim_text(code44_nodes, "@");
			code44_nodes.forEach(detach);
			t257 = claim_text(p34_nodes, ":");
			p34_nodes.forEach(detach);
			t258 = claim_space(section5_nodes);
			pre11 = claim_element(section5_nodes, "PRE", { class: true });
			var pre11_nodes = children(pre11);
			pre11_nodes.forEach(detach);
			t259 = claim_space(section5_nodes);
			p35 = claim_element(section5_nodes, "P", {});
			var p35_nodes = children(p35);
			t260 = claim_text(p35_nodes, "If you run the test again, you will see that the current token and the next token has changed:");
			p35_nodes.forEach(detach);
			t261 = claim_space(section5_nodes);
			pre12 = claim_element(section5_nodes, "PRE", { class: true });
			var pre12_nodes = children(pre12);
			pre12_nodes.forEach(detach);
			t262 = claim_space(section5_nodes);
			p36 = claim_element(section5_nodes, "P", {});
			var p36_nodes = children(p36);
			t263 = claim_text(p36_nodes, "Yeah! It looks good and lets move on. ");
			span = claim_element(p36_nodes, "SPAN", { style: true });
			var span_nodes = children(span);
			t264 = claim_text(span_nodes, "🏃‍");
			span_nodes.forEach(detach);
			p36_nodes.forEach(detach);
			section5_nodes.forEach(detach);
			t265 = claim_space(nodes);
			section6 = claim_element(nodes, "SECTION", {});
			var section6_nodes = children(section6);
			h32 = claim_element(section6_nodes, "H3", {});
			var h32_nodes = children(h32);
			a36 = claim_element(h32_nodes, "A", { href: true, id: true });
			var a36_nodes = children(a36);
			t266 = claim_text(a36_nodes, "The new parser");
			a36_nodes.forEach(detach);
			h32_nodes.forEach(detach);
			t267 = claim_space(section6_nodes);
			p37 = claim_element(section6_nodes, "P", {});
			var p37_nodes = children(p37);
			t268 = claim_text(p37_nodes, "Before we move on, let's inspect how ");
			a37 = claim_element(p37_nodes, "A", { href: true, rel: true });
			var a37_nodes = children(a37);
			t269 = claim_text(a37_nodes, "generator functions are represented in AST");
			a37_nodes.forEach(detach);
			t270 = claim_text(p37_nodes, ":");
			p37_nodes.forEach(detach);
			t271 = claim_space(section6_nodes);
			p38 = claim_element(section6_nodes, "P", {});
			var p38_nodes = children(p38);
			img1 = claim_element(p38_nodes, "IMG", { src: true, alt: true, title: true });
			p38_nodes.forEach(detach);
			t272 = claim_space(section6_nodes);
			p39 = claim_element(section6_nodes, "P", {});
			var p39_nodes = children(p39);
			t273 = claim_text(p39_nodes, "As you can see, a generator function is represented by the ");
			code45 = claim_element(p39_nodes, "CODE", {});
			var code45_nodes = children(code45);
			t274 = claim_text(code45_nodes, "generator: true");
			code45_nodes.forEach(detach);
			t275 = claim_text(p39_nodes, " attribute of a ");
			code46 = claim_element(p39_nodes, "CODE", {});
			var code46_nodes = children(code46);
			t276 = claim_text(code46_nodes, "FunctionDeclaration");
			code46_nodes.forEach(detach);
			t277 = claim_text(p39_nodes, ".");
			p39_nodes.forEach(detach);
			t278 = claim_space(section6_nodes);
			p40 = claim_element(section6_nodes, "P", {});
			var p40_nodes = children(p40);
			t279 = claim_text(p40_nodes, "Similarly, we can add a ");
			code47 = claim_element(p40_nodes, "CODE", {});
			var code47_nodes = children(code47);
			t280 = claim_text(code47_nodes, "curry: true");
			code47_nodes.forEach(detach);
			t281 = claim_text(p40_nodes, " attribute of the ");
			code48 = claim_element(p40_nodes, "CODE", {});
			var code48_nodes = children(code48);
			t282 = claim_text(code48_nodes, "FunctionDeclaration");
			code48_nodes.forEach(detach);
			t283 = claim_text(p40_nodes, " too if it is a curry function:");
			p40_nodes.forEach(detach);
			t284 = claim_space(section6_nodes);
			p41 = claim_element(section6_nodes, "P", {});
			var p41_nodes = children(p41);
			img2 = claim_element(p41_nodes, "IMG", { src: true, alt: true, title: true });
			p41_nodes.forEach(detach);
			t285 = claim_space(section6_nodes);
			p42 = claim_element(section6_nodes, "P", {});
			var p42_nodes = children(p42);
			t286 = claim_text(p42_nodes, "We have a plan now, let's implement it.");
			p42_nodes.forEach(detach);
			t287 = claim_space(section6_nodes);
			p43 = claim_element(section6_nodes, "P", {});
			var p43_nodes = children(p43);
			t288 = claim_text(p43_nodes, "A quick search on ");
			em4 = claim_element(p43_nodes, "EM", {});
			var em4_nodes = children(em4);
			t289 = claim_text(em4_nodes, "\"FunctionDeclaration\"");
			em4_nodes.forEach(detach);
			t290 = claim_text(p43_nodes, " leads us to a function called ");
			code49 = claim_element(p43_nodes, "CODE", {});
			var code49_nodes = children(code49);
			t291 = claim_text(code49_nodes, "parseFunction");
			code49_nodes.forEach(detach);
			t292 = claim_text(p43_nodes, " in ");
			a38 = claim_element(p43_nodes, "A", { href: true, rel: true });
			var a38_nodes = children(a38);
			t293 = claim_text(a38_nodes, "packages/babel-parser/src/parser/statement.js");
			a38_nodes.forEach(detach);
			t294 = claim_text(p43_nodes, ", and here we find a line that sets the ");
			code50 = claim_element(p43_nodes, "CODE", {});
			var code50_nodes = children(code50);
			t295 = claim_text(code50_nodes, "generator");
			code50_nodes.forEach(detach);
			t296 = claim_text(p43_nodes, " attribute, let's add one more line:");
			p43_nodes.forEach(detach);
			t297 = claim_space(section6_nodes);
			pre13 = claim_element(section6_nodes, "PRE", { class: true });
			var pre13_nodes = children(pre13);
			pre13_nodes.forEach(detach);
			t298 = claim_space(section6_nodes);
			p44 = claim_element(section6_nodes, "P", {});
			var p44_nodes = children(p44);
			t299 = claim_text(p44_nodes, "If you run the test again, you will be amazed that it passed!");
			p44_nodes.forEach(detach);
			t300 = claim_space(section6_nodes);
			pre14 = claim_element(section6_nodes, "PRE", { class: true });
			var pre14_nodes = children(pre14);
			pre14_nodes.forEach(detach);
			t301 = claim_space(section6_nodes);
			p45 = claim_element(section6_nodes, "P", {});
			var p45_nodes = children(p45);
			t302 = claim_text(p45_nodes, "That's it? How did we miraculously fix it?");
			p45_nodes.forEach(detach);
			t303 = claim_space(section6_nodes);
			p46 = claim_element(section6_nodes, "P", {});
			var p46_nodes = children(p46);
			t304 = claim_text(p46_nodes, "I am going to briefly explain how parsing works, and in the process hopefully, you understood what that one-liner change did.");
			p46_nodes.forEach(detach);
			section6_nodes.forEach(detach);
			t305 = claim_space(nodes);
			section7 = claim_element(nodes, "SECTION", {});
			var section7_nodes = children(section7);
			h33 = claim_element(section7_nodes, "H3", {});
			var h33_nodes = children(h33);
			a39 = claim_element(h33_nodes, "A", { href: true, id: true });
			var a39_nodes = children(a39);
			t306 = claim_text(a39_nodes, "How parsing works");
			a39_nodes.forEach(detach);
			h33_nodes.forEach(detach);
			t307 = claim_space(section7_nodes);
			p47 = claim_element(section7_nodes, "P", {});
			var p47_nodes = children(p47);
			t308 = claim_text(p47_nodes, "With the list of tokens from the ");
			em5 = claim_element(p47_nodes, "EM", {});
			var em5_nodes = children(em5);
			t309 = claim_text(em5_nodes, "tokenizer");
			em5_nodes.forEach(detach);
			t310 = claim_text(p47_nodes, ", the parser consumes the token one by one and constructs the AST. The parser uses the language grammar specification to decide how to use the tokens, which token to expect next.");
			p47_nodes.forEach(detach);
			t311 = claim_space(section7_nodes);
			p48 = claim_element(section7_nodes, "P", {});
			var p48_nodes = children(p48);
			t312 = claim_text(p48_nodes, "The grammar specification looks something like this:");
			p48_nodes.forEach(detach);
			t313 = claim_space(section7_nodes);
			pre15 = claim_element(section7_nodes, "PRE", { class: true });
			var pre15_nodes = children(pre15);
			pre15_nodes.forEach(detach);
			t314 = claim_space(section7_nodes);
			p49 = claim_element(section7_nodes, "P", {});
			var p49_nodes = children(p49);
			t315 = claim_text(p49_nodes, "It explains the precedence of each expressions/statements. For example, an ");
			code51 = claim_element(p49_nodes, "CODE", {});
			var code51_nodes = children(code51);
			t316 = claim_text(code51_nodes, "AdditiveExpression");
			code51_nodes.forEach(detach);
			t317 = claim_text(p49_nodes, " is made up of either:");
			p49_nodes.forEach(detach);
			t318 = claim_space(section7_nodes);
			ul8 = claim_element(section7_nodes, "UL", {});
			var ul8_nodes = children(ul8);
			li23 = claim_element(ul8_nodes, "LI", {});
			var li23_nodes = children(li23);
			t319 = claim_text(li23_nodes, "a ");
			code52 = claim_element(li23_nodes, "CODE", {});
			var code52_nodes = children(code52);
			t320 = claim_text(code52_nodes, "MultiplicativeExpression");
			code52_nodes.forEach(detach);
			t321 = claim_text(li23_nodes, ", or");
			li23_nodes.forEach(detach);
			t322 = claim_space(ul8_nodes);
			li24 = claim_element(ul8_nodes, "LI", {});
			var li24_nodes = children(li24);
			t323 = claim_text(li24_nodes, "an ");
			code53 = claim_element(li24_nodes, "CODE", {});
			var code53_nodes = children(code53);
			t324 = claim_text(code53_nodes, "AdditiveExpression");
			code53_nodes.forEach(detach);
			t325 = claim_text(li24_nodes, " followed by ");
			code54 = claim_element(li24_nodes, "CODE", {});
			var code54_nodes = children(code54);
			t326 = claim_text(code54_nodes, "+");
			code54_nodes.forEach(detach);
			t327 = claim_text(li24_nodes, " operator token followed by ");
			code55 = claim_element(li24_nodes, "CODE", {});
			var code55_nodes = children(code55);
			t328 = claim_text(code55_nodes, "MultiplicativeExpression");
			code55_nodes.forEach(detach);
			t329 = claim_text(li24_nodes, ", or");
			li24_nodes.forEach(detach);
			t330 = claim_space(ul8_nodes);
			li25 = claim_element(ul8_nodes, "LI", {});
			var li25_nodes = children(li25);
			t331 = claim_text(li25_nodes, "an ");
			code56 = claim_element(li25_nodes, "CODE", {});
			var code56_nodes = children(code56);
			t332 = claim_text(code56_nodes, "AdditiveExpression");
			code56_nodes.forEach(detach);
			t333 = claim_text(li25_nodes, " followed by ");
			code57 = claim_element(li25_nodes, "CODE", {});
			var code57_nodes = children(code57);
			t334 = claim_text(code57_nodes, "-");
			code57_nodes.forEach(detach);
			t335 = claim_text(li25_nodes, " operator token followed by ");
			code58 = claim_element(li25_nodes, "CODE", {});
			var code58_nodes = children(code58);
			t336 = claim_text(code58_nodes, "MultiplicativeExpression");
			code58_nodes.forEach(detach);
			t337 = claim_text(li25_nodes, ".");
			li25_nodes.forEach(detach);
			ul8_nodes.forEach(detach);
			t338 = claim_space(section7_nodes);
			p50 = claim_element(section7_nodes, "P", {});
			var p50_nodes = children(p50);
			t339 = claim_text(p50_nodes, "So if you have an expression ");
			code59 = claim_element(p50_nodes, "CODE", {});
			var code59_nodes = children(code59);
			t340 = claim_text(code59_nodes, "1 + 2 * 3");
			code59_nodes.forEach(detach);
			t341 = claim_text(p50_nodes, ", it will be like:");
			p50_nodes.forEach(detach);
			t342 = claim_space(section7_nodes);
			pre16 = claim_element(section7_nodes, "PRE", { class: true });
			var pre16_nodes = children(pre16);
			pre16_nodes.forEach(detach);
			t343 = claim_space(section7_nodes);
			p51 = claim_element(section7_nodes, "P", {});
			var p51_nodes = children(p51);
			t344 = claim_text(p51_nodes, "instead of");
			p51_nodes.forEach(detach);
			t345 = claim_space(section7_nodes);
			pre17 = claim_element(section7_nodes, "PRE", { class: true });
			var pre17_nodes = children(pre17);
			pre17_nodes.forEach(detach);
			t346 = claim_space(section7_nodes);
			p52 = claim_element(section7_nodes, "P", {});
			var p52_nodes = children(p52);
			t347 = claim_text(p52_nodes, "With these rules, we translate them into parser code:");
			p52_nodes.forEach(detach);
			t348 = claim_space(section7_nodes);
			pre18 = claim_element(section7_nodes, "PRE", { class: true });
			var pre18_nodes = children(pre18);
			pre18_nodes.forEach(detach);
			t349 = claim_space(section7_nodes);
			p53 = claim_element(section7_nodes, "P", {});
			var p53_nodes = children(p53);
			em6 = claim_element(p53_nodes, "EM", {});
			var em6_nodes = children(em6);
			t350 = claim_text(em6_nodes, "This is a made-up code that oversimplifies what babel have, but I hope you get the gist of it.");
			em6_nodes.forEach(detach);
			p53_nodes.forEach(detach);
			t351 = claim_space(section7_nodes);
			p54 = claim_element(section7_nodes, "P", {});
			var p54_nodes = children(p54);
			t352 = claim_text(p54_nodes, "As you can see here, the parser is recursively in nature, and it goes from the lowest precedence to the highest precedence expressions/statements. Eg: ");
			code60 = claim_element(p54_nodes, "CODE", {});
			var code60_nodes = children(code60);
			t353 = claim_text(code60_nodes, "parseAdditiveExpression");
			code60_nodes.forEach(detach);
			t354 = claim_text(p54_nodes, " calls ");
			code61 = claim_element(p54_nodes, "CODE", {});
			var code61_nodes = children(code61);
			t355 = claim_text(code61_nodes, "parseMultiplicativeExpression");
			code61_nodes.forEach(detach);
			t356 = claim_text(p54_nodes, ", which in turn calls ");
			code62 = claim_element(p54_nodes, "CODE", {});
			var code62_nodes = children(code62);
			t357 = claim_text(code62_nodes, "parseExponentiationExpression");
			code62_nodes.forEach(detach);
			t358 = claim_text(p54_nodes, ", which in turn calls ... . This recursive process is called the ");
			a40 = claim_element(p54_nodes, "A", { href: true, rel: true });
			var a40_nodes = children(a40);
			t359 = claim_text(a40_nodes, "Recursive Descent Parsing");
			a40_nodes.forEach(detach);
			t360 = claim_text(p54_nodes, ".");
			p54_nodes.forEach(detach);
			section7_nodes.forEach(detach);
			t361 = claim_space(nodes);
			section8 = claim_element(nodes, "SECTION", {});
			var section8_nodes = children(section8);
			h4 = claim_element(section8_nodes, "H4", {});
			var h4_nodes = children(h4);
			a41 = claim_element(h4_nodes, "A", { href: true, id: true });
			var a41_nodes = children(a41);
			t362 = claim_text(a41_nodes, "this.eat, this.match, this.next");
			a41_nodes.forEach(detach);
			h4_nodes.forEach(detach);
			t363 = claim_space(section8_nodes);
			p55 = claim_element(section8_nodes, "P", {});
			var p55_nodes = children(p55);
			t364 = claim_text(p55_nodes, "If you have noticed, in my examples above, I used some utility function, such as ");
			code63 = claim_element(p55_nodes, "CODE", {});
			var code63_nodes = children(code63);
			t365 = claim_text(code63_nodes, "this.eat");
			code63_nodes.forEach(detach);
			t366 = claim_text(p55_nodes, ", ");
			code64 = claim_element(p55_nodes, "CODE", {});
			var code64_nodes = children(code64);
			t367 = claim_text(code64_nodes, "this.match");
			code64_nodes.forEach(detach);
			t368 = claim_text(p55_nodes, ", ");
			code65 = claim_element(p55_nodes, "CODE", {});
			var code65_nodes = children(code65);
			t369 = claim_text(code65_nodes, "this.next");
			code65_nodes.forEach(detach);
			t370 = claim_text(p55_nodes, ", etc. These are babel parser's internal functions, yet they are quite ubiquitous amongst parsers as well:");
			p55_nodes.forEach(detach);
			t371 = claim_space(section8_nodes);
			ul10 = claim_element(section8_nodes, "UL", {});
			var ul10_nodes = children(ul10);
			li26 = claim_element(ul10_nodes, "LI", {});
			var li26_nodes = children(li26);
			strong2 = claim_element(li26_nodes, "STRONG", {});
			var strong2_nodes = children(strong2);
			code66 = claim_element(strong2_nodes, "CODE", {});
			var code66_nodes = children(code66);
			t372 = claim_text(code66_nodes, "this.match");
			code66_nodes.forEach(detach);
			strong2_nodes.forEach(detach);
			t373 = claim_text(li26_nodes, " returns a ");
			code67 = claim_element(li26_nodes, "CODE", {});
			var code67_nodes = children(code67);
			t374 = claim_text(code67_nodes, "boolean");
			code67_nodes.forEach(detach);
			t375 = claim_text(li26_nodes, " indicating whether the current token matches the condition");
			li26_nodes.forEach(detach);
			t376 = claim_space(ul10_nodes);
			li27 = claim_element(ul10_nodes, "LI", {});
			var li27_nodes = children(li27);
			strong3 = claim_element(li27_nodes, "STRONG", {});
			var strong3_nodes = children(strong3);
			code68 = claim_element(strong3_nodes, "CODE", {});
			var code68_nodes = children(code68);
			t377 = claim_text(code68_nodes, "this.next");
			code68_nodes.forEach(detach);
			strong3_nodes.forEach(detach);
			t378 = claim_text(li27_nodes, " moves the token list forward to point to the next token");
			li27_nodes.forEach(detach);
			t379 = claim_space(ul10_nodes);
			li29 = claim_element(ul10_nodes, "LI", {});
			var li29_nodes = children(li29);
			strong4 = claim_element(li29_nodes, "STRONG", {});
			var strong4_nodes = children(strong4);
			code69 = claim_element(strong4_nodes, "CODE", {});
			var code69_nodes = children(code69);
			t380 = claim_text(code69_nodes, "this.eat");
			code69_nodes.forEach(detach);
			strong4_nodes.forEach(detach);
			t381 = claim_text(li29_nodes, " return what ");
			code70 = claim_element(li29_nodes, "CODE", {});
			var code70_nodes = children(code70);
			t382 = claim_text(code70_nodes, "this.match");
			code70_nodes.forEach(detach);
			t383 = claim_text(li29_nodes, " returns and if ");
			code71 = claim_element(li29_nodes, "CODE", {});
			var code71_nodes = children(code71);
			t384 = claim_text(code71_nodes, "this.match");
			code71_nodes.forEach(detach);
			t385 = claim_text(li29_nodes, " returns ");
			code72 = claim_element(li29_nodes, "CODE", {});
			var code72_nodes = children(code72);
			t386 = claim_text(code72_nodes, "true");
			code72_nodes.forEach(detach);
			t387 = claim_text(li29_nodes, ", will do ");
			code73 = claim_element(li29_nodes, "CODE", {});
			var code73_nodes = children(code73);
			t388 = claim_text(code73_nodes, "this.next");
			code73_nodes.forEach(detach);
			ul9 = claim_element(li29_nodes, "UL", {});
			var ul9_nodes = children(ul9);
			li28 = claim_element(ul9_nodes, "LI", {});
			var li28_nodes = children(li28);
			code74 = claim_element(li28_nodes, "CODE", {});
			var code74_nodes = children(code74);
			t389 = claim_text(code74_nodes, "this.eat");
			code74_nodes.forEach(detach);
			t390 = claim_text(li28_nodes, " is commonly used for optional operators, like ");
			code75 = claim_element(li28_nodes, "CODE", {});
			var code75_nodes = children(code75);
			t391 = claim_text(code75_nodes, "*");
			code75_nodes.forEach(detach);
			t392 = claim_text(li28_nodes, " in generator function, ");
			code76 = claim_element(li28_nodes, "CODE", {});
			var code76_nodes = children(code76);
			t393 = claim_text(code76_nodes, ";");
			code76_nodes.forEach(detach);
			t394 = claim_text(li28_nodes, " at the end of statements, and ");
			code77 = claim_element(li28_nodes, "CODE", {});
			var code77_nodes = children(code77);
			t395 = claim_text(code77_nodes, "?");
			code77_nodes.forEach(detach);
			t396 = claim_text(li28_nodes, " in typescript types.");
			li28_nodes.forEach(detach);
			ul9_nodes.forEach(detach);
			li29_nodes.forEach(detach);
			t397 = claim_space(ul10_nodes);
			li30 = claim_element(ul10_nodes, "LI", {});
			var li30_nodes = children(li30);
			strong5 = claim_element(li30_nodes, "STRONG", {});
			var strong5_nodes = children(strong5);
			code78 = claim_element(strong5_nodes, "CODE", {});
			var code78_nodes = children(code78);
			t398 = claim_text(code78_nodes, "this.lookahead");
			code78_nodes.forEach(detach);
			strong5_nodes.forEach(detach);
			t399 = claim_text(li30_nodes, " get the next token without moving forward to make a decision on the current node");
			li30_nodes.forEach(detach);
			ul10_nodes.forEach(detach);
			t400 = claim_space(section8_nodes);
			p56 = claim_element(section8_nodes, "P", {});
			var p56_nodes = children(p56);
			t401 = claim_text(p56_nodes, "If you take a look again the parser code we just changed, it's easier to read it in now.");
			p56_nodes.forEach(detach);
			t402 = claim_space(section8_nodes);
			pre19 = claim_element(section8_nodes, "PRE", { class: true });
			var pre19_nodes = children(pre19);
			pre19_nodes.forEach(detach);
			t403 = claim_space(section8_nodes);
			p57 = claim_element(section8_nodes, "P", {});
			var p57_nodes = children(p57);
			t404 = claim_text(p57_nodes, "I know I didn't do a good job explaining how a parser works. Here are some resources that I learned from, and I highly recommend them:");
			p57_nodes.forEach(detach);
			t405 = claim_space(section8_nodes);
			ul11 = claim_element(section8_nodes, "UL", {});
			var ul11_nodes = children(ul11);
			li31 = claim_element(ul11_nodes, "LI", {});
			var li31_nodes = children(li31);
			a42 = claim_element(li31_nodes, "A", { href: true, rel: true });
			var a42_nodes = children(a42);
			t406 = claim_text(a42_nodes, "Crafting Interpreters");
			a42_nodes.forEach(detach);
			t407 = claim_text(li31_nodes, " by ");
			a43 = claim_element(li31_nodes, "A", { href: true, rel: true });
			var a43_nodes = children(a43);
			t408 = claim_text(a43_nodes, "Robert Nystrom");
			a43_nodes.forEach(detach);
			li31_nodes.forEach(detach);
			t409 = claim_space(ul11_nodes);
			li32 = claim_element(ul11_nodes, "LI", {});
			var li32_nodes = children(li32);
			a44 = claim_element(li32_nodes, "A", { href: true, rel: true });
			var a44_nodes = children(a44);
			t410 = claim_text(a44_nodes, "Free Udacity course: \"Compilers: Theory and Practice\"");
			a44_nodes.forEach(detach);
			t411 = claim_text(li32_nodes, ", offered by Georgia Tech");
			li32_nodes.forEach(detach);
			ul11_nodes.forEach(detach);
			t412 = claim_space(section8_nodes);
			hr0 = claim_element(section8_nodes, "HR", {});
			t413 = claim_space(section8_nodes);
			p58 = claim_element(section8_nodes, "P", {});
			var p58_nodes = children(p58);
			strong6 = claim_element(p58_nodes, "STRONG", {});
			var strong6_nodes = children(strong6);
			t414 = claim_text(strong6_nodes, "Side Note");
			strong6_nodes.forEach(detach);
			t415 = claim_text(p58_nodes, ": You might be curious how am I able to visualize the custom syntax in the Babel AST Explorer, where I showed you the new \"curry\" attribute in the AST.");
			p58_nodes.forEach(detach);
			t416 = claim_space(section8_nodes);
			p59 = claim_element(section8_nodes, "P", {});
			var p59_nodes = children(p59);
			t417 = claim_text(p59_nodes, "That's because I've added a new feature in the Babel AST Explorer where you can upload your custom parser!");
			p59_nodes.forEach(detach);
			t418 = claim_space(section8_nodes);
			p60 = claim_element(section8_nodes, "P", {});
			var p60_nodes = children(p60);
			t419 = claim_text(p60_nodes, "If you go to ");
			code79 = claim_element(p60_nodes, "CODE", {});
			var code79_nodes = children(code79);
			t420 = claim_text(code79_nodes, "packages/babel-parser/lib");
			code79_nodes.forEach(detach);
			t421 = claim_text(p60_nodes, ", you would find the compiled version of your parser and the source map. Open the drawer of the Babel AST Explorer, you will see a button to upload a custom parser. Drag the ");
			code80 = claim_element(p60_nodes, "CODE", {});
			var code80_nodes = children(code80);
			t422 = claim_text(code80_nodes, "packages/babel-parser/lib/index.js");
			code80_nodes.forEach(detach);
			t423 = claim_text(p60_nodes, " in and you will be visualizing the AST generated via your custom parser!");
			p60_nodes.forEach(detach);
			t424 = claim_space(section8_nodes);
			p61 = claim_element(section8_nodes, "P", {});
			var p61_nodes = children(p61);
			img3 = claim_element(p61_nodes, "IMG", { src: true, alt: true });
			p61_nodes.forEach(detach);
			t425 = claim_space(section8_nodes);
			hr1 = claim_element(section8_nodes, "HR", {});
			section8_nodes.forEach(detach);
			t426 = claim_space(nodes);
			section9 = claim_element(nodes, "SECTION", {});
			var section9_nodes = children(section9);
			h23 = claim_element(section9_nodes, "H2", {});
			var h23_nodes = children(h23);
			a45 = claim_element(h23_nodes, "A", { href: true, id: true });
			var a45_nodes = children(a45);
			t427 = claim_text(a45_nodes, "Our babel plugin");
			a45_nodes.forEach(detach);
			h23_nodes.forEach(detach);
			t428 = claim_space(section9_nodes);
			p62 = claim_element(section9_nodes, "P", {});
			var p62_nodes = children(p62);
			t429 = claim_text(p62_nodes, "With our custom babel parser done, let's move on to write our babel plugin.");
			p62_nodes.forEach(detach);
			t430 = claim_space(section9_nodes);
			p63 = claim_element(section9_nodes, "P", {});
			var p63_nodes = children(p63);
			t431 = claim_text(p63_nodes, "But maybe before that, you may have some doubts on how are we going to use our custom babel parser, especially with whatever build stack we are using right now?");
			p63_nodes.forEach(detach);
			t432 = claim_space(section9_nodes);
			p64 = claim_element(section9_nodes, "P", {});
			var p64_nodes = children(p64);
			t433 = claim_text(p64_nodes, "Well, fret not. A babel plugin can provide a custom parser, which is ");
			a46 = claim_element(p64_nodes, "A", { href: true, rel: true });
			var a46_nodes = children(a46);
			t434 = claim_text(a46_nodes, "documented on the babel website");
			a46_nodes.forEach(detach);
			p64_nodes.forEach(detach);
			t435 = claim_space(section9_nodes);
			pre20 = claim_element(section9_nodes, "PRE", { class: true });
			var pre20_nodes = children(pre20);
			pre20_nodes.forEach(detach);
			t436 = claim_space(section9_nodes);
			p65 = claim_element(section9_nodes, "P", {});
			var p65_nodes = children(p65);
			t437 = claim_text(p65_nodes, "Since we forked out the babel parser, all existing babel parser options or built-in plugins will still work perfectly.");
			p65_nodes.forEach(detach);
			t438 = claim_space(section9_nodes);
			p66 = claim_element(section9_nodes, "P", {});
			var p66_nodes = children(p66);
			t439 = claim_text(p66_nodes, "With this doubt out of the way, let see how we can make our curry function curryable? ");
			em7 = claim_element(p66_nodes, "EM", {});
			var em7_nodes = children(em7);
			t440 = claim_text(em7_nodes, "(not entirely sure there's such word)");
			em7_nodes.forEach(detach);
			p66_nodes.forEach(detach);
			t441 = claim_space(section9_nodes);
			hr2 = claim_element(section9_nodes, "HR", {});
			t442 = claim_space(section9_nodes);
			p67 = claim_element(section9_nodes, "P", {});
			var p67_nodes = children(p67);
			t443 = claim_text(p67_nodes, "Before we start, if you have eagerly tried to add our plugin into your build system, you would notice that the curry function gets compiled to a normal function.");
			p67_nodes.forEach(detach);
			t444 = claim_space(section9_nodes);
			p68 = claim_element(section9_nodes, "P", {});
			var p68_nodes = children(p68);
			t445 = claim_text(p68_nodes, "This is because, after parsing + transformation, babel will use ");
			a47 = claim_element(p68_nodes, "A", { href: true, rel: true });
			var a47_nodes = children(a47);
			t446 = claim_text(a47_nodes, "@babel/generator");
			a47_nodes.forEach(detach);
			t447 = claim_text(p68_nodes, " to generate code from the transformed AST. Since the ");
			code81 = claim_element(p68_nodes, "CODE", {});
			var code81_nodes = children(code81);
			t448 = claim_text(code81_nodes, "@babel/generator");
			code81_nodes.forEach(detach);
			t449 = claim_text(p68_nodes, " has no idea about the new ");
			code82 = claim_element(p68_nodes, "CODE", {});
			var code82_nodes = children(code82);
			t450 = claim_text(code82_nodes, "curry");
			code82_nodes.forEach(detach);
			t451 = claim_text(p68_nodes, " attribute we added, it will be omitted.");
			p68_nodes.forEach(detach);
			t452 = claim_space(section9_nodes);
			blockquote5 = claim_element(section9_nodes, "BLOCKQUOTE", {});
			var blockquote5_nodes = children(blockquote5);
			p69 = claim_element(blockquote5_nodes, "P", {});
			var p69_nodes = children(p69);
			t453 = claim_text(p69_nodes, "If one day curry function becomes the new JavaScript syntax, you may want to make a pull request to add one more line ");
			a48 = claim_element(p69_nodes, "A", { href: true, rel: true });
			var a48_nodes = children(a48);
			t454 = claim_text(a48_nodes, "here");
			a48_nodes.forEach(detach);
			t455 = claim_text(p69_nodes, "!");
			p69_nodes.forEach(detach);
			blockquote5_nodes.forEach(detach);
			t456 = claim_space(section9_nodes);
			hr3 = claim_element(section9_nodes, "HR", {});
			t457 = claim_space(section9_nodes);
			p70 = claim_element(section9_nodes, "P", {});
			var p70_nodes = children(p70);
			t458 = claim_text(p70_nodes, "Ok, to make our function curryable, we can wrap it with a ");
			code83 = claim_element(p70_nodes, "CODE", {});
			var code83_nodes = children(code83);
			t459 = claim_text(code83_nodes, "currying");
			code83_nodes.forEach(detach);
			t460 = claim_text(p70_nodes, " helper higher-order function:");
			p70_nodes.forEach(detach);
			t461 = claim_space(section9_nodes);
			pre21 = claim_element(section9_nodes, "PRE", { class: true });
			var pre21_nodes = children(pre21);
			pre21_nodes.forEach(detach);
			t462 = claim_space(section9_nodes);
			blockquote6 = claim_element(section9_nodes, "BLOCKQUOTE", {});
			var blockquote6_nodes = children(blockquote6);
			p71 = claim_element(blockquote6_nodes, "P", {});
			var p71_nodes = children(p71);
			t463 = claim_text(p71_nodes, "If you want to learn how to write a currying function, you can read this ");
			a49 = claim_element(p71_nodes, "A", { href: true, rel: true });
			var a49_nodes = children(a49);
			t464 = claim_text(a49_nodes, "Currying in JS");
			a49_nodes.forEach(detach);
			t465 = claim_text(p71_nodes, " by ");
			a50 = claim_element(p71_nodes, "A", { href: true, rel: true });
			var a50_nodes = children(a50);
			t466 = claim_text(a50_nodes, "Shirsh Zibbu");
			a50_nodes.forEach(detach);
			p71_nodes.forEach(detach);
			blockquote6_nodes.forEach(detach);
			t467 = claim_space(section9_nodes);
			p72 = claim_element(section9_nodes, "P", {});
			var p72_nodes = children(p72);
			t468 = claim_text(p72_nodes, "So when we transform our curry function, we can transform it into the following:");
			p72_nodes.forEach(detach);
			t469 = claim_space(section9_nodes);
			pre22 = claim_element(section9_nodes, "PRE", { class: true });
			var pre22_nodes = children(pre22);
			pre22_nodes.forEach(detach);
			t470 = claim_space(section9_nodes);
			blockquote7 = claim_element(section9_nodes, "BLOCKQUOTE", {});
			var blockquote7_nodes = children(blockquote7);
			p73 = claim_element(blockquote7_nodes, "P", {});
			var p73_nodes = children(p73);
			t471 = claim_text(p73_nodes, "Let's first ignore ");
			a51 = claim_element(p73_nodes, "A", { href: true, rel: true });
			var a51_nodes = children(a51);
			t472 = claim_text(a51_nodes, "function hoisting");
			a51_nodes.forEach(detach);
			t473 = claim_text(p73_nodes, " in JavaScript, where you can call ");
			code84 = claim_element(p73_nodes, "CODE", {});
			var code84_nodes = children(code84);
			t474 = claim_text(code84_nodes, "foo");
			code84_nodes.forEach(detach);
			t475 = claim_text(p73_nodes, " before it is defined.");
			p73_nodes.forEach(detach);
			blockquote7_nodes.forEach(detach);
			t476 = claim_space(section9_nodes);
			p74 = claim_element(section9_nodes, "P", {});
			var p74_nodes = children(p74);
			t477 = claim_text(p74_nodes, "If you have read my ");
			a52 = claim_element(p74_nodes, "A", { href: true });
			var a52_nodes = children(a52);
			t478 = claim_text(a52_nodes, "step-by-step guide on babel transformation");
			a52_nodes.forEach(detach);
			t479 = claim_text(p74_nodes, ", writing this transformation should be manageable:");
			p74_nodes.forEach(detach);
			t480 = claim_space(section9_nodes);
			pre23 = claim_element(section9_nodes, "PRE", { class: true });
			var pre23_nodes = children(pre23);
			pre23_nodes.forEach(detach);
			t481 = claim_space(section9_nodes);
			p75 = claim_element(section9_nodes, "P", {});
			var p75_nodes = children(p75);
			t482 = claim_text(p75_nodes, "The question is how do we provide the ");
			code85 = claim_element(p75_nodes, "CODE", {});
			var code85_nodes = children(code85);
			t483 = claim_text(code85_nodes, "currying");
			code85_nodes.forEach(detach);
			t484 = claim_text(p75_nodes, " function?");
			p75_nodes.forEach(detach);
			t485 = claim_space(section9_nodes);
			p76 = claim_element(section9_nodes, "P", {});
			var p76_nodes = children(p76);
			t486 = claim_text(p76_nodes, "There are 2 ways:");
			p76_nodes.forEach(detach);
			section9_nodes.forEach(detach);
			t487 = claim_space(nodes);
			section10 = claim_element(nodes, "SECTION", {});
			var section10_nodes = children(section10);
			h34 = claim_element(section10_nodes, "H3", {});
			var h34_nodes = children(h34);
			a53 = claim_element(h34_nodes, "A", { href: true, id: true });
			var a53_nodes = children(a53);
			t488 = claim_text(a53_nodes, "1. Assume ");
			code86 = claim_element(a53_nodes, "CODE", {});
			var code86_nodes = children(code86);
			t489 = claim_text(code86_nodes, "currying");
			code86_nodes.forEach(detach);
			t490 = claim_text(a53_nodes, " has been declared in the global scope.");
			a53_nodes.forEach(detach);
			h34_nodes.forEach(detach);
			t491 = claim_space(section10_nodes);
			p77 = claim_element(section10_nodes, "P", {});
			var p77_nodes = children(p77);
			t492 = claim_text(p77_nodes, "Basically, your job is done here.");
			p77_nodes.forEach(detach);
			t493 = claim_space(section10_nodes);
			p78 = claim_element(section10_nodes, "P", {});
			var p78_nodes = children(p78);
			t494 = claim_text(p78_nodes, "If ");
			code87 = claim_element(p78_nodes, "CODE", {});
			var code87_nodes = children(code87);
			t495 = claim_text(code87_nodes, "currying");
			code87_nodes.forEach(detach);
			t496 = claim_text(p78_nodes, " is not defined, then when executing the compiled code, the runtime will scream out ");
			em8 = claim_element(p78_nodes, "EM", {});
			var em8_nodes = children(em8);
			t497 = claim_text(em8_nodes, "\"currying is not defined\"");
			em8_nodes.forEach(detach);
			t498 = claim_text(p78_nodes, ", just like the ");
			a54 = claim_element(p78_nodes, "A", { href: true, rel: true });
			var a54_nodes = children(a54);
			t499 = claim_text(a54_nodes, "\"regeneratorRuntime is not defined\"");
			a54_nodes.forEach(detach);
			t500 = claim_text(p78_nodes, ".");
			p78_nodes.forEach(detach);
			t501 = claim_space(section10_nodes);
			p79 = claim_element(section10_nodes, "P", {});
			var p79_nodes = children(p79);
			t502 = claim_text(p79_nodes, "So probably you have to educate the users to install ");
			code88 = claim_element(p79_nodes, "CODE", {});
			var code88_nodes = children(code88);
			t503 = claim_text(code88_nodes, "currying");
			code88_nodes.forEach(detach);
			t504 = claim_text(p79_nodes, " polyfills in order to use your ");
			code89 = claim_element(p79_nodes, "CODE", {});
			var code89_nodes = children(code89);
			t505 = claim_text(code89_nodes, "babel-plugin-transformation-curry-function");
			code89_nodes.forEach(detach);
			t506 = claim_text(p79_nodes, ".");
			p79_nodes.forEach(detach);
			section10_nodes.forEach(detach);
			t507 = claim_space(nodes);
			section11 = claim_element(nodes, "SECTION", {});
			var section11_nodes = children(section11);
			h35 = claim_element(section11_nodes, "H3", {});
			var h35_nodes = children(h35);
			a55 = claim_element(h35_nodes, "A", { href: true, id: true });
			var a55_nodes = children(a55);
			t508 = claim_text(a55_nodes, "2. Use the ");
			code90 = claim_element(a55_nodes, "CODE", {});
			var code90_nodes = children(code90);
			t509 = claim_text(code90_nodes, "@babel/helpers");
			code90_nodes.forEach(detach);
			a55_nodes.forEach(detach);
			h35_nodes.forEach(detach);
			t510 = claim_space(section11_nodes);
			p80 = claim_element(section11_nodes, "P", {});
			var p80_nodes = children(p80);
			t511 = claim_text(p80_nodes, "You can add a new helper to ");
			code91 = claim_element(p80_nodes, "CODE", {});
			var code91_nodes = children(code91);
			t512 = claim_text(code91_nodes, "@babel/helpers");
			code91_nodes.forEach(detach);
			t513 = claim_text(p80_nodes, ", which of course you are unlikely to merge that into the official ");
			code92 = claim_element(p80_nodes, "CODE", {});
			var code92_nodes = children(code92);
			t514 = claim_text(code92_nodes, "@babel/helpers");
			code92_nodes.forEach(detach);
			t515 = claim_text(p80_nodes, ", so you would have to figure a way to make ");
			code93 = claim_element(p80_nodes, "CODE", {});
			var code93_nodes = children(code93);
			t516 = claim_text(code93_nodes, "@babel/core");
			code93_nodes.forEach(detach);
			t517 = claim_text(p80_nodes, " to resolve to your ");
			code94 = claim_element(p80_nodes, "CODE", {});
			var code94_nodes = children(code94);
			t518 = claim_text(code94_nodes, "@babel/helpers");
			code94_nodes.forEach(detach);
			t519 = claim_text(p80_nodes, ":");
			p80_nodes.forEach(detach);
			t520 = claim_space(section11_nodes);
			pre24 = claim_element(section11_nodes, "PRE", { class: true });
			var pre24_nodes = children(pre24);
			pre24_nodes.forEach(detach);
			t521 = claim_space(section11_nodes);
			p81 = claim_element(section11_nodes, "P", {});
			var p81_nodes = children(p81);
			em9 = claim_element(p81_nodes, "EM", {});
			var em9_nodes = children(em9);
			strong7 = claim_element(em9_nodes, "STRONG", {});
			var strong7_nodes = children(strong7);
			t522 = claim_text(strong7_nodes, "Disclaimer:");
			strong7_nodes.forEach(detach);
			t523 = claim_text(em9_nodes, " I have not personally tried this, but I believe it will work. If you encountered problems trying this, ");
			a56 = claim_element(em9_nodes, "A", { href: true, rel: true });
			var a56_nodes = children(a56);
			t524 = claim_text(a56_nodes, "DM me");
			a56_nodes.forEach(detach);
			t525 = claim_text(em9_nodes, ", I am very happy to discuss it with you.");
			em9_nodes.forEach(detach);
			p81_nodes.forEach(detach);
			t526 = claim_space(section11_nodes);
			p82 = claim_element(section11_nodes, "P", {});
			var p82_nodes = children(p82);
			t527 = claim_text(p82_nodes, "Adding a new helper function into ");
			code95 = claim_element(p82_nodes, "CODE", {});
			var code95_nodes = children(code95);
			t528 = claim_text(code95_nodes, "@babel/helpers");
			code95_nodes.forEach(detach);
			t529 = claim_text(p82_nodes, " is very easy.");
			p82_nodes.forEach(detach);
			t530 = claim_space(section11_nodes);
			p83 = claim_element(section11_nodes, "P", {});
			var p83_nodes = children(p83);
			t531 = claim_text(p83_nodes, "Head over to ");
			a57 = claim_element(p83_nodes, "A", { href: true, rel: true });
			var a57_nodes = children(a57);
			t532 = claim_text(a57_nodes, "packages/babel-helpers/src/helpers.js");
			a57_nodes.forEach(detach);
			t533 = claim_text(p83_nodes, " and add a new entry:");
			p83_nodes.forEach(detach);
			t534 = claim_space(section11_nodes);
			pre25 = claim_element(section11_nodes, "PRE", { class: true });
			var pre25_nodes = children(pre25);
			pre25_nodes.forEach(detach);
			t535 = claim_space(section11_nodes);
			p84 = claim_element(section11_nodes, "P", {});
			var p84_nodes = children(p84);
			t536 = claim_text(p84_nodes, "The helper tag function specifies the ");
			code96 = claim_element(p84_nodes, "CODE", {});
			var code96_nodes = children(code96);
			t537 = claim_text(code96_nodes, "@babel/core");
			code96_nodes.forEach(detach);
			t538 = claim_text(p84_nodes, " version required. The trick here is to ");
			code97 = claim_element(p84_nodes, "CODE", {});
			var code97_nodes = children(code97);
			t539 = claim_text(code97_nodes, "export default");
			code97_nodes.forEach(detach);
			t540 = claim_text(p84_nodes, " the ");
			code98 = claim_element(p84_nodes, "CODE", {});
			var code98_nodes = children(code98);
			t541 = claim_text(code98_nodes, "currying");
			code98_nodes.forEach(detach);
			t542 = claim_text(p84_nodes, " function.");
			p84_nodes.forEach(detach);
			t543 = claim_space(section11_nodes);
			p85 = claim_element(section11_nodes, "P", {});
			var p85_nodes = children(p85);
			t544 = claim_text(p85_nodes, "To use the helper, just call the ");
			code99 = claim_element(p85_nodes, "CODE", {});
			var code99_nodes = children(code99);
			t545 = claim_text(code99_nodes, "this.addHelper()");
			code99_nodes.forEach(detach);
			t546 = claim_text(p85_nodes, ":");
			p85_nodes.forEach(detach);
			t547 = claim_space(section11_nodes);
			pre26 = claim_element(section11_nodes, "PRE", { class: true });
			var pre26_nodes = children(pre26);
			pre26_nodes.forEach(detach);
			t548 = claim_space(section11_nodes);
			p86 = claim_element(section11_nodes, "P", {});
			var p86_nodes = children(p86);
			t549 = claim_text(p86_nodes, "The ");
			code100 = claim_element(p86_nodes, "CODE", {});
			var code100_nodes = children(code100);
			t550 = claim_text(code100_nodes, "this.addHelper");
			code100_nodes.forEach(detach);
			t551 = claim_text(p86_nodes, " will inject the helper at the top of the file if needed, and returns an ");
			code101 = claim_element(p86_nodes, "CODE", {});
			var code101_nodes = children(code101);
			t552 = claim_text(code101_nodes, "Identifier");
			code101_nodes.forEach(detach);
			t553 = claim_text(p86_nodes, " to the injected function.");
			p86_nodes.forEach(detach);
			section11_nodes.forEach(detach);
			t554 = claim_space(nodes);
			section12 = claim_element(nodes, "SECTION", {});
			var section12_nodes = children(section12);
			h24 = claim_element(section12_nodes, "H2", {});
			var h24_nodes = children(h24);
			a58 = claim_element(h24_nodes, "A", { href: true, id: true });
			var a58_nodes = children(a58);
			t555 = claim_text(a58_nodes, "Closing Note");
			a58_nodes.forEach(detach);
			h24_nodes.forEach(detach);
			t556 = claim_space(section12_nodes);
			p87 = claim_element(section12_nodes, "P", {});
			var p87_nodes = children(p87);
			t557 = claim_text(p87_nodes, "We've seen how we can modify the babel parser function, write our own babel transform plugin ");
			em10 = claim_element(p87_nodes, "EM", {});
			var em10_nodes = children(em10);
			t558 = claim_text(em10_nodes, "(which was brief mainly because I have ");
			a59 = claim_element(em10_nodes, "A", { href: true });
			var a59_nodes = children(a59);
			t559 = claim_text(a59_nodes, "a detailed cover in my previous post");
			a59_nodes.forEach(detach);
			t560 = claim_text(em10_nodes, ")");
			em10_nodes.forEach(detach);
			t561 = claim_text(p87_nodes, ", a brief touch on ");
			code102 = claim_element(p87_nodes, "CODE", {});
			var code102_nodes = children(code102);
			t562 = claim_text(code102_nodes, "@babel/generator");
			code102_nodes.forEach(detach);
			t563 = claim_text(p87_nodes, " and also how we can add helper functions via ");
			code103 = claim_element(p87_nodes, "CODE", {});
			var code103_nodes = children(code103);
			t564 = claim_text(code103_nodes, "@babel/helpers");
			code103_nodes.forEach(detach);
			t565 = claim_text(p87_nodes, ".");
			p87_nodes.forEach(detach);
			t566 = claim_space(section12_nodes);
			p88 = claim_element(section12_nodes, "P", {});
			var p88_nodes = children(p88);
			t567 = claim_text(p88_nodes, "Along the way, we had a crash course on how a parser works, which I will provide the links to ");
			a60 = claim_element(p88_nodes, "A", { href: true });
			var a60_nodes = children(a60);
			t568 = claim_text(a60_nodes, "further reading");
			a60_nodes.forEach(detach);
			t569 = claim_text(p88_nodes, " at the bottom.");
			p88_nodes.forEach(detach);
			t570 = claim_space(section12_nodes);
			p89 = claim_element(section12_nodes, "P", {});
			var p89_nodes = children(p89);
			t571 = claim_text(p89_nodes, "The steps we've gone through above is similar to part of the ");
			a61 = claim_element(p89_nodes, "A", { href: true, rel: true });
			var a61_nodes = children(a61);
			t572 = claim_text(a61_nodes, "TC39 proposal");
			a61_nodes.forEach(detach);
			t573 = claim_space(p89_nodes);
			a62 = claim_element(p89_nodes, "A", { href: true, rel: true });
			var a62_nodes = children(a62);
			t574 = claim_text(a62_nodes, "process");
			a62_nodes.forEach(detach);
			t575 = claim_text(p89_nodes, " when defining a new JavaScript specification. When proposing a new specification, the champion of the proposal usually write polyfills or forked out babel to write proof-of-concept demos. As you've seen, forking a parser or writing polyfills is not the hardest part of the process, but to define the problem space, plan and think through the use cases and edge cases, and gather opinions and suggestions from the community. To this end, I am grateful to the proposal champion, for their effort in pushing the JavaScript language forward.");
			p89_nodes.forEach(detach);
			t576 = claim_space(section12_nodes);
			p90 = claim_element(section12_nodes, "P", {});
			var p90_nodes = children(p90);
			t577 = claim_text(p90_nodes, "Finally, if you want to see the code we've done so far in a full picture, you can ");
			a63 = claim_element(p90_nodes, "A", { href: true, rel: true });
			var a63_nodes = children(a63);
			t578 = claim_text(a63_nodes, "check it out from Github");
			a63_nodes.forEach(detach);
			t579 = claim_text(p90_nodes, ".");
			p90_nodes.forEach(detach);
			t580 = claim_space(section12_nodes);
			hr4 = claim_element(section12_nodes, "HR", {});
			section12_nodes.forEach(detach);
			t581 = claim_space(nodes);
			section13 = claim_element(nodes, "SECTION", {});
			var section13_nodes = children(section13);
			h25 = claim_element(section13_nodes, "H2", {});
			var h25_nodes = children(h25);
			a64 = claim_element(h25_nodes, "A", { href: true, id: true });
			var a64_nodes = children(a64);
			t582 = claim_text(a64_nodes, "Editor's Note");
			a64_nodes.forEach(detach);
			h25_nodes.forEach(detach);
			t583 = claim_space(section13_nodes);
			p91 = claim_element(section13_nodes, "P", {});
			var p91_nodes = children(p91);
			t584 = claim_text(p91_nodes, "I've worked on the babel repository for a while, yet I've never added a new syntax to the babel parser before. Most of my contributions were just fixing bugs and specs compliance feature.");
			p91_nodes.forEach(detach);
			t585 = claim_space(section13_nodes);
			p92 = claim_element(section13_nodes, "P", {});
			var p92_nodes = children(p92);
			t586 = claim_text(p92_nodes, "Yet this idea of creating a new syntax has been in my mind for a while. So I took the chance of writing a blog to try it out. It is an exhilarating experience to see it work as expected.");
			p92_nodes.forEach(detach);
			t587 = claim_space(section13_nodes);
			p93 = claim_element(section13_nodes, "P", {});
			var p93_nodes = children(p93);
			t588 = claim_text(p93_nodes, "Having the ability to manipulate the syntax of the language you are writing is invigorating. It empowers us the possibility of writing less code or more straightforward code and shifts that complexity to compile time. Just as how ");
			code104 = claim_element(p93_nodes, "CODE", {});
			var code104_nodes = children(code104);
			t589 = claim_text(code104_nodes, "async-await");
			code104_nodes.forEach(detach);
			t590 = claim_text(p93_nodes, " solves the callback hell and promise-chaining hell.");
			p93_nodes.forEach(detach);
			t591 = claim_space(section13_nodes);
			p94 = claim_element(section13_nodes, "P", {});
			var p94_nodes = children(p94);
			t592 = claim_text(p94_nodes, "If this article inspires you to some great idea, and you wish to discuss it with somebody, you are always more than welcome to reach out to me through ");
			a65 = claim_element(p94_nodes, "A", { href: true, rel: true });
			var a65_nodes = children(a65);
			t593 = claim_text(a65_nodes, "Twitter");
			a65_nodes.forEach(detach);
			t594 = claim_text(p94_nodes, ".");
			p94_nodes.forEach(detach);
			section13_nodes.forEach(detach);
			t595 = claim_space(nodes);
			section14 = claim_element(nodes, "SECTION", {});
			var section14_nodes = children(section14);
			h26 = claim_element(section14_nodes, "H2", {});
			var h26_nodes = children(h26);
			a66 = claim_element(h26_nodes, "A", { href: true, id: true });
			var a66_nodes = children(a66);
			t596 = claim_text(a66_nodes, "Further Reading");
			a66_nodes.forEach(detach);
			h26_nodes.forEach(detach);
			t597 = claim_space(section14_nodes);
			p95 = claim_element(section14_nodes, "P", {});
			var p95_nodes = children(p95);
			t598 = claim_text(p95_nodes, "About compilers:");
			p95_nodes.forEach(detach);
			t599 = claim_space(section14_nodes);
			ul12 = claim_element(section14_nodes, "UL", {});
			var ul12_nodes = children(ul12);
			li33 = claim_element(ul12_nodes, "LI", {});
			var li33_nodes = children(li33);
			a67 = claim_element(li33_nodes, "A", { href: true, rel: true });
			var a67_nodes = children(a67);
			t600 = claim_text(a67_nodes, "Crafting Interpreters");
			a67_nodes.forEach(detach);
			t601 = claim_text(li33_nodes, " by ");
			a68 = claim_element(li33_nodes, "A", { href: true, rel: true });
			var a68_nodes = children(a68);
			t602 = claim_text(a68_nodes, "Robert Nystrom");
			a68_nodes.forEach(detach);
			li33_nodes.forEach(detach);
			t603 = claim_space(ul12_nodes);
			li34 = claim_element(ul12_nodes, "LI", {});
			var li34_nodes = children(li34);
			a69 = claim_element(li34_nodes, "A", { href: true, rel: true });
			var a69_nodes = children(a69);
			t604 = claim_text(a69_nodes, "Free Udacity course: \"Compilers: Theory and Practice\"");
			a69_nodes.forEach(detach);
			t605 = claim_text(li34_nodes, ", offered by Georgia Tech");
			li34_nodes.forEach(detach);
			t606 = claim_space(ul12_nodes);
			li35 = claim_element(ul12_nodes, "LI", {});
			var li35_nodes = children(li35);
			a70 = claim_element(li35_nodes, "A", { href: true, rel: true });
			var a70_nodes = children(a70);
			t607 = claim_text(a70_nodes, "Leveling Up One’s Parsing Game With ASTs");
			a70_nodes.forEach(detach);
			t608 = claim_text(li35_nodes, " by ");
			a71 = claim_element(li35_nodes, "A", { href: true, rel: true });
			var a71_nodes = children(a71);
			t609 = claim_text(a71_nodes, "Vaidehi Joshi");
			a71_nodes.forEach(detach);
			li35_nodes.forEach(detach);
			ul12_nodes.forEach(detach);
			t610 = claim_space(section14_nodes);
			p96 = claim_element(section14_nodes, "P", {});
			var p96_nodes = children(p96);
			t611 = claim_text(p96_nodes, "Misc:");
			p96_nodes.forEach(detach);
			t612 = claim_space(section14_nodes);
			ul13 = claim_element(section14_nodes, "UL", {});
			var ul13_nodes = children(ul13);
			li36 = claim_element(ul13_nodes, "LI", {});
			var li36_nodes = children(li36);
			a72 = claim_element(li36_nodes, "A", { href: true, rel: true });
			var a72_nodes = children(a72);
			t613 = claim_text(a72_nodes, "Understanding hoisting in JavaScript");
			a72_nodes.forEach(detach);
			t614 = claim_text(li36_nodes, " by ");
			a73 = claim_element(li36_nodes, "A", { href: true, rel: true });
			var a73_nodes = children(a73);
			t615 = claim_text(a73_nodes, "Mabishi Wakio");
			a73_nodes.forEach(detach);
			li36_nodes.forEach(detach);
			t616 = claim_space(ul13_nodes);
			li37 = claim_element(ul13_nodes, "LI", {});
			var li37_nodes = children(li37);
			a74 = claim_element(li37_nodes, "A", { href: true, rel: true });
			var a74_nodes = children(a74);
			t617 = claim_text(a74_nodes, "Currying in JS");
			a74_nodes.forEach(detach);
			t618 = claim_text(li37_nodes, " by ");
			a75 = claim_element(li37_nodes, "A", { href: true, rel: true });
			var a75_nodes = children(a75);
			t619 = claim_text(a75_nodes, "Shirsh Zibbu");
			a75_nodes.forEach(detach);
			li37_nodes.forEach(detach);
			t620 = claim_space(ul13_nodes);
			li38 = claim_element(ul13_nodes, "LI", {});
			var li38_nodes = children(li38);
			a76 = claim_element(li38_nodes, "A", { href: true, rel: true });
			var a76_nodes = children(a76);
			t621 = claim_text(a76_nodes, "TC39 Proposals");
			a76_nodes.forEach(detach);
			li38_nodes.forEach(detach);
			t622 = claim_space(ul13_nodes);
			li39 = claim_element(ul13_nodes, "LI", {});
			var li39_nodes = children(li39);
			a77 = claim_element(li39_nodes, "A", { href: true, rel: true });
			var a77_nodes = children(a77);
			t623 = claim_text(a77_nodes, "TC39 Process Document");
			a77_nodes.forEach(detach);
			li39_nodes.forEach(detach);
			ul13_nodes.forEach(detach);
			section14_nodes.forEach(detach);
			this.h();
		},
		h() {
			attr(a0, "href", "#overview");
			attr(a1, "href", "#fork-the-babel");
			attr(a2, "href", "#crash-course-on-parsing-code-to-ast");
			attr(a3, "href", "#our-custom-babel-parser");
			attr(a4, "href", "#a-new-token");
			attr(a5, "href", "#the-new-parser");
			attr(a6, "href", "#how-parsing-works");
			attr(a7, "href", "#this-eat-this-match-this-next");
			attr(a8, "href", "#our-babel-plugin");
			attr(a9, "href", "#assume-currying-has-been-declared-in-the-global-scope");
			attr(a10, "href", "#use-the-babel-helpers");
			attr(a11, "href", "#closing-note");
			attr(a12, "href", "#editor-s-note");
			attr(a13, "href", "#further-reading");
			attr(ul4, "class", "sitemap");
			attr(ul4, "id", "sitemap");
			attr(ul4, "role", "navigation");
			attr(ul4, "aria-label", "Table of Contents");
			attr(a14, "href", "/step-by-step-guide-for-writing-a-babel-transformation");
			attr(a15, "href", "#overview");
			attr(a15, "id", "overview");
			attr(pre0, "class", "language-js");
			attr(a16, "href", "https://en.wikipedia.org/wiki/Currying");
			attr(a16, "rel", "nofollow");
			attr(a17, "href", "https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Statements/function*");
			attr(a17, "rel", "nofollow");
			attr(a18, "href", "https://scotch.io/tutorials/javascript-functional-programming-explained-partial-application-and-currying");
			attr(a18, "rel", "nofollow");
			attr(pre1, "class", "language-js");
			attr(a19, "href", "https://medium.com/google-developers/exploring-es7-decorators-76ecb65fb841");
			attr(a19, "rel", "nofollow");
			attr(a20, "href", "#fork-the-babel");
			attr(a20, "id", "fork-the-babel");
			attr(a21, "href", "https://github.com/babel/babel");
			attr(a21, "rel", "nofollow");
			if (img0.src !== (img0_src_value = __build_img__0)) attr(img0, "src", img0_src_value);
			attr(img0, "alt", "forking babel");
			attr(img0, "title", "Forking babel");
			attr(a22, "href", "https://github.com/tanhauhau/babel/blob/master/CONTRIBUTING.md#setup");
			attr(a22, "rel", "nofollow");
			attr(pre2, "class", "language-sh");
			attr(pre3, "class", "language-yml");
			attr(a23, "href", "#crash-course-on-parsing-code-to-ast");
			attr(a23, "id", "crash-course-on-parsing-code-to-ast");
			attr(a24, "href", "https://twitter.com/vaidehijoshi");
			attr(a24, "rel", "nofollow");
			attr(a25, "href", "https://medium.com/basecs/leveling-up-ones-parsing-game-with-asts-d7a6fc2400ff");
			attr(a25, "rel", "nofollow");
			attr(a26, "href", "https://www.ecma-international.org/ecma-262/10.0/index.html#Title");
			attr(a26, "rel", "nofollow");
			attr(a27, "href", "https://twitter.com/munificentbob?lang=en");
			attr(a27, "rel", "nofollow");
			attr(a28, "href", "https://craftinginterpreters.com/introduction.html");
			attr(a28, "rel", "nofollow");
			attr(a29, "href", "#our-custom-babel-parser");
			attr(a29, "id", "our-custom-babel-parser");
			attr(pre4, "class", "language-null");
			attr(a30, "href", "https://en.wikipedia.org/wiki/Test-driven_development");
			attr(a30, "rel", "nofollow");
			attr(pre5, "class", "language-js");
			attr(pre6, "class", "language-sh");
			attr(pre7, "class", "language-sh");
			attr(a31, "href", "https://github.com/tanhauhau/babel/blob/feat/curry-function/packages/babel-parser/src/parser/expression.js#L2092");
			attr(a31, "rel", "nofollow");
			attr(pre8, "class", "language-js");
			attr(pre9, "class", "language-js");
			attr(a32, "href", "#thiseat-thismatch-thisnext");
			attr(a33, "href", "#a-new-token");
			attr(a33, "id", "a-new-token");
			attr(a34, "href", "https://github.com/tanhauhau/babel/blob/feat/curry-function/packages/babel-parser/src/tokenizer/types.js#L86");
			attr(a34, "rel", "nofollow");
			attr(pre10, "class", "language-js");
			attr(a35, "href", "https://github.com/tanhauhau/babel/blob/da0af5fd99a9b747370a2240df3abf2940b9649c/packages/babel-parser/src/tokenizer/index.js#L790");
			attr(a35, "rel", "nofollow");
			attr(pre11, "class", "language-js");
			attr(pre12, "class", "language-js");
			set_style(span, "transform", "scaleX(-1)");
			set_style(span, "display", "inline-block");
			attr(a36, "href", "#the-new-parser");
			attr(a36, "id", "the-new-parser");
			attr(a37, "href", "https://lihautan.com/babel-ast-explorer/#?eyJiYWJlbFNldHRpbmdzIjp7InZlcnNpb24iOiI3LjYuMCJ9LCJ0cmVlU2V0dGluZ3MiOnsiaGlkZUVtcHR5Ijp0cnVlLCJoaWRlTG9jYXRpb24iOnRydWUsImhpZGVUeXBlIjp0cnVlfSwiY29kZSI6ImZ1bmN0aW9uICogZm9vKCkge30ifQ==");
			attr(a37, "rel", "nofollow");
			if (img1.src !== (img1_src_value = __build_img__1)) attr(img1, "src", img1_src_value);
			attr(img1, "alt", "AST for generator function");
			attr(img1, "title", "AST for generator function");
			if (img2.src !== (img2_src_value = __build_img__2)) attr(img2, "src", img2_src_value);
			attr(img2, "alt", "AST for curry function");
			attr(img2, "title", "AST for curry function");
			attr(a38, "href", "https://github.com/tanhauhau/babel/blob/da0af5fd99a9b747370a2240df3abf2940b9649c/packages/babel-parser/src/parser/statement.js#L1030");
			attr(a38, "rel", "nofollow");
			attr(pre13, "class", "language-js");
			attr(pre14, "class", "language-sh");
			attr(a39, "href", "#how-parsing-works");
			attr(a39, "id", "how-parsing-works");
			attr(pre15, "class", "language-null");
			attr(pre16, "class", "language-null");
			attr(pre17, "class", "language-null");
			attr(pre18, "class", "language-js");
			attr(a40, "href", "https://craftinginterpreters.com/parsing-expressions.html#recursive-descent-parsing");
			attr(a40, "rel", "nofollow");
			attr(a41, "href", "#this-eat-this-match-this-next");
			attr(a41, "id", "this-eat-this-match-this-next");
			attr(pre19, "class", "language-js");
			attr(a42, "href", "https://craftinginterpreters.com/introduction.html");
			attr(a42, "rel", "nofollow");
			attr(a43, "href", "https://twitter.com/munificentbob?lang=en");
			attr(a43, "rel", "nofollow");
			attr(a44, "href", "https://www.udacity.com/course/compilers-theory-and-practice--ud168");
			attr(a44, "rel", "nofollow");
			if (img3.src !== (img3_src_value = __build_img__3)) attr(img3, "src", img3_src_value);
			attr(img3, "alt", "Uploading custom parser");
			attr(a45, "href", "#our-babel-plugin");
			attr(a45, "id", "our-babel-plugin");
			attr(a46, "href", "https://babeljs.io/docs/en/babel-parser#will-the-babel-parser-support-a-plugin-system");
			attr(a46, "rel", "nofollow");
			attr(pre20, "class", "language-js");
			attr(a47, "href", "https://babeljs.io/docs/en/babel-generator");
			attr(a47, "rel", "nofollow");
			attr(a48, "href", "https://github.com/tanhauhau/babel/blob/da0af5fd99a9b747370a2240df3abf2940b9649c/packages/babel-generator/src/generators/methods.js#L82");
			attr(a48, "rel", "nofollow");
			attr(pre21, "class", "language-js");
			attr(a49, "href", "https://hackernoon.com/currying-in-js-d9ddc64f162e");
			attr(a49, "rel", "nofollow");
			attr(a50, "href", "https://twitter.com/zhirzh");
			attr(a50, "rel", "nofollow");
			attr(pre22, "class", "language-js");
			attr(a51, "href", "https://scotch.io/tutorials/understanding-hoisting-in-javascript");
			attr(a51, "rel", "nofollow");
			attr(a52, "href", "/step-by-step-guide-for-writing-a-babel-transformation");
			attr(pre23, "class", "language-js");
			attr(a53, "href", "#assume-currying-has-been-declared-in-the-global-scope");
			attr(a53, "id", "assume-currying-has-been-declared-in-the-global-scope");
			attr(a54, "href", "https://www.google.com/search?q=regeneratorRuntime+is+not+defined");
			attr(a54, "rel", "nofollow");
			attr(a55, "href", "#use-the-babel-helpers");
			attr(a55, "id", "use-the-babel-helpers");
			attr(pre24, "class", "language-js");
			attr(a56, "href", "https://twitter.com/lihautan");
			attr(a56, "rel", "nofollow");
			attr(a57, "href", "https://github.com/tanhauhau/babel/blob/feat/curry-function/packages/babel-helpers/src/helpers.js");
			attr(a57, "rel", "nofollow");
			attr(pre25, "class", "language-js");
			attr(pre26, "class", "language-js");
			attr(a58, "href", "#closing-note");
			attr(a58, "id", "closing-note");
			attr(a59, "href", "/step-by-step-guide-for-writing-a-babel-transformation");
			attr(a60, "href", "#further-reading");
			attr(a61, "href", "https://github.com/tc39/proposals");
			attr(a61, "rel", "nofollow");
			attr(a62, "href", "https://tc39.es/process-document/");
			attr(a62, "rel", "nofollow");
			attr(a63, "href", "https://github.com/tanhauhau/babel/compare/3a7b6e1c2...b793efad1");
			attr(a63, "rel", "nofollow");
			attr(a64, "href", "#editor-s-note");
			attr(a64, "id", "editor-s-note");
			attr(a65, "href", "https://twitter.com/lihautan");
			attr(a65, "rel", "nofollow");
			attr(a66, "href", "#further-reading");
			attr(a66, "id", "further-reading");
			attr(a67, "href", "https://craftinginterpreters.com/introduction.html");
			attr(a67, "rel", "nofollow");
			attr(a68, "href", "https://twitter.com/munificentbob?lang=en");
			attr(a68, "rel", "nofollow");
			attr(a69, "href", "https://www.udacity.com/course/compilers-theory-and-practice--ud168");
			attr(a69, "rel", "nofollow");
			attr(a70, "href", "https://medium.com/basecs/leveling-up-ones-parsing-game-with-asts-d7a6fc2400ff");
			attr(a70, "rel", "nofollow");
			attr(a71, "href", "https://twitter.com/vaidehijoshi");
			attr(a71, "rel", "nofollow");
			attr(a72, "href", "https://scotch.io/tutorials/understanding-hoisting-in-javascript");
			attr(a72, "rel", "nofollow");
			attr(a73, "href", "https://twitter.com/emabishi");
			attr(a73, "rel", "nofollow");
			attr(a74, "href", "https://hackernoon.com/currying-in-js-d9ddc64f162e");
			attr(a74, "rel", "nofollow");
			attr(a75, "href", "https://twitter.com/zhirzh");
			attr(a75, "rel", "nofollow");
			attr(a76, "href", "https://github.com/tc39/proposals");
			attr(a76, "rel", "nofollow");
			attr(a77, "href", "https://tc39.es/process-document/");
			attr(a77, "rel", "nofollow");
		},
		m(target, anchor) {
			insert(target, section0, anchor);
			append(section0, ul4);
			append(ul4, li0);
			append(li0, a0);
			append(a0, t0);
			append(ul4, li1);
			append(li1, a1);
			append(a1, t1);
			append(ul4, ul0);
			append(ul0, li2);
			append(li2, a2);
			append(a2, t2);
			append(ul4, li3);
			append(li3, a3);
			append(a3, t3);
			append(ul4, ul2);
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
			append(ul4, li8);
			append(li8, a8);
			append(a8, t8);
			append(ul4, ul3);
			append(ul3, li9);
			append(li9, a9);
			append(a9, t9);
			append(ul3, li10);
			append(li10, a10);
			append(a10, t10);
			append(ul4, li11);
			append(li11, a11);
			append(a11, t11);
			append(ul4, li12);
			append(li12, a12);
			append(a12, t12);
			append(ul4, li13);
			append(li13, a13);
			append(a13, t13);
			insert(target, t14, anchor);
			insert(target, p0, anchor);
			append(p0, t15);
			append(p0, a14);
			append(a14, t16);
			append(p0, t17);
			insert(target, t18, anchor);
			insert(target, section1, anchor);
			append(section1, h20);
			append(h20, a15);
			append(a15, t19);
			append(section1, t20);
			append(section1, p1);
			append(p1, t21);
			append(section1, t22);
			append(section1, pre0);
			pre0.innerHTML = raw0_value;
			append(section1, t23);
			append(section1, p2);
			append(p2, t24);
			append(p2, a16);
			append(a16, t25);
			append(p2, t26);
			append(p2, code0);
			append(code0, t27);
			append(p2, t28);
			append(p2, a17);
			append(a17, t29);
			append(p2, t30);
			append(p2, code1);
			append(code1, t31);
			append(p2, t32);
			append(p2, code2);
			append(code2, t33);
			append(p2, t34);
			append(p2, code3);
			append(code3, t35);
			append(p2, t36);
			append(p2, code4);
			append(code4, t37);
			append(p2, t38);
			append(section1, t39);
			append(section1, p3);
			append(p3, t40);
			append(p3, a18);
			append(a18, t41);
			append(p3, t42);
			append(p3, code5);
			append(code5, t43);
			append(p3, t44);
			append(p3, code6);
			append(code6, t45);
			append(p3, t46);
			append(section1, t47);
			append(section1, pre1);
			pre1.innerHTML = raw1_value;
			append(section1, t48);
			append(section1, blockquote0);
			append(blockquote0, p4);
			append(p4, t49);
			append(p4, code7);
			append(code7, t50);
			append(p4, t51);
			append(p4, code8);
			append(code8, t52);
			append(p4, t53);
			append(p4, code9);
			append(code9, t54);
			append(p4, t55);
			append(p4, code10);
			append(code10, t56);
			append(p4, t57);
			append(p4, a19);
			append(a19, t58);
			append(p4, t59);
			append(p4, code11);
			append(code11, t60);
			append(p4, t61);
			append(section1, t62);
			append(section1, p5);
			append(p5, t63);
			append(section1, t64);
			append(section1, ul5);
			append(ul5, li14);
			append(li14, t65);
			append(ul5, t66);
			append(ul5, li15);
			append(li15, t67);
			append(section1, t68);
			append(section1, p6);
			append(p6, t69);
			append(section1, t70);
			append(section1, p7);
			append(p7, t71);
			insert(target, t72, anchor);
			insert(target, section2, anchor);
			append(section2, h21);
			append(h21, a20);
			append(a20, t73);
			append(section2, t74);
			append(section2, p8);
			append(p8, t75);
			append(p8, a21);
			append(a21, t76);
			append(p8, t77);
			append(section2, t78);
			append(section2, p9);
			append(p9, img0);
			append(section2, t79);
			append(section2, p10);
			append(p10, t80);
			append(section2, t81);
			append(section2, p11);
			append(p11, t82);
			append(p11, a22);
			append(a22, t83);
			append(p11, t84);
			append(section2, t85);
			append(section2, pre2);
			pre2.innerHTML = raw2_value;
			append(section2, t86);
			append(section2, p12);
			append(p12, t87);
			append(section2, t88);
			append(section2, p13);
			append(p13, t89);
			append(p13, code12);
			append(code12, t90);
			append(p13, t91);
			append(p13, code13);
			append(code13, t92);
			append(p13, t93);
			append(p13, code14);
			append(code14, t94);
			append(p13, t95);
			append(p13, code15);
			append(code15, t96);
			append(p13, t97);
			append(section2, t98);
			append(section2, pre3);
			pre3.innerHTML = raw3_value;
			append(section2, t99);
			append(section2, blockquote1);
			append(blockquote1, small0);
			append(small0, t100);
			insert(target, t101, anchor);
			insert(target, section3, anchor);
			append(section3, h30);
			append(h30, a23);
			append(a23, t102);
			append(section3, t103);
			append(section3, p14);
			append(p14, t104);
			append(p14, a24);
			append(a24, t105);
			append(p14, t106);
			append(p14, a25);
			append(a25, t107);
			append(p14, t108);
			append(section3, t109);
			append(section3, p15);
			append(p15, t110);
			append(section3, t111);
			append(section3, ul6);
			append(ul6, li16);
			append(li16, t112);
			append(li16, code16);
			append(code16, t113);
			append(li16, t114);
			append(li16, code17);
			append(code17, t115);
			append(ul6, t116);
			append(ul6, li17);
			append(li17, t117);
			append(li17, strong0);
			append(strong0, t118);
			append(li17, t119);
			append(li17, em0);
			append(em0, t120);
			append(li17, t121);
			append(li17, code18);
			append(code18, t122);
			append(ul6, t123);
			append(ul6, li18);
			append(li18, t124);
			append(li18, strong1);
			append(strong1, t125);
			append(li18, t126);
			append(li18, a26);
			append(a26, t127);
			append(li18, t128);
			append(section3, t129);
			append(section3, p16);
			append(p16, t130);
			append(p16, a27);
			append(a27, t131);
			append(p16, t132);
			append(p16, a28);
			append(a28, t133);
			append(p16, t134);
			append(section3, t135);
			append(section3, blockquote2);
			append(blockquote2, small1);
			append(small1, t136);
			insert(target, t137, anchor);
			insert(target, section4, anchor);
			append(section4, h22);
			append(h22, a29);
			append(a29, t138);
			append(section4, t139);
			append(section4, p17);
			append(p17, t140);
			append(p17, code19);
			append(code19, t141);
			append(p17, t142);
			append(section4, t143);
			append(section4, pre4);
			pre4.innerHTML = raw4_value;
			append(section4, t144);
			append(section4, p18);
			append(p18, t145);
			append(p18, em1);
			append(em1, t146);
			append(p18, t147);
			append(p18, em2);
			append(em2, t148);
			append(p18, t149);
			append(p18, code20);
			append(code20, t150);
			append(p18, t151);
			append(p18, code21);
			append(code21, t152);
			append(p18, t153);
			append(p18, code22);
			append(code22, t154);
			append(p18, t155);
			append(section4, t156);
			append(section4, p19);
			append(p19, t157);
			append(p19, a30);
			append(a30, t158);
			append(p19, t159);
			append(section4, t160);
			append(section4, pre5);
			pre5.innerHTML = raw5_value;
			append(section4, t161);
			append(section4, p20);
			append(p20, t162);
			append(p20, code23);
			append(code23, t163);
			append(p20, t164);
			append(p20, code24);
			append(code24, t165);
			append(p20, t166);
			append(section4, t167);
			append(section4, pre6);
			pre6.innerHTML = raw6_value;
			append(section4, t168);
			append(section4, blockquote3);
			append(blockquote3, small2);
			append(small2, t169);
			append(blockquote3, t170);
			append(blockquote3, pre7);
			pre7.innerHTML = raw7_value;
			append(section4, t171);
			append(section4, p21);
			append(p21, t172);
			append(p21, code25);
			append(code25, t173);
			append(p21, t174);
			append(section4, t175);
			append(section4, p22);
			append(p22, t176);
			append(p22, code26);
			append(code26, t177);
			append(p22, t178);
			append(section4, t179);
			append(section4, p23);
			append(p23, t180);
			append(p23, a31);
			append(a31, code27);
			append(code27, t181);
			append(p23, t182);
			append(p23, code28);
			append(code28, t183);
			append(p23, t184);
			append(section4, t185);
			append(section4, p24);
			append(p24, t186);
			append(p24, code29);
			append(code29, t187);
			append(p24, t188);
			append(section4, t189);
			append(section4, pre8);
			pre8.innerHTML = raw8_value;
			append(section4, t190);
			append(section4, p25);
			append(p25, t191);
			append(p25, code30);
			append(code30, t192);
			append(p25, t193);
			append(section4, t194);
			append(section4, pre9);
			pre9.innerHTML = raw9_value;
			append(section4, t195);
			append(section4, p26);
			append(p26, t196);
			append(p26, code31);
			append(code31, t197);
			append(p26, t198);
			append(p26, code32);
			append(code32, t199);
			append(p26, t200);
			append(section4, t201);
			append(section4, p27);
			append(p27, t202);
			append(p27, a32);
			append(a32, t203);
			append(p27, t204);
			append(section4, t205);
			append(section4, p28);
			append(p28, t206);
			append(section4, t207);
			append(section4, ul7);
			append(ul7, li19);
			append(li19, t208);
			append(li19, code33);
			append(code33, t209);
			append(ul7, t210);
			append(ul7, li20);
			append(li20, t211);
			append(li20, code34);
			append(code34, t212);
			append(li20, t213);
			append(ul7, t214);
			append(ul7, li21);
			append(li21, t215);
			append(li21, code35);
			append(code35, t216);
			append(ul7, t217);
			append(ul7, li22);
			append(li22, t218);
			append(li22, code36);
			append(code36, t219);
			append(section4, t220);
			append(section4, p29);
			append(p29, t221);
			append(section4, t222);
			append(section4, p30);
			append(p30, t223);
			append(p30, code37);
			append(code37, t224);
			append(p30, t225);
			append(p30, code38);
			append(code38, t226);
			append(p30, t227);
			insert(target, t228, anchor);
			insert(target, section5, anchor);
			append(section5, h31);
			append(h31, a33);
			append(a33, t229);
			append(section5, t230);
			append(section5, p31);
			append(p31, t231);
			append(p31, a34);
			append(a34, t232);
			append(p31, t233);
			append(section5, t234);
			append(section5, p32);
			append(p32, t235);
			append(section5, t236);
			append(section5, pre10);
			pre10.innerHTML = raw10_value;
			append(section5, t237);
			append(section5, p33);
			append(p33, t238);
			append(p33, em3);
			append(em3, t239);
			append(p33, t240);
			append(p33, code39);
			append(code39, t241);
			append(p33, t242);
			append(p33, code40);
			append(code40, t243);
			append(p33, t244);
			append(p33, a35);
			append(a35, t245);
			append(section5, t246);
			append(section5, blockquote4);
			append(blockquote4, small3);
			append(small3, t247);
			append(section5, t248);
			append(section5, p34);
			append(p34, t249);
			append(p34, code41);
			append(code41, t250);
			append(p34, t251);
			append(p34, code42);
			append(code42, t252);
			append(p34, t253);
			append(p34, code43);
			append(code43, t254);
			append(p34, t255);
			append(p34, code44);
			append(code44, t256);
			append(p34, t257);
			append(section5, t258);
			append(section5, pre11);
			pre11.innerHTML = raw11_value;
			append(section5, t259);
			append(section5, p35);
			append(p35, t260);
			append(section5, t261);
			append(section5, pre12);
			pre12.innerHTML = raw12_value;
			append(section5, t262);
			append(section5, p36);
			append(p36, t263);
			append(p36, span);
			append(span, t264);
			insert(target, t265, anchor);
			insert(target, section6, anchor);
			append(section6, h32);
			append(h32, a36);
			append(a36, t266);
			append(section6, t267);
			append(section6, p37);
			append(p37, t268);
			append(p37, a37);
			append(a37, t269);
			append(p37, t270);
			append(section6, t271);
			append(section6, p38);
			append(p38, img1);
			append(section6, t272);
			append(section6, p39);
			append(p39, t273);
			append(p39, code45);
			append(code45, t274);
			append(p39, t275);
			append(p39, code46);
			append(code46, t276);
			append(p39, t277);
			append(section6, t278);
			append(section6, p40);
			append(p40, t279);
			append(p40, code47);
			append(code47, t280);
			append(p40, t281);
			append(p40, code48);
			append(code48, t282);
			append(p40, t283);
			append(section6, t284);
			append(section6, p41);
			append(p41, img2);
			append(section6, t285);
			append(section6, p42);
			append(p42, t286);
			append(section6, t287);
			append(section6, p43);
			append(p43, t288);
			append(p43, em4);
			append(em4, t289);
			append(p43, t290);
			append(p43, code49);
			append(code49, t291);
			append(p43, t292);
			append(p43, a38);
			append(a38, t293);
			append(p43, t294);
			append(p43, code50);
			append(code50, t295);
			append(p43, t296);
			append(section6, t297);
			append(section6, pre13);
			pre13.innerHTML = raw13_value;
			append(section6, t298);
			append(section6, p44);
			append(p44, t299);
			append(section6, t300);
			append(section6, pre14);
			pre14.innerHTML = raw14_value;
			append(section6, t301);
			append(section6, p45);
			append(p45, t302);
			append(section6, t303);
			append(section6, p46);
			append(p46, t304);
			insert(target, t305, anchor);
			insert(target, section7, anchor);
			append(section7, h33);
			append(h33, a39);
			append(a39, t306);
			append(section7, t307);
			append(section7, p47);
			append(p47, t308);
			append(p47, em5);
			append(em5, t309);
			append(p47, t310);
			append(section7, t311);
			append(section7, p48);
			append(p48, t312);
			append(section7, t313);
			append(section7, pre15);
			pre15.innerHTML = raw15_value;
			append(section7, t314);
			append(section7, p49);
			append(p49, t315);
			append(p49, code51);
			append(code51, t316);
			append(p49, t317);
			append(section7, t318);
			append(section7, ul8);
			append(ul8, li23);
			append(li23, t319);
			append(li23, code52);
			append(code52, t320);
			append(li23, t321);
			append(ul8, t322);
			append(ul8, li24);
			append(li24, t323);
			append(li24, code53);
			append(code53, t324);
			append(li24, t325);
			append(li24, code54);
			append(code54, t326);
			append(li24, t327);
			append(li24, code55);
			append(code55, t328);
			append(li24, t329);
			append(ul8, t330);
			append(ul8, li25);
			append(li25, t331);
			append(li25, code56);
			append(code56, t332);
			append(li25, t333);
			append(li25, code57);
			append(code57, t334);
			append(li25, t335);
			append(li25, code58);
			append(code58, t336);
			append(li25, t337);
			append(section7, t338);
			append(section7, p50);
			append(p50, t339);
			append(p50, code59);
			append(code59, t340);
			append(p50, t341);
			append(section7, t342);
			append(section7, pre16);
			pre16.innerHTML = raw16_value;
			append(section7, t343);
			append(section7, p51);
			append(p51, t344);
			append(section7, t345);
			append(section7, pre17);
			pre17.innerHTML = raw17_value;
			append(section7, t346);
			append(section7, p52);
			append(p52, t347);
			append(section7, t348);
			append(section7, pre18);
			pre18.innerHTML = raw18_value;
			append(section7, t349);
			append(section7, p53);
			append(p53, em6);
			append(em6, t350);
			append(section7, t351);
			append(section7, p54);
			append(p54, t352);
			append(p54, code60);
			append(code60, t353);
			append(p54, t354);
			append(p54, code61);
			append(code61, t355);
			append(p54, t356);
			append(p54, code62);
			append(code62, t357);
			append(p54, t358);
			append(p54, a40);
			append(a40, t359);
			append(p54, t360);
			insert(target, t361, anchor);
			insert(target, section8, anchor);
			append(section8, h4);
			append(h4, a41);
			append(a41, t362);
			append(section8, t363);
			append(section8, p55);
			append(p55, t364);
			append(p55, code63);
			append(code63, t365);
			append(p55, t366);
			append(p55, code64);
			append(code64, t367);
			append(p55, t368);
			append(p55, code65);
			append(code65, t369);
			append(p55, t370);
			append(section8, t371);
			append(section8, ul10);
			append(ul10, li26);
			append(li26, strong2);
			append(strong2, code66);
			append(code66, t372);
			append(li26, t373);
			append(li26, code67);
			append(code67, t374);
			append(li26, t375);
			append(ul10, t376);
			append(ul10, li27);
			append(li27, strong3);
			append(strong3, code68);
			append(code68, t377);
			append(li27, t378);
			append(ul10, t379);
			append(ul10, li29);
			append(li29, strong4);
			append(strong4, code69);
			append(code69, t380);
			append(li29, t381);
			append(li29, code70);
			append(code70, t382);
			append(li29, t383);
			append(li29, code71);
			append(code71, t384);
			append(li29, t385);
			append(li29, code72);
			append(code72, t386);
			append(li29, t387);
			append(li29, code73);
			append(code73, t388);
			append(li29, ul9);
			append(ul9, li28);
			append(li28, code74);
			append(code74, t389);
			append(li28, t390);
			append(li28, code75);
			append(code75, t391);
			append(li28, t392);
			append(li28, code76);
			append(code76, t393);
			append(li28, t394);
			append(li28, code77);
			append(code77, t395);
			append(li28, t396);
			append(ul10, t397);
			append(ul10, li30);
			append(li30, strong5);
			append(strong5, code78);
			append(code78, t398);
			append(li30, t399);
			append(section8, t400);
			append(section8, p56);
			append(p56, t401);
			append(section8, t402);
			append(section8, pre19);
			pre19.innerHTML = raw19_value;
			append(section8, t403);
			append(section8, p57);
			append(p57, t404);
			append(section8, t405);
			append(section8, ul11);
			append(ul11, li31);
			append(li31, a42);
			append(a42, t406);
			append(li31, t407);
			append(li31, a43);
			append(a43, t408);
			append(ul11, t409);
			append(ul11, li32);
			append(li32, a44);
			append(a44, t410);
			append(li32, t411);
			append(section8, t412);
			append(section8, hr0);
			append(section8, t413);
			append(section8, p58);
			append(p58, strong6);
			append(strong6, t414);
			append(p58, t415);
			append(section8, t416);
			append(section8, p59);
			append(p59, t417);
			append(section8, t418);
			append(section8, p60);
			append(p60, t419);
			append(p60, code79);
			append(code79, t420);
			append(p60, t421);
			append(p60, code80);
			append(code80, t422);
			append(p60, t423);
			append(section8, t424);
			append(section8, p61);
			append(p61, img3);
			append(section8, t425);
			append(section8, hr1);
			insert(target, t426, anchor);
			insert(target, section9, anchor);
			append(section9, h23);
			append(h23, a45);
			append(a45, t427);
			append(section9, t428);
			append(section9, p62);
			append(p62, t429);
			append(section9, t430);
			append(section9, p63);
			append(p63, t431);
			append(section9, t432);
			append(section9, p64);
			append(p64, t433);
			append(p64, a46);
			append(a46, t434);
			append(section9, t435);
			append(section9, pre20);
			pre20.innerHTML = raw20_value;
			append(section9, t436);
			append(section9, p65);
			append(p65, t437);
			append(section9, t438);
			append(section9, p66);
			append(p66, t439);
			append(p66, em7);
			append(em7, t440);
			append(section9, t441);
			append(section9, hr2);
			append(section9, t442);
			append(section9, p67);
			append(p67, t443);
			append(section9, t444);
			append(section9, p68);
			append(p68, t445);
			append(p68, a47);
			append(a47, t446);
			append(p68, t447);
			append(p68, code81);
			append(code81, t448);
			append(p68, t449);
			append(p68, code82);
			append(code82, t450);
			append(p68, t451);
			append(section9, t452);
			append(section9, blockquote5);
			append(blockquote5, p69);
			append(p69, t453);
			append(p69, a48);
			append(a48, t454);
			append(p69, t455);
			append(section9, t456);
			append(section9, hr3);
			append(section9, t457);
			append(section9, p70);
			append(p70, t458);
			append(p70, code83);
			append(code83, t459);
			append(p70, t460);
			append(section9, t461);
			append(section9, pre21);
			pre21.innerHTML = raw21_value;
			append(section9, t462);
			append(section9, blockquote6);
			append(blockquote6, p71);
			append(p71, t463);
			append(p71, a49);
			append(a49, t464);
			append(p71, t465);
			append(p71, a50);
			append(a50, t466);
			append(section9, t467);
			append(section9, p72);
			append(p72, t468);
			append(section9, t469);
			append(section9, pre22);
			pre22.innerHTML = raw22_value;
			append(section9, t470);
			append(section9, blockquote7);
			append(blockquote7, p73);
			append(p73, t471);
			append(p73, a51);
			append(a51, t472);
			append(p73, t473);
			append(p73, code84);
			append(code84, t474);
			append(p73, t475);
			append(section9, t476);
			append(section9, p74);
			append(p74, t477);
			append(p74, a52);
			append(a52, t478);
			append(p74, t479);
			append(section9, t480);
			append(section9, pre23);
			pre23.innerHTML = raw23_value;
			append(section9, t481);
			append(section9, p75);
			append(p75, t482);
			append(p75, code85);
			append(code85, t483);
			append(p75, t484);
			append(section9, t485);
			append(section9, p76);
			append(p76, t486);
			insert(target, t487, anchor);
			insert(target, section10, anchor);
			append(section10, h34);
			append(h34, a53);
			append(a53, t488);
			append(a53, code86);
			append(code86, t489);
			append(a53, t490);
			append(section10, t491);
			append(section10, p77);
			append(p77, t492);
			append(section10, t493);
			append(section10, p78);
			append(p78, t494);
			append(p78, code87);
			append(code87, t495);
			append(p78, t496);
			append(p78, em8);
			append(em8, t497);
			append(p78, t498);
			append(p78, a54);
			append(a54, t499);
			append(p78, t500);
			append(section10, t501);
			append(section10, p79);
			append(p79, t502);
			append(p79, code88);
			append(code88, t503);
			append(p79, t504);
			append(p79, code89);
			append(code89, t505);
			append(p79, t506);
			insert(target, t507, anchor);
			insert(target, section11, anchor);
			append(section11, h35);
			append(h35, a55);
			append(a55, t508);
			append(a55, code90);
			append(code90, t509);
			append(section11, t510);
			append(section11, p80);
			append(p80, t511);
			append(p80, code91);
			append(code91, t512);
			append(p80, t513);
			append(p80, code92);
			append(code92, t514);
			append(p80, t515);
			append(p80, code93);
			append(code93, t516);
			append(p80, t517);
			append(p80, code94);
			append(code94, t518);
			append(p80, t519);
			append(section11, t520);
			append(section11, pre24);
			pre24.innerHTML = raw24_value;
			append(section11, t521);
			append(section11, p81);
			append(p81, em9);
			append(em9, strong7);
			append(strong7, t522);
			append(em9, t523);
			append(em9, a56);
			append(a56, t524);
			append(em9, t525);
			append(section11, t526);
			append(section11, p82);
			append(p82, t527);
			append(p82, code95);
			append(code95, t528);
			append(p82, t529);
			append(section11, t530);
			append(section11, p83);
			append(p83, t531);
			append(p83, a57);
			append(a57, t532);
			append(p83, t533);
			append(section11, t534);
			append(section11, pre25);
			pre25.innerHTML = raw25_value;
			append(section11, t535);
			append(section11, p84);
			append(p84, t536);
			append(p84, code96);
			append(code96, t537);
			append(p84, t538);
			append(p84, code97);
			append(code97, t539);
			append(p84, t540);
			append(p84, code98);
			append(code98, t541);
			append(p84, t542);
			append(section11, t543);
			append(section11, p85);
			append(p85, t544);
			append(p85, code99);
			append(code99, t545);
			append(p85, t546);
			append(section11, t547);
			append(section11, pre26);
			pre26.innerHTML = raw26_value;
			append(section11, t548);
			append(section11, p86);
			append(p86, t549);
			append(p86, code100);
			append(code100, t550);
			append(p86, t551);
			append(p86, code101);
			append(code101, t552);
			append(p86, t553);
			insert(target, t554, anchor);
			insert(target, section12, anchor);
			append(section12, h24);
			append(h24, a58);
			append(a58, t555);
			append(section12, t556);
			append(section12, p87);
			append(p87, t557);
			append(p87, em10);
			append(em10, t558);
			append(em10, a59);
			append(a59, t559);
			append(em10, t560);
			append(p87, t561);
			append(p87, code102);
			append(code102, t562);
			append(p87, t563);
			append(p87, code103);
			append(code103, t564);
			append(p87, t565);
			append(section12, t566);
			append(section12, p88);
			append(p88, t567);
			append(p88, a60);
			append(a60, t568);
			append(p88, t569);
			append(section12, t570);
			append(section12, p89);
			append(p89, t571);
			append(p89, a61);
			append(a61, t572);
			append(p89, t573);
			append(p89, a62);
			append(a62, t574);
			append(p89, t575);
			append(section12, t576);
			append(section12, p90);
			append(p90, t577);
			append(p90, a63);
			append(a63, t578);
			append(p90, t579);
			append(section12, t580);
			append(section12, hr4);
			insert(target, t581, anchor);
			insert(target, section13, anchor);
			append(section13, h25);
			append(h25, a64);
			append(a64, t582);
			append(section13, t583);
			append(section13, p91);
			append(p91, t584);
			append(section13, t585);
			append(section13, p92);
			append(p92, t586);
			append(section13, t587);
			append(section13, p93);
			append(p93, t588);
			append(p93, code104);
			append(code104, t589);
			append(p93, t590);
			append(section13, t591);
			append(section13, p94);
			append(p94, t592);
			append(p94, a65);
			append(a65, t593);
			append(p94, t594);
			insert(target, t595, anchor);
			insert(target, section14, anchor);
			append(section14, h26);
			append(h26, a66);
			append(a66, t596);
			append(section14, t597);
			append(section14, p95);
			append(p95, t598);
			append(section14, t599);
			append(section14, ul12);
			append(ul12, li33);
			append(li33, a67);
			append(a67, t600);
			append(li33, t601);
			append(li33, a68);
			append(a68, t602);
			append(ul12, t603);
			append(ul12, li34);
			append(li34, a69);
			append(a69, t604);
			append(li34, t605);
			append(ul12, t606);
			append(ul12, li35);
			append(li35, a70);
			append(a70, t607);
			append(li35, t608);
			append(li35, a71);
			append(a71, t609);
			append(section14, t610);
			append(section14, p96);
			append(p96, t611);
			append(section14, t612);
			append(section14, ul13);
			append(ul13, li36);
			append(li36, a72);
			append(a72, t613);
			append(li36, t614);
			append(li36, a73);
			append(a73, t615);
			append(ul13, t616);
			append(ul13, li37);
			append(li37, a74);
			append(a74, t617);
			append(li37, t618);
			append(li37, a75);
			append(a75, t619);
			append(ul13, t620);
			append(ul13, li38);
			append(li38, a76);
			append(a76, t621);
			append(ul13, t622);
			append(ul13, li39);
			append(li39, a77);
			append(a77, t623);
		},
		p: noop,
		d(detaching) {
			if (detaching) detach(section0);
			if (detaching) detach(t14);
			if (detaching) detach(p0);
			if (detaching) detach(t18);
			if (detaching) detach(section1);
			if (detaching) detach(t72);
			if (detaching) detach(section2);
			if (detaching) detach(t101);
			if (detaching) detach(section3);
			if (detaching) detach(t137);
			if (detaching) detach(section4);
			if (detaching) detach(t228);
			if (detaching) detach(section5);
			if (detaching) detach(t265);
			if (detaching) detach(section6);
			if (detaching) detach(t305);
			if (detaching) detach(section7);
			if (detaching) detach(t361);
			if (detaching) detach(section8);
			if (detaching) detach(t426);
			if (detaching) detach(section9);
			if (detaching) detach(t487);
			if (detaching) detach(section10);
			if (detaching) detach(t507);
			if (detaching) detach(section11);
			if (detaching) detach(t554);
			if (detaching) detach(section12);
			if (detaching) detach(t581);
			if (detaching) detach(section13);
			if (detaching) detach(t595);
			if (detaching) detach(section14);
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
	"title": "Creating custom JavaScript syntax with Babel",
	"date": "2019-09-25T08:00:00Z",
	"description": "Forking babel parser and creating your custom JavaScript syntax isn't as hard as you think.",
	"tags": ["JavaScript", "babel", "ast", "transform"],
	"series": "Intermediate Babel",
	"slug": "creating-custom-javascript-syntax-with-babel",
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
