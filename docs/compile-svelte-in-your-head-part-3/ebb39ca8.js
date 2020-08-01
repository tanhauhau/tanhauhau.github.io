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

var baseCss = "http://127.0.0.1:8080/compile-svelte-in-your-head-part-3/assets/_blog-299aa480.css";

var image = "http://127.0.0.1:8080/compile-svelte-in-your-head-part-3/assets/hero-twitter-e9eff02b.jpg";

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
					"@id": "http%3A%2F%2F127.0.0.1%3A8080%2Fcompile-svelte-in-your-head-part-3",
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
			attr(meta11, "content", "http%3A%2F%2F127.0.0.1%3A8080%2Fcompile-svelte-in-your-head-part-3");
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
							"@id": "http%3A%2F%2F127.0.0.1%3A8080%2Fcompile-svelte-in-your-head-part-3",
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

/* content/blog/compile-svelte-in-your-head-part-3/@@page-markup.svelte generated by Svelte v3.24.0 */

function create_default_slot(ctx) {
	let section0;
	let ul5;
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
	let ul2;
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
	let li10;
	let a10;
	let t10;
	let ul4;
	let li11;
	let a11;
	let t11;
	let ul3;
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
	let t17;
	let p0;
	let strong0;
	let t18;
	let a17;
	let t19;
	let t20;
	let t21;
	let p1;
	let a18;
	let t22;
	let t23;
	let code0;
	let t24;
	let t25;
	let code1;
	let t26;
	let t27;
	let t28;
	let p2;
	let t29;
	let t30;
	let ul6;
	let li17;
	let code2;
	let t31;
	let t32;
	let t33;
	let li18;
	let code3;
	let t34;
	let t35;
	let t36;
	let li19;
	let code4;
	let t37;
	let t38;
	let t39;
	let p3;
	let t40;
	let t41;
	let section1;
	let h20;
	let a19;
	let t42;
	let code5;
	let t43;
	let t44;
	let code6;
	let t45;
	let t46;
	let code7;
	let t47;
	let t48;
	let section2;
	let h30;
	let a20;
	let code8;
	let t49;
	let t50;
	let t51;
	let p4;
	let t52;
	let code9;
	let t53;
	let t54;
	let t55;
	let pre0;

	let raw0_value = `
<code class="language-svelte">&lt;script&gt;
  function handleMouseMove(event) &#123;&#125;

  function handleClick(event) &#123;&#125;
&lt;/script&gt;

&lt;!-- You can pass in as variable --&gt;
&lt;div on:mousemove=&#123;handleMouseMove&#125; /&gt;

&lt;!-- or you can inline the event handler --&gt;
&lt;div on:mousemove=&#123;event =&gt; &#123; /*...*/ &#125;&#125; /&gt;

&lt;!-- You can modify event handler with modifiers  --&gt;
&lt;div on:click|stopPropagation|once=&#123;handleClick&#125;&gt;</code>` + "";

	let t56;
	let section3;
	let h31;
	let a21;
	let code10;
	let t57;
	let t58;
	let t59;
	let p5;
	let t60;
	let code11;
	let t61;
	let t62;
	let t63;
	let p6;
	let t64;
	let t65;
	let pre1;

	let raw1_value = `
<code class="language-svelte">&lt;script&gt;
  let name, yes;
&lt;/script&gt;

&lt;!-- You can bind &#96;name&#96; to input.value --&gt;
&lt;!-- Changing &#96;name&#96; will update input.value to be the value of &#96;name&#96; and --&gt;
&lt;!-- changing input.value will update &#96;name&#96; to be input.value --&gt;
&lt;input bind:value=&#123;name&#125; /&gt;

&lt;!-- You can bind input.checked for a checkbox input --&gt;
&lt;input type=&quot;checkbox&quot; bind:checked=&#123;yes&#125; /&gt;</code>` + "";

	let t66;
	let section4;
	let h32;
	let a22;
	let code12;
	let t67;
	let t68;
	let t69;
	let p7;
	let t70;
	let code13;
	let t71;
	let t72;
	let strong1;
	let a23;
	let t73;
	let t74;
	let t75;
	let p8;
	let t76;
	let code14;
	let t77;
	let t78;
	let t79;
	let p9;
	let t80;
	let code15;
	let t81;
	let t82;
	let t83;
	let pre2;

	let raw2_value = `
<code class="language-svelte">&lt;script&gt;
  function doSomething(element) &#123;
    // do something with the element
    return &#123;
      destroy() &#123;
        // cleanup
      &#125;
    &#125;
  &#125;
&lt;/script&gt;

&lt;div use:doSomething /&gt;</code>` + "";

	let t84;
	let p10;
	let t85;
	let t86;
	let pre3;

	let raw3_value = `
<code class="language-svelte">&lt;script&gt;
  import Draggable from &#39;the-draggable-library&#39;;

  function doSomething(element) &#123;
    // highlight-start
    const draggable = new Draggable(element);
    draggable.start();
    // highlight-end
    return &#123;
      destroy() &#123;
        // highlight-next-line
        draggable.stop();
      &#125;
    &#125;
  &#125;
&lt;/script&gt;

&lt;div use:doSomething /&gt;</code>` + "";

	let t87;
	let p11;
	let t88;
	let code16;
	let t89;
	let t90;
	let t91;
	let pre4;

	let raw4_value = `
<code class="language-svelte">&lt;script&gt;
  import Draggable from &#39;the-draggable-library&#39;;

  let options = &#123; foo: true, bar: true &#125;;

  // highlight-next-line
  function doSomething(element, options) &#123;
    // highlight-next-line
    const draggable = new Draggable(element, options);
    draggable.start();

    return &#123;
      // highlight-start
      update(options) &#123;
        draggable.update(options);
      &#125;,
      // highlight-end
      destroy() &#123;
        draggable.stop();
      &#125;
    &#125;
  &#125;
&lt;/script&gt;

&lt;div use:doSomething=&#123;options&#125; /&gt;

&lt;label&gt;
  &lt;input type=&quot;checkbox&quot; bind:checked=&#123;options.foo&#125; /&gt;
  Foo
&lt;/label&gt;
&lt;label&gt;
  &lt;input type=&quot;checkbox&quot; bind:checked=&#123;options.bar&#125; /&gt;
  Bar
&lt;/label&gt;</code>` + "";

	let t92;
	let p12;
	let t93;
	let t94;
	let ul7;
	let li20;
	let a24;
	let t95;
	let code17;
	let t96;
	let t97;
	let li21;
	let a25;
	let t98;
	let code18;
	let t99;
	let t100;
	let li22;
	let a26;
	let t101;
	let code19;
	let t102;
	let t103;
	let section5;
	let h21;
	let a27;
	let t104;
	let t105;
	let p13;
	let t106;
	let t107;
	let section6;
	let h33;
	let a28;
	let t108;
	let t109;
	let p14;
	let t110;
	let a29;
	let t111;
	let t112;
	let a30;
	let t113;
	let t114;
	let t115;
	let pre5;

	let raw5_value = `
<code class="language-js">element<span class="token punctuation">.</span><span class="token function">addEventListener</span><span class="token punctuation">(</span><span class="token string">'click'</span><span class="token punctuation">,</span> handleClick<span class="token punctuation">)</span><span class="token punctuation">;</span></code>` + "";

	let t116;
	let p15;
	let t117;
	let t118;
	let pre6;

	let raw6_value = `
<code class="language-js">element<span class="token punctuation">.</span><span class="token function">addEventListener</span><span class="token punctuation">(</span><span class="token string">'click'</span><span class="token punctuation">,</span> handleClick<span class="token punctuation">,</span> <span class="token punctuation">&#123;</span>
  capture<span class="token punctuation">:</span> <span class="token boolean">true</span><span class="token punctuation">,</span> <span class="token comment">// triggered before any child element</span>
  once<span class="token punctuation">:</span> <span class="token boolean">true</span><span class="token punctuation">,</span> <span class="token comment">// triggered at most once</span>
  passive<span class="token punctuation">:</span> <span class="token boolean">true</span><span class="token punctuation">,</span> <span class="token comment">// indicates that will never call &#96;preventDefault&#96; to improve performance</span>
<span class="token punctuation">&#125;</span><span class="token punctuation">)</span><span class="token punctuation">;</span></code>` + "";

	let t119;
	let section7;
	let h40;
	let a31;
	let t120;
	let t121;
	let p16;
	let a32;
	let t122;
	let t123;
	let code20;
	let t124;
	let t125;
	let code21;
	let t126;
	let t127;
	let t128;
	let pre7;

	let raw7_value = `
<code class="language-js">element<span class="token punctuation">.</span><span class="token function">addEventListener</span><span class="token punctuation">(</span><span class="token string">'click'</span><span class="token punctuation">,</span> <span class="token parameter">event</span> <span class="token operator">=></span> <span class="token punctuation">&#123;</span>
  event<span class="token punctuation">.</span><span class="token function">preventDefault</span><span class="token punctuation">(</span><span class="token punctuation">)</span><span class="token punctuation">;</span>
<span class="token punctuation">&#125;</span><span class="token punctuation">)</span><span class="token punctuation">;</span></code>` + "";

	let t129;
	let section8;
	let h41;
	let a33;
	let t130;
	let t131;
	let p17;
	let a34;
	let t132;
	let t133;
	let t134;
	let pre8;

	let raw8_value = `
<code class="language-svelte">&lt;div on:click=&#123;event =&gt; &#123;
  console.log(&#39;click not triggered&#39;);
&#125;&#125;&gt;
  &lt;div on:click=&#123;event =&gt; &#123;
    // highlight-next-line
    event.stopPropagation();
    console.log(&#39;click&#39;);
  &#125;&#125;&gt;
  &lt;/div&gt;
&lt;/div&gt;</code>` + "";

	let t135;
	let p18;
	let t136;
	let code22;
	let t137;
	let t138;
	let code23;
	let t139;
	let t140;
	let code24;
	let t141;
	let t142;
	let code25;
	let t143;
	let t144;
	let code26;
	let t145;
	let t146;
	let a35;
	let t147;
	let t148;
	let t149;
	let pre9;

	let raw9_value = `
<code class="language-js">element<span class="token punctuation">.</span><span class="token function">removeEventListener</span><span class="token punctuation">(</span><span class="token string">'click'</span><span class="token punctuation">,</span> handleClick<span class="token punctuation">)</span><span class="token punctuation">;</span></code>` + "";

	let t150;
	let section9;
	let h34;
	let a36;
	let t151;
	let t152;
	let p19;
	let t153;
	let t154;
	let p20;
	let t155;
	let t156;
	let p21;
	let em0;
	let t157;
	let a37;
	let t158;
	let t159;
	let t160;
	let p22;
	let t161;
	let strong2;
	let t162;
	let t163;
	let t164;
	let pre10;

	let raw10_value = `
<code class="language-js"><span class="token comment">// binding variable &#96;checked&#96; with the checkbox &#96;checked&#96; property</span>
<span class="token keyword">let</span> checked<span class="token punctuation">;</span>
<span class="token keyword">let</span> input <span class="token operator">=</span> document<span class="token punctuation">.</span><span class="token function">querySelector</span><span class="token punctuation">(</span><span class="token string">'#checkbox'</span><span class="token punctuation">)</span><span class="token punctuation">;</span>

<span class="token comment">// synchronise variable &#96;checked&#96; to checkbox &#96;checked&#96; property</span>
<span class="token function">observe</span><span class="token punctuation">(</span>checked<span class="token punctuation">,</span> <span class="token parameter">newValue</span> <span class="token operator">=></span> <span class="token punctuation">&#123;</span>
  input<span class="token punctuation">.</span>checked <span class="token operator">=</span> newValue<span class="token punctuation">;</span>
<span class="token punctuation">&#125;</span><span class="token punctuation">)</span><span class="token punctuation">;</span>

<span class="token comment">// synchronise checkbox &#96;checked&#96; property to variable &#96;checked&#96;</span>
<span class="token comment">// listen to &#96;change&#96; event for &#96;checked&#96; property</span>
input<span class="token punctuation">.</span><span class="token function">addEventListener</span><span class="token punctuation">(</span><span class="token string">'change'</span><span class="token punctuation">,</span> <span class="token parameter">event</span> <span class="token operator">=></span> <span class="token punctuation">&#123;</span>
  checked <span class="token operator">=</span> input<span class="token punctuation">.</span>checked<span class="token punctuation">;</span>
<span class="token punctuation">&#125;</span><span class="token punctuation">)</span><span class="token punctuation">;</span></code>` + "";

	let t165;
	let p23;
	let t166;
	let t167;
	let p24;
	let strong3;
	let t168;
	let t169;
	let p25;
	let t170;
	let code27;
	let t171;
	let t172;
	let code28;
	let t173;
	let t174;
	let t175;
	let p26;
	let strong4;
	let t176;
	let t177;
	let p27;
	let t178;
	let a38;
	let t179;
	let t180;
	let a39;
	let code29;
	let t181;
	let t182;
	let code30;
	let t183;
	let t184;
	let code31;
	let t185;
	let t186;
	let t187;
	let p28;
	let t188;
	let a40;
	let t189;
	let t190;
	let t191;
	let section10;
	let h35;
	let a41;
	let t192;
	let t193;
	let p29;
	let t194;
	let t195;
	let p30;
	let t196;
	let t197;
	let ul8;
	let li23;
	let code32;
	let t198;
	let t199;
	let t200;
	let li24;
	let code33;
	let t201;
	let t202;
	let t203;
	let pre11;

	let raw11_value = `
<code class="language-js"><span class="token keyword">function</span> <span class="token function">actionFn</span><span class="token punctuation">(</span><span class="token parameter">element<span class="token punctuation">,</span> parameter</span><span class="token punctuation">)</span> <span class="token punctuation">&#123;</span>
  <span class="token keyword">return</span> <span class="token punctuation">&#123;</span>
    <span class="token function">update</span><span class="token punctuation">(</span><span class="token parameter">newParameter</span><span class="token punctuation">)</span> <span class="token punctuation">&#123;</span><span class="token punctuation">&#125;</span><span class="token punctuation">,</span>
    <span class="token function">destroy</span><span class="token punctuation">(</span><span class="token punctuation">)</span> <span class="token punctuation">&#123;</span><span class="token punctuation">&#125;</span><span class="token punctuation">,</span>
  <span class="token punctuation">&#125;</span><span class="token punctuation">;</span>
<span class="token punctuation">&#125;</span>

<span class="token comment">// When element is mounted onto the DOM</span>
<span class="token keyword">let</span> parameter <span class="token operator">=</span> <span class="token number">1</span><span class="token punctuation">;</span>
<span class="token keyword">const</span> actionObj <span class="token operator">=</span> <span class="token function">actionFn</span><span class="token punctuation">(</span>element<span class="token punctuation">,</span> parameter<span class="token punctuation">)</span><span class="token punctuation">;</span>

<span class="token comment">// When parameter changes</span>
parameter <span class="token operator">=</span> <span class="token number">2</span><span class="token punctuation">;</span>
actionObj<span class="token punctuation">.</span><span class="token function">update</span><span class="token punctuation">(</span>parameter<span class="token punctuation">)</span><span class="token punctuation">;</span>

<span class="token comment">// When element is removed from the DOM</span>
actionObj<span class="token punctuation">.</span><span class="token function">destroy</span><span class="token punctuation">(</span><span class="token punctuation">)</span><span class="token punctuation">;</span></code>` + "";

	let t204;
	let section11;
	let h22;
	let a42;
	let t205;
	let t206;
	let p31;
	let t207;
	let code34;
	let t208;
	let t209;
	let code35;
	let t210;
	let t211;
	let code36;
	let t212;
	let t213;
	let t214;
	let section12;
	let h36;
	let a43;
	let code37;
	let t215;
	let t216;
	let t217;
	let pre12;

	let raw12_value = `
<code class="language-svelte">&lt;script&gt;
  function onChange() &#123;&#125;
&lt;/script&gt;

&lt;input on:change=&#123;onChange&#125; /&gt;</code>` + "";

	let t218;
	let p32;
	let a44;
	let t219;
	let t220;
	let p33;
	let t221;
	let t222;
	let pre13;

	let raw13_value = `
<code class="language-js"><span class="token comment">/* App.svelte generated by Svelte v3.22.2 */</span>
<span class="token comment">// ...</span>
<span class="token keyword">function</span> <span class="token function">create_fragment</span><span class="token punctuation">(</span><span class="token parameter">ctx</span><span class="token punctuation">)</span> <span class="token punctuation">&#123;</span>
  <span class="token keyword">let</span> input<span class="token punctuation">;</span>
  <span class="token keyword">let</span> dispose<span class="token punctuation">;</span>

  <span class="token keyword">return</span> <span class="token punctuation">&#123;</span>
    <span class="token function">c</span><span class="token punctuation">(</span><span class="token punctuation">)</span> <span class="token punctuation">&#123;</span>
      input <span class="token operator">=</span> <span class="token function">element</span><span class="token punctuation">(</span><span class="token string">'input'</span><span class="token punctuation">)</span><span class="token punctuation">;</span>
    <span class="token punctuation">&#125;</span><span class="token punctuation">,</span>
    <span class="token function">m</span><span class="token punctuation">(</span><span class="token parameter">target<span class="token punctuation">,</span> anchor<span class="token punctuation">,</span> remount</span><span class="token punctuation">)</span> <span class="token punctuation">&#123;</span>
      <span class="token function">insert</span><span class="token punctuation">(</span>target<span class="token punctuation">,</span> input<span class="token punctuation">,</span> anchor<span class="token punctuation">)</span><span class="token punctuation">;</span>
      <span class="token comment">// highlight-start</span>
      <span class="token keyword">if</span> <span class="token punctuation">(</span>remount<span class="token punctuation">)</span> <span class="token function">dispose</span><span class="token punctuation">(</span><span class="token punctuation">)</span><span class="token punctuation">;</span>
      dispose <span class="token operator">=</span> <span class="token function">listen</span><span class="token punctuation">(</span>input<span class="token punctuation">,</span> <span class="token string">'change'</span><span class="token punctuation">,</span> <span class="token comment">/*onChange*/</span> ctx<span class="token punctuation">[</span><span class="token number">0</span><span class="token punctuation">]</span><span class="token punctuation">)</span><span class="token punctuation">;</span>
      <span class="token comment">// highlight-end</span>
    <span class="token punctuation">&#125;</span><span class="token punctuation">,</span>
    <span class="token function">d</span><span class="token punctuation">(</span><span class="token parameter">detaching</span><span class="token punctuation">)</span> <span class="token punctuation">&#123;</span>
      <span class="token keyword">if</span> <span class="token punctuation">(</span>detaching<span class="token punctuation">)</span> <span class="token function">detach</span><span class="token punctuation">(</span>input<span class="token punctuation">)</span><span class="token punctuation">;</span>
      <span class="token comment">// highlight-next-line</span>
      <span class="token function">dispose</span><span class="token punctuation">(</span><span class="token punctuation">)</span><span class="token punctuation">;</span>
    <span class="token punctuation">&#125;</span><span class="token punctuation">,</span>
  <span class="token punctuation">&#125;</span><span class="token punctuation">;</span>
<span class="token punctuation">&#125;</span>

<span class="token keyword">function</span> <span class="token function">instance</span><span class="token punctuation">(</span><span class="token parameter">$$self</span><span class="token punctuation">)</span> <span class="token punctuation">&#123;</span>
  <span class="token keyword">let</span> i <span class="token operator">=</span> <span class="token number">0</span><span class="token punctuation">;</span>
  <span class="token keyword">function</span> <span class="token function">onChange</span><span class="token punctuation">(</span><span class="token punctuation">)</span> <span class="token punctuation">&#123;</span>
    i<span class="token operator">++</span><span class="token punctuation">;</span>
  <span class="token punctuation">&#125;</span>
  <span class="token comment">// highlight-next-line</span>
  <span class="token keyword">return</span> <span class="token punctuation">[</span>onChange<span class="token punctuation">]</span><span class="token punctuation">;</span>
<span class="token punctuation">&#125;</span>

<span class="token comment">// ...</span></code>` + "";

	let t223;
	let p34;
	let t224;
	let t225;
	let ul9;
	let li25;
	let t226;
	let code38;
	let t227;
	let t228;
	let strong5;
	let t229;
	let t230;
	let t231;
	let li26;
	let t232;
	let code39;
	let t233;
	let t234;
	let strong6;
	let t235;
	let t236;
	let t237;
	let p35;
	let t238;
	let a45;
	let t239;
	let t240;
	let code40;
	let t241;
	let t242;
	let t243;
	let p36;
	let t244;
	let code41;
	let t245;
	let t246;
	let t247;
	let section13;
	let h42;
	let a46;
	let t248;
	let t249;
	let p37;
	let t250;
	let t251;
	let pre14;

	let raw14_value = `
<code class="language-svelte">&lt;script&gt;
	let i=0;
	function onClick() &#123;
		i++;
	&#125;
&lt;/script&gt;

&lt;button on:click|preventDefault=&#123;onClick&#125; /&gt;
&lt;button on:change|stopPropagation=&#123;onClick&#125; /&gt;
&lt;button on:change|once=&#123;onClick&#125; /&gt;
&lt;button on:change|capture=&#123;onClick&#125; /&gt;

&lt;!-- Chain multiple modifiers --&gt;
&lt;button on:click|preventDefault|stopPropagation|once|capture=&#123;onClick&#125; /&gt;</code>` + "";

	let t252;
	let p38;
	let a47;
	let t253;
	let t254;
	let p39;
	let t255;
	let t256;
	let pre15;

	let raw15_value = `
<code class="language-js"><span class="token comment">/* App.svelte generated by Svelte v3.22.2 */</span>
<span class="token comment">// ...</span>
<span class="token keyword">function</span> <span class="token function">create_fragment</span><span class="token punctuation">(</span><span class="token parameter">ctx</span><span class="token punctuation">)</span> <span class="token punctuation">&#123;</span>
  <span class="token comment">// ...</span>
  <span class="token keyword">return</span> <span class="token punctuation">&#123;</span>
    <span class="token function">c</span><span class="token punctuation">(</span><span class="token punctuation">)</span> <span class="token punctuation">&#123;</span> <span class="token comment">/* ... */</span> <span class="token punctuation">&#125;</span><span class="token punctuation">,</span>
    <span class="token function">m</span><span class="token punctuation">(</span><span class="token parameter">target<span class="token punctuation">,</span> anchor<span class="token punctuation">,</span> remount</span><span class="token punctuation">)</span> <span class="token punctuation">&#123;</span>
      <span class="token comment">// ...</span>
      <span class="token comment">// highlight-start</span>
      dispose <span class="token operator">=</span> <span class="token punctuation">[</span>
        <span class="token function">listen</span><span class="token punctuation">(</span>button0<span class="token punctuation">,</span> <span class="token string">"click"</span><span class="token punctuation">,</span> <span class="token function">prevent_default</span><span class="token punctuation">(</span><span class="token comment">/*onClick*/</span> ctx<span class="token punctuation">[</span><span class="token number">0</span><span class="token punctuation">]</span><span class="token punctuation">)</span><span class="token punctuation">)</span><span class="token punctuation">,</span>
        <span class="token function">listen</span><span class="token punctuation">(</span>button1<span class="token punctuation">,</span> <span class="token string">"change"</span><span class="token punctuation">,</span> <span class="token function">stop_propagation</span><span class="token punctuation">(</span><span class="token comment">/*onClick*/</span> ctx<span class="token punctuation">[</span><span class="token number">0</span><span class="token punctuation">]</span><span class="token punctuation">)</span><span class="token punctuation">)</span><span class="token punctuation">,</span>
        <span class="token function">listen</span><span class="token punctuation">(</span>button2<span class="token punctuation">,</span> <span class="token string">"change"</span><span class="token punctuation">,</span> <span class="token comment">/*onClick*/</span> ctx<span class="token punctuation">[</span><span class="token number">0</span><span class="token punctuation">]</span><span class="token punctuation">,</span> <span class="token punctuation">&#123;</span> once<span class="token punctuation">:</span> <span class="token boolean">true</span> <span class="token punctuation">&#125;</span><span class="token punctuation">)</span><span class="token punctuation">,</span>
        <span class="token function">listen</span><span class="token punctuation">(</span>button3<span class="token punctuation">,</span> <span class="token string">"change"</span><span class="token punctuation">,</span> <span class="token comment">/*onClick*/</span> ctx<span class="token punctuation">[</span><span class="token number">0</span><span class="token punctuation">]</span><span class="token punctuation">,</span> <span class="token boolean">true</span><span class="token punctuation">)</span><span class="token punctuation">,</span>
        <span class="token function">listen</span><span class="token punctuation">(</span>
          button4<span class="token punctuation">,</span>
          <span class="token string">"click"</span><span class="token punctuation">,</span>
          <span class="token function">stop_propagation</span><span class="token punctuation">(</span><span class="token function">prevent_default</span><span class="token punctuation">(</span><span class="token comment">/*onClick*/</span> ctx<span class="token punctuation">[</span><span class="token number">0</span><span class="token punctuation">]</span><span class="token punctuation">)</span><span class="token punctuation">)</span><span class="token punctuation">,</span>
          <span class="token punctuation">&#123;</span> once<span class="token punctuation">:</span> <span class="token boolean">true</span><span class="token punctuation">,</span> capture<span class="token punctuation">:</span> <span class="token boolean">true</span> <span class="token punctuation">&#125;</span>
        <span class="token punctuation">)</span><span class="token punctuation">,</span>
      <span class="token punctuation">]</span><span class="token punctuation">;</span>
      <span class="token comment">// highlight-end</span>
    <span class="token punctuation">&#125;</span><span class="token punctuation">,</span>
    <span class="token comment">// ...</span>
  <span class="token punctuation">&#125;</span><span class="token punctuation">;</span>
<span class="token punctuation">&#125;</span></code>` + "";

	let t257;
	let p40;
	let t258;
	let t259;
	let ul10;
	let li27;
	let t260;
	let t261;
	let li28;
	let t262;
	let code42;
	let t263;
	let t264;
	let code43;
	let t265;
	let t266;
	let code44;
	let t267;
	let t268;
	let a48;
	let t269;
	let t270;
	let code45;
	let t271;
	let t272;
	let t273;
	let li29;
	let t274;
	let code46;
	let t275;
	let t276;
	let code47;
	let t277;
	let t278;
	let code48;
	let t279;
	let t280;
	let t281;
	let p41;
	let t282;
	let code49;
	let t283;
	let t284;
	let t285;
	let pre16;

	let raw16_value = `
<code class="language-js"><span class="token keyword">function</span> <span class="token function">prevent_default</span><span class="token punctuation">(</span><span class="token parameter">fn</span><span class="token punctuation">)</span> <span class="token punctuation">&#123;</span>
  <span class="token keyword">return</span> <span class="token keyword">function</span><span class="token punctuation">(</span><span class="token parameter">event</span><span class="token punctuation">)</span> <span class="token punctuation">&#123;</span>
    event<span class="token punctuation">.</span><span class="token function">preventDefault</span><span class="token punctuation">(</span><span class="token punctuation">)</span><span class="token punctuation">;</span>
    <span class="token keyword">return</span> <span class="token function">fn</span><span class="token punctuation">.</span><span class="token function">call</span><span class="token punctuation">(</span><span class="token keyword">this</span><span class="token punctuation">,</span> event<span class="token punctuation">)</span><span class="token punctuation">;</span>
  <span class="token punctuation">&#125;</span><span class="token punctuation">;</span>
<span class="token punctuation">&#125;</span></code>` + "";

	let t286;
	let section14;
	let h37;
	let a49;
	let code50;
	let t287;
	let t288;
	let t289;
	let pre17;

	let raw17_value = `
<code class="language-svelte">&lt;script&gt;
	let checked = false;
	function updateChecked() &#123;
		checked = true;
	&#125;
&lt;/script&gt;

&lt;input type=&quot;checkbox&quot; bind:checked /&gt;</code>` + "";

	let t290;
	let p42;
	let a50;
	let t291;
	let t292;
	let p43;
	let t293;
	let t294;
	let pre18;

	let raw18_value = `
<code class="language-js"><span class="token comment">/* App.svelte generated by Svelte v3.22.2 */</span>
<span class="token comment">// ...</span>
<span class="token keyword">function</span> <span class="token function">create_fragment</span><span class="token punctuation">(</span><span class="token parameter">ctx</span><span class="token punctuation">)</span> <span class="token punctuation">&#123;</span>
  <span class="token keyword">let</span> input<span class="token punctuation">;</span>
  <span class="token keyword">let</span> dispose<span class="token punctuation">;</span>

  <span class="token keyword">return</span> <span class="token punctuation">&#123;</span>
    <span class="token function">c</span><span class="token punctuation">(</span><span class="token punctuation">)</span> <span class="token punctuation">&#123;</span> <span class="token comment">/* ... */</span> <span class="token punctuation">&#125;</span><span class="token punctuation">,</span>
    <span class="token function">m</span><span class="token punctuation">(</span><span class="token parameter">target<span class="token punctuation">,</span> anchor<span class="token punctuation">,</span> remount</span><span class="token punctuation">)</span> <span class="token punctuation">&#123;</span>
      <span class="token function">insert</span><span class="token punctuation">(</span>target<span class="token punctuation">,</span> input<span class="token punctuation">,</span> anchor<span class="token punctuation">)</span><span class="token punctuation">;</span>
      input<span class="token punctuation">.</span>checked <span class="token operator">=</span> <span class="token comment">/*checked*/</span> ctx<span class="token punctuation">[</span><span class="token number">0</span><span class="token punctuation">]</span><span class="token punctuation">;</span>
      <span class="token comment">// highlight-start</span>
      <span class="token keyword">if</span> <span class="token punctuation">(</span>remount<span class="token punctuation">)</span> <span class="token function">dispose</span><span class="token punctuation">(</span><span class="token punctuation">)</span><span class="token punctuation">;</span>
      dispose <span class="token operator">=</span> <span class="token function">listen</span><span class="token punctuation">(</span>input<span class="token punctuation">,</span> <span class="token string">'change'</span><span class="token punctuation">,</span> <span class="token comment">/*input_change_handler*/</span> ctx<span class="token punctuation">[</span><span class="token number">1</span><span class="token punctuation">]</span><span class="token punctuation">)</span><span class="token punctuation">;</span>
      <span class="token comment">// highlight-end</span>
    <span class="token punctuation">&#125;</span><span class="token punctuation">,</span>
    <span class="token function">p</span><span class="token punctuation">(</span><span class="token parameter">ctx<span class="token punctuation">,</span> <span class="token punctuation">[</span>dirty<span class="token punctuation">]</span></span><span class="token punctuation">)</span> <span class="token punctuation">&#123;</span>
      <span class="token comment">// highlight-start</span>
      <span class="token keyword">if</span> <span class="token punctuation">(</span>dirty <span class="token operator">&amp;</span> <span class="token comment">/*checked*/</span> <span class="token number">1</span><span class="token punctuation">)</span> <span class="token punctuation">&#123;</span>
        input<span class="token punctuation">.</span>checked <span class="token operator">=</span> <span class="token comment">/*checked*/</span> ctx<span class="token punctuation">[</span><span class="token number">0</span><span class="token punctuation">]</span><span class="token punctuation">;</span>
      <span class="token punctuation">&#125;</span>
      <span class="token comment">// highlight-end</span>
    <span class="token punctuation">&#125;</span><span class="token punctuation">,</span>
    <span class="token function">d</span><span class="token punctuation">(</span><span class="token parameter">detaching</span><span class="token punctuation">)</span> <span class="token punctuation">&#123;</span>
      <span class="token keyword">if</span> <span class="token punctuation">(</span>detaching<span class="token punctuation">)</span> <span class="token function">detach</span><span class="token punctuation">(</span>input<span class="token punctuation">)</span><span class="token punctuation">;</span>
      <span class="token comment">// highlight-next-line</span>
      <span class="token function">dispose</span><span class="token punctuation">(</span><span class="token punctuation">)</span><span class="token punctuation">;</span>
    <span class="token punctuation">&#125;</span><span class="token punctuation">,</span>
  <span class="token punctuation">&#125;</span><span class="token punctuation">;</span>
<span class="token punctuation">&#125;</span>

<span class="token keyword">function</span> <span class="token function">instance</span><span class="token punctuation">(</span><span class="token parameter">$$self<span class="token punctuation">,</span> $$props<span class="token punctuation">,</span> $$invalidate</span><span class="token punctuation">)</span> <span class="token punctuation">&#123;</span>
  <span class="token keyword">let</span> checked <span class="token operator">=</span> <span class="token boolean">false</span><span class="token punctuation">;</span>

  <span class="token keyword">function</span> <span class="token function">updateChecked</span><span class="token punctuation">(</span><span class="token punctuation">)</span> <span class="token punctuation">&#123;</span>
    <span class="token comment">// highlight-next-line</span>
    <span class="token function">$$invalidate</span><span class="token punctuation">(</span><span class="token number">0</span><span class="token punctuation">,</span> <span class="token punctuation">(</span>checked <span class="token operator">=</span> <span class="token boolean">true</span><span class="token punctuation">)</span><span class="token punctuation">)</span><span class="token punctuation">;</span>
  <span class="token punctuation">&#125;</span>

  <span class="token comment">// highlight-start</span>
  <span class="token keyword">function</span> <span class="token function">input_change_handler</span><span class="token punctuation">(</span><span class="token punctuation">)</span> <span class="token punctuation">&#123;</span>
    checked <span class="token operator">=</span> <span class="token keyword">this</span><span class="token punctuation">.</span>checked<span class="token punctuation">;</span>
    <span class="token function">$$invalidate</span><span class="token punctuation">(</span><span class="token number">0</span><span class="token punctuation">,</span> checked<span class="token punctuation">)</span><span class="token punctuation">;</span>
  <span class="token punctuation">&#125;</span>
  <span class="token comment">// highlight-end</span>

  <span class="token keyword">return</span> <span class="token punctuation">[</span>checked<span class="token punctuation">,</span> input_change_handler<span class="token punctuation">]</span><span class="token punctuation">;</span>
<span class="token punctuation">&#125;</span></code>` + "";

	let t295;
	let p44;
	let t296;
	let t297;
	let ul13;
	let li32;
	let t298;
	let ul11;
	let li30;
	let t299;
	let code51;
	let t300;
	let t301;
	let code52;
	let t302;
	let t303;
	let li31;
	let t304;
	let strong7;
	let t305;
	let t306;
	let code53;
	let t307;
	let t308;
	let code54;
	let t309;
	let t310;
	let code55;
	let t311;
	let t312;
	let t313;
	let li35;
	let t314;
	let ul12;
	let li33;
	let t315;
	let code56;
	let t316;
	let t317;
	let code57;
	let t318;
	let t319;
	let t320;
	let li34;
	let t321;
	let code58;
	let t322;
	let t323;
	let strong8;
	let t324;
	let t325;
	let code59;
	let t326;
	let t327;
	let strong9;
	let t328;
	let t329;
	let t330;
	let section15;
	let h38;
	let a51;
	let code60;
	let t331;
	let t332;
	let t333;
	let pre19;

	let raw19_value = `
<code class="language-svelte">&lt;script&gt;
	let i = &#39;&#39;;
	function action() &#123;&#125;
  function updateI() &#123;
    i++;
  &#125;
&lt;/script&gt;

&lt;div use:action=&#123;i&#125; /&gt;</code>` + "";

	let t334;
	let p45;
	let a52;
	let t335;
	let t336;
	let p46;
	let t337;
	let t338;
	let pre20;

	let raw20_value = `
<code class="language-js"><span class="token comment">/* App.svelte generated by Svelte v3.22.2 */</span>
<span class="token comment">// ...</span>
<span class="token keyword">function</span> <span class="token function">create_fragment</span><span class="token punctuation">(</span><span class="token parameter">ctx</span><span class="token punctuation">)</span> <span class="token punctuation">&#123;</span>
  <span class="token comment">// ...</span>
  <span class="token keyword">let</span> action_action<span class="token punctuation">;</span>

  <span class="token keyword">return</span> <span class="token punctuation">&#123;</span>
    <span class="token function">c</span><span class="token punctuation">(</span><span class="token punctuation">)</span> <span class="token punctuation">&#123;</span> <span class="token comment">/* ... */</span> <span class="token punctuation">&#125;</span><span class="token punctuation">,</span>
    <span class="token function">m</span><span class="token punctuation">(</span><span class="token parameter">target<span class="token punctuation">,</span> anchor<span class="token punctuation">,</span> remount</span><span class="token punctuation">)</span> <span class="token punctuation">&#123;</span>
      <span class="token function">insert</span><span class="token punctuation">(</span>target<span class="token punctuation">,</span> div<span class="token punctuation">,</span> anchor<span class="token punctuation">)</span><span class="token punctuation">;</span>
      <span class="token comment">// highlight-start</span>
      <span class="token keyword">if</span> <span class="token punctuation">(</span>remount<span class="token punctuation">)</span> <span class="token function">dispose</span><span class="token punctuation">(</span><span class="token punctuation">)</span><span class="token punctuation">;</span>
      dispose <span class="token operator">=</span> <span class="token function">action_destroyer</span><span class="token punctuation">(</span>
        <span class="token punctuation">(</span>action_action <span class="token operator">=</span> <span class="token function">action</span><span class="token punctuation">.</span><span class="token function">call</span><span class="token punctuation">(</span><span class="token keyword">null</span><span class="token punctuation">,</span> div<span class="token punctuation">,</span> <span class="token comment">/*i*/</span> ctx<span class="token punctuation">[</span><span class="token number">0</span><span class="token punctuation">]</span><span class="token punctuation">)</span><span class="token punctuation">)</span>
      <span class="token punctuation">)</span><span class="token punctuation">;</span>
      <span class="token comment">// highlight-end</span>
    <span class="token punctuation">&#125;</span><span class="token punctuation">,</span>
    <span class="token function">p</span><span class="token punctuation">(</span><span class="token parameter">ctx<span class="token punctuation">,</span> <span class="token punctuation">[</span>dirty<span class="token punctuation">]</span></span><span class="token punctuation">)</span> <span class="token punctuation">&#123;</span>
      <span class="token comment">// highlight-start</span>
      <span class="token keyword">if</span> <span class="token punctuation">(</span>action_action <span class="token operator">&amp;&amp;</span> <span class="token function">is_function</span><span class="token punctuation">(</span><span class="token parameter">action_action<span class="token punctuation">.</span>update</span><span class="token punctuation">)</span> <span class="token operator">&amp;&amp;</span> dirty <span class="token operator">&amp;</span> <span class="token comment">/*i*/</span> <span class="token number">1</span><span class="token punctuation">)</span>
        action_action<span class="token punctuation">.</span><span class="token function">update</span><span class="token punctuation">.</span><span class="token function">call</span><span class="token punctuation">(</span><span class="token keyword">null</span><span class="token punctuation">,</span> <span class="token comment">/*i*/</span> ctx<span class="token punctuation">[</span><span class="token number">0</span><span class="token punctuation">]</span><span class="token punctuation">)</span><span class="token punctuation">;</span>
      <span class="token comment">// highlight-end</span>
    <span class="token punctuation">&#125;</span><span class="token punctuation">,</span>
    <span class="token function">d</span><span class="token punctuation">(</span><span class="token parameter">detaching</span><span class="token punctuation">)</span> <span class="token punctuation">&#123;</span>
      <span class="token keyword">if</span> <span class="token punctuation">(</span>detaching<span class="token punctuation">)</span> <span class="token function">detach</span><span class="token punctuation">(</span>div<span class="token punctuation">)</span><span class="token punctuation">;</span>
      <span class="token comment">// highlight-next-line</span>
      <span class="token function">dispose</span><span class="token punctuation">(</span><span class="token punctuation">)</span><span class="token punctuation">;</span>
    <span class="token punctuation">&#125;</span><span class="token punctuation">,</span>
  <span class="token punctuation">&#125;</span><span class="token punctuation">;</span>
<span class="token punctuation">&#125;</span></code>` + "";

	let t339;
	let p47;
	let t340;
	let t341;
	let ul14;
	let li36;
	let t342;
	let code61;
	let t343;
	let t344;
	let code62;
	let t345;
	let t346;
	let strong10;
	let t347;
	let t348;
	let t349;
	let li37;
	let t350;
	let code63;
	let t351;
	let t352;
	let strong11;
	let t353;
	let t354;
	let t355;
	let li38;
	let code64;
	let t356;
	let t357;
	let code65;
	let t358;
	let t359;
	let code66;
	let t360;
	let t361;
	let code67;
	let t362;
	let t363;
	let t364;
	let section16;
	let h39;
	let a53;
	let t365;
	let t366;
	let p48;
	let t367;
	let code68;
	let t368;
	let t369;
	let code69;
	let t370;
	let t371;
	let t372;
	let p49;
	let t373;
	let t374;
	let pre21;

	let raw21_value = `
<code class="language-svelte">&lt;script&gt;
  let before = &#39;&#39;
  let after = &#39;&#39;;
  function uppercase(event) &#123;
    // modifying the input.value
    event.target.value = event.target.value.toUpperCase();
  &#125;
&lt;/script&gt;

&lt;!-- bind after adding input listener --&gt;
&lt;input on:input=&#123;uppercase&#125; bind:value=&#123;after&#125; /&gt; &#123;after&#125;

&lt;!-- bind before adding input listener --&gt;
&lt;input bind:value=&#123;before&#125; on:input=&#123;uppercase&#125; /&gt; &#123;before&#125;</code>` + "";

	let t375;
	let p50;
	let t376;
	let code70;
	let t377;
	let t378;
	let code71;
	let t379;
	let t380;
	let code72;
	let t381;
	let t382;
	let t383;
	let p51;
	let t384;
	let code73;
	let t385;
	let t386;
	let code74;
	let t387;
	let t388;
	let t389;
	let p52;
	let t390;
	let code75;
	let t391;
	let t392;
	let t393;
	let pre22;

	let raw22_value = `
<code class="language-svelte">&lt;script&gt;
  let before = &#39;&#39;
  let after = &#39;&#39;;
  function uppercaseAction(element) &#123;
    function fn(event) &#123;
      event.target.value = event.target.value.toUpperCase()
    &#125;
    element.addEventListener(&#39;input&#39;, fn);
    return &#123;
      destroy() &#123;
        element.removeEventListener(&#39;input&#39;, fn);
      &#125;
    &#125;;
  &#125;
&lt;/script&gt;

&lt;!-- bind after adding action --&gt;
&lt;input use:uppercase bind:value=&#123;after&#125; /&gt; &#123;after&#125;

&lt;!-- bind before adding action --&gt;
&lt;input bind:value=&#123;before&#125; use:uppercase /&gt; &#123;before&#125;</code>` + "";

	let t394;
	let p53;
	let t395;
	let em1;
	let t396;
	let t397;
	let strong12;
	let t398;
	let code76;
	let t399;
	let t400;
	let code77;
	let t401;
	let t402;
	let code78;
	let t403;
	let t404;
	let t405;
	let t406;
	let p54;
	let t407;
	let t408;
	let pre23;

	let raw23_value = `
<code class="language-svelte">&lt;script&gt;
  let checked;
  function onChange() &#123;&#125;
  function action() &#123;&#125;
&lt;/script&gt;

&lt;input
  type=checkbox
  bind:checked
  on:change=&#123;onChange&#125;
  use:action
/&gt;</code>` + "";

	let t409;
	let p55;
	let a54;
	let t410;
	let t411;
	let p56;
	let t412;
	let code79;
	let t413;
	let t414;
	let code80;
	let t415;
	let t416;
	let code81;
	let t417;
	let t418;
	let t419;
	let pre24;

	let raw24_value = `
<code class="language-js"><span class="token comment">// ...</span>
<span class="token keyword">function</span> <span class="token function">create_fragment</span><span class="token punctuation">(</span><span class="token parameter">ctx</span><span class="token punctuation">)</span> <span class="token punctuation">&#123;</span>
  <span class="token keyword">let</span> input<span class="token punctuation">;</span>
  <span class="token keyword">let</span> action_action<span class="token punctuation">;</span>
  <span class="token keyword">let</span> dispose<span class="token punctuation">;</span>

  <span class="token keyword">return</span> <span class="token punctuation">&#123;</span>
    <span class="token function">c</span><span class="token punctuation">(</span><span class="token punctuation">)</span> <span class="token punctuation">&#123;</span> <span class="token comment">/* ... */</span> <span class="token punctuation">&#125;</span><span class="token punctuation">,</span>
    <span class="token function">m</span><span class="token punctuation">(</span><span class="token parameter">target<span class="token punctuation">,</span> anchor<span class="token punctuation">,</span> remount</span><span class="token punctuation">)</span> <span class="token punctuation">&#123;</span>
      <span class="token comment">// ...</span>
      <span class="token comment">// highlight-start</span>
      dispose <span class="token operator">=</span> <span class="token punctuation">[</span>
        <span class="token comment">// bind:checked</span>
        <span class="token function">listen</span><span class="token punctuation">(</span>input<span class="token punctuation">,</span> <span class="token string">'change'</span><span class="token punctuation">,</span> <span class="token comment">/*input_change_handler*/</span> ctx<span class="token punctuation">[</span><span class="token number">1</span><span class="token punctuation">]</span><span class="token punctuation">)</span><span class="token punctuation">,</span>
        <span class="token comment">// on:change=&#123;onChange&#125;</span>
        <span class="token function">listen</span><span class="token punctuation">(</span>input<span class="token punctuation">,</span> <span class="token string">'change'</span><span class="token punctuation">,</span> onChange<span class="token punctuation">)</span><span class="token punctuation">,</span>
        <span class="token comment">// use:action</span>
        <span class="token function">action_destroyer</span><span class="token punctuation">(</span><span class="token punctuation">(</span>action_action <span class="token operator">=</span> <span class="token function">action</span><span class="token punctuation">.</span><span class="token function">call</span><span class="token punctuation">(</span><span class="token keyword">null</span><span class="token punctuation">,</span> input<span class="token punctuation">)</span><span class="token punctuation">)</span><span class="token punctuation">)</span><span class="token punctuation">,</span>
      <span class="token punctuation">]</span><span class="token punctuation">;</span>
      <span class="token comment">// highlight-end</span>
    <span class="token punctuation">&#125;</span><span class="token punctuation">,</span>
    <span class="token comment">// ...</span>
  <span class="token punctuation">&#125;</span><span class="token punctuation">;</span>
<span class="token punctuation">&#125;</span></code>` + "";

	let t420;
	let p57;
	let t421;
	let a55;
	let t422;
	let t423;
	let t424;
	let section17;
	let h23;
	let a56;
	let t425;
	let t426;
	let p58;
	let t427;
	let code82;
	let t428;
	let t429;
	let code83;
	let t430;
	let t431;
	let code84;
	let t432;
	let t433;
	let t434;
	let p59;
	let t435;
	let t436;
	let p60;
	let t437;
	let t438;
	let p61;
	let t439;
	let a57;
	let t440;
	let t441;
	let t442;
	let p62;
	let t443;
	let a58;
	let t444;
	let t445;
	let a59;
	let t446;
	let t447;
	let a60;
	let t448;
	let t449;
	let t450;
	let p63;
	let strong13;
	let t451;
	let a61;
	let t452;
	let t453;

	return {
		c() {
			section0 = element("section");
			ul5 = element("ul");
			li0 = element("li");
			a0 = element("a");
			t0 = text("The  on: ,  bind:  and  use:");
			ul0 = element("ul");
			li1 = element("li");
			a1 = element("a");
			t1 = text("on:  event handlers");
			li2 = element("li");
			a2 = element("a");
			t2 = text("bind:  bindings");
			li3 = element("li");
			a3 = element("a");
			t3 = text("use:  actions");
			li4 = element("li");
			a4 = element("a");
			t4 = text("The Vanilla JS");
			ul2 = element("ul");
			li5 = element("li");
			a5 = element("a");
			t5 = text("Event handler");
			ul1 = element("ul");
			li6 = element("li");
			a6 = element("a");
			t6 = text("event.preventDefault");
			li7 = element("li");
			a7 = element("a");
			t7 = text("event.stopPropagation");
			li8 = element("li");
			a8 = element("a");
			t8 = text("Bindings");
			li9 = element("li");
			a9 = element("a");
			t9 = text("Actions");
			li10 = element("li");
			a10 = element("a");
			t10 = text("The Compiled JS");
			ul4 = element("ul");
			li11 = element("li");
			a11 = element("a");
			t11 = text("on:  directive");
			ul3 = element("ul");
			li12 = element("li");
			a12 = element("a");
			t12 = text("Event modifiers");
			li13 = element("li");
			a13 = element("a");
			t13 = text("bind:  directive");
			li14 = element("li");
			a14 = element("a");
			t14 = text("use:  directive");
			li15 = element("li");
			a15 = element("a");
			t15 = text("The order of directives");
			li16 = element("li");
			a16 = element("a");
			t16 = text("Closing Note");
			t17 = space();
			p0 = element("p");
			strong0 = element("strong");
			t18 = text("⬅ ⬅  Previously in ");
			a17 = element("a");
			t19 = text("Part 2");
			t20 = text(".");
			t21 = space();
			p1 = element("p");
			a18 = element("a");
			t22 = text("Previously");
			t23 = text(", I detailed how ");
			code0 = element("code");
			t24 = text("$$invalidate");
			t25 = text(" works, described how bitmask was used in ");
			code1 = element("code");
			t26 = text("$$invalidate");
			t27 = text(", and explained how reactive declarations work as well.");
			t28 = space();
			p2 = element("p");
			t29 = text("In this article, we are going to look into 3 DOM related directives:");
			t30 = space();
			ul6 = element("ul");
			li17 = element("li");
			code2 = element("code");
			t31 = text("on:");
			t32 = text(" for event handlers");
			t33 = space();
			li18 = element("li");
			code3 = element("code");
			t34 = text("bind:");
			t35 = text(" for bindings");
			t36 = space();
			li19 = element("li");
			code4 = element("code");
			t37 = text("use:");
			t38 = text(" for actions");
			t39 = space();
			p3 = element("p");
			t40 = text("To make sure we are on the same page, let's first explain how these 3 directives work.");
			t41 = space();
			section1 = element("section");
			h20 = element("h2");
			a19 = element("a");
			t42 = text("The ");
			code5 = element("code");
			t43 = text("on:");
			t44 = text(", ");
			code6 = element("code");
			t45 = text("bind:");
			t46 = text(" and ");
			code7 = element("code");
			t47 = text("use:");
			t48 = space();
			section2 = element("section");
			h30 = element("h3");
			a20 = element("a");
			code8 = element("code");
			t49 = text("on:");
			t50 = text(" event handlers");
			t51 = space();
			p4 = element("p");
			t52 = text("You can use the ");
			code9 = element("code");
			t53 = text("on:");
			t54 = text(" directive to listen to any event on an element:");
			t55 = space();
			pre0 = element("pre");
			t56 = space();
			section3 = element("section");
			h31 = element("h3");
			a21 = element("a");
			code10 = element("code");
			t57 = text("bind:");
			t58 = text(" bindings");
			t59 = space();
			p5 = element("p");
			t60 = text("The ");
			code11 = element("code");
			t61 = text("bind:");
			t62 = text(" directive allows you to bind a variable to a property of an element.");
			t63 = space();
			p6 = element("p");
			t64 = text("Updating the variable will modifying the property of the element, conversely, modifying the property of the element via interacting with the element will, in turn, update the variable.");
			t65 = space();
			pre1 = element("pre");
			t66 = space();
			section4 = element("section");
			h32 = element("h3");
			a22 = element("a");
			code12 = element("code");
			t67 = text("use:");
			t68 = text(" actions");
			t69 = space();
			p7 = element("p");
			t70 = text("The ");
			code13 = element("code");
			t71 = text("use:");
			t72 = text(" directive is called ");
			strong1 = element("strong");
			a23 = element("a");
			t73 = text("\"Action\"");
			t74 = text(". It provides you an interface to enhance your element.");
			t75 = space();
			p8 = element("p");
			t76 = text("You pass a function to the ");
			code14 = element("code");
			t77 = text("use:");
			t78 = text(" directive of an element and the function will be called when your element is mounted.");
			t79 = space();
			p9 = element("p");
			t80 = text("The function should return an object in which the ");
			code15 = element("code");
			t81 = text("destroy");
			t82 = text(" method of the object will be called when the element is unmounted.");
			t83 = space();
			pre2 = element("pre");
			t84 = space();
			p10 = element("p");
			t85 = text("This is useful when you want to interface with 3rd-party libraries:");
			t86 = space();
			pre3 = element("pre");
			t87 = space();
			p11 = element("p");
			t88 = text("You can pass in parameters to the ");
			code16 = element("code");
			t89 = text("use:");
			t90 = text(" directive, to bring in reactivity into your actions");
			t91 = space();
			pre4 = element("pre");
			t92 = space();
			p12 = element("p");
			t93 = text("You can visit Svelte's interactive tutorial to learn more about:");
			t94 = space();
			ul7 = element("ul");
			li20 = element("li");
			a24 = element("a");
			t95 = text("event handlers with ");
			code17 = element("code");
			t96 = text("on:");
			t97 = space();
			li21 = element("li");
			a25 = element("a");
			t98 = text("bindings with ");
			code18 = element("code");
			t99 = text("bind:");
			t100 = space();
			li22 = element("li");
			a26 = element("a");
			t101 = text("actions with ");
			code19 = element("code");
			t102 = text("use:");
			t103 = space();
			section5 = element("section");
			h21 = element("h2");
			a27 = element("a");
			t104 = text("The Vanilla JS");
			t105 = space();
			p13 = element("p");
			t106 = text("Now, let's refresh ourselves with how we can implement an event handler, bindings, and actions without using any framework.");
			t107 = space();
			section6 = element("section");
			h33 = element("h3");
			a28 = element("a");
			t108 = text("Event handler");
			t109 = space();
			p14 = element("p");
			t110 = text("As ");
			a29 = element("a");
			t111 = text("mentioned in the Part 1 of the series");
			t112 = text(", we can use ");
			a30 = element("a");
			t113 = text("element.addEventListener");
			t114 = text(" to listen to events.");
			t115 = space();
			pre5 = element("pre");
			t116 = space();
			p15 = element("p");
			t117 = text("The event listener takes in an optional 3rd argument, which allows you to specifies the characteristics of the event handler:");
			t118 = space();
			pre6 = element("pre");
			t119 = space();
			section7 = element("section");
			h40 = element("h4");
			a31 = element("a");
			t120 = text("event.preventDefault");
			t121 = space();
			p16 = element("p");
			a32 = element("a");
			t122 = text("event.preventDefault");
			t123 = text(" allows you to prevent the default behavior of the event, for example submitting form for ");
			code20 = element("code");
			t124 = text("<button type=\"submit\" />");
			t125 = text(" or navigating to the target for ");
			code21 = element("code");
			t126 = text("<a href=\"...\">");
			t127 = text(".");
			t128 = space();
			pre7 = element("pre");
			t129 = space();
			section8 = element("section");
			h41 = element("h4");
			a33 = element("a");
			t130 = text("event.stopPropagation");
			t131 = space();
			p17 = element("p");
			a34 = element("a");
			t132 = text("event.stopPropagation");
			t133 = text(" allows you to prevent event to continue propagate.");
			t134 = space();
			pre8 = element("pre");
			t135 = space();
			p18 = element("p");
			t136 = text("To remove the event listener, you need to call ");
			code22 = element("code");
			t137 = text("element.removeEventListener");
			t138 = text(" with the same event ");
			code23 = element("code");
			t139 = text("type");
			t140 = text(", ");
			code24 = element("code");
			t141 = text("listener");
			t142 = text(" and ");
			code25 = element("code");
			t143 = text("capture");
			t144 = text("/");
			code26 = element("code");
			t145 = text("useCapture");
			t146 = text(" flag. You can check out the ");
			a35 = element("a");
			t147 = text("MDN docs on \"Matching event listeners for removal\"");
			t148 = text(".");
			t149 = space();
			pre9 = element("pre");
			t150 = space();
			section9 = element("section");
			h34 = element("h3");
			a36 = element("a");
			t151 = text("Bindings");
			t152 = space();
			p19 = element("p");
			t153 = text("Binding is to synchronise between the value of a variable and a property of an element.");
			t154 = space();
			p20 = element("p");
			t155 = text("To synchronise the variable to a property of an element, we need to observe the value of the variable. When it changes, apply it to the property of the element.");
			t156 = space();
			p21 = element("p");
			em0 = element("em");
			t157 = text("You can check out my previous article ");
			a37 = element("a");
			t158 = text("\"Reactivity in Web Frameworks\"");
			t159 = text(" on how we get notified when the value of a variable changed.");
			t160 = space();
			p22 = element("p");
			t161 = text("On the other hand, to synchronise the property of an element to a variable, we ");
			strong2 = element("strong");
			t162 = text("listen to an event of the element");
			t163 = text(", depending on the property, and update the value of the variable when it happens.");
			t164 = space();
			pre10 = element("pre");
			t165 = space();
			p23 = element("p");
			t166 = text("Some observations:");
			t167 = space();
			p24 = element("p");
			strong3 = element("strong");
			t168 = text("- The name of the event and the property name of the element may not be the same.");
			t169 = space();
			p25 = element("p");
			t170 = text("In this example, we listen to ");
			code27 = element("code");
			t171 = text("\"change\"");
			t172 = text(" event for the checkbox ");
			code28 = element("code");
			t173 = text("checked");
			t174 = text(" property.");
			t175 = space();
			p26 = element("p");
			strong4 = element("strong");
			t176 = text("- It is almost impossible to bind a property of an element, if there's no event fired from the element to indicate the property has changed");
			t177 = space();
			p27 = element("p");
			t178 = text("A recent example I found out is the ");
			a38 = element("a");
			t179 = text("HTMLDialogElement");
			t180 = text(". It has ");
			a39 = element("a");
			code29 = element("code");
			t181 = text("\"close\"");
			t182 = text(" but not ");
			code30 = element("code");
			t183 = text("\"open\"");
			t184 = text(" event, which makes it hard to implement ");
			code31 = element("code");
			t185 = text("bind:open");
			t186 = text(" on the dialog element.");
			t187 = space();
			p28 = element("p");
			t188 = text("Maybe an alternative would be using ");
			a40 = element("a");
			t189 = text("MutationObserver");
			t190 = text(", which I haven't seen any usage of it in Svelte codebase yet.");
			t191 = space();
			section10 = element("section");
			h35 = element("h3");
			a41 = element("a");
			t192 = text("Actions");
			t193 = space();
			p29 = element("p");
			t194 = text("Action is a function that gets called when your element is created and mounted onto the DOM.");
			t195 = space();
			p30 = element("p");
			t196 = text("The function returns an object, with 2 methods:");
			t197 = space();
			ul8 = element("ul");
			li23 = element("li");
			code32 = element("code");
			t198 = text("update");
			t199 = text(", which gets called when the parameters change");
			t200 = space();
			li24 = element("li");
			code33 = element("code");
			t201 = text("destroy");
			t202 = text(", which gets called when the element is removed from the DOM");
			t203 = space();
			pre11 = element("pre");
			t204 = space();
			section11 = element("section");
			h22 = element("h2");
			a42 = element("a");
			t205 = text("The Compiled JS");
			t206 = space();
			p31 = element("p");
			t207 = text("Now let's take look at how Svelte compiles ");
			code34 = element("code");
			t208 = text("on:");
			t209 = text(", ");
			code35 = element("code");
			t210 = text("bind:");
			t211 = text(" and ");
			code36 = element("code");
			t212 = text("use:");
			t213 = text(" directives into output JavaScript.");
			t214 = space();
			section12 = element("section");
			h36 = element("h3");
			a43 = element("a");
			code37 = element("code");
			t215 = text("on:");
			t216 = text(" directive");
			t217 = space();
			pre12 = element("pre");
			t218 = space();
			p32 = element("p");
			a44 = element("a");
			t219 = text("Svelte REPL");
			t220 = space();
			p33 = element("p");
			t221 = text("The output code:");
			t222 = space();
			pre13 = element("pre");
			t223 = space();
			p34 = element("p");
			t224 = text("Some observations:");
			t225 = space();
			ul9 = element("ul");
			li25 = element("li");
			t226 = text("Svelte adds event handler, ");
			code38 = element("code");
			t227 = text("listen(...)");
			t228 = text(", in the ");
			strong5 = element("strong");
			t229 = text("_m_ount");
			t230 = text(" method.");
			t231 = space();
			li26 = element("li");
			t232 = text("Svelte removes event handler, ");
			code39 = element("code");
			t233 = text("dispose()");
			t234 = text(", in the ");
			strong6 = element("strong");
			t235 = text("_d_estroy");
			t236 = text(" method.");
			t237 = space();
			p35 = element("p");
			t238 = text("As pointed out in ");
			a45 = element("a");
			t239 = text("Part 1 #listen and dispose");
			t240 = text(", to optimise for minification, the ");
			code40 = element("code");
			t241 = text("dispose");
			t242 = text(" variable could be a function or an array of functions, depending on having one or many event handlers.");
			t243 = space();
			p36 = element("p");
			t244 = text("We will discuss ");
			code41 = element("code");
			t245 = text("remount");
			t246 = text(" in the future, as it is related to remounting elements while reordering items within each block.");
			t247 = space();
			section13 = element("section");
			h42 = element("h4");
			a46 = element("a");
			t248 = text("Event modifiers");
			t249 = space();
			p37 = element("p");
			t250 = text("Event handlers can have modifiers that alter their behavior.");
			t251 = space();
			pre14 = element("pre");
			t252 = space();
			p38 = element("p");
			a47 = element("a");
			t253 = text("Svelte REPL");
			t254 = space();
			p39 = element("p");
			t255 = text("The output code:");
			t256 = space();
			pre15 = element("pre");
			t257 = space();
			p40 = element("p");
			t258 = text("Some observations:");
			t259 = space();
			ul10 = element("ul");
			li27 = element("li");
			t260 = text("Svelte handles different modifiers differently.");
			t261 = space();
			li28 = element("li");
			t262 = text("For ");
			code42 = element("code");
			t263 = text("capture");
			t264 = text(", ");
			code43 = element("code");
			t265 = text("once");
			t266 = text(", and ");
			code44 = element("code");
			t267 = text("passive");
			t268 = text(" modifiers, which they are part of the options for ");
			a48 = element("a");
			t269 = text("element.addEventListener");
			t270 = text(", they will be passed as options into the ");
			code45 = element("code");
			t271 = text("listen");
			t272 = text(" function.");
			t273 = space();
			li29 = element("li");
			t274 = text("For ");
			code46 = element("code");
			t275 = text("stopPropagation");
			t276 = text(", ");
			code47 = element("code");
			t277 = text("preventDefault");
			t278 = text(", and ");
			code48 = element("code");
			t279 = text("self");
			t280 = text(" modifiers, the event handler is decorated with respective decorator functions.");
			t281 = space();
			p41 = element("p");
			t282 = text("An example implementation of the ");
			code49 = element("code");
			t283 = text("prevent_default");
			t284 = text(" decorator function:");
			t285 = space();
			pre16 = element("pre");
			t286 = space();
			section14 = element("section");
			h37 = element("h3");
			a49 = element("a");
			code50 = element("code");
			t287 = text("bind:");
			t288 = text(" directive");
			t289 = space();
			pre17 = element("pre");
			t290 = space();
			p42 = element("p");
			a50 = element("a");
			t291 = text("Svelte REPL");
			t292 = space();
			p43 = element("p");
			t293 = text("The output code:");
			t294 = space();
			pre18 = element("pre");
			t295 = space();
			p44 = element("p");
			t296 = text("Some observations:");
			t297 = space();
			ul13 = element("ul");
			li32 = element("li");
			t298 = text("To synchronise the value of the variable to the property of the element:");
			ul11 = element("ul");
			li30 = element("li");
			t299 = text("Svelte wraps the update of the variable ");
			code51 = element("code");
			t300 = text("checked");
			t301 = text(" with ");
			code52 = element("code");
			t302 = text("$$invalidate(...)");
			t303 = space();
			li31 = element("li");
			t304 = text("In the ");
			strong7 = element("strong");
			t305 = text("u_p_date");
			t306 = text(" method, if the variable ");
			code53 = element("code");
			t307 = text("checked");
			t308 = text(" is updated, Svelte sets ");
			code54 = element("code");
			t309 = text("input.checked");
			t310 = text(" to the value of the variable ");
			code55 = element("code");
			t311 = text("checked");
			t312 = text(".");
			t313 = space();
			li35 = element("li");
			t314 = text("To syncrhonise the property of the element to the variable");
			ul12 = element("ul");
			li33 = element("li");
			t315 = text("Svelte creates an input handler that reads the ");
			code56 = element("code");
			t316 = text("this.checked");
			t317 = text(" property of the input and calls ");
			code57 = element("code");
			t318 = text("$$invalidate(...)");
			t319 = text(" to update it.");
			t320 = space();
			li34 = element("li");
			t321 = text("Svelte sets up ");
			code58 = element("code");
			t322 = text("listen(...)");
			t323 = text(" in the ");
			strong8 = element("strong");
			t324 = text("_m_ount");
			t325 = text(" method and ");
			code59 = element("code");
			t326 = text("dispose(...)");
			t327 = text(" in the ");
			strong9 = element("strong");
			t328 = text("_d_estroy");
			t329 = text(" method for the input handler");
			t330 = space();
			section15 = element("section");
			h38 = element("h3");
			a51 = element("a");
			code60 = element("code");
			t331 = text("use:");
			t332 = text(" directive");
			t333 = space();
			pre19 = element("pre");
			t334 = space();
			p45 = element("p");
			a52 = element("a");
			t335 = text("Svelte REPL");
			t336 = space();
			p46 = element("p");
			t337 = text("The output code:");
			t338 = space();
			pre20 = element("pre");
			t339 = space();
			p47 = element("p");
			t340 = text("Some observations:");
			t341 = space();
			ul14 = element("ul");
			li36 = element("li");
			t342 = text("Creating ");
			code61 = element("code");
			t343 = text("action_action");
			t344 = text(" object by calling the ");
			code62 = element("code");
			t345 = text("action");
			t346 = text(" function in the ");
			strong10 = element("strong");
			t347 = text("_m_out");
			t348 = text(" method");
			t349 = space();
			li37 = element("li");
			t350 = text("When the paramter change, call the ");
			code63 = element("code");
			t351 = text("action_action.update");
			t352 = text(" method with the updated parameter in the ");
			strong11 = element("strong");
			t353 = text("u_p_date");
			t354 = text(" method");
			t355 = space();
			li38 = element("li");
			code64 = element("code");
			t356 = text("action_destroyer");
			t357 = text(" returns the ");
			code65 = element("code");
			t358 = text("dispose");
			t359 = text(" function. The ");
			code66 = element("code");
			t360 = text("dispose");
			t361 = text(" function makes sure that ");
			code67 = element("code");
			t362 = text("action_action.destroy");
			t363 = text(" is a function before calling it.");
			t364 = space();
			section16 = element("section");
			h39 = element("h3");
			a53 = element("a");
			t365 = text("The order of directives");
			t366 = space();
			p48 = element("p");
			t367 = text("As both the ");
			code68 = element("code");
			t368 = text("bind:");
			t369 = text(" and the ");
			code69 = element("code");
			t370 = text("on:");
			t371 = text(" directives add event listeners to the element, the order of adding event listener may have nuance side effects.");
			t372 = space();
			p49 = element("p");
			t373 = text("Imagine the following scenario:");
			t374 = space();
			pre21 = element("pre");
			t375 = space();
			p50 = element("p");
			t376 = text("The ");
			code70 = element("code");
			t377 = text("input.value");
			t378 = text(" accessed by the implicit event handler of the ");
			code71 = element("code");
			t379 = text("bind:");
			t380 = text(" directive depends on whether ");
			code72 = element("code");
			t381 = text("on:input");
			t382 = text(" handler gets called before or after.");
			t383 = space();
			p51 = element("p");
			t384 = text("If the implicit event handler of the ");
			code73 = element("code");
			t385 = text("bind:");
			t386 = text(" directive is called before the event handler, the bound value is the value of the input before applying the ");
			code74 = element("code");
			t387 = text("toUpperCase()");
			t388 = text(" transformation.");
			t389 = space();
			p52 = element("p");
			t390 = text("Although ");
			code75 = element("code");
			t391 = text("action:");
			t392 = text(" directive itself does not add event listener to the element, but it is possible to be added by the user code:");
			t393 = space();
			pre22 = element("pre");
			t394 = space();
			p53 = element("p");
			t395 = text("Although it is not officially documented, ");
			em1 = element("em");
			t396 = text("(I couldn't find it on the docs)");
			t397 = text(", ");
			strong12 = element("strong");
			t398 = text("the order of declaring the directives ");
			code76 = element("code");
			t399 = text("on:");
			t400 = text(", ");
			code77 = element("code");
			t401 = text("bind:");
			t402 = text(" and ");
			code78 = element("code");
			t403 = text("use:");
			t404 = text(" on an element does matter");
			t405 = text(" to provide a consistent behavior.");
			t406 = space();
			p54 = element("p");
			t407 = text("Try out the following example in the REPL:");
			t408 = space();
			pre23 = element("pre");
			t409 = space();
			p55 = element("p");
			a54 = element("a");
			t410 = text("Svelte REPL");
			t411 = space();
			p56 = element("p");
			t412 = text("Try reordering the ");
			code79 = element("code");
			t413 = text("bind:");
			t414 = text(", ");
			code80 = element("code");
			t415 = text("on:");
			t416 = text(" and ");
			code81 = element("code");
			t417 = text("use:");
			t418 = text(" directives and see how it affects the output JS:");
			t419 = space();
			pre24 = element("pre");
			t420 = space();
			p57 = element("p");
			t421 = text("If you are interested to learn more about ordering directives, the edge cases it fixed and the regression bugs it caused, you can start with ");
			a55 = element("a");
			t422 = text("this Github issue");
			t423 = text(".");
			t424 = space();
			section17 = element("section");
			h23 = element("h2");
			a56 = element("a");
			t425 = text("Closing Note");
			t426 = space();
			p58 = element("p");
			t427 = text("In this article, we explored how ");
			code82 = element("code");
			t428 = text("on:");
			t429 = text(", ");
			code83 = element("code");
			t430 = text("bind:");
			t431 = text(" and ");
			code84 = element("code");
			t432 = text("use:");
			t433 = text(" directives work.");
			t434 = space();
			p59 = element("p");
			t435 = text("We first looked at how we can implement them without using any framework. After that, we walked through how Svelte compiles the directives into JavaScript.");
			t436 = space();
			p60 = element("p");
			t437 = text("We've also talked about how the order of declaring directives on an element matters.");
			t438 = space();
			p61 = element("p");
			t439 = text("If you wish to know more, ");
			a57 = element("a");
			t440 = text("follow me on Twitter");
			t441 = text(".");
			t442 = space();
			p62 = element("p");
			t443 = text("I'll post it on Twitter when the next part is ready, where I'll be covering ");
			a58 = element("a");
			t444 = text("logic blocks");
			t445 = text(", ");
			a59 = element("a");
			t446 = text("slots");
			t447 = text(", ");
			a60 = element("a");
			t448 = text("context");
			t449 = text(", and many others.");
			t450 = space();
			p63 = element("p");
			strong13 = element("strong");
			t451 = text("⬅ ⬅  Previously in ");
			a61 = element("a");
			t452 = text("Part 2");
			t453 = text(".");
			this.h();
		},
		l(nodes) {
			section0 = claim_element(nodes, "SECTION", {});
			var section0_nodes = children(section0);

			ul5 = claim_element(section0_nodes, "UL", {
				class: true,
				id: true,
				role: true,
				"aria-label": true
			});

			var ul5_nodes = children(ul5);
			li0 = claim_element(ul5_nodes, "LI", {});
			var li0_nodes = children(li0);
			a0 = claim_element(li0_nodes, "A", { href: true });
			var a0_nodes = children(a0);
			t0 = claim_text(a0_nodes, "The  on: ,  bind:  and  use:");
			a0_nodes.forEach(detach);
			li0_nodes.forEach(detach);
			ul0 = claim_element(ul5_nodes, "UL", {});
			var ul0_nodes = children(ul0);
			li1 = claim_element(ul0_nodes, "LI", {});
			var li1_nodes = children(li1);
			a1 = claim_element(li1_nodes, "A", { href: true });
			var a1_nodes = children(a1);
			t1 = claim_text(a1_nodes, "on:  event handlers");
			a1_nodes.forEach(detach);
			li1_nodes.forEach(detach);
			li2 = claim_element(ul0_nodes, "LI", {});
			var li2_nodes = children(li2);
			a2 = claim_element(li2_nodes, "A", { href: true });
			var a2_nodes = children(a2);
			t2 = claim_text(a2_nodes, "bind:  bindings");
			a2_nodes.forEach(detach);
			li2_nodes.forEach(detach);
			li3 = claim_element(ul0_nodes, "LI", {});
			var li3_nodes = children(li3);
			a3 = claim_element(li3_nodes, "A", { href: true });
			var a3_nodes = children(a3);
			t3 = claim_text(a3_nodes, "use:  actions");
			a3_nodes.forEach(detach);
			li3_nodes.forEach(detach);
			ul0_nodes.forEach(detach);
			li4 = claim_element(ul5_nodes, "LI", {});
			var li4_nodes = children(li4);
			a4 = claim_element(li4_nodes, "A", { href: true });
			var a4_nodes = children(a4);
			t4 = claim_text(a4_nodes, "The Vanilla JS");
			a4_nodes.forEach(detach);
			li4_nodes.forEach(detach);
			ul2 = claim_element(ul5_nodes, "UL", {});
			var ul2_nodes = children(ul2);
			li5 = claim_element(ul2_nodes, "LI", {});
			var li5_nodes = children(li5);
			a5 = claim_element(li5_nodes, "A", { href: true });
			var a5_nodes = children(a5);
			t5 = claim_text(a5_nodes, "Event handler");
			a5_nodes.forEach(detach);
			li5_nodes.forEach(detach);
			ul1 = claim_element(ul2_nodes, "UL", {});
			var ul1_nodes = children(ul1);
			li6 = claim_element(ul1_nodes, "LI", {});
			var li6_nodes = children(li6);
			a6 = claim_element(li6_nodes, "A", { href: true });
			var a6_nodes = children(a6);
			t6 = claim_text(a6_nodes, "event.preventDefault");
			a6_nodes.forEach(detach);
			li6_nodes.forEach(detach);
			li7 = claim_element(ul1_nodes, "LI", {});
			var li7_nodes = children(li7);
			a7 = claim_element(li7_nodes, "A", { href: true });
			var a7_nodes = children(a7);
			t7 = claim_text(a7_nodes, "event.stopPropagation");
			a7_nodes.forEach(detach);
			li7_nodes.forEach(detach);
			ul1_nodes.forEach(detach);
			li8 = claim_element(ul2_nodes, "LI", {});
			var li8_nodes = children(li8);
			a8 = claim_element(li8_nodes, "A", { href: true });
			var a8_nodes = children(a8);
			t8 = claim_text(a8_nodes, "Bindings");
			a8_nodes.forEach(detach);
			li8_nodes.forEach(detach);
			li9 = claim_element(ul2_nodes, "LI", {});
			var li9_nodes = children(li9);
			a9 = claim_element(li9_nodes, "A", { href: true });
			var a9_nodes = children(a9);
			t9 = claim_text(a9_nodes, "Actions");
			a9_nodes.forEach(detach);
			li9_nodes.forEach(detach);
			ul2_nodes.forEach(detach);
			li10 = claim_element(ul5_nodes, "LI", {});
			var li10_nodes = children(li10);
			a10 = claim_element(li10_nodes, "A", { href: true });
			var a10_nodes = children(a10);
			t10 = claim_text(a10_nodes, "The Compiled JS");
			a10_nodes.forEach(detach);
			li10_nodes.forEach(detach);
			ul4 = claim_element(ul5_nodes, "UL", {});
			var ul4_nodes = children(ul4);
			li11 = claim_element(ul4_nodes, "LI", {});
			var li11_nodes = children(li11);
			a11 = claim_element(li11_nodes, "A", { href: true });
			var a11_nodes = children(a11);
			t11 = claim_text(a11_nodes, "on:  directive");
			a11_nodes.forEach(detach);
			li11_nodes.forEach(detach);
			ul3 = claim_element(ul4_nodes, "UL", {});
			var ul3_nodes = children(ul3);
			li12 = claim_element(ul3_nodes, "LI", {});
			var li12_nodes = children(li12);
			a12 = claim_element(li12_nodes, "A", { href: true });
			var a12_nodes = children(a12);
			t12 = claim_text(a12_nodes, "Event modifiers");
			a12_nodes.forEach(detach);
			li12_nodes.forEach(detach);
			ul3_nodes.forEach(detach);
			li13 = claim_element(ul4_nodes, "LI", {});
			var li13_nodes = children(li13);
			a13 = claim_element(li13_nodes, "A", { href: true });
			var a13_nodes = children(a13);
			t13 = claim_text(a13_nodes, "bind:  directive");
			a13_nodes.forEach(detach);
			li13_nodes.forEach(detach);
			li14 = claim_element(ul4_nodes, "LI", {});
			var li14_nodes = children(li14);
			a14 = claim_element(li14_nodes, "A", { href: true });
			var a14_nodes = children(a14);
			t14 = claim_text(a14_nodes, "use:  directive");
			a14_nodes.forEach(detach);
			li14_nodes.forEach(detach);
			li15 = claim_element(ul4_nodes, "LI", {});
			var li15_nodes = children(li15);
			a15 = claim_element(li15_nodes, "A", { href: true });
			var a15_nodes = children(a15);
			t15 = claim_text(a15_nodes, "The order of directives");
			a15_nodes.forEach(detach);
			li15_nodes.forEach(detach);
			ul4_nodes.forEach(detach);
			li16 = claim_element(ul5_nodes, "LI", {});
			var li16_nodes = children(li16);
			a16 = claim_element(li16_nodes, "A", { href: true });
			var a16_nodes = children(a16);
			t16 = claim_text(a16_nodes, "Closing Note");
			a16_nodes.forEach(detach);
			li16_nodes.forEach(detach);
			ul5_nodes.forEach(detach);
			section0_nodes.forEach(detach);
			t17 = claim_space(nodes);
			p0 = claim_element(nodes, "P", {});
			var p0_nodes = children(p0);
			strong0 = claim_element(p0_nodes, "STRONG", {});
			var strong0_nodes = children(strong0);
			t18 = claim_text(strong0_nodes, "⬅ ⬅  Previously in ");
			a17 = claim_element(strong0_nodes, "A", { href: true });
			var a17_nodes = children(a17);
			t19 = claim_text(a17_nodes, "Part 2");
			a17_nodes.forEach(detach);
			t20 = claim_text(strong0_nodes, ".");
			strong0_nodes.forEach(detach);
			p0_nodes.forEach(detach);
			t21 = claim_space(nodes);
			p1 = claim_element(nodes, "P", {});
			var p1_nodes = children(p1);
			a18 = claim_element(p1_nodes, "A", { href: true });
			var a18_nodes = children(a18);
			t22 = claim_text(a18_nodes, "Previously");
			a18_nodes.forEach(detach);
			t23 = claim_text(p1_nodes, ", I detailed how ");
			code0 = claim_element(p1_nodes, "CODE", {});
			var code0_nodes = children(code0);
			t24 = claim_text(code0_nodes, "$$invalidate");
			code0_nodes.forEach(detach);
			t25 = claim_text(p1_nodes, " works, described how bitmask was used in ");
			code1 = claim_element(p1_nodes, "CODE", {});
			var code1_nodes = children(code1);
			t26 = claim_text(code1_nodes, "$$invalidate");
			code1_nodes.forEach(detach);
			t27 = claim_text(p1_nodes, ", and explained how reactive declarations work as well.");
			p1_nodes.forEach(detach);
			t28 = claim_space(nodes);
			p2 = claim_element(nodes, "P", {});
			var p2_nodes = children(p2);
			t29 = claim_text(p2_nodes, "In this article, we are going to look into 3 DOM related directives:");
			p2_nodes.forEach(detach);
			t30 = claim_space(nodes);
			ul6 = claim_element(nodes, "UL", {});
			var ul6_nodes = children(ul6);
			li17 = claim_element(ul6_nodes, "LI", {});
			var li17_nodes = children(li17);
			code2 = claim_element(li17_nodes, "CODE", {});
			var code2_nodes = children(code2);
			t31 = claim_text(code2_nodes, "on:");
			code2_nodes.forEach(detach);
			t32 = claim_text(li17_nodes, " for event handlers");
			li17_nodes.forEach(detach);
			t33 = claim_space(ul6_nodes);
			li18 = claim_element(ul6_nodes, "LI", {});
			var li18_nodes = children(li18);
			code3 = claim_element(li18_nodes, "CODE", {});
			var code3_nodes = children(code3);
			t34 = claim_text(code3_nodes, "bind:");
			code3_nodes.forEach(detach);
			t35 = claim_text(li18_nodes, " for bindings");
			li18_nodes.forEach(detach);
			t36 = claim_space(ul6_nodes);
			li19 = claim_element(ul6_nodes, "LI", {});
			var li19_nodes = children(li19);
			code4 = claim_element(li19_nodes, "CODE", {});
			var code4_nodes = children(code4);
			t37 = claim_text(code4_nodes, "use:");
			code4_nodes.forEach(detach);
			t38 = claim_text(li19_nodes, " for actions");
			li19_nodes.forEach(detach);
			ul6_nodes.forEach(detach);
			t39 = claim_space(nodes);
			p3 = claim_element(nodes, "P", {});
			var p3_nodes = children(p3);
			t40 = claim_text(p3_nodes, "To make sure we are on the same page, let's first explain how these 3 directives work.");
			p3_nodes.forEach(detach);
			t41 = claim_space(nodes);
			section1 = claim_element(nodes, "SECTION", {});
			var section1_nodes = children(section1);
			h20 = claim_element(section1_nodes, "H2", {});
			var h20_nodes = children(h20);
			a19 = claim_element(h20_nodes, "A", { href: true, id: true });
			var a19_nodes = children(a19);
			t42 = claim_text(a19_nodes, "The ");
			code5 = claim_element(a19_nodes, "CODE", {});
			var code5_nodes = children(code5);
			t43 = claim_text(code5_nodes, "on:");
			code5_nodes.forEach(detach);
			t44 = claim_text(a19_nodes, ", ");
			code6 = claim_element(a19_nodes, "CODE", {});
			var code6_nodes = children(code6);
			t45 = claim_text(code6_nodes, "bind:");
			code6_nodes.forEach(detach);
			t46 = claim_text(a19_nodes, " and ");
			code7 = claim_element(a19_nodes, "CODE", {});
			var code7_nodes = children(code7);
			t47 = claim_text(code7_nodes, "use:");
			code7_nodes.forEach(detach);
			a19_nodes.forEach(detach);
			h20_nodes.forEach(detach);
			section1_nodes.forEach(detach);
			t48 = claim_space(nodes);
			section2 = claim_element(nodes, "SECTION", {});
			var section2_nodes = children(section2);
			h30 = claim_element(section2_nodes, "H3", {});
			var h30_nodes = children(h30);
			a20 = claim_element(h30_nodes, "A", { href: true, id: true });
			var a20_nodes = children(a20);
			code8 = claim_element(a20_nodes, "CODE", {});
			var code8_nodes = children(code8);
			t49 = claim_text(code8_nodes, "on:");
			code8_nodes.forEach(detach);
			t50 = claim_text(a20_nodes, " event handlers");
			a20_nodes.forEach(detach);
			h30_nodes.forEach(detach);
			t51 = claim_space(section2_nodes);
			p4 = claim_element(section2_nodes, "P", {});
			var p4_nodes = children(p4);
			t52 = claim_text(p4_nodes, "You can use the ");
			code9 = claim_element(p4_nodes, "CODE", {});
			var code9_nodes = children(code9);
			t53 = claim_text(code9_nodes, "on:");
			code9_nodes.forEach(detach);
			t54 = claim_text(p4_nodes, " directive to listen to any event on an element:");
			p4_nodes.forEach(detach);
			t55 = claim_space(section2_nodes);
			pre0 = claim_element(section2_nodes, "PRE", { class: true });
			var pre0_nodes = children(pre0);
			pre0_nodes.forEach(detach);
			section2_nodes.forEach(detach);
			t56 = claim_space(nodes);
			section3 = claim_element(nodes, "SECTION", {});
			var section3_nodes = children(section3);
			h31 = claim_element(section3_nodes, "H3", {});
			var h31_nodes = children(h31);
			a21 = claim_element(h31_nodes, "A", { href: true, id: true });
			var a21_nodes = children(a21);
			code10 = claim_element(a21_nodes, "CODE", {});
			var code10_nodes = children(code10);
			t57 = claim_text(code10_nodes, "bind:");
			code10_nodes.forEach(detach);
			t58 = claim_text(a21_nodes, " bindings");
			a21_nodes.forEach(detach);
			h31_nodes.forEach(detach);
			t59 = claim_space(section3_nodes);
			p5 = claim_element(section3_nodes, "P", {});
			var p5_nodes = children(p5);
			t60 = claim_text(p5_nodes, "The ");
			code11 = claim_element(p5_nodes, "CODE", {});
			var code11_nodes = children(code11);
			t61 = claim_text(code11_nodes, "bind:");
			code11_nodes.forEach(detach);
			t62 = claim_text(p5_nodes, " directive allows you to bind a variable to a property of an element.");
			p5_nodes.forEach(detach);
			t63 = claim_space(section3_nodes);
			p6 = claim_element(section3_nodes, "P", {});
			var p6_nodes = children(p6);
			t64 = claim_text(p6_nodes, "Updating the variable will modifying the property of the element, conversely, modifying the property of the element via interacting with the element will, in turn, update the variable.");
			p6_nodes.forEach(detach);
			t65 = claim_space(section3_nodes);
			pre1 = claim_element(section3_nodes, "PRE", { class: true });
			var pre1_nodes = children(pre1);
			pre1_nodes.forEach(detach);
			section3_nodes.forEach(detach);
			t66 = claim_space(nodes);
			section4 = claim_element(nodes, "SECTION", {});
			var section4_nodes = children(section4);
			h32 = claim_element(section4_nodes, "H3", {});
			var h32_nodes = children(h32);
			a22 = claim_element(h32_nodes, "A", { href: true, id: true });
			var a22_nodes = children(a22);
			code12 = claim_element(a22_nodes, "CODE", {});
			var code12_nodes = children(code12);
			t67 = claim_text(code12_nodes, "use:");
			code12_nodes.forEach(detach);
			t68 = claim_text(a22_nodes, " actions");
			a22_nodes.forEach(detach);
			h32_nodes.forEach(detach);
			t69 = claim_space(section4_nodes);
			p7 = claim_element(section4_nodes, "P", {});
			var p7_nodes = children(p7);
			t70 = claim_text(p7_nodes, "The ");
			code13 = claim_element(p7_nodes, "CODE", {});
			var code13_nodes = children(code13);
			t71 = claim_text(code13_nodes, "use:");
			code13_nodes.forEach(detach);
			t72 = claim_text(p7_nodes, " directive is called ");
			strong1 = claim_element(p7_nodes, "STRONG", {});
			var strong1_nodes = children(strong1);
			a23 = claim_element(strong1_nodes, "A", { href: true, rel: true });
			var a23_nodes = children(a23);
			t73 = claim_text(a23_nodes, "\"Action\"");
			a23_nodes.forEach(detach);
			strong1_nodes.forEach(detach);
			t74 = claim_text(p7_nodes, ". It provides you an interface to enhance your element.");
			p7_nodes.forEach(detach);
			t75 = claim_space(section4_nodes);
			p8 = claim_element(section4_nodes, "P", {});
			var p8_nodes = children(p8);
			t76 = claim_text(p8_nodes, "You pass a function to the ");
			code14 = claim_element(p8_nodes, "CODE", {});
			var code14_nodes = children(code14);
			t77 = claim_text(code14_nodes, "use:");
			code14_nodes.forEach(detach);
			t78 = claim_text(p8_nodes, " directive of an element and the function will be called when your element is mounted.");
			p8_nodes.forEach(detach);
			t79 = claim_space(section4_nodes);
			p9 = claim_element(section4_nodes, "P", {});
			var p9_nodes = children(p9);
			t80 = claim_text(p9_nodes, "The function should return an object in which the ");
			code15 = claim_element(p9_nodes, "CODE", {});
			var code15_nodes = children(code15);
			t81 = claim_text(code15_nodes, "destroy");
			code15_nodes.forEach(detach);
			t82 = claim_text(p9_nodes, " method of the object will be called when the element is unmounted.");
			p9_nodes.forEach(detach);
			t83 = claim_space(section4_nodes);
			pre2 = claim_element(section4_nodes, "PRE", { class: true });
			var pre2_nodes = children(pre2);
			pre2_nodes.forEach(detach);
			t84 = claim_space(section4_nodes);
			p10 = claim_element(section4_nodes, "P", {});
			var p10_nodes = children(p10);
			t85 = claim_text(p10_nodes, "This is useful when you want to interface with 3rd-party libraries:");
			p10_nodes.forEach(detach);
			t86 = claim_space(section4_nodes);
			pre3 = claim_element(section4_nodes, "PRE", { class: true });
			var pre3_nodes = children(pre3);
			pre3_nodes.forEach(detach);
			t87 = claim_space(section4_nodes);
			p11 = claim_element(section4_nodes, "P", {});
			var p11_nodes = children(p11);
			t88 = claim_text(p11_nodes, "You can pass in parameters to the ");
			code16 = claim_element(p11_nodes, "CODE", {});
			var code16_nodes = children(code16);
			t89 = claim_text(code16_nodes, "use:");
			code16_nodes.forEach(detach);
			t90 = claim_text(p11_nodes, " directive, to bring in reactivity into your actions");
			p11_nodes.forEach(detach);
			t91 = claim_space(section4_nodes);
			pre4 = claim_element(section4_nodes, "PRE", { class: true });
			var pre4_nodes = children(pre4);
			pre4_nodes.forEach(detach);
			t92 = claim_space(section4_nodes);
			p12 = claim_element(section4_nodes, "P", {});
			var p12_nodes = children(p12);
			t93 = claim_text(p12_nodes, "You can visit Svelte's interactive tutorial to learn more about:");
			p12_nodes.forEach(detach);
			t94 = claim_space(section4_nodes);
			ul7 = claim_element(section4_nodes, "UL", {});
			var ul7_nodes = children(ul7);
			li20 = claim_element(ul7_nodes, "LI", {});
			var li20_nodes = children(li20);
			a24 = claim_element(li20_nodes, "A", { href: true, rel: true });
			var a24_nodes = children(a24);
			t95 = claim_text(a24_nodes, "event handlers with ");
			code17 = claim_element(a24_nodes, "CODE", {});
			var code17_nodes = children(code17);
			t96 = claim_text(code17_nodes, "on:");
			code17_nodes.forEach(detach);
			a24_nodes.forEach(detach);
			li20_nodes.forEach(detach);
			t97 = claim_space(ul7_nodes);
			li21 = claim_element(ul7_nodes, "LI", {});
			var li21_nodes = children(li21);
			a25 = claim_element(li21_nodes, "A", { href: true, rel: true });
			var a25_nodes = children(a25);
			t98 = claim_text(a25_nodes, "bindings with ");
			code18 = claim_element(a25_nodes, "CODE", {});
			var code18_nodes = children(code18);
			t99 = claim_text(code18_nodes, "bind:");
			code18_nodes.forEach(detach);
			a25_nodes.forEach(detach);
			li21_nodes.forEach(detach);
			t100 = claim_space(ul7_nodes);
			li22 = claim_element(ul7_nodes, "LI", {});
			var li22_nodes = children(li22);
			a26 = claim_element(li22_nodes, "A", { href: true, rel: true });
			var a26_nodes = children(a26);
			t101 = claim_text(a26_nodes, "actions with ");
			code19 = claim_element(a26_nodes, "CODE", {});
			var code19_nodes = children(code19);
			t102 = claim_text(code19_nodes, "use:");
			code19_nodes.forEach(detach);
			a26_nodes.forEach(detach);
			li22_nodes.forEach(detach);
			ul7_nodes.forEach(detach);
			section4_nodes.forEach(detach);
			t103 = claim_space(nodes);
			section5 = claim_element(nodes, "SECTION", {});
			var section5_nodes = children(section5);
			h21 = claim_element(section5_nodes, "H2", {});
			var h21_nodes = children(h21);
			a27 = claim_element(h21_nodes, "A", { href: true, id: true });
			var a27_nodes = children(a27);
			t104 = claim_text(a27_nodes, "The Vanilla JS");
			a27_nodes.forEach(detach);
			h21_nodes.forEach(detach);
			t105 = claim_space(section5_nodes);
			p13 = claim_element(section5_nodes, "P", {});
			var p13_nodes = children(p13);
			t106 = claim_text(p13_nodes, "Now, let's refresh ourselves with how we can implement an event handler, bindings, and actions without using any framework.");
			p13_nodes.forEach(detach);
			section5_nodes.forEach(detach);
			t107 = claim_space(nodes);
			section6 = claim_element(nodes, "SECTION", {});
			var section6_nodes = children(section6);
			h33 = claim_element(section6_nodes, "H3", {});
			var h33_nodes = children(h33);
			a28 = claim_element(h33_nodes, "A", { href: true, id: true });
			var a28_nodes = children(a28);
			t108 = claim_text(a28_nodes, "Event handler");
			a28_nodes.forEach(detach);
			h33_nodes.forEach(detach);
			t109 = claim_space(section6_nodes);
			p14 = claim_element(section6_nodes, "P", {});
			var p14_nodes = children(p14);
			t110 = claim_text(p14_nodes, "As ");
			a29 = claim_element(p14_nodes, "A", { href: true });
			var a29_nodes = children(a29);
			t111 = claim_text(a29_nodes, "mentioned in the Part 1 of the series");
			a29_nodes.forEach(detach);
			t112 = claim_text(p14_nodes, ", we can use ");
			a30 = claim_element(p14_nodes, "A", { href: true, rel: true });
			var a30_nodes = children(a30);
			t113 = claim_text(a30_nodes, "element.addEventListener");
			a30_nodes.forEach(detach);
			t114 = claim_text(p14_nodes, " to listen to events.");
			p14_nodes.forEach(detach);
			t115 = claim_space(section6_nodes);
			pre5 = claim_element(section6_nodes, "PRE", { class: true });
			var pre5_nodes = children(pre5);
			pre5_nodes.forEach(detach);
			t116 = claim_space(section6_nodes);
			p15 = claim_element(section6_nodes, "P", {});
			var p15_nodes = children(p15);
			t117 = claim_text(p15_nodes, "The event listener takes in an optional 3rd argument, which allows you to specifies the characteristics of the event handler:");
			p15_nodes.forEach(detach);
			t118 = claim_space(section6_nodes);
			pre6 = claim_element(section6_nodes, "PRE", { class: true });
			var pre6_nodes = children(pre6);
			pre6_nodes.forEach(detach);
			section6_nodes.forEach(detach);
			t119 = claim_space(nodes);
			section7 = claim_element(nodes, "SECTION", {});
			var section7_nodes = children(section7);
			h40 = claim_element(section7_nodes, "H4", {});
			var h40_nodes = children(h40);
			a31 = claim_element(h40_nodes, "A", { href: true, id: true });
			var a31_nodes = children(a31);
			t120 = claim_text(a31_nodes, "event.preventDefault");
			a31_nodes.forEach(detach);
			h40_nodes.forEach(detach);
			t121 = claim_space(section7_nodes);
			p16 = claim_element(section7_nodes, "P", {});
			var p16_nodes = children(p16);
			a32 = claim_element(p16_nodes, "A", { href: true, rel: true });
			var a32_nodes = children(a32);
			t122 = claim_text(a32_nodes, "event.preventDefault");
			a32_nodes.forEach(detach);
			t123 = claim_text(p16_nodes, " allows you to prevent the default behavior of the event, for example submitting form for ");
			code20 = claim_element(p16_nodes, "CODE", {});
			var code20_nodes = children(code20);
			t124 = claim_text(code20_nodes, "<button type=\"submit\" />");
			code20_nodes.forEach(detach);
			t125 = claim_text(p16_nodes, " or navigating to the target for ");
			code21 = claim_element(p16_nodes, "CODE", {});
			var code21_nodes = children(code21);
			t126 = claim_text(code21_nodes, "<a href=\"...\">");
			code21_nodes.forEach(detach);
			t127 = claim_text(p16_nodes, ".");
			p16_nodes.forEach(detach);
			t128 = claim_space(section7_nodes);
			pre7 = claim_element(section7_nodes, "PRE", { class: true });
			var pre7_nodes = children(pre7);
			pre7_nodes.forEach(detach);
			section7_nodes.forEach(detach);
			t129 = claim_space(nodes);
			section8 = claim_element(nodes, "SECTION", {});
			var section8_nodes = children(section8);
			h41 = claim_element(section8_nodes, "H4", {});
			var h41_nodes = children(h41);
			a33 = claim_element(h41_nodes, "A", { href: true, id: true });
			var a33_nodes = children(a33);
			t130 = claim_text(a33_nodes, "event.stopPropagation");
			a33_nodes.forEach(detach);
			h41_nodes.forEach(detach);
			t131 = claim_space(section8_nodes);
			p17 = claim_element(section8_nodes, "P", {});
			var p17_nodes = children(p17);
			a34 = claim_element(p17_nodes, "A", { href: true, rel: true });
			var a34_nodes = children(a34);
			t132 = claim_text(a34_nodes, "event.stopPropagation");
			a34_nodes.forEach(detach);
			t133 = claim_text(p17_nodes, " allows you to prevent event to continue propagate.");
			p17_nodes.forEach(detach);
			t134 = claim_space(section8_nodes);
			pre8 = claim_element(section8_nodes, "PRE", { class: true });
			var pre8_nodes = children(pre8);
			pre8_nodes.forEach(detach);
			t135 = claim_space(section8_nodes);
			p18 = claim_element(section8_nodes, "P", {});
			var p18_nodes = children(p18);
			t136 = claim_text(p18_nodes, "To remove the event listener, you need to call ");
			code22 = claim_element(p18_nodes, "CODE", {});
			var code22_nodes = children(code22);
			t137 = claim_text(code22_nodes, "element.removeEventListener");
			code22_nodes.forEach(detach);
			t138 = claim_text(p18_nodes, " with the same event ");
			code23 = claim_element(p18_nodes, "CODE", {});
			var code23_nodes = children(code23);
			t139 = claim_text(code23_nodes, "type");
			code23_nodes.forEach(detach);
			t140 = claim_text(p18_nodes, ", ");
			code24 = claim_element(p18_nodes, "CODE", {});
			var code24_nodes = children(code24);
			t141 = claim_text(code24_nodes, "listener");
			code24_nodes.forEach(detach);
			t142 = claim_text(p18_nodes, " and ");
			code25 = claim_element(p18_nodes, "CODE", {});
			var code25_nodes = children(code25);
			t143 = claim_text(code25_nodes, "capture");
			code25_nodes.forEach(detach);
			t144 = claim_text(p18_nodes, "/");
			code26 = claim_element(p18_nodes, "CODE", {});
			var code26_nodes = children(code26);
			t145 = claim_text(code26_nodes, "useCapture");
			code26_nodes.forEach(detach);
			t146 = claim_text(p18_nodes, " flag. You can check out the ");
			a35 = claim_element(p18_nodes, "A", { href: true, rel: true });
			var a35_nodes = children(a35);
			t147 = claim_text(a35_nodes, "MDN docs on \"Matching event listeners for removal\"");
			a35_nodes.forEach(detach);
			t148 = claim_text(p18_nodes, ".");
			p18_nodes.forEach(detach);
			t149 = claim_space(section8_nodes);
			pre9 = claim_element(section8_nodes, "PRE", { class: true });
			var pre9_nodes = children(pre9);
			pre9_nodes.forEach(detach);
			section8_nodes.forEach(detach);
			t150 = claim_space(nodes);
			section9 = claim_element(nodes, "SECTION", {});
			var section9_nodes = children(section9);
			h34 = claim_element(section9_nodes, "H3", {});
			var h34_nodes = children(h34);
			a36 = claim_element(h34_nodes, "A", { href: true, id: true });
			var a36_nodes = children(a36);
			t151 = claim_text(a36_nodes, "Bindings");
			a36_nodes.forEach(detach);
			h34_nodes.forEach(detach);
			t152 = claim_space(section9_nodes);
			p19 = claim_element(section9_nodes, "P", {});
			var p19_nodes = children(p19);
			t153 = claim_text(p19_nodes, "Binding is to synchronise between the value of a variable and a property of an element.");
			p19_nodes.forEach(detach);
			t154 = claim_space(section9_nodes);
			p20 = claim_element(section9_nodes, "P", {});
			var p20_nodes = children(p20);
			t155 = claim_text(p20_nodes, "To synchronise the variable to a property of an element, we need to observe the value of the variable. When it changes, apply it to the property of the element.");
			p20_nodes.forEach(detach);
			t156 = claim_space(section9_nodes);
			p21 = claim_element(section9_nodes, "P", {});
			var p21_nodes = children(p21);
			em0 = claim_element(p21_nodes, "EM", {});
			var em0_nodes = children(em0);
			t157 = claim_text(em0_nodes, "You can check out my previous article ");
			a37 = claim_element(em0_nodes, "A", { href: true });
			var a37_nodes = children(a37);
			t158 = claim_text(a37_nodes, "\"Reactivity in Web Frameworks\"");
			a37_nodes.forEach(detach);
			t159 = claim_text(em0_nodes, " on how we get notified when the value of a variable changed.");
			em0_nodes.forEach(detach);
			p21_nodes.forEach(detach);
			t160 = claim_space(section9_nodes);
			p22 = claim_element(section9_nodes, "P", {});
			var p22_nodes = children(p22);
			t161 = claim_text(p22_nodes, "On the other hand, to synchronise the property of an element to a variable, we ");
			strong2 = claim_element(p22_nodes, "STRONG", {});
			var strong2_nodes = children(strong2);
			t162 = claim_text(strong2_nodes, "listen to an event of the element");
			strong2_nodes.forEach(detach);
			t163 = claim_text(p22_nodes, ", depending on the property, and update the value of the variable when it happens.");
			p22_nodes.forEach(detach);
			t164 = claim_space(section9_nodes);
			pre10 = claim_element(section9_nodes, "PRE", { class: true });
			var pre10_nodes = children(pre10);
			pre10_nodes.forEach(detach);
			t165 = claim_space(section9_nodes);
			p23 = claim_element(section9_nodes, "P", {});
			var p23_nodes = children(p23);
			t166 = claim_text(p23_nodes, "Some observations:");
			p23_nodes.forEach(detach);
			t167 = claim_space(section9_nodes);
			p24 = claim_element(section9_nodes, "P", {});
			var p24_nodes = children(p24);
			strong3 = claim_element(p24_nodes, "STRONG", {});
			var strong3_nodes = children(strong3);
			t168 = claim_text(strong3_nodes, "- The name of the event and the property name of the element may not be the same.");
			strong3_nodes.forEach(detach);
			p24_nodes.forEach(detach);
			t169 = claim_space(section9_nodes);
			p25 = claim_element(section9_nodes, "P", {});
			var p25_nodes = children(p25);
			t170 = claim_text(p25_nodes, "In this example, we listen to ");
			code27 = claim_element(p25_nodes, "CODE", {});
			var code27_nodes = children(code27);
			t171 = claim_text(code27_nodes, "\"change\"");
			code27_nodes.forEach(detach);
			t172 = claim_text(p25_nodes, " event for the checkbox ");
			code28 = claim_element(p25_nodes, "CODE", {});
			var code28_nodes = children(code28);
			t173 = claim_text(code28_nodes, "checked");
			code28_nodes.forEach(detach);
			t174 = claim_text(p25_nodes, " property.");
			p25_nodes.forEach(detach);
			t175 = claim_space(section9_nodes);
			p26 = claim_element(section9_nodes, "P", {});
			var p26_nodes = children(p26);
			strong4 = claim_element(p26_nodes, "STRONG", {});
			var strong4_nodes = children(strong4);
			t176 = claim_text(strong4_nodes, "- It is almost impossible to bind a property of an element, if there's no event fired from the element to indicate the property has changed");
			strong4_nodes.forEach(detach);
			p26_nodes.forEach(detach);
			t177 = claim_space(section9_nodes);
			p27 = claim_element(section9_nodes, "P", {});
			var p27_nodes = children(p27);
			t178 = claim_text(p27_nodes, "A recent example I found out is the ");
			a38 = claim_element(p27_nodes, "A", { href: true, rel: true });
			var a38_nodes = children(a38);
			t179 = claim_text(a38_nodes, "HTMLDialogElement");
			a38_nodes.forEach(detach);
			t180 = claim_text(p27_nodes, ". It has ");
			a39 = claim_element(p27_nodes, "A", { href: true, rel: true });
			var a39_nodes = children(a39);
			code29 = claim_element(a39_nodes, "CODE", {});
			var code29_nodes = children(code29);
			t181 = claim_text(code29_nodes, "\"close\"");
			code29_nodes.forEach(detach);
			a39_nodes.forEach(detach);
			t182 = claim_text(p27_nodes, " but not ");
			code30 = claim_element(p27_nodes, "CODE", {});
			var code30_nodes = children(code30);
			t183 = claim_text(code30_nodes, "\"open\"");
			code30_nodes.forEach(detach);
			t184 = claim_text(p27_nodes, " event, which makes it hard to implement ");
			code31 = claim_element(p27_nodes, "CODE", {});
			var code31_nodes = children(code31);
			t185 = claim_text(code31_nodes, "bind:open");
			code31_nodes.forEach(detach);
			t186 = claim_text(p27_nodes, " on the dialog element.");
			p27_nodes.forEach(detach);
			t187 = claim_space(section9_nodes);
			p28 = claim_element(section9_nodes, "P", {});
			var p28_nodes = children(p28);
			t188 = claim_text(p28_nodes, "Maybe an alternative would be using ");
			a40 = claim_element(p28_nodes, "A", { href: true, rel: true });
			var a40_nodes = children(a40);
			t189 = claim_text(a40_nodes, "MutationObserver");
			a40_nodes.forEach(detach);
			t190 = claim_text(p28_nodes, ", which I haven't seen any usage of it in Svelte codebase yet.");
			p28_nodes.forEach(detach);
			section9_nodes.forEach(detach);
			t191 = claim_space(nodes);
			section10 = claim_element(nodes, "SECTION", {});
			var section10_nodes = children(section10);
			h35 = claim_element(section10_nodes, "H3", {});
			var h35_nodes = children(h35);
			a41 = claim_element(h35_nodes, "A", { href: true, id: true });
			var a41_nodes = children(a41);
			t192 = claim_text(a41_nodes, "Actions");
			a41_nodes.forEach(detach);
			h35_nodes.forEach(detach);
			t193 = claim_space(section10_nodes);
			p29 = claim_element(section10_nodes, "P", {});
			var p29_nodes = children(p29);
			t194 = claim_text(p29_nodes, "Action is a function that gets called when your element is created and mounted onto the DOM.");
			p29_nodes.forEach(detach);
			t195 = claim_space(section10_nodes);
			p30 = claim_element(section10_nodes, "P", {});
			var p30_nodes = children(p30);
			t196 = claim_text(p30_nodes, "The function returns an object, with 2 methods:");
			p30_nodes.forEach(detach);
			t197 = claim_space(section10_nodes);
			ul8 = claim_element(section10_nodes, "UL", {});
			var ul8_nodes = children(ul8);
			li23 = claim_element(ul8_nodes, "LI", {});
			var li23_nodes = children(li23);
			code32 = claim_element(li23_nodes, "CODE", {});
			var code32_nodes = children(code32);
			t198 = claim_text(code32_nodes, "update");
			code32_nodes.forEach(detach);
			t199 = claim_text(li23_nodes, ", which gets called when the parameters change");
			li23_nodes.forEach(detach);
			t200 = claim_space(ul8_nodes);
			li24 = claim_element(ul8_nodes, "LI", {});
			var li24_nodes = children(li24);
			code33 = claim_element(li24_nodes, "CODE", {});
			var code33_nodes = children(code33);
			t201 = claim_text(code33_nodes, "destroy");
			code33_nodes.forEach(detach);
			t202 = claim_text(li24_nodes, ", which gets called when the element is removed from the DOM");
			li24_nodes.forEach(detach);
			ul8_nodes.forEach(detach);
			t203 = claim_space(section10_nodes);
			pre11 = claim_element(section10_nodes, "PRE", { class: true });
			var pre11_nodes = children(pre11);
			pre11_nodes.forEach(detach);
			section10_nodes.forEach(detach);
			t204 = claim_space(nodes);
			section11 = claim_element(nodes, "SECTION", {});
			var section11_nodes = children(section11);
			h22 = claim_element(section11_nodes, "H2", {});
			var h22_nodes = children(h22);
			a42 = claim_element(h22_nodes, "A", { href: true, id: true });
			var a42_nodes = children(a42);
			t205 = claim_text(a42_nodes, "The Compiled JS");
			a42_nodes.forEach(detach);
			h22_nodes.forEach(detach);
			t206 = claim_space(section11_nodes);
			p31 = claim_element(section11_nodes, "P", {});
			var p31_nodes = children(p31);
			t207 = claim_text(p31_nodes, "Now let's take look at how Svelte compiles ");
			code34 = claim_element(p31_nodes, "CODE", {});
			var code34_nodes = children(code34);
			t208 = claim_text(code34_nodes, "on:");
			code34_nodes.forEach(detach);
			t209 = claim_text(p31_nodes, ", ");
			code35 = claim_element(p31_nodes, "CODE", {});
			var code35_nodes = children(code35);
			t210 = claim_text(code35_nodes, "bind:");
			code35_nodes.forEach(detach);
			t211 = claim_text(p31_nodes, " and ");
			code36 = claim_element(p31_nodes, "CODE", {});
			var code36_nodes = children(code36);
			t212 = claim_text(code36_nodes, "use:");
			code36_nodes.forEach(detach);
			t213 = claim_text(p31_nodes, " directives into output JavaScript.");
			p31_nodes.forEach(detach);
			section11_nodes.forEach(detach);
			t214 = claim_space(nodes);
			section12 = claim_element(nodes, "SECTION", {});
			var section12_nodes = children(section12);
			h36 = claim_element(section12_nodes, "H3", {});
			var h36_nodes = children(h36);
			a43 = claim_element(h36_nodes, "A", { href: true, id: true });
			var a43_nodes = children(a43);
			code37 = claim_element(a43_nodes, "CODE", {});
			var code37_nodes = children(code37);
			t215 = claim_text(code37_nodes, "on:");
			code37_nodes.forEach(detach);
			t216 = claim_text(a43_nodes, " directive");
			a43_nodes.forEach(detach);
			h36_nodes.forEach(detach);
			t217 = claim_space(section12_nodes);
			pre12 = claim_element(section12_nodes, "PRE", { class: true });
			var pre12_nodes = children(pre12);
			pre12_nodes.forEach(detach);
			t218 = claim_space(section12_nodes);
			p32 = claim_element(section12_nodes, "P", {});
			var p32_nodes = children(p32);
			a44 = claim_element(p32_nodes, "A", { href: true, rel: true });
			var a44_nodes = children(a44);
			t219 = claim_text(a44_nodes, "Svelte REPL");
			a44_nodes.forEach(detach);
			p32_nodes.forEach(detach);
			t220 = claim_space(section12_nodes);
			p33 = claim_element(section12_nodes, "P", {});
			var p33_nodes = children(p33);
			t221 = claim_text(p33_nodes, "The output code:");
			p33_nodes.forEach(detach);
			t222 = claim_space(section12_nodes);
			pre13 = claim_element(section12_nodes, "PRE", { class: true });
			var pre13_nodes = children(pre13);
			pre13_nodes.forEach(detach);
			t223 = claim_space(section12_nodes);
			p34 = claim_element(section12_nodes, "P", {});
			var p34_nodes = children(p34);
			t224 = claim_text(p34_nodes, "Some observations:");
			p34_nodes.forEach(detach);
			t225 = claim_space(section12_nodes);
			ul9 = claim_element(section12_nodes, "UL", {});
			var ul9_nodes = children(ul9);
			li25 = claim_element(ul9_nodes, "LI", {});
			var li25_nodes = children(li25);
			t226 = claim_text(li25_nodes, "Svelte adds event handler, ");
			code38 = claim_element(li25_nodes, "CODE", {});
			var code38_nodes = children(code38);
			t227 = claim_text(code38_nodes, "listen(...)");
			code38_nodes.forEach(detach);
			t228 = claim_text(li25_nodes, ", in the ");
			strong5 = claim_element(li25_nodes, "STRONG", {});
			var strong5_nodes = children(strong5);
			t229 = claim_text(strong5_nodes, "_m_ount");
			strong5_nodes.forEach(detach);
			t230 = claim_text(li25_nodes, " method.");
			li25_nodes.forEach(detach);
			t231 = claim_space(ul9_nodes);
			li26 = claim_element(ul9_nodes, "LI", {});
			var li26_nodes = children(li26);
			t232 = claim_text(li26_nodes, "Svelte removes event handler, ");
			code39 = claim_element(li26_nodes, "CODE", {});
			var code39_nodes = children(code39);
			t233 = claim_text(code39_nodes, "dispose()");
			code39_nodes.forEach(detach);
			t234 = claim_text(li26_nodes, ", in the ");
			strong6 = claim_element(li26_nodes, "STRONG", {});
			var strong6_nodes = children(strong6);
			t235 = claim_text(strong6_nodes, "_d_estroy");
			strong6_nodes.forEach(detach);
			t236 = claim_text(li26_nodes, " method.");
			li26_nodes.forEach(detach);
			ul9_nodes.forEach(detach);
			t237 = claim_space(section12_nodes);
			p35 = claim_element(section12_nodes, "P", {});
			var p35_nodes = children(p35);
			t238 = claim_text(p35_nodes, "As pointed out in ");
			a45 = claim_element(p35_nodes, "A", { href: true, rel: true });
			var a45_nodes = children(a45);
			t239 = claim_text(a45_nodes, "Part 1 #listen and dispose");
			a45_nodes.forEach(detach);
			t240 = claim_text(p35_nodes, ", to optimise for minification, the ");
			code40 = claim_element(p35_nodes, "CODE", {});
			var code40_nodes = children(code40);
			t241 = claim_text(code40_nodes, "dispose");
			code40_nodes.forEach(detach);
			t242 = claim_text(p35_nodes, " variable could be a function or an array of functions, depending on having one or many event handlers.");
			p35_nodes.forEach(detach);
			t243 = claim_space(section12_nodes);
			p36 = claim_element(section12_nodes, "P", {});
			var p36_nodes = children(p36);
			t244 = claim_text(p36_nodes, "We will discuss ");
			code41 = claim_element(p36_nodes, "CODE", {});
			var code41_nodes = children(code41);
			t245 = claim_text(code41_nodes, "remount");
			code41_nodes.forEach(detach);
			t246 = claim_text(p36_nodes, " in the future, as it is related to remounting elements while reordering items within each block.");
			p36_nodes.forEach(detach);
			section12_nodes.forEach(detach);
			t247 = claim_space(nodes);
			section13 = claim_element(nodes, "SECTION", {});
			var section13_nodes = children(section13);
			h42 = claim_element(section13_nodes, "H4", {});
			var h42_nodes = children(h42);
			a46 = claim_element(h42_nodes, "A", { href: true, id: true });
			var a46_nodes = children(a46);
			t248 = claim_text(a46_nodes, "Event modifiers");
			a46_nodes.forEach(detach);
			h42_nodes.forEach(detach);
			t249 = claim_space(section13_nodes);
			p37 = claim_element(section13_nodes, "P", {});
			var p37_nodes = children(p37);
			t250 = claim_text(p37_nodes, "Event handlers can have modifiers that alter their behavior.");
			p37_nodes.forEach(detach);
			t251 = claim_space(section13_nodes);
			pre14 = claim_element(section13_nodes, "PRE", { class: true });
			var pre14_nodes = children(pre14);
			pre14_nodes.forEach(detach);
			t252 = claim_space(section13_nodes);
			p38 = claim_element(section13_nodes, "P", {});
			var p38_nodes = children(p38);
			a47 = claim_element(p38_nodes, "A", { href: true, rel: true });
			var a47_nodes = children(a47);
			t253 = claim_text(a47_nodes, "Svelte REPL");
			a47_nodes.forEach(detach);
			p38_nodes.forEach(detach);
			t254 = claim_space(section13_nodes);
			p39 = claim_element(section13_nodes, "P", {});
			var p39_nodes = children(p39);
			t255 = claim_text(p39_nodes, "The output code:");
			p39_nodes.forEach(detach);
			t256 = claim_space(section13_nodes);
			pre15 = claim_element(section13_nodes, "PRE", { class: true });
			var pre15_nodes = children(pre15);
			pre15_nodes.forEach(detach);
			t257 = claim_space(section13_nodes);
			p40 = claim_element(section13_nodes, "P", {});
			var p40_nodes = children(p40);
			t258 = claim_text(p40_nodes, "Some observations:");
			p40_nodes.forEach(detach);
			t259 = claim_space(section13_nodes);
			ul10 = claim_element(section13_nodes, "UL", {});
			var ul10_nodes = children(ul10);
			li27 = claim_element(ul10_nodes, "LI", {});
			var li27_nodes = children(li27);
			t260 = claim_text(li27_nodes, "Svelte handles different modifiers differently.");
			li27_nodes.forEach(detach);
			t261 = claim_space(ul10_nodes);
			li28 = claim_element(ul10_nodes, "LI", {});
			var li28_nodes = children(li28);
			t262 = claim_text(li28_nodes, "For ");
			code42 = claim_element(li28_nodes, "CODE", {});
			var code42_nodes = children(code42);
			t263 = claim_text(code42_nodes, "capture");
			code42_nodes.forEach(detach);
			t264 = claim_text(li28_nodes, ", ");
			code43 = claim_element(li28_nodes, "CODE", {});
			var code43_nodes = children(code43);
			t265 = claim_text(code43_nodes, "once");
			code43_nodes.forEach(detach);
			t266 = claim_text(li28_nodes, ", and ");
			code44 = claim_element(li28_nodes, "CODE", {});
			var code44_nodes = children(code44);
			t267 = claim_text(code44_nodes, "passive");
			code44_nodes.forEach(detach);
			t268 = claim_text(li28_nodes, " modifiers, which they are part of the options for ");
			a48 = claim_element(li28_nodes, "A", { href: true, rel: true });
			var a48_nodes = children(a48);
			t269 = claim_text(a48_nodes, "element.addEventListener");
			a48_nodes.forEach(detach);
			t270 = claim_text(li28_nodes, ", they will be passed as options into the ");
			code45 = claim_element(li28_nodes, "CODE", {});
			var code45_nodes = children(code45);
			t271 = claim_text(code45_nodes, "listen");
			code45_nodes.forEach(detach);
			t272 = claim_text(li28_nodes, " function.");
			li28_nodes.forEach(detach);
			t273 = claim_space(ul10_nodes);
			li29 = claim_element(ul10_nodes, "LI", {});
			var li29_nodes = children(li29);
			t274 = claim_text(li29_nodes, "For ");
			code46 = claim_element(li29_nodes, "CODE", {});
			var code46_nodes = children(code46);
			t275 = claim_text(code46_nodes, "stopPropagation");
			code46_nodes.forEach(detach);
			t276 = claim_text(li29_nodes, ", ");
			code47 = claim_element(li29_nodes, "CODE", {});
			var code47_nodes = children(code47);
			t277 = claim_text(code47_nodes, "preventDefault");
			code47_nodes.forEach(detach);
			t278 = claim_text(li29_nodes, ", and ");
			code48 = claim_element(li29_nodes, "CODE", {});
			var code48_nodes = children(code48);
			t279 = claim_text(code48_nodes, "self");
			code48_nodes.forEach(detach);
			t280 = claim_text(li29_nodes, " modifiers, the event handler is decorated with respective decorator functions.");
			li29_nodes.forEach(detach);
			ul10_nodes.forEach(detach);
			t281 = claim_space(section13_nodes);
			p41 = claim_element(section13_nodes, "P", {});
			var p41_nodes = children(p41);
			t282 = claim_text(p41_nodes, "An example implementation of the ");
			code49 = claim_element(p41_nodes, "CODE", {});
			var code49_nodes = children(code49);
			t283 = claim_text(code49_nodes, "prevent_default");
			code49_nodes.forEach(detach);
			t284 = claim_text(p41_nodes, " decorator function:");
			p41_nodes.forEach(detach);
			t285 = claim_space(section13_nodes);
			pre16 = claim_element(section13_nodes, "PRE", { class: true });
			var pre16_nodes = children(pre16);
			pre16_nodes.forEach(detach);
			section13_nodes.forEach(detach);
			t286 = claim_space(nodes);
			section14 = claim_element(nodes, "SECTION", {});
			var section14_nodes = children(section14);
			h37 = claim_element(section14_nodes, "H3", {});
			var h37_nodes = children(h37);
			a49 = claim_element(h37_nodes, "A", { href: true, id: true });
			var a49_nodes = children(a49);
			code50 = claim_element(a49_nodes, "CODE", {});
			var code50_nodes = children(code50);
			t287 = claim_text(code50_nodes, "bind:");
			code50_nodes.forEach(detach);
			t288 = claim_text(a49_nodes, " directive");
			a49_nodes.forEach(detach);
			h37_nodes.forEach(detach);
			t289 = claim_space(section14_nodes);
			pre17 = claim_element(section14_nodes, "PRE", { class: true });
			var pre17_nodes = children(pre17);
			pre17_nodes.forEach(detach);
			t290 = claim_space(section14_nodes);
			p42 = claim_element(section14_nodes, "P", {});
			var p42_nodes = children(p42);
			a50 = claim_element(p42_nodes, "A", { href: true, rel: true });
			var a50_nodes = children(a50);
			t291 = claim_text(a50_nodes, "Svelte REPL");
			a50_nodes.forEach(detach);
			p42_nodes.forEach(detach);
			t292 = claim_space(section14_nodes);
			p43 = claim_element(section14_nodes, "P", {});
			var p43_nodes = children(p43);
			t293 = claim_text(p43_nodes, "The output code:");
			p43_nodes.forEach(detach);
			t294 = claim_space(section14_nodes);
			pre18 = claim_element(section14_nodes, "PRE", { class: true });
			var pre18_nodes = children(pre18);
			pre18_nodes.forEach(detach);
			t295 = claim_space(section14_nodes);
			p44 = claim_element(section14_nodes, "P", {});
			var p44_nodes = children(p44);
			t296 = claim_text(p44_nodes, "Some observations:");
			p44_nodes.forEach(detach);
			t297 = claim_space(section14_nodes);
			ul13 = claim_element(section14_nodes, "UL", {});
			var ul13_nodes = children(ul13);
			li32 = claim_element(ul13_nodes, "LI", {});
			var li32_nodes = children(li32);
			t298 = claim_text(li32_nodes, "To synchronise the value of the variable to the property of the element:");
			ul11 = claim_element(li32_nodes, "UL", {});
			var ul11_nodes = children(ul11);
			li30 = claim_element(ul11_nodes, "LI", {});
			var li30_nodes = children(li30);
			t299 = claim_text(li30_nodes, "Svelte wraps the update of the variable ");
			code51 = claim_element(li30_nodes, "CODE", {});
			var code51_nodes = children(code51);
			t300 = claim_text(code51_nodes, "checked");
			code51_nodes.forEach(detach);
			t301 = claim_text(li30_nodes, " with ");
			code52 = claim_element(li30_nodes, "CODE", {});
			var code52_nodes = children(code52);
			t302 = claim_text(code52_nodes, "$$invalidate(...)");
			code52_nodes.forEach(detach);
			li30_nodes.forEach(detach);
			t303 = claim_space(ul11_nodes);
			li31 = claim_element(ul11_nodes, "LI", {});
			var li31_nodes = children(li31);
			t304 = claim_text(li31_nodes, "In the ");
			strong7 = claim_element(li31_nodes, "STRONG", {});
			var strong7_nodes = children(strong7);
			t305 = claim_text(strong7_nodes, "u_p_date");
			strong7_nodes.forEach(detach);
			t306 = claim_text(li31_nodes, " method, if the variable ");
			code53 = claim_element(li31_nodes, "CODE", {});
			var code53_nodes = children(code53);
			t307 = claim_text(code53_nodes, "checked");
			code53_nodes.forEach(detach);
			t308 = claim_text(li31_nodes, " is updated, Svelte sets ");
			code54 = claim_element(li31_nodes, "CODE", {});
			var code54_nodes = children(code54);
			t309 = claim_text(code54_nodes, "input.checked");
			code54_nodes.forEach(detach);
			t310 = claim_text(li31_nodes, " to the value of the variable ");
			code55 = claim_element(li31_nodes, "CODE", {});
			var code55_nodes = children(code55);
			t311 = claim_text(code55_nodes, "checked");
			code55_nodes.forEach(detach);
			t312 = claim_text(li31_nodes, ".");
			li31_nodes.forEach(detach);
			ul11_nodes.forEach(detach);
			li32_nodes.forEach(detach);
			t313 = claim_space(ul13_nodes);
			li35 = claim_element(ul13_nodes, "LI", {});
			var li35_nodes = children(li35);
			t314 = claim_text(li35_nodes, "To syncrhonise the property of the element to the variable");
			ul12 = claim_element(li35_nodes, "UL", {});
			var ul12_nodes = children(ul12);
			li33 = claim_element(ul12_nodes, "LI", {});
			var li33_nodes = children(li33);
			t315 = claim_text(li33_nodes, "Svelte creates an input handler that reads the ");
			code56 = claim_element(li33_nodes, "CODE", {});
			var code56_nodes = children(code56);
			t316 = claim_text(code56_nodes, "this.checked");
			code56_nodes.forEach(detach);
			t317 = claim_text(li33_nodes, " property of the input and calls ");
			code57 = claim_element(li33_nodes, "CODE", {});
			var code57_nodes = children(code57);
			t318 = claim_text(code57_nodes, "$$invalidate(...)");
			code57_nodes.forEach(detach);
			t319 = claim_text(li33_nodes, " to update it.");
			li33_nodes.forEach(detach);
			t320 = claim_space(ul12_nodes);
			li34 = claim_element(ul12_nodes, "LI", {});
			var li34_nodes = children(li34);
			t321 = claim_text(li34_nodes, "Svelte sets up ");
			code58 = claim_element(li34_nodes, "CODE", {});
			var code58_nodes = children(code58);
			t322 = claim_text(code58_nodes, "listen(...)");
			code58_nodes.forEach(detach);
			t323 = claim_text(li34_nodes, " in the ");
			strong8 = claim_element(li34_nodes, "STRONG", {});
			var strong8_nodes = children(strong8);
			t324 = claim_text(strong8_nodes, "_m_ount");
			strong8_nodes.forEach(detach);
			t325 = claim_text(li34_nodes, " method and ");
			code59 = claim_element(li34_nodes, "CODE", {});
			var code59_nodes = children(code59);
			t326 = claim_text(code59_nodes, "dispose(...)");
			code59_nodes.forEach(detach);
			t327 = claim_text(li34_nodes, " in the ");
			strong9 = claim_element(li34_nodes, "STRONG", {});
			var strong9_nodes = children(strong9);
			t328 = claim_text(strong9_nodes, "_d_estroy");
			strong9_nodes.forEach(detach);
			t329 = claim_text(li34_nodes, " method for the input handler");
			li34_nodes.forEach(detach);
			ul12_nodes.forEach(detach);
			li35_nodes.forEach(detach);
			ul13_nodes.forEach(detach);
			section14_nodes.forEach(detach);
			t330 = claim_space(nodes);
			section15 = claim_element(nodes, "SECTION", {});
			var section15_nodes = children(section15);
			h38 = claim_element(section15_nodes, "H3", {});
			var h38_nodes = children(h38);
			a51 = claim_element(h38_nodes, "A", { href: true, id: true });
			var a51_nodes = children(a51);
			code60 = claim_element(a51_nodes, "CODE", {});
			var code60_nodes = children(code60);
			t331 = claim_text(code60_nodes, "use:");
			code60_nodes.forEach(detach);
			t332 = claim_text(a51_nodes, " directive");
			a51_nodes.forEach(detach);
			h38_nodes.forEach(detach);
			t333 = claim_space(section15_nodes);
			pre19 = claim_element(section15_nodes, "PRE", { class: true });
			var pre19_nodes = children(pre19);
			pre19_nodes.forEach(detach);
			t334 = claim_space(section15_nodes);
			p45 = claim_element(section15_nodes, "P", {});
			var p45_nodes = children(p45);
			a52 = claim_element(p45_nodes, "A", { href: true, rel: true });
			var a52_nodes = children(a52);
			t335 = claim_text(a52_nodes, "Svelte REPL");
			a52_nodes.forEach(detach);
			p45_nodes.forEach(detach);
			t336 = claim_space(section15_nodes);
			p46 = claim_element(section15_nodes, "P", {});
			var p46_nodes = children(p46);
			t337 = claim_text(p46_nodes, "The output code:");
			p46_nodes.forEach(detach);
			t338 = claim_space(section15_nodes);
			pre20 = claim_element(section15_nodes, "PRE", { class: true });
			var pre20_nodes = children(pre20);
			pre20_nodes.forEach(detach);
			t339 = claim_space(section15_nodes);
			p47 = claim_element(section15_nodes, "P", {});
			var p47_nodes = children(p47);
			t340 = claim_text(p47_nodes, "Some observations:");
			p47_nodes.forEach(detach);
			t341 = claim_space(section15_nodes);
			ul14 = claim_element(section15_nodes, "UL", {});
			var ul14_nodes = children(ul14);
			li36 = claim_element(ul14_nodes, "LI", {});
			var li36_nodes = children(li36);
			t342 = claim_text(li36_nodes, "Creating ");
			code61 = claim_element(li36_nodes, "CODE", {});
			var code61_nodes = children(code61);
			t343 = claim_text(code61_nodes, "action_action");
			code61_nodes.forEach(detach);
			t344 = claim_text(li36_nodes, " object by calling the ");
			code62 = claim_element(li36_nodes, "CODE", {});
			var code62_nodes = children(code62);
			t345 = claim_text(code62_nodes, "action");
			code62_nodes.forEach(detach);
			t346 = claim_text(li36_nodes, " function in the ");
			strong10 = claim_element(li36_nodes, "STRONG", {});
			var strong10_nodes = children(strong10);
			t347 = claim_text(strong10_nodes, "_m_out");
			strong10_nodes.forEach(detach);
			t348 = claim_text(li36_nodes, " method");
			li36_nodes.forEach(detach);
			t349 = claim_space(ul14_nodes);
			li37 = claim_element(ul14_nodes, "LI", {});
			var li37_nodes = children(li37);
			t350 = claim_text(li37_nodes, "When the paramter change, call the ");
			code63 = claim_element(li37_nodes, "CODE", {});
			var code63_nodes = children(code63);
			t351 = claim_text(code63_nodes, "action_action.update");
			code63_nodes.forEach(detach);
			t352 = claim_text(li37_nodes, " method with the updated parameter in the ");
			strong11 = claim_element(li37_nodes, "STRONG", {});
			var strong11_nodes = children(strong11);
			t353 = claim_text(strong11_nodes, "u_p_date");
			strong11_nodes.forEach(detach);
			t354 = claim_text(li37_nodes, " method");
			li37_nodes.forEach(detach);
			t355 = claim_space(ul14_nodes);
			li38 = claim_element(ul14_nodes, "LI", {});
			var li38_nodes = children(li38);
			code64 = claim_element(li38_nodes, "CODE", {});
			var code64_nodes = children(code64);
			t356 = claim_text(code64_nodes, "action_destroyer");
			code64_nodes.forEach(detach);
			t357 = claim_text(li38_nodes, " returns the ");
			code65 = claim_element(li38_nodes, "CODE", {});
			var code65_nodes = children(code65);
			t358 = claim_text(code65_nodes, "dispose");
			code65_nodes.forEach(detach);
			t359 = claim_text(li38_nodes, " function. The ");
			code66 = claim_element(li38_nodes, "CODE", {});
			var code66_nodes = children(code66);
			t360 = claim_text(code66_nodes, "dispose");
			code66_nodes.forEach(detach);
			t361 = claim_text(li38_nodes, " function makes sure that ");
			code67 = claim_element(li38_nodes, "CODE", {});
			var code67_nodes = children(code67);
			t362 = claim_text(code67_nodes, "action_action.destroy");
			code67_nodes.forEach(detach);
			t363 = claim_text(li38_nodes, " is a function before calling it.");
			li38_nodes.forEach(detach);
			ul14_nodes.forEach(detach);
			section15_nodes.forEach(detach);
			t364 = claim_space(nodes);
			section16 = claim_element(nodes, "SECTION", {});
			var section16_nodes = children(section16);
			h39 = claim_element(section16_nodes, "H3", {});
			var h39_nodes = children(h39);
			a53 = claim_element(h39_nodes, "A", { href: true, id: true });
			var a53_nodes = children(a53);
			t365 = claim_text(a53_nodes, "The order of directives");
			a53_nodes.forEach(detach);
			h39_nodes.forEach(detach);
			t366 = claim_space(section16_nodes);
			p48 = claim_element(section16_nodes, "P", {});
			var p48_nodes = children(p48);
			t367 = claim_text(p48_nodes, "As both the ");
			code68 = claim_element(p48_nodes, "CODE", {});
			var code68_nodes = children(code68);
			t368 = claim_text(code68_nodes, "bind:");
			code68_nodes.forEach(detach);
			t369 = claim_text(p48_nodes, " and the ");
			code69 = claim_element(p48_nodes, "CODE", {});
			var code69_nodes = children(code69);
			t370 = claim_text(code69_nodes, "on:");
			code69_nodes.forEach(detach);
			t371 = claim_text(p48_nodes, " directives add event listeners to the element, the order of adding event listener may have nuance side effects.");
			p48_nodes.forEach(detach);
			t372 = claim_space(section16_nodes);
			p49 = claim_element(section16_nodes, "P", {});
			var p49_nodes = children(p49);
			t373 = claim_text(p49_nodes, "Imagine the following scenario:");
			p49_nodes.forEach(detach);
			t374 = claim_space(section16_nodes);
			pre21 = claim_element(section16_nodes, "PRE", { class: true });
			var pre21_nodes = children(pre21);
			pre21_nodes.forEach(detach);
			t375 = claim_space(section16_nodes);
			p50 = claim_element(section16_nodes, "P", {});
			var p50_nodes = children(p50);
			t376 = claim_text(p50_nodes, "The ");
			code70 = claim_element(p50_nodes, "CODE", {});
			var code70_nodes = children(code70);
			t377 = claim_text(code70_nodes, "input.value");
			code70_nodes.forEach(detach);
			t378 = claim_text(p50_nodes, " accessed by the implicit event handler of the ");
			code71 = claim_element(p50_nodes, "CODE", {});
			var code71_nodes = children(code71);
			t379 = claim_text(code71_nodes, "bind:");
			code71_nodes.forEach(detach);
			t380 = claim_text(p50_nodes, " directive depends on whether ");
			code72 = claim_element(p50_nodes, "CODE", {});
			var code72_nodes = children(code72);
			t381 = claim_text(code72_nodes, "on:input");
			code72_nodes.forEach(detach);
			t382 = claim_text(p50_nodes, " handler gets called before or after.");
			p50_nodes.forEach(detach);
			t383 = claim_space(section16_nodes);
			p51 = claim_element(section16_nodes, "P", {});
			var p51_nodes = children(p51);
			t384 = claim_text(p51_nodes, "If the implicit event handler of the ");
			code73 = claim_element(p51_nodes, "CODE", {});
			var code73_nodes = children(code73);
			t385 = claim_text(code73_nodes, "bind:");
			code73_nodes.forEach(detach);
			t386 = claim_text(p51_nodes, " directive is called before the event handler, the bound value is the value of the input before applying the ");
			code74 = claim_element(p51_nodes, "CODE", {});
			var code74_nodes = children(code74);
			t387 = claim_text(code74_nodes, "toUpperCase()");
			code74_nodes.forEach(detach);
			t388 = claim_text(p51_nodes, " transformation.");
			p51_nodes.forEach(detach);
			t389 = claim_space(section16_nodes);
			p52 = claim_element(section16_nodes, "P", {});
			var p52_nodes = children(p52);
			t390 = claim_text(p52_nodes, "Although ");
			code75 = claim_element(p52_nodes, "CODE", {});
			var code75_nodes = children(code75);
			t391 = claim_text(code75_nodes, "action:");
			code75_nodes.forEach(detach);
			t392 = claim_text(p52_nodes, " directive itself does not add event listener to the element, but it is possible to be added by the user code:");
			p52_nodes.forEach(detach);
			t393 = claim_space(section16_nodes);
			pre22 = claim_element(section16_nodes, "PRE", { class: true });
			var pre22_nodes = children(pre22);
			pre22_nodes.forEach(detach);
			t394 = claim_space(section16_nodes);
			p53 = claim_element(section16_nodes, "P", {});
			var p53_nodes = children(p53);
			t395 = claim_text(p53_nodes, "Although it is not officially documented, ");
			em1 = claim_element(p53_nodes, "EM", {});
			var em1_nodes = children(em1);
			t396 = claim_text(em1_nodes, "(I couldn't find it on the docs)");
			em1_nodes.forEach(detach);
			t397 = claim_text(p53_nodes, ", ");
			strong12 = claim_element(p53_nodes, "STRONG", {});
			var strong12_nodes = children(strong12);
			t398 = claim_text(strong12_nodes, "the order of declaring the directives ");
			code76 = claim_element(strong12_nodes, "CODE", {});
			var code76_nodes = children(code76);
			t399 = claim_text(code76_nodes, "on:");
			code76_nodes.forEach(detach);
			t400 = claim_text(strong12_nodes, ", ");
			code77 = claim_element(strong12_nodes, "CODE", {});
			var code77_nodes = children(code77);
			t401 = claim_text(code77_nodes, "bind:");
			code77_nodes.forEach(detach);
			t402 = claim_text(strong12_nodes, " and ");
			code78 = claim_element(strong12_nodes, "CODE", {});
			var code78_nodes = children(code78);
			t403 = claim_text(code78_nodes, "use:");
			code78_nodes.forEach(detach);
			t404 = claim_text(strong12_nodes, " on an element does matter");
			strong12_nodes.forEach(detach);
			t405 = claim_text(p53_nodes, " to provide a consistent behavior.");
			p53_nodes.forEach(detach);
			t406 = claim_space(section16_nodes);
			p54 = claim_element(section16_nodes, "P", {});
			var p54_nodes = children(p54);
			t407 = claim_text(p54_nodes, "Try out the following example in the REPL:");
			p54_nodes.forEach(detach);
			t408 = claim_space(section16_nodes);
			pre23 = claim_element(section16_nodes, "PRE", { class: true });
			var pre23_nodes = children(pre23);
			pre23_nodes.forEach(detach);
			t409 = claim_space(section16_nodes);
			p55 = claim_element(section16_nodes, "P", {});
			var p55_nodes = children(p55);
			a54 = claim_element(p55_nodes, "A", { href: true, rel: true });
			var a54_nodes = children(a54);
			t410 = claim_text(a54_nodes, "Svelte REPL");
			a54_nodes.forEach(detach);
			p55_nodes.forEach(detach);
			t411 = claim_space(section16_nodes);
			p56 = claim_element(section16_nodes, "P", {});
			var p56_nodes = children(p56);
			t412 = claim_text(p56_nodes, "Try reordering the ");
			code79 = claim_element(p56_nodes, "CODE", {});
			var code79_nodes = children(code79);
			t413 = claim_text(code79_nodes, "bind:");
			code79_nodes.forEach(detach);
			t414 = claim_text(p56_nodes, ", ");
			code80 = claim_element(p56_nodes, "CODE", {});
			var code80_nodes = children(code80);
			t415 = claim_text(code80_nodes, "on:");
			code80_nodes.forEach(detach);
			t416 = claim_text(p56_nodes, " and ");
			code81 = claim_element(p56_nodes, "CODE", {});
			var code81_nodes = children(code81);
			t417 = claim_text(code81_nodes, "use:");
			code81_nodes.forEach(detach);
			t418 = claim_text(p56_nodes, " directives and see how it affects the output JS:");
			p56_nodes.forEach(detach);
			t419 = claim_space(section16_nodes);
			pre24 = claim_element(section16_nodes, "PRE", { class: true });
			var pre24_nodes = children(pre24);
			pre24_nodes.forEach(detach);
			t420 = claim_space(section16_nodes);
			p57 = claim_element(section16_nodes, "P", {});
			var p57_nodes = children(p57);
			t421 = claim_text(p57_nodes, "If you are interested to learn more about ordering directives, the edge cases it fixed and the regression bugs it caused, you can start with ");
			a55 = claim_element(p57_nodes, "A", { href: true, rel: true });
			var a55_nodes = children(a55);
			t422 = claim_text(a55_nodes, "this Github issue");
			a55_nodes.forEach(detach);
			t423 = claim_text(p57_nodes, ".");
			p57_nodes.forEach(detach);
			section16_nodes.forEach(detach);
			t424 = claim_space(nodes);
			section17 = claim_element(nodes, "SECTION", {});
			var section17_nodes = children(section17);
			h23 = claim_element(section17_nodes, "H2", {});
			var h23_nodes = children(h23);
			a56 = claim_element(h23_nodes, "A", { href: true, id: true });
			var a56_nodes = children(a56);
			t425 = claim_text(a56_nodes, "Closing Note");
			a56_nodes.forEach(detach);
			h23_nodes.forEach(detach);
			t426 = claim_space(section17_nodes);
			p58 = claim_element(section17_nodes, "P", {});
			var p58_nodes = children(p58);
			t427 = claim_text(p58_nodes, "In this article, we explored how ");
			code82 = claim_element(p58_nodes, "CODE", {});
			var code82_nodes = children(code82);
			t428 = claim_text(code82_nodes, "on:");
			code82_nodes.forEach(detach);
			t429 = claim_text(p58_nodes, ", ");
			code83 = claim_element(p58_nodes, "CODE", {});
			var code83_nodes = children(code83);
			t430 = claim_text(code83_nodes, "bind:");
			code83_nodes.forEach(detach);
			t431 = claim_text(p58_nodes, " and ");
			code84 = claim_element(p58_nodes, "CODE", {});
			var code84_nodes = children(code84);
			t432 = claim_text(code84_nodes, "use:");
			code84_nodes.forEach(detach);
			t433 = claim_text(p58_nodes, " directives work.");
			p58_nodes.forEach(detach);
			t434 = claim_space(section17_nodes);
			p59 = claim_element(section17_nodes, "P", {});
			var p59_nodes = children(p59);
			t435 = claim_text(p59_nodes, "We first looked at how we can implement them without using any framework. After that, we walked through how Svelte compiles the directives into JavaScript.");
			p59_nodes.forEach(detach);
			t436 = claim_space(section17_nodes);
			p60 = claim_element(section17_nodes, "P", {});
			var p60_nodes = children(p60);
			t437 = claim_text(p60_nodes, "We've also talked about how the order of declaring directives on an element matters.");
			p60_nodes.forEach(detach);
			t438 = claim_space(section17_nodes);
			p61 = claim_element(section17_nodes, "P", {});
			var p61_nodes = children(p61);
			t439 = claim_text(p61_nodes, "If you wish to know more, ");
			a57 = claim_element(p61_nodes, "A", { href: true, rel: true });
			var a57_nodes = children(a57);
			t440 = claim_text(a57_nodes, "follow me on Twitter");
			a57_nodes.forEach(detach);
			t441 = claim_text(p61_nodes, ".");
			p61_nodes.forEach(detach);
			t442 = claim_space(section17_nodes);
			p62 = claim_element(section17_nodes, "P", {});
			var p62_nodes = children(p62);
			t443 = claim_text(p62_nodes, "I'll post it on Twitter when the next part is ready, where I'll be covering ");
			a58 = claim_element(p62_nodes, "A", { href: true, rel: true });
			var a58_nodes = children(a58);
			t444 = claim_text(a58_nodes, "logic blocks");
			a58_nodes.forEach(detach);
			t445 = claim_text(p62_nodes, ", ");
			a59 = claim_element(p62_nodes, "A", { href: true, rel: true });
			var a59_nodes = children(a59);
			t446 = claim_text(a59_nodes, "slots");
			a59_nodes.forEach(detach);
			t447 = claim_text(p62_nodes, ", ");
			a60 = claim_element(p62_nodes, "A", { href: true, rel: true });
			var a60_nodes = children(a60);
			t448 = claim_text(a60_nodes, "context");
			a60_nodes.forEach(detach);
			t449 = claim_text(p62_nodes, ", and many others.");
			p62_nodes.forEach(detach);
			t450 = claim_space(section17_nodes);
			p63 = claim_element(section17_nodes, "P", {});
			var p63_nodes = children(p63);
			strong13 = claim_element(p63_nodes, "STRONG", {});
			var strong13_nodes = children(strong13);
			t451 = claim_text(strong13_nodes, "⬅ ⬅  Previously in ");
			a61 = claim_element(strong13_nodes, "A", { href: true });
			var a61_nodes = children(a61);
			t452 = claim_text(a61_nodes, "Part 2");
			a61_nodes.forEach(detach);
			t453 = claim_text(strong13_nodes, ".");
			strong13_nodes.forEach(detach);
			p63_nodes.forEach(detach);
			section17_nodes.forEach(detach);
			this.h();
		},
		h() {
			attr(a0, "href", "#the-on-bind-and-use");
			attr(a1, "href", "#on-event-handlers");
			attr(a2, "href", "#bind-bindings");
			attr(a3, "href", "#use-actions");
			attr(a4, "href", "#the-vanilla-js");
			attr(a5, "href", "#event-handler");
			attr(a6, "href", "#event-preventdefault");
			attr(a7, "href", "#event-stoppropagation");
			attr(a8, "href", "#bindings");
			attr(a9, "href", "#actions");
			attr(a10, "href", "#the-compiled-js");
			attr(a11, "href", "#on-directive");
			attr(a12, "href", "#event-modifiers");
			attr(a13, "href", "#bind-directive");
			attr(a14, "href", "#use-directive");
			attr(a15, "href", "#the-order-of-directives");
			attr(a16, "href", "#closing-note");
			attr(ul5, "class", "sitemap");
			attr(ul5, "id", "sitemap");
			attr(ul5, "role", "navigation");
			attr(ul5, "aria-label", "Table of Contents");
			attr(a17, "href", "/compile-svelte-in-your-head-part-2/");
			attr(a18, "href", "/compile-svelte-in-your-head-part-2/");
			attr(a19, "href", "#the-on-bind-and-use");
			attr(a19, "id", "the-on-bind-and-use");
			attr(a20, "href", "#on-event-handlers");
			attr(a20, "id", "on-event-handlers");
			attr(pre0, "class", "language-svelte");
			attr(a21, "href", "#bind-bindings");
			attr(a21, "id", "bind-bindings");
			attr(pre1, "class", "language-svelte");
			attr(a22, "href", "#use-actions");
			attr(a22, "id", "use-actions");
			attr(a23, "href", "https://svelte.dev/tutorial/actions");
			attr(a23, "rel", "nofollow");
			attr(pre2, "class", "language-svelte");
			attr(pre3, "class", "language-svelte");
			attr(pre4, "class", "language-svelte");
			attr(a24, "href", "https://svelte.dev/tutorial/dom-events");
			attr(a24, "rel", "nofollow");
			attr(a25, "href", "https://svelte.dev/tutorial/text-inputs");
			attr(a25, "rel", "nofollow");
			attr(a26, "href", "https://svelte.dev/tutorial/actions");
			attr(a26, "rel", "nofollow");
			attr(a27, "href", "#the-vanilla-js");
			attr(a27, "id", "the-vanilla-js");
			attr(a28, "href", "#event-handler");
			attr(a28, "id", "event-handler");
			attr(a29, "href", "/compile-svelte-in-your-head-part-1/#listen-for-click-events-on-an-element");
			attr(a30, "href", "https://developer.mozilla.org/en-US/docs/Web/API/EventTarget/addEventListener");
			attr(a30, "rel", "nofollow");
			attr(pre5, "class", "language-js");
			attr(pre6, "class", "language-js");
			attr(a31, "href", "#event-preventdefault");
			attr(a31, "id", "event-preventdefault");
			attr(a32, "href", "https://developer.mozilla.org/en-US/docs/Web/API/Event/preventDefault");
			attr(a32, "rel", "nofollow");
			attr(pre7, "class", "language-js");
			attr(a33, "href", "#event-stoppropagation");
			attr(a33, "id", "event-stoppropagation");
			attr(a34, "href", "https://developer.mozilla.org/en-US/docs/Web/API/Event/stopPropagation");
			attr(a34, "rel", "nofollow");
			attr(pre8, "class", "language-svelte");
			attr(a35, "href", "https://developer.mozilla.org/en-US/docs/Web/API/EventTarget/removeEventListener#Matching_event_listeners_for_removal");
			attr(a35, "rel", "nofollow");
			attr(pre9, "class", "language-js");
			attr(a36, "href", "#bindings");
			attr(a36, "id", "bindings");
			attr(a37, "href", "/reactivity-in-web-frameworks-the-when/");
			attr(pre10, "class", "language-js");
			attr(a38, "href", "https://developer.mozilla.org/en-US/docs/Web/API/HTMLDialogElement");
			attr(a38, "rel", "nofollow");
			attr(a39, "href", "https://developer.mozilla.org/en-US/docs/Web/API/HTMLDialogElement/close_event");
			attr(a39, "rel", "nofollow");
			attr(a40, "href", "https://developer.mozilla.org/en-US/docs/Web/API/MutationObserver");
			attr(a40, "rel", "nofollow");
			attr(a41, "href", "#actions");
			attr(a41, "id", "actions");
			attr(pre11, "class", "language-js");
			attr(a42, "href", "#the-compiled-js");
			attr(a42, "id", "the-compiled-js");
			attr(a43, "href", "#on-directive");
			attr(a43, "id", "on-directive");
			attr(pre12, "class", "language-svelte");
			attr(a44, "href", "https://svelte.dev/repl/0ea0c22e9fd648518cfc1231835b0f05");
			attr(a44, "rel", "nofollow");
			attr(pre13, "class", "language-js");
			attr(a45, "href", "https://lihautan.com/compile-svelte-in-your-head-part-1/#listen-and-dispose");
			attr(a45, "rel", "nofollow");
			attr(a46, "href", "#event-modifiers");
			attr(a46, "id", "event-modifiers");
			attr(pre14, "class", "language-svelte");
			attr(a47, "href", "https://svelte.dev/repl/11fffa988c1f49239c005619c3b506c5");
			attr(a47, "rel", "nofollow");
			attr(pre15, "class", "language-js");
			attr(a48, "href", "https://developer.mozilla.org/en-US/docs/Web/API/EventTarget/addEventListener");
			attr(a48, "rel", "nofollow");
			attr(pre16, "class", "language-js");
			attr(a49, "href", "#bind-directive");
			attr(a49, "id", "bind-directive");
			attr(pre17, "class", "language-svelte");
			attr(a50, "href", "https://svelte.dev/repl/22ff0420e32f427c8b20e878a44170d3");
			attr(a50, "rel", "nofollow");
			attr(pre18, "class", "language-js");
			attr(a51, "href", "#use-directive");
			attr(a51, "id", "use-directive");
			attr(pre19, "class", "language-svelte");
			attr(a52, "href", "https://svelte.dev/repl/88bbecb8b86943fd80d9d428961251ae");
			attr(a52, "rel", "nofollow");
			attr(pre20, "class", "language-js");
			attr(a53, "href", "#the-order-of-directives");
			attr(a53, "id", "the-order-of-directives");
			attr(pre21, "class", "language-svelte");
			attr(pre22, "class", "language-svelte");
			attr(pre23, "class", "language-svelte");
			attr(a54, "href", "https://svelte.dev/repl/f06a8a59840c418b86c43c2875d4b274");
			attr(a54, "rel", "nofollow");
			attr(pre24, "class", "language-js");
			attr(a55, "href", "https://github.com/sveltejs/svelte/issues/2446");
			attr(a55, "rel", "nofollow");
			attr(a56, "href", "#closing-note");
			attr(a56, "id", "closing-note");
			attr(a57, "href", "https://twitter.com/lihautan");
			attr(a57, "rel", "nofollow");
			attr(a58, "href", "https://svelte.dev/tutorial/if-blocks");
			attr(a58, "rel", "nofollow");
			attr(a59, "href", "https://svelte.dev/tutorial/slots");
			attr(a59, "rel", "nofollow");
			attr(a60, "href", "https://svelte.dev/tutorial/context-api");
			attr(a60, "rel", "nofollow");
			attr(a61, "href", "/compile-svelte-in-your-head-part-2/");
		},
		m(target, anchor) {
			insert(target, section0, anchor);
			append(section0, ul5);
			append(ul5, li0);
			append(li0, a0);
			append(a0, t0);
			append(ul5, ul0);
			append(ul0, li1);
			append(li1, a1);
			append(a1, t1);
			append(ul0, li2);
			append(li2, a2);
			append(a2, t2);
			append(ul0, li3);
			append(li3, a3);
			append(a3, t3);
			append(ul5, li4);
			append(li4, a4);
			append(a4, t4);
			append(ul5, ul2);
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
			append(ul2, li8);
			append(li8, a8);
			append(a8, t8);
			append(ul2, li9);
			append(li9, a9);
			append(a9, t9);
			append(ul5, li10);
			append(li10, a10);
			append(a10, t10);
			append(ul5, ul4);
			append(ul4, li11);
			append(li11, a11);
			append(a11, t11);
			append(ul4, ul3);
			append(ul3, li12);
			append(li12, a12);
			append(a12, t12);
			append(ul4, li13);
			append(li13, a13);
			append(a13, t13);
			append(ul4, li14);
			append(li14, a14);
			append(a14, t14);
			append(ul4, li15);
			append(li15, a15);
			append(a15, t15);
			append(ul5, li16);
			append(li16, a16);
			append(a16, t16);
			insert(target, t17, anchor);
			insert(target, p0, anchor);
			append(p0, strong0);
			append(strong0, t18);
			append(strong0, a17);
			append(a17, t19);
			append(strong0, t20);
			insert(target, t21, anchor);
			insert(target, p1, anchor);
			append(p1, a18);
			append(a18, t22);
			append(p1, t23);
			append(p1, code0);
			append(code0, t24);
			append(p1, t25);
			append(p1, code1);
			append(code1, t26);
			append(p1, t27);
			insert(target, t28, anchor);
			insert(target, p2, anchor);
			append(p2, t29);
			insert(target, t30, anchor);
			insert(target, ul6, anchor);
			append(ul6, li17);
			append(li17, code2);
			append(code2, t31);
			append(li17, t32);
			append(ul6, t33);
			append(ul6, li18);
			append(li18, code3);
			append(code3, t34);
			append(li18, t35);
			append(ul6, t36);
			append(ul6, li19);
			append(li19, code4);
			append(code4, t37);
			append(li19, t38);
			insert(target, t39, anchor);
			insert(target, p3, anchor);
			append(p3, t40);
			insert(target, t41, anchor);
			insert(target, section1, anchor);
			append(section1, h20);
			append(h20, a19);
			append(a19, t42);
			append(a19, code5);
			append(code5, t43);
			append(a19, t44);
			append(a19, code6);
			append(code6, t45);
			append(a19, t46);
			append(a19, code7);
			append(code7, t47);
			insert(target, t48, anchor);
			insert(target, section2, anchor);
			append(section2, h30);
			append(h30, a20);
			append(a20, code8);
			append(code8, t49);
			append(a20, t50);
			append(section2, t51);
			append(section2, p4);
			append(p4, t52);
			append(p4, code9);
			append(code9, t53);
			append(p4, t54);
			append(section2, t55);
			append(section2, pre0);
			pre0.innerHTML = raw0_value;
			insert(target, t56, anchor);
			insert(target, section3, anchor);
			append(section3, h31);
			append(h31, a21);
			append(a21, code10);
			append(code10, t57);
			append(a21, t58);
			append(section3, t59);
			append(section3, p5);
			append(p5, t60);
			append(p5, code11);
			append(code11, t61);
			append(p5, t62);
			append(section3, t63);
			append(section3, p6);
			append(p6, t64);
			append(section3, t65);
			append(section3, pre1);
			pre1.innerHTML = raw1_value;
			insert(target, t66, anchor);
			insert(target, section4, anchor);
			append(section4, h32);
			append(h32, a22);
			append(a22, code12);
			append(code12, t67);
			append(a22, t68);
			append(section4, t69);
			append(section4, p7);
			append(p7, t70);
			append(p7, code13);
			append(code13, t71);
			append(p7, t72);
			append(p7, strong1);
			append(strong1, a23);
			append(a23, t73);
			append(p7, t74);
			append(section4, t75);
			append(section4, p8);
			append(p8, t76);
			append(p8, code14);
			append(code14, t77);
			append(p8, t78);
			append(section4, t79);
			append(section4, p9);
			append(p9, t80);
			append(p9, code15);
			append(code15, t81);
			append(p9, t82);
			append(section4, t83);
			append(section4, pre2);
			pre2.innerHTML = raw2_value;
			append(section4, t84);
			append(section4, p10);
			append(p10, t85);
			append(section4, t86);
			append(section4, pre3);
			pre3.innerHTML = raw3_value;
			append(section4, t87);
			append(section4, p11);
			append(p11, t88);
			append(p11, code16);
			append(code16, t89);
			append(p11, t90);
			append(section4, t91);
			append(section4, pre4);
			pre4.innerHTML = raw4_value;
			append(section4, t92);
			append(section4, p12);
			append(p12, t93);
			append(section4, t94);
			append(section4, ul7);
			append(ul7, li20);
			append(li20, a24);
			append(a24, t95);
			append(a24, code17);
			append(code17, t96);
			append(ul7, t97);
			append(ul7, li21);
			append(li21, a25);
			append(a25, t98);
			append(a25, code18);
			append(code18, t99);
			append(ul7, t100);
			append(ul7, li22);
			append(li22, a26);
			append(a26, t101);
			append(a26, code19);
			append(code19, t102);
			insert(target, t103, anchor);
			insert(target, section5, anchor);
			append(section5, h21);
			append(h21, a27);
			append(a27, t104);
			append(section5, t105);
			append(section5, p13);
			append(p13, t106);
			insert(target, t107, anchor);
			insert(target, section6, anchor);
			append(section6, h33);
			append(h33, a28);
			append(a28, t108);
			append(section6, t109);
			append(section6, p14);
			append(p14, t110);
			append(p14, a29);
			append(a29, t111);
			append(p14, t112);
			append(p14, a30);
			append(a30, t113);
			append(p14, t114);
			append(section6, t115);
			append(section6, pre5);
			pre5.innerHTML = raw5_value;
			append(section6, t116);
			append(section6, p15);
			append(p15, t117);
			append(section6, t118);
			append(section6, pre6);
			pre6.innerHTML = raw6_value;
			insert(target, t119, anchor);
			insert(target, section7, anchor);
			append(section7, h40);
			append(h40, a31);
			append(a31, t120);
			append(section7, t121);
			append(section7, p16);
			append(p16, a32);
			append(a32, t122);
			append(p16, t123);
			append(p16, code20);
			append(code20, t124);
			append(p16, t125);
			append(p16, code21);
			append(code21, t126);
			append(p16, t127);
			append(section7, t128);
			append(section7, pre7);
			pre7.innerHTML = raw7_value;
			insert(target, t129, anchor);
			insert(target, section8, anchor);
			append(section8, h41);
			append(h41, a33);
			append(a33, t130);
			append(section8, t131);
			append(section8, p17);
			append(p17, a34);
			append(a34, t132);
			append(p17, t133);
			append(section8, t134);
			append(section8, pre8);
			pre8.innerHTML = raw8_value;
			append(section8, t135);
			append(section8, p18);
			append(p18, t136);
			append(p18, code22);
			append(code22, t137);
			append(p18, t138);
			append(p18, code23);
			append(code23, t139);
			append(p18, t140);
			append(p18, code24);
			append(code24, t141);
			append(p18, t142);
			append(p18, code25);
			append(code25, t143);
			append(p18, t144);
			append(p18, code26);
			append(code26, t145);
			append(p18, t146);
			append(p18, a35);
			append(a35, t147);
			append(p18, t148);
			append(section8, t149);
			append(section8, pre9);
			pre9.innerHTML = raw9_value;
			insert(target, t150, anchor);
			insert(target, section9, anchor);
			append(section9, h34);
			append(h34, a36);
			append(a36, t151);
			append(section9, t152);
			append(section9, p19);
			append(p19, t153);
			append(section9, t154);
			append(section9, p20);
			append(p20, t155);
			append(section9, t156);
			append(section9, p21);
			append(p21, em0);
			append(em0, t157);
			append(em0, a37);
			append(a37, t158);
			append(em0, t159);
			append(section9, t160);
			append(section9, p22);
			append(p22, t161);
			append(p22, strong2);
			append(strong2, t162);
			append(p22, t163);
			append(section9, t164);
			append(section9, pre10);
			pre10.innerHTML = raw10_value;
			append(section9, t165);
			append(section9, p23);
			append(p23, t166);
			append(section9, t167);
			append(section9, p24);
			append(p24, strong3);
			append(strong3, t168);
			append(section9, t169);
			append(section9, p25);
			append(p25, t170);
			append(p25, code27);
			append(code27, t171);
			append(p25, t172);
			append(p25, code28);
			append(code28, t173);
			append(p25, t174);
			append(section9, t175);
			append(section9, p26);
			append(p26, strong4);
			append(strong4, t176);
			append(section9, t177);
			append(section9, p27);
			append(p27, t178);
			append(p27, a38);
			append(a38, t179);
			append(p27, t180);
			append(p27, a39);
			append(a39, code29);
			append(code29, t181);
			append(p27, t182);
			append(p27, code30);
			append(code30, t183);
			append(p27, t184);
			append(p27, code31);
			append(code31, t185);
			append(p27, t186);
			append(section9, t187);
			append(section9, p28);
			append(p28, t188);
			append(p28, a40);
			append(a40, t189);
			append(p28, t190);
			insert(target, t191, anchor);
			insert(target, section10, anchor);
			append(section10, h35);
			append(h35, a41);
			append(a41, t192);
			append(section10, t193);
			append(section10, p29);
			append(p29, t194);
			append(section10, t195);
			append(section10, p30);
			append(p30, t196);
			append(section10, t197);
			append(section10, ul8);
			append(ul8, li23);
			append(li23, code32);
			append(code32, t198);
			append(li23, t199);
			append(ul8, t200);
			append(ul8, li24);
			append(li24, code33);
			append(code33, t201);
			append(li24, t202);
			append(section10, t203);
			append(section10, pre11);
			pre11.innerHTML = raw11_value;
			insert(target, t204, anchor);
			insert(target, section11, anchor);
			append(section11, h22);
			append(h22, a42);
			append(a42, t205);
			append(section11, t206);
			append(section11, p31);
			append(p31, t207);
			append(p31, code34);
			append(code34, t208);
			append(p31, t209);
			append(p31, code35);
			append(code35, t210);
			append(p31, t211);
			append(p31, code36);
			append(code36, t212);
			append(p31, t213);
			insert(target, t214, anchor);
			insert(target, section12, anchor);
			append(section12, h36);
			append(h36, a43);
			append(a43, code37);
			append(code37, t215);
			append(a43, t216);
			append(section12, t217);
			append(section12, pre12);
			pre12.innerHTML = raw12_value;
			append(section12, t218);
			append(section12, p32);
			append(p32, a44);
			append(a44, t219);
			append(section12, t220);
			append(section12, p33);
			append(p33, t221);
			append(section12, t222);
			append(section12, pre13);
			pre13.innerHTML = raw13_value;
			append(section12, t223);
			append(section12, p34);
			append(p34, t224);
			append(section12, t225);
			append(section12, ul9);
			append(ul9, li25);
			append(li25, t226);
			append(li25, code38);
			append(code38, t227);
			append(li25, t228);
			append(li25, strong5);
			append(strong5, t229);
			append(li25, t230);
			append(ul9, t231);
			append(ul9, li26);
			append(li26, t232);
			append(li26, code39);
			append(code39, t233);
			append(li26, t234);
			append(li26, strong6);
			append(strong6, t235);
			append(li26, t236);
			append(section12, t237);
			append(section12, p35);
			append(p35, t238);
			append(p35, a45);
			append(a45, t239);
			append(p35, t240);
			append(p35, code40);
			append(code40, t241);
			append(p35, t242);
			append(section12, t243);
			append(section12, p36);
			append(p36, t244);
			append(p36, code41);
			append(code41, t245);
			append(p36, t246);
			insert(target, t247, anchor);
			insert(target, section13, anchor);
			append(section13, h42);
			append(h42, a46);
			append(a46, t248);
			append(section13, t249);
			append(section13, p37);
			append(p37, t250);
			append(section13, t251);
			append(section13, pre14);
			pre14.innerHTML = raw14_value;
			append(section13, t252);
			append(section13, p38);
			append(p38, a47);
			append(a47, t253);
			append(section13, t254);
			append(section13, p39);
			append(p39, t255);
			append(section13, t256);
			append(section13, pre15);
			pre15.innerHTML = raw15_value;
			append(section13, t257);
			append(section13, p40);
			append(p40, t258);
			append(section13, t259);
			append(section13, ul10);
			append(ul10, li27);
			append(li27, t260);
			append(ul10, t261);
			append(ul10, li28);
			append(li28, t262);
			append(li28, code42);
			append(code42, t263);
			append(li28, t264);
			append(li28, code43);
			append(code43, t265);
			append(li28, t266);
			append(li28, code44);
			append(code44, t267);
			append(li28, t268);
			append(li28, a48);
			append(a48, t269);
			append(li28, t270);
			append(li28, code45);
			append(code45, t271);
			append(li28, t272);
			append(ul10, t273);
			append(ul10, li29);
			append(li29, t274);
			append(li29, code46);
			append(code46, t275);
			append(li29, t276);
			append(li29, code47);
			append(code47, t277);
			append(li29, t278);
			append(li29, code48);
			append(code48, t279);
			append(li29, t280);
			append(section13, t281);
			append(section13, p41);
			append(p41, t282);
			append(p41, code49);
			append(code49, t283);
			append(p41, t284);
			append(section13, t285);
			append(section13, pre16);
			pre16.innerHTML = raw16_value;
			insert(target, t286, anchor);
			insert(target, section14, anchor);
			append(section14, h37);
			append(h37, a49);
			append(a49, code50);
			append(code50, t287);
			append(a49, t288);
			append(section14, t289);
			append(section14, pre17);
			pre17.innerHTML = raw17_value;
			append(section14, t290);
			append(section14, p42);
			append(p42, a50);
			append(a50, t291);
			append(section14, t292);
			append(section14, p43);
			append(p43, t293);
			append(section14, t294);
			append(section14, pre18);
			pre18.innerHTML = raw18_value;
			append(section14, t295);
			append(section14, p44);
			append(p44, t296);
			append(section14, t297);
			append(section14, ul13);
			append(ul13, li32);
			append(li32, t298);
			append(li32, ul11);
			append(ul11, li30);
			append(li30, t299);
			append(li30, code51);
			append(code51, t300);
			append(li30, t301);
			append(li30, code52);
			append(code52, t302);
			append(ul11, t303);
			append(ul11, li31);
			append(li31, t304);
			append(li31, strong7);
			append(strong7, t305);
			append(li31, t306);
			append(li31, code53);
			append(code53, t307);
			append(li31, t308);
			append(li31, code54);
			append(code54, t309);
			append(li31, t310);
			append(li31, code55);
			append(code55, t311);
			append(li31, t312);
			append(ul13, t313);
			append(ul13, li35);
			append(li35, t314);
			append(li35, ul12);
			append(ul12, li33);
			append(li33, t315);
			append(li33, code56);
			append(code56, t316);
			append(li33, t317);
			append(li33, code57);
			append(code57, t318);
			append(li33, t319);
			append(ul12, t320);
			append(ul12, li34);
			append(li34, t321);
			append(li34, code58);
			append(code58, t322);
			append(li34, t323);
			append(li34, strong8);
			append(strong8, t324);
			append(li34, t325);
			append(li34, code59);
			append(code59, t326);
			append(li34, t327);
			append(li34, strong9);
			append(strong9, t328);
			append(li34, t329);
			insert(target, t330, anchor);
			insert(target, section15, anchor);
			append(section15, h38);
			append(h38, a51);
			append(a51, code60);
			append(code60, t331);
			append(a51, t332);
			append(section15, t333);
			append(section15, pre19);
			pre19.innerHTML = raw19_value;
			append(section15, t334);
			append(section15, p45);
			append(p45, a52);
			append(a52, t335);
			append(section15, t336);
			append(section15, p46);
			append(p46, t337);
			append(section15, t338);
			append(section15, pre20);
			pre20.innerHTML = raw20_value;
			append(section15, t339);
			append(section15, p47);
			append(p47, t340);
			append(section15, t341);
			append(section15, ul14);
			append(ul14, li36);
			append(li36, t342);
			append(li36, code61);
			append(code61, t343);
			append(li36, t344);
			append(li36, code62);
			append(code62, t345);
			append(li36, t346);
			append(li36, strong10);
			append(strong10, t347);
			append(li36, t348);
			append(ul14, t349);
			append(ul14, li37);
			append(li37, t350);
			append(li37, code63);
			append(code63, t351);
			append(li37, t352);
			append(li37, strong11);
			append(strong11, t353);
			append(li37, t354);
			append(ul14, t355);
			append(ul14, li38);
			append(li38, code64);
			append(code64, t356);
			append(li38, t357);
			append(li38, code65);
			append(code65, t358);
			append(li38, t359);
			append(li38, code66);
			append(code66, t360);
			append(li38, t361);
			append(li38, code67);
			append(code67, t362);
			append(li38, t363);
			insert(target, t364, anchor);
			insert(target, section16, anchor);
			append(section16, h39);
			append(h39, a53);
			append(a53, t365);
			append(section16, t366);
			append(section16, p48);
			append(p48, t367);
			append(p48, code68);
			append(code68, t368);
			append(p48, t369);
			append(p48, code69);
			append(code69, t370);
			append(p48, t371);
			append(section16, t372);
			append(section16, p49);
			append(p49, t373);
			append(section16, t374);
			append(section16, pre21);
			pre21.innerHTML = raw21_value;
			append(section16, t375);
			append(section16, p50);
			append(p50, t376);
			append(p50, code70);
			append(code70, t377);
			append(p50, t378);
			append(p50, code71);
			append(code71, t379);
			append(p50, t380);
			append(p50, code72);
			append(code72, t381);
			append(p50, t382);
			append(section16, t383);
			append(section16, p51);
			append(p51, t384);
			append(p51, code73);
			append(code73, t385);
			append(p51, t386);
			append(p51, code74);
			append(code74, t387);
			append(p51, t388);
			append(section16, t389);
			append(section16, p52);
			append(p52, t390);
			append(p52, code75);
			append(code75, t391);
			append(p52, t392);
			append(section16, t393);
			append(section16, pre22);
			pre22.innerHTML = raw22_value;
			append(section16, t394);
			append(section16, p53);
			append(p53, t395);
			append(p53, em1);
			append(em1, t396);
			append(p53, t397);
			append(p53, strong12);
			append(strong12, t398);
			append(strong12, code76);
			append(code76, t399);
			append(strong12, t400);
			append(strong12, code77);
			append(code77, t401);
			append(strong12, t402);
			append(strong12, code78);
			append(code78, t403);
			append(strong12, t404);
			append(p53, t405);
			append(section16, t406);
			append(section16, p54);
			append(p54, t407);
			append(section16, t408);
			append(section16, pre23);
			pre23.innerHTML = raw23_value;
			append(section16, t409);
			append(section16, p55);
			append(p55, a54);
			append(a54, t410);
			append(section16, t411);
			append(section16, p56);
			append(p56, t412);
			append(p56, code79);
			append(code79, t413);
			append(p56, t414);
			append(p56, code80);
			append(code80, t415);
			append(p56, t416);
			append(p56, code81);
			append(code81, t417);
			append(p56, t418);
			append(section16, t419);
			append(section16, pre24);
			pre24.innerHTML = raw24_value;
			append(section16, t420);
			append(section16, p57);
			append(p57, t421);
			append(p57, a55);
			append(a55, t422);
			append(p57, t423);
			insert(target, t424, anchor);
			insert(target, section17, anchor);
			append(section17, h23);
			append(h23, a56);
			append(a56, t425);
			append(section17, t426);
			append(section17, p58);
			append(p58, t427);
			append(p58, code82);
			append(code82, t428);
			append(p58, t429);
			append(p58, code83);
			append(code83, t430);
			append(p58, t431);
			append(p58, code84);
			append(code84, t432);
			append(p58, t433);
			append(section17, t434);
			append(section17, p59);
			append(p59, t435);
			append(section17, t436);
			append(section17, p60);
			append(p60, t437);
			append(section17, t438);
			append(section17, p61);
			append(p61, t439);
			append(p61, a57);
			append(a57, t440);
			append(p61, t441);
			append(section17, t442);
			append(section17, p62);
			append(p62, t443);
			append(p62, a58);
			append(a58, t444);
			append(p62, t445);
			append(p62, a59);
			append(a59, t446);
			append(p62, t447);
			append(p62, a60);
			append(a60, t448);
			append(p62, t449);
			append(section17, t450);
			append(section17, p63);
			append(p63, strong13);
			append(strong13, t451);
			append(strong13, a61);
			append(a61, t452);
			append(strong13, t453);
		},
		p: noop,
		d(detaching) {
			if (detaching) detach(section0);
			if (detaching) detach(t17);
			if (detaching) detach(p0);
			if (detaching) detach(t21);
			if (detaching) detach(p1);
			if (detaching) detach(t28);
			if (detaching) detach(p2);
			if (detaching) detach(t30);
			if (detaching) detach(ul6);
			if (detaching) detach(t39);
			if (detaching) detach(p3);
			if (detaching) detach(t41);
			if (detaching) detach(section1);
			if (detaching) detach(t48);
			if (detaching) detach(section2);
			if (detaching) detach(t56);
			if (detaching) detach(section3);
			if (detaching) detach(t66);
			if (detaching) detach(section4);
			if (detaching) detach(t103);
			if (detaching) detach(section5);
			if (detaching) detach(t107);
			if (detaching) detach(section6);
			if (detaching) detach(t119);
			if (detaching) detach(section7);
			if (detaching) detach(t129);
			if (detaching) detach(section8);
			if (detaching) detach(t150);
			if (detaching) detach(section9);
			if (detaching) detach(t191);
			if (detaching) detach(section10);
			if (detaching) detach(t204);
			if (detaching) detach(section11);
			if (detaching) detach(t214);
			if (detaching) detach(section12);
			if (detaching) detach(t247);
			if (detaching) detach(section13);
			if (detaching) detach(t286);
			if (detaching) detach(section14);
			if (detaching) detach(t330);
			if (detaching) detach(section15);
			if (detaching) detach(t364);
			if (detaching) detach(section16);
			if (detaching) detach(t424);
			if (detaching) detach(section17);
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
	"title": "Compile Svelte in your head (Part 3)",
	"date": "2020-05-07T08:00:00Z",
	"tags": ["Svelte", "JavaScript"],
	"series": "Compile Svelte in your head",
	"slug": "compile-svelte-in-your-head-part-3",
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
