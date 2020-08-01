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
					"@id": "https%3A%2F%2Flihautan.com%2Fdeep-dive-into-svelte",
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
			attr(meta11, "content", "https%3A%2F%2Flihautan.com%2Fdeep-dive-into-svelte");
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
							"@id": "https%3A%2F%2Flihautan.com%2Fdeep-dive-into-svelte",
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

/* content/blog/deep-dive-into-svelte/@@page-markup.svelte generated by Svelte v3.24.0 */

function create_default_slot(ctx) {
	let section0;
	let ul0;
	let li0;
	let a0;
	let t0;
	let ul2;
	let li1;
	let a1;
	let t1;
	let li2;
	let a2;
	let t2;
	let li3;
	let a3;
	let t3;
	let ul1;
	let li4;
	let a4;
	let t4;
	let li5;
	let a5;
	let t5;
	let t6;
	let section1;
	let h1;
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
	let a8;
	let t13;
	let t14;
	let t15;
	let p2;
	let t16;
	let t17;
	let p3;
	let t18;
	let t19;
	let ul3;
	let li6;
	let p4;
	let strong0;
	let t20;
	let t21;
	let p5;
	let t22;
	let a9;
	let t23;
	let t24;
	let a10;
	let t25;
	let t26;
	let t27;
	let li7;
	let p6;
	let strong1;
	let t28;
	let t29;
	let p7;
	let t30;
	let a11;
	let t31;
	let t32;
	let t33;
	let p8;
	let t34;
	let t35;
	let ul6;
	let li9;
	let t36;
	let ul4;
	let li8;
	let t37;
	let t38;
	let li11;
	let t39;
	let ul5;
	let li10;
	let t40;
	let section2;
	let h20;
	let a12;
	let t41;
	let t42;
	let p9;
	let t43;
	let t44;
	let p10;
	let t45;
	let t46;
	let div;
	let button0;
	let t47;
	let t48;
	let span;
	let t49;
	let t50;
	let button1;
	let t51;
	let t52;
	let script;
	let t53;
	let t54;
	let p11;
	let t55;
	let t56;
	let p12;
	let strong2;
	let t57;
	let t58;
	let p13;
	let t59;
	let t60;
	let pre0;

	let raw0_value = `
<code class="language-html"><span class="token comment">&lt;!-- filename: index.html --></span>
<span class="token tag"><span class="token tag"><span class="token punctuation">&lt;</span>button</span> <span class="token attr-name">id</span><span class="token attr-value"><span class="token punctuation">=</span><span class="token punctuation">"</span>decrement<span class="token punctuation">"</span></span><span class="token punctuation">></span></span>-<span class="token tag"><span class="token tag"><span class="token punctuation">&lt;/</span>button</span><span class="token punctuation">></span></span>
<span class="token tag"><span class="token tag"><span class="token punctuation">&lt;</span>span</span> <span class="token attr-name">id</span><span class="token attr-value"><span class="token punctuation">=</span><span class="token punctuation">"</span>count<span class="token punctuation">"</span></span><span class="token punctuation">></span></span>0<span class="token tag"><span class="token tag"><span class="token punctuation">&lt;/</span>span</span><span class="token punctuation">></span></span>
<span class="token tag"><span class="token tag"><span class="token punctuation">&lt;</span>button</span> <span class="token attr-name">id</span><span class="token attr-value"><span class="token punctuation">=</span><span class="token punctuation">"</span>increment<span class="token punctuation">"</span></span><span class="token punctuation">></span></span>+<span class="token tag"><span class="token tag"><span class="token punctuation">&lt;/</span>button</span><span class="token punctuation">></span></span></code>` + "";

	let t61;
	let p14;
	let t62;
	let t63;
	let pre1;

	let raw1_value = `
<code class="language-js"><span class="token comment">// filename: script.js</span>
<span class="token keyword">let</span> count <span class="token operator">=</span> <span class="token number">0</span><span class="token punctuation">;</span>
<span class="token keyword">const</span> span <span class="token operator">=</span> document<span class="token punctuation">.</span><span class="token function">querySelector</span><span class="token punctuation">(</span><span class="token string">'#count'</span><span class="token punctuation">)</span><span class="token punctuation">;</span>
document<span class="token punctuation">.</span><span class="token function">querySelector</span><span class="token punctuation">(</span><span class="token string">'#decrement'</span><span class="token punctuation">)</span><span class="token punctuation">.</span><span class="token function-variable function">onclick</span> <span class="token operator">=</span> <span class="token punctuation">(</span><span class="token punctuation">)</span> <span class="token operator">=></span>
  <span class="token punctuation">(</span>span<span class="token punctuation">.</span>textContent <span class="token operator">=</span> <span class="token operator">--</span>count<span class="token punctuation">)</span><span class="token punctuation">;</span>
document<span class="token punctuation">.</span><span class="token function">querySelector</span><span class="token punctuation">(</span><span class="token string">'#increment'</span><span class="token punctuation">)</span><span class="token punctuation">.</span><span class="token function-variable function">onclick</span> <span class="token operator">=</span> <span class="token punctuation">(</span><span class="token punctuation">)</span> <span class="token operator">=></span>
  <span class="token punctuation">(</span>span<span class="token punctuation">.</span>textContent <span class="token operator">=</span> <span class="token operator">++</span>count<span class="token punctuation">)</span><span class="token punctuation">;</span></code>` + "";

	let t64;
	let p15;
	let strong3;
	let t65;
	let t66;
	let p16;
	let t67;
	let em0;
	let t68;
	let t69;
	let em1;
	let t70;
	let t71;
	let em2;
	let t72;
	let t73;
	let t74;
	let p17;
	let t75;
	let t76;
	let pre2;

	let raw2_value = `
<code class="language-js"><span class="token comment">// filename: script.js</span>
<span class="token keyword">function</span> <span class="token function">buildCounter</span><span class="token punctuation">(</span><span class="token parameter">parent</span><span class="token punctuation">)</span> <span class="token punctuation">&#123;</span>
  <span class="token keyword">const</span> span <span class="token operator">=</span> document<span class="token punctuation">.</span><span class="token function">createElement</span><span class="token punctuation">(</span><span class="token string">'span'</span><span class="token punctuation">)</span><span class="token punctuation">;</span>
  <span class="token keyword">const</span> decrementBtn <span class="token operator">=</span> document<span class="token punctuation">.</span><span class="token function">createElement</span><span class="token punctuation">(</span><span class="token string">'button'</span><span class="token punctuation">)</span><span class="token punctuation">;</span>
  <span class="token keyword">const</span> incrementBtn <span class="token operator">=</span> document<span class="token punctuation">.</span><span class="token function">createElement</span><span class="token punctuation">(</span><span class="token string">'button'</span><span class="token punctuation">)</span><span class="token punctuation">;</span>

  <span class="token keyword">let</span> count <span class="token operator">=</span> <span class="token number">0</span><span class="token punctuation">;</span>

  span<span class="token punctuation">.</span>textContent <span class="token operator">=</span> <span class="token number">0</span><span class="token punctuation">;</span>

  decrementBtn<span class="token punctuation">.</span>textContent <span class="token operator">=</span> <span class="token string">'-'</span><span class="token punctuation">;</span>
  decrementBtn<span class="token punctuation">.</span><span class="token function-variable function">onclick</span> <span class="token operator">=</span> <span class="token punctuation">(</span><span class="token punctuation">)</span> <span class="token operator">=></span> <span class="token punctuation">(</span>span<span class="token punctuation">.</span>textContent <span class="token operator">=</span> <span class="token operator">--</span>count<span class="token punctuation">)</span><span class="token punctuation">;</span>

  incrementBtn<span class="token punctuation">.</span>textContent <span class="token operator">=</span> <span class="token string">'+'</span><span class="token punctuation">;</span>
  incrementBtn<span class="token punctuation">.</span><span class="token function-variable function">onclick</span> <span class="token operator">=</span> <span class="token punctuation">(</span><span class="token punctuation">)</span> <span class="token operator">=></span> <span class="token punctuation">(</span>span<span class="token punctuation">.</span>textContent <span class="token operator">=</span> <span class="token operator">++</span>count<span class="token punctuation">)</span><span class="token punctuation">;</span>

  parent<span class="token punctuation">.</span><span class="token function">appendChild</span><span class="token punctuation">(</span>decrementBtn<span class="token punctuation">)</span><span class="token punctuation">;</span>
  parent<span class="token punctuation">.</span><span class="token function">appendChild</span><span class="token punctuation">(</span>span<span class="token punctuation">)</span><span class="token punctuation">;</span>
  parent<span class="token punctuation">.</span><span class="token function">appendChild</span><span class="token punctuation">(</span>incrementBtn<span class="token punctuation">)</span><span class="token punctuation">;</span>
<span class="token punctuation">&#125;</span>

<span class="token comment">// you can call &#96;buildCounter&#96; however times you want</span>
<span class="token comment">//  to get however many counters</span>
<span class="token function">buildCounter</span><span class="token punctuation">(</span>document<span class="token punctuation">.</span>body<span class="token punctuation">)</span><span class="token punctuation">;</span></code>` + "";

	let t77;
	let p18;
	let t78;
	let t79;
	let p19;
	let em3;
	let t80;
	let code0;
	let t81;
	let t82;
	let code1;
	let t83;
	let t84;
	let t85;
	let p20;
	let t86;
	let strong4;
	let t87;
	let t88;
	let t89;
	let p21;
	let t90;
	let t91;
	let p22;
	let em4;
	let t92;
	let strong5;
	let t93;
	let t94;
	let t95;
	let p23;
	let t96;
	let t97;
	let pre3;

	let raw3_value = `
<code class="language-js"><span class="token comment">// filename: Counter.jsx</span>
<span class="token keyword">function</span> <span class="token function">Counter</span><span class="token punctuation">(</span><span class="token punctuation">)</span> <span class="token punctuation">&#123;</span>
  <span class="token keyword">const</span> <span class="token punctuation">[</span>count<span class="token punctuation">,</span> setCount<span class="token punctuation">]</span> <span class="token operator">=</span> <span class="token function">useState</span><span class="token punctuation">(</span><span class="token number">0</span><span class="token punctuation">)</span><span class="token punctuation">;</span>
  <span class="token keyword">return</span> <span class="token punctuation">(</span>
    <span class="token operator">&lt;</span>button onClick<span class="token operator">=</span><span class="token punctuation">&#123;</span><span class="token punctuation">(</span><span class="token punctuation">)</span> <span class="token operator">=></span> <span class="token function">setCount</span><span class="token punctuation">(</span><span class="token parameter">c</span> <span class="token operator">=></span> c <span class="token operator">-</span> <span class="token number">1</span><span class="token punctuation">)</span><span class="token punctuation">&#125;</span><span class="token operator">></span><span class="token operator">-</span><span class="token operator">&lt;</span><span class="token operator">/</span>button<span class="token operator">></span>
    <span class="token operator">&lt;</span>span<span class="token operator">></span><span class="token punctuation">&#123;</span> count <span class="token punctuation">&#125;</span><span class="token operator">&lt;</span><span class="token operator">/</span>span<span class="token operator">></span>
    <span class="token operator">&lt;</span>button onClick<span class="token operator">=</span><span class="token punctuation">&#123;</span><span class="token punctuation">(</span><span class="token punctuation">)</span> <span class="token operator">=></span> <span class="token function">setCount</span><span class="token punctuation">(</span><span class="token parameter">c</span> <span class="token operator">=></span> c <span class="token operator">+</span> <span class="token number">1</span><span class="token punctuation">)</span><span class="token punctuation">&#125;</span><span class="token operator">></span><span class="token operator">+</span><span class="token operator">&lt;</span><span class="token operator">/</span>button<span class="token operator">></span>
  <span class="token punctuation">)</span>
<span class="token punctuation">&#125;</span></code>` + "";

	let t98;
	let p24;
	let t99;
	let code2;
	let t100;
	let t101;
	let code3;
	let t102;
	let t103;
	let a13;
	let code4;
	let t104;
	let t105;
	let t106;
	let p25;
	let t107;
	let code5;
	let t108;
	let t109;
	let a14;
	let t110;
	let t111;
	let code6;
	let t112;
	let t113;
	let code7;
	let t114;
	let t115;
	let t116;
	let p26;
	let t117;
	let t118;
	let p27;
	let t119;
	let code8;
	let t120;
	let t121;
	let a15;
	let t122;
	let t123;
	let code9;
	let t124;
	let t125;
	let code10;
	let t126;
	let t127;
	let code11;
	let t128;
	let t129;
	let a16;
	let t130;
	let code12;
	let t131;
	let t132;
	let t133;
	let p28;
	let t134;
	let strong6;
	let t135;
	let t136;
	let t137;
	let p29;
	let t138;
	let strong7;
	let t139;
	let t140;
	let t141;
	let p30;
	let t142;
	let a17;
	let t143;
	let t144;
	let t145;
	let pre4;

	let raw4_value = `
<code class="language-js"><span class="token comment">// import &#123; element, ... &#125; from "svelte/internal"</span>
<span class="token comment">// ...</span>
<span class="token keyword">function</span> <span class="token function">create_fragment</span><span class="token punctuation">(</span><span class="token parameter">ctx</span><span class="token punctuation">)</span> <span class="token punctuation">&#123;</span>
  <span class="token keyword">var</span> button0<span class="token punctuation">,</span> span<span class="token punctuation">,</span> t<span class="token punctuation">,</span> button1<span class="token punctuation">,</span> dispose<span class="token punctuation">;</span>

  <span class="token keyword">return</span> <span class="token punctuation">&#123;</span>
    <span class="token function">c</span><span class="token punctuation">(</span><span class="token punctuation">)</span> <span class="token punctuation">&#123;</span>
      button0 <span class="token operator">=</span> <span class="token function">element</span><span class="token punctuation">(</span><span class="token string">'button'</span><span class="token punctuation">)</span><span class="token punctuation">;</span>
      button0<span class="token punctuation">.</span>textContent <span class="token operator">=</span> <span class="token string">'-'</span><span class="token punctuation">;</span>
      span <span class="token operator">=</span> <span class="token function">element</span><span class="token punctuation">(</span><span class="token string">'span'</span><span class="token punctuation">)</span><span class="token punctuation">;</span>
      t <span class="token operator">=</span> <span class="token function">text</span><span class="token punctuation">(</span>ctx<span class="token punctuation">.</span>count<span class="token punctuation">)</span><span class="token punctuation">;</span>
      button1 <span class="token operator">=</span> <span class="token function">element</span><span class="token punctuation">(</span><span class="token string">'button'</span><span class="token punctuation">)</span><span class="token punctuation">;</span>
      button1<span class="token punctuation">.</span>textContent <span class="token operator">=</span> <span class="token string">'+'</span><span class="token punctuation">;</span>
      <span class="token function">listen</span><span class="token punctuation">(</span>button0<span class="token punctuation">,</span> <span class="token string">'click'</span><span class="token punctuation">,</span> ctx<span class="token punctuation">.</span>click_handler<span class="token punctuation">)</span><span class="token punctuation">,</span>
        <span class="token function">listen</span><span class="token punctuation">(</span>button1<span class="token punctuation">,</span> <span class="token string">'click'</span><span class="token punctuation">,</span> ctx<span class="token punctuation">.</span>click_handler_1<span class="token punctuation">)</span><span class="token punctuation">;</span>
    <span class="token punctuation">&#125;</span><span class="token punctuation">,</span>
    <span class="token function">m</span><span class="token punctuation">(</span><span class="token parameter">target<span class="token punctuation">,</span> anchor</span><span class="token punctuation">)</span> <span class="token punctuation">&#123;</span>
      <span class="token function">insert</span><span class="token punctuation">(</span>target<span class="token punctuation">,</span> button0<span class="token punctuation">,</span> anchor<span class="token punctuation">)</span><span class="token punctuation">;</span>
      <span class="token function">insert</span><span class="token punctuation">(</span>target<span class="token punctuation">,</span> span<span class="token punctuation">,</span> anchor<span class="token punctuation">)</span><span class="token punctuation">;</span>
      <span class="token function">append</span><span class="token punctuation">(</span>span<span class="token punctuation">,</span> t<span class="token punctuation">)</span><span class="token punctuation">;</span>
      <span class="token function">insert</span><span class="token punctuation">(</span>target<span class="token punctuation">,</span> button1<span class="token punctuation">,</span> anchor<span class="token punctuation">)</span><span class="token punctuation">;</span>
    <span class="token punctuation">&#125;</span><span class="token punctuation">,</span>
    <span class="token function">p</span><span class="token punctuation">(</span><span class="token parameter">changed<span class="token punctuation">,</span> ctx</span><span class="token punctuation">)</span> <span class="token punctuation">&#123;</span>
      <span class="token keyword">if</span> <span class="token punctuation">(</span>changed<span class="token punctuation">.</span>count<span class="token punctuation">)</span> <span class="token punctuation">&#123;</span>
        <span class="token function">set_data</span><span class="token punctuation">(</span>t<span class="token punctuation">,</span> ctx<span class="token punctuation">.</span>count<span class="token punctuation">)</span><span class="token punctuation">;</span>
      <span class="token punctuation">&#125;</span>
    <span class="token punctuation">&#125;</span><span class="token punctuation">,</span>
    <span class="token comment">// ...</span>
  <span class="token punctuation">&#125;</span><span class="token punctuation">;</span>
<span class="token punctuation">&#125;</span>

<span class="token keyword">function</span> <span class="token function">instance</span><span class="token punctuation">(</span><span class="token parameter">$$self<span class="token punctuation">,</span> $$props<span class="token punctuation">,</span> $$invalidate</span><span class="token punctuation">)</span> <span class="token punctuation">&#123;</span>
  <span class="token keyword">let</span> count <span class="token operator">=</span> <span class="token number">0</span><span class="token punctuation">;</span>
  <span class="token keyword">const</span> <span class="token function-variable function">click_handler</span> <span class="token operator">=</span> <span class="token punctuation">(</span><span class="token punctuation">)</span> <span class="token operator">=></span> <span class="token function">$$invalidate</span><span class="token punctuation">(</span><span class="token string">'count'</span><span class="token punctuation">,</span> <span class="token punctuation">(</span>count <span class="token operator">-=</span> <span class="token number">1</span><span class="token punctuation">)</span><span class="token punctuation">)</span><span class="token punctuation">;</span>
  <span class="token keyword">const</span> <span class="token function-variable function">click_handler_1</span> <span class="token operator">=</span> <span class="token punctuation">(</span><span class="token punctuation">)</span> <span class="token operator">=></span> <span class="token function">$$invalidate</span><span class="token punctuation">(</span><span class="token string">'count'</span><span class="token punctuation">,</span> <span class="token punctuation">(</span>count <span class="token operator">+=</span> <span class="token number">1</span><span class="token punctuation">)</span><span class="token punctuation">)</span><span class="token punctuation">;</span>
  <span class="token keyword">return</span> <span class="token punctuation">&#123;</span> count<span class="token punctuation">,</span> click_handler<span class="token punctuation">,</span> click_handler_1 <span class="token punctuation">&#125;</span><span class="token punctuation">;</span>
<span class="token punctuation">&#125;</span>
<span class="token comment">// ...</span></code>` + "";

	let t146;
	let p31;
	let strong8;
	let t147;
	let t148;
	let em5;
	let t149;
	let a18;
	let t150;
	let t151;
	let t152;
	let p32;
	let t153;
	let code13;
	let t154;
	let t155;
	let t156;
	let p33;
	let t157;
	let t158;
	let section3;
	let h21;
	let a19;
	let t159;
	let t160;
	let p34;
	let t161;
	let t162;
	let p35;
	let t163;
	let t164;
	let pre5;

	let raw5_value = `
<code class="language-html"><span class="token tag"><span class="token tag"><span class="token punctuation">&lt;</span>button</span><span class="token punctuation">></span></span>Click Me<span class="token tag"><span class="token tag"><span class="token punctuation">&lt;/</span>button</span><span class="token punctuation">></span></span>
<span class="token tag"><span class="token tag"><span class="token punctuation">&lt;</span>p</span><span class="token punctuation">></span></span>Hello Svelte<span class="token tag"><span class="token tag"><span class="token punctuation">&lt;/</span>p</span><span class="token punctuation">></span></span></code>` + "";

	let t165;
	let p36;
	let t166;
	let t167;
	let pre6;

	let raw6_value = `
<code class="language-js"><span class="token keyword">const</span> button <span class="token operator">=</span> <span class="token function">element</span><span class="token punctuation">(</span><span class="token string">'button'</span><span class="token punctuation">)</span><span class="token punctuation">;</span>
button<span class="token punctuation">.</span>textContent <span class="token operator">=</span> <span class="token string">'Click Me'</span><span class="token punctuation">;</span>
<span class="token keyword">const</span> p <span class="token operator">=</span> <span class="token function">element</span><span class="token punctuation">(</span><span class="token string">'p'</span><span class="token punctuation">)</span><span class="token punctuation">;</span>
p<span class="token punctuation">.</span>textContent <span class="token operator">=</span> <span class="token string">'Hello Svelte'</span><span class="token punctuation">;</span>

<span class="token comment">// element('p') is short for &#96;document.createElement('p');</span></code>` + "";

	let t168;
	let p37;
	let t169;
	let code14;
	let t170;
	let t171;
	let code15;
	let t172;
	let t173;
	let t174;
	let p38;
	let t175;
	let t176;
	let pre7;

	let raw7_value = `
<code class="language-html"><span class="token tag"><span class="token tag"><span class="token punctuation">&lt;</span>script</span><span class="token punctuation">></span></span>
  function onClick() &#123;
    console.log('Greetings!');
  &#125;
<span class="token tag"><span class="token tag"><span class="token punctuation">&lt;/</span>script</span><span class="token punctuation">></span></span>
<span class="token tag"><span class="token tag"><span class="token punctuation">&lt;</span>button</span> <span class="token attr-name"><span class="token namespace">on:</span>click</span><span class="token attr-value"><span class="token punctuation">=</span>&#123;onClick&#125;</span><span class="token punctuation">></span></span>Click Me<span class="token tag"><span class="token tag"><span class="token punctuation">&lt;/</span>button</span><span class="token punctuation">></span></span>
<span class="token tag"><span class="token tag"><span class="token punctuation">&lt;</span>p</span><span class="token punctuation">></span></span>Hello Svelte<span class="token tag"><span class="token tag"><span class="token punctuation">&lt;/</span>p</span><span class="token punctuation">></span></span></code>` + "";

	let t177;
	let section4;
	let h22;
	let a20;
	let t178;
	let t179;
	let p39;
	let t180;
	let code16;
	let t181;
	let t182;
	let code17;
	let t183;
	let t184;
	let code18;
	let t185;
	let t186;
	let code19;
	let t187;
	let t188;
	let t189;
	let p40;
	let t190;
	let a21;
	let t191;
	let t192;
	let t193;
	let p41;
	let t194;
	let code20;
	let t195;
	let t196;
	let code21;
	let t197;
	let t198;
	let code22;
	let t199;
	let t200;
	let t201;
	let p42;
	let t202;
	let t203;
	let ul7;
	let li12;
	let code23;
	let t204;
	let t205;
	let li13;
	let code24;
	let t206;
	let t207;
	let li14;
	let t208;
	let t209;
	let pre8;

	let raw8_value = `
<code class="language-js"><span class="token comment">// 1. create_fragment</span>
<span class="token keyword">function</span> <span class="token function">create_fragment</span><span class="token punctuation">(</span><span class="token parameter">ctx</span><span class="token punctuation">)</span> <span class="token punctuation">&#123;</span>
  <span class="token keyword">return</span> <span class="token punctuation">&#123;</span>
    <span class="token function">c</span><span class="token punctuation">(</span><span class="token punctuation">)</span> <span class="token punctuation">&#123;</span> <span class="token comment">/*...*/</span> <span class="token punctuation">&#125;</span><span class="token punctuation">,</span>
    <span class="token function">m</span><span class="token punctuation">(</span><span class="token punctuation">)</span> <span class="token punctuation">&#123;</span> <span class="token comment">/*...*/</span> <span class="token punctuation">&#125;</span><span class="token punctuation">,</span>
    <span class="token function">p</span><span class="token punctuation">(</span><span class="token punctuation">)</span> <span class="token punctuation">&#123;</span> <span class="token comment">/*...*/</span> <span class="token punctuation">&#125;</span><span class="token punctuation">,</span>
    <span class="token function">d</span><span class="token punctuation">(</span><span class="token punctuation">)</span> <span class="token punctuation">&#123;</span> <span class="token comment">/*...*/</span> <span class="token punctuation">&#125;</span><span class="token punctuation">,</span>
    <span class="token comment">// ...</span>
  <span class="token punctuation">&#125;</span>
<span class="token punctuation">&#125;</span>

<span class="token comment">// 2. instance</span>
<span class="token keyword">function</span> <span class="token function">instance</span><span class="token punctuation">(</span><span class="token parameter">$$self<span class="token punctuation">,</span> $$props<span class="token punctuation">,</span> $$invalidate</span><span class="token punctuation">)</span> <span class="token punctuation">&#123;</span>
  <span class="token comment">// ...</span>
  <span class="token keyword">return</span> <span class="token punctuation">&#123;</span> <span class="token operator">...</span> <span class="token punctuation">&#125;</span>
<span class="token punctuation">&#125;</span>

<span class="token comment">// 3. the Component itself</span>
<span class="token keyword">class</span> <span class="token class-name">App</span> <span class="token keyword">extends</span> <span class="token class-name">SvelteComponent</span> <span class="token punctuation">&#123;</span>
	<span class="token function">constructor</span><span class="token punctuation">(</span><span class="token parameter">options</span><span class="token punctuation">)</span> <span class="token punctuation">&#123;</span>
		<span class="token keyword">super</span><span class="token punctuation">(</span><span class="token punctuation">)</span><span class="token punctuation">;</span>
		<span class="token function">init</span><span class="token punctuation">(</span><span class="token keyword">this</span><span class="token punctuation">,</span> options<span class="token punctuation">,</span> instance<span class="token punctuation">,</span> create_fragment<span class="token punctuation">,</span> safe_not_equal<span class="token punctuation">,</span> <span class="token punctuation">[</span><span class="token punctuation">]</span><span class="token punctuation">)</span><span class="token punctuation">;</span>
  <span class="token punctuation">&#125;</span>
<span class="token punctuation">&#125;</span>

<span class="token keyword">export</span> <span class="token keyword">default</span> App<span class="token punctuation">;</span></code>` + "";

	let t210;
	let p43;
	let t211;
	let t212;
	let p44;
	let strong9;
	let t213;
	let t214;
	let p45;
	let t215;
	let code25;
	let t216;
	let t217;
	let t218;
	let p46;
	let t219;
	let t220;
	let pre9;

	let raw9_value = `
<code class="language-js"><span class="token keyword">const</span> app <span class="token operator">=</span> <span class="token keyword">new</span> <span class="token class-name">App</span><span class="token punctuation">(</span><span class="token punctuation">&#123;</span> target<span class="token punctuation">:</span> document<span class="token punctuation">.</span>body <span class="token punctuation">&#125;</span><span class="token punctuation">)</span><span class="token punctuation">;</span></code>` + "";

	let t221;
	let p47;
	let t222;
	let code26;
	let t223;
	let t224;
	let code27;
	let t225;
	let t226;
	let code28;
	let t227;
	let t228;
	let code29;
	let t229;
	let t230;
	let t231;
	let p48;
	let t232;
	let code30;
	let t233;
	let t234;
	let code31;
	let t235;
	let t236;
	let t237;
	let p49;
	let strong10;
	let t238;
	let code32;
	let t239;
	let t240;
	let p50;
	let t241;
	let code33;
	let t242;
	let t243;
	let code34;
	let t244;
	let t245;
	let t246;
	let p51;
	let t247;
	let code35;
	let t248;
	let t249;
	let code36;
	let t250;
	let t251;
	let code37;
	let t252;
	let t253;
	let t254;
	let hr0;
	let t255;
	let p52;
	let t256;
	let code38;
	let t257;
	let t258;
	let code39;
	let t259;
	let t260;
	let t261;
	let ul12;
	let li16;
	let strong11;
	let code40;
	let t262;
	let t263;
	let ul8;
	let li15;
	let t264;
	let t265;
	let li18;
	let strong12;
	let code41;
	let t266;
	let t267;
	let ul9;
	let li17;
	let t268;
	let t269;
	let li22;
	let strong13;
	let t270;
	let ul10;
	let li19;
	let t271;
	let t272;
	let li20;
	let t273;
	let code42;
	let t274;
	let t275;
	let t276;
	let li21;
	let a22;
	let t277;
	let t278;
	let t279;
	let li25;
	let strong14;
	let t280;
	let ul11;
	let li23;
	let t281;
	let code43;
	let t282;
	let t283;
	let t284;
	let li24;
	let a23;
	let t285;
	let t286;
	let t287;
	let hr1;
	let t288;
	let p53;
	let t289;
	let code44;
	let t290;
	let t291;
	let code45;
	let t292;
	let t293;
	let code46;
	let t294;
	let t295;
	let t296;
	let p54;
	let strong15;
	let t297;
	let code47;
	let t298;
	let t299;
	let p55;
	let t300;
	let code48;
	let t301;
	let t302;
	let code49;
	let t303;
	let t304;
	let code50;
	let t305;
	let t306;
	let code51;
	let t307;
	let t308;
	let t309;
	let pre10;

	let raw10_value = `
<code class="language-js"><span class="token keyword">function</span> <span class="token function">create_fragment</span><span class="token punctuation">(</span><span class="token parameter">ctx</span><span class="token punctuation">)</span> <span class="token punctuation">&#123;</span>
  <span class="token keyword">let</span> t<span class="token punctuation">;</span>
  <span class="token keyword">return</span> <span class="token punctuation">&#123;</span>
    <span class="token comment">// create</span>
    <span class="token function">c</span><span class="token punctuation">(</span><span class="token punctuation">)</span> <span class="token punctuation">&#123;</span> 
     t <span class="token operator">=</span> <span class="token function">text</span><span class="token punctuation">(</span>ctx<span class="token punctuation">.</span>greeting<span class="token punctuation">)</span><span class="token punctuation">;</span>
    <span class="token punctuation">&#125;</span><span class="token punctuation">,</span>
    <span class="token comment">// claim</span>
    <span class="token function">l</span><span class="token punctuation">(</span><span class="token parameter">nodes</span><span class="token punctuation">)</span> <span class="token punctuation">&#123;</span> 
      t <span class="token operator">=</span> <span class="token function">claim_text</span><span class="token punctuation">(</span>nodes<span class="token punctuation">,</span> ctx<span class="token punctuation">.</span>greeting<span class="token punctuation">)</span><span class="token punctuation">;</span>
    <span class="token punctuation">&#125;</span><span class="token punctuation">,</span>
    <span class="token comment">// hydrate</span>
    h<span class="token punctuation">:</span> noop<span class="token punctuation">,</span>
    <span class="token comment">// mount</span>
    <span class="token function">m</span><span class="token punctuation">(</span><span class="token parameter">target<span class="token punctuation">,</span> anchor</span><span class="token punctuation">)</span> <span class="token punctuation">&#123;</span>
      <span class="token function">insert</span><span class="token punctuation">(</span>target<span class="token punctuation">,</span> t<span class="token punctuation">,</span> anchor<span class="token punctuation">)</span><span class="token punctuation">;</span>
    <span class="token punctuation">&#125;</span><span class="token punctuation">,</span>
    <span class="token comment">// update</span>
    <span class="token function">p</span><span class="token punctuation">(</span><span class="token parameter">changed<span class="token punctuation">,</span> ctx</span><span class="token punctuation">)</span> <span class="token punctuation">&#123;</span> 
      <span class="token keyword">if</span> <span class="token punctuation">(</span>changed<span class="token punctuation">.</span>greeting<span class="token punctuation">)</span> <span class="token punctuation">&#123;</span>
        <span class="token function">set_data</span><span class="token punctuation">(</span>t<span class="token punctuation">,</span> ctx<span class="token punctuation">.</span>greeting<span class="token punctuation">)</span><span class="token punctuation">;</span>
      <span class="token punctuation">&#125;</span>
    <span class="token punctuation">&#125;</span><span class="token punctuation">,</span>
    <span class="token comment">// measure</span>
    r<span class="token punctuation">:</span> noop<span class="token punctuation">,</span>
    <span class="token comment">// fix</span>
    f<span class="token punctuation">:</span> noop<span class="token punctuation">,</span>
    <span class="token comment">// animate</span>
    a<span class="token punctuation">:</span> noop<span class="token punctuation">,</span>
    <span class="token comment">// intro</span>
    i<span class="token punctuation">:</span> noop<span class="token punctuation">,</span>
    <span class="token comment">// outro</span>
    o<span class="token punctuation">:</span> noop<span class="token punctuation">,</span>
    <span class="token comment">// destroy</span>
    <span class="token function">d</span><span class="token punctuation">(</span><span class="token parameter">detaching</span><span class="token punctuation">)</span> <span class="token punctuation">&#123;</span> 
      <span class="token keyword">if</span> <span class="token punctuation">(</span>detaching<span class="token punctuation">)</span> <span class="token punctuation">&#123;</span>
        <span class="token function">detach</span><span class="token punctuation">(</span>t<span class="token punctuation">)</span><span class="token punctuation">;</span>
      <span class="token punctuation">&#125;</span>
    <span class="token punctuation">&#125;</span><span class="token punctuation">,</span>
  <span class="token punctuation">&#125;</span><span class="token punctuation">;</span>
<span class="token punctuation">&#125;</span></code>` + "";

	let t310;
	let p56;
	let t311;
	let t312;
	let p57;
	let strong16;
	let t313;
	let em6;
	let t314;
	let t315;
	let p58;
	let t316;
	let t317;
	let p59;
	let strong17;
	let t318;
	let em7;
	let t319;
	let t320;
	let p60;
	let t321;
	let code52;
	let t322;
	let t323;
	let code53;
	let t324;
	let t325;
	let t326;
	let p61;
	let strong18;
	let t327;
	let em8;
	let t328;
	let t329;
	let p62;
	let t330;
	let code54;
	let t331;
	let t332;
	let code55;
	let t333;
	let t334;
	let code56;
	let t335;
	let t336;
	let t337;
	let p63;
	let strong19;
	let t338;
	let em9;
	let t339;
	let t340;
	let p64;
	let t341;
	let code57;
	let t342;
	let t343;
	let code58;
	let t344;
	let t345;
	let t346;
	let p65;
	let strong20;
	let t347;
	let em10;
	let t348;
	let br0;
	let t349;
	let strong21;
	let t350;
	let em11;
	let t351;
	let br1;
	let t352;
	let strong22;
	let t353;
	let em12;
	let t354;
	let br2;
	let t355;
	let strong23;
	let t356;
	let em13;
	let t357;
	let br3;
	let t358;
	let strong24;
	let t359;
	let em14;
	let t360;
	let t361;
	let p66;
	let t362;
	let code59;
	let t363;
	let t364;
	let code60;
	let t365;
	let t366;
	let t367;
	let p67;
	let strong25;
	let t368;
	let em15;
	let t369;
	let t370;
	let p68;
	let t371;
	let code61;
	let t372;
	let t373;
	let t374;
	let section5;
	let h3;
	let a24;
	let t375;
	let t376;
	let p69;
	let t377;
	let t378;
	let p70;
	let t379;
	let t380;
	let pre11;

	let raw11_value = `
<code class="language-js"><span class="token keyword">const</span> app <span class="token operator">=</span> <span class="token keyword">new</span> <span class="token class-name">App</span><span class="token punctuation">(</span><span class="token punctuation">&#123;</span> target<span class="token punctuation">:</span> document<span class="token punctuation">.</span>body <span class="token punctuation">&#125;</span><span class="token punctuation">)</span><span class="token punctuation">;</span></code>` + "";

	let t381;
	let p71;
	let t382;
	let code62;
	let t383;
	let t384;
	let code63;
	let t385;
	let t386;
	let t387;
	let pre12;

	let raw12_value = `
<code class="language-js"><span class="token keyword">function</span> <span class="token function">init</span><span class="token punctuation">(</span><span class="token parameter">app<span class="token punctuation">,</span> options<span class="token punctuation">,</span> instance<span class="token punctuation">,</span> create_fragment</span><span class="token punctuation">)</span> <span class="token punctuation">&#123;</span><span class="token punctuation">&#125;</span></code>` + "";

	let t388;
	let p72;
	let t389;
	let code64;
	let t390;
	let t391;
	let code65;
	let t392;
	let t393;
	let t394;
	let pre13;

	let raw13_value = `
<code class="language-js"><span class="token keyword">function</span> <span class="token function">init</span><span class="token punctuation">(</span><span class="token parameter">app<span class="token punctuation">,</span> options<span class="token punctuation">,</span> instance<span class="token punctuation">,</span> create_fragment</span><span class="token punctuation">)</span> <span class="token punctuation">&#123;</span>
  <span class="token comment">// highlight-next-line</span>
  <span class="token keyword">const</span> ctx <span class="token operator">=</span> <span class="token function">instance</span><span class="token punctuation">(</span>app<span class="token punctuation">,</span> options<span class="token punctuation">.</span>props<span class="token punctuation">)</span><span class="token punctuation">;</span>
<span class="token punctuation">&#125;</span></code>` + "";

	let t395;
	let p73;
	let t396;
	let code66;
	let t397;
	let t398;
	let code67;
	let t399;
	let t400;
	let t401;
	let pre14;

	let raw14_value = `
<code class="language-js"><span class="token keyword">function</span> <span class="token function">init</span><span class="token punctuation">(</span><span class="token parameter">app<span class="token punctuation">,</span> options<span class="token punctuation">,</span> instance<span class="token punctuation">,</span> create_fragment</span><span class="token punctuation">)</span> <span class="token punctuation">&#123;</span>
  <span class="token keyword">const</span> ctx <span class="token operator">=</span> <span class="token function">instance</span><span class="token punctuation">(</span>app<span class="token punctuation">,</span> options<span class="token punctuation">.</span>props<span class="token punctuation">)</span><span class="token punctuation">;</span>
  <span class="token comment">// highlight-next-line</span>
  <span class="token keyword">const</span> fragment <span class="token operator">=</span> <span class="token function">create_fragment</span><span class="token punctuation">(</span>ctx<span class="token punctuation">)</span><span class="token punctuation">;</span>
<span class="token punctuation">&#125;</span></code>` + "";

	let t402;
	let p74;
	let t403;
	let t404;
	let pre15;

	let raw15_value = `
<code class="language-js"><span class="token keyword">function</span> <span class="token function">init</span><span class="token punctuation">(</span><span class="token parameter">app<span class="token punctuation">,</span> options<span class="token punctuation">,</span> instance<span class="token punctuation">,</span> create_fragment</span><span class="token punctuation">)</span> <span class="token punctuation">&#123;</span>
  <span class="token keyword">const</span> ctx <span class="token operator">=</span> <span class="token function">instance</span><span class="token punctuation">(</span>app<span class="token punctuation">,</span> options<span class="token punctuation">.</span>props<span class="token punctuation">)</span><span class="token punctuation">;</span>
  <span class="token keyword">const</span> fragment <span class="token operator">=</span> <span class="token function">create_fragment</span><span class="token punctuation">(</span>ctx<span class="token punctuation">)</span><span class="token punctuation">;</span>
  <span class="token comment">// highlight-start</span>
  <span class="token comment">// create / claim the nodes</span>
  <span class="token keyword">if</span> <span class="token punctuation">(</span>options<span class="token punctuation">.</span>hydratable<span class="token punctuation">)</span> <span class="token punctuation">&#123;</span>
    fragment<span class="token punctuation">.</span><span class="token function">claim</span><span class="token punctuation">(</span><span class="token punctuation">)</span><span class="token punctuation">;</span>
  <span class="token punctuation">&#125;</span> <span class="token keyword">else</span> <span class="token punctuation">&#123;</span>
    fragment<span class="token punctuation">.</span><span class="token function">create</span><span class="token punctuation">(</span><span class="token punctuation">)</span><span class="token punctuation">;</span>
  <span class="token punctuation">&#125;</span>
  <span class="token comment">// mount the nodes</span>
  fragment<span class="token punctuation">.</span><span class="token function">mount</span><span class="token punctuation">(</span><span class="token punctuation">)</span><span class="token punctuation">;</span>
  <span class="token comment">// highlight-end</span>
<span class="token punctuation">&#125;</span></code>` + "";

	let t405;
	let p75;
	let t406;
	let code68;
	let t407;
	let t408;
	let t409;
	let p76;
	let t410;
	let code69;
	let t411;
	let t412;
	let strong26;
	let code70;
	let t413;
	let t414;
	let t415;
	let p77;
	let t416;
	let code71;
	let t417;
	let t418;
	let t419;
	let p78;
	let code72;
	let t420;
	let t421;
	let t422;
	let pre16;

	let raw16_value = `
<code class="language-js"><span class="token keyword">function</span> <span class="token function">init</span><span class="token punctuation">(</span><span class="token parameter">app<span class="token punctuation">,</span> options<span class="token punctuation">,</span> instance<span class="token punctuation">,</span> create_fragment</span><span class="token punctuation">)</span> <span class="token punctuation">&#123;</span>
  <span class="token comment">// highlight-start</span>
  <span class="token keyword">const</span> <span class="token function-variable function">$$invalidate</span> <span class="token operator">=</span> <span class="token punctuation">(</span><span class="token parameter">name<span class="token punctuation">,</span> value</span><span class="token punctuation">)</span> <span class="token operator">=></span> <span class="token punctuation">&#123;</span>
    ctx<span class="token punctuation">[</span>name<span class="token punctuation">]</span> <span class="token operator">=</span> value<span class="token punctuation">;</span>
    <span class="token comment">// update the nodes</span>
    fragment<span class="token punctuation">.</span><span class="token function">update</span><span class="token punctuation">(</span><span class="token punctuation">&#123;</span> <span class="token punctuation">[</span>name<span class="token punctuation">]</span><span class="token punctuation">:</span> <span class="token boolean">true</span> <span class="token punctuation">&#125;</span><span class="token punctuation">,</span> ctx<span class="token punctuation">)</span><span class="token punctuation">;</span>
  <span class="token punctuation">&#125;</span><span class="token punctuation">;</span>
  <span class="token keyword">const</span> ctx <span class="token operator">=</span> <span class="token function">instance</span><span class="token punctuation">(</span>app<span class="token punctuation">,</span> options<span class="token punctuation">.</span>props<span class="token punctuation">,</span> $$invalidate<span class="token punctuation">)</span><span class="token punctuation">;</span>
  <span class="token comment">// highlight-end</span>
  <span class="token keyword">const</span> fragment <span class="token operator">=</span> <span class="token function">create_fragment</span><span class="token punctuation">(</span>ctx<span class="token punctuation">)</span><span class="token punctuation">;</span>
  <span class="token comment">// create / claim the nodes</span>
  <span class="token keyword">if</span> <span class="token punctuation">(</span>options<span class="token punctuation">.</span>hydratable<span class="token punctuation">)</span> <span class="token punctuation">&#123;</span>
    fragment<span class="token punctuation">.</span><span class="token function">claim</span><span class="token punctuation">(</span><span class="token punctuation">)</span><span class="token punctuation">;</span>
  <span class="token punctuation">&#125;</span> <span class="token keyword">else</span> <span class="token punctuation">&#123;</span>
    fragment<span class="token punctuation">.</span><span class="token function">create</span><span class="token punctuation">(</span><span class="token punctuation">)</span><span class="token punctuation">;</span>
  <span class="token punctuation">&#125;</span>
  <span class="token comment">// mount the nodes</span>
  fragment<span class="token punctuation">.</span><span class="token function">mount</span><span class="token punctuation">(</span><span class="token punctuation">)</span><span class="token punctuation">;</span>
<span class="token punctuation">&#125;</span></code>` + "";

	let t423;
	let p79;
	let em16;
	let t424;
	let code73;
	let t425;
	let t426;
	let code74;
	let t427;
	let t428;
	let code75;
	let t429;
	let t430;
	let t431;
	let p80;
	let t432;
	let t433;
	let section6;
	let h23;
	let a25;
	let t434;
	let t435;
	let p81;
	let t436;

	return {
		c() {
			section0 = element("section");
			ul0 = element("ul");
			li0 = element("li");
			a0 = element("a");
			t0 = text("What is Svelte?");
			ul2 = element("ul");
			li1 = element("li");
			a1 = element("a");
			t1 = text("Writing vanilla JavaScript");
			li2 = element("li");
			a2 = element("a");
			t2 = text("Conceptually, how does compiled Svelte component work?");
			li3 = element("li");
			a3 = element("a");
			t3 = text("How the compiled Svelte component works");
			ul1 = element("ul");
			li4 = element("li");
			a4 = element("a");
			t4 = text("Pieces them together");
			li5 = element("li");
			a5 = element("a");
			t5 = text("The Svelte compiler");
			t6 = space();
			section1 = element("section");
			h1 = element("h1");
			a6 = element("a");
			t7 = text("[DRAFT] What is Svelte?");
			t8 = space();
			p0 = element("p");
			t9 = text("-- this is a work in progress draft, you can read ");
			a7 = element("a");
			t10 = text("Compile Svelte in your Head");
			t11 = text(" which is a more friendly version --");
			t12 = space();
			p1 = element("p");
			a8 = element("a");
			t13 = text("Svelte");
			t14 = text(" is a compiler for web applications. Svelte provides a framework for you to write your web apps declaratively, and it will compile them into efficient JavaScript.");
			t15 = space();
			p2 = element("p");
			t16 = text("In this article, I will be sharing how Svelte works.");
			t17 = space();
			p3 = element("p");
			t18 = text("If you are:");
			t19 = space();
			ul3 = element("ul");
			li6 = element("li");
			p4 = element("p");
			strong0 = element("strong");
			t20 = text("First time hearing Svelte?");
			t21 = space();
			p5 = element("p");
			t22 = text("Please go and watch ");
			a9 = element("a");
			t23 = text("Rich Harris");
			t24 = text(" inspiring talk on ");
			a10 = element("a");
			t25 = text("\"Rethinking reactivity\"");
			t26 = text(" where he announces Svelte.");
			t27 = space();
			li7 = element("li");
			p6 = element("p");
			strong1 = element("strong");
			t28 = text("Interested learning how to write Svelte application?");
			t29 = space();
			p7 = element("p");
			t30 = text("Please follow along ");
			a11 = element("a");
			t31 = text("Svelte's interactive tutorial");
			t32 = text(", I find it very helpful and it get me started in no time!");
			t33 = space();
			p8 = element("p");
			t34 = text("Because, I will be going deep level by level, guiding you through the source code sometimes, explaining how Svelte works.");
			t35 = space();
			ul6 = element("ul");
			li9 = element("li");
			t36 = text("look at code written in vanilla vs using framework");
			ul4 = element("ul");
			li8 = element("li");
			t37 = text("compile time vs build time spectrum, svelte and react opposite side of the spectrum");
			t38 = space();
			li11 = element("li");
			t39 = text("a picture of how a svelte component works");
			ul5 = element("ul");
			li10 = element("li");
			t40 = space();
			section2 = element("section");
			h20 = element("h2");
			a12 = element("a");
			t41 = text("Writing vanilla JavaScript");
			t42 = space();
			p9 = element("p");
			t43 = text("Before we get started, lets' do an exercise.");
			t44 = space();
			p10 = element("p");
			t45 = text("Let's write a counter app like below, without using any framework:");
			t46 = space();
			div = element("div");
			button0 = element("button");
			t47 = text("-");
			t48 = space();
			span = element("span");
			t49 = text("0");
			t50 = space();
			button1 = element("button");
			t51 = text("+");
			t52 = space();
			script = element("script");
			t53 = text("let count = 0;\n    const span = document.querySelector('#ex1-count');\n    document.querySelector('#ex1-decrement').onclick = () => span.textContent = --count;\n    document.querySelector('#ex1-increment').onclick = () => span.textContent = ++count;");
			t54 = space();
			p11 = element("p");
			t55 = text("There are generally 2 approaches to this:");
			t56 = space();
			p12 = element("p");
			strong2 = element("strong");
			t57 = text("1. HTML + JS");
			t58 = space();
			p13 = element("p");
			t59 = text("You build your app layout in HTML:");
			t60 = space();
			pre0 = element("pre");
			t61 = space();
			p14 = element("p");
			t62 = text("then in JS, you use id selector to query out the dynamic part of your HTML and attach event listeners to respond to user inputs:");
			t63 = space();
			pre1 = element("pre");
			t64 = space();
			p15 = element("p");
			strong3 = element("strong");
			t65 = text("2. JS only");
			t66 = space();
			p16 = element("p");
			t67 = text("If you want to have more than 1 counter, the former approach may require you to ");
			em0 = element("em");
			t68 = text("copy + paste");
			t69 = text(" your HTML ");
			em1 = element("em");
			t70 = text("n");
			t71 = text(" times for ");
			em2 = element("em");
			t72 = text("n");
			t73 = text(" number of counters.");
			t74 = space();
			p17 = element("p");
			t75 = text("The alternative would be to build the HTML elements programatically:");
			t76 = space();
			pre2 = element("pre");
			t77 = space();
			p18 = element("p");
			t78 = text("This is the least amount of code to be written for a counter app.");
			t79 = space();
			p19 = element("p");
			em3 = element("em");
			t80 = text("(One may argue that you can abstract out ");
			code0 = element("code");
			t81 = text("document.createElement");
			t82 = text(" or ");
			code1 = element("code");
			t83 = text("parent.appendChild");
			t84 = text(" to a function to make the code smaller, but that's besides the point.)");
			t85 = space();
			p20 = element("p");
			t86 = text("This is the least amount of code to be written ");
			strong4 = element("strong");
			t87 = text("and be executed by the browser");
			t88 = text(" for a counter app.");
			t89 = space();
			p21 = element("p");
			t90 = text("So why does this matter? Well, before we proceed to explain how this got to do with Svelte, let's first talk about React.");
			t91 = space();
			p22 = element("p");
			em4 = element("em");
			t92 = text("I chose to talk about React ");
			strong5 = element("strong");
			t93 = text("just because I am a React developer");
			t94 = text(", I use React at my work and at this very blog site. I am most familiar with React than any other JS frameworks out there");
			t95 = space();
			p23 = element("p");
			t96 = text("In React, you can argubly write a much concise and declarative code:");
			t97 = space();
			pre3 = element("pre");
			t98 = space();
			p24 = element("p");
			t99 = text("That's because React has hidden all the ");
			code2 = element("code");
			t100 = text("document.createElement");
			t101 = text(", ");
			code3 = element("code");
			t102 = text("parent.appendChild");
			t103 = text(", ... under ");
			a13 = element("a");
			code4 = element("code");
			t104 = text("react-dom");
			t105 = text(" renderer.");
			t106 = space();
			p25 = element("p");
			t107 = text("Everytime you click on a counter button, the function ");
			code5 = element("code");
			t108 = text("Counter");
			t109 = text(" is called to get the new ");
			a14 = element("a");
			t110 = text("Fiber tree");
			t111 = text(" with the new state value, and it is compared with the current Fiber tree. After the diffing between the 2 Fiber tree, React collects the necessary DOM operations, in this case is to update ");
			code6 = element("code");
			t112 = text("span");
			t113 = text("'s ");
			code7 = element("code");
			t114 = text("textContent");
			t115 = text(".");
			t116 = space();
			p26 = element("p");
			t117 = text("If you feel this is overly complicated, wait, there is more.");
			t118 = space();
			p27 = element("p");
			t119 = text("When the ");
			code8 = element("code");
			t120 = text("react-dom");
			t121 = space();
			a15 = element("a");
			t122 = text("receives the DOM operations");
			t123 = text(", it receives ");
			code9 = element("code");
			t124 = text("['span', { 'children': '1' }]");
			t125 = text(", the element and the update payload, and ");
			code10 = element("code");
			t126 = text("react-dom");
			t127 = text(" has to figure out that ");
			code11 = element("code");
			t128 = text("children");
			t129 = text(" meant ");
			a16 = element("a");
			t130 = text("setting the ");
			code12 = element("code");
			t131 = text("textContent");
			t132 = text(".");
			t133 = space();
			p28 = element("p");
			t134 = text("As you can see, there's a lot of code ");
			strong6 = element("strong");
			t135 = text("executed");
			t136 = text(" under the hood, which you may think is overkill for this contrived example. But with a much larger/complex application, you will soon appreciate the flexibilty React provides. to achieve that, react has to make sure it has code to capture all the different scenarios, without knowing what will be written by us, the developer.");
			t137 = space();
			p29 = element("p");
			t138 = text("Now, here is how Svelte is different. ");
			strong7 = element("strong");
			t139 = text("Svelte is a compiler");
			t140 = text(". Svelte knows what we, the developer, has written, and generate only code that is needed for our application.");
			t141 = space();
			p30 = element("p");
			t142 = text("Here's what Svelte generated for our Counter app (");
			a17 = element("a");
			t143 = text("repl");
			t144 = text("):");
			t145 = space();
			pre4 = element("pre");
			t146 = space();
			p31 = element("p");
			strong8 = element("strong");
			t147 = text("Disclaimer:");
			t148 = space();
			em5 = element("em");
			t149 = text("There are parts of code deliberately removed to make the code more concise and readable, which should not affect the point I am trying to make here. Feel free to read the original code in the ");
			a18 = element("a");
			t150 = text("repl");
			t151 = text(".");
			t152 = space();
			p32 = element("p");
			t153 = text("You see Svelte's generated code is much like the one we've written in plain JavaScript just now. It generates the ");
			code13 = element("code");
			t154 = text(".textContent");
			t155 = text(" directly, because during compilation, Svelte knows exactly what you are trying to do. Therefore it can try to handle all the different scenarios, where React tries to handle in runtime, in build time.");
			t156 = space();
			p33 = element("p");
			t157 = text("Now you know the fundamental differences between Svelte and React, let's take a look how a Svelte component works.");
			t158 = space();
			section3 = element("section");
			h21 = element("h2");
			a19 = element("a");
			t159 = text("Conceptually, how does compiled Svelte component work?");
			t160 = space();
			p34 = element("p");
			t161 = text("In this section, we are going to write Svelte component incrementally, and see how each changes ended up in the compiled Svelte component.");
			t162 = space();
			p35 = element("p");
			t163 = text("Let's start with a simple button and a text:");
			t164 = space();
			pre5 = element("pre");
			t165 = space();
			p36 = element("p");
			t166 = text("When Svelte sees this, these HTML elements will translate into JavaScript statement to create the elements:");
			t167 = space();
			pre6 = element("pre");
			t168 = space();
			p37 = element("p");
			t169 = text("If you inspect the Svelte compiled output, you would notice that these instruction lies in a function call ");
			code14 = element("code");
			t170 = text("create_fragment");
			t171 = text(". ");
			code15 = element("code");
			t172 = text("create_fragment");
			t173 = text(" is the function where Svelte keeps the DOM instructions for the component.");
			t174 = space();
			p38 = element("p");
			t175 = text("Next, lets add some event listener to the button:");
			t176 = space();
			pre7 = element("pre");
			t177 = space();
			section4 = element("section");
			h22 = element("h2");
			a20 = element("a");
			t178 = text("How the compiled Svelte component works");
			t179 = space();
			p39 = element("p");
			t180 = text("To differentiate between the component code you write, and the component code generated by Svelte, I will use ");
			code16 = element("code");
			t181 = text(".svelte");
			t182 = text(" component to refer the code you would write in a ");
			code17 = element("code");
			t183 = text(".svelte");
			t184 = text(" file, and Svelte component to refer the ");
			code18 = element("code");
			t185 = text(".js");
			t186 = text(" code, generated by Svelte from your ");
			code19 = element("code");
			t187 = text(".svelte");
			t188 = text(" component, that will be executed in your application.");
			t189 = space();
			p40 = element("p");
			t190 = text("The best way to understand how Svelte component works is to use the ");
			a21 = element("a");
			t191 = text("Svelte's REPL");
			t192 = text(". Try writing a component, and see how Svelte compiles the component into plain JavaScript.");
			t193 = space();
			p41 = element("p");
			t194 = text("Svelte compiles the ");
			code20 = element("code");
			t195 = text(".svelte");
			t196 = text(" file into a ");
			code21 = element("code");
			t197 = text(".js");
			t198 = text(" file, which the ");
			code22 = element("code");
			t199 = text("export default");
			t200 = text(" the compiled Svelte component.");
			t201 = space();
			p42 = element("p");
			t202 = text("The compiled Svelte component contains 3 main sections:");
			t203 = space();
			ul7 = element("ul");
			li12 = element("li");
			code23 = element("code");
			t204 = text("create_fragment");
			t205 = space();
			li13 = element("li");
			code24 = element("code");
			t206 = text("instance");
			t207 = space();
			li14 = element("li");
			t208 = text("the Component itself");
			t209 = space();
			pre8 = element("pre");
			t210 = space();
			p43 = element("p");
			t211 = text("Let's explain what each section of the code is for, from the bottom up.");
			t212 = space();
			p44 = element("p");
			strong9 = element("strong");
			t213 = text("3. The component itself");
			t214 = space();
			p45 = element("p");
			t215 = text("Each compiled component, by default, is a subclass of ");
			code25 = element("code");
			t216 = text("SvelteComponent");
			t217 = text(".");
			t218 = space();
			p46 = element("p");
			t219 = text("To create the component onto the DOM, you can create an instance of the component:");
			t220 = space();
			pre9 = element("pre");
			t221 = space();
			p47 = element("p");
			t222 = text("In the constructor of ");
			code26 = element("code");
			t223 = text("App");
			t224 = text(", as you can see, calls the ");
			code27 = element("code");
			t225 = text("init");
			t226 = text(" function, which takes in both ");
			code28 = element("code");
			t227 = text("instance");
			t228 = text(" and ");
			code29 = element("code");
			t229 = text("create_fragment");
			t230 = text(" function.");
			t231 = space();
			p48 = element("p");
			t232 = text("The ");
			code30 = element("code");
			t233 = text("init");
			t234 = text(" function, as the name suggests, will set things up, which lead us to the ");
			code31 = element("code");
			t235 = text("instance");
			t236 = text(" function.");
			t237 = space();
			p49 = element("p");
			strong10 = element("strong");
			t238 = text("2. ");
			code32 = element("code");
			t239 = text("instance");
			t240 = space();
			p50 = element("p");
			t241 = text("The ");
			code33 = element("code");
			t242 = text("instance");
			t243 = text(" function is where all the business logic of your ");
			code34 = element("code");
			t244 = text(".svelte");
			t245 = text(" component lies.");
			t246 = space();
			p51 = element("p");
			t247 = text("That's why, if you take a closer look, the ");
			code35 = element("code");
			t248 = text("instance");
			t249 = text(" function contains most, if not all, the code you write in the ");
			code36 = element("code");
			t250 = text("<script>");
			t251 = text(" tag in the ");
			code37 = element("code");
			t252 = text(".svelte");
			t253 = text(" component.");
			t254 = space();
			hr0 = element("hr");
			t255 = space();
			p52 = element("p");
			t256 = text("Code that you write in the ");
			code38 = element("code");
			t257 = text("<script>");
			t258 = text(" tag that will not be in the ");
			code39 = element("code");
			t259 = text("instance");
			t260 = text(" function are:");
			t261 = space();
			ul12 = element("ul");
			li16 = element("li");
			strong11 = element("strong");
			code40 = element("code");
			t262 = text("import");
			t263 = text(" statement");
			ul8 = element("ul");
			li15 = element("li");
			t264 = text("These will be moved to the beginning of the compiled file.");
			t265 = space();
			li18 = element("li");
			strong12 = element("strong");
			code41 = element("code");
			t266 = text("export");
			t267 = text(" statement");
			ul9 = element("ul");
			li17 = element("li");
			t268 = text("These are exported properties or methods of the Svelte component. It will be present in the former section, \"the component itself\" section.");
			t269 = space();
			li22 = element("li");
			strong13 = element("strong");
			t270 = text("constants");
			ul10 = element("ul");
			li19 = element("li");
			t271 = text("Since the value of a constant will not change throughout the lifetime of your application, so there's no point redeclaring a new constant for every instance of your Svelte component.");
			t272 = space();
			li20 = element("li");
			t273 = text("Therefore it is moved out from the ");
			code42 = element("code");
			t274 = text("instance");
			t275 = text(" function.");
			t276 = space();
			li21 = element("li");
			a22 = element("a");
			t277 = text("Check out the repl");
			t278 = text(".");
			t279 = space();
			li25 = element("li");
			strong14 = element("strong");
			t280 = text("pure functions");
			ul11 = element("ul");
			li23 = element("li");
			t281 = text("The same logic goes with pure functions. If the function does not rely on any variables within the scope other than it's own arguments, the function will be moved out from the ");
			code43 = element("code");
			t282 = text("instance");
			t283 = text(" function.");
			t284 = space();
			li24 = element("li");
			a23 = element("a");
			t285 = text("Check out this repl");
			t286 = text(".");
			t287 = space();
			hr1 = element("hr");
			t288 = space();
			p53 = element("p");
			t289 = text("The ");
			code44 = element("code");
			t290 = text("instance");
			t291 = text(" function contains all of your business logic, and returns an object. The object contains all the variables and functions you've declared and used in the HTML code. The object is referred as ");
			code45 = element("code");
			t292 = text("ctx");
			t293 = text(" in Svelte, and that brings us to the ");
			code46 = element("code");
			t294 = text("create_fragment");
			t295 = text(" function.");
			t296 = space();
			p54 = element("p");
			strong15 = element("strong");
			t297 = text("1. ");
			code47 = element("code");
			t298 = text("create_fragment");
			t299 = space();
			p55 = element("p");
			t300 = text("The ");
			code48 = element("code");
			t301 = text("create_fragment");
			t302 = text(" function deals with the HTML code you've written in a ");
			code49 = element("code");
			t303 = text(".svelte");
			t304 = text(" component. The ");
			code50 = element("code");
			t305 = text("create_fragment");
			t306 = text(" function takes in the ");
			code51 = element("code");
			t307 = text("ctx");
			t308 = text(" object, and returns an object that instructs the Svelte component how to render into the DOM, that looks like this:");
			t309 = space();
			pre10 = element("pre");
			t310 = space();
			p56 = element("p");
			t311 = text("Let's take a closer look to what each function does:");
			t312 = space();
			p57 = element("p");
			strong16 = element("strong");
			t313 = text("- c ");
			em6 = element("em");
			t314 = text("(create)");
			t315 = space();
			p58 = element("p");
			t316 = text("This function creates all the DOM nodes needed.");
			t317 = space();
			p59 = element("p");
			strong17 = element("strong");
			t318 = text("- l ");
			em7 = element("em");
			t319 = text("(claim)");
			t320 = space();
			p60 = element("p");
			t321 = text("On the other hand, if you use a server-side rendering, and you want to hydrate the rendered DOM with the component, the ");
			code52 = element("code");
			t322 = text("claim");
			t323 = text(" function will be called instead of ");
			code53 = element("code");
			t324 = text("create");
			t325 = text(". This will try to claim and assign reference to the DOM node.");
			t326 = space();
			p61 = element("p");
			strong18 = element("strong");
			t327 = text("- m ");
			em8 = element("em");
			t328 = text("(mount)");
			t329 = space();
			p62 = element("p");
			t330 = text("With the references to the DOM nodes, the ");
			code54 = element("code");
			t331 = text("mount");
			t332 = text(" function will ");
			code55 = element("code");
			t333 = text("insert");
			t334 = text(" or ");
			code56 = element("code");
			t335 = text("append");
			t336 = text(" DOM nodes to the target accordingly.");
			t337 = space();
			p63 = element("p");
			strong19 = element("strong");
			t338 = text("- p ");
			em9 = element("em");
			t339 = text("(update)");
			t340 = space();
			p64 = element("p");
			t341 = text("If there's a change, say after a button click, the ");
			code57 = element("code");
			t342 = text("update");
			t343 = text(" function will be called with the changed mask and the new ");
			code58 = element("code");
			t344 = text("ctx");
			t345 = text(" object.");
			t346 = space();
			p65 = element("p");
			strong20 = element("strong");
			t347 = text("- r ");
			em10 = element("em");
			t348 = text("(measure)");
			br0 = element("br");
			t349 = space();
			strong21 = element("strong");
			t350 = text("- f ");
			em11 = element("em");
			t351 = text("(fix)");
			br1 = element("br");
			t352 = space();
			strong22 = element("strong");
			t353 = text("- a ");
			em12 = element("em");
			t354 = text("(animate)");
			br2 = element("br");
			t355 = space();
			strong23 = element("strong");
			t356 = text("- i ");
			em13 = element("em");
			t357 = text("(intro)");
			br3 = element("br");
			t358 = space();
			strong24 = element("strong");
			t359 = text("- o ");
			em14 = element("em");
			t360 = text("(outro)");
			t361 = space();
			p66 = element("p");
			t362 = text("These are for animations, measuring and fixing the element before animation, ");
			code59 = element("code");
			t363 = text("intro");
			t364 = text("s and ");
			code60 = element("code");
			t365 = text("outro");
			t366 = text("s.");
			t367 = space();
			p67 = element("p");
			strong25 = element("strong");
			t368 = text("- d ");
			em15 = element("em");
			t369 = text("(destroy)");
			t370 = space();
			p68 = element("p");
			t371 = text("Last but not least, the ");
			code61 = element("code");
			t372 = text("destroy");
			t373 = text(" function is called when the Svelte component unmounts from the target.");
			t374 = space();
			section5 = element("section");
			h3 = element("h3");
			a24 = element("a");
			t375 = text("Pieces them together");
			t376 = space();
			p69 = element("p");
			t377 = text("With every pieces in mind, let's summarise what we've learned so far:");
			t378 = space();
			p70 = element("p");
			t379 = text("You create the component into DOM by create a new instance of the Svelte component:");
			t380 = space();
			pre11 = element("pre");
			t381 = space();
			p71 = element("p");
			t382 = text("Which in the constructor of ");
			code62 = element("code");
			t383 = text("App");
			t384 = text(", it calls the ");
			code63 = element("code");
			t385 = text("init");
			t386 = text(" function:");
			t387 = space();
			pre12 = element("pre");
			t388 = space();
			p72 = element("p");
			t389 = text("Within the ");
			code64 = element("code");
			t390 = text("init");
			t391 = text(" function, the ");
			code65 = element("code");
			t392 = text("instance");
			t393 = text(" function is called:");
			t394 = space();
			pre13 = element("pre");
			t395 = space();
			p73 = element("p");
			t396 = text("Which returns the ");
			code66 = element("code");
			t397 = text("ctx");
			t398 = text(", and it is passed into the ");
			code67 = element("code");
			t399 = text("create_fragment");
			t400 = text(" function:");
			t401 = space();
			pre14 = element("pre");
			t402 = space();
			p74 = element("p");
			t403 = text("Which returns instructions on how to create DOM nodes and mount the nodes into DOM:");
			t404 = space();
			pre15 = element("pre");
			t405 = space();
			p75 = element("p");
			t406 = text("But hey, when does the ");
			code68 = element("code");
			t407 = text("fragment.update()");
			t408 = text(" get called when something has changed?");
			t409 = space();
			p76 = element("p");
			t410 = text("That my friend, is the secret 3rd argument of the ");
			code69 = element("code");
			t411 = text("instance");
			t412 = text(" function, ");
			strong26 = element("strong");
			code70 = element("code");
			t413 = text("$$invalidate");
			t414 = text(".");
			t415 = space();
			p77 = element("p");
			t416 = text("Whenever you reassign a value to your variable, Svelte will add an extra statement of ");
			code71 = element("code");
			t417 = text("$$invalidate(...)");
			t418 = text(" statement after your re-assignment.");
			t419 = space();
			p78 = element("p");
			code72 = element("code");
			t420 = text("$$invalidate");
			t421 = text(" takes 2 arguments, the name of the variable, and the new value of the variable:");
			t422 = space();
			pre16 = element("pre");
			t423 = space();
			p79 = element("p");
			em16 = element("em");
			t424 = text("Of course, if you have consecutive ");
			code73 = element("code");
			t425 = text("$$invalidate");
			t426 = text(" calls, Svelte will batch all the ");
			code74 = element("code");
			t427 = text("$$invalidate");
			t428 = text(" changes, and call ");
			code75 = element("code");
			t429 = text("fragment.update");
			t430 = text(" only once with all the changes.");
			t431 = space();
			p80 = element("p");
			t432 = text("Now that you have a clearer picture on how Svelte works, let's go one level deeper, and take a look how the Svelte compiler works.");
			t433 = space();
			section6 = element("section");
			h23 = element("h2");
			a25 = element("a");
			t434 = text("The Svelte compiler");
			t435 = space();
			p81 = element("p");
			t436 = text("-- WIP --");
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

			children(ul0).forEach(detach);
			li0 = claim_element(section0_nodes, "LI", {});
			var li0_nodes = children(li0);
			a0 = claim_element(li0_nodes, "A", { href: true });
			var a0_nodes = children(a0);
			t0 = claim_text(a0_nodes, "What is Svelte?");
			a0_nodes.forEach(detach);
			li0_nodes.forEach(detach);
			ul2 = claim_element(section0_nodes, "UL", {});
			var ul2_nodes = children(ul2);
			li1 = claim_element(ul2_nodes, "LI", {});
			var li1_nodes = children(li1);
			a1 = claim_element(li1_nodes, "A", { href: true });
			var a1_nodes = children(a1);
			t1 = claim_text(a1_nodes, "Writing vanilla JavaScript");
			a1_nodes.forEach(detach);
			li1_nodes.forEach(detach);
			li2 = claim_element(ul2_nodes, "LI", {});
			var li2_nodes = children(li2);
			a2 = claim_element(li2_nodes, "A", { href: true });
			var a2_nodes = children(a2);
			t2 = claim_text(a2_nodes, "Conceptually, how does compiled Svelte component work?");
			a2_nodes.forEach(detach);
			li2_nodes.forEach(detach);
			li3 = claim_element(ul2_nodes, "LI", {});
			var li3_nodes = children(li3);
			a3 = claim_element(li3_nodes, "A", { href: true });
			var a3_nodes = children(a3);
			t3 = claim_text(a3_nodes, "How the compiled Svelte component works");
			a3_nodes.forEach(detach);
			li3_nodes.forEach(detach);
			ul1 = claim_element(ul2_nodes, "UL", {});
			var ul1_nodes = children(ul1);
			li4 = claim_element(ul1_nodes, "LI", {});
			var li4_nodes = children(li4);
			a4 = claim_element(li4_nodes, "A", { href: true });
			var a4_nodes = children(a4);
			t4 = claim_text(a4_nodes, "Pieces them together");
			a4_nodes.forEach(detach);
			li4_nodes.forEach(detach);
			ul1_nodes.forEach(detach);
			li5 = claim_element(ul2_nodes, "LI", {});
			var li5_nodes = children(li5);
			a5 = claim_element(li5_nodes, "A", { href: true });
			var a5_nodes = children(a5);
			t5 = claim_text(a5_nodes, "The Svelte compiler");
			a5_nodes.forEach(detach);
			li5_nodes.forEach(detach);
			ul2_nodes.forEach(detach);
			section0_nodes.forEach(detach);
			t6 = claim_space(nodes);
			section1 = claim_element(nodes, "SECTION", {});
			var section1_nodes = children(section1);
			h1 = claim_element(section1_nodes, "H1", {});
			var h1_nodes = children(h1);
			a6 = claim_element(h1_nodes, "A", { href: true, id: true });
			var a6_nodes = children(a6);
			t7 = claim_text(a6_nodes, "[DRAFT] What is Svelte?");
			a6_nodes.forEach(detach);
			h1_nodes.forEach(detach);
			t8 = claim_space(section1_nodes);
			p0 = claim_element(section1_nodes, "P", {});
			var p0_nodes = children(p0);
			t9 = claim_text(p0_nodes, "-- this is a work in progress draft, you can read ");
			a7 = claim_element(p0_nodes, "A", { href: true });
			var a7_nodes = children(a7);
			t10 = claim_text(a7_nodes, "Compile Svelte in your Head");
			a7_nodes.forEach(detach);
			t11 = claim_text(p0_nodes, " which is a more friendly version --");
			p0_nodes.forEach(detach);
			t12 = claim_space(section1_nodes);
			p1 = claim_element(section1_nodes, "P", {});
			var p1_nodes = children(p1);
			a8 = claim_element(p1_nodes, "A", { href: true, rel: true });
			var a8_nodes = children(a8);
			t13 = claim_text(a8_nodes, "Svelte");
			a8_nodes.forEach(detach);
			t14 = claim_text(p1_nodes, " is a compiler for web applications. Svelte provides a framework for you to write your web apps declaratively, and it will compile them into efficient JavaScript.");
			p1_nodes.forEach(detach);
			t15 = claim_space(section1_nodes);
			p2 = claim_element(section1_nodes, "P", {});
			var p2_nodes = children(p2);
			t16 = claim_text(p2_nodes, "In this article, I will be sharing how Svelte works.");
			p2_nodes.forEach(detach);
			t17 = claim_space(section1_nodes);
			p3 = claim_element(section1_nodes, "P", {});
			var p3_nodes = children(p3);
			t18 = claim_text(p3_nodes, "If you are:");
			p3_nodes.forEach(detach);
			t19 = claim_space(section1_nodes);
			ul3 = claim_element(section1_nodes, "UL", {});
			var ul3_nodes = children(ul3);
			li6 = claim_element(ul3_nodes, "LI", {});
			var li6_nodes = children(li6);
			p4 = claim_element(li6_nodes, "P", {});
			var p4_nodes = children(p4);
			strong0 = claim_element(p4_nodes, "STRONG", {});
			var strong0_nodes = children(strong0);
			t20 = claim_text(strong0_nodes, "First time hearing Svelte?");
			strong0_nodes.forEach(detach);
			p4_nodes.forEach(detach);
			t21 = claim_space(li6_nodes);
			p5 = claim_element(li6_nodes, "P", {});
			var p5_nodes = children(p5);
			t22 = claim_text(p5_nodes, "Please go and watch ");
			a9 = claim_element(p5_nodes, "A", { href: true, rel: true });
			var a9_nodes = children(a9);
			t23 = claim_text(a9_nodes, "Rich Harris");
			a9_nodes.forEach(detach);
			t24 = claim_text(p5_nodes, " inspiring talk on ");
			a10 = claim_element(p5_nodes, "A", { href: true, rel: true });
			var a10_nodes = children(a10);
			t25 = claim_text(a10_nodes, "\"Rethinking reactivity\"");
			a10_nodes.forEach(detach);
			t26 = claim_text(p5_nodes, " where he announces Svelte.");
			p5_nodes.forEach(detach);
			li6_nodes.forEach(detach);
			t27 = claim_space(ul3_nodes);
			li7 = claim_element(ul3_nodes, "LI", {});
			var li7_nodes = children(li7);
			p6 = claim_element(li7_nodes, "P", {});
			var p6_nodes = children(p6);
			strong1 = claim_element(p6_nodes, "STRONG", {});
			var strong1_nodes = children(strong1);
			t28 = claim_text(strong1_nodes, "Interested learning how to write Svelte application?");
			strong1_nodes.forEach(detach);
			p6_nodes.forEach(detach);
			t29 = claim_space(li7_nodes);
			p7 = claim_element(li7_nodes, "P", {});
			var p7_nodes = children(p7);
			t30 = claim_text(p7_nodes, "Please follow along ");
			a11 = claim_element(p7_nodes, "A", { href: true, rel: true });
			var a11_nodes = children(a11);
			t31 = claim_text(a11_nodes, "Svelte's interactive tutorial");
			a11_nodes.forEach(detach);
			t32 = claim_text(p7_nodes, ", I find it very helpful and it get me started in no time!");
			p7_nodes.forEach(detach);
			li7_nodes.forEach(detach);
			ul3_nodes.forEach(detach);
			t33 = claim_space(section1_nodes);
			p8 = claim_element(section1_nodes, "P", {});
			var p8_nodes = children(p8);
			t34 = claim_text(p8_nodes, "Because, I will be going deep level by level, guiding you through the source code sometimes, explaining how Svelte works.");
			p8_nodes.forEach(detach);
			t35 = claim_space(section1_nodes);
			ul6 = claim_element(section1_nodes, "UL", {});
			var ul6_nodes = children(ul6);
			li9 = claim_element(ul6_nodes, "LI", {});
			var li9_nodes = children(li9);
			t36 = claim_text(li9_nodes, "look at code written in vanilla vs using framework");
			ul4 = claim_element(li9_nodes, "UL", {});
			var ul4_nodes = children(ul4);
			li8 = claim_element(ul4_nodes, "LI", {});
			var li8_nodes = children(li8);
			t37 = claim_text(li8_nodes, "compile time vs build time spectrum, svelte and react opposite side of the spectrum");
			li8_nodes.forEach(detach);
			ul4_nodes.forEach(detach);
			li9_nodes.forEach(detach);
			t38 = claim_space(ul6_nodes);
			li11 = claim_element(ul6_nodes, "LI", {});
			var li11_nodes = children(li11);
			t39 = claim_text(li11_nodes, "a picture of how a svelte component works");
			ul5 = claim_element(li11_nodes, "UL", {});
			var ul5_nodes = children(ul5);
			li10 = claim_element(ul5_nodes, "LI", {});
			children(li10).forEach(detach);
			ul5_nodes.forEach(detach);
			li11_nodes.forEach(detach);
			ul6_nodes.forEach(detach);
			section1_nodes.forEach(detach);
			t40 = claim_space(nodes);
			section2 = claim_element(nodes, "SECTION", {});
			var section2_nodes = children(section2);
			h20 = claim_element(section2_nodes, "H2", {});
			var h20_nodes = children(h20);
			a12 = claim_element(h20_nodes, "A", { href: true, id: true });
			var a12_nodes = children(a12);
			t41 = claim_text(a12_nodes, "Writing vanilla JavaScript");
			a12_nodes.forEach(detach);
			h20_nodes.forEach(detach);
			t42 = claim_space(section2_nodes);
			p9 = claim_element(section2_nodes, "P", {});
			var p9_nodes = children(p9);
			t43 = claim_text(p9_nodes, "Before we get started, lets' do an exercise.");
			p9_nodes.forEach(detach);
			t44 = claim_space(section2_nodes);
			p10 = claim_element(section2_nodes, "P", {});
			var p10_nodes = children(p10);
			t45 = claim_text(p10_nodes, "Let's write a counter app like below, without using any framework:");
			p10_nodes.forEach(detach);
			t46 = claim_space(section2_nodes);
			div = claim_element(section2_nodes, "DIV", { style: true });
			var div_nodes = children(div);
			button0 = claim_element(div_nodes, "BUTTON", { id: true });
			var button0_nodes = children(button0);
			t47 = claim_text(button0_nodes, "-");
			button0_nodes.forEach(detach);
			t48 = claim_space(div_nodes);
			span = claim_element(div_nodes, "SPAN", { id: true });
			var span_nodes = children(span);
			t49 = claim_text(span_nodes, "0");
			span_nodes.forEach(detach);
			t50 = claim_space(div_nodes);
			button1 = claim_element(div_nodes, "BUTTON", { id: true });
			var button1_nodes = children(button1);
			t51 = claim_text(button1_nodes, "+");
			button1_nodes.forEach(detach);
			t52 = claim_space(div_nodes);
			script = claim_element(div_nodes, "SCRIPT", {});
			var script_nodes = children(script);
			t53 = claim_text(script_nodes, "let count = 0;\n    const span = document.querySelector('#ex1-count');\n    document.querySelector('#ex1-decrement').onclick = () => span.textContent = --count;\n    document.querySelector('#ex1-increment').onclick = () => span.textContent = ++count;");
			script_nodes.forEach(detach);
			div_nodes.forEach(detach);
			t54 = claim_space(section2_nodes);
			p11 = claim_element(section2_nodes, "P", {});
			var p11_nodes = children(p11);
			t55 = claim_text(p11_nodes, "There are generally 2 approaches to this:");
			p11_nodes.forEach(detach);
			t56 = claim_space(section2_nodes);
			p12 = claim_element(section2_nodes, "P", {});
			var p12_nodes = children(p12);
			strong2 = claim_element(p12_nodes, "STRONG", {});
			var strong2_nodes = children(strong2);
			t57 = claim_text(strong2_nodes, "1. HTML + JS");
			strong2_nodes.forEach(detach);
			p12_nodes.forEach(detach);
			t58 = claim_space(section2_nodes);
			p13 = claim_element(section2_nodes, "P", {});
			var p13_nodes = children(p13);
			t59 = claim_text(p13_nodes, "You build your app layout in HTML:");
			p13_nodes.forEach(detach);
			t60 = claim_space(section2_nodes);
			pre0 = claim_element(section2_nodes, "PRE", { class: true });
			var pre0_nodes = children(pre0);
			pre0_nodes.forEach(detach);
			t61 = claim_space(section2_nodes);
			p14 = claim_element(section2_nodes, "P", {});
			var p14_nodes = children(p14);
			t62 = claim_text(p14_nodes, "then in JS, you use id selector to query out the dynamic part of your HTML and attach event listeners to respond to user inputs:");
			p14_nodes.forEach(detach);
			t63 = claim_space(section2_nodes);
			pre1 = claim_element(section2_nodes, "PRE", { class: true });
			var pre1_nodes = children(pre1);
			pre1_nodes.forEach(detach);
			t64 = claim_space(section2_nodes);
			p15 = claim_element(section2_nodes, "P", {});
			var p15_nodes = children(p15);
			strong3 = claim_element(p15_nodes, "STRONG", {});
			var strong3_nodes = children(strong3);
			t65 = claim_text(strong3_nodes, "2. JS only");
			strong3_nodes.forEach(detach);
			p15_nodes.forEach(detach);
			t66 = claim_space(section2_nodes);
			p16 = claim_element(section2_nodes, "P", {});
			var p16_nodes = children(p16);
			t67 = claim_text(p16_nodes, "If you want to have more than 1 counter, the former approach may require you to ");
			em0 = claim_element(p16_nodes, "EM", {});
			var em0_nodes = children(em0);
			t68 = claim_text(em0_nodes, "copy + paste");
			em0_nodes.forEach(detach);
			t69 = claim_text(p16_nodes, " your HTML ");
			em1 = claim_element(p16_nodes, "EM", {});
			var em1_nodes = children(em1);
			t70 = claim_text(em1_nodes, "n");
			em1_nodes.forEach(detach);
			t71 = claim_text(p16_nodes, " times for ");
			em2 = claim_element(p16_nodes, "EM", {});
			var em2_nodes = children(em2);
			t72 = claim_text(em2_nodes, "n");
			em2_nodes.forEach(detach);
			t73 = claim_text(p16_nodes, " number of counters.");
			p16_nodes.forEach(detach);
			t74 = claim_space(section2_nodes);
			p17 = claim_element(section2_nodes, "P", {});
			var p17_nodes = children(p17);
			t75 = claim_text(p17_nodes, "The alternative would be to build the HTML elements programatically:");
			p17_nodes.forEach(detach);
			t76 = claim_space(section2_nodes);
			pre2 = claim_element(section2_nodes, "PRE", { class: true });
			var pre2_nodes = children(pre2);
			pre2_nodes.forEach(detach);
			t77 = claim_space(section2_nodes);
			p18 = claim_element(section2_nodes, "P", {});
			var p18_nodes = children(p18);
			t78 = claim_text(p18_nodes, "This is the least amount of code to be written for a counter app.");
			p18_nodes.forEach(detach);
			t79 = claim_space(section2_nodes);
			p19 = claim_element(section2_nodes, "P", {});
			var p19_nodes = children(p19);
			em3 = claim_element(p19_nodes, "EM", {});
			var em3_nodes = children(em3);
			t80 = claim_text(em3_nodes, "(One may argue that you can abstract out ");
			code0 = claim_element(em3_nodes, "CODE", {});
			var code0_nodes = children(code0);
			t81 = claim_text(code0_nodes, "document.createElement");
			code0_nodes.forEach(detach);
			t82 = claim_text(em3_nodes, " or ");
			code1 = claim_element(em3_nodes, "CODE", {});
			var code1_nodes = children(code1);
			t83 = claim_text(code1_nodes, "parent.appendChild");
			code1_nodes.forEach(detach);
			t84 = claim_text(em3_nodes, " to a function to make the code smaller, but that's besides the point.)");
			em3_nodes.forEach(detach);
			p19_nodes.forEach(detach);
			t85 = claim_space(section2_nodes);
			p20 = claim_element(section2_nodes, "P", {});
			var p20_nodes = children(p20);
			t86 = claim_text(p20_nodes, "This is the least amount of code to be written ");
			strong4 = claim_element(p20_nodes, "STRONG", {});
			var strong4_nodes = children(strong4);
			t87 = claim_text(strong4_nodes, "and be executed by the browser");
			strong4_nodes.forEach(detach);
			t88 = claim_text(p20_nodes, " for a counter app.");
			p20_nodes.forEach(detach);
			t89 = claim_space(section2_nodes);
			p21 = claim_element(section2_nodes, "P", {});
			var p21_nodes = children(p21);
			t90 = claim_text(p21_nodes, "So why does this matter? Well, before we proceed to explain how this got to do with Svelte, let's first talk about React.");
			p21_nodes.forEach(detach);
			t91 = claim_space(section2_nodes);
			p22 = claim_element(section2_nodes, "P", {});
			var p22_nodes = children(p22);
			em4 = claim_element(p22_nodes, "EM", {});
			var em4_nodes = children(em4);
			t92 = claim_text(em4_nodes, "I chose to talk about React ");
			strong5 = claim_element(em4_nodes, "STRONG", {});
			var strong5_nodes = children(strong5);
			t93 = claim_text(strong5_nodes, "just because I am a React developer");
			strong5_nodes.forEach(detach);
			t94 = claim_text(em4_nodes, ", I use React at my work and at this very blog site. I am most familiar with React than any other JS frameworks out there");
			em4_nodes.forEach(detach);
			p22_nodes.forEach(detach);
			t95 = claim_space(section2_nodes);
			p23 = claim_element(section2_nodes, "P", {});
			var p23_nodes = children(p23);
			t96 = claim_text(p23_nodes, "In React, you can argubly write a much concise and declarative code:");
			p23_nodes.forEach(detach);
			t97 = claim_space(section2_nodes);
			pre3 = claim_element(section2_nodes, "PRE", { class: true });
			var pre3_nodes = children(pre3);
			pre3_nodes.forEach(detach);
			t98 = claim_space(section2_nodes);
			p24 = claim_element(section2_nodes, "P", {});
			var p24_nodes = children(p24);
			t99 = claim_text(p24_nodes, "That's because React has hidden all the ");
			code2 = claim_element(p24_nodes, "CODE", {});
			var code2_nodes = children(code2);
			t100 = claim_text(code2_nodes, "document.createElement");
			code2_nodes.forEach(detach);
			t101 = claim_text(p24_nodes, ", ");
			code3 = claim_element(p24_nodes, "CODE", {});
			var code3_nodes = children(code3);
			t102 = claim_text(code3_nodes, "parent.appendChild");
			code3_nodes.forEach(detach);
			t103 = claim_text(p24_nodes, ", ... under ");
			a13 = claim_element(p24_nodes, "A", { href: true, rel: true });
			var a13_nodes = children(a13);
			code4 = claim_element(a13_nodes, "CODE", {});
			var code4_nodes = children(code4);
			t104 = claim_text(code4_nodes, "react-dom");
			code4_nodes.forEach(detach);
			t105 = claim_text(a13_nodes, " renderer.");
			a13_nodes.forEach(detach);
			p24_nodes.forEach(detach);
			t106 = claim_space(section2_nodes);
			p25 = claim_element(section2_nodes, "P", {});
			var p25_nodes = children(p25);
			t107 = claim_text(p25_nodes, "Everytime you click on a counter button, the function ");
			code5 = claim_element(p25_nodes, "CODE", {});
			var code5_nodes = children(code5);
			t108 = claim_text(code5_nodes, "Counter");
			code5_nodes.forEach(detach);
			t109 = claim_text(p25_nodes, " is called to get the new ");
			a14 = claim_element(p25_nodes, "A", { href: true, rel: true });
			var a14_nodes = children(a14);
			t110 = claim_text(a14_nodes, "Fiber tree");
			a14_nodes.forEach(detach);
			t111 = claim_text(p25_nodes, " with the new state value, and it is compared with the current Fiber tree. After the diffing between the 2 Fiber tree, React collects the necessary DOM operations, in this case is to update ");
			code6 = claim_element(p25_nodes, "CODE", {});
			var code6_nodes = children(code6);
			t112 = claim_text(code6_nodes, "span");
			code6_nodes.forEach(detach);
			t113 = claim_text(p25_nodes, "'s ");
			code7 = claim_element(p25_nodes, "CODE", {});
			var code7_nodes = children(code7);
			t114 = claim_text(code7_nodes, "textContent");
			code7_nodes.forEach(detach);
			t115 = claim_text(p25_nodes, ".");
			p25_nodes.forEach(detach);
			t116 = claim_space(section2_nodes);
			p26 = claim_element(section2_nodes, "P", {});
			var p26_nodes = children(p26);
			t117 = claim_text(p26_nodes, "If you feel this is overly complicated, wait, there is more.");
			p26_nodes.forEach(detach);
			t118 = claim_space(section2_nodes);
			p27 = claim_element(section2_nodes, "P", {});
			var p27_nodes = children(p27);
			t119 = claim_text(p27_nodes, "When the ");
			code8 = claim_element(p27_nodes, "CODE", {});
			var code8_nodes = children(code8);
			t120 = claim_text(code8_nodes, "react-dom");
			code8_nodes.forEach(detach);
			t121 = claim_space(p27_nodes);
			a15 = claim_element(p27_nodes, "A", { href: true, rel: true });
			var a15_nodes = children(a15);
			t122 = claim_text(a15_nodes, "receives the DOM operations");
			a15_nodes.forEach(detach);
			t123 = claim_text(p27_nodes, ", it receives ");
			code9 = claim_element(p27_nodes, "CODE", {});
			var code9_nodes = children(code9);
			t124 = claim_text(code9_nodes, "['span', { 'children': '1' }]");
			code9_nodes.forEach(detach);
			t125 = claim_text(p27_nodes, ", the element and the update payload, and ");
			code10 = claim_element(p27_nodes, "CODE", {});
			var code10_nodes = children(code10);
			t126 = claim_text(code10_nodes, "react-dom");
			code10_nodes.forEach(detach);
			t127 = claim_text(p27_nodes, " has to figure out that ");
			code11 = claim_element(p27_nodes, "CODE", {});
			var code11_nodes = children(code11);
			t128 = claim_text(code11_nodes, "children");
			code11_nodes.forEach(detach);
			t129 = claim_text(p27_nodes, " meant ");
			a16 = claim_element(p27_nodes, "A", { href: true, rel: true });
			var a16_nodes = children(a16);
			t130 = claim_text(a16_nodes, "setting the ");
			code12 = claim_element(a16_nodes, "CODE", {});
			var code12_nodes = children(code12);
			t131 = claim_text(code12_nodes, "textContent");
			code12_nodes.forEach(detach);
			a16_nodes.forEach(detach);
			t132 = claim_text(p27_nodes, ".");
			p27_nodes.forEach(detach);
			t133 = claim_space(section2_nodes);
			p28 = claim_element(section2_nodes, "P", {});
			var p28_nodes = children(p28);
			t134 = claim_text(p28_nodes, "As you can see, there's a lot of code ");
			strong6 = claim_element(p28_nodes, "STRONG", {});
			var strong6_nodes = children(strong6);
			t135 = claim_text(strong6_nodes, "executed");
			strong6_nodes.forEach(detach);
			t136 = claim_text(p28_nodes, " under the hood, which you may think is overkill for this contrived example. But with a much larger/complex application, you will soon appreciate the flexibilty React provides. to achieve that, react has to make sure it has code to capture all the different scenarios, without knowing what will be written by us, the developer.");
			p28_nodes.forEach(detach);
			t137 = claim_space(section2_nodes);
			p29 = claim_element(section2_nodes, "P", {});
			var p29_nodes = children(p29);
			t138 = claim_text(p29_nodes, "Now, here is how Svelte is different. ");
			strong7 = claim_element(p29_nodes, "STRONG", {});
			var strong7_nodes = children(strong7);
			t139 = claim_text(strong7_nodes, "Svelte is a compiler");
			strong7_nodes.forEach(detach);
			t140 = claim_text(p29_nodes, ". Svelte knows what we, the developer, has written, and generate only code that is needed for our application.");
			p29_nodes.forEach(detach);
			t141 = claim_space(section2_nodes);
			p30 = claim_element(section2_nodes, "P", {});
			var p30_nodes = children(p30);
			t142 = claim_text(p30_nodes, "Here's what Svelte generated for our Counter app (");
			a17 = claim_element(p30_nodes, "A", { href: true, rel: true });
			var a17_nodes = children(a17);
			t143 = claim_text(a17_nodes, "repl");
			a17_nodes.forEach(detach);
			t144 = claim_text(p30_nodes, "):");
			p30_nodes.forEach(detach);
			t145 = claim_space(section2_nodes);
			pre4 = claim_element(section2_nodes, "PRE", { class: true });
			var pre4_nodes = children(pre4);
			pre4_nodes.forEach(detach);
			t146 = claim_space(section2_nodes);
			p31 = claim_element(section2_nodes, "P", {});
			var p31_nodes = children(p31);
			strong8 = claim_element(p31_nodes, "STRONG", {});
			var strong8_nodes = children(strong8);
			t147 = claim_text(strong8_nodes, "Disclaimer:");
			strong8_nodes.forEach(detach);
			t148 = claim_space(p31_nodes);
			em5 = claim_element(p31_nodes, "EM", {});
			var em5_nodes = children(em5);
			t149 = claim_text(em5_nodes, "There are parts of code deliberately removed to make the code more concise and readable, which should not affect the point I am trying to make here. Feel free to read the original code in the ");
			a18 = claim_element(em5_nodes, "A", { href: true, rel: true });
			var a18_nodes = children(a18);
			t150 = claim_text(a18_nodes, "repl");
			a18_nodes.forEach(detach);
			t151 = claim_text(em5_nodes, ".");
			em5_nodes.forEach(detach);
			p31_nodes.forEach(detach);
			t152 = claim_space(section2_nodes);
			p32 = claim_element(section2_nodes, "P", {});
			var p32_nodes = children(p32);
			t153 = claim_text(p32_nodes, "You see Svelte's generated code is much like the one we've written in plain JavaScript just now. It generates the ");
			code13 = claim_element(p32_nodes, "CODE", {});
			var code13_nodes = children(code13);
			t154 = claim_text(code13_nodes, ".textContent");
			code13_nodes.forEach(detach);
			t155 = claim_text(p32_nodes, " directly, because during compilation, Svelte knows exactly what you are trying to do. Therefore it can try to handle all the different scenarios, where React tries to handle in runtime, in build time.");
			p32_nodes.forEach(detach);
			t156 = claim_space(section2_nodes);
			p33 = claim_element(section2_nodes, "P", {});
			var p33_nodes = children(p33);
			t157 = claim_text(p33_nodes, "Now you know the fundamental differences between Svelte and React, let's take a look how a Svelte component works.");
			p33_nodes.forEach(detach);
			section2_nodes.forEach(detach);
			t158 = claim_space(nodes);
			section3 = claim_element(nodes, "SECTION", {});
			var section3_nodes = children(section3);
			h21 = claim_element(section3_nodes, "H2", {});
			var h21_nodes = children(h21);
			a19 = claim_element(h21_nodes, "A", { href: true, id: true });
			var a19_nodes = children(a19);
			t159 = claim_text(a19_nodes, "Conceptually, how does compiled Svelte component work?");
			a19_nodes.forEach(detach);
			h21_nodes.forEach(detach);
			t160 = claim_space(section3_nodes);
			p34 = claim_element(section3_nodes, "P", {});
			var p34_nodes = children(p34);
			t161 = claim_text(p34_nodes, "In this section, we are going to write Svelte component incrementally, and see how each changes ended up in the compiled Svelte component.");
			p34_nodes.forEach(detach);
			t162 = claim_space(section3_nodes);
			p35 = claim_element(section3_nodes, "P", {});
			var p35_nodes = children(p35);
			t163 = claim_text(p35_nodes, "Let's start with a simple button and a text:");
			p35_nodes.forEach(detach);
			t164 = claim_space(section3_nodes);
			pre5 = claim_element(section3_nodes, "PRE", { class: true });
			var pre5_nodes = children(pre5);
			pre5_nodes.forEach(detach);
			t165 = claim_space(section3_nodes);
			p36 = claim_element(section3_nodes, "P", {});
			var p36_nodes = children(p36);
			t166 = claim_text(p36_nodes, "When Svelte sees this, these HTML elements will translate into JavaScript statement to create the elements:");
			p36_nodes.forEach(detach);
			t167 = claim_space(section3_nodes);
			pre6 = claim_element(section3_nodes, "PRE", { class: true });
			var pre6_nodes = children(pre6);
			pre6_nodes.forEach(detach);
			t168 = claim_space(section3_nodes);
			p37 = claim_element(section3_nodes, "P", {});
			var p37_nodes = children(p37);
			t169 = claim_text(p37_nodes, "If you inspect the Svelte compiled output, you would notice that these instruction lies in a function call ");
			code14 = claim_element(p37_nodes, "CODE", {});
			var code14_nodes = children(code14);
			t170 = claim_text(code14_nodes, "create_fragment");
			code14_nodes.forEach(detach);
			t171 = claim_text(p37_nodes, ". ");
			code15 = claim_element(p37_nodes, "CODE", {});
			var code15_nodes = children(code15);
			t172 = claim_text(code15_nodes, "create_fragment");
			code15_nodes.forEach(detach);
			t173 = claim_text(p37_nodes, " is the function where Svelte keeps the DOM instructions for the component.");
			p37_nodes.forEach(detach);
			t174 = claim_space(section3_nodes);
			p38 = claim_element(section3_nodes, "P", {});
			var p38_nodes = children(p38);
			t175 = claim_text(p38_nodes, "Next, lets add some event listener to the button:");
			p38_nodes.forEach(detach);
			t176 = claim_space(section3_nodes);
			pre7 = claim_element(section3_nodes, "PRE", { class: true });
			var pre7_nodes = children(pre7);
			pre7_nodes.forEach(detach);
			section3_nodes.forEach(detach);
			t177 = claim_space(nodes);
			section4 = claim_element(nodes, "SECTION", {});
			var section4_nodes = children(section4);
			h22 = claim_element(section4_nodes, "H2", {});
			var h22_nodes = children(h22);
			a20 = claim_element(h22_nodes, "A", { href: true, id: true });
			var a20_nodes = children(a20);
			t178 = claim_text(a20_nodes, "How the compiled Svelte component works");
			a20_nodes.forEach(detach);
			h22_nodes.forEach(detach);
			t179 = claim_space(section4_nodes);
			p39 = claim_element(section4_nodes, "P", {});
			var p39_nodes = children(p39);
			t180 = claim_text(p39_nodes, "To differentiate between the component code you write, and the component code generated by Svelte, I will use ");
			code16 = claim_element(p39_nodes, "CODE", {});
			var code16_nodes = children(code16);
			t181 = claim_text(code16_nodes, ".svelte");
			code16_nodes.forEach(detach);
			t182 = claim_text(p39_nodes, " component to refer the code you would write in a ");
			code17 = claim_element(p39_nodes, "CODE", {});
			var code17_nodes = children(code17);
			t183 = claim_text(code17_nodes, ".svelte");
			code17_nodes.forEach(detach);
			t184 = claim_text(p39_nodes, " file, and Svelte component to refer the ");
			code18 = claim_element(p39_nodes, "CODE", {});
			var code18_nodes = children(code18);
			t185 = claim_text(code18_nodes, ".js");
			code18_nodes.forEach(detach);
			t186 = claim_text(p39_nodes, " code, generated by Svelte from your ");
			code19 = claim_element(p39_nodes, "CODE", {});
			var code19_nodes = children(code19);
			t187 = claim_text(code19_nodes, ".svelte");
			code19_nodes.forEach(detach);
			t188 = claim_text(p39_nodes, " component, that will be executed in your application.");
			p39_nodes.forEach(detach);
			t189 = claim_space(section4_nodes);
			p40 = claim_element(section4_nodes, "P", {});
			var p40_nodes = children(p40);
			t190 = claim_text(p40_nodes, "The best way to understand how Svelte component works is to use the ");
			a21 = claim_element(p40_nodes, "A", { href: true, rel: true });
			var a21_nodes = children(a21);
			t191 = claim_text(a21_nodes, "Svelte's REPL");
			a21_nodes.forEach(detach);
			t192 = claim_text(p40_nodes, ". Try writing a component, and see how Svelte compiles the component into plain JavaScript.");
			p40_nodes.forEach(detach);
			t193 = claim_space(section4_nodes);
			p41 = claim_element(section4_nodes, "P", {});
			var p41_nodes = children(p41);
			t194 = claim_text(p41_nodes, "Svelte compiles the ");
			code20 = claim_element(p41_nodes, "CODE", {});
			var code20_nodes = children(code20);
			t195 = claim_text(code20_nodes, ".svelte");
			code20_nodes.forEach(detach);
			t196 = claim_text(p41_nodes, " file into a ");
			code21 = claim_element(p41_nodes, "CODE", {});
			var code21_nodes = children(code21);
			t197 = claim_text(code21_nodes, ".js");
			code21_nodes.forEach(detach);
			t198 = claim_text(p41_nodes, " file, which the ");
			code22 = claim_element(p41_nodes, "CODE", {});
			var code22_nodes = children(code22);
			t199 = claim_text(code22_nodes, "export default");
			code22_nodes.forEach(detach);
			t200 = claim_text(p41_nodes, " the compiled Svelte component.");
			p41_nodes.forEach(detach);
			t201 = claim_space(section4_nodes);
			p42 = claim_element(section4_nodes, "P", {});
			var p42_nodes = children(p42);
			t202 = claim_text(p42_nodes, "The compiled Svelte component contains 3 main sections:");
			p42_nodes.forEach(detach);
			t203 = claim_space(section4_nodes);
			ul7 = claim_element(section4_nodes, "UL", {});
			var ul7_nodes = children(ul7);
			li12 = claim_element(ul7_nodes, "LI", {});
			var li12_nodes = children(li12);
			code23 = claim_element(li12_nodes, "CODE", {});
			var code23_nodes = children(code23);
			t204 = claim_text(code23_nodes, "create_fragment");
			code23_nodes.forEach(detach);
			li12_nodes.forEach(detach);
			t205 = claim_space(ul7_nodes);
			li13 = claim_element(ul7_nodes, "LI", {});
			var li13_nodes = children(li13);
			code24 = claim_element(li13_nodes, "CODE", {});
			var code24_nodes = children(code24);
			t206 = claim_text(code24_nodes, "instance");
			code24_nodes.forEach(detach);
			li13_nodes.forEach(detach);
			t207 = claim_space(ul7_nodes);
			li14 = claim_element(ul7_nodes, "LI", {});
			var li14_nodes = children(li14);
			t208 = claim_text(li14_nodes, "the Component itself");
			li14_nodes.forEach(detach);
			ul7_nodes.forEach(detach);
			t209 = claim_space(section4_nodes);
			pre8 = claim_element(section4_nodes, "PRE", { class: true });
			var pre8_nodes = children(pre8);
			pre8_nodes.forEach(detach);
			t210 = claim_space(section4_nodes);
			p43 = claim_element(section4_nodes, "P", {});
			var p43_nodes = children(p43);
			t211 = claim_text(p43_nodes, "Let's explain what each section of the code is for, from the bottom up.");
			p43_nodes.forEach(detach);
			t212 = claim_space(section4_nodes);
			p44 = claim_element(section4_nodes, "P", {});
			var p44_nodes = children(p44);
			strong9 = claim_element(p44_nodes, "STRONG", {});
			var strong9_nodes = children(strong9);
			t213 = claim_text(strong9_nodes, "3. The component itself");
			strong9_nodes.forEach(detach);
			p44_nodes.forEach(detach);
			t214 = claim_space(section4_nodes);
			p45 = claim_element(section4_nodes, "P", {});
			var p45_nodes = children(p45);
			t215 = claim_text(p45_nodes, "Each compiled component, by default, is a subclass of ");
			code25 = claim_element(p45_nodes, "CODE", {});
			var code25_nodes = children(code25);
			t216 = claim_text(code25_nodes, "SvelteComponent");
			code25_nodes.forEach(detach);
			t217 = claim_text(p45_nodes, ".");
			p45_nodes.forEach(detach);
			t218 = claim_space(section4_nodes);
			p46 = claim_element(section4_nodes, "P", {});
			var p46_nodes = children(p46);
			t219 = claim_text(p46_nodes, "To create the component onto the DOM, you can create an instance of the component:");
			p46_nodes.forEach(detach);
			t220 = claim_space(section4_nodes);
			pre9 = claim_element(section4_nodes, "PRE", { class: true });
			var pre9_nodes = children(pre9);
			pre9_nodes.forEach(detach);
			t221 = claim_space(section4_nodes);
			p47 = claim_element(section4_nodes, "P", {});
			var p47_nodes = children(p47);
			t222 = claim_text(p47_nodes, "In the constructor of ");
			code26 = claim_element(p47_nodes, "CODE", {});
			var code26_nodes = children(code26);
			t223 = claim_text(code26_nodes, "App");
			code26_nodes.forEach(detach);
			t224 = claim_text(p47_nodes, ", as you can see, calls the ");
			code27 = claim_element(p47_nodes, "CODE", {});
			var code27_nodes = children(code27);
			t225 = claim_text(code27_nodes, "init");
			code27_nodes.forEach(detach);
			t226 = claim_text(p47_nodes, " function, which takes in both ");
			code28 = claim_element(p47_nodes, "CODE", {});
			var code28_nodes = children(code28);
			t227 = claim_text(code28_nodes, "instance");
			code28_nodes.forEach(detach);
			t228 = claim_text(p47_nodes, " and ");
			code29 = claim_element(p47_nodes, "CODE", {});
			var code29_nodes = children(code29);
			t229 = claim_text(code29_nodes, "create_fragment");
			code29_nodes.forEach(detach);
			t230 = claim_text(p47_nodes, " function.");
			p47_nodes.forEach(detach);
			t231 = claim_space(section4_nodes);
			p48 = claim_element(section4_nodes, "P", {});
			var p48_nodes = children(p48);
			t232 = claim_text(p48_nodes, "The ");
			code30 = claim_element(p48_nodes, "CODE", {});
			var code30_nodes = children(code30);
			t233 = claim_text(code30_nodes, "init");
			code30_nodes.forEach(detach);
			t234 = claim_text(p48_nodes, " function, as the name suggests, will set things up, which lead us to the ");
			code31 = claim_element(p48_nodes, "CODE", {});
			var code31_nodes = children(code31);
			t235 = claim_text(code31_nodes, "instance");
			code31_nodes.forEach(detach);
			t236 = claim_text(p48_nodes, " function.");
			p48_nodes.forEach(detach);
			t237 = claim_space(section4_nodes);
			p49 = claim_element(section4_nodes, "P", {});
			var p49_nodes = children(p49);
			strong10 = claim_element(p49_nodes, "STRONG", {});
			var strong10_nodes = children(strong10);
			t238 = claim_text(strong10_nodes, "2. ");
			code32 = claim_element(strong10_nodes, "CODE", {});
			var code32_nodes = children(code32);
			t239 = claim_text(code32_nodes, "instance");
			code32_nodes.forEach(detach);
			strong10_nodes.forEach(detach);
			p49_nodes.forEach(detach);
			t240 = claim_space(section4_nodes);
			p50 = claim_element(section4_nodes, "P", {});
			var p50_nodes = children(p50);
			t241 = claim_text(p50_nodes, "The ");
			code33 = claim_element(p50_nodes, "CODE", {});
			var code33_nodes = children(code33);
			t242 = claim_text(code33_nodes, "instance");
			code33_nodes.forEach(detach);
			t243 = claim_text(p50_nodes, " function is where all the business logic of your ");
			code34 = claim_element(p50_nodes, "CODE", {});
			var code34_nodes = children(code34);
			t244 = claim_text(code34_nodes, ".svelte");
			code34_nodes.forEach(detach);
			t245 = claim_text(p50_nodes, " component lies.");
			p50_nodes.forEach(detach);
			t246 = claim_space(section4_nodes);
			p51 = claim_element(section4_nodes, "P", {});
			var p51_nodes = children(p51);
			t247 = claim_text(p51_nodes, "That's why, if you take a closer look, the ");
			code35 = claim_element(p51_nodes, "CODE", {});
			var code35_nodes = children(code35);
			t248 = claim_text(code35_nodes, "instance");
			code35_nodes.forEach(detach);
			t249 = claim_text(p51_nodes, " function contains most, if not all, the code you write in the ");
			code36 = claim_element(p51_nodes, "CODE", {});
			var code36_nodes = children(code36);
			t250 = claim_text(code36_nodes, "<script>");
			code36_nodes.forEach(detach);
			t251 = claim_text(p51_nodes, " tag in the ");
			code37 = claim_element(p51_nodes, "CODE", {});
			var code37_nodes = children(code37);
			t252 = claim_text(code37_nodes, ".svelte");
			code37_nodes.forEach(detach);
			t253 = claim_text(p51_nodes, " component.");
			p51_nodes.forEach(detach);
			t254 = claim_space(section4_nodes);
			hr0 = claim_element(section4_nodes, "HR", {});
			t255 = claim_space(section4_nodes);
			p52 = claim_element(section4_nodes, "P", {});
			var p52_nodes = children(p52);
			t256 = claim_text(p52_nodes, "Code that you write in the ");
			code38 = claim_element(p52_nodes, "CODE", {});
			var code38_nodes = children(code38);
			t257 = claim_text(code38_nodes, "<script>");
			code38_nodes.forEach(detach);
			t258 = claim_text(p52_nodes, " tag that will not be in the ");
			code39 = claim_element(p52_nodes, "CODE", {});
			var code39_nodes = children(code39);
			t259 = claim_text(code39_nodes, "instance");
			code39_nodes.forEach(detach);
			t260 = claim_text(p52_nodes, " function are:");
			p52_nodes.forEach(detach);
			t261 = claim_space(section4_nodes);
			ul12 = claim_element(section4_nodes, "UL", {});
			var ul12_nodes = children(ul12);
			li16 = claim_element(ul12_nodes, "LI", {});
			var li16_nodes = children(li16);
			strong11 = claim_element(li16_nodes, "STRONG", {});
			var strong11_nodes = children(strong11);
			code40 = claim_element(strong11_nodes, "CODE", {});
			var code40_nodes = children(code40);
			t262 = claim_text(code40_nodes, "import");
			code40_nodes.forEach(detach);
			t263 = claim_text(strong11_nodes, " statement");
			strong11_nodes.forEach(detach);
			ul8 = claim_element(li16_nodes, "UL", {});
			var ul8_nodes = children(ul8);
			li15 = claim_element(ul8_nodes, "LI", {});
			var li15_nodes = children(li15);
			t264 = claim_text(li15_nodes, "These will be moved to the beginning of the compiled file.");
			li15_nodes.forEach(detach);
			ul8_nodes.forEach(detach);
			li16_nodes.forEach(detach);
			t265 = claim_space(ul12_nodes);
			li18 = claim_element(ul12_nodes, "LI", {});
			var li18_nodes = children(li18);
			strong12 = claim_element(li18_nodes, "STRONG", {});
			var strong12_nodes = children(strong12);
			code41 = claim_element(strong12_nodes, "CODE", {});
			var code41_nodes = children(code41);
			t266 = claim_text(code41_nodes, "export");
			code41_nodes.forEach(detach);
			t267 = claim_text(strong12_nodes, " statement");
			strong12_nodes.forEach(detach);
			ul9 = claim_element(li18_nodes, "UL", {});
			var ul9_nodes = children(ul9);
			li17 = claim_element(ul9_nodes, "LI", {});
			var li17_nodes = children(li17);
			t268 = claim_text(li17_nodes, "These are exported properties or methods of the Svelte component. It will be present in the former section, \"the component itself\" section.");
			li17_nodes.forEach(detach);
			ul9_nodes.forEach(detach);
			li18_nodes.forEach(detach);
			t269 = claim_space(ul12_nodes);
			li22 = claim_element(ul12_nodes, "LI", {});
			var li22_nodes = children(li22);
			strong13 = claim_element(li22_nodes, "STRONG", {});
			var strong13_nodes = children(strong13);
			t270 = claim_text(strong13_nodes, "constants");
			strong13_nodes.forEach(detach);
			ul10 = claim_element(li22_nodes, "UL", {});
			var ul10_nodes = children(ul10);
			li19 = claim_element(ul10_nodes, "LI", {});
			var li19_nodes = children(li19);
			t271 = claim_text(li19_nodes, "Since the value of a constant will not change throughout the lifetime of your application, so there's no point redeclaring a new constant for every instance of your Svelte component.");
			li19_nodes.forEach(detach);
			t272 = claim_space(ul10_nodes);
			li20 = claim_element(ul10_nodes, "LI", {});
			var li20_nodes = children(li20);
			t273 = claim_text(li20_nodes, "Therefore it is moved out from the ");
			code42 = claim_element(li20_nodes, "CODE", {});
			var code42_nodes = children(code42);
			t274 = claim_text(code42_nodes, "instance");
			code42_nodes.forEach(detach);
			t275 = claim_text(li20_nodes, " function.");
			li20_nodes.forEach(detach);
			t276 = claim_space(ul10_nodes);
			li21 = claim_element(ul10_nodes, "LI", {});
			var li21_nodes = children(li21);
			a22 = claim_element(li21_nodes, "A", { href: true, rel: true });
			var a22_nodes = children(a22);
			t277 = claim_text(a22_nodes, "Check out the repl");
			a22_nodes.forEach(detach);
			t278 = claim_text(li21_nodes, ".");
			li21_nodes.forEach(detach);
			ul10_nodes.forEach(detach);
			li22_nodes.forEach(detach);
			t279 = claim_space(ul12_nodes);
			li25 = claim_element(ul12_nodes, "LI", {});
			var li25_nodes = children(li25);
			strong14 = claim_element(li25_nodes, "STRONG", {});
			var strong14_nodes = children(strong14);
			t280 = claim_text(strong14_nodes, "pure functions");
			strong14_nodes.forEach(detach);
			ul11 = claim_element(li25_nodes, "UL", {});
			var ul11_nodes = children(ul11);
			li23 = claim_element(ul11_nodes, "LI", {});
			var li23_nodes = children(li23);
			t281 = claim_text(li23_nodes, "The same logic goes with pure functions. If the function does not rely on any variables within the scope other than it's own arguments, the function will be moved out from the ");
			code43 = claim_element(li23_nodes, "CODE", {});
			var code43_nodes = children(code43);
			t282 = claim_text(code43_nodes, "instance");
			code43_nodes.forEach(detach);
			t283 = claim_text(li23_nodes, " function.");
			li23_nodes.forEach(detach);
			t284 = claim_space(ul11_nodes);
			li24 = claim_element(ul11_nodes, "LI", {});
			var li24_nodes = children(li24);
			a23 = claim_element(li24_nodes, "A", { href: true, rel: true });
			var a23_nodes = children(a23);
			t285 = claim_text(a23_nodes, "Check out this repl");
			a23_nodes.forEach(detach);
			t286 = claim_text(li24_nodes, ".");
			li24_nodes.forEach(detach);
			ul11_nodes.forEach(detach);
			li25_nodes.forEach(detach);
			ul12_nodes.forEach(detach);
			t287 = claim_space(section4_nodes);
			hr1 = claim_element(section4_nodes, "HR", {});
			t288 = claim_space(section4_nodes);
			p53 = claim_element(section4_nodes, "P", {});
			var p53_nodes = children(p53);
			t289 = claim_text(p53_nodes, "The ");
			code44 = claim_element(p53_nodes, "CODE", {});
			var code44_nodes = children(code44);
			t290 = claim_text(code44_nodes, "instance");
			code44_nodes.forEach(detach);
			t291 = claim_text(p53_nodes, " function contains all of your business logic, and returns an object. The object contains all the variables and functions you've declared and used in the HTML code. The object is referred as ");
			code45 = claim_element(p53_nodes, "CODE", {});
			var code45_nodes = children(code45);
			t292 = claim_text(code45_nodes, "ctx");
			code45_nodes.forEach(detach);
			t293 = claim_text(p53_nodes, " in Svelte, and that brings us to the ");
			code46 = claim_element(p53_nodes, "CODE", {});
			var code46_nodes = children(code46);
			t294 = claim_text(code46_nodes, "create_fragment");
			code46_nodes.forEach(detach);
			t295 = claim_text(p53_nodes, " function.");
			p53_nodes.forEach(detach);
			t296 = claim_space(section4_nodes);
			p54 = claim_element(section4_nodes, "P", {});
			var p54_nodes = children(p54);
			strong15 = claim_element(p54_nodes, "STRONG", {});
			var strong15_nodes = children(strong15);
			t297 = claim_text(strong15_nodes, "1. ");
			code47 = claim_element(strong15_nodes, "CODE", {});
			var code47_nodes = children(code47);
			t298 = claim_text(code47_nodes, "create_fragment");
			code47_nodes.forEach(detach);
			strong15_nodes.forEach(detach);
			p54_nodes.forEach(detach);
			t299 = claim_space(section4_nodes);
			p55 = claim_element(section4_nodes, "P", {});
			var p55_nodes = children(p55);
			t300 = claim_text(p55_nodes, "The ");
			code48 = claim_element(p55_nodes, "CODE", {});
			var code48_nodes = children(code48);
			t301 = claim_text(code48_nodes, "create_fragment");
			code48_nodes.forEach(detach);
			t302 = claim_text(p55_nodes, " function deals with the HTML code you've written in a ");
			code49 = claim_element(p55_nodes, "CODE", {});
			var code49_nodes = children(code49);
			t303 = claim_text(code49_nodes, ".svelte");
			code49_nodes.forEach(detach);
			t304 = claim_text(p55_nodes, " component. The ");
			code50 = claim_element(p55_nodes, "CODE", {});
			var code50_nodes = children(code50);
			t305 = claim_text(code50_nodes, "create_fragment");
			code50_nodes.forEach(detach);
			t306 = claim_text(p55_nodes, " function takes in the ");
			code51 = claim_element(p55_nodes, "CODE", {});
			var code51_nodes = children(code51);
			t307 = claim_text(code51_nodes, "ctx");
			code51_nodes.forEach(detach);
			t308 = claim_text(p55_nodes, " object, and returns an object that instructs the Svelte component how to render into the DOM, that looks like this:");
			p55_nodes.forEach(detach);
			t309 = claim_space(section4_nodes);
			pre10 = claim_element(section4_nodes, "PRE", { class: true });
			var pre10_nodes = children(pre10);
			pre10_nodes.forEach(detach);
			t310 = claim_space(section4_nodes);
			p56 = claim_element(section4_nodes, "P", {});
			var p56_nodes = children(p56);
			t311 = claim_text(p56_nodes, "Let's take a closer look to what each function does:");
			p56_nodes.forEach(detach);
			t312 = claim_space(section4_nodes);
			p57 = claim_element(section4_nodes, "P", {});
			var p57_nodes = children(p57);
			strong16 = claim_element(p57_nodes, "STRONG", {});
			var strong16_nodes = children(strong16);
			t313 = claim_text(strong16_nodes, "- c ");
			em6 = claim_element(strong16_nodes, "EM", {});
			var em6_nodes = children(em6);
			t314 = claim_text(em6_nodes, "(create)");
			em6_nodes.forEach(detach);
			strong16_nodes.forEach(detach);
			p57_nodes.forEach(detach);
			t315 = claim_space(section4_nodes);
			p58 = claim_element(section4_nodes, "P", {});
			var p58_nodes = children(p58);
			t316 = claim_text(p58_nodes, "This function creates all the DOM nodes needed.");
			p58_nodes.forEach(detach);
			t317 = claim_space(section4_nodes);
			p59 = claim_element(section4_nodes, "P", {});
			var p59_nodes = children(p59);
			strong17 = claim_element(p59_nodes, "STRONG", {});
			var strong17_nodes = children(strong17);
			t318 = claim_text(strong17_nodes, "- l ");
			em7 = claim_element(strong17_nodes, "EM", {});
			var em7_nodes = children(em7);
			t319 = claim_text(em7_nodes, "(claim)");
			em7_nodes.forEach(detach);
			strong17_nodes.forEach(detach);
			p59_nodes.forEach(detach);
			t320 = claim_space(section4_nodes);
			p60 = claim_element(section4_nodes, "P", {});
			var p60_nodes = children(p60);
			t321 = claim_text(p60_nodes, "On the other hand, if you use a server-side rendering, and you want to hydrate the rendered DOM with the component, the ");
			code52 = claim_element(p60_nodes, "CODE", {});
			var code52_nodes = children(code52);
			t322 = claim_text(code52_nodes, "claim");
			code52_nodes.forEach(detach);
			t323 = claim_text(p60_nodes, " function will be called instead of ");
			code53 = claim_element(p60_nodes, "CODE", {});
			var code53_nodes = children(code53);
			t324 = claim_text(code53_nodes, "create");
			code53_nodes.forEach(detach);
			t325 = claim_text(p60_nodes, ". This will try to claim and assign reference to the DOM node.");
			p60_nodes.forEach(detach);
			t326 = claim_space(section4_nodes);
			p61 = claim_element(section4_nodes, "P", {});
			var p61_nodes = children(p61);
			strong18 = claim_element(p61_nodes, "STRONG", {});
			var strong18_nodes = children(strong18);
			t327 = claim_text(strong18_nodes, "- m ");
			em8 = claim_element(strong18_nodes, "EM", {});
			var em8_nodes = children(em8);
			t328 = claim_text(em8_nodes, "(mount)");
			em8_nodes.forEach(detach);
			strong18_nodes.forEach(detach);
			p61_nodes.forEach(detach);
			t329 = claim_space(section4_nodes);
			p62 = claim_element(section4_nodes, "P", {});
			var p62_nodes = children(p62);
			t330 = claim_text(p62_nodes, "With the references to the DOM nodes, the ");
			code54 = claim_element(p62_nodes, "CODE", {});
			var code54_nodes = children(code54);
			t331 = claim_text(code54_nodes, "mount");
			code54_nodes.forEach(detach);
			t332 = claim_text(p62_nodes, " function will ");
			code55 = claim_element(p62_nodes, "CODE", {});
			var code55_nodes = children(code55);
			t333 = claim_text(code55_nodes, "insert");
			code55_nodes.forEach(detach);
			t334 = claim_text(p62_nodes, " or ");
			code56 = claim_element(p62_nodes, "CODE", {});
			var code56_nodes = children(code56);
			t335 = claim_text(code56_nodes, "append");
			code56_nodes.forEach(detach);
			t336 = claim_text(p62_nodes, " DOM nodes to the target accordingly.");
			p62_nodes.forEach(detach);
			t337 = claim_space(section4_nodes);
			p63 = claim_element(section4_nodes, "P", {});
			var p63_nodes = children(p63);
			strong19 = claim_element(p63_nodes, "STRONG", {});
			var strong19_nodes = children(strong19);
			t338 = claim_text(strong19_nodes, "- p ");
			em9 = claim_element(strong19_nodes, "EM", {});
			var em9_nodes = children(em9);
			t339 = claim_text(em9_nodes, "(update)");
			em9_nodes.forEach(detach);
			strong19_nodes.forEach(detach);
			p63_nodes.forEach(detach);
			t340 = claim_space(section4_nodes);
			p64 = claim_element(section4_nodes, "P", {});
			var p64_nodes = children(p64);
			t341 = claim_text(p64_nodes, "If there's a change, say after a button click, the ");
			code57 = claim_element(p64_nodes, "CODE", {});
			var code57_nodes = children(code57);
			t342 = claim_text(code57_nodes, "update");
			code57_nodes.forEach(detach);
			t343 = claim_text(p64_nodes, " function will be called with the changed mask and the new ");
			code58 = claim_element(p64_nodes, "CODE", {});
			var code58_nodes = children(code58);
			t344 = claim_text(code58_nodes, "ctx");
			code58_nodes.forEach(detach);
			t345 = claim_text(p64_nodes, " object.");
			p64_nodes.forEach(detach);
			t346 = claim_space(section4_nodes);
			p65 = claim_element(section4_nodes, "P", {});
			var p65_nodes = children(p65);
			strong20 = claim_element(p65_nodes, "STRONG", {});
			var strong20_nodes = children(strong20);
			t347 = claim_text(strong20_nodes, "- r ");
			em10 = claim_element(strong20_nodes, "EM", {});
			var em10_nodes = children(em10);
			t348 = claim_text(em10_nodes, "(measure)");
			em10_nodes.forEach(detach);
			strong20_nodes.forEach(detach);
			br0 = claim_element(p65_nodes, "BR", {});
			t349 = claim_space(p65_nodes);
			strong21 = claim_element(p65_nodes, "STRONG", {});
			var strong21_nodes = children(strong21);
			t350 = claim_text(strong21_nodes, "- f ");
			em11 = claim_element(strong21_nodes, "EM", {});
			var em11_nodes = children(em11);
			t351 = claim_text(em11_nodes, "(fix)");
			em11_nodes.forEach(detach);
			strong21_nodes.forEach(detach);
			br1 = claim_element(p65_nodes, "BR", {});
			t352 = claim_space(p65_nodes);
			strong22 = claim_element(p65_nodes, "STRONG", {});
			var strong22_nodes = children(strong22);
			t353 = claim_text(strong22_nodes, "- a ");
			em12 = claim_element(strong22_nodes, "EM", {});
			var em12_nodes = children(em12);
			t354 = claim_text(em12_nodes, "(animate)");
			em12_nodes.forEach(detach);
			strong22_nodes.forEach(detach);
			br2 = claim_element(p65_nodes, "BR", {});
			t355 = claim_space(p65_nodes);
			strong23 = claim_element(p65_nodes, "STRONG", {});
			var strong23_nodes = children(strong23);
			t356 = claim_text(strong23_nodes, "- i ");
			em13 = claim_element(strong23_nodes, "EM", {});
			var em13_nodes = children(em13);
			t357 = claim_text(em13_nodes, "(intro)");
			em13_nodes.forEach(detach);
			strong23_nodes.forEach(detach);
			br3 = claim_element(p65_nodes, "BR", {});
			t358 = claim_space(p65_nodes);
			strong24 = claim_element(p65_nodes, "STRONG", {});
			var strong24_nodes = children(strong24);
			t359 = claim_text(strong24_nodes, "- o ");
			em14 = claim_element(strong24_nodes, "EM", {});
			var em14_nodes = children(em14);
			t360 = claim_text(em14_nodes, "(outro)");
			em14_nodes.forEach(detach);
			strong24_nodes.forEach(detach);
			p65_nodes.forEach(detach);
			t361 = claim_space(section4_nodes);
			p66 = claim_element(section4_nodes, "P", {});
			var p66_nodes = children(p66);
			t362 = claim_text(p66_nodes, "These are for animations, measuring and fixing the element before animation, ");
			code59 = claim_element(p66_nodes, "CODE", {});
			var code59_nodes = children(code59);
			t363 = claim_text(code59_nodes, "intro");
			code59_nodes.forEach(detach);
			t364 = claim_text(p66_nodes, "s and ");
			code60 = claim_element(p66_nodes, "CODE", {});
			var code60_nodes = children(code60);
			t365 = claim_text(code60_nodes, "outro");
			code60_nodes.forEach(detach);
			t366 = claim_text(p66_nodes, "s.");
			p66_nodes.forEach(detach);
			t367 = claim_space(section4_nodes);
			p67 = claim_element(section4_nodes, "P", {});
			var p67_nodes = children(p67);
			strong25 = claim_element(p67_nodes, "STRONG", {});
			var strong25_nodes = children(strong25);
			t368 = claim_text(strong25_nodes, "- d ");
			em15 = claim_element(strong25_nodes, "EM", {});
			var em15_nodes = children(em15);
			t369 = claim_text(em15_nodes, "(destroy)");
			em15_nodes.forEach(detach);
			strong25_nodes.forEach(detach);
			p67_nodes.forEach(detach);
			t370 = claim_space(section4_nodes);
			p68 = claim_element(section4_nodes, "P", {});
			var p68_nodes = children(p68);
			t371 = claim_text(p68_nodes, "Last but not least, the ");
			code61 = claim_element(p68_nodes, "CODE", {});
			var code61_nodes = children(code61);
			t372 = claim_text(code61_nodes, "destroy");
			code61_nodes.forEach(detach);
			t373 = claim_text(p68_nodes, " function is called when the Svelte component unmounts from the target.");
			p68_nodes.forEach(detach);
			section4_nodes.forEach(detach);
			t374 = claim_space(nodes);
			section5 = claim_element(nodes, "SECTION", {});
			var section5_nodes = children(section5);
			h3 = claim_element(section5_nodes, "H3", {});
			var h3_nodes = children(h3);
			a24 = claim_element(h3_nodes, "A", { href: true, id: true });
			var a24_nodes = children(a24);
			t375 = claim_text(a24_nodes, "Pieces them together");
			a24_nodes.forEach(detach);
			h3_nodes.forEach(detach);
			t376 = claim_space(section5_nodes);
			p69 = claim_element(section5_nodes, "P", {});
			var p69_nodes = children(p69);
			t377 = claim_text(p69_nodes, "With every pieces in mind, let's summarise what we've learned so far:");
			p69_nodes.forEach(detach);
			t378 = claim_space(section5_nodes);
			p70 = claim_element(section5_nodes, "P", {});
			var p70_nodes = children(p70);
			t379 = claim_text(p70_nodes, "You create the component into DOM by create a new instance of the Svelte component:");
			p70_nodes.forEach(detach);
			t380 = claim_space(section5_nodes);
			pre11 = claim_element(section5_nodes, "PRE", { class: true });
			var pre11_nodes = children(pre11);
			pre11_nodes.forEach(detach);
			t381 = claim_space(section5_nodes);
			p71 = claim_element(section5_nodes, "P", {});
			var p71_nodes = children(p71);
			t382 = claim_text(p71_nodes, "Which in the constructor of ");
			code62 = claim_element(p71_nodes, "CODE", {});
			var code62_nodes = children(code62);
			t383 = claim_text(code62_nodes, "App");
			code62_nodes.forEach(detach);
			t384 = claim_text(p71_nodes, ", it calls the ");
			code63 = claim_element(p71_nodes, "CODE", {});
			var code63_nodes = children(code63);
			t385 = claim_text(code63_nodes, "init");
			code63_nodes.forEach(detach);
			t386 = claim_text(p71_nodes, " function:");
			p71_nodes.forEach(detach);
			t387 = claim_space(section5_nodes);
			pre12 = claim_element(section5_nodes, "PRE", { class: true });
			var pre12_nodes = children(pre12);
			pre12_nodes.forEach(detach);
			t388 = claim_space(section5_nodes);
			p72 = claim_element(section5_nodes, "P", {});
			var p72_nodes = children(p72);
			t389 = claim_text(p72_nodes, "Within the ");
			code64 = claim_element(p72_nodes, "CODE", {});
			var code64_nodes = children(code64);
			t390 = claim_text(code64_nodes, "init");
			code64_nodes.forEach(detach);
			t391 = claim_text(p72_nodes, " function, the ");
			code65 = claim_element(p72_nodes, "CODE", {});
			var code65_nodes = children(code65);
			t392 = claim_text(code65_nodes, "instance");
			code65_nodes.forEach(detach);
			t393 = claim_text(p72_nodes, " function is called:");
			p72_nodes.forEach(detach);
			t394 = claim_space(section5_nodes);
			pre13 = claim_element(section5_nodes, "PRE", { class: true });
			var pre13_nodes = children(pre13);
			pre13_nodes.forEach(detach);
			t395 = claim_space(section5_nodes);
			p73 = claim_element(section5_nodes, "P", {});
			var p73_nodes = children(p73);
			t396 = claim_text(p73_nodes, "Which returns the ");
			code66 = claim_element(p73_nodes, "CODE", {});
			var code66_nodes = children(code66);
			t397 = claim_text(code66_nodes, "ctx");
			code66_nodes.forEach(detach);
			t398 = claim_text(p73_nodes, ", and it is passed into the ");
			code67 = claim_element(p73_nodes, "CODE", {});
			var code67_nodes = children(code67);
			t399 = claim_text(code67_nodes, "create_fragment");
			code67_nodes.forEach(detach);
			t400 = claim_text(p73_nodes, " function:");
			p73_nodes.forEach(detach);
			t401 = claim_space(section5_nodes);
			pre14 = claim_element(section5_nodes, "PRE", { class: true });
			var pre14_nodes = children(pre14);
			pre14_nodes.forEach(detach);
			t402 = claim_space(section5_nodes);
			p74 = claim_element(section5_nodes, "P", {});
			var p74_nodes = children(p74);
			t403 = claim_text(p74_nodes, "Which returns instructions on how to create DOM nodes and mount the nodes into DOM:");
			p74_nodes.forEach(detach);
			t404 = claim_space(section5_nodes);
			pre15 = claim_element(section5_nodes, "PRE", { class: true });
			var pre15_nodes = children(pre15);
			pre15_nodes.forEach(detach);
			t405 = claim_space(section5_nodes);
			p75 = claim_element(section5_nodes, "P", {});
			var p75_nodes = children(p75);
			t406 = claim_text(p75_nodes, "But hey, when does the ");
			code68 = claim_element(p75_nodes, "CODE", {});
			var code68_nodes = children(code68);
			t407 = claim_text(code68_nodes, "fragment.update()");
			code68_nodes.forEach(detach);
			t408 = claim_text(p75_nodes, " get called when something has changed?");
			p75_nodes.forEach(detach);
			t409 = claim_space(section5_nodes);
			p76 = claim_element(section5_nodes, "P", {});
			var p76_nodes = children(p76);
			t410 = claim_text(p76_nodes, "That my friend, is the secret 3rd argument of the ");
			code69 = claim_element(p76_nodes, "CODE", {});
			var code69_nodes = children(code69);
			t411 = claim_text(code69_nodes, "instance");
			code69_nodes.forEach(detach);
			t412 = claim_text(p76_nodes, " function, ");
			strong26 = claim_element(p76_nodes, "STRONG", {});
			var strong26_nodes = children(strong26);
			code70 = claim_element(strong26_nodes, "CODE", {});
			var code70_nodes = children(code70);
			t413 = claim_text(code70_nodes, "$$invalidate");
			code70_nodes.forEach(detach);
			strong26_nodes.forEach(detach);
			t414 = claim_text(p76_nodes, ".");
			p76_nodes.forEach(detach);
			t415 = claim_space(section5_nodes);
			p77 = claim_element(section5_nodes, "P", {});
			var p77_nodes = children(p77);
			t416 = claim_text(p77_nodes, "Whenever you reassign a value to your variable, Svelte will add an extra statement of ");
			code71 = claim_element(p77_nodes, "CODE", {});
			var code71_nodes = children(code71);
			t417 = claim_text(code71_nodes, "$$invalidate(...)");
			code71_nodes.forEach(detach);
			t418 = claim_text(p77_nodes, " statement after your re-assignment.");
			p77_nodes.forEach(detach);
			t419 = claim_space(section5_nodes);
			p78 = claim_element(section5_nodes, "P", {});
			var p78_nodes = children(p78);
			code72 = claim_element(p78_nodes, "CODE", {});
			var code72_nodes = children(code72);
			t420 = claim_text(code72_nodes, "$$invalidate");
			code72_nodes.forEach(detach);
			t421 = claim_text(p78_nodes, " takes 2 arguments, the name of the variable, and the new value of the variable:");
			p78_nodes.forEach(detach);
			t422 = claim_space(section5_nodes);
			pre16 = claim_element(section5_nodes, "PRE", { class: true });
			var pre16_nodes = children(pre16);
			pre16_nodes.forEach(detach);
			t423 = claim_space(section5_nodes);
			p79 = claim_element(section5_nodes, "P", {});
			var p79_nodes = children(p79);
			em16 = claim_element(p79_nodes, "EM", {});
			var em16_nodes = children(em16);
			t424 = claim_text(em16_nodes, "Of course, if you have consecutive ");
			code73 = claim_element(em16_nodes, "CODE", {});
			var code73_nodes = children(code73);
			t425 = claim_text(code73_nodes, "$$invalidate");
			code73_nodes.forEach(detach);
			t426 = claim_text(em16_nodes, " calls, Svelte will batch all the ");
			code74 = claim_element(em16_nodes, "CODE", {});
			var code74_nodes = children(code74);
			t427 = claim_text(code74_nodes, "$$invalidate");
			code74_nodes.forEach(detach);
			t428 = claim_text(em16_nodes, " changes, and call ");
			code75 = claim_element(em16_nodes, "CODE", {});
			var code75_nodes = children(code75);
			t429 = claim_text(code75_nodes, "fragment.update");
			code75_nodes.forEach(detach);
			t430 = claim_text(em16_nodes, " only once with all the changes.");
			em16_nodes.forEach(detach);
			p79_nodes.forEach(detach);
			t431 = claim_space(section5_nodes);
			p80 = claim_element(section5_nodes, "P", {});
			var p80_nodes = children(p80);
			t432 = claim_text(p80_nodes, "Now that you have a clearer picture on how Svelte works, let's go one level deeper, and take a look how the Svelte compiler works.");
			p80_nodes.forEach(detach);
			section5_nodes.forEach(detach);
			t433 = claim_space(nodes);
			section6 = claim_element(nodes, "SECTION", {});
			var section6_nodes = children(section6);
			h23 = claim_element(section6_nodes, "H2", {});
			var h23_nodes = children(h23);
			a25 = claim_element(h23_nodes, "A", { href: true, id: true });
			var a25_nodes = children(a25);
			t434 = claim_text(a25_nodes, "The Svelte compiler");
			a25_nodes.forEach(detach);
			h23_nodes.forEach(detach);
			t435 = claim_space(section6_nodes);
			p81 = claim_element(section6_nodes, "P", {});
			var p81_nodes = children(p81);
			t436 = claim_text(p81_nodes, "-- WIP --");
			p81_nodes.forEach(detach);
			section6_nodes.forEach(detach);
			this.h();
		},
		h() {
			attr(ul0, "class", "sitemap");
			attr(ul0, "id", "sitemap");
			attr(ul0, "role", "navigation");
			attr(ul0, "aria-label", "Table of Contents");
			attr(a0, "href", "#what-is-svelte");
			attr(a1, "href", "#writing-vanilla-javascript");
			attr(a2, "href", "#conceptually-how-does-compiled-svelte-component-work");
			attr(a3, "href", "#how-the-compiled-svelte-component-works");
			attr(a4, "href", "#pieces-them-together");
			attr(a5, "href", "#the-svelte-compiler");
			attr(a6, "href", "#what-is-svelte");
			attr(a6, "id", "what-is-svelte");
			attr(a7, "href", "/compile-svelte-in-your-head-part-1");
			attr(a8, "href", "http://svelte.dev/");
			attr(a8, "rel", "nofollow");
			attr(a9, "href", "https://twitter.com/Rich_Harris");
			attr(a9, "rel", "nofollow");
			attr(a10, "href", "https://svelte.dev/blog/svelte-3-rethinking-reactivity");
			attr(a10, "rel", "nofollow");
			attr(a11, "href", "https://svelte.dev/tutorial/basics");
			attr(a11, "rel", "nofollow");
			attr(a12, "href", "#writing-vanilla-javascript");
			attr(a12, "id", "writing-vanilla-javascript");
			attr(button0, "id", "ex1-decrement");
			attr(span, "id", "ex1-count");
			attr(button1, "id", "ex1-increment");
			set_style(div, "text-align", "center");
			attr(pre0, "class", "language-html");
			attr(pre1, "class", "language-js");
			attr(pre2, "class", "language-js");
			attr(pre3, "class", "language-js");
			attr(a13, "href", "https://reactjs.org/docs/react-dom.html");
			attr(a13, "rel", "nofollow");
			attr(a14, "href", "https://github.com/acdlite/react-fiber-architecture");
			attr(a14, "rel", "nofollow");
			attr(a15, "href", "https://github.com/facebook/react/blob/b8d079b41372290aa1846e3a780d85d05ab8ffc1/packages/react-dom/src/client/ReactDOMComponent.js#L372-L377");
			attr(a15, "rel", "nofollow");
			attr(a16, "href", "https://github.com/facebook/react/blob/b8d079b41372290aa1846e3a780d85d05ab8ffc1/packages/react-dom/src/client/ReactDOMComponent.js#L386-L388");
			attr(a16, "rel", "nofollow");
			attr(a17, "href", "https://svelte.dev/repl/2ed88da423f24cd980dad77e8a07e248?version=3.12.1");
			attr(a17, "rel", "nofollow");
			attr(pre4, "class", "language-js");
			attr(a18, "href", "https://svelte.dev/repl/2ed88da423f24cd980dad77e8a07e248?version=3.12.1");
			attr(a18, "rel", "nofollow");
			attr(a19, "href", "#conceptually-how-does-compiled-svelte-component-work");
			attr(a19, "id", "conceptually-how-does-compiled-svelte-component-work");
			attr(pre5, "class", "language-html");
			attr(pre6, "class", "language-js");
			attr(pre7, "class", "language-html");
			attr(a20, "href", "#how-the-compiled-svelte-component-works");
			attr(a20, "id", "how-the-compiled-svelte-component-works");
			attr(a21, "href", "https://svelte.dev/repl");
			attr(a21, "rel", "nofollow");
			attr(pre8, "class", "language-js");
			attr(pre9, "class", "language-js");
			attr(a22, "href", "https://svelte.dev/repl/hello-world");
			attr(a22, "rel", "nofollow");
			attr(a23, "href", "https://svelte.dev/repl/d831c0e1387d4105b9bf4cbf6e321477?version=3.12.1");
			attr(a23, "rel", "nofollow");
			attr(pre10, "class", "language-js");
			attr(a24, "href", "#pieces-them-together");
			attr(a24, "id", "pieces-them-together");
			attr(pre11, "class", "language-js");
			attr(pre12, "class", "language-js");
			attr(pre13, "class", "language-js");
			attr(pre14, "class", "language-js");
			attr(pre15, "class", "language-js");
			attr(pre16, "class", "language-js");
			attr(a25, "href", "#the-svelte-compiler");
			attr(a25, "id", "the-svelte-compiler");
		},
		m(target, anchor) {
			insert(target, section0, anchor);
			append(section0, ul0);
			append(section0, li0);
			append(li0, a0);
			append(a0, t0);
			append(section0, ul2);
			append(ul2, li1);
			append(li1, a1);
			append(a1, t1);
			append(ul2, li2);
			append(li2, a2);
			append(a2, t2);
			append(ul2, li3);
			append(li3, a3);
			append(a3, t3);
			append(ul2, ul1);
			append(ul1, li4);
			append(li4, a4);
			append(a4, t4);
			append(ul2, li5);
			append(li5, a5);
			append(a5, t5);
			insert(target, t6, anchor);
			insert(target, section1, anchor);
			append(section1, h1);
			append(h1, a6);
			append(a6, t7);
			append(section1, t8);
			append(section1, p0);
			append(p0, t9);
			append(p0, a7);
			append(a7, t10);
			append(p0, t11);
			append(section1, t12);
			append(section1, p1);
			append(p1, a8);
			append(a8, t13);
			append(p1, t14);
			append(section1, t15);
			append(section1, p2);
			append(p2, t16);
			append(section1, t17);
			append(section1, p3);
			append(p3, t18);
			append(section1, t19);
			append(section1, ul3);
			append(ul3, li6);
			append(li6, p4);
			append(p4, strong0);
			append(strong0, t20);
			append(li6, t21);
			append(li6, p5);
			append(p5, t22);
			append(p5, a9);
			append(a9, t23);
			append(p5, t24);
			append(p5, a10);
			append(a10, t25);
			append(p5, t26);
			append(ul3, t27);
			append(ul3, li7);
			append(li7, p6);
			append(p6, strong1);
			append(strong1, t28);
			append(li7, t29);
			append(li7, p7);
			append(p7, t30);
			append(p7, a11);
			append(a11, t31);
			append(p7, t32);
			append(section1, t33);
			append(section1, p8);
			append(p8, t34);
			append(section1, t35);
			append(section1, ul6);
			append(ul6, li9);
			append(li9, t36);
			append(li9, ul4);
			append(ul4, li8);
			append(li8, t37);
			append(ul6, t38);
			append(ul6, li11);
			append(li11, t39);
			append(li11, ul5);
			append(ul5, li10);
			insert(target, t40, anchor);
			insert(target, section2, anchor);
			append(section2, h20);
			append(h20, a12);
			append(a12, t41);
			append(section2, t42);
			append(section2, p9);
			append(p9, t43);
			append(section2, t44);
			append(section2, p10);
			append(p10, t45);
			append(section2, t46);
			append(section2, div);
			append(div, button0);
			append(button0, t47);
			append(div, t48);
			append(div, span);
			append(span, t49);
			append(div, t50);
			append(div, button1);
			append(button1, t51);
			append(div, t52);
			append(div, script);
			append(script, t53);
			append(section2, t54);
			append(section2, p11);
			append(p11, t55);
			append(section2, t56);
			append(section2, p12);
			append(p12, strong2);
			append(strong2, t57);
			append(section2, t58);
			append(section2, p13);
			append(p13, t59);
			append(section2, t60);
			append(section2, pre0);
			pre0.innerHTML = raw0_value;
			append(section2, t61);
			append(section2, p14);
			append(p14, t62);
			append(section2, t63);
			append(section2, pre1);
			pre1.innerHTML = raw1_value;
			append(section2, t64);
			append(section2, p15);
			append(p15, strong3);
			append(strong3, t65);
			append(section2, t66);
			append(section2, p16);
			append(p16, t67);
			append(p16, em0);
			append(em0, t68);
			append(p16, t69);
			append(p16, em1);
			append(em1, t70);
			append(p16, t71);
			append(p16, em2);
			append(em2, t72);
			append(p16, t73);
			append(section2, t74);
			append(section2, p17);
			append(p17, t75);
			append(section2, t76);
			append(section2, pre2);
			pre2.innerHTML = raw2_value;
			append(section2, t77);
			append(section2, p18);
			append(p18, t78);
			append(section2, t79);
			append(section2, p19);
			append(p19, em3);
			append(em3, t80);
			append(em3, code0);
			append(code0, t81);
			append(em3, t82);
			append(em3, code1);
			append(code1, t83);
			append(em3, t84);
			append(section2, t85);
			append(section2, p20);
			append(p20, t86);
			append(p20, strong4);
			append(strong4, t87);
			append(p20, t88);
			append(section2, t89);
			append(section2, p21);
			append(p21, t90);
			append(section2, t91);
			append(section2, p22);
			append(p22, em4);
			append(em4, t92);
			append(em4, strong5);
			append(strong5, t93);
			append(em4, t94);
			append(section2, t95);
			append(section2, p23);
			append(p23, t96);
			append(section2, t97);
			append(section2, pre3);
			pre3.innerHTML = raw3_value;
			append(section2, t98);
			append(section2, p24);
			append(p24, t99);
			append(p24, code2);
			append(code2, t100);
			append(p24, t101);
			append(p24, code3);
			append(code3, t102);
			append(p24, t103);
			append(p24, a13);
			append(a13, code4);
			append(code4, t104);
			append(a13, t105);
			append(section2, t106);
			append(section2, p25);
			append(p25, t107);
			append(p25, code5);
			append(code5, t108);
			append(p25, t109);
			append(p25, a14);
			append(a14, t110);
			append(p25, t111);
			append(p25, code6);
			append(code6, t112);
			append(p25, t113);
			append(p25, code7);
			append(code7, t114);
			append(p25, t115);
			append(section2, t116);
			append(section2, p26);
			append(p26, t117);
			append(section2, t118);
			append(section2, p27);
			append(p27, t119);
			append(p27, code8);
			append(code8, t120);
			append(p27, t121);
			append(p27, a15);
			append(a15, t122);
			append(p27, t123);
			append(p27, code9);
			append(code9, t124);
			append(p27, t125);
			append(p27, code10);
			append(code10, t126);
			append(p27, t127);
			append(p27, code11);
			append(code11, t128);
			append(p27, t129);
			append(p27, a16);
			append(a16, t130);
			append(a16, code12);
			append(code12, t131);
			append(p27, t132);
			append(section2, t133);
			append(section2, p28);
			append(p28, t134);
			append(p28, strong6);
			append(strong6, t135);
			append(p28, t136);
			append(section2, t137);
			append(section2, p29);
			append(p29, t138);
			append(p29, strong7);
			append(strong7, t139);
			append(p29, t140);
			append(section2, t141);
			append(section2, p30);
			append(p30, t142);
			append(p30, a17);
			append(a17, t143);
			append(p30, t144);
			append(section2, t145);
			append(section2, pre4);
			pre4.innerHTML = raw4_value;
			append(section2, t146);
			append(section2, p31);
			append(p31, strong8);
			append(strong8, t147);
			append(p31, t148);
			append(p31, em5);
			append(em5, t149);
			append(em5, a18);
			append(a18, t150);
			append(em5, t151);
			append(section2, t152);
			append(section2, p32);
			append(p32, t153);
			append(p32, code13);
			append(code13, t154);
			append(p32, t155);
			append(section2, t156);
			append(section2, p33);
			append(p33, t157);
			insert(target, t158, anchor);
			insert(target, section3, anchor);
			append(section3, h21);
			append(h21, a19);
			append(a19, t159);
			append(section3, t160);
			append(section3, p34);
			append(p34, t161);
			append(section3, t162);
			append(section3, p35);
			append(p35, t163);
			append(section3, t164);
			append(section3, pre5);
			pre5.innerHTML = raw5_value;
			append(section3, t165);
			append(section3, p36);
			append(p36, t166);
			append(section3, t167);
			append(section3, pre6);
			pre6.innerHTML = raw6_value;
			append(section3, t168);
			append(section3, p37);
			append(p37, t169);
			append(p37, code14);
			append(code14, t170);
			append(p37, t171);
			append(p37, code15);
			append(code15, t172);
			append(p37, t173);
			append(section3, t174);
			append(section3, p38);
			append(p38, t175);
			append(section3, t176);
			append(section3, pre7);
			pre7.innerHTML = raw7_value;
			insert(target, t177, anchor);
			insert(target, section4, anchor);
			append(section4, h22);
			append(h22, a20);
			append(a20, t178);
			append(section4, t179);
			append(section4, p39);
			append(p39, t180);
			append(p39, code16);
			append(code16, t181);
			append(p39, t182);
			append(p39, code17);
			append(code17, t183);
			append(p39, t184);
			append(p39, code18);
			append(code18, t185);
			append(p39, t186);
			append(p39, code19);
			append(code19, t187);
			append(p39, t188);
			append(section4, t189);
			append(section4, p40);
			append(p40, t190);
			append(p40, a21);
			append(a21, t191);
			append(p40, t192);
			append(section4, t193);
			append(section4, p41);
			append(p41, t194);
			append(p41, code20);
			append(code20, t195);
			append(p41, t196);
			append(p41, code21);
			append(code21, t197);
			append(p41, t198);
			append(p41, code22);
			append(code22, t199);
			append(p41, t200);
			append(section4, t201);
			append(section4, p42);
			append(p42, t202);
			append(section4, t203);
			append(section4, ul7);
			append(ul7, li12);
			append(li12, code23);
			append(code23, t204);
			append(ul7, t205);
			append(ul7, li13);
			append(li13, code24);
			append(code24, t206);
			append(ul7, t207);
			append(ul7, li14);
			append(li14, t208);
			append(section4, t209);
			append(section4, pre8);
			pre8.innerHTML = raw8_value;
			append(section4, t210);
			append(section4, p43);
			append(p43, t211);
			append(section4, t212);
			append(section4, p44);
			append(p44, strong9);
			append(strong9, t213);
			append(section4, t214);
			append(section4, p45);
			append(p45, t215);
			append(p45, code25);
			append(code25, t216);
			append(p45, t217);
			append(section4, t218);
			append(section4, p46);
			append(p46, t219);
			append(section4, t220);
			append(section4, pre9);
			pre9.innerHTML = raw9_value;
			append(section4, t221);
			append(section4, p47);
			append(p47, t222);
			append(p47, code26);
			append(code26, t223);
			append(p47, t224);
			append(p47, code27);
			append(code27, t225);
			append(p47, t226);
			append(p47, code28);
			append(code28, t227);
			append(p47, t228);
			append(p47, code29);
			append(code29, t229);
			append(p47, t230);
			append(section4, t231);
			append(section4, p48);
			append(p48, t232);
			append(p48, code30);
			append(code30, t233);
			append(p48, t234);
			append(p48, code31);
			append(code31, t235);
			append(p48, t236);
			append(section4, t237);
			append(section4, p49);
			append(p49, strong10);
			append(strong10, t238);
			append(strong10, code32);
			append(code32, t239);
			append(section4, t240);
			append(section4, p50);
			append(p50, t241);
			append(p50, code33);
			append(code33, t242);
			append(p50, t243);
			append(p50, code34);
			append(code34, t244);
			append(p50, t245);
			append(section4, t246);
			append(section4, p51);
			append(p51, t247);
			append(p51, code35);
			append(code35, t248);
			append(p51, t249);
			append(p51, code36);
			append(code36, t250);
			append(p51, t251);
			append(p51, code37);
			append(code37, t252);
			append(p51, t253);
			append(section4, t254);
			append(section4, hr0);
			append(section4, t255);
			append(section4, p52);
			append(p52, t256);
			append(p52, code38);
			append(code38, t257);
			append(p52, t258);
			append(p52, code39);
			append(code39, t259);
			append(p52, t260);
			append(section4, t261);
			append(section4, ul12);
			append(ul12, li16);
			append(li16, strong11);
			append(strong11, code40);
			append(code40, t262);
			append(strong11, t263);
			append(li16, ul8);
			append(ul8, li15);
			append(li15, t264);
			append(ul12, t265);
			append(ul12, li18);
			append(li18, strong12);
			append(strong12, code41);
			append(code41, t266);
			append(strong12, t267);
			append(li18, ul9);
			append(ul9, li17);
			append(li17, t268);
			append(ul12, t269);
			append(ul12, li22);
			append(li22, strong13);
			append(strong13, t270);
			append(li22, ul10);
			append(ul10, li19);
			append(li19, t271);
			append(ul10, t272);
			append(ul10, li20);
			append(li20, t273);
			append(li20, code42);
			append(code42, t274);
			append(li20, t275);
			append(ul10, t276);
			append(ul10, li21);
			append(li21, a22);
			append(a22, t277);
			append(li21, t278);
			append(ul12, t279);
			append(ul12, li25);
			append(li25, strong14);
			append(strong14, t280);
			append(li25, ul11);
			append(ul11, li23);
			append(li23, t281);
			append(li23, code43);
			append(code43, t282);
			append(li23, t283);
			append(ul11, t284);
			append(ul11, li24);
			append(li24, a23);
			append(a23, t285);
			append(li24, t286);
			append(section4, t287);
			append(section4, hr1);
			append(section4, t288);
			append(section4, p53);
			append(p53, t289);
			append(p53, code44);
			append(code44, t290);
			append(p53, t291);
			append(p53, code45);
			append(code45, t292);
			append(p53, t293);
			append(p53, code46);
			append(code46, t294);
			append(p53, t295);
			append(section4, t296);
			append(section4, p54);
			append(p54, strong15);
			append(strong15, t297);
			append(strong15, code47);
			append(code47, t298);
			append(section4, t299);
			append(section4, p55);
			append(p55, t300);
			append(p55, code48);
			append(code48, t301);
			append(p55, t302);
			append(p55, code49);
			append(code49, t303);
			append(p55, t304);
			append(p55, code50);
			append(code50, t305);
			append(p55, t306);
			append(p55, code51);
			append(code51, t307);
			append(p55, t308);
			append(section4, t309);
			append(section4, pre10);
			pre10.innerHTML = raw10_value;
			append(section4, t310);
			append(section4, p56);
			append(p56, t311);
			append(section4, t312);
			append(section4, p57);
			append(p57, strong16);
			append(strong16, t313);
			append(strong16, em6);
			append(em6, t314);
			append(section4, t315);
			append(section4, p58);
			append(p58, t316);
			append(section4, t317);
			append(section4, p59);
			append(p59, strong17);
			append(strong17, t318);
			append(strong17, em7);
			append(em7, t319);
			append(section4, t320);
			append(section4, p60);
			append(p60, t321);
			append(p60, code52);
			append(code52, t322);
			append(p60, t323);
			append(p60, code53);
			append(code53, t324);
			append(p60, t325);
			append(section4, t326);
			append(section4, p61);
			append(p61, strong18);
			append(strong18, t327);
			append(strong18, em8);
			append(em8, t328);
			append(section4, t329);
			append(section4, p62);
			append(p62, t330);
			append(p62, code54);
			append(code54, t331);
			append(p62, t332);
			append(p62, code55);
			append(code55, t333);
			append(p62, t334);
			append(p62, code56);
			append(code56, t335);
			append(p62, t336);
			append(section4, t337);
			append(section4, p63);
			append(p63, strong19);
			append(strong19, t338);
			append(strong19, em9);
			append(em9, t339);
			append(section4, t340);
			append(section4, p64);
			append(p64, t341);
			append(p64, code57);
			append(code57, t342);
			append(p64, t343);
			append(p64, code58);
			append(code58, t344);
			append(p64, t345);
			append(section4, t346);
			append(section4, p65);
			append(p65, strong20);
			append(strong20, t347);
			append(strong20, em10);
			append(em10, t348);
			append(p65, br0);
			append(p65, t349);
			append(p65, strong21);
			append(strong21, t350);
			append(strong21, em11);
			append(em11, t351);
			append(p65, br1);
			append(p65, t352);
			append(p65, strong22);
			append(strong22, t353);
			append(strong22, em12);
			append(em12, t354);
			append(p65, br2);
			append(p65, t355);
			append(p65, strong23);
			append(strong23, t356);
			append(strong23, em13);
			append(em13, t357);
			append(p65, br3);
			append(p65, t358);
			append(p65, strong24);
			append(strong24, t359);
			append(strong24, em14);
			append(em14, t360);
			append(section4, t361);
			append(section4, p66);
			append(p66, t362);
			append(p66, code59);
			append(code59, t363);
			append(p66, t364);
			append(p66, code60);
			append(code60, t365);
			append(p66, t366);
			append(section4, t367);
			append(section4, p67);
			append(p67, strong25);
			append(strong25, t368);
			append(strong25, em15);
			append(em15, t369);
			append(section4, t370);
			append(section4, p68);
			append(p68, t371);
			append(p68, code61);
			append(code61, t372);
			append(p68, t373);
			insert(target, t374, anchor);
			insert(target, section5, anchor);
			append(section5, h3);
			append(h3, a24);
			append(a24, t375);
			append(section5, t376);
			append(section5, p69);
			append(p69, t377);
			append(section5, t378);
			append(section5, p70);
			append(p70, t379);
			append(section5, t380);
			append(section5, pre11);
			pre11.innerHTML = raw11_value;
			append(section5, t381);
			append(section5, p71);
			append(p71, t382);
			append(p71, code62);
			append(code62, t383);
			append(p71, t384);
			append(p71, code63);
			append(code63, t385);
			append(p71, t386);
			append(section5, t387);
			append(section5, pre12);
			pre12.innerHTML = raw12_value;
			append(section5, t388);
			append(section5, p72);
			append(p72, t389);
			append(p72, code64);
			append(code64, t390);
			append(p72, t391);
			append(p72, code65);
			append(code65, t392);
			append(p72, t393);
			append(section5, t394);
			append(section5, pre13);
			pre13.innerHTML = raw13_value;
			append(section5, t395);
			append(section5, p73);
			append(p73, t396);
			append(p73, code66);
			append(code66, t397);
			append(p73, t398);
			append(p73, code67);
			append(code67, t399);
			append(p73, t400);
			append(section5, t401);
			append(section5, pre14);
			pre14.innerHTML = raw14_value;
			append(section5, t402);
			append(section5, p74);
			append(p74, t403);
			append(section5, t404);
			append(section5, pre15);
			pre15.innerHTML = raw15_value;
			append(section5, t405);
			append(section5, p75);
			append(p75, t406);
			append(p75, code68);
			append(code68, t407);
			append(p75, t408);
			append(section5, t409);
			append(section5, p76);
			append(p76, t410);
			append(p76, code69);
			append(code69, t411);
			append(p76, t412);
			append(p76, strong26);
			append(strong26, code70);
			append(code70, t413);
			append(p76, t414);
			append(section5, t415);
			append(section5, p77);
			append(p77, t416);
			append(p77, code71);
			append(code71, t417);
			append(p77, t418);
			append(section5, t419);
			append(section5, p78);
			append(p78, code72);
			append(code72, t420);
			append(p78, t421);
			append(section5, t422);
			append(section5, pre16);
			pre16.innerHTML = raw16_value;
			append(section5, t423);
			append(section5, p79);
			append(p79, em16);
			append(em16, t424);
			append(em16, code73);
			append(code73, t425);
			append(em16, t426);
			append(em16, code74);
			append(code74, t427);
			append(em16, t428);
			append(em16, code75);
			append(code75, t429);
			append(em16, t430);
			append(section5, t431);
			append(section5, p80);
			append(p80, t432);
			insert(target, t433, anchor);
			insert(target, section6, anchor);
			append(section6, h23);
			append(h23, a25);
			append(a25, t434);
			append(section6, t435);
			append(section6, p81);
			append(p81, t436);
		},
		p: noop,
		d(detaching) {
			if (detaching) detach(section0);
			if (detaching) detach(t6);
			if (detaching) detach(section1);
			if (detaching) detach(t40);
			if (detaching) detach(section2);
			if (detaching) detach(t158);
			if (detaching) detach(section3);
			if (detaching) detach(t177);
			if (detaching) detach(section4);
			if (detaching) detach(t374);
			if (detaching) detach(section5);
			if (detaching) detach(t433);
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
	"title": "Deep dive into Svelte",
	"description": "wip",
	"date": "2019-11-09T08:00:00Z",
	"lastUpdated": "2019-11-09T08:00:00Z",
	"wip": true,
	"slug": "deep-dive-into-svelte",
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
