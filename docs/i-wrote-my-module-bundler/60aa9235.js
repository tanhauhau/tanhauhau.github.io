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

var __build_img__0 = "f635154d6a84f142.png";

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

var image = "https://lihautan.com/i-wrote-my-module-bundler/assets/hero-twitter-01456022.jpg";

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
					"@id": "https%3A%2F%2Flihautan.com%2Fi-wrote-my-module-bundler",
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
			attr(meta11, "content", "https%3A%2F%2Flihautan.com%2Fi-wrote-my-module-bundler");
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
							"@id": "https%3A%2F%2Flihautan.com%2Fi-wrote-my-module-bundler",
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

/* content/blog/i-wrote-my-module-bundler/@@page-markup.svelte generated by Svelte v3.24.0 */

function create_default_slot(ctx) {
	let section0;
	let ul4;
	let li0;
	let a0;
	let t0;
	let ul0;
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
	let ul1;
	let li5;
	let a5;
	let t5;
	let li6;
	let a6;
	let t6;
	let li7;
	let a7;
	let li8;
	let a8;
	let t7;
	let ul2;
	let li9;
	let a9;
	let t8;
	let li10;
	let a10;
	let t9;
	let ul3;
	let li11;
	let a11;
	let t10;
	let li12;
	let a12;
	let t11;
	let t12;
	let p0;
	let t13;
	let a13;
	let t14;
	let t15;
	let a14;
	let t16;
	let t17;
	let a15;
	let t18;
	let t19;
	let t20;
	let p1;
	let t21;
	let t22;
	let hr0;
	let t23;
	let p2;
	let t24;
	let strong0;
	let t25;
	let t26;
	let t27;
	let hr1;
	let t28;
	let section1;
	let h20;
	let a16;
	let t29;
	let t30;
	let p3;
	let t31;
	let a17;
	let t32;
	let t33;
	let t34;
	let p4;
	let t35;
	let em0;
	let t36;
	let t37;
	let t38;
	let ul5;
	let li13;
	let t39;
	let strong1;
	let t40;
	let t41;
	let li14;
	let t42;
	let strong2;
	let t43;
	let t44;
	let blockquote0;
	let p5;
	let t45;
	let strong3;
	let t46;
	let t47;
	let t48;
	let section2;
	let h30;
	let a18;
	let t49;
	let t50;
	let p6;
	let t51;
	let t52;
	let pre0;

	let raw0_value = `
<code class="language-js"><span class="token comment">// filename: index.js</span>
<span class="token keyword module">import</span> squareArea <span class="token keyword module">from</span> <span class="token string">'./square.js'</span><span class="token punctuation">;</span>
<span class="token keyword module">import</span> circleArea <span class="token keyword module">from</span> <span class="token string">'./circle.js'</span><span class="token punctuation">;</span>

<span class="token console class-name">console</span><span class="token punctuation">.</span><span class="token method function property-access">log</span><span class="token punctuation">(</span><span class="token string">'Area of square: '</span><span class="token punctuation">,</span> <span class="token function">squareArea</span><span class="token punctuation">(</span><span class="token number">5</span><span class="token punctuation">)</span><span class="token punctuation">)</span><span class="token punctuation">;</span>
<span class="token console class-name">console</span><span class="token punctuation">.</span><span class="token method function property-access">log</span><span class="token punctuation">(</span><span class="token string">'Area of circle'</span><span class="token punctuation">,</span> <span class="token function">circleArea</span><span class="token punctuation">(</span><span class="token number">5</span><span class="token punctuation">)</span><span class="token punctuation">)</span><span class="token punctuation">;</span></code>` + "";

	let t53;
	let pre1;

	let raw1_value = `
<code class="language-js"><span class="token comment">// filename: square.js</span>
<span class="token keyword">function</span> <span class="token function">area</span><span class="token punctuation">(</span><span class="token parameter">side</span><span class="token punctuation">)</span> <span class="token punctuation">&#123;</span>
  <span class="token keyword">return</span> side <span class="token operator">*</span> side<span class="token punctuation">;</span>
<span class="token punctuation">&#125;</span>
<span class="token keyword module">export</span> <span class="token keyword module">default</span> area<span class="token punctuation">;</span></code>` + "";

	let t54;
	let pre2;

	let raw2_value = `
<code class="language-js"><span class="token comment">// filename: circle.js</span>
<span class="token keyword">const</span> <span class="token constant">PI</span> <span class="token operator">=</span> <span class="token number">3.141</span><span class="token punctuation">;</span>
<span class="token keyword">function</span> <span class="token function">area</span><span class="token punctuation">(</span><span class="token parameter">radius</span><span class="token punctuation">)</span> <span class="token punctuation">&#123;</span>
  <span class="token keyword">return</span> <span class="token constant">PI</span> <span class="token operator">*</span> radius <span class="token operator">*</span> radius<span class="token punctuation">;</span>
<span class="token punctuation">&#125;</span>
<span class="token keyword module">export</span> <span class="token keyword module">default</span> area<span class="token punctuation">;</span></code>` + "";

	let t55;
	let p7;
	let t56;
	let a19;
	let t57;
	let t58;
	let code0;
	let t59;
	let t60;
	let code1;
	let t61;
	let t62;
	let t63;
	let section3;
	let h21;
	let a20;
	let t64;
	let t65;
	let p8;
	let t66;
	let t67;
	let pre3;

	let raw3_value = `
<code class="language-js"><span class="token keyword">function</span> <span class="token function">build</span><span class="token punctuation">(</span><span class="token parameter"><span class="token punctuation">&#123;</span> entryFile<span class="token punctuation">,</span> outputFolder <span class="token punctuation">&#125;</span></span><span class="token punctuation">)</span> <span class="token punctuation">&#123;</span>
  <span class="token comment">// build dependency graph</span>
  <span class="token keyword">const</span> graph <span class="token operator">=</span> <span class="token function">createDependencyGraph</span><span class="token punctuation">(</span>entryFile<span class="token punctuation">)</span><span class="token punctuation">;</span>
  <span class="token comment">// bundle the asset</span>
  <span class="token keyword">const</span> outputFiles <span class="token operator">=</span> <span class="token function">bundle</span><span class="token punctuation">(</span>graph<span class="token punctuation">)</span><span class="token punctuation">;</span>
  <span class="token comment">// write to output folder</span>
  <span class="token keyword">for</span><span class="token punctuation">(</span><span class="token keyword">const</span> outputFile <span class="token keyword">of</span> outputFiles<span class="token punctuation">)</span> <span class="token punctuation">&#123;</span>
    fs<span class="token punctuation">.</span><span class="token method function property-access">writeFileSync</span><span class="token punctuation">(</span>
      path<span class="token punctuation">.</span><span class="token method function property-access">join</span><span class="token punctuation">(</span>outputFolder<span class="token punctuation">,</span> outputFile<span class="token punctuation">.</span><span class="token property-access">name</span><span class="token punctuation">)</span><span class="token punctuation">,</span>
      outputFile<span class="token punctuation">.</span><span class="token property-access">content</span><span class="token punctuation">,</span>
      <span class="token string">'utf-8'</span>
    <span class="token punctuation">)</span>
  <span class="token punctuation">&#125;</span>
<span class="token punctuation">&#125;</span></code>` + "";

	let t68;
	let blockquote1;
	let p9;
	let t69;
	let strong4;
	let t70;
	let t71;
	let a21;
	let t72;
	let t73;
	let t74;
	let pre4;

	let raw4_value = `
<code class="language-js"><span class="token keyword">function</span> <span class="token function">createDependencyGraph</span><span class="token punctuation">(</span><span class="token parameter">entryFile</span><span class="token punctuation">)</span> <span class="token punctuation">&#123;</span>
  <span class="token keyword">const</span> rootModule <span class="token operator">=</span> <span class="token function">createModule</span><span class="token punctuation">(</span>entryFile<span class="token punctuation">)</span><span class="token punctuation">;</span>
  <span class="token keyword">return</span> rootModule<span class="token punctuation">;</span>
<span class="token punctuation">&#125;</span></code>` + "";

	let t75;
	let p10;
	let t76;
	let t77;
	let p11;
	let t78;
	let code2;
	let t79;
	let t80;
	let code3;
	let t81;
	let t82;
	let t83;
	let pre5;

	let raw5_value = `
<code class="language-js"><span class="token keyword">function</span> <span class="token function">createModule</span><span class="token punctuation">(</span><span class="token parameter">filePath</span><span class="token punctuation">)</span> <span class="token punctuation">&#123;</span>
  <span class="token keyword">return</span> <span class="token keyword">new</span> <span class="token class-name">Module</span><span class="token punctuation">(</span>filePath<span class="token punctuation">)</span><span class="token punctuation">;</span>
<span class="token punctuation">&#125;</span></code>` + "";

	let t84;
	let p12;
	let t85;
	let code4;
	let t86;
	let t87;
	let t88;
	let pre6;

	let raw6_value = `
<code class="language-js"><span class="token keyword">class</span> <span class="token class-name">Module</span> <span class="token punctuation">&#123;</span>
  <span class="token function">constructor</span><span class="token punctuation">(</span><span class="token parameter">filePath</span><span class="token punctuation">)</span> <span class="token punctuation">&#123;</span>
    <span class="token keyword">this</span><span class="token punctuation">.</span><span class="token property-access">filePath</span> <span class="token operator">=</span> filePath<span class="token punctuation">;</span>
    <span class="token keyword">this</span><span class="token punctuation">.</span><span class="token property-access">content</span> <span class="token operator">=</span> fs<span class="token punctuation">.</span><span class="token method function property-access">readFileSync</span><span class="token punctuation">(</span>filePath<span class="token punctuation">,</span> <span class="token string">'utf-8'</span><span class="token punctuation">)</span><span class="token punctuation">;</span>
    <span class="token keyword">this</span><span class="token punctuation">.</span><span class="token property-access">dependencies</span> <span class="token operator">=</span> <span class="token punctuation">[</span><span class="token punctuation">]</span><span class="token punctuation">;</span>
  <span class="token punctuation">&#125;</span>
<span class="token punctuation">&#125;</span></code>` + "";

	let t89;
	let p13;
	let t90;
	let code5;
	let t91;
	let t92;
	let a22;
	let t93;
	let t94;
	let em1;
	let t95;
	let t96;
	let t97;
	let pre7;

	let raw7_value = `
<code class="language-js"><span class="token comment">// highlight-next-line</span>
<span class="token keyword">const</span> babel <span class="token operator">=</span> <span class="token function">require</span><span class="token punctuation">(</span><span class="token string">'@babel/core'</span><span class="token punctuation">)</span><span class="token punctuation">;</span>

<span class="token keyword">class</span> <span class="token class-name">Module</span> <span class="token punctuation">&#123;</span>
  <span class="token function">constructor</span><span class="token punctuation">(</span><span class="token parameter">filePath</span><span class="token punctuation">)</span> <span class="token punctuation">&#123;</span>
    <span class="token keyword">this</span><span class="token punctuation">.</span><span class="token property-access">filePath</span> <span class="token operator">=</span> filePath<span class="token punctuation">;</span>
    <span class="token keyword">this</span><span class="token punctuation">.</span><span class="token property-access">content</span> <span class="token operator">=</span> fs<span class="token punctuation">.</span><span class="token method function property-access">readFileSync</span><span class="token punctuation">(</span>filePath<span class="token punctuation">,</span> <span class="token string">'utf-8'</span><span class="token punctuation">)</span><span class="token punctuation">;</span>
    <span class="token comment">// highlight-next-line</span>
    <span class="token keyword">this</span><span class="token punctuation">.</span><span class="token property-access">ast</span> <span class="token operator">=</span> babel<span class="token punctuation">.</span><span class="token method function property-access">parseSync</span><span class="token punctuation">(</span><span class="token keyword">this</span><span class="token punctuation">.</span><span class="token property-access">content</span><span class="token punctuation">)</span><span class="token punctuation">;</span>
  <span class="token punctuation">&#125;</span>
<span class="token punctuation">&#125;</span></code>` + "";

	let t98;
	let p14;
	let t99;
	let t100;
	let pre8;

	let raw8_value = `
<code class="language-js"><span class="token keyword">class</span> <span class="token class-name">Module</span> <span class="token punctuation">&#123;</span>
  <span class="token function">constructor</span><span class="token punctuation">(</span><span class="token parameter">filePath</span><span class="token punctuation">)</span> <span class="token punctuation">&#123;</span>
    <span class="token keyword">this</span><span class="token punctuation">.</span><span class="token property-access">filePath</span> <span class="token operator">=</span> filePath<span class="token punctuation">;</span>
    <span class="token keyword">this</span><span class="token punctuation">.</span><span class="token property-access">content</span> <span class="token operator">=</span> fs<span class="token punctuation">.</span><span class="token method function property-access">readFileSync</span><span class="token punctuation">(</span>filePath<span class="token punctuation">,</span> <span class="token string">'utf-8'</span><span class="token punctuation">)</span><span class="token punctuation">;</span>
    <span class="token keyword">this</span><span class="token punctuation">.</span><span class="token property-access">ast</span> <span class="token operator">=</span> babel<span class="token punctuation">.</span><span class="token method function property-access">parseSync</span><span class="token punctuation">(</span><span class="token keyword">this</span><span class="token punctuation">.</span><span class="token property-access">content</span><span class="token punctuation">)</span><span class="token punctuation">;</span>
    <span class="token comment">// highlight-start</span>
    <span class="token keyword">this</span><span class="token punctuation">.</span><span class="token property-access">dependencies</span> <span class="token operator">=</span> <span class="token keyword">this</span><span class="token punctuation">.</span><span class="token method function property-access">findDependencies</span><span class="token punctuation">(</span><span class="token punctuation">)</span><span class="token punctuation">;</span>
  <span class="token punctuation">&#125;</span>
  <span class="token function">findDependencies</span><span class="token punctuation">(</span><span class="token punctuation">)</span> <span class="token punctuation">&#123;</span>
    <span class="token comment">//</span>
  <span class="token punctuation">&#125;</span>
  <span class="token comment">// highlight-end</span>
<span class="token punctuation">&#125;</span></code>` + "";

	let t101;
	let p15;
	let t102;
	let t103;
	let p16;
	let t104;
	let code6;
	let t105;
	let t106;
	let a23;
	let t107;
	let t108;
	let t109;
	let p17;
	let img;
	let img_src_value;
	let t110;
	let p18;
	let t111;
	let code7;
	let t112;
	let t113;
	let code8;
	let t114;
	let t115;
	let code9;
	let t116;
	let t117;
	let code10;
	let t118;
	let t119;
	let code11;
	let t120;
	let t121;
	let t122;
	let pre9;

	let raw9_value = `
<code class="language-js"><span class="token function">findDependencies</span><span class="token punctuation">(</span><span class="token punctuation">)</span> <span class="token punctuation">&#123;</span>
  <span class="token comment">// highlight-start</span>
  <span class="token keyword">return</span> <span class="token keyword">this</span><span class="token punctuation">.</span><span class="token property-access">ast</span><span class="token punctuation">.</span><span class="token property-access">program</span><span class="token punctuation">.</span><span class="token property-access">body</span>
    <span class="token punctuation">.</span><span class="token method function property-access">filter</span><span class="token punctuation">(</span><span class="token parameter">node</span> <span class="token arrow operator">=></span> node<span class="token punctuation">.</span><span class="token property-access">type</span> <span class="token operator">===</span> <span class="token string">'ImportDeclaration'</span><span class="token punctuation">)</span>
    <span class="token punctuation">.</span><span class="token method function property-access">map</span><span class="token punctuation">(</span><span class="token parameter">node</span> <span class="token arrow operator">=></span> node<span class="token punctuation">.</span><span class="token property-access">source</span><span class="token punctuation">.</span><span class="token property-access">value</span><span class="token punctuation">)</span>
  <span class="token comment">// highlight-end</span>
<span class="token punctuation">&#125;</span></code>` + "";

	let t123;
	let p19;
	let t124;
	let code12;
	let t125;
	let t126;
	let code13;
	let t127;
	let t128;
	let code14;
	let t129;
	let t130;
	let strong5;
	let t131;
	let t132;
	let t133;
	let p20;
	let t134;
	let strong6;
	let t135;
	let t136;
	let t137;
	let pre10;

	let raw10_value = `
<code class="language-js"><span class="token function">findDependencies</span><span class="token punctuation">(</span><span class="token punctuation">)</span> <span class="token punctuation">&#123;</span>
  <span class="token keyword">return</span> <span class="token keyword">this</span><span class="token punctuation">.</span><span class="token property-access">ast</span><span class="token punctuation">.</span><span class="token property-access">program</span><span class="token punctuation">.</span><span class="token property-access">body</span>
    <span class="token punctuation">.</span><span class="token method function property-access">filter</span><span class="token punctuation">(</span><span class="token parameter">node</span> <span class="token arrow operator">=></span> node<span class="token punctuation">.</span><span class="token property-access">type</span> <span class="token operator">===</span> <span class="token string">'ImportDeclaration'</span><span class="token punctuation">)</span>
    <span class="token punctuation">.</span><span class="token method function property-access">map</span><span class="token punctuation">(</span><span class="token parameter">node</span> <span class="token arrow operator">=></span> node<span class="token punctuation">.</span><span class="token property-access">source</span><span class="token punctuation">.</span><span class="token property-access">value</span><span class="token punctuation">)</span>
  <span class="token comment">// highlight-next-line</span>
    <span class="token punctuation">.</span><span class="token method function property-access">map</span><span class="token punctuation">(</span><span class="token parameter">relativePath</span> <span class="token arrow operator">=></span> <span class="token function">resolveRequest</span><span class="token punctuation">(</span><span class="token keyword">this</span><span class="token punctuation">.</span><span class="token property-access">filePath</span><span class="token punctuation">,</span> relativePath<span class="token punctuation">)</span><span class="token punctuation">)</span>
<span class="token punctuation">&#125;</span>

<span class="token comment">// highlight-start</span>
<span class="token comment">// resolving</span>
<span class="token keyword">function</span> <span class="token function">resolveRequest</span><span class="token punctuation">(</span><span class="token parameter">requester<span class="token punctuation">,</span> requestedPath</span><span class="token punctuation">)</span> <span class="token punctuation">&#123;</span>
  <span class="token comment">//</span>
<span class="token punctuation">&#125;</span></code>` + "";

	let t138;
	let p21;
	let em2;
	let t139;
	let t140;
	let section4;
	let h22;
	let a24;
	let t141;
	let t142;
	let p22;
	let t143;
	let code15;
	let t144;
	let t145;
	let code16;
	let t146;
	let t147;
	let t148;
	let pre11;

	let raw11_value = `
<code class="language-js"><span class="token comment">// filename: project/a.js</span>
<span class="token keyword module">import</span> <span class="token string">'./b.js'</span><span class="token punctuation">;</span></code>` + "";

	let t149;
	let pre12;

	let raw12_value = `
<code class="language-js"><span class="token comment">// filename: project/foo/a.js</span>
<span class="token keyword module">import</span> <span class="token string">'./b.js'</span><span class="token punctuation">;</span></code>` + "";

	let t150;
	let p23;
	let t151;
	let t152;
	let p24;
	let t153;
	let a25;
	let t154;
	let t155;
	let t156;
	let p25;
	let t157;
	let code17;
	let t158;
	let t159;
	let code18;
	let t160;
	let t161;
	let t162;
	let pre13;

	let raw13_value = `
<code class="language-">b
b.js
b.json
b.node</code>` + "";

	let t163;
	let p26;
	let t164;
	let code19;
	let t165;
	let t166;
	let t167;
	let pre14;

	let raw14_value = `
<code class="language-">&quot;main&quot; in b/package.json
b/index.js
b/index.json
b/index.node</code>` + "";

	let t168;
	let p27;
	let t169;
	let code20;
	let t170;
	let t171;
	let code21;
	let t172;
	let t173;
	let t174;
	let p28;
	let t175;
	let code22;
	let t176;
	let t177;
	let a26;
	let t178;
	let t179;
	let t180;
	let p29;
	let t181;
	let em3;
	let t182;
	let t183;
	let t184;
	let pre15;

	let raw15_value = `
<code class="language-js"><span class="token keyword">const</span> path <span class="token operator">=</span> <span class="token function">require</span><span class="token punctuation">(</span><span class="token string">'path'</span><span class="token punctuation">)</span><span class="token punctuation">;</span>
<span class="token comment">// highlight-start</span>
<span class="token comment">// resolving</span>
<span class="token keyword">function</span> <span class="token function">resolveRequest</span><span class="token punctuation">(</span><span class="token parameter">requester<span class="token punctuation">,</span> requestedPath</span><span class="token punctuation">)</span> <span class="token punctuation">&#123;</span>
  <span class="token keyword">return</span> path<span class="token punctuation">.</span><span class="token method function property-access">join</span><span class="token punctuation">(</span>path<span class="token punctuation">.</span><span class="token method function property-access">dirname</span><span class="token punctuation">(</span>requester<span class="token punctuation">)</span><span class="token punctuation">,</span> requestedPath<span class="token punctuation">)</span><span class="token punctuation">;</span>
<span class="token punctuation">&#125;</span></code>` + "";

	let t185;
	let blockquote2;
	let small0;
	let t186;
	let t187;
	let p30;
	let t188;
	let t189;
	let pre16;

	let raw16_value = `
<code class="language-js"><span class="token function">findDependencies</span><span class="token punctuation">(</span><span class="token punctuation">)</span> <span class="token punctuation">&#123;</span>
  <span class="token keyword">return</span> <span class="token keyword">this</span><span class="token punctuation">.</span><span class="token property-access">ast</span><span class="token punctuation">.</span><span class="token property-access">program</span><span class="token punctuation">.</span><span class="token property-access">body</span>
    <span class="token punctuation">.</span><span class="token method function property-access">filter</span><span class="token punctuation">(</span><span class="token parameter">node</span> <span class="token arrow operator">=></span> node<span class="token punctuation">.</span><span class="token property-access">type</span> <span class="token operator">===</span> <span class="token string">'ImportDeclaration'</span><span class="token punctuation">)</span>
    <span class="token punctuation">.</span><span class="token method function property-access">map</span><span class="token punctuation">(</span><span class="token parameter">node</span> <span class="token arrow operator">=></span> node<span class="token punctuation">.</span><span class="token property-access">source</span><span class="token punctuation">.</span><span class="token property-access">value</span><span class="token punctuation">)</span>
    <span class="token punctuation">.</span><span class="token method function property-access">map</span><span class="token punctuation">(</span><span class="token parameter">relativePath</span> <span class="token arrow operator">=></span> <span class="token function">resolveRequest</span><span class="token punctuation">(</span><span class="token keyword">this</span><span class="token punctuation">.</span><span class="token property-access">filePath</span><span class="token punctuation">,</span> relativePath<span class="token punctuation">)</span><span class="token punctuation">)</span>
    <span class="token comment">// highlight-next-line</span>
    <span class="token punctuation">.</span><span class="token method function property-access">map</span><span class="token punctuation">(</span><span class="token parameter">absolutePath</span> <span class="token arrow operator">=></span> <span class="token function">createModule</span><span class="token punctuation">(</span>absolutePath<span class="token punctuation">)</span><span class="token punctuation">)</span>
<span class="token punctuation">&#125;</span></code>` + "";

	let t190;
	let p31;
	let t191;
	let t192;
	let pre17;

	let raw17_value = `
<code class="language-js"><span class="token maybe-class-name">Module</span> <span class="token punctuation">&#123;</span>
  filePath<span class="token punctuation">:</span> <span class="token string">'/Projects/byo-bundler/fixture/index.js'</span><span class="token punctuation">,</span>
  content<span class="token punctuation">:</span>
   <span class="token string">'import squareArea from \'./square.js\';&#92;nimport circleArea from \'./circle.js\';&#92;n&#92;nconsole.log(\'Area of square: \', squareArea(5));&#92;nconsole.log(\'Area of circle\', circleArea(5));&#92;n'</span><span class="token punctuation">,</span>
  ast<span class="token punctuation">:</span>
   <span class="token maybe-class-name">Node</span> <span class="token punctuation">&#123;</span> <span class="token comment">/*...*/</span> <span class="token punctuation">&#125;</span><span class="token punctuation">,</span>
  dependencies<span class="token punctuation">:</span>
   <span class="token punctuation">[</span> <span class="token maybe-class-name">Module</span> <span class="token punctuation">&#123;</span>
       filePath<span class="token punctuation">:</span> <span class="token string">'/Projects/byo-bundler/fixture/square.js'</span><span class="token punctuation">,</span>
       content<span class="token punctuation">:</span>
        <span class="token string">'function area(side) &#123;&#92;n  return side * side;&#92;n&#125;&#92;nexport default area;&#92;n'</span><span class="token punctuation">,</span>
       ast<span class="token punctuation">:</span> <span class="token maybe-class-name">Node</span> <span class="token punctuation">&#123;</span><span class="token comment">/* ... */</span><span class="token punctuation">&#125;</span><span class="token punctuation">,</span>
       dependencies<span class="token punctuation">:</span> <span class="token punctuation">[</span><span class="token punctuation">]</span>
      <span class="token punctuation">&#125;</span><span class="token punctuation">,</span>
     <span class="token maybe-class-name">Module</span> <span class="token punctuation">&#123;</span>
       filePath<span class="token punctuation">:</span> <span class="token string">'/Projects/byo-bundler/fixture/circle.js'</span><span class="token punctuation">,</span>
       content<span class="token punctuation">:</span>
        <span class="token string">'const PI = 3.141;&#92;nfunction area(radius) &#123;&#92;n    return PI * radius * radius;&#92;n&#125;&#92;nexport default area;&#92;n'</span><span class="token punctuation">,</span>
       ast<span class="token punctuation">:</span> <span class="token maybe-class-name">Node</span> <span class="token punctuation">&#123;</span><span class="token comment">/* ... */</span><span class="token punctuation">&#125;</span><span class="token punctuation">,</span>
       dependencies<span class="token punctuation">:</span> <span class="token punctuation">[</span><span class="token punctuation">]</span>
      <span class="token punctuation">&#125;</span>
   <span class="token punctuation">]</span>
<span class="token punctuation">&#125;</span></code>` + "";

	let t193;
	let p32;
	let t194;
	let code23;
	let t195;
	let t196;
	let code24;
	let t197;
	let t198;
	let code25;
	let t199;
	let t200;
	let code26;
	let t201;
	let t202;
	let t203;
	let blockquote3;
	let small1;
	let t204;
	let t205;
	let section5;
	let h23;
	let a27;
	let t206;
	let t207;
	let p33;
	let t208;
	let t209;
	let p34;
	let t210;
	let strong7;
	let t211;
	let t212;
	let strong8;
	let t213;
	let t214;
	let strong9;
	let t215;
	let t216;
	let strong10;
	let t217;
	let t218;
	let t219;
	let blockquote4;
	let p35;
	let t220;
	let strong11;
	let t221;
	let t222;
	let strong12;
	let t223;
	let t224;
	let a28;
	let t225;
	let t226;
	let t227;
	let p36;
	let t228;
	let t229;
	let pre18;

	let raw18_value = `
<code class="language-js"><span class="token keyword">const</span> modules <span class="token operator">=</span> <span class="token punctuation">&#123;</span>
  <span class="token string">'circle.js'</span><span class="token punctuation">:</span> <span class="token keyword">function</span><span class="token punctuation">(</span><span class="token parameter">exports<span class="token punctuation">,</span> require</span><span class="token punctuation">)</span> <span class="token punctuation">&#123;</span>
    <span class="token keyword">const</span> <span class="token constant">PI</span> <span class="token operator">=</span> <span class="token number">3.141</span><span class="token punctuation">;</span>
    exports<span class="token punctuation">.</span><span class="token method-variable function-variable method function property-access">default</span> <span class="token operator">=</span> <span class="token keyword">function</span> <span class="token function">area</span><span class="token punctuation">(</span><span class="token parameter">radius</span><span class="token punctuation">)</span> <span class="token punctuation">&#123;</span>
      <span class="token keyword">return</span> <span class="token constant">PI</span> <span class="token operator">*</span> radius <span class="token operator">*</span> radius<span class="token punctuation">;</span>
    <span class="token punctuation">&#125;</span><span class="token punctuation">;</span>
  <span class="token punctuation">&#125;</span><span class="token punctuation">,</span>
  <span class="token string">'square.js'</span><span class="token punctuation">:</span> <span class="token keyword">function</span><span class="token punctuation">(</span><span class="token parameter">exports<span class="token punctuation">,</span> require</span><span class="token punctuation">)</span> <span class="token punctuation">&#123;</span>
    exports<span class="token punctuation">.</span><span class="token method-variable function-variable method function property-access">default</span> <span class="token operator">=</span> <span class="token keyword">function</span> <span class="token function">area</span><span class="token punctuation">(</span><span class="token parameter">side</span><span class="token punctuation">)</span> <span class="token punctuation">&#123;</span>
      <span class="token keyword">return</span> side <span class="token operator">*</span> side<span class="token punctuation">;</span>
    <span class="token punctuation">&#125;</span><span class="token punctuation">;</span>
  <span class="token punctuation">&#125;</span><span class="token punctuation">,</span>
  <span class="token string">'app.js'</span><span class="token punctuation">:</span> <span class="token keyword">function</span><span class="token punctuation">(</span><span class="token parameter">exports<span class="token punctuation">,</span> require</span><span class="token punctuation">)</span> <span class="token punctuation">&#123;</span>
    <span class="token keyword">const</span> squareArea <span class="token operator">=</span> <span class="token function">require</span><span class="token punctuation">(</span><span class="token string">'square.js'</span><span class="token punctuation">)</span><span class="token punctuation">.</span><span class="token keyword module">default</span><span class="token punctuation">;</span>
    <span class="token keyword">const</span> circleArea <span class="token operator">=</span> <span class="token function">require</span><span class="token punctuation">(</span><span class="token string">'circle.js'</span><span class="token punctuation">)</span><span class="token punctuation">.</span><span class="token keyword module">default</span><span class="token punctuation">;</span>
    <span class="token console class-name">console</span><span class="token punctuation">.</span><span class="token method function property-access">log</span><span class="token punctuation">(</span><span class="token string">'Area of square: '</span><span class="token punctuation">,</span> <span class="token function">squareArea</span><span class="token punctuation">(</span><span class="token number">5</span><span class="token punctuation">)</span><span class="token punctuation">)</span><span class="token punctuation">;</span>
    <span class="token console class-name">console</span><span class="token punctuation">.</span><span class="token method function property-access">log</span><span class="token punctuation">(</span><span class="token string">'Area of circle'</span><span class="token punctuation">,</span> <span class="token function">circleArea</span><span class="token punctuation">(</span><span class="token number">5</span><span class="token punctuation">)</span><span class="token punctuation">)</span><span class="token punctuation">;</span>
  <span class="token punctuation">&#125;</span><span class="token punctuation">,</span>
<span class="token punctuation">&#125;</span><span class="token punctuation">;</span>

<span class="token function">webpackStart</span><span class="token punctuation">(</span><span class="token punctuation">&#123;</span>
  modules<span class="token punctuation">,</span>
  entry<span class="token punctuation">:</span> <span class="token string">'app.js'</span><span class="token punctuation">,</span>
<span class="token punctuation">&#125;</span><span class="token punctuation">)</span><span class="token punctuation">;</span></code>` + "";

	let t230;
	let p37;
	let t231;
	let t232;
	let ul6;
	let li15;
	let strong13;
	let t233;
	let t234;
	let li16;
	let strong14;
	let t235;
	let t236;
	let t237;
	let li17;
	let strong15;
	let t238;
	let t239;
	let t240;
	let section6;
	let h31;
	let a29;
	let t241;
	let t242;
	let p38;
	let t243;
	let a30;
	let t244;
	let t245;
	let a31;
	let t246;
	let t247;
	let t248;
	let p39;
	let t249;
	let t250;
	let p40;
	let t251;
	let t252;
	let pre19;

	let raw19_value = `
<code class="language-js"><span class="token keyword">function</span> <span class="token function">bundle</span><span class="token punctuation">(</span><span class="token parameter">graph</span><span class="token punctuation">)</span> <span class="token punctuation">&#123;</span>
  <span class="token comment">// highlight-next-line</span>
  <span class="token function">collectModules</span><span class="token punctuation">(</span>graph<span class="token punctuation">)</span><span class="token punctuation">;</span>
  <span class="token keyword">return</span> <span class="token punctuation">[</span><span class="token punctuation">]</span><span class="token punctuation">;</span>
<span class="token punctuation">&#125;</span>

<span class="token comment">// highlight-start</span>
<span class="token keyword">function</span> <span class="token function">collectModules</span><span class="token punctuation">(</span><span class="token parameter">graph</span><span class="token punctuation">)</span> <span class="token punctuation">&#123;</span>
  <span class="token keyword">const</span> modules <span class="token operator">=</span> <span class="token punctuation">[</span><span class="token punctuation">]</span><span class="token punctuation">;</span>
  <span class="token function">collect</span><span class="token punctuation">(</span>graph<span class="token punctuation">,</span> modules<span class="token punctuation">)</span><span class="token punctuation">;</span>
  <span class="token keyword">return</span> modules<span class="token punctuation">;</span>

  <span class="token keyword">function</span> <span class="token function">collect</span><span class="token punctuation">(</span><span class="token parameter">module<span class="token punctuation">,</span> modules</span><span class="token punctuation">)</span> <span class="token punctuation">&#123;</span>
    modules<span class="token punctuation">.</span><span class="token method function property-access">push</span><span class="token punctuation">(</span>module<span class="token punctuation">)</span><span class="token punctuation">;</span>
    module<span class="token punctuation">.</span><span class="token property-access">dependencies</span><span class="token punctuation">.</span><span class="token method function property-access">forEach</span><span class="token punctuation">(</span><span class="token parameter">dependency</span> <span class="token arrow operator">=></span> <span class="token function">collect</span><span class="token punctuation">(</span>dependency<span class="token punctuation">,</span> modules<span class="token punctuation">)</span><span class="token punctuation">)</span><span class="token punctuation">;</span>
  <span class="token punctuation">&#125;</span>
<span class="token punctuation">&#125;</span></code>` + "";

	let t253;
	let p41;
	let t254;
	let t255;
	let section7;
	let h32;
	let a32;
	let t256;
	let t257;
	let p42;
	let t258;
	let t259;
	let p43;
	let t260;
	let code27;
	let t261;
	let t262;
	let code28;
	let t263;
	let t264;
	let t265;
	let p44;
	let t266;
	let code29;
	let t267;
	let t268;
	let a33;
	let t269;
	let t270;
	let code30;
	let t271;
	let t272;
	let t273;
	let pre20;

	let raw20_value = `
<code class="language-js"><span class="token keyword">function</span> <span class="token function">bundle</span><span class="token punctuation">(</span><span class="token parameter">graph</span><span class="token punctuation">)</span> <span class="token punctuation">&#123;</span>
  <span class="token keyword">const</span> modules <span class="token operator">=</span> <span class="token function">collectModules</span><span class="token punctuation">(</span>graph<span class="token punctuation">)</span><span class="token punctuation">;</span>
  <span class="token comment">// highlight-next-line</span>
  <span class="token keyword">const</span> moduleMap <span class="token operator">=</span> <span class="token function">toModuleMap</span><span class="token punctuation">(</span>modules<span class="token punctuation">)</span><span class="token punctuation">;</span>
  <span class="token keyword">return</span> <span class="token punctuation">[</span><span class="token punctuation">]</span><span class="token punctuation">;</span>
<span class="token punctuation">&#125;</span>

<span class="token comment">// highlight-start</span>
<span class="token keyword">function</span> <span class="token function">toModuleMap</span><span class="token punctuation">(</span><span class="token parameter">modules</span><span class="token punctuation">)</span> <span class="token punctuation">&#123;</span>
  <span class="token keyword">let</span> moduleMap <span class="token operator">=</span> <span class="token string">''</span><span class="token punctuation">;</span>
  moduleMap <span class="token operator">+=</span> <span class="token string">'&#123;'</span><span class="token punctuation">;</span>

  <span class="token keyword">for</span> <span class="token punctuation">(</span><span class="token keyword">const</span> module <span class="token keyword">of</span> modules<span class="token punctuation">)</span> <span class="token punctuation">&#123;</span>
    moduleMap <span class="token operator">+=</span> <span class="token template-string"><span class="token template-punctuation string">&#96;</span><span class="token string">"</span><span class="token interpolation"><span class="token interpolation-punctuation punctuation">$&#123;</span>module<span class="token punctuation">.</span><span class="token property-access">filePath</span><span class="token interpolation-punctuation punctuation">&#125;</span></span><span class="token string">": </span><span class="token template-punctuation string">&#96;</span></span><span class="token punctuation">;</span>
    moduleMap <span class="token operator">+=</span> <span class="token template-string"><span class="token template-punctuation string">&#96;</span><span class="token string">function(exports, require) &#123; </span><span class="token interpolation"><span class="token interpolation-punctuation punctuation">$&#123;</span>module<span class="token punctuation">.</span><span class="token property-access">content</span><span class="token interpolation-punctuation punctuation">&#125;</span></span><span class="token string"> &#125;,</span><span class="token template-punctuation string">&#96;</span></span><span class="token punctuation">;</span>
  <span class="token punctuation">&#125;</span>

  moduleMap <span class="token operator">+=</span> <span class="token string">'&#125;'</span><span class="token punctuation">;</span>
  <span class="token keyword">return</span> moduleMap<span class="token punctuation">;</span>
<span class="token punctuation">&#125;</span></code>` + "";

	let t274;
	let p45;
	let t275;
	let code31;
	let t276;
	let t277;
	let t278;
	let ul7;
	let li18;
	let code32;
	let t279;
	let t280;
	let t281;
	let li19;
	let code33;
	let t282;
	let t283;
	let t284;
	let p46;
	let t285;
	let t286;
	let pre21;

	let raw21_value = `
<code class="language-js"><span class="token punctuation">&#123;</span>
  <span class="token string">"index.js"</span><span class="token punctuation">:</span> <span class="token keyword">function</span><span class="token punctuation">(</span><span class="token parameter">exports<span class="token punctuation">,</span> require</span><span class="token punctuation">)</span> <span class="token punctuation">&#123;</span>
    <span class="token keyword module">import</span> squareArea <span class="token keyword module">from</span> <span class="token string">'./square.js'</span><span class="token punctuation">;</span>
    <span class="token keyword module">import</span> circleArea <span class="token keyword module">from</span> <span class="token string">'./circle.js'</span><span class="token punctuation">;</span>

    <span class="token console class-name">console</span><span class="token punctuation">.</span><span class="token method function property-access">log</span><span class="token punctuation">(</span><span class="token string">'Area of square: '</span><span class="token punctuation">,</span> <span class="token function">squareArea</span><span class="token punctuation">(</span><span class="token number">5</span><span class="token punctuation">)</span><span class="token punctuation">)</span><span class="token punctuation">;</span>
    <span class="token console class-name">console</span><span class="token punctuation">.</span><span class="token method function property-access">log</span><span class="token punctuation">(</span><span class="token string">'Area of circle'</span><span class="token punctuation">,</span> <span class="token function">circleArea</span><span class="token punctuation">(</span><span class="token number">5</span><span class="token punctuation">)</span><span class="token punctuation">)</span><span class="token punctuation">;</span>
  <span class="token punctuation">&#125;</span><span class="token punctuation">,</span>
  <span class="token string">"square.js"</span><span class="token punctuation">:</span> <span class="token keyword">function</span><span class="token punctuation">(</span><span class="token parameter">exports<span class="token punctuation">,</span> require</span><span class="token punctuation">)</span> <span class="token punctuation">&#123;</span>
    <span class="token keyword">function</span> <span class="token function">area</span><span class="token punctuation">(</span><span class="token parameter">side</span><span class="token punctuation">)</span> <span class="token punctuation">&#123;</span>
      <span class="token keyword">return</span> side <span class="token operator">*</span> side<span class="token punctuation">;</span>
    <span class="token punctuation">&#125;</span>
    <span class="token keyword module">export</span> <span class="token keyword module">default</span> area<span class="token punctuation">;</span>
  <span class="token punctuation">&#125;</span><span class="token punctuation">,</span>
  <span class="token string">"circle.js"</span><span class="token punctuation">:</span> <span class="token keyword">function</span><span class="token punctuation">(</span><span class="token parameter">exports<span class="token punctuation">,</span> require</span><span class="token punctuation">)</span> <span class="token punctuation">&#123;</span>
    <span class="token keyword">const</span> <span class="token constant">PI</span> <span class="token operator">=</span> <span class="token number">3.141</span><span class="token punctuation">;</span>
    <span class="token keyword">function</span> <span class="token function">area</span><span class="token punctuation">(</span><span class="token parameter">radius</span><span class="token punctuation">)</span> <span class="token punctuation">&#123;</span>
      <span class="token keyword">return</span> <span class="token constant">PI</span> <span class="token operator">*</span> radius <span class="token operator">*</span> radius<span class="token punctuation">;</span>
    <span class="token punctuation">&#125;</span>
    <span class="token keyword module">export</span> <span class="token keyword module">default</span> area<span class="token punctuation">;</span>
  <span class="token punctuation">&#125;</span><span class="token punctuation">,</span>
<span class="token punctuation">&#125;</span></code>` + "";

	let t287;
	let p47;
	let t288;
	let code34;
	let t289;
	let t290;
	let code35;
	let t291;
	let t292;
	let code36;
	let t293;
	let t294;
	let code37;
	let t295;
	let t296;
	let t297;
	let p48;
	let t298;
	let t299;
	let p49;
	let t300;
	let t301;
	let pre22;

	let raw22_value = `
<code class="language-js"><span class="token comment">// #1</span>
<span class="token comment">// from</span>
<span class="token keyword module">import</span> a<span class="token punctuation">,</span> <span class="token punctuation">&#123;</span> b<span class="token punctuation">,</span> c <span class="token punctuation">&#125;</span> <span class="token keyword module">from</span> <span class="token string">'foo'</span><span class="token punctuation">;</span>
<span class="token comment">// to</span>
<span class="token keyword">const</span> <span class="token punctuation">&#123;</span> <span class="token keyword module">default</span><span class="token punctuation">:</span> a<span class="token punctuation">,</span> b<span class="token punctuation">,</span> c <span class="token punctuation">&#125;</span> <span class="token operator">=</span> <span class="token function">require</span><span class="token punctuation">(</span><span class="token string">'foo'</span><span class="token punctuation">)</span><span class="token punctuation">;</span>

<span class="token comment">// #2</span>
<span class="token keyword module">export</span> <span class="token keyword module">default</span> a<span class="token punctuation">;</span>
<span class="token keyword module">export</span> <span class="token keyword">const</span> b <span class="token operator">=</span> <span class="token number">2</span><span class="token punctuation">;</span>
<span class="token keyword module">export</span> <span class="token punctuation">&#123;</span> c <span class="token punctuation">&#125;</span><span class="token punctuation">;</span>
<span class="token comment">// to</span>
exports<span class="token punctuation">.</span><span class="token keyword module">default</span> <span class="token operator">=</span> a<span class="token punctuation">;</span>
exports<span class="token punctuation">.</span><span class="token property-access">b</span> <span class="token operator">=</span> <span class="token number">2</span><span class="token punctuation">;</span>
exports<span class="token punctuation">.</span><span class="token property-access">c</span> <span class="token operator">=</span> c<span class="token punctuation">;</span></code>` + "";

	let t302;
	let blockquote5;
	let p50;
	let t303;
	let a34;
	let t304;
	let t305;
	let t306;
	let p51;
	let t307;
	let strong16;
	let t308;
	let t309;
	let strong17;
	let t310;
	let t311;
	let t312;
	let pre23;

	let raw23_value = `
<code class="language-js"><span class="token keyword">for</span> <span class="token punctuation">(</span><span class="token keyword">const</span> module <span class="token keyword">of</span> modules<span class="token punctuation">)</span> <span class="token punctuation">&#123;</span>
  <span class="token comment">// highlight-next-line</span>
  module<span class="token punctuation">.</span><span class="token method function property-access">transformModuleInterface</span><span class="token punctuation">(</span><span class="token punctuation">)</span><span class="token punctuation">;</span>
  moduleMap <span class="token operator">+=</span> <span class="token template-string"><span class="token template-punctuation string">&#96;</span><span class="token string">"</span><span class="token interpolation"><span class="token interpolation-punctuation punctuation">$&#123;</span>module<span class="token punctuation">.</span><span class="token property-access">filePath</span><span class="token interpolation-punctuation punctuation">&#125;</span></span><span class="token string">": function(exports, require) &#123; </span><span class="token interpolation"><span class="token interpolation-punctuation punctuation">$&#123;</span>module<span class="token punctuation">.</span><span class="token property-access">content</span><span class="token interpolation-punctuation punctuation">&#125;</span></span><span class="token string"> &#125;,</span><span class="token template-punctuation string">&#96;</span></span><span class="token punctuation">;</span>
<span class="token punctuation">&#125;</span>
<span class="token comment">// ...</span>
<span class="token keyword">class</span> <span class="token class-name">Module</span> <span class="token punctuation">&#123;</span>
  <span class="token comment">// ...</span>
  <span class="token comment">// highlight-start</span>
  <span class="token function">transformModuleInterface</span><span class="token punctuation">(</span><span class="token punctuation">)</span> <span class="token punctuation">&#123;</span>
    <span class="token keyword">const</span> <span class="token punctuation">&#123;</span> ast<span class="token punctuation">,</span> code <span class="token punctuation">&#125;</span> <span class="token operator">=</span> babel<span class="token punctuation">.</span><span class="token method function property-access">transformFromAstSync</span><span class="token punctuation">(</span><span class="token keyword">this</span><span class="token punctuation">.</span><span class="token property-access">ast</span><span class="token punctuation">,</span> <span class="token keyword">this</span><span class="token punctuation">.</span><span class="token property-access">content</span><span class="token punctuation">,</span> <span class="token punctuation">&#123;</span> <span class="token spread operator">...</span> <span class="token punctuation">&#125;</span><span class="token punctuation">)</span><span class="token punctuation">;</span>
    <span class="token keyword">this</span><span class="token punctuation">.</span><span class="token property-access">ast</span> <span class="token operator">=</span> ast<span class="token punctuation">;</span>
    <span class="token keyword">this</span><span class="token punctuation">.</span><span class="token property-access">content</span> <span class="token operator">=</span> code<span class="token punctuation">;</span>
  <span class="token punctuation">&#125;</span>
  <span class="token comment">// highlight-end</span>
<span class="token punctuation">&#125;</span></code>` + "";

	let t313;
	let p52;
	let t314;
	let a35;
	let t315;
	let t316;
	let p53;
	let t317;
	let t318;
	let pre24;

	let raw24_value = `
<code class="language-js"><span class="token punctuation">&#123;</span>
  <span class="token string">"index.js"</span><span class="token punctuation">:</span> <span class="token keyword">function</span><span class="token punctuation">(</span><span class="token parameter">exports<span class="token punctuation">,</span> require</span><span class="token punctuation">)</span> <span class="token punctuation">&#123;</span>
    <span class="token keyword">const</span> <span class="token punctuation">&#123;</span> <span class="token keyword module">default</span><span class="token punctuation">:</span> squareArea <span class="token punctuation">&#125;</span> <span class="token operator">=</span> <span class="token function">require</span><span class="token punctuation">(</span><span class="token string">'square.js'</span><span class="token punctuation">)</span><span class="token punctuation">;</span>
    <span class="token keyword">const</span> <span class="token punctuation">&#123;</span> <span class="token keyword module">default</span><span class="token punctuation">:</span> circleArea <span class="token punctuation">&#125;</span> <span class="token operator">=</span> <span class="token function">require</span><span class="token punctuation">(</span><span class="token string">'circle.js'</span><span class="token punctuation">)</span><span class="token punctuation">;</span>

    <span class="token console class-name">console</span><span class="token punctuation">.</span><span class="token method function property-access">log</span><span class="token punctuation">(</span><span class="token string">'Area of square: '</span><span class="token punctuation">,</span> <span class="token function">squareArea</span><span class="token punctuation">(</span><span class="token number">5</span><span class="token punctuation">)</span><span class="token punctuation">)</span><span class="token punctuation">;</span>
    <span class="token console class-name">console</span><span class="token punctuation">.</span><span class="token method function property-access">log</span><span class="token punctuation">(</span><span class="token string">'Area of circle'</span><span class="token punctuation">,</span> <span class="token function">circleArea</span><span class="token punctuation">(</span><span class="token number">5</span><span class="token punctuation">)</span><span class="token punctuation">)</span><span class="token punctuation">;</span>
  <span class="token punctuation">&#125;</span><span class="token punctuation">,</span>
  <span class="token string">"square.js"</span><span class="token punctuation">:</span> <span class="token keyword">function</span><span class="token punctuation">(</span><span class="token parameter">exports<span class="token punctuation">,</span> require</span><span class="token punctuation">)</span> <span class="token punctuation">&#123;</span>
    <span class="token keyword">function</span> <span class="token function">area</span><span class="token punctuation">(</span><span class="token parameter">side</span><span class="token punctuation">)</span> <span class="token punctuation">&#123;</span>
      <span class="token keyword">return</span> side <span class="token operator">*</span> side<span class="token punctuation">;</span>
    <span class="token punctuation">&#125;</span>
    exports<span class="token punctuation">.</span><span class="token keyword module">default</span> <span class="token operator">=</span> area<span class="token punctuation">;</span>
  <span class="token punctuation">&#125;</span><span class="token punctuation">,</span>
  <span class="token string">"circle.js"</span><span class="token punctuation">:</span> <span class="token keyword">function</span><span class="token punctuation">(</span><span class="token parameter">exports<span class="token punctuation">,</span> require</span><span class="token punctuation">)</span> <span class="token punctuation">&#123;</span>
    <span class="token keyword">const</span> <span class="token constant">PI</span> <span class="token operator">=</span> <span class="token number">3.141</span><span class="token punctuation">;</span>
    <span class="token keyword">function</span> <span class="token function">area</span><span class="token punctuation">(</span><span class="token parameter">radius</span><span class="token punctuation">)</span> <span class="token punctuation">&#123;</span>
      <span class="token keyword">return</span> <span class="token constant">PI</span> <span class="token operator">*</span> radius <span class="token operator">*</span> radius<span class="token punctuation">;</span>
    <span class="token punctuation">&#125;</span>
    exports<span class="token punctuation">.</span><span class="token keyword module">default</span> <span class="token operator">=</span> area<span class="token punctuation">;</span>
  <span class="token punctuation">&#125;</span><span class="token punctuation">,</span>
<span class="token punctuation">&#125;</span></code>` + "";

	let t319;
	let p54;
	let t320;
	let code38;
	let t321;
	let t322;
	let t323;
	let section8;
	let h33;
	let a36;
	let strong18;
	let t324;
	let t325;
	let p55;
	let t326;
	let t327;
	let p56;
	let t328;
	let t329;
	let pre25;

	let raw25_value = `
<code class="language-js"><span class="token keyword">function</span> <span class="token function">bundle</span><span class="token punctuation">(</span><span class="token parameter">graph</span><span class="token punctuation">)</span> <span class="token punctuation">&#123;</span>
  <span class="token keyword">const</span> modules <span class="token operator">=</span> <span class="token function">collectModules</span><span class="token punctuation">(</span>graph<span class="token punctuation">)</span><span class="token punctuation">;</span>
  <span class="token keyword">const</span> moduleMap <span class="token operator">=</span> <span class="token function">toModuleMap</span><span class="token punctuation">(</span>modules<span class="token punctuation">)</span><span class="token punctuation">;</span>
  <span class="token comment">// highlight-next-line</span>
  <span class="token keyword">const</span> moduleCode <span class="token operator">=</span> <span class="token function">addRuntime</span><span class="token punctuation">(</span>moduleMap<span class="token punctuation">,</span> modules<span class="token punctuation">[</span><span class="token number">0</span><span class="token punctuation">]</span><span class="token punctuation">.</span><span class="token property-access">filePath</span><span class="token punctuation">)</span><span class="token punctuation">;</span>
  <span class="token keyword">return</span> <span class="token punctuation">[</span><span class="token punctuation">]</span><span class="token punctuation">;</span>
<span class="token punctuation">&#125;</span>
<span class="token comment">// highlight-start</span>
<span class="token keyword">function</span> <span class="token function">addRuntime</span><span class="token punctuation">(</span><span class="token parameter">moduleMap<span class="token punctuation">,</span> entryPoint</span><span class="token punctuation">)</span> <span class="token punctuation">&#123;</span>
  <span class="token keyword">return</span> <span class="token function">trim</span><span class="token punctuation">(</span><span class="token template-string"><span class="token template-punctuation string">&#96;</span><span class="token string">
    const modules = </span><span class="token interpolation"><span class="token interpolation-punctuation punctuation">$&#123;</span>moduleMap<span class="token interpolation-punctuation punctuation">&#125;</span></span><span class="token string">;
    const entry = "</span><span class="token interpolation"><span class="token interpolation-punctuation punctuation">$&#123;</span>entryPoint<span class="token interpolation-punctuation punctuation">&#125;</span></span><span class="token string">";
    function webpackStart(&#123; modules, entry &#125;) &#123;
      const moduleCache = &#123;&#125;;
      const require = moduleName => &#123;
        // if in cache, return the cached version
        if (moduleCache[moduleName]) &#123;
          return moduleCache[moduleName];
        &#125;
        const exports = &#123;&#125;;
        // this will prevent infinite "require" loop
        // from circular dependencies
        moduleCache[moduleName] = exports;
    
        // "require"-ing the module,
        // exported stuff will assigned to "exports"
        modules[moduleName](exports, require);
        return moduleCache[moduleName];
      &#125;;
    
      // start the program
      require(entry);
    &#125;

    webpackStart(&#123; modules, entry &#125;);</span><span class="token template-punctuation string">&#96;</span></span><span class="token punctuation">)</span><span class="token punctuation">;</span>
<span class="token punctuation">&#125;</span>

<span class="token comment">// trim away spaces before the line</span>
<span class="token keyword">function</span> <span class="token function">trim</span><span class="token punctuation">(</span><span class="token parameter">str</span><span class="token punctuation">)</span> <span class="token punctuation">&#123;</span>
  <span class="token keyword">const</span> lines <span class="token operator">=</span> str<span class="token punctuation">.</span><span class="token method function property-access">split</span><span class="token punctuation">(</span><span class="token string">'&#92;n'</span><span class="token punctuation">)</span><span class="token punctuation">.</span><span class="token method function property-access">filter</span><span class="token punctuation">(</span><span class="token known-class-name class-name">Boolean</span><span class="token punctuation">)</span><span class="token punctuation">;</span>
  <span class="token keyword">const</span> padLength <span class="token operator">=</span> lines<span class="token punctuation">[</span><span class="token number">0</span><span class="token punctuation">]</span><span class="token punctuation">.</span><span class="token property-access">length</span> <span class="token operator">-</span> lines<span class="token punctuation">[</span><span class="token number">0</span><span class="token punctuation">]</span><span class="token punctuation">.</span><span class="token method function property-access">trimLeft</span><span class="token punctuation">(</span><span class="token punctuation">)</span><span class="token punctuation">.</span><span class="token property-access">length</span><span class="token punctuation">;</span>
  <span class="token keyword">const</span> regex <span class="token operator">=</span> <span class="token keyword">new</span> <span class="token class-name">RegExp</span><span class="token punctuation">(</span><span class="token template-string"><span class="token template-punctuation string">&#96;</span><span class="token string">^\\s&#123;</span><span class="token interpolation"><span class="token interpolation-punctuation punctuation">$&#123;</span>padLength<span class="token interpolation-punctuation punctuation">&#125;</span></span><span class="token string">&#125;</span><span class="token template-punctuation string">&#96;</span></span><span class="token punctuation">)</span><span class="token punctuation">;</span>
  <span class="token keyword">return</span> lines<span class="token punctuation">.</span><span class="token method function property-access">map</span><span class="token punctuation">(</span><span class="token parameter">line</span> <span class="token arrow operator">=></span> line<span class="token punctuation">.</span><span class="token method function property-access">replace</span><span class="token punctuation">(</span>regex<span class="token punctuation">,</span> <span class="token string">''</span><span class="token punctuation">)</span><span class="token punctuation">)</span><span class="token punctuation">.</span><span class="token method function property-access">join</span><span class="token punctuation">(</span><span class="token string">'&#92;n'</span><span class="token punctuation">)</span><span class="token punctuation">;</span>
<span class="token punctuation">&#125;</span></code>` + "";

	let t330;
	let p57;
	let t331;
	let code39;
	let t332;
	let t333;
	let a37;
	let t334;
	let t335;
	let t336;
	let p58;
	let t337;
	let code40;
	let t338;
	let t339;
	let t340;
	let pre26;

	let raw26_value = `
<code class="language-js"><span class="token keyword">function</span> <span class="token function">bundle</span><span class="token punctuation">(</span><span class="token parameter">graph</span><span class="token punctuation">)</span> <span class="token punctuation">&#123;</span>
  <span class="token keyword">const</span> modules <span class="token operator">=</span> <span class="token function">collectModules</span><span class="token punctuation">(</span>graph<span class="token punctuation">)</span><span class="token punctuation">;</span>
  <span class="token keyword">const</span> moduleMap <span class="token operator">=</span> <span class="token function">toModuleMap</span><span class="token punctuation">(</span>modules<span class="token punctuation">)</span><span class="token punctuation">;</span>
  <span class="token keyword">const</span> moduleCode <span class="token operator">=</span> <span class="token function">addRuntime</span><span class="token punctuation">(</span>moduleMap<span class="token punctuation">,</span> modules<span class="token punctuation">[</span><span class="token number">0</span><span class="token punctuation">]</span><span class="token punctuation">.</span><span class="token property-access">filePath</span><span class="token punctuation">)</span><span class="token punctuation">;</span>
  <span class="token comment">// highlight-next-line</span>
  <span class="token keyword">return</span> <span class="token punctuation">[</span><span class="token punctuation">&#123;</span> name<span class="token punctuation">:</span> <span class="token string">'bundle.js'</span><span class="token punctuation">,</span> content<span class="token punctuation">:</span> moduleCode <span class="token punctuation">&#125;</span><span class="token punctuation">]</span><span class="token punctuation">;</span>
<span class="token punctuation">&#125;</span></code>` + "";

	let t341;
	let p59;
	let t342;
	let code41;
	let t343;
	let t344;
	let t345;
	let pre27;

	let raw27_value = `
<code class="language-">Area of square:  25
Area of circle 78.525</code>` + "";

	let t346;
	let p60;
	let t347;
	let t348;
	let p61;
	let t349;
	let strong19;
	let t350;
	let t351;
	let t352;
	let section9;
	let h24;
	let a38;
	let t353;
	let t354;
	let p62;
	let t355;
	let strong20;
	let t356;
	let t357;
	let t358;
	let p63;
	let t359;
	let t360;
	let pre28;

	let raw28_value = `
<code class="language-js"><span class="token comment">// filename: index.js</span>
<span class="token keyword module">import</span> squareArea <span class="token keyword module">from</span> <span class="token string">'./square.js'</span><span class="token punctuation">;</span>
<span class="token keyword module">import</span> circleArea <span class="token keyword module">from</span> <span class="token string">'./circle.js'</span><span class="token punctuation">;</span>

<span class="token comment">// highlight-next-line</span>
<span class="token keyword module">export</span> <span class="token keyword">const</span> <span class="token constant">PI</span> <span class="token operator">=</span> <span class="token number">3.141</span><span class="token punctuation">;</span>

<span class="token console class-name">console</span><span class="token punctuation">.</span><span class="token method function property-access">log</span><span class="token punctuation">(</span><span class="token string">'Area of square: '</span><span class="token punctuation">,</span> <span class="token function">squareArea</span><span class="token punctuation">(</span><span class="token number">5</span><span class="token punctuation">)</span><span class="token punctuation">)</span><span class="token punctuation">;</span>
<span class="token console class-name">console</span><span class="token punctuation">.</span><span class="token method function property-access">log</span><span class="token punctuation">(</span><span class="token string">'Area of circle'</span><span class="token punctuation">,</span> <span class="token function">circleArea</span><span class="token punctuation">(</span><span class="token number">5</span><span class="token punctuation">)</span><span class="token punctuation">)</span><span class="token punctuation">;</span></code>` + "";

	let t361;
	let pre29;

	let raw29_value = `
<code class="language-js"><span class="token comment">// filename: circle.js</span>
<span class="token comment">// highlight-start</span>
<span class="token comment">// const PI = 3.141;</span>
<span class="token keyword module">import</span> <span class="token punctuation">&#123;</span> <span class="token constant">PI</span> <span class="token punctuation">&#125;</span> <span class="token keyword module">from</span> <span class="token string">'./index.js'</span><span class="token punctuation">;</span>
<span class="token comment">// highlight-end</span>

<span class="token keyword">function</span> <span class="token function">area</span><span class="token punctuation">(</span><span class="token parameter">radius</span><span class="token punctuation">)</span> <span class="token punctuation">&#123;</span>
  <span class="token keyword">return</span> <span class="token constant">PI</span> <span class="token operator">*</span> radius <span class="token operator">*</span> radius<span class="token punctuation">;</span>
<span class="token punctuation">&#125;</span>
<span class="token keyword module">export</span> <span class="token keyword module">default</span> area<span class="token punctuation">;</span></code>` + "";

	let t362;
	let p64;
	let t363;
	let t364;
	let pre30;

	let raw30_value = `
<code class="language-">RangeError: Maximum call stack size exceeded</code>` + "";

	let t365;
	let section10;
	let h34;
	let a39;
	let t366;
	let t367;
	let p65;
	let t368;
	let t369;
	let ul8;
	let li20;
	let t370;
	let t371;
	let li21;
	let t372;
	let t373;
	let pre31;

	let raw31_value = `
<code class="language-js"><span class="token comment">// fixing circular dependencies when generating module graph</span>
<span class="token comment">// highlight-next-line</span>
<span class="token keyword">const</span> <span class="token constant">MODULE_CACHE</span> <span class="token operator">=</span> <span class="token keyword">new</span> <span class="token class-name">Map</span><span class="token punctuation">(</span><span class="token punctuation">)</span><span class="token punctuation">;</span>

<span class="token keyword">function</span> <span class="token function">createModule</span><span class="token punctuation">(</span><span class="token parameter">filePath</span><span class="token punctuation">)</span> <span class="token punctuation">&#123;</span>
 <span class="token comment">// highlight-next-line</span>
 <span class="token keyword">if</span> <span class="token punctuation">(</span><span class="token operator">!</span><span class="token constant">MODULE_CACHE</span><span class="token punctuation">.</span><span class="token method function property-access">has</span><span class="token punctuation">(</span>filePath<span class="token punctuation">)</span><span class="token punctuation">)</span> <span class="token punctuation">&#123;</span>
   <span class="token keyword">const</span> module <span class="token operator">=</span> <span class="token keyword">new</span> <span class="token class-name">Module</span><span class="token punctuation">(</span>filePath<span class="token punctuation">)</span><span class="token punctuation">;</span>
   <span class="token comment">// highlight-next-line</span>
   <span class="token constant">MODULE_CACHE</span><span class="token punctuation">.</span><span class="token method function property-access">set</span><span class="token punctuation">(</span>filePath<span class="token punctuation">,</span> module<span class="token punctuation">)</span><span class="token punctuation">;</span>
   <span class="token comment">// highlight-next-line</span>
   module<span class="token punctuation">.</span><span class="token method function property-access">initDependencies</span><span class="token punctuation">(</span><span class="token punctuation">)</span><span class="token punctuation">;</span>
 <span class="token punctuation">&#125;</span>
 <span class="token comment">// highlight-next-line</span>
 <span class="token keyword">return</span> <span class="token constant">MODULE_CACHE</span><span class="token punctuation">.</span><span class="token method function property-access">get</span><span class="token punctuation">(</span>filePath<span class="token punctuation">)</span><span class="token punctuation">;</span>
<span class="token punctuation">&#125;</span>

<span class="token keyword">class</span> <span class="token class-name">Module</span> <span class="token punctuation">&#123;</span>
  <span class="token spread operator">...</span>
  <span class="token comment">// highlight-next-line</span>
  <span class="token function">initDependencies</span><span class="token punctuation">(</span><span class="token punctuation">)</span> <span class="token punctuation">&#123;</span>
    <span class="token comment">// highlight-next-line</span>
    <span class="token keyword">this</span><span class="token punctuation">.</span><span class="token property-access">dependencies</span> <span class="token operator">=</span> <span class="token keyword">this</span><span class="token punctuation">.</span><span class="token method function property-access">findDependencies</span><span class="token punctuation">(</span><span class="token punctuation">)</span><span class="token punctuation">;</span>
  <span class="token comment">// highlight-next-line</span>
  <span class="token punctuation">&#125;</span>
<span class="token punctuation">&#125;</span>

<span class="token comment">// fixing circular dependencies when traversing module graph</span>
<span class="token keyword">function</span> <span class="token function">collectModules</span><span class="token punctuation">(</span><span class="token parameter">graph</span><span class="token punctuation">)</span> <span class="token punctuation">&#123;</span>
  <span class="token comment">// highlight-next-line</span>
  <span class="token keyword">const</span> modules <span class="token operator">=</span> <span class="token keyword">new</span> <span class="token class-name">Set</span><span class="token punctuation">(</span><span class="token punctuation">)</span><span class="token punctuation">;</span>
  <span class="token function">collect</span><span class="token punctuation">(</span>graph<span class="token punctuation">,</span> modules<span class="token punctuation">)</span><span class="token punctuation">;</span>
  <span class="token comment">// highlight-next-line</span>
  <span class="token keyword">return</span> <span class="token known-class-name class-name">Array</span><span class="token punctuation">.</span><span class="token keyword module">from</span><span class="token punctuation">(</span>modules<span class="token punctuation">)</span><span class="token punctuation">;</span>

  <span class="token comment">// highlight-start</span>
  <span class="token keyword">function</span> <span class="token function">collect</span><span class="token punctuation">(</span><span class="token parameter">module<span class="token punctuation">,</span> modules</span><span class="token punctuation">)</span> <span class="token punctuation">&#123;</span>
    <span class="token keyword">if</span> <span class="token punctuation">(</span><span class="token operator">!</span>modules<span class="token punctuation">.</span><span class="token method function property-access">has</span><span class="token punctuation">(</span>module<span class="token punctuation">)</span><span class="token punctuation">)</span> <span class="token punctuation">&#123;</span>
      modules<span class="token punctuation">.</span><span class="token method function property-access">add</span><span class="token punctuation">(</span>module<span class="token punctuation">)</span><span class="token punctuation">;</span>
      module<span class="token punctuation">.</span><span class="token property-access">dependencies</span><span class="token punctuation">.</span><span class="token method function property-access">forEach</span><span class="token punctuation">(</span><span class="token parameter">dependency</span> <span class="token arrow operator">=></span> <span class="token function">collect</span><span class="token punctuation">(</span>dependency<span class="token punctuation">,</span> modules<span class="token punctuation">)</span><span class="token punctuation">)</span><span class="token punctuation">;</span>
    <span class="token punctuation">&#125;</span>
  <span class="token punctuation">&#125;</span>
<span class="token punctuation">&#125;</span></code>` + "";

	let t374;
	let p66;
	let t375;
	let t376;
	let pre32;

	let raw32_value = `
<code class="language-sh">$ node output/bundle.js
Area of square:  25
Area of circle NaN</code>` + "";

	let t377;
	let p67;
	let t378;
	let t379;
	let pre33;

	let raw33_value = `
<code class="language-js"><span class="token punctuation">&#123;</span>
  <span class="token string">'index.js'</span><span class="token punctuation">:</span> <span class="token keyword">function</span><span class="token punctuation">(</span><span class="token parameter">exports<span class="token punctuation">,</span> require</span><span class="token punctuation">)</span> <span class="token punctuation">&#123;</span>
    <span class="token keyword">const</span> <span class="token punctuation">&#123;</span> <span class="token keyword module">default</span><span class="token punctuation">:</span> squareArea <span class="token punctuation">&#125;</span> <span class="token operator">=</span> <span class="token function">require</span><span class="token punctuation">(</span><span class="token string">'square.js'</span><span class="token punctuation">)</span><span class="token punctuation">;</span>
    <span class="token comment">// 1. require circle.js</span>
    <span class="token keyword">const</span> <span class="token punctuation">&#123;</span> <span class="token keyword module">default</span><span class="token punctuation">:</span> circleArea <span class="token punctuation">&#125;</span> <span class="token operator">=</span> <span class="token function">require</span><span class="token punctuation">(</span><span class="token string">'circle.js'</span><span class="token punctuation">)</span><span class="token punctuation">;</span>
    <span class="token comment">// 3. define PI on exports</span>
    exports<span class="token punctuation">.</span><span class="token constant">PI</span> <span class="token operator">=</span> <span class="token number">3.141</span><span class="token punctuation">;</span>
    <span class="token console class-name">console</span><span class="token punctuation">.</span><span class="token method function property-access">log</span><span class="token punctuation">(</span><span class="token string">'Area of square: '</span><span class="token punctuation">,</span> <span class="token function">squareArea</span><span class="token punctuation">(</span><span class="token number">5</span><span class="token punctuation">)</span><span class="token punctuation">)</span><span class="token punctuation">;</span>
    <span class="token comment">// 4. call &#96;circleArea&#96;</span>
    <span class="token console class-name">console</span><span class="token punctuation">.</span><span class="token method function property-access">log</span><span class="token punctuation">(</span><span class="token string">'Area of circle'</span><span class="token punctuation">,</span> <span class="token function">circleArea</span><span class="token punctuation">(</span><span class="token number">5</span><span class="token punctuation">)</span><span class="token punctuation">)</span><span class="token punctuation">;</span>
  <span class="token punctuation">&#125;</span><span class="token punctuation">,</span>
  <span class="token string">'circle.js'</span><span class="token punctuation">:</span> <span class="token keyword">function</span><span class="token punctuation">(</span><span class="token parameter">exports<span class="token punctuation">,</span> require</span><span class="token punctuation">)</span> <span class="token punctuation">&#123;</span>
    <span class="token comment">// 2. at the point of executing this, PI is not yet defined</span>
    <span class="token keyword">const</span> <span class="token punctuation">&#123;</span> <span class="token constant">PI</span><span class="token punctuation">:</span> <span class="token constant">PI</span> <span class="token punctuation">&#125;</span> <span class="token operator">=</span> <span class="token function">require</span><span class="token punctuation">(</span><span class="token string">'index.js'</span><span class="token punctuation">)</span><span class="token punctuation">;</span>
    <span class="token keyword">function</span> <span class="token function">area</span><span class="token punctuation">(</span><span class="token parameter">radius</span><span class="token punctuation">)</span> <span class="token punctuation">&#123;</span>
      <span class="token comment">// 5. PI is undefined</span>
      <span class="token keyword">return</span> <span class="token constant">PI</span> <span class="token operator">*</span> radius <span class="token operator">*</span> radius<span class="token punctuation">;</span>
    <span class="token punctuation">&#125;</span>
    exports<span class="token punctuation">.</span><span class="token keyword module">default</span> <span class="token operator">=</span> area<span class="token punctuation">;</span>
  <span class="token punctuation">&#125;</span><span class="token punctuation">,</span>
<span class="token punctuation">&#125;</span></code>` + "";

	let t380;
	let p68;
	let t381;
	let code42;
	let t382;
	let t383;
	let code43;
	let t384;
	let t385;
	let code44;
	let t386;
	let t387;
	let code45;
	let t388;
	let t389;
	let code46;
	let t390;
	let t391;
	let code47;
	let t392;
	let t393;
	let code48;
	let t394;
	let t395;
	let code49;
	let t396;
	let t397;
	let t398;
	let p69;
	let t399;
	let t400;
	let pre34;

	let raw34_value = `
<code class="language-js"><span class="token punctuation">&#123;</span>
  <span class="token string">'index.js'</span><span class="token punctuation">:</span> <span class="token keyword">function</span><span class="token punctuation">(</span><span class="token parameter">exports<span class="token punctuation">,</span> require</span><span class="token punctuation">)</span> <span class="token punctuation">&#123;</span>
    <span class="token keyword">const</span> square_import <span class="token operator">=</span> <span class="token function">require</span><span class="token punctuation">(</span><span class="token string">'square.js'</span><span class="token punctuation">)</span><span class="token punctuation">;</span>
    <span class="token comment">// 1. require circle.js</span>
    <span class="token keyword">const</span> circle_import <span class="token operator">=</span> <span class="token function">require</span><span class="token punctuation">(</span><span class="token string">'circle.js'</span><span class="token punctuation">)</span><span class="token punctuation">;</span>
    <span class="token comment">// 3. define PI on exports</span>
    exports<span class="token punctuation">.</span><span class="token constant">PI</span> <span class="token operator">=</span> <span class="token number">3.141</span><span class="token punctuation">;</span>
    <span class="token console class-name">console</span><span class="token punctuation">.</span><span class="token method function property-access">log</span><span class="token punctuation">(</span><span class="token string">'Area of square: '</span><span class="token punctuation">,</span> square_import<span class="token punctuation">[</span><span class="token string">'default'</span><span class="token punctuation">]</span><span class="token punctuation">(</span><span class="token number">5</span><span class="token punctuation">)</span><span class="token punctuation">)</span><span class="token punctuation">;</span>
    <span class="token comment">// 4. call &#96;circleArea&#96;</span>
    <span class="token console class-name">console</span><span class="token punctuation">.</span><span class="token method function property-access">log</span><span class="token punctuation">(</span><span class="token string">'Area of circle'</span><span class="token punctuation">,</span> circle_import<span class="token punctuation">[</span><span class="token string">'default'</span><span class="token punctuation">]</span><span class="token punctuation">(</span><span class="token number">5</span><span class="token punctuation">)</span><span class="token punctuation">)</span><span class="token punctuation">;</span>
  <span class="token punctuation">&#125;</span><span class="token punctuation">,</span>
  <span class="token string">'circle.js'</span><span class="token punctuation">:</span> <span class="token keyword">function</span><span class="token punctuation">(</span><span class="token parameter">exports<span class="token punctuation">,</span> require</span><span class="token punctuation">)</span> <span class="token punctuation">&#123;</span>
    <span class="token comment">// 2. we keep a reference of the &#96;index.js&#96;'s &#96;exports&#96; object</span>
    <span class="token keyword">const</span> index_import <span class="token operator">=</span> <span class="token function">require</span><span class="token punctuation">(</span><span class="token string">'index.js'</span><span class="token punctuation">)</span><span class="token punctuation">;</span>
    <span class="token keyword">function</span> <span class="token function">area</span><span class="token punctuation">(</span><span class="token parameter">radius</span><span class="token punctuation">)</span> <span class="token punctuation">&#123;</span>
      <span class="token comment">// 5. we get PI from the &#96;exports&#96;</span>
      <span class="token keyword">return</span> index_import<span class="token punctuation">[</span><span class="token string">'PI'</span><span class="token punctuation">]</span> <span class="token operator">*</span> radius <span class="token operator">*</span> radius<span class="token punctuation">;</span>
    <span class="token punctuation">&#125;</span>
    exports<span class="token punctuation">.</span><span class="token keyword module">default</span> <span class="token operator">=</span> area<span class="token punctuation">;</span>
  <span class="token punctuation">&#125;</span><span class="token punctuation">,</span>
<span class="token punctuation">&#125;</span></code>` + "";

	let t401;
	let p70;
	let t402;
	let code50;
	let t403;
	let t404;
	let t405;
	let p71;
	let t406;
	let a40;
	let t407;
	let t408;
	let t409;
	let section11;
	let h25;
	let a41;
	let t410;
	let t411;
	let p72;
	let t412;
	let strong21;
	let t413;
	let t414;
	let strong22;
	let t415;
	let t416;
	let t417;
	let p73;
	let t418;
	let strong23;
	let t419;
	let t420;
	let t421;
	let section12;
	let h35;
	let a42;
	let t422;
	let t423;
	let p74;
	let t424;
	let t425;
	let ul9;
	let li22;
	let t426;
	let t427;
	let li23;
	let t428;
	let t429;
	let p75;
	let t430;
	let t431;
	let p76;
	let t432;
	let t433;
	let section13;
	let h26;
	let a43;
	let t434;
	let t435;
	let ul10;
	let li24;
	let a44;
	let t436;
	let t437;
	let li25;
	let a45;
	let t438;
	let t439;
	let li26;
	let a46;
	let t440;
	let t441;
	let li27;
	let a47;
	let t442;

	return {
		c() {
			section0 = element("section");
			ul4 = element("ul");
			li0 = element("li");
			a0 = element("a");
			t0 = text("Getting Started");
			ul0 = element("ul");
			li1 = element("li");
			a1 = element("a");
			t1 = text("The Input");
			li2 = element("li");
			a2 = element("a");
			t2 = text("Writing");
			li3 = element("li");
			a3 = element("a");
			t3 = text("Resolving");
			li4 = element("li");
			a4 = element("a");
			t4 = text("Bundling");
			ul1 = element("ul");
			li5 = element("li");
			a5 = element("a");
			t5 = text("Grouping modules into files");
			li6 = element("li");
			a6 = element("a");
			t6 = text("Creating module map");
			li7 = element("li");
			a7 = element("a");
			li8 = element("li");
			a8 = element("a");
			t7 = text("Optimisation");
			ul2 = element("ul");
			li9 = element("li");
			a9 = element("a");
			t8 = text("Circular dependency");
			li10 = element("li");
			a10 = element("a");
			t9 = text("Summary");
			ul3 = element("ul");
			li11 = element("li");
			a11 = element("a");
			t10 = text("Whats next?");
			li12 = element("li");
			a12 = element("a");
			t11 = text("Further Readings");
			t12 = space();
			p0 = element("p");
			t13 = text("In my ");
			a13 = element("a");
			t14 = text("previous article");
			t15 = text(", I explained how module bundler works. I used ");
			a14 = element("a");
			t16 = text("webpack");
			t17 = text(" and ");
			a15 = element("a");
			t18 = text("rollup");
			t19 = text(" as example, how each of them gave us a different perspective on how we can bundle our JavaScript application.");
			t20 = space();
			p1 = element("p");
			t21 = text("In this article, I am going to show you how I wrote my module bundler. The module bundler itself is not production-ready, yet I learned a ton through the exercise, and I am ever more appreciative of what modern module bundlers have provided.");
			t22 = space();
			hr0 = element("hr");
			t23 = space();
			p2 = element("p");
			t24 = text("⚠️ ");
			strong0 = element("strong");
			t25 = text("Warning: Tons of JavaScript code ahead. 🙈😱😨");
			t26 = text(" ⚠️");
			t27 = space();
			hr1 = element("hr");
			t28 = space();
			section1 = element("section");
			h20 = element("h2");
			a16 = element("a");
			t29 = text("Getting Started");
			t30 = space();
			p3 = element("p");
			t31 = text("I talked about the input (the JavaScript modules) and the output (the bundled JavaScript file) of a module bundler in ");
			a17 = element("a");
			t32 = text("my previous article");
			t33 = text(". Now it's time to write a module bundler that takes in the input and produces the output.");
			t34 = space();
			p4 = element("p");
			t35 = text("A ");
			em0 = element("em");
			t36 = text("basic");
			t37 = text(" module bundler can be broken down into 2 parts:");
			t38 = space();
			ul5 = element("ul");
			li13 = element("li");
			t39 = text("Understands the code and constructs the dependency graph ");
			strong1 = element("strong");
			t40 = text("(Dependency Resolution)");
			t41 = space();
			li14 = element("li");
			t42 = text("Assembles the module into a single (or multiple) JavaScript file ");
			strong2 = element("strong");
			t43 = text("(Bundle)");
			t44 = space();
			blockquote0 = element("blockquote");
			p5 = element("p");
			t45 = text("A ");
			strong3 = element("strong");
			t46 = text("dependency graph");
			t47 = text(" is a graph representation of the dependency relationship between modules.");
			t48 = space();
			section2 = element("section");
			h30 = element("h3");
			a18 = element("a");
			t49 = text("The Input");
			t50 = space();
			p6 = element("p");
			t51 = text("In this article, I will be using following files as my input to the bundler:");
			t52 = space();
			pre0 = element("pre");
			t53 = space();
			pre1 = element("pre");
			t54 = space();
			pre2 = element("pre");
			t55 = space();
			p7 = element("p");
			t56 = text("I've created the project on ");
			a19 = element("a");
			t57 = text("Github");
			t58 = text(", so if you are interested to try out yourself, you can clone it and checkout the ");
			code0 = element("code");
			t59 = text("fixture-1");
			t60 = text(" tag. The input files are in the ");
			code1 = element("code");
			t61 = text("fixture/");
			t62 = text(" folder.");
			t63 = space();
			section3 = element("section");
			h21 = element("h2");
			a20 = element("a");
			t64 = text("Writing");
			t65 = space();
			p8 = element("p");
			t66 = text("I started with the main structure of the module bundler:");
			t67 = space();
			pre3 = element("pre");
			t68 = space();
			blockquote1 = element("blockquote");
			p9 = element("p");
			t69 = text("The ");
			strong4 = element("strong");
			t70 = text("dependency graph");
			t71 = text(" is a ");
			a21 = element("a");
			t72 = text("directed graph");
			t73 = text(", where the vertex is the module, and the directed edge is the dependency relationship between the modules.");
			t74 = space();
			pre4 = element("pre");
			t75 = space();
			p10 = element("p");
			t76 = text("So, the entry module is \"the root\" of the graph.");
			t77 = space();
			p11 = element("p");
			t78 = text("In ");
			code2 = element("code");
			t79 = text("createModule");
			t80 = text(", I instantiate a new ");
			code3 = element("code");
			t81 = text("Module");
			t82 = text(" instance:");
			t83 = space();
			pre5 = element("pre");
			t84 = space();
			p12 = element("p");
			t85 = text("The class ");
			code4 = element("code");
			t86 = text("Module");
			t87 = text(" will be used to record module properties, such as the content, the dependencies, exported keys, etc.");
			t88 = space();
			pre6 = element("pre");
			t89 = space();
			p13 = element("p");
			t90 = text("While the ");
			code5 = element("code");
			t91 = text("content");
			t92 = text(" is the string content of the module, to understand what it actually means, I used ");
			a22 = element("a");
			t93 = text("babel");
			t94 = text(" to ");
			em1 = element("em");
			t95 = text("parse the content");
			t96 = text(" into AST (Abstract Syntax Tree):");
			t97 = space();
			pre7 = element("pre");
			t98 = space();
			p14 = element("p");
			t99 = text("Next, I need to find out the dependency of this module:");
			t100 = space();
			pre8 = element("pre");
			t101 = space();
			p15 = element("p");
			t102 = text("So, how can I know what are the dependencies of this module?");
			t103 = space();
			p16 = element("p");
			t104 = text("I can look for the ");
			code6 = element("code");
			t105 = text("import");
			t106 = text(" statement from the AST with the help of the\n");
			a23 = element("a");
			t107 = text("babel-ast-explorer");
			t108 = text(".");
			t109 = space();
			p17 = element("p");
			img = element("img");
			t110 = space();
			p18 = element("p");
			t111 = text("I found out that the ");
			code7 = element("code");
			t112 = text("import");
			t113 = text(" statement in the AST is called the ");
			code8 = element("code");
			t114 = text("ImportDeclaration");
			t115 = text(". It has ");
			code9 = element("code");
			t116 = text("specifiers");
			t117 = text(" and ");
			code10 = element("code");
			t118 = text("source");
			t119 = text(", which the ");
			code11 = element("code");
			t120 = text("source.value");
			t121 = text(" tells us what this module is importing from:");
			t122 = space();
			pre9 = element("pre");
			t123 = space();
			p19 = element("p");
			t124 = text("So I had the path that the module is requesting, but it could be relative to the current file, eg ");
			code12 = element("code");
			t125 = text("\"./foo/bar\"");
			t126 = text(", or from the ");
			code13 = element("code");
			t127 = text("node_modules");
			t128 = text(", eg: ");
			code14 = element("code");
			t129 = text("\"lodash\"");
			t130 = text(". How do I know what is the ");
			strong5 = element("strong");
			t131 = text("actual file path");
			t132 = text(" that the module is requesting?");
			t133 = space();
			p20 = element("p");
			t134 = text("The step of figuring out the actual path based on the requested path, is called ");
			strong6 = element("strong");
			t135 = text("\"Resolving\"");
			t136 = text(":");
			t137 = space();
			pre10 = element("pre");
			t138 = space();
			p21 = element("p");
			em2 = element("em");
			t139 = text("Resolving path to the actual file path");
			t140 = space();
			section4 = element("section");
			h22 = element("h2");
			a24 = element("a");
			t141 = text("Resolving");
			t142 = space();
			p22 = element("p");
			t143 = text("Let's talk about resolving. We know that \"import\"ing ");
			code15 = element("code");
			t144 = text("./b.js");
			t145 = text(" in the following examples will result in getting a different file, because when we specify ");
			code16 = element("code");
			t146 = text("./");
			t147 = text(", we are \"import\"ing relative to the current file.");
			t148 = space();
			pre11 = element("pre");
			t149 = space();
			pre12 = element("pre");
			t150 = space();
			p23 = element("p");
			t151 = text("So, what are the rules of resolving a module?");
			t152 = space();
			p24 = element("p");
			t153 = text("The Node.js documentation has listed out the ");
			a25 = element("a");
			t154 = text("detailed step of the module resolving algorithm");
			t155 = text(":");
			t156 = space();
			p25 = element("p");
			t157 = text("When we specify a relative path, ");
			code17 = element("code");
			t158 = text("./b");
			t159 = text(", Node.js will first assume that ");
			code18 = element("code");
			t160 = text("./b");
			t161 = text(" is a file, and tries the following extension if it doesn't exactly match the file name:");
			t162 = space();
			pre13 = element("pre");
			t163 = space();
			p26 = element("p");
			t164 = text("If the file does not exist, Node.js will then try to treat ");
			code19 = element("code");
			t165 = text("./b");
			t166 = text(" as a directory, and try the following:");
			t167 = space();
			pre14 = element("pre");
			t168 = space();
			p27 = element("p");
			t169 = text("If we specify ");
			code20 = element("code");
			t170 = text("import 'b'");
			t171 = text(" instead, Node.js will treat it as a package within ");
			code21 = element("code");
			t172 = text("node_modules/");
			t173 = text(", and have a different resolving strategy.");
			t174 = space();
			p28 = element("p");
			t175 = text("Through the above illustration, we can see that resolving ");
			code22 = element("code");
			t176 = text("import './b'");
			t177 = text(" is not as simple as it seems. Besides the default Node.js resolving behaviour, ");
			a26 = element("a");
			t178 = text("webpack provides a lot more customisation options");
			t179 = text(", such as custom extensions, alias, modules folders, etc.");
			t180 = space();
			p29 = element("p");
			t181 = text("Here, I am showing you the ");
			em3 = element("em");
			t182 = text("\"simplest\"");
			t183 = text(" resolver, which is to resolve relative path only:");
			t184 = space();
			pre15 = element("pre");
			t185 = space();
			blockquote2 = element("blockquote");
			small0 = element("small");
			t186 = text("**Note:** You should try out writing a full node resolvers that resolve relatively as well as absolutely from `node_modules/`");
			t187 = space();
			p30 = element("p");
			t188 = text("Now I know the actual requested file paths, I then create modules out of them.");
			t189 = space();
			pre16 = element("pre");
			t190 = space();
			p31 = element("p");
			t191 = text("So, for each module, I find their dependencies, parse them, and find each dependency's dependencies, parse them as well, and find their dependencies, and so forth recursively. At the end of the process, I get a module dependency graph that looks something like this:");
			t192 = space();
			pre17 = element("pre");
			t193 = space();
			p32 = element("p");
			t194 = text("The root of the graph is our entry module, and you can traverse the graph through the ");
			code23 = element("code");
			t195 = text("dependencies");
			t196 = text(" of the module. As you can see, the ");
			code24 = element("code");
			t197 = text("index.js");
			t198 = text(" has 2 dependencies, the ");
			code25 = element("code");
			t199 = text("square.js");
			t200 = text(" and the ");
			code26 = element("code");
			t201 = text("circle.js");
			t202 = text(".");
			t203 = space();
			blockquote3 = element("blockquote");
			small1 = element("small");
			t204 = text("**Note:** If you are following along, you can checkout the tag `feat-1-module-dependency-graph`, to see the code that I had written up till this point.");
			t205 = space();
			section5 = element("section");
			h23 = element("h2");
			a27 = element("a");
			t206 = text("Bundling");
			t207 = space();
			p33 = element("p");
			t208 = text("With the module dependency graph, it's time to bundle them into a file!");
			t209 = space();
			p34 = element("p");
			t210 = text("At this point in time, we can choose whether we want to bundle it in the ");
			strong7 = element("strong");
			t211 = text("\"webpack way\"");
			t212 = text(" or the ");
			strong8 = element("strong");
			t213 = text("\"rollup way\"");
			t214 = text(". In this article I am showing you how I did it the ");
			strong9 = element("strong");
			t215 = text("\"webpack way\"");
			t216 = text(". I'll write about bundling in the ");
			strong10 = element("strong");
			t217 = text("\"rollup way\"");
			t218 = text(" in the coming article.");
			t219 = space();
			blockquote4 = element("blockquote");
			p35 = element("p");
			t220 = text("If you have no idea about what is the ");
			strong11 = element("strong");
			t221 = text("\"webpack way\"");
			t222 = text(" or ");
			strong12 = element("strong");
			t223 = text("\"rollup way\"");
			t224 = text(", I have \"coined\" the term in my ");
			a28 = element("a");
			t225 = text("previous article");
			t226 = text(" and have detailed explanation about them!");
			t227 = space();
			p36 = element("p");
			t228 = text("Let's take a look how the final bundled file would look like:");
			t229 = space();
			pre18 = element("pre");
			t230 = space();
			p37 = element("p");
			t231 = text("Let's break it down to a few steps:");
			t232 = space();
			ul6 = element("ul");
			li15 = element("li");
			strong13 = element("strong");
			t233 = text("Group modules into files");
			t234 = space();
			li16 = element("li");
			strong14 = element("strong");
			t235 = text("Create the module map");
			t236 = text(" and wrapping each module in a \"special\" module factory function");
			t237 = space();
			li17 = element("li");
			strong15 = element("strong");
			t238 = text("Create the \"runtime\"");
			t239 = text(", the glue that links each module together.");
			t240 = space();
			section6 = element("section");
			h31 = element("h3");
			a29 = element("a");
			t241 = text("Grouping modules into files");
			t242 = space();
			p38 = element("p");
			t243 = text("This step is to decide which modules goes to which file. We can split modules into different files because of ");
			a30 = element("a");
			t244 = text("code splitting");
			t245 = text(" due to dynamic import as well as optimisation, such as the webpack's ");
			a31 = element("a");
			t246 = text("Chunk Splitting");
			t247 = text(".");
			t248 = space();
			p39 = element("p");
			t249 = text("I will support code splitting in the future. For now, I grouped all modules into 1 file.");
			t250 = space();
			p40 = element("p");
			t251 = text("To collect all the modules from module graph into a list of modules, I did a graph traversal:");
			t252 = space();
			pre19 = element("pre");
			t253 = space();
			p41 = element("p");
			t254 = text("...and I used the list of modules to create a module map.");
			t255 = space();
			section7 = element("section");
			h32 = element("h3");
			a32 = element("a");
			t256 = text("Creating module map");
			t257 = space();
			p42 = element("p");
			t258 = text("The module map I created is a string, that would be inlined into the final bundle file.");
			t259 = space();
			p43 = element("p");
			t260 = text("I looped through each module, and used ");
			code27 = element("code");
			t261 = text("module.filePath");
			t262 = text(" as the key, and ");
			code28 = element("code");
			t263 = text("module.content");
			t264 = text(" as the value.");
			t265 = space();
			p44 = element("p");
			t266 = text("The reason I dont use ");
			code29 = element("code");
			t267 = text("JSON.stringify(moduleMap)");
			t268 = text(" instead of manually concatenating to build up the module map, is because JSON can only takes in ");
			a33 = element("a");
			t269 = text("JSON primitive data type");
			t270 = text(" as value, but what I built here is a JavaScript map, with ");
			code30 = element("code");
			t271 = text("function");
			t272 = text(" as value, but in string.");
			t273 = space();
			pre20 = element("pre");
			t274 = space();
			p45 = element("p");
			t275 = text("The function that wraps around the ");
			code31 = element("code");
			t276 = text("module.content");
			t277 = text(" is called the module factory function. It provides 2 parameter to the module:");
			t278 = space();
			ul7 = element("ul");
			li18 = element("li");
			code32 = element("code");
			t279 = text("exports");
			t280 = text(", an object that the module can assign its exported value onto");
			t281 = space();
			li19 = element("li");
			code33 = element("code");
			t282 = text("require");
			t283 = text(", a function that the module can invoke with module path to import exported value from another module");
			t284 = space();
			p46 = element("p");
			t285 = text("The module map right now is not something that can be executed:");
			t286 = space();
			pre21 = element("pre");
			t287 = space();
			p47 = element("p");
			t288 = text("because it still uses ");
			code34 = element("code");
			t289 = text("import");
			t290 = text(" and ");
			code35 = element("code");
			t291 = text("export");
			t292 = text(". I had to transform them to use the ");
			code36 = element("code");
			t293 = text("exports");
			t294 = text(" and ");
			code37 = element("code");
			t295 = text("require");
			t296 = text(" that we pass in.");
			t297 = space();
			p48 = element("p");
			t298 = text("To transform the code, I used the AST of the module again: trasform the ast and generate the new code from the transformed ast.");
			t299 = space();
			p49 = element("p");
			t300 = text("What I need is to trasform the \"from\" to \"to\" of the following:");
			t301 = space();
			pre22 = element("pre");
			t302 = space();
			blockquote5 = element("blockquote");
			p50 = element("p");
			t303 = text("I wrote a ");
			a34 = element("a");
			t304 = text("step by step guide");
			t305 = text(" on how to write babel transformation, please do check it out.");
			t306 = space();
			p51 = element("p");
			t307 = text("Knowing ");
			strong16 = element("strong");
			t308 = text("what to target on AST");
			t309 = text(" and ");
			strong17 = element("strong");
			t310 = text("how the transformed AST look like");
			t311 = text(", I wrote my transformation code:");
			t312 = space();
			pre23 = element("pre");
			t313 = space();
			p52 = element("p");
			t314 = text("I omitted the actual babel transformation code, because it is lengthy. If you are interested to read about it, you can check out ");
			a35 = element("a");
			t315 = text("from my Github repo");
			t316 = space();
			p53 = element("p");
			t317 = text("So, now the module map looks ready:");
			t318 = space();
			pre24 = element("pre");
			t319 = space();
			p54 = element("p");
			t320 = text("One thing to take note is that, for the ");
			code38 = element("code");
			t321 = text("require");
			t322 = text(" statements, I replaced the requested path to the actual resolved path, because I used the actual resolved path as the key to the module map.");
			t323 = space();
			section8 = element("section");
			h33 = element("h3");
			a36 = element("a");
			strong18 = element("strong");
			t324 = text("Create the \"runtime\"");
			t325 = space();
			p55 = element("p");
			t326 = text("Now it's time to create the runtime. The runtime is a piece of code that is part of the output bundle, that runs when the application code is running, therefore, the runtime.");
			t327 = space();
			p56 = element("p");
			t328 = text("The runtime code can be from a template file, but for simplicity sake, I kept the runtime code as a string:");
			t329 = space();
			pre25 = element("pre");
			t330 = space();
			p57 = element("p");
			t331 = text("The code above is self explanatory, except if you have no idea what does the ");
			code39 = element("code");
			t332 = text("webpackStart()");
			t333 = text(" do, you can read more about it in ");
			a37 = element("a");
			t334 = text("my previous post");
			t335 = text(".");
			t336 = space();
			p58 = element("p");
			t337 = text("Finally, I returned the module code from the ");
			code40 = element("code");
			t338 = text("bundle");
			t339 = text(" function:");
			t340 = space();
			pre26 = element("pre");
			t341 = space();
			p59 = element("p");
			t342 = text("Now I run my bundler, it generates a ");
			code41 = element("code");
			t343 = text("output/bundle.js");
			t344 = text(" file. I run the generated file with node and I see:");
			t345 = space();
			pre27 = element("pre");
			t346 = space();
			p60 = element("p");
			t347 = text("That's it! A working module bundler!");
			t348 = space();
			p61 = element("p");
			t349 = text("Of course, the module bundler I've shown here is ");
			strong19 = element("strong");
			t350 = text("nowhere near webpack");
			t351 = text(". Webpack supports more module system, resolving strategies, loading strategies, plugin system, optimisation, and many many more.");
			t352 = space();
			section9 = element("section");
			h24 = element("h2");
			a38 = element("a");
			t353 = text("Optimisation");
			t354 = space();
			p62 = element("p");
			t355 = text("I played around my module bundler, and I quickly noticed a bug: ");
			strong20 = element("strong");
			t356 = text("Circular Dependency");
			t357 = text(".");
			t358 = space();
			p63 = element("p");
			t359 = text("Here's my input files that I've tweaked:");
			t360 = space();
			pre28 = element("pre");
			t361 = space();
			pre29 = element("pre");
			t362 = space();
			p64 = element("p");
			t363 = text("When I ran it through my module bunlder, immediately it ran into a stack overflow:");
			t364 = space();
			pre30 = element("pre");
			t365 = space();
			section10 = element("section");
			h34 = element("h3");
			a39 = element("a");
			t366 = text("Circular dependency");
			t367 = space();
			p65 = element("p");
			t368 = text("There were 2 junctures that the code did recursive traversal which have led to the endless loop:");
			t369 = space();
			ul8 = element("ul");
			li20 = element("li");
			t370 = text("Generating dependency graphs");
			t371 = space();
			li21 = element("li");
			t372 = text("Traversing module graph for bundling");
			t373 = space();
			pre31 = element("pre");
			t374 = space();
			p66 = element("p");
			t375 = text("Bundle with the latest code, the stack overflow is gone. However when I executed the output bundle, I saw");
			t376 = space();
			pre32 = element("pre");
			t377 = space();
			p67 = element("p");
			t378 = text("So I took a look at the output bundle:");
			t379 = space();
			pre33 = element("pre");
			t380 = space();
			p68 = element("p");
			t381 = text("So, the problem is that I destructed ");
			code42 = element("code");
			t382 = text("PI");
			t383 = text(" from the exports of ");
			code43 = element("code");
			t384 = text("index.js");
			t385 = text(" before it is defined, so naturally ");
			code44 = element("code");
			t386 = text("PI");
			t387 = text(" within ");
			code45 = element("code");
			t388 = text("circle.js");
			t389 = text(" would stay as ");
			code46 = element("code");
			t390 = text("undefined");
			t391 = text(" throughout the application. However before I called ");
			code47 = element("code");
			t392 = text("circleArea");
			t393 = text(", we defined ");
			code48 = element("code");
			t394 = text("PI");
			t395 = text(" on the ");
			code49 = element("code");
			t396 = text("index.js");
			t397 = text("'s export, I am expecting it to be available.");
			t398 = space();
			p69 = element("p");
			t399 = text("So I built my application with webpack and took a look at how webpack solved this problem.");
			t400 = space();
			pre34 = element("pre");
			t401 = space();
			p70 = element("p");
			t402 = text("Brilliant! The key is to lazily get the value of ");
			code50 = element("code");
			t403 = text("PI");
			t404 = text(" when needed!");
			t405 = space();
			p71 = element("p");
			t406 = text("I changed my babel transformation code, which I am not showing it here. If you are curious enough, you can check out ");
			a40 = element("a");
			t407 = text("the changes I made from Github");
			t408 = text(".");
			t409 = space();
			section11 = element("section");
			h25 = element("h2");
			a41 = element("a");
			t410 = text("Summary");
			t411 = space();
			p72 = element("p");
			t412 = text("There's two phases in module bundling: ");
			strong21 = element("strong");
			t413 = text("Dependency Resolution");
			t414 = text(" and ");
			strong22 = element("strong");
			t415 = text("Bundling");
			t416 = text(".");
			t417 = space();
			p73 = element("p");
			t418 = text("I showed you how I constructed the dependency graph, by finding import statements and resolving modules. I shared how I created module maps and transformed the imports / exports syntax during ");
			strong23 = element("strong");
			t419 = text("bundling");
			t420 = text(". Lastly, I fixed the circular dependency bug that was in the first version of my module bundler.");
			t421 = space();
			section12 = element("section");
			h35 = element("h3");
			a42 = element("a");
			t422 = text("Whats next?");
			t423 = space();
			p74 = element("p");
			t424 = text("I have a few ideas that I will add to my module bundler, such as:");
			t425 = space();
			ul9 = element("ul");
			li22 = element("li");
			t426 = text("code spliting");
			t427 = space();
			li23 = element("li");
			t428 = text("watch mode and reloading");
			t429 = space();
			p75 = element("p");
			t430 = text("which I will cover them in my next article when they are ready.");
			t431 = space();
			p76 = element("p");
			t432 = text("Till then. Cheers. 😎");
			t433 = space();
			section13 = element("section");
			h26 = element("h2");
			a43 = element("a");
			t434 = text("Further Readings");
			t435 = space();
			ul10 = element("ul");
			li24 = element("li");
			a44 = element("a");
			t436 = text("Ronen Amiel, Build Your Own Webpack - You Gotta Love Frontend 2018");
			t437 = space();
			li25 = element("li");
			a45 = element("a");
			t438 = text("Luciano Mammino, Unbundling the JavaScript module bundler - DublinJS July 2018");
			t439 = space();
			li26 = element("li");
			a46 = element("a");
			t440 = text("Adam Kelly, Let’s learn how module bundlers work and then write one ourselves");
			t441 = space();
			li27 = element("li");
			a47 = element("a");
			t442 = text("Webpack founder Tobias Koppers demos bundling live by hand");
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
			t0 = claim_text(a0_nodes, "Getting Started");
			a0_nodes.forEach(detach);
			li0_nodes.forEach(detach);
			ul0 = claim_element(ul4_nodes, "UL", {});
			var ul0_nodes = children(ul0);
			li1 = claim_element(ul0_nodes, "LI", {});
			var li1_nodes = children(li1);
			a1 = claim_element(li1_nodes, "A", { href: true });
			var a1_nodes = children(a1);
			t1 = claim_text(a1_nodes, "The Input");
			a1_nodes.forEach(detach);
			li1_nodes.forEach(detach);
			ul0_nodes.forEach(detach);
			li2 = claim_element(ul4_nodes, "LI", {});
			var li2_nodes = children(li2);
			a2 = claim_element(li2_nodes, "A", { href: true });
			var a2_nodes = children(a2);
			t2 = claim_text(a2_nodes, "Writing");
			a2_nodes.forEach(detach);
			li2_nodes.forEach(detach);
			li3 = claim_element(ul4_nodes, "LI", {});
			var li3_nodes = children(li3);
			a3 = claim_element(li3_nodes, "A", { href: true });
			var a3_nodes = children(a3);
			t3 = claim_text(a3_nodes, "Resolving");
			a3_nodes.forEach(detach);
			li3_nodes.forEach(detach);
			li4 = claim_element(ul4_nodes, "LI", {});
			var li4_nodes = children(li4);
			a4 = claim_element(li4_nodes, "A", { href: true });
			var a4_nodes = children(a4);
			t4 = claim_text(a4_nodes, "Bundling");
			a4_nodes.forEach(detach);
			li4_nodes.forEach(detach);
			ul1 = claim_element(ul4_nodes, "UL", {});
			var ul1_nodes = children(ul1);
			li5 = claim_element(ul1_nodes, "LI", {});
			var li5_nodes = children(li5);
			a5 = claim_element(li5_nodes, "A", { href: true });
			var a5_nodes = children(a5);
			t5 = claim_text(a5_nodes, "Grouping modules into files");
			a5_nodes.forEach(detach);
			li5_nodes.forEach(detach);
			li6 = claim_element(ul1_nodes, "LI", {});
			var li6_nodes = children(li6);
			a6 = claim_element(li6_nodes, "A", { href: true });
			var a6_nodes = children(a6);
			t6 = claim_text(a6_nodes, "Creating module map");
			a6_nodes.forEach(detach);
			li6_nodes.forEach(detach);
			li7 = claim_element(ul1_nodes, "LI", {});
			var li7_nodes = children(li7);
			a7 = claim_element(li7_nodes, "A", { href: true });
			children(a7).forEach(detach);
			li7_nodes.forEach(detach);
			ul1_nodes.forEach(detach);
			li8 = claim_element(ul4_nodes, "LI", {});
			var li8_nodes = children(li8);
			a8 = claim_element(li8_nodes, "A", { href: true });
			var a8_nodes = children(a8);
			t7 = claim_text(a8_nodes, "Optimisation");
			a8_nodes.forEach(detach);
			li8_nodes.forEach(detach);
			ul2 = claim_element(ul4_nodes, "UL", {});
			var ul2_nodes = children(ul2);
			li9 = claim_element(ul2_nodes, "LI", {});
			var li9_nodes = children(li9);
			a9 = claim_element(li9_nodes, "A", { href: true });
			var a9_nodes = children(a9);
			t8 = claim_text(a9_nodes, "Circular dependency");
			a9_nodes.forEach(detach);
			li9_nodes.forEach(detach);
			ul2_nodes.forEach(detach);
			li10 = claim_element(ul4_nodes, "LI", {});
			var li10_nodes = children(li10);
			a10 = claim_element(li10_nodes, "A", { href: true });
			var a10_nodes = children(a10);
			t9 = claim_text(a10_nodes, "Summary");
			a10_nodes.forEach(detach);
			li10_nodes.forEach(detach);
			ul3 = claim_element(ul4_nodes, "UL", {});
			var ul3_nodes = children(ul3);
			li11 = claim_element(ul3_nodes, "LI", {});
			var li11_nodes = children(li11);
			a11 = claim_element(li11_nodes, "A", { href: true });
			var a11_nodes = children(a11);
			t10 = claim_text(a11_nodes, "Whats next?");
			a11_nodes.forEach(detach);
			li11_nodes.forEach(detach);
			ul3_nodes.forEach(detach);
			li12 = claim_element(ul4_nodes, "LI", {});
			var li12_nodes = children(li12);
			a12 = claim_element(li12_nodes, "A", { href: true });
			var a12_nodes = children(a12);
			t11 = claim_text(a12_nodes, "Further Readings");
			a12_nodes.forEach(detach);
			li12_nodes.forEach(detach);
			ul4_nodes.forEach(detach);
			section0_nodes.forEach(detach);
			t12 = claim_space(nodes);
			p0 = claim_element(nodes, "P", {});
			var p0_nodes = children(p0);
			t13 = claim_text(p0_nodes, "In my ");
			a13 = claim_element(p0_nodes, "A", { href: true });
			var a13_nodes = children(a13);
			t14 = claim_text(a13_nodes, "previous article");
			a13_nodes.forEach(detach);
			t15 = claim_text(p0_nodes, ", I explained how module bundler works. I used ");
			a14 = claim_element(p0_nodes, "A", { href: true, rel: true });
			var a14_nodes = children(a14);
			t16 = claim_text(a14_nodes, "webpack");
			a14_nodes.forEach(detach);
			t17 = claim_text(p0_nodes, " and ");
			a15 = claim_element(p0_nodes, "A", { href: true, rel: true });
			var a15_nodes = children(a15);
			t18 = claim_text(a15_nodes, "rollup");
			a15_nodes.forEach(detach);
			t19 = claim_text(p0_nodes, " as example, how each of them gave us a different perspective on how we can bundle our JavaScript application.");
			p0_nodes.forEach(detach);
			t20 = claim_space(nodes);
			p1 = claim_element(nodes, "P", {});
			var p1_nodes = children(p1);
			t21 = claim_text(p1_nodes, "In this article, I am going to show you how I wrote my module bundler. The module bundler itself is not production-ready, yet I learned a ton through the exercise, and I am ever more appreciative of what modern module bundlers have provided.");
			p1_nodes.forEach(detach);
			t22 = claim_space(nodes);
			hr0 = claim_element(nodes, "HR", {});
			t23 = claim_space(nodes);
			p2 = claim_element(nodes, "P", {});
			var p2_nodes = children(p2);
			t24 = claim_text(p2_nodes, "⚠️ ");
			strong0 = claim_element(p2_nodes, "STRONG", {});
			var strong0_nodes = children(strong0);
			t25 = claim_text(strong0_nodes, "Warning: Tons of JavaScript code ahead. 🙈😱😨");
			strong0_nodes.forEach(detach);
			t26 = claim_text(p2_nodes, " ⚠️");
			p2_nodes.forEach(detach);
			t27 = claim_space(nodes);
			hr1 = claim_element(nodes, "HR", {});
			t28 = claim_space(nodes);
			section1 = claim_element(nodes, "SECTION", {});
			var section1_nodes = children(section1);
			h20 = claim_element(section1_nodes, "H2", {});
			var h20_nodes = children(h20);
			a16 = claim_element(h20_nodes, "A", { href: true, id: true });
			var a16_nodes = children(a16);
			t29 = claim_text(a16_nodes, "Getting Started");
			a16_nodes.forEach(detach);
			h20_nodes.forEach(detach);
			t30 = claim_space(section1_nodes);
			p3 = claim_element(section1_nodes, "P", {});
			var p3_nodes = children(p3);
			t31 = claim_text(p3_nodes, "I talked about the input (the JavaScript modules) and the output (the bundled JavaScript file) of a module bundler in ");
			a17 = claim_element(p3_nodes, "A", { href: true });
			var a17_nodes = children(a17);
			t32 = claim_text(a17_nodes, "my previous article");
			a17_nodes.forEach(detach);
			t33 = claim_text(p3_nodes, ". Now it's time to write a module bundler that takes in the input and produces the output.");
			p3_nodes.forEach(detach);
			t34 = claim_space(section1_nodes);
			p4 = claim_element(section1_nodes, "P", {});
			var p4_nodes = children(p4);
			t35 = claim_text(p4_nodes, "A ");
			em0 = claim_element(p4_nodes, "EM", {});
			var em0_nodes = children(em0);
			t36 = claim_text(em0_nodes, "basic");
			em0_nodes.forEach(detach);
			t37 = claim_text(p4_nodes, " module bundler can be broken down into 2 parts:");
			p4_nodes.forEach(detach);
			t38 = claim_space(section1_nodes);
			ul5 = claim_element(section1_nodes, "UL", {});
			var ul5_nodes = children(ul5);
			li13 = claim_element(ul5_nodes, "LI", {});
			var li13_nodes = children(li13);
			t39 = claim_text(li13_nodes, "Understands the code and constructs the dependency graph ");
			strong1 = claim_element(li13_nodes, "STRONG", {});
			var strong1_nodes = children(strong1);
			t40 = claim_text(strong1_nodes, "(Dependency Resolution)");
			strong1_nodes.forEach(detach);
			li13_nodes.forEach(detach);
			t41 = claim_space(ul5_nodes);
			li14 = claim_element(ul5_nodes, "LI", {});
			var li14_nodes = children(li14);
			t42 = claim_text(li14_nodes, "Assembles the module into a single (or multiple) JavaScript file ");
			strong2 = claim_element(li14_nodes, "STRONG", {});
			var strong2_nodes = children(strong2);
			t43 = claim_text(strong2_nodes, "(Bundle)");
			strong2_nodes.forEach(detach);
			li14_nodes.forEach(detach);
			ul5_nodes.forEach(detach);
			t44 = claim_space(section1_nodes);
			blockquote0 = claim_element(section1_nodes, "BLOCKQUOTE", {});
			var blockquote0_nodes = children(blockquote0);
			p5 = claim_element(blockquote0_nodes, "P", {});
			var p5_nodes = children(p5);
			t45 = claim_text(p5_nodes, "A ");
			strong3 = claim_element(p5_nodes, "STRONG", {});
			var strong3_nodes = children(strong3);
			t46 = claim_text(strong3_nodes, "dependency graph");
			strong3_nodes.forEach(detach);
			t47 = claim_text(p5_nodes, " is a graph representation of the dependency relationship between modules.");
			p5_nodes.forEach(detach);
			blockquote0_nodes.forEach(detach);
			section1_nodes.forEach(detach);
			t48 = claim_space(nodes);
			section2 = claim_element(nodes, "SECTION", {});
			var section2_nodes = children(section2);
			h30 = claim_element(section2_nodes, "H3", {});
			var h30_nodes = children(h30);
			a18 = claim_element(h30_nodes, "A", { href: true, id: true });
			var a18_nodes = children(a18);
			t49 = claim_text(a18_nodes, "The Input");
			a18_nodes.forEach(detach);
			h30_nodes.forEach(detach);
			t50 = claim_space(section2_nodes);
			p6 = claim_element(section2_nodes, "P", {});
			var p6_nodes = children(p6);
			t51 = claim_text(p6_nodes, "In this article, I will be using following files as my input to the bundler:");
			p6_nodes.forEach(detach);
			t52 = claim_space(section2_nodes);
			pre0 = claim_element(section2_nodes, "PRE", { class: true });
			var pre0_nodes = children(pre0);
			pre0_nodes.forEach(detach);
			t53 = claim_space(section2_nodes);
			pre1 = claim_element(section2_nodes, "PRE", { class: true });
			var pre1_nodes = children(pre1);
			pre1_nodes.forEach(detach);
			t54 = claim_space(section2_nodes);
			pre2 = claim_element(section2_nodes, "PRE", { class: true });
			var pre2_nodes = children(pre2);
			pre2_nodes.forEach(detach);
			t55 = claim_space(section2_nodes);
			p7 = claim_element(section2_nodes, "P", {});
			var p7_nodes = children(p7);
			t56 = claim_text(p7_nodes, "I've created the project on ");
			a19 = claim_element(p7_nodes, "A", { href: true, rel: true });
			var a19_nodes = children(a19);
			t57 = claim_text(a19_nodes, "Github");
			a19_nodes.forEach(detach);
			t58 = claim_text(p7_nodes, ", so if you are interested to try out yourself, you can clone it and checkout the ");
			code0 = claim_element(p7_nodes, "CODE", {});
			var code0_nodes = children(code0);
			t59 = claim_text(code0_nodes, "fixture-1");
			code0_nodes.forEach(detach);
			t60 = claim_text(p7_nodes, " tag. The input files are in the ");
			code1 = claim_element(p7_nodes, "CODE", {});
			var code1_nodes = children(code1);
			t61 = claim_text(code1_nodes, "fixture/");
			code1_nodes.forEach(detach);
			t62 = claim_text(p7_nodes, " folder.");
			p7_nodes.forEach(detach);
			section2_nodes.forEach(detach);
			t63 = claim_space(nodes);
			section3 = claim_element(nodes, "SECTION", {});
			var section3_nodes = children(section3);
			h21 = claim_element(section3_nodes, "H2", {});
			var h21_nodes = children(h21);
			a20 = claim_element(h21_nodes, "A", { href: true, id: true });
			var a20_nodes = children(a20);
			t64 = claim_text(a20_nodes, "Writing");
			a20_nodes.forEach(detach);
			h21_nodes.forEach(detach);
			t65 = claim_space(section3_nodes);
			p8 = claim_element(section3_nodes, "P", {});
			var p8_nodes = children(p8);
			t66 = claim_text(p8_nodes, "I started with the main structure of the module bundler:");
			p8_nodes.forEach(detach);
			t67 = claim_space(section3_nodes);
			pre3 = claim_element(section3_nodes, "PRE", { class: true });
			var pre3_nodes = children(pre3);
			pre3_nodes.forEach(detach);
			t68 = claim_space(section3_nodes);
			blockquote1 = claim_element(section3_nodes, "BLOCKQUOTE", {});
			var blockquote1_nodes = children(blockquote1);
			p9 = claim_element(blockquote1_nodes, "P", {});
			var p9_nodes = children(p9);
			t69 = claim_text(p9_nodes, "The ");
			strong4 = claim_element(p9_nodes, "STRONG", {});
			var strong4_nodes = children(strong4);
			t70 = claim_text(strong4_nodes, "dependency graph");
			strong4_nodes.forEach(detach);
			t71 = claim_text(p9_nodes, " is a ");
			a21 = claim_element(p9_nodes, "A", { href: true, rel: true });
			var a21_nodes = children(a21);
			t72 = claim_text(a21_nodes, "directed graph");
			a21_nodes.forEach(detach);
			t73 = claim_text(p9_nodes, ", where the vertex is the module, and the directed edge is the dependency relationship between the modules.");
			p9_nodes.forEach(detach);
			blockquote1_nodes.forEach(detach);
			t74 = claim_space(section3_nodes);
			pre4 = claim_element(section3_nodes, "PRE", { class: true });
			var pre4_nodes = children(pre4);
			pre4_nodes.forEach(detach);
			t75 = claim_space(section3_nodes);
			p10 = claim_element(section3_nodes, "P", {});
			var p10_nodes = children(p10);
			t76 = claim_text(p10_nodes, "So, the entry module is \"the root\" of the graph.");
			p10_nodes.forEach(detach);
			t77 = claim_space(section3_nodes);
			p11 = claim_element(section3_nodes, "P", {});
			var p11_nodes = children(p11);
			t78 = claim_text(p11_nodes, "In ");
			code2 = claim_element(p11_nodes, "CODE", {});
			var code2_nodes = children(code2);
			t79 = claim_text(code2_nodes, "createModule");
			code2_nodes.forEach(detach);
			t80 = claim_text(p11_nodes, ", I instantiate a new ");
			code3 = claim_element(p11_nodes, "CODE", {});
			var code3_nodes = children(code3);
			t81 = claim_text(code3_nodes, "Module");
			code3_nodes.forEach(detach);
			t82 = claim_text(p11_nodes, " instance:");
			p11_nodes.forEach(detach);
			t83 = claim_space(section3_nodes);
			pre5 = claim_element(section3_nodes, "PRE", { class: true });
			var pre5_nodes = children(pre5);
			pre5_nodes.forEach(detach);
			t84 = claim_space(section3_nodes);
			p12 = claim_element(section3_nodes, "P", {});
			var p12_nodes = children(p12);
			t85 = claim_text(p12_nodes, "The class ");
			code4 = claim_element(p12_nodes, "CODE", {});
			var code4_nodes = children(code4);
			t86 = claim_text(code4_nodes, "Module");
			code4_nodes.forEach(detach);
			t87 = claim_text(p12_nodes, " will be used to record module properties, such as the content, the dependencies, exported keys, etc.");
			p12_nodes.forEach(detach);
			t88 = claim_space(section3_nodes);
			pre6 = claim_element(section3_nodes, "PRE", { class: true });
			var pre6_nodes = children(pre6);
			pre6_nodes.forEach(detach);
			t89 = claim_space(section3_nodes);
			p13 = claim_element(section3_nodes, "P", {});
			var p13_nodes = children(p13);
			t90 = claim_text(p13_nodes, "While the ");
			code5 = claim_element(p13_nodes, "CODE", {});
			var code5_nodes = children(code5);
			t91 = claim_text(code5_nodes, "content");
			code5_nodes.forEach(detach);
			t92 = claim_text(p13_nodes, " is the string content of the module, to understand what it actually means, I used ");
			a22 = claim_element(p13_nodes, "A", { href: true, rel: true });
			var a22_nodes = children(a22);
			t93 = claim_text(a22_nodes, "babel");
			a22_nodes.forEach(detach);
			t94 = claim_text(p13_nodes, " to ");
			em1 = claim_element(p13_nodes, "EM", {});
			var em1_nodes = children(em1);
			t95 = claim_text(em1_nodes, "parse the content");
			em1_nodes.forEach(detach);
			t96 = claim_text(p13_nodes, " into AST (Abstract Syntax Tree):");
			p13_nodes.forEach(detach);
			t97 = claim_space(section3_nodes);
			pre7 = claim_element(section3_nodes, "PRE", { class: true });
			var pre7_nodes = children(pre7);
			pre7_nodes.forEach(detach);
			t98 = claim_space(section3_nodes);
			p14 = claim_element(section3_nodes, "P", {});
			var p14_nodes = children(p14);
			t99 = claim_text(p14_nodes, "Next, I need to find out the dependency of this module:");
			p14_nodes.forEach(detach);
			t100 = claim_space(section3_nodes);
			pre8 = claim_element(section3_nodes, "PRE", { class: true });
			var pre8_nodes = children(pre8);
			pre8_nodes.forEach(detach);
			t101 = claim_space(section3_nodes);
			p15 = claim_element(section3_nodes, "P", {});
			var p15_nodes = children(p15);
			t102 = claim_text(p15_nodes, "So, how can I know what are the dependencies of this module?");
			p15_nodes.forEach(detach);
			t103 = claim_space(section3_nodes);
			p16 = claim_element(section3_nodes, "P", {});
			var p16_nodes = children(p16);
			t104 = claim_text(p16_nodes, "I can look for the ");
			code6 = claim_element(p16_nodes, "CODE", {});
			var code6_nodes = children(code6);
			t105 = claim_text(code6_nodes, "import");
			code6_nodes.forEach(detach);
			t106 = claim_text(p16_nodes, " statement from the AST with the help of the\n");
			a23 = claim_element(p16_nodes, "A", { href: true, rel: true });
			var a23_nodes = children(a23);
			t107 = claim_text(a23_nodes, "babel-ast-explorer");
			a23_nodes.forEach(detach);
			t108 = claim_text(p16_nodes, ".");
			p16_nodes.forEach(detach);
			t109 = claim_space(section3_nodes);
			p17 = claim_element(section3_nodes, "P", {});
			var p17_nodes = children(p17);
			img = claim_element(p17_nodes, "IMG", { src: true, alt: true, title: true });
			p17_nodes.forEach(detach);
			t110 = claim_space(section3_nodes);
			p18 = claim_element(section3_nodes, "P", {});
			var p18_nodes = children(p18);
			t111 = claim_text(p18_nodes, "I found out that the ");
			code7 = claim_element(p18_nodes, "CODE", {});
			var code7_nodes = children(code7);
			t112 = claim_text(code7_nodes, "import");
			code7_nodes.forEach(detach);
			t113 = claim_text(p18_nodes, " statement in the AST is called the ");
			code8 = claim_element(p18_nodes, "CODE", {});
			var code8_nodes = children(code8);
			t114 = claim_text(code8_nodes, "ImportDeclaration");
			code8_nodes.forEach(detach);
			t115 = claim_text(p18_nodes, ". It has ");
			code9 = claim_element(p18_nodes, "CODE", {});
			var code9_nodes = children(code9);
			t116 = claim_text(code9_nodes, "specifiers");
			code9_nodes.forEach(detach);
			t117 = claim_text(p18_nodes, " and ");
			code10 = claim_element(p18_nodes, "CODE", {});
			var code10_nodes = children(code10);
			t118 = claim_text(code10_nodes, "source");
			code10_nodes.forEach(detach);
			t119 = claim_text(p18_nodes, ", which the ");
			code11 = claim_element(p18_nodes, "CODE", {});
			var code11_nodes = children(code11);
			t120 = claim_text(code11_nodes, "source.value");
			code11_nodes.forEach(detach);
			t121 = claim_text(p18_nodes, " tells us what this module is importing from:");
			p18_nodes.forEach(detach);
			t122 = claim_space(section3_nodes);
			pre9 = claim_element(section3_nodes, "PRE", { class: true });
			var pre9_nodes = children(pre9);
			pre9_nodes.forEach(detach);
			t123 = claim_space(section3_nodes);
			p19 = claim_element(section3_nodes, "P", {});
			var p19_nodes = children(p19);
			t124 = claim_text(p19_nodes, "So I had the path that the module is requesting, but it could be relative to the current file, eg ");
			code12 = claim_element(p19_nodes, "CODE", {});
			var code12_nodes = children(code12);
			t125 = claim_text(code12_nodes, "\"./foo/bar\"");
			code12_nodes.forEach(detach);
			t126 = claim_text(p19_nodes, ", or from the ");
			code13 = claim_element(p19_nodes, "CODE", {});
			var code13_nodes = children(code13);
			t127 = claim_text(code13_nodes, "node_modules");
			code13_nodes.forEach(detach);
			t128 = claim_text(p19_nodes, ", eg: ");
			code14 = claim_element(p19_nodes, "CODE", {});
			var code14_nodes = children(code14);
			t129 = claim_text(code14_nodes, "\"lodash\"");
			code14_nodes.forEach(detach);
			t130 = claim_text(p19_nodes, ". How do I know what is the ");
			strong5 = claim_element(p19_nodes, "STRONG", {});
			var strong5_nodes = children(strong5);
			t131 = claim_text(strong5_nodes, "actual file path");
			strong5_nodes.forEach(detach);
			t132 = claim_text(p19_nodes, " that the module is requesting?");
			p19_nodes.forEach(detach);
			t133 = claim_space(section3_nodes);
			p20 = claim_element(section3_nodes, "P", {});
			var p20_nodes = children(p20);
			t134 = claim_text(p20_nodes, "The step of figuring out the actual path based on the requested path, is called ");
			strong6 = claim_element(p20_nodes, "STRONG", {});
			var strong6_nodes = children(strong6);
			t135 = claim_text(strong6_nodes, "\"Resolving\"");
			strong6_nodes.forEach(detach);
			t136 = claim_text(p20_nodes, ":");
			p20_nodes.forEach(detach);
			t137 = claim_space(section3_nodes);
			pre10 = claim_element(section3_nodes, "PRE", { class: true });
			var pre10_nodes = children(pre10);
			pre10_nodes.forEach(detach);
			t138 = claim_space(section3_nodes);
			p21 = claim_element(section3_nodes, "P", {});
			var p21_nodes = children(p21);
			em2 = claim_element(p21_nodes, "EM", {});
			var em2_nodes = children(em2);
			t139 = claim_text(em2_nodes, "Resolving path to the actual file path");
			em2_nodes.forEach(detach);
			p21_nodes.forEach(detach);
			section3_nodes.forEach(detach);
			t140 = claim_space(nodes);
			section4 = claim_element(nodes, "SECTION", {});
			var section4_nodes = children(section4);
			h22 = claim_element(section4_nodes, "H2", {});
			var h22_nodes = children(h22);
			a24 = claim_element(h22_nodes, "A", { href: true, id: true });
			var a24_nodes = children(a24);
			t141 = claim_text(a24_nodes, "Resolving");
			a24_nodes.forEach(detach);
			h22_nodes.forEach(detach);
			t142 = claim_space(section4_nodes);
			p22 = claim_element(section4_nodes, "P", {});
			var p22_nodes = children(p22);
			t143 = claim_text(p22_nodes, "Let's talk about resolving. We know that \"import\"ing ");
			code15 = claim_element(p22_nodes, "CODE", {});
			var code15_nodes = children(code15);
			t144 = claim_text(code15_nodes, "./b.js");
			code15_nodes.forEach(detach);
			t145 = claim_text(p22_nodes, " in the following examples will result in getting a different file, because when we specify ");
			code16 = claim_element(p22_nodes, "CODE", {});
			var code16_nodes = children(code16);
			t146 = claim_text(code16_nodes, "./");
			code16_nodes.forEach(detach);
			t147 = claim_text(p22_nodes, ", we are \"import\"ing relative to the current file.");
			p22_nodes.forEach(detach);
			t148 = claim_space(section4_nodes);
			pre11 = claim_element(section4_nodes, "PRE", { class: true });
			var pre11_nodes = children(pre11);
			pre11_nodes.forEach(detach);
			t149 = claim_space(section4_nodes);
			pre12 = claim_element(section4_nodes, "PRE", { class: true });
			var pre12_nodes = children(pre12);
			pre12_nodes.forEach(detach);
			t150 = claim_space(section4_nodes);
			p23 = claim_element(section4_nodes, "P", {});
			var p23_nodes = children(p23);
			t151 = claim_text(p23_nodes, "So, what are the rules of resolving a module?");
			p23_nodes.forEach(detach);
			t152 = claim_space(section4_nodes);
			p24 = claim_element(section4_nodes, "P", {});
			var p24_nodes = children(p24);
			t153 = claim_text(p24_nodes, "The Node.js documentation has listed out the ");
			a25 = claim_element(p24_nodes, "A", { href: true, rel: true });
			var a25_nodes = children(a25);
			t154 = claim_text(a25_nodes, "detailed step of the module resolving algorithm");
			a25_nodes.forEach(detach);
			t155 = claim_text(p24_nodes, ":");
			p24_nodes.forEach(detach);
			t156 = claim_space(section4_nodes);
			p25 = claim_element(section4_nodes, "P", {});
			var p25_nodes = children(p25);
			t157 = claim_text(p25_nodes, "When we specify a relative path, ");
			code17 = claim_element(p25_nodes, "CODE", {});
			var code17_nodes = children(code17);
			t158 = claim_text(code17_nodes, "./b");
			code17_nodes.forEach(detach);
			t159 = claim_text(p25_nodes, ", Node.js will first assume that ");
			code18 = claim_element(p25_nodes, "CODE", {});
			var code18_nodes = children(code18);
			t160 = claim_text(code18_nodes, "./b");
			code18_nodes.forEach(detach);
			t161 = claim_text(p25_nodes, " is a file, and tries the following extension if it doesn't exactly match the file name:");
			p25_nodes.forEach(detach);
			t162 = claim_space(section4_nodes);
			pre13 = claim_element(section4_nodes, "PRE", { class: true });
			var pre13_nodes = children(pre13);
			pre13_nodes.forEach(detach);
			t163 = claim_space(section4_nodes);
			p26 = claim_element(section4_nodes, "P", {});
			var p26_nodes = children(p26);
			t164 = claim_text(p26_nodes, "If the file does not exist, Node.js will then try to treat ");
			code19 = claim_element(p26_nodes, "CODE", {});
			var code19_nodes = children(code19);
			t165 = claim_text(code19_nodes, "./b");
			code19_nodes.forEach(detach);
			t166 = claim_text(p26_nodes, " as a directory, and try the following:");
			p26_nodes.forEach(detach);
			t167 = claim_space(section4_nodes);
			pre14 = claim_element(section4_nodes, "PRE", { class: true });
			var pre14_nodes = children(pre14);
			pre14_nodes.forEach(detach);
			t168 = claim_space(section4_nodes);
			p27 = claim_element(section4_nodes, "P", {});
			var p27_nodes = children(p27);
			t169 = claim_text(p27_nodes, "If we specify ");
			code20 = claim_element(p27_nodes, "CODE", {});
			var code20_nodes = children(code20);
			t170 = claim_text(code20_nodes, "import 'b'");
			code20_nodes.forEach(detach);
			t171 = claim_text(p27_nodes, " instead, Node.js will treat it as a package within ");
			code21 = claim_element(p27_nodes, "CODE", {});
			var code21_nodes = children(code21);
			t172 = claim_text(code21_nodes, "node_modules/");
			code21_nodes.forEach(detach);
			t173 = claim_text(p27_nodes, ", and have a different resolving strategy.");
			p27_nodes.forEach(detach);
			t174 = claim_space(section4_nodes);
			p28 = claim_element(section4_nodes, "P", {});
			var p28_nodes = children(p28);
			t175 = claim_text(p28_nodes, "Through the above illustration, we can see that resolving ");
			code22 = claim_element(p28_nodes, "CODE", {});
			var code22_nodes = children(code22);
			t176 = claim_text(code22_nodes, "import './b'");
			code22_nodes.forEach(detach);
			t177 = claim_text(p28_nodes, " is not as simple as it seems. Besides the default Node.js resolving behaviour, ");
			a26 = claim_element(p28_nodes, "A", { href: true, rel: true });
			var a26_nodes = children(a26);
			t178 = claim_text(a26_nodes, "webpack provides a lot more customisation options");
			a26_nodes.forEach(detach);
			t179 = claim_text(p28_nodes, ", such as custom extensions, alias, modules folders, etc.");
			p28_nodes.forEach(detach);
			t180 = claim_space(section4_nodes);
			p29 = claim_element(section4_nodes, "P", {});
			var p29_nodes = children(p29);
			t181 = claim_text(p29_nodes, "Here, I am showing you the ");
			em3 = claim_element(p29_nodes, "EM", {});
			var em3_nodes = children(em3);
			t182 = claim_text(em3_nodes, "\"simplest\"");
			em3_nodes.forEach(detach);
			t183 = claim_text(p29_nodes, " resolver, which is to resolve relative path only:");
			p29_nodes.forEach(detach);
			t184 = claim_space(section4_nodes);
			pre15 = claim_element(section4_nodes, "PRE", { class: true });
			var pre15_nodes = children(pre15);
			pre15_nodes.forEach(detach);
			t185 = claim_space(section4_nodes);
			blockquote2 = claim_element(section4_nodes, "BLOCKQUOTE", {});
			var blockquote2_nodes = children(blockquote2);
			small0 = claim_element(blockquote2_nodes, "SMALL", {});
			var small0_nodes = children(small0);
			t186 = claim_text(small0_nodes, "**Note:** You should try out writing a full node resolvers that resolve relatively as well as absolutely from `node_modules/`");
			small0_nodes.forEach(detach);
			blockquote2_nodes.forEach(detach);
			t187 = claim_space(section4_nodes);
			p30 = claim_element(section4_nodes, "P", {});
			var p30_nodes = children(p30);
			t188 = claim_text(p30_nodes, "Now I know the actual requested file paths, I then create modules out of them.");
			p30_nodes.forEach(detach);
			t189 = claim_space(section4_nodes);
			pre16 = claim_element(section4_nodes, "PRE", { class: true });
			var pre16_nodes = children(pre16);
			pre16_nodes.forEach(detach);
			t190 = claim_space(section4_nodes);
			p31 = claim_element(section4_nodes, "P", {});
			var p31_nodes = children(p31);
			t191 = claim_text(p31_nodes, "So, for each module, I find their dependencies, parse them, and find each dependency's dependencies, parse them as well, and find their dependencies, and so forth recursively. At the end of the process, I get a module dependency graph that looks something like this:");
			p31_nodes.forEach(detach);
			t192 = claim_space(section4_nodes);
			pre17 = claim_element(section4_nodes, "PRE", { class: true });
			var pre17_nodes = children(pre17);
			pre17_nodes.forEach(detach);
			t193 = claim_space(section4_nodes);
			p32 = claim_element(section4_nodes, "P", {});
			var p32_nodes = children(p32);
			t194 = claim_text(p32_nodes, "The root of the graph is our entry module, and you can traverse the graph through the ");
			code23 = claim_element(p32_nodes, "CODE", {});
			var code23_nodes = children(code23);
			t195 = claim_text(code23_nodes, "dependencies");
			code23_nodes.forEach(detach);
			t196 = claim_text(p32_nodes, " of the module. As you can see, the ");
			code24 = claim_element(p32_nodes, "CODE", {});
			var code24_nodes = children(code24);
			t197 = claim_text(code24_nodes, "index.js");
			code24_nodes.forEach(detach);
			t198 = claim_text(p32_nodes, " has 2 dependencies, the ");
			code25 = claim_element(p32_nodes, "CODE", {});
			var code25_nodes = children(code25);
			t199 = claim_text(code25_nodes, "square.js");
			code25_nodes.forEach(detach);
			t200 = claim_text(p32_nodes, " and the ");
			code26 = claim_element(p32_nodes, "CODE", {});
			var code26_nodes = children(code26);
			t201 = claim_text(code26_nodes, "circle.js");
			code26_nodes.forEach(detach);
			t202 = claim_text(p32_nodes, ".");
			p32_nodes.forEach(detach);
			t203 = claim_space(section4_nodes);
			blockquote3 = claim_element(section4_nodes, "BLOCKQUOTE", {});
			var blockquote3_nodes = children(blockquote3);
			small1 = claim_element(blockquote3_nodes, "SMALL", {});
			var small1_nodes = children(small1);
			t204 = claim_text(small1_nodes, "**Note:** If you are following along, you can checkout the tag `feat-1-module-dependency-graph`, to see the code that I had written up till this point.");
			small1_nodes.forEach(detach);
			blockquote3_nodes.forEach(detach);
			section4_nodes.forEach(detach);
			t205 = claim_space(nodes);
			section5 = claim_element(nodes, "SECTION", {});
			var section5_nodes = children(section5);
			h23 = claim_element(section5_nodes, "H2", {});
			var h23_nodes = children(h23);
			a27 = claim_element(h23_nodes, "A", { href: true, id: true });
			var a27_nodes = children(a27);
			t206 = claim_text(a27_nodes, "Bundling");
			a27_nodes.forEach(detach);
			h23_nodes.forEach(detach);
			t207 = claim_space(section5_nodes);
			p33 = claim_element(section5_nodes, "P", {});
			var p33_nodes = children(p33);
			t208 = claim_text(p33_nodes, "With the module dependency graph, it's time to bundle them into a file!");
			p33_nodes.forEach(detach);
			t209 = claim_space(section5_nodes);
			p34 = claim_element(section5_nodes, "P", {});
			var p34_nodes = children(p34);
			t210 = claim_text(p34_nodes, "At this point in time, we can choose whether we want to bundle it in the ");
			strong7 = claim_element(p34_nodes, "STRONG", {});
			var strong7_nodes = children(strong7);
			t211 = claim_text(strong7_nodes, "\"webpack way\"");
			strong7_nodes.forEach(detach);
			t212 = claim_text(p34_nodes, " or the ");
			strong8 = claim_element(p34_nodes, "STRONG", {});
			var strong8_nodes = children(strong8);
			t213 = claim_text(strong8_nodes, "\"rollup way\"");
			strong8_nodes.forEach(detach);
			t214 = claim_text(p34_nodes, ". In this article I am showing you how I did it the ");
			strong9 = claim_element(p34_nodes, "STRONG", {});
			var strong9_nodes = children(strong9);
			t215 = claim_text(strong9_nodes, "\"webpack way\"");
			strong9_nodes.forEach(detach);
			t216 = claim_text(p34_nodes, ". I'll write about bundling in the ");
			strong10 = claim_element(p34_nodes, "STRONG", {});
			var strong10_nodes = children(strong10);
			t217 = claim_text(strong10_nodes, "\"rollup way\"");
			strong10_nodes.forEach(detach);
			t218 = claim_text(p34_nodes, " in the coming article.");
			p34_nodes.forEach(detach);
			t219 = claim_space(section5_nodes);
			blockquote4 = claim_element(section5_nodes, "BLOCKQUOTE", {});
			var blockquote4_nodes = children(blockquote4);
			p35 = claim_element(blockquote4_nodes, "P", {});
			var p35_nodes = children(p35);
			t220 = claim_text(p35_nodes, "If you have no idea about what is the ");
			strong11 = claim_element(p35_nodes, "STRONG", {});
			var strong11_nodes = children(strong11);
			t221 = claim_text(strong11_nodes, "\"webpack way\"");
			strong11_nodes.forEach(detach);
			t222 = claim_text(p35_nodes, " or ");
			strong12 = claim_element(p35_nodes, "STRONG", {});
			var strong12_nodes = children(strong12);
			t223 = claim_text(strong12_nodes, "\"rollup way\"");
			strong12_nodes.forEach(detach);
			t224 = claim_text(p35_nodes, ", I have \"coined\" the term in my ");
			a28 = claim_element(p35_nodes, "A", { href: true });
			var a28_nodes = children(a28);
			t225 = claim_text(a28_nodes, "previous article");
			a28_nodes.forEach(detach);
			t226 = claim_text(p35_nodes, " and have detailed explanation about them!");
			p35_nodes.forEach(detach);
			blockquote4_nodes.forEach(detach);
			t227 = claim_space(section5_nodes);
			p36 = claim_element(section5_nodes, "P", {});
			var p36_nodes = children(p36);
			t228 = claim_text(p36_nodes, "Let's take a look how the final bundled file would look like:");
			p36_nodes.forEach(detach);
			t229 = claim_space(section5_nodes);
			pre18 = claim_element(section5_nodes, "PRE", { class: true });
			var pre18_nodes = children(pre18);
			pre18_nodes.forEach(detach);
			t230 = claim_space(section5_nodes);
			p37 = claim_element(section5_nodes, "P", {});
			var p37_nodes = children(p37);
			t231 = claim_text(p37_nodes, "Let's break it down to a few steps:");
			p37_nodes.forEach(detach);
			t232 = claim_space(section5_nodes);
			ul6 = claim_element(section5_nodes, "UL", {});
			var ul6_nodes = children(ul6);
			li15 = claim_element(ul6_nodes, "LI", {});
			var li15_nodes = children(li15);
			strong13 = claim_element(li15_nodes, "STRONG", {});
			var strong13_nodes = children(strong13);
			t233 = claim_text(strong13_nodes, "Group modules into files");
			strong13_nodes.forEach(detach);
			li15_nodes.forEach(detach);
			t234 = claim_space(ul6_nodes);
			li16 = claim_element(ul6_nodes, "LI", {});
			var li16_nodes = children(li16);
			strong14 = claim_element(li16_nodes, "STRONG", {});
			var strong14_nodes = children(strong14);
			t235 = claim_text(strong14_nodes, "Create the module map");
			strong14_nodes.forEach(detach);
			t236 = claim_text(li16_nodes, " and wrapping each module in a \"special\" module factory function");
			li16_nodes.forEach(detach);
			t237 = claim_space(ul6_nodes);
			li17 = claim_element(ul6_nodes, "LI", {});
			var li17_nodes = children(li17);
			strong15 = claim_element(li17_nodes, "STRONG", {});
			var strong15_nodes = children(strong15);
			t238 = claim_text(strong15_nodes, "Create the \"runtime\"");
			strong15_nodes.forEach(detach);
			t239 = claim_text(li17_nodes, ", the glue that links each module together.");
			li17_nodes.forEach(detach);
			ul6_nodes.forEach(detach);
			section5_nodes.forEach(detach);
			t240 = claim_space(nodes);
			section6 = claim_element(nodes, "SECTION", {});
			var section6_nodes = children(section6);
			h31 = claim_element(section6_nodes, "H3", {});
			var h31_nodes = children(h31);
			a29 = claim_element(h31_nodes, "A", { href: true, id: true });
			var a29_nodes = children(a29);
			t241 = claim_text(a29_nodes, "Grouping modules into files");
			a29_nodes.forEach(detach);
			h31_nodes.forEach(detach);
			t242 = claim_space(section6_nodes);
			p38 = claim_element(section6_nodes, "P", {});
			var p38_nodes = children(p38);
			t243 = claim_text(p38_nodes, "This step is to decide which modules goes to which file. We can split modules into different files because of ");
			a30 = claim_element(p38_nodes, "A", { href: true, rel: true });
			var a30_nodes = children(a30);
			t244 = claim_text(a30_nodes, "code splitting");
			a30_nodes.forEach(detach);
			t245 = claim_text(p38_nodes, " due to dynamic import as well as optimisation, such as the webpack's ");
			a31 = claim_element(p38_nodes, "A", { href: true, rel: true });
			var a31_nodes = children(a31);
			t246 = claim_text(a31_nodes, "Chunk Splitting");
			a31_nodes.forEach(detach);
			t247 = claim_text(p38_nodes, ".");
			p38_nodes.forEach(detach);
			t248 = claim_space(section6_nodes);
			p39 = claim_element(section6_nodes, "P", {});
			var p39_nodes = children(p39);
			t249 = claim_text(p39_nodes, "I will support code splitting in the future. For now, I grouped all modules into 1 file.");
			p39_nodes.forEach(detach);
			t250 = claim_space(section6_nodes);
			p40 = claim_element(section6_nodes, "P", {});
			var p40_nodes = children(p40);
			t251 = claim_text(p40_nodes, "To collect all the modules from module graph into a list of modules, I did a graph traversal:");
			p40_nodes.forEach(detach);
			t252 = claim_space(section6_nodes);
			pre19 = claim_element(section6_nodes, "PRE", { class: true });
			var pre19_nodes = children(pre19);
			pre19_nodes.forEach(detach);
			t253 = claim_space(section6_nodes);
			p41 = claim_element(section6_nodes, "P", {});
			var p41_nodes = children(p41);
			t254 = claim_text(p41_nodes, "...and I used the list of modules to create a module map.");
			p41_nodes.forEach(detach);
			section6_nodes.forEach(detach);
			t255 = claim_space(nodes);
			section7 = claim_element(nodes, "SECTION", {});
			var section7_nodes = children(section7);
			h32 = claim_element(section7_nodes, "H3", {});
			var h32_nodes = children(h32);
			a32 = claim_element(h32_nodes, "A", { href: true, id: true });
			var a32_nodes = children(a32);
			t256 = claim_text(a32_nodes, "Creating module map");
			a32_nodes.forEach(detach);
			h32_nodes.forEach(detach);
			t257 = claim_space(section7_nodes);
			p42 = claim_element(section7_nodes, "P", {});
			var p42_nodes = children(p42);
			t258 = claim_text(p42_nodes, "The module map I created is a string, that would be inlined into the final bundle file.");
			p42_nodes.forEach(detach);
			t259 = claim_space(section7_nodes);
			p43 = claim_element(section7_nodes, "P", {});
			var p43_nodes = children(p43);
			t260 = claim_text(p43_nodes, "I looped through each module, and used ");
			code27 = claim_element(p43_nodes, "CODE", {});
			var code27_nodes = children(code27);
			t261 = claim_text(code27_nodes, "module.filePath");
			code27_nodes.forEach(detach);
			t262 = claim_text(p43_nodes, " as the key, and ");
			code28 = claim_element(p43_nodes, "CODE", {});
			var code28_nodes = children(code28);
			t263 = claim_text(code28_nodes, "module.content");
			code28_nodes.forEach(detach);
			t264 = claim_text(p43_nodes, " as the value.");
			p43_nodes.forEach(detach);
			t265 = claim_space(section7_nodes);
			p44 = claim_element(section7_nodes, "P", {});
			var p44_nodes = children(p44);
			t266 = claim_text(p44_nodes, "The reason I dont use ");
			code29 = claim_element(p44_nodes, "CODE", {});
			var code29_nodes = children(code29);
			t267 = claim_text(code29_nodes, "JSON.stringify(moduleMap)");
			code29_nodes.forEach(detach);
			t268 = claim_text(p44_nodes, " instead of manually concatenating to build up the module map, is because JSON can only takes in ");
			a33 = claim_element(p44_nodes, "A", { href: true, rel: true });
			var a33_nodes = children(a33);
			t269 = claim_text(a33_nodes, "JSON primitive data type");
			a33_nodes.forEach(detach);
			t270 = claim_text(p44_nodes, " as value, but what I built here is a JavaScript map, with ");
			code30 = claim_element(p44_nodes, "CODE", {});
			var code30_nodes = children(code30);
			t271 = claim_text(code30_nodes, "function");
			code30_nodes.forEach(detach);
			t272 = claim_text(p44_nodes, " as value, but in string.");
			p44_nodes.forEach(detach);
			t273 = claim_space(section7_nodes);
			pre20 = claim_element(section7_nodes, "PRE", { class: true });
			var pre20_nodes = children(pre20);
			pre20_nodes.forEach(detach);
			t274 = claim_space(section7_nodes);
			p45 = claim_element(section7_nodes, "P", {});
			var p45_nodes = children(p45);
			t275 = claim_text(p45_nodes, "The function that wraps around the ");
			code31 = claim_element(p45_nodes, "CODE", {});
			var code31_nodes = children(code31);
			t276 = claim_text(code31_nodes, "module.content");
			code31_nodes.forEach(detach);
			t277 = claim_text(p45_nodes, " is called the module factory function. It provides 2 parameter to the module:");
			p45_nodes.forEach(detach);
			t278 = claim_space(section7_nodes);
			ul7 = claim_element(section7_nodes, "UL", {});
			var ul7_nodes = children(ul7);
			li18 = claim_element(ul7_nodes, "LI", {});
			var li18_nodes = children(li18);
			code32 = claim_element(li18_nodes, "CODE", {});
			var code32_nodes = children(code32);
			t279 = claim_text(code32_nodes, "exports");
			code32_nodes.forEach(detach);
			t280 = claim_text(li18_nodes, ", an object that the module can assign its exported value onto");
			li18_nodes.forEach(detach);
			t281 = claim_space(ul7_nodes);
			li19 = claim_element(ul7_nodes, "LI", {});
			var li19_nodes = children(li19);
			code33 = claim_element(li19_nodes, "CODE", {});
			var code33_nodes = children(code33);
			t282 = claim_text(code33_nodes, "require");
			code33_nodes.forEach(detach);
			t283 = claim_text(li19_nodes, ", a function that the module can invoke with module path to import exported value from another module");
			li19_nodes.forEach(detach);
			ul7_nodes.forEach(detach);
			t284 = claim_space(section7_nodes);
			p46 = claim_element(section7_nodes, "P", {});
			var p46_nodes = children(p46);
			t285 = claim_text(p46_nodes, "The module map right now is not something that can be executed:");
			p46_nodes.forEach(detach);
			t286 = claim_space(section7_nodes);
			pre21 = claim_element(section7_nodes, "PRE", { class: true });
			var pre21_nodes = children(pre21);
			pre21_nodes.forEach(detach);
			t287 = claim_space(section7_nodes);
			p47 = claim_element(section7_nodes, "P", {});
			var p47_nodes = children(p47);
			t288 = claim_text(p47_nodes, "because it still uses ");
			code34 = claim_element(p47_nodes, "CODE", {});
			var code34_nodes = children(code34);
			t289 = claim_text(code34_nodes, "import");
			code34_nodes.forEach(detach);
			t290 = claim_text(p47_nodes, " and ");
			code35 = claim_element(p47_nodes, "CODE", {});
			var code35_nodes = children(code35);
			t291 = claim_text(code35_nodes, "export");
			code35_nodes.forEach(detach);
			t292 = claim_text(p47_nodes, ". I had to transform them to use the ");
			code36 = claim_element(p47_nodes, "CODE", {});
			var code36_nodes = children(code36);
			t293 = claim_text(code36_nodes, "exports");
			code36_nodes.forEach(detach);
			t294 = claim_text(p47_nodes, " and ");
			code37 = claim_element(p47_nodes, "CODE", {});
			var code37_nodes = children(code37);
			t295 = claim_text(code37_nodes, "require");
			code37_nodes.forEach(detach);
			t296 = claim_text(p47_nodes, " that we pass in.");
			p47_nodes.forEach(detach);
			t297 = claim_space(section7_nodes);
			p48 = claim_element(section7_nodes, "P", {});
			var p48_nodes = children(p48);
			t298 = claim_text(p48_nodes, "To transform the code, I used the AST of the module again: trasform the ast and generate the new code from the transformed ast.");
			p48_nodes.forEach(detach);
			t299 = claim_space(section7_nodes);
			p49 = claim_element(section7_nodes, "P", {});
			var p49_nodes = children(p49);
			t300 = claim_text(p49_nodes, "What I need is to trasform the \"from\" to \"to\" of the following:");
			p49_nodes.forEach(detach);
			t301 = claim_space(section7_nodes);
			pre22 = claim_element(section7_nodes, "PRE", { class: true });
			var pre22_nodes = children(pre22);
			pre22_nodes.forEach(detach);
			t302 = claim_space(section7_nodes);
			blockquote5 = claim_element(section7_nodes, "BLOCKQUOTE", {});
			var blockquote5_nodes = children(blockquote5);
			p50 = claim_element(blockquote5_nodes, "P", {});
			var p50_nodes = children(p50);
			t303 = claim_text(p50_nodes, "I wrote a ");
			a34 = claim_element(p50_nodes, "A", { href: true });
			var a34_nodes = children(a34);
			t304 = claim_text(a34_nodes, "step by step guide");
			a34_nodes.forEach(detach);
			t305 = claim_text(p50_nodes, " on how to write babel transformation, please do check it out.");
			p50_nodes.forEach(detach);
			blockquote5_nodes.forEach(detach);
			t306 = claim_space(section7_nodes);
			p51 = claim_element(section7_nodes, "P", {});
			var p51_nodes = children(p51);
			t307 = claim_text(p51_nodes, "Knowing ");
			strong16 = claim_element(p51_nodes, "STRONG", {});
			var strong16_nodes = children(strong16);
			t308 = claim_text(strong16_nodes, "what to target on AST");
			strong16_nodes.forEach(detach);
			t309 = claim_text(p51_nodes, " and ");
			strong17 = claim_element(p51_nodes, "STRONG", {});
			var strong17_nodes = children(strong17);
			t310 = claim_text(strong17_nodes, "how the transformed AST look like");
			strong17_nodes.forEach(detach);
			t311 = claim_text(p51_nodes, ", I wrote my transformation code:");
			p51_nodes.forEach(detach);
			t312 = claim_space(section7_nodes);
			pre23 = claim_element(section7_nodes, "PRE", { class: true });
			var pre23_nodes = children(pre23);
			pre23_nodes.forEach(detach);
			t313 = claim_space(section7_nodes);
			p52 = claim_element(section7_nodes, "P", {});
			var p52_nodes = children(p52);
			t314 = claim_text(p52_nodes, "I omitted the actual babel transformation code, because it is lengthy. If you are interested to read about it, you can check out ");
			a35 = claim_element(p52_nodes, "A", { href: true, rel: true });
			var a35_nodes = children(a35);
			t315 = claim_text(a35_nodes, "from my Github repo");
			a35_nodes.forEach(detach);
			p52_nodes.forEach(detach);
			t316 = claim_space(section7_nodes);
			p53 = claim_element(section7_nodes, "P", {});
			var p53_nodes = children(p53);
			t317 = claim_text(p53_nodes, "So, now the module map looks ready:");
			p53_nodes.forEach(detach);
			t318 = claim_space(section7_nodes);
			pre24 = claim_element(section7_nodes, "PRE", { class: true });
			var pre24_nodes = children(pre24);
			pre24_nodes.forEach(detach);
			t319 = claim_space(section7_nodes);
			p54 = claim_element(section7_nodes, "P", {});
			var p54_nodes = children(p54);
			t320 = claim_text(p54_nodes, "One thing to take note is that, for the ");
			code38 = claim_element(p54_nodes, "CODE", {});
			var code38_nodes = children(code38);
			t321 = claim_text(code38_nodes, "require");
			code38_nodes.forEach(detach);
			t322 = claim_text(p54_nodes, " statements, I replaced the requested path to the actual resolved path, because I used the actual resolved path as the key to the module map.");
			p54_nodes.forEach(detach);
			section7_nodes.forEach(detach);
			t323 = claim_space(nodes);
			section8 = claim_element(nodes, "SECTION", {});
			var section8_nodes = children(section8);
			h33 = claim_element(section8_nodes, "H3", {});
			var h33_nodes = children(h33);
			a36 = claim_element(h33_nodes, "A", { href: true, id: true });
			var a36_nodes = children(a36);
			strong18 = claim_element(a36_nodes, "STRONG", {});
			var strong18_nodes = children(strong18);
			t324 = claim_text(strong18_nodes, "Create the \"runtime\"");
			strong18_nodes.forEach(detach);
			a36_nodes.forEach(detach);
			h33_nodes.forEach(detach);
			t325 = claim_space(section8_nodes);
			p55 = claim_element(section8_nodes, "P", {});
			var p55_nodes = children(p55);
			t326 = claim_text(p55_nodes, "Now it's time to create the runtime. The runtime is a piece of code that is part of the output bundle, that runs when the application code is running, therefore, the runtime.");
			p55_nodes.forEach(detach);
			t327 = claim_space(section8_nodes);
			p56 = claim_element(section8_nodes, "P", {});
			var p56_nodes = children(p56);
			t328 = claim_text(p56_nodes, "The runtime code can be from a template file, but for simplicity sake, I kept the runtime code as a string:");
			p56_nodes.forEach(detach);
			t329 = claim_space(section8_nodes);
			pre25 = claim_element(section8_nodes, "PRE", { class: true });
			var pre25_nodes = children(pre25);
			pre25_nodes.forEach(detach);
			t330 = claim_space(section8_nodes);
			p57 = claim_element(section8_nodes, "P", {});
			var p57_nodes = children(p57);
			t331 = claim_text(p57_nodes, "The code above is self explanatory, except if you have no idea what does the ");
			code39 = claim_element(p57_nodes, "CODE", {});
			var code39_nodes = children(code39);
			t332 = claim_text(code39_nodes, "webpackStart()");
			code39_nodes.forEach(detach);
			t333 = claim_text(p57_nodes, " do, you can read more about it in ");
			a37 = claim_element(p57_nodes, "A", { href: true });
			var a37_nodes = children(a37);
			t334 = claim_text(a37_nodes, "my previous post");
			a37_nodes.forEach(detach);
			t335 = claim_text(p57_nodes, ".");
			p57_nodes.forEach(detach);
			t336 = claim_space(section8_nodes);
			p58 = claim_element(section8_nodes, "P", {});
			var p58_nodes = children(p58);
			t337 = claim_text(p58_nodes, "Finally, I returned the module code from the ");
			code40 = claim_element(p58_nodes, "CODE", {});
			var code40_nodes = children(code40);
			t338 = claim_text(code40_nodes, "bundle");
			code40_nodes.forEach(detach);
			t339 = claim_text(p58_nodes, " function:");
			p58_nodes.forEach(detach);
			t340 = claim_space(section8_nodes);
			pre26 = claim_element(section8_nodes, "PRE", { class: true });
			var pre26_nodes = children(pre26);
			pre26_nodes.forEach(detach);
			t341 = claim_space(section8_nodes);
			p59 = claim_element(section8_nodes, "P", {});
			var p59_nodes = children(p59);
			t342 = claim_text(p59_nodes, "Now I run my bundler, it generates a ");
			code41 = claim_element(p59_nodes, "CODE", {});
			var code41_nodes = children(code41);
			t343 = claim_text(code41_nodes, "output/bundle.js");
			code41_nodes.forEach(detach);
			t344 = claim_text(p59_nodes, " file. I run the generated file with node and I see:");
			p59_nodes.forEach(detach);
			t345 = claim_space(section8_nodes);
			pre27 = claim_element(section8_nodes, "PRE", { class: true });
			var pre27_nodes = children(pre27);
			pre27_nodes.forEach(detach);
			t346 = claim_space(section8_nodes);
			p60 = claim_element(section8_nodes, "P", {});
			var p60_nodes = children(p60);
			t347 = claim_text(p60_nodes, "That's it! A working module bundler!");
			p60_nodes.forEach(detach);
			t348 = claim_space(section8_nodes);
			p61 = claim_element(section8_nodes, "P", {});
			var p61_nodes = children(p61);
			t349 = claim_text(p61_nodes, "Of course, the module bundler I've shown here is ");
			strong19 = claim_element(p61_nodes, "STRONG", {});
			var strong19_nodes = children(strong19);
			t350 = claim_text(strong19_nodes, "nowhere near webpack");
			strong19_nodes.forEach(detach);
			t351 = claim_text(p61_nodes, ". Webpack supports more module system, resolving strategies, loading strategies, plugin system, optimisation, and many many more.");
			p61_nodes.forEach(detach);
			section8_nodes.forEach(detach);
			t352 = claim_space(nodes);
			section9 = claim_element(nodes, "SECTION", {});
			var section9_nodes = children(section9);
			h24 = claim_element(section9_nodes, "H2", {});
			var h24_nodes = children(h24);
			a38 = claim_element(h24_nodes, "A", { href: true, id: true });
			var a38_nodes = children(a38);
			t353 = claim_text(a38_nodes, "Optimisation");
			a38_nodes.forEach(detach);
			h24_nodes.forEach(detach);
			t354 = claim_space(section9_nodes);
			p62 = claim_element(section9_nodes, "P", {});
			var p62_nodes = children(p62);
			t355 = claim_text(p62_nodes, "I played around my module bundler, and I quickly noticed a bug: ");
			strong20 = claim_element(p62_nodes, "STRONG", {});
			var strong20_nodes = children(strong20);
			t356 = claim_text(strong20_nodes, "Circular Dependency");
			strong20_nodes.forEach(detach);
			t357 = claim_text(p62_nodes, ".");
			p62_nodes.forEach(detach);
			t358 = claim_space(section9_nodes);
			p63 = claim_element(section9_nodes, "P", {});
			var p63_nodes = children(p63);
			t359 = claim_text(p63_nodes, "Here's my input files that I've tweaked:");
			p63_nodes.forEach(detach);
			t360 = claim_space(section9_nodes);
			pre28 = claim_element(section9_nodes, "PRE", { class: true });
			var pre28_nodes = children(pre28);
			pre28_nodes.forEach(detach);
			t361 = claim_space(section9_nodes);
			pre29 = claim_element(section9_nodes, "PRE", { class: true });
			var pre29_nodes = children(pre29);
			pre29_nodes.forEach(detach);
			t362 = claim_space(section9_nodes);
			p64 = claim_element(section9_nodes, "P", {});
			var p64_nodes = children(p64);
			t363 = claim_text(p64_nodes, "When I ran it through my module bunlder, immediately it ran into a stack overflow:");
			p64_nodes.forEach(detach);
			t364 = claim_space(section9_nodes);
			pre30 = claim_element(section9_nodes, "PRE", { class: true });
			var pre30_nodes = children(pre30);
			pre30_nodes.forEach(detach);
			section9_nodes.forEach(detach);
			t365 = claim_space(nodes);
			section10 = claim_element(nodes, "SECTION", {});
			var section10_nodes = children(section10);
			h34 = claim_element(section10_nodes, "H3", {});
			var h34_nodes = children(h34);
			a39 = claim_element(h34_nodes, "A", { href: true, id: true });
			var a39_nodes = children(a39);
			t366 = claim_text(a39_nodes, "Circular dependency");
			a39_nodes.forEach(detach);
			h34_nodes.forEach(detach);
			t367 = claim_space(section10_nodes);
			p65 = claim_element(section10_nodes, "P", {});
			var p65_nodes = children(p65);
			t368 = claim_text(p65_nodes, "There were 2 junctures that the code did recursive traversal which have led to the endless loop:");
			p65_nodes.forEach(detach);
			t369 = claim_space(section10_nodes);
			ul8 = claim_element(section10_nodes, "UL", {});
			var ul8_nodes = children(ul8);
			li20 = claim_element(ul8_nodes, "LI", {});
			var li20_nodes = children(li20);
			t370 = claim_text(li20_nodes, "Generating dependency graphs");
			li20_nodes.forEach(detach);
			t371 = claim_space(ul8_nodes);
			li21 = claim_element(ul8_nodes, "LI", {});
			var li21_nodes = children(li21);
			t372 = claim_text(li21_nodes, "Traversing module graph for bundling");
			li21_nodes.forEach(detach);
			ul8_nodes.forEach(detach);
			t373 = claim_space(section10_nodes);
			pre31 = claim_element(section10_nodes, "PRE", { class: true });
			var pre31_nodes = children(pre31);
			pre31_nodes.forEach(detach);
			t374 = claim_space(section10_nodes);
			p66 = claim_element(section10_nodes, "P", {});
			var p66_nodes = children(p66);
			t375 = claim_text(p66_nodes, "Bundle with the latest code, the stack overflow is gone. However when I executed the output bundle, I saw");
			p66_nodes.forEach(detach);
			t376 = claim_space(section10_nodes);
			pre32 = claim_element(section10_nodes, "PRE", { class: true });
			var pre32_nodes = children(pre32);
			pre32_nodes.forEach(detach);
			t377 = claim_space(section10_nodes);
			p67 = claim_element(section10_nodes, "P", {});
			var p67_nodes = children(p67);
			t378 = claim_text(p67_nodes, "So I took a look at the output bundle:");
			p67_nodes.forEach(detach);
			t379 = claim_space(section10_nodes);
			pre33 = claim_element(section10_nodes, "PRE", { class: true });
			var pre33_nodes = children(pre33);
			pre33_nodes.forEach(detach);
			t380 = claim_space(section10_nodes);
			p68 = claim_element(section10_nodes, "P", {});
			var p68_nodes = children(p68);
			t381 = claim_text(p68_nodes, "So, the problem is that I destructed ");
			code42 = claim_element(p68_nodes, "CODE", {});
			var code42_nodes = children(code42);
			t382 = claim_text(code42_nodes, "PI");
			code42_nodes.forEach(detach);
			t383 = claim_text(p68_nodes, " from the exports of ");
			code43 = claim_element(p68_nodes, "CODE", {});
			var code43_nodes = children(code43);
			t384 = claim_text(code43_nodes, "index.js");
			code43_nodes.forEach(detach);
			t385 = claim_text(p68_nodes, " before it is defined, so naturally ");
			code44 = claim_element(p68_nodes, "CODE", {});
			var code44_nodes = children(code44);
			t386 = claim_text(code44_nodes, "PI");
			code44_nodes.forEach(detach);
			t387 = claim_text(p68_nodes, " within ");
			code45 = claim_element(p68_nodes, "CODE", {});
			var code45_nodes = children(code45);
			t388 = claim_text(code45_nodes, "circle.js");
			code45_nodes.forEach(detach);
			t389 = claim_text(p68_nodes, " would stay as ");
			code46 = claim_element(p68_nodes, "CODE", {});
			var code46_nodes = children(code46);
			t390 = claim_text(code46_nodes, "undefined");
			code46_nodes.forEach(detach);
			t391 = claim_text(p68_nodes, " throughout the application. However before I called ");
			code47 = claim_element(p68_nodes, "CODE", {});
			var code47_nodes = children(code47);
			t392 = claim_text(code47_nodes, "circleArea");
			code47_nodes.forEach(detach);
			t393 = claim_text(p68_nodes, ", we defined ");
			code48 = claim_element(p68_nodes, "CODE", {});
			var code48_nodes = children(code48);
			t394 = claim_text(code48_nodes, "PI");
			code48_nodes.forEach(detach);
			t395 = claim_text(p68_nodes, " on the ");
			code49 = claim_element(p68_nodes, "CODE", {});
			var code49_nodes = children(code49);
			t396 = claim_text(code49_nodes, "index.js");
			code49_nodes.forEach(detach);
			t397 = claim_text(p68_nodes, "'s export, I am expecting it to be available.");
			p68_nodes.forEach(detach);
			t398 = claim_space(section10_nodes);
			p69 = claim_element(section10_nodes, "P", {});
			var p69_nodes = children(p69);
			t399 = claim_text(p69_nodes, "So I built my application with webpack and took a look at how webpack solved this problem.");
			p69_nodes.forEach(detach);
			t400 = claim_space(section10_nodes);
			pre34 = claim_element(section10_nodes, "PRE", { class: true });
			var pre34_nodes = children(pre34);
			pre34_nodes.forEach(detach);
			t401 = claim_space(section10_nodes);
			p70 = claim_element(section10_nodes, "P", {});
			var p70_nodes = children(p70);
			t402 = claim_text(p70_nodes, "Brilliant! The key is to lazily get the value of ");
			code50 = claim_element(p70_nodes, "CODE", {});
			var code50_nodes = children(code50);
			t403 = claim_text(code50_nodes, "PI");
			code50_nodes.forEach(detach);
			t404 = claim_text(p70_nodes, " when needed!");
			p70_nodes.forEach(detach);
			t405 = claim_space(section10_nodes);
			p71 = claim_element(section10_nodes, "P", {});
			var p71_nodes = children(p71);
			t406 = claim_text(p71_nodes, "I changed my babel transformation code, which I am not showing it here. If you are curious enough, you can check out ");
			a40 = claim_element(p71_nodes, "A", { href: true, rel: true });
			var a40_nodes = children(a40);
			t407 = claim_text(a40_nodes, "the changes I made from Github");
			a40_nodes.forEach(detach);
			t408 = claim_text(p71_nodes, ".");
			p71_nodes.forEach(detach);
			section10_nodes.forEach(detach);
			t409 = claim_space(nodes);
			section11 = claim_element(nodes, "SECTION", {});
			var section11_nodes = children(section11);
			h25 = claim_element(section11_nodes, "H2", {});
			var h25_nodes = children(h25);
			a41 = claim_element(h25_nodes, "A", { href: true, id: true });
			var a41_nodes = children(a41);
			t410 = claim_text(a41_nodes, "Summary");
			a41_nodes.forEach(detach);
			h25_nodes.forEach(detach);
			t411 = claim_space(section11_nodes);
			p72 = claim_element(section11_nodes, "P", {});
			var p72_nodes = children(p72);
			t412 = claim_text(p72_nodes, "There's two phases in module bundling: ");
			strong21 = claim_element(p72_nodes, "STRONG", {});
			var strong21_nodes = children(strong21);
			t413 = claim_text(strong21_nodes, "Dependency Resolution");
			strong21_nodes.forEach(detach);
			t414 = claim_text(p72_nodes, " and ");
			strong22 = claim_element(p72_nodes, "STRONG", {});
			var strong22_nodes = children(strong22);
			t415 = claim_text(strong22_nodes, "Bundling");
			strong22_nodes.forEach(detach);
			t416 = claim_text(p72_nodes, ".");
			p72_nodes.forEach(detach);
			t417 = claim_space(section11_nodes);
			p73 = claim_element(section11_nodes, "P", {});
			var p73_nodes = children(p73);
			t418 = claim_text(p73_nodes, "I showed you how I constructed the dependency graph, by finding import statements and resolving modules. I shared how I created module maps and transformed the imports / exports syntax during ");
			strong23 = claim_element(p73_nodes, "STRONG", {});
			var strong23_nodes = children(strong23);
			t419 = claim_text(strong23_nodes, "bundling");
			strong23_nodes.forEach(detach);
			t420 = claim_text(p73_nodes, ". Lastly, I fixed the circular dependency bug that was in the first version of my module bundler.");
			p73_nodes.forEach(detach);
			section11_nodes.forEach(detach);
			t421 = claim_space(nodes);
			section12 = claim_element(nodes, "SECTION", {});
			var section12_nodes = children(section12);
			h35 = claim_element(section12_nodes, "H3", {});
			var h35_nodes = children(h35);
			a42 = claim_element(h35_nodes, "A", { href: true, id: true });
			var a42_nodes = children(a42);
			t422 = claim_text(a42_nodes, "Whats next?");
			a42_nodes.forEach(detach);
			h35_nodes.forEach(detach);
			t423 = claim_space(section12_nodes);
			p74 = claim_element(section12_nodes, "P", {});
			var p74_nodes = children(p74);
			t424 = claim_text(p74_nodes, "I have a few ideas that I will add to my module bundler, such as:");
			p74_nodes.forEach(detach);
			t425 = claim_space(section12_nodes);
			ul9 = claim_element(section12_nodes, "UL", {});
			var ul9_nodes = children(ul9);
			li22 = claim_element(ul9_nodes, "LI", {});
			var li22_nodes = children(li22);
			t426 = claim_text(li22_nodes, "code spliting");
			li22_nodes.forEach(detach);
			t427 = claim_space(ul9_nodes);
			li23 = claim_element(ul9_nodes, "LI", {});
			var li23_nodes = children(li23);
			t428 = claim_text(li23_nodes, "watch mode and reloading");
			li23_nodes.forEach(detach);
			ul9_nodes.forEach(detach);
			t429 = claim_space(section12_nodes);
			p75 = claim_element(section12_nodes, "P", {});
			var p75_nodes = children(p75);
			t430 = claim_text(p75_nodes, "which I will cover them in my next article when they are ready.");
			p75_nodes.forEach(detach);
			t431 = claim_space(section12_nodes);
			p76 = claim_element(section12_nodes, "P", {});
			var p76_nodes = children(p76);
			t432 = claim_text(p76_nodes, "Till then. Cheers. 😎");
			p76_nodes.forEach(detach);
			section12_nodes.forEach(detach);
			t433 = claim_space(nodes);
			section13 = claim_element(nodes, "SECTION", {});
			var section13_nodes = children(section13);
			h26 = claim_element(section13_nodes, "H2", {});
			var h26_nodes = children(h26);
			a43 = claim_element(h26_nodes, "A", { href: true, id: true });
			var a43_nodes = children(a43);
			t434 = claim_text(a43_nodes, "Further Readings");
			a43_nodes.forEach(detach);
			h26_nodes.forEach(detach);
			t435 = claim_space(section13_nodes);
			ul10 = claim_element(section13_nodes, "UL", {});
			var ul10_nodes = children(ul10);
			li24 = claim_element(ul10_nodes, "LI", {});
			var li24_nodes = children(li24);
			a44 = claim_element(li24_nodes, "A", { href: true, rel: true });
			var a44_nodes = children(a44);
			t436 = claim_text(a44_nodes, "Ronen Amiel, Build Your Own Webpack - You Gotta Love Frontend 2018");
			a44_nodes.forEach(detach);
			li24_nodes.forEach(detach);
			t437 = claim_space(ul10_nodes);
			li25 = claim_element(ul10_nodes, "LI", {});
			var li25_nodes = children(li25);
			a45 = claim_element(li25_nodes, "A", { href: true, rel: true });
			var a45_nodes = children(a45);
			t438 = claim_text(a45_nodes, "Luciano Mammino, Unbundling the JavaScript module bundler - DublinJS July 2018");
			a45_nodes.forEach(detach);
			li25_nodes.forEach(detach);
			t439 = claim_space(ul10_nodes);
			li26 = claim_element(ul10_nodes, "LI", {});
			var li26_nodes = children(li26);
			a46 = claim_element(li26_nodes, "A", { href: true, rel: true });
			var a46_nodes = children(a46);
			t440 = claim_text(a46_nodes, "Adam Kelly, Let’s learn how module bundlers work and then write one ourselves");
			a46_nodes.forEach(detach);
			li26_nodes.forEach(detach);
			t441 = claim_space(ul10_nodes);
			li27 = claim_element(ul10_nodes, "LI", {});
			var li27_nodes = children(li27);
			a47 = claim_element(li27_nodes, "A", { href: true, rel: true });
			var a47_nodes = children(a47);
			t442 = claim_text(a47_nodes, "Webpack founder Tobias Koppers demos bundling live by hand");
			a47_nodes.forEach(detach);
			li27_nodes.forEach(detach);
			ul10_nodes.forEach(detach);
			section13_nodes.forEach(detach);
			this.h();
		},
		h() {
			attr(a0, "href", "#getting-started");
			attr(a1, "href", "#the-input");
			attr(a2, "href", "#writing");
			attr(a3, "href", "#resolving");
			attr(a4, "href", "#bundling");
			attr(a5, "href", "#grouping-modules-into-files");
			attr(a6, "href", "#creating-module-map");
			attr(a7, "href", "#");
			attr(a8, "href", "#optimisation");
			attr(a9, "href", "#circular-dependency");
			attr(a10, "href", "#summary");
			attr(a11, "href", "#whats-next");
			attr(a12, "href", "#further-readings");
			attr(ul4, "class", "sitemap");
			attr(ul4, "id", "sitemap");
			attr(ul4, "role", "navigation");
			attr(ul4, "aria-label", "Table of Contents");
			attr(a13, "href", "/what-is-module-bundler-and-how-does-it-work/");
			attr(a14, "href", "https://webpack.js.org");
			attr(a14, "rel", "nofollow");
			attr(a15, "href", "https://rollupjs.org");
			attr(a15, "rel", "nofollow");
			attr(a16, "href", "#getting-started");
			attr(a16, "id", "getting-started");
			attr(a17, "href", "/what-is-module-bundler-and-how-does-it-work/");
			attr(a18, "href", "#the-input");
			attr(a18, "id", "the-input");
			attr(pre0, "class", "language-js");
			attr(pre1, "class", "language-js");
			attr(pre2, "class", "language-js");
			attr(a19, "href", "https://github.com/tanhauhau/byo-bundler/tree/master/fixture");
			attr(a19, "rel", "nofollow");
			attr(a20, "href", "#writing");
			attr(a20, "id", "writing");
			attr(pre3, "class", "language-js");
			attr(a21, "href", "https://en.wikipedia.org/wiki/Directed_graph");
			attr(a21, "rel", "nofollow");
			attr(pre4, "class", "language-js");
			attr(pre5, "class", "language-js");
			attr(pre6, "class", "language-js");
			attr(a22, "href", "http://babeljs.io");
			attr(a22, "rel", "nofollow");
			attr(pre7, "class", "language-js");
			attr(pre8, "class", "language-js");
			attr(a23, "href", "https://lihautan.com/babel-ast-explorer/#?eyJiYWJlbFNldHRpbmdzIjp7InZlcnNpb24iOiI3LjQuNSJ9LCJ0cmVlU2V0dGluZ3MiOnsiaGlkZUVtcHR5Ijp0cnVlLCJoaWRlTG9jYXRpb24iOnRydWUsImhpZGVUeXBlIjp0cnVlfSwiY29kZSI6ImltcG9ydCBzcXVhcmVBcmVhIGZyb20gJy4vc3F1YXJlLmpzJztcbmltcG9ydCBjaXJjbGVBcmVhIGZyb20gJy4vY2lyY2xlLmpzJztcblxuY29uc29sZS5sb2coJ0FyZWEgb2Ygc3F1YXJlOiAnLCBzcXVhcmVBcmVhKDUpKTtcbmNvbnNvbGUubG9nKCdBcmVhIG9mIGNpcmNsZScsIGNpcmNsZUFyZWEoNSkpO1xuIn0=");
			attr(a23, "rel", "nofollow");
			if (img.src !== (img_src_value = __build_img__0)) attr(img, "src", img_src_value);
			attr(img, "alt", "babel-ast-explorer");
			attr(img, "title", "Visualizing AST through babel-ast-explorer");
			attr(pre9, "class", "language-js");
			attr(pre10, "class", "language-js");
			attr(a24, "href", "#resolving");
			attr(a24, "id", "resolving");
			attr(pre11, "class", "language-js");
			attr(pre12, "class", "language-js");
			attr(a25, "href", "http://nodejs.org/api/modules.html#modules_all_together");
			attr(a25, "rel", "nofollow");
			attr(pre13, "class", "language-null");
			attr(pre14, "class", "language-null");
			attr(a26, "href", "https://webpack.js.org/configuration/resolve/");
			attr(a26, "rel", "nofollow");
			attr(pre15, "class", "language-js");
			attr(pre16, "class", "language-js");
			attr(pre17, "class", "language-js");
			attr(a27, "href", "#bundling");
			attr(a27, "id", "bundling");
			attr(a28, "href", "/what-is-module-bundler-and-how-does-it-work/");
			attr(pre18, "class", "language-js");
			attr(a29, "href", "#grouping-modules-into-files");
			attr(a29, "id", "grouping-modules-into-files");
			attr(a30, "href", "https://webpack.js.org/guides/code-splitting/");
			attr(a30, "rel", "nofollow");
			attr(a31, "href", "https://webpack.js.org/plugins/split-chunks-plugin/");
			attr(a31, "rel", "nofollow");
			attr(pre19, "class", "language-js");
			attr(a32, "href", "#creating-module-map");
			attr(a32, "id", "creating-module-map");
			attr(a33, "href", "https://documentation.progress.com/output/ua/OpenEdge_latest/index.html#page/dvjsn/json-data-types.html");
			attr(a33, "rel", "nofollow");
			attr(pre20, "class", "language-js");
			attr(pre21, "class", "language-js");
			attr(pre22, "class", "language-js");
			attr(a34, "href", "/step-by-step-guide-for-writing-a-babel-transformation");
			attr(pre23, "class", "language-js");
			attr(a35, "href", "https://github.com/tanhauhau/byo-bundler/blob/feat-2-bundling/src/index.js#L46-L138");
			attr(a35, "rel", "nofollow");
			attr(pre24, "class", "language-js");
			attr(a36, "href", "#");
			attr(a36, "id", "");
			attr(pre25, "class", "language-js");
			attr(a37, "href", "/what-is-module-bundler-and-how-does-it-work/");
			attr(pre26, "class", "language-js");
			attr(pre27, "class", "language-null");
			attr(a38, "href", "#optimisation");
			attr(a38, "id", "optimisation");
			attr(pre28, "class", "language-js");
			attr(pre29, "class", "language-js");
			attr(pre30, "class", "language-null");
			attr(a39, "href", "#circular-dependency");
			attr(a39, "id", "circular-dependency");
			attr(pre31, "class", "language-js");
			attr(pre32, "class", "language-sh");
			attr(pre33, "class", "language-js");
			attr(pre34, "class", "language-js");
			attr(a40, "href", "https://github.com/tanhauhau/byo-bundler/compare/feat-2-bundling...feat-3-circular-dependency");
			attr(a40, "rel", "nofollow");
			attr(a41, "href", "#summary");
			attr(a41, "id", "summary");
			attr(a42, "href", "#whats-next");
			attr(a42, "id", "whats-next");
			attr(a43, "href", "#further-readings");
			attr(a43, "id", "further-readings");
			attr(a44, "href", "https://www.youtube.com/watch?v=Gc9-7PBqOC8");
			attr(a44, "rel", "nofollow");
			attr(a45, "href", "https://slides.com/lucianomammino/unbundling-the-javascript-module-bundler-dublinjs");
			attr(a45, "rel", "nofollow");
			attr(a46, "href", "https://www.freecodecamp.org/news/lets-learn-how-module-bundlers-work-and-then-write-one-ourselves-b2e3fe6c88ae/");
			attr(a46, "rel", "nofollow");
			attr(a47, "href", "https://www.youtube.com/watch?v=UNMkLHzofQI");
			attr(a47, "rel", "nofollow");
		},
		m(target, anchor) {
			insert(target, section0, anchor);
			append(section0, ul4);
			append(ul4, li0);
			append(li0, a0);
			append(a0, t0);
			append(ul4, ul0);
			append(ul0, li1);
			append(li1, a1);
			append(a1, t1);
			append(ul4, li2);
			append(li2, a2);
			append(a2, t2);
			append(ul4, li3);
			append(li3, a3);
			append(a3, t3);
			append(ul4, li4);
			append(li4, a4);
			append(a4, t4);
			append(ul4, ul1);
			append(ul1, li5);
			append(li5, a5);
			append(a5, t5);
			append(ul1, li6);
			append(li6, a6);
			append(a6, t6);
			append(ul1, li7);
			append(li7, a7);
			append(ul4, li8);
			append(li8, a8);
			append(a8, t7);
			append(ul4, ul2);
			append(ul2, li9);
			append(li9, a9);
			append(a9, t8);
			append(ul4, li10);
			append(li10, a10);
			append(a10, t9);
			append(ul4, ul3);
			append(ul3, li11);
			append(li11, a11);
			append(a11, t10);
			append(ul4, li12);
			append(li12, a12);
			append(a12, t11);
			insert(target, t12, anchor);
			insert(target, p0, anchor);
			append(p0, t13);
			append(p0, a13);
			append(a13, t14);
			append(p0, t15);
			append(p0, a14);
			append(a14, t16);
			append(p0, t17);
			append(p0, a15);
			append(a15, t18);
			append(p0, t19);
			insert(target, t20, anchor);
			insert(target, p1, anchor);
			append(p1, t21);
			insert(target, t22, anchor);
			insert(target, hr0, anchor);
			insert(target, t23, anchor);
			insert(target, p2, anchor);
			append(p2, t24);
			append(p2, strong0);
			append(strong0, t25);
			append(p2, t26);
			insert(target, t27, anchor);
			insert(target, hr1, anchor);
			insert(target, t28, anchor);
			insert(target, section1, anchor);
			append(section1, h20);
			append(h20, a16);
			append(a16, t29);
			append(section1, t30);
			append(section1, p3);
			append(p3, t31);
			append(p3, a17);
			append(a17, t32);
			append(p3, t33);
			append(section1, t34);
			append(section1, p4);
			append(p4, t35);
			append(p4, em0);
			append(em0, t36);
			append(p4, t37);
			append(section1, t38);
			append(section1, ul5);
			append(ul5, li13);
			append(li13, t39);
			append(li13, strong1);
			append(strong1, t40);
			append(ul5, t41);
			append(ul5, li14);
			append(li14, t42);
			append(li14, strong2);
			append(strong2, t43);
			append(section1, t44);
			append(section1, blockquote0);
			append(blockquote0, p5);
			append(p5, t45);
			append(p5, strong3);
			append(strong3, t46);
			append(p5, t47);
			insert(target, t48, anchor);
			insert(target, section2, anchor);
			append(section2, h30);
			append(h30, a18);
			append(a18, t49);
			append(section2, t50);
			append(section2, p6);
			append(p6, t51);
			append(section2, t52);
			append(section2, pre0);
			pre0.innerHTML = raw0_value;
			append(section2, t53);
			append(section2, pre1);
			pre1.innerHTML = raw1_value;
			append(section2, t54);
			append(section2, pre2);
			pre2.innerHTML = raw2_value;
			append(section2, t55);
			append(section2, p7);
			append(p7, t56);
			append(p7, a19);
			append(a19, t57);
			append(p7, t58);
			append(p7, code0);
			append(code0, t59);
			append(p7, t60);
			append(p7, code1);
			append(code1, t61);
			append(p7, t62);
			insert(target, t63, anchor);
			insert(target, section3, anchor);
			append(section3, h21);
			append(h21, a20);
			append(a20, t64);
			append(section3, t65);
			append(section3, p8);
			append(p8, t66);
			append(section3, t67);
			append(section3, pre3);
			pre3.innerHTML = raw3_value;
			append(section3, t68);
			append(section3, blockquote1);
			append(blockquote1, p9);
			append(p9, t69);
			append(p9, strong4);
			append(strong4, t70);
			append(p9, t71);
			append(p9, a21);
			append(a21, t72);
			append(p9, t73);
			append(section3, t74);
			append(section3, pre4);
			pre4.innerHTML = raw4_value;
			append(section3, t75);
			append(section3, p10);
			append(p10, t76);
			append(section3, t77);
			append(section3, p11);
			append(p11, t78);
			append(p11, code2);
			append(code2, t79);
			append(p11, t80);
			append(p11, code3);
			append(code3, t81);
			append(p11, t82);
			append(section3, t83);
			append(section3, pre5);
			pre5.innerHTML = raw5_value;
			append(section3, t84);
			append(section3, p12);
			append(p12, t85);
			append(p12, code4);
			append(code4, t86);
			append(p12, t87);
			append(section3, t88);
			append(section3, pre6);
			pre6.innerHTML = raw6_value;
			append(section3, t89);
			append(section3, p13);
			append(p13, t90);
			append(p13, code5);
			append(code5, t91);
			append(p13, t92);
			append(p13, a22);
			append(a22, t93);
			append(p13, t94);
			append(p13, em1);
			append(em1, t95);
			append(p13, t96);
			append(section3, t97);
			append(section3, pre7);
			pre7.innerHTML = raw7_value;
			append(section3, t98);
			append(section3, p14);
			append(p14, t99);
			append(section3, t100);
			append(section3, pre8);
			pre8.innerHTML = raw8_value;
			append(section3, t101);
			append(section3, p15);
			append(p15, t102);
			append(section3, t103);
			append(section3, p16);
			append(p16, t104);
			append(p16, code6);
			append(code6, t105);
			append(p16, t106);
			append(p16, a23);
			append(a23, t107);
			append(p16, t108);
			append(section3, t109);
			append(section3, p17);
			append(p17, img);
			append(section3, t110);
			append(section3, p18);
			append(p18, t111);
			append(p18, code7);
			append(code7, t112);
			append(p18, t113);
			append(p18, code8);
			append(code8, t114);
			append(p18, t115);
			append(p18, code9);
			append(code9, t116);
			append(p18, t117);
			append(p18, code10);
			append(code10, t118);
			append(p18, t119);
			append(p18, code11);
			append(code11, t120);
			append(p18, t121);
			append(section3, t122);
			append(section3, pre9);
			pre9.innerHTML = raw9_value;
			append(section3, t123);
			append(section3, p19);
			append(p19, t124);
			append(p19, code12);
			append(code12, t125);
			append(p19, t126);
			append(p19, code13);
			append(code13, t127);
			append(p19, t128);
			append(p19, code14);
			append(code14, t129);
			append(p19, t130);
			append(p19, strong5);
			append(strong5, t131);
			append(p19, t132);
			append(section3, t133);
			append(section3, p20);
			append(p20, t134);
			append(p20, strong6);
			append(strong6, t135);
			append(p20, t136);
			append(section3, t137);
			append(section3, pre10);
			pre10.innerHTML = raw10_value;
			append(section3, t138);
			append(section3, p21);
			append(p21, em2);
			append(em2, t139);
			insert(target, t140, anchor);
			insert(target, section4, anchor);
			append(section4, h22);
			append(h22, a24);
			append(a24, t141);
			append(section4, t142);
			append(section4, p22);
			append(p22, t143);
			append(p22, code15);
			append(code15, t144);
			append(p22, t145);
			append(p22, code16);
			append(code16, t146);
			append(p22, t147);
			append(section4, t148);
			append(section4, pre11);
			pre11.innerHTML = raw11_value;
			append(section4, t149);
			append(section4, pre12);
			pre12.innerHTML = raw12_value;
			append(section4, t150);
			append(section4, p23);
			append(p23, t151);
			append(section4, t152);
			append(section4, p24);
			append(p24, t153);
			append(p24, a25);
			append(a25, t154);
			append(p24, t155);
			append(section4, t156);
			append(section4, p25);
			append(p25, t157);
			append(p25, code17);
			append(code17, t158);
			append(p25, t159);
			append(p25, code18);
			append(code18, t160);
			append(p25, t161);
			append(section4, t162);
			append(section4, pre13);
			pre13.innerHTML = raw13_value;
			append(section4, t163);
			append(section4, p26);
			append(p26, t164);
			append(p26, code19);
			append(code19, t165);
			append(p26, t166);
			append(section4, t167);
			append(section4, pre14);
			pre14.innerHTML = raw14_value;
			append(section4, t168);
			append(section4, p27);
			append(p27, t169);
			append(p27, code20);
			append(code20, t170);
			append(p27, t171);
			append(p27, code21);
			append(code21, t172);
			append(p27, t173);
			append(section4, t174);
			append(section4, p28);
			append(p28, t175);
			append(p28, code22);
			append(code22, t176);
			append(p28, t177);
			append(p28, a26);
			append(a26, t178);
			append(p28, t179);
			append(section4, t180);
			append(section4, p29);
			append(p29, t181);
			append(p29, em3);
			append(em3, t182);
			append(p29, t183);
			append(section4, t184);
			append(section4, pre15);
			pre15.innerHTML = raw15_value;
			append(section4, t185);
			append(section4, blockquote2);
			append(blockquote2, small0);
			append(small0, t186);
			append(section4, t187);
			append(section4, p30);
			append(p30, t188);
			append(section4, t189);
			append(section4, pre16);
			pre16.innerHTML = raw16_value;
			append(section4, t190);
			append(section4, p31);
			append(p31, t191);
			append(section4, t192);
			append(section4, pre17);
			pre17.innerHTML = raw17_value;
			append(section4, t193);
			append(section4, p32);
			append(p32, t194);
			append(p32, code23);
			append(code23, t195);
			append(p32, t196);
			append(p32, code24);
			append(code24, t197);
			append(p32, t198);
			append(p32, code25);
			append(code25, t199);
			append(p32, t200);
			append(p32, code26);
			append(code26, t201);
			append(p32, t202);
			append(section4, t203);
			append(section4, blockquote3);
			append(blockquote3, small1);
			append(small1, t204);
			insert(target, t205, anchor);
			insert(target, section5, anchor);
			append(section5, h23);
			append(h23, a27);
			append(a27, t206);
			append(section5, t207);
			append(section5, p33);
			append(p33, t208);
			append(section5, t209);
			append(section5, p34);
			append(p34, t210);
			append(p34, strong7);
			append(strong7, t211);
			append(p34, t212);
			append(p34, strong8);
			append(strong8, t213);
			append(p34, t214);
			append(p34, strong9);
			append(strong9, t215);
			append(p34, t216);
			append(p34, strong10);
			append(strong10, t217);
			append(p34, t218);
			append(section5, t219);
			append(section5, blockquote4);
			append(blockquote4, p35);
			append(p35, t220);
			append(p35, strong11);
			append(strong11, t221);
			append(p35, t222);
			append(p35, strong12);
			append(strong12, t223);
			append(p35, t224);
			append(p35, a28);
			append(a28, t225);
			append(p35, t226);
			append(section5, t227);
			append(section5, p36);
			append(p36, t228);
			append(section5, t229);
			append(section5, pre18);
			pre18.innerHTML = raw18_value;
			append(section5, t230);
			append(section5, p37);
			append(p37, t231);
			append(section5, t232);
			append(section5, ul6);
			append(ul6, li15);
			append(li15, strong13);
			append(strong13, t233);
			append(ul6, t234);
			append(ul6, li16);
			append(li16, strong14);
			append(strong14, t235);
			append(li16, t236);
			append(ul6, t237);
			append(ul6, li17);
			append(li17, strong15);
			append(strong15, t238);
			append(li17, t239);
			insert(target, t240, anchor);
			insert(target, section6, anchor);
			append(section6, h31);
			append(h31, a29);
			append(a29, t241);
			append(section6, t242);
			append(section6, p38);
			append(p38, t243);
			append(p38, a30);
			append(a30, t244);
			append(p38, t245);
			append(p38, a31);
			append(a31, t246);
			append(p38, t247);
			append(section6, t248);
			append(section6, p39);
			append(p39, t249);
			append(section6, t250);
			append(section6, p40);
			append(p40, t251);
			append(section6, t252);
			append(section6, pre19);
			pre19.innerHTML = raw19_value;
			append(section6, t253);
			append(section6, p41);
			append(p41, t254);
			insert(target, t255, anchor);
			insert(target, section7, anchor);
			append(section7, h32);
			append(h32, a32);
			append(a32, t256);
			append(section7, t257);
			append(section7, p42);
			append(p42, t258);
			append(section7, t259);
			append(section7, p43);
			append(p43, t260);
			append(p43, code27);
			append(code27, t261);
			append(p43, t262);
			append(p43, code28);
			append(code28, t263);
			append(p43, t264);
			append(section7, t265);
			append(section7, p44);
			append(p44, t266);
			append(p44, code29);
			append(code29, t267);
			append(p44, t268);
			append(p44, a33);
			append(a33, t269);
			append(p44, t270);
			append(p44, code30);
			append(code30, t271);
			append(p44, t272);
			append(section7, t273);
			append(section7, pre20);
			pre20.innerHTML = raw20_value;
			append(section7, t274);
			append(section7, p45);
			append(p45, t275);
			append(p45, code31);
			append(code31, t276);
			append(p45, t277);
			append(section7, t278);
			append(section7, ul7);
			append(ul7, li18);
			append(li18, code32);
			append(code32, t279);
			append(li18, t280);
			append(ul7, t281);
			append(ul7, li19);
			append(li19, code33);
			append(code33, t282);
			append(li19, t283);
			append(section7, t284);
			append(section7, p46);
			append(p46, t285);
			append(section7, t286);
			append(section7, pre21);
			pre21.innerHTML = raw21_value;
			append(section7, t287);
			append(section7, p47);
			append(p47, t288);
			append(p47, code34);
			append(code34, t289);
			append(p47, t290);
			append(p47, code35);
			append(code35, t291);
			append(p47, t292);
			append(p47, code36);
			append(code36, t293);
			append(p47, t294);
			append(p47, code37);
			append(code37, t295);
			append(p47, t296);
			append(section7, t297);
			append(section7, p48);
			append(p48, t298);
			append(section7, t299);
			append(section7, p49);
			append(p49, t300);
			append(section7, t301);
			append(section7, pre22);
			pre22.innerHTML = raw22_value;
			append(section7, t302);
			append(section7, blockquote5);
			append(blockquote5, p50);
			append(p50, t303);
			append(p50, a34);
			append(a34, t304);
			append(p50, t305);
			append(section7, t306);
			append(section7, p51);
			append(p51, t307);
			append(p51, strong16);
			append(strong16, t308);
			append(p51, t309);
			append(p51, strong17);
			append(strong17, t310);
			append(p51, t311);
			append(section7, t312);
			append(section7, pre23);
			pre23.innerHTML = raw23_value;
			append(section7, t313);
			append(section7, p52);
			append(p52, t314);
			append(p52, a35);
			append(a35, t315);
			append(section7, t316);
			append(section7, p53);
			append(p53, t317);
			append(section7, t318);
			append(section7, pre24);
			pre24.innerHTML = raw24_value;
			append(section7, t319);
			append(section7, p54);
			append(p54, t320);
			append(p54, code38);
			append(code38, t321);
			append(p54, t322);
			insert(target, t323, anchor);
			insert(target, section8, anchor);
			append(section8, h33);
			append(h33, a36);
			append(a36, strong18);
			append(strong18, t324);
			append(section8, t325);
			append(section8, p55);
			append(p55, t326);
			append(section8, t327);
			append(section8, p56);
			append(p56, t328);
			append(section8, t329);
			append(section8, pre25);
			pre25.innerHTML = raw25_value;
			append(section8, t330);
			append(section8, p57);
			append(p57, t331);
			append(p57, code39);
			append(code39, t332);
			append(p57, t333);
			append(p57, a37);
			append(a37, t334);
			append(p57, t335);
			append(section8, t336);
			append(section8, p58);
			append(p58, t337);
			append(p58, code40);
			append(code40, t338);
			append(p58, t339);
			append(section8, t340);
			append(section8, pre26);
			pre26.innerHTML = raw26_value;
			append(section8, t341);
			append(section8, p59);
			append(p59, t342);
			append(p59, code41);
			append(code41, t343);
			append(p59, t344);
			append(section8, t345);
			append(section8, pre27);
			pre27.innerHTML = raw27_value;
			append(section8, t346);
			append(section8, p60);
			append(p60, t347);
			append(section8, t348);
			append(section8, p61);
			append(p61, t349);
			append(p61, strong19);
			append(strong19, t350);
			append(p61, t351);
			insert(target, t352, anchor);
			insert(target, section9, anchor);
			append(section9, h24);
			append(h24, a38);
			append(a38, t353);
			append(section9, t354);
			append(section9, p62);
			append(p62, t355);
			append(p62, strong20);
			append(strong20, t356);
			append(p62, t357);
			append(section9, t358);
			append(section9, p63);
			append(p63, t359);
			append(section9, t360);
			append(section9, pre28);
			pre28.innerHTML = raw28_value;
			append(section9, t361);
			append(section9, pre29);
			pre29.innerHTML = raw29_value;
			append(section9, t362);
			append(section9, p64);
			append(p64, t363);
			append(section9, t364);
			append(section9, pre30);
			pre30.innerHTML = raw30_value;
			insert(target, t365, anchor);
			insert(target, section10, anchor);
			append(section10, h34);
			append(h34, a39);
			append(a39, t366);
			append(section10, t367);
			append(section10, p65);
			append(p65, t368);
			append(section10, t369);
			append(section10, ul8);
			append(ul8, li20);
			append(li20, t370);
			append(ul8, t371);
			append(ul8, li21);
			append(li21, t372);
			append(section10, t373);
			append(section10, pre31);
			pre31.innerHTML = raw31_value;
			append(section10, t374);
			append(section10, p66);
			append(p66, t375);
			append(section10, t376);
			append(section10, pre32);
			pre32.innerHTML = raw32_value;
			append(section10, t377);
			append(section10, p67);
			append(p67, t378);
			append(section10, t379);
			append(section10, pre33);
			pre33.innerHTML = raw33_value;
			append(section10, t380);
			append(section10, p68);
			append(p68, t381);
			append(p68, code42);
			append(code42, t382);
			append(p68, t383);
			append(p68, code43);
			append(code43, t384);
			append(p68, t385);
			append(p68, code44);
			append(code44, t386);
			append(p68, t387);
			append(p68, code45);
			append(code45, t388);
			append(p68, t389);
			append(p68, code46);
			append(code46, t390);
			append(p68, t391);
			append(p68, code47);
			append(code47, t392);
			append(p68, t393);
			append(p68, code48);
			append(code48, t394);
			append(p68, t395);
			append(p68, code49);
			append(code49, t396);
			append(p68, t397);
			append(section10, t398);
			append(section10, p69);
			append(p69, t399);
			append(section10, t400);
			append(section10, pre34);
			pre34.innerHTML = raw34_value;
			append(section10, t401);
			append(section10, p70);
			append(p70, t402);
			append(p70, code50);
			append(code50, t403);
			append(p70, t404);
			append(section10, t405);
			append(section10, p71);
			append(p71, t406);
			append(p71, a40);
			append(a40, t407);
			append(p71, t408);
			insert(target, t409, anchor);
			insert(target, section11, anchor);
			append(section11, h25);
			append(h25, a41);
			append(a41, t410);
			append(section11, t411);
			append(section11, p72);
			append(p72, t412);
			append(p72, strong21);
			append(strong21, t413);
			append(p72, t414);
			append(p72, strong22);
			append(strong22, t415);
			append(p72, t416);
			append(section11, t417);
			append(section11, p73);
			append(p73, t418);
			append(p73, strong23);
			append(strong23, t419);
			append(p73, t420);
			insert(target, t421, anchor);
			insert(target, section12, anchor);
			append(section12, h35);
			append(h35, a42);
			append(a42, t422);
			append(section12, t423);
			append(section12, p74);
			append(p74, t424);
			append(section12, t425);
			append(section12, ul9);
			append(ul9, li22);
			append(li22, t426);
			append(ul9, t427);
			append(ul9, li23);
			append(li23, t428);
			append(section12, t429);
			append(section12, p75);
			append(p75, t430);
			append(section12, t431);
			append(section12, p76);
			append(p76, t432);
			insert(target, t433, anchor);
			insert(target, section13, anchor);
			append(section13, h26);
			append(h26, a43);
			append(a43, t434);
			append(section13, t435);
			append(section13, ul10);
			append(ul10, li24);
			append(li24, a44);
			append(a44, t436);
			append(ul10, t437);
			append(ul10, li25);
			append(li25, a45);
			append(a45, t438);
			append(ul10, t439);
			append(ul10, li26);
			append(li26, a46);
			append(a46, t440);
			append(ul10, t441);
			append(ul10, li27);
			append(li27, a47);
			append(a47, t442);
		},
		p: noop,
		d(detaching) {
			if (detaching) detach(section0);
			if (detaching) detach(t12);
			if (detaching) detach(p0);
			if (detaching) detach(t20);
			if (detaching) detach(p1);
			if (detaching) detach(t22);
			if (detaching) detach(hr0);
			if (detaching) detach(t23);
			if (detaching) detach(p2);
			if (detaching) detach(t27);
			if (detaching) detach(hr1);
			if (detaching) detach(t28);
			if (detaching) detach(section1);
			if (detaching) detach(t48);
			if (detaching) detach(section2);
			if (detaching) detach(t63);
			if (detaching) detach(section3);
			if (detaching) detach(t140);
			if (detaching) detach(section4);
			if (detaching) detach(t205);
			if (detaching) detach(section5);
			if (detaching) detach(t240);
			if (detaching) detach(section6);
			if (detaching) detach(t255);
			if (detaching) detach(section7);
			if (detaching) detach(t323);
			if (detaching) detach(section8);
			if (detaching) detach(t352);
			if (detaching) detach(section9);
			if (detaching) detach(t365);
			if (detaching) detach(section10);
			if (detaching) detach(t409);
			if (detaching) detach(section11);
			if (detaching) detach(t421);
			if (detaching) detach(section12);
			if (detaching) detach(t433);
			if (detaching) detach(section13);
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
	"title": "I wrote my module bundler",
	"date": "2019-09-18T08:00:00Z",
	"tags": ["JavaScript", "module bundler", "dev tool", "webpack"],
	"description": "In my previous article, I explained how module bundler works. In this article, I am going to show you how I wrote my module bundler...",
	"series": "Write a module bundler",
	"slug": "i-wrote-my-module-bundler",
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
