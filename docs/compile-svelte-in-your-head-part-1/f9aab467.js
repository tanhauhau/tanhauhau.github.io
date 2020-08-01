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

var image = "https://lihautan.com/compile-svelte-in-your-head-part-1/assets/hero-twitter-37d7c018.jpg";

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
					"@id": "https%3A%2F%2Flihautan.com%2Fcompile-svelte-in-your-head-part-1",
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
			attr(meta11, "content", "https%3A%2F%2Flihautan.com%2Fcompile-svelte-in-your-head-part-1");
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
							"@id": "https%3A%2F%2Flihautan.com%2Fcompile-svelte-in-your-head-part-1",
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

/* content/blog/compile-svelte-in-your-head-part-1/@@page-markup.svelte generated by Svelte v3.24.0 */

function create_default_slot(ctx) {
	let section0;
	let ul6;
	let li0;
	let a0;
	let t0;
	let li1;
	let a1;
	let t1;
	let ul0;
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
	let li7;
	let a7;
	let t7;
	let li8;
	let a8;
	let t8;
	let ul3;
	let li9;
	let a9;
	let t9;
	let ul1;
	let li10;
	let a10;
	let t10;
	let li11;
	let a11;
	let t11;
	let li12;
	let a12;
	let t12;
	let li13;
	let a13;
	let t13;
	let li14;
	let a14;
	let t14;
	let li15;
	let a15;
	let t15;
	let ul2;
	let li16;
	let a16;
	let t16;
	let li17;
	let a17;
	let t17;
	let li18;
	let a18;
	let t18;
	let li19;
	let a19;
	let t19;
	let li20;
	let a20;
	let t20;
	let li21;
	let a21;
	let t21;
	let li22;
	let a22;
	let t22;
	let ul5;
	let ul4;
	let li23;
	let a23;
	let t23;
	let li24;
	let a24;
	let t24;
	let li25;
	let a25;
	let t25;
	let li26;
	let a26;
	let t26;
	let t27;
	let section1;
	let h20;
	let a27;
	let t28;
	let t29;
	let p0;
	let t30;
	let a28;
	let t31;
	let t32;
	let a29;
	let t33;
	let t34;
	let a30;
	let t35;
	let t36;
	let t37;
	let p1;
	let t38;
	let a31;
	let t39;
	let t40;
	let a32;
	let t41;
	let t42;
	let a33;
	let t43;
	let t44;
	let t45;
	let p2;
	let t46;
	let t47;
	let section2;
	let h21;
	let a34;
	let t48;
	let t49;
	let p3;
	let t50;
	let t51;
	let section3;
	let h30;
	let a35;
	let t52;
	let t53;
	let pre0;

	let raw0_value = `
<code class="language-js"><span class="token comment">// create a h1 element</span>
<span class="token keyword">const</span> h1 <span class="token operator">=</span> document<span class="token punctuation">.</span><span class="token function">createElement</span><span class="token punctuation">(</span><span class="token string">'h1'</span><span class="token punctuation">)</span><span class="token punctuation">;</span>
h1<span class="token punctuation">.</span>textContent <span class="token operator">=</span> <span class="token string">'Hello World'</span><span class="token punctuation">;</span>
<span class="token comment">// ...and add it to the body</span>
document<span class="token punctuation">.</span>body<span class="token punctuation">.</span><span class="token function">appendChild</span><span class="token punctuation">(</span>h1<span class="token punctuation">)</span><span class="token punctuation">;</span></code>` + "";

	let t54;
	let section4;
	let h31;
	let a36;
	let t55;
	let t56;
	let pre1;

	let raw1_value = `
<code class="language-js"><span class="token comment">// update the text of the h1 element</span>
h1<span class="token punctuation">.</span>textContent <span class="token operator">=</span> <span class="token string">'Bye World'</span><span class="token punctuation">;</span></code>` + "";

	let t57;
	let section5;
	let h32;
	let a37;
	let t58;
	let t59;
	let pre2;

	let raw2_value = `
<code class="language-js"><span class="token comment">// finally, we remove the h1 element</span>
document<span class="token punctuation">.</span>body<span class="token punctuation">.</span><span class="token function">removeChild</span><span class="token punctuation">(</span>h1<span class="token punctuation">)</span><span class="token punctuation">;</span></code>` + "";

	let t60;
	let section6;
	let h33;
	let a38;
	let t61;
	let t62;
	let pre3;

	let raw3_value = `
<code class="language-js"><span class="token keyword">const</span> h1 <span class="token operator">=</span> document<span class="token punctuation">.</span><span class="token function">createElement</span><span class="token punctuation">(</span><span class="token string">'h1'</span><span class="token punctuation">)</span><span class="token punctuation">;</span>
h1<span class="token punctuation">.</span>textContent <span class="token operator">=</span> <span class="token string">'Hello World'</span><span class="token punctuation">;</span>
<span class="token comment">// highlight-start</span>
<span class="token comment">// add class name to the h1 element</span>
h1<span class="token punctuation">.</span><span class="token function">setAttribute</span><span class="token punctuation">(</span><span class="token string">'class'</span><span class="token punctuation">,</span> <span class="token string">'abc'</span><span class="token punctuation">)</span><span class="token punctuation">;</span>
<span class="token comment">// ...and add a &lt;style> tag to the head</span>
<span class="token keyword">const</span> style <span class="token operator">=</span> document<span class="token punctuation">.</span><span class="token function">createElement</span><span class="token punctuation">(</span><span class="token string">'style'</span><span class="token punctuation">)</span><span class="token punctuation">;</span>
style<span class="token punctuation">.</span>textContent <span class="token operator">=</span> <span class="token string">'.abc &#123; color: blue; &#125;'</span><span class="token punctuation">;</span>
document<span class="token punctuation">.</span>head<span class="token punctuation">.</span><span class="token function">appendChild</span><span class="token punctuation">(</span>style<span class="token punctuation">)</span><span class="token punctuation">;</span>
<span class="token comment">// highlight-end</span>
document<span class="token punctuation">.</span>body<span class="token punctuation">.</span><span class="token function">appendChild</span><span class="token punctuation">(</span>h1<span class="token punctuation">)</span><span class="token punctuation">;</span></code>` + "";

	let t63;
	let section7;
	let h34;
	let a39;
	let t64;
	let t65;
	let pre4;

	let raw4_value = `
<code class="language-js"><span class="token keyword">const</span> button <span class="token operator">=</span> document<span class="token punctuation">.</span><span class="token function">createElement</span><span class="token punctuation">(</span><span class="token string">'button'</span><span class="token punctuation">)</span><span class="token punctuation">;</span>
button<span class="token punctuation">.</span>textContent <span class="token operator">=</span> <span class="token string">'Click Me!'</span><span class="token punctuation">;</span>
<span class="token comment">// highlight-start</span>
<span class="token comment">// listen to "click" events</span>
button<span class="token punctuation">.</span><span class="token function">addEventListener</span><span class="token punctuation">(</span><span class="token string">'click'</span><span class="token punctuation">,</span> <span class="token punctuation">(</span><span class="token punctuation">)</span> <span class="token operator">=></span> <span class="token punctuation">&#123;</span>
  console<span class="token punctuation">.</span><span class="token function">log</span><span class="token punctuation">(</span><span class="token string">'Hi!'</span><span class="token punctuation">)</span><span class="token punctuation">;</span>
<span class="token punctuation">&#125;</span><span class="token punctuation">)</span><span class="token punctuation">;</span>
<span class="token comment">// highlight-end</span>
document<span class="token punctuation">.</span>body<span class="token punctuation">.</span><span class="token function">appendChild</span><span class="token punctuation">(</span>button<span class="token punctuation">)</span><span class="token punctuation">;</span></code>` + "";

	let t66;
	let p4;
	let t67;
	let t68;
	let p5;
	let t69;
	let t70;
	let section8;
	let h22;
	let a40;
	let t71;
	let t72;
	let p6;
	let t73;
	let t74;
	let blockquote0;
	let p7;
	let t75;
	let a41;
	let t76;
	let t77;
	let t78;
	let p8;
	let t79;
	let t80;
	let pre5;

	let raw5_value = `
<code class="language-svelte">&lt;h1&gt;Hello World&lt;/h1&gt;</code>` + "";

	let t81;
	let p9;
	let a42;
	let t82;
	let t83;
	let p10;
	let t84;
	let code0;
	let t85;
	let t86;
	let t87;
	let pre6;

	let raw6_value = `
<code class="language-svelte">&lt;style&gt;
  h1 &#123;
    color: rebeccapurple;
  &#125;
&lt;/style&gt;
&lt;h1&gt;Hello World&lt;/h1&gt;</code>` + "";

	let t88;
	let p11;
	let a43;
	let t89;
	let t90;
	let p12;
	let t91;
	let t92;
	let p13;
	let t93;
	let t94;
	let pre7;

	let raw7_value = `
<code class="language-svelte">&lt;script&gt;
  let name = &#39;World&#39;;
&lt;/script&gt;
&lt;h1&gt;Hello &#123;name&#125;&lt;/h1&gt;</code>` + "";

	let t95;
	let p14;
	let a44;
	let t96;
	let t97;
	let p15;
	let t98;
	let t99;
	let p16;
	let t100;
	let code1;
	let t101;
	let t102;
	let t103;
	let pre8;

	let raw8_value = `
<code class="language-svelte">&lt;script&gt;
  let count = 0;
  function onClickButton(event) &#123;
    console.log(count);
  &#125;
&lt;/script&gt;
&lt;button on:click=&#123;onClickButton&#125;&gt;Clicked &#123;count&#125;&lt;/button&gt;</code>` + "";

	let t104;
	let p17;
	let a45;
	let t105;
	let t106;
	let p18;
	let t107;
	let a46;
	let t108;
	let t109;
	let pre9;

	let raw9_value = `
<code class="language-svelte">&lt;script&gt;
  let count = 0;
  function onClickButton(event) &#123;
    // highlight-next-line
    count += 1;
  &#125;
&lt;/script&gt;
&lt;button on:click=&#123;onClickButton&#125;&gt;Clicked &#123;count&#125;&lt;/button&gt;</code>` + "";

	let t110;
	let p19;
	let a47;
	let t111;
	let t112;
	let p20;
	let t113;
	let t114;
	let section9;
	let h23;
	let a48;
	let t115;
	let t116;
	let p21;
	let t117;
	let t118;
	let p22;
	let t119;
	let t120;
	let p23;
	let t121;
	let t122;
	let pre10;

	let raw10_value = `
<code class="language-svelte">&lt;h1&gt;Hello World&lt;/h1&gt;</code>` + "";

	let t123;
	let p24;
	let a49;
	let t124;
	let t125;
	let p25;
	let t126;
	let t127;
	let pre11;

	let raw11_value = `
<code class="language-js"><span class="token keyword">function</span> <span class="token function">create_fragment</span><span class="token punctuation">(</span><span class="token parameter">ctx</span><span class="token punctuation">)</span> <span class="token punctuation">&#123;</span>
  <span class="token keyword">let</span> h1<span class="token punctuation">;</span>

  <span class="token keyword">return</span> <span class="token punctuation">&#123;</span>
    <span class="token function">c</span><span class="token punctuation">(</span><span class="token punctuation">)</span> <span class="token punctuation">&#123;</span>
      h1 <span class="token operator">=</span> <span class="token function">element</span><span class="token punctuation">(</span><span class="token string">'h1'</span><span class="token punctuation">)</span><span class="token punctuation">;</span>
      h1<span class="token punctuation">.</span>textContent <span class="token operator">=</span> <span class="token string">'Hello world'</span><span class="token punctuation">;</span>
    <span class="token punctuation">&#125;</span><span class="token punctuation">,</span>
    <span class="token function">m</span><span class="token punctuation">(</span><span class="token parameter">target<span class="token punctuation">,</span> anchor</span><span class="token punctuation">)</span> <span class="token punctuation">&#123;</span>
      <span class="token function">insert</span><span class="token punctuation">(</span>target<span class="token punctuation">,</span> h1<span class="token punctuation">,</span> anchor<span class="token punctuation">)</span><span class="token punctuation">;</span>
    <span class="token punctuation">&#125;</span><span class="token punctuation">,</span>
    <span class="token function">d</span><span class="token punctuation">(</span><span class="token parameter">detaching</span><span class="token punctuation">)</span> <span class="token punctuation">&#123;</span>
      <span class="token keyword">if</span> <span class="token punctuation">(</span>detaching<span class="token punctuation">)</span> <span class="token function">detach</span><span class="token punctuation">(</span>h1<span class="token punctuation">)</span><span class="token punctuation">;</span>
    <span class="token punctuation">&#125;</span><span class="token punctuation">,</span>
  <span class="token punctuation">&#125;</span><span class="token punctuation">;</span>
<span class="token punctuation">&#125;</span>

<span class="token keyword">export</span> <span class="token keyword">default</span> <span class="token keyword">class</span> <span class="token class-name">App</span> <span class="token keyword">extends</span> <span class="token class-name">SvelteComponent</span> <span class="token punctuation">&#123;</span>
  <span class="token function">constructor</span><span class="token punctuation">(</span><span class="token parameter">options</span><span class="token punctuation">)</span> <span class="token punctuation">&#123;</span>
    <span class="token keyword">super</span><span class="token punctuation">(</span><span class="token punctuation">)</span><span class="token punctuation">;</span>
    <span class="token function">init</span><span class="token punctuation">(</span><span class="token keyword">this</span><span class="token punctuation">,</span> options<span class="token punctuation">,</span> <span class="token keyword">null</span><span class="token punctuation">,</span> create_fragment<span class="token punctuation">,</span> safe_not_equal<span class="token punctuation">,</span> <span class="token punctuation">&#123;</span><span class="token punctuation">&#125;</span><span class="token punctuation">)</span><span class="token punctuation">;</span>
  <span class="token punctuation">&#125;</span>
<span class="token punctuation">&#125;</span></code>` + "";

	let t128;
	let p26;
	let t129;
	let t130;
	let ul7;
	let li27;
	let code2;
	let t131;
	let t132;
	let li28;
	let code3;
	let t133;
	let t134;
	let section10;
	let h35;
	let a50;
	let t135;
	let t136;
	let p27;
	let t137;
	let t138;
	let p28;
	let t139;
	let code4;
	let t140;
	let t141;
	let t142;
	let p29;
	let t143;
	let code5;
	let t144;
	let t145;
	let t146;
	let section11;
	let h40;
	let a51;
	let t147;
	let t148;
	let p30;
	let t149;
	let strong0;
	let t150;
	let t151;
	let t152;
	let p31;
	let t153;
	let t154;
	let p32;
	let t155;
	let code6;
	let t156;
	let t157;
	let t158;
	let pre12;

	let raw12_value = `
<code class="language-js">h1 <span class="token operator">=</span> <span class="token function">element</span><span class="token punctuation">(</span><span class="token string">'h1'</span><span class="token punctuation">)</span><span class="token punctuation">;</span>
h1<span class="token punctuation">.</span>textContent <span class="token operator">=</span> <span class="token string">'Hello World'</span><span class="token punctuation">;</span></code>` + "";

	let t159;
	let section12;
	let h41;
	let a52;
	let t160;
	let t161;
	let p33;
	let t162;
	let strong1;
	let t163;
	let t164;
	let t165;
	let p34;
	let t166;
	let t167;
	let p35;
	let t168;
	let code7;
	let t169;
	let t170;
	let code8;
	let t171;
	let t172;
	let t173;
	let pre13;

	let raw13_value = `
<code class="language-js"><span class="token function">insert</span><span class="token punctuation">(</span>target<span class="token punctuation">,</span> h1<span class="token punctuation">,</span> anchor<span class="token punctuation">)</span><span class="token punctuation">;</span>

<span class="token comment">// http://github.com/sveltejs/svelte/tree/master/src/runtime/internal/dom.ts</span>
<span class="token keyword">export</span> <span class="token keyword">function</span> <span class="token function">insert</span><span class="token punctuation">(</span><span class="token parameter">target<span class="token punctuation">,</span> node<span class="token punctuation">,</span> anchor</span><span class="token punctuation">)</span> <span class="token punctuation">&#123;</span>
  target<span class="token punctuation">.</span><span class="token function">insertBefore</span><span class="token punctuation">(</span>node<span class="token punctuation">,</span> anchor <span class="token operator">||</span> <span class="token keyword">null</span><span class="token punctuation">)</span><span class="token punctuation">;</span>
<span class="token punctuation">&#125;</span></code>` + "";

	let t174;
	let section13;
	let h42;
	let a53;
	let t175;
	let t176;
	let p36;
	let t177;
	let strong2;
	let t178;
	let t179;
	let t180;
	let p37;
	let t181;
	let t182;
	let p38;
	let t183;
	let code9;
	let t184;
	let t185;
	let t186;
	let pre14;

	let raw14_value = `
<code class="language-js"><span class="token function">detach</span><span class="token punctuation">(</span>h1<span class="token punctuation">)</span><span class="token punctuation">;</span>

<span class="token comment">// http://github.com/sveltejs/svelte/tree/master/src/runtime/internal/dom.ts</span>
<span class="token keyword">function</span> <span class="token function">detach</span><span class="token punctuation">(</span><span class="token parameter">node</span><span class="token punctuation">)</span> <span class="token punctuation">&#123;</span>
  node<span class="token punctuation">.</span>parentNode<span class="token punctuation">.</span><span class="token function">removeChild</span><span class="token punctuation">(</span>node<span class="token punctuation">)</span><span class="token punctuation">;</span>
<span class="token punctuation">&#125;</span></code>` + "";

	let t187;
	let blockquote1;
	let p39;
	let t188;
	let a54;
	let t189;
	let t190;
	let t191;
	let section14;
	let h36;
	let a55;
	let t192;
	let t193;
	let p40;
	let t194;
	let a56;
	let t195;
	let t196;
	let t197;
	let p41;
	let t198;
	let code10;
	let t199;
	let t200;
	let t201;
	let p42;
	let t202;
	let code11;
	let t203;
	let t204;
	let t205;
	let pre15;

	let raw15_value = `
<code class="language-svelte">&lt;!-- empty --&gt;</code>` + "";

	let t206;
	let p43;
	let a57;
	let t207;
	let t208;
	let pre16;

	let raw16_value = `
<code class="language-js"><span class="token keyword">class</span> <span class="token class-name">App</span> <span class="token keyword">extends</span> <span class="token class-name">SvelteComponent</span> <span class="token punctuation">&#123;</span>
  <span class="token function">constructor</span><span class="token punctuation">(</span><span class="token parameter">options</span><span class="token punctuation">)</span> <span class="token punctuation">&#123;</span>
    <span class="token keyword">super</span><span class="token punctuation">(</span><span class="token punctuation">)</span><span class="token punctuation">;</span>
    <span class="token comment">// highlight-next-line</span>
    <span class="token function">init</span><span class="token punctuation">(</span><span class="token keyword">this</span><span class="token punctuation">,</span> options<span class="token punctuation">,</span> <span class="token keyword">null</span><span class="token punctuation">,</span> <span class="token keyword">null</span><span class="token punctuation">,</span> safe_not_equal<span class="token punctuation">,</span> <span class="token punctuation">&#123;</span><span class="token punctuation">&#125;</span><span class="token punctuation">)</span><span class="token punctuation">;</span>
  <span class="token punctuation">&#125;</span>
<span class="token punctuation">&#125;</span></code>` + "";

	let t209;
	let p44;
	let t210;
	let code12;
	let t211;
	let t212;
	let code13;
	let t213;
	let t214;
	let t215;
	let p45;
	let t216;
	let code14;
	let t217;
	let t218;
	let t219;
	let ul8;
	let li29;
	let t220;
	let code15;
	let t221;
	let t222;
	let code16;
	let t223;
	let t224;
	let t225;
	let li30;
	let t226;
	let t227;
	let li31;
	let t228;
	let t229;
	let p46;
	let t230;
	let code17;
	let t231;
	let t232;
	let t233;
	let p47;
	let t234;
	let code18;
	let t235;
	let t236;
	let t237;
	let p48;
	let t238;
	let code19;
	let t239;
	let t240;
	let t241;
	let section15;
	let h37;
	let a58;
	let t242;
	let t243;
	let p49;
	let t244;
	let t245;
	let pre17;

	let raw17_value = `
<code class="language-svelte">&lt;script&gt;
	let name = &#39;World&#39;;
&lt;/script&gt;
&lt;h1&gt;Hello &#123;name&#125;&lt;/h1&gt;</code>` + "";

	let t246;
	let p50;
	let a59;
	let t247;
	let t248;
	let p51;
	let t249;
	let t250;
	let pre18;

	let raw18_value = `
<code class="language-js"><span class="token keyword">function</span> <span class="token function">create_fragment</span><span class="token punctuation">(</span><span class="token parameter">ctx</span><span class="token punctuation">)</span> <span class="token punctuation">&#123;</span>
  <span class="token comment">// ...</span>
  <span class="token keyword">return</span> <span class="token punctuation">&#123;</span>
    <span class="token function">c</span><span class="token punctuation">(</span><span class="token punctuation">)</span> <span class="token punctuation">&#123;</span>
      h1 <span class="token operator">=</span> <span class="token function">element</span><span class="token punctuation">(</span><span class="token string">'h1'</span><span class="token punctuation">)</span><span class="token punctuation">;</span>
      <span class="token comment">// highlight-next-line</span>
      h1<span class="token punctuation">.</span>textContent <span class="token operator">=</span> <span class="token template-string"><span class="token template-punctuation string">&#96;</span><span class="token string">Hello </span><span class="token interpolation"><span class="token interpolation-punctuation punctuation">$&#123;</span>name<span class="token interpolation-punctuation punctuation">&#125;</span></span><span class="token template-punctuation string">&#96;</span></span><span class="token punctuation">;</span>
    <span class="token punctuation">&#125;</span><span class="token punctuation">,</span>
    <span class="token comment">// ...</span>
  <span class="token punctuation">&#125;</span><span class="token punctuation">;</span>
<span class="token punctuation">&#125;</span>
<span class="token comment">// highlight-next-line</span>
<span class="token keyword">let</span> name <span class="token operator">=</span> <span class="token string">'World'</span><span class="token punctuation">;</span>

<span class="token keyword">class</span> <span class="token class-name">App</span> <span class="token keyword">extends</span> <span class="token class-name">SvelteComponent</span> <span class="token punctuation">&#123;</span>
  <span class="token comment">// ...</span>
<span class="token punctuation">&#125;</span></code>` + "";

	let t251;
	let p52;
	let t252;
	let t253;
	let ul9;
	let li32;
	let t254;
	let code20;
	let t255;
	let t256;
	let t257;
	let li33;
	let code21;
	let t258;
	let t259;
	let t260;
	let p53;
	let t261;
	let t262;
	let section16;
	let h38;
	let a60;
	let t263;
	let t264;
	let p54;
	let t265;
	let code22;
	let t266;
	let t267;
	let t268;
	let pre19;

	let raw19_value = `
<code class="language-svelte">&lt;script&gt;
	let name = &#39;World&#39;;
	function update() &#123;
		name = &#39;Svelte&#39;;
	&#125;
&lt;/script&gt;
&lt;h1&gt;Hello &#123;name&#125;&lt;/h1&gt;</code>` + "";

	let t269;
	let p55;
	let a61;
	let t270;
	let t271;
	let p56;
	let t272;
	let t273;
	let pre20;

	let raw20_value = `
<code class="language-js"><span class="token keyword">function</span> <span class="token function">create_fragment</span><span class="token punctuation">(</span><span class="token parameter">ctx</span><span class="token punctuation">)</span> <span class="token punctuation">&#123;</span>
  <span class="token keyword">return</span> <span class="token punctuation">&#123;</span>
    <span class="token function">c</span><span class="token punctuation">(</span><span class="token punctuation">)</span> <span class="token punctuation">&#123;</span>
      <span class="token comment">// highlight-start</span>
      h1 <span class="token operator">=</span> <span class="token function">element</span><span class="token punctuation">(</span><span class="token string">'h1'</span><span class="token punctuation">)</span><span class="token punctuation">;</span>
      t0 <span class="token operator">=</span> <span class="token function">text</span><span class="token punctuation">(</span><span class="token string">'Hello '</span><span class="token punctuation">)</span><span class="token punctuation">;</span>
      t1 <span class="token operator">=</span> <span class="token function">text</span><span class="token punctuation">(</span><span class="token comment">/*name*/</span> ctx<span class="token punctuation">[</span><span class="token number">0</span><span class="token punctuation">]</span><span class="token punctuation">)</span><span class="token punctuation">;</span>
      <span class="token comment">// highlight-end</span>
    <span class="token punctuation">&#125;</span><span class="token punctuation">,</span>
    <span class="token function">m</span><span class="token punctuation">(</span><span class="token parameter">target<span class="token punctuation">,</span> anchor</span><span class="token punctuation">)</span> <span class="token punctuation">&#123;</span>
      <span class="token function">insert</span><span class="token punctuation">(</span>target<span class="token punctuation">,</span> h1<span class="token punctuation">,</span> anchor<span class="token punctuation">)</span><span class="token punctuation">;</span>
      <span class="token function">append</span><span class="token punctuation">(</span>h1<span class="token punctuation">,</span> t0<span class="token punctuation">)</span><span class="token punctuation">;</span>
      <span class="token function">append</span><span class="token punctuation">(</span>h1<span class="token punctuation">,</span> t1<span class="token punctuation">)</span><span class="token punctuation">;</span>
    <span class="token punctuation">&#125;</span><span class="token punctuation">,</span>
    <span class="token comment">// highlight-start</span>
    <span class="token function">p</span><span class="token punctuation">(</span><span class="token parameter">ctx<span class="token punctuation">,</span> <span class="token punctuation">[</span>dirty<span class="token punctuation">]</span></span><span class="token punctuation">)</span> <span class="token punctuation">&#123;</span>
      <span class="token keyword">if</span> <span class="token punctuation">(</span>dirty <span class="token operator">&amp;</span> <span class="token comment">/*name*/</span> <span class="token number">1</span><span class="token punctuation">)</span> <span class="token function">set_data</span><span class="token punctuation">(</span>t1<span class="token punctuation">,</span> <span class="token comment">/*name*/</span> ctx<span class="token punctuation">[</span><span class="token number">0</span><span class="token punctuation">]</span><span class="token punctuation">)</span><span class="token punctuation">;</span>
    <span class="token punctuation">&#125;</span><span class="token punctuation">,</span>
    <span class="token comment">// highlight-end</span>
    <span class="token function">d</span><span class="token punctuation">(</span><span class="token parameter">detaching</span><span class="token punctuation">)</span> <span class="token punctuation">&#123;</span>
      <span class="token keyword">if</span> <span class="token punctuation">(</span>detaching<span class="token punctuation">)</span> <span class="token function">detach</span><span class="token punctuation">(</span>h1<span class="token punctuation">)</span><span class="token punctuation">;</span>
    <span class="token punctuation">&#125;</span><span class="token punctuation">,</span>
  <span class="token punctuation">&#125;</span><span class="token punctuation">;</span>
<span class="token punctuation">&#125;</span>

<span class="token comment">// highlight-start</span>
<span class="token keyword">function</span> <span class="token function">instance</span><span class="token punctuation">(</span><span class="token parameter">$$self<span class="token punctuation">,</span> $$props<span class="token punctuation">,</span> $$invalidate</span><span class="token punctuation">)</span> <span class="token punctuation">&#123;</span>
  <span class="token keyword">let</span> name <span class="token operator">=</span> <span class="token string">'World'</span><span class="token punctuation">;</span>

  <span class="token keyword">function</span> <span class="token function">update</span><span class="token punctuation">(</span><span class="token punctuation">)</span> <span class="token punctuation">&#123;</span>
    <span class="token function">$$invalidate</span><span class="token punctuation">(</span><span class="token number">0</span><span class="token punctuation">,</span> <span class="token punctuation">(</span>name <span class="token operator">=</span> <span class="token string">'Svelte'</span><span class="token punctuation">)</span><span class="token punctuation">)</span><span class="token punctuation">;</span>
  <span class="token punctuation">&#125;</span>

  <span class="token keyword">return</span> <span class="token punctuation">[</span>name<span class="token punctuation">]</span><span class="token punctuation">;</span>
<span class="token punctuation">&#125;</span>
<span class="token comment">// highlight-end</span>

<span class="token keyword">export</span> <span class="token keyword">default</span> <span class="token keyword">class</span> <span class="token class-name">App</span> <span class="token keyword">extends</span> <span class="token class-name">SvelteComponent</span> <span class="token punctuation">&#123;</span>
  <span class="token function">constructor</span><span class="token punctuation">(</span><span class="token parameter">options</span><span class="token punctuation">)</span> <span class="token punctuation">&#123;</span>
    <span class="token keyword">super</span><span class="token punctuation">(</span><span class="token punctuation">)</span><span class="token punctuation">;</span>
    <span class="token comment">// highlight-next-line</span>
    <span class="token function">init</span><span class="token punctuation">(</span><span class="token keyword">this</span><span class="token punctuation">,</span> options<span class="token punctuation">,</span> instance<span class="token punctuation">,</span> create_fragment<span class="token punctuation">,</span> safe_not_equal<span class="token punctuation">,</span> <span class="token punctuation">&#123;</span><span class="token punctuation">&#125;</span><span class="token punctuation">)</span><span class="token punctuation">;</span>
  <span class="token punctuation">&#125;</span>
<span class="token punctuation">&#125;</span></code>` + "";

	let t274;
	let p57;
	let t275;
	let t276;
	let ul10;
	let li34;
	let t277;
	let code23;
	let t278;
	let t279;
	let code24;
	let t280;
	let t281;
	let t282;
	let li35;
	let t283;
	let code25;
	let t284;
	let t285;
	let code26;
	let t286;
	let t287;
	let li36;
	let t288;
	let code27;
	let t289;
	let t290;
	let t291;
	let li37;
	let t292;
	let code28;
	let t293;
	let t294;
	let code29;
	let t295;
	let t296;
	let t297;
	let li38;
	let t298;
	let code30;
	let t299;
	let t300;
	let code31;
	let t301;
	let t302;
	let code32;
	let t303;
	let t304;
	let p58;
	let t305;
	let t306;
	let p59;
	let t307;
	let code33;
	let t308;
	let t309;
	let t310;
	let p60;
	let t311;
	let t312;
	let ul11;
	let li39;
	let t313;
	let code34;
	let t314;
	let t315;
	let t316;
	let li40;
	let t317;
	let code35;
	let t318;
	let t319;
	let t320;
	let li41;
	let t321;
	let code36;
	let t322;
	let t323;
	let li42;
	let t324;
	let code37;
	let t325;
	let t326;
	let code38;
	let t327;
	let t328;
	let li43;
	let t329;
	let t330;
	let p61;
	let t331;
	let code39;
	let t332;
	let t333;
	let code40;
	let t334;
	let t335;
	let code41;
	let t336;
	let t337;
	let code42;
	let t338;
	let t339;
	let t340;
	let p62;
	let t341;
	let code43;
	let t342;
	let t343;
	let t344;
	let section17;
	let h43;
	let a62;
	let t345;
	let t346;
	let p63;
	let t347;
	let strong3;
	let t348;
	let t349;
	let t350;
	let p64;
	let strong4;
	let t351;
	let t352;
	let code44;
	let t353;
	let t354;
	let code45;
	let t355;
	let t356;
	let t357;
	let section18;
	let h39;
	let a63;
	let t358;
	let t359;
	let p65;
	let t360;
	let code46;
	let t361;
	let t362;
	let code47;
	let t363;
	let t364;
	let code48;
	let t365;
	let t366;
	let code49;
	let t367;
	let t368;
	let t369;
	let p66;
	let t370;
	let code50;
	let t371;
	let t372;
	let code51;
	let t373;
	let t374;
	let t375;
	let pre21;

	let raw21_value = `
<code class="language-svelte">&lt;App /&gt;
&lt;App /&gt;
&lt;App /&gt;

&lt;!-- gives you --&gt;
&lt;h1&gt;Hello world&lt;/h1&gt;
&lt;h1&gt;Hello world&lt;/h1&gt;
&lt;h1&gt;Hello world&lt;/h1&gt;</code>` + "";

	let t376;
	let p67;
	let t377;
	let code52;
	let t378;
	let t379;
	let code53;
	let t380;
	let t381;
	let code54;
	let t382;
	let t383;
	let t384;
	let pre22;

	let raw22_value = `
<code class="language-svelte">&lt;App /&gt;
&lt;App /&gt;
&lt;App /&gt;

&lt;!-- could possibly be --&gt;
&lt;h1&gt;Hello world&lt;/h1&gt;
&lt;!-- highlight-next-line --&gt;
&lt;h1&gt;Hello Svelte&lt;/h1&gt;
&lt;h1&gt;Hello world&lt;/h1&gt;
&lt;!-- depending on the inner state of the component --&gt;</code>` + "";

	let t385;
	let section19;
	let h310;
	let a64;
	let t386;
	let t387;
	let p68;
	let t388;
	let code55;
	let t389;
	let t390;
	let em;
	let t391;
	let t392;
	let t393;
	let ul12;
	let li44;
	let t394;
	let t395;
	let li45;
	let t396;
	let t397;
	let p69;
	let t398;
	let strong5;
	let t399;
	let t400;
	let t401;
	let p70;
	let t402;
	let code56;
	let t403;
	let t404;
	let code57;
	let t405;
	let t406;
	let strong6;
	let t407;
	let t408;
	let t409;
	let pre23;

	let raw23_value = `
<code class="language-js"><span class="token comment">// conceptually,</span>
<span class="token keyword">const</span> ctx <span class="token operator">=</span> <span class="token function">instance</span><span class="token punctuation">(</span><span class="token comment">/*...*/</span><span class="token punctuation">)</span><span class="token punctuation">;</span>
<span class="token keyword">const</span> fragment <span class="token operator">=</span> <span class="token function">create_fragment</span><span class="token punctuation">(</span>ctx<span class="token punctuation">)</span><span class="token punctuation">;</span>
<span class="token comment">// create the fragment</span>
fragment<span class="token punctuation">.</span><span class="token function">c</span><span class="token punctuation">(</span><span class="token punctuation">)</span><span class="token punctuation">;</span>
<span class="token comment">// mount the fragment onto the DOM</span>
fragment<span class="token punctuation">.</span><span class="token function">m</span><span class="token punctuation">(</span>target<span class="token punctuation">)</span><span class="token punctuation">;</span></code>` + "";

	let t410;
	let p71;
	let t411;
	let code58;
	let t412;
	let t413;
	let code59;
	let t414;
	let t415;
	let strong7;
	let t416;
	let t417;
	let t418;
	let pre24;

	let raw24_value = `
<code class="language-js">t1 <span class="token operator">=</span> <span class="token function">text</span><span class="token punctuation">(</span><span class="token comment">/*name*/</span> ctx<span class="token punctuation">[</span><span class="token number">0</span><span class="token punctuation">]</span><span class="token punctuation">)</span><span class="token punctuation">;</span></code>` + "";

	let t419;
	let p72;
	let t420;
	let a65;
	let t421;
	let t422;
	let section20;
	let h311;
	let a66;
	let t423;
	let t424;
	let p73;
	let t425;
	let code60;
	let t426;
	let t427;
	let t428;
	let p74;
	let t429;
	let t430;
	let ul13;
	let li46;
	let t431;
	let t432;
	let li47;
	let t433;
	let t434;
	let p75;
	let t435;
	let code61;
	let t436;
	let t437;
	let t438;
	let pre25;

	let raw25_value = `
<code class="language-js">name <span class="token operator">=</span> <span class="token string">'Svelte'</span><span class="token punctuation">;</span>
count<span class="token operator">++</span><span class="token punctuation">;</span>
foo<span class="token punctuation">.</span>a <span class="token operator">=</span> <span class="token number">1</span><span class="token punctuation">;</span>

<span class="token comment">// compiled into something like</span>
name <span class="token operator">=</span> <span class="token string">'Svelte'</span><span class="token punctuation">;</span>
<span class="token function">$$invalidate</span><span class="token punctuation">(</span><span class="token comment">/* name */</span><span class="token punctuation">,</span> name<span class="token punctuation">)</span><span class="token punctuation">;</span>
count<span class="token operator">++</span><span class="token punctuation">;</span>
<span class="token function">$$invalidate</span><span class="token punctuation">(</span><span class="token comment">/* count */</span><span class="token punctuation">,</span> count<span class="token punctuation">)</span><span class="token punctuation">;</span>
foo<span class="token punctuation">.</span>a <span class="token operator">=</span> <span class="token number">1</span><span class="token punctuation">;</span>
<span class="token function">$$invalidate</span><span class="token punctuation">(</span><span class="token comment">/* foo */</span><span class="token punctuation">,</span> foo<span class="token punctuation">)</span><span class="token punctuation">;</span></code>` + "";

	let t439;
	let p76;
	let t440;
	let code62;
	let t441;
	let t442;
	let t443;
	let pre26;

	let raw26_value = `
<code class="language-js"><span class="token comment">// conceptually...</span>
<span class="token keyword">const</span> ctx <span class="token operator">=</span> <span class="token function">instance</span><span class="token punctuation">(</span><span class="token comment">/*...*/</span><span class="token punctuation">)</span><span class="token punctuation">;</span>
<span class="token keyword">const</span> fragment <span class="token operator">=</span> <span class="token function">create_fragment</span><span class="token punctuation">(</span>ctx<span class="token punctuation">)</span><span class="token punctuation">;</span>
<span class="token comment">// to track which variable has changed</span>
<span class="token keyword">const</span> dirty <span class="token operator">=</span> <span class="token keyword">new</span> <span class="token class-name">Set</span><span class="token punctuation">(</span><span class="token punctuation">)</span><span class="token punctuation">;</span>
<span class="token keyword">const</span> <span class="token function-variable function">$$invalidate</span> <span class="token operator">=</span> <span class="token punctuation">(</span><span class="token parameter">variable<span class="token punctuation">,</span> newValue</span><span class="token punctuation">)</span> <span class="token operator">=></span> <span class="token punctuation">&#123;</span>
  <span class="token comment">// update ctx</span>
  ctx<span class="token punctuation">[</span>variable<span class="token punctuation">]</span> <span class="token operator">=</span> newValue<span class="token punctuation">;</span>
  <span class="token comment">// mark variable as dirty</span>
  dirty<span class="token punctuation">.</span><span class="token function">add</span><span class="token punctuation">(</span>variable<span class="token punctuation">)</span><span class="token punctuation">;</span>
  <span class="token comment">// schedules update for the component</span>
  <span class="token function">scheduleUpdate</span><span class="token punctuation">(</span>component<span class="token punctuation">)</span><span class="token punctuation">;</span>
<span class="token punctuation">&#125;</span><span class="token punctuation">;</span>

<span class="token comment">// gets called when update is scheduled</span>
<span class="token keyword">function</span> <span class="token function">flushUpdate</span><span class="token punctuation">(</span><span class="token punctuation">)</span> <span class="token punctuation">&#123;</span>
  <span class="token comment">// update the fragment</span>
  fragment<span class="token punctuation">.</span><span class="token function">p</span><span class="token punctuation">(</span>ctx<span class="token punctuation">,</span> dirty<span class="token punctuation">)</span><span class="token punctuation">;</span>
  <span class="token comment">// clear the dirty</span>
  dirty<span class="token punctuation">.</span><span class="token function">clear</span><span class="token punctuation">(</span><span class="token punctuation">)</span><span class="token punctuation">;</span>
<span class="token punctuation">&#125;</span></code>` + "";

	let t444;
	let section21;
	let h312;
	let a67;
	let t445;
	let t446;
	let p77;
	let t447;
	let t448;
	let pre27;

	let raw27_value = `
<code class="language-svelte">&lt;script&gt;
	let name = &#39;world&#39;;
	function update() &#123;
		name = &#39;Svelte&#39;;
	&#125;
&lt;/script&gt;
&lt;!-- highlight-next-line --&gt;
&lt;h1 on:click=&#123;update&#125;&gt;Hello &#123;name&#125;&lt;/h1&gt;</code>` + "";

	let t449;
	let p78;
	let a68;
	let t450;
	let t451;
	let p79;
	let t452;
	let t453;
	let pre28;

	let raw28_value = `
<code class="language-js"><span class="token keyword">function</span> <span class="token function">create_fragment</span><span class="token punctuation">(</span><span class="token parameter">ctx</span><span class="token punctuation">)</span> <span class="token punctuation">&#123;</span>
  <span class="token comment">// ...</span>
  <span class="token keyword">return</span> <span class="token punctuation">&#123;</span>
    <span class="token function">c</span><span class="token punctuation">(</span><span class="token punctuation">)</span> <span class="token punctuation">&#123;</span>
      h1 <span class="token operator">=</span> <span class="token function">element</span><span class="token punctuation">(</span><span class="token string">'h1'</span><span class="token punctuation">)</span><span class="token punctuation">;</span>
      t0 <span class="token operator">=</span> <span class="token function">text</span><span class="token punctuation">(</span><span class="token string">'Hello '</span><span class="token punctuation">)</span><span class="token punctuation">;</span>
      t1 <span class="token operator">=</span> <span class="token function">text</span><span class="token punctuation">(</span><span class="token comment">/*name*/</span> ctx<span class="token punctuation">[</span><span class="token number">0</span><span class="token punctuation">]</span><span class="token punctuation">)</span><span class="token punctuation">;</span>
    <span class="token punctuation">&#125;</span><span class="token punctuation">,</span>
    <span class="token function">m</span><span class="token punctuation">(</span><span class="token parameter">target<span class="token punctuation">,</span> anchor</span><span class="token punctuation">)</span> <span class="token punctuation">&#123;</span>
      <span class="token function">insert</span><span class="token punctuation">(</span>target<span class="token punctuation">,</span> h1<span class="token punctuation">,</span> anchor<span class="token punctuation">)</span><span class="token punctuation">;</span>
      <span class="token function">append</span><span class="token punctuation">(</span>h1<span class="token punctuation">,</span> t0<span class="token punctuation">)</span><span class="token punctuation">;</span>
      <span class="token function">append</span><span class="token punctuation">(</span>h1<span class="token punctuation">,</span> t1<span class="token punctuation">)</span><span class="token punctuation">;</span>
      <span class="token comment">// highlight-next-line</span>
      dispose <span class="token operator">=</span> <span class="token function">listen</span><span class="token punctuation">(</span>h1<span class="token punctuation">,</span> <span class="token string">'click'</span><span class="token punctuation">,</span> <span class="token comment">/*update*/</span> ctx<span class="token punctuation">[</span><span class="token number">1</span><span class="token punctuation">]</span><span class="token punctuation">)</span><span class="token punctuation">;</span>
    <span class="token punctuation">&#125;</span><span class="token punctuation">,</span>
    <span class="token function">p</span><span class="token punctuation">(</span><span class="token parameter">ctx<span class="token punctuation">,</span> <span class="token punctuation">[</span>dirty<span class="token punctuation">]</span></span><span class="token punctuation">)</span> <span class="token punctuation">&#123;</span>
      <span class="token keyword">if</span> <span class="token punctuation">(</span>dirty <span class="token operator">&amp;</span> <span class="token comment">/*name*/</span> <span class="token number">1</span><span class="token punctuation">)</span> <span class="token function">set_data</span><span class="token punctuation">(</span>t1<span class="token punctuation">,</span> <span class="token comment">/*name*/</span> ctx<span class="token punctuation">[</span><span class="token number">0</span><span class="token punctuation">]</span><span class="token punctuation">)</span><span class="token punctuation">;</span>
    <span class="token punctuation">&#125;</span><span class="token punctuation">,</span>
    <span class="token function">d</span><span class="token punctuation">(</span><span class="token parameter">detaching</span><span class="token punctuation">)</span> <span class="token punctuation">&#123;</span>
      <span class="token keyword">if</span> <span class="token punctuation">(</span>detaching<span class="token punctuation">)</span> <span class="token function">detach</span><span class="token punctuation">(</span>h1<span class="token punctuation">)</span><span class="token punctuation">;</span>
      <span class="token comment">// highlight-next-line</span>
      <span class="token function">dispose</span><span class="token punctuation">(</span><span class="token punctuation">)</span><span class="token punctuation">;</span>
    <span class="token punctuation">&#125;</span><span class="token punctuation">,</span>
  <span class="token punctuation">&#125;</span><span class="token punctuation">;</span>
<span class="token punctuation">&#125;</span>

<span class="token keyword">function</span> <span class="token function">instance</span><span class="token punctuation">(</span><span class="token parameter">$$self<span class="token punctuation">,</span> $$props<span class="token punctuation">,</span> $$invalidate</span><span class="token punctuation">)</span> <span class="token punctuation">&#123;</span>
  <span class="token keyword">let</span> name <span class="token operator">=</span> <span class="token string">'world'</span><span class="token punctuation">;</span>

  <span class="token keyword">function</span> <span class="token function">update</span><span class="token punctuation">(</span><span class="token punctuation">)</span> <span class="token punctuation">&#123;</span>
    <span class="token function">$$invalidate</span><span class="token punctuation">(</span><span class="token number">0</span><span class="token punctuation">,</span> <span class="token punctuation">(</span>name <span class="token operator">=</span> <span class="token string">'Svelte'</span><span class="token punctuation">)</span><span class="token punctuation">)</span><span class="token punctuation">;</span>
  <span class="token punctuation">&#125;</span>
  <span class="token comment">// highlight-next-line</span>
  <span class="token keyword">return</span> <span class="token punctuation">[</span>name<span class="token punctuation">,</span> update<span class="token punctuation">]</span><span class="token punctuation">;</span>
<span class="token punctuation">&#125;</span>
<span class="token comment">// ...</span></code>` + "";

	let t454;
	let p80;
	let t455;
	let t456;
	let ul14;
	let li48;
	let code63;
	let t457;
	let t458;
	let t459;
	let li49;
	let t460;
	let strong8;
	let t461;
	let t462;
	let strong9;
	let t463;
	let t464;
	let p81;
	let t465;
	let code64;
	let t466;
	let t467;
	let strong10;
	let t468;
	let t469;
	let strong11;
	let t470;
	let t471;
	let t472;
	let p82;
	let t473;
	let code65;
	let t474;
	let t475;
	let code66;
	let t476;
	let t477;
	let strong12;
	let t478;
	let t479;
	let t480;
	let p83;
	let t481;
	let t482;
	let section22;
	let h313;
	let a69;
	let t483;
	let t484;
	let p84;
	let t485;
	let a70;
	let t486;
	let t487;
	let a71;
	let t488;
	let t489;
	let t490;
	let p85;
	let t491;
	let t492;
	let pre29;

	let raw29_value = `
<code class="language-svelte">&lt;h1
	on:click=&#123;update&#125;
	on:mousedown=&#123;update&#125;
	on:touchstart=&#123;update&#125;&gt;
  Hello &#123;name&#125;!
&lt;/h1&gt;</code>` + "";

	let t493;
	let p86;
	let a72;
	let t494;
	let t495;
	let p87;
	let t496;
	let t497;
	let pre30;

	let raw30_value = `
<code class="language-js"><span class="token comment">// ...</span>
<span class="token comment">// highlight-start</span>
dispose <span class="token operator">=</span> <span class="token punctuation">[</span>
  <span class="token function">listen</span><span class="token punctuation">(</span>h1<span class="token punctuation">,</span> <span class="token string">'click'</span><span class="token punctuation">,</span> <span class="token comment">/*update*/</span> ctx<span class="token punctuation">[</span><span class="token number">1</span><span class="token punctuation">]</span><span class="token punctuation">)</span><span class="token punctuation">,</span>
  <span class="token function">listen</span><span class="token punctuation">(</span>h1<span class="token punctuation">,</span> <span class="token string">'mousedown'</span><span class="token punctuation">,</span> <span class="token comment">/*update*/</span> ctx<span class="token punctuation">[</span><span class="token number">1</span><span class="token punctuation">]</span><span class="token punctuation">)</span><span class="token punctuation">,</span>
  <span class="token function">listen</span><span class="token punctuation">(</span>h1<span class="token punctuation">,</span> <span class="token string">'touchstart'</span><span class="token punctuation">,</span> <span class="token comment">/*update*/</span> ctx<span class="token punctuation">[</span><span class="token number">1</span><span class="token punctuation">]</span><span class="token punctuation">,</span> <span class="token punctuation">&#123;</span> passive<span class="token punctuation">:</span> <span class="token boolean">true</span> <span class="token punctuation">&#125;</span><span class="token punctuation">)</span><span class="token punctuation">,</span>
<span class="token punctuation">]</span><span class="token punctuation">;</span>
<span class="token comment">// highlight-end</span>
<span class="token comment">// ...</span>
<span class="token comment">// highlight-next-line</span>
<span class="token function">run_all</span><span class="token punctuation">(</span>dispose<span class="token punctuation">)</span><span class="token punctuation">;</span></code>` + "";

	let t498;
	let p88;
	let t499;
	let t500;
	let pre31;

	let raw31_value = `
<code class="language-js"><span class="token comment">// instead of</span>
dispose1 <span class="token operator">=</span> <span class="token function">listen</span><span class="token punctuation">(</span>h1<span class="token punctuation">,</span> <span class="token string">'click'</span><span class="token punctuation">,</span> <span class="token comment">/*update*/</span> ctx<span class="token punctuation">[</span><span class="token number">1</span><span class="token punctuation">]</span><span class="token punctuation">)</span><span class="token punctuation">;</span>
dispose2 <span class="token operator">=</span> <span class="token function">listen</span><span class="token punctuation">(</span>h1<span class="token punctuation">,</span> <span class="token string">'mousedown'</span><span class="token punctuation">,</span> <span class="token comment">/*update*/</span> ctx<span class="token punctuation">[</span><span class="token number">1</span><span class="token punctuation">]</span><span class="token punctuation">)</span><span class="token punctuation">;</span>
dispose2 <span class="token operator">=</span> <span class="token function">listen</span><span class="token punctuation">(</span>h1<span class="token punctuation">,</span> <span class="token string">'touchstart'</span><span class="token punctuation">,</span> <span class="token comment">/*update*/</span> ctx<span class="token punctuation">[</span><span class="token number">1</span><span class="token punctuation">]</span><span class="token punctuation">,</span> <span class="token punctuation">&#123;</span> passive<span class="token punctuation">:</span> <span class="token boolean">true</span> <span class="token punctuation">&#125;</span><span class="token punctuation">)</span><span class="token punctuation">;</span>
<span class="token comment">// ...</span>
<span class="token function">dispose1</span><span class="token punctuation">(</span><span class="token punctuation">)</span><span class="token punctuation">;</span>
<span class="token function">dispose2</span><span class="token punctuation">(</span><span class="token punctuation">)</span><span class="token punctuation">;</span>
<span class="token function">dispose3</span><span class="token punctuation">(</span><span class="token punctuation">)</span><span class="token punctuation">;</span></code>` + "";

	let t501;
	let p89;
	let t502;
	let t503;
	let p90;
	let t504;
	let code67;
	let t505;
	let t506;
	let t507;
	let section23;
	let h24;
	let a73;
	let t508;
	let t509;
	let p91;
	let t510;
	let t511;
	let p92;
	let t512;
	let t513;
	let p93;
	let t514;
	let t515;
	let section24;
	let h44;
	let a74;
	let t516;
	let t517;
	let ul15;
	let li50;
	let t518;
	let t519;
	let section25;
	let h45;
	let a75;
	let t520;
	let t521;
	let ul16;
	let li51;
	let t522;
	let code68;
	let t523;
	let t524;
	let t525;
	let li52;
	let t526;
	let t527;
	let li53;
	let code69;
	let t528;
	let t529;
	let t530;
	let section26;
	let h46;
	let a76;
	let t531;
	let t532;
	let ul17;
	let li54;
	let t533;
	let code70;
	let t534;
	let t535;
	let code71;
	let t536;
	let t537;
	let t538;
	let li55;
	let t539;
	let t540;
	let li56;
	let t541;
	let a77;
	let t542;
	let t543;
	let p94;
	let t544;
	let t545;
	let ul18;
	let li57;
	let t546;
	let code72;
	let t547;
	let t548;
	let t549;
	let li58;
	let t550;
	let code73;
	let t551;
	let t552;
	let code74;
	let t553;
	let t554;
	let t555;
	let li59;
	let t556;
	let code75;
	let t557;
	let t558;
	let t559;
	let li60;
	let t560;
	let t561;
	let section27;
	let h25;
	let a78;
	let t562;
	let t563;
	let p95;
	let t564;
	let t565;
	let p96;
	let t566;
	let a79;
	let t567;
	let t568;
	let t569;
	let p97;
	let t570;
	let a80;
	let t571;
	let t572;
	let a81;
	let t573;
	let t574;
	let a82;
	let t575;
	let t576;
	let t577;
	let p98;
	let strong13;
	let t578;
	let a83;
	let t579;
	let t580;

	return {
		c() {
			section0 = element("section");
			ul6 = element("ul");
			li0 = element("li");
			a0 = element("a");
			t0 = text("Background");
			li1 = element("li");
			a1 = element("a");
			t1 = text("Introduction");
			ul0 = element("ul");
			li2 = element("li");
			a2 = element("a");
			t2 = text("Creating an element");
			li3 = element("li");
			a3 = element("a");
			t3 = text("Updating an element");
			li4 = element("li");
			a4 = element("a");
			t4 = text("Removing an element");
			li5 = element("li");
			a5 = element("a");
			t5 = text("Adding style to an element");
			li6 = element("li");
			a6 = element("a");
			t6 = text("Listen for click events on an element");
			li7 = element("li");
			a7 = element("a");
			t7 = text("Svelte syntax");
			li8 = element("li");
			a8 = element("a");
			t8 = text("Compile Svelte in your Head");
			ul3 = element("ul");
			li9 = element("li");
			a9 = element("a");
			t9 = text("create_fragment");
			ul1 = element("ul");
			li10 = element("li");
			a10 = element("a");
			t10 = text("- c()");
			li11 = element("li");
			a11 = element("a");
			t11 = text("- m(target, anchor)");
			li12 = element("li");
			a12 = element("a");
			t12 = text("- d(detaching)");
			li13 = element("li");
			a13 = element("a");
			t13 = text("export default class App extends SvelteComponent");
			li14 = element("li");
			a14 = element("a");
			t14 = text("Adding data");
			li15 = element("li");
			a15 = element("a");
			t15 = text("Updating data");
			ul2 = element("ul");
			li16 = element("li");
			a16 = element("a");
			t16 = text("- p(ctx, dirty)");
			li17 = element("li");
			a17 = element("a");
			t17 = text("instance variable");
			li18 = element("li");
			a18 = element("a");
			t18 = text("instance($$self, $$props, \\$\\$invalidate)");
			li19 = element("li");
			a19 = element("a");
			t19 = text("\\$\\$invalidate");
			li20 = element("li");
			a20 = element("a");
			t20 = text("Adding event listeners");
			li21 = element("li");
			a21 = element("a");
			t21 = text("listen and dispose");
			li22 = element("li");
			a22 = element("a");
			t22 = text("Summary");
			ul5 = element("ul");
			ul4 = element("ul");
			li23 = element("li");
			a23 = element("a");
			t23 = text("1. create_fragment");
			li24 = element("li");
			a24 = element("a");
			t24 = text("2. instance");
			li25 = element("li");
			a25 = element("a");
			t25 = text("3. class App extends SvelteComponent");
			li26 = element("li");
			a26 = element("a");
			t26 = text("Closing Note");
			t27 = space();
			section1 = element("section");
			h20 = element("h2");
			a27 = element("a");
			t28 = text("Background");
			t29 = space();
			p0 = element("p");
			t30 = text("A while ago, ");
			a28 = element("a");
			t31 = text("@swyx");
			t32 = text(" came back to Singapore and visited us in ");
			a29 = element("a");
			t33 = text("Shopee Singapore");
			t34 = text(" (");
			a30 = element("a");
			t35 = text("We're hiring!");
			t36 = text(").");
			t37 = space();
			p1 = element("p");
			t38 = text("He gave an amazing sharing on ");
			a31 = element("a");
			t39 = text("Compile Svelte in Your Head");
			t40 = text(" (");
			a32 = element("a");
			t41 = text("video");
			t42 = text(") in the ");
			a33 = element("a");
			t43 = text("ReactKnowledgeable Originals");
			t44 = text(".");
			t45 = space();
			p2 = element("p");
			t46 = text("I love his presentation and the title is so catchy, so I begged him to use the catchy title as this series of articles about the Svelte compiler. It will be about how Svelte sees your code and compiles it down to plain JavaScript.");
			t47 = space();
			section2 = element("section");
			h21 = element("h2");
			a34 = element("a");
			t48 = text("Introduction");
			t49 = space();
			p3 = element("p");
			t50 = text("Lets refresh ourselves with how we write web app without any framework:");
			t51 = space();
			section3 = element("section");
			h30 = element("h3");
			a35 = element("a");
			t52 = text("Creating an element");
			t53 = space();
			pre0 = element("pre");
			t54 = space();
			section4 = element("section");
			h31 = element("h3");
			a36 = element("a");
			t55 = text("Updating an element");
			t56 = space();
			pre1 = element("pre");
			t57 = space();
			section5 = element("section");
			h32 = element("h3");
			a37 = element("a");
			t58 = text("Removing an element");
			t59 = space();
			pre2 = element("pre");
			t60 = space();
			section6 = element("section");
			h33 = element("h3");
			a38 = element("a");
			t61 = text("Adding style to an element");
			t62 = space();
			pre3 = element("pre");
			t63 = space();
			section7 = element("section");
			h34 = element("h3");
			a39 = element("a");
			t64 = text("Listen for click events on an element");
			t65 = space();
			pre4 = element("pre");
			t66 = space();
			p4 = element("p");
			t67 = text("These are code that you have to write, without using any framework or library.");
			t68 = space();
			p5 = element("p");
			t69 = text("The main idea of this article is to show how the Svelte compiler compiles the Svelte syntax into statements of codes that I've shown above.");
			t70 = space();
			section8 = element("section");
			h22 = element("h2");
			a40 = element("a");
			t71 = text("Svelte syntax");
			t72 = space();
			p6 = element("p");
			t73 = text("Here I'm going to show you some basics of the Svelte syntax.");
			t74 = space();
			blockquote0 = element("blockquote");
			p7 = element("p");
			t75 = text("If you wish to learn more, I highly recommend trying ");
			a41 = element("a");
			t76 = text("Svelte's interactive tutorial");
			t77 = text(".");
			t78 = space();
			p8 = element("p");
			t79 = text("So here is a basic Svelte component:");
			t80 = space();
			pre5 = element("pre");
			t81 = space();
			p9 = element("p");
			a42 = element("a");
			t82 = text("Svelte REPL");
			t83 = space();
			p10 = element("p");
			t84 = text("To add style, you add a ");
			code0 = element("code");
			t85 = text("<style>");
			t86 = text(" tag:");
			t87 = space();
			pre6 = element("pre");
			t88 = space();
			p11 = element("p");
			a43 = element("a");
			t89 = text("Svelte REPL");
			t90 = space();
			p12 = element("p");
			t91 = text("At this point, writing Svelte component just feels like writing HTML, that's because Svelte syntax is a super set of the HTML syntax.");
			t92 = space();
			p13 = element("p");
			t93 = text("Let's look at how we add a data to our component:");
			t94 = space();
			pre7 = element("pre");
			t95 = space();
			p14 = element("p");
			a44 = element("a");
			t96 = text("Svelte REPL");
			t97 = space();
			p15 = element("p");
			t98 = text("We put JavaScript inside the curly brackets.");
			t99 = space();
			p16 = element("p");
			t100 = text("To add a click handler, we use the ");
			code1 = element("code");
			t101 = text("on:");
			t102 = text(" directive");
			t103 = space();
			pre8 = element("pre");
			t104 = space();
			p17 = element("p");
			a45 = element("a");
			t105 = text("Svelte REPL");
			t106 = space();
			p18 = element("p");
			t107 = text("To change the data, we use ");
			a46 = element("a");
			t108 = text("assignment operators");
			t109 = space();
			pre9 = element("pre");
			t110 = space();
			p19 = element("p");
			a47 = element("a");
			t111 = text("Svelte REPL");
			t112 = space();
			p20 = element("p");
			t113 = text("Let's move on to see how Svelte syntax is compiled into JavaScript that we've seen earlier");
			t114 = space();
			section9 = element("section");
			h23 = element("h2");
			a48 = element("a");
			t115 = text("Compile Svelte in your Head");
			t116 = space();
			p21 = element("p");
			t117 = text("The Svelte compiler analyses the code you write and generates an optimised JavaScript output.");
			t118 = space();
			p22 = element("p");
			t119 = text("To study how Svelte compiles the code, lets start with the smallest example possible, and slowly build up the code. Through the process, you will see that Svelte incrementally adds to the output code based on your changes.");
			t120 = space();
			p23 = element("p");
			t121 = text("The first example that we are going to see is:");
			t122 = space();
			pre10 = element("pre");
			t123 = space();
			p24 = element("p");
			a49 = element("a");
			t124 = text("Svelte REPL");
			t125 = space();
			p25 = element("p");
			t126 = text("The output code:");
			t127 = space();
			pre11 = element("pre");
			t128 = space();
			p26 = element("p");
			t129 = text("You can break down the output code into 2 sections:");
			t130 = space();
			ul7 = element("ul");
			li27 = element("li");
			code2 = element("code");
			t131 = text("create_fragment");
			t132 = space();
			li28 = element("li");
			code3 = element("code");
			t133 = text("class App extends SvelteComponent");
			t134 = space();
			section10 = element("section");
			h35 = element("h3");
			a50 = element("a");
			t135 = text("create_fragment");
			t136 = space();
			p27 = element("p");
			t137 = text("Svelte components are the building blocks of a Svelte application. Each Svelte component focuses on building its piece or fragment of the final DOM.");
			t138 = space();
			p28 = element("p");
			t139 = text("The ");
			code4 = element("code");
			t140 = text("create_fragment");
			t141 = text(" function gives the Svelte component an instruction manual on how to build the DOM fragment.");
			t142 = space();
			p29 = element("p");
			t143 = text("Look at the return object of the ");
			code5 = element("code");
			t144 = text("create_fragment");
			t145 = text(" function. It has methods, such as:");
			t146 = space();
			section11 = element("section");
			h40 = element("h4");
			a51 = element("a");
			t147 = text("- c()");
			t148 = space();
			p30 = element("p");
			t149 = text("Short for ");
			strong0 = element("strong");
			t150 = text("create");
			t151 = text(".");
			t152 = space();
			p31 = element("p");
			t153 = text("Contains instructions to create all the elements in the fragment.");
			t154 = space();
			p32 = element("p");
			t155 = text("In this example, it contains instructions to create the ");
			code6 = element("code");
			t156 = text("h1");
			t157 = text(" element");
			t158 = space();
			pre12 = element("pre");
			t159 = space();
			section12 = element("section");
			h41 = element("h4");
			a52 = element("a");
			t160 = text("- m(target, anchor)");
			t161 = space();
			p33 = element("p");
			t162 = text("Short for ");
			strong1 = element("strong");
			t163 = text("mount");
			t164 = text(".");
			t165 = space();
			p34 = element("p");
			t166 = text("Contains instructions to mount the elements into the target.");
			t167 = space();
			p35 = element("p");
			t168 = text("In this example, it contains instructions to insert the ");
			code7 = element("code");
			t169 = text("h1");
			t170 = text(" element into the ");
			code8 = element("code");
			t171 = text("target");
			t172 = text(".");
			t173 = space();
			pre13 = element("pre");
			t174 = space();
			section13 = element("section");
			h42 = element("h4");
			a53 = element("a");
			t175 = text("- d(detaching)");
			t176 = space();
			p36 = element("p");
			t177 = text("Short for ");
			strong2 = element("strong");
			t178 = text("destroy");
			t179 = text(".");
			t180 = space();
			p37 = element("p");
			t181 = text("Contains instructions to remove the elements from the target.");
			t182 = space();
			p38 = element("p");
			t183 = text("In this example, we detach the ");
			code9 = element("code");
			t184 = text("h1");
			t185 = text(" element from the DOM");
			t186 = space();
			pre14 = element("pre");
			t187 = space();
			blockquote1 = element("blockquote");
			p39 = element("p");
			t188 = text("The method names are short for better minification. ");
			a54 = element("a");
			t189 = text("See what can't be minified here");
			t190 = text(".");
			t191 = space();
			section14 = element("section");
			h36 = element("h3");
			a55 = element("a");
			t192 = text("export default class App extends SvelteComponent");
			t193 = space();
			p40 = element("p");
			t194 = text("Each component is a class, which you can import and instantiate through ");
			a56 = element("a");
			t195 = text("this API");
			t196 = text(".");
			t197 = space();
			p41 = element("p");
			t198 = text("And in the constructor, we initialize the component with information that made up the component such as ");
			code10 = element("code");
			t199 = text("create_fragment");
			t200 = text(". Svelte will only pass information that it is needed and remove them whenever it is not necessary.");
			t201 = space();
			p42 = element("p");
			t202 = text("Try removing the ");
			code11 = element("code");
			t203 = text("<h1>");
			t204 = text(" tag and see what happens to the output:");
			t205 = space();
			pre15 = element("pre");
			t206 = space();
			p43 = element("p");
			a57 = element("a");
			t207 = text("Svelte REPL");
			t208 = space();
			pre16 = element("pre");
			t209 = space();
			p44 = element("p");
			t210 = text("Svelte will pass in ");
			code12 = element("code");
			t211 = text("null");
			t212 = text(" instead of ");
			code13 = element("code");
			t213 = text("create_fragment");
			t214 = text("!");
			t215 = space();
			p45 = element("p");
			t216 = text("The ");
			code14 = element("code");
			t217 = text("init");
			t218 = text(" function is where Svelte sets up most of the internals, such as:");
			t219 = space();
			ul8 = element("ul");
			li29 = element("li");
			t220 = text("component props, ");
			code15 = element("code");
			t221 = text("ctx");
			t222 = text(" (will explain what ");
			code16 = element("code");
			t223 = text("ctx");
			t224 = text(" is later) and context");
			t225 = space();
			li30 = element("li");
			t226 = text("component lifecycle events");
			t227 = space();
			li31 = element("li");
			t228 = text("component update mechanism");
			t229 = space();
			p46 = element("p");
			t230 = text("and at the very end, Svelte calls the ");
			code17 = element("code");
			t231 = text("create_fragment");
			t232 = text(" to create and mount elements into the DOM.");
			t233 = space();
			p47 = element("p");
			t234 = text("If you noticed, all the internal state and methods are attached to ");
			code18 = element("code");
			t235 = text("this.$$");
			t236 = text(".");
			t237 = space();
			p48 = element("p");
			t238 = text("So if you ever access the ");
			code19 = element("code");
			t239 = text("$$");
			t240 = text(" property of the component, you are tapping into the internals. You've been warned! 🙈🚨");
			t241 = space();
			section15 = element("section");
			h37 = element("h3");
			a58 = element("a");
			t242 = text("Adding data");
			t243 = space();
			p49 = element("p");
			t244 = text("Now that we've looked at the bare minimum of a Svelte component, let's see how adding a data would change the compiled output:");
			t245 = space();
			pre17 = element("pre");
			t246 = space();
			p50 = element("p");
			a59 = element("a");
			t247 = text("Svelte REPL");
			t248 = space();
			p51 = element("p");
			t249 = text("Notice the change in the output:");
			t250 = space();
			pre18 = element("pre");
			t251 = space();
			p52 = element("p");
			t252 = text("Some observations:");
			t253 = space();
			ul9 = element("ul");
			li32 = element("li");
			t254 = text("What you've written in the ");
			code20 = element("code");
			t255 = text("<script>");
			t256 = text(" tag is moved into the top level of the code");
			t257 = space();
			li33 = element("li");
			code21 = element("code");
			t258 = text("h1");
			t259 = text(" element's text content is now a template literal");
			t260 = space();
			p53 = element("p");
			t261 = text("There's a lot of amazing things happening under the hood right now, but let's hold our horses for a while, because it's best explained when comparing with the next code change.");
			t262 = space();
			section16 = element("section");
			h38 = element("h3");
			a60 = element("a");
			t263 = text("Updating data");
			t264 = space();
			p54 = element("p");
			t265 = text("Let's add a function to update the ");
			code22 = element("code");
			t266 = text("name");
			t267 = text(":");
			t268 = space();
			pre19 = element("pre");
			t269 = space();
			p55 = element("p");
			a61 = element("a");
			t270 = text("Svelte REPL");
			t271 = space();
			p56 = element("p");
			t272 = text("...and observe the change in the compiled output:");
			t273 = space();
			pre20 = element("pre");
			t274 = space();
			p57 = element("p");
			t275 = text("Some observations:");
			t276 = space();
			ul10 = element("ul");
			li34 = element("li");
			t277 = text("the text content of ");
			code23 = element("code");
			t278 = text("<h1>");
			t279 = text(" element is now broken into 2 text nodes, created by the ");
			code24 = element("code");
			t280 = text("text(...)");
			t281 = text(" function");
			t282 = space();
			li35 = element("li");
			t283 = text("the return object of the ");
			code25 = element("code");
			t284 = text("create_fragment");
			t285 = text(" has a new method, ");
			code26 = element("code");
			t286 = text("p(ctx, dirty)");
			t287 = space();
			li36 = element("li");
			t288 = text("a new function ");
			code27 = element("code");
			t289 = text("instance");
			t290 = text(" is created");
			t291 = space();
			li37 = element("li");
			t292 = text("What you've written in the ");
			code28 = element("code");
			t293 = text("<script>");
			t294 = text(" tag is now moved into the ");
			code29 = element("code");
			t295 = text("instance");
			t296 = text(" function");
			t297 = space();
			li38 = element("li");
			t298 = text("for the sharp-eyed, the variable ");
			code30 = element("code");
			t299 = text("name");
			t300 = text(" that was used in the ");
			code31 = element("code");
			t301 = text("create_fragment");
			t302 = text(" is now replaced by ");
			code32 = element("code");
			t303 = text("ctx[0]");
			t304 = space();
			p58 = element("p");
			t305 = text("So, why the change?");
			t306 = space();
			p59 = element("p");
			t307 = text("The Svelte compiler tracks all the variables declared in the ");
			code33 = element("code");
			t308 = text("<script>");
			t309 = text(" tag.");
			t310 = space();
			p60 = element("p");
			t311 = text("It tracks whether the variable:");
			t312 = space();
			ul11 = element("ul");
			li39 = element("li");
			t313 = text("can be mutated? eg: ");
			code34 = element("code");
			t314 = text("count++");
			t315 = text(",");
			t316 = space();
			li40 = element("li");
			t317 = text("can be reassigned? eg: ");
			code35 = element("code");
			t318 = text("name = 'Svelte'");
			t319 = text(",");
			t320 = space();
			li41 = element("li");
			t321 = text("is referenced in the template? eg: ");
			code36 = element("code");
			t322 = text("<h1>Hello {name}</h1>");
			t323 = space();
			li42 = element("li");
			t324 = text("is writable? eg: ");
			code37 = element("code");
			t325 = text("const i = 1;");
			t326 = text(" vs ");
			code38 = element("code");
			t327 = text("let i = 1;");
			t328 = space();
			li43 = element("li");
			t329 = text("... and many more");
			t330 = space();
			p61 = element("p");
			t331 = text("When the Svelte compiler realises that the variable ");
			code39 = element("code");
			t332 = text("name");
			t333 = text(" can be reassigned, (due to ");
			code40 = element("code");
			t334 = text("name = 'Svelte';");
			t335 = text(" in ");
			code41 = element("code");
			t336 = text("update");
			t337 = text("), it breaks down the text content of the ");
			code42 = element("code");
			t338 = text("h1");
			t339 = text(" into parts, so that it can dynamically update part of the text.");
			t340 = space();
			p62 = element("p");
			t341 = text("Indeed, you can see that there's a new method, ");
			code43 = element("code");
			t342 = text("p");
			t343 = text(", to update the text node.");
			t344 = space();
			section17 = element("section");
			h43 = element("h4");
			a62 = element("a");
			t345 = text("- p(ctx, dirty)");
			t346 = space();
			p63 = element("p");
			t347 = text("Short for ");
			strong3 = element("strong");
			t348 = text("u_p_date");
			t349 = text(".");
			t350 = space();
			p64 = element("p");
			strong4 = element("strong");
			t351 = text("p(ctx, dirty)");
			t352 = text(" contains instructions to update the elements based on what has changed in the state (");
			code44 = element("code");
			t353 = text("dirty");
			t354 = text(") and the state (");
			code45 = element("code");
			t355 = text("ctx");
			t356 = text(") of the component.");
			t357 = space();
			section18 = element("section");
			h39 = element("h3");
			a63 = element("a");
			t358 = text("instance variable");
			t359 = space();
			p65 = element("p");
			t360 = text("The compiler realises that the variable ");
			code46 = element("code");
			t361 = text("name");
			t362 = text(" cannot be shared across different instances of the ");
			code47 = element("code");
			t363 = text("App");
			t364 = text(" component. That's why it moves the declaration of the variable ");
			code48 = element("code");
			t365 = text("name");
			t366 = text(" into a function called ");
			code49 = element("code");
			t367 = text("instance");
			t368 = text(".");
			t369 = space();
			p66 = element("p");
			t370 = text("In the previous example, no matter how many instances of the ");
			code50 = element("code");
			t371 = text("App");
			t372 = text(" component, the value of the variable ");
			code51 = element("code");
			t373 = text("name");
			t374 = text(" is the same and unchanged across the instances:");
			t375 = space();
			pre21 = element("pre");
			t376 = space();
			p67 = element("p");
			t377 = text("But, in this example, the variable ");
			code52 = element("code");
			t378 = text("name");
			t379 = text(" can be changed within 1 instance of the component, so the declaration of the variable ");
			code53 = element("code");
			t380 = text("name");
			t381 = text(" is now moved into the ");
			code54 = element("code");
			t382 = text("instance");
			t383 = text(" function:");
			t384 = space();
			pre22 = element("pre");
			t385 = space();
			section19 = element("section");
			h310 = element("h3");
			a64 = element("a");
			t386 = text("instance($$self, $$props, \\$\\$invalidate)");
			t387 = space();
			p68 = element("p");
			t388 = text("The ");
			code55 = element("code");
			t389 = text("instance");
			t390 = text(" function returns a list of ");
			em = element("em");
			t391 = text("instance");
			t392 = text(" variables, which are variables that are:");
			t393 = space();
			ul12 = element("ul");
			li44 = element("li");
			t394 = text("referenced in the template");
			t395 = space();
			li45 = element("li");
			t396 = text("mutated or reassigned, (can be changed within 1 instance of the component)");
			t397 = space();
			p69 = element("p");
			t398 = text("In Svelte, we call this list of instance variables, ");
			strong5 = element("strong");
			t399 = text("ctx");
			t400 = text(".");
			t401 = space();
			p70 = element("p");
			t402 = text("In the ");
			code56 = element("code");
			t403 = text("init");
			t404 = text(" function, Svelte calls the ");
			code57 = element("code");
			t405 = text("instance");
			t406 = text(" function to create ");
			strong6 = element("strong");
			t407 = text("ctx");
			t408 = text(", and uses it to create the fragment for the component:");
			t409 = space();
			pre23 = element("pre");
			t410 = space();
			p71 = element("p");
			t411 = text("Now, instead of accessing the variable ");
			code58 = element("code");
			t412 = text("name");
			t413 = text(" outside of the component, we refer to the variable ");
			code59 = element("code");
			t414 = text("name");
			t415 = text(" passed via the ");
			strong7 = element("strong");
			t416 = text("ctx");
			t417 = text(":");
			t418 = space();
			pre24 = element("pre");
			t419 = space();
			p72 = element("p");
			t420 = text("The reason that ctx is an array instead of a map or an object is because of an optimisation related to bitmask, you can see ");
			a65 = element("a");
			t421 = text("the discussion about it here");
			t422 = space();
			section20 = element("section");
			h311 = element("h3");
			a66 = element("a");
			t423 = text("\\$\\$invalidate");
			t424 = space();
			p73 = element("p");
			t425 = text("The secret behind the system of reactivity in Svelte is the ");
			code60 = element("code");
			t426 = text("$$invalidate");
			t427 = text(" function.");
			t428 = space();
			p74 = element("p");
			t429 = text("Every variable that has been");
			t430 = space();
			ul13 = element("ul");
			li46 = element("li");
			t431 = text("reassigned or mutated");
			t432 = space();
			li47 = element("li");
			t433 = text("referenced in the template");
			t434 = space();
			p75 = element("p");
			t435 = text("will have the ");
			code61 = element("code");
			t436 = text("$$invalidate");
			t437 = text(" function inserted right after the assignment or mutation:");
			t438 = space();
			pre25 = element("pre");
			t439 = space();
			p76 = element("p");
			t440 = text("The ");
			code62 = element("code");
			t441 = text("$$invalidate");
			t442 = text(" function marks the variable dirty and schedules an update for the component:");
			t443 = space();
			pre26 = element("pre");
			t444 = space();
			section21 = element("section");
			h312 = element("h3");
			a67 = element("a");
			t445 = text("Adding event listeners");
			t446 = space();
			p77 = element("p");
			t447 = text("Let's now add an event listener");
			t448 = space();
			pre27 = element("pre");
			t449 = space();
			p78 = element("p");
			a68 = element("a");
			t450 = text("Svelte REPL");
			t451 = space();
			p79 = element("p");
			t452 = text("And observe the difference:");
			t453 = space();
			pre28 = element("pre");
			t454 = space();
			p80 = element("p");
			t455 = text("Some observations:");
			t456 = space();
			ul14 = element("ul");
			li48 = element("li");
			code63 = element("code");
			t457 = text("instance");
			t458 = text(" function now returns 2 variables instead of 1");
			t459 = space();
			li49 = element("li");
			t460 = text("Listen to click event during ");
			strong8 = element("strong");
			t461 = text("mount");
			t462 = text(" and dispose it in ");
			strong9 = element("strong");
			t463 = text("destroy");
			t464 = space();
			p81 = element("p");
			t465 = text("As I've mentioned earlier, ");
			code64 = element("code");
			t466 = text("instance");
			t467 = text(" function returns variables that are ");
			strong10 = element("strong");
			t468 = text("referenced in the template");
			t469 = text(" and that are ");
			strong11 = element("strong");
			t470 = text("mutated or reassigned");
			t471 = text(".");
			t472 = space();
			p82 = element("p");
			t473 = text("Since we've just referenced the ");
			code65 = element("code");
			t474 = text("update");
			t475 = text(" function in the template, it is now returned in the ");
			code66 = element("code");
			t476 = text("instance");
			t477 = text(" function as part of the ");
			strong12 = element("strong");
			t478 = text("ctx");
			t479 = text(".");
			t480 = space();
			p83 = element("p");
			t481 = text("Svelte tries generate as compact JavaScript output as possible, not returning an extra variable if it is not necessary.");
			t482 = space();
			section22 = element("section");
			h313 = element("h3");
			a69 = element("a");
			t483 = text("listen and dispose");
			t484 = space();
			p84 = element("p");
			t485 = text("Whenever you add ");
			a70 = element("a");
			t486 = text("an event listener");
			t487 = text(" in Svelte, Svelte will inject code to add an ");
			a71 = element("a");
			t488 = text("event listener");
			t489 = text(" and remove it when the DOM fragment is removed from the DOM.");
			t490 = space();
			p85 = element("p");
			t491 = text("Try adding more event listeners,");
			t492 = space();
			pre29 = element("pre");
			t493 = space();
			p86 = element("p");
			a72 = element("a");
			t494 = text("Svelte REPL");
			t495 = space();
			p87 = element("p");
			t496 = text("and observe the compiled output:");
			t497 = space();
			pre30 = element("pre");
			t498 = space();
			p88 = element("p");
			t499 = text("Instead of declaring and creating a new variable to remove each event listener, Svelte assigns all of them to an array:");
			t500 = space();
			pre31 = element("pre");
			t501 = space();
			p89 = element("p");
			t502 = text("Minification can compact the variable name, but you can't remove the brackets.");
			t503 = space();
			p90 = element("p");
			t504 = text("Again, this is another great example of where Svelte tries to generate compact JavaScript output. Svelte does not create the ");
			code67 = element("code");
			t505 = text("dispose");
			t506 = text(" array when there's only 1 event listener.");
			t507 = space();
			section23 = element("section");
			h24 = element("h2");
			a73 = element("a");
			t508 = text("Summary");
			t509 = space();
			p91 = element("p");
			t510 = text("The Svelte syntax is a superset of HTML.");
			t511 = space();
			p92 = element("p");
			t512 = text("When you write a Svelte component, the Svelte compiler analyses your code and generates optimised JavaScript code output.");
			t513 = space();
			p93 = element("p");
			t514 = text("The output can be divided into 3 segments:");
			t515 = space();
			section24 = element("section");
			h44 = element("h4");
			a74 = element("a");
			t516 = text("1. create_fragment");
			t517 = space();
			ul15 = element("ul");
			li50 = element("li");
			t518 = text("Returns a fragment, which is an instruction manual on how to build the DOM fragment for the component");
			t519 = space();
			section25 = element("section");
			h45 = element("h4");
			a75 = element("a");
			t520 = text("2. instance");
			t521 = space();
			ul16 = element("ul");
			li51 = element("li");
			t522 = text("Most of the code written in the ");
			code68 = element("code");
			t523 = text("<script>");
			t524 = text(" tag is in here.");
			t525 = space();
			li52 = element("li");
			t526 = text("Returns a list of instance variables that are referenced in the template");
			t527 = space();
			li53 = element("li");
			code69 = element("code");
			t528 = text("$$invalidate");
			t529 = text(" is inserted after every assignment and mutation of the instance variable");
			t530 = space();
			section26 = element("section");
			h46 = element("h4");
			a76 = element("a");
			t531 = text("3. class App extends SvelteComponent");
			t532 = space();
			ul17 = element("ul");
			li54 = element("li");
			t533 = text("Initialise the component with ");
			code70 = element("code");
			t534 = text("create_fragment");
			t535 = text(" and ");
			code71 = element("code");
			t536 = text("instance");
			t537 = text(" function");
			t538 = space();
			li55 = element("li");
			t539 = text("Sets up the component internals");
			t540 = space();
			li56 = element("li");
			t541 = text("Provides the ");
			a77 = element("a");
			t542 = text("Component API");
			t543 = space();
			p94 = element("p");
			t544 = text("Svelte strives to generate as compact JavaScript as possible, for example:");
			t545 = space();
			ul18 = element("ul");
			li57 = element("li");
			t546 = text("Breaking text content of ");
			code72 = element("code");
			t547 = text("h1");
			t548 = text(" into separate text nodes only when part of the text can be updated");
			t549 = space();
			li58 = element("li");
			t550 = text("Not defining ");
			code73 = element("code");
			t551 = text("create_fragment");
			t552 = text(" or ");
			code74 = element("code");
			t553 = text("instance");
			t554 = text(" function when it is not needed");
			t555 = space();
			li59 = element("li");
			t556 = text("Generate ");
			code75 = element("code");
			t557 = text("dispose");
			t558 = text(" as an array or a function, depending on the number of event listeners.");
			t559 = space();
			li60 = element("li");
			t560 = text("...");
			t561 = space();
			section27 = element("section");
			h25 = element("h2");
			a78 = element("a");
			t562 = text("Closing Note");
			t563 = space();
			p95 = element("p");
			t564 = text("We've covered the basic structure of the Svelte's compiled output, and this is just the beginning.");
			t565 = space();
			p96 = element("p");
			t566 = text("If you wish to know more, ");
			a79 = element("a");
			t567 = text("follow me on Twitter");
			t568 = text(".");
			t569 = space();
			p97 = element("p");
			t570 = text("I'll post it on Twitter when the next part is ready, where I'll be covering ");
			a80 = element("a");
			t571 = text("logic blocks");
			t572 = text(", ");
			a81 = element("a");
			t573 = text("slots");
			t574 = text(", ");
			a82 = element("a");
			t575 = text("context");
			t576 = text(", and many others.");
			t577 = space();
			p98 = element("p");
			strong13 = element("strong");
			t578 = text("➡ ➡  Continue reading on ");
			a83 = element("a");
			t579 = text("Part 2");
			t580 = text(".");
			this.h();
		},
		l(nodes) {
			section0 = claim_element(nodes, "SECTION", {});
			var section0_nodes = children(section0);

			ul6 = claim_element(section0_nodes, "UL", {
				class: true,
				id: true,
				role: true,
				"aria-label": true
			});

			var ul6_nodes = children(ul6);
			li0 = claim_element(ul6_nodes, "LI", {});
			var li0_nodes = children(li0);
			a0 = claim_element(li0_nodes, "A", { href: true });
			var a0_nodes = children(a0);
			t0 = claim_text(a0_nodes, "Background");
			a0_nodes.forEach(detach);
			li0_nodes.forEach(detach);
			li1 = claim_element(ul6_nodes, "LI", {});
			var li1_nodes = children(li1);
			a1 = claim_element(li1_nodes, "A", { href: true });
			var a1_nodes = children(a1);
			t1 = claim_text(a1_nodes, "Introduction");
			a1_nodes.forEach(detach);
			li1_nodes.forEach(detach);
			ul0 = claim_element(ul6_nodes, "UL", {});
			var ul0_nodes = children(ul0);
			li2 = claim_element(ul0_nodes, "LI", {});
			var li2_nodes = children(li2);
			a2 = claim_element(li2_nodes, "A", { href: true });
			var a2_nodes = children(a2);
			t2 = claim_text(a2_nodes, "Creating an element");
			a2_nodes.forEach(detach);
			li2_nodes.forEach(detach);
			li3 = claim_element(ul0_nodes, "LI", {});
			var li3_nodes = children(li3);
			a3 = claim_element(li3_nodes, "A", { href: true });
			var a3_nodes = children(a3);
			t3 = claim_text(a3_nodes, "Updating an element");
			a3_nodes.forEach(detach);
			li3_nodes.forEach(detach);
			li4 = claim_element(ul0_nodes, "LI", {});
			var li4_nodes = children(li4);
			a4 = claim_element(li4_nodes, "A", { href: true });
			var a4_nodes = children(a4);
			t4 = claim_text(a4_nodes, "Removing an element");
			a4_nodes.forEach(detach);
			li4_nodes.forEach(detach);
			li5 = claim_element(ul0_nodes, "LI", {});
			var li5_nodes = children(li5);
			a5 = claim_element(li5_nodes, "A", { href: true });
			var a5_nodes = children(a5);
			t5 = claim_text(a5_nodes, "Adding style to an element");
			a5_nodes.forEach(detach);
			li5_nodes.forEach(detach);
			li6 = claim_element(ul0_nodes, "LI", {});
			var li6_nodes = children(li6);
			a6 = claim_element(li6_nodes, "A", { href: true });
			var a6_nodes = children(a6);
			t6 = claim_text(a6_nodes, "Listen for click events on an element");
			a6_nodes.forEach(detach);
			li6_nodes.forEach(detach);
			ul0_nodes.forEach(detach);
			li7 = claim_element(ul6_nodes, "LI", {});
			var li7_nodes = children(li7);
			a7 = claim_element(li7_nodes, "A", { href: true });
			var a7_nodes = children(a7);
			t7 = claim_text(a7_nodes, "Svelte syntax");
			a7_nodes.forEach(detach);
			li7_nodes.forEach(detach);
			li8 = claim_element(ul6_nodes, "LI", {});
			var li8_nodes = children(li8);
			a8 = claim_element(li8_nodes, "A", { href: true });
			var a8_nodes = children(a8);
			t8 = claim_text(a8_nodes, "Compile Svelte in your Head");
			a8_nodes.forEach(detach);
			li8_nodes.forEach(detach);
			ul3 = claim_element(ul6_nodes, "UL", {});
			var ul3_nodes = children(ul3);
			li9 = claim_element(ul3_nodes, "LI", {});
			var li9_nodes = children(li9);
			a9 = claim_element(li9_nodes, "A", { href: true });
			var a9_nodes = children(a9);
			t9 = claim_text(a9_nodes, "create_fragment");
			a9_nodes.forEach(detach);
			li9_nodes.forEach(detach);
			ul1 = claim_element(ul3_nodes, "UL", {});
			var ul1_nodes = children(ul1);
			li10 = claim_element(ul1_nodes, "LI", {});
			var li10_nodes = children(li10);
			a10 = claim_element(li10_nodes, "A", { href: true });
			var a10_nodes = children(a10);
			t10 = claim_text(a10_nodes, "- c()");
			a10_nodes.forEach(detach);
			li10_nodes.forEach(detach);
			li11 = claim_element(ul1_nodes, "LI", {});
			var li11_nodes = children(li11);
			a11 = claim_element(li11_nodes, "A", { href: true });
			var a11_nodes = children(a11);
			t11 = claim_text(a11_nodes, "- m(target, anchor)");
			a11_nodes.forEach(detach);
			li11_nodes.forEach(detach);
			li12 = claim_element(ul1_nodes, "LI", {});
			var li12_nodes = children(li12);
			a12 = claim_element(li12_nodes, "A", { href: true });
			var a12_nodes = children(a12);
			t12 = claim_text(a12_nodes, "- d(detaching)");
			a12_nodes.forEach(detach);
			li12_nodes.forEach(detach);
			ul1_nodes.forEach(detach);
			li13 = claim_element(ul3_nodes, "LI", {});
			var li13_nodes = children(li13);
			a13 = claim_element(li13_nodes, "A", { href: true });
			var a13_nodes = children(a13);
			t13 = claim_text(a13_nodes, "export default class App extends SvelteComponent");
			a13_nodes.forEach(detach);
			li13_nodes.forEach(detach);
			li14 = claim_element(ul3_nodes, "LI", {});
			var li14_nodes = children(li14);
			a14 = claim_element(li14_nodes, "A", { href: true });
			var a14_nodes = children(a14);
			t14 = claim_text(a14_nodes, "Adding data");
			a14_nodes.forEach(detach);
			li14_nodes.forEach(detach);
			li15 = claim_element(ul3_nodes, "LI", {});
			var li15_nodes = children(li15);
			a15 = claim_element(li15_nodes, "A", { href: true });
			var a15_nodes = children(a15);
			t15 = claim_text(a15_nodes, "Updating data");
			a15_nodes.forEach(detach);
			li15_nodes.forEach(detach);
			ul2 = claim_element(ul3_nodes, "UL", {});
			var ul2_nodes = children(ul2);
			li16 = claim_element(ul2_nodes, "LI", {});
			var li16_nodes = children(li16);
			a16 = claim_element(li16_nodes, "A", { href: true });
			var a16_nodes = children(a16);
			t16 = claim_text(a16_nodes, "- p(ctx, dirty)");
			a16_nodes.forEach(detach);
			li16_nodes.forEach(detach);
			ul2_nodes.forEach(detach);
			li17 = claim_element(ul3_nodes, "LI", {});
			var li17_nodes = children(li17);
			a17 = claim_element(li17_nodes, "A", { href: true });
			var a17_nodes = children(a17);
			t17 = claim_text(a17_nodes, "instance variable");
			a17_nodes.forEach(detach);
			li17_nodes.forEach(detach);
			li18 = claim_element(ul3_nodes, "LI", {});
			var li18_nodes = children(li18);
			a18 = claim_element(li18_nodes, "A", { href: true });
			var a18_nodes = children(a18);
			t18 = claim_text(a18_nodes, "instance($$self, $$props, \\$\\$invalidate)");
			a18_nodes.forEach(detach);
			li18_nodes.forEach(detach);
			li19 = claim_element(ul3_nodes, "LI", {});
			var li19_nodes = children(li19);
			a19 = claim_element(li19_nodes, "A", { href: true });
			var a19_nodes = children(a19);
			t19 = claim_text(a19_nodes, "\\$\\$invalidate");
			a19_nodes.forEach(detach);
			li19_nodes.forEach(detach);
			li20 = claim_element(ul3_nodes, "LI", {});
			var li20_nodes = children(li20);
			a20 = claim_element(li20_nodes, "A", { href: true });
			var a20_nodes = children(a20);
			t20 = claim_text(a20_nodes, "Adding event listeners");
			a20_nodes.forEach(detach);
			li20_nodes.forEach(detach);
			li21 = claim_element(ul3_nodes, "LI", {});
			var li21_nodes = children(li21);
			a21 = claim_element(li21_nodes, "A", { href: true });
			var a21_nodes = children(a21);
			t21 = claim_text(a21_nodes, "listen and dispose");
			a21_nodes.forEach(detach);
			li21_nodes.forEach(detach);
			ul3_nodes.forEach(detach);
			li22 = claim_element(ul6_nodes, "LI", {});
			var li22_nodes = children(li22);
			a22 = claim_element(li22_nodes, "A", { href: true });
			var a22_nodes = children(a22);
			t22 = claim_text(a22_nodes, "Summary");
			a22_nodes.forEach(detach);
			li22_nodes.forEach(detach);
			ul5 = claim_element(ul6_nodes, "UL", {});
			var ul5_nodes = children(ul5);
			ul4 = claim_element(ul5_nodes, "UL", {});
			var ul4_nodes = children(ul4);
			li23 = claim_element(ul4_nodes, "LI", {});
			var li23_nodes = children(li23);
			a23 = claim_element(li23_nodes, "A", { href: true });
			var a23_nodes = children(a23);
			t23 = claim_text(a23_nodes, "1. create_fragment");
			a23_nodes.forEach(detach);
			li23_nodes.forEach(detach);
			li24 = claim_element(ul4_nodes, "LI", {});
			var li24_nodes = children(li24);
			a24 = claim_element(li24_nodes, "A", { href: true });
			var a24_nodes = children(a24);
			t24 = claim_text(a24_nodes, "2. instance");
			a24_nodes.forEach(detach);
			li24_nodes.forEach(detach);
			li25 = claim_element(ul4_nodes, "LI", {});
			var li25_nodes = children(li25);
			a25 = claim_element(li25_nodes, "A", { href: true });
			var a25_nodes = children(a25);
			t25 = claim_text(a25_nodes, "3. class App extends SvelteComponent");
			a25_nodes.forEach(detach);
			li25_nodes.forEach(detach);
			ul4_nodes.forEach(detach);
			ul5_nodes.forEach(detach);
			li26 = claim_element(ul6_nodes, "LI", {});
			var li26_nodes = children(li26);
			a26 = claim_element(li26_nodes, "A", { href: true });
			var a26_nodes = children(a26);
			t26 = claim_text(a26_nodes, "Closing Note");
			a26_nodes.forEach(detach);
			li26_nodes.forEach(detach);
			ul6_nodes.forEach(detach);
			section0_nodes.forEach(detach);
			t27 = claim_space(nodes);
			section1 = claim_element(nodes, "SECTION", {});
			var section1_nodes = children(section1);
			h20 = claim_element(section1_nodes, "H2", {});
			var h20_nodes = children(h20);
			a27 = claim_element(h20_nodes, "A", { href: true, id: true });
			var a27_nodes = children(a27);
			t28 = claim_text(a27_nodes, "Background");
			a27_nodes.forEach(detach);
			h20_nodes.forEach(detach);
			t29 = claim_space(section1_nodes);
			p0 = claim_element(section1_nodes, "P", {});
			var p0_nodes = children(p0);
			t30 = claim_text(p0_nodes, "A while ago, ");
			a28 = claim_element(p0_nodes, "A", { href: true, rel: true });
			var a28_nodes = children(a28);
			t31 = claim_text(a28_nodes, "@swyx");
			a28_nodes.forEach(detach);
			t32 = claim_text(p0_nodes, " came back to Singapore and visited us in ");
			a29 = claim_element(p0_nodes, "A", { href: true, rel: true });
			var a29_nodes = children(a29);
			t33 = claim_text(a29_nodes, "Shopee Singapore");
			a29_nodes.forEach(detach);
			t34 = claim_text(p0_nodes, " (");
			a30 = claim_element(p0_nodes, "A", { href: true, rel: true });
			var a30_nodes = children(a30);
			t35 = claim_text(a30_nodes, "We're hiring!");
			a30_nodes.forEach(detach);
			t36 = claim_text(p0_nodes, ").");
			p0_nodes.forEach(detach);
			t37 = claim_space(section1_nodes);
			p1 = claim_element(section1_nodes, "P", {});
			var p1_nodes = children(p1);
			t38 = claim_text(p1_nodes, "He gave an amazing sharing on ");
			a31 = claim_element(p1_nodes, "A", { href: true, rel: true });
			var a31_nodes = children(a31);
			t39 = claim_text(a31_nodes, "Compile Svelte in Your Head");
			a31_nodes.forEach(detach);
			t40 = claim_text(p1_nodes, " (");
			a32 = claim_element(p1_nodes, "A", { href: true, rel: true });
			var a32_nodes = children(a32);
			t41 = claim_text(a32_nodes, "video");
			a32_nodes.forEach(detach);
			t42 = claim_text(p1_nodes, ") in the ");
			a33 = claim_element(p1_nodes, "A", { href: true, rel: true });
			var a33_nodes = children(a33);
			t43 = claim_text(a33_nodes, "ReactKnowledgeable Originals");
			a33_nodes.forEach(detach);
			t44 = claim_text(p1_nodes, ".");
			p1_nodes.forEach(detach);
			t45 = claim_space(section1_nodes);
			p2 = claim_element(section1_nodes, "P", {});
			var p2_nodes = children(p2);
			t46 = claim_text(p2_nodes, "I love his presentation and the title is so catchy, so I begged him to use the catchy title as this series of articles about the Svelte compiler. It will be about how Svelte sees your code and compiles it down to plain JavaScript.");
			p2_nodes.forEach(detach);
			section1_nodes.forEach(detach);
			t47 = claim_space(nodes);
			section2 = claim_element(nodes, "SECTION", {});
			var section2_nodes = children(section2);
			h21 = claim_element(section2_nodes, "H2", {});
			var h21_nodes = children(h21);
			a34 = claim_element(h21_nodes, "A", { href: true, id: true });
			var a34_nodes = children(a34);
			t48 = claim_text(a34_nodes, "Introduction");
			a34_nodes.forEach(detach);
			h21_nodes.forEach(detach);
			t49 = claim_space(section2_nodes);
			p3 = claim_element(section2_nodes, "P", {});
			var p3_nodes = children(p3);
			t50 = claim_text(p3_nodes, "Lets refresh ourselves with how we write web app without any framework:");
			p3_nodes.forEach(detach);
			section2_nodes.forEach(detach);
			t51 = claim_space(nodes);
			section3 = claim_element(nodes, "SECTION", {});
			var section3_nodes = children(section3);
			h30 = claim_element(section3_nodes, "H3", {});
			var h30_nodes = children(h30);
			a35 = claim_element(h30_nodes, "A", { href: true, id: true });
			var a35_nodes = children(a35);
			t52 = claim_text(a35_nodes, "Creating an element");
			a35_nodes.forEach(detach);
			h30_nodes.forEach(detach);
			t53 = claim_space(section3_nodes);
			pre0 = claim_element(section3_nodes, "PRE", { class: true });
			var pre0_nodes = children(pre0);
			pre0_nodes.forEach(detach);
			section3_nodes.forEach(detach);
			t54 = claim_space(nodes);
			section4 = claim_element(nodes, "SECTION", {});
			var section4_nodes = children(section4);
			h31 = claim_element(section4_nodes, "H3", {});
			var h31_nodes = children(h31);
			a36 = claim_element(h31_nodes, "A", { href: true, id: true });
			var a36_nodes = children(a36);
			t55 = claim_text(a36_nodes, "Updating an element");
			a36_nodes.forEach(detach);
			h31_nodes.forEach(detach);
			t56 = claim_space(section4_nodes);
			pre1 = claim_element(section4_nodes, "PRE", { class: true });
			var pre1_nodes = children(pre1);
			pre1_nodes.forEach(detach);
			section4_nodes.forEach(detach);
			t57 = claim_space(nodes);
			section5 = claim_element(nodes, "SECTION", {});
			var section5_nodes = children(section5);
			h32 = claim_element(section5_nodes, "H3", {});
			var h32_nodes = children(h32);
			a37 = claim_element(h32_nodes, "A", { href: true, id: true });
			var a37_nodes = children(a37);
			t58 = claim_text(a37_nodes, "Removing an element");
			a37_nodes.forEach(detach);
			h32_nodes.forEach(detach);
			t59 = claim_space(section5_nodes);
			pre2 = claim_element(section5_nodes, "PRE", { class: true });
			var pre2_nodes = children(pre2);
			pre2_nodes.forEach(detach);
			section5_nodes.forEach(detach);
			t60 = claim_space(nodes);
			section6 = claim_element(nodes, "SECTION", {});
			var section6_nodes = children(section6);
			h33 = claim_element(section6_nodes, "H3", {});
			var h33_nodes = children(h33);
			a38 = claim_element(h33_nodes, "A", { href: true, id: true });
			var a38_nodes = children(a38);
			t61 = claim_text(a38_nodes, "Adding style to an element");
			a38_nodes.forEach(detach);
			h33_nodes.forEach(detach);
			t62 = claim_space(section6_nodes);
			pre3 = claim_element(section6_nodes, "PRE", { class: true });
			var pre3_nodes = children(pre3);
			pre3_nodes.forEach(detach);
			section6_nodes.forEach(detach);
			t63 = claim_space(nodes);
			section7 = claim_element(nodes, "SECTION", {});
			var section7_nodes = children(section7);
			h34 = claim_element(section7_nodes, "H3", {});
			var h34_nodes = children(h34);
			a39 = claim_element(h34_nodes, "A", { href: true, id: true });
			var a39_nodes = children(a39);
			t64 = claim_text(a39_nodes, "Listen for click events on an element");
			a39_nodes.forEach(detach);
			h34_nodes.forEach(detach);
			t65 = claim_space(section7_nodes);
			pre4 = claim_element(section7_nodes, "PRE", { class: true });
			var pre4_nodes = children(pre4);
			pre4_nodes.forEach(detach);
			t66 = claim_space(section7_nodes);
			p4 = claim_element(section7_nodes, "P", {});
			var p4_nodes = children(p4);
			t67 = claim_text(p4_nodes, "These are code that you have to write, without using any framework or library.");
			p4_nodes.forEach(detach);
			t68 = claim_space(section7_nodes);
			p5 = claim_element(section7_nodes, "P", {});
			var p5_nodes = children(p5);
			t69 = claim_text(p5_nodes, "The main idea of this article is to show how the Svelte compiler compiles the Svelte syntax into statements of codes that I've shown above.");
			p5_nodes.forEach(detach);
			section7_nodes.forEach(detach);
			t70 = claim_space(nodes);
			section8 = claim_element(nodes, "SECTION", {});
			var section8_nodes = children(section8);
			h22 = claim_element(section8_nodes, "H2", {});
			var h22_nodes = children(h22);
			a40 = claim_element(h22_nodes, "A", { href: true, id: true });
			var a40_nodes = children(a40);
			t71 = claim_text(a40_nodes, "Svelte syntax");
			a40_nodes.forEach(detach);
			h22_nodes.forEach(detach);
			t72 = claim_space(section8_nodes);
			p6 = claim_element(section8_nodes, "P", {});
			var p6_nodes = children(p6);
			t73 = claim_text(p6_nodes, "Here I'm going to show you some basics of the Svelte syntax.");
			p6_nodes.forEach(detach);
			t74 = claim_space(section8_nodes);
			blockquote0 = claim_element(section8_nodes, "BLOCKQUOTE", {});
			var blockquote0_nodes = children(blockquote0);
			p7 = claim_element(blockquote0_nodes, "P", {});
			var p7_nodes = children(p7);
			t75 = claim_text(p7_nodes, "If you wish to learn more, I highly recommend trying ");
			a41 = claim_element(p7_nodes, "A", { href: true, rel: true });
			var a41_nodes = children(a41);
			t76 = claim_text(a41_nodes, "Svelte's interactive tutorial");
			a41_nodes.forEach(detach);
			t77 = claim_text(p7_nodes, ".");
			p7_nodes.forEach(detach);
			blockquote0_nodes.forEach(detach);
			t78 = claim_space(section8_nodes);
			p8 = claim_element(section8_nodes, "P", {});
			var p8_nodes = children(p8);
			t79 = claim_text(p8_nodes, "So here is a basic Svelte component:");
			p8_nodes.forEach(detach);
			t80 = claim_space(section8_nodes);
			pre5 = claim_element(section8_nodes, "PRE", { class: true });
			var pre5_nodes = children(pre5);
			pre5_nodes.forEach(detach);
			t81 = claim_space(section8_nodes);
			p9 = claim_element(section8_nodes, "P", {});
			var p9_nodes = children(p9);
			a42 = claim_element(p9_nodes, "A", { href: true, rel: true });
			var a42_nodes = children(a42);
			t82 = claim_text(a42_nodes, "Svelte REPL");
			a42_nodes.forEach(detach);
			p9_nodes.forEach(detach);
			t83 = claim_space(section8_nodes);
			p10 = claim_element(section8_nodes, "P", {});
			var p10_nodes = children(p10);
			t84 = claim_text(p10_nodes, "To add style, you add a ");
			code0 = claim_element(p10_nodes, "CODE", {});
			var code0_nodes = children(code0);
			t85 = claim_text(code0_nodes, "<style>");
			code0_nodes.forEach(detach);
			t86 = claim_text(p10_nodes, " tag:");
			p10_nodes.forEach(detach);
			t87 = claim_space(section8_nodes);
			pre6 = claim_element(section8_nodes, "PRE", { class: true });
			var pre6_nodes = children(pre6);
			pre6_nodes.forEach(detach);
			t88 = claim_space(section8_nodes);
			p11 = claim_element(section8_nodes, "P", {});
			var p11_nodes = children(p11);
			a43 = claim_element(p11_nodes, "A", { href: true, rel: true });
			var a43_nodes = children(a43);
			t89 = claim_text(a43_nodes, "Svelte REPL");
			a43_nodes.forEach(detach);
			p11_nodes.forEach(detach);
			t90 = claim_space(section8_nodes);
			p12 = claim_element(section8_nodes, "P", {});
			var p12_nodes = children(p12);
			t91 = claim_text(p12_nodes, "At this point, writing Svelte component just feels like writing HTML, that's because Svelte syntax is a super set of the HTML syntax.");
			p12_nodes.forEach(detach);
			t92 = claim_space(section8_nodes);
			p13 = claim_element(section8_nodes, "P", {});
			var p13_nodes = children(p13);
			t93 = claim_text(p13_nodes, "Let's look at how we add a data to our component:");
			p13_nodes.forEach(detach);
			t94 = claim_space(section8_nodes);
			pre7 = claim_element(section8_nodes, "PRE", { class: true });
			var pre7_nodes = children(pre7);
			pre7_nodes.forEach(detach);
			t95 = claim_space(section8_nodes);
			p14 = claim_element(section8_nodes, "P", {});
			var p14_nodes = children(p14);
			a44 = claim_element(p14_nodes, "A", { href: true, rel: true });
			var a44_nodes = children(a44);
			t96 = claim_text(a44_nodes, "Svelte REPL");
			a44_nodes.forEach(detach);
			p14_nodes.forEach(detach);
			t97 = claim_space(section8_nodes);
			p15 = claim_element(section8_nodes, "P", {});
			var p15_nodes = children(p15);
			t98 = claim_text(p15_nodes, "We put JavaScript inside the curly brackets.");
			p15_nodes.forEach(detach);
			t99 = claim_space(section8_nodes);
			p16 = claim_element(section8_nodes, "P", {});
			var p16_nodes = children(p16);
			t100 = claim_text(p16_nodes, "To add a click handler, we use the ");
			code1 = claim_element(p16_nodes, "CODE", {});
			var code1_nodes = children(code1);
			t101 = claim_text(code1_nodes, "on:");
			code1_nodes.forEach(detach);
			t102 = claim_text(p16_nodes, " directive");
			p16_nodes.forEach(detach);
			t103 = claim_space(section8_nodes);
			pre8 = claim_element(section8_nodes, "PRE", { class: true });
			var pre8_nodes = children(pre8);
			pre8_nodes.forEach(detach);
			t104 = claim_space(section8_nodes);
			p17 = claim_element(section8_nodes, "P", {});
			var p17_nodes = children(p17);
			a45 = claim_element(p17_nodes, "A", { href: true, rel: true });
			var a45_nodes = children(a45);
			t105 = claim_text(a45_nodes, "Svelte REPL");
			a45_nodes.forEach(detach);
			p17_nodes.forEach(detach);
			t106 = claim_space(section8_nodes);
			p18 = claim_element(section8_nodes, "P", {});
			var p18_nodes = children(p18);
			t107 = claim_text(p18_nodes, "To change the data, we use ");
			a46 = claim_element(p18_nodes, "A", { href: true, rel: true });
			var a46_nodes = children(a46);
			t108 = claim_text(a46_nodes, "assignment operators");
			a46_nodes.forEach(detach);
			p18_nodes.forEach(detach);
			t109 = claim_space(section8_nodes);
			pre9 = claim_element(section8_nodes, "PRE", { class: true });
			var pre9_nodes = children(pre9);
			pre9_nodes.forEach(detach);
			t110 = claim_space(section8_nodes);
			p19 = claim_element(section8_nodes, "P", {});
			var p19_nodes = children(p19);
			a47 = claim_element(p19_nodes, "A", { href: true, rel: true });
			var a47_nodes = children(a47);
			t111 = claim_text(a47_nodes, "Svelte REPL");
			a47_nodes.forEach(detach);
			p19_nodes.forEach(detach);
			t112 = claim_space(section8_nodes);
			p20 = claim_element(section8_nodes, "P", {});
			var p20_nodes = children(p20);
			t113 = claim_text(p20_nodes, "Let's move on to see how Svelte syntax is compiled into JavaScript that we've seen earlier");
			p20_nodes.forEach(detach);
			section8_nodes.forEach(detach);
			t114 = claim_space(nodes);
			section9 = claim_element(nodes, "SECTION", {});
			var section9_nodes = children(section9);
			h23 = claim_element(section9_nodes, "H2", {});
			var h23_nodes = children(h23);
			a48 = claim_element(h23_nodes, "A", { href: true, id: true });
			var a48_nodes = children(a48);
			t115 = claim_text(a48_nodes, "Compile Svelte in your Head");
			a48_nodes.forEach(detach);
			h23_nodes.forEach(detach);
			t116 = claim_space(section9_nodes);
			p21 = claim_element(section9_nodes, "P", {});
			var p21_nodes = children(p21);
			t117 = claim_text(p21_nodes, "The Svelte compiler analyses the code you write and generates an optimised JavaScript output.");
			p21_nodes.forEach(detach);
			t118 = claim_space(section9_nodes);
			p22 = claim_element(section9_nodes, "P", {});
			var p22_nodes = children(p22);
			t119 = claim_text(p22_nodes, "To study how Svelte compiles the code, lets start with the smallest example possible, and slowly build up the code. Through the process, you will see that Svelte incrementally adds to the output code based on your changes.");
			p22_nodes.forEach(detach);
			t120 = claim_space(section9_nodes);
			p23 = claim_element(section9_nodes, "P", {});
			var p23_nodes = children(p23);
			t121 = claim_text(p23_nodes, "The first example that we are going to see is:");
			p23_nodes.forEach(detach);
			t122 = claim_space(section9_nodes);
			pre10 = claim_element(section9_nodes, "PRE", { class: true });
			var pre10_nodes = children(pre10);
			pre10_nodes.forEach(detach);
			t123 = claim_space(section9_nodes);
			p24 = claim_element(section9_nodes, "P", {});
			var p24_nodes = children(p24);
			a49 = claim_element(p24_nodes, "A", { href: true, rel: true });
			var a49_nodes = children(a49);
			t124 = claim_text(a49_nodes, "Svelte REPL");
			a49_nodes.forEach(detach);
			p24_nodes.forEach(detach);
			t125 = claim_space(section9_nodes);
			p25 = claim_element(section9_nodes, "P", {});
			var p25_nodes = children(p25);
			t126 = claim_text(p25_nodes, "The output code:");
			p25_nodes.forEach(detach);
			t127 = claim_space(section9_nodes);
			pre11 = claim_element(section9_nodes, "PRE", { class: true });
			var pre11_nodes = children(pre11);
			pre11_nodes.forEach(detach);
			t128 = claim_space(section9_nodes);
			p26 = claim_element(section9_nodes, "P", {});
			var p26_nodes = children(p26);
			t129 = claim_text(p26_nodes, "You can break down the output code into 2 sections:");
			p26_nodes.forEach(detach);
			t130 = claim_space(section9_nodes);
			ul7 = claim_element(section9_nodes, "UL", {});
			var ul7_nodes = children(ul7);
			li27 = claim_element(ul7_nodes, "LI", {});
			var li27_nodes = children(li27);
			code2 = claim_element(li27_nodes, "CODE", {});
			var code2_nodes = children(code2);
			t131 = claim_text(code2_nodes, "create_fragment");
			code2_nodes.forEach(detach);
			li27_nodes.forEach(detach);
			t132 = claim_space(ul7_nodes);
			li28 = claim_element(ul7_nodes, "LI", {});
			var li28_nodes = children(li28);
			code3 = claim_element(li28_nodes, "CODE", {});
			var code3_nodes = children(code3);
			t133 = claim_text(code3_nodes, "class App extends SvelteComponent");
			code3_nodes.forEach(detach);
			li28_nodes.forEach(detach);
			ul7_nodes.forEach(detach);
			section9_nodes.forEach(detach);
			t134 = claim_space(nodes);
			section10 = claim_element(nodes, "SECTION", {});
			var section10_nodes = children(section10);
			h35 = claim_element(section10_nodes, "H3", {});
			var h35_nodes = children(h35);
			a50 = claim_element(h35_nodes, "A", { href: true, id: true });
			var a50_nodes = children(a50);
			t135 = claim_text(a50_nodes, "create_fragment");
			a50_nodes.forEach(detach);
			h35_nodes.forEach(detach);
			t136 = claim_space(section10_nodes);
			p27 = claim_element(section10_nodes, "P", {});
			var p27_nodes = children(p27);
			t137 = claim_text(p27_nodes, "Svelte components are the building blocks of a Svelte application. Each Svelte component focuses on building its piece or fragment of the final DOM.");
			p27_nodes.forEach(detach);
			t138 = claim_space(section10_nodes);
			p28 = claim_element(section10_nodes, "P", {});
			var p28_nodes = children(p28);
			t139 = claim_text(p28_nodes, "The ");
			code4 = claim_element(p28_nodes, "CODE", {});
			var code4_nodes = children(code4);
			t140 = claim_text(code4_nodes, "create_fragment");
			code4_nodes.forEach(detach);
			t141 = claim_text(p28_nodes, " function gives the Svelte component an instruction manual on how to build the DOM fragment.");
			p28_nodes.forEach(detach);
			t142 = claim_space(section10_nodes);
			p29 = claim_element(section10_nodes, "P", {});
			var p29_nodes = children(p29);
			t143 = claim_text(p29_nodes, "Look at the return object of the ");
			code5 = claim_element(p29_nodes, "CODE", {});
			var code5_nodes = children(code5);
			t144 = claim_text(code5_nodes, "create_fragment");
			code5_nodes.forEach(detach);
			t145 = claim_text(p29_nodes, " function. It has methods, such as:");
			p29_nodes.forEach(detach);
			section10_nodes.forEach(detach);
			t146 = claim_space(nodes);
			section11 = claim_element(nodes, "SECTION", {});
			var section11_nodes = children(section11);
			h40 = claim_element(section11_nodes, "H4", {});
			var h40_nodes = children(h40);
			a51 = claim_element(h40_nodes, "A", { href: true, id: true });
			var a51_nodes = children(a51);
			t147 = claim_text(a51_nodes, "- c()");
			a51_nodes.forEach(detach);
			h40_nodes.forEach(detach);
			t148 = claim_space(section11_nodes);
			p30 = claim_element(section11_nodes, "P", {});
			var p30_nodes = children(p30);
			t149 = claim_text(p30_nodes, "Short for ");
			strong0 = claim_element(p30_nodes, "STRONG", {});
			var strong0_nodes = children(strong0);
			t150 = claim_text(strong0_nodes, "create");
			strong0_nodes.forEach(detach);
			t151 = claim_text(p30_nodes, ".");
			p30_nodes.forEach(detach);
			t152 = claim_space(section11_nodes);
			p31 = claim_element(section11_nodes, "P", {});
			var p31_nodes = children(p31);
			t153 = claim_text(p31_nodes, "Contains instructions to create all the elements in the fragment.");
			p31_nodes.forEach(detach);
			t154 = claim_space(section11_nodes);
			p32 = claim_element(section11_nodes, "P", {});
			var p32_nodes = children(p32);
			t155 = claim_text(p32_nodes, "In this example, it contains instructions to create the ");
			code6 = claim_element(p32_nodes, "CODE", {});
			var code6_nodes = children(code6);
			t156 = claim_text(code6_nodes, "h1");
			code6_nodes.forEach(detach);
			t157 = claim_text(p32_nodes, " element");
			p32_nodes.forEach(detach);
			t158 = claim_space(section11_nodes);
			pre12 = claim_element(section11_nodes, "PRE", { class: true });
			var pre12_nodes = children(pre12);
			pre12_nodes.forEach(detach);
			section11_nodes.forEach(detach);
			t159 = claim_space(nodes);
			section12 = claim_element(nodes, "SECTION", {});
			var section12_nodes = children(section12);
			h41 = claim_element(section12_nodes, "H4", {});
			var h41_nodes = children(h41);
			a52 = claim_element(h41_nodes, "A", { href: true, id: true });
			var a52_nodes = children(a52);
			t160 = claim_text(a52_nodes, "- m(target, anchor)");
			a52_nodes.forEach(detach);
			h41_nodes.forEach(detach);
			t161 = claim_space(section12_nodes);
			p33 = claim_element(section12_nodes, "P", {});
			var p33_nodes = children(p33);
			t162 = claim_text(p33_nodes, "Short for ");
			strong1 = claim_element(p33_nodes, "STRONG", {});
			var strong1_nodes = children(strong1);
			t163 = claim_text(strong1_nodes, "mount");
			strong1_nodes.forEach(detach);
			t164 = claim_text(p33_nodes, ".");
			p33_nodes.forEach(detach);
			t165 = claim_space(section12_nodes);
			p34 = claim_element(section12_nodes, "P", {});
			var p34_nodes = children(p34);
			t166 = claim_text(p34_nodes, "Contains instructions to mount the elements into the target.");
			p34_nodes.forEach(detach);
			t167 = claim_space(section12_nodes);
			p35 = claim_element(section12_nodes, "P", {});
			var p35_nodes = children(p35);
			t168 = claim_text(p35_nodes, "In this example, it contains instructions to insert the ");
			code7 = claim_element(p35_nodes, "CODE", {});
			var code7_nodes = children(code7);
			t169 = claim_text(code7_nodes, "h1");
			code7_nodes.forEach(detach);
			t170 = claim_text(p35_nodes, " element into the ");
			code8 = claim_element(p35_nodes, "CODE", {});
			var code8_nodes = children(code8);
			t171 = claim_text(code8_nodes, "target");
			code8_nodes.forEach(detach);
			t172 = claim_text(p35_nodes, ".");
			p35_nodes.forEach(detach);
			t173 = claim_space(section12_nodes);
			pre13 = claim_element(section12_nodes, "PRE", { class: true });
			var pre13_nodes = children(pre13);
			pre13_nodes.forEach(detach);
			section12_nodes.forEach(detach);
			t174 = claim_space(nodes);
			section13 = claim_element(nodes, "SECTION", {});
			var section13_nodes = children(section13);
			h42 = claim_element(section13_nodes, "H4", {});
			var h42_nodes = children(h42);
			a53 = claim_element(h42_nodes, "A", { href: true, id: true });
			var a53_nodes = children(a53);
			t175 = claim_text(a53_nodes, "- d(detaching)");
			a53_nodes.forEach(detach);
			h42_nodes.forEach(detach);
			t176 = claim_space(section13_nodes);
			p36 = claim_element(section13_nodes, "P", {});
			var p36_nodes = children(p36);
			t177 = claim_text(p36_nodes, "Short for ");
			strong2 = claim_element(p36_nodes, "STRONG", {});
			var strong2_nodes = children(strong2);
			t178 = claim_text(strong2_nodes, "destroy");
			strong2_nodes.forEach(detach);
			t179 = claim_text(p36_nodes, ".");
			p36_nodes.forEach(detach);
			t180 = claim_space(section13_nodes);
			p37 = claim_element(section13_nodes, "P", {});
			var p37_nodes = children(p37);
			t181 = claim_text(p37_nodes, "Contains instructions to remove the elements from the target.");
			p37_nodes.forEach(detach);
			t182 = claim_space(section13_nodes);
			p38 = claim_element(section13_nodes, "P", {});
			var p38_nodes = children(p38);
			t183 = claim_text(p38_nodes, "In this example, we detach the ");
			code9 = claim_element(p38_nodes, "CODE", {});
			var code9_nodes = children(code9);
			t184 = claim_text(code9_nodes, "h1");
			code9_nodes.forEach(detach);
			t185 = claim_text(p38_nodes, " element from the DOM");
			p38_nodes.forEach(detach);
			t186 = claim_space(section13_nodes);
			pre14 = claim_element(section13_nodes, "PRE", { class: true });
			var pre14_nodes = children(pre14);
			pre14_nodes.forEach(detach);
			t187 = claim_space(section13_nodes);
			blockquote1 = claim_element(section13_nodes, "BLOCKQUOTE", {});
			var blockquote1_nodes = children(blockquote1);
			p39 = claim_element(blockquote1_nodes, "P", {});
			var p39_nodes = children(p39);
			t188 = claim_text(p39_nodes, "The method names are short for better minification. ");
			a54 = claim_element(p39_nodes, "A", { href: true, rel: true });
			var a54_nodes = children(a54);
			t189 = claim_text(a54_nodes, "See what can't be minified here");
			a54_nodes.forEach(detach);
			t190 = claim_text(p39_nodes, ".");
			p39_nodes.forEach(detach);
			blockquote1_nodes.forEach(detach);
			section13_nodes.forEach(detach);
			t191 = claim_space(nodes);
			section14 = claim_element(nodes, "SECTION", {});
			var section14_nodes = children(section14);
			h36 = claim_element(section14_nodes, "H3", {});
			var h36_nodes = children(h36);
			a55 = claim_element(h36_nodes, "A", { href: true, id: true });
			var a55_nodes = children(a55);
			t192 = claim_text(a55_nodes, "export default class App extends SvelteComponent");
			a55_nodes.forEach(detach);
			h36_nodes.forEach(detach);
			t193 = claim_space(section14_nodes);
			p40 = claim_element(section14_nodes, "P", {});
			var p40_nodes = children(p40);
			t194 = claim_text(p40_nodes, "Each component is a class, which you can import and instantiate through ");
			a56 = claim_element(p40_nodes, "A", { href: true, rel: true });
			var a56_nodes = children(a56);
			t195 = claim_text(a56_nodes, "this API");
			a56_nodes.forEach(detach);
			t196 = claim_text(p40_nodes, ".");
			p40_nodes.forEach(detach);
			t197 = claim_space(section14_nodes);
			p41 = claim_element(section14_nodes, "P", {});
			var p41_nodes = children(p41);
			t198 = claim_text(p41_nodes, "And in the constructor, we initialize the component with information that made up the component such as ");
			code10 = claim_element(p41_nodes, "CODE", {});
			var code10_nodes = children(code10);
			t199 = claim_text(code10_nodes, "create_fragment");
			code10_nodes.forEach(detach);
			t200 = claim_text(p41_nodes, ". Svelte will only pass information that it is needed and remove them whenever it is not necessary.");
			p41_nodes.forEach(detach);
			t201 = claim_space(section14_nodes);
			p42 = claim_element(section14_nodes, "P", {});
			var p42_nodes = children(p42);
			t202 = claim_text(p42_nodes, "Try removing the ");
			code11 = claim_element(p42_nodes, "CODE", {});
			var code11_nodes = children(code11);
			t203 = claim_text(code11_nodes, "<h1>");
			code11_nodes.forEach(detach);
			t204 = claim_text(p42_nodes, " tag and see what happens to the output:");
			p42_nodes.forEach(detach);
			t205 = claim_space(section14_nodes);
			pre15 = claim_element(section14_nodes, "PRE", { class: true });
			var pre15_nodes = children(pre15);
			pre15_nodes.forEach(detach);
			t206 = claim_space(section14_nodes);
			p43 = claim_element(section14_nodes, "P", {});
			var p43_nodes = children(p43);
			a57 = claim_element(p43_nodes, "A", { href: true, rel: true });
			var a57_nodes = children(a57);
			t207 = claim_text(a57_nodes, "Svelte REPL");
			a57_nodes.forEach(detach);
			p43_nodes.forEach(detach);
			t208 = claim_space(section14_nodes);
			pre16 = claim_element(section14_nodes, "PRE", { class: true });
			var pre16_nodes = children(pre16);
			pre16_nodes.forEach(detach);
			t209 = claim_space(section14_nodes);
			p44 = claim_element(section14_nodes, "P", {});
			var p44_nodes = children(p44);
			t210 = claim_text(p44_nodes, "Svelte will pass in ");
			code12 = claim_element(p44_nodes, "CODE", {});
			var code12_nodes = children(code12);
			t211 = claim_text(code12_nodes, "null");
			code12_nodes.forEach(detach);
			t212 = claim_text(p44_nodes, " instead of ");
			code13 = claim_element(p44_nodes, "CODE", {});
			var code13_nodes = children(code13);
			t213 = claim_text(code13_nodes, "create_fragment");
			code13_nodes.forEach(detach);
			t214 = claim_text(p44_nodes, "!");
			p44_nodes.forEach(detach);
			t215 = claim_space(section14_nodes);
			p45 = claim_element(section14_nodes, "P", {});
			var p45_nodes = children(p45);
			t216 = claim_text(p45_nodes, "The ");
			code14 = claim_element(p45_nodes, "CODE", {});
			var code14_nodes = children(code14);
			t217 = claim_text(code14_nodes, "init");
			code14_nodes.forEach(detach);
			t218 = claim_text(p45_nodes, " function is where Svelte sets up most of the internals, such as:");
			p45_nodes.forEach(detach);
			t219 = claim_space(section14_nodes);
			ul8 = claim_element(section14_nodes, "UL", {});
			var ul8_nodes = children(ul8);
			li29 = claim_element(ul8_nodes, "LI", {});
			var li29_nodes = children(li29);
			t220 = claim_text(li29_nodes, "component props, ");
			code15 = claim_element(li29_nodes, "CODE", {});
			var code15_nodes = children(code15);
			t221 = claim_text(code15_nodes, "ctx");
			code15_nodes.forEach(detach);
			t222 = claim_text(li29_nodes, " (will explain what ");
			code16 = claim_element(li29_nodes, "CODE", {});
			var code16_nodes = children(code16);
			t223 = claim_text(code16_nodes, "ctx");
			code16_nodes.forEach(detach);
			t224 = claim_text(li29_nodes, " is later) and context");
			li29_nodes.forEach(detach);
			t225 = claim_space(ul8_nodes);
			li30 = claim_element(ul8_nodes, "LI", {});
			var li30_nodes = children(li30);
			t226 = claim_text(li30_nodes, "component lifecycle events");
			li30_nodes.forEach(detach);
			t227 = claim_space(ul8_nodes);
			li31 = claim_element(ul8_nodes, "LI", {});
			var li31_nodes = children(li31);
			t228 = claim_text(li31_nodes, "component update mechanism");
			li31_nodes.forEach(detach);
			ul8_nodes.forEach(detach);
			t229 = claim_space(section14_nodes);
			p46 = claim_element(section14_nodes, "P", {});
			var p46_nodes = children(p46);
			t230 = claim_text(p46_nodes, "and at the very end, Svelte calls the ");
			code17 = claim_element(p46_nodes, "CODE", {});
			var code17_nodes = children(code17);
			t231 = claim_text(code17_nodes, "create_fragment");
			code17_nodes.forEach(detach);
			t232 = claim_text(p46_nodes, " to create and mount elements into the DOM.");
			p46_nodes.forEach(detach);
			t233 = claim_space(section14_nodes);
			p47 = claim_element(section14_nodes, "P", {});
			var p47_nodes = children(p47);
			t234 = claim_text(p47_nodes, "If you noticed, all the internal state and methods are attached to ");
			code18 = claim_element(p47_nodes, "CODE", {});
			var code18_nodes = children(code18);
			t235 = claim_text(code18_nodes, "this.$$");
			code18_nodes.forEach(detach);
			t236 = claim_text(p47_nodes, ".");
			p47_nodes.forEach(detach);
			t237 = claim_space(section14_nodes);
			p48 = claim_element(section14_nodes, "P", {});
			var p48_nodes = children(p48);
			t238 = claim_text(p48_nodes, "So if you ever access the ");
			code19 = claim_element(p48_nodes, "CODE", {});
			var code19_nodes = children(code19);
			t239 = claim_text(code19_nodes, "$$");
			code19_nodes.forEach(detach);
			t240 = claim_text(p48_nodes, " property of the component, you are tapping into the internals. You've been warned! 🙈🚨");
			p48_nodes.forEach(detach);
			section14_nodes.forEach(detach);
			t241 = claim_space(nodes);
			section15 = claim_element(nodes, "SECTION", {});
			var section15_nodes = children(section15);
			h37 = claim_element(section15_nodes, "H3", {});
			var h37_nodes = children(h37);
			a58 = claim_element(h37_nodes, "A", { href: true, id: true });
			var a58_nodes = children(a58);
			t242 = claim_text(a58_nodes, "Adding data");
			a58_nodes.forEach(detach);
			h37_nodes.forEach(detach);
			t243 = claim_space(section15_nodes);
			p49 = claim_element(section15_nodes, "P", {});
			var p49_nodes = children(p49);
			t244 = claim_text(p49_nodes, "Now that we've looked at the bare minimum of a Svelte component, let's see how adding a data would change the compiled output:");
			p49_nodes.forEach(detach);
			t245 = claim_space(section15_nodes);
			pre17 = claim_element(section15_nodes, "PRE", { class: true });
			var pre17_nodes = children(pre17);
			pre17_nodes.forEach(detach);
			t246 = claim_space(section15_nodes);
			p50 = claim_element(section15_nodes, "P", {});
			var p50_nodes = children(p50);
			a59 = claim_element(p50_nodes, "A", { href: true, rel: true });
			var a59_nodes = children(a59);
			t247 = claim_text(a59_nodes, "Svelte REPL");
			a59_nodes.forEach(detach);
			p50_nodes.forEach(detach);
			t248 = claim_space(section15_nodes);
			p51 = claim_element(section15_nodes, "P", {});
			var p51_nodes = children(p51);
			t249 = claim_text(p51_nodes, "Notice the change in the output:");
			p51_nodes.forEach(detach);
			t250 = claim_space(section15_nodes);
			pre18 = claim_element(section15_nodes, "PRE", { class: true });
			var pre18_nodes = children(pre18);
			pre18_nodes.forEach(detach);
			t251 = claim_space(section15_nodes);
			p52 = claim_element(section15_nodes, "P", {});
			var p52_nodes = children(p52);
			t252 = claim_text(p52_nodes, "Some observations:");
			p52_nodes.forEach(detach);
			t253 = claim_space(section15_nodes);
			ul9 = claim_element(section15_nodes, "UL", {});
			var ul9_nodes = children(ul9);
			li32 = claim_element(ul9_nodes, "LI", {});
			var li32_nodes = children(li32);
			t254 = claim_text(li32_nodes, "What you've written in the ");
			code20 = claim_element(li32_nodes, "CODE", {});
			var code20_nodes = children(code20);
			t255 = claim_text(code20_nodes, "<script>");
			code20_nodes.forEach(detach);
			t256 = claim_text(li32_nodes, " tag is moved into the top level of the code");
			li32_nodes.forEach(detach);
			t257 = claim_space(ul9_nodes);
			li33 = claim_element(ul9_nodes, "LI", {});
			var li33_nodes = children(li33);
			code21 = claim_element(li33_nodes, "CODE", {});
			var code21_nodes = children(code21);
			t258 = claim_text(code21_nodes, "h1");
			code21_nodes.forEach(detach);
			t259 = claim_text(li33_nodes, " element's text content is now a template literal");
			li33_nodes.forEach(detach);
			ul9_nodes.forEach(detach);
			t260 = claim_space(section15_nodes);
			p53 = claim_element(section15_nodes, "P", {});
			var p53_nodes = children(p53);
			t261 = claim_text(p53_nodes, "There's a lot of amazing things happening under the hood right now, but let's hold our horses for a while, because it's best explained when comparing with the next code change.");
			p53_nodes.forEach(detach);
			section15_nodes.forEach(detach);
			t262 = claim_space(nodes);
			section16 = claim_element(nodes, "SECTION", {});
			var section16_nodes = children(section16);
			h38 = claim_element(section16_nodes, "H3", {});
			var h38_nodes = children(h38);
			a60 = claim_element(h38_nodes, "A", { href: true, id: true });
			var a60_nodes = children(a60);
			t263 = claim_text(a60_nodes, "Updating data");
			a60_nodes.forEach(detach);
			h38_nodes.forEach(detach);
			t264 = claim_space(section16_nodes);
			p54 = claim_element(section16_nodes, "P", {});
			var p54_nodes = children(p54);
			t265 = claim_text(p54_nodes, "Let's add a function to update the ");
			code22 = claim_element(p54_nodes, "CODE", {});
			var code22_nodes = children(code22);
			t266 = claim_text(code22_nodes, "name");
			code22_nodes.forEach(detach);
			t267 = claim_text(p54_nodes, ":");
			p54_nodes.forEach(detach);
			t268 = claim_space(section16_nodes);
			pre19 = claim_element(section16_nodes, "PRE", { class: true });
			var pre19_nodes = children(pre19);
			pre19_nodes.forEach(detach);
			t269 = claim_space(section16_nodes);
			p55 = claim_element(section16_nodes, "P", {});
			var p55_nodes = children(p55);
			a61 = claim_element(p55_nodes, "A", { href: true, rel: true });
			var a61_nodes = children(a61);
			t270 = claim_text(a61_nodes, "Svelte REPL");
			a61_nodes.forEach(detach);
			p55_nodes.forEach(detach);
			t271 = claim_space(section16_nodes);
			p56 = claim_element(section16_nodes, "P", {});
			var p56_nodes = children(p56);
			t272 = claim_text(p56_nodes, "...and observe the change in the compiled output:");
			p56_nodes.forEach(detach);
			t273 = claim_space(section16_nodes);
			pre20 = claim_element(section16_nodes, "PRE", { class: true });
			var pre20_nodes = children(pre20);
			pre20_nodes.forEach(detach);
			t274 = claim_space(section16_nodes);
			p57 = claim_element(section16_nodes, "P", {});
			var p57_nodes = children(p57);
			t275 = claim_text(p57_nodes, "Some observations:");
			p57_nodes.forEach(detach);
			t276 = claim_space(section16_nodes);
			ul10 = claim_element(section16_nodes, "UL", {});
			var ul10_nodes = children(ul10);
			li34 = claim_element(ul10_nodes, "LI", {});
			var li34_nodes = children(li34);
			t277 = claim_text(li34_nodes, "the text content of ");
			code23 = claim_element(li34_nodes, "CODE", {});
			var code23_nodes = children(code23);
			t278 = claim_text(code23_nodes, "<h1>");
			code23_nodes.forEach(detach);
			t279 = claim_text(li34_nodes, " element is now broken into 2 text nodes, created by the ");
			code24 = claim_element(li34_nodes, "CODE", {});
			var code24_nodes = children(code24);
			t280 = claim_text(code24_nodes, "text(...)");
			code24_nodes.forEach(detach);
			t281 = claim_text(li34_nodes, " function");
			li34_nodes.forEach(detach);
			t282 = claim_space(ul10_nodes);
			li35 = claim_element(ul10_nodes, "LI", {});
			var li35_nodes = children(li35);
			t283 = claim_text(li35_nodes, "the return object of the ");
			code25 = claim_element(li35_nodes, "CODE", {});
			var code25_nodes = children(code25);
			t284 = claim_text(code25_nodes, "create_fragment");
			code25_nodes.forEach(detach);
			t285 = claim_text(li35_nodes, " has a new method, ");
			code26 = claim_element(li35_nodes, "CODE", {});
			var code26_nodes = children(code26);
			t286 = claim_text(code26_nodes, "p(ctx, dirty)");
			code26_nodes.forEach(detach);
			li35_nodes.forEach(detach);
			t287 = claim_space(ul10_nodes);
			li36 = claim_element(ul10_nodes, "LI", {});
			var li36_nodes = children(li36);
			t288 = claim_text(li36_nodes, "a new function ");
			code27 = claim_element(li36_nodes, "CODE", {});
			var code27_nodes = children(code27);
			t289 = claim_text(code27_nodes, "instance");
			code27_nodes.forEach(detach);
			t290 = claim_text(li36_nodes, " is created");
			li36_nodes.forEach(detach);
			t291 = claim_space(ul10_nodes);
			li37 = claim_element(ul10_nodes, "LI", {});
			var li37_nodes = children(li37);
			t292 = claim_text(li37_nodes, "What you've written in the ");
			code28 = claim_element(li37_nodes, "CODE", {});
			var code28_nodes = children(code28);
			t293 = claim_text(code28_nodes, "<script>");
			code28_nodes.forEach(detach);
			t294 = claim_text(li37_nodes, " tag is now moved into the ");
			code29 = claim_element(li37_nodes, "CODE", {});
			var code29_nodes = children(code29);
			t295 = claim_text(code29_nodes, "instance");
			code29_nodes.forEach(detach);
			t296 = claim_text(li37_nodes, " function");
			li37_nodes.forEach(detach);
			t297 = claim_space(ul10_nodes);
			li38 = claim_element(ul10_nodes, "LI", {});
			var li38_nodes = children(li38);
			t298 = claim_text(li38_nodes, "for the sharp-eyed, the variable ");
			code30 = claim_element(li38_nodes, "CODE", {});
			var code30_nodes = children(code30);
			t299 = claim_text(code30_nodes, "name");
			code30_nodes.forEach(detach);
			t300 = claim_text(li38_nodes, " that was used in the ");
			code31 = claim_element(li38_nodes, "CODE", {});
			var code31_nodes = children(code31);
			t301 = claim_text(code31_nodes, "create_fragment");
			code31_nodes.forEach(detach);
			t302 = claim_text(li38_nodes, " is now replaced by ");
			code32 = claim_element(li38_nodes, "CODE", {});
			var code32_nodes = children(code32);
			t303 = claim_text(code32_nodes, "ctx[0]");
			code32_nodes.forEach(detach);
			li38_nodes.forEach(detach);
			ul10_nodes.forEach(detach);
			t304 = claim_space(section16_nodes);
			p58 = claim_element(section16_nodes, "P", {});
			var p58_nodes = children(p58);
			t305 = claim_text(p58_nodes, "So, why the change?");
			p58_nodes.forEach(detach);
			t306 = claim_space(section16_nodes);
			p59 = claim_element(section16_nodes, "P", {});
			var p59_nodes = children(p59);
			t307 = claim_text(p59_nodes, "The Svelte compiler tracks all the variables declared in the ");
			code33 = claim_element(p59_nodes, "CODE", {});
			var code33_nodes = children(code33);
			t308 = claim_text(code33_nodes, "<script>");
			code33_nodes.forEach(detach);
			t309 = claim_text(p59_nodes, " tag.");
			p59_nodes.forEach(detach);
			t310 = claim_space(section16_nodes);
			p60 = claim_element(section16_nodes, "P", {});
			var p60_nodes = children(p60);
			t311 = claim_text(p60_nodes, "It tracks whether the variable:");
			p60_nodes.forEach(detach);
			t312 = claim_space(section16_nodes);
			ul11 = claim_element(section16_nodes, "UL", {});
			var ul11_nodes = children(ul11);
			li39 = claim_element(ul11_nodes, "LI", {});
			var li39_nodes = children(li39);
			t313 = claim_text(li39_nodes, "can be mutated? eg: ");
			code34 = claim_element(li39_nodes, "CODE", {});
			var code34_nodes = children(code34);
			t314 = claim_text(code34_nodes, "count++");
			code34_nodes.forEach(detach);
			t315 = claim_text(li39_nodes, ",");
			li39_nodes.forEach(detach);
			t316 = claim_space(ul11_nodes);
			li40 = claim_element(ul11_nodes, "LI", {});
			var li40_nodes = children(li40);
			t317 = claim_text(li40_nodes, "can be reassigned? eg: ");
			code35 = claim_element(li40_nodes, "CODE", {});
			var code35_nodes = children(code35);
			t318 = claim_text(code35_nodes, "name = 'Svelte'");
			code35_nodes.forEach(detach);
			t319 = claim_text(li40_nodes, ",");
			li40_nodes.forEach(detach);
			t320 = claim_space(ul11_nodes);
			li41 = claim_element(ul11_nodes, "LI", {});
			var li41_nodes = children(li41);
			t321 = claim_text(li41_nodes, "is referenced in the template? eg: ");
			code36 = claim_element(li41_nodes, "CODE", {});
			var code36_nodes = children(code36);
			t322 = claim_text(code36_nodes, "<h1>Hello {name}</h1>");
			code36_nodes.forEach(detach);
			li41_nodes.forEach(detach);
			t323 = claim_space(ul11_nodes);
			li42 = claim_element(ul11_nodes, "LI", {});
			var li42_nodes = children(li42);
			t324 = claim_text(li42_nodes, "is writable? eg: ");
			code37 = claim_element(li42_nodes, "CODE", {});
			var code37_nodes = children(code37);
			t325 = claim_text(code37_nodes, "const i = 1;");
			code37_nodes.forEach(detach);
			t326 = claim_text(li42_nodes, " vs ");
			code38 = claim_element(li42_nodes, "CODE", {});
			var code38_nodes = children(code38);
			t327 = claim_text(code38_nodes, "let i = 1;");
			code38_nodes.forEach(detach);
			li42_nodes.forEach(detach);
			t328 = claim_space(ul11_nodes);
			li43 = claim_element(ul11_nodes, "LI", {});
			var li43_nodes = children(li43);
			t329 = claim_text(li43_nodes, "... and many more");
			li43_nodes.forEach(detach);
			ul11_nodes.forEach(detach);
			t330 = claim_space(section16_nodes);
			p61 = claim_element(section16_nodes, "P", {});
			var p61_nodes = children(p61);
			t331 = claim_text(p61_nodes, "When the Svelte compiler realises that the variable ");
			code39 = claim_element(p61_nodes, "CODE", {});
			var code39_nodes = children(code39);
			t332 = claim_text(code39_nodes, "name");
			code39_nodes.forEach(detach);
			t333 = claim_text(p61_nodes, " can be reassigned, (due to ");
			code40 = claim_element(p61_nodes, "CODE", {});
			var code40_nodes = children(code40);
			t334 = claim_text(code40_nodes, "name = 'Svelte';");
			code40_nodes.forEach(detach);
			t335 = claim_text(p61_nodes, " in ");
			code41 = claim_element(p61_nodes, "CODE", {});
			var code41_nodes = children(code41);
			t336 = claim_text(code41_nodes, "update");
			code41_nodes.forEach(detach);
			t337 = claim_text(p61_nodes, "), it breaks down the text content of the ");
			code42 = claim_element(p61_nodes, "CODE", {});
			var code42_nodes = children(code42);
			t338 = claim_text(code42_nodes, "h1");
			code42_nodes.forEach(detach);
			t339 = claim_text(p61_nodes, " into parts, so that it can dynamically update part of the text.");
			p61_nodes.forEach(detach);
			t340 = claim_space(section16_nodes);
			p62 = claim_element(section16_nodes, "P", {});
			var p62_nodes = children(p62);
			t341 = claim_text(p62_nodes, "Indeed, you can see that there's a new method, ");
			code43 = claim_element(p62_nodes, "CODE", {});
			var code43_nodes = children(code43);
			t342 = claim_text(code43_nodes, "p");
			code43_nodes.forEach(detach);
			t343 = claim_text(p62_nodes, ", to update the text node.");
			p62_nodes.forEach(detach);
			section16_nodes.forEach(detach);
			t344 = claim_space(nodes);
			section17 = claim_element(nodes, "SECTION", {});
			var section17_nodes = children(section17);
			h43 = claim_element(section17_nodes, "H4", {});
			var h43_nodes = children(h43);
			a62 = claim_element(h43_nodes, "A", { href: true, id: true });
			var a62_nodes = children(a62);
			t345 = claim_text(a62_nodes, "- p(ctx, dirty)");
			a62_nodes.forEach(detach);
			h43_nodes.forEach(detach);
			t346 = claim_space(section17_nodes);
			p63 = claim_element(section17_nodes, "P", {});
			var p63_nodes = children(p63);
			t347 = claim_text(p63_nodes, "Short for ");
			strong3 = claim_element(p63_nodes, "STRONG", {});
			var strong3_nodes = children(strong3);
			t348 = claim_text(strong3_nodes, "u_p_date");
			strong3_nodes.forEach(detach);
			t349 = claim_text(p63_nodes, ".");
			p63_nodes.forEach(detach);
			t350 = claim_space(section17_nodes);
			p64 = claim_element(section17_nodes, "P", {});
			var p64_nodes = children(p64);
			strong4 = claim_element(p64_nodes, "STRONG", {});
			var strong4_nodes = children(strong4);
			t351 = claim_text(strong4_nodes, "p(ctx, dirty)");
			strong4_nodes.forEach(detach);
			t352 = claim_text(p64_nodes, " contains instructions to update the elements based on what has changed in the state (");
			code44 = claim_element(p64_nodes, "CODE", {});
			var code44_nodes = children(code44);
			t353 = claim_text(code44_nodes, "dirty");
			code44_nodes.forEach(detach);
			t354 = claim_text(p64_nodes, ") and the state (");
			code45 = claim_element(p64_nodes, "CODE", {});
			var code45_nodes = children(code45);
			t355 = claim_text(code45_nodes, "ctx");
			code45_nodes.forEach(detach);
			t356 = claim_text(p64_nodes, ") of the component.");
			p64_nodes.forEach(detach);
			section17_nodes.forEach(detach);
			t357 = claim_space(nodes);
			section18 = claim_element(nodes, "SECTION", {});
			var section18_nodes = children(section18);
			h39 = claim_element(section18_nodes, "H3", {});
			var h39_nodes = children(h39);
			a63 = claim_element(h39_nodes, "A", { href: true, id: true });
			var a63_nodes = children(a63);
			t358 = claim_text(a63_nodes, "instance variable");
			a63_nodes.forEach(detach);
			h39_nodes.forEach(detach);
			t359 = claim_space(section18_nodes);
			p65 = claim_element(section18_nodes, "P", {});
			var p65_nodes = children(p65);
			t360 = claim_text(p65_nodes, "The compiler realises that the variable ");
			code46 = claim_element(p65_nodes, "CODE", {});
			var code46_nodes = children(code46);
			t361 = claim_text(code46_nodes, "name");
			code46_nodes.forEach(detach);
			t362 = claim_text(p65_nodes, " cannot be shared across different instances of the ");
			code47 = claim_element(p65_nodes, "CODE", {});
			var code47_nodes = children(code47);
			t363 = claim_text(code47_nodes, "App");
			code47_nodes.forEach(detach);
			t364 = claim_text(p65_nodes, " component. That's why it moves the declaration of the variable ");
			code48 = claim_element(p65_nodes, "CODE", {});
			var code48_nodes = children(code48);
			t365 = claim_text(code48_nodes, "name");
			code48_nodes.forEach(detach);
			t366 = claim_text(p65_nodes, " into a function called ");
			code49 = claim_element(p65_nodes, "CODE", {});
			var code49_nodes = children(code49);
			t367 = claim_text(code49_nodes, "instance");
			code49_nodes.forEach(detach);
			t368 = claim_text(p65_nodes, ".");
			p65_nodes.forEach(detach);
			t369 = claim_space(section18_nodes);
			p66 = claim_element(section18_nodes, "P", {});
			var p66_nodes = children(p66);
			t370 = claim_text(p66_nodes, "In the previous example, no matter how many instances of the ");
			code50 = claim_element(p66_nodes, "CODE", {});
			var code50_nodes = children(code50);
			t371 = claim_text(code50_nodes, "App");
			code50_nodes.forEach(detach);
			t372 = claim_text(p66_nodes, " component, the value of the variable ");
			code51 = claim_element(p66_nodes, "CODE", {});
			var code51_nodes = children(code51);
			t373 = claim_text(code51_nodes, "name");
			code51_nodes.forEach(detach);
			t374 = claim_text(p66_nodes, " is the same and unchanged across the instances:");
			p66_nodes.forEach(detach);
			t375 = claim_space(section18_nodes);
			pre21 = claim_element(section18_nodes, "PRE", { class: true });
			var pre21_nodes = children(pre21);
			pre21_nodes.forEach(detach);
			t376 = claim_space(section18_nodes);
			p67 = claim_element(section18_nodes, "P", {});
			var p67_nodes = children(p67);
			t377 = claim_text(p67_nodes, "But, in this example, the variable ");
			code52 = claim_element(p67_nodes, "CODE", {});
			var code52_nodes = children(code52);
			t378 = claim_text(code52_nodes, "name");
			code52_nodes.forEach(detach);
			t379 = claim_text(p67_nodes, " can be changed within 1 instance of the component, so the declaration of the variable ");
			code53 = claim_element(p67_nodes, "CODE", {});
			var code53_nodes = children(code53);
			t380 = claim_text(code53_nodes, "name");
			code53_nodes.forEach(detach);
			t381 = claim_text(p67_nodes, " is now moved into the ");
			code54 = claim_element(p67_nodes, "CODE", {});
			var code54_nodes = children(code54);
			t382 = claim_text(code54_nodes, "instance");
			code54_nodes.forEach(detach);
			t383 = claim_text(p67_nodes, " function:");
			p67_nodes.forEach(detach);
			t384 = claim_space(section18_nodes);
			pre22 = claim_element(section18_nodes, "PRE", { class: true });
			var pre22_nodes = children(pre22);
			pre22_nodes.forEach(detach);
			section18_nodes.forEach(detach);
			t385 = claim_space(nodes);
			section19 = claim_element(nodes, "SECTION", {});
			var section19_nodes = children(section19);
			h310 = claim_element(section19_nodes, "H3", {});
			var h310_nodes = children(h310);
			a64 = claim_element(h310_nodes, "A", { href: true, id: true });
			var a64_nodes = children(a64);
			t386 = claim_text(a64_nodes, "instance($$self, $$props, \\$\\$invalidate)");
			a64_nodes.forEach(detach);
			h310_nodes.forEach(detach);
			t387 = claim_space(section19_nodes);
			p68 = claim_element(section19_nodes, "P", {});
			var p68_nodes = children(p68);
			t388 = claim_text(p68_nodes, "The ");
			code55 = claim_element(p68_nodes, "CODE", {});
			var code55_nodes = children(code55);
			t389 = claim_text(code55_nodes, "instance");
			code55_nodes.forEach(detach);
			t390 = claim_text(p68_nodes, " function returns a list of ");
			em = claim_element(p68_nodes, "EM", {});
			var em_nodes = children(em);
			t391 = claim_text(em_nodes, "instance");
			em_nodes.forEach(detach);
			t392 = claim_text(p68_nodes, " variables, which are variables that are:");
			p68_nodes.forEach(detach);
			t393 = claim_space(section19_nodes);
			ul12 = claim_element(section19_nodes, "UL", {});
			var ul12_nodes = children(ul12);
			li44 = claim_element(ul12_nodes, "LI", {});
			var li44_nodes = children(li44);
			t394 = claim_text(li44_nodes, "referenced in the template");
			li44_nodes.forEach(detach);
			t395 = claim_space(ul12_nodes);
			li45 = claim_element(ul12_nodes, "LI", {});
			var li45_nodes = children(li45);
			t396 = claim_text(li45_nodes, "mutated or reassigned, (can be changed within 1 instance of the component)");
			li45_nodes.forEach(detach);
			ul12_nodes.forEach(detach);
			t397 = claim_space(section19_nodes);
			p69 = claim_element(section19_nodes, "P", {});
			var p69_nodes = children(p69);
			t398 = claim_text(p69_nodes, "In Svelte, we call this list of instance variables, ");
			strong5 = claim_element(p69_nodes, "STRONG", {});
			var strong5_nodes = children(strong5);
			t399 = claim_text(strong5_nodes, "ctx");
			strong5_nodes.forEach(detach);
			t400 = claim_text(p69_nodes, ".");
			p69_nodes.forEach(detach);
			t401 = claim_space(section19_nodes);
			p70 = claim_element(section19_nodes, "P", {});
			var p70_nodes = children(p70);
			t402 = claim_text(p70_nodes, "In the ");
			code56 = claim_element(p70_nodes, "CODE", {});
			var code56_nodes = children(code56);
			t403 = claim_text(code56_nodes, "init");
			code56_nodes.forEach(detach);
			t404 = claim_text(p70_nodes, " function, Svelte calls the ");
			code57 = claim_element(p70_nodes, "CODE", {});
			var code57_nodes = children(code57);
			t405 = claim_text(code57_nodes, "instance");
			code57_nodes.forEach(detach);
			t406 = claim_text(p70_nodes, " function to create ");
			strong6 = claim_element(p70_nodes, "STRONG", {});
			var strong6_nodes = children(strong6);
			t407 = claim_text(strong6_nodes, "ctx");
			strong6_nodes.forEach(detach);
			t408 = claim_text(p70_nodes, ", and uses it to create the fragment for the component:");
			p70_nodes.forEach(detach);
			t409 = claim_space(section19_nodes);
			pre23 = claim_element(section19_nodes, "PRE", { class: true });
			var pre23_nodes = children(pre23);
			pre23_nodes.forEach(detach);
			t410 = claim_space(section19_nodes);
			p71 = claim_element(section19_nodes, "P", {});
			var p71_nodes = children(p71);
			t411 = claim_text(p71_nodes, "Now, instead of accessing the variable ");
			code58 = claim_element(p71_nodes, "CODE", {});
			var code58_nodes = children(code58);
			t412 = claim_text(code58_nodes, "name");
			code58_nodes.forEach(detach);
			t413 = claim_text(p71_nodes, " outside of the component, we refer to the variable ");
			code59 = claim_element(p71_nodes, "CODE", {});
			var code59_nodes = children(code59);
			t414 = claim_text(code59_nodes, "name");
			code59_nodes.forEach(detach);
			t415 = claim_text(p71_nodes, " passed via the ");
			strong7 = claim_element(p71_nodes, "STRONG", {});
			var strong7_nodes = children(strong7);
			t416 = claim_text(strong7_nodes, "ctx");
			strong7_nodes.forEach(detach);
			t417 = claim_text(p71_nodes, ":");
			p71_nodes.forEach(detach);
			t418 = claim_space(section19_nodes);
			pre24 = claim_element(section19_nodes, "PRE", { class: true });
			var pre24_nodes = children(pre24);
			pre24_nodes.forEach(detach);
			t419 = claim_space(section19_nodes);
			p72 = claim_element(section19_nodes, "P", {});
			var p72_nodes = children(p72);
			t420 = claim_text(p72_nodes, "The reason that ctx is an array instead of a map or an object is because of an optimisation related to bitmask, you can see ");
			a65 = claim_element(p72_nodes, "A", { href: true, rel: true });
			var a65_nodes = children(a65);
			t421 = claim_text(a65_nodes, "the discussion about it here");
			a65_nodes.forEach(detach);
			p72_nodes.forEach(detach);
			section19_nodes.forEach(detach);
			t422 = claim_space(nodes);
			section20 = claim_element(nodes, "SECTION", {});
			var section20_nodes = children(section20);
			h311 = claim_element(section20_nodes, "H3", {});
			var h311_nodes = children(h311);
			a66 = claim_element(h311_nodes, "A", { href: true, id: true });
			var a66_nodes = children(a66);
			t423 = claim_text(a66_nodes, "\\$\\$invalidate");
			a66_nodes.forEach(detach);
			h311_nodes.forEach(detach);
			t424 = claim_space(section20_nodes);
			p73 = claim_element(section20_nodes, "P", {});
			var p73_nodes = children(p73);
			t425 = claim_text(p73_nodes, "The secret behind the system of reactivity in Svelte is the ");
			code60 = claim_element(p73_nodes, "CODE", {});
			var code60_nodes = children(code60);
			t426 = claim_text(code60_nodes, "$$invalidate");
			code60_nodes.forEach(detach);
			t427 = claim_text(p73_nodes, " function.");
			p73_nodes.forEach(detach);
			t428 = claim_space(section20_nodes);
			p74 = claim_element(section20_nodes, "P", {});
			var p74_nodes = children(p74);
			t429 = claim_text(p74_nodes, "Every variable that has been");
			p74_nodes.forEach(detach);
			t430 = claim_space(section20_nodes);
			ul13 = claim_element(section20_nodes, "UL", {});
			var ul13_nodes = children(ul13);
			li46 = claim_element(ul13_nodes, "LI", {});
			var li46_nodes = children(li46);
			t431 = claim_text(li46_nodes, "reassigned or mutated");
			li46_nodes.forEach(detach);
			t432 = claim_space(ul13_nodes);
			li47 = claim_element(ul13_nodes, "LI", {});
			var li47_nodes = children(li47);
			t433 = claim_text(li47_nodes, "referenced in the template");
			li47_nodes.forEach(detach);
			ul13_nodes.forEach(detach);
			t434 = claim_space(section20_nodes);
			p75 = claim_element(section20_nodes, "P", {});
			var p75_nodes = children(p75);
			t435 = claim_text(p75_nodes, "will have the ");
			code61 = claim_element(p75_nodes, "CODE", {});
			var code61_nodes = children(code61);
			t436 = claim_text(code61_nodes, "$$invalidate");
			code61_nodes.forEach(detach);
			t437 = claim_text(p75_nodes, " function inserted right after the assignment or mutation:");
			p75_nodes.forEach(detach);
			t438 = claim_space(section20_nodes);
			pre25 = claim_element(section20_nodes, "PRE", { class: true });
			var pre25_nodes = children(pre25);
			pre25_nodes.forEach(detach);
			t439 = claim_space(section20_nodes);
			p76 = claim_element(section20_nodes, "P", {});
			var p76_nodes = children(p76);
			t440 = claim_text(p76_nodes, "The ");
			code62 = claim_element(p76_nodes, "CODE", {});
			var code62_nodes = children(code62);
			t441 = claim_text(code62_nodes, "$$invalidate");
			code62_nodes.forEach(detach);
			t442 = claim_text(p76_nodes, " function marks the variable dirty and schedules an update for the component:");
			p76_nodes.forEach(detach);
			t443 = claim_space(section20_nodes);
			pre26 = claim_element(section20_nodes, "PRE", { class: true });
			var pre26_nodes = children(pre26);
			pre26_nodes.forEach(detach);
			section20_nodes.forEach(detach);
			t444 = claim_space(nodes);
			section21 = claim_element(nodes, "SECTION", {});
			var section21_nodes = children(section21);
			h312 = claim_element(section21_nodes, "H3", {});
			var h312_nodes = children(h312);
			a67 = claim_element(h312_nodes, "A", { href: true, id: true });
			var a67_nodes = children(a67);
			t445 = claim_text(a67_nodes, "Adding event listeners");
			a67_nodes.forEach(detach);
			h312_nodes.forEach(detach);
			t446 = claim_space(section21_nodes);
			p77 = claim_element(section21_nodes, "P", {});
			var p77_nodes = children(p77);
			t447 = claim_text(p77_nodes, "Let's now add an event listener");
			p77_nodes.forEach(detach);
			t448 = claim_space(section21_nodes);
			pre27 = claim_element(section21_nodes, "PRE", { class: true });
			var pre27_nodes = children(pre27);
			pre27_nodes.forEach(detach);
			t449 = claim_space(section21_nodes);
			p78 = claim_element(section21_nodes, "P", {});
			var p78_nodes = children(p78);
			a68 = claim_element(p78_nodes, "A", { href: true, rel: true });
			var a68_nodes = children(a68);
			t450 = claim_text(a68_nodes, "Svelte REPL");
			a68_nodes.forEach(detach);
			p78_nodes.forEach(detach);
			t451 = claim_space(section21_nodes);
			p79 = claim_element(section21_nodes, "P", {});
			var p79_nodes = children(p79);
			t452 = claim_text(p79_nodes, "And observe the difference:");
			p79_nodes.forEach(detach);
			t453 = claim_space(section21_nodes);
			pre28 = claim_element(section21_nodes, "PRE", { class: true });
			var pre28_nodes = children(pre28);
			pre28_nodes.forEach(detach);
			t454 = claim_space(section21_nodes);
			p80 = claim_element(section21_nodes, "P", {});
			var p80_nodes = children(p80);
			t455 = claim_text(p80_nodes, "Some observations:");
			p80_nodes.forEach(detach);
			t456 = claim_space(section21_nodes);
			ul14 = claim_element(section21_nodes, "UL", {});
			var ul14_nodes = children(ul14);
			li48 = claim_element(ul14_nodes, "LI", {});
			var li48_nodes = children(li48);
			code63 = claim_element(li48_nodes, "CODE", {});
			var code63_nodes = children(code63);
			t457 = claim_text(code63_nodes, "instance");
			code63_nodes.forEach(detach);
			t458 = claim_text(li48_nodes, " function now returns 2 variables instead of 1");
			li48_nodes.forEach(detach);
			t459 = claim_space(ul14_nodes);
			li49 = claim_element(ul14_nodes, "LI", {});
			var li49_nodes = children(li49);
			t460 = claim_text(li49_nodes, "Listen to click event during ");
			strong8 = claim_element(li49_nodes, "STRONG", {});
			var strong8_nodes = children(strong8);
			t461 = claim_text(strong8_nodes, "mount");
			strong8_nodes.forEach(detach);
			t462 = claim_text(li49_nodes, " and dispose it in ");
			strong9 = claim_element(li49_nodes, "STRONG", {});
			var strong9_nodes = children(strong9);
			t463 = claim_text(strong9_nodes, "destroy");
			strong9_nodes.forEach(detach);
			li49_nodes.forEach(detach);
			ul14_nodes.forEach(detach);
			t464 = claim_space(section21_nodes);
			p81 = claim_element(section21_nodes, "P", {});
			var p81_nodes = children(p81);
			t465 = claim_text(p81_nodes, "As I've mentioned earlier, ");
			code64 = claim_element(p81_nodes, "CODE", {});
			var code64_nodes = children(code64);
			t466 = claim_text(code64_nodes, "instance");
			code64_nodes.forEach(detach);
			t467 = claim_text(p81_nodes, " function returns variables that are ");
			strong10 = claim_element(p81_nodes, "STRONG", {});
			var strong10_nodes = children(strong10);
			t468 = claim_text(strong10_nodes, "referenced in the template");
			strong10_nodes.forEach(detach);
			t469 = claim_text(p81_nodes, " and that are ");
			strong11 = claim_element(p81_nodes, "STRONG", {});
			var strong11_nodes = children(strong11);
			t470 = claim_text(strong11_nodes, "mutated or reassigned");
			strong11_nodes.forEach(detach);
			t471 = claim_text(p81_nodes, ".");
			p81_nodes.forEach(detach);
			t472 = claim_space(section21_nodes);
			p82 = claim_element(section21_nodes, "P", {});
			var p82_nodes = children(p82);
			t473 = claim_text(p82_nodes, "Since we've just referenced the ");
			code65 = claim_element(p82_nodes, "CODE", {});
			var code65_nodes = children(code65);
			t474 = claim_text(code65_nodes, "update");
			code65_nodes.forEach(detach);
			t475 = claim_text(p82_nodes, " function in the template, it is now returned in the ");
			code66 = claim_element(p82_nodes, "CODE", {});
			var code66_nodes = children(code66);
			t476 = claim_text(code66_nodes, "instance");
			code66_nodes.forEach(detach);
			t477 = claim_text(p82_nodes, " function as part of the ");
			strong12 = claim_element(p82_nodes, "STRONG", {});
			var strong12_nodes = children(strong12);
			t478 = claim_text(strong12_nodes, "ctx");
			strong12_nodes.forEach(detach);
			t479 = claim_text(p82_nodes, ".");
			p82_nodes.forEach(detach);
			t480 = claim_space(section21_nodes);
			p83 = claim_element(section21_nodes, "P", {});
			var p83_nodes = children(p83);
			t481 = claim_text(p83_nodes, "Svelte tries generate as compact JavaScript output as possible, not returning an extra variable if it is not necessary.");
			p83_nodes.forEach(detach);
			section21_nodes.forEach(detach);
			t482 = claim_space(nodes);
			section22 = claim_element(nodes, "SECTION", {});
			var section22_nodes = children(section22);
			h313 = claim_element(section22_nodes, "H3", {});
			var h313_nodes = children(h313);
			a69 = claim_element(h313_nodes, "A", { href: true, id: true });
			var a69_nodes = children(a69);
			t483 = claim_text(a69_nodes, "listen and dispose");
			a69_nodes.forEach(detach);
			h313_nodes.forEach(detach);
			t484 = claim_space(section22_nodes);
			p84 = claim_element(section22_nodes, "P", {});
			var p84_nodes = children(p84);
			t485 = claim_text(p84_nodes, "Whenever you add ");
			a70 = claim_element(p84_nodes, "A", { href: true, rel: true });
			var a70_nodes = children(a70);
			t486 = claim_text(a70_nodes, "an event listener");
			a70_nodes.forEach(detach);
			t487 = claim_text(p84_nodes, " in Svelte, Svelte will inject code to add an ");
			a71 = claim_element(p84_nodes, "A", { href: true, rel: true });
			var a71_nodes = children(a71);
			t488 = claim_text(a71_nodes, "event listener");
			a71_nodes.forEach(detach);
			t489 = claim_text(p84_nodes, " and remove it when the DOM fragment is removed from the DOM.");
			p84_nodes.forEach(detach);
			t490 = claim_space(section22_nodes);
			p85 = claim_element(section22_nodes, "P", {});
			var p85_nodes = children(p85);
			t491 = claim_text(p85_nodes, "Try adding more event listeners,");
			p85_nodes.forEach(detach);
			t492 = claim_space(section22_nodes);
			pre29 = claim_element(section22_nodes, "PRE", { class: true });
			var pre29_nodes = children(pre29);
			pre29_nodes.forEach(detach);
			t493 = claim_space(section22_nodes);
			p86 = claim_element(section22_nodes, "P", {});
			var p86_nodes = children(p86);
			a72 = claim_element(p86_nodes, "A", { href: true, rel: true });
			var a72_nodes = children(a72);
			t494 = claim_text(a72_nodes, "Svelte REPL");
			a72_nodes.forEach(detach);
			p86_nodes.forEach(detach);
			t495 = claim_space(section22_nodes);
			p87 = claim_element(section22_nodes, "P", {});
			var p87_nodes = children(p87);
			t496 = claim_text(p87_nodes, "and observe the compiled output:");
			p87_nodes.forEach(detach);
			t497 = claim_space(section22_nodes);
			pre30 = claim_element(section22_nodes, "PRE", { class: true });
			var pre30_nodes = children(pre30);
			pre30_nodes.forEach(detach);
			t498 = claim_space(section22_nodes);
			p88 = claim_element(section22_nodes, "P", {});
			var p88_nodes = children(p88);
			t499 = claim_text(p88_nodes, "Instead of declaring and creating a new variable to remove each event listener, Svelte assigns all of them to an array:");
			p88_nodes.forEach(detach);
			t500 = claim_space(section22_nodes);
			pre31 = claim_element(section22_nodes, "PRE", { class: true });
			var pre31_nodes = children(pre31);
			pre31_nodes.forEach(detach);
			t501 = claim_space(section22_nodes);
			p89 = claim_element(section22_nodes, "P", {});
			var p89_nodes = children(p89);
			t502 = claim_text(p89_nodes, "Minification can compact the variable name, but you can't remove the brackets.");
			p89_nodes.forEach(detach);
			t503 = claim_space(section22_nodes);
			p90 = claim_element(section22_nodes, "P", {});
			var p90_nodes = children(p90);
			t504 = claim_text(p90_nodes, "Again, this is another great example of where Svelte tries to generate compact JavaScript output. Svelte does not create the ");
			code67 = claim_element(p90_nodes, "CODE", {});
			var code67_nodes = children(code67);
			t505 = claim_text(code67_nodes, "dispose");
			code67_nodes.forEach(detach);
			t506 = claim_text(p90_nodes, " array when there's only 1 event listener.");
			p90_nodes.forEach(detach);
			section22_nodes.forEach(detach);
			t507 = claim_space(nodes);
			section23 = claim_element(nodes, "SECTION", {});
			var section23_nodes = children(section23);
			h24 = claim_element(section23_nodes, "H2", {});
			var h24_nodes = children(h24);
			a73 = claim_element(h24_nodes, "A", { href: true, id: true });
			var a73_nodes = children(a73);
			t508 = claim_text(a73_nodes, "Summary");
			a73_nodes.forEach(detach);
			h24_nodes.forEach(detach);
			t509 = claim_space(section23_nodes);
			p91 = claim_element(section23_nodes, "P", {});
			var p91_nodes = children(p91);
			t510 = claim_text(p91_nodes, "The Svelte syntax is a superset of HTML.");
			p91_nodes.forEach(detach);
			t511 = claim_space(section23_nodes);
			p92 = claim_element(section23_nodes, "P", {});
			var p92_nodes = children(p92);
			t512 = claim_text(p92_nodes, "When you write a Svelte component, the Svelte compiler analyses your code and generates optimised JavaScript code output.");
			p92_nodes.forEach(detach);
			t513 = claim_space(section23_nodes);
			p93 = claim_element(section23_nodes, "P", {});
			var p93_nodes = children(p93);
			t514 = claim_text(p93_nodes, "The output can be divided into 3 segments:");
			p93_nodes.forEach(detach);
			section23_nodes.forEach(detach);
			t515 = claim_space(nodes);
			section24 = claim_element(nodes, "SECTION", {});
			var section24_nodes = children(section24);
			h44 = claim_element(section24_nodes, "H4", {});
			var h44_nodes = children(h44);
			a74 = claim_element(h44_nodes, "A", { href: true, id: true });
			var a74_nodes = children(a74);
			t516 = claim_text(a74_nodes, "1. create_fragment");
			a74_nodes.forEach(detach);
			h44_nodes.forEach(detach);
			t517 = claim_space(section24_nodes);
			ul15 = claim_element(section24_nodes, "UL", {});
			var ul15_nodes = children(ul15);
			li50 = claim_element(ul15_nodes, "LI", {});
			var li50_nodes = children(li50);
			t518 = claim_text(li50_nodes, "Returns a fragment, which is an instruction manual on how to build the DOM fragment for the component");
			li50_nodes.forEach(detach);
			ul15_nodes.forEach(detach);
			section24_nodes.forEach(detach);
			t519 = claim_space(nodes);
			section25 = claim_element(nodes, "SECTION", {});
			var section25_nodes = children(section25);
			h45 = claim_element(section25_nodes, "H4", {});
			var h45_nodes = children(h45);
			a75 = claim_element(h45_nodes, "A", { href: true, id: true });
			var a75_nodes = children(a75);
			t520 = claim_text(a75_nodes, "2. instance");
			a75_nodes.forEach(detach);
			h45_nodes.forEach(detach);
			t521 = claim_space(section25_nodes);
			ul16 = claim_element(section25_nodes, "UL", {});
			var ul16_nodes = children(ul16);
			li51 = claim_element(ul16_nodes, "LI", {});
			var li51_nodes = children(li51);
			t522 = claim_text(li51_nodes, "Most of the code written in the ");
			code68 = claim_element(li51_nodes, "CODE", {});
			var code68_nodes = children(code68);
			t523 = claim_text(code68_nodes, "<script>");
			code68_nodes.forEach(detach);
			t524 = claim_text(li51_nodes, " tag is in here.");
			li51_nodes.forEach(detach);
			t525 = claim_space(ul16_nodes);
			li52 = claim_element(ul16_nodes, "LI", {});
			var li52_nodes = children(li52);
			t526 = claim_text(li52_nodes, "Returns a list of instance variables that are referenced in the template");
			li52_nodes.forEach(detach);
			t527 = claim_space(ul16_nodes);
			li53 = claim_element(ul16_nodes, "LI", {});
			var li53_nodes = children(li53);
			code69 = claim_element(li53_nodes, "CODE", {});
			var code69_nodes = children(code69);
			t528 = claim_text(code69_nodes, "$$invalidate");
			code69_nodes.forEach(detach);
			t529 = claim_text(li53_nodes, " is inserted after every assignment and mutation of the instance variable");
			li53_nodes.forEach(detach);
			ul16_nodes.forEach(detach);
			section25_nodes.forEach(detach);
			t530 = claim_space(nodes);
			section26 = claim_element(nodes, "SECTION", {});
			var section26_nodes = children(section26);
			h46 = claim_element(section26_nodes, "H4", {});
			var h46_nodes = children(h46);
			a76 = claim_element(h46_nodes, "A", { href: true, id: true });
			var a76_nodes = children(a76);
			t531 = claim_text(a76_nodes, "3. class App extends SvelteComponent");
			a76_nodes.forEach(detach);
			h46_nodes.forEach(detach);
			t532 = claim_space(section26_nodes);
			ul17 = claim_element(section26_nodes, "UL", {});
			var ul17_nodes = children(ul17);
			li54 = claim_element(ul17_nodes, "LI", {});
			var li54_nodes = children(li54);
			t533 = claim_text(li54_nodes, "Initialise the component with ");
			code70 = claim_element(li54_nodes, "CODE", {});
			var code70_nodes = children(code70);
			t534 = claim_text(code70_nodes, "create_fragment");
			code70_nodes.forEach(detach);
			t535 = claim_text(li54_nodes, " and ");
			code71 = claim_element(li54_nodes, "CODE", {});
			var code71_nodes = children(code71);
			t536 = claim_text(code71_nodes, "instance");
			code71_nodes.forEach(detach);
			t537 = claim_text(li54_nodes, " function");
			li54_nodes.forEach(detach);
			t538 = claim_space(ul17_nodes);
			li55 = claim_element(ul17_nodes, "LI", {});
			var li55_nodes = children(li55);
			t539 = claim_text(li55_nodes, "Sets up the component internals");
			li55_nodes.forEach(detach);
			t540 = claim_space(ul17_nodes);
			li56 = claim_element(ul17_nodes, "LI", {});
			var li56_nodes = children(li56);
			t541 = claim_text(li56_nodes, "Provides the ");
			a77 = claim_element(li56_nodes, "A", { href: true, rel: true });
			var a77_nodes = children(a77);
			t542 = claim_text(a77_nodes, "Component API");
			a77_nodes.forEach(detach);
			li56_nodes.forEach(detach);
			ul17_nodes.forEach(detach);
			t543 = claim_space(section26_nodes);
			p94 = claim_element(section26_nodes, "P", {});
			var p94_nodes = children(p94);
			t544 = claim_text(p94_nodes, "Svelte strives to generate as compact JavaScript as possible, for example:");
			p94_nodes.forEach(detach);
			t545 = claim_space(section26_nodes);
			ul18 = claim_element(section26_nodes, "UL", {});
			var ul18_nodes = children(ul18);
			li57 = claim_element(ul18_nodes, "LI", {});
			var li57_nodes = children(li57);
			t546 = claim_text(li57_nodes, "Breaking text content of ");
			code72 = claim_element(li57_nodes, "CODE", {});
			var code72_nodes = children(code72);
			t547 = claim_text(code72_nodes, "h1");
			code72_nodes.forEach(detach);
			t548 = claim_text(li57_nodes, " into separate text nodes only when part of the text can be updated");
			li57_nodes.forEach(detach);
			t549 = claim_space(ul18_nodes);
			li58 = claim_element(ul18_nodes, "LI", {});
			var li58_nodes = children(li58);
			t550 = claim_text(li58_nodes, "Not defining ");
			code73 = claim_element(li58_nodes, "CODE", {});
			var code73_nodes = children(code73);
			t551 = claim_text(code73_nodes, "create_fragment");
			code73_nodes.forEach(detach);
			t552 = claim_text(li58_nodes, " or ");
			code74 = claim_element(li58_nodes, "CODE", {});
			var code74_nodes = children(code74);
			t553 = claim_text(code74_nodes, "instance");
			code74_nodes.forEach(detach);
			t554 = claim_text(li58_nodes, " function when it is not needed");
			li58_nodes.forEach(detach);
			t555 = claim_space(ul18_nodes);
			li59 = claim_element(ul18_nodes, "LI", {});
			var li59_nodes = children(li59);
			t556 = claim_text(li59_nodes, "Generate ");
			code75 = claim_element(li59_nodes, "CODE", {});
			var code75_nodes = children(code75);
			t557 = claim_text(code75_nodes, "dispose");
			code75_nodes.forEach(detach);
			t558 = claim_text(li59_nodes, " as an array or a function, depending on the number of event listeners.");
			li59_nodes.forEach(detach);
			t559 = claim_space(ul18_nodes);
			li60 = claim_element(ul18_nodes, "LI", {});
			var li60_nodes = children(li60);
			t560 = claim_text(li60_nodes, "...");
			li60_nodes.forEach(detach);
			ul18_nodes.forEach(detach);
			section26_nodes.forEach(detach);
			t561 = claim_space(nodes);
			section27 = claim_element(nodes, "SECTION", {});
			var section27_nodes = children(section27);
			h25 = claim_element(section27_nodes, "H2", {});
			var h25_nodes = children(h25);
			a78 = claim_element(h25_nodes, "A", { href: true, id: true });
			var a78_nodes = children(a78);
			t562 = claim_text(a78_nodes, "Closing Note");
			a78_nodes.forEach(detach);
			h25_nodes.forEach(detach);
			t563 = claim_space(section27_nodes);
			p95 = claim_element(section27_nodes, "P", {});
			var p95_nodes = children(p95);
			t564 = claim_text(p95_nodes, "We've covered the basic structure of the Svelte's compiled output, and this is just the beginning.");
			p95_nodes.forEach(detach);
			t565 = claim_space(section27_nodes);
			p96 = claim_element(section27_nodes, "P", {});
			var p96_nodes = children(p96);
			t566 = claim_text(p96_nodes, "If you wish to know more, ");
			a79 = claim_element(p96_nodes, "A", { href: true, rel: true });
			var a79_nodes = children(a79);
			t567 = claim_text(a79_nodes, "follow me on Twitter");
			a79_nodes.forEach(detach);
			t568 = claim_text(p96_nodes, ".");
			p96_nodes.forEach(detach);
			t569 = claim_space(section27_nodes);
			p97 = claim_element(section27_nodes, "P", {});
			var p97_nodes = children(p97);
			t570 = claim_text(p97_nodes, "I'll post it on Twitter when the next part is ready, where I'll be covering ");
			a80 = claim_element(p97_nodes, "A", { href: true, rel: true });
			var a80_nodes = children(a80);
			t571 = claim_text(a80_nodes, "logic blocks");
			a80_nodes.forEach(detach);
			t572 = claim_text(p97_nodes, ", ");
			a81 = claim_element(p97_nodes, "A", { href: true, rel: true });
			var a81_nodes = children(a81);
			t573 = claim_text(a81_nodes, "slots");
			a81_nodes.forEach(detach);
			t574 = claim_text(p97_nodes, ", ");
			a82 = claim_element(p97_nodes, "A", { href: true, rel: true });
			var a82_nodes = children(a82);
			t575 = claim_text(a82_nodes, "context");
			a82_nodes.forEach(detach);
			t576 = claim_text(p97_nodes, ", and many others.");
			p97_nodes.forEach(detach);
			t577 = claim_space(section27_nodes);
			p98 = claim_element(section27_nodes, "P", {});
			var p98_nodes = children(p98);
			strong13 = claim_element(p98_nodes, "STRONG", {});
			var strong13_nodes = children(strong13);
			t578 = claim_text(strong13_nodes, "➡ ➡  Continue reading on ");
			a83 = claim_element(strong13_nodes, "A", { href: true });
			var a83_nodes = children(a83);
			t579 = claim_text(a83_nodes, "Part 2");
			a83_nodes.forEach(detach);
			t580 = claim_text(strong13_nodes, ".");
			strong13_nodes.forEach(detach);
			p98_nodes.forEach(detach);
			section27_nodes.forEach(detach);
			this.h();
		},
		h() {
			attr(a0, "href", "#background");
			attr(a1, "href", "#introduction");
			attr(a2, "href", "#creating-an-element");
			attr(a3, "href", "#updating-an-element");
			attr(a4, "href", "#removing-an-element");
			attr(a5, "href", "#adding-style-to-an-element");
			attr(a6, "href", "#listen-for-click-events-on-an-element");
			attr(a7, "href", "#svelte-syntax");
			attr(a8, "href", "#compile-svelte-in-your-head");
			attr(a9, "href", "#create-fragment");
			attr(a10, "href", "#c");
			attr(a11, "href", "#m-target-anchor");
			attr(a12, "href", "#d-detaching");
			attr(a13, "href", "#export-default-class-app-extends-sveltecomponent");
			attr(a14, "href", "#adding-data");
			attr(a15, "href", "#updating-data");
			attr(a16, "href", "#p-ctx-dirty");
			attr(a17, "href", "#instance-variable");
			attr(a18, "href", "#instance-self-props-invalidate");
			attr(a19, "href", "#invalidate");
			attr(a20, "href", "#adding-event-listeners");
			attr(a21, "href", "#listen-and-dispose");
			attr(a22, "href", "#summary");
			attr(a23, "href", "#create-fragment");
			attr(a24, "href", "#instance");
			attr(a25, "href", "#class-app-extends-sveltecomponent");
			attr(a26, "href", "#closing-note");
			attr(ul6, "class", "sitemap");
			attr(ul6, "id", "sitemap");
			attr(ul6, "role", "navigation");
			attr(ul6, "aria-label", "Table of Contents");
			attr(a27, "href", "#background");
			attr(a27, "id", "background");
			attr(a28, "href", "https://twitter.com/swyx");
			attr(a28, "rel", "nofollow");
			attr(a29, "href", "https://careers.shopee.sg/about/");
			attr(a29, "rel", "nofollow");
			attr(a30, "href", "https://grnh.se/32e5b3532");
			attr(a30, "rel", "nofollow");
			attr(a31, "href", "https://www.swyx.io/speaking/svelte-compile-lightning/");
			attr(a31, "rel", "nofollow");
			attr(a32, "href", "https://www.youtube.com/watch?v=FNmvcswdjV8");
			attr(a32, "rel", "nofollow");
			attr(a33, "href", "https://reactknowledgeable.org/");
			attr(a33, "rel", "nofollow");
			attr(a34, "href", "#introduction");
			attr(a34, "id", "introduction");
			attr(a35, "href", "#creating-an-element");
			attr(a35, "id", "creating-an-element");
			attr(pre0, "class", "language-js");
			attr(a36, "href", "#updating-an-element");
			attr(a36, "id", "updating-an-element");
			attr(pre1, "class", "language-js");
			attr(a37, "href", "#removing-an-element");
			attr(a37, "id", "removing-an-element");
			attr(pre2, "class", "language-js");
			attr(a38, "href", "#adding-style-to-an-element");
			attr(a38, "id", "adding-style-to-an-element");
			attr(pre3, "class", "language-js");
			attr(a39, "href", "#listen-for-click-events-on-an-element");
			attr(a39, "id", "listen-for-click-events-on-an-element");
			attr(pre4, "class", "language-js");
			attr(a40, "href", "#svelte-syntax");
			attr(a40, "id", "svelte-syntax");
			attr(a41, "href", "https://svelte.dev/tutorial/basics");
			attr(a41, "rel", "nofollow");
			attr(pre5, "class", "language-svelte");
			attr(a42, "href", "https://svelte.dev/repl/99aeea705b1e48fe8610b3ccee948280");
			attr(a42, "rel", "nofollow");
			attr(pre6, "class", "language-svelte");
			attr(a43, "href", "https://svelte.dev/repl/cf54441399864c0f9b0cb25710a5fe9b");
			attr(a43, "rel", "nofollow");
			attr(pre7, "class", "language-svelte");
			attr(a44, "href", "https://svelte.dev/repl/c149ca960b0444948dc0c00a9175bcb3");
			attr(a44, "rel", "nofollow");
			attr(pre8, "class", "language-svelte");
			attr(a45, "href", "https://svelte.dev/repl/1da1dcaf51814ed09d2341ea7915f0a1");
			attr(a45, "rel", "nofollow");
			attr(a46, "href", "https://www.w3schools.com/js/js_assignment.asp");
			attr(a46, "rel", "nofollow");
			attr(pre9, "class", "language-svelte");
			attr(a47, "href", "https://svelte.dev/repl/7bff4b7746df4007a51155d2006ce724");
			attr(a47, "rel", "nofollow");
			attr(a48, "href", "#compile-svelte-in-your-head");
			attr(a48, "id", "compile-svelte-in-your-head");
			attr(pre10, "class", "language-svelte");
			attr(a49, "href", "https://svelte.dev/repl/99aeea705b1e48fe8610b3ccee948280?version=3.19.1");
			attr(a49, "rel", "nofollow");
			attr(pre11, "class", "language-js");
			attr(a50, "href", "#create-fragment");
			attr(a50, "id", "create-fragment");
			attr(a51, "href", "#c");
			attr(a51, "id", "c");
			attr(pre12, "class", "language-js");
			attr(a52, "href", "#m-target-anchor");
			attr(a52, "id", "m-target-anchor");
			attr(pre13, "class", "language-js");
			attr(a53, "href", "#d-detaching");
			attr(a53, "id", "d-detaching");
			attr(pre14, "class", "language-js");
			attr(a54, "href", "https://alistapart.com/article/javascript-minification-part-ii/#section3");
			attr(a54, "rel", "nofollow");
			attr(a55, "href", "#export-default-class-app-extends-sveltecomponent");
			attr(a55, "id", "export-default-class-app-extends-sveltecomponent");
			attr(a56, "href", "https://svelte.dev/docs#Client-side_component_API");
			attr(a56, "rel", "nofollow");
			attr(pre15, "class", "language-svelte");
			attr(a57, "href", "https://svelte.dev/repl/1f29ce52adf446fc9116bb957b7200ec?version=3.19.1");
			attr(a57, "rel", "nofollow");
			attr(pre16, "class", "language-js");
			attr(a58, "href", "#adding-data");
			attr(a58, "id", "adding-data");
			attr(pre17, "class", "language-svelte");
			attr(a59, "href", "https://svelte.dev/repl/c149ca960b0444948dc0c00a9175bcb3?version=3.19.1");
			attr(a59, "rel", "nofollow");
			attr(pre18, "class", "language-js");
			attr(a60, "href", "#updating-data");
			attr(a60, "id", "updating-data");
			attr(pre19, "class", "language-svelte");
			attr(a61, "href", "https://svelte.dev/repl/3841485f4d224774ba42617e4e964968?version=3.19.1");
			attr(a61, "rel", "nofollow");
			attr(pre20, "class", "language-js");
			attr(a62, "href", "#p-ctx-dirty");
			attr(a62, "id", "p-ctx-dirty");
			attr(a63, "href", "#instance-variable");
			attr(a63, "id", "instance-variable");
			attr(pre21, "class", "language-svelte");
			attr(pre22, "class", "language-svelte");
			attr(a64, "href", "#instance-self-props-invalidate");
			attr(a64, "id", "instance-self-props-invalidate");
			attr(pre23, "class", "language-js");
			attr(pre24, "class", "language-js");
			attr(a65, "href", "https://github.com/sveltejs/svelte/issues/1922");
			attr(a65, "rel", "nofollow");
			attr(a66, "href", "#invalidate");
			attr(a66, "id", "invalidate");
			attr(pre25, "class", "language-js");
			attr(pre26, "class", "language-js");
			attr(a67, "href", "#adding-event-listeners");
			attr(a67, "id", "adding-event-listeners");
			attr(pre27, "class", "language-svelte");
			attr(a68, "href", "https://svelte.dev/repl/5b12ff52c2874f4dbb6405d9133b34da?version=3.19.1");
			attr(a68, "rel", "nofollow");
			attr(pre28, "class", "language-js");
			attr(a69, "href", "#listen-and-dispose");
			attr(a69, "id", "listen-and-dispose");
			attr(a70, "href", "https://svelte.dev/tutorial/dom-events");
			attr(a70, "rel", "nofollow");
			attr(a71, "href", "https://developer.mozilla.org/en-US/docs/Web/API/EventListener");
			attr(a71, "rel", "nofollow");
			attr(pre29, "class", "language-svelte");
			attr(a72, "href", "https://svelte.dev/repl/efde6f2aaf624e708767f1bd3e94e479?version=3.19.1");
			attr(a72, "rel", "nofollow");
			attr(pre30, "class", "language-js");
			attr(pre31, "class", "language-js");
			attr(a73, "href", "#summary");
			attr(a73, "id", "summary");
			attr(a74, "href", "#create-fragment");
			attr(a74, "id", "create-fragment");
			attr(a75, "href", "#instance");
			attr(a75, "id", "instance");
			attr(a76, "href", "#class-app-extends-sveltecomponent");
			attr(a76, "id", "class-app-extends-sveltecomponent");
			attr(a77, "href", "https://svelte.dev/docs#Client-side_component_API");
			attr(a77, "rel", "nofollow");
			attr(a78, "href", "#closing-note");
			attr(a78, "id", "closing-note");
			attr(a79, "href", "https://twitter.com/lihautan");
			attr(a79, "rel", "nofollow");
			attr(a80, "href", "https://svelte.dev/tutorial/if-blocks");
			attr(a80, "rel", "nofollow");
			attr(a81, "href", "https://svelte.dev/tutorial/slots");
			attr(a81, "rel", "nofollow");
			attr(a82, "href", "https://svelte.dev/tutorial/context-api");
			attr(a82, "rel", "nofollow");
			attr(a83, "href", "/compile-svelte-in-your-head-part-2/");
		},
		m(target, anchor) {
			insert(target, section0, anchor);
			append(section0, ul6);
			append(ul6, li0);
			append(li0, a0);
			append(a0, t0);
			append(ul6, li1);
			append(li1, a1);
			append(a1, t1);
			append(ul6, ul0);
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
			append(ul6, li7);
			append(li7, a7);
			append(a7, t7);
			append(ul6, li8);
			append(li8, a8);
			append(a8, t8);
			append(ul6, ul3);
			append(ul3, li9);
			append(li9, a9);
			append(a9, t9);
			append(ul3, ul1);
			append(ul1, li10);
			append(li10, a10);
			append(a10, t10);
			append(ul1, li11);
			append(li11, a11);
			append(a11, t11);
			append(ul1, li12);
			append(li12, a12);
			append(a12, t12);
			append(ul3, li13);
			append(li13, a13);
			append(a13, t13);
			append(ul3, li14);
			append(li14, a14);
			append(a14, t14);
			append(ul3, li15);
			append(li15, a15);
			append(a15, t15);
			append(ul3, ul2);
			append(ul2, li16);
			append(li16, a16);
			append(a16, t16);
			append(ul3, li17);
			append(li17, a17);
			append(a17, t17);
			append(ul3, li18);
			append(li18, a18);
			append(a18, t18);
			append(ul3, li19);
			append(li19, a19);
			append(a19, t19);
			append(ul3, li20);
			append(li20, a20);
			append(a20, t20);
			append(ul3, li21);
			append(li21, a21);
			append(a21, t21);
			append(ul6, li22);
			append(li22, a22);
			append(a22, t22);
			append(ul6, ul5);
			append(ul5, ul4);
			append(ul4, li23);
			append(li23, a23);
			append(a23, t23);
			append(ul4, li24);
			append(li24, a24);
			append(a24, t24);
			append(ul4, li25);
			append(li25, a25);
			append(a25, t25);
			append(ul6, li26);
			append(li26, a26);
			append(a26, t26);
			insert(target, t27, anchor);
			insert(target, section1, anchor);
			append(section1, h20);
			append(h20, a27);
			append(a27, t28);
			append(section1, t29);
			append(section1, p0);
			append(p0, t30);
			append(p0, a28);
			append(a28, t31);
			append(p0, t32);
			append(p0, a29);
			append(a29, t33);
			append(p0, t34);
			append(p0, a30);
			append(a30, t35);
			append(p0, t36);
			append(section1, t37);
			append(section1, p1);
			append(p1, t38);
			append(p1, a31);
			append(a31, t39);
			append(p1, t40);
			append(p1, a32);
			append(a32, t41);
			append(p1, t42);
			append(p1, a33);
			append(a33, t43);
			append(p1, t44);
			append(section1, t45);
			append(section1, p2);
			append(p2, t46);
			insert(target, t47, anchor);
			insert(target, section2, anchor);
			append(section2, h21);
			append(h21, a34);
			append(a34, t48);
			append(section2, t49);
			append(section2, p3);
			append(p3, t50);
			insert(target, t51, anchor);
			insert(target, section3, anchor);
			append(section3, h30);
			append(h30, a35);
			append(a35, t52);
			append(section3, t53);
			append(section3, pre0);
			pre0.innerHTML = raw0_value;
			insert(target, t54, anchor);
			insert(target, section4, anchor);
			append(section4, h31);
			append(h31, a36);
			append(a36, t55);
			append(section4, t56);
			append(section4, pre1);
			pre1.innerHTML = raw1_value;
			insert(target, t57, anchor);
			insert(target, section5, anchor);
			append(section5, h32);
			append(h32, a37);
			append(a37, t58);
			append(section5, t59);
			append(section5, pre2);
			pre2.innerHTML = raw2_value;
			insert(target, t60, anchor);
			insert(target, section6, anchor);
			append(section6, h33);
			append(h33, a38);
			append(a38, t61);
			append(section6, t62);
			append(section6, pre3);
			pre3.innerHTML = raw3_value;
			insert(target, t63, anchor);
			insert(target, section7, anchor);
			append(section7, h34);
			append(h34, a39);
			append(a39, t64);
			append(section7, t65);
			append(section7, pre4);
			pre4.innerHTML = raw4_value;
			append(section7, t66);
			append(section7, p4);
			append(p4, t67);
			append(section7, t68);
			append(section7, p5);
			append(p5, t69);
			insert(target, t70, anchor);
			insert(target, section8, anchor);
			append(section8, h22);
			append(h22, a40);
			append(a40, t71);
			append(section8, t72);
			append(section8, p6);
			append(p6, t73);
			append(section8, t74);
			append(section8, blockquote0);
			append(blockquote0, p7);
			append(p7, t75);
			append(p7, a41);
			append(a41, t76);
			append(p7, t77);
			append(section8, t78);
			append(section8, p8);
			append(p8, t79);
			append(section8, t80);
			append(section8, pre5);
			pre5.innerHTML = raw5_value;
			append(section8, t81);
			append(section8, p9);
			append(p9, a42);
			append(a42, t82);
			append(section8, t83);
			append(section8, p10);
			append(p10, t84);
			append(p10, code0);
			append(code0, t85);
			append(p10, t86);
			append(section8, t87);
			append(section8, pre6);
			pre6.innerHTML = raw6_value;
			append(section8, t88);
			append(section8, p11);
			append(p11, a43);
			append(a43, t89);
			append(section8, t90);
			append(section8, p12);
			append(p12, t91);
			append(section8, t92);
			append(section8, p13);
			append(p13, t93);
			append(section8, t94);
			append(section8, pre7);
			pre7.innerHTML = raw7_value;
			append(section8, t95);
			append(section8, p14);
			append(p14, a44);
			append(a44, t96);
			append(section8, t97);
			append(section8, p15);
			append(p15, t98);
			append(section8, t99);
			append(section8, p16);
			append(p16, t100);
			append(p16, code1);
			append(code1, t101);
			append(p16, t102);
			append(section8, t103);
			append(section8, pre8);
			pre8.innerHTML = raw8_value;
			append(section8, t104);
			append(section8, p17);
			append(p17, a45);
			append(a45, t105);
			append(section8, t106);
			append(section8, p18);
			append(p18, t107);
			append(p18, a46);
			append(a46, t108);
			append(section8, t109);
			append(section8, pre9);
			pre9.innerHTML = raw9_value;
			append(section8, t110);
			append(section8, p19);
			append(p19, a47);
			append(a47, t111);
			append(section8, t112);
			append(section8, p20);
			append(p20, t113);
			insert(target, t114, anchor);
			insert(target, section9, anchor);
			append(section9, h23);
			append(h23, a48);
			append(a48, t115);
			append(section9, t116);
			append(section9, p21);
			append(p21, t117);
			append(section9, t118);
			append(section9, p22);
			append(p22, t119);
			append(section9, t120);
			append(section9, p23);
			append(p23, t121);
			append(section9, t122);
			append(section9, pre10);
			pre10.innerHTML = raw10_value;
			append(section9, t123);
			append(section9, p24);
			append(p24, a49);
			append(a49, t124);
			append(section9, t125);
			append(section9, p25);
			append(p25, t126);
			append(section9, t127);
			append(section9, pre11);
			pre11.innerHTML = raw11_value;
			append(section9, t128);
			append(section9, p26);
			append(p26, t129);
			append(section9, t130);
			append(section9, ul7);
			append(ul7, li27);
			append(li27, code2);
			append(code2, t131);
			append(ul7, t132);
			append(ul7, li28);
			append(li28, code3);
			append(code3, t133);
			insert(target, t134, anchor);
			insert(target, section10, anchor);
			append(section10, h35);
			append(h35, a50);
			append(a50, t135);
			append(section10, t136);
			append(section10, p27);
			append(p27, t137);
			append(section10, t138);
			append(section10, p28);
			append(p28, t139);
			append(p28, code4);
			append(code4, t140);
			append(p28, t141);
			append(section10, t142);
			append(section10, p29);
			append(p29, t143);
			append(p29, code5);
			append(code5, t144);
			append(p29, t145);
			insert(target, t146, anchor);
			insert(target, section11, anchor);
			append(section11, h40);
			append(h40, a51);
			append(a51, t147);
			append(section11, t148);
			append(section11, p30);
			append(p30, t149);
			append(p30, strong0);
			append(strong0, t150);
			append(p30, t151);
			append(section11, t152);
			append(section11, p31);
			append(p31, t153);
			append(section11, t154);
			append(section11, p32);
			append(p32, t155);
			append(p32, code6);
			append(code6, t156);
			append(p32, t157);
			append(section11, t158);
			append(section11, pre12);
			pre12.innerHTML = raw12_value;
			insert(target, t159, anchor);
			insert(target, section12, anchor);
			append(section12, h41);
			append(h41, a52);
			append(a52, t160);
			append(section12, t161);
			append(section12, p33);
			append(p33, t162);
			append(p33, strong1);
			append(strong1, t163);
			append(p33, t164);
			append(section12, t165);
			append(section12, p34);
			append(p34, t166);
			append(section12, t167);
			append(section12, p35);
			append(p35, t168);
			append(p35, code7);
			append(code7, t169);
			append(p35, t170);
			append(p35, code8);
			append(code8, t171);
			append(p35, t172);
			append(section12, t173);
			append(section12, pre13);
			pre13.innerHTML = raw13_value;
			insert(target, t174, anchor);
			insert(target, section13, anchor);
			append(section13, h42);
			append(h42, a53);
			append(a53, t175);
			append(section13, t176);
			append(section13, p36);
			append(p36, t177);
			append(p36, strong2);
			append(strong2, t178);
			append(p36, t179);
			append(section13, t180);
			append(section13, p37);
			append(p37, t181);
			append(section13, t182);
			append(section13, p38);
			append(p38, t183);
			append(p38, code9);
			append(code9, t184);
			append(p38, t185);
			append(section13, t186);
			append(section13, pre14);
			pre14.innerHTML = raw14_value;
			append(section13, t187);
			append(section13, blockquote1);
			append(blockquote1, p39);
			append(p39, t188);
			append(p39, a54);
			append(a54, t189);
			append(p39, t190);
			insert(target, t191, anchor);
			insert(target, section14, anchor);
			append(section14, h36);
			append(h36, a55);
			append(a55, t192);
			append(section14, t193);
			append(section14, p40);
			append(p40, t194);
			append(p40, a56);
			append(a56, t195);
			append(p40, t196);
			append(section14, t197);
			append(section14, p41);
			append(p41, t198);
			append(p41, code10);
			append(code10, t199);
			append(p41, t200);
			append(section14, t201);
			append(section14, p42);
			append(p42, t202);
			append(p42, code11);
			append(code11, t203);
			append(p42, t204);
			append(section14, t205);
			append(section14, pre15);
			pre15.innerHTML = raw15_value;
			append(section14, t206);
			append(section14, p43);
			append(p43, a57);
			append(a57, t207);
			append(section14, t208);
			append(section14, pre16);
			pre16.innerHTML = raw16_value;
			append(section14, t209);
			append(section14, p44);
			append(p44, t210);
			append(p44, code12);
			append(code12, t211);
			append(p44, t212);
			append(p44, code13);
			append(code13, t213);
			append(p44, t214);
			append(section14, t215);
			append(section14, p45);
			append(p45, t216);
			append(p45, code14);
			append(code14, t217);
			append(p45, t218);
			append(section14, t219);
			append(section14, ul8);
			append(ul8, li29);
			append(li29, t220);
			append(li29, code15);
			append(code15, t221);
			append(li29, t222);
			append(li29, code16);
			append(code16, t223);
			append(li29, t224);
			append(ul8, t225);
			append(ul8, li30);
			append(li30, t226);
			append(ul8, t227);
			append(ul8, li31);
			append(li31, t228);
			append(section14, t229);
			append(section14, p46);
			append(p46, t230);
			append(p46, code17);
			append(code17, t231);
			append(p46, t232);
			append(section14, t233);
			append(section14, p47);
			append(p47, t234);
			append(p47, code18);
			append(code18, t235);
			append(p47, t236);
			append(section14, t237);
			append(section14, p48);
			append(p48, t238);
			append(p48, code19);
			append(code19, t239);
			append(p48, t240);
			insert(target, t241, anchor);
			insert(target, section15, anchor);
			append(section15, h37);
			append(h37, a58);
			append(a58, t242);
			append(section15, t243);
			append(section15, p49);
			append(p49, t244);
			append(section15, t245);
			append(section15, pre17);
			pre17.innerHTML = raw17_value;
			append(section15, t246);
			append(section15, p50);
			append(p50, a59);
			append(a59, t247);
			append(section15, t248);
			append(section15, p51);
			append(p51, t249);
			append(section15, t250);
			append(section15, pre18);
			pre18.innerHTML = raw18_value;
			append(section15, t251);
			append(section15, p52);
			append(p52, t252);
			append(section15, t253);
			append(section15, ul9);
			append(ul9, li32);
			append(li32, t254);
			append(li32, code20);
			append(code20, t255);
			append(li32, t256);
			append(ul9, t257);
			append(ul9, li33);
			append(li33, code21);
			append(code21, t258);
			append(li33, t259);
			append(section15, t260);
			append(section15, p53);
			append(p53, t261);
			insert(target, t262, anchor);
			insert(target, section16, anchor);
			append(section16, h38);
			append(h38, a60);
			append(a60, t263);
			append(section16, t264);
			append(section16, p54);
			append(p54, t265);
			append(p54, code22);
			append(code22, t266);
			append(p54, t267);
			append(section16, t268);
			append(section16, pre19);
			pre19.innerHTML = raw19_value;
			append(section16, t269);
			append(section16, p55);
			append(p55, a61);
			append(a61, t270);
			append(section16, t271);
			append(section16, p56);
			append(p56, t272);
			append(section16, t273);
			append(section16, pre20);
			pre20.innerHTML = raw20_value;
			append(section16, t274);
			append(section16, p57);
			append(p57, t275);
			append(section16, t276);
			append(section16, ul10);
			append(ul10, li34);
			append(li34, t277);
			append(li34, code23);
			append(code23, t278);
			append(li34, t279);
			append(li34, code24);
			append(code24, t280);
			append(li34, t281);
			append(ul10, t282);
			append(ul10, li35);
			append(li35, t283);
			append(li35, code25);
			append(code25, t284);
			append(li35, t285);
			append(li35, code26);
			append(code26, t286);
			append(ul10, t287);
			append(ul10, li36);
			append(li36, t288);
			append(li36, code27);
			append(code27, t289);
			append(li36, t290);
			append(ul10, t291);
			append(ul10, li37);
			append(li37, t292);
			append(li37, code28);
			append(code28, t293);
			append(li37, t294);
			append(li37, code29);
			append(code29, t295);
			append(li37, t296);
			append(ul10, t297);
			append(ul10, li38);
			append(li38, t298);
			append(li38, code30);
			append(code30, t299);
			append(li38, t300);
			append(li38, code31);
			append(code31, t301);
			append(li38, t302);
			append(li38, code32);
			append(code32, t303);
			append(section16, t304);
			append(section16, p58);
			append(p58, t305);
			append(section16, t306);
			append(section16, p59);
			append(p59, t307);
			append(p59, code33);
			append(code33, t308);
			append(p59, t309);
			append(section16, t310);
			append(section16, p60);
			append(p60, t311);
			append(section16, t312);
			append(section16, ul11);
			append(ul11, li39);
			append(li39, t313);
			append(li39, code34);
			append(code34, t314);
			append(li39, t315);
			append(ul11, t316);
			append(ul11, li40);
			append(li40, t317);
			append(li40, code35);
			append(code35, t318);
			append(li40, t319);
			append(ul11, t320);
			append(ul11, li41);
			append(li41, t321);
			append(li41, code36);
			append(code36, t322);
			append(ul11, t323);
			append(ul11, li42);
			append(li42, t324);
			append(li42, code37);
			append(code37, t325);
			append(li42, t326);
			append(li42, code38);
			append(code38, t327);
			append(ul11, t328);
			append(ul11, li43);
			append(li43, t329);
			append(section16, t330);
			append(section16, p61);
			append(p61, t331);
			append(p61, code39);
			append(code39, t332);
			append(p61, t333);
			append(p61, code40);
			append(code40, t334);
			append(p61, t335);
			append(p61, code41);
			append(code41, t336);
			append(p61, t337);
			append(p61, code42);
			append(code42, t338);
			append(p61, t339);
			append(section16, t340);
			append(section16, p62);
			append(p62, t341);
			append(p62, code43);
			append(code43, t342);
			append(p62, t343);
			insert(target, t344, anchor);
			insert(target, section17, anchor);
			append(section17, h43);
			append(h43, a62);
			append(a62, t345);
			append(section17, t346);
			append(section17, p63);
			append(p63, t347);
			append(p63, strong3);
			append(strong3, t348);
			append(p63, t349);
			append(section17, t350);
			append(section17, p64);
			append(p64, strong4);
			append(strong4, t351);
			append(p64, t352);
			append(p64, code44);
			append(code44, t353);
			append(p64, t354);
			append(p64, code45);
			append(code45, t355);
			append(p64, t356);
			insert(target, t357, anchor);
			insert(target, section18, anchor);
			append(section18, h39);
			append(h39, a63);
			append(a63, t358);
			append(section18, t359);
			append(section18, p65);
			append(p65, t360);
			append(p65, code46);
			append(code46, t361);
			append(p65, t362);
			append(p65, code47);
			append(code47, t363);
			append(p65, t364);
			append(p65, code48);
			append(code48, t365);
			append(p65, t366);
			append(p65, code49);
			append(code49, t367);
			append(p65, t368);
			append(section18, t369);
			append(section18, p66);
			append(p66, t370);
			append(p66, code50);
			append(code50, t371);
			append(p66, t372);
			append(p66, code51);
			append(code51, t373);
			append(p66, t374);
			append(section18, t375);
			append(section18, pre21);
			pre21.innerHTML = raw21_value;
			append(section18, t376);
			append(section18, p67);
			append(p67, t377);
			append(p67, code52);
			append(code52, t378);
			append(p67, t379);
			append(p67, code53);
			append(code53, t380);
			append(p67, t381);
			append(p67, code54);
			append(code54, t382);
			append(p67, t383);
			append(section18, t384);
			append(section18, pre22);
			pre22.innerHTML = raw22_value;
			insert(target, t385, anchor);
			insert(target, section19, anchor);
			append(section19, h310);
			append(h310, a64);
			append(a64, t386);
			append(section19, t387);
			append(section19, p68);
			append(p68, t388);
			append(p68, code55);
			append(code55, t389);
			append(p68, t390);
			append(p68, em);
			append(em, t391);
			append(p68, t392);
			append(section19, t393);
			append(section19, ul12);
			append(ul12, li44);
			append(li44, t394);
			append(ul12, t395);
			append(ul12, li45);
			append(li45, t396);
			append(section19, t397);
			append(section19, p69);
			append(p69, t398);
			append(p69, strong5);
			append(strong5, t399);
			append(p69, t400);
			append(section19, t401);
			append(section19, p70);
			append(p70, t402);
			append(p70, code56);
			append(code56, t403);
			append(p70, t404);
			append(p70, code57);
			append(code57, t405);
			append(p70, t406);
			append(p70, strong6);
			append(strong6, t407);
			append(p70, t408);
			append(section19, t409);
			append(section19, pre23);
			pre23.innerHTML = raw23_value;
			append(section19, t410);
			append(section19, p71);
			append(p71, t411);
			append(p71, code58);
			append(code58, t412);
			append(p71, t413);
			append(p71, code59);
			append(code59, t414);
			append(p71, t415);
			append(p71, strong7);
			append(strong7, t416);
			append(p71, t417);
			append(section19, t418);
			append(section19, pre24);
			pre24.innerHTML = raw24_value;
			append(section19, t419);
			append(section19, p72);
			append(p72, t420);
			append(p72, a65);
			append(a65, t421);
			insert(target, t422, anchor);
			insert(target, section20, anchor);
			append(section20, h311);
			append(h311, a66);
			append(a66, t423);
			append(section20, t424);
			append(section20, p73);
			append(p73, t425);
			append(p73, code60);
			append(code60, t426);
			append(p73, t427);
			append(section20, t428);
			append(section20, p74);
			append(p74, t429);
			append(section20, t430);
			append(section20, ul13);
			append(ul13, li46);
			append(li46, t431);
			append(ul13, t432);
			append(ul13, li47);
			append(li47, t433);
			append(section20, t434);
			append(section20, p75);
			append(p75, t435);
			append(p75, code61);
			append(code61, t436);
			append(p75, t437);
			append(section20, t438);
			append(section20, pre25);
			pre25.innerHTML = raw25_value;
			append(section20, t439);
			append(section20, p76);
			append(p76, t440);
			append(p76, code62);
			append(code62, t441);
			append(p76, t442);
			append(section20, t443);
			append(section20, pre26);
			pre26.innerHTML = raw26_value;
			insert(target, t444, anchor);
			insert(target, section21, anchor);
			append(section21, h312);
			append(h312, a67);
			append(a67, t445);
			append(section21, t446);
			append(section21, p77);
			append(p77, t447);
			append(section21, t448);
			append(section21, pre27);
			pre27.innerHTML = raw27_value;
			append(section21, t449);
			append(section21, p78);
			append(p78, a68);
			append(a68, t450);
			append(section21, t451);
			append(section21, p79);
			append(p79, t452);
			append(section21, t453);
			append(section21, pre28);
			pre28.innerHTML = raw28_value;
			append(section21, t454);
			append(section21, p80);
			append(p80, t455);
			append(section21, t456);
			append(section21, ul14);
			append(ul14, li48);
			append(li48, code63);
			append(code63, t457);
			append(li48, t458);
			append(ul14, t459);
			append(ul14, li49);
			append(li49, t460);
			append(li49, strong8);
			append(strong8, t461);
			append(li49, t462);
			append(li49, strong9);
			append(strong9, t463);
			append(section21, t464);
			append(section21, p81);
			append(p81, t465);
			append(p81, code64);
			append(code64, t466);
			append(p81, t467);
			append(p81, strong10);
			append(strong10, t468);
			append(p81, t469);
			append(p81, strong11);
			append(strong11, t470);
			append(p81, t471);
			append(section21, t472);
			append(section21, p82);
			append(p82, t473);
			append(p82, code65);
			append(code65, t474);
			append(p82, t475);
			append(p82, code66);
			append(code66, t476);
			append(p82, t477);
			append(p82, strong12);
			append(strong12, t478);
			append(p82, t479);
			append(section21, t480);
			append(section21, p83);
			append(p83, t481);
			insert(target, t482, anchor);
			insert(target, section22, anchor);
			append(section22, h313);
			append(h313, a69);
			append(a69, t483);
			append(section22, t484);
			append(section22, p84);
			append(p84, t485);
			append(p84, a70);
			append(a70, t486);
			append(p84, t487);
			append(p84, a71);
			append(a71, t488);
			append(p84, t489);
			append(section22, t490);
			append(section22, p85);
			append(p85, t491);
			append(section22, t492);
			append(section22, pre29);
			pre29.innerHTML = raw29_value;
			append(section22, t493);
			append(section22, p86);
			append(p86, a72);
			append(a72, t494);
			append(section22, t495);
			append(section22, p87);
			append(p87, t496);
			append(section22, t497);
			append(section22, pre30);
			pre30.innerHTML = raw30_value;
			append(section22, t498);
			append(section22, p88);
			append(p88, t499);
			append(section22, t500);
			append(section22, pre31);
			pre31.innerHTML = raw31_value;
			append(section22, t501);
			append(section22, p89);
			append(p89, t502);
			append(section22, t503);
			append(section22, p90);
			append(p90, t504);
			append(p90, code67);
			append(code67, t505);
			append(p90, t506);
			insert(target, t507, anchor);
			insert(target, section23, anchor);
			append(section23, h24);
			append(h24, a73);
			append(a73, t508);
			append(section23, t509);
			append(section23, p91);
			append(p91, t510);
			append(section23, t511);
			append(section23, p92);
			append(p92, t512);
			append(section23, t513);
			append(section23, p93);
			append(p93, t514);
			insert(target, t515, anchor);
			insert(target, section24, anchor);
			append(section24, h44);
			append(h44, a74);
			append(a74, t516);
			append(section24, t517);
			append(section24, ul15);
			append(ul15, li50);
			append(li50, t518);
			insert(target, t519, anchor);
			insert(target, section25, anchor);
			append(section25, h45);
			append(h45, a75);
			append(a75, t520);
			append(section25, t521);
			append(section25, ul16);
			append(ul16, li51);
			append(li51, t522);
			append(li51, code68);
			append(code68, t523);
			append(li51, t524);
			append(ul16, t525);
			append(ul16, li52);
			append(li52, t526);
			append(ul16, t527);
			append(ul16, li53);
			append(li53, code69);
			append(code69, t528);
			append(li53, t529);
			insert(target, t530, anchor);
			insert(target, section26, anchor);
			append(section26, h46);
			append(h46, a76);
			append(a76, t531);
			append(section26, t532);
			append(section26, ul17);
			append(ul17, li54);
			append(li54, t533);
			append(li54, code70);
			append(code70, t534);
			append(li54, t535);
			append(li54, code71);
			append(code71, t536);
			append(li54, t537);
			append(ul17, t538);
			append(ul17, li55);
			append(li55, t539);
			append(ul17, t540);
			append(ul17, li56);
			append(li56, t541);
			append(li56, a77);
			append(a77, t542);
			append(section26, t543);
			append(section26, p94);
			append(p94, t544);
			append(section26, t545);
			append(section26, ul18);
			append(ul18, li57);
			append(li57, t546);
			append(li57, code72);
			append(code72, t547);
			append(li57, t548);
			append(ul18, t549);
			append(ul18, li58);
			append(li58, t550);
			append(li58, code73);
			append(code73, t551);
			append(li58, t552);
			append(li58, code74);
			append(code74, t553);
			append(li58, t554);
			append(ul18, t555);
			append(ul18, li59);
			append(li59, t556);
			append(li59, code75);
			append(code75, t557);
			append(li59, t558);
			append(ul18, t559);
			append(ul18, li60);
			append(li60, t560);
			insert(target, t561, anchor);
			insert(target, section27, anchor);
			append(section27, h25);
			append(h25, a78);
			append(a78, t562);
			append(section27, t563);
			append(section27, p95);
			append(p95, t564);
			append(section27, t565);
			append(section27, p96);
			append(p96, t566);
			append(p96, a79);
			append(a79, t567);
			append(p96, t568);
			append(section27, t569);
			append(section27, p97);
			append(p97, t570);
			append(p97, a80);
			append(a80, t571);
			append(p97, t572);
			append(p97, a81);
			append(a81, t573);
			append(p97, t574);
			append(p97, a82);
			append(a82, t575);
			append(p97, t576);
			append(section27, t577);
			append(section27, p98);
			append(p98, strong13);
			append(strong13, t578);
			append(strong13, a83);
			append(a83, t579);
			append(strong13, t580);
		},
		p: noop,
		d(detaching) {
			if (detaching) detach(section0);
			if (detaching) detach(t27);
			if (detaching) detach(section1);
			if (detaching) detach(t47);
			if (detaching) detach(section2);
			if (detaching) detach(t51);
			if (detaching) detach(section3);
			if (detaching) detach(t54);
			if (detaching) detach(section4);
			if (detaching) detach(t57);
			if (detaching) detach(section5);
			if (detaching) detach(t60);
			if (detaching) detach(section6);
			if (detaching) detach(t63);
			if (detaching) detach(section7);
			if (detaching) detach(t70);
			if (detaching) detach(section8);
			if (detaching) detach(t114);
			if (detaching) detach(section9);
			if (detaching) detach(t134);
			if (detaching) detach(section10);
			if (detaching) detach(t146);
			if (detaching) detach(section11);
			if (detaching) detach(t159);
			if (detaching) detach(section12);
			if (detaching) detach(t174);
			if (detaching) detach(section13);
			if (detaching) detach(t191);
			if (detaching) detach(section14);
			if (detaching) detach(t241);
			if (detaching) detach(section15);
			if (detaching) detach(t262);
			if (detaching) detach(section16);
			if (detaching) detach(t344);
			if (detaching) detach(section17);
			if (detaching) detach(t357);
			if (detaching) detach(section18);
			if (detaching) detach(t385);
			if (detaching) detach(section19);
			if (detaching) detach(t422);
			if (detaching) detach(section20);
			if (detaching) detach(t444);
			if (detaching) detach(section21);
			if (detaching) detach(t482);
			if (detaching) detach(section22);
			if (detaching) detach(t507);
			if (detaching) detach(section23);
			if (detaching) detach(t515);
			if (detaching) detach(section24);
			if (detaching) detach(t519);
			if (detaching) detach(section25);
			if (detaching) detach(t530);
			if (detaching) detach(section26);
			if (detaching) detach(t561);
			if (detaching) detach(section27);
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
	"title": "Compile Svelte in your head (Part 1)",
	"date": "2020-03-04T08:00:00Z",
	"tags": ["Svelte", "JavaScript"],
	"series": "Compile Svelte in your head",
	"slug": "compile-svelte-in-your-head-part-1",
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
