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

var baseCss = "https://lihautan.com/pause-and-resume-a-javascript-function/assets/_blog-299aa480.css";

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
	let link;
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
					"@id": "https%3A%2F%2Flihautan.com%2Fpause-and-resume-a-javascript-function",
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
			link = element("link");
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
			const head_nodes = query_selector_all("[data-svelte=\"svelte-1k4ncsr\"]", document.head);
			link = claim_element(head_nodes, "LINK", { href: true, rel: true });
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
			attr(link, "href", baseCss);
			attr(link, "rel", "stylesheet");
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
			attr(meta11, "content", "https%3A%2F%2Flihautan.com%2Fpause-and-resume-a-javascript-function");
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
			append(document.head, link);
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
							"@id": "https%3A%2F%2Flihautan.com%2Fpause-and-resume-a-javascript-function",
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
			detach(link);
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

/* content/blog/pause-and-resume-a-javascript-function/@@page-markup.svelte generated by Svelte v3.24.0 */

function create_default_slot(ctx) {
	let section0;
	let ul3;
	let ul0;
	let li0;
	let a0;
	let t0;
	let li1;
	let a1;
	let t1;
	let ul1;
	let li2;
	let a2;
	let t2;
	let li3;
	let a3;
	let li4;
	let a4;
	let t3;
	let li5;
	let a5;
	let t4;
	let ul2;
	let li6;
	let a6;
	let t5;
	let li7;
	let a7;
	let t6;
	let t7;
	let p0;
	let t8;
	let strong0;
	let t9;
	let t10;
	let t11;
	let pre0;

	let raw0_value = `
<code class="language-js"><span class="token keyword">function</span> <span class="token function">getWeddingDetail</span><span class="token punctuation">(</span><span class="token parameter">itemId<span class="token punctuation">,</span> callback</span><span class="token punctuation">)</span> <span class="token punctuation">&#123;</span>
  <span class="token comment">// call IO</span>
  <span class="token dom variable">window</span><span class="token punctuation">.</span><span class="token method function property-access">fetch</span><span class="token punctuation">(</span><span class="token template-string"><span class="token template-punctuation string">&#96;</span><span class="token string">https://api.com/wedding/</span><span class="token interpolation"><span class="token interpolation-punctuation punctuation">$&#123;</span>itemId<span class="token interpolation-punctuation punctuation">&#125;</span></span><span class="token template-punctuation string">&#96;</span></span><span class="token punctuation">,</span> <span class="token keyword">function</span> <span class="token function">callback</span><span class="token punctuation">(</span>
    <span class="token parameter">error<span class="token punctuation">,</span>
    wedding</span>
  <span class="token punctuation">)</span> <span class="token punctuation">&#123;</span>
    <span class="token comment">// get notified when the result is back</span>
    <span class="token keyword">if</span> <span class="token punctuation">(</span>error<span class="token punctuation">)</span> <span class="token punctuation">&#123;</span>
      <span class="token function">handleError</span><span class="token punctuation">(</span>error<span class="token punctuation">)</span><span class="token punctuation">;</span>
    <span class="token punctuation">&#125;</span> <span class="token keyword">else</span> <span class="token punctuation">&#123;</span>
      <span class="token function">callback</span><span class="token punctuation">(</span>wedding<span class="token punctuation">)</span><span class="token punctuation">;</span>
    <span class="token punctuation">&#125;</span>
  <span class="token punctuation">&#125;</span><span class="token punctuation">)</span><span class="token punctuation">;</span>
<span class="token punctuation">&#125;</span></code>` + "";

	let t12;
	let p1;
	let t13;
	let strong1;
	let t14;
	let t15;
	let t16;
	let pre1;

	let raw1_value = `
<code class="language-js"><span class="token keyword">function</span> <span class="token function">getProfile</span><span class="token punctuation">(</span><span class="token parameter">userId<span class="token punctuation">,</span> callback</span><span class="token punctuation">)</span> <span class="token punctuation">&#123;</span>
  <span class="token keyword">return</span> <span class="token dom variable">window</span><span class="token punctuation">.</span><span class="token method function property-access">fetch</span><span class="token punctuation">(</span><span class="token template-string"><span class="token template-punctuation string">&#96;</span><span class="token string">https://api.com/user/</span><span class="token interpolation"><span class="token interpolation-punctuation punctuation">$&#123;</span>userId<span class="token interpolation-punctuation punctuation">&#125;</span></span><span class="token template-punctuation string">&#96;</span></span><span class="token punctuation">,</span> callback<span class="token punctuation">)</span><span class="token punctuation">;</span>
<span class="token punctuation">&#125;</span>

<span class="token keyword">function</span> <span class="token function">getWeddingDetail</span><span class="token punctuation">(</span><span class="token parameter">itemId<span class="token punctuation">,</span> callback</span><span class="token punctuation">)</span> <span class="token punctuation">&#123;</span>
  <span class="token comment">// call IO</span>
  <span class="token dom variable">window</span><span class="token punctuation">.</span><span class="token method function property-access">fetch</span><span class="token punctuation">(</span><span class="token template-string"><span class="token template-punctuation string">&#96;</span><span class="token string">https://api.com/wedding/</span><span class="token interpolation"><span class="token interpolation-punctuation punctuation">$&#123;</span>itemId<span class="token interpolation-punctuation punctuation">&#125;</span></span><span class="token template-punctuation string">&#96;</span></span><span class="token punctuation">,</span> <span class="token keyword">function</span> <span class="token function">callback</span><span class="token punctuation">(</span>
    <span class="token parameter">error<span class="token punctuation">,</span>
    wedding</span>
  <span class="token punctuation">)</span> <span class="token punctuation">&#123;</span>
    <span class="token comment">// get notified when the result is back</span>
    <span class="token keyword">if</span> <span class="token punctuation">(</span>error<span class="token punctuation">)</span> <span class="token punctuation">&#123;</span>
      <span class="token function">handleError</span><span class="token punctuation">(</span>error<span class="token punctuation">)</span><span class="token punctuation">;</span>
    <span class="token punctuation">&#125;</span> <span class="token keyword">else</span> <span class="token punctuation">&#123;</span>
      <span class="token function">getProfile</span><span class="token punctuation">(</span>wedding<span class="token punctuation">.</span><span class="token property-access">groomId</span><span class="token punctuation">,</span> <span class="token keyword">function</span><span class="token punctuation">(</span><span class="token parameter">groomError<span class="token punctuation">,</span> groom</span><span class="token punctuation">)</span> <span class="token punctuation">&#123;</span>
        <span class="token keyword">if</span> <span class="token punctuation">(</span>groomError<span class="token punctuation">)</span> <span class="token punctuation">&#123;</span>
          <span class="token function">handleError</span><span class="token punctuation">(</span>groomError<span class="token punctuation">)</span><span class="token punctuation">;</span>
        <span class="token punctuation">&#125;</span> <span class="token keyword">else</span> <span class="token punctuation">&#123;</span>
          <span class="token function">getProfile</span><span class="token punctuation">(</span>wedding<span class="token punctuation">.</span><span class="token property-access">brideId</span><span class="token punctuation">,</span> <span class="token keyword">function</span><span class="token punctuation">(</span><span class="token parameter">brideError<span class="token punctuation">,</span> bride</span><span class="token punctuation">)</span> <span class="token punctuation">&#123;</span>
            <span class="token keyword">if</span> <span class="token punctuation">(</span>brideError<span class="token punctuation">)</span> <span class="token punctuation">&#123;</span>
              <span class="token function">handleError</span><span class="token punctuation">(</span>brideError<span class="token punctuation">)</span><span class="token punctuation">;</span>
            <span class="token punctuation">&#125;</span> <span class="token keyword">else</span> <span class="token punctuation">&#123;</span>
              <span class="token function">callback</span><span class="token punctuation">(</span><span class="token punctuation">&#123;</span> wedding<span class="token punctuation">,</span> bride<span class="token punctuation">,</span> groom <span class="token punctuation">&#125;</span><span class="token punctuation">)</span><span class="token punctuation">;</span>
            <span class="token punctuation">&#125;</span>
          <span class="token punctuation">&#125;</span><span class="token punctuation">)</span><span class="token punctuation">;</span>
        <span class="token punctuation">&#125;</span>
      <span class="token punctuation">&#125;</span><span class="token punctuation">)</span><span class="token punctuation">;</span>
    <span class="token punctuation">&#125;</span>
  <span class="token punctuation">&#125;</span><span class="token punctuation">)</span><span class="token punctuation">;</span>
<span class="token punctuation">&#125;</span></code>` + "";

	let t17;
	let p2;
	let t18;
	let a8;
	let t19;
	let t20;
	let a9;
	let code0;
	let t21;
	let t22;
	let t23;
	let p3;
	let code1;
	let t24;
	let t25;
	let code2;
	let t26;
	let t27;
	let t28;
	let pre2;

	let raw2_value = `
<code class="language-js"><span class="token keyword">function</span> <span class="token function">getProfile</span><span class="token punctuation">(</span><span class="token parameter">userId</span><span class="token punctuation">)</span> <span class="token punctuation">&#123;</span>
  <span class="token keyword">return</span> <span class="token dom variable">window</span><span class="token punctuation">.</span><span class="token method function property-access">fetch</span><span class="token punctuation">(</span><span class="token template-string"><span class="token template-punctuation string">&#96;</span><span class="token string">https://api.com/user/</span><span class="token interpolation"><span class="token interpolation-punctuation punctuation">$&#123;</span>userId<span class="token interpolation-punctuation punctuation">&#125;</span></span><span class="token template-punctuation string">&#96;</span></span><span class="token punctuation">)</span><span class="token punctuation">;</span>
<span class="token punctuation">&#125;</span>

<span class="token keyword">async</span> <span class="token keyword">function</span> <span class="token function">getWeddingDetail</span><span class="token punctuation">(</span><span class="token parameter">weddingId</span><span class="token punctuation">)</span> <span class="token punctuation">&#123;</span>
  <span class="token keyword">try</span> <span class="token punctuation">&#123;</span>
    <span class="token comment">// pause to get detail through IO</span>
    <span class="token keyword">const</span> wedding <span class="token operator">=</span> <span class="token keyword">await</span> <span class="token dom variable">window</span><span class="token punctuation">.</span><span class="token method function property-access">fetch</span><span class="token punctuation">(</span><span class="token template-string"><span class="token template-punctuation string">&#96;</span><span class="token string">https://api.com/wedding/</span><span class="token interpolation"><span class="token interpolation-punctuation punctuation">$&#123;</span>weddingId<span class="token interpolation-punctuation punctuation">&#125;</span></span><span class="token template-punctuation string">&#96;</span></span><span class="token punctuation">)</span><span class="token punctuation">;</span>
    <span class="token comment">// and resume when the result is back, and pause again...</span>
    <span class="token keyword">const</span> groom <span class="token operator">=</span> <span class="token keyword">await</span> <span class="token function">getProfile</span><span class="token punctuation">(</span>wedding<span class="token punctuation">.</span><span class="token property-access">groomId</span><span class="token punctuation">)</span><span class="token punctuation">;</span>
    <span class="token comment">// ... and resume and pause ...</span>
    <span class="token keyword">const</span> bride <span class="token operator">=</span> <span class="token keyword">await</span> <span class="token function">getProfile</span><span class="token punctuation">(</span>wedding<span class="token punctuation">.</span><span class="token property-access">brideId</span><span class="token punctuation">)</span><span class="token punctuation">;</span>
    <span class="token comment">// ... and resume</span>
    <span class="token keyword">return</span> <span class="token punctuation">&#123;</span> wedding<span class="token punctuation">,</span> bride<span class="token punctuation">,</span> groom <span class="token punctuation">&#125;</span><span class="token punctuation">;</span>
  <span class="token punctuation">&#125;</span> <span class="token keyword">catch</span> <span class="token punctuation">(</span>error<span class="token punctuation">)</span> <span class="token punctuation">&#123;</span>
    <span class="token function">handleError</span><span class="token punctuation">(</span>error<span class="token punctuation">)</span><span class="token punctuation">;</span>
  <span class="token punctuation">&#125;</span>
<span class="token punctuation">&#125;</span></code>` + "";

	let t29;
	let p4;
	let t30;
	let t31;
	let section1;
	let h30;
	let a10;
	let t32;
	let t33;
	let p5;
	let t34;
	let code3;
	let t35;
	let t36;
	let code4;
	let t37;
	let t38;
	let t39;
	let p6;
	let t40;
	let code5;
	let t41;
	let t42;
	let code6;
	let t43;
	let t44;
	let t45;
	let p7;
	let t46;
	let a11;
	let t47;
	let t48;
	let t49;
	let p8;
	let t50;
	let code7;
	let t51;
	let t52;
	let t53;
	let pre3;

	let raw3_value = `
<code class="language-js"><span class="token keyword">function</span> <span class="token function">getWeddingDetail</span><span class="token punctuation">(</span><span class="token parameter">weddingId</span><span class="token punctuation">)</span> <span class="token punctuation">&#123;</span>
  <span class="token comment">// dont need await</span>
  <span class="token keyword">const</span> wedding <span class="token operator">=</span> <span class="token dom variable">window</span><span class="token punctuation">.</span><span class="token method function property-access">fetch</span><span class="token punctuation">(</span><span class="token template-string"><span class="token template-punctuation string">&#96;</span><span class="token string">https://api.com/wedding/</span><span class="token interpolation"><span class="token interpolation-punctuation punctuation">$&#123;</span>weddingId<span class="token interpolation-punctuation punctuation">&#125;</span></span><span class="token template-punctuation string">&#96;</span></span><span class="token punctuation">)</span><span class="token punctuation">;</span>
  <span class="token comment">// &#96;getProfile&#96; could be synchronous or asynchronous</span>
  <span class="token comment">// but &#96;getWeddingDetail&#96; shouldn't care</span>
  <span class="token keyword">const</span> groom <span class="token operator">=</span> <span class="token function">getProfile</span><span class="token punctuation">(</span>wedding<span class="token punctuation">.</span><span class="token property-access">groomId</span><span class="token punctuation">)</span><span class="token punctuation">;</span>
  <span class="token keyword">const</span> bride <span class="token operator">=</span> <span class="token function">getProfile</span><span class="token punctuation">(</span>wedding<span class="token punctuation">.</span><span class="token property-access">brideId</span><span class="token punctuation">)</span><span class="token punctuation">;</span>
  <span class="token keyword">return</span> <span class="token punctuation">&#123;</span> wedding<span class="token punctuation">,</span> bride<span class="token punctuation">,</span> groom <span class="token punctuation">&#125;</span><span class="token punctuation">;</span>
<span class="token punctuation">&#125;</span></code>` + "";

	let t54;
	let p9;
	let t55;
	let t56;
	let p10;
	let t57;
	let t58;
	let p11;
	let t59;
	let t60;
	let p12;
	let strong2;
	let t61;
	let t62;
	let p13;
	let t63;
	let t64;
	let p14;
	let t65;
	let em;
	let t66;
	let t67;
	let section2;
	let h20;
	let a12;
	let t68;
	let t69;
	let section3;
	let h31;
	let a13;
	let t70;
	let t71;
	let p15;
	let t72;
	let t73;
	let p16;
	let t74;
	let code8;
	let t75;
	let t76;
	let t77;
	let pre4;

	let raw4_value = `
<code class="language-js"><span class="token keyword">function</span> <span class="token function">main</span><span class="token punctuation">(</span><span class="token punctuation">)</span> <span class="token punctuation">&#123;</span>
  <span class="token keyword">const</span> id <span class="token operator">=</span> <span class="token number">123</span><span class="token punctuation">;</span>
  <span class="token console class-name">console</span><span class="token punctuation">.</span><span class="token method function property-access">log</span><span class="token punctuation">(</span><span class="token string">'Getting wedding:'</span><span class="token punctuation">,</span> id<span class="token punctuation">)</span><span class="token punctuation">;</span>

  <span class="token keyword">const</span> <span class="token punctuation">&#123;</span> wedding<span class="token punctuation">,</span> bride<span class="token punctuation">,</span> groom <span class="token punctuation">&#125;</span> <span class="token operator">=</span> <span class="token function">getWeddingDetail</span><span class="token punctuation">(</span>id<span class="token punctuation">)</span><span class="token punctuation">;</span>

  <span class="token console class-name">console</span><span class="token punctuation">.</span><span class="token method function property-access">log</span><span class="token punctuation">(</span><span class="token string">'Wedding detail:'</span><span class="token punctuation">,</span> wedding<span class="token punctuation">)</span><span class="token punctuation">;</span>
<span class="token punctuation">&#125;</span></code>` + "";

	let t78;
	let p17;
	let t79;
	let t80;
	let pre5;

	let raw5_value = `
<code class="language-js"><span class="token keyword">function</span> <span class="token function">runtime</span><span class="token punctuation">(</span><span class="token parameter">mainFn</span><span class="token punctuation">)</span> <span class="token punctuation">&#123;</span>
  <span class="token comment">// run our entry point</span>
  <span class="token function">mainFn</span><span class="token punctuation">(</span><span class="token punctuation">)</span><span class="token punctuation">;</span>
<span class="token punctuation">&#125;</span>

<span class="token comment">// start runtime</span>
<span class="token function">runtime</span><span class="token punctuation">(</span>main<span class="token punctuation">)</span><span class="token punctuation">;</span></code>` + "";

	let t81;
	let p18;
	let t82;
	let t83;
	let p19;
	let t84;
	let code9;
	let t85;
	let t86;
	let t87;
	let p20;
	let t88;
	let code10;
	let t89;
	let t90;
	let code11;
	let t91;
	let t92;
	let code12;
	let t93;
	let t94;
	let code13;
	let t95;
	let t96;
	let t97;
	let pre6;

	let raw6_value = `
<code class="language-js"><span class="token keyword">function</span> <span class="token function">runtime</span><span class="token punctuation">(</span><span class="token parameter">mainFn</span><span class="token punctuation">)</span> <span class="token punctuation">&#123;</span>
  <span class="token comment">// highlight-start</span>
  <span class="token comment">// patch the &#96;window.fetch&#96; to make it "pause" the function</span>
  <span class="token keyword">const</span> _originalFetch <span class="token operator">=</span> <span class="token dom variable">window</span><span class="token punctuation">.</span><span class="token property-access">fetch</span><span class="token punctuation">;</span>
  <span class="token dom variable">window</span><span class="token punctuation">.</span><span class="token method-variable function-variable method function property-access">fetch</span> <span class="token operator">=</span> <span class="token punctuation">(</span><span class="token parameter">url<span class="token punctuation">,</span> options</span><span class="token punctuation">)</span> <span class="token arrow operator">=></span> <span class="token punctuation">&#123;</span>
    <span class="token comment">// "pause" the function</span>
    <span class="token keyword">throw</span> <span class="token keyword">new</span> <span class="token class-name">Error</span><span class="token punctuation">(</span><span class="token punctuation">)</span><span class="token punctuation">;</span>
  <span class="token punctuation">&#125;</span><span class="token punctuation">;</span>

  <span class="token comment">// run our entry point</span>
  <span class="token keyword">try</span> <span class="token punctuation">&#123;</span>
    <span class="token function">mainFn</span><span class="token punctuation">(</span><span class="token punctuation">)</span><span class="token punctuation">;</span>
  <span class="token punctuation">&#125;</span> <span class="token keyword">catch</span> <span class="token punctuation">(</span>error<span class="token punctuation">)</span> <span class="token punctuation">&#123;</span>
    <span class="token comment">// function "paused"</span>
  <span class="token punctuation">&#125;</span>
  <span class="token comment">// highlight-end</span>
<span class="token punctuation">&#125;</span>

<span class="token keyword">function</span> <span class="token function">getWeddingDetail</span><span class="token punctuation">(</span><span class="token parameter">weddingId</span><span class="token punctuation">)</span> <span class="token punctuation">&#123;</span>
  <span class="token comment">// calling &#96;window.fetch&#96; will "pause" the function and stop executing the next line.</span>
  <span class="token keyword">const</span> wedding <span class="token operator">=</span> <span class="token dom variable">window</span><span class="token punctuation">.</span><span class="token method function property-access">fetch</span><span class="token punctuation">(</span><span class="token template-string"><span class="token template-punctuation string">&#96;</span><span class="token string">https://api.com/wedding/</span><span class="token interpolation"><span class="token interpolation-punctuation punctuation">$&#123;</span>weddingId<span class="token interpolation-punctuation punctuation">&#125;</span></span><span class="token template-punctuation string">&#96;</span></span><span class="token punctuation">)</span><span class="token punctuation">;</span>
  <span class="token comment">// ...</span>
<span class="token punctuation">&#125;</span></code>` + "";

	let t98;
	let p21;
	let t99;
	let t100;
	let p22;
	let t101;
	let code14;
	let t102;
	let t103;
	let t104;
	let pre7;

	let raw7_value = `
<code class="language-js"><span class="token keyword">function</span> <span class="token function">runtime</span><span class="token punctuation">(</span><span class="token parameter">mainFn</span><span class="token punctuation">)</span> <span class="token punctuation">&#123;</span>
  <span class="token comment">// patch the &#96;window.fetch&#96; to make it "pause" the function</span>
  <span class="token keyword">const</span> _originalFetch <span class="token operator">=</span> <span class="token dom variable">window</span><span class="token punctuation">.</span><span class="token property-access">fetch</span><span class="token punctuation">;</span>
  <span class="token dom variable">window</span><span class="token punctuation">.</span><span class="token method-variable function-variable method function property-access">fetch</span> <span class="token operator">=</span> <span class="token punctuation">(</span><span class="token parameter">url<span class="token punctuation">,</span> options</span><span class="token punctuation">)</span> <span class="token arrow operator">=></span> <span class="token punctuation">&#123;</span>
    <span class="token comment">// "pause" the function</span>
    <span class="token keyword">throw</span> <span class="token keyword">new</span> <span class="token class-name">Error</span><span class="token punctuation">(</span><span class="token punctuation">)</span><span class="token punctuation">;</span>
  <span class="token punctuation">&#125;</span><span class="token punctuation">;</span>

  <span class="token comment">// run our entry point</span>
  <span class="token keyword">function</span> <span class="token function">runMain</span><span class="token punctuation">(</span><span class="token punctuation">)</span> <span class="token punctuation">&#123;</span>
    <span class="token keyword">try</span> <span class="token punctuation">&#123;</span>
      <span class="token function">mainFn</span><span class="token punctuation">(</span><span class="token punctuation">)</span><span class="token punctuation">;</span>
    <span class="token punctuation">&#125;</span> <span class="token keyword">catch</span> <span class="token punctuation">(</span>error<span class="token punctuation">)</span> <span class="token punctuation">&#123;</span>
      <span class="token comment">// function "paused"</span>
      <span class="token comment">// highlight-start</span>
      <span class="token comment">// resumed by rerun the &#96;mainFn&#96;</span>
      <span class="token function">runMain</span><span class="token punctuation">(</span><span class="token punctuation">)</span><span class="token punctuation">;</span>
      <span class="token comment">// highlight-end</span>
    <span class="token punctuation">&#125;</span>
  <span class="token punctuation">&#125;</span>
  <span class="token function">runMain</span><span class="token punctuation">(</span><span class="token punctuation">)</span><span class="token punctuation">;</span>
<span class="token punctuation">&#125;</span></code>` + "";

	let t105;
	let p23;
	let t106;
	let code15;
	let t107;
	let t108;
	let t109;
	let p24;
	let t110;
	let code16;
	let t111;
	let t112;
	let t113;
	let pre8;

	let raw8_value = `
<code class="language-js"><span class="token keyword">function</span> <span class="token function">runtime</span><span class="token punctuation">(</span><span class="token parameter">mainFn</span><span class="token punctuation">)</span> <span class="token punctuation">&#123;</span>
  <span class="token comment">// patch the &#96;window.fetch&#96; to make it "pause" the function</span>
  <span class="token keyword">const</span> _originalFetch <span class="token operator">=</span> <span class="token dom variable">window</span><span class="token punctuation">.</span><span class="token property-access">fetch</span><span class="token punctuation">;</span>
  <span class="token dom variable">window</span><span class="token punctuation">.</span><span class="token method-variable function-variable method function property-access">fetch</span> <span class="token operator">=</span> <span class="token punctuation">(</span><span class="token parameter">url<span class="token punctuation">,</span> options</span><span class="token punctuation">)</span> <span class="token arrow operator">=></span> <span class="token punctuation">&#123;</span>
    <span class="token function">_originalFetch</span><span class="token punctuation">(</span>url<span class="token punctuation">,</span> options<span class="token punctuation">)</span><span class="token punctuation">.</span><span class="token method function property-access">then</span><span class="token punctuation">(</span><span class="token parameter">result</span> <span class="token arrow operator">=></span> <span class="token punctuation">&#123;</span>
      <span class="token comment">// highlight-start</span>
      <span class="token comment">// resume only when the result is back</span>
      <span class="token function">runMain</span><span class="token punctuation">(</span><span class="token punctuation">)</span><span class="token punctuation">;</span>
      <span class="token comment">// highlight-end</span>
    <span class="token punctuation">&#125;</span><span class="token punctuation">)</span><span class="token punctuation">;</span>

    <span class="token keyword">throw</span> <span class="token keyword">new</span> <span class="token class-name">Error</span><span class="token punctuation">(</span><span class="token punctuation">)</span><span class="token punctuation">;</span>
  <span class="token punctuation">&#125;</span><span class="token punctuation">;</span>

  <span class="token comment">// run our entry point</span>
  <span class="token keyword">function</span> <span class="token function">runMain</span><span class="token punctuation">(</span><span class="token punctuation">)</span> <span class="token punctuation">&#123;</span>
    <span class="token keyword">try</span> <span class="token punctuation">&#123;</span>
      <span class="token function">mainFn</span><span class="token punctuation">(</span><span class="token punctuation">)</span><span class="token punctuation">;</span>
    <span class="token punctuation">&#125;</span> <span class="token keyword">catch</span> <span class="token punctuation">(</span>error<span class="token punctuation">)</span> <span class="token punctuation">&#123;</span>
      <span class="token comment">// function "paused"</span>
      <span class="token comment">// highlight-next-line</span>
      <span class="token comment">// no rerun</span>
    <span class="token punctuation">&#125;</span>
  <span class="token punctuation">&#125;</span>
  <span class="token function">runMain</span><span class="token punctuation">(</span><span class="token punctuation">)</span><span class="token punctuation">;</span>
<span class="token punctuation">&#125;</span></code>` + "";

	let t114;
	let p25;
	let t115;
	let code17;
	let t116;
	let t117;
	let t118;
	let pre9;

	let raw9_value = `
<code class="language-js"><span class="token comment">// ...</span>
<span class="token comment">// 1st time running &#96;getWeddingDetail&#96;</span>
<span class="token comment">// call &#96;window.fetch&#96;, throw Error and "paused"</span>
<span class="token keyword">const</span> wedding <span class="token operator">=</span> <span class="token dom variable">window</span><span class="token punctuation">.</span><span class="token method function property-access">fetch</span><span class="token punctuation">(</span><span class="token template-string"><span class="token template-punctuation string">&#96;</span><span class="token string">https://api.com/wedding/</span><span class="token interpolation"><span class="token interpolation-punctuation punctuation">$&#123;</span>weddingId<span class="token interpolation-punctuation punctuation">&#125;</span></span><span class="token template-punctuation string">&#96;</span></span><span class="token punctuation">)</span><span class="token punctuation">;</span>
<span class="token comment">// ...</span>
<span class="token comment">// when fetch response returns, rerun the main function</span>
<span class="token comment">// 2nd time running &#96;getWeddingDetail&#96;</span>
<span class="token comment">// call &#96;window.fetch&#96;, and should return the response to "resume"</span>
<span class="token keyword">const</span> wedding <span class="token operator">=</span> <span class="token dom variable">window</span><span class="token punctuation">.</span><span class="token method function property-access">fetch</span><span class="token punctuation">(</span><span class="token template-string"><span class="token template-punctuation string">&#96;</span><span class="token string">https://api.com/wedding/</span><span class="token interpolation"><span class="token interpolation-punctuation punctuation">$&#123;</span>weddingId<span class="token interpolation-punctuation punctuation">&#125;</span></span><span class="token template-punctuation string">&#96;</span></span><span class="token punctuation">)</span><span class="token punctuation">;</span>
<span class="token comment">// ...</span></code>` + "";

	let t119;
	let p26;
	let t120;
	let code18;
	let t121;
	let t122;
	let t123;
	let p27;
	let t124;
	let t125;
	let pre10;

	let raw10_value = `
<code class="language-js"><span class="token keyword">function</span> <span class="token function">runtime</span><span class="token punctuation">(</span><span class="token parameter">mainFn</span><span class="token punctuation">)</span> <span class="token punctuation">&#123;</span>
  <span class="token comment">// patch the &#96;window.fetch&#96; to make it "pause" the function</span>
  <span class="token keyword">const</span> _originalFetch <span class="token operator">=</span> <span class="token dom variable">window</span><span class="token punctuation">.</span><span class="token property-access">fetch</span><span class="token punctuation">;</span>
  <span class="token dom variable">window</span><span class="token punctuation">.</span><span class="token method-variable function-variable method function property-access">fetch</span> <span class="token operator">=</span> <span class="token punctuation">(</span><span class="token parameter">url<span class="token punctuation">,</span> options</span><span class="token punctuation">)</span> <span class="token arrow operator">=></span> <span class="token punctuation">&#123;</span>
    <span class="token comment">// highlight-start</span>
    <span class="token comment">// return immediately if response is cached.</span>
    <span class="token keyword">if</span> <span class="token punctuation">(</span>cache<span class="token punctuation">.</span><span class="token method function property-access">has</span><span class="token punctuation">(</span><span class="token punctuation">[</span>url<span class="token punctuation">,</span> options<span class="token punctuation">]</span><span class="token punctuation">)</span><span class="token punctuation">)</span> <span class="token punctuation">&#123;</span>
      <span class="token keyword">return</span> cache<span class="token punctuation">.</span><span class="token method function property-access">get</span><span class="token punctuation">(</span><span class="token punctuation">[</span>url<span class="token punctuation">,</span> options<span class="token punctuation">]</span><span class="token punctuation">)</span><span class="token punctuation">;</span>
    <span class="token punctuation">&#125;</span>

    <span class="token function">_originalFetch</span><span class="token punctuation">(</span>url<span class="token punctuation">,</span> options<span class="token punctuation">)</span><span class="token punctuation">.</span><span class="token method function property-access">then</span><span class="token punctuation">(</span><span class="token parameter">result</span> <span class="token arrow operator">=></span> <span class="token punctuation">&#123;</span>
      cache<span class="token punctuation">.</span><span class="token method function property-access">set</span><span class="token punctuation">(</span><span class="token punctuation">[</span>url<span class="token punctuation">,</span> options<span class="token punctuation">]</span><span class="token punctuation">,</span> result<span class="token punctuation">)</span><span class="token punctuation">;</span>
      <span class="token comment">// resume only when the result is back</span>
      <span class="token function">runMain</span><span class="token punctuation">(</span><span class="token punctuation">)</span><span class="token punctuation">;</span>
    <span class="token punctuation">&#125;</span><span class="token punctuation">)</span><span class="token punctuation">;</span>
    <span class="token comment">// highlight-end</span>

    <span class="token keyword">throw</span> <span class="token keyword">new</span> <span class="token class-name">Error</span><span class="token punctuation">(</span><span class="token punctuation">)</span><span class="token punctuation">;</span>
  <span class="token punctuation">&#125;</span><span class="token punctuation">;</span>

  <span class="token comment">// run our entry point ...</span>
<span class="token punctuation">&#125;</span></code>` + "";

	let t126;
	let p28;
	let t127;
	let t128;
	let p29;
	let t129;
	let t130;
	let p30;
	let t131;
	let code19;
	let t132;
	let t133;
	let t134;
	let p31;
	let t135;
	let code20;
	let t136;
	let t137;
	let t138;
	let section4;
	let h32;
	let a14;
	let strong3;
	let t139;
	let t140;
	let p32;
	let t141;
	let code21;
	let t142;
	let t143;
	let t144;
	let pre11;

	let raw11_value = `
<code class="language-js"><span class="token keyword">function</span> <span class="token function">main</span><span class="token punctuation">(</span><span class="token punctuation">)</span> <span class="token punctuation">&#123;</span>
  <span class="token keyword">const</span> id <span class="token operator">=</span> <span class="token number">123</span><span class="token punctuation">;</span>
  <span class="token comment">// highlight-next-line</span>
  <span class="token function">runSideEffects</span><span class="token punctuation">(</span><span class="token punctuation">(</span><span class="token punctuation">)</span> <span class="token arrow operator">=></span> <span class="token console class-name">console</span><span class="token punctuation">.</span><span class="token method function property-access">log</span><span class="token punctuation">(</span><span class="token string">'Getting wedding:'</span><span class="token punctuation">,</span> id<span class="token punctuation">)</span><span class="token punctuation">)</span><span class="token punctuation">;</span>

  <span class="token keyword">const</span> <span class="token punctuation">&#123;</span> wedding<span class="token punctuation">,</span> bride<span class="token punctuation">,</span> groom <span class="token punctuation">&#125;</span> <span class="token operator">=</span> <span class="token function">getWeddingDetail</span><span class="token punctuation">(</span>id<span class="token punctuation">)</span><span class="token punctuation">;</span>

  <span class="token comment">// highlight-next-line</span>
  <span class="token function">runSideEffects</span><span class="token punctuation">(</span><span class="token punctuation">(</span><span class="token punctuation">)</span> <span class="token arrow operator">=></span> <span class="token console class-name">console</span><span class="token punctuation">.</span><span class="token method function property-access">log</span><span class="token punctuation">(</span><span class="token string">'Wedding detail:'</span><span class="token punctuation">,</span> wedding<span class="token punctuation">)</span><span class="token punctuation">)</span><span class="token punctuation">;</span>
<span class="token punctuation">&#125;</span></code>` + "";

	let t145;
	let p33;
	let t146;
	let code22;
	let t147;
	let t148;
	let t149;
	let pre12;

	let raw12_value = `
<code class="language-js"><span class="token keyword">function</span> <span class="token function">runtime</span><span class="token punctuation">(</span><span class="token parameter">mainFn</span><span class="token punctuation">)</span> <span class="token punctuation">&#123;</span>
  <span class="token comment">// patch the &#96;window.fetch&#96; to make it "pause" the function...</span>

  <span class="token comment">// highlight-start</span>
  <span class="token comment">// provide &#96;runSideEffects&#96;</span>
  <span class="token keyword">const</span> sideEffects <span class="token operator">=</span> <span class="token punctuation">[</span><span class="token punctuation">]</span><span class="token punctuation">;</span>
  <span class="token dom variable">window</span><span class="token punctuation">.</span><span class="token method-variable function-variable method function property-access">runSideEffects</span> <span class="token operator">=</span> <span class="token parameter">fn</span> <span class="token arrow operator">=></span> <span class="token punctuation">&#123;</span>
    sideEffects<span class="token punctuation">.</span><span class="token method function property-access">push</span><span class="token punctuation">(</span>fn<span class="token punctuation">)</span><span class="token punctuation">;</span>
  <span class="token punctuation">&#125;</span><span class="token punctuation">;</span>
  <span class="token comment">// highlight-end</span>

  <span class="token comment">// run our entry point</span>
  <span class="token keyword">function</span> <span class="token function">runMain</span><span class="token punctuation">(</span><span class="token punctuation">)</span> <span class="token punctuation">&#123;</span>
    <span class="token keyword">try</span> <span class="token punctuation">&#123;</span>
      <span class="token function">mainFn</span><span class="token punctuation">(</span><span class="token punctuation">)</span><span class="token punctuation">;</span>
      <span class="token comment">// highlight-next-line</span>
      sideEffects<span class="token punctuation">.</span><span class="token method function property-access">forEach</span><span class="token punctuation">(</span><span class="token parameter">fn</span> <span class="token arrow operator">=></span> <span class="token function">fn</span><span class="token punctuation">(</span><span class="token punctuation">)</span><span class="token punctuation">)</span><span class="token punctuation">;</span>
    <span class="token punctuation">&#125;</span> <span class="token keyword">catch</span> <span class="token punctuation">(</span>error<span class="token punctuation">)</span> <span class="token punctuation">&#123;</span>
      <span class="token comment">// highlight-start</span>
      <span class="token comment">// clear side effects</span>
      sideEffects<span class="token punctuation">.</span><span class="token method function property-access">splice</span><span class="token punctuation">(</span><span class="token number">0</span><span class="token punctuation">,</span> sideEffects<span class="token punctuation">.</span><span class="token property-access">length</span><span class="token punctuation">)</span><span class="token punctuation">;</span>
      <span class="token comment">// highlight-end</span>
    <span class="token punctuation">&#125;</span>
  <span class="token punctuation">&#125;</span>
  <span class="token function">runMain</span><span class="token punctuation">(</span><span class="token punctuation">)</span><span class="token punctuation">;</span>
<span class="token punctuation">&#125;</span></code>` + "";

	let t150;
	let p34;
	let t151;
	let code23;
	let t152;
	let t153;
	let t154;
	let p35;
	let t155;
	let code24;
	let t156;
	let t157;
	let t158;
	let p36;
	let t159;
	let t160;
	let p37;
	let t161;
	let t162;
	let iframe;
	let iframe_src_value;
	let t163;
	let section5;
	let h21;
	let a15;
	let t164;
	let t165;
	let p38;
	let t166;
	let t167;
	let p39;
	let t168;
	let t169;
	let p40;
	let t170;
	let t171;
	let section6;
	let h22;
	let a16;
	let t172;
	let t173;
	let p41;
	let t174;
	let a17;
	let t175;
	let t176;
	let t177;
	let pre13;

	let raw13_value = `
<code class="language-js"><span class="token keyword">function</span> <span class="token function"><span class="token maybe-class-name">Component</span></span><span class="token punctuation">(</span><span class="token punctuation">)</span> <span class="token punctuation">&#123;</span>
  <span class="token keyword">const</span> data <span class="token operator">=</span> <span class="token function">getDataFromNetwork</span><span class="token punctuation">(</span><span class="token punctuation">)</span><span class="token punctuation">;</span>
  <span class="token keyword">return</span> <span class="token operator">&lt;</span>div <span class="token operator">/</span><span class="token operator">></span><span class="token punctuation">;</span>
<span class="token punctuation">&#125;</span></code>` + "";

	let t178;
	let p42;
	let code25;
	let t179;
	let t180;
	let t181;
	let p43;
	let t182;
	let t183;
	let ul4;
	let li8;
	let t184;
	let code26;
	let t185;
	let t186;
	let code27;
	let t187;
	let t188;
	let t189;
	let li9;
	let t190;
	let t191;
	let li10;
	let t192;
	let code28;
	let t193;
	let t194;
	let code29;
	let t195;
	let t196;
	let t197;
	let li11;
	let t198;
	let code30;
	let t199;
	let t200;
	let t201;
	let li12;
	let t202;
	let code31;
	let t203;
	let t204;
	let t205;
	let section7;
	let h33;
	let a18;
	let t206;
	let t207;
	let p44;
	let t208;
	let t209;
	let p45;
	let t210;
	let a19;
	let t211;
	let t212;
	let t213;
	let section8;
	let h23;
	let a20;
	let t214;
	let t215;
	let p46;
	let t216;
	let a21;
	let t217;
	let t218;
	let t219;
	let p47;
	let t220;
	let a22;
	let t221;
	let t222;
	let t223;
	let p48;
	let t224;
	let t225;
	let ul5;
	let li13;
	let t226;
	let a23;
	let t227;
	let t228;
	let li14;
	let t229;
	let a24;
	let t230;

	return {
		c() {
			section0 = element("section");
			ul3 = element("ul");
			ul0 = element("ul");
			li0 = element("li");
			a0 = element("a");
			t0 = text("Every function has a color");
			li1 = element("li");
			a1 = element("a");
			t1 = text("Writing \"the runtime\"");
			ul1 = element("ul");
			li2 = element("li");
			a2 = element("a");
			t2 = text("The first constraint: entry point");
			li3 = element("li");
			a3 = element("a");
			li4 = element("li");
			a4 = element("a");
			t3 = text("What have we done so far?");
			li5 = element("li");
			a5 = element("a");
			t4 = text("Okay cool. Why are we doing this?");
			ul2 = element("ul");
			li6 = element("li");
			a6 = element("a");
			t5 = text("Yet, this is not Suspense.");
			li7 = element("li");
			a7 = element("a");
			t6 = text("Closing Note");
			t7 = space();
			p0 = element("p");
			t8 = text("In JavaScript, IO (eg Filesystem IO, Network IO) is ");
			strong0 = element("strong");
			t9 = text("asynchronous");
			t10 = text(". That means when you are calling a function that involves IO, you got to have a callback function passed in to be notified when the IO is done.");
			t11 = space();
			pre0 = element("pre");
			t12 = space();
			p1 = element("p");
			t13 = text("It may seemed innocent at first, but once we start to chain multiple asynchronous calls, we end up in a situation known as the ");
			strong1 = element("strong");
			t14 = text("callback hell");
			t15 = text(", which without a doubt, is something really not nice to work with:");
			t16 = space();
			pre1 = element("pre");
			t17 = space();
			p2 = element("p");
			t18 = text("So we came up with ");
			a8 = element("a");
			t19 = text("Promise");
			t20 = text(" and ");
			a9 = element("a");
			code0 = element("code");
			t21 = text("async-await");
			t22 = text(", to make life easier.");
			t23 = space();
			p3 = element("p");
			code1 = element("code");
			t24 = text("async-await");
			t25 = text(" allows us to write asynchronous code like a synchronous one, using ");
			code2 = element("code");
			t26 = text("await");
			t27 = text(", you can pause the function, wait for the IO, and continue the execution.");
			t28 = space();
			pre2 = element("pre");
			t29 = space();
			p4 = element("p");
			t30 = text("What's more, you can catch all the error at once, magical right?");
			t31 = space();
			section1 = element("section");
			h30 = element("h3");
			a10 = element("a");
			t32 = text("Every function has a color");
			t33 = space();
			p5 = element("p");
			t34 = text("Still, ");
			code3 = element("code");
			t35 = text("async-await");
			t36 = text(" has its short-coming. Things go wrong when you forgot to use ");
			code4 = element("code");
			t37 = text("await");
			t38 = text(".");
			t39 = space();
			p6 = element("p");
			t40 = text("This could happen if you didn't know the implementation detail of ");
			code5 = element("code");
			t41 = text("getProfile");
			t42 = text(" where ");
			code6 = element("code");
			t43 = text("getProfile");
			t44 = text(" is asynchronous, because it makes an asynchronous IO call.");
			t45 = space();
			p7 = element("p");
			t46 = text("This leads to another problem, which is ");
			a11 = element("a");
			t47 = text("every function has a color");
			t48 = text(". As soon as you make an asynchronous call in a function, you have to make the function itself asynchronous, and the caller of this function to be asynchronous, and its caller too, ...!");
			t49 = space();
			p8 = element("p");
			t50 = text("So, is there another way to pause a JavaScript function, without having to ");
			code7 = element("code");
			t51 = text("await");
			t52 = text("?");
			t53 = space();
			pre3 = element("pre");
			t54 = space();
			p9 = element("p");
			t55 = text("This would be arguably much simpler, making everything seemingly \"synchronous\".");
			t56 = space();
			p10 = element("p");
			t57 = text("So, is this possible?");
			t58 = space();
			p11 = element("p");
			t59 = text("To be able to pause a JavaScript function, is something decided in the JavaScript runtime.");
			t60 = space();
			p12 = element("p");
			strong2 = element("strong");
			t61 = text("So are we diving into the JavaScript runtime engine today?");
			t62 = space();
			p13 = element("p");
			t63 = text("Not really, I don't know much about C++ or whatever language the JavaScript runtime is implemented. 🙈");
			t64 = space();
			p14 = element("p");
			t65 = text("But we are going to write a simple runtime in JavaScript, with some constraints. ");
			em = element("em");
			t66 = text("(Come on, it is hard to write a full blown runtime, adding constraints will make it easier for me to finish it in one blog post)");
			t67 = space();
			section2 = element("section");
			h20 = element("h2");
			a12 = element("a");
			t68 = text("Writing \"the runtime\"");
			t69 = space();
			section3 = element("section");
			h31 = element("h3");
			a13 = element("a");
			t70 = text("The first constraint: entry point");
			t71 = space();
			p15 = element("p");
			t72 = text("The first constraint for the runtime, is to have an entry point.");
			t73 = space();
			p16 = element("p");
			t74 = text("In our case, we are going to make ");
			code8 = element("code");
			t75 = text("main");
			t76 = text(" our entry point:");
			t77 = space();
			pre4 = element("pre");
			t78 = space();
			p17 = element("p");
			t79 = text("So our runtime looks something like this:");
			t80 = space();
			pre5 = element("pre");
			t81 = space();
			p18 = element("p");
			t82 = text("Ok, so we have our basic structure, what's next?");
			t83 = space();
			p19 = element("p");
			t84 = text("Firstly, we need to figure how to pause a JS function midway, without using ");
			code9 = element("code");
			t85 = text("await");
			t86 = text(".");
			t87 = space();
			p20 = element("p");
			t88 = text("Well, there's ");
			code10 = element("code");
			t89 = text("throw");
			t90 = text(" or ");
			code11 = element("code");
			t91 = text("return");
			t92 = text(", which is able to exit the JS function midway. I gonna choose ");
			code12 = element("code");
			t93 = text("throw");
			t94 = text(", which is more suited to exit the function \"unexpectedly\", rather than ");
			code13 = element("code");
			t95 = text("return");
			t96 = text(" which is more for exit normally:");
			t97 = space();
			pre6 = element("pre");
			t98 = space();
			p21 = element("p");
			t99 = text("But in both cases, there's no way to \"resume\" the function. However, it is still a good starting point.");
			t100 = space();
			p22 = element("p");
			t101 = text("One way of \"resuming\" the function is to rerun the ");
			code14 = element("code");
			t102 = text("main");
			t103 = text(" function again.");
			t104 = space();
			pre7 = element("pre");
			t105 = space();
			p23 = element("p");
			t106 = text("Ignore all the doubts you have for why rerunning the entire ");
			code15 = element("code");
			t107 = text("main");
			t108 = text(" function is a bad idea for \"resuming\" the function for now.");
			t109 = space();
			p24 = element("p");
			t110 = text("The current implementation is inaccurate, and will lead us to an infinite loop, because we \"resumed\" the \"paused\" function immediately, which should be only after the ");
			code16 = element("code");
			t111 = text("window.fetch");
			t112 = text(" had succeeded:");
			t113 = space();
			pre8 = element("pre");
			t114 = space();
			p25 = element("p");
			t115 = text("Still the infinite-loop still happened, that's because ");
			code17 = element("code");
			t116 = text("window.fetch");
			t117 = text(" should return the response object when \"resumed\":");
			t118 = space();
			pre9 = element("pre");
			t119 = space();
			p26 = element("p");
			t120 = text("How do we throw Error when the ");
			code18 = element("code");
			t121 = text("fetch");
			t122 = text(" is called the 1st time, and return the response for the subsequent calls?");
			t123 = space();
			p27 = element("p");
			t124 = text("One can achieve it by caching the response:");
			t125 = space();
			pre10 = element("pre");
			t126 = space();
			p28 = element("p");
			t127 = text("It works!");
			t128 = space();
			p29 = element("p");
			t129 = text("After running the main function a few times, by \"pausing\" and \"resuming\", or shall I say, \"early exit\" and \"rerun\", we finally hit the last statement of the main function and finish the function.");
			t130 = space();
			p30 = element("p");
			t131 = text("Except, if you look at the console, because of rerunning multiple times, we see the ");
			code19 = element("code");
			t132 = text("\"Getting wedding: 123\"");
			t133 = text(" multiple times!");
			t134 = space();
			p31 = element("p");
			t135 = text("That is because, ");
			code20 = element("code");
			t136 = text("console.log");
			t137 = text(" has side effects!");
			t138 = space();
			section4 = element("section");
			h32 = element("h3");
			a14 = element("a");
			strong3 = element("strong");
			t139 = text("The second constraint: pure functions");
			t140 = space();
			p32 = element("p");
			t141 = text("The second constraint of our runtime is to use only pure functions. If you wish to call functions with side effects, you have to use our special construct, ");
			code21 = element("code");
			t142 = text("runSideEffects()");
			t143 = text(":");
			t144 = space();
			pre11 = element("pre");
			t145 = space();
			p33 = element("p");
			t146 = text("So, how is ");
			code22 = element("code");
			t147 = text("runSideEffects");
			t148 = text(" implemented?");
			t149 = space();
			pre12 = element("pre");
			t150 = space();
			p34 = element("p");
			t151 = text("What we are trying to do here is that, we push all the side effects into an array, and only run all of them when we finally finish our ");
			code23 = element("code");
			t152 = text("main");
			t153 = text(" function.");
			t154 = space();
			p35 = element("p");
			t155 = text("And if we \"paused\" our function, before rerunning the ");
			code24 = element("code");
			t156 = text("main");
			t157 = text(" function to \"resume\", we clear all the side effects, since the same side effects will be pushed into the array again.");
			t158 = space();
			p36 = element("p");
			t159 = text("Run it again, and yes it works!");
			t160 = space();
			p37 = element("p");
			t161 = text("You can try out the complete code in the CodeSandbox:");
			t162 = space();
			iframe = element("iframe");
			t163 = space();
			section5 = element("section");
			h21 = element("h2");
			a15 = element("a");
			t164 = text("What have we done so far?");
			t165 = space();
			p38 = element("p");
			t166 = text("To mimic a pause and resume a function in JavaScript, we can throw an error to \"pause\" the execution of the function halfway, and \"resume\" it by reruning the function.");
			t167 = space();
			p39 = element("p");
			t168 = text("To \"resuming\" from where it left off, the point of where we threw an error should now returning a value instead, so that it feels like we are picking up and resuming from that point. To achieve this, we can use some caching mechanism.");
			t169 = space();
			p40 = element("p");
			t170 = text("Lastly, to safely reruning the function multiple times, we need to make sure that the function is pure. If we have side effects, we need to collect them and only apply them when the function has successfully reach the end.");
			t171 = space();
			section6 = element("section");
			h22 = element("h2");
			a16 = element("a");
			t172 = text("Okay cool. Why are we doing this?");
			t173 = space();
			p41 = element("p");
			t174 = text("Well, the idea of how to pause and resume a JavaScript function comes when I was reading about ");
			a17 = element("a");
			t175 = text("React Suspense");
			t176 = text(". With Suspense, fetching / getting data can be written declaratively:");
			t177 = space();
			pre13 = element("pre");
			t178 = space();
			p42 = element("p");
			code25 = element("code");
			t179 = text("getDataFromNetwork");
			t180 = text(" will get actually get the data from the network, which is asynchronous, but how did React make it look like it is synchronous?");
			t181 = space();
			p43 = element("p");
			t182 = text("Think of how you would have written in React:");
			t183 = space();
			ul4 = element("ul");
			li8 = element("li");
			t184 = text("Instead of providing an entry point, your ");
			code26 = element("code");
			t185 = text("render");
			t186 = text(" function is the entry point for React. To \"resume\" each \"pause\" the render, React calls the ");
			code27 = element("code");
			t187 = text("render");
			t188 = text(" function multiple times.");
			t189 = space();
			li9 = element("li");
			t190 = text("Your render function has to be pure and side-effects free");
			t191 = space();
			li10 = element("li");
			t192 = text("To ");
			code28 = element("code");
			t193 = text("runSideEffects");
			t194 = text(", you use ");
			code29 = element("code");
			t195 = text("React.useEffect");
			t196 = text(" instead.");
			t197 = space();
			li11 = element("li");
			t198 = text("To fetch + cache, you use ");
			code30 = element("code");
			t199 = text("react-cache");
			t200 = text(" to create a resource.");
			t201 = space();
			li12 = element("li");
			t202 = text("Except, instead of \"pause\" and do nothing, React handles the \"pause\" with the nearest ");
			code31 = element("code");
			t203 = text("<Suspense />");
			t204 = text(" componnet to render some fallback content. When the promise is resolve, React \"resumes\" the render and render the content with the data.");
			t205 = space();
			section7 = element("section");
			h33 = element("h3");
			a18 = element("a");
			t206 = text("Yet, this is not Suspense.");
			t207 = space();
			p44 = element("p");
			t208 = text("No, I dont think so.");
			t209 = space();
			p45 = element("p");
			t210 = text("Suspense is based on some function programming concept, called the \"one-shot delimited continuation\", which is explained in Dan Abramov's ");
			a19 = element("a");
			t211 = text("\"Algebraic Effects for the Rest of Us\"");
			t212 = text(".");
			t213 = space();
			section8 = element("section");
			h23 = element("h2");
			a20 = element("a");
			t214 = text("Closing Note");
			t215 = space();
			p46 = element("p");
			t216 = text("This whole article is based on a thought experiment I had when I was trying to understand the mechanics of ");
			a21 = element("a");
			t217 = text("React Suspense");
			t218 = text(". So, pardon me if the flow of the content is a bit awkward or crude.");
			t219 = space();
			p47 = element("p");
			t220 = text("Yet, after writing my thought process out, I did more research, and realised that \"pausing and resuming execution\" is a concept called ");
			a22 = element("a");
			t221 = text("\"continuations\"");
			t222 = text(" in functional programming.");
			t223 = space();
			p48 = element("p");
			t224 = text("So, if you are interested to learn more, here are some starting points:");
			t225 = space();
			ul5 = element("ul");
			li13 = element("li");
			t226 = text("James Long's ");
			a23 = element("a");
			t227 = text("What's in a Continuation");
			t228 = space();
			li14 = element("li");
			t229 = text("Florian Loitsch's ");
			a24 = element("a");
			t230 = text("Exceptional Continuations in JavaScript");
			this.h();
		},
		l(nodes) {
			section0 = claim_element(nodes, "SECTION", {});
			var section0_nodes = children(section0);

			ul3 = claim_element(section0_nodes, "UL", {
				class: true,
				id: true,
				role: true,
				"aria-label": true
			});

			var ul3_nodes = children(ul3);
			ul0 = claim_element(ul3_nodes, "UL", {});
			var ul0_nodes = children(ul0);
			li0 = claim_element(ul0_nodes, "LI", {});
			var li0_nodes = children(li0);
			a0 = claim_element(li0_nodes, "A", { href: true });
			var a0_nodes = children(a0);
			t0 = claim_text(a0_nodes, "Every function has a color");
			a0_nodes.forEach(detach);
			li0_nodes.forEach(detach);
			ul0_nodes.forEach(detach);
			li1 = claim_element(ul3_nodes, "LI", {});
			var li1_nodes = children(li1);
			a1 = claim_element(li1_nodes, "A", { href: true });
			var a1_nodes = children(a1);
			t1 = claim_text(a1_nodes, "Writing \"the runtime\"");
			a1_nodes.forEach(detach);
			li1_nodes.forEach(detach);
			ul1 = claim_element(ul3_nodes, "UL", {});
			var ul1_nodes = children(ul1);
			li2 = claim_element(ul1_nodes, "LI", {});
			var li2_nodes = children(li2);
			a2 = claim_element(li2_nodes, "A", { href: true });
			var a2_nodes = children(a2);
			t2 = claim_text(a2_nodes, "The first constraint: entry point");
			a2_nodes.forEach(detach);
			li2_nodes.forEach(detach);
			li3 = claim_element(ul1_nodes, "LI", {});
			var li3_nodes = children(li3);
			a3 = claim_element(li3_nodes, "A", { href: true });
			children(a3).forEach(detach);
			li3_nodes.forEach(detach);
			ul1_nodes.forEach(detach);
			li4 = claim_element(ul3_nodes, "LI", {});
			var li4_nodes = children(li4);
			a4 = claim_element(li4_nodes, "A", { href: true });
			var a4_nodes = children(a4);
			t3 = claim_text(a4_nodes, "What have we done so far?");
			a4_nodes.forEach(detach);
			li4_nodes.forEach(detach);
			li5 = claim_element(ul3_nodes, "LI", {});
			var li5_nodes = children(li5);
			a5 = claim_element(li5_nodes, "A", { href: true });
			var a5_nodes = children(a5);
			t4 = claim_text(a5_nodes, "Okay cool. Why are we doing this?");
			a5_nodes.forEach(detach);
			li5_nodes.forEach(detach);
			ul2 = claim_element(ul3_nodes, "UL", {});
			var ul2_nodes = children(ul2);
			li6 = claim_element(ul2_nodes, "LI", {});
			var li6_nodes = children(li6);
			a6 = claim_element(li6_nodes, "A", { href: true });
			var a6_nodes = children(a6);
			t5 = claim_text(a6_nodes, "Yet, this is not Suspense.");
			a6_nodes.forEach(detach);
			li6_nodes.forEach(detach);
			ul2_nodes.forEach(detach);
			li7 = claim_element(ul3_nodes, "LI", {});
			var li7_nodes = children(li7);
			a7 = claim_element(li7_nodes, "A", { href: true });
			var a7_nodes = children(a7);
			t6 = claim_text(a7_nodes, "Closing Note");
			a7_nodes.forEach(detach);
			li7_nodes.forEach(detach);
			ul3_nodes.forEach(detach);
			section0_nodes.forEach(detach);
			t7 = claim_space(nodes);
			p0 = claim_element(nodes, "P", {});
			var p0_nodes = children(p0);
			t8 = claim_text(p0_nodes, "In JavaScript, IO (eg Filesystem IO, Network IO) is ");
			strong0 = claim_element(p0_nodes, "STRONG", {});
			var strong0_nodes = children(strong0);
			t9 = claim_text(strong0_nodes, "asynchronous");
			strong0_nodes.forEach(detach);
			t10 = claim_text(p0_nodes, ". That means when you are calling a function that involves IO, you got to have a callback function passed in to be notified when the IO is done.");
			p0_nodes.forEach(detach);
			t11 = claim_space(nodes);
			pre0 = claim_element(nodes, "PRE", { class: true });
			var pre0_nodes = children(pre0);
			pre0_nodes.forEach(detach);
			t12 = claim_space(nodes);
			p1 = claim_element(nodes, "P", {});
			var p1_nodes = children(p1);
			t13 = claim_text(p1_nodes, "It may seemed innocent at first, but once we start to chain multiple asynchronous calls, we end up in a situation known as the ");
			strong1 = claim_element(p1_nodes, "STRONG", {});
			var strong1_nodes = children(strong1);
			t14 = claim_text(strong1_nodes, "callback hell");
			strong1_nodes.forEach(detach);
			t15 = claim_text(p1_nodes, ", which without a doubt, is something really not nice to work with:");
			p1_nodes.forEach(detach);
			t16 = claim_space(nodes);
			pre1 = claim_element(nodes, "PRE", { class: true });
			var pre1_nodes = children(pre1);
			pre1_nodes.forEach(detach);
			t17 = claim_space(nodes);
			p2 = claim_element(nodes, "P", {});
			var p2_nodes = children(p2);
			t18 = claim_text(p2_nodes, "So we came up with ");
			a8 = claim_element(p2_nodes, "A", { href: true, rel: true });
			var a8_nodes = children(a8);
			t19 = claim_text(a8_nodes, "Promise");
			a8_nodes.forEach(detach);
			t20 = claim_text(p2_nodes, " and ");
			a9 = claim_element(p2_nodes, "A", { href: true, rel: true });
			var a9_nodes = children(a9);
			code0 = claim_element(a9_nodes, "CODE", {});
			var code0_nodes = children(code0);
			t21 = claim_text(code0_nodes, "async-await");
			code0_nodes.forEach(detach);
			a9_nodes.forEach(detach);
			t22 = claim_text(p2_nodes, ", to make life easier.");
			p2_nodes.forEach(detach);
			t23 = claim_space(nodes);
			p3 = claim_element(nodes, "P", {});
			var p3_nodes = children(p3);
			code1 = claim_element(p3_nodes, "CODE", {});
			var code1_nodes = children(code1);
			t24 = claim_text(code1_nodes, "async-await");
			code1_nodes.forEach(detach);
			t25 = claim_text(p3_nodes, " allows us to write asynchronous code like a synchronous one, using ");
			code2 = claim_element(p3_nodes, "CODE", {});
			var code2_nodes = children(code2);
			t26 = claim_text(code2_nodes, "await");
			code2_nodes.forEach(detach);
			t27 = claim_text(p3_nodes, ", you can pause the function, wait for the IO, and continue the execution.");
			p3_nodes.forEach(detach);
			t28 = claim_space(nodes);
			pre2 = claim_element(nodes, "PRE", { class: true });
			var pre2_nodes = children(pre2);
			pre2_nodes.forEach(detach);
			t29 = claim_space(nodes);
			p4 = claim_element(nodes, "P", {});
			var p4_nodes = children(p4);
			t30 = claim_text(p4_nodes, "What's more, you can catch all the error at once, magical right?");
			p4_nodes.forEach(detach);
			t31 = claim_space(nodes);
			section1 = claim_element(nodes, "SECTION", {});
			var section1_nodes = children(section1);
			h30 = claim_element(section1_nodes, "H3", {});
			var h30_nodes = children(h30);
			a10 = claim_element(h30_nodes, "A", { href: true, id: true });
			var a10_nodes = children(a10);
			t32 = claim_text(a10_nodes, "Every function has a color");
			a10_nodes.forEach(detach);
			h30_nodes.forEach(detach);
			t33 = claim_space(section1_nodes);
			p5 = claim_element(section1_nodes, "P", {});
			var p5_nodes = children(p5);
			t34 = claim_text(p5_nodes, "Still, ");
			code3 = claim_element(p5_nodes, "CODE", {});
			var code3_nodes = children(code3);
			t35 = claim_text(code3_nodes, "async-await");
			code3_nodes.forEach(detach);
			t36 = claim_text(p5_nodes, " has its short-coming. Things go wrong when you forgot to use ");
			code4 = claim_element(p5_nodes, "CODE", {});
			var code4_nodes = children(code4);
			t37 = claim_text(code4_nodes, "await");
			code4_nodes.forEach(detach);
			t38 = claim_text(p5_nodes, ".");
			p5_nodes.forEach(detach);
			t39 = claim_space(section1_nodes);
			p6 = claim_element(section1_nodes, "P", {});
			var p6_nodes = children(p6);
			t40 = claim_text(p6_nodes, "This could happen if you didn't know the implementation detail of ");
			code5 = claim_element(p6_nodes, "CODE", {});
			var code5_nodes = children(code5);
			t41 = claim_text(code5_nodes, "getProfile");
			code5_nodes.forEach(detach);
			t42 = claim_text(p6_nodes, " where ");
			code6 = claim_element(p6_nodes, "CODE", {});
			var code6_nodes = children(code6);
			t43 = claim_text(code6_nodes, "getProfile");
			code6_nodes.forEach(detach);
			t44 = claim_text(p6_nodes, " is asynchronous, because it makes an asynchronous IO call.");
			p6_nodes.forEach(detach);
			t45 = claim_space(section1_nodes);
			p7 = claim_element(section1_nodes, "P", {});
			var p7_nodes = children(p7);
			t46 = claim_text(p7_nodes, "This leads to another problem, which is ");
			a11 = claim_element(p7_nodes, "A", { href: true, rel: true });
			var a11_nodes = children(a11);
			t47 = claim_text(a11_nodes, "every function has a color");
			a11_nodes.forEach(detach);
			t48 = claim_text(p7_nodes, ". As soon as you make an asynchronous call in a function, you have to make the function itself asynchronous, and the caller of this function to be asynchronous, and its caller too, ...!");
			p7_nodes.forEach(detach);
			t49 = claim_space(section1_nodes);
			p8 = claim_element(section1_nodes, "P", {});
			var p8_nodes = children(p8);
			t50 = claim_text(p8_nodes, "So, is there another way to pause a JavaScript function, without having to ");
			code7 = claim_element(p8_nodes, "CODE", {});
			var code7_nodes = children(code7);
			t51 = claim_text(code7_nodes, "await");
			code7_nodes.forEach(detach);
			t52 = claim_text(p8_nodes, "?");
			p8_nodes.forEach(detach);
			t53 = claim_space(section1_nodes);
			pre3 = claim_element(section1_nodes, "PRE", { class: true });
			var pre3_nodes = children(pre3);
			pre3_nodes.forEach(detach);
			t54 = claim_space(section1_nodes);
			p9 = claim_element(section1_nodes, "P", {});
			var p9_nodes = children(p9);
			t55 = claim_text(p9_nodes, "This would be arguably much simpler, making everything seemingly \"synchronous\".");
			p9_nodes.forEach(detach);
			t56 = claim_space(section1_nodes);
			p10 = claim_element(section1_nodes, "P", {});
			var p10_nodes = children(p10);
			t57 = claim_text(p10_nodes, "So, is this possible?");
			p10_nodes.forEach(detach);
			t58 = claim_space(section1_nodes);
			p11 = claim_element(section1_nodes, "P", {});
			var p11_nodes = children(p11);
			t59 = claim_text(p11_nodes, "To be able to pause a JavaScript function, is something decided in the JavaScript runtime.");
			p11_nodes.forEach(detach);
			t60 = claim_space(section1_nodes);
			p12 = claim_element(section1_nodes, "P", {});
			var p12_nodes = children(p12);
			strong2 = claim_element(p12_nodes, "STRONG", {});
			var strong2_nodes = children(strong2);
			t61 = claim_text(strong2_nodes, "So are we diving into the JavaScript runtime engine today?");
			strong2_nodes.forEach(detach);
			p12_nodes.forEach(detach);
			t62 = claim_space(section1_nodes);
			p13 = claim_element(section1_nodes, "P", {});
			var p13_nodes = children(p13);
			t63 = claim_text(p13_nodes, "Not really, I don't know much about C++ or whatever language the JavaScript runtime is implemented. 🙈");
			p13_nodes.forEach(detach);
			t64 = claim_space(section1_nodes);
			p14 = claim_element(section1_nodes, "P", {});
			var p14_nodes = children(p14);
			t65 = claim_text(p14_nodes, "But we are going to write a simple runtime in JavaScript, with some constraints. ");
			em = claim_element(p14_nodes, "EM", {});
			var em_nodes = children(em);
			t66 = claim_text(em_nodes, "(Come on, it is hard to write a full blown runtime, adding constraints will make it easier for me to finish it in one blog post)");
			em_nodes.forEach(detach);
			p14_nodes.forEach(detach);
			section1_nodes.forEach(detach);
			t67 = claim_space(nodes);
			section2 = claim_element(nodes, "SECTION", {});
			var section2_nodes = children(section2);
			h20 = claim_element(section2_nodes, "H2", {});
			var h20_nodes = children(h20);
			a12 = claim_element(h20_nodes, "A", { href: true, id: true });
			var a12_nodes = children(a12);
			t68 = claim_text(a12_nodes, "Writing \"the runtime\"");
			a12_nodes.forEach(detach);
			h20_nodes.forEach(detach);
			section2_nodes.forEach(detach);
			t69 = claim_space(nodes);
			section3 = claim_element(nodes, "SECTION", {});
			var section3_nodes = children(section3);
			h31 = claim_element(section3_nodes, "H3", {});
			var h31_nodes = children(h31);
			a13 = claim_element(h31_nodes, "A", { href: true, id: true });
			var a13_nodes = children(a13);
			t70 = claim_text(a13_nodes, "The first constraint: entry point");
			a13_nodes.forEach(detach);
			h31_nodes.forEach(detach);
			t71 = claim_space(section3_nodes);
			p15 = claim_element(section3_nodes, "P", {});
			var p15_nodes = children(p15);
			t72 = claim_text(p15_nodes, "The first constraint for the runtime, is to have an entry point.");
			p15_nodes.forEach(detach);
			t73 = claim_space(section3_nodes);
			p16 = claim_element(section3_nodes, "P", {});
			var p16_nodes = children(p16);
			t74 = claim_text(p16_nodes, "In our case, we are going to make ");
			code8 = claim_element(p16_nodes, "CODE", {});
			var code8_nodes = children(code8);
			t75 = claim_text(code8_nodes, "main");
			code8_nodes.forEach(detach);
			t76 = claim_text(p16_nodes, " our entry point:");
			p16_nodes.forEach(detach);
			t77 = claim_space(section3_nodes);
			pre4 = claim_element(section3_nodes, "PRE", { class: true });
			var pre4_nodes = children(pre4);
			pre4_nodes.forEach(detach);
			t78 = claim_space(section3_nodes);
			p17 = claim_element(section3_nodes, "P", {});
			var p17_nodes = children(p17);
			t79 = claim_text(p17_nodes, "So our runtime looks something like this:");
			p17_nodes.forEach(detach);
			t80 = claim_space(section3_nodes);
			pre5 = claim_element(section3_nodes, "PRE", { class: true });
			var pre5_nodes = children(pre5);
			pre5_nodes.forEach(detach);
			t81 = claim_space(section3_nodes);
			p18 = claim_element(section3_nodes, "P", {});
			var p18_nodes = children(p18);
			t82 = claim_text(p18_nodes, "Ok, so we have our basic structure, what's next?");
			p18_nodes.forEach(detach);
			t83 = claim_space(section3_nodes);
			p19 = claim_element(section3_nodes, "P", {});
			var p19_nodes = children(p19);
			t84 = claim_text(p19_nodes, "Firstly, we need to figure how to pause a JS function midway, without using ");
			code9 = claim_element(p19_nodes, "CODE", {});
			var code9_nodes = children(code9);
			t85 = claim_text(code9_nodes, "await");
			code9_nodes.forEach(detach);
			t86 = claim_text(p19_nodes, ".");
			p19_nodes.forEach(detach);
			t87 = claim_space(section3_nodes);
			p20 = claim_element(section3_nodes, "P", {});
			var p20_nodes = children(p20);
			t88 = claim_text(p20_nodes, "Well, there's ");
			code10 = claim_element(p20_nodes, "CODE", {});
			var code10_nodes = children(code10);
			t89 = claim_text(code10_nodes, "throw");
			code10_nodes.forEach(detach);
			t90 = claim_text(p20_nodes, " or ");
			code11 = claim_element(p20_nodes, "CODE", {});
			var code11_nodes = children(code11);
			t91 = claim_text(code11_nodes, "return");
			code11_nodes.forEach(detach);
			t92 = claim_text(p20_nodes, ", which is able to exit the JS function midway. I gonna choose ");
			code12 = claim_element(p20_nodes, "CODE", {});
			var code12_nodes = children(code12);
			t93 = claim_text(code12_nodes, "throw");
			code12_nodes.forEach(detach);
			t94 = claim_text(p20_nodes, ", which is more suited to exit the function \"unexpectedly\", rather than ");
			code13 = claim_element(p20_nodes, "CODE", {});
			var code13_nodes = children(code13);
			t95 = claim_text(code13_nodes, "return");
			code13_nodes.forEach(detach);
			t96 = claim_text(p20_nodes, " which is more for exit normally:");
			p20_nodes.forEach(detach);
			t97 = claim_space(section3_nodes);
			pre6 = claim_element(section3_nodes, "PRE", { class: true });
			var pre6_nodes = children(pre6);
			pre6_nodes.forEach(detach);
			t98 = claim_space(section3_nodes);
			p21 = claim_element(section3_nodes, "P", {});
			var p21_nodes = children(p21);
			t99 = claim_text(p21_nodes, "But in both cases, there's no way to \"resume\" the function. However, it is still a good starting point.");
			p21_nodes.forEach(detach);
			t100 = claim_space(section3_nodes);
			p22 = claim_element(section3_nodes, "P", {});
			var p22_nodes = children(p22);
			t101 = claim_text(p22_nodes, "One way of \"resuming\" the function is to rerun the ");
			code14 = claim_element(p22_nodes, "CODE", {});
			var code14_nodes = children(code14);
			t102 = claim_text(code14_nodes, "main");
			code14_nodes.forEach(detach);
			t103 = claim_text(p22_nodes, " function again.");
			p22_nodes.forEach(detach);
			t104 = claim_space(section3_nodes);
			pre7 = claim_element(section3_nodes, "PRE", { class: true });
			var pre7_nodes = children(pre7);
			pre7_nodes.forEach(detach);
			t105 = claim_space(section3_nodes);
			p23 = claim_element(section3_nodes, "P", {});
			var p23_nodes = children(p23);
			t106 = claim_text(p23_nodes, "Ignore all the doubts you have for why rerunning the entire ");
			code15 = claim_element(p23_nodes, "CODE", {});
			var code15_nodes = children(code15);
			t107 = claim_text(code15_nodes, "main");
			code15_nodes.forEach(detach);
			t108 = claim_text(p23_nodes, " function is a bad idea for \"resuming\" the function for now.");
			p23_nodes.forEach(detach);
			t109 = claim_space(section3_nodes);
			p24 = claim_element(section3_nodes, "P", {});
			var p24_nodes = children(p24);
			t110 = claim_text(p24_nodes, "The current implementation is inaccurate, and will lead us to an infinite loop, because we \"resumed\" the \"paused\" function immediately, which should be only after the ");
			code16 = claim_element(p24_nodes, "CODE", {});
			var code16_nodes = children(code16);
			t111 = claim_text(code16_nodes, "window.fetch");
			code16_nodes.forEach(detach);
			t112 = claim_text(p24_nodes, " had succeeded:");
			p24_nodes.forEach(detach);
			t113 = claim_space(section3_nodes);
			pre8 = claim_element(section3_nodes, "PRE", { class: true });
			var pre8_nodes = children(pre8);
			pre8_nodes.forEach(detach);
			t114 = claim_space(section3_nodes);
			p25 = claim_element(section3_nodes, "P", {});
			var p25_nodes = children(p25);
			t115 = claim_text(p25_nodes, "Still the infinite-loop still happened, that's because ");
			code17 = claim_element(p25_nodes, "CODE", {});
			var code17_nodes = children(code17);
			t116 = claim_text(code17_nodes, "window.fetch");
			code17_nodes.forEach(detach);
			t117 = claim_text(p25_nodes, " should return the response object when \"resumed\":");
			p25_nodes.forEach(detach);
			t118 = claim_space(section3_nodes);
			pre9 = claim_element(section3_nodes, "PRE", { class: true });
			var pre9_nodes = children(pre9);
			pre9_nodes.forEach(detach);
			t119 = claim_space(section3_nodes);
			p26 = claim_element(section3_nodes, "P", {});
			var p26_nodes = children(p26);
			t120 = claim_text(p26_nodes, "How do we throw Error when the ");
			code18 = claim_element(p26_nodes, "CODE", {});
			var code18_nodes = children(code18);
			t121 = claim_text(code18_nodes, "fetch");
			code18_nodes.forEach(detach);
			t122 = claim_text(p26_nodes, " is called the 1st time, and return the response for the subsequent calls?");
			p26_nodes.forEach(detach);
			t123 = claim_space(section3_nodes);
			p27 = claim_element(section3_nodes, "P", {});
			var p27_nodes = children(p27);
			t124 = claim_text(p27_nodes, "One can achieve it by caching the response:");
			p27_nodes.forEach(detach);
			t125 = claim_space(section3_nodes);
			pre10 = claim_element(section3_nodes, "PRE", { class: true });
			var pre10_nodes = children(pre10);
			pre10_nodes.forEach(detach);
			t126 = claim_space(section3_nodes);
			p28 = claim_element(section3_nodes, "P", {});
			var p28_nodes = children(p28);
			t127 = claim_text(p28_nodes, "It works!");
			p28_nodes.forEach(detach);
			t128 = claim_space(section3_nodes);
			p29 = claim_element(section3_nodes, "P", {});
			var p29_nodes = children(p29);
			t129 = claim_text(p29_nodes, "After running the main function a few times, by \"pausing\" and \"resuming\", or shall I say, \"early exit\" and \"rerun\", we finally hit the last statement of the main function and finish the function.");
			p29_nodes.forEach(detach);
			t130 = claim_space(section3_nodes);
			p30 = claim_element(section3_nodes, "P", {});
			var p30_nodes = children(p30);
			t131 = claim_text(p30_nodes, "Except, if you look at the console, because of rerunning multiple times, we see the ");
			code19 = claim_element(p30_nodes, "CODE", {});
			var code19_nodes = children(code19);
			t132 = claim_text(code19_nodes, "\"Getting wedding: 123\"");
			code19_nodes.forEach(detach);
			t133 = claim_text(p30_nodes, " multiple times!");
			p30_nodes.forEach(detach);
			t134 = claim_space(section3_nodes);
			p31 = claim_element(section3_nodes, "P", {});
			var p31_nodes = children(p31);
			t135 = claim_text(p31_nodes, "That is because, ");
			code20 = claim_element(p31_nodes, "CODE", {});
			var code20_nodes = children(code20);
			t136 = claim_text(code20_nodes, "console.log");
			code20_nodes.forEach(detach);
			t137 = claim_text(p31_nodes, " has side effects!");
			p31_nodes.forEach(detach);
			section3_nodes.forEach(detach);
			t138 = claim_space(nodes);
			section4 = claim_element(nodes, "SECTION", {});
			var section4_nodes = children(section4);
			h32 = claim_element(section4_nodes, "H3", {});
			var h32_nodes = children(h32);
			a14 = claim_element(h32_nodes, "A", { href: true, id: true });
			var a14_nodes = children(a14);
			strong3 = claim_element(a14_nodes, "STRONG", {});
			var strong3_nodes = children(strong3);
			t139 = claim_text(strong3_nodes, "The second constraint: pure functions");
			strong3_nodes.forEach(detach);
			a14_nodes.forEach(detach);
			h32_nodes.forEach(detach);
			t140 = claim_space(section4_nodes);
			p32 = claim_element(section4_nodes, "P", {});
			var p32_nodes = children(p32);
			t141 = claim_text(p32_nodes, "The second constraint of our runtime is to use only pure functions. If you wish to call functions with side effects, you have to use our special construct, ");
			code21 = claim_element(p32_nodes, "CODE", {});
			var code21_nodes = children(code21);
			t142 = claim_text(code21_nodes, "runSideEffects()");
			code21_nodes.forEach(detach);
			t143 = claim_text(p32_nodes, ":");
			p32_nodes.forEach(detach);
			t144 = claim_space(section4_nodes);
			pre11 = claim_element(section4_nodes, "PRE", { class: true });
			var pre11_nodes = children(pre11);
			pre11_nodes.forEach(detach);
			t145 = claim_space(section4_nodes);
			p33 = claim_element(section4_nodes, "P", {});
			var p33_nodes = children(p33);
			t146 = claim_text(p33_nodes, "So, how is ");
			code22 = claim_element(p33_nodes, "CODE", {});
			var code22_nodes = children(code22);
			t147 = claim_text(code22_nodes, "runSideEffects");
			code22_nodes.forEach(detach);
			t148 = claim_text(p33_nodes, " implemented?");
			p33_nodes.forEach(detach);
			t149 = claim_space(section4_nodes);
			pre12 = claim_element(section4_nodes, "PRE", { class: true });
			var pre12_nodes = children(pre12);
			pre12_nodes.forEach(detach);
			t150 = claim_space(section4_nodes);
			p34 = claim_element(section4_nodes, "P", {});
			var p34_nodes = children(p34);
			t151 = claim_text(p34_nodes, "What we are trying to do here is that, we push all the side effects into an array, and only run all of them when we finally finish our ");
			code23 = claim_element(p34_nodes, "CODE", {});
			var code23_nodes = children(code23);
			t152 = claim_text(code23_nodes, "main");
			code23_nodes.forEach(detach);
			t153 = claim_text(p34_nodes, " function.");
			p34_nodes.forEach(detach);
			t154 = claim_space(section4_nodes);
			p35 = claim_element(section4_nodes, "P", {});
			var p35_nodes = children(p35);
			t155 = claim_text(p35_nodes, "And if we \"paused\" our function, before rerunning the ");
			code24 = claim_element(p35_nodes, "CODE", {});
			var code24_nodes = children(code24);
			t156 = claim_text(code24_nodes, "main");
			code24_nodes.forEach(detach);
			t157 = claim_text(p35_nodes, " function to \"resume\", we clear all the side effects, since the same side effects will be pushed into the array again.");
			p35_nodes.forEach(detach);
			t158 = claim_space(section4_nodes);
			p36 = claim_element(section4_nodes, "P", {});
			var p36_nodes = children(p36);
			t159 = claim_text(p36_nodes, "Run it again, and yes it works!");
			p36_nodes.forEach(detach);
			t160 = claim_space(section4_nodes);
			p37 = claim_element(section4_nodes, "P", {});
			var p37_nodes = children(p37);
			t161 = claim_text(p37_nodes, "You can try out the complete code in the CodeSandbox:");
			p37_nodes.forEach(detach);
			t162 = claim_space(section4_nodes);

			iframe = claim_element(section4_nodes, "IFRAME", {
				src: true,
				style: true,
				title: true,
				allow: true,
				sandbox: true
			});

			children(iframe).forEach(detach);
			section4_nodes.forEach(detach);
			t163 = claim_space(nodes);
			section5 = claim_element(nodes, "SECTION", {});
			var section5_nodes = children(section5);
			h21 = claim_element(section5_nodes, "H2", {});
			var h21_nodes = children(h21);
			a15 = claim_element(h21_nodes, "A", { href: true, id: true });
			var a15_nodes = children(a15);
			t164 = claim_text(a15_nodes, "What have we done so far?");
			a15_nodes.forEach(detach);
			h21_nodes.forEach(detach);
			t165 = claim_space(section5_nodes);
			p38 = claim_element(section5_nodes, "P", {});
			var p38_nodes = children(p38);
			t166 = claim_text(p38_nodes, "To mimic a pause and resume a function in JavaScript, we can throw an error to \"pause\" the execution of the function halfway, and \"resume\" it by reruning the function.");
			p38_nodes.forEach(detach);
			t167 = claim_space(section5_nodes);
			p39 = claim_element(section5_nodes, "P", {});
			var p39_nodes = children(p39);
			t168 = claim_text(p39_nodes, "To \"resuming\" from where it left off, the point of where we threw an error should now returning a value instead, so that it feels like we are picking up and resuming from that point. To achieve this, we can use some caching mechanism.");
			p39_nodes.forEach(detach);
			t169 = claim_space(section5_nodes);
			p40 = claim_element(section5_nodes, "P", {});
			var p40_nodes = children(p40);
			t170 = claim_text(p40_nodes, "Lastly, to safely reruning the function multiple times, we need to make sure that the function is pure. If we have side effects, we need to collect them and only apply them when the function has successfully reach the end.");
			p40_nodes.forEach(detach);
			section5_nodes.forEach(detach);
			t171 = claim_space(nodes);
			section6 = claim_element(nodes, "SECTION", {});
			var section6_nodes = children(section6);
			h22 = claim_element(section6_nodes, "H2", {});
			var h22_nodes = children(h22);
			a16 = claim_element(h22_nodes, "A", { href: true, id: true });
			var a16_nodes = children(a16);
			t172 = claim_text(a16_nodes, "Okay cool. Why are we doing this?");
			a16_nodes.forEach(detach);
			h22_nodes.forEach(detach);
			t173 = claim_space(section6_nodes);
			p41 = claim_element(section6_nodes, "P", {});
			var p41_nodes = children(p41);
			t174 = claim_text(p41_nodes, "Well, the idea of how to pause and resume a JavaScript function comes when I was reading about ");
			a17 = claim_element(p41_nodes, "A", { href: true, rel: true });
			var a17_nodes = children(a17);
			t175 = claim_text(a17_nodes, "React Suspense");
			a17_nodes.forEach(detach);
			t176 = claim_text(p41_nodes, ". With Suspense, fetching / getting data can be written declaratively:");
			p41_nodes.forEach(detach);
			t177 = claim_space(section6_nodes);
			pre13 = claim_element(section6_nodes, "PRE", { class: true });
			var pre13_nodes = children(pre13);
			pre13_nodes.forEach(detach);
			t178 = claim_space(section6_nodes);
			p42 = claim_element(section6_nodes, "P", {});
			var p42_nodes = children(p42);
			code25 = claim_element(p42_nodes, "CODE", {});
			var code25_nodes = children(code25);
			t179 = claim_text(code25_nodes, "getDataFromNetwork");
			code25_nodes.forEach(detach);
			t180 = claim_text(p42_nodes, " will get actually get the data from the network, which is asynchronous, but how did React make it look like it is synchronous?");
			p42_nodes.forEach(detach);
			t181 = claim_space(section6_nodes);
			p43 = claim_element(section6_nodes, "P", {});
			var p43_nodes = children(p43);
			t182 = claim_text(p43_nodes, "Think of how you would have written in React:");
			p43_nodes.forEach(detach);
			t183 = claim_space(section6_nodes);
			ul4 = claim_element(section6_nodes, "UL", {});
			var ul4_nodes = children(ul4);
			li8 = claim_element(ul4_nodes, "LI", {});
			var li8_nodes = children(li8);
			t184 = claim_text(li8_nodes, "Instead of providing an entry point, your ");
			code26 = claim_element(li8_nodes, "CODE", {});
			var code26_nodes = children(code26);
			t185 = claim_text(code26_nodes, "render");
			code26_nodes.forEach(detach);
			t186 = claim_text(li8_nodes, " function is the entry point for React. To \"resume\" each \"pause\" the render, React calls the ");
			code27 = claim_element(li8_nodes, "CODE", {});
			var code27_nodes = children(code27);
			t187 = claim_text(code27_nodes, "render");
			code27_nodes.forEach(detach);
			t188 = claim_text(li8_nodes, " function multiple times.");
			li8_nodes.forEach(detach);
			t189 = claim_space(ul4_nodes);
			li9 = claim_element(ul4_nodes, "LI", {});
			var li9_nodes = children(li9);
			t190 = claim_text(li9_nodes, "Your render function has to be pure and side-effects free");
			li9_nodes.forEach(detach);
			t191 = claim_space(ul4_nodes);
			li10 = claim_element(ul4_nodes, "LI", {});
			var li10_nodes = children(li10);
			t192 = claim_text(li10_nodes, "To ");
			code28 = claim_element(li10_nodes, "CODE", {});
			var code28_nodes = children(code28);
			t193 = claim_text(code28_nodes, "runSideEffects");
			code28_nodes.forEach(detach);
			t194 = claim_text(li10_nodes, ", you use ");
			code29 = claim_element(li10_nodes, "CODE", {});
			var code29_nodes = children(code29);
			t195 = claim_text(code29_nodes, "React.useEffect");
			code29_nodes.forEach(detach);
			t196 = claim_text(li10_nodes, " instead.");
			li10_nodes.forEach(detach);
			t197 = claim_space(ul4_nodes);
			li11 = claim_element(ul4_nodes, "LI", {});
			var li11_nodes = children(li11);
			t198 = claim_text(li11_nodes, "To fetch + cache, you use ");
			code30 = claim_element(li11_nodes, "CODE", {});
			var code30_nodes = children(code30);
			t199 = claim_text(code30_nodes, "react-cache");
			code30_nodes.forEach(detach);
			t200 = claim_text(li11_nodes, " to create a resource.");
			li11_nodes.forEach(detach);
			t201 = claim_space(ul4_nodes);
			li12 = claim_element(ul4_nodes, "LI", {});
			var li12_nodes = children(li12);
			t202 = claim_text(li12_nodes, "Except, instead of \"pause\" and do nothing, React handles the \"pause\" with the nearest ");
			code31 = claim_element(li12_nodes, "CODE", {});
			var code31_nodes = children(code31);
			t203 = claim_text(code31_nodes, "<Suspense />");
			code31_nodes.forEach(detach);
			t204 = claim_text(li12_nodes, " componnet to render some fallback content. When the promise is resolve, React \"resumes\" the render and render the content with the data.");
			li12_nodes.forEach(detach);
			ul4_nodes.forEach(detach);
			section6_nodes.forEach(detach);
			t205 = claim_space(nodes);
			section7 = claim_element(nodes, "SECTION", {});
			var section7_nodes = children(section7);
			h33 = claim_element(section7_nodes, "H3", {});
			var h33_nodes = children(h33);
			a18 = claim_element(h33_nodes, "A", { href: true, id: true });
			var a18_nodes = children(a18);
			t206 = claim_text(a18_nodes, "Yet, this is not Suspense.");
			a18_nodes.forEach(detach);
			h33_nodes.forEach(detach);
			t207 = claim_space(section7_nodes);
			p44 = claim_element(section7_nodes, "P", {});
			var p44_nodes = children(p44);
			t208 = claim_text(p44_nodes, "No, I dont think so.");
			p44_nodes.forEach(detach);
			t209 = claim_space(section7_nodes);
			p45 = claim_element(section7_nodes, "P", {});
			var p45_nodes = children(p45);
			t210 = claim_text(p45_nodes, "Suspense is based on some function programming concept, called the \"one-shot delimited continuation\", which is explained in Dan Abramov's ");
			a19 = claim_element(p45_nodes, "A", { href: true, rel: true });
			var a19_nodes = children(a19);
			t211 = claim_text(a19_nodes, "\"Algebraic Effects for the Rest of Us\"");
			a19_nodes.forEach(detach);
			t212 = claim_text(p45_nodes, ".");
			p45_nodes.forEach(detach);
			section7_nodes.forEach(detach);
			t213 = claim_space(nodes);
			section8 = claim_element(nodes, "SECTION", {});
			var section8_nodes = children(section8);
			h23 = claim_element(section8_nodes, "H2", {});
			var h23_nodes = children(h23);
			a20 = claim_element(h23_nodes, "A", { href: true, id: true });
			var a20_nodes = children(a20);
			t214 = claim_text(a20_nodes, "Closing Note");
			a20_nodes.forEach(detach);
			h23_nodes.forEach(detach);
			t215 = claim_space(section8_nodes);
			p46 = claim_element(section8_nodes, "P", {});
			var p46_nodes = children(p46);
			t216 = claim_text(p46_nodes, "This whole article is based on a thought experiment I had when I was trying to understand the mechanics of ");
			a21 = claim_element(p46_nodes, "A", { href: true, rel: true });
			var a21_nodes = children(a21);
			t217 = claim_text(a21_nodes, "React Suspense");
			a21_nodes.forEach(detach);
			t218 = claim_text(p46_nodes, ". So, pardon me if the flow of the content is a bit awkward or crude.");
			p46_nodes.forEach(detach);
			t219 = claim_space(section8_nodes);
			p47 = claim_element(section8_nodes, "P", {});
			var p47_nodes = children(p47);
			t220 = claim_text(p47_nodes, "Yet, after writing my thought process out, I did more research, and realised that \"pausing and resuming execution\" is a concept called ");
			a22 = claim_element(p47_nodes, "A", { href: true, rel: true });
			var a22_nodes = children(a22);
			t221 = claim_text(a22_nodes, "\"continuations\"");
			a22_nodes.forEach(detach);
			t222 = claim_text(p47_nodes, " in functional programming.");
			p47_nodes.forEach(detach);
			t223 = claim_space(section8_nodes);
			p48 = claim_element(section8_nodes, "P", {});
			var p48_nodes = children(p48);
			t224 = claim_text(p48_nodes, "So, if you are interested to learn more, here are some starting points:");
			p48_nodes.forEach(detach);
			t225 = claim_space(section8_nodes);
			ul5 = claim_element(section8_nodes, "UL", {});
			var ul5_nodes = children(ul5);
			li13 = claim_element(ul5_nodes, "LI", {});
			var li13_nodes = children(li13);
			t226 = claim_text(li13_nodes, "James Long's ");
			a23 = claim_element(li13_nodes, "A", { href: true, rel: true });
			var a23_nodes = children(a23);
			t227 = claim_text(a23_nodes, "What's in a Continuation");
			a23_nodes.forEach(detach);
			li13_nodes.forEach(detach);
			t228 = claim_space(ul5_nodes);
			li14 = claim_element(ul5_nodes, "LI", {});
			var li14_nodes = children(li14);
			t229 = claim_text(li14_nodes, "Florian Loitsch's ");
			a24 = claim_element(li14_nodes, "A", { href: true, rel: true });
			var a24_nodes = children(a24);
			t230 = claim_text(a24_nodes, "Exceptional Continuations in JavaScript");
			a24_nodes.forEach(detach);
			li14_nodes.forEach(detach);
			ul5_nodes.forEach(detach);
			section8_nodes.forEach(detach);
			this.h();
		},
		h() {
			attr(a0, "href", "#every-function-has-a-color");
			attr(a1, "href", "#writing-the-runtime");
			attr(a2, "href", "#the-first-constraint-entry-point");
			attr(a3, "href", "#");
			attr(a4, "href", "#what-have-we-done-so-far");
			attr(a5, "href", "#okay-cool-why-are-we-doing-this");
			attr(a6, "href", "#yet-this-is-not-suspense");
			attr(a7, "href", "#closing-note");
			attr(ul3, "class", "sitemap");
			attr(ul3, "id", "sitemap");
			attr(ul3, "role", "navigation");
			attr(ul3, "aria-label", "Table of Contents");
			attr(pre0, "class", "language-js");
			attr(pre1, "class", "language-js");
			attr(a8, "href", "https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Promise");
			attr(a8, "rel", "nofollow");
			attr(a9, "href", "https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Statements/async_function");
			attr(a9, "rel", "nofollow");
			attr(pre2, "class", "language-js");
			attr(a10, "href", "#every-function-has-a-color");
			attr(a10, "id", "every-function-has-a-color");
			attr(a11, "href", "https://journal.stuffwithstuff.com/2015/02/01/what-color-is-your-function/");
			attr(a11, "rel", "nofollow");
			attr(pre3, "class", "language-js");
			attr(a12, "href", "#writing-the-runtime");
			attr(a12, "id", "writing-the-runtime");
			attr(a13, "href", "#the-first-constraint-entry-point");
			attr(a13, "id", "the-first-constraint-entry-point");
			attr(pre4, "class", "language-js");
			attr(pre5, "class", "language-js");
			attr(pre6, "class", "language-js");
			attr(pre7, "class", "language-js");
			attr(pre8, "class", "language-js");
			attr(pre9, "class", "language-js");
			attr(pre10, "class", "language-js");
			attr(a14, "href", "#");
			attr(a14, "id", "");
			attr(pre11, "class", "language-js");
			attr(pre12, "class", "language-js");
			if (iframe.src !== (iframe_src_value = "https://codesandbox.io/embed/pausing-a-javascript-function-dh0mw?expanddevtools=1&fontsize=14&hidenavigation=1&theme=dark&view=editor")) attr(iframe, "src", iframe_src_value);
			set_style(iframe, "width", "100%");
			set_style(iframe, "height", "500px");
			set_style(iframe, "border", "0");
			set_style(iframe, "border-radius", "4px");
			set_style(iframe, "overflow", "hidden");
			attr(iframe, "title", "Pausing a JavaScript function");
			attr(iframe, "allow", "geolocation; microphone; camera; midi; vr; accelerometer; gyroscope; payment; ambient-light-sensor; encrypted-media; usb");
			attr(iframe, "sandbox", "allow-modals allow-forms allow-popups allow-scripts allow-same-origin");
			attr(a15, "href", "#what-have-we-done-so-far");
			attr(a15, "id", "what-have-we-done-so-far");
			attr(a16, "href", "#okay-cool-why-are-we-doing-this");
			attr(a16, "id", "okay-cool-why-are-we-doing-this");
			attr(a17, "href", "https://reactjs.org/docs/concurrent-mode-suspense.html#what-suspense-lets-you-do");
			attr(a17, "rel", "nofollow");
			attr(pre13, "class", "language-js");
			attr(a18, "href", "#yet-this-is-not-suspense");
			attr(a18, "id", "yet-this-is-not-suspense");
			attr(a19, "href", "https://overreacted.io/algebraic-effects-for-the-rest-of-us/");
			attr(a19, "rel", "nofollow");
			attr(a20, "href", "#closing-note");
			attr(a20, "id", "closing-note");
			attr(a21, "href", "https://reactjs.org/docs/concurrent-mode-suspense.html");
			attr(a21, "rel", "nofollow");
			attr(a22, "href", "https://en.wikipedia.org/wiki/Continuation");
			attr(a22, "rel", "nofollow");
			attr(a23, "href", "https://jlongster.com/Whats-in-a-Continuation");
			attr(a23, "rel", "nofollow");
			attr(a24, "href", "http://www.schemeworkshop.org/2007/procPaper4.pdf");
			attr(a24, "rel", "nofollow");
		},
		m(target, anchor) {
			insert(target, section0, anchor);
			append(section0, ul3);
			append(ul3, ul0);
			append(ul0, li0);
			append(li0, a0);
			append(a0, t0);
			append(ul3, li1);
			append(li1, a1);
			append(a1, t1);
			append(ul3, ul1);
			append(ul1, li2);
			append(li2, a2);
			append(a2, t2);
			append(ul1, li3);
			append(li3, a3);
			append(ul3, li4);
			append(li4, a4);
			append(a4, t3);
			append(ul3, li5);
			append(li5, a5);
			append(a5, t4);
			append(ul3, ul2);
			append(ul2, li6);
			append(li6, a6);
			append(a6, t5);
			append(ul3, li7);
			append(li7, a7);
			append(a7, t6);
			insert(target, t7, anchor);
			insert(target, p0, anchor);
			append(p0, t8);
			append(p0, strong0);
			append(strong0, t9);
			append(p0, t10);
			insert(target, t11, anchor);
			insert(target, pre0, anchor);
			pre0.innerHTML = raw0_value;
			insert(target, t12, anchor);
			insert(target, p1, anchor);
			append(p1, t13);
			append(p1, strong1);
			append(strong1, t14);
			append(p1, t15);
			insert(target, t16, anchor);
			insert(target, pre1, anchor);
			pre1.innerHTML = raw1_value;
			insert(target, t17, anchor);
			insert(target, p2, anchor);
			append(p2, t18);
			append(p2, a8);
			append(a8, t19);
			append(p2, t20);
			append(p2, a9);
			append(a9, code0);
			append(code0, t21);
			append(p2, t22);
			insert(target, t23, anchor);
			insert(target, p3, anchor);
			append(p3, code1);
			append(code1, t24);
			append(p3, t25);
			append(p3, code2);
			append(code2, t26);
			append(p3, t27);
			insert(target, t28, anchor);
			insert(target, pre2, anchor);
			pre2.innerHTML = raw2_value;
			insert(target, t29, anchor);
			insert(target, p4, anchor);
			append(p4, t30);
			insert(target, t31, anchor);
			insert(target, section1, anchor);
			append(section1, h30);
			append(h30, a10);
			append(a10, t32);
			append(section1, t33);
			append(section1, p5);
			append(p5, t34);
			append(p5, code3);
			append(code3, t35);
			append(p5, t36);
			append(p5, code4);
			append(code4, t37);
			append(p5, t38);
			append(section1, t39);
			append(section1, p6);
			append(p6, t40);
			append(p6, code5);
			append(code5, t41);
			append(p6, t42);
			append(p6, code6);
			append(code6, t43);
			append(p6, t44);
			append(section1, t45);
			append(section1, p7);
			append(p7, t46);
			append(p7, a11);
			append(a11, t47);
			append(p7, t48);
			append(section1, t49);
			append(section1, p8);
			append(p8, t50);
			append(p8, code7);
			append(code7, t51);
			append(p8, t52);
			append(section1, t53);
			append(section1, pre3);
			pre3.innerHTML = raw3_value;
			append(section1, t54);
			append(section1, p9);
			append(p9, t55);
			append(section1, t56);
			append(section1, p10);
			append(p10, t57);
			append(section1, t58);
			append(section1, p11);
			append(p11, t59);
			append(section1, t60);
			append(section1, p12);
			append(p12, strong2);
			append(strong2, t61);
			append(section1, t62);
			append(section1, p13);
			append(p13, t63);
			append(section1, t64);
			append(section1, p14);
			append(p14, t65);
			append(p14, em);
			append(em, t66);
			insert(target, t67, anchor);
			insert(target, section2, anchor);
			append(section2, h20);
			append(h20, a12);
			append(a12, t68);
			insert(target, t69, anchor);
			insert(target, section3, anchor);
			append(section3, h31);
			append(h31, a13);
			append(a13, t70);
			append(section3, t71);
			append(section3, p15);
			append(p15, t72);
			append(section3, t73);
			append(section3, p16);
			append(p16, t74);
			append(p16, code8);
			append(code8, t75);
			append(p16, t76);
			append(section3, t77);
			append(section3, pre4);
			pre4.innerHTML = raw4_value;
			append(section3, t78);
			append(section3, p17);
			append(p17, t79);
			append(section3, t80);
			append(section3, pre5);
			pre5.innerHTML = raw5_value;
			append(section3, t81);
			append(section3, p18);
			append(p18, t82);
			append(section3, t83);
			append(section3, p19);
			append(p19, t84);
			append(p19, code9);
			append(code9, t85);
			append(p19, t86);
			append(section3, t87);
			append(section3, p20);
			append(p20, t88);
			append(p20, code10);
			append(code10, t89);
			append(p20, t90);
			append(p20, code11);
			append(code11, t91);
			append(p20, t92);
			append(p20, code12);
			append(code12, t93);
			append(p20, t94);
			append(p20, code13);
			append(code13, t95);
			append(p20, t96);
			append(section3, t97);
			append(section3, pre6);
			pre6.innerHTML = raw6_value;
			append(section3, t98);
			append(section3, p21);
			append(p21, t99);
			append(section3, t100);
			append(section3, p22);
			append(p22, t101);
			append(p22, code14);
			append(code14, t102);
			append(p22, t103);
			append(section3, t104);
			append(section3, pre7);
			pre7.innerHTML = raw7_value;
			append(section3, t105);
			append(section3, p23);
			append(p23, t106);
			append(p23, code15);
			append(code15, t107);
			append(p23, t108);
			append(section3, t109);
			append(section3, p24);
			append(p24, t110);
			append(p24, code16);
			append(code16, t111);
			append(p24, t112);
			append(section3, t113);
			append(section3, pre8);
			pre8.innerHTML = raw8_value;
			append(section3, t114);
			append(section3, p25);
			append(p25, t115);
			append(p25, code17);
			append(code17, t116);
			append(p25, t117);
			append(section3, t118);
			append(section3, pre9);
			pre9.innerHTML = raw9_value;
			append(section3, t119);
			append(section3, p26);
			append(p26, t120);
			append(p26, code18);
			append(code18, t121);
			append(p26, t122);
			append(section3, t123);
			append(section3, p27);
			append(p27, t124);
			append(section3, t125);
			append(section3, pre10);
			pre10.innerHTML = raw10_value;
			append(section3, t126);
			append(section3, p28);
			append(p28, t127);
			append(section3, t128);
			append(section3, p29);
			append(p29, t129);
			append(section3, t130);
			append(section3, p30);
			append(p30, t131);
			append(p30, code19);
			append(code19, t132);
			append(p30, t133);
			append(section3, t134);
			append(section3, p31);
			append(p31, t135);
			append(p31, code20);
			append(code20, t136);
			append(p31, t137);
			insert(target, t138, anchor);
			insert(target, section4, anchor);
			append(section4, h32);
			append(h32, a14);
			append(a14, strong3);
			append(strong3, t139);
			append(section4, t140);
			append(section4, p32);
			append(p32, t141);
			append(p32, code21);
			append(code21, t142);
			append(p32, t143);
			append(section4, t144);
			append(section4, pre11);
			pre11.innerHTML = raw11_value;
			append(section4, t145);
			append(section4, p33);
			append(p33, t146);
			append(p33, code22);
			append(code22, t147);
			append(p33, t148);
			append(section4, t149);
			append(section4, pre12);
			pre12.innerHTML = raw12_value;
			append(section4, t150);
			append(section4, p34);
			append(p34, t151);
			append(p34, code23);
			append(code23, t152);
			append(p34, t153);
			append(section4, t154);
			append(section4, p35);
			append(p35, t155);
			append(p35, code24);
			append(code24, t156);
			append(p35, t157);
			append(section4, t158);
			append(section4, p36);
			append(p36, t159);
			append(section4, t160);
			append(section4, p37);
			append(p37, t161);
			append(section4, t162);
			append(section4, iframe);
			insert(target, t163, anchor);
			insert(target, section5, anchor);
			append(section5, h21);
			append(h21, a15);
			append(a15, t164);
			append(section5, t165);
			append(section5, p38);
			append(p38, t166);
			append(section5, t167);
			append(section5, p39);
			append(p39, t168);
			append(section5, t169);
			append(section5, p40);
			append(p40, t170);
			insert(target, t171, anchor);
			insert(target, section6, anchor);
			append(section6, h22);
			append(h22, a16);
			append(a16, t172);
			append(section6, t173);
			append(section6, p41);
			append(p41, t174);
			append(p41, a17);
			append(a17, t175);
			append(p41, t176);
			append(section6, t177);
			append(section6, pre13);
			pre13.innerHTML = raw13_value;
			append(section6, t178);
			append(section6, p42);
			append(p42, code25);
			append(code25, t179);
			append(p42, t180);
			append(section6, t181);
			append(section6, p43);
			append(p43, t182);
			append(section6, t183);
			append(section6, ul4);
			append(ul4, li8);
			append(li8, t184);
			append(li8, code26);
			append(code26, t185);
			append(li8, t186);
			append(li8, code27);
			append(code27, t187);
			append(li8, t188);
			append(ul4, t189);
			append(ul4, li9);
			append(li9, t190);
			append(ul4, t191);
			append(ul4, li10);
			append(li10, t192);
			append(li10, code28);
			append(code28, t193);
			append(li10, t194);
			append(li10, code29);
			append(code29, t195);
			append(li10, t196);
			append(ul4, t197);
			append(ul4, li11);
			append(li11, t198);
			append(li11, code30);
			append(code30, t199);
			append(li11, t200);
			append(ul4, t201);
			append(ul4, li12);
			append(li12, t202);
			append(li12, code31);
			append(code31, t203);
			append(li12, t204);
			insert(target, t205, anchor);
			insert(target, section7, anchor);
			append(section7, h33);
			append(h33, a18);
			append(a18, t206);
			append(section7, t207);
			append(section7, p44);
			append(p44, t208);
			append(section7, t209);
			append(section7, p45);
			append(p45, t210);
			append(p45, a19);
			append(a19, t211);
			append(p45, t212);
			insert(target, t213, anchor);
			insert(target, section8, anchor);
			append(section8, h23);
			append(h23, a20);
			append(a20, t214);
			append(section8, t215);
			append(section8, p46);
			append(p46, t216);
			append(p46, a21);
			append(a21, t217);
			append(p46, t218);
			append(section8, t219);
			append(section8, p47);
			append(p47, t220);
			append(p47, a22);
			append(a22, t221);
			append(p47, t222);
			append(section8, t223);
			append(section8, p48);
			append(p48, t224);
			append(section8, t225);
			append(section8, ul5);
			append(ul5, li13);
			append(li13, t226);
			append(li13, a23);
			append(a23, t227);
			append(ul5, t228);
			append(ul5, li14);
			append(li14, t229);
			append(li14, a24);
			append(a24, t230);
		},
		p: noop,
		d(detaching) {
			if (detaching) detach(section0);
			if (detaching) detach(t7);
			if (detaching) detach(p0);
			if (detaching) detach(t11);
			if (detaching) detach(pre0);
			if (detaching) detach(t12);
			if (detaching) detach(p1);
			if (detaching) detach(t16);
			if (detaching) detach(pre1);
			if (detaching) detach(t17);
			if (detaching) detach(p2);
			if (detaching) detach(t23);
			if (detaching) detach(p3);
			if (detaching) detach(t28);
			if (detaching) detach(pre2);
			if (detaching) detach(t29);
			if (detaching) detach(p4);
			if (detaching) detach(t31);
			if (detaching) detach(section1);
			if (detaching) detach(t67);
			if (detaching) detach(section2);
			if (detaching) detach(t69);
			if (detaching) detach(section3);
			if (detaching) detach(t138);
			if (detaching) detach(section4);
			if (detaching) detach(t163);
			if (detaching) detach(section5);
			if (detaching) detach(t171);
			if (detaching) detach(section6);
			if (detaching) detach(t205);
			if (detaching) detach(section7);
			if (detaching) detach(t213);
			if (detaching) detach(section8);
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
	"title": "Pause and resume a JavaScript function",
	"date": "2019-12-09T08:00:00Z",
	"description": "A thought experiment on how you can pause and resume the execution of a JavaScript function",
	"tags": ["JavaScript", "React"],
	"slug": "pause-and-resume-a-javascript-function",
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
