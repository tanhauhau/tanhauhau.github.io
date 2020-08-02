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
					"@id": "https%3A%2F%2Flihautan.com%2Fcss-code-splitting",
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
			attr(meta11, "content", "https%3A%2F%2Flihautan.com%2Fcss-code-splitting");
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

/* content/talk/css-code-splitting/@@page-markup.svelte generated by Svelte v3.24.0 */

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
	let a5;
	let t7;
	let t8;
	let t9;
	let p1;
	let t10;
	let a6;
	let t11;
	let t12;
	let a7;
	let t13;
	let t14;
	let t15;
	let hr0;
	let t16;
	let section1;
	let h20;
	let a8;
	let t17;
	let t18;
	let p2;
	let t19;
	let t20;
	let blockquote0;
	let p3;
	let t21;
	let t22;
	let p4;
	let t23;
	let a9;
	let t24;
	let t25;
	let t26;
	let p5;
	let a10;
	let t27;
	let t28;
	let a11;
	let t29;
	let t30;
	let t31;
	let p6;
	let t32;
	let a12;
	let t33;
	let t34;
	let a13;
	let t35;
	let t36;
	let t37;
	let hr1;
	let t38;
	let section2;
	let h21;
	let a14;
	let t39;
	let t40;
	let p7;
	let t41;
	let a15;
	let t42;
	let t43;
	let t44;
	let p8;
	let t45;
	let t46;
	let p9;
	let t47;
	let t48;
	let blockquote1;
	let h30;
	let t49;
	let t50;
	let p10;
	let a16;
	let t51;
	let t52;
	let t53;
	let ul2;
	let li5;
	let t54;
	let t55;
	let li6;
	let t56;
	let t57;
	let li7;
	let t58;
	let t59;
	let li8;
	let t60;
	let t61;
	let p11;
	let t62;
	let t63;
	let p12;
	let t64;
	let t65;
	let p13;
	let t66;
	let t67;
	let section3;
	let h31;
	let a17;
	let t68;
	let t69;
	let p14;
	let t70;
	let a18;
	let t71;
	let t72;
	let t73;
	let ol0;
	let li9;
	let t74;
	let em;
	let t75;
	let t76;
	let t77;
	let li10;
	let t78;
	let a19;
	let t79;
	let t80;
	let li11;
	let t81;
	let t82;
	let p15;
	let t83;
	let a20;
	let t84;
	let t85;
	let t86;
	let p16;
	let t87;
	let a21;
	let t88;
	let t89;
	let t90;
	let p17;
	let strong0;
	let t91;
	let t92;
	let t93;
	let p18;
	let t94;
	let t95;
	let section4;
	let h22;
	let a22;
	let t96;
	let t97;
	let p19;
	let t98;
	let t99;
	let p20;
	let t100;
	let strong1;
	let t101;
	let t102;
	let t103;
	let p21;
	let t104;
	let t105;
	let p22;
	let t106;
	let t107;
	let ol1;
	let li12;
	let t108;
	let t109;
	let li13;
	let t110;
	let t111;
	let p23;
	let t112;
	let a23;
	let t113;
	let t114;
	let a24;
	let t115;
	let t116;
	let t117;
	let p24;
	let t118;
	let t119;
	let p25;
	let t120;
	let t121;
	let p26;
	let t122;
	let t123;
	let section5;
	let h23;
	let a25;
	let t124;
	let t125;
	let blockquote2;
	let p27;
	let t126;
	let t127;
	let p28;
	let t128;
	let t129;
	let p29;
	let t130;
	let t131;
	let p30;
	let t132;
	let t133;
	let p31;
	let t134;
	let code0;
	let t135;
	let t136;
	let t137;
	let pre0;

	let raw0_value = `<code class="language-js"><span class="token keyword">function</span> <span class="token function">ensureCss</span><span class="token punctuation">(</span><span class="token parameter">href</span><span class="token punctuation">)</span> <span class="token punctuation">&#123;</span>
  <span class="token keyword">const</span> existingLinkTags <span class="token operator">=</span> document<span class="token punctuation">.</span><span class="token function">getElementsByTagName</span><span class="token punctuation">(</span><span class="token string">"link"</span><span class="token punctuation">)</span><span class="token punctuation">;</span>
  <span class="token keyword">for</span><span class="token punctuation">(</span><span class="token keyword">let</span> i <span class="token operator">=</span> <span class="token number">0</span><span class="token punctuation">;</span> i <span class="token operator">&lt;</span> existingLinkTags<span class="token punctuation">.</span>length<span class="token punctuation">;</span> i<span class="token operator">++</span><span class="token punctuation">)</span><span class="token punctuation">&#123;</span>
    <span class="token keyword">if</span> <span class="token punctuation">(</span>tag<span class="token punctuation">.</span>rel <span class="token operator">===</span> <span class="token string">'stylesheet'</span> <span class="token operator">&amp;&amp;</span> tag<span class="token punctuation">.</span><span class="token function">getAttribute</span><span class="token punctuation">(</span><span class="token string">"href"</span><span class="token punctuation">)</span> <span class="token operator">===</span> href<span class="token punctuation">)</span> <span class="token punctuation">&#123;</span>
      <span class="token keyword">return</span><span class="token punctuation">;</span>
    <span class="token punctuation">&#125;</span>
  <span class="token punctuation">&#125;</span>

  <span class="token keyword">const</span> linkTag <span class="token operator">=</span> document<span class="token punctuation">.</span><span class="token function">createElement</span><span class="token punctuation">(</span><span class="token string">'link'</span><span class="token punctuation">)</span><span class="token punctuation">;</span>
  linkTag<span class="token punctuation">.</span>rel <span class="token operator">=</span> <span class="token string">"stylesheet"</span><span class="token punctuation">;</span>
  linkTag<span class="token punctuation">.</span>type <span class="token operator">=</span> <span class="token string">"text/css"</span><span class="token punctuation">;</span>
  linkTag<span class="token punctuation">.</span>href <span class="token operator">=</span> href<span class="token punctuation">;</span>

  <span class="token keyword">const</span> head <span class="token operator">=</span> document<span class="token punctuation">.</span><span class="token function">getElementsByTagName</span><span class="token punctuation">(</span><span class="token string">"head"</span><span class="token punctuation">)</span><span class="token punctuation">[</span><span class="token number">0</span><span class="token punctuation">]</span><span class="token punctuation">;</span>
  head<span class="token punctuation">.</span><span class="token function">appendChild</span><span class="token punctuation">(</span>linkTag<span class="token punctuation">)</span><span class="token punctuation">;</span>
<span class="token punctuation">&#125;</span></code>` + "";

	let t138;
	let p32;
	let t139;
	let t140;
	let pre1;

	let raw1_value = `<code class="language-js"><span class="token comment">// somewhere in your application code</span>
<span class="token comment">// when you write</span>
<span class="token keyword">import</span> <span class="token string">'./styles.scss'</span><span class="token punctuation">;</span></code>` + "";

	let t141;
	let p33;
	let t142;
	let t143;
	let pre2;

	let raw2_value = `<code class="language-js"><span class="token comment">// webpack's mini-css-extract-plugin transform it into</span>
<span class="token function">ensureCss</span><span class="token punctuation">(</span><span class="token string">'https://shopee.sg/page-1-style.css'</span><span class="token punctuation">)</span><span class="token punctuation">;</span></code>` + "";

	let t144;
	let p34;
	let t145;
	let code1;
	let t146;
	let t147;
	let code2;
	let t148;
	let t149;
	let t150;
	let p35;
	let strong2;
	let t151;
	let t152;
	let p36;
	let t153;
	let t154;
	let p37;
	let t155;
	let t156;
	let p38;
	let t157;
	let t158;
	let pre3;

	let raw3_value = `<code class="language-css"><span class="token comment">/* only overwrite .foo in page2 */</span>
<span class="token selector">.page2 .foo</span> <span class="token punctuation">&#123;</span>
  <span class="token property">color</span><span class="token punctuation">:</span> blue<span class="token punctuation">;</span>
<span class="token punctuation">&#125;</span></code>` + "";

	let t159;
	let p39;
	let t160;
	let a26;
	let t161;
	let t162;
	let t163;
	let pre4;

	let raw4_value = `<code class="language-js"><span class="token keyword">import</span> styles <span class="token keyword">from</span> <span class="token string">'./styles.scss'</span><span class="token punctuation">;</span>
<span class="token keyword">function</span> <span class="token function">MyComponent</span><span class="token punctuation">(</span><span class="token parameter"><span class="token punctuation">&#123;</span> className <span class="token punctuation">&#125;</span></span><span class="token punctuation">)</span> <span class="token punctuation">&#123;</span>
  <span class="token keyword">return</span> <span class="token operator">&lt;</span>div className<span class="token operator">=</span><span class="token punctuation">&#123;</span>styles<span class="token punctuation">.</span>classA <span class="token operator">+</span> <span class="token string">' '</span> <span class="token operator">+</span> className<span class="token punctuation">&#125;</span><span class="token operator">></span>Hello World<span class="token operator">&lt;</span><span class="token operator">/</span>div<span class="token operator">></span><span class="token punctuation">;</span>
<span class="token punctuation">&#125;</span></code>` + "";

	let t164;
	let p40;
	let t165;
	let t166;
	let p41;
	let strong3;
	let t167;
	let t168;
	let p42;
	let t169;
	let t170;
	let pre5;

	let raw5_value = `<code class="language-css"><span class="token selector">.classA.classB</span> <span class="token punctuation">&#123;</span>
  <span class="token property">color</span><span class="token punctuation">:</span> blue
<span class="token punctuation">&#125;</span></code>` + "";

	let t171;
	let p43;
	let t172;
	let code3;
	let t173;
	let t174;
	let code4;
	let t175;
	let t176;
	let t177;
	let p44;
	let t178;
	let a27;
	let t179;
	let t180;
	let t181;
	let pre6;

	let raw6_value = `<code class="language-css"><span class="token selector">.classB.classB</span> <span class="token punctuation">&#123;</span>
  <span class="token property">color</span><span class="token punctuation">:</span> blue<span class="token punctuation">;</span>
<span class="token punctuation">&#125;</span>
<span class="token comment">/* has higher specificity than */</span>
<span class="token selector">.c8e4436e</span> <span class="token punctuation">&#123;</span>
  <span class="token property">color</span><span class="token punctuation">:</span> green<span class="token punctuation">;</span>
<span class="token punctuation">&#125;</span></code>` + "";

	let t182;
	let p45;
	let t183;
	let t184;
	let p46;
	let t185;
	let a28;
	let t186;
	let t187;
	let code5;
	let t188;
	let t189;
	let code6;
	let t190;
	let t191;
	let t192;
	let p47;
	let t193;
	let t194;
	let p48;
	let t195;
	let a29;
	let t196;
	let t197;

	return {
		c() {
			section0 = element("section");
			ul1 = element("ul");
			li0 = element("li");
			a0 = element("a");
			t0 = text("Background");
			li1 = element("li");
			a1 = element("a");
			t1 = text("So, how big is Shopee?");
			ul0 = element("ul");
			li2 = element("li");
			a2 = element("a");
			t2 = text("But download time does not tell the full picture.");
			li3 = element("li");
			a3 = element("a");
			t3 = text("Solution");
			li4 = element("li");
			a4 = element("a");
			t4 = text("The Problem");
			t5 = space();
			p0 = element("p");
			t6 = text("In the talk, I shared about why and how ");
			a5 = element("a");
			t7 = text("Shopee");
			t8 = text(" does CSS Code Splitting and how we solve problems arised in the process.");
			t9 = space();
			p1 = element("p");
			t10 = text("For those who don't know about ");
			a6 = element("a");
			t11 = text("Shopee");
			t12 = text(", we are an e-commerce platform based in ");
			a7 = element("a");
			t13 = text("Greater Southeast Asia");
			t14 = text(", headquartered in Singapore. As a frontend engineer in Shopee, we constantly striving to deliver performant user experience with high network latency and slow CPU devices.");
			t15 = space();
			hr0 = element("hr");
			t16 = space();
			section1 = element("section");
			h20 = element("h2");
			a8 = element("a");
			t17 = text("Background");
			t18 = space();
			p2 = element("p");
			t19 = text("A little background on how we use CSS in Shopee before getting into how we code split our CSS:");
			t20 = space();
			blockquote0 = element("blockquote");
			p3 = element("p");
			t21 = text("We use SASS and CSS Modules, and we bundle all our stylesheets with webpack into 1 final CSS file.");
			t22 = space();
			p4 = element("p");
			t23 = text("For the benefit of those who might not know about ");
			a9 = element("a");
			t24 = text("SASS");
			t25 = text(", SASS is a sassy extension of CSS that allow us to write functions and mixins, so we can easily reuse common css tricks and patterns.");
			t26 = space();
			p5 = element("p");
			a10 = element("a");
			t27 = text("CSS Modules");
			t28 = text(" on the other hand, free us from racking our brain, coming up with a unique class name for every element. Even with ");
			a11 = element("a");
			t29 = text("BEM (Block Element Modifier) naming convention");
			t30 = text(", as our application grows complex, we can't keep up with names for our element. Names with BEM convention just get longer and longer. With CSS Modules, we just need to make sure that within a CSS file (we can call it a CSS module, like a js module) the class names are unique. Our build tool will transform the stylesheets and generate class names that is unique throughout the application.");
			t31 = space();
			p6 = element("p");
			t32 = text("And lastly with ");
			a12 = element("a");
			t33 = text("webpack");
			t34 = text(", we use ");
			a13 = element("a");
			t35 = text("extract-text-webpack-plugin");
			t36 = text(" to extract all the css code within the application into 1 CSS file.");
			t37 = space();
			hr1 = element("hr");
			t38 = space();
			section2 = element("section");
			h21 = element("h2");
			a14 = element("a");
			t39 = text("So, how big is Shopee?");
			t40 = space();
			p7 = element("p");
			t41 = text("If you ask the business team, they will give you the numbers on ");
			a15 = element("a");
			t42 = text("how well we are doing in the region");
			t43 = text(".");
			t44 = space();
			p8 = element("p");
			t45 = text("But if you ask a frontend engineer, I can tell you is that to date (Mar 27 2019), we have more than a thousand of CSS files, and more than 67K lines of CSS code, and the numbers are growing...");
			t46 = space();
			p9 = element("p");
			t47 = text("And all this CSS code is bundled into one whoppingly 500KB CSS file! 😱");
			t48 = space();
			blockquote1 = element("blockquote");
			h30 = element("h3");
			t49 = text("How big is 500KB ?!");
			t50 = space();
			p10 = element("p");
			a16 = element("a");
			t51 = text("500KB is");
			t52 = text(":");
			t53 = space();
			ul2 = element("ul");
			li5 = element("li");
			t54 = text("1 minute of MP3 at 80 Kbps bitrate");
			t55 = space();
			li6 = element("li");
			t56 = text("2 1280x960 JPEG image");
			t57 = space();
			li7 = element("li");
			t58 = text("1/10 second through 4G Network");
			t59 = space();
			li8 = element("li");
			t60 = text("2 seconds through 3G Network");
			t61 = space();
			p11 = element("p");
			t62 = text("Wait, who uses 3G nowadays? Isn't 5G is coming?");
			t63 = space();
			p12 = element("p");
			t64 = text("Turns out that most of the Southeast Asia is still on 3G if not slow 4G network, except major cities like Singapore, Jakarta, and etc.");
			t65 = space();
			p13 = element("p");
			t66 = text("So file size is indeed a big concern, when it comes to network speed.");
			t67 = space();
			section3 = element("section");
			h31 = element("h3");
			a17 = element("a");
			t68 = text("But download time does not tell the full picture.");
			t69 = space();
			p14 = element("p");
			t70 = text("Because you need to look at it holistically in terms of the ");
			a18 = element("a");
			t71 = text("critical rendering path");
			t72 = text(":");
			t73 = space();
			ol0 = element("ol");
			li9 = element("li");
			t74 = text("When the browser sees a ");
			em = element("em");
			t75 = text("link tag");
			t76 = text(" that links to a CSS file, the browser will go and fetch the CSS file.");
			t77 = space();
			li10 = element("li");
			t78 = text("As soon as the CSS is downloaded into the memory, the browser will start to parse and generate a ");
			a19 = element("a");
			t79 = text("CSSOM (CSS Object Model)");
			t80 = space();
			li11 = element("li");
			t81 = text("When the DOM is ready for layout, the browser will refer to CSSOM to get the style properties for a particular element and starts to layout.");
			t82 = space();
			p15 = element("p");
			t83 = text("Which means if your CSS file is large, it will takes up a portion of time to download, and another portion of time to parse, and generate the CSSOM. All these can be traced with the ");
			a20 = element("a");
			t84 = text("Chrome's timeline tool");
			t85 = text(".");
			t86 = space();
			p16 = element("p");
			t87 = text("And what makes the matter worse is that, if we open up the ");
			a21 = element("a");
			t88 = text("Chrome's Coverage tool");
			t89 = text(", you will see that more than 90% of the CSS code is not being used to style the current page.");
			t90 = space();
			p17 = element("p");
			strong0 = element("strong");
			t91 = text("After all the trouble, only 10% of it is being useful");
			t92 = text(" 😢.");
			t93 = space();
			p18 = element("p");
			t94 = text("So, we have to do what we need to do.");
			t95 = space();
			section4 = element("section");
			h22 = element("h2");
			a22 = element("a");
			t96 = text("Solution");
			t97 = space();
			p19 = element("p");
			t98 = text("Big code file, that take long to download and parse, slows down the browser is not a new problem in frontend development. Indeed we've already solved this for JavaScript, we just need to apply the same technique for CSS this time.");
			t99 = space();
			p20 = element("p");
			t100 = text("The answer to all of this is ");
			strong1 = element("strong");
			t101 = text("Code Splitting");
			t102 = text(" 👏👏");
			t103 = space();
			p21 = element("p");
			t104 = text("The concept of Code Splitting is to split the code into seperate bundles, and dynamically load then only when you need it.");
			t105 = space();
			p22 = element("p");
			t106 = text("There's a few ways you can look at code splitting, you can:");
			t107 = space();
			ol1 = element("ol");
			li12 = element("li");
			t108 = text("Split code based on url routes, you don't have to load the code for Page 2 in Page 1");
			t109 = space();
			li13 = element("li");
			t110 = text("Split code based on sections, you dont need code that is off the screen to be loaded now. Only load them when you need it.");
			t111 = space();
			p23 = element("p");
			t112 = text("So just as we were ");
			a23 = element("a");
			t113 = text("upgrading Webpack to Webpack 4");
			t114 = text(", our extract-text-webpack-plugin announced that we should be using ");
			a24 = element("a");
			t115 = text("mini-css-extract-plugin");
			t116 = text(" for CSS now.");
			t117 = space();
			p24 = element("p");
			t118 = text("We followed the guide of setting up the new plugin and it worked amazing! 😎");
			t119 = space();
			p25 = element("p");
			t120 = text("What's different between extract-text-webpack-plugin and mini-css-extract-plugin is that the latter will generate 1 css file per 1 js bundle instead of combining all css files into 1 css file per build.");
			t121 = space();
			p26 = element("p");
			t122 = text("All is well until we got our first bug ticket 😫");
			t123 = space();
			section5 = element("section");
			h23 = element("h2");
			a25 = element("a");
			t124 = text("The Problem");
			t125 = space();
			blockquote2 = element("blockquote");
			p27 = element("p");
			t126 = text("Styles broken when user goes from Page XXX to Page YYY");
			t127 = space();
			p28 = element("p");
			t128 = text("But...");
			t129 = space();
			p29 = element("p");
			t130 = text("Stlyes working fine when user goes directly to Page YYY, it's only broken when user goes from Page XXX to Page YYY");
			t131 = space();
			p30 = element("p");
			t132 = text("Well after some investigation, it turns out that it is a special combination of how we write our style declaration and how mini-css-extract-plugin works under the hood.");
			t133 = space();
			p31 = element("p");
			t134 = text("For the sake of simplicity, you can imagine this is how ");
			code0 = element("code");
			t135 = text("mini-css-extract-plugin");
			t136 = text(" works under the hood:");
			t137 = space();
			pre0 = element("pre");
			t138 = space();
			p32 = element("p");
			t139 = text("When you write:");
			t140 = space();
			pre1 = element("pre");
			t141 = space();
			p33 = element("p");
			t142 = text("it gets transformed into something like:");
			t143 = space();
			pre2 = element("pre");
			t144 = space();
			p34 = element("p");
			t145 = text("So when this get executed, it will tries to look for existing link tag, if there's an existing link tag with the same url, it will be the end of it. But, when it does not exist, the ");
			code1 = element("code");
			t146 = text("ensureCss");
			t147 = text(" will create a new link tag and append it at the end of the ");
			code2 = element("code");
			t148 = text("<head>");
			t149 = text(" element.");
			t150 = space();
			p35 = element("p");
			strong2 = element("strong");
			t151 = text("The order of the link tag depends on the order of how you navigate around the application.");
			t152 = space();
			p36 = element("p");
			t153 = text("If you are overwriting the same element style in 2 different css files, and in both file if you are specifying the same specificity, the style eventually got applied will solely depend on how your user navigate around your application.");
			t154 = space();
			p37 = element("p");
			t155 = text("The solution for this is to make your css declaration more specific when overwriting a particular style.");
			t156 = space();
			p38 = element("p");
			t157 = text("eg:");
			t158 = space();
			pre3 = element("pre");
			t159 = space();
			p39 = element("p");
			t160 = text("Another problem we encountered when we tried to be more specific with CSS declaration, is due to how we write our ");
			a26 = element("a");
			t161 = text("React");
			t162 = text(" component with CSS Modules.");
			t163 = space();
			pre4 = element("pre");
			t164 = space();
			p40 = element("p");
			t165 = text("We wrote a custom component that takes in class name so we can overwrite the default style provided by the component.");
			t166 = space();
			p41 = element("p");
			strong3 = element("strong");
			t167 = text("The order of classes in the class attribute does not matter, only the order in declaration matters.");
			t168 = space();
			p42 = element("p");
			t169 = text("Unfortunately for us this time is that we are using CSS Modules, or else it would be much easier to overwrite it with");
			t170 = space();
			pre5 = element("pre");
			t171 = space();
			p43 = element("p");
			t172 = text("However, because the ");
			code3 = element("code");
			t173 = text(".classA");
			t174 = text(" will get transformed to something like ");
			code4 = element("code");
			t175 = text(".c8e4436e");
			t176 = text(" and we will never know the generated class name in build time, there's no way we can have a more specificity with the approach above.");
			t177 = space();
			p44 = element("p");
			t178 = text("One hack we came across to solve this conundrum is to ");
			a27 = element("a");
			t179 = text("chain the selector with itself to increase its specifity");
			t180 = text(", namely:");
			t181 = space();
			pre6 = element("pre");
			t182 = space();
			p45 = element("p");
			t183 = text("The next problem, is a very specific one.");
			t184 = space();
			p46 = element("p");
			t185 = text("In Shopee we does ");
			a28 = element("a");
			t186 = text("Server Side Rendering");
			t187 = text(", and the nature of ");
			code5 = element("code");
			t188 = text("mini-css-extrac-plugin");
			t189 = text(" that uses browser API, like ");
			code6 = element("code");
			t190 = text("document.createElement");
			t191 = text(" just not working in a server context.");
			t192 = space();
			p47 = element("p");
			t193 = text("We have our on in-house solution for it, which I am not allow to disclose any of it.");
			t194 = space();
			p48 = element("p");
			t195 = text("But if you encounter similar issues, and are stucked somewhere, you can ");
			a29 = element("a");
			t196 = text("find me on twitter");
			t197 = text(", I am more than willing to give out some personal pointers and advices on this matter.");
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
			t0 = claim_text(a0_nodes, "Background");
			a0_nodes.forEach(detach);
			li0_nodes.forEach(detach);
			li1 = claim_element(ul1_nodes, "LI", {});
			var li1_nodes = children(li1);
			a1 = claim_element(li1_nodes, "A", { href: true });
			var a1_nodes = children(a1);
			t1 = claim_text(a1_nodes, "So, how big is Shopee?");
			a1_nodes.forEach(detach);
			li1_nodes.forEach(detach);
			ul0 = claim_element(ul1_nodes, "UL", {});
			var ul0_nodes = children(ul0);
			li2 = claim_element(ul0_nodes, "LI", {});
			var li2_nodes = children(li2);
			a2 = claim_element(li2_nodes, "A", { href: true });
			var a2_nodes = children(a2);
			t2 = claim_text(a2_nodes, "But download time does not tell the full picture.");
			a2_nodes.forEach(detach);
			li2_nodes.forEach(detach);
			ul0_nodes.forEach(detach);
			li3 = claim_element(ul1_nodes, "LI", {});
			var li3_nodes = children(li3);
			a3 = claim_element(li3_nodes, "A", { href: true });
			var a3_nodes = children(a3);
			t3 = claim_text(a3_nodes, "Solution");
			a3_nodes.forEach(detach);
			li3_nodes.forEach(detach);
			li4 = claim_element(ul1_nodes, "LI", {});
			var li4_nodes = children(li4);
			a4 = claim_element(li4_nodes, "A", { href: true });
			var a4_nodes = children(a4);
			t4 = claim_text(a4_nodes, "The Problem");
			a4_nodes.forEach(detach);
			li4_nodes.forEach(detach);
			ul1_nodes.forEach(detach);
			section0_nodes.forEach(detach);
			t5 = claim_space(nodes);
			p0 = claim_element(nodes, "P", {});
			var p0_nodes = children(p0);
			t6 = claim_text(p0_nodes, "In the talk, I shared about why and how ");
			a5 = claim_element(p0_nodes, "A", { href: true, rel: true });
			var a5_nodes = children(a5);
			t7 = claim_text(a5_nodes, "Shopee");
			a5_nodes.forEach(detach);
			t8 = claim_text(p0_nodes, " does CSS Code Splitting and how we solve problems arised in the process.");
			p0_nodes.forEach(detach);
			t9 = claim_space(nodes);
			p1 = claim_element(nodes, "P", {});
			var p1_nodes = children(p1);
			t10 = claim_text(p1_nodes, "For those who don't know about ");
			a6 = claim_element(p1_nodes, "A", { href: true, rel: true });
			var a6_nodes = children(a6);
			t11 = claim_text(a6_nodes, "Shopee");
			a6_nodes.forEach(detach);
			t12 = claim_text(p1_nodes, ", we are an e-commerce platform based in ");
			a7 = claim_element(p1_nodes, "A", { href: true, rel: true });
			var a7_nodes = children(a7);
			t13 = claim_text(a7_nodes, "Greater Southeast Asia");
			a7_nodes.forEach(detach);
			t14 = claim_text(p1_nodes, ", headquartered in Singapore. As a frontend engineer in Shopee, we constantly striving to deliver performant user experience with high network latency and slow CPU devices.");
			p1_nodes.forEach(detach);
			t15 = claim_space(nodes);
			hr0 = claim_element(nodes, "HR", {});
			t16 = claim_space(nodes);
			section1 = claim_element(nodes, "SECTION", {});
			var section1_nodes = children(section1);
			h20 = claim_element(section1_nodes, "H2", {});
			var h20_nodes = children(h20);
			a8 = claim_element(h20_nodes, "A", { href: true, id: true });
			var a8_nodes = children(a8);
			t17 = claim_text(a8_nodes, "Background");
			a8_nodes.forEach(detach);
			h20_nodes.forEach(detach);
			t18 = claim_space(section1_nodes);
			p2 = claim_element(section1_nodes, "P", {});
			var p2_nodes = children(p2);
			t19 = claim_text(p2_nodes, "A little background on how we use CSS in Shopee before getting into how we code split our CSS:");
			p2_nodes.forEach(detach);
			t20 = claim_space(section1_nodes);
			blockquote0 = claim_element(section1_nodes, "BLOCKQUOTE", {});
			var blockquote0_nodes = children(blockquote0);
			p3 = claim_element(blockquote0_nodes, "P", {});
			var p3_nodes = children(p3);
			t21 = claim_text(p3_nodes, "We use SASS and CSS Modules, and we bundle all our stylesheets with webpack into 1 final CSS file.");
			p3_nodes.forEach(detach);
			blockquote0_nodes.forEach(detach);
			t22 = claim_space(section1_nodes);
			p4 = claim_element(section1_nodes, "P", {});
			var p4_nodes = children(p4);
			t23 = claim_text(p4_nodes, "For the benefit of those who might not know about ");
			a9 = claim_element(p4_nodes, "A", { href: true, rel: true });
			var a9_nodes = children(a9);
			t24 = claim_text(a9_nodes, "SASS");
			a9_nodes.forEach(detach);
			t25 = claim_text(p4_nodes, ", SASS is a sassy extension of CSS that allow us to write functions and mixins, so we can easily reuse common css tricks and patterns.");
			p4_nodes.forEach(detach);
			t26 = claim_space(section1_nodes);
			p5 = claim_element(section1_nodes, "P", {});
			var p5_nodes = children(p5);
			a10 = claim_element(p5_nodes, "A", { href: true, rel: true });
			var a10_nodes = children(a10);
			t27 = claim_text(a10_nodes, "CSS Modules");
			a10_nodes.forEach(detach);
			t28 = claim_text(p5_nodes, " on the other hand, free us from racking our brain, coming up with a unique class name for every element. Even with ");
			a11 = claim_element(p5_nodes, "A", { href: true, rel: true });
			var a11_nodes = children(a11);
			t29 = claim_text(a11_nodes, "BEM (Block Element Modifier) naming convention");
			a11_nodes.forEach(detach);
			t30 = claim_text(p5_nodes, ", as our application grows complex, we can't keep up with names for our element. Names with BEM convention just get longer and longer. With CSS Modules, we just need to make sure that within a CSS file (we can call it a CSS module, like a js module) the class names are unique. Our build tool will transform the stylesheets and generate class names that is unique throughout the application.");
			p5_nodes.forEach(detach);
			t31 = claim_space(section1_nodes);
			p6 = claim_element(section1_nodes, "P", {});
			var p6_nodes = children(p6);
			t32 = claim_text(p6_nodes, "And lastly with ");
			a12 = claim_element(p6_nodes, "A", { href: true, rel: true });
			var a12_nodes = children(a12);
			t33 = claim_text(a12_nodes, "webpack");
			a12_nodes.forEach(detach);
			t34 = claim_text(p6_nodes, ", we use ");
			a13 = claim_element(p6_nodes, "A", { href: true, rel: true });
			var a13_nodes = children(a13);
			t35 = claim_text(a13_nodes, "extract-text-webpack-plugin");
			a13_nodes.forEach(detach);
			t36 = claim_text(p6_nodes, " to extract all the css code within the application into 1 CSS file.");
			p6_nodes.forEach(detach);
			t37 = claim_space(section1_nodes);
			hr1 = claim_element(section1_nodes, "HR", {});
			section1_nodes.forEach(detach);
			t38 = claim_space(nodes);
			section2 = claim_element(nodes, "SECTION", {});
			var section2_nodes = children(section2);
			h21 = claim_element(section2_nodes, "H2", {});
			var h21_nodes = children(h21);
			a14 = claim_element(h21_nodes, "A", { href: true, id: true });
			var a14_nodes = children(a14);
			t39 = claim_text(a14_nodes, "So, how big is Shopee?");
			a14_nodes.forEach(detach);
			h21_nodes.forEach(detach);
			t40 = claim_space(section2_nodes);
			p7 = claim_element(section2_nodes, "P", {});
			var p7_nodes = children(p7);
			t41 = claim_text(p7_nodes, "If you ask the business team, they will give you the numbers on ");
			a15 = claim_element(p7_nodes, "A", { href: true, rel: true });
			var a15_nodes = children(a15);
			t42 = claim_text(a15_nodes, "how well we are doing in the region");
			a15_nodes.forEach(detach);
			t43 = claim_text(p7_nodes, ".");
			p7_nodes.forEach(detach);
			t44 = claim_space(section2_nodes);
			p8 = claim_element(section2_nodes, "P", {});
			var p8_nodes = children(p8);
			t45 = claim_text(p8_nodes, "But if you ask a frontend engineer, I can tell you is that to date (Mar 27 2019), we have more than a thousand of CSS files, and more than 67K lines of CSS code, and the numbers are growing...");
			p8_nodes.forEach(detach);
			t46 = claim_space(section2_nodes);
			p9 = claim_element(section2_nodes, "P", {});
			var p9_nodes = children(p9);
			t47 = claim_text(p9_nodes, "And all this CSS code is bundled into one whoppingly 500KB CSS file! 😱");
			p9_nodes.forEach(detach);
			t48 = claim_space(section2_nodes);
			blockquote1 = claim_element(section2_nodes, "BLOCKQUOTE", {});
			var blockquote1_nodes = children(blockquote1);
			h30 = claim_element(blockquote1_nodes, "H3", {});
			var h30_nodes = children(h30);
			t49 = claim_text(h30_nodes, "How big is 500KB ?!");
			h30_nodes.forEach(detach);
			blockquote1_nodes.forEach(detach);
			t50 = claim_space(section2_nodes);
			p10 = claim_element(section2_nodes, "P", {});
			var p10_nodes = children(p10);
			a16 = claim_element(p10_nodes, "A", { href: true, rel: true });
			var a16_nodes = children(a16);
			t51 = claim_text(a16_nodes, "500KB is");
			a16_nodes.forEach(detach);
			t52 = claim_text(p10_nodes, ":");
			p10_nodes.forEach(detach);
			t53 = claim_space(section2_nodes);
			ul2 = claim_element(section2_nodes, "UL", {});
			var ul2_nodes = children(ul2);
			li5 = claim_element(ul2_nodes, "LI", {});
			var li5_nodes = children(li5);
			t54 = claim_text(li5_nodes, "1 minute of MP3 at 80 Kbps bitrate");
			li5_nodes.forEach(detach);
			t55 = claim_space(ul2_nodes);
			li6 = claim_element(ul2_nodes, "LI", {});
			var li6_nodes = children(li6);
			t56 = claim_text(li6_nodes, "2 1280x960 JPEG image");
			li6_nodes.forEach(detach);
			t57 = claim_space(ul2_nodes);
			li7 = claim_element(ul2_nodes, "LI", {});
			var li7_nodes = children(li7);
			t58 = claim_text(li7_nodes, "1/10 second through 4G Network");
			li7_nodes.forEach(detach);
			t59 = claim_space(ul2_nodes);
			li8 = claim_element(ul2_nodes, "LI", {});
			var li8_nodes = children(li8);
			t60 = claim_text(li8_nodes, "2 seconds through 3G Network");
			li8_nodes.forEach(detach);
			ul2_nodes.forEach(detach);
			t61 = claim_space(section2_nodes);
			p11 = claim_element(section2_nodes, "P", {});
			var p11_nodes = children(p11);
			t62 = claim_text(p11_nodes, "Wait, who uses 3G nowadays? Isn't 5G is coming?");
			p11_nodes.forEach(detach);
			t63 = claim_space(section2_nodes);
			p12 = claim_element(section2_nodes, "P", {});
			var p12_nodes = children(p12);
			t64 = claim_text(p12_nodes, "Turns out that most of the Southeast Asia is still on 3G if not slow 4G network, except major cities like Singapore, Jakarta, and etc.");
			p12_nodes.forEach(detach);
			t65 = claim_space(section2_nodes);
			p13 = claim_element(section2_nodes, "P", {});
			var p13_nodes = children(p13);
			t66 = claim_text(p13_nodes, "So file size is indeed a big concern, when it comes to network speed.");
			p13_nodes.forEach(detach);
			section2_nodes.forEach(detach);
			t67 = claim_space(nodes);
			section3 = claim_element(nodes, "SECTION", {});
			var section3_nodes = children(section3);
			h31 = claim_element(section3_nodes, "H3", {});
			var h31_nodes = children(h31);
			a17 = claim_element(h31_nodes, "A", { href: true, id: true });
			var a17_nodes = children(a17);
			t68 = claim_text(a17_nodes, "But download time does not tell the full picture.");
			a17_nodes.forEach(detach);
			h31_nodes.forEach(detach);
			t69 = claim_space(section3_nodes);
			p14 = claim_element(section3_nodes, "P", {});
			var p14_nodes = children(p14);
			t70 = claim_text(p14_nodes, "Because you need to look at it holistically in terms of the ");
			a18 = claim_element(p14_nodes, "A", { href: true, rel: true });
			var a18_nodes = children(a18);
			t71 = claim_text(a18_nodes, "critical rendering path");
			a18_nodes.forEach(detach);
			t72 = claim_text(p14_nodes, ":");
			p14_nodes.forEach(detach);
			t73 = claim_space(section3_nodes);
			ol0 = claim_element(section3_nodes, "OL", {});
			var ol0_nodes = children(ol0);
			li9 = claim_element(ol0_nodes, "LI", {});
			var li9_nodes = children(li9);
			t74 = claim_text(li9_nodes, "When the browser sees a ");
			em = claim_element(li9_nodes, "EM", {});
			var em_nodes = children(em);
			t75 = claim_text(em_nodes, "link tag");
			em_nodes.forEach(detach);
			t76 = claim_text(li9_nodes, " that links to a CSS file, the browser will go and fetch the CSS file.");
			li9_nodes.forEach(detach);
			t77 = claim_space(ol0_nodes);
			li10 = claim_element(ol0_nodes, "LI", {});
			var li10_nodes = children(li10);
			t78 = claim_text(li10_nodes, "As soon as the CSS is downloaded into the memory, the browser will start to parse and generate a ");
			a19 = claim_element(li10_nodes, "A", { href: true, rel: true });
			var a19_nodes = children(a19);
			t79 = claim_text(a19_nodes, "CSSOM (CSS Object Model)");
			a19_nodes.forEach(detach);
			li10_nodes.forEach(detach);
			t80 = claim_space(ol0_nodes);
			li11 = claim_element(ol0_nodes, "LI", {});
			var li11_nodes = children(li11);
			t81 = claim_text(li11_nodes, "When the DOM is ready for layout, the browser will refer to CSSOM to get the style properties for a particular element and starts to layout.");
			li11_nodes.forEach(detach);
			ol0_nodes.forEach(detach);
			t82 = claim_space(section3_nodes);
			p15 = claim_element(section3_nodes, "P", {});
			var p15_nodes = children(p15);
			t83 = claim_text(p15_nodes, "Which means if your CSS file is large, it will takes up a portion of time to download, and another portion of time to parse, and generate the CSSOM. All these can be traced with the ");
			a20 = claim_element(p15_nodes, "A", { href: true, rel: true });
			var a20_nodes = children(a20);
			t84 = claim_text(a20_nodes, "Chrome's timeline tool");
			a20_nodes.forEach(detach);
			t85 = claim_text(p15_nodes, ".");
			p15_nodes.forEach(detach);
			t86 = claim_space(section3_nodes);
			p16 = claim_element(section3_nodes, "P", {});
			var p16_nodes = children(p16);
			t87 = claim_text(p16_nodes, "And what makes the matter worse is that, if we open up the ");
			a21 = claim_element(p16_nodes, "A", { href: true, rel: true });
			var a21_nodes = children(a21);
			t88 = claim_text(a21_nodes, "Chrome's Coverage tool");
			a21_nodes.forEach(detach);
			t89 = claim_text(p16_nodes, ", you will see that more than 90% of the CSS code is not being used to style the current page.");
			p16_nodes.forEach(detach);
			t90 = claim_space(section3_nodes);
			p17 = claim_element(section3_nodes, "P", {});
			var p17_nodes = children(p17);
			strong0 = claim_element(p17_nodes, "STRONG", {});
			var strong0_nodes = children(strong0);
			t91 = claim_text(strong0_nodes, "After all the trouble, only 10% of it is being useful");
			strong0_nodes.forEach(detach);
			t92 = claim_text(p17_nodes, " 😢.");
			p17_nodes.forEach(detach);
			t93 = claim_space(section3_nodes);
			p18 = claim_element(section3_nodes, "P", {});
			var p18_nodes = children(p18);
			t94 = claim_text(p18_nodes, "So, we have to do what we need to do.");
			p18_nodes.forEach(detach);
			section3_nodes.forEach(detach);
			t95 = claim_space(nodes);
			section4 = claim_element(nodes, "SECTION", {});
			var section4_nodes = children(section4);
			h22 = claim_element(section4_nodes, "H2", {});
			var h22_nodes = children(h22);
			a22 = claim_element(h22_nodes, "A", { href: true, id: true });
			var a22_nodes = children(a22);
			t96 = claim_text(a22_nodes, "Solution");
			a22_nodes.forEach(detach);
			h22_nodes.forEach(detach);
			t97 = claim_space(section4_nodes);
			p19 = claim_element(section4_nodes, "P", {});
			var p19_nodes = children(p19);
			t98 = claim_text(p19_nodes, "Big code file, that take long to download and parse, slows down the browser is not a new problem in frontend development. Indeed we've already solved this for JavaScript, we just need to apply the same technique for CSS this time.");
			p19_nodes.forEach(detach);
			t99 = claim_space(section4_nodes);
			p20 = claim_element(section4_nodes, "P", {});
			var p20_nodes = children(p20);
			t100 = claim_text(p20_nodes, "The answer to all of this is ");
			strong1 = claim_element(p20_nodes, "STRONG", {});
			var strong1_nodes = children(strong1);
			t101 = claim_text(strong1_nodes, "Code Splitting");
			strong1_nodes.forEach(detach);
			t102 = claim_text(p20_nodes, " 👏👏");
			p20_nodes.forEach(detach);
			t103 = claim_space(section4_nodes);
			p21 = claim_element(section4_nodes, "P", {});
			var p21_nodes = children(p21);
			t104 = claim_text(p21_nodes, "The concept of Code Splitting is to split the code into seperate bundles, and dynamically load then only when you need it.");
			p21_nodes.forEach(detach);
			t105 = claim_space(section4_nodes);
			p22 = claim_element(section4_nodes, "P", {});
			var p22_nodes = children(p22);
			t106 = claim_text(p22_nodes, "There's a few ways you can look at code splitting, you can:");
			p22_nodes.forEach(detach);
			t107 = claim_space(section4_nodes);
			ol1 = claim_element(section4_nodes, "OL", {});
			var ol1_nodes = children(ol1);
			li12 = claim_element(ol1_nodes, "LI", {});
			var li12_nodes = children(li12);
			t108 = claim_text(li12_nodes, "Split code based on url routes, you don't have to load the code for Page 2 in Page 1");
			li12_nodes.forEach(detach);
			t109 = claim_space(ol1_nodes);
			li13 = claim_element(ol1_nodes, "LI", {});
			var li13_nodes = children(li13);
			t110 = claim_text(li13_nodes, "Split code based on sections, you dont need code that is off the screen to be loaded now. Only load them when you need it.");
			li13_nodes.forEach(detach);
			ol1_nodes.forEach(detach);
			t111 = claim_space(section4_nodes);
			p23 = claim_element(section4_nodes, "P", {});
			var p23_nodes = children(p23);
			t112 = claim_text(p23_nodes, "So just as we were ");
			a23 = claim_element(p23_nodes, "A", { href: true, rel: true });
			var a23_nodes = children(a23);
			t113 = claim_text(a23_nodes, "upgrading Webpack to Webpack 4");
			a23_nodes.forEach(detach);
			t114 = claim_text(p23_nodes, ", our extract-text-webpack-plugin announced that we should be using ");
			a24 = claim_element(p23_nodes, "A", { href: true, rel: true });
			var a24_nodes = children(a24);
			t115 = claim_text(a24_nodes, "mini-css-extract-plugin");
			a24_nodes.forEach(detach);
			t116 = claim_text(p23_nodes, " for CSS now.");
			p23_nodes.forEach(detach);
			t117 = claim_space(section4_nodes);
			p24 = claim_element(section4_nodes, "P", {});
			var p24_nodes = children(p24);
			t118 = claim_text(p24_nodes, "We followed the guide of setting up the new plugin and it worked amazing! 😎");
			p24_nodes.forEach(detach);
			t119 = claim_space(section4_nodes);
			p25 = claim_element(section4_nodes, "P", {});
			var p25_nodes = children(p25);
			t120 = claim_text(p25_nodes, "What's different between extract-text-webpack-plugin and mini-css-extract-plugin is that the latter will generate 1 css file per 1 js bundle instead of combining all css files into 1 css file per build.");
			p25_nodes.forEach(detach);
			t121 = claim_space(section4_nodes);
			p26 = claim_element(section4_nodes, "P", {});
			var p26_nodes = children(p26);
			t122 = claim_text(p26_nodes, "All is well until we got our first bug ticket 😫");
			p26_nodes.forEach(detach);
			section4_nodes.forEach(detach);
			t123 = claim_space(nodes);
			section5 = claim_element(nodes, "SECTION", {});
			var section5_nodes = children(section5);
			h23 = claim_element(section5_nodes, "H2", {});
			var h23_nodes = children(h23);
			a25 = claim_element(h23_nodes, "A", { href: true, id: true });
			var a25_nodes = children(a25);
			t124 = claim_text(a25_nodes, "The Problem");
			a25_nodes.forEach(detach);
			h23_nodes.forEach(detach);
			t125 = claim_space(section5_nodes);
			blockquote2 = claim_element(section5_nodes, "BLOCKQUOTE", {});
			var blockquote2_nodes = children(blockquote2);
			p27 = claim_element(blockquote2_nodes, "P", {});
			var p27_nodes = children(p27);
			t126 = claim_text(p27_nodes, "Styles broken when user goes from Page XXX to Page YYY");
			p27_nodes.forEach(detach);
			t127 = claim_space(blockquote2_nodes);
			p28 = claim_element(blockquote2_nodes, "P", {});
			var p28_nodes = children(p28);
			t128 = claim_text(p28_nodes, "But...");
			p28_nodes.forEach(detach);
			t129 = claim_space(blockquote2_nodes);
			p29 = claim_element(blockquote2_nodes, "P", {});
			var p29_nodes = children(p29);
			t130 = claim_text(p29_nodes, "Stlyes working fine when user goes directly to Page YYY, it's only broken when user goes from Page XXX to Page YYY");
			p29_nodes.forEach(detach);
			blockquote2_nodes.forEach(detach);
			t131 = claim_space(section5_nodes);
			p30 = claim_element(section5_nodes, "P", {});
			var p30_nodes = children(p30);
			t132 = claim_text(p30_nodes, "Well after some investigation, it turns out that it is a special combination of how we write our style declaration and how mini-css-extract-plugin works under the hood.");
			p30_nodes.forEach(detach);
			t133 = claim_space(section5_nodes);
			p31 = claim_element(section5_nodes, "P", {});
			var p31_nodes = children(p31);
			t134 = claim_text(p31_nodes, "For the sake of simplicity, you can imagine this is how ");
			code0 = claim_element(p31_nodes, "CODE", {});
			var code0_nodes = children(code0);
			t135 = claim_text(code0_nodes, "mini-css-extract-plugin");
			code0_nodes.forEach(detach);
			t136 = claim_text(p31_nodes, " works under the hood:");
			p31_nodes.forEach(detach);
			t137 = claim_space(section5_nodes);
			pre0 = claim_element(section5_nodes, "PRE", { class: true });
			var pre0_nodes = children(pre0);
			pre0_nodes.forEach(detach);
			t138 = claim_space(section5_nodes);
			p32 = claim_element(section5_nodes, "P", {});
			var p32_nodes = children(p32);
			t139 = claim_text(p32_nodes, "When you write:");
			p32_nodes.forEach(detach);
			t140 = claim_space(section5_nodes);
			pre1 = claim_element(section5_nodes, "PRE", { class: true });
			var pre1_nodes = children(pre1);
			pre1_nodes.forEach(detach);
			t141 = claim_space(section5_nodes);
			p33 = claim_element(section5_nodes, "P", {});
			var p33_nodes = children(p33);
			t142 = claim_text(p33_nodes, "it gets transformed into something like:");
			p33_nodes.forEach(detach);
			t143 = claim_space(section5_nodes);
			pre2 = claim_element(section5_nodes, "PRE", { class: true });
			var pre2_nodes = children(pre2);
			pre2_nodes.forEach(detach);
			t144 = claim_space(section5_nodes);
			p34 = claim_element(section5_nodes, "P", {});
			var p34_nodes = children(p34);
			t145 = claim_text(p34_nodes, "So when this get executed, it will tries to look for existing link tag, if there's an existing link tag with the same url, it will be the end of it. But, when it does not exist, the ");
			code1 = claim_element(p34_nodes, "CODE", {});
			var code1_nodes = children(code1);
			t146 = claim_text(code1_nodes, "ensureCss");
			code1_nodes.forEach(detach);
			t147 = claim_text(p34_nodes, " will create a new link tag and append it at the end of the ");
			code2 = claim_element(p34_nodes, "CODE", {});
			var code2_nodes = children(code2);
			t148 = claim_text(code2_nodes, "<head>");
			code2_nodes.forEach(detach);
			t149 = claim_text(p34_nodes, " element.");
			p34_nodes.forEach(detach);
			t150 = claim_space(section5_nodes);
			p35 = claim_element(section5_nodes, "P", {});
			var p35_nodes = children(p35);
			strong2 = claim_element(p35_nodes, "STRONG", {});
			var strong2_nodes = children(strong2);
			t151 = claim_text(strong2_nodes, "The order of the link tag depends on the order of how you navigate around the application.");
			strong2_nodes.forEach(detach);
			p35_nodes.forEach(detach);
			t152 = claim_space(section5_nodes);
			p36 = claim_element(section5_nodes, "P", {});
			var p36_nodes = children(p36);
			t153 = claim_text(p36_nodes, "If you are overwriting the same element style in 2 different css files, and in both file if you are specifying the same specificity, the style eventually got applied will solely depend on how your user navigate around your application.");
			p36_nodes.forEach(detach);
			t154 = claim_space(section5_nodes);
			p37 = claim_element(section5_nodes, "P", {});
			var p37_nodes = children(p37);
			t155 = claim_text(p37_nodes, "The solution for this is to make your css declaration more specific when overwriting a particular style.");
			p37_nodes.forEach(detach);
			t156 = claim_space(section5_nodes);
			p38 = claim_element(section5_nodes, "P", {});
			var p38_nodes = children(p38);
			t157 = claim_text(p38_nodes, "eg:");
			p38_nodes.forEach(detach);
			t158 = claim_space(section5_nodes);
			pre3 = claim_element(section5_nodes, "PRE", { class: true });
			var pre3_nodes = children(pre3);
			pre3_nodes.forEach(detach);
			t159 = claim_space(section5_nodes);
			p39 = claim_element(section5_nodes, "P", {});
			var p39_nodes = children(p39);
			t160 = claim_text(p39_nodes, "Another problem we encountered when we tried to be more specific with CSS declaration, is due to how we write our ");
			a26 = claim_element(p39_nodes, "A", { href: true, rel: true });
			var a26_nodes = children(a26);
			t161 = claim_text(a26_nodes, "React");
			a26_nodes.forEach(detach);
			t162 = claim_text(p39_nodes, " component with CSS Modules.");
			p39_nodes.forEach(detach);
			t163 = claim_space(section5_nodes);
			pre4 = claim_element(section5_nodes, "PRE", { class: true });
			var pre4_nodes = children(pre4);
			pre4_nodes.forEach(detach);
			t164 = claim_space(section5_nodes);
			p40 = claim_element(section5_nodes, "P", {});
			var p40_nodes = children(p40);
			t165 = claim_text(p40_nodes, "We wrote a custom component that takes in class name so we can overwrite the default style provided by the component.");
			p40_nodes.forEach(detach);
			t166 = claim_space(section5_nodes);
			p41 = claim_element(section5_nodes, "P", {});
			var p41_nodes = children(p41);
			strong3 = claim_element(p41_nodes, "STRONG", {});
			var strong3_nodes = children(strong3);
			t167 = claim_text(strong3_nodes, "The order of classes in the class attribute does not matter, only the order in declaration matters.");
			strong3_nodes.forEach(detach);
			p41_nodes.forEach(detach);
			t168 = claim_space(section5_nodes);
			p42 = claim_element(section5_nodes, "P", {});
			var p42_nodes = children(p42);
			t169 = claim_text(p42_nodes, "Unfortunately for us this time is that we are using CSS Modules, or else it would be much easier to overwrite it with");
			p42_nodes.forEach(detach);
			t170 = claim_space(section5_nodes);
			pre5 = claim_element(section5_nodes, "PRE", { class: true });
			var pre5_nodes = children(pre5);
			pre5_nodes.forEach(detach);
			t171 = claim_space(section5_nodes);
			p43 = claim_element(section5_nodes, "P", {});
			var p43_nodes = children(p43);
			t172 = claim_text(p43_nodes, "However, because the ");
			code3 = claim_element(p43_nodes, "CODE", {});
			var code3_nodes = children(code3);
			t173 = claim_text(code3_nodes, ".classA");
			code3_nodes.forEach(detach);
			t174 = claim_text(p43_nodes, " will get transformed to something like ");
			code4 = claim_element(p43_nodes, "CODE", {});
			var code4_nodes = children(code4);
			t175 = claim_text(code4_nodes, ".c8e4436e");
			code4_nodes.forEach(detach);
			t176 = claim_text(p43_nodes, " and we will never know the generated class name in build time, there's no way we can have a more specificity with the approach above.");
			p43_nodes.forEach(detach);
			t177 = claim_space(section5_nodes);
			p44 = claim_element(section5_nodes, "P", {});
			var p44_nodes = children(p44);
			t178 = claim_text(p44_nodes, "One hack we came across to solve this conundrum is to ");
			a27 = claim_element(p44_nodes, "A", { href: true, rel: true });
			var a27_nodes = children(a27);
			t179 = claim_text(a27_nodes, "chain the selector with itself to increase its specifity");
			a27_nodes.forEach(detach);
			t180 = claim_text(p44_nodes, ", namely:");
			p44_nodes.forEach(detach);
			t181 = claim_space(section5_nodes);
			pre6 = claim_element(section5_nodes, "PRE", { class: true });
			var pre6_nodes = children(pre6);
			pre6_nodes.forEach(detach);
			t182 = claim_space(section5_nodes);
			p45 = claim_element(section5_nodes, "P", {});
			var p45_nodes = children(p45);
			t183 = claim_text(p45_nodes, "The next problem, is a very specific one.");
			p45_nodes.forEach(detach);
			t184 = claim_space(section5_nodes);
			p46 = claim_element(section5_nodes, "P", {});
			var p46_nodes = children(p46);
			t185 = claim_text(p46_nodes, "In Shopee we does ");
			a28 = claim_element(p46_nodes, "A", { href: true, rel: true });
			var a28_nodes = children(a28);
			t186 = claim_text(a28_nodes, "Server Side Rendering");
			a28_nodes.forEach(detach);
			t187 = claim_text(p46_nodes, ", and the nature of ");
			code5 = claim_element(p46_nodes, "CODE", {});
			var code5_nodes = children(code5);
			t188 = claim_text(code5_nodes, "mini-css-extrac-plugin");
			code5_nodes.forEach(detach);
			t189 = claim_text(p46_nodes, " that uses browser API, like ");
			code6 = claim_element(p46_nodes, "CODE", {});
			var code6_nodes = children(code6);
			t190 = claim_text(code6_nodes, "document.createElement");
			code6_nodes.forEach(detach);
			t191 = claim_text(p46_nodes, " just not working in a server context.");
			p46_nodes.forEach(detach);
			t192 = claim_space(section5_nodes);
			p47 = claim_element(section5_nodes, "P", {});
			var p47_nodes = children(p47);
			t193 = claim_text(p47_nodes, "We have our on in-house solution for it, which I am not allow to disclose any of it.");
			p47_nodes.forEach(detach);
			t194 = claim_space(section5_nodes);
			p48 = claim_element(section5_nodes, "P", {});
			var p48_nodes = children(p48);
			t195 = claim_text(p48_nodes, "But if you encounter similar issues, and are stucked somewhere, you can ");
			a29 = claim_element(p48_nodes, "A", { href: true, rel: true });
			var a29_nodes = children(a29);
			t196 = claim_text(a29_nodes, "find me on twitter");
			a29_nodes.forEach(detach);
			t197 = claim_text(p48_nodes, ", I am more than willing to give out some personal pointers and advices on this matter.");
			p48_nodes.forEach(detach);
			section5_nodes.forEach(detach);
			this.h();
		},
		h() {
			attr(a0, "href", "#background");
			attr(a1, "href", "#so-how-big-is-shopee");
			attr(a2, "href", "#but-download-time-does-not-tell-the-full-picture");
			attr(a3, "href", "#solution");
			attr(a4, "href", "#the-problem");
			attr(ul1, "class", "sitemap");
			attr(ul1, "id", "sitemap");
			attr(ul1, "role", "navigation");
			attr(ul1, "aria-label", "Table of Contents");
			attr(a5, "href", "http://careers.shopee.sg");
			attr(a5, "rel", "nofollow");
			attr(a6, "href", "http://careers.shopee.sg");
			attr(a6, "rel", "nofollow");
			attr(a7, "href", "https://www.seagroup.com/home");
			attr(a7, "rel", "nofollow");
			attr(a8, "href", "#background");
			attr(a8, "id", "background");
			attr(a9, "href", "https://sass-lang.com/");
			attr(a9, "rel", "nofollow");
			attr(a10, "href", "https://github.com/css-modules/css-modules");
			attr(a10, "rel", "nofollow");
			attr(a11, "href", "http://getbem.com/naming/");
			attr(a11, "rel", "nofollow");
			attr(a12, "href", "https://webpack.js.org/");
			attr(a12, "rel", "nofollow");
			attr(a13, "href", "https://github.com/webpack-contrib/extract-text-webpack-plugin");
			attr(a13, "rel", "nofollow");
			attr(a14, "href", "#so-how-big-is-shopee");
			attr(a14, "id", "so-how-big-is-shopee");
			attr(a15, "href", "https://www.techinasia.com/shopee-top-ecommerce-platform-sea");
			attr(a15, "rel", "nofollow");
			attr(a16, "href", "https://www.greennet.org.uk/support/understanding-file-sizes");
			attr(a16, "rel", "nofollow");
			attr(a17, "href", "#but-download-time-does-not-tell-the-full-picture");
			attr(a17, "id", "but-download-time-does-not-tell-the-full-picture");
			attr(a18, "href", "https://developers.google.com/web/fundamentals/performance/critical-rendering-path/");
			attr(a18, "rel", "nofollow");
			attr(a19, "href", "https://developer.mozilla.org/en-US/docs/Web/API/CSS_Object_Model");
			attr(a19, "rel", "nofollow");
			attr(a20, "href", "https://developers.google.com/web/tools/chrome-devtools/evaluate-performance/timeline-tool");
			attr(a20, "rel", "nofollow");
			attr(a21, "href", "https://developers.google.com/web/updates/2017/04/devtools-release-notes#coverage");
			attr(a21, "rel", "nofollow");
			attr(a22, "href", "#solution");
			attr(a22, "id", "solution");
			attr(a23, "href", "https://engineering.seagroup.com/shopee-webpack4/");
			attr(a23, "rel", "nofollow");
			attr(a24, "href", "https://github.com/webpack-contrib/mini-css-extract-plugin");
			attr(a24, "rel", "nofollow");
			attr(a25, "href", "#the-problem");
			attr(a25, "id", "the-problem");
			attr(pre0, "class", "language-js");
			attr(pre1, "class", "language-js");
			attr(pre2, "class", "language-js");
			attr(pre3, "class", "language-css");
			attr(a26, "href", "https://reactjs.org");
			attr(a26, "rel", "nofollow");
			attr(pre4, "class", "language-js");
			attr(pre5, "class", "language-css");
			attr(a27, "href", "https://csswizardry.com/2014/07/hacks-for-dealing-with-specificity/");
			attr(a27, "rel", "nofollow");
			attr(pre6, "class", "language-css");
			attr(a28, "href", "https://developers.google.com/web/updates/2019/02/rendering-on-the-web");
			attr(a28, "rel", "nofollow");
			attr(a29, "href", "https://twitter.com/lihautan");
			attr(a29, "rel", "nofollow");
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
			append(ul1, li3);
			append(li3, a3);
			append(a3, t3);
			append(ul1, li4);
			append(li4, a4);
			append(a4, t4);
			insert(target, t5, anchor);
			insert(target, p0, anchor);
			append(p0, t6);
			append(p0, a5);
			append(a5, t7);
			append(p0, t8);
			insert(target, t9, anchor);
			insert(target, p1, anchor);
			append(p1, t10);
			append(p1, a6);
			append(a6, t11);
			append(p1, t12);
			append(p1, a7);
			append(a7, t13);
			append(p1, t14);
			insert(target, t15, anchor);
			insert(target, hr0, anchor);
			insert(target, t16, anchor);
			insert(target, section1, anchor);
			append(section1, h20);
			append(h20, a8);
			append(a8, t17);
			append(section1, t18);
			append(section1, p2);
			append(p2, t19);
			append(section1, t20);
			append(section1, blockquote0);
			append(blockquote0, p3);
			append(p3, t21);
			append(section1, t22);
			append(section1, p4);
			append(p4, t23);
			append(p4, a9);
			append(a9, t24);
			append(p4, t25);
			append(section1, t26);
			append(section1, p5);
			append(p5, a10);
			append(a10, t27);
			append(p5, t28);
			append(p5, a11);
			append(a11, t29);
			append(p5, t30);
			append(section1, t31);
			append(section1, p6);
			append(p6, t32);
			append(p6, a12);
			append(a12, t33);
			append(p6, t34);
			append(p6, a13);
			append(a13, t35);
			append(p6, t36);
			append(section1, t37);
			append(section1, hr1);
			insert(target, t38, anchor);
			insert(target, section2, anchor);
			append(section2, h21);
			append(h21, a14);
			append(a14, t39);
			append(section2, t40);
			append(section2, p7);
			append(p7, t41);
			append(p7, a15);
			append(a15, t42);
			append(p7, t43);
			append(section2, t44);
			append(section2, p8);
			append(p8, t45);
			append(section2, t46);
			append(section2, p9);
			append(p9, t47);
			append(section2, t48);
			append(section2, blockquote1);
			append(blockquote1, h30);
			append(h30, t49);
			append(section2, t50);
			append(section2, p10);
			append(p10, a16);
			append(a16, t51);
			append(p10, t52);
			append(section2, t53);
			append(section2, ul2);
			append(ul2, li5);
			append(li5, t54);
			append(ul2, t55);
			append(ul2, li6);
			append(li6, t56);
			append(ul2, t57);
			append(ul2, li7);
			append(li7, t58);
			append(ul2, t59);
			append(ul2, li8);
			append(li8, t60);
			append(section2, t61);
			append(section2, p11);
			append(p11, t62);
			append(section2, t63);
			append(section2, p12);
			append(p12, t64);
			append(section2, t65);
			append(section2, p13);
			append(p13, t66);
			insert(target, t67, anchor);
			insert(target, section3, anchor);
			append(section3, h31);
			append(h31, a17);
			append(a17, t68);
			append(section3, t69);
			append(section3, p14);
			append(p14, t70);
			append(p14, a18);
			append(a18, t71);
			append(p14, t72);
			append(section3, t73);
			append(section3, ol0);
			append(ol0, li9);
			append(li9, t74);
			append(li9, em);
			append(em, t75);
			append(li9, t76);
			append(ol0, t77);
			append(ol0, li10);
			append(li10, t78);
			append(li10, a19);
			append(a19, t79);
			append(ol0, t80);
			append(ol0, li11);
			append(li11, t81);
			append(section3, t82);
			append(section3, p15);
			append(p15, t83);
			append(p15, a20);
			append(a20, t84);
			append(p15, t85);
			append(section3, t86);
			append(section3, p16);
			append(p16, t87);
			append(p16, a21);
			append(a21, t88);
			append(p16, t89);
			append(section3, t90);
			append(section3, p17);
			append(p17, strong0);
			append(strong0, t91);
			append(p17, t92);
			append(section3, t93);
			append(section3, p18);
			append(p18, t94);
			insert(target, t95, anchor);
			insert(target, section4, anchor);
			append(section4, h22);
			append(h22, a22);
			append(a22, t96);
			append(section4, t97);
			append(section4, p19);
			append(p19, t98);
			append(section4, t99);
			append(section4, p20);
			append(p20, t100);
			append(p20, strong1);
			append(strong1, t101);
			append(p20, t102);
			append(section4, t103);
			append(section4, p21);
			append(p21, t104);
			append(section4, t105);
			append(section4, p22);
			append(p22, t106);
			append(section4, t107);
			append(section4, ol1);
			append(ol1, li12);
			append(li12, t108);
			append(ol1, t109);
			append(ol1, li13);
			append(li13, t110);
			append(section4, t111);
			append(section4, p23);
			append(p23, t112);
			append(p23, a23);
			append(a23, t113);
			append(p23, t114);
			append(p23, a24);
			append(a24, t115);
			append(p23, t116);
			append(section4, t117);
			append(section4, p24);
			append(p24, t118);
			append(section4, t119);
			append(section4, p25);
			append(p25, t120);
			append(section4, t121);
			append(section4, p26);
			append(p26, t122);
			insert(target, t123, anchor);
			insert(target, section5, anchor);
			append(section5, h23);
			append(h23, a25);
			append(a25, t124);
			append(section5, t125);
			append(section5, blockquote2);
			append(blockquote2, p27);
			append(p27, t126);
			append(blockquote2, t127);
			append(blockquote2, p28);
			append(p28, t128);
			append(blockquote2, t129);
			append(blockquote2, p29);
			append(p29, t130);
			append(section5, t131);
			append(section5, p30);
			append(p30, t132);
			append(section5, t133);
			append(section5, p31);
			append(p31, t134);
			append(p31, code0);
			append(code0, t135);
			append(p31, t136);
			append(section5, t137);
			append(section5, pre0);
			pre0.innerHTML = raw0_value;
			append(section5, t138);
			append(section5, p32);
			append(p32, t139);
			append(section5, t140);
			append(section5, pre1);
			pre1.innerHTML = raw1_value;
			append(section5, t141);
			append(section5, p33);
			append(p33, t142);
			append(section5, t143);
			append(section5, pre2);
			pre2.innerHTML = raw2_value;
			append(section5, t144);
			append(section5, p34);
			append(p34, t145);
			append(p34, code1);
			append(code1, t146);
			append(p34, t147);
			append(p34, code2);
			append(code2, t148);
			append(p34, t149);
			append(section5, t150);
			append(section5, p35);
			append(p35, strong2);
			append(strong2, t151);
			append(section5, t152);
			append(section5, p36);
			append(p36, t153);
			append(section5, t154);
			append(section5, p37);
			append(p37, t155);
			append(section5, t156);
			append(section5, p38);
			append(p38, t157);
			append(section5, t158);
			append(section5, pre3);
			pre3.innerHTML = raw3_value;
			append(section5, t159);
			append(section5, p39);
			append(p39, t160);
			append(p39, a26);
			append(a26, t161);
			append(p39, t162);
			append(section5, t163);
			append(section5, pre4);
			pre4.innerHTML = raw4_value;
			append(section5, t164);
			append(section5, p40);
			append(p40, t165);
			append(section5, t166);
			append(section5, p41);
			append(p41, strong3);
			append(strong3, t167);
			append(section5, t168);
			append(section5, p42);
			append(p42, t169);
			append(section5, t170);
			append(section5, pre5);
			pre5.innerHTML = raw5_value;
			append(section5, t171);
			append(section5, p43);
			append(p43, t172);
			append(p43, code3);
			append(code3, t173);
			append(p43, t174);
			append(p43, code4);
			append(code4, t175);
			append(p43, t176);
			append(section5, t177);
			append(section5, p44);
			append(p44, t178);
			append(p44, a27);
			append(a27, t179);
			append(p44, t180);
			append(section5, t181);
			append(section5, pre6);
			pre6.innerHTML = raw6_value;
			append(section5, t182);
			append(section5, p45);
			append(p45, t183);
			append(section5, t184);
			append(section5, p46);
			append(p46, t185);
			append(p46, a28);
			append(a28, t186);
			append(p46, t187);
			append(p46, code5);
			append(code5, t188);
			append(p46, t189);
			append(p46, code6);
			append(code6, t190);
			append(p46, t191);
			append(section5, t192);
			append(section5, p47);
			append(p47, t193);
			append(section5, t194);
			append(section5, p48);
			append(p48, t195);
			append(p48, a29);
			append(a29, t196);
			append(p48, t197);
		},
		p: noop,
		d(detaching) {
			if (detaching) detach(section0);
			if (detaching) detach(t5);
			if (detaching) detach(p0);
			if (detaching) detach(t9);
			if (detaching) detach(p1);
			if (detaching) detach(t15);
			if (detaching) detach(hr0);
			if (detaching) detach(t16);
			if (detaching) detach(section1);
			if (detaching) detach(t38);
			if (detaching) detach(section2);
			if (detaching) detach(t67);
			if (detaching) detach(section3);
			if (detaching) detach(t95);
			if (detaching) detach(section4);
			if (detaching) detach(t123);
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
	"title": "CSS Code Splitting",
	"occasion": "talk.css meetup",
	"occasionLink": "https://singaporecss.github.io/37/",
	"venue": "Shopee SG",
	"venueLink": "https://www.google.com/maps/place/Shopee+SG/@1.291278,103.7846628,15z/data=!4m2!3m1!1s0x0:0x7ddf2e854cf6e4e4?ved=2ahUKEwi5jbz6z_vgAhVBP48KHWSEAmMQ_BIwFXoECAEQCA",
	"date": "2019-03-27",
	"description": "The motivation of CSS splitting arises when we try to split our CSS styles and lazily load the styles only when we actually need them. CSS code splitting is one of our many efforts where we constantly improve the performance of the application.",
	"slides": "https://slides.com/tanhauhau/css-code-splitting",
	"video": "https://www.engineers.sg/video/css-code-splitting-talk-css--3273",
	"slug": "css-code-splitting",
	"type": "talk"
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
