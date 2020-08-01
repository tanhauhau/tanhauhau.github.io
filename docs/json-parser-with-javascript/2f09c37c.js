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

var image = "https://lihautan.com/json-parser-with-javascript/assets/hero-twitter-4080d421.jpg";

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
					"@id": "https%3A%2F%2Flihautan.com%2Fjson-parser-with-javascript",
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
			attr(meta11, "content", "https%3A%2F%2Flihautan.com%2Fjson-parser-with-javascript");
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
							"@id": "https%3A%2F%2Flihautan.com%2Fjson-parser-with-javascript",
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

/* content/blog/json-parser-with-javascript/@@page-markup.svelte generated by Svelte v3.24.0 */

function create_default_slot(ctx) {
	let section0;
	let ul2;
	let li0;
	let a0;
	let t0;
	let li1;
	let a1;
	let t1;
	let li2;
	let a2;
	let t2;
	let ul0;
	let li3;
	let a3;
	let t3;
	let li4;
	let a4;
	let t4;
	let li5;
	let a5;
	let t5;
	let ul1;
	let li6;
	let a6;
	let t6;
	let li7;
	let a7;
	let t7;
	let li8;
	let a8;
	let t8;
	let li9;
	let a9;
	let t9;
	let t10;
	let p0;
	let t11;
	let t12;
	let blockquote;
	let p1;
	let t13;
	let t14;
	let pre0;

	let raw0_value = `
<code class="language-">fakeParseJSON(&#39;&#123; &quot;data&quot;: &#123; &quot;fish&quot;: &quot;cake&quot;, &quot;array&quot;: [1,2,3], &quot;children&quot;: [ &#123; &quot;something&quot;: &quot;else&quot; &#125;, &#123; &quot;candy&quot;: &quot;cane&quot; &#125;, &#123; &quot;sponge&quot;: &quot;bob&quot; &#125; ] &#125; &#125; &#39;)</code>` + "";

	let t15;
	let p2;
	let t16;
	let t17;
	let pre1;

	let raw1_value = `
<code class="language-js"><span class="token keyword">const</span> fakeParseJSON <span class="token operator">=</span> <span class="token known-class-name class-name">JSON</span><span class="token punctuation">.</span><span class="token property-access">parse</span><span class="token punctuation">;</span></code>` + "";

	let t18;
	let p3;
	let t19;
	let t20;
	let ul3;
	let li10;
	let a10;
	let t21;
	let t22;
	let li11;
	let a11;
	let t23;
	let t24;
	let li12;
	let a12;
	let t25;
	let t26;
	let p4;
	let t27;
	let t28;
	let p5;
	let t29;
	let t30;
	let p6;
	let t31;
	let a13;
	let t32;
	let t33;
	let t34;
	let p7;
	let t35;
	let t36;
	let section1;
	let h20;
	let a14;
	let t37;
	let t38;
	let p8;
	let t39;
	let a15;
	let t40;
	let t41;
	let t42;
	let ul4;
	let li13;
	let a16;
	let t43;
	let t44;
	let t45;
	let p9;
	let img0;
	let img0_src_value;
	let t46;
	let small0;
	let t47;
	let t48;
	let ul5;
	let li14;
	let a17;
	let t49;
	let t50;
	let a18;
	let t51;
	let t52;
	let t53;
	let pre2;

	let raw2_value = `
<code class="language-">json
  element

value
  object
  array
  string
  number
  &quot;true&quot;
  &quot;false&quot;
  &quot;null&quot;

object
  &#39;&#123;&#39; ws &#39;&#125;&#39;
  &#39;&#123;&#39; members &#39;&#125;&#39;</code>` + "";

	let t54;
	let p10;
	let t55;
	let t56;
	let p11;
	let t57;
	let t58;
	let p12;
	let t59;
	let t60;
	let p13;
	let t61;
	let t62;
	let p14;
	let img1;
	let img1_src_value;
	let t63;
	let small1;
	let t64;
	let t65;
	let p15;
	let t66;
	let strong0;
	let t67;
	let t68;
	let t69;
	let p16;
	let t70;
	let t71;
	let p17;
	let t72;
	let code0;
	let t73;
	let t74;
	let code1;
	let t75;
	let t76;
	let code2;
	let t77;
	let t78;
	let code3;
	let t79;
	let t80;
	let code4;
	let t81;
	let t82;
	let code5;
	let t83;
	let t84;
	let code6;
	let t85;
	let t86;
	let strong1;
	let t87;
	let t88;
	let t89;
	let p18;
	let t90;
	let code7;
	let t91;
	let t92;
	let t93;
	let ul6;
	let li15;
	let code8;
	let t94;
	let t95;
	let code9;
	let t96;
	let t97;
	let t98;
	let li16;
	let code10;
	let t99;
	let t100;
	let code11;
	let t101;
	let t102;
	let code12;
	let t103;
	let t104;
	let code13;
	let t105;
	let t106;
	let code14;
	let t107;
	let t108;
	let code15;
	let t109;
	let t110;
	let t111;
	let p19;
	let t112;
	let t113;
	let ul7;
	let li17;
	let t114;
	let code16;
	let t115;
	let t116;
	let t117;
	let li18;
	let t118;
	let code17;
	let t119;
	let t120;
	let code18;
	let t121;
	let t122;
	let t123;
	let p20;
	let t124;
	let t125;
	let ul8;
	let li19;
	let t126;
	let code19;
	let t127;
	let t128;
	let t129;
	let p21;
	let t130;
	let t131;
	let section2;
	let h21;
	let a19;
	let t132;
	let t133;
	let p22;
	let t134;
	let t135;
	let pre3;

	let raw3_value = `
<code class="language-js"><span class="token keyword">function</span> <span class="token function">fakeParseJSON</span><span class="token punctuation">(</span><span class="token parameter">str</span><span class="token punctuation">)</span> <span class="token punctuation">&#123;</span>
  <span class="token keyword">let</span> i <span class="token operator">=</span> <span class="token number">0</span><span class="token punctuation">;</span>
  <span class="token comment">// TODO</span>
<span class="token punctuation">&#125;</span></code>` + "";

	let t136;
	let p23;
	let t137;
	let code20;
	let t138;
	let t139;
	let code21;
	let t140;
	let t141;
	let code22;
	let t142;
	let t143;
	let t144;
	let p24;
	let t145;
	let strong2;
	let t146;
	let t147;
	let pre4;

	let raw4_value = `
<code class="language-js"><span class="token keyword">function</span> <span class="token function">fakeParseJSON</span><span class="token punctuation">(</span><span class="token parameter">str</span><span class="token punctuation">)</span> <span class="token punctuation">&#123;</span>
  <span class="token keyword">let</span> i <span class="token operator">=</span> <span class="token number">0</span><span class="token punctuation">;</span>
  <span class="token keyword">function</span> <span class="token function">parseObject</span><span class="token punctuation">(</span><span class="token punctuation">)</span> <span class="token punctuation">&#123;</span>
    <span class="token keyword">if</span> <span class="token punctuation">(</span>str<span class="token punctuation">[</span>i<span class="token punctuation">]</span> <span class="token operator">===</span> <span class="token string">'&#123;'</span><span class="token punctuation">)</span> <span class="token punctuation">&#123;</span>
      i<span class="token operator">++</span><span class="token punctuation">;</span>
      <span class="token function">skipWhitespace</span><span class="token punctuation">(</span><span class="token punctuation">)</span><span class="token punctuation">;</span>

      <span class="token comment">// if it is not '&#125;',</span>
      <span class="token comment">// we take the path of string -> whitespace -> ':' -> value -> ...</span>
      <span class="token keyword">while</span> <span class="token punctuation">(</span>str<span class="token punctuation">[</span>i<span class="token punctuation">]</span> <span class="token operator">!==</span> <span class="token string">'&#125;'</span><span class="token punctuation">)</span> <span class="token punctuation">&#123;</span>
        <span class="token keyword">const</span> key <span class="token operator">=</span> <span class="token function">parseString</span><span class="token punctuation">(</span><span class="token punctuation">)</span><span class="token punctuation">;</span>
        <span class="token function">skipWhitespace</span><span class="token punctuation">(</span><span class="token punctuation">)</span><span class="token punctuation">;</span>
        <span class="token function">eatColon</span><span class="token punctuation">(</span><span class="token punctuation">)</span><span class="token punctuation">;</span>
        <span class="token keyword">const</span> value <span class="token operator">=</span> <span class="token function">parseValue</span><span class="token punctuation">(</span><span class="token punctuation">)</span><span class="token punctuation">;</span>
      <span class="token punctuation">&#125;</span>
    <span class="token punctuation">&#125;</span>
  <span class="token punctuation">&#125;</span>
<span class="token punctuation">&#125;</span></code>` + "";

	let t148;
	let p25;
	let t149;
	let code23;
	let t150;
	let t151;
	let t152;
	let p26;
	let t153;
	let code24;
	let t154;
	let t155;
	let code25;
	let t156;
	let t157;
	let code26;
	let t158;
	let t159;
	let code27;
	let t160;
	let t161;
	let code28;
	let t162;
	let t163;
	let code29;
	let t164;
	let t165;
	let t166;
	let p27;
	let t167;
	let t168;
	let pre5;

	let raw5_value = `
<code class="language-js"><span class="token keyword">function</span> <span class="token function">fakeParseJSON</span><span class="token punctuation">(</span><span class="token parameter">str</span><span class="token punctuation">)</span> <span class="token punctuation">&#123;</span>
  <span class="token keyword">let</span> i <span class="token operator">=</span> <span class="token number">0</span><span class="token punctuation">;</span>
  <span class="token keyword">function</span> <span class="token function">parseObject</span><span class="token punctuation">(</span><span class="token punctuation">)</span> <span class="token punctuation">&#123;</span>
    <span class="token keyword">if</span> <span class="token punctuation">(</span>str<span class="token punctuation">[</span>i<span class="token punctuation">]</span> <span class="token operator">===</span> <span class="token string">'&#123;'</span><span class="token punctuation">)</span> <span class="token punctuation">&#123;</span>
      i<span class="token operator">++</span><span class="token punctuation">;</span>
      <span class="token function">skipWhitespace</span><span class="token punctuation">(</span><span class="token punctuation">)</span><span class="token punctuation">;</span>

      <span class="token comment">// highlight-next-line</span>
      <span class="token keyword">let</span> initial <span class="token operator">=</span> <span class="token boolean">true</span><span class="token punctuation">;</span>
      <span class="token comment">// if it is not '&#125;',</span>
      <span class="token comment">// we take the path of string -> whitespace -> ':' -> value -> ...</span>
      <span class="token keyword">while</span> <span class="token punctuation">(</span>str<span class="token punctuation">[</span>i<span class="token punctuation">]</span> <span class="token operator">!==</span> <span class="token string">'&#125;'</span><span class="token punctuation">)</span> <span class="token punctuation">&#123;</span>
        <span class="token comment">// highlight-start</span>
        <span class="token keyword">if</span> <span class="token punctuation">(</span><span class="token operator">!</span>initial<span class="token punctuation">)</span> <span class="token punctuation">&#123;</span>
          <span class="token function">eatComma</span><span class="token punctuation">(</span><span class="token punctuation">)</span><span class="token punctuation">;</span>
          <span class="token function">skipWhitespace</span><span class="token punctuation">(</span><span class="token punctuation">)</span><span class="token punctuation">;</span>
        <span class="token punctuation">&#125;</span>
        <span class="token comment">// highlight-end</span>
        <span class="token keyword">const</span> key <span class="token operator">=</span> <span class="token function">parseString</span><span class="token punctuation">(</span><span class="token punctuation">)</span><span class="token punctuation">;</span>
        <span class="token function">skipWhitespace</span><span class="token punctuation">(</span><span class="token punctuation">)</span><span class="token punctuation">;</span>
        <span class="token function">eatColon</span><span class="token punctuation">(</span><span class="token punctuation">)</span><span class="token punctuation">;</span>
        <span class="token keyword">const</span> value <span class="token operator">=</span> <span class="token function">parseValue</span><span class="token punctuation">(</span><span class="token punctuation">)</span><span class="token punctuation">;</span>
        <span class="token comment">// highlight-next-line</span>
        initial <span class="token operator">=</span> <span class="token boolean">false</span><span class="token punctuation">;</span>
      <span class="token punctuation">&#125;</span>
      <span class="token comment">// move to the next character of '&#125;'</span>
      i<span class="token operator">++</span><span class="token punctuation">;</span>
    <span class="token punctuation">&#125;</span>
  <span class="token punctuation">&#125;</span>
<span class="token punctuation">&#125;</span></code>` + "";

	let t169;
	let p28;
	let t170;
	let t171;
	let ul9;
	let li20;
	let t172;
	let code30;
	let t173;
	let t174;
	let t175;
	let li21;
	let t176;
	let code31;
	let t177;
	let t178;
	let t179;
	let li22;
	let t180;
	let code32;
	let t181;
	let t182;
	let t183;
	let p29;
	let t184;
	let code33;
	let t185;
	let t186;
	let code34;
	let t187;
	let t188;
	let t189;
	let pre6;

	let raw6_value = `
<code class="language-js"><span class="token keyword">function</span> <span class="token function">fakeParseJSON</span><span class="token punctuation">(</span><span class="token parameter">str</span><span class="token punctuation">)</span> <span class="token punctuation">&#123;</span>
  <span class="token comment">// ...</span>
  <span class="token keyword">function</span> <span class="token function">eatComma</span><span class="token punctuation">(</span><span class="token punctuation">)</span> <span class="token punctuation">&#123;</span>
    <span class="token keyword">if</span> <span class="token punctuation">(</span>str<span class="token punctuation">[</span>i<span class="token punctuation">]</span> <span class="token operator">!==</span> <span class="token string">','</span><span class="token punctuation">)</span> <span class="token punctuation">&#123;</span>
      <span class="token keyword">throw</span> <span class="token keyword">new</span> <span class="token class-name">Error</span><span class="token punctuation">(</span><span class="token string">'Expected ",".'</span><span class="token punctuation">)</span><span class="token punctuation">;</span>
    <span class="token punctuation">&#125;</span>
    i<span class="token operator">++</span><span class="token punctuation">;</span>
  <span class="token punctuation">&#125;</span>

  <span class="token keyword">function</span> <span class="token function">eatColon</span><span class="token punctuation">(</span><span class="token punctuation">)</span> <span class="token punctuation">&#123;</span>
    <span class="token keyword">if</span> <span class="token punctuation">(</span>str<span class="token punctuation">[</span>i<span class="token punctuation">]</span> <span class="token operator">!==</span> <span class="token string">':'</span><span class="token punctuation">)</span> <span class="token punctuation">&#123;</span>
      <span class="token keyword">throw</span> <span class="token keyword">new</span> <span class="token class-name">Error</span><span class="token punctuation">(</span><span class="token string">'Expected ":".'</span><span class="token punctuation">)</span><span class="token punctuation">;</span>
    <span class="token punctuation">&#125;</span>
    i<span class="token operator">++</span><span class="token punctuation">;</span>
  <span class="token punctuation">&#125;</span>
<span class="token punctuation">&#125;</span></code>` + "";

	let t190;
	let p30;
	let t191;
	let code35;
	let t192;
	let t193;
	let t194;
	let p31;
	let t195;
	let t196;
	let pre7;

	let raw7_value = `
<code class="language-js"><span class="token keyword">function</span> <span class="token function">fakeParseJSON</span><span class="token punctuation">(</span><span class="token parameter">str</span><span class="token punctuation">)</span> <span class="token punctuation">&#123;</span>
  <span class="token keyword">let</span> i <span class="token operator">=</span> <span class="token number">0</span><span class="token punctuation">;</span>
  <span class="token keyword">function</span> <span class="token function">parseObject</span><span class="token punctuation">(</span><span class="token punctuation">)</span> <span class="token punctuation">&#123;</span>
    <span class="token keyword">if</span> <span class="token punctuation">(</span>str<span class="token punctuation">[</span>i<span class="token punctuation">]</span> <span class="token operator">===</span> <span class="token string">'&#123;'</span><span class="token punctuation">)</span> <span class="token punctuation">&#123;</span>
      i<span class="token operator">++</span><span class="token punctuation">;</span>
      <span class="token function">skipWhitespace</span><span class="token punctuation">(</span><span class="token punctuation">)</span><span class="token punctuation">;</span>

      <span class="token comment">// highlight-next-line</span>
      <span class="token keyword">const</span> result <span class="token operator">=</span> <span class="token punctuation">&#123;</span><span class="token punctuation">&#125;</span><span class="token punctuation">;</span>

      <span class="token keyword">let</span> initial <span class="token operator">=</span> <span class="token boolean">true</span><span class="token punctuation">;</span>
      <span class="token comment">// if it is not '&#125;',</span>
      <span class="token comment">// we take the path of string -> whitespace -> ':' -> value -> ...</span>
      <span class="token keyword">while</span> <span class="token punctuation">(</span>str<span class="token punctuation">[</span>i<span class="token punctuation">]</span> <span class="token operator">!==</span> <span class="token string">'&#125;'</span><span class="token punctuation">)</span> <span class="token punctuation">&#123;</span>
        <span class="token keyword">if</span> <span class="token punctuation">(</span><span class="token operator">!</span>initial<span class="token punctuation">)</span> <span class="token punctuation">&#123;</span>
          <span class="token function">eatComma</span><span class="token punctuation">(</span><span class="token punctuation">)</span><span class="token punctuation">;</span>
          <span class="token function">skipWhitespace</span><span class="token punctuation">(</span><span class="token punctuation">)</span><span class="token punctuation">;</span>
        <span class="token punctuation">&#125;</span>
        <span class="token keyword">const</span> key <span class="token operator">=</span> <span class="token function">parseString</span><span class="token punctuation">(</span><span class="token punctuation">)</span><span class="token punctuation">;</span>
        <span class="token function">skipWhitespace</span><span class="token punctuation">(</span><span class="token punctuation">)</span><span class="token punctuation">;</span>
        <span class="token function">eatColon</span><span class="token punctuation">(</span><span class="token punctuation">)</span><span class="token punctuation">;</span>
        <span class="token keyword">const</span> value <span class="token operator">=</span> <span class="token function">parseValue</span><span class="token punctuation">(</span><span class="token punctuation">)</span><span class="token punctuation">;</span>
        <span class="token comment">// highlight-next-line</span>
        result<span class="token punctuation">[</span>key<span class="token punctuation">]</span> <span class="token operator">=</span> value<span class="token punctuation">;</span>
        initial <span class="token operator">=</span> <span class="token boolean">false</span><span class="token punctuation">;</span>
      <span class="token punctuation">&#125;</span>
      <span class="token comment">// move to the next character of '&#125;'</span>
      i<span class="token operator">++</span><span class="token punctuation">;</span>

      <span class="token comment">// highlight-next-line</span>
      <span class="token keyword">return</span> result<span class="token punctuation">;</span>
    <span class="token punctuation">&#125;</span>
  <span class="token punctuation">&#125;</span>
<span class="token punctuation">&#125;</span></code>` + "";

	let t197;
	let p32;
	let t198;
	let t199;
	let p33;
	let img2;
	let img2_src_value;
	let t200;
	let small2;
	let t201;
	let t202;
	let pre8;

	let raw8_value = `
<code class="language-js"><span class="token keyword">function</span> <span class="token function">fakeParseJSON</span><span class="token punctuation">(</span><span class="token parameter">str</span><span class="token punctuation">)</span> <span class="token punctuation">&#123;</span>
  <span class="token comment">// ...</span>
  <span class="token keyword">function</span> <span class="token function">parseArray</span><span class="token punctuation">(</span><span class="token punctuation">)</span> <span class="token punctuation">&#123;</span>
    <span class="token keyword">if</span> <span class="token punctuation">(</span>str<span class="token punctuation">[</span>i<span class="token punctuation">]</span> <span class="token operator">===</span> <span class="token string">'['</span><span class="token punctuation">)</span> <span class="token punctuation">&#123;</span>
      i<span class="token operator">++</span><span class="token punctuation">;</span>
      <span class="token function">skipWhitespace</span><span class="token punctuation">(</span><span class="token punctuation">)</span><span class="token punctuation">;</span>

      <span class="token keyword">const</span> result <span class="token operator">=</span> <span class="token punctuation">[</span><span class="token punctuation">]</span><span class="token punctuation">;</span>
      <span class="token keyword">let</span> initial <span class="token operator">=</span> <span class="token boolean">true</span><span class="token punctuation">;</span>
      <span class="token keyword">while</span> <span class="token punctuation">(</span>str<span class="token punctuation">[</span>i<span class="token punctuation">]</span> <span class="token operator">!==</span> <span class="token string">']'</span><span class="token punctuation">)</span> <span class="token punctuation">&#123;</span>
        <span class="token keyword">if</span> <span class="token punctuation">(</span><span class="token operator">!</span>initial<span class="token punctuation">)</span> <span class="token punctuation">&#123;</span>
          <span class="token function">eatComma</span><span class="token punctuation">(</span><span class="token punctuation">)</span><span class="token punctuation">;</span>
        <span class="token punctuation">&#125;</span>
        <span class="token keyword">const</span> value <span class="token operator">=</span> <span class="token function">parseValue</span><span class="token punctuation">(</span><span class="token punctuation">)</span><span class="token punctuation">;</span>
        result<span class="token punctuation">.</span><span class="token method function property-access">push</span><span class="token punctuation">(</span>value<span class="token punctuation">)</span><span class="token punctuation">;</span>
        initial <span class="token operator">=</span> <span class="token boolean">false</span><span class="token punctuation">;</span>
      <span class="token punctuation">&#125;</span>
      <span class="token comment">// move to the next character of ']'</span>
      i<span class="token operator">++</span><span class="token punctuation">;</span>
      <span class="token keyword">return</span> result<span class="token punctuation">;</span>
    <span class="token punctuation">&#125;</span>
  <span class="token punctuation">&#125;</span>
<span class="token punctuation">&#125;</span></code>` + "";

	let t203;
	let p34;
	let t204;
	let t205;
	let p35;
	let img3;
	let img3_src_value;
	let t206;
	let small3;
	let t207;
	let t208;
	let p36;
	let t209;
	let t210;
	let pre9;

	let raw9_value = `
<code class="language-js"><span class="token keyword">function</span> <span class="token function">fakeParseJSON</span><span class="token punctuation">(</span><span class="token parameter">str</span><span class="token punctuation">)</span> <span class="token punctuation">&#123;</span>
  <span class="token comment">// ...</span>
  <span class="token keyword">function</span> <span class="token function">parseValue</span><span class="token punctuation">(</span><span class="token punctuation">)</span> <span class="token punctuation">&#123;</span>
    <span class="token function">skipWhitespace</span><span class="token punctuation">(</span><span class="token punctuation">)</span><span class="token punctuation">;</span>
    <span class="token keyword">const</span> value <span class="token operator">=</span>
      <span class="token function">parseString</span><span class="token punctuation">(</span><span class="token punctuation">)</span> <span class="token operator">?</span><span class="token operator">?</span>
      <span class="token function">parseNumber</span><span class="token punctuation">(</span><span class="token punctuation">)</span> <span class="token operator">?</span><span class="token operator">?</span>
      <span class="token function">parseObject</span><span class="token punctuation">(</span><span class="token punctuation">)</span> <span class="token operator">?</span><span class="token operator">?</span>
      <span class="token function">parseArray</span><span class="token punctuation">(</span><span class="token punctuation">)</span> <span class="token operator">?</span><span class="token operator">?</span>
      <span class="token function">parseKeyword</span><span class="token punctuation">(</span><span class="token string">'true'</span><span class="token punctuation">,</span> <span class="token boolean">true</span><span class="token punctuation">)</span> <span class="token operator">?</span><span class="token operator">?</span>
      <span class="token function">parseKeyword</span><span class="token punctuation">(</span><span class="token string">'false'</span><span class="token punctuation">,</span> <span class="token boolean">false</span><span class="token punctuation">)</span> <span class="token operator">?</span><span class="token operator">?</span>
      <span class="token function">parseKeyword</span><span class="token punctuation">(</span><span class="token string">'null'</span><span class="token punctuation">,</span> <span class="token keyword null nil">null</span><span class="token punctuation">)</span><span class="token punctuation">;</span>
    <span class="token function">skipWhitespace</span><span class="token punctuation">(</span><span class="token punctuation">)</span><span class="token punctuation">;</span>
    <span class="token keyword">return</span> value<span class="token punctuation">;</span>
  <span class="token punctuation">&#125;</span>
<span class="token punctuation">&#125;</span></code>` + "";

	let t211;
	let p37;
	let t212;
	let code36;
	let t213;
	let t214;
	let a20;
	let t215;
	let t216;
	let code37;
	let t217;
	let t218;
	let code38;
	let t219;
	let t220;
	let code39;
	let t221;
	let t222;
	let code40;
	let t223;
	let t224;
	let code41;
	let t225;
	let t226;
	let code42;
	let t227;
	let t228;
	let code43;
	let t229;
	let t230;
	let code44;
	let t231;
	let t232;
	let code45;
	let t233;
	let t234;
	let t235;
	let p38;
	let t236;
	let code46;
	let t237;
	let t238;
	let t239;
	let pre10;

	let raw10_value = `
<code class="language-js"><span class="token keyword">function</span> <span class="token function">fakeParseJSON</span><span class="token punctuation">(</span><span class="token parameter">str</span><span class="token punctuation">)</span> <span class="token punctuation">&#123;</span>
  <span class="token comment">// ...</span>
  <span class="token keyword">function</span> <span class="token function">parseKeyword</span><span class="token punctuation">(</span><span class="token parameter">name<span class="token punctuation">,</span> value</span><span class="token punctuation">)</span> <span class="token punctuation">&#123;</span>
    <span class="token keyword">if</span> <span class="token punctuation">(</span>str<span class="token punctuation">.</span><span class="token method function property-access">slice</span><span class="token punctuation">(</span>i<span class="token punctuation">,</span> i <span class="token operator">+</span> name<span class="token punctuation">.</span><span class="token property-access">length</span><span class="token punctuation">)</span> <span class="token operator">===</span> name<span class="token punctuation">)</span> <span class="token punctuation">&#123;</span>
      i <span class="token operator">+=</span> name<span class="token punctuation">.</span><span class="token property-access">length</span><span class="token punctuation">;</span>
      <span class="token keyword">return</span> value<span class="token punctuation">;</span>
    <span class="token punctuation">&#125;</span>
  <span class="token punctuation">&#125;</span>
<span class="token punctuation">&#125;</span></code>` + "";

	let t240;
	let p39;
	let t241;
	let code47;
	let t242;
	let t243;
	let t244;
	let p40;
	let t245;
	let t246;
	let iframe0;
	let iframe0_src_value;
	let t247;
	let p41;
	let t248;
	let code48;
	let t249;
	let t250;
	let t251;
	let pre11;

	let raw11_value = `
<code class="language-js"><span class="token keyword">function</span> <span class="token function">fakeParseJSON</span><span class="token punctuation">(</span><span class="token parameter">str</span><span class="token punctuation">)</span> <span class="token punctuation">&#123;</span>
  <span class="token keyword">let</span> i <span class="token operator">=</span> <span class="token number">0</span><span class="token punctuation">;</span>
  <span class="token keyword">return</span> <span class="token function">parseValue</span><span class="token punctuation">(</span><span class="token punctuation">)</span><span class="token punctuation">;</span>

  <span class="token comment">// ...</span>
<span class="token punctuation">&#125;</span></code>` + "";

	let t252;
	let p42;
	let t253;
	let t254;
	let p43;
	let t255;
	let t256;
	let section3;
	let h22;
	let a21;
	let t257;
	let t258;
	let p44;
	let t259;
	let t260;
	let p45;
	let t261;
	let t262;
	let ul10;
	let li23;
	let t263;
	let t264;
	let li24;
	let t265;
	let t266;
	let section4;
	let h30;
	let a22;
	let t267;
	let t268;
	let section5;
	let h31;
	let a23;
	let t269;
	let t270;
	let p46;
	let t271;
	let code49;
	let t272;
	let t273;
	let t274;
	let pre12;

	let raw12_value = `
<code class="language-js"><span class="token keyword">function</span> <span class="token function">fakeParseJSON</span><span class="token punctuation">(</span><span class="token parameter">str</span><span class="token punctuation">)</span> <span class="token punctuation">&#123;</span>
  <span class="token comment">// ...</span>
  <span class="token keyword">function</span> <span class="token function">parseObject</span><span class="token punctuation">(</span><span class="token punctuation">)</span> <span class="token punctuation">&#123;</span>
    <span class="token comment">// ...</span>
    <span class="token keyword">while</span><span class="token punctuation">(</span>str<span class="token punctuation">[</span>i<span class="token punctuation">]</span> <span class="token operator">!==</span> <span class="token string">'&#125;'</span><span class="token punctuation">)</span> <span class="token punctuation">&#123;</span></code>` + "";

	let t275;
	let p47;
	let t276;
	let t277;
	let pre13;

	let raw13_value = `
<code class="language-js"><span class="token keyword">function</span> <span class="token function">fakeParseJSON</span><span class="token punctuation">(</span><span class="token parameter">str</span><span class="token punctuation">)</span> <span class="token punctuation">&#123;</span>
  <span class="token comment">// ...</span>
  <span class="token keyword">function</span> <span class="token function">parseObject</span><span class="token punctuation">(</span><span class="token punctuation">)</span> <span class="token punctuation">&#123;</span>
    <span class="token comment">// ...</span>
    <span class="token comment">// highlight-next-line</span>
    <span class="token keyword">while</span> <span class="token punctuation">(</span>i <span class="token operator">&lt;</span> str<span class="token punctuation">.</span><span class="token property-access">length</span> <span class="token operator">&amp;&amp;</span> str<span class="token punctuation">[</span>i<span class="token punctuation">]</span> <span class="token operator">!==</span> <span class="token string">'&#125;'</span><span class="token punctuation">)</span> <span class="token punctuation">&#123;</span>
      <span class="token comment">// ...</span>
    <span class="token punctuation">&#125;</span>
    <span class="token comment">// highlight-next-line</span>
    <span class="token function">checkUnexpectedEndOfInput</span><span class="token punctuation">(</span><span class="token punctuation">)</span><span class="token punctuation">;</span>

    <span class="token comment">// move to the next character of '&#125;'</span>
    i<span class="token operator">++</span><span class="token punctuation">;</span>

    <span class="token keyword">return</span> result<span class="token punctuation">;</span>
  <span class="token punctuation">&#125;</span>
<span class="token punctuation">&#125;</span></code>` + "";

	let t278;
	let section6;
	let h23;
	let a24;
	let t279;
	let t280;
	let p48;
	let t281;
	let t282;
	let p49;
	let t283;
	let t284;
	let pre14;

	let raw14_value = `
<code class="language-js"><span class="token maybe-class-name">Unexpected</span> token <span class="token string">"a"</span></code>` + "";

	let t285;
	let p50;
	let t286;
	let t287;
	let p51;
	let t288;
	let t289;
	let section7;
	let h32;
	let a25;
	let t290;
	let t291;
	let p52;
	let t292;
	let t293;
	let pre15;

	let raw15_value = `
<code class="language-js"><span class="token comment">// instead of</span>
<span class="token maybe-class-name">Unexpected</span> token <span class="token string">"a"</span>
<span class="token maybe-class-name">Unexpected</span> end <span class="token keyword">of</span> input

<span class="token comment">// show</span>
<span class="token constant">JSON_ERROR_001</span> <span class="token maybe-class-name">Unexpected</span> token <span class="token string">"a"</span>
<span class="token constant">JSON_ERROR_002</span> <span class="token maybe-class-name">Unexpected</span> end <span class="token keyword">of</span> input</code>` + "";

	let t294;
	let section8;
	let h33;
	let a26;
	let t295;
	let t296;
	let p53;
	let t297;
	let t298;
	let pre16;

	let raw16_value = `
<code class="language-js"><span class="token comment">// instead of</span>
<span class="token maybe-class-name">Unexpected</span> token <span class="token string">"a"</span> at position <span class="token number">5</span>

<span class="token comment">// show</span>
<span class="token punctuation">&#123;</span> <span class="token string">"b"</span>a
      <span class="token operator">^</span>
<span class="token constant">JSON_ERROR_001</span> <span class="token maybe-class-name">Unexpected</span> token <span class="token string">"a"</span></code>` + "";

	let t299;
	let p54;
	let t300;
	let t301;
	let pre17;

	let raw17_value = `
<code class="language-js"><span class="token keyword">function</span> <span class="token function">fakeParseJSON</span><span class="token punctuation">(</span><span class="token parameter">str</span><span class="token punctuation">)</span> <span class="token punctuation">&#123;</span>
  <span class="token comment">// ...</span>
  <span class="token keyword">function</span> <span class="token function">printCodeSnippet</span><span class="token punctuation">(</span><span class="token punctuation">)</span> <span class="token punctuation">&#123;</span>
    <span class="token keyword">const</span> <span class="token keyword module">from</span> <span class="token operator">=</span> <span class="token known-class-name class-name">Math</span><span class="token punctuation">.</span><span class="token method function property-access">max</span><span class="token punctuation">(</span><span class="token number">0</span><span class="token punctuation">,</span> i <span class="token operator">-</span> <span class="token number">10</span><span class="token punctuation">)</span><span class="token punctuation">;</span>
    <span class="token keyword">const</span> trimmed <span class="token operator">=</span> <span class="token keyword module">from</span> <span class="token operator">></span> <span class="token number">0</span><span class="token punctuation">;</span>
    <span class="token keyword">const</span> padding <span class="token operator">=</span> <span class="token punctuation">(</span>trimmed <span class="token operator">?</span> <span class="token number">3</span> <span class="token punctuation">:</span> <span class="token number">0</span><span class="token punctuation">)</span> <span class="token operator">+</span> <span class="token punctuation">(</span>i <span class="token operator">-</span> <span class="token keyword module">from</span><span class="token punctuation">)</span><span class="token punctuation">;</span>
    <span class="token keyword">const</span> snippet <span class="token operator">=</span> <span class="token punctuation">[</span>
      <span class="token punctuation">(</span>trimmed <span class="token operator">?</span> <span class="token string">'...'</span> <span class="token punctuation">:</span> <span class="token string">''</span><span class="token punctuation">)</span> <span class="token operator">+</span> str<span class="token punctuation">.</span><span class="token method function property-access">slice</span><span class="token punctuation">(</span><span class="token keyword module">from</span><span class="token punctuation">,</span> i <span class="token operator">+</span> <span class="token number">1</span><span class="token punctuation">)</span><span class="token punctuation">,</span>
      <span class="token string">' '</span><span class="token punctuation">.</span><span class="token method function property-access">repeat</span><span class="token punctuation">(</span>padding<span class="token punctuation">)</span> <span class="token operator">+</span> <span class="token string">'^'</span><span class="token punctuation">,</span>
      <span class="token string">' '</span><span class="token punctuation">.</span><span class="token method function property-access">repeat</span><span class="token punctuation">(</span>padding<span class="token punctuation">)</span> <span class="token operator">+</span> message<span class="token punctuation">,</span>
    <span class="token punctuation">]</span><span class="token punctuation">.</span><span class="token method function property-access">join</span><span class="token punctuation">(</span><span class="token string">'&#92;n'</span><span class="token punctuation">)</span><span class="token punctuation">;</span>
    <span class="token console class-name">console</span><span class="token punctuation">.</span><span class="token method function property-access">log</span><span class="token punctuation">(</span>snippet<span class="token punctuation">)</span><span class="token punctuation">;</span>
  <span class="token punctuation">&#125;</span>
<span class="token punctuation">&#125;</span></code>` + "";

	let t302;
	let section9;
	let h34;
	let a27;
	let t303;
	let t304;
	let p55;
	let t305;
	let t306;
	let pre18;

	let raw18_value = `
<code class="language-js"><span class="token comment">// instead of</span>
<span class="token maybe-class-name">Unexpected</span> token <span class="token string">"a"</span> at position <span class="token number">5</span>

<span class="token comment">// show</span>
<span class="token punctuation">&#123;</span> <span class="token string">"b"</span>a
      <span class="token operator">^</span>
<span class="token constant">JSON_ERROR_001</span> <span class="token maybe-class-name">Unexpected</span> token <span class="token string">"a"</span><span class="token punctuation">.</span>
<span class="token property-access"><span class="token maybe-class-name">Expecting</span></span> a <span class="token string">":"</span> over here<span class="token punctuation">,</span> eg<span class="token punctuation">:</span>
<span class="token punctuation">&#123;</span> <span class="token string">"b"</span><span class="token punctuation">:</span> <span class="token string">"bar"</span> <span class="token punctuation">&#125;</span>
      <span class="token operator">^</span>
<span class="token maybe-class-name">You</span> can learn more about valid <span class="token known-class-name class-name">JSON</span> string <span class="token keyword">in</span> http<span class="token punctuation">:</span><span class="token operator">/</span><span class="token operator">/</span>goo<span class="token punctuation">.</span><span class="token property-access">gl</span><span class="token operator">/</span>xxxxx</code>` + "";

	let t307;
	let p56;
	let t308;
	let t309;
	let pre19;

	let raw19_value = `
<code class="language-js"><span class="token function">fakeParseJSON</span><span class="token punctuation">(</span><span class="token string">'"Lorem ipsum'</span><span class="token punctuation">)</span><span class="token punctuation">;</span>

<span class="token comment">// instead of</span>
<span class="token maybe-class-name">Expecting</span> a <span class="token template-string"><span class="token template-punctuation string">&#96;</span><span class="token string">"</span><span class="token template-punctuation string">&#96;</span></span> over here<span class="token punctuation">,</span> eg<span class="token punctuation">:</span>
<span class="token string">"Foo Bar"</span>
        <span class="token operator">^</span>

<span class="token comment">// show</span>
<span class="token maybe-class-name">Expecting</span> a <span class="token template-string"><span class="token template-punctuation string">&#96;</span><span class="token string">"</span><span class="token template-punctuation string">&#96;</span></span> over here<span class="token punctuation">,</span> eg<span class="token punctuation">:</span>
<span class="token string">"Lorem ipsum"</span>
            <span class="token operator">^</span></code>` + "";

	let t310;
	let p57;
	let t311;
	let t312;
	let p58;
	let t313;
	let t314;
	let ul11;
	let li25;
	let t315;
	let t316;
	let li26;
	let t317;
	let t318;
	let li27;
	let t319;
	let t320;
	let iframe1;
	let iframe1_src_value;
	let t321;
	let p59;
	let t322;
	let a28;
	let t323;
	let t324;
	let a29;
	let t325;
	let t326;
	let t327;
	let section10;
	let h24;
	let a30;
	let t328;
	let t329;
	let p60;
	let t330;
	let t331;
	let p61;
	let t332;
	let t333;
	let p62;
	let t334;
	let t335;
	let p63;
	let t336;
	let t337;
	let p64;
	let t338;
	let t339;
	let ul12;
	let li28;
	let a31;
	let t340;
	let t341;
	let li29;
	let a32;
	let t342;
	let t343;
	let p65;
	let t344;
	let a33;
	let t345;
	let t346;

	return {
		c() {
			section0 = element("section");
			ul2 = element("ul");
			li0 = element("li");
			a0 = element("a");
			t0 = text("Understand the grammar");
			li1 = element("li");
			a1 = element("a");
			t1 = text("Implementing the parser");
			li2 = element("li");
			a2 = element("a");
			t2 = text("Handling the unexpected input");
			ul0 = element("ul");
			li3 = element("li");
			a3 = element("a");
			t3 = text("Unexpected token");
			li4 = element("li");
			a4 = element("a");
			t4 = text("Unexpected end of string");
			li5 = element("li");
			a5 = element("a");
			t5 = text("Going the extra mile");
			ul1 = element("ul");
			li6 = element("li");
			a6 = element("a");
			t6 = text("Error code and standard error message");
			li7 = element("li");
			a7 = element("a");
			t7 = text("A better view of what went wrong");
			li8 = element("li");
			a8 = element("a");
			t8 = text("Suggestions for error recovery");
			li9 = element("li");
			a9 = element("a");
			t9 = text("Summary");
			t10 = space();
			p0 = element("p");
			t11 = text("The interview question of the week for this week on Cassidoo's weekly newsletter is,");
			t12 = space();
			blockquote = element("blockquote");
			p1 = element("p");
			t13 = text("Write a function that takes in a string of valid JSON and converts it to an object (or whatever your chosen language uses, dicts, maps, etc).\nExample input:");
			t14 = space();
			pre0 = element("pre");
			t15 = space();
			p2 = element("p");
			t16 = text("At one point, I was tempted to just to write:");
			t17 = space();
			pre1 = element("pre");
			t18 = space();
			p3 = element("p");
			t19 = text("But, I thought, I've written quite a few articles about AST:");
			t20 = space();
			ul3 = element("ul");
			li10 = element("li");
			a10 = element("a");
			t21 = text("Creating custom JavaScript syntax with Babel");
			t22 = space();
			li11 = element("li");
			a11 = element("a");
			t23 = text("Step-by-step guide for writing a custom babel transformation");
			t24 = space();
			li12 = element("li");
			a12 = element("a");
			t25 = text("Manipulating AST with JavaScript");
			t26 = space();
			p4 = element("p");
			t27 = text("which covers the overview of the compiler pipeline, as well as how to manipulate AST, but I haven't covered much on how to implement a parser.");
			t28 = space();
			p5 = element("p");
			t29 = text("That's because, implementing a JavaScript compiler in an article is a task too daunting for me.");
			t30 = space();
			p6 = element("p");
			t31 = text("Well, fret not. JSON is also a language. It has its own grammar, which you can refer from ");
			a13 = element("a");
			t32 = text("the specifications");
			t33 = text(". The knowledge and technique you need to write a JSON parser is transferrable to writing a JS parser.");
			t34 = space();
			p7 = element("p");
			t35 = text("So, let's start writing a JSON parser!");
			t36 = space();
			section1 = element("section");
			h20 = element("h2");
			a14 = element("a");
			t37 = text("Understand the grammar");
			t38 = space();
			p8 = element("p");
			t39 = text("If you look at ");
			a15 = element("a");
			t40 = text("the specification page");
			t41 = text(", there's 2 diagrams:");
			t42 = space();
			ul4 = element("ul");
			li13 = element("li");
			a16 = element("a");
			t43 = text("The syntax diagram (or railroad diagram)");
			t44 = text(" on the left,");
			t45 = space();
			p9 = element("p");
			img0 = element("img");
			t46 = space();
			small0 = element("small");
			t47 = text("Image source: https://www.json.org/img/object.png");
			t48 = space();
			ul5 = element("ul");
			li14 = element("li");
			a17 = element("a");
			t49 = text("The McKeeman Form");
			t50 = text(", a variant of ");
			a18 = element("a");
			t51 = text("Backus-Naur Form (BNF)");
			t52 = text(", on the right");
			t53 = space();
			pre2 = element("pre");
			t54 = space();
			p10 = element("p");
			t55 = text("Both diagrams are equivalent.");
			t56 = space();
			p11 = element("p");
			t57 = text("One is visual and one is text based. The text based grammar syntax, Backus-Naur Form, is usually fed to another parser that parse this grammar and generate a parser for it. Speaking of parser-ception! 🤯");
			t58 = space();
			p12 = element("p");
			t59 = text("In this article, we will focus on the railroad diagram, because it is visual and seemed to be more friendly to me.");
			t60 = space();
			p13 = element("p");
			t61 = text("Lets' look at the first railroad diagram:");
			t62 = space();
			p14 = element("p");
			img1 = element("img");
			t63 = space();
			small1 = element("small");
			t64 = text("Image source: https://www.json.org/img/object.png");
			t65 = space();
			p15 = element("p");
			t66 = text("So this is the grammar for ");
			strong0 = element("strong");
			t67 = text("\"object\"");
			t68 = text(" in JSON.");
			t69 = space();
			p16 = element("p");
			t70 = text("We start from the left, following the arrow, and then we end at the right.");
			t71 = space();
			p17 = element("p");
			t72 = text("The circles, eg ");
			code0 = element("code");
			t73 = text("{");
			t74 = text(", ");
			code1 = element("code");
			t75 = text(",");
			t76 = text(", ");
			code2 = element("code");
			t77 = text(":");
			t78 = text(", ");
			code3 = element("code");
			t79 = text("}");
			t80 = text(", are the characters, and the boxes eg: ");
			code4 = element("code");
			t81 = text("whitespace");
			t82 = text(", ");
			code5 = element("code");
			t83 = text("string");
			t84 = text(", and ");
			code6 = element("code");
			t85 = text("value");
			t86 = text(" is a placeholder for another grammar. So to parse the \"whitespace\", we will need to look at the grammar for ");
			strong1 = element("strong");
			t87 = text("\"whitepsace\"");
			t88 = text(".");
			t89 = space();
			p18 = element("p");
			t90 = text("So, starting from the left, for an object, the first character has to be an open curly bracket, ");
			code7 = element("code");
			t91 = text("{");
			t92 = text(". and then we have 2 options from here:");
			t93 = space();
			ul6 = element("ul");
			li15 = element("li");
			code8 = element("code");
			t94 = text("whitespace");
			t95 = text(" → ");
			code9 = element("code");
			t96 = text("}");
			t97 = text(" → end, or");
			t98 = space();
			li16 = element("li");
			code10 = element("code");
			t99 = text("whitespace");
			t100 = text(" → ");
			code11 = element("code");
			t101 = text("string");
			t102 = text(" → ");
			code12 = element("code");
			t103 = text("whitespace");
			t104 = text(" → ");
			code13 = element("code");
			t105 = text(":");
			t106 = text(" → ");
			code14 = element("code");
			t107 = text("value");
			t108 = text(" → ");
			code15 = element("code");
			t109 = text("}");
			t110 = text(" → end");
			t111 = space();
			p19 = element("p");
			t112 = text("Of course, when you reach \"value\", you can choose to go to:");
			t113 = space();
			ul7 = element("ul");
			li17 = element("li");
			t114 = text("→ ");
			code16 = element("code");
			t115 = text("}");
			t116 = text(" → end, or");
			t117 = space();
			li18 = element("li");
			t118 = text("→ ");
			code17 = element("code");
			t119 = text(",");
			t120 = text(" → ");
			code18 = element("code");
			t121 = text("whitespace");
			t122 = text(" → ... → value");
			t123 = space();
			p20 = element("p");
			t124 = text("and you can keep looping, until you decide to go to:");
			t125 = space();
			ul8 = element("ul");
			li19 = element("li");
			t126 = text("→ ");
			code19 = element("code");
			t127 = text("}");
			t128 = text(" → end.");
			t129 = space();
			p21 = element("p");
			t130 = text("So, I guess we are now acquainted with the railroad diagram, let's carry on to the next section.");
			t131 = space();
			section2 = element("section");
			h21 = element("h2");
			a19 = element("a");
			t132 = text("Implementing the parser");
			t133 = space();
			p22 = element("p");
			t134 = text("Let's start with the following structure:");
			t135 = space();
			pre3 = element("pre");
			t136 = space();
			p23 = element("p");
			t137 = text("We initialise ");
			code20 = element("code");
			t138 = text("i");
			t139 = text(" as the index for the current character, we will end as soon as ");
			code21 = element("code");
			t140 = text("i");
			t141 = text(" reaches the end of the ");
			code22 = element("code");
			t142 = text("str");
			t143 = text(".");
			t144 = space();
			p24 = element("p");
			t145 = text("Let's implement the grammar for the ");
			strong2 = element("strong");
			t146 = text("\"object\":");
			t147 = space();
			pre4 = element("pre");
			t148 = space();
			p25 = element("p");
			t149 = text("In the ");
			code23 = element("code");
			t150 = text("parseObject");
			t151 = text(", we will call parse of other grammars, like \"string\" and \"whitespace\", when we implement them, everything will work 🤞.");
			t152 = space();
			p26 = element("p");
			t153 = text("One thing that I forgot to add is the comma, ");
			code24 = element("code");
			t154 = text(",");
			t155 = text(". The ");
			code25 = element("code");
			t156 = text(",");
			t157 = text(" only appears before we start the second loop of ");
			code26 = element("code");
			t158 = text("whitespace");
			t159 = text(" → ");
			code27 = element("code");
			t160 = text("string");
			t161 = text(" → ");
			code28 = element("code");
			t162 = text("whitespace");
			t163 = text(" → ");
			code29 = element("code");
			t164 = text(":");
			t165 = text(" → ...");
			t166 = space();
			p27 = element("p");
			t167 = text("Based on that, we add the following lines:");
			t168 = space();
			pre5 = element("pre");
			t169 = space();
			p28 = element("p");
			t170 = text("Some naming convention:");
			t171 = space();
			ul9 = element("ul");
			li20 = element("li");
			t172 = text("We call ");
			code30 = element("code");
			t173 = text("parseSomething");
			t174 = text(", when we parse the code based on grammar and use the return value");
			t175 = space();
			li21 = element("li");
			t176 = text("We call ");
			code31 = element("code");
			t177 = text("eatSomething");
			t178 = text(", when we expect the character(s) to be there, but we are not using the character(s)");
			t179 = space();
			li22 = element("li");
			t180 = text("We call ");
			code32 = element("code");
			t181 = text("skipSomething");
			t182 = text(", when we are okay if the character(s) is not there.");
			t183 = space();
			p29 = element("p");
			t184 = text("Let's implement the ");
			code33 = element("code");
			t185 = text("eatComma");
			t186 = text(" and ");
			code34 = element("code");
			t187 = text("eatColon");
			t188 = text(":");
			t189 = space();
			pre6 = element("pre");
			t190 = space();
			p30 = element("p");
			t191 = text("So we have finished implemented the ");
			code35 = element("code");
			t192 = text("parseObject");
			t193 = text(" grammar, but what is the return value from this parse function?");
			t194 = space();
			p31 = element("p");
			t195 = text("Well, we need to return a JavaScript object:");
			t196 = space();
			pre7 = element("pre");
			t197 = space();
			p32 = element("p");
			t198 = text("Now that you've seen me implementing the \"object\" grammar, it's time for you to try out the \"array\" grammar:");
			t199 = space();
			p33 = element("p");
			img2 = element("img");
			t200 = space();
			small2 = element("small");
			t201 = text("Image source: https://www.json.org/img/array.png");
			t202 = space();
			pre8 = element("pre");
			t203 = space();
			p34 = element("p");
			t204 = text("Now, move on to a more interesting grammar, \"value\":");
			t205 = space();
			p35 = element("p");
			img3 = element("img");
			t206 = space();
			small3 = element("small");
			t207 = text("Image source: https://www.json.org/img/value.png");
			t208 = space();
			p36 = element("p");
			t209 = text("A value starts with \"whitespace\", then any of the following: \"string\", \"number\", \"object\", \"array\", \"true\", \"false\" or \"null\", and then end with a \"whitespace\":");
			t210 = space();
			pre9 = element("pre");
			t211 = space();
			p37 = element("p");
			t212 = text("The ");
			code36 = element("code");
			t213 = text("??");
			t214 = text(" is called the ");
			a20 = element("a");
			t215 = text("nullish coalescing operator");
			t216 = text(", it is like the ");
			code37 = element("code");
			t217 = text("||");
			t218 = text(" that we used to use for defaulting a value ");
			code38 = element("code");
			t219 = text("foo || default");
			t220 = text(", except that ");
			code39 = element("code");
			t221 = text("||");
			t222 = text(" will return the ");
			code40 = element("code");
			t223 = text("default");
			t224 = text(" as long as ");
			code41 = element("code");
			t225 = text("foo");
			t226 = text(" is falsy, whereas the nullish coalescing operator will only return ");
			code42 = element("code");
			t227 = text("default");
			t228 = text(" when ");
			code43 = element("code");
			t229 = text("foo");
			t230 = text(" is either ");
			code44 = element("code");
			t231 = text("null");
			t232 = text(" or ");
			code45 = element("code");
			t233 = text("undefined");
			t234 = text(".");
			t235 = space();
			p38 = element("p");
			t236 = text("The parseKeyword will check whether the current ");
			code46 = element("code");
			t237 = text("str.slice(i)");
			t238 = text(" matches the keyword string, if so, it will return the keyword value:");
			t239 = space();
			pre10 = element("pre");
			t240 = space();
			p39 = element("p");
			t241 = text("That's it for ");
			code47 = element("code");
			t242 = text("parseValue");
			t243 = text("!");
			t244 = space();
			p40 = element("p");
			t245 = text("We still have 3 more grammars to go, but I will save the length of this article, and implement them in the following CodeSandbox:");
			t246 = space();
			iframe0 = element("iframe");
			t247 = space();
			p41 = element("p");
			t248 = text("After we have finished implementing all the grammars, now let's return the value of the json, which is return by the ");
			code48 = element("code");
			t249 = text("parseValue");
			t250 = text(":");
			t251 = space();
			pre11 = element("pre");
			t252 = space();
			p42 = element("p");
			t253 = text("That's it!");
			t254 = space();
			p43 = element("p");
			t255 = text("Well, not so fast my friend, we've just finished the happy path, what about unhappy path?");
			t256 = space();
			section3 = element("section");
			h22 = element("h2");
			a21 = element("a");
			t257 = text("Handling the unexpected input");
			t258 = space();
			p44 = element("p");
			t259 = text("As a good developer, we need to handle the unhappy path gracefully as well. For a parser, that means shouting at the developer with appropriate error message.");
			t260 = space();
			p45 = element("p");
			t261 = text("Let's handle the 2 most common error cases:");
			t262 = space();
			ul10 = element("ul");
			li23 = element("li");
			t263 = text("Unexpected token");
			t264 = space();
			li24 = element("li");
			t265 = text("Unexpected end of string");
			t266 = space();
			section4 = element("section");
			h30 = element("h3");
			a22 = element("a");
			t267 = text("Unexpected token");
			t268 = space();
			section5 = element("section");
			h31 = element("h3");
			a23 = element("a");
			t269 = text("Unexpected end of string");
			t270 = space();
			p46 = element("p");
			t271 = text("In all the while loops, for example the while loop in ");
			code49 = element("code");
			t272 = text("parseObject");
			t273 = text(":");
			t274 = space();
			pre12 = element("pre");
			t275 = space();
			p47 = element("p");
			t276 = text("We need to make sure that we don't access the character beyond the length of the string. This happens when the string ended unexpectedly, while we are still waiting for a closing character, \"}\" in this example:");
			t277 = space();
			pre13 = element("pre");
			t278 = space();
			section6 = element("section");
			h23 = element("h2");
			a24 = element("a");
			t279 = text("Going the extra mile");
			t280 = space();
			p48 = element("p");
			t281 = text("Do you remember the time you were a junior developer, every time when you encounter Syntax error with cryptic messages, you are completely clueless of what went wrong?");
			t282 = space();
			p49 = element("p");
			t283 = text("Now you are more experienced, it is time to stop this virtuous cycle and stop yelling");
			t284 = space();
			pre14 = element("pre");
			t285 = space();
			p50 = element("p");
			t286 = text("and leave the user staring at the screen confounded.");
			t287 = space();
			p51 = element("p");
			t288 = text("There's a lot of better ways of handling error messages than yelling, here are some points you can consider adding to your parser:");
			t289 = space();
			section7 = element("section");
			h32 = element("h3");
			a25 = element("a");
			t290 = text("Error code and standard error message");
			t291 = space();
			p52 = element("p");
			t292 = text("This is useful as a standard keyword for user to Google for help.");
			t293 = space();
			pre15 = element("pre");
			t294 = space();
			section8 = element("section");
			h33 = element("h3");
			a26 = element("a");
			t295 = text("A better view of what went wrong");
			t296 = space();
			p53 = element("p");
			t297 = text("Parser like Babel, will show you a code frame, a snippet of your code with underline, arrow or highlighting of what went wrong");
			t298 = space();
			pre16 = element("pre");
			t299 = space();
			p54 = element("p");
			t300 = text("An example on how you can print out the code snippet:");
			t301 = space();
			pre17 = element("pre");
			t302 = space();
			section9 = element("section");
			h34 = element("h3");
			a27 = element("a");
			t303 = text("Suggestions for error recovery");
			t304 = space();
			p55 = element("p");
			t305 = text("If possible, explain what went wrong and give suggestions on how to fix them");
			t306 = space();
			pre18 = element("pre");
			t307 = space();
			p56 = element("p");
			t308 = text("If possible, provide suggestions based on the context that the parser has collected so far");
			t309 = space();
			pre19 = element("pre");
			t310 = space();
			p57 = element("p");
			t311 = text("The suggestion that based on the context will feel more relatable and actionable.");
			t312 = space();
			p58 = element("p");
			t313 = text("With all the suggestions in mind, check out the updated CodeSandbox with");
			t314 = space();
			ul11 = element("ul");
			li25 = element("li");
			t315 = text("Meaningful error message");
			t316 = space();
			li26 = element("li");
			t317 = text("Code snippet with error pointing point of failure");
			t318 = space();
			li27 = element("li");
			t319 = text("Provide suggestions for error recovery");
			t320 = space();
			iframe1 = element("iframe");
			t321 = space();
			p59 = element("p");
			t322 = text("Also, read the ");
			a28 = element("a");
			t323 = text("\"Compiler Errors for Humans\"");
			t324 = text(" by ");
			a29 = element("a");
			t325 = text("Evan Czaplicki");
			t326 = text(" for how Elm improves the UX problems of the Elm compiler.");
			t327 = space();
			section10 = element("section");
			h24 = element("h2");
			a30 = element("a");
			t328 = text("Summary");
			t329 = space();
			p60 = element("p");
			t330 = text("To implement a parser, you need to start with the grammar.");
			t331 = space();
			p61 = element("p");
			t332 = text("You can formalise the grammar with the railroad diagrams or the Backus-Naur Form. Designing the grammar is the hardest step.");
			t333 = space();
			p62 = element("p");
			t334 = text("Once you've settled with the grammar, you can start implementing the parser based on it.");
			t335 = space();
			p63 = element("p");
			t336 = text("Error handling is important, what's more important is to have meaningful error messages, so that the user knows how to fix it.");
			t337 = space();
			p64 = element("p");
			t338 = text("Now you know how a simple parser is implemented, it's time to set eyes on a more complex one:");
			t339 = space();
			ul12 = element("ul");
			li28 = element("li");
			a31 = element("a");
			t340 = text("Babel parser");
			t341 = space();
			li29 = element("li");
			a32 = element("a");
			t342 = text("Svelte parser");
			t343 = space();
			p65 = element("p");
			t344 = text("Lastly, do follow ");
			a33 = element("a");
			t345 = text("@cassidoo");
			t346 = text(", her weekly newsletter is awesome!");
			this.h();
		},
		l(nodes) {
			section0 = claim_element(nodes, "SECTION", {});
			var section0_nodes = children(section0);

			ul2 = claim_element(section0_nodes, "UL", {
				class: true,
				id: true,
				role: true,
				"aria-label": true
			});

			var ul2_nodes = children(ul2);
			li0 = claim_element(ul2_nodes, "LI", {});
			var li0_nodes = children(li0);
			a0 = claim_element(li0_nodes, "A", { href: true });
			var a0_nodes = children(a0);
			t0 = claim_text(a0_nodes, "Understand the grammar");
			a0_nodes.forEach(detach);
			li0_nodes.forEach(detach);
			li1 = claim_element(ul2_nodes, "LI", {});
			var li1_nodes = children(li1);
			a1 = claim_element(li1_nodes, "A", { href: true });
			var a1_nodes = children(a1);
			t1 = claim_text(a1_nodes, "Implementing the parser");
			a1_nodes.forEach(detach);
			li1_nodes.forEach(detach);
			li2 = claim_element(ul2_nodes, "LI", {});
			var li2_nodes = children(li2);
			a2 = claim_element(li2_nodes, "A", { href: true });
			var a2_nodes = children(a2);
			t2 = claim_text(a2_nodes, "Handling the unexpected input");
			a2_nodes.forEach(detach);
			li2_nodes.forEach(detach);
			ul0 = claim_element(ul2_nodes, "UL", {});
			var ul0_nodes = children(ul0);
			li3 = claim_element(ul0_nodes, "LI", {});
			var li3_nodes = children(li3);
			a3 = claim_element(li3_nodes, "A", { href: true });
			var a3_nodes = children(a3);
			t3 = claim_text(a3_nodes, "Unexpected token");
			a3_nodes.forEach(detach);
			li3_nodes.forEach(detach);
			li4 = claim_element(ul0_nodes, "LI", {});
			var li4_nodes = children(li4);
			a4 = claim_element(li4_nodes, "A", { href: true });
			var a4_nodes = children(a4);
			t4 = claim_text(a4_nodes, "Unexpected end of string");
			a4_nodes.forEach(detach);
			li4_nodes.forEach(detach);
			ul0_nodes.forEach(detach);
			li5 = claim_element(ul2_nodes, "LI", {});
			var li5_nodes = children(li5);
			a5 = claim_element(li5_nodes, "A", { href: true });
			var a5_nodes = children(a5);
			t5 = claim_text(a5_nodes, "Going the extra mile");
			a5_nodes.forEach(detach);
			li5_nodes.forEach(detach);
			ul1 = claim_element(ul2_nodes, "UL", {});
			var ul1_nodes = children(ul1);
			li6 = claim_element(ul1_nodes, "LI", {});
			var li6_nodes = children(li6);
			a6 = claim_element(li6_nodes, "A", { href: true });
			var a6_nodes = children(a6);
			t6 = claim_text(a6_nodes, "Error code and standard error message");
			a6_nodes.forEach(detach);
			li6_nodes.forEach(detach);
			li7 = claim_element(ul1_nodes, "LI", {});
			var li7_nodes = children(li7);
			a7 = claim_element(li7_nodes, "A", { href: true });
			var a7_nodes = children(a7);
			t7 = claim_text(a7_nodes, "A better view of what went wrong");
			a7_nodes.forEach(detach);
			li7_nodes.forEach(detach);
			li8 = claim_element(ul1_nodes, "LI", {});
			var li8_nodes = children(li8);
			a8 = claim_element(li8_nodes, "A", { href: true });
			var a8_nodes = children(a8);
			t8 = claim_text(a8_nodes, "Suggestions for error recovery");
			a8_nodes.forEach(detach);
			li8_nodes.forEach(detach);
			ul1_nodes.forEach(detach);
			li9 = claim_element(ul2_nodes, "LI", {});
			var li9_nodes = children(li9);
			a9 = claim_element(li9_nodes, "A", { href: true });
			var a9_nodes = children(a9);
			t9 = claim_text(a9_nodes, "Summary");
			a9_nodes.forEach(detach);
			li9_nodes.forEach(detach);
			ul2_nodes.forEach(detach);
			section0_nodes.forEach(detach);
			t10 = claim_space(nodes);
			p0 = claim_element(nodes, "P", {});
			var p0_nodes = children(p0);
			t11 = claim_text(p0_nodes, "The interview question of the week for this week on Cassidoo's weekly newsletter is,");
			p0_nodes.forEach(detach);
			t12 = claim_space(nodes);
			blockquote = claim_element(nodes, "BLOCKQUOTE", {});
			var blockquote_nodes = children(blockquote);
			p1 = claim_element(blockquote_nodes, "P", {});
			var p1_nodes = children(p1);
			t13 = claim_text(p1_nodes, "Write a function that takes in a string of valid JSON and converts it to an object (or whatever your chosen language uses, dicts, maps, etc).\nExample input:");
			p1_nodes.forEach(detach);
			blockquote_nodes.forEach(detach);
			t14 = claim_space(nodes);
			pre0 = claim_element(nodes, "PRE", { class: true });
			var pre0_nodes = children(pre0);
			pre0_nodes.forEach(detach);
			t15 = claim_space(nodes);
			p2 = claim_element(nodes, "P", {});
			var p2_nodes = children(p2);
			t16 = claim_text(p2_nodes, "At one point, I was tempted to just to write:");
			p2_nodes.forEach(detach);
			t17 = claim_space(nodes);
			pre1 = claim_element(nodes, "PRE", { class: true });
			var pre1_nodes = children(pre1);
			pre1_nodes.forEach(detach);
			t18 = claim_space(nodes);
			p3 = claim_element(nodes, "P", {});
			var p3_nodes = children(p3);
			t19 = claim_text(p3_nodes, "But, I thought, I've written quite a few articles about AST:");
			p3_nodes.forEach(detach);
			t20 = claim_space(nodes);
			ul3 = claim_element(nodes, "UL", {});
			var ul3_nodes = children(ul3);
			li10 = claim_element(ul3_nodes, "LI", {});
			var li10_nodes = children(li10);
			a10 = claim_element(li10_nodes, "A", { href: true });
			var a10_nodes = children(a10);
			t21 = claim_text(a10_nodes, "Creating custom JavaScript syntax with Babel");
			a10_nodes.forEach(detach);
			li10_nodes.forEach(detach);
			t22 = claim_space(ul3_nodes);
			li11 = claim_element(ul3_nodes, "LI", {});
			var li11_nodes = children(li11);
			a11 = claim_element(li11_nodes, "A", { href: true });
			var a11_nodes = children(a11);
			t23 = claim_text(a11_nodes, "Step-by-step guide for writing a custom babel transformation");
			a11_nodes.forEach(detach);
			li11_nodes.forEach(detach);
			t24 = claim_space(ul3_nodes);
			li12 = claim_element(ul3_nodes, "LI", {});
			var li12_nodes = children(li12);
			a12 = claim_element(li12_nodes, "A", { href: true });
			var a12_nodes = children(a12);
			t25 = claim_text(a12_nodes, "Manipulating AST with JavaScript");
			a12_nodes.forEach(detach);
			li12_nodes.forEach(detach);
			ul3_nodes.forEach(detach);
			t26 = claim_space(nodes);
			p4 = claim_element(nodes, "P", {});
			var p4_nodes = children(p4);
			t27 = claim_text(p4_nodes, "which covers the overview of the compiler pipeline, as well as how to manipulate AST, but I haven't covered much on how to implement a parser.");
			p4_nodes.forEach(detach);
			t28 = claim_space(nodes);
			p5 = claim_element(nodes, "P", {});
			var p5_nodes = children(p5);
			t29 = claim_text(p5_nodes, "That's because, implementing a JavaScript compiler in an article is a task too daunting for me.");
			p5_nodes.forEach(detach);
			t30 = claim_space(nodes);
			p6 = claim_element(nodes, "P", {});
			var p6_nodes = children(p6);
			t31 = claim_text(p6_nodes, "Well, fret not. JSON is also a language. It has its own grammar, which you can refer from ");
			a13 = claim_element(p6_nodes, "A", { href: true, rel: true });
			var a13_nodes = children(a13);
			t32 = claim_text(a13_nodes, "the specifications");
			a13_nodes.forEach(detach);
			t33 = claim_text(p6_nodes, ". The knowledge and technique you need to write a JSON parser is transferrable to writing a JS parser.");
			p6_nodes.forEach(detach);
			t34 = claim_space(nodes);
			p7 = claim_element(nodes, "P", {});
			var p7_nodes = children(p7);
			t35 = claim_text(p7_nodes, "So, let's start writing a JSON parser!");
			p7_nodes.forEach(detach);
			t36 = claim_space(nodes);
			section1 = claim_element(nodes, "SECTION", {});
			var section1_nodes = children(section1);
			h20 = claim_element(section1_nodes, "H2", {});
			var h20_nodes = children(h20);
			a14 = claim_element(h20_nodes, "A", { href: true, id: true });
			var a14_nodes = children(a14);
			t37 = claim_text(a14_nodes, "Understand the grammar");
			a14_nodes.forEach(detach);
			h20_nodes.forEach(detach);
			t38 = claim_space(section1_nodes);
			p8 = claim_element(section1_nodes, "P", {});
			var p8_nodes = children(p8);
			t39 = claim_text(p8_nodes, "If you look at ");
			a15 = claim_element(p8_nodes, "A", { href: true, rel: true });
			var a15_nodes = children(a15);
			t40 = claim_text(a15_nodes, "the specification page");
			a15_nodes.forEach(detach);
			t41 = claim_text(p8_nodes, ", there's 2 diagrams:");
			p8_nodes.forEach(detach);
			t42 = claim_space(section1_nodes);
			ul4 = claim_element(section1_nodes, "UL", {});
			var ul4_nodes = children(ul4);
			li13 = claim_element(ul4_nodes, "LI", {});
			var li13_nodes = children(li13);
			a16 = claim_element(li13_nodes, "A", { href: true, rel: true });
			var a16_nodes = children(a16);
			t43 = claim_text(a16_nodes, "The syntax diagram (or railroad diagram)");
			a16_nodes.forEach(detach);
			t44 = claim_text(li13_nodes, " on the left,");
			li13_nodes.forEach(detach);
			ul4_nodes.forEach(detach);
			t45 = claim_space(section1_nodes);
			p9 = claim_element(section1_nodes, "P", {});
			var p9_nodes = children(p9);
			img0 = claim_element(p9_nodes, "IMG", { src: true, alt: true });
			p9_nodes.forEach(detach);
			t46 = claim_space(section1_nodes);
			small0 = claim_element(section1_nodes, "SMALL", {});
			var small0_nodes = children(small0);
			t47 = claim_text(small0_nodes, "Image source: https://www.json.org/img/object.png");
			small0_nodes.forEach(detach);
			t48 = claim_space(section1_nodes);
			ul5 = claim_element(section1_nodes, "UL", {});
			var ul5_nodes = children(ul5);
			li14 = claim_element(ul5_nodes, "LI", {});
			var li14_nodes = children(li14);
			a17 = claim_element(li14_nodes, "A", { href: true, rel: true });
			var a17_nodes = children(a17);
			t49 = claim_text(a17_nodes, "The McKeeman Form");
			a17_nodes.forEach(detach);
			t50 = claim_text(li14_nodes, ", a variant of ");
			a18 = claim_element(li14_nodes, "A", { href: true, rel: true });
			var a18_nodes = children(a18);
			t51 = claim_text(a18_nodes, "Backus-Naur Form (BNF)");
			a18_nodes.forEach(detach);
			t52 = claim_text(li14_nodes, ", on the right");
			li14_nodes.forEach(detach);
			ul5_nodes.forEach(detach);
			t53 = claim_space(section1_nodes);
			pre2 = claim_element(section1_nodes, "PRE", { class: true });
			var pre2_nodes = children(pre2);
			pre2_nodes.forEach(detach);
			t54 = claim_space(section1_nodes);
			p10 = claim_element(section1_nodes, "P", {});
			var p10_nodes = children(p10);
			t55 = claim_text(p10_nodes, "Both diagrams are equivalent.");
			p10_nodes.forEach(detach);
			t56 = claim_space(section1_nodes);
			p11 = claim_element(section1_nodes, "P", {});
			var p11_nodes = children(p11);
			t57 = claim_text(p11_nodes, "One is visual and one is text based. The text based grammar syntax, Backus-Naur Form, is usually fed to another parser that parse this grammar and generate a parser for it. Speaking of parser-ception! 🤯");
			p11_nodes.forEach(detach);
			t58 = claim_space(section1_nodes);
			p12 = claim_element(section1_nodes, "P", {});
			var p12_nodes = children(p12);
			t59 = claim_text(p12_nodes, "In this article, we will focus on the railroad diagram, because it is visual and seemed to be more friendly to me.");
			p12_nodes.forEach(detach);
			t60 = claim_space(section1_nodes);
			p13 = claim_element(section1_nodes, "P", {});
			var p13_nodes = children(p13);
			t61 = claim_text(p13_nodes, "Lets' look at the first railroad diagram:");
			p13_nodes.forEach(detach);
			t62 = claim_space(section1_nodes);
			p14 = claim_element(section1_nodes, "P", {});
			var p14_nodes = children(p14);
			img1 = claim_element(p14_nodes, "IMG", { src: true, alt: true });
			p14_nodes.forEach(detach);
			t63 = claim_space(section1_nodes);
			small1 = claim_element(section1_nodes, "SMALL", {});
			var small1_nodes = children(small1);
			t64 = claim_text(small1_nodes, "Image source: https://www.json.org/img/object.png");
			small1_nodes.forEach(detach);
			t65 = claim_space(section1_nodes);
			p15 = claim_element(section1_nodes, "P", {});
			var p15_nodes = children(p15);
			t66 = claim_text(p15_nodes, "So this is the grammar for ");
			strong0 = claim_element(p15_nodes, "STRONG", {});
			var strong0_nodes = children(strong0);
			t67 = claim_text(strong0_nodes, "\"object\"");
			strong0_nodes.forEach(detach);
			t68 = claim_text(p15_nodes, " in JSON.");
			p15_nodes.forEach(detach);
			t69 = claim_space(section1_nodes);
			p16 = claim_element(section1_nodes, "P", {});
			var p16_nodes = children(p16);
			t70 = claim_text(p16_nodes, "We start from the left, following the arrow, and then we end at the right.");
			p16_nodes.forEach(detach);
			t71 = claim_space(section1_nodes);
			p17 = claim_element(section1_nodes, "P", {});
			var p17_nodes = children(p17);
			t72 = claim_text(p17_nodes, "The circles, eg ");
			code0 = claim_element(p17_nodes, "CODE", {});
			var code0_nodes = children(code0);
			t73 = claim_text(code0_nodes, "{");
			code0_nodes.forEach(detach);
			t74 = claim_text(p17_nodes, ", ");
			code1 = claim_element(p17_nodes, "CODE", {});
			var code1_nodes = children(code1);
			t75 = claim_text(code1_nodes, ",");
			code1_nodes.forEach(detach);
			t76 = claim_text(p17_nodes, ", ");
			code2 = claim_element(p17_nodes, "CODE", {});
			var code2_nodes = children(code2);
			t77 = claim_text(code2_nodes, ":");
			code2_nodes.forEach(detach);
			t78 = claim_text(p17_nodes, ", ");
			code3 = claim_element(p17_nodes, "CODE", {});
			var code3_nodes = children(code3);
			t79 = claim_text(code3_nodes, "}");
			code3_nodes.forEach(detach);
			t80 = claim_text(p17_nodes, ", are the characters, and the boxes eg: ");
			code4 = claim_element(p17_nodes, "CODE", {});
			var code4_nodes = children(code4);
			t81 = claim_text(code4_nodes, "whitespace");
			code4_nodes.forEach(detach);
			t82 = claim_text(p17_nodes, ", ");
			code5 = claim_element(p17_nodes, "CODE", {});
			var code5_nodes = children(code5);
			t83 = claim_text(code5_nodes, "string");
			code5_nodes.forEach(detach);
			t84 = claim_text(p17_nodes, ", and ");
			code6 = claim_element(p17_nodes, "CODE", {});
			var code6_nodes = children(code6);
			t85 = claim_text(code6_nodes, "value");
			code6_nodes.forEach(detach);
			t86 = claim_text(p17_nodes, " is a placeholder for another grammar. So to parse the \"whitespace\", we will need to look at the grammar for ");
			strong1 = claim_element(p17_nodes, "STRONG", {});
			var strong1_nodes = children(strong1);
			t87 = claim_text(strong1_nodes, "\"whitepsace\"");
			strong1_nodes.forEach(detach);
			t88 = claim_text(p17_nodes, ".");
			p17_nodes.forEach(detach);
			t89 = claim_space(section1_nodes);
			p18 = claim_element(section1_nodes, "P", {});
			var p18_nodes = children(p18);
			t90 = claim_text(p18_nodes, "So, starting from the left, for an object, the first character has to be an open curly bracket, ");
			code7 = claim_element(p18_nodes, "CODE", {});
			var code7_nodes = children(code7);
			t91 = claim_text(code7_nodes, "{");
			code7_nodes.forEach(detach);
			t92 = claim_text(p18_nodes, ". and then we have 2 options from here:");
			p18_nodes.forEach(detach);
			t93 = claim_space(section1_nodes);
			ul6 = claim_element(section1_nodes, "UL", {});
			var ul6_nodes = children(ul6);
			li15 = claim_element(ul6_nodes, "LI", {});
			var li15_nodes = children(li15);
			code8 = claim_element(li15_nodes, "CODE", {});
			var code8_nodes = children(code8);
			t94 = claim_text(code8_nodes, "whitespace");
			code8_nodes.forEach(detach);
			t95 = claim_text(li15_nodes, " → ");
			code9 = claim_element(li15_nodes, "CODE", {});
			var code9_nodes = children(code9);
			t96 = claim_text(code9_nodes, "}");
			code9_nodes.forEach(detach);
			t97 = claim_text(li15_nodes, " → end, or");
			li15_nodes.forEach(detach);
			t98 = claim_space(ul6_nodes);
			li16 = claim_element(ul6_nodes, "LI", {});
			var li16_nodes = children(li16);
			code10 = claim_element(li16_nodes, "CODE", {});
			var code10_nodes = children(code10);
			t99 = claim_text(code10_nodes, "whitespace");
			code10_nodes.forEach(detach);
			t100 = claim_text(li16_nodes, " → ");
			code11 = claim_element(li16_nodes, "CODE", {});
			var code11_nodes = children(code11);
			t101 = claim_text(code11_nodes, "string");
			code11_nodes.forEach(detach);
			t102 = claim_text(li16_nodes, " → ");
			code12 = claim_element(li16_nodes, "CODE", {});
			var code12_nodes = children(code12);
			t103 = claim_text(code12_nodes, "whitespace");
			code12_nodes.forEach(detach);
			t104 = claim_text(li16_nodes, " → ");
			code13 = claim_element(li16_nodes, "CODE", {});
			var code13_nodes = children(code13);
			t105 = claim_text(code13_nodes, ":");
			code13_nodes.forEach(detach);
			t106 = claim_text(li16_nodes, " → ");
			code14 = claim_element(li16_nodes, "CODE", {});
			var code14_nodes = children(code14);
			t107 = claim_text(code14_nodes, "value");
			code14_nodes.forEach(detach);
			t108 = claim_text(li16_nodes, " → ");
			code15 = claim_element(li16_nodes, "CODE", {});
			var code15_nodes = children(code15);
			t109 = claim_text(code15_nodes, "}");
			code15_nodes.forEach(detach);
			t110 = claim_text(li16_nodes, " → end");
			li16_nodes.forEach(detach);
			ul6_nodes.forEach(detach);
			t111 = claim_space(section1_nodes);
			p19 = claim_element(section1_nodes, "P", {});
			var p19_nodes = children(p19);
			t112 = claim_text(p19_nodes, "Of course, when you reach \"value\", you can choose to go to:");
			p19_nodes.forEach(detach);
			t113 = claim_space(section1_nodes);
			ul7 = claim_element(section1_nodes, "UL", {});
			var ul7_nodes = children(ul7);
			li17 = claim_element(ul7_nodes, "LI", {});
			var li17_nodes = children(li17);
			t114 = claim_text(li17_nodes, "→ ");
			code16 = claim_element(li17_nodes, "CODE", {});
			var code16_nodes = children(code16);
			t115 = claim_text(code16_nodes, "}");
			code16_nodes.forEach(detach);
			t116 = claim_text(li17_nodes, " → end, or");
			li17_nodes.forEach(detach);
			t117 = claim_space(ul7_nodes);
			li18 = claim_element(ul7_nodes, "LI", {});
			var li18_nodes = children(li18);
			t118 = claim_text(li18_nodes, "→ ");
			code17 = claim_element(li18_nodes, "CODE", {});
			var code17_nodes = children(code17);
			t119 = claim_text(code17_nodes, ",");
			code17_nodes.forEach(detach);
			t120 = claim_text(li18_nodes, " → ");
			code18 = claim_element(li18_nodes, "CODE", {});
			var code18_nodes = children(code18);
			t121 = claim_text(code18_nodes, "whitespace");
			code18_nodes.forEach(detach);
			t122 = claim_text(li18_nodes, " → ... → value");
			li18_nodes.forEach(detach);
			ul7_nodes.forEach(detach);
			t123 = claim_space(section1_nodes);
			p20 = claim_element(section1_nodes, "P", {});
			var p20_nodes = children(p20);
			t124 = claim_text(p20_nodes, "and you can keep looping, until you decide to go to:");
			p20_nodes.forEach(detach);
			t125 = claim_space(section1_nodes);
			ul8 = claim_element(section1_nodes, "UL", {});
			var ul8_nodes = children(ul8);
			li19 = claim_element(ul8_nodes, "LI", {});
			var li19_nodes = children(li19);
			t126 = claim_text(li19_nodes, "→ ");
			code19 = claim_element(li19_nodes, "CODE", {});
			var code19_nodes = children(code19);
			t127 = claim_text(code19_nodes, "}");
			code19_nodes.forEach(detach);
			t128 = claim_text(li19_nodes, " → end.");
			li19_nodes.forEach(detach);
			ul8_nodes.forEach(detach);
			t129 = claim_space(section1_nodes);
			p21 = claim_element(section1_nodes, "P", {});
			var p21_nodes = children(p21);
			t130 = claim_text(p21_nodes, "So, I guess we are now acquainted with the railroad diagram, let's carry on to the next section.");
			p21_nodes.forEach(detach);
			section1_nodes.forEach(detach);
			t131 = claim_space(nodes);
			section2 = claim_element(nodes, "SECTION", {});
			var section2_nodes = children(section2);
			h21 = claim_element(section2_nodes, "H2", {});
			var h21_nodes = children(h21);
			a19 = claim_element(h21_nodes, "A", { href: true, id: true });
			var a19_nodes = children(a19);
			t132 = claim_text(a19_nodes, "Implementing the parser");
			a19_nodes.forEach(detach);
			h21_nodes.forEach(detach);
			t133 = claim_space(section2_nodes);
			p22 = claim_element(section2_nodes, "P", {});
			var p22_nodes = children(p22);
			t134 = claim_text(p22_nodes, "Let's start with the following structure:");
			p22_nodes.forEach(detach);
			t135 = claim_space(section2_nodes);
			pre3 = claim_element(section2_nodes, "PRE", { class: true });
			var pre3_nodes = children(pre3);
			pre3_nodes.forEach(detach);
			t136 = claim_space(section2_nodes);
			p23 = claim_element(section2_nodes, "P", {});
			var p23_nodes = children(p23);
			t137 = claim_text(p23_nodes, "We initialise ");
			code20 = claim_element(p23_nodes, "CODE", {});
			var code20_nodes = children(code20);
			t138 = claim_text(code20_nodes, "i");
			code20_nodes.forEach(detach);
			t139 = claim_text(p23_nodes, " as the index for the current character, we will end as soon as ");
			code21 = claim_element(p23_nodes, "CODE", {});
			var code21_nodes = children(code21);
			t140 = claim_text(code21_nodes, "i");
			code21_nodes.forEach(detach);
			t141 = claim_text(p23_nodes, " reaches the end of the ");
			code22 = claim_element(p23_nodes, "CODE", {});
			var code22_nodes = children(code22);
			t142 = claim_text(code22_nodes, "str");
			code22_nodes.forEach(detach);
			t143 = claim_text(p23_nodes, ".");
			p23_nodes.forEach(detach);
			t144 = claim_space(section2_nodes);
			p24 = claim_element(section2_nodes, "P", {});
			var p24_nodes = children(p24);
			t145 = claim_text(p24_nodes, "Let's implement the grammar for the ");
			strong2 = claim_element(p24_nodes, "STRONG", {});
			var strong2_nodes = children(strong2);
			t146 = claim_text(strong2_nodes, "\"object\":");
			strong2_nodes.forEach(detach);
			p24_nodes.forEach(detach);
			t147 = claim_space(section2_nodes);
			pre4 = claim_element(section2_nodes, "PRE", { class: true });
			var pre4_nodes = children(pre4);
			pre4_nodes.forEach(detach);
			t148 = claim_space(section2_nodes);
			p25 = claim_element(section2_nodes, "P", {});
			var p25_nodes = children(p25);
			t149 = claim_text(p25_nodes, "In the ");
			code23 = claim_element(p25_nodes, "CODE", {});
			var code23_nodes = children(code23);
			t150 = claim_text(code23_nodes, "parseObject");
			code23_nodes.forEach(detach);
			t151 = claim_text(p25_nodes, ", we will call parse of other grammars, like \"string\" and \"whitespace\", when we implement them, everything will work 🤞.");
			p25_nodes.forEach(detach);
			t152 = claim_space(section2_nodes);
			p26 = claim_element(section2_nodes, "P", {});
			var p26_nodes = children(p26);
			t153 = claim_text(p26_nodes, "One thing that I forgot to add is the comma, ");
			code24 = claim_element(p26_nodes, "CODE", {});
			var code24_nodes = children(code24);
			t154 = claim_text(code24_nodes, ",");
			code24_nodes.forEach(detach);
			t155 = claim_text(p26_nodes, ". The ");
			code25 = claim_element(p26_nodes, "CODE", {});
			var code25_nodes = children(code25);
			t156 = claim_text(code25_nodes, ",");
			code25_nodes.forEach(detach);
			t157 = claim_text(p26_nodes, " only appears before we start the second loop of ");
			code26 = claim_element(p26_nodes, "CODE", {});
			var code26_nodes = children(code26);
			t158 = claim_text(code26_nodes, "whitespace");
			code26_nodes.forEach(detach);
			t159 = claim_text(p26_nodes, " → ");
			code27 = claim_element(p26_nodes, "CODE", {});
			var code27_nodes = children(code27);
			t160 = claim_text(code27_nodes, "string");
			code27_nodes.forEach(detach);
			t161 = claim_text(p26_nodes, " → ");
			code28 = claim_element(p26_nodes, "CODE", {});
			var code28_nodes = children(code28);
			t162 = claim_text(code28_nodes, "whitespace");
			code28_nodes.forEach(detach);
			t163 = claim_text(p26_nodes, " → ");
			code29 = claim_element(p26_nodes, "CODE", {});
			var code29_nodes = children(code29);
			t164 = claim_text(code29_nodes, ":");
			code29_nodes.forEach(detach);
			t165 = claim_text(p26_nodes, " → ...");
			p26_nodes.forEach(detach);
			t166 = claim_space(section2_nodes);
			p27 = claim_element(section2_nodes, "P", {});
			var p27_nodes = children(p27);
			t167 = claim_text(p27_nodes, "Based on that, we add the following lines:");
			p27_nodes.forEach(detach);
			t168 = claim_space(section2_nodes);
			pre5 = claim_element(section2_nodes, "PRE", { class: true });
			var pre5_nodes = children(pre5);
			pre5_nodes.forEach(detach);
			t169 = claim_space(section2_nodes);
			p28 = claim_element(section2_nodes, "P", {});
			var p28_nodes = children(p28);
			t170 = claim_text(p28_nodes, "Some naming convention:");
			p28_nodes.forEach(detach);
			t171 = claim_space(section2_nodes);
			ul9 = claim_element(section2_nodes, "UL", {});
			var ul9_nodes = children(ul9);
			li20 = claim_element(ul9_nodes, "LI", {});
			var li20_nodes = children(li20);
			t172 = claim_text(li20_nodes, "We call ");
			code30 = claim_element(li20_nodes, "CODE", {});
			var code30_nodes = children(code30);
			t173 = claim_text(code30_nodes, "parseSomething");
			code30_nodes.forEach(detach);
			t174 = claim_text(li20_nodes, ", when we parse the code based on grammar and use the return value");
			li20_nodes.forEach(detach);
			t175 = claim_space(ul9_nodes);
			li21 = claim_element(ul9_nodes, "LI", {});
			var li21_nodes = children(li21);
			t176 = claim_text(li21_nodes, "We call ");
			code31 = claim_element(li21_nodes, "CODE", {});
			var code31_nodes = children(code31);
			t177 = claim_text(code31_nodes, "eatSomething");
			code31_nodes.forEach(detach);
			t178 = claim_text(li21_nodes, ", when we expect the character(s) to be there, but we are not using the character(s)");
			li21_nodes.forEach(detach);
			t179 = claim_space(ul9_nodes);
			li22 = claim_element(ul9_nodes, "LI", {});
			var li22_nodes = children(li22);
			t180 = claim_text(li22_nodes, "We call ");
			code32 = claim_element(li22_nodes, "CODE", {});
			var code32_nodes = children(code32);
			t181 = claim_text(code32_nodes, "skipSomething");
			code32_nodes.forEach(detach);
			t182 = claim_text(li22_nodes, ", when we are okay if the character(s) is not there.");
			li22_nodes.forEach(detach);
			ul9_nodes.forEach(detach);
			t183 = claim_space(section2_nodes);
			p29 = claim_element(section2_nodes, "P", {});
			var p29_nodes = children(p29);
			t184 = claim_text(p29_nodes, "Let's implement the ");
			code33 = claim_element(p29_nodes, "CODE", {});
			var code33_nodes = children(code33);
			t185 = claim_text(code33_nodes, "eatComma");
			code33_nodes.forEach(detach);
			t186 = claim_text(p29_nodes, " and ");
			code34 = claim_element(p29_nodes, "CODE", {});
			var code34_nodes = children(code34);
			t187 = claim_text(code34_nodes, "eatColon");
			code34_nodes.forEach(detach);
			t188 = claim_text(p29_nodes, ":");
			p29_nodes.forEach(detach);
			t189 = claim_space(section2_nodes);
			pre6 = claim_element(section2_nodes, "PRE", { class: true });
			var pre6_nodes = children(pre6);
			pre6_nodes.forEach(detach);
			t190 = claim_space(section2_nodes);
			p30 = claim_element(section2_nodes, "P", {});
			var p30_nodes = children(p30);
			t191 = claim_text(p30_nodes, "So we have finished implemented the ");
			code35 = claim_element(p30_nodes, "CODE", {});
			var code35_nodes = children(code35);
			t192 = claim_text(code35_nodes, "parseObject");
			code35_nodes.forEach(detach);
			t193 = claim_text(p30_nodes, " grammar, but what is the return value from this parse function?");
			p30_nodes.forEach(detach);
			t194 = claim_space(section2_nodes);
			p31 = claim_element(section2_nodes, "P", {});
			var p31_nodes = children(p31);
			t195 = claim_text(p31_nodes, "Well, we need to return a JavaScript object:");
			p31_nodes.forEach(detach);
			t196 = claim_space(section2_nodes);
			pre7 = claim_element(section2_nodes, "PRE", { class: true });
			var pre7_nodes = children(pre7);
			pre7_nodes.forEach(detach);
			t197 = claim_space(section2_nodes);
			p32 = claim_element(section2_nodes, "P", {});
			var p32_nodes = children(p32);
			t198 = claim_text(p32_nodes, "Now that you've seen me implementing the \"object\" grammar, it's time for you to try out the \"array\" grammar:");
			p32_nodes.forEach(detach);
			t199 = claim_space(section2_nodes);
			p33 = claim_element(section2_nodes, "P", {});
			var p33_nodes = children(p33);
			img2 = claim_element(p33_nodes, "IMG", { src: true, alt: true });
			p33_nodes.forEach(detach);
			t200 = claim_space(section2_nodes);
			small2 = claim_element(section2_nodes, "SMALL", {});
			var small2_nodes = children(small2);
			t201 = claim_text(small2_nodes, "Image source: https://www.json.org/img/array.png");
			small2_nodes.forEach(detach);
			t202 = claim_space(section2_nodes);
			pre8 = claim_element(section2_nodes, "PRE", { class: true });
			var pre8_nodes = children(pre8);
			pre8_nodes.forEach(detach);
			t203 = claim_space(section2_nodes);
			p34 = claim_element(section2_nodes, "P", {});
			var p34_nodes = children(p34);
			t204 = claim_text(p34_nodes, "Now, move on to a more interesting grammar, \"value\":");
			p34_nodes.forEach(detach);
			t205 = claim_space(section2_nodes);
			p35 = claim_element(section2_nodes, "P", {});
			var p35_nodes = children(p35);
			img3 = claim_element(p35_nodes, "IMG", { src: true, alt: true });
			p35_nodes.forEach(detach);
			t206 = claim_space(section2_nodes);
			small3 = claim_element(section2_nodes, "SMALL", {});
			var small3_nodes = children(small3);
			t207 = claim_text(small3_nodes, "Image source: https://www.json.org/img/value.png");
			small3_nodes.forEach(detach);
			t208 = claim_space(section2_nodes);
			p36 = claim_element(section2_nodes, "P", {});
			var p36_nodes = children(p36);
			t209 = claim_text(p36_nodes, "A value starts with \"whitespace\", then any of the following: \"string\", \"number\", \"object\", \"array\", \"true\", \"false\" or \"null\", and then end with a \"whitespace\":");
			p36_nodes.forEach(detach);
			t210 = claim_space(section2_nodes);
			pre9 = claim_element(section2_nodes, "PRE", { class: true });
			var pre9_nodes = children(pre9);
			pre9_nodes.forEach(detach);
			t211 = claim_space(section2_nodes);
			p37 = claim_element(section2_nodes, "P", {});
			var p37_nodes = children(p37);
			t212 = claim_text(p37_nodes, "The ");
			code36 = claim_element(p37_nodes, "CODE", {});
			var code36_nodes = children(code36);
			t213 = claim_text(code36_nodes, "??");
			code36_nodes.forEach(detach);
			t214 = claim_text(p37_nodes, " is called the ");
			a20 = claim_element(p37_nodes, "A", { href: true, rel: true });
			var a20_nodes = children(a20);
			t215 = claim_text(a20_nodes, "nullish coalescing operator");
			a20_nodes.forEach(detach);
			t216 = claim_text(p37_nodes, ", it is like the ");
			code37 = claim_element(p37_nodes, "CODE", {});
			var code37_nodes = children(code37);
			t217 = claim_text(code37_nodes, "||");
			code37_nodes.forEach(detach);
			t218 = claim_text(p37_nodes, " that we used to use for defaulting a value ");
			code38 = claim_element(p37_nodes, "CODE", {});
			var code38_nodes = children(code38);
			t219 = claim_text(code38_nodes, "foo || default");
			code38_nodes.forEach(detach);
			t220 = claim_text(p37_nodes, ", except that ");
			code39 = claim_element(p37_nodes, "CODE", {});
			var code39_nodes = children(code39);
			t221 = claim_text(code39_nodes, "||");
			code39_nodes.forEach(detach);
			t222 = claim_text(p37_nodes, " will return the ");
			code40 = claim_element(p37_nodes, "CODE", {});
			var code40_nodes = children(code40);
			t223 = claim_text(code40_nodes, "default");
			code40_nodes.forEach(detach);
			t224 = claim_text(p37_nodes, " as long as ");
			code41 = claim_element(p37_nodes, "CODE", {});
			var code41_nodes = children(code41);
			t225 = claim_text(code41_nodes, "foo");
			code41_nodes.forEach(detach);
			t226 = claim_text(p37_nodes, " is falsy, whereas the nullish coalescing operator will only return ");
			code42 = claim_element(p37_nodes, "CODE", {});
			var code42_nodes = children(code42);
			t227 = claim_text(code42_nodes, "default");
			code42_nodes.forEach(detach);
			t228 = claim_text(p37_nodes, " when ");
			code43 = claim_element(p37_nodes, "CODE", {});
			var code43_nodes = children(code43);
			t229 = claim_text(code43_nodes, "foo");
			code43_nodes.forEach(detach);
			t230 = claim_text(p37_nodes, " is either ");
			code44 = claim_element(p37_nodes, "CODE", {});
			var code44_nodes = children(code44);
			t231 = claim_text(code44_nodes, "null");
			code44_nodes.forEach(detach);
			t232 = claim_text(p37_nodes, " or ");
			code45 = claim_element(p37_nodes, "CODE", {});
			var code45_nodes = children(code45);
			t233 = claim_text(code45_nodes, "undefined");
			code45_nodes.forEach(detach);
			t234 = claim_text(p37_nodes, ".");
			p37_nodes.forEach(detach);
			t235 = claim_space(section2_nodes);
			p38 = claim_element(section2_nodes, "P", {});
			var p38_nodes = children(p38);
			t236 = claim_text(p38_nodes, "The parseKeyword will check whether the current ");
			code46 = claim_element(p38_nodes, "CODE", {});
			var code46_nodes = children(code46);
			t237 = claim_text(code46_nodes, "str.slice(i)");
			code46_nodes.forEach(detach);
			t238 = claim_text(p38_nodes, " matches the keyword string, if so, it will return the keyword value:");
			p38_nodes.forEach(detach);
			t239 = claim_space(section2_nodes);
			pre10 = claim_element(section2_nodes, "PRE", { class: true });
			var pre10_nodes = children(pre10);
			pre10_nodes.forEach(detach);
			t240 = claim_space(section2_nodes);
			p39 = claim_element(section2_nodes, "P", {});
			var p39_nodes = children(p39);
			t241 = claim_text(p39_nodes, "That's it for ");
			code47 = claim_element(p39_nodes, "CODE", {});
			var code47_nodes = children(code47);
			t242 = claim_text(code47_nodes, "parseValue");
			code47_nodes.forEach(detach);
			t243 = claim_text(p39_nodes, "!");
			p39_nodes.forEach(detach);
			t244 = claim_space(section2_nodes);
			p40 = claim_element(section2_nodes, "P", {});
			var p40_nodes = children(p40);
			t245 = claim_text(p40_nodes, "We still have 3 more grammars to go, but I will save the length of this article, and implement them in the following CodeSandbox:");
			p40_nodes.forEach(detach);
			t246 = claim_space(section2_nodes);

			iframe0 = claim_element(section2_nodes, "IFRAME", {
				src: true,
				style: true,
				title: true,
				allow: true,
				sandbox: true
			});

			children(iframe0).forEach(detach);
			t247 = claim_space(section2_nodes);
			p41 = claim_element(section2_nodes, "P", {});
			var p41_nodes = children(p41);
			t248 = claim_text(p41_nodes, "After we have finished implementing all the grammars, now let's return the value of the json, which is return by the ");
			code48 = claim_element(p41_nodes, "CODE", {});
			var code48_nodes = children(code48);
			t249 = claim_text(code48_nodes, "parseValue");
			code48_nodes.forEach(detach);
			t250 = claim_text(p41_nodes, ":");
			p41_nodes.forEach(detach);
			t251 = claim_space(section2_nodes);
			pre11 = claim_element(section2_nodes, "PRE", { class: true });
			var pre11_nodes = children(pre11);
			pre11_nodes.forEach(detach);
			t252 = claim_space(section2_nodes);
			p42 = claim_element(section2_nodes, "P", {});
			var p42_nodes = children(p42);
			t253 = claim_text(p42_nodes, "That's it!");
			p42_nodes.forEach(detach);
			t254 = claim_space(section2_nodes);
			p43 = claim_element(section2_nodes, "P", {});
			var p43_nodes = children(p43);
			t255 = claim_text(p43_nodes, "Well, not so fast my friend, we've just finished the happy path, what about unhappy path?");
			p43_nodes.forEach(detach);
			section2_nodes.forEach(detach);
			t256 = claim_space(nodes);
			section3 = claim_element(nodes, "SECTION", {});
			var section3_nodes = children(section3);
			h22 = claim_element(section3_nodes, "H2", {});
			var h22_nodes = children(h22);
			a21 = claim_element(h22_nodes, "A", { href: true, id: true });
			var a21_nodes = children(a21);
			t257 = claim_text(a21_nodes, "Handling the unexpected input");
			a21_nodes.forEach(detach);
			h22_nodes.forEach(detach);
			t258 = claim_space(section3_nodes);
			p44 = claim_element(section3_nodes, "P", {});
			var p44_nodes = children(p44);
			t259 = claim_text(p44_nodes, "As a good developer, we need to handle the unhappy path gracefully as well. For a parser, that means shouting at the developer with appropriate error message.");
			p44_nodes.forEach(detach);
			t260 = claim_space(section3_nodes);
			p45 = claim_element(section3_nodes, "P", {});
			var p45_nodes = children(p45);
			t261 = claim_text(p45_nodes, "Let's handle the 2 most common error cases:");
			p45_nodes.forEach(detach);
			t262 = claim_space(section3_nodes);
			ul10 = claim_element(section3_nodes, "UL", {});
			var ul10_nodes = children(ul10);
			li23 = claim_element(ul10_nodes, "LI", {});
			var li23_nodes = children(li23);
			t263 = claim_text(li23_nodes, "Unexpected token");
			li23_nodes.forEach(detach);
			t264 = claim_space(ul10_nodes);
			li24 = claim_element(ul10_nodes, "LI", {});
			var li24_nodes = children(li24);
			t265 = claim_text(li24_nodes, "Unexpected end of string");
			li24_nodes.forEach(detach);
			ul10_nodes.forEach(detach);
			section3_nodes.forEach(detach);
			t266 = claim_space(nodes);
			section4 = claim_element(nodes, "SECTION", {});
			var section4_nodes = children(section4);
			h30 = claim_element(section4_nodes, "H3", {});
			var h30_nodes = children(h30);
			a22 = claim_element(h30_nodes, "A", { href: true, id: true });
			var a22_nodes = children(a22);
			t267 = claim_text(a22_nodes, "Unexpected token");
			a22_nodes.forEach(detach);
			h30_nodes.forEach(detach);
			section4_nodes.forEach(detach);
			t268 = claim_space(nodes);
			section5 = claim_element(nodes, "SECTION", {});
			var section5_nodes = children(section5);
			h31 = claim_element(section5_nodes, "H3", {});
			var h31_nodes = children(h31);
			a23 = claim_element(h31_nodes, "A", { href: true, id: true });
			var a23_nodes = children(a23);
			t269 = claim_text(a23_nodes, "Unexpected end of string");
			a23_nodes.forEach(detach);
			h31_nodes.forEach(detach);
			t270 = claim_space(section5_nodes);
			p46 = claim_element(section5_nodes, "P", {});
			var p46_nodes = children(p46);
			t271 = claim_text(p46_nodes, "In all the while loops, for example the while loop in ");
			code49 = claim_element(p46_nodes, "CODE", {});
			var code49_nodes = children(code49);
			t272 = claim_text(code49_nodes, "parseObject");
			code49_nodes.forEach(detach);
			t273 = claim_text(p46_nodes, ":");
			p46_nodes.forEach(detach);
			t274 = claim_space(section5_nodes);
			pre12 = claim_element(section5_nodes, "PRE", { class: true });
			var pre12_nodes = children(pre12);
			pre12_nodes.forEach(detach);
			t275 = claim_space(section5_nodes);
			p47 = claim_element(section5_nodes, "P", {});
			var p47_nodes = children(p47);
			t276 = claim_text(p47_nodes, "We need to make sure that we don't access the character beyond the length of the string. This happens when the string ended unexpectedly, while we are still waiting for a closing character, \"}\" in this example:");
			p47_nodes.forEach(detach);
			t277 = claim_space(section5_nodes);
			pre13 = claim_element(section5_nodes, "PRE", { class: true });
			var pre13_nodes = children(pre13);
			pre13_nodes.forEach(detach);
			section5_nodes.forEach(detach);
			t278 = claim_space(nodes);
			section6 = claim_element(nodes, "SECTION", {});
			var section6_nodes = children(section6);
			h23 = claim_element(section6_nodes, "H2", {});
			var h23_nodes = children(h23);
			a24 = claim_element(h23_nodes, "A", { href: true, id: true });
			var a24_nodes = children(a24);
			t279 = claim_text(a24_nodes, "Going the extra mile");
			a24_nodes.forEach(detach);
			h23_nodes.forEach(detach);
			t280 = claim_space(section6_nodes);
			p48 = claim_element(section6_nodes, "P", {});
			var p48_nodes = children(p48);
			t281 = claim_text(p48_nodes, "Do you remember the time you were a junior developer, every time when you encounter Syntax error with cryptic messages, you are completely clueless of what went wrong?");
			p48_nodes.forEach(detach);
			t282 = claim_space(section6_nodes);
			p49 = claim_element(section6_nodes, "P", {});
			var p49_nodes = children(p49);
			t283 = claim_text(p49_nodes, "Now you are more experienced, it is time to stop this virtuous cycle and stop yelling");
			p49_nodes.forEach(detach);
			t284 = claim_space(section6_nodes);
			pre14 = claim_element(section6_nodes, "PRE", { class: true });
			var pre14_nodes = children(pre14);
			pre14_nodes.forEach(detach);
			t285 = claim_space(section6_nodes);
			p50 = claim_element(section6_nodes, "P", {});
			var p50_nodes = children(p50);
			t286 = claim_text(p50_nodes, "and leave the user staring at the screen confounded.");
			p50_nodes.forEach(detach);
			t287 = claim_space(section6_nodes);
			p51 = claim_element(section6_nodes, "P", {});
			var p51_nodes = children(p51);
			t288 = claim_text(p51_nodes, "There's a lot of better ways of handling error messages than yelling, here are some points you can consider adding to your parser:");
			p51_nodes.forEach(detach);
			section6_nodes.forEach(detach);
			t289 = claim_space(nodes);
			section7 = claim_element(nodes, "SECTION", {});
			var section7_nodes = children(section7);
			h32 = claim_element(section7_nodes, "H3", {});
			var h32_nodes = children(h32);
			a25 = claim_element(h32_nodes, "A", { href: true, id: true });
			var a25_nodes = children(a25);
			t290 = claim_text(a25_nodes, "Error code and standard error message");
			a25_nodes.forEach(detach);
			h32_nodes.forEach(detach);
			t291 = claim_space(section7_nodes);
			p52 = claim_element(section7_nodes, "P", {});
			var p52_nodes = children(p52);
			t292 = claim_text(p52_nodes, "This is useful as a standard keyword for user to Google for help.");
			p52_nodes.forEach(detach);
			t293 = claim_space(section7_nodes);
			pre15 = claim_element(section7_nodes, "PRE", { class: true });
			var pre15_nodes = children(pre15);
			pre15_nodes.forEach(detach);
			section7_nodes.forEach(detach);
			t294 = claim_space(nodes);
			section8 = claim_element(nodes, "SECTION", {});
			var section8_nodes = children(section8);
			h33 = claim_element(section8_nodes, "H3", {});
			var h33_nodes = children(h33);
			a26 = claim_element(h33_nodes, "A", { href: true, id: true });
			var a26_nodes = children(a26);
			t295 = claim_text(a26_nodes, "A better view of what went wrong");
			a26_nodes.forEach(detach);
			h33_nodes.forEach(detach);
			t296 = claim_space(section8_nodes);
			p53 = claim_element(section8_nodes, "P", {});
			var p53_nodes = children(p53);
			t297 = claim_text(p53_nodes, "Parser like Babel, will show you a code frame, a snippet of your code with underline, arrow or highlighting of what went wrong");
			p53_nodes.forEach(detach);
			t298 = claim_space(section8_nodes);
			pre16 = claim_element(section8_nodes, "PRE", { class: true });
			var pre16_nodes = children(pre16);
			pre16_nodes.forEach(detach);
			t299 = claim_space(section8_nodes);
			p54 = claim_element(section8_nodes, "P", {});
			var p54_nodes = children(p54);
			t300 = claim_text(p54_nodes, "An example on how you can print out the code snippet:");
			p54_nodes.forEach(detach);
			t301 = claim_space(section8_nodes);
			pre17 = claim_element(section8_nodes, "PRE", { class: true });
			var pre17_nodes = children(pre17);
			pre17_nodes.forEach(detach);
			section8_nodes.forEach(detach);
			t302 = claim_space(nodes);
			section9 = claim_element(nodes, "SECTION", {});
			var section9_nodes = children(section9);
			h34 = claim_element(section9_nodes, "H3", {});
			var h34_nodes = children(h34);
			a27 = claim_element(h34_nodes, "A", { href: true, id: true });
			var a27_nodes = children(a27);
			t303 = claim_text(a27_nodes, "Suggestions for error recovery");
			a27_nodes.forEach(detach);
			h34_nodes.forEach(detach);
			t304 = claim_space(section9_nodes);
			p55 = claim_element(section9_nodes, "P", {});
			var p55_nodes = children(p55);
			t305 = claim_text(p55_nodes, "If possible, explain what went wrong and give suggestions on how to fix them");
			p55_nodes.forEach(detach);
			t306 = claim_space(section9_nodes);
			pre18 = claim_element(section9_nodes, "PRE", { class: true });
			var pre18_nodes = children(pre18);
			pre18_nodes.forEach(detach);
			t307 = claim_space(section9_nodes);
			p56 = claim_element(section9_nodes, "P", {});
			var p56_nodes = children(p56);
			t308 = claim_text(p56_nodes, "If possible, provide suggestions based on the context that the parser has collected so far");
			p56_nodes.forEach(detach);
			t309 = claim_space(section9_nodes);
			pre19 = claim_element(section9_nodes, "PRE", { class: true });
			var pre19_nodes = children(pre19);
			pre19_nodes.forEach(detach);
			t310 = claim_space(section9_nodes);
			p57 = claim_element(section9_nodes, "P", {});
			var p57_nodes = children(p57);
			t311 = claim_text(p57_nodes, "The suggestion that based on the context will feel more relatable and actionable.");
			p57_nodes.forEach(detach);
			t312 = claim_space(section9_nodes);
			p58 = claim_element(section9_nodes, "P", {});
			var p58_nodes = children(p58);
			t313 = claim_text(p58_nodes, "With all the suggestions in mind, check out the updated CodeSandbox with");
			p58_nodes.forEach(detach);
			t314 = claim_space(section9_nodes);
			ul11 = claim_element(section9_nodes, "UL", {});
			var ul11_nodes = children(ul11);
			li25 = claim_element(ul11_nodes, "LI", {});
			var li25_nodes = children(li25);
			t315 = claim_text(li25_nodes, "Meaningful error message");
			li25_nodes.forEach(detach);
			t316 = claim_space(ul11_nodes);
			li26 = claim_element(ul11_nodes, "LI", {});
			var li26_nodes = children(li26);
			t317 = claim_text(li26_nodes, "Code snippet with error pointing point of failure");
			li26_nodes.forEach(detach);
			t318 = claim_space(ul11_nodes);
			li27 = claim_element(ul11_nodes, "LI", {});
			var li27_nodes = children(li27);
			t319 = claim_text(li27_nodes, "Provide suggestions for error recovery");
			li27_nodes.forEach(detach);
			ul11_nodes.forEach(detach);
			t320 = claim_space(section9_nodes);

			iframe1 = claim_element(section9_nodes, "IFRAME", {
				src: true,
				style: true,
				title: true,
				allow: true,
				sandbox: true
			});

			children(iframe1).forEach(detach);
			t321 = claim_space(section9_nodes);
			p59 = claim_element(section9_nodes, "P", {});
			var p59_nodes = children(p59);
			t322 = claim_text(p59_nodes, "Also, read the ");
			a28 = claim_element(p59_nodes, "A", { href: true, rel: true });
			var a28_nodes = children(a28);
			t323 = claim_text(a28_nodes, "\"Compiler Errors for Humans\"");
			a28_nodes.forEach(detach);
			t324 = claim_text(p59_nodes, " by ");
			a29 = claim_element(p59_nodes, "A", { href: true, rel: true });
			var a29_nodes = children(a29);
			t325 = claim_text(a29_nodes, "Evan Czaplicki");
			a29_nodes.forEach(detach);
			t326 = claim_text(p59_nodes, " for how Elm improves the UX problems of the Elm compiler.");
			p59_nodes.forEach(detach);
			section9_nodes.forEach(detach);
			t327 = claim_space(nodes);
			section10 = claim_element(nodes, "SECTION", {});
			var section10_nodes = children(section10);
			h24 = claim_element(section10_nodes, "H2", {});
			var h24_nodes = children(h24);
			a30 = claim_element(h24_nodes, "A", { href: true, id: true });
			var a30_nodes = children(a30);
			t328 = claim_text(a30_nodes, "Summary");
			a30_nodes.forEach(detach);
			h24_nodes.forEach(detach);
			t329 = claim_space(section10_nodes);
			p60 = claim_element(section10_nodes, "P", {});
			var p60_nodes = children(p60);
			t330 = claim_text(p60_nodes, "To implement a parser, you need to start with the grammar.");
			p60_nodes.forEach(detach);
			t331 = claim_space(section10_nodes);
			p61 = claim_element(section10_nodes, "P", {});
			var p61_nodes = children(p61);
			t332 = claim_text(p61_nodes, "You can formalise the grammar with the railroad diagrams or the Backus-Naur Form. Designing the grammar is the hardest step.");
			p61_nodes.forEach(detach);
			t333 = claim_space(section10_nodes);
			p62 = claim_element(section10_nodes, "P", {});
			var p62_nodes = children(p62);
			t334 = claim_text(p62_nodes, "Once you've settled with the grammar, you can start implementing the parser based on it.");
			p62_nodes.forEach(detach);
			t335 = claim_space(section10_nodes);
			p63 = claim_element(section10_nodes, "P", {});
			var p63_nodes = children(p63);
			t336 = claim_text(p63_nodes, "Error handling is important, what's more important is to have meaningful error messages, so that the user knows how to fix it.");
			p63_nodes.forEach(detach);
			t337 = claim_space(section10_nodes);
			p64 = claim_element(section10_nodes, "P", {});
			var p64_nodes = children(p64);
			t338 = claim_text(p64_nodes, "Now you know how a simple parser is implemented, it's time to set eyes on a more complex one:");
			p64_nodes.forEach(detach);
			t339 = claim_space(section10_nodes);
			ul12 = claim_element(section10_nodes, "UL", {});
			var ul12_nodes = children(ul12);
			li28 = claim_element(ul12_nodes, "LI", {});
			var li28_nodes = children(li28);
			a31 = claim_element(li28_nodes, "A", { href: true, rel: true });
			var a31_nodes = children(a31);
			t340 = claim_text(a31_nodes, "Babel parser");
			a31_nodes.forEach(detach);
			li28_nodes.forEach(detach);
			t341 = claim_space(ul12_nodes);
			li29 = claim_element(ul12_nodes, "LI", {});
			var li29_nodes = children(li29);
			a32 = claim_element(li29_nodes, "A", { href: true, rel: true });
			var a32_nodes = children(a32);
			t342 = claim_text(a32_nodes, "Svelte parser");
			a32_nodes.forEach(detach);
			li29_nodes.forEach(detach);
			ul12_nodes.forEach(detach);
			t343 = claim_space(section10_nodes);
			p65 = claim_element(section10_nodes, "P", {});
			var p65_nodes = children(p65);
			t344 = claim_text(p65_nodes, "Lastly, do follow ");
			a33 = claim_element(p65_nodes, "A", { href: true, rel: true });
			var a33_nodes = children(a33);
			t345 = claim_text(a33_nodes, "@cassidoo");
			a33_nodes.forEach(detach);
			t346 = claim_text(p65_nodes, ", her weekly newsletter is awesome!");
			p65_nodes.forEach(detach);
			section10_nodes.forEach(detach);
			this.h();
		},
		h() {
			attr(a0, "href", "#understand-the-grammar");
			attr(a1, "href", "#implementing-the-parser");
			attr(a2, "href", "#handling-the-unexpected-input");
			attr(a3, "href", "#unexpected-token");
			attr(a4, "href", "#unexpected-end-of-string");
			attr(a5, "href", "#going-the-extra-mile");
			attr(a6, "href", "#error-code-and-standard-error-message");
			attr(a7, "href", "#a-better-view-of-what-went-wrong");
			attr(a8, "href", "#suggestions-for-error-recovery");
			attr(a9, "href", "#summary");
			attr(ul2, "class", "sitemap");
			attr(ul2, "id", "sitemap");
			attr(ul2, "role", "navigation");
			attr(ul2, "aria-label", "Table of Contents");
			attr(pre0, "class", "language-null");
			attr(pre1, "class", "language-js");
			attr(a10, "href", "/creating-custom-javascript-syntax-with-babel");
			attr(a11, "href", "/step-by-step-guide-for-writing-a-babel-transformation");
			attr(a12, "href", "/manipulating-ast-with-javascript");
			attr(a13, "href", "https://www.json.org/json-en.html");
			attr(a13, "rel", "nofollow");
			attr(a14, "href", "#understand-the-grammar");
			attr(a14, "id", "understand-the-grammar");
			attr(a15, "href", "https://www.json.org/json-en.html");
			attr(a15, "rel", "nofollow");
			attr(a16, "href", "https://en.wikipedia.org/wiki/Syntax_diagram");
			attr(a16, "rel", "nofollow");
			if (img0.src !== (img0_src_value = "https://www.json.org/img/object.png")) attr(img0, "src", img0_src_value);
			attr(img0, "alt", "https://www.json.org/img/object.png");
			attr(a17, "href", "https://www.crockford.com/mckeeman.html");
			attr(a17, "rel", "nofollow");
			attr(a18, "href", "https://en.wikipedia.org/wiki/Backus%E2%80%93Naur_form");
			attr(a18, "rel", "nofollow");
			attr(pre2, "class", "language-null");
			if (img1.src !== (img1_src_value = "https://www.json.org/img/object.png")) attr(img1, "src", img1_src_value);
			attr(img1, "alt", "https://www.json.org/img/object.png");
			attr(a19, "href", "#implementing-the-parser");
			attr(a19, "id", "implementing-the-parser");
			attr(pre3, "class", "language-js");
			attr(pre4, "class", "language-js");
			attr(pre5, "class", "language-js");
			attr(pre6, "class", "language-js");
			attr(pre7, "class", "language-js");
			if (img2.src !== (img2_src_value = "https://www.json.org/img/array.png")) attr(img2, "src", img2_src_value);
			attr(img2, "alt", "https://www.json.org/img/array.png");
			attr(pre8, "class", "language-js");
			if (img3.src !== (img3_src_value = "https://www.json.org/img/value.png")) attr(img3, "src", img3_src_value);
			attr(img3, "alt", "https://www.json.org/img/value.png");
			attr(pre9, "class", "language-js");
			attr(a20, "href", "https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Operators/Nullish_coalescing_operator");
			attr(a20, "rel", "nofollow");
			attr(pre10, "class", "language-js");
			if (iframe0.src !== (iframe0_src_value = "https://codesandbox.io/embed/json-parser-k4c3w?expanddevtools=1&fontsize=14&hidenavigation=1&theme=dark&view=editor")) attr(iframe0, "src", iframe0_src_value);
			set_style(iframe0, "width", "100%");
			set_style(iframe0, "height", "500px");
			set_style(iframe0, "border", "0");
			set_style(iframe0, "border-radius", "4px");
			set_style(iframe0, "overflow", "hidden");
			attr(iframe0, "title", "JSON parser");
			attr(iframe0, "allow", "geolocation; microphone; camera; midi; vr; accelerometer; gyroscope; payment; ambient-light-sensor; encrypted-media; usb");
			attr(iframe0, "sandbox", "allow-modals allow-forms allow-popups allow-scripts allow-same-origin");
			attr(pre11, "class", "language-js");
			attr(a21, "href", "#handling-the-unexpected-input");
			attr(a21, "id", "handling-the-unexpected-input");
			attr(a22, "href", "#unexpected-token");
			attr(a22, "id", "unexpected-token");
			attr(a23, "href", "#unexpected-end-of-string");
			attr(a23, "id", "unexpected-end-of-string");
			attr(pre12, "class", "language-js");
			attr(pre13, "class", "language-js");
			attr(a24, "href", "#going-the-extra-mile");
			attr(a24, "id", "going-the-extra-mile");
			attr(pre14, "class", "language-js");
			attr(a25, "href", "#error-code-and-standard-error-message");
			attr(a25, "id", "error-code-and-standard-error-message");
			attr(pre15, "class", "language-js");
			attr(a26, "href", "#a-better-view-of-what-went-wrong");
			attr(a26, "id", "a-better-view-of-what-went-wrong");
			attr(pre16, "class", "language-js");
			attr(pre17, "class", "language-js");
			attr(a27, "href", "#suggestions-for-error-recovery");
			attr(a27, "id", "suggestions-for-error-recovery");
			attr(pre18, "class", "language-js");
			attr(pre19, "class", "language-js");
			if (iframe1.src !== (iframe1_src_value = "https://codesandbox.io/embed/json-parser-hjwxk?expanddevtools=1&fontsize=14&hidenavigation=1&theme=dark&view=editor")) attr(iframe1, "src", iframe1_src_value);
			set_style(iframe1, "width", "100%");
			set_style(iframe1, "height", "500px");
			set_style(iframe1, "border", "0");
			set_style(iframe1, "border-radius", "4px");
			set_style(iframe1, "overflow", "hidden");
			attr(iframe1, "title", "JSON parser (with error handling)");
			attr(iframe1, "allow", "geolocation; microphone; camera; midi; vr; accelerometer; gyroscope; payment; ambient-light-sensor; encrypted-media; usb");
			attr(iframe1, "sandbox", "allow-modals allow-forms allow-popups allow-scripts allow-same-origin");
			attr(a28, "href", "https://elm-lang.org/news/compiler-errors-for-humans");
			attr(a28, "rel", "nofollow");
			attr(a29, "href", "https://twitter.com/czaplic");
			attr(a29, "rel", "nofollow");
			attr(a30, "href", "#summary");
			attr(a30, "id", "summary");
			attr(a31, "href", "https://github.com/babel/babel/tree/master/packages/babel-parser");
			attr(a31, "rel", "nofollow");
			attr(a32, "href", "https://github.com/sveltejs/svelte/tree/master/src/compiler/parse");
			attr(a32, "rel", "nofollow");
			attr(a33, "href", "https://twitter.com/cassidoo");
			attr(a33, "rel", "nofollow");
		},
		m(target, anchor) {
			insert(target, section0, anchor);
			append(section0, ul2);
			append(ul2, li0);
			append(li0, a0);
			append(a0, t0);
			append(ul2, li1);
			append(li1, a1);
			append(a1, t1);
			append(ul2, li2);
			append(li2, a2);
			append(a2, t2);
			append(ul2, ul0);
			append(ul0, li3);
			append(li3, a3);
			append(a3, t3);
			append(ul0, li4);
			append(li4, a4);
			append(a4, t4);
			append(ul2, li5);
			append(li5, a5);
			append(a5, t5);
			append(ul2, ul1);
			append(ul1, li6);
			append(li6, a6);
			append(a6, t6);
			append(ul1, li7);
			append(li7, a7);
			append(a7, t7);
			append(ul1, li8);
			append(li8, a8);
			append(a8, t8);
			append(ul2, li9);
			append(li9, a9);
			append(a9, t9);
			insert(target, t10, anchor);
			insert(target, p0, anchor);
			append(p0, t11);
			insert(target, t12, anchor);
			insert(target, blockquote, anchor);
			append(blockquote, p1);
			append(p1, t13);
			insert(target, t14, anchor);
			insert(target, pre0, anchor);
			pre0.innerHTML = raw0_value;
			insert(target, t15, anchor);
			insert(target, p2, anchor);
			append(p2, t16);
			insert(target, t17, anchor);
			insert(target, pre1, anchor);
			pre1.innerHTML = raw1_value;
			insert(target, t18, anchor);
			insert(target, p3, anchor);
			append(p3, t19);
			insert(target, t20, anchor);
			insert(target, ul3, anchor);
			append(ul3, li10);
			append(li10, a10);
			append(a10, t21);
			append(ul3, t22);
			append(ul3, li11);
			append(li11, a11);
			append(a11, t23);
			append(ul3, t24);
			append(ul3, li12);
			append(li12, a12);
			append(a12, t25);
			insert(target, t26, anchor);
			insert(target, p4, anchor);
			append(p4, t27);
			insert(target, t28, anchor);
			insert(target, p5, anchor);
			append(p5, t29);
			insert(target, t30, anchor);
			insert(target, p6, anchor);
			append(p6, t31);
			append(p6, a13);
			append(a13, t32);
			append(p6, t33);
			insert(target, t34, anchor);
			insert(target, p7, anchor);
			append(p7, t35);
			insert(target, t36, anchor);
			insert(target, section1, anchor);
			append(section1, h20);
			append(h20, a14);
			append(a14, t37);
			append(section1, t38);
			append(section1, p8);
			append(p8, t39);
			append(p8, a15);
			append(a15, t40);
			append(p8, t41);
			append(section1, t42);
			append(section1, ul4);
			append(ul4, li13);
			append(li13, a16);
			append(a16, t43);
			append(li13, t44);
			append(section1, t45);
			append(section1, p9);
			append(p9, img0);
			append(section1, t46);
			append(section1, small0);
			append(small0, t47);
			append(section1, t48);
			append(section1, ul5);
			append(ul5, li14);
			append(li14, a17);
			append(a17, t49);
			append(li14, t50);
			append(li14, a18);
			append(a18, t51);
			append(li14, t52);
			append(section1, t53);
			append(section1, pre2);
			pre2.innerHTML = raw2_value;
			append(section1, t54);
			append(section1, p10);
			append(p10, t55);
			append(section1, t56);
			append(section1, p11);
			append(p11, t57);
			append(section1, t58);
			append(section1, p12);
			append(p12, t59);
			append(section1, t60);
			append(section1, p13);
			append(p13, t61);
			append(section1, t62);
			append(section1, p14);
			append(p14, img1);
			append(section1, t63);
			append(section1, small1);
			append(small1, t64);
			append(section1, t65);
			append(section1, p15);
			append(p15, t66);
			append(p15, strong0);
			append(strong0, t67);
			append(p15, t68);
			append(section1, t69);
			append(section1, p16);
			append(p16, t70);
			append(section1, t71);
			append(section1, p17);
			append(p17, t72);
			append(p17, code0);
			append(code0, t73);
			append(p17, t74);
			append(p17, code1);
			append(code1, t75);
			append(p17, t76);
			append(p17, code2);
			append(code2, t77);
			append(p17, t78);
			append(p17, code3);
			append(code3, t79);
			append(p17, t80);
			append(p17, code4);
			append(code4, t81);
			append(p17, t82);
			append(p17, code5);
			append(code5, t83);
			append(p17, t84);
			append(p17, code6);
			append(code6, t85);
			append(p17, t86);
			append(p17, strong1);
			append(strong1, t87);
			append(p17, t88);
			append(section1, t89);
			append(section1, p18);
			append(p18, t90);
			append(p18, code7);
			append(code7, t91);
			append(p18, t92);
			append(section1, t93);
			append(section1, ul6);
			append(ul6, li15);
			append(li15, code8);
			append(code8, t94);
			append(li15, t95);
			append(li15, code9);
			append(code9, t96);
			append(li15, t97);
			append(ul6, t98);
			append(ul6, li16);
			append(li16, code10);
			append(code10, t99);
			append(li16, t100);
			append(li16, code11);
			append(code11, t101);
			append(li16, t102);
			append(li16, code12);
			append(code12, t103);
			append(li16, t104);
			append(li16, code13);
			append(code13, t105);
			append(li16, t106);
			append(li16, code14);
			append(code14, t107);
			append(li16, t108);
			append(li16, code15);
			append(code15, t109);
			append(li16, t110);
			append(section1, t111);
			append(section1, p19);
			append(p19, t112);
			append(section1, t113);
			append(section1, ul7);
			append(ul7, li17);
			append(li17, t114);
			append(li17, code16);
			append(code16, t115);
			append(li17, t116);
			append(ul7, t117);
			append(ul7, li18);
			append(li18, t118);
			append(li18, code17);
			append(code17, t119);
			append(li18, t120);
			append(li18, code18);
			append(code18, t121);
			append(li18, t122);
			append(section1, t123);
			append(section1, p20);
			append(p20, t124);
			append(section1, t125);
			append(section1, ul8);
			append(ul8, li19);
			append(li19, t126);
			append(li19, code19);
			append(code19, t127);
			append(li19, t128);
			append(section1, t129);
			append(section1, p21);
			append(p21, t130);
			insert(target, t131, anchor);
			insert(target, section2, anchor);
			append(section2, h21);
			append(h21, a19);
			append(a19, t132);
			append(section2, t133);
			append(section2, p22);
			append(p22, t134);
			append(section2, t135);
			append(section2, pre3);
			pre3.innerHTML = raw3_value;
			append(section2, t136);
			append(section2, p23);
			append(p23, t137);
			append(p23, code20);
			append(code20, t138);
			append(p23, t139);
			append(p23, code21);
			append(code21, t140);
			append(p23, t141);
			append(p23, code22);
			append(code22, t142);
			append(p23, t143);
			append(section2, t144);
			append(section2, p24);
			append(p24, t145);
			append(p24, strong2);
			append(strong2, t146);
			append(section2, t147);
			append(section2, pre4);
			pre4.innerHTML = raw4_value;
			append(section2, t148);
			append(section2, p25);
			append(p25, t149);
			append(p25, code23);
			append(code23, t150);
			append(p25, t151);
			append(section2, t152);
			append(section2, p26);
			append(p26, t153);
			append(p26, code24);
			append(code24, t154);
			append(p26, t155);
			append(p26, code25);
			append(code25, t156);
			append(p26, t157);
			append(p26, code26);
			append(code26, t158);
			append(p26, t159);
			append(p26, code27);
			append(code27, t160);
			append(p26, t161);
			append(p26, code28);
			append(code28, t162);
			append(p26, t163);
			append(p26, code29);
			append(code29, t164);
			append(p26, t165);
			append(section2, t166);
			append(section2, p27);
			append(p27, t167);
			append(section2, t168);
			append(section2, pre5);
			pre5.innerHTML = raw5_value;
			append(section2, t169);
			append(section2, p28);
			append(p28, t170);
			append(section2, t171);
			append(section2, ul9);
			append(ul9, li20);
			append(li20, t172);
			append(li20, code30);
			append(code30, t173);
			append(li20, t174);
			append(ul9, t175);
			append(ul9, li21);
			append(li21, t176);
			append(li21, code31);
			append(code31, t177);
			append(li21, t178);
			append(ul9, t179);
			append(ul9, li22);
			append(li22, t180);
			append(li22, code32);
			append(code32, t181);
			append(li22, t182);
			append(section2, t183);
			append(section2, p29);
			append(p29, t184);
			append(p29, code33);
			append(code33, t185);
			append(p29, t186);
			append(p29, code34);
			append(code34, t187);
			append(p29, t188);
			append(section2, t189);
			append(section2, pre6);
			pre6.innerHTML = raw6_value;
			append(section2, t190);
			append(section2, p30);
			append(p30, t191);
			append(p30, code35);
			append(code35, t192);
			append(p30, t193);
			append(section2, t194);
			append(section2, p31);
			append(p31, t195);
			append(section2, t196);
			append(section2, pre7);
			pre7.innerHTML = raw7_value;
			append(section2, t197);
			append(section2, p32);
			append(p32, t198);
			append(section2, t199);
			append(section2, p33);
			append(p33, img2);
			append(section2, t200);
			append(section2, small2);
			append(small2, t201);
			append(section2, t202);
			append(section2, pre8);
			pre8.innerHTML = raw8_value;
			append(section2, t203);
			append(section2, p34);
			append(p34, t204);
			append(section2, t205);
			append(section2, p35);
			append(p35, img3);
			append(section2, t206);
			append(section2, small3);
			append(small3, t207);
			append(section2, t208);
			append(section2, p36);
			append(p36, t209);
			append(section2, t210);
			append(section2, pre9);
			pre9.innerHTML = raw9_value;
			append(section2, t211);
			append(section2, p37);
			append(p37, t212);
			append(p37, code36);
			append(code36, t213);
			append(p37, t214);
			append(p37, a20);
			append(a20, t215);
			append(p37, t216);
			append(p37, code37);
			append(code37, t217);
			append(p37, t218);
			append(p37, code38);
			append(code38, t219);
			append(p37, t220);
			append(p37, code39);
			append(code39, t221);
			append(p37, t222);
			append(p37, code40);
			append(code40, t223);
			append(p37, t224);
			append(p37, code41);
			append(code41, t225);
			append(p37, t226);
			append(p37, code42);
			append(code42, t227);
			append(p37, t228);
			append(p37, code43);
			append(code43, t229);
			append(p37, t230);
			append(p37, code44);
			append(code44, t231);
			append(p37, t232);
			append(p37, code45);
			append(code45, t233);
			append(p37, t234);
			append(section2, t235);
			append(section2, p38);
			append(p38, t236);
			append(p38, code46);
			append(code46, t237);
			append(p38, t238);
			append(section2, t239);
			append(section2, pre10);
			pre10.innerHTML = raw10_value;
			append(section2, t240);
			append(section2, p39);
			append(p39, t241);
			append(p39, code47);
			append(code47, t242);
			append(p39, t243);
			append(section2, t244);
			append(section2, p40);
			append(p40, t245);
			append(section2, t246);
			append(section2, iframe0);
			append(section2, t247);
			append(section2, p41);
			append(p41, t248);
			append(p41, code48);
			append(code48, t249);
			append(p41, t250);
			append(section2, t251);
			append(section2, pre11);
			pre11.innerHTML = raw11_value;
			append(section2, t252);
			append(section2, p42);
			append(p42, t253);
			append(section2, t254);
			append(section2, p43);
			append(p43, t255);
			insert(target, t256, anchor);
			insert(target, section3, anchor);
			append(section3, h22);
			append(h22, a21);
			append(a21, t257);
			append(section3, t258);
			append(section3, p44);
			append(p44, t259);
			append(section3, t260);
			append(section3, p45);
			append(p45, t261);
			append(section3, t262);
			append(section3, ul10);
			append(ul10, li23);
			append(li23, t263);
			append(ul10, t264);
			append(ul10, li24);
			append(li24, t265);
			insert(target, t266, anchor);
			insert(target, section4, anchor);
			append(section4, h30);
			append(h30, a22);
			append(a22, t267);
			insert(target, t268, anchor);
			insert(target, section5, anchor);
			append(section5, h31);
			append(h31, a23);
			append(a23, t269);
			append(section5, t270);
			append(section5, p46);
			append(p46, t271);
			append(p46, code49);
			append(code49, t272);
			append(p46, t273);
			append(section5, t274);
			append(section5, pre12);
			pre12.innerHTML = raw12_value;
			append(section5, t275);
			append(section5, p47);
			append(p47, t276);
			append(section5, t277);
			append(section5, pre13);
			pre13.innerHTML = raw13_value;
			insert(target, t278, anchor);
			insert(target, section6, anchor);
			append(section6, h23);
			append(h23, a24);
			append(a24, t279);
			append(section6, t280);
			append(section6, p48);
			append(p48, t281);
			append(section6, t282);
			append(section6, p49);
			append(p49, t283);
			append(section6, t284);
			append(section6, pre14);
			pre14.innerHTML = raw14_value;
			append(section6, t285);
			append(section6, p50);
			append(p50, t286);
			append(section6, t287);
			append(section6, p51);
			append(p51, t288);
			insert(target, t289, anchor);
			insert(target, section7, anchor);
			append(section7, h32);
			append(h32, a25);
			append(a25, t290);
			append(section7, t291);
			append(section7, p52);
			append(p52, t292);
			append(section7, t293);
			append(section7, pre15);
			pre15.innerHTML = raw15_value;
			insert(target, t294, anchor);
			insert(target, section8, anchor);
			append(section8, h33);
			append(h33, a26);
			append(a26, t295);
			append(section8, t296);
			append(section8, p53);
			append(p53, t297);
			append(section8, t298);
			append(section8, pre16);
			pre16.innerHTML = raw16_value;
			append(section8, t299);
			append(section8, p54);
			append(p54, t300);
			append(section8, t301);
			append(section8, pre17);
			pre17.innerHTML = raw17_value;
			insert(target, t302, anchor);
			insert(target, section9, anchor);
			append(section9, h34);
			append(h34, a27);
			append(a27, t303);
			append(section9, t304);
			append(section9, p55);
			append(p55, t305);
			append(section9, t306);
			append(section9, pre18);
			pre18.innerHTML = raw18_value;
			append(section9, t307);
			append(section9, p56);
			append(p56, t308);
			append(section9, t309);
			append(section9, pre19);
			pre19.innerHTML = raw19_value;
			append(section9, t310);
			append(section9, p57);
			append(p57, t311);
			append(section9, t312);
			append(section9, p58);
			append(p58, t313);
			append(section9, t314);
			append(section9, ul11);
			append(ul11, li25);
			append(li25, t315);
			append(ul11, t316);
			append(ul11, li26);
			append(li26, t317);
			append(ul11, t318);
			append(ul11, li27);
			append(li27, t319);
			append(section9, t320);
			append(section9, iframe1);
			append(section9, t321);
			append(section9, p59);
			append(p59, t322);
			append(p59, a28);
			append(a28, t323);
			append(p59, t324);
			append(p59, a29);
			append(a29, t325);
			append(p59, t326);
			insert(target, t327, anchor);
			insert(target, section10, anchor);
			append(section10, h24);
			append(h24, a30);
			append(a30, t328);
			append(section10, t329);
			append(section10, p60);
			append(p60, t330);
			append(section10, t331);
			append(section10, p61);
			append(p61, t332);
			append(section10, t333);
			append(section10, p62);
			append(p62, t334);
			append(section10, t335);
			append(section10, p63);
			append(p63, t336);
			append(section10, t337);
			append(section10, p64);
			append(p64, t338);
			append(section10, t339);
			append(section10, ul12);
			append(ul12, li28);
			append(li28, a31);
			append(a31, t340);
			append(ul12, t341);
			append(ul12, li29);
			append(li29, a32);
			append(a32, t342);
			append(section10, t343);
			append(section10, p65);
			append(p65, t344);
			append(p65, a33);
			append(a33, t345);
			append(p65, t346);
		},
		p: noop,
		d(detaching) {
			if (detaching) detach(section0);
			if (detaching) detach(t10);
			if (detaching) detach(p0);
			if (detaching) detach(t12);
			if (detaching) detach(blockquote);
			if (detaching) detach(t14);
			if (detaching) detach(pre0);
			if (detaching) detach(t15);
			if (detaching) detach(p2);
			if (detaching) detach(t17);
			if (detaching) detach(pre1);
			if (detaching) detach(t18);
			if (detaching) detach(p3);
			if (detaching) detach(t20);
			if (detaching) detach(ul3);
			if (detaching) detach(t26);
			if (detaching) detach(p4);
			if (detaching) detach(t28);
			if (detaching) detach(p5);
			if (detaching) detach(t30);
			if (detaching) detach(p6);
			if (detaching) detach(t34);
			if (detaching) detach(p7);
			if (detaching) detach(t36);
			if (detaching) detach(section1);
			if (detaching) detach(t131);
			if (detaching) detach(section2);
			if (detaching) detach(t256);
			if (detaching) detach(section3);
			if (detaching) detach(t266);
			if (detaching) detach(section4);
			if (detaching) detach(t268);
			if (detaching) detach(section5);
			if (detaching) detach(t278);
			if (detaching) detach(section6);
			if (detaching) detach(t289);
			if (detaching) detach(section7);
			if (detaching) detach(t294);
			if (detaching) detach(section8);
			if (detaching) detach(t302);
			if (detaching) detach(section9);
			if (detaching) detach(t327);
			if (detaching) detach(section10);
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
	"title": "JSON Parser with JavaScript",
	"date": "2019-12-12T08:00:00Z",
	"description": "Step-by-step guide on implementing a JSON parser",
	"tags": ["JavaScript", "AST"],
	"series": "AST",
	"slug": "json-parser-with-javascript",
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
