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

var __build_img_webp__0 = "aacfcdde0ef957c2.webp";

var __build_img__0 = "aacfcdde0ef957c2.png";

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

var image = "https://lihautan.com/contributing-to-svelte-fixing-issue-4392/assets/hero-twitter-b9c07d38.jpg";

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
					"@id": "https%3A%2F%2Flihautan.com%2Fcontributing-to-svelte-fixing-issue-4392",
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
			attr(meta11, "content", "https%3A%2F%2Flihautan.com%2Fcontributing-to-svelte-fixing-issue-4392");
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
							"@id": "https%3A%2F%2Flihautan.com%2Fcontributing-to-svelte-fixing-issue-4392",
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
	let { title = "" } = $$props;
	let { description = "" } = $$props;
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
		init(this, options, instance$2, create_fragment$2, safe_not_equal, { title: 0, description: 1, tags: 2 });
	}
}

/* content/blog/contributing-to-svelte-fixing-issue-4392/@@page-markup.svelte generated by Svelte v3.24.0 */

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
	let t10;
	let p1;
	let t11;
	let t12;
	let ul1;
	let li6;
	let t13;
	let a7;
	let t14;
	let t15;
	let li7;
	let t16;
	let t17;
	let li8;
	let t18;
	let t19;
	let p2;
	let t20;
	let a8;
	let t21;
	let t22;
	let t23;
	let p3;
	let t24;
	let t25;
	let p4;
	let t26;
	let t27;
	let p5;
	let t28;
	let t29;
	let p6;
	let t30;
	let t31;
	let section2;
	let h21;
	let a9;
	let t32;
	let t33;
	let p7;
	let t34;
	let a10;
	let t35;
	let t36;
	let t37;
	let hr0;
	let t38;
	let p8;
	let strong0;
	let t39;
	let a11;
	let t40;
	let t41;
	let p9;
	let t42;
	let code0;
	let t43;
	let t44;
	let t45;
	let pre0;

	let raw0_value = `<code class="language-svelte">&lt;script&gt;
  let value = [&#39;Hello&#39;, &#39;World&#39;];
&lt;/script&gt;

&lt;select multiple &#123;value&#125; &#123;...&#123;&#125;&#125;&gt;
  &lt;option&gt;Hello&lt;/option&gt;
  &lt;option&gt;World&lt;/option&gt;
&lt;/select&gt;</code>` + "";

	let t46;
	let p10;
	let t47;
	let a12;
	let t48;
	let t49;
	let t50;
	let hr1;
	let t51;
	let section3;
	let h22;
	let a13;
	let t52;
	let t53;
	let p11;
	let t54;
	let t55;
	let p12;
	let t56;
	let code1;
	let t57;
	let t58;
	let code2;
	let t59;
	let t60;
	let code3;
	let t61;
	let t62;
	let code4;
	let t63;
	let t64;
	let code5;
	let t65;
	let t66;
	let t67;
	let p13;
	let t68;
	let code6;
	let t69;
	let t70;
	let strong1;
	let t71;
	let t72;
	let code7;
	let t73;
	let t74;
	let t75;
	let p14;
	let t76;
	let a14;
	let t77;
	let t78;
	let strong2;
	let t79;
	let t80;
	let a15;
	let t81;
	let t82;
	let a16;
	let t83;
	let t84;
	let t85;
	let p15;
	let t86;
	let a17;
	let t87;
	let t88;
	let a18;
	let t89;
	let t90;
	let t91;
	let section4;
	let h23;
	let a19;
	let t92;
	let t93;
	let p16;
	let t94;
	let t95;
	let p17;
	let t96;
	let code8;
	let t97;
	let t98;
	let a20;
	let t99;
	let t100;
	let code9;
	let t101;
	let t102;
	let code10;
	let t103;
	let t104;
	let code11;
	let t105;
	let t106;
	let t107;
	let pre1;

	let raw1_value = `
<code class="language-">- /Projects
  - svelte                &lt;-- cloned from https://github.com/sveltejs/svelte
  - test-svelte           &lt;-- initialised with Svelte Template
    - node_modules/svelte &lt;-- symlink to &#96;/Projects/svelte&#96;</code>` + "";

	let t108;
	let p18;
	let t109;
	let code12;
	let t110;
	let t111;
	let t112;
	let p19;
	let t113;
	let strong3;
	let t114;
	let t115;
	let code13;
	let t116;
	let t117;
	let a21;
	let t118;
	let t119;
	let code14;
	let t120;
	let t121;
	let t122;
	let ul2;
	let li9;
	let t123;
	let code15;
	let t124;
	let t125;
	let code16;
	let t126;
	let t127;
	let t128;
	let li10;
	let t129;
	let t130;
	let li11;
	let t131;
	let code17;
	let t132;
	let t133;
	let code18;
	let t134;
	let t135;
	let code19;
	let t136;
	let t137;
	let p20;
	let t138;
	let code20;
	let t139;
	let t140;
	let code21;
	let t141;
	let t142;
	let t143;
	let pre2;

	let raw2_value = `<code class="language-svelte">&lt;script&gt;
  let value = [&#39;Hello&#39;, &#39;World&#39;];
&lt;/script&gt;

&lt;!-- with spread --&gt;
&lt;select multiple &#123;value&#125; &#123;...&#123;&#125;&#125;&gt;
  &lt;option&gt;Hello&lt;/option&gt;
  &lt;option&gt;World&lt;/option&gt;
&lt;/select&gt;

&lt;!-- without spread --&gt;
&lt;select multiple &#123;value&#125;&gt;
  &lt;option&gt;Hello&lt;/option&gt;
  &lt;option&gt;World&lt;/option&gt;
&lt;/select&gt;</code>` + "";

	let t144;
	let p21;
	let t145;
	let t146;
	let pre3;

	let raw3_value = `<code class="language-diff"><span class="token inserted-sign inserted">+ let select_levels = [&#123; multiple: true &#125;, &#123; value: /*value*/ ctx[0] &#125;, &#123;&#125;];
+	let select_data = &#123;&#125;;
+	for (let i = 0; i &lt; select_levels.length; i += 1) &#123;
+	  select_data = assign(select_data, select_levels[i]);
+	&#125;
</span><span class="token deleted-sign deleted">- let select_value_value;
</span>
<span class="token unchanged">  return &#123;
    c() &#123;
      /* ... */
      set_attributes(select, select_data);
    &#125;,
    m(target, anchor) &#123;
      /* ... */
</span><span class="token deleted-sign deleted">-     select_value_value = /*value*/ ctx[0];
</span>
<span class="token deleted-sign deleted">-     for (var i = 0; i &lt; select.options.length; i += 1) &#123;
-       var option = select.options[i];
-       option.selected = ~select_value_value.indexOf(option.__value);
-     &#125;
</span><span class="token unchanged">    &#125;,
</span><span class="token deleted-sign deleted">-   p: noop,
</span><span class="token inserted-sign inserted">+    p(ctx, [dirty]) &#123;
+      set_attributes(select, get_spread_update(select_levels, [&#123; multiple:   true &#125;, dirty &amp; /*value*/ 1 &amp;&amp; &#123; value: /*value*/ ctx[0] &#125;, &#123;&#125;]));
+    &#125;,
</span><span class="token unchanged">    /* ... */
  &#125;;</span></code>` + "";

	let t147;
	let p22;
	let t148;
	let a22;
	let t149;
	let t150;
	let t151;
	let p23;
	let t152;
	let t153;
	let pre4;
	let raw4_value = `<code class="language-svelte">&lt;div foo=&quot;foo&quot; &#123;...bar&#125; baz=&quot;baz&quot; &#123;...qux&#125; /&gt;</code>` + "";
	let t154;
	let p24;
	let t155;
	let t156;
	let pre5;

	let raw5_value = `<code class="language-js"><span class="token keyword">const</span> levels <span class="token operator">=</span> <span class="token punctuation">[</span><span class="token punctuation">&#123;</span> foo<span class="token punctuation">:</span> <span class="token string">'foo'</span> <span class="token punctuation">&#125;</span><span class="token punctuation">,</span> bar<span class="token punctuation">,</span> <span class="token punctuation">&#123;</span> baz<span class="token punctuation">:</span> <span class="token string">'baz'</span> <span class="token punctuation">&#125;</span><span class="token punctuation">,</span> qux<span class="token punctuation">]</span><span class="token punctuation">;</span>
<span class="token comment">// build the attribute maps</span>
<span class="token keyword">const</span> data <span class="token operator">=</span> <span class="token punctuation">&#123;</span><span class="token punctuation">&#125;</span><span class="token punctuation">;</span>
<span class="token keyword">for</span> <span class="token punctuation">(</span><span class="token keyword">let</span> i <span class="token operator">=</span> <span class="token number">0</span><span class="token punctuation">;</span> i <span class="token operator">&lt;</span> levels<span class="token punctuation">.</span><span class="token property-access">length</span><span class="token punctuation">;</span> i<span class="token operator">++</span><span class="token punctuation">)</span> <span class="token punctuation">&#123;</span>
  data <span class="token operator">=</span> <span class="token known-class-name class-name">Object</span><span class="token punctuation">.</span><span class="token method function property-access">assign</span><span class="token punctuation">(</span>data<span class="token punctuation">,</span> levels<span class="token punctuation">[</span>i<span class="token punctuation">]</span><span class="token punctuation">)</span><span class="token punctuation">;</span>
<span class="token punctuation">&#125;</span>

<span class="token comment">// set attribute to element</span>
<span class="token keyword">for</span> <span class="token punctuation">(</span><span class="token keyword">const</span> attributeName <span class="token keyword">in</span> data<span class="token punctuation">)</span> <span class="token punctuation">&#123;</span>
  div<span class="token punctuation">.</span><span class="token method function property-access">setAttribute</span><span class="token punctuation">(</span>attributeName<span class="token punctuation">,</span> data<span class="token punctuation">[</span>attributeName<span class="token punctuation">]</span><span class="token punctuation">)</span><span class="token punctuation">;</span>
<span class="token punctuation">&#125;</span>

<span class="token comment">// if &#96;bar&#96; changed</span>
<span class="token keyword">const</span> updates <span class="token operator">=</span> <span class="token function">get_spread_update</span><span class="token punctuation">(</span>levels<span class="token punctuation">,</span> <span class="token punctuation">[</span><span class="token boolean">false</span><span class="token punctuation">,</span> bar<span class="token punctuation">,</span> <span class="token boolean">false</span><span class="token punctuation">,</span> <span class="token boolean">false</span><span class="token punctuation">]</span><span class="token punctuation">)</span><span class="token punctuation">;</span>
<span class="token comment">// updates will return the updates needed to make, in this case, the diff in &#96;bar&#96;, eg: &#123; aa: '1' &#125;</span>
<span class="token keyword">for</span> <span class="token punctuation">(</span><span class="token keyword">const</span> attributeName <span class="token keyword">in</span> updates<span class="token punctuation">)</span> <span class="token punctuation">&#123;</span>
  div<span class="token punctuation">.</span><span class="token method function property-access">setAttribute</span><span class="token punctuation">(</span>attributeName<span class="token punctuation">,</span> updates<span class="token punctuation">[</span>attributeName<span class="token punctuation">]</span><span class="token punctuation">)</span><span class="token punctuation">;</span>
<span class="token punctuation">&#125;</span></code>` + "";

	let t157;
	let p25;
	let t158;
	let code22;
	let t159;
	let t160;
	let t161;
	let p26;
	let t162;
	let t163;
	let pre6;

	let raw6_value = `<code class="language-js"><span class="token comment">// in &#96;mount&#96; method</span>
<span class="token keyword">for</span> <span class="token punctuation">(</span><span class="token keyword">var</span> i <span class="token operator">=</span> <span class="token number">0</span><span class="token punctuation">;</span> i <span class="token operator">&lt;</span> select<span class="token punctuation">.</span><span class="token property-access">options</span><span class="token punctuation">.</span><span class="token property-access">length</span><span class="token punctuation">;</span> i <span class="token operator">+=</span> <span class="token number">1</span><span class="token punctuation">)</span> <span class="token punctuation">&#123;</span>
  <span class="token keyword">var</span> option <span class="token operator">=</span> select<span class="token punctuation">.</span><span class="token property-access">options</span><span class="token punctuation">[</span>i<span class="token punctuation">]</span><span class="token punctuation">;</span>
  option<span class="token punctuation">.</span><span class="token property-access">selected</span> <span class="token operator">=</span> <span class="token operator">~</span>select_value_value<span class="token punctuation">.</span><span class="token method function property-access">indexOf</span><span class="token punctuation">(</span>option<span class="token punctuation">.</span><span class="token property-access">__value</span><span class="token punctuation">)</span><span class="token punctuation">;</span>
<span class="token punctuation">&#125;</span></code>` + "";

	let t164;
	let p27;
	let t165;
	let code23;
	let t166;
	let t167;
	let code24;
	let t168;
	let t169;
	let t170;
	let p28;
	let t171;
	let code25;
	let t172;
	let t173;
	let t174;
	let pre7;

	let raw7_value = `<code class="language-js">  <span class="token comment">// ...</span>
  <span class="token function">m</span><span class="token punctuation">(</span><span class="token parameter">target<span class="token punctuation">,</span> anchor</span><span class="token punctuation">)</span> <span class="token punctuation">&#123;</span>
    <span class="token function">insert</span><span class="token punctuation">(</span>target<span class="token punctuation">,</span> select<span class="token punctuation">,</span> anchor<span class="token punctuation">)</span><span class="token punctuation">;</span>
    <span class="token function">append</span><span class="token punctuation">(</span>select<span class="token punctuation">,</span> option0<span class="token punctuation">)</span><span class="token punctuation">;</span>
    <span class="token function">append</span><span class="token punctuation">(</span>select<span class="token punctuation">,</span> option1<span class="token punctuation">)</span><span class="token punctuation">;</span>
    <span class="token comment">// highlight-start</span>
    <span class="token keyword">for</span> <span class="token punctuation">(</span><span class="token keyword">var</span> i <span class="token operator">=</span> <span class="token number">0</span><span class="token punctuation">;</span> i <span class="token operator">&lt;</span> select<span class="token punctuation">.</span><span class="token property-access">options</span><span class="token punctuation">.</span><span class="token property-access">length</span><span class="token punctuation">;</span> i <span class="token operator">+=</span> <span class="token number">1</span><span class="token punctuation">)</span> <span class="token punctuation">&#123;</span>
      <span class="token keyword">var</span> option <span class="token operator">=</span> select<span class="token punctuation">.</span><span class="token property-access">options</span><span class="token punctuation">[</span>i<span class="token punctuation">]</span><span class="token punctuation">;</span>
      option<span class="token punctuation">.</span><span class="token property-access">selected</span> <span class="token operator">=</span> <span class="token operator">~</span>ctx<span class="token punctuation">[</span><span class="token number">0</span><span class="token punctuation">]</span><span class="token punctuation">.</span><span class="token method function property-access">indexOf</span><span class="token punctuation">(</span>option<span class="token punctuation">.</span><span class="token property-access">__value</span><span class="token punctuation">)</span><span class="token punctuation">;</span>
    <span class="token punctuation">&#125;</span>
    <span class="token comment">// highlight-end</span>
  <span class="token punctuation">&#125;</span><span class="token punctuation">,</span>
  <span class="token comment">// ...</span></code>` + "";

	let t175;
	let p29;
	let t176;
	let code26;
	let t177;
	let t178;
	let code27;
	let t179;
	let t180;
	let code28;
	let t181;
	let t182;
	let t183;
	let p30;
	let t184;
	let t185;
	let p31;
	let picture;
	let source0;
	let source1;
	let img;
	let img_src_value;
	let t186;
	let p32;
	let t187;
	let code29;
	let t188;
	let t189;
	let t190;
	let p33;
	let t191;
	let t192;
	let p34;
	let t193;
	let strong4;
	let t194;
	let t195;
	let t196;
	let ul3;
	let li12;
	let code30;
	let t197;
	let t198;
	let li13;
	let code31;
	let t199;
	let t200;
	let li14;
	let code32;
	let t201;
	let t202;
	let p35;
	let t203;
	let code33;
	let t204;
	let t205;
	let a23;
	let t206;
	let t207;
	let pre8;

	let raw8_value = `<code class="language-js"><span class="token keyword module">export</span> <span class="token keyword">function</span> <span class="token function">select_options</span><span class="token punctuation">(</span><span class="token parameter">select<span class="token punctuation">,</span> value</span><span class="token punctuation">)</span> <span class="token punctuation">&#123;</span>
  <span class="token keyword">for</span> <span class="token punctuation">(</span><span class="token keyword">let</span> i <span class="token operator">=</span> <span class="token number">0</span><span class="token punctuation">;</span> i <span class="token operator">&lt;</span> select<span class="token punctuation">.</span><span class="token property-access">options</span><span class="token punctuation">.</span><span class="token property-access">length</span><span class="token punctuation">;</span> i <span class="token operator">+=</span> <span class="token number">1</span><span class="token punctuation">)</span> <span class="token punctuation">&#123;</span>
    <span class="token keyword">const</span> option <span class="token operator">=</span> select<span class="token punctuation">.</span><span class="token property-access">options</span><span class="token punctuation">[</span>i<span class="token punctuation">]</span><span class="token punctuation">;</span>
    option<span class="token punctuation">.</span><span class="token property-access">selected</span> <span class="token operator">=</span> <span class="token operator">~</span>value<span class="token punctuation">.</span><span class="token method function property-access">indexOf</span><span class="token punctuation">(</span>option<span class="token punctuation">.</span><span class="token property-access">__value</span><span class="token punctuation">)</span><span class="token punctuation">;</span>
  <span class="token punctuation">&#125;</span>
<span class="token punctuation">&#125;</span></code>` + "";

	let t208;
	let p36;
	let t209;
	let code34;
	let t210;
	let t211;
	let code35;
	let t212;
	let t213;
	let t214;
	let pre9;

	let raw9_value = `<code class="language-js">  <span class="token comment">// ...</span>
  <span class="token function">m</span><span class="token punctuation">(</span><span class="token parameter">target<span class="token punctuation">,</span> anchor</span><span class="token punctuation">)</span> <span class="token punctuation">&#123;</span>
    <span class="token function">insert</span><span class="token punctuation">(</span>target<span class="token punctuation">,</span> select<span class="token punctuation">,</span> anchor<span class="token punctuation">)</span><span class="token punctuation">;</span>
    <span class="token function">append</span><span class="token punctuation">(</span>select<span class="token punctuation">,</span> option0<span class="token punctuation">)</span><span class="token punctuation">;</span>
    <span class="token function">append</span><span class="token punctuation">(</span>select<span class="token punctuation">,</span> option1<span class="token punctuation">)</span><span class="token punctuation">;</span>
    <span class="token comment">// highlight-start</span>
<span class="token operator">-</span>   <span class="token keyword">for</span> <span class="token punctuation">(</span><span class="token keyword">var</span> i <span class="token operator">=</span> <span class="token number">0</span><span class="token punctuation">;</span> i <span class="token operator">&lt;</span> select<span class="token punctuation">.</span><span class="token property-access">options</span><span class="token punctuation">.</span><span class="token property-access">length</span><span class="token punctuation">;</span> i <span class="token operator">+=</span> <span class="token number">1</span><span class="token punctuation">)</span> <span class="token punctuation">&#123;</span>
<span class="token operator">-</span>     <span class="token keyword">var</span> option <span class="token operator">=</span> select<span class="token punctuation">.</span><span class="token property-access">options</span><span class="token punctuation">[</span>i<span class="token punctuation">]</span><span class="token punctuation">;</span>
<span class="token operator">-</span>     option<span class="token punctuation">.</span><span class="token property-access">selected</span> <span class="token operator">=</span> <span class="token operator">~</span>ctx<span class="token punctuation">[</span><span class="token number">0</span><span class="token punctuation">]</span><span class="token punctuation">.</span><span class="token method function property-access">indexOf</span><span class="token punctuation">(</span>option<span class="token punctuation">.</span><span class="token property-access">__value</span><span class="token punctuation">)</span><span class="token punctuation">;</span>
<span class="token operator">-</span>   <span class="token punctuation">&#125;</span>
<span class="token operator">+</span>   <span class="token function">select_options</span><span class="token punctuation">(</span>select<span class="token punctuation">,</span> select_value_value<span class="token punctuation">)</span><span class="token punctuation">;</span>
    <span class="token comment">// highlight-end</span>
  <span class="token punctuation">&#125;</span><span class="token punctuation">,</span>
  <span class="token comment">// ...</span></code>` + "";

	let t215;
	let p37;
	let t216;
	let code36;
	let t217;
	let t218;
	let code37;
	let t219;
	let t220;
	let pre10;

	let raw10_value = `<code class="language-js"><span class="token comment">// filename: src/compiler/compile/render_dom/wrappers/Element/Attribute.ts</span>

updater <span class="token operator">=</span> b<span class="token template-string"><span class="token template-punctuation string">&#96;</span><span class="token string">
  for (var </span><span class="token interpolation"><span class="token interpolation-punctuation punctuation">$&#123;</span>i<span class="token interpolation-punctuation punctuation">&#125;</span></span><span class="token string"> = 0; </span><span class="token interpolation"><span class="token interpolation-punctuation punctuation">$&#123;</span>i<span class="token interpolation-punctuation punctuation">&#125;</span></span><span class="token string"> &lt; </span><span class="token interpolation"><span class="token interpolation-punctuation punctuation">$&#123;</span>element<span class="token punctuation">.</span><span class="token property-access">var</span><span class="token interpolation-punctuation punctuation">&#125;</span></span><span class="token string">.options.length; </span><span class="token interpolation"><span class="token interpolation-punctuation punctuation">$&#123;</span>i<span class="token interpolation-punctuation punctuation">&#125;</span></span><span class="token string"> += 1) &#123;
    var </span><span class="token interpolation"><span class="token interpolation-punctuation punctuation">$&#123;</span>option<span class="token interpolation-punctuation punctuation">&#125;</span></span><span class="token string"> = </span><span class="token interpolation"><span class="token interpolation-punctuation punctuation">$&#123;</span>element<span class="token punctuation">.</span><span class="token property-access">var</span><span class="token interpolation-punctuation punctuation">&#125;</span></span><span class="token string">.options[</span><span class="token interpolation"><span class="token interpolation-punctuation punctuation">$&#123;</span>i<span class="token interpolation-punctuation punctuation">&#125;</span></span><span class="token string">];

    </span><span class="token interpolation"><span class="token interpolation-punctuation punctuation">$&#123;</span>if_statement<span class="token interpolation-punctuation punctuation">&#125;</span></span><span class="token string">
  &#125;
</span><span class="token template-punctuation string">&#96;</span></span><span class="token punctuation">;</span>
block<span class="token punctuation">.</span><span class="token property-access">chunks</span><span class="token punctuation">.</span><span class="token property-access">mount</span><span class="token punctuation">.</span><span class="token method function property-access">push</span><span class="token punctuation">(</span>b<span class="token template-string"><span class="token template-punctuation string">&#96;</span><span class="token string">
  </span><span class="token interpolation"><span class="token interpolation-punctuation punctuation">$&#123;</span>last<span class="token interpolation-punctuation punctuation">&#125;</span></span><span class="token string"> = </span><span class="token interpolation"><span class="token interpolation-punctuation punctuation">$&#123;</span>value<span class="token interpolation-punctuation punctuation">&#125;</span></span><span class="token string">;
  </span><span class="token interpolation"><span class="token interpolation-punctuation punctuation">$&#123;</span>updater<span class="token interpolation-punctuation punctuation">&#125;</span></span><span class="token string">
</span><span class="token template-punctuation string">&#96;</span></span><span class="token punctuation">)</span><span class="token punctuation">;</span></code>` + "";

	let t221;
	let p38;
	let t222;
	let t223;
	let p39;
	let t224;
	let code38;
	let t225;
	let t226;
	let code39;
	let t227;
	let t228;
	let code40;
	let t229;
	let t230;
	let t231;
	let pre11;

	let raw11_value = `<code class="language-js"><span class="token comment">// highlight-start</span>
<span class="token keyword">if</span> <span class="token punctuation">(</span>is_multiple_select<span class="token punctuation">)</span> <span class="token punctuation">&#123;</span>
  updater <span class="token operator">=</span> b<span class="token template-string"><span class="token template-punctuation string">&#96;</span><span class="token string">@select_options(</span><span class="token interpolation"><span class="token interpolation-punctuation punctuation">$&#123;</span>element<span class="token punctuation">.</span><span class="token property-access">var</span><span class="token interpolation-punctuation punctuation">&#125;</span></span><span class="token string">, </span><span class="token interpolation"><span class="token interpolation-punctuation punctuation">$&#123;</span>last<span class="token interpolation-punctuation punctuation">&#125;</span></span><span class="token string">);</span><span class="token template-punctuation string">&#96;</span></span><span class="token punctuation">;</span>
<span class="token punctuation">&#125;</span> <span class="token keyword">else</span> <span class="token punctuation">&#123;</span>
  updater <span class="token operator">=</span> b<span class="token template-string"><span class="token template-punctuation string">&#96;</span><span class="token string">@select_option(</span><span class="token interpolation"><span class="token interpolation-punctuation punctuation">$&#123;</span>element<span class="token punctuation">.</span><span class="token property-access">var</span><span class="token interpolation-punctuation punctuation">&#125;</span></span><span class="token string">, </span><span class="token interpolation"><span class="token interpolation-punctuation punctuation">$&#123;</span>last<span class="token interpolation-punctuation punctuation">&#125;</span></span><span class="token string">);</span><span class="token template-punctuation string">&#96;</span></span><span class="token punctuation">;</span>
<span class="token punctuation">&#125;</span>
<span class="token comment">// highlight-end</span>

block<span class="token punctuation">.</span><span class="token property-access">chunks</span><span class="token punctuation">.</span><span class="token property-access">mount</span><span class="token punctuation">.</span><span class="token method function property-access">push</span><span class="token punctuation">(</span>b<span class="token template-string"><span class="token template-punctuation string">&#96;</span><span class="token string">
  </span><span class="token interpolation"><span class="token interpolation-punctuation punctuation">$&#123;</span>last<span class="token interpolation-punctuation punctuation">&#125;</span></span><span class="token string"> = </span><span class="token interpolation"><span class="token interpolation-punctuation punctuation">$&#123;</span>value<span class="token interpolation-punctuation punctuation">&#125;</span></span><span class="token string">;
  </span><span class="token interpolation"><span class="token interpolation-punctuation punctuation">$&#123;</span>updater<span class="token interpolation-punctuation punctuation">&#125;</span></span><span class="token string">
</span><span class="token template-punctuation string">&#96;</span></span><span class="token punctuation">)</span><span class="token punctuation">;</span></code>` + "";

	let t232;
	let p40;
	let t233;
	let code41;
	let t234;
	let t235;
	let a24;
	let t236;
	let t237;
	let code42;
	let t238;
	let t239;
	let code43;
	let t240;
	let t241;
	let a25;
	let t242;
	let t243;
	let t244;
	let p41;
	let t245;
	let code44;
	let t246;
	let t247;
	let a26;
	let t248;
	let t249;
	let code45;
	let t250;
	let t251;
	let code46;
	let t252;
	let t253;
	let t254;
	let ul4;
	let li15;
	let code47;
	let t255;
	let t256;
	let t257;
	let li16;
	let code48;
	let t258;
	let t259;
	let t260;
	let li17;
	let code49;
	let t261;
	let t262;
	let t263;
	let p42;
	let t264;
	let t265;
	let pre12;

	let raw12_value = `<code class="language-js"><span class="token keyword">const</span> node <span class="token operator">=</span> <span class="token punctuation">&#123;</span> type<span class="token punctuation">:</span> <span class="token string">'Identifier'</span><span class="token punctuation">,</span> name<span class="token punctuation">:</span> <span class="token string">'foo'</span> <span class="token punctuation">&#125;</span><span class="token punctuation">;</span>
<span class="token keyword">const</span> code <span class="token operator">=</span> b<span class="token template-string"><span class="token template-punctuation string">&#96;</span><span class="token string">const </span><span class="token interpolation"><span class="token interpolation-punctuation punctuation">$&#123;</span>node<span class="token interpolation-punctuation punctuation">&#125;</span></span><span class="token string"> = 1;</span><span class="token template-punctuation string">&#96;</span></span><span class="token punctuation">;</span> <span class="token comment">// returns an AST node for &#96;const foo = 1;&#96;</span></code>` + "";

	let t266;
	let p43;
	let code50;
	let t267;
	let t268;
	let code51;
	let t269;
	let t270;
	let a27;
	let t271;
	let t272;
	let code52;
	let t273;
	let t274;
	let t275;
	let pre13;

	let raw13_value = `<code class="language-js"><span class="token keyword">const</span> code <span class="token operator">=</span> b<span class="token template-string"><span class="token template-punctuation string">&#96;</span><span class="token string">@foo(bar)</span><span class="token template-punctuation string">&#96;</span></span><span class="token punctuation">;</span>
<span class="token comment">// turns into</span>

<span class="token comment">// import &#123; foo &#125; from 'svelte/internal';</span>
<span class="token comment">// foo(bar);</span></code>` + "";

	let t276;
	let p44;
	let t277;
	let t278;
	let pre14;

	let raw14_value = `<code class="language-js"><span class="token comment">// highlight-next-line</span>
<span class="token keyword">if</span> <span class="token punctuation">(</span>is_legacy_input_type<span class="token punctuation">)</span> <span class="token punctuation">&#123;</span>
  <span class="token comment">// ...</span>
  <span class="token comment">// highlight-next-line</span>
<span class="token punctuation">&#125;</span> <span class="token keyword">else</span> <span class="token keyword">if</span> <span class="token punctuation">(</span>is_select_value_attribute<span class="token punctuation">)</span> <span class="token punctuation">&#123;</span>
  <span class="token keyword">if</span> <span class="token punctuation">(</span>is_multiple_select<span class="token punctuation">)</span> <span class="token punctuation">&#123;</span>
    updater <span class="token operator">=</span> b<span class="token template-string"><span class="token template-punctuation string">&#96;</span><span class="token string">@select_options(</span><span class="token interpolation"><span class="token interpolation-punctuation punctuation">$&#123;</span>element<span class="token punctuation">.</span><span class="token property-access">var</span><span class="token interpolation-punctuation punctuation">&#125;</span></span><span class="token string">, </span><span class="token interpolation"><span class="token interpolation-punctuation punctuation">$&#123;</span>last<span class="token interpolation-punctuation punctuation">&#125;</span></span><span class="token string">);</span><span class="token template-punctuation string">&#96;</span></span><span class="token punctuation">;</span>
  <span class="token punctuation">&#125;</span> <span class="token keyword">else</span> <span class="token punctuation">&#123;</span>
    updater <span class="token operator">=</span> b<span class="token template-string"><span class="token template-punctuation string">&#96;</span><span class="token string">@select_option(</span><span class="token interpolation"><span class="token interpolation-punctuation punctuation">$&#123;</span>element<span class="token punctuation">.</span><span class="token property-access">var</span><span class="token interpolation-punctuation punctuation">&#125;</span></span><span class="token string">, </span><span class="token interpolation"><span class="token interpolation-punctuation punctuation">$&#123;</span>last<span class="token interpolation-punctuation punctuation">&#125;</span></span><span class="token string">);</span><span class="token template-punctuation string">&#96;</span></span><span class="token punctuation">;</span>
  <span class="token punctuation">&#125;</span>

  block<span class="token punctuation">.</span><span class="token property-access">chunks</span><span class="token punctuation">.</span><span class="token property-access">mount</span><span class="token punctuation">.</span><span class="token method function property-access">push</span><span class="token punctuation">(</span>b<span class="token template-string"><span class="token template-punctuation string">&#96;</span><span class="token string">
    </span><span class="token interpolation"><span class="token interpolation-punctuation punctuation">$&#123;</span>last<span class="token interpolation-punctuation punctuation">&#125;</span></span><span class="token string"> = </span><span class="token interpolation"><span class="token interpolation-punctuation punctuation">$&#123;</span>value<span class="token interpolation-punctuation punctuation">&#125;</span></span><span class="token string">;
    </span><span class="token interpolation"><span class="token interpolation-punctuation punctuation">$&#123;</span>updater<span class="token interpolation-punctuation punctuation">&#125;</span></span><span class="token string">
  </span><span class="token template-punctuation string">&#96;</span></span><span class="token punctuation">)</span><span class="token punctuation">;</span>
<span class="token punctuation">&#125;</span> <span class="token keyword">else</span> <span class="token keyword">if</span> <span class="token punctuation">(</span>is_src<span class="token punctuation">)</span> <span class="token punctuation">&#123;</span>
  <span class="token comment">// ...</span>
<span class="token punctuation">&#125;</span></code>` + "";

	let t279;
	let p45;
	let t280;
	let code53;
	let t281;
	let t282;
	let code54;
	let t283;
	let t284;
	let code55;
	let t285;
	let t286;
	let t287;
	let pre15;

	let raw15_value = `<code class="language-js"><span class="token comment">// highlight-start</span>
<span class="token console class-name">console</span><span class="token punctuation">.</span><span class="token method function property-access">log</span><span class="token punctuation">(</span>
  <span class="token string">'is_legacy_input_type:'</span><span class="token punctuation">,</span>
  is_legacy_input_type<span class="token punctuation">,</span>
  <span class="token string">'is_select_value_attribute:'</span><span class="token punctuation">,</span>
  is_select_value_attribute
<span class="token punctuation">)</span><span class="token punctuation">;</span>
<span class="token comment">// highlight-end</span>
<span class="token keyword">if</span> <span class="token punctuation">(</span>is_legacy_input_type<span class="token punctuation">)</span> <span class="token punctuation">&#123;</span>
  <span class="token comment">// ...</span>
<span class="token punctuation">&#125;</span></code>` + "";

	let t288;
	let p46;
	let t289;
	let code56;
	let t290;
	let t291;
	let t292;
	let p47;
	let t293;
	let code57;
	let t294;
	let t295;
	let t296;
	let p48;
	let t297;
	let code58;
	let t298;
	let t299;
	let code59;
	let t300;
	let t301;
	let t302;
	let pre16;

	let raw16_value = `<code class="language-js"><span class="token function">render</span><span class="token punctuation">(</span><span class="token parameter">block<span class="token punctuation">:</span> <span class="token maybe-class-name">Block</span></span><span class="token punctuation">)</span> <span class="token punctuation">&#123;</span>
  <span class="token comment">// highlight-next-line</span>
  <span class="token console class-name">console</span><span class="token punctuation">.</span><span class="token method function property-access">trace</span><span class="token punctuation">(</span><span class="token string">'trace'</span><span class="token punctuation">)</span><span class="token punctuation">;</span>
  <span class="token comment">// ...</span>
<span class="token punctuation">&#125;</span></code>` + "";

	let t303;
	let pre17;

	let raw17_value = `<code class="language-md">Trace: trace
  <span class="token comment">&lt;!-- highlight-next-line --></span>
  at AttributeWrapper.render (/Projects/svelte/compiler.js:8269:11)
  at /Projects/svelte/compiler.js:10749:14
  at Array.forEach (<span class="token tag"><span class="token tag"><span class="token punctuation">&lt;</span>anonymous</span><span class="token punctuation">></span></span>)
  <span class="token comment">&lt;!-- highlight-next-line --></span>
  at ElementWrapper.add_attributes (/Projects/svelte/compiler.js:10748:19)
  at ElementWrapper.render (/Projects/svelte/compiler.js:10472:8)
  at /Projects/svelte/compiler.js:10454:11
  at Array.forEach (<span class="token tag"><span class="token tag"><span class="token punctuation">&lt;</span>anonymous</span><span class="token punctuation">></span></span>)
  at ElementWrapper.render (/Projects/svelte/compiler.js:10453:24)
  at FragmentWrapper.render (/Projects/svelte/compiler.js:13030:18)
  at new Renderer (/Projects/svelte/compiler.js:13112:17)</code>` + "";

	let t304;
	let p49;
	let t305;
	let a28;
	let t306;
	let t307;
	let pre18;

	let raw18_value = `<code class="language-js"><span class="token function">add_attributes</span><span class="token punctuation">(</span><span class="token parameter">block<span class="token punctuation">:</span> <span class="token maybe-class-name">Block</span></span><span class="token punctuation">)</span> <span class="token punctuation">&#123;</span>
  <span class="token comment">// Get all the class dependencies first</span>
  <span class="token keyword">this</span><span class="token punctuation">.</span><span class="token property-access">attributes</span><span class="token punctuation">.</span><span class="token method function property-access">forEach</span><span class="token punctuation">(</span><span class="token punctuation">(</span><span class="token parameter">attribute</span><span class="token punctuation">)</span> <span class="token arrow operator">=></span> <span class="token punctuation">&#123;</span>
    <span class="token keyword">if</span> <span class="token punctuation">(</span>attribute<span class="token punctuation">.</span><span class="token property-access">node</span><span class="token punctuation">.</span><span class="token property-access">name</span> <span class="token operator">===</span> <span class="token string">'class'</span><span class="token punctuation">)</span> <span class="token punctuation">&#123;</span>
      <span class="token keyword">const</span> dependencies <span class="token operator">=</span> attribute<span class="token punctuation">.</span><span class="token property-access">node</span><span class="token punctuation">.</span><span class="token method function property-access">get_dependencies</span><span class="token punctuation">(</span><span class="token punctuation">)</span><span class="token punctuation">;</span>
      <span class="token keyword">this</span><span class="token punctuation">.</span><span class="token property-access">class_dependencies</span><span class="token punctuation">.</span><span class="token method function property-access">push</span><span class="token punctuation">(</span><span class="token spread operator">...</span>dependencies<span class="token punctuation">)</span><span class="token punctuation">;</span>
    <span class="token punctuation">&#125;</span>
  <span class="token punctuation">&#125;</span><span class="token punctuation">)</span><span class="token punctuation">;</span>

  <span class="token keyword">if</span> <span class="token punctuation">(</span><span class="token keyword">this</span><span class="token punctuation">.</span><span class="token property-access">node</span><span class="token punctuation">.</span><span class="token property-access">attributes</span><span class="token punctuation">.</span><span class="token method function property-access">some</span><span class="token punctuation">(</span><span class="token parameter">attr</span> <span class="token arrow operator">=></span> attr<span class="token punctuation">.</span><span class="token property-access">is_spread</span><span class="token punctuation">)</span><span class="token punctuation">)</span> <span class="token punctuation">&#123;</span>
    <span class="token keyword">this</span><span class="token punctuation">.</span><span class="token method function property-access">add_spread_attributes</span><span class="token punctuation">(</span>block<span class="token punctuation">)</span><span class="token punctuation">;</span>
    <span class="token keyword">return</span><span class="token punctuation">;</span>
  <span class="token punctuation">&#125;</span>

  <span class="token keyword">this</span><span class="token punctuation">.</span><span class="token property-access">attributes</span><span class="token punctuation">.</span><span class="token method function property-access">forEach</span><span class="token punctuation">(</span><span class="token punctuation">(</span><span class="token parameter">attribute</span><span class="token punctuation">)</span> <span class="token arrow operator">=></span> <span class="token punctuation">&#123;</span>
    <span class="token comment">// highlight-next-line</span>
    attribute<span class="token punctuation">.</span><span class="token method function property-access">render</span><span class="token punctuation">(</span>block<span class="token punctuation">)</span><span class="token punctuation">;</span>
  <span class="token punctuation">&#125;</span><span class="token punctuation">)</span><span class="token punctuation">;</span>
<span class="token punctuation">&#125;</span></code>` + "";

	let t308;
	let p50;
	let t309;
	let code60;
	let t310;
	let t311;
	let code61;
	let t312;
	let t313;
	let code62;
	let t314;
	let t315;
	let t316;
	let p51;
	let t317;
	let code63;
	let t318;
	let t319;
	let code64;
	let t320;
	let t321;
	let code65;
	let t322;
	let t323;
	let t324;
	let p52;
	let t325;
	let code66;
	let t326;
	let t327;
	let t328;
	let pre19;

	let raw19_value = `<code class="language-js"><span class="token function">add_spread_attributes</span><span class="token punctuation">(</span><span class="token parameter">block<span class="token punctuation">:</span> <span class="token maybe-class-name">Block</span></span><span class="token punctuation">)</span> <span class="token punctuation">&#123;</span>
  <span class="token comment">// ...</span>
  <span class="token comment">// highlight-start</span>
  <span class="token comment">// for &#96;&lt;select>&#96; element only</span>
  <span class="token keyword">if</span> <span class="token punctuation">(</span><span class="token keyword">this</span><span class="token punctuation">.</span><span class="token property-access">node</span><span class="token punctuation">.</span><span class="token property-access">name</span> <span class="token operator">===</span> <span class="token string">'select'</span><span class="token punctuation">)</span> <span class="token punctuation">&#123;</span>
    block<span class="token punctuation">.</span><span class="token property-access">chunks</span><span class="token punctuation">.</span><span class="token property-access">mount</span><span class="token punctuation">.</span><span class="token method function property-access">push</span><span class="token punctuation">(</span>
      b<span class="token template-string"><span class="token template-punctuation string">&#96;</span><span class="token string">@select_options(</span><span class="token interpolation"><span class="token interpolation-punctuation punctuation">$&#123;</span><span class="token keyword">this</span><span class="token punctuation">.</span><span class="token property-access">var</span><span class="token interpolation-punctuation punctuation">&#125;</span></span><span class="token string">, </span><span class="token interpolation"><span class="token interpolation-punctuation punctuation">$&#123;</span>data<span class="token interpolation-punctuation punctuation">&#125;</span></span><span class="token string">.value);</span><span class="token template-punctuation string">&#96;</span></span>
    <span class="token punctuation">)</span><span class="token punctuation">;</span>
  <span class="token punctuation">&#125;</span>
  <span class="token comment">// highlight-end</span>
<span class="token punctuation">&#125;</span></code>` + "";

	let t329;
	let p53;
	let t330;
	let a29;
	let t331;
	let t332;
	let code67;
	let t333;
	let t334;
	let a30;
	let code68;
	let t335;
	let t336;
	let code69;
	let t337;
	let t338;
	let a31;
	let t339;
	let t340;
	let code70;
	let t341;
	let t342;
	let code71;
	let t343;
	let t344;
	let code72;
	let t345;
	let t346;
	let code73;
	let t347;
	let t348;
	let t349;
	let pre20;

	let raw20_value = `<code class="language-js"><span class="token comment">// push &#96;const foo = 1&#96; to &#96;m()&#96;</span>
block<span class="token punctuation">.</span><span class="token property-access">chunks</span><span class="token punctuation">.</span><span class="token property-access">mount</span><span class="token punctuation">.</span><span class="token method function property-access">push</span><span class="token punctuation">(</span>b<span class="token template-string"><span class="token template-punctuation string">&#96;</span><span class="token string">const foo = 1</span><span class="token template-punctuation string">&#96;</span></span><span class="token punctuation">)</span><span class="token punctuation">;</span>

<span class="token comment">// push &#96;const bar = 2&#96; to &#96;c()&#96;</span>
block<span class="token punctuation">.</span><span class="token property-access">chunks</span><span class="token punctuation">.</span><span class="token property-access">create</span><span class="token punctuation">.</span><span class="token method function property-access">push</span><span class="token punctuation">(</span>b<span class="token template-string"><span class="token template-punctuation string">&#96;</span><span class="token string">const bar = 2</span><span class="token template-punctuation string">&#96;</span></span><span class="token punctuation">)</span><span class="token punctuation">;</span></code>` + "";

	let t350;
	let p54;
	let t351;
	let code74;
	let t352;
	let t353;
	let code75;
	let t354;
	let t355;
	let code76;
	let t356;
	let t357;
	let t358;
	let section5;
	let h24;
	let a32;
	let t359;
	let t360;
	let p55;
	let t361;
	let t362;
	let p56;
	let t363;
	let t364;
	let p57;
	let t365;
	let code77;
	let t366;
	let t367;
	let t368;
	let ul5;
	let li18;
	let t369;
	let code78;
	let t370;
	let t371;
	let code79;
	let t372;
	let t373;
	let t374;
	let li19;
	let t375;
	let code80;
	let t376;
	let t377;
	let t378;
	let p58;
	let t379;
	let t380;
	let p59;
	let t381;
	let t382;
	let pre21;

	let raw21_value = `<code class="language-svelte">&lt;script&gt;
  let value = [&#39;Hello&#39;, &#39;World&#39;];
  export let spread = &#123;&#125;;
&lt;/script&gt;

&lt;select multiple &#123;value&#125; &#123;...spread&#125;&gt;
  &lt;option&gt;Hello&lt;/option&gt;
  &lt;option&gt;World&lt;/option&gt;
&lt;/select&gt;

&lt;input type=&quot;checkbox&quot; value=&quot;Hello&quot; bind:group=&#123;value&#125;&gt;
&lt;input type=&quot;checkbox&quot; value=&quot;World&quot; bind:group=&#123;value&#125;&gt;</code>` + "";

	let t383;
	let p60;
	let t384;
	let code81;
	let t385;
	let t386;
	let code82;
	let t387;
	let t388;
	let code83;
	let t389;
	let t390;
	let t391;
	let p61;
	let t392;
	let code84;
	let t393;
	let t394;
	let code85;
	let t395;
	let t396;
	let code86;
	let t397;
	let t398;
	let code87;
	let t399;
	let t400;
	let code88;
	let t401;
	let t402;
	let code89;
	let t403;
	let t404;
	let code90;
	let t405;
	let t406;
	let t407;
	let p62;
	let t408;
	let t409;
	let p63;
	let t410;
	let t411;
	let p64;
	let t412;
	let code91;
	let t413;
	let t414;
	let code92;
	let t415;
	let t416;
	let code93;
	let t417;
	let t418;
	let t419;
	let p65;
	let code94;
	let t420;
	let t421;
	let t422;
	let pre22;

	let raw22_value = `<code class="language-js"><span class="token comment">// filename: _config.js</span>

<span class="token keyword module">export</span> <span class="token keyword module">default</span> <span class="token punctuation">&#123;</span>
  <span class="token comment">// initial props to passed to the component</span>
  props<span class="token punctuation">:</span> <span class="token punctuation">&#123;</span> <span class="token comment">/*...*/</span> <span class="token punctuation">&#125;</span><span class="token punctuation">,</span>
  <span class="token comment">// initial rendered html</span>
  html<span class="token punctuation">:</span> <span class="token template-string"><span class="token template-punctuation string">&#96;</span><span class="token template-punctuation string">&#96;</span></span><span class="token punctuation">,</span>
  <span class="token comment">// test case</span>
  <span class="token keyword">async</span> <span class="token function">test</span><span class="token punctuation">(</span><span class="token parameter"><span class="token punctuation">&#123;</span> assert<span class="token punctuation">,</span> target <span class="token punctuation">&#125;</span></span><span class="token punctuation">)</span> <span class="token punctuation">&#123;</span>
    <span class="token comment">// you can test the behavior of the component here</span>
  <span class="token punctuation">&#125;</span><span class="token punctuation">,</span>
<span class="token punctuation">&#125;</span><span class="token punctuation">;</span></code>` + "";

	let t423;
	let p66;
	let t424;
	let code95;
	let t425;
	let t426;
	let t427;
	let pre23;

	let raw23_value = `<code class="language-js"><span class="token keyword module">export</span> <span class="token keyword module">default</span> <span class="token punctuation">&#123;</span>
	<span class="token comment">// ...</span>
	<span class="token keyword">async</span> <span class="token function">test</span><span class="token punctuation">(</span><span class="token parameter"><span class="token punctuation">&#123;</span> assert<span class="token punctuation">,</span> target<span class="token punctuation">,</span> <span class="token dom variable">window</span> <span class="token punctuation">&#125;</span></span><span class="token punctuation">)</span> <span class="token punctuation">&#123;</span>
    <span class="token comment">// find the element</span>
		<span class="token keyword">const</span> <span class="token punctuation">[</span>input1<span class="token punctuation">,</span> input2<span class="token punctuation">]</span> <span class="token operator">=</span> target<span class="token punctuation">.</span><span class="token method function property-access">querySelectorAll</span><span class="token punctuation">(</span><span class="token string">"input"</span><span class="token punctuation">)</span><span class="token punctuation">;</span>
		<span class="token keyword">const</span> select <span class="token operator">=</span> target<span class="token punctuation">.</span><span class="token method function property-access">querySelector</span><span class="token punctuation">(</span><span class="token string">"select"</span><span class="token punctuation">)</span><span class="token punctuation">;</span>
		<span class="token keyword">const</span> <span class="token punctuation">[</span>option1<span class="token punctuation">,</span> option2<span class="token punctuation">]</span> <span class="token operator">=</span> select<span class="token punctuation">.</span><span class="token property-access">childNodes</span><span class="token punctuation">;</span>

    <span class="token comment">// uncheck the checkbox</span>
		<span class="token keyword">const</span> event <span class="token operator">=</span> <span class="token keyword">new</span> <span class="token class-name">window<span class="token punctuation">.</span>Event</span><span class="token punctuation">(</span><span class="token string">"change"</span><span class="token punctuation">)</span><span class="token punctuation">;</span>
		input1<span class="token punctuation">.</span><span class="token property-access">checked</span> <span class="token operator">=</span> <span class="token boolean">false</span><span class="token punctuation">;</span>
		<span class="token keyword">await</span> input1<span class="token punctuation">.</span><span class="token method function property-access">dispatchEvent</span><span class="token punctuation">(</span>event<span class="token punctuation">)</span><span class="token punctuation">;</span>

    <span class="token comment">// verify the component updated correctly</span>
		<span class="token keyword">const</span> selections <span class="token operator">=</span> <span class="token known-class-name class-name">Array</span><span class="token punctuation">.</span><span class="token keyword module">from</span><span class="token punctuation">(</span>select<span class="token punctuation">.</span><span class="token property-access">selectedOptions</span><span class="token punctuation">)</span><span class="token punctuation">;</span>
		assert<span class="token punctuation">.</span><span class="token method function property-access">equal</span><span class="token punctuation">(</span>selections<span class="token punctuation">.</span><span class="token property-access">length</span><span class="token punctuation">,</span> <span class="token number">1</span><span class="token punctuation">)</span><span class="token punctuation">;</span>
		assert<span class="token punctuation">.</span><span class="token method function property-access">ok</span><span class="token punctuation">(</span><span class="token operator">!</span>selections<span class="token punctuation">.</span><span class="token method function property-access">includes</span><span class="token punctuation">(</span>option1<span class="token punctuation">)</span><span class="token punctuation">)</span><span class="token punctuation">;</span>
		assert<span class="token punctuation">.</span><span class="token method function property-access">ok</span><span class="token punctuation">(</span>selections<span class="token punctuation">.</span><span class="token method function property-access">includes</span><span class="token punctuation">(</span>option2<span class="token punctuation">)</span><span class="token punctuation">)</span><span class="token punctuation">;</span>
	<span class="token punctuation">&#125;</span><span class="token punctuation">,</span>
<span class="token punctuation">&#125;</span><span class="token punctuation">;</span></code>` + "";

	let t428;
	let p67;
	let t429;
	let code96;
	let t430;
	let t431;
	let t432;
	let pre24;

	let raw24_value = `<code class="language-js"><span class="token keyword module">export</span> <span class="token keyword module">default</span> <span class="token punctuation">&#123;</span>
  <span class="token comment">// highlight-next-line</span>
  solo<span class="token punctuation">:</span> <span class="token boolean">true</span>
<span class="token punctuation">&#125;</span><span class="token punctuation">;</span></code>` + "";

	let t433;
	let p68;
	let strong5;
	let t434;
	let t435;
	let code97;
	let t436;
	let t437;
	let code98;
	let t438;
	let t439;
	let code99;
	let t440;
	let t441;
	let code100;
	let t442;
	let t443;
	let t444;
	let p69;
	let t445;
	let code101;
	let t446;
	let t447;
	let t448;
	let p70;
	let t449;
	let code102;
	let t450;
	let t451;
	let t452;
	let pre25;

	let raw25_value = `<code class="language-js"><span class="token function">add_spread_attributes</span><span class="token punctuation">(</span><span class="token parameter">block<span class="token punctuation">:</span> <span class="token maybe-class-name">Block</span></span><span class="token punctuation">)</span> <span class="token punctuation">&#123;</span>
  <span class="token comment">// ...</span>
  <span class="token keyword">if</span> <span class="token punctuation">(</span><span class="token keyword">this</span><span class="token punctuation">.</span><span class="token property-access">node</span><span class="token punctuation">.</span><span class="token property-access">name</span> <span class="token operator">===</span> <span class="token string">'select'</span><span class="token punctuation">)</span> <span class="token punctuation">&#123;</span>
    block<span class="token punctuation">.</span><span class="token property-access">chunks</span><span class="token punctuation">.</span><span class="token property-access">mount</span><span class="token punctuation">.</span><span class="token method function property-access">push</span><span class="token punctuation">(</span>
      b<span class="token template-string"><span class="token template-punctuation string">&#96;</span><span class="token string">@select_options(</span><span class="token interpolation"><span class="token interpolation-punctuation punctuation">$&#123;</span><span class="token keyword">this</span><span class="token punctuation">.</span><span class="token property-access">var</span><span class="token interpolation-punctuation punctuation">&#125;</span></span><span class="token string">, </span><span class="token interpolation"><span class="token interpolation-punctuation punctuation">$&#123;</span>data<span class="token interpolation-punctuation punctuation">&#125;</span></span><span class="token string">.value);</span><span class="token template-punctuation string">&#96;</span></span>
    <span class="token punctuation">)</span><span class="token punctuation">;</span>
    <span class="token comment">// highlight-start</span>
    block<span class="token punctuation">.</span><span class="token property-access">chunks</span><span class="token punctuation">.</span><span class="token property-access">update</span><span class="token punctuation">.</span><span class="token method function property-access">push</span><span class="token punctuation">(</span>
      b<span class="token template-string"><span class="token template-punctuation string">&#96;</span><span class="token string">@select_options(</span><span class="token interpolation"><span class="token interpolation-punctuation punctuation">$&#123;</span><span class="token keyword">this</span><span class="token punctuation">.</span><span class="token property-access">var</span><span class="token interpolation-punctuation punctuation">&#125;</span></span><span class="token string">, </span><span class="token interpolation"><span class="token interpolation-punctuation punctuation">$&#123;</span>data<span class="token interpolation-punctuation punctuation">&#125;</span></span><span class="token string">.value);</span><span class="token template-punctuation string">&#96;</span></span>
    <span class="token punctuation">)</span><span class="token punctuation">;</span>
    <span class="token comment">// highlight-end</span>
  <span class="token punctuation">&#125;</span>
<span class="token punctuation">&#125;</span></code>` + "";

	let t453;
	let p71;
	let t454;
	let code103;
	let t455;
	let t456;
	let t457;
	let p72;
	let t458;
	let code104;
	let t459;
	let t460;
	let code105;
	let t461;
	let t462;
	let code106;
	let t463;
	let t464;
	let code107;
	let t465;
	let t466;
	let code108;
	let t467;
	let t468;
	let t469;
	let p73;
	let t470;
	let a33;
	let t471;
	let t472;
	let t473;
	let p74;
	let t474;
	let t475;
	let p75;
	let t476;
	let a34;
	let code109;
	let t477;
	let t478;
	let t479;
	let pre26;

	let raw26_value = `<code class="language-js"><span class="token function">add_spread_attributes</span><span class="token punctuation">(</span><span class="token parameter">block<span class="token punctuation">:</span> <span class="token maybe-class-name">Block</span></span><span class="token punctuation">)</span> <span class="token punctuation">&#123;</span>
  <span class="token comment">// ...</span>
  <span class="token keyword">if</span> <span class="token punctuation">(</span><span class="token keyword">this</span><span class="token punctuation">.</span><span class="token property-access">node</span><span class="token punctuation">.</span><span class="token property-access">name</span> <span class="token operator">===</span> <span class="token string">'select'</span><span class="token punctuation">)</span> <span class="token punctuation">&#123;</span>
    <span class="token keyword">const</span> dependencies <span class="token operator">=</span> <span class="token punctuation">[</span><span class="token spread operator">...</span><span class="token punctuation">]</span><span class="token punctuation">;</span>
    block<span class="token punctuation">.</span><span class="token property-access">chunks</span><span class="token punctuation">.</span><span class="token property-access">mount</span><span class="token punctuation">.</span><span class="token method function property-access">push</span><span class="token punctuation">(</span>
      b<span class="token template-string"><span class="token template-punctuation string">&#96;</span><span class="token string">@select_options(</span><span class="token interpolation"><span class="token interpolation-punctuation punctuation">$&#123;</span><span class="token keyword">this</span><span class="token punctuation">.</span><span class="token property-access">var</span><span class="token interpolation-punctuation punctuation">&#125;</span></span><span class="token string">, </span><span class="token interpolation"><span class="token interpolation-punctuation punctuation">$&#123;</span>data<span class="token interpolation-punctuation punctuation">&#125;</span></span><span class="token string">.value);</span><span class="token template-punctuation string">&#96;</span></span>
    <span class="token punctuation">)</span><span class="token punctuation">;</span>
    <span class="token comment">// highlight-start</span>
    block<span class="token punctuation">.</span><span class="token property-access">chunks</span><span class="token punctuation">.</span><span class="token property-access">update</span><span class="token punctuation">.</span><span class="token method function property-access">push</span><span class="token punctuation">(</span>
      <span class="token comment">// block.renderer.dirty(...) will give me &#96;dirty &amp; bitmask&#96;</span>
      b<span class="token template-string"><span class="token template-punctuation string">&#96;</span><span class="token string">if (</span><span class="token interpolation"><span class="token interpolation-punctuation punctuation">$&#123;</span>block<span class="token punctuation">.</span><span class="token property-access">renderer</span><span class="token punctuation">.</span><span class="token method function property-access">dirty</span><span class="token punctuation">(</span>dependencies<span class="token punctuation">)</span><span class="token interpolation-punctuation punctuation">&#125;</span></span><span class="token string">) @select_options(</span><span class="token interpolation"><span class="token interpolation-punctuation punctuation">$&#123;</span><span class="token keyword">this</span><span class="token punctuation">.</span><span class="token property-access">var</span><span class="token interpolation-punctuation punctuation">&#125;</span></span><span class="token string">, </span><span class="token interpolation"><span class="token interpolation-punctuation punctuation">$&#123;</span>data<span class="token interpolation-punctuation punctuation">&#125;</span></span><span class="token string">.value);</span><span class="token template-punctuation string">&#96;</span></span>
    <span class="token punctuation">)</span><span class="token punctuation">;</span>
    <span class="token comment">// highlight-end</span>
  <span class="token punctuation">&#125;</span>
<span class="token punctuation">&#125;</span></code>` + "";

	let t480;
	let p76;
	let t481;
	let t482;
	let pre27;

	let raw27_value = `<code class="language-js"><span class="token function">add_spread_attributes</span><span class="token punctuation">(</span><span class="token parameter">block<span class="token punctuation">:</span> <span class="token maybe-class-name">Block</span></span><span class="token punctuation">)</span> <span class="token punctuation">&#123;</span>
  <span class="token comment">// ...</span>
  <span class="token keyword">if</span> <span class="token punctuation">(</span><span class="token keyword">this</span><span class="token punctuation">.</span><span class="token property-access">node</span><span class="token punctuation">.</span><span class="token property-access">name</span> <span class="token operator">===</span> <span class="token string">'select'</span><span class="token punctuation">)</span> <span class="token punctuation">&#123;</span>
    <span class="token comment">// highlight-start</span>
    <span class="token keyword">const</span> dependencies <span class="token operator">=</span> <span class="token keyword">new</span> <span class="token class-name">Set</span><span class="token punctuation">(</span><span class="token punctuation">)</span><span class="token punctuation">;</span>
    <span class="token keyword">for</span> <span class="token punctuation">(</span><span class="token keyword">const</span> attr <span class="token keyword">of</span> <span class="token keyword">this</span><span class="token punctuation">.</span><span class="token property-access">attributes</span><span class="token punctuation">)</span> <span class="token punctuation">&#123;</span>
      <span class="token keyword">for</span> <span class="token punctuation">(</span><span class="token keyword">const</span> dep <span class="token keyword">of</span> attr<span class="token punctuation">.</span><span class="token property-access">node</span><span class="token punctuation">.</span><span class="token property-access">dependencies</span><span class="token punctuation">)</span> <span class="token punctuation">&#123;</span>
        dependencies<span class="token punctuation">.</span><span class="token method function property-access">add</span><span class="token punctuation">(</span>dep<span class="token punctuation">)</span><span class="token punctuation">;</span>
      <span class="token punctuation">&#125;</span>
    <span class="token punctuation">&#125;</span>
    <span class="token comment">// highlight-end</span>
    block<span class="token punctuation">.</span><span class="token property-access">chunks</span><span class="token punctuation">.</span><span class="token property-access">mount</span><span class="token punctuation">.</span><span class="token method function property-access">push</span><span class="token punctuation">(</span>
      b<span class="token template-string"><span class="token template-punctuation string">&#96;</span><span class="token string">@select_options(</span><span class="token interpolation"><span class="token interpolation-punctuation punctuation">$&#123;</span><span class="token keyword">this</span><span class="token punctuation">.</span><span class="token property-access">var</span><span class="token interpolation-punctuation punctuation">&#125;</span></span><span class="token string">, </span><span class="token interpolation"><span class="token interpolation-punctuation punctuation">$&#123;</span>data<span class="token interpolation-punctuation punctuation">&#125;</span></span><span class="token string">.value);</span><span class="token template-punctuation string">&#96;</span></span>
    <span class="token punctuation">)</span><span class="token punctuation">;</span>
    block<span class="token punctuation">.</span><span class="token property-access">chunks</span><span class="token punctuation">.</span><span class="token property-access">update</span><span class="token punctuation">.</span><span class="token method function property-access">push</span><span class="token punctuation">(</span>
      b<span class="token template-string"><span class="token template-punctuation string">&#96;</span><span class="token string">if (</span><span class="token interpolation"><span class="token interpolation-punctuation punctuation">$&#123;</span>block<span class="token punctuation">.</span><span class="token property-access">renderer</span><span class="token punctuation">.</span><span class="token method function property-access">dirty</span><span class="token punctuation">(</span>dependencies<span class="token punctuation">)</span><span class="token interpolation-punctuation punctuation">&#125;</span></span><span class="token string">) @select_options(</span><span class="token interpolation"><span class="token interpolation-punctuation punctuation">$&#123;</span><span class="token keyword">this</span><span class="token punctuation">.</span><span class="token property-access">var</span><span class="token interpolation-punctuation punctuation">&#125;</span></span><span class="token string">, </span><span class="token interpolation"><span class="token interpolation-punctuation punctuation">$&#123;</span>data<span class="token interpolation-punctuation punctuation">&#125;</span></span><span class="token string">.value);</span><span class="token template-punctuation string">&#96;</span></span>
    <span class="token punctuation">)</span><span class="token punctuation">;</span>
  <span class="token punctuation">&#125;</span>
<span class="token punctuation">&#125;</span></code>` + "";

	let t483;
	let p77;
	let t484;
	let t485;
	let section6;
	let h25;
	let a35;
	let t486;
	let t487;
	let p78;
	let t488;
	let code110;
	let t489;
	let t490;
	let code111;
	let t491;
	let t492;
	let t493;
	let p79;
	let t494;
	let a36;
	let t495;
	let t496;
	let t497;
	let p80;
	let t498;
	let a37;
	let t499;
	let t500;
	let t501;
	let p81;
	let t502;
	let t503;
	let hr2;
	let t504;
	let p82;
	let t505;
	let a38;
	let t506;
	let t507;
	let t508;
	let p83;
	let t509;
	let a39;
	let t510;
	let t511;

	return {
		c() {
			section0 = element("section");
			ul0 = element("ul");
			li0 = element("li");
			a0 = element("a");
			t0 = text("Background");
			li1 = element("li");
			a1 = element("a");
			t1 = text("The story begins");
			li2 = element("li");
			a2 = element("a");
			t2 = text("Verifying the bug");
			li3 = element("li");
			a3 = element("a");
			t3 = text("Investigating the bug");
			li4 = element("li");
			a4 = element("a");
			t4 = text("Fixing the bug");
			li5 = element("li");
			a5 = element("a");
			t5 = text("Submitting the fix");
			t6 = space();
			section1 = element("section");
			h20 = element("h2");
			a6 = element("a");
			t7 = text("Background");
			t8 = space();
			p0 = element("p");
			t9 = text("As Svelte gains more attention, I find that more and more people are interested in contributing to Svelte.");
			t10 = space();
			p1 = element("p");
			t11 = text("Of course, contributing to Svelte, does not mean to contribute only in code, it could be:");
			t12 = space();
			ul1 = element("ul");
			li6 = element("li");
			t13 = text("answering questions about Svelte, on social media, Stack Overflow, or ");
			a7 = element("a");
			t14 = text("Discord");
			t15 = space();
			li7 = element("li");
			t16 = text("improving Svelte docs, or write tutorials and articles about Svelte");
			t17 = space();
			li8 = element("li");
			t18 = text("organising and speaking in meetups about Svelte");
			t19 = space();
			p2 = element("p");
			t20 = text("For those who want to contribute in code, most people are unsure where to start. So I wrote ");
			a8 = element("a");
			t21 = text("The Svelte Compiler Handbook");
			t22 = text(" as an overview of the Svelte source code.");
			t23 = space();
			p3 = element("p");
			t24 = text("However, today, I want to try a different tone.");
			t25 = space();
			p4 = element("p");
			t26 = text("I am going to tell you an anecdote on how I investigated and fixed a bug in Svelte.");
			t27 = space();
			p5 = element("p");
			t28 = text("I documented down my train of thoughts as detailed as possible.");
			t29 = space();
			p6 = element("p");
			t30 = text("I hope this gives anyone who is reading, a glimpse on how to work on the Svelte source code.");
			t31 = space();
			section2 = element("section");
			h21 = element("h2");
			a9 = element("a");
			t32 = text("The story begins");
			t33 = space();
			p7 = element("p");
			t34 = text("I was combing through ");
			a10 = element("a");
			t35 = text("bugs on GitHub");
			t36 = text(", and found this rather interesting bug:");
			t37 = space();
			hr0 = element("hr");
			t38 = space();
			p8 = element("p");
			strong0 = element("strong");
			t39 = text("Select multiple value does not get set with spread props ");
			a11 = element("a");
			t40 = text("#4392");
			t41 = space();
			p9 = element("p");
			t42 = text("Adding any type of spread, even an empty object ");
			code0 = element("code");
			t43 = text("{...{}}");
			t44 = text(", causes the value not to be set:");
			t45 = space();
			pre0 = element("pre");
			t46 = space();
			p10 = element("p");
			t47 = text("To reproduce: ");
			a12 = element("a");
			t48 = text("REPL");
			t49 = text(".");
			t50 = space();
			hr1 = element("hr");
			t51 = space();
			section3 = element("section");
			h22 = element("h2");
			a13 = element("a");
			t52 = text("Verifying the bug");
			t53 = space();
			p11 = element("p");
			t54 = text("I clicked into the REPL and tried to understand about the bug.");
			t55 = space();
			p12 = element("p");
			t56 = text("I found that if the ");
			code1 = element("code");
			t57 = text("<select multiple>");
			t58 = text(" has spread attribute ");
			code2 = element("code");
			t59 = text("{...any}");
			t60 = text(", the ");
			code3 = element("code");
			t61 = text("value");
			t62 = text(" attribute will not be reactive. Changes in the value of ");
			code4 = element("code");
			t63 = text("value");
			t64 = text(" will not be reflected to the ");
			code5 = element("code");
			t65 = text("<select>");
			t66 = text(".");
			t67 = space();
			p13 = element("p");
			t68 = text("I noticed the REPL link uses the version ");
			code6 = element("code");
			t69 = text("3.18.1");
			t70 = text(", it's not the latest version of Svelte. At the point of writing, Svelte is at ");
			strong1 = element("strong");
			t71 = text("3.22.3");
			t72 = text(". I tried removing the ");
			code7 = element("code");
			t73 = text("?version=3.18.1");
			t74 = text(" from the query params to verify whether the bug has fixed, and realised that the bug is still there. (Great! Something interesting to investigate into.)");
			t75 = space();
			p14 = element("p");
			t76 = text("To understand the current status of the issue, I read through the comments. According to ");
			a14 = element("a");
			t77 = text("Conduitry");
			t78 = text(", the issue is related to ");
			strong2 = element("strong");
			t79 = text("Radio/checkbox input with bind:group and spread props makes variable undefined");
			t80 = space();
			a15 = element("a");
			t81 = text("#3680");
			t82 = text(" and can be fixed together. However, the issue ");
			a16 = element("a");
			t83 = text("#3680");
			t84 = text(" was fixed and closed, yet this issue is still open.");
			t85 = space();
			p15 = element("p");
			t86 = text("Nevertheless, I read through ");
			a17 = element("a");
			t87 = text("the PR");
			t88 = text(" for the closed issue ");
			a18 = element("a");
			t89 = text("#3680");
			t90 = text(", roughly understand how it was fixed and hopefully it can give me some inspirations on this issue.");
			t91 = space();
			section4 = element("section");
			h23 = element("h2");
			a19 = element("a");
			t92 = text("Investigating the bug");
			t93 = space();
			p16 = element("p");
			t94 = text("Once I verified that the behavior described in the issue is unexpected and reproducible in the latest version of Svelte, I copied the REPL code into my local machine to investigate.");
			t95 = space();
			p17 = element("p");
			t96 = text("I have a ");
			code8 = element("code");
			t97 = text("test-svelte");
			t98 = text(" folder ready in my local machine, where I created using ");
			a20 = element("a");
			t99 = text("Svelte Template");
			t100 = text(". I have ");
			code9 = element("code");
			t101 = text("npm link");
			t102 = text("ed my local Svelte clone to the ");
			code10 = element("code");
			t103 = text("test-svelte");
			t104 = text(" folder, so I can rebuild ");
			code11 = element("code");
			t105 = text("test-svelte");
			t106 = text(" anytime with the latest changes done to my Svelte clone.");
			t107 = space();
			pre1 = element("pre");
			t108 = space();
			p18 = element("p");
			t109 = text("I have ");
			code12 = element("code");
			t110 = text("yarn dev");
			t111 = text(" running in the Svelte folder, so any changes I make gets compiled immediately.");
			t112 = space();
			p19 = element("p");
			t113 = text("I prefer to ");
			strong3 = element("strong");
			t114 = text("build");
			t115 = space();
			code13 = element("code");
			t116 = text("test-svelte");
			t117 = text(" and serve it with ");
			a21 = element("a");
			t118 = text("http-server");
			t119 = text(" rather than start a dev server ");
			code14 = element("code");
			t120 = text("test-svelte");
			t121 = text(" in watch mode. That allows me to");
			t122 = space();
			ul2 = element("ul");
			li9 = element("li");
			t123 = text("Run the ");
			code15 = element("code");
			t124 = text("http-server");
			t125 = text(" in the background while tweaking the Svelte code or the ");
			code16 = element("code");
			t126 = text("test-svelte");
			t127 = text(" app.");
			t128 = space();
			li10 = element("li");
			t129 = text("Not having to restart the dev server whenever I've made changes to the Svelte code");
			t130 = space();
			li11 = element("li");
			t131 = text("Able to inspect and modify ");
			code17 = element("code");
			t132 = text("bundle.js");
			t133 = text(" without worrying that accidentaly save in the ");
			code18 = element("code");
			t134 = text("test-svelte");
			t135 = text(" app will overwrite the ");
			code19 = element("code");
			t136 = text("bundle.js");
			t137 = space();
			p20 = element("p");
			t138 = text("Looking at the different ");
			code20 = element("code");
			t139 = text("bundle.js");
			t140 = text(" generated from with ");
			code21 = element("code");
			t141 = text("{...spread}");
			t142 = text(" attributes and without spread attributes");
			t143 = space();
			pre2 = element("pre");
			t144 = space();
			p21 = element("p");
			t145 = text("I found the following diffs in the bundled output:");
			t146 = space();
			pre3 = element("pre");
			t147 = space();
			p22 = element("p");
			t148 = text("Well, I know I havn't cover how spread attribute works in any of my ");
			a22 = element("a");
			t149 = text("\"Compile Svelte in your Head\"");
			t150 = text(" articles, but the general idea is that, Svelte builds an array of attributes, and then apply it to the element / Component.");
			t151 = space();
			p23 = element("p");
			t152 = text("For example, if we write the following in Svlete");
			t153 = space();
			pre4 = element("pre");
			t154 = space();
			p24 = element("p");
			t155 = text("It gets compiled to something like this:");
			t156 = space();
			pre5 = element("pre");
			t157 = space();
			p25 = element("p");
			t158 = text("So, this roughly explains the additional code added into the ");
			code22 = element("code");
			t159 = text("bundle.js");
			t160 = text(" for handling spread attributes.");
			t161 = space();
			p26 = element("p");
			t162 = text("However the code that is removed, is something I am not familiar with.");
			t163 = space();
			pre6 = element("pre");
			t164 = space();
			p27 = element("p");
			t165 = text("It seems like we are trying to set ");
			code23 = element("code");
			t166 = text("option.selected");
			t167 = text(" after we mount the ");
			code24 = element("code");
			t168 = text("<select>");
			t169 = text(" element. Not sure how important is that to us.");
			t170 = space();
			p28 = element("p");
			t171 = text("To verify that the bug is because that the above code snippet is missing when having a spread attribute, I tried adding the code snippet into the ");
			code25 = element("code");
			t172 = text("bundle.js");
			t173 = text(" manually, and refresh the page.");
			t174 = space();
			pre7 = element("pre");
			t175 = space();
			p29 = element("p");
			t176 = text("Instead of ");
			code26 = element("code");
			t177 = text("~select_value_value.indexOf(...)");
			t178 = text(", I changed it to ");
			code27 = element("code");
			t179 = text("~ctx[0].indexOf(...)");
			t180 = text(", as ");
			code28 = element("code");
			t181 = text("select_value_value");
			t182 = text(" wasn't created when using spread attribute.");
			t183 = space();
			p30 = element("p");
			t184 = text("...and it works!");
			t185 = space();
			p31 = element("p");
			picture = element("picture");
			source0 = element("source");
			source1 = element("source");
			img = element("img");
			t186 = space();
			p32 = element("p");
			t187 = text("So, now we know that the bug is caused by missing setting ");
			code29 = element("code");
			t188 = text("option.selected");
			t189 = text(" on mount, now its time to figure out what the code snippet is not generated when there's a spread attribute.");
			t190 = space();
			p33 = element("p");
			t191 = text("To quickly find out why something is not generated, I tried to look for where it is generated, figuring out probably whether certain condition was not set correctly to cause the Svelte compiler to omit out the code snippet.");
			t192 = space();
			p34 = element("p");
			t193 = text("To find the right place to start looking is an art. Usually I try to global search a small snippet of code that is ");
			strong4 = element("strong");
			t194 = text("most likely static");
			t195 = text(", something that has no variable name, for example:");
			t196 = space();
			ul3 = element("ul");
			li12 = element("li");
			code30 = element("code");
			t197 = text(".indexOf(option.__value)");
			t198 = space();
			li13 = element("li");
			code31 = element("code");
			t199 = text(".options.length;");
			t200 = space();
			li14 = element("li");
			code32 = element("code");
			t201 = text(".selected = ~");
			t202 = space();
			p35 = element("p");
			t203 = text("The only search result I got when searching for ");
			code33 = element("code");
			t204 = text(".indexOf(option.__value)");
			t205 = text(" is in ");
			a23 = element("a");
			t206 = text("src/runtime/internal/dom.ts");
			t207 = space();
			pre8 = element("pre");
			t208 = space();
			p36 = element("p");
			t209 = text("Anything within ");
			code34 = element("code");
			t210 = text("src/runtime/");
			t211 = text(" are helper functions that are referenced from the output code, to reduce the output code size. Hmm... probably we should reuse the ");
			code35 = element("code");
			t212 = text("select_options");
			t213 = text(" helper function:");
			t214 = space();
			pre9 = element("pre");
			t215 = space();
			p37 = element("p");
			t216 = text("Anyway, ");
			code36 = element("code");
			t217 = text("src/runtime/internal/dom.ts");
			t218 = text(" is not where I am looking for, so I tried searching ");
			code37 = element("code");
			t219 = text(".options.length");
			t220 = space();
			pre10 = element("pre");
			t221 = space();
			p38 = element("p");
			t222 = text("Yes, this is most likely where it is.");
			t223 = space();
			p39 = element("p");
			t224 = text("Firstly, let me update the ");
			code38 = element("code");
			t225 = text("updater");
			t226 = text(" to use the ");
			code39 = element("code");
			t227 = text("src/runtime/");
			t228 = space();
			code40 = element("code");
			t229 = text("select_options");
			t230 = text(" helper instead:");
			t231 = space();
			pre11 = element("pre");
			t232 = space();
			p40 = element("p");
			t233 = text("The ");
			code41 = element("code");
			t234 = text("b`...`");
			t235 = text(", is called a ");
			a24 = element("a");
			t236 = text("tagged template");
			t237 = text(", where the ");
			code42 = element("code");
			t238 = text("b");
			t239 = text(" is a function that takes in the template literal and return something. In this case, the ");
			code43 = element("code");
			t240 = text("b");
			t241 = text(" function returns an ");
			a25 = element("a");
			t242 = text("Abstract Syntaxt Tree (AST)");
			t243 = text(".");
			t244 = space();
			p41 = element("p");
			t245 = text("The ");
			code44 = element("code");
			t246 = text("b");
			t247 = text(" function comes from ");
			a26 = element("a");
			t248 = text("code-red");
			t249 = text(", a utility to generate a JavaScript AST node. Beside ");
			code45 = element("code");
			t250 = text("b");
			t251 = text(", ");
			code46 = element("code");
			t252 = text("code-red");
			t253 = text(" provides a few helper functions:");
			t254 = space();
			ul4 = element("ul");
			li15 = element("li");
			code47 = element("code");
			t255 = text("b");
			t256 = text(" returns a block node");
			t257 = space();
			li16 = element("li");
			code48 = element("code");
			t258 = text("x");
			t259 = text(" returns an expression node");
			t260 = space();
			li17 = element("li");
			code49 = element("code");
			t261 = text("p");
			t262 = text(" returns a object property node");
			t263 = space();
			p42 = element("p");
			t264 = text("These helper functions are useful in generating code in Svelte compiler, particularly because the placeholder itself can takes in another AST node:");
			t265 = space();
			pre12 = element("pre");
			t266 = space();
			p43 = element("p");
			code50 = element("code");
			t267 = text("@");
			t268 = text(" in front of ");
			code51 = element("code");
			t269 = text("@select_option");
			t270 = text(" is a convention in Svelte, where it will ");
			a27 = element("a");
			t271 = text("get replaced");
			t272 = text(" to refer to helpr functions in ");
			code52 = element("code");
			t273 = text("src/runtime/");
			t274 = text(" before writing the generated AST out:");
			t275 = space();
			pre13 = element("pre");
			t276 = space();
			p44 = element("p");
			t277 = text("Coming back to figure out why this piece of code is not executed when there's a spread attribute,");
			t278 = space();
			pre14 = element("pre");
			t279 = space();
			p45 = element("p");
			t280 = text("I tried adding ");
			code53 = element("code");
			t281 = text("console.log");
			t282 = text(" before the if statement, to figure out the value for ");
			code54 = element("code");
			t283 = text("is_legacy_input_type");
			t284 = text(" and ");
			code55 = element("code");
			t285 = text("is_select_value_attribute");
			t286 = text(":");
			t287 = space();
			pre15 = element("pre");
			t288 = space();
			p46 = element("p");
			t289 = text("To my surpise, there was no log. ");
			code56 = element("code");
			t290 = text("AttributeWrapper#render");
			t291 = text(" wasn't executed.");
			t292 = space();
			p47 = element("p");
			t293 = text("I tried removing the spread attribute, and verified from the log that the ");
			code57 = element("code");
			t294 = text("AttributeWrapper#render");
			t295 = text(" method was indeed executed when there's no spread attribute.");
			t296 = space();
			p48 = element("p");
			t297 = text("To figure out the caller of the ");
			code58 = element("code");
			t298 = text("AttributeWrapper#render");
			t299 = text(" method, I added ");
			code59 = element("code");
			t300 = text("console.trace");
			t301 = text(" at the top of the method:");
			t302 = space();
			pre16 = element("pre");
			t303 = space();
			pre17 = element("pre");
			t304 = space();
			p49 = element("p");
			t305 = text("This brought me to ");
			a28 = element("a");
			t306 = text("src/compiler/compile/render_dom/wrappers/Element/index.ts");
			t307 = space();
			pre18 = element("pre");
			t308 = space();
			p50 = element("p");
			t309 = text("If there's a spread attribute, it will call the ");
			code60 = element("code");
			t310 = text("this.node.attributes.some(attr => attr.is_spread)");
			t311 = text(" method instead of calling ");
			code61 = element("code");
			t312 = text("attribute.render(block)");
			t313 = text(", so that's probably why ");
			code62 = element("code");
			t314 = text("AttributeWrapper#render");
			t315 = text(" wasn't called.");
			t316 = space();
			p51 = element("p");
			t317 = text("I looked into the method ");
			code63 = element("code");
			t318 = text("add_spread_attributes");
			t319 = text(", found out it contain only the code about handling spread attributes as I explained earlier. It didn't have any code related to ");
			code64 = element("code");
			t320 = text("select_options");
			t321 = text(", so I figured that, maybe ");
			code65 = element("code");
			t322 = text("<select multiple>");
			t323 = text(" with spread attribute is an edge case that wasn't handled currently at all.");
			t324 = space();
			p52 = element("p");
			t325 = text("So, I tried to add a special check for this case at the bottom of the ");
			code66 = element("code");
			t326 = text("add_spread_attributes");
			t327 = text(" method:");
			t328 = space();
			pre19 = element("pre");
			t329 = space();
			p53 = element("p");
			t330 = text("As mentioned in the ");
			a29 = element("a");
			t331 = text("The Svelte Compiler Handbook");
			t332 = text(", a ");
			code67 = element("code");
			t333 = text("block");
			t334 = text(" is where it keeps the code to generate the ");
			a30 = element("a");
			code68 = element("code");
			t335 = text("create_fragment");
			t336 = text(" function. The return object of the ");
			code69 = element("code");
			t337 = text("create_fragment");
			t338 = text(" function contains various method as mentioned in ");
			a31 = element("a");
			t339 = text("Compile Svelte in your Head");
			t340 = text(", such as ");
			code70 = element("code");
			t341 = text("c()");
			t342 = text(", ");
			code71 = element("code");
			t343 = text("m()");
			t344 = text(" and ");
			code72 = element("code");
			t345 = text("d()");
			t346 = text(". To add code into different method, you can push them into the array in ");
			code73 = element("code");
			t347 = text("block.chunks");
			t348 = text(", for example:");
			t349 = space();
			pre20 = element("pre");
			t350 = space();
			p54 = element("p");
			t351 = text("I tried adding ");
			code74 = element("code");
			t352 = text("@select_options(...)");
			t353 = text(" into the ");
			code75 = element("code");
			t354 = text("m()");
			t355 = text(" method and yup, the ");
			code76 = element("code");
			t356 = text("<select>");
			t357 = text(" element is pre-selected correctly!");
			t358 = space();
			section5 = element("section");
			h24 = element("h2");
			a32 = element("a");
			t359 = text("Fixing the bug");
			t360 = space();
			p55 = element("p");
			t361 = text("To ensure the bug is fixed, I need to come up with a test.");
			t362 = space();
			p56 = element("p");
			t363 = text("Usually I come up with test cases that try to entail various scenario I can imagine.");
			t364 = space();
			p57 = element("p");
			t365 = text("In this example, we've manually tested the case where the ");
			code77 = element("code");
			t366 = text("<select multiple {value} {...{}}>");
			t367 = text(", the value is set correctly during initialisation. but have we check the case where:");
			t368 = space();
			ul5 = element("ul");
			li18 = element("li");
			t369 = text("we update the value of ");
			code78 = element("code");
			t370 = text("value");
			t371 = text(", will the ");
			code79 = element("code");
			t372 = text("<select>");
			t373 = text(" get updated accordingly?");
			t374 = space();
			li19 = element("li");
			t375 = text("if the value is overriden by the spreaded attribute, eg ");
			code80 = element("code");
			t376 = text("<select mutliple {value} { ...{value: []} }>");
			t377 = text("?");
			t378 = space();
			p58 = element("p");
			t379 = text("Ideally, the test cases come up should be failed before the fix, and passed after the fix.");
			t380 = space();
			p59 = element("p");
			t381 = text("So here's the test case I came up:");
			t382 = space();
			pre21 = element("pre");
			t383 = space();
			p60 = element("p");
			t384 = text("I can check and uncheck the checkbox to change the value of ");
			code81 = element("code");
			t385 = text("value");
			t386 = text(" to verify the the ");
			code82 = element("code");
			t387 = text("value");
			t388 = text(" is reactive, and ");
			code83 = element("code");
			t389 = text("<select>");
			t390 = text(" will get updated accordingly.");
			t391 = space();
			p61 = element("p");
			t392 = text("Besides that, I exported ");
			code84 = element("code");
			t393 = text("spread");
			t394 = text(", so that I can change the object to something object to contain ");
			code85 = element("code");
			t395 = text("value");
			t396 = text(", eg: ");
			code86 = element("code");
			t397 = text("{ value: [] }");
			t398 = text(", and see how ");
			code87 = element("code");
			t399 = text("<select>");
			t400 = text(" will update accordingly. Make sure that our fix not just work with ");
			code88 = element("code");
			t401 = text("value");
			t402 = text(" attribute, and also when the ");
			code89 = element("code");
			t403 = text("value");
			t404 = text(" is spreaded into ");
			code90 = element("code");
			t405 = text("<select>");
			t406 = text(".");
			t407 = space();
			p62 = element("p");
			t408 = text("You may think that we are familiar with our fix, we know what it will fix, what it will not fix, do we need think up and write all the edge cases?");
			t409 = space();
			p63 = element("p");
			t410 = text("Well, I think you should. Future you will thank the present you when he encounter a fail test, that just mean his change may have an unintentional regressional change. If you don't have the test case, the future you will never know what edge case he didn't accounted for.");
			t411 = space();
			p64 = element("p");
			t412 = text("Runtime test cases are added into ");
			code91 = element("code");
			t413 = text("test/runtime/samples/");
			t414 = text(". Each folder represent 1 test case. Inside the folder, the component to be tested is named ");
			code92 = element("code");
			t415 = text("App.svelte");
			t416 = text(", and the test case is written ");
			code93 = element("code");
			t417 = text("_config.js");
			t418 = text(".");
			t419 = space();
			p65 = element("p");
			code94 = element("code");
			t420 = text("_config.js");
			t421 = text(" default exports a object:");
			t422 = space();
			pre22 = element("pre");
			t423 = space();
			p66 = element("p");
			t424 = text("An example of test case of unchecking the checkbox, and verify ");
			code95 = element("code");
			t425 = text("<select>");
			t426 = text(" value get updated");
			t427 = space();
			pre23 = element("pre");
			t428 = space();
			p67 = element("p");
			t429 = text("To run only this test, so that we can focus on ensuring the test case pass, we can set ");
			code96 = element("code");
			t430 = text("solo: true");
			t431 = text(":");
			t432 = space();
			pre24 = element("pre");
			t433 = space();
			p68 = element("p");
			strong5 = element("strong");
			t434 = text("Quick tip:");
			t435 = text(" running ");
			code97 = element("code");
			t436 = text("npm run test");
			t437 = text(" will build Svelte code first before executing the test. If you are like me, running ");
			code98 = element("code");
			t438 = text("npm run dev");
			t439 = text(" on the background, Svelte code is build on every code change. So, ");
			code99 = element("code");
			t440 = text("npm run quicktest");
			t441 = text(" would allow you to skip the ");
			code100 = element("code");
			t442 = text("pretest");
			t443 = text(" build, and run the test suite immediately.");
			t444 = space();
			p69 = element("p");
			t445 = text("With the test, I realised that I didn't handle the case when the ");
			code101 = element("code");
			t446 = text("value");
			t447 = text(" is updated.");
			t448 = space();
			p70 = element("p");
			t449 = text("So I guess what I needed to do is to add the same code in the ");
			code102 = element("code");
			t450 = text("p()");
			t451 = text(" (update) method too!");
			t452 = space();
			pre25 = element("pre");
			t453 = space();
			p71 = element("p");
			t454 = text("Well, of course in this way, the ");
			code103 = element("code");
			t455 = text("select_options");
			t456 = text(" get executed unconditionally whenever any variable is updated.");
			t457 = space();
			p72 = element("p");
			t458 = text("I need to make sure that the ");
			code104 = element("code");
			t459 = text("select_options(...)");
			t460 = text(" inside the ");
			code105 = element("code");
			t461 = text("p()");
			t462 = text(" method get executed only when the value of ");
			code106 = element("code");
			t463 = text("value");
			t464 = text(" changes, and also probably when ");
			code107 = element("code");
			t465 = text("spread");
			t466 = text(" changes too, because it could potentially override the value of ");
			code108 = element("code");
			t467 = text("value");
			t468 = text(".");
			t469 = space();
			p73 = element("p");
			t470 = text("If you've read ");
			a33 = element("a");
			t471 = text("Compile Svelte in your Head - Bitmask in Svelte");
			t472 = text(", you know that Svelte uses bitmask to check any variable changes.");
			t473 = space();
			p74 = element("p");
			t474 = text("How do I know what is the bitmask to use in this case, well I dont have to.");
			t475 = space();
			p75 = element("p");
			t476 = text("I can use ");
			a34 = element("a");
			code109 = element("code");
			t477 = text("renderer.dirty(dependencies)");
			t478 = text(" to help me with that:");
			t479 = space();
			pre26 = element("pre");
			t480 = space();
			p76 = element("p");
			t481 = text("Next, I need to figure out what are the dependencies to be included. In this particular case, the dependencies of all attributes have to be taken consideration, because it is hard to tell which one would be eventually applied due to the spread attribute.");
			t482 = space();
			pre27 = element("pre");
			t483 = space();
			p77 = element("p");
			t484 = text("After a few tweaks, finally I passed all my test cases, and its time to create a pull request!");
			t485 = space();
			section6 = element("section");
			h25 = element("h2");
			a35 = element("a");
			t486 = text("Submitting the fix");
			t487 = space();
			p78 = element("p");
			t488 = text("Before pushing the fix to remote, it is important to make sure that all the lints and typescript definitions are correct. You can run ");
			code110 = element("code");
			t489 = text("npm run lint --fixed");
			t490 = text(" for linting, and ");
			code111 = element("code");
			t491 = text("npm run tsd");
			t492 = text(" to generate typescript definition.");
			t493 = space();
			p79 = element("p");
			t494 = text("If you are unsure on how to create a pull request, you can check out ");
			a36 = element("a");
			t495 = text("How to make your first pull request on GitHub");
			t496 = text(".");
			t497 = space();
			p80 = element("p");
			t498 = text("I pushed my branch and created a ");
			a37 = element("a");
			t499 = text("Pull Request to Svelte");
			t500 = text(", and now I am waiting for feedback and for it to get merged.");
			t501 = space();
			p81 = element("p");
			t502 = text("Svelte is not maintained by full-time maintainers, everyone has their full-time job, so please be patient and be nice.");
			t503 = space();
			hr2 = element("hr");
			t504 = space();
			p82 = element("p");
			t505 = text("If you wish to learn more about Svelte, ");
			a38 = element("a");
			t506 = text("follow me on Twitter");
			t507 = text(".");
			t508 = space();
			p83 = element("p");
			t509 = text("If you have anything unclear about this article, find me on ");
			a39 = element("a");
			t510 = text("Twitter");
			t511 = text(" too!");
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
			t1 = claim_text(a1_nodes, "The story begins");
			a1_nodes.forEach(detach);
			li1_nodes.forEach(detach);
			li2 = claim_element(ul0_nodes, "LI", {});
			var li2_nodes = children(li2);
			a2 = claim_element(li2_nodes, "A", { href: true });
			var a2_nodes = children(a2);
			t2 = claim_text(a2_nodes, "Verifying the bug");
			a2_nodes.forEach(detach);
			li2_nodes.forEach(detach);
			li3 = claim_element(ul0_nodes, "LI", {});
			var li3_nodes = children(li3);
			a3 = claim_element(li3_nodes, "A", { href: true });
			var a3_nodes = children(a3);
			t3 = claim_text(a3_nodes, "Investigating the bug");
			a3_nodes.forEach(detach);
			li3_nodes.forEach(detach);
			li4 = claim_element(ul0_nodes, "LI", {});
			var li4_nodes = children(li4);
			a4 = claim_element(li4_nodes, "A", { href: true });
			var a4_nodes = children(a4);
			t4 = claim_text(a4_nodes, "Fixing the bug");
			a4_nodes.forEach(detach);
			li4_nodes.forEach(detach);
			li5 = claim_element(ul0_nodes, "LI", {});
			var li5_nodes = children(li5);
			a5 = claim_element(li5_nodes, "A", { href: true });
			var a5_nodes = children(a5);
			t5 = claim_text(a5_nodes, "Submitting the fix");
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
			t9 = claim_text(p0_nodes, "As Svelte gains more attention, I find that more and more people are interested in contributing to Svelte.");
			p0_nodes.forEach(detach);
			t10 = claim_space(section1_nodes);
			p1 = claim_element(section1_nodes, "P", {});
			var p1_nodes = children(p1);
			t11 = claim_text(p1_nodes, "Of course, contributing to Svelte, does not mean to contribute only in code, it could be:");
			p1_nodes.forEach(detach);
			t12 = claim_space(section1_nodes);
			ul1 = claim_element(section1_nodes, "UL", {});
			var ul1_nodes = children(ul1);
			li6 = claim_element(ul1_nodes, "LI", {});
			var li6_nodes = children(li6);
			t13 = claim_text(li6_nodes, "answering questions about Svelte, on social media, Stack Overflow, or ");
			a7 = claim_element(li6_nodes, "A", { href: true, rel: true });
			var a7_nodes = children(a7);
			t14 = claim_text(a7_nodes, "Discord");
			a7_nodes.forEach(detach);
			li6_nodes.forEach(detach);
			t15 = claim_space(ul1_nodes);
			li7 = claim_element(ul1_nodes, "LI", {});
			var li7_nodes = children(li7);
			t16 = claim_text(li7_nodes, "improving Svelte docs, or write tutorials and articles about Svelte");
			li7_nodes.forEach(detach);
			t17 = claim_space(ul1_nodes);
			li8 = claim_element(ul1_nodes, "LI", {});
			var li8_nodes = children(li8);
			t18 = claim_text(li8_nodes, "organising and speaking in meetups about Svelte");
			li8_nodes.forEach(detach);
			ul1_nodes.forEach(detach);
			t19 = claim_space(section1_nodes);
			p2 = claim_element(section1_nodes, "P", {});
			var p2_nodes = children(p2);
			t20 = claim_text(p2_nodes, "For those who want to contribute in code, most people are unsure where to start. So I wrote ");
			a8 = claim_element(p2_nodes, "A", { href: true });
			var a8_nodes = children(a8);
			t21 = claim_text(a8_nodes, "The Svelte Compiler Handbook");
			a8_nodes.forEach(detach);
			t22 = claim_text(p2_nodes, " as an overview of the Svelte source code.");
			p2_nodes.forEach(detach);
			t23 = claim_space(section1_nodes);
			p3 = claim_element(section1_nodes, "P", {});
			var p3_nodes = children(p3);
			t24 = claim_text(p3_nodes, "However, today, I want to try a different tone.");
			p3_nodes.forEach(detach);
			t25 = claim_space(section1_nodes);
			p4 = claim_element(section1_nodes, "P", {});
			var p4_nodes = children(p4);
			t26 = claim_text(p4_nodes, "I am going to tell you an anecdote on how I investigated and fixed a bug in Svelte.");
			p4_nodes.forEach(detach);
			t27 = claim_space(section1_nodes);
			p5 = claim_element(section1_nodes, "P", {});
			var p5_nodes = children(p5);
			t28 = claim_text(p5_nodes, "I documented down my train of thoughts as detailed as possible.");
			p5_nodes.forEach(detach);
			t29 = claim_space(section1_nodes);
			p6 = claim_element(section1_nodes, "P", {});
			var p6_nodes = children(p6);
			t30 = claim_text(p6_nodes, "I hope this gives anyone who is reading, a glimpse on how to work on the Svelte source code.");
			p6_nodes.forEach(detach);
			section1_nodes.forEach(detach);
			t31 = claim_space(nodes);
			section2 = claim_element(nodes, "SECTION", {});
			var section2_nodes = children(section2);
			h21 = claim_element(section2_nodes, "H2", {});
			var h21_nodes = children(h21);
			a9 = claim_element(h21_nodes, "A", { href: true, id: true });
			var a9_nodes = children(a9);
			t32 = claim_text(a9_nodes, "The story begins");
			a9_nodes.forEach(detach);
			h21_nodes.forEach(detach);
			t33 = claim_space(section2_nodes);
			p7 = claim_element(section2_nodes, "P", {});
			var p7_nodes = children(p7);
			t34 = claim_text(p7_nodes, "I was combing through ");
			a10 = claim_element(p7_nodes, "A", { href: true, rel: true });
			var a10_nodes = children(a10);
			t35 = claim_text(a10_nodes, "bugs on GitHub");
			a10_nodes.forEach(detach);
			t36 = claim_text(p7_nodes, ", and found this rather interesting bug:");
			p7_nodes.forEach(detach);
			t37 = claim_space(section2_nodes);
			hr0 = claim_element(section2_nodes, "HR", {});
			t38 = claim_space(section2_nodes);
			p8 = claim_element(section2_nodes, "P", {});
			var p8_nodes = children(p8);
			strong0 = claim_element(p8_nodes, "STRONG", {});
			var strong0_nodes = children(strong0);
			t39 = claim_text(strong0_nodes, "Select multiple value does not get set with spread props ");
			a11 = claim_element(strong0_nodes, "A", { href: true, rel: true });
			var a11_nodes = children(a11);
			t40 = claim_text(a11_nodes, "#4392");
			a11_nodes.forEach(detach);
			strong0_nodes.forEach(detach);
			p8_nodes.forEach(detach);
			t41 = claim_space(section2_nodes);
			p9 = claim_element(section2_nodes, "P", {});
			var p9_nodes = children(p9);
			t42 = claim_text(p9_nodes, "Adding any type of spread, even an empty object ");
			code0 = claim_element(p9_nodes, "CODE", {});
			var code0_nodes = children(code0);
			t43 = claim_text(code0_nodes, "{...{}}");
			code0_nodes.forEach(detach);
			t44 = claim_text(p9_nodes, ", causes the value not to be set:");
			p9_nodes.forEach(detach);
			t45 = claim_space(section2_nodes);
			pre0 = claim_element(section2_nodes, "PRE", { class: true });
			var pre0_nodes = children(pre0);
			pre0_nodes.forEach(detach);
			t46 = claim_space(section2_nodes);
			p10 = claim_element(section2_nodes, "P", {});
			var p10_nodes = children(p10);
			t47 = claim_text(p10_nodes, "To reproduce: ");
			a12 = claim_element(p10_nodes, "A", { href: true, rel: true });
			var a12_nodes = children(a12);
			t48 = claim_text(a12_nodes, "REPL");
			a12_nodes.forEach(detach);
			t49 = claim_text(p10_nodes, ".");
			p10_nodes.forEach(detach);
			t50 = claim_space(section2_nodes);
			hr1 = claim_element(section2_nodes, "HR", {});
			section2_nodes.forEach(detach);
			t51 = claim_space(nodes);
			section3 = claim_element(nodes, "SECTION", {});
			var section3_nodes = children(section3);
			h22 = claim_element(section3_nodes, "H2", {});
			var h22_nodes = children(h22);
			a13 = claim_element(h22_nodes, "A", { href: true, id: true });
			var a13_nodes = children(a13);
			t52 = claim_text(a13_nodes, "Verifying the bug");
			a13_nodes.forEach(detach);
			h22_nodes.forEach(detach);
			t53 = claim_space(section3_nodes);
			p11 = claim_element(section3_nodes, "P", {});
			var p11_nodes = children(p11);
			t54 = claim_text(p11_nodes, "I clicked into the REPL and tried to understand about the bug.");
			p11_nodes.forEach(detach);
			t55 = claim_space(section3_nodes);
			p12 = claim_element(section3_nodes, "P", {});
			var p12_nodes = children(p12);
			t56 = claim_text(p12_nodes, "I found that if the ");
			code1 = claim_element(p12_nodes, "CODE", {});
			var code1_nodes = children(code1);
			t57 = claim_text(code1_nodes, "<select multiple>");
			code1_nodes.forEach(detach);
			t58 = claim_text(p12_nodes, " has spread attribute ");
			code2 = claim_element(p12_nodes, "CODE", {});
			var code2_nodes = children(code2);
			t59 = claim_text(code2_nodes, "{...any}");
			code2_nodes.forEach(detach);
			t60 = claim_text(p12_nodes, ", the ");
			code3 = claim_element(p12_nodes, "CODE", {});
			var code3_nodes = children(code3);
			t61 = claim_text(code3_nodes, "value");
			code3_nodes.forEach(detach);
			t62 = claim_text(p12_nodes, " attribute will not be reactive. Changes in the value of ");
			code4 = claim_element(p12_nodes, "CODE", {});
			var code4_nodes = children(code4);
			t63 = claim_text(code4_nodes, "value");
			code4_nodes.forEach(detach);
			t64 = claim_text(p12_nodes, " will not be reflected to the ");
			code5 = claim_element(p12_nodes, "CODE", {});
			var code5_nodes = children(code5);
			t65 = claim_text(code5_nodes, "<select>");
			code5_nodes.forEach(detach);
			t66 = claim_text(p12_nodes, ".");
			p12_nodes.forEach(detach);
			t67 = claim_space(section3_nodes);
			p13 = claim_element(section3_nodes, "P", {});
			var p13_nodes = children(p13);
			t68 = claim_text(p13_nodes, "I noticed the REPL link uses the version ");
			code6 = claim_element(p13_nodes, "CODE", {});
			var code6_nodes = children(code6);
			t69 = claim_text(code6_nodes, "3.18.1");
			code6_nodes.forEach(detach);
			t70 = claim_text(p13_nodes, ", it's not the latest version of Svelte. At the point of writing, Svelte is at ");
			strong1 = claim_element(p13_nodes, "STRONG", {});
			var strong1_nodes = children(strong1);
			t71 = claim_text(strong1_nodes, "3.22.3");
			strong1_nodes.forEach(detach);
			t72 = claim_text(p13_nodes, ". I tried removing the ");
			code7 = claim_element(p13_nodes, "CODE", {});
			var code7_nodes = children(code7);
			t73 = claim_text(code7_nodes, "?version=3.18.1");
			code7_nodes.forEach(detach);
			t74 = claim_text(p13_nodes, " from the query params to verify whether the bug has fixed, and realised that the bug is still there. (Great! Something interesting to investigate into.)");
			p13_nodes.forEach(detach);
			t75 = claim_space(section3_nodes);
			p14 = claim_element(section3_nodes, "P", {});
			var p14_nodes = children(p14);
			t76 = claim_text(p14_nodes, "To understand the current status of the issue, I read through the comments. According to ");
			a14 = claim_element(p14_nodes, "A", { href: true, rel: true });
			var a14_nodes = children(a14);
			t77 = claim_text(a14_nodes, "Conduitry");
			a14_nodes.forEach(detach);
			t78 = claim_text(p14_nodes, ", the issue is related to ");
			strong2 = claim_element(p14_nodes, "STRONG", {});
			var strong2_nodes = children(strong2);
			t79 = claim_text(strong2_nodes, "Radio/checkbox input with bind:group and spread props makes variable undefined");
			strong2_nodes.forEach(detach);
			t80 = claim_space(p14_nodes);
			a15 = claim_element(p14_nodes, "A", { href: true, rel: true });
			var a15_nodes = children(a15);
			t81 = claim_text(a15_nodes, "#3680");
			a15_nodes.forEach(detach);
			t82 = claim_text(p14_nodes, " and can be fixed together. However, the issue ");
			a16 = claim_element(p14_nodes, "A", { href: true, rel: true });
			var a16_nodes = children(a16);
			t83 = claim_text(a16_nodes, "#3680");
			a16_nodes.forEach(detach);
			t84 = claim_text(p14_nodes, " was fixed and closed, yet this issue is still open.");
			p14_nodes.forEach(detach);
			t85 = claim_space(section3_nodes);
			p15 = claim_element(section3_nodes, "P", {});
			var p15_nodes = children(p15);
			t86 = claim_text(p15_nodes, "Nevertheless, I read through ");
			a17 = claim_element(p15_nodes, "A", { href: true, rel: true });
			var a17_nodes = children(a17);
			t87 = claim_text(a17_nodes, "the PR");
			a17_nodes.forEach(detach);
			t88 = claim_text(p15_nodes, " for the closed issue ");
			a18 = claim_element(p15_nodes, "A", { href: true, rel: true });
			var a18_nodes = children(a18);
			t89 = claim_text(a18_nodes, "#3680");
			a18_nodes.forEach(detach);
			t90 = claim_text(p15_nodes, ", roughly understand how it was fixed and hopefully it can give me some inspirations on this issue.");
			p15_nodes.forEach(detach);
			section3_nodes.forEach(detach);
			t91 = claim_space(nodes);
			section4 = claim_element(nodes, "SECTION", {});
			var section4_nodes = children(section4);
			h23 = claim_element(section4_nodes, "H2", {});
			var h23_nodes = children(h23);
			a19 = claim_element(h23_nodes, "A", { href: true, id: true });
			var a19_nodes = children(a19);
			t92 = claim_text(a19_nodes, "Investigating the bug");
			a19_nodes.forEach(detach);
			h23_nodes.forEach(detach);
			t93 = claim_space(section4_nodes);
			p16 = claim_element(section4_nodes, "P", {});
			var p16_nodes = children(p16);
			t94 = claim_text(p16_nodes, "Once I verified that the behavior described in the issue is unexpected and reproducible in the latest version of Svelte, I copied the REPL code into my local machine to investigate.");
			p16_nodes.forEach(detach);
			t95 = claim_space(section4_nodes);
			p17 = claim_element(section4_nodes, "P", {});
			var p17_nodes = children(p17);
			t96 = claim_text(p17_nodes, "I have a ");
			code8 = claim_element(p17_nodes, "CODE", {});
			var code8_nodes = children(code8);
			t97 = claim_text(code8_nodes, "test-svelte");
			code8_nodes.forEach(detach);
			t98 = claim_text(p17_nodes, " folder ready in my local machine, where I created using ");
			a20 = claim_element(p17_nodes, "A", { href: true, rel: true });
			var a20_nodes = children(a20);
			t99 = claim_text(a20_nodes, "Svelte Template");
			a20_nodes.forEach(detach);
			t100 = claim_text(p17_nodes, ". I have ");
			code9 = claim_element(p17_nodes, "CODE", {});
			var code9_nodes = children(code9);
			t101 = claim_text(code9_nodes, "npm link");
			code9_nodes.forEach(detach);
			t102 = claim_text(p17_nodes, "ed my local Svelte clone to the ");
			code10 = claim_element(p17_nodes, "CODE", {});
			var code10_nodes = children(code10);
			t103 = claim_text(code10_nodes, "test-svelte");
			code10_nodes.forEach(detach);
			t104 = claim_text(p17_nodes, " folder, so I can rebuild ");
			code11 = claim_element(p17_nodes, "CODE", {});
			var code11_nodes = children(code11);
			t105 = claim_text(code11_nodes, "test-svelte");
			code11_nodes.forEach(detach);
			t106 = claim_text(p17_nodes, " anytime with the latest changes done to my Svelte clone.");
			p17_nodes.forEach(detach);
			t107 = claim_space(section4_nodes);
			pre1 = claim_element(section4_nodes, "PRE", { class: true });
			var pre1_nodes = children(pre1);
			pre1_nodes.forEach(detach);
			t108 = claim_space(section4_nodes);
			p18 = claim_element(section4_nodes, "P", {});
			var p18_nodes = children(p18);
			t109 = claim_text(p18_nodes, "I have ");
			code12 = claim_element(p18_nodes, "CODE", {});
			var code12_nodes = children(code12);
			t110 = claim_text(code12_nodes, "yarn dev");
			code12_nodes.forEach(detach);
			t111 = claim_text(p18_nodes, " running in the Svelte folder, so any changes I make gets compiled immediately.");
			p18_nodes.forEach(detach);
			t112 = claim_space(section4_nodes);
			p19 = claim_element(section4_nodes, "P", {});
			var p19_nodes = children(p19);
			t113 = claim_text(p19_nodes, "I prefer to ");
			strong3 = claim_element(p19_nodes, "STRONG", {});
			var strong3_nodes = children(strong3);
			t114 = claim_text(strong3_nodes, "build");
			strong3_nodes.forEach(detach);
			t115 = claim_space(p19_nodes);
			code13 = claim_element(p19_nodes, "CODE", {});
			var code13_nodes = children(code13);
			t116 = claim_text(code13_nodes, "test-svelte");
			code13_nodes.forEach(detach);
			t117 = claim_text(p19_nodes, " and serve it with ");
			a21 = claim_element(p19_nodes, "A", { href: true, rel: true });
			var a21_nodes = children(a21);
			t118 = claim_text(a21_nodes, "http-server");
			a21_nodes.forEach(detach);
			t119 = claim_text(p19_nodes, " rather than start a dev server ");
			code14 = claim_element(p19_nodes, "CODE", {});
			var code14_nodes = children(code14);
			t120 = claim_text(code14_nodes, "test-svelte");
			code14_nodes.forEach(detach);
			t121 = claim_text(p19_nodes, " in watch mode. That allows me to");
			p19_nodes.forEach(detach);
			t122 = claim_space(section4_nodes);
			ul2 = claim_element(section4_nodes, "UL", {});
			var ul2_nodes = children(ul2);
			li9 = claim_element(ul2_nodes, "LI", {});
			var li9_nodes = children(li9);
			t123 = claim_text(li9_nodes, "Run the ");
			code15 = claim_element(li9_nodes, "CODE", {});
			var code15_nodes = children(code15);
			t124 = claim_text(code15_nodes, "http-server");
			code15_nodes.forEach(detach);
			t125 = claim_text(li9_nodes, " in the background while tweaking the Svelte code or the ");
			code16 = claim_element(li9_nodes, "CODE", {});
			var code16_nodes = children(code16);
			t126 = claim_text(code16_nodes, "test-svelte");
			code16_nodes.forEach(detach);
			t127 = claim_text(li9_nodes, " app.");
			li9_nodes.forEach(detach);
			t128 = claim_space(ul2_nodes);
			li10 = claim_element(ul2_nodes, "LI", {});
			var li10_nodes = children(li10);
			t129 = claim_text(li10_nodes, "Not having to restart the dev server whenever I've made changes to the Svelte code");
			li10_nodes.forEach(detach);
			t130 = claim_space(ul2_nodes);
			li11 = claim_element(ul2_nodes, "LI", {});
			var li11_nodes = children(li11);
			t131 = claim_text(li11_nodes, "Able to inspect and modify ");
			code17 = claim_element(li11_nodes, "CODE", {});
			var code17_nodes = children(code17);
			t132 = claim_text(code17_nodes, "bundle.js");
			code17_nodes.forEach(detach);
			t133 = claim_text(li11_nodes, " without worrying that accidentaly save in the ");
			code18 = claim_element(li11_nodes, "CODE", {});
			var code18_nodes = children(code18);
			t134 = claim_text(code18_nodes, "test-svelte");
			code18_nodes.forEach(detach);
			t135 = claim_text(li11_nodes, " app will overwrite the ");
			code19 = claim_element(li11_nodes, "CODE", {});
			var code19_nodes = children(code19);
			t136 = claim_text(code19_nodes, "bundle.js");
			code19_nodes.forEach(detach);
			li11_nodes.forEach(detach);
			ul2_nodes.forEach(detach);
			t137 = claim_space(section4_nodes);
			p20 = claim_element(section4_nodes, "P", {});
			var p20_nodes = children(p20);
			t138 = claim_text(p20_nodes, "Looking at the different ");
			code20 = claim_element(p20_nodes, "CODE", {});
			var code20_nodes = children(code20);
			t139 = claim_text(code20_nodes, "bundle.js");
			code20_nodes.forEach(detach);
			t140 = claim_text(p20_nodes, " generated from with ");
			code21 = claim_element(p20_nodes, "CODE", {});
			var code21_nodes = children(code21);
			t141 = claim_text(code21_nodes, "{...spread}");
			code21_nodes.forEach(detach);
			t142 = claim_text(p20_nodes, " attributes and without spread attributes");
			p20_nodes.forEach(detach);
			t143 = claim_space(section4_nodes);
			pre2 = claim_element(section4_nodes, "PRE", { class: true });
			var pre2_nodes = children(pre2);
			pre2_nodes.forEach(detach);
			t144 = claim_space(section4_nodes);
			p21 = claim_element(section4_nodes, "P", {});
			var p21_nodes = children(p21);
			t145 = claim_text(p21_nodes, "I found the following diffs in the bundled output:");
			p21_nodes.forEach(detach);
			t146 = claim_space(section4_nodes);
			pre3 = claim_element(section4_nodes, "PRE", { class: true });
			var pre3_nodes = children(pre3);
			pre3_nodes.forEach(detach);
			t147 = claim_space(section4_nodes);
			p22 = claim_element(section4_nodes, "P", {});
			var p22_nodes = children(p22);
			t148 = claim_text(p22_nodes, "Well, I know I havn't cover how spread attribute works in any of my ");
			a22 = claim_element(p22_nodes, "A", { href: true });
			var a22_nodes = children(a22);
			t149 = claim_text(a22_nodes, "\"Compile Svelte in your Head\"");
			a22_nodes.forEach(detach);
			t150 = claim_text(p22_nodes, " articles, but the general idea is that, Svelte builds an array of attributes, and then apply it to the element / Component.");
			p22_nodes.forEach(detach);
			t151 = claim_space(section4_nodes);
			p23 = claim_element(section4_nodes, "P", {});
			var p23_nodes = children(p23);
			t152 = claim_text(p23_nodes, "For example, if we write the following in Svlete");
			p23_nodes.forEach(detach);
			t153 = claim_space(section4_nodes);
			pre4 = claim_element(section4_nodes, "PRE", { class: true });
			var pre4_nodes = children(pre4);
			pre4_nodes.forEach(detach);
			t154 = claim_space(section4_nodes);
			p24 = claim_element(section4_nodes, "P", {});
			var p24_nodes = children(p24);
			t155 = claim_text(p24_nodes, "It gets compiled to something like this:");
			p24_nodes.forEach(detach);
			t156 = claim_space(section4_nodes);
			pre5 = claim_element(section4_nodes, "PRE", { class: true });
			var pre5_nodes = children(pre5);
			pre5_nodes.forEach(detach);
			t157 = claim_space(section4_nodes);
			p25 = claim_element(section4_nodes, "P", {});
			var p25_nodes = children(p25);
			t158 = claim_text(p25_nodes, "So, this roughly explains the additional code added into the ");
			code22 = claim_element(p25_nodes, "CODE", {});
			var code22_nodes = children(code22);
			t159 = claim_text(code22_nodes, "bundle.js");
			code22_nodes.forEach(detach);
			t160 = claim_text(p25_nodes, " for handling spread attributes.");
			p25_nodes.forEach(detach);
			t161 = claim_space(section4_nodes);
			p26 = claim_element(section4_nodes, "P", {});
			var p26_nodes = children(p26);
			t162 = claim_text(p26_nodes, "However the code that is removed, is something I am not familiar with.");
			p26_nodes.forEach(detach);
			t163 = claim_space(section4_nodes);
			pre6 = claim_element(section4_nodes, "PRE", { class: true });
			var pre6_nodes = children(pre6);
			pre6_nodes.forEach(detach);
			t164 = claim_space(section4_nodes);
			p27 = claim_element(section4_nodes, "P", {});
			var p27_nodes = children(p27);
			t165 = claim_text(p27_nodes, "It seems like we are trying to set ");
			code23 = claim_element(p27_nodes, "CODE", {});
			var code23_nodes = children(code23);
			t166 = claim_text(code23_nodes, "option.selected");
			code23_nodes.forEach(detach);
			t167 = claim_text(p27_nodes, " after we mount the ");
			code24 = claim_element(p27_nodes, "CODE", {});
			var code24_nodes = children(code24);
			t168 = claim_text(code24_nodes, "<select>");
			code24_nodes.forEach(detach);
			t169 = claim_text(p27_nodes, " element. Not sure how important is that to us.");
			p27_nodes.forEach(detach);
			t170 = claim_space(section4_nodes);
			p28 = claim_element(section4_nodes, "P", {});
			var p28_nodes = children(p28);
			t171 = claim_text(p28_nodes, "To verify that the bug is because that the above code snippet is missing when having a spread attribute, I tried adding the code snippet into the ");
			code25 = claim_element(p28_nodes, "CODE", {});
			var code25_nodes = children(code25);
			t172 = claim_text(code25_nodes, "bundle.js");
			code25_nodes.forEach(detach);
			t173 = claim_text(p28_nodes, " manually, and refresh the page.");
			p28_nodes.forEach(detach);
			t174 = claim_space(section4_nodes);
			pre7 = claim_element(section4_nodes, "PRE", { class: true });
			var pre7_nodes = children(pre7);
			pre7_nodes.forEach(detach);
			t175 = claim_space(section4_nodes);
			p29 = claim_element(section4_nodes, "P", {});
			var p29_nodes = children(p29);
			t176 = claim_text(p29_nodes, "Instead of ");
			code26 = claim_element(p29_nodes, "CODE", {});
			var code26_nodes = children(code26);
			t177 = claim_text(code26_nodes, "~select_value_value.indexOf(...)");
			code26_nodes.forEach(detach);
			t178 = claim_text(p29_nodes, ", I changed it to ");
			code27 = claim_element(p29_nodes, "CODE", {});
			var code27_nodes = children(code27);
			t179 = claim_text(code27_nodes, "~ctx[0].indexOf(...)");
			code27_nodes.forEach(detach);
			t180 = claim_text(p29_nodes, ", as ");
			code28 = claim_element(p29_nodes, "CODE", {});
			var code28_nodes = children(code28);
			t181 = claim_text(code28_nodes, "select_value_value");
			code28_nodes.forEach(detach);
			t182 = claim_text(p29_nodes, " wasn't created when using spread attribute.");
			p29_nodes.forEach(detach);
			t183 = claim_space(section4_nodes);
			p30 = claim_element(section4_nodes, "P", {});
			var p30_nodes = children(p30);
			t184 = claim_text(p30_nodes, "...and it works!");
			p30_nodes.forEach(detach);
			t185 = claim_space(section4_nodes);
			p31 = claim_element(section4_nodes, "P", {});
			var p31_nodes = children(p31);
			picture = claim_element(p31_nodes, "PICTURE", {});
			var picture_nodes = children(picture);
			source0 = claim_element(picture_nodes, "SOURCE", { type: true, srcset: true });
			source1 = claim_element(picture_nodes, "SOURCE", { type: true, srcset: true });
			img = claim_element(picture_nodes, "IMG", { alt: true, src: true });
			picture_nodes.forEach(detach);
			p31_nodes.forEach(detach);
			t186 = claim_space(section4_nodes);
			p32 = claim_element(section4_nodes, "P", {});
			var p32_nodes = children(p32);
			t187 = claim_text(p32_nodes, "So, now we know that the bug is caused by missing setting ");
			code29 = claim_element(p32_nodes, "CODE", {});
			var code29_nodes = children(code29);
			t188 = claim_text(code29_nodes, "option.selected");
			code29_nodes.forEach(detach);
			t189 = claim_text(p32_nodes, " on mount, now its time to figure out what the code snippet is not generated when there's a spread attribute.");
			p32_nodes.forEach(detach);
			t190 = claim_space(section4_nodes);
			p33 = claim_element(section4_nodes, "P", {});
			var p33_nodes = children(p33);
			t191 = claim_text(p33_nodes, "To quickly find out why something is not generated, I tried to look for where it is generated, figuring out probably whether certain condition was not set correctly to cause the Svelte compiler to omit out the code snippet.");
			p33_nodes.forEach(detach);
			t192 = claim_space(section4_nodes);
			p34 = claim_element(section4_nodes, "P", {});
			var p34_nodes = children(p34);
			t193 = claim_text(p34_nodes, "To find the right place to start looking is an art. Usually I try to global search a small snippet of code that is ");
			strong4 = claim_element(p34_nodes, "STRONG", {});
			var strong4_nodes = children(strong4);
			t194 = claim_text(strong4_nodes, "most likely static");
			strong4_nodes.forEach(detach);
			t195 = claim_text(p34_nodes, ", something that has no variable name, for example:");
			p34_nodes.forEach(detach);
			t196 = claim_space(section4_nodes);
			ul3 = claim_element(section4_nodes, "UL", {});
			var ul3_nodes = children(ul3);
			li12 = claim_element(ul3_nodes, "LI", {});
			var li12_nodes = children(li12);
			code30 = claim_element(li12_nodes, "CODE", {});
			var code30_nodes = children(code30);
			t197 = claim_text(code30_nodes, ".indexOf(option.__value)");
			code30_nodes.forEach(detach);
			li12_nodes.forEach(detach);
			t198 = claim_space(ul3_nodes);
			li13 = claim_element(ul3_nodes, "LI", {});
			var li13_nodes = children(li13);
			code31 = claim_element(li13_nodes, "CODE", {});
			var code31_nodes = children(code31);
			t199 = claim_text(code31_nodes, ".options.length;");
			code31_nodes.forEach(detach);
			li13_nodes.forEach(detach);
			t200 = claim_space(ul3_nodes);
			li14 = claim_element(ul3_nodes, "LI", {});
			var li14_nodes = children(li14);
			code32 = claim_element(li14_nodes, "CODE", {});
			var code32_nodes = children(code32);
			t201 = claim_text(code32_nodes, ".selected = ~");
			code32_nodes.forEach(detach);
			li14_nodes.forEach(detach);
			ul3_nodes.forEach(detach);
			t202 = claim_space(section4_nodes);
			p35 = claim_element(section4_nodes, "P", {});
			var p35_nodes = children(p35);
			t203 = claim_text(p35_nodes, "The only search result I got when searching for ");
			code33 = claim_element(p35_nodes, "CODE", {});
			var code33_nodes = children(code33);
			t204 = claim_text(code33_nodes, ".indexOf(option.__value)");
			code33_nodes.forEach(detach);
			t205 = claim_text(p35_nodes, " is in ");
			a23 = claim_element(p35_nodes, "A", { href: true, rel: true });
			var a23_nodes = children(a23);
			t206 = claim_text(a23_nodes, "src/runtime/internal/dom.ts");
			a23_nodes.forEach(detach);
			p35_nodes.forEach(detach);
			t207 = claim_space(section4_nodes);
			pre8 = claim_element(section4_nodes, "PRE", { class: true });
			var pre8_nodes = children(pre8);
			pre8_nodes.forEach(detach);
			t208 = claim_space(section4_nodes);
			p36 = claim_element(section4_nodes, "P", {});
			var p36_nodes = children(p36);
			t209 = claim_text(p36_nodes, "Anything within ");
			code34 = claim_element(p36_nodes, "CODE", {});
			var code34_nodes = children(code34);
			t210 = claim_text(code34_nodes, "src/runtime/");
			code34_nodes.forEach(detach);
			t211 = claim_text(p36_nodes, " are helper functions that are referenced from the output code, to reduce the output code size. Hmm... probably we should reuse the ");
			code35 = claim_element(p36_nodes, "CODE", {});
			var code35_nodes = children(code35);
			t212 = claim_text(code35_nodes, "select_options");
			code35_nodes.forEach(detach);
			t213 = claim_text(p36_nodes, " helper function:");
			p36_nodes.forEach(detach);
			t214 = claim_space(section4_nodes);
			pre9 = claim_element(section4_nodes, "PRE", { class: true });
			var pre9_nodes = children(pre9);
			pre9_nodes.forEach(detach);
			t215 = claim_space(section4_nodes);
			p37 = claim_element(section4_nodes, "P", {});
			var p37_nodes = children(p37);
			t216 = claim_text(p37_nodes, "Anyway, ");
			code36 = claim_element(p37_nodes, "CODE", {});
			var code36_nodes = children(code36);
			t217 = claim_text(code36_nodes, "src/runtime/internal/dom.ts");
			code36_nodes.forEach(detach);
			t218 = claim_text(p37_nodes, " is not where I am looking for, so I tried searching ");
			code37 = claim_element(p37_nodes, "CODE", {});
			var code37_nodes = children(code37);
			t219 = claim_text(code37_nodes, ".options.length");
			code37_nodes.forEach(detach);
			p37_nodes.forEach(detach);
			t220 = claim_space(section4_nodes);
			pre10 = claim_element(section4_nodes, "PRE", { class: true });
			var pre10_nodes = children(pre10);
			pre10_nodes.forEach(detach);
			t221 = claim_space(section4_nodes);
			p38 = claim_element(section4_nodes, "P", {});
			var p38_nodes = children(p38);
			t222 = claim_text(p38_nodes, "Yes, this is most likely where it is.");
			p38_nodes.forEach(detach);
			t223 = claim_space(section4_nodes);
			p39 = claim_element(section4_nodes, "P", {});
			var p39_nodes = children(p39);
			t224 = claim_text(p39_nodes, "Firstly, let me update the ");
			code38 = claim_element(p39_nodes, "CODE", {});
			var code38_nodes = children(code38);
			t225 = claim_text(code38_nodes, "updater");
			code38_nodes.forEach(detach);
			t226 = claim_text(p39_nodes, " to use the ");
			code39 = claim_element(p39_nodes, "CODE", {});
			var code39_nodes = children(code39);
			t227 = claim_text(code39_nodes, "src/runtime/");
			code39_nodes.forEach(detach);
			t228 = claim_space(p39_nodes);
			code40 = claim_element(p39_nodes, "CODE", {});
			var code40_nodes = children(code40);
			t229 = claim_text(code40_nodes, "select_options");
			code40_nodes.forEach(detach);
			t230 = claim_text(p39_nodes, " helper instead:");
			p39_nodes.forEach(detach);
			t231 = claim_space(section4_nodes);
			pre11 = claim_element(section4_nodes, "PRE", { class: true });
			var pre11_nodes = children(pre11);
			pre11_nodes.forEach(detach);
			t232 = claim_space(section4_nodes);
			p40 = claim_element(section4_nodes, "P", {});
			var p40_nodes = children(p40);
			t233 = claim_text(p40_nodes, "The ");
			code41 = claim_element(p40_nodes, "CODE", {});
			var code41_nodes = children(code41);
			t234 = claim_text(code41_nodes, "b`...`");
			code41_nodes.forEach(detach);
			t235 = claim_text(p40_nodes, ", is called a ");
			a24 = claim_element(p40_nodes, "A", { href: true, rel: true });
			var a24_nodes = children(a24);
			t236 = claim_text(a24_nodes, "tagged template");
			a24_nodes.forEach(detach);
			t237 = claim_text(p40_nodes, ", where the ");
			code42 = claim_element(p40_nodes, "CODE", {});
			var code42_nodes = children(code42);
			t238 = claim_text(code42_nodes, "b");
			code42_nodes.forEach(detach);
			t239 = claim_text(p40_nodes, " is a function that takes in the template literal and return something. In this case, the ");
			code43 = claim_element(p40_nodes, "CODE", {});
			var code43_nodes = children(code43);
			t240 = claim_text(code43_nodes, "b");
			code43_nodes.forEach(detach);
			t241 = claim_text(p40_nodes, " function returns an ");
			a25 = claim_element(p40_nodes, "A", { href: true, rel: true });
			var a25_nodes = children(a25);
			t242 = claim_text(a25_nodes, "Abstract Syntaxt Tree (AST)");
			a25_nodes.forEach(detach);
			t243 = claim_text(p40_nodes, ".");
			p40_nodes.forEach(detach);
			t244 = claim_space(section4_nodes);
			p41 = claim_element(section4_nodes, "P", {});
			var p41_nodes = children(p41);
			t245 = claim_text(p41_nodes, "The ");
			code44 = claim_element(p41_nodes, "CODE", {});
			var code44_nodes = children(code44);
			t246 = claim_text(code44_nodes, "b");
			code44_nodes.forEach(detach);
			t247 = claim_text(p41_nodes, " function comes from ");
			a26 = claim_element(p41_nodes, "A", { href: true, rel: true });
			var a26_nodes = children(a26);
			t248 = claim_text(a26_nodes, "code-red");
			a26_nodes.forEach(detach);
			t249 = claim_text(p41_nodes, ", a utility to generate a JavaScript AST node. Beside ");
			code45 = claim_element(p41_nodes, "CODE", {});
			var code45_nodes = children(code45);
			t250 = claim_text(code45_nodes, "b");
			code45_nodes.forEach(detach);
			t251 = claim_text(p41_nodes, ", ");
			code46 = claim_element(p41_nodes, "CODE", {});
			var code46_nodes = children(code46);
			t252 = claim_text(code46_nodes, "code-red");
			code46_nodes.forEach(detach);
			t253 = claim_text(p41_nodes, " provides a few helper functions:");
			p41_nodes.forEach(detach);
			t254 = claim_space(section4_nodes);
			ul4 = claim_element(section4_nodes, "UL", {});
			var ul4_nodes = children(ul4);
			li15 = claim_element(ul4_nodes, "LI", {});
			var li15_nodes = children(li15);
			code47 = claim_element(li15_nodes, "CODE", {});
			var code47_nodes = children(code47);
			t255 = claim_text(code47_nodes, "b");
			code47_nodes.forEach(detach);
			t256 = claim_text(li15_nodes, " returns a block node");
			li15_nodes.forEach(detach);
			t257 = claim_space(ul4_nodes);
			li16 = claim_element(ul4_nodes, "LI", {});
			var li16_nodes = children(li16);
			code48 = claim_element(li16_nodes, "CODE", {});
			var code48_nodes = children(code48);
			t258 = claim_text(code48_nodes, "x");
			code48_nodes.forEach(detach);
			t259 = claim_text(li16_nodes, " returns an expression node");
			li16_nodes.forEach(detach);
			t260 = claim_space(ul4_nodes);
			li17 = claim_element(ul4_nodes, "LI", {});
			var li17_nodes = children(li17);
			code49 = claim_element(li17_nodes, "CODE", {});
			var code49_nodes = children(code49);
			t261 = claim_text(code49_nodes, "p");
			code49_nodes.forEach(detach);
			t262 = claim_text(li17_nodes, " returns a object property node");
			li17_nodes.forEach(detach);
			ul4_nodes.forEach(detach);
			t263 = claim_space(section4_nodes);
			p42 = claim_element(section4_nodes, "P", {});
			var p42_nodes = children(p42);
			t264 = claim_text(p42_nodes, "These helper functions are useful in generating code in Svelte compiler, particularly because the placeholder itself can takes in another AST node:");
			p42_nodes.forEach(detach);
			t265 = claim_space(section4_nodes);
			pre12 = claim_element(section4_nodes, "PRE", { class: true });
			var pre12_nodes = children(pre12);
			pre12_nodes.forEach(detach);
			t266 = claim_space(section4_nodes);
			p43 = claim_element(section4_nodes, "P", {});
			var p43_nodes = children(p43);
			code50 = claim_element(p43_nodes, "CODE", {});
			var code50_nodes = children(code50);
			t267 = claim_text(code50_nodes, "@");
			code50_nodes.forEach(detach);
			t268 = claim_text(p43_nodes, " in front of ");
			code51 = claim_element(p43_nodes, "CODE", {});
			var code51_nodes = children(code51);
			t269 = claim_text(code51_nodes, "@select_option");
			code51_nodes.forEach(detach);
			t270 = claim_text(p43_nodes, " is a convention in Svelte, where it will ");
			a27 = claim_element(p43_nodes, "A", { href: true, rel: true });
			var a27_nodes = children(a27);
			t271 = claim_text(a27_nodes, "get replaced");
			a27_nodes.forEach(detach);
			t272 = claim_text(p43_nodes, " to refer to helpr functions in ");
			code52 = claim_element(p43_nodes, "CODE", {});
			var code52_nodes = children(code52);
			t273 = claim_text(code52_nodes, "src/runtime/");
			code52_nodes.forEach(detach);
			t274 = claim_text(p43_nodes, " before writing the generated AST out:");
			p43_nodes.forEach(detach);
			t275 = claim_space(section4_nodes);
			pre13 = claim_element(section4_nodes, "PRE", { class: true });
			var pre13_nodes = children(pre13);
			pre13_nodes.forEach(detach);
			t276 = claim_space(section4_nodes);
			p44 = claim_element(section4_nodes, "P", {});
			var p44_nodes = children(p44);
			t277 = claim_text(p44_nodes, "Coming back to figure out why this piece of code is not executed when there's a spread attribute,");
			p44_nodes.forEach(detach);
			t278 = claim_space(section4_nodes);
			pre14 = claim_element(section4_nodes, "PRE", { class: true });
			var pre14_nodes = children(pre14);
			pre14_nodes.forEach(detach);
			t279 = claim_space(section4_nodes);
			p45 = claim_element(section4_nodes, "P", {});
			var p45_nodes = children(p45);
			t280 = claim_text(p45_nodes, "I tried adding ");
			code53 = claim_element(p45_nodes, "CODE", {});
			var code53_nodes = children(code53);
			t281 = claim_text(code53_nodes, "console.log");
			code53_nodes.forEach(detach);
			t282 = claim_text(p45_nodes, " before the if statement, to figure out the value for ");
			code54 = claim_element(p45_nodes, "CODE", {});
			var code54_nodes = children(code54);
			t283 = claim_text(code54_nodes, "is_legacy_input_type");
			code54_nodes.forEach(detach);
			t284 = claim_text(p45_nodes, " and ");
			code55 = claim_element(p45_nodes, "CODE", {});
			var code55_nodes = children(code55);
			t285 = claim_text(code55_nodes, "is_select_value_attribute");
			code55_nodes.forEach(detach);
			t286 = claim_text(p45_nodes, ":");
			p45_nodes.forEach(detach);
			t287 = claim_space(section4_nodes);
			pre15 = claim_element(section4_nodes, "PRE", { class: true });
			var pre15_nodes = children(pre15);
			pre15_nodes.forEach(detach);
			t288 = claim_space(section4_nodes);
			p46 = claim_element(section4_nodes, "P", {});
			var p46_nodes = children(p46);
			t289 = claim_text(p46_nodes, "To my surpise, there was no log. ");
			code56 = claim_element(p46_nodes, "CODE", {});
			var code56_nodes = children(code56);
			t290 = claim_text(code56_nodes, "AttributeWrapper#render");
			code56_nodes.forEach(detach);
			t291 = claim_text(p46_nodes, " wasn't executed.");
			p46_nodes.forEach(detach);
			t292 = claim_space(section4_nodes);
			p47 = claim_element(section4_nodes, "P", {});
			var p47_nodes = children(p47);
			t293 = claim_text(p47_nodes, "I tried removing the spread attribute, and verified from the log that the ");
			code57 = claim_element(p47_nodes, "CODE", {});
			var code57_nodes = children(code57);
			t294 = claim_text(code57_nodes, "AttributeWrapper#render");
			code57_nodes.forEach(detach);
			t295 = claim_text(p47_nodes, " method was indeed executed when there's no spread attribute.");
			p47_nodes.forEach(detach);
			t296 = claim_space(section4_nodes);
			p48 = claim_element(section4_nodes, "P", {});
			var p48_nodes = children(p48);
			t297 = claim_text(p48_nodes, "To figure out the caller of the ");
			code58 = claim_element(p48_nodes, "CODE", {});
			var code58_nodes = children(code58);
			t298 = claim_text(code58_nodes, "AttributeWrapper#render");
			code58_nodes.forEach(detach);
			t299 = claim_text(p48_nodes, " method, I added ");
			code59 = claim_element(p48_nodes, "CODE", {});
			var code59_nodes = children(code59);
			t300 = claim_text(code59_nodes, "console.trace");
			code59_nodes.forEach(detach);
			t301 = claim_text(p48_nodes, " at the top of the method:");
			p48_nodes.forEach(detach);
			t302 = claim_space(section4_nodes);
			pre16 = claim_element(section4_nodes, "PRE", { class: true });
			var pre16_nodes = children(pre16);
			pre16_nodes.forEach(detach);
			t303 = claim_space(section4_nodes);
			pre17 = claim_element(section4_nodes, "PRE", { class: true });
			var pre17_nodes = children(pre17);
			pre17_nodes.forEach(detach);
			t304 = claim_space(section4_nodes);
			p49 = claim_element(section4_nodes, "P", {});
			var p49_nodes = children(p49);
			t305 = claim_text(p49_nodes, "This brought me to ");
			a28 = claim_element(p49_nodes, "A", { href: true, rel: true });
			var a28_nodes = children(a28);
			t306 = claim_text(a28_nodes, "src/compiler/compile/render_dom/wrappers/Element/index.ts");
			a28_nodes.forEach(detach);
			p49_nodes.forEach(detach);
			t307 = claim_space(section4_nodes);
			pre18 = claim_element(section4_nodes, "PRE", { class: true });
			var pre18_nodes = children(pre18);
			pre18_nodes.forEach(detach);
			t308 = claim_space(section4_nodes);
			p50 = claim_element(section4_nodes, "P", {});
			var p50_nodes = children(p50);
			t309 = claim_text(p50_nodes, "If there's a spread attribute, it will call the ");
			code60 = claim_element(p50_nodes, "CODE", {});
			var code60_nodes = children(code60);
			t310 = claim_text(code60_nodes, "this.node.attributes.some(attr => attr.is_spread)");
			code60_nodes.forEach(detach);
			t311 = claim_text(p50_nodes, " method instead of calling ");
			code61 = claim_element(p50_nodes, "CODE", {});
			var code61_nodes = children(code61);
			t312 = claim_text(code61_nodes, "attribute.render(block)");
			code61_nodes.forEach(detach);
			t313 = claim_text(p50_nodes, ", so that's probably why ");
			code62 = claim_element(p50_nodes, "CODE", {});
			var code62_nodes = children(code62);
			t314 = claim_text(code62_nodes, "AttributeWrapper#render");
			code62_nodes.forEach(detach);
			t315 = claim_text(p50_nodes, " wasn't called.");
			p50_nodes.forEach(detach);
			t316 = claim_space(section4_nodes);
			p51 = claim_element(section4_nodes, "P", {});
			var p51_nodes = children(p51);
			t317 = claim_text(p51_nodes, "I looked into the method ");
			code63 = claim_element(p51_nodes, "CODE", {});
			var code63_nodes = children(code63);
			t318 = claim_text(code63_nodes, "add_spread_attributes");
			code63_nodes.forEach(detach);
			t319 = claim_text(p51_nodes, ", found out it contain only the code about handling spread attributes as I explained earlier. It didn't have any code related to ");
			code64 = claim_element(p51_nodes, "CODE", {});
			var code64_nodes = children(code64);
			t320 = claim_text(code64_nodes, "select_options");
			code64_nodes.forEach(detach);
			t321 = claim_text(p51_nodes, ", so I figured that, maybe ");
			code65 = claim_element(p51_nodes, "CODE", {});
			var code65_nodes = children(code65);
			t322 = claim_text(code65_nodes, "<select multiple>");
			code65_nodes.forEach(detach);
			t323 = claim_text(p51_nodes, " with spread attribute is an edge case that wasn't handled currently at all.");
			p51_nodes.forEach(detach);
			t324 = claim_space(section4_nodes);
			p52 = claim_element(section4_nodes, "P", {});
			var p52_nodes = children(p52);
			t325 = claim_text(p52_nodes, "So, I tried to add a special check for this case at the bottom of the ");
			code66 = claim_element(p52_nodes, "CODE", {});
			var code66_nodes = children(code66);
			t326 = claim_text(code66_nodes, "add_spread_attributes");
			code66_nodes.forEach(detach);
			t327 = claim_text(p52_nodes, " method:");
			p52_nodes.forEach(detach);
			t328 = claim_space(section4_nodes);
			pre19 = claim_element(section4_nodes, "PRE", { class: true });
			var pre19_nodes = children(pre19);
			pre19_nodes.forEach(detach);
			t329 = claim_space(section4_nodes);
			p53 = claim_element(section4_nodes, "P", {});
			var p53_nodes = children(p53);
			t330 = claim_text(p53_nodes, "As mentioned in the ");
			a29 = claim_element(p53_nodes, "A", { href: true });
			var a29_nodes = children(a29);
			t331 = claim_text(a29_nodes, "The Svelte Compiler Handbook");
			a29_nodes.forEach(detach);
			t332 = claim_text(p53_nodes, ", a ");
			code67 = claim_element(p53_nodes, "CODE", {});
			var code67_nodes = children(code67);
			t333 = claim_text(code67_nodes, "block");
			code67_nodes.forEach(detach);
			t334 = claim_text(p53_nodes, " is where it keeps the code to generate the ");
			a30 = claim_element(p53_nodes, "A", { href: true });
			var a30_nodes = children(a30);
			code68 = claim_element(a30_nodes, "CODE", {});
			var code68_nodes = children(code68);
			t335 = claim_text(code68_nodes, "create_fragment");
			code68_nodes.forEach(detach);
			a30_nodes.forEach(detach);
			t336 = claim_text(p53_nodes, " function. The return object of the ");
			code69 = claim_element(p53_nodes, "CODE", {});
			var code69_nodes = children(code69);
			t337 = claim_text(code69_nodes, "create_fragment");
			code69_nodes.forEach(detach);
			t338 = claim_text(p53_nodes, " function contains various method as mentioned in ");
			a31 = claim_element(p53_nodes, "A", { href: true });
			var a31_nodes = children(a31);
			t339 = claim_text(a31_nodes, "Compile Svelte in your Head");
			a31_nodes.forEach(detach);
			t340 = claim_text(p53_nodes, ", such as ");
			code70 = claim_element(p53_nodes, "CODE", {});
			var code70_nodes = children(code70);
			t341 = claim_text(code70_nodes, "c()");
			code70_nodes.forEach(detach);
			t342 = claim_text(p53_nodes, ", ");
			code71 = claim_element(p53_nodes, "CODE", {});
			var code71_nodes = children(code71);
			t343 = claim_text(code71_nodes, "m()");
			code71_nodes.forEach(detach);
			t344 = claim_text(p53_nodes, " and ");
			code72 = claim_element(p53_nodes, "CODE", {});
			var code72_nodes = children(code72);
			t345 = claim_text(code72_nodes, "d()");
			code72_nodes.forEach(detach);
			t346 = claim_text(p53_nodes, ". To add code into different method, you can push them into the array in ");
			code73 = claim_element(p53_nodes, "CODE", {});
			var code73_nodes = children(code73);
			t347 = claim_text(code73_nodes, "block.chunks");
			code73_nodes.forEach(detach);
			t348 = claim_text(p53_nodes, ", for example:");
			p53_nodes.forEach(detach);
			t349 = claim_space(section4_nodes);
			pre20 = claim_element(section4_nodes, "PRE", { class: true });
			var pre20_nodes = children(pre20);
			pre20_nodes.forEach(detach);
			t350 = claim_space(section4_nodes);
			p54 = claim_element(section4_nodes, "P", {});
			var p54_nodes = children(p54);
			t351 = claim_text(p54_nodes, "I tried adding ");
			code74 = claim_element(p54_nodes, "CODE", {});
			var code74_nodes = children(code74);
			t352 = claim_text(code74_nodes, "@select_options(...)");
			code74_nodes.forEach(detach);
			t353 = claim_text(p54_nodes, " into the ");
			code75 = claim_element(p54_nodes, "CODE", {});
			var code75_nodes = children(code75);
			t354 = claim_text(code75_nodes, "m()");
			code75_nodes.forEach(detach);
			t355 = claim_text(p54_nodes, " method and yup, the ");
			code76 = claim_element(p54_nodes, "CODE", {});
			var code76_nodes = children(code76);
			t356 = claim_text(code76_nodes, "<select>");
			code76_nodes.forEach(detach);
			t357 = claim_text(p54_nodes, " element is pre-selected correctly!");
			p54_nodes.forEach(detach);
			section4_nodes.forEach(detach);
			t358 = claim_space(nodes);
			section5 = claim_element(nodes, "SECTION", {});
			var section5_nodes = children(section5);
			h24 = claim_element(section5_nodes, "H2", {});
			var h24_nodes = children(h24);
			a32 = claim_element(h24_nodes, "A", { href: true, id: true });
			var a32_nodes = children(a32);
			t359 = claim_text(a32_nodes, "Fixing the bug");
			a32_nodes.forEach(detach);
			h24_nodes.forEach(detach);
			t360 = claim_space(section5_nodes);
			p55 = claim_element(section5_nodes, "P", {});
			var p55_nodes = children(p55);
			t361 = claim_text(p55_nodes, "To ensure the bug is fixed, I need to come up with a test.");
			p55_nodes.forEach(detach);
			t362 = claim_space(section5_nodes);
			p56 = claim_element(section5_nodes, "P", {});
			var p56_nodes = children(p56);
			t363 = claim_text(p56_nodes, "Usually I come up with test cases that try to entail various scenario I can imagine.");
			p56_nodes.forEach(detach);
			t364 = claim_space(section5_nodes);
			p57 = claim_element(section5_nodes, "P", {});
			var p57_nodes = children(p57);
			t365 = claim_text(p57_nodes, "In this example, we've manually tested the case where the ");
			code77 = claim_element(p57_nodes, "CODE", {});
			var code77_nodes = children(code77);
			t366 = claim_text(code77_nodes, "<select multiple {value} {...{}}>");
			code77_nodes.forEach(detach);
			t367 = claim_text(p57_nodes, ", the value is set correctly during initialisation. but have we check the case where:");
			p57_nodes.forEach(detach);
			t368 = claim_space(section5_nodes);
			ul5 = claim_element(section5_nodes, "UL", {});
			var ul5_nodes = children(ul5);
			li18 = claim_element(ul5_nodes, "LI", {});
			var li18_nodes = children(li18);
			t369 = claim_text(li18_nodes, "we update the value of ");
			code78 = claim_element(li18_nodes, "CODE", {});
			var code78_nodes = children(code78);
			t370 = claim_text(code78_nodes, "value");
			code78_nodes.forEach(detach);
			t371 = claim_text(li18_nodes, ", will the ");
			code79 = claim_element(li18_nodes, "CODE", {});
			var code79_nodes = children(code79);
			t372 = claim_text(code79_nodes, "<select>");
			code79_nodes.forEach(detach);
			t373 = claim_text(li18_nodes, " get updated accordingly?");
			li18_nodes.forEach(detach);
			t374 = claim_space(ul5_nodes);
			li19 = claim_element(ul5_nodes, "LI", {});
			var li19_nodes = children(li19);
			t375 = claim_text(li19_nodes, "if the value is overriden by the spreaded attribute, eg ");
			code80 = claim_element(li19_nodes, "CODE", {});
			var code80_nodes = children(code80);
			t376 = claim_text(code80_nodes, "<select mutliple {value} { ...{value: []} }>");
			code80_nodes.forEach(detach);
			t377 = claim_text(li19_nodes, "?");
			li19_nodes.forEach(detach);
			ul5_nodes.forEach(detach);
			t378 = claim_space(section5_nodes);
			p58 = claim_element(section5_nodes, "P", {});
			var p58_nodes = children(p58);
			t379 = claim_text(p58_nodes, "Ideally, the test cases come up should be failed before the fix, and passed after the fix.");
			p58_nodes.forEach(detach);
			t380 = claim_space(section5_nodes);
			p59 = claim_element(section5_nodes, "P", {});
			var p59_nodes = children(p59);
			t381 = claim_text(p59_nodes, "So here's the test case I came up:");
			p59_nodes.forEach(detach);
			t382 = claim_space(section5_nodes);
			pre21 = claim_element(section5_nodes, "PRE", { class: true });
			var pre21_nodes = children(pre21);
			pre21_nodes.forEach(detach);
			t383 = claim_space(section5_nodes);
			p60 = claim_element(section5_nodes, "P", {});
			var p60_nodes = children(p60);
			t384 = claim_text(p60_nodes, "I can check and uncheck the checkbox to change the value of ");
			code81 = claim_element(p60_nodes, "CODE", {});
			var code81_nodes = children(code81);
			t385 = claim_text(code81_nodes, "value");
			code81_nodes.forEach(detach);
			t386 = claim_text(p60_nodes, " to verify the the ");
			code82 = claim_element(p60_nodes, "CODE", {});
			var code82_nodes = children(code82);
			t387 = claim_text(code82_nodes, "value");
			code82_nodes.forEach(detach);
			t388 = claim_text(p60_nodes, " is reactive, and ");
			code83 = claim_element(p60_nodes, "CODE", {});
			var code83_nodes = children(code83);
			t389 = claim_text(code83_nodes, "<select>");
			code83_nodes.forEach(detach);
			t390 = claim_text(p60_nodes, " will get updated accordingly.");
			p60_nodes.forEach(detach);
			t391 = claim_space(section5_nodes);
			p61 = claim_element(section5_nodes, "P", {});
			var p61_nodes = children(p61);
			t392 = claim_text(p61_nodes, "Besides that, I exported ");
			code84 = claim_element(p61_nodes, "CODE", {});
			var code84_nodes = children(code84);
			t393 = claim_text(code84_nodes, "spread");
			code84_nodes.forEach(detach);
			t394 = claim_text(p61_nodes, ", so that I can change the object to something object to contain ");
			code85 = claim_element(p61_nodes, "CODE", {});
			var code85_nodes = children(code85);
			t395 = claim_text(code85_nodes, "value");
			code85_nodes.forEach(detach);
			t396 = claim_text(p61_nodes, ", eg: ");
			code86 = claim_element(p61_nodes, "CODE", {});
			var code86_nodes = children(code86);
			t397 = claim_text(code86_nodes, "{ value: [] }");
			code86_nodes.forEach(detach);
			t398 = claim_text(p61_nodes, ", and see how ");
			code87 = claim_element(p61_nodes, "CODE", {});
			var code87_nodes = children(code87);
			t399 = claim_text(code87_nodes, "<select>");
			code87_nodes.forEach(detach);
			t400 = claim_text(p61_nodes, " will update accordingly. Make sure that our fix not just work with ");
			code88 = claim_element(p61_nodes, "CODE", {});
			var code88_nodes = children(code88);
			t401 = claim_text(code88_nodes, "value");
			code88_nodes.forEach(detach);
			t402 = claim_text(p61_nodes, " attribute, and also when the ");
			code89 = claim_element(p61_nodes, "CODE", {});
			var code89_nodes = children(code89);
			t403 = claim_text(code89_nodes, "value");
			code89_nodes.forEach(detach);
			t404 = claim_text(p61_nodes, " is spreaded into ");
			code90 = claim_element(p61_nodes, "CODE", {});
			var code90_nodes = children(code90);
			t405 = claim_text(code90_nodes, "<select>");
			code90_nodes.forEach(detach);
			t406 = claim_text(p61_nodes, ".");
			p61_nodes.forEach(detach);
			t407 = claim_space(section5_nodes);
			p62 = claim_element(section5_nodes, "P", {});
			var p62_nodes = children(p62);
			t408 = claim_text(p62_nodes, "You may think that we are familiar with our fix, we know what it will fix, what it will not fix, do we need think up and write all the edge cases?");
			p62_nodes.forEach(detach);
			t409 = claim_space(section5_nodes);
			p63 = claim_element(section5_nodes, "P", {});
			var p63_nodes = children(p63);
			t410 = claim_text(p63_nodes, "Well, I think you should. Future you will thank the present you when he encounter a fail test, that just mean his change may have an unintentional regressional change. If you don't have the test case, the future you will never know what edge case he didn't accounted for.");
			p63_nodes.forEach(detach);
			t411 = claim_space(section5_nodes);
			p64 = claim_element(section5_nodes, "P", {});
			var p64_nodes = children(p64);
			t412 = claim_text(p64_nodes, "Runtime test cases are added into ");
			code91 = claim_element(p64_nodes, "CODE", {});
			var code91_nodes = children(code91);
			t413 = claim_text(code91_nodes, "test/runtime/samples/");
			code91_nodes.forEach(detach);
			t414 = claim_text(p64_nodes, ". Each folder represent 1 test case. Inside the folder, the component to be tested is named ");
			code92 = claim_element(p64_nodes, "CODE", {});
			var code92_nodes = children(code92);
			t415 = claim_text(code92_nodes, "App.svelte");
			code92_nodes.forEach(detach);
			t416 = claim_text(p64_nodes, ", and the test case is written ");
			code93 = claim_element(p64_nodes, "CODE", {});
			var code93_nodes = children(code93);
			t417 = claim_text(code93_nodes, "_config.js");
			code93_nodes.forEach(detach);
			t418 = claim_text(p64_nodes, ".");
			p64_nodes.forEach(detach);
			t419 = claim_space(section5_nodes);
			p65 = claim_element(section5_nodes, "P", {});
			var p65_nodes = children(p65);
			code94 = claim_element(p65_nodes, "CODE", {});
			var code94_nodes = children(code94);
			t420 = claim_text(code94_nodes, "_config.js");
			code94_nodes.forEach(detach);
			t421 = claim_text(p65_nodes, " default exports a object:");
			p65_nodes.forEach(detach);
			t422 = claim_space(section5_nodes);
			pre22 = claim_element(section5_nodes, "PRE", { class: true });
			var pre22_nodes = children(pre22);
			pre22_nodes.forEach(detach);
			t423 = claim_space(section5_nodes);
			p66 = claim_element(section5_nodes, "P", {});
			var p66_nodes = children(p66);
			t424 = claim_text(p66_nodes, "An example of test case of unchecking the checkbox, and verify ");
			code95 = claim_element(p66_nodes, "CODE", {});
			var code95_nodes = children(code95);
			t425 = claim_text(code95_nodes, "<select>");
			code95_nodes.forEach(detach);
			t426 = claim_text(p66_nodes, " value get updated");
			p66_nodes.forEach(detach);
			t427 = claim_space(section5_nodes);
			pre23 = claim_element(section5_nodes, "PRE", { class: true });
			var pre23_nodes = children(pre23);
			pre23_nodes.forEach(detach);
			t428 = claim_space(section5_nodes);
			p67 = claim_element(section5_nodes, "P", {});
			var p67_nodes = children(p67);
			t429 = claim_text(p67_nodes, "To run only this test, so that we can focus on ensuring the test case pass, we can set ");
			code96 = claim_element(p67_nodes, "CODE", {});
			var code96_nodes = children(code96);
			t430 = claim_text(code96_nodes, "solo: true");
			code96_nodes.forEach(detach);
			t431 = claim_text(p67_nodes, ":");
			p67_nodes.forEach(detach);
			t432 = claim_space(section5_nodes);
			pre24 = claim_element(section5_nodes, "PRE", { class: true });
			var pre24_nodes = children(pre24);
			pre24_nodes.forEach(detach);
			t433 = claim_space(section5_nodes);
			p68 = claim_element(section5_nodes, "P", {});
			var p68_nodes = children(p68);
			strong5 = claim_element(p68_nodes, "STRONG", {});
			var strong5_nodes = children(strong5);
			t434 = claim_text(strong5_nodes, "Quick tip:");
			strong5_nodes.forEach(detach);
			t435 = claim_text(p68_nodes, " running ");
			code97 = claim_element(p68_nodes, "CODE", {});
			var code97_nodes = children(code97);
			t436 = claim_text(code97_nodes, "npm run test");
			code97_nodes.forEach(detach);
			t437 = claim_text(p68_nodes, " will build Svelte code first before executing the test. If you are like me, running ");
			code98 = claim_element(p68_nodes, "CODE", {});
			var code98_nodes = children(code98);
			t438 = claim_text(code98_nodes, "npm run dev");
			code98_nodes.forEach(detach);
			t439 = claim_text(p68_nodes, " on the background, Svelte code is build on every code change. So, ");
			code99 = claim_element(p68_nodes, "CODE", {});
			var code99_nodes = children(code99);
			t440 = claim_text(code99_nodes, "npm run quicktest");
			code99_nodes.forEach(detach);
			t441 = claim_text(p68_nodes, " would allow you to skip the ");
			code100 = claim_element(p68_nodes, "CODE", {});
			var code100_nodes = children(code100);
			t442 = claim_text(code100_nodes, "pretest");
			code100_nodes.forEach(detach);
			t443 = claim_text(p68_nodes, " build, and run the test suite immediately.");
			p68_nodes.forEach(detach);
			t444 = claim_space(section5_nodes);
			p69 = claim_element(section5_nodes, "P", {});
			var p69_nodes = children(p69);
			t445 = claim_text(p69_nodes, "With the test, I realised that I didn't handle the case when the ");
			code101 = claim_element(p69_nodes, "CODE", {});
			var code101_nodes = children(code101);
			t446 = claim_text(code101_nodes, "value");
			code101_nodes.forEach(detach);
			t447 = claim_text(p69_nodes, " is updated.");
			p69_nodes.forEach(detach);
			t448 = claim_space(section5_nodes);
			p70 = claim_element(section5_nodes, "P", {});
			var p70_nodes = children(p70);
			t449 = claim_text(p70_nodes, "So I guess what I needed to do is to add the same code in the ");
			code102 = claim_element(p70_nodes, "CODE", {});
			var code102_nodes = children(code102);
			t450 = claim_text(code102_nodes, "p()");
			code102_nodes.forEach(detach);
			t451 = claim_text(p70_nodes, " (update) method too!");
			p70_nodes.forEach(detach);
			t452 = claim_space(section5_nodes);
			pre25 = claim_element(section5_nodes, "PRE", { class: true });
			var pre25_nodes = children(pre25);
			pre25_nodes.forEach(detach);
			t453 = claim_space(section5_nodes);
			p71 = claim_element(section5_nodes, "P", {});
			var p71_nodes = children(p71);
			t454 = claim_text(p71_nodes, "Well, of course in this way, the ");
			code103 = claim_element(p71_nodes, "CODE", {});
			var code103_nodes = children(code103);
			t455 = claim_text(code103_nodes, "select_options");
			code103_nodes.forEach(detach);
			t456 = claim_text(p71_nodes, " get executed unconditionally whenever any variable is updated.");
			p71_nodes.forEach(detach);
			t457 = claim_space(section5_nodes);
			p72 = claim_element(section5_nodes, "P", {});
			var p72_nodes = children(p72);
			t458 = claim_text(p72_nodes, "I need to make sure that the ");
			code104 = claim_element(p72_nodes, "CODE", {});
			var code104_nodes = children(code104);
			t459 = claim_text(code104_nodes, "select_options(...)");
			code104_nodes.forEach(detach);
			t460 = claim_text(p72_nodes, " inside the ");
			code105 = claim_element(p72_nodes, "CODE", {});
			var code105_nodes = children(code105);
			t461 = claim_text(code105_nodes, "p()");
			code105_nodes.forEach(detach);
			t462 = claim_text(p72_nodes, " method get executed only when the value of ");
			code106 = claim_element(p72_nodes, "CODE", {});
			var code106_nodes = children(code106);
			t463 = claim_text(code106_nodes, "value");
			code106_nodes.forEach(detach);
			t464 = claim_text(p72_nodes, " changes, and also probably when ");
			code107 = claim_element(p72_nodes, "CODE", {});
			var code107_nodes = children(code107);
			t465 = claim_text(code107_nodes, "spread");
			code107_nodes.forEach(detach);
			t466 = claim_text(p72_nodes, " changes too, because it could potentially override the value of ");
			code108 = claim_element(p72_nodes, "CODE", {});
			var code108_nodes = children(code108);
			t467 = claim_text(code108_nodes, "value");
			code108_nodes.forEach(detach);
			t468 = claim_text(p72_nodes, ".");
			p72_nodes.forEach(detach);
			t469 = claim_space(section5_nodes);
			p73 = claim_element(section5_nodes, "P", {});
			var p73_nodes = children(p73);
			t470 = claim_text(p73_nodes, "If you've read ");
			a33 = claim_element(p73_nodes, "A", { href: true });
			var a33_nodes = children(a33);
			t471 = claim_text(a33_nodes, "Compile Svelte in your Head - Bitmask in Svelte");
			a33_nodes.forEach(detach);
			t472 = claim_text(p73_nodes, ", you know that Svelte uses bitmask to check any variable changes.");
			p73_nodes.forEach(detach);
			t473 = claim_space(section5_nodes);
			p74 = claim_element(section5_nodes, "P", {});
			var p74_nodes = children(p74);
			t474 = claim_text(p74_nodes, "How do I know what is the bitmask to use in this case, well I dont have to.");
			p74_nodes.forEach(detach);
			t475 = claim_space(section5_nodes);
			p75 = claim_element(section5_nodes, "P", {});
			var p75_nodes = children(p75);
			t476 = claim_text(p75_nodes, "I can use ");
			a34 = claim_element(p75_nodes, "A", { href: true, rel: true });
			var a34_nodes = children(a34);
			code109 = claim_element(a34_nodes, "CODE", {});
			var code109_nodes = children(code109);
			t477 = claim_text(code109_nodes, "renderer.dirty(dependencies)");
			code109_nodes.forEach(detach);
			a34_nodes.forEach(detach);
			t478 = claim_text(p75_nodes, " to help me with that:");
			p75_nodes.forEach(detach);
			t479 = claim_space(section5_nodes);
			pre26 = claim_element(section5_nodes, "PRE", { class: true });
			var pre26_nodes = children(pre26);
			pre26_nodes.forEach(detach);
			t480 = claim_space(section5_nodes);
			p76 = claim_element(section5_nodes, "P", {});
			var p76_nodes = children(p76);
			t481 = claim_text(p76_nodes, "Next, I need to figure out what are the dependencies to be included. In this particular case, the dependencies of all attributes have to be taken consideration, because it is hard to tell which one would be eventually applied due to the spread attribute.");
			p76_nodes.forEach(detach);
			t482 = claim_space(section5_nodes);
			pre27 = claim_element(section5_nodes, "PRE", { class: true });
			var pre27_nodes = children(pre27);
			pre27_nodes.forEach(detach);
			t483 = claim_space(section5_nodes);
			p77 = claim_element(section5_nodes, "P", {});
			var p77_nodes = children(p77);
			t484 = claim_text(p77_nodes, "After a few tweaks, finally I passed all my test cases, and its time to create a pull request!");
			p77_nodes.forEach(detach);
			section5_nodes.forEach(detach);
			t485 = claim_space(nodes);
			section6 = claim_element(nodes, "SECTION", {});
			var section6_nodes = children(section6);
			h25 = claim_element(section6_nodes, "H2", {});
			var h25_nodes = children(h25);
			a35 = claim_element(h25_nodes, "A", { href: true, id: true });
			var a35_nodes = children(a35);
			t486 = claim_text(a35_nodes, "Submitting the fix");
			a35_nodes.forEach(detach);
			h25_nodes.forEach(detach);
			t487 = claim_space(section6_nodes);
			p78 = claim_element(section6_nodes, "P", {});
			var p78_nodes = children(p78);
			t488 = claim_text(p78_nodes, "Before pushing the fix to remote, it is important to make sure that all the lints and typescript definitions are correct. You can run ");
			code110 = claim_element(p78_nodes, "CODE", {});
			var code110_nodes = children(code110);
			t489 = claim_text(code110_nodes, "npm run lint --fixed");
			code110_nodes.forEach(detach);
			t490 = claim_text(p78_nodes, " for linting, and ");
			code111 = claim_element(p78_nodes, "CODE", {});
			var code111_nodes = children(code111);
			t491 = claim_text(code111_nodes, "npm run tsd");
			code111_nodes.forEach(detach);
			t492 = claim_text(p78_nodes, " to generate typescript definition.");
			p78_nodes.forEach(detach);
			t493 = claim_space(section6_nodes);
			p79 = claim_element(section6_nodes, "P", {});
			var p79_nodes = children(p79);
			t494 = claim_text(p79_nodes, "If you are unsure on how to create a pull request, you can check out ");
			a36 = claim_element(p79_nodes, "A", { href: true, rel: true });
			var a36_nodes = children(a36);
			t495 = claim_text(a36_nodes, "How to make your first pull request on GitHub");
			a36_nodes.forEach(detach);
			t496 = claim_text(p79_nodes, ".");
			p79_nodes.forEach(detach);
			t497 = claim_space(section6_nodes);
			p80 = claim_element(section6_nodes, "P", {});
			var p80_nodes = children(p80);
			t498 = claim_text(p80_nodes, "I pushed my branch and created a ");
			a37 = claim_element(p80_nodes, "A", { href: true, rel: true });
			var a37_nodes = children(a37);
			t499 = claim_text(a37_nodes, "Pull Request to Svelte");
			a37_nodes.forEach(detach);
			t500 = claim_text(p80_nodes, ", and now I am waiting for feedback and for it to get merged.");
			p80_nodes.forEach(detach);
			t501 = claim_space(section6_nodes);
			p81 = claim_element(section6_nodes, "P", {});
			var p81_nodes = children(p81);
			t502 = claim_text(p81_nodes, "Svelte is not maintained by full-time maintainers, everyone has their full-time job, so please be patient and be nice.");
			p81_nodes.forEach(detach);
			t503 = claim_space(section6_nodes);
			hr2 = claim_element(section6_nodes, "HR", {});
			t504 = claim_space(section6_nodes);
			p82 = claim_element(section6_nodes, "P", {});
			var p82_nodes = children(p82);
			t505 = claim_text(p82_nodes, "If you wish to learn more about Svelte, ");
			a38 = claim_element(p82_nodes, "A", { href: true, rel: true });
			var a38_nodes = children(a38);
			t506 = claim_text(a38_nodes, "follow me on Twitter");
			a38_nodes.forEach(detach);
			t507 = claim_text(p82_nodes, ".");
			p82_nodes.forEach(detach);
			t508 = claim_space(section6_nodes);
			p83 = claim_element(section6_nodes, "P", {});
			var p83_nodes = children(p83);
			t509 = claim_text(p83_nodes, "If you have anything unclear about this article, find me on ");
			a39 = claim_element(p83_nodes, "A", { href: true, rel: true });
			var a39_nodes = children(a39);
			t510 = claim_text(a39_nodes, "Twitter");
			a39_nodes.forEach(detach);
			t511 = claim_text(p83_nodes, " too!");
			p83_nodes.forEach(detach);
			section6_nodes.forEach(detach);
			this.h();
		},
		h() {
			attr(a0, "href", "#background");
			attr(a1, "href", "#the-story-begins");
			attr(a2, "href", "#verifying-the-bug");
			attr(a3, "href", "#investigating-the-bug");
			attr(a4, "href", "#fixing-the-bug");
			attr(a5, "href", "#submitting-the-fix");
			attr(ul0, "class", "sitemap");
			attr(ul0, "id", "sitemap");
			attr(ul0, "role", "navigation");
			attr(ul0, "aria-label", "Table of Contents");
			attr(a6, "href", "#background");
			attr(a6, "id", "background");
			attr(a7, "href", "https://svelte.dev/chat");
			attr(a7, "rel", "nofollow");
			attr(a8, "href", "/the-svelte-compiler-handbook/");
			attr(a9, "href", "#the-story-begins");
			attr(a9, "id", "the-story-begins");
			attr(a10, "href", "https://github.com/sveltejs/svelte/issues?q=is%3Aopen+is%3Aissue+label%3Abug");
			attr(a10, "rel", "nofollow");
			attr(a11, "href", "https://github.com/sveltejs/svelte/issues/4392");
			attr(a11, "rel", "nofollow");
			attr(pre0, "class", "language-svelte");
			attr(a12, "href", "https://svelte.dev/repl/99bd5ebecc464e328972252e287ab716?version=3.18.1");
			attr(a12, "rel", "nofollow");
			attr(a13, "href", "#verifying-the-bug");
			attr(a13, "id", "verifying-the-bug");
			attr(a14, "href", "https://github.com/Conduitry");
			attr(a14, "rel", "nofollow");
			attr(a15, "href", "https://github.com/sveltejs/svelte/issues/3680");
			attr(a15, "rel", "nofollow");
			attr(a16, "href", "https://github.com/sveltejs/svelte/issues/3680");
			attr(a16, "rel", "nofollow");
			attr(a17, "href", "https://github.com/sveltejs/svelte/pull/4398");
			attr(a17, "rel", "nofollow");
			attr(a18, "href", "https://github.com/sveltejs/svelte/issues/3680");
			attr(a18, "rel", "nofollow");
			attr(a19, "href", "#investigating-the-bug");
			attr(a19, "id", "investigating-the-bug");
			attr(a20, "href", "https://github.com/sveltejs/template");
			attr(a20, "rel", "nofollow");
			attr(pre1, "class", "language-null");
			attr(a21, "href", "https://www.npmjs.com/package/http-server");
			attr(a21, "rel", "nofollow");
			attr(pre2, "class", "language-svelte");
			attr(pre3, "class", "language-diff");
			attr(a22, "href", "/compile-svelte-in-your-head-part-1/");
			attr(pre4, "class", "language-svelte");
			attr(pre5, "class", "language-js");
			attr(pre6, "class", "language-js");
			attr(pre7, "class", "language-js");
			attr(source0, "type", "image/webp");
			attr(source0, "srcset", __build_img_webp__0);
			attr(source1, "type", "image/jpeg");
			attr(source1, "srcset", __build_img__0);
			attr(img, "alt", "Fixed");
			if (img.src !== (img_src_value = __build_img__0)) attr(img, "src", img_src_value);
			attr(a23, "href", "https://github.com/sveltejs/svelte/blob/e34f2088434423914bbc91b84a450a7f7477252b/src/runtime/internal/dom.ts#L221-L226");
			attr(a23, "rel", "nofollow");
			attr(pre8, "class", "language-js");
			attr(pre9, "class", "language-js");
			attr(pre10, "class", "language-js");
			attr(pre11, "class", "language-js");
			attr(a24, "href", "https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Template_literals#Tagged_templates");
			attr(a24, "rel", "nofollow");
			attr(a25, "href", "https://en.wikipedia.org/wiki/Abstract_syntax_tree");
			attr(a25, "rel", "nofollow");
			attr(a26, "href", "https://www.npmjs.com/package/code-red");
			attr(a26, "rel", "nofollow");
			attr(pre12, "class", "language-js");
			attr(a27, "href", "https://github.com/sveltejs/svelte/blob/e34f2088434423914bbc91b84a450a7f7477252b/src/compiler/compile/Component.ts#L245-L264");
			attr(a27, "rel", "nofollow");
			attr(pre13, "class", "language-js");
			attr(pre14, "class", "language-js");
			attr(pre15, "class", "language-js");
			attr(pre16, "class", "language-js");
			attr(pre17, "class", "language-md");
			attr(a28, "href", "https://github.com/sveltejs/svelte/blob/e34f2088434423914bbc91b84a450a7f7477252b/src/compiler/compile/render_dom/wrappers/Element/index.ts#L642-L659");
			attr(a28, "rel", "nofollow");
			attr(pre18, "class", "language-js");
			attr(pre19, "class", "language-js");
			attr(a29, "href", "/the-svelte-compiler-handbook/#dom-renderer");
			attr(a30, "href", "/compile-svelte-in-your-head-part-1/#create_fragment");
			attr(a31, "href", "/compile-svelte-in-your-head-part-1/#create_fragment");
			attr(pre20, "class", "language-js");
			attr(a32, "href", "#fixing-the-bug");
			attr(a32, "id", "fixing-the-bug");
			attr(pre21, "class", "language-svelte");
			attr(pre22, "class", "language-js");
			attr(pre23, "class", "language-js");
			attr(pre24, "class", "language-js");
			attr(pre25, "class", "language-js");
			attr(a33, "href", "/compile-svelte-in-your-head-part-2/#bitmask-in-svelte");
			attr(a34, "href", "https://github.com/sveltejs/svelte/blob/e34f2088434423914bbc91b84a450a7f7477252b/src/compiler/compile/render_dom/Renderer.ts#L206");
			attr(a34, "rel", "nofollow");
			attr(pre26, "class", "language-js");
			attr(pre27, "class", "language-js");
			attr(a35, "href", "#submitting-the-fix");
			attr(a35, "id", "submitting-the-fix");
			attr(a36, "href", "https://www.freecodecamp.org/news/how-to-make-your-first-pull-request-on-github-3/");
			attr(a36, "rel", "nofollow");
			attr(a37, "href", "https://github.com/sveltejs/svelte/pull/4894");
			attr(a37, "rel", "nofollow");
			attr(a38, "href", "https://twitter.com/lihautan");
			attr(a38, "rel", "nofollow");
			attr(a39, "href", "https://twitter.com/lihautan");
			attr(a39, "rel", "nofollow");
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
			append(section1, t10);
			append(section1, p1);
			append(p1, t11);
			append(section1, t12);
			append(section1, ul1);
			append(ul1, li6);
			append(li6, t13);
			append(li6, a7);
			append(a7, t14);
			append(ul1, t15);
			append(ul1, li7);
			append(li7, t16);
			append(ul1, t17);
			append(ul1, li8);
			append(li8, t18);
			append(section1, t19);
			append(section1, p2);
			append(p2, t20);
			append(p2, a8);
			append(a8, t21);
			append(p2, t22);
			append(section1, t23);
			append(section1, p3);
			append(p3, t24);
			append(section1, t25);
			append(section1, p4);
			append(p4, t26);
			append(section1, t27);
			append(section1, p5);
			append(p5, t28);
			append(section1, t29);
			append(section1, p6);
			append(p6, t30);
			insert(target, t31, anchor);
			insert(target, section2, anchor);
			append(section2, h21);
			append(h21, a9);
			append(a9, t32);
			append(section2, t33);
			append(section2, p7);
			append(p7, t34);
			append(p7, a10);
			append(a10, t35);
			append(p7, t36);
			append(section2, t37);
			append(section2, hr0);
			append(section2, t38);
			append(section2, p8);
			append(p8, strong0);
			append(strong0, t39);
			append(strong0, a11);
			append(a11, t40);
			append(section2, t41);
			append(section2, p9);
			append(p9, t42);
			append(p9, code0);
			append(code0, t43);
			append(p9, t44);
			append(section2, t45);
			append(section2, pre0);
			pre0.innerHTML = raw0_value;
			append(section2, t46);
			append(section2, p10);
			append(p10, t47);
			append(p10, a12);
			append(a12, t48);
			append(p10, t49);
			append(section2, t50);
			append(section2, hr1);
			insert(target, t51, anchor);
			insert(target, section3, anchor);
			append(section3, h22);
			append(h22, a13);
			append(a13, t52);
			append(section3, t53);
			append(section3, p11);
			append(p11, t54);
			append(section3, t55);
			append(section3, p12);
			append(p12, t56);
			append(p12, code1);
			append(code1, t57);
			append(p12, t58);
			append(p12, code2);
			append(code2, t59);
			append(p12, t60);
			append(p12, code3);
			append(code3, t61);
			append(p12, t62);
			append(p12, code4);
			append(code4, t63);
			append(p12, t64);
			append(p12, code5);
			append(code5, t65);
			append(p12, t66);
			append(section3, t67);
			append(section3, p13);
			append(p13, t68);
			append(p13, code6);
			append(code6, t69);
			append(p13, t70);
			append(p13, strong1);
			append(strong1, t71);
			append(p13, t72);
			append(p13, code7);
			append(code7, t73);
			append(p13, t74);
			append(section3, t75);
			append(section3, p14);
			append(p14, t76);
			append(p14, a14);
			append(a14, t77);
			append(p14, t78);
			append(p14, strong2);
			append(strong2, t79);
			append(p14, t80);
			append(p14, a15);
			append(a15, t81);
			append(p14, t82);
			append(p14, a16);
			append(a16, t83);
			append(p14, t84);
			append(section3, t85);
			append(section3, p15);
			append(p15, t86);
			append(p15, a17);
			append(a17, t87);
			append(p15, t88);
			append(p15, a18);
			append(a18, t89);
			append(p15, t90);
			insert(target, t91, anchor);
			insert(target, section4, anchor);
			append(section4, h23);
			append(h23, a19);
			append(a19, t92);
			append(section4, t93);
			append(section4, p16);
			append(p16, t94);
			append(section4, t95);
			append(section4, p17);
			append(p17, t96);
			append(p17, code8);
			append(code8, t97);
			append(p17, t98);
			append(p17, a20);
			append(a20, t99);
			append(p17, t100);
			append(p17, code9);
			append(code9, t101);
			append(p17, t102);
			append(p17, code10);
			append(code10, t103);
			append(p17, t104);
			append(p17, code11);
			append(code11, t105);
			append(p17, t106);
			append(section4, t107);
			append(section4, pre1);
			pre1.innerHTML = raw1_value;
			append(section4, t108);
			append(section4, p18);
			append(p18, t109);
			append(p18, code12);
			append(code12, t110);
			append(p18, t111);
			append(section4, t112);
			append(section4, p19);
			append(p19, t113);
			append(p19, strong3);
			append(strong3, t114);
			append(p19, t115);
			append(p19, code13);
			append(code13, t116);
			append(p19, t117);
			append(p19, a21);
			append(a21, t118);
			append(p19, t119);
			append(p19, code14);
			append(code14, t120);
			append(p19, t121);
			append(section4, t122);
			append(section4, ul2);
			append(ul2, li9);
			append(li9, t123);
			append(li9, code15);
			append(code15, t124);
			append(li9, t125);
			append(li9, code16);
			append(code16, t126);
			append(li9, t127);
			append(ul2, t128);
			append(ul2, li10);
			append(li10, t129);
			append(ul2, t130);
			append(ul2, li11);
			append(li11, t131);
			append(li11, code17);
			append(code17, t132);
			append(li11, t133);
			append(li11, code18);
			append(code18, t134);
			append(li11, t135);
			append(li11, code19);
			append(code19, t136);
			append(section4, t137);
			append(section4, p20);
			append(p20, t138);
			append(p20, code20);
			append(code20, t139);
			append(p20, t140);
			append(p20, code21);
			append(code21, t141);
			append(p20, t142);
			append(section4, t143);
			append(section4, pre2);
			pre2.innerHTML = raw2_value;
			append(section4, t144);
			append(section4, p21);
			append(p21, t145);
			append(section4, t146);
			append(section4, pre3);
			pre3.innerHTML = raw3_value;
			append(section4, t147);
			append(section4, p22);
			append(p22, t148);
			append(p22, a22);
			append(a22, t149);
			append(p22, t150);
			append(section4, t151);
			append(section4, p23);
			append(p23, t152);
			append(section4, t153);
			append(section4, pre4);
			pre4.innerHTML = raw4_value;
			append(section4, t154);
			append(section4, p24);
			append(p24, t155);
			append(section4, t156);
			append(section4, pre5);
			pre5.innerHTML = raw5_value;
			append(section4, t157);
			append(section4, p25);
			append(p25, t158);
			append(p25, code22);
			append(code22, t159);
			append(p25, t160);
			append(section4, t161);
			append(section4, p26);
			append(p26, t162);
			append(section4, t163);
			append(section4, pre6);
			pre6.innerHTML = raw6_value;
			append(section4, t164);
			append(section4, p27);
			append(p27, t165);
			append(p27, code23);
			append(code23, t166);
			append(p27, t167);
			append(p27, code24);
			append(code24, t168);
			append(p27, t169);
			append(section4, t170);
			append(section4, p28);
			append(p28, t171);
			append(p28, code25);
			append(code25, t172);
			append(p28, t173);
			append(section4, t174);
			append(section4, pre7);
			pre7.innerHTML = raw7_value;
			append(section4, t175);
			append(section4, p29);
			append(p29, t176);
			append(p29, code26);
			append(code26, t177);
			append(p29, t178);
			append(p29, code27);
			append(code27, t179);
			append(p29, t180);
			append(p29, code28);
			append(code28, t181);
			append(p29, t182);
			append(section4, t183);
			append(section4, p30);
			append(p30, t184);
			append(section4, t185);
			append(section4, p31);
			append(p31, picture);
			append(picture, source0);
			append(picture, source1);
			append(picture, img);
			append(section4, t186);
			append(section4, p32);
			append(p32, t187);
			append(p32, code29);
			append(code29, t188);
			append(p32, t189);
			append(section4, t190);
			append(section4, p33);
			append(p33, t191);
			append(section4, t192);
			append(section4, p34);
			append(p34, t193);
			append(p34, strong4);
			append(strong4, t194);
			append(p34, t195);
			append(section4, t196);
			append(section4, ul3);
			append(ul3, li12);
			append(li12, code30);
			append(code30, t197);
			append(ul3, t198);
			append(ul3, li13);
			append(li13, code31);
			append(code31, t199);
			append(ul3, t200);
			append(ul3, li14);
			append(li14, code32);
			append(code32, t201);
			append(section4, t202);
			append(section4, p35);
			append(p35, t203);
			append(p35, code33);
			append(code33, t204);
			append(p35, t205);
			append(p35, a23);
			append(a23, t206);
			append(section4, t207);
			append(section4, pre8);
			pre8.innerHTML = raw8_value;
			append(section4, t208);
			append(section4, p36);
			append(p36, t209);
			append(p36, code34);
			append(code34, t210);
			append(p36, t211);
			append(p36, code35);
			append(code35, t212);
			append(p36, t213);
			append(section4, t214);
			append(section4, pre9);
			pre9.innerHTML = raw9_value;
			append(section4, t215);
			append(section4, p37);
			append(p37, t216);
			append(p37, code36);
			append(code36, t217);
			append(p37, t218);
			append(p37, code37);
			append(code37, t219);
			append(section4, t220);
			append(section4, pre10);
			pre10.innerHTML = raw10_value;
			append(section4, t221);
			append(section4, p38);
			append(p38, t222);
			append(section4, t223);
			append(section4, p39);
			append(p39, t224);
			append(p39, code38);
			append(code38, t225);
			append(p39, t226);
			append(p39, code39);
			append(code39, t227);
			append(p39, t228);
			append(p39, code40);
			append(code40, t229);
			append(p39, t230);
			append(section4, t231);
			append(section4, pre11);
			pre11.innerHTML = raw11_value;
			append(section4, t232);
			append(section4, p40);
			append(p40, t233);
			append(p40, code41);
			append(code41, t234);
			append(p40, t235);
			append(p40, a24);
			append(a24, t236);
			append(p40, t237);
			append(p40, code42);
			append(code42, t238);
			append(p40, t239);
			append(p40, code43);
			append(code43, t240);
			append(p40, t241);
			append(p40, a25);
			append(a25, t242);
			append(p40, t243);
			append(section4, t244);
			append(section4, p41);
			append(p41, t245);
			append(p41, code44);
			append(code44, t246);
			append(p41, t247);
			append(p41, a26);
			append(a26, t248);
			append(p41, t249);
			append(p41, code45);
			append(code45, t250);
			append(p41, t251);
			append(p41, code46);
			append(code46, t252);
			append(p41, t253);
			append(section4, t254);
			append(section4, ul4);
			append(ul4, li15);
			append(li15, code47);
			append(code47, t255);
			append(li15, t256);
			append(ul4, t257);
			append(ul4, li16);
			append(li16, code48);
			append(code48, t258);
			append(li16, t259);
			append(ul4, t260);
			append(ul4, li17);
			append(li17, code49);
			append(code49, t261);
			append(li17, t262);
			append(section4, t263);
			append(section4, p42);
			append(p42, t264);
			append(section4, t265);
			append(section4, pre12);
			pre12.innerHTML = raw12_value;
			append(section4, t266);
			append(section4, p43);
			append(p43, code50);
			append(code50, t267);
			append(p43, t268);
			append(p43, code51);
			append(code51, t269);
			append(p43, t270);
			append(p43, a27);
			append(a27, t271);
			append(p43, t272);
			append(p43, code52);
			append(code52, t273);
			append(p43, t274);
			append(section4, t275);
			append(section4, pre13);
			pre13.innerHTML = raw13_value;
			append(section4, t276);
			append(section4, p44);
			append(p44, t277);
			append(section4, t278);
			append(section4, pre14);
			pre14.innerHTML = raw14_value;
			append(section4, t279);
			append(section4, p45);
			append(p45, t280);
			append(p45, code53);
			append(code53, t281);
			append(p45, t282);
			append(p45, code54);
			append(code54, t283);
			append(p45, t284);
			append(p45, code55);
			append(code55, t285);
			append(p45, t286);
			append(section4, t287);
			append(section4, pre15);
			pre15.innerHTML = raw15_value;
			append(section4, t288);
			append(section4, p46);
			append(p46, t289);
			append(p46, code56);
			append(code56, t290);
			append(p46, t291);
			append(section4, t292);
			append(section4, p47);
			append(p47, t293);
			append(p47, code57);
			append(code57, t294);
			append(p47, t295);
			append(section4, t296);
			append(section4, p48);
			append(p48, t297);
			append(p48, code58);
			append(code58, t298);
			append(p48, t299);
			append(p48, code59);
			append(code59, t300);
			append(p48, t301);
			append(section4, t302);
			append(section4, pre16);
			pre16.innerHTML = raw16_value;
			append(section4, t303);
			append(section4, pre17);
			pre17.innerHTML = raw17_value;
			append(section4, t304);
			append(section4, p49);
			append(p49, t305);
			append(p49, a28);
			append(a28, t306);
			append(section4, t307);
			append(section4, pre18);
			pre18.innerHTML = raw18_value;
			append(section4, t308);
			append(section4, p50);
			append(p50, t309);
			append(p50, code60);
			append(code60, t310);
			append(p50, t311);
			append(p50, code61);
			append(code61, t312);
			append(p50, t313);
			append(p50, code62);
			append(code62, t314);
			append(p50, t315);
			append(section4, t316);
			append(section4, p51);
			append(p51, t317);
			append(p51, code63);
			append(code63, t318);
			append(p51, t319);
			append(p51, code64);
			append(code64, t320);
			append(p51, t321);
			append(p51, code65);
			append(code65, t322);
			append(p51, t323);
			append(section4, t324);
			append(section4, p52);
			append(p52, t325);
			append(p52, code66);
			append(code66, t326);
			append(p52, t327);
			append(section4, t328);
			append(section4, pre19);
			pre19.innerHTML = raw19_value;
			append(section4, t329);
			append(section4, p53);
			append(p53, t330);
			append(p53, a29);
			append(a29, t331);
			append(p53, t332);
			append(p53, code67);
			append(code67, t333);
			append(p53, t334);
			append(p53, a30);
			append(a30, code68);
			append(code68, t335);
			append(p53, t336);
			append(p53, code69);
			append(code69, t337);
			append(p53, t338);
			append(p53, a31);
			append(a31, t339);
			append(p53, t340);
			append(p53, code70);
			append(code70, t341);
			append(p53, t342);
			append(p53, code71);
			append(code71, t343);
			append(p53, t344);
			append(p53, code72);
			append(code72, t345);
			append(p53, t346);
			append(p53, code73);
			append(code73, t347);
			append(p53, t348);
			append(section4, t349);
			append(section4, pre20);
			pre20.innerHTML = raw20_value;
			append(section4, t350);
			append(section4, p54);
			append(p54, t351);
			append(p54, code74);
			append(code74, t352);
			append(p54, t353);
			append(p54, code75);
			append(code75, t354);
			append(p54, t355);
			append(p54, code76);
			append(code76, t356);
			append(p54, t357);
			insert(target, t358, anchor);
			insert(target, section5, anchor);
			append(section5, h24);
			append(h24, a32);
			append(a32, t359);
			append(section5, t360);
			append(section5, p55);
			append(p55, t361);
			append(section5, t362);
			append(section5, p56);
			append(p56, t363);
			append(section5, t364);
			append(section5, p57);
			append(p57, t365);
			append(p57, code77);
			append(code77, t366);
			append(p57, t367);
			append(section5, t368);
			append(section5, ul5);
			append(ul5, li18);
			append(li18, t369);
			append(li18, code78);
			append(code78, t370);
			append(li18, t371);
			append(li18, code79);
			append(code79, t372);
			append(li18, t373);
			append(ul5, t374);
			append(ul5, li19);
			append(li19, t375);
			append(li19, code80);
			append(code80, t376);
			append(li19, t377);
			append(section5, t378);
			append(section5, p58);
			append(p58, t379);
			append(section5, t380);
			append(section5, p59);
			append(p59, t381);
			append(section5, t382);
			append(section5, pre21);
			pre21.innerHTML = raw21_value;
			append(section5, t383);
			append(section5, p60);
			append(p60, t384);
			append(p60, code81);
			append(code81, t385);
			append(p60, t386);
			append(p60, code82);
			append(code82, t387);
			append(p60, t388);
			append(p60, code83);
			append(code83, t389);
			append(p60, t390);
			append(section5, t391);
			append(section5, p61);
			append(p61, t392);
			append(p61, code84);
			append(code84, t393);
			append(p61, t394);
			append(p61, code85);
			append(code85, t395);
			append(p61, t396);
			append(p61, code86);
			append(code86, t397);
			append(p61, t398);
			append(p61, code87);
			append(code87, t399);
			append(p61, t400);
			append(p61, code88);
			append(code88, t401);
			append(p61, t402);
			append(p61, code89);
			append(code89, t403);
			append(p61, t404);
			append(p61, code90);
			append(code90, t405);
			append(p61, t406);
			append(section5, t407);
			append(section5, p62);
			append(p62, t408);
			append(section5, t409);
			append(section5, p63);
			append(p63, t410);
			append(section5, t411);
			append(section5, p64);
			append(p64, t412);
			append(p64, code91);
			append(code91, t413);
			append(p64, t414);
			append(p64, code92);
			append(code92, t415);
			append(p64, t416);
			append(p64, code93);
			append(code93, t417);
			append(p64, t418);
			append(section5, t419);
			append(section5, p65);
			append(p65, code94);
			append(code94, t420);
			append(p65, t421);
			append(section5, t422);
			append(section5, pre22);
			pre22.innerHTML = raw22_value;
			append(section5, t423);
			append(section5, p66);
			append(p66, t424);
			append(p66, code95);
			append(code95, t425);
			append(p66, t426);
			append(section5, t427);
			append(section5, pre23);
			pre23.innerHTML = raw23_value;
			append(section5, t428);
			append(section5, p67);
			append(p67, t429);
			append(p67, code96);
			append(code96, t430);
			append(p67, t431);
			append(section5, t432);
			append(section5, pre24);
			pre24.innerHTML = raw24_value;
			append(section5, t433);
			append(section5, p68);
			append(p68, strong5);
			append(strong5, t434);
			append(p68, t435);
			append(p68, code97);
			append(code97, t436);
			append(p68, t437);
			append(p68, code98);
			append(code98, t438);
			append(p68, t439);
			append(p68, code99);
			append(code99, t440);
			append(p68, t441);
			append(p68, code100);
			append(code100, t442);
			append(p68, t443);
			append(section5, t444);
			append(section5, p69);
			append(p69, t445);
			append(p69, code101);
			append(code101, t446);
			append(p69, t447);
			append(section5, t448);
			append(section5, p70);
			append(p70, t449);
			append(p70, code102);
			append(code102, t450);
			append(p70, t451);
			append(section5, t452);
			append(section5, pre25);
			pre25.innerHTML = raw25_value;
			append(section5, t453);
			append(section5, p71);
			append(p71, t454);
			append(p71, code103);
			append(code103, t455);
			append(p71, t456);
			append(section5, t457);
			append(section5, p72);
			append(p72, t458);
			append(p72, code104);
			append(code104, t459);
			append(p72, t460);
			append(p72, code105);
			append(code105, t461);
			append(p72, t462);
			append(p72, code106);
			append(code106, t463);
			append(p72, t464);
			append(p72, code107);
			append(code107, t465);
			append(p72, t466);
			append(p72, code108);
			append(code108, t467);
			append(p72, t468);
			append(section5, t469);
			append(section5, p73);
			append(p73, t470);
			append(p73, a33);
			append(a33, t471);
			append(p73, t472);
			append(section5, t473);
			append(section5, p74);
			append(p74, t474);
			append(section5, t475);
			append(section5, p75);
			append(p75, t476);
			append(p75, a34);
			append(a34, code109);
			append(code109, t477);
			append(p75, t478);
			append(section5, t479);
			append(section5, pre26);
			pre26.innerHTML = raw26_value;
			append(section5, t480);
			append(section5, p76);
			append(p76, t481);
			append(section5, t482);
			append(section5, pre27);
			pre27.innerHTML = raw27_value;
			append(section5, t483);
			append(section5, p77);
			append(p77, t484);
			insert(target, t485, anchor);
			insert(target, section6, anchor);
			append(section6, h25);
			append(h25, a35);
			append(a35, t486);
			append(section6, t487);
			append(section6, p78);
			append(p78, t488);
			append(p78, code110);
			append(code110, t489);
			append(p78, t490);
			append(p78, code111);
			append(code111, t491);
			append(p78, t492);
			append(section6, t493);
			append(section6, p79);
			append(p79, t494);
			append(p79, a36);
			append(a36, t495);
			append(p79, t496);
			append(section6, t497);
			append(section6, p80);
			append(p80, t498);
			append(p80, a37);
			append(a37, t499);
			append(p80, t500);
			append(section6, t501);
			append(section6, p81);
			append(p81, t502);
			append(section6, t503);
			append(section6, hr2);
			append(section6, t504);
			append(section6, p82);
			append(p82, t505);
			append(p82, a38);
			append(a38, t506);
			append(p82, t507);
			append(section6, t508);
			append(section6, p83);
			append(p83, t509);
			append(p83, a39);
			append(a39, t510);
			append(p83, t511);
		},
		p: noop,
		d(detaching) {
			if (detaching) detach(section0);
			if (detaching) detach(t6);
			if (detaching) detach(section1);
			if (detaching) detach(t31);
			if (detaching) detach(section2);
			if (detaching) detach(t51);
			if (detaching) detach(section3);
			if (detaching) detach(t91);
			if (detaching) detach(section4);
			if (detaching) detach(t358);
			if (detaching) detach(section5);
			if (detaching) detach(t485);
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
	"title": "Contributing to Svelte - Fixing issue #4392",
	"date": "2020-05-23T08:00:00Z",
	"tags": ["Svelte", "JavaScript", "Open Source"],
	"series": "Contributing to Svelte",
	"description": "I am going to tell you an anecdote on how I investigated and fixed a bug in Svelte. I documented down my train of thoughts as detailed as possible. I hope this gives anyone who is reading, a glimpse on how to work on the Svelte source code.",
	"slug": "contributing-to-svelte-fixing-issue-4392",
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
