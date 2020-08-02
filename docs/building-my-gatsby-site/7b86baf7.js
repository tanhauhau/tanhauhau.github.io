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

var __build_img_webp__1 = "b87ffbaba0d4b255.webp";

var __build_img__1 = "b87ffbaba0d4b255.png";

var __build_img_webp__0 = "c1a00b45e22106d4.webp";

var __build_img__0 = "c1a00b45e22106d4.png";

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
					"@id": "https%3A%2F%2Flihautan.com%2Fbuilding-my-gatsby-site",
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
			attr(meta11, "content", "https%3A%2F%2Flihautan.com%2Fbuilding-my-gatsby-site");
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
							"@id": "https%3A%2F%2Flihautan.com%2Fbuilding-my-gatsby-site",
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

/* content/blog/building-my-gatsby-site/@@page-markup.svelte generated by Svelte v3.24.0 */

function create_default_slot(ctx) {
	let section0;
	let ul;
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
	let p0;
	let t5;
	let a4;
	let t6;
	let t7;
	let a5;
	let t8;
	let t9;
	let a6;
	let t10;
	let t11;
	let em0;
	let t12;
	let t13;
	let p1;
	let t14;
	let a7;
	let t15;
	let t16;
	let t17;
	let p2;
	let t18;
	let strong;
	let t19;
	let t20;
	let t21;
	let section1;
	let h20;
	let a8;
	let t22;
	let t23;
	let p3;
	let t24;
	let a9;
	let t25;
	let t26;
	let t27;
	let section2;
	let h21;
	let a10;
	let t28;
	let t29;
	let p4;
	let t30;
	let a11;
	let t31;
	let t32;
	let t33;
	let p5;
	let picture0;
	let source0;
	let source1;
	let img0;
	let img0_src_value;
	let t34;
	let p6;
	let t35;
	let code0;
	let t36;
	let t37;
	let code1;
	let t38;
	let t39;
	let t40;
	let p7;
	let t41;
	let a12;
	let t42;
	let t43;
	let t44;
	let p8;
	let t45;
	let code2;
	let t46;
	let t47;
	let code3;
	let t48;
	let t49;
	let code4;
	let t50;
	let t51;
	let t52;
	let section3;
	let h22;
	let a13;
	let t53;
	let t54;
	let p9;
	let a14;
	let t55;
	let t56;
	let a15;
	let t57;
	let t58;
	let t59;
	let p10;
	let t60;
	let a16;
	let t61;
	let t62;
	let t63;
	let p11;
	let t64;
	let code5;
	let t65;
	let t66;
	let t67;
	let pre0;

	let raw0_value = `<code class="language-js"><span class="token comment">// filename: theme-mode.css</span>
div#___gatsby<span class="token punctuation">:</span><span class="token punctuation">:</span>after <span class="token punctuation">&#123;</span>
  content<span class="token punctuation">:</span> <span class="token string">''</span><span class="token punctuation">;</span>
  position<span class="token punctuation">:</span> fixed<span class="token punctuation">;</span>
  top<span class="token punctuation">:</span> <span class="token number">0</span><span class="token punctuation">;</span>
  bottom<span class="token punctuation">:</span> <span class="token number">0</span><span class="token punctuation">;</span>
  left<span class="token punctuation">:</span> <span class="token number">0</span><span class="token punctuation">;</span>
  right<span class="token punctuation">:</span> <span class="token number">0</span><span class="token punctuation">;</span>
  pointer<span class="token operator">-</span>events<span class="token punctuation">:</span> none<span class="token punctuation">;</span>
  background<span class="token punctuation">:</span> white<span class="token punctuation">;</span>
  mix<span class="token operator">-</span>blend<span class="token operator">-</span>mode<span class="token punctuation">:</span> difference<span class="token punctuation">;</span>
<span class="token punctuation">&#125;</span></code>` + "";

	let t68;
	let p12;
	let t69;
	let t70;
	let p13;
	let picture1;
	let source2;
	let source3;
	let img1;
	let img1_src_value;
	let t71;
	let p14;
	let t72;
	let code6;
	let t73;
	let t74;
	let code7;
	let t75;
	let t76;
	let a17;
	let t77;
	let t78;
	let code8;
	let t79;
	let t80;
	let code9;
	let t81;
	let t82;
	let t83;
	let p15;
	let t84;
	let t85;
	let p16;
	let a18;
	let t86;
	let t87;
	let a19;
	let t88;
	let t89;
	let t90;
	let pre1;

	let raw1_value = `<code class="language-js"><span class="token comment">// filename: remark-emoji.js</span>
<span class="token keyword">const</span> visit <span class="token operator">=</span> <span class="token function">require</span><span class="token punctuation">(</span><span class="token string">'unist-util-visit'</span><span class="token punctuation">)</span><span class="token punctuation">;</span>
<span class="token keyword">const</span> emojiRegex <span class="token operator">=</span> <span class="token function">require</span><span class="token punctuation">(</span><span class="token string">'emoji-regex'</span><span class="token punctuation">)</span><span class="token punctuation">;</span>

module<span class="token punctuation">.</span><span class="token method-variable function-variable method function property-access">exports</span> <span class="token operator">=</span> <span class="token keyword">function</span><span class="token punctuation">(</span><span class="token parameter"><span class="token punctuation">&#123;</span> markdownAST <span class="token punctuation">&#125;</span></span><span class="token punctuation">)</span> <span class="token punctuation">&#123;</span>
  <span class="token function">visit</span><span class="token punctuation">(</span>markdownAST<span class="token punctuation">,</span> <span class="token string">'text'</span><span class="token punctuation">,</span> <span class="token parameter">node</span> <span class="token arrow operator">=></span> <span class="token punctuation">&#123;</span>
    node<span class="token punctuation">.</span><span class="token property-access">type</span> <span class="token operator">=</span> <span class="token string">'html'</span><span class="token punctuation">;</span>
    node<span class="token punctuation">.</span><span class="token property-access">value</span> <span class="token operator">=</span> node<span class="token punctuation">.</span><span class="token property-access">value</span><span class="token punctuation">.</span><span class="token method function property-access">replace</span><span class="token punctuation">(</span>
      <span class="token function">emojiRegex</span><span class="token punctuation">(</span><span class="token punctuation">)</span><span class="token punctuation">,</span>
      <span class="token parameter">val</span> <span class="token arrow operator">=></span> <span class="token template-string"><span class="token template-punctuation string">&#96;</span><span class="token string">&lt;span class="emoji"></span><span class="token interpolation"><span class="token interpolation-punctuation punctuation">$&#123;</span>val<span class="token interpolation-punctuation punctuation">&#125;</span></span><span class="token string">&lt;/span></span><span class="token template-punctuation string">&#96;</span></span>
    <span class="token punctuation">)</span><span class="token punctuation">;</span>
  <span class="token punctuation">&#125;</span><span class="token punctuation">)</span><span class="token punctuation">;</span>
<span class="token punctuation">&#125;</span><span class="token punctuation">;</span></code>` + "";

	let t91;
	let p17;
	let em1;
	let t92;
	let span;
	let t93;
	let p18;
	let t94;
	let t95;
	let p19;
	let t96;
	let t97;
	let p20;
	let t98;
	let code10;
	let t99;
	let t100;
	let t101;
	let section4;
	let h23;
	let a20;
	let t102;
	let t103;
	let p21;
	let t104;
	let a21;
	let t105;
	let t106;
	let a22;
	let t107;
	let t108;
	let a23;
	let t109;
	let t110;
	let a24;
	let t111;
	let t112;
	let p22;
	let t113;
	let code11;
	let t114;
	let t115;

	return {
		c() {
			section0 = element("section");
			ul = element("ul");
			li0 = element("li");
			a0 = element("a");
			t0 = text("The boilerplate");
			li1 = element("li");
			a1 = element("a");
			t1 = text("The deployment");
			li2 = element("li");
			a2 = element("a");
			t2 = text("The light & dark mode");
			li3 = element("li");
			a3 = element("a");
			t3 = text("The Restructure");
			t4 = space();
			p0 = element("p");
			t5 = text("After reading Dan's ");
			a4 = element("a");
			t6 = text("Overreacted");
			t7 = text(" & Wei's ");
			a5 = element("a");
			t8 = text("A Work in Progress");
			t9 = text(" a while ago, I decided to have my ");
			a6 = element("a");
			t10 = text("own blog");
			t11 = text(" as well! ");
			em0 = element("em");
			t12 = text("(In case you still don't know, it's the very one you are reading right now!)");
			t13 = space();
			p1 = element("p");
			t14 = text("I took it as an opportunity to learn ");
			a7 = element("a");
			t15 = text("Gatsby");
			t16 = text(", I've heard about it for a while, so I guess it's to know how it works.");
			t17 = space();
			p2 = element("p");
			t18 = text("This article is ");
			strong = element("strong");
			t19 = text("NOT about how to build a Gatsby site");
			t20 = text(", there a lot resources about that you can go for. But I am here to share some of my customisations that I've added to my Gatsby site, and hopefully you would share yours too.");
			t21 = space();
			section1 = element("section");
			h20 = element("h2");
			a8 = element("a");
			t22 = text("The boilerplate");
			t23 = space();
			p3 = element("p");
			t24 = text("I used the exact same Gatsby starter pack as Dan's ");
			a9 = element("a");
			t25 = text("Overreacted");
			t26 = text(", because why not ¯_(ツ)_/¯. It looks sleek and simple and I like it.");
			t27 = space();
			section2 = element("section");
			h21 = element("h2");
			a10 = element("a");
			t28 = text("The deployment");
			t29 = space();
			p4 = element("p");
			t30 = text("I use ");
			a11 = element("a");
			t31 = text("Github Pages");
			t32 = text(" to host this blog.");
			t33 = space();
			p5 = element("p");
			picture0 = element("picture");
			source0 = element("source");
			source1 = element("source");
			img0 = element("img");
			t34 = space();
			p6 = element("p");
			t35 = text("According to the settings, I am required to use ");
			code0 = element("code");
			t36 = text("master");
			t37 = text(" branch to serve the content, that's why I am writing and developing in ");
			code1 = element("code");
			t38 = text("dev");
			t39 = text(" branch instead.");
			t40 = space();
			p7 = element("p");
			t41 = text("To deploy, I added a ");
			a12 = element("a");
			t42 = text("publish.js");
			t43 = text(" script. The script will clone the repo in a temporary folder, copy all the built files into the folder, make a commit and push it to the master branch.");
			t44 = space();
			p8 = element("p");
			t45 = text("Lastly, I added the script to the ");
			code2 = element("code");
			t46 = text("pre-push");
			t47 = text(" git hook, so that every time when I am pushing changes to the ");
			code3 = element("code");
			t48 = text("dev");
			t49 = text(" branch, it will also build and \"deploy\" changes to the ");
			code4 = element("code");
			t50 = text("master");
			t51 = text(" branch.");
			t52 = space();
			section3 = element("section");
			h22 = element("h2");
			a13 = element("a");
			t53 = text("The light & dark mode");
			t54 = space();
			p9 = element("p");
			a14 = element("a");
			t55 = text("Wei");
			t56 = text(" did a sharing on how mix blend mode works and how she ");
			a15 = element("a");
			t57 = text("added night mode using mix-blend-mode");
			t58 = text(" on her site.");
			t59 = space();
			p10 = element("p");
			t60 = text("So I decided to add my own ");
			a16 = element("a");
			t61 = text("Dark Mode Switch");
			t62 = text(" as well.");
			t63 = space();
			p11 = element("p");
			t64 = text("The Dark Mode Switch was relatively easy. I added a pseudo-element ");
			code5 = element("code");
			t65 = text("div#___gatsby::after");
			t66 = text(" to cover over my entire Gatsby blog, so I don't have to create another div element.");
			t67 = space();
			pre0 = element("pre");
			t68 = space();
			p12 = element("p");
			t69 = text("It's easy and it looks great, except, all my images and emojis are inverted. 😢");
			t70 = space();
			p13 = element("p");
			picture1 = element("picture");
			source2 = element("source");
			source3 = element("source");
			img1 = element("img");
			t71 = space();
			p14 = element("p");
			t72 = text("I need to wrap all my emojis around a ");
			code6 = element("code");
			t73 = text("<span>");
			t74 = text(" so I can apply some css like ");
			code7 = element("code");
			t75 = text("isolation: isolate");
			t76 = text(" to exclude them from being blended. ");
			a17 = element("a");
			t77 = text("Inspiration credits to huijing 👏👏");
			t78 = text(". But I am lazy to wrap all my emojis with ");
			code8 = element("code");
			t79 = text("<span>");
			t80 = text(", I want to use them anytime I want, without bothering much of the ");
			code9 = element("code");
			t81 = text("<span>");
			t82 = text(", so I decided to write a gatsby remark plugin to do that for me. 😎");
			t83 = space();
			p15 = element("p");
			t84 = text("Well, it turns out it's not that hard.");
			t85 = space();
			p16 = element("p");
			a18 = element("a");
			t86 = text("Remark");
			t87 = text(" provides a friendly api to tap into the AST and ");
			a19 = element("a");
			t88 = text("does transformation");
			t89 = text(".");
			t90 = space();
			pre1 = element("pre");
			t91 = space();
			p17 = element("p");
			em1 = element("em");
			t92 = text("using emoji-regex find emojis and wrap them with a ");
			span = element("span");
			t93 = space();
			p18 = element("p");
			t94 = text("...and it works!");
			t95 = space();
			p19 = element("p");
			t96 = text("Although somewhere when I started writing the gatsby plugin, a weird error popped up, and after some digging, I noticed that");
			t97 = space();
			p20 = element("p");
			t98 = text("I had to include ");
			code10 = element("code");
			t99 = text("package.json");
			t100 = text(" into the plugin folder, or else it will yell at me.");
			t101 = space();
			section4 = element("section");
			h23 = element("h2");
			a20 = element("a");
			t102 = text("The Restructure");
			t103 = space();
			p21 = element("p");
			t104 = text("A while ago, I decided to add more categories to my blog, ie, ");
			a21 = element("a");
			t105 = text("my blogs");
			t106 = text(", ");
			a22 = element("a");
			t107 = text("my talks");
			t108 = text(" and ");
			a23 = element("a");
			t109 = text("my notes");
			t110 = text(". So I created different folders for them and ");
			a24 = element("a");
			t111 = text("rewrote the GraphQL query");
			t112 = space();
			p22 = element("p");
			t113 = text("The Graphql Editor in ");
			code11 = element("code");
			t114 = text("http://localhost:8000/___graphql");
			t115 = text(" is really helpful for me to understand how Gatsby and Gatsby plugins are creating all the objects.");
			this.h();
		},
		l(nodes) {
			section0 = claim_element(nodes, "SECTION", {});
			var section0_nodes = children(section0);

			ul = claim_element(section0_nodes, "UL", {
				class: true,
				id: true,
				role: true,
				"aria-label": true
			});

			var ul_nodes = children(ul);
			li0 = claim_element(ul_nodes, "LI", {});
			var li0_nodes = children(li0);
			a0 = claim_element(li0_nodes, "A", { href: true });
			var a0_nodes = children(a0);
			t0 = claim_text(a0_nodes, "The boilerplate");
			a0_nodes.forEach(detach);
			li0_nodes.forEach(detach);
			li1 = claim_element(ul_nodes, "LI", {});
			var li1_nodes = children(li1);
			a1 = claim_element(li1_nodes, "A", { href: true });
			var a1_nodes = children(a1);
			t1 = claim_text(a1_nodes, "The deployment");
			a1_nodes.forEach(detach);
			li1_nodes.forEach(detach);
			li2 = claim_element(ul_nodes, "LI", {});
			var li2_nodes = children(li2);
			a2 = claim_element(li2_nodes, "A", { href: true });
			var a2_nodes = children(a2);
			t2 = claim_text(a2_nodes, "The light & dark mode");
			a2_nodes.forEach(detach);
			li2_nodes.forEach(detach);
			li3 = claim_element(ul_nodes, "LI", {});
			var li3_nodes = children(li3);
			a3 = claim_element(li3_nodes, "A", { href: true });
			var a3_nodes = children(a3);
			t3 = claim_text(a3_nodes, "The Restructure");
			a3_nodes.forEach(detach);
			li3_nodes.forEach(detach);
			ul_nodes.forEach(detach);
			section0_nodes.forEach(detach);
			t4 = claim_space(nodes);
			p0 = claim_element(nodes, "P", {});
			var p0_nodes = children(p0);
			t5 = claim_text(p0_nodes, "After reading Dan's ");
			a4 = claim_element(p0_nodes, "A", { href: true, rel: true });
			var a4_nodes = children(a4);
			t6 = claim_text(a4_nodes, "Overreacted");
			a4_nodes.forEach(detach);
			t7 = claim_text(p0_nodes, " & Wei's ");
			a5 = claim_element(p0_nodes, "A", { href: true, rel: true });
			var a5_nodes = children(a5);
			t8 = claim_text(a5_nodes, "A Work in Progress");
			a5_nodes.forEach(detach);
			t9 = claim_text(p0_nodes, " a while ago, I decided to have my ");
			a6 = claim_element(p0_nodes, "A", { href: true, rel: true });
			var a6_nodes = children(a6);
			t10 = claim_text(a6_nodes, "own blog");
			a6_nodes.forEach(detach);
			t11 = claim_text(p0_nodes, " as well! ");
			em0 = claim_element(p0_nodes, "EM", {});
			var em0_nodes = children(em0);
			t12 = claim_text(em0_nodes, "(In case you still don't know, it's the very one you are reading right now!)");
			em0_nodes.forEach(detach);
			p0_nodes.forEach(detach);
			t13 = claim_space(nodes);
			p1 = claim_element(nodes, "P", {});
			var p1_nodes = children(p1);
			t14 = claim_text(p1_nodes, "I took it as an opportunity to learn ");
			a7 = claim_element(p1_nodes, "A", { href: true, rel: true });
			var a7_nodes = children(a7);
			t15 = claim_text(a7_nodes, "Gatsby");
			a7_nodes.forEach(detach);
			t16 = claim_text(p1_nodes, ", I've heard about it for a while, so I guess it's to know how it works.");
			p1_nodes.forEach(detach);
			t17 = claim_space(nodes);
			p2 = claim_element(nodes, "P", {});
			var p2_nodes = children(p2);
			t18 = claim_text(p2_nodes, "This article is ");
			strong = claim_element(p2_nodes, "STRONG", {});
			var strong_nodes = children(strong);
			t19 = claim_text(strong_nodes, "NOT about how to build a Gatsby site");
			strong_nodes.forEach(detach);
			t20 = claim_text(p2_nodes, ", there a lot resources about that you can go for. But I am here to share some of my customisations that I've added to my Gatsby site, and hopefully you would share yours too.");
			p2_nodes.forEach(detach);
			t21 = claim_space(nodes);
			section1 = claim_element(nodes, "SECTION", {});
			var section1_nodes = children(section1);
			h20 = claim_element(section1_nodes, "H2", {});
			var h20_nodes = children(h20);
			a8 = claim_element(h20_nodes, "A", { href: true, id: true });
			var a8_nodes = children(a8);
			t22 = claim_text(a8_nodes, "The boilerplate");
			a8_nodes.forEach(detach);
			h20_nodes.forEach(detach);
			t23 = claim_space(section1_nodes);
			p3 = claim_element(section1_nodes, "P", {});
			var p3_nodes = children(p3);
			t24 = claim_text(p3_nodes, "I used the exact same Gatsby starter pack as Dan's ");
			a9 = claim_element(p3_nodes, "A", { href: true, rel: true });
			var a9_nodes = children(a9);
			t25 = claim_text(a9_nodes, "Overreacted");
			a9_nodes.forEach(detach);
			t26 = claim_text(p3_nodes, ", because why not ¯_(ツ)_/¯. It looks sleek and simple and I like it.");
			p3_nodes.forEach(detach);
			section1_nodes.forEach(detach);
			t27 = claim_space(nodes);
			section2 = claim_element(nodes, "SECTION", {});
			var section2_nodes = children(section2);
			h21 = claim_element(section2_nodes, "H2", {});
			var h21_nodes = children(h21);
			a10 = claim_element(h21_nodes, "A", { href: true, id: true });
			var a10_nodes = children(a10);
			t28 = claim_text(a10_nodes, "The deployment");
			a10_nodes.forEach(detach);
			h21_nodes.forEach(detach);
			t29 = claim_space(section2_nodes);
			p4 = claim_element(section2_nodes, "P", {});
			var p4_nodes = children(p4);
			t30 = claim_text(p4_nodes, "I use ");
			a11 = claim_element(p4_nodes, "A", { href: true, rel: true });
			var a11_nodes = children(a11);
			t31 = claim_text(a11_nodes, "Github Pages");
			a11_nodes.forEach(detach);
			t32 = claim_text(p4_nodes, " to host this blog.");
			p4_nodes.forEach(detach);
			t33 = claim_space(section2_nodes);
			p5 = claim_element(section2_nodes, "P", {});
			var p5_nodes = children(p5);
			picture0 = claim_element(p5_nodes, "PICTURE", {});
			var picture0_nodes = children(picture0);
			source0 = claim_element(picture0_nodes, "SOURCE", { type: true, srcset: true });
			source1 = claim_element(picture0_nodes, "SOURCE", { type: true, srcset: true });
			img0 = claim_element(picture0_nodes, "IMG", { alt: true, src: true });
			picture0_nodes.forEach(detach);
			p5_nodes.forEach(detach);
			t34 = claim_space(section2_nodes);
			p6 = claim_element(section2_nodes, "P", {});
			var p6_nodes = children(p6);
			t35 = claim_text(p6_nodes, "According to the settings, I am required to use ");
			code0 = claim_element(p6_nodes, "CODE", {});
			var code0_nodes = children(code0);
			t36 = claim_text(code0_nodes, "master");
			code0_nodes.forEach(detach);
			t37 = claim_text(p6_nodes, " branch to serve the content, that's why I am writing and developing in ");
			code1 = claim_element(p6_nodes, "CODE", {});
			var code1_nodes = children(code1);
			t38 = claim_text(code1_nodes, "dev");
			code1_nodes.forEach(detach);
			t39 = claim_text(p6_nodes, " branch instead.");
			p6_nodes.forEach(detach);
			t40 = claim_space(section2_nodes);
			p7 = claim_element(section2_nodes, "P", {});
			var p7_nodes = children(p7);
			t41 = claim_text(p7_nodes, "To deploy, I added a ");
			a12 = claim_element(p7_nodes, "A", { href: true, rel: true });
			var a12_nodes = children(a12);
			t42 = claim_text(a12_nodes, "publish.js");
			a12_nodes.forEach(detach);
			t43 = claim_text(p7_nodes, " script. The script will clone the repo in a temporary folder, copy all the built files into the folder, make a commit and push it to the master branch.");
			p7_nodes.forEach(detach);
			t44 = claim_space(section2_nodes);
			p8 = claim_element(section2_nodes, "P", {});
			var p8_nodes = children(p8);
			t45 = claim_text(p8_nodes, "Lastly, I added the script to the ");
			code2 = claim_element(p8_nodes, "CODE", {});
			var code2_nodes = children(code2);
			t46 = claim_text(code2_nodes, "pre-push");
			code2_nodes.forEach(detach);
			t47 = claim_text(p8_nodes, " git hook, so that every time when I am pushing changes to the ");
			code3 = claim_element(p8_nodes, "CODE", {});
			var code3_nodes = children(code3);
			t48 = claim_text(code3_nodes, "dev");
			code3_nodes.forEach(detach);
			t49 = claim_text(p8_nodes, " branch, it will also build and \"deploy\" changes to the ");
			code4 = claim_element(p8_nodes, "CODE", {});
			var code4_nodes = children(code4);
			t50 = claim_text(code4_nodes, "master");
			code4_nodes.forEach(detach);
			t51 = claim_text(p8_nodes, " branch.");
			p8_nodes.forEach(detach);
			section2_nodes.forEach(detach);
			t52 = claim_space(nodes);
			section3 = claim_element(nodes, "SECTION", {});
			var section3_nodes = children(section3);
			h22 = claim_element(section3_nodes, "H2", {});
			var h22_nodes = children(h22);
			a13 = claim_element(h22_nodes, "A", { href: true, id: true });
			var a13_nodes = children(a13);
			t53 = claim_text(a13_nodes, "The light & dark mode");
			a13_nodes.forEach(detach);
			h22_nodes.forEach(detach);
			t54 = claim_space(section3_nodes);
			p9 = claim_element(section3_nodes, "P", {});
			var p9_nodes = children(p9);
			a14 = claim_element(p9_nodes, "A", { href: true, rel: true });
			var a14_nodes = children(a14);
			t55 = claim_text(a14_nodes, "Wei");
			a14_nodes.forEach(detach);
			t56 = claim_text(p9_nodes, " did a sharing on how mix blend mode works and how she ");
			a15 = claim_element(p9_nodes, "A", { href: true, rel: true });
			var a15_nodes = children(a15);
			t57 = claim_text(a15_nodes, "added night mode using mix-blend-mode");
			a15_nodes.forEach(detach);
			t58 = claim_text(p9_nodes, " on her site.");
			p9_nodes.forEach(detach);
			t59 = claim_space(section3_nodes);
			p10 = claim_element(section3_nodes, "P", {});
			var p10_nodes = children(p10);
			t60 = claim_text(p10_nodes, "So I decided to add my own ");
			a16 = claim_element(p10_nodes, "A", { href: true, rel: true });
			var a16_nodes = children(a16);
			t61 = claim_text(a16_nodes, "Dark Mode Switch");
			a16_nodes.forEach(detach);
			t62 = claim_text(p10_nodes, " as well.");
			p10_nodes.forEach(detach);
			t63 = claim_space(section3_nodes);
			p11 = claim_element(section3_nodes, "P", {});
			var p11_nodes = children(p11);
			t64 = claim_text(p11_nodes, "The Dark Mode Switch was relatively easy. I added a pseudo-element ");
			code5 = claim_element(p11_nodes, "CODE", {});
			var code5_nodes = children(code5);
			t65 = claim_text(code5_nodes, "div#___gatsby::after");
			code5_nodes.forEach(detach);
			t66 = claim_text(p11_nodes, " to cover over my entire Gatsby blog, so I don't have to create another div element.");
			p11_nodes.forEach(detach);
			t67 = claim_space(section3_nodes);
			pre0 = claim_element(section3_nodes, "PRE", { class: true });
			var pre0_nodes = children(pre0);
			pre0_nodes.forEach(detach);
			t68 = claim_space(section3_nodes);
			p12 = claim_element(section3_nodes, "P", {});
			var p12_nodes = children(p12);
			t69 = claim_text(p12_nodes, "It's easy and it looks great, except, all my images and emojis are inverted. 😢");
			p12_nodes.forEach(detach);
			t70 = claim_space(section3_nodes);
			p13 = claim_element(section3_nodes, "P", {});
			var p13_nodes = children(p13);
			picture1 = claim_element(p13_nodes, "PICTURE", {});
			var picture1_nodes = children(picture1);
			source2 = claim_element(picture1_nodes, "SOURCE", { type: true, srcset: true });
			source3 = claim_element(picture1_nodes, "SOURCE", { type: true, srcset: true });
			img1 = claim_element(picture1_nodes, "IMG", { alt: true, src: true });
			picture1_nodes.forEach(detach);
			p13_nodes.forEach(detach);
			t71 = claim_space(section3_nodes);
			p14 = claim_element(section3_nodes, "P", {});
			var p14_nodes = children(p14);
			t72 = claim_text(p14_nodes, "I need to wrap all my emojis around a ");
			code6 = claim_element(p14_nodes, "CODE", {});
			var code6_nodes = children(code6);
			t73 = claim_text(code6_nodes, "<span>");
			code6_nodes.forEach(detach);
			t74 = claim_text(p14_nodes, " so I can apply some css like ");
			code7 = claim_element(p14_nodes, "CODE", {});
			var code7_nodes = children(code7);
			t75 = claim_text(code7_nodes, "isolation: isolate");
			code7_nodes.forEach(detach);
			t76 = claim_text(p14_nodes, " to exclude them from being blended. ");
			a17 = claim_element(p14_nodes, "A", { href: true, rel: true });
			var a17_nodes = children(a17);
			t77 = claim_text(a17_nodes, "Inspiration credits to huijing 👏👏");
			a17_nodes.forEach(detach);
			t78 = claim_text(p14_nodes, ". But I am lazy to wrap all my emojis with ");
			code8 = claim_element(p14_nodes, "CODE", {});
			var code8_nodes = children(code8);
			t79 = claim_text(code8_nodes, "<span>");
			code8_nodes.forEach(detach);
			t80 = claim_text(p14_nodes, ", I want to use them anytime I want, without bothering much of the ");
			code9 = claim_element(p14_nodes, "CODE", {});
			var code9_nodes = children(code9);
			t81 = claim_text(code9_nodes, "<span>");
			code9_nodes.forEach(detach);
			t82 = claim_text(p14_nodes, ", so I decided to write a gatsby remark plugin to do that for me. 😎");
			p14_nodes.forEach(detach);
			t83 = claim_space(section3_nodes);
			p15 = claim_element(section3_nodes, "P", {});
			var p15_nodes = children(p15);
			t84 = claim_text(p15_nodes, "Well, it turns out it's not that hard.");
			p15_nodes.forEach(detach);
			t85 = claim_space(section3_nodes);
			p16 = claim_element(section3_nodes, "P", {});
			var p16_nodes = children(p16);
			a18 = claim_element(p16_nodes, "A", { href: true, rel: true });
			var a18_nodes = children(a18);
			t86 = claim_text(a18_nodes, "Remark");
			a18_nodes.forEach(detach);
			t87 = claim_text(p16_nodes, " provides a friendly api to tap into the AST and ");
			a19 = claim_element(p16_nodes, "A", { href: true, rel: true });
			var a19_nodes = children(a19);
			t88 = claim_text(a19_nodes, "does transformation");
			a19_nodes.forEach(detach);
			t89 = claim_text(p16_nodes, ".");
			p16_nodes.forEach(detach);
			t90 = claim_space(section3_nodes);
			pre1 = claim_element(section3_nodes, "PRE", { class: true });
			var pre1_nodes = children(pre1);
			pre1_nodes.forEach(detach);
			t91 = claim_space(section3_nodes);
			p17 = claim_element(section3_nodes, "P", {});
			var p17_nodes = children(p17);
			em1 = claim_element(p17_nodes, "EM", {});
			var em1_nodes = children(em1);
			t92 = claim_text(em1_nodes, "using emoji-regex find emojis and wrap them with a ");
			span = claim_element(em1_nodes, "SPAN", {});
			children(span).forEach(detach);
			em1_nodes.forEach(detach);
			p17_nodes.forEach(detach);
			t93 = claim_space(section3_nodes);
			p18 = claim_element(section3_nodes, "P", {});
			var p18_nodes = children(p18);
			t94 = claim_text(p18_nodes, "...and it works!");
			p18_nodes.forEach(detach);
			t95 = claim_space(section3_nodes);
			p19 = claim_element(section3_nodes, "P", {});
			var p19_nodes = children(p19);
			t96 = claim_text(p19_nodes, "Although somewhere when I started writing the gatsby plugin, a weird error popped up, and after some digging, I noticed that");
			p19_nodes.forEach(detach);
			t97 = claim_space(section3_nodes);
			p20 = claim_element(section3_nodes, "P", {});
			var p20_nodes = children(p20);
			t98 = claim_text(p20_nodes, "I had to include ");
			code10 = claim_element(p20_nodes, "CODE", {});
			var code10_nodes = children(code10);
			t99 = claim_text(code10_nodes, "package.json");
			code10_nodes.forEach(detach);
			t100 = claim_text(p20_nodes, " into the plugin folder, or else it will yell at me.");
			p20_nodes.forEach(detach);
			section3_nodes.forEach(detach);
			t101 = claim_space(nodes);
			section4 = claim_element(nodes, "SECTION", {});
			var section4_nodes = children(section4);
			h23 = claim_element(section4_nodes, "H2", {});
			var h23_nodes = children(h23);
			a20 = claim_element(h23_nodes, "A", { href: true, id: true });
			var a20_nodes = children(a20);
			t102 = claim_text(a20_nodes, "The Restructure");
			a20_nodes.forEach(detach);
			h23_nodes.forEach(detach);
			t103 = claim_space(section4_nodes);
			p21 = claim_element(section4_nodes, "P", {});
			var p21_nodes = children(p21);
			t104 = claim_text(p21_nodes, "A while ago, I decided to add more categories to my blog, ie, ");
			a21 = claim_element(p21_nodes, "A", { href: true, rel: true });
			var a21_nodes = children(a21);
			t105 = claim_text(a21_nodes, "my blogs");
			a21_nodes.forEach(detach);
			t106 = claim_text(p21_nodes, ", ");
			a22 = claim_element(p21_nodes, "A", { href: true, rel: true });
			var a22_nodes = children(a22);
			t107 = claim_text(a22_nodes, "my talks");
			a22_nodes.forEach(detach);
			t108 = claim_text(p21_nodes, " and ");
			a23 = claim_element(p21_nodes, "A", { href: true, rel: true });
			var a23_nodes = children(a23);
			t109 = claim_text(a23_nodes, "my notes");
			a23_nodes.forEach(detach);
			t110 = claim_text(p21_nodes, ". So I created different folders for them and ");
			a24 = claim_element(p21_nodes, "A", { href: true, rel: true });
			var a24_nodes = children(a24);
			t111 = claim_text(a24_nodes, "rewrote the GraphQL query");
			a24_nodes.forEach(detach);
			p21_nodes.forEach(detach);
			t112 = claim_space(section4_nodes);
			p22 = claim_element(section4_nodes, "P", {});
			var p22_nodes = children(p22);
			t113 = claim_text(p22_nodes, "The Graphql Editor in ");
			code11 = claim_element(p22_nodes, "CODE", {});
			var code11_nodes = children(code11);
			t114 = claim_text(code11_nodes, "http://localhost:8000/___graphql");
			code11_nodes.forEach(detach);
			t115 = claim_text(p22_nodes, " is really helpful for me to understand how Gatsby and Gatsby plugins are creating all the objects.");
			p22_nodes.forEach(detach);
			section4_nodes.forEach(detach);
			this.h();
		},
		h() {
			attr(a0, "href", "#the-boilerplate");
			attr(a1, "href", "#the-deployment");
			attr(a2, "href", "#the-light-dark-mode");
			attr(a3, "href", "#the-restructure");
			attr(ul, "class", "sitemap");
			attr(ul, "id", "sitemap");
			attr(ul, "role", "navigation");
			attr(ul, "aria-label", "Table of Contents");
			attr(a4, "href", "https://overreacted.io");
			attr(a4, "rel", "nofollow");
			attr(a5, "href", "https://dev.wgao19.cc/");
			attr(a5, "rel", "nofollow");
			attr(a6, "href", "https://lihautan.com/blogs/");
			attr(a6, "rel", "nofollow");
			attr(a7, "href", "https://www.gatsbyjs.org/");
			attr(a7, "rel", "nofollow");
			attr(a8, "href", "#the-boilerplate");
			attr(a8, "id", "the-boilerplate");
			attr(a9, "href", "https://overreacted.io");
			attr(a9, "rel", "nofollow");
			attr(a10, "href", "#the-deployment");
			attr(a10, "id", "the-deployment");
			attr(a11, "href", "https://pages.github.com/");
			attr(a11, "rel", "nofollow");
			attr(source0, "type", "image/webp");
			attr(source0, "srcset", __build_img_webp__0);
			attr(source1, "type", "image/jpeg");
			attr(source1, "srcset", __build_img__0);
			attr(img0, "alt", "github pages settings");
			if (img0.src !== (img0_src_value = __build_img__0)) attr(img0, "src", img0_src_value);
			attr(a12, "href", "https://github.com/tanhauhau/tanhauhau.github.io/blob/dev/scripts/publish.js");
			attr(a12, "rel", "nofollow");
			attr(a13, "href", "#the-light-dark-mode");
			attr(a13, "id", "the-light-dark-mode");
			attr(a14, "href", "https://twitter.com/wgao19");
			attr(a14, "rel", "nofollow");
			attr(a15, "href", "https://dev.wgao19.cc/2019-05-04__sun-moon-blending-mode/");
			attr(a15, "rel", "nofollow");
			attr(a16, "href", "https://github.com/tanhauhau/tanhauhau.github.io/commit/291663d10cc7838d67392acb6a28a04a655603a6#diff-4e34e842430a5e2977417f28e477e14d");
			attr(a16, "rel", "nofollow");
			attr(pre0, "class", "language-js");
			attr(source2, "type", "image/webp");
			attr(source2, "srcset", __build_img_webp__1);
			attr(source3, "type", "image/jpeg");
			attr(source3, "srcset", __build_img__1);
			attr(img1, "alt", "inverted emojis");
			if (img1.src !== (img1_src_value = __build_img__1)) attr(img1, "src", img1_src_value);
			attr(a17, "href", "https://www.chenhuijing.com/blog/friends-dont-let-friends-implement-dark-mode-alone/#%F0%9F%92%BB");
			attr(a17, "rel", "nofollow");
			attr(a18, "href", "https://github.com/remarkjs/remark");
			attr(a18, "rel", "nofollow");
			attr(a19, "href", "https://github.com/tanhauhau/tanhauhau.github.io/commit/291663d10cc7838d67392acb6a28a04a655603a6#diff-1be49bbded0fd920136646bdb37f5b91");
			attr(a19, "rel", "nofollow");
			attr(pre1, "class", "language-js");
			attr(a20, "href", "#the-restructure");
			attr(a20, "id", "the-restructure");
			attr(a21, "href", "https://lihautan.com/blogs/");
			attr(a21, "rel", "nofollow");
			attr(a22, "href", "https://lihautan.com/talks/");
			attr(a22, "rel", "nofollow");
			attr(a23, "href", "https://lihautan.com/notes");
			attr(a23, "rel", "nofollow");
			attr(a24, "href", "https://github.com/tanhauhau/tanhauhau.github.io/commit/50c82259749f7608d1c81062eac1f357b9437485");
			attr(a24, "rel", "nofollow");
		},
		m(target, anchor) {
			insert(target, section0, anchor);
			append(section0, ul);
			append(ul, li0);
			append(li0, a0);
			append(a0, t0);
			append(ul, li1);
			append(li1, a1);
			append(a1, t1);
			append(ul, li2);
			append(li2, a2);
			append(a2, t2);
			append(ul, li3);
			append(li3, a3);
			append(a3, t3);
			insert(target, t4, anchor);
			insert(target, p0, anchor);
			append(p0, t5);
			append(p0, a4);
			append(a4, t6);
			append(p0, t7);
			append(p0, a5);
			append(a5, t8);
			append(p0, t9);
			append(p0, a6);
			append(a6, t10);
			append(p0, t11);
			append(p0, em0);
			append(em0, t12);
			insert(target, t13, anchor);
			insert(target, p1, anchor);
			append(p1, t14);
			append(p1, a7);
			append(a7, t15);
			append(p1, t16);
			insert(target, t17, anchor);
			insert(target, p2, anchor);
			append(p2, t18);
			append(p2, strong);
			append(strong, t19);
			append(p2, t20);
			insert(target, t21, anchor);
			insert(target, section1, anchor);
			append(section1, h20);
			append(h20, a8);
			append(a8, t22);
			append(section1, t23);
			append(section1, p3);
			append(p3, t24);
			append(p3, a9);
			append(a9, t25);
			append(p3, t26);
			insert(target, t27, anchor);
			insert(target, section2, anchor);
			append(section2, h21);
			append(h21, a10);
			append(a10, t28);
			append(section2, t29);
			append(section2, p4);
			append(p4, t30);
			append(p4, a11);
			append(a11, t31);
			append(p4, t32);
			append(section2, t33);
			append(section2, p5);
			append(p5, picture0);
			append(picture0, source0);
			append(picture0, source1);
			append(picture0, img0);
			append(section2, t34);
			append(section2, p6);
			append(p6, t35);
			append(p6, code0);
			append(code0, t36);
			append(p6, t37);
			append(p6, code1);
			append(code1, t38);
			append(p6, t39);
			append(section2, t40);
			append(section2, p7);
			append(p7, t41);
			append(p7, a12);
			append(a12, t42);
			append(p7, t43);
			append(section2, t44);
			append(section2, p8);
			append(p8, t45);
			append(p8, code2);
			append(code2, t46);
			append(p8, t47);
			append(p8, code3);
			append(code3, t48);
			append(p8, t49);
			append(p8, code4);
			append(code4, t50);
			append(p8, t51);
			insert(target, t52, anchor);
			insert(target, section3, anchor);
			append(section3, h22);
			append(h22, a13);
			append(a13, t53);
			append(section3, t54);
			append(section3, p9);
			append(p9, a14);
			append(a14, t55);
			append(p9, t56);
			append(p9, a15);
			append(a15, t57);
			append(p9, t58);
			append(section3, t59);
			append(section3, p10);
			append(p10, t60);
			append(p10, a16);
			append(a16, t61);
			append(p10, t62);
			append(section3, t63);
			append(section3, p11);
			append(p11, t64);
			append(p11, code5);
			append(code5, t65);
			append(p11, t66);
			append(section3, t67);
			append(section3, pre0);
			pre0.innerHTML = raw0_value;
			append(section3, t68);
			append(section3, p12);
			append(p12, t69);
			append(section3, t70);
			append(section3, p13);
			append(p13, picture1);
			append(picture1, source2);
			append(picture1, source3);
			append(picture1, img1);
			append(section3, t71);
			append(section3, p14);
			append(p14, t72);
			append(p14, code6);
			append(code6, t73);
			append(p14, t74);
			append(p14, code7);
			append(code7, t75);
			append(p14, t76);
			append(p14, a17);
			append(a17, t77);
			append(p14, t78);
			append(p14, code8);
			append(code8, t79);
			append(p14, t80);
			append(p14, code9);
			append(code9, t81);
			append(p14, t82);
			append(section3, t83);
			append(section3, p15);
			append(p15, t84);
			append(section3, t85);
			append(section3, p16);
			append(p16, a18);
			append(a18, t86);
			append(p16, t87);
			append(p16, a19);
			append(a19, t88);
			append(p16, t89);
			append(section3, t90);
			append(section3, pre1);
			pre1.innerHTML = raw1_value;
			append(section3, t91);
			append(section3, p17);
			append(p17, em1);
			append(em1, t92);
			append(em1, span);
			append(section3, t93);
			append(section3, p18);
			append(p18, t94);
			append(section3, t95);
			append(section3, p19);
			append(p19, t96);
			append(section3, t97);
			append(section3, p20);
			append(p20, t98);
			append(p20, code10);
			append(code10, t99);
			append(p20, t100);
			insert(target, t101, anchor);
			insert(target, section4, anchor);
			append(section4, h23);
			append(h23, a20);
			append(a20, t102);
			append(section4, t103);
			append(section4, p21);
			append(p21, t104);
			append(p21, a21);
			append(a21, t105);
			append(p21, t106);
			append(p21, a22);
			append(a22, t107);
			append(p21, t108);
			append(p21, a23);
			append(a23, t109);
			append(p21, t110);
			append(p21, a24);
			append(a24, t111);
			append(section4, t112);
			append(section4, p22);
			append(p22, t113);
			append(p22, code11);
			append(code11, t114);
			append(p22, t115);
		},
		p: noop,
		d(detaching) {
			if (detaching) detach(section0);
			if (detaching) detach(t4);
			if (detaching) detach(p0);
			if (detaching) detach(t13);
			if (detaching) detach(p1);
			if (detaching) detach(t17);
			if (detaching) detach(p2);
			if (detaching) detach(t21);
			if (detaching) detach(section1);
			if (detaching) detach(t27);
			if (detaching) detach(section2);
			if (detaching) detach(t52);
			if (detaching) detach(section3);
			if (detaching) detach(t101);
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
	"title": "Building my Gatsby site",
	"date": "2019-07-02T08:00:00Z",
	"description": "A work in progress",
	"wip": true,
	"slug": "building-my-gatsby-site",
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
