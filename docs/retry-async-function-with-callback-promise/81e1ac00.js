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

var __build_img__0 = "25ca4aff5059749c.png";

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

var image = "https://lihautan.com/retry-async-function-with-callback-promise/assets/hero-twitter-3c52317b.jpg";

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
					"@id": "https%3A%2F%2Flihautan.com%2Fretry-async-function-with-callback-promise",
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
			attr(meta11, "content", "https%3A%2F%2Flihautan.com%2Fretry-async-function-with-callback-promise");
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

/* content/blog/retry-async-function-with-callback-promise/@@page-markup.svelte generated by Svelte v3.24.0 */

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
	let t5;
	let p0;
	let t6;
	let t7;
	let p1;
	let t8;
	let t9;
	let p2;
	let t10;
	let t11;
	let section1;
	let h20;
	let a5;
	let t12;
	let t13;
	let p3;
	let t14;
	let a6;
	let t15;
	let t16;
	let t17;
	let ul1;
	let li5;
	let t18;
	let t19;
	let li6;
	let t20;
	let t21;
	let pre0;

	let raw0_value = `<code class="language-js"><span class="token keyword">function</span> <span class="token function">callback</span><span class="token punctuation">(</span><span class="token parameter">error<span class="token punctuation">,</span> result</span><span class="token punctuation">)</span> <span class="token punctuation">&#123;</span>
  <span class="token comment">// ...</span>
<span class="token punctuation">&#125;</span></code>` + "";

	let t22;
	let p4;
	let t23;
	let code0;
	let t24;
	let t25;
	let code1;
	let t26;
	let t27;
	let code2;
	let t28;
	let t29;
	let t30;
	let pre1;

	let raw1_value = `<code class="language-js"><span class="token keyword">function</span> <span class="token function">retry</span><span class="token punctuation">(</span><span class="token parameter">fn<span class="token punctuation">,</span> cb</span><span class="token punctuation">)</span> <span class="token punctuation">&#123;</span>
  <span class="token comment">//</span>
<span class="token punctuation">&#125;</span></code>` + "";

	let t31;
	let p5;
	let t32;
	let code3;
	let t33;
	let t34;
	let t35;
	let pre2;

	let raw2_value = `<code class="language-js"><span class="token keyword">function</span> <span class="token function">retry</span><span class="token punctuation">(</span><span class="token parameter">fn<span class="token punctuation">,</span> cb</span><span class="token punctuation">)</span> <span class="token punctuation">&#123;</span>
  <span class="token comment">// highlight-start</span>
  <span class="token function">fn</span><span class="token punctuation">(</span><span class="token keyword">function</span><span class="token punctuation">(</span><span class="token parameter">error<span class="token punctuation">,</span> data</span><span class="token punctuation">)</span> <span class="token punctuation">&#123;</span>
    <span class="token comment">//</span>
  <span class="token punctuation">&#125;</span><span class="token punctuation">)</span><span class="token punctuation">;</span>
  <span class="token comment">// highlight-end</span>
<span class="token punctuation">&#125;</span></code>` + "";

	let t36;
	let p6;
	let t37;
	let code4;
	let t38;
	let t39;
	let t40;
	let pre3;

	let raw3_value = `<code class="language-js"><span class="token keyword">function</span> <span class="token function">retry</span><span class="token punctuation">(</span><span class="token parameter">fn<span class="token punctuation">,</span> cb</span><span class="token punctuation">)</span> <span class="token punctuation">&#123;</span>
  <span class="token function">fn</span><span class="token punctuation">(</span><span class="token keyword">function</span><span class="token punctuation">(</span><span class="token parameter">error<span class="token punctuation">,</span> data</span><span class="token punctuation">)</span> <span class="token punctuation">&#123;</span>
    <span class="token comment">// highlight-start</span>
    <span class="token keyword">if</span> <span class="token punctuation">(</span><span class="token operator">!</span>error<span class="token punctuation">)</span> <span class="token punctuation">&#123;</span>
      <span class="token function">cb</span><span class="token punctuation">(</span><span class="token keyword">null</span><span class="token punctuation">,</span> data<span class="token punctuation">)</span><span class="token punctuation">;</span>
    <span class="token punctuation">&#125;</span> <span class="token keyword">else</span> <span class="token punctuation">&#123;</span>
      <span class="token function">fn</span><span class="token punctuation">(</span><span class="token keyword">function</span><span class="token punctuation">(</span><span class="token parameter">error<span class="token punctuation">,</span> data</span><span class="token punctuation">)</span> <span class="token punctuation">&#123;</span>
        <span class="token comment">//</span>
      <span class="token punctuation">&#125;</span><span class="token punctuation">)</span><span class="token punctuation">;</span>
    <span class="token punctuation">&#125;</span>
    <span class="token comment">// highlight-end</span>
  <span class="token punctuation">&#125;</span><span class="token punctuation">)</span><span class="token punctuation">;</span>
<span class="token punctuation">&#125;</span></code>` + "";

	let t41;
	let p7;
	let t42;
	let t43;
	let pre4;

	let raw4_value = `<code class="language-js"><span class="token keyword">function</span> <span class="token function">retry</span><span class="token punctuation">(</span><span class="token parameter">fn<span class="token punctuation">,</span> cb</span><span class="token punctuation">)</span> <span class="token punctuation">&#123;</span>
  <span class="token comment">// 1st attempt</span>
  <span class="token function">fn</span><span class="token punctuation">(</span><span class="token keyword">function</span><span class="token punctuation">(</span><span class="token parameter">error<span class="token punctuation">,</span> data</span><span class="token punctuation">)</span> <span class="token punctuation">&#123;</span>
    <span class="token keyword">if</span> <span class="token punctuation">(</span><span class="token operator">!</span>error<span class="token punctuation">)</span> <span class="token punctuation">&#123;</span>
      <span class="token function">cb</span><span class="token punctuation">(</span><span class="token keyword">null</span><span class="token punctuation">,</span> data<span class="token punctuation">)</span><span class="token punctuation">;</span>
    <span class="token punctuation">&#125;</span> <span class="token keyword">else</span> <span class="token punctuation">&#123;</span>
      <span class="token comment">// 2nd attempt</span>
      <span class="token function">fn</span><span class="token punctuation">(</span><span class="token keyword">function</span><span class="token punctuation">(</span><span class="token parameter">error<span class="token punctuation">,</span> data</span><span class="token punctuation">)</span> <span class="token punctuation">&#123;</span>
        <span class="token keyword">if</span> <span class="token punctuation">(</span><span class="token operator">!</span>error<span class="token punctuation">)</span> <span class="token punctuation">&#123;</span>
          <span class="token function">cb</span><span class="token punctuation">(</span><span class="token keyword">null</span><span class="token punctuation">,</span> data<span class="token punctuation">)</span><span class="token punctuation">;</span>
        <span class="token punctuation">&#125;</span> <span class="token keyword">else</span> <span class="token punctuation">&#123;</span>
          <span class="token comment">// 3rd attempt</span>
          <span class="token function">fn</span><span class="token punctuation">(</span><span class="token keyword">function</span><span class="token punctuation">(</span><span class="token parameter">error<span class="token punctuation">,</span> data</span><span class="token punctuation">)</span> <span class="token punctuation">&#123;</span>
            <span class="token keyword">if</span> <span class="token punctuation">(</span><span class="token operator">!</span>error<span class="token punctuation">)</span> <span class="token punctuation">&#123;</span>
              <span class="token function">cb</span><span class="token punctuation">(</span><span class="token keyword">null</span><span class="token punctuation">,</span> data<span class="token punctuation">)</span><span class="token punctuation">;</span>
            <span class="token punctuation">&#125;</span> <span class="token keyword">else</span> <span class="token punctuation">&#123;</span>
              <span class="token comment">// failed for 3 times</span>
              <span class="token function">cb</span><span class="token punctuation">(</span><span class="token keyword">new</span> <span class="token class-name">Error</span><span class="token punctuation">(</span><span class="token string">'Failed retrying 3 times'</span><span class="token punctuation">)</span><span class="token punctuation">)</span><span class="token punctuation">;</span>
            <span class="token punctuation">&#125;</span>
          <span class="token punctuation">&#125;</span><span class="token punctuation">)</span><span class="token punctuation">;</span>
        <span class="token punctuation">&#125;</span>
      <span class="token punctuation">&#125;</span><span class="token punctuation">)</span><span class="token punctuation">;</span>
    <span class="token punctuation">&#125;</span>
  <span class="token punctuation">&#125;</span><span class="token punctuation">)</span><span class="token punctuation">;</span>
<span class="token punctuation">&#125;</span></code>` + "";

	let t44;
	let p8;
	let t45;
	let code5;
	let t46;
	let t47;
	let t48;
	let p9;
	let t49;
	let a7;
	let t50;
	let t51;
	let t52;
	let p10;
	let t53;
	let t54;
	let pre5;

	let raw5_value = `<code class="language-js"><span class="token keyword">function</span> <span class="token function">retry</span><span class="token punctuation">(</span><span class="token parameter">fn<span class="token punctuation">,</span> cb</span><span class="token punctuation">)</span> <span class="token punctuation">&#123;</span>
  <span class="token comment">// 1st attempt</span>
  <span class="token function">fn</span><span class="token punctuation">(</span><span class="token keyword">function</span><span class="token punctuation">(</span><span class="token parameter">error<span class="token punctuation">,</span> data</span><span class="token punctuation">)</span> <span class="token punctuation">&#123;</span>
    <span class="token keyword">if</span> <span class="token punctuation">(</span>error<span class="token punctuation">)</span> <span class="token punctuation">&#123;</span>
      <span class="token comment">// 2nd attempt</span>
      <span class="token function">fn</span><span class="token punctuation">(</span><span class="token keyword">function</span><span class="token punctuation">(</span><span class="token parameter">error<span class="token punctuation">,</span> data</span><span class="token punctuation">)</span> <span class="token punctuation">&#123;</span>
        <span class="token keyword">if</span> <span class="token punctuation">(</span>error<span class="token punctuation">)</span> <span class="token punctuation">&#123;</span>
          <span class="token comment">// 3rd attempt</span>
          <span class="token function">fn</span><span class="token punctuation">(</span><span class="token keyword">function</span><span class="token punctuation">(</span><span class="token parameter">error<span class="token punctuation">,</span> data</span><span class="token punctuation">)</span> <span class="token punctuation">&#123;</span>
            <span class="token keyword">if</span> <span class="token punctuation">(</span>error<span class="token punctuation">)</span> <span class="token punctuation">&#123;</span>
              <span class="token comment">// failed for 3 times</span>
              <span class="token function">cb</span><span class="token punctuation">(</span><span class="token keyword">new</span> <span class="token class-name">Error</span><span class="token punctuation">(</span><span class="token string">'Failed retrying 3 times'</span><span class="token punctuation">)</span><span class="token punctuation">)</span><span class="token punctuation">;</span>
            <span class="token punctuation">&#125;</span> <span class="token keyword">else</span> <span class="token punctuation">&#123;</span>
              <span class="token function">cb</span><span class="token punctuation">(</span><span class="token keyword">null</span><span class="token punctuation">,</span> data<span class="token punctuation">)</span><span class="token punctuation">;</span>
            <span class="token punctuation">&#125;</span>
          <span class="token punctuation">&#125;</span><span class="token punctuation">)</span><span class="token punctuation">;</span>
        <span class="token punctuation">&#125;</span> <span class="token keyword">else</span> <span class="token punctuation">&#123;</span>
          <span class="token function">cb</span><span class="token punctuation">(</span><span class="token keyword">null</span><span class="token punctuation">,</span> data<span class="token punctuation">)</span><span class="token punctuation">;</span>
        <span class="token punctuation">&#125;</span>
      <span class="token punctuation">&#125;</span><span class="token punctuation">)</span><span class="token punctuation">;</span>
    <span class="token punctuation">&#125;</span> <span class="token keyword">else</span> <span class="token punctuation">&#123;</span>
      <span class="token function">cb</span><span class="token punctuation">(</span><span class="token keyword">null</span><span class="token punctuation">,</span> data<span class="token punctuation">)</span><span class="token punctuation">;</span>
    <span class="token punctuation">&#125;</span>
  <span class="token punctuation">&#125;</span><span class="token punctuation">)</span><span class="token punctuation">;</span>
<span class="token punctuation">&#125;</span></code>` + "";

	let t55;
	let p11;
	let t56;
	let code6;
	let t57;
	let t58;
	let t59;
	let p12;
	let t60;
	let code7;
	let t61;
	let t62;
	let t63;
	let p13;
	let t64;
	let code8;
	let t65;
	let t66;
	let t67;
	let pre6;

	let raw6_value = `<code class="language-js"><span class="token keyword">function</span> <span class="token function">retry</span><span class="token punctuation">(</span><span class="token parameter">fn<span class="token punctuation">,</span> n<span class="token punctuation">,</span> cb</span><span class="token punctuation">)</span> <span class="token punctuation">&#123;</span>
  <span class="token comment">// highlight-next-line</span>
  <span class="token keyword">let</span> attempt <span class="token operator">=</span> <span class="token number">0</span><span class="token punctuation">;</span> <span class="token comment">// 1st attempt</span>
  <span class="token function">fn</span><span class="token punctuation">(</span><span class="token keyword">function</span><span class="token punctuation">(</span><span class="token parameter">error<span class="token punctuation">,</span> data</span><span class="token punctuation">)</span> <span class="token punctuation">&#123;</span>
    <span class="token keyword">if</span> <span class="token punctuation">(</span><span class="token operator">!</span>error<span class="token punctuation">)</span> <span class="token punctuation">&#123;</span>
      <span class="token function">cb</span><span class="token punctuation">(</span><span class="token keyword">null</span><span class="token punctuation">,</span> data<span class="token punctuation">)</span><span class="token punctuation">;</span>
    <span class="token punctuation">&#125;</span> <span class="token keyword">else</span> <span class="token punctuation">&#123;</span>
      <span class="token comment">// highlight-start</span>
      <span class="token keyword">if</span> <span class="token punctuation">(</span>attempt<span class="token operator">++</span> <span class="token operator">===</span> n<span class="token punctuation">)</span> <span class="token punctuation">&#123;</span>
        <span class="token function">cb</span><span class="token punctuation">(</span><span class="token keyword">new</span> <span class="token class-name">Error</span><span class="token punctuation">(</span><span class="token template-string"><span class="token template-punctuation string">&#96;</span><span class="token string">Failed retrying </span><span class="token interpolation"><span class="token interpolation-punctuation punctuation">$&#123;</span>n<span class="token interpolation-punctuation punctuation">&#125;</span></span><span class="token string"> times</span><span class="token template-punctuation string">&#96;</span></span><span class="token punctuation">)</span><span class="token punctuation">)</span><span class="token punctuation">;</span>
      <span class="token punctuation">&#125;</span> <span class="token keyword">else</span> <span class="token punctuation">&#123;</span>
        <span class="token comment">// highlight-end</span>
        <span class="token comment">// 2nd attempt</span>
        <span class="token function">fn</span><span class="token punctuation">(</span><span class="token keyword">function</span><span class="token punctuation">(</span><span class="token parameter">error<span class="token punctuation">,</span> data</span><span class="token punctuation">)</span> <span class="token punctuation">&#123;</span>
          <span class="token keyword">if</span> <span class="token punctuation">(</span><span class="token operator">!</span>error<span class="token punctuation">)</span> <span class="token punctuation">&#123;</span>
            <span class="token function">cb</span><span class="token punctuation">(</span><span class="token keyword">null</span><span class="token punctuation">,</span> data<span class="token punctuation">)</span><span class="token punctuation">;</span>
          <span class="token punctuation">&#125;</span> <span class="token keyword">else</span> <span class="token punctuation">&#123;</span>
            <span class="token comment">// highlight-start</span>
            <span class="token keyword">if</span> <span class="token punctuation">(</span>attempt<span class="token operator">++</span> <span class="token operator">===</span> n<span class="token punctuation">)</span> <span class="token punctuation">&#123;</span>
              <span class="token function">cb</span><span class="token punctuation">(</span><span class="token keyword">new</span> <span class="token class-name">Error</span><span class="token punctuation">(</span><span class="token template-string"><span class="token template-punctuation string">&#96;</span><span class="token string">Failed retrying </span><span class="token interpolation"><span class="token interpolation-punctuation punctuation">$&#123;</span>n<span class="token interpolation-punctuation punctuation">&#125;</span></span><span class="token string"> times</span><span class="token template-punctuation string">&#96;</span></span><span class="token punctuation">)</span><span class="token punctuation">)</span><span class="token punctuation">;</span>
            <span class="token punctuation">&#125;</span> <span class="token keyword">else</span> <span class="token punctuation">&#123;</span>
              <span class="token comment">// highlight-end</span>
              <span class="token function">fn</span><span class="token punctuation">(</span><span class="token comment">/* this goes forever ...*/</span><span class="token punctuation">)</span><span class="token punctuation">;</span>
            <span class="token punctuation">&#125;</span>
          <span class="token punctuation">&#125;</span>
        <span class="token punctuation">&#125;</span><span class="token punctuation">)</span><span class="token punctuation">;</span>
      <span class="token punctuation">&#125;</span>
    <span class="token punctuation">&#125;</span>
  <span class="token punctuation">&#125;</span><span class="token punctuation">)</span><span class="token punctuation">;</span>
<span class="token punctuation">&#125;</span></code>` + "";

	let t68;
	let p14;
	let t69;
	let code9;
	let t70;
	let t71;
	let t72;
	let p15;
	let t73;
	let t74;
	let p16;
	let img;
	let img_src_value;
	let t75;
	let p17;
	let t76;
	let t77;
	let p18;
	let t78;
	let t79;
	let pre7;

	let raw7_value = `<code class="language-js"><span class="token keyword">function</span> <span class="token function">retry</span><span class="token punctuation">(</span><span class="token parameter">fn<span class="token punctuation">,</span> n<span class="token punctuation">,</span> cb</span><span class="token punctuation">)</span> <span class="token punctuation">&#123;</span>
  <span class="token keyword">let</span> attempt <span class="token operator">=</span> <span class="token number">0</span><span class="token punctuation">;</span>

  <span class="token comment">// highlight-start</span>
  <span class="token keyword">function</span> <span class="token function">_retry</span><span class="token punctuation">(</span><span class="token punctuation">)</span> <span class="token punctuation">&#123;</span>
    <span class="token function">fn</span><span class="token punctuation">(</span><span class="token keyword">function</span><span class="token punctuation">(</span><span class="token parameter">error<span class="token punctuation">,</span> data</span><span class="token punctuation">)</span> <span class="token punctuation">&#123;</span>
      <span class="token keyword">if</span> <span class="token punctuation">(</span><span class="token operator">!</span>error<span class="token punctuation">)</span> <span class="token punctuation">&#123;</span>
        <span class="token function">cb</span><span class="token punctuation">(</span><span class="token keyword">null</span><span class="token punctuation">,</span> data<span class="token punctuation">)</span><span class="token punctuation">;</span>
      <span class="token punctuation">&#125;</span> <span class="token keyword">else</span> <span class="token punctuation">&#123;</span>
        <span class="token keyword">if</span> <span class="token punctuation">(</span>attempt<span class="token operator">++</span> <span class="token operator">===</span> n<span class="token punctuation">)</span> <span class="token punctuation">&#123;</span>
          <span class="token function">cb</span><span class="token punctuation">(</span><span class="token keyword">new</span> <span class="token class-name">Error</span><span class="token punctuation">(</span><span class="token template-string"><span class="token template-punctuation string">&#96;</span><span class="token string">Failed retrying </span><span class="token interpolation"><span class="token interpolation-punctuation punctuation">$&#123;</span>n<span class="token interpolation-punctuation punctuation">&#125;</span></span><span class="token string"> times</span><span class="token template-punctuation string">&#96;</span></span><span class="token punctuation">)</span><span class="token punctuation">)</span><span class="token punctuation">;</span>
        <span class="token punctuation">&#125;</span> <span class="token keyword">else</span> <span class="token punctuation">&#123;</span>
          <span class="token function">_retry</span><span class="token punctuation">(</span><span class="token punctuation">)</span><span class="token punctuation">;</span>
        <span class="token punctuation">&#125;</span>
      <span class="token punctuation">&#125;</span>
    <span class="token punctuation">&#125;</span><span class="token punctuation">)</span><span class="token punctuation">;</span>
  <span class="token punctuation">&#125;</span>

  <span class="token function">_retry</span><span class="token punctuation">(</span><span class="token punctuation">)</span><span class="token punctuation">;</span>
  <span class="token comment">// highlight-end</span>
<span class="token punctuation">&#125;</span></code>` + "";

	let t80;
	let p19;
	let t81;
	let t82;
	let p20;
	let t83;
	let t84;
	let section2;
	let h21;
	let a8;
	let t85;
	let t86;
	let p21;
	let t87;
	let a9;
	let t88;
	let t89;
	let t90;
	let p22;
	let t91;
	let code10;
	let t92;
	let t93;
	let code11;
	let t94;
	let t95;
	let code12;
	let t96;
	let t97;
	let code13;
	let t98;
	let t99;
	let t100;
	let pre8;

	let raw8_value = `<code class="language-js"><span class="token function">getPromiseA</span><span class="token punctuation">(</span><span class="token punctuation">)</span> <span class="token comment">// a promise</span>
  <span class="token punctuation">.</span><span class="token function">then</span><span class="token punctuation">(</span>handleA<span class="token punctuation">)</span> <span class="token comment">// returns a new promise</span>
  <span class="token punctuation">.</span><span class="token function">then</span><span class="token punctuation">(</span>handleB<span class="token punctuation">)</span><span class="token punctuation">;</span> <span class="token comment">// returns another new promise</span>

<span class="token function">getPromiseB</span><span class="token punctuation">(</span><span class="token punctuation">)</span> <span class="token comment">// a promise</span>
  <span class="token punctuation">.</span><span class="token function">catch</span><span class="token punctuation">(</span>handleA<span class="token punctuation">)</span> <span class="token comment">// returns a new promise</span>
  <span class="token punctuation">.</span><span class="token function">catch</span><span class="token punctuation">(</span>handleB<span class="token punctuation">)</span><span class="token punctuation">;</span> <span class="token comment">// returns another new promise</span></code>` + "";

	let t101;
	let p23;
	let t102;
	let code14;
	let t103;
	let t104;
	let code15;
	let t105;
	let t106;
	let a10;
	let t107;
	let t108;
	let t109;
	let p24;
	let t110;
	let code16;
	let t111;
	let t112;
	let code17;
	let t113;
	let t114;
	let t115;
	let pre9;

	let raw9_value = `<code class="language-js"><span class="token keyword">function</span> <span class="token function">retry</span><span class="token punctuation">(</span><span class="token parameter">fn</span><span class="token punctuation">)</span> <span class="token punctuation">&#123;</span>
  <span class="token comment">//</span>
<span class="token punctuation">&#125;</span></code>` + "";

	let t116;
	let p25;
	let t117;
	let code18;
	let t118;
	let t119;
	let t120;
	let pre10;

	let raw10_value = `<code class="language-js"><span class="token keyword">function</span> <span class="token function">retry</span><span class="token punctuation">(</span><span class="token parameter">fn</span><span class="token punctuation">)</span> <span class="token punctuation">&#123;</span>
  <span class="token comment">// highlight-next-line</span>
  <span class="token function">fn</span><span class="token punctuation">(</span><span class="token punctuation">)</span><span class="token punctuation">;</span> <span class="token comment">// returns a promise</span>
<span class="token punctuation">&#125;</span></code>` + "";

	let t121;
	let p26;
	let t122;
	let code19;
	let t123;
	let t124;
	let code20;
	let t125;
	let t126;
	let t127;
	let pre11;

	let raw11_value = `<code class="language-js"><span class="token keyword">function</span> <span class="token function">retry</span><span class="token punctuation">(</span><span class="token parameter">fn</span><span class="token punctuation">)</span> <span class="token punctuation">&#123;</span>
  <span class="token function">fn</span><span class="token punctuation">(</span><span class="token punctuation">)</span> <span class="token comment">// returns a promise</span>
    <span class="token comment">// highlight-next-line</span>
    <span class="token punctuation">.</span><span class="token function">catch</span><span class="token punctuation">(</span><span class="token punctuation">(</span><span class="token punctuation">)</span> <span class="token operator">=></span> <span class="token function">fn</span><span class="token punctuation">(</span><span class="token punctuation">)</span><span class="token punctuation">)</span><span class="token punctuation">;</span> <span class="token comment">// returns a new promise</span>
<span class="token punctuation">&#125;</span></code>` + "";

	let t128;
	let p27;
	let t129;
	let code21;
	let t130;
	let t131;
	let t132;
	let pre12;

	let raw12_value = `<code class="language-js"><span class="token keyword">function</span> <span class="token function">retry</span><span class="token punctuation">(</span><span class="token parameter">fn</span><span class="token punctuation">)</span> <span class="token punctuation">&#123;</span>
  <span class="token function">fn</span><span class="token punctuation">(</span><span class="token punctuation">)</span> <span class="token comment">// returns a promise (promise#1)</span>
    <span class="token punctuation">.</span><span class="token function">catch</span><span class="token punctuation">(</span><span class="token punctuation">(</span><span class="token punctuation">)</span> <span class="token operator">=></span> <span class="token function">fn</span><span class="token punctuation">(</span><span class="token punctuation">)</span><span class="token punctuation">)</span> <span class="token comment">// returns a new promise (promise#2)</span>
    <span class="token comment">// highlight-next-line</span>
    <span class="token punctuation">.</span><span class="token function">catch</span><span class="token punctuation">(</span><span class="token punctuation">(</span><span class="token punctuation">)</span> <span class="token operator">=></span> <span class="token function">fn</span><span class="token punctuation">(</span><span class="token punctuation">)</span><span class="token punctuation">)</span><span class="token punctuation">;</span> <span class="token comment">// returns yet a new promise (promise#3)</span>
<span class="token punctuation">&#125;</span></code>` + "";

	let t133;
	let p28;
	let t134;
	let em;
	let t135;
	let t136;
	let code22;
	let t137;
	let t138;
	let code23;
	let t139;
	let t140;
	let t141;
	let p29;
	let t142;
	let code24;
	let t143;
	let t144;
	let code25;
	let t145;
	let t146;
	let t147;
	let p30;
	let t148;
	let code26;
	let t149;
	let t150;
	let code27;
	let t151;
	let t152;
	let t153;
	let pre13;

	let raw13_value = `<code class="language-js"><span class="token keyword">function</span> <span class="token function">retry</span><span class="token punctuation">(</span><span class="token parameter">fn</span><span class="token punctuation">)</span> <span class="token punctuation">&#123;</span>
  <span class="token keyword">const</span> promise3 <span class="token operator">=</span> <span class="token function">fn</span><span class="token punctuation">(</span><span class="token punctuation">)</span> <span class="token comment">// returns a promise (promise#1)</span>
    <span class="token punctuation">.</span><span class="token function">catch</span><span class="token punctuation">(</span><span class="token punctuation">(</span><span class="token punctuation">)</span> <span class="token operator">=></span> <span class="token function">fn</span><span class="token punctuation">(</span><span class="token punctuation">)</span><span class="token punctuation">)</span> <span class="token comment">// returns a new promise (promise#2)</span>
    <span class="token punctuation">.</span><span class="token function">catch</span><span class="token punctuation">(</span><span class="token punctuation">(</span><span class="token punctuation">)</span> <span class="token operator">=></span> <span class="token function">fn</span><span class="token punctuation">(</span><span class="token punctuation">)</span><span class="token punctuation">)</span><span class="token punctuation">;</span> <span class="token comment">// returns yet a new promise (promise#3)</span>

  <span class="token keyword">return</span> promise3<span class="token punctuation">.</span><span class="token function">then</span><span class="token punctuation">(</span>
    <span class="token parameter">data</span> <span class="token operator">=></span> data<span class="token punctuation">,</span> <span class="token comment">// resolved with the result from &#96;fn()&#96;</span>
    <span class="token punctuation">(</span><span class="token punctuation">)</span> <span class="token operator">=></span> <span class="token punctuation">&#123;</span>
      <span class="token comment">// reject with the max retry error</span>
      <span class="token keyword">throw</span> <span class="token keyword">new</span> <span class="token class-name">Error</span><span class="token punctuation">(</span><span class="token string">'Failed retrying 3 times'</span><span class="token punctuation">)</span><span class="token punctuation">;</span>
    <span class="token punctuation">&#125;</span>
  <span class="token punctuation">)</span><span class="token punctuation">;</span>
<span class="token punctuation">&#125;</span></code>` + "";

	let t154;
	let p31;
	let t155;
	let t156;
	let pre14;

	let raw14_value = `<code class="language-js">promise3<span class="token punctuation">.</span><span class="token function">then</span><span class="token punctuation">(</span>
  <span class="token parameter">data</span> <span class="token operator">=></span> data<span class="token punctuation">,</span> <span class="token comment">// resolved with the result from &#96;fn()&#96;</span>
  <span class="token punctuation">(</span><span class="token punctuation">)</span> <span class="token operator">=></span> <span class="token punctuation">&#123;</span>
    <span class="token comment">// reject with the max retry error</span>
    <span class="token keyword">throw</span> <span class="token keyword">new</span> <span class="token class-name">Error</span><span class="token punctuation">(</span><span class="token string">'Failed retrying 3 times'</span><span class="token punctuation">)</span><span class="token punctuation">;</span>
  <span class="token punctuation">&#125;</span>
<span class="token punctuation">)</span><span class="token punctuation">;</span>
<span class="token comment">// is equivalent to</span>
promise3 <span class="token comment">// resolved with the result from &#96;fn()&#96;</span>
  <span class="token punctuation">.</span><span class="token function">catch</span><span class="token punctuation">(</span><span class="token punctuation">(</span><span class="token punctuation">)</span> <span class="token operator">=></span> <span class="token punctuation">&#123;</span>
    <span class="token comment">// reject with the max retry error</span>
    <span class="token keyword">throw</span> <span class="token keyword">new</span> <span class="token class-name">Error</span><span class="token punctuation">(</span><span class="token string">'Failed retrying 3 times'</span><span class="token punctuation">)</span><span class="token punctuation">;</span>
  <span class="token punctuation">&#125;</span><span class="token punctuation">)</span><span class="token punctuation">;</span></code>` + "";

	let t157;
	let p32;
	let t158;
	let code28;
	let t159;
	let t160;
	let t161;
	let pre15;

	let raw15_value = `<code class="language-js"><span class="token comment">// prettier-ignore</span>
<span class="token keyword">function</span> <span class="token function">retry</span><span class="token punctuation">(</span><span class="token parameter">fn</span><span class="token punctuation">)</span> <span class="token punctuation">&#123;</span>
  <span class="token comment">// highlight-start</span>
  <span class="token keyword">return</span> <span class="token function">fn</span><span class="token punctuation">(</span><span class="token punctuation">)</span> <span class="token comment">// returns a promise (promise#1)</span>
    <span class="token punctuation">.</span><span class="token function">catch</span><span class="token punctuation">(</span><span class="token punctuation">(</span><span class="token punctuation">)</span> <span class="token operator">=></span> <span class="token function">fn</span><span class="token punctuation">(</span><span class="token punctuation">)</span><span class="token punctuation">)</span> <span class="token comment">// returns a new promise (promise#2)</span>
    <span class="token punctuation">.</span><span class="token function">catch</span><span class="token punctuation">(</span><span class="token punctuation">(</span><span class="token punctuation">)</span> <span class="token operator">=></span> <span class="token function">fn</span><span class="token punctuation">(</span><span class="token punctuation">)</span><span class="token punctuation">)</span> <span class="token comment">// returns yet a new promise (promise#3)</span>
    <span class="token comment">// highlight-end</span>
    <span class="token punctuation">.</span><span class="token function">catch</span><span class="token punctuation">(</span><span class="token punctuation">(</span><span class="token punctuation">)</span> <span class="token operator">=></span> <span class="token punctuation">&#123;</span>
      <span class="token comment">// reject with the max retry error</span>
      <span class="token keyword">throw</span> <span class="token keyword">new</span> <span class="token class-name">Error</span><span class="token punctuation">(</span><span class="token string">'Failed retrying 3 times'</span><span class="token punctuation">)</span><span class="token punctuation">;</span>
    <span class="token punctuation">&#125;</span><span class="token punctuation">)</span><span class="token punctuation">;</span>
<span class="token punctuation">&#125;</span></code>` + "";

	let t162;
	let p33;
	let t163;
	let code29;
	let t164;
	let t165;
	let t166;
	let p34;
	let t167;
	let code30;
	let t168;
	let t169;
	let t170;
	let pre16;

	let raw16_value = `<code class="language-js"><span class="token comment">// prettier-ignore</span>
<span class="token keyword">function</span> <span class="token function">retry</span><span class="token punctuation">(</span><span class="token parameter">fn<span class="token punctuation">,</span> n</span><span class="token punctuation">)</span> <span class="token punctuation">&#123;</span>
  <span class="token keyword">return</span> <span class="token function">fn</span><span class="token punctuation">(</span><span class="token punctuation">)</span> <span class="token comment">// attempt #1</span>
    <span class="token punctuation">.</span><span class="token function">catch</span><span class="token punctuation">(</span><span class="token punctuation">(</span><span class="token punctuation">)</span> <span class="token operator">=></span> <span class="token function">fn</span><span class="token punctuation">(</span><span class="token punctuation">)</span><span class="token punctuation">)</span> <span class="token comment">// attempt #2</span>
    <span class="token comment">// ...</span>
    <span class="token punctuation">.</span><span class="token function">catch</span><span class="token punctuation">(</span><span class="token punctuation">(</span><span class="token punctuation">)</span> <span class="token operator">=></span> <span class="token function">fn</span><span class="token punctuation">(</span><span class="token punctuation">)</span><span class="token punctuation">)</span> <span class="token comment">// attempt #n</span>
    <span class="token punctuation">.</span><span class="token function">catch</span><span class="token punctuation">(</span><span class="token punctuation">(</span><span class="token punctuation">)</span> <span class="token operator">=></span> <span class="token punctuation">&#123;</span> <span class="token keyword">throw</span> <span class="token keyword">new</span> <span class="token class-name">Error</span><span class="token punctuation">(</span><span class="token template-string"><span class="token template-punctuation string">&#96;</span><span class="token string">Failed retrying </span><span class="token interpolation"><span class="token interpolation-punctuation punctuation">$&#123;</span>n<span class="token interpolation-punctuation punctuation">&#125;</span></span><span class="token string"> times</span><span class="token template-punctuation string">&#96;</span></span><span class="token punctuation">)</span><span class="token punctuation">;</span> <span class="token punctuation">&#125;</span><span class="token punctuation">)</span><span class="token punctuation">;</span>
<span class="token punctuation">&#125;</span></code>` + "";

	let t171;
	let p35;
	let t172;
	let code31;
	let t173;
	let t174;
	let code32;
	let t175;
	let t176;
	let t177;
	let p36;
	let strong;
	let t178;
	let code33;
	let t179;
	let t180;
	let t181;
	let pre17;

	let raw17_value = `<code class="language-js"><span class="token keyword">function</span> <span class="token function">retry</span><span class="token punctuation">(</span><span class="token parameter">fn<span class="token punctuation">,</span> n</span><span class="token punctuation">)</span> <span class="token punctuation">&#123;</span>
  <span class="token keyword">let</span> promise <span class="token operator">=</span> <span class="token function">fn</span><span class="token punctuation">(</span><span class="token punctuation">)</span><span class="token punctuation">;</span>
  <span class="token keyword">for</span> <span class="token punctuation">(</span><span class="token keyword">let</span> i <span class="token operator">=</span> <span class="token number">1</span><span class="token punctuation">;</span> i <span class="token operator">&lt;</span> n<span class="token punctuation">;</span> i<span class="token operator">++</span><span class="token punctuation">)</span> <span class="token punctuation">&#123;</span>
    promise <span class="token operator">=</span> promise<span class="token punctuation">.</span><span class="token function">catch</span><span class="token punctuation">(</span><span class="token punctuation">(</span><span class="token punctuation">)</span> <span class="token operator">=></span> <span class="token function">fn</span><span class="token punctuation">(</span><span class="token punctuation">)</span><span class="token punctuation">)</span><span class="token punctuation">;</span>
  <span class="token punctuation">&#125;</span>
  promise<span class="token punctuation">.</span><span class="token function">catch</span><span class="token punctuation">(</span><span class="token punctuation">(</span><span class="token punctuation">)</span> <span class="token operator">=></span> <span class="token punctuation">&#123;</span>
    <span class="token keyword">throw</span> <span class="token keyword">new</span> <span class="token class-name">Error</span><span class="token punctuation">(</span><span class="token template-string"><span class="token template-punctuation string">&#96;</span><span class="token string">Failed retrying </span><span class="token interpolation"><span class="token interpolation-punctuation punctuation">$&#123;</span>n<span class="token interpolation-punctuation punctuation">&#125;</span></span><span class="token string"> times</span><span class="token template-punctuation string">&#96;</span></span><span class="token punctuation">)</span><span class="token punctuation">;</span>
  <span class="token punctuation">&#125;</span><span class="token punctuation">)</span><span class="token punctuation">;</span>
  <span class="token keyword">return</span> promise<span class="token punctuation">;</span>
<span class="token punctuation">&#125;</span></code>` + "";

	let t182;
	let p37;
	let t183;
	let code34;
	let t184;
	let t185;
	let code35;
	let t186;
	let t187;
	let code36;
	let t188;
	let t189;
	let t190;
	let pre18;

	let raw18_value = `<code class="language-js"><span class="token keyword">function</span> <span class="token function">retry</span><span class="token punctuation">(</span><span class="token parameter">fn<span class="token punctuation">,</span> n</span><span class="token punctuation">)</span> <span class="token punctuation">&#123;</span>
  <span class="token keyword">let</span> promise<span class="token punctuation">;</span>
  <span class="token keyword">for</span> <span class="token punctuation">(</span><span class="token keyword">let</span> i <span class="token operator">=</span> <span class="token number">0</span><span class="token punctuation">;</span> i <span class="token operator">&lt;</span> n<span class="token punctuation">;</span> i<span class="token operator">++</span><span class="token punctuation">)</span> <span class="token punctuation">&#123;</span>
    <span class="token comment">// highlight-start</span>
    <span class="token keyword">if</span> <span class="token punctuation">(</span><span class="token operator">!</span>promise<span class="token punctuation">)</span> promise <span class="token operator">=</span> <span class="token function">fn</span><span class="token punctuation">(</span><span class="token punctuation">)</span><span class="token punctuation">;</span>
    <span class="token keyword">else</span> promise <span class="token operator">=</span> promise<span class="token punctuation">.</span><span class="token function">catch</span><span class="token punctuation">(</span><span class="token punctuation">(</span><span class="token punctuation">)</span> <span class="token operator">=></span> <span class="token function">fn</span><span class="token punctuation">(</span><span class="token punctuation">)</span><span class="token punctuation">)</span><span class="token punctuation">;</span>
    <span class="token comment">// highlight-end</span>
  <span class="token punctuation">&#125;</span>
  promise<span class="token punctuation">.</span><span class="token function">catch</span><span class="token punctuation">(</span><span class="token punctuation">(</span><span class="token punctuation">)</span> <span class="token operator">=></span> <span class="token punctuation">&#123;</span>
    <span class="token keyword">throw</span> <span class="token keyword">new</span> <span class="token class-name">Error</span><span class="token punctuation">(</span><span class="token template-string"><span class="token template-punctuation string">&#96;</span><span class="token string">Failed retrying </span><span class="token interpolation"><span class="token interpolation-punctuation punctuation">$&#123;</span>n<span class="token interpolation-punctuation punctuation">&#125;</span></span><span class="token string"> times</span><span class="token template-punctuation string">&#96;</span></span><span class="token punctuation">)</span><span class="token punctuation">;</span>
  <span class="token punctuation">&#125;</span><span class="token punctuation">)</span><span class="token punctuation">;</span>
  <span class="token keyword">return</span> promise<span class="token punctuation">;</span>
<span class="token punctuation">&#125;</span></code>` + "";

	let t191;
	let p38;
	let t192;
	let code37;
	let t193;
	let t194;
	let code38;
	let t195;
	let t196;
	let t197;
	let pre19;

	let raw19_value = `<code class="language-js"><span class="token keyword">function</span> <span class="token function">retry</span><span class="token punctuation">(</span><span class="token parameter">fn<span class="token punctuation">,</span> n</span><span class="token punctuation">)</span> <span class="token punctuation">&#123;</span>
  <span class="token comment">// highlight-next-line</span>
  <span class="token keyword">let</span> promise <span class="token operator">=</span> Promise<span class="token punctuation">.</span><span class="token function">reject</span><span class="token punctuation">(</span><span class="token punctuation">)</span><span class="token punctuation">;</span>
  <span class="token keyword">for</span> <span class="token punctuation">(</span><span class="token keyword">let</span> i <span class="token operator">=</span> <span class="token number">0</span><span class="token punctuation">;</span> i <span class="token operator">&lt;</span> n<span class="token punctuation">;</span> i<span class="token operator">++</span><span class="token punctuation">)</span> <span class="token punctuation">&#123;</span>
    <span class="token comment">// highlight-next-line</span>
    promise <span class="token operator">=</span> promise<span class="token punctuation">.</span><span class="token function">catch</span><span class="token punctuation">(</span><span class="token punctuation">(</span><span class="token punctuation">)</span> <span class="token operator">=></span> <span class="token function">fn</span><span class="token punctuation">(</span><span class="token punctuation">)</span><span class="token punctuation">)</span><span class="token punctuation">;</span>
  <span class="token punctuation">&#125;</span>
  promise<span class="token punctuation">.</span><span class="token function">catch</span><span class="token punctuation">(</span><span class="token punctuation">(</span><span class="token punctuation">)</span> <span class="token operator">=></span> <span class="token punctuation">&#123;</span>
    <span class="token keyword">throw</span> <span class="token keyword">new</span> <span class="token class-name">Error</span><span class="token punctuation">(</span><span class="token template-string"><span class="token template-punctuation string">&#96;</span><span class="token string">Failed retrying </span><span class="token interpolation"><span class="token interpolation-punctuation punctuation">$&#123;</span>n<span class="token interpolation-punctuation punctuation">&#125;</span></span><span class="token string"> times</span><span class="token template-punctuation string">&#96;</span></span><span class="token punctuation">)</span><span class="token punctuation">;</span>
  <span class="token punctuation">&#125;</span><span class="token punctuation">)</span><span class="token punctuation">;</span>
  <span class="token keyword">return</span> promise<span class="token punctuation">;</span>
<span class="token punctuation">&#125;</span></code>` + "";

	let t198;
	let p39;
	let t199;
	let t200;
	let section3;
	let h22;
	let a11;
	let t201;
	let t202;
	let p40;
	let t203;
	let code39;
	let t204;
	let t205;
	let t206;
	let p41;
	let t207;
	let t208;
	let pre20;

	let raw20_value = `<code class="language-js"><span class="token keyword">let</span> value<span class="token punctuation">;</span>
promise<span class="token punctuation">.</span><span class="token function">then</span><span class="token punctuation">(</span><span class="token parameter">data</span> <span class="token operator">=></span> <span class="token punctuation">&#123;</span>
  value <span class="token operator">=</span> data<span class="token punctuation">;</span>
  console<span class="token punctuation">.</span><span class="token function">log</span><span class="token punctuation">(</span><span class="token string">'resolved'</span><span class="token punctuation">,</span> value<span class="token punctuation">)</span><span class="token punctuation">;</span>
<span class="token punctuation">&#125;</span><span class="token punctuation">)</span><span class="token punctuation">;</span>
console<span class="token punctuation">.</span><span class="token function">log</span><span class="token punctuation">(</span><span class="token string">'here'</span><span class="token punctuation">,</span> value<span class="token punctuation">)</span><span class="token punctuation">;</span></code>` + "";

	let t209;
	let p42;
	let t210;
	let t211;
	let pre21;
	let raw21_value = `<code class="language-js"><span class="token string">"here"</span> <span class="token keyword">undefined</span></code>` + "";
	let t212;
	let p43;
	let t213;
	let t214;
	let pre22;
	let raw22_value = `<code class="language-js"><span class="token string">"resolved"</span> <span class="token string">"value"</span></code>` + "";
	let t215;
	let p44;
	let t216;
	let code40;
	let t217;
	let t218;
	let t219;
	let p45;
	let t220;
	let code41;
	let t221;
	let t222;
	let code42;
	let t223;
	let t224;
	let t225;
	let p46;
	let t226;
	let code43;
	let t227;
	let t228;
	let t229;
	let p47;
	let t230;
	let code44;
	let t231;
	let t232;
	let t233;
	let pre23;

	let raw23_value = `<code class="language-js"><span class="token keyword">function</span> <span class="token function">foo</span><span class="token punctuation">(</span><span class="token punctuation">)</span> <span class="token punctuation">&#123;</span>
  <span class="token comment">// timeline #1</span>
  promise
    <span class="token punctuation">.</span><span class="token function">then</span><span class="token punctuation">(</span><span class="token parameter">data</span> <span class="token operator">=></span> <span class="token punctuation">&#123;</span>
      <span class="token comment">// timeline #2</span>
      <span class="token keyword">return</span> <span class="token function">doSomething</span><span class="token punctuation">(</span>data<span class="token punctuation">)</span><span class="token punctuation">;</span>
    <span class="token punctuation">&#125;</span><span class="token punctuation">)</span>
    <span class="token punctuation">.</span><span class="token function">then</span><span class="token punctuation">(</span><span class="token parameter">data2</span> <span class="token operator">=></span> <span class="token punctuation">&#123;</span>
      <span class="token comment">// timeline #3</span>
      <span class="token function">doAnotherThing</span><span class="token punctuation">(</span>data2<span class="token punctuation">)</span><span class="token punctuation">;</span>
    <span class="token punctuation">&#125;</span><span class="token punctuation">)</span><span class="token punctuation">;</span>
  <span class="token comment">// timeline #1</span>
<span class="token punctuation">&#125;</span></code>` + "";

	let t234;
	let p48;
	let t235;
	let code45;
	let t236;
	let t237;
	let code46;
	let t238;
	let t239;
	let t240;
	let pre24;

	let raw24_value = `<code class="language-js"><span class="token keyword">async</span> <span class="token keyword">function</span> <span class="token function">foo</span><span class="token punctuation">(</span><span class="token punctuation">)</span> <span class="token punctuation">&#123;</span>
  <span class="token comment">// timeline #1</span>
  <span class="token keyword">let</span> data <span class="token operator">=</span> <span class="token keyword">await</span> promise<span class="token punctuation">;</span>
  <span class="token comment">// timeline #2</span>
  <span class="token keyword">let</span> data2 <span class="token operator">=</span> <span class="token keyword">await</span> <span class="token function">doSomething</span><span class="token punctuation">(</span>data<span class="token punctuation">)</span><span class="token punctuation">;</span>
  <span class="token comment">// timeline #3</span>
  <span class="token function">doAnotherThing</span><span class="token punctuation">(</span>data2<span class="token punctuation">)</span><span class="token punctuation">;</span>
<span class="token punctuation">&#125;</span></code>` + "";

	let t241;
	let p49;
	let t242;
	let code47;
	let t243;
	let t244;
	let code48;
	let t245;
	let t246;
	let code49;
	let t247;
	let t248;
	let t249;
	let pre25;

	let raw25_value = `<code class="language-js"><span class="token keyword">async</span> <span class="token keyword">function</span> <span class="token function">retry</span><span class="token punctuation">(</span><span class="token parameter">fn</span><span class="token punctuation">)</span> <span class="token punctuation">&#123;</span>
  <span class="token comment">//</span>
<span class="token punctuation">&#125;</span></code>` + "";

	let t250;
	let p50;
	let t251;
	let code50;
	let t252;
	let t253;
	let t254;
	let pre26;

	let raw26_value = `<code class="language-js"><span class="token keyword">async</span> <span class="token keyword">function</span> <span class="token function">retry</span><span class="token punctuation">(</span><span class="token parameter">fn</span><span class="token punctuation">)</span> <span class="token punctuation">&#123;</span>
  <span class="token comment">// highlight-next-line</span>
  <span class="token function">fn</span><span class="token punctuation">(</span><span class="token punctuation">)</span><span class="token punctuation">;</span> <span class="token comment">// returns a promise</span>
<span class="token punctuation">&#125;</span></code>` + "";

	let t255;
	let p51;
	let t256;
	let code51;
	let t257;
	let t258;
	let code52;
	let t259;
	let t260;
	let code53;
	let t261;
	let t262;
	let code54;
	let t263;
	let t264;
	let code55;
	let t265;
	let t266;
	let pre27;

	let raw27_value = `<code class="language-js"><span class="token keyword">async</span> <span class="token keyword">function</span> <span class="token function">retry</span><span class="token punctuation">(</span><span class="token parameter">fn</span><span class="token punctuation">)</span> <span class="token punctuation">&#123;</span>
  <span class="token comment">// highlight-next-line</span>
  <span class="token keyword">try</span> <span class="token punctuation">&#123;</span>
    <span class="token keyword">await</span> <span class="token function">fn</span><span class="token punctuation">(</span><span class="token punctuation">)</span><span class="token punctuation">;</span>
    <span class="token comment">// highlight-start</span>
  <span class="token punctuation">&#125;</span> <span class="token keyword">catch</span> <span class="token punctuation">&#123;</span>
    <span class="token function">fn</span><span class="token punctuation">(</span><span class="token punctuation">)</span><span class="token punctuation">;</span>
  <span class="token punctuation">&#125;</span>
  <span class="token comment">// highlight-end</span>
<span class="token punctuation">&#125;</span></code>` + "";

	let t267;
	let p52;
	let t268;
	let code56;
	let t269;
	let t270;
	let code57;
	let t271;
	let t272;
	let t273;
	let pre28;

	let raw28_value = `<code class="language-js"><span class="token keyword">async</span> <span class="token keyword">function</span> <span class="token function">retry</span><span class="token punctuation">(</span><span class="token parameter">fn</span><span class="token punctuation">)</span> <span class="token punctuation">&#123;</span>
  <span class="token keyword">try</span> <span class="token punctuation">&#123;</span>
    <span class="token keyword">await</span> <span class="token function">fn</span><span class="token punctuation">(</span><span class="token punctuation">)</span><span class="token punctuation">;</span>
  <span class="token punctuation">&#125;</span> <span class="token keyword">catch</span> <span class="token punctuation">&#123;</span>
    <span class="token comment">// highlight-start</span>
    <span class="token keyword">try</span> <span class="token punctuation">&#123;</span>
      <span class="token keyword">await</span> <span class="token function">fn</span><span class="token punctuation">(</span><span class="token punctuation">)</span><span class="token punctuation">;</span>
    <span class="token punctuation">&#125;</span> <span class="token keyword">catch</span> <span class="token punctuation">&#123;</span>
      <span class="token function">fn</span><span class="token punctuation">(</span><span class="token punctuation">)</span><span class="token punctuation">;</span>
    <span class="token punctuation">&#125;</span>
    <span class="token comment">// highlight-end</span>
  <span class="token punctuation">&#125;</span>
<span class="token punctuation">&#125;</span></code>` + "";

	let t274;
	let p53;
	let t275;
	let code58;
	let t276;
	let t277;
	let t278;
	let pre29;

	let raw29_value = `<code class="language-js"><span class="token keyword">async</span> <span class="token keyword">function</span> <span class="token function">retry</span><span class="token punctuation">(</span><span class="token parameter">fn</span><span class="token punctuation">)</span> <span class="token punctuation">&#123;</span>
  <span class="token keyword">try</span> <span class="token punctuation">&#123;</span>
    <span class="token keyword">await</span> <span class="token function">fn</span><span class="token punctuation">(</span><span class="token punctuation">)</span><span class="token punctuation">;</span>
  <span class="token punctuation">&#125;</span> <span class="token keyword">catch</span> <span class="token punctuation">&#123;</span>
    <span class="token keyword">try</span> <span class="token punctuation">&#123;</span>
      <span class="token keyword">await</span> <span class="token function">fn</span><span class="token punctuation">(</span><span class="token punctuation">)</span><span class="token punctuation">;</span>
    <span class="token punctuation">&#125;</span> <span class="token keyword">catch</span> <span class="token punctuation">&#123;</span>
      <span class="token keyword">try</span> <span class="token punctuation">&#123;</span>
        <span class="token keyword">await</span> <span class="token function">fn</span><span class="token punctuation">(</span><span class="token punctuation">)</span><span class="token punctuation">;</span>
      <span class="token punctuation">&#125;</span> <span class="token keyword">catch</span> <span class="token punctuation">&#123;</span>
        <span class="token comment">// highlight-next-line</span>
        <span class="token keyword">throw</span> <span class="token keyword">new</span> <span class="token class-name">Error</span><span class="token punctuation">(</span><span class="token string">'Failed retrying 3 times'</span><span class="token punctuation">)</span><span class="token punctuation">;</span>
      <span class="token punctuation">&#125;</span>
    <span class="token punctuation">&#125;</span>
  <span class="token punctuation">&#125;</span>
<span class="token punctuation">&#125;</span></code>` + "";

	let t279;
	let p54;
	let t280;
	let code59;
	let t281;
	let t282;
	let pre30;

	let raw30_value = `<code class="language-js"><span class="token keyword">async</span> <span class="token keyword">function</span> <span class="token function">retry</span><span class="token punctuation">(</span><span class="token parameter">fn</span><span class="token punctuation">)</span> <span class="token punctuation">&#123;</span>
  <span class="token keyword">try</span> <span class="token punctuation">&#123;</span>
    <span class="token comment">// highlight-next-line</span>
    <span class="token keyword">return</span> <span class="token keyword">await</span> <span class="token function">fn</span><span class="token punctuation">(</span><span class="token punctuation">)</span><span class="token punctuation">;</span>
  <span class="token punctuation">&#125;</span> <span class="token keyword">catch</span> <span class="token punctuation">&#123;</span>
    <span class="token keyword">try</span> <span class="token punctuation">&#123;</span>
      <span class="token comment">// highlight-next-line</span>
      <span class="token keyword">return</span> <span class="token keyword">await</span> <span class="token function">fn</span><span class="token punctuation">(</span><span class="token punctuation">)</span><span class="token punctuation">;</span>
    <span class="token punctuation">&#125;</span> <span class="token keyword">catch</span> <span class="token punctuation">&#123;</span>
      <span class="token keyword">try</span> <span class="token punctuation">&#123;</span>
        <span class="token comment">// highlight-next-line</span>
        <span class="token keyword">return</span> <span class="token keyword">await</span> <span class="token function">fn</span><span class="token punctuation">(</span><span class="token punctuation">)</span><span class="token punctuation">;</span>
      <span class="token punctuation">&#125;</span> <span class="token keyword">catch</span> <span class="token punctuation">&#123;</span>
        <span class="token keyword">throw</span> <span class="token keyword">new</span> <span class="token class-name">Error</span><span class="token punctuation">(</span><span class="token string">'Failed retrying 3 times'</span><span class="token punctuation">)</span><span class="token punctuation">;</span>
      <span class="token punctuation">&#125;</span>
    <span class="token punctuation">&#125;</span>
  <span class="token punctuation">&#125;</span>
<span class="token punctuation">&#125;</span></code>` + "";

	let t283;
	let p55;
	let t284;
	let code60;
	let t285;
	let t286;
	let code61;
	let t287;
	let t288;
	let t289;
	let pre31;

	let raw31_value = `<code class="language-js"><span class="token keyword">async</span> <span class="token keyword">function</span> <span class="token function">retry</span><span class="token punctuation">(</span><span class="token parameter">fn</span><span class="token punctuation">)</span> <span class="token punctuation">&#123;</span>
  <span class="token keyword">try</span> <span class="token punctuation">&#123;</span>
    <span class="token keyword">return</span> <span class="token keyword">await</span> <span class="token function">fn</span><span class="token punctuation">(</span><span class="token punctuation">)</span><span class="token punctuation">;</span>
  <span class="token punctuation">&#125;</span> <span class="token keyword">catch</span> <span class="token punctuation">&#123;</span><span class="token punctuation">&#125;</span>

  <span class="token keyword">try</span> <span class="token punctuation">&#123;</span>
    <span class="token keyword">return</span> <span class="token keyword">await</span> <span class="token function">fn</span><span class="token punctuation">(</span><span class="token punctuation">)</span><span class="token punctuation">;</span>
  <span class="token punctuation">&#125;</span> <span class="token keyword">catch</span> <span class="token punctuation">&#123;</span><span class="token punctuation">&#125;</span>

  <span class="token keyword">try</span> <span class="token punctuation">&#123;</span>
    <span class="token keyword">return</span> <span class="token keyword">await</span> <span class="token function">fn</span><span class="token punctuation">(</span><span class="token punctuation">)</span><span class="token punctuation">;</span>
  <span class="token punctuation">&#125;</span> <span class="token keyword">catch</span> <span class="token punctuation">&#123;</span><span class="token punctuation">&#125;</span>

  <span class="token keyword">throw</span> <span class="token keyword">new</span> <span class="token class-name">Error</span><span class="token punctuation">(</span><span class="token string">'Failed retrying 3 times'</span><span class="token punctuation">)</span><span class="token punctuation">;</span>
<span class="token punctuation">&#125;</span></code>` + "";

	let t290;
	let p56;
	let t291;
	let code62;
	let t292;
	let t293;
	let t294;
	let p57;
	let t295;
	let code63;
	let t296;
	let t297;
	let t298;
	let pre32;

	let raw32_value = `<code class="language-js"><span class="token keyword">async</span> <span class="token keyword">function</span> <span class="token function">retry</span><span class="token punctuation">(</span><span class="token parameter">fn<span class="token punctuation">,</span> n</span><span class="token punctuation">)</span> <span class="token punctuation">&#123;</span>
  <span class="token keyword">try</span> <span class="token punctuation">&#123;</span>
    <span class="token keyword">return</span> <span class="token keyword">await</span> <span class="token function">fn</span><span class="token punctuation">(</span><span class="token punctuation">)</span><span class="token punctuation">;</span> <span class="token comment">// 1st attempt</span>
  <span class="token punctuation">&#125;</span> <span class="token keyword">catch</span> <span class="token punctuation">&#123;</span><span class="token punctuation">&#125;</span>

  <span class="token keyword">try</span> <span class="token punctuation">&#123;</span>
    <span class="token keyword">return</span> <span class="token keyword">await</span> <span class="token function">fn</span><span class="token punctuation">(</span><span class="token punctuation">)</span><span class="token punctuation">;</span> <span class="token comment">// 2nd attempt</span>
  <span class="token punctuation">&#125;</span> <span class="token keyword">catch</span> <span class="token punctuation">&#123;</span><span class="token punctuation">&#125;</span>

  <span class="token comment">// ...</span>

  <span class="token keyword">try</span> <span class="token punctuation">&#123;</span>
    <span class="token keyword">return</span> <span class="token keyword">await</span> <span class="token function">fn</span><span class="token punctuation">(</span><span class="token punctuation">)</span><span class="token punctuation">;</span> <span class="token comment">// nth attempt</span>
  <span class="token punctuation">&#125;</span> <span class="token keyword">catch</span> <span class="token punctuation">&#123;</span><span class="token punctuation">&#125;</span>

  <span class="token keyword">throw</span> <span class="token keyword">new</span> <span class="token class-name">Error</span><span class="token punctuation">(</span><span class="token template-string"><span class="token template-punctuation string">&#96;</span><span class="token string">Failed retrying </span><span class="token interpolation"><span class="token interpolation-punctuation punctuation">$&#123;</span>n<span class="token interpolation-punctuation punctuation">&#125;</span></span><span class="token string"> times</span><span class="token template-punctuation string">&#96;</span></span><span class="token punctuation">)</span><span class="token punctuation">;</span>
<span class="token punctuation">&#125;</span></code>` + "";

	let t299;
	let p58;
	let t300;
	let code64;
	let t301;
	let t302;
	let code65;
	let t303;
	let t304;
	let t305;
	let pre33;

	let raw33_value = `<code class="language-js"><span class="token keyword">async</span> <span class="token keyword">function</span> <span class="token function">retry</span><span class="token punctuation">(</span><span class="token parameter">fn<span class="token punctuation">,</span> n</span><span class="token punctuation">)</span> <span class="token punctuation">&#123;</span>
  <span class="token keyword">for</span> <span class="token punctuation">(</span><span class="token keyword">let</span> i <span class="token operator">=</span> <span class="token number">0</span><span class="token punctuation">;</span> i <span class="token operator">&lt;</span> n<span class="token punctuation">;</span> i<span class="token operator">++</span><span class="token punctuation">)</span> <span class="token punctuation">&#123;</span>
    <span class="token keyword">try</span> <span class="token punctuation">&#123;</span>
      <span class="token keyword">return</span> <span class="token keyword">await</span> <span class="token function">fn</span><span class="token punctuation">(</span><span class="token punctuation">)</span><span class="token punctuation">;</span>
    <span class="token punctuation">&#125;</span> <span class="token keyword">catch</span> <span class="token punctuation">&#123;</span><span class="token punctuation">&#125;</span>
  <span class="token punctuation">&#125;</span>

  <span class="token keyword">throw</span> <span class="token keyword">new</span> <span class="token class-name">Error</span><span class="token punctuation">(</span><span class="token template-string"><span class="token template-punctuation string">&#96;</span><span class="token string">Failed retrying </span><span class="token interpolation"><span class="token interpolation-punctuation punctuation">$&#123;</span>n<span class="token interpolation-punctuation punctuation">&#125;</span></span><span class="token string"> times</span><span class="token template-punctuation string">&#96;</span></span><span class="token punctuation">)</span><span class="token punctuation">;</span>
<span class="token punctuation">&#125;</span></code>` + "";

	let t306;
	let p59;
	let t307;
	let code66;
	let t308;
	let t309;
	let code67;
	let t310;
	let t311;
	let t312;
	let section4;
	let h23;
	let a12;
	let t313;
	let t314;
	let p60;
	let t315;
	let code68;
	let t316;
	let t317;
	let code69;
	let t318;
	let t319;
	let t320;
	let p61;
	let t321;
	let t322;
	let ul6;
	let li9;
	let code70;
	let t323;
	let t324;
	let ul2;
	let li7;
	let t325;
	let code71;
	let t326;
	let t327;
	let t328;
	let li8;
	let t329;
	let t330;
	let li12;
	let code72;
	let t331;
	let t332;
	let ul3;
	let li10;
	let t333;
	let code73;
	let t334;
	let t335;
	let t336;
	let li11;
	let t337;
	let t338;
	let li15;
	let code74;
	let t339;
	let t340;
	let ul4;
	let li13;
	let t341;
	let code75;
	let t342;
	let t343;
	let t344;
	let li14;
	let t345;
	let t346;
	let li18;
	let code76;
	let t347;
	let t348;
	let ul5;
	let li16;
	let t349;
	let code77;
	let t350;
	let t351;
	let t352;
	let li17;
	let t353;
	let t354;
	let p62;
	let t355;
	let code78;
	let t356;
	let t357;
	let t358;
	let p63;
	let t359;
	let t360;
	let pre34;

	let raw34_value = `<code class="language-js"><span class="token keyword">function</span> <span class="token function">mockFnFactory</span><span class="token punctuation">(</span><span class="token punctuation">)</span> <span class="token punctuation">&#123;</span>
  <span class="token keyword">return</span> <span class="token keyword">function</span><span class="token punctuation">(</span><span class="token punctuation">)</span> <span class="token punctuation">&#123;</span><span class="token punctuation">&#125;</span><span class="token punctuation">;</span>
<span class="token punctuation">&#125;</span></code>` + "";

	let t361;
	let p64;
	let t362;
	let t363;
	let pre35;

	let raw35_value = `<code class="language-js"><span class="token comment">// highlight-next-line</span>
<span class="token keyword">function</span> <span class="token function">mockFnFactory</span><span class="token punctuation">(</span><span class="token parameter">numFailure</span><span class="token punctuation">)</span> <span class="token punctuation">&#123;</span>
  <span class="token keyword">return</span> <span class="token keyword">function</span><span class="token punctuation">(</span><span class="token punctuation">)</span> <span class="token punctuation">&#123;</span><span class="token punctuation">&#125;</span><span class="token punctuation">;</span>
<span class="token punctuation">&#125;</span></code>` + "";

	let t364;
	let p65;
	let t365;
	let t366;
	let pre36;

	let raw36_value = `<code class="language-js"><span class="token keyword">function</span> <span class="token function">mockFnFactory</span><span class="token punctuation">(</span><span class="token parameter">numFailure</span><span class="token punctuation">)</span> <span class="token punctuation">&#123;</span>
  <span class="token comment">// highlight-next-line</span>
  <span class="token keyword">let</span> numCalls <span class="token operator">=</span> <span class="token number">0</span><span class="token punctuation">;</span>
  <span class="token keyword">return</span> <span class="token keyword">function</span><span class="token punctuation">(</span><span class="token punctuation">)</span> <span class="token punctuation">&#123;</span>
    <span class="token comment">// highlight-next-line</span>
    numCalls<span class="token operator">++</span><span class="token punctuation">;</span>
  <span class="token punctuation">&#125;</span><span class="token punctuation">;</span>
<span class="token punctuation">&#125;</span></code>` + "";

	let t367;
	let p66;
	let t368;
	let t369;
	let pre37;

	let raw37_value = `<code class="language-js"><span class="token comment">// calback version</span>
<span class="token keyword">function</span> <span class="token function">mockFnFactory</span><span class="token punctuation">(</span><span class="token parameter">numFailure</span><span class="token punctuation">)</span> <span class="token punctuation">&#123;</span>
  <span class="token keyword">let</span> numCalls <span class="token operator">=</span> <span class="token number">0</span><span class="token punctuation">;</span>
  <span class="token keyword">return</span> <span class="token keyword">function</span><span class="token punctuation">(</span><span class="token parameter">callback</span><span class="token punctuation">)</span> <span class="token punctuation">&#123;</span>
    numCalls<span class="token operator">++</span><span class="token punctuation">;</span>
    <span class="token keyword">if</span> <span class="token punctuation">(</span>numCalls <span class="token operator">&lt;=</span> numFailure<span class="token punctuation">)</span> <span class="token punctuation">&#123;</span>
      <span class="token function">callback</span><span class="token punctuation">(</span><span class="token keyword">new</span> <span class="token class-name">Error</span><span class="token punctuation">(</span><span class="token punctuation">)</span><span class="token punctuation">)</span><span class="token punctuation">;</span>
    <span class="token punctuation">&#125;</span> <span class="token keyword">else</span> <span class="token punctuation">&#123;</span>
      <span class="token function">callback</span><span class="token punctuation">(</span><span class="token keyword">null</span><span class="token punctuation">,</span> numCalls<span class="token punctuation">)</span><span class="token punctuation">;</span>
    <span class="token punctuation">&#125;</span>
  <span class="token punctuation">&#125;</span><span class="token punctuation">;</span>
<span class="token punctuation">&#125;</span>

<span class="token comment">// promise version</span>
<span class="token keyword">function</span> <span class="token function">mockFnFactory</span><span class="token punctuation">(</span><span class="token parameter">numFailure</span><span class="token punctuation">)</span> <span class="token punctuation">&#123;</span>
  <span class="token keyword">let</span> numCalls <span class="token operator">=</span> <span class="token number">0</span><span class="token punctuation">;</span>
  <span class="token keyword">return</span> <span class="token keyword">function</span><span class="token punctuation">(</span><span class="token parameter">callback</span><span class="token punctuation">)</span> <span class="token punctuation">&#123;</span>
    numCalls<span class="token operator">++</span><span class="token punctuation">;</span>
    <span class="token keyword">if</span> <span class="token punctuation">(</span>numCalls <span class="token operator">&lt;=</span> numFailure<span class="token punctuation">)</span> <span class="token punctuation">&#123;</span>
      <span class="token keyword">return</span> Promise<span class="token punctuation">.</span><span class="token function">reject</span><span class="token punctuation">(</span><span class="token keyword">new</span> <span class="token class-name">Error</span><span class="token punctuation">(</span><span class="token punctuation">)</span><span class="token punctuation">)</span><span class="token punctuation">;</span>
    <span class="token punctuation">&#125;</span> <span class="token keyword">else</span> <span class="token punctuation">&#123;</span>
      <span class="token keyword">return</span> Promise<span class="token punctuation">.</span><span class="token function">resolve</span><span class="token punctuation">(</span>numCalls<span class="token punctuation">)</span><span class="token punctuation">;</span>
    <span class="token punctuation">&#125;</span>
  <span class="token punctuation">&#125;</span><span class="token punctuation">;</span>
<span class="token punctuation">&#125;</span></code>` + "";

	let t370;
	let p67;
	let t371;
	let t372;
	let pre38;

	let raw38_value = `<code class="language-js"><span class="token keyword">function</span> <span class="token function">spy</span><span class="token punctuation">(</span><span class="token parameter">fn</span><span class="token punctuation">)</span> <span class="token punctuation">&#123;</span>
  <span class="token keyword">let</span> numCalled <span class="token operator">=</span> <span class="token number">0</span><span class="token punctuation">;</span>
  <span class="token keyword">return</span> <span class="token punctuation">&#123;</span>
    <span class="token function-variable function">fn</span><span class="token punctuation">:</span> <span class="token keyword">function</span><span class="token punctuation">(</span><span class="token parameter"><span class="token operator">...</span>args</span><span class="token punctuation">)</span> <span class="token punctuation">&#123;</span>
      numCalled<span class="token operator">++</span><span class="token punctuation">;</span>
      <span class="token keyword">return</span> <span class="token function">fn</span><span class="token punctuation">(</span><span class="token operator">...</span>args<span class="token punctuation">)</span><span class="token punctuation">;</span>
    <span class="token punctuation">&#125;</span><span class="token punctuation">,</span>
    <span class="token function">getNumberOfTimesCalled</span><span class="token punctuation">(</span><span class="token punctuation">)</span> <span class="token punctuation">&#123;</span>
      <span class="token keyword">return</span> numCalled<span class="token punctuation">;</span>
    <span class="token punctuation">&#125;</span><span class="token punctuation">,</span>
  <span class="token punctuation">&#125;</span><span class="token punctuation">;</span>
<span class="token punctuation">&#125;</span></code>` + "";

	let t373;
	let p68;
	let t374;
	let t375;
	let pre39;

	let raw39_value = `<code class="language-js"><span class="token function">describe</span><span class="token punctuation">(</span><span class="token string">'&#96;fn&#96; failed on 1st attempt, and succeed thereafter (callback based)'</span><span class="token punctuation">,</span> <span class="token punctuation">(</span><span class="token punctuation">)</span> <span class="token operator">=></span> <span class="token punctuation">&#123;</span>
  <span class="token keyword">const</span> fn <span class="token operator">=</span> <span class="token function">mockFnFactory</span><span class="token punctuation">(</span><span class="token number">1</span><span class="token punctuation">)</span><span class="token punctuation">;</span>
  <span class="token keyword">const</span> spied <span class="token operator">=</span> <span class="token function">spy</span><span class="token punctuation">(</span>fn<span class="token punctuation">)</span><span class="token punctuation">;</span>

  <span class="token comment">// retry at most 3 times</span>
  <span class="token function">retry</span><span class="token punctuation">(</span>spied<span class="token punctuation">.</span>fn<span class="token punctuation">,</span> <span class="token number">3</span><span class="token punctuation">,</span> <span class="token punctuation">(</span><span class="token parameter">error<span class="token punctuation">,</span> data</span><span class="token punctuation">)</span> <span class="token operator">=></span> <span class="token punctuation">&#123;</span>
    <span class="token comment">// verify &#96;fn&#96; get called only 2 times</span>
    <span class="token function">assert</span><span class="token punctuation">(</span>spied<span class="token punctuation">.</span><span class="token function">getNumberOfTimesCalled</span><span class="token punctuation">(</span><span class="token punctuation">)</span> <span class="token operator">===</span> <span class="token number">2</span><span class="token punctuation">)</span><span class="token punctuation">;</span>

    <span class="token comment">// verify we get the return value from the 2nd attempt</span>
    <span class="token function">assert</span><span class="token punctuation">(</span>data <span class="token operator">===</span> <span class="token number">2</span><span class="token punctuation">)</span><span class="token punctuation">;</span>
  <span class="token punctuation">&#125;</span><span class="token punctuation">)</span><span class="token punctuation">;</span>
<span class="token punctuation">&#125;</span><span class="token punctuation">)</span><span class="token punctuation">;</span>

<span class="token function">describe</span><span class="token punctuation">(</span><span class="token string">'&#96;fn&#96; failed on 1st attempt, and succeed thereafter (promise based)'</span><span class="token punctuation">,</span> <span class="token punctuation">(</span><span class="token punctuation">)</span> <span class="token operator">=></span> <span class="token punctuation">&#123;</span>
  <span class="token keyword">const</span> fn <span class="token operator">=</span> <span class="token function">mockFnFactory</span><span class="token punctuation">(</span><span class="token number">1</span><span class="token punctuation">)</span><span class="token punctuation">;</span>
  <span class="token keyword">const</span> spied <span class="token operator">=</span> <span class="token function">spy</span><span class="token punctuation">(</span>fn<span class="token punctuation">)</span><span class="token punctuation">;</span>

  <span class="token comment">// retry at most 3 times</span>
  <span class="token function">retry</span><span class="token punctuation">(</span>spied<span class="token punctuation">.</span>fn<span class="token punctuation">,</span> <span class="token number">3</span><span class="token punctuation">)</span><span class="token punctuation">.</span><span class="token function">then</span><span class="token punctuation">(</span>
    <span class="token parameter">data</span> <span class="token operator">=></span> <span class="token punctuation">&#123;</span>
      <span class="token comment">// verify &#96;fn&#96; get called only 2 times</span>
      <span class="token function">assert</span><span class="token punctuation">(</span>spied<span class="token punctuation">.</span><span class="token function">getNumberOfTimesCalled</span><span class="token punctuation">(</span><span class="token punctuation">)</span> <span class="token operator">===</span> <span class="token number">2</span><span class="token punctuation">)</span><span class="token punctuation">;</span>

      <span class="token comment">// verify we get the return value from the 2nd attempt</span>
      <span class="token function">assert</span><span class="token punctuation">(</span>data <span class="token operator">===</span> <span class="token number">2</span><span class="token punctuation">)</span><span class="token punctuation">;</span>
    <span class="token punctuation">&#125;</span><span class="token punctuation">,</span>
    <span class="token parameter">error</span> <span class="token operator">=></span> <span class="token punctuation">&#123;</span><span class="token punctuation">&#125;</span>
  <span class="token punctuation">)</span><span class="token punctuation">;</span>
<span class="token punctuation">&#125;</span><span class="token punctuation">)</span><span class="token punctuation">;</span></code>` + "";

	let t376;
	let section5;
	let h24;
	let a13;
	let t377;
	let t378;
	let p69;
	let t379;
	let code79;
	let t380;
	let t381;
	let code80;
	let t382;
	let t383;
	let t384;
	let p70;
	let t385;
	let t386;
	let p71;
	let t387;

	return {
		c() {
			section0 = element("section");
			ul0 = element("ul");
			li0 = element("li");
			a0 = element("a");
			t0 = text("The callback pattern");
			li1 = element("li");
			a1 = element("a");
			t1 = text("The promise chain");
			li2 = element("li");
			a2 = element("a");
			t2 = text("Async await");
			li3 = element("li");
			a3 = element("a");
			t3 = text("Testing");
			li4 = element("li");
			a4 = element("a");
			t4 = text("Closing Note");
			t5 = space();
			p0 = element("p");
			t6 = text("JavaScript is a single-threaded programming language, which means only one thing can happen at a time in a single thread.");
			t7 = space();
			p1 = element("p");
			t8 = text("That’s where asynchronous JavaScript comes into play. Using asynchronous JavaScript (such as callbacks, promises, and async/await), you can perform long network requests without blocking the main thread.");
			t9 = space();
			p2 = element("p");
			t10 = text("In this article, I'm going to show how you can retry an asynchronous function in JavaScript, using the callback pattern, promise chain pattern and async await. Also, I'll show you how to write test to verify it works.");
			t11 = space();
			section1 = element("section");
			h20 = element("h2");
			a5 = element("a");
			t12 = text("The callback pattern");
			t13 = space();
			p3 = element("p");
			t14 = text("Let's take a look at retrying asynchronous function that takes in a callback function that follows ");
			a6 = element("a");
			t15 = text("the callback convention");
			t16 = text(":");
			t17 = space();
			ul1 = element("ul");
			li5 = element("li");
			t18 = text("The first argument of the callback function is an error object");
			t19 = space();
			li6 = element("li");
			t20 = text("The second argument contains the callback results.");
			t21 = space();
			pre0 = element("pre");
			t22 = space();
			p4 = element("p");
			t23 = text("So we are going to implement the ");
			code0 = element("code");
			t24 = text("retry");
			t25 = text(" function, that takes in the asynchronous function to retry, ");
			code1 = element("code");
			t26 = text("fn");
			t27 = text(" and a callback function, ");
			code2 = element("code");
			t28 = text("cb");
			t29 = text(", that will be called when the function succeeded or failed after all the retry attempts.");
			t30 = space();
			pre1 = element("pre");
			t31 = space();
			p5 = element("p");
			t32 = text("The first thing we are going to do is to call the function ");
			code3 = element("code");
			t33 = text("fn");
			t34 = text(":");
			t35 = space();
			pre2 = element("pre");
			t36 = space();
			p6 = element("p");
			t37 = text("We check if there's an error, if there's no error, we can call the ");
			code4 = element("code");
			t38 = text("cb");
			t39 = text(" function to indicate the function succeeded. However, if there's an error, we are going to call the function again to retry.");
			t40 = space();
			pre3 = element("pre");
			t41 = space();
			p7 = element("p");
			t42 = text("Let's retry at most 3 times:");
			t43 = space();
			pre4 = element("pre");
			t44 = space();
			p8 = element("p");
			t45 = text("Notice that it starts to get unwieldy as we are nesting more callback functions. It's hard to figure out which close bracket ");
			code5 = element("code");
			t46 = text("}");
			t47 = text(" is belong to without proper indentation.");
			t48 = space();
			p9 = element("p");
			t49 = text("This is the so-called ");
			a7 = element("a");
			t50 = text("\"Callback Hell\"");
			t51 = text(" in JavaScript.");
			t52 = space();
			p10 = element("p");
			t53 = text("Let's make it more unbearable to prove the point by flipping the if case:");
			t54 = space();
			pre5 = element("pre");
			t55 = space();
			p11 = element("p");
			t56 = text("Now can you tell which ");
			code6 = element("code");
			t57 = text("data");
			t58 = text(" is belong to which function?");
			t59 = space();
			p12 = element("p");
			t60 = text("Now, instead of always retry at most 3 times, we are going to retry at most ");
			code7 = element("code");
			t61 = text("n");
			t62 = text(" times.");
			t63 = space();
			p13 = element("p");
			t64 = text("So we are going to introduce a new argument, ");
			code8 = element("code");
			t65 = text("n");
			t66 = text(":");
			t67 = space();
			pre6 = element("pre");
			t68 = space();
			p14 = element("p");
			t69 = text("The function keeps going forever, until it reaches ");
			code9 = element("code");
			t70 = text("n");
			t71 = text(" attempt.");
			t72 = space();
			p15 = element("p");
			t73 = text("If you stare at the code hard enough, you would notice that the code starts to repeat itself:");
			t74 = space();
			p16 = element("p");
			img = element("img");
			t75 = space();
			p17 = element("p");
			t76 = text("Note that the code within the outer red square is the same as the code within the inner red square, which is the same as the inner inner red square ...");
			t77 = space();
			p18 = element("p");
			t78 = text("So, let's extract the code within the red square out into a function and replace the red squares with the function:");
			t79 = space();
			pre7 = element("pre");
			t80 = space();
			p19 = element("p");
			t81 = text("And there you go, retrying an asynchronous function with callback pattern.");
			t82 = space();
			p20 = element("p");
			t83 = text("Does it work? Well, we have to test it to verify it. Stay till the end to see how we are going to write unit test to verify it.");
			t84 = space();
			section2 = element("section");
			h21 = element("h2");
			a8 = element("a");
			t85 = text("The promise chain");
			t86 = space();
			p21 = element("p");
			t87 = text("A ");
			a9 = element("a");
			t88 = text("Promise");
			t89 = text(", according to MDN, object represents the eventual completion of an asynchronous operation, and its resulting value.");
			t90 = space();
			p22 = element("p");
			t91 = text("A Promise object provides ");
			code10 = element("code");
			t92 = text(".then");
			t93 = text(" and ");
			code11 = element("code");
			t94 = text(".catch");
			t95 = text(" method, which takes in callback function to be called when the promise is resolved or rejected respectively. The ");
			code12 = element("code");
			t96 = text(".then");
			t97 = text(" and ");
			code13 = element("code");
			t98 = text(".catch");
			t99 = text(" method then returns a new Promise of the return value of the callback function.");
			t100 = space();
			pre8 = element("pre");
			t101 = space();
			p23 = element("p");
			t102 = text("The chaining of ");
			code14 = element("code");
			t103 = text(".then");
			t104 = text(" and ");
			code15 = element("code");
			t105 = text(".catch");
			t106 = text(" is a common pattern, called ");
			a10 = element("a");
			t107 = text("Promise chaining");
			t108 = text(".");
			t109 = space();
			p24 = element("p");
			t110 = text("Now, lets implement the ");
			code16 = element("code");
			t111 = text("retry");
			t112 = text(" function, which takes in the asynchronous function to retry, ");
			code17 = element("code");
			t113 = text("fn");
			t114 = text(" and return a promise, which resolved when the function succeeded or resolved after failing all the retry attempts.");
			t115 = space();
			pre9 = element("pre");
			t116 = space();
			p25 = element("p");
			t117 = text("The first thing we are going to do is to call the function ");
			code18 = element("code");
			t118 = text("fn");
			t119 = text(":");
			t120 = space();
			pre10 = element("pre");
			t121 = space();
			p26 = element("p");
			t122 = text("We need to retry calling ");
			code19 = element("code");
			t123 = text("fn");
			t124 = text(" again, if the first ");
			code20 = element("code");
			t125 = text("fn");
			t126 = text(" is rejected");
			t127 = space();
			pre11 = element("pre");
			t128 = space();
			p27 = element("p");
			t129 = text("If that new promise rejected again, we retry by calling ");
			code21 = element("code");
			t130 = text("fn");
			t131 = text(" again");
			t132 = space();
			pre12 = element("pre");
			t133 = space();
			p28 = element("p");
			t134 = text("The last promise ");
			em = element("em");
			t135 = text("(promise#3)");
			t136 = text(" will reject if the 3rd ");
			code22 = element("code");
			t137 = text("fn()");
			t138 = text(" attempt rejects, and resolve if any of the ");
			code23 = element("code");
			t139 = text("fn()");
			t140 = text(" attempts resolve.");
			t141 = space();
			p29 = element("p");
			t142 = text("The callback method within ");
			code24 = element("code");
			t143 = text(".catch");
			t144 = text(" will be called only when the previous ");
			code25 = element("code");
			t145 = text("fn()");
			t146 = text(" attempt rejects.");
			t147 = space();
			p30 = element("p");
			t148 = text("We are going to return a rejected promise with the error indicating max retries has met, if the last promise ");
			code26 = element("code");
			t149 = text("(promise#3)");
			t150 = text(" rejected, and a resolved promise with the result from ");
			code27 = element("code");
			t151 = text("fn()");
			t152 = text(".");
			t153 = space();
			pre13 = element("pre");
			t154 = space();
			p31 = element("p");
			t155 = text("And we can make the code more concise, as the following two are equivalent, in terms of what is being resolved and rejected:");
			t156 = space();
			pre14 = element("pre");
			t157 = space();
			p32 = element("p");
			t158 = text("Also, we can substitute the variable ");
			code28 = element("code");
			t159 = text("promise3");
			t160 = text(" with it's promise chain value:");
			t161 = space();
			pre15 = element("pre");
			t162 = space();
			p33 = element("p");
			t163 = text("Now, instead of always retry at most 3 times, we are going to retry at most ");
			code29 = element("code");
			t164 = text("n");
			t165 = text(" times.");
			t166 = space();
			p34 = element("p");
			t167 = text("So we are going to introduce a new argument, ");
			code30 = element("code");
			t168 = text("n");
			t169 = text(":");
			t170 = space();
			pre16 = element("pre");
			t171 = space();
			p35 = element("p");
			t172 = text("Instead of writing ");
			code31 = element("code");
			t173 = text(".catch(() => fn())");
			t174 = space();
			code32 = element("code");
			t175 = text("n");
			t176 = text(" number of times, we can build the Promise up using a for loop.");
			t177 = space();
			p36 = element("p");
			strong = element("strong");
			t178 = text("Assuming ");
			code33 = element("code");
			t179 = text("n");
			t180 = text(" is always greater or equal to 1,");
			t181 = space();
			pre17 = element("pre");
			t182 = space();
			p37 = element("p");
			t183 = text("What if ");
			code34 = element("code");
			t184 = text("n");
			t185 = text(" is ");
			code35 = element("code");
			t186 = text("0");
			t187 = text(" or negative? We shouldn't call ");
			code36 = element("code");
			t188 = text("fn()");
			t189 = text(" at all!");
			t190 = space();
			pre18 = element("pre");
			t191 = space();
			p38 = element("p");
			t192 = text("Well, this maybe a little bit inelegant, having to execute the ");
			code37 = element("code");
			t193 = text("if (!promise) ... else ...");
			t194 = text(" on every loop, we can initialise the promise with a rejected promise, so that we can treat the 1st ");
			code38 = element("code");
			t195 = text("fn()");
			t196 = text(" called as the 1st retry:");
			t197 = space();
			pre19 = element("pre");
			t198 = space();
			p39 = element("p");
			t199 = text("And there you go, retrying an asynchronous function with promise chain.");
			t200 = space();
			section3 = element("section");
			h22 = element("h2");
			a11 = element("a");
			t201 = text("Async await");
			t202 = space();
			p40 = element("p");
			t203 = text("When you use a promise, you need to use ");
			code39 = element("code");
			t204 = text(".then");
			t205 = text(" to get the resolved value, and that happened asynchronously.");
			t206 = space();
			p41 = element("p");
			t207 = text("Meaning, if you have");
			t208 = space();
			pre20 = element("pre");
			t209 = space();
			p42 = element("p");
			t210 = text("You would see");
			t211 = space();
			pre21 = element("pre");
			t212 = space();
			p43 = element("p");
			t213 = text("first, and then some time later,");
			t214 = space();
			pre22 = element("pre");
			t215 = space();
			p44 = element("p");
			t216 = text("This is because the function in the ");
			code40 = element("code");
			t217 = text(".then");
			t218 = text(" is called asynchronously, it is executed in a separate timeline of execution, so to speak.");
			t219 = space();
			p45 = element("p");
			t220 = text("And ");
			code41 = element("code");
			t221 = text("async");
			t222 = text(" + ");
			code42 = element("code");
			t223 = text("await");
			t224 = text(" in JavaScript allow us to stitch multiple separate timeline of execution into disguisedly 1 timeline of execution flow.");
			t225 = space();
			p46 = element("p");
			t226 = text("Everytime when we ");
			code43 = element("code");
			t227 = text("await");
			t228 = text(", we jump into a different asynchronous timeline.");
			t229 = space();
			p47 = element("p");
			t230 = text("So, with the code with Promise + ");
			code44 = element("code");
			t231 = text(".then");
			t232 = text(":");
			t233 = space();
			pre23 = element("pre");
			t234 = space();
			p48 = element("p");
			t235 = text("can be written in ");
			code45 = element("code");
			t236 = text("async");
			t237 = text(" + ");
			code46 = element("code");
			t238 = text("await");
			t239 = text(" in the following manner:");
			t240 = space();
			pre24 = element("pre");
			t241 = space();
			p49 = element("p");
			t242 = text("Now, lets implement the ");
			code47 = element("code");
			t243 = text("retry");
			t244 = text(" function using ");
			code48 = element("code");
			t245 = text("async");
			t246 = text(" + ");
			code49 = element("code");
			t247 = text("await");
			t248 = text(".");
			t249 = space();
			pre25 = element("pre");
			t250 = space();
			p50 = element("p");
			t251 = text("The first thing we are going to do is to call the function ");
			code50 = element("code");
			t252 = text("fn");
			t253 = text(":");
			t254 = space();
			pre26 = element("pre");
			t255 = space();
			p51 = element("p");
			t256 = text("We need to retry calling ");
			code51 = element("code");
			t257 = text("fn");
			t258 = text(" again, if the first ");
			code52 = element("code");
			t259 = text("fn");
			t260 = text(" is rejected. Instead of ");
			code53 = element("code");
			t261 = text(".catch");
			t262 = text(", we use ");
			code54 = element("code");
			t263 = text("await");
			t264 = text(" + ");
			code55 = element("code");
			t265 = text("try catch");
			t266 = space();
			pre27 = element("pre");
			t267 = space();
			p52 = element("p");
			t268 = text("If the 2nd ");
			code56 = element("code");
			t269 = text("fn()");
			t270 = text(" rejected again, we retry by calling ");
			code57 = element("code");
			t271 = text("fn");
			t272 = text(" again");
			t273 = space();
			pre28 = element("pre");
			t274 = space();
			p53 = element("p");
			t275 = text("And if the last ");
			code58 = element("code");
			t276 = text("fn()");
			t277 = text(" rejected again, we are going to return a rejected promise with an error indicating max retries has met by throw the error");
			t278 = space();
			pre29 = element("pre");
			t279 = space();
			p54 = element("p");
			t280 = text("Now, if we need to return a Promise resolved with the resolved value from ");
			code59 = element("code");
			t281 = text("fn()");
			t282 = space();
			pre30 = element("pre");
			t283 = space();
			p55 = element("p");
			t284 = text("Since we are ending early in the ");
			code60 = element("code");
			t285 = text("try");
			t286 = text(" block, and we are not using the error from the ");
			code61 = element("code");
			t287 = text("catch");
			t288 = text(" block, we can make the code less nested");
			t289 = space();
			pre31 = element("pre");
			t290 = space();
			p56 = element("p");
			t291 = text("Now, instead of always retry at most 3 times, we are going to retry at most ");
			code62 = element("code");
			t292 = text("n");
			t293 = text(" times.");
			t294 = space();
			p57 = element("p");
			t295 = text("So we are going to introduce a new argument, ");
			code63 = element("code");
			t296 = text("n");
			t297 = text(":");
			t298 = space();
			pre32 = element("pre");
			t299 = space();
			p58 = element("p");
			t300 = text("Instead of writing it ");
			code64 = element("code");
			t301 = text("n");
			t302 = text(" number of times, we can achieve it using a ");
			code65 = element("code");
			t303 = text("for");
			t304 = text(" loop:");
			t305 = space();
			pre33 = element("pre");
			t306 = space();
			p59 = element("p");
			t307 = text("And there you go, retrying an asynchronous function using ");
			code66 = element("code");
			t308 = text("async");
			t309 = text(" + ");
			code67 = element("code");
			t310 = text("await");
			t311 = text(".");
			t312 = space();
			section4 = element("section");
			h23 = element("h2");
			a12 = element("a");
			t313 = text("Testing");
			t314 = space();
			p60 = element("p");
			t315 = text("To test whether our ");
			code68 = element("code");
			t316 = text("retry");
			t317 = text(" function works, we need to have a max number of retry in mind, say 3. And we need a function, ");
			code69 = element("code");
			t318 = text("fn");
			t319 = text(" that we can control when it succeed and when it failed.");
			t320 = space();
			p61 = element("p");
			t321 = text("So we can have the following test cases:");
			t322 = space();
			ul6 = element("ul");
			li9 = element("li");
			code70 = element("code");
			t323 = text("fn");
			t324 = text(" always succeed;");
			ul2 = element("ul");
			li7 = element("li");
			t325 = text("verify ");
			code71 = element("code");
			t326 = text("fn");
			t327 = text(" get called only 1 time");
			t328 = space();
			li8 = element("li");
			t329 = text("verify we get the return value from the 1st attempt");
			t330 = space();
			li12 = element("li");
			code72 = element("code");
			t331 = text("fn");
			t332 = text(" failed on 1st attempt, and succeed thereafter;");
			ul3 = element("ul");
			li10 = element("li");
			t333 = text("verify ");
			code73 = element("code");
			t334 = text("fn");
			t335 = text(" get called only 2 times");
			t336 = space();
			li11 = element("li");
			t337 = text("verify we get the return value from the 2nd attempt");
			t338 = space();
			li15 = element("li");
			code74 = element("code");
			t339 = text("fn");
			t340 = text(" failed on 1st, 2nd attempt, and succeed thereafter;");
			ul4 = element("ul");
			li13 = element("li");
			t341 = text("verify ");
			code75 = element("code");
			t342 = text("fn");
			t343 = text(" get called only 3 times");
			t344 = space();
			li14 = element("li");
			t345 = text("verify we get the return value from the 3rd attempt");
			t346 = space();
			li18 = element("li");
			code76 = element("code");
			t347 = text("fn");
			t348 = text(" failed on 1st, 2nd, 3rd attempt, and succeed thereafter;");
			ul5 = element("ul");
			li16 = element("li");
			t349 = text("verify ");
			code77 = element("code");
			t350 = text("fn");
			t351 = text(" get called only 3 times");
			t352 = space();
			li17 = element("li");
			t353 = text("verify we get the max retry error");
			t354 = space();
			p62 = element("p");
			t355 = text("So, the key is to devise such ");
			code78 = element("code");
			t356 = text("fn");
			t357 = text(" that we can control when it succeed and when it failed.");
			t358 = space();
			p63 = element("p");
			t359 = text("We can create a function that returns such function");
			t360 = space();
			pre34 = element("pre");
			t361 = space();
			p64 = element("p");
			t362 = text("The function takes in number indicating how many time the return function would fail, before succeeding thereafter");
			t363 = space();
			pre35 = element("pre");
			t364 = space();
			p65 = element("p");
			t365 = text("To know how many times the function is called, we can track it with a variable");
			t366 = space();
			pre36 = element("pre");
			t367 = space();
			p66 = element("p");
			t368 = text("As long as the number of times called is less than the number of time it should fail, it will fail.");
			t369 = space();
			pre37 = element("pre");
			t370 = space();
			p67 = element("p");
			t371 = text("Next, to verify the function get called a certain number of times, we can create a \"spy\" function:");
			t372 = space();
			pre38 = element("pre");
			t373 = space();
			p68 = element("p");
			t374 = text("So, let's put all of them together:");
			t375 = space();
			pre39 = element("pre");
			t376 = space();
			section5 = element("section");
			h24 = element("h2");
			a13 = element("a");
			t377 = text("Closing Note");
			t378 = space();
			p69 = element("p");
			t379 = text("We've seen how we can retry an asynchronous function using the callback pattern, promise chain pattern and ");
			code79 = element("code");
			t380 = text("async");
			t381 = text(" + ");
			code80 = element("code");
			t382 = text("await");
			t383 = text(".");
			t384 = space();
			p70 = element("p");
			t385 = text("Each of the 3 methods is important in its on right, albeit some is more verbose than another.");
			t386 = space();
			p71 = element("p");
			t387 = text("Lastly, we also cover how to write test to verify our code, and also how to create the mock function to facilitate our test cases.");
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
			t0 = claim_text(a0_nodes, "The callback pattern");
			a0_nodes.forEach(detach);
			li0_nodes.forEach(detach);
			li1 = claim_element(ul0_nodes, "LI", {});
			var li1_nodes = children(li1);
			a1 = claim_element(li1_nodes, "A", { href: true });
			var a1_nodes = children(a1);
			t1 = claim_text(a1_nodes, "The promise chain");
			a1_nodes.forEach(detach);
			li1_nodes.forEach(detach);
			li2 = claim_element(ul0_nodes, "LI", {});
			var li2_nodes = children(li2);
			a2 = claim_element(li2_nodes, "A", { href: true });
			var a2_nodes = children(a2);
			t2 = claim_text(a2_nodes, "Async await");
			a2_nodes.forEach(detach);
			li2_nodes.forEach(detach);
			li3 = claim_element(ul0_nodes, "LI", {});
			var li3_nodes = children(li3);
			a3 = claim_element(li3_nodes, "A", { href: true });
			var a3_nodes = children(a3);
			t3 = claim_text(a3_nodes, "Testing");
			a3_nodes.forEach(detach);
			li3_nodes.forEach(detach);
			li4 = claim_element(ul0_nodes, "LI", {});
			var li4_nodes = children(li4);
			a4 = claim_element(li4_nodes, "A", { href: true });
			var a4_nodes = children(a4);
			t4 = claim_text(a4_nodes, "Closing Note");
			a4_nodes.forEach(detach);
			li4_nodes.forEach(detach);
			ul0_nodes.forEach(detach);
			section0_nodes.forEach(detach);
			t5 = claim_space(nodes);
			p0 = claim_element(nodes, "P", {});
			var p0_nodes = children(p0);
			t6 = claim_text(p0_nodes, "JavaScript is a single-threaded programming language, which means only one thing can happen at a time in a single thread.");
			p0_nodes.forEach(detach);
			t7 = claim_space(nodes);
			p1 = claim_element(nodes, "P", {});
			var p1_nodes = children(p1);
			t8 = claim_text(p1_nodes, "That’s where asynchronous JavaScript comes into play. Using asynchronous JavaScript (such as callbacks, promises, and async/await), you can perform long network requests without blocking the main thread.");
			p1_nodes.forEach(detach);
			t9 = claim_space(nodes);
			p2 = claim_element(nodes, "P", {});
			var p2_nodes = children(p2);
			t10 = claim_text(p2_nodes, "In this article, I'm going to show how you can retry an asynchronous function in JavaScript, using the callback pattern, promise chain pattern and async await. Also, I'll show you how to write test to verify it works.");
			p2_nodes.forEach(detach);
			t11 = claim_space(nodes);
			section1 = claim_element(nodes, "SECTION", {});
			var section1_nodes = children(section1);
			h20 = claim_element(section1_nodes, "H2", {});
			var h20_nodes = children(h20);
			a5 = claim_element(h20_nodes, "A", { href: true, id: true });
			var a5_nodes = children(a5);
			t12 = claim_text(a5_nodes, "The callback pattern");
			a5_nodes.forEach(detach);
			h20_nodes.forEach(detach);
			t13 = claim_space(section1_nodes);
			p3 = claim_element(section1_nodes, "P", {});
			var p3_nodes = children(p3);
			t14 = claim_text(p3_nodes, "Let's take a look at retrying asynchronous function that takes in a callback function that follows ");
			a6 = claim_element(p3_nodes, "A", { href: true, rel: true });
			var a6_nodes = children(a6);
			t15 = claim_text(a6_nodes, "the callback convention");
			a6_nodes.forEach(detach);
			t16 = claim_text(p3_nodes, ":");
			p3_nodes.forEach(detach);
			t17 = claim_space(section1_nodes);
			ul1 = claim_element(section1_nodes, "UL", {});
			var ul1_nodes = children(ul1);
			li5 = claim_element(ul1_nodes, "LI", {});
			var li5_nodes = children(li5);
			t18 = claim_text(li5_nodes, "The first argument of the callback function is an error object");
			li5_nodes.forEach(detach);
			t19 = claim_space(ul1_nodes);
			li6 = claim_element(ul1_nodes, "LI", {});
			var li6_nodes = children(li6);
			t20 = claim_text(li6_nodes, "The second argument contains the callback results.");
			li6_nodes.forEach(detach);
			ul1_nodes.forEach(detach);
			t21 = claim_space(section1_nodes);
			pre0 = claim_element(section1_nodes, "PRE", { class: true });
			var pre0_nodes = children(pre0);
			pre0_nodes.forEach(detach);
			t22 = claim_space(section1_nodes);
			p4 = claim_element(section1_nodes, "P", {});
			var p4_nodes = children(p4);
			t23 = claim_text(p4_nodes, "So we are going to implement the ");
			code0 = claim_element(p4_nodes, "CODE", {});
			var code0_nodes = children(code0);
			t24 = claim_text(code0_nodes, "retry");
			code0_nodes.forEach(detach);
			t25 = claim_text(p4_nodes, " function, that takes in the asynchronous function to retry, ");
			code1 = claim_element(p4_nodes, "CODE", {});
			var code1_nodes = children(code1);
			t26 = claim_text(code1_nodes, "fn");
			code1_nodes.forEach(detach);
			t27 = claim_text(p4_nodes, " and a callback function, ");
			code2 = claim_element(p4_nodes, "CODE", {});
			var code2_nodes = children(code2);
			t28 = claim_text(code2_nodes, "cb");
			code2_nodes.forEach(detach);
			t29 = claim_text(p4_nodes, ", that will be called when the function succeeded or failed after all the retry attempts.");
			p4_nodes.forEach(detach);
			t30 = claim_space(section1_nodes);
			pre1 = claim_element(section1_nodes, "PRE", { class: true });
			var pre1_nodes = children(pre1);
			pre1_nodes.forEach(detach);
			t31 = claim_space(section1_nodes);
			p5 = claim_element(section1_nodes, "P", {});
			var p5_nodes = children(p5);
			t32 = claim_text(p5_nodes, "The first thing we are going to do is to call the function ");
			code3 = claim_element(p5_nodes, "CODE", {});
			var code3_nodes = children(code3);
			t33 = claim_text(code3_nodes, "fn");
			code3_nodes.forEach(detach);
			t34 = claim_text(p5_nodes, ":");
			p5_nodes.forEach(detach);
			t35 = claim_space(section1_nodes);
			pre2 = claim_element(section1_nodes, "PRE", { class: true });
			var pre2_nodes = children(pre2);
			pre2_nodes.forEach(detach);
			t36 = claim_space(section1_nodes);
			p6 = claim_element(section1_nodes, "P", {});
			var p6_nodes = children(p6);
			t37 = claim_text(p6_nodes, "We check if there's an error, if there's no error, we can call the ");
			code4 = claim_element(p6_nodes, "CODE", {});
			var code4_nodes = children(code4);
			t38 = claim_text(code4_nodes, "cb");
			code4_nodes.forEach(detach);
			t39 = claim_text(p6_nodes, " function to indicate the function succeeded. However, if there's an error, we are going to call the function again to retry.");
			p6_nodes.forEach(detach);
			t40 = claim_space(section1_nodes);
			pre3 = claim_element(section1_nodes, "PRE", { class: true });
			var pre3_nodes = children(pre3);
			pre3_nodes.forEach(detach);
			t41 = claim_space(section1_nodes);
			p7 = claim_element(section1_nodes, "P", {});
			var p7_nodes = children(p7);
			t42 = claim_text(p7_nodes, "Let's retry at most 3 times:");
			p7_nodes.forEach(detach);
			t43 = claim_space(section1_nodes);
			pre4 = claim_element(section1_nodes, "PRE", { class: true });
			var pre4_nodes = children(pre4);
			pre4_nodes.forEach(detach);
			t44 = claim_space(section1_nodes);
			p8 = claim_element(section1_nodes, "P", {});
			var p8_nodes = children(p8);
			t45 = claim_text(p8_nodes, "Notice that it starts to get unwieldy as we are nesting more callback functions. It's hard to figure out which close bracket ");
			code5 = claim_element(p8_nodes, "CODE", {});
			var code5_nodes = children(code5);
			t46 = claim_text(code5_nodes, "}");
			code5_nodes.forEach(detach);
			t47 = claim_text(p8_nodes, " is belong to without proper indentation.");
			p8_nodes.forEach(detach);
			t48 = claim_space(section1_nodes);
			p9 = claim_element(section1_nodes, "P", {});
			var p9_nodes = children(p9);
			t49 = claim_text(p9_nodes, "This is the so-called ");
			a7 = claim_element(p9_nodes, "A", { href: true, rel: true });
			var a7_nodes = children(a7);
			t50 = claim_text(a7_nodes, "\"Callback Hell\"");
			a7_nodes.forEach(detach);
			t51 = claim_text(p9_nodes, " in JavaScript.");
			p9_nodes.forEach(detach);
			t52 = claim_space(section1_nodes);
			p10 = claim_element(section1_nodes, "P", {});
			var p10_nodes = children(p10);
			t53 = claim_text(p10_nodes, "Let's make it more unbearable to prove the point by flipping the if case:");
			p10_nodes.forEach(detach);
			t54 = claim_space(section1_nodes);
			pre5 = claim_element(section1_nodes, "PRE", { class: true });
			var pre5_nodes = children(pre5);
			pre5_nodes.forEach(detach);
			t55 = claim_space(section1_nodes);
			p11 = claim_element(section1_nodes, "P", {});
			var p11_nodes = children(p11);
			t56 = claim_text(p11_nodes, "Now can you tell which ");
			code6 = claim_element(p11_nodes, "CODE", {});
			var code6_nodes = children(code6);
			t57 = claim_text(code6_nodes, "data");
			code6_nodes.forEach(detach);
			t58 = claim_text(p11_nodes, " is belong to which function?");
			p11_nodes.forEach(detach);
			t59 = claim_space(section1_nodes);
			p12 = claim_element(section1_nodes, "P", {});
			var p12_nodes = children(p12);
			t60 = claim_text(p12_nodes, "Now, instead of always retry at most 3 times, we are going to retry at most ");
			code7 = claim_element(p12_nodes, "CODE", {});
			var code7_nodes = children(code7);
			t61 = claim_text(code7_nodes, "n");
			code7_nodes.forEach(detach);
			t62 = claim_text(p12_nodes, " times.");
			p12_nodes.forEach(detach);
			t63 = claim_space(section1_nodes);
			p13 = claim_element(section1_nodes, "P", {});
			var p13_nodes = children(p13);
			t64 = claim_text(p13_nodes, "So we are going to introduce a new argument, ");
			code8 = claim_element(p13_nodes, "CODE", {});
			var code8_nodes = children(code8);
			t65 = claim_text(code8_nodes, "n");
			code8_nodes.forEach(detach);
			t66 = claim_text(p13_nodes, ":");
			p13_nodes.forEach(detach);
			t67 = claim_space(section1_nodes);
			pre6 = claim_element(section1_nodes, "PRE", { class: true });
			var pre6_nodes = children(pre6);
			pre6_nodes.forEach(detach);
			t68 = claim_space(section1_nodes);
			p14 = claim_element(section1_nodes, "P", {});
			var p14_nodes = children(p14);
			t69 = claim_text(p14_nodes, "The function keeps going forever, until it reaches ");
			code9 = claim_element(p14_nodes, "CODE", {});
			var code9_nodes = children(code9);
			t70 = claim_text(code9_nodes, "n");
			code9_nodes.forEach(detach);
			t71 = claim_text(p14_nodes, " attempt.");
			p14_nodes.forEach(detach);
			t72 = claim_space(section1_nodes);
			p15 = claim_element(section1_nodes, "P", {});
			var p15_nodes = children(p15);
			t73 = claim_text(p15_nodes, "If you stare at the code hard enough, you would notice that the code starts to repeat itself:");
			p15_nodes.forEach(detach);
			t74 = claim_space(section1_nodes);
			p16 = claim_element(section1_nodes, "P", {});
			var p16_nodes = children(p16);
			img = claim_element(p16_nodes, "IMG", { src: true, alt: true });
			p16_nodes.forEach(detach);
			t75 = claim_space(section1_nodes);
			p17 = claim_element(section1_nodes, "P", {});
			var p17_nodes = children(p17);
			t76 = claim_text(p17_nodes, "Note that the code within the outer red square is the same as the code within the inner red square, which is the same as the inner inner red square ...");
			p17_nodes.forEach(detach);
			t77 = claim_space(section1_nodes);
			p18 = claim_element(section1_nodes, "P", {});
			var p18_nodes = children(p18);
			t78 = claim_text(p18_nodes, "So, let's extract the code within the red square out into a function and replace the red squares with the function:");
			p18_nodes.forEach(detach);
			t79 = claim_space(section1_nodes);
			pre7 = claim_element(section1_nodes, "PRE", { class: true });
			var pre7_nodes = children(pre7);
			pre7_nodes.forEach(detach);
			t80 = claim_space(section1_nodes);
			p19 = claim_element(section1_nodes, "P", {});
			var p19_nodes = children(p19);
			t81 = claim_text(p19_nodes, "And there you go, retrying an asynchronous function with callback pattern.");
			p19_nodes.forEach(detach);
			t82 = claim_space(section1_nodes);
			p20 = claim_element(section1_nodes, "P", {});
			var p20_nodes = children(p20);
			t83 = claim_text(p20_nodes, "Does it work? Well, we have to test it to verify it. Stay till the end to see how we are going to write unit test to verify it.");
			p20_nodes.forEach(detach);
			section1_nodes.forEach(detach);
			t84 = claim_space(nodes);
			section2 = claim_element(nodes, "SECTION", {});
			var section2_nodes = children(section2);
			h21 = claim_element(section2_nodes, "H2", {});
			var h21_nodes = children(h21);
			a8 = claim_element(h21_nodes, "A", { href: true, id: true });
			var a8_nodes = children(a8);
			t85 = claim_text(a8_nodes, "The promise chain");
			a8_nodes.forEach(detach);
			h21_nodes.forEach(detach);
			t86 = claim_space(section2_nodes);
			p21 = claim_element(section2_nodes, "P", {});
			var p21_nodes = children(p21);
			t87 = claim_text(p21_nodes, "A ");
			a9 = claim_element(p21_nodes, "A", { href: true, rel: true });
			var a9_nodes = children(a9);
			t88 = claim_text(a9_nodes, "Promise");
			a9_nodes.forEach(detach);
			t89 = claim_text(p21_nodes, ", according to MDN, object represents the eventual completion of an asynchronous operation, and its resulting value.");
			p21_nodes.forEach(detach);
			t90 = claim_space(section2_nodes);
			p22 = claim_element(section2_nodes, "P", {});
			var p22_nodes = children(p22);
			t91 = claim_text(p22_nodes, "A Promise object provides ");
			code10 = claim_element(p22_nodes, "CODE", {});
			var code10_nodes = children(code10);
			t92 = claim_text(code10_nodes, ".then");
			code10_nodes.forEach(detach);
			t93 = claim_text(p22_nodes, " and ");
			code11 = claim_element(p22_nodes, "CODE", {});
			var code11_nodes = children(code11);
			t94 = claim_text(code11_nodes, ".catch");
			code11_nodes.forEach(detach);
			t95 = claim_text(p22_nodes, " method, which takes in callback function to be called when the promise is resolved or rejected respectively. The ");
			code12 = claim_element(p22_nodes, "CODE", {});
			var code12_nodes = children(code12);
			t96 = claim_text(code12_nodes, ".then");
			code12_nodes.forEach(detach);
			t97 = claim_text(p22_nodes, " and ");
			code13 = claim_element(p22_nodes, "CODE", {});
			var code13_nodes = children(code13);
			t98 = claim_text(code13_nodes, ".catch");
			code13_nodes.forEach(detach);
			t99 = claim_text(p22_nodes, " method then returns a new Promise of the return value of the callback function.");
			p22_nodes.forEach(detach);
			t100 = claim_space(section2_nodes);
			pre8 = claim_element(section2_nodes, "PRE", { class: true });
			var pre8_nodes = children(pre8);
			pre8_nodes.forEach(detach);
			t101 = claim_space(section2_nodes);
			p23 = claim_element(section2_nodes, "P", {});
			var p23_nodes = children(p23);
			t102 = claim_text(p23_nodes, "The chaining of ");
			code14 = claim_element(p23_nodes, "CODE", {});
			var code14_nodes = children(code14);
			t103 = claim_text(code14_nodes, ".then");
			code14_nodes.forEach(detach);
			t104 = claim_text(p23_nodes, " and ");
			code15 = claim_element(p23_nodes, "CODE", {});
			var code15_nodes = children(code15);
			t105 = claim_text(code15_nodes, ".catch");
			code15_nodes.forEach(detach);
			t106 = claim_text(p23_nodes, " is a common pattern, called ");
			a10 = claim_element(p23_nodes, "A", { href: true, rel: true });
			var a10_nodes = children(a10);
			t107 = claim_text(a10_nodes, "Promise chaining");
			a10_nodes.forEach(detach);
			t108 = claim_text(p23_nodes, ".");
			p23_nodes.forEach(detach);
			t109 = claim_space(section2_nodes);
			p24 = claim_element(section2_nodes, "P", {});
			var p24_nodes = children(p24);
			t110 = claim_text(p24_nodes, "Now, lets implement the ");
			code16 = claim_element(p24_nodes, "CODE", {});
			var code16_nodes = children(code16);
			t111 = claim_text(code16_nodes, "retry");
			code16_nodes.forEach(detach);
			t112 = claim_text(p24_nodes, " function, which takes in the asynchronous function to retry, ");
			code17 = claim_element(p24_nodes, "CODE", {});
			var code17_nodes = children(code17);
			t113 = claim_text(code17_nodes, "fn");
			code17_nodes.forEach(detach);
			t114 = claim_text(p24_nodes, " and return a promise, which resolved when the function succeeded or resolved after failing all the retry attempts.");
			p24_nodes.forEach(detach);
			t115 = claim_space(section2_nodes);
			pre9 = claim_element(section2_nodes, "PRE", { class: true });
			var pre9_nodes = children(pre9);
			pre9_nodes.forEach(detach);
			t116 = claim_space(section2_nodes);
			p25 = claim_element(section2_nodes, "P", {});
			var p25_nodes = children(p25);
			t117 = claim_text(p25_nodes, "The first thing we are going to do is to call the function ");
			code18 = claim_element(p25_nodes, "CODE", {});
			var code18_nodes = children(code18);
			t118 = claim_text(code18_nodes, "fn");
			code18_nodes.forEach(detach);
			t119 = claim_text(p25_nodes, ":");
			p25_nodes.forEach(detach);
			t120 = claim_space(section2_nodes);
			pre10 = claim_element(section2_nodes, "PRE", { class: true });
			var pre10_nodes = children(pre10);
			pre10_nodes.forEach(detach);
			t121 = claim_space(section2_nodes);
			p26 = claim_element(section2_nodes, "P", {});
			var p26_nodes = children(p26);
			t122 = claim_text(p26_nodes, "We need to retry calling ");
			code19 = claim_element(p26_nodes, "CODE", {});
			var code19_nodes = children(code19);
			t123 = claim_text(code19_nodes, "fn");
			code19_nodes.forEach(detach);
			t124 = claim_text(p26_nodes, " again, if the first ");
			code20 = claim_element(p26_nodes, "CODE", {});
			var code20_nodes = children(code20);
			t125 = claim_text(code20_nodes, "fn");
			code20_nodes.forEach(detach);
			t126 = claim_text(p26_nodes, " is rejected");
			p26_nodes.forEach(detach);
			t127 = claim_space(section2_nodes);
			pre11 = claim_element(section2_nodes, "PRE", { class: true });
			var pre11_nodes = children(pre11);
			pre11_nodes.forEach(detach);
			t128 = claim_space(section2_nodes);
			p27 = claim_element(section2_nodes, "P", {});
			var p27_nodes = children(p27);
			t129 = claim_text(p27_nodes, "If that new promise rejected again, we retry by calling ");
			code21 = claim_element(p27_nodes, "CODE", {});
			var code21_nodes = children(code21);
			t130 = claim_text(code21_nodes, "fn");
			code21_nodes.forEach(detach);
			t131 = claim_text(p27_nodes, " again");
			p27_nodes.forEach(detach);
			t132 = claim_space(section2_nodes);
			pre12 = claim_element(section2_nodes, "PRE", { class: true });
			var pre12_nodes = children(pre12);
			pre12_nodes.forEach(detach);
			t133 = claim_space(section2_nodes);
			p28 = claim_element(section2_nodes, "P", {});
			var p28_nodes = children(p28);
			t134 = claim_text(p28_nodes, "The last promise ");
			em = claim_element(p28_nodes, "EM", {});
			var em_nodes = children(em);
			t135 = claim_text(em_nodes, "(promise#3)");
			em_nodes.forEach(detach);
			t136 = claim_text(p28_nodes, " will reject if the 3rd ");
			code22 = claim_element(p28_nodes, "CODE", {});
			var code22_nodes = children(code22);
			t137 = claim_text(code22_nodes, "fn()");
			code22_nodes.forEach(detach);
			t138 = claim_text(p28_nodes, " attempt rejects, and resolve if any of the ");
			code23 = claim_element(p28_nodes, "CODE", {});
			var code23_nodes = children(code23);
			t139 = claim_text(code23_nodes, "fn()");
			code23_nodes.forEach(detach);
			t140 = claim_text(p28_nodes, " attempts resolve.");
			p28_nodes.forEach(detach);
			t141 = claim_space(section2_nodes);
			p29 = claim_element(section2_nodes, "P", {});
			var p29_nodes = children(p29);
			t142 = claim_text(p29_nodes, "The callback method within ");
			code24 = claim_element(p29_nodes, "CODE", {});
			var code24_nodes = children(code24);
			t143 = claim_text(code24_nodes, ".catch");
			code24_nodes.forEach(detach);
			t144 = claim_text(p29_nodes, " will be called only when the previous ");
			code25 = claim_element(p29_nodes, "CODE", {});
			var code25_nodes = children(code25);
			t145 = claim_text(code25_nodes, "fn()");
			code25_nodes.forEach(detach);
			t146 = claim_text(p29_nodes, " attempt rejects.");
			p29_nodes.forEach(detach);
			t147 = claim_space(section2_nodes);
			p30 = claim_element(section2_nodes, "P", {});
			var p30_nodes = children(p30);
			t148 = claim_text(p30_nodes, "We are going to return a rejected promise with the error indicating max retries has met, if the last promise ");
			code26 = claim_element(p30_nodes, "CODE", {});
			var code26_nodes = children(code26);
			t149 = claim_text(code26_nodes, "(promise#3)");
			code26_nodes.forEach(detach);
			t150 = claim_text(p30_nodes, " rejected, and a resolved promise with the result from ");
			code27 = claim_element(p30_nodes, "CODE", {});
			var code27_nodes = children(code27);
			t151 = claim_text(code27_nodes, "fn()");
			code27_nodes.forEach(detach);
			t152 = claim_text(p30_nodes, ".");
			p30_nodes.forEach(detach);
			t153 = claim_space(section2_nodes);
			pre13 = claim_element(section2_nodes, "PRE", { class: true });
			var pre13_nodes = children(pre13);
			pre13_nodes.forEach(detach);
			t154 = claim_space(section2_nodes);
			p31 = claim_element(section2_nodes, "P", {});
			var p31_nodes = children(p31);
			t155 = claim_text(p31_nodes, "And we can make the code more concise, as the following two are equivalent, in terms of what is being resolved and rejected:");
			p31_nodes.forEach(detach);
			t156 = claim_space(section2_nodes);
			pre14 = claim_element(section2_nodes, "PRE", { class: true });
			var pre14_nodes = children(pre14);
			pre14_nodes.forEach(detach);
			t157 = claim_space(section2_nodes);
			p32 = claim_element(section2_nodes, "P", {});
			var p32_nodes = children(p32);
			t158 = claim_text(p32_nodes, "Also, we can substitute the variable ");
			code28 = claim_element(p32_nodes, "CODE", {});
			var code28_nodes = children(code28);
			t159 = claim_text(code28_nodes, "promise3");
			code28_nodes.forEach(detach);
			t160 = claim_text(p32_nodes, " with it's promise chain value:");
			p32_nodes.forEach(detach);
			t161 = claim_space(section2_nodes);
			pre15 = claim_element(section2_nodes, "PRE", { class: true });
			var pre15_nodes = children(pre15);
			pre15_nodes.forEach(detach);
			t162 = claim_space(section2_nodes);
			p33 = claim_element(section2_nodes, "P", {});
			var p33_nodes = children(p33);
			t163 = claim_text(p33_nodes, "Now, instead of always retry at most 3 times, we are going to retry at most ");
			code29 = claim_element(p33_nodes, "CODE", {});
			var code29_nodes = children(code29);
			t164 = claim_text(code29_nodes, "n");
			code29_nodes.forEach(detach);
			t165 = claim_text(p33_nodes, " times.");
			p33_nodes.forEach(detach);
			t166 = claim_space(section2_nodes);
			p34 = claim_element(section2_nodes, "P", {});
			var p34_nodes = children(p34);
			t167 = claim_text(p34_nodes, "So we are going to introduce a new argument, ");
			code30 = claim_element(p34_nodes, "CODE", {});
			var code30_nodes = children(code30);
			t168 = claim_text(code30_nodes, "n");
			code30_nodes.forEach(detach);
			t169 = claim_text(p34_nodes, ":");
			p34_nodes.forEach(detach);
			t170 = claim_space(section2_nodes);
			pre16 = claim_element(section2_nodes, "PRE", { class: true });
			var pre16_nodes = children(pre16);
			pre16_nodes.forEach(detach);
			t171 = claim_space(section2_nodes);
			p35 = claim_element(section2_nodes, "P", {});
			var p35_nodes = children(p35);
			t172 = claim_text(p35_nodes, "Instead of writing ");
			code31 = claim_element(p35_nodes, "CODE", {});
			var code31_nodes = children(code31);
			t173 = claim_text(code31_nodes, ".catch(() => fn())");
			code31_nodes.forEach(detach);
			t174 = claim_space(p35_nodes);
			code32 = claim_element(p35_nodes, "CODE", {});
			var code32_nodes = children(code32);
			t175 = claim_text(code32_nodes, "n");
			code32_nodes.forEach(detach);
			t176 = claim_text(p35_nodes, " number of times, we can build the Promise up using a for loop.");
			p35_nodes.forEach(detach);
			t177 = claim_space(section2_nodes);
			p36 = claim_element(section2_nodes, "P", {});
			var p36_nodes = children(p36);
			strong = claim_element(p36_nodes, "STRONG", {});
			var strong_nodes = children(strong);
			t178 = claim_text(strong_nodes, "Assuming ");
			code33 = claim_element(strong_nodes, "CODE", {});
			var code33_nodes = children(code33);
			t179 = claim_text(code33_nodes, "n");
			code33_nodes.forEach(detach);
			t180 = claim_text(strong_nodes, " is always greater or equal to 1,");
			strong_nodes.forEach(detach);
			p36_nodes.forEach(detach);
			t181 = claim_space(section2_nodes);
			pre17 = claim_element(section2_nodes, "PRE", { class: true });
			var pre17_nodes = children(pre17);
			pre17_nodes.forEach(detach);
			t182 = claim_space(section2_nodes);
			p37 = claim_element(section2_nodes, "P", {});
			var p37_nodes = children(p37);
			t183 = claim_text(p37_nodes, "What if ");
			code34 = claim_element(p37_nodes, "CODE", {});
			var code34_nodes = children(code34);
			t184 = claim_text(code34_nodes, "n");
			code34_nodes.forEach(detach);
			t185 = claim_text(p37_nodes, " is ");
			code35 = claim_element(p37_nodes, "CODE", {});
			var code35_nodes = children(code35);
			t186 = claim_text(code35_nodes, "0");
			code35_nodes.forEach(detach);
			t187 = claim_text(p37_nodes, " or negative? We shouldn't call ");
			code36 = claim_element(p37_nodes, "CODE", {});
			var code36_nodes = children(code36);
			t188 = claim_text(code36_nodes, "fn()");
			code36_nodes.forEach(detach);
			t189 = claim_text(p37_nodes, " at all!");
			p37_nodes.forEach(detach);
			t190 = claim_space(section2_nodes);
			pre18 = claim_element(section2_nodes, "PRE", { class: true });
			var pre18_nodes = children(pre18);
			pre18_nodes.forEach(detach);
			t191 = claim_space(section2_nodes);
			p38 = claim_element(section2_nodes, "P", {});
			var p38_nodes = children(p38);
			t192 = claim_text(p38_nodes, "Well, this maybe a little bit inelegant, having to execute the ");
			code37 = claim_element(p38_nodes, "CODE", {});
			var code37_nodes = children(code37);
			t193 = claim_text(code37_nodes, "if (!promise) ... else ...");
			code37_nodes.forEach(detach);
			t194 = claim_text(p38_nodes, " on every loop, we can initialise the promise with a rejected promise, so that we can treat the 1st ");
			code38 = claim_element(p38_nodes, "CODE", {});
			var code38_nodes = children(code38);
			t195 = claim_text(code38_nodes, "fn()");
			code38_nodes.forEach(detach);
			t196 = claim_text(p38_nodes, " called as the 1st retry:");
			p38_nodes.forEach(detach);
			t197 = claim_space(section2_nodes);
			pre19 = claim_element(section2_nodes, "PRE", { class: true });
			var pre19_nodes = children(pre19);
			pre19_nodes.forEach(detach);
			t198 = claim_space(section2_nodes);
			p39 = claim_element(section2_nodes, "P", {});
			var p39_nodes = children(p39);
			t199 = claim_text(p39_nodes, "And there you go, retrying an asynchronous function with promise chain.");
			p39_nodes.forEach(detach);
			section2_nodes.forEach(detach);
			t200 = claim_space(nodes);
			section3 = claim_element(nodes, "SECTION", {});
			var section3_nodes = children(section3);
			h22 = claim_element(section3_nodes, "H2", {});
			var h22_nodes = children(h22);
			a11 = claim_element(h22_nodes, "A", { href: true, id: true });
			var a11_nodes = children(a11);
			t201 = claim_text(a11_nodes, "Async await");
			a11_nodes.forEach(detach);
			h22_nodes.forEach(detach);
			t202 = claim_space(section3_nodes);
			p40 = claim_element(section3_nodes, "P", {});
			var p40_nodes = children(p40);
			t203 = claim_text(p40_nodes, "When you use a promise, you need to use ");
			code39 = claim_element(p40_nodes, "CODE", {});
			var code39_nodes = children(code39);
			t204 = claim_text(code39_nodes, ".then");
			code39_nodes.forEach(detach);
			t205 = claim_text(p40_nodes, " to get the resolved value, and that happened asynchronously.");
			p40_nodes.forEach(detach);
			t206 = claim_space(section3_nodes);
			p41 = claim_element(section3_nodes, "P", {});
			var p41_nodes = children(p41);
			t207 = claim_text(p41_nodes, "Meaning, if you have");
			p41_nodes.forEach(detach);
			t208 = claim_space(section3_nodes);
			pre20 = claim_element(section3_nodes, "PRE", { class: true });
			var pre20_nodes = children(pre20);
			pre20_nodes.forEach(detach);
			t209 = claim_space(section3_nodes);
			p42 = claim_element(section3_nodes, "P", {});
			var p42_nodes = children(p42);
			t210 = claim_text(p42_nodes, "You would see");
			p42_nodes.forEach(detach);
			t211 = claim_space(section3_nodes);
			pre21 = claim_element(section3_nodes, "PRE", { class: true });
			var pre21_nodes = children(pre21);
			pre21_nodes.forEach(detach);
			t212 = claim_space(section3_nodes);
			p43 = claim_element(section3_nodes, "P", {});
			var p43_nodes = children(p43);
			t213 = claim_text(p43_nodes, "first, and then some time later,");
			p43_nodes.forEach(detach);
			t214 = claim_space(section3_nodes);
			pre22 = claim_element(section3_nodes, "PRE", { class: true });
			var pre22_nodes = children(pre22);
			pre22_nodes.forEach(detach);
			t215 = claim_space(section3_nodes);
			p44 = claim_element(section3_nodes, "P", {});
			var p44_nodes = children(p44);
			t216 = claim_text(p44_nodes, "This is because the function in the ");
			code40 = claim_element(p44_nodes, "CODE", {});
			var code40_nodes = children(code40);
			t217 = claim_text(code40_nodes, ".then");
			code40_nodes.forEach(detach);
			t218 = claim_text(p44_nodes, " is called asynchronously, it is executed in a separate timeline of execution, so to speak.");
			p44_nodes.forEach(detach);
			t219 = claim_space(section3_nodes);
			p45 = claim_element(section3_nodes, "P", {});
			var p45_nodes = children(p45);
			t220 = claim_text(p45_nodes, "And ");
			code41 = claim_element(p45_nodes, "CODE", {});
			var code41_nodes = children(code41);
			t221 = claim_text(code41_nodes, "async");
			code41_nodes.forEach(detach);
			t222 = claim_text(p45_nodes, " + ");
			code42 = claim_element(p45_nodes, "CODE", {});
			var code42_nodes = children(code42);
			t223 = claim_text(code42_nodes, "await");
			code42_nodes.forEach(detach);
			t224 = claim_text(p45_nodes, " in JavaScript allow us to stitch multiple separate timeline of execution into disguisedly 1 timeline of execution flow.");
			p45_nodes.forEach(detach);
			t225 = claim_space(section3_nodes);
			p46 = claim_element(section3_nodes, "P", {});
			var p46_nodes = children(p46);
			t226 = claim_text(p46_nodes, "Everytime when we ");
			code43 = claim_element(p46_nodes, "CODE", {});
			var code43_nodes = children(code43);
			t227 = claim_text(code43_nodes, "await");
			code43_nodes.forEach(detach);
			t228 = claim_text(p46_nodes, ", we jump into a different asynchronous timeline.");
			p46_nodes.forEach(detach);
			t229 = claim_space(section3_nodes);
			p47 = claim_element(section3_nodes, "P", {});
			var p47_nodes = children(p47);
			t230 = claim_text(p47_nodes, "So, with the code with Promise + ");
			code44 = claim_element(p47_nodes, "CODE", {});
			var code44_nodes = children(code44);
			t231 = claim_text(code44_nodes, ".then");
			code44_nodes.forEach(detach);
			t232 = claim_text(p47_nodes, ":");
			p47_nodes.forEach(detach);
			t233 = claim_space(section3_nodes);
			pre23 = claim_element(section3_nodes, "PRE", { class: true });
			var pre23_nodes = children(pre23);
			pre23_nodes.forEach(detach);
			t234 = claim_space(section3_nodes);
			p48 = claim_element(section3_nodes, "P", {});
			var p48_nodes = children(p48);
			t235 = claim_text(p48_nodes, "can be written in ");
			code45 = claim_element(p48_nodes, "CODE", {});
			var code45_nodes = children(code45);
			t236 = claim_text(code45_nodes, "async");
			code45_nodes.forEach(detach);
			t237 = claim_text(p48_nodes, " + ");
			code46 = claim_element(p48_nodes, "CODE", {});
			var code46_nodes = children(code46);
			t238 = claim_text(code46_nodes, "await");
			code46_nodes.forEach(detach);
			t239 = claim_text(p48_nodes, " in the following manner:");
			p48_nodes.forEach(detach);
			t240 = claim_space(section3_nodes);
			pre24 = claim_element(section3_nodes, "PRE", { class: true });
			var pre24_nodes = children(pre24);
			pre24_nodes.forEach(detach);
			t241 = claim_space(section3_nodes);
			p49 = claim_element(section3_nodes, "P", {});
			var p49_nodes = children(p49);
			t242 = claim_text(p49_nodes, "Now, lets implement the ");
			code47 = claim_element(p49_nodes, "CODE", {});
			var code47_nodes = children(code47);
			t243 = claim_text(code47_nodes, "retry");
			code47_nodes.forEach(detach);
			t244 = claim_text(p49_nodes, " function using ");
			code48 = claim_element(p49_nodes, "CODE", {});
			var code48_nodes = children(code48);
			t245 = claim_text(code48_nodes, "async");
			code48_nodes.forEach(detach);
			t246 = claim_text(p49_nodes, " + ");
			code49 = claim_element(p49_nodes, "CODE", {});
			var code49_nodes = children(code49);
			t247 = claim_text(code49_nodes, "await");
			code49_nodes.forEach(detach);
			t248 = claim_text(p49_nodes, ".");
			p49_nodes.forEach(detach);
			t249 = claim_space(section3_nodes);
			pre25 = claim_element(section3_nodes, "PRE", { class: true });
			var pre25_nodes = children(pre25);
			pre25_nodes.forEach(detach);
			t250 = claim_space(section3_nodes);
			p50 = claim_element(section3_nodes, "P", {});
			var p50_nodes = children(p50);
			t251 = claim_text(p50_nodes, "The first thing we are going to do is to call the function ");
			code50 = claim_element(p50_nodes, "CODE", {});
			var code50_nodes = children(code50);
			t252 = claim_text(code50_nodes, "fn");
			code50_nodes.forEach(detach);
			t253 = claim_text(p50_nodes, ":");
			p50_nodes.forEach(detach);
			t254 = claim_space(section3_nodes);
			pre26 = claim_element(section3_nodes, "PRE", { class: true });
			var pre26_nodes = children(pre26);
			pre26_nodes.forEach(detach);
			t255 = claim_space(section3_nodes);
			p51 = claim_element(section3_nodes, "P", {});
			var p51_nodes = children(p51);
			t256 = claim_text(p51_nodes, "We need to retry calling ");
			code51 = claim_element(p51_nodes, "CODE", {});
			var code51_nodes = children(code51);
			t257 = claim_text(code51_nodes, "fn");
			code51_nodes.forEach(detach);
			t258 = claim_text(p51_nodes, " again, if the first ");
			code52 = claim_element(p51_nodes, "CODE", {});
			var code52_nodes = children(code52);
			t259 = claim_text(code52_nodes, "fn");
			code52_nodes.forEach(detach);
			t260 = claim_text(p51_nodes, " is rejected. Instead of ");
			code53 = claim_element(p51_nodes, "CODE", {});
			var code53_nodes = children(code53);
			t261 = claim_text(code53_nodes, ".catch");
			code53_nodes.forEach(detach);
			t262 = claim_text(p51_nodes, ", we use ");
			code54 = claim_element(p51_nodes, "CODE", {});
			var code54_nodes = children(code54);
			t263 = claim_text(code54_nodes, "await");
			code54_nodes.forEach(detach);
			t264 = claim_text(p51_nodes, " + ");
			code55 = claim_element(p51_nodes, "CODE", {});
			var code55_nodes = children(code55);
			t265 = claim_text(code55_nodes, "try catch");
			code55_nodes.forEach(detach);
			p51_nodes.forEach(detach);
			t266 = claim_space(section3_nodes);
			pre27 = claim_element(section3_nodes, "PRE", { class: true });
			var pre27_nodes = children(pre27);
			pre27_nodes.forEach(detach);
			t267 = claim_space(section3_nodes);
			p52 = claim_element(section3_nodes, "P", {});
			var p52_nodes = children(p52);
			t268 = claim_text(p52_nodes, "If the 2nd ");
			code56 = claim_element(p52_nodes, "CODE", {});
			var code56_nodes = children(code56);
			t269 = claim_text(code56_nodes, "fn()");
			code56_nodes.forEach(detach);
			t270 = claim_text(p52_nodes, " rejected again, we retry by calling ");
			code57 = claim_element(p52_nodes, "CODE", {});
			var code57_nodes = children(code57);
			t271 = claim_text(code57_nodes, "fn");
			code57_nodes.forEach(detach);
			t272 = claim_text(p52_nodes, " again");
			p52_nodes.forEach(detach);
			t273 = claim_space(section3_nodes);
			pre28 = claim_element(section3_nodes, "PRE", { class: true });
			var pre28_nodes = children(pre28);
			pre28_nodes.forEach(detach);
			t274 = claim_space(section3_nodes);
			p53 = claim_element(section3_nodes, "P", {});
			var p53_nodes = children(p53);
			t275 = claim_text(p53_nodes, "And if the last ");
			code58 = claim_element(p53_nodes, "CODE", {});
			var code58_nodes = children(code58);
			t276 = claim_text(code58_nodes, "fn()");
			code58_nodes.forEach(detach);
			t277 = claim_text(p53_nodes, " rejected again, we are going to return a rejected promise with an error indicating max retries has met by throw the error");
			p53_nodes.forEach(detach);
			t278 = claim_space(section3_nodes);
			pre29 = claim_element(section3_nodes, "PRE", { class: true });
			var pre29_nodes = children(pre29);
			pre29_nodes.forEach(detach);
			t279 = claim_space(section3_nodes);
			p54 = claim_element(section3_nodes, "P", {});
			var p54_nodes = children(p54);
			t280 = claim_text(p54_nodes, "Now, if we need to return a Promise resolved with the resolved value from ");
			code59 = claim_element(p54_nodes, "CODE", {});
			var code59_nodes = children(code59);
			t281 = claim_text(code59_nodes, "fn()");
			code59_nodes.forEach(detach);
			p54_nodes.forEach(detach);
			t282 = claim_space(section3_nodes);
			pre30 = claim_element(section3_nodes, "PRE", { class: true });
			var pre30_nodes = children(pre30);
			pre30_nodes.forEach(detach);
			t283 = claim_space(section3_nodes);
			p55 = claim_element(section3_nodes, "P", {});
			var p55_nodes = children(p55);
			t284 = claim_text(p55_nodes, "Since we are ending early in the ");
			code60 = claim_element(p55_nodes, "CODE", {});
			var code60_nodes = children(code60);
			t285 = claim_text(code60_nodes, "try");
			code60_nodes.forEach(detach);
			t286 = claim_text(p55_nodes, " block, and we are not using the error from the ");
			code61 = claim_element(p55_nodes, "CODE", {});
			var code61_nodes = children(code61);
			t287 = claim_text(code61_nodes, "catch");
			code61_nodes.forEach(detach);
			t288 = claim_text(p55_nodes, " block, we can make the code less nested");
			p55_nodes.forEach(detach);
			t289 = claim_space(section3_nodes);
			pre31 = claim_element(section3_nodes, "PRE", { class: true });
			var pre31_nodes = children(pre31);
			pre31_nodes.forEach(detach);
			t290 = claim_space(section3_nodes);
			p56 = claim_element(section3_nodes, "P", {});
			var p56_nodes = children(p56);
			t291 = claim_text(p56_nodes, "Now, instead of always retry at most 3 times, we are going to retry at most ");
			code62 = claim_element(p56_nodes, "CODE", {});
			var code62_nodes = children(code62);
			t292 = claim_text(code62_nodes, "n");
			code62_nodes.forEach(detach);
			t293 = claim_text(p56_nodes, " times.");
			p56_nodes.forEach(detach);
			t294 = claim_space(section3_nodes);
			p57 = claim_element(section3_nodes, "P", {});
			var p57_nodes = children(p57);
			t295 = claim_text(p57_nodes, "So we are going to introduce a new argument, ");
			code63 = claim_element(p57_nodes, "CODE", {});
			var code63_nodes = children(code63);
			t296 = claim_text(code63_nodes, "n");
			code63_nodes.forEach(detach);
			t297 = claim_text(p57_nodes, ":");
			p57_nodes.forEach(detach);
			t298 = claim_space(section3_nodes);
			pre32 = claim_element(section3_nodes, "PRE", { class: true });
			var pre32_nodes = children(pre32);
			pre32_nodes.forEach(detach);
			t299 = claim_space(section3_nodes);
			p58 = claim_element(section3_nodes, "P", {});
			var p58_nodes = children(p58);
			t300 = claim_text(p58_nodes, "Instead of writing it ");
			code64 = claim_element(p58_nodes, "CODE", {});
			var code64_nodes = children(code64);
			t301 = claim_text(code64_nodes, "n");
			code64_nodes.forEach(detach);
			t302 = claim_text(p58_nodes, " number of times, we can achieve it using a ");
			code65 = claim_element(p58_nodes, "CODE", {});
			var code65_nodes = children(code65);
			t303 = claim_text(code65_nodes, "for");
			code65_nodes.forEach(detach);
			t304 = claim_text(p58_nodes, " loop:");
			p58_nodes.forEach(detach);
			t305 = claim_space(section3_nodes);
			pre33 = claim_element(section3_nodes, "PRE", { class: true });
			var pre33_nodes = children(pre33);
			pre33_nodes.forEach(detach);
			t306 = claim_space(section3_nodes);
			p59 = claim_element(section3_nodes, "P", {});
			var p59_nodes = children(p59);
			t307 = claim_text(p59_nodes, "And there you go, retrying an asynchronous function using ");
			code66 = claim_element(p59_nodes, "CODE", {});
			var code66_nodes = children(code66);
			t308 = claim_text(code66_nodes, "async");
			code66_nodes.forEach(detach);
			t309 = claim_text(p59_nodes, " + ");
			code67 = claim_element(p59_nodes, "CODE", {});
			var code67_nodes = children(code67);
			t310 = claim_text(code67_nodes, "await");
			code67_nodes.forEach(detach);
			t311 = claim_text(p59_nodes, ".");
			p59_nodes.forEach(detach);
			section3_nodes.forEach(detach);
			t312 = claim_space(nodes);
			section4 = claim_element(nodes, "SECTION", {});
			var section4_nodes = children(section4);
			h23 = claim_element(section4_nodes, "H2", {});
			var h23_nodes = children(h23);
			a12 = claim_element(h23_nodes, "A", { href: true, id: true });
			var a12_nodes = children(a12);
			t313 = claim_text(a12_nodes, "Testing");
			a12_nodes.forEach(detach);
			h23_nodes.forEach(detach);
			t314 = claim_space(section4_nodes);
			p60 = claim_element(section4_nodes, "P", {});
			var p60_nodes = children(p60);
			t315 = claim_text(p60_nodes, "To test whether our ");
			code68 = claim_element(p60_nodes, "CODE", {});
			var code68_nodes = children(code68);
			t316 = claim_text(code68_nodes, "retry");
			code68_nodes.forEach(detach);
			t317 = claim_text(p60_nodes, " function works, we need to have a max number of retry in mind, say 3. And we need a function, ");
			code69 = claim_element(p60_nodes, "CODE", {});
			var code69_nodes = children(code69);
			t318 = claim_text(code69_nodes, "fn");
			code69_nodes.forEach(detach);
			t319 = claim_text(p60_nodes, " that we can control when it succeed and when it failed.");
			p60_nodes.forEach(detach);
			t320 = claim_space(section4_nodes);
			p61 = claim_element(section4_nodes, "P", {});
			var p61_nodes = children(p61);
			t321 = claim_text(p61_nodes, "So we can have the following test cases:");
			p61_nodes.forEach(detach);
			t322 = claim_space(section4_nodes);
			ul6 = claim_element(section4_nodes, "UL", {});
			var ul6_nodes = children(ul6);
			li9 = claim_element(ul6_nodes, "LI", {});
			var li9_nodes = children(li9);
			code70 = claim_element(li9_nodes, "CODE", {});
			var code70_nodes = children(code70);
			t323 = claim_text(code70_nodes, "fn");
			code70_nodes.forEach(detach);
			t324 = claim_text(li9_nodes, " always succeed;");
			ul2 = claim_element(li9_nodes, "UL", {});
			var ul2_nodes = children(ul2);
			li7 = claim_element(ul2_nodes, "LI", {});
			var li7_nodes = children(li7);
			t325 = claim_text(li7_nodes, "verify ");
			code71 = claim_element(li7_nodes, "CODE", {});
			var code71_nodes = children(code71);
			t326 = claim_text(code71_nodes, "fn");
			code71_nodes.forEach(detach);
			t327 = claim_text(li7_nodes, " get called only 1 time");
			li7_nodes.forEach(detach);
			t328 = claim_space(ul2_nodes);
			li8 = claim_element(ul2_nodes, "LI", {});
			var li8_nodes = children(li8);
			t329 = claim_text(li8_nodes, "verify we get the return value from the 1st attempt");
			li8_nodes.forEach(detach);
			ul2_nodes.forEach(detach);
			li9_nodes.forEach(detach);
			t330 = claim_space(ul6_nodes);
			li12 = claim_element(ul6_nodes, "LI", {});
			var li12_nodes = children(li12);
			code72 = claim_element(li12_nodes, "CODE", {});
			var code72_nodes = children(code72);
			t331 = claim_text(code72_nodes, "fn");
			code72_nodes.forEach(detach);
			t332 = claim_text(li12_nodes, " failed on 1st attempt, and succeed thereafter;");
			ul3 = claim_element(li12_nodes, "UL", {});
			var ul3_nodes = children(ul3);
			li10 = claim_element(ul3_nodes, "LI", {});
			var li10_nodes = children(li10);
			t333 = claim_text(li10_nodes, "verify ");
			code73 = claim_element(li10_nodes, "CODE", {});
			var code73_nodes = children(code73);
			t334 = claim_text(code73_nodes, "fn");
			code73_nodes.forEach(detach);
			t335 = claim_text(li10_nodes, " get called only 2 times");
			li10_nodes.forEach(detach);
			t336 = claim_space(ul3_nodes);
			li11 = claim_element(ul3_nodes, "LI", {});
			var li11_nodes = children(li11);
			t337 = claim_text(li11_nodes, "verify we get the return value from the 2nd attempt");
			li11_nodes.forEach(detach);
			ul3_nodes.forEach(detach);
			li12_nodes.forEach(detach);
			t338 = claim_space(ul6_nodes);
			li15 = claim_element(ul6_nodes, "LI", {});
			var li15_nodes = children(li15);
			code74 = claim_element(li15_nodes, "CODE", {});
			var code74_nodes = children(code74);
			t339 = claim_text(code74_nodes, "fn");
			code74_nodes.forEach(detach);
			t340 = claim_text(li15_nodes, " failed on 1st, 2nd attempt, and succeed thereafter;");
			ul4 = claim_element(li15_nodes, "UL", {});
			var ul4_nodes = children(ul4);
			li13 = claim_element(ul4_nodes, "LI", {});
			var li13_nodes = children(li13);
			t341 = claim_text(li13_nodes, "verify ");
			code75 = claim_element(li13_nodes, "CODE", {});
			var code75_nodes = children(code75);
			t342 = claim_text(code75_nodes, "fn");
			code75_nodes.forEach(detach);
			t343 = claim_text(li13_nodes, " get called only 3 times");
			li13_nodes.forEach(detach);
			t344 = claim_space(ul4_nodes);
			li14 = claim_element(ul4_nodes, "LI", {});
			var li14_nodes = children(li14);
			t345 = claim_text(li14_nodes, "verify we get the return value from the 3rd attempt");
			li14_nodes.forEach(detach);
			ul4_nodes.forEach(detach);
			li15_nodes.forEach(detach);
			t346 = claim_space(ul6_nodes);
			li18 = claim_element(ul6_nodes, "LI", {});
			var li18_nodes = children(li18);
			code76 = claim_element(li18_nodes, "CODE", {});
			var code76_nodes = children(code76);
			t347 = claim_text(code76_nodes, "fn");
			code76_nodes.forEach(detach);
			t348 = claim_text(li18_nodes, " failed on 1st, 2nd, 3rd attempt, and succeed thereafter;");
			ul5 = claim_element(li18_nodes, "UL", {});
			var ul5_nodes = children(ul5);
			li16 = claim_element(ul5_nodes, "LI", {});
			var li16_nodes = children(li16);
			t349 = claim_text(li16_nodes, "verify ");
			code77 = claim_element(li16_nodes, "CODE", {});
			var code77_nodes = children(code77);
			t350 = claim_text(code77_nodes, "fn");
			code77_nodes.forEach(detach);
			t351 = claim_text(li16_nodes, " get called only 3 times");
			li16_nodes.forEach(detach);
			t352 = claim_space(ul5_nodes);
			li17 = claim_element(ul5_nodes, "LI", {});
			var li17_nodes = children(li17);
			t353 = claim_text(li17_nodes, "verify we get the max retry error");
			li17_nodes.forEach(detach);
			ul5_nodes.forEach(detach);
			li18_nodes.forEach(detach);
			ul6_nodes.forEach(detach);
			t354 = claim_space(section4_nodes);
			p62 = claim_element(section4_nodes, "P", {});
			var p62_nodes = children(p62);
			t355 = claim_text(p62_nodes, "So, the key is to devise such ");
			code78 = claim_element(p62_nodes, "CODE", {});
			var code78_nodes = children(code78);
			t356 = claim_text(code78_nodes, "fn");
			code78_nodes.forEach(detach);
			t357 = claim_text(p62_nodes, " that we can control when it succeed and when it failed.");
			p62_nodes.forEach(detach);
			t358 = claim_space(section4_nodes);
			p63 = claim_element(section4_nodes, "P", {});
			var p63_nodes = children(p63);
			t359 = claim_text(p63_nodes, "We can create a function that returns such function");
			p63_nodes.forEach(detach);
			t360 = claim_space(section4_nodes);
			pre34 = claim_element(section4_nodes, "PRE", { class: true });
			var pre34_nodes = children(pre34);
			pre34_nodes.forEach(detach);
			t361 = claim_space(section4_nodes);
			p64 = claim_element(section4_nodes, "P", {});
			var p64_nodes = children(p64);
			t362 = claim_text(p64_nodes, "The function takes in number indicating how many time the return function would fail, before succeeding thereafter");
			p64_nodes.forEach(detach);
			t363 = claim_space(section4_nodes);
			pre35 = claim_element(section4_nodes, "PRE", { class: true });
			var pre35_nodes = children(pre35);
			pre35_nodes.forEach(detach);
			t364 = claim_space(section4_nodes);
			p65 = claim_element(section4_nodes, "P", {});
			var p65_nodes = children(p65);
			t365 = claim_text(p65_nodes, "To know how many times the function is called, we can track it with a variable");
			p65_nodes.forEach(detach);
			t366 = claim_space(section4_nodes);
			pre36 = claim_element(section4_nodes, "PRE", { class: true });
			var pre36_nodes = children(pre36);
			pre36_nodes.forEach(detach);
			t367 = claim_space(section4_nodes);
			p66 = claim_element(section4_nodes, "P", {});
			var p66_nodes = children(p66);
			t368 = claim_text(p66_nodes, "As long as the number of times called is less than the number of time it should fail, it will fail.");
			p66_nodes.forEach(detach);
			t369 = claim_space(section4_nodes);
			pre37 = claim_element(section4_nodes, "PRE", { class: true });
			var pre37_nodes = children(pre37);
			pre37_nodes.forEach(detach);
			t370 = claim_space(section4_nodes);
			p67 = claim_element(section4_nodes, "P", {});
			var p67_nodes = children(p67);
			t371 = claim_text(p67_nodes, "Next, to verify the function get called a certain number of times, we can create a \"spy\" function:");
			p67_nodes.forEach(detach);
			t372 = claim_space(section4_nodes);
			pre38 = claim_element(section4_nodes, "PRE", { class: true });
			var pre38_nodes = children(pre38);
			pre38_nodes.forEach(detach);
			t373 = claim_space(section4_nodes);
			p68 = claim_element(section4_nodes, "P", {});
			var p68_nodes = children(p68);
			t374 = claim_text(p68_nodes, "So, let's put all of them together:");
			p68_nodes.forEach(detach);
			t375 = claim_space(section4_nodes);
			pre39 = claim_element(section4_nodes, "PRE", { class: true });
			var pre39_nodes = children(pre39);
			pre39_nodes.forEach(detach);
			section4_nodes.forEach(detach);
			t376 = claim_space(nodes);
			section5 = claim_element(nodes, "SECTION", {});
			var section5_nodes = children(section5);
			h24 = claim_element(section5_nodes, "H2", {});
			var h24_nodes = children(h24);
			a13 = claim_element(h24_nodes, "A", { href: true, id: true });
			var a13_nodes = children(a13);
			t377 = claim_text(a13_nodes, "Closing Note");
			a13_nodes.forEach(detach);
			h24_nodes.forEach(detach);
			t378 = claim_space(section5_nodes);
			p69 = claim_element(section5_nodes, "P", {});
			var p69_nodes = children(p69);
			t379 = claim_text(p69_nodes, "We've seen how we can retry an asynchronous function using the callback pattern, promise chain pattern and ");
			code79 = claim_element(p69_nodes, "CODE", {});
			var code79_nodes = children(code79);
			t380 = claim_text(code79_nodes, "async");
			code79_nodes.forEach(detach);
			t381 = claim_text(p69_nodes, " + ");
			code80 = claim_element(p69_nodes, "CODE", {});
			var code80_nodes = children(code80);
			t382 = claim_text(code80_nodes, "await");
			code80_nodes.forEach(detach);
			t383 = claim_text(p69_nodes, ".");
			p69_nodes.forEach(detach);
			t384 = claim_space(section5_nodes);
			p70 = claim_element(section5_nodes, "P", {});
			var p70_nodes = children(p70);
			t385 = claim_text(p70_nodes, "Each of the 3 methods is important in its on right, albeit some is more verbose than another.");
			p70_nodes.forEach(detach);
			t386 = claim_space(section5_nodes);
			p71 = claim_element(section5_nodes, "P", {});
			var p71_nodes = children(p71);
			t387 = claim_text(p71_nodes, "Lastly, we also cover how to write test to verify our code, and also how to create the mock function to facilitate our test cases.");
			p71_nodes.forEach(detach);
			section5_nodes.forEach(detach);
			this.h();
		},
		h() {
			attr(a0, "href", "#the-callback-pattern");
			attr(a1, "href", "#the-promise-chain");
			attr(a2, "href", "#async-await");
			attr(a3, "href", "#testing");
			attr(a4, "href", "#closing-note");
			attr(ul0, "class", "sitemap");
			attr(ul0, "id", "sitemap");
			attr(ul0, "role", "navigation");
			attr(ul0, "aria-label", "Table of Contents");
			attr(a5, "href", "#the-callback-pattern");
			attr(a5, "id", "the-callback-pattern");
			attr(a6, "href", "https://gist.github.com/sunnycmf/b2ad4f80a3b627f04ff2");
			attr(a6, "rel", "nofollow");
			attr(pre0, "class", "language-js");
			attr(pre1, "class", "language-js");
			attr(pre2, "class", "language-js");
			attr(pre3, "class", "language-js");
			attr(pre4, "class", "language-js");
			attr(a7, "href", "http://callbackhell.com/");
			attr(a7, "rel", "nofollow");
			attr(pre5, "class", "language-js");
			attr(pre6, "class", "language-js");
			if (img.src !== (img_src_value = __build_img__0)) attr(img, "src", img_src_value);
			attr(img, "alt", "recursive pattern");
			attr(pre7, "class", "language-js");
			attr(a8, "href", "#the-promise-chain");
			attr(a8, "id", "the-promise-chain");
			attr(a9, "href", "https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Promise");
			attr(a9, "rel", "nofollow");
			attr(pre8, "class", "language-js");
			attr(a10, "href", "https://www.javascripttutorial.net/es6/promise-chaining/");
			attr(a10, "rel", "nofollow");
			attr(pre9, "class", "language-js");
			attr(pre10, "class", "language-js");
			attr(pre11, "class", "language-js");
			attr(pre12, "class", "language-js");
			attr(pre13, "class", "language-js");
			attr(pre14, "class", "language-js");
			attr(pre15, "class", "language-js");
			attr(pre16, "class", "language-js");
			attr(pre17, "class", "language-js");
			attr(pre18, "class", "language-js");
			attr(pre19, "class", "language-js");
			attr(a11, "href", "#async-await");
			attr(a11, "id", "async-await");
			attr(pre20, "class", "language-js");
			attr(pre21, "class", "language-js");
			attr(pre22, "class", "language-js");
			attr(pre23, "class", "language-js");
			attr(pre24, "class", "language-js");
			attr(pre25, "class", "language-js");
			attr(pre26, "class", "language-js");
			attr(pre27, "class", "language-js");
			attr(pre28, "class", "language-js");
			attr(pre29, "class", "language-js");
			attr(pre30, "class", "language-js");
			attr(pre31, "class", "language-js");
			attr(pre32, "class", "language-js");
			attr(pre33, "class", "language-js");
			attr(a12, "href", "#testing");
			attr(a12, "id", "testing");
			attr(pre34, "class", "language-js");
			attr(pre35, "class", "language-js");
			attr(pre36, "class", "language-js");
			attr(pre37, "class", "language-js");
			attr(pre38, "class", "language-js");
			attr(pre39, "class", "language-js");
			attr(a13, "href", "#closing-note");
			attr(a13, "id", "closing-note");
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
			insert(target, t5, anchor);
			insert(target, p0, anchor);
			append(p0, t6);
			insert(target, t7, anchor);
			insert(target, p1, anchor);
			append(p1, t8);
			insert(target, t9, anchor);
			insert(target, p2, anchor);
			append(p2, t10);
			insert(target, t11, anchor);
			insert(target, section1, anchor);
			append(section1, h20);
			append(h20, a5);
			append(a5, t12);
			append(section1, t13);
			append(section1, p3);
			append(p3, t14);
			append(p3, a6);
			append(a6, t15);
			append(p3, t16);
			append(section1, t17);
			append(section1, ul1);
			append(ul1, li5);
			append(li5, t18);
			append(ul1, t19);
			append(ul1, li6);
			append(li6, t20);
			append(section1, t21);
			append(section1, pre0);
			pre0.innerHTML = raw0_value;
			append(section1, t22);
			append(section1, p4);
			append(p4, t23);
			append(p4, code0);
			append(code0, t24);
			append(p4, t25);
			append(p4, code1);
			append(code1, t26);
			append(p4, t27);
			append(p4, code2);
			append(code2, t28);
			append(p4, t29);
			append(section1, t30);
			append(section1, pre1);
			pre1.innerHTML = raw1_value;
			append(section1, t31);
			append(section1, p5);
			append(p5, t32);
			append(p5, code3);
			append(code3, t33);
			append(p5, t34);
			append(section1, t35);
			append(section1, pre2);
			pre2.innerHTML = raw2_value;
			append(section1, t36);
			append(section1, p6);
			append(p6, t37);
			append(p6, code4);
			append(code4, t38);
			append(p6, t39);
			append(section1, t40);
			append(section1, pre3);
			pre3.innerHTML = raw3_value;
			append(section1, t41);
			append(section1, p7);
			append(p7, t42);
			append(section1, t43);
			append(section1, pre4);
			pre4.innerHTML = raw4_value;
			append(section1, t44);
			append(section1, p8);
			append(p8, t45);
			append(p8, code5);
			append(code5, t46);
			append(p8, t47);
			append(section1, t48);
			append(section1, p9);
			append(p9, t49);
			append(p9, a7);
			append(a7, t50);
			append(p9, t51);
			append(section1, t52);
			append(section1, p10);
			append(p10, t53);
			append(section1, t54);
			append(section1, pre5);
			pre5.innerHTML = raw5_value;
			append(section1, t55);
			append(section1, p11);
			append(p11, t56);
			append(p11, code6);
			append(code6, t57);
			append(p11, t58);
			append(section1, t59);
			append(section1, p12);
			append(p12, t60);
			append(p12, code7);
			append(code7, t61);
			append(p12, t62);
			append(section1, t63);
			append(section1, p13);
			append(p13, t64);
			append(p13, code8);
			append(code8, t65);
			append(p13, t66);
			append(section1, t67);
			append(section1, pre6);
			pre6.innerHTML = raw6_value;
			append(section1, t68);
			append(section1, p14);
			append(p14, t69);
			append(p14, code9);
			append(code9, t70);
			append(p14, t71);
			append(section1, t72);
			append(section1, p15);
			append(p15, t73);
			append(section1, t74);
			append(section1, p16);
			append(p16, img);
			append(section1, t75);
			append(section1, p17);
			append(p17, t76);
			append(section1, t77);
			append(section1, p18);
			append(p18, t78);
			append(section1, t79);
			append(section1, pre7);
			pre7.innerHTML = raw7_value;
			append(section1, t80);
			append(section1, p19);
			append(p19, t81);
			append(section1, t82);
			append(section1, p20);
			append(p20, t83);
			insert(target, t84, anchor);
			insert(target, section2, anchor);
			append(section2, h21);
			append(h21, a8);
			append(a8, t85);
			append(section2, t86);
			append(section2, p21);
			append(p21, t87);
			append(p21, a9);
			append(a9, t88);
			append(p21, t89);
			append(section2, t90);
			append(section2, p22);
			append(p22, t91);
			append(p22, code10);
			append(code10, t92);
			append(p22, t93);
			append(p22, code11);
			append(code11, t94);
			append(p22, t95);
			append(p22, code12);
			append(code12, t96);
			append(p22, t97);
			append(p22, code13);
			append(code13, t98);
			append(p22, t99);
			append(section2, t100);
			append(section2, pre8);
			pre8.innerHTML = raw8_value;
			append(section2, t101);
			append(section2, p23);
			append(p23, t102);
			append(p23, code14);
			append(code14, t103);
			append(p23, t104);
			append(p23, code15);
			append(code15, t105);
			append(p23, t106);
			append(p23, a10);
			append(a10, t107);
			append(p23, t108);
			append(section2, t109);
			append(section2, p24);
			append(p24, t110);
			append(p24, code16);
			append(code16, t111);
			append(p24, t112);
			append(p24, code17);
			append(code17, t113);
			append(p24, t114);
			append(section2, t115);
			append(section2, pre9);
			pre9.innerHTML = raw9_value;
			append(section2, t116);
			append(section2, p25);
			append(p25, t117);
			append(p25, code18);
			append(code18, t118);
			append(p25, t119);
			append(section2, t120);
			append(section2, pre10);
			pre10.innerHTML = raw10_value;
			append(section2, t121);
			append(section2, p26);
			append(p26, t122);
			append(p26, code19);
			append(code19, t123);
			append(p26, t124);
			append(p26, code20);
			append(code20, t125);
			append(p26, t126);
			append(section2, t127);
			append(section2, pre11);
			pre11.innerHTML = raw11_value;
			append(section2, t128);
			append(section2, p27);
			append(p27, t129);
			append(p27, code21);
			append(code21, t130);
			append(p27, t131);
			append(section2, t132);
			append(section2, pre12);
			pre12.innerHTML = raw12_value;
			append(section2, t133);
			append(section2, p28);
			append(p28, t134);
			append(p28, em);
			append(em, t135);
			append(p28, t136);
			append(p28, code22);
			append(code22, t137);
			append(p28, t138);
			append(p28, code23);
			append(code23, t139);
			append(p28, t140);
			append(section2, t141);
			append(section2, p29);
			append(p29, t142);
			append(p29, code24);
			append(code24, t143);
			append(p29, t144);
			append(p29, code25);
			append(code25, t145);
			append(p29, t146);
			append(section2, t147);
			append(section2, p30);
			append(p30, t148);
			append(p30, code26);
			append(code26, t149);
			append(p30, t150);
			append(p30, code27);
			append(code27, t151);
			append(p30, t152);
			append(section2, t153);
			append(section2, pre13);
			pre13.innerHTML = raw13_value;
			append(section2, t154);
			append(section2, p31);
			append(p31, t155);
			append(section2, t156);
			append(section2, pre14);
			pre14.innerHTML = raw14_value;
			append(section2, t157);
			append(section2, p32);
			append(p32, t158);
			append(p32, code28);
			append(code28, t159);
			append(p32, t160);
			append(section2, t161);
			append(section2, pre15);
			pre15.innerHTML = raw15_value;
			append(section2, t162);
			append(section2, p33);
			append(p33, t163);
			append(p33, code29);
			append(code29, t164);
			append(p33, t165);
			append(section2, t166);
			append(section2, p34);
			append(p34, t167);
			append(p34, code30);
			append(code30, t168);
			append(p34, t169);
			append(section2, t170);
			append(section2, pre16);
			pre16.innerHTML = raw16_value;
			append(section2, t171);
			append(section2, p35);
			append(p35, t172);
			append(p35, code31);
			append(code31, t173);
			append(p35, t174);
			append(p35, code32);
			append(code32, t175);
			append(p35, t176);
			append(section2, t177);
			append(section2, p36);
			append(p36, strong);
			append(strong, t178);
			append(strong, code33);
			append(code33, t179);
			append(strong, t180);
			append(section2, t181);
			append(section2, pre17);
			pre17.innerHTML = raw17_value;
			append(section2, t182);
			append(section2, p37);
			append(p37, t183);
			append(p37, code34);
			append(code34, t184);
			append(p37, t185);
			append(p37, code35);
			append(code35, t186);
			append(p37, t187);
			append(p37, code36);
			append(code36, t188);
			append(p37, t189);
			append(section2, t190);
			append(section2, pre18);
			pre18.innerHTML = raw18_value;
			append(section2, t191);
			append(section2, p38);
			append(p38, t192);
			append(p38, code37);
			append(code37, t193);
			append(p38, t194);
			append(p38, code38);
			append(code38, t195);
			append(p38, t196);
			append(section2, t197);
			append(section2, pre19);
			pre19.innerHTML = raw19_value;
			append(section2, t198);
			append(section2, p39);
			append(p39, t199);
			insert(target, t200, anchor);
			insert(target, section3, anchor);
			append(section3, h22);
			append(h22, a11);
			append(a11, t201);
			append(section3, t202);
			append(section3, p40);
			append(p40, t203);
			append(p40, code39);
			append(code39, t204);
			append(p40, t205);
			append(section3, t206);
			append(section3, p41);
			append(p41, t207);
			append(section3, t208);
			append(section3, pre20);
			pre20.innerHTML = raw20_value;
			append(section3, t209);
			append(section3, p42);
			append(p42, t210);
			append(section3, t211);
			append(section3, pre21);
			pre21.innerHTML = raw21_value;
			append(section3, t212);
			append(section3, p43);
			append(p43, t213);
			append(section3, t214);
			append(section3, pre22);
			pre22.innerHTML = raw22_value;
			append(section3, t215);
			append(section3, p44);
			append(p44, t216);
			append(p44, code40);
			append(code40, t217);
			append(p44, t218);
			append(section3, t219);
			append(section3, p45);
			append(p45, t220);
			append(p45, code41);
			append(code41, t221);
			append(p45, t222);
			append(p45, code42);
			append(code42, t223);
			append(p45, t224);
			append(section3, t225);
			append(section3, p46);
			append(p46, t226);
			append(p46, code43);
			append(code43, t227);
			append(p46, t228);
			append(section3, t229);
			append(section3, p47);
			append(p47, t230);
			append(p47, code44);
			append(code44, t231);
			append(p47, t232);
			append(section3, t233);
			append(section3, pre23);
			pre23.innerHTML = raw23_value;
			append(section3, t234);
			append(section3, p48);
			append(p48, t235);
			append(p48, code45);
			append(code45, t236);
			append(p48, t237);
			append(p48, code46);
			append(code46, t238);
			append(p48, t239);
			append(section3, t240);
			append(section3, pre24);
			pre24.innerHTML = raw24_value;
			append(section3, t241);
			append(section3, p49);
			append(p49, t242);
			append(p49, code47);
			append(code47, t243);
			append(p49, t244);
			append(p49, code48);
			append(code48, t245);
			append(p49, t246);
			append(p49, code49);
			append(code49, t247);
			append(p49, t248);
			append(section3, t249);
			append(section3, pre25);
			pre25.innerHTML = raw25_value;
			append(section3, t250);
			append(section3, p50);
			append(p50, t251);
			append(p50, code50);
			append(code50, t252);
			append(p50, t253);
			append(section3, t254);
			append(section3, pre26);
			pre26.innerHTML = raw26_value;
			append(section3, t255);
			append(section3, p51);
			append(p51, t256);
			append(p51, code51);
			append(code51, t257);
			append(p51, t258);
			append(p51, code52);
			append(code52, t259);
			append(p51, t260);
			append(p51, code53);
			append(code53, t261);
			append(p51, t262);
			append(p51, code54);
			append(code54, t263);
			append(p51, t264);
			append(p51, code55);
			append(code55, t265);
			append(section3, t266);
			append(section3, pre27);
			pre27.innerHTML = raw27_value;
			append(section3, t267);
			append(section3, p52);
			append(p52, t268);
			append(p52, code56);
			append(code56, t269);
			append(p52, t270);
			append(p52, code57);
			append(code57, t271);
			append(p52, t272);
			append(section3, t273);
			append(section3, pre28);
			pre28.innerHTML = raw28_value;
			append(section3, t274);
			append(section3, p53);
			append(p53, t275);
			append(p53, code58);
			append(code58, t276);
			append(p53, t277);
			append(section3, t278);
			append(section3, pre29);
			pre29.innerHTML = raw29_value;
			append(section3, t279);
			append(section3, p54);
			append(p54, t280);
			append(p54, code59);
			append(code59, t281);
			append(section3, t282);
			append(section3, pre30);
			pre30.innerHTML = raw30_value;
			append(section3, t283);
			append(section3, p55);
			append(p55, t284);
			append(p55, code60);
			append(code60, t285);
			append(p55, t286);
			append(p55, code61);
			append(code61, t287);
			append(p55, t288);
			append(section3, t289);
			append(section3, pre31);
			pre31.innerHTML = raw31_value;
			append(section3, t290);
			append(section3, p56);
			append(p56, t291);
			append(p56, code62);
			append(code62, t292);
			append(p56, t293);
			append(section3, t294);
			append(section3, p57);
			append(p57, t295);
			append(p57, code63);
			append(code63, t296);
			append(p57, t297);
			append(section3, t298);
			append(section3, pre32);
			pre32.innerHTML = raw32_value;
			append(section3, t299);
			append(section3, p58);
			append(p58, t300);
			append(p58, code64);
			append(code64, t301);
			append(p58, t302);
			append(p58, code65);
			append(code65, t303);
			append(p58, t304);
			append(section3, t305);
			append(section3, pre33);
			pre33.innerHTML = raw33_value;
			append(section3, t306);
			append(section3, p59);
			append(p59, t307);
			append(p59, code66);
			append(code66, t308);
			append(p59, t309);
			append(p59, code67);
			append(code67, t310);
			append(p59, t311);
			insert(target, t312, anchor);
			insert(target, section4, anchor);
			append(section4, h23);
			append(h23, a12);
			append(a12, t313);
			append(section4, t314);
			append(section4, p60);
			append(p60, t315);
			append(p60, code68);
			append(code68, t316);
			append(p60, t317);
			append(p60, code69);
			append(code69, t318);
			append(p60, t319);
			append(section4, t320);
			append(section4, p61);
			append(p61, t321);
			append(section4, t322);
			append(section4, ul6);
			append(ul6, li9);
			append(li9, code70);
			append(code70, t323);
			append(li9, t324);
			append(li9, ul2);
			append(ul2, li7);
			append(li7, t325);
			append(li7, code71);
			append(code71, t326);
			append(li7, t327);
			append(ul2, t328);
			append(ul2, li8);
			append(li8, t329);
			append(ul6, t330);
			append(ul6, li12);
			append(li12, code72);
			append(code72, t331);
			append(li12, t332);
			append(li12, ul3);
			append(ul3, li10);
			append(li10, t333);
			append(li10, code73);
			append(code73, t334);
			append(li10, t335);
			append(ul3, t336);
			append(ul3, li11);
			append(li11, t337);
			append(ul6, t338);
			append(ul6, li15);
			append(li15, code74);
			append(code74, t339);
			append(li15, t340);
			append(li15, ul4);
			append(ul4, li13);
			append(li13, t341);
			append(li13, code75);
			append(code75, t342);
			append(li13, t343);
			append(ul4, t344);
			append(ul4, li14);
			append(li14, t345);
			append(ul6, t346);
			append(ul6, li18);
			append(li18, code76);
			append(code76, t347);
			append(li18, t348);
			append(li18, ul5);
			append(ul5, li16);
			append(li16, t349);
			append(li16, code77);
			append(code77, t350);
			append(li16, t351);
			append(ul5, t352);
			append(ul5, li17);
			append(li17, t353);
			append(section4, t354);
			append(section4, p62);
			append(p62, t355);
			append(p62, code78);
			append(code78, t356);
			append(p62, t357);
			append(section4, t358);
			append(section4, p63);
			append(p63, t359);
			append(section4, t360);
			append(section4, pre34);
			pre34.innerHTML = raw34_value;
			append(section4, t361);
			append(section4, p64);
			append(p64, t362);
			append(section4, t363);
			append(section4, pre35);
			pre35.innerHTML = raw35_value;
			append(section4, t364);
			append(section4, p65);
			append(p65, t365);
			append(section4, t366);
			append(section4, pre36);
			pre36.innerHTML = raw36_value;
			append(section4, t367);
			append(section4, p66);
			append(p66, t368);
			append(section4, t369);
			append(section4, pre37);
			pre37.innerHTML = raw37_value;
			append(section4, t370);
			append(section4, p67);
			append(p67, t371);
			append(section4, t372);
			append(section4, pre38);
			pre38.innerHTML = raw38_value;
			append(section4, t373);
			append(section4, p68);
			append(p68, t374);
			append(section4, t375);
			append(section4, pre39);
			pre39.innerHTML = raw39_value;
			insert(target, t376, anchor);
			insert(target, section5, anchor);
			append(section5, h24);
			append(h24, a13);
			append(a13, t377);
			append(section5, t378);
			append(section5, p69);
			append(p69, t379);
			append(p69, code79);
			append(code79, t380);
			append(p69, t381);
			append(p69, code80);
			append(code80, t382);
			append(p69, t383);
			append(section5, t384);
			append(section5, p70);
			append(p70, t385);
			append(section5, t386);
			append(section5, p71);
			append(p71, t387);
		},
		p: noop,
		d(detaching) {
			if (detaching) detach(section0);
			if (detaching) detach(t5);
			if (detaching) detach(p0);
			if (detaching) detach(t7);
			if (detaching) detach(p1);
			if (detaching) detach(t9);
			if (detaching) detach(p2);
			if (detaching) detach(t11);
			if (detaching) detach(section1);
			if (detaching) detach(t84);
			if (detaching) detach(section2);
			if (detaching) detach(t200);
			if (detaching) detach(section3);
			if (detaching) detach(t312);
			if (detaching) detach(section4);
			if (detaching) detach(t376);
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
	"title": "Retry asynchronous function using the callback pattern, promise chain and async await",
	"date": "2020-06-21T08:00:00Z",
	"tags": ["JavaScript", "Asynchronous", "Problem Solving"],
	"description": "How to retry asynchronous function using the callback pattern, promise chain and async await. Mental model for asynchronous JavaScript.",
	"slug": "retry-async-function-with-callback-promise",
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
