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
					"@id": "https%3A%2F%2Flihautan.com%2Ferrors-encountered-upgrading-flow-0.85",
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
			attr(meta11, "content", "https%3A%2F%2Flihautan.com%2Ferrors-encountered-upgrading-flow-0.85");
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

/* content/blog/errors-encountered-upgrading-flow-0.85/@@page-markup.svelte generated by Svelte v3.24.0 */

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
	let t6;
	let section1;
	let h20;
	let a6;
	let t7;
	let t8;
	let p0;
	let t9;
	let a7;
	let t10;
	let t11;
	let a8;
	let t12;
	let t13;
	let a9;
	let t14;
	let t15;
	let a10;
	let t16;
	let t17;
	let t18;
	let p1;
	let t19;
	let a11;
	let t20;
	let t21;
	let a12;
	let t22;
	let t23;
	let a13;
	let t24;
	let t25;
	let t26;
	let p2;
	let t27;
	let a14;
	let t28;
	let t29;
	let a15;
	let t30;
	let t31;
	let a16;
	let t32;
	let t33;
	let t34;
	let p3;
	let t35;
	let a17;
	let t36;
	let t37;
	let code0;
	let t38;
	let t39;
	let code1;
	let t40;
	let t41;
	let code2;
	let t42;
	let t43;
	let code3;
	let t44;
	let t45;
	let code4;
	let t46;
	let t47;
	let t48;
	let p4;
	let t49;
	let code5;
	let t50;
	let t51;
	let a18;
	let t52;
	let t53;
	let t54;
	let section2;
	let h21;
	let a19;
	let t55;
	let t56;
	let p5;
	let t57;
	let code6;
	let t58;
	let t59;
	let code7;
	let t60;
	let t61;
	let code8;
	let t62;
	let t63;
	let t64;
	let section3;
	let h22;
	let a20;
	let t65;
	let t66;
	let p6;
	let t67;
	let a21;
	let t68;
	let t69;
	let a22;
	let t70;
	let t71;
	let t72;
	let p7;
	let t73;
	let a23;
	let t74;
	let t75;
	let t76;
	let p8;
	let t77;
	let a24;
	let t78;
	let t79;
	let a25;
	let t80;
	let t81;
	let t82;
	let section4;
	let h23;
	let a26;
	let t83;
	let t84;
	let p9;
	let t85;
	let a27;
	let t86;
	let t87;
	let code9;
	let t88;
	let t89;
	let code10;
	let t90;
	let t91;
	let t92;
	let pre0;
	let raw0_value = `<code class="language-js">foobar<span class="token operator">&lt;</span><span class="token maybe-class-name">Type</span><span class="token operator">></span><span class="token punctuation">(</span><span class="token number">1</span><span class="token punctuation">)</span></code>` + "";
	let t93;
	let p10;
	let t94;
	let em0;
	let t95;
	let t96;
	let t97;
	let pre1;
	let raw1_value = `<code class="language-js">foobar <span class="token operator">&lt;</span> <span class="token maybe-class-name">Type</span> <span class="token operator">></span> <span class="token number">1</span></code>` + "";
	let t98;
	let p11;
	let em1;
	let t99;
	let html_tag;
	let raw2_value = "<" + "";
	let t100;
	let t101;
	let t102;
	let p12;
	let t103;
	let a28;
	let t104;
	let t105;
	let t106;
	let section5;
	let h24;
	let a29;
	let t107;
	let t108;
	let p13;
	let t109;
	let a30;
	let t110;
	let t111;
	let a31;
	let t112;
	let t113;
	let t114;
	let p14;
	let t115;
	let code11;
	let t116;
	let t117;
	let code12;
	let t118;
	let t119;
	let t120;
	let pre2;

	let raw3_value = `<code class="language-json"><span class="token punctuation">&#123;</span>
  <span class="token property">"flow.useLSP"</span><span class="token operator">:</span> <span class="token boolean">true</span><span class="token punctuation">,</span>
  <span class="token property">"flow.lazyMode"</span><span class="token operator">:</span> <span class="token string">"ide"</span>
<span class="token punctuation">&#125;</span></code>` + "";

	let t121;
	let p15;
	let t122;
	let a32;
	let t123;
	let t124;
	let a33;
	let t125;
	let t126;
	let t127;
	let blockquote;
	let p16;
	let t128;
	let t129;
	let p17;
	let t130;
	let strong;
	let t131;
	let t132;
	let a34;
	let t133;
	let t134;
	let section6;
	let h25;
	let a35;
	let t135;
	let t136;
	let p18;
	let t137;
	let t138;
	let p19;
	let t139;
	let t140;
	let p20;
	let t141;
	let t142;
	let ul1;
	let li6;
	let a36;
	let t143;
	let t144;
	let li7;
	let a37;
	let t145;
	let t146;
	let li8;
	let a38;
	let t147;
	let t148;
	let li9;
	let a39;
	let t149;
	let t150;
	let li10;
	let a40;
	let t151;
	let t152;
	let li11;
	let a41;
	let t153;
	let t154;
	let li12;
	let a42;
	let t155;
	let t156;
	let li13;
	let a43;
	let t157;
	let t158;
	let li14;
	let a44;
	let t159;
	let t160;
	let li15;
	let a45;
	let t161;
	let t162;
	let li16;
	let a46;
	let t163;
	let t164;
	let li17;
	let a47;
	let t165;
	let t166;
	let li18;
	let a48;
	let t167;
	let t168;
	let li19;
	let a49;
	let t169;
	let t170;
	let li20;
	let a50;
	let t171;
	let t172;
	let li21;
	let a51;
	let t173;

	return {
		c() {
			section0 = element("section");
			ul0 = element("ul");
			li0 = element("li");
			a0 = element("a");
			t0 = text("Background");
			li1 = element("li");
			a1 = element("a");
			t1 = text("The Tooling");
			li2 = element("li");
			a2 = element("a");
			t2 = text("Babel & Eslint");
			li3 = element("li");
			a3 = element("a");
			t3 = text("Prettier");
			li4 = element("li");
			a4 = element("a");
			t4 = text("VSCode");
			li5 = element("li");
			a5 = element("a");
			t5 = text("Closing remarks");
			t6 = space();
			section1 = element("section");
			h20 = element("h2");
			a6 = element("a");
			t7 = text("Background");
			t8 = space();
			p0 = element("p");
			t9 = text("Despite seeing the JS community ");
			a7 = element("a");
			t10 = text("slowly");
			t11 = space();
			a8 = element("a");
			t12 = text("moving away");
			t13 = text(" from Flow to TypeScript, ");
			a9 = element("a");
			t14 = text("Shopee Web Frontend");
			t15 = text(" codebase is still very much stuck with ");
			a10 = element("a");
			t16 = text("Flow");
			t17 = text(". 😨");
			t18 = space();
			p1 = element("p");
			t19 = text("After some silence, Flow ");
			a11 = element("a");
			t20 = text("has come back and committed to be a more efficient, reliable and friendly tool.");
			t21 = text(" Thus, we decided to give Flow a final chance. However, in order to enjoy the improvements that Flow has made in recent days, we have to upgrade Flow from 0.83 (since our last update) to v0.97 (latest to date), which meant that we need to upgrade past v0.85, ");
			a12 = element("a");
			t22 = text("which meant hell");
			t23 = text(" to ");
			a13 = element("a");
			t24 = text("codebase that uses react-redux extensively");
			t25 = text(".");
			t26 = space();
			p2 = element("p");
			t27 = text("One of our ");
			a14 = element("a");
			t28 = text("brave developer, Gao Wei");
			t29 = text(" took up the challenge and decided to bring us to the bright side of Flow. 😅. She ");
			a15 = element("a");
			t30 = text("twitted");
			t31 = text(" and wrote ");
			a16 = element("a");
			t32 = text("an article");
			t33 = text(" on how she fixed the errors arose in the process.");
			t34 = space();
			p3 = element("p");
			t35 = text("To put the problem in perspective, from Flow 0.85 onwards, Flow is asking for ");
			a17 = element("a");
			t36 = text("required annotations for implicit annotations");
			t37 = text(". Or less technical, if you are trying to ");
			code0 = element("code");
			t38 = text("export");
			t39 = text(" something that was created from a generic class (eg: ");
			code1 = element("code");
			t40 = text("class Foo<T>");
			t41 = text(") or functions (eg: ");
			code2 = element("code");
			t42 = text("function foo<T>(){}");
			t43 = text("), without explicit type arguments (eg: ");
			code3 = element("code");
			t44 = text("new Foo<Type>()");
			t45 = text(" or ");
			code4 = element("code");
			t46 = text("foo<Type>()");
			t47 = text("), Flow is going to give you an error.");
			t48 = space();
			p4 = element("p");
			t49 = text("Or in layman terms, if your repo is full of HOCs or ");
			code5 = element("code");
			t50 = text("connect()");
			t51 = text(", you are f**ked. So, be sure the check ");
			a18 = element("a");
			t52 = text("Gao Wei's blog");
			t53 = text(" if you are one of the brave souls upgrading a Flow project.");
			t54 = space();
			section2 = element("section");
			h21 = element("h2");
			a19 = element("a");
			t55 = text("The Tooling");
			t56 = space();
			p5 = element("p");
			t57 = text("In this article, I would like to list out some of the  roadblocks we encountered that was less well discussed, the tooling for the latest Flow syntax, which is the ");
			code6 = element("code");
			t58 = text("TypeParameterInstantiation");
			t59 = text(", eg: calling a function or instantiation a class with a type parameter, ");
			code7 = element("code");
			t60 = text("new Foo<Type>()");
			t61 = text(" or ");
			code8 = element("code");
			t62 = text("foo<Type>()");
			t63 = text(".");
			t64 = space();
			section3 = element("section");
			h22 = element("h2");
			a20 = element("a");
			t65 = text("Babel & Eslint");
			t66 = space();
			p6 = element("p");
			t67 = text("We had to upgrade our babel to ");
			a21 = element("a");
			t68 = text("babel v7");
			t69 = text(" and babel-eslint (a babel wrapper for eslint) to ");
			a22 = element("a");
			t70 = text("babel-eslint v9");
			t71 = text(" to support this new syntax.");
			t72 = space();
			p7 = element("p");
			t73 = text("You can read about on how we came to realise the need of this upgrade ");
			a23 = element("a");
			t74 = text("in my previous post");
			t75 = text(".");
			t76 = space();
			p8 = element("p");
			t77 = text("There was another interesting bug that we ran into regarding ");
			a24 = element("a");
			t78 = text("@babel/plugin-transform-flow-strip-types");
			t79 = text(", you can read more on how we uncover it in ");
			a25 = element("a");
			t80 = text("my other blog post");
			t81 = text(".");
			t82 = space();
			section4 = element("section");
			h23 = element("h2");
			a26 = element("a");
			t83 = text("Prettier");
			t84 = space();
			p9 = element("p");
			t85 = text("We had to upgrade prettier to ");
			a27 = element("a");
			t86 = text("v1.16.0");
			t87 = text(" and use ");
			code9 = element("code");
			t88 = text("babel-flow");
			t89 = text(" parser for ");
			code10 = element("code");
			t90 = text("prettier");
			t91 = text(" to resolve the ambiguity in syntax arise in parsing the newer Flow syntax. In simpler terms, to tell Prettier that");
			t92 = space();
			pre0 = element("pre");
			t93 = space();
			p10 = element("p");
			t94 = text("is ");
			em0 = element("em");
			t95 = text("calling foobar with argument, 1 and type, \"Type\"");
			t96 = text(", instead of:");
			t97 = space();
			pre1 = element("pre");
			t98 = space();
			p11 = element("p");
			em1 = element("em");
			t99 = text("is the result of foobar ");
			t100 = text(" Type, greater than 1?");
			t101 = text(" 😂");
			t102 = space();
			p12 = element("p");
			t103 = text("You can read more about it in ");
			a28 = element("a");
			t104 = text("Prettier's blog post");
			t105 = text(".");
			t106 = space();
			section5 = element("section");
			h24 = element("h2");
			a29 = element("a");
			t107 = text("VSCode");
			t108 = space();
			p13 = element("p");
			t109 = text("Flow ");
			a30 = element("a");
			t110 = text("Lazy Mode");
			t111 = text(" has been around since v0.68, but we hadn't enjoy the benefit of lazy mode through VSCode ");
			a31 = element("a");
			t112 = text("until recently");
			t113 = text(".");
			t114 = space();
			p14 = element("p");
			t115 = text("Now we can specify ");
			code11 = element("code");
			t116 = text("lazyMode");
			t117 = text(" in our ");
			code12 = element("code");
			t118 = text(".vscode/settings.json");
			t119 = text(":");
			t120 = space();
			pre2 = element("pre");
			t121 = space();
			p15 = element("p");
			t122 = text("Although ");
			a32 = element("a");
			t123 = text("lazy mode");
			t124 = text(" reduces the scope where Flow does type checking, one of the pain point we had with Flow was to wait for Flow to do recheck, before returning a meaningful Flow status again. Flow team did some optimisation in ");
			a33 = element("a");
			t125 = text("v92.0");
			t126 = text(", where it says:");
			t127 = space();
			blockquote = element("blockquote");
			p16 = element("p");
			t128 = text("This release culminates months of hard work on quality of life improvements for IDE support.\nExpect your requests to be faster, and your requests to take a bit less time.");
			t129 = space();
			p17 = element("p");
			t130 = text("According to the release note, Flow is now able to ");
			strong = element("strong");
			t131 = text("provide type definitions while rechecking");
			t132 = text(", for further details on how they achieve this, you can read the ");
			a34 = element("a");
			t133 = text("Flow blog");
			t134 = space();
			section6 = element("section");
			h25 = element("h2");
			a35 = element("a");
			t135 = text("Closing remarks");
			t136 = space();
			p18 = element("p");
			t137 = text("Finally we managed to get Flow running in v0.97 🎉. We've been struggling with bad developer experience with v0.83 for the longest time, hopefully v0.97 do not let us down.");
			t138 = space();
			p19 = element("p");
			t139 = text("Lastly, be sure to check out all the links sprinkled throughout this blog, they link to Github issues, commits, release notes, and who knows it might lead you to some unexpected adventures? 🤷‍");
			t140 = space();
			p20 = element("p");
			t141 = text("But if you are lazy like me, here are the links, they served as my references when writing this blog post:");
			t142 = space();
			ul1 = element("ul");
			li6 = element("li");
			a36 = element("a");
			t143 = text("Blog: Incremental Migration to TypeScript on a Flowtype codebase");
			t144 = space();
			li7 = element("li");
			a37 = element("a");
			t145 = text("Blog: Porting 30k lines of code from Flow to TypeScript");
			t146 = space();
			li8 = element("li");
			a38 = element("a");
			t147 = text("Issue: What is the official way to type connect ( from flow-typed/react-redux) after 0.85?");
			t148 = space();
			li9 = element("li");
			a39 = element("a");
			t149 = text("Issue: [react-redux] libdef incompatible with flow v0.85 #2946");
			t150 = space();
			li10 = element("li");
			a40 = element("a");
			t151 = text("Tweet: It's so hard to make flow happily get past 0.85 with our codebase...");
			t152 = space();
			li11 = element("li");
			a41 = element("a");
			t153 = text("Blog: Making Flow Happy after 0.85");
			t154 = space();
			li12 = element("li");
			a42 = element("a");
			t155 = text("Blog: Asking for Required Annotations");
			t156 = space();
			li13 = element("li");
			a43 = element("a");
			t157 = text("Docs: Babel 7 Migration");
			t158 = space();
			li14 = element("li");
			a44 = element("a");
			t159 = text("Release Note: babel-eslint v9.0.0");
			t160 = space();
			li15 = element("li");
			a45 = element("a");
			t161 = text("Docs: @babel/plugin-transform-flow-strip-types");
			t162 = space();
			li16 = element("li");
			a46 = element("a");
			t163 = text("Release Note: Prettier v1.16.0");
			t164 = space();
			li17 = element("li");
			a47 = element("a");
			t165 = text("Commit: Lazy mode message for flow status");
			t166 = space();
			li18 = element("li");
			a48 = element("a");
			t167 = text("Commit: feat(lsp): add setting to support flow lazyMode.");
			t168 = space();
			li19 = element("li");
			a49 = element("a");
			t169 = text("Docs: Flow Lazy Mode");
			t170 = space();
			li20 = element("li");
			a50 = element("a");
			t171 = text("Release Note: Flow v0.92.0");
			t172 = space();
			li21 = element("li");
			a51 = element("a");
			t173 = text("Blog: A more responsive Flow");
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
			t1 = claim_text(a1_nodes, "The Tooling");
			a1_nodes.forEach(detach);
			li1_nodes.forEach(detach);
			li2 = claim_element(ul0_nodes, "LI", {});
			var li2_nodes = children(li2);
			a2 = claim_element(li2_nodes, "A", { href: true });
			var a2_nodes = children(a2);
			t2 = claim_text(a2_nodes, "Babel & Eslint");
			a2_nodes.forEach(detach);
			li2_nodes.forEach(detach);
			li3 = claim_element(ul0_nodes, "LI", {});
			var li3_nodes = children(li3);
			a3 = claim_element(li3_nodes, "A", { href: true });
			var a3_nodes = children(a3);
			t3 = claim_text(a3_nodes, "Prettier");
			a3_nodes.forEach(detach);
			li3_nodes.forEach(detach);
			li4 = claim_element(ul0_nodes, "LI", {});
			var li4_nodes = children(li4);
			a4 = claim_element(li4_nodes, "A", { href: true });
			var a4_nodes = children(a4);
			t4 = claim_text(a4_nodes, "VSCode");
			a4_nodes.forEach(detach);
			li4_nodes.forEach(detach);
			li5 = claim_element(ul0_nodes, "LI", {});
			var li5_nodes = children(li5);
			a5 = claim_element(li5_nodes, "A", { href: true });
			var a5_nodes = children(a5);
			t5 = claim_text(a5_nodes, "Closing remarks");
			a5_nodes.forEach(detach);
			li5_nodes.forEach(detach);
			ul0_nodes.forEach(detach);
			section0_nodes.forEach(detach);
			t6 = claim_space(nodes);
			section1 = claim_element(nodes, "SECTION", {});
			var section1_nodes = children(section1);
			h20 = claim_element(section1_nodes, "H2", {});
			var h20_nodes = children(h20);
			a6 = claim_element(h20_nodes, "A", { href: true, id: true });
			var a6_nodes = children(a6);
			t7 = claim_text(a6_nodes, "Background");
			a6_nodes.forEach(detach);
			h20_nodes.forEach(detach);
			t8 = claim_space(section1_nodes);
			p0 = claim_element(section1_nodes, "P", {});
			var p0_nodes = children(p0);
			t9 = claim_text(p0_nodes, "Despite seeing the JS community ");
			a7 = claim_element(p0_nodes, "A", { href: true, rel: true });
			var a7_nodes = children(a7);
			t10 = claim_text(a7_nodes, "slowly");
			a7_nodes.forEach(detach);
			t11 = claim_space(p0_nodes);
			a8 = claim_element(p0_nodes, "A", { href: true, rel: true });
			var a8_nodes = children(a8);
			t12 = claim_text(a8_nodes, "moving away");
			a8_nodes.forEach(detach);
			t13 = claim_text(p0_nodes, " from Flow to TypeScript, ");
			a9 = claim_element(p0_nodes, "A", { href: true, rel: true });
			var a9_nodes = children(a9);
			t14 = claim_text(a9_nodes, "Shopee Web Frontend");
			a9_nodes.forEach(detach);
			t15 = claim_text(p0_nodes, " codebase is still very much stuck with ");
			a10 = claim_element(p0_nodes, "A", { href: true, rel: true });
			var a10_nodes = children(a10);
			t16 = claim_text(a10_nodes, "Flow");
			a10_nodes.forEach(detach);
			t17 = claim_text(p0_nodes, ". 😨");
			p0_nodes.forEach(detach);
			t18 = claim_space(section1_nodes);
			p1 = claim_element(section1_nodes, "P", {});
			var p1_nodes = children(p1);
			t19 = claim_text(p1_nodes, "After some silence, Flow ");
			a11 = claim_element(p1_nodes, "A", { href: true, rel: true });
			var a11_nodes = children(a11);
			t20 = claim_text(a11_nodes, "has come back and committed to be a more efficient, reliable and friendly tool.");
			a11_nodes.forEach(detach);
			t21 = claim_text(p1_nodes, " Thus, we decided to give Flow a final chance. However, in order to enjoy the improvements that Flow has made in recent days, we have to upgrade Flow from 0.83 (since our last update) to v0.97 (latest to date), which meant that we need to upgrade past v0.85, ");
			a12 = claim_element(p1_nodes, "A", { href: true, rel: true });
			var a12_nodes = children(a12);
			t22 = claim_text(a12_nodes, "which meant hell");
			a12_nodes.forEach(detach);
			t23 = claim_text(p1_nodes, " to ");
			a13 = claim_element(p1_nodes, "A", { href: true, rel: true });
			var a13_nodes = children(a13);
			t24 = claim_text(a13_nodes, "codebase that uses react-redux extensively");
			a13_nodes.forEach(detach);
			t25 = claim_text(p1_nodes, ".");
			p1_nodes.forEach(detach);
			t26 = claim_space(section1_nodes);
			p2 = claim_element(section1_nodes, "P", {});
			var p2_nodes = children(p2);
			t27 = claim_text(p2_nodes, "One of our ");
			a14 = claim_element(p2_nodes, "A", { href: true, rel: true });
			var a14_nodes = children(a14);
			t28 = claim_text(a14_nodes, "brave developer, Gao Wei");
			a14_nodes.forEach(detach);
			t29 = claim_text(p2_nodes, " took up the challenge and decided to bring us to the bright side of Flow. 😅. She ");
			a15 = claim_element(p2_nodes, "A", { href: true, rel: true });
			var a15_nodes = children(a15);
			t30 = claim_text(a15_nodes, "twitted");
			a15_nodes.forEach(detach);
			t31 = claim_text(p2_nodes, " and wrote ");
			a16 = claim_element(p2_nodes, "A", { href: true, rel: true });
			var a16_nodes = children(a16);
			t32 = claim_text(a16_nodes, "an article");
			a16_nodes.forEach(detach);
			t33 = claim_text(p2_nodes, " on how she fixed the errors arose in the process.");
			p2_nodes.forEach(detach);
			t34 = claim_space(section1_nodes);
			p3 = claim_element(section1_nodes, "P", {});
			var p3_nodes = children(p3);
			t35 = claim_text(p3_nodes, "To put the problem in perspective, from Flow 0.85 onwards, Flow is asking for ");
			a17 = claim_element(p3_nodes, "A", { href: true, rel: true });
			var a17_nodes = children(a17);
			t36 = claim_text(a17_nodes, "required annotations for implicit annotations");
			a17_nodes.forEach(detach);
			t37 = claim_text(p3_nodes, ". Or less technical, if you are trying to ");
			code0 = claim_element(p3_nodes, "CODE", {});
			var code0_nodes = children(code0);
			t38 = claim_text(code0_nodes, "export");
			code0_nodes.forEach(detach);
			t39 = claim_text(p3_nodes, " something that was created from a generic class (eg: ");
			code1 = claim_element(p3_nodes, "CODE", {});
			var code1_nodes = children(code1);
			t40 = claim_text(code1_nodes, "class Foo<T>");
			code1_nodes.forEach(detach);
			t41 = claim_text(p3_nodes, ") or functions (eg: ");
			code2 = claim_element(p3_nodes, "CODE", {});
			var code2_nodes = children(code2);
			t42 = claim_text(code2_nodes, "function foo<T>(){}");
			code2_nodes.forEach(detach);
			t43 = claim_text(p3_nodes, "), without explicit type arguments (eg: ");
			code3 = claim_element(p3_nodes, "CODE", {});
			var code3_nodes = children(code3);
			t44 = claim_text(code3_nodes, "new Foo<Type>()");
			code3_nodes.forEach(detach);
			t45 = claim_text(p3_nodes, " or ");
			code4 = claim_element(p3_nodes, "CODE", {});
			var code4_nodes = children(code4);
			t46 = claim_text(code4_nodes, "foo<Type>()");
			code4_nodes.forEach(detach);
			t47 = claim_text(p3_nodes, "), Flow is going to give you an error.");
			p3_nodes.forEach(detach);
			t48 = claim_space(section1_nodes);
			p4 = claim_element(section1_nodes, "P", {});
			var p4_nodes = children(p4);
			t49 = claim_text(p4_nodes, "Or in layman terms, if your repo is full of HOCs or ");
			code5 = claim_element(p4_nodes, "CODE", {});
			var code5_nodes = children(code5);
			t50 = claim_text(code5_nodes, "connect()");
			code5_nodes.forEach(detach);
			t51 = claim_text(p4_nodes, ", you are f**ked. So, be sure the check ");
			a18 = claim_element(p4_nodes, "A", { href: true, rel: true });
			var a18_nodes = children(a18);
			t52 = claim_text(a18_nodes, "Gao Wei's blog");
			a18_nodes.forEach(detach);
			t53 = claim_text(p4_nodes, " if you are one of the brave souls upgrading a Flow project.");
			p4_nodes.forEach(detach);
			section1_nodes.forEach(detach);
			t54 = claim_space(nodes);
			section2 = claim_element(nodes, "SECTION", {});
			var section2_nodes = children(section2);
			h21 = claim_element(section2_nodes, "H2", {});
			var h21_nodes = children(h21);
			a19 = claim_element(h21_nodes, "A", { href: true, id: true });
			var a19_nodes = children(a19);
			t55 = claim_text(a19_nodes, "The Tooling");
			a19_nodes.forEach(detach);
			h21_nodes.forEach(detach);
			t56 = claim_space(section2_nodes);
			p5 = claim_element(section2_nodes, "P", {});
			var p5_nodes = children(p5);
			t57 = claim_text(p5_nodes, "In this article, I would like to list out some of the  roadblocks we encountered that was less well discussed, the tooling for the latest Flow syntax, which is the ");
			code6 = claim_element(p5_nodes, "CODE", {});
			var code6_nodes = children(code6);
			t58 = claim_text(code6_nodes, "TypeParameterInstantiation");
			code6_nodes.forEach(detach);
			t59 = claim_text(p5_nodes, ", eg: calling a function or instantiation a class with a type parameter, ");
			code7 = claim_element(p5_nodes, "CODE", {});
			var code7_nodes = children(code7);
			t60 = claim_text(code7_nodes, "new Foo<Type>()");
			code7_nodes.forEach(detach);
			t61 = claim_text(p5_nodes, " or ");
			code8 = claim_element(p5_nodes, "CODE", {});
			var code8_nodes = children(code8);
			t62 = claim_text(code8_nodes, "foo<Type>()");
			code8_nodes.forEach(detach);
			t63 = claim_text(p5_nodes, ".");
			p5_nodes.forEach(detach);
			section2_nodes.forEach(detach);
			t64 = claim_space(nodes);
			section3 = claim_element(nodes, "SECTION", {});
			var section3_nodes = children(section3);
			h22 = claim_element(section3_nodes, "H2", {});
			var h22_nodes = children(h22);
			a20 = claim_element(h22_nodes, "A", { href: true, id: true });
			var a20_nodes = children(a20);
			t65 = claim_text(a20_nodes, "Babel & Eslint");
			a20_nodes.forEach(detach);
			h22_nodes.forEach(detach);
			t66 = claim_space(section3_nodes);
			p6 = claim_element(section3_nodes, "P", {});
			var p6_nodes = children(p6);
			t67 = claim_text(p6_nodes, "We had to upgrade our babel to ");
			a21 = claim_element(p6_nodes, "A", { href: true, rel: true });
			var a21_nodes = children(a21);
			t68 = claim_text(a21_nodes, "babel v7");
			a21_nodes.forEach(detach);
			t69 = claim_text(p6_nodes, " and babel-eslint (a babel wrapper for eslint) to ");
			a22 = claim_element(p6_nodes, "A", { href: true, rel: true });
			var a22_nodes = children(a22);
			t70 = claim_text(a22_nodes, "babel-eslint v9");
			a22_nodes.forEach(detach);
			t71 = claim_text(p6_nodes, " to support this new syntax.");
			p6_nodes.forEach(detach);
			t72 = claim_space(section3_nodes);
			p7 = claim_element(section3_nodes, "P", {});
			var p7_nodes = children(p7);
			t73 = claim_text(p7_nodes, "You can read about on how we came to realise the need of this upgrade ");
			a23 = claim_element(p7_nodes, "A", { href: true, rel: true });
			var a23_nodes = children(a23);
			t74 = claim_text(a23_nodes, "in my previous post");
			a23_nodes.forEach(detach);
			t75 = claim_text(p7_nodes, ".");
			p7_nodes.forEach(detach);
			t76 = claim_space(section3_nodes);
			p8 = claim_element(section3_nodes, "P", {});
			var p8_nodes = children(p8);
			t77 = claim_text(p8_nodes, "There was another interesting bug that we ran into regarding ");
			a24 = claim_element(p8_nodes, "A", { href: true, rel: true });
			var a24_nodes = children(a24);
			t78 = claim_text(a24_nodes, "@babel/plugin-transform-flow-strip-types");
			a24_nodes.forEach(detach);
			t79 = claim_text(p8_nodes, ", you can read more on how we uncover it in ");
			a25 = claim_element(p8_nodes, "A", { href: true });
			var a25_nodes = children(a25);
			t80 = claim_text(a25_nodes, "my other blog post");
			a25_nodes.forEach(detach);
			t81 = claim_text(p8_nodes, ".");
			p8_nodes.forEach(detach);
			section3_nodes.forEach(detach);
			t82 = claim_space(nodes);
			section4 = claim_element(nodes, "SECTION", {});
			var section4_nodes = children(section4);
			h23 = claim_element(section4_nodes, "H2", {});
			var h23_nodes = children(h23);
			a26 = claim_element(h23_nodes, "A", { href: true, id: true });
			var a26_nodes = children(a26);
			t83 = claim_text(a26_nodes, "Prettier");
			a26_nodes.forEach(detach);
			h23_nodes.forEach(detach);
			t84 = claim_space(section4_nodes);
			p9 = claim_element(section4_nodes, "P", {});
			var p9_nodes = children(p9);
			t85 = claim_text(p9_nodes, "We had to upgrade prettier to ");
			a27 = claim_element(p9_nodes, "A", { href: true, rel: true });
			var a27_nodes = children(a27);
			t86 = claim_text(a27_nodes, "v1.16.0");
			a27_nodes.forEach(detach);
			t87 = claim_text(p9_nodes, " and use ");
			code9 = claim_element(p9_nodes, "CODE", {});
			var code9_nodes = children(code9);
			t88 = claim_text(code9_nodes, "babel-flow");
			code9_nodes.forEach(detach);
			t89 = claim_text(p9_nodes, " parser for ");
			code10 = claim_element(p9_nodes, "CODE", {});
			var code10_nodes = children(code10);
			t90 = claim_text(code10_nodes, "prettier");
			code10_nodes.forEach(detach);
			t91 = claim_text(p9_nodes, " to resolve the ambiguity in syntax arise in parsing the newer Flow syntax. In simpler terms, to tell Prettier that");
			p9_nodes.forEach(detach);
			t92 = claim_space(section4_nodes);
			pre0 = claim_element(section4_nodes, "PRE", { class: true });
			var pre0_nodes = children(pre0);
			pre0_nodes.forEach(detach);
			t93 = claim_space(section4_nodes);
			p10 = claim_element(section4_nodes, "P", {});
			var p10_nodes = children(p10);
			t94 = claim_text(p10_nodes, "is ");
			em0 = claim_element(p10_nodes, "EM", {});
			var em0_nodes = children(em0);
			t95 = claim_text(em0_nodes, "calling foobar with argument, 1 and type, \"Type\"");
			em0_nodes.forEach(detach);
			t96 = claim_text(p10_nodes, ", instead of:");
			p10_nodes.forEach(detach);
			t97 = claim_space(section4_nodes);
			pre1 = claim_element(section4_nodes, "PRE", { class: true });
			var pre1_nodes = children(pre1);
			pre1_nodes.forEach(detach);
			t98 = claim_space(section4_nodes);
			p11 = claim_element(section4_nodes, "P", {});
			var p11_nodes = children(p11);
			em1 = claim_element(p11_nodes, "EM", {});
			var em1_nodes = children(em1);
			t99 = claim_text(em1_nodes, "is the result of foobar ");
			t100 = claim_text(em1_nodes, " Type, greater than 1?");
			em1_nodes.forEach(detach);
			t101 = claim_text(p11_nodes, " 😂");
			p11_nodes.forEach(detach);
			t102 = claim_space(section4_nodes);
			p12 = claim_element(section4_nodes, "P", {});
			var p12_nodes = children(p12);
			t103 = claim_text(p12_nodes, "You can read more about it in ");
			a28 = claim_element(p12_nodes, "A", { href: true, rel: true });
			var a28_nodes = children(a28);
			t104 = claim_text(a28_nodes, "Prettier's blog post");
			a28_nodes.forEach(detach);
			t105 = claim_text(p12_nodes, ".");
			p12_nodes.forEach(detach);
			section4_nodes.forEach(detach);
			t106 = claim_space(nodes);
			section5 = claim_element(nodes, "SECTION", {});
			var section5_nodes = children(section5);
			h24 = claim_element(section5_nodes, "H2", {});
			var h24_nodes = children(h24);
			a29 = claim_element(h24_nodes, "A", { href: true, id: true });
			var a29_nodes = children(a29);
			t107 = claim_text(a29_nodes, "VSCode");
			a29_nodes.forEach(detach);
			h24_nodes.forEach(detach);
			t108 = claim_space(section5_nodes);
			p13 = claim_element(section5_nodes, "P", {});
			var p13_nodes = children(p13);
			t109 = claim_text(p13_nodes, "Flow ");
			a30 = claim_element(p13_nodes, "A", { href: true, rel: true });
			var a30_nodes = children(a30);
			t110 = claim_text(a30_nodes, "Lazy Mode");
			a30_nodes.forEach(detach);
			t111 = claim_text(p13_nodes, " has been around since v0.68, but we hadn't enjoy the benefit of lazy mode through VSCode ");
			a31 = claim_element(p13_nodes, "A", { href: true, rel: true });
			var a31_nodes = children(a31);
			t112 = claim_text(a31_nodes, "until recently");
			a31_nodes.forEach(detach);
			t113 = claim_text(p13_nodes, ".");
			p13_nodes.forEach(detach);
			t114 = claim_space(section5_nodes);
			p14 = claim_element(section5_nodes, "P", {});
			var p14_nodes = children(p14);
			t115 = claim_text(p14_nodes, "Now we can specify ");
			code11 = claim_element(p14_nodes, "CODE", {});
			var code11_nodes = children(code11);
			t116 = claim_text(code11_nodes, "lazyMode");
			code11_nodes.forEach(detach);
			t117 = claim_text(p14_nodes, " in our ");
			code12 = claim_element(p14_nodes, "CODE", {});
			var code12_nodes = children(code12);
			t118 = claim_text(code12_nodes, ".vscode/settings.json");
			code12_nodes.forEach(detach);
			t119 = claim_text(p14_nodes, ":");
			p14_nodes.forEach(detach);
			t120 = claim_space(section5_nodes);
			pre2 = claim_element(section5_nodes, "PRE", { class: true });
			var pre2_nodes = children(pre2);
			pre2_nodes.forEach(detach);
			t121 = claim_space(section5_nodes);
			p15 = claim_element(section5_nodes, "P", {});
			var p15_nodes = children(p15);
			t122 = claim_text(p15_nodes, "Although ");
			a32 = claim_element(p15_nodes, "A", { href: true, rel: true });
			var a32_nodes = children(a32);
			t123 = claim_text(a32_nodes, "lazy mode");
			a32_nodes.forEach(detach);
			t124 = claim_text(p15_nodes, " reduces the scope where Flow does type checking, one of the pain point we had with Flow was to wait for Flow to do recheck, before returning a meaningful Flow status again. Flow team did some optimisation in ");
			a33 = claim_element(p15_nodes, "A", { href: true, rel: true });
			var a33_nodes = children(a33);
			t125 = claim_text(a33_nodes, "v92.0");
			a33_nodes.forEach(detach);
			t126 = claim_text(p15_nodes, ", where it says:");
			p15_nodes.forEach(detach);
			t127 = claim_space(section5_nodes);
			blockquote = claim_element(section5_nodes, "BLOCKQUOTE", {});
			var blockquote_nodes = children(blockquote);
			p16 = claim_element(blockquote_nodes, "P", {});
			var p16_nodes = children(p16);
			t128 = claim_text(p16_nodes, "This release culminates months of hard work on quality of life improvements for IDE support.\nExpect your requests to be faster, and your requests to take a bit less time.");
			p16_nodes.forEach(detach);
			blockquote_nodes.forEach(detach);
			t129 = claim_space(section5_nodes);
			p17 = claim_element(section5_nodes, "P", {});
			var p17_nodes = children(p17);
			t130 = claim_text(p17_nodes, "According to the release note, Flow is now able to ");
			strong = claim_element(p17_nodes, "STRONG", {});
			var strong_nodes = children(strong);
			t131 = claim_text(strong_nodes, "provide type definitions while rechecking");
			strong_nodes.forEach(detach);
			t132 = claim_text(p17_nodes, ", for further details on how they achieve this, you can read the ");
			a34 = claim_element(p17_nodes, "A", { href: true, rel: true });
			var a34_nodes = children(a34);
			t133 = claim_text(a34_nodes, "Flow blog");
			a34_nodes.forEach(detach);
			p17_nodes.forEach(detach);
			section5_nodes.forEach(detach);
			t134 = claim_space(nodes);
			section6 = claim_element(nodes, "SECTION", {});
			var section6_nodes = children(section6);
			h25 = claim_element(section6_nodes, "H2", {});
			var h25_nodes = children(h25);
			a35 = claim_element(h25_nodes, "A", { href: true, id: true });
			var a35_nodes = children(a35);
			t135 = claim_text(a35_nodes, "Closing remarks");
			a35_nodes.forEach(detach);
			h25_nodes.forEach(detach);
			t136 = claim_space(section6_nodes);
			p18 = claim_element(section6_nodes, "P", {});
			var p18_nodes = children(p18);
			t137 = claim_text(p18_nodes, "Finally we managed to get Flow running in v0.97 🎉. We've been struggling with bad developer experience with v0.83 for the longest time, hopefully v0.97 do not let us down.");
			p18_nodes.forEach(detach);
			t138 = claim_space(section6_nodes);
			p19 = claim_element(section6_nodes, "P", {});
			var p19_nodes = children(p19);
			t139 = claim_text(p19_nodes, "Lastly, be sure to check out all the links sprinkled throughout this blog, they link to Github issues, commits, release notes, and who knows it might lead you to some unexpected adventures? 🤷‍");
			p19_nodes.forEach(detach);
			t140 = claim_space(section6_nodes);
			p20 = claim_element(section6_nodes, "P", {});
			var p20_nodes = children(p20);
			t141 = claim_text(p20_nodes, "But if you are lazy like me, here are the links, they served as my references when writing this blog post:");
			p20_nodes.forEach(detach);
			t142 = claim_space(section6_nodes);
			ul1 = claim_element(section6_nodes, "UL", {});
			var ul1_nodes = children(ul1);
			li6 = claim_element(ul1_nodes, "LI", {});
			var li6_nodes = children(li6);
			a36 = claim_element(li6_nodes, "A", { href: true, rel: true });
			var a36_nodes = children(a36);
			t143 = claim_text(a36_nodes, "Blog: Incremental Migration to TypeScript on a Flowtype codebase");
			a36_nodes.forEach(detach);
			li6_nodes.forEach(detach);
			t144 = claim_space(ul1_nodes);
			li7 = claim_element(ul1_nodes, "LI", {});
			var li7_nodes = children(li7);
			a37 = claim_element(li7_nodes, "A", { href: true, rel: true });
			var a37_nodes = children(a37);
			t145 = claim_text(a37_nodes, "Blog: Porting 30k lines of code from Flow to TypeScript");
			a37_nodes.forEach(detach);
			li7_nodes.forEach(detach);
			t146 = claim_space(ul1_nodes);
			li8 = claim_element(ul1_nodes, "LI", {});
			var li8_nodes = children(li8);
			a38 = claim_element(li8_nodes, "A", { href: true, rel: true });
			var a38_nodes = children(a38);
			t147 = claim_text(a38_nodes, "Issue: What is the official way to type connect ( from flow-typed/react-redux) after 0.85?");
			a38_nodes.forEach(detach);
			li8_nodes.forEach(detach);
			t148 = claim_space(ul1_nodes);
			li9 = claim_element(ul1_nodes, "LI", {});
			var li9_nodes = children(li9);
			a39 = claim_element(li9_nodes, "A", { href: true, rel: true });
			var a39_nodes = children(a39);
			t149 = claim_text(a39_nodes, "Issue: [react-redux] libdef incompatible with flow v0.85 #2946");
			a39_nodes.forEach(detach);
			li9_nodes.forEach(detach);
			t150 = claim_space(ul1_nodes);
			li10 = claim_element(ul1_nodes, "LI", {});
			var li10_nodes = children(li10);
			a40 = claim_element(li10_nodes, "A", { href: true, rel: true });
			var a40_nodes = children(a40);
			t151 = claim_text(a40_nodes, "Tweet: It's so hard to make flow happily get past 0.85 with our codebase...");
			a40_nodes.forEach(detach);
			li10_nodes.forEach(detach);
			t152 = claim_space(ul1_nodes);
			li11 = claim_element(ul1_nodes, "LI", {});
			var li11_nodes = children(li11);
			a41 = claim_element(li11_nodes, "A", { href: true, rel: true });
			var a41_nodes = children(a41);
			t153 = claim_text(a41_nodes, "Blog: Making Flow Happy after 0.85");
			a41_nodes.forEach(detach);
			li11_nodes.forEach(detach);
			t154 = claim_space(ul1_nodes);
			li12 = claim_element(ul1_nodes, "LI", {});
			var li12_nodes = children(li12);
			a42 = claim_element(li12_nodes, "A", { href: true, rel: true });
			var a42_nodes = children(a42);
			t155 = claim_text(a42_nodes, "Blog: Asking for Required Annotations");
			a42_nodes.forEach(detach);
			li12_nodes.forEach(detach);
			t156 = claim_space(ul1_nodes);
			li13 = claim_element(ul1_nodes, "LI", {});
			var li13_nodes = children(li13);
			a43 = claim_element(li13_nodes, "A", { href: true, rel: true });
			var a43_nodes = children(a43);
			t157 = claim_text(a43_nodes, "Docs: Babel 7 Migration");
			a43_nodes.forEach(detach);
			li13_nodes.forEach(detach);
			t158 = claim_space(ul1_nodes);
			li14 = claim_element(ul1_nodes, "LI", {});
			var li14_nodes = children(li14);
			a44 = claim_element(li14_nodes, "A", { href: true, rel: true });
			var a44_nodes = children(a44);
			t159 = claim_text(a44_nodes, "Release Note: babel-eslint v9.0.0");
			a44_nodes.forEach(detach);
			li14_nodes.forEach(detach);
			t160 = claim_space(ul1_nodes);
			li15 = claim_element(ul1_nodes, "LI", {});
			var li15_nodes = children(li15);
			a45 = claim_element(li15_nodes, "A", { href: true, rel: true });
			var a45_nodes = children(a45);
			t161 = claim_text(a45_nodes, "Docs: @babel/plugin-transform-flow-strip-types");
			a45_nodes.forEach(detach);
			li15_nodes.forEach(detach);
			t162 = claim_space(ul1_nodes);
			li16 = claim_element(ul1_nodes, "LI", {});
			var li16_nodes = children(li16);
			a46 = claim_element(li16_nodes, "A", { href: true, rel: true });
			var a46_nodes = children(a46);
			t163 = claim_text(a46_nodes, "Release Note: Prettier v1.16.0");
			a46_nodes.forEach(detach);
			li16_nodes.forEach(detach);
			t164 = claim_space(ul1_nodes);
			li17 = claim_element(ul1_nodes, "LI", {});
			var li17_nodes = children(li17);
			a47 = claim_element(li17_nodes, "A", { href: true, rel: true });
			var a47_nodes = children(a47);
			t165 = claim_text(a47_nodes, "Commit: Lazy mode message for flow status");
			a47_nodes.forEach(detach);
			li17_nodes.forEach(detach);
			t166 = claim_space(ul1_nodes);
			li18 = claim_element(ul1_nodes, "LI", {});
			var li18_nodes = children(li18);
			a48 = claim_element(li18_nodes, "A", { href: true, rel: true });
			var a48_nodes = children(a48);
			t167 = claim_text(a48_nodes, "Commit: feat(lsp): add setting to support flow lazyMode.");
			a48_nodes.forEach(detach);
			li18_nodes.forEach(detach);
			t168 = claim_space(ul1_nodes);
			li19 = claim_element(ul1_nodes, "LI", {});
			var li19_nodes = children(li19);
			a49 = claim_element(li19_nodes, "A", { href: true, rel: true });
			var a49_nodes = children(a49);
			t169 = claim_text(a49_nodes, "Docs: Flow Lazy Mode");
			a49_nodes.forEach(detach);
			li19_nodes.forEach(detach);
			t170 = claim_space(ul1_nodes);
			li20 = claim_element(ul1_nodes, "LI", {});
			var li20_nodes = children(li20);
			a50 = claim_element(li20_nodes, "A", { href: true, rel: true });
			var a50_nodes = children(a50);
			t171 = claim_text(a50_nodes, "Release Note: Flow v0.92.0");
			a50_nodes.forEach(detach);
			li20_nodes.forEach(detach);
			t172 = claim_space(ul1_nodes);
			li21 = claim_element(ul1_nodes, "LI", {});
			var li21_nodes = children(li21);
			a51 = claim_element(li21_nodes, "A", { href: true, rel: true });
			var a51_nodes = children(a51);
			t173 = claim_text(a51_nodes, "Blog: A more responsive Flow");
			a51_nodes.forEach(detach);
			li21_nodes.forEach(detach);
			ul1_nodes.forEach(detach);
			section6_nodes.forEach(detach);
			this.h();
		},
		h() {
			attr(a0, "href", "#background");
			attr(a1, "href", "#the-tooling");
			attr(a2, "href", "#babel-eslint");
			attr(a3, "href", "#prettier");
			attr(a4, "href", "#vscode");
			attr(a5, "href", "#closing-remarks");
			attr(ul0, "class", "sitemap");
			attr(ul0, "id", "sitemap");
			attr(ul0, "role", "navigation");
			attr(ul0, "aria-label", "Table of Contents");
			attr(a6, "href", "#background");
			attr(a6, "id", "background");
			attr(a7, "href", "https://medium.com/entria/incremental-migration-to-typescript-on-a-flowtype-codebase-515f6490d92d");
			attr(a7, "rel", "nofollow");
			attr(a8, "href", "https://davidgomes.com/porting-30k-lines-of-code-from-flow-to-typescript/");
			attr(a8, "rel", "nofollow");
			attr(a9, "href", "https://careers.shopee.sg/jobs/?region_id=1&dept_id=109&name=web%20frontend&limit=20&offset=0");
			attr(a9, "rel", "nofollow");
			attr(a10, "href", "https://flow.org/");
			attr(a10, "rel", "nofollow");
			attr(a11, "href", "https://medium.com/flow-type/what-the-flow-team-has-been-up-to-54239c62004f");
			attr(a11, "rel", "nofollow");
			attr(a12, "href", "https://github.com/facebook/flow/issues/7493");
			attr(a12, "rel", "nofollow");
			attr(a13, "href", "https://github.com/flow-typed/flow-typed/issues/2946");
			attr(a13, "rel", "nofollow");
			attr(a14, "href", "https://wgao19.cc/");
			attr(a14, "rel", "nofollow");
			attr(a15, "href", "https://twitter.com/wgao19/status/1115969686758248448");
			attr(a15, "rel", "nofollow");
			attr(a16, "href", "https://dev.wgao19.cc/2019-04-17__making-flow-happy-after-0.85/");
			attr(a16, "rel", "nofollow");
			attr(a17, "href", "https://medium.com/flow-type/asking-for-required-annotations-64d4f9c1edf8");
			attr(a17, "rel", "nofollow");
			attr(a18, "href", "https://dev.wgao19.cc/2019-04-17__making-flow-happy-after-0.85/");
			attr(a18, "rel", "nofollow");
			attr(a19, "href", "#the-tooling");
			attr(a19, "id", "the-tooling");
			attr(a20, "href", "#babel-eslint");
			attr(a20, "id", "babel-eslint");
			attr(a21, "href", "https://babeljs.io/docs/en/v7-migration");
			attr(a21, "rel", "nofollow");
			attr(a22, "href", "https://github.com/babel/babel-eslint/releases/tag/v9.0.0");
			attr(a22, "rel", "nofollow");
			attr(a23, "href", "https://lihautan.com/eslint-for-flow-explicit-type-argument-syntax/");
			attr(a23, "rel", "nofollow");
			attr(a24, "href", "https://babeljs.io/docs/en/babel-plugin-transform-flow-strip-types");
			attr(a24, "rel", "nofollow");
			attr(a25, "href", "/parsing-error-flow-type-parameter-instantiation/");
			attr(a26, "href", "#prettier");
			attr(a26, "id", "prettier");
			attr(a27, "href", "https://prettier.io/blog/2019/01/20/1.16.0.html");
			attr(a27, "rel", "nofollow");
			attr(pre0, "class", "language-js");
			attr(pre1, "class", "language-js");
			html_tag = new HtmlTag(t100);
			attr(a28, "href", "https://prettier.io/blog/2019/01/20/1.16.0.html#add-babel-flow-parser-5685-by-ikatyang");
			attr(a28, "rel", "nofollow");
			attr(a29, "href", "#vscode");
			attr(a29, "id", "vscode");
			attr(a30, "href", "https://github.com/facebook/flow/commit/3c0a2bbd118206a0a73a1a4d18375122c4ae1955");
			attr(a30, "rel", "nofollow");
			attr(a31, "href", "https://github.com/flowtype/flow-for-vscode/commit/9c1440068f8faee95e487fc9f69b5f5ffed64bf1");
			attr(a31, "rel", "nofollow");
			attr(pre2, "class", "language-json");
			attr(a32, "href", "https://flow.org/en/docs/lang/lazy-modes/");
			attr(a32, "rel", "nofollow");
			attr(a33, "href", "https://github.com/facebook/flow/releases/tag/v0.92.0");
			attr(a33, "rel", "nofollow");
			attr(a34, "href", "https://medium.com/flow-type/a-more-responsive-flow-1a8cb01aec11");
			attr(a34, "rel", "nofollow");
			attr(a35, "href", "#closing-remarks");
			attr(a35, "id", "closing-remarks");
			attr(a36, "href", "https://medium.com/entria/incremental-migration-to-typescript-on-a-flowtype-codebase-515f6490d92d");
			attr(a36, "rel", "nofollow");
			attr(a37, "href", "https://davidgomes.com/porting-30k-lines-of-code-from-flow-to-typescript");
			attr(a37, "rel", "nofollow");
			attr(a38, "href", "https://github.com/facebook/flow/issues/7493");
			attr(a38, "rel", "nofollow");
			attr(a39, "href", "https://github.com/flow-typed/flow-typed/issues/2946");
			attr(a39, "rel", "nofollow");
			attr(a40, "href", "https://twitter.com/wgao19/status/1115969686758248448");
			attr(a40, "rel", "nofollow");
			attr(a41, "href", "https://dev.wgao19.cc/2019-04-17__making-flow-happy-after-0.85/");
			attr(a41, "rel", "nofollow");
			attr(a42, "href", "https://medium.com/flow-type/asking-for-required-annotations-64d4f9c1edf8");
			attr(a42, "rel", "nofollow");
			attr(a43, "href", "https://babeljs.io/docs/en/v7-migration");
			attr(a43, "rel", "nofollow");
			attr(a44, "href", "https://github.com/babel/babel-eslint/releases/tag/v9.0.0");
			attr(a44, "rel", "nofollow");
			attr(a45, "href", "https://babeljs.io/docs/en/babel-plugin-transform-flow-strip-types");
			attr(a45, "rel", "nofollow");
			attr(a46, "href", "https://prettier.io/blog/2019/01/20/1.16.0.html");
			attr(a46, "rel", "nofollow");
			attr(a47, "href", "https://github.com/facebook/flow/commit/3c0a2bbd118206a0a73a1a4d18375122c4ae1955");
			attr(a47, "rel", "nofollow");
			attr(a48, "href", "https://github.com/flowtype/flow-for-vscode/commit/9c1440068f8faee95e487fc9f69b5f5ffed64bf1");
			attr(a48, "rel", "nofollow");
			attr(a49, "href", "https://flow.org/en/docs/lang/lazy-modes/");
			attr(a49, "rel", "nofollow");
			attr(a50, "href", "https://github.com/facebook/flow/releases/tag/v0.92.0");
			attr(a50, "rel", "nofollow");
			attr(a51, "href", "https://medium.com/flow-type/a-more-responsive-flow-1a8cb01aec11");
			attr(a51, "rel", "nofollow");
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
			insert(target, t6, anchor);
			insert(target, section1, anchor);
			append(section1, h20);
			append(h20, a6);
			append(a6, t7);
			append(section1, t8);
			append(section1, p0);
			append(p0, t9);
			append(p0, a7);
			append(a7, t10);
			append(p0, t11);
			append(p0, a8);
			append(a8, t12);
			append(p0, t13);
			append(p0, a9);
			append(a9, t14);
			append(p0, t15);
			append(p0, a10);
			append(a10, t16);
			append(p0, t17);
			append(section1, t18);
			append(section1, p1);
			append(p1, t19);
			append(p1, a11);
			append(a11, t20);
			append(p1, t21);
			append(p1, a12);
			append(a12, t22);
			append(p1, t23);
			append(p1, a13);
			append(a13, t24);
			append(p1, t25);
			append(section1, t26);
			append(section1, p2);
			append(p2, t27);
			append(p2, a14);
			append(a14, t28);
			append(p2, t29);
			append(p2, a15);
			append(a15, t30);
			append(p2, t31);
			append(p2, a16);
			append(a16, t32);
			append(p2, t33);
			append(section1, t34);
			append(section1, p3);
			append(p3, t35);
			append(p3, a17);
			append(a17, t36);
			append(p3, t37);
			append(p3, code0);
			append(code0, t38);
			append(p3, t39);
			append(p3, code1);
			append(code1, t40);
			append(p3, t41);
			append(p3, code2);
			append(code2, t42);
			append(p3, t43);
			append(p3, code3);
			append(code3, t44);
			append(p3, t45);
			append(p3, code4);
			append(code4, t46);
			append(p3, t47);
			append(section1, t48);
			append(section1, p4);
			append(p4, t49);
			append(p4, code5);
			append(code5, t50);
			append(p4, t51);
			append(p4, a18);
			append(a18, t52);
			append(p4, t53);
			insert(target, t54, anchor);
			insert(target, section2, anchor);
			append(section2, h21);
			append(h21, a19);
			append(a19, t55);
			append(section2, t56);
			append(section2, p5);
			append(p5, t57);
			append(p5, code6);
			append(code6, t58);
			append(p5, t59);
			append(p5, code7);
			append(code7, t60);
			append(p5, t61);
			append(p5, code8);
			append(code8, t62);
			append(p5, t63);
			insert(target, t64, anchor);
			insert(target, section3, anchor);
			append(section3, h22);
			append(h22, a20);
			append(a20, t65);
			append(section3, t66);
			append(section3, p6);
			append(p6, t67);
			append(p6, a21);
			append(a21, t68);
			append(p6, t69);
			append(p6, a22);
			append(a22, t70);
			append(p6, t71);
			append(section3, t72);
			append(section3, p7);
			append(p7, t73);
			append(p7, a23);
			append(a23, t74);
			append(p7, t75);
			append(section3, t76);
			append(section3, p8);
			append(p8, t77);
			append(p8, a24);
			append(a24, t78);
			append(p8, t79);
			append(p8, a25);
			append(a25, t80);
			append(p8, t81);
			insert(target, t82, anchor);
			insert(target, section4, anchor);
			append(section4, h23);
			append(h23, a26);
			append(a26, t83);
			append(section4, t84);
			append(section4, p9);
			append(p9, t85);
			append(p9, a27);
			append(a27, t86);
			append(p9, t87);
			append(p9, code9);
			append(code9, t88);
			append(p9, t89);
			append(p9, code10);
			append(code10, t90);
			append(p9, t91);
			append(section4, t92);
			append(section4, pre0);
			pre0.innerHTML = raw0_value;
			append(section4, t93);
			append(section4, p10);
			append(p10, t94);
			append(p10, em0);
			append(em0, t95);
			append(p10, t96);
			append(section4, t97);
			append(section4, pre1);
			pre1.innerHTML = raw1_value;
			append(section4, t98);
			append(section4, p11);
			append(p11, em1);
			append(em1, t99);
			html_tag.m(raw2_value, em1);
			append(em1, t100);
			append(p11, t101);
			append(section4, t102);
			append(section4, p12);
			append(p12, t103);
			append(p12, a28);
			append(a28, t104);
			append(p12, t105);
			insert(target, t106, anchor);
			insert(target, section5, anchor);
			append(section5, h24);
			append(h24, a29);
			append(a29, t107);
			append(section5, t108);
			append(section5, p13);
			append(p13, t109);
			append(p13, a30);
			append(a30, t110);
			append(p13, t111);
			append(p13, a31);
			append(a31, t112);
			append(p13, t113);
			append(section5, t114);
			append(section5, p14);
			append(p14, t115);
			append(p14, code11);
			append(code11, t116);
			append(p14, t117);
			append(p14, code12);
			append(code12, t118);
			append(p14, t119);
			append(section5, t120);
			append(section5, pre2);
			pre2.innerHTML = raw3_value;
			append(section5, t121);
			append(section5, p15);
			append(p15, t122);
			append(p15, a32);
			append(a32, t123);
			append(p15, t124);
			append(p15, a33);
			append(a33, t125);
			append(p15, t126);
			append(section5, t127);
			append(section5, blockquote);
			append(blockquote, p16);
			append(p16, t128);
			append(section5, t129);
			append(section5, p17);
			append(p17, t130);
			append(p17, strong);
			append(strong, t131);
			append(p17, t132);
			append(p17, a34);
			append(a34, t133);
			insert(target, t134, anchor);
			insert(target, section6, anchor);
			append(section6, h25);
			append(h25, a35);
			append(a35, t135);
			append(section6, t136);
			append(section6, p18);
			append(p18, t137);
			append(section6, t138);
			append(section6, p19);
			append(p19, t139);
			append(section6, t140);
			append(section6, p20);
			append(p20, t141);
			append(section6, t142);
			append(section6, ul1);
			append(ul1, li6);
			append(li6, a36);
			append(a36, t143);
			append(ul1, t144);
			append(ul1, li7);
			append(li7, a37);
			append(a37, t145);
			append(ul1, t146);
			append(ul1, li8);
			append(li8, a38);
			append(a38, t147);
			append(ul1, t148);
			append(ul1, li9);
			append(li9, a39);
			append(a39, t149);
			append(ul1, t150);
			append(ul1, li10);
			append(li10, a40);
			append(a40, t151);
			append(ul1, t152);
			append(ul1, li11);
			append(li11, a41);
			append(a41, t153);
			append(ul1, t154);
			append(ul1, li12);
			append(li12, a42);
			append(a42, t155);
			append(ul1, t156);
			append(ul1, li13);
			append(li13, a43);
			append(a43, t157);
			append(ul1, t158);
			append(ul1, li14);
			append(li14, a44);
			append(a44, t159);
			append(ul1, t160);
			append(ul1, li15);
			append(li15, a45);
			append(a45, t161);
			append(ul1, t162);
			append(ul1, li16);
			append(li16, a46);
			append(a46, t163);
			append(ul1, t164);
			append(ul1, li17);
			append(li17, a47);
			append(a47, t165);
			append(ul1, t166);
			append(ul1, li18);
			append(li18, a48);
			append(a48, t167);
			append(ul1, t168);
			append(ul1, li19);
			append(li19, a49);
			append(a49, t169);
			append(ul1, t170);
			append(ul1, li20);
			append(li20, a50);
			append(a50, t171);
			append(ul1, t172);
			append(ul1, li21);
			append(li21, a51);
			append(a51, t173);
		},
		p: noop,
		d(detaching) {
			if (detaching) detach(section0);
			if (detaching) detach(t6);
			if (detaching) detach(section1);
			if (detaching) detach(t54);
			if (detaching) detach(section2);
			if (detaching) detach(t64);
			if (detaching) detach(section3);
			if (detaching) detach(t82);
			if (detaching) detach(section4);
			if (detaching) detach(t106);
			if (detaching) detach(section5);
			if (detaching) detach(t134);
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
	"title": "Errors encountered upgrading Flow v0.85",
	"date": "2019-04-22T08:00:00Z",
	"description": "and how we solved them",
	"slug": "errors-encountered-upgrading-flow-0.85",
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
