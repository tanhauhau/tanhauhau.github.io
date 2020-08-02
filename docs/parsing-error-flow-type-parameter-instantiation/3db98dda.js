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
					"@id": "https%3A%2F%2Flihautan.com%2Fparsing-error-flow-type-parameter-instantiation",
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
			attr(meta11, "content", "https%3A%2F%2Flihautan.com%2Fparsing-error-flow-type-parameter-instantiation");
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

/* content/blog/parsing-error-flow-type-parameter-instantiation/@@page-markup.svelte generated by Svelte v3.24.0 */

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
	let a9;
	let t13;
	let t14;
	let t15;
	let p1;
	let code0;
	let t16;
	let t17;
	let em0;
	let t18;
	let code1;
	let t19;
	let t20;
	let code2;
	let t21;
	let t22;
	let em1;
	let t23;
	let t24;
	let t25;
	let blockquote0;
	let p2;
	let t26;
	let t27;
	let section2;
	let h21;
	let a10;
	let t28;
	let t29;
	let pre0;

	let raw0_value = `<code class="language-js"><span class="token keyword">export</span> <span class="token keyword">function</span> foobar<span class="token operator">&lt;</span>XType<span class="token operator">></span><span class="token punctuation">(</span>baz<span class="token punctuation">)</span><span class="token punctuation">;</span>
                       <span class="token operator">^</span> ReferenceError<span class="token punctuation">:</span> XType is not defined</code>` + "";

	let t30;
	let p3;
	let t31;
	let code3;
	let t32;
	let t33;
	let strong0;
	let t34;
	let t35;
	let code4;
	let t36;
	let t37;
	let t38;
	let p4;
	let t39;
	let t40;
	let p5;
	let t41;
	let t42;
	let pre1;
	let raw1_value = `<code class="language-js"><span class="token keyword">export</span> <span class="token keyword">function</span> foobar <span class="token operator">&lt;</span> XType <span class="token operator">></span> baz<span class="token punctuation">;</span></code>` + "";
	let t43;
	let p6;
	let t44;
	let code5;
	let t45;
	let t46;
	let t47;
	let p7;
	let t48;
	let a11;
	let t49;
	let t50;
	let t51;
	let p8;
	let t52;
	let a12;
	let t53;
	let t54;
	let code6;
	let t55;
	let t56;
	let t57;
	let blockquote1;
	let p9;
	let strong1;
	let t58;
	let t59;
	let code7;
	let t60;
	let t61;
	let strong2;
	let t62;
	let t63;
	let t64;
	let p10;
	let t65;
	let t66;
	let pre2;

	let raw2_value = `<code class="language-js"><span class="token comment">/** @module foobar */</span>
<span class="token comment">// @flow</span>
<span class="token comment">// ...</span>
<span class="token keyword">export</span> <span class="token keyword">function</span> foobar<span class="token operator">&lt;</span>XType<span class="token operator">></span><span class="token punctuation">(</span>baz<span class="token punctuation">)</span><span class="token punctuation">;</span></code>` + "";

	let t67;
	let p11;
	let t68;
	let code8;
	let t69;
	let t70;
	let code9;
	let t71;
	let t72;
	let t73;
	let p12;
	let t74;
	let t75;
	let ul1;
	let li7;
	let t76;
	let code10;
	let t77;
	let t78;
	let code11;
	let t79;
	let t80;
	let t81;
	let li8;
	let t82;
	let code12;
	let t83;
	let t84;
	let code13;
	let t85;
	let t86;
	let t87;
	let p13;
	let t88;
	let t89;
	let p14;
	let t90;
	let t91;
	let blockquote2;
	let p15;
	let t92;
	let code14;
	let t93;
	let t94;
	let t95;
	let p16;
	let t96;
	let code15;
	let t97;
	let t98;
	let strong3;
	let t99;
	let t100;
	let t101;
	let p17;
	let t102;
	let del0;
	let t103;
	let t104;
	let t105;
	let blockquote3;
	let p18;
	let t106;
	let t107;
	let section3;
	let h22;
	let a13;
	let t108;
	let t109;
	let p19;
	let t110;
	let t111;
	let ul2;
	let li9;
	let t112;
	let t113;
	let li10;
	let t114;
	let t115;
	let li11;
	let t116;
	let t117;
	let li12;
	let t118;
	let t119;
	let p20;
	let t120;
	let strong4;
	let t121;
	let t122;
	let t123;
	let section4;
	let h23;
	let a14;
	let t124;
	let t125;
	let p21;
	let t126;
	let a15;
	let t127;
	let t128;
	let a16;
	let t129;
	let t130;
	let a17;
	let t131;
	let t132;
	let t133;
	let p22;
	let t134;
	let t135;
	let p23;
	let t136;
	let code16;
	let t137;
	let t138;
	let a18;
	let t139;
	let t140;
	let code17;
	let t141;
	let t142;
	let code18;
	let t143;
	let t144;
	let a19;
	let t145;
	let code19;
	let t146;
	let t147;
	let t148;
	let t149;
	let p24;
	let t150;
	let t151;
	let pre3;

	let raw3_value = `<code class="language-js"><span class="token keyword">const</span> <span class="token function-variable function">extract_docblock</span> <span class="token operator">=</span> <span class="token punctuation">(</span><span class="token parameter"><span class="token punctuation">&#123;</span> maxTokens<span class="token punctuation">,</span> filename<span class="token punctuation">,</span> content <span class="token punctuation">&#125;</span></span><span class="token punctuation">)</span> <span class="token operator">=></span> <span class="token punctuation">&#123;</span>
  <span class="token keyword">const</span> file <span class="token operator">=</span> <span class="token function">read</span><span class="token punctuation">(</span>filename<span class="token punctuation">)</span><span class="token punctuation">;</span>
  <span class="token keyword">for</span> <span class="token punctuation">(</span><span class="token keyword">let</span> i <span class="token operator">=</span> maxTokens<span class="token punctuation">;</span> i <span class="token operator">></span> <span class="token number">0</span><span class="token punctuation">;</span> i<span class="token operator">--</span><span class="token punctuation">)</span> <span class="token punctuation">&#123;</span>
    <span class="token keyword">const</span> token <span class="token operator">=</span> file<span class="token punctuation">.</span><span class="token function">nextToken</span><span class="token punctuation">(</span><span class="token punctuation">)</span><span class="token punctuation">;</span>
    <span class="token keyword">switch</span> <span class="token punctuation">(</span>token<span class="token punctuation">.</span>type<span class="token punctuation">)</span> <span class="token punctuation">&#123;</span>
      <span class="token keyword">case</span> <span class="token string">'string'</span><span class="token punctuation">:</span>
      <span class="token keyword">case</span> <span class="token string">'semicolon'</span><span class="token punctuation">:</span>
        <span class="token keyword">continue</span><span class="token punctuation">;</span>
      <span class="token keyword">case</span> <span class="token string">'comment'</span><span class="token punctuation">:</span>
        <span class="token keyword">if</span> <span class="token punctuation">(</span><span class="token function">isFlowComment</span><span class="token punctuation">(</span>token<span class="token punctuation">)</span><span class="token punctuation">)</span> <span class="token punctuation">&#123;</span>
          <span class="token keyword">return</span> <span class="token function">flowPragmaType</span><span class="token punctuation">(</span>token<span class="token punctuation">)</span><span class="token punctuation">;</span>
        <span class="token punctuation">&#125;</span>
        <span class="token keyword">break</span><span class="token punctuation">;</span>
      <span class="token keyword">default</span><span class="token punctuation">:</span>
        <span class="token keyword">return</span> <span class="token keyword">null</span><span class="token punctuation">;</span>
    <span class="token punctuation">&#125;</span>
  <span class="token punctuation">&#125;</span>
<span class="token punctuation">&#125;</span><span class="token punctuation">;</span></code>` + "";

	let t152;
	let p25;
	let t153;
	let t154;
	let p26;
	let t155;
	let code20;
	let t156;
	let t157;
	let code21;
	let t158;
	let t159;
	let t160;
	let p27;
	let t161;
	let t162;
	let pre4;

	let raw4_value = `<code class="language-js"><span class="token string">'use strict'</span><span class="token punctuation">;</span>
<span class="token comment">// @flow</span>
<span class="token function">foobar</span><span class="token punctuation">(</span><span class="token punctuation">)</span><span class="token punctuation">;</span></code>` + "";

	let t163;
	let p28;
	let t164;
	let t165;
	let pre5;

	let raw5_value = `<code class="language-js"><span class="token comment">/** @module */</span>
<span class="token comment">// @flow</span>
<span class="token function">foobar</span><span class="token punctuation">(</span><span class="token punctuation">)</span><span class="token punctuation">;</span></code>` + "";

	let t166;
	let p29;
	let t167;
	let t168;
	let p30;
	let t169;
	let t170;
	let pre6;

	let raw6_value = `<code class="language-js"><span class="token function">foobar</span><span class="token punctuation">(</span><span class="token punctuation">)</span><span class="token punctuation">;</span>
<span class="token comment">// @flow</span></code>` + "";

	let t171;
	let p31;
	let t172;
	let t173;
	let pre7;
	let raw7_value = `<code class="language-js"><span class="token function">foobar</span><span class="token punctuation">(</span><span class="token punctuation">)</span><span class="token punctuation">;</span></code>` + "";
	let t174;
	let p32;
	let t175;
	let t176;
	let section5;
	let h24;
	let a20;
	let t177;
	let t178;
	let p33;
	let t179;
	let code22;
	let t180;
	let t181;
	let t182;
	let p34;
	let t183;
	let a21;
	let t184;
	let t185;
	let code23;
	let t186;
	let t187;
	let a22;
	let t188;
	let t189;
	let code24;
	let t190;
	let t191;
	let a23;
	let code25;
	let t192;
	let t193;
	let t194;
	let t195;
	let p35;
	let t196;
	let a24;
	let t197;
	let code26;
	let t198;
	let t199;
	let t200;
	let t201;
	let p36;
	let t202;
	let a25;
	let t203;
	let t204;
	let t205;
	let pre8;

	let raw8_value = `<code class="language-js"><span class="token function">addComment</span><span class="token punctuation">(</span>comment<span class="token punctuation">:</span> <span class="token constant">N</span><span class="token punctuation">.</span>Comment<span class="token punctuation">)</span><span class="token punctuation">:</span> <span class="token keyword">void</span> <span class="token punctuation">&#123;</span>
  <span class="token keyword">if</span> <span class="token punctuation">(</span><span class="token keyword">this</span><span class="token punctuation">.</span>flowPragma <span class="token operator">===</span> <span class="token keyword">undefined</span><span class="token punctuation">)</span> <span class="token punctuation">&#123;</span>
    <span class="token comment">// Try to parse a flow pragma.</span>
    <span class="token keyword">const</span> matches <span class="token operator">=</span> <span class="token constant">FLOW_PRAGMA_REGEX</span><span class="token punctuation">.</span><span class="token function">exec</span><span class="token punctuation">(</span>comment<span class="token punctuation">.</span>value<span class="token punctuation">)</span><span class="token punctuation">;</span>
    <span class="token keyword">if</span> <span class="token punctuation">(</span><span class="token operator">!</span>matches<span class="token punctuation">)</span> <span class="token punctuation">&#123;</span>
      <span class="token keyword">this</span><span class="token punctuation">.</span>flowPragma <span class="token operator">=</span> <span class="token keyword">null</span><span class="token punctuation">;</span>
    <span class="token punctuation">&#125;</span> <span class="token keyword">else</span> <span class="token keyword">if</span> <span class="token punctuation">(</span>matches<span class="token punctuation">[</span><span class="token number">1</span><span class="token punctuation">]</span> <span class="token operator">===</span> <span class="token string">"flow"</span><span class="token punctuation">)</span> <span class="token punctuation">&#123;</span>
      <span class="token keyword">this</span><span class="token punctuation">.</span>flowPragma <span class="token operator">=</span> <span class="token string">"flow"</span><span class="token punctuation">;</span>
    <span class="token punctuation">&#125;</span> <span class="token keyword">else</span> <span class="token keyword">if</span> <span class="token punctuation">(</span>matches<span class="token punctuation">[</span><span class="token number">1</span><span class="token punctuation">]</span> <span class="token operator">===</span> <span class="token string">"noflow"</span><span class="token punctuation">)</span> <span class="token punctuation">&#123;</span>
      <span class="token keyword">this</span><span class="token punctuation">.</span>flowPragma <span class="token operator">=</span> <span class="token string">"noflow"</span><span class="token punctuation">;</span>
    <span class="token punctuation">&#125;</span> <span class="token keyword">else</span> <span class="token punctuation">&#123;</span>
      <span class="token keyword">throw</span> <span class="token keyword">new</span> <span class="token class-name">Error</span><span class="token punctuation">(</span><span class="token string">"Unexpected flow pragma"</span><span class="token punctuation">)</span><span class="token punctuation">;</span>
    <span class="token punctuation">&#125;</span>
  <span class="token punctuation">&#125;</span>
  <span class="token keyword">return</span> <span class="token keyword">super</span><span class="token punctuation">.</span><span class="token function">addComment</span><span class="token punctuation">(</span>comment<span class="token punctuation">)</span><span class="token punctuation">;</span>
<span class="token punctuation">&#125;</span></code>` + "";

	let t206;
	let p37;
	let t207;
	let t208;
	let p38;
	let t209;
	let code27;
	let t210;
	let t211;
	let t212;
	let p39;
	let t213;
	let t214;
	let pre9;

	let raw9_value = `<code class="language-js">foobar <span class="token operator">&lt;</span> XType <span class="token operator">></span> <span class="token number">1</span><span class="token punctuation">;</span>
<span class="token comment">// @flow</span>
foobar<span class="token operator">&lt;</span>XType<span class="token operator">></span><span class="token punctuation">(</span><span class="token number">1</span><span class="token punctuation">)</span><span class="token punctuation">;</span></code>` + "";

	let t215;
	let p40;
	let t216;
	let code28;
	let t217;
	let t218;
	let code29;
	let t219;
	let t220;
	let t221;
	let p41;
	let t222;
	let html_tag;
	let raw10_value = "<a href=\"https://lihautan.com/babel-ast-explorer/#?%7B%22babel%22%3A%7B%22jsx%22%3Afalse%2C%22flow%22%3Atrue%2C%22typescript%22%3Afalse%2C%22objectRestSpread%22%3Afalse%2C%22pipelineOperator%22%3Afalse%2C%22throwExpressions%22%3Afalse%2C%22optionalChaining%22%3Afalse%2C%22nullishCoalescingOperator%22%3Afalse%2C%22exportDefaultFrom%22%3Afalse%2C%22dynamicImport%22%3Afalse%7D%2C%22code%22%3A%22foobar%3CXType%3E(1)%3B%5Cn%2F%2F%20%40flow%5Cnfoobar%3CXType%3E(1)%3B%22%7D\">my recently build ASTExplorer clone for babel</a>" + "";
	let t223;
	let t224;
	let p42;
	let em2;
	let t225;
	let t226;
	let t227;
	let p43;
	let t228;
	let code30;
	let t229;
	let t230;
	let code31;
	let t231;
	let t232;
	let t233;
	let section6;
	let h25;
	let a26;
	let t234;
	let t235;
	let p44;
	let t236;
	let a27;
	let t237;
	let t238;
	let t239;
	let p45;
	let t240;
	let a28;
	let t241;
	let t242;
	let a29;
	let t243;
	let t244;
	let t245;
	let p46;
	let t246;
	let t247;
	let p47;
	let t248;
	let a30;
	let t249;
	let t250;
	let strong5;
	let t251;
	let t252;
	let code32;
	let t253;
	let t254;
	let code33;
	let t255;
	let t256;
	let code34;
	let t257;
	let t258;
	let code35;
	let t259;
	let t260;
	let t261;
	let p48;
	let t262;
	let a31;
	let t263;
	let t264;
	let em3;
	let t265;
	let t266;
	let t267;
	let p49;
	let t268;
	let a32;
	let t269;
	let t270;
	let t271;
	let p50;
	let t272;
	let t273;
	let ul3;
	let li13;
	let a33;
	let code36;
	let t274;
	let t275;
	let code37;
	let t276;
	let t277;
	let li14;
	let a34;
	let t278;
	let code38;
	let t279;
	let t280;
	let li15;
	let a35;
	let t281;
	let code39;
	let t282;
	let t283;
	let t284;
	let section7;
	let h26;
	let a36;
	let t285;
	let t286;
	let p51;
	let del1;
	let t287;
	let t288;
	let p52;
	let del2;
	let t289;
	let t290;
	let p53;
	let t291;
	let a37;
	let t292;
	let t293;
	let t294;
	let blockquote4;
	let p54;
	let t295;
	let t296;
	let p55;
	let t297;
	let t298;
	let ul4;
	let li16;
	let a38;
	let t299;
	let t300;
	let li17;
	let a39;
	let t301;
	let t302;
	let li18;
	let a40;
	let t303;
	let t304;
	let li19;
	let a41;
	let t305;
	let t306;
	let li20;
	let a42;
	let t307;
	let t308;
	let li21;
	let a43;
	let t309;
	let t310;
	let li22;
	let a44;
	let t311;

	return {
		c() {
			section0 = element("section");
			ul0 = element("ul");
			li0 = element("li");
			a0 = element("a");
			t0 = text("Background");
			li1 = element("li");
			a1 = element("a");
			t1 = text("ReferenceError: XType is not defined");
			li2 = element("li");
			a2 = element("a");
			t2 = text("Game Plan");
			li3 = element("li");
			a3 = element("a");
			t3 = text("Flow");
			li4 = element("li");
			a4 = element("a");
			t4 = text("Babel");
			li5 = element("li");
			a5 = element("a");
			t5 = text("Make changes to the babel code");
			li6 = element("li");
			a6 = element("a");
			t6 = text("Closing Remark");
			t7 = space();
			section1 = element("section");
			h20 = element("h2");
			a7 = element("a");
			t8 = text("Background");
			t9 = space();
			p0 = element("p");
			t10 = text("Mentioned in the ");
			a8 = element("a");
			t11 = text("previous post");
			t12 = text(", we have ");
			a9 = element("a");
			t13 = text("upgraded babel 7");
			t14 = text(" to support the new Flow syntax.");
			t15 = space();
			p1 = element("p");
			code0 = element("code");
			t16 = text("foobar<Type>(x)");
			t17 = text(" is now ");
			em0 = element("em");
			t18 = text("call foobar with x, and type parameter ");
			code1 = element("code");
			t19 = text("Type");
			t20 = text(" rather than ");
			code2 = element("code");
			t21 = text("(foobar < Type) > x)");
			t22 = space();
			em1 = element("em");
			t23 = text("is the result of foobar smaller than Type, greater than x?");
			t24 = text(".");
			t25 = space();
			blockquote0 = element("blockquote");
			p2 = element("p");
			t26 = text("Everything is great, until a weird runtime error caught us off guard.");
			t27 = space();
			section2 = element("section");
			h21 = element("h2");
			a10 = element("a");
			t28 = text("ReferenceError: XType is not defined");
			t29 = space();
			pre0 = element("pre");
			t30 = space();
			p3 = element("p");
			t31 = text("The first time I saw this error, my first impression was that I forgot to import ");
			code3 = element("code");
			t32 = text("XType");
			t33 = text(", so I scrolled to the top of the document. But, alas, I ");
			strong0 = element("strong");
			t34 = text("did import");
			t35 = space();
			code4 = element("code");
			t36 = text("XType");
			t37 = text(".");
			t38 = space();
			p4 = element("p");
			t39 = text("So what is going on? 🤷‍");
			t40 = space();
			p5 = element("p");
			t41 = text("I clicked into the error,");
			t42 = space();
			pre1 = element("pre");
			t43 = space();
			p6 = element("p");
			t44 = text("looked at me innocently. I knew something was wrong. ");
			code5 = element("code");
			t45 = text("XType");
			t46 = text(" wasn't stripeed by babel!");
			t47 = space();
			p7 = element("p");
			t48 = text("Shameless plug: If you read my ");
			a11 = element("a");
			t49 = text("eslint for flow syntax");
			t50 = text(", you should be able to come to the same conclusion! 😅");
			t51 = space();
			p8 = element("p");
			t52 = text("So I checked the ");
			a12 = element("a");
			t53 = text("@babel/plugin strip-flow-types");
			t54 = text(", I realise there's a ");
			code6 = element("code");
			t55 = text("all");
			t56 = text(" option that I had missed out, basically it says,");
			t57 = space();
			blockquote1 = element("blockquote");
			p9 = element("p");
			strong1 = element("strong");
			t58 = text("only parse");
			t59 = text(" Flow-specific features if a ");
			code7 = element("code");
			t60 = text("@flow");
			t61 = text(" pragma is ");
			strong2 = element("strong");
			t62 = text("present atop");
			t63 = text(" the file");
			t64 = space();
			p10 = element("p");
			t65 = text("It seems that in my file,");
			t66 = space();
			pre2 = element("pre");
			t67 = space();
			p11 = element("p");
			t68 = text("I had a innocent looking ");
			code8 = element("code");
			t69 = text("/** @module */");
			t70 = text(" comment above ");
			code9 = element("code");
			t71 = text("// @flow");
			t72 = text(" that breaks my babel plugin!");
			t73 = space();
			p12 = element("p");
			t74 = text("So the quick fix is to either:");
			t75 = space();
			ul1 = element("ul");
			li7 = element("li");
			t76 = text("Move ");
			code10 = element("code");
			t77 = text("// @flow");
			t78 = text(" comment above ");
			code11 = element("code");
			t79 = text("/** @module foobar */");
			t80 = text(", or");
			t81 = space();
			li8 = element("li");
			t82 = text("Set ");
			code12 = element("code");
			t83 = text("all: true");
			t84 = text(" in ");
			code13 = element("code");
			t85 = text("@babel/plugin-transform-flow-strip-types");
			t86 = text(".");
			t87 = space();
			p13 = element("p");
			t88 = text("Either way, it solves the issue.");
			t89 = space();
			p14 = element("p");
			t90 = text("However, one thing bothers me:");
			t91 = space();
			blockquote2 = element("blockquote");
			p15 = element("p");
			t92 = text("My Flow works perfectly fine with an extra comment on top ");
			code14 = element("code");
			t93 = text("// @flow");
			t94 = text(", it still typechecks and provides auto-suggestions.");
			t95 = space();
			p16 = element("p");
			t96 = text("So, the logic for ");
			code15 = element("code");
			t97 = text("@babel/plugin-transform-flow-strip-types");
			t98 = text(" and Flow to determine whether a file is a Flow file or not ");
			strong3 = element("strong");
			t99 = text("is different");
			t100 = text("!");
			t101 = space();
			p17 = element("p");
			t102 = text("And as a frequent user of Open Source libraries, this is something I think I ");
			del0 = element("del");
			t103 = text("can");
			t104 = text(" should fix, for the betterment of the JavaScript Open Source world 😅. I always imagine there's another innocent front-end developer across the world like me stumbled upon a perplexing bug, if only me let the bug go with a workaround/patch.");
			t105 = space();
			blockquote3 = element("blockquote");
			p18 = element("p");
			t106 = text("There's so much to achieve if we, not just consume the effort of others from the Open Source, but to also contribute into it.");
			t107 = space();
			section3 = element("section");
			h22 = element("h2");
			a13 = element("a");
			t108 = text("Game Plan");
			t109 = space();
			p19 = element("p");
			t110 = text("So, to fix this bug, one simply has to:");
			t111 = space();
			ul2 = element("ul");
			li9 = element("li");
			t112 = text("Read Flow's source code and understand the logic");
			t113 = space();
			li10 = element("li");
			t114 = text("Read @babel/plugin-transform-strip-flow-type's source code and understand the logic");
			t115 = space();
			li11 = element("li");
			t116 = text("Make changes to babel code");
			t117 = space();
			li12 = element("li");
			t118 = text("Send a MR and brag about it 😎");
			t119 = space();
			p20 = element("p");
			t120 = text("Whether this is achieveable at my current level, that's a different story.\nBut ");
			strong4 = element("strong");
			t121 = text("one has nothing to lose to try and fail");
			t122 = text(".");
			t123 = space();
			section4 = element("section");
			h23 = element("h2");
			a14 = element("a");
			t124 = text("Flow");
			t125 = space();
			p21 = element("p");
			t126 = text("I've read a bit of Flow source code previously, mainly to ");
			a15 = element("a");
			t127 = text("fix a bad developer experience I had with flowconfig previously");
			t128 = text(". I had to learn ");
			a16 = element("a");
			t129 = text("OCaml");
			t130 = text(", which was a fad a while ago because of ");
			a17 = element("a");
			t131 = text("ReasonML");
			t132 = text(", to understand Flow source code.");
			t133 = space();
			p22 = element("p");
			t134 = text("So, this time around, I am much more comfortable to dig the code to find out the information I want.");
			t135 = space();
			p23 = element("p");
			t136 = text("I searched for the term ");
			code16 = element("code");
			t137 = text("\"@flow\"");
			t138 = text(", which ended me up with ");
			a18 = element("a");
			t139 = text("this function");
			t140 = text(", ");
			code17 = element("code");
			t141 = text("extract_docblock");
			t142 = text(" which returns me the information of whether ");
			code18 = element("code");
			t143 = text("@flow");
			t144 = text(" is present in the file. And I dug further, I ended up with ");
			a19 = element("a");
			t145 = text("the annonymous function that ");
			code19 = element("code");
			t146 = text("extract_docblck");
			t147 = text(" returns");
			t148 = text(".");
			t149 = space();
			p24 = element("p");
			t150 = text("Allow me to loosely translate the logic into some pseudo JavaScript:");
			t151 = space();
			pre3 = element("pre");
			t152 = space();
			p25 = element("p");
			t153 = text("In human language:");
			t154 = space();
			p26 = element("p");
			t155 = text("Flow will read ");
			code20 = element("code");
			t156 = text("maxTokens");
			t157 = text(" number of tokens, look for comments that matches ");
			code21 = element("code");
			t158 = text("@flow");
			t159 = text(", if it encounters any order tokens, it will bail out early, with the exception of string and semicolon.");
			t160 = space();
			p27 = element("p");
			t161 = text("So,");
			t162 = space();
			pre4 = element("pre");
			t163 = space();
			p28 = element("p");
			t164 = text("and");
			t165 = space();
			pre5 = element("pre");
			t166 = space();
			p29 = element("p");
			t167 = text("is considered as a valid Flow file.");
			t168 = space();
			p30 = element("p");
			t169 = text("But");
			t170 = space();
			pre6 = element("pre");
			t171 = space();
			p31 = element("p");
			t172 = text("or");
			t173 = space();
			pre7 = element("pre");
			t174 = space();
			p32 = element("p");
			t175 = text("is not.");
			t176 = space();
			section5 = element("section");
			h24 = element("h2");
			a20 = element("a");
			t177 = text("Babel");
			t178 = space();
			p33 = element("p");
			t179 = text("At first, I thought that the logic would be in ");
			code22 = element("code");
			t180 = text("@babel/transform-strip-flow-types");
			t181 = text(", but apparently, its not.");
			t182 = space();
			p34 = element("p");
			t183 = text("I discovered that by realising that the ");
			a21 = element("a");
			t184 = text("source code of @babel/transform-strip-flow-types");
			t185 = text(" did not include anything about the ");
			code23 = element("code");
			t186 = text("all");
			t187 = text(" options, and ");
			a22 = element("a");
			t188 = text("this plugin extends the @babel/plugin-syntax-flow");
			t189 = text(", which I knew fairly well that syntax plugins in babel does nothing but to enable syntax switch of the ");
			code24 = element("code");
			t190 = text("@babel/parser");
			t191 = text(". The bulk of the logic lies within the ");
			a23 = element("a");
			code25 = element("code");
			t192 = text("@babel/parser");
			t193 = text("'s flow plugin");
			t194 = text(".");
			t195 = space();
			p35 = element("p");
			t196 = text("That was all because ");
			a24 = element("a");
			t197 = text("I contributed to ");
			code26 = element("code");
			t198 = text("@babel/parser");
			t199 = text(" before");
			t200 = text(".");
			t201 = space();
			p36 = element("p");
			t202 = text("And here we are in babel-parser, and the line that caught my attention is ");
			a25 = element("a");
			t203 = text("this");
			t204 = text(":");
			t205 = space();
			pre8 = element("pre");
			t206 = space();
			p37 = element("p");
			t207 = text("So, the babel's logic of getting a Flow pragma is that as soon as the first comment encountered, we parse the comment and we turn on the Flow syntax switch.");
			t208 = space();
			p38 = element("p");
			t209 = text("This is the reason why if we have a comment before ");
			code27 = element("code");
			t210 = text("// @flow");
			t211 = text(", we will not treat the file as a valid Flow file.");
			t212 = space();
			p39 = element("p");
			t213 = text("Interesting enough, this means that if we write");
			t214 = space();
			pre9 = element("pre");
			t215 = space();
			p40 = element("p");
			t216 = text("the first half of the code before ");
			code28 = element("code");
			t217 = text("// @flow");
			t218 = text(" was parsed as a normal JS code, and the second half after ");
			code29 = element("code");
			t219 = text("// @flow");
			t220 = text(" was parsed as a Flow code.");
			t221 = space();
			p41 = element("p");
			t222 = text("You can see this clearly with ");
			t223 = text(".");
			t224 = space();
			p42 = element("p");
			em2 = element("em");
			t225 = text("(I built it with React + Hooks over a long weekend, which I will share about how did it in the future.)");
			t226 = text(".");
			t227 = space();
			p43 = element("p");
			t228 = text("You can see that the first expression is a ");
			code30 = element("code");
			t229 = text("BinaryExpression");
			t230 = text(" but the second expression is a ");
			code31 = element("code");
			t231 = text("CallExpression");
			t232 = text(";");
			t233 = space();
			section6 = element("section");
			h25 = element("h2");
			a26 = element("a");
			t234 = text("Make changes to the babel code");
			t235 = space();
			p44 = element("p");
			t236 = text("Now step 3, make changes to babel code. So I decided to open an issue and started fixing the code. Surprisingly, someone else ");
			a27 = element("a");
			t237 = text("had reported the issue a few months ago");
			t238 = text(", and the issue was still opened.");
			t239 = space();
			p45 = element("p");
			t240 = text("So ");
			a28 = element("a");
			t241 = text("I explained what I had discovered");
			t242 = text(", and tried to ");
			a29 = element("a");
			t243 = text("propose a solution");
			t244 = text(". Well, after some struggle, I realised I am still a bit behind from being able to fix this code.");
			t245 = space();
			p46 = element("p");
			t246 = text("So how?");
			t247 = space();
			p47 = element("p");
			t248 = text("I submitted a ");
			a30 = element("a");
			t249 = text("PR");
			t250 = text(" with a big ");
			strong5 = element("strong");
			t251 = text("WIP");
			t252 = text(", because I didn't know how to look ahead ");
			code32 = element("code");
			t253 = text("n");
			t254 = text(" tokens and determine the ");
			code33 = element("code");
			t255 = text("flowPragma");
			t256 = text(" flag before ");
			code34 = element("code");
			t257 = text("babel");
			t258 = text(" starts parsing the code. I explored around the ");
			code35 = element("code");
			t259 = text("babel-parser");
			t260 = text(" source code, uncover new concepts that I never knew before. It took me a day to contemplate and fiddle around, until something sparked me.");
			t261 = space();
			p48 = element("p");
			t262 = text("I realised I do not have to follow exactly Flow's logic in order to achieve similar behaviour. That's when I submitted another ");
			a31 = element("a");
			t263 = text("PR");
			t264 = text(" and closed the previous one. ");
			em3 = element("em");
			t265 = text("(You can check it out if you are curious about it)");
			t266 = text(".");
			t267 = space();
			p49 = element("p");
			t268 = text("And finally, the fix has merged into ");
			a32 = element("a");
			t269 = text("babel v7.4.4");
			t270 = text("! 🎉🎉");
			t271 = space();
			p50 = element("p");
			t272 = text("And I can't wait to try all the edge cases that I have fixed in babel repl:");
			t273 = space();
			ul3 = element("ul");
			li13 = element("li");
			a33 = element("a");
			code36 = element("code");
			t274 = text("'use strict'");
			t275 = text("; before ");
			code37 = element("code");
			t276 = text("// @flow");
			t277 = space();
			li14 = element("li");
			a34 = element("a");
			t278 = text("comments before ");
			code38 = element("code");
			t279 = text("//@flow");
			t280 = space();
			li15 = element("li");
			a35 = element("a");
			t281 = text("first comment is ");
			code39 = element("code");
			t282 = text("//@flow");
			t283 = text(", but in the middle of the file");
			t284 = space();
			section7 = element("section");
			h26 = element("h2");
			a36 = element("a");
			t285 = text("Closing Remark");
			t286 = space();
			p51 = element("p");
			del1 = element("del");
			t287 = text("Well, I am sorry that I am going to stop here, because the issue is still opened, but I hoped you enjoy the detective journey along the way of hunting this bug.");
			t288 = space();
			p52 = element("p");
			del2 = element("del");
			t289 = text("If you encountered similar issues, you can patch it first with the solution I mentioned earlier. And do follow the Github issue, I will do my best to fix this.");
			t290 = space();
			p53 = element("p");
			t291 = text("If you encountered similar issues, please ");
			a37 = element("a");
			t292 = text("upgrade babel to v7.4.4");
			t293 = text(".");
			t294 = space();
			blockquote4 = element("blockquote");
			p54 = element("p");
			t295 = text("The best thing about open source is that the source code is open. As part of the JS community, we should not just reap the efforts of the community when we are building our next billion dollar idea, we should also contribute back so that the community as a whole can grow and improve together.");
			t296 = space();
			p55 = element("p");
			t297 = text("As usual, here are the list of references for this article:");
			t298 = space();
			ul4 = element("ul");
			li16 = element("li");
			a38 = element("a");
			t299 = text("Blog: Errors encountered upgrading Flow v0.85");
			t300 = space();
			li17 = element("li");
			a39 = element("a");
			t301 = text("My eslint doesn’t work with for flow 0.85’s explicit type argument syntax");
			t302 = space();
			li18 = element("li");
			a40 = element("a");
			t303 = text("Docs: Upgrading Babel v7");
			t304 = space();
			li19 = element("li");
			a41 = element("a");
			t305 = text("Docs: @babel/transform-plugin-flow-strip-types");
			t306 = space();
			li20 = element("li");
			a42 = element("a");
			t307 = text("Docs: ReasonML");
			t308 = space();
			li21 = element("li");
			a43 = element("a");
			t309 = text("Code: Flow Parsing Service");
			t310 = space();
			li22 = element("li");
			a44 = element("a");
			t311 = text("Issue: Parsing error when calling generic functions with type arguments when flow pragma is not first comment");
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
			t1 = claim_text(a1_nodes, "ReferenceError: XType is not defined");
			a1_nodes.forEach(detach);
			li1_nodes.forEach(detach);
			li2 = claim_element(ul0_nodes, "LI", {});
			var li2_nodes = children(li2);
			a2 = claim_element(li2_nodes, "A", { href: true });
			var a2_nodes = children(a2);
			t2 = claim_text(a2_nodes, "Game Plan");
			a2_nodes.forEach(detach);
			li2_nodes.forEach(detach);
			li3 = claim_element(ul0_nodes, "LI", {});
			var li3_nodes = children(li3);
			a3 = claim_element(li3_nodes, "A", { href: true });
			var a3_nodes = children(a3);
			t3 = claim_text(a3_nodes, "Flow");
			a3_nodes.forEach(detach);
			li3_nodes.forEach(detach);
			li4 = claim_element(ul0_nodes, "LI", {});
			var li4_nodes = children(li4);
			a4 = claim_element(li4_nodes, "A", { href: true });
			var a4_nodes = children(a4);
			t4 = claim_text(a4_nodes, "Babel");
			a4_nodes.forEach(detach);
			li4_nodes.forEach(detach);
			li5 = claim_element(ul0_nodes, "LI", {});
			var li5_nodes = children(li5);
			a5 = claim_element(li5_nodes, "A", { href: true });
			var a5_nodes = children(a5);
			t5 = claim_text(a5_nodes, "Make changes to the babel code");
			a5_nodes.forEach(detach);
			li5_nodes.forEach(detach);
			li6 = claim_element(ul0_nodes, "LI", {});
			var li6_nodes = children(li6);
			a6 = claim_element(li6_nodes, "A", { href: true });
			var a6_nodes = children(a6);
			t6 = claim_text(a6_nodes, "Closing Remark");
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
			t8 = claim_text(a7_nodes, "Background");
			a7_nodes.forEach(detach);
			h20_nodes.forEach(detach);
			t9 = claim_space(section1_nodes);
			p0 = claim_element(section1_nodes, "P", {});
			var p0_nodes = children(p0);
			t10 = claim_text(p0_nodes, "Mentioned in the ");
			a8 = claim_element(p0_nodes, "A", { href: true });
			var a8_nodes = children(a8);
			t11 = claim_text(a8_nodes, "previous post");
			a8_nodes.forEach(detach);
			t12 = claim_text(p0_nodes, ", we have ");
			a9 = claim_element(p0_nodes, "A", { href: true, rel: true });
			var a9_nodes = children(a9);
			t13 = claim_text(a9_nodes, "upgraded babel 7");
			a9_nodes.forEach(detach);
			t14 = claim_text(p0_nodes, " to support the new Flow syntax.");
			p0_nodes.forEach(detach);
			t15 = claim_space(section1_nodes);
			p1 = claim_element(section1_nodes, "P", {});
			var p1_nodes = children(p1);
			code0 = claim_element(p1_nodes, "CODE", {});
			var code0_nodes = children(code0);
			t16 = claim_text(code0_nodes, "foobar<Type>(x)");
			code0_nodes.forEach(detach);
			t17 = claim_text(p1_nodes, " is now ");
			em0 = claim_element(p1_nodes, "EM", {});
			var em0_nodes = children(em0);
			t18 = claim_text(em0_nodes, "call foobar with x, and type parameter ");
			code1 = claim_element(em0_nodes, "CODE", {});
			var code1_nodes = children(code1);
			t19 = claim_text(code1_nodes, "Type");
			code1_nodes.forEach(detach);
			em0_nodes.forEach(detach);
			t20 = claim_text(p1_nodes, " rather than ");
			code2 = claim_element(p1_nodes, "CODE", {});
			var code2_nodes = children(code2);
			t21 = claim_text(code2_nodes, "(foobar < Type) > x)");
			code2_nodes.forEach(detach);
			t22 = claim_space(p1_nodes);
			em1 = claim_element(p1_nodes, "EM", {});
			var em1_nodes = children(em1);
			t23 = claim_text(em1_nodes, "is the result of foobar smaller than Type, greater than x?");
			em1_nodes.forEach(detach);
			t24 = claim_text(p1_nodes, ".");
			p1_nodes.forEach(detach);
			t25 = claim_space(section1_nodes);
			blockquote0 = claim_element(section1_nodes, "BLOCKQUOTE", {});
			var blockquote0_nodes = children(blockquote0);
			p2 = claim_element(blockquote0_nodes, "P", {});
			var p2_nodes = children(p2);
			t26 = claim_text(p2_nodes, "Everything is great, until a weird runtime error caught us off guard.");
			p2_nodes.forEach(detach);
			blockquote0_nodes.forEach(detach);
			section1_nodes.forEach(detach);
			t27 = claim_space(nodes);
			section2 = claim_element(nodes, "SECTION", {});
			var section2_nodes = children(section2);
			h21 = claim_element(section2_nodes, "H2", {});
			var h21_nodes = children(h21);
			a10 = claim_element(h21_nodes, "A", { href: true, id: true });
			var a10_nodes = children(a10);
			t28 = claim_text(a10_nodes, "ReferenceError: XType is not defined");
			a10_nodes.forEach(detach);
			h21_nodes.forEach(detach);
			t29 = claim_space(section2_nodes);
			pre0 = claim_element(section2_nodes, "PRE", { class: true });
			var pre0_nodes = children(pre0);
			pre0_nodes.forEach(detach);
			t30 = claim_space(section2_nodes);
			p3 = claim_element(section2_nodes, "P", {});
			var p3_nodes = children(p3);
			t31 = claim_text(p3_nodes, "The first time I saw this error, my first impression was that I forgot to import ");
			code3 = claim_element(p3_nodes, "CODE", {});
			var code3_nodes = children(code3);
			t32 = claim_text(code3_nodes, "XType");
			code3_nodes.forEach(detach);
			t33 = claim_text(p3_nodes, ", so I scrolled to the top of the document. But, alas, I ");
			strong0 = claim_element(p3_nodes, "STRONG", {});
			var strong0_nodes = children(strong0);
			t34 = claim_text(strong0_nodes, "did import");
			strong0_nodes.forEach(detach);
			t35 = claim_space(p3_nodes);
			code4 = claim_element(p3_nodes, "CODE", {});
			var code4_nodes = children(code4);
			t36 = claim_text(code4_nodes, "XType");
			code4_nodes.forEach(detach);
			t37 = claim_text(p3_nodes, ".");
			p3_nodes.forEach(detach);
			t38 = claim_space(section2_nodes);
			p4 = claim_element(section2_nodes, "P", {});
			var p4_nodes = children(p4);
			t39 = claim_text(p4_nodes, "So what is going on? 🤷‍");
			p4_nodes.forEach(detach);
			t40 = claim_space(section2_nodes);
			p5 = claim_element(section2_nodes, "P", {});
			var p5_nodes = children(p5);
			t41 = claim_text(p5_nodes, "I clicked into the error,");
			p5_nodes.forEach(detach);
			t42 = claim_space(section2_nodes);
			pre1 = claim_element(section2_nodes, "PRE", { class: true });
			var pre1_nodes = children(pre1);
			pre1_nodes.forEach(detach);
			t43 = claim_space(section2_nodes);
			p6 = claim_element(section2_nodes, "P", {});
			var p6_nodes = children(p6);
			t44 = claim_text(p6_nodes, "looked at me innocently. I knew something was wrong. ");
			code5 = claim_element(p6_nodes, "CODE", {});
			var code5_nodes = children(code5);
			t45 = claim_text(code5_nodes, "XType");
			code5_nodes.forEach(detach);
			t46 = claim_text(p6_nodes, " wasn't stripeed by babel!");
			p6_nodes.forEach(detach);
			t47 = claim_space(section2_nodes);
			p7 = claim_element(section2_nodes, "P", {});
			var p7_nodes = children(p7);
			t48 = claim_text(p7_nodes, "Shameless plug: If you read my ");
			a11 = claim_element(p7_nodes, "A", { href: true });
			var a11_nodes = children(a11);
			t49 = claim_text(a11_nodes, "eslint for flow syntax");
			a11_nodes.forEach(detach);
			t50 = claim_text(p7_nodes, ", you should be able to come to the same conclusion! 😅");
			p7_nodes.forEach(detach);
			t51 = claim_space(section2_nodes);
			p8 = claim_element(section2_nodes, "P", {});
			var p8_nodes = children(p8);
			t52 = claim_text(p8_nodes, "So I checked the ");
			a12 = claim_element(p8_nodes, "A", { href: true, rel: true });
			var a12_nodes = children(a12);
			t53 = claim_text(a12_nodes, "@babel/plugin strip-flow-types");
			a12_nodes.forEach(detach);
			t54 = claim_text(p8_nodes, ", I realise there's a ");
			code6 = claim_element(p8_nodes, "CODE", {});
			var code6_nodes = children(code6);
			t55 = claim_text(code6_nodes, "all");
			code6_nodes.forEach(detach);
			t56 = claim_text(p8_nodes, " option that I had missed out, basically it says,");
			p8_nodes.forEach(detach);
			t57 = claim_space(section2_nodes);
			blockquote1 = claim_element(section2_nodes, "BLOCKQUOTE", {});
			var blockquote1_nodes = children(blockquote1);
			p9 = claim_element(blockquote1_nodes, "P", {});
			var p9_nodes = children(p9);
			strong1 = claim_element(p9_nodes, "STRONG", {});
			var strong1_nodes = children(strong1);
			t58 = claim_text(strong1_nodes, "only parse");
			strong1_nodes.forEach(detach);
			t59 = claim_text(p9_nodes, " Flow-specific features if a ");
			code7 = claim_element(p9_nodes, "CODE", {});
			var code7_nodes = children(code7);
			t60 = claim_text(code7_nodes, "@flow");
			code7_nodes.forEach(detach);
			t61 = claim_text(p9_nodes, " pragma is ");
			strong2 = claim_element(p9_nodes, "STRONG", {});
			var strong2_nodes = children(strong2);
			t62 = claim_text(strong2_nodes, "present atop");
			strong2_nodes.forEach(detach);
			t63 = claim_text(p9_nodes, " the file");
			p9_nodes.forEach(detach);
			blockquote1_nodes.forEach(detach);
			t64 = claim_space(section2_nodes);
			p10 = claim_element(section2_nodes, "P", {});
			var p10_nodes = children(p10);
			t65 = claim_text(p10_nodes, "It seems that in my file,");
			p10_nodes.forEach(detach);
			t66 = claim_space(section2_nodes);
			pre2 = claim_element(section2_nodes, "PRE", { class: true });
			var pre2_nodes = children(pre2);
			pre2_nodes.forEach(detach);
			t67 = claim_space(section2_nodes);
			p11 = claim_element(section2_nodes, "P", {});
			var p11_nodes = children(p11);
			t68 = claim_text(p11_nodes, "I had a innocent looking ");
			code8 = claim_element(p11_nodes, "CODE", {});
			var code8_nodes = children(code8);
			t69 = claim_text(code8_nodes, "/** @module */");
			code8_nodes.forEach(detach);
			t70 = claim_text(p11_nodes, " comment above ");
			code9 = claim_element(p11_nodes, "CODE", {});
			var code9_nodes = children(code9);
			t71 = claim_text(code9_nodes, "// @flow");
			code9_nodes.forEach(detach);
			t72 = claim_text(p11_nodes, " that breaks my babel plugin!");
			p11_nodes.forEach(detach);
			t73 = claim_space(section2_nodes);
			p12 = claim_element(section2_nodes, "P", {});
			var p12_nodes = children(p12);
			t74 = claim_text(p12_nodes, "So the quick fix is to either:");
			p12_nodes.forEach(detach);
			t75 = claim_space(section2_nodes);
			ul1 = claim_element(section2_nodes, "UL", {});
			var ul1_nodes = children(ul1);
			li7 = claim_element(ul1_nodes, "LI", {});
			var li7_nodes = children(li7);
			t76 = claim_text(li7_nodes, "Move ");
			code10 = claim_element(li7_nodes, "CODE", {});
			var code10_nodes = children(code10);
			t77 = claim_text(code10_nodes, "// @flow");
			code10_nodes.forEach(detach);
			t78 = claim_text(li7_nodes, " comment above ");
			code11 = claim_element(li7_nodes, "CODE", {});
			var code11_nodes = children(code11);
			t79 = claim_text(code11_nodes, "/** @module foobar */");
			code11_nodes.forEach(detach);
			t80 = claim_text(li7_nodes, ", or");
			li7_nodes.forEach(detach);
			t81 = claim_space(ul1_nodes);
			li8 = claim_element(ul1_nodes, "LI", {});
			var li8_nodes = children(li8);
			t82 = claim_text(li8_nodes, "Set ");
			code12 = claim_element(li8_nodes, "CODE", {});
			var code12_nodes = children(code12);
			t83 = claim_text(code12_nodes, "all: true");
			code12_nodes.forEach(detach);
			t84 = claim_text(li8_nodes, " in ");
			code13 = claim_element(li8_nodes, "CODE", {});
			var code13_nodes = children(code13);
			t85 = claim_text(code13_nodes, "@babel/plugin-transform-flow-strip-types");
			code13_nodes.forEach(detach);
			t86 = claim_text(li8_nodes, ".");
			li8_nodes.forEach(detach);
			ul1_nodes.forEach(detach);
			t87 = claim_space(section2_nodes);
			p13 = claim_element(section2_nodes, "P", {});
			var p13_nodes = children(p13);
			t88 = claim_text(p13_nodes, "Either way, it solves the issue.");
			p13_nodes.forEach(detach);
			t89 = claim_space(section2_nodes);
			p14 = claim_element(section2_nodes, "P", {});
			var p14_nodes = children(p14);
			t90 = claim_text(p14_nodes, "However, one thing bothers me:");
			p14_nodes.forEach(detach);
			t91 = claim_space(section2_nodes);
			blockquote2 = claim_element(section2_nodes, "BLOCKQUOTE", {});
			var blockquote2_nodes = children(blockquote2);
			p15 = claim_element(blockquote2_nodes, "P", {});
			var p15_nodes = children(p15);
			t92 = claim_text(p15_nodes, "My Flow works perfectly fine with an extra comment on top ");
			code14 = claim_element(p15_nodes, "CODE", {});
			var code14_nodes = children(code14);
			t93 = claim_text(code14_nodes, "// @flow");
			code14_nodes.forEach(detach);
			t94 = claim_text(p15_nodes, ", it still typechecks and provides auto-suggestions.");
			p15_nodes.forEach(detach);
			blockquote2_nodes.forEach(detach);
			t95 = claim_space(section2_nodes);
			p16 = claim_element(section2_nodes, "P", {});
			var p16_nodes = children(p16);
			t96 = claim_text(p16_nodes, "So, the logic for ");
			code15 = claim_element(p16_nodes, "CODE", {});
			var code15_nodes = children(code15);
			t97 = claim_text(code15_nodes, "@babel/plugin-transform-flow-strip-types");
			code15_nodes.forEach(detach);
			t98 = claim_text(p16_nodes, " and Flow to determine whether a file is a Flow file or not ");
			strong3 = claim_element(p16_nodes, "STRONG", {});
			var strong3_nodes = children(strong3);
			t99 = claim_text(strong3_nodes, "is different");
			strong3_nodes.forEach(detach);
			t100 = claim_text(p16_nodes, "!");
			p16_nodes.forEach(detach);
			t101 = claim_space(section2_nodes);
			p17 = claim_element(section2_nodes, "P", {});
			var p17_nodes = children(p17);
			t102 = claim_text(p17_nodes, "And as a frequent user of Open Source libraries, this is something I think I ");
			del0 = claim_element(p17_nodes, "DEL", {});
			var del0_nodes = children(del0);
			t103 = claim_text(del0_nodes, "can");
			del0_nodes.forEach(detach);
			t104 = claim_text(p17_nodes, " should fix, for the betterment of the JavaScript Open Source world 😅. I always imagine there's another innocent front-end developer across the world like me stumbled upon a perplexing bug, if only me let the bug go with a workaround/patch.");
			p17_nodes.forEach(detach);
			t105 = claim_space(section2_nodes);
			blockquote3 = claim_element(section2_nodes, "BLOCKQUOTE", {});
			var blockquote3_nodes = children(blockquote3);
			p18 = claim_element(blockquote3_nodes, "P", {});
			var p18_nodes = children(p18);
			t106 = claim_text(p18_nodes, "There's so much to achieve if we, not just consume the effort of others from the Open Source, but to also contribute into it.");
			p18_nodes.forEach(detach);
			blockquote3_nodes.forEach(detach);
			section2_nodes.forEach(detach);
			t107 = claim_space(nodes);
			section3 = claim_element(nodes, "SECTION", {});
			var section3_nodes = children(section3);
			h22 = claim_element(section3_nodes, "H2", {});
			var h22_nodes = children(h22);
			a13 = claim_element(h22_nodes, "A", { href: true, id: true });
			var a13_nodes = children(a13);
			t108 = claim_text(a13_nodes, "Game Plan");
			a13_nodes.forEach(detach);
			h22_nodes.forEach(detach);
			t109 = claim_space(section3_nodes);
			p19 = claim_element(section3_nodes, "P", {});
			var p19_nodes = children(p19);
			t110 = claim_text(p19_nodes, "So, to fix this bug, one simply has to:");
			p19_nodes.forEach(detach);
			t111 = claim_space(section3_nodes);
			ul2 = claim_element(section3_nodes, "UL", {});
			var ul2_nodes = children(ul2);
			li9 = claim_element(ul2_nodes, "LI", {});
			var li9_nodes = children(li9);
			t112 = claim_text(li9_nodes, "Read Flow's source code and understand the logic");
			li9_nodes.forEach(detach);
			t113 = claim_space(ul2_nodes);
			li10 = claim_element(ul2_nodes, "LI", {});
			var li10_nodes = children(li10);
			t114 = claim_text(li10_nodes, "Read @babel/plugin-transform-strip-flow-type's source code and understand the logic");
			li10_nodes.forEach(detach);
			t115 = claim_space(ul2_nodes);
			li11 = claim_element(ul2_nodes, "LI", {});
			var li11_nodes = children(li11);
			t116 = claim_text(li11_nodes, "Make changes to babel code");
			li11_nodes.forEach(detach);
			t117 = claim_space(ul2_nodes);
			li12 = claim_element(ul2_nodes, "LI", {});
			var li12_nodes = children(li12);
			t118 = claim_text(li12_nodes, "Send a MR and brag about it 😎");
			li12_nodes.forEach(detach);
			ul2_nodes.forEach(detach);
			t119 = claim_space(section3_nodes);
			p20 = claim_element(section3_nodes, "P", {});
			var p20_nodes = children(p20);
			t120 = claim_text(p20_nodes, "Whether this is achieveable at my current level, that's a different story.\nBut ");
			strong4 = claim_element(p20_nodes, "STRONG", {});
			var strong4_nodes = children(strong4);
			t121 = claim_text(strong4_nodes, "one has nothing to lose to try and fail");
			strong4_nodes.forEach(detach);
			t122 = claim_text(p20_nodes, ".");
			p20_nodes.forEach(detach);
			section3_nodes.forEach(detach);
			t123 = claim_space(nodes);
			section4 = claim_element(nodes, "SECTION", {});
			var section4_nodes = children(section4);
			h23 = claim_element(section4_nodes, "H2", {});
			var h23_nodes = children(h23);
			a14 = claim_element(h23_nodes, "A", { href: true, id: true });
			var a14_nodes = children(a14);
			t124 = claim_text(a14_nodes, "Flow");
			a14_nodes.forEach(detach);
			h23_nodes.forEach(detach);
			t125 = claim_space(section4_nodes);
			p21 = claim_element(section4_nodes, "P", {});
			var p21_nodes = children(p21);
			t126 = claim_text(p21_nodes, "I've read a bit of Flow source code previously, mainly to ");
			a15 = claim_element(p21_nodes, "A", { href: true, rel: true });
			var a15_nodes = children(a15);
			t127 = claim_text(a15_nodes, "fix a bad developer experience I had with flowconfig previously");
			a15_nodes.forEach(detach);
			t128 = claim_text(p21_nodes, ". I had to learn ");
			a16 = claim_element(p21_nodes, "A", { href: true, rel: true });
			var a16_nodes = children(a16);
			t129 = claim_text(a16_nodes, "OCaml");
			a16_nodes.forEach(detach);
			t130 = claim_text(p21_nodes, ", which was a fad a while ago because of ");
			a17 = claim_element(p21_nodes, "A", { href: true, rel: true });
			var a17_nodes = children(a17);
			t131 = claim_text(a17_nodes, "ReasonML");
			a17_nodes.forEach(detach);
			t132 = claim_text(p21_nodes, ", to understand Flow source code.");
			p21_nodes.forEach(detach);
			t133 = claim_space(section4_nodes);
			p22 = claim_element(section4_nodes, "P", {});
			var p22_nodes = children(p22);
			t134 = claim_text(p22_nodes, "So, this time around, I am much more comfortable to dig the code to find out the information I want.");
			p22_nodes.forEach(detach);
			t135 = claim_space(section4_nodes);
			p23 = claim_element(section4_nodes, "P", {});
			var p23_nodes = children(p23);
			t136 = claim_text(p23_nodes, "I searched for the term ");
			code16 = claim_element(p23_nodes, "CODE", {});
			var code16_nodes = children(code16);
			t137 = claim_text(code16_nodes, "\"@flow\"");
			code16_nodes.forEach(detach);
			t138 = claim_text(p23_nodes, ", which ended me up with ");
			a18 = claim_element(p23_nodes, "A", { href: true, rel: true });
			var a18_nodes = children(a18);
			t139 = claim_text(a18_nodes, "this function");
			a18_nodes.forEach(detach);
			t140 = claim_text(p23_nodes, ", ");
			code17 = claim_element(p23_nodes, "CODE", {});
			var code17_nodes = children(code17);
			t141 = claim_text(code17_nodes, "extract_docblock");
			code17_nodes.forEach(detach);
			t142 = claim_text(p23_nodes, " which returns me the information of whether ");
			code18 = claim_element(p23_nodes, "CODE", {});
			var code18_nodes = children(code18);
			t143 = claim_text(code18_nodes, "@flow");
			code18_nodes.forEach(detach);
			t144 = claim_text(p23_nodes, " is present in the file. And I dug further, I ended up with ");
			a19 = claim_element(p23_nodes, "A", { href: true, rel: true });
			var a19_nodes = children(a19);
			t145 = claim_text(a19_nodes, "the annonymous function that ");
			code19 = claim_element(a19_nodes, "CODE", {});
			var code19_nodes = children(code19);
			t146 = claim_text(code19_nodes, "extract_docblck");
			code19_nodes.forEach(detach);
			t147 = claim_text(a19_nodes, " returns");
			a19_nodes.forEach(detach);
			t148 = claim_text(p23_nodes, ".");
			p23_nodes.forEach(detach);
			t149 = claim_space(section4_nodes);
			p24 = claim_element(section4_nodes, "P", {});
			var p24_nodes = children(p24);
			t150 = claim_text(p24_nodes, "Allow me to loosely translate the logic into some pseudo JavaScript:");
			p24_nodes.forEach(detach);
			t151 = claim_space(section4_nodes);
			pre3 = claim_element(section4_nodes, "PRE", { class: true });
			var pre3_nodes = children(pre3);
			pre3_nodes.forEach(detach);
			t152 = claim_space(section4_nodes);
			p25 = claim_element(section4_nodes, "P", {});
			var p25_nodes = children(p25);
			t153 = claim_text(p25_nodes, "In human language:");
			p25_nodes.forEach(detach);
			t154 = claim_space(section4_nodes);
			p26 = claim_element(section4_nodes, "P", {});
			var p26_nodes = children(p26);
			t155 = claim_text(p26_nodes, "Flow will read ");
			code20 = claim_element(p26_nodes, "CODE", {});
			var code20_nodes = children(code20);
			t156 = claim_text(code20_nodes, "maxTokens");
			code20_nodes.forEach(detach);
			t157 = claim_text(p26_nodes, " number of tokens, look for comments that matches ");
			code21 = claim_element(p26_nodes, "CODE", {});
			var code21_nodes = children(code21);
			t158 = claim_text(code21_nodes, "@flow");
			code21_nodes.forEach(detach);
			t159 = claim_text(p26_nodes, ", if it encounters any order tokens, it will bail out early, with the exception of string and semicolon.");
			p26_nodes.forEach(detach);
			t160 = claim_space(section4_nodes);
			p27 = claim_element(section4_nodes, "P", {});
			var p27_nodes = children(p27);
			t161 = claim_text(p27_nodes, "So,");
			p27_nodes.forEach(detach);
			t162 = claim_space(section4_nodes);
			pre4 = claim_element(section4_nodes, "PRE", { class: true });
			var pre4_nodes = children(pre4);
			pre4_nodes.forEach(detach);
			t163 = claim_space(section4_nodes);
			p28 = claim_element(section4_nodes, "P", {});
			var p28_nodes = children(p28);
			t164 = claim_text(p28_nodes, "and");
			p28_nodes.forEach(detach);
			t165 = claim_space(section4_nodes);
			pre5 = claim_element(section4_nodes, "PRE", { class: true });
			var pre5_nodes = children(pre5);
			pre5_nodes.forEach(detach);
			t166 = claim_space(section4_nodes);
			p29 = claim_element(section4_nodes, "P", {});
			var p29_nodes = children(p29);
			t167 = claim_text(p29_nodes, "is considered as a valid Flow file.");
			p29_nodes.forEach(detach);
			t168 = claim_space(section4_nodes);
			p30 = claim_element(section4_nodes, "P", {});
			var p30_nodes = children(p30);
			t169 = claim_text(p30_nodes, "But");
			p30_nodes.forEach(detach);
			t170 = claim_space(section4_nodes);
			pre6 = claim_element(section4_nodes, "PRE", { class: true });
			var pre6_nodes = children(pre6);
			pre6_nodes.forEach(detach);
			t171 = claim_space(section4_nodes);
			p31 = claim_element(section4_nodes, "P", {});
			var p31_nodes = children(p31);
			t172 = claim_text(p31_nodes, "or");
			p31_nodes.forEach(detach);
			t173 = claim_space(section4_nodes);
			pre7 = claim_element(section4_nodes, "PRE", { class: true });
			var pre7_nodes = children(pre7);
			pre7_nodes.forEach(detach);
			t174 = claim_space(section4_nodes);
			p32 = claim_element(section4_nodes, "P", {});
			var p32_nodes = children(p32);
			t175 = claim_text(p32_nodes, "is not.");
			p32_nodes.forEach(detach);
			section4_nodes.forEach(detach);
			t176 = claim_space(nodes);
			section5 = claim_element(nodes, "SECTION", {});
			var section5_nodes = children(section5);
			h24 = claim_element(section5_nodes, "H2", {});
			var h24_nodes = children(h24);
			a20 = claim_element(h24_nodes, "A", { href: true, id: true });
			var a20_nodes = children(a20);
			t177 = claim_text(a20_nodes, "Babel");
			a20_nodes.forEach(detach);
			h24_nodes.forEach(detach);
			t178 = claim_space(section5_nodes);
			p33 = claim_element(section5_nodes, "P", {});
			var p33_nodes = children(p33);
			t179 = claim_text(p33_nodes, "At first, I thought that the logic would be in ");
			code22 = claim_element(p33_nodes, "CODE", {});
			var code22_nodes = children(code22);
			t180 = claim_text(code22_nodes, "@babel/transform-strip-flow-types");
			code22_nodes.forEach(detach);
			t181 = claim_text(p33_nodes, ", but apparently, its not.");
			p33_nodes.forEach(detach);
			t182 = claim_space(section5_nodes);
			p34 = claim_element(section5_nodes, "P", {});
			var p34_nodes = children(p34);
			t183 = claim_text(p34_nodes, "I discovered that by realising that the ");
			a21 = claim_element(p34_nodes, "A", { href: true, rel: true });
			var a21_nodes = children(a21);
			t184 = claim_text(a21_nodes, "source code of @babel/transform-strip-flow-types");
			a21_nodes.forEach(detach);
			t185 = claim_text(p34_nodes, " did not include anything about the ");
			code23 = claim_element(p34_nodes, "CODE", {});
			var code23_nodes = children(code23);
			t186 = claim_text(code23_nodes, "all");
			code23_nodes.forEach(detach);
			t187 = claim_text(p34_nodes, " options, and ");
			a22 = claim_element(p34_nodes, "A", { href: true, rel: true });
			var a22_nodes = children(a22);
			t188 = claim_text(a22_nodes, "this plugin extends the @babel/plugin-syntax-flow");
			a22_nodes.forEach(detach);
			t189 = claim_text(p34_nodes, ", which I knew fairly well that syntax plugins in babel does nothing but to enable syntax switch of the ");
			code24 = claim_element(p34_nodes, "CODE", {});
			var code24_nodes = children(code24);
			t190 = claim_text(code24_nodes, "@babel/parser");
			code24_nodes.forEach(detach);
			t191 = claim_text(p34_nodes, ". The bulk of the logic lies within the ");
			a23 = claim_element(p34_nodes, "A", { href: true, rel: true });
			var a23_nodes = children(a23);
			code25 = claim_element(a23_nodes, "CODE", {});
			var code25_nodes = children(code25);
			t192 = claim_text(code25_nodes, "@babel/parser");
			code25_nodes.forEach(detach);
			t193 = claim_text(a23_nodes, "'s flow plugin");
			a23_nodes.forEach(detach);
			t194 = claim_text(p34_nodes, ".");
			p34_nodes.forEach(detach);
			t195 = claim_space(section5_nodes);
			p35 = claim_element(section5_nodes, "P", {});
			var p35_nodes = children(p35);
			t196 = claim_text(p35_nodes, "That was all because ");
			a24 = claim_element(p35_nodes, "A", { href: true, rel: true });
			var a24_nodes = children(a24);
			t197 = claim_text(a24_nodes, "I contributed to ");
			code26 = claim_element(a24_nodes, "CODE", {});
			var code26_nodes = children(code26);
			t198 = claim_text(code26_nodes, "@babel/parser");
			code26_nodes.forEach(detach);
			t199 = claim_text(a24_nodes, " before");
			a24_nodes.forEach(detach);
			t200 = claim_text(p35_nodes, ".");
			p35_nodes.forEach(detach);
			t201 = claim_space(section5_nodes);
			p36 = claim_element(section5_nodes, "P", {});
			var p36_nodes = children(p36);
			t202 = claim_text(p36_nodes, "And here we are in babel-parser, and the line that caught my attention is ");
			a25 = claim_element(p36_nodes, "A", { href: true, rel: true });
			var a25_nodes = children(a25);
			t203 = claim_text(a25_nodes, "this");
			a25_nodes.forEach(detach);
			t204 = claim_text(p36_nodes, ":");
			p36_nodes.forEach(detach);
			t205 = claim_space(section5_nodes);
			pre8 = claim_element(section5_nodes, "PRE", { class: true });
			var pre8_nodes = children(pre8);
			pre8_nodes.forEach(detach);
			t206 = claim_space(section5_nodes);
			p37 = claim_element(section5_nodes, "P", {});
			var p37_nodes = children(p37);
			t207 = claim_text(p37_nodes, "So, the babel's logic of getting a Flow pragma is that as soon as the first comment encountered, we parse the comment and we turn on the Flow syntax switch.");
			p37_nodes.forEach(detach);
			t208 = claim_space(section5_nodes);
			p38 = claim_element(section5_nodes, "P", {});
			var p38_nodes = children(p38);
			t209 = claim_text(p38_nodes, "This is the reason why if we have a comment before ");
			code27 = claim_element(p38_nodes, "CODE", {});
			var code27_nodes = children(code27);
			t210 = claim_text(code27_nodes, "// @flow");
			code27_nodes.forEach(detach);
			t211 = claim_text(p38_nodes, ", we will not treat the file as a valid Flow file.");
			p38_nodes.forEach(detach);
			t212 = claim_space(section5_nodes);
			p39 = claim_element(section5_nodes, "P", {});
			var p39_nodes = children(p39);
			t213 = claim_text(p39_nodes, "Interesting enough, this means that if we write");
			p39_nodes.forEach(detach);
			t214 = claim_space(section5_nodes);
			pre9 = claim_element(section5_nodes, "PRE", { class: true });
			var pre9_nodes = children(pre9);
			pre9_nodes.forEach(detach);
			t215 = claim_space(section5_nodes);
			p40 = claim_element(section5_nodes, "P", {});
			var p40_nodes = children(p40);
			t216 = claim_text(p40_nodes, "the first half of the code before ");
			code28 = claim_element(p40_nodes, "CODE", {});
			var code28_nodes = children(code28);
			t217 = claim_text(code28_nodes, "// @flow");
			code28_nodes.forEach(detach);
			t218 = claim_text(p40_nodes, " was parsed as a normal JS code, and the second half after ");
			code29 = claim_element(p40_nodes, "CODE", {});
			var code29_nodes = children(code29);
			t219 = claim_text(code29_nodes, "// @flow");
			code29_nodes.forEach(detach);
			t220 = claim_text(p40_nodes, " was parsed as a Flow code.");
			p40_nodes.forEach(detach);
			t221 = claim_space(section5_nodes);
			p41 = claim_element(section5_nodes, "P", {});
			var p41_nodes = children(p41);
			t222 = claim_text(p41_nodes, "You can see this clearly with ");
			t223 = claim_text(p41_nodes, ".");
			p41_nodes.forEach(detach);
			t224 = claim_space(section5_nodes);
			p42 = claim_element(section5_nodes, "P", {});
			var p42_nodes = children(p42);
			em2 = claim_element(p42_nodes, "EM", {});
			var em2_nodes = children(em2);
			t225 = claim_text(em2_nodes, "(I built it with React + Hooks over a long weekend, which I will share about how did it in the future.)");
			em2_nodes.forEach(detach);
			t226 = claim_text(p42_nodes, ".");
			p42_nodes.forEach(detach);
			t227 = claim_space(section5_nodes);
			p43 = claim_element(section5_nodes, "P", {});
			var p43_nodes = children(p43);
			t228 = claim_text(p43_nodes, "You can see that the first expression is a ");
			code30 = claim_element(p43_nodes, "CODE", {});
			var code30_nodes = children(code30);
			t229 = claim_text(code30_nodes, "BinaryExpression");
			code30_nodes.forEach(detach);
			t230 = claim_text(p43_nodes, " but the second expression is a ");
			code31 = claim_element(p43_nodes, "CODE", {});
			var code31_nodes = children(code31);
			t231 = claim_text(code31_nodes, "CallExpression");
			code31_nodes.forEach(detach);
			t232 = claim_text(p43_nodes, ";");
			p43_nodes.forEach(detach);
			section5_nodes.forEach(detach);
			t233 = claim_space(nodes);
			section6 = claim_element(nodes, "SECTION", {});
			var section6_nodes = children(section6);
			h25 = claim_element(section6_nodes, "H2", {});
			var h25_nodes = children(h25);
			a26 = claim_element(h25_nodes, "A", { href: true, id: true });
			var a26_nodes = children(a26);
			t234 = claim_text(a26_nodes, "Make changes to the babel code");
			a26_nodes.forEach(detach);
			h25_nodes.forEach(detach);
			t235 = claim_space(section6_nodes);
			p44 = claim_element(section6_nodes, "P", {});
			var p44_nodes = children(p44);
			t236 = claim_text(p44_nodes, "Now step 3, make changes to babel code. So I decided to open an issue and started fixing the code. Surprisingly, someone else ");
			a27 = claim_element(p44_nodes, "A", { href: true, rel: true });
			var a27_nodes = children(a27);
			t237 = claim_text(a27_nodes, "had reported the issue a few months ago");
			a27_nodes.forEach(detach);
			t238 = claim_text(p44_nodes, ", and the issue was still opened.");
			p44_nodes.forEach(detach);
			t239 = claim_space(section6_nodes);
			p45 = claim_element(section6_nodes, "P", {});
			var p45_nodes = children(p45);
			t240 = claim_text(p45_nodes, "So ");
			a28 = claim_element(p45_nodes, "A", { href: true, rel: true });
			var a28_nodes = children(a28);
			t241 = claim_text(a28_nodes, "I explained what I had discovered");
			a28_nodes.forEach(detach);
			t242 = claim_text(p45_nodes, ", and tried to ");
			a29 = claim_element(p45_nodes, "A", { href: true, rel: true });
			var a29_nodes = children(a29);
			t243 = claim_text(a29_nodes, "propose a solution");
			a29_nodes.forEach(detach);
			t244 = claim_text(p45_nodes, ". Well, after some struggle, I realised I am still a bit behind from being able to fix this code.");
			p45_nodes.forEach(detach);
			t245 = claim_space(section6_nodes);
			p46 = claim_element(section6_nodes, "P", {});
			var p46_nodes = children(p46);
			t246 = claim_text(p46_nodes, "So how?");
			p46_nodes.forEach(detach);
			t247 = claim_space(section6_nodes);
			p47 = claim_element(section6_nodes, "P", {});
			var p47_nodes = children(p47);
			t248 = claim_text(p47_nodes, "I submitted a ");
			a30 = claim_element(p47_nodes, "A", { href: true, rel: true });
			var a30_nodes = children(a30);
			t249 = claim_text(a30_nodes, "PR");
			a30_nodes.forEach(detach);
			t250 = claim_text(p47_nodes, " with a big ");
			strong5 = claim_element(p47_nodes, "STRONG", {});
			var strong5_nodes = children(strong5);
			t251 = claim_text(strong5_nodes, "WIP");
			strong5_nodes.forEach(detach);
			t252 = claim_text(p47_nodes, ", because I didn't know how to look ahead ");
			code32 = claim_element(p47_nodes, "CODE", {});
			var code32_nodes = children(code32);
			t253 = claim_text(code32_nodes, "n");
			code32_nodes.forEach(detach);
			t254 = claim_text(p47_nodes, " tokens and determine the ");
			code33 = claim_element(p47_nodes, "CODE", {});
			var code33_nodes = children(code33);
			t255 = claim_text(code33_nodes, "flowPragma");
			code33_nodes.forEach(detach);
			t256 = claim_text(p47_nodes, " flag before ");
			code34 = claim_element(p47_nodes, "CODE", {});
			var code34_nodes = children(code34);
			t257 = claim_text(code34_nodes, "babel");
			code34_nodes.forEach(detach);
			t258 = claim_text(p47_nodes, " starts parsing the code. I explored around the ");
			code35 = claim_element(p47_nodes, "CODE", {});
			var code35_nodes = children(code35);
			t259 = claim_text(code35_nodes, "babel-parser");
			code35_nodes.forEach(detach);
			t260 = claim_text(p47_nodes, " source code, uncover new concepts that I never knew before. It took me a day to contemplate and fiddle around, until something sparked me.");
			p47_nodes.forEach(detach);
			t261 = claim_space(section6_nodes);
			p48 = claim_element(section6_nodes, "P", {});
			var p48_nodes = children(p48);
			t262 = claim_text(p48_nodes, "I realised I do not have to follow exactly Flow's logic in order to achieve similar behaviour. That's when I submitted another ");
			a31 = claim_element(p48_nodes, "A", { href: true, rel: true });
			var a31_nodes = children(a31);
			t263 = claim_text(a31_nodes, "PR");
			a31_nodes.forEach(detach);
			t264 = claim_text(p48_nodes, " and closed the previous one. ");
			em3 = claim_element(p48_nodes, "EM", {});
			var em3_nodes = children(em3);
			t265 = claim_text(em3_nodes, "(You can check it out if you are curious about it)");
			em3_nodes.forEach(detach);
			t266 = claim_text(p48_nodes, ".");
			p48_nodes.forEach(detach);
			t267 = claim_space(section6_nodes);
			p49 = claim_element(section6_nodes, "P", {});
			var p49_nodes = children(p49);
			t268 = claim_text(p49_nodes, "And finally, the fix has merged into ");
			a32 = claim_element(p49_nodes, "A", { href: true, rel: true });
			var a32_nodes = children(a32);
			t269 = claim_text(a32_nodes, "babel v7.4.4");
			a32_nodes.forEach(detach);
			t270 = claim_text(p49_nodes, "! 🎉🎉");
			p49_nodes.forEach(detach);
			t271 = claim_space(section6_nodes);
			p50 = claim_element(section6_nodes, "P", {});
			var p50_nodes = children(p50);
			t272 = claim_text(p50_nodes, "And I can't wait to try all the edge cases that I have fixed in babel repl:");
			p50_nodes.forEach(detach);
			t273 = claim_space(section6_nodes);
			ul3 = claim_element(section6_nodes, "UL", {});
			var ul3_nodes = children(ul3);
			li13 = claim_element(ul3_nodes, "LI", {});
			var li13_nodes = children(li13);
			a33 = claim_element(li13_nodes, "A", { href: true, rel: true });
			var a33_nodes = children(a33);
			code36 = claim_element(a33_nodes, "CODE", {});
			var code36_nodes = children(code36);
			t274 = claim_text(code36_nodes, "'use strict'");
			code36_nodes.forEach(detach);
			t275 = claim_text(a33_nodes, "; before ");
			code37 = claim_element(a33_nodes, "CODE", {});
			var code37_nodes = children(code37);
			t276 = claim_text(code37_nodes, "// @flow");
			code37_nodes.forEach(detach);
			a33_nodes.forEach(detach);
			li13_nodes.forEach(detach);
			t277 = claim_space(ul3_nodes);
			li14 = claim_element(ul3_nodes, "LI", {});
			var li14_nodes = children(li14);
			a34 = claim_element(li14_nodes, "A", { href: true, rel: true });
			var a34_nodes = children(a34);
			t278 = claim_text(a34_nodes, "comments before ");
			code38 = claim_element(a34_nodes, "CODE", {});
			var code38_nodes = children(code38);
			t279 = claim_text(code38_nodes, "//@flow");
			code38_nodes.forEach(detach);
			a34_nodes.forEach(detach);
			li14_nodes.forEach(detach);
			t280 = claim_space(ul3_nodes);
			li15 = claim_element(ul3_nodes, "LI", {});
			var li15_nodes = children(li15);
			a35 = claim_element(li15_nodes, "A", { href: true, rel: true });
			var a35_nodes = children(a35);
			t281 = claim_text(a35_nodes, "first comment is ");
			code39 = claim_element(a35_nodes, "CODE", {});
			var code39_nodes = children(code39);
			t282 = claim_text(code39_nodes, "//@flow");
			code39_nodes.forEach(detach);
			t283 = claim_text(a35_nodes, ", but in the middle of the file");
			a35_nodes.forEach(detach);
			li15_nodes.forEach(detach);
			ul3_nodes.forEach(detach);
			section6_nodes.forEach(detach);
			t284 = claim_space(nodes);
			section7 = claim_element(nodes, "SECTION", {});
			var section7_nodes = children(section7);
			h26 = claim_element(section7_nodes, "H2", {});
			var h26_nodes = children(h26);
			a36 = claim_element(h26_nodes, "A", { href: true, id: true });
			var a36_nodes = children(a36);
			t285 = claim_text(a36_nodes, "Closing Remark");
			a36_nodes.forEach(detach);
			h26_nodes.forEach(detach);
			t286 = claim_space(section7_nodes);
			p51 = claim_element(section7_nodes, "P", {});
			var p51_nodes = children(p51);
			del1 = claim_element(p51_nodes, "DEL", {});
			var del1_nodes = children(del1);
			t287 = claim_text(del1_nodes, "Well, I am sorry that I am going to stop here, because the issue is still opened, but I hoped you enjoy the detective journey along the way of hunting this bug.");
			del1_nodes.forEach(detach);
			p51_nodes.forEach(detach);
			t288 = claim_space(section7_nodes);
			p52 = claim_element(section7_nodes, "P", {});
			var p52_nodes = children(p52);
			del2 = claim_element(p52_nodes, "DEL", {});
			var del2_nodes = children(del2);
			t289 = claim_text(del2_nodes, "If you encountered similar issues, you can patch it first with the solution I mentioned earlier. And do follow the Github issue, I will do my best to fix this.");
			del2_nodes.forEach(detach);
			p52_nodes.forEach(detach);
			t290 = claim_space(section7_nodes);
			p53 = claim_element(section7_nodes, "P", {});
			var p53_nodes = children(p53);
			t291 = claim_text(p53_nodes, "If you encountered similar issues, please ");
			a37 = claim_element(p53_nodes, "A", { href: true, rel: true });
			var a37_nodes = children(a37);
			t292 = claim_text(a37_nodes, "upgrade babel to v7.4.4");
			a37_nodes.forEach(detach);
			t293 = claim_text(p53_nodes, ".");
			p53_nodes.forEach(detach);
			t294 = claim_space(section7_nodes);
			blockquote4 = claim_element(section7_nodes, "BLOCKQUOTE", {});
			var blockquote4_nodes = children(blockquote4);
			p54 = claim_element(blockquote4_nodes, "P", {});
			var p54_nodes = children(p54);
			t295 = claim_text(p54_nodes, "The best thing about open source is that the source code is open. As part of the JS community, we should not just reap the efforts of the community when we are building our next billion dollar idea, we should also contribute back so that the community as a whole can grow and improve together.");
			p54_nodes.forEach(detach);
			blockquote4_nodes.forEach(detach);
			t296 = claim_space(section7_nodes);
			p55 = claim_element(section7_nodes, "P", {});
			var p55_nodes = children(p55);
			t297 = claim_text(p55_nodes, "As usual, here are the list of references for this article:");
			p55_nodes.forEach(detach);
			t298 = claim_space(section7_nodes);
			ul4 = claim_element(section7_nodes, "UL", {});
			var ul4_nodes = children(ul4);
			li16 = claim_element(ul4_nodes, "LI", {});
			var li16_nodes = children(li16);
			a38 = claim_element(li16_nodes, "A", { href: true });
			var a38_nodes = children(a38);
			t299 = claim_text(a38_nodes, "Blog: Errors encountered upgrading Flow v0.85");
			a38_nodes.forEach(detach);
			li16_nodes.forEach(detach);
			t300 = claim_space(ul4_nodes);
			li17 = claim_element(ul4_nodes, "LI", {});
			var li17_nodes = children(li17);
			a39 = claim_element(li17_nodes, "A", { href: true });
			var a39_nodes = children(a39);
			t301 = claim_text(a39_nodes, "My eslint doesn’t work with for flow 0.85’s explicit type argument syntax");
			a39_nodes.forEach(detach);
			li17_nodes.forEach(detach);
			t302 = claim_space(ul4_nodes);
			li18 = claim_element(ul4_nodes, "LI", {});
			var li18_nodes = children(li18);
			a40 = claim_element(li18_nodes, "A", { href: true, rel: true });
			var a40_nodes = children(a40);
			t303 = claim_text(a40_nodes, "Docs: Upgrading Babel v7");
			a40_nodes.forEach(detach);
			li18_nodes.forEach(detach);
			t304 = claim_space(ul4_nodes);
			li19 = claim_element(ul4_nodes, "LI", {});
			var li19_nodes = children(li19);
			a41 = claim_element(li19_nodes, "A", { href: true, rel: true });
			var a41_nodes = children(a41);
			t305 = claim_text(a41_nodes, "Docs: @babel/transform-plugin-flow-strip-types");
			a41_nodes.forEach(detach);
			li19_nodes.forEach(detach);
			t306 = claim_space(ul4_nodes);
			li20 = claim_element(ul4_nodes, "LI", {});
			var li20_nodes = children(li20);
			a42 = claim_element(li20_nodes, "A", { href: true, rel: true });
			var a42_nodes = children(a42);
			t307 = claim_text(a42_nodes, "Docs: ReasonML");
			a42_nodes.forEach(detach);
			li20_nodes.forEach(detach);
			t308 = claim_space(ul4_nodes);
			li21 = claim_element(ul4_nodes, "LI", {});
			var li21_nodes = children(li21);
			a43 = claim_element(li21_nodes, "A", { href: true, rel: true });
			var a43_nodes = children(a43);
			t309 = claim_text(a43_nodes, "Code: Flow Parsing Service");
			a43_nodes.forEach(detach);
			li21_nodes.forEach(detach);
			t310 = claim_space(ul4_nodes);
			li22 = claim_element(ul4_nodes, "LI", {});
			var li22_nodes = children(li22);
			a44 = claim_element(li22_nodes, "A", { href: true, rel: true });
			var a44_nodes = children(a44);
			t311 = claim_text(a44_nodes, "Issue: Parsing error when calling generic functions with type arguments when flow pragma is not first comment");
			a44_nodes.forEach(detach);
			li22_nodes.forEach(detach);
			ul4_nodes.forEach(detach);
			section7_nodes.forEach(detach);
			this.h();
		},
		h() {
			attr(a0, "href", "#background");
			attr(a1, "href", "#referenceerror-xtype-is-not-defined");
			attr(a2, "href", "#game-plan");
			attr(a3, "href", "#flow");
			attr(a4, "href", "#babel");
			attr(a5, "href", "#make-changes-to-the-babel-code");
			attr(a6, "href", "#closing-remark");
			attr(ul0, "class", "sitemap");
			attr(ul0, "id", "sitemap");
			attr(ul0, "role", "navigation");
			attr(ul0, "aria-label", "Table of Contents");
			attr(a7, "href", "#background");
			attr(a7, "id", "background");
			attr(a8, "href", "/errors-encountered-upgrading-flow-0.85/");
			attr(a9, "href", "https://babeljs.io/docs/en/v7-migration");
			attr(a9, "rel", "nofollow");
			attr(a10, "href", "#referenceerror-xtype-is-not-defined");
			attr(a10, "id", "referenceerror-xtype-is-not-defined");
			attr(pre0, "class", "language-js");
			attr(pre1, "class", "language-js");
			attr(a11, "href", "/eslint-for-flow-explicit-type-argument-syntax/");
			attr(a12, "href", "https://babeljs.io/docs/en/babel-plugin-transform-flow-strip-types");
			attr(a12, "rel", "nofollow");
			attr(pre2, "class", "language-js");
			attr(a13, "href", "#game-plan");
			attr(a13, "id", "game-plan");
			attr(a14, "href", "#flow");
			attr(a14, "id", "flow");
			attr(a15, "href", "https://github.com/facebook/flow/pull/7083");
			attr(a15, "rel", "nofollow");
			attr(a16, "href", "https://ocaml.org/");
			attr(a16, "rel", "nofollow");
			attr(a17, "href", "https://reasonml.github.io/");
			attr(a17, "rel", "nofollow");
			attr(a18, "href", "https://github.com/facebook/flow/blob/master/src/parsing/parsing_service_js.ml#L143");
			attr(a18, "rel", "nofollow");
			attr(a19, "href", "https://github.com/facebook/flow/blob/master/src/parsing/parsing_service_js.ml#L275");
			attr(a19, "rel", "nofollow");
			attr(pre3, "class", "language-js");
			attr(pre4, "class", "language-js");
			attr(pre5, "class", "language-js");
			attr(pre6, "class", "language-js");
			attr(pre7, "class", "language-js");
			attr(a20, "href", "#babel");
			attr(a20, "id", "babel");
			attr(a21, "href", "https://github.com/babel/babel/blob/master/packages/babel-plugin-transform-flow-strip-types/src/index.js");
			attr(a21, "rel", "nofollow");
			attr(a22, "href", "https://github.com/babel/babel/blob/master/packages/babel-plugin-transform-flow-strip-types/src/index.js#L14");
			attr(a22, "rel", "nofollow");
			attr(a23, "href", "https://github.com/babel/babel/blob/master/packages/babel-parser/src/plugins/flow.js");
			attr(a23, "rel", "nofollow");
			attr(a24, "href", "https://github.com/babel/babel/pulls?q=is%3Apr+is%3Aclosed+author%3Atanhauhau");
			attr(a24, "rel", "nofollow");
			attr(a25, "href", "https://github.com/babel/babel/blob/master/packages/babel-parser/src/plugins/flow.js#L98");
			attr(a25, "rel", "nofollow");
			attr(pre8, "class", "language-js");
			attr(pre9, "class", "language-js");
			html_tag = new HtmlTag(t223);
			attr(a26, "href", "#make-changes-to-the-babel-code");
			attr(a26, "id", "make-changes-to-the-babel-code");
			attr(a27, "href", "https://github.com/babel/babel/issues/9240");
			attr(a27, "rel", "nofollow");
			attr(a28, "href", "https://github.com/babel/babel/issues/9240#issuecomment-485370957");
			attr(a28, "rel", "nofollow");
			attr(a29, "href", "https://github.com/babel/babel/pull/9885");
			attr(a29, "rel", "nofollow");
			attr(a30, "href", "https://github.com/babel/babel/pull/9885");
			attr(a30, "rel", "nofollow");
			attr(a31, "href", "https://github.com/babel/babel/pull/9891");
			attr(a31, "rel", "nofollow");
			attr(a32, "href", "https://github.com/babel/babel/releases/tag/v7.4.4");
			attr(a32, "rel", "nofollow");
			attr(a33, "href", "https://babeljs.io/repl#?babili=false&browsers=&build=&builtIns=false&spec=false&loose=false&code_lz=OQVwzgpgBGAuBOBLAxrYBuAUAem1AAgGYA2A9gO6aGmkA8AggHwAUARgJRbV1NudA&debug=false&forceAllTransforms=false&shippedProposals=false&circleciRepo=&evaluate=false&fileSize=false&timeTravel=false&sourceType=module&lineWrap=false&presets=&prettier=false&targets=&version=7.4.4&externalPlugins=%40babel%2Fplugin-transform-flow-strip-types%407.4.4");
			attr(a33, "rel", "nofollow");
			attr(a34, "href", "https://babeljs.io/repl#?babili=false&browsers=&build=&builtIns=false&spec=false&loose=false&code_lz=PQKhAIAEFsHsBMCuAbApgZ3AM1rcJgAoYYKLZWAd0J1gB4BBAPgAoAjASgG4bdHXOXIA&debug=false&forceAllTransforms=false&shippedProposals=false&circleciRepo=&evaluate=false&fileSize=false&timeTravel=false&sourceType=module&lineWrap=false&presets=&prettier=false&targets=&version=7.4.4&externalPlugins=%40babel%2Fplugin-transform-flow-strip-types%407.4.4");
			attr(a34, "rel", "nofollow");
			attr(a35, "href", "https://babeljs.io/repl#?babili=false&browsers=&build=&builtIns=false&spec=false&loose=false&code_lz=GYexB4EED4AoCMCUBuAUAenQAgALADYgDuqoEMCKQA&debug=false&forceAllTransforms=false&shippedProposals=false&circleciRepo=&evaluate=false&fileSize=false&timeTravel=false&sourceType=module&lineWrap=false&presets=&prettier=false&targets=&version=7.4.4&externalPlugins=%40babel%2Fplugin-transform-flow-strip-types%407.4.4");
			attr(a35, "rel", "nofollow");
			attr(a36, "href", "#closing-remark");
			attr(a36, "id", "closing-remark");
			attr(a37, "href", "https://github.com/babel/babel/releases/tag/v7.4.4");
			attr(a37, "rel", "nofollow");
			attr(a38, "href", "/errors-encountered-upgrading-flow-0.85");
			attr(a39, "href", "/eslint-for-flow-explicit-type-argument-syntax/");
			attr(a40, "href", "https://babeljs.io/docs/en/v7-migration");
			attr(a40, "rel", "nofollow");
			attr(a41, "href", "https://babeljs.io/docs/en/babel-plugin-transform-flow-strip-types");
			attr(a41, "rel", "nofollow");
			attr(a42, "href", "https://reasonml.github.io/");
			attr(a42, "rel", "nofollow");
			attr(a43, "href", "https://github.com/facebook/flow/blob/master/src/parsing/parsing_service_js.ml");
			attr(a43, "rel", "nofollow");
			attr(a44, "href", "https://github.com/babel/babel/issues/9240");
			attr(a44, "rel", "nofollow");
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
			append(p0, a9);
			append(a9, t13);
			append(p0, t14);
			append(section1, t15);
			append(section1, p1);
			append(p1, code0);
			append(code0, t16);
			append(p1, t17);
			append(p1, em0);
			append(em0, t18);
			append(em0, code1);
			append(code1, t19);
			append(p1, t20);
			append(p1, code2);
			append(code2, t21);
			append(p1, t22);
			append(p1, em1);
			append(em1, t23);
			append(p1, t24);
			append(section1, t25);
			append(section1, blockquote0);
			append(blockquote0, p2);
			append(p2, t26);
			insert(target, t27, anchor);
			insert(target, section2, anchor);
			append(section2, h21);
			append(h21, a10);
			append(a10, t28);
			append(section2, t29);
			append(section2, pre0);
			pre0.innerHTML = raw0_value;
			append(section2, t30);
			append(section2, p3);
			append(p3, t31);
			append(p3, code3);
			append(code3, t32);
			append(p3, t33);
			append(p3, strong0);
			append(strong0, t34);
			append(p3, t35);
			append(p3, code4);
			append(code4, t36);
			append(p3, t37);
			append(section2, t38);
			append(section2, p4);
			append(p4, t39);
			append(section2, t40);
			append(section2, p5);
			append(p5, t41);
			append(section2, t42);
			append(section2, pre1);
			pre1.innerHTML = raw1_value;
			append(section2, t43);
			append(section2, p6);
			append(p6, t44);
			append(p6, code5);
			append(code5, t45);
			append(p6, t46);
			append(section2, t47);
			append(section2, p7);
			append(p7, t48);
			append(p7, a11);
			append(a11, t49);
			append(p7, t50);
			append(section2, t51);
			append(section2, p8);
			append(p8, t52);
			append(p8, a12);
			append(a12, t53);
			append(p8, t54);
			append(p8, code6);
			append(code6, t55);
			append(p8, t56);
			append(section2, t57);
			append(section2, blockquote1);
			append(blockquote1, p9);
			append(p9, strong1);
			append(strong1, t58);
			append(p9, t59);
			append(p9, code7);
			append(code7, t60);
			append(p9, t61);
			append(p9, strong2);
			append(strong2, t62);
			append(p9, t63);
			append(section2, t64);
			append(section2, p10);
			append(p10, t65);
			append(section2, t66);
			append(section2, pre2);
			pre2.innerHTML = raw2_value;
			append(section2, t67);
			append(section2, p11);
			append(p11, t68);
			append(p11, code8);
			append(code8, t69);
			append(p11, t70);
			append(p11, code9);
			append(code9, t71);
			append(p11, t72);
			append(section2, t73);
			append(section2, p12);
			append(p12, t74);
			append(section2, t75);
			append(section2, ul1);
			append(ul1, li7);
			append(li7, t76);
			append(li7, code10);
			append(code10, t77);
			append(li7, t78);
			append(li7, code11);
			append(code11, t79);
			append(li7, t80);
			append(ul1, t81);
			append(ul1, li8);
			append(li8, t82);
			append(li8, code12);
			append(code12, t83);
			append(li8, t84);
			append(li8, code13);
			append(code13, t85);
			append(li8, t86);
			append(section2, t87);
			append(section2, p13);
			append(p13, t88);
			append(section2, t89);
			append(section2, p14);
			append(p14, t90);
			append(section2, t91);
			append(section2, blockquote2);
			append(blockquote2, p15);
			append(p15, t92);
			append(p15, code14);
			append(code14, t93);
			append(p15, t94);
			append(section2, t95);
			append(section2, p16);
			append(p16, t96);
			append(p16, code15);
			append(code15, t97);
			append(p16, t98);
			append(p16, strong3);
			append(strong3, t99);
			append(p16, t100);
			append(section2, t101);
			append(section2, p17);
			append(p17, t102);
			append(p17, del0);
			append(del0, t103);
			append(p17, t104);
			append(section2, t105);
			append(section2, blockquote3);
			append(blockquote3, p18);
			append(p18, t106);
			insert(target, t107, anchor);
			insert(target, section3, anchor);
			append(section3, h22);
			append(h22, a13);
			append(a13, t108);
			append(section3, t109);
			append(section3, p19);
			append(p19, t110);
			append(section3, t111);
			append(section3, ul2);
			append(ul2, li9);
			append(li9, t112);
			append(ul2, t113);
			append(ul2, li10);
			append(li10, t114);
			append(ul2, t115);
			append(ul2, li11);
			append(li11, t116);
			append(ul2, t117);
			append(ul2, li12);
			append(li12, t118);
			append(section3, t119);
			append(section3, p20);
			append(p20, t120);
			append(p20, strong4);
			append(strong4, t121);
			append(p20, t122);
			insert(target, t123, anchor);
			insert(target, section4, anchor);
			append(section4, h23);
			append(h23, a14);
			append(a14, t124);
			append(section4, t125);
			append(section4, p21);
			append(p21, t126);
			append(p21, a15);
			append(a15, t127);
			append(p21, t128);
			append(p21, a16);
			append(a16, t129);
			append(p21, t130);
			append(p21, a17);
			append(a17, t131);
			append(p21, t132);
			append(section4, t133);
			append(section4, p22);
			append(p22, t134);
			append(section4, t135);
			append(section4, p23);
			append(p23, t136);
			append(p23, code16);
			append(code16, t137);
			append(p23, t138);
			append(p23, a18);
			append(a18, t139);
			append(p23, t140);
			append(p23, code17);
			append(code17, t141);
			append(p23, t142);
			append(p23, code18);
			append(code18, t143);
			append(p23, t144);
			append(p23, a19);
			append(a19, t145);
			append(a19, code19);
			append(code19, t146);
			append(a19, t147);
			append(p23, t148);
			append(section4, t149);
			append(section4, p24);
			append(p24, t150);
			append(section4, t151);
			append(section4, pre3);
			pre3.innerHTML = raw3_value;
			append(section4, t152);
			append(section4, p25);
			append(p25, t153);
			append(section4, t154);
			append(section4, p26);
			append(p26, t155);
			append(p26, code20);
			append(code20, t156);
			append(p26, t157);
			append(p26, code21);
			append(code21, t158);
			append(p26, t159);
			append(section4, t160);
			append(section4, p27);
			append(p27, t161);
			append(section4, t162);
			append(section4, pre4);
			pre4.innerHTML = raw4_value;
			append(section4, t163);
			append(section4, p28);
			append(p28, t164);
			append(section4, t165);
			append(section4, pre5);
			pre5.innerHTML = raw5_value;
			append(section4, t166);
			append(section4, p29);
			append(p29, t167);
			append(section4, t168);
			append(section4, p30);
			append(p30, t169);
			append(section4, t170);
			append(section4, pre6);
			pre6.innerHTML = raw6_value;
			append(section4, t171);
			append(section4, p31);
			append(p31, t172);
			append(section4, t173);
			append(section4, pre7);
			pre7.innerHTML = raw7_value;
			append(section4, t174);
			append(section4, p32);
			append(p32, t175);
			insert(target, t176, anchor);
			insert(target, section5, anchor);
			append(section5, h24);
			append(h24, a20);
			append(a20, t177);
			append(section5, t178);
			append(section5, p33);
			append(p33, t179);
			append(p33, code22);
			append(code22, t180);
			append(p33, t181);
			append(section5, t182);
			append(section5, p34);
			append(p34, t183);
			append(p34, a21);
			append(a21, t184);
			append(p34, t185);
			append(p34, code23);
			append(code23, t186);
			append(p34, t187);
			append(p34, a22);
			append(a22, t188);
			append(p34, t189);
			append(p34, code24);
			append(code24, t190);
			append(p34, t191);
			append(p34, a23);
			append(a23, code25);
			append(code25, t192);
			append(a23, t193);
			append(p34, t194);
			append(section5, t195);
			append(section5, p35);
			append(p35, t196);
			append(p35, a24);
			append(a24, t197);
			append(a24, code26);
			append(code26, t198);
			append(a24, t199);
			append(p35, t200);
			append(section5, t201);
			append(section5, p36);
			append(p36, t202);
			append(p36, a25);
			append(a25, t203);
			append(p36, t204);
			append(section5, t205);
			append(section5, pre8);
			pre8.innerHTML = raw8_value;
			append(section5, t206);
			append(section5, p37);
			append(p37, t207);
			append(section5, t208);
			append(section5, p38);
			append(p38, t209);
			append(p38, code27);
			append(code27, t210);
			append(p38, t211);
			append(section5, t212);
			append(section5, p39);
			append(p39, t213);
			append(section5, t214);
			append(section5, pre9);
			pre9.innerHTML = raw9_value;
			append(section5, t215);
			append(section5, p40);
			append(p40, t216);
			append(p40, code28);
			append(code28, t217);
			append(p40, t218);
			append(p40, code29);
			append(code29, t219);
			append(p40, t220);
			append(section5, t221);
			append(section5, p41);
			append(p41, t222);
			html_tag.m(raw10_value, p41);
			append(p41, t223);
			append(section5, t224);
			append(section5, p42);
			append(p42, em2);
			append(em2, t225);
			append(p42, t226);
			append(section5, t227);
			append(section5, p43);
			append(p43, t228);
			append(p43, code30);
			append(code30, t229);
			append(p43, t230);
			append(p43, code31);
			append(code31, t231);
			append(p43, t232);
			insert(target, t233, anchor);
			insert(target, section6, anchor);
			append(section6, h25);
			append(h25, a26);
			append(a26, t234);
			append(section6, t235);
			append(section6, p44);
			append(p44, t236);
			append(p44, a27);
			append(a27, t237);
			append(p44, t238);
			append(section6, t239);
			append(section6, p45);
			append(p45, t240);
			append(p45, a28);
			append(a28, t241);
			append(p45, t242);
			append(p45, a29);
			append(a29, t243);
			append(p45, t244);
			append(section6, t245);
			append(section6, p46);
			append(p46, t246);
			append(section6, t247);
			append(section6, p47);
			append(p47, t248);
			append(p47, a30);
			append(a30, t249);
			append(p47, t250);
			append(p47, strong5);
			append(strong5, t251);
			append(p47, t252);
			append(p47, code32);
			append(code32, t253);
			append(p47, t254);
			append(p47, code33);
			append(code33, t255);
			append(p47, t256);
			append(p47, code34);
			append(code34, t257);
			append(p47, t258);
			append(p47, code35);
			append(code35, t259);
			append(p47, t260);
			append(section6, t261);
			append(section6, p48);
			append(p48, t262);
			append(p48, a31);
			append(a31, t263);
			append(p48, t264);
			append(p48, em3);
			append(em3, t265);
			append(p48, t266);
			append(section6, t267);
			append(section6, p49);
			append(p49, t268);
			append(p49, a32);
			append(a32, t269);
			append(p49, t270);
			append(section6, t271);
			append(section6, p50);
			append(p50, t272);
			append(section6, t273);
			append(section6, ul3);
			append(ul3, li13);
			append(li13, a33);
			append(a33, code36);
			append(code36, t274);
			append(a33, t275);
			append(a33, code37);
			append(code37, t276);
			append(ul3, t277);
			append(ul3, li14);
			append(li14, a34);
			append(a34, t278);
			append(a34, code38);
			append(code38, t279);
			append(ul3, t280);
			append(ul3, li15);
			append(li15, a35);
			append(a35, t281);
			append(a35, code39);
			append(code39, t282);
			append(a35, t283);
			insert(target, t284, anchor);
			insert(target, section7, anchor);
			append(section7, h26);
			append(h26, a36);
			append(a36, t285);
			append(section7, t286);
			append(section7, p51);
			append(p51, del1);
			append(del1, t287);
			append(section7, t288);
			append(section7, p52);
			append(p52, del2);
			append(del2, t289);
			append(section7, t290);
			append(section7, p53);
			append(p53, t291);
			append(p53, a37);
			append(a37, t292);
			append(p53, t293);
			append(section7, t294);
			append(section7, blockquote4);
			append(blockquote4, p54);
			append(p54, t295);
			append(section7, t296);
			append(section7, p55);
			append(p55, t297);
			append(section7, t298);
			append(section7, ul4);
			append(ul4, li16);
			append(li16, a38);
			append(a38, t299);
			append(ul4, t300);
			append(ul4, li17);
			append(li17, a39);
			append(a39, t301);
			append(ul4, t302);
			append(ul4, li18);
			append(li18, a40);
			append(a40, t303);
			append(ul4, t304);
			append(ul4, li19);
			append(li19, a41);
			append(a41, t305);
			append(ul4, t306);
			append(ul4, li20);
			append(li20, a42);
			append(a42, t307);
			append(ul4, t308);
			append(ul4, li21);
			append(li21, a43);
			append(a43, t309);
			append(ul4, t310);
			append(ul4, li22);
			append(li22, a44);
			append(a44, t311);
		},
		p: noop,
		d(detaching) {
			if (detaching) detach(section0);
			if (detaching) detach(t7);
			if (detaching) detach(section1);
			if (detaching) detach(t27);
			if (detaching) detach(section2);
			if (detaching) detach(t107);
			if (detaching) detach(section3);
			if (detaching) detach(t123);
			if (detaching) detach(section4);
			if (detaching) detach(t176);
			if (detaching) detach(section5);
			if (detaching) detach(t233);
			if (detaching) detach(section6);
			if (detaching) detach(t284);
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
	"title": "Parsing error when calling generic function with type arguments",
	"date": "2019-04-23T08:00:00Z",
	"lastUpdated": "2019-04-27T08:00:00Z",
	"description": "😱",
	"slug": "parsing-error-flow-type-parameter-instantiation",
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
