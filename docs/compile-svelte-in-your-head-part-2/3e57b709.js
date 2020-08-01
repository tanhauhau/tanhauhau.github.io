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

var image = "https://lihautan.com/compile-svelte-in-your-head-part-2/assets/hero-twitter-2914f5b9.jpg";

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
					"@id": "https%3A%2F%2Flihautan.com%2Fcompile-svelte-in-your-head-part-2",
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
			attr(meta11, "content", "https%3A%2F%2Flihautan.com%2Fcompile-svelte-in-your-head-part-2");
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
							"@id": "https%3A%2F%2Flihautan.com%2Fcompile-svelte-in-your-head-part-2",
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

/* content/blog/compile-svelte-in-your-head-part-2/@@page-markup.svelte generated by Svelte v3.24.0 */

function create_default_slot(ctx) {
	let section0;
	let ul8;
	let li0;
	let a0;
	let t0;
	let ul1;
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
	let ul0;
	let li5;
	let a5;
	let t5;
	let li6;
	let a6;
	let t6;
	let ul3;
	let li7;
	let a7;
	let t7;
	let li8;
	let a8;
	let t8;
	let ul2;
	let li9;
	let a9;
	let t9;
	let li10;
	let a10;
	let t10;
	let li11;
	let a11;
	let t11;
	let ul5;
	let ul4;
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
	let li16;
	let a16;
	let t16;
	let ul7;
	let ul6;
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
	let t22;
	let p0;
	let strong0;
	let t23;
	let a22;
	let t24;
	let t25;
	let t26;
	let p1;
	let a23;
	let t27;
	let t28;
	let code0;
	let t29;
	let t30;
	let code1;
	let t31;
	let t32;
	let t33;
	let pre0;

	let raw0_value = `
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

	let t34;
	let p2;
	let t35;
	let code2;
	let t36;
	let t37;
	let code3;
	let t38;
	let t39;
	let t40;
	let p3;
	let t41;
	let a24;
	let t42;
	let t43;
	let t44;
	let section1;
	let h20;
	let a25;
	let t45;
	let t46;
	let p4;
	let t47;
	let code4;
	let t48;
	let t49;
	let a26;
	let t50;
	let t51;
	let a27;
	let t52;
	let t53;
	let code5;
	let t54;
	let t55;
	let t56;
	let p5;
	let t57;
	let a28;
	let t58;
	let t59;
	let t60;
	let section2;
	let h30;
	let a29;
	let t61;
	let t62;
	let p6;
	let t63;
	let strong1;
	let t64;
	let t65;
	let t66;
	let p7;
	let t67;
	let a30;
	let t68;
	let t69;
	let t70;
	let ul9;
	let li22;
	let t71;
	let code6;
	let t72;
	let t73;
	let t74;
	let li23;
	let t75;
	let t76;
	let li24;
	let t77;
	let t78;
	let p8;
	let t79;
	let t80;
	let p9;
	let t81;
	let t82;
	let p10;
	let t83;
	let code7;
	let t84;
	let t85;
	let code8;
	let t86;
	let t87;
	let t88;
	let p11;
	let t89;
	let code9;
	let t90;
	let t91;
	let code10;
	let t92;
	let t93;
	let t94;
	let pre1;

	let raw1_value = `
<code class="language-svelte">&lt;script&gt;
  let name = &#39;world&#39;;
  function update() &#123;
    name = &#39;Svelte&#39;;
  &#125;
&lt;/script&gt;
&lt;button on:click=&#123;update&#125;&gt;&#123;name&#125;&lt;/button&gt;</code>` + "";

	let t95;
	let p12;
	let a31;
	let t96;
	let t97;
	let pre2;

	let raw2_value = `
<code class="language-js"><span class="token comment">// ...</span>
<span class="token keyword">function</span> <span class="token function">instance</span><span class="token punctuation">(</span><span class="token parameter">$$self<span class="token punctuation">,</span> $$props<span class="token punctuation">,</span> $$invalidate</span><span class="token punctuation">)</span> <span class="token punctuation">&#123;</span>
  <span class="token keyword">let</span> name <span class="token operator">=</span> <span class="token string">'world'</span><span class="token punctuation">;</span>
  <span class="token keyword">function</span> <span class="token function">update</span><span class="token punctuation">(</span><span class="token punctuation">)</span> <span class="token punctuation">&#123;</span>
    <span class="token function">$$invalidate</span><span class="token punctuation">(</span><span class="token string">'name'</span><span class="token punctuation">,</span> <span class="token punctuation">(</span>name <span class="token operator">=</span> <span class="token string">'Svelte'</span><span class="token punctuation">)</span><span class="token punctuation">)</span><span class="token punctuation">;</span>
  <span class="token punctuation">&#125;</span>
  <span class="token keyword">return</span> <span class="token punctuation">&#123;</span> name<span class="token punctuation">,</span> update <span class="token punctuation">&#125;</span><span class="token punctuation">;</span>
<span class="token punctuation">&#125;</span>

<span class="token comment">// ...some where in &#96;create_fragment&#96;</span>
ctx<span class="token punctuation">.</span><span class="token function">update</span><span class="token punctuation">(</span><span class="token punctuation">)</span><span class="token punctuation">;</span> <span class="token comment">// logs &#96;world&#96; scoped in the &#96;instance&#96; closure</span></code>` + "";

	let t98;
	let p13;
	let t99;
	let code11;
	let t100;
	let t101;
	let code12;
	let t102;
	let t103;
	let t104;
	let section3;
	let h31;
	let a32;
	let t105;
	let t106;
	let p14;
	let code13;
	let t107;
	let t108;
	let t109;
	let p15;
	let t110;
	let t111;
	let pre3;

	let raw3_value = `
<code class="language-svelte">&lt;script&gt;
  let agility = 0;
  let power = 0;
  function incrementAgility() &#123;
    agility ++;
  &#125;
  function incrementPower() &#123;
    power ++;
  &#125;
  function levelUp() &#123;
    agility += 5;
    power += 7;
  &#125;
&lt;/script&gt;

Agility: &#123;agility&#125;
Power: &#123;power&#125;
Stats: &#123;agility * power&#125;

&lt;button on:click=&#123;incrementAgility&#125;&gt;+ Agility&lt;/button&gt;
&lt;button on:click=&#123;incrementPower&#125;&gt;+ Power&lt;/button&gt;
&lt;button on:click=&#123;levelUp&#125;&gt;Level Up&lt;/button&gt;</code>` + "";

	let t112;
	let p16;
	let a33;
	let t113;
	let t114;
	let p17;
	let t115;
	let code14;
	let t116;
	let t117;
	let code15;
	let t118;
	let t119;
	let a34;
	let t120;
	let t121;
	let t122;
	let p18;
	let t123;
	let strong2;
	let t124;
	let t125;
	let code16;
	let t126;
	let t127;
	let t128;
	let pre4;

	let raw4_value = `
<code class="language-js"><span class="token punctuation">&#123;</span> agility<span class="token punctuation">:</span> <span class="token boolean">true</span><span class="token punctuation">;</span> <span class="token punctuation">&#125;</span></code>` + "";

	let t129;
	let p19;
	let t130;
	let strong3;
	let t131;
	let t132;
	let code17;
	let t133;
	let t134;
	let t135;
	let pre5;

	let raw5_value = `
<code class="language-js"><span class="token punctuation">&#123;</span> agility<span class="token punctuation">:</span> <span class="token boolean">true</span><span class="token punctuation">,</span> power<span class="token punctuation">:</span> <span class="token boolean">true</span> <span class="token punctuation">&#125;</span></code>` + "";

	let t136;
	let p20;
	let code18;
	let t137;
	let t138;
	let t139;
	let p21;
	let t140;
	let strong4;
	let t141;
	let t142;
	let code19;
	let t143;
	let t144;
	let t145;
	let pre6;

	let raw6_value = `
<code class="language-js"><span class="token comment">// NOTE: $$.dirty is passed into the &#96;p&#96; function as &#96;changed&#96;</span>
<span class="token function">p</span><span class="token punctuation">(</span><span class="token parameter">changed<span class="token punctuation">,</span> ctx</span><span class="token punctuation">)</span> <span class="token punctuation">&#123;</span>
  <span class="token comment">// checked if agility has changed before update the agility text</span>
  <span class="token keyword">if</span> <span class="token punctuation">(</span>changed<span class="token punctuation">.</span>agility<span class="token punctuation">)</span> <span class="token function">set_data</span><span class="token punctuation">(</span>t1<span class="token punctuation">,</span> ctx<span class="token punctuation">.</span>agility<span class="token punctuation">)</span><span class="token punctuation">;</span>
  <span class="token keyword">if</span> <span class="token punctuation">(</span>changed<span class="token punctuation">.</span>power<span class="token punctuation">)</span> <span class="token function">set_data</span><span class="token punctuation">(</span>t3<span class="token punctuation">,</span> ctx<span class="token punctuation">.</span>power<span class="token punctuation">)</span><span class="token punctuation">;</span>
  <span class="token comment">// if either agility or power has changed, update the stats text</span>
  <span class="token keyword">if</span> <span class="token punctuation">(</span><span class="token punctuation">(</span>changed<span class="token punctuation">.</span>agility <span class="token operator">||</span> changed<span class="token punctuation">.</span>power<span class="token punctuation">)</span> <span class="token operator">&amp;&amp;</span> t5_value <span class="token operator">!==</span> <span class="token punctuation">(</span>t5_value <span class="token operator">=</span> ctx<span class="token punctuation">.</span>agility <span class="token operator">*</span> ctx<span class="token punctuation">.</span>power <span class="token operator">+</span> <span class="token string">""</span><span class="token punctuation">)</span><span class="token punctuation">)</span> <span class="token function">set_data</span><span class="token punctuation">(</span>t5<span class="token punctuation">,</span> t5_value<span class="token punctuation">)</span><span class="token punctuation">;</span>
<span class="token punctuation">&#125;</span></code>` + "";

	let t146;
	let p22;
	let t147;
	let code20;
	let t148;
	let t149;
	let code21;
	let t150;
	let t151;
	let t152;
	let section4;
	let h32;
	let a35;
	let t153;
	let t154;
	let p23;
	let code22;
	let t155;
	let t156;
	let t157;
	let p24;
	let t158;
	let t159;
	let ul10;
	let li25;
	let t160;
	let code23;
	let t161;
	let t162;
	let li26;
	let t163;
	let code24;
	let t164;
	let t165;
	let p25;
	let t166;
	let code25;
	let t167;
	let t168;
	let t169;
	let pre7;

	let raw7_value = `
<code class="language-js">name <span class="token operator">=</span> <span class="token string">'Svelte'</span><span class="token punctuation">;</span>
count<span class="token operator">++</span><span class="token punctuation">;</span>
foo<span class="token punctuation">.</span>a <span class="token operator">=</span> <span class="token number">1</span><span class="token punctuation">;</span>
bar <span class="token operator">=</span> baz <span class="token operator">=</span> <span class="token number">3</span><span class="token punctuation">;</span>
<span class="token comment">// compiled into</span>
<span class="token function">$$invalidate</span><span class="token punctuation">(</span><span class="token string">'name'</span><span class="token punctuation">,</span> <span class="token punctuation">(</span>name <span class="token operator">=</span> <span class="token string">'Svelte'</span><span class="token punctuation">)</span><span class="token punctuation">)</span><span class="token punctuation">;</span>
<span class="token function">$$invalidate</span><span class="token punctuation">(</span><span class="token string">'count'</span><span class="token punctuation">,</span> count<span class="token operator">++</span><span class="token punctuation">,</span> count<span class="token punctuation">)</span><span class="token punctuation">;</span>
<span class="token function">$$invalidate</span><span class="token punctuation">(</span><span class="token string">'foo'</span><span class="token punctuation">,</span> <span class="token punctuation">(</span>foo<span class="token punctuation">.</span>a <span class="token operator">=</span> <span class="token number">1</span><span class="token punctuation">)</span><span class="token punctuation">,</span> foo<span class="token punctuation">)</span><span class="token punctuation">;</span>
<span class="token function">$$invalidate</span><span class="token punctuation">(</span><span class="token string">'bar'</span><span class="token punctuation">,</span> <span class="token punctuation">(</span>bar <span class="token operator">=</span> <span class="token function">$$invalidate</span><span class="token punctuation">(</span><span class="token string">'baz'</span><span class="token punctuation">,</span> <span class="token punctuation">(</span>baz <span class="token operator">=</span> <span class="token number">3</span><span class="token punctuation">)</span><span class="token punctuation">)</span><span class="token punctuation">)</span><span class="token punctuation">)</span><span class="token punctuation">;</span></code>` + "";

	let t170;
	let p26;
	let t171;
	let code26;
	let t172;
	let t173;
	let t174;
	let ol0;
	let li27;
	let t175;
	let code27;
	let t176;
	let t177;
	let li28;
	let t178;
	let code28;
	let t179;
	let t180;
	let li29;
	let t181;
	let t182;
	let li30;
	let t183;
	let t184;
	let pre8;

	let raw8_value = `
<code class="language-js"><span class="token comment">// src/runtime/internal/Component.ts</span>
<span class="token keyword">const</span> <span class="token function-variable function">$$invalidate</span> <span class="token operator">=</span> <span class="token punctuation">(</span><span class="token parameter">key<span class="token punctuation">,</span> ret<span class="token punctuation">,</span> value <span class="token operator">=</span> ret</span><span class="token punctuation">)</span> <span class="token operator">=></span> <span class="token punctuation">&#123;</span>
  <span class="token keyword">if</span> <span class="token punctuation">(</span>$$<span class="token punctuation">.</span>ctx <span class="token operator">&amp;&amp;</span> <span class="token function">not_equal</span><span class="token punctuation">(</span>$$<span class="token punctuation">.</span>ctx<span class="token punctuation">[</span>key<span class="token punctuation">]</span><span class="token punctuation">,</span> value<span class="token punctuation">)</span><span class="token punctuation">)</span> <span class="token punctuation">&#123;</span>
    <span class="token comment">// 1. update the variable in $$.ctx</span>
    $$<span class="token punctuation">.</span>ctx<span class="token punctuation">[</span>key<span class="token punctuation">]</span> <span class="token operator">=</span> value<span class="token punctuation">;</span>
    <span class="token comment">// ...</span>
    <span class="token comment">// 2a. mark the variable in $$.dirty</span>
    <span class="token function">make_dirty</span><span class="token punctuation">(</span>component<span class="token punctuation">,</span> key<span class="token punctuation">)</span><span class="token punctuation">;</span>
  <span class="token punctuation">&#125;</span>
  <span class="token comment">// 4. return the value of the assignment or update expression</span>
  <span class="token keyword">return</span> ret<span class="token punctuation">;</span>
<span class="token punctuation">&#125;</span><span class="token punctuation">;</span>

<span class="token comment">// src/runtime/internal/Component.ts</span>
<span class="token keyword">function</span> <span class="token function">make_dirty</span><span class="token punctuation">(</span><span class="token parameter">component<span class="token punctuation">,</span> key</span><span class="token punctuation">)</span> <span class="token punctuation">&#123;</span>
  <span class="token keyword">if</span> <span class="token punctuation">(</span><span class="token operator">!</span>component<span class="token punctuation">.</span>$$<span class="token punctuation">.</span>dirty<span class="token punctuation">)</span> <span class="token punctuation">&#123;</span>
    dirty_components<span class="token punctuation">.</span><span class="token function">push</span><span class="token punctuation">(</span>component<span class="token punctuation">)</span><span class="token punctuation">;</span>
    <span class="token comment">// 3. schedule an update</span>
    <span class="token function">schedule_update</span><span class="token punctuation">(</span><span class="token punctuation">)</span><span class="token punctuation">;</span>
    <span class="token comment">// initialise $$.dirty</span>
    component<span class="token punctuation">.</span>$$<span class="token punctuation">.</span>dirty <span class="token operator">=</span> <span class="token function">blank_object</span><span class="token punctuation">(</span><span class="token punctuation">)</span><span class="token punctuation">;</span>
  <span class="token punctuation">&#125;</span>
  <span class="token comment">// 2b. mark the variable in $$.dirty</span>
  component<span class="token punctuation">.</span>$$<span class="token punctuation">.</span>dirty<span class="token punctuation">[</span>key<span class="token punctuation">]</span> <span class="token operator">=</span> <span class="token boolean">true</span><span class="token punctuation">;</span>
<span class="token punctuation">&#125;</span></code>` + "";

	let t185;
	let p27;
	let a36;
	let t186;
	let t187;
	let p28;
	let t188;
	let code29;
	let t189;
	let t190;
	let t191;
	let p29;
	let t192;
	let code30;
	let t193;
	let t194;
	let t195;
	let pre9;

	let raw9_value = `
<code class="language-js">obj <span class="token operator">=</span> <span class="token punctuation">&#123;</span>
  b<span class="token punctuation">:</span> <span class="token punctuation">(</span>foo <span class="token operator">=</span> bar<span class="token operator">++</span><span class="token punctuation">)</span><span class="token punctuation">,</span>
<span class="token punctuation">&#125;</span><span class="token punctuation">;</span>

obj<span class="token punctuation">.</span>c <span class="token operator">=</span> <span class="token string">'hello'</span><span class="token punctuation">;</span>

<span class="token punctuation">(</span><span class="token punctuation">&#123;</span> a<span class="token punctuation">:</span> c <span class="token operator">=</span> d<span class="token operator">++</span><span class="token punctuation">,</span> b <span class="token punctuation">&#125;</span> <span class="token operator">=</span> baz <span class="token operator">=</span> obj<span class="token punctuation">)</span><span class="token punctuation">;</span>

<span class="token comment">// assuming all variables are referenced in the template</span>
<span class="token comment">// the above compiles into</span>

<span class="token function">$$invalidate</span><span class="token punctuation">(</span>
  <span class="token string">'obj'</span><span class="token punctuation">,</span>
  <span class="token punctuation">(</span>obj <span class="token operator">=</span> <span class="token punctuation">&#123;</span>
    b<span class="token punctuation">:</span> <span class="token function">$$invalidate</span><span class="token punctuation">(</span><span class="token string">'foo'</span><span class="token punctuation">,</span> <span class="token punctuation">(</span>foo <span class="token operator">=</span> <span class="token function">$$invalidate</span><span class="token punctuation">(</span><span class="token string">'bar'</span><span class="token punctuation">,</span> bar<span class="token operator">++</span><span class="token punctuation">,</span> bar<span class="token punctuation">)</span><span class="token punctuation">)</span><span class="token punctuation">)</span><span class="token punctuation">,</span>
  <span class="token punctuation">&#125;</span><span class="token punctuation">)</span>
<span class="token punctuation">)</span><span class="token punctuation">;</span>

<span class="token function">$$invalidate</span><span class="token punctuation">(</span><span class="token string">'obj'</span><span class="token punctuation">,</span> <span class="token punctuation">(</span>obj<span class="token punctuation">.</span>c <span class="token operator">=</span> <span class="token string">'hello'</span><span class="token punctuation">)</span><span class="token punctuation">,</span> obj<span class="token punctuation">)</span><span class="token punctuation">;</span>

<span class="token function">$$invalidate</span><span class="token punctuation">(</span>
  <span class="token string">'c'</span><span class="token punctuation">,</span>
  <span class="token punctuation">(</span><span class="token punctuation">&#123;</span> a<span class="token punctuation">:</span> c <span class="token operator">=</span> <span class="token function">$$invalidate</span><span class="token punctuation">(</span><span class="token string">'d'</span><span class="token punctuation">,</span> d<span class="token operator">++</span><span class="token punctuation">,</span> d<span class="token punctuation">)</span><span class="token punctuation">,</span> b <span class="token punctuation">&#125;</span> <span class="token operator">=</span> <span class="token function">$$invalidate</span><span class="token punctuation">(</span><span class="token string">'baz'</span><span class="token punctuation">,</span> <span class="token punctuation">(</span>baz <span class="token operator">=</span> obj<span class="token punctuation">)</span><span class="token punctuation">)</span><span class="token punctuation">)</span><span class="token punctuation">,</span>
  c<span class="token punctuation">,</span>
  <span class="token function">$$invalidate</span><span class="token punctuation">(</span><span class="token string">'b'</span><span class="token punctuation">,</span> b<span class="token punctuation">)</span>
<span class="token punctuation">)</span><span class="token punctuation">;</span></code>` + "";

	let t196;
	let p30;
	let t197;
	let t198;
	let p31;
	let t199;
	let code31;
	let t200;
	let t201;
	let code32;
	let t202;
	let t203;
	let t204;
	let p32;
	let t205;
	let code33;
	let t206;
	let t207;
	let t208;
	let pre10;

	let raw10_value = `
<code class="language-js">obj<span class="token punctuation">.</span>c <span class="token operator">=</span> <span class="token string">'hello'</span><span class="token punctuation">;</span>

<span class="token comment">// compiles into</span>
<span class="token function">$$invalidate</span><span class="token punctuation">(</span><span class="token string">'obj'</span><span class="token punctuation">,</span> <span class="token punctuation">(</span>obj<span class="token punctuation">.</span>c <span class="token operator">=</span> <span class="token string">'hello'</span><span class="token punctuation">)</span><span class="token punctuation">,</span> obj<span class="token punctuation">)</span><span class="token punctuation">;</span>
<span class="token comment">// - it invalidates &#96;obj&#96;</span>
<span class="token comment">// - it returns the evaluated value of the expression &#96;obj.c = 'hello'&#96;, which is 'hello'</span></code>` + "";

	let t209;
	let p33;
	let t210;
	let code34;
	let t211;
	let t212;
	let code35;
	let t213;
	let t214;
	let code36;
	let t215;
	let t216;
	let t217;
	let section5;
	let h33;
	let a37;
	let t218;
	let t219;
	let p34;
	let code37;
	let t220;
	let t221;
	let t222;
	let p35;
	let t223;
	let a38;
	let t224;
	let t225;
	let a39;
	let t226;
	let t227;
	let code38;
	let t228;
	let t229;
	let t230;
	let p36;
	let t231;
	let t232;
	let pre11;

	let raw11_value = `
<code class="language-js"><span class="token comment">// src/runtime/internal/scheduler.ts</span>
<span class="token keyword">export</span> <span class="token keyword">function</span> <span class="token function">schedule_update</span><span class="token punctuation">(</span><span class="token punctuation">)</span> <span class="token punctuation">&#123;</span>
  <span class="token keyword">if</span> <span class="token punctuation">(</span><span class="token operator">!</span>update_scheduled<span class="token punctuation">)</span> <span class="token punctuation">&#123;</span>
    update_scheduled <span class="token operator">=</span> <span class="token boolean">true</span><span class="token punctuation">;</span>
    <span class="token comment">// NOTE: &#96;flush&#96; will do the DOM update</span>
    <span class="token comment">// we push it into the microtask queue</span>
    <span class="token comment">// highlight-next-line</span>
    resolved_promise<span class="token punctuation">.</span><span class="token function">then</span><span class="token punctuation">(</span>flush<span class="token punctuation">)</span><span class="token punctuation">;</span>
  <span class="token punctuation">&#125;</span>
<span class="token punctuation">&#125;</span></code>` + "";

	let t233;
	let p37;
	let t234;
	let code39;
	let t235;
	let t236;
	let t237;
	let pre12;

	let raw12_value = `
<code class="language-js"><span class="token comment">// src/runtime/internal/scheduler.ts</span>
<span class="token keyword">function</span> <span class="token function">flush</span><span class="token punctuation">(</span><span class="token punctuation">)</span> <span class="token punctuation">&#123;</span>
  <span class="token comment">// ...</span>
  <span class="token comment">// for each componnet in &#96;dirty_components&#96;</span>
  <span class="token comment">// highlight-start</span>
  <span class="token function">update</span><span class="token punctuation">(</span>component<span class="token punctuation">.</span>$$<span class="token punctuation">)</span><span class="token punctuation">;</span>
  <span class="token comment">// highlight-end</span>
  <span class="token comment">// ...</span>
<span class="token punctuation">&#125;</span>

<span class="token comment">// src/runtime/internal/scheduler.ts</span>
<span class="token keyword">function</span> <span class="token function">update</span><span class="token punctuation">(</span><span class="token parameter">$$</span><span class="token punctuation">)</span> <span class="token punctuation">&#123;</span>
  <span class="token keyword">if</span> <span class="token punctuation">(</span>$$<span class="token punctuation">.</span>fragment <span class="token operator">!==</span> <span class="token keyword">null</span><span class="token punctuation">)</span> <span class="token punctuation">&#123;</span>
    <span class="token comment">// NOTE: this will be important later</span>
    $$<span class="token punctuation">.</span><span class="token function">update</span><span class="token punctuation">(</span>$$<span class="token punctuation">.</span>dirty<span class="token punctuation">)</span><span class="token punctuation">;</span>
    <span class="token function">run_all</span><span class="token punctuation">(</span>$$<span class="token punctuation">.</span>before_update<span class="token punctuation">)</span><span class="token punctuation">;</span>
    <span class="token comment">// calls the &#96;p&#96; function</span>
    <span class="token comment">// highlight-next-line</span>
    $$<span class="token punctuation">.</span>fragment <span class="token operator">&amp;&amp;</span> $$<span class="token punctuation">.</span>fragment<span class="token punctuation">.</span><span class="token function">p</span><span class="token punctuation">(</span>$$<span class="token punctuation">.</span>dirty<span class="token punctuation">,</span> $$<span class="token punctuation">.</span>ctx<span class="token punctuation">)</span><span class="token punctuation">;</span>
    <span class="token comment">// resets &#96;$$.dirty&#96;</span>
    $$<span class="token punctuation">.</span>dirty <span class="token operator">=</span> <span class="token keyword">null</span><span class="token punctuation">;</span>

    $$<span class="token punctuation">.</span>after_update<span class="token punctuation">.</span><span class="token function">forEach</span><span class="token punctuation">(</span>add_render_callback<span class="token punctuation">)</span><span class="token punctuation">;</span>
  <span class="token punctuation">&#125;</span>
<span class="token punctuation">&#125;</span></code>` + "";

	let t238;
	let p38;
	let a40;
	let t239;
	let t240;
	let p39;
	let t241;
	let t242;
	let pre13;

	let raw13_value = `
<code class="language-svelte">&lt;script&gt;
  let givenName, familyName;
  function update() &#123;
    givenName = &#39;Li Hau&#39;;
    familyName = &#39;Tan&#39;;
  &#125;
&lt;/script&gt;
Name: &#123;familyName&#125; &#123;givenName&#125;

&lt;button on:click=&#123;update&#125;&gt;Update&lt;/button&gt;</code>` + "";

	let t243;
	let p40;
	let a41;
	let t244;
	let t245;
	let p41;
	let t246;
	let code40;
	let t247;
	let t248;
	let code41;
	let t249;
	let t250;
	let t251;
	let ol1;
	let li31;
	let t252;
	let strong5;
	let t253;
	let t254;
	let code42;
	let t255;
	let t256;
	let t257;
	let li32;
	let code43;
	let t258;
	let t259;
	let li33;
	let t260;
	let code44;
	let t261;
	let t262;
	let code45;
	let t263;
	let t264;
	let li34;
	let t265;
	let code46;
	let t266;
	let t267;
	let li35;
	let t268;
	let code47;
	let t269;
	let t270;
	let t271;
	let li36;
	let code48;
	let t272;
	let t273;
	let li37;
	let t274;
	let code49;
	let t275;
	let t276;
	let code50;
	let t277;
	let t278;
	let li38;
	let t279;
	let code51;
	let t280;
	let t281;
	let li39;
	let t282;
	let code52;
	let t283;
	let t284;
	let t285;
	let li40;
	let strong6;
	let t286;
	let t287;
	let li41;
	let strong7;
	let t288;
	let t289;
	let li42;
	let code53;
	let t290;
	let t291;
	let code54;
	let t292;
	let t293;
	let t294;
	let li45;
	let t295;
	let code55;
	let t296;
	let t297;
	let ul11;
	let li43;
	let code56;
	let t298;
	let t299;
	let code57;
	let t300;
	let t301;
	let li44;
	let code58;
	let t302;
	let t303;
	let code59;
	let t304;
	let t305;
	let li48;
	let t306;
	let code60;
	let t307;
	let t308;
	let ul12;
	let li46;
	let t309;
	let code61;
	let t310;
	let t311;
	let code62;
	let t312;
	let t313;
	let li47;
	let t314;
	let code63;
	let t315;
	let t316;
	let code64;
	let t317;
	let t318;
	let li49;
	let t319;
	let code65;
	let t320;
	let t321;
	let code66;
	let t322;
	let t323;
	let li50;
	let t324;
	let t325;
	let li51;
	let strong8;
	let t326;
	let t327;
	let section6;
	let h40;
	let a42;
	let t328;
	let t329;
	let ul13;
	let li52;
	let t330;
	let code67;
	let t331;
	let t332;
	let code68;
	let t333;
	let t334;
	let code69;
	let t335;
	let t336;
	let t337;
	let li53;
	let t338;
	let t339;
	let li54;
	let t340;
	let code70;
	let t341;
	let t342;
	let t343;
	let li55;
	let t344;
	let code71;
	let t345;
	let t346;
	let code72;
	let t347;
	let t348;
	let t349;
	let section7;
	let h21;
	let a43;
	let t350;
	let t351;
	let p42;
	let t352;
	let a44;
	let t353;
	let t354;
	let strong9;
	let t355;
	let t356;
	let t357;
	let p43;
	let t358;
	let t359;
	let pre14;

	let raw14_value = `
<code class="language-js">$$<span class="token punctuation">.</span>diry <span class="token operator">=</span> <span class="token punctuation">&#123;</span> givenName<span class="token punctuation">:</span> <span class="token boolean">true</span><span class="token punctuation">,</span> familyName<span class="token punctuation">:</span> <span class="token boolean">true</span> <span class="token punctuation">&#125;</span><span class="token punctuation">;</span></code>` + "";

	let t360;
	let p44;
	let t361;
	let t362;
	let pre15;

	let raw15_value = `
<code class="language-js">givenName <span class="token operator">-</span><span class="token operator">></span> <span class="token number">0</span>
familyName <span class="token operator">-</span><span class="token operator">></span> <span class="token number">1</span></code>` + "";

	let t363;
	let p45;
	let t364;
	let a45;
	let t365;
	let t366;
	let t367;
	let pre16;

	let raw16_value = `
<code class="language-js">$$<span class="token punctuation">.</span>dirty <span class="token operator">=</span> <span class="token punctuation">[</span><span class="token number">0b0000_0011</span><span class="token punctuation">]</span><span class="token punctuation">;</span>
<span class="token comment">// the 0th and 1st bit marked true</span></code>` + "";

	let t368;
	let p46;
	let t369;
	let t370;
	let section8;
	let h34;
	let a46;
	let t371;
	let t372;
	let p47;
	let t373;
	let t374;
	let p48;
	let t375;
	let a47;
	let t376;
	let t377;
	let a48;
	let t378;
	let t379;
	let t380;
	let p49;
	let t381;
	let code73;
	let t382;
	let t383;
	let code74;
	let t384;
	let t385;
	let code75;
	let t386;
	let t387;
	let code76;
	let t388;
	let t389;
	let code77;
	let t390;
	let t391;
	let code78;
	let t392;
	let t393;
	let t394;
	let p50;
	let t395;
	let strong10;
	let t396;
	let t397;
	let code79;
	let t398;
	let t399;
	let t400;
	let p51;
	let t401;
	let strong11;
	let t402;
	let t403;
	let code80;
	let t404;
	let t405;
	let code81;
	let t406;
	let t407;
	let a49;
	let t408;
	let t409;
	let a50;
	let t410;
	let t411;
	let t412;
	let p52;
	let strong12;
	let t413;
	let t414;
	let p53;
	let t415;
	let t416;
	let p54;
	let t417;
	let a51;
	let t418;
	let t419;
	let a52;
	let t420;
	let t421;
	let t422;
	let p55;
	let t423;
	let a53;
	let t424;
	let t425;
	let t426;
	let pre17;

	let raw17_value = `
<code class="language-js"><span class="token comment">// set 1st boolean to true</span>
<span class="token number">0b0101</span> <span class="token operator">|</span> <span class="token number">0b0010</span> <span class="token operator">=</span> <span class="token number">0b0111</span><span class="token punctuation">;</span>

<span class="token comment">// set 2nd boolean to false</span>
<span class="token number">0b0101</span> <span class="token operator">&amp;</span> <span class="token number">0b1011</span> <span class="token operator">=</span> <span class="token number">0b0001</span><span class="token punctuation">;</span>

<span class="token comment">// is 2nd boolean true?</span>
<span class="token punctuation">(</span><span class="token punctuation">(</span><span class="token number">0b0101</span> <span class="token operator">&amp;</span> <span class="token number">0b0100</span><span class="token punctuation">)</span> <span class="token operator">></span> <span class="token number">0</span><span class="token punctuation">)</span> <span class="token operator">===</span> <span class="token boolean">true</span><span class="token punctuation">;</span>

<span class="token comment">// NOTE: You can test multiple boolean values at once</span>
<span class="token comment">// is 2nd and 3rd boolean true?</span>
<span class="token punctuation">(</span><span class="token punctuation">(</span><span class="token number">0b0101</span> <span class="token operator">&amp;</span> <span class="token number">0b1100</span><span class="token punctuation">)</span> <span class="token operator">></span> <span class="token number">0</span><span class="token punctuation">)</span> <span class="token operator">===</span> <span class="token boolean">true</span><span class="token punctuation">;</span></code>` + "";

	let t427;
	let p56;
	let t428;
	let a54;
	let t429;
	let t430;
	let t431;
	let p57;
	let t432;
	let strong13;
	let t433;
	let t434;
	let t435;
	let section9;
	let h35;
	let a55;
	let t436;
	let t437;
	let p58;
	let t438;
	let t439;
	let pre18;

	let raw18_value = `
<code class="language-js">givenName <span class="token operator">-</span><span class="token operator">></span> <span class="token number">0</span>
firstName <span class="token operator">-</span><span class="token operator">></span> <span class="token number">1</span></code>` + "";

	let t440;
	let p59;
	let t441;
	let t442;
	let pre19;

	let raw19_value = `
<code class="language-js"><span class="token comment">// Previous</span>
<span class="token keyword">function</span> <span class="token function">instance</span><span class="token punctuation">(</span><span class="token parameter">$$self<span class="token punctuation">,</span> $$props<span class="token punctuation">,</span> $$invalidate</span><span class="token punctuation">)</span> <span class="token punctuation">&#123;</span>
  <span class="token comment">// ...</span>
  <span class="token comment">// highlight-next-line</span>
  <span class="token keyword">return</span> <span class="token punctuation">&#123;</span> givenName<span class="token punctuation">,</span> familyName <span class="token punctuation">&#125;</span><span class="token punctuation">;</span>
<span class="token punctuation">&#125;</span>
<span class="token comment">// Now</span>
<span class="token keyword">function</span> <span class="token function">instance</span><span class="token punctuation">(</span><span class="token parameter">$$self<span class="token punctuation">,</span> $$props<span class="token punctuation">,</span> $$invalidate</span><span class="token punctuation">)</span> <span class="token punctuation">&#123;</span>
  <span class="token comment">// ...</span>
  <span class="token comment">// highlight-next-line</span>
  <span class="token keyword">return</span> <span class="token punctuation">[</span>givenName<span class="token punctuation">,</span> familyName<span class="token punctuation">]</span><span class="token punctuation">;</span>
<span class="token punctuation">&#125;</span></code>` + "";

	let t443;
	let p60;
	let t444;
	let strong14;
	let t445;
	let t446;
	let code82;
	let t447;
	let t448;
	let strong15;
	let t449;
	let t450;
	let t451;
	let pre20;

	let raw20_value = `
<code class="language-js"><span class="token comment">// Previous</span>
$$<span class="token punctuation">.</span>ctx<span class="token punctuation">.</span>givenName <span class="token operator">+</span> $$<span class="token punctuation">.</span>ctx<span class="token punctuation">.</span>familyName<span class="token punctuation">;</span>
<span class="token comment">// Now</span>
$$<span class="token punctuation">.</span>ctx<span class="token punctuation">[</span><span class="token number">0</span><span class="token punctuation">]</span> <span class="token operator">+</span> $$<span class="token punctuation">.</span>ctx<span class="token punctuation">[</span><span class="token number">1</span><span class="token punctuation">]</span><span class="token punctuation">;</span></code>` + "";

	let t452;
	let p61;
	let t453;
	let code83;
	let t454;
	let t455;
	let strong16;
	let t456;
	let t457;
	let strong17;
	let t458;
	let t459;
	let t460;
	let pre21;

	let raw21_value = `
<code class="language-js"><span class="token comment">// Previous</span>
<span class="token function">$$invalidate</span><span class="token punctuation">(</span><span class="token string">'givenName'</span><span class="token punctuation">,</span> <span class="token punctuation">(</span>givenName <span class="token operator">=</span> <span class="token string">'Li Hau'</span><span class="token punctuation">)</span><span class="token punctuation">)</span><span class="token punctuation">;</span>
<span class="token comment">// Now</span>
<span class="token function">$$invalidate</span><span class="token punctuation">(</span><span class="token number">0</span><span class="token punctuation">,</span> <span class="token punctuation">(</span>givenName <span class="token operator">=</span> <span class="token string">'Li Hau'</span><span class="token punctuation">)</span><span class="token punctuation">)</span><span class="token punctuation">;</span></code>` + "";

	let t461;
	let p62;
	let code84;
	let t462;
	let t463;
	let t464;
	let p63;
	let t465;
	let t466;
	let pre22;

	let raw22_value = `
<code class="language-js"><span class="token comment">// Previous</span>
$$<span class="token punctuation">.</span>dirty<span class="token punctuation">[</span><span class="token string">'givenName'</span><span class="token punctuation">]</span> <span class="token operator">=</span> <span class="token boolean">true</span><span class="token punctuation">;</span>
<span class="token comment">// Now</span>
$$<span class="token punctuation">.</span>dirty<span class="token punctuation">[</span><span class="token number">0</span><span class="token punctuation">]</span> <span class="token operator">|=</span> <span class="token number">1</span> <span class="token operator">&lt;&lt;</span> <span class="token number">0</span><span class="token punctuation">;</span></code>` + "";

	let t467;
	let p64;
	let t468;
	let t469;
	let pre23;

	let raw23_value = `
<code class="language-js"><span class="token comment">// Previous</span>
<span class="token keyword">if</span> <span class="token punctuation">(</span>$dirty<span class="token punctuation">.</span>givenName<span class="token punctuation">)</span> <span class="token punctuation">&#123;</span> <span class="token comment">/* ... */</span> <span class="token punctuation">&#125;</span>
<span class="token keyword">if</span> <span class="token punctuation">(</span>$dirty<span class="token punctuation">.</span>givenName <span class="token operator">&amp;&amp;</span> $dirty<span class="token punctuation">.</span>familyName<span class="token punctuation">)</span> <span class="token punctuation">&#123;</span> <span class="token comment">/* ... */</span> <span class="token punctuation">&#125;</span>

<span class="token comment">// Now</span>
<span class="token keyword">if</span> <span class="token punctuation">(</span>$dirty<span class="token punctuation">[</span><span class="token number">0</span><span class="token punctuation">]</span> <span class="token operator">&amp;</span> <span class="token number">1</span><span class="token punctuation">)</span> <span class="token punctuation">&#123;</span> <span class="token comment">/* ... */</span> <span class="token punctuation">&#125;</span>
<span class="token keyword">if</span> <span class="token punctuation">(</span>$dirty<span class="token punctuation">[</span><span class="token number">0</span><span class="token punctuation">]</span> <span class="token operator">&amp;</span> <span class="token number">3</span><span class="token punctuation">)</span> <span class="token punctuation">&#123;</span> <span class="token comment">/* ... */</span> <span class="token punctuation">&#125;</span></code>` + "";

	let t470;
	let p65;
	let t471;
	let code85;
	let t472;
	let t473;
	let code86;
	let t474;
	let t475;
	let code87;
	let t476;
	let t477;
	let t478;
	let p66;
	let strong18;
	let t479;
	let t480;
	let code88;
	let t481;
	let t482;
	let code89;
	let t483;
	let t484;
	let code90;
	let t485;
	let t486;
	let t487;
	let section10;
	let h41;
	let a56;
	let t488;
	let strong19;
	let t489;
	let t490;
	let p67;
	let t491;
	let code91;
	let t492;
	let t493;
	let strong20;
	let t494;
	let t495;
	let code92;
	let t496;
	let t497;
	let t498;
	let pre24;

	let raw24_value = `
<code class="language-js"><span class="token comment">// If less than 32 variables,</span>
<span class="token comment">// Instead of having &#96;dirty[0]&#96; all the time,</span>
p<span class="token punctuation">:</span> <span class="token punctuation">(</span>ctx<span class="token punctuation">,</span> dirty<span class="token punctuation">)</span> <span class="token punctuation">&#123;</span>
  <span class="token keyword">if</span> <span class="token punctuation">(</span>dirty<span class="token punctuation">[</span><span class="token number">0</span><span class="token punctuation">]</span> <span class="token operator">&amp;</span> <span class="token number">1</span><span class="token punctuation">)</span> <span class="token punctuation">&#123;</span> <span class="token comment">/* ... */</span> <span class="token punctuation">&#125;</span>
  <span class="token keyword">if</span> <span class="token punctuation">(</span>dirty<span class="token punctuation">[</span><span class="token number">0</span><span class="token punctuation">]</span> <span class="token operator">&amp;</span> <span class="token number">3</span><span class="token punctuation">)</span> <span class="token punctuation">&#123;</span> <span class="token comment">/* ... */</span> <span class="token punctuation">&#125;</span>
<span class="token punctuation">&#125;</span>
<span class="token comment">// Svelte optimises the compiled code by </span>
<span class="token comment">// destruct the array in the arguments</span>
p<span class="token punctuation">:</span> <span class="token punctuation">(</span>ctx<span class="token punctuation">,</span> <span class="token punctuation">[</span>dirty<span class="token punctuation">]</span><span class="token punctuation">)</span> <span class="token punctuation">&#123;</span>
  <span class="token keyword">if</span> <span class="token punctuation">(</span>dirty <span class="token operator">&amp;</span> <span class="token number">1</span><span class="token punctuation">)</span> <span class="token punctuation">&#123;</span> <span class="token comment">/* ... */</span> <span class="token punctuation">&#125;</span>
  <span class="token keyword">if</span> <span class="token punctuation">(</span>dirty <span class="token operator">&amp;</span> <span class="token number">3</span><span class="token punctuation">)</span> <span class="token punctuation">&#123;</span> <span class="token comment">/* ... */</span> <span class="token punctuation">&#125;</span>
<span class="token punctuation">&#125;</span>

<span class="token comment">// If more than or equal to 32 variables</span>
p<span class="token punctuation">:</span> <span class="token punctuation">(</span>ctx<span class="token punctuation">,</span> dirty<span class="token punctuation">)</span> <span class="token punctuation">&#123;</span>
  <span class="token keyword">if</span> <span class="token punctuation">(</span>dirty<span class="token punctuation">[</span><span class="token number">0</span><span class="token punctuation">]</span> <span class="token operator">&amp;</span> <span class="token number">1</span><span class="token punctuation">)</span> <span class="token punctuation">&#123;</span> <span class="token comment">/* ... */</span> <span class="token punctuation">&#125;</span>
  <span class="token keyword">if</span> <span class="token punctuation">(</span>dirty<span class="token punctuation">[</span><span class="token number">1</span><span class="token punctuation">]</span> <span class="token operator">&amp;</span> <span class="token number">3</span><span class="token punctuation">)</span> <span class="token punctuation">&#123;</span> <span class="token comment">/* ... */</span> <span class="token punctuation">&#125;</span>
<span class="token punctuation">&#125;</span></code>` + "";

	let t499;
	let section11;
	let h42;
	let a57;
	let t500;
	let t501;
	let ul14;
	let li56;
	let t502;
	let code93;
	let t503;
	let t504;
	let code94;
	let t505;
	let t506;
	let t507;
	let li57;
	let t508;
	let t509;
	let section12;
	let h22;
	let a58;
	let t510;
	let t511;
	let p68;
	let t512;
	let a59;
	let t513;
	let t514;
	let code95;
	let t515;
	let t516;
	let pre25;

	let raw25_value = `
<code class="language-svelte">&lt;script&gt;
  export let count = 0;
  // &#96;doubled&#96;, &#96;tripled&#96;, &#96;quadrupled&#96; are reactive
  // highlight-start
  $: doubled = count * 2;
  $: tripled = count * 3;
  $: quadrupled = doubled * 2;
  // highlight-end
&lt;/script&gt;

&#123;doubled&#125; &#123;tripled&#125; &#123;quadrupled&#125;</code>` + "";

	let t517;
	let p69;
	let a60;
	let t518;
	let t519;
	let p70;
	let t520;
	let a61;
	let code96;
	let t521;
	let t522;
	let t523;
	let t524;
	let pre26;

	let raw26_value = `
<code class="language-js"><span class="token keyword">function</span> <span class="token function">instance</span><span class="token punctuation">(</span><span class="token parameter">$$self<span class="token punctuation">,</span> $$props<span class="token punctuation">,</span> $$invalidate</span><span class="token punctuation">)</span> <span class="token punctuation">&#123;</span>
  <span class="token comment">// ...</span>

  <span class="token comment">// highlight-start</span>
	$$self<span class="token punctuation">.</span>$$<span class="token punctuation">.</span><span class="token function-variable function">update</span> <span class="token operator">=</span> <span class="token punctuation">(</span><span class="token punctuation">)</span> <span class="token operator">=></span> <span class="token punctuation">&#123;</span>
		<span class="token keyword">if</span> <span class="token punctuation">(</span>$$self<span class="token punctuation">.</span>$$<span class="token punctuation">.</span>dirty <span class="token operator">&amp;</span> <span class="token comment">/*count*/</span> <span class="token number">8</span><span class="token punctuation">)</span> <span class="token punctuation">&#123;</span>
			$<span class="token punctuation">:</span> <span class="token function">$$invalidate</span><span class="token punctuation">(</span><span class="token number">0</span><span class="token punctuation">,</span> doubled <span class="token operator">=</span> count <span class="token operator">*</span> <span class="token number">2</span><span class="token punctuation">)</span><span class="token punctuation">;</span>
		<span class="token punctuation">&#125;</span>

		<span class="token keyword">if</span> <span class="token punctuation">(</span>$$self<span class="token punctuation">.</span>$$<span class="token punctuation">.</span>dirty <span class="token operator">&amp;</span> <span class="token comment">/*count*/</span> <span class="token number">8</span><span class="token punctuation">)</span> <span class="token punctuation">&#123;</span>
			$<span class="token punctuation">:</span> <span class="token function">$$invalidate</span><span class="token punctuation">(</span><span class="token number">1</span><span class="token punctuation">,</span> tripled <span class="token operator">=</span> count <span class="token operator">*</span> <span class="token number">3</span><span class="token punctuation">)</span><span class="token punctuation">;</span>
		<span class="token punctuation">&#125;</span>

		<span class="token keyword">if</span> <span class="token punctuation">(</span>$$self<span class="token punctuation">.</span>$$<span class="token punctuation">.</span>dirty <span class="token operator">&amp;</span> <span class="token comment">/*doubled*/</span> <span class="token number">1</span><span class="token punctuation">)</span> <span class="token punctuation">&#123;</span>
			$<span class="token punctuation">:</span> <span class="token function">$$invalidate</span><span class="token punctuation">(</span><span class="token number">2</span><span class="token punctuation">,</span> quadrupled <span class="token operator">=</span> doubled <span class="token operator">*</span> <span class="token number">2</span><span class="token punctuation">)</span><span class="token punctuation">;</span>
		<span class="token punctuation">&#125;</span>
  <span class="token punctuation">&#125;</span><span class="token punctuation">;</span>
  <span class="token comment">// highlight-end</span>

	<span class="token keyword">return</span> <span class="token punctuation">[</span>doubled<span class="token punctuation">,</span> tripled<span class="token punctuation">,</span> quadrupled<span class="token punctuation">,</span> count<span class="token punctuation">]</span><span class="token punctuation">;</span>
<span class="token punctuation">&#125;</span></code>` + "";

	let t525;
	let p71;
	let t526;
	let t527;
	let pre27;

	let raw27_value = `
<code class="language-svelte">&lt;script&gt;
  export let count = 0;
  // NOTE: move &#96;quadrupled&#96; before &#96;doubled&#96;
  // highlight-start
  $: quadrupled = doubled * 2;
  $: doubled = count * 2;
  // highlight-end
  $: tripled = count * 3;
&lt;/script&gt;</code>` + "";

	let t528;
	let p72;
	let a62;
	let t529;
	let t530;
	let pre28;

	let raw28_value = `
<code class="language-js"><span class="token keyword">function</span> <span class="token function">instance</span><span class="token punctuation">(</span><span class="token parameter">$$self<span class="token punctuation">,</span> $$props<span class="token punctuation">,</span> $$invalidate</span><span class="token punctuation">)</span> <span class="token punctuation">&#123;</span>
	<span class="token comment">// ...</span>

	$$self<span class="token punctuation">.</span>$$<span class="token punctuation">.</span><span class="token function-variable function">update</span> <span class="token operator">=</span> <span class="token punctuation">(</span><span class="token punctuation">)</span> <span class="token operator">=></span> <span class="token punctuation">&#123;</span>
		<span class="token comment">// NOTE: &#96;quadrupled&#96; invalidates after &#96;doubled&#96;</span>
		<span class="token comment">// highlight-start</span>
		<span class="token keyword">if</span> <span class="token punctuation">(</span>$$self<span class="token punctuation">.</span>$$<span class="token punctuation">.</span>dirty <span class="token operator">&amp;</span> <span class="token comment">/*count*/</span> <span class="token number">8</span><span class="token punctuation">)</span> <span class="token punctuation">&#123;</span>
			$<span class="token punctuation">:</span> <span class="token function">$$invalidate</span><span class="token punctuation">(</span><span class="token number">1</span><span class="token punctuation">,</span> <span class="token punctuation">(</span>doubled <span class="token operator">=</span> count <span class="token operator">*</span> <span class="token number">2</span><span class="token punctuation">)</span><span class="token punctuation">)</span><span class="token punctuation">;</span>
		<span class="token punctuation">&#125;</span>

		<span class="token keyword">if</span> <span class="token punctuation">(</span>$$self<span class="token punctuation">.</span>$$<span class="token punctuation">.</span>dirty <span class="token operator">&amp;</span> <span class="token comment">/*doubled*/</span> <span class="token number">2</span><span class="token punctuation">)</span> <span class="token punctuation">&#123;</span>
			$<span class="token punctuation">:</span> <span class="token function">$$invalidate</span><span class="token punctuation">(</span><span class="token number">0</span><span class="token punctuation">,</span> <span class="token punctuation">(</span>quadrupled <span class="token operator">=</span> doubled <span class="token operator">*</span> <span class="token number">2</span><span class="token punctuation">)</span><span class="token punctuation">)</span><span class="token punctuation">;</span>
		<span class="token punctuation">&#125;</span>
		<span class="token comment">// highlight-end</span>

		<span class="token keyword">if</span> <span class="token punctuation">(</span>$$self<span class="token punctuation">.</span>$$<span class="token punctuation">.</span>dirty <span class="token operator">&amp;</span> <span class="token comment">/*count*/</span> <span class="token number">8</span><span class="token punctuation">)</span> <span class="token punctuation">&#123;</span>
			$<span class="token punctuation">:</span> <span class="token function">$$invalidate</span><span class="token punctuation">(</span><span class="token number">2</span><span class="token punctuation">,</span> <span class="token punctuation">(</span>tripled <span class="token operator">=</span> count <span class="token operator">*</span> <span class="token number">3</span><span class="token punctuation">)</span><span class="token punctuation">)</span><span class="token punctuation">;</span>
		<span class="token punctuation">&#125;</span>
	<span class="token punctuation">&#125;</span><span class="token punctuation">;</span>

	<span class="token keyword">return</span> <span class="token punctuation">[</span>doubled<span class="token punctuation">,</span> tripled<span class="token punctuation">,</span> quadrupled<span class="token punctuation">,</span> count<span class="token punctuation">]</span><span class="token punctuation">;</span>
<span class="token punctuation">&#125;</span></code>` + "";

	let t531;
	let p73;
	let t532;
	let t533;
	let ul17;
	let li59;
	let t534;
	let code97;
	let t535;
	let t536;
	let ul15;
	let li58;
	let code98;
	let t537;
	let t538;
	let a63;
	let t539;
	let t540;
	let a64;
	let t541;
	let t542;
	let t543;
	let li60;
	let t544;
	let code99;
	let t545;
	let t546;
	let t547;
	let li62;
	let t548;
	let ul16;
	let li61;
	let code100;
	let t549;
	let t550;
	let code101;
	let t551;
	let t552;
	let code102;
	let t553;
	let t554;
	let code103;
	let t555;
	let t556;
	let code104;
	let t557;
	let t558;
	let t559;
	let p74;
	let t560;
	let code105;
	let t561;
	let t562;
	let t563;
	let p75;
	let t564;
	let t565;
	let pre29;

	let raw29_value = `
<code class="language-svelte">&lt;script&gt;
// NOTE: use &#96;count&#96; in a reactive declaration before &#96;count&#96; is declared
$: doubled = count * 2;
let count = 1;
&lt;/script&gt;

&#123;count&#125; * 2 = &#123;doubled&#125;</code>` + "";

	let t566;
	let p76;
	let a65;
	let t567;
	let t568;
	let p77;
	let strong21;
	let t569;
	let code106;
	let t570;
	let t571;
	let t572;
	let p78;
	let t573;
	let code107;
	let t574;
	let t575;
	let code108;
	let t576;
	let t577;
	let t578;
	let p79;
	let t579;
	let code109;
	let t580;
	let t581;
	let t582;
	let pre30;

	let raw30_value = `
<code class="language-js"><span class="token comment">// src/runtime/internal/scheduler.ts</span>
<span class="token keyword">function</span> <span class="token function">update</span><span class="token punctuation">(</span><span class="token parameter">$$</span><span class="token punctuation">)</span> <span class="token punctuation">&#123;</span>
  <span class="token keyword">if</span> <span class="token punctuation">(</span>$$<span class="token punctuation">.</span>fragment <span class="token operator">!==</span> <span class="token keyword">null</span><span class="token punctuation">)</span> <span class="token punctuation">&#123;</span>
    <span class="token comment">// NOTE: this is important now!</span>
    <span class="token comment">// highlight-next-line</span>
    $$<span class="token punctuation">.</span><span class="token function">update</span><span class="token punctuation">(</span>$$<span class="token punctuation">.</span>dirty<span class="token punctuation">)</span><span class="token punctuation">;</span>
    <span class="token function">run_all</span><span class="token punctuation">(</span>$$<span class="token punctuation">.</span>before_update<span class="token punctuation">)</span><span class="token punctuation">;</span>
    <span class="token comment">// calls the &#96;p&#96; function</span>
    $$<span class="token punctuation">.</span>fragment <span class="token operator">&amp;&amp;</span> $$<span class="token punctuation">.</span>fragment<span class="token punctuation">.</span><span class="token function">p</span><span class="token punctuation">(</span>$$<span class="token punctuation">.</span>dirty<span class="token punctuation">,</span> $$<span class="token punctuation">.</span>ctx<span class="token punctuation">)</span><span class="token punctuation">;</span>
    <span class="token comment">// ...</span>
  <span class="token punctuation">&#125;</span>
<span class="token punctuation">&#125;</span></code>` + "";

	let t583;
	let p80;
	let t584;
	let code110;
	let t585;
	let t586;
	let strong22;
	let t587;
	let t588;
	let code111;
	let t589;
	let t590;
	let t591;
	let p81;
	let t592;
	let t593;
	let section13;
	let h43;
	let a66;
	let t594;
	let t595;
	let p82;
	let t596;
	let t597;
	let pre31;

	let raw31_value = `
<code class="language-svelte">&lt;script&gt;
  let givenName = &#39;&#39;, familyName = &#39;&#39;;
  function update() &#123;
    givenName = &#39;Li Hau&#39;;
    familyName = &#39;Tan&#39;;
  &#125;
  $: name = givenName + &quot; &quot; + familyName;
  $: console.log(&#39;name&#39;, name);
&lt;/script&gt;</code>` + "";

	let t598;
	let p83;
	let a67;
	let t599;
	let t600;
	let p84;
	let t601;
	let code112;
	let t602;
	let t603;
	let t604;
	let ol2;
	let li63;
	let t605;
	let a68;
	let t606;
	let t607;
	let code113;
	let t608;
	let t609;
	let strong23;
	let t610;
	let t611;
	let strong24;
	let t612;
	let t613;
	let t614;
	let li64;
	let strong25;
	let t615;
	let t616;
	let li65;
	let strong26;
	let t617;
	let t618;
	let li66;
	let code114;
	let t619;
	let t620;
	let code115;
	let t621;
	let t622;
	let t623;
	let li69;
	let t624;
	let code116;
	let t625;
	let ul18;
	let li67;
	let t626;
	let strong27;
	let t627;
	let t628;
	let strong28;
	let t629;
	let t630;
	let code117;
	let t631;
	let t632;
	let strong29;
	let t633;
	let t634;
	let li68;
	let t635;
	let strong30;
	let t636;
	let t637;
	let code118;
	let t638;
	let t639;
	let li70;
	let t640;
	let code119;
	let t641;
	let t642;
	let t643;
	let p85;
	let t644;
	let code120;
	let t645;
	let t646;
	let code121;
	let t647;
	let t648;
	let code122;
	let t649;
	let t650;
	let code123;
	let t651;
	let t652;
	let strong31;
	let t653;
	let t654;
	let t655;
	let pre32;

	let raw32_value = `
<code class="language-js"><span class="token comment">// Instead of</span>
<span class="token comment">// #1 &#96;givenName = 'Li Hau'</span>
name <span class="token operator">=</span> <span class="token string">'Li Hau'</span> <span class="token operator">+</span> <span class="token string">' '</span> <span class="token operator">+</span> <span class="token string">''</span><span class="token punctuation">;</span>
console<span class="token punctuation">.</span><span class="token function">log</span><span class="token punctuation">(</span><span class="token string">'Li Hau '</span><span class="token punctuation">)</span><span class="token punctuation">;</span>
<span class="token comment">// #2 &#96;familyName = 'Tan'</span>
name <span class="token operator">=</span> <span class="token string">'Li Hau'</span> <span class="token operator">+</span> <span class="token string">' '</span> <span class="token operator">+</span> <span class="token string">'Tan'</span><span class="token punctuation">;</span>
console<span class="token punctuation">.</span><span class="token function">log</span><span class="token punctuation">(</span><span class="token string">'Li Hau Tan'</span><span class="token punctuation">)</span><span class="token punctuation">;</span>

<span class="token comment">// Reactive declarations and statements are batched</span>
<span class="token comment">// #1 &#96;givenName = 'Li Hau'</span>
<span class="token comment">// #2 &#96;familyName = 'Tan'</span>
name <span class="token operator">=</span> <span class="token string">'Li Hau'</span> <span class="token operator">+</span> <span class="token string">' '</span> <span class="token operator">+</span> <span class="token string">'Tan'</span><span class="token punctuation">;</span>
console<span class="token punctuation">.</span><span class="token function">log</span><span class="token punctuation">(</span><span class="token string">'Li Hau Tan'</span><span class="token punctuation">)</span><span class="token punctuation">;</span></code>` + "";

	let t656;
	let section14;
	let h44;
	let a69;
	let t657;
	let t658;
	let p86;
	let t659;
	let t660;
	let pre33;

	let raw33_value = `
<code class="language-svelte">&lt;script&gt;
  let givenName = &#39;&#39;, familyName = &#39;&#39;;
  function update() &#123;
    givenName = &#39;Li Hau&#39;;
    familyName = &#39;Tan&#39;;
    // highlight-next-line
    console.log(&#39;name&#39;, name); // Logs &#39;&#39;
  &#125;
  $: name = givenName + &quot; &quot; + familyName;
&lt;/script&gt;</code>` + "";

	let t661;
	let p87;
	let a70;
	let t662;
	let t663;
	let p88;
	let t664;
	let strong32;
	let t665;
	let t666;
	let t667;
	let pre34;

	let raw34_value = `
<code class="language-svelte">&lt;script&gt;
  let givenName = &#39;&#39;, familyName = &#39;&#39;;
  function update() &#123;
    givenName = &#39;Li Hau&#39;;
    familyName = &#39;Tan&#39;;
  &#125;
  $: name = givenName + &quot; &quot; + familyName;
  // highlight-next-line
  $: console.log(&#39;name&#39;, name); // Logs &#39;Li Hau Tan&#39;
&lt;/script&gt;</code>` + "";

	let t668;
	let section15;
	let h36;
	let a71;
	let t669;
	let t670;
	let p89;
	let t671;
	let t672;
	let p90;
	let t673;
	let strong33;
	let t674;
	let t675;
	let t676;
	let pre35;

	let raw35_value = `
<code class="language-js"><span class="token keyword">let</span> count <span class="token operator">=</span> <span class="token number">0</span><span class="token punctuation">;</span>
<span class="token comment">// NOTE: refers to &#96;doubled&#96;</span>
$<span class="token punctuation">:</span> quadrupled <span class="token operator">=</span> doubled <span class="token operator">*</span> <span class="token number">2</span><span class="token punctuation">;</span>
<span class="token comment">// NOTE: defined &#96;doubled&#96;</span>
$<span class="token punctuation">:</span> doubled <span class="token operator">=</span> count <span class="token operator">*</span> <span class="token number">2</span><span class="token punctuation">;</span>

<span class="token comment">// compiles into:</span>

$$self<span class="token punctuation">.</span>$$<span class="token punctuation">.</span><span class="token function-variable function">update</span> <span class="token operator">=</span> <span class="token punctuation">(</span><span class="token punctuation">)</span> <span class="token operator">=></span> <span class="token punctuation">&#123;</span>
  <span class="token comment">// ...</span>
  $<span class="token punctuation">:</span> <span class="token function">$$invalidate</span><span class="token punctuation">(</span><span class="token comment">/* doubled */</span><span class="token punctuation">,</span> doubled <span class="token operator">=</span> count <span class="token operator">*</span> <span class="token number">2</span><span class="token punctuation">)</span><span class="token punctuation">;</span>
  $<span class="token punctuation">:</span> <span class="token function">$$invalidate</span><span class="token punctuation">(</span><span class="token comment">/* quadrupled */</span><span class="token punctuation">,</span> quadrupled <span class="token operator">=</span> doubled <span class="token operator">*</span> <span class="token number">2</span><span class="token punctuation">)</span><span class="token punctuation">;</span>
  <span class="token comment">// ...</span>
<span class="token punctuation">&#125;</span></code>` + "";

	let t677;
	let section16;
	let h37;
	let a72;
	let t678;
	let t679;
	let p91;
	let t680;
	let code124;
	let t681;
	let t682;
	let t683;
	let p92;
	let t684;
	let code125;
	let t685;
	let t686;
	let t687;
	let p93;
	let t688;
	let t689;
	let pre36;

	let raw36_value = `
<code class="language-svelte">&lt;script&gt;
  let count = 0;
  $: doubled = count * 2;
&lt;/script&gt;
&#123; count &#125; x 2 = &#123;doubled&#125;</code>` + "";

	let t690;
	let p94;
	let a73;
	let t691;
	let t692;
	let p95;
	let t693;
	let code126;
	let t694;
	let t695;
	let code127;
	let t696;
	let t697;
	let t698;
	let pre37;

	let raw37_value = `
<code class="language-js"><span class="token comment">// ...</span>
<span class="token keyword">function</span> <span class="token function">instance</span><span class="token punctuation">(</span><span class="token parameter">$$self<span class="token punctuation">,</span> $$props<span class="token punctuation">,</span> $$invalidate</span><span class="token punctuation">)</span> <span class="token punctuation">&#123;</span>
  <span class="token keyword">let</span> doubled<span class="token punctuation">;</span>
  $<span class="token punctuation">:</span> <span class="token function">$$invalidate</span><span class="token punctuation">(</span><span class="token number">0</span><span class="token punctuation">,</span> <span class="token punctuation">(</span>doubled <span class="token operator">=</span> count <span class="token operator">*</span> <span class="token number">2</span><span class="token punctuation">)</span><span class="token punctuation">)</span><span class="token punctuation">;</span>
  <span class="token keyword">return</span> <span class="token punctuation">[</span>doubled<span class="token punctuation">]</span><span class="token punctuation">;</span>
<span class="token punctuation">&#125;</span></code>` + "";

	let t699;
	let section17;
	let h23;
	let a74;
	let t700;
	let t701;
	let section18;
	let h45;
	let a75;
	let t702;
	let t703;
	let section19;
	let h46;
	let a76;
	let t704;
	let t705;
	let section20;
	let h47;
	let a77;
	let t706;
	let t707;
	let section21;
	let h24;
	let a78;
	let t708;
	let t709;
	let p96;
	let t710;
	let a79;
	let t711;
	let t712;
	let t713;
	let p97;
	let t714;
	let a80;
	let t715;
	let t716;
	let a81;
	let t717;
	let t718;
	let a82;
	let t719;
	let t720;
	let t721;
	let p98;
	let strong34;
	let t722;
	let a83;
	let t723;
	let t724;
	let t725;
	let p99;
	let strong35;
	let t726;
	let a84;
	let t727;
	let t728;
	let t729;
	let section22;
	let h25;
	let a85;
	let t730;
	let t731;
	let ul19;
	let li71;
	let t732;
	let a86;
	let t733;
	let t734;
	let t735;
	let li72;
	let t736;
	let a87;
	let t737;
	let t738;
	let a88;
	let t739;
	let t740;
	let li73;
	let a89;
	let t741;
	let t742;
	let t743;
	let li74;
	let a90;
	let t744;
	let t745;
	let t746;
	let li75;
	let a91;
	let t747;

	return {
		c() {
			section0 = element("section");
			ul8 = element("ul");
			li0 = element("li");
			a0 = element("a");
			t0 = text("Pre v3.16.0");
			ul1 = element("ul");
			li1 = element("li");
			a1 = element("a");
			t1 = text("\\$\\$.ctx");
			li2 = element("li");
			a2 = element("a");
			t2 = text("\\$\\$.dirty");
			li3 = element("li");
			a3 = element("a");
			t3 = text("\\$\\$invalidate");
			li4 = element("li");
			a4 = element("a");
			t4 = text("schedule_update");
			ul0 = element("ul");
			li5 = element("li");
			a5 = element("a");
			t5 = text("tl/dr:");
			li6 = element("li");
			a6 = element("a");
			t6 = text("v3.16.0");
			ul3 = element("ul");
			li7 = element("li");
			a7 = element("a");
			t7 = text("Bitmask");
			li8 = element("li");
			a8 = element("a");
			t8 = text("Bitmask in Svelte");
			ul2 = element("ul");
			li9 = element("li");
			a9 = element("a");
			t9 = text("Destructuring  ");
			li10 = element("li");
			a10 = element("a");
			t10 = text("tl/dr:");
			li11 = element("li");
			a11 = element("a");
			t11 = text("Reactive Declaration");
			ul5 = element("ul");
			ul4 = element("ul");
			li12 = element("li");
			a12 = element("a");
			t12 = text("1. Execution of all reactive declarations and statements are batched");
			li13 = element("li");
			a13 = element("a");
			t13 = text("2. The value of reactive variable outside of reactive declarations and statements may not be up to date");
			li14 = element("li");
			a14 = element("a");
			t14 = text("Sorting of reactive declarations and statements");
			li15 = element("li");
			a15 = element("a");
			t15 = text("Reactive variable that is not reactive");
			li16 = element("li");
			a16 = element("a");
			t16 = text("Summary");
			ul7 = element("ul");
			ul6 = element("ul");
			li17 = element("li");
			a17 = element("a");
			t17 = text("1. Svelte keeps track of which variables are dirty and batched the DOM updates.");
			li18 = element("li");
			a18 = element("a");
			t18 = text("2. Using bitmask, Svelte able to generate a more compact compiled code.");
			li19 = element("li");
			a19 = element("a");
			t19 = text("3. Reactive declarations and statements are executed in batch, just like DOM updates");
			li20 = element("li");
			a20 = element("a");
			t20 = text("Closing Note");
			li21 = element("li");
			a21 = element("a");
			t21 = text("Further Resources");
			t22 = space();
			p0 = element("p");
			strong0 = element("strong");
			t23 = text("⬅ ⬅  Previously in ");
			a22 = element("a");
			t24 = text("Part 1");
			t25 = text(".");
			t26 = space();
			p1 = element("p");
			a23 = element("a");
			t27 = text("Previously");
			t28 = text(", when I mentioned the ");
			code0 = element("code");
			t29 = text("$$invalidate");
			t30 = text(" function, I explained that the ");
			code1 = element("code");
			t31 = text("$$invalidate");
			t32 = text(" function works conceptually like the following:");
			t33 = space();
			pre0 = element("pre");
			t34 = space();
			p2 = element("p");
			t35 = text("but that's not the exact implementation of the ");
			code2 = element("code");
			t36 = text("$$invaldiate");
			t37 = text(" function. So in this article, we are going to look at how ");
			code3 = element("code");
			t38 = text("$$invalidate");
			t39 = text(" is implemented in Svelte.");
			t40 = space();
			p3 = element("p");
			t41 = text("At the point of writing, Svelte is at ");
			a24 = element("a");
			t42 = text("v3.20.1");
			t43 = text(".");
			t44 = space();
			section1 = element("section");
			h20 = element("h2");
			a25 = element("a");
			t45 = text("Pre v3.16.0");
			t46 = space();
			p4 = element("p");
			t47 = text("There's a big optimisation that changes the underlying implementation of the ");
			code4 = element("code");
			t48 = text("$$invalidate");
			t49 = text(" function in ");
			a26 = element("a");
			t50 = text("v3.16.0");
			t51 = text(", namely in ");
			a27 = element("a");
			t52 = text("#3945");
			t53 = text(". The underlying concept doesn't change, but it'll be much easier to understand about ");
			code5 = element("code");
			t54 = text("$$invalidate");
			t55 = text(" prior the change and learn about the optimisation change separately.");
			t56 = space();
			p5 = element("p");
			t57 = text("Let's explain some of the variables that you are going to see, some of which was introduced in ");
			a28 = element("a");
			t58 = text("Part 1");
			t59 = text(":");
			t60 = space();
			section2 = element("section");
			h30 = element("h3");
			a29 = element("a");
			t61 = text("\\$\\$.ctx");
			t62 = space();
			p6 = element("p");
			t63 = text("There's no official name for it. You can call it ");
			strong1 = element("strong");
			t64 = text("context");
			t65 = text(" as it is the context which the template is based on to render onto the DOM.");
			t66 = space();
			p7 = element("p");
			t67 = text("I called it ");
			a30 = element("a");
			t68 = text("instance variables");
			t69 = text(". As it is a JavaScript Object that contains all the variables that you:");
			t70 = space();
			ul9 = element("ul");
			li22 = element("li");
			t71 = text("declared in the ");
			code6 = element("code");
			t72 = text("<script>");
			t73 = text(" tag");
			t74 = space();
			li23 = element("li");
			t75 = text("mutated or reassigned");
			t76 = space();
			li24 = element("li");
			t77 = text("referenced in the template");
			t78 = space();
			p8 = element("p");
			t79 = text("that belongs to a component instance.");
			t80 = space();
			p9 = element("p");
			t81 = text("The instance variables themselves can be of a primitive value, object, array or function.");
			t82 = space();
			p10 = element("p");
			t83 = text("The ");
			code7 = element("code");
			t84 = text("instance");
			t85 = text(" function creates and returns the ");
			code8 = element("code");
			t86 = text("ctx");
			t87 = text(" object.");
			t88 = space();
			p11 = element("p");
			t89 = text("Functions declared in the ");
			code9 = element("code");
			t90 = text("<script>");
			t91 = text(" tag will refer to the instance variable that is scoped withn the ");
			code10 = element("code");
			t92 = text("instance");
			t93 = text(" function closure:");
			t94 = space();
			pre1 = element("pre");
			t95 = space();
			p12 = element("p");
			a31 = element("a");
			t96 = text("Svelte REPL");
			t97 = space();
			pre2 = element("pre");
			t98 = space();
			p13 = element("p");
			t99 = text("Whenever a new instance of a component is created, the ");
			code11 = element("code");
			t100 = text("instance");
			t101 = text(" function is called and the ");
			code12 = element("code");
			t102 = text("ctx");
			t103 = text(" object is created and captured within a new closure scope.");
			t104 = space();
			section3 = element("section");
			h31 = element("h3");
			a32 = element("a");
			t105 = text("\\$\\$.dirty");
			t106 = space();
			p14 = element("p");
			code13 = element("code");
			t107 = text("$$.dirty");
			t108 = text(" is a object that is used to track which instance variable had just changed and needs to be updated onto the DOM.");
			t109 = space();
			p15 = element("p");
			t110 = text("For example, in the following Svelte component:");
			t111 = space();
			pre3 = element("pre");
			t112 = space();
			p16 = element("p");
			a33 = element("a");
			t113 = text("Svelte REPL");
			t114 = space();
			p17 = element("p");
			t115 = text("The initial ");
			code14 = element("code");
			t116 = text("$$.dirty");
			t117 = text(" is ");
			code15 = element("code");
			t118 = text("null");
			t119 = text(" (");
			a34 = element("a");
			t120 = text("source code");
			t121 = text(").");
			t122 = space();
			p18 = element("p");
			t123 = text("If you clicked on the ");
			strong2 = element("strong");
			t124 = text("\"+ Agility\"");
			t125 = text(" button, ");
			code16 = element("code");
			t126 = text("$$.dirty");
			t127 = text(" will turn into:");
			t128 = space();
			pre4 = element("pre");
			t129 = space();
			p19 = element("p");
			t130 = text("If you clicked on the ");
			strong3 = element("strong");
			t131 = text("\"Level Up\"");
			t132 = text(" button, ");
			code17 = element("code");
			t133 = text("$$.dirty");
			t134 = text(" will turn into:");
			t135 = space();
			pre5 = element("pre");
			t136 = space();
			p20 = element("p");
			code18 = element("code");
			t137 = text("$$.dirty");
			t138 = text(" is useful for Svelte, so that it doesn't update the DOM unnecessarily.");
			t139 = space();
			p21 = element("p");
			t140 = text("If you looked at the ");
			strong4 = element("strong");
			t141 = text("p (u_p_date)");
			t142 = text(" function of the compiled code, you will see Svelte checks whether a variable is marked in ");
			code19 = element("code");
			t143 = text("$$.dirty");
			t144 = text(", before updating the DOM.");
			t145 = space();
			pre6 = element("pre");
			t146 = space();
			p22 = element("p");
			t147 = text("After Svelte updates the DOM, the ");
			code20 = element("code");
			t148 = text("$$.dirty");
			t149 = text(" is set back to ");
			code21 = element("code");
			t150 = text("null");
			t151 = text(" to indicate all changes has been applied onto the DOM.");
			t152 = space();
			section4 = element("section");
			h32 = element("h3");
			a35 = element("a");
			t153 = text("\\$\\$invalidate");
			t154 = space();
			p23 = element("p");
			code22 = element("code");
			t155 = text("$$invalidate");
			t156 = text(" is the secret behind reactivity in Svelte.");
			t157 = space();
			p24 = element("p");
			t158 = text("Whenever a variable is");
			t159 = space();
			ul10 = element("ul");
			li25 = element("li");
			t160 = text("reassigned ");
			code23 = element("code");
			t161 = text("(foo = 1)");
			t162 = space();
			li26 = element("li");
			t163 = text("mutated ");
			code24 = element("code");
			t164 = text("(foo.bar = 1)");
			t165 = space();
			p25 = element("p");
			t166 = text("Svelte will wrap the assignment or update around with the ");
			code25 = element("code");
			t167 = text("$$invalidate");
			t168 = text(" function:");
			t169 = space();
			pre7 = element("pre");
			t170 = space();
			p26 = element("p");
			t171 = text("the ");
			code26 = element("code");
			t172 = text("$$invalidate");
			t173 = text(" function will:");
			t174 = space();
			ol0 = element("ol");
			li27 = element("li");
			t175 = text("update the variable in ");
			code27 = element("code");
			t176 = text("$$.ctx");
			t177 = space();
			li28 = element("li");
			t178 = text("mark the variable in ");
			code28 = element("code");
			t179 = text("$$.dirty");
			t180 = space();
			li29 = element("li");
			t181 = text("schedule an update");
			t182 = space();
			li30 = element("li");
			t183 = text("return the value of the assignment or update expression");
			t184 = space();
			pre8 = element("pre");
			t185 = space();
			p27 = element("p");
			a36 = element("a");
			t186 = text("Source code");
			t187 = space();
			p28 = element("p");
			t188 = text("One interesting note about the function ");
			code29 = element("code");
			t189 = text("$$invalidate");
			t190 = text(" is that, it wraps around the assignment or update expression and returns what the expression evaluates to.");
			t191 = space();
			p29 = element("p");
			t192 = text("This makes ");
			code30 = element("code");
			t193 = text("$$invalidate");
			t194 = text(" chainable:");
			t195 = space();
			pre9 = element("pre");
			t196 = space();
			p30 = element("p");
			t197 = text("It seemed complex when there's a lot of assignment or update expressions in 1 statement! 🙈");
			t198 = space();
			p31 = element("p");
			t199 = text("The 2nd argument of ");
			code31 = element("code");
			t200 = text("$$invalidate");
			t201 = text(" is the assignment or update expressions verbatim. But if it contains any assignment or update sub-expressions, we recursively wrap it with ");
			code32 = element("code");
			t202 = text("$$invalidate");
			t203 = text(".");
			t204 = space();
			p32 = element("p");
			t205 = text("In case where the assignment expression changes a property of an object, we pass the object in as a 3rd argument of the ");
			code33 = element("code");
			t206 = text("$$invalidate");
			t207 = text(" function, eg:");
			t208 = space();
			pre10 = element("pre");
			t209 = space();
			p33 = element("p");
			t210 = text("So that, we update the ");
			code34 = element("code");
			t211 = text("\"obj\"");
			t212 = text(" variable to ");
			code35 = element("code");
			t213 = text("obj");
			t214 = text(" instead of the value of the 2nd argument, ");
			code36 = element("code");
			t215 = text("\"hello\"");
			t216 = text(".");
			t217 = space();
			section5 = element("section");
			h33 = element("h3");
			a37 = element("a");
			t218 = text("schedule_update");
			t219 = space();
			p34 = element("p");
			code37 = element("code");
			t220 = text("schedule_update");
			t221 = text(" schedules Svelte to update the DOM with the changes made thus far.");
			t222 = space();
			p35 = element("p");
			t223 = text("Svelte, at the point of writing (");
			a38 = element("a");
			t224 = text("v3.20.1");
			t225 = text("), uses ");
			a39 = element("a");
			t226 = text("microtask queue");
			t227 = text(" to batch change updates. The actual DOM update happens in the next microtask, so that any synchronous ");
			code38 = element("code");
			t228 = text("$$invalidate");
			t229 = text(" operations that happen within the same task get batched into the next DOM update.");
			t230 = space();
			p36 = element("p");
			t231 = text("To schedule a next microtask, Svelte uses the Promise callback.");
			t232 = space();
			pre11 = element("pre");
			t233 = space();
			p37 = element("p");
			t234 = text("In ");
			code39 = element("code");
			t235 = text("flush");
			t236 = text(", we call update for each component marked dirty:");
			t237 = space();
			pre12 = element("pre");
			t238 = space();
			p38 = element("p");
			a40 = element("a");
			t239 = text("Source code");
			t240 = space();
			p39 = element("p");
			t241 = text("So, if you write a Svelte component like this:");
			t242 = space();
			pre13 = element("pre");
			t243 = space();
			p40 = element("p");
			a41 = element("a");
			t244 = text("Svelte REPL");
			t245 = space();
			p41 = element("p");
			t246 = text("The DOM update for the ");
			code40 = element("code");
			t247 = text("givenName");
			t248 = text(" and ");
			code41 = element("code");
			t249 = text("familyName");
			t250 = text(" happens in the same microtask:");
			t251 = space();
			ol1 = element("ol");
			li31 = element("li");
			t252 = text("Click on the ");
			strong5 = element("strong");
			t253 = text("\"Update\"");
			t254 = text(" to call the ");
			code42 = element("code");
			t255 = text("update");
			t256 = text(" function");
			t257 = space();
			li32 = element("li");
			code43 = element("code");
			t258 = text("$$invalidate('givenName', givenName = 'Li Hau')");
			t259 = space();
			li33 = element("li");
			t260 = text("Mark the variable ");
			code44 = element("code");
			t261 = text("givenName");
			t262 = text(" dirty, ");
			code45 = element("code");
			t263 = text("$$.dirty['givenName'] = true");
			t264 = space();
			li34 = element("li");
			t265 = text("Schedule an update, ");
			code46 = element("code");
			t266 = text("schedule_update()");
			t267 = space();
			li35 = element("li");
			t268 = text("Since it's the first update in the call stack, push the ");
			code47 = element("code");
			t269 = text("flush");
			t270 = text(" function into the microtask queue");
			t271 = space();
			li36 = element("li");
			code48 = element("code");
			t272 = text("$$invalidate('familyName', familyName = 'Tan')");
			t273 = space();
			li37 = element("li");
			t274 = text("Mark the variable ");
			code49 = element("code");
			t275 = text("familyName");
			t276 = text(" dirty, ");
			code50 = element("code");
			t277 = text("$$.dirty['familyName'] = true");
			t278 = space();
			li38 = element("li");
			t279 = text("Schedule an update, ");
			code51 = element("code");
			t280 = text("schedule_update()");
			t281 = space();
			li39 = element("li");
			t282 = text("Since ");
			code52 = element("code");
			t283 = text("update_scheduled = true");
			t284 = text(", do nothing.");
			t285 = space();
			li40 = element("li");
			strong6 = element("strong");
			t286 = text("-- End of task --");
			t287 = space();
			li41 = element("li");
			strong7 = element("strong");
			t288 = text("-- Start of microtask--");
			t289 = space();
			li42 = element("li");
			code53 = element("code");
			t290 = text("flush()");
			t291 = text(" calls ");
			code54 = element("code");
			t292 = text("update()");
			t293 = text(" for each component marked dirty");
			t294 = space();
			li45 = element("li");
			t295 = text("Calls ");
			code55 = element("code");
			t296 = text("$$.fragment.p($$.dirty, $$.ctx)");
			t297 = text(".");
			ul11 = element("ul");
			li43 = element("li");
			code56 = element("code");
			t298 = text("$$.dirty");
			t299 = text(" is now ");
			code57 = element("code");
			t300 = text("{ givenName: true, familyName: true }");
			t301 = space();
			li44 = element("li");
			code58 = element("code");
			t302 = text("$$.ctx");
			t303 = text(" is now ");
			code59 = element("code");
			t304 = text("{ givenName: 'Li Hau', familyName: 'Tan' }");
			t305 = space();
			li48 = element("li");
			t306 = text("In ");
			code60 = element("code");
			t307 = text("function p(dirty, ctx)");
			t308 = text(",");
			ul12 = element("ul");
			li46 = element("li");
			t309 = text("Update the 1st text node to ");
			code61 = element("code");
			t310 = text("$$.ctx['givenName']");
			t311 = text(" if ");
			code62 = element("code");
			t312 = text("$$.dirty['givenName'] === true");
			t313 = space();
			li47 = element("li");
			t314 = text("Update the 2nd text node to ");
			code63 = element("code");
			t315 = text("$$.ctx['familyName']");
			t316 = text(" if ");
			code64 = element("code");
			t317 = text("$$.dirty['familyName'] === true");
			t318 = space();
			li49 = element("li");
			t319 = text("Resets the ");
			code65 = element("code");
			t320 = text("$$.dirty");
			t321 = text(" to ");
			code66 = element("code");
			t322 = text("null");
			t323 = space();
			li50 = element("li");
			t324 = text("...");
			t325 = space();
			li51 = element("li");
			strong8 = element("strong");
			t326 = text("-- End of microtask--");
			t327 = space();
			section6 = element("section");
			h40 = element("h4");
			a42 = element("a");
			t328 = text("tl/dr:");
			t329 = space();
			ul13 = element("ul");
			li52 = element("li");
			t330 = text("For each assignment or update, Svelte calls ");
			code67 = element("code");
			t331 = text("$$invalidate");
			t332 = text(" to update the variable in ");
			code68 = element("code");
			t333 = text("$$.ctx");
			t334 = text(" and mark the variable dirty in ");
			code69 = element("code");
			t335 = text("$$.dirty");
			t336 = text(".");
			t337 = space();
			li53 = element("li");
			t338 = text("The acutal DOM update is batched into the next microtask queue.");
			t339 = space();
			li54 = element("li");
			t340 = text("To update the DOM for each component, the component ");
			code70 = element("code");
			t341 = text("$$.fragment.p($$.diry, $$.ctx)");
			t342 = text(" is called.");
			t343 = space();
			li55 = element("li");
			t344 = text("After the DOM update, the ");
			code71 = element("code");
			t345 = text("$$.dirty");
			t346 = text(" is reset to ");
			code72 = element("code");
			t347 = text("null");
			t348 = text(".");
			t349 = space();
			section7 = element("section");
			h21 = element("h2");
			a43 = element("a");
			t350 = text("v3.16.0");
			t351 = space();
			p42 = element("p");
			t352 = text("One big change in v3.16.0 is the PR ");
			a44 = element("a");
			t353 = text("#3945");
			t354 = text(", namely ");
			strong9 = element("strong");
			t355 = text("bitmask-based change tracking");
			t356 = text(".");
			t357 = space();
			p43 = element("p");
			t358 = text("Instead of marking the variable dirty using an object:");
			t359 = space();
			pre14 = element("pre");
			t360 = space();
			p44 = element("p");
			t361 = text("Svelte assign each variable an index:");
			t362 = space();
			pre15 = element("pre");
			t363 = space();
			p45 = element("p");
			t364 = text("and uses ");
			a45 = element("a");
			t365 = text("bitmask");
			t366 = text(" to store the dirty information:");
			t367 = space();
			pre16 = element("pre");
			t368 = space();
			p46 = element("p");
			t369 = text("which is far more compact than the previous compiled code.");
			t370 = space();
			section8 = element("section");
			h34 = element("h3");
			a46 = element("a");
			t371 = text("Bitmask");
			t372 = space();
			p47 = element("p");
			t373 = text("For those who don't understand, allow me to quickly explain what it is.");
			t374 = space();
			p48 = element("p");
			t375 = text("Of course, if you want to learn more about it, feel free to read a more detailed explanation, like ");
			a47 = element("a");
			t376 = text("this");
			t377 = text(" and ");
			a48 = element("a");
			t378 = text("this");
			t379 = text(".");
			t380 = space();
			p49 = element("p");
			t381 = text("The most compact way of representing a group of ");
			code73 = element("code");
			t382 = text("true");
			t383 = text(" or ");
			code74 = element("code");
			t384 = text("false");
			t385 = text(" is to use bits. If the bit is ");
			code75 = element("code");
			t386 = text("1");
			t387 = text(" it is ");
			code76 = element("code");
			t388 = text("true");
			t389 = text(" and if it is ");
			code77 = element("code");
			t390 = text("0");
			t391 = text(" it is ");
			code78 = element("code");
			t392 = text("false");
			t393 = text(".");
			t394 = space();
			p50 = element("p");
			t395 = text("A number can be represented in binary, ");
			strong10 = element("strong");
			t396 = text("5");
			t397 = text(" is ");
			code79 = element("code");
			t398 = text("0b0101");
			t399 = text(" in binary.");
			t400 = space();
			p51 = element("p");
			t401 = text("If ");
			strong11 = element("strong");
			t402 = text("5");
			t403 = text(" is represented in a 4-bit binary, then it can store 4 boolean values, with the 0th and 2nd bit as ");
			code80 = element("code");
			t404 = text("true");
			t405 = text(" and 1st and 3rd bit as ");
			code81 = element("code");
			t406 = text("false");
			t407 = text(", (reading from the right to left, from ");
			a49 = element("a");
			t408 = text("least significant bit");
			t409 = text(" to the ");
			a50 = element("a");
			t410 = text("most significant bit");
			t411 = text(").");
			t412 = space();
			p52 = element("p");
			strong12 = element("strong");
			t413 = text("How many boolean values can a number store?");
			t414 = space();
			p53 = element("p");
			t415 = text("That depends on the language, a 16-bit integer in Java can store 16 boolean values.");
			t416 = space();
			p54 = element("p");
			t417 = text("In JavaScript, numbers can are ");
			a51 = element("a");
			t418 = text("represented in 64 bits");
			t419 = text(". However, when using ");
			a52 = element("a");
			t420 = text("bitwise operations");
			t421 = text(" on the number, JavaScript will treat the number as 32 bits.");
			t422 = space();
			p55 = element("p");
			t423 = text("To inspect or modify the boolean value stored in a number, we use ");
			a53 = element("a");
			t424 = text("bitwise operations");
			t425 = text(".");
			t426 = space();
			pre17 = element("pre");
			t427 = space();
			p56 = element("p");
			t428 = text("The 2nd operand we use in the bitwise operation, is like a ");
			a54 = element("a");
			t429 = text("mask");
			t430 = text(" that allow us to target a specific bit in the 1st number, that stores our boolean values.");
			t431 = space();
			p57 = element("p");
			t432 = text("We call the mask, ");
			strong13 = element("strong");
			t433 = text("bitmask");
			t434 = text(".");
			t435 = space();
			section9 = element("section");
			h35 = element("h3");
			a55 = element("a");
			t436 = text("Bitmask in Svelte");
			t437 = space();
			p58 = element("p");
			t438 = text("As mentioned earlier, we assign each variable an index:");
			t439 = space();
			pre18 = element("pre");
			t440 = space();
			p59 = element("p");
			t441 = text("So instead of returning the instance variable as an JavaScript Object, we now return it as an JavaScript Array:");
			t442 = space();
			pre19 = element("pre");
			t443 = space();
			p60 = element("p");
			t444 = text("The variable is accessed via ");
			strong14 = element("strong");
			t445 = text("index");
			t446 = text(", ");
			code82 = element("code");
			t447 = text("$$.ctx[index]");
			t448 = text(", instead of ");
			strong15 = element("strong");
			t449 = text("variable name");
			t450 = text(":");
			t451 = space();
			pre20 = element("pre");
			t452 = space();
			p61 = element("p");
			t453 = text("The ");
			code83 = element("code");
			t454 = text("$$invalidate");
			t455 = text(" function works the same, except it takes in ");
			strong16 = element("strong");
			t456 = text("index");
			t457 = text(" instead of ");
			strong17 = element("strong");
			t458 = text("variable name");
			t459 = text(":");
			t460 = space();
			pre21 = element("pre");
			t461 = space();
			p62 = element("p");
			code84 = element("code");
			t462 = text("$$.dirty");
			t463 = text(" now stores a list of numbers. Each number carries 31 boolean values, each boolean value indicates whether the variable of that index is dirty or not.");
			t464 = space();
			p63 = element("p");
			t465 = text("To set a variable as dirty, we use bitwise operation:");
			t466 = space();
			pre22 = element("pre");
			t467 = space();
			p64 = element("p");
			t468 = text("And to verify whether a variable is dirty, we use bitwise operation too!");
			t469 = space();
			pre23 = element("pre");
			t470 = space();
			p65 = element("p");
			t471 = text("With using bitmask, ");
			code85 = element("code");
			t472 = text("$$.dirty");
			t473 = text(" is now reset to ");
			code86 = element("code");
			t474 = text("[-1]");
			t475 = text(" instead of ");
			code87 = element("code");
			t476 = text("null");
			t477 = text(".");
			t478 = space();
			p66 = element("p");
			strong18 = element("strong");
			t479 = text("Trivia:");
			t480 = space();
			code88 = element("code");
			t481 = text("-1");
			t482 = text(" is ");
			code89 = element("code");
			t483 = text("0b1111_1111");
			t484 = text(" in binary, where all the bits are ");
			code90 = element("code");
			t485 = text("1");
			t486 = text(".");
			t487 = space();
			section10 = element("section");
			h41 = element("h4");
			a56 = element("a");
			t488 = text("Destructuring ");
			strong19 = element("strong");
			t489 = text("$$.dirty");
			t490 = space();
			p67 = element("p");
			t491 = text("One code-size optimisation that Svelte does is to always destructure the ");
			code91 = element("code");
			t492 = text("dirty");
			t493 = text(" array in the ");
			strong20 = element("strong");
			t494 = text("u_p_date function");
			t495 = text(" if there's less than 32 variables, since we will always access ");
			code92 = element("code");
			t496 = text("dirty[0]");
			t497 = text(" anyway:");
			t498 = space();
			pre24 = element("pre");
			t499 = space();
			section11 = element("section");
			h42 = element("h4");
			a57 = element("a");
			t500 = text("tl/dr:");
			t501 = space();
			ul14 = element("ul");
			li56 = element("li");
			t502 = text("The underlying mechanism for ");
			code93 = element("code");
			t503 = text("$$invalidate");
			t504 = text(" and ");
			code94 = element("code");
			t505 = text("schedule_update");
			t506 = text(" does not change");
			t507 = space();
			li57 = element("li");
			t508 = text("Using bitmask, the compiled code is much compact");
			t509 = space();
			section12 = element("section");
			h22 = element("h2");
			a58 = element("a");
			t510 = text("Reactive Declaration");
			t511 = space();
			p68 = element("p");
			t512 = text("Svelte allow us to declare reactive values via the ");
			a59 = element("a");
			t513 = text("labeled statement");
			t514 = text(", ");
			code95 = element("code");
			t515 = text("$:");
			t516 = space();
			pre25 = element("pre");
			t517 = space();
			p69 = element("p");
			a60 = element("a");
			t518 = text("Svelte REPL");
			t519 = space();
			p70 = element("p");
			t520 = text("If you look at the compiled output, you would find out that the declarative statements appeared in the ");
			a61 = element("a");
			code96 = element("code");
			t521 = text("instance");
			t522 = text(" function");
			t523 = text(":");
			t524 = space();
			pre26 = element("pre");
			t525 = space();
			p71 = element("p");
			t526 = text("Try reorder the reactive declarations and observe the change in the compiled output:");
			t527 = space();
			pre27 = element("pre");
			t528 = space();
			p72 = element("p");
			a62 = element("a");
			t529 = text("Svelte REPL");
			t530 = space();
			pre28 = element("pre");
			t531 = space();
			p73 = element("p");
			t532 = text("Some observations:");
			t533 = space();
			ul17 = element("ul");
			li59 = element("li");
			t534 = text("When there are reactive declarations, Svelte defines a custom ");
			code97 = element("code");
			t535 = text("$$.update");
			t536 = text(" method.");
			ul15 = element("ul");
			li58 = element("li");
			code98 = element("code");
			t537 = text("$$.update");
			t538 = text(" is a ");
			a63 = element("a");
			t539 = text("no-op function");
			t540 = text(" by default. (See ");
			a64 = element("a");
			t541 = text("src/runtime/internal/Component.ts");
			t542 = text(")");
			t543 = space();
			li60 = element("li");
			t544 = text("Svelte uses ");
			code99 = element("code");
			t545 = text("$$invalidate");
			t546 = text(" to update the value of a reactive variable too.");
			t547 = space();
			li62 = element("li");
			t548 = text("Svelte sorts the reactive declarations and statements, based on the dependency relationship between the declarations and statements");
			ul16 = element("ul");
			li61 = element("li");
			code100 = element("code");
			t549 = text("quadrupled");
			t550 = text(" depends on ");
			code101 = element("code");
			t551 = text("doubled");
			t552 = text(", so ");
			code102 = element("code");
			t553 = text("quadrupled");
			t554 = text(" is evaluated and ");
			code103 = element("code");
			t555 = text("$$invalidate");
			t556 = text("d after ");
			code104 = element("code");
			t557 = text("doubled");
			t558 = text(".");
			t559 = space();
			p74 = element("p");
			t560 = text("Since all reactive declarations and statements are grouped into the ");
			code105 = element("code");
			t561 = text("$$.update");
			t562 = text(" method, and also the fact that Svelte will sort the declarations and statements according to their dependency relationship, it is irrelevant of the location or the order you declared them.");
			t563 = space();
			p75 = element("p");
			t564 = text("The following component still works:");
			t565 = space();
			pre29 = element("pre");
			t566 = space();
			p76 = element("p");
			a65 = element("a");
			t567 = text("Svelte REPL");
			t568 = space();
			p77 = element("p");
			strong21 = element("strong");
			t569 = text("The next thing you may ask, when is ");
			code106 = element("code");
			t570 = text("$$.update");
			t571 = text(" being called?");
			t572 = space();
			p78 = element("p");
			t573 = text("Remember the ");
			code107 = element("code");
			t574 = text("update");
			t575 = text(" function that gets called in the ");
			code108 = element("code");
			t576 = text("flush");
			t577 = text(" function?");
			t578 = space();
			p79 = element("p");
			t579 = text("I put a ");
			code109 = element("code");
			t580 = text("NOTE:");
			t581 = text(" comment saying that it will be important later. Well, it is important now.");
			t582 = space();
			pre30 = element("pre");
			t583 = space();
			p80 = element("p");
			t584 = text("The ");
			code110 = element("code");
			t585 = text("$$.update");
			t586 = text(" function gets called ");
			strong22 = element("strong");
			t587 = text("in the same microtask");
			t588 = text(" with the DOM update, right before we called the ");
			code111 = element("code");
			t589 = text("$$.fragment.p()");
			t590 = text(" to update the DOM.");
			t591 = space();
			p81 = element("p");
			t592 = text("The implication of the above fact is");
			t593 = space();
			section13 = element("section");
			h43 = element("h4");
			a66 = element("a");
			t594 = text("1. Execution of all reactive declarations and statements are batched");
			t595 = space();
			p82 = element("p");
			t596 = text("Just as how DOM updates are batched, reactive declarations and statements are batched too!");
			t597 = space();
			pre31 = element("pre");
			t598 = space();
			p83 = element("p");
			a67 = element("a");
			t599 = text("Svelte REPL");
			t600 = space();
			p84 = element("p");
			t601 = text("When ");
			code112 = element("code");
			t602 = text("update()");
			t603 = text(" get called,");
			t604 = space();
			ol2 = element("ol");
			li63 = element("li");
			t605 = text("Similar to the ");
			a68 = element("a");
			t606 = text("flow described above");
			t607 = text(", ");
			code113 = element("code");
			t608 = text("$$invalidate");
			t609 = text(" both ");
			strong23 = element("strong");
			t610 = text("\"givenName\"");
			t611 = text(" and ");
			strong24 = element("strong");
			t612 = text("\"familyName\"");
			t613 = text(", and schedules an update");
			t614 = space();
			li64 = element("li");
			strong25 = element("strong");
			t615 = text("-- End of task --");
			t616 = space();
			li65 = element("li");
			strong26 = element("strong");
			t617 = text("-- Start of microtask--");
			t618 = space();
			li66 = element("li");
			code114 = element("code");
			t619 = text("flush()");
			t620 = text(" calls ");
			code115 = element("code");
			t621 = text("update()");
			t622 = text(" for each component marked dirty");
			t623 = space();
			li69 = element("li");
			t624 = text("Runs ");
			code116 = element("code");
			t625 = text("$$.update()");
			ul18 = element("ul");
			li67 = element("li");
			t626 = text("As ");
			strong27 = element("strong");
			t627 = text("\"givenName\"");
			t628 = text(" and ");
			strong28 = element("strong");
			t629 = text("\"familyName\"");
			t630 = text(" has changed, evaluates and ");
			code117 = element("code");
			t631 = text("$$invalidate");
			t632 = space();
			strong29 = element("strong");
			t633 = text("\"name\"");
			t634 = space();
			li68 = element("li");
			t635 = text("As ");
			strong30 = element("strong");
			t636 = text("\"name\"");
			t637 = text(" has changed, executes ");
			code118 = element("code");
			t638 = text("console.log('name', name);");
			t639 = space();
			li70 = element("li");
			t640 = text("Calls ");
			code119 = element("code");
			t641 = text("$$.fragment.p(...)");
			t642 = text(" to update the DOM.");
			t643 = space();
			p85 = element("p");
			t644 = text("As you can see, even though we've updated ");
			code120 = element("code");
			t645 = text("givenName");
			t646 = text(" and ");
			code121 = element("code");
			t647 = text("familyName");
			t648 = text(", we only evaluate ");
			code122 = element("code");
			t649 = text("name");
			t650 = text(" and executes ");
			code123 = element("code");
			t651 = text("console.log('name', name)");
			t652 = space();
			strong31 = element("strong");
			t653 = text("once");
			t654 = text(" instead of twice:");
			t655 = space();
			pre32 = element("pre");
			t656 = space();
			section14 = element("section");
			h44 = element("h4");
			a69 = element("a");
			t657 = text("2. The value of reactive variable outside of reactive declarations and statements may not be up to date");
			t658 = space();
			p86 = element("p");
			t659 = text("Because the reactive declarations and statements are batched and executed in the next microtask, you can't expect the value to be updated synchronously.");
			t660 = space();
			pre33 = element("pre");
			t661 = space();
			p87 = element("p");
			a70 = element("a");
			t662 = text("Svelte REPL");
			t663 = space();
			p88 = element("p");
			t664 = text("Instead, you ");
			strong32 = element("strong");
			t665 = text("have to");
			t666 = text(" refer the reactive variable in another reactive declaration or statement:");
			t667 = space();
			pre34 = element("pre");
			t668 = space();
			section15 = element("section");
			h36 = element("h3");
			a71 = element("a");
			t669 = text("Sorting of reactive declarations and statements");
			t670 = space();
			p89 = element("p");
			t671 = text("Svelte tries to preserve the order of reactive declarations and statements as they are declared as much as possible.");
			t672 = space();
			p90 = element("p");
			t673 = text("However, if one reactive declaration or statement refers to a variable that was defined by another reactive declaration, then, ");
			strong33 = element("strong");
			t674 = text("it will be inserted after the latter reactive declaration");
			t675 = text(":");
			t676 = space();
			pre35 = element("pre");
			t677 = space();
			section16 = element("section");
			h37 = element("h3");
			a72 = element("a");
			t678 = text("Reactive variable that is not reactive");
			t679 = space();
			p91 = element("p");
			t680 = text("The Svelte compiler tracks all the variables declared in the ");
			code124 = element("code");
			t681 = text("<script>");
			t682 = text(" tag.");
			t683 = space();
			p92 = element("p");
			t684 = text("If all the variables of a reactive declaration or statement refers to, never gets mutated or reassigned, then the reactive declaration or statement will not be added into ");
			code125 = element("code");
			t685 = text("$$.update");
			t686 = text(".");
			t687 = space();
			p93 = element("p");
			t688 = text("For example:");
			t689 = space();
			pre36 = element("pre");
			t690 = space();
			p94 = element("p");
			a73 = element("a");
			t691 = text("Svelte REPL");
			t692 = space();
			p95 = element("p");
			t693 = text("Since, ");
			code126 = element("code");
			t694 = text("count");
			t695 = text(" never gets mutated or reassigned, Svelte optimises the compiled output by not defining ");
			code127 = element("code");
			t696 = text("$$self.$$.update");
			t697 = text(".");
			t698 = space();
			pre37 = element("pre");
			t699 = space();
			section17 = element("section");
			h23 = element("h2");
			a74 = element("a");
			t700 = text("Summary");
			t701 = space();
			section18 = element("section");
			h45 = element("h4");
			a75 = element("a");
			t702 = text("1. Svelte keeps track of which variables are dirty and batched the DOM updates.");
			t703 = space();
			section19 = element("section");
			h46 = element("h4");
			a76 = element("a");
			t704 = text("2. Using bitmask, Svelte able to generate a more compact compiled code.");
			t705 = space();
			section20 = element("section");
			h47 = element("h4");
			a77 = element("a");
			t706 = text("3. Reactive declarations and statements are executed in batch, just like DOM updates");
			t707 = space();
			section21 = element("section");
			h24 = element("h2");
			a78 = element("a");
			t708 = text("Closing Note");
			t709 = space();
			p96 = element("p");
			t710 = text("If you wish to know more, ");
			a79 = element("a");
			t711 = text("follow me on Twitter");
			t712 = text(".");
			t713 = space();
			p97 = element("p");
			t714 = text("I'll post it on Twitter when the next part is ready, where I'll be covering ");
			a80 = element("a");
			t715 = text("logic blocks");
			t716 = text(", ");
			a81 = element("a");
			t717 = text("slots");
			t718 = text(", ");
			a82 = element("a");
			t719 = text("context");
			t720 = text(", and many others.");
			t721 = space();
			p98 = element("p");
			strong34 = element("strong");
			t722 = text("⬅ ⬅  Previously in ");
			a83 = element("a");
			t723 = text("Part 1");
			t724 = text(".");
			t725 = space();
			p99 = element("p");
			strong35 = element("strong");
			t726 = text("➡ ➡  Continue reading on ");
			a84 = element("a");
			t727 = text("Part 3");
			t728 = text(".");
			t729 = space();
			section22 = element("section");
			h25 = element("h2");
			a85 = element("a");
			t730 = text("Further Resources");
			t731 = space();
			ul19 = element("ul");
			li71 = element("li");
			t732 = text("Rich Harris shares about ");
			a86 = element("a");
			t733 = text("Bitmask Tracking at Svelte Society NYC");
			t734 = text(".");
			t735 = space();
			li72 = element("li");
			t736 = text("Svelte Tutorial - ");
			a87 = element("a");
			t737 = text("Reactivity");
			t738 = space();
			a88 = element("a");
			t739 = text("https://jakearchibald.com/2015/tasks-microtasks-queues-and-schedules/");
			t740 = space();
			li73 = element("li");
			a89 = element("a");
			t741 = text("The Art of Bitmasking");
			t742 = text(" by Shakib Ahmed");
			t743 = space();
			li74 = element("li");
			a90 = element("a");
			t744 = text("Bitmasks: A very esoteric (and impractical) way of managing booleans");
			t745 = text(" by Basti Ortiz");
			t746 = space();
			li75 = element("li");
			a91 = element("a");
			t747 = text("MDN: Bitwise Operators");
			this.h();
		},
		l(nodes) {
			section0 = claim_element(nodes, "SECTION", {});
			var section0_nodes = children(section0);

			ul8 = claim_element(section0_nodes, "UL", {
				class: true,
				id: true,
				role: true,
				"aria-label": true
			});

			var ul8_nodes = children(ul8);
			li0 = claim_element(ul8_nodes, "LI", {});
			var li0_nodes = children(li0);
			a0 = claim_element(li0_nodes, "A", { href: true });
			var a0_nodes = children(a0);
			t0 = claim_text(a0_nodes, "Pre v3.16.0");
			a0_nodes.forEach(detach);
			li0_nodes.forEach(detach);
			ul1 = claim_element(ul8_nodes, "UL", {});
			var ul1_nodes = children(ul1);
			li1 = claim_element(ul1_nodes, "LI", {});
			var li1_nodes = children(li1);
			a1 = claim_element(li1_nodes, "A", { href: true });
			var a1_nodes = children(a1);
			t1 = claim_text(a1_nodes, "\\$\\$.ctx");
			a1_nodes.forEach(detach);
			li1_nodes.forEach(detach);
			li2 = claim_element(ul1_nodes, "LI", {});
			var li2_nodes = children(li2);
			a2 = claim_element(li2_nodes, "A", { href: true });
			var a2_nodes = children(a2);
			t2 = claim_text(a2_nodes, "\\$\\$.dirty");
			a2_nodes.forEach(detach);
			li2_nodes.forEach(detach);
			li3 = claim_element(ul1_nodes, "LI", {});
			var li3_nodes = children(li3);
			a3 = claim_element(li3_nodes, "A", { href: true });
			var a3_nodes = children(a3);
			t3 = claim_text(a3_nodes, "\\$\\$invalidate");
			a3_nodes.forEach(detach);
			li3_nodes.forEach(detach);
			li4 = claim_element(ul1_nodes, "LI", {});
			var li4_nodes = children(li4);
			a4 = claim_element(li4_nodes, "A", { href: true });
			var a4_nodes = children(a4);
			t4 = claim_text(a4_nodes, "schedule_update");
			a4_nodes.forEach(detach);
			li4_nodes.forEach(detach);
			ul0 = claim_element(ul1_nodes, "UL", {});
			var ul0_nodes = children(ul0);
			li5 = claim_element(ul0_nodes, "LI", {});
			var li5_nodes = children(li5);
			a5 = claim_element(li5_nodes, "A", { href: true });
			var a5_nodes = children(a5);
			t5 = claim_text(a5_nodes, "tl/dr:");
			a5_nodes.forEach(detach);
			li5_nodes.forEach(detach);
			ul0_nodes.forEach(detach);
			ul1_nodes.forEach(detach);
			li6 = claim_element(ul8_nodes, "LI", {});
			var li6_nodes = children(li6);
			a6 = claim_element(li6_nodes, "A", { href: true });
			var a6_nodes = children(a6);
			t6 = claim_text(a6_nodes, "v3.16.0");
			a6_nodes.forEach(detach);
			li6_nodes.forEach(detach);
			ul3 = claim_element(ul8_nodes, "UL", {});
			var ul3_nodes = children(ul3);
			li7 = claim_element(ul3_nodes, "LI", {});
			var li7_nodes = children(li7);
			a7 = claim_element(li7_nodes, "A", { href: true });
			var a7_nodes = children(a7);
			t7 = claim_text(a7_nodes, "Bitmask");
			a7_nodes.forEach(detach);
			li7_nodes.forEach(detach);
			li8 = claim_element(ul3_nodes, "LI", {});
			var li8_nodes = children(li8);
			a8 = claim_element(li8_nodes, "A", { href: true });
			var a8_nodes = children(a8);
			t8 = claim_text(a8_nodes, "Bitmask in Svelte");
			a8_nodes.forEach(detach);
			li8_nodes.forEach(detach);
			ul2 = claim_element(ul3_nodes, "UL", {});
			var ul2_nodes = children(ul2);
			li9 = claim_element(ul2_nodes, "LI", {});
			var li9_nodes = children(li9);
			a9 = claim_element(li9_nodes, "A", { href: true });
			var a9_nodes = children(a9);
			t9 = claim_text(a9_nodes, "Destructuring  ");
			a9_nodes.forEach(detach);
			li9_nodes.forEach(detach);
			li10 = claim_element(ul2_nodes, "LI", {});
			var li10_nodes = children(li10);
			a10 = claim_element(li10_nodes, "A", { href: true });
			var a10_nodes = children(a10);
			t10 = claim_text(a10_nodes, "tl/dr:");
			a10_nodes.forEach(detach);
			li10_nodes.forEach(detach);
			ul2_nodes.forEach(detach);
			ul3_nodes.forEach(detach);
			li11 = claim_element(ul8_nodes, "LI", {});
			var li11_nodes = children(li11);
			a11 = claim_element(li11_nodes, "A", { href: true });
			var a11_nodes = children(a11);
			t11 = claim_text(a11_nodes, "Reactive Declaration");
			a11_nodes.forEach(detach);
			li11_nodes.forEach(detach);
			ul5 = claim_element(ul8_nodes, "UL", {});
			var ul5_nodes = children(ul5);
			ul4 = claim_element(ul5_nodes, "UL", {});
			var ul4_nodes = children(ul4);
			li12 = claim_element(ul4_nodes, "LI", {});
			var li12_nodes = children(li12);
			a12 = claim_element(li12_nodes, "A", { href: true });
			var a12_nodes = children(a12);
			t12 = claim_text(a12_nodes, "1. Execution of all reactive declarations and statements are batched");
			a12_nodes.forEach(detach);
			li12_nodes.forEach(detach);
			li13 = claim_element(ul4_nodes, "LI", {});
			var li13_nodes = children(li13);
			a13 = claim_element(li13_nodes, "A", { href: true });
			var a13_nodes = children(a13);
			t13 = claim_text(a13_nodes, "2. The value of reactive variable outside of reactive declarations and statements may not be up to date");
			a13_nodes.forEach(detach);
			li13_nodes.forEach(detach);
			ul4_nodes.forEach(detach);
			li14 = claim_element(ul5_nodes, "LI", {});
			var li14_nodes = children(li14);
			a14 = claim_element(li14_nodes, "A", { href: true });
			var a14_nodes = children(a14);
			t14 = claim_text(a14_nodes, "Sorting of reactive declarations and statements");
			a14_nodes.forEach(detach);
			li14_nodes.forEach(detach);
			li15 = claim_element(ul5_nodes, "LI", {});
			var li15_nodes = children(li15);
			a15 = claim_element(li15_nodes, "A", { href: true });
			var a15_nodes = children(a15);
			t15 = claim_text(a15_nodes, "Reactive variable that is not reactive");
			a15_nodes.forEach(detach);
			li15_nodes.forEach(detach);
			ul5_nodes.forEach(detach);
			li16 = claim_element(ul8_nodes, "LI", {});
			var li16_nodes = children(li16);
			a16 = claim_element(li16_nodes, "A", { href: true });
			var a16_nodes = children(a16);
			t16 = claim_text(a16_nodes, "Summary");
			a16_nodes.forEach(detach);
			li16_nodes.forEach(detach);
			ul7 = claim_element(ul8_nodes, "UL", {});
			var ul7_nodes = children(ul7);
			ul6 = claim_element(ul7_nodes, "UL", {});
			var ul6_nodes = children(ul6);
			li17 = claim_element(ul6_nodes, "LI", {});
			var li17_nodes = children(li17);
			a17 = claim_element(li17_nodes, "A", { href: true });
			var a17_nodes = children(a17);
			t17 = claim_text(a17_nodes, "1. Svelte keeps track of which variables are dirty and batched the DOM updates.");
			a17_nodes.forEach(detach);
			li17_nodes.forEach(detach);
			li18 = claim_element(ul6_nodes, "LI", {});
			var li18_nodes = children(li18);
			a18 = claim_element(li18_nodes, "A", { href: true });
			var a18_nodes = children(a18);
			t18 = claim_text(a18_nodes, "2. Using bitmask, Svelte able to generate a more compact compiled code.");
			a18_nodes.forEach(detach);
			li18_nodes.forEach(detach);
			li19 = claim_element(ul6_nodes, "LI", {});
			var li19_nodes = children(li19);
			a19 = claim_element(li19_nodes, "A", { href: true });
			var a19_nodes = children(a19);
			t19 = claim_text(a19_nodes, "3. Reactive declarations and statements are executed in batch, just like DOM updates");
			a19_nodes.forEach(detach);
			li19_nodes.forEach(detach);
			ul6_nodes.forEach(detach);
			ul7_nodes.forEach(detach);
			li20 = claim_element(ul8_nodes, "LI", {});
			var li20_nodes = children(li20);
			a20 = claim_element(li20_nodes, "A", { href: true });
			var a20_nodes = children(a20);
			t20 = claim_text(a20_nodes, "Closing Note");
			a20_nodes.forEach(detach);
			li20_nodes.forEach(detach);
			li21 = claim_element(ul8_nodes, "LI", {});
			var li21_nodes = children(li21);
			a21 = claim_element(li21_nodes, "A", { href: true });
			var a21_nodes = children(a21);
			t21 = claim_text(a21_nodes, "Further Resources");
			a21_nodes.forEach(detach);
			li21_nodes.forEach(detach);
			ul8_nodes.forEach(detach);
			section0_nodes.forEach(detach);
			t22 = claim_space(nodes);
			p0 = claim_element(nodes, "P", {});
			var p0_nodes = children(p0);
			strong0 = claim_element(p0_nodes, "STRONG", {});
			var strong0_nodes = children(strong0);
			t23 = claim_text(strong0_nodes, "⬅ ⬅  Previously in ");
			a22 = claim_element(strong0_nodes, "A", { href: true });
			var a22_nodes = children(a22);
			t24 = claim_text(a22_nodes, "Part 1");
			a22_nodes.forEach(detach);
			t25 = claim_text(strong0_nodes, ".");
			strong0_nodes.forEach(detach);
			p0_nodes.forEach(detach);
			t26 = claim_space(nodes);
			p1 = claim_element(nodes, "P", {});
			var p1_nodes = children(p1);
			a23 = claim_element(p1_nodes, "A", { href: true });
			var a23_nodes = children(a23);
			t27 = claim_text(a23_nodes, "Previously");
			a23_nodes.forEach(detach);
			t28 = claim_text(p1_nodes, ", when I mentioned the ");
			code0 = claim_element(p1_nodes, "CODE", {});
			var code0_nodes = children(code0);
			t29 = claim_text(code0_nodes, "$$invalidate");
			code0_nodes.forEach(detach);
			t30 = claim_text(p1_nodes, " function, I explained that the ");
			code1 = claim_element(p1_nodes, "CODE", {});
			var code1_nodes = children(code1);
			t31 = claim_text(code1_nodes, "$$invalidate");
			code1_nodes.forEach(detach);
			t32 = claim_text(p1_nodes, " function works conceptually like the following:");
			p1_nodes.forEach(detach);
			t33 = claim_space(nodes);
			pre0 = claim_element(nodes, "PRE", { class: true });
			var pre0_nodes = children(pre0);
			pre0_nodes.forEach(detach);
			t34 = claim_space(nodes);
			p2 = claim_element(nodes, "P", {});
			var p2_nodes = children(p2);
			t35 = claim_text(p2_nodes, "but that's not the exact implementation of the ");
			code2 = claim_element(p2_nodes, "CODE", {});
			var code2_nodes = children(code2);
			t36 = claim_text(code2_nodes, "$$invaldiate");
			code2_nodes.forEach(detach);
			t37 = claim_text(p2_nodes, " function. So in this article, we are going to look at how ");
			code3 = claim_element(p2_nodes, "CODE", {});
			var code3_nodes = children(code3);
			t38 = claim_text(code3_nodes, "$$invalidate");
			code3_nodes.forEach(detach);
			t39 = claim_text(p2_nodes, " is implemented in Svelte.");
			p2_nodes.forEach(detach);
			t40 = claim_space(nodes);
			p3 = claim_element(nodes, "P", {});
			var p3_nodes = children(p3);
			t41 = claim_text(p3_nodes, "At the point of writing, Svelte is at ");
			a24 = claim_element(p3_nodes, "A", { href: true, rel: true });
			var a24_nodes = children(a24);
			t42 = claim_text(a24_nodes, "v3.20.1");
			a24_nodes.forEach(detach);
			t43 = claim_text(p3_nodes, ".");
			p3_nodes.forEach(detach);
			t44 = claim_space(nodes);
			section1 = claim_element(nodes, "SECTION", {});
			var section1_nodes = children(section1);
			h20 = claim_element(section1_nodes, "H2", {});
			var h20_nodes = children(h20);
			a25 = claim_element(h20_nodes, "A", { href: true, id: true });
			var a25_nodes = children(a25);
			t45 = claim_text(a25_nodes, "Pre v3.16.0");
			a25_nodes.forEach(detach);
			h20_nodes.forEach(detach);
			t46 = claim_space(section1_nodes);
			p4 = claim_element(section1_nodes, "P", {});
			var p4_nodes = children(p4);
			t47 = claim_text(p4_nodes, "There's a big optimisation that changes the underlying implementation of the ");
			code4 = claim_element(p4_nodes, "CODE", {});
			var code4_nodes = children(code4);
			t48 = claim_text(code4_nodes, "$$invalidate");
			code4_nodes.forEach(detach);
			t49 = claim_text(p4_nodes, " function in ");
			a26 = claim_element(p4_nodes, "A", { href: true, rel: true });
			var a26_nodes = children(a26);
			t50 = claim_text(a26_nodes, "v3.16.0");
			a26_nodes.forEach(detach);
			t51 = claim_text(p4_nodes, ", namely in ");
			a27 = claim_element(p4_nodes, "A", { href: true, rel: true });
			var a27_nodes = children(a27);
			t52 = claim_text(a27_nodes, "#3945");
			a27_nodes.forEach(detach);
			t53 = claim_text(p4_nodes, ". The underlying concept doesn't change, but it'll be much easier to understand about ");
			code5 = claim_element(p4_nodes, "CODE", {});
			var code5_nodes = children(code5);
			t54 = claim_text(code5_nodes, "$$invalidate");
			code5_nodes.forEach(detach);
			t55 = claim_text(p4_nodes, " prior the change and learn about the optimisation change separately.");
			p4_nodes.forEach(detach);
			t56 = claim_space(section1_nodes);
			p5 = claim_element(section1_nodes, "P", {});
			var p5_nodes = children(p5);
			t57 = claim_text(p5_nodes, "Let's explain some of the variables that you are going to see, some of which was introduced in ");
			a28 = claim_element(p5_nodes, "A", { href: true });
			var a28_nodes = children(a28);
			t58 = claim_text(a28_nodes, "Part 1");
			a28_nodes.forEach(detach);
			t59 = claim_text(p5_nodes, ":");
			p5_nodes.forEach(detach);
			section1_nodes.forEach(detach);
			t60 = claim_space(nodes);
			section2 = claim_element(nodes, "SECTION", {});
			var section2_nodes = children(section2);
			h30 = claim_element(section2_nodes, "H3", {});
			var h30_nodes = children(h30);
			a29 = claim_element(h30_nodes, "A", { href: true, id: true });
			var a29_nodes = children(a29);
			t61 = claim_text(a29_nodes, "\\$\\$.ctx");
			a29_nodes.forEach(detach);
			h30_nodes.forEach(detach);
			t62 = claim_space(section2_nodes);
			p6 = claim_element(section2_nodes, "P", {});
			var p6_nodes = children(p6);
			t63 = claim_text(p6_nodes, "There's no official name for it. You can call it ");
			strong1 = claim_element(p6_nodes, "STRONG", {});
			var strong1_nodes = children(strong1);
			t64 = claim_text(strong1_nodes, "context");
			strong1_nodes.forEach(detach);
			t65 = claim_text(p6_nodes, " as it is the context which the template is based on to render onto the DOM.");
			p6_nodes.forEach(detach);
			t66 = claim_space(section2_nodes);
			p7 = claim_element(section2_nodes, "P", {});
			var p7_nodes = children(p7);
			t67 = claim_text(p7_nodes, "I called it ");
			a30 = claim_element(p7_nodes, "A", { href: true });
			var a30_nodes = children(a30);
			t68 = claim_text(a30_nodes, "instance variables");
			a30_nodes.forEach(detach);
			t69 = claim_text(p7_nodes, ". As it is a JavaScript Object that contains all the variables that you:");
			p7_nodes.forEach(detach);
			t70 = claim_space(section2_nodes);
			ul9 = claim_element(section2_nodes, "UL", {});
			var ul9_nodes = children(ul9);
			li22 = claim_element(ul9_nodes, "LI", {});
			var li22_nodes = children(li22);
			t71 = claim_text(li22_nodes, "declared in the ");
			code6 = claim_element(li22_nodes, "CODE", {});
			var code6_nodes = children(code6);
			t72 = claim_text(code6_nodes, "<script>");
			code6_nodes.forEach(detach);
			t73 = claim_text(li22_nodes, " tag");
			li22_nodes.forEach(detach);
			t74 = claim_space(ul9_nodes);
			li23 = claim_element(ul9_nodes, "LI", {});
			var li23_nodes = children(li23);
			t75 = claim_text(li23_nodes, "mutated or reassigned");
			li23_nodes.forEach(detach);
			t76 = claim_space(ul9_nodes);
			li24 = claim_element(ul9_nodes, "LI", {});
			var li24_nodes = children(li24);
			t77 = claim_text(li24_nodes, "referenced in the template");
			li24_nodes.forEach(detach);
			ul9_nodes.forEach(detach);
			t78 = claim_space(section2_nodes);
			p8 = claim_element(section2_nodes, "P", {});
			var p8_nodes = children(p8);
			t79 = claim_text(p8_nodes, "that belongs to a component instance.");
			p8_nodes.forEach(detach);
			t80 = claim_space(section2_nodes);
			p9 = claim_element(section2_nodes, "P", {});
			var p9_nodes = children(p9);
			t81 = claim_text(p9_nodes, "The instance variables themselves can be of a primitive value, object, array or function.");
			p9_nodes.forEach(detach);
			t82 = claim_space(section2_nodes);
			p10 = claim_element(section2_nodes, "P", {});
			var p10_nodes = children(p10);
			t83 = claim_text(p10_nodes, "The ");
			code7 = claim_element(p10_nodes, "CODE", {});
			var code7_nodes = children(code7);
			t84 = claim_text(code7_nodes, "instance");
			code7_nodes.forEach(detach);
			t85 = claim_text(p10_nodes, " function creates and returns the ");
			code8 = claim_element(p10_nodes, "CODE", {});
			var code8_nodes = children(code8);
			t86 = claim_text(code8_nodes, "ctx");
			code8_nodes.forEach(detach);
			t87 = claim_text(p10_nodes, " object.");
			p10_nodes.forEach(detach);
			t88 = claim_space(section2_nodes);
			p11 = claim_element(section2_nodes, "P", {});
			var p11_nodes = children(p11);
			t89 = claim_text(p11_nodes, "Functions declared in the ");
			code9 = claim_element(p11_nodes, "CODE", {});
			var code9_nodes = children(code9);
			t90 = claim_text(code9_nodes, "<script>");
			code9_nodes.forEach(detach);
			t91 = claim_text(p11_nodes, " tag will refer to the instance variable that is scoped withn the ");
			code10 = claim_element(p11_nodes, "CODE", {});
			var code10_nodes = children(code10);
			t92 = claim_text(code10_nodes, "instance");
			code10_nodes.forEach(detach);
			t93 = claim_text(p11_nodes, " function closure:");
			p11_nodes.forEach(detach);
			t94 = claim_space(section2_nodes);
			pre1 = claim_element(section2_nodes, "PRE", { class: true });
			var pre1_nodes = children(pre1);
			pre1_nodes.forEach(detach);
			t95 = claim_space(section2_nodes);
			p12 = claim_element(section2_nodes, "P", {});
			var p12_nodes = children(p12);
			a31 = claim_element(p12_nodes, "A", { href: true, rel: true });
			var a31_nodes = children(a31);
			t96 = claim_text(a31_nodes, "Svelte REPL");
			a31_nodes.forEach(detach);
			p12_nodes.forEach(detach);
			t97 = claim_space(section2_nodes);
			pre2 = claim_element(section2_nodes, "PRE", { class: true });
			var pre2_nodes = children(pre2);
			pre2_nodes.forEach(detach);
			t98 = claim_space(section2_nodes);
			p13 = claim_element(section2_nodes, "P", {});
			var p13_nodes = children(p13);
			t99 = claim_text(p13_nodes, "Whenever a new instance of a component is created, the ");
			code11 = claim_element(p13_nodes, "CODE", {});
			var code11_nodes = children(code11);
			t100 = claim_text(code11_nodes, "instance");
			code11_nodes.forEach(detach);
			t101 = claim_text(p13_nodes, " function is called and the ");
			code12 = claim_element(p13_nodes, "CODE", {});
			var code12_nodes = children(code12);
			t102 = claim_text(code12_nodes, "ctx");
			code12_nodes.forEach(detach);
			t103 = claim_text(p13_nodes, " object is created and captured within a new closure scope.");
			p13_nodes.forEach(detach);
			section2_nodes.forEach(detach);
			t104 = claim_space(nodes);
			section3 = claim_element(nodes, "SECTION", {});
			var section3_nodes = children(section3);
			h31 = claim_element(section3_nodes, "H3", {});
			var h31_nodes = children(h31);
			a32 = claim_element(h31_nodes, "A", { href: true, id: true });
			var a32_nodes = children(a32);
			t105 = claim_text(a32_nodes, "\\$\\$.dirty");
			a32_nodes.forEach(detach);
			h31_nodes.forEach(detach);
			t106 = claim_space(section3_nodes);
			p14 = claim_element(section3_nodes, "P", {});
			var p14_nodes = children(p14);
			code13 = claim_element(p14_nodes, "CODE", {});
			var code13_nodes = children(code13);
			t107 = claim_text(code13_nodes, "$$.dirty");
			code13_nodes.forEach(detach);
			t108 = claim_text(p14_nodes, " is a object that is used to track which instance variable had just changed and needs to be updated onto the DOM.");
			p14_nodes.forEach(detach);
			t109 = claim_space(section3_nodes);
			p15 = claim_element(section3_nodes, "P", {});
			var p15_nodes = children(p15);
			t110 = claim_text(p15_nodes, "For example, in the following Svelte component:");
			p15_nodes.forEach(detach);
			t111 = claim_space(section3_nodes);
			pre3 = claim_element(section3_nodes, "PRE", { class: true });
			var pre3_nodes = children(pre3);
			pre3_nodes.forEach(detach);
			t112 = claim_space(section3_nodes);
			p16 = claim_element(section3_nodes, "P", {});
			var p16_nodes = children(p16);
			a33 = claim_element(p16_nodes, "A", { href: true, rel: true });
			var a33_nodes = children(a33);
			t113 = claim_text(a33_nodes, "Svelte REPL");
			a33_nodes.forEach(detach);
			p16_nodes.forEach(detach);
			t114 = claim_space(section3_nodes);
			p17 = claim_element(section3_nodes, "P", {});
			var p17_nodes = children(p17);
			t115 = claim_text(p17_nodes, "The initial ");
			code14 = claim_element(p17_nodes, "CODE", {});
			var code14_nodes = children(code14);
			t116 = claim_text(code14_nodes, "$$.dirty");
			code14_nodes.forEach(detach);
			t117 = claim_text(p17_nodes, " is ");
			code15 = claim_element(p17_nodes, "CODE", {});
			var code15_nodes = children(code15);
			t118 = claim_text(code15_nodes, "null");
			code15_nodes.forEach(detach);
			t119 = claim_text(p17_nodes, " (");
			a34 = claim_element(p17_nodes, "A", { href: true, rel: true });
			var a34_nodes = children(a34);
			t120 = claim_text(a34_nodes, "source code");
			a34_nodes.forEach(detach);
			t121 = claim_text(p17_nodes, ").");
			p17_nodes.forEach(detach);
			t122 = claim_space(section3_nodes);
			p18 = claim_element(section3_nodes, "P", {});
			var p18_nodes = children(p18);
			t123 = claim_text(p18_nodes, "If you clicked on the ");
			strong2 = claim_element(p18_nodes, "STRONG", {});
			var strong2_nodes = children(strong2);
			t124 = claim_text(strong2_nodes, "\"+ Agility\"");
			strong2_nodes.forEach(detach);
			t125 = claim_text(p18_nodes, " button, ");
			code16 = claim_element(p18_nodes, "CODE", {});
			var code16_nodes = children(code16);
			t126 = claim_text(code16_nodes, "$$.dirty");
			code16_nodes.forEach(detach);
			t127 = claim_text(p18_nodes, " will turn into:");
			p18_nodes.forEach(detach);
			t128 = claim_space(section3_nodes);
			pre4 = claim_element(section3_nodes, "PRE", { class: true });
			var pre4_nodes = children(pre4);
			pre4_nodes.forEach(detach);
			t129 = claim_space(section3_nodes);
			p19 = claim_element(section3_nodes, "P", {});
			var p19_nodes = children(p19);
			t130 = claim_text(p19_nodes, "If you clicked on the ");
			strong3 = claim_element(p19_nodes, "STRONG", {});
			var strong3_nodes = children(strong3);
			t131 = claim_text(strong3_nodes, "\"Level Up\"");
			strong3_nodes.forEach(detach);
			t132 = claim_text(p19_nodes, " button, ");
			code17 = claim_element(p19_nodes, "CODE", {});
			var code17_nodes = children(code17);
			t133 = claim_text(code17_nodes, "$$.dirty");
			code17_nodes.forEach(detach);
			t134 = claim_text(p19_nodes, " will turn into:");
			p19_nodes.forEach(detach);
			t135 = claim_space(section3_nodes);
			pre5 = claim_element(section3_nodes, "PRE", { class: true });
			var pre5_nodes = children(pre5);
			pre5_nodes.forEach(detach);
			t136 = claim_space(section3_nodes);
			p20 = claim_element(section3_nodes, "P", {});
			var p20_nodes = children(p20);
			code18 = claim_element(p20_nodes, "CODE", {});
			var code18_nodes = children(code18);
			t137 = claim_text(code18_nodes, "$$.dirty");
			code18_nodes.forEach(detach);
			t138 = claim_text(p20_nodes, " is useful for Svelte, so that it doesn't update the DOM unnecessarily.");
			p20_nodes.forEach(detach);
			t139 = claim_space(section3_nodes);
			p21 = claim_element(section3_nodes, "P", {});
			var p21_nodes = children(p21);
			t140 = claim_text(p21_nodes, "If you looked at the ");
			strong4 = claim_element(p21_nodes, "STRONG", {});
			var strong4_nodes = children(strong4);
			t141 = claim_text(strong4_nodes, "p (u_p_date)");
			strong4_nodes.forEach(detach);
			t142 = claim_text(p21_nodes, " function of the compiled code, you will see Svelte checks whether a variable is marked in ");
			code19 = claim_element(p21_nodes, "CODE", {});
			var code19_nodes = children(code19);
			t143 = claim_text(code19_nodes, "$$.dirty");
			code19_nodes.forEach(detach);
			t144 = claim_text(p21_nodes, ", before updating the DOM.");
			p21_nodes.forEach(detach);
			t145 = claim_space(section3_nodes);
			pre6 = claim_element(section3_nodes, "PRE", { class: true });
			var pre6_nodes = children(pre6);
			pre6_nodes.forEach(detach);
			t146 = claim_space(section3_nodes);
			p22 = claim_element(section3_nodes, "P", {});
			var p22_nodes = children(p22);
			t147 = claim_text(p22_nodes, "After Svelte updates the DOM, the ");
			code20 = claim_element(p22_nodes, "CODE", {});
			var code20_nodes = children(code20);
			t148 = claim_text(code20_nodes, "$$.dirty");
			code20_nodes.forEach(detach);
			t149 = claim_text(p22_nodes, " is set back to ");
			code21 = claim_element(p22_nodes, "CODE", {});
			var code21_nodes = children(code21);
			t150 = claim_text(code21_nodes, "null");
			code21_nodes.forEach(detach);
			t151 = claim_text(p22_nodes, " to indicate all changes has been applied onto the DOM.");
			p22_nodes.forEach(detach);
			section3_nodes.forEach(detach);
			t152 = claim_space(nodes);
			section4 = claim_element(nodes, "SECTION", {});
			var section4_nodes = children(section4);
			h32 = claim_element(section4_nodes, "H3", {});
			var h32_nodes = children(h32);
			a35 = claim_element(h32_nodes, "A", { href: true, id: true });
			var a35_nodes = children(a35);
			t153 = claim_text(a35_nodes, "\\$\\$invalidate");
			a35_nodes.forEach(detach);
			h32_nodes.forEach(detach);
			t154 = claim_space(section4_nodes);
			p23 = claim_element(section4_nodes, "P", {});
			var p23_nodes = children(p23);
			code22 = claim_element(p23_nodes, "CODE", {});
			var code22_nodes = children(code22);
			t155 = claim_text(code22_nodes, "$$invalidate");
			code22_nodes.forEach(detach);
			t156 = claim_text(p23_nodes, " is the secret behind reactivity in Svelte.");
			p23_nodes.forEach(detach);
			t157 = claim_space(section4_nodes);
			p24 = claim_element(section4_nodes, "P", {});
			var p24_nodes = children(p24);
			t158 = claim_text(p24_nodes, "Whenever a variable is");
			p24_nodes.forEach(detach);
			t159 = claim_space(section4_nodes);
			ul10 = claim_element(section4_nodes, "UL", {});
			var ul10_nodes = children(ul10);
			li25 = claim_element(ul10_nodes, "LI", {});
			var li25_nodes = children(li25);
			t160 = claim_text(li25_nodes, "reassigned ");
			code23 = claim_element(li25_nodes, "CODE", {});
			var code23_nodes = children(code23);
			t161 = claim_text(code23_nodes, "(foo = 1)");
			code23_nodes.forEach(detach);
			li25_nodes.forEach(detach);
			t162 = claim_space(ul10_nodes);
			li26 = claim_element(ul10_nodes, "LI", {});
			var li26_nodes = children(li26);
			t163 = claim_text(li26_nodes, "mutated ");
			code24 = claim_element(li26_nodes, "CODE", {});
			var code24_nodes = children(code24);
			t164 = claim_text(code24_nodes, "(foo.bar = 1)");
			code24_nodes.forEach(detach);
			li26_nodes.forEach(detach);
			ul10_nodes.forEach(detach);
			t165 = claim_space(section4_nodes);
			p25 = claim_element(section4_nodes, "P", {});
			var p25_nodes = children(p25);
			t166 = claim_text(p25_nodes, "Svelte will wrap the assignment or update around with the ");
			code25 = claim_element(p25_nodes, "CODE", {});
			var code25_nodes = children(code25);
			t167 = claim_text(code25_nodes, "$$invalidate");
			code25_nodes.forEach(detach);
			t168 = claim_text(p25_nodes, " function:");
			p25_nodes.forEach(detach);
			t169 = claim_space(section4_nodes);
			pre7 = claim_element(section4_nodes, "PRE", { class: true });
			var pre7_nodes = children(pre7);
			pre7_nodes.forEach(detach);
			t170 = claim_space(section4_nodes);
			p26 = claim_element(section4_nodes, "P", {});
			var p26_nodes = children(p26);
			t171 = claim_text(p26_nodes, "the ");
			code26 = claim_element(p26_nodes, "CODE", {});
			var code26_nodes = children(code26);
			t172 = claim_text(code26_nodes, "$$invalidate");
			code26_nodes.forEach(detach);
			t173 = claim_text(p26_nodes, " function will:");
			p26_nodes.forEach(detach);
			t174 = claim_space(section4_nodes);
			ol0 = claim_element(section4_nodes, "OL", {});
			var ol0_nodes = children(ol0);
			li27 = claim_element(ol0_nodes, "LI", {});
			var li27_nodes = children(li27);
			t175 = claim_text(li27_nodes, "update the variable in ");
			code27 = claim_element(li27_nodes, "CODE", {});
			var code27_nodes = children(code27);
			t176 = claim_text(code27_nodes, "$$.ctx");
			code27_nodes.forEach(detach);
			li27_nodes.forEach(detach);
			t177 = claim_space(ol0_nodes);
			li28 = claim_element(ol0_nodes, "LI", {});
			var li28_nodes = children(li28);
			t178 = claim_text(li28_nodes, "mark the variable in ");
			code28 = claim_element(li28_nodes, "CODE", {});
			var code28_nodes = children(code28);
			t179 = claim_text(code28_nodes, "$$.dirty");
			code28_nodes.forEach(detach);
			li28_nodes.forEach(detach);
			t180 = claim_space(ol0_nodes);
			li29 = claim_element(ol0_nodes, "LI", {});
			var li29_nodes = children(li29);
			t181 = claim_text(li29_nodes, "schedule an update");
			li29_nodes.forEach(detach);
			t182 = claim_space(ol0_nodes);
			li30 = claim_element(ol0_nodes, "LI", {});
			var li30_nodes = children(li30);
			t183 = claim_text(li30_nodes, "return the value of the assignment or update expression");
			li30_nodes.forEach(detach);
			ol0_nodes.forEach(detach);
			t184 = claim_space(section4_nodes);
			pre8 = claim_element(section4_nodes, "PRE", { class: true });
			var pre8_nodes = children(pre8);
			pre8_nodes.forEach(detach);
			t185 = claim_space(section4_nodes);
			p27 = claim_element(section4_nodes, "P", {});
			var p27_nodes = children(p27);
			a36 = claim_element(p27_nodes, "A", { href: true, rel: true });
			var a36_nodes = children(a36);
			t186 = claim_text(a36_nodes, "Source code");
			a36_nodes.forEach(detach);
			p27_nodes.forEach(detach);
			t187 = claim_space(section4_nodes);
			p28 = claim_element(section4_nodes, "P", {});
			var p28_nodes = children(p28);
			t188 = claim_text(p28_nodes, "One interesting note about the function ");
			code29 = claim_element(p28_nodes, "CODE", {});
			var code29_nodes = children(code29);
			t189 = claim_text(code29_nodes, "$$invalidate");
			code29_nodes.forEach(detach);
			t190 = claim_text(p28_nodes, " is that, it wraps around the assignment or update expression and returns what the expression evaluates to.");
			p28_nodes.forEach(detach);
			t191 = claim_space(section4_nodes);
			p29 = claim_element(section4_nodes, "P", {});
			var p29_nodes = children(p29);
			t192 = claim_text(p29_nodes, "This makes ");
			code30 = claim_element(p29_nodes, "CODE", {});
			var code30_nodes = children(code30);
			t193 = claim_text(code30_nodes, "$$invalidate");
			code30_nodes.forEach(detach);
			t194 = claim_text(p29_nodes, " chainable:");
			p29_nodes.forEach(detach);
			t195 = claim_space(section4_nodes);
			pre9 = claim_element(section4_nodes, "PRE", { class: true });
			var pre9_nodes = children(pre9);
			pre9_nodes.forEach(detach);
			t196 = claim_space(section4_nodes);
			p30 = claim_element(section4_nodes, "P", {});
			var p30_nodes = children(p30);
			t197 = claim_text(p30_nodes, "It seemed complex when there's a lot of assignment or update expressions in 1 statement! 🙈");
			p30_nodes.forEach(detach);
			t198 = claim_space(section4_nodes);
			p31 = claim_element(section4_nodes, "P", {});
			var p31_nodes = children(p31);
			t199 = claim_text(p31_nodes, "The 2nd argument of ");
			code31 = claim_element(p31_nodes, "CODE", {});
			var code31_nodes = children(code31);
			t200 = claim_text(code31_nodes, "$$invalidate");
			code31_nodes.forEach(detach);
			t201 = claim_text(p31_nodes, " is the assignment or update expressions verbatim. But if it contains any assignment or update sub-expressions, we recursively wrap it with ");
			code32 = claim_element(p31_nodes, "CODE", {});
			var code32_nodes = children(code32);
			t202 = claim_text(code32_nodes, "$$invalidate");
			code32_nodes.forEach(detach);
			t203 = claim_text(p31_nodes, ".");
			p31_nodes.forEach(detach);
			t204 = claim_space(section4_nodes);
			p32 = claim_element(section4_nodes, "P", {});
			var p32_nodes = children(p32);
			t205 = claim_text(p32_nodes, "In case where the assignment expression changes a property of an object, we pass the object in as a 3rd argument of the ");
			code33 = claim_element(p32_nodes, "CODE", {});
			var code33_nodes = children(code33);
			t206 = claim_text(code33_nodes, "$$invalidate");
			code33_nodes.forEach(detach);
			t207 = claim_text(p32_nodes, " function, eg:");
			p32_nodes.forEach(detach);
			t208 = claim_space(section4_nodes);
			pre10 = claim_element(section4_nodes, "PRE", { class: true });
			var pre10_nodes = children(pre10);
			pre10_nodes.forEach(detach);
			t209 = claim_space(section4_nodes);
			p33 = claim_element(section4_nodes, "P", {});
			var p33_nodes = children(p33);
			t210 = claim_text(p33_nodes, "So that, we update the ");
			code34 = claim_element(p33_nodes, "CODE", {});
			var code34_nodes = children(code34);
			t211 = claim_text(code34_nodes, "\"obj\"");
			code34_nodes.forEach(detach);
			t212 = claim_text(p33_nodes, " variable to ");
			code35 = claim_element(p33_nodes, "CODE", {});
			var code35_nodes = children(code35);
			t213 = claim_text(code35_nodes, "obj");
			code35_nodes.forEach(detach);
			t214 = claim_text(p33_nodes, " instead of the value of the 2nd argument, ");
			code36 = claim_element(p33_nodes, "CODE", {});
			var code36_nodes = children(code36);
			t215 = claim_text(code36_nodes, "\"hello\"");
			code36_nodes.forEach(detach);
			t216 = claim_text(p33_nodes, ".");
			p33_nodes.forEach(detach);
			section4_nodes.forEach(detach);
			t217 = claim_space(nodes);
			section5 = claim_element(nodes, "SECTION", {});
			var section5_nodes = children(section5);
			h33 = claim_element(section5_nodes, "H3", {});
			var h33_nodes = children(h33);
			a37 = claim_element(h33_nodes, "A", { href: true, id: true });
			var a37_nodes = children(a37);
			t218 = claim_text(a37_nodes, "schedule_update");
			a37_nodes.forEach(detach);
			h33_nodes.forEach(detach);
			t219 = claim_space(section5_nodes);
			p34 = claim_element(section5_nodes, "P", {});
			var p34_nodes = children(p34);
			code37 = claim_element(p34_nodes, "CODE", {});
			var code37_nodes = children(code37);
			t220 = claim_text(code37_nodes, "schedule_update");
			code37_nodes.forEach(detach);
			t221 = claim_text(p34_nodes, " schedules Svelte to update the DOM with the changes made thus far.");
			p34_nodes.forEach(detach);
			t222 = claim_space(section5_nodes);
			p35 = claim_element(section5_nodes, "P", {});
			var p35_nodes = children(p35);
			t223 = claim_text(p35_nodes, "Svelte, at the point of writing (");
			a38 = claim_element(p35_nodes, "A", { href: true, rel: true });
			var a38_nodes = children(a38);
			t224 = claim_text(a38_nodes, "v3.20.1");
			a38_nodes.forEach(detach);
			t225 = claim_text(p35_nodes, "), uses ");
			a39 = claim_element(p35_nodes, "A", { href: true, rel: true });
			var a39_nodes = children(a39);
			t226 = claim_text(a39_nodes, "microtask queue");
			a39_nodes.forEach(detach);
			t227 = claim_text(p35_nodes, " to batch change updates. The actual DOM update happens in the next microtask, so that any synchronous ");
			code38 = claim_element(p35_nodes, "CODE", {});
			var code38_nodes = children(code38);
			t228 = claim_text(code38_nodes, "$$invalidate");
			code38_nodes.forEach(detach);
			t229 = claim_text(p35_nodes, " operations that happen within the same task get batched into the next DOM update.");
			p35_nodes.forEach(detach);
			t230 = claim_space(section5_nodes);
			p36 = claim_element(section5_nodes, "P", {});
			var p36_nodes = children(p36);
			t231 = claim_text(p36_nodes, "To schedule a next microtask, Svelte uses the Promise callback.");
			p36_nodes.forEach(detach);
			t232 = claim_space(section5_nodes);
			pre11 = claim_element(section5_nodes, "PRE", { class: true });
			var pre11_nodes = children(pre11);
			pre11_nodes.forEach(detach);
			t233 = claim_space(section5_nodes);
			p37 = claim_element(section5_nodes, "P", {});
			var p37_nodes = children(p37);
			t234 = claim_text(p37_nodes, "In ");
			code39 = claim_element(p37_nodes, "CODE", {});
			var code39_nodes = children(code39);
			t235 = claim_text(code39_nodes, "flush");
			code39_nodes.forEach(detach);
			t236 = claim_text(p37_nodes, ", we call update for each component marked dirty:");
			p37_nodes.forEach(detach);
			t237 = claim_space(section5_nodes);
			pre12 = claim_element(section5_nodes, "PRE", { class: true });
			var pre12_nodes = children(pre12);
			pre12_nodes.forEach(detach);
			t238 = claim_space(section5_nodes);
			p38 = claim_element(section5_nodes, "P", {});
			var p38_nodes = children(p38);
			a40 = claim_element(p38_nodes, "A", { href: true, rel: true });
			var a40_nodes = children(a40);
			t239 = claim_text(a40_nodes, "Source code");
			a40_nodes.forEach(detach);
			p38_nodes.forEach(detach);
			t240 = claim_space(section5_nodes);
			p39 = claim_element(section5_nodes, "P", {});
			var p39_nodes = children(p39);
			t241 = claim_text(p39_nodes, "So, if you write a Svelte component like this:");
			p39_nodes.forEach(detach);
			t242 = claim_space(section5_nodes);
			pre13 = claim_element(section5_nodes, "PRE", { class: true });
			var pre13_nodes = children(pre13);
			pre13_nodes.forEach(detach);
			t243 = claim_space(section5_nodes);
			p40 = claim_element(section5_nodes, "P", {});
			var p40_nodes = children(p40);
			a41 = claim_element(p40_nodes, "A", { href: true, rel: true });
			var a41_nodes = children(a41);
			t244 = claim_text(a41_nodes, "Svelte REPL");
			a41_nodes.forEach(detach);
			p40_nodes.forEach(detach);
			t245 = claim_space(section5_nodes);
			p41 = claim_element(section5_nodes, "P", {});
			var p41_nodes = children(p41);
			t246 = claim_text(p41_nodes, "The DOM update for the ");
			code40 = claim_element(p41_nodes, "CODE", {});
			var code40_nodes = children(code40);
			t247 = claim_text(code40_nodes, "givenName");
			code40_nodes.forEach(detach);
			t248 = claim_text(p41_nodes, " and ");
			code41 = claim_element(p41_nodes, "CODE", {});
			var code41_nodes = children(code41);
			t249 = claim_text(code41_nodes, "familyName");
			code41_nodes.forEach(detach);
			t250 = claim_text(p41_nodes, " happens in the same microtask:");
			p41_nodes.forEach(detach);
			t251 = claim_space(section5_nodes);
			ol1 = claim_element(section5_nodes, "OL", {});
			var ol1_nodes = children(ol1);
			li31 = claim_element(ol1_nodes, "LI", {});
			var li31_nodes = children(li31);
			t252 = claim_text(li31_nodes, "Click on the ");
			strong5 = claim_element(li31_nodes, "STRONG", {});
			var strong5_nodes = children(strong5);
			t253 = claim_text(strong5_nodes, "\"Update\"");
			strong5_nodes.forEach(detach);
			t254 = claim_text(li31_nodes, " to call the ");
			code42 = claim_element(li31_nodes, "CODE", {});
			var code42_nodes = children(code42);
			t255 = claim_text(code42_nodes, "update");
			code42_nodes.forEach(detach);
			t256 = claim_text(li31_nodes, " function");
			li31_nodes.forEach(detach);
			t257 = claim_space(ol1_nodes);
			li32 = claim_element(ol1_nodes, "LI", {});
			var li32_nodes = children(li32);
			code43 = claim_element(li32_nodes, "CODE", {});
			var code43_nodes = children(code43);
			t258 = claim_text(code43_nodes, "$$invalidate('givenName', givenName = 'Li Hau')");
			code43_nodes.forEach(detach);
			li32_nodes.forEach(detach);
			t259 = claim_space(ol1_nodes);
			li33 = claim_element(ol1_nodes, "LI", {});
			var li33_nodes = children(li33);
			t260 = claim_text(li33_nodes, "Mark the variable ");
			code44 = claim_element(li33_nodes, "CODE", {});
			var code44_nodes = children(code44);
			t261 = claim_text(code44_nodes, "givenName");
			code44_nodes.forEach(detach);
			t262 = claim_text(li33_nodes, " dirty, ");
			code45 = claim_element(li33_nodes, "CODE", {});
			var code45_nodes = children(code45);
			t263 = claim_text(code45_nodes, "$$.dirty['givenName'] = true");
			code45_nodes.forEach(detach);
			li33_nodes.forEach(detach);
			t264 = claim_space(ol1_nodes);
			li34 = claim_element(ol1_nodes, "LI", {});
			var li34_nodes = children(li34);
			t265 = claim_text(li34_nodes, "Schedule an update, ");
			code46 = claim_element(li34_nodes, "CODE", {});
			var code46_nodes = children(code46);
			t266 = claim_text(code46_nodes, "schedule_update()");
			code46_nodes.forEach(detach);
			li34_nodes.forEach(detach);
			t267 = claim_space(ol1_nodes);
			li35 = claim_element(ol1_nodes, "LI", {});
			var li35_nodes = children(li35);
			t268 = claim_text(li35_nodes, "Since it's the first update in the call stack, push the ");
			code47 = claim_element(li35_nodes, "CODE", {});
			var code47_nodes = children(code47);
			t269 = claim_text(code47_nodes, "flush");
			code47_nodes.forEach(detach);
			t270 = claim_text(li35_nodes, " function into the microtask queue");
			li35_nodes.forEach(detach);
			t271 = claim_space(ol1_nodes);
			li36 = claim_element(ol1_nodes, "LI", {});
			var li36_nodes = children(li36);
			code48 = claim_element(li36_nodes, "CODE", {});
			var code48_nodes = children(code48);
			t272 = claim_text(code48_nodes, "$$invalidate('familyName', familyName = 'Tan')");
			code48_nodes.forEach(detach);
			li36_nodes.forEach(detach);
			t273 = claim_space(ol1_nodes);
			li37 = claim_element(ol1_nodes, "LI", {});
			var li37_nodes = children(li37);
			t274 = claim_text(li37_nodes, "Mark the variable ");
			code49 = claim_element(li37_nodes, "CODE", {});
			var code49_nodes = children(code49);
			t275 = claim_text(code49_nodes, "familyName");
			code49_nodes.forEach(detach);
			t276 = claim_text(li37_nodes, " dirty, ");
			code50 = claim_element(li37_nodes, "CODE", {});
			var code50_nodes = children(code50);
			t277 = claim_text(code50_nodes, "$$.dirty['familyName'] = true");
			code50_nodes.forEach(detach);
			li37_nodes.forEach(detach);
			t278 = claim_space(ol1_nodes);
			li38 = claim_element(ol1_nodes, "LI", {});
			var li38_nodes = children(li38);
			t279 = claim_text(li38_nodes, "Schedule an update, ");
			code51 = claim_element(li38_nodes, "CODE", {});
			var code51_nodes = children(code51);
			t280 = claim_text(code51_nodes, "schedule_update()");
			code51_nodes.forEach(detach);
			li38_nodes.forEach(detach);
			t281 = claim_space(ol1_nodes);
			li39 = claim_element(ol1_nodes, "LI", {});
			var li39_nodes = children(li39);
			t282 = claim_text(li39_nodes, "Since ");
			code52 = claim_element(li39_nodes, "CODE", {});
			var code52_nodes = children(code52);
			t283 = claim_text(code52_nodes, "update_scheduled = true");
			code52_nodes.forEach(detach);
			t284 = claim_text(li39_nodes, ", do nothing.");
			li39_nodes.forEach(detach);
			t285 = claim_space(ol1_nodes);
			li40 = claim_element(ol1_nodes, "LI", {});
			var li40_nodes = children(li40);
			strong6 = claim_element(li40_nodes, "STRONG", {});
			var strong6_nodes = children(strong6);
			t286 = claim_text(strong6_nodes, "-- End of task --");
			strong6_nodes.forEach(detach);
			li40_nodes.forEach(detach);
			t287 = claim_space(ol1_nodes);
			li41 = claim_element(ol1_nodes, "LI", {});
			var li41_nodes = children(li41);
			strong7 = claim_element(li41_nodes, "STRONG", {});
			var strong7_nodes = children(strong7);
			t288 = claim_text(strong7_nodes, "-- Start of microtask--");
			strong7_nodes.forEach(detach);
			li41_nodes.forEach(detach);
			t289 = claim_space(ol1_nodes);
			li42 = claim_element(ol1_nodes, "LI", {});
			var li42_nodes = children(li42);
			code53 = claim_element(li42_nodes, "CODE", {});
			var code53_nodes = children(code53);
			t290 = claim_text(code53_nodes, "flush()");
			code53_nodes.forEach(detach);
			t291 = claim_text(li42_nodes, " calls ");
			code54 = claim_element(li42_nodes, "CODE", {});
			var code54_nodes = children(code54);
			t292 = claim_text(code54_nodes, "update()");
			code54_nodes.forEach(detach);
			t293 = claim_text(li42_nodes, " for each component marked dirty");
			li42_nodes.forEach(detach);
			t294 = claim_space(ol1_nodes);
			li45 = claim_element(ol1_nodes, "LI", {});
			var li45_nodes = children(li45);
			t295 = claim_text(li45_nodes, "Calls ");
			code55 = claim_element(li45_nodes, "CODE", {});
			var code55_nodes = children(code55);
			t296 = claim_text(code55_nodes, "$$.fragment.p($$.dirty, $$.ctx)");
			code55_nodes.forEach(detach);
			t297 = claim_text(li45_nodes, ".");
			ul11 = claim_element(li45_nodes, "UL", {});
			var ul11_nodes = children(ul11);
			li43 = claim_element(ul11_nodes, "LI", {});
			var li43_nodes = children(li43);
			code56 = claim_element(li43_nodes, "CODE", {});
			var code56_nodes = children(code56);
			t298 = claim_text(code56_nodes, "$$.dirty");
			code56_nodes.forEach(detach);
			t299 = claim_text(li43_nodes, " is now ");
			code57 = claim_element(li43_nodes, "CODE", {});
			var code57_nodes = children(code57);
			t300 = claim_text(code57_nodes, "{ givenName: true, familyName: true }");
			code57_nodes.forEach(detach);
			li43_nodes.forEach(detach);
			t301 = claim_space(ul11_nodes);
			li44 = claim_element(ul11_nodes, "LI", {});
			var li44_nodes = children(li44);
			code58 = claim_element(li44_nodes, "CODE", {});
			var code58_nodes = children(code58);
			t302 = claim_text(code58_nodes, "$$.ctx");
			code58_nodes.forEach(detach);
			t303 = claim_text(li44_nodes, " is now ");
			code59 = claim_element(li44_nodes, "CODE", {});
			var code59_nodes = children(code59);
			t304 = claim_text(code59_nodes, "{ givenName: 'Li Hau', familyName: 'Tan' }");
			code59_nodes.forEach(detach);
			li44_nodes.forEach(detach);
			ul11_nodes.forEach(detach);
			li45_nodes.forEach(detach);
			t305 = claim_space(ol1_nodes);
			li48 = claim_element(ol1_nodes, "LI", {});
			var li48_nodes = children(li48);
			t306 = claim_text(li48_nodes, "In ");
			code60 = claim_element(li48_nodes, "CODE", {});
			var code60_nodes = children(code60);
			t307 = claim_text(code60_nodes, "function p(dirty, ctx)");
			code60_nodes.forEach(detach);
			t308 = claim_text(li48_nodes, ",");
			ul12 = claim_element(li48_nodes, "UL", {});
			var ul12_nodes = children(ul12);
			li46 = claim_element(ul12_nodes, "LI", {});
			var li46_nodes = children(li46);
			t309 = claim_text(li46_nodes, "Update the 1st text node to ");
			code61 = claim_element(li46_nodes, "CODE", {});
			var code61_nodes = children(code61);
			t310 = claim_text(code61_nodes, "$$.ctx['givenName']");
			code61_nodes.forEach(detach);
			t311 = claim_text(li46_nodes, " if ");
			code62 = claim_element(li46_nodes, "CODE", {});
			var code62_nodes = children(code62);
			t312 = claim_text(code62_nodes, "$$.dirty['givenName'] === true");
			code62_nodes.forEach(detach);
			li46_nodes.forEach(detach);
			t313 = claim_space(ul12_nodes);
			li47 = claim_element(ul12_nodes, "LI", {});
			var li47_nodes = children(li47);
			t314 = claim_text(li47_nodes, "Update the 2nd text node to ");
			code63 = claim_element(li47_nodes, "CODE", {});
			var code63_nodes = children(code63);
			t315 = claim_text(code63_nodes, "$$.ctx['familyName']");
			code63_nodes.forEach(detach);
			t316 = claim_text(li47_nodes, " if ");
			code64 = claim_element(li47_nodes, "CODE", {});
			var code64_nodes = children(code64);
			t317 = claim_text(code64_nodes, "$$.dirty['familyName'] === true");
			code64_nodes.forEach(detach);
			li47_nodes.forEach(detach);
			ul12_nodes.forEach(detach);
			li48_nodes.forEach(detach);
			t318 = claim_space(ol1_nodes);
			li49 = claim_element(ol1_nodes, "LI", {});
			var li49_nodes = children(li49);
			t319 = claim_text(li49_nodes, "Resets the ");
			code65 = claim_element(li49_nodes, "CODE", {});
			var code65_nodes = children(code65);
			t320 = claim_text(code65_nodes, "$$.dirty");
			code65_nodes.forEach(detach);
			t321 = claim_text(li49_nodes, " to ");
			code66 = claim_element(li49_nodes, "CODE", {});
			var code66_nodes = children(code66);
			t322 = claim_text(code66_nodes, "null");
			code66_nodes.forEach(detach);
			li49_nodes.forEach(detach);
			t323 = claim_space(ol1_nodes);
			li50 = claim_element(ol1_nodes, "LI", {});
			var li50_nodes = children(li50);
			t324 = claim_text(li50_nodes, "...");
			li50_nodes.forEach(detach);
			t325 = claim_space(ol1_nodes);
			li51 = claim_element(ol1_nodes, "LI", {});
			var li51_nodes = children(li51);
			strong8 = claim_element(li51_nodes, "STRONG", {});
			var strong8_nodes = children(strong8);
			t326 = claim_text(strong8_nodes, "-- End of microtask--");
			strong8_nodes.forEach(detach);
			li51_nodes.forEach(detach);
			ol1_nodes.forEach(detach);
			section5_nodes.forEach(detach);
			t327 = claim_space(nodes);
			section6 = claim_element(nodes, "SECTION", {});
			var section6_nodes = children(section6);
			h40 = claim_element(section6_nodes, "H4", {});
			var h40_nodes = children(h40);
			a42 = claim_element(h40_nodes, "A", { href: true, id: true });
			var a42_nodes = children(a42);
			t328 = claim_text(a42_nodes, "tl/dr:");
			a42_nodes.forEach(detach);
			h40_nodes.forEach(detach);
			t329 = claim_space(section6_nodes);
			ul13 = claim_element(section6_nodes, "UL", {});
			var ul13_nodes = children(ul13);
			li52 = claim_element(ul13_nodes, "LI", {});
			var li52_nodes = children(li52);
			t330 = claim_text(li52_nodes, "For each assignment or update, Svelte calls ");
			code67 = claim_element(li52_nodes, "CODE", {});
			var code67_nodes = children(code67);
			t331 = claim_text(code67_nodes, "$$invalidate");
			code67_nodes.forEach(detach);
			t332 = claim_text(li52_nodes, " to update the variable in ");
			code68 = claim_element(li52_nodes, "CODE", {});
			var code68_nodes = children(code68);
			t333 = claim_text(code68_nodes, "$$.ctx");
			code68_nodes.forEach(detach);
			t334 = claim_text(li52_nodes, " and mark the variable dirty in ");
			code69 = claim_element(li52_nodes, "CODE", {});
			var code69_nodes = children(code69);
			t335 = claim_text(code69_nodes, "$$.dirty");
			code69_nodes.forEach(detach);
			t336 = claim_text(li52_nodes, ".");
			li52_nodes.forEach(detach);
			t337 = claim_space(ul13_nodes);
			li53 = claim_element(ul13_nodes, "LI", {});
			var li53_nodes = children(li53);
			t338 = claim_text(li53_nodes, "The acutal DOM update is batched into the next microtask queue.");
			li53_nodes.forEach(detach);
			t339 = claim_space(ul13_nodes);
			li54 = claim_element(ul13_nodes, "LI", {});
			var li54_nodes = children(li54);
			t340 = claim_text(li54_nodes, "To update the DOM for each component, the component ");
			code70 = claim_element(li54_nodes, "CODE", {});
			var code70_nodes = children(code70);
			t341 = claim_text(code70_nodes, "$$.fragment.p($$.diry, $$.ctx)");
			code70_nodes.forEach(detach);
			t342 = claim_text(li54_nodes, " is called.");
			li54_nodes.forEach(detach);
			t343 = claim_space(ul13_nodes);
			li55 = claim_element(ul13_nodes, "LI", {});
			var li55_nodes = children(li55);
			t344 = claim_text(li55_nodes, "After the DOM update, the ");
			code71 = claim_element(li55_nodes, "CODE", {});
			var code71_nodes = children(code71);
			t345 = claim_text(code71_nodes, "$$.dirty");
			code71_nodes.forEach(detach);
			t346 = claim_text(li55_nodes, " is reset to ");
			code72 = claim_element(li55_nodes, "CODE", {});
			var code72_nodes = children(code72);
			t347 = claim_text(code72_nodes, "null");
			code72_nodes.forEach(detach);
			t348 = claim_text(li55_nodes, ".");
			li55_nodes.forEach(detach);
			ul13_nodes.forEach(detach);
			section6_nodes.forEach(detach);
			t349 = claim_space(nodes);
			section7 = claim_element(nodes, "SECTION", {});
			var section7_nodes = children(section7);
			h21 = claim_element(section7_nodes, "H2", {});
			var h21_nodes = children(h21);
			a43 = claim_element(h21_nodes, "A", { href: true, id: true });
			var a43_nodes = children(a43);
			t350 = claim_text(a43_nodes, "v3.16.0");
			a43_nodes.forEach(detach);
			h21_nodes.forEach(detach);
			t351 = claim_space(section7_nodes);
			p42 = claim_element(section7_nodes, "P", {});
			var p42_nodes = children(p42);
			t352 = claim_text(p42_nodes, "One big change in v3.16.0 is the PR ");
			a44 = claim_element(p42_nodes, "A", { href: true, rel: true });
			var a44_nodes = children(a44);
			t353 = claim_text(a44_nodes, "#3945");
			a44_nodes.forEach(detach);
			t354 = claim_text(p42_nodes, ", namely ");
			strong9 = claim_element(p42_nodes, "STRONG", {});
			var strong9_nodes = children(strong9);
			t355 = claim_text(strong9_nodes, "bitmask-based change tracking");
			strong9_nodes.forEach(detach);
			t356 = claim_text(p42_nodes, ".");
			p42_nodes.forEach(detach);
			t357 = claim_space(section7_nodes);
			p43 = claim_element(section7_nodes, "P", {});
			var p43_nodes = children(p43);
			t358 = claim_text(p43_nodes, "Instead of marking the variable dirty using an object:");
			p43_nodes.forEach(detach);
			t359 = claim_space(section7_nodes);
			pre14 = claim_element(section7_nodes, "PRE", { class: true });
			var pre14_nodes = children(pre14);
			pre14_nodes.forEach(detach);
			t360 = claim_space(section7_nodes);
			p44 = claim_element(section7_nodes, "P", {});
			var p44_nodes = children(p44);
			t361 = claim_text(p44_nodes, "Svelte assign each variable an index:");
			p44_nodes.forEach(detach);
			t362 = claim_space(section7_nodes);
			pre15 = claim_element(section7_nodes, "PRE", { class: true });
			var pre15_nodes = children(pre15);
			pre15_nodes.forEach(detach);
			t363 = claim_space(section7_nodes);
			p45 = claim_element(section7_nodes, "P", {});
			var p45_nodes = children(p45);
			t364 = claim_text(p45_nodes, "and uses ");
			a45 = claim_element(p45_nodes, "A", { href: true, rel: true });
			var a45_nodes = children(a45);
			t365 = claim_text(a45_nodes, "bitmask");
			a45_nodes.forEach(detach);
			t366 = claim_text(p45_nodes, " to store the dirty information:");
			p45_nodes.forEach(detach);
			t367 = claim_space(section7_nodes);
			pre16 = claim_element(section7_nodes, "PRE", { class: true });
			var pre16_nodes = children(pre16);
			pre16_nodes.forEach(detach);
			t368 = claim_space(section7_nodes);
			p46 = claim_element(section7_nodes, "P", {});
			var p46_nodes = children(p46);
			t369 = claim_text(p46_nodes, "which is far more compact than the previous compiled code.");
			p46_nodes.forEach(detach);
			section7_nodes.forEach(detach);
			t370 = claim_space(nodes);
			section8 = claim_element(nodes, "SECTION", {});
			var section8_nodes = children(section8);
			h34 = claim_element(section8_nodes, "H3", {});
			var h34_nodes = children(h34);
			a46 = claim_element(h34_nodes, "A", { href: true, id: true });
			var a46_nodes = children(a46);
			t371 = claim_text(a46_nodes, "Bitmask");
			a46_nodes.forEach(detach);
			h34_nodes.forEach(detach);
			t372 = claim_space(section8_nodes);
			p47 = claim_element(section8_nodes, "P", {});
			var p47_nodes = children(p47);
			t373 = claim_text(p47_nodes, "For those who don't understand, allow me to quickly explain what it is.");
			p47_nodes.forEach(detach);
			t374 = claim_space(section8_nodes);
			p48 = claim_element(section8_nodes, "P", {});
			var p48_nodes = children(p48);
			t375 = claim_text(p48_nodes, "Of course, if you want to learn more about it, feel free to read a more detailed explanation, like ");
			a47 = claim_element(p48_nodes, "A", { href: true, rel: true });
			var a47_nodes = children(a47);
			t376 = claim_text(a47_nodes, "this");
			a47_nodes.forEach(detach);
			t377 = claim_text(p48_nodes, " and ");
			a48 = claim_element(p48_nodes, "A", { href: true, rel: true });
			var a48_nodes = children(a48);
			t378 = claim_text(a48_nodes, "this");
			a48_nodes.forEach(detach);
			t379 = claim_text(p48_nodes, ".");
			p48_nodes.forEach(detach);
			t380 = claim_space(section8_nodes);
			p49 = claim_element(section8_nodes, "P", {});
			var p49_nodes = children(p49);
			t381 = claim_text(p49_nodes, "The most compact way of representing a group of ");
			code73 = claim_element(p49_nodes, "CODE", {});
			var code73_nodes = children(code73);
			t382 = claim_text(code73_nodes, "true");
			code73_nodes.forEach(detach);
			t383 = claim_text(p49_nodes, " or ");
			code74 = claim_element(p49_nodes, "CODE", {});
			var code74_nodes = children(code74);
			t384 = claim_text(code74_nodes, "false");
			code74_nodes.forEach(detach);
			t385 = claim_text(p49_nodes, " is to use bits. If the bit is ");
			code75 = claim_element(p49_nodes, "CODE", {});
			var code75_nodes = children(code75);
			t386 = claim_text(code75_nodes, "1");
			code75_nodes.forEach(detach);
			t387 = claim_text(p49_nodes, " it is ");
			code76 = claim_element(p49_nodes, "CODE", {});
			var code76_nodes = children(code76);
			t388 = claim_text(code76_nodes, "true");
			code76_nodes.forEach(detach);
			t389 = claim_text(p49_nodes, " and if it is ");
			code77 = claim_element(p49_nodes, "CODE", {});
			var code77_nodes = children(code77);
			t390 = claim_text(code77_nodes, "0");
			code77_nodes.forEach(detach);
			t391 = claim_text(p49_nodes, " it is ");
			code78 = claim_element(p49_nodes, "CODE", {});
			var code78_nodes = children(code78);
			t392 = claim_text(code78_nodes, "false");
			code78_nodes.forEach(detach);
			t393 = claim_text(p49_nodes, ".");
			p49_nodes.forEach(detach);
			t394 = claim_space(section8_nodes);
			p50 = claim_element(section8_nodes, "P", {});
			var p50_nodes = children(p50);
			t395 = claim_text(p50_nodes, "A number can be represented in binary, ");
			strong10 = claim_element(p50_nodes, "STRONG", {});
			var strong10_nodes = children(strong10);
			t396 = claim_text(strong10_nodes, "5");
			strong10_nodes.forEach(detach);
			t397 = claim_text(p50_nodes, " is ");
			code79 = claim_element(p50_nodes, "CODE", {});
			var code79_nodes = children(code79);
			t398 = claim_text(code79_nodes, "0b0101");
			code79_nodes.forEach(detach);
			t399 = claim_text(p50_nodes, " in binary.");
			p50_nodes.forEach(detach);
			t400 = claim_space(section8_nodes);
			p51 = claim_element(section8_nodes, "P", {});
			var p51_nodes = children(p51);
			t401 = claim_text(p51_nodes, "If ");
			strong11 = claim_element(p51_nodes, "STRONG", {});
			var strong11_nodes = children(strong11);
			t402 = claim_text(strong11_nodes, "5");
			strong11_nodes.forEach(detach);
			t403 = claim_text(p51_nodes, " is represented in a 4-bit binary, then it can store 4 boolean values, with the 0th and 2nd bit as ");
			code80 = claim_element(p51_nodes, "CODE", {});
			var code80_nodes = children(code80);
			t404 = claim_text(code80_nodes, "true");
			code80_nodes.forEach(detach);
			t405 = claim_text(p51_nodes, " and 1st and 3rd bit as ");
			code81 = claim_element(p51_nodes, "CODE", {});
			var code81_nodes = children(code81);
			t406 = claim_text(code81_nodes, "false");
			code81_nodes.forEach(detach);
			t407 = claim_text(p51_nodes, ", (reading from the right to left, from ");
			a49 = claim_element(p51_nodes, "A", { href: true, rel: true });
			var a49_nodes = children(a49);
			t408 = claim_text(a49_nodes, "least significant bit");
			a49_nodes.forEach(detach);
			t409 = claim_text(p51_nodes, " to the ");
			a50 = claim_element(p51_nodes, "A", { href: true, rel: true });
			var a50_nodes = children(a50);
			t410 = claim_text(a50_nodes, "most significant bit");
			a50_nodes.forEach(detach);
			t411 = claim_text(p51_nodes, ").");
			p51_nodes.forEach(detach);
			t412 = claim_space(section8_nodes);
			p52 = claim_element(section8_nodes, "P", {});
			var p52_nodes = children(p52);
			strong12 = claim_element(p52_nodes, "STRONG", {});
			var strong12_nodes = children(strong12);
			t413 = claim_text(strong12_nodes, "How many boolean values can a number store?");
			strong12_nodes.forEach(detach);
			p52_nodes.forEach(detach);
			t414 = claim_space(section8_nodes);
			p53 = claim_element(section8_nodes, "P", {});
			var p53_nodes = children(p53);
			t415 = claim_text(p53_nodes, "That depends on the language, a 16-bit integer in Java can store 16 boolean values.");
			p53_nodes.forEach(detach);
			t416 = claim_space(section8_nodes);
			p54 = claim_element(section8_nodes, "P", {});
			var p54_nodes = children(p54);
			t417 = claim_text(p54_nodes, "In JavaScript, numbers can are ");
			a51 = claim_element(p54_nodes, "A", { href: true, rel: true });
			var a51_nodes = children(a51);
			t418 = claim_text(a51_nodes, "represented in 64 bits");
			a51_nodes.forEach(detach);
			t419 = claim_text(p54_nodes, ". However, when using ");
			a52 = claim_element(p54_nodes, "A", { href: true, rel: true });
			var a52_nodes = children(a52);
			t420 = claim_text(a52_nodes, "bitwise operations");
			a52_nodes.forEach(detach);
			t421 = claim_text(p54_nodes, " on the number, JavaScript will treat the number as 32 bits.");
			p54_nodes.forEach(detach);
			t422 = claim_space(section8_nodes);
			p55 = claim_element(section8_nodes, "P", {});
			var p55_nodes = children(p55);
			t423 = claim_text(p55_nodes, "To inspect or modify the boolean value stored in a number, we use ");
			a53 = claim_element(p55_nodes, "A", { href: true, rel: true });
			var a53_nodes = children(a53);
			t424 = claim_text(a53_nodes, "bitwise operations");
			a53_nodes.forEach(detach);
			t425 = claim_text(p55_nodes, ".");
			p55_nodes.forEach(detach);
			t426 = claim_space(section8_nodes);
			pre17 = claim_element(section8_nodes, "PRE", { class: true });
			var pre17_nodes = children(pre17);
			pre17_nodes.forEach(detach);
			t427 = claim_space(section8_nodes);
			p56 = claim_element(section8_nodes, "P", {});
			var p56_nodes = children(p56);
			t428 = claim_text(p56_nodes, "The 2nd operand we use in the bitwise operation, is like a ");
			a54 = claim_element(p56_nodes, "A", { href: true, rel: true });
			var a54_nodes = children(a54);
			t429 = claim_text(a54_nodes, "mask");
			a54_nodes.forEach(detach);
			t430 = claim_text(p56_nodes, " that allow us to target a specific bit in the 1st number, that stores our boolean values.");
			p56_nodes.forEach(detach);
			t431 = claim_space(section8_nodes);
			p57 = claim_element(section8_nodes, "P", {});
			var p57_nodes = children(p57);
			t432 = claim_text(p57_nodes, "We call the mask, ");
			strong13 = claim_element(p57_nodes, "STRONG", {});
			var strong13_nodes = children(strong13);
			t433 = claim_text(strong13_nodes, "bitmask");
			strong13_nodes.forEach(detach);
			t434 = claim_text(p57_nodes, ".");
			p57_nodes.forEach(detach);
			section8_nodes.forEach(detach);
			t435 = claim_space(nodes);
			section9 = claim_element(nodes, "SECTION", {});
			var section9_nodes = children(section9);
			h35 = claim_element(section9_nodes, "H3", {});
			var h35_nodes = children(h35);
			a55 = claim_element(h35_nodes, "A", { href: true, id: true });
			var a55_nodes = children(a55);
			t436 = claim_text(a55_nodes, "Bitmask in Svelte");
			a55_nodes.forEach(detach);
			h35_nodes.forEach(detach);
			t437 = claim_space(section9_nodes);
			p58 = claim_element(section9_nodes, "P", {});
			var p58_nodes = children(p58);
			t438 = claim_text(p58_nodes, "As mentioned earlier, we assign each variable an index:");
			p58_nodes.forEach(detach);
			t439 = claim_space(section9_nodes);
			pre18 = claim_element(section9_nodes, "PRE", { class: true });
			var pre18_nodes = children(pre18);
			pre18_nodes.forEach(detach);
			t440 = claim_space(section9_nodes);
			p59 = claim_element(section9_nodes, "P", {});
			var p59_nodes = children(p59);
			t441 = claim_text(p59_nodes, "So instead of returning the instance variable as an JavaScript Object, we now return it as an JavaScript Array:");
			p59_nodes.forEach(detach);
			t442 = claim_space(section9_nodes);
			pre19 = claim_element(section9_nodes, "PRE", { class: true });
			var pre19_nodes = children(pre19);
			pre19_nodes.forEach(detach);
			t443 = claim_space(section9_nodes);
			p60 = claim_element(section9_nodes, "P", {});
			var p60_nodes = children(p60);
			t444 = claim_text(p60_nodes, "The variable is accessed via ");
			strong14 = claim_element(p60_nodes, "STRONG", {});
			var strong14_nodes = children(strong14);
			t445 = claim_text(strong14_nodes, "index");
			strong14_nodes.forEach(detach);
			t446 = claim_text(p60_nodes, ", ");
			code82 = claim_element(p60_nodes, "CODE", {});
			var code82_nodes = children(code82);
			t447 = claim_text(code82_nodes, "$$.ctx[index]");
			code82_nodes.forEach(detach);
			t448 = claim_text(p60_nodes, ", instead of ");
			strong15 = claim_element(p60_nodes, "STRONG", {});
			var strong15_nodes = children(strong15);
			t449 = claim_text(strong15_nodes, "variable name");
			strong15_nodes.forEach(detach);
			t450 = claim_text(p60_nodes, ":");
			p60_nodes.forEach(detach);
			t451 = claim_space(section9_nodes);
			pre20 = claim_element(section9_nodes, "PRE", { class: true });
			var pre20_nodes = children(pre20);
			pre20_nodes.forEach(detach);
			t452 = claim_space(section9_nodes);
			p61 = claim_element(section9_nodes, "P", {});
			var p61_nodes = children(p61);
			t453 = claim_text(p61_nodes, "The ");
			code83 = claim_element(p61_nodes, "CODE", {});
			var code83_nodes = children(code83);
			t454 = claim_text(code83_nodes, "$$invalidate");
			code83_nodes.forEach(detach);
			t455 = claim_text(p61_nodes, " function works the same, except it takes in ");
			strong16 = claim_element(p61_nodes, "STRONG", {});
			var strong16_nodes = children(strong16);
			t456 = claim_text(strong16_nodes, "index");
			strong16_nodes.forEach(detach);
			t457 = claim_text(p61_nodes, " instead of ");
			strong17 = claim_element(p61_nodes, "STRONG", {});
			var strong17_nodes = children(strong17);
			t458 = claim_text(strong17_nodes, "variable name");
			strong17_nodes.forEach(detach);
			t459 = claim_text(p61_nodes, ":");
			p61_nodes.forEach(detach);
			t460 = claim_space(section9_nodes);
			pre21 = claim_element(section9_nodes, "PRE", { class: true });
			var pre21_nodes = children(pre21);
			pre21_nodes.forEach(detach);
			t461 = claim_space(section9_nodes);
			p62 = claim_element(section9_nodes, "P", {});
			var p62_nodes = children(p62);
			code84 = claim_element(p62_nodes, "CODE", {});
			var code84_nodes = children(code84);
			t462 = claim_text(code84_nodes, "$$.dirty");
			code84_nodes.forEach(detach);
			t463 = claim_text(p62_nodes, " now stores a list of numbers. Each number carries 31 boolean values, each boolean value indicates whether the variable of that index is dirty or not.");
			p62_nodes.forEach(detach);
			t464 = claim_space(section9_nodes);
			p63 = claim_element(section9_nodes, "P", {});
			var p63_nodes = children(p63);
			t465 = claim_text(p63_nodes, "To set a variable as dirty, we use bitwise operation:");
			p63_nodes.forEach(detach);
			t466 = claim_space(section9_nodes);
			pre22 = claim_element(section9_nodes, "PRE", { class: true });
			var pre22_nodes = children(pre22);
			pre22_nodes.forEach(detach);
			t467 = claim_space(section9_nodes);
			p64 = claim_element(section9_nodes, "P", {});
			var p64_nodes = children(p64);
			t468 = claim_text(p64_nodes, "And to verify whether a variable is dirty, we use bitwise operation too!");
			p64_nodes.forEach(detach);
			t469 = claim_space(section9_nodes);
			pre23 = claim_element(section9_nodes, "PRE", { class: true });
			var pre23_nodes = children(pre23);
			pre23_nodes.forEach(detach);
			t470 = claim_space(section9_nodes);
			p65 = claim_element(section9_nodes, "P", {});
			var p65_nodes = children(p65);
			t471 = claim_text(p65_nodes, "With using bitmask, ");
			code85 = claim_element(p65_nodes, "CODE", {});
			var code85_nodes = children(code85);
			t472 = claim_text(code85_nodes, "$$.dirty");
			code85_nodes.forEach(detach);
			t473 = claim_text(p65_nodes, " is now reset to ");
			code86 = claim_element(p65_nodes, "CODE", {});
			var code86_nodes = children(code86);
			t474 = claim_text(code86_nodes, "[-1]");
			code86_nodes.forEach(detach);
			t475 = claim_text(p65_nodes, " instead of ");
			code87 = claim_element(p65_nodes, "CODE", {});
			var code87_nodes = children(code87);
			t476 = claim_text(code87_nodes, "null");
			code87_nodes.forEach(detach);
			t477 = claim_text(p65_nodes, ".");
			p65_nodes.forEach(detach);
			t478 = claim_space(section9_nodes);
			p66 = claim_element(section9_nodes, "P", {});
			var p66_nodes = children(p66);
			strong18 = claim_element(p66_nodes, "STRONG", {});
			var strong18_nodes = children(strong18);
			t479 = claim_text(strong18_nodes, "Trivia:");
			strong18_nodes.forEach(detach);
			t480 = claim_space(p66_nodes);
			code88 = claim_element(p66_nodes, "CODE", {});
			var code88_nodes = children(code88);
			t481 = claim_text(code88_nodes, "-1");
			code88_nodes.forEach(detach);
			t482 = claim_text(p66_nodes, " is ");
			code89 = claim_element(p66_nodes, "CODE", {});
			var code89_nodes = children(code89);
			t483 = claim_text(code89_nodes, "0b1111_1111");
			code89_nodes.forEach(detach);
			t484 = claim_text(p66_nodes, " in binary, where all the bits are ");
			code90 = claim_element(p66_nodes, "CODE", {});
			var code90_nodes = children(code90);
			t485 = claim_text(code90_nodes, "1");
			code90_nodes.forEach(detach);
			t486 = claim_text(p66_nodes, ".");
			p66_nodes.forEach(detach);
			section9_nodes.forEach(detach);
			t487 = claim_space(nodes);
			section10 = claim_element(nodes, "SECTION", {});
			var section10_nodes = children(section10);
			h41 = claim_element(section10_nodes, "H4", {});
			var h41_nodes = children(h41);
			a56 = claim_element(h41_nodes, "A", { href: true, id: true });
			var a56_nodes = children(a56);
			t488 = claim_text(a56_nodes, "Destructuring ");
			strong19 = claim_element(a56_nodes, "STRONG", {});
			var strong19_nodes = children(strong19);
			t489 = claim_text(strong19_nodes, "$$.dirty");
			strong19_nodes.forEach(detach);
			a56_nodes.forEach(detach);
			h41_nodes.forEach(detach);
			t490 = claim_space(section10_nodes);
			p67 = claim_element(section10_nodes, "P", {});
			var p67_nodes = children(p67);
			t491 = claim_text(p67_nodes, "One code-size optimisation that Svelte does is to always destructure the ");
			code91 = claim_element(p67_nodes, "CODE", {});
			var code91_nodes = children(code91);
			t492 = claim_text(code91_nodes, "dirty");
			code91_nodes.forEach(detach);
			t493 = claim_text(p67_nodes, " array in the ");
			strong20 = claim_element(p67_nodes, "STRONG", {});
			var strong20_nodes = children(strong20);
			t494 = claim_text(strong20_nodes, "u_p_date function");
			strong20_nodes.forEach(detach);
			t495 = claim_text(p67_nodes, " if there's less than 32 variables, since we will always access ");
			code92 = claim_element(p67_nodes, "CODE", {});
			var code92_nodes = children(code92);
			t496 = claim_text(code92_nodes, "dirty[0]");
			code92_nodes.forEach(detach);
			t497 = claim_text(p67_nodes, " anyway:");
			p67_nodes.forEach(detach);
			t498 = claim_space(section10_nodes);
			pre24 = claim_element(section10_nodes, "PRE", { class: true });
			var pre24_nodes = children(pre24);
			pre24_nodes.forEach(detach);
			section10_nodes.forEach(detach);
			t499 = claim_space(nodes);
			section11 = claim_element(nodes, "SECTION", {});
			var section11_nodes = children(section11);
			h42 = claim_element(section11_nodes, "H4", {});
			var h42_nodes = children(h42);
			a57 = claim_element(h42_nodes, "A", { href: true, id: true });
			var a57_nodes = children(a57);
			t500 = claim_text(a57_nodes, "tl/dr:");
			a57_nodes.forEach(detach);
			h42_nodes.forEach(detach);
			t501 = claim_space(section11_nodes);
			ul14 = claim_element(section11_nodes, "UL", {});
			var ul14_nodes = children(ul14);
			li56 = claim_element(ul14_nodes, "LI", {});
			var li56_nodes = children(li56);
			t502 = claim_text(li56_nodes, "The underlying mechanism for ");
			code93 = claim_element(li56_nodes, "CODE", {});
			var code93_nodes = children(code93);
			t503 = claim_text(code93_nodes, "$$invalidate");
			code93_nodes.forEach(detach);
			t504 = claim_text(li56_nodes, " and ");
			code94 = claim_element(li56_nodes, "CODE", {});
			var code94_nodes = children(code94);
			t505 = claim_text(code94_nodes, "schedule_update");
			code94_nodes.forEach(detach);
			t506 = claim_text(li56_nodes, " does not change");
			li56_nodes.forEach(detach);
			t507 = claim_space(ul14_nodes);
			li57 = claim_element(ul14_nodes, "LI", {});
			var li57_nodes = children(li57);
			t508 = claim_text(li57_nodes, "Using bitmask, the compiled code is much compact");
			li57_nodes.forEach(detach);
			ul14_nodes.forEach(detach);
			section11_nodes.forEach(detach);
			t509 = claim_space(nodes);
			section12 = claim_element(nodes, "SECTION", {});
			var section12_nodes = children(section12);
			h22 = claim_element(section12_nodes, "H2", {});
			var h22_nodes = children(h22);
			a58 = claim_element(h22_nodes, "A", { href: true, id: true });
			var a58_nodes = children(a58);
			t510 = claim_text(a58_nodes, "Reactive Declaration");
			a58_nodes.forEach(detach);
			h22_nodes.forEach(detach);
			t511 = claim_space(section12_nodes);
			p68 = claim_element(section12_nodes, "P", {});
			var p68_nodes = children(p68);
			t512 = claim_text(p68_nodes, "Svelte allow us to declare reactive values via the ");
			a59 = claim_element(p68_nodes, "A", { href: true, rel: true });
			var a59_nodes = children(a59);
			t513 = claim_text(a59_nodes, "labeled statement");
			a59_nodes.forEach(detach);
			t514 = claim_text(p68_nodes, ", ");
			code95 = claim_element(p68_nodes, "CODE", {});
			var code95_nodes = children(code95);
			t515 = claim_text(code95_nodes, "$:");
			code95_nodes.forEach(detach);
			p68_nodes.forEach(detach);
			t516 = claim_space(section12_nodes);
			pre25 = claim_element(section12_nodes, "PRE", { class: true });
			var pre25_nodes = children(pre25);
			pre25_nodes.forEach(detach);
			t517 = claim_space(section12_nodes);
			p69 = claim_element(section12_nodes, "P", {});
			var p69_nodes = children(p69);
			a60 = claim_element(p69_nodes, "A", { href: true, rel: true });
			var a60_nodes = children(a60);
			t518 = claim_text(a60_nodes, "Svelte REPL");
			a60_nodes.forEach(detach);
			p69_nodes.forEach(detach);
			t519 = claim_space(section12_nodes);
			p70 = claim_element(section12_nodes, "P", {});
			var p70_nodes = children(p70);
			t520 = claim_text(p70_nodes, "If you look at the compiled output, you would find out that the declarative statements appeared in the ");
			a61 = claim_element(p70_nodes, "A", { href: true });
			var a61_nodes = children(a61);
			code96 = claim_element(a61_nodes, "CODE", {});
			var code96_nodes = children(code96);
			t521 = claim_text(code96_nodes, "instance");
			code96_nodes.forEach(detach);
			t522 = claim_text(a61_nodes, " function");
			a61_nodes.forEach(detach);
			t523 = claim_text(p70_nodes, ":");
			p70_nodes.forEach(detach);
			t524 = claim_space(section12_nodes);
			pre26 = claim_element(section12_nodes, "PRE", { class: true });
			var pre26_nodes = children(pre26);
			pre26_nodes.forEach(detach);
			t525 = claim_space(section12_nodes);
			p71 = claim_element(section12_nodes, "P", {});
			var p71_nodes = children(p71);
			t526 = claim_text(p71_nodes, "Try reorder the reactive declarations and observe the change in the compiled output:");
			p71_nodes.forEach(detach);
			t527 = claim_space(section12_nodes);
			pre27 = claim_element(section12_nodes, "PRE", { class: true });
			var pre27_nodes = children(pre27);
			pre27_nodes.forEach(detach);
			t528 = claim_space(section12_nodes);
			p72 = claim_element(section12_nodes, "P", {});
			var p72_nodes = children(p72);
			a62 = claim_element(p72_nodes, "A", { href: true, rel: true });
			var a62_nodes = children(a62);
			t529 = claim_text(a62_nodes, "Svelte REPL");
			a62_nodes.forEach(detach);
			p72_nodes.forEach(detach);
			t530 = claim_space(section12_nodes);
			pre28 = claim_element(section12_nodes, "PRE", { class: true });
			var pre28_nodes = children(pre28);
			pre28_nodes.forEach(detach);
			t531 = claim_space(section12_nodes);
			p73 = claim_element(section12_nodes, "P", {});
			var p73_nodes = children(p73);
			t532 = claim_text(p73_nodes, "Some observations:");
			p73_nodes.forEach(detach);
			t533 = claim_space(section12_nodes);
			ul17 = claim_element(section12_nodes, "UL", {});
			var ul17_nodes = children(ul17);
			li59 = claim_element(ul17_nodes, "LI", {});
			var li59_nodes = children(li59);
			t534 = claim_text(li59_nodes, "When there are reactive declarations, Svelte defines a custom ");
			code97 = claim_element(li59_nodes, "CODE", {});
			var code97_nodes = children(code97);
			t535 = claim_text(code97_nodes, "$$.update");
			code97_nodes.forEach(detach);
			t536 = claim_text(li59_nodes, " method.");
			ul15 = claim_element(li59_nodes, "UL", {});
			var ul15_nodes = children(ul15);
			li58 = claim_element(ul15_nodes, "LI", {});
			var li58_nodes = children(li58);
			code98 = claim_element(li58_nodes, "CODE", {});
			var code98_nodes = children(code98);
			t537 = claim_text(code98_nodes, "$$.update");
			code98_nodes.forEach(detach);
			t538 = claim_text(li58_nodes, " is a ");
			a63 = claim_element(li58_nodes, "A", { href: true, rel: true });
			var a63_nodes = children(a63);
			t539 = claim_text(a63_nodes, "no-op function");
			a63_nodes.forEach(detach);
			t540 = claim_text(li58_nodes, " by default. (See ");
			a64 = claim_element(li58_nodes, "A", { href: true, rel: true });
			var a64_nodes = children(a64);
			t541 = claim_text(a64_nodes, "src/runtime/internal/Component.ts");
			a64_nodes.forEach(detach);
			t542 = claim_text(li58_nodes, ")");
			li58_nodes.forEach(detach);
			ul15_nodes.forEach(detach);
			li59_nodes.forEach(detach);
			t543 = claim_space(ul17_nodes);
			li60 = claim_element(ul17_nodes, "LI", {});
			var li60_nodes = children(li60);
			t544 = claim_text(li60_nodes, "Svelte uses ");
			code99 = claim_element(li60_nodes, "CODE", {});
			var code99_nodes = children(code99);
			t545 = claim_text(code99_nodes, "$$invalidate");
			code99_nodes.forEach(detach);
			t546 = claim_text(li60_nodes, " to update the value of a reactive variable too.");
			li60_nodes.forEach(detach);
			t547 = claim_space(ul17_nodes);
			li62 = claim_element(ul17_nodes, "LI", {});
			var li62_nodes = children(li62);
			t548 = claim_text(li62_nodes, "Svelte sorts the reactive declarations and statements, based on the dependency relationship between the declarations and statements");
			ul16 = claim_element(li62_nodes, "UL", {});
			var ul16_nodes = children(ul16);
			li61 = claim_element(ul16_nodes, "LI", {});
			var li61_nodes = children(li61);
			code100 = claim_element(li61_nodes, "CODE", {});
			var code100_nodes = children(code100);
			t549 = claim_text(code100_nodes, "quadrupled");
			code100_nodes.forEach(detach);
			t550 = claim_text(li61_nodes, " depends on ");
			code101 = claim_element(li61_nodes, "CODE", {});
			var code101_nodes = children(code101);
			t551 = claim_text(code101_nodes, "doubled");
			code101_nodes.forEach(detach);
			t552 = claim_text(li61_nodes, ", so ");
			code102 = claim_element(li61_nodes, "CODE", {});
			var code102_nodes = children(code102);
			t553 = claim_text(code102_nodes, "quadrupled");
			code102_nodes.forEach(detach);
			t554 = claim_text(li61_nodes, " is evaluated and ");
			code103 = claim_element(li61_nodes, "CODE", {});
			var code103_nodes = children(code103);
			t555 = claim_text(code103_nodes, "$$invalidate");
			code103_nodes.forEach(detach);
			t556 = claim_text(li61_nodes, "d after ");
			code104 = claim_element(li61_nodes, "CODE", {});
			var code104_nodes = children(code104);
			t557 = claim_text(code104_nodes, "doubled");
			code104_nodes.forEach(detach);
			t558 = claim_text(li61_nodes, ".");
			li61_nodes.forEach(detach);
			ul16_nodes.forEach(detach);
			li62_nodes.forEach(detach);
			ul17_nodes.forEach(detach);
			t559 = claim_space(section12_nodes);
			p74 = claim_element(section12_nodes, "P", {});
			var p74_nodes = children(p74);
			t560 = claim_text(p74_nodes, "Since all reactive declarations and statements are grouped into the ");
			code105 = claim_element(p74_nodes, "CODE", {});
			var code105_nodes = children(code105);
			t561 = claim_text(code105_nodes, "$$.update");
			code105_nodes.forEach(detach);
			t562 = claim_text(p74_nodes, " method, and also the fact that Svelte will sort the declarations and statements according to their dependency relationship, it is irrelevant of the location or the order you declared them.");
			p74_nodes.forEach(detach);
			t563 = claim_space(section12_nodes);
			p75 = claim_element(section12_nodes, "P", {});
			var p75_nodes = children(p75);
			t564 = claim_text(p75_nodes, "The following component still works:");
			p75_nodes.forEach(detach);
			t565 = claim_space(section12_nodes);
			pre29 = claim_element(section12_nodes, "PRE", { class: true });
			var pre29_nodes = children(pre29);
			pre29_nodes.forEach(detach);
			t566 = claim_space(section12_nodes);
			p76 = claim_element(section12_nodes, "P", {});
			var p76_nodes = children(p76);
			a65 = claim_element(p76_nodes, "A", { href: true, rel: true });
			var a65_nodes = children(a65);
			t567 = claim_text(a65_nodes, "Svelte REPL");
			a65_nodes.forEach(detach);
			p76_nodes.forEach(detach);
			t568 = claim_space(section12_nodes);
			p77 = claim_element(section12_nodes, "P", {});
			var p77_nodes = children(p77);
			strong21 = claim_element(p77_nodes, "STRONG", {});
			var strong21_nodes = children(strong21);
			t569 = claim_text(strong21_nodes, "The next thing you may ask, when is ");
			code106 = claim_element(strong21_nodes, "CODE", {});
			var code106_nodes = children(code106);
			t570 = claim_text(code106_nodes, "$$.update");
			code106_nodes.forEach(detach);
			t571 = claim_text(strong21_nodes, " being called?");
			strong21_nodes.forEach(detach);
			p77_nodes.forEach(detach);
			t572 = claim_space(section12_nodes);
			p78 = claim_element(section12_nodes, "P", {});
			var p78_nodes = children(p78);
			t573 = claim_text(p78_nodes, "Remember the ");
			code107 = claim_element(p78_nodes, "CODE", {});
			var code107_nodes = children(code107);
			t574 = claim_text(code107_nodes, "update");
			code107_nodes.forEach(detach);
			t575 = claim_text(p78_nodes, " function that gets called in the ");
			code108 = claim_element(p78_nodes, "CODE", {});
			var code108_nodes = children(code108);
			t576 = claim_text(code108_nodes, "flush");
			code108_nodes.forEach(detach);
			t577 = claim_text(p78_nodes, " function?");
			p78_nodes.forEach(detach);
			t578 = claim_space(section12_nodes);
			p79 = claim_element(section12_nodes, "P", {});
			var p79_nodes = children(p79);
			t579 = claim_text(p79_nodes, "I put a ");
			code109 = claim_element(p79_nodes, "CODE", {});
			var code109_nodes = children(code109);
			t580 = claim_text(code109_nodes, "NOTE:");
			code109_nodes.forEach(detach);
			t581 = claim_text(p79_nodes, " comment saying that it will be important later. Well, it is important now.");
			p79_nodes.forEach(detach);
			t582 = claim_space(section12_nodes);
			pre30 = claim_element(section12_nodes, "PRE", { class: true });
			var pre30_nodes = children(pre30);
			pre30_nodes.forEach(detach);
			t583 = claim_space(section12_nodes);
			p80 = claim_element(section12_nodes, "P", {});
			var p80_nodes = children(p80);
			t584 = claim_text(p80_nodes, "The ");
			code110 = claim_element(p80_nodes, "CODE", {});
			var code110_nodes = children(code110);
			t585 = claim_text(code110_nodes, "$$.update");
			code110_nodes.forEach(detach);
			t586 = claim_text(p80_nodes, " function gets called ");
			strong22 = claim_element(p80_nodes, "STRONG", {});
			var strong22_nodes = children(strong22);
			t587 = claim_text(strong22_nodes, "in the same microtask");
			strong22_nodes.forEach(detach);
			t588 = claim_text(p80_nodes, " with the DOM update, right before we called the ");
			code111 = claim_element(p80_nodes, "CODE", {});
			var code111_nodes = children(code111);
			t589 = claim_text(code111_nodes, "$$.fragment.p()");
			code111_nodes.forEach(detach);
			t590 = claim_text(p80_nodes, " to update the DOM.");
			p80_nodes.forEach(detach);
			t591 = claim_space(section12_nodes);
			p81 = claim_element(section12_nodes, "P", {});
			var p81_nodes = children(p81);
			t592 = claim_text(p81_nodes, "The implication of the above fact is");
			p81_nodes.forEach(detach);
			section12_nodes.forEach(detach);
			t593 = claim_space(nodes);
			section13 = claim_element(nodes, "SECTION", {});
			var section13_nodes = children(section13);
			h43 = claim_element(section13_nodes, "H4", {});
			var h43_nodes = children(h43);
			a66 = claim_element(h43_nodes, "A", { href: true, id: true });
			var a66_nodes = children(a66);
			t594 = claim_text(a66_nodes, "1. Execution of all reactive declarations and statements are batched");
			a66_nodes.forEach(detach);
			h43_nodes.forEach(detach);
			t595 = claim_space(section13_nodes);
			p82 = claim_element(section13_nodes, "P", {});
			var p82_nodes = children(p82);
			t596 = claim_text(p82_nodes, "Just as how DOM updates are batched, reactive declarations and statements are batched too!");
			p82_nodes.forEach(detach);
			t597 = claim_space(section13_nodes);
			pre31 = claim_element(section13_nodes, "PRE", { class: true });
			var pre31_nodes = children(pre31);
			pre31_nodes.forEach(detach);
			t598 = claim_space(section13_nodes);
			p83 = claim_element(section13_nodes, "P", {});
			var p83_nodes = children(p83);
			a67 = claim_element(p83_nodes, "A", { href: true, rel: true });
			var a67_nodes = children(a67);
			t599 = claim_text(a67_nodes, "Svelte REPL");
			a67_nodes.forEach(detach);
			p83_nodes.forEach(detach);
			t600 = claim_space(section13_nodes);
			p84 = claim_element(section13_nodes, "P", {});
			var p84_nodes = children(p84);
			t601 = claim_text(p84_nodes, "When ");
			code112 = claim_element(p84_nodes, "CODE", {});
			var code112_nodes = children(code112);
			t602 = claim_text(code112_nodes, "update()");
			code112_nodes.forEach(detach);
			t603 = claim_text(p84_nodes, " get called,");
			p84_nodes.forEach(detach);
			t604 = claim_space(section13_nodes);
			ol2 = claim_element(section13_nodes, "OL", {});
			var ol2_nodes = children(ol2);
			li63 = claim_element(ol2_nodes, "LI", {});
			var li63_nodes = children(li63);
			t605 = claim_text(li63_nodes, "Similar to the ");
			a68 = claim_element(li63_nodes, "A", { href: true });
			var a68_nodes = children(a68);
			t606 = claim_text(a68_nodes, "flow described above");
			a68_nodes.forEach(detach);
			t607 = claim_text(li63_nodes, ", ");
			code113 = claim_element(li63_nodes, "CODE", {});
			var code113_nodes = children(code113);
			t608 = claim_text(code113_nodes, "$$invalidate");
			code113_nodes.forEach(detach);
			t609 = claim_text(li63_nodes, " both ");
			strong23 = claim_element(li63_nodes, "STRONG", {});
			var strong23_nodes = children(strong23);
			t610 = claim_text(strong23_nodes, "\"givenName\"");
			strong23_nodes.forEach(detach);
			t611 = claim_text(li63_nodes, " and ");
			strong24 = claim_element(li63_nodes, "STRONG", {});
			var strong24_nodes = children(strong24);
			t612 = claim_text(strong24_nodes, "\"familyName\"");
			strong24_nodes.forEach(detach);
			t613 = claim_text(li63_nodes, ", and schedules an update");
			li63_nodes.forEach(detach);
			t614 = claim_space(ol2_nodes);
			li64 = claim_element(ol2_nodes, "LI", {});
			var li64_nodes = children(li64);
			strong25 = claim_element(li64_nodes, "STRONG", {});
			var strong25_nodes = children(strong25);
			t615 = claim_text(strong25_nodes, "-- End of task --");
			strong25_nodes.forEach(detach);
			li64_nodes.forEach(detach);
			t616 = claim_space(ol2_nodes);
			li65 = claim_element(ol2_nodes, "LI", {});
			var li65_nodes = children(li65);
			strong26 = claim_element(li65_nodes, "STRONG", {});
			var strong26_nodes = children(strong26);
			t617 = claim_text(strong26_nodes, "-- Start of microtask--");
			strong26_nodes.forEach(detach);
			li65_nodes.forEach(detach);
			t618 = claim_space(ol2_nodes);
			li66 = claim_element(ol2_nodes, "LI", {});
			var li66_nodes = children(li66);
			code114 = claim_element(li66_nodes, "CODE", {});
			var code114_nodes = children(code114);
			t619 = claim_text(code114_nodes, "flush()");
			code114_nodes.forEach(detach);
			t620 = claim_text(li66_nodes, " calls ");
			code115 = claim_element(li66_nodes, "CODE", {});
			var code115_nodes = children(code115);
			t621 = claim_text(code115_nodes, "update()");
			code115_nodes.forEach(detach);
			t622 = claim_text(li66_nodes, " for each component marked dirty");
			li66_nodes.forEach(detach);
			t623 = claim_space(ol2_nodes);
			li69 = claim_element(ol2_nodes, "LI", {});
			var li69_nodes = children(li69);
			t624 = claim_text(li69_nodes, "Runs ");
			code116 = claim_element(li69_nodes, "CODE", {});
			var code116_nodes = children(code116);
			t625 = claim_text(code116_nodes, "$$.update()");
			code116_nodes.forEach(detach);
			ul18 = claim_element(li69_nodes, "UL", {});
			var ul18_nodes = children(ul18);
			li67 = claim_element(ul18_nodes, "LI", {});
			var li67_nodes = children(li67);
			t626 = claim_text(li67_nodes, "As ");
			strong27 = claim_element(li67_nodes, "STRONG", {});
			var strong27_nodes = children(strong27);
			t627 = claim_text(strong27_nodes, "\"givenName\"");
			strong27_nodes.forEach(detach);
			t628 = claim_text(li67_nodes, " and ");
			strong28 = claim_element(li67_nodes, "STRONG", {});
			var strong28_nodes = children(strong28);
			t629 = claim_text(strong28_nodes, "\"familyName\"");
			strong28_nodes.forEach(detach);
			t630 = claim_text(li67_nodes, " has changed, evaluates and ");
			code117 = claim_element(li67_nodes, "CODE", {});
			var code117_nodes = children(code117);
			t631 = claim_text(code117_nodes, "$$invalidate");
			code117_nodes.forEach(detach);
			t632 = claim_space(li67_nodes);
			strong29 = claim_element(li67_nodes, "STRONG", {});
			var strong29_nodes = children(strong29);
			t633 = claim_text(strong29_nodes, "\"name\"");
			strong29_nodes.forEach(detach);
			li67_nodes.forEach(detach);
			t634 = claim_space(ul18_nodes);
			li68 = claim_element(ul18_nodes, "LI", {});
			var li68_nodes = children(li68);
			t635 = claim_text(li68_nodes, "As ");
			strong30 = claim_element(li68_nodes, "STRONG", {});
			var strong30_nodes = children(strong30);
			t636 = claim_text(strong30_nodes, "\"name\"");
			strong30_nodes.forEach(detach);
			t637 = claim_text(li68_nodes, " has changed, executes ");
			code118 = claim_element(li68_nodes, "CODE", {});
			var code118_nodes = children(code118);
			t638 = claim_text(code118_nodes, "console.log('name', name);");
			code118_nodes.forEach(detach);
			li68_nodes.forEach(detach);
			ul18_nodes.forEach(detach);
			li69_nodes.forEach(detach);
			t639 = claim_space(ol2_nodes);
			li70 = claim_element(ol2_nodes, "LI", {});
			var li70_nodes = children(li70);
			t640 = claim_text(li70_nodes, "Calls ");
			code119 = claim_element(li70_nodes, "CODE", {});
			var code119_nodes = children(code119);
			t641 = claim_text(code119_nodes, "$$.fragment.p(...)");
			code119_nodes.forEach(detach);
			t642 = claim_text(li70_nodes, " to update the DOM.");
			li70_nodes.forEach(detach);
			ol2_nodes.forEach(detach);
			t643 = claim_space(section13_nodes);
			p85 = claim_element(section13_nodes, "P", {});
			var p85_nodes = children(p85);
			t644 = claim_text(p85_nodes, "As you can see, even though we've updated ");
			code120 = claim_element(p85_nodes, "CODE", {});
			var code120_nodes = children(code120);
			t645 = claim_text(code120_nodes, "givenName");
			code120_nodes.forEach(detach);
			t646 = claim_text(p85_nodes, " and ");
			code121 = claim_element(p85_nodes, "CODE", {});
			var code121_nodes = children(code121);
			t647 = claim_text(code121_nodes, "familyName");
			code121_nodes.forEach(detach);
			t648 = claim_text(p85_nodes, ", we only evaluate ");
			code122 = claim_element(p85_nodes, "CODE", {});
			var code122_nodes = children(code122);
			t649 = claim_text(code122_nodes, "name");
			code122_nodes.forEach(detach);
			t650 = claim_text(p85_nodes, " and executes ");
			code123 = claim_element(p85_nodes, "CODE", {});
			var code123_nodes = children(code123);
			t651 = claim_text(code123_nodes, "console.log('name', name)");
			code123_nodes.forEach(detach);
			t652 = claim_space(p85_nodes);
			strong31 = claim_element(p85_nodes, "STRONG", {});
			var strong31_nodes = children(strong31);
			t653 = claim_text(strong31_nodes, "once");
			strong31_nodes.forEach(detach);
			t654 = claim_text(p85_nodes, " instead of twice:");
			p85_nodes.forEach(detach);
			t655 = claim_space(section13_nodes);
			pre32 = claim_element(section13_nodes, "PRE", { class: true });
			var pre32_nodes = children(pre32);
			pre32_nodes.forEach(detach);
			section13_nodes.forEach(detach);
			t656 = claim_space(nodes);
			section14 = claim_element(nodes, "SECTION", {});
			var section14_nodes = children(section14);
			h44 = claim_element(section14_nodes, "H4", {});
			var h44_nodes = children(h44);
			a69 = claim_element(h44_nodes, "A", { href: true, id: true });
			var a69_nodes = children(a69);
			t657 = claim_text(a69_nodes, "2. The value of reactive variable outside of reactive declarations and statements may not be up to date");
			a69_nodes.forEach(detach);
			h44_nodes.forEach(detach);
			t658 = claim_space(section14_nodes);
			p86 = claim_element(section14_nodes, "P", {});
			var p86_nodes = children(p86);
			t659 = claim_text(p86_nodes, "Because the reactive declarations and statements are batched and executed in the next microtask, you can't expect the value to be updated synchronously.");
			p86_nodes.forEach(detach);
			t660 = claim_space(section14_nodes);
			pre33 = claim_element(section14_nodes, "PRE", { class: true });
			var pre33_nodes = children(pre33);
			pre33_nodes.forEach(detach);
			t661 = claim_space(section14_nodes);
			p87 = claim_element(section14_nodes, "P", {});
			var p87_nodes = children(p87);
			a70 = claim_element(p87_nodes, "A", { href: true, rel: true });
			var a70_nodes = children(a70);
			t662 = claim_text(a70_nodes, "Svelte REPL");
			a70_nodes.forEach(detach);
			p87_nodes.forEach(detach);
			t663 = claim_space(section14_nodes);
			p88 = claim_element(section14_nodes, "P", {});
			var p88_nodes = children(p88);
			t664 = claim_text(p88_nodes, "Instead, you ");
			strong32 = claim_element(p88_nodes, "STRONG", {});
			var strong32_nodes = children(strong32);
			t665 = claim_text(strong32_nodes, "have to");
			strong32_nodes.forEach(detach);
			t666 = claim_text(p88_nodes, " refer the reactive variable in another reactive declaration or statement:");
			p88_nodes.forEach(detach);
			t667 = claim_space(section14_nodes);
			pre34 = claim_element(section14_nodes, "PRE", { class: true });
			var pre34_nodes = children(pre34);
			pre34_nodes.forEach(detach);
			section14_nodes.forEach(detach);
			t668 = claim_space(nodes);
			section15 = claim_element(nodes, "SECTION", {});
			var section15_nodes = children(section15);
			h36 = claim_element(section15_nodes, "H3", {});
			var h36_nodes = children(h36);
			a71 = claim_element(h36_nodes, "A", { href: true, id: true });
			var a71_nodes = children(a71);
			t669 = claim_text(a71_nodes, "Sorting of reactive declarations and statements");
			a71_nodes.forEach(detach);
			h36_nodes.forEach(detach);
			t670 = claim_space(section15_nodes);
			p89 = claim_element(section15_nodes, "P", {});
			var p89_nodes = children(p89);
			t671 = claim_text(p89_nodes, "Svelte tries to preserve the order of reactive declarations and statements as they are declared as much as possible.");
			p89_nodes.forEach(detach);
			t672 = claim_space(section15_nodes);
			p90 = claim_element(section15_nodes, "P", {});
			var p90_nodes = children(p90);
			t673 = claim_text(p90_nodes, "However, if one reactive declaration or statement refers to a variable that was defined by another reactive declaration, then, ");
			strong33 = claim_element(p90_nodes, "STRONG", {});
			var strong33_nodes = children(strong33);
			t674 = claim_text(strong33_nodes, "it will be inserted after the latter reactive declaration");
			strong33_nodes.forEach(detach);
			t675 = claim_text(p90_nodes, ":");
			p90_nodes.forEach(detach);
			t676 = claim_space(section15_nodes);
			pre35 = claim_element(section15_nodes, "PRE", { class: true });
			var pre35_nodes = children(pre35);
			pre35_nodes.forEach(detach);
			section15_nodes.forEach(detach);
			t677 = claim_space(nodes);
			section16 = claim_element(nodes, "SECTION", {});
			var section16_nodes = children(section16);
			h37 = claim_element(section16_nodes, "H3", {});
			var h37_nodes = children(h37);
			a72 = claim_element(h37_nodes, "A", { href: true, id: true });
			var a72_nodes = children(a72);
			t678 = claim_text(a72_nodes, "Reactive variable that is not reactive");
			a72_nodes.forEach(detach);
			h37_nodes.forEach(detach);
			t679 = claim_space(section16_nodes);
			p91 = claim_element(section16_nodes, "P", {});
			var p91_nodes = children(p91);
			t680 = claim_text(p91_nodes, "The Svelte compiler tracks all the variables declared in the ");
			code124 = claim_element(p91_nodes, "CODE", {});
			var code124_nodes = children(code124);
			t681 = claim_text(code124_nodes, "<script>");
			code124_nodes.forEach(detach);
			t682 = claim_text(p91_nodes, " tag.");
			p91_nodes.forEach(detach);
			t683 = claim_space(section16_nodes);
			p92 = claim_element(section16_nodes, "P", {});
			var p92_nodes = children(p92);
			t684 = claim_text(p92_nodes, "If all the variables of a reactive declaration or statement refers to, never gets mutated or reassigned, then the reactive declaration or statement will not be added into ");
			code125 = claim_element(p92_nodes, "CODE", {});
			var code125_nodes = children(code125);
			t685 = claim_text(code125_nodes, "$$.update");
			code125_nodes.forEach(detach);
			t686 = claim_text(p92_nodes, ".");
			p92_nodes.forEach(detach);
			t687 = claim_space(section16_nodes);
			p93 = claim_element(section16_nodes, "P", {});
			var p93_nodes = children(p93);
			t688 = claim_text(p93_nodes, "For example:");
			p93_nodes.forEach(detach);
			t689 = claim_space(section16_nodes);
			pre36 = claim_element(section16_nodes, "PRE", { class: true });
			var pre36_nodes = children(pre36);
			pre36_nodes.forEach(detach);
			t690 = claim_space(section16_nodes);
			p94 = claim_element(section16_nodes, "P", {});
			var p94_nodes = children(p94);
			a73 = claim_element(p94_nodes, "A", { href: true, rel: true });
			var a73_nodes = children(a73);
			t691 = claim_text(a73_nodes, "Svelte REPL");
			a73_nodes.forEach(detach);
			p94_nodes.forEach(detach);
			t692 = claim_space(section16_nodes);
			p95 = claim_element(section16_nodes, "P", {});
			var p95_nodes = children(p95);
			t693 = claim_text(p95_nodes, "Since, ");
			code126 = claim_element(p95_nodes, "CODE", {});
			var code126_nodes = children(code126);
			t694 = claim_text(code126_nodes, "count");
			code126_nodes.forEach(detach);
			t695 = claim_text(p95_nodes, " never gets mutated or reassigned, Svelte optimises the compiled output by not defining ");
			code127 = claim_element(p95_nodes, "CODE", {});
			var code127_nodes = children(code127);
			t696 = claim_text(code127_nodes, "$$self.$$.update");
			code127_nodes.forEach(detach);
			t697 = claim_text(p95_nodes, ".");
			p95_nodes.forEach(detach);
			t698 = claim_space(section16_nodes);
			pre37 = claim_element(section16_nodes, "PRE", { class: true });
			var pre37_nodes = children(pre37);
			pre37_nodes.forEach(detach);
			section16_nodes.forEach(detach);
			t699 = claim_space(nodes);
			section17 = claim_element(nodes, "SECTION", {});
			var section17_nodes = children(section17);
			h23 = claim_element(section17_nodes, "H2", {});
			var h23_nodes = children(h23);
			a74 = claim_element(h23_nodes, "A", { href: true, id: true });
			var a74_nodes = children(a74);
			t700 = claim_text(a74_nodes, "Summary");
			a74_nodes.forEach(detach);
			h23_nodes.forEach(detach);
			section17_nodes.forEach(detach);
			t701 = claim_space(nodes);
			section18 = claim_element(nodes, "SECTION", {});
			var section18_nodes = children(section18);
			h45 = claim_element(section18_nodes, "H4", {});
			var h45_nodes = children(h45);
			a75 = claim_element(h45_nodes, "A", { href: true, id: true });
			var a75_nodes = children(a75);
			t702 = claim_text(a75_nodes, "1. Svelte keeps track of which variables are dirty and batched the DOM updates.");
			a75_nodes.forEach(detach);
			h45_nodes.forEach(detach);
			section18_nodes.forEach(detach);
			t703 = claim_space(nodes);
			section19 = claim_element(nodes, "SECTION", {});
			var section19_nodes = children(section19);
			h46 = claim_element(section19_nodes, "H4", {});
			var h46_nodes = children(h46);
			a76 = claim_element(h46_nodes, "A", { href: true, id: true });
			var a76_nodes = children(a76);
			t704 = claim_text(a76_nodes, "2. Using bitmask, Svelte able to generate a more compact compiled code.");
			a76_nodes.forEach(detach);
			h46_nodes.forEach(detach);
			section19_nodes.forEach(detach);
			t705 = claim_space(nodes);
			section20 = claim_element(nodes, "SECTION", {});
			var section20_nodes = children(section20);
			h47 = claim_element(section20_nodes, "H4", {});
			var h47_nodes = children(h47);
			a77 = claim_element(h47_nodes, "A", { href: true, id: true });
			var a77_nodes = children(a77);
			t706 = claim_text(a77_nodes, "3. Reactive declarations and statements are executed in batch, just like DOM updates");
			a77_nodes.forEach(detach);
			h47_nodes.forEach(detach);
			section20_nodes.forEach(detach);
			t707 = claim_space(nodes);
			section21 = claim_element(nodes, "SECTION", {});
			var section21_nodes = children(section21);
			h24 = claim_element(section21_nodes, "H2", {});
			var h24_nodes = children(h24);
			a78 = claim_element(h24_nodes, "A", { href: true, id: true });
			var a78_nodes = children(a78);
			t708 = claim_text(a78_nodes, "Closing Note");
			a78_nodes.forEach(detach);
			h24_nodes.forEach(detach);
			t709 = claim_space(section21_nodes);
			p96 = claim_element(section21_nodes, "P", {});
			var p96_nodes = children(p96);
			t710 = claim_text(p96_nodes, "If you wish to know more, ");
			a79 = claim_element(p96_nodes, "A", { href: true, rel: true });
			var a79_nodes = children(a79);
			t711 = claim_text(a79_nodes, "follow me on Twitter");
			a79_nodes.forEach(detach);
			t712 = claim_text(p96_nodes, ".");
			p96_nodes.forEach(detach);
			t713 = claim_space(section21_nodes);
			p97 = claim_element(section21_nodes, "P", {});
			var p97_nodes = children(p97);
			t714 = claim_text(p97_nodes, "I'll post it on Twitter when the next part is ready, where I'll be covering ");
			a80 = claim_element(p97_nodes, "A", { href: true, rel: true });
			var a80_nodes = children(a80);
			t715 = claim_text(a80_nodes, "logic blocks");
			a80_nodes.forEach(detach);
			t716 = claim_text(p97_nodes, ", ");
			a81 = claim_element(p97_nodes, "A", { href: true, rel: true });
			var a81_nodes = children(a81);
			t717 = claim_text(a81_nodes, "slots");
			a81_nodes.forEach(detach);
			t718 = claim_text(p97_nodes, ", ");
			a82 = claim_element(p97_nodes, "A", { href: true, rel: true });
			var a82_nodes = children(a82);
			t719 = claim_text(a82_nodes, "context");
			a82_nodes.forEach(detach);
			t720 = claim_text(p97_nodes, ", and many others.");
			p97_nodes.forEach(detach);
			t721 = claim_space(section21_nodes);
			p98 = claim_element(section21_nodes, "P", {});
			var p98_nodes = children(p98);
			strong34 = claim_element(p98_nodes, "STRONG", {});
			var strong34_nodes = children(strong34);
			t722 = claim_text(strong34_nodes, "⬅ ⬅  Previously in ");
			a83 = claim_element(strong34_nodes, "A", { href: true });
			var a83_nodes = children(a83);
			t723 = claim_text(a83_nodes, "Part 1");
			a83_nodes.forEach(detach);
			t724 = claim_text(strong34_nodes, ".");
			strong34_nodes.forEach(detach);
			p98_nodes.forEach(detach);
			t725 = claim_space(section21_nodes);
			p99 = claim_element(section21_nodes, "P", {});
			var p99_nodes = children(p99);
			strong35 = claim_element(p99_nodes, "STRONG", {});
			var strong35_nodes = children(strong35);
			t726 = claim_text(strong35_nodes, "➡ ➡  Continue reading on ");
			a84 = claim_element(strong35_nodes, "A", { href: true });
			var a84_nodes = children(a84);
			t727 = claim_text(a84_nodes, "Part 3");
			a84_nodes.forEach(detach);
			t728 = claim_text(strong35_nodes, ".");
			strong35_nodes.forEach(detach);
			p99_nodes.forEach(detach);
			section21_nodes.forEach(detach);
			t729 = claim_space(nodes);
			section22 = claim_element(nodes, "SECTION", {});
			var section22_nodes = children(section22);
			h25 = claim_element(section22_nodes, "H2", {});
			var h25_nodes = children(h25);
			a85 = claim_element(h25_nodes, "A", { href: true, id: true });
			var a85_nodes = children(a85);
			t730 = claim_text(a85_nodes, "Further Resources");
			a85_nodes.forEach(detach);
			h25_nodes.forEach(detach);
			t731 = claim_space(section22_nodes);
			ul19 = claim_element(section22_nodes, "UL", {});
			var ul19_nodes = children(ul19);
			li71 = claim_element(ul19_nodes, "LI", {});
			var li71_nodes = children(li71);
			t732 = claim_text(li71_nodes, "Rich Harris shares about ");
			a86 = claim_element(li71_nodes, "A", { href: true, rel: true });
			var a86_nodes = children(a86);
			t733 = claim_text(a86_nodes, "Bitmask Tracking at Svelte Society NYC");
			a86_nodes.forEach(detach);
			t734 = claim_text(li71_nodes, ".");
			li71_nodes.forEach(detach);
			t735 = claim_space(ul19_nodes);
			li72 = claim_element(ul19_nodes, "LI", {});
			var li72_nodes = children(li72);
			t736 = claim_text(li72_nodes, "Svelte Tutorial - ");
			a87 = claim_element(li72_nodes, "A", { href: true, rel: true });
			var a87_nodes = children(a87);
			t737 = claim_text(a87_nodes, "Reactivity");
			a87_nodes.forEach(detach);
			t738 = claim_space(li72_nodes);
			a88 = claim_element(li72_nodes, "A", { href: true, rel: true });
			var a88_nodes = children(a88);
			t739 = claim_text(a88_nodes, "https://jakearchibald.com/2015/tasks-microtasks-queues-and-schedules/");
			a88_nodes.forEach(detach);
			li72_nodes.forEach(detach);
			t740 = claim_space(ul19_nodes);
			li73 = claim_element(ul19_nodes, "LI", {});
			var li73_nodes = children(li73);
			a89 = claim_element(li73_nodes, "A", { href: true, rel: true });
			var a89_nodes = children(a89);
			t741 = claim_text(a89_nodes, "The Art of Bitmasking");
			a89_nodes.forEach(detach);
			t742 = claim_text(li73_nodes, " by Shakib Ahmed");
			li73_nodes.forEach(detach);
			t743 = claim_space(ul19_nodes);
			li74 = claim_element(ul19_nodes, "LI", {});
			var li74_nodes = children(li74);
			a90 = claim_element(li74_nodes, "A", { href: true, rel: true });
			var a90_nodes = children(a90);
			t744 = claim_text(a90_nodes, "Bitmasks: A very esoteric (and impractical) way of managing booleans");
			a90_nodes.forEach(detach);
			t745 = claim_text(li74_nodes, " by Basti Ortiz");
			li74_nodes.forEach(detach);
			t746 = claim_space(ul19_nodes);
			li75 = claim_element(ul19_nodes, "LI", {});
			var li75_nodes = children(li75);
			a91 = claim_element(li75_nodes, "A", { href: true, rel: true });
			var a91_nodes = children(a91);
			t747 = claim_text(a91_nodes, "MDN: Bitwise Operators");
			a91_nodes.forEach(detach);
			li75_nodes.forEach(detach);
			ul19_nodes.forEach(detach);
			section22_nodes.forEach(detach);
			this.h();
		},
		h() {
			attr(a0, "href", "#pre-v");
			attr(a1, "href", "#ctx");
			attr(a2, "href", "#dirty");
			attr(a3, "href", "#invalidate");
			attr(a4, "href", "#schedule-update");
			attr(a5, "href", "#tl-dr");
			attr(a6, "href", "#v");
			attr(a7, "href", "#bitmask");
			attr(a8, "href", "#bitmask-in-svelte");
			attr(a9, "href", "#destructuring");
			attr(a10, "href", "#tl-dr");
			attr(a11, "href", "#reactive-declaration");
			attr(a12, "href", "#execution-of-all-reactive-declarations-and-statements-are-batched");
			attr(a13, "href", "#the-value-of-reactive-variable-outside-of-reactive-declarations-and-statements-may-not-be-up-to-date");
			attr(a14, "href", "#sorting-of-reactive-declarations-and-statements");
			attr(a15, "href", "#reactive-variable-that-is-not-reactive");
			attr(a16, "href", "#summary");
			attr(a17, "href", "#svelte-keeps-track-of-which-variables-are-dirty-and-batched-the-dom-updates");
			attr(a18, "href", "#using-bitmask-svelte-able-to-generate-a-more-compact-compiled-code");
			attr(a19, "href", "#reactive-declarations-and-statements-are-executed-in-batch-just-like-dom-updates");
			attr(a20, "href", "#closing-note");
			attr(a21, "href", "#further-resources");
			attr(ul8, "class", "sitemap");
			attr(ul8, "id", "sitemap");
			attr(ul8, "role", "navigation");
			attr(ul8, "aria-label", "Table of Contents");
			attr(a22, "href", "/compile-svelte-in-your-head-part-1/");
			attr(a23, "href", "/compile-svelte-in-your-head-part-1/");
			attr(pre0, "class", "language-js");
			attr(a24, "href", "https://github.com/sveltejs/svelte/blob/v3.20.1/CHANGELOG.md#3201");
			attr(a24, "rel", "nofollow");
			attr(a25, "href", "#pre-v");
			attr(a25, "id", "pre-v");
			attr(a26, "href", "https://github.com/sveltejs/svelte/blob/master/CHANGELOG.md#3160");
			attr(a26, "rel", "nofollow");
			attr(a27, "href", "https://github.com/sveltejs/svelte/pull/3945");
			attr(a27, "rel", "nofollow");
			attr(a28, "href", "/compile-svelte-in-your-head-part-1");
			attr(a29, "href", "#ctx");
			attr(a29, "id", "ctx");
			attr(a30, "href", "/compile-svelte-in-your-head-part-1#instance-variable");
			attr(pre1, "class", "language-svelte");
			attr(a31, "href", "https://svelte.dev/repl/5b12ff52c2874f4dbb6405d9133b34da?version=3.20.1");
			attr(a31, "rel", "nofollow");
			attr(pre2, "class", "language-js");
			attr(a32, "href", "#dirty");
			attr(a32, "id", "dirty");
			attr(pre3, "class", "language-svelte");
			attr(a33, "href", "https://svelte.dev/repl/da579d0113b44f01b2b94893dce21487?version=3.20.1");
			attr(a33, "rel", "nofollow");
			attr(a34, "href", "https://github.com/sveltejs/svelte/blob/v3.15.0/src/runtime/internal/Component.ts#L124");
			attr(a34, "rel", "nofollow");
			attr(pre4, "class", "language-js");
			attr(pre5, "class", "language-js");
			attr(pre6, "class", "language-js");
			attr(a35, "href", "#invalidate");
			attr(a35, "id", "invalidate");
			attr(pre7, "class", "language-js");
			attr(pre8, "class", "language-js");
			attr(a36, "href", "https://github.com/sveltejs/svelte/blob/v3.15.0/src/runtime/internal/Component.ts#L130-L136");
			attr(a36, "rel", "nofollow");
			attr(pre9, "class", "language-js");
			attr(pre10, "class", "language-js");
			attr(a37, "href", "#schedule-update");
			attr(a37, "id", "schedule-update");
			attr(a38, "href", "https://github.com/sveltejs/svelte/blob/v3.20.1/CHANGELOG.md#3201");
			attr(a38, "rel", "nofollow");
			attr(a39, "href", "https://jakearchibald.com/2015/tasks-microtasks-queues-and-schedules/");
			attr(a39, "rel", "nofollow");
			attr(pre11, "class", "language-js");
			attr(pre12, "class", "language-js");
			attr(a40, "href", "https://github.com/sveltejs/svelte/blob/v3.15.0/src/runtime/internal/scheduler.ts#L14");
			attr(a40, "rel", "nofollow");
			attr(pre13, "class", "language-svelte");
			attr(a41, "href", "https://svelte.dev/repl/761a0a6cc2834afb842942e1d23875b1?version=3.20.1");
			attr(a41, "rel", "nofollow");
			attr(a42, "href", "#tl-dr");
			attr(a42, "id", "tl-dr");
			attr(a43, "href", "#v");
			attr(a43, "id", "v");
			attr(a44, "href", "https://github.com/sveltejs/svelte/pull/3945");
			attr(a44, "rel", "nofollow");
			attr(pre14, "class", "language-js");
			attr(pre15, "class", "language-js");
			attr(a45, "href", "https://en.wikipedia.org/wiki/Mask_(computing)");
			attr(a45, "rel", "nofollow");
			attr(pre16, "class", "language-js");
			attr(a46, "href", "#bitmask");
			attr(a46, "id", "bitmask");
			attr(a47, "href", "https://blog.bitsrc.io/the-art-of-bitmasking-ec58ab1b4c03");
			attr(a47, "rel", "nofollow");
			attr(a48, "href", "https://dev.to/somedood/bitmasks-a-very-esoteric-and-impractical-way-of-managing-booleans-1hlf");
			attr(a48, "rel", "nofollow");
			attr(a49, "href", "https://en.wikipedia.org/wiki/Bit_numbering#Least_significant_bit");
			attr(a49, "rel", "nofollow");
			attr(a50, "href", "https://en.wikipedia.org/wiki/Bit_numbering#Most_significant_bit");
			attr(a50, "rel", "nofollow");
			attr(a51, "href", "https://2ality.com/2012/04/number-encoding.html");
			attr(a51, "rel", "nofollow");
			attr(a52, "href", "https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Operators/Bitwise_Operators");
			attr(a52, "rel", "nofollow");
			attr(a53, "href", "https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Operators/Bitwise_Operators");
			attr(a53, "rel", "nofollow");
			attr(pre17, "class", "language-js");
			attr(a54, "href", "https://en.wikipedia.org/wiki/Mask_(computing)");
			attr(a54, "rel", "nofollow");
			attr(a55, "href", "#bitmask-in-svelte");
			attr(a55, "id", "bitmask-in-svelte");
			attr(pre18, "class", "language-js");
			attr(pre19, "class", "language-js");
			attr(pre20, "class", "language-js");
			attr(pre21, "class", "language-js");
			attr(pre22, "class", "language-js");
			attr(pre23, "class", "language-js");
			attr(a56, "href", "#destructuring");
			attr(a56, "id", "destructuring");
			attr(pre24, "class", "language-js");
			attr(a57, "href", "#tl-dr");
			attr(a57, "id", "tl-dr");
			attr(a58, "href", "#reactive-declaration");
			attr(a58, "id", "reactive-declaration");
			attr(a59, "href", "https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Statements/label");
			attr(a59, "rel", "nofollow");
			attr(pre25, "class", "language-svelte");
			attr(a60, "href", "https://svelte.dev/repl/e37329dd126448b2aa0679c08993f9a8?version=3.20.1");
			attr(a60, "rel", "nofollow");
			attr(a61, "href", "/compile-svelte-in-your-head-part-1/#instanceself-props-invalidate");
			attr(pre26, "class", "language-js");
			attr(pre27, "class", "language-svelte");
			attr(a62, "href", "https://svelte.dev/repl/fc6995856489402d90291c4c30952939?version=3.20.1");
			attr(a62, "rel", "nofollow");
			attr(pre28, "class", "language-js");
			attr(a63, "href", "https://en.wikipedia.org/wiki/NOP_(code)");
			attr(a63, "rel", "nofollow");
			attr(a64, "href", "https://github.com/sveltejs/svelte/blob/v3.20.1/src/runtime/internal/Component.ts#L111");
			attr(a64, "rel", "nofollow");
			attr(pre29, "class", "language-svelte");
			attr(a65, "href", "https://svelte.dev/repl/fc6995856489402d90291c4c30952939?version=3.20.1");
			attr(a65, "rel", "nofollow");
			attr(pre30, "class", "language-js");
			attr(a66, "href", "#execution-of-all-reactive-declarations-and-statements-are-batched");
			attr(a66, "id", "execution-of-all-reactive-declarations-and-statements-are-batched");
			attr(pre31, "class", "language-svelte");
			attr(a67, "href", "https://svelte.dev/repl/941195f1cd5248e9bd14613f9513ad1d?version=3.20.1");
			attr(a67, "rel", "nofollow");
			attr(a68, "href", "#schedule_update");
			attr(pre32, "class", "language-js");
			attr(a69, "href", "#the-value-of-reactive-variable-outside-of-reactive-declarations-and-statements-may-not-be-up-to-date");
			attr(a69, "id", "the-value-of-reactive-variable-outside-of-reactive-declarations-and-statements-may-not-be-up-to-date");
			attr(pre33, "class", "language-svelte");
			attr(a70, "href", "https://svelte.dev/repl/437548d5c7044cb59bfd0c8a0f4c725d?version=3.20.1");
			attr(a70, "rel", "nofollow");
			attr(pre34, "class", "language-svelte");
			attr(a71, "href", "#sorting-of-reactive-declarations-and-statements");
			attr(a71, "id", "sorting-of-reactive-declarations-and-statements");
			attr(pre35, "class", "language-js");
			attr(a72, "href", "#reactive-variable-that-is-not-reactive");
			attr(a72, "id", "reactive-variable-that-is-not-reactive");
			attr(pre36, "class", "language-svelte");
			attr(a73, "href", "https://svelte.dev/repl/af86472e1f494cfea2efa494f63fff08?version=3.20.1");
			attr(a73, "rel", "nofollow");
			attr(pre37, "class", "language-js");
			attr(a74, "href", "#summary");
			attr(a74, "id", "summary");
			attr(a75, "href", "#svelte-keeps-track-of-which-variables-are-dirty-and-batched-the-dom-updates");
			attr(a75, "id", "svelte-keeps-track-of-which-variables-are-dirty-and-batched-the-dom-updates");
			attr(a76, "href", "#using-bitmask-svelte-able-to-generate-a-more-compact-compiled-code");
			attr(a76, "id", "using-bitmask-svelte-able-to-generate-a-more-compact-compiled-code");
			attr(a77, "href", "#reactive-declarations-and-statements-are-executed-in-batch-just-like-dom-updates");
			attr(a77, "id", "reactive-declarations-and-statements-are-executed-in-batch-just-like-dom-updates");
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
			attr(a83, "href", "/compile-svelte-in-your-head-part-1/");
			attr(a84, "href", "/compile-svelte-in-your-head-part-3/");
			attr(a85, "href", "#further-resources");
			attr(a85, "id", "further-resources");
			attr(a86, "href", "https://www.youtube.com/watch?v=zq6PpM5t3z0&t=2530s");
			attr(a86, "rel", "nofollow");
			attr(a87, "href", "https://svelte.dev/tutorial/reactive-assignments");
			attr(a87, "rel", "nofollow");
			attr(a88, "href", "https://jakearchibald.com/2015/tasks-microtasks-queues-and-schedules/");
			attr(a88, "rel", "nofollow");
			attr(a89, "href", "https://blog.bitsrc.io/the-art-of-bitmasking-ec58ab1b4c03");
			attr(a89, "rel", "nofollow");
			attr(a90, "href", "https://dev.to/somedood/bitmasks-a-very-esoteric-and-impractical-way-of-managing-booleans-1hlf");
			attr(a90, "rel", "nofollow");
			attr(a91, "href", "https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Operators/Bitwise_Operators");
			attr(a91, "rel", "nofollow");
		},
		m(target, anchor) {
			insert(target, section0, anchor);
			append(section0, ul8);
			append(ul8, li0);
			append(li0, a0);
			append(a0, t0);
			append(ul8, ul1);
			append(ul1, li1);
			append(li1, a1);
			append(a1, t1);
			append(ul1, li2);
			append(li2, a2);
			append(a2, t2);
			append(ul1, li3);
			append(li3, a3);
			append(a3, t3);
			append(ul1, li4);
			append(li4, a4);
			append(a4, t4);
			append(ul1, ul0);
			append(ul0, li5);
			append(li5, a5);
			append(a5, t5);
			append(ul8, li6);
			append(li6, a6);
			append(a6, t6);
			append(ul8, ul3);
			append(ul3, li7);
			append(li7, a7);
			append(a7, t7);
			append(ul3, li8);
			append(li8, a8);
			append(a8, t8);
			append(ul3, ul2);
			append(ul2, li9);
			append(li9, a9);
			append(a9, t9);
			append(ul2, li10);
			append(li10, a10);
			append(a10, t10);
			append(ul8, li11);
			append(li11, a11);
			append(a11, t11);
			append(ul8, ul5);
			append(ul5, ul4);
			append(ul4, li12);
			append(li12, a12);
			append(a12, t12);
			append(ul4, li13);
			append(li13, a13);
			append(a13, t13);
			append(ul5, li14);
			append(li14, a14);
			append(a14, t14);
			append(ul5, li15);
			append(li15, a15);
			append(a15, t15);
			append(ul8, li16);
			append(li16, a16);
			append(a16, t16);
			append(ul8, ul7);
			append(ul7, ul6);
			append(ul6, li17);
			append(li17, a17);
			append(a17, t17);
			append(ul6, li18);
			append(li18, a18);
			append(a18, t18);
			append(ul6, li19);
			append(li19, a19);
			append(a19, t19);
			append(ul8, li20);
			append(li20, a20);
			append(a20, t20);
			append(ul8, li21);
			append(li21, a21);
			append(a21, t21);
			insert(target, t22, anchor);
			insert(target, p0, anchor);
			append(p0, strong0);
			append(strong0, t23);
			append(strong0, a22);
			append(a22, t24);
			append(strong0, t25);
			insert(target, t26, anchor);
			insert(target, p1, anchor);
			append(p1, a23);
			append(a23, t27);
			append(p1, t28);
			append(p1, code0);
			append(code0, t29);
			append(p1, t30);
			append(p1, code1);
			append(code1, t31);
			append(p1, t32);
			insert(target, t33, anchor);
			insert(target, pre0, anchor);
			pre0.innerHTML = raw0_value;
			insert(target, t34, anchor);
			insert(target, p2, anchor);
			append(p2, t35);
			append(p2, code2);
			append(code2, t36);
			append(p2, t37);
			append(p2, code3);
			append(code3, t38);
			append(p2, t39);
			insert(target, t40, anchor);
			insert(target, p3, anchor);
			append(p3, t41);
			append(p3, a24);
			append(a24, t42);
			append(p3, t43);
			insert(target, t44, anchor);
			insert(target, section1, anchor);
			append(section1, h20);
			append(h20, a25);
			append(a25, t45);
			append(section1, t46);
			append(section1, p4);
			append(p4, t47);
			append(p4, code4);
			append(code4, t48);
			append(p4, t49);
			append(p4, a26);
			append(a26, t50);
			append(p4, t51);
			append(p4, a27);
			append(a27, t52);
			append(p4, t53);
			append(p4, code5);
			append(code5, t54);
			append(p4, t55);
			append(section1, t56);
			append(section1, p5);
			append(p5, t57);
			append(p5, a28);
			append(a28, t58);
			append(p5, t59);
			insert(target, t60, anchor);
			insert(target, section2, anchor);
			append(section2, h30);
			append(h30, a29);
			append(a29, t61);
			append(section2, t62);
			append(section2, p6);
			append(p6, t63);
			append(p6, strong1);
			append(strong1, t64);
			append(p6, t65);
			append(section2, t66);
			append(section2, p7);
			append(p7, t67);
			append(p7, a30);
			append(a30, t68);
			append(p7, t69);
			append(section2, t70);
			append(section2, ul9);
			append(ul9, li22);
			append(li22, t71);
			append(li22, code6);
			append(code6, t72);
			append(li22, t73);
			append(ul9, t74);
			append(ul9, li23);
			append(li23, t75);
			append(ul9, t76);
			append(ul9, li24);
			append(li24, t77);
			append(section2, t78);
			append(section2, p8);
			append(p8, t79);
			append(section2, t80);
			append(section2, p9);
			append(p9, t81);
			append(section2, t82);
			append(section2, p10);
			append(p10, t83);
			append(p10, code7);
			append(code7, t84);
			append(p10, t85);
			append(p10, code8);
			append(code8, t86);
			append(p10, t87);
			append(section2, t88);
			append(section2, p11);
			append(p11, t89);
			append(p11, code9);
			append(code9, t90);
			append(p11, t91);
			append(p11, code10);
			append(code10, t92);
			append(p11, t93);
			append(section2, t94);
			append(section2, pre1);
			pre1.innerHTML = raw1_value;
			append(section2, t95);
			append(section2, p12);
			append(p12, a31);
			append(a31, t96);
			append(section2, t97);
			append(section2, pre2);
			pre2.innerHTML = raw2_value;
			append(section2, t98);
			append(section2, p13);
			append(p13, t99);
			append(p13, code11);
			append(code11, t100);
			append(p13, t101);
			append(p13, code12);
			append(code12, t102);
			append(p13, t103);
			insert(target, t104, anchor);
			insert(target, section3, anchor);
			append(section3, h31);
			append(h31, a32);
			append(a32, t105);
			append(section3, t106);
			append(section3, p14);
			append(p14, code13);
			append(code13, t107);
			append(p14, t108);
			append(section3, t109);
			append(section3, p15);
			append(p15, t110);
			append(section3, t111);
			append(section3, pre3);
			pre3.innerHTML = raw3_value;
			append(section3, t112);
			append(section3, p16);
			append(p16, a33);
			append(a33, t113);
			append(section3, t114);
			append(section3, p17);
			append(p17, t115);
			append(p17, code14);
			append(code14, t116);
			append(p17, t117);
			append(p17, code15);
			append(code15, t118);
			append(p17, t119);
			append(p17, a34);
			append(a34, t120);
			append(p17, t121);
			append(section3, t122);
			append(section3, p18);
			append(p18, t123);
			append(p18, strong2);
			append(strong2, t124);
			append(p18, t125);
			append(p18, code16);
			append(code16, t126);
			append(p18, t127);
			append(section3, t128);
			append(section3, pre4);
			pre4.innerHTML = raw4_value;
			append(section3, t129);
			append(section3, p19);
			append(p19, t130);
			append(p19, strong3);
			append(strong3, t131);
			append(p19, t132);
			append(p19, code17);
			append(code17, t133);
			append(p19, t134);
			append(section3, t135);
			append(section3, pre5);
			pre5.innerHTML = raw5_value;
			append(section3, t136);
			append(section3, p20);
			append(p20, code18);
			append(code18, t137);
			append(p20, t138);
			append(section3, t139);
			append(section3, p21);
			append(p21, t140);
			append(p21, strong4);
			append(strong4, t141);
			append(p21, t142);
			append(p21, code19);
			append(code19, t143);
			append(p21, t144);
			append(section3, t145);
			append(section3, pre6);
			pre6.innerHTML = raw6_value;
			append(section3, t146);
			append(section3, p22);
			append(p22, t147);
			append(p22, code20);
			append(code20, t148);
			append(p22, t149);
			append(p22, code21);
			append(code21, t150);
			append(p22, t151);
			insert(target, t152, anchor);
			insert(target, section4, anchor);
			append(section4, h32);
			append(h32, a35);
			append(a35, t153);
			append(section4, t154);
			append(section4, p23);
			append(p23, code22);
			append(code22, t155);
			append(p23, t156);
			append(section4, t157);
			append(section4, p24);
			append(p24, t158);
			append(section4, t159);
			append(section4, ul10);
			append(ul10, li25);
			append(li25, t160);
			append(li25, code23);
			append(code23, t161);
			append(ul10, t162);
			append(ul10, li26);
			append(li26, t163);
			append(li26, code24);
			append(code24, t164);
			append(section4, t165);
			append(section4, p25);
			append(p25, t166);
			append(p25, code25);
			append(code25, t167);
			append(p25, t168);
			append(section4, t169);
			append(section4, pre7);
			pre7.innerHTML = raw7_value;
			append(section4, t170);
			append(section4, p26);
			append(p26, t171);
			append(p26, code26);
			append(code26, t172);
			append(p26, t173);
			append(section4, t174);
			append(section4, ol0);
			append(ol0, li27);
			append(li27, t175);
			append(li27, code27);
			append(code27, t176);
			append(ol0, t177);
			append(ol0, li28);
			append(li28, t178);
			append(li28, code28);
			append(code28, t179);
			append(ol0, t180);
			append(ol0, li29);
			append(li29, t181);
			append(ol0, t182);
			append(ol0, li30);
			append(li30, t183);
			append(section4, t184);
			append(section4, pre8);
			pre8.innerHTML = raw8_value;
			append(section4, t185);
			append(section4, p27);
			append(p27, a36);
			append(a36, t186);
			append(section4, t187);
			append(section4, p28);
			append(p28, t188);
			append(p28, code29);
			append(code29, t189);
			append(p28, t190);
			append(section4, t191);
			append(section4, p29);
			append(p29, t192);
			append(p29, code30);
			append(code30, t193);
			append(p29, t194);
			append(section4, t195);
			append(section4, pre9);
			pre9.innerHTML = raw9_value;
			append(section4, t196);
			append(section4, p30);
			append(p30, t197);
			append(section4, t198);
			append(section4, p31);
			append(p31, t199);
			append(p31, code31);
			append(code31, t200);
			append(p31, t201);
			append(p31, code32);
			append(code32, t202);
			append(p31, t203);
			append(section4, t204);
			append(section4, p32);
			append(p32, t205);
			append(p32, code33);
			append(code33, t206);
			append(p32, t207);
			append(section4, t208);
			append(section4, pre10);
			pre10.innerHTML = raw10_value;
			append(section4, t209);
			append(section4, p33);
			append(p33, t210);
			append(p33, code34);
			append(code34, t211);
			append(p33, t212);
			append(p33, code35);
			append(code35, t213);
			append(p33, t214);
			append(p33, code36);
			append(code36, t215);
			append(p33, t216);
			insert(target, t217, anchor);
			insert(target, section5, anchor);
			append(section5, h33);
			append(h33, a37);
			append(a37, t218);
			append(section5, t219);
			append(section5, p34);
			append(p34, code37);
			append(code37, t220);
			append(p34, t221);
			append(section5, t222);
			append(section5, p35);
			append(p35, t223);
			append(p35, a38);
			append(a38, t224);
			append(p35, t225);
			append(p35, a39);
			append(a39, t226);
			append(p35, t227);
			append(p35, code38);
			append(code38, t228);
			append(p35, t229);
			append(section5, t230);
			append(section5, p36);
			append(p36, t231);
			append(section5, t232);
			append(section5, pre11);
			pre11.innerHTML = raw11_value;
			append(section5, t233);
			append(section5, p37);
			append(p37, t234);
			append(p37, code39);
			append(code39, t235);
			append(p37, t236);
			append(section5, t237);
			append(section5, pre12);
			pre12.innerHTML = raw12_value;
			append(section5, t238);
			append(section5, p38);
			append(p38, a40);
			append(a40, t239);
			append(section5, t240);
			append(section5, p39);
			append(p39, t241);
			append(section5, t242);
			append(section5, pre13);
			pre13.innerHTML = raw13_value;
			append(section5, t243);
			append(section5, p40);
			append(p40, a41);
			append(a41, t244);
			append(section5, t245);
			append(section5, p41);
			append(p41, t246);
			append(p41, code40);
			append(code40, t247);
			append(p41, t248);
			append(p41, code41);
			append(code41, t249);
			append(p41, t250);
			append(section5, t251);
			append(section5, ol1);
			append(ol1, li31);
			append(li31, t252);
			append(li31, strong5);
			append(strong5, t253);
			append(li31, t254);
			append(li31, code42);
			append(code42, t255);
			append(li31, t256);
			append(ol1, t257);
			append(ol1, li32);
			append(li32, code43);
			append(code43, t258);
			append(ol1, t259);
			append(ol1, li33);
			append(li33, t260);
			append(li33, code44);
			append(code44, t261);
			append(li33, t262);
			append(li33, code45);
			append(code45, t263);
			append(ol1, t264);
			append(ol1, li34);
			append(li34, t265);
			append(li34, code46);
			append(code46, t266);
			append(ol1, t267);
			append(ol1, li35);
			append(li35, t268);
			append(li35, code47);
			append(code47, t269);
			append(li35, t270);
			append(ol1, t271);
			append(ol1, li36);
			append(li36, code48);
			append(code48, t272);
			append(ol1, t273);
			append(ol1, li37);
			append(li37, t274);
			append(li37, code49);
			append(code49, t275);
			append(li37, t276);
			append(li37, code50);
			append(code50, t277);
			append(ol1, t278);
			append(ol1, li38);
			append(li38, t279);
			append(li38, code51);
			append(code51, t280);
			append(ol1, t281);
			append(ol1, li39);
			append(li39, t282);
			append(li39, code52);
			append(code52, t283);
			append(li39, t284);
			append(ol1, t285);
			append(ol1, li40);
			append(li40, strong6);
			append(strong6, t286);
			append(ol1, t287);
			append(ol1, li41);
			append(li41, strong7);
			append(strong7, t288);
			append(ol1, t289);
			append(ol1, li42);
			append(li42, code53);
			append(code53, t290);
			append(li42, t291);
			append(li42, code54);
			append(code54, t292);
			append(li42, t293);
			append(ol1, t294);
			append(ol1, li45);
			append(li45, t295);
			append(li45, code55);
			append(code55, t296);
			append(li45, t297);
			append(li45, ul11);
			append(ul11, li43);
			append(li43, code56);
			append(code56, t298);
			append(li43, t299);
			append(li43, code57);
			append(code57, t300);
			append(ul11, t301);
			append(ul11, li44);
			append(li44, code58);
			append(code58, t302);
			append(li44, t303);
			append(li44, code59);
			append(code59, t304);
			append(ol1, t305);
			append(ol1, li48);
			append(li48, t306);
			append(li48, code60);
			append(code60, t307);
			append(li48, t308);
			append(li48, ul12);
			append(ul12, li46);
			append(li46, t309);
			append(li46, code61);
			append(code61, t310);
			append(li46, t311);
			append(li46, code62);
			append(code62, t312);
			append(ul12, t313);
			append(ul12, li47);
			append(li47, t314);
			append(li47, code63);
			append(code63, t315);
			append(li47, t316);
			append(li47, code64);
			append(code64, t317);
			append(ol1, t318);
			append(ol1, li49);
			append(li49, t319);
			append(li49, code65);
			append(code65, t320);
			append(li49, t321);
			append(li49, code66);
			append(code66, t322);
			append(ol1, t323);
			append(ol1, li50);
			append(li50, t324);
			append(ol1, t325);
			append(ol1, li51);
			append(li51, strong8);
			append(strong8, t326);
			insert(target, t327, anchor);
			insert(target, section6, anchor);
			append(section6, h40);
			append(h40, a42);
			append(a42, t328);
			append(section6, t329);
			append(section6, ul13);
			append(ul13, li52);
			append(li52, t330);
			append(li52, code67);
			append(code67, t331);
			append(li52, t332);
			append(li52, code68);
			append(code68, t333);
			append(li52, t334);
			append(li52, code69);
			append(code69, t335);
			append(li52, t336);
			append(ul13, t337);
			append(ul13, li53);
			append(li53, t338);
			append(ul13, t339);
			append(ul13, li54);
			append(li54, t340);
			append(li54, code70);
			append(code70, t341);
			append(li54, t342);
			append(ul13, t343);
			append(ul13, li55);
			append(li55, t344);
			append(li55, code71);
			append(code71, t345);
			append(li55, t346);
			append(li55, code72);
			append(code72, t347);
			append(li55, t348);
			insert(target, t349, anchor);
			insert(target, section7, anchor);
			append(section7, h21);
			append(h21, a43);
			append(a43, t350);
			append(section7, t351);
			append(section7, p42);
			append(p42, t352);
			append(p42, a44);
			append(a44, t353);
			append(p42, t354);
			append(p42, strong9);
			append(strong9, t355);
			append(p42, t356);
			append(section7, t357);
			append(section7, p43);
			append(p43, t358);
			append(section7, t359);
			append(section7, pre14);
			pre14.innerHTML = raw14_value;
			append(section7, t360);
			append(section7, p44);
			append(p44, t361);
			append(section7, t362);
			append(section7, pre15);
			pre15.innerHTML = raw15_value;
			append(section7, t363);
			append(section7, p45);
			append(p45, t364);
			append(p45, a45);
			append(a45, t365);
			append(p45, t366);
			append(section7, t367);
			append(section7, pre16);
			pre16.innerHTML = raw16_value;
			append(section7, t368);
			append(section7, p46);
			append(p46, t369);
			insert(target, t370, anchor);
			insert(target, section8, anchor);
			append(section8, h34);
			append(h34, a46);
			append(a46, t371);
			append(section8, t372);
			append(section8, p47);
			append(p47, t373);
			append(section8, t374);
			append(section8, p48);
			append(p48, t375);
			append(p48, a47);
			append(a47, t376);
			append(p48, t377);
			append(p48, a48);
			append(a48, t378);
			append(p48, t379);
			append(section8, t380);
			append(section8, p49);
			append(p49, t381);
			append(p49, code73);
			append(code73, t382);
			append(p49, t383);
			append(p49, code74);
			append(code74, t384);
			append(p49, t385);
			append(p49, code75);
			append(code75, t386);
			append(p49, t387);
			append(p49, code76);
			append(code76, t388);
			append(p49, t389);
			append(p49, code77);
			append(code77, t390);
			append(p49, t391);
			append(p49, code78);
			append(code78, t392);
			append(p49, t393);
			append(section8, t394);
			append(section8, p50);
			append(p50, t395);
			append(p50, strong10);
			append(strong10, t396);
			append(p50, t397);
			append(p50, code79);
			append(code79, t398);
			append(p50, t399);
			append(section8, t400);
			append(section8, p51);
			append(p51, t401);
			append(p51, strong11);
			append(strong11, t402);
			append(p51, t403);
			append(p51, code80);
			append(code80, t404);
			append(p51, t405);
			append(p51, code81);
			append(code81, t406);
			append(p51, t407);
			append(p51, a49);
			append(a49, t408);
			append(p51, t409);
			append(p51, a50);
			append(a50, t410);
			append(p51, t411);
			append(section8, t412);
			append(section8, p52);
			append(p52, strong12);
			append(strong12, t413);
			append(section8, t414);
			append(section8, p53);
			append(p53, t415);
			append(section8, t416);
			append(section8, p54);
			append(p54, t417);
			append(p54, a51);
			append(a51, t418);
			append(p54, t419);
			append(p54, a52);
			append(a52, t420);
			append(p54, t421);
			append(section8, t422);
			append(section8, p55);
			append(p55, t423);
			append(p55, a53);
			append(a53, t424);
			append(p55, t425);
			append(section8, t426);
			append(section8, pre17);
			pre17.innerHTML = raw17_value;
			append(section8, t427);
			append(section8, p56);
			append(p56, t428);
			append(p56, a54);
			append(a54, t429);
			append(p56, t430);
			append(section8, t431);
			append(section8, p57);
			append(p57, t432);
			append(p57, strong13);
			append(strong13, t433);
			append(p57, t434);
			insert(target, t435, anchor);
			insert(target, section9, anchor);
			append(section9, h35);
			append(h35, a55);
			append(a55, t436);
			append(section9, t437);
			append(section9, p58);
			append(p58, t438);
			append(section9, t439);
			append(section9, pre18);
			pre18.innerHTML = raw18_value;
			append(section9, t440);
			append(section9, p59);
			append(p59, t441);
			append(section9, t442);
			append(section9, pre19);
			pre19.innerHTML = raw19_value;
			append(section9, t443);
			append(section9, p60);
			append(p60, t444);
			append(p60, strong14);
			append(strong14, t445);
			append(p60, t446);
			append(p60, code82);
			append(code82, t447);
			append(p60, t448);
			append(p60, strong15);
			append(strong15, t449);
			append(p60, t450);
			append(section9, t451);
			append(section9, pre20);
			pre20.innerHTML = raw20_value;
			append(section9, t452);
			append(section9, p61);
			append(p61, t453);
			append(p61, code83);
			append(code83, t454);
			append(p61, t455);
			append(p61, strong16);
			append(strong16, t456);
			append(p61, t457);
			append(p61, strong17);
			append(strong17, t458);
			append(p61, t459);
			append(section9, t460);
			append(section9, pre21);
			pre21.innerHTML = raw21_value;
			append(section9, t461);
			append(section9, p62);
			append(p62, code84);
			append(code84, t462);
			append(p62, t463);
			append(section9, t464);
			append(section9, p63);
			append(p63, t465);
			append(section9, t466);
			append(section9, pre22);
			pre22.innerHTML = raw22_value;
			append(section9, t467);
			append(section9, p64);
			append(p64, t468);
			append(section9, t469);
			append(section9, pre23);
			pre23.innerHTML = raw23_value;
			append(section9, t470);
			append(section9, p65);
			append(p65, t471);
			append(p65, code85);
			append(code85, t472);
			append(p65, t473);
			append(p65, code86);
			append(code86, t474);
			append(p65, t475);
			append(p65, code87);
			append(code87, t476);
			append(p65, t477);
			append(section9, t478);
			append(section9, p66);
			append(p66, strong18);
			append(strong18, t479);
			append(p66, t480);
			append(p66, code88);
			append(code88, t481);
			append(p66, t482);
			append(p66, code89);
			append(code89, t483);
			append(p66, t484);
			append(p66, code90);
			append(code90, t485);
			append(p66, t486);
			insert(target, t487, anchor);
			insert(target, section10, anchor);
			append(section10, h41);
			append(h41, a56);
			append(a56, t488);
			append(a56, strong19);
			append(strong19, t489);
			append(section10, t490);
			append(section10, p67);
			append(p67, t491);
			append(p67, code91);
			append(code91, t492);
			append(p67, t493);
			append(p67, strong20);
			append(strong20, t494);
			append(p67, t495);
			append(p67, code92);
			append(code92, t496);
			append(p67, t497);
			append(section10, t498);
			append(section10, pre24);
			pre24.innerHTML = raw24_value;
			insert(target, t499, anchor);
			insert(target, section11, anchor);
			append(section11, h42);
			append(h42, a57);
			append(a57, t500);
			append(section11, t501);
			append(section11, ul14);
			append(ul14, li56);
			append(li56, t502);
			append(li56, code93);
			append(code93, t503);
			append(li56, t504);
			append(li56, code94);
			append(code94, t505);
			append(li56, t506);
			append(ul14, t507);
			append(ul14, li57);
			append(li57, t508);
			insert(target, t509, anchor);
			insert(target, section12, anchor);
			append(section12, h22);
			append(h22, a58);
			append(a58, t510);
			append(section12, t511);
			append(section12, p68);
			append(p68, t512);
			append(p68, a59);
			append(a59, t513);
			append(p68, t514);
			append(p68, code95);
			append(code95, t515);
			append(section12, t516);
			append(section12, pre25);
			pre25.innerHTML = raw25_value;
			append(section12, t517);
			append(section12, p69);
			append(p69, a60);
			append(a60, t518);
			append(section12, t519);
			append(section12, p70);
			append(p70, t520);
			append(p70, a61);
			append(a61, code96);
			append(code96, t521);
			append(a61, t522);
			append(p70, t523);
			append(section12, t524);
			append(section12, pre26);
			pre26.innerHTML = raw26_value;
			append(section12, t525);
			append(section12, p71);
			append(p71, t526);
			append(section12, t527);
			append(section12, pre27);
			pre27.innerHTML = raw27_value;
			append(section12, t528);
			append(section12, p72);
			append(p72, a62);
			append(a62, t529);
			append(section12, t530);
			append(section12, pre28);
			pre28.innerHTML = raw28_value;
			append(section12, t531);
			append(section12, p73);
			append(p73, t532);
			append(section12, t533);
			append(section12, ul17);
			append(ul17, li59);
			append(li59, t534);
			append(li59, code97);
			append(code97, t535);
			append(li59, t536);
			append(li59, ul15);
			append(ul15, li58);
			append(li58, code98);
			append(code98, t537);
			append(li58, t538);
			append(li58, a63);
			append(a63, t539);
			append(li58, t540);
			append(li58, a64);
			append(a64, t541);
			append(li58, t542);
			append(ul17, t543);
			append(ul17, li60);
			append(li60, t544);
			append(li60, code99);
			append(code99, t545);
			append(li60, t546);
			append(ul17, t547);
			append(ul17, li62);
			append(li62, t548);
			append(li62, ul16);
			append(ul16, li61);
			append(li61, code100);
			append(code100, t549);
			append(li61, t550);
			append(li61, code101);
			append(code101, t551);
			append(li61, t552);
			append(li61, code102);
			append(code102, t553);
			append(li61, t554);
			append(li61, code103);
			append(code103, t555);
			append(li61, t556);
			append(li61, code104);
			append(code104, t557);
			append(li61, t558);
			append(section12, t559);
			append(section12, p74);
			append(p74, t560);
			append(p74, code105);
			append(code105, t561);
			append(p74, t562);
			append(section12, t563);
			append(section12, p75);
			append(p75, t564);
			append(section12, t565);
			append(section12, pre29);
			pre29.innerHTML = raw29_value;
			append(section12, t566);
			append(section12, p76);
			append(p76, a65);
			append(a65, t567);
			append(section12, t568);
			append(section12, p77);
			append(p77, strong21);
			append(strong21, t569);
			append(strong21, code106);
			append(code106, t570);
			append(strong21, t571);
			append(section12, t572);
			append(section12, p78);
			append(p78, t573);
			append(p78, code107);
			append(code107, t574);
			append(p78, t575);
			append(p78, code108);
			append(code108, t576);
			append(p78, t577);
			append(section12, t578);
			append(section12, p79);
			append(p79, t579);
			append(p79, code109);
			append(code109, t580);
			append(p79, t581);
			append(section12, t582);
			append(section12, pre30);
			pre30.innerHTML = raw30_value;
			append(section12, t583);
			append(section12, p80);
			append(p80, t584);
			append(p80, code110);
			append(code110, t585);
			append(p80, t586);
			append(p80, strong22);
			append(strong22, t587);
			append(p80, t588);
			append(p80, code111);
			append(code111, t589);
			append(p80, t590);
			append(section12, t591);
			append(section12, p81);
			append(p81, t592);
			insert(target, t593, anchor);
			insert(target, section13, anchor);
			append(section13, h43);
			append(h43, a66);
			append(a66, t594);
			append(section13, t595);
			append(section13, p82);
			append(p82, t596);
			append(section13, t597);
			append(section13, pre31);
			pre31.innerHTML = raw31_value;
			append(section13, t598);
			append(section13, p83);
			append(p83, a67);
			append(a67, t599);
			append(section13, t600);
			append(section13, p84);
			append(p84, t601);
			append(p84, code112);
			append(code112, t602);
			append(p84, t603);
			append(section13, t604);
			append(section13, ol2);
			append(ol2, li63);
			append(li63, t605);
			append(li63, a68);
			append(a68, t606);
			append(li63, t607);
			append(li63, code113);
			append(code113, t608);
			append(li63, t609);
			append(li63, strong23);
			append(strong23, t610);
			append(li63, t611);
			append(li63, strong24);
			append(strong24, t612);
			append(li63, t613);
			append(ol2, t614);
			append(ol2, li64);
			append(li64, strong25);
			append(strong25, t615);
			append(ol2, t616);
			append(ol2, li65);
			append(li65, strong26);
			append(strong26, t617);
			append(ol2, t618);
			append(ol2, li66);
			append(li66, code114);
			append(code114, t619);
			append(li66, t620);
			append(li66, code115);
			append(code115, t621);
			append(li66, t622);
			append(ol2, t623);
			append(ol2, li69);
			append(li69, t624);
			append(li69, code116);
			append(code116, t625);
			append(li69, ul18);
			append(ul18, li67);
			append(li67, t626);
			append(li67, strong27);
			append(strong27, t627);
			append(li67, t628);
			append(li67, strong28);
			append(strong28, t629);
			append(li67, t630);
			append(li67, code117);
			append(code117, t631);
			append(li67, t632);
			append(li67, strong29);
			append(strong29, t633);
			append(ul18, t634);
			append(ul18, li68);
			append(li68, t635);
			append(li68, strong30);
			append(strong30, t636);
			append(li68, t637);
			append(li68, code118);
			append(code118, t638);
			append(ol2, t639);
			append(ol2, li70);
			append(li70, t640);
			append(li70, code119);
			append(code119, t641);
			append(li70, t642);
			append(section13, t643);
			append(section13, p85);
			append(p85, t644);
			append(p85, code120);
			append(code120, t645);
			append(p85, t646);
			append(p85, code121);
			append(code121, t647);
			append(p85, t648);
			append(p85, code122);
			append(code122, t649);
			append(p85, t650);
			append(p85, code123);
			append(code123, t651);
			append(p85, t652);
			append(p85, strong31);
			append(strong31, t653);
			append(p85, t654);
			append(section13, t655);
			append(section13, pre32);
			pre32.innerHTML = raw32_value;
			insert(target, t656, anchor);
			insert(target, section14, anchor);
			append(section14, h44);
			append(h44, a69);
			append(a69, t657);
			append(section14, t658);
			append(section14, p86);
			append(p86, t659);
			append(section14, t660);
			append(section14, pre33);
			pre33.innerHTML = raw33_value;
			append(section14, t661);
			append(section14, p87);
			append(p87, a70);
			append(a70, t662);
			append(section14, t663);
			append(section14, p88);
			append(p88, t664);
			append(p88, strong32);
			append(strong32, t665);
			append(p88, t666);
			append(section14, t667);
			append(section14, pre34);
			pre34.innerHTML = raw34_value;
			insert(target, t668, anchor);
			insert(target, section15, anchor);
			append(section15, h36);
			append(h36, a71);
			append(a71, t669);
			append(section15, t670);
			append(section15, p89);
			append(p89, t671);
			append(section15, t672);
			append(section15, p90);
			append(p90, t673);
			append(p90, strong33);
			append(strong33, t674);
			append(p90, t675);
			append(section15, t676);
			append(section15, pre35);
			pre35.innerHTML = raw35_value;
			insert(target, t677, anchor);
			insert(target, section16, anchor);
			append(section16, h37);
			append(h37, a72);
			append(a72, t678);
			append(section16, t679);
			append(section16, p91);
			append(p91, t680);
			append(p91, code124);
			append(code124, t681);
			append(p91, t682);
			append(section16, t683);
			append(section16, p92);
			append(p92, t684);
			append(p92, code125);
			append(code125, t685);
			append(p92, t686);
			append(section16, t687);
			append(section16, p93);
			append(p93, t688);
			append(section16, t689);
			append(section16, pre36);
			pre36.innerHTML = raw36_value;
			append(section16, t690);
			append(section16, p94);
			append(p94, a73);
			append(a73, t691);
			append(section16, t692);
			append(section16, p95);
			append(p95, t693);
			append(p95, code126);
			append(code126, t694);
			append(p95, t695);
			append(p95, code127);
			append(code127, t696);
			append(p95, t697);
			append(section16, t698);
			append(section16, pre37);
			pre37.innerHTML = raw37_value;
			insert(target, t699, anchor);
			insert(target, section17, anchor);
			append(section17, h23);
			append(h23, a74);
			append(a74, t700);
			insert(target, t701, anchor);
			insert(target, section18, anchor);
			append(section18, h45);
			append(h45, a75);
			append(a75, t702);
			insert(target, t703, anchor);
			insert(target, section19, anchor);
			append(section19, h46);
			append(h46, a76);
			append(a76, t704);
			insert(target, t705, anchor);
			insert(target, section20, anchor);
			append(section20, h47);
			append(h47, a77);
			append(a77, t706);
			insert(target, t707, anchor);
			insert(target, section21, anchor);
			append(section21, h24);
			append(h24, a78);
			append(a78, t708);
			append(section21, t709);
			append(section21, p96);
			append(p96, t710);
			append(p96, a79);
			append(a79, t711);
			append(p96, t712);
			append(section21, t713);
			append(section21, p97);
			append(p97, t714);
			append(p97, a80);
			append(a80, t715);
			append(p97, t716);
			append(p97, a81);
			append(a81, t717);
			append(p97, t718);
			append(p97, a82);
			append(a82, t719);
			append(p97, t720);
			append(section21, t721);
			append(section21, p98);
			append(p98, strong34);
			append(strong34, t722);
			append(strong34, a83);
			append(a83, t723);
			append(strong34, t724);
			append(section21, t725);
			append(section21, p99);
			append(p99, strong35);
			append(strong35, t726);
			append(strong35, a84);
			append(a84, t727);
			append(strong35, t728);
			insert(target, t729, anchor);
			insert(target, section22, anchor);
			append(section22, h25);
			append(h25, a85);
			append(a85, t730);
			append(section22, t731);
			append(section22, ul19);
			append(ul19, li71);
			append(li71, t732);
			append(li71, a86);
			append(a86, t733);
			append(li71, t734);
			append(ul19, t735);
			append(ul19, li72);
			append(li72, t736);
			append(li72, a87);
			append(a87, t737);
			append(li72, t738);
			append(li72, a88);
			append(a88, t739);
			append(ul19, t740);
			append(ul19, li73);
			append(li73, a89);
			append(a89, t741);
			append(li73, t742);
			append(ul19, t743);
			append(ul19, li74);
			append(li74, a90);
			append(a90, t744);
			append(li74, t745);
			append(ul19, t746);
			append(ul19, li75);
			append(li75, a91);
			append(a91, t747);
		},
		p: noop,
		d(detaching) {
			if (detaching) detach(section0);
			if (detaching) detach(t22);
			if (detaching) detach(p0);
			if (detaching) detach(t26);
			if (detaching) detach(p1);
			if (detaching) detach(t33);
			if (detaching) detach(pre0);
			if (detaching) detach(t34);
			if (detaching) detach(p2);
			if (detaching) detach(t40);
			if (detaching) detach(p3);
			if (detaching) detach(t44);
			if (detaching) detach(section1);
			if (detaching) detach(t60);
			if (detaching) detach(section2);
			if (detaching) detach(t104);
			if (detaching) detach(section3);
			if (detaching) detach(t152);
			if (detaching) detach(section4);
			if (detaching) detach(t217);
			if (detaching) detach(section5);
			if (detaching) detach(t327);
			if (detaching) detach(section6);
			if (detaching) detach(t349);
			if (detaching) detach(section7);
			if (detaching) detach(t370);
			if (detaching) detach(section8);
			if (detaching) detach(t435);
			if (detaching) detach(section9);
			if (detaching) detach(t487);
			if (detaching) detach(section10);
			if (detaching) detach(t499);
			if (detaching) detach(section11);
			if (detaching) detach(t509);
			if (detaching) detach(section12);
			if (detaching) detach(t593);
			if (detaching) detach(section13);
			if (detaching) detach(t656);
			if (detaching) detach(section14);
			if (detaching) detach(t668);
			if (detaching) detach(section15);
			if (detaching) detach(t677);
			if (detaching) detach(section16);
			if (detaching) detach(t699);
			if (detaching) detach(section17);
			if (detaching) detach(t701);
			if (detaching) detach(section18);
			if (detaching) detach(t703);
			if (detaching) detach(section19);
			if (detaching) detach(t705);
			if (detaching) detach(section20);
			if (detaching) detach(t707);
			if (detaching) detach(section21);
			if (detaching) detach(t729);
			if (detaching) detach(section22);
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
	"title": "Compile Svelte in your head (Part 2)",
	"date": "2020-03-22T08:00:00Z",
	"tags": ["Svelte", "JavaScript"],
	"series": "Compile Svelte in your head",
	"slug": "compile-svelte-in-your-head-part-2",
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
