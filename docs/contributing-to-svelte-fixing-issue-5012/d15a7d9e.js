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

var __build_img__1 = "9d8e49d4d12888bc.png";

var __build_img__0 = "3a649d18b90fca49.gif";

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

var image = "https://lihautan.com/contributing-to-svelte-fixing-issue-5012/assets/hero-twitter-14595226.jpg";

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
					"@id": "https%3A%2F%2Flihautan.com%2Fcontributing-to-svelte-fixing-issue-5012",
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
			attr(meta11, "content", "https%3A%2F%2Flihautan.com%2Fcontributing-to-svelte-fixing-issue-5012");
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
							"@id": "https%3A%2F%2Flihautan.com%2Fcontributing-to-svelte-fixing-issue-5012",
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

/* content/blog/contributing-to-svelte-fixing-issue-5012/@@page-markup.svelte generated by Svelte v3.24.0 */

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
	let li3;
	let a3;
	let t3;
	let ul0;
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
	let t12;
	let p1;
	let t13;
	let a8;
	let t14;
	let t15;
	let t16;
	let section2;
	let h21;
	let a9;
	let t17;
	let t18;
	let div;
	let p2;
	let strong0;
	let t19;
	let html_tag;
	let raw0_value = "{@html value}" + "";
	let t20;
	let a10;
	let t21;
	let t22;
	let p3;
	let t23;
	let html_tag_1;
	let raw1_value = "{@html value}" + "";
	let t24;
	let t25;
	let p4;
	let strong1;
	let t26;
	let t27;
	let p5;
	let a11;
	let t28;
	let t29;
	let p6;
	let t30;
	let t31;
	let p7;
	let strong2;
	let t32;
	let t33;
	let p8;
	let t34;
	let t35;
	let p9;
	let strong3;
	let t36;
	let t37;
	let p10;
	let t38;
	let t39;
	let p11;
	let strong4;
	let t40;
	let t41;
	let p12;
	let t42;
	let t43;
	let p13;
	let t44;
	let code0;
	let t45;
	let t46;
	let code1;
	let t47;
	let t48;
	let t49;
	let section3;
	let h22;
	let a12;
	let t50;
	let t51;
	let p14;
	let t52;
	let t53;
	let p15;
	let t54;
	let t55;
	let p16;
	let t56;
	let code2;
	let t57;
	let t58;
	let code3;
	let t59;
	let t60;
	let t61;
	let p17;
	let img0;
	let img0_src_value;
	let t62;
	let p18;
	let t63;
	let t64;
	let section4;
	let h23;
	let a13;
	let t65;
	let t66;
	let p19;
	let t67;
	let html_tag_2;
	let raw2_value = "<" + "";
	let t68;
	let t69;
	let p20;
	let t70;
	let code4;
	let t71;
	let t72;
	let t73;
	let p21;
	let t74;
	let a14;
	let code5;
	let t75;
	let t76;
	let t77;
	let t78;
	let p22;
	let img1;
	let img1_src_value;
	let t79;
	let p23;
	let t80;
	let strong5;
	let t81;
	let a15;
	let t82;
	let t83;
	let t84;
	let p24;
	let t85;
	let a16;
	let t86;
	let t87;
	let code6;
	let t88;
	let t89;
	let t90;
	let section5;
	let h3;
	let a17;
	let t91;
	let t92;
	let p25;
	let a18;
	let code7;
	let t93;
	let t94;
	let a19;
	let code8;
	let t95;
	let t96;
	let t97;
	let t98;
	let pre0;

	let raw3_value = `
<code class="language-js"><span class="token comment">// in the compiled Svelte code,</span>
<span class="token comment">// you would see the use of &#96;HtmlTag&#96;</span>
<span class="token comment">// when you use &#96;&#123;@html ...&#125;&#96;</span>
<span class="token keyword">const</span> html_tag <span class="token operator">=</span> <span class="token keyword">new</span> <span class="token class-name">HtmlTag</span><span class="token punctuation">(</span>anchor<span class="token punctuation">)</span><span class="token punctuation">;</span>
<span class="token comment">// mounting raw html string, call the &#96;m&#96;ount method</span>
html_tag<span class="token punctuation">.</span><span class="token function">m</span><span class="token punctuation">(</span><span class="token string">'&lt;div>content&lt;/div>'</span><span class="token punctuation">,</span> target<span class="token punctuation">,</span> anchor<span class="token punctuation">)</span><span class="token punctuation">;</span>
<span class="token comment">// when the html string content change, call the u&#96;p&#96;date method</span>
html_tag<span class="token punctuation">.</span><span class="token function">p</span><span class="token punctuation">(</span><span class="token string">'&lt;b>new&lt;/b>html&lt;br />'</span><span class="token punctuation">)</span><span class="token punctuation">;</span>
<span class="token comment">// when unmount, call the &#96;d&#96;etach method</span>
html_tag<span class="token punctuation">.</span><span class="token function">d</span><span class="token punctuation">(</span><span class="token punctuation">)</span><span class="token punctuation">;</span></code>` + "";

	let t99;
	let p26;
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
	let p27;
	let t108;
	let code12;
	let t109;
	let t110;
	let t111;
	let p28;
	let t112;
	let code13;
	let t113;
	let t114;
	let code14;
	let t115;
	let t116;
	let t117;
	let p29;
	let code15;
	let t118;
	let t119;
	let a20;
	let code16;
	let t120;
	let t121;
	let code17;
	let t122;
	let t123;
	let code18;
	let t124;
	let t125;
	let t126;
	let p30;
	let t127;
	let code19;
	let t128;
	let t129;
	let code20;
	let t130;
	let t131;
	let t132;
	let pre1;

	let raw4_value = `
<code class="language-html"><span class="token comment">&lt;!-- Initially --></span>
<span class="token tag"><span class="token tag"><span class="token punctuation">&lt;</span>article</span><span class="token punctuation">></span></span>
  <span class="token comment">&lt;!-- slot --></span>
  &#123;@html content&#125;
  <span class="token comment">&lt;!-- slot --></span>
  <span class="token tag"><span class="token tag"><span class="token punctuation">&lt;</span>p</span><span class="token punctuation">></span></span>
    This line should be last.
  <span class="token tag"><span class="token tag"><span class="token punctuation">&lt;/</span>p</span><span class="token punctuation">></span></span>
<span class="token tag"><span class="token tag"><span class="token punctuation">&lt;/</span>article</span><span class="token punctuation">></span></span>

<span class="token comment">&lt;!-- when the html content changed --></span>
<span class="token tag"><span class="token tag"><span class="token punctuation">&lt;</span>article</span><span class="token punctuation">></span></span>
  <span class="token comment">&lt;!-- slot --></span>
  <span class="token comment">&lt;!-- &#123;@html content&#125; removed --></span>
  <span class="token comment">&lt;!-- slot --></span>
  <span class="token tag"><span class="token tag"><span class="token punctuation">&lt;</span>p</span><span class="token punctuation">></span></span>
    This line should be last.
  <span class="token tag"><span class="token tag"><span class="token punctuation">&lt;/</span>p</span><span class="token punctuation">></span></span>
  &#123;@html content&#125;
  <span class="token comment">&lt;!-- inserted at the end of the parent --></span>
<span class="token tag"><span class="token tag"><span class="token punctuation">&lt;/</span>article</span><span class="token punctuation">></span></span></code>` + "";

	let t133;
	let p31;
	let strong6;
	let t134;
	let code21;
	let t135;
	let t136;
	let t137;
	let code22;
	let t138;
	let t139;
	let code23;
	let t140;
	let t141;
	let t142;
	let p32;
	let t143;
	let code24;
	let t144;
	let t145;
	let code25;
	let t146;
	let t147;
	let code26;
	let t148;
	let t149;
	let t150;
	let p33;
	let t151;
	let code27;
	let t152;
	let t153;
	let code28;
	let t154;
	let t155;
	let p34;
	let strong7;
	let t156;
	let t157;
	let a21;
	let t158;
	let t159;
	let t160;
	let pre2;

	let raw5_value = `
<code class="language-svelte">&lt;script&gt;
  let content = &#39;first line&#39;;
&lt;/script&gt;

&#123;@html content&#125;&lt;button on:click=&#123;() =&gt; &#123;content = &#39;line first&#39;;&#125;&#125; /&gt;</code>` + "";

	let t161;
	let pre3;

	let raw6_value = `
<code class="language-js"><span class="token comment">// compiled js</span>
<span class="token comment">// ...</span>
  <span class="token function">c</span><span class="token punctuation">(</span><span class="token punctuation">)</span> <span class="token punctuation">&#123;</span>
    button <span class="token operator">=</span> <span class="token function">element</span><span class="token punctuation">(</span><span class="token string">"button"</span><span class="token punctuation">)</span><span class="token punctuation">;</span>
    html_tag <span class="token operator">=</span> <span class="token keyword">new</span> <span class="token class-name">HtmlTag</span><span class="token punctuation">(</span>button<span class="token punctuation">)</span><span class="token punctuation">;</span>
  <span class="token punctuation">&#125;</span><span class="token punctuation">,</span>
<span class="token comment">// ...</span></code>` + "";

	let t162;
	let p35;
	let t163;
	let code29;
	let t164;
	let t165;
	let code30;
	let t166;
	let t167;
	let t168;
	let p36;
	let t169;
	let code31;
	let t170;
	let t171;
	let t172;
	let p37;
	let strong8;
	let t173;
	let t174;
	let a22;
	let t175;
	let t176;
	let t177;
	let pre4;

	let raw7_value = `
<code class="language-svelte">&lt;script&gt;
	import Foo from &#39;./Foo.svelte&#39;;
  let content = &#39;first line&#39;;
&lt;/script&gt;

&lt;button on:click=&#123;() =&gt; &#123;content = &#39;line first&#39;;&#125;&#125; /&gt;
&#123;@html content&#125;&lt;Foo /&gt;</code>` + "";

	let t178;
	let pre5;

	let raw8_value = `
<code class="language-js"><span class="token comment">// compiled js</span>
<span class="token comment">// ...</span>
  <span class="token function">c</span><span class="token punctuation">(</span><span class="token punctuation">)</span> <span class="token punctuation">&#123;</span>
    button <span class="token operator">=</span> <span class="token function">element</span><span class="token punctuation">(</span><span class="token string">"button"</span><span class="token punctuation">)</span><span class="token punctuation">;</span>
    t <span class="token operator">=</span> <span class="token function">space</span><span class="token punctuation">(</span><span class="token punctuation">)</span><span class="token punctuation">;</span>
    html_anchor <span class="token operator">=</span> <span class="token function">empty</span><span class="token punctuation">(</span><span class="token punctuation">)</span><span class="token punctuation">;</span>
    <span class="token function">create_component</span><span class="token punctuation">(</span>foo<span class="token punctuation">.</span>$$<span class="token punctuation">.</span>fragment<span class="token punctuation">)</span><span class="token punctuation">;</span>
    html_tag <span class="token operator">=</span> <span class="token keyword">new</span> <span class="token class-name">HtmlTag</span><span class="token punctuation">(</span>html_anchor<span class="token punctuation">)</span><span class="token punctuation">;</span>
  <span class="token punctuation">&#125;</span><span class="token punctuation">,</span>
<span class="token comment">// ...</span></code>` + "";

	let t179;
	let p38;
	let t180;
	let code32;
	let t181;
	let t182;
	let a23;
	let t183;
	let t184;
	let code33;
	let t185;
	let t186;
	let t187;
	let p39;
	let t188;
	let t189;
	let p40;
	let t190;
	let code34;
	let t191;
	let t192;
	let code35;
	let t193;
	let t194;
	let code36;
	let t195;
	let t196;
	let t197;
	let p41;
	let t198;
	let code37;
	let t199;
	let t200;
	let code38;
	let t201;
	let t202;
	let t203;
	let p42;
	let t204;
	let t205;
	let p43;
	let t206;
	let code39;
	let t207;
	let t208;
	let t209;
	let pre6;

	let raw9_value = `
<code class="language-svelte">&lt;div&gt;
  &lt;slot /&gt;
  &lt;div&gt;This is the last child&lt;/div&gt;
&lt;/div&gt;</code>` + "";

	let t210;
	let p44;
	let t211;
	let code40;
	let t212;
	let t213;
	let t214;
	let pre7;

	let raw10_value = `
<code class="language-svelte">&lt;!-- Component.svelte --&gt;
&lt;script&gt;
  export let content;
&lt;/script&gt;

&#123;@html content&#125;

&lt;!-- App.svelte --&gt;
&lt;script&gt;
  import Component from &#39;./Component.svelte&#39;;
&lt;/script&gt;
&lt;div&gt;
  &lt;Component content=&#123;&#39;&lt;div&gt;html string&lt;/div&gt;&#39;&#125;/&gt;
  &lt;div&gt;This is the last child&lt;/div&gt;
&lt;/div&gt;</code>` + "";

	let t215;
	let p45;
	let a24;
	let t216;
	let t217;
	let p46;
	let t218;
	let t219;
	let section6;
	let h24;
	let a25;
	let t220;
	let t221;
	let p47;
	let t222;
	let t223;
	let p48;
	let t224;
	let t225;
	let ul3;
	let li6;
	let t226;
	let code41;
	let t227;
	let t228;
	let t229;
	let li9;
	let t230;
	let ul2;
	let li7;
	let code42;
	let t231;
	let t232;
	let t233;
	let li8;
	let code43;
	let t234;
	let t235;
	let t236;
	let p49;
	let t237;
	let t238;
	let p50;
	let t239;
	let code44;
	let t240;
	let t241;
	let t242;
	let pre8;

	let raw11_value = `
<code class="language-js"><span class="token comment">// src/compiler/compile/render_dom/wrappers/RawMustacheTag.ts#L42</span>

<span class="token keyword">const</span> needs_anchor <span class="token operator">=</span> in_head <span class="token operator">||</span> <span class="token punctuation">(</span><span class="token keyword">this</span><span class="token punctuation">.</span>next <span class="token operator">&amp;&amp;</span> <span class="token operator">!</span><span class="token keyword">this</span><span class="token punctuation">.</span>next<span class="token punctuation">.</span><span class="token function">is_dom_node</span><span class="token punctuation">(</span><span class="token punctuation">)</span><span class="token punctuation">)</span><span class="token punctuation">;</span>

<span class="token comment">// ...</span>
<span class="token keyword">if</span> <span class="token punctuation">(</span>needs_anchor<span class="token punctuation">)</span> <span class="token punctuation">&#123;</span>
  block<span class="token punctuation">.</span><span class="token function">add_element</span><span class="token punctuation">(</span>html_anchor<span class="token punctuation">,</span> x<span class="token template-string"><span class="token template-punctuation string">&#96;</span><span class="token string">@empty()</span><span class="token template-punctuation string">&#96;</span></span><span class="token punctuation">,</span> x<span class="token template-string"><span class="token template-punctuation string">&#96;</span><span class="token string">@empty()</span><span class="token template-punctuation string">&#96;</span></span><span class="token punctuation">,</span> parent_node<span class="token punctuation">)</span><span class="token punctuation">;</span>
<span class="token punctuation">&#125;</span></code>` + "";

	let t243;
	let p51;
	let a26;
	let t244;
	let t245;
	let p52;
	let t246;
	let t247;
	let ul4;
	let li10;
	let t248;
	let code45;
	let t249;
	let t250;
	let t251;
	let li11;
	let t252;
	let em;
	let t253;
	let t254;
	let t255;
	let pre9;

	let raw12_value = `
<code class="language-js"><span class="token keyword">const</span> needs_anchor <span class="token operator">=</span>
  in_head <span class="token operator">||</span>
  <span class="token punctuation">(</span><span class="token keyword">this</span><span class="token punctuation">.</span>next
    <span class="token operator">?</span> <span class="token operator">!</span><span class="token keyword">this</span><span class="token punctuation">.</span>next<span class="token punctuation">.</span><span class="token function">is_dom_node</span><span class="token punctuation">(</span><span class="token punctuation">)</span>
    <span class="token punctuation">:</span> <span class="token operator">!</span><span class="token keyword">this</span><span class="token punctuation">.</span>parent <span class="token operator">||</span> <span class="token operator">!</span><span class="token keyword">this</span><span class="token punctuation">.</span>parent<span class="token punctuation">.</span><span class="token function">is_dom_node</span><span class="token punctuation">(</span><span class="token punctuation">)</span><span class="token punctuation">)</span><span class="token punctuation">;</span></code>` + "";

	let t256;
	let p53;
	let t257;
	let t258;
	let ul5;
	let li12;
	let t259;
	let t260;
	let li13;
	let t261;
	let code46;
	let t262;
	let t263;
	let t264;
	let p54;
	let t265;
	let code47;
	let t266;
	let t267;
	let t268;
	let pre10;

	let raw13_value = `
<code class="language-js"><span class="token keyword">export</span> <span class="token keyword">default</span> <span class="token punctuation">&#123;</span>
  html<span class="token punctuation">:</span> <span class="token template-string"><span class="token template-punctuation string">&#96;</span><span class="token string">
    &lt;button>Switch&lt;/button>
    &lt;p>Another first line&lt;/p>
    &lt;p>This line should be last.&lt;/p>
  </span><span class="token template-punctuation string">&#96;</span></span><span class="token punctuation">,</span>
  <span class="token keyword">async</span> <span class="token function">test</span><span class="token punctuation">(</span><span class="token parameter"><span class="token punctuation">&#123;</span> assert<span class="token punctuation">,</span> target<span class="token punctuation">,</span> window <span class="token punctuation">&#125;</span></span><span class="token punctuation">)</span> <span class="token punctuation">&#123;</span>
    <span class="token keyword">const</span> btn <span class="token operator">=</span> target<span class="token punctuation">.</span><span class="token function">querySelector</span><span class="token punctuation">(</span><span class="token string">'button'</span><span class="token punctuation">)</span><span class="token punctuation">;</span>
    <span class="token keyword">const</span> clickEvent <span class="token operator">=</span> <span class="token keyword">new</span> <span class="token class-name">window<span class="token punctuation">.</span>MouseEvent</span><span class="token punctuation">(</span><span class="token string">'click'</span><span class="token punctuation">)</span><span class="token punctuation">;</span>

    <span class="token comment">// simulate clicks</span>
    <span class="token keyword">await</span> btn<span class="token punctuation">.</span><span class="token function">dispatchEvent</span><span class="token punctuation">(</span>clickEvent<span class="token punctuation">)</span><span class="token punctuation">;</span>

    assert<span class="token punctuation">.</span><span class="token function">htmlEqual</span><span class="token punctuation">(</span>
      target<span class="token punctuation">.</span>innerHTML<span class="token punctuation">,</span>
      <span class="token template-string"><span class="token template-punctuation string">&#96;</span><span class="token string">
        &lt;button>Switch&lt;/button>
        &lt;p>First line&lt;/p>
        &lt;p>This line should be last.&lt;/p>
      </span><span class="token template-punctuation string">&#96;</span></span>
    <span class="token punctuation">)</span><span class="token punctuation">;</span>

    <span class="token comment">// simulate clicks</span>
    <span class="token keyword">await</span> btn<span class="token punctuation">.</span><span class="token function">dispatchEvent</span><span class="token punctuation">(</span>clickEvent<span class="token punctuation">)</span><span class="token punctuation">;</span>

    assert<span class="token punctuation">.</span><span class="token function">htmlEqual</span><span class="token punctuation">(</span>
      target<span class="token punctuation">.</span>innerHTML<span class="token punctuation">,</span>
      <span class="token template-string"><span class="token template-punctuation string">&#96;</span><span class="token string">
        &lt;button>Switch&lt;/button>
        &lt;p>Another first line&lt;/p>
        &lt;p>This line should be last.&lt;/p>
      </span><span class="token template-punctuation string">&#96;</span></span>
    <span class="token punctuation">)</span><span class="token punctuation">;</span>
  <span class="token punctuation">&#125;</span><span class="token punctuation">,</span>
<span class="token punctuation">&#125;</span><span class="token punctuation">;</span></code>` + "";

	let t269;
	let p55;
	let t270;
	let a27;
	let t271;
	let t272;
	let t273;
	let hr;
	let t274;
	let p56;
	let t275;
	let a28;
	let t276;
	let t277;
	let t278;
	let p57;
	let t279;
	let a29;
	let t280;
	let t281;

	return {
		c() {
			section0 = element("section");
			ul1 = element("ul");
			li0 = element("li");
			a0 = element("a");
			t0 = text("Background");
			li1 = element("li");
			a1 = element("a");
			t1 = text("The bug");
			li2 = element("li");
			a2 = element("a");
			t2 = text("Verifying the bug");
			li3 = element("li");
			a3 = element("a");
			t3 = text("Investigating the bug");
			ul0 = element("ul");
			li4 = element("li");
			a4 = element("a");
			t4 = text("HtmlTag");
			li5 = element("li");
			a5 = element("a");
			t5 = text("Fixing the bug");
			t6 = space();
			section1 = element("section");
			h20 = element("h2");
			a6 = element("a");
			t7 = text("Background");
			t8 = space();
			p0 = element("p");
			t9 = text("Following ");
			a7 = element("a");
			t10 = text("Contributing to Svelte - Fixing issue #4392");
			t11 = text(", I find it interesting to write my thought process down on fixing a Svelte issue.");
			t12 = space();
			p1 = element("p");
			t13 = text("So today, I'm going to walk through a new issue, ");
			a8 = element("a");
			t14 = text("#5012");
			t15 = text(".");
			t16 = space();
			section2 = element("section");
			h21 = element("h2");
			a9 = element("a");
			t17 = text("The bug");
			t18 = space();
			div = element("div");
			p2 = element("p");
			strong0 = element("strong");
			t19 = text("Slot containing only ");
			t20 = text(" renders in wrong place on update ");
			a10 = element("a");
			t21 = text("#5012");
			t22 = space();
			p3 = element("p");
			t23 = text("When a slotted component is instantiated and the only contents of the slot is ");
			t24 = text(", changing value will cause the HTML-ized value to render at the end of the slot's parent element (i.e. after all sibling elements) instead of in the correct place.");
			t25 = space();
			p4 = element("p");
			strong1 = element("strong");
			t26 = text("To Reproduce");
			t27 = space();
			p5 = element("p");
			a11 = element("a");
			t28 = text("https://svelte.dev/repl/1f9da40bca4b44a089041e826648de2f");
			t29 = space();
			p6 = element("p");
			t30 = text("Click the Switch button and see that the contents of the slot moves to the end.");
			t31 = space();
			p7 = element("p");
			strong2 = element("strong");
			t32 = text("Expected behavior");
			t33 = space();
			p8 = element("p");
			t34 = text("Slot continues to render in the correct place.");
			t35 = space();
			p9 = element("p");
			strong3 = element("strong");
			t36 = text("Information about your Svelte project:");
			t37 = space();
			p10 = element("p");
			t38 = text("Looks like this appeared in version 3.7 and is still present in 3.23.2. If I run the REPL on 3.6.11 it behaves properly.");
			t39 = space();
			p11 = element("p");
			strong4 = element("strong");
			t40 = text("Severity");
			t41 = space();
			p12 = element("p");
			t42 = text("Potentially serious, but not serious for me.");
			t43 = space();
			p13 = element("p");
			t44 = text("Can be worked around by changing the slot contents to ");
			code0 = element("code");
			t45 = text("<div>{@html value}</div>");
			t46 = text(" or changing the child component to use ");
			code1 = element("code");
			t47 = text("<div><slot /><div>");
			t48 = text(", which works fine for me.");
			t49 = space();
			section3 = element("section");
			h22 = element("h2");
			a12 = element("a");
			t50 = text("Verifying the bug");
			t51 = space();
			p14 = element("p");
			t52 = text("I clicked into the REPL and tried to understand about the bug.");
			t53 = space();
			p15 = element("p");
			t54 = text("Initially, you see 2 lines of text, \"Another first line\", \"This line should be last.\".");
			t55 = space();
			p16 = element("p");
			t56 = text("But as soon as I updated the ");
			code2 = element("code");
			t57 = text("{@html content}");
			t58 = text(", the ");
			code3 = element("code");
			t59 = text("{@html content}");
			t60 = text(" moved to be after the \"This line should be last.\" and stayed there.");
			t61 = space();
			p17 = element("p");
			img0 = element("img");
			t62 = space();
			p18 = element("p");
			t63 = text("Yup. This is indeed a bug! 🐛");
			t64 = space();
			section4 = element("section");
			h23 = element("h2");
			a13 = element("a");
			t65 = text("Investigating the bug");
			t66 = space();
			p19 = element("p");
			t67 = text("It's amazing that the issue author tracked down the regression behavior of this issue, stating that it started happening since 3.7. Probably because the author just upgraded Svelte from ");
			t68 = text(" 3.7, or maybe he tried every versions to figure out whether it is regression bug or a undiscovered bug. Anyway, kudos to the issue author! 💪 💪");
			t69 = space();
			p20 = element("p");
			t70 = text("Most open source projects maintain a change log file, usually named ");
			code4 = element("code");
			t71 = text("CHANGELOG.md");
			t72 = text(" located at the root of the project folder, so that you can figured out what's added / removed / updated in each version.");
			t73 = space();
			p21 = element("p");
			t74 = text("You can find Svelte's ");
			a14 = element("a");
			code5 = element("code");
			t75 = text("CHANGELOG.md");
			t76 = text(" here");
			t77 = text(".");
			t78 = space();
			p22 = element("p");
			img1 = element("img");
			t79 = space();
			p23 = element("p");
			t80 = text("From the changelog, the most relevant commits seemed to be ");
			strong5 = element("strong");
			t81 = text("\"Remount HTML tags correctly (");
			a15 = element("a");
			t82 = text("#3329");
			t83 = text(")\"");
			t84 = space();
			p24 = element("p");
			t85 = text("Reading through the PR, it seemed that ");
			a16 = element("a");
			t86 = text("#3329");
			t87 = text(" was when ");
			code6 = element("code");
			t88 = text("HtmlTag");
			t89 = text(" is first introduced!");
			t90 = space();
			section5 = element("section");
			h3 = element("h3");
			a17 = element("a");
			t91 = text("HtmlTag");
			t92 = space();
			p25 = element("p");
			a18 = element("a");
			code7 = element("code");
			t93 = text("HtmlTag");
			t94 = text(" is a helper class that helps Svelte manage raw ");
			a19 = element("a");
			code8 = element("code");
			t95 = text("{@html ...}");
			t96 = text(" tag");
			t97 = text(".");
			t98 = space();
			pre0 = element("pre");
			t99 = space();
			p26 = element("p");
			t100 = text("The HtmlTag instance provides the ");
			code9 = element("code");
			t101 = text("m");
			t102 = text(", ");
			code10 = element("code");
			t103 = text("p");
			t104 = text(", ");
			code11 = element("code");
			t105 = text("d");
			t106 = text(" method, and it will maintain the HTML elements created through the HTML string.");
			t107 = space();
			p27 = element("p");
			t108 = text("So, before v3.7, ");
			code12 = element("code");
			t109 = text("{@html ...}");
			t110 = text(" was handled differently, and from the PR, I assume it was more buggy than the current implementation, albeit getting the case reported by this issue #5012 right. So, there's no reverting back, nor taking the implementation pre-v3.7 as a reference to figure this bug out.");
			t111 = space();
			p28 = element("p");
			t112 = text("Reading through the implementation of the ");
			code13 = element("code");
			t113 = text("HtmlTag");
			t114 = text(", it seemed that the ");
			code14 = element("code");
			t115 = text("anchor");
			t116 = text(" is a key to this issue.");
			t117 = space();
			p29 = element("p");
			code15 = element("code");
			t118 = text("HtmlTag");
			t119 = text(" uses ");
			a20 = element("a");
			code16 = element("code");
			t120 = text("insertBefore");
			t121 = text(" to insert HTML elements into the DOM. There's a nullable 2nd argument for ");
			code17 = element("code");
			t122 = text("insertBefore");
			t123 = text(", if it is ");
			code18 = element("code");
			t124 = text("null");
			t125 = text(", the element will be inserted at the end of the parent.");
			t126 = space();
			p30 = element("p");
			t127 = text("In this case, the ");
			code19 = element("code");
			t128 = text("anchor");
			t129 = text(" is indeed ");
			code20 = element("code");
			t130 = text("null");
			t131 = text(", so when there's a change in the HTML content, the previous HTML elements were removed and the new HTML elements were inserted at the end of the parent.");
			t132 = space();
			pre1 = element("pre");
			t133 = space();
			p31 = element("p");
			strong6 = element("strong");
			t134 = text("Why doesn't the ");
			code21 = element("code");
			t135 = text("{@html content}");
			t136 = text(" added at the end of the parent in the initial render?");
			t137 = text(" Well, the elements are added in order during mounting. The HTML elements from ");
			code22 = element("code");
			t138 = text("HtmlTag");
			t139 = text(" was added at the end of the parent, followed by the ");
			code23 = element("code");
			t140 = text("<p>This line should be last</p>");
			t141 = text(".");
			t142 = space();
			p32 = element("p");
			t143 = text("The ");
			code24 = element("code");
			t144 = text("anchor");
			t145 = text(" is an argument to the ");
			code25 = element("code");
			t146 = text("HtmlTag");
			t147 = text(" constructor, so one can safely assume that it is not always ");
			code26 = element("code");
			t148 = text("null");
			t149 = text(".");
			t150 = space();
			p33 = element("p");
			t151 = text("So, I tried out using ");
			code27 = element("code");
			t152 = text("{@html content}");
			t153 = text(" in various ways, to figure out what may be an anchor for the ");
			code28 = element("code");
			t154 = text("HtmlTag");
			t155 = space();
			p34 = element("p");
			strong7 = element("strong");
			t156 = text("Repro #1");
			t157 = text(" (");
			a21 = element("a");
			t158 = text("REPL");
			t159 = text(")");
			t160 = space();
			pre2 = element("pre");
			t161 = space();
			pre3 = element("pre");
			t162 = space();
			p35 = element("p");
			t163 = text("In this case, the ");
			code29 = element("code");
			t164 = text("<button />");
			t165 = text(" element turns out to be the anchor, which totally make sense, as the html content should be inserted before ");
			code30 = element("code");
			t166 = text("<button />");
			t167 = text(".");
			t168 = space();
			p36 = element("p");
			t169 = text("So, it seemed like the anchor is the next element right after ");
			code31 = element("code");
			t170 = text("{@html ...}");
			t171 = text(". 🤔");
			t172 = space();
			p37 = element("p");
			strong8 = element("strong");
			t173 = text("Repro #2");
			t174 = text(" (");
			a22 = element("a");
			t175 = text("REPL");
			t176 = text(")");
			t177 = space();
			pre4 = element("pre");
			t178 = space();
			pre5 = element("pre");
			t179 = space();
			p38 = element("p");
			t180 = text("If the next element right after ");
			code32 = element("code");
			t181 = text("{@html ...}");
			t182 = text(" is a component, then Svelte will insert a empty ");
			a23 = element("a");
			t183 = text("Text");
			t184 = text(" node in between ");
			code33 = element("code");
			t185 = text("{@html ...}");
			t186 = text(" and the component, and the anchor is the empty Text node.");
			t187 = space();
			p39 = element("p");
			t188 = text("Well, that make sense too, because we can't see what's inside the component, we can't get the first element rendered in the component as the anchor. So, an extra empty Text node is used for anchoring.");
			t189 = space();
			p40 = element("p");
			t190 = text("So, it seemed like the anchor for the ");
			code34 = element("code");
			t191 = text("HtmlTag");
			t192 = text(" depends on the next element, and the ");
			code35 = element("code");
			t193 = text("HtmlTag");
			t194 = text(" itself is the last element, then the anchor would be ");
			code36 = element("code");
			t195 = text("null");
			t196 = text(".");
			t197 = space();
			p41 = element("p");
			t198 = text("This seemed fine in most cases, as in if the ");
			code37 = element("code");
			t199 = text("HtmlTag");
			t200 = text(" is indeed the last element of its parent, then, we don't need an anchor. Adding and updating ");
			code38 = element("code");
			t201 = text("HtmlTag");
			t202 = text(" will always add HTML elements at the end of its parent.");
			t203 = space();
			p42 = element("p");
			t204 = text("However, I figured there are 2 edge cases that this assumption may not be true.");
			t205 = space();
			p43 = element("p");
			t206 = text("The 1st edge case is the one reported in the issue #5012, if the ");
			code39 = element("code");
			t207 = text("{@html ...}");
			t208 = text(" is the last element within a slot. As we can't tell how the slot would be used in the component, it may not be the last element of it's parent.");
			t209 = space();
			pre6 = element("pre");
			t210 = space();
			p44 = element("p");
			t211 = text("The 2nd edge case is that ");
			code40 = element("code");
			t212 = text("{@html ...}");
			t213 = text(" is the last element, but it is a the root of the Component.");
			t214 = space();
			pre7 = element("pre");
			t215 = space();
			p45 = element("p");
			a24 = element("a");
			t216 = text("REPL");
			t217 = space();
			p46 = element("p");
			t218 = text("As you can see in this contrived example, we can't assume where the component is being used by its parent, so, even it seemed to be the last element in the component, it may not be the case in the parent component.");
			t219 = space();
			section6 = element("section");
			h24 = element("h2");
			a25 = element("a");
			t220 = text("Fixing the bug");
			t221 = space();
			p47 = element("p");
			t222 = text("Once we figured out the cause of the bug, the fix is much simpler.");
			t223 = space();
			p48 = element("p");
			t224 = text("Just as how Svelte will add a empty Text node as an anchor if the next element is a component, we are going to add the same anchor if");
			t225 = space();
			ul3 = element("ul");
			li6 = element("li");
			t226 = text("the ");
			code41 = element("code");
			t227 = text("{@html ...}");
			t228 = text(" has no next element, and");
			t229 = space();
			li9 = element("li");
			t230 = text("either");
			ul2 = element("ul");
			li7 = element("li");
			code42 = element("code");
			t231 = text("{@html ...}");
			t232 = text(" is at the root of a slot, or");
			t233 = space();
			li8 = element("li");
			code43 = element("code");
			t234 = text("{@html ...}");
			t235 = text(" is at the root of a component.");
			t236 = space();
			p49 = element("p");
			t237 = text("I know my way in the Svelte repo, good enough to know where to add this extra condition.");
			t238 = space();
			p50 = element("p");
			t239 = text("But if you are new, you can try global search the keyword ");
			code44 = element("code");
			t240 = text("html_anchor");
			t241 = text(", the variable name of the anchor added by Svelte, it should lead you to it.");
			t242 = space();
			pre8 = element("pre");
			t243 = space();
			p51 = element("p");
			a26 = element("a");
			t244 = text("Link to Github");
			t245 = space();
			p52 = element("p");
			t246 = text("Here we see that the condition of adding an anchor is that if");
			t247 = space();
			ul4 = element("ul");
			li10 = element("li");
			t248 = text("it is in the ");
			code45 = element("code");
			t249 = text("<svelte:head>");
			t250 = text(", or");
			t251 = space();
			li11 = element("li");
			t252 = text("the next element is not a dom element, (which could be a component, or logic blocks ");
			em = element("em");
			t253 = text("(oh why didn't I think about this case too?)");
			t254 = text(")");
			t255 = space();
			pre9 = element("pre");
			t256 = space();
			p53 = element("p");
			t257 = text("So, we check if");
			t258 = space();
			ul5 = element("ul");
			li12 = element("li");
			t259 = text("it has a parent (if it is at the root of component), or");
			t260 = space();
			li13 = element("li");
			t261 = text("if the parent is not an element (it could be within a slot, or a logic block ");
			code46 = element("code");
			t262 = text("{#if}");
			t263 = text(")");
			t264 = space();
			p54 = element("p");
			t265 = text("For the test case, I used to 2 edge case examples, try to simulate some clicks, and make sure that the ");
			code47 = element("code");
			t266 = text("{@html ...}");
			t267 = text(" stay in place even after the HTML content changes.");
			t268 = space();
			pre10 = element("pre");
			t269 = space();
			p55 = element("p");
			t270 = text("You can read the ");
			a27 = element("a");
			t271 = text("Pull Request #5061");
			t272 = text(" to see all the test cases written up.");
			t273 = space();
			hr = element("hr");
			t274 = space();
			p56 = element("p");
			t275 = text("If you wish to learn more about Svelte, ");
			a28 = element("a");
			t276 = text("follow me on Twitter");
			t277 = text(".");
			t278 = space();
			p57 = element("p");
			t279 = text("If you have anything unclear about this article, find me on ");
			a29 = element("a");
			t280 = text("Twitter");
			t281 = text(" too!");
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
			t1 = claim_text(a1_nodes, "The bug");
			a1_nodes.forEach(detach);
			li1_nodes.forEach(detach);
			li2 = claim_element(ul1_nodes, "LI", {});
			var li2_nodes = children(li2);
			a2 = claim_element(li2_nodes, "A", { href: true });
			var a2_nodes = children(a2);
			t2 = claim_text(a2_nodes, "Verifying the bug");
			a2_nodes.forEach(detach);
			li2_nodes.forEach(detach);
			li3 = claim_element(ul1_nodes, "LI", {});
			var li3_nodes = children(li3);
			a3 = claim_element(li3_nodes, "A", { href: true });
			var a3_nodes = children(a3);
			t3 = claim_text(a3_nodes, "Investigating the bug");
			a3_nodes.forEach(detach);
			li3_nodes.forEach(detach);
			ul0 = claim_element(ul1_nodes, "UL", {});
			var ul0_nodes = children(ul0);
			li4 = claim_element(ul0_nodes, "LI", {});
			var li4_nodes = children(li4);
			a4 = claim_element(li4_nodes, "A", { href: true });
			var a4_nodes = children(a4);
			t4 = claim_text(a4_nodes, "HtmlTag");
			a4_nodes.forEach(detach);
			li4_nodes.forEach(detach);
			ul0_nodes.forEach(detach);
			li5 = claim_element(ul1_nodes, "LI", {});
			var li5_nodes = children(li5);
			a5 = claim_element(li5_nodes, "A", { href: true });
			var a5_nodes = children(a5);
			t5 = claim_text(a5_nodes, "Fixing the bug");
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
			t7 = claim_text(a6_nodes, "Background");
			a6_nodes.forEach(detach);
			h20_nodes.forEach(detach);
			t8 = claim_space(section1_nodes);
			p0 = claim_element(section1_nodes, "P", {});
			var p0_nodes = children(p0);
			t9 = claim_text(p0_nodes, "Following ");
			a7 = claim_element(p0_nodes, "A", { href: true });
			var a7_nodes = children(a7);
			t10 = claim_text(a7_nodes, "Contributing to Svelte - Fixing issue #4392");
			a7_nodes.forEach(detach);
			t11 = claim_text(p0_nodes, ", I find it interesting to write my thought process down on fixing a Svelte issue.");
			p0_nodes.forEach(detach);
			t12 = claim_space(section1_nodes);
			p1 = claim_element(section1_nodes, "P", {});
			var p1_nodes = children(p1);
			t13 = claim_text(p1_nodes, "So today, I'm going to walk through a new issue, ");
			a8 = claim_element(p1_nodes, "A", { href: true, rel: true });
			var a8_nodes = children(a8);
			t14 = claim_text(a8_nodes, "#5012");
			a8_nodes.forEach(detach);
			t15 = claim_text(p1_nodes, ".");
			p1_nodes.forEach(detach);
			section1_nodes.forEach(detach);
			t16 = claim_space(nodes);
			section2 = claim_element(nodes, "SECTION", {});
			var section2_nodes = children(section2);
			h21 = claim_element(section2_nodes, "H2", {});
			var h21_nodes = children(h21);
			a9 = claim_element(h21_nodes, "A", { href: true, id: true });
			var a9_nodes = children(a9);
			t17 = claim_text(a9_nodes, "The bug");
			a9_nodes.forEach(detach);
			h21_nodes.forEach(detach);
			t18 = claim_space(section2_nodes);
			div = claim_element(section2_nodes, "DIV", { class: true });
			var div_nodes = children(div);
			p2 = claim_element(div_nodes, "P", { class: true });
			var p2_nodes = children(p2);
			strong0 = claim_element(p2_nodes, "STRONG", {});
			var strong0_nodes = children(strong0);
			t19 = claim_text(strong0_nodes, "Slot containing only ");
			t20 = claim_text(strong0_nodes, " renders in wrong place on update ");
			a10 = claim_element(strong0_nodes, "A", { href: true, rel: true });
			var a10_nodes = children(a10);
			t21 = claim_text(a10_nodes, "#5012");
			a10_nodes.forEach(detach);
			strong0_nodes.forEach(detach);
			p2_nodes.forEach(detach);
			t22 = claim_space(div_nodes);
			p3 = claim_element(div_nodes, "P", { class: true });
			var p3_nodes = children(p3);
			t23 = claim_text(p3_nodes, "When a slotted component is instantiated and the only contents of the slot is ");
			t24 = claim_text(p3_nodes, ", changing value will cause the HTML-ized value to render at the end of the slot's parent element (i.e. after all sibling elements) instead of in the correct place.");
			p3_nodes.forEach(detach);
			t25 = claim_space(div_nodes);
			p4 = claim_element(div_nodes, "P", { class: true });
			var p4_nodes = children(p4);
			strong1 = claim_element(p4_nodes, "STRONG", {});
			var strong1_nodes = children(strong1);
			t26 = claim_text(strong1_nodes, "To Reproduce");
			strong1_nodes.forEach(detach);
			p4_nodes.forEach(detach);
			t27 = claim_space(div_nodes);
			p5 = claim_element(div_nodes, "P", { class: true });
			var p5_nodes = children(p5);
			a11 = claim_element(p5_nodes, "A", { href: true, rel: true });
			var a11_nodes = children(a11);
			t28 = claim_text(a11_nodes, "https://svelte.dev/repl/1f9da40bca4b44a089041e826648de2f");
			a11_nodes.forEach(detach);
			p5_nodes.forEach(detach);
			t29 = claim_space(div_nodes);
			p6 = claim_element(div_nodes, "P", { class: true });
			var p6_nodes = children(p6);
			t30 = claim_text(p6_nodes, "Click the Switch button and see that the contents of the slot moves to the end.");
			p6_nodes.forEach(detach);
			t31 = claim_space(div_nodes);
			p7 = claim_element(div_nodes, "P", { class: true });
			var p7_nodes = children(p7);
			strong2 = claim_element(p7_nodes, "STRONG", {});
			var strong2_nodes = children(strong2);
			t32 = claim_text(strong2_nodes, "Expected behavior");
			strong2_nodes.forEach(detach);
			p7_nodes.forEach(detach);
			t33 = claim_space(div_nodes);
			p8 = claim_element(div_nodes, "P", { class: true });
			var p8_nodes = children(p8);
			t34 = claim_text(p8_nodes, "Slot continues to render in the correct place.");
			p8_nodes.forEach(detach);
			t35 = claim_space(div_nodes);
			p9 = claim_element(div_nodes, "P", { class: true });
			var p9_nodes = children(p9);
			strong3 = claim_element(p9_nodes, "STRONG", {});
			var strong3_nodes = children(strong3);
			t36 = claim_text(strong3_nodes, "Information about your Svelte project:");
			strong3_nodes.forEach(detach);
			p9_nodes.forEach(detach);
			t37 = claim_space(div_nodes);
			p10 = claim_element(div_nodes, "P", { class: true });
			var p10_nodes = children(p10);
			t38 = claim_text(p10_nodes, "Looks like this appeared in version 3.7 and is still present in 3.23.2. If I run the REPL on 3.6.11 it behaves properly.");
			p10_nodes.forEach(detach);
			t39 = claim_space(div_nodes);
			p11 = claim_element(div_nodes, "P", { class: true });
			var p11_nodes = children(p11);
			strong4 = claim_element(p11_nodes, "STRONG", {});
			var strong4_nodes = children(strong4);
			t40 = claim_text(strong4_nodes, "Severity");
			strong4_nodes.forEach(detach);
			p11_nodes.forEach(detach);
			t41 = claim_space(div_nodes);
			p12 = claim_element(div_nodes, "P", { class: true });
			var p12_nodes = children(p12);
			t42 = claim_text(p12_nodes, "Potentially serious, but not serious for me.");
			p12_nodes.forEach(detach);
			t43 = claim_space(div_nodes);
			p13 = claim_element(div_nodes, "P", { class: true });
			var p13_nodes = children(p13);
			t44 = claim_text(p13_nodes, "Can be worked around by changing the slot contents to ");
			code0 = claim_element(p13_nodes, "CODE", {});
			var code0_nodes = children(code0);
			t45 = claim_text(code0_nodes, "<div>{@html value}</div>");
			code0_nodes.forEach(detach);
			t46 = claim_text(p13_nodes, " or changing the child component to use ");
			code1 = claim_element(p13_nodes, "CODE", {});
			var code1_nodes = children(code1);
			t47 = claim_text(code1_nodes, "<div><slot /><div>");
			code1_nodes.forEach(detach);
			t48 = claim_text(p13_nodes, ", which works fine for me.");
			p13_nodes.forEach(detach);
			div_nodes.forEach(detach);
			section2_nodes.forEach(detach);
			t49 = claim_space(nodes);
			section3 = claim_element(nodes, "SECTION", {});
			var section3_nodes = children(section3);
			h22 = claim_element(section3_nodes, "H2", {});
			var h22_nodes = children(h22);
			a12 = claim_element(h22_nodes, "A", { href: true, id: true });
			var a12_nodes = children(a12);
			t50 = claim_text(a12_nodes, "Verifying the bug");
			a12_nodes.forEach(detach);
			h22_nodes.forEach(detach);
			t51 = claim_space(section3_nodes);
			p14 = claim_element(section3_nodes, "P", {});
			var p14_nodes = children(p14);
			t52 = claim_text(p14_nodes, "I clicked into the REPL and tried to understand about the bug.");
			p14_nodes.forEach(detach);
			t53 = claim_space(section3_nodes);
			p15 = claim_element(section3_nodes, "P", {});
			var p15_nodes = children(p15);
			t54 = claim_text(p15_nodes, "Initially, you see 2 lines of text, \"Another first line\", \"This line should be last.\".");
			p15_nodes.forEach(detach);
			t55 = claim_space(section3_nodes);
			p16 = claim_element(section3_nodes, "P", {});
			var p16_nodes = children(p16);
			t56 = claim_text(p16_nodes, "But as soon as I updated the ");
			code2 = claim_element(p16_nodes, "CODE", {});
			var code2_nodes = children(code2);
			t57 = claim_text(code2_nodes, "{@html content}");
			code2_nodes.forEach(detach);
			t58 = claim_text(p16_nodes, ", the ");
			code3 = claim_element(p16_nodes, "CODE", {});
			var code3_nodes = children(code3);
			t59 = claim_text(code3_nodes, "{@html content}");
			code3_nodes.forEach(detach);
			t60 = claim_text(p16_nodes, " moved to be after the \"This line should be last.\" and stayed there.");
			p16_nodes.forEach(detach);
			t61 = claim_space(section3_nodes);
			p17 = claim_element(section3_nodes, "P", {});
			var p17_nodes = children(p17);
			img0 = claim_element(p17_nodes, "IMG", { src: true, alt: true });
			p17_nodes.forEach(detach);
			t62 = claim_space(section3_nodes);
			p18 = claim_element(section3_nodes, "P", {});
			var p18_nodes = children(p18);
			t63 = claim_text(p18_nodes, "Yup. This is indeed a bug! 🐛");
			p18_nodes.forEach(detach);
			section3_nodes.forEach(detach);
			t64 = claim_space(nodes);
			section4 = claim_element(nodes, "SECTION", {});
			var section4_nodes = children(section4);
			h23 = claim_element(section4_nodes, "H2", {});
			var h23_nodes = children(h23);
			a13 = claim_element(h23_nodes, "A", { href: true, id: true });
			var a13_nodes = children(a13);
			t65 = claim_text(a13_nodes, "Investigating the bug");
			a13_nodes.forEach(detach);
			h23_nodes.forEach(detach);
			t66 = claim_space(section4_nodes);
			p19 = claim_element(section4_nodes, "P", {});
			var p19_nodes = children(p19);
			t67 = claim_text(p19_nodes, "It's amazing that the issue author tracked down the regression behavior of this issue, stating that it started happening since 3.7. Probably because the author just upgraded Svelte from ");
			t68 = claim_text(p19_nodes, " 3.7, or maybe he tried every versions to figure out whether it is regression bug or a undiscovered bug. Anyway, kudos to the issue author! 💪 💪");
			p19_nodes.forEach(detach);
			t69 = claim_space(section4_nodes);
			p20 = claim_element(section4_nodes, "P", {});
			var p20_nodes = children(p20);
			t70 = claim_text(p20_nodes, "Most open source projects maintain a change log file, usually named ");
			code4 = claim_element(p20_nodes, "CODE", {});
			var code4_nodes = children(code4);
			t71 = claim_text(code4_nodes, "CHANGELOG.md");
			code4_nodes.forEach(detach);
			t72 = claim_text(p20_nodes, " located at the root of the project folder, so that you can figured out what's added / removed / updated in each version.");
			p20_nodes.forEach(detach);
			t73 = claim_space(section4_nodes);
			p21 = claim_element(section4_nodes, "P", {});
			var p21_nodes = children(p21);
			t74 = claim_text(p21_nodes, "You can find Svelte's ");
			a14 = claim_element(p21_nodes, "A", { href: true, rel: true });
			var a14_nodes = children(a14);
			code5 = claim_element(a14_nodes, "CODE", {});
			var code5_nodes = children(code5);
			t75 = claim_text(code5_nodes, "CHANGELOG.md");
			code5_nodes.forEach(detach);
			t76 = claim_text(a14_nodes, " here");
			a14_nodes.forEach(detach);
			t77 = claim_text(p21_nodes, ".");
			p21_nodes.forEach(detach);
			t78 = claim_space(section4_nodes);
			p22 = claim_element(section4_nodes, "P", {});
			var p22_nodes = children(p22);
			img1 = claim_element(p22_nodes, "IMG", { src: true, alt: true });
			p22_nodes.forEach(detach);
			t79 = claim_space(section4_nodes);
			p23 = claim_element(section4_nodes, "P", {});
			var p23_nodes = children(p23);
			t80 = claim_text(p23_nodes, "From the changelog, the most relevant commits seemed to be ");
			strong5 = claim_element(p23_nodes, "STRONG", {});
			var strong5_nodes = children(strong5);
			t81 = claim_text(strong5_nodes, "\"Remount HTML tags correctly (");
			a15 = claim_element(strong5_nodes, "A", { href: true, rel: true });
			var a15_nodes = children(a15);
			t82 = claim_text(a15_nodes, "#3329");
			a15_nodes.forEach(detach);
			t83 = claim_text(strong5_nodes, ")\"");
			strong5_nodes.forEach(detach);
			p23_nodes.forEach(detach);
			t84 = claim_space(section4_nodes);
			p24 = claim_element(section4_nodes, "P", {});
			var p24_nodes = children(p24);
			t85 = claim_text(p24_nodes, "Reading through the PR, it seemed that ");
			a16 = claim_element(p24_nodes, "A", { href: true, rel: true });
			var a16_nodes = children(a16);
			t86 = claim_text(a16_nodes, "#3329");
			a16_nodes.forEach(detach);
			t87 = claim_text(p24_nodes, " was when ");
			code6 = claim_element(p24_nodes, "CODE", {});
			var code6_nodes = children(code6);
			t88 = claim_text(code6_nodes, "HtmlTag");
			code6_nodes.forEach(detach);
			t89 = claim_text(p24_nodes, " is first introduced!");
			p24_nodes.forEach(detach);
			section4_nodes.forEach(detach);
			t90 = claim_space(nodes);
			section5 = claim_element(nodes, "SECTION", {});
			var section5_nodes = children(section5);
			h3 = claim_element(section5_nodes, "H3", {});
			var h3_nodes = children(h3);
			a17 = claim_element(h3_nodes, "A", { href: true, id: true });
			var a17_nodes = children(a17);
			t91 = claim_text(a17_nodes, "HtmlTag");
			a17_nodes.forEach(detach);
			h3_nodes.forEach(detach);
			t92 = claim_space(section5_nodes);
			p25 = claim_element(section5_nodes, "P", {});
			var p25_nodes = children(p25);
			a18 = claim_element(p25_nodes, "A", { href: true, rel: true });
			var a18_nodes = children(a18);
			code7 = claim_element(a18_nodes, "CODE", {});
			var code7_nodes = children(code7);
			t93 = claim_text(code7_nodes, "HtmlTag");
			code7_nodes.forEach(detach);
			a18_nodes.forEach(detach);
			t94 = claim_text(p25_nodes, " is a helper class that helps Svelte manage raw ");
			a19 = claim_element(p25_nodes, "A", { href: true, rel: true });
			var a19_nodes = children(a19);
			code8 = claim_element(a19_nodes, "CODE", {});
			var code8_nodes = children(code8);
			t95 = claim_text(code8_nodes, "{@html ...}");
			code8_nodes.forEach(detach);
			t96 = claim_text(a19_nodes, " tag");
			a19_nodes.forEach(detach);
			t97 = claim_text(p25_nodes, ".");
			p25_nodes.forEach(detach);
			t98 = claim_space(section5_nodes);
			pre0 = claim_element(section5_nodes, "PRE", { class: true });
			var pre0_nodes = children(pre0);
			pre0_nodes.forEach(detach);
			t99 = claim_space(section5_nodes);
			p26 = claim_element(section5_nodes, "P", {});
			var p26_nodes = children(p26);
			t100 = claim_text(p26_nodes, "The HtmlTag instance provides the ");
			code9 = claim_element(p26_nodes, "CODE", {});
			var code9_nodes = children(code9);
			t101 = claim_text(code9_nodes, "m");
			code9_nodes.forEach(detach);
			t102 = claim_text(p26_nodes, ", ");
			code10 = claim_element(p26_nodes, "CODE", {});
			var code10_nodes = children(code10);
			t103 = claim_text(code10_nodes, "p");
			code10_nodes.forEach(detach);
			t104 = claim_text(p26_nodes, ", ");
			code11 = claim_element(p26_nodes, "CODE", {});
			var code11_nodes = children(code11);
			t105 = claim_text(code11_nodes, "d");
			code11_nodes.forEach(detach);
			t106 = claim_text(p26_nodes, " method, and it will maintain the HTML elements created through the HTML string.");
			p26_nodes.forEach(detach);
			t107 = claim_space(section5_nodes);
			p27 = claim_element(section5_nodes, "P", {});
			var p27_nodes = children(p27);
			t108 = claim_text(p27_nodes, "So, before v3.7, ");
			code12 = claim_element(p27_nodes, "CODE", {});
			var code12_nodes = children(code12);
			t109 = claim_text(code12_nodes, "{@html ...}");
			code12_nodes.forEach(detach);
			t110 = claim_text(p27_nodes, " was handled differently, and from the PR, I assume it was more buggy than the current implementation, albeit getting the case reported by this issue #5012 right. So, there's no reverting back, nor taking the implementation pre-v3.7 as a reference to figure this bug out.");
			p27_nodes.forEach(detach);
			t111 = claim_space(section5_nodes);
			p28 = claim_element(section5_nodes, "P", {});
			var p28_nodes = children(p28);
			t112 = claim_text(p28_nodes, "Reading through the implementation of the ");
			code13 = claim_element(p28_nodes, "CODE", {});
			var code13_nodes = children(code13);
			t113 = claim_text(code13_nodes, "HtmlTag");
			code13_nodes.forEach(detach);
			t114 = claim_text(p28_nodes, ", it seemed that the ");
			code14 = claim_element(p28_nodes, "CODE", {});
			var code14_nodes = children(code14);
			t115 = claim_text(code14_nodes, "anchor");
			code14_nodes.forEach(detach);
			t116 = claim_text(p28_nodes, " is a key to this issue.");
			p28_nodes.forEach(detach);
			t117 = claim_space(section5_nodes);
			p29 = claim_element(section5_nodes, "P", {});
			var p29_nodes = children(p29);
			code15 = claim_element(p29_nodes, "CODE", {});
			var code15_nodes = children(code15);
			t118 = claim_text(code15_nodes, "HtmlTag");
			code15_nodes.forEach(detach);
			t119 = claim_text(p29_nodes, " uses ");
			a20 = claim_element(p29_nodes, "A", { href: true, rel: true });
			var a20_nodes = children(a20);
			code16 = claim_element(a20_nodes, "CODE", {});
			var code16_nodes = children(code16);
			t120 = claim_text(code16_nodes, "insertBefore");
			code16_nodes.forEach(detach);
			a20_nodes.forEach(detach);
			t121 = claim_text(p29_nodes, " to insert HTML elements into the DOM. There's a nullable 2nd argument for ");
			code17 = claim_element(p29_nodes, "CODE", {});
			var code17_nodes = children(code17);
			t122 = claim_text(code17_nodes, "insertBefore");
			code17_nodes.forEach(detach);
			t123 = claim_text(p29_nodes, ", if it is ");
			code18 = claim_element(p29_nodes, "CODE", {});
			var code18_nodes = children(code18);
			t124 = claim_text(code18_nodes, "null");
			code18_nodes.forEach(detach);
			t125 = claim_text(p29_nodes, ", the element will be inserted at the end of the parent.");
			p29_nodes.forEach(detach);
			t126 = claim_space(section5_nodes);
			p30 = claim_element(section5_nodes, "P", {});
			var p30_nodes = children(p30);
			t127 = claim_text(p30_nodes, "In this case, the ");
			code19 = claim_element(p30_nodes, "CODE", {});
			var code19_nodes = children(code19);
			t128 = claim_text(code19_nodes, "anchor");
			code19_nodes.forEach(detach);
			t129 = claim_text(p30_nodes, " is indeed ");
			code20 = claim_element(p30_nodes, "CODE", {});
			var code20_nodes = children(code20);
			t130 = claim_text(code20_nodes, "null");
			code20_nodes.forEach(detach);
			t131 = claim_text(p30_nodes, ", so when there's a change in the HTML content, the previous HTML elements were removed and the new HTML elements were inserted at the end of the parent.");
			p30_nodes.forEach(detach);
			t132 = claim_space(section5_nodes);
			pre1 = claim_element(section5_nodes, "PRE", { class: true });
			var pre1_nodes = children(pre1);
			pre1_nodes.forEach(detach);
			t133 = claim_space(section5_nodes);
			p31 = claim_element(section5_nodes, "P", {});
			var p31_nodes = children(p31);
			strong6 = claim_element(p31_nodes, "STRONG", {});
			var strong6_nodes = children(strong6);
			t134 = claim_text(strong6_nodes, "Why doesn't the ");
			code21 = claim_element(strong6_nodes, "CODE", {});
			var code21_nodes = children(code21);
			t135 = claim_text(code21_nodes, "{@html content}");
			code21_nodes.forEach(detach);
			t136 = claim_text(strong6_nodes, " added at the end of the parent in the initial render?");
			strong6_nodes.forEach(detach);
			t137 = claim_text(p31_nodes, " Well, the elements are added in order during mounting. The HTML elements from ");
			code22 = claim_element(p31_nodes, "CODE", {});
			var code22_nodes = children(code22);
			t138 = claim_text(code22_nodes, "HtmlTag");
			code22_nodes.forEach(detach);
			t139 = claim_text(p31_nodes, " was added at the end of the parent, followed by the ");
			code23 = claim_element(p31_nodes, "CODE", {});
			var code23_nodes = children(code23);
			t140 = claim_text(code23_nodes, "<p>This line should be last</p>");
			code23_nodes.forEach(detach);
			t141 = claim_text(p31_nodes, ".");
			p31_nodes.forEach(detach);
			t142 = claim_space(section5_nodes);
			p32 = claim_element(section5_nodes, "P", {});
			var p32_nodes = children(p32);
			t143 = claim_text(p32_nodes, "The ");
			code24 = claim_element(p32_nodes, "CODE", {});
			var code24_nodes = children(code24);
			t144 = claim_text(code24_nodes, "anchor");
			code24_nodes.forEach(detach);
			t145 = claim_text(p32_nodes, " is an argument to the ");
			code25 = claim_element(p32_nodes, "CODE", {});
			var code25_nodes = children(code25);
			t146 = claim_text(code25_nodes, "HtmlTag");
			code25_nodes.forEach(detach);
			t147 = claim_text(p32_nodes, " constructor, so one can safely assume that it is not always ");
			code26 = claim_element(p32_nodes, "CODE", {});
			var code26_nodes = children(code26);
			t148 = claim_text(code26_nodes, "null");
			code26_nodes.forEach(detach);
			t149 = claim_text(p32_nodes, ".");
			p32_nodes.forEach(detach);
			t150 = claim_space(section5_nodes);
			p33 = claim_element(section5_nodes, "P", {});
			var p33_nodes = children(p33);
			t151 = claim_text(p33_nodes, "So, I tried out using ");
			code27 = claim_element(p33_nodes, "CODE", {});
			var code27_nodes = children(code27);
			t152 = claim_text(code27_nodes, "{@html content}");
			code27_nodes.forEach(detach);
			t153 = claim_text(p33_nodes, " in various ways, to figure out what may be an anchor for the ");
			code28 = claim_element(p33_nodes, "CODE", {});
			var code28_nodes = children(code28);
			t154 = claim_text(code28_nodes, "HtmlTag");
			code28_nodes.forEach(detach);
			p33_nodes.forEach(detach);
			t155 = claim_space(section5_nodes);
			p34 = claim_element(section5_nodes, "P", {});
			var p34_nodes = children(p34);
			strong7 = claim_element(p34_nodes, "STRONG", {});
			var strong7_nodes = children(strong7);
			t156 = claim_text(strong7_nodes, "Repro #1");
			strong7_nodes.forEach(detach);
			t157 = claim_text(p34_nodes, " (");
			a21 = claim_element(p34_nodes, "A", { href: true, rel: true });
			var a21_nodes = children(a21);
			t158 = claim_text(a21_nodes, "REPL");
			a21_nodes.forEach(detach);
			t159 = claim_text(p34_nodes, ")");
			p34_nodes.forEach(detach);
			t160 = claim_space(section5_nodes);
			pre2 = claim_element(section5_nodes, "PRE", { class: true });
			var pre2_nodes = children(pre2);
			pre2_nodes.forEach(detach);
			t161 = claim_space(section5_nodes);
			pre3 = claim_element(section5_nodes, "PRE", { class: true });
			var pre3_nodes = children(pre3);
			pre3_nodes.forEach(detach);
			t162 = claim_space(section5_nodes);
			p35 = claim_element(section5_nodes, "P", {});
			var p35_nodes = children(p35);
			t163 = claim_text(p35_nodes, "In this case, the ");
			code29 = claim_element(p35_nodes, "CODE", {});
			var code29_nodes = children(code29);
			t164 = claim_text(code29_nodes, "<button />");
			code29_nodes.forEach(detach);
			t165 = claim_text(p35_nodes, " element turns out to be the anchor, which totally make sense, as the html content should be inserted before ");
			code30 = claim_element(p35_nodes, "CODE", {});
			var code30_nodes = children(code30);
			t166 = claim_text(code30_nodes, "<button />");
			code30_nodes.forEach(detach);
			t167 = claim_text(p35_nodes, ".");
			p35_nodes.forEach(detach);
			t168 = claim_space(section5_nodes);
			p36 = claim_element(section5_nodes, "P", {});
			var p36_nodes = children(p36);
			t169 = claim_text(p36_nodes, "So, it seemed like the anchor is the next element right after ");
			code31 = claim_element(p36_nodes, "CODE", {});
			var code31_nodes = children(code31);
			t170 = claim_text(code31_nodes, "{@html ...}");
			code31_nodes.forEach(detach);
			t171 = claim_text(p36_nodes, ". 🤔");
			p36_nodes.forEach(detach);
			t172 = claim_space(section5_nodes);
			p37 = claim_element(section5_nodes, "P", {});
			var p37_nodes = children(p37);
			strong8 = claim_element(p37_nodes, "STRONG", {});
			var strong8_nodes = children(strong8);
			t173 = claim_text(strong8_nodes, "Repro #2");
			strong8_nodes.forEach(detach);
			t174 = claim_text(p37_nodes, " (");
			a22 = claim_element(p37_nodes, "A", { href: true, rel: true });
			var a22_nodes = children(a22);
			t175 = claim_text(a22_nodes, "REPL");
			a22_nodes.forEach(detach);
			t176 = claim_text(p37_nodes, ")");
			p37_nodes.forEach(detach);
			t177 = claim_space(section5_nodes);
			pre4 = claim_element(section5_nodes, "PRE", { class: true });
			var pre4_nodes = children(pre4);
			pre4_nodes.forEach(detach);
			t178 = claim_space(section5_nodes);
			pre5 = claim_element(section5_nodes, "PRE", { class: true });
			var pre5_nodes = children(pre5);
			pre5_nodes.forEach(detach);
			t179 = claim_space(section5_nodes);
			p38 = claim_element(section5_nodes, "P", {});
			var p38_nodes = children(p38);
			t180 = claim_text(p38_nodes, "If the next element right after ");
			code32 = claim_element(p38_nodes, "CODE", {});
			var code32_nodes = children(code32);
			t181 = claim_text(code32_nodes, "{@html ...}");
			code32_nodes.forEach(detach);
			t182 = claim_text(p38_nodes, " is a component, then Svelte will insert a empty ");
			a23 = claim_element(p38_nodes, "A", { href: true, rel: true });
			var a23_nodes = children(a23);
			t183 = claim_text(a23_nodes, "Text");
			a23_nodes.forEach(detach);
			t184 = claim_text(p38_nodes, " node in between ");
			code33 = claim_element(p38_nodes, "CODE", {});
			var code33_nodes = children(code33);
			t185 = claim_text(code33_nodes, "{@html ...}");
			code33_nodes.forEach(detach);
			t186 = claim_text(p38_nodes, " and the component, and the anchor is the empty Text node.");
			p38_nodes.forEach(detach);
			t187 = claim_space(section5_nodes);
			p39 = claim_element(section5_nodes, "P", {});
			var p39_nodes = children(p39);
			t188 = claim_text(p39_nodes, "Well, that make sense too, because we can't see what's inside the component, we can't get the first element rendered in the component as the anchor. So, an extra empty Text node is used for anchoring.");
			p39_nodes.forEach(detach);
			t189 = claim_space(section5_nodes);
			p40 = claim_element(section5_nodes, "P", {});
			var p40_nodes = children(p40);
			t190 = claim_text(p40_nodes, "So, it seemed like the anchor for the ");
			code34 = claim_element(p40_nodes, "CODE", {});
			var code34_nodes = children(code34);
			t191 = claim_text(code34_nodes, "HtmlTag");
			code34_nodes.forEach(detach);
			t192 = claim_text(p40_nodes, " depends on the next element, and the ");
			code35 = claim_element(p40_nodes, "CODE", {});
			var code35_nodes = children(code35);
			t193 = claim_text(code35_nodes, "HtmlTag");
			code35_nodes.forEach(detach);
			t194 = claim_text(p40_nodes, " itself is the last element, then the anchor would be ");
			code36 = claim_element(p40_nodes, "CODE", {});
			var code36_nodes = children(code36);
			t195 = claim_text(code36_nodes, "null");
			code36_nodes.forEach(detach);
			t196 = claim_text(p40_nodes, ".");
			p40_nodes.forEach(detach);
			t197 = claim_space(section5_nodes);
			p41 = claim_element(section5_nodes, "P", {});
			var p41_nodes = children(p41);
			t198 = claim_text(p41_nodes, "This seemed fine in most cases, as in if the ");
			code37 = claim_element(p41_nodes, "CODE", {});
			var code37_nodes = children(code37);
			t199 = claim_text(code37_nodes, "HtmlTag");
			code37_nodes.forEach(detach);
			t200 = claim_text(p41_nodes, " is indeed the last element of its parent, then, we don't need an anchor. Adding and updating ");
			code38 = claim_element(p41_nodes, "CODE", {});
			var code38_nodes = children(code38);
			t201 = claim_text(code38_nodes, "HtmlTag");
			code38_nodes.forEach(detach);
			t202 = claim_text(p41_nodes, " will always add HTML elements at the end of its parent.");
			p41_nodes.forEach(detach);
			t203 = claim_space(section5_nodes);
			p42 = claim_element(section5_nodes, "P", {});
			var p42_nodes = children(p42);
			t204 = claim_text(p42_nodes, "However, I figured there are 2 edge cases that this assumption may not be true.");
			p42_nodes.forEach(detach);
			t205 = claim_space(section5_nodes);
			p43 = claim_element(section5_nodes, "P", {});
			var p43_nodes = children(p43);
			t206 = claim_text(p43_nodes, "The 1st edge case is the one reported in the issue #5012, if the ");
			code39 = claim_element(p43_nodes, "CODE", {});
			var code39_nodes = children(code39);
			t207 = claim_text(code39_nodes, "{@html ...}");
			code39_nodes.forEach(detach);
			t208 = claim_text(p43_nodes, " is the last element within a slot. As we can't tell how the slot would be used in the component, it may not be the last element of it's parent.");
			p43_nodes.forEach(detach);
			t209 = claim_space(section5_nodes);
			pre6 = claim_element(section5_nodes, "PRE", { class: true });
			var pre6_nodes = children(pre6);
			pre6_nodes.forEach(detach);
			t210 = claim_space(section5_nodes);
			p44 = claim_element(section5_nodes, "P", {});
			var p44_nodes = children(p44);
			t211 = claim_text(p44_nodes, "The 2nd edge case is that ");
			code40 = claim_element(p44_nodes, "CODE", {});
			var code40_nodes = children(code40);
			t212 = claim_text(code40_nodes, "{@html ...}");
			code40_nodes.forEach(detach);
			t213 = claim_text(p44_nodes, " is the last element, but it is a the root of the Component.");
			p44_nodes.forEach(detach);
			t214 = claim_space(section5_nodes);
			pre7 = claim_element(section5_nodes, "PRE", { class: true });
			var pre7_nodes = children(pre7);
			pre7_nodes.forEach(detach);
			t215 = claim_space(section5_nodes);
			p45 = claim_element(section5_nodes, "P", {});
			var p45_nodes = children(p45);
			a24 = claim_element(p45_nodes, "A", { href: true, rel: true });
			var a24_nodes = children(a24);
			t216 = claim_text(a24_nodes, "REPL");
			a24_nodes.forEach(detach);
			p45_nodes.forEach(detach);
			t217 = claim_space(section5_nodes);
			p46 = claim_element(section5_nodes, "P", {});
			var p46_nodes = children(p46);
			t218 = claim_text(p46_nodes, "As you can see in this contrived example, we can't assume where the component is being used by its parent, so, even it seemed to be the last element in the component, it may not be the case in the parent component.");
			p46_nodes.forEach(detach);
			section5_nodes.forEach(detach);
			t219 = claim_space(nodes);
			section6 = claim_element(nodes, "SECTION", {});
			var section6_nodes = children(section6);
			h24 = claim_element(section6_nodes, "H2", {});
			var h24_nodes = children(h24);
			a25 = claim_element(h24_nodes, "A", { href: true, id: true });
			var a25_nodes = children(a25);
			t220 = claim_text(a25_nodes, "Fixing the bug");
			a25_nodes.forEach(detach);
			h24_nodes.forEach(detach);
			t221 = claim_space(section6_nodes);
			p47 = claim_element(section6_nodes, "P", {});
			var p47_nodes = children(p47);
			t222 = claim_text(p47_nodes, "Once we figured out the cause of the bug, the fix is much simpler.");
			p47_nodes.forEach(detach);
			t223 = claim_space(section6_nodes);
			p48 = claim_element(section6_nodes, "P", {});
			var p48_nodes = children(p48);
			t224 = claim_text(p48_nodes, "Just as how Svelte will add a empty Text node as an anchor if the next element is a component, we are going to add the same anchor if");
			p48_nodes.forEach(detach);
			t225 = claim_space(section6_nodes);
			ul3 = claim_element(section6_nodes, "UL", {});
			var ul3_nodes = children(ul3);
			li6 = claim_element(ul3_nodes, "LI", {});
			var li6_nodes = children(li6);
			t226 = claim_text(li6_nodes, "the ");
			code41 = claim_element(li6_nodes, "CODE", {});
			var code41_nodes = children(code41);
			t227 = claim_text(code41_nodes, "{@html ...}");
			code41_nodes.forEach(detach);
			t228 = claim_text(li6_nodes, " has no next element, and");
			li6_nodes.forEach(detach);
			t229 = claim_space(ul3_nodes);
			li9 = claim_element(ul3_nodes, "LI", {});
			var li9_nodes = children(li9);
			t230 = claim_text(li9_nodes, "either");
			ul2 = claim_element(li9_nodes, "UL", {});
			var ul2_nodes = children(ul2);
			li7 = claim_element(ul2_nodes, "LI", {});
			var li7_nodes = children(li7);
			code42 = claim_element(li7_nodes, "CODE", {});
			var code42_nodes = children(code42);
			t231 = claim_text(code42_nodes, "{@html ...}");
			code42_nodes.forEach(detach);
			t232 = claim_text(li7_nodes, " is at the root of a slot, or");
			li7_nodes.forEach(detach);
			t233 = claim_space(ul2_nodes);
			li8 = claim_element(ul2_nodes, "LI", {});
			var li8_nodes = children(li8);
			code43 = claim_element(li8_nodes, "CODE", {});
			var code43_nodes = children(code43);
			t234 = claim_text(code43_nodes, "{@html ...}");
			code43_nodes.forEach(detach);
			t235 = claim_text(li8_nodes, " is at the root of a component.");
			li8_nodes.forEach(detach);
			ul2_nodes.forEach(detach);
			li9_nodes.forEach(detach);
			ul3_nodes.forEach(detach);
			t236 = claim_space(section6_nodes);
			p49 = claim_element(section6_nodes, "P", {});
			var p49_nodes = children(p49);
			t237 = claim_text(p49_nodes, "I know my way in the Svelte repo, good enough to know where to add this extra condition.");
			p49_nodes.forEach(detach);
			t238 = claim_space(section6_nodes);
			p50 = claim_element(section6_nodes, "P", {});
			var p50_nodes = children(p50);
			t239 = claim_text(p50_nodes, "But if you are new, you can try global search the keyword ");
			code44 = claim_element(p50_nodes, "CODE", {});
			var code44_nodes = children(code44);
			t240 = claim_text(code44_nodes, "html_anchor");
			code44_nodes.forEach(detach);
			t241 = claim_text(p50_nodes, ", the variable name of the anchor added by Svelte, it should lead you to it.");
			p50_nodes.forEach(detach);
			t242 = claim_space(section6_nodes);
			pre8 = claim_element(section6_nodes, "PRE", { class: true });
			var pre8_nodes = children(pre8);
			pre8_nodes.forEach(detach);
			t243 = claim_space(section6_nodes);
			p51 = claim_element(section6_nodes, "P", {});
			var p51_nodes = children(p51);
			a26 = claim_element(p51_nodes, "A", { href: true, rel: true });
			var a26_nodes = children(a26);
			t244 = claim_text(a26_nodes, "Link to Github");
			a26_nodes.forEach(detach);
			p51_nodes.forEach(detach);
			t245 = claim_space(section6_nodes);
			p52 = claim_element(section6_nodes, "P", {});
			var p52_nodes = children(p52);
			t246 = claim_text(p52_nodes, "Here we see that the condition of adding an anchor is that if");
			p52_nodes.forEach(detach);
			t247 = claim_space(section6_nodes);
			ul4 = claim_element(section6_nodes, "UL", {});
			var ul4_nodes = children(ul4);
			li10 = claim_element(ul4_nodes, "LI", {});
			var li10_nodes = children(li10);
			t248 = claim_text(li10_nodes, "it is in the ");
			code45 = claim_element(li10_nodes, "CODE", {});
			var code45_nodes = children(code45);
			t249 = claim_text(code45_nodes, "<svelte:head>");
			code45_nodes.forEach(detach);
			t250 = claim_text(li10_nodes, ", or");
			li10_nodes.forEach(detach);
			t251 = claim_space(ul4_nodes);
			li11 = claim_element(ul4_nodes, "LI", {});
			var li11_nodes = children(li11);
			t252 = claim_text(li11_nodes, "the next element is not a dom element, (which could be a component, or logic blocks ");
			em = claim_element(li11_nodes, "EM", {});
			var em_nodes = children(em);
			t253 = claim_text(em_nodes, "(oh why didn't I think about this case too?)");
			em_nodes.forEach(detach);
			t254 = claim_text(li11_nodes, ")");
			li11_nodes.forEach(detach);
			ul4_nodes.forEach(detach);
			t255 = claim_space(section6_nodes);
			pre9 = claim_element(section6_nodes, "PRE", { class: true });
			var pre9_nodes = children(pre9);
			pre9_nodes.forEach(detach);
			t256 = claim_space(section6_nodes);
			p53 = claim_element(section6_nodes, "P", {});
			var p53_nodes = children(p53);
			t257 = claim_text(p53_nodes, "So, we check if");
			p53_nodes.forEach(detach);
			t258 = claim_space(section6_nodes);
			ul5 = claim_element(section6_nodes, "UL", {});
			var ul5_nodes = children(ul5);
			li12 = claim_element(ul5_nodes, "LI", {});
			var li12_nodes = children(li12);
			t259 = claim_text(li12_nodes, "it has a parent (if it is at the root of component), or");
			li12_nodes.forEach(detach);
			t260 = claim_space(ul5_nodes);
			li13 = claim_element(ul5_nodes, "LI", {});
			var li13_nodes = children(li13);
			t261 = claim_text(li13_nodes, "if the parent is not an element (it could be within a slot, or a logic block ");
			code46 = claim_element(li13_nodes, "CODE", {});
			var code46_nodes = children(code46);
			t262 = claim_text(code46_nodes, "{#if}");
			code46_nodes.forEach(detach);
			t263 = claim_text(li13_nodes, ")");
			li13_nodes.forEach(detach);
			ul5_nodes.forEach(detach);
			t264 = claim_space(section6_nodes);
			p54 = claim_element(section6_nodes, "P", {});
			var p54_nodes = children(p54);
			t265 = claim_text(p54_nodes, "For the test case, I used to 2 edge case examples, try to simulate some clicks, and make sure that the ");
			code47 = claim_element(p54_nodes, "CODE", {});
			var code47_nodes = children(code47);
			t266 = claim_text(code47_nodes, "{@html ...}");
			code47_nodes.forEach(detach);
			t267 = claim_text(p54_nodes, " stay in place even after the HTML content changes.");
			p54_nodes.forEach(detach);
			t268 = claim_space(section6_nodes);
			pre10 = claim_element(section6_nodes, "PRE", { class: true });
			var pre10_nodes = children(pre10);
			pre10_nodes.forEach(detach);
			t269 = claim_space(section6_nodes);
			p55 = claim_element(section6_nodes, "P", {});
			var p55_nodes = children(p55);
			t270 = claim_text(p55_nodes, "You can read the ");
			a27 = claim_element(p55_nodes, "A", { href: true, rel: true });
			var a27_nodes = children(a27);
			t271 = claim_text(a27_nodes, "Pull Request #5061");
			a27_nodes.forEach(detach);
			t272 = claim_text(p55_nodes, " to see all the test cases written up.");
			p55_nodes.forEach(detach);
			t273 = claim_space(section6_nodes);
			hr = claim_element(section6_nodes, "HR", {});
			t274 = claim_space(section6_nodes);
			p56 = claim_element(section6_nodes, "P", {});
			var p56_nodes = children(p56);
			t275 = claim_text(p56_nodes, "If you wish to learn more about Svelte, ");
			a28 = claim_element(p56_nodes, "A", { href: true, rel: true });
			var a28_nodes = children(a28);
			t276 = claim_text(a28_nodes, "follow me on Twitter");
			a28_nodes.forEach(detach);
			t277 = claim_text(p56_nodes, ".");
			p56_nodes.forEach(detach);
			t278 = claim_space(section6_nodes);
			p57 = claim_element(section6_nodes, "P", {});
			var p57_nodes = children(p57);
			t279 = claim_text(p57_nodes, "If you have anything unclear about this article, find me on ");
			a29 = claim_element(p57_nodes, "A", { href: true, rel: true });
			var a29_nodes = children(a29);
			t280 = claim_text(a29_nodes, "Twitter");
			a29_nodes.forEach(detach);
			t281 = claim_text(p57_nodes, " too!");
			p57_nodes.forEach(detach);
			section6_nodes.forEach(detach);
			this.h();
		},
		h() {
			attr(a0, "href", "#background");
			attr(a1, "href", "#the-bug");
			attr(a2, "href", "#verifying-the-bug");
			attr(a3, "href", "#investigating-the-bug");
			attr(a4, "href", "#htmltag");
			attr(a5, "href", "#fixing-the-bug");
			attr(ul1, "class", "sitemap");
			attr(ul1, "id", "sitemap");
			attr(ul1, "role", "navigation");
			attr(ul1, "aria-label", "Table of Contents");
			attr(a6, "href", "#background");
			attr(a6, "id", "background");
			attr(a7, "href", "/contributing-to-svelte-fixing-issue-4392");
			attr(a8, "href", "https://github.com/sveltejs/svelte/issues/5012");
			attr(a8, "rel", "nofollow");
			attr(a9, "href", "#the-bug");
			attr(a9, "id", "the-bug");
			html_tag = new HtmlTag(t20);
			attr(a10, "href", "https://github.com/sveltejs/svelte/issues/5012");
			attr(a10, "rel", "nofollow");
			attr(p2, "class", "svelte-t9d7ix");
			html_tag_1 = new HtmlTag(t24);
			attr(p3, "class", "svelte-t9d7ix");
			attr(p4, "class", "svelte-t9d7ix");
			attr(a11, "href", "https://svelte.dev/repl/1f9da40bca4b44a089041e826648de2f");
			attr(a11, "rel", "nofollow");
			attr(p5, "class", "svelte-t9d7ix");
			attr(p6, "class", "svelte-t9d7ix");
			attr(p7, "class", "svelte-t9d7ix");
			attr(p8, "class", "svelte-t9d7ix");
			attr(p9, "class", "svelte-t9d7ix");
			attr(p10, "class", "svelte-t9d7ix");
			attr(p11, "class", "svelte-t9d7ix");
			attr(p12, "class", "svelte-t9d7ix");
			attr(p13, "class", "svelte-t9d7ix");
			attr(div, "class", "issue svelte-t9d7ix");
			attr(a12, "href", "#verifying-the-bug");
			attr(a12, "id", "verifying-the-bug");
			if (img0.src !== (img0_src_value = __build_img__0)) attr(img0, "src", img0_src_value);
			attr(img0, "alt", "screen recording of the bug behavior");
			attr(a13, "href", "#investigating-the-bug");
			attr(a13, "id", "investigating-the-bug");
			html_tag_2 = new HtmlTag(t68);
			attr(a14, "href", "https://github.com/sveltejs/svelte/blob/master/CHANGELOG.md");
			attr(a14, "rel", "nofollow");
			if (img1.src !== (img1_src_value = __build_img__1)) attr(img1, "src", img1_src_value);
			attr(img1, "alt", "changelog");
			attr(a15, "href", "https://github.com/sveltejs/svelte/pull/3329");
			attr(a15, "rel", "nofollow");
			attr(a16, "href", "https://github.com/sveltejs/svelte/pull/3329");
			attr(a16, "rel", "nofollow");
			attr(a17, "href", "#htmltag");
			attr(a17, "id", "htmltag");
			attr(a18, "href", "https://github.com/sveltejs/svelte/blob/1c39f6079f630ea549984b8e9eda1853cd5fa883/src/runtime/internal/dom.ts#L321-L362");
			attr(a18, "rel", "nofollow");
			attr(a19, "href", "https://svelte.dev/tutorial/html-tags");
			attr(a19, "rel", "nofollow");
			attr(pre0, "class", "language-js");
			attr(a20, "href", "https://developer.mozilla.org/en-US/docs/Web/API/Node/insertBefore");
			attr(a20, "rel", "nofollow");
			attr(pre1, "class", "language-html");
			attr(a21, "href", "https://svelte.dev/repl/f31104585d974a54a76808aa5d0820a8?version=3.23.2");
			attr(a21, "rel", "nofollow");
			attr(pre2, "class", "language-svelte");
			attr(pre3, "class", "language-js");
			attr(a22, "href", "https://svelte.dev/repl/d469d63a77c94998839603738ea97451?version=3.23.2");
			attr(a22, "rel", "nofollow");
			attr(pre4, "class", "language-svelte");
			attr(pre5, "class", "language-js");
			attr(a23, "href", "https://developer.mozilla.org/en-US/docs/Web/API/Text");
			attr(a23, "rel", "nofollow");
			attr(pre6, "class", "language-svelte");
			attr(pre7, "class", "language-svelte");
			attr(a24, "href", "https://svelte.dev/repl/9d19540d1eb249c3af519894e42f0f75?version=3.23.2");
			attr(a24, "rel", "nofollow");
			attr(a25, "href", "#fixing-the-bug");
			attr(a25, "id", "fixing-the-bug");
			attr(pre8, "class", "language-js");
			attr(a26, "href", "https://github.com/sveltejs/svelte/blob/1c39f6079f630ea549984b8e9eda1853cd5fa883/src/compiler/compile/render_dom/wrappers/RawMustacheTag.ts#L42");
			attr(a26, "rel", "nofollow");
			attr(pre9, "class", "language-js");
			attr(pre10, "class", "language-js");
			attr(a27, "href", "https://github.com/sveltejs/svelte/pull/5061");
			attr(a27, "rel", "nofollow");
			attr(a28, "href", "https://twitter.com/lihautan");
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
			append(ul1, li2);
			append(li2, a2);
			append(a2, t2);
			append(ul1, li3);
			append(li3, a3);
			append(a3, t3);
			append(ul1, ul0);
			append(ul0, li4);
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
			append(p0, t9);
			append(p0, a7);
			append(a7, t10);
			append(p0, t11);
			append(section1, t12);
			append(section1, p1);
			append(p1, t13);
			append(p1, a8);
			append(a8, t14);
			append(p1, t15);
			insert(target, t16, anchor);
			insert(target, section2, anchor);
			append(section2, h21);
			append(h21, a9);
			append(a9, t17);
			append(section2, t18);
			append(section2, div);
			append(div, p2);
			append(p2, strong0);
			append(strong0, t19);
			html_tag.m(raw0_value, strong0);
			append(strong0, t20);
			append(strong0, a10);
			append(a10, t21);
			append(div, t22);
			append(div, p3);
			append(p3, t23);
			html_tag_1.m(raw1_value, p3);
			append(p3, t24);
			append(div, t25);
			append(div, p4);
			append(p4, strong1);
			append(strong1, t26);
			append(div, t27);
			append(div, p5);
			append(p5, a11);
			append(a11, t28);
			append(div, t29);
			append(div, p6);
			append(p6, t30);
			append(div, t31);
			append(div, p7);
			append(p7, strong2);
			append(strong2, t32);
			append(div, t33);
			append(div, p8);
			append(p8, t34);
			append(div, t35);
			append(div, p9);
			append(p9, strong3);
			append(strong3, t36);
			append(div, t37);
			append(div, p10);
			append(p10, t38);
			append(div, t39);
			append(div, p11);
			append(p11, strong4);
			append(strong4, t40);
			append(div, t41);
			append(div, p12);
			append(p12, t42);
			append(div, t43);
			append(div, p13);
			append(p13, t44);
			append(p13, code0);
			append(code0, t45);
			append(p13, t46);
			append(p13, code1);
			append(code1, t47);
			append(p13, t48);
			insert(target, t49, anchor);
			insert(target, section3, anchor);
			append(section3, h22);
			append(h22, a12);
			append(a12, t50);
			append(section3, t51);
			append(section3, p14);
			append(p14, t52);
			append(section3, t53);
			append(section3, p15);
			append(p15, t54);
			append(section3, t55);
			append(section3, p16);
			append(p16, t56);
			append(p16, code2);
			append(code2, t57);
			append(p16, t58);
			append(p16, code3);
			append(code3, t59);
			append(p16, t60);
			append(section3, t61);
			append(section3, p17);
			append(p17, img0);
			append(section3, t62);
			append(section3, p18);
			append(p18, t63);
			insert(target, t64, anchor);
			insert(target, section4, anchor);
			append(section4, h23);
			append(h23, a13);
			append(a13, t65);
			append(section4, t66);
			append(section4, p19);
			append(p19, t67);
			html_tag_2.m(raw2_value, p19);
			append(p19, t68);
			append(section4, t69);
			append(section4, p20);
			append(p20, t70);
			append(p20, code4);
			append(code4, t71);
			append(p20, t72);
			append(section4, t73);
			append(section4, p21);
			append(p21, t74);
			append(p21, a14);
			append(a14, code5);
			append(code5, t75);
			append(a14, t76);
			append(p21, t77);
			append(section4, t78);
			append(section4, p22);
			append(p22, img1);
			append(section4, t79);
			append(section4, p23);
			append(p23, t80);
			append(p23, strong5);
			append(strong5, t81);
			append(strong5, a15);
			append(a15, t82);
			append(strong5, t83);
			append(section4, t84);
			append(section4, p24);
			append(p24, t85);
			append(p24, a16);
			append(a16, t86);
			append(p24, t87);
			append(p24, code6);
			append(code6, t88);
			append(p24, t89);
			insert(target, t90, anchor);
			insert(target, section5, anchor);
			append(section5, h3);
			append(h3, a17);
			append(a17, t91);
			append(section5, t92);
			append(section5, p25);
			append(p25, a18);
			append(a18, code7);
			append(code7, t93);
			append(p25, t94);
			append(p25, a19);
			append(a19, code8);
			append(code8, t95);
			append(a19, t96);
			append(p25, t97);
			append(section5, t98);
			append(section5, pre0);
			pre0.innerHTML = raw3_value;
			append(section5, t99);
			append(section5, p26);
			append(p26, t100);
			append(p26, code9);
			append(code9, t101);
			append(p26, t102);
			append(p26, code10);
			append(code10, t103);
			append(p26, t104);
			append(p26, code11);
			append(code11, t105);
			append(p26, t106);
			append(section5, t107);
			append(section5, p27);
			append(p27, t108);
			append(p27, code12);
			append(code12, t109);
			append(p27, t110);
			append(section5, t111);
			append(section5, p28);
			append(p28, t112);
			append(p28, code13);
			append(code13, t113);
			append(p28, t114);
			append(p28, code14);
			append(code14, t115);
			append(p28, t116);
			append(section5, t117);
			append(section5, p29);
			append(p29, code15);
			append(code15, t118);
			append(p29, t119);
			append(p29, a20);
			append(a20, code16);
			append(code16, t120);
			append(p29, t121);
			append(p29, code17);
			append(code17, t122);
			append(p29, t123);
			append(p29, code18);
			append(code18, t124);
			append(p29, t125);
			append(section5, t126);
			append(section5, p30);
			append(p30, t127);
			append(p30, code19);
			append(code19, t128);
			append(p30, t129);
			append(p30, code20);
			append(code20, t130);
			append(p30, t131);
			append(section5, t132);
			append(section5, pre1);
			pre1.innerHTML = raw4_value;
			append(section5, t133);
			append(section5, p31);
			append(p31, strong6);
			append(strong6, t134);
			append(strong6, code21);
			append(code21, t135);
			append(strong6, t136);
			append(p31, t137);
			append(p31, code22);
			append(code22, t138);
			append(p31, t139);
			append(p31, code23);
			append(code23, t140);
			append(p31, t141);
			append(section5, t142);
			append(section5, p32);
			append(p32, t143);
			append(p32, code24);
			append(code24, t144);
			append(p32, t145);
			append(p32, code25);
			append(code25, t146);
			append(p32, t147);
			append(p32, code26);
			append(code26, t148);
			append(p32, t149);
			append(section5, t150);
			append(section5, p33);
			append(p33, t151);
			append(p33, code27);
			append(code27, t152);
			append(p33, t153);
			append(p33, code28);
			append(code28, t154);
			append(section5, t155);
			append(section5, p34);
			append(p34, strong7);
			append(strong7, t156);
			append(p34, t157);
			append(p34, a21);
			append(a21, t158);
			append(p34, t159);
			append(section5, t160);
			append(section5, pre2);
			pre2.innerHTML = raw5_value;
			append(section5, t161);
			append(section5, pre3);
			pre3.innerHTML = raw6_value;
			append(section5, t162);
			append(section5, p35);
			append(p35, t163);
			append(p35, code29);
			append(code29, t164);
			append(p35, t165);
			append(p35, code30);
			append(code30, t166);
			append(p35, t167);
			append(section5, t168);
			append(section5, p36);
			append(p36, t169);
			append(p36, code31);
			append(code31, t170);
			append(p36, t171);
			append(section5, t172);
			append(section5, p37);
			append(p37, strong8);
			append(strong8, t173);
			append(p37, t174);
			append(p37, a22);
			append(a22, t175);
			append(p37, t176);
			append(section5, t177);
			append(section5, pre4);
			pre4.innerHTML = raw7_value;
			append(section5, t178);
			append(section5, pre5);
			pre5.innerHTML = raw8_value;
			append(section5, t179);
			append(section5, p38);
			append(p38, t180);
			append(p38, code32);
			append(code32, t181);
			append(p38, t182);
			append(p38, a23);
			append(a23, t183);
			append(p38, t184);
			append(p38, code33);
			append(code33, t185);
			append(p38, t186);
			append(section5, t187);
			append(section5, p39);
			append(p39, t188);
			append(section5, t189);
			append(section5, p40);
			append(p40, t190);
			append(p40, code34);
			append(code34, t191);
			append(p40, t192);
			append(p40, code35);
			append(code35, t193);
			append(p40, t194);
			append(p40, code36);
			append(code36, t195);
			append(p40, t196);
			append(section5, t197);
			append(section5, p41);
			append(p41, t198);
			append(p41, code37);
			append(code37, t199);
			append(p41, t200);
			append(p41, code38);
			append(code38, t201);
			append(p41, t202);
			append(section5, t203);
			append(section5, p42);
			append(p42, t204);
			append(section5, t205);
			append(section5, p43);
			append(p43, t206);
			append(p43, code39);
			append(code39, t207);
			append(p43, t208);
			append(section5, t209);
			append(section5, pre6);
			pre6.innerHTML = raw9_value;
			append(section5, t210);
			append(section5, p44);
			append(p44, t211);
			append(p44, code40);
			append(code40, t212);
			append(p44, t213);
			append(section5, t214);
			append(section5, pre7);
			pre7.innerHTML = raw10_value;
			append(section5, t215);
			append(section5, p45);
			append(p45, a24);
			append(a24, t216);
			append(section5, t217);
			append(section5, p46);
			append(p46, t218);
			insert(target, t219, anchor);
			insert(target, section6, anchor);
			append(section6, h24);
			append(h24, a25);
			append(a25, t220);
			append(section6, t221);
			append(section6, p47);
			append(p47, t222);
			append(section6, t223);
			append(section6, p48);
			append(p48, t224);
			append(section6, t225);
			append(section6, ul3);
			append(ul3, li6);
			append(li6, t226);
			append(li6, code41);
			append(code41, t227);
			append(li6, t228);
			append(ul3, t229);
			append(ul3, li9);
			append(li9, t230);
			append(li9, ul2);
			append(ul2, li7);
			append(li7, code42);
			append(code42, t231);
			append(li7, t232);
			append(ul2, t233);
			append(ul2, li8);
			append(li8, code43);
			append(code43, t234);
			append(li8, t235);
			append(section6, t236);
			append(section6, p49);
			append(p49, t237);
			append(section6, t238);
			append(section6, p50);
			append(p50, t239);
			append(p50, code44);
			append(code44, t240);
			append(p50, t241);
			append(section6, t242);
			append(section6, pre8);
			pre8.innerHTML = raw11_value;
			append(section6, t243);
			append(section6, p51);
			append(p51, a26);
			append(a26, t244);
			append(section6, t245);
			append(section6, p52);
			append(p52, t246);
			append(section6, t247);
			append(section6, ul4);
			append(ul4, li10);
			append(li10, t248);
			append(li10, code45);
			append(code45, t249);
			append(li10, t250);
			append(ul4, t251);
			append(ul4, li11);
			append(li11, t252);
			append(li11, em);
			append(em, t253);
			append(li11, t254);
			append(section6, t255);
			append(section6, pre9);
			pre9.innerHTML = raw12_value;
			append(section6, t256);
			append(section6, p53);
			append(p53, t257);
			append(section6, t258);
			append(section6, ul5);
			append(ul5, li12);
			append(li12, t259);
			append(ul5, t260);
			append(ul5, li13);
			append(li13, t261);
			append(li13, code46);
			append(code46, t262);
			append(li13, t263);
			append(section6, t264);
			append(section6, p54);
			append(p54, t265);
			append(p54, code47);
			append(code47, t266);
			append(p54, t267);
			append(section6, t268);
			append(section6, pre10);
			pre10.innerHTML = raw13_value;
			append(section6, t269);
			append(section6, p55);
			append(p55, t270);
			append(p55, a27);
			append(a27, t271);
			append(p55, t272);
			append(section6, t273);
			append(section6, hr);
			append(section6, t274);
			append(section6, p56);
			append(p56, t275);
			append(p56, a28);
			append(a28, t276);
			append(p56, t277);
			append(section6, t278);
			append(section6, p57);
			append(p57, t279);
			append(p57, a29);
			append(a29, t280);
			append(p57, t281);
		},
		p: noop,
		d(detaching) {
			if (detaching) detach(section0);
			if (detaching) detach(t6);
			if (detaching) detach(section1);
			if (detaching) detach(t16);
			if (detaching) detach(section2);
			if (detaching) detach(t49);
			if (detaching) detach(section3);
			if (detaching) detach(t64);
			if (detaching) detach(section4);
			if (detaching) detach(t90);
			if (detaching) detach(section5);
			if (detaching) detach(t219);
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
	"title": "Contributing to Svelte - Fixing issue #5012",
	"date": "2020-06-25T08:00:00Z",
	"tags": ["Svelte", "JavaScript", "Open Source"],
	"series": "Contributing to Svelte",
	"description": "Svelte issue #5012 - Slot containing only {@html value} renders in wrong place on update",
	"slug": "contributing-to-svelte-fixing-issue-5012",
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
