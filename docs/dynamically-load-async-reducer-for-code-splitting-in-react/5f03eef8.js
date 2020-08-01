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

var baseCss = "https://lihautan.com/dynamically-load-async-reducer-for-code-splitting-in-react/assets/_blog-299aa480.css";

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
					"@id": "https%3A%2F%2Flihautan.com%2Fdynamically-load-async-reducer-for-code-splitting-in-react",
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
			attr(meta11, "content", "https%3A%2F%2Flihautan.com%2Fdynamically-load-async-reducer-for-code-splitting-in-react");
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
							"@id": "https%3A%2F%2Flihautan.com%2Fdynamically-load-async-reducer-for-code-splitting-in-react",
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

/* content/blog/dynamically-load-async-reducer-for-code-splitting-in-react/@@page-markup.svelte generated by Svelte v3.24.0 */

function create_default_slot(ctx) {
	let section0;
	let ul0;
	let li0;
	let a0;
	let t0;
	let li1;
	let a1;
	let t1;
	let li2;
	let a2;
	let t2;
	let t3;
	let blockquote0;
	let p0;
	let t4;
	let t5;
	let hr;
	let t6;
	let section1;
	let h20;
	let a3;
	let t7;
	let t8;
	let p1;
	let t9;
	let t10;
	let ul1;
	let li3;
	let t11;
	let code0;
	let t12;
	let t13;
	let strong0;
	let t14;
	let t15;
	let t16;
	let li4;
	let t17;
	let code1;
	let t18;
	let t19;
	let code2;
	let t20;
	let t21;
	let li5;
	let t22;
	let t23;
	let li6;
	let a4;
	let t24;
	let t25;
	let t26;
	let p2;
	let t27;
	let t28;
	let pre0;

	let raw0_value = `
<code class="language-jsx"><span class="token comment">// root.js</span>
<span class="token keyword module">import</span> <span class="token maybe-class-name">React</span> <span class="token keyword module">from</span> <span class="token string">'react'</span><span class="token punctuation">;</span>
<span class="token keyword module">import</span> <span class="token punctuation">&#123;</span> <span class="token maybe-class-name">Provider</span> <span class="token punctuation">&#125;</span> <span class="token keyword module">from</span> <span class="token string">'react-redux'</span><span class="token punctuation">;</span>
<span class="token keyword module">import</span> <span class="token punctuation">&#123;</span> store <span class="token punctuation">&#125;</span> <span class="token keyword module">from</span>  <span class="token string">'./store'</span><span class="token punctuation">;</span>
<span class="token keyword module">import</span> <span class="token maybe-class-name">CustomComponent</span> <span class="token keyword module">from</span> <span class="token string">'./CustomComponent'</span><span class="token punctuation">;</span>

<span class="token keyword module">export</span> <span class="token keyword module">default</span> <span class="token keyword">function</span> <span class="token function"><span class="token maybe-class-name">App</span></span><span class="token punctuation">(</span><span class="token punctuation">)</span> <span class="token punctuation">&#123;</span>
  <span class="token keyword">return</span> <span class="token punctuation">(</span>
    <span class="token comment">// react-redux provider to provide the store in React context</span>
    <span class="token tag"><span class="token tag"><span class="token punctuation">&lt;</span><span class="token class-name">Provider</span></span> <span class="token attr-name">store</span><span class="token script language-javascript"><span class="token script-punctuation punctuation">=</span><span class="token punctuation">&#123;</span>store<span class="token punctuation">&#125;</span></span><span class="token punctuation">></span></span><span class="token plain-text">
      </span><span class="token tag"><span class="token tag"><span class="token punctuation">&lt;</span><span class="token class-name">CustomComponent</span></span> <span class="token punctuation">/></span></span><span class="token plain-text">
    </span><span class="token tag"><span class="token tag"><span class="token punctuation">&lt;/</span><span class="token class-name">Provider</span></span><span class="token punctuation">></span></span>
  <span class="token punctuation">)</span><span class="token punctuation">;</span>
<span class="token punctuation">&#125;</span>

<span class="token comment">// store.js</span>
<span class="token keyword module">import</span> <span class="token punctuation">&#123;</span> createStore<span class="token punctuation">,</span> combineReducers <span class="token punctuation">&#125;</span> <span class="token keyword module">from</span> <span class="token string">'redux'</span><span class="token punctuation">;</span>

<span class="token comment">// import all your reducers here</span>
<span class="token keyword module">import</span> reducerA <span class="token keyword module">from</span> <span class="token string">'./reducerA'</span><span class="token punctuation">;</span>
<span class="token keyword module">import</span> reducerB <span class="token keyword module">from</span> <span class="token string">'./reducerB'</span><span class="token punctuation">;</span>
<span class="token keyword module">import</span> reducerC <span class="token keyword module">from</span> <span class="token string">'./reducerC'</span><span class="token punctuation">;</span>

<span class="token comment">// combine all your reducers here</span>
<span class="token keyword">const</span> rootReducer <span class="token operator">=</span> <span class="token function">combineReducers</span><span class="token punctuation">(</span><span class="token punctuation">&#123;</span>
  reducerA<span class="token punctuation">:</span> reducerA<span class="token punctuation">,</span>
  reducerB<span class="token punctuation">:</span> reducerB<span class="token punctuation">,</span>
  reducerC<span class="token punctuation">:</span> reducerC<span class="token punctuation">,</span>
<span class="token punctuation">&#125;</span><span class="token punctuation">)</span><span class="token punctuation">;</span>

<span class="token comment">// create the redux store!</span>
<span class="token keyword module">export</span> <span class="token keyword">const</span> store <span class="token operator">=</span> <span class="token function">createStore</span><span class="token punctuation">(</span>rootReducer<span class="token punctuation">)</span><span class="token punctuation">;</span>

<span class="token comment">// CustomComponent.js</span>
<span class="token keyword module">import</span> <span class="token maybe-class-name">React</span> <span class="token keyword module">from</span> <span class="token string">'react'</span><span class="token punctuation">;</span>
<span class="token keyword module">import</span> <span class="token punctuation">&#123;</span> connect <span class="token punctuation">&#125;</span> <span class="token keyword module">from</span> <span class="token string">'react-redux'</span><span class="token punctuation">;</span>

<span class="token keyword">function</span> <span class="token function"><span class="token maybe-class-name">CustomComponent</span></span><span class="token punctuation">(</span><span class="token punctuation">)</span> <span class="token punctuation">&#123;</span>
  <span class="token keyword">return</span> <span class="token tag"><span class="token tag"><span class="token punctuation">&lt;</span>div</span><span class="token punctuation">></span></span><span class="token tag"><span class="token tag"><span class="token punctuation">&lt;/</span>div</span><span class="token punctuation">></span></span><span class="token punctuation">;</span>
<span class="token punctuation">&#125;</span>

<span class="token keyword">const</span> <span class="token function-variable function">mapStateToProps</span> <span class="token operator">=</span> <span class="token parameter">state</span> <span class="token arrow operator">=></span> <span class="token punctuation">&#123;</span> <span class="token keyword">return</span> <span class="token punctuation">&#123;</span><span class="token punctuation">&#125;</span><span class="token punctuation">;</span> <span class="token punctuation">&#125;</span><span class="token punctuation">;</span>
<span class="token keyword">const</span> <span class="token function-variable function">mapDispatchToProps</span> <span class="token operator">=</span> <span class="token parameter">dispatch</span> <span class="token arrow operator">=></span> <span class="token punctuation">(</span> <span class="token keyword">return</span> <span class="token punctuation">&#123;</span><span class="token punctuation">&#125;</span><span class="token punctuation">;</span> <span class="token punctuation">&#125;</span><span class="token punctuation">;</span>
<span class="token keyword module">export</span> <span class="token keyword module">default</span> <span class="token function">connect</span><span class="token punctuation">(</span>mapStateToProps<span class="token punctuation">,</span> mapDispatchToProps<span class="token punctuation">)</span><span class="token punctuation">(</span><span class="token maybe-class-name">CustomComponent</span><span class="token punctuation">)</span><span class="token punctuation">;</span></code>` + "";

	let t29;
	let section2;
	let h21;
	let a5;
	let t30;
	let t31;
	let p3;
	let t32;
	let t33;
	let p4;
	let t34;
	let t35;
	let section3;
	let h22;
	let a6;
	let t36;
	let t37;
	let p5;
	let t38;
	let a7;
	let t39;
	let t40;
	let t41;
	let p6;
	let t42;
	let a8;
	let t43;
	let t44;
	let t45;
	let blockquote1;
	let p7;
	let t46;
	let a9;
	let t47;
	let t48;
	let p8;
	let t49;
	let a10;
	let t50;
	let t51;
	let a11;
	let t52;
	let t53;
	let a12;
	let t54;
	let t55;
	let code3;
	let t56;
	let t57;
	let code4;
	let t58;
	let t59;
	let t60;
	let p9;
	let t61;
	let code5;
	let t62;
	let t63;
	let code6;
	let t64;
	let t65;
	let t66;
	let blockquote2;
	let p10;
	let t67;
	let t68;
	let p11;
	let t69;
	let a13;
	let t70;
	let t71;
	let t72;
	let blockquote3;
	let p12;
	let t73;
	let t74;
	let p13;
	let t75;
	let t76;
	let pre1;

	let raw1_value = `
<code class="language-jsx"><span class="token keyword module">import</span> <span class="token maybe-class-name">React</span> <span class="token keyword module">from</span> <span class="token string">'react'</span><span class="token punctuation">;</span>
<span class="token keyword module">import</span> gameReducer <span class="token keyword module">from</span> <span class="token string">'./gameReducer'</span><span class="token punctuation">;</span>
<span class="token keyword module">import</span> injectReducer <span class="token keyword module">from</span> <span class="token string">'inducer'</span><span class="token punctuation">;</span>

<span class="token keyword">class</span> <span class="token class-name">CustomComponent</span> <span class="token keyword">extends</span> <span class="token class-name">React<span class="token punctuation">.</span>Component</span> <span class="token punctuation">&#123;</span>
  <span class="token comment">// component logic here</span>
<span class="token punctuation">&#125;</span>
<span class="token keyword module">export</span> <span class="token keyword module">default</span> <span class="token function">injectReducer</span><span class="token punctuation">(</span><span class="token punctuation">&#123;</span>
  game<span class="token punctuation">:</span> gameReducer
<span class="token punctuation">&#125;</span><span class="token punctuation">)</span><span class="token punctuation">(</span><span class="token maybe-class-name">CustomComponent</span><span class="token punctuation">)</span><span class="token punctuation">;</span></code>` + "";

	let t77;
	let p14;
	let a14;
	let t78;
	let t79;
	let strong1;
	let t80;
	let t81;
	let strong2;
	let t82;
	let t83;
	let code7;
	let t84;
	let t85;
	let code8;
	let t86;
	let t87;
	let t88;
	let blockquote4;
	let p15;
	let t89;
	let t90;
	let p16;
	let t91;
	let code9;
	let t92;
	let t93;
	let t94;
	let pre2;

	let raw2_value = `
<code class="language-js"><span class="token maybe-class-name">InjectReducer</span><span class="token punctuation">.</span><span class="token property-access">contextTypes</span> <span class="token operator">=</span> <span class="token punctuation">&#123;</span>
  store<span class="token punctuation">:</span> <span class="token maybe-class-name">PropTypes</span><span class="token punctuation">.</span><span class="token method function property-access">shape</span><span class="token punctuation">(</span><span class="token punctuation">&#123;</span>
     replaceReducer<span class="token punctuation">:</span> <span class="token maybe-class-name">PropTypes</span><span class="token punctuation">.</span><span class="token property-access">func</span><span class="token punctuation">.</span><span class="token property-access">isRequired</span><span class="token punctuation">,</span>
  <span class="token punctuation">&#125;</span><span class="token punctuation">)</span><span class="token punctuation">,</span>
<span class="token punctuation">&#125;</span><span class="token punctuation">;</span></code>` + "";

	let t95;
	let p17;
	let t96;
	let a15;
	let t97;
	let t98;
	let t99;
	let p18;
	let t100;
	let code10;
	let t101;
	let t102;
	let code11;
	let t103;
	let t104;
	let t105;
	let p19;
	let t106;
	let a16;
	let t107;
	let t108;

	return {
		c() {
			section0 = element("section");
			ul0 = element("ul");
			li0 = element("li");
			a0 = element("a");
			t0 = text("Context");
			li1 = element("li");
			a1 = element("a");
			t1 = text("Problem");
			li2 = element("li");
			a2 = element("a");
			t2 = text("Solution");
			t3 = space();
			blockquote0 = element("blockquote");
			p0 = element("p");
			t4 = text("This article assumes you have basic knowledge on React and Redux. If you like to learn more about React or Redux, you can go here to learn more.");
			t5 = space();
			hr = element("hr");
			t6 = space();
			section1 = element("section");
			h20 = element("h2");
			a3 = element("a");
			t7 = text("Context");
			t8 = space();
			p1 = element("p");
			t9 = text("A common pattern to write a React Redux application is to have:");
			t10 = space();
			ul1 = element("ul");
			li3 = element("li");
			t11 = text("a ");
			code0 = element("code");
			t12 = text("rootReducer");
			t13 = text(" that imports ");
			strong0 = element("strong");
			t14 = text("all the reducers");
			t15 = text(" that will be used in the application");
			t16 = space();
			li4 = element("li");
			t17 = text("a ");
			code1 = element("code");
			t18 = text("reduxStore");
			t19 = text(" that is created using ");
			code2 = element("code");
			t20 = text("rootReducer");
			t21 = space();
			li5 = element("li");
			t22 = text("the React application");
			t23 = space();
			li6 = element("li");
			a4 = element("a");
			t24 = text("react-redux");
			t25 = text(" that bridge React components and Redux together");
			t26 = space();
			p2 = element("p");
			t27 = text("This is what its going to be look like in code:");
			t28 = space();
			pre0 = element("pre");
			t29 = space();
			section2 = element("section");
			h21 = element("h2");
			a5 = element("a");
			t30 = text("Problem");
			t31 = space();
			p3 = element("p");
			t32 = text("Everything seemed perfect, until your app size increases too fast…");
			t33 = space();
			p4 = element("p");
			t34 = text("It takes much longer time to load your web app, and things got worse with a crappy internet speed…");
			t35 = space();
			section3 = element("section");
			h22 = element("h2");
			a6 = element("a");
			t36 = text("Solution");
			t37 = space();
			p5 = element("p");
			t38 = text("I know you ");
			a7 = element("a");
			t39 = text("must have googled for the solution online.");
			t40 = text(" 😉");
			t41 = space();
			p6 = element("p");
			t42 = text("So, lets talk about one of the solutions that you can do to make your app bundle smaller  — ");
			a8 = element("a");
			t43 = text(" code splitting using webpack");
			t44 = text("!");
			t45 = space();
			blockquote1 = element("blockquote");
			p7 = element("p");
			t46 = text("Code splitting is one of the most compelling features of webpack. This feature allows you to split your code into various bundles which can then be loaded on demand or in parallel. It can be used to achieve smaller bundles and control resource load prioritization which, if used correctly, can have a major impact on load time. —");
			a9 = element("a");
			t47 = text(" webpack");
			t48 = space();
			p8 = element("p");
			t49 = text("Great! Webpack provides ");
			a10 = element("a");
			t50 = text("import()");
			t51 = text(" syntax, that conforms to the ");
			a11 = element("a");
			t52 = text("ECMAScript proposal");
			t53 = text(" for dynamic imports. Let’s try to split our code ");
			a12 = element("a");
			t54 = text("based on different entry points of your routes");
			t55 = text(". This makes perfect sense, user that goes to ");
			code3 = element("code");
			t56 = text("mywebsite/foo");
			t57 = text(" do not need code that is written only for ");
			code4 = element("code");
			t58 = text("mywebsite/bar");
			t59 = text("!");
			t60 = space();
			p9 = element("p");
			t61 = text("By now, you should realise, reducer that is written only for ");
			code5 = element("code");
			t62 = text("mywebsite/bar");
			t63 = text(", shouldn’t be imported or included when you are visiting ");
			code6 = element("code");
			t64 = text("mywebsite/foo");
			t65 = text("!");
			t66 = space();
			blockquote2 = element("blockquote");
			p10 = element("p");
			t67 = text("Then how do I dynamically load reducers for code splitting in a Redux application?");
			t68 = space();
			p11 = element("p");
			t69 = text("That’s a ");
			a13 = element("a");
			t70 = text("StackOverflow thread");
			t71 = text(" that you should read about.");
			t72 = space();
			blockquote3 = element("blockquote");
			p12 = element("p");
			t73 = text("There may be neater way of expressing this — I’m just showing the idea.");
			t74 = space();
			p13 = element("p");
			t75 = text("Yes, one of a neater way is to write a higher order component that takes care of dynamically loading of reducers.");
			t76 = space();
			pre1 = element("pre");
			t77 = space();
			p14 = element("p");
			a14 = element("a");
			t78 = text("inducer");
			t79 = text(" (read: ");
			strong1 = element("strong");
			t80 = text("In");
			t81 = text("ject Re");
			strong2 = element("strong");
			t82 = text("ducer");
			t83 = text(") gives you a HOC that will add you reducer to the Redux store that is currently using during ");
			code7 = element("code");
			t84 = text("componentWillMount");
			t85 = text(" and remove it during ");
			code8 = element("code");
			t86 = text("componentWillUnmount");
			t87 = text(". It’s that simple!");
			t88 = space();
			blockquote4 = element("blockquote");
			p15 = element("p");
			t89 = text("So, how does inducer actually works?");
			t90 = space();
			p16 = element("p");
			t91 = text("Firstly, inducer HOC gets the store from context, provided from the StoreProvider of ");
			code9 = element("code");
			t92 = text("react-redux");
			t93 = text(" .");
			t94 = space();
			pre2 = element("pre");
			t95 = space();
			p17 = element("p");
			t96 = text("Next, inducer HOC comes up with the new async root reducer that includes the reducer you want to include, and use ");
			a15 = element("a");
			t97 = text("replaceReducer");
			t98 = text(" from Redux to updates the reducer.");
			t99 = space();
			p18 = element("p");
			t100 = text("When ");
			code10 = element("code");
			t101 = text("componentWillUnmount");
			t102 = text(" inducer will remove your reducer and call ");
			code11 = element("code");
			t103 = text("replaceReducer");
			t104 = text(" again!");
			t105 = space();
			p19 = element("p");
			t106 = text("You can read the ");
			a16 = element("a");
			t107 = text("complete code");
			t108 = text(" here!");
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

			var ul0_nodes = children(ul0);
			li0 = claim_element(ul0_nodes, "LI", {});
			var li0_nodes = children(li0);
			a0 = claim_element(li0_nodes, "A", { href: true });
			var a0_nodes = children(a0);
			t0 = claim_text(a0_nodes, "Context");
			a0_nodes.forEach(detach);
			li0_nodes.forEach(detach);
			li1 = claim_element(ul0_nodes, "LI", {});
			var li1_nodes = children(li1);
			a1 = claim_element(li1_nodes, "A", { href: true });
			var a1_nodes = children(a1);
			t1 = claim_text(a1_nodes, "Problem");
			a1_nodes.forEach(detach);
			li1_nodes.forEach(detach);
			li2 = claim_element(ul0_nodes, "LI", {});
			var li2_nodes = children(li2);
			a2 = claim_element(li2_nodes, "A", { href: true });
			var a2_nodes = children(a2);
			t2 = claim_text(a2_nodes, "Solution");
			a2_nodes.forEach(detach);
			li2_nodes.forEach(detach);
			ul0_nodes.forEach(detach);
			section0_nodes.forEach(detach);
			t3 = claim_space(nodes);
			blockquote0 = claim_element(nodes, "BLOCKQUOTE", {});
			var blockquote0_nodes = children(blockquote0);
			p0 = claim_element(blockquote0_nodes, "P", {});
			var p0_nodes = children(p0);
			t4 = claim_text(p0_nodes, "This article assumes you have basic knowledge on React and Redux. If you like to learn more about React or Redux, you can go here to learn more.");
			p0_nodes.forEach(detach);
			blockquote0_nodes.forEach(detach);
			t5 = claim_space(nodes);
			hr = claim_element(nodes, "HR", {});
			t6 = claim_space(nodes);
			section1 = claim_element(nodes, "SECTION", {});
			var section1_nodes = children(section1);
			h20 = claim_element(section1_nodes, "H2", {});
			var h20_nodes = children(h20);
			a3 = claim_element(h20_nodes, "A", { href: true, id: true });
			var a3_nodes = children(a3);
			t7 = claim_text(a3_nodes, "Context");
			a3_nodes.forEach(detach);
			h20_nodes.forEach(detach);
			t8 = claim_space(section1_nodes);
			p1 = claim_element(section1_nodes, "P", {});
			var p1_nodes = children(p1);
			t9 = claim_text(p1_nodes, "A common pattern to write a React Redux application is to have:");
			p1_nodes.forEach(detach);
			t10 = claim_space(section1_nodes);
			ul1 = claim_element(section1_nodes, "UL", {});
			var ul1_nodes = children(ul1);
			li3 = claim_element(ul1_nodes, "LI", {});
			var li3_nodes = children(li3);
			t11 = claim_text(li3_nodes, "a ");
			code0 = claim_element(li3_nodes, "CODE", {});
			var code0_nodes = children(code0);
			t12 = claim_text(code0_nodes, "rootReducer");
			code0_nodes.forEach(detach);
			t13 = claim_text(li3_nodes, " that imports ");
			strong0 = claim_element(li3_nodes, "STRONG", {});
			var strong0_nodes = children(strong0);
			t14 = claim_text(strong0_nodes, "all the reducers");
			strong0_nodes.forEach(detach);
			t15 = claim_text(li3_nodes, " that will be used in the application");
			li3_nodes.forEach(detach);
			t16 = claim_space(ul1_nodes);
			li4 = claim_element(ul1_nodes, "LI", {});
			var li4_nodes = children(li4);
			t17 = claim_text(li4_nodes, "a ");
			code1 = claim_element(li4_nodes, "CODE", {});
			var code1_nodes = children(code1);
			t18 = claim_text(code1_nodes, "reduxStore");
			code1_nodes.forEach(detach);
			t19 = claim_text(li4_nodes, " that is created using ");
			code2 = claim_element(li4_nodes, "CODE", {});
			var code2_nodes = children(code2);
			t20 = claim_text(code2_nodes, "rootReducer");
			code2_nodes.forEach(detach);
			li4_nodes.forEach(detach);
			t21 = claim_space(ul1_nodes);
			li5 = claim_element(ul1_nodes, "LI", {});
			var li5_nodes = children(li5);
			t22 = claim_text(li5_nodes, "the React application");
			li5_nodes.forEach(detach);
			t23 = claim_space(ul1_nodes);
			li6 = claim_element(ul1_nodes, "LI", {});
			var li6_nodes = children(li6);
			a4 = claim_element(li6_nodes, "A", { href: true, rel: true });
			var a4_nodes = children(a4);
			t24 = claim_text(a4_nodes, "react-redux");
			a4_nodes.forEach(detach);
			t25 = claim_text(li6_nodes, " that bridge React components and Redux together");
			li6_nodes.forEach(detach);
			ul1_nodes.forEach(detach);
			t26 = claim_space(section1_nodes);
			p2 = claim_element(section1_nodes, "P", {});
			var p2_nodes = children(p2);
			t27 = claim_text(p2_nodes, "This is what its going to be look like in code:");
			p2_nodes.forEach(detach);
			t28 = claim_space(section1_nodes);
			pre0 = claim_element(section1_nodes, "PRE", { class: true });
			var pre0_nodes = children(pre0);
			pre0_nodes.forEach(detach);
			section1_nodes.forEach(detach);
			t29 = claim_space(nodes);
			section2 = claim_element(nodes, "SECTION", {});
			var section2_nodes = children(section2);
			h21 = claim_element(section2_nodes, "H2", {});
			var h21_nodes = children(h21);
			a5 = claim_element(h21_nodes, "A", { href: true, id: true });
			var a5_nodes = children(a5);
			t30 = claim_text(a5_nodes, "Problem");
			a5_nodes.forEach(detach);
			h21_nodes.forEach(detach);
			t31 = claim_space(section2_nodes);
			p3 = claim_element(section2_nodes, "P", {});
			var p3_nodes = children(p3);
			t32 = claim_text(p3_nodes, "Everything seemed perfect, until your app size increases too fast…");
			p3_nodes.forEach(detach);
			t33 = claim_space(section2_nodes);
			p4 = claim_element(section2_nodes, "P", {});
			var p4_nodes = children(p4);
			t34 = claim_text(p4_nodes, "It takes much longer time to load your web app, and things got worse with a crappy internet speed…");
			p4_nodes.forEach(detach);
			section2_nodes.forEach(detach);
			t35 = claim_space(nodes);
			section3 = claim_element(nodes, "SECTION", {});
			var section3_nodes = children(section3);
			h22 = claim_element(section3_nodes, "H2", {});
			var h22_nodes = children(h22);
			a6 = claim_element(h22_nodes, "A", { href: true, id: true });
			var a6_nodes = children(a6);
			t36 = claim_text(a6_nodes, "Solution");
			a6_nodes.forEach(detach);
			h22_nodes.forEach(detach);
			t37 = claim_space(section3_nodes);
			p5 = claim_element(section3_nodes, "P", {});
			var p5_nodes = children(p5);
			t38 = claim_text(p5_nodes, "I know you ");
			a7 = claim_element(p5_nodes, "A", { href: true, rel: true });
			var a7_nodes = children(a7);
			t39 = claim_text(a7_nodes, "must have googled for the solution online.");
			a7_nodes.forEach(detach);
			t40 = claim_text(p5_nodes, " 😉");
			p5_nodes.forEach(detach);
			t41 = claim_space(section3_nodes);
			p6 = claim_element(section3_nodes, "P", {});
			var p6_nodes = children(p6);
			t42 = claim_text(p6_nodes, "So, lets talk about one of the solutions that you can do to make your app bundle smaller  — ");
			a8 = claim_element(p6_nodes, "A", { href: true, rel: true });
			var a8_nodes = children(a8);
			t43 = claim_text(a8_nodes, " code splitting using webpack");
			a8_nodes.forEach(detach);
			t44 = claim_text(p6_nodes, "!");
			p6_nodes.forEach(detach);
			t45 = claim_space(section3_nodes);
			blockquote1 = claim_element(section3_nodes, "BLOCKQUOTE", {});
			var blockquote1_nodes = children(blockquote1);
			p7 = claim_element(blockquote1_nodes, "P", {});
			var p7_nodes = children(p7);
			t46 = claim_text(p7_nodes, "Code splitting is one of the most compelling features of webpack. This feature allows you to split your code into various bundles which can then be loaded on demand or in parallel. It can be used to achieve smaller bundles and control resource load prioritization which, if used correctly, can have a major impact on load time. —");
			a9 = claim_element(p7_nodes, "A", { href: true, rel: true });
			var a9_nodes = children(a9);
			t47 = claim_text(a9_nodes, " webpack");
			a9_nodes.forEach(detach);
			p7_nodes.forEach(detach);
			blockquote1_nodes.forEach(detach);
			t48 = claim_space(section3_nodes);
			p8 = claim_element(section3_nodes, "P", {});
			var p8_nodes = children(p8);
			t49 = claim_text(p8_nodes, "Great! Webpack provides ");
			a10 = claim_element(p8_nodes, "A", { href: true, rel: true });
			var a10_nodes = children(a10);
			t50 = claim_text(a10_nodes, "import()");
			a10_nodes.forEach(detach);
			t51 = claim_text(p8_nodes, " syntax, that conforms to the ");
			a11 = claim_element(p8_nodes, "A", { href: true, rel: true });
			var a11_nodes = children(a11);
			t52 = claim_text(a11_nodes, "ECMAScript proposal");
			a11_nodes.forEach(detach);
			t53 = claim_text(p8_nodes, " for dynamic imports. Let’s try to split our code ");
			a12 = claim_element(p8_nodes, "A", { href: true, rel: true });
			var a12_nodes = children(a12);
			t54 = claim_text(a12_nodes, "based on different entry points of your routes");
			a12_nodes.forEach(detach);
			t55 = claim_text(p8_nodes, ". This makes perfect sense, user that goes to ");
			code3 = claim_element(p8_nodes, "CODE", {});
			var code3_nodes = children(code3);
			t56 = claim_text(code3_nodes, "mywebsite/foo");
			code3_nodes.forEach(detach);
			t57 = claim_text(p8_nodes, " do not need code that is written only for ");
			code4 = claim_element(p8_nodes, "CODE", {});
			var code4_nodes = children(code4);
			t58 = claim_text(code4_nodes, "mywebsite/bar");
			code4_nodes.forEach(detach);
			t59 = claim_text(p8_nodes, "!");
			p8_nodes.forEach(detach);
			t60 = claim_space(section3_nodes);
			p9 = claim_element(section3_nodes, "P", {});
			var p9_nodes = children(p9);
			t61 = claim_text(p9_nodes, "By now, you should realise, reducer that is written only for ");
			code5 = claim_element(p9_nodes, "CODE", {});
			var code5_nodes = children(code5);
			t62 = claim_text(code5_nodes, "mywebsite/bar");
			code5_nodes.forEach(detach);
			t63 = claim_text(p9_nodes, ", shouldn’t be imported or included when you are visiting ");
			code6 = claim_element(p9_nodes, "CODE", {});
			var code6_nodes = children(code6);
			t64 = claim_text(code6_nodes, "mywebsite/foo");
			code6_nodes.forEach(detach);
			t65 = claim_text(p9_nodes, "!");
			p9_nodes.forEach(detach);
			t66 = claim_space(section3_nodes);
			blockquote2 = claim_element(section3_nodes, "BLOCKQUOTE", {});
			var blockquote2_nodes = children(blockquote2);
			p10 = claim_element(blockquote2_nodes, "P", {});
			var p10_nodes = children(p10);
			t67 = claim_text(p10_nodes, "Then how do I dynamically load reducers for code splitting in a Redux application?");
			p10_nodes.forEach(detach);
			blockquote2_nodes.forEach(detach);
			t68 = claim_space(section3_nodes);
			p11 = claim_element(section3_nodes, "P", {});
			var p11_nodes = children(p11);
			t69 = claim_text(p11_nodes, "That’s a ");
			a13 = claim_element(p11_nodes, "A", { href: true, rel: true });
			var a13_nodes = children(a13);
			t70 = claim_text(a13_nodes, "StackOverflow thread");
			a13_nodes.forEach(detach);
			t71 = claim_text(p11_nodes, " that you should read about.");
			p11_nodes.forEach(detach);
			t72 = claim_space(section3_nodes);
			blockquote3 = claim_element(section3_nodes, "BLOCKQUOTE", {});
			var blockquote3_nodes = children(blockquote3);
			p12 = claim_element(blockquote3_nodes, "P", {});
			var p12_nodes = children(p12);
			t73 = claim_text(p12_nodes, "There may be neater way of expressing this — I’m just showing the idea.");
			p12_nodes.forEach(detach);
			blockquote3_nodes.forEach(detach);
			t74 = claim_space(section3_nodes);
			p13 = claim_element(section3_nodes, "P", {});
			var p13_nodes = children(p13);
			t75 = claim_text(p13_nodes, "Yes, one of a neater way is to write a higher order component that takes care of dynamically loading of reducers.");
			p13_nodes.forEach(detach);
			t76 = claim_space(section3_nodes);
			pre1 = claim_element(section3_nodes, "PRE", { class: true });
			var pre1_nodes = children(pre1);
			pre1_nodes.forEach(detach);
			t77 = claim_space(section3_nodes);
			p14 = claim_element(section3_nodes, "P", {});
			var p14_nodes = children(p14);
			a14 = claim_element(p14_nodes, "A", { href: true, rel: true });
			var a14_nodes = children(a14);
			t78 = claim_text(a14_nodes, "inducer");
			a14_nodes.forEach(detach);
			t79 = claim_text(p14_nodes, " (read: ");
			strong1 = claim_element(p14_nodes, "STRONG", {});
			var strong1_nodes = children(strong1);
			t80 = claim_text(strong1_nodes, "In");
			strong1_nodes.forEach(detach);
			t81 = claim_text(p14_nodes, "ject Re");
			strong2 = claim_element(p14_nodes, "STRONG", {});
			var strong2_nodes = children(strong2);
			t82 = claim_text(strong2_nodes, "ducer");
			strong2_nodes.forEach(detach);
			t83 = claim_text(p14_nodes, ") gives you a HOC that will add you reducer to the Redux store that is currently using during ");
			code7 = claim_element(p14_nodes, "CODE", {});
			var code7_nodes = children(code7);
			t84 = claim_text(code7_nodes, "componentWillMount");
			code7_nodes.forEach(detach);
			t85 = claim_text(p14_nodes, " and remove it during ");
			code8 = claim_element(p14_nodes, "CODE", {});
			var code8_nodes = children(code8);
			t86 = claim_text(code8_nodes, "componentWillUnmount");
			code8_nodes.forEach(detach);
			t87 = claim_text(p14_nodes, ". It’s that simple!");
			p14_nodes.forEach(detach);
			t88 = claim_space(section3_nodes);
			blockquote4 = claim_element(section3_nodes, "BLOCKQUOTE", {});
			var blockquote4_nodes = children(blockquote4);
			p15 = claim_element(blockquote4_nodes, "P", {});
			var p15_nodes = children(p15);
			t89 = claim_text(p15_nodes, "So, how does inducer actually works?");
			p15_nodes.forEach(detach);
			blockquote4_nodes.forEach(detach);
			t90 = claim_space(section3_nodes);
			p16 = claim_element(section3_nodes, "P", {});
			var p16_nodes = children(p16);
			t91 = claim_text(p16_nodes, "Firstly, inducer HOC gets the store from context, provided from the StoreProvider of ");
			code9 = claim_element(p16_nodes, "CODE", {});
			var code9_nodes = children(code9);
			t92 = claim_text(code9_nodes, "react-redux");
			code9_nodes.forEach(detach);
			t93 = claim_text(p16_nodes, " .");
			p16_nodes.forEach(detach);
			t94 = claim_space(section3_nodes);
			pre2 = claim_element(section3_nodes, "PRE", { class: true });
			var pre2_nodes = children(pre2);
			pre2_nodes.forEach(detach);
			t95 = claim_space(section3_nodes);
			p17 = claim_element(section3_nodes, "P", {});
			var p17_nodes = children(p17);
			t96 = claim_text(p17_nodes, "Next, inducer HOC comes up with the new async root reducer that includes the reducer you want to include, and use ");
			a15 = claim_element(p17_nodes, "A", { href: true, rel: true });
			var a15_nodes = children(a15);
			t97 = claim_text(a15_nodes, "replaceReducer");
			a15_nodes.forEach(detach);
			t98 = claim_text(p17_nodes, " from Redux to updates the reducer.");
			p17_nodes.forEach(detach);
			t99 = claim_space(section3_nodes);
			p18 = claim_element(section3_nodes, "P", {});
			var p18_nodes = children(p18);
			t100 = claim_text(p18_nodes, "When ");
			code10 = claim_element(p18_nodes, "CODE", {});
			var code10_nodes = children(code10);
			t101 = claim_text(code10_nodes, "componentWillUnmount");
			code10_nodes.forEach(detach);
			t102 = claim_text(p18_nodes, " inducer will remove your reducer and call ");
			code11 = claim_element(p18_nodes, "CODE", {});
			var code11_nodes = children(code11);
			t103 = claim_text(code11_nodes, "replaceReducer");
			code11_nodes.forEach(detach);
			t104 = claim_text(p18_nodes, " again!");
			p18_nodes.forEach(detach);
			t105 = claim_space(section3_nodes);
			p19 = claim_element(section3_nodes, "P", {});
			var p19_nodes = children(p19);
			t106 = claim_text(p19_nodes, "You can read the ");
			a16 = claim_element(p19_nodes, "A", { href: true, rel: true });
			var a16_nodes = children(a16);
			t107 = claim_text(a16_nodes, "complete code");
			a16_nodes.forEach(detach);
			t108 = claim_text(p19_nodes, " here!");
			p19_nodes.forEach(detach);
			section3_nodes.forEach(detach);
			this.h();
		},
		h() {
			attr(a0, "href", "#context");
			attr(a1, "href", "#problem");
			attr(a2, "href", "#solution");
			attr(ul0, "class", "sitemap");
			attr(ul0, "id", "sitemap");
			attr(ul0, "role", "navigation");
			attr(ul0, "aria-label", "Table of Contents");
			attr(a3, "href", "#context");
			attr(a3, "id", "context");
			attr(a4, "href", "https://github.com/reduxjs/react-redux");
			attr(a4, "rel", "nofollow");
			attr(pre0, "class", "language-jsx");
			attr(a5, "href", "#problem");
			attr(a5, "id", "problem");
			attr(a6, "href", "#solution");
			attr(a6, "id", "solution");
			attr(a7, "href", "http://lmgtfy.com/?q=code-splitting");
			attr(a7, "rel", "nofollow");
			attr(a8, "href", "https://webpack.js.org/guides/code-splitting/");
			attr(a8, "rel", "nofollow");
			attr(a9, "href", "https://webpack.js.org/guides/code-splitting/");
			attr(a9, "rel", "nofollow");
			attr(a10, "href", "https://webpack.js.org/guides/code-splitting/#dynamic-imports");
			attr(a10, "rel", "nofollow");
			attr(a11, "href", "https://github.com/tc39/proposal-dynamic-import");
			attr(a11, "rel", "nofollow");
			attr(a12, "href", "https://github.com/ReactTraining/react-router/blob/master/packages/react-router-dom/docs/guides/code-splitting.md");
			attr(a12, "rel", "nofollow");
			attr(a13, "href", "https://stackoverflow.com/questions/32968016/how-to-dynamically-load-reducers-for-code-splitting-in-a-redux-application");
			attr(a13, "rel", "nofollow");
			attr(pre1, "class", "language-jsx");
			attr(a14, "href", "https://www.npmjs.com/package/inducer");
			attr(a14, "rel", "nofollow");
			attr(pre2, "class", "language-js");
			attr(a15, "href", "https://redux.js.org/api/store#replaceReducer");
			attr(a15, "rel", "nofollow");
			attr(a16, "href", "https://github.com/tanhauhau/inducer/blob/master/src/index.js");
			attr(a16, "rel", "nofollow");
		},
		m(target, anchor) {
			insert(target, section0, anchor);
			append(section0, ul0);
			append(ul0, li0);
			append(li0, a0);
			append(a0, t0);
			append(ul0, li1);
			append(li1, a1);
			append(a1, t1);
			append(ul0, li2);
			append(li2, a2);
			append(a2, t2);
			insert(target, t3, anchor);
			insert(target, blockquote0, anchor);
			append(blockquote0, p0);
			append(p0, t4);
			insert(target, t5, anchor);
			insert(target, hr, anchor);
			insert(target, t6, anchor);
			insert(target, section1, anchor);
			append(section1, h20);
			append(h20, a3);
			append(a3, t7);
			append(section1, t8);
			append(section1, p1);
			append(p1, t9);
			append(section1, t10);
			append(section1, ul1);
			append(ul1, li3);
			append(li3, t11);
			append(li3, code0);
			append(code0, t12);
			append(li3, t13);
			append(li3, strong0);
			append(strong0, t14);
			append(li3, t15);
			append(ul1, t16);
			append(ul1, li4);
			append(li4, t17);
			append(li4, code1);
			append(code1, t18);
			append(li4, t19);
			append(li4, code2);
			append(code2, t20);
			append(ul1, t21);
			append(ul1, li5);
			append(li5, t22);
			append(ul1, t23);
			append(ul1, li6);
			append(li6, a4);
			append(a4, t24);
			append(li6, t25);
			append(section1, t26);
			append(section1, p2);
			append(p2, t27);
			append(section1, t28);
			append(section1, pre0);
			pre0.innerHTML = raw0_value;
			insert(target, t29, anchor);
			insert(target, section2, anchor);
			append(section2, h21);
			append(h21, a5);
			append(a5, t30);
			append(section2, t31);
			append(section2, p3);
			append(p3, t32);
			append(section2, t33);
			append(section2, p4);
			append(p4, t34);
			insert(target, t35, anchor);
			insert(target, section3, anchor);
			append(section3, h22);
			append(h22, a6);
			append(a6, t36);
			append(section3, t37);
			append(section3, p5);
			append(p5, t38);
			append(p5, a7);
			append(a7, t39);
			append(p5, t40);
			append(section3, t41);
			append(section3, p6);
			append(p6, t42);
			append(p6, a8);
			append(a8, t43);
			append(p6, t44);
			append(section3, t45);
			append(section3, blockquote1);
			append(blockquote1, p7);
			append(p7, t46);
			append(p7, a9);
			append(a9, t47);
			append(section3, t48);
			append(section3, p8);
			append(p8, t49);
			append(p8, a10);
			append(a10, t50);
			append(p8, t51);
			append(p8, a11);
			append(a11, t52);
			append(p8, t53);
			append(p8, a12);
			append(a12, t54);
			append(p8, t55);
			append(p8, code3);
			append(code3, t56);
			append(p8, t57);
			append(p8, code4);
			append(code4, t58);
			append(p8, t59);
			append(section3, t60);
			append(section3, p9);
			append(p9, t61);
			append(p9, code5);
			append(code5, t62);
			append(p9, t63);
			append(p9, code6);
			append(code6, t64);
			append(p9, t65);
			append(section3, t66);
			append(section3, blockquote2);
			append(blockquote2, p10);
			append(p10, t67);
			append(section3, t68);
			append(section3, p11);
			append(p11, t69);
			append(p11, a13);
			append(a13, t70);
			append(p11, t71);
			append(section3, t72);
			append(section3, blockquote3);
			append(blockquote3, p12);
			append(p12, t73);
			append(section3, t74);
			append(section3, p13);
			append(p13, t75);
			append(section3, t76);
			append(section3, pre1);
			pre1.innerHTML = raw1_value;
			append(section3, t77);
			append(section3, p14);
			append(p14, a14);
			append(a14, t78);
			append(p14, t79);
			append(p14, strong1);
			append(strong1, t80);
			append(p14, t81);
			append(p14, strong2);
			append(strong2, t82);
			append(p14, t83);
			append(p14, code7);
			append(code7, t84);
			append(p14, t85);
			append(p14, code8);
			append(code8, t86);
			append(p14, t87);
			append(section3, t88);
			append(section3, blockquote4);
			append(blockquote4, p15);
			append(p15, t89);
			append(section3, t90);
			append(section3, p16);
			append(p16, t91);
			append(p16, code9);
			append(code9, t92);
			append(p16, t93);
			append(section3, t94);
			append(section3, pre2);
			pre2.innerHTML = raw2_value;
			append(section3, t95);
			append(section3, p17);
			append(p17, t96);
			append(p17, a15);
			append(a15, t97);
			append(p17, t98);
			append(section3, t99);
			append(section3, p18);
			append(p18, t100);
			append(p18, code10);
			append(code10, t101);
			append(p18, t102);
			append(p18, code11);
			append(code11, t103);
			append(p18, t104);
			append(section3, t105);
			append(section3, p19);
			append(p19, t106);
			append(p19, a16);
			append(a16, t107);
			append(p19, t108);
		},
		p: noop,
		d(detaching) {
			if (detaching) detach(section0);
			if (detaching) detach(t3);
			if (detaching) detach(blockquote0);
			if (detaching) detach(t5);
			if (detaching) detach(hr);
			if (detaching) detach(t6);
			if (detaching) detach(section1);
			if (detaching) detach(t29);
			if (detaching) detach(section2);
			if (detaching) detach(t35);
			if (detaching) detach(section3);
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
	"title": "Dynamically load reducers for code splitting in a React Redux application",
	"date": "2017-11-16T08:00:00Z",
	"description": "How to inject reducer asynchronously",
	"slug": "dynamically-load-async-reducer-for-code-splitting-in-react",
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
