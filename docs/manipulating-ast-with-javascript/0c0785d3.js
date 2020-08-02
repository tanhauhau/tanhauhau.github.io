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

var __build_img__1 = "25aa4cbe5d6607fb.png";

var __build_img__0 = "b581a0310d989fe0.gif";

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

var image = "https://lihautan.com/manipulating-ast-with-javascript/assets/hero-twitter-b36b194e.jpg";

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
		p: noop,
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
		p: noop,
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
					"@id": "https%3A%2F%2Flihautan.com%2Fmanipulating-ast-with-javascript",
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
			attr(meta11, "content", "https%3A%2F%2Flihautan.com%2Fmanipulating-ast-with-javascript");
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
	const title = "";
	const description = "";
	const tags = [];
	const jsonLdAuthor = { ["@type"]: "Person", name: "Tan Li Hau" };
	let { $$slots = {}, $$scope } = $$props;

	$$self.$set = $$props => {
		if ("$$scope" in $$props) $$invalidate(4, $$scope = $$props.$$scope);
	};

	return [title, description, tags, jsonLdAuthor, $$scope, $$slots];
}

class Blog extends SvelteComponent {
	constructor(options) {
		super();
		init(this, options, instance$2, create_fragment$2, safe_not_equal, { title: 0, description: 1, tags: 2 });
	}

	get title() {
		return this.$$.ctx[0];
	}

	get description() {
		return this.$$.ctx[1];
	}

	get tags() {
		return this.$$.ctx[2];
	}
}

/* content/blog/manipulating-ast-with-javascript/@@page-markup.svelte generated by Svelte v3.24.0 */

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
	let li8;
	let a8;
	let t8;
	let li9;
	let a9;
	let t9;
	let t10;
	let p0;
	let t11;
	let a10;
	let t12;
	let t13;
	let a11;
	let t14;
	let t15;
	let a12;
	let t16;
	let t17;
	let t18;
	let p1;
	let t19;
	let t20;
	let blockquote0;
	let p2;
	let t21;
	let a13;
	let t22;
	let t23;
	let a14;
	let t24;
	let t25;
	let a15;
	let t26;
	let t27;
	let a16;
	let t28;
	let t29;
	let a17;
	let t30;
	let t31;
	let a18;
	let t32;
	let t33;
	let t34;
	let p3;
	let t35;
	let t36;
	let section1;
	let h20;
	let a19;
	let t37;
	let t38;
	let p4;
	let t39;
	let t40;
	let p5;
	let t41;
	let a20;
	let t42;
	let t43;
	let t44;
	let p6;
	let img0;
	let img0_src_value;
	let t45;
	let p7;
	let t46;
	let strong0;
	let t47;
	let t48;
	let a21;
	let t49;
	let t50;
	let a22;
	let t51;
	let t52;
	let a23;
	let t53;
	let t54;
	let t55;
	let p8;
	let img1;
	let img1_src_value;
	let t56;
	let p9;
	let t57;
	let code0;
	let t58;
	let t59;
	let code1;
	let t60;
	let t61;
	let t62;
	let div;
	let table;
	let thead;
	let tr0;
	let th0;
	let t63;
	let t64;
	let th1;
	let t65;
	let t66;
	let th2;
	let code2;
	let t67;
	let t68;
	let th3;
	let code3;
	let t69;
	let t70;
	let tbody;
	let tr1;
	let td0;
	let t71;
	let t72;
	let td1;
	let a24;
	let t73;
	let t74;
	let td2;
	let a25;
	let code4;
	let t75;
	let t76;
	let td3;
	let a26;
	let code5;
	let t77;
	let t78;
	let tr2;
	let td4;
	let t79;
	let t80;
	let td5;
	let a27;
	let t81;
	let t82;
	let td6;
	let a28;
	let code6;
	let t83;
	let t84;
	let td7;
	let a29;
	let code7;
	let t85;
	let t86;
	let tr3;
	let td8;
	let t87;
	let t88;
	let td9;
	let a30;
	let t89;
	let t90;
	let td10;
	let a31;
	let code8;
	let t91;
	let t92;
	let td11;
	let a32;
	let code9;
	let t93;
	let t94;
	let tr4;
	let td12;
	let t95;
	let t96;
	let td13;
	let a33;
	let t97;
	let t98;
	let td14;
	let a34;
	let code10;
	let t99;
	let t100;
	let td15;
	let a35;
	let code11;
	let t101;
	let t102;
	let tr5;
	let td16;
	let t103;
	let t104;
	let td17;
	let a36;
	let t105;
	let t106;
	let td18;
	let a37;
	let code12;
	let t107;
	let t108;
	let td19;
	let a38;
	let code13;
	let t109;
	let t110;
	let tr6;
	let td20;
	let t111;
	let t112;
	let td21;
	let a39;
	let t113;
	let t114;
	let td22;
	let a40;
	let code14;
	let t115;
	let t116;
	let td23;
	let a41;
	let code15;
	let t117;
	let t118;
	let p10;
	let t119;
	let t120;
	let p11;
	let t121;
	let t122;
	let pre0;

	let raw0_value = `<code class="language-js"><span class="token keyword">const</span> code <span class="token operator">=</span> fs<span class="token punctuation">.</span><span class="token function">readFileSync</span><span class="token punctuation">(</span><span class="token string">'/file/to/code'</span><span class="token punctuation">)</span><span class="token punctuation">;</span>
<span class="token keyword">const</span> ast <span class="token operator">=</span> <span class="token function">parserMethod</span><span class="token punctuation">(</span>code<span class="token punctuation">)</span><span class="token punctuation">;</span>

<span class="token comment">// the magical transform function</span>
<span class="token comment">// usually not a pure function</span>
<span class="token function">transform</span><span class="token punctuation">(</span>ast<span class="token punctuation">)</span><span class="token punctuation">;</span>

<span class="token keyword">const</span> output <span class="token operator">=</span> <span class="token function">generatorMethod</span><span class="token punctuation">(</span>ast<span class="token punctuation">)</span><span class="token punctuation">;</span>
fs<span class="token punctuation">.</span><span class="token function">writeFileSync</span><span class="token punctuation">(</span><span class="token string">'/file/to/output'</span><span class="token punctuation">,</span> output<span class="token punctuation">,</span> <span class="token string">'utf8'</span><span class="token punctuation">)</span><span class="token punctuation">;</span></code>` + "";

	let t123;
	let p12;
	let t124;
	let t125;
	let pre1;

	let raw1_value = `<code class="language-js"><span class="token keyword">const</span> lang1 <span class="token operator">=</span> fs<span class="token punctuation">.</span><span class="token function">readFileSync</span><span class="token punctuation">(</span><span class="token string">'/file/to/code'</span><span class="token punctuation">)</span><span class="token punctuation">;</span>
<span class="token keyword">const</span> ast <span class="token operator">=</span> <span class="token function">parserMethodLang1</span><span class="token punctuation">(</span>lang1<span class="token punctuation">)</span><span class="token punctuation">;</span>

<span class="token comment">// the magical transform function</span>
<span class="token comment">// usually not a pure function</span>
<span class="token function">transformLang1ToLang2</span><span class="token punctuation">(</span>ast<span class="token punctuation">)</span><span class="token punctuation">;</span>

<span class="token keyword">const</span> lang2 <span class="token operator">=</span> <span class="token function">generatorMethodLang2</span><span class="token punctuation">(</span>ast<span class="token punctuation">)</span><span class="token punctuation">;</span>
fs<span class="token punctuation">.</span><span class="token function">writeFileSync</span><span class="token punctuation">(</span><span class="token string">'/file/to/output'</span><span class="token punctuation">,</span> lang2<span class="token punctuation">,</span> <span class="token string">'utf8'</span><span class="token punctuation">)</span><span class="token punctuation">;</span></code>` + "";

	let t126;
	let p13;
	let t127;
	let em0;
	let t128;
	let t129;
	let em1;
	let t130;
	let t131;
	let t132;
	let section2;
	let h21;
	let a42;
	let t133;
	let t134;
	let p14;
	let t135;
	let em2;
	let t136;
	let t137;
	let strong1;
	let t138;
	let t139;
	let t140;
	let p15;
	let a43;
	let t141;
	let t142;
	let a44;
	let t143;
	let t144;
	let a45;
	let t145;
	let t146;
	let t147;
	let p16;
	let t148;
	let t149;
	let pre2;

	let raw2_value = `<code class="language-js"><span class="token keyword">function</span> <span class="token function">visit</span><span class="token punctuation">(</span><span class="token parameter">ast</span><span class="token punctuation">)</span> <span class="token punctuation">&#123;</span>
  <span class="token comment">// TODO: do something with this node</span>

  <span class="token keyword">const</span> keys <span class="token operator">=</span> Object<span class="token punctuation">.</span><span class="token function">keys</span><span class="token punctuation">(</span>ast<span class="token punctuation">)</span><span class="token punctuation">;</span>
  <span class="token keyword">for</span> <span class="token punctuation">(</span><span class="token keyword">let</span> i <span class="token operator">=</span> <span class="token number">0</span><span class="token punctuation">;</span> i <span class="token operator">&lt;</span> keys<span class="token punctuation">.</span>length<span class="token punctuation">;</span> i<span class="token operator">++</span><span class="token punctuation">)</span> <span class="token punctuation">&#123;</span>
    <span class="token keyword">const</span> child <span class="token operator">=</span> ast<span class="token punctuation">[</span>key<span class="token punctuation">]</span><span class="token punctuation">;</span>
    <span class="token comment">// could be an array of nodes or just a node</span>
    <span class="token keyword">if</span> <span class="token punctuation">(</span>Array<span class="token punctuation">.</span><span class="token function">isArray</span><span class="token punctuation">(</span>child<span class="token punctuation">)</span><span class="token punctuation">)</span> <span class="token punctuation">&#123;</span>
      <span class="token keyword">for</span> <span class="token punctuation">(</span><span class="token keyword">let</span> j <span class="token operator">=</span> <span class="token number">0</span><span class="token punctuation">;</span> j <span class="token operator">&lt;</span> child<span class="token punctuation">.</span>length<span class="token punctuation">;</span> j<span class="token operator">++</span><span class="token punctuation">)</span> <span class="token punctuation">&#123;</span>
        <span class="token function">visit</span><span class="token punctuation">(</span>child<span class="token punctuation">[</span>j<span class="token punctuation">]</span><span class="token punctuation">)</span><span class="token punctuation">;</span>
      <span class="token punctuation">&#125;</span>
    <span class="token punctuation">&#125;</span> <span class="token keyword">else</span> <span class="token keyword">if</span> <span class="token punctuation">(</span><span class="token function">isNode</span><span class="token punctuation">(</span>child<span class="token punctuation">)</span><span class="token punctuation">)</span> <span class="token punctuation">&#123;</span>
      <span class="token function">visit</span><span class="token punctuation">(</span>child<span class="token punctuation">)</span><span class="token punctuation">;</span>
    <span class="token punctuation">&#125;</span>
  <span class="token punctuation">&#125;</span>
<span class="token punctuation">&#125;</span>

<span class="token keyword">function</span> <span class="token function">isNode</span><span class="token punctuation">(</span><span class="token parameter">node</span><span class="token punctuation">)</span> <span class="token punctuation">&#123;</span>
  <span class="token comment">// probably need more check,</span>
  <span class="token comment">// for example,</span>
  <span class="token comment">// if the node contains certain properties</span>
  <span class="token keyword">return</span> <span class="token keyword">typeof</span> node <span class="token operator">===</span> <span class="token string">'object'</span><span class="token punctuation">;</span>
<span class="token punctuation">&#125;</span></code>` + "";

	let t150;
	let p17;
	let t151;
	let code16;
	let t152;
	let t153;
	let t154;
	let p18;
	let t155;
	let em3;
	let t156;
	let t157;
	let em4;
	let t158;
	let t159;
	let t160;
	let pre3;

	let raw3_value = `<code class="language-js"><span class="token comment">// highlight-next-line</span>
<span class="token keyword">function</span> <span class="token function">visit</span><span class="token punctuation">(</span><span class="token parameter">ast<span class="token punctuation">,</span> callback</span><span class="token punctuation">)</span> <span class="token punctuation">&#123;</span>
  <span class="token comment">// highlight-next-line</span>
  <span class="token function">callback</span><span class="token punctuation">(</span>ast<span class="token punctuation">)</span><span class="token punctuation">;</span>

  <span class="token keyword">const</span> keys <span class="token operator">=</span> Object<span class="token punctuation">.</span><span class="token function">keys</span><span class="token punctuation">(</span>ast<span class="token punctuation">)</span><span class="token punctuation">;</span>
  <span class="token keyword">for</span> <span class="token punctuation">(</span><span class="token keyword">let</span> i <span class="token operator">=</span> <span class="token number">0</span><span class="token punctuation">;</span> i <span class="token operator">&lt;</span> keys<span class="token punctuation">.</span>length<span class="token punctuation">;</span> i<span class="token operator">++</span><span class="token punctuation">)</span> <span class="token punctuation">&#123;</span>
    <span class="token keyword">const</span> child <span class="token operator">=</span> ast<span class="token punctuation">[</span>key<span class="token punctuation">]</span><span class="token punctuation">;</span>
    <span class="token keyword">if</span> <span class="token punctuation">(</span>Array<span class="token punctuation">.</span><span class="token function">isArray</span><span class="token punctuation">(</span>child<span class="token punctuation">)</span><span class="token punctuation">)</span> <span class="token punctuation">&#123;</span>
      <span class="token keyword">for</span> <span class="token punctuation">(</span><span class="token keyword">let</span> j <span class="token operator">=</span> <span class="token number">0</span><span class="token punctuation">;</span> j <span class="token operator">&lt;</span> child<span class="token punctuation">.</span>length<span class="token punctuation">;</span> j<span class="token operator">++</span><span class="token punctuation">)</span> <span class="token punctuation">&#123;</span>
        <span class="token comment">// highlight-next-line</span>
        <span class="token function">visit</span><span class="token punctuation">(</span>child<span class="token punctuation">[</span>j<span class="token punctuation">]</span><span class="token punctuation">,</span> callback<span class="token punctuation">)</span><span class="token punctuation">;</span>
      <span class="token punctuation">&#125;</span>
    <span class="token punctuation">&#125;</span> <span class="token keyword">else</span> <span class="token keyword">if</span> <span class="token punctuation">(</span><span class="token function">isNode</span><span class="token punctuation">(</span>child<span class="token punctuation">)</span><span class="token punctuation">)</span> <span class="token punctuation">&#123;</span>
      <span class="token comment">// highlight-next-line</span>
      <span class="token function">visit</span><span class="token punctuation">(</span>child<span class="token punctuation">,</span> callback<span class="token punctuation">)</span><span class="token punctuation">;</span>
    <span class="token punctuation">&#125;</span>
  <span class="token punctuation">&#125;</span>
<span class="token punctuation">&#125;</span>

<span class="token keyword">function</span> <span class="token function">isNode</span><span class="token punctuation">(</span><span class="token parameter">node</span><span class="token punctuation">)</span> <span class="token punctuation">&#123;</span>
  <span class="token comment">// probably need more check,</span>
  <span class="token comment">// for example,</span>
  <span class="token comment">// if the node contains certain properties</span>
  <span class="token keyword">return</span> <span class="token keyword">typeof</span> node <span class="token operator">===</span> <span class="token string">'object'</span><span class="token punctuation">;</span>
<span class="token punctuation">&#125;</span></code>` + "";

	let t161;
	let p19;
	let t162;
	let code17;
	let t163;
	let t164;
	let t165;
	let pre4;

	let raw4_value = `<code class="language-js"><span class="token function">visit</span><span class="token punctuation">(</span>htmlAst<span class="token punctuation">,</span> <span class="token parameter">htmlAstNode</span> <span class="token operator">=></span> <span class="token punctuation">&#123;</span>
  <span class="token comment">/*...*/</span>
<span class="token punctuation">&#125;</span><span class="token punctuation">)</span><span class="token punctuation">;</span>
<span class="token function">visit</span><span class="token punctuation">(</span>cssAst<span class="token punctuation">,</span> <span class="token parameter">cssAstNode</span> <span class="token operator">=></span> <span class="token punctuation">&#123;</span>
  <span class="token comment">/*...*/</span>
<span class="token punctuation">&#125;</span><span class="token punctuation">)</span><span class="token punctuation">;</span></code>` + "";

	let t166;
	let p20;
	let t167;
	let t168;
	let pre5;

	let raw5_value = `<code class="language-js"><span class="token keyword">function</span> <span class="token function">visit</span><span class="token punctuation">(</span><span class="token parameter">ast<span class="token punctuation">,</span> callback</span><span class="token punctuation">)</span> <span class="token punctuation">&#123;</span>
  <span class="token comment">// highlight-next-line</span>
  <span class="token keyword">function</span> <span class="token function">_visit</span><span class="token punctuation">(</span><span class="token parameter">node<span class="token punctuation">,</span> parent<span class="token punctuation">,</span> key<span class="token punctuation">,</span> index</span><span class="token punctuation">)</span> <span class="token punctuation">&#123;</span>
    <span class="token comment">// highlight-next-line</span>
    <span class="token function">callback</span><span class="token punctuation">(</span>node<span class="token punctuation">,</span> parent<span class="token punctuation">,</span> key<span class="token punctuation">,</span> index<span class="token punctuation">)</span><span class="token punctuation">;</span>

    <span class="token keyword">const</span> keys <span class="token operator">=</span> Object<span class="token punctuation">.</span><span class="token function">keys</span><span class="token punctuation">(</span>node<span class="token punctuation">)</span><span class="token punctuation">;</span>
    <span class="token keyword">for</span> <span class="token punctuation">(</span><span class="token keyword">let</span> i <span class="token operator">=</span> <span class="token number">0</span><span class="token punctuation">;</span> i <span class="token operator">&lt;</span> keys<span class="token punctuation">.</span>length<span class="token punctuation">;</span> i<span class="token operator">++</span><span class="token punctuation">)</span> <span class="token punctuation">&#123;</span>
      <span class="token keyword">const</span> child <span class="token operator">=</span> node<span class="token punctuation">[</span>key<span class="token punctuation">]</span><span class="token punctuation">;</span>
      <span class="token keyword">if</span> <span class="token punctuation">(</span>Array<span class="token punctuation">.</span><span class="token function">isArray</span><span class="token punctuation">(</span>child<span class="token punctuation">)</span><span class="token punctuation">)</span> <span class="token punctuation">&#123;</span>
        <span class="token keyword">for</span> <span class="token punctuation">(</span><span class="token keyword">let</span> j <span class="token operator">=</span> <span class="token number">0</span><span class="token punctuation">;</span> j <span class="token operator">&lt;</span> child<span class="token punctuation">.</span>length<span class="token punctuation">;</span> j<span class="token operator">++</span><span class="token punctuation">)</span> <span class="token punctuation">&#123;</span>
          <span class="token comment">// highlight-next-line</span>
          <span class="token function">_visit</span><span class="token punctuation">(</span>child<span class="token punctuation">[</span>j<span class="token punctuation">]</span><span class="token punctuation">,</span> node<span class="token punctuation">,</span> key<span class="token punctuation">,</span> j<span class="token punctuation">)</span><span class="token punctuation">;</span>
        <span class="token punctuation">&#125;</span>
      <span class="token punctuation">&#125;</span> <span class="token keyword">else</span> <span class="token keyword">if</span> <span class="token punctuation">(</span><span class="token function">isNode</span><span class="token punctuation">(</span>child<span class="token punctuation">)</span><span class="token punctuation">)</span> <span class="token punctuation">&#123;</span>
        <span class="token comment">// highlight-next-line</span>
        <span class="token function">_visit</span><span class="token punctuation">(</span>child<span class="token punctuation">,</span> node<span class="token punctuation">,</span> key<span class="token punctuation">)</span><span class="token punctuation">;</span>
      <span class="token punctuation">&#125;</span>
    <span class="token punctuation">&#125;</span>
  <span class="token punctuation">&#125;</span>
  <span class="token comment">// highlight-next-line</span>
  <span class="token function">_visit</span><span class="token punctuation">(</span>ast<span class="token punctuation">,</span> <span class="token keyword">null</span><span class="token punctuation">)</span><span class="token punctuation">;</span>
<span class="token punctuation">&#125;</span></code>` + "";

	let t169;
	let p21;
	let t170;
	let code18;
	let t171;
	let t172;
	let t173;
	let pre6;

	let raw6_value = `<code class="language-js"><span class="token keyword">function</span> <span class="token function">visit</span><span class="token punctuation">(</span><span class="token parameter">ast<span class="token punctuation">,</span> callback</span><span class="token punctuation">)</span> <span class="token punctuation">&#123;</span>
  <span class="token keyword">function</span> <span class="token function">_visit</span><span class="token punctuation">(</span><span class="token parameter">node<span class="token punctuation">,</span> parent<span class="token punctuation">,</span> key<span class="token punctuation">,</span> index</span><span class="token punctuation">)</span> <span class="token punctuation">&#123;</span>
    <span class="token comment">// highlight-next-line</span>
    <span class="token keyword">if</span> <span class="token punctuation">(</span><span class="token function">someCondition</span><span class="token punctuation">(</span>node<span class="token punctuation">)</span><span class="token punctuation">)</span> <span class="token punctuation">&#123;</span>
      <span class="token function">callback</span><span class="token punctuation">(</span>node<span class="token punctuation">,</span> parent<span class="token punctuation">,</span> key<span class="token punctuation">,</span> index<span class="token punctuation">)</span><span class="token punctuation">;</span>
    <span class="token punctuation">&#125;</span>
    <span class="token operator">...</span></code>` + "";

	let t174;
	let p22;
	let t175;
	let em5;
	let t176;
	let code19;
	let t177;
	let t178;
	let t179;
	let p23;
	let t180;
	let t181;
	let pre7;

	let raw7_value = `<code class="language-js"><span class="token keyword">function</span> <span class="token function">visit</span><span class="token punctuation">(</span><span class="token parameter">ast<span class="token punctuation">,</span> callbackMap</span><span class="token punctuation">)</span> <span class="token punctuation">&#123;</span>
  <span class="token keyword">function</span> <span class="token function">_visit</span><span class="token punctuation">(</span><span class="token parameter">node<span class="token punctuation">,</span> parent<span class="token punctuation">,</span> key<span class="token punctuation">,</span> index</span><span class="token punctuation">)</span> <span class="token punctuation">&#123;</span>
    <span class="token comment">// highlight-start</span>
    <span class="token keyword">const</span> nodeType <span class="token operator">=</span> <span class="token function">getNodeType</span><span class="token punctuation">(</span>node<span class="token punctuation">)</span><span class="token punctuation">;</span>
    <span class="token keyword">if</span> <span class="token punctuation">(</span>nodeType <span class="token keyword">in</span> callbackMap<span class="token punctuation">)</span> <span class="token punctuation">&#123;</span>
      callbackMap<span class="token punctuation">[</span>nodeType<span class="token punctuation">]</span><span class="token punctuation">(</span>node<span class="token punctuation">,</span> parent<span class="token punctuation">,</span> key<span class="token punctuation">,</span> index<span class="token punctuation">)</span><span class="token punctuation">;</span>
    <span class="token punctuation">&#125;</span>
    <span class="token comment">// highlight-end</span>
    <span class="token operator">...</span>
  <span class="token punctuation">&#125;</span>
<span class="token punctuation">&#125;</span>

<span class="token function">visit</span><span class="token punctuation">(</span>ast<span class="token punctuation">,</span> <span class="token punctuation">&#123;</span>
  <span class="token function">Identifier</span><span class="token punctuation">(</span><span class="token parameter">node<span class="token punctuation">,</span> parent<span class="token punctuation">,</span> key<span class="token punctuation">,</span> index</span><span class="token punctuation">)</span> <span class="token punctuation">&#123;</span>
    <span class="token comment">// do something</span>
  <span class="token punctuation">&#125;</span>
<span class="token punctuation">&#125;</span><span class="token punctuation">)</span></code>` + "";

	let t182;
	let p24;
	let t183;
	let em6;
	let t184;
	let t185;
	let t186;
	let p25;
	let t187;
	let t188;
	let section3;
	let h22;
	let a46;
	let t189;
	let t190;
	let p26;
	let t191;
	let t192;
	let ul2;
	let li10;
	let t193;
	let t194;
	let li11;
	let t195;
	let t196;
	let li12;
	let t197;
	let t198;
	let section4;
	let h30;
	let a47;
	let t199;
	let t200;
	let p27;
	let t201;
	let t202;
	let pre8;

	let raw8_value = `<code class="language-js"><span class="token keyword">function</span> <span class="token function">visitCallback</span><span class="token punctuation">(</span><span class="token parameter">node<span class="token punctuation">,</span> parent<span class="token punctuation">,</span> key<span class="token punctuation">,</span> index</span><span class="token punctuation">)</span> <span class="token punctuation">&#123;</span>
  node<span class="token punctuation">.</span>foo <span class="token operator">=</span> <span class="token function">createNewNode</span><span class="token punctuation">(</span><span class="token punctuation">)</span><span class="token punctuation">;</span>
<span class="token punctuation">&#125;</span></code>` + "";

	let t203;
	let p28;
	let t204;
	let t205;
	let pre9;

	let raw9_value = `<code class="language-js"><span class="token keyword">function</span> <span class="token function">visitCallback</span><span class="token punctuation">(</span><span class="token parameter">node<span class="token punctuation">,</span> parent<span class="token punctuation">,</span> key<span class="token punctuation">,</span> index</span><span class="token punctuation">)</span> <span class="token punctuation">&#123;</span>
  node<span class="token punctuation">.</span>foo<span class="token punctuation">.</span><span class="token function">push</span><span class="token punctuation">(</span><span class="token function">createNewNode</span><span class="token punctuation">(</span><span class="token punctuation">)</span><span class="token punctuation">)</span><span class="token punctuation">;</span>
<span class="token punctuation">&#125;</span></code>` + "";

	let t206;
	let p29;
	let t207;
	let t208;
	let pre10;

	let raw10_value = `<code class="language-js"><span class="token keyword">function</span> <span class="token function">visitCallback</span><span class="token punctuation">(</span><span class="token parameter">node<span class="token punctuation">,</span> parent<span class="token punctuation">,</span> key<span class="token punctuation">,</span> index</span><span class="token punctuation">)</span> <span class="token punctuation">&#123;</span>
  <span class="token comment">// add as first sibling</span>
  parent<span class="token punctuation">[</span>key<span class="token punctuation">]</span><span class="token punctuation">.</span><span class="token function">unshift</span><span class="token punctuation">(</span><span class="token function">createNewNode</span><span class="token punctuation">(</span><span class="token punctuation">)</span><span class="token punctuation">)</span><span class="token punctuation">;</span>
  <span class="token comment">// add as last sibling</span>
  parent<span class="token punctuation">[</span>key<span class="token punctuation">]</span><span class="token punctuation">.</span><span class="token function">push</span><span class="token punctuation">(</span><span class="token function">createNewNode</span><span class="token punctuation">(</span><span class="token punctuation">)</span><span class="token punctuation">)</span><span class="token punctuation">;</span>
  <span class="token comment">// add as next sibling</span>
  parent<span class="token punctuation">[</span>key<span class="token punctuation">]</span><span class="token punctuation">.</span><span class="token function">splice</span><span class="token punctuation">(</span>index <span class="token operator">+</span> <span class="token number">1</span><span class="token punctuation">,</span> <span class="token number">0</span><span class="token punctuation">,</span> <span class="token function">createNewNode</span><span class="token punctuation">(</span><span class="token punctuation">)</span><span class="token punctuation">)</span><span class="token punctuation">;</span>
  <span class="token comment">// add as prev sibling</span>
  parent<span class="token punctuation">[</span>key<span class="token punctuation">]</span><span class="token punctuation">.</span><span class="token function">splice</span><span class="token punctuation">(</span>index<span class="token punctuation">,</span> <span class="token number">0</span><span class="token punctuation">,</span> <span class="token function">createNewNode</span><span class="token punctuation">(</span><span class="token punctuation">)</span><span class="token punctuation">)</span><span class="token punctuation">;</span>
<span class="token punctuation">&#125;</span></code>` + "";

	let t209;
	let section5;
	let h31;
	let a48;
	let t210;
	let t211;
	let p30;
	let t212;
	let t213;
	let pre11;

	let raw11_value = `<code class="language-js"><span class="token keyword">function</span> <span class="token function">visitCallback</span><span class="token punctuation">(</span><span class="token parameter">node<span class="token punctuation">,</span> parent<span class="token punctuation">,</span> key<span class="token punctuation">,</span> index</span><span class="token punctuation">)</span> <span class="token punctuation">&#123;</span>
  parent<span class="token punctuation">[</span>key<span class="token punctuation">]</span> <span class="token operator">=</span> <span class="token function">updatedNode</span><span class="token punctuation">(</span><span class="token punctuation">)</span><span class="token punctuation">;</span>
<span class="token punctuation">&#125;</span></code>` + "";

	let t214;
	let p31;
	let t215;
	let t216;
	let pre12;

	let raw12_value = `<code class="language-js"><span class="token keyword">function</span> <span class="token function">visitCallback</span><span class="token punctuation">(</span><span class="token parameter">node<span class="token punctuation">,</span> parent<span class="token punctuation">,</span> key<span class="token punctuation">,</span> index</span><span class="token punctuation">)</span> <span class="token punctuation">&#123;</span>
  parent<span class="token punctuation">[</span>key<span class="token punctuation">]</span><span class="token punctuation">[</span>index<span class="token punctuation">]</span> <span class="token operator">=</span> <span class="token function">updatedNode</span><span class="token punctuation">(</span><span class="token punctuation">)</span><span class="token punctuation">;</span>
<span class="token punctuation">&#125;</span></code>` + "";

	let t217;
	let section6;
	let h32;
	let a49;
	let t218;
	let t219;
	let p32;
	let t220;
	let t221;
	let pre13;

	let raw13_value = `<code class="language-js"><span class="token keyword">function</span> <span class="token function">visitCallback</span><span class="token punctuation">(</span><span class="token parameter">node<span class="token punctuation">,</span> parent<span class="token punctuation">,</span> key<span class="token punctuation">,</span> index</span><span class="token punctuation">)</span> <span class="token punctuation">&#123;</span>
  <span class="token keyword">delete</span> parent<span class="token punctuation">[</span>key<span class="token punctuation">]</span><span class="token punctuation">;</span>
<span class="token punctuation">&#125;</span></code>` + "";

	let t222;
	let p33;
	let t223;
	let t224;
	let pre14;

	let raw14_value = `<code class="language-js"><span class="token keyword">function</span> <span class="token function">visitCallback</span><span class="token punctuation">(</span><span class="token parameter">node<span class="token punctuation">,</span> parent<span class="token punctuation">,</span> key<span class="token punctuation">,</span> index</span><span class="token punctuation">)</span> <span class="token punctuation">&#123;</span>
  parent<span class="token punctuation">[</span>key<span class="token punctuation">]</span><span class="token punctuation">.</span><span class="token function">splice</span><span class="token punctuation">(</span>index<span class="token punctuation">,</span> <span class="token number">1</span><span class="token punctuation">)</span><span class="token punctuation">;</span>
<span class="token punctuation">&#125;</span></code>` + "";

	let t225;
	let blockquote1;
	let p34;
	let t226;
	let strong2;
	let t227;
	let t228;
	let strong3;
	let t229;
	let t230;
	let strong4;
	let t231;
	let t232;
	let t233;
	let p35;
	let t234;
	let strong5;
	let t235;
	let t236;
	let t237;
	let p36;
	let t238;
	let em7;
	let t239;
	let t240;
	let em8;
	let t241;
	let t242;
	let t243;
	let p37;
	let t244;
	let t245;
	let pre15;

	let raw15_value = `<code class="language-js"><span class="token keyword">function</span> <span class="token function">visit</span><span class="token punctuation">(</span><span class="token parameter">ast<span class="token punctuation">,</span> callbackMap</span><span class="token punctuation">)</span> <span class="token punctuation">&#123;</span>
  <span class="token keyword">function</span> <span class="token function">_visit</span><span class="token punctuation">(</span><span class="token parameter">node<span class="token punctuation">,</span> parent<span class="token punctuation">,</span> key<span class="token punctuation">,</span> index</span><span class="token punctuation">)</span> <span class="token punctuation">&#123;</span>
    <span class="token comment">// ...</span>
    <span class="token keyword">if</span> <span class="token punctuation">(</span>Array<span class="token punctuation">.</span><span class="token function">isArray</span><span class="token punctuation">(</span>child<span class="token punctuation">)</span><span class="token punctuation">)</span> <span class="token punctuation">&#123;</span>
      <span class="token keyword">for</span> <span class="token punctuation">(</span><span class="token keyword">let</span> j <span class="token operator">=</span> <span class="token number">0</span><span class="token punctuation">;</span> j <span class="token operator">&lt;</span> child<span class="token punctuation">.</span>length<span class="token punctuation">;</span> j<span class="token operator">++</span><span class="token punctuation">)</span> <span class="token punctuation">&#123;</span>
        <span class="token function">_visit</span><span class="token punctuation">(</span>child<span class="token punctuation">[</span>j<span class="token punctuation">]</span><span class="token punctuation">,</span> node<span class="token punctuation">,</span> key<span class="token punctuation">,</span> j<span class="token punctuation">)</span><span class="token punctuation">;</span>
        <span class="token comment">// highlight-start</span>
        <span class="token keyword">if</span> <span class="token punctuation">(</span><span class="token function">hasRemoved</span><span class="token punctuation">(</span><span class="token punctuation">)</span><span class="token punctuation">)</span> <span class="token punctuation">&#123;</span>
          <span class="token comment">// offset the index</span>
          j<span class="token operator">--</span><span class="token punctuation">;</span>
        <span class="token punctuation">&#125;</span>
        <span class="token comment">// highlight-end</span>
      <span class="token punctuation">&#125;</span>
    <span class="token punctuation">&#125;</span>
    <span class="token comment">// ...</span>
  <span class="token punctuation">&#125;</span>
<span class="token punctuation">&#125;</span></code>` + "";

	let t246;
	let p38;
	let t247;
	let t248;
	let p39;
	let t249;
	let code20;
	let t250;
	let t251;
	let t252;
	let p40;
	let t253;
	let code21;
	let t254;
	let t255;
	let t256;
	let pre16;

	let raw16_value = `<code class="language-js"><span class="token comment">// highlight-start</span>
<span class="token keyword">let</span> _hasRemoved <span class="token operator">=</span> <span class="token boolean">false</span><span class="token punctuation">;</span>
<span class="token keyword">function</span> <span class="token function">remove</span><span class="token punctuation">(</span><span class="token parameter">node<span class="token punctuation">,</span> parent</span><span class="token punctuation">)</span> <span class="token punctuation">&#123;</span>
  _hasRemoved <span class="token operator">=</span> <span class="token boolean">true</span><span class="token punctuation">;</span>
  <span class="token comment">// proceed to remove current node</span>
<span class="token punctuation">&#125;</span>
<span class="token keyword">function</span> <span class="token function">hasRemoved</span><span class="token punctuation">(</span><span class="token punctuation">)</span> <span class="token punctuation">&#123;</span>
  <span class="token keyword">let</span> result <span class="token operator">=</span> _hasRemoved<span class="token punctuation">;</span>
  <span class="token comment">// reset back</span>
  _hasRemoved <span class="token operator">=</span> <span class="token boolean">false</span><span class="token punctuation">;</span>
  <span class="token keyword">return</span> result<span class="token punctuation">;</span>
<span class="token punctuation">&#125;</span>
<span class="token comment">// highlight-end</span>

<span class="token comment">// function _visit(...) &#123; ...</span>
<span class="token keyword">for</span> <span class="token punctuation">(</span><span class="token keyword">let</span> j <span class="token operator">=</span> <span class="token number">0</span><span class="token punctuation">;</span> j <span class="token operator">&lt;</span> child<span class="token punctuation">.</span>length<span class="token punctuation">;</span> j<span class="token operator">++</span><span class="token punctuation">)</span> <span class="token punctuation">&#123;</span>
  <span class="token function">_visit</span><span class="token punctuation">(</span>child<span class="token punctuation">[</span>j<span class="token punctuation">]</span><span class="token punctuation">,</span> node<span class="token punctuation">,</span> key<span class="token punctuation">,</span> j<span class="token punctuation">)</span><span class="token punctuation">;</span>
  <span class="token comment">// highlight-next-line</span>
  <span class="token keyword">if</span> <span class="token punctuation">(</span><span class="token function">hasRemoved</span><span class="token punctuation">(</span><span class="token punctuation">)</span><span class="token punctuation">)</span> <span class="token punctuation">&#123;</span>
    <span class="token comment">// ...</span>
  <span class="token punctuation">&#125;</span>
<span class="token punctuation">&#125;</span>

<span class="token comment">// ...somewhere in your visitCallback</span>
<span class="token keyword">function</span> <span class="token function">visitCallback</span><span class="token punctuation">(</span><span class="token parameter">node<span class="token punctuation">,</span> parent<span class="token punctuation">,</span> key<span class="token punctuation">,</span> index</span><span class="token punctuation">)</span> <span class="token punctuation">&#123;</span>
  <span class="token comment">// highlight-next-line</span>
  <span class="token function">remove</span><span class="token punctuation">(</span>node<span class="token punctuation">,</span> parent<span class="token punctuation">)</span><span class="token punctuation">;</span>
<span class="token punctuation">&#125;</span></code>` + "";

	let t257;
	let p41;
	let t258;
	let code22;
	let t259;
	let t260;
	let code23;
	let t261;
	let t262;
	let code24;
	let t263;
	let t264;
	let code25;
	let t265;
	let t266;
	let t267;
	let pre17;

	let raw17_value = `<code class="language-js"><span class="token keyword">function</span> <span class="token function">visit</span><span class="token punctuation">(</span><span class="token parameter">ast<span class="token punctuation">,</span> callbackMap</span><span class="token punctuation">)</span> <span class="token punctuation">&#123;</span>
  <span class="token keyword">function</span> <span class="token function">_visit</span><span class="token punctuation">(</span><span class="token parameter">node<span class="token punctuation">,</span> parent<span class="token punctuation">,</span> key<span class="token punctuation">,</span> index</span><span class="token punctuation">)</span> <span class="token punctuation">&#123;</span>
    <span class="token comment">// highlight-start</span>
    <span class="token keyword">let</span> _hasRemoved <span class="token operator">=</span> <span class="token boolean">false</span><span class="token punctuation">;</span>
    <span class="token keyword">const</span> _this <span class="token operator">=</span> <span class="token punctuation">&#123;</span>
      <span class="token comment">// don't need to take in &#96;node&#96; and &#96;parent&#96;,</span>
      <span class="token comment">// because it know exactly what they are</span>
      <span class="token function">remove</span><span class="token punctuation">(</span><span class="token punctuation">)</span> <span class="token punctuation">&#123;</span>
        _hasRemoved <span class="token operator">=</span> <span class="token boolean">true</span><span class="token punctuation">;</span>
        <span class="token comment">// proceed to remove current node</span>
      <span class="token punctuation">&#125;</span><span class="token punctuation">,</span>
    <span class="token punctuation">&#125;</span><span class="token punctuation">;</span>
    <span class="token comment">// highlight-end</span>

    <span class="token comment">// ...</span>
    <span class="token keyword">if</span> <span class="token punctuation">(</span>nodeType <span class="token keyword">in</span> callbackMap<span class="token punctuation">)</span> <span class="token punctuation">&#123;</span>
      <span class="token comment">// highlight-next-line</span>
      callbackMap<span class="token punctuation">[</span>nodeType<span class="token punctuation">]</span><span class="token punctuation">.</span><span class="token function">call</span><span class="token punctuation">(</span>_this<span class="token punctuation">,</span> node<span class="token punctuation">,</span> parent<span class="token punctuation">,</span> key<span class="token punctuation">,</span> index<span class="token punctuation">)</span><span class="token punctuation">;</span>
    <span class="token punctuation">&#125;</span>
  <span class="token punctuation">&#125;</span>
<span class="token punctuation">&#125;</span>

<span class="token comment">// ...somewhere in your visitCallback</span>
<span class="token keyword">function</span> <span class="token function">visitCallback</span><span class="token punctuation">(</span><span class="token parameter">node<span class="token punctuation">,</span> parent<span class="token punctuation">,</span> key<span class="token punctuation">,</span> index</span><span class="token punctuation">)</span> <span class="token punctuation">&#123;</span>
  <span class="token comment">// highlight-next-line</span>
  <span class="token keyword">this</span><span class="token punctuation">.</span><span class="token function">remove</span><span class="token punctuation">(</span><span class="token punctuation">)</span><span class="token punctuation">;</span>
<span class="token punctuation">&#125;</span></code>` + "";

	let t268;
	let p42;
	let t269;
	let t270;
	let p43;
	let t271;
	let a50;
	let t272;
	let t273;
	let a51;
	let t274;
	let t275;
	let a52;
	let t276;
	let t277;
	let t278;
	let p44;
	let t279;
	let t280;
	let ul3;
	let li13;
	let strong6;
	let t281;
	let t282;
	let t283;
	let li14;
	let strong7;
	let t284;
	let t285;
	let t286;
	let p45;
	let t287;
	let t288;
	let section7;
	let h23;
	let a53;
	let t289;
	let t290;
	let p46;
	let t291;
	let code26;
	let t292;
	let t293;
	let t294;
	let p47;
	let t295;
	let code27;
	let t296;
	let t297;
	let code28;
	let t298;
	let t299;
	let code29;
	let t300;
	let t301;
	let code30;
	let t302;
	let t303;
	let a54;
	let t304;
	let t305;
	let t306;
	let pre18;

	let raw18_value = `<code class="language-html"><span class="token tag"><span class="token tag"><span class="token punctuation">&lt;</span>figure</span><span class="token punctuation">></span></span>
  <span class="token tag"><span class="token tag"><span class="token punctuation">&lt;</span>img</span> <span class="token attr-name">class</span><span class="token attr-value"><span class="token punctuation">=</span><span class="token punctuation">"</span>foo<span class="token punctuation">"</span></span> <span class="token punctuation">/></span></span>
  <span class="token tag"><span class="token tag"><span class="token punctuation">&lt;</span>figcaption</span><span class="token punctuation">></span></span>lorem ipsum<span class="token tag"><span class="token tag"><span class="token punctuation">&lt;/</span>figcaption</span><span class="token punctuation">></span></span>
<span class="token tag"><span class="token tag"><span class="token punctuation">&lt;/</span>figure</span><span class="token punctuation">></span></span></code>` + "";

	let t307;
	let p48;
	let t308;
	let t309;
	let pre19;

	let raw19_value = `<code class="language-js"><span class="token keyword">function</span> <span class="token function">visit</span><span class="token punctuation">(</span><span class="token parameter">node</span><span class="token punctuation">)</span> <span class="token punctuation">&#123;</span>
  <span class="token keyword">if</span> <span class="token punctuation">(</span>
    <span class="token comment">/* 1. is node &lt;figure> */</span>
    node<span class="token punctuation">.</span>type <span class="token operator">===</span> <span class="token string">'tag'</span> <span class="token operator">&amp;&amp;</span>
    node<span class="token punctuation">.</span>name <span class="token operator">===</span> <span class="token string">'figure'</span> <span class="token operator">&amp;&amp;</span>
    <span class="token comment">/* 2. is node contain class &#96;foo&#96; */</span>
    node<span class="token punctuation">.</span>attribs<span class="token punctuation">.</span>class <span class="token operator">===</span> <span class="token string">'foo'</span> <span class="token operator">&amp;&amp;</span>
    <span class="token comment">/* 3. is node children contain &lt;img> */</span>
    node<span class="token punctuation">.</span>children<span class="token punctuation">.</span><span class="token function">find</span><span class="token punctuation">(</span>
      <span class="token parameter">child</span> <span class="token operator">=></span> child<span class="token punctuation">.</span>type <span class="token operator">===</span> <span class="token string">'tag'</span> <span class="token operator">&amp;&amp;</span> child<span class="token punctuation">.</span>name <span class="token operator">===</span> <span class="token string">'img'</span>
    <span class="token punctuation">)</span> <span class="token operator">!==</span> <span class="token keyword">undefined</span> <span class="token operator">&amp;&amp;</span>
    <span class="token comment">/* 4. is node children contain &lt;figcaption> */</span>
    node<span class="token punctuation">.</span>children<span class="token punctuation">.</span><span class="token function">find</span><span class="token punctuation">(</span>
      <span class="token parameter">child</span> <span class="token operator">=></span> child<span class="token punctuation">.</span>type <span class="token operator">===</span> <span class="token string">'tag'</span> <span class="token operator">&amp;&amp;</span> child<span class="token punctuation">.</span>name <span class="token operator">===</span> <span class="token string">'figcaption'</span>
    <span class="token punctuation">)</span> <span class="token operator">!==</span> <span class="token keyword">undefined</span>
  <span class="token punctuation">)</span> <span class="token punctuation">&#123;</span>
    <span class="token comment">// do something</span>
  <span class="token punctuation">&#125;</span>
<span class="token punctuation">&#125;</span></code>` + "";

	let t310;
	let p49;
	let t311;
	let t312;
	let pre20;

	let raw20_value = `<code class="language-js"><span class="token keyword">function</span> <span class="token function">isTag</span><span class="token punctuation">(</span><span class="token parameter">node<span class="token punctuation">,</span> name</span><span class="token punctuation">)</span> <span class="token punctuation">&#123;</span>
  <span class="token keyword">return</span> node<span class="token punctuation">.</span>type <span class="token operator">===</span> <span class="token string">'tag'</span> <span class="token operator">&amp;&amp;</span> node<span class="token punctuation">.</span>name <span class="token operator">===</span> name<span class="token punctuation">;</span>
<span class="token punctuation">&#125;</span>
<span class="token keyword">function</span> <span class="token function">hasAttr</span><span class="token punctuation">(</span><span class="token parameter">node<span class="token punctuation">,</span> key<span class="token punctuation">,</span> value</span><span class="token punctuation">)</span> <span class="token punctuation">&#123;</span>
  <span class="token keyword">return</span> node<span class="token punctuation">.</span>attribs<span class="token punctuation">[</span>key<span class="token punctuation">]</span> <span class="token operator">===</span> value<span class="token punctuation">;</span>
<span class="token punctuation">&#125;</span>
<span class="token keyword">function</span> <span class="token function">hasChild</span><span class="token punctuation">(</span><span class="token parameter">node<span class="token punctuation">,</span> fn</span><span class="token punctuation">)</span> <span class="token punctuation">&#123;</span>
  <span class="token keyword">return</span> node<span class="token punctuation">.</span>children<span class="token punctuation">.</span><span class="token function">find</span><span class="token punctuation">(</span>fn<span class="token punctuation">)</span> <span class="token operator">!==</span> <span class="token keyword">undefined</span><span class="token punctuation">;</span>
<span class="token punctuation">&#125;</span>
<span class="token keyword">function</span> <span class="token function">visit</span><span class="token punctuation">(</span><span class="token parameter">node</span><span class="token punctuation">)</span> <span class="token punctuation">&#123;</span>
  <span class="token keyword">if</span> <span class="token punctuation">(</span>
    <span class="token comment">/* 1. is node &lt;figure> */</span>
    <span class="token comment">// highlight-next-line</span>
    <span class="token function">isTag</span><span class="token punctuation">(</span>node<span class="token punctuation">,</span> <span class="token string">'figure'</span><span class="token punctuation">)</span> <span class="token operator">&amp;&amp;</span>
    <span class="token comment">/* 2. is node contain class &#96;foo&#96; */</span>
    <span class="token comment">// highlight-next-line</span>
    <span class="token function">hasAttr</span><span class="token punctuation">(</span>node<span class="token punctuation">,</span> <span class="token string">'class'</span><span class="token punctuation">,</span> <span class="token string">'foo'</span><span class="token punctuation">)</span> <span class="token operator">&amp;&amp;</span>
    <span class="token comment">/* 3. is node children contain &lt;img> */</span>
    <span class="token comment">// highlight-next-line</span>
    <span class="token function">hasChild</span><span class="token punctuation">(</span><span class="token parameter">child</span> <span class="token operator">=></span> <span class="token function">isTag</span><span class="token punctuation">(</span>child<span class="token punctuation">,</span> <span class="token string">'img'</span><span class="token punctuation">)</span><span class="token punctuation">)</span> <span class="token operator">&amp;&amp;</span>
    <span class="token comment">/* 4. is node children contain &lt;figcaption> */</span>
    <span class="token comment">// highlight-next-line</span>
    <span class="token function">hasChild</span><span class="token punctuation">(</span><span class="token parameter">child</span> <span class="token operator">=></span> <span class="token function">isTag</span><span class="token punctuation">(</span>child<span class="token punctuation">,</span> <span class="token string">'figcaption'</span><span class="token punctuation">)</span><span class="token punctuation">)</span>
  <span class="token punctuation">)</span> <span class="token punctuation">&#123;</span>
    <span class="token comment">// do something</span>
  <span class="token punctuation">&#125;</span>
<span class="token punctuation">&#125;</span></code>` + "";

	let t313;
	let section8;
	let h24;
	let a55;
	let t314;
	let t315;
	let p50;
	let t316;
	let t317;
	let p51;
	let t318;
	let strong8;
	let t319;
	let t320;
	let t321;
	let pre21;

	let raw21_value = `<code class="language-js"><span class="token keyword">const</span> newNode <span class="token operator">=</span> <span class="token punctuation">&#123;</span>
  type<span class="token punctuation">:</span> <span class="token string">'Identifier'</span><span class="token punctuation">,</span>
  name<span class="token punctuation">:</span> <span class="token string">'foo'</span><span class="token punctuation">,</span>
<span class="token punctuation">&#125;</span><span class="token punctuation">;</span></code>` + "";

	let t322;
	let p52;
	let t323;
	let a56;
	let t324;
	let t325;
	let t326;
	let pre22;

	let raw22_value = `<code class="language-js"><span class="token keyword">const</span> newNode <span class="token operator">=</span> t<span class="token punctuation">.</span><span class="token function">identifier</span><span class="token punctuation">(</span><span class="token string">'foo'</span><span class="token punctuation">)</span><span class="token punctuation">;</span>

<span class="token keyword">const</span> newNode2 <span class="token operator">=</span> t<span class="token punctuation">.</span><span class="token function">functionDeclaration</span><span class="token punctuation">(</span>
  <span class="token string">'bar'</span><span class="token punctuation">,</span>
  <span class="token punctuation">[</span>t<span class="token punctuation">.</span><span class="token function">identifier</span><span class="token punctuation">(</span><span class="token string">'foo'</span><span class="token punctuation">)</span><span class="token punctuation">]</span><span class="token punctuation">,</span>
  <span class="token punctuation">[</span>
    t<span class="token punctuation">.</span><span class="token function">expressionStatement</span><span class="token punctuation">(</span>
      t<span class="token punctuation">.</span><span class="token function">callExpression</span><span class="token punctuation">(</span>
        t<span class="token punctuation">.</span><span class="token function">memberExpression</span><span class="token punctuation">(</span>t<span class="token punctuation">.</span><span class="token function">identifier</span><span class="token punctuation">(</span><span class="token string">'console'</span><span class="token punctuation">)</span><span class="token punctuation">,</span> t<span class="token punctuation">.</span><span class="token function">identifier</span><span class="token punctuation">(</span><span class="token string">'log'</span><span class="token punctuation">)</span><span class="token punctuation">,</span> <span class="token boolean">false</span><span class="token punctuation">)</span><span class="token punctuation">,</span>
        <span class="token punctuation">[</span>t<span class="token punctuation">.</span><span class="token function">identifier</span><span class="token punctuation">(</span><span class="token string">'foo'</span><span class="token punctuation">)</span><span class="token punctuation">]</span>
      <span class="token punctuation">)</span>
    <span class="token punctuation">)</span><span class="token punctuation">,</span>
    t<span class="token punctuation">.</span><span class="token function">returnStatement</span><span class="token punctuation">(</span>t<span class="token punctuation">.</span><span class="token function">identifier</span><span class="token punctuation">(</span><span class="token string">'foo'</span><span class="token punctuation">)</span><span class="token punctuation">)</span><span class="token punctuation">,</span>
  <span class="token punctuation">]</span>
<span class="token punctuation">)</span><span class="token punctuation">;</span></code>` + "";

	let t327;
	let p53;
	let t328;
	let t329;
	let p54;
	let t330;
	let code31;
	let t331;
	let t332;
	let code32;
	let t333;
	let t334;
	let t335;
	let pre23;

	let raw23_value = `<code class="language-js"><span class="token keyword">const</span> newNode2 <span class="token operator">=</span> babelParser<span class="token punctuation">.</span><span class="token function">parse</span><span class="token punctuation">(</span><span class="token template-string"><span class="token template-punctuation string">&#96;</span><span class="token string">
  function bar(foo) &#123;
    console.log(foo);
    return foo;
  &#125;
</span><span class="token template-punctuation string">&#96;</span></span><span class="token punctuation">)</span><span class="token punctuation">.</span>program<span class="token punctuation">.</span>body<span class="token punctuation">[</span><span class="token number">0</span><span class="token punctuation">]</span><span class="token punctuation">;</span>

<span class="token keyword">const</span> newNode3 <span class="token operator">=</span> cssTree<span class="token punctuation">.</span><span class="token function">parse</span><span class="token punctuation">(</span>
  <span class="token template-string"><span class="token template-punctuation string">&#96;</span><span class="token string">
  .foo &#123;
    color: red;
  &#125;
</span><span class="token template-punctuation string">&#96;</span></span><span class="token punctuation">,</span>
  <span class="token punctuation">&#123;</span> context<span class="token punctuation">:</span> <span class="token string">'rule'</span> <span class="token punctuation">&#125;</span>
<span class="token punctuation">)</span><span class="token punctuation">;</span></code>` + "";

	let t336;
	let p55;
	let t337;
	let a57;
	let t338;
	let t339;
	let a58;
	let t340;
	let t341;
	let t342;
	let pre24;

	let raw24_value = `<code class="language-js"><span class="token keyword">const</span> newNode4 <span class="token operator">=</span> template<span class="token punctuation">.</span>statement<span class="token template-string"><span class="token template-punctuation string">&#96;</span><span class="token string">
  console.log(foo);
</span><span class="token template-punctuation string">&#96;</span></span><span class="token punctuation">;</span>

<span class="token comment">// placeholder can be an AST node or string</span>
<span class="token keyword">const</span> newNode5 <span class="token operator">=</span> template<span class="token punctuation">.</span>statement<span class="token template-string"><span class="token template-punctuation string">&#96;</span><span class="token string">
  function bar(foo) &#123;
    </span><span class="token interpolation"><span class="token interpolation-punctuation punctuation">$&#123;</span>newNode4<span class="token interpolation-punctuation punctuation">&#125;</span></span><span class="token string">
    alert("</span><span class="token interpolation"><span class="token interpolation-punctuation punctuation">$&#123;</span><span class="token string">'hello world'</span><span class="token interpolation-punctuation punctuation">&#125;</span></span><span class="token string">")
    return foo;
  &#125;
</span><span class="token template-punctuation string">&#96;</span></span><span class="token punctuation">;</span></code>` + "";

	let t343;
	let section9;
	let h25;
	let a59;
	let t344;
	let t345;
	let p56;
	let t346;
	let t347;
	let ul4;
	let li15;
	let t348;
	let t349;
	let li16;
	let t350;
	let t351;
	let li17;
	let t352;
	let t353;
	let li18;
	let t354;
	let t355;
	let section10;
	let h26;
	let a60;
	let t356;
	let t357;
	let p57;
	let a61;
	let t358;
	let t359;
	let a62;
	let t360;
	let t361;
	let t362;
	let ul5;
	let li19;
	let a63;
	let t363;
	let t364;
	let li20;
	let a64;
	let t365;
	let t366;
	let li21;
	let a65;
	let t367;
	let t368;
	let li22;
	let a66;
	let t369;
	let t370;
	let li23;
	let a67;
	let t371;
	let t372;
	let li24;
	let a68;
	let t373;

	return {
		c() {
			section0 = element("section");
			ul1 = element("ul");
			li0 = element("li");
			a0 = element("a");
			t0 = text("The parsers");
			li1 = element("li");
			a1 = element("a");
			t1 = text("Traversing an AST");
			li2 = element("li");
			a2 = element("a");
			t2 = text("Manipulating AST");
			ul0 = element("ul");
			li3 = element("li");
			a3 = element("a");
			t3 = text("Adding a node");
			li4 = element("li");
			a4 = element("a");
			t4 = text("Replacing a node");
			li5 = element("li");
			a5 = element("a");
			t5 = text("Removing a node");
			li6 = element("li");
			a6 = element("a");
			t6 = text("Targeting a node");
			li7 = element("li");
			a7 = element("a");
			t7 = text("Creating a node");
			li8 = element("li");
			a8 = element("a");
			t8 = text("Summary");
			li9 = element("li");
			a9 = element("a");
			t9 = text("Further Readings");
			t10 = space();
			p0 = element("p");
			t11 = text("Previously, I've talked about ");
			a10 = element("a");
			t12 = text("how to write a babel transformation");
			t13 = text(", and I went one step deeper into ");
			a11 = element("a");
			t14 = text("Babel");
			t15 = text(", by ");
			a12 = element("a");
			t16 = text("showing how you can create a custom JavaScript syntax");
			t17 = text(", I demonstrated how Babel parses your code into AST, transforms it and generates back into code.");
			t18 = space();
			p1 = element("p");
			t19 = text("Armed with the knowledge and experience of playing the JavaScript AST with Babel, let's take a look at how we can generalize this knowledge into other languages as well.");
			t20 = space();
			blockquote0 = element("blockquote");
			p2 = element("p");
			t21 = text("When I refer to \"other languages\", I am actually referring to popular frontend languages, for example: ");
			a13 = element("a");
			t22 = text("JavaScript");
			t23 = text(", ");
			a14 = element("a");
			t24 = text("TypeScript");
			t25 = text(", ");
			a15 = element("a");
			t26 = text("Sass");
			t27 = text(", ");
			a16 = element("a");
			t28 = text("CSS");
			t29 = text(", ");
			a17 = element("a");
			t30 = text("HTML");
			t31 = text(", ");
			a18 = element("a");
			t32 = text("markdown");
			t33 = text("...");
			t34 = space();
			p3 = element("p");
			t35 = text("Of course, it does not limit to just frontend languages. It's just that it's easier to find a parser for these languages written in JavaScript than other languages, say C++ or Java.");
			t36 = space();
			section1 = element("section");
			h20 = element("h2");
			a19 = element("a");
			t37 = text("The parsers");
			t38 = space();
			p4 = element("p");
			t39 = text("Like how we use Babel to do parsing and generating JavaScript, there are other libraries out there to help us with parsing and generating our language.");
			t40 = space();
			p5 = element("p");
			t41 = text("One easy trick to find these libraries is through ");
			a20 = element("a");
			t42 = text("https://astexplorer.net/");
			t43 = text(".");
			t44 = space();
			p6 = element("p");
			img0 = element("img");
			t45 = space();
			p7 = element("p");
			t46 = text("After you choose a language, you would see a list of parsers you can use to parse your language. For example, if you choose ");
			strong0 = element("strong");
			t47 = text("HTML");
			t48 = text(", there's ");
			a21 = element("a");
			t49 = text("htmlparser2");
			t50 = text(", ");
			a22 = element("a");
			t51 = text("hyntax");
			t52 = text(", ");
			a23 = element("a");
			t53 = text("parse5");
			t54 = text("... And when you choose one of the parsers, you can immediately see how the AST looks like on the right panel and the Github link to the parser on the top right.");
			t55 = space();
			p8 = element("p");
			img1 = element("img");
			t56 = space();
			p9 = element("p");
			t57 = text("Here is a un-exhaustive list of parsers, and it's ");
			code0 = element("code");
			t58 = text("parse");
			t59 = text(" and ");
			code1 = element("code");
			t60 = text("generate");
			t61 = text(" methods:");
			t62 = space();
			div = element("div");
			table = element("table");
			thead = element("thead");
			tr0 = element("tr");
			th0 = element("th");
			t63 = text("Language");
			t64 = space();
			th1 = element("th");
			t65 = text("Parser");
			t66 = space();
			th2 = element("th");
			code2 = element("code");
			t67 = text("parse");
			t68 = space();
			th3 = element("th");
			code3 = element("code");
			t69 = text("generate");
			t70 = space();
			tbody = element("tbody");
			tr1 = element("tr");
			td0 = element("td");
			t71 = text("HTML");
			t72 = space();
			td1 = element("td");
			a24 = element("a");
			t73 = text("parse5");
			t74 = space();
			td2 = element("td");
			a25 = element("a");
			code4 = element("code");
			t75 = text("parse5.parse(str)");
			t76 = space();
			td3 = element("td");
			a26 = element("a");
			code5 = element("code");
			t77 = text("parse5.serialize(ast)");
			t78 = space();
			tr2 = element("tr");
			td4 = element("td");
			t79 = text("Markdown");
			t80 = space();
			td5 = element("td");
			a27 = element("a");
			t81 = text("remark");
			t82 = space();
			td6 = element("td");
			a28 = element("a");
			code6 = element("code");
			t83 = text("unified().use(remarkParse)");
			t84 = space();
			td7 = element("td");
			a29 = element("a");
			code7 = element("code");
			t85 = text("unified().use(remarkStringify)");
			t86 = space();
			tr3 = element("tr");
			td8 = element("td");
			t87 = text("CSS");
			t88 = space();
			td9 = element("td");
			a30 = element("a");
			t89 = text("css-tree");
			t90 = space();
			td10 = element("td");
			a31 = element("a");
			code8 = element("code");
			t91 = text("csstree.parse(str)");
			t92 = space();
			td11 = element("td");
			a32 = element("a");
			code9 = element("code");
			t93 = text("csstree.generate(ast)");
			t94 = space();
			tr4 = element("tr");
			td12 = element("td");
			t95 = text("Sass");
			t96 = space();
			td13 = element("td");
			a33 = element("a");
			t97 = text("sast");
			t98 = space();
			td14 = element("td");
			a34 = element("a");
			code10 = element("code");
			t99 = text("sast.parse(str)");
			t100 = space();
			td15 = element("td");
			a35 = element("a");
			code11 = element("code");
			t101 = text("sast.stringify(ast)");
			t102 = space();
			tr5 = element("tr");
			td16 = element("td");
			t103 = text("JavaScript");
			t104 = space();
			td17 = element("td");
			a36 = element("a");
			t105 = text("babel");
			t106 = space();
			td18 = element("td");
			a37 = element("a");
			code12 = element("code");
			t107 = text("babel.parse(str)");
			t108 = space();
			td19 = element("td");
			a38 = element("a");
			code13 = element("code");
			t109 = text("babel.generate(ast)");
			t110 = space();
			tr6 = element("tr");
			td20 = element("td");
			t111 = text("TypeScript");
			t112 = space();
			td21 = element("td");
			a39 = element("a");
			t113 = text("TypeScript");
			t114 = space();
			td22 = element("td");
			a40 = element("a");
			code14 = element("code");
			t115 = text("ts.createSourceFile(str)");
			t116 = space();
			td23 = element("td");
			a41 = element("a");
			code15 = element("code");
			t117 = text("ts.createPrinter().printFile(ast)");
			t118 = space();
			p10 = element("p");
			t119 = text("As you can see most parsers provide both parsing and generating methods.");
			t120 = space();
			p11 = element("p");
			t121 = text("So in general, you can have the following as a template to write your code transformation code:");
			t122 = space();
			pre0 = element("pre");
			t123 = space();
			p12 = element("p");
			t124 = text("You can, of course, transforming AST of one language to AST of another language, for example: Sass ➡️ CSS, Markdown ➡️ HTML, and use the generator of another language to generate out the code.");
			t125 = space();
			pre1 = element("pre");
			t126 = space();
			p13 = element("p");
			t127 = text("Now armed with this template, let's talk about the more ");
			em0 = element("em");
			t128 = text("magical");
			t129 = text(" stuff, ");
			em1 = element("em");
			t130 = text("the transform function");
			t131 = text(".");
			t132 = space();
			section2 = element("section");
			h21 = element("h2");
			a42 = element("a");
			t133 = text("Traversing an AST");
			t134 = space();
			p14 = element("p");
			t135 = text("As the name AST suggests, AST uses a tree data structure. To hone the skills of manipulating AST, we need to recall our long distant memory of ");
			em2 = element("em");
			t136 = text("\"Algorithm 101\"");
			t137 = text(", the ");
			strong1 = element("strong");
			t138 = text("depth-first search (DFS)");
			t139 = text(" tree traversal algorithm.");
			t140 = space();
			p15 = element("p");
			a43 = element("a");
			t141 = text("Vaidehi Joshi");
			t142 = text(" wrote an amazing article on ");
			a44 = element("a");
			t143 = text("demystifying Depth-First Search");
			t144 = text(", I don't think I can explain any better, so if you want to recap on depth-first search, please go and read ");
			a45 = element("a");
			t145 = text("her article");
			t146 = text(" before we continue.");
			t147 = space();
			p16 = element("p");
			t148 = text("Now you have a clearer idea of how depth-first search works, a depth-first search on an AST would look something like this:");
			t149 = space();
			pre2 = element("pre");
			t150 = space();
			p17 = element("p");
			t151 = text("We can then fill up the ");
			code16 = element("code");
			t152 = text("TODO");
			t153 = text(" with our manipulation code.");
			t154 = space();
			p18 = element("p");
			t155 = text("If we find ourselves needing to do multiple traversals, with different AST manipulation, we would soon realize that mixing AST manipulation code with the traversal code is ");
			em3 = element("em");
			t156 = text("not clean enough");
			t157 = text(". Naturally, you would realize ");
			em4 = element("em");
			t158 = text("it is cleaner");
			t159 = text(" to pass in a callback function that gets called every time we visit a node:");
			t160 = space();
			pre3 = element("pre");
			t161 = space();
			p19 = element("p");
			t162 = text("The ");
			code17 = element("code");
			t163 = text("visit");
			t164 = text(" function is now generic enough that you can use it for any AST:");
			t165 = space();
			pre4 = element("pre");
			t166 = space();
			p20 = element("p");
			t167 = text("Naturally, you would think that having the information of the parent node, and the key / index of the current node would be useful to have in the callback function:");
			t168 = space();
			pre5 = element("pre");
			t169 = space();
			p21 = element("p");
			t170 = text("Now, we might think to ourselves, I dont want to get callback for every node visited, I just need callback for a certain node. You might be tempted to add a condition in the ");
			code18 = element("code");
			t171 = text("visit");
			t172 = text(" function:");
			t173 = space();
			pre6 = element("pre");
			t174 = space();
			p22 = element("p");
			t175 = text("But you think twice: ");
			em5 = element("em");
			t176 = text("what if someone else wants to use ");
			code19 = element("code");
			t177 = text("visit");
			t178 = text(" but with a different condition for callback?");
			t179 = space();
			p23 = element("p");
			t180 = text("For most of the time, you want to callback only to a certain types of node. In that case, instead of passing in a callback function, you can pass in a map of node type to their respective callback functions:");
			t181 = space();
			pre7 = element("pre");
			t182 = space();
			p24 = element("p");
			t183 = text("At this point, you maybe realize, ");
			em6 = element("em");
			t184 = text("hey, this looks so much like one of those AST traversing libraries!");
			t185 = text(" And yes, this is how they get implemented.");
			t186 = space();
			p25 = element("p");
			t187 = text("Now we can traverse the AST, and find the node that we are interested in, so the next step is to manipulate them.");
			t188 = space();
			section3 = element("section");
			h22 = element("h2");
			a46 = element("a");
			t189 = text("Manipulating AST");
			t190 = space();
			p26 = element("p");
			t191 = text("Manipulating the AST can be categorized into 3 different operations:");
			t192 = space();
			ul2 = element("ul");
			li10 = element("li");
			t193 = text("Adding a node");
			t194 = space();
			li11 = element("li");
			t195 = text("Replacing a node");
			t196 = space();
			li12 = element("li");
			t197 = text("Removing a node");
			t198 = space();
			section4 = element("section");
			h30 = element("h3");
			a47 = element("a");
			t199 = text("Adding a node");
			t200 = space();
			p27 = element("p");
			t201 = text("To add a node, you can assign it to a keyed property of your node:");
			t202 = space();
			pre8 = element("pre");
			t203 = space();
			p28 = element("p");
			t204 = text("or push the new node, if the keyed property is an array:");
			t205 = space();
			pre9 = element("pre");
			t206 = space();
			p29 = element("p");
			t207 = text("To add a node as a sibling, you may need to access the node's parent:");
			t208 = space();
			pre10 = element("pre");
			t209 = space();
			section5 = element("section");
			h31 = element("h3");
			a48 = element("a");
			t210 = text("Replacing a node");
			t211 = space();
			p30 = element("p");
			t212 = text("To replace the current node to another node, update the key property of the current node's parent:");
			t213 = space();
			pre11 = element("pre");
			t214 = space();
			p31 = element("p");
			t215 = text("If the key property of the parent is an array:");
			t216 = space();
			pre12 = element("pre");
			t217 = space();
			section6 = element("section");
			h32 = element("h3");
			a49 = element("a");
			t218 = text("Removing a node");
			t219 = space();
			p32 = element("p");
			t220 = text("To remove the current node, delete the key property of the current node's parent:");
			t221 = space();
			pre13 = element("pre");
			t222 = space();
			p33 = element("p");
			t223 = text("If the key property of the parent is an array:");
			t224 = space();
			pre14 = element("pre");
			t225 = space();
			blockquote1 = element("blockquote");
			p34 = element("p");
			t226 = text("The operations of ");
			strong2 = element("strong");
			t227 = text("adding");
			t228 = text(", ");
			strong3 = element("strong");
			t229 = text("replacing");
			t230 = text(", and ");
			strong4 = element("strong");
			t231 = text("removing");
			t232 = text(" nodes are so common that, they are usually implemented as a util function.");
			t233 = space();
			p35 = element("p");
			t234 = text("However, there's ");
			strong5 = element("strong");
			t235 = text("one important step");
			t236 = text(" that I did not cover: after you mutate the node, you need to make sure that the traversal still works fine.");
			t237 = space();
			p36 = element("p");
			t238 = text("For a node that is a property of a key of its parent, adding, replacing and removing them are usually fine. Except for the replace operation, you might need to revisit the ");
			em7 = element("em");
			t239 = text("\"current node\"");
			t240 = text(", which is the ");
			em8 = element("em");
			t241 = text("new replacing node");
			t242 = text(".");
			t243 = space();
			p37 = element("p");
			t244 = text("However, for node that are in an array, you need to take special care to update the array index of the loop:");
			t245 = space();
			pre15 = element("pre");
			t246 = space();
			p38 = element("p");
			t247 = text("But how do you know that the current node was removed?");
			t248 = space();
			p39 = element("p");
			t249 = text("Well, knowing when a node got removed is sometimes a secret that lies within the ");
			code20 = element("code");
			t250 = text("remove");
			t251 = text(" util function from the tree traversal library.");
			t252 = space();
			p40 = element("p");
			t253 = text("It could be as simple as setting a flag when you call ");
			code21 = element("code");
			t254 = text("remove");
			t255 = text(":");
			t256 = space();
			pre16 = element("pre");
			t257 = space();
			p41 = element("p");
			t258 = text("But sometimes, instead of having to import the ");
			code22 = element("code");
			t259 = text("remove");
			t260 = text(" util from the tree traversal library, the ");
			code23 = element("code");
			t261 = text("remove");
			t262 = text(" function is available in ");
			code24 = element("code");
			t263 = text("this");
			t264 = text(" of the ");
			code25 = element("code");
			t265 = text("visitCallback");
			t266 = text(":");
			t267 = space();
			pre17 = element("pre");
			t268 = space();
			p42 = element("p");
			t269 = text("Now you learned the 3 basic operations of manipulating the AST, you maybe wonder how exactly is to use these basic operations to write a codemod or an AST transform plugin?");
			t270 = space();
			p43 = element("p");
			t271 = text("Well, in my ");
			a50 = element("a");
			t272 = text("step-by-step guide");
			t273 = text(", I've explained that, you can use AST explorer like ");
			a51 = element("a");
			t274 = text("http://astexplorer.net/");
			t275 = text(" or ");
			a52 = element("a");
			t276 = text("Babel AST Explorer");
			t277 = text(" to help you.");
			t278 = space();
			p44 = element("p");
			t279 = text("You need to:");
			t280 = space();
			ul3 = element("ul");
			li13 = element("li");
			strong6 = element("strong");
			t281 = text("Know how the part of the code you want to change look like in the AST");
			t282 = text(", so you can target the specific type of the node, and");
			t283 = space();
			li14 = element("li");
			strong7 = element("strong");
			t284 = text("Know how does the final output you wish to see look like in the AST");
			t285 = text(", so you know what nodes to create, update or remove.");
			t286 = space();
			p45 = element("p");
			t287 = text("So we are going to elaborate more on these 2 steps specifically.");
			t288 = space();
			section7 = element("section");
			h23 = element("h2");
			a53 = element("a");
			t289 = text("Targeting a node");
			t290 = space();
			p46 = element("p");
			t291 = text("Node targeting, most of the times, is just a lot of ");
			code26 = element("code");
			t292 = text("===");
			t293 = text(".");
			t294 = space();
			p47 = element("p");
			t295 = text("For example, if you want to target a ");
			code27 = element("code");
			t296 = text("<figure>");
			t297 = text(" with a class ");
			code28 = element("code");
			t298 = text("foo");
			t299 = text(" that contains an ");
			code29 = element("code");
			t300 = text("<img>");
			t301 = text(" and a ");
			code30 = element("code");
			t302 = text("<figcaption>");
			t303 = text(" in ");
			a54 = element("a");
			t304 = text("htmlparser2");
			t305 = text(":");
			t306 = space();
			pre18 = element("pre");
			t307 = space();
			p48 = element("p");
			t308 = text("You need to check:");
			t309 = space();
			pre19 = element("pre");
			t310 = space();
			p49 = element("p");
			t311 = text("To make it less verbose, we can refactor each check into reusable functions:");
			t312 = space();
			pre20 = element("pre");
			t313 = space();
			section8 = element("section");
			h24 = element("h2");
			a55 = element("a");
			t314 = text("Creating a node");
			t315 = space();
			p50 = element("p");
			t316 = text("There are a few ways you can create an AST node.");
			t317 = space();
			p51 = element("p");
			t318 = text("The simplest and crudest way is to ");
			strong8 = element("strong");
			t319 = text("manually create the node object");
			t320 = text(". Most of the time, the node object is a JavaScript object. So you can just create them manually:");
			t321 = space();
			pre21 = element("pre");
			t322 = space();
			p52 = element("p");
			t323 = text("It may become unwieldy when creating large, complex AST nodes, so sometimes library decides to provide builder functions, like ");
			a56 = element("a");
			t324 = text("@babel/types");
			t325 = text(" to simplify node creation and provide default values:");
			t326 = space();
			pre22 = element("pre");
			t327 = space();
			p53 = element("p");
			t328 = text("It looked more concise and tidier, but it is hard to comprehend and grasp what node it is creating.");
			t329 = space();
			p54 = element("p");
			t330 = text("So, a better way of creating complex AST node, is to use the ");
			code31 = element("code");
			t331 = text("parse");
			t332 = text(" function + ");
			code32 = element("code");
			t333 = text("string");
			t334 = text(":");
			t335 = space();
			pre23 = element("pre");
			t336 = space();
			p55 = element("p");
			t337 = text("For Babel, there's an amazing util called ");
			a57 = element("a");
			t338 = text("@babel/template");
			t339 = text(", where you can use ");
			a58 = element("a");
			t340 = text("template literals");
			t341 = text(" to create AST node:");
			t342 = space();
			pre24 = element("pre");
			t343 = space();
			section9 = element("section");
			h25 = element("h2");
			a59 = element("a");
			t344 = text("Summary");
			t345 = space();
			p56 = element("p");
			t346 = text("We've gone through:");
			t347 = space();
			ul4 = element("ul");
			li15 = element("li");
			t348 = text("How to traverse an AST, using depth-first search algorithm,");
			t349 = space();
			li16 = element("li");
			t350 = text("The 3 basic AST manipulations, addition, replacement, and removal,");
			t351 = space();
			li17 = element("li");
			t352 = text("How to target a node in AST, and");
			t353 = space();
			li18 = element("li");
			t354 = text("How to create an AST node");
			t355 = space();
			section10 = element("section");
			h26 = element("h2");
			a60 = element("a");
			t356 = text("Further Readings");
			t357 = space();
			p57 = element("p");
			a61 = element("a");
			t358 = text("Dinesh (@flexdinesh)");
			t359 = space();
			a62 = element("a");
			t360 = text("tweeted");
			t361 = text(" his pocket collection of AST resources:");
			t362 = space();
			ul5 = element("ul");
			li19 = element("li");
			a63 = element("a");
			t363 = text("Code Transformation and Linting with ASTs");
			t364 = space();
			li20 = element("li");
			a64 = element("a");
			t365 = text("Write your own code transform for fun and profit");
			t366 = space();
			li21 = element("li");
			a65 = element("a");
			t367 = text("Understanding ASTs by Building Your Own Babel Plugin");
			t368 = space();
			li22 = element("li");
			a66 = element("a");
			t369 = text("Writing your first Babel Plugin");
			t370 = space();
			li23 = element("li");
			a67 = element("a");
			t371 = text("This is how I build Babel plug-ins");
			t372 = space();
			li24 = element("li");
			a68 = element("a");
			t373 = text("Writing My First Babel Plugin");
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
			t0 = claim_text(a0_nodes, "The parsers");
			a0_nodes.forEach(detach);
			li0_nodes.forEach(detach);
			li1 = claim_element(ul1_nodes, "LI", {});
			var li1_nodes = children(li1);
			a1 = claim_element(li1_nodes, "A", { href: true });
			var a1_nodes = children(a1);
			t1 = claim_text(a1_nodes, "Traversing an AST");
			a1_nodes.forEach(detach);
			li1_nodes.forEach(detach);
			li2 = claim_element(ul1_nodes, "LI", {});
			var li2_nodes = children(li2);
			a2 = claim_element(li2_nodes, "A", { href: true });
			var a2_nodes = children(a2);
			t2 = claim_text(a2_nodes, "Manipulating AST");
			a2_nodes.forEach(detach);
			li2_nodes.forEach(detach);
			ul0 = claim_element(ul1_nodes, "UL", {});
			var ul0_nodes = children(ul0);
			li3 = claim_element(ul0_nodes, "LI", {});
			var li3_nodes = children(li3);
			a3 = claim_element(li3_nodes, "A", { href: true });
			var a3_nodes = children(a3);
			t3 = claim_text(a3_nodes, "Adding a node");
			a3_nodes.forEach(detach);
			li3_nodes.forEach(detach);
			li4 = claim_element(ul0_nodes, "LI", {});
			var li4_nodes = children(li4);
			a4 = claim_element(li4_nodes, "A", { href: true });
			var a4_nodes = children(a4);
			t4 = claim_text(a4_nodes, "Replacing a node");
			a4_nodes.forEach(detach);
			li4_nodes.forEach(detach);
			li5 = claim_element(ul0_nodes, "LI", {});
			var li5_nodes = children(li5);
			a5 = claim_element(li5_nodes, "A", { href: true });
			var a5_nodes = children(a5);
			t5 = claim_text(a5_nodes, "Removing a node");
			a5_nodes.forEach(detach);
			li5_nodes.forEach(detach);
			ul0_nodes.forEach(detach);
			li6 = claim_element(ul1_nodes, "LI", {});
			var li6_nodes = children(li6);
			a6 = claim_element(li6_nodes, "A", { href: true });
			var a6_nodes = children(a6);
			t6 = claim_text(a6_nodes, "Targeting a node");
			a6_nodes.forEach(detach);
			li6_nodes.forEach(detach);
			li7 = claim_element(ul1_nodes, "LI", {});
			var li7_nodes = children(li7);
			a7 = claim_element(li7_nodes, "A", { href: true });
			var a7_nodes = children(a7);
			t7 = claim_text(a7_nodes, "Creating a node");
			a7_nodes.forEach(detach);
			li7_nodes.forEach(detach);
			li8 = claim_element(ul1_nodes, "LI", {});
			var li8_nodes = children(li8);
			a8 = claim_element(li8_nodes, "A", { href: true });
			var a8_nodes = children(a8);
			t8 = claim_text(a8_nodes, "Summary");
			a8_nodes.forEach(detach);
			li8_nodes.forEach(detach);
			li9 = claim_element(ul1_nodes, "LI", {});
			var li9_nodes = children(li9);
			a9 = claim_element(li9_nodes, "A", { href: true });
			var a9_nodes = children(a9);
			t9 = claim_text(a9_nodes, "Further Readings");
			a9_nodes.forEach(detach);
			li9_nodes.forEach(detach);
			ul1_nodes.forEach(detach);
			section0_nodes.forEach(detach);
			t10 = claim_space(nodes);
			p0 = claim_element(nodes, "P", {});
			var p0_nodes = children(p0);
			t11 = claim_text(p0_nodes, "Previously, I've talked about ");
			a10 = claim_element(p0_nodes, "A", { href: true });
			var a10_nodes = children(a10);
			t12 = claim_text(a10_nodes, "how to write a babel transformation");
			a10_nodes.forEach(detach);
			t13 = claim_text(p0_nodes, ", and I went one step deeper into ");
			a11 = claim_element(p0_nodes, "A", { href: true, rel: true });
			var a11_nodes = children(a11);
			t14 = claim_text(a11_nodes, "Babel");
			a11_nodes.forEach(detach);
			t15 = claim_text(p0_nodes, ", by ");
			a12 = claim_element(p0_nodes, "A", { href: true });
			var a12_nodes = children(a12);
			t16 = claim_text(a12_nodes, "showing how you can create a custom JavaScript syntax");
			a12_nodes.forEach(detach);
			t17 = claim_text(p0_nodes, ", I demonstrated how Babel parses your code into AST, transforms it and generates back into code.");
			p0_nodes.forEach(detach);
			t18 = claim_space(nodes);
			p1 = claim_element(nodes, "P", {});
			var p1_nodes = children(p1);
			t19 = claim_text(p1_nodes, "Armed with the knowledge and experience of playing the JavaScript AST with Babel, let's take a look at how we can generalize this knowledge into other languages as well.");
			p1_nodes.forEach(detach);
			t20 = claim_space(nodes);
			blockquote0 = claim_element(nodes, "BLOCKQUOTE", {});
			var blockquote0_nodes = children(blockquote0);
			p2 = claim_element(blockquote0_nodes, "P", {});
			var p2_nodes = children(p2);
			t21 = claim_text(p2_nodes, "When I refer to \"other languages\", I am actually referring to popular frontend languages, for example: ");
			a13 = claim_element(p2_nodes, "A", { href: true, rel: true });
			var a13_nodes = children(a13);
			t22 = claim_text(a13_nodes, "JavaScript");
			a13_nodes.forEach(detach);
			t23 = claim_text(p2_nodes, ", ");
			a14 = claim_element(p2_nodes, "A", { href: true, rel: true });
			var a14_nodes = children(a14);
			t24 = claim_text(a14_nodes, "TypeScript");
			a14_nodes.forEach(detach);
			t25 = claim_text(p2_nodes, ", ");
			a15 = claim_element(p2_nodes, "A", { href: true, rel: true });
			var a15_nodes = children(a15);
			t26 = claim_text(a15_nodes, "Sass");
			a15_nodes.forEach(detach);
			t27 = claim_text(p2_nodes, ", ");
			a16 = claim_element(p2_nodes, "A", { href: true, rel: true });
			var a16_nodes = children(a16);
			t28 = claim_text(a16_nodes, "CSS");
			a16_nodes.forEach(detach);
			t29 = claim_text(p2_nodes, ", ");
			a17 = claim_element(p2_nodes, "A", { href: true, rel: true });
			var a17_nodes = children(a17);
			t30 = claim_text(a17_nodes, "HTML");
			a17_nodes.forEach(detach);
			t31 = claim_text(p2_nodes, ", ");
			a18 = claim_element(p2_nodes, "A", { href: true, rel: true });
			var a18_nodes = children(a18);
			t32 = claim_text(a18_nodes, "markdown");
			a18_nodes.forEach(detach);
			t33 = claim_text(p2_nodes, "...");
			p2_nodes.forEach(detach);
			t34 = claim_space(blockquote0_nodes);
			p3 = claim_element(blockquote0_nodes, "P", {});
			var p3_nodes = children(p3);
			t35 = claim_text(p3_nodes, "Of course, it does not limit to just frontend languages. It's just that it's easier to find a parser for these languages written in JavaScript than other languages, say C++ or Java.");
			p3_nodes.forEach(detach);
			blockquote0_nodes.forEach(detach);
			t36 = claim_space(nodes);
			section1 = claim_element(nodes, "SECTION", {});
			var section1_nodes = children(section1);
			h20 = claim_element(section1_nodes, "H2", {});
			var h20_nodes = children(h20);
			a19 = claim_element(h20_nodes, "A", { href: true, id: true });
			var a19_nodes = children(a19);
			t37 = claim_text(a19_nodes, "The parsers");
			a19_nodes.forEach(detach);
			h20_nodes.forEach(detach);
			t38 = claim_space(section1_nodes);
			p4 = claim_element(section1_nodes, "P", {});
			var p4_nodes = children(p4);
			t39 = claim_text(p4_nodes, "Like how we use Babel to do parsing and generating JavaScript, there are other libraries out there to help us with parsing and generating our language.");
			p4_nodes.forEach(detach);
			t40 = claim_space(section1_nodes);
			p5 = claim_element(section1_nodes, "P", {});
			var p5_nodes = children(p5);
			t41 = claim_text(p5_nodes, "One easy trick to find these libraries is through ");
			a20 = claim_element(p5_nodes, "A", { href: true, rel: true });
			var a20_nodes = children(a20);
			t42 = claim_text(a20_nodes, "https://astexplorer.net/");
			a20_nodes.forEach(detach);
			t43 = claim_text(p5_nodes, ".");
			p5_nodes.forEach(detach);
			t44 = claim_space(section1_nodes);
			p6 = claim_element(section1_nodes, "P", {});
			var p6_nodes = children(p6);
			img0 = claim_element(p6_nodes, "IMG", { src: true, alt: true });
			p6_nodes.forEach(detach);
			t45 = claim_space(section1_nodes);
			p7 = claim_element(section1_nodes, "P", {});
			var p7_nodes = children(p7);
			t46 = claim_text(p7_nodes, "After you choose a language, you would see a list of parsers you can use to parse your language. For example, if you choose ");
			strong0 = claim_element(p7_nodes, "STRONG", {});
			var strong0_nodes = children(strong0);
			t47 = claim_text(strong0_nodes, "HTML");
			strong0_nodes.forEach(detach);
			t48 = claim_text(p7_nodes, ", there's ");
			a21 = claim_element(p7_nodes, "A", { href: true, rel: true });
			var a21_nodes = children(a21);
			t49 = claim_text(a21_nodes, "htmlparser2");
			a21_nodes.forEach(detach);
			t50 = claim_text(p7_nodes, ", ");
			a22 = claim_element(p7_nodes, "A", { href: true, rel: true });
			var a22_nodes = children(a22);
			t51 = claim_text(a22_nodes, "hyntax");
			a22_nodes.forEach(detach);
			t52 = claim_text(p7_nodes, ", ");
			a23 = claim_element(p7_nodes, "A", { href: true, rel: true });
			var a23_nodes = children(a23);
			t53 = claim_text(a23_nodes, "parse5");
			a23_nodes.forEach(detach);
			t54 = claim_text(p7_nodes, "... And when you choose one of the parsers, you can immediately see how the AST looks like on the right panel and the Github link to the parser on the top right.");
			p7_nodes.forEach(detach);
			t55 = claim_space(section1_nodes);
			p8 = claim_element(section1_nodes, "P", {});
			var p8_nodes = children(p8);
			img1 = claim_element(p8_nodes, "IMG", { src: true, alt: true });
			p8_nodes.forEach(detach);
			t56 = claim_space(section1_nodes);
			p9 = claim_element(section1_nodes, "P", {});
			var p9_nodes = children(p9);
			t57 = claim_text(p9_nodes, "Here is a un-exhaustive list of parsers, and it's ");
			code0 = claim_element(p9_nodes, "CODE", {});
			var code0_nodes = children(code0);
			t58 = claim_text(code0_nodes, "parse");
			code0_nodes.forEach(detach);
			t59 = claim_text(p9_nodes, " and ");
			code1 = claim_element(p9_nodes, "CODE", {});
			var code1_nodes = children(code1);
			t60 = claim_text(code1_nodes, "generate");
			code1_nodes.forEach(detach);
			t61 = claim_text(p9_nodes, " methods:");
			p9_nodes.forEach(detach);
			t62 = claim_space(section1_nodes);
			div = claim_element(section1_nodes, "DIV", { style: true });
			var div_nodes = children(div);
			table = claim_element(div_nodes, "TABLE", {});
			var table_nodes = children(table);
			thead = claim_element(table_nodes, "THEAD", {});
			var thead_nodes = children(thead);
			tr0 = claim_element(thead_nodes, "TR", {});
			var tr0_nodes = children(tr0);
			th0 = claim_element(tr0_nodes, "TH", {});
			var th0_nodes = children(th0);
			t63 = claim_text(th0_nodes, "Language");
			th0_nodes.forEach(detach);
			t64 = claim_space(tr0_nodes);
			th1 = claim_element(tr0_nodes, "TH", {});
			var th1_nodes = children(th1);
			t65 = claim_text(th1_nodes, "Parser");
			th1_nodes.forEach(detach);
			t66 = claim_space(tr0_nodes);
			th2 = claim_element(tr0_nodes, "TH", {});
			var th2_nodes = children(th2);
			code2 = claim_element(th2_nodes, "CODE", { class: true });
			var code2_nodes = children(code2);
			t67 = claim_text(code2_nodes, "parse");
			code2_nodes.forEach(detach);
			th2_nodes.forEach(detach);
			t68 = claim_space(tr0_nodes);
			th3 = claim_element(tr0_nodes, "TH", {});
			var th3_nodes = children(th3);
			code3 = claim_element(th3_nodes, "CODE", { class: true });
			var code3_nodes = children(code3);
			t69 = claim_text(code3_nodes, "generate");
			code3_nodes.forEach(detach);
			th3_nodes.forEach(detach);
			tr0_nodes.forEach(detach);
			thead_nodes.forEach(detach);
			t70 = claim_space(table_nodes);
			tbody = claim_element(table_nodes, "TBODY", {});
			var tbody_nodes = children(tbody);
			tr1 = claim_element(tbody_nodes, "TR", {});
			var tr1_nodes = children(tr1);
			td0 = claim_element(tr1_nodes, "TD", {});
			var td0_nodes = children(td0);
			t71 = claim_text(td0_nodes, "HTML");
			td0_nodes.forEach(detach);
			t72 = claim_space(tr1_nodes);
			td1 = claim_element(tr1_nodes, "TD", {});
			var td1_nodes = children(td1);
			a24 = claim_element(td1_nodes, "A", { href: true });
			var a24_nodes = children(a24);
			t73 = claim_text(a24_nodes, "parse5");
			a24_nodes.forEach(detach);
			td1_nodes.forEach(detach);
			t74 = claim_space(tr1_nodes);
			td2 = claim_element(tr1_nodes, "TD", {});
			var td2_nodes = children(td2);
			a25 = claim_element(td2_nodes, "A", { href: true });
			var a25_nodes = children(a25);
			code4 = claim_element(a25_nodes, "CODE", { class: true });
			var code4_nodes = children(code4);
			t75 = claim_text(code4_nodes, "parse5.parse(str)");
			code4_nodes.forEach(detach);
			a25_nodes.forEach(detach);
			td2_nodes.forEach(detach);
			t76 = claim_space(tr1_nodes);
			td3 = claim_element(tr1_nodes, "TD", {});
			var td3_nodes = children(td3);
			a26 = claim_element(td3_nodes, "A", { href: true });
			var a26_nodes = children(a26);
			code5 = claim_element(a26_nodes, "CODE", { class: true });
			var code5_nodes = children(code5);
			t77 = claim_text(code5_nodes, "parse5.serialize(ast)");
			code5_nodes.forEach(detach);
			a26_nodes.forEach(detach);
			td3_nodes.forEach(detach);
			tr1_nodes.forEach(detach);
			t78 = claim_space(tbody_nodes);
			tr2 = claim_element(tbody_nodes, "TR", {});
			var tr2_nodes = children(tr2);
			td4 = claim_element(tr2_nodes, "TD", {});
			var td4_nodes = children(td4);
			t79 = claim_text(td4_nodes, "Markdown");
			td4_nodes.forEach(detach);
			t80 = claim_space(tr2_nodes);
			td5 = claim_element(tr2_nodes, "TD", {});
			var td5_nodes = children(td5);
			a27 = claim_element(td5_nodes, "A", { href: true });
			var a27_nodes = children(a27);
			t81 = claim_text(a27_nodes, "remark");
			a27_nodes.forEach(detach);
			td5_nodes.forEach(detach);
			t82 = claim_space(tr2_nodes);
			td6 = claim_element(tr2_nodes, "TD", {});
			var td6_nodes = children(td6);
			a28 = claim_element(td6_nodes, "A", { href: true });
			var a28_nodes = children(a28);
			code6 = claim_element(a28_nodes, "CODE", { class: true });
			var code6_nodes = children(code6);
			t83 = claim_text(code6_nodes, "unified().use(remarkParse)");
			code6_nodes.forEach(detach);
			a28_nodes.forEach(detach);
			td6_nodes.forEach(detach);
			t84 = claim_space(tr2_nodes);
			td7 = claim_element(tr2_nodes, "TD", {});
			var td7_nodes = children(td7);
			a29 = claim_element(td7_nodes, "A", { href: true });
			var a29_nodes = children(a29);
			code7 = claim_element(a29_nodes, "CODE", { class: true });
			var code7_nodes = children(code7);
			t85 = claim_text(code7_nodes, "unified().use(remarkStringify)");
			code7_nodes.forEach(detach);
			a29_nodes.forEach(detach);
			td7_nodes.forEach(detach);
			tr2_nodes.forEach(detach);
			t86 = claim_space(tbody_nodes);
			tr3 = claim_element(tbody_nodes, "TR", {});
			var tr3_nodes = children(tr3);
			td8 = claim_element(tr3_nodes, "TD", {});
			var td8_nodes = children(td8);
			t87 = claim_text(td8_nodes, "CSS");
			td8_nodes.forEach(detach);
			t88 = claim_space(tr3_nodes);
			td9 = claim_element(tr3_nodes, "TD", {});
			var td9_nodes = children(td9);
			a30 = claim_element(td9_nodes, "A", { href: true });
			var a30_nodes = children(a30);
			t89 = claim_text(a30_nodes, "css-tree");
			a30_nodes.forEach(detach);
			td9_nodes.forEach(detach);
			t90 = claim_space(tr3_nodes);
			td10 = claim_element(tr3_nodes, "TD", {});
			var td10_nodes = children(td10);
			a31 = claim_element(td10_nodes, "A", { href: true });
			var a31_nodes = children(a31);
			code8 = claim_element(a31_nodes, "CODE", { class: true });
			var code8_nodes = children(code8);
			t91 = claim_text(code8_nodes, "csstree.parse(str)");
			code8_nodes.forEach(detach);
			a31_nodes.forEach(detach);
			td10_nodes.forEach(detach);
			t92 = claim_space(tr3_nodes);
			td11 = claim_element(tr3_nodes, "TD", {});
			var td11_nodes = children(td11);
			a32 = claim_element(td11_nodes, "A", { href: true });
			var a32_nodes = children(a32);
			code9 = claim_element(a32_nodes, "CODE", { class: true });
			var code9_nodes = children(code9);
			t93 = claim_text(code9_nodes, "csstree.generate(ast)");
			code9_nodes.forEach(detach);
			a32_nodes.forEach(detach);
			td11_nodes.forEach(detach);
			tr3_nodes.forEach(detach);
			t94 = claim_space(tbody_nodes);
			tr4 = claim_element(tbody_nodes, "TR", {});
			var tr4_nodes = children(tr4);
			td12 = claim_element(tr4_nodes, "TD", {});
			var td12_nodes = children(td12);
			t95 = claim_text(td12_nodes, "Sass");
			td12_nodes.forEach(detach);
			t96 = claim_space(tr4_nodes);
			td13 = claim_element(tr4_nodes, "TD", {});
			var td13_nodes = children(td13);
			a33 = claim_element(td13_nodes, "A", { href: true });
			var a33_nodes = children(a33);
			t97 = claim_text(a33_nodes, "sast");
			a33_nodes.forEach(detach);
			td13_nodes.forEach(detach);
			t98 = claim_space(tr4_nodes);
			td14 = claim_element(tr4_nodes, "TD", {});
			var td14_nodes = children(td14);
			a34 = claim_element(td14_nodes, "A", { href: true });
			var a34_nodes = children(a34);
			code10 = claim_element(a34_nodes, "CODE", { class: true });
			var code10_nodes = children(code10);
			t99 = claim_text(code10_nodes, "sast.parse(str)");
			code10_nodes.forEach(detach);
			a34_nodes.forEach(detach);
			td14_nodes.forEach(detach);
			t100 = claim_space(tr4_nodes);
			td15 = claim_element(tr4_nodes, "TD", {});
			var td15_nodes = children(td15);
			a35 = claim_element(td15_nodes, "A", { href: true });
			var a35_nodes = children(a35);
			code11 = claim_element(a35_nodes, "CODE", { class: true });
			var code11_nodes = children(code11);
			t101 = claim_text(code11_nodes, "sast.stringify(ast)");
			code11_nodes.forEach(detach);
			a35_nodes.forEach(detach);
			td15_nodes.forEach(detach);
			tr4_nodes.forEach(detach);
			t102 = claim_space(tbody_nodes);
			tr5 = claim_element(tbody_nodes, "TR", {});
			var tr5_nodes = children(tr5);
			td16 = claim_element(tr5_nodes, "TD", {});
			var td16_nodes = children(td16);
			t103 = claim_text(td16_nodes, "JavaScript");
			td16_nodes.forEach(detach);
			t104 = claim_space(tr5_nodes);
			td17 = claim_element(tr5_nodes, "TD", {});
			var td17_nodes = children(td17);
			a36 = claim_element(td17_nodes, "A", { href: true });
			var a36_nodes = children(a36);
			t105 = claim_text(a36_nodes, "babel");
			a36_nodes.forEach(detach);
			td17_nodes.forEach(detach);
			t106 = claim_space(tr5_nodes);
			td18 = claim_element(tr5_nodes, "TD", {});
			var td18_nodes = children(td18);
			a37 = claim_element(td18_nodes, "A", { href: true });
			var a37_nodes = children(a37);
			code12 = claim_element(a37_nodes, "CODE", { class: true });
			var code12_nodes = children(code12);
			t107 = claim_text(code12_nodes, "babel.parse(str)");
			code12_nodes.forEach(detach);
			a37_nodes.forEach(detach);
			td18_nodes.forEach(detach);
			t108 = claim_space(tr5_nodes);
			td19 = claim_element(tr5_nodes, "TD", {});
			var td19_nodes = children(td19);
			a38 = claim_element(td19_nodes, "A", { href: true });
			var a38_nodes = children(a38);
			code13 = claim_element(a38_nodes, "CODE", { class: true });
			var code13_nodes = children(code13);
			t109 = claim_text(code13_nodes, "babel.generate(ast)");
			code13_nodes.forEach(detach);
			a38_nodes.forEach(detach);
			td19_nodes.forEach(detach);
			tr5_nodes.forEach(detach);
			t110 = claim_space(tbody_nodes);
			tr6 = claim_element(tbody_nodes, "TR", {});
			var tr6_nodes = children(tr6);
			td20 = claim_element(tr6_nodes, "TD", {});
			var td20_nodes = children(td20);
			t111 = claim_text(td20_nodes, "TypeScript");
			td20_nodes.forEach(detach);
			t112 = claim_space(tr6_nodes);
			td21 = claim_element(tr6_nodes, "TD", {});
			var td21_nodes = children(td21);
			a39 = claim_element(td21_nodes, "A", { href: true });
			var a39_nodes = children(a39);
			t113 = claim_text(a39_nodes, "TypeScript");
			a39_nodes.forEach(detach);
			td21_nodes.forEach(detach);
			t114 = claim_space(tr6_nodes);
			td22 = claim_element(tr6_nodes, "TD", {});
			var td22_nodes = children(td22);
			a40 = claim_element(td22_nodes, "A", { href: true });
			var a40_nodes = children(a40);
			code14 = claim_element(a40_nodes, "CODE", { class: true });
			var code14_nodes = children(code14);
			t115 = claim_text(code14_nodes, "ts.createSourceFile(str)");
			code14_nodes.forEach(detach);
			a40_nodes.forEach(detach);
			td22_nodes.forEach(detach);
			t116 = claim_space(tr6_nodes);
			td23 = claim_element(tr6_nodes, "TD", {});
			var td23_nodes = children(td23);
			a41 = claim_element(td23_nodes, "A", { href: true });
			var a41_nodes = children(a41);
			code15 = claim_element(a41_nodes, "CODE", { class: true });
			var code15_nodes = children(code15);
			t117 = claim_text(code15_nodes, "ts.createPrinter().printFile(ast)");
			code15_nodes.forEach(detach);
			a41_nodes.forEach(detach);
			td23_nodes.forEach(detach);
			tr6_nodes.forEach(detach);
			tbody_nodes.forEach(detach);
			table_nodes.forEach(detach);
			div_nodes.forEach(detach);
			t118 = claim_space(section1_nodes);
			p10 = claim_element(section1_nodes, "P", {});
			var p10_nodes = children(p10);
			t119 = claim_text(p10_nodes, "As you can see most parsers provide both parsing and generating methods.");
			p10_nodes.forEach(detach);
			t120 = claim_space(section1_nodes);
			p11 = claim_element(section1_nodes, "P", {});
			var p11_nodes = children(p11);
			t121 = claim_text(p11_nodes, "So in general, you can have the following as a template to write your code transformation code:");
			p11_nodes.forEach(detach);
			t122 = claim_space(section1_nodes);
			pre0 = claim_element(section1_nodes, "PRE", { class: true });
			var pre0_nodes = children(pre0);
			pre0_nodes.forEach(detach);
			t123 = claim_space(section1_nodes);
			p12 = claim_element(section1_nodes, "P", {});
			var p12_nodes = children(p12);
			t124 = claim_text(p12_nodes, "You can, of course, transforming AST of one language to AST of another language, for example: Sass ➡️ CSS, Markdown ➡️ HTML, and use the generator of another language to generate out the code.");
			p12_nodes.forEach(detach);
			t125 = claim_space(section1_nodes);
			pre1 = claim_element(section1_nodes, "PRE", { class: true });
			var pre1_nodes = children(pre1);
			pre1_nodes.forEach(detach);
			t126 = claim_space(section1_nodes);
			p13 = claim_element(section1_nodes, "P", {});
			var p13_nodes = children(p13);
			t127 = claim_text(p13_nodes, "Now armed with this template, let's talk about the more ");
			em0 = claim_element(p13_nodes, "EM", {});
			var em0_nodes = children(em0);
			t128 = claim_text(em0_nodes, "magical");
			em0_nodes.forEach(detach);
			t129 = claim_text(p13_nodes, " stuff, ");
			em1 = claim_element(p13_nodes, "EM", {});
			var em1_nodes = children(em1);
			t130 = claim_text(em1_nodes, "the transform function");
			em1_nodes.forEach(detach);
			t131 = claim_text(p13_nodes, ".");
			p13_nodes.forEach(detach);
			section1_nodes.forEach(detach);
			t132 = claim_space(nodes);
			section2 = claim_element(nodes, "SECTION", {});
			var section2_nodes = children(section2);
			h21 = claim_element(section2_nodes, "H2", {});
			var h21_nodes = children(h21);
			a42 = claim_element(h21_nodes, "A", { href: true, id: true });
			var a42_nodes = children(a42);
			t133 = claim_text(a42_nodes, "Traversing an AST");
			a42_nodes.forEach(detach);
			h21_nodes.forEach(detach);
			t134 = claim_space(section2_nodes);
			p14 = claim_element(section2_nodes, "P", {});
			var p14_nodes = children(p14);
			t135 = claim_text(p14_nodes, "As the name AST suggests, AST uses a tree data structure. To hone the skills of manipulating AST, we need to recall our long distant memory of ");
			em2 = claim_element(p14_nodes, "EM", {});
			var em2_nodes = children(em2);
			t136 = claim_text(em2_nodes, "\"Algorithm 101\"");
			em2_nodes.forEach(detach);
			t137 = claim_text(p14_nodes, ", the ");
			strong1 = claim_element(p14_nodes, "STRONG", {});
			var strong1_nodes = children(strong1);
			t138 = claim_text(strong1_nodes, "depth-first search (DFS)");
			strong1_nodes.forEach(detach);
			t139 = claim_text(p14_nodes, " tree traversal algorithm.");
			p14_nodes.forEach(detach);
			t140 = claim_space(section2_nodes);
			p15 = claim_element(section2_nodes, "P", {});
			var p15_nodes = children(p15);
			a43 = claim_element(p15_nodes, "A", { href: true, rel: true });
			var a43_nodes = children(a43);
			t141 = claim_text(a43_nodes, "Vaidehi Joshi");
			a43_nodes.forEach(detach);
			t142 = claim_text(p15_nodes, " wrote an amazing article on ");
			a44 = claim_element(p15_nodes, "A", { href: true, rel: true });
			var a44_nodes = children(a44);
			t143 = claim_text(a44_nodes, "demystifying Depth-First Search");
			a44_nodes.forEach(detach);
			t144 = claim_text(p15_nodes, ", I don't think I can explain any better, so if you want to recap on depth-first search, please go and read ");
			a45 = claim_element(p15_nodes, "A", { href: true, rel: true });
			var a45_nodes = children(a45);
			t145 = claim_text(a45_nodes, "her article");
			a45_nodes.forEach(detach);
			t146 = claim_text(p15_nodes, " before we continue.");
			p15_nodes.forEach(detach);
			t147 = claim_space(section2_nodes);
			p16 = claim_element(section2_nodes, "P", {});
			var p16_nodes = children(p16);
			t148 = claim_text(p16_nodes, "Now you have a clearer idea of how depth-first search works, a depth-first search on an AST would look something like this:");
			p16_nodes.forEach(detach);
			t149 = claim_space(section2_nodes);
			pre2 = claim_element(section2_nodes, "PRE", { class: true });
			var pre2_nodes = children(pre2);
			pre2_nodes.forEach(detach);
			t150 = claim_space(section2_nodes);
			p17 = claim_element(section2_nodes, "P", {});
			var p17_nodes = children(p17);
			t151 = claim_text(p17_nodes, "We can then fill up the ");
			code16 = claim_element(p17_nodes, "CODE", {});
			var code16_nodes = children(code16);
			t152 = claim_text(code16_nodes, "TODO");
			code16_nodes.forEach(detach);
			t153 = claim_text(p17_nodes, " with our manipulation code.");
			p17_nodes.forEach(detach);
			t154 = claim_space(section2_nodes);
			p18 = claim_element(section2_nodes, "P", {});
			var p18_nodes = children(p18);
			t155 = claim_text(p18_nodes, "If we find ourselves needing to do multiple traversals, with different AST manipulation, we would soon realize that mixing AST manipulation code with the traversal code is ");
			em3 = claim_element(p18_nodes, "EM", {});
			var em3_nodes = children(em3);
			t156 = claim_text(em3_nodes, "not clean enough");
			em3_nodes.forEach(detach);
			t157 = claim_text(p18_nodes, ". Naturally, you would realize ");
			em4 = claim_element(p18_nodes, "EM", {});
			var em4_nodes = children(em4);
			t158 = claim_text(em4_nodes, "it is cleaner");
			em4_nodes.forEach(detach);
			t159 = claim_text(p18_nodes, " to pass in a callback function that gets called every time we visit a node:");
			p18_nodes.forEach(detach);
			t160 = claim_space(section2_nodes);
			pre3 = claim_element(section2_nodes, "PRE", { class: true });
			var pre3_nodes = children(pre3);
			pre3_nodes.forEach(detach);
			t161 = claim_space(section2_nodes);
			p19 = claim_element(section2_nodes, "P", {});
			var p19_nodes = children(p19);
			t162 = claim_text(p19_nodes, "The ");
			code17 = claim_element(p19_nodes, "CODE", {});
			var code17_nodes = children(code17);
			t163 = claim_text(code17_nodes, "visit");
			code17_nodes.forEach(detach);
			t164 = claim_text(p19_nodes, " function is now generic enough that you can use it for any AST:");
			p19_nodes.forEach(detach);
			t165 = claim_space(section2_nodes);
			pre4 = claim_element(section2_nodes, "PRE", { class: true });
			var pre4_nodes = children(pre4);
			pre4_nodes.forEach(detach);
			t166 = claim_space(section2_nodes);
			p20 = claim_element(section2_nodes, "P", {});
			var p20_nodes = children(p20);
			t167 = claim_text(p20_nodes, "Naturally, you would think that having the information of the parent node, and the key / index of the current node would be useful to have in the callback function:");
			p20_nodes.forEach(detach);
			t168 = claim_space(section2_nodes);
			pre5 = claim_element(section2_nodes, "PRE", { class: true });
			var pre5_nodes = children(pre5);
			pre5_nodes.forEach(detach);
			t169 = claim_space(section2_nodes);
			p21 = claim_element(section2_nodes, "P", {});
			var p21_nodes = children(p21);
			t170 = claim_text(p21_nodes, "Now, we might think to ourselves, I dont want to get callback for every node visited, I just need callback for a certain node. You might be tempted to add a condition in the ");
			code18 = claim_element(p21_nodes, "CODE", {});
			var code18_nodes = children(code18);
			t171 = claim_text(code18_nodes, "visit");
			code18_nodes.forEach(detach);
			t172 = claim_text(p21_nodes, " function:");
			p21_nodes.forEach(detach);
			t173 = claim_space(section2_nodes);
			pre6 = claim_element(section2_nodes, "PRE", { class: true });
			var pre6_nodes = children(pre6);
			pre6_nodes.forEach(detach);
			t174 = claim_space(section2_nodes);
			p22 = claim_element(section2_nodes, "P", {});
			var p22_nodes = children(p22);
			t175 = claim_text(p22_nodes, "But you think twice: ");
			em5 = claim_element(p22_nodes, "EM", {});
			var em5_nodes = children(em5);
			t176 = claim_text(em5_nodes, "what if someone else wants to use ");
			code19 = claim_element(em5_nodes, "CODE", {});
			var code19_nodes = children(code19);
			t177 = claim_text(code19_nodes, "visit");
			code19_nodes.forEach(detach);
			t178 = claim_text(em5_nodes, " but with a different condition for callback?");
			em5_nodes.forEach(detach);
			p22_nodes.forEach(detach);
			t179 = claim_space(section2_nodes);
			p23 = claim_element(section2_nodes, "P", {});
			var p23_nodes = children(p23);
			t180 = claim_text(p23_nodes, "For most of the time, you want to callback only to a certain types of node. In that case, instead of passing in a callback function, you can pass in a map of node type to their respective callback functions:");
			p23_nodes.forEach(detach);
			t181 = claim_space(section2_nodes);
			pre7 = claim_element(section2_nodes, "PRE", { class: true });
			var pre7_nodes = children(pre7);
			pre7_nodes.forEach(detach);
			t182 = claim_space(section2_nodes);
			p24 = claim_element(section2_nodes, "P", {});
			var p24_nodes = children(p24);
			t183 = claim_text(p24_nodes, "At this point, you maybe realize, ");
			em6 = claim_element(p24_nodes, "EM", {});
			var em6_nodes = children(em6);
			t184 = claim_text(em6_nodes, "hey, this looks so much like one of those AST traversing libraries!");
			em6_nodes.forEach(detach);
			t185 = claim_text(p24_nodes, " And yes, this is how they get implemented.");
			p24_nodes.forEach(detach);
			t186 = claim_space(section2_nodes);
			p25 = claim_element(section2_nodes, "P", {});
			var p25_nodes = children(p25);
			t187 = claim_text(p25_nodes, "Now we can traverse the AST, and find the node that we are interested in, so the next step is to manipulate them.");
			p25_nodes.forEach(detach);
			section2_nodes.forEach(detach);
			t188 = claim_space(nodes);
			section3 = claim_element(nodes, "SECTION", {});
			var section3_nodes = children(section3);
			h22 = claim_element(section3_nodes, "H2", {});
			var h22_nodes = children(h22);
			a46 = claim_element(h22_nodes, "A", { href: true, id: true });
			var a46_nodes = children(a46);
			t189 = claim_text(a46_nodes, "Manipulating AST");
			a46_nodes.forEach(detach);
			h22_nodes.forEach(detach);
			t190 = claim_space(section3_nodes);
			p26 = claim_element(section3_nodes, "P", {});
			var p26_nodes = children(p26);
			t191 = claim_text(p26_nodes, "Manipulating the AST can be categorized into 3 different operations:");
			p26_nodes.forEach(detach);
			t192 = claim_space(section3_nodes);
			ul2 = claim_element(section3_nodes, "UL", {});
			var ul2_nodes = children(ul2);
			li10 = claim_element(ul2_nodes, "LI", {});
			var li10_nodes = children(li10);
			t193 = claim_text(li10_nodes, "Adding a node");
			li10_nodes.forEach(detach);
			t194 = claim_space(ul2_nodes);
			li11 = claim_element(ul2_nodes, "LI", {});
			var li11_nodes = children(li11);
			t195 = claim_text(li11_nodes, "Replacing a node");
			li11_nodes.forEach(detach);
			t196 = claim_space(ul2_nodes);
			li12 = claim_element(ul2_nodes, "LI", {});
			var li12_nodes = children(li12);
			t197 = claim_text(li12_nodes, "Removing a node");
			li12_nodes.forEach(detach);
			ul2_nodes.forEach(detach);
			section3_nodes.forEach(detach);
			t198 = claim_space(nodes);
			section4 = claim_element(nodes, "SECTION", {});
			var section4_nodes = children(section4);
			h30 = claim_element(section4_nodes, "H3", {});
			var h30_nodes = children(h30);
			a47 = claim_element(h30_nodes, "A", { href: true, id: true });
			var a47_nodes = children(a47);
			t199 = claim_text(a47_nodes, "Adding a node");
			a47_nodes.forEach(detach);
			h30_nodes.forEach(detach);
			t200 = claim_space(section4_nodes);
			p27 = claim_element(section4_nodes, "P", {});
			var p27_nodes = children(p27);
			t201 = claim_text(p27_nodes, "To add a node, you can assign it to a keyed property of your node:");
			p27_nodes.forEach(detach);
			t202 = claim_space(section4_nodes);
			pre8 = claim_element(section4_nodes, "PRE", { class: true });
			var pre8_nodes = children(pre8);
			pre8_nodes.forEach(detach);
			t203 = claim_space(section4_nodes);
			p28 = claim_element(section4_nodes, "P", {});
			var p28_nodes = children(p28);
			t204 = claim_text(p28_nodes, "or push the new node, if the keyed property is an array:");
			p28_nodes.forEach(detach);
			t205 = claim_space(section4_nodes);
			pre9 = claim_element(section4_nodes, "PRE", { class: true });
			var pre9_nodes = children(pre9);
			pre9_nodes.forEach(detach);
			t206 = claim_space(section4_nodes);
			p29 = claim_element(section4_nodes, "P", {});
			var p29_nodes = children(p29);
			t207 = claim_text(p29_nodes, "To add a node as a sibling, you may need to access the node's parent:");
			p29_nodes.forEach(detach);
			t208 = claim_space(section4_nodes);
			pre10 = claim_element(section4_nodes, "PRE", { class: true });
			var pre10_nodes = children(pre10);
			pre10_nodes.forEach(detach);
			section4_nodes.forEach(detach);
			t209 = claim_space(nodes);
			section5 = claim_element(nodes, "SECTION", {});
			var section5_nodes = children(section5);
			h31 = claim_element(section5_nodes, "H3", {});
			var h31_nodes = children(h31);
			a48 = claim_element(h31_nodes, "A", { href: true, id: true });
			var a48_nodes = children(a48);
			t210 = claim_text(a48_nodes, "Replacing a node");
			a48_nodes.forEach(detach);
			h31_nodes.forEach(detach);
			t211 = claim_space(section5_nodes);
			p30 = claim_element(section5_nodes, "P", {});
			var p30_nodes = children(p30);
			t212 = claim_text(p30_nodes, "To replace the current node to another node, update the key property of the current node's parent:");
			p30_nodes.forEach(detach);
			t213 = claim_space(section5_nodes);
			pre11 = claim_element(section5_nodes, "PRE", { class: true });
			var pre11_nodes = children(pre11);
			pre11_nodes.forEach(detach);
			t214 = claim_space(section5_nodes);
			p31 = claim_element(section5_nodes, "P", {});
			var p31_nodes = children(p31);
			t215 = claim_text(p31_nodes, "If the key property of the parent is an array:");
			p31_nodes.forEach(detach);
			t216 = claim_space(section5_nodes);
			pre12 = claim_element(section5_nodes, "PRE", { class: true });
			var pre12_nodes = children(pre12);
			pre12_nodes.forEach(detach);
			section5_nodes.forEach(detach);
			t217 = claim_space(nodes);
			section6 = claim_element(nodes, "SECTION", {});
			var section6_nodes = children(section6);
			h32 = claim_element(section6_nodes, "H3", {});
			var h32_nodes = children(h32);
			a49 = claim_element(h32_nodes, "A", { href: true, id: true });
			var a49_nodes = children(a49);
			t218 = claim_text(a49_nodes, "Removing a node");
			a49_nodes.forEach(detach);
			h32_nodes.forEach(detach);
			t219 = claim_space(section6_nodes);
			p32 = claim_element(section6_nodes, "P", {});
			var p32_nodes = children(p32);
			t220 = claim_text(p32_nodes, "To remove the current node, delete the key property of the current node's parent:");
			p32_nodes.forEach(detach);
			t221 = claim_space(section6_nodes);
			pre13 = claim_element(section6_nodes, "PRE", { class: true });
			var pre13_nodes = children(pre13);
			pre13_nodes.forEach(detach);
			t222 = claim_space(section6_nodes);
			p33 = claim_element(section6_nodes, "P", {});
			var p33_nodes = children(p33);
			t223 = claim_text(p33_nodes, "If the key property of the parent is an array:");
			p33_nodes.forEach(detach);
			t224 = claim_space(section6_nodes);
			pre14 = claim_element(section6_nodes, "PRE", { class: true });
			var pre14_nodes = children(pre14);
			pre14_nodes.forEach(detach);
			t225 = claim_space(section6_nodes);
			blockquote1 = claim_element(section6_nodes, "BLOCKQUOTE", {});
			var blockquote1_nodes = children(blockquote1);
			p34 = claim_element(blockquote1_nodes, "P", {});
			var p34_nodes = children(p34);
			t226 = claim_text(p34_nodes, "The operations of ");
			strong2 = claim_element(p34_nodes, "STRONG", {});
			var strong2_nodes = children(strong2);
			t227 = claim_text(strong2_nodes, "adding");
			strong2_nodes.forEach(detach);
			t228 = claim_text(p34_nodes, ", ");
			strong3 = claim_element(p34_nodes, "STRONG", {});
			var strong3_nodes = children(strong3);
			t229 = claim_text(strong3_nodes, "replacing");
			strong3_nodes.forEach(detach);
			t230 = claim_text(p34_nodes, ", and ");
			strong4 = claim_element(p34_nodes, "STRONG", {});
			var strong4_nodes = children(strong4);
			t231 = claim_text(strong4_nodes, "removing");
			strong4_nodes.forEach(detach);
			t232 = claim_text(p34_nodes, " nodes are so common that, they are usually implemented as a util function.");
			p34_nodes.forEach(detach);
			blockquote1_nodes.forEach(detach);
			t233 = claim_space(section6_nodes);
			p35 = claim_element(section6_nodes, "P", {});
			var p35_nodes = children(p35);
			t234 = claim_text(p35_nodes, "However, there's ");
			strong5 = claim_element(p35_nodes, "STRONG", {});
			var strong5_nodes = children(strong5);
			t235 = claim_text(strong5_nodes, "one important step");
			strong5_nodes.forEach(detach);
			t236 = claim_text(p35_nodes, " that I did not cover: after you mutate the node, you need to make sure that the traversal still works fine.");
			p35_nodes.forEach(detach);
			t237 = claim_space(section6_nodes);
			p36 = claim_element(section6_nodes, "P", {});
			var p36_nodes = children(p36);
			t238 = claim_text(p36_nodes, "For a node that is a property of a key of its parent, adding, replacing and removing them are usually fine. Except for the replace operation, you might need to revisit the ");
			em7 = claim_element(p36_nodes, "EM", {});
			var em7_nodes = children(em7);
			t239 = claim_text(em7_nodes, "\"current node\"");
			em7_nodes.forEach(detach);
			t240 = claim_text(p36_nodes, ", which is the ");
			em8 = claim_element(p36_nodes, "EM", {});
			var em8_nodes = children(em8);
			t241 = claim_text(em8_nodes, "new replacing node");
			em8_nodes.forEach(detach);
			t242 = claim_text(p36_nodes, ".");
			p36_nodes.forEach(detach);
			t243 = claim_space(section6_nodes);
			p37 = claim_element(section6_nodes, "P", {});
			var p37_nodes = children(p37);
			t244 = claim_text(p37_nodes, "However, for node that are in an array, you need to take special care to update the array index of the loop:");
			p37_nodes.forEach(detach);
			t245 = claim_space(section6_nodes);
			pre15 = claim_element(section6_nodes, "PRE", { class: true });
			var pre15_nodes = children(pre15);
			pre15_nodes.forEach(detach);
			t246 = claim_space(section6_nodes);
			p38 = claim_element(section6_nodes, "P", {});
			var p38_nodes = children(p38);
			t247 = claim_text(p38_nodes, "But how do you know that the current node was removed?");
			p38_nodes.forEach(detach);
			t248 = claim_space(section6_nodes);
			p39 = claim_element(section6_nodes, "P", {});
			var p39_nodes = children(p39);
			t249 = claim_text(p39_nodes, "Well, knowing when a node got removed is sometimes a secret that lies within the ");
			code20 = claim_element(p39_nodes, "CODE", {});
			var code20_nodes = children(code20);
			t250 = claim_text(code20_nodes, "remove");
			code20_nodes.forEach(detach);
			t251 = claim_text(p39_nodes, " util function from the tree traversal library.");
			p39_nodes.forEach(detach);
			t252 = claim_space(section6_nodes);
			p40 = claim_element(section6_nodes, "P", {});
			var p40_nodes = children(p40);
			t253 = claim_text(p40_nodes, "It could be as simple as setting a flag when you call ");
			code21 = claim_element(p40_nodes, "CODE", {});
			var code21_nodes = children(code21);
			t254 = claim_text(code21_nodes, "remove");
			code21_nodes.forEach(detach);
			t255 = claim_text(p40_nodes, ":");
			p40_nodes.forEach(detach);
			t256 = claim_space(section6_nodes);
			pre16 = claim_element(section6_nodes, "PRE", { class: true });
			var pre16_nodes = children(pre16);
			pre16_nodes.forEach(detach);
			t257 = claim_space(section6_nodes);
			p41 = claim_element(section6_nodes, "P", {});
			var p41_nodes = children(p41);
			t258 = claim_text(p41_nodes, "But sometimes, instead of having to import the ");
			code22 = claim_element(p41_nodes, "CODE", {});
			var code22_nodes = children(code22);
			t259 = claim_text(code22_nodes, "remove");
			code22_nodes.forEach(detach);
			t260 = claim_text(p41_nodes, " util from the tree traversal library, the ");
			code23 = claim_element(p41_nodes, "CODE", {});
			var code23_nodes = children(code23);
			t261 = claim_text(code23_nodes, "remove");
			code23_nodes.forEach(detach);
			t262 = claim_text(p41_nodes, " function is available in ");
			code24 = claim_element(p41_nodes, "CODE", {});
			var code24_nodes = children(code24);
			t263 = claim_text(code24_nodes, "this");
			code24_nodes.forEach(detach);
			t264 = claim_text(p41_nodes, " of the ");
			code25 = claim_element(p41_nodes, "CODE", {});
			var code25_nodes = children(code25);
			t265 = claim_text(code25_nodes, "visitCallback");
			code25_nodes.forEach(detach);
			t266 = claim_text(p41_nodes, ":");
			p41_nodes.forEach(detach);
			t267 = claim_space(section6_nodes);
			pre17 = claim_element(section6_nodes, "PRE", { class: true });
			var pre17_nodes = children(pre17);
			pre17_nodes.forEach(detach);
			t268 = claim_space(section6_nodes);
			p42 = claim_element(section6_nodes, "P", {});
			var p42_nodes = children(p42);
			t269 = claim_text(p42_nodes, "Now you learned the 3 basic operations of manipulating the AST, you maybe wonder how exactly is to use these basic operations to write a codemod or an AST transform plugin?");
			p42_nodes.forEach(detach);
			t270 = claim_space(section6_nodes);
			p43 = claim_element(section6_nodes, "P", {});
			var p43_nodes = children(p43);
			t271 = claim_text(p43_nodes, "Well, in my ");
			a50 = claim_element(p43_nodes, "A", { href: true });
			var a50_nodes = children(a50);
			t272 = claim_text(a50_nodes, "step-by-step guide");
			a50_nodes.forEach(detach);
			t273 = claim_text(p43_nodes, ", I've explained that, you can use AST explorer like ");
			a51 = claim_element(p43_nodes, "A", { href: true, rel: true });
			var a51_nodes = children(a51);
			t274 = claim_text(a51_nodes, "http://astexplorer.net/");
			a51_nodes.forEach(detach);
			t275 = claim_text(p43_nodes, " or ");
			a52 = claim_element(p43_nodes, "A", { href: true, rel: true });
			var a52_nodes = children(a52);
			t276 = claim_text(a52_nodes, "Babel AST Explorer");
			a52_nodes.forEach(detach);
			t277 = claim_text(p43_nodes, " to help you.");
			p43_nodes.forEach(detach);
			t278 = claim_space(section6_nodes);
			p44 = claim_element(section6_nodes, "P", {});
			var p44_nodes = children(p44);
			t279 = claim_text(p44_nodes, "You need to:");
			p44_nodes.forEach(detach);
			t280 = claim_space(section6_nodes);
			ul3 = claim_element(section6_nodes, "UL", {});
			var ul3_nodes = children(ul3);
			li13 = claim_element(ul3_nodes, "LI", {});
			var li13_nodes = children(li13);
			strong6 = claim_element(li13_nodes, "STRONG", {});
			var strong6_nodes = children(strong6);
			t281 = claim_text(strong6_nodes, "Know how the part of the code you want to change look like in the AST");
			strong6_nodes.forEach(detach);
			t282 = claim_text(li13_nodes, ", so you can target the specific type of the node, and");
			li13_nodes.forEach(detach);
			t283 = claim_space(ul3_nodes);
			li14 = claim_element(ul3_nodes, "LI", {});
			var li14_nodes = children(li14);
			strong7 = claim_element(li14_nodes, "STRONG", {});
			var strong7_nodes = children(strong7);
			t284 = claim_text(strong7_nodes, "Know how does the final output you wish to see look like in the AST");
			strong7_nodes.forEach(detach);
			t285 = claim_text(li14_nodes, ", so you know what nodes to create, update or remove.");
			li14_nodes.forEach(detach);
			ul3_nodes.forEach(detach);
			t286 = claim_space(section6_nodes);
			p45 = claim_element(section6_nodes, "P", {});
			var p45_nodes = children(p45);
			t287 = claim_text(p45_nodes, "So we are going to elaborate more on these 2 steps specifically.");
			p45_nodes.forEach(detach);
			section6_nodes.forEach(detach);
			t288 = claim_space(nodes);
			section7 = claim_element(nodes, "SECTION", {});
			var section7_nodes = children(section7);
			h23 = claim_element(section7_nodes, "H2", {});
			var h23_nodes = children(h23);
			a53 = claim_element(h23_nodes, "A", { href: true, id: true });
			var a53_nodes = children(a53);
			t289 = claim_text(a53_nodes, "Targeting a node");
			a53_nodes.forEach(detach);
			h23_nodes.forEach(detach);
			t290 = claim_space(section7_nodes);
			p46 = claim_element(section7_nodes, "P", {});
			var p46_nodes = children(p46);
			t291 = claim_text(p46_nodes, "Node targeting, most of the times, is just a lot of ");
			code26 = claim_element(p46_nodes, "CODE", {});
			var code26_nodes = children(code26);
			t292 = claim_text(code26_nodes, "===");
			code26_nodes.forEach(detach);
			t293 = claim_text(p46_nodes, ".");
			p46_nodes.forEach(detach);
			t294 = claim_space(section7_nodes);
			p47 = claim_element(section7_nodes, "P", {});
			var p47_nodes = children(p47);
			t295 = claim_text(p47_nodes, "For example, if you want to target a ");
			code27 = claim_element(p47_nodes, "CODE", {});
			var code27_nodes = children(code27);
			t296 = claim_text(code27_nodes, "<figure>");
			code27_nodes.forEach(detach);
			t297 = claim_text(p47_nodes, " with a class ");
			code28 = claim_element(p47_nodes, "CODE", {});
			var code28_nodes = children(code28);
			t298 = claim_text(code28_nodes, "foo");
			code28_nodes.forEach(detach);
			t299 = claim_text(p47_nodes, " that contains an ");
			code29 = claim_element(p47_nodes, "CODE", {});
			var code29_nodes = children(code29);
			t300 = claim_text(code29_nodes, "<img>");
			code29_nodes.forEach(detach);
			t301 = claim_text(p47_nodes, " and a ");
			code30 = claim_element(p47_nodes, "CODE", {});
			var code30_nodes = children(code30);
			t302 = claim_text(code30_nodes, "<figcaption>");
			code30_nodes.forEach(detach);
			t303 = claim_text(p47_nodes, " in ");
			a54 = claim_element(p47_nodes, "A", { href: true, rel: true });
			var a54_nodes = children(a54);
			t304 = claim_text(a54_nodes, "htmlparser2");
			a54_nodes.forEach(detach);
			t305 = claim_text(p47_nodes, ":");
			p47_nodes.forEach(detach);
			t306 = claim_space(section7_nodes);
			pre18 = claim_element(section7_nodes, "PRE", { class: true });
			var pre18_nodes = children(pre18);
			pre18_nodes.forEach(detach);
			t307 = claim_space(section7_nodes);
			p48 = claim_element(section7_nodes, "P", {});
			var p48_nodes = children(p48);
			t308 = claim_text(p48_nodes, "You need to check:");
			p48_nodes.forEach(detach);
			t309 = claim_space(section7_nodes);
			pre19 = claim_element(section7_nodes, "PRE", { class: true });
			var pre19_nodes = children(pre19);
			pre19_nodes.forEach(detach);
			t310 = claim_space(section7_nodes);
			p49 = claim_element(section7_nodes, "P", {});
			var p49_nodes = children(p49);
			t311 = claim_text(p49_nodes, "To make it less verbose, we can refactor each check into reusable functions:");
			p49_nodes.forEach(detach);
			t312 = claim_space(section7_nodes);
			pre20 = claim_element(section7_nodes, "PRE", { class: true });
			var pre20_nodes = children(pre20);
			pre20_nodes.forEach(detach);
			section7_nodes.forEach(detach);
			t313 = claim_space(nodes);
			section8 = claim_element(nodes, "SECTION", {});
			var section8_nodes = children(section8);
			h24 = claim_element(section8_nodes, "H2", {});
			var h24_nodes = children(h24);
			a55 = claim_element(h24_nodes, "A", { href: true, id: true });
			var a55_nodes = children(a55);
			t314 = claim_text(a55_nodes, "Creating a node");
			a55_nodes.forEach(detach);
			h24_nodes.forEach(detach);
			t315 = claim_space(section8_nodes);
			p50 = claim_element(section8_nodes, "P", {});
			var p50_nodes = children(p50);
			t316 = claim_text(p50_nodes, "There are a few ways you can create an AST node.");
			p50_nodes.forEach(detach);
			t317 = claim_space(section8_nodes);
			p51 = claim_element(section8_nodes, "P", {});
			var p51_nodes = children(p51);
			t318 = claim_text(p51_nodes, "The simplest and crudest way is to ");
			strong8 = claim_element(p51_nodes, "STRONG", {});
			var strong8_nodes = children(strong8);
			t319 = claim_text(strong8_nodes, "manually create the node object");
			strong8_nodes.forEach(detach);
			t320 = claim_text(p51_nodes, ". Most of the time, the node object is a JavaScript object. So you can just create them manually:");
			p51_nodes.forEach(detach);
			t321 = claim_space(section8_nodes);
			pre21 = claim_element(section8_nodes, "PRE", { class: true });
			var pre21_nodes = children(pre21);
			pre21_nodes.forEach(detach);
			t322 = claim_space(section8_nodes);
			p52 = claim_element(section8_nodes, "P", {});
			var p52_nodes = children(p52);
			t323 = claim_text(p52_nodes, "It may become unwieldy when creating large, complex AST nodes, so sometimes library decides to provide builder functions, like ");
			a56 = claim_element(p52_nodes, "A", { href: true, rel: true });
			var a56_nodes = children(a56);
			t324 = claim_text(a56_nodes, "@babel/types");
			a56_nodes.forEach(detach);
			t325 = claim_text(p52_nodes, " to simplify node creation and provide default values:");
			p52_nodes.forEach(detach);
			t326 = claim_space(section8_nodes);
			pre22 = claim_element(section8_nodes, "PRE", { class: true });
			var pre22_nodes = children(pre22);
			pre22_nodes.forEach(detach);
			t327 = claim_space(section8_nodes);
			p53 = claim_element(section8_nodes, "P", {});
			var p53_nodes = children(p53);
			t328 = claim_text(p53_nodes, "It looked more concise and tidier, but it is hard to comprehend and grasp what node it is creating.");
			p53_nodes.forEach(detach);
			t329 = claim_space(section8_nodes);
			p54 = claim_element(section8_nodes, "P", {});
			var p54_nodes = children(p54);
			t330 = claim_text(p54_nodes, "So, a better way of creating complex AST node, is to use the ");
			code31 = claim_element(p54_nodes, "CODE", {});
			var code31_nodes = children(code31);
			t331 = claim_text(code31_nodes, "parse");
			code31_nodes.forEach(detach);
			t332 = claim_text(p54_nodes, " function + ");
			code32 = claim_element(p54_nodes, "CODE", {});
			var code32_nodes = children(code32);
			t333 = claim_text(code32_nodes, "string");
			code32_nodes.forEach(detach);
			t334 = claim_text(p54_nodes, ":");
			p54_nodes.forEach(detach);
			t335 = claim_space(section8_nodes);
			pre23 = claim_element(section8_nodes, "PRE", { class: true });
			var pre23_nodes = children(pre23);
			pre23_nodes.forEach(detach);
			t336 = claim_space(section8_nodes);
			p55 = claim_element(section8_nodes, "P", {});
			var p55_nodes = children(p55);
			t337 = claim_text(p55_nodes, "For Babel, there's an amazing util called ");
			a57 = claim_element(p55_nodes, "A", { href: true, rel: true });
			var a57_nodes = children(a57);
			t338 = claim_text(a57_nodes, "@babel/template");
			a57_nodes.forEach(detach);
			t339 = claim_text(p55_nodes, ", where you can use ");
			a58 = claim_element(p55_nodes, "A", { href: true, rel: true });
			var a58_nodes = children(a58);
			t340 = claim_text(a58_nodes, "template literals");
			a58_nodes.forEach(detach);
			t341 = claim_text(p55_nodes, " to create AST node:");
			p55_nodes.forEach(detach);
			t342 = claim_space(section8_nodes);
			pre24 = claim_element(section8_nodes, "PRE", { class: true });
			var pre24_nodes = children(pre24);
			pre24_nodes.forEach(detach);
			section8_nodes.forEach(detach);
			t343 = claim_space(nodes);
			section9 = claim_element(nodes, "SECTION", {});
			var section9_nodes = children(section9);
			h25 = claim_element(section9_nodes, "H2", {});
			var h25_nodes = children(h25);
			a59 = claim_element(h25_nodes, "A", { href: true, id: true });
			var a59_nodes = children(a59);
			t344 = claim_text(a59_nodes, "Summary");
			a59_nodes.forEach(detach);
			h25_nodes.forEach(detach);
			t345 = claim_space(section9_nodes);
			p56 = claim_element(section9_nodes, "P", {});
			var p56_nodes = children(p56);
			t346 = claim_text(p56_nodes, "We've gone through:");
			p56_nodes.forEach(detach);
			t347 = claim_space(section9_nodes);
			ul4 = claim_element(section9_nodes, "UL", {});
			var ul4_nodes = children(ul4);
			li15 = claim_element(ul4_nodes, "LI", {});
			var li15_nodes = children(li15);
			t348 = claim_text(li15_nodes, "How to traverse an AST, using depth-first search algorithm,");
			li15_nodes.forEach(detach);
			t349 = claim_space(ul4_nodes);
			li16 = claim_element(ul4_nodes, "LI", {});
			var li16_nodes = children(li16);
			t350 = claim_text(li16_nodes, "The 3 basic AST manipulations, addition, replacement, and removal,");
			li16_nodes.forEach(detach);
			t351 = claim_space(ul4_nodes);
			li17 = claim_element(ul4_nodes, "LI", {});
			var li17_nodes = children(li17);
			t352 = claim_text(li17_nodes, "How to target a node in AST, and");
			li17_nodes.forEach(detach);
			t353 = claim_space(ul4_nodes);
			li18 = claim_element(ul4_nodes, "LI", {});
			var li18_nodes = children(li18);
			t354 = claim_text(li18_nodes, "How to create an AST node");
			li18_nodes.forEach(detach);
			ul4_nodes.forEach(detach);
			section9_nodes.forEach(detach);
			t355 = claim_space(nodes);
			section10 = claim_element(nodes, "SECTION", {});
			var section10_nodes = children(section10);
			h26 = claim_element(section10_nodes, "H2", {});
			var h26_nodes = children(h26);
			a60 = claim_element(h26_nodes, "A", { href: true, id: true });
			var a60_nodes = children(a60);
			t356 = claim_text(a60_nodes, "Further Readings");
			a60_nodes.forEach(detach);
			h26_nodes.forEach(detach);
			t357 = claim_space(section10_nodes);
			p57 = claim_element(section10_nodes, "P", {});
			var p57_nodes = children(p57);
			a61 = claim_element(p57_nodes, "A", { href: true, rel: true });
			var a61_nodes = children(a61);
			t358 = claim_text(a61_nodes, "Dinesh (@flexdinesh)");
			a61_nodes.forEach(detach);
			t359 = claim_space(p57_nodes);
			a62 = claim_element(p57_nodes, "A", { href: true, rel: true });
			var a62_nodes = children(a62);
			t360 = claim_text(a62_nodes, "tweeted");
			a62_nodes.forEach(detach);
			t361 = claim_text(p57_nodes, " his pocket collection of AST resources:");
			p57_nodes.forEach(detach);
			t362 = claim_space(section10_nodes);
			ul5 = claim_element(section10_nodes, "UL", {});
			var ul5_nodes = children(ul5);
			li19 = claim_element(ul5_nodes, "LI", {});
			var li19_nodes = children(li19);
			a63 = claim_element(li19_nodes, "A", { href: true, rel: true });
			var a63_nodes = children(a63);
			t363 = claim_text(a63_nodes, "Code Transformation and Linting with ASTs");
			a63_nodes.forEach(detach);
			li19_nodes.forEach(detach);
			t364 = claim_space(ul5_nodes);
			li20 = claim_element(ul5_nodes, "LI", {});
			var li20_nodes = children(li20);
			a64 = claim_element(li20_nodes, "A", { href: true, rel: true });
			var a64_nodes = children(a64);
			t365 = claim_text(a64_nodes, "Write your own code transform for fun and profit");
			a64_nodes.forEach(detach);
			li20_nodes.forEach(detach);
			t366 = claim_space(ul5_nodes);
			li21 = claim_element(ul5_nodes, "LI", {});
			var li21_nodes = children(li21);
			a65 = claim_element(li21_nodes, "A", { href: true, rel: true });
			var a65_nodes = children(a65);
			t367 = claim_text(a65_nodes, "Understanding ASTs by Building Your Own Babel Plugin");
			a65_nodes.forEach(detach);
			li21_nodes.forEach(detach);
			t368 = claim_space(ul5_nodes);
			li22 = claim_element(ul5_nodes, "LI", {});
			var li22_nodes = children(li22);
			a66 = claim_element(li22_nodes, "A", { href: true, rel: true });
			var a66_nodes = children(a66);
			t369 = claim_text(a66_nodes, "Writing your first Babel Plugin");
			a66_nodes.forEach(detach);
			li22_nodes.forEach(detach);
			t370 = claim_space(ul5_nodes);
			li23 = claim_element(ul5_nodes, "LI", {});
			var li23_nodes = children(li23);
			a67 = claim_element(li23_nodes, "A", { href: true, rel: true });
			var a67_nodes = children(a67);
			t371 = claim_text(a67_nodes, "This is how I build Babel plug-ins");
			a67_nodes.forEach(detach);
			li23_nodes.forEach(detach);
			t372 = claim_space(ul5_nodes);
			li24 = claim_element(ul5_nodes, "LI", {});
			var li24_nodes = children(li24);
			a68 = claim_element(li24_nodes, "A", { href: true, rel: true });
			var a68_nodes = children(a68);
			t373 = claim_text(a68_nodes, "Writing My First Babel Plugin");
			a68_nodes.forEach(detach);
			li24_nodes.forEach(detach);
			ul5_nodes.forEach(detach);
			section10_nodes.forEach(detach);
			this.h();
		},
		h() {
			attr(a0, "href", "#the-parsers");
			attr(a1, "href", "#traversing-an-ast");
			attr(a2, "href", "#manipulating-ast");
			attr(a3, "href", "#adding-a-node");
			attr(a4, "href", "#replacing-a-node");
			attr(a5, "href", "#removing-a-node");
			attr(a6, "href", "#targeting-a-node");
			attr(a7, "href", "#creating-a-node");
			attr(a8, "href", "#summary");
			attr(a9, "href", "#further-readings");
			attr(ul1, "class", "sitemap");
			attr(ul1, "id", "sitemap");
			attr(ul1, "role", "navigation");
			attr(ul1, "aria-label", "Table of Contents");
			attr(a10, "href", "/step-by-step-guide-for-writing-a-babel-transformation");
			attr(a11, "href", "https://babeljs.io/");
			attr(a11, "rel", "nofollow");
			attr(a12, "href", "/creating-custom-javascript-syntax-with-babel");
			attr(a13, "href", "https://www.ecma-international.org/publications/standards/Ecma-262.htm");
			attr(a13, "rel", "nofollow");
			attr(a14, "href", "http://typescriptlang.org/");
			attr(a14, "rel", "nofollow");
			attr(a15, "href", "https://sass-lang.com/");
			attr(a15, "rel", "nofollow");
			attr(a16, "href", "https://www.w3.org/Style/CSS/");
			attr(a16, "rel", "nofollow");
			attr(a17, "href", "https://www.w3.org/html/");
			attr(a17, "rel", "nofollow");
			attr(a18, "href", "https://en.wikipedia.org/wiki/Markdown");
			attr(a18, "rel", "nofollow");
			attr(a19, "href", "#the-parsers");
			attr(a19, "id", "the-parsers");
			attr(a20, "href", "https://astexplorer.net/");
			attr(a20, "rel", "nofollow");
			if (img0.src !== (img0_src_value = __build_img__0)) attr(img0, "src", img0_src_value);
			attr(img0, "alt", "ast explorer");
			attr(a21, "href", "https://github.com/fb55/htmlparser2");
			attr(a21, "rel", "nofollow");
			attr(a22, "href", "https://github.com/nik-garmash/hyntax");
			attr(a22, "rel", "nofollow");
			attr(a23, "href", "https://github.com/inikulin/parse5");
			attr(a23, "rel", "nofollow");
			if (img1.src !== (img1_src_value = __build_img__1)) attr(img1, "src", img1_src_value);
			attr(img1, "alt", "ast explorer");
			attr(code2, "class", "language-text");
			attr(code3, "class", "language-text");
			attr(a24, "href", "https://github.com/inikulin/parse5/tree/master/packages/parse5");
			attr(code4, "class", "language-text");
			attr(a25, "href", "https://github.com/inikulin/parse5/blob/master/packages/parse5/docs/index.md#parse");
			attr(code5, "class", "language-text");
			attr(a26, "href", "https://github.com/inikulin/parse5/blob/master/packages/parse5/docs/index.md#serialize");
			attr(a27, "href", "https://github.com/remarkjs/remark");
			attr(code6, "class", "language-text");
			attr(a28, "href", "https://github.com/remarkjs/remark/tree/master/packages/remark-parse");
			attr(code7, "class", "language-text");
			attr(a29, "href", "https://github.com/remarkjs/remark/tree/master/packages/remark-stringify");
			attr(a30, "href", "https://github.com/csstree/csstree");
			attr(code8, "class", "language-text");
			attr(a31, "href", "https://github.com/csstree/csstree/blob/master/docs/parsing.md");
			attr(code9, "class", "language-text");
			attr(a32, "href", "https://github.com/csstree/csstree/blob/master/docs/generate.md");
			attr(a33, "href", "https://github.com/shawnbot/sast");
			attr(code10, "class", "language-text");
			attr(a34, "href", "https://github.com/shawnbot/sast#sastparsesource--options-");
			attr(code11, "class", "language-text");
			attr(a35, "href", "https://github.com/shawnbot/sast#saststringifynode-");
			attr(a36, "href", "https://babeljs.io/");
			attr(code12, "class", "language-text");
			attr(a37, "href", "https://babeljs.io/docs/en/babel-parser#babelparserparsecode-options");
			attr(code13, "class", "language-text");
			attr(a38, "href", "https://babeljs.io/docs/en/babel-generator");
			attr(a39, "href", "http://typescriptlang.org/");
			attr(code14, "class", "language-text");
			attr(a40, "href", "https://github.com/microsoft/TypeScript/wiki/Using-the-Compiler-API#creating-and-printing-a-typescript-ast");
			attr(code15, "class", "language-text");
			attr(a41, "href", "https://github.com/microsoft/TypeScript/wiki/Using-the-Compiler-API#creating-and-printing-a-typescript-ast");
			set_style(div, "overflow", "auto");
			set_style(div, "margin-bottom", "2em");
			attr(pre0, "class", "language-js");
			attr(pre1, "class", "language-js");
			attr(a42, "href", "#traversing-an-ast");
			attr(a42, "id", "traversing-an-ast");
			attr(a43, "href", "https://twitter.com/vaidehijoshi");
			attr(a43, "rel", "nofollow");
			attr(a44, "href", "https://medium.com/basecs/demystifying-depth-first-search-a7c14cccf056");
			attr(a44, "rel", "nofollow");
			attr(a45, "href", "https://medium.com/basecs/demystifying-depth-first-search-a7c14cccf056");
			attr(a45, "rel", "nofollow");
			attr(pre2, "class", "language-js");
			attr(pre3, "class", "language-js");
			attr(pre4, "class", "language-js");
			attr(pre5, "class", "language-js");
			attr(pre6, "class", "language-js");
			attr(pre7, "class", "language-js");
			attr(a46, "href", "#manipulating-ast");
			attr(a46, "id", "manipulating-ast");
			attr(a47, "href", "#adding-a-node");
			attr(a47, "id", "adding-a-node");
			attr(pre8, "class", "language-js");
			attr(pre9, "class", "language-js");
			attr(pre10, "class", "language-js");
			attr(a48, "href", "#replacing-a-node");
			attr(a48, "id", "replacing-a-node");
			attr(pre11, "class", "language-js");
			attr(pre12, "class", "language-js");
			attr(a49, "href", "#removing-a-node");
			attr(a49, "id", "removing-a-node");
			attr(pre13, "class", "language-js");
			attr(pre14, "class", "language-js");
			attr(pre15, "class", "language-js");
			attr(pre16, "class", "language-js");
			attr(pre17, "class", "language-js");
			attr(a50, "href", "/step-by-step-guide-for-writing-a-babel-transformation");
			attr(a51, "href", "http://astexplorer.net/");
			attr(a51, "rel", "nofollow");
			attr(a52, "href", "https://lihautan.com/babel-ast-explorer");
			attr(a52, "rel", "nofollow");
			attr(a53, "href", "#targeting-a-node");
			attr(a53, "id", "targeting-a-node");
			attr(a54, "href", "https://github.com/fb55/htmlparser2");
			attr(a54, "rel", "nofollow");
			attr(pre18, "class", "language-html");
			attr(pre19, "class", "language-js");
			attr(pre20, "class", "language-js");
			attr(a55, "href", "#creating-a-node");
			attr(a55, "id", "creating-a-node");
			attr(pre21, "class", "language-js");
			attr(a56, "href", "https://babeljs.io/docs/en/babel-types");
			attr(a56, "rel", "nofollow");
			attr(pre22, "class", "language-js");
			attr(pre23, "class", "language-js");
			attr(a57, "href", "https://babeljs.io/docs/en/babel-template");
			attr(a57, "rel", "nofollow");
			attr(a58, "href", "https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Template_literals");
			attr(a58, "rel", "nofollow");
			attr(pre24, "class", "language-js");
			attr(a59, "href", "#summary");
			attr(a59, "id", "summary");
			attr(a60, "href", "#further-readings");
			attr(a60, "id", "further-readings");
			attr(a61, "href", "https://twitter.com/flexdinesh");
			attr(a61, "rel", "nofollow");
			attr(a62, "href", "https://twitter.com/flexdinesh/status/1196680010343432192");
			attr(a62, "rel", "nofollow");
			attr(a63, "href", "https://frontendmasters.com/courses/linting-asts/");
			attr(a63, "rel", "nofollow");
			attr(a64, "href", "https://kentcdodds.com/blog/write-your-own-code-transform/");
			attr(a64, "rel", "nofollow");
			attr(a65, "href", "https://www.sitepoint.com/understanding-asts-building-babel-plugin/");
			attr(a65, "rel", "nofollow");
			attr(a66, "href", "https://github.com/jamiebuilds/babel-handbook/blob/master/translations/en/plugin-handbook.md#toc-writing-your-first-babel-plugin");
			attr(a66, "rel", "nofollow");
			attr(a67, "href", "https://medium.com/the-guild/this-is-how-i-build-babel-plug-ins-b0a13dcd0352");
			attr(a67, "rel", "nofollow");
			attr(a68, "href", "https://varunzxzx.github.io/blog/writing-babel-plugin");
			attr(a68, "rel", "nofollow");
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
			append(ul0, li4);
			append(li4, a4);
			append(a4, t4);
			append(ul0, li5);
			append(li5, a5);
			append(a5, t5);
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
			insert(target, t10, anchor);
			insert(target, p0, anchor);
			append(p0, t11);
			append(p0, a10);
			append(a10, t12);
			append(p0, t13);
			append(p0, a11);
			append(a11, t14);
			append(p0, t15);
			append(p0, a12);
			append(a12, t16);
			append(p0, t17);
			insert(target, t18, anchor);
			insert(target, p1, anchor);
			append(p1, t19);
			insert(target, t20, anchor);
			insert(target, blockquote0, anchor);
			append(blockquote0, p2);
			append(p2, t21);
			append(p2, a13);
			append(a13, t22);
			append(p2, t23);
			append(p2, a14);
			append(a14, t24);
			append(p2, t25);
			append(p2, a15);
			append(a15, t26);
			append(p2, t27);
			append(p2, a16);
			append(a16, t28);
			append(p2, t29);
			append(p2, a17);
			append(a17, t30);
			append(p2, t31);
			append(p2, a18);
			append(a18, t32);
			append(p2, t33);
			append(blockquote0, t34);
			append(blockquote0, p3);
			append(p3, t35);
			insert(target, t36, anchor);
			insert(target, section1, anchor);
			append(section1, h20);
			append(h20, a19);
			append(a19, t37);
			append(section1, t38);
			append(section1, p4);
			append(p4, t39);
			append(section1, t40);
			append(section1, p5);
			append(p5, t41);
			append(p5, a20);
			append(a20, t42);
			append(p5, t43);
			append(section1, t44);
			append(section1, p6);
			append(p6, img0);
			append(section1, t45);
			append(section1, p7);
			append(p7, t46);
			append(p7, strong0);
			append(strong0, t47);
			append(p7, t48);
			append(p7, a21);
			append(a21, t49);
			append(p7, t50);
			append(p7, a22);
			append(a22, t51);
			append(p7, t52);
			append(p7, a23);
			append(a23, t53);
			append(p7, t54);
			append(section1, t55);
			append(section1, p8);
			append(p8, img1);
			append(section1, t56);
			append(section1, p9);
			append(p9, t57);
			append(p9, code0);
			append(code0, t58);
			append(p9, t59);
			append(p9, code1);
			append(code1, t60);
			append(p9, t61);
			append(section1, t62);
			append(section1, div);
			append(div, table);
			append(table, thead);
			append(thead, tr0);
			append(tr0, th0);
			append(th0, t63);
			append(tr0, t64);
			append(tr0, th1);
			append(th1, t65);
			append(tr0, t66);
			append(tr0, th2);
			append(th2, code2);
			append(code2, t67);
			append(tr0, t68);
			append(tr0, th3);
			append(th3, code3);
			append(code3, t69);
			append(table, t70);
			append(table, tbody);
			append(tbody, tr1);
			append(tr1, td0);
			append(td0, t71);
			append(tr1, t72);
			append(tr1, td1);
			append(td1, a24);
			append(a24, t73);
			append(tr1, t74);
			append(tr1, td2);
			append(td2, a25);
			append(a25, code4);
			append(code4, t75);
			append(tr1, t76);
			append(tr1, td3);
			append(td3, a26);
			append(a26, code5);
			append(code5, t77);
			append(tbody, t78);
			append(tbody, tr2);
			append(tr2, td4);
			append(td4, t79);
			append(tr2, t80);
			append(tr2, td5);
			append(td5, a27);
			append(a27, t81);
			append(tr2, t82);
			append(tr2, td6);
			append(td6, a28);
			append(a28, code6);
			append(code6, t83);
			append(tr2, t84);
			append(tr2, td7);
			append(td7, a29);
			append(a29, code7);
			append(code7, t85);
			append(tbody, t86);
			append(tbody, tr3);
			append(tr3, td8);
			append(td8, t87);
			append(tr3, t88);
			append(tr3, td9);
			append(td9, a30);
			append(a30, t89);
			append(tr3, t90);
			append(tr3, td10);
			append(td10, a31);
			append(a31, code8);
			append(code8, t91);
			append(tr3, t92);
			append(tr3, td11);
			append(td11, a32);
			append(a32, code9);
			append(code9, t93);
			append(tbody, t94);
			append(tbody, tr4);
			append(tr4, td12);
			append(td12, t95);
			append(tr4, t96);
			append(tr4, td13);
			append(td13, a33);
			append(a33, t97);
			append(tr4, t98);
			append(tr4, td14);
			append(td14, a34);
			append(a34, code10);
			append(code10, t99);
			append(tr4, t100);
			append(tr4, td15);
			append(td15, a35);
			append(a35, code11);
			append(code11, t101);
			append(tbody, t102);
			append(tbody, tr5);
			append(tr5, td16);
			append(td16, t103);
			append(tr5, t104);
			append(tr5, td17);
			append(td17, a36);
			append(a36, t105);
			append(tr5, t106);
			append(tr5, td18);
			append(td18, a37);
			append(a37, code12);
			append(code12, t107);
			append(tr5, t108);
			append(tr5, td19);
			append(td19, a38);
			append(a38, code13);
			append(code13, t109);
			append(tbody, t110);
			append(tbody, tr6);
			append(tr6, td20);
			append(td20, t111);
			append(tr6, t112);
			append(tr6, td21);
			append(td21, a39);
			append(a39, t113);
			append(tr6, t114);
			append(tr6, td22);
			append(td22, a40);
			append(a40, code14);
			append(code14, t115);
			append(tr6, t116);
			append(tr6, td23);
			append(td23, a41);
			append(a41, code15);
			append(code15, t117);
			append(section1, t118);
			append(section1, p10);
			append(p10, t119);
			append(section1, t120);
			append(section1, p11);
			append(p11, t121);
			append(section1, t122);
			append(section1, pre0);
			pre0.innerHTML = raw0_value;
			append(section1, t123);
			append(section1, p12);
			append(p12, t124);
			append(section1, t125);
			append(section1, pre1);
			pre1.innerHTML = raw1_value;
			append(section1, t126);
			append(section1, p13);
			append(p13, t127);
			append(p13, em0);
			append(em0, t128);
			append(p13, t129);
			append(p13, em1);
			append(em1, t130);
			append(p13, t131);
			insert(target, t132, anchor);
			insert(target, section2, anchor);
			append(section2, h21);
			append(h21, a42);
			append(a42, t133);
			append(section2, t134);
			append(section2, p14);
			append(p14, t135);
			append(p14, em2);
			append(em2, t136);
			append(p14, t137);
			append(p14, strong1);
			append(strong1, t138);
			append(p14, t139);
			append(section2, t140);
			append(section2, p15);
			append(p15, a43);
			append(a43, t141);
			append(p15, t142);
			append(p15, a44);
			append(a44, t143);
			append(p15, t144);
			append(p15, a45);
			append(a45, t145);
			append(p15, t146);
			append(section2, t147);
			append(section2, p16);
			append(p16, t148);
			append(section2, t149);
			append(section2, pre2);
			pre2.innerHTML = raw2_value;
			append(section2, t150);
			append(section2, p17);
			append(p17, t151);
			append(p17, code16);
			append(code16, t152);
			append(p17, t153);
			append(section2, t154);
			append(section2, p18);
			append(p18, t155);
			append(p18, em3);
			append(em3, t156);
			append(p18, t157);
			append(p18, em4);
			append(em4, t158);
			append(p18, t159);
			append(section2, t160);
			append(section2, pre3);
			pre3.innerHTML = raw3_value;
			append(section2, t161);
			append(section2, p19);
			append(p19, t162);
			append(p19, code17);
			append(code17, t163);
			append(p19, t164);
			append(section2, t165);
			append(section2, pre4);
			pre4.innerHTML = raw4_value;
			append(section2, t166);
			append(section2, p20);
			append(p20, t167);
			append(section2, t168);
			append(section2, pre5);
			pre5.innerHTML = raw5_value;
			append(section2, t169);
			append(section2, p21);
			append(p21, t170);
			append(p21, code18);
			append(code18, t171);
			append(p21, t172);
			append(section2, t173);
			append(section2, pre6);
			pre6.innerHTML = raw6_value;
			append(section2, t174);
			append(section2, p22);
			append(p22, t175);
			append(p22, em5);
			append(em5, t176);
			append(em5, code19);
			append(code19, t177);
			append(em5, t178);
			append(section2, t179);
			append(section2, p23);
			append(p23, t180);
			append(section2, t181);
			append(section2, pre7);
			pre7.innerHTML = raw7_value;
			append(section2, t182);
			append(section2, p24);
			append(p24, t183);
			append(p24, em6);
			append(em6, t184);
			append(p24, t185);
			append(section2, t186);
			append(section2, p25);
			append(p25, t187);
			insert(target, t188, anchor);
			insert(target, section3, anchor);
			append(section3, h22);
			append(h22, a46);
			append(a46, t189);
			append(section3, t190);
			append(section3, p26);
			append(p26, t191);
			append(section3, t192);
			append(section3, ul2);
			append(ul2, li10);
			append(li10, t193);
			append(ul2, t194);
			append(ul2, li11);
			append(li11, t195);
			append(ul2, t196);
			append(ul2, li12);
			append(li12, t197);
			insert(target, t198, anchor);
			insert(target, section4, anchor);
			append(section4, h30);
			append(h30, a47);
			append(a47, t199);
			append(section4, t200);
			append(section4, p27);
			append(p27, t201);
			append(section4, t202);
			append(section4, pre8);
			pre8.innerHTML = raw8_value;
			append(section4, t203);
			append(section4, p28);
			append(p28, t204);
			append(section4, t205);
			append(section4, pre9);
			pre9.innerHTML = raw9_value;
			append(section4, t206);
			append(section4, p29);
			append(p29, t207);
			append(section4, t208);
			append(section4, pre10);
			pre10.innerHTML = raw10_value;
			insert(target, t209, anchor);
			insert(target, section5, anchor);
			append(section5, h31);
			append(h31, a48);
			append(a48, t210);
			append(section5, t211);
			append(section5, p30);
			append(p30, t212);
			append(section5, t213);
			append(section5, pre11);
			pre11.innerHTML = raw11_value;
			append(section5, t214);
			append(section5, p31);
			append(p31, t215);
			append(section5, t216);
			append(section5, pre12);
			pre12.innerHTML = raw12_value;
			insert(target, t217, anchor);
			insert(target, section6, anchor);
			append(section6, h32);
			append(h32, a49);
			append(a49, t218);
			append(section6, t219);
			append(section6, p32);
			append(p32, t220);
			append(section6, t221);
			append(section6, pre13);
			pre13.innerHTML = raw13_value;
			append(section6, t222);
			append(section6, p33);
			append(p33, t223);
			append(section6, t224);
			append(section6, pre14);
			pre14.innerHTML = raw14_value;
			append(section6, t225);
			append(section6, blockquote1);
			append(blockquote1, p34);
			append(p34, t226);
			append(p34, strong2);
			append(strong2, t227);
			append(p34, t228);
			append(p34, strong3);
			append(strong3, t229);
			append(p34, t230);
			append(p34, strong4);
			append(strong4, t231);
			append(p34, t232);
			append(section6, t233);
			append(section6, p35);
			append(p35, t234);
			append(p35, strong5);
			append(strong5, t235);
			append(p35, t236);
			append(section6, t237);
			append(section6, p36);
			append(p36, t238);
			append(p36, em7);
			append(em7, t239);
			append(p36, t240);
			append(p36, em8);
			append(em8, t241);
			append(p36, t242);
			append(section6, t243);
			append(section6, p37);
			append(p37, t244);
			append(section6, t245);
			append(section6, pre15);
			pre15.innerHTML = raw15_value;
			append(section6, t246);
			append(section6, p38);
			append(p38, t247);
			append(section6, t248);
			append(section6, p39);
			append(p39, t249);
			append(p39, code20);
			append(code20, t250);
			append(p39, t251);
			append(section6, t252);
			append(section6, p40);
			append(p40, t253);
			append(p40, code21);
			append(code21, t254);
			append(p40, t255);
			append(section6, t256);
			append(section6, pre16);
			pre16.innerHTML = raw16_value;
			append(section6, t257);
			append(section6, p41);
			append(p41, t258);
			append(p41, code22);
			append(code22, t259);
			append(p41, t260);
			append(p41, code23);
			append(code23, t261);
			append(p41, t262);
			append(p41, code24);
			append(code24, t263);
			append(p41, t264);
			append(p41, code25);
			append(code25, t265);
			append(p41, t266);
			append(section6, t267);
			append(section6, pre17);
			pre17.innerHTML = raw17_value;
			append(section6, t268);
			append(section6, p42);
			append(p42, t269);
			append(section6, t270);
			append(section6, p43);
			append(p43, t271);
			append(p43, a50);
			append(a50, t272);
			append(p43, t273);
			append(p43, a51);
			append(a51, t274);
			append(p43, t275);
			append(p43, a52);
			append(a52, t276);
			append(p43, t277);
			append(section6, t278);
			append(section6, p44);
			append(p44, t279);
			append(section6, t280);
			append(section6, ul3);
			append(ul3, li13);
			append(li13, strong6);
			append(strong6, t281);
			append(li13, t282);
			append(ul3, t283);
			append(ul3, li14);
			append(li14, strong7);
			append(strong7, t284);
			append(li14, t285);
			append(section6, t286);
			append(section6, p45);
			append(p45, t287);
			insert(target, t288, anchor);
			insert(target, section7, anchor);
			append(section7, h23);
			append(h23, a53);
			append(a53, t289);
			append(section7, t290);
			append(section7, p46);
			append(p46, t291);
			append(p46, code26);
			append(code26, t292);
			append(p46, t293);
			append(section7, t294);
			append(section7, p47);
			append(p47, t295);
			append(p47, code27);
			append(code27, t296);
			append(p47, t297);
			append(p47, code28);
			append(code28, t298);
			append(p47, t299);
			append(p47, code29);
			append(code29, t300);
			append(p47, t301);
			append(p47, code30);
			append(code30, t302);
			append(p47, t303);
			append(p47, a54);
			append(a54, t304);
			append(p47, t305);
			append(section7, t306);
			append(section7, pre18);
			pre18.innerHTML = raw18_value;
			append(section7, t307);
			append(section7, p48);
			append(p48, t308);
			append(section7, t309);
			append(section7, pre19);
			pre19.innerHTML = raw19_value;
			append(section7, t310);
			append(section7, p49);
			append(p49, t311);
			append(section7, t312);
			append(section7, pre20);
			pre20.innerHTML = raw20_value;
			insert(target, t313, anchor);
			insert(target, section8, anchor);
			append(section8, h24);
			append(h24, a55);
			append(a55, t314);
			append(section8, t315);
			append(section8, p50);
			append(p50, t316);
			append(section8, t317);
			append(section8, p51);
			append(p51, t318);
			append(p51, strong8);
			append(strong8, t319);
			append(p51, t320);
			append(section8, t321);
			append(section8, pre21);
			pre21.innerHTML = raw21_value;
			append(section8, t322);
			append(section8, p52);
			append(p52, t323);
			append(p52, a56);
			append(a56, t324);
			append(p52, t325);
			append(section8, t326);
			append(section8, pre22);
			pre22.innerHTML = raw22_value;
			append(section8, t327);
			append(section8, p53);
			append(p53, t328);
			append(section8, t329);
			append(section8, p54);
			append(p54, t330);
			append(p54, code31);
			append(code31, t331);
			append(p54, t332);
			append(p54, code32);
			append(code32, t333);
			append(p54, t334);
			append(section8, t335);
			append(section8, pre23);
			pre23.innerHTML = raw23_value;
			append(section8, t336);
			append(section8, p55);
			append(p55, t337);
			append(p55, a57);
			append(a57, t338);
			append(p55, t339);
			append(p55, a58);
			append(a58, t340);
			append(p55, t341);
			append(section8, t342);
			append(section8, pre24);
			pre24.innerHTML = raw24_value;
			insert(target, t343, anchor);
			insert(target, section9, anchor);
			append(section9, h25);
			append(h25, a59);
			append(a59, t344);
			append(section9, t345);
			append(section9, p56);
			append(p56, t346);
			append(section9, t347);
			append(section9, ul4);
			append(ul4, li15);
			append(li15, t348);
			append(ul4, t349);
			append(ul4, li16);
			append(li16, t350);
			append(ul4, t351);
			append(ul4, li17);
			append(li17, t352);
			append(ul4, t353);
			append(ul4, li18);
			append(li18, t354);
			insert(target, t355, anchor);
			insert(target, section10, anchor);
			append(section10, h26);
			append(h26, a60);
			append(a60, t356);
			append(section10, t357);
			append(section10, p57);
			append(p57, a61);
			append(a61, t358);
			append(p57, t359);
			append(p57, a62);
			append(a62, t360);
			append(p57, t361);
			append(section10, t362);
			append(section10, ul5);
			append(ul5, li19);
			append(li19, a63);
			append(a63, t363);
			append(ul5, t364);
			append(ul5, li20);
			append(li20, a64);
			append(a64, t365);
			append(ul5, t366);
			append(ul5, li21);
			append(li21, a65);
			append(a65, t367);
			append(ul5, t368);
			append(ul5, li22);
			append(li22, a66);
			append(a66, t369);
			append(ul5, t370);
			append(ul5, li23);
			append(li23, a67);
			append(a67, t371);
			append(ul5, t372);
			append(ul5, li24);
			append(li24, a68);
			append(a68, t373);
		},
		p: noop,
		d(detaching) {
			if (detaching) detach(section0);
			if (detaching) detach(t10);
			if (detaching) detach(p0);
			if (detaching) detach(t18);
			if (detaching) detach(p1);
			if (detaching) detach(t20);
			if (detaching) detach(blockquote0);
			if (detaching) detach(t36);
			if (detaching) detach(section1);
			if (detaching) detach(t132);
			if (detaching) detach(section2);
			if (detaching) detach(t188);
			if (detaching) detach(section3);
			if (detaching) detach(t198);
			if (detaching) detach(section4);
			if (detaching) detach(t209);
			if (detaching) detach(section5);
			if (detaching) detach(t217);
			if (detaching) detach(section6);
			if (detaching) detach(t288);
			if (detaching) detach(section7);
			if (detaching) detach(t313);
			if (detaching) detach(section8);
			if (detaching) detach(t343);
			if (detaching) detach(section9);
			if (detaching) detach(t355);
			if (detaching) detach(section10);
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
	"title": "Manipulating AST with JavaScript",
	"date": "2019-11-22T08:00:00Z",
	"description": "Manipulating AST is not that hard anyway",
	"tags": ["JavaScript", "ast", "transform", "depth-first-search", "dfs"],
	"series": "AST",
	"slug": "manipulating-ast-with-javascript",
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
