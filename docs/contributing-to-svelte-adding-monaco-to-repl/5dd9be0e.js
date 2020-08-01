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
					"@id": "https%3A%2F%2Flihautan.com%2Fcontributing-to-svelte-adding-monaco-to-repl",
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
			attr(meta11, "content", "https%3A%2F%2Flihautan.com%2Fcontributing-to-svelte-adding-monaco-to-repl");
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
							"@id": "https%3A%2F%2Flihautan.com%2Fcontributing-to-svelte-adding-monaco-to-repl",
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

/* content/blog/contributing-to-svelte-adding-monaco-to-repl/@@page-markup.svelte generated by Svelte v3.24.0 */

function create_default_slot(ctx) {
	let section0;
	let ul0;
	let li0;
	let a0;
	let t0;
	let ul1;
	let li1;
	let a1;
	let t1;
	let t2;
	let section1;
	let h1;
	let a2;
	let t3;
	let t4;
	let p0;
	let a3;
	let t5;
	let t6;
	let p1;
	let t7;
	let t8;
	let ul2;
	let li2;
	let t9;
	let t10;
	let p2;
	let t11;
	let t12;
	let ul3;
	let li3;
	let t13;
	let a4;
	let t14;
	let t15;
	let pre0;

	let raw0_value = `
<code class="language-js"><span class="token keyword">function</span> <span class="token function">changeTab</span><span class="token punctuation">(</span><span class="token parameter">selectedTabNode<span class="token punctuation">,</span> desiredModelId</span><span class="token punctuation">)</span> <span class="token punctuation">&#123;</span>
  <span class="token keyword">for</span> <span class="token punctuation">(</span><span class="token keyword">var</span> i <span class="token operator">=</span> <span class="token number">0</span><span class="token punctuation">;</span> i <span class="token operator">&lt;</span> tabArea<span class="token punctuation">.</span>childNodes<span class="token punctuation">.</span>length<span class="token punctuation">;</span> i<span class="token operator">++</span><span class="token punctuation">)</span> <span class="token punctuation">&#123;</span>
    <span class="token keyword">var</span> child <span class="token operator">=</span> tabArea<span class="token punctuation">.</span>childNodes<span class="token punctuation">[</span>i<span class="token punctuation">]</span><span class="token punctuation">;</span>
    <span class="token keyword">if</span> <span class="token punctuation">(</span><span class="token regex">/tab/</span><span class="token punctuation">.</span><span class="token function">test</span><span class="token punctuation">(</span>child<span class="token punctuation">.</span>className<span class="token punctuation">)</span><span class="token punctuation">)</span> <span class="token punctuation">&#123;</span>
      child<span class="token punctuation">.</span>className <span class="token operator">=</span> <span class="token string">'tab'</span><span class="token punctuation">;</span>
    <span class="token punctuation">&#125;</span>
  <span class="token punctuation">&#125;</span>
  selectedTabNode<span class="token punctuation">.</span>className <span class="token operator">=</span> <span class="token string">'tab active'</span><span class="token punctuation">;</span>

  <span class="token keyword">var</span> currentState <span class="token operator">=</span> editor<span class="token punctuation">.</span><span class="token function">saveViewState</span><span class="token punctuation">(</span><span class="token punctuation">)</span><span class="token punctuation">;</span>

  <span class="token keyword">var</span> currentModel <span class="token operator">=</span> editor<span class="token punctuation">.</span><span class="token function">getModel</span><span class="token punctuation">(</span><span class="token punctuation">)</span><span class="token punctuation">;</span>
  <span class="token keyword">if</span> <span class="token punctuation">(</span>currentModel <span class="token operator">===</span> data<span class="token punctuation">.</span>js<span class="token punctuation">.</span>model<span class="token punctuation">)</span> <span class="token punctuation">&#123;</span>
    data<span class="token punctuation">.</span>js<span class="token punctuation">.</span>state <span class="token operator">=</span> currentState<span class="token punctuation">;</span>
  <span class="token punctuation">&#125;</span> <span class="token keyword">else</span> <span class="token keyword">if</span> <span class="token punctuation">(</span>currentModel <span class="token operator">===</span> data<span class="token punctuation">.</span>css<span class="token punctuation">.</span>model<span class="token punctuation">)</span> <span class="token punctuation">&#123;</span>
    data<span class="token punctuation">.</span>css<span class="token punctuation">.</span>state <span class="token operator">=</span> currentState<span class="token punctuation">;</span>
  <span class="token punctuation">&#125;</span> <span class="token keyword">else</span> <span class="token keyword">if</span> <span class="token punctuation">(</span>currentModel <span class="token operator">===</span> data<span class="token punctuation">.</span>html<span class="token punctuation">.</span>model<span class="token punctuation">)</span> <span class="token punctuation">&#123;</span>
    data<span class="token punctuation">.</span>html<span class="token punctuation">.</span>state <span class="token operator">=</span> currentState<span class="token punctuation">;</span>
  <span class="token punctuation">&#125;</span>

  editor<span class="token punctuation">.</span><span class="token function">setModel</span><span class="token punctuation">(</span>data<span class="token punctuation">[</span>desiredModelId<span class="token punctuation">]</span><span class="token punctuation">.</span>model<span class="token punctuation">)</span><span class="token punctuation">;</span>
  editor<span class="token punctuation">.</span><span class="token function">restoreViewState</span><span class="token punctuation">(</span>data<span class="token punctuation">[</span>desiredModelId<span class="token punctuation">]</span><span class="token punctuation">.</span>state<span class="token punctuation">)</span><span class="token punctuation">;</span>
  editor<span class="token punctuation">.</span><span class="token function">focus</span><span class="token punctuation">(</span><span class="token punctuation">)</span><span class="token punctuation">;</span>
<span class="token punctuation">&#125;</span></code>` + "";

	let t16;
	let pre1;

	let raw1_value = `
<code class="language-js"><span class="token function">loadSample</span><span class="token punctuation">(</span>sampleId<span class="token punctuation">,</span> <span class="token keyword">function</span> <span class="token punctuation">(</span><span class="token parameter">err<span class="token punctuation">,</span> sample</span><span class="token punctuation">)</span> <span class="token punctuation">&#123;</span>
  <span class="token keyword">if</span> <span class="token punctuation">(</span>err<span class="token punctuation">)</span> <span class="token punctuation">&#123;</span>
    <span class="token function">alert</span><span class="token punctuation">(</span><span class="token string">'Sample not found! '</span> <span class="token operator">+</span> err<span class="token punctuation">.</span>message<span class="token punctuation">)</span><span class="token punctuation">;</span>
    <span class="token keyword">return</span><span class="token punctuation">;</span>
  <span class="token punctuation">&#125;</span>
  <span class="token keyword">if</span> <span class="token punctuation">(</span>myToken <span class="token operator">!==</span> currentToken<span class="token punctuation">)</span> <span class="token punctuation">&#123;</span>
    <span class="token keyword">return</span><span class="token punctuation">;</span>
  <span class="token punctuation">&#125;</span>
  data<span class="token punctuation">.</span>js<span class="token punctuation">.</span>model<span class="token punctuation">.</span><span class="token function">setValue</span><span class="token punctuation">(</span>sample<span class="token punctuation">.</span>js<span class="token punctuation">)</span><span class="token punctuation">;</span>
  data<span class="token punctuation">.</span>html<span class="token punctuation">.</span>model<span class="token punctuation">.</span><span class="token function">setValue</span><span class="token punctuation">(</span>sample<span class="token punctuation">.</span>html<span class="token punctuation">)</span><span class="token punctuation">;</span>
  data<span class="token punctuation">.</span>css<span class="token punctuation">.</span>model<span class="token punctuation">.</span><span class="token function">setValue</span><span class="token punctuation">(</span>sample<span class="token punctuation">.</span>css<span class="token punctuation">)</span><span class="token punctuation">;</span>
  editor<span class="token punctuation">.</span><span class="token function">setScrollTop</span><span class="token punctuation">(</span><span class="token number">0</span><span class="token punctuation">)</span><span class="token punctuation">;</span>
  <span class="token function">run</span><span class="token punctuation">(</span><span class="token punctuation">)</span><span class="token punctuation">;</span>
<span class="token punctuation">&#125;</span><span class="token punctuation">)</span><span class="token punctuation">;</span></code>` + "";

	let t17;
	let pre2;

	let raw2_value = `
<code class="language-js">
		data<span class="token punctuation">.</span>js<span class="token punctuation">.</span>model <span class="token operator">=</span> monaco<span class="token punctuation">.</span>editor<span class="token punctuation">.</span><span class="token function">createModel</span><span class="token punctuation">(</span><span class="token string">'console.log("hi")'</span><span class="token punctuation">,</span> <span class="token string">'javascript'</span><span class="token punctuation">)</span><span class="token punctuation">;</span>
		data<span class="token punctuation">.</span>css<span class="token punctuation">.</span>model <span class="token operator">=</span> monaco<span class="token punctuation">.</span>editor<span class="token punctuation">.</span><span class="token function">createModel</span><span class="token punctuation">(</span><span class="token string">'css'</span><span class="token punctuation">,</span> <span class="token string">'css'</span><span class="token punctuation">)</span><span class="token punctuation">;</span>
		data<span class="token punctuation">.</span>html<span class="token punctuation">.</span>model <span class="token operator">=</span> monaco<span class="token punctuation">.</span>editor<span class="token punctuation">.</span><span class="token function">createModel</span><span class="token punctuation">(</span><span class="token string">'html'</span><span class="token punctuation">,</span> <span class="token string">'html'</span><span class="token punctuation">)</span><span class="token punctuation">;</span>

		editor <span class="token operator">=</span> monaco<span class="token punctuation">.</span>editor<span class="token punctuation">.</span><span class="token function">create</span><span class="token punctuation">(</span>editorContainer<span class="token punctuation">,</span> <span class="token punctuation">&#123;</span>
			model<span class="token punctuation">:</span> data<span class="token punctuation">.</span>js<span class="token punctuation">.</span>model<span class="token punctuation">,</span>
			minimap<span class="token punctuation">:</span> <span class="token punctuation">&#123;</span>
				enabled<span class="token punctuation">:</span> <span class="token boolean">false</span>
			<span class="token punctuation">&#125;</span>
		<span class="token punctuation">&#125;</span><span class="token punctuation">)</span><span class="token punctuation">;</span></code>` + "";

	let t18;
	let ul4;
	let li4;
	let t19;
	let t20;
	let li5;
	let t21;
	let t22;
	let p3;
	let t23;
	let t24;
	let ul5;
	let li6;
	let p4;
	let t25;
	let t26;
	let li7;
	let p5;
	let t27;
	let t28;
	let li8;
	let p6;
	let t29;
	let t30;
	let li9;
	let p7;
	let t31;
	let t32;
	let pre3;

	let raw3_value = `
<code class="language-js">editor<span class="token punctuation">.</span>onDidChangeModelContent</code>` + "";

	let t33;
	let section2;
	let h2;
	let a5;
	let t34;
	let t35;
	let p8;
	let t36;
	let t37;
	let ul7;
	let li13;
	let p9;
	let a6;
	let t38;
	let t39;
	let ul6;
	let li10;
	let t40;
	let t41;
	let li11;
	let t42;
	let t43;
	let li12;
	let t44;
	let t45;
	let li14;
	let p10;
	let a7;
	let t46;
	let t47;
	let li15;
	let p11;
	let t48;
	let t49;
	let p12;
	let t50;
	let a8;
	let t51;
	let t52;
	let ul9;
	let li17;
	let t53;
	let ul8;
	let li16;
	let a9;
	let t54;

	return {
		c() {
			section0 = element("section");
			ul0 = element("ul");
			li0 = element("li");
			a0 = element("a");
			t0 = text("monaco samples:");
			ul1 = element("ul");
			li1 = element("li");
			a1 = element("a");
			t1 = text("syntax highlighting");
			t2 = space();
			section1 = element("section");
			h1 = element("h1");
			a2 = element("a");
			t3 = text("monaco samples:");
			t4 = space();
			p0 = element("p");
			a3 = element("a");
			t5 = text("https://github.com/microsoft/monaco-editor-samples/blob/master/browser-amd-monarch/index.html");
			t6 = space();
			p1 = element("p");
			t7 = text("tab + history undo buffer");
			t8 = space();
			ul2 = element("ul");
			li2 = element("li");
			t9 = text("link to issues that was fixed previously");
			t10 = space();
			p2 = element("p");
			t11 = text("get inspiration from the playground");
			t12 = space();
			ul3 = element("ul");
			li3 = element("li");
			t13 = text("it has 3 tabs\n");
			a4 = element("a");
			t14 = text("https://microsoft.github.io/monaco-editor/playground.html");
			t15 = space();
			pre0 = element("pre");
			t16 = space();
			pre1 = element("pre");
			t17 = space();
			pre2 = element("pre");
			t18 = space();
			ul4 = element("ul");
			li4 = element("li");
			t19 = text("how to add svlete language server into it");
			t20 = space();
			li5 = element("li");
			t21 = text("markdown");
			t22 = space();
			p3 = element("p");
			t23 = text("** store as global variable");
			t24 = space();
			ul5 = element("ul");
			li6 = element("li");
			p4 = element("p");
			t25 = text("window.xxx");
			t26 = space();
			li7 = element("li");
			p5 = element("p");
			t27 = text("right-click, \"store as global variable\"\nquickly test out apis, without having to wait for reload");
			t28 = space();
			li8 = element("li");
			p6 = element("p");
			t29 = text("allow switching tabs\ncreate new model on new tab / init\nstore the state when switching tabs\nrestore state upon selecting tabs");
			t30 = space();
			li9 = element("li");
			p7 = element("p");
			t31 = text("listen to changes");
			t32 = space();
			pre3 = element("pre");
			t33 = space();
			section2 = element("section");
			h2 = element("h2");
			a5 = element("a");
			t34 = text("syntax highlighting");
			t35 = space();
			p8 = element("p");
			t36 = text("this is rough man");
			t37 = space();
			ul7 = element("ul");
			li13 = element("li");
			p9 = element("p");
			a6 = element("a");
			t38 = text("https://gearset.com/blog/writing-an-open-source-apex-syntax-highlighter-for-monaco-editor");
			t39 = space();
			ul6 = element("ul");
			li10 = element("li");
			t40 = text("vs code vs monaco");
			t41 = space();
			li11 = element("li");
			t42 = text("text mate grammars, language servers, monarch grammars");
			t43 = space();
			li12 = element("li");
			t44 = text("native library");
			t45 = space();
			li14 = element("li");
			p10 = element("p");
			a7 = element("a");
			t46 = text("https://github.com/microsoft/monaco-editor/issues/171");
			t47 = space();
			li15 = element("li");
			p11 = element("p");
			t48 = text("implement a monaco language, shouldn't be hard? 🤷‍♂️");
			t49 = space();
			p12 = element("p");
			t50 = text("playground ");
			a8 = element("a");
			t51 = text("https://microsoft.github.io/monaco-editor/monarch.html");
			t52 = space();
			ul9 = element("ul");
			li17 = element("li");
			t53 = text("proxy based language server");
			ul8 = element("ul");
			li16 = element("li");
			a9 = element("a");
			t54 = text("https://medium.com/dscddu/language-server-protocol-adding-support-for-multiple-language-servers-to-monaco-editor-a3c35e42a98d");
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
			t0 = claim_text(a0_nodes, "monaco samples:");
			a0_nodes.forEach(detach);
			li0_nodes.forEach(detach);
			ul1 = claim_element(section0_nodes, "UL", {});
			var ul1_nodes = children(ul1);
			li1 = claim_element(ul1_nodes, "LI", {});
			var li1_nodes = children(li1);
			a1 = claim_element(li1_nodes, "A", { href: true });
			var a1_nodes = children(a1);
			t1 = claim_text(a1_nodes, "syntax highlighting");
			a1_nodes.forEach(detach);
			li1_nodes.forEach(detach);
			ul1_nodes.forEach(detach);
			section0_nodes.forEach(detach);
			t2 = claim_space(nodes);
			section1 = claim_element(nodes, "SECTION", {});
			var section1_nodes = children(section1);
			h1 = claim_element(section1_nodes, "H1", {});
			var h1_nodes = children(h1);
			a2 = claim_element(h1_nodes, "A", { href: true, id: true });
			var a2_nodes = children(a2);
			t3 = claim_text(a2_nodes, "monaco samples:");
			a2_nodes.forEach(detach);
			h1_nodes.forEach(detach);
			t4 = claim_space(section1_nodes);
			p0 = claim_element(section1_nodes, "P", {});
			var p0_nodes = children(p0);
			a3 = claim_element(p0_nodes, "A", { href: true, rel: true });
			var a3_nodes = children(a3);
			t5 = claim_text(a3_nodes, "https://github.com/microsoft/monaco-editor-samples/blob/master/browser-amd-monarch/index.html");
			a3_nodes.forEach(detach);
			p0_nodes.forEach(detach);
			t6 = claim_space(section1_nodes);
			p1 = claim_element(section1_nodes, "P", {});
			var p1_nodes = children(p1);
			t7 = claim_text(p1_nodes, "tab + history undo buffer");
			p1_nodes.forEach(detach);
			t8 = claim_space(section1_nodes);
			ul2 = claim_element(section1_nodes, "UL", {});
			var ul2_nodes = children(ul2);
			li2 = claim_element(ul2_nodes, "LI", {});
			var li2_nodes = children(li2);
			t9 = claim_text(li2_nodes, "link to issues that was fixed previously");
			li2_nodes.forEach(detach);
			ul2_nodes.forEach(detach);
			t10 = claim_space(section1_nodes);
			p2 = claim_element(section1_nodes, "P", {});
			var p2_nodes = children(p2);
			t11 = claim_text(p2_nodes, "get inspiration from the playground");
			p2_nodes.forEach(detach);
			t12 = claim_space(section1_nodes);
			ul3 = claim_element(section1_nodes, "UL", {});
			var ul3_nodes = children(ul3);
			li3 = claim_element(ul3_nodes, "LI", {});
			var li3_nodes = children(li3);
			t13 = claim_text(li3_nodes, "it has 3 tabs\n");
			a4 = claim_element(li3_nodes, "A", { href: true, rel: true });
			var a4_nodes = children(a4);
			t14 = claim_text(a4_nodes, "https://microsoft.github.io/monaco-editor/playground.html");
			a4_nodes.forEach(detach);
			li3_nodes.forEach(detach);
			ul3_nodes.forEach(detach);
			t15 = claim_space(section1_nodes);
			pre0 = claim_element(section1_nodes, "PRE", { class: true });
			var pre0_nodes = children(pre0);
			pre0_nodes.forEach(detach);
			t16 = claim_space(section1_nodes);
			pre1 = claim_element(section1_nodes, "PRE", { class: true });
			var pre1_nodes = children(pre1);
			pre1_nodes.forEach(detach);
			t17 = claim_space(section1_nodes);
			pre2 = claim_element(section1_nodes, "PRE", { class: true });
			var pre2_nodes = children(pre2);
			pre2_nodes.forEach(detach);
			t18 = claim_space(section1_nodes);
			ul4 = claim_element(section1_nodes, "UL", {});
			var ul4_nodes = children(ul4);
			li4 = claim_element(ul4_nodes, "LI", {});
			var li4_nodes = children(li4);
			t19 = claim_text(li4_nodes, "how to add svlete language server into it");
			li4_nodes.forEach(detach);
			t20 = claim_space(ul4_nodes);
			li5 = claim_element(ul4_nodes, "LI", {});
			var li5_nodes = children(li5);
			t21 = claim_text(li5_nodes, "markdown");
			li5_nodes.forEach(detach);
			ul4_nodes.forEach(detach);
			t22 = claim_space(section1_nodes);
			p3 = claim_element(section1_nodes, "P", {});
			var p3_nodes = children(p3);
			t23 = claim_text(p3_nodes, "** store as global variable");
			p3_nodes.forEach(detach);
			t24 = claim_space(section1_nodes);
			ul5 = claim_element(section1_nodes, "UL", {});
			var ul5_nodes = children(ul5);
			li6 = claim_element(ul5_nodes, "LI", {});
			var li6_nodes = children(li6);
			p4 = claim_element(li6_nodes, "P", {});
			var p4_nodes = children(p4);
			t25 = claim_text(p4_nodes, "window.xxx");
			p4_nodes.forEach(detach);
			li6_nodes.forEach(detach);
			t26 = claim_space(ul5_nodes);
			li7 = claim_element(ul5_nodes, "LI", {});
			var li7_nodes = children(li7);
			p5 = claim_element(li7_nodes, "P", {});
			var p5_nodes = children(p5);
			t27 = claim_text(p5_nodes, "right-click, \"store as global variable\"\nquickly test out apis, without having to wait for reload");
			p5_nodes.forEach(detach);
			li7_nodes.forEach(detach);
			t28 = claim_space(ul5_nodes);
			li8 = claim_element(ul5_nodes, "LI", {});
			var li8_nodes = children(li8);
			p6 = claim_element(li8_nodes, "P", {});
			var p6_nodes = children(p6);
			t29 = claim_text(p6_nodes, "allow switching tabs\ncreate new model on new tab / init\nstore the state when switching tabs\nrestore state upon selecting tabs");
			p6_nodes.forEach(detach);
			li8_nodes.forEach(detach);
			t30 = claim_space(ul5_nodes);
			li9 = claim_element(ul5_nodes, "LI", {});
			var li9_nodes = children(li9);
			p7 = claim_element(li9_nodes, "P", {});
			var p7_nodes = children(p7);
			t31 = claim_text(p7_nodes, "listen to changes");
			p7_nodes.forEach(detach);
			li9_nodes.forEach(detach);
			ul5_nodes.forEach(detach);
			t32 = claim_space(section1_nodes);
			pre3 = claim_element(section1_nodes, "PRE", { class: true });
			var pre3_nodes = children(pre3);
			pre3_nodes.forEach(detach);
			section1_nodes.forEach(detach);
			t33 = claim_space(nodes);
			section2 = claim_element(nodes, "SECTION", {});
			var section2_nodes = children(section2);
			h2 = claim_element(section2_nodes, "H2", {});
			var h2_nodes = children(h2);
			a5 = claim_element(h2_nodes, "A", { href: true, id: true });
			var a5_nodes = children(a5);
			t34 = claim_text(a5_nodes, "syntax highlighting");
			a5_nodes.forEach(detach);
			h2_nodes.forEach(detach);
			t35 = claim_space(section2_nodes);
			p8 = claim_element(section2_nodes, "P", {});
			var p8_nodes = children(p8);
			t36 = claim_text(p8_nodes, "this is rough man");
			p8_nodes.forEach(detach);
			t37 = claim_space(section2_nodes);
			ul7 = claim_element(section2_nodes, "UL", {});
			var ul7_nodes = children(ul7);
			li13 = claim_element(ul7_nodes, "LI", {});
			var li13_nodes = children(li13);
			p9 = claim_element(li13_nodes, "P", {});
			var p9_nodes = children(p9);
			a6 = claim_element(p9_nodes, "A", { href: true, rel: true });
			var a6_nodes = children(a6);
			t38 = claim_text(a6_nodes, "https://gearset.com/blog/writing-an-open-source-apex-syntax-highlighter-for-monaco-editor");
			a6_nodes.forEach(detach);
			p9_nodes.forEach(detach);
			t39 = claim_space(li13_nodes);
			ul6 = claim_element(li13_nodes, "UL", {});
			var ul6_nodes = children(ul6);
			li10 = claim_element(ul6_nodes, "LI", {});
			var li10_nodes = children(li10);
			t40 = claim_text(li10_nodes, "vs code vs monaco");
			li10_nodes.forEach(detach);
			t41 = claim_space(ul6_nodes);
			li11 = claim_element(ul6_nodes, "LI", {});
			var li11_nodes = children(li11);
			t42 = claim_text(li11_nodes, "text mate grammars, language servers, monarch grammars");
			li11_nodes.forEach(detach);
			t43 = claim_space(ul6_nodes);
			li12 = claim_element(ul6_nodes, "LI", {});
			var li12_nodes = children(li12);
			t44 = claim_text(li12_nodes, "native library");
			li12_nodes.forEach(detach);
			ul6_nodes.forEach(detach);
			li13_nodes.forEach(detach);
			t45 = claim_space(ul7_nodes);
			li14 = claim_element(ul7_nodes, "LI", {});
			var li14_nodes = children(li14);
			p10 = claim_element(li14_nodes, "P", {});
			var p10_nodes = children(p10);
			a7 = claim_element(p10_nodes, "A", { href: true, rel: true });
			var a7_nodes = children(a7);
			t46 = claim_text(a7_nodes, "https://github.com/microsoft/monaco-editor/issues/171");
			a7_nodes.forEach(detach);
			p10_nodes.forEach(detach);
			li14_nodes.forEach(detach);
			t47 = claim_space(ul7_nodes);
			li15 = claim_element(ul7_nodes, "LI", {});
			var li15_nodes = children(li15);
			p11 = claim_element(li15_nodes, "P", {});
			var p11_nodes = children(p11);
			t48 = claim_text(p11_nodes, "implement a monaco language, shouldn't be hard? 🤷‍♂️");
			p11_nodes.forEach(detach);
			li15_nodes.forEach(detach);
			ul7_nodes.forEach(detach);
			t49 = claim_space(section2_nodes);
			p12 = claim_element(section2_nodes, "P", {});
			var p12_nodes = children(p12);
			t50 = claim_text(p12_nodes, "playground ");
			a8 = claim_element(p12_nodes, "A", { href: true, rel: true });
			var a8_nodes = children(a8);
			t51 = claim_text(a8_nodes, "https://microsoft.github.io/monaco-editor/monarch.html");
			a8_nodes.forEach(detach);
			p12_nodes.forEach(detach);
			t52 = claim_space(section2_nodes);
			ul9 = claim_element(section2_nodes, "UL", {});
			var ul9_nodes = children(ul9);
			li17 = claim_element(ul9_nodes, "LI", {});
			var li17_nodes = children(li17);
			t53 = claim_text(li17_nodes, "proxy based language server");
			ul8 = claim_element(li17_nodes, "UL", {});
			var ul8_nodes = children(ul8);
			li16 = claim_element(ul8_nodes, "LI", {});
			var li16_nodes = children(li16);
			a9 = claim_element(li16_nodes, "A", { href: true, rel: true });
			var a9_nodes = children(a9);
			t54 = claim_text(a9_nodes, "https://medium.com/dscddu/language-server-protocol-adding-support-for-multiple-language-servers-to-monaco-editor-a3c35e42a98d");
			a9_nodes.forEach(detach);
			li16_nodes.forEach(detach);
			ul8_nodes.forEach(detach);
			li17_nodes.forEach(detach);
			ul9_nodes.forEach(detach);
			section2_nodes.forEach(detach);
			this.h();
		},
		h() {
			attr(ul0, "class", "sitemap");
			attr(ul0, "id", "sitemap");
			attr(ul0, "role", "navigation");
			attr(ul0, "aria-label", "Table of Contents");
			attr(a0, "href", "#monaco-samples");
			attr(a1, "href", "#syntax-highlighting");
			attr(a2, "href", "#monaco-samples");
			attr(a2, "id", "monaco-samples");
			attr(a3, "href", "https://github.com/microsoft/monaco-editor-samples/blob/master/browser-amd-monarch/index.html");
			attr(a3, "rel", "nofollow");
			attr(a4, "href", "https://microsoft.github.io/monaco-editor/playground.html");
			attr(a4, "rel", "nofollow");
			attr(pre0, "class", "language-js");
			attr(pre1, "class", "language-js");
			attr(pre2, "class", "language-js");
			attr(pre3, "class", "language-js");
			attr(a5, "href", "#syntax-highlighting");
			attr(a5, "id", "syntax-highlighting");
			attr(a6, "href", "https://gearset.com/blog/writing-an-open-source-apex-syntax-highlighter-for-monaco-editor");
			attr(a6, "rel", "nofollow");
			attr(a7, "href", "https://github.com/microsoft/monaco-editor/issues/171");
			attr(a7, "rel", "nofollow");
			attr(a8, "href", "https://microsoft.github.io/monaco-editor/monarch.html");
			attr(a8, "rel", "nofollow");
			attr(a9, "href", "https://medium.com/dscddu/language-server-protocol-adding-support-for-multiple-language-servers-to-monaco-editor-a3c35e42a98d");
			attr(a9, "rel", "nofollow");
		},
		m(target, anchor) {
			insert(target, section0, anchor);
			append(section0, ul0);
			append(section0, li0);
			append(li0, a0);
			append(a0, t0);
			append(section0, ul1);
			append(ul1, li1);
			append(li1, a1);
			append(a1, t1);
			insert(target, t2, anchor);
			insert(target, section1, anchor);
			append(section1, h1);
			append(h1, a2);
			append(a2, t3);
			append(section1, t4);
			append(section1, p0);
			append(p0, a3);
			append(a3, t5);
			append(section1, t6);
			append(section1, p1);
			append(p1, t7);
			append(section1, t8);
			append(section1, ul2);
			append(ul2, li2);
			append(li2, t9);
			append(section1, t10);
			append(section1, p2);
			append(p2, t11);
			append(section1, t12);
			append(section1, ul3);
			append(ul3, li3);
			append(li3, t13);
			append(li3, a4);
			append(a4, t14);
			append(section1, t15);
			append(section1, pre0);
			pre0.innerHTML = raw0_value;
			append(section1, t16);
			append(section1, pre1);
			pre1.innerHTML = raw1_value;
			append(section1, t17);
			append(section1, pre2);
			pre2.innerHTML = raw2_value;
			append(section1, t18);
			append(section1, ul4);
			append(ul4, li4);
			append(li4, t19);
			append(ul4, t20);
			append(ul4, li5);
			append(li5, t21);
			append(section1, t22);
			append(section1, p3);
			append(p3, t23);
			append(section1, t24);
			append(section1, ul5);
			append(ul5, li6);
			append(li6, p4);
			append(p4, t25);
			append(ul5, t26);
			append(ul5, li7);
			append(li7, p5);
			append(p5, t27);
			append(ul5, t28);
			append(ul5, li8);
			append(li8, p6);
			append(p6, t29);
			append(ul5, t30);
			append(ul5, li9);
			append(li9, p7);
			append(p7, t31);
			append(section1, t32);
			append(section1, pre3);
			pre3.innerHTML = raw3_value;
			insert(target, t33, anchor);
			insert(target, section2, anchor);
			append(section2, h2);
			append(h2, a5);
			append(a5, t34);
			append(section2, t35);
			append(section2, p8);
			append(p8, t36);
			append(section2, t37);
			append(section2, ul7);
			append(ul7, li13);
			append(li13, p9);
			append(p9, a6);
			append(a6, t38);
			append(li13, t39);
			append(li13, ul6);
			append(ul6, li10);
			append(li10, t40);
			append(ul6, t41);
			append(ul6, li11);
			append(li11, t42);
			append(ul6, t43);
			append(ul6, li12);
			append(li12, t44);
			append(ul7, t45);
			append(ul7, li14);
			append(li14, p10);
			append(p10, a7);
			append(a7, t46);
			append(ul7, t47);
			append(ul7, li15);
			append(li15, p11);
			append(p11, t48);
			append(section2, t49);
			append(section2, p12);
			append(p12, t50);
			append(p12, a8);
			append(a8, t51);
			append(section2, t52);
			append(section2, ul9);
			append(ul9, li17);
			append(li17, t53);
			append(li17, ul8);
			append(ul8, li16);
			append(li16, a9);
			append(a9, t54);
		},
		p: noop,
		d(detaching) {
			if (detaching) detach(section0);
			if (detaching) detach(t2);
			if (detaching) detach(section1);
			if (detaching) detach(t33);
			if (detaching) detach(section2);
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
	"title": "adding monaco to the svelte repl",
	"date": "2020-03-22T08:00:00Z",
	"tags": ["Svelte", "JavaScript"],
	"wip": true,
	"slug": "contributing-to-svelte-adding-monaco-to-repl",
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
