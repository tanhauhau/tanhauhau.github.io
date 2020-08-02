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

var __build_img__0 = "7b2a8d218d1dbccc.png";

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
					"@id": "https%3A%2F%2Flihautan.com%2Fwhat-is-module-bundler-and-how-does-it-work",
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
			attr(meta11, "content", "https%3A%2F%2Flihautan.com%2Fwhat-is-module-bundler-and-how-does-it-work");
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

/* content/blog/what-is-module-bundler-and-how-does-it-work/@@page-markup.svelte generated by Svelte v3.24.0 */

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
	let li5;
	let a5;
	let t5;
	let t6;
	let section1;
	let h20;
	let a6;
	let t7;
	let t8;
	let p0;
	let img;
	let img_src_value;
	let t9;
	let p1;
	let t10;
	let a7;
	let t11;
	let t12;
	let t13;
	let p2;
	let t14;
	let em0;
	let t15;
	let t16;
	let a8;
	let t17;
	let t18;
	let a9;
	let t19;
	let t20;
	let a10;
	let t21;
	let t22;
	let a11;
	let t23;
	let t24;
	let t25;
	let p3;
	let t26;
	let t27;
	let ul2;
	let li6;
	let t28;
	let a12;
	let t29;
	let t30;
	let li7;
	let t31;
	let t32;
	let li8;
	let t33;
	let t34;
	let p4;
	let t35;
	let t36;
	let pre0;

	let raw0_value = `<code class="language-html"><span class="token tag"><span class="token tag"><span class="token punctuation">&lt;</span>html</span><span class="token punctuation">></span></span>
  <span class="token tag"><span class="token tag"><span class="token punctuation">&lt;</span>script</span> <span class="token attr-name">src</span><span class="token attr-value"><span class="token punctuation">=</span><span class="token punctuation">"</span>/src/foo.js<span class="token punctuation">"</span></span><span class="token punctuation">></span></span><span class="token script"></span><span class="token tag"><span class="token tag"><span class="token punctuation">&lt;/</span>script</span><span class="token punctuation">></span></span>
  <span class="token tag"><span class="token tag"><span class="token punctuation">&lt;</span>script</span> <span class="token attr-name">src</span><span class="token attr-value"><span class="token punctuation">=</span><span class="token punctuation">"</span>/src/bar.js<span class="token punctuation">"</span></span><span class="token punctuation">></span></span><span class="token script"></span><span class="token tag"><span class="token tag"><span class="token punctuation">&lt;/</span>script</span><span class="token punctuation">></span></span>
  <span class="token tag"><span class="token tag"><span class="token punctuation">&lt;</span>script</span> <span class="token attr-name">src</span><span class="token attr-value"><span class="token punctuation">=</span><span class="token punctuation">"</span>/src/baz.js<span class="token punctuation">"</span></span><span class="token punctuation">></span></span><span class="token script"></span><span class="token tag"><span class="token tag"><span class="token punctuation">&lt;/</span>script</span><span class="token punctuation">></span></span>
  <span class="token tag"><span class="token tag"><span class="token punctuation">&lt;</span>script</span> <span class="token attr-name">src</span><span class="token attr-value"><span class="token punctuation">=</span><span class="token punctuation">"</span>/src/qux.js<span class="token punctuation">"</span></span><span class="token punctuation">></span></span><span class="token script"></span><span class="token tag"><span class="token tag"><span class="token punctuation">&lt;/</span>script</span><span class="token punctuation">></span></span>
  <span class="token tag"><span class="token tag"><span class="token punctuation">&lt;</span>script</span> <span class="token attr-name">src</span><span class="token attr-value"><span class="token punctuation">=</span><span class="token punctuation">"</span>/src/quux.js<span class="token punctuation">"</span></span><span class="token punctuation">></span></span><span class="token script"></span><span class="token tag"><span class="token tag"><span class="token punctuation">&lt;/</span>script</span><span class="token punctuation">></span></span>
<span class="token tag"><span class="token tag"><span class="token punctuation">&lt;/</span>html</span><span class="token punctuation">></span></span></code>` + "";

	let t37;
	let p5;
	let t38;
	let t39;
	let pre1;

	let raw1_value = `<code class="language-html"><span class="token tag"><span class="token tag"><span class="token punctuation">&lt;</span>html</span><span class="token punctuation">></span></span>
  <span class="token tag"><span class="token tag"><span class="token punctuation">&lt;</span>script</span> <span class="token attr-name">src</span><span class="token attr-value"><span class="token punctuation">=</span><span class="token punctuation">"</span>/dist/bundle.js<span class="token punctuation">"</span></span><span class="token punctuation">></span></span><span class="token script"></span><span class="token tag"><span class="token tag"><span class="token punctuation">&lt;/</span>script</span><span class="token punctuation">></span></span>
<span class="token tag"><span class="token tag"><span class="token punctuation">&lt;/</span>html</span><span class="token punctuation">></span></span></code>` + "";

	let t40;
	let i;
	let t41;
	let t42;
	let p6;
	let t43;
	let code0;
	let t44;
	let t45;
	let t46;
	let p7;
	let t47;
	let t48;
	let ul4;
	let li10;
	let t49;
	let strong0;
	let t50;
	let t51;
	let ul3;
	let li9;
	let t52;
	let t53;
	let li11;
	let t54;
	let strong1;
	let t55;
	let t56;
	let t57;
	let li12;
	let t58;
	let t59;
	let p8;
	let t60;
	let t61;
	let ul5;
	let li13;
	let t62;
	let t63;
	let li14;
	let t64;
	let t65;
	let li15;
	let t66;
	let t67;
	let p9;
	let t68;
	let a13;
	let t69;
	let t70;
	let t71;
	let p10;
	let a14;
	let t72;
	let t73;
	let a15;
	let t74;
	let t75;
	let t76;
	let pre2;

	let raw2_value = `<code class="language-js"><span class="token comment">// CommonJS</span>
<span class="token keyword">const</span> foo <span class="token operator">=</span> <span class="token function">require</span><span class="token punctuation">(</span><span class="token string">'./foo'</span><span class="token punctuation">)</span><span class="token punctuation">;</span>
module<span class="token punctuation">.</span>exports <span class="token operator">=</span> bar<span class="token punctuation">;</span>

<span class="token comment">// ES Modules</span>
<span class="token keyword">import</span> foo <span class="token keyword">from</span> <span class="token string">'./foo'</span><span class="token punctuation">;</span>
<span class="token keyword">export</span> <span class="token keyword">default</span> bar<span class="token punctuation">;</span></code>` + "";

	let t77;
	let section2;
	let h21;
	let a16;
	let t78;
	let t79;
	let p11;
	let t80;
	let t81;
	let p12;
	let t82;
	let a17;
	let t83;
	let t84;
	let a18;
	let t85;
	let t86;
	let em1;
	let strong2;
	let t87;
	let t88;
	let em2;
	let strong3;
	let t89;
	let t90;
	let t91;
	let p13;
	let t92;
	let t93;
	let p14;
	let t94;
	let code1;
	let t95;
	let t96;
	let code2;
	let t97;
	let t98;
	let code3;
	let t99;
	let t100;
	let t101;
	let pre3;

	let raw3_value = `<code class="language-js"><span class="token comment">// filename: circle.js</span>
<span class="token keyword">const</span> <span class="token constant">PI</span> <span class="token operator">=</span> <span class="token number">3.141</span><span class="token punctuation">;</span>
<span class="token keyword">export</span> <span class="token keyword">default</span> <span class="token keyword">function</span> <span class="token function">area</span><span class="token punctuation">(</span><span class="token parameter">radius</span><span class="token punctuation">)</span> <span class="token punctuation">&#123;</span>
  <span class="token keyword">return</span> <span class="token constant">PI</span> <span class="token operator">*</span> radius <span class="token operator">*</span> radius<span class="token punctuation">;</span>
<span class="token punctuation">&#125;</span></code>` + "";

	let t102;
	let pre4;

	let raw4_value = `<code class="language-js"><span class="token comment">// filename: square.js</span>
<span class="token keyword">export</span> <span class="token keyword">default</span> <span class="token keyword">function</span> <span class="token function">area</span><span class="token punctuation">(</span><span class="token parameter">side</span><span class="token punctuation">)</span> <span class="token punctuation">&#123;</span>
  <span class="token keyword">return</span> side <span class="token operator">*</span> side<span class="token punctuation">;</span>
<span class="token punctuation">&#125;</span></code>` + "";

	let t103;
	let pre5;

	let raw5_value = `<code class="language-js"><span class="token comment">// filename: app.js</span>
<span class="token keyword">import</span> squareArea <span class="token keyword">from</span> <span class="token string">'./square'</span><span class="token punctuation">;</span>
<span class="token keyword">import</span> circleArea <span class="token keyword">from</span> <span class="token string">'./circle'</span><span class="token punctuation">;</span>
console<span class="token punctuation">.</span><span class="token function">log</span><span class="token punctuation">(</span><span class="token string">'Area of square: '</span><span class="token punctuation">,</span> <span class="token function">squareArea</span><span class="token punctuation">(</span><span class="token number">5</span><span class="token punctuation">)</span><span class="token punctuation">)</span><span class="token punctuation">;</span>
console<span class="token punctuation">.</span><span class="token function">log</span><span class="token punctuation">(</span><span class="token string">'Area of circle'</span><span class="token punctuation">,</span> <span class="token function">circleArea</span><span class="token punctuation">(</span><span class="token number">5</span><span class="token punctuation">)</span><span class="token punctuation">)</span><span class="token punctuation">;</span></code>` + "";

	let t104;
	let section3;
	let h30;
	let a19;
	let t105;
	let t106;
	let p15;
	let t107;
	let t108;
	let pre6;

	let raw6_value = `<code class="language-js"><span class="token comment">// filename: webpack-bundle.js</span>
<span class="token keyword">const</span> modules <span class="token operator">=</span> <span class="token punctuation">&#123;</span>
  <span class="token string">'circle.js'</span><span class="token punctuation">:</span> <span class="token keyword">function</span><span class="token punctuation">(</span><span class="token parameter">exports<span class="token punctuation">,</span> require</span><span class="token punctuation">)</span> <span class="token punctuation">&#123;</span>
    <span class="token keyword">const</span> <span class="token constant">PI</span> <span class="token operator">=</span> <span class="token number">3.141</span><span class="token punctuation">;</span>
    exports<span class="token punctuation">.</span><span class="token function-variable function">default</span> <span class="token operator">=</span> <span class="token keyword">function</span> <span class="token function">area</span><span class="token punctuation">(</span><span class="token parameter">radius</span><span class="token punctuation">)</span> <span class="token punctuation">&#123;</span>
      <span class="token keyword">return</span> <span class="token constant">PI</span> <span class="token operator">*</span> radius <span class="token operator">*</span> radius<span class="token punctuation">;</span>
    <span class="token punctuation">&#125;</span>
  <span class="token punctuation">&#125;</span><span class="token punctuation">,</span>
  <span class="token string">'square.js'</span><span class="token punctuation">:</span> <span class="token keyword">function</span><span class="token punctuation">(</span><span class="token parameter">exports<span class="token punctuation">,</span> require</span><span class="token punctuation">)</span> <span class="token punctuation">&#123;</span>
    exports<span class="token punctuation">.</span><span class="token function-variable function">default</span> <span class="token operator">=</span> <span class="token keyword">function</span> <span class="token function">area</span><span class="token punctuation">(</span><span class="token parameter">side</span><span class="token punctuation">)</span> <span class="token punctuation">&#123;</span>
      <span class="token keyword">return</span> side <span class="token operator">*</span> side<span class="token punctuation">;</span>
    <span class="token punctuation">&#125;</span>
  <span class="token punctuation">&#125;</span><span class="token punctuation">,</span>
  <span class="token string">'app.js'</span><span class="token punctuation">:</span> <span class="token keyword">function</span><span class="token punctuation">(</span><span class="token parameter">exports<span class="token punctuation">,</span> require</span><span class="token punctuation">)</span> <span class="token punctuation">&#123;</span>
    <span class="token keyword">const</span> squareArea <span class="token operator">=</span> <span class="token function">require</span><span class="token punctuation">(</span><span class="token string">'square.js'</span><span class="token punctuation">)</span><span class="token punctuation">.</span>default<span class="token punctuation">;</span>
    <span class="token keyword">const</span> circleArea <span class="token operator">=</span> <span class="token function">require</span><span class="token punctuation">(</span><span class="token string">'circle.js'</span><span class="token punctuation">)</span><span class="token punctuation">.</span>default<span class="token punctuation">;</span>
    console<span class="token punctuation">.</span><span class="token function">log</span><span class="token punctuation">(</span><span class="token string">'Area of square: '</span><span class="token punctuation">,</span> <span class="token function">squareArea</span><span class="token punctuation">(</span><span class="token number">5</span><span class="token punctuation">)</span><span class="token punctuation">)</span>
    console<span class="token punctuation">.</span><span class="token function">log</span><span class="token punctuation">(</span><span class="token string">'Area of circle'</span><span class="token punctuation">,</span> <span class="token function">circleArea</span><span class="token punctuation">(</span><span class="token number">5</span><span class="token punctuation">)</span><span class="token punctuation">)</span>
  <span class="token punctuation">&#125;</span>
<span class="token punctuation">&#125;</span>

<span class="token function">webpackStart</span><span class="token punctuation">(</span><span class="token punctuation">&#123;</span>
  modules<span class="token punctuation">,</span>
  entry<span class="token punctuation">:</span> <span class="token string">'app.js'</span>
<span class="token punctuation">&#125;</span><span class="token punctuation">)</span><span class="token punctuation">;</span></code>` + "";

	let t109;
	let p16;
	let em3;
	let t110;
	let t111;
	let p17;
	let t112;
	let strong4;
	let t113;
	let t114;
	let t115;
	let p18;
	let t116;
	let strong5;
	let t117;
	let t118;
	let t119;
	let p19;
	let t120;
	let code4;
	let t121;
	let t122;
	let strong6;
	let t123;
	let t124;
	let em4;
	let t125;
	let t126;
	let t127;
	let pre7;

	let raw7_value = `<code class="language-js"><span class="token comment">// filename: webpack-bundle.js</span>

<span class="token keyword">function</span> <span class="token function">webpackStart</span><span class="token punctuation">(</span><span class="token parameter"><span class="token punctuation">&#123;</span> modules<span class="token punctuation">,</span> entry <span class="token punctuation">&#125;</span></span><span class="token punctuation">)</span> <span class="token punctuation">&#123;</span>
  <span class="token keyword">const</span> moduleCache <span class="token operator">=</span> <span class="token punctuation">&#123;</span><span class="token punctuation">&#125;</span><span class="token punctuation">;</span>
  <span class="token keyword">const</span> <span class="token function-variable function">require</span> <span class="token operator">=</span> <span class="token parameter">moduleName</span> <span class="token operator">=></span> <span class="token punctuation">&#123;</span>
    <span class="token comment">// if in cache, return the cached version</span>
    <span class="token keyword">if</span> <span class="token punctuation">(</span>moduleCache<span class="token punctuation">[</span>moduleName<span class="token punctuation">]</span><span class="token punctuation">)</span> <span class="token punctuation">&#123;</span>
      <span class="token keyword">return</span> moduleCache<span class="token punctuation">[</span>moduleName<span class="token punctuation">]</span><span class="token punctuation">;</span>
    <span class="token punctuation">&#125;</span>
    <span class="token keyword">const</span> exports <span class="token operator">=</span> <span class="token punctuation">&#123;</span><span class="token punctuation">&#125;</span><span class="token punctuation">;</span>
    <span class="token comment">// this will prevent infinite "require" loop</span>
    <span class="token comment">// from circular dependencies</span>
    moduleCache<span class="token punctuation">[</span>moduleName<span class="token punctuation">]</span> <span class="token operator">=</span> exports<span class="token punctuation">;</span>

    <span class="token comment">// "require"-ing the module,</span>
    <span class="token comment">// exported stuff will assigned to "exports"</span>
    modules<span class="token punctuation">[</span>moduleName<span class="token punctuation">]</span><span class="token punctuation">(</span>exports<span class="token punctuation">,</span> require<span class="token punctuation">)</span><span class="token punctuation">;</span>
    <span class="token keyword">return</span> moduleCache<span class="token punctuation">[</span>moduleName<span class="token punctuation">]</span><span class="token punctuation">;</span>
  <span class="token punctuation">&#125;</span><span class="token punctuation">;</span>

  <span class="token comment">// start the program</span>
  <span class="token function">require</span><span class="token punctuation">(</span>entry<span class="token punctuation">)</span><span class="token punctuation">;</span>
<span class="token punctuation">&#125;</span></code>` + "";

	let t128;
	let p20;
	let em5;
	let t129;
	let t130;
	let p21;
	let code5;
	let t131;
	let t132;
	let code6;
	let t133;
	let t134;
	let code7;
	let t135;
	let t136;
	let code8;
	let t137;
	let t138;
	let t139;
	let p22;
	let t140;
	let t141;
	let section4;
	let h31;
	let a20;
	let t142;
	let t143;
	let p23;
	let t144;
	let t145;
	let pre8;

	let raw8_value = `<code class="language-js"><span class="token comment">// filename: rollup-bundle.js</span>
<span class="token keyword">const</span> <span class="token constant">PI</span> <span class="token operator">=</span> <span class="token number">3.141</span><span class="token punctuation">;</span>

<span class="token keyword">function</span> <span class="token function">circle$area</span><span class="token punctuation">(</span><span class="token parameter">radius</span><span class="token punctuation">)</span> <span class="token punctuation">&#123;</span>
  <span class="token keyword">return</span> <span class="token constant">PI</span> <span class="token operator">*</span> radius <span class="token operator">*</span> radius<span class="token punctuation">;</span>
<span class="token punctuation">&#125;</span>

<span class="token keyword">function</span> <span class="token function">square$area</span><span class="token punctuation">(</span><span class="token parameter">side</span><span class="token punctuation">)</span> <span class="token punctuation">&#123;</span>
  <span class="token keyword">return</span> side <span class="token operator">*</span> side<span class="token punctuation">;</span>
<span class="token punctuation">&#125;</span>

console<span class="token punctuation">.</span><span class="token function">log</span><span class="token punctuation">(</span><span class="token string">'Area of square: '</span><span class="token punctuation">,</span> <span class="token function">square$area</span><span class="token punctuation">(</span><span class="token number">5</span><span class="token punctuation">)</span><span class="token punctuation">)</span><span class="token punctuation">;</span>
console<span class="token punctuation">.</span><span class="token function">log</span><span class="token punctuation">(</span><span class="token string">'Area of circle'</span><span class="token punctuation">,</span> <span class="token function">circle$area</span><span class="token punctuation">(</span><span class="token number">5</span><span class="token punctuation">)</span><span class="token punctuation">)</span><span class="token punctuation">;</span></code>` + "";

	let t146;
	let p24;
	let em6;
	let t147;
	let t148;
	let p25;
	let t149;
	let strong7;
	let t150;
	let t151;
	let strong8;
	let t152;
	let t153;
	let t154;
	let p26;
	let t155;
	let em7;
	let t156;
	let t157;
	let p27;
	let t158;
	let strong9;
	let t159;
	let t160;
	let code9;
	let t161;
	let t162;
	let code10;
	let t163;
	let t164;
	let code11;
	let t165;
	let t166;
	let t167;
	let blockquote;
	let p28;
	let em8;
	let t168;
	let code12;
	let t169;
	let t170;
	let a21;
	let t171;
	let t172;
	let t173;
	let p29;
	let t174;
	let strong10;
	let t175;
	let t176;
	let code13;
	let t177;
	let t178;
	let code14;
	let t179;
	let t180;
	let code15;
	let t181;
	let t182;
	let code16;
	let t183;
	let t184;
	let code17;
	let t185;
	let t186;
	let a22;
	let t187;
	let t188;
	let t189;
	let p30;
	let t190;
	let t191;
	let p31;
	let em9;
	let t192;
	let t193;
	let p32;
	let t194;
	let t195;
	let pre9;

	let raw9_value = `<code class="language-js"><span class="token comment">// filename: shape.js</span>
<span class="token keyword">const</span> circle <span class="token operator">=</span> <span class="token function">require</span><span class="token punctuation">(</span><span class="token string">'./circle'</span><span class="token punctuation">)</span><span class="token punctuation">;</span>

module<span class="token punctuation">.</span>exports<span class="token punctuation">.</span><span class="token constant">PI</span> <span class="token operator">=</span> <span class="token number">3.141</span><span class="token punctuation">;</span>

console<span class="token punctuation">.</span><span class="token function">log</span><span class="token punctuation">(</span><span class="token function">circle</span><span class="token punctuation">(</span><span class="token number">5</span><span class="token punctuation">)</span><span class="token punctuation">)</span><span class="token punctuation">;</span></code>` + "";

	let t196;
	let pre10;

	let raw10_value = `<code class="language-js"><span class="token comment">// filename: circle.js</span>
<span class="token keyword">const</span> <span class="token constant">PI</span> <span class="token operator">=</span> <span class="token function">require</span><span class="token punctuation">(</span><span class="token string">'./shape'</span><span class="token punctuation">)</span><span class="token punctuation">;</span>
<span class="token keyword">const</span> _PI <span class="token operator">=</span> <span class="token constant">PI</span> <span class="token operator">*</span> <span class="token number">1</span>
module<span class="token punctuation">.</span><span class="token function-variable function">exports</span> <span class="token operator">=</span> <span class="token keyword">function</span><span class="token punctuation">(</span><span class="token parameter">radius</span><span class="token punctuation">)</span> <span class="token punctuation">&#123;</span>
  <span class="token keyword">return</span> _PI <span class="token operator">*</span> radius <span class="token operator">*</span> radius<span class="token punctuation">;</span>
<span class="token punctuation">&#125;</span></code>` + "";

	let t197;
	let p33;
	let em10;
	let t198;
	let t199;
	let p34;
	let t200;
	let code18;
	let t201;
	let t202;
	let code19;
	let t203;
	let t204;
	let code20;
	let t205;
	let t206;
	let code21;
	let t207;
	let t208;
	let code22;
	let t209;
	let t210;
	let code23;
	let t211;
	let t212;
	let code24;
	let t213;
	let t214;
	let code25;
	let t215;
	let t216;
	let t217;
	let pre11;

	let raw11_value = `<code class="language-js"><span class="token comment">// filename: rollup-bundle.js</span>
<span class="token comment">// cirlce.js first</span>
<span class="token keyword">const</span> _PI <span class="token operator">=</span> <span class="token constant">PI</span> <span class="token operator">*</span> <span class="token number">1</span><span class="token punctuation">;</span> <span class="token comment">// throws ReferenceError: PI is not defined</span>
<span class="token keyword">function</span> <span class="token function">circle$Area</span><span class="token punctuation">(</span><span class="token parameter">radius</span><span class="token punctuation">)</span> <span class="token punctuation">&#123;</span>
  <span class="token keyword">return</span> _PI <span class="token operator">*</span> radius <span class="token operator">*</span> radius<span class="token punctuation">;</span>
<span class="token punctuation">&#125;</span>

<span class="token comment">// shape.js later</span>
<span class="token keyword">const</span> <span class="token constant">PI</span> <span class="token operator">=</span> <span class="token number">3.141</span><span class="token punctuation">;</span>
console<span class="token punctuation">.</span><span class="token function">log</span><span class="token punctuation">(</span><span class="token function">circle$Area</span><span class="token punctuation">(</span><span class="token number">5</span><span class="token punctuation">)</span><span class="token punctuation">)</span><span class="token punctuation">;</span></code>` + "";

	let t218;
	let p35;
	let t219;
	let t220;
	let p36;
	let t221;
	let strong11;
	let t222;
	let t223;
	let t224;
	let p37;
	let t225;
	let strong12;
	let t226;
	let t227;
	let t228;
	let p38;
	let t229;
	let code26;
	let t230;
	let t231;
	let t232;
	let pre12;

	let raw12_value = `<code class="language-js"><span class="token comment">// filename: circle.js</span>
<span class="token keyword">const</span> <span class="token constant">PI</span> <span class="token operator">=</span> <span class="token function">require</span><span class="token punctuation">(</span><span class="token string">'./shape'</span><span class="token punctuation">)</span><span class="token punctuation">;</span>
<span class="token keyword">const</span> <span class="token function-variable function">_PI</span> <span class="token operator">=</span> <span class="token punctuation">(</span><span class="token punctuation">)</span> <span class="token operator">=></span> <span class="token constant">PI</span> <span class="token operator">*</span> <span class="token number">1</span><span class="token punctuation">;</span> <span class="token comment">// to be lazily evaluated</span>
module<span class="token punctuation">.</span><span class="token function-variable function">exports</span> <span class="token operator">=</span> <span class="token keyword">function</span><span class="token punctuation">(</span><span class="token parameter">radius</span><span class="token punctuation">)</span> <span class="token punctuation">&#123;</span>
  <span class="token keyword">return</span> <span class="token function">_PI</span><span class="token punctuation">(</span><span class="token punctuation">)</span> <span class="token operator">*</span> radius <span class="token operator">*</span> radius<span class="token punctuation">;</span>
<span class="token punctuation">&#125;</span></code>` + "";

	let t233;
	let p39;
	let t234;
	let t235;
	let pre13;

	let raw13_value = `<code class="language-js"><span class="token comment">// filename: rollup-bundle.js</span>
<span class="token comment">// cirlce.js first</span>
<span class="token keyword">const</span> <span class="token function-variable function">_PI</span> <span class="token operator">=</span> <span class="token punctuation">(</span><span class="token punctuation">)</span> <span class="token operator">=></span> <span class="token constant">PI</span> <span class="token operator">*</span> <span class="token number">1</span><span class="token punctuation">;</span>
<span class="token keyword">function</span> <span class="token function">circle$Area</span><span class="token punctuation">(</span><span class="token parameter">radius</span><span class="token punctuation">)</span> <span class="token punctuation">&#123;</span>
  <span class="token keyword">return</span> <span class="token function">_PI</span><span class="token punctuation">(</span><span class="token punctuation">)</span> <span class="token operator">*</span> radius <span class="token operator">*</span> radius<span class="token punctuation">;</span>
<span class="token punctuation">&#125;</span>

<span class="token comment">// shape.js later</span>
<span class="token keyword">const</span> <span class="token constant">PI</span> <span class="token operator">=</span> <span class="token number">3.141</span><span class="token punctuation">;</span>
console<span class="token punctuation">.</span><span class="token function">log</span><span class="token punctuation">(</span><span class="token function">circle$Area</span><span class="token punctuation">(</span><span class="token number">5</span><span class="token punctuation">)</span><span class="token punctuation">)</span><span class="token punctuation">;</span> <span class="token comment">// prints 78.525</span></code>` + "";

	let t236;
	let p40;
	let t237;
	let code27;
	let t238;
	let t239;
	let code28;
	let t240;
	let t241;
	let t242;
	let section5;
	let h22;
	let a23;
	let t243;
	let t244;
	let p41;
	let t245;
	let t246;
	let ul8;
	let li16;
	let em11;
	let t247;
	let t248;
	let t249;
	let li17;
	let t250;
	let code29;
	let t251;
	let t252;
	let code30;
	let t253;
	let t254;
	let li21;
	let t255;
	let ul6;
	let li18;
	let t256;
	let t257;
	let li19;
	let t258;
	let t259;
	let li20;
	let t260;
	let t261;
	let li26;
	let t262;
	let ul7;
	let li22;
	let t263;
	let t264;
	let li23;
	let t265;
	let t266;
	let li24;
	let t267;
	let t268;
	let li25;
	let t269;
	let t270;
	let section6;
	let h23;
	let a24;
	let t271;
	let t272;
	let ul9;
	let li27;
	let a25;
	let t273;
	let t274;
	let li28;
	let a26;
	let t275;

	return {
		c() {
			section0 = element("section");
			ul1 = element("ul");
			li0 = element("li");
			a0 = element("a");
			t0 = text("What is a Module Bundler?");
			li1 = element("li");
			a1 = element("a");
			t1 = text("How do we bundle?");
			ul0 = element("ul");
			li2 = element("li");
			a2 = element("a");
			t2 = text("The \"webpack way\"");
			li3 = element("li");
			a3 = element("a");
			t3 = text("The \"rollup way\"");
			li4 = element("li");
			a4 = element("a");
			t4 = text("Summary");
			li5 = element("li");
			a5 = element("a");
			t5 = text("References");
			t6 = space();
			section1 = element("section");
			h20 = element("h2");
			a6 = element("a");
			t7 = text("What is a Module Bundler?");
			t8 = space();
			p0 = element("p");
			img = element("img");
			t9 = space();
			p1 = element("p");
			t10 = text("Module bundlers are tools frontend developers used to bundle ");
			a7 = element("a");
			t11 = text("JavaScript modules");
			t12 = text(" into a single JavaScript files that can be executed in the browser.");
			t13 = space();
			p2 = element("p");
			t14 = text("Examples of modern module bundlers ");
			em0 = element("em");
			t15 = text("(in no particular order)");
			t16 = text(" are: ");
			a8 = element("a");
			t17 = text("webpack");
			t18 = text(", ");
			a9 = element("a");
			t19 = text("rollup");
			t20 = text(", ");
			a10 = element("a");
			t21 = text("fusebox");
			t22 = text(", ");
			a11 = element("a");
			t23 = text("parcel");
			t24 = text(", etc.");
			t25 = space();
			p3 = element("p");
			t26 = text("Module bundler is required because:");
			t27 = space();
			ul2 = element("ul");
			li6 = element("li");
			t28 = text("Browser does not support module system, ");
			a12 = element("a");
			t29 = text("although this is not entirely true nowadays");
			t30 = space();
			li7 = element("li");
			t31 = text("It helps you manage the dependency relationship of your code, it will load modules in dependency order for you.");
			t32 = space();
			li8 = element("li");
			t33 = text("It helps you to load your assets in dependency order, image asset, css asset, etc.");
			t34 = space();
			p4 = element("p");
			t35 = text("To illustrate, imagine you are building a web application, which is made up of multiple JavaScript files. You add JavaScript files into html via script tags:");
			t36 = space();
			pre0 = element("pre");
			t37 = space();
			p5 = element("p");
			t38 = text("Each file requires a separate http requests, which is 5 round trip requests in order to get your application started. So it would be better if you can combine all 5 files into 1:");
			t39 = space();
			pre1 = element("pre");
			t40 = space();
			i = element("i");
			t41 = text("(Although with [HTTP/2](https://developers.google.com/web/fundamentals/performance/http2/), this is much less of a case right now)");
			t42 = space();
			p6 = element("p");
			t43 = text("So how do we generate the ");
			code0 = element("code");
			t44 = text("dist/bundle.js");
			t45 = text("?");
			t46 = space();
			p7 = element("p");
			t47 = text("Several challenges arise in the process:");
			t48 = space();
			ul4 = element("ul");
			li10 = element("li");
			t49 = text("How do we ");
			strong0 = element("strong");
			t50 = text("maintain the order");
			t51 = text(" of the \"files\" to be included?");
			ul3 = element("ul");
			li9 = element("li");
			t52 = text("It would be great that it is some sort of dependency order amongst the \"files\"");
			t53 = space();
			li11 = element("li");
			t54 = text("How do we ");
			strong1 = element("strong");
			t55 = text("prevent naming conflicts");
			t56 = text(" between \"files\"?");
			t57 = space();
			li12 = element("li");
			t58 = text("How do we determine any unused \"file\" within the bundle?");
			t59 = space();
			p8 = element("p");
			t60 = text("All of these can be solved if we know the relationship amongst each files, such as:");
			t61 = space();
			ul5 = element("ul");
			li13 = element("li");
			t62 = text("Which file is depended on another?");
			t63 = space();
			li14 = element("li");
			t64 = text("What are the interface exposed from a file? and");
			t65 = space();
			li15 = element("li");
			t66 = text("Which exposed interfaces are being used by another?");
			t67 = space();
			p9 = element("p");
			t68 = text("These information, granted, can solve the challenges brought up respectively. So, what we need is a declarative method to describe the relationship between files, which led us to the ");
			a13 = element("a");
			t69 = text("JavaScript Module System");
			t70 = text(".");
			t71 = space();
			p10 = element("p");
			a14 = element("a");
			t72 = text("CommonJS");
			t73 = text(" or ");
			a15 = element("a");
			t74 = text("ES6 Modules");
			t75 = text(" provides way for us to specify what files we are dependening on, and which of their interface we are using in our file.");
			t76 = space();
			pre2 = element("pre");
			t77 = space();
			section2 = element("section");
			h21 = element("h2");
			a16 = element("a");
			t78 = text("How do we bundle?");
			t79 = space();
			p11 = element("p");
			t80 = text("With the information gathered from the module system, how do we link the files together and generate the bundle file that encapsulates everything?");
			t81 = space();
			p12 = element("p");
			t82 = text("If you scrutinize the bundle generated by ");
			a17 = element("a");
			t83 = text("webpack");
			t84 = text(" and ");
			a18 = element("a");
			t85 = text("rollup");
			t86 = text(", you would notice that the 2 most popular bundler takes a totally different approach in bundling, and here I coined them, the ");
			em1 = element("em");
			strong2 = element("strong");
			t87 = text("\"webpack way\"");
			t88 = text(" and the ");
			em2 = element("em");
			strong3 = element("strong");
			t89 = text("\"rollup way\"");
			t90 = text(".");
			t91 = space();
			p13 = element("p");
			t92 = text("Let's illustrate this with an example:");
			t93 = space();
			p14 = element("p");
			t94 = text("Say you have 3 files, ");
			code1 = element("code");
			t95 = text("circle.js");
			t96 = text(", ");
			code2 = element("code");
			t97 = text("square.js");
			t98 = text(" and ");
			code3 = element("code");
			t99 = text("app.js");
			t100 = text(":");
			t101 = space();
			pre3 = element("pre");
			t102 = space();
			pre4 = element("pre");
			t103 = space();
			pre5 = element("pre");
			t104 = space();
			section3 = element("section");
			h30 = element("h3");
			a19 = element("a");
			t105 = text("The \"webpack way\"");
			t106 = space();
			p15 = element("p");
			t107 = text("What would be the \"webpack way\" bundle looks like?");
			t108 = space();
			pre6 = element("pre");
			t109 = space();
			p16 = element("p");
			em3 = element("em");
			t110 = text("I have made some slight modifications for easier illustration");
			t111 = space();
			p17 = element("p");
			t112 = text("First thing you would notice is the ");
			strong4 = element("strong");
			t113 = text("\"module map\"");
			t114 = text(". It is a dictionary that maps the module name to the module itself, which is wrapped by a function. The \"module map\" is like a registry, it makes it easy to register modules by adding entries.");
			t115 = space();
			p18 = element("p");
			t116 = text("Secondly, ");
			strong5 = element("strong");
			t117 = text("each module is wrapped by a function");
			t118 = text(". The function simulates the module scope, where everything declared within the module is scoped within itself. The function itself is called the \"module factory function\". As you can see, it takes in a few parameters, to allow the module to exports its interface, as well as to require from other modules.");
			t119 = space();
			p19 = element("p");
			t120 = text("Thirdly, the application is start via ");
			code4 = element("code");
			t121 = text("webpackStart");
			t122 = text(", which is ");
			strong6 = element("strong");
			t123 = text("a function that glues everything together");
			t124 = text(". The function itself, often called as the ");
			em4 = element("em");
			t125 = text("\"runtime\"");
			t126 = text(", is the most important piece of the bundle. It uses the \"module map\" and the entry module to start the application.");
			t127 = space();
			pre7 = element("pre");
			t128 = space();
			p20 = element("p");
			em5 = element("em");
			t129 = text("I have made some slight modifications for easier illustration");
			t130 = space();
			p21 = element("p");
			code5 = element("code");
			t131 = text("webpackStart");
			t132 = text(" defines 2 things, the \"require\" function and the module cache. The \"require\" function is not the same as the ");
			code6 = element("code");
			t133 = text("require");
			t134 = text(" from CommonJS. \"require\" takes in the module name, and returns the exported interface from a module, eg: for ");
			code7 = element("code");
			t135 = text("circle.js");
			t136 = text(" it would be ");
			code8 = element("code");
			t137 = text("{ default: function area(radius){ ... } }");
			t138 = text(". The exported interface is cached in the module cache, so that if we call \"require\" of the same module name repeatedly, the \"module factory function\" will only be executed once.");
			t139 = space();
			p22 = element("p");
			t140 = text("With \"require\" defined, starting the application would be just \"require\"ing the entry module.");
			t141 = space();
			section4 = element("section");
			h31 = element("h3");
			a20 = element("a");
			t142 = text("The \"rollup way\"");
			t143 = space();
			p23 = element("p");
			t144 = text("Now you've seen how webpack bundle looked like, let's take a look at the \"rollup way\" bundle:");
			t145 = space();
			pre8 = element("pre");
			t146 = space();
			p24 = element("p");
			em6 = element("em");
			t147 = text("I have made some slight modifications for easier illustration");
			t148 = space();
			p25 = element("p");
			t149 = text("Firstly, the key difference in the rollup bundle, is that it is much smaller compared to the webpack bundle. There is ");
			strong7 = element("strong");
			t150 = text("no module map");
			t151 = text(", as compared to the \"webpack way\". All the modules are ");
			strong8 = element("strong");
			t152 = text("\"flatten\" into the bundle");
			t153 = text(". There is no function wrapping of modules. All the variables/functions that were declared within the module, is now declared into the global scope.");
			t154 = space();
			p26 = element("p");
			t155 = text("If everything declared in individual module scope is now declared into the global scope, ");
			em7 = element("em");
			t156 = text("what happened if 2 modules declare variable/function of the same name?");
			t157 = space();
			p27 = element("p");
			t158 = text("Well, rollup will ");
			strong9 = element("strong");
			t159 = text("rename the variable/function name");
			t160 = text(", such that name collision do not happen. In our example, both ");
			code9 = element("code");
			t161 = text("circle.js");
			t162 = text(" and ");
			code10 = element("code");
			t163 = text("square.js");
			t164 = text(" have declared ");
			code11 = element("code");
			t165 = text("function area(){}");
			t166 = text(" within the module, when bundled, you see that both functions and their usage were renamed to avoid collision.");
			t167 = space();
			blockquote = element("blockquote");
			p28 = element("p");
			em8 = element("em");
			t168 = text("One of the side effects of not wrapping module with a function is the behavior of ");
			code12 = element("code");
			t169 = text("eval");
			t170 = text(", see ");
			a21 = element("a");
			t171 = text("here");
			t172 = text(" for more in-depth explanation");
			t173 = space();
			p29 = element("p");
			t174 = text("Secondly, ");
			strong10 = element("strong");
			t175 = text("the order of the modules within the bundle matters");
			t176 = text(". Well you can argue that ");
			code13 = element("code");
			t177 = text("circle$area");
			t178 = text(" and ");
			code14 = element("code");
			t179 = text("square$area");
			t180 = text(" can come after ");
			code15 = element("code");
			t181 = text("console.log");
			t182 = text(" and it will still work, yet ");
			code16 = element("code");
			t183 = text("PI");
			t184 = text(" has to be declared before the ");
			code17 = element("code");
			t185 = text("console.log");
			t186 = text(", because of ");
			a22 = element("a");
			t187 = text("temporal dead zone");
			t188 = text(". So, sorting modules in order of their dependency matters for the \"rollup way\".");
			t189 = space();
			p30 = element("p");
			t190 = text("All in all, the \"rollup way\" seemed to be better than the \"webpack way\". It has a smaller bundle and less runtime overhead by removing all the functions.");
			t191 = space();
			p31 = element("p");
			em9 = element("em");
			t192 = text("Is there a drawback of the \"rollup way\"?");
			t193 = space();
			p32 = element("p");
			t194 = text("Well, sometimes it does not work well with circular dependency. Let's take a look at this contrived example:");
			t195 = space();
			pre9 = element("pre");
			t196 = space();
			pre10 = element("pre");
			t197 = space();
			p33 = element("p");
			em10 = element("em");
			t198 = text("I have made some slight modifications for easier illustration");
			t199 = space();
			p34 = element("p");
			t200 = text("In this example ");
			code18 = element("code");
			t201 = text("shape.js");
			t202 = text(" is depending on ");
			code19 = element("code");
			t203 = text("circle.js");
			t204 = text(" and ");
			code20 = element("code");
			t205 = text("circle.js");
			t206 = text(" is depending on ");
			code21 = element("code");
			t207 = text("shape.js");
			t208 = text(". So, for rollup to sort out which module to come first than another in the output bundle, there's no \"correct\" answer for it. Either ");
			code22 = element("code");
			t209 = text("circle.js");
			t210 = text(" then ");
			code23 = element("code");
			t211 = text("shape.js");
			t212 = text(" or ");
			code24 = element("code");
			t213 = text("shape.js");
			t214 = text(" then ");
			code25 = element("code");
			t215 = text("circle.js");
			t216 = text(" is reasonable. So, you could possibly get the following output bundle:");
			t217 = space();
			pre11 = element("pre");
			t218 = space();
			p35 = element("p");
			t219 = text("You can tell this will be problematic right?");
			t220 = space();
			p36 = element("p");
			t221 = text("Is there a solution for this? A short answer is ");
			strong11 = element("strong");
			t222 = text("no");
			t223 = text(".");
			t224 = space();
			p37 = element("p");
			t225 = text("A \"simple\" fix is to not use a circular dependency. Rollup will ");
			strong12 = element("strong");
			t226 = text("throw warnings at you");
			t227 = text(" if it encountered one.");
			t228 = space();
			p38 = element("p");
			t229 = text("Well, what makes the example \"works\" is that we have statements that are immediately evaluated within the module. If we change the evaluation of ");
			code26 = element("code");
			t230 = text("_PI");
			t231 = text(" to be lazy:");
			t232 = space();
			pre12 = element("pre");
			t233 = space();
			p39 = element("p");
			t234 = text("the order of modules now does not really matter much:");
			t235 = space();
			pre13 = element("pre");
			t236 = space();
			p40 = element("p");
			t237 = text("This is because at the time ");
			code27 = element("code");
			t238 = text("_PI");
			t239 = text(" is evaluated, ");
			code28 = element("code");
			t240 = text("PI");
			t241 = text(" has already been defined.");
			t242 = space();
			section5 = element("section");
			h22 = element("h2");
			a23 = element("a");
			t243 = text("Summary");
			t244 = space();
			p41 = element("p");
			t245 = text("So, let's summarize what we've learned so far:");
			t246 = space();
			ul8 = element("ul");
			li16 = element("li");
			em11 = element("em");
			t247 = text("Module bundler");
			t248 = text(" helped us to combine multiple JavaScript modules into 1 JavaScript file.");
			t249 = space();
			li17 = element("li");
			t250 = text("Different bundler bundles differently, and we've looked into 2 of the modern bundler, ");
			code29 = element("code");
			t251 = text("webpack");
			t252 = text(" and ");
			code30 = element("code");
			t253 = text("rollup");
			t254 = space();
			li21 = element("li");
			t255 = text("the \"webpack way\":");
			ul6 = element("ul");
			li18 = element("li");
			t256 = text("uses module map");
			t257 = space();
			li19 = element("li");
			t258 = text("uses function to wrap each module");
			t259 = space();
			li20 = element("li");
			t260 = text("has a runtime code that glues the module together");
			t261 = space();
			li26 = element("li");
			t262 = text("the \"rollup way\":");
			ul7 = element("ul");
			li22 = element("li");
			t263 = text("flatter and smaller bundle");
			t264 = space();
			li23 = element("li");
			t265 = text("does not use function to wrap module");
			t266 = space();
			li24 = element("li");
			t267 = text("order matters, require sorting based on dependency");
			t268 = space();
			li25 = element("li");
			t269 = text("circular dependency may not work");
			t270 = space();
			section6 = element("section");
			h23 = element("h2");
			a24 = element("a");
			t271 = text("References");
			t272 = space();
			ul9 = element("ul");
			li27 = element("li");
			a25 = element("a");
			t273 = text("Webpack");
			t274 = space();
			li28 = element("li");
			a26 = element("a");
			t275 = text("Rollup");
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
			t0 = claim_text(a0_nodes, "What is a Module Bundler?");
			a0_nodes.forEach(detach);
			li0_nodes.forEach(detach);
			li1 = claim_element(ul1_nodes, "LI", {});
			var li1_nodes = children(li1);
			a1 = claim_element(li1_nodes, "A", { href: true });
			var a1_nodes = children(a1);
			t1 = claim_text(a1_nodes, "How do we bundle?");
			a1_nodes.forEach(detach);
			li1_nodes.forEach(detach);
			ul0 = claim_element(ul1_nodes, "UL", {});
			var ul0_nodes = children(ul0);
			li2 = claim_element(ul0_nodes, "LI", {});
			var li2_nodes = children(li2);
			a2 = claim_element(li2_nodes, "A", { href: true });
			var a2_nodes = children(a2);
			t2 = claim_text(a2_nodes, "The \"webpack way\"");
			a2_nodes.forEach(detach);
			li2_nodes.forEach(detach);
			li3 = claim_element(ul0_nodes, "LI", {});
			var li3_nodes = children(li3);
			a3 = claim_element(li3_nodes, "A", { href: true });
			var a3_nodes = children(a3);
			t3 = claim_text(a3_nodes, "The \"rollup way\"");
			a3_nodes.forEach(detach);
			li3_nodes.forEach(detach);
			ul0_nodes.forEach(detach);
			li4 = claim_element(ul1_nodes, "LI", {});
			var li4_nodes = children(li4);
			a4 = claim_element(li4_nodes, "A", { href: true });
			var a4_nodes = children(a4);
			t4 = claim_text(a4_nodes, "Summary");
			a4_nodes.forEach(detach);
			li4_nodes.forEach(detach);
			li5 = claim_element(ul1_nodes, "LI", {});
			var li5_nodes = children(li5);
			a5 = claim_element(li5_nodes, "A", { href: true });
			var a5_nodes = children(a5);
			t5 = claim_text(a5_nodes, "References");
			a5_nodes.forEach(detach);
			li5_nodes.forEach(detach);
			ul1_nodes.forEach(detach);
			section0_nodes.forEach(detach);
			t6 = claim_space(nodes);
			section1 = claim_element(nodes, "SECTION", {});
			var section1_nodes = children(section1);
			h20 = claim_element(section1_nodes, "H2", {});
			var h20_nodes = children(h20);
			a6 = claim_element(h20_nodes, "A", { href: true, id: true });
			var a6_nodes = children(a6);
			t7 = claim_text(a6_nodes, "What is a Module Bundler?");
			a6_nodes.forEach(detach);
			h20_nodes.forEach(detach);
			t8 = claim_space(section1_nodes);
			p0 = claim_element(section1_nodes, "P", {});
			var p0_nodes = children(p0);
			img = claim_element(p0_nodes, "IMG", { src: true, alt: true, title: true });
			p0_nodes.forEach(detach);
			t9 = claim_space(section1_nodes);
			p1 = claim_element(section1_nodes, "P", {});
			var p1_nodes = children(p1);
			t10 = claim_text(p1_nodes, "Module bundlers are tools frontend developers used to bundle ");
			a7 = claim_element(p1_nodes, "A", { href: true, rel: true });
			var a7_nodes = children(a7);
			t11 = claim_text(a7_nodes, "JavaScript modules");
			a7_nodes.forEach(detach);
			t12 = claim_text(p1_nodes, " into a single JavaScript files that can be executed in the browser.");
			p1_nodes.forEach(detach);
			t13 = claim_space(section1_nodes);
			p2 = claim_element(section1_nodes, "P", {});
			var p2_nodes = children(p2);
			t14 = claim_text(p2_nodes, "Examples of modern module bundlers ");
			em0 = claim_element(p2_nodes, "EM", {});
			var em0_nodes = children(em0);
			t15 = claim_text(em0_nodes, "(in no particular order)");
			em0_nodes.forEach(detach);
			t16 = claim_text(p2_nodes, " are: ");
			a8 = claim_element(p2_nodes, "A", { href: true, rel: true });
			var a8_nodes = children(a8);
			t17 = claim_text(a8_nodes, "webpack");
			a8_nodes.forEach(detach);
			t18 = claim_text(p2_nodes, ", ");
			a9 = claim_element(p2_nodes, "A", { href: true, rel: true });
			var a9_nodes = children(a9);
			t19 = claim_text(a9_nodes, "rollup");
			a9_nodes.forEach(detach);
			t20 = claim_text(p2_nodes, ", ");
			a10 = claim_element(p2_nodes, "A", { href: true, rel: true });
			var a10_nodes = children(a10);
			t21 = claim_text(a10_nodes, "fusebox");
			a10_nodes.forEach(detach);
			t22 = claim_text(p2_nodes, ", ");
			a11 = claim_element(p2_nodes, "A", { href: true, rel: true });
			var a11_nodes = children(a11);
			t23 = claim_text(a11_nodes, "parcel");
			a11_nodes.forEach(detach);
			t24 = claim_text(p2_nodes, ", etc.");
			p2_nodes.forEach(detach);
			t25 = claim_space(section1_nodes);
			p3 = claim_element(section1_nodes, "P", {});
			var p3_nodes = children(p3);
			t26 = claim_text(p3_nodes, "Module bundler is required because:");
			p3_nodes.forEach(detach);
			t27 = claim_space(section1_nodes);
			ul2 = claim_element(section1_nodes, "UL", {});
			var ul2_nodes = children(ul2);
			li6 = claim_element(ul2_nodes, "LI", {});
			var li6_nodes = children(li6);
			t28 = claim_text(li6_nodes, "Browser does not support module system, ");
			a12 = claim_element(li6_nodes, "A", { href: true, rel: true });
			var a12_nodes = children(a12);
			t29 = claim_text(a12_nodes, "although this is not entirely true nowadays");
			a12_nodes.forEach(detach);
			li6_nodes.forEach(detach);
			t30 = claim_space(ul2_nodes);
			li7 = claim_element(ul2_nodes, "LI", {});
			var li7_nodes = children(li7);
			t31 = claim_text(li7_nodes, "It helps you manage the dependency relationship of your code, it will load modules in dependency order for you.");
			li7_nodes.forEach(detach);
			t32 = claim_space(ul2_nodes);
			li8 = claim_element(ul2_nodes, "LI", {});
			var li8_nodes = children(li8);
			t33 = claim_text(li8_nodes, "It helps you to load your assets in dependency order, image asset, css asset, etc.");
			li8_nodes.forEach(detach);
			ul2_nodes.forEach(detach);
			t34 = claim_space(section1_nodes);
			p4 = claim_element(section1_nodes, "P", {});
			var p4_nodes = children(p4);
			t35 = claim_text(p4_nodes, "To illustrate, imagine you are building a web application, which is made up of multiple JavaScript files. You add JavaScript files into html via script tags:");
			p4_nodes.forEach(detach);
			t36 = claim_space(section1_nodes);
			pre0 = claim_element(section1_nodes, "PRE", { class: true });
			var pre0_nodes = children(pre0);
			pre0_nodes.forEach(detach);
			t37 = claim_space(section1_nodes);
			p5 = claim_element(section1_nodes, "P", {});
			var p5_nodes = children(p5);
			t38 = claim_text(p5_nodes, "Each file requires a separate http requests, which is 5 round trip requests in order to get your application started. So it would be better if you can combine all 5 files into 1:");
			p5_nodes.forEach(detach);
			t39 = claim_space(section1_nodes);
			pre1 = claim_element(section1_nodes, "PRE", { class: true });
			var pre1_nodes = children(pre1);
			pre1_nodes.forEach(detach);
			t40 = claim_space(section1_nodes);
			i = claim_element(section1_nodes, "I", {});
			var i_nodes = children(i);
			t41 = claim_text(i_nodes, "(Although with [HTTP/2](https://developers.google.com/web/fundamentals/performance/http2/), this is much less of a case right now)");
			i_nodes.forEach(detach);
			t42 = claim_space(section1_nodes);
			p6 = claim_element(section1_nodes, "P", {});
			var p6_nodes = children(p6);
			t43 = claim_text(p6_nodes, "So how do we generate the ");
			code0 = claim_element(p6_nodes, "CODE", {});
			var code0_nodes = children(code0);
			t44 = claim_text(code0_nodes, "dist/bundle.js");
			code0_nodes.forEach(detach);
			t45 = claim_text(p6_nodes, "?");
			p6_nodes.forEach(detach);
			t46 = claim_space(section1_nodes);
			p7 = claim_element(section1_nodes, "P", {});
			var p7_nodes = children(p7);
			t47 = claim_text(p7_nodes, "Several challenges arise in the process:");
			p7_nodes.forEach(detach);
			t48 = claim_space(section1_nodes);
			ul4 = claim_element(section1_nodes, "UL", {});
			var ul4_nodes = children(ul4);
			li10 = claim_element(ul4_nodes, "LI", {});
			var li10_nodes = children(li10);
			t49 = claim_text(li10_nodes, "How do we ");
			strong0 = claim_element(li10_nodes, "STRONG", {});
			var strong0_nodes = children(strong0);
			t50 = claim_text(strong0_nodes, "maintain the order");
			strong0_nodes.forEach(detach);
			t51 = claim_text(li10_nodes, " of the \"files\" to be included?");
			ul3 = claim_element(li10_nodes, "UL", {});
			var ul3_nodes = children(ul3);
			li9 = claim_element(ul3_nodes, "LI", {});
			var li9_nodes = children(li9);
			t52 = claim_text(li9_nodes, "It would be great that it is some sort of dependency order amongst the \"files\"");
			li9_nodes.forEach(detach);
			ul3_nodes.forEach(detach);
			li10_nodes.forEach(detach);
			t53 = claim_space(ul4_nodes);
			li11 = claim_element(ul4_nodes, "LI", {});
			var li11_nodes = children(li11);
			t54 = claim_text(li11_nodes, "How do we ");
			strong1 = claim_element(li11_nodes, "STRONG", {});
			var strong1_nodes = children(strong1);
			t55 = claim_text(strong1_nodes, "prevent naming conflicts");
			strong1_nodes.forEach(detach);
			t56 = claim_text(li11_nodes, " between \"files\"?");
			li11_nodes.forEach(detach);
			t57 = claim_space(ul4_nodes);
			li12 = claim_element(ul4_nodes, "LI", {});
			var li12_nodes = children(li12);
			t58 = claim_text(li12_nodes, "How do we determine any unused \"file\" within the bundle?");
			li12_nodes.forEach(detach);
			ul4_nodes.forEach(detach);
			t59 = claim_space(section1_nodes);
			p8 = claim_element(section1_nodes, "P", {});
			var p8_nodes = children(p8);
			t60 = claim_text(p8_nodes, "All of these can be solved if we know the relationship amongst each files, such as:");
			p8_nodes.forEach(detach);
			t61 = claim_space(section1_nodes);
			ul5 = claim_element(section1_nodes, "UL", {});
			var ul5_nodes = children(ul5);
			li13 = claim_element(ul5_nodes, "LI", {});
			var li13_nodes = children(li13);
			t62 = claim_text(li13_nodes, "Which file is depended on another?");
			li13_nodes.forEach(detach);
			t63 = claim_space(ul5_nodes);
			li14 = claim_element(ul5_nodes, "LI", {});
			var li14_nodes = children(li14);
			t64 = claim_text(li14_nodes, "What are the interface exposed from a file? and");
			li14_nodes.forEach(detach);
			t65 = claim_space(ul5_nodes);
			li15 = claim_element(ul5_nodes, "LI", {});
			var li15_nodes = children(li15);
			t66 = claim_text(li15_nodes, "Which exposed interfaces are being used by another?");
			li15_nodes.forEach(detach);
			ul5_nodes.forEach(detach);
			t67 = claim_space(section1_nodes);
			p9 = claim_element(section1_nodes, "P", {});
			var p9_nodes = children(p9);
			t68 = claim_text(p9_nodes, "These information, granted, can solve the challenges brought up respectively. So, what we need is a declarative method to describe the relationship between files, which led us to the ");
			a13 = claim_element(p9_nodes, "A", { href: true, rel: true });
			var a13_nodes = children(a13);
			t69 = claim_text(a13_nodes, "JavaScript Module System");
			a13_nodes.forEach(detach);
			t70 = claim_text(p9_nodes, ".");
			p9_nodes.forEach(detach);
			t71 = claim_space(section1_nodes);
			p10 = claim_element(section1_nodes, "P", {});
			var p10_nodes = children(p10);
			a14 = claim_element(p10_nodes, "A", { href: true, rel: true });
			var a14_nodes = children(a14);
			t72 = claim_text(a14_nodes, "CommonJS");
			a14_nodes.forEach(detach);
			t73 = claim_text(p10_nodes, " or ");
			a15 = claim_element(p10_nodes, "A", { href: true, rel: true });
			var a15_nodes = children(a15);
			t74 = claim_text(a15_nodes, "ES6 Modules");
			a15_nodes.forEach(detach);
			t75 = claim_text(p10_nodes, " provides way for us to specify what files we are dependening on, and which of their interface we are using in our file.");
			p10_nodes.forEach(detach);
			t76 = claim_space(section1_nodes);
			pre2 = claim_element(section1_nodes, "PRE", { class: true });
			var pre2_nodes = children(pre2);
			pre2_nodes.forEach(detach);
			section1_nodes.forEach(detach);
			t77 = claim_space(nodes);
			section2 = claim_element(nodes, "SECTION", {});
			var section2_nodes = children(section2);
			h21 = claim_element(section2_nodes, "H2", {});
			var h21_nodes = children(h21);
			a16 = claim_element(h21_nodes, "A", { href: true, id: true });
			var a16_nodes = children(a16);
			t78 = claim_text(a16_nodes, "How do we bundle?");
			a16_nodes.forEach(detach);
			h21_nodes.forEach(detach);
			t79 = claim_space(section2_nodes);
			p11 = claim_element(section2_nodes, "P", {});
			var p11_nodes = children(p11);
			t80 = claim_text(p11_nodes, "With the information gathered from the module system, how do we link the files together and generate the bundle file that encapsulates everything?");
			p11_nodes.forEach(detach);
			t81 = claim_space(section2_nodes);
			p12 = claim_element(section2_nodes, "P", {});
			var p12_nodes = children(p12);
			t82 = claim_text(p12_nodes, "If you scrutinize the bundle generated by ");
			a17 = claim_element(p12_nodes, "A", { href: true, rel: true });
			var a17_nodes = children(a17);
			t83 = claim_text(a17_nodes, "webpack");
			a17_nodes.forEach(detach);
			t84 = claim_text(p12_nodes, " and ");
			a18 = claim_element(p12_nodes, "A", { href: true, rel: true });
			var a18_nodes = children(a18);
			t85 = claim_text(a18_nodes, "rollup");
			a18_nodes.forEach(detach);
			t86 = claim_text(p12_nodes, ", you would notice that the 2 most popular bundler takes a totally different approach in bundling, and here I coined them, the ");
			em1 = claim_element(p12_nodes, "EM", {});
			var em1_nodes = children(em1);
			strong2 = claim_element(em1_nodes, "STRONG", {});
			var strong2_nodes = children(strong2);
			t87 = claim_text(strong2_nodes, "\"webpack way\"");
			strong2_nodes.forEach(detach);
			em1_nodes.forEach(detach);
			t88 = claim_text(p12_nodes, " and the ");
			em2 = claim_element(p12_nodes, "EM", {});
			var em2_nodes = children(em2);
			strong3 = claim_element(em2_nodes, "STRONG", {});
			var strong3_nodes = children(strong3);
			t89 = claim_text(strong3_nodes, "\"rollup way\"");
			strong3_nodes.forEach(detach);
			em2_nodes.forEach(detach);
			t90 = claim_text(p12_nodes, ".");
			p12_nodes.forEach(detach);
			t91 = claim_space(section2_nodes);
			p13 = claim_element(section2_nodes, "P", {});
			var p13_nodes = children(p13);
			t92 = claim_text(p13_nodes, "Let's illustrate this with an example:");
			p13_nodes.forEach(detach);
			t93 = claim_space(section2_nodes);
			p14 = claim_element(section2_nodes, "P", {});
			var p14_nodes = children(p14);
			t94 = claim_text(p14_nodes, "Say you have 3 files, ");
			code1 = claim_element(p14_nodes, "CODE", {});
			var code1_nodes = children(code1);
			t95 = claim_text(code1_nodes, "circle.js");
			code1_nodes.forEach(detach);
			t96 = claim_text(p14_nodes, ", ");
			code2 = claim_element(p14_nodes, "CODE", {});
			var code2_nodes = children(code2);
			t97 = claim_text(code2_nodes, "square.js");
			code2_nodes.forEach(detach);
			t98 = claim_text(p14_nodes, " and ");
			code3 = claim_element(p14_nodes, "CODE", {});
			var code3_nodes = children(code3);
			t99 = claim_text(code3_nodes, "app.js");
			code3_nodes.forEach(detach);
			t100 = claim_text(p14_nodes, ":");
			p14_nodes.forEach(detach);
			t101 = claim_space(section2_nodes);
			pre3 = claim_element(section2_nodes, "PRE", { class: true });
			var pre3_nodes = children(pre3);
			pre3_nodes.forEach(detach);
			t102 = claim_space(section2_nodes);
			pre4 = claim_element(section2_nodes, "PRE", { class: true });
			var pre4_nodes = children(pre4);
			pre4_nodes.forEach(detach);
			t103 = claim_space(section2_nodes);
			pre5 = claim_element(section2_nodes, "PRE", { class: true });
			var pre5_nodes = children(pre5);
			pre5_nodes.forEach(detach);
			section2_nodes.forEach(detach);
			t104 = claim_space(nodes);
			section3 = claim_element(nodes, "SECTION", {});
			var section3_nodes = children(section3);
			h30 = claim_element(section3_nodes, "H3", {});
			var h30_nodes = children(h30);
			a19 = claim_element(h30_nodes, "A", { href: true, id: true });
			var a19_nodes = children(a19);
			t105 = claim_text(a19_nodes, "The \"webpack way\"");
			a19_nodes.forEach(detach);
			h30_nodes.forEach(detach);
			t106 = claim_space(section3_nodes);
			p15 = claim_element(section3_nodes, "P", {});
			var p15_nodes = children(p15);
			t107 = claim_text(p15_nodes, "What would be the \"webpack way\" bundle looks like?");
			p15_nodes.forEach(detach);
			t108 = claim_space(section3_nodes);
			pre6 = claim_element(section3_nodes, "PRE", { class: true });
			var pre6_nodes = children(pre6);
			pre6_nodes.forEach(detach);
			t109 = claim_space(section3_nodes);
			p16 = claim_element(section3_nodes, "P", {});
			var p16_nodes = children(p16);
			em3 = claim_element(p16_nodes, "EM", {});
			var em3_nodes = children(em3);
			t110 = claim_text(em3_nodes, "I have made some slight modifications for easier illustration");
			em3_nodes.forEach(detach);
			p16_nodes.forEach(detach);
			t111 = claim_space(section3_nodes);
			p17 = claim_element(section3_nodes, "P", {});
			var p17_nodes = children(p17);
			t112 = claim_text(p17_nodes, "First thing you would notice is the ");
			strong4 = claim_element(p17_nodes, "STRONG", {});
			var strong4_nodes = children(strong4);
			t113 = claim_text(strong4_nodes, "\"module map\"");
			strong4_nodes.forEach(detach);
			t114 = claim_text(p17_nodes, ". It is a dictionary that maps the module name to the module itself, which is wrapped by a function. The \"module map\" is like a registry, it makes it easy to register modules by adding entries.");
			p17_nodes.forEach(detach);
			t115 = claim_space(section3_nodes);
			p18 = claim_element(section3_nodes, "P", {});
			var p18_nodes = children(p18);
			t116 = claim_text(p18_nodes, "Secondly, ");
			strong5 = claim_element(p18_nodes, "STRONG", {});
			var strong5_nodes = children(strong5);
			t117 = claim_text(strong5_nodes, "each module is wrapped by a function");
			strong5_nodes.forEach(detach);
			t118 = claim_text(p18_nodes, ". The function simulates the module scope, where everything declared within the module is scoped within itself. The function itself is called the \"module factory function\". As you can see, it takes in a few parameters, to allow the module to exports its interface, as well as to require from other modules.");
			p18_nodes.forEach(detach);
			t119 = claim_space(section3_nodes);
			p19 = claim_element(section3_nodes, "P", {});
			var p19_nodes = children(p19);
			t120 = claim_text(p19_nodes, "Thirdly, the application is start via ");
			code4 = claim_element(p19_nodes, "CODE", {});
			var code4_nodes = children(code4);
			t121 = claim_text(code4_nodes, "webpackStart");
			code4_nodes.forEach(detach);
			t122 = claim_text(p19_nodes, ", which is ");
			strong6 = claim_element(p19_nodes, "STRONG", {});
			var strong6_nodes = children(strong6);
			t123 = claim_text(strong6_nodes, "a function that glues everything together");
			strong6_nodes.forEach(detach);
			t124 = claim_text(p19_nodes, ". The function itself, often called as the ");
			em4 = claim_element(p19_nodes, "EM", {});
			var em4_nodes = children(em4);
			t125 = claim_text(em4_nodes, "\"runtime\"");
			em4_nodes.forEach(detach);
			t126 = claim_text(p19_nodes, ", is the most important piece of the bundle. It uses the \"module map\" and the entry module to start the application.");
			p19_nodes.forEach(detach);
			t127 = claim_space(section3_nodes);
			pre7 = claim_element(section3_nodes, "PRE", { class: true });
			var pre7_nodes = children(pre7);
			pre7_nodes.forEach(detach);
			t128 = claim_space(section3_nodes);
			p20 = claim_element(section3_nodes, "P", {});
			var p20_nodes = children(p20);
			em5 = claim_element(p20_nodes, "EM", {});
			var em5_nodes = children(em5);
			t129 = claim_text(em5_nodes, "I have made some slight modifications for easier illustration");
			em5_nodes.forEach(detach);
			p20_nodes.forEach(detach);
			t130 = claim_space(section3_nodes);
			p21 = claim_element(section3_nodes, "P", {});
			var p21_nodes = children(p21);
			code5 = claim_element(p21_nodes, "CODE", {});
			var code5_nodes = children(code5);
			t131 = claim_text(code5_nodes, "webpackStart");
			code5_nodes.forEach(detach);
			t132 = claim_text(p21_nodes, " defines 2 things, the \"require\" function and the module cache. The \"require\" function is not the same as the ");
			code6 = claim_element(p21_nodes, "CODE", {});
			var code6_nodes = children(code6);
			t133 = claim_text(code6_nodes, "require");
			code6_nodes.forEach(detach);
			t134 = claim_text(p21_nodes, " from CommonJS. \"require\" takes in the module name, and returns the exported interface from a module, eg: for ");
			code7 = claim_element(p21_nodes, "CODE", {});
			var code7_nodes = children(code7);
			t135 = claim_text(code7_nodes, "circle.js");
			code7_nodes.forEach(detach);
			t136 = claim_text(p21_nodes, " it would be ");
			code8 = claim_element(p21_nodes, "CODE", {});
			var code8_nodes = children(code8);
			t137 = claim_text(code8_nodes, "{ default: function area(radius){ ... } }");
			code8_nodes.forEach(detach);
			t138 = claim_text(p21_nodes, ". The exported interface is cached in the module cache, so that if we call \"require\" of the same module name repeatedly, the \"module factory function\" will only be executed once.");
			p21_nodes.forEach(detach);
			t139 = claim_space(section3_nodes);
			p22 = claim_element(section3_nodes, "P", {});
			var p22_nodes = children(p22);
			t140 = claim_text(p22_nodes, "With \"require\" defined, starting the application would be just \"require\"ing the entry module.");
			p22_nodes.forEach(detach);
			section3_nodes.forEach(detach);
			t141 = claim_space(nodes);
			section4 = claim_element(nodes, "SECTION", {});
			var section4_nodes = children(section4);
			h31 = claim_element(section4_nodes, "H3", {});
			var h31_nodes = children(h31);
			a20 = claim_element(h31_nodes, "A", { href: true, id: true });
			var a20_nodes = children(a20);
			t142 = claim_text(a20_nodes, "The \"rollup way\"");
			a20_nodes.forEach(detach);
			h31_nodes.forEach(detach);
			t143 = claim_space(section4_nodes);
			p23 = claim_element(section4_nodes, "P", {});
			var p23_nodes = children(p23);
			t144 = claim_text(p23_nodes, "Now you've seen how webpack bundle looked like, let's take a look at the \"rollup way\" bundle:");
			p23_nodes.forEach(detach);
			t145 = claim_space(section4_nodes);
			pre8 = claim_element(section4_nodes, "PRE", { class: true });
			var pre8_nodes = children(pre8);
			pre8_nodes.forEach(detach);
			t146 = claim_space(section4_nodes);
			p24 = claim_element(section4_nodes, "P", {});
			var p24_nodes = children(p24);
			em6 = claim_element(p24_nodes, "EM", {});
			var em6_nodes = children(em6);
			t147 = claim_text(em6_nodes, "I have made some slight modifications for easier illustration");
			em6_nodes.forEach(detach);
			p24_nodes.forEach(detach);
			t148 = claim_space(section4_nodes);
			p25 = claim_element(section4_nodes, "P", {});
			var p25_nodes = children(p25);
			t149 = claim_text(p25_nodes, "Firstly, the key difference in the rollup bundle, is that it is much smaller compared to the webpack bundle. There is ");
			strong7 = claim_element(p25_nodes, "STRONG", {});
			var strong7_nodes = children(strong7);
			t150 = claim_text(strong7_nodes, "no module map");
			strong7_nodes.forEach(detach);
			t151 = claim_text(p25_nodes, ", as compared to the \"webpack way\". All the modules are ");
			strong8 = claim_element(p25_nodes, "STRONG", {});
			var strong8_nodes = children(strong8);
			t152 = claim_text(strong8_nodes, "\"flatten\" into the bundle");
			strong8_nodes.forEach(detach);
			t153 = claim_text(p25_nodes, ". There is no function wrapping of modules. All the variables/functions that were declared within the module, is now declared into the global scope.");
			p25_nodes.forEach(detach);
			t154 = claim_space(section4_nodes);
			p26 = claim_element(section4_nodes, "P", {});
			var p26_nodes = children(p26);
			t155 = claim_text(p26_nodes, "If everything declared in individual module scope is now declared into the global scope, ");
			em7 = claim_element(p26_nodes, "EM", {});
			var em7_nodes = children(em7);
			t156 = claim_text(em7_nodes, "what happened if 2 modules declare variable/function of the same name?");
			em7_nodes.forEach(detach);
			p26_nodes.forEach(detach);
			t157 = claim_space(section4_nodes);
			p27 = claim_element(section4_nodes, "P", {});
			var p27_nodes = children(p27);
			t158 = claim_text(p27_nodes, "Well, rollup will ");
			strong9 = claim_element(p27_nodes, "STRONG", {});
			var strong9_nodes = children(strong9);
			t159 = claim_text(strong9_nodes, "rename the variable/function name");
			strong9_nodes.forEach(detach);
			t160 = claim_text(p27_nodes, ", such that name collision do not happen. In our example, both ");
			code9 = claim_element(p27_nodes, "CODE", {});
			var code9_nodes = children(code9);
			t161 = claim_text(code9_nodes, "circle.js");
			code9_nodes.forEach(detach);
			t162 = claim_text(p27_nodes, " and ");
			code10 = claim_element(p27_nodes, "CODE", {});
			var code10_nodes = children(code10);
			t163 = claim_text(code10_nodes, "square.js");
			code10_nodes.forEach(detach);
			t164 = claim_text(p27_nodes, " have declared ");
			code11 = claim_element(p27_nodes, "CODE", {});
			var code11_nodes = children(code11);
			t165 = claim_text(code11_nodes, "function area(){}");
			code11_nodes.forEach(detach);
			t166 = claim_text(p27_nodes, " within the module, when bundled, you see that both functions and their usage were renamed to avoid collision.");
			p27_nodes.forEach(detach);
			t167 = claim_space(section4_nodes);
			blockquote = claim_element(section4_nodes, "BLOCKQUOTE", {});
			var blockquote_nodes = children(blockquote);
			p28 = claim_element(blockquote_nodes, "P", {});
			var p28_nodes = children(p28);
			em8 = claim_element(p28_nodes, "EM", {});
			var em8_nodes = children(em8);
			t168 = claim_text(em8_nodes, "One of the side effects of not wrapping module with a function is the behavior of ");
			code12 = claim_element(em8_nodes, "CODE", {});
			var code12_nodes = children(code12);
			t169 = claim_text(code12_nodes, "eval");
			code12_nodes.forEach(detach);
			t170 = claim_text(em8_nodes, ", see ");
			a21 = claim_element(em8_nodes, "A", { href: true, rel: true });
			var a21_nodes = children(a21);
			t171 = claim_text(a21_nodes, "here");
			a21_nodes.forEach(detach);
			t172 = claim_text(em8_nodes, " for more in-depth explanation");
			em8_nodes.forEach(detach);
			p28_nodes.forEach(detach);
			blockquote_nodes.forEach(detach);
			t173 = claim_space(section4_nodes);
			p29 = claim_element(section4_nodes, "P", {});
			var p29_nodes = children(p29);
			t174 = claim_text(p29_nodes, "Secondly, ");
			strong10 = claim_element(p29_nodes, "STRONG", {});
			var strong10_nodes = children(strong10);
			t175 = claim_text(strong10_nodes, "the order of the modules within the bundle matters");
			strong10_nodes.forEach(detach);
			t176 = claim_text(p29_nodes, ". Well you can argue that ");
			code13 = claim_element(p29_nodes, "CODE", {});
			var code13_nodes = children(code13);
			t177 = claim_text(code13_nodes, "circle$area");
			code13_nodes.forEach(detach);
			t178 = claim_text(p29_nodes, " and ");
			code14 = claim_element(p29_nodes, "CODE", {});
			var code14_nodes = children(code14);
			t179 = claim_text(code14_nodes, "square$area");
			code14_nodes.forEach(detach);
			t180 = claim_text(p29_nodes, " can come after ");
			code15 = claim_element(p29_nodes, "CODE", {});
			var code15_nodes = children(code15);
			t181 = claim_text(code15_nodes, "console.log");
			code15_nodes.forEach(detach);
			t182 = claim_text(p29_nodes, " and it will still work, yet ");
			code16 = claim_element(p29_nodes, "CODE", {});
			var code16_nodes = children(code16);
			t183 = claim_text(code16_nodes, "PI");
			code16_nodes.forEach(detach);
			t184 = claim_text(p29_nodes, " has to be declared before the ");
			code17 = claim_element(p29_nodes, "CODE", {});
			var code17_nodes = children(code17);
			t185 = claim_text(code17_nodes, "console.log");
			code17_nodes.forEach(detach);
			t186 = claim_text(p29_nodes, ", because of ");
			a22 = claim_element(p29_nodes, "A", { href: true, rel: true });
			var a22_nodes = children(a22);
			t187 = claim_text(a22_nodes, "temporal dead zone");
			a22_nodes.forEach(detach);
			t188 = claim_text(p29_nodes, ". So, sorting modules in order of their dependency matters for the \"rollup way\".");
			p29_nodes.forEach(detach);
			t189 = claim_space(section4_nodes);
			p30 = claim_element(section4_nodes, "P", {});
			var p30_nodes = children(p30);
			t190 = claim_text(p30_nodes, "All in all, the \"rollup way\" seemed to be better than the \"webpack way\". It has a smaller bundle and less runtime overhead by removing all the functions.");
			p30_nodes.forEach(detach);
			t191 = claim_space(section4_nodes);
			p31 = claim_element(section4_nodes, "P", {});
			var p31_nodes = children(p31);
			em9 = claim_element(p31_nodes, "EM", {});
			var em9_nodes = children(em9);
			t192 = claim_text(em9_nodes, "Is there a drawback of the \"rollup way\"?");
			em9_nodes.forEach(detach);
			p31_nodes.forEach(detach);
			t193 = claim_space(section4_nodes);
			p32 = claim_element(section4_nodes, "P", {});
			var p32_nodes = children(p32);
			t194 = claim_text(p32_nodes, "Well, sometimes it does not work well with circular dependency. Let's take a look at this contrived example:");
			p32_nodes.forEach(detach);
			t195 = claim_space(section4_nodes);
			pre9 = claim_element(section4_nodes, "PRE", { class: true });
			var pre9_nodes = children(pre9);
			pre9_nodes.forEach(detach);
			t196 = claim_space(section4_nodes);
			pre10 = claim_element(section4_nodes, "PRE", { class: true });
			var pre10_nodes = children(pre10);
			pre10_nodes.forEach(detach);
			t197 = claim_space(section4_nodes);
			p33 = claim_element(section4_nodes, "P", {});
			var p33_nodes = children(p33);
			em10 = claim_element(p33_nodes, "EM", {});
			var em10_nodes = children(em10);
			t198 = claim_text(em10_nodes, "I have made some slight modifications for easier illustration");
			em10_nodes.forEach(detach);
			p33_nodes.forEach(detach);
			t199 = claim_space(section4_nodes);
			p34 = claim_element(section4_nodes, "P", {});
			var p34_nodes = children(p34);
			t200 = claim_text(p34_nodes, "In this example ");
			code18 = claim_element(p34_nodes, "CODE", {});
			var code18_nodes = children(code18);
			t201 = claim_text(code18_nodes, "shape.js");
			code18_nodes.forEach(detach);
			t202 = claim_text(p34_nodes, " is depending on ");
			code19 = claim_element(p34_nodes, "CODE", {});
			var code19_nodes = children(code19);
			t203 = claim_text(code19_nodes, "circle.js");
			code19_nodes.forEach(detach);
			t204 = claim_text(p34_nodes, " and ");
			code20 = claim_element(p34_nodes, "CODE", {});
			var code20_nodes = children(code20);
			t205 = claim_text(code20_nodes, "circle.js");
			code20_nodes.forEach(detach);
			t206 = claim_text(p34_nodes, " is depending on ");
			code21 = claim_element(p34_nodes, "CODE", {});
			var code21_nodes = children(code21);
			t207 = claim_text(code21_nodes, "shape.js");
			code21_nodes.forEach(detach);
			t208 = claim_text(p34_nodes, ". So, for rollup to sort out which module to come first than another in the output bundle, there's no \"correct\" answer for it. Either ");
			code22 = claim_element(p34_nodes, "CODE", {});
			var code22_nodes = children(code22);
			t209 = claim_text(code22_nodes, "circle.js");
			code22_nodes.forEach(detach);
			t210 = claim_text(p34_nodes, " then ");
			code23 = claim_element(p34_nodes, "CODE", {});
			var code23_nodes = children(code23);
			t211 = claim_text(code23_nodes, "shape.js");
			code23_nodes.forEach(detach);
			t212 = claim_text(p34_nodes, " or ");
			code24 = claim_element(p34_nodes, "CODE", {});
			var code24_nodes = children(code24);
			t213 = claim_text(code24_nodes, "shape.js");
			code24_nodes.forEach(detach);
			t214 = claim_text(p34_nodes, " then ");
			code25 = claim_element(p34_nodes, "CODE", {});
			var code25_nodes = children(code25);
			t215 = claim_text(code25_nodes, "circle.js");
			code25_nodes.forEach(detach);
			t216 = claim_text(p34_nodes, " is reasonable. So, you could possibly get the following output bundle:");
			p34_nodes.forEach(detach);
			t217 = claim_space(section4_nodes);
			pre11 = claim_element(section4_nodes, "PRE", { class: true });
			var pre11_nodes = children(pre11);
			pre11_nodes.forEach(detach);
			t218 = claim_space(section4_nodes);
			p35 = claim_element(section4_nodes, "P", {});
			var p35_nodes = children(p35);
			t219 = claim_text(p35_nodes, "You can tell this will be problematic right?");
			p35_nodes.forEach(detach);
			t220 = claim_space(section4_nodes);
			p36 = claim_element(section4_nodes, "P", {});
			var p36_nodes = children(p36);
			t221 = claim_text(p36_nodes, "Is there a solution for this? A short answer is ");
			strong11 = claim_element(p36_nodes, "STRONG", {});
			var strong11_nodes = children(strong11);
			t222 = claim_text(strong11_nodes, "no");
			strong11_nodes.forEach(detach);
			t223 = claim_text(p36_nodes, ".");
			p36_nodes.forEach(detach);
			t224 = claim_space(section4_nodes);
			p37 = claim_element(section4_nodes, "P", {});
			var p37_nodes = children(p37);
			t225 = claim_text(p37_nodes, "A \"simple\" fix is to not use a circular dependency. Rollup will ");
			strong12 = claim_element(p37_nodes, "STRONG", {});
			var strong12_nodes = children(strong12);
			t226 = claim_text(strong12_nodes, "throw warnings at you");
			strong12_nodes.forEach(detach);
			t227 = claim_text(p37_nodes, " if it encountered one.");
			p37_nodes.forEach(detach);
			t228 = claim_space(section4_nodes);
			p38 = claim_element(section4_nodes, "P", {});
			var p38_nodes = children(p38);
			t229 = claim_text(p38_nodes, "Well, what makes the example \"works\" is that we have statements that are immediately evaluated within the module. If we change the evaluation of ");
			code26 = claim_element(p38_nodes, "CODE", {});
			var code26_nodes = children(code26);
			t230 = claim_text(code26_nodes, "_PI");
			code26_nodes.forEach(detach);
			t231 = claim_text(p38_nodes, " to be lazy:");
			p38_nodes.forEach(detach);
			t232 = claim_space(section4_nodes);
			pre12 = claim_element(section4_nodes, "PRE", { class: true });
			var pre12_nodes = children(pre12);
			pre12_nodes.forEach(detach);
			t233 = claim_space(section4_nodes);
			p39 = claim_element(section4_nodes, "P", {});
			var p39_nodes = children(p39);
			t234 = claim_text(p39_nodes, "the order of modules now does not really matter much:");
			p39_nodes.forEach(detach);
			t235 = claim_space(section4_nodes);
			pre13 = claim_element(section4_nodes, "PRE", { class: true });
			var pre13_nodes = children(pre13);
			pre13_nodes.forEach(detach);
			t236 = claim_space(section4_nodes);
			p40 = claim_element(section4_nodes, "P", {});
			var p40_nodes = children(p40);
			t237 = claim_text(p40_nodes, "This is because at the time ");
			code27 = claim_element(p40_nodes, "CODE", {});
			var code27_nodes = children(code27);
			t238 = claim_text(code27_nodes, "_PI");
			code27_nodes.forEach(detach);
			t239 = claim_text(p40_nodes, " is evaluated, ");
			code28 = claim_element(p40_nodes, "CODE", {});
			var code28_nodes = children(code28);
			t240 = claim_text(code28_nodes, "PI");
			code28_nodes.forEach(detach);
			t241 = claim_text(p40_nodes, " has already been defined.");
			p40_nodes.forEach(detach);
			section4_nodes.forEach(detach);
			t242 = claim_space(nodes);
			section5 = claim_element(nodes, "SECTION", {});
			var section5_nodes = children(section5);
			h22 = claim_element(section5_nodes, "H2", {});
			var h22_nodes = children(h22);
			a23 = claim_element(h22_nodes, "A", { href: true, id: true });
			var a23_nodes = children(a23);
			t243 = claim_text(a23_nodes, "Summary");
			a23_nodes.forEach(detach);
			h22_nodes.forEach(detach);
			t244 = claim_space(section5_nodes);
			p41 = claim_element(section5_nodes, "P", {});
			var p41_nodes = children(p41);
			t245 = claim_text(p41_nodes, "So, let's summarize what we've learned so far:");
			p41_nodes.forEach(detach);
			t246 = claim_space(section5_nodes);
			ul8 = claim_element(section5_nodes, "UL", {});
			var ul8_nodes = children(ul8);
			li16 = claim_element(ul8_nodes, "LI", {});
			var li16_nodes = children(li16);
			em11 = claim_element(li16_nodes, "EM", {});
			var em11_nodes = children(em11);
			t247 = claim_text(em11_nodes, "Module bundler");
			em11_nodes.forEach(detach);
			t248 = claim_text(li16_nodes, " helped us to combine multiple JavaScript modules into 1 JavaScript file.");
			li16_nodes.forEach(detach);
			t249 = claim_space(ul8_nodes);
			li17 = claim_element(ul8_nodes, "LI", {});
			var li17_nodes = children(li17);
			t250 = claim_text(li17_nodes, "Different bundler bundles differently, and we've looked into 2 of the modern bundler, ");
			code29 = claim_element(li17_nodes, "CODE", {});
			var code29_nodes = children(code29);
			t251 = claim_text(code29_nodes, "webpack");
			code29_nodes.forEach(detach);
			t252 = claim_text(li17_nodes, " and ");
			code30 = claim_element(li17_nodes, "CODE", {});
			var code30_nodes = children(code30);
			t253 = claim_text(code30_nodes, "rollup");
			code30_nodes.forEach(detach);
			li17_nodes.forEach(detach);
			t254 = claim_space(ul8_nodes);
			li21 = claim_element(ul8_nodes, "LI", {});
			var li21_nodes = children(li21);
			t255 = claim_text(li21_nodes, "the \"webpack way\":");
			ul6 = claim_element(li21_nodes, "UL", {});
			var ul6_nodes = children(ul6);
			li18 = claim_element(ul6_nodes, "LI", {});
			var li18_nodes = children(li18);
			t256 = claim_text(li18_nodes, "uses module map");
			li18_nodes.forEach(detach);
			t257 = claim_space(ul6_nodes);
			li19 = claim_element(ul6_nodes, "LI", {});
			var li19_nodes = children(li19);
			t258 = claim_text(li19_nodes, "uses function to wrap each module");
			li19_nodes.forEach(detach);
			t259 = claim_space(ul6_nodes);
			li20 = claim_element(ul6_nodes, "LI", {});
			var li20_nodes = children(li20);
			t260 = claim_text(li20_nodes, "has a runtime code that glues the module together");
			li20_nodes.forEach(detach);
			ul6_nodes.forEach(detach);
			li21_nodes.forEach(detach);
			t261 = claim_space(ul8_nodes);
			li26 = claim_element(ul8_nodes, "LI", {});
			var li26_nodes = children(li26);
			t262 = claim_text(li26_nodes, "the \"rollup way\":");
			ul7 = claim_element(li26_nodes, "UL", {});
			var ul7_nodes = children(ul7);
			li22 = claim_element(ul7_nodes, "LI", {});
			var li22_nodes = children(li22);
			t263 = claim_text(li22_nodes, "flatter and smaller bundle");
			li22_nodes.forEach(detach);
			t264 = claim_space(ul7_nodes);
			li23 = claim_element(ul7_nodes, "LI", {});
			var li23_nodes = children(li23);
			t265 = claim_text(li23_nodes, "does not use function to wrap module");
			li23_nodes.forEach(detach);
			t266 = claim_space(ul7_nodes);
			li24 = claim_element(ul7_nodes, "LI", {});
			var li24_nodes = children(li24);
			t267 = claim_text(li24_nodes, "order matters, require sorting based on dependency");
			li24_nodes.forEach(detach);
			t268 = claim_space(ul7_nodes);
			li25 = claim_element(ul7_nodes, "LI", {});
			var li25_nodes = children(li25);
			t269 = claim_text(li25_nodes, "circular dependency may not work");
			li25_nodes.forEach(detach);
			ul7_nodes.forEach(detach);
			li26_nodes.forEach(detach);
			ul8_nodes.forEach(detach);
			section5_nodes.forEach(detach);
			t270 = claim_space(nodes);
			section6 = claim_element(nodes, "SECTION", {});
			var section6_nodes = children(section6);
			h23 = claim_element(section6_nodes, "H2", {});
			var h23_nodes = children(h23);
			a24 = claim_element(h23_nodes, "A", { href: true, id: true });
			var a24_nodes = children(a24);
			t271 = claim_text(a24_nodes, "References");
			a24_nodes.forEach(detach);
			h23_nodes.forEach(detach);
			t272 = claim_space(section6_nodes);
			ul9 = claim_element(section6_nodes, "UL", {});
			var ul9_nodes = children(ul9);
			li27 = claim_element(ul9_nodes, "LI", {});
			var li27_nodes = children(li27);
			a25 = claim_element(li27_nodes, "A", { href: true, rel: true });
			var a25_nodes = children(a25);
			t273 = claim_text(a25_nodes, "Webpack");
			a25_nodes.forEach(detach);
			li27_nodes.forEach(detach);
			t274 = claim_space(ul9_nodes);
			li28 = claim_element(ul9_nodes, "LI", {});
			var li28_nodes = children(li28);
			a26 = claim_element(li28_nodes, "A", { href: true, rel: true });
			var a26_nodes = children(a26);
			t275 = claim_text(a26_nodes, "Rollup");
			a26_nodes.forEach(detach);
			li28_nodes.forEach(detach);
			ul9_nodes.forEach(detach);
			section6_nodes.forEach(detach);
			this.h();
		},
		h() {
			attr(a0, "href", "#what-is-a-module-bundler");
			attr(a1, "href", "#how-do-we-bundle");
			attr(a2, "href", "#the-webpack-way");
			attr(a3, "href", "#the-rollup-way");
			attr(a4, "href", "#summary");
			attr(a5, "href", "#references");
			attr(ul1, "class", "sitemap");
			attr(ul1, "id", "sitemap");
			attr(ul1, "role", "navigation");
			attr(ul1, "aria-label", "Table of Contents");
			attr(a6, "href", "#what-is-a-module-bundler");
			attr(a6, "id", "what-is-a-module-bundler");
			if (img.src !== (img_src_value = __build_img__0)) attr(img, "src", img_src_value);
			attr(img, "alt", "module bundlers");
			attr(img, "title", "Module Bundlers: (left to right) Rollup, FuseBox, webpack, parcel");
			attr(a7, "href", "https://lihautan.com/javascript-modules/");
			attr(a7, "rel", "nofollow");
			attr(a8, "href", "https://webpack.js.org");
			attr(a8, "rel", "nofollow");
			attr(a9, "href", "https://rollupjs.org");
			attr(a9, "rel", "nofollow");
			attr(a10, "href", "https://fuse-box.org");
			attr(a10, "rel", "nofollow");
			attr(a11, "href", "https://parceljs.org");
			attr(a11, "rel", "nofollow");
			attr(a12, "href", "https://philipwalton.com/articles/using-native-javascript-modules-in-production-today/");
			attr(a12, "rel", "nofollow");
			attr(pre0, "class", "language-html");
			attr(pre1, "class", "language-html");
			attr(a13, "href", "https://lihautan.com/javascript-modules/");
			attr(a13, "rel", "nofollow");
			attr(a14, "href", "https://requirejs.org/docs/commonjs.html");
			attr(a14, "rel", "nofollow");
			attr(a15, "href", "https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Statements/import");
			attr(a15, "rel", "nofollow");
			attr(pre2, "class", "language-js");
			attr(a16, "href", "#how-do-we-bundle");
			attr(a16, "id", "how-do-we-bundle");
			attr(a17, "href", "https://webpack.js.org");
			attr(a17, "rel", "nofollow");
			attr(a18, "href", "https://rollupjs.org");
			attr(a18, "rel", "nofollow");
			attr(pre3, "class", "language-js");
			attr(pre4, "class", "language-js");
			attr(pre5, "class", "language-js");
			attr(a19, "href", "#the-webpack-way");
			attr(a19, "id", "the-webpack-way");
			attr(pre6, "class", "language-js");
			attr(pre7, "class", "language-js");
			attr(a20, "href", "#the-rollup-way");
			attr(a20, "id", "the-rollup-way");
			attr(pre8, "class", "language-js");
			attr(a21, "href", "http://rollupjs.org/guide/en/#avoiding-eval");
			attr(a21, "rel", "nofollow");
			attr(a22, "href", "https://wesbos.com/temporal-dead-zone/");
			attr(a22, "rel", "nofollow");
			attr(pre9, "class", "language-js");
			attr(pre10, "class", "language-js");
			attr(pre11, "class", "language-js");
			attr(pre12, "class", "language-js");
			attr(pre13, "class", "language-js");
			attr(a23, "href", "#summary");
			attr(a23, "id", "summary");
			attr(a24, "href", "#references");
			attr(a24, "id", "references");
			attr(a25, "href", "https://webpack.js.org");
			attr(a25, "rel", "nofollow");
			attr(a26, "href", "http://rollupjs.org/guide/en/");
			attr(a26, "rel", "nofollow");
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
			append(ul1, li4);
			append(li4, a4);
			append(a4, t4);
			append(ul1, li5);
			append(li5, a5);
			append(a5, t5);
			insert(target, t6, anchor);
			insert(target, section1, anchor);
			append(section1, h20);
			append(h20, a6);
			append(a6, t7);
			append(section1, t8);
			append(section1, p0);
			append(p0, img);
			append(section1, t9);
			append(section1, p1);
			append(p1, t10);
			append(p1, a7);
			append(a7, t11);
			append(p1, t12);
			append(section1, t13);
			append(section1, p2);
			append(p2, t14);
			append(p2, em0);
			append(em0, t15);
			append(p2, t16);
			append(p2, a8);
			append(a8, t17);
			append(p2, t18);
			append(p2, a9);
			append(a9, t19);
			append(p2, t20);
			append(p2, a10);
			append(a10, t21);
			append(p2, t22);
			append(p2, a11);
			append(a11, t23);
			append(p2, t24);
			append(section1, t25);
			append(section1, p3);
			append(p3, t26);
			append(section1, t27);
			append(section1, ul2);
			append(ul2, li6);
			append(li6, t28);
			append(li6, a12);
			append(a12, t29);
			append(ul2, t30);
			append(ul2, li7);
			append(li7, t31);
			append(ul2, t32);
			append(ul2, li8);
			append(li8, t33);
			append(section1, t34);
			append(section1, p4);
			append(p4, t35);
			append(section1, t36);
			append(section1, pre0);
			pre0.innerHTML = raw0_value;
			append(section1, t37);
			append(section1, p5);
			append(p5, t38);
			append(section1, t39);
			append(section1, pre1);
			pre1.innerHTML = raw1_value;
			append(section1, t40);
			append(section1, i);
			append(i, t41);
			append(section1, t42);
			append(section1, p6);
			append(p6, t43);
			append(p6, code0);
			append(code0, t44);
			append(p6, t45);
			append(section1, t46);
			append(section1, p7);
			append(p7, t47);
			append(section1, t48);
			append(section1, ul4);
			append(ul4, li10);
			append(li10, t49);
			append(li10, strong0);
			append(strong0, t50);
			append(li10, t51);
			append(li10, ul3);
			append(ul3, li9);
			append(li9, t52);
			append(ul4, t53);
			append(ul4, li11);
			append(li11, t54);
			append(li11, strong1);
			append(strong1, t55);
			append(li11, t56);
			append(ul4, t57);
			append(ul4, li12);
			append(li12, t58);
			append(section1, t59);
			append(section1, p8);
			append(p8, t60);
			append(section1, t61);
			append(section1, ul5);
			append(ul5, li13);
			append(li13, t62);
			append(ul5, t63);
			append(ul5, li14);
			append(li14, t64);
			append(ul5, t65);
			append(ul5, li15);
			append(li15, t66);
			append(section1, t67);
			append(section1, p9);
			append(p9, t68);
			append(p9, a13);
			append(a13, t69);
			append(p9, t70);
			append(section1, t71);
			append(section1, p10);
			append(p10, a14);
			append(a14, t72);
			append(p10, t73);
			append(p10, a15);
			append(a15, t74);
			append(p10, t75);
			append(section1, t76);
			append(section1, pre2);
			pre2.innerHTML = raw2_value;
			insert(target, t77, anchor);
			insert(target, section2, anchor);
			append(section2, h21);
			append(h21, a16);
			append(a16, t78);
			append(section2, t79);
			append(section2, p11);
			append(p11, t80);
			append(section2, t81);
			append(section2, p12);
			append(p12, t82);
			append(p12, a17);
			append(a17, t83);
			append(p12, t84);
			append(p12, a18);
			append(a18, t85);
			append(p12, t86);
			append(p12, em1);
			append(em1, strong2);
			append(strong2, t87);
			append(p12, t88);
			append(p12, em2);
			append(em2, strong3);
			append(strong3, t89);
			append(p12, t90);
			append(section2, t91);
			append(section2, p13);
			append(p13, t92);
			append(section2, t93);
			append(section2, p14);
			append(p14, t94);
			append(p14, code1);
			append(code1, t95);
			append(p14, t96);
			append(p14, code2);
			append(code2, t97);
			append(p14, t98);
			append(p14, code3);
			append(code3, t99);
			append(p14, t100);
			append(section2, t101);
			append(section2, pre3);
			pre3.innerHTML = raw3_value;
			append(section2, t102);
			append(section2, pre4);
			pre4.innerHTML = raw4_value;
			append(section2, t103);
			append(section2, pre5);
			pre5.innerHTML = raw5_value;
			insert(target, t104, anchor);
			insert(target, section3, anchor);
			append(section3, h30);
			append(h30, a19);
			append(a19, t105);
			append(section3, t106);
			append(section3, p15);
			append(p15, t107);
			append(section3, t108);
			append(section3, pre6);
			pre6.innerHTML = raw6_value;
			append(section3, t109);
			append(section3, p16);
			append(p16, em3);
			append(em3, t110);
			append(section3, t111);
			append(section3, p17);
			append(p17, t112);
			append(p17, strong4);
			append(strong4, t113);
			append(p17, t114);
			append(section3, t115);
			append(section3, p18);
			append(p18, t116);
			append(p18, strong5);
			append(strong5, t117);
			append(p18, t118);
			append(section3, t119);
			append(section3, p19);
			append(p19, t120);
			append(p19, code4);
			append(code4, t121);
			append(p19, t122);
			append(p19, strong6);
			append(strong6, t123);
			append(p19, t124);
			append(p19, em4);
			append(em4, t125);
			append(p19, t126);
			append(section3, t127);
			append(section3, pre7);
			pre7.innerHTML = raw7_value;
			append(section3, t128);
			append(section3, p20);
			append(p20, em5);
			append(em5, t129);
			append(section3, t130);
			append(section3, p21);
			append(p21, code5);
			append(code5, t131);
			append(p21, t132);
			append(p21, code6);
			append(code6, t133);
			append(p21, t134);
			append(p21, code7);
			append(code7, t135);
			append(p21, t136);
			append(p21, code8);
			append(code8, t137);
			append(p21, t138);
			append(section3, t139);
			append(section3, p22);
			append(p22, t140);
			insert(target, t141, anchor);
			insert(target, section4, anchor);
			append(section4, h31);
			append(h31, a20);
			append(a20, t142);
			append(section4, t143);
			append(section4, p23);
			append(p23, t144);
			append(section4, t145);
			append(section4, pre8);
			pre8.innerHTML = raw8_value;
			append(section4, t146);
			append(section4, p24);
			append(p24, em6);
			append(em6, t147);
			append(section4, t148);
			append(section4, p25);
			append(p25, t149);
			append(p25, strong7);
			append(strong7, t150);
			append(p25, t151);
			append(p25, strong8);
			append(strong8, t152);
			append(p25, t153);
			append(section4, t154);
			append(section4, p26);
			append(p26, t155);
			append(p26, em7);
			append(em7, t156);
			append(section4, t157);
			append(section4, p27);
			append(p27, t158);
			append(p27, strong9);
			append(strong9, t159);
			append(p27, t160);
			append(p27, code9);
			append(code9, t161);
			append(p27, t162);
			append(p27, code10);
			append(code10, t163);
			append(p27, t164);
			append(p27, code11);
			append(code11, t165);
			append(p27, t166);
			append(section4, t167);
			append(section4, blockquote);
			append(blockquote, p28);
			append(p28, em8);
			append(em8, t168);
			append(em8, code12);
			append(code12, t169);
			append(em8, t170);
			append(em8, a21);
			append(a21, t171);
			append(em8, t172);
			append(section4, t173);
			append(section4, p29);
			append(p29, t174);
			append(p29, strong10);
			append(strong10, t175);
			append(p29, t176);
			append(p29, code13);
			append(code13, t177);
			append(p29, t178);
			append(p29, code14);
			append(code14, t179);
			append(p29, t180);
			append(p29, code15);
			append(code15, t181);
			append(p29, t182);
			append(p29, code16);
			append(code16, t183);
			append(p29, t184);
			append(p29, code17);
			append(code17, t185);
			append(p29, t186);
			append(p29, a22);
			append(a22, t187);
			append(p29, t188);
			append(section4, t189);
			append(section4, p30);
			append(p30, t190);
			append(section4, t191);
			append(section4, p31);
			append(p31, em9);
			append(em9, t192);
			append(section4, t193);
			append(section4, p32);
			append(p32, t194);
			append(section4, t195);
			append(section4, pre9);
			pre9.innerHTML = raw9_value;
			append(section4, t196);
			append(section4, pre10);
			pre10.innerHTML = raw10_value;
			append(section4, t197);
			append(section4, p33);
			append(p33, em10);
			append(em10, t198);
			append(section4, t199);
			append(section4, p34);
			append(p34, t200);
			append(p34, code18);
			append(code18, t201);
			append(p34, t202);
			append(p34, code19);
			append(code19, t203);
			append(p34, t204);
			append(p34, code20);
			append(code20, t205);
			append(p34, t206);
			append(p34, code21);
			append(code21, t207);
			append(p34, t208);
			append(p34, code22);
			append(code22, t209);
			append(p34, t210);
			append(p34, code23);
			append(code23, t211);
			append(p34, t212);
			append(p34, code24);
			append(code24, t213);
			append(p34, t214);
			append(p34, code25);
			append(code25, t215);
			append(p34, t216);
			append(section4, t217);
			append(section4, pre11);
			pre11.innerHTML = raw11_value;
			append(section4, t218);
			append(section4, p35);
			append(p35, t219);
			append(section4, t220);
			append(section4, p36);
			append(p36, t221);
			append(p36, strong11);
			append(strong11, t222);
			append(p36, t223);
			append(section4, t224);
			append(section4, p37);
			append(p37, t225);
			append(p37, strong12);
			append(strong12, t226);
			append(p37, t227);
			append(section4, t228);
			append(section4, p38);
			append(p38, t229);
			append(p38, code26);
			append(code26, t230);
			append(p38, t231);
			append(section4, t232);
			append(section4, pre12);
			pre12.innerHTML = raw12_value;
			append(section4, t233);
			append(section4, p39);
			append(p39, t234);
			append(section4, t235);
			append(section4, pre13);
			pre13.innerHTML = raw13_value;
			append(section4, t236);
			append(section4, p40);
			append(p40, t237);
			append(p40, code27);
			append(code27, t238);
			append(p40, t239);
			append(p40, code28);
			append(code28, t240);
			append(p40, t241);
			insert(target, t242, anchor);
			insert(target, section5, anchor);
			append(section5, h22);
			append(h22, a23);
			append(a23, t243);
			append(section5, t244);
			append(section5, p41);
			append(p41, t245);
			append(section5, t246);
			append(section5, ul8);
			append(ul8, li16);
			append(li16, em11);
			append(em11, t247);
			append(li16, t248);
			append(ul8, t249);
			append(ul8, li17);
			append(li17, t250);
			append(li17, code29);
			append(code29, t251);
			append(li17, t252);
			append(li17, code30);
			append(code30, t253);
			append(ul8, t254);
			append(ul8, li21);
			append(li21, t255);
			append(li21, ul6);
			append(ul6, li18);
			append(li18, t256);
			append(ul6, t257);
			append(ul6, li19);
			append(li19, t258);
			append(ul6, t259);
			append(ul6, li20);
			append(li20, t260);
			append(ul8, t261);
			append(ul8, li26);
			append(li26, t262);
			append(li26, ul7);
			append(ul7, li22);
			append(li22, t263);
			append(ul7, t264);
			append(ul7, li23);
			append(li23, t265);
			append(ul7, t266);
			append(ul7, li24);
			append(li24, t267);
			append(ul7, t268);
			append(ul7, li25);
			append(li25, t269);
			insert(target, t270, anchor);
			insert(target, section6, anchor);
			append(section6, h23);
			append(h23, a24);
			append(a24, t271);
			append(section6, t272);
			append(section6, ul9);
			append(ul9, li27);
			append(li27, a25);
			append(a25, t273);
			append(ul9, t274);
			append(ul9, li28);
			append(li28, a26);
			append(a26, t275);
		},
		p: noop,
		d(detaching) {
			if (detaching) detach(section0);
			if (detaching) detach(t6);
			if (detaching) detach(section1);
			if (detaching) detach(t77);
			if (detaching) detach(section2);
			if (detaching) detach(t104);
			if (detaching) detach(section3);
			if (detaching) detach(t141);
			if (detaching) detach(section4);
			if (detaching) detach(t242);
			if (detaching) detach(section5);
			if (detaching) detach(t270);
			if (detaching) detach(section6);
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
	"title": "What is module bundler and how does it work?",
	"date": "2019-08-30T08:00:00Z",
	"lastUpdated": "2019-08-30T15:05:00Z",
	"description": "understand how module bundler works",
	"tags": ["JavaScript", "module bundler", "dev tool", "webpack"],
	"series": "Write a module bundler",
	"slug": "what-is-module-bundler-and-how-does-it-work",
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
