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
					"@id": "https%3A%2F%2Flihautan.com%2Fhydrating-text-content",
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
			attr(meta11, "content", "https%3A%2F%2Flihautan.com%2Fhydrating-text-content");
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
							"@id": "https%3A%2F%2Flihautan.com%2Fhydrating-text-content",
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

/* content/blog/hydrating-text-content/@@page-markup.svelte generated by Svelte v3.24.0 */

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
	let t8;
	let section1;
	let h20;
	let a8;
	let t9;
	let t10;
	let p0;
	let t11;
	let a9;
	let t12;
	let t13;
	let a10;
	let t14;
	let t15;
	let a11;
	let t16;
	let t17;
	let t18;
	let p1;
	let t19;
	let a12;
	let t20;
	let t21;
	let a13;
	let t22;
	let t23;
	let t24;
	let p2;
	let t25;
	let t26;
	let section2;
	let h21;
	let a14;
	let t27;
	let t28;
	let p3;
	let t29;
	let t30;
	let pre0;

	let raw0_value = `
<code class="language-">Text content did not match. Server: &quot;Count: 0&quot; Client: &quot;Count: &quot;</code>` + "";

	let t31;
	let p4;
	let t32;
	let t33;
	let pre1;

	let raw1_value = `
<code class="language-js"><span class="token keyword">function</span> <span class="token function"><span class="token maybe-class-name">App</span></span><span class="token punctuation">(</span><span class="token punctuation">)</span> <span class="token punctuation">&#123;</span>
  <span class="token keyword">const</span> <span class="token punctuation">[</span>count<span class="token punctuation">,</span> setCount<span class="token punctuation">]</span> <span class="token operator">=</span> <span class="token function">useState</span><span class="token punctuation">(</span><span class="token number">0</span><span class="token punctuation">)</span><span class="token punctuation">;</span>
  <span class="token keyword">return</span> <span class="token punctuation">(</span>
    <span class="token operator">&lt;</span>div<span class="token operator">></span>
      <span class="token operator">&lt;</span>div<span class="token operator">></span><span class="token maybe-class-name">Count</span><span class="token punctuation">:</span> <span class="token punctuation">&#123;</span>count<span class="token punctuation">&#125;</span><span class="token operator">&lt;</span><span class="token operator">/</span>div<span class="token operator">></span>
      <span class="token operator">&lt;</span>button onClick<span class="token operator">=</span><span class="token punctuation">&#123;</span><span class="token punctuation">(</span><span class="token punctuation">)</span> <span class="token arrow operator">=></span> <span class="token function">setCount</span><span class="token punctuation">(</span>count <span class="token operator">+</span> <span class="token number">1</span><span class="token punctuation">)</span><span class="token punctuation">&#125;</span><span class="token operator">></span><span class="token maybe-class-name">Increment</span><span class="token operator">&lt;</span><span class="token operator">/</span>button<span class="token operator">></span>
    <span class="token operator">&lt;</span><span class="token operator">/</span>div<span class="token operator">></span>
  <span class="token punctuation">)</span><span class="token punctuation">;</span>
<span class="token punctuation">&#125;</span></code>` + "";

	let t34;
	let p5;
	let t35;
	let t36;
	let p6;
	let t37;
	let t38;
	let p7;
	let t39;
	let t40;
	let section3;
	let h22;
	let a15;
	let t41;
	let t42;
	let p8;
	let t43;
	let t44;
	let pre2;

	let raw2_value = `
<code class="language-html"><span class="token tag"><span class="token tag"><span class="token punctuation">&lt;</span>div</span><span class="token punctuation">></span></span>
  <span class="token tag"><span class="token tag"><span class="token punctuation">&lt;</span>div</span><span class="token punctuation">></span></span>Count: 0<span class="token tag"><span class="token tag"><span class="token punctuation">&lt;/</span>div</span><span class="token punctuation">></span></span>
  <span class="token tag"><span class="token tag"><span class="token punctuation">&lt;</span>button</span><span class="token punctuation">></span></span>Increment<span class="token tag"><span class="token tag"><span class="token punctuation">&lt;/</span>button</span><span class="token punctuation">></span></span>
<span class="token tag"><span class="token tag"><span class="token punctuation">&lt;/</span>div</span><span class="token punctuation">></span></span></code>` + "";

	let t45;
	let p9;
	let t46;
	let t47;
	let p10;
	let t48;
	let t49;
	let pre3;

	let raw3_value = `
<code class="language-html"><span class="token comment">&lt;!-- disabled javascript --></span>
└─ <span class="token tag"><span class="token tag"><span class="token punctuation">&lt;</span>div</span><span class="token punctuation">></span></span>
    ├─ <span class="token tag"><span class="token tag"><span class="token punctuation">&lt;</span>div</span><span class="token punctuation">></span></span>
    │   └─ "Count: 0"
    └─ <span class="token tag"><span class="token tag"><span class="token punctuation">&lt;</span>button</span><span class="token punctuation">></span></span>
        └─ "Increment"</code>` + "";

	let t50;
	let pre4;

	let raw4_value = `
<code class="language-html"><span class="token comment">&lt;!-- enabled javascript --></span>
└─ <span class="token tag"><span class="token tag"><span class="token punctuation">&lt;</span>div</span><span class="token punctuation">></span></span>
    ├─ <span class="token tag"><span class="token tag"><span class="token punctuation">&lt;</span>div</span><span class="token punctuation">></span></span>
    │   ├─ "Count: "
    │   └─ "0"
    └─ <span class="token tag"><span class="token tag"><span class="token punctuation">&lt;</span>button</span><span class="token punctuation">></span></span>
        └─ "Increment"</code>` + "";

	let t51;
	let p11;
	let t52;
	let t53;
	let p12;
	let t54;
	let code0;
	let t55;
	let t56;
	let code1;
	let t57;
	let t58;
	let code2;
	let t59;
	let t60;
	let t61;
	let p13;
	let t62;
	let code3;
	let t63;
	let t64;
	let t65;
	let p14;
	let t66;
	let code4;
	let t67;
	let t68;
	let code5;
	let t69;
	let t70;
	let code6;
	let t71;
	let t72;
	let t73;
	let pre5;

	let raw5_value = `
<code class="language-jsx"><span class="token tag"><span class="token tag"><span class="token punctuation">&lt;</span>div</span><span class="token punctuation">></span></span><span class="token plain-text">
  </span><span class="token tag"><span class="token tag"><span class="token punctuation">&lt;</span>div</span><span class="token punctuation">></span></span><span class="token plain-text">Count: </span><span class="token punctuation">&#123;</span><span class="token number">0</span><span class="token punctuation">&#125;</span><span class="token tag"><span class="token tag"><span class="token punctuation">&lt;/</span>div</span><span class="token punctuation">></span></span><span class="token plain-text">
  </span><span class="token tag"><span class="token tag"><span class="token punctuation">&lt;</span>button</span> <span class="token attr-name">onClick</span><span class="token script language-javascript"><span class="token script-punctuation punctuation">=</span><span class="token punctuation">&#123;</span><span class="token punctuation">(</span><span class="token punctuation">)</span> <span class="token arrow operator">=></span> <span class="token function">setCount</span><span class="token punctuation">(</span><span class="token number">1</span><span class="token punctuation">)</span><span class="token punctuation">&#125;</span></span><span class="token punctuation">></span></span><span class="token plain-text">Increment</span><span class="token tag"><span class="token tag"><span class="token punctuation">&lt;/</span>button</span><span class="token punctuation">></span></span><span class="token plain-text">
</span><span class="token tag"><span class="token tag"><span class="token punctuation">&lt;/</span>div</span><span class="token punctuation">></span></span></code>` + "";

	let t74;
	let p15;
	let t75;
	let t76;
	let pre6;

	let raw6_value = `
<code class="language-js"><span class="token punctuation">&#123;</span>
  type<span class="token punctuation">:</span> <span class="token string">'div'</span><span class="token punctuation">,</span>
  props<span class="token punctuation">:</span> <span class="token punctuation">&#123;</span>
    children<span class="token punctuation">:</span> <span class="token punctuation">[</span><span class="token punctuation">&#123;</span>
      type<span class="token punctuation">:</span> <span class="token string">'div'</span><span class="token punctuation">,</span>
      props<span class="token punctuation">:</span> <span class="token punctuation">&#123;</span>
        children<span class="token punctuation">:</span> <span class="token punctuation">[</span>
          <span class="token string">'Count: '</span><span class="token punctuation">,</span>
          <span class="token number">0</span><span class="token punctuation">,</span>
        <span class="token punctuation">]</span><span class="token punctuation">,</span>
      <span class="token punctuation">&#125;</span><span class="token punctuation">,</span>
    <span class="token punctuation">&#125;</span><span class="token punctuation">,</span> <span class="token punctuation">&#123;</span>
      type<span class="token punctuation">:</span> <span class="token string">'button'</span><span class="token punctuation">,</span>
      props<span class="token punctuation">:</span> <span class="token punctuation">&#123;</span>
        <span class="token function-variable function">onClick</span><span class="token punctuation">:</span> <span class="token punctuation">(</span><span class="token punctuation">)</span> <span class="token arrow operator">=></span> <span class="token function">setCount</span><span class="token punctuation">(</span><span class="token number">0</span><span class="token punctuation">)</span><span class="token punctuation">,</span>
        children<span class="token punctuation">:</span> <span class="token punctuation">[</span>
          <span class="token string">'Increment'</span><span class="token punctuation">,</span>
        <span class="token punctuation">]</span><span class="token punctuation">,</span>
      <span class="token punctuation">&#125;</span><span class="token punctuation">,</span>
    <span class="token punctuation">&#125;</span><span class="token punctuation">]</span><span class="token punctuation">,</span>
  <span class="token punctuation">&#125;</span><span class="token punctuation">,</span>
<span class="token punctuation">&#125;</span></code>` + "";

	let t77;
	let p16;
	let t78;
	let code7;
	let t79;
	let t80;
	let t81;
	let p17;
	let t82;
	let code8;
	let t83;
	let t84;
	let t85;
	let p18;
	let t86;
	let t87;
	let p19;
	let t88;
	let code9;
	let t89;
	let t90;
	let code10;
	let t91;
	let t92;
	let t93;
	let pre7;

	let raw7_value = `
<code class="language-">Text content did not match. Server: &quot;Count: 0&quot; Client: &quot;Count: &quot;</code>` + "";

	let t94;
	let p20;
	let t95;
	let code11;
	let t96;
	let t97;
	let code12;
	let t98;
	let t99;
	let t100;
	let section4;
	let h23;
	let a16;
	let t101;
	let t102;
	let p21;
	let t103;
	let t104;
	let p22;
	let t105;
	let t106;
	let p23;
	let t107;
	let a17;
	let code13;
	let t108;
	let t109;
	let a18;
	let code14;
	let t110;
	let t111;
	let t112;
	let p24;
	let t113;
	let t114;
	let blockquote0;
	let p25;
	let t115;
	let code15;
	let t116;
	let t117;
	let code16;
	let t118;
	let t119;
	let t120;
	let p26;
	let t121;
	let t122;
	let p27;
	let t123;
	let a19;
	let code17;
	let t124;
	let t125;
	let a20;
	let code18;
	let t126;
	let t127;
	let t128;
	let p28;
	let t129;
	let a21;
	let code19;
	let t130;
	let t131;
	let t132;
	let pre8;

	let raw8_value = `
<code class="language-diff"><span class="token deleted-sign deleted">- &lt;div>
</span><span class="token inserted-sign inserted">+ &lt;div data-reactroot="">
</span><span class="token deleted-sign deleted">-  &lt;div>Count: 0&lt;/div>
</span><span class="token inserted-sign inserted">+  &lt;div>Count: &lt;!-- -->0&lt;/div>
</span><span class="token unchanged">  &lt;button>Increment&lt;/button>
</span><span class="token deleted-arrow deleted">&lt;/div></span></code>` + "";

	let t133;
	let p29;
	let t134;
	let code20;
	let t135;
	let t136;
	let a22;
	let t137;
	let code21;
	let t138;
	let t139;
	let code22;
	let t140;
	let t141;
	let t142;
	let p30;
	let t143;
	let code23;
	let t144;
	let t145;
	let code24;
	let t146;
	let t147;
	let t148;
	let pre9;

	let raw9_value = `
<code class="language-html"><span class="token comment">&lt;!-- disabled javascript --></span>
└─ <span class="token tag"><span class="token tag"><span class="token punctuation">&lt;</span>div</span><span class="token punctuation">></span></span>
    ├─ <span class="token tag"><span class="token tag"><span class="token punctuation">&lt;</span>div</span><span class="token punctuation">></span></span>
    │   ├─ "Count: "
    │   ├─ <span class="token comment">&lt;!-- --></span>
    │   └─ "0"
    └─ <span class="token tag"><span class="token tag"><span class="token punctuation">&lt;</span>button</span><span class="token punctuation">></span></span>
        └─ "Increment"</code>` + "";

	let t149;
	let p31;
	let t150;
	let a23;
	let t151;
	let t152;
	let t153;
	let p32;
	let t154;
	let t155;
	let p33;
	let t156;
	let a24;
	let t157;
	let t158;
	let t159;
	let section5;
	let h24;
	let a25;
	let t160;
	let t161;
	let p34;
	let t162;
	let a26;
	let t163;
	let t164;
	let t165;
	let p35;
	let t166;
	let t167;
	let p36;
	let t168;
	let t169;
	let pre10;

	let raw10_value = `
<code class="language-html"><span class="token tag"><span class="token tag"><span class="token punctuation">&lt;</span>div</span><span class="token punctuation">></span></span>&#123;a&#125; + &#123;b&#125; = &#123;a + b&#125;<span class="token tag"><span class="token tag"><span class="token punctuation">&lt;/</span>div</span><span class="token punctuation">></span></span></code>` + "";

	let t170;
	let p37;
	let em;
	let t171;
	let t172;
	let p38;
	let t173;
	let a27;
	let t174;
	let code25;
	let t175;
	let t176;
	let t177;
	let t178;
	let p39;
	let t179;
	let a28;
	let t180;
	let t181;
	let t182;
	let pre11;

	let raw11_value = `
<code class="language-html"><span class="token tag"><span class="token tag"><span class="token punctuation">&lt;</span>script</span><span class="token punctuation">></span></span><span class="token script"><span class="token language-javascript">
  <span class="token keyword">const</span> string <span class="token operator">=</span> <span class="token template-string"><span class="token template-punctuation string">&#96;</span><span class="token string">
    &lt;h1>Introduction&lt;/h1>
    &lt;div>Hello World&lt;/div>
  </span><span class="token template-punctuation string">&#96;</span></span><span class="token punctuation">;</span>
</span></span><span class="token tag"><span class="token tag"><span class="token punctuation">&lt;/</span>script</span><span class="token punctuation">></span></span>
&#123;@html string&#125;</code>` + "";

	let t183;
	let p40;
	let t184;
	let t185;
	let p41;
	let t186;
	let t187;
	let p42;
	let t188;
	let t189;
	let pre12;

	let raw12_value = `
<code class="language-html"><span class="token tag"><span class="token tag"><span class="token punctuation">&lt;</span>script</span><span class="token punctuation">></span></span><span class="token script"><span class="token language-javascript">
  <span class="token keyword module">import</span> <span class="token maybe-class-name">Header</span> <span class="token keyword module">from</span> <span class="token string">'./Header.svelte'</span><span class="token punctuation">;</span>
  <span class="token keyword module">import</span> <span class="token maybe-class-name">Footer</span> <span class="token keyword module">from</span> <span class="token string">'./Footer.svelte'</span><span class="token punctuation">;</span>
  
  <span class="token keyword">const</span> string <span class="token operator">=</span> <span class="token template-string"><span class="token template-punctuation string">&#96;</span><span class="token string">
    &lt;h1>Introduction&lt;/h1>
    &lt;div>Hello World&lt;/div>
  </span><span class="token template-punctuation string">&#96;</span></span><span class="token punctuation">;</span>
</span></span><span class="token tag"><span class="token tag"><span class="token punctuation">&lt;/</span>script</span><span class="token punctuation">></span></span>

<span class="token tag"><span class="token tag"><span class="token punctuation">&lt;</span>Header</span><span class="token punctuation">></span></span>This is header<span class="token tag"><span class="token tag"><span class="token punctuation">&lt;/</span>Header</span><span class="token punctuation">></span></span>
&#123;@html string&#125;
<span class="token tag"><span class="token tag"><span class="token punctuation">&lt;</span>Footer</span><span class="token punctuation">></span></span>This is footer<span class="token tag"><span class="token tag"><span class="token punctuation">&lt;/</span>Footer</span><span class="token punctuation">></span></span></code>` + "";

	let t190;
	let p43;
	let t191;
	let t192;
	let pre13;

	let raw13_value = `
<code class="language-html"><span class="token tag"><span class="token tag"><span class="token punctuation">&lt;</span>header</span><span class="token punctuation">></span></span>This is header<span class="token tag"><span class="token tag"><span class="token punctuation">&lt;/</span>header</span><span class="token punctuation">></span></span>
<span class="token tag"><span class="token tag"><span class="token punctuation">&lt;</span>nav</span><span class="token punctuation">></span></span>
  <span class="token tag"><span class="token tag"><span class="token punctuation">&lt;</span>ul</span><span class="token punctuation">></span></span>
    <span class="token tag"><span class="token tag"><span class="token punctuation">&lt;</span>li</span><span class="token punctuation">></span></span><span class="token tag"><span class="token tag"><span class="token punctuation">&lt;</span>a</span> <span class="token attr-name">href</span><span class="token attr-value"><span class="token punctuation">=</span><span class="token punctuation">"</span>#<span class="token punctuation">"</span></span><span class="token punctuation">></span></span>Home<span class="token tag"><span class="token tag"><span class="token punctuation">&lt;/</span>a</span><span class="token punctuation">></span></span><span class="token tag"><span class="token tag"><span class="token punctuation">&lt;/</span>li</span><span class="token punctuation">></span></span>
  <span class="token tag"><span class="token tag"><span class="token punctuation">&lt;/</span>ul</span><span class="token punctuation">></span></span>
<span class="token tag"><span class="token tag"><span class="token punctuation">&lt;/</span>nav</span><span class="token punctuation">></span></span>
<span class="token tag"><span class="token tag"><span class="token punctuation">&lt;</span>h1</span><span class="token punctuation">></span></span>Introduction<span class="token tag"><span class="token tag"><span class="token punctuation">&lt;/</span>h1</span><span class="token punctuation">></span></span>
<span class="token tag"><span class="token tag"><span class="token punctuation">&lt;</span>div</span><span class="token punctuation">></span></span>Hello World<span class="token tag"><span class="token tag"><span class="token punctuation">&lt;/</span>div</span><span class="token punctuation">></span></span>
<span class="token tag"><span class="token tag"><span class="token punctuation">&lt;</span>div</span> <span class="token attr-name">class</span><span class="token attr-value"><span class="token punctuation">=</span><span class="token punctuation">"</span>footer<span class="token punctuation">"</span></span><span class="token punctuation">></span></span>
  <span class="token tag"><span class="token tag"><span class="token punctuation">&lt;</span>img</span> <span class="token attr-name">src</span><span class="token attr-value"><span class="token punctuation">=</span><span class="token punctuation">"</span>footer-img<span class="token punctuation">"</span></span> <span class="token punctuation">/></span></span>
  This is footer
<span class="token tag"><span class="token tag"><span class="token punctuation">&lt;/</span>div</span><span class="token punctuation">></span></span></code>` + "";

	let t193;
	let p44;
	let t194;
	let code26;
	let t195;
	let t196;
	let code27;
	let t197;
	let t198;
	let code28;
	let t199;
	let t200;
	let t201;
	let p45;
	let t202;
	let t203;
	let p46;
	let t204;
	let code29;
	let t205;
	let t206;
	let code30;
	let t207;
	let t208;
	let code31;
	let t209;
	let t210;
	let t211;
	let blockquote1;
	let p47;
	let strong0;
	let t212;
	let t213;
	let t214;
	let p48;
	let t215;
	let code32;
	let t216;
	let t217;
	let code33;
	let t218;
	let t219;
	let code34;
	let t220;
	let t221;
	let code35;
	let t222;
	let t223;
	let t224;
	let pre14;

	let raw14_value = `
<code class="language-html"><span class="token comment">&lt;!-- Header.svelte --></span>
<span class="token tag"><span class="token tag"><span class="token punctuation">&lt;</span>header</span><span class="token punctuation">></span></span><span class="token tag"><span class="token tag"><span class="token punctuation">&lt;</span>slot</span><span class="token punctuation">></span></span><span class="token tag"><span class="token tag"><span class="token punctuation">&lt;/</span>slot</span><span class="token punctuation">></span></span><span class="token tag"><span class="token tag"><span class="token punctuation">&lt;/</span>header</span><span class="token punctuation">></span></span>
<span class="token tag"><span class="token tag"><span class="token punctuation">&lt;</span>nav</span><span class="token punctuation">></span></span>
  <span class="token tag"><span class="token tag"><span class="token punctuation">&lt;</span>ul</span><span class="token punctuation">></span></span>
    <span class="token tag"><span class="token tag"><span class="token punctuation">&lt;</span>li</span><span class="token punctuation">></span></span><span class="token tag"><span class="token tag"><span class="token punctuation">&lt;</span>a</span> <span class="token attr-name">href</span><span class="token attr-value"><span class="token punctuation">=</span><span class="token punctuation">"</span>#<span class="token punctuation">"</span></span><span class="token punctuation">></span></span>Home<span class="token tag"><span class="token tag"><span class="token punctuation">&lt;/</span>a</span><span class="token punctuation">></span></span><span class="token tag"><span class="token tag"><span class="token punctuation">&lt;/</span>li</span><span class="token punctuation">></span></span>
  <span class="token tag"><span class="token tag"><span class="token punctuation">&lt;/</span>ul</span><span class="token punctuation">></span></span>
<span class="token tag"><span class="token tag"><span class="token punctuation">&lt;/</span>nav</span><span class="token punctuation">></span></span></code>` + "";

	let t225;
	let blockquote2;
	let p49;
	let t226;
	let code36;
	let t227;
	let t228;
	let a29;
	let t229;
	let t230;
	let p50;
	let t231;
	let code37;
	let t232;
	let t233;
	let code38;
	let t234;
	let t235;
	let t236;
	let p51;
	let t237;
	let t238;
	let pre15;

	let raw15_value = `
<code class="language-html"><span class="token tag"><span class="token tag"><span class="token punctuation">&lt;</span>header</span><span class="token punctuation">></span></span>This is header<span class="token tag"><span class="token tag"><span class="token punctuation">&lt;/</span>header</span><span class="token punctuation">></span></span>
<span class="token tag"><span class="token tag"><span class="token punctuation">&lt;</span>nav</span><span class="token punctuation">></span></span>
  <span class="token tag"><span class="token tag"><span class="token punctuation">&lt;</span>ul</span><span class="token punctuation">></span></span>
    <span class="token tag"><span class="token tag"><span class="token punctuation">&lt;</span>li</span><span class="token punctuation">></span></span><span class="token tag"><span class="token tag"><span class="token punctuation">&lt;</span>a</span> <span class="token attr-name">href</span><span class="token attr-value"><span class="token punctuation">=</span><span class="token punctuation">"</span>#<span class="token punctuation">"</span></span><span class="token punctuation">></span></span>Home<span class="token tag"><span class="token tag"><span class="token punctuation">&lt;/</span>a</span><span class="token punctuation">></span></span><span class="token tag"><span class="token tag"><span class="token punctuation">&lt;/</span>li</span><span class="token punctuation">></span></span>
  <span class="token tag"><span class="token tag"><span class="token punctuation">&lt;/</span>ul</span><span class="token punctuation">></span></span>
<span class="token tag"><span class="token tag"><span class="token punctuation">&lt;/</span>nav</span><span class="token punctuation">></span></span>
<span class="token tag"><span class="token tag"><span class="token punctuation">&lt;</span>h1</span><span class="token punctuation">></span></span>Introduction<span class="token tag"><span class="token tag"><span class="token punctuation">&lt;/</span>h1</span><span class="token punctuation">></span></span>
<span class="token tag"><span class="token tag"><span class="token punctuation">&lt;</span>div</span><span class="token punctuation">></span></span>Hello World<span class="token tag"><span class="token tag"><span class="token punctuation">&lt;/</span>div</span><span class="token punctuation">></span></span>
<span class="token comment">&lt;!-- HTML Tag Ends Here --></span>
<span class="token tag"><span class="token tag"><span class="token punctuation">&lt;</span>div</span> <span class="token attr-name">class</span><span class="token attr-value"><span class="token punctuation">=</span><span class="token punctuation">"</span>footer<span class="token punctuation">"</span></span><span class="token punctuation">></span></span>
  <span class="token tag"><span class="token tag"><span class="token punctuation">&lt;</span>img</span> <span class="token attr-name">src</span><span class="token attr-value"><span class="token punctuation">=</span><span class="token punctuation">"</span>footer-img<span class="token punctuation">"</span></span> <span class="token punctuation">/></span></span>
  This is footer
<span class="token tag"><span class="token tag"><span class="token punctuation">&lt;/</span>div</span><span class="token punctuation">></span></span></code>` + "";

	let t239;
	let pre16;

	let raw16_value = `
<code class="language-js"><span class="token comment">// claim HTML node until a comment that matches the &#96;commentMarker&#96;</span>
<span class="token keyword">function</span> <span class="token function">claimUntil</span><span class="token punctuation">(</span><span class="token parameter">nodes<span class="token punctuation">,</span> commentMarker</span><span class="token punctuation">)</span> <span class="token punctuation">&#123;</span>
  <span class="token keyword">let</span> i <span class="token operator">=</span> <span class="token number">0</span><span class="token punctuation">;</span>
  <span class="token keyword">while</span><span class="token punctuation">(</span>i <span class="token operator">&lt;</span> nodes<span class="token punctuation">.</span><span class="token property-access">length</span><span class="token punctuation">)</span> <span class="token punctuation">&#123;</span>
    <span class="token keyword">const</span> node <span class="token operator">=</span> nodes<span class="token punctuation">[</span>i<span class="token punctuation">]</span><span class="token punctuation">;</span>
    <span class="token keyword">if</span> <span class="token punctuation">(</span>node<span class="token punctuation">.</span><span class="token property-access">nodeType</span> <span class="token operator">===</span> <span class="token number">8</span> <span class="token comment">/* comment node */</span> <span class="token operator">&amp;&amp;</span> node<span class="token punctuation">.</span><span class="token property-access">textContent</span><span class="token punctuation">.</span><span class="token method function property-access">trim</span><span class="token punctuation">(</span><span class="token punctuation">)</span> <span class="token operator">===</span> commentMarker<span class="token punctuation">)</span> <span class="token punctuation">&#123;</span>
      <span class="token keyword">break</span><span class="token punctuation">;</span>
    <span class="token punctuation">&#125;</span>
  <span class="token punctuation">&#125;</span>
  <span class="token keyword">return</span> nodes<span class="token punctuation">.</span><span class="token method function property-access">splice</span><span class="token punctuation">(</span><span class="token number">0</span><span class="token punctuation">,</span> i<span class="token punctuation">)</span><span class="token punctuation">;</span>
<span class="token punctuation">&#125;</span>

<span class="token keyword">function</span> <span class="token function">claimHtmlTag</span><span class="token punctuation">(</span><span class="token parameter">nodes</span><span class="token punctuation">)</span> <span class="token punctuation">&#123;</span>
  <span class="token keyword">const</span> htmlTagNodes <span class="token operator">=</span> <span class="token function">claimUntil</span><span class="token punctuation">(</span>nodes<span class="token punctuation">,</span> <span class="token string">'HTML Tag Ends Here'</span><span class="token punctuation">)</span><span class="token punctuation">;</span>
  <span class="token keyword">return</span> <span class="token keyword">new</span> <span class="token class-name">HtmlTag</span><span class="token punctuation">(</span>htmlTagNodes<span class="token punctuation">)</span><span class="token punctuation">;</span>
<span class="token punctuation">&#125;</span> </code>` + "";

	let t240;
	let section6;
	let h25;
	let a30;
	let t241;
	let t242;
	let p52;
	let t243;
	let a31;
	let t244;
	let t245;
	let t246;
	let p53;
	let t247;
	let code39;
	let t248;
	let t249;
	let t250;
	let pre17;

	let raw17_value = `
<code class="language-js"><span class="token keyword">function</span> <span class="token function"><span class="token maybe-class-name">MyComponent</span></span><span class="token punctuation">(</span><span class="token punctuation">)</span> <span class="token punctuation">&#123;</span>
  <span class="token keyword">return</span> <span class="token operator">&lt;</span>div dangerouslySetInnerHTML<span class="token operator">=</span><span class="token punctuation">&#123;</span><span class="token punctuation">&#123;</span>__html<span class="token punctuation">:</span> <span class="token template-string"><span class="token template-punctuation string">&#96;</span><span class="token string">
    &lt;h1>Introduction&lt;/h1>
    &lt;div>Hello World&lt;/div>
  </span><span class="token template-punctuation string">&#96;</span></span>
  <span class="token punctuation">&#125;</span><span class="token punctuation">&#125;</span> <span class="token operator">/</span><span class="token operator">></span><span class="token punctuation">;</span>
<span class="token punctuation">&#125;</span></code>` + "";

	let t251;
	let pre18;

	let raw18_value = `
<code class="language-html"><span class="token comment">&lt;!-- the parent &#96;&lt;div>&#96; act as a boundary --></span>
<span class="token tag"><span class="token tag"><span class="token punctuation">&lt;</span>div</span><span class="token punctuation">></span></span>
  <span class="token tag"><span class="token tag"><span class="token punctuation">&lt;</span>h1</span><span class="token punctuation">></span></span>Introduction<span class="token tag"><span class="token tag"><span class="token punctuation">&lt;/</span>h1</span><span class="token punctuation">></span></span>
  <span class="token tag"><span class="token tag"><span class="token punctuation">&lt;</span>div</span><span class="token punctuation">></span></span>Hello World<span class="token tag"><span class="token tag"><span class="token punctuation">&lt;/</span>div</span><span class="token punctuation">></span></span>
<span class="token tag"><span class="token tag"><span class="token punctuation">&lt;/</span>div</span><span class="token punctuation">></span></span></code>` + "";

	let t252;
	let p54;
	let t253;
	let code40;
	let t254;
	let t255;
	let code41;
	let t256;
	let t257;
	let t258;
	let section7;
	let h26;
	let a32;
	let t259;
	let t260;
	let p55;
	let t261;
	let t262;
	let p56;
	let t263;
	let a33;
	let code42;
	let t264;
	let t265;
	let t266;
	let t267;
	let p57;
	let t268;
	let code43;
	let t269;
	let t270;
	let t271;
	let p58;
	let t272;
	let code44;
	let t273;
	let t274;
	let t275;
	let p59;
	let t276;
	let a34;
	let t277;
	let t278;
	let t279;
	let blockquote3;
	let p60;
	let strong1;
	let t280;
	let t281;
	let a35;
	let t282;
	let t283;
	let t284;
	let section8;
	let h27;
	let a36;
	let t285;
	let t286;
	let ul3;
	let li11;
	let t287;
	let ul1;
	let li8;
	let a37;
	let t288;
	let t289;
	let li9;
	let a38;
	let t290;
	let t291;
	let li10;
	let a39;
	let t292;
	let t293;
	let li13;
	let t294;
	let ul2;
	let li12;
	let a40;
	let t295;

	return {
		c() {
			section0 = element("section");
			ul0 = element("ul");
			li0 = element("li");
			a0 = element("a");
			t0 = text("Disclaimer");
			li1 = element("li");
			a1 = element("a");
			t1 = text("Background");
			li2 = element("li");
			a2 = element("a");
			t2 = text("The investigation");
			li3 = element("li");
			a3 = element("a");
			t3 = text("Is this a bug?");
			li4 = element("li");
			a4 = element("a");
			t4 = text("Apply what I've learned");
			li5 = element("li");
			a5 = element("a");
			t5 = text("dangerouslySetInnerHtml");
			li6 = element("li");
			a6 = element("a");
			t6 = text("React Partial Hydration");
			li7 = element("li");
			a7 = element("a");
			t7 = text("References");
			t8 = space();
			section1 = element("section");
			h20 = element("h2");
			a8 = element("a");
			t9 = text("Disclaimer");
			t10 = space();
			p0 = element("p");
			t11 = text("I am not going to talk about what is hydration, to know more about client-side rendering, server-side rendering and hydration, please ");
			a9 = element("a");
			t12 = text("read this amazing article");
			t13 = text(" by ");
			a10 = element("a");
			t14 = text("Jason Miller");
			t15 = text(" and ");
			a11 = element("a");
			t16 = text("Addy Osmani");
			t17 = text(".");
			t18 = space();
			p1 = element("p");
			t19 = text("I am not going to share about how to do rehydration in React as well, you can read about that from ");
			a12 = element("a");
			t20 = text("here");
			t21 = text(" and ");
			a13 = element("a");
			t22 = text("here");
			t23 = text(".");
			t24 = space();
			p2 = element("p");
			t25 = text("I am going to share a story, how I \"understand\" more about the mechanics of rehydration in React, and how I apply it in real life.");
			t26 = space();
			section2 = element("section");
			h21 = element("h2");
			a14 = element("a");
			t27 = text("Background");
			t28 = space();
			p3 = element("p");
			t29 = text("Recently, I was bewildered by a React hydration warning:");
			t30 = space();
			pre0 = element("pre");
			t31 = space();
			p4 = element("p");
			t32 = text("To give you a sense of the situation, this is the component I was trying to rehydrate:");
			t33 = space();
			pre1 = element("pre");
			t34 = space();
			p5 = element("p");
			t35 = text("Although React warned about the mismatch in the console, the hydrated app still worked fine.");
			t36 = space();
			p6 = element("p");
			t37 = text("So I can ignore it. 🙈");
			t38 = space();
			p7 = element("p");
			t39 = text("Still, my curiosity made me dig deeper, to find out the reason behind it.");
			t40 = space();
			section3 = element("section");
			h22 = element("h2");
			a15 = element("a");
			t41 = text("The investigation");
			t42 = space();
			p8 = element("p");
			t43 = text("So, the first thing I looked at, was the server-rendered HTML, which will be hydrated by React later.");
			t44 = space();
			pre2 = element("pre");
			t45 = space();
			p9 = element("p");
			t46 = text("Looks pretty normal right?");
			t47 = space();
			p10 = element("p");
			t48 = text("Somehow, my gut feeling telling me to look at the DOM with and without hydration next:");
			t49 = space();
			pre3 = element("pre");
			t50 = space();
			pre4 = element("pre");
			t51 = space();
			p11 = element("p");
			t52 = text("A-ha! Noticed the difference in the DOM?");
			t53 = space();
			p12 = element("p");
			t54 = text("Although they both looked visually the same, but in the DOM created by the initial HTML has only 1 text node, ");
			code0 = element("code");
			t55 = text("\"Count: 0\"");
			t56 = text(", but the DOM after hydration has 2 text nodes, ");
			code1 = element("code");
			t57 = text("\"Count: \"");
			t58 = text(" and ");
			code2 = element("code");
			t59 = text("\"0\"");
			t60 = text(".");
			t61 = space();
			p13 = element("p");
			t62 = text("Why is that so? The secret lies in the component ");
			code3 = element("code");
			t63 = text("App");
			t64 = text(".");
			t65 = space();
			p14 = element("p");
			t66 = text("The functional component ");
			code4 = element("code");
			t67 = text("App");
			t68 = text(" returns the following React element when ");
			code5 = element("code");
			t69 = text("count");
			t70 = text(" is ");
			code6 = element("code");
			t71 = text("0");
			t72 = text(":");
			t73 = space();
			pre5 = element("pre");
			t74 = space();
			p15 = element("p");
			t75 = text("which itself is a plain JavaScript object, which is roughly:");
			t76 = space();
			pre6 = element("pre");
			t77 = space();
			p16 = element("p");
			t78 = text("Noticed the ");
			code7 = element("code");
			t79 = text("div");
			t80 = text(" has 2 children? That's why it rendered 2 text nodes!");
			t81 = space();
			p17 = element("p");
			t82 = text("So, when React tries to hydrate the ");
			code8 = element("code");
			t83 = text("div");
			t84 = text(" from SSR, it starts with comparing all the props from the React element and the attributes from the DOM. Then, it compares the element's children.");
			t85 = space();
			p18 = element("p");
			t86 = text("Based on the React element, React expects 2 text nodes, but the DOM only has 1. So it tries to match with the 1st text node, and create the 2nd one.");
			t87 = space();
			p19 = element("p");
			t88 = text("It is when the matching happens, where React realizes that it is expecting the text node to contain ");
			code9 = element("code");
			t89 = text("\"Count: \"");
			t90 = text(", but the server content is ");
			code10 = element("code");
			t91 = text("\"Count: 0\"");
			t92 = text(", thus the error message:");
			t93 = space();
			pre7 = element("pre");
			t94 = space();
			p20 = element("p");
			t95 = text("Then, React patches the text node, by setting the content to the expected ");
			code11 = element("code");
			t96 = text("\"Count: \"");
			t97 = text(", and created another text node, ");
			code12 = element("code");
			t98 = text("\"0\"");
			t99 = text(", so visually there's no change, but in the DOM, React has changed the text content and created a new text node.");
			t100 = space();
			section4 = element("section");
			h23 = element("h2");
			a16 = element("a");
			t101 = text("Is this a bug?");
			t102 = space();
			p21 = element("p");
			t103 = text("So, is this a React hydration bug? or is this an expected behavior?");
			t104 = space();
			p22 = element("p");
			t105 = text("Turns out that, it was my bug 🤮🤮.");
			t106 = space();
			p23 = element("p");
			t107 = text("I used ");
			a17 = element("a");
			code13 = element("code");
			t108 = text("ReactDOMServer.renderToStaticMarkup");
			t109 = text(" instead of ");
			a18 = element("a");
			code14 = element("code");
			t110 = text("ReactDOMServer.renderToString");
			t111 = text(".");
			t112 = space();
			p24 = element("p");
			t113 = text("The doc says clearly,");
			t114 = space();
			blockquote0 = element("blockquote");
			p25 = element("p");
			t115 = text("If you plan to use React on the client to make the markup interactive, do not use this method. Instead, use ");
			code15 = element("code");
			t116 = text("renderToString");
			t117 = text(" on the server and ");
			code16 = element("code");
			t118 = text("ReactDOM.hydrate()");
			t119 = text(" on the client.");
			t120 = space();
			p26 = element("p");
			t121 = text("🙈");
			t122 = space();
			p27 = element("p");
			t123 = text("So, what is the difference between ");
			a19 = element("a");
			code17 = element("code");
			t124 = text("ReactDOMServer.renderToStaticMarkup");
			t125 = text(" and ");
			a20 = element("a");
			code18 = element("code");
			t126 = text("ReactDOMServer.renderToString");
			t127 = text(" ?");
			t128 = space();
			p28 = element("p");
			t129 = text("This is what ");
			a21 = element("a");
			code19 = element("code");
			t130 = text("ReactDOMServer.renderToString");
			t131 = text(" generates:");
			t132 = space();
			pre8 = element("pre");
			t133 = space();
			p29 = element("p");
			t134 = text("It adds a ");
			code20 = element("code");
			t135 = text("data-reactroot");
			t136 = text(" which is used by React internally. (From what I read from the code, it seemed to be used by React only to warn legacy code to ");
			a22 = element("a");
			t137 = text("switch from ");
			code21 = element("code");
			t138 = text("render()");
			t139 = text(" to ");
			code22 = element("code");
			t140 = text("hydrate()");
			t141 = text(" before stopping support in React v17, correct me if I'm wrong).");
			t142 = space();
			p30 = element("p");
			t143 = text("Besides, it adds a comment in between ");
			code23 = element("code");
			t144 = text("\"Count: \"");
			t145 = text(" and ");
			code24 = element("code");
			t146 = text("\"0\"");
			t147 = text(", so the initial DOM looks like this:");
			t148 = space();
			pre9 = element("pre");
			t149 = space();
			p31 = element("p");
			t150 = text("A ");
			a23 = element("a");
			t151 = text("comment node");
			t152 = text(" sits in between 2 text nodes, nicely separate the boundary of the 2 text nodes.");
			t153 = space();
			p32 = element("p");
			t154 = text("As you could expect, this time around, there's no more hydration error.");
			t155 = space();
			p33 = element("p");
			t156 = text("The initial DOM provided 2 text nodes as React would expect, and ");
			a24 = element("a");
			t157 = text("React would skip comment nodes and only hydrate element nodes and text nodes");
			t158 = text(".");
			t159 = space();
			section5 = element("section");
			h24 = element("h2");
			a25 = element("a");
			t160 = text("Apply what I've learned");
			t161 = space();
			p34 = element("p");
			t162 = text("So, the next obvious place to apply what I've learned is ");
			a26 = element("a");
			t163 = text("Svelte");
			t164 = text(".");
			t165 = space();
			p35 = element("p");
			t166 = text("I found out there are 2 places that Svelte can use this technique for better hydration.");
			t167 = space();
			p36 = element("p");
			t168 = text("The first is the hydrating text node. I found out that Svelte hydrates neighboring text nodes the same way as I described as \"a bug\", modifying the 1st text node and creating the 2nd text node. It gets \"worse\" when you have more neighboring text nodes:");
			t169 = space();
			pre10 = element("pre");
			t170 = space();
			p37 = element("p");
			em = element("em");
			t171 = text("5 neighboring text nodes");
			t172 = space();
			p38 = element("p");
			t173 = text("The second place I found the technique is useful, is hydrating ");
			a27 = element("a");
			t174 = text("HTML tags (");
			code25 = element("code");
			t175 = text("{@html string}");
			t176 = text(")");
			t177 = text(".");
			t178 = space();
			p39 = element("p");
			t179 = text("HTML tags allows you to render arbitrary HTML into the DOM, just like React's ");
			a28 = element("a");
			t180 = text("dangerouslySetInnerHTML");
			t181 = text(".");
			t182 = space();
			pre11 = element("pre");
			t183 = space();
			p40 = element("p");
			t184 = text("So, why is hydrating HTML tag hard?");
			t185 = space();
			p41 = element("p");
			t186 = text("HTML tag allow multiple elements to be passed in, which makes it hard to determine the bound of the HTML tag when hydrating.");
			t187 = space();
			p42 = element("p");
			t188 = text("Take this example:");
			t189 = space();
			pre12 = element("pre");
			t190 = space();
			p43 = element("p");
			t191 = text("The rendered HTML may look something like this:");
			t192 = space();
			pre13 = element("pre");
			t193 = space();
			p44 = element("p");
			t194 = text("Now, can you tell me which elements belong to ");
			code26 = element("code");
			t195 = text("<Header />");
			t196 = text(", ");
			code27 = element("code");
			t197 = text("{@html string}");
			t198 = text(" and ");
			code28 = element("code");
			t199 = text("<Footer />");
			t200 = text("?");
			t201 = space();
			p45 = element("p");
			t202 = text("Let's walk through it step by step.");
			t203 = space();
			p46 = element("p");
			t204 = text("Hydrating this component meant that we are going to claim components belong to ");
			code29 = element("code");
			t205 = text("<Header>");
			t206 = text(", ");
			code30 = element("code");
			t207 = text("{@html string}");
			t208 = text(" then ");
			code31 = element("code");
			t209 = text("<Footer>");
			t210 = text(".");
			t211 = space();
			blockquote1 = element("blockquote");
			p47 = element("p");
			strong0 = element("strong");
			t212 = text("Claiming");
			t213 = text(" in Svelte means marking the element as part of the component, and hydrate it by providing reactivity to the element.");
			t214 = space();
			p48 = element("p");
			t215 = text("Claiming the ");
			code32 = element("code");
			t216 = text("<Header />");
			t217 = text(" component, by itself, will claim away ");
			code33 = element("code");
			t218 = text("<header>");
			t219 = text(" and ");
			code34 = element("code");
			t220 = text("<nav>");
			t221 = text(", because in ");
			code35 = element("code");
			t222 = text("Header.svelte");
			t223 = text(" contains these 2 elements:");
			t224 = space();
			pre14 = element("pre");
			t225 = space();
			blockquote2 = element("blockquote");
			p49 = element("p");
			t226 = text("You can learn about Svelte ");
			code36 = element("code");
			t227 = text("<slot>");
			t228 = space();
			a29 = element("a");
			t229 = text("here");
			t230 = space();
			p50 = element("p");
			t231 = text("Now claiming for ");
			code37 = element("code");
			t232 = text("{@html string}");
			t233 = text(" is tricky, because you have no idea when it ends and when is the start of the ");
			code38 = element("code");
			t234 = text("<Footer />");
			t235 = text(" component");
			t236 = space();
			p51 = element("p");
			t237 = text("If we put a comment as a marker for the end of the HTML tag, it would make things easier:");
			t238 = space();
			pre15 = element("pre");
			t239 = space();
			pre16 = element("pre");
			t240 = space();
			section6 = element("section");
			h25 = element("h2");
			a30 = element("a");
			t241 = text("dangerouslySetInnerHtml");
			t242 = space();
			p52 = element("p");
			t243 = text("React has ");
			a31 = element("a");
			t244 = text("dangerouslySetInnerHTML");
			t245 = text(" right? Does it have the same issue?");
			t246 = space();
			p53 = element("p");
			t247 = text("Apparently not. ");
			code39 = element("code");
			t248 = text("dangerouslySetInnerHTML");
			t249 = text(" is always used inside an HTML element, so the parent element is the boundary of the inner HTML content.");
			t250 = space();
			pre17 = element("pre");
			t251 = space();
			pre18 = element("pre");
			t252 = space();
			p54 = element("p");
			t253 = text("Unless ");
			code40 = element("code");
			t254 = text("dangerouslySetInnerHTML");
			t255 = text(" is supported on ");
			code41 = element("code");
			t256 = text("React.Fragment");
			t257 = text(", then it would not be a problem.");
			t258 = space();
			section7 = element("section");
			h26 = element("h2");
			a32 = element("a");
			t259 = text("React Partial Hydration");
			t260 = space();
			p55 = element("p");
			t261 = text("Partial hydration in React is a mechanism to partially hydrate a server-rendered result while other parts of the pages are still loading the code or data.");
			t262 = space();
			p56 = element("p");
			t263 = text("This is helpful when you are hydrating a ");
			a33 = element("a");
			code42 = element("code");
			t264 = text("<Suspense>");
			t265 = text(" component");
			t266 = text(". The server-rendered HTML may have rendered based on the code or data, which is yet to be fetched by the component. If React now shows the fallback content during the hydration, the user may see a flash of the actual content, before turning into a loading state until the code or data is ready.");
			t267 = space();
			p57 = element("p");
			t268 = text("Partial hydration allows React to not hydrate those ");
			code43 = element("code");
			t269 = text("<Suspense />");
			t270 = text(" component until the code or data is ready.");
			t271 = space();
			p58 = element("p");
			t272 = text("So, how does React knows the boundary of ");
			code44 = element("code");
			t273 = text("<Suspense />");
			t274 = text(" from the server-rendered HTML which it could safely skip, before hydrating them when it's ready?");
			t275 = space();
			p59 = element("p");
			t276 = text("It's ");
			a34 = element("a");
			t277 = text("the marker comment");
			t278 = text(" to the rescue again!");
			t279 = space();
			blockquote3 = element("blockquote");
			p60 = element("p");
			strong1 = element("strong");
			t280 = text("Disclaimer");
			t281 = text("\nThe section above is entirely based on my understanding by reading the ");
			a35 = element("a");
			t282 = text("Partial Hydration PR");
			t283 = text(", please feel free to correct me if I'm wrong.");
			t284 = space();
			section8 = element("section");
			h27 = element("h2");
			a36 = element("a");
			t285 = text("References");
			t286 = space();
			ul3 = element("ul");
			li11 = element("li");
			t287 = text("Some interesting React commits and PRs that serves as a good entry point to understand hydration:");
			ul1 = element("ul");
			li8 = element("li");
			a37 = element("a");
			t288 = text("Remove most comments from HTML generation output");
			t289 = space();
			li9 = element("li");
			a38 = element("a");
			t290 = text("Warn When The HTML Mismatches in DEV");
			t291 = space();
			li10 = element("li");
			a39 = element("a");
			t292 = text("Partial Hydration PR");
			t293 = space();
			li13 = element("li");
			t294 = text("Some related Svelte PRs");
			ul2 = element("ul");
			li12 = element("li");
			a40 = element("a");
			t295 = text("Use SSR rendered as initial html for runtime hydration test");
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
			t0 = claim_text(a0_nodes, "Disclaimer");
			a0_nodes.forEach(detach);
			li0_nodes.forEach(detach);
			li1 = claim_element(ul0_nodes, "LI", {});
			var li1_nodes = children(li1);
			a1 = claim_element(li1_nodes, "A", { href: true });
			var a1_nodes = children(a1);
			t1 = claim_text(a1_nodes, "Background");
			a1_nodes.forEach(detach);
			li1_nodes.forEach(detach);
			li2 = claim_element(ul0_nodes, "LI", {});
			var li2_nodes = children(li2);
			a2 = claim_element(li2_nodes, "A", { href: true });
			var a2_nodes = children(a2);
			t2 = claim_text(a2_nodes, "The investigation");
			a2_nodes.forEach(detach);
			li2_nodes.forEach(detach);
			li3 = claim_element(ul0_nodes, "LI", {});
			var li3_nodes = children(li3);
			a3 = claim_element(li3_nodes, "A", { href: true });
			var a3_nodes = children(a3);
			t3 = claim_text(a3_nodes, "Is this a bug?");
			a3_nodes.forEach(detach);
			li3_nodes.forEach(detach);
			li4 = claim_element(ul0_nodes, "LI", {});
			var li4_nodes = children(li4);
			a4 = claim_element(li4_nodes, "A", { href: true });
			var a4_nodes = children(a4);
			t4 = claim_text(a4_nodes, "Apply what I've learned");
			a4_nodes.forEach(detach);
			li4_nodes.forEach(detach);
			li5 = claim_element(ul0_nodes, "LI", {});
			var li5_nodes = children(li5);
			a5 = claim_element(li5_nodes, "A", { href: true });
			var a5_nodes = children(a5);
			t5 = claim_text(a5_nodes, "dangerouslySetInnerHtml");
			a5_nodes.forEach(detach);
			li5_nodes.forEach(detach);
			li6 = claim_element(ul0_nodes, "LI", {});
			var li6_nodes = children(li6);
			a6 = claim_element(li6_nodes, "A", { href: true });
			var a6_nodes = children(a6);
			t6 = claim_text(a6_nodes, "React Partial Hydration");
			a6_nodes.forEach(detach);
			li6_nodes.forEach(detach);
			li7 = claim_element(ul0_nodes, "LI", {});
			var li7_nodes = children(li7);
			a7 = claim_element(li7_nodes, "A", { href: true });
			var a7_nodes = children(a7);
			t7 = claim_text(a7_nodes, "References");
			a7_nodes.forEach(detach);
			li7_nodes.forEach(detach);
			ul0_nodes.forEach(detach);
			section0_nodes.forEach(detach);
			t8 = claim_space(nodes);
			section1 = claim_element(nodes, "SECTION", {});
			var section1_nodes = children(section1);
			h20 = claim_element(section1_nodes, "H2", {});
			var h20_nodes = children(h20);
			a8 = claim_element(h20_nodes, "A", { href: true, id: true });
			var a8_nodes = children(a8);
			t9 = claim_text(a8_nodes, "Disclaimer");
			a8_nodes.forEach(detach);
			h20_nodes.forEach(detach);
			t10 = claim_space(section1_nodes);
			p0 = claim_element(section1_nodes, "P", {});
			var p0_nodes = children(p0);
			t11 = claim_text(p0_nodes, "I am not going to talk about what is hydration, to know more about client-side rendering, server-side rendering and hydration, please ");
			a9 = claim_element(p0_nodes, "A", { href: true, rel: true });
			var a9_nodes = children(a9);
			t12 = claim_text(a9_nodes, "read this amazing article");
			a9_nodes.forEach(detach);
			t13 = claim_text(p0_nodes, " by ");
			a10 = claim_element(p0_nodes, "A", { href: true, rel: true });
			var a10_nodes = children(a10);
			t14 = claim_text(a10_nodes, "Jason Miller");
			a10_nodes.forEach(detach);
			t15 = claim_text(p0_nodes, " and ");
			a11 = claim_element(p0_nodes, "A", { href: true, rel: true });
			var a11_nodes = children(a11);
			t16 = claim_text(a11_nodes, "Addy Osmani");
			a11_nodes.forEach(detach);
			t17 = claim_text(p0_nodes, ".");
			p0_nodes.forEach(detach);
			t18 = claim_space(section1_nodes);
			p1 = claim_element(section1_nodes, "P", {});
			var p1_nodes = children(p1);
			t19 = claim_text(p1_nodes, "I am not going to share about how to do rehydration in React as well, you can read about that from ");
			a12 = claim_element(p1_nodes, "A", { href: true, rel: true });
			var a12_nodes = children(a12);
			t20 = claim_text(a12_nodes, "here");
			a12_nodes.forEach(detach);
			t21 = claim_text(p1_nodes, " and ");
			a13 = claim_element(p1_nodes, "A", { href: true, rel: true });
			var a13_nodes = children(a13);
			t22 = claim_text(a13_nodes, "here");
			a13_nodes.forEach(detach);
			t23 = claim_text(p1_nodes, ".");
			p1_nodes.forEach(detach);
			t24 = claim_space(section1_nodes);
			p2 = claim_element(section1_nodes, "P", {});
			var p2_nodes = children(p2);
			t25 = claim_text(p2_nodes, "I am going to share a story, how I \"understand\" more about the mechanics of rehydration in React, and how I apply it in real life.");
			p2_nodes.forEach(detach);
			section1_nodes.forEach(detach);
			t26 = claim_space(nodes);
			section2 = claim_element(nodes, "SECTION", {});
			var section2_nodes = children(section2);
			h21 = claim_element(section2_nodes, "H2", {});
			var h21_nodes = children(h21);
			a14 = claim_element(h21_nodes, "A", { href: true, id: true });
			var a14_nodes = children(a14);
			t27 = claim_text(a14_nodes, "Background");
			a14_nodes.forEach(detach);
			h21_nodes.forEach(detach);
			t28 = claim_space(section2_nodes);
			p3 = claim_element(section2_nodes, "P", {});
			var p3_nodes = children(p3);
			t29 = claim_text(p3_nodes, "Recently, I was bewildered by a React hydration warning:");
			p3_nodes.forEach(detach);
			t30 = claim_space(section2_nodes);
			pre0 = claim_element(section2_nodes, "PRE", { class: true });
			var pre0_nodes = children(pre0);
			pre0_nodes.forEach(detach);
			t31 = claim_space(section2_nodes);
			p4 = claim_element(section2_nodes, "P", {});
			var p4_nodes = children(p4);
			t32 = claim_text(p4_nodes, "To give you a sense of the situation, this is the component I was trying to rehydrate:");
			p4_nodes.forEach(detach);
			t33 = claim_space(section2_nodes);
			pre1 = claim_element(section2_nodes, "PRE", { class: true });
			var pre1_nodes = children(pre1);
			pre1_nodes.forEach(detach);
			t34 = claim_space(section2_nodes);
			p5 = claim_element(section2_nodes, "P", {});
			var p5_nodes = children(p5);
			t35 = claim_text(p5_nodes, "Although React warned about the mismatch in the console, the hydrated app still worked fine.");
			p5_nodes.forEach(detach);
			t36 = claim_space(section2_nodes);
			p6 = claim_element(section2_nodes, "P", {});
			var p6_nodes = children(p6);
			t37 = claim_text(p6_nodes, "So I can ignore it. 🙈");
			p6_nodes.forEach(detach);
			t38 = claim_space(section2_nodes);
			p7 = claim_element(section2_nodes, "P", {});
			var p7_nodes = children(p7);
			t39 = claim_text(p7_nodes, "Still, my curiosity made me dig deeper, to find out the reason behind it.");
			p7_nodes.forEach(detach);
			section2_nodes.forEach(detach);
			t40 = claim_space(nodes);
			section3 = claim_element(nodes, "SECTION", {});
			var section3_nodes = children(section3);
			h22 = claim_element(section3_nodes, "H2", {});
			var h22_nodes = children(h22);
			a15 = claim_element(h22_nodes, "A", { href: true, id: true });
			var a15_nodes = children(a15);
			t41 = claim_text(a15_nodes, "The investigation");
			a15_nodes.forEach(detach);
			h22_nodes.forEach(detach);
			t42 = claim_space(section3_nodes);
			p8 = claim_element(section3_nodes, "P", {});
			var p8_nodes = children(p8);
			t43 = claim_text(p8_nodes, "So, the first thing I looked at, was the server-rendered HTML, which will be hydrated by React later.");
			p8_nodes.forEach(detach);
			t44 = claim_space(section3_nodes);
			pre2 = claim_element(section3_nodes, "PRE", { class: true });
			var pre2_nodes = children(pre2);
			pre2_nodes.forEach(detach);
			t45 = claim_space(section3_nodes);
			p9 = claim_element(section3_nodes, "P", {});
			var p9_nodes = children(p9);
			t46 = claim_text(p9_nodes, "Looks pretty normal right?");
			p9_nodes.forEach(detach);
			t47 = claim_space(section3_nodes);
			p10 = claim_element(section3_nodes, "P", {});
			var p10_nodes = children(p10);
			t48 = claim_text(p10_nodes, "Somehow, my gut feeling telling me to look at the DOM with and without hydration next:");
			p10_nodes.forEach(detach);
			t49 = claim_space(section3_nodes);
			pre3 = claim_element(section3_nodes, "PRE", { class: true });
			var pre3_nodes = children(pre3);
			pre3_nodes.forEach(detach);
			t50 = claim_space(section3_nodes);
			pre4 = claim_element(section3_nodes, "PRE", { class: true });
			var pre4_nodes = children(pre4);
			pre4_nodes.forEach(detach);
			t51 = claim_space(section3_nodes);
			p11 = claim_element(section3_nodes, "P", {});
			var p11_nodes = children(p11);
			t52 = claim_text(p11_nodes, "A-ha! Noticed the difference in the DOM?");
			p11_nodes.forEach(detach);
			t53 = claim_space(section3_nodes);
			p12 = claim_element(section3_nodes, "P", {});
			var p12_nodes = children(p12);
			t54 = claim_text(p12_nodes, "Although they both looked visually the same, but in the DOM created by the initial HTML has only 1 text node, ");
			code0 = claim_element(p12_nodes, "CODE", {});
			var code0_nodes = children(code0);
			t55 = claim_text(code0_nodes, "\"Count: 0\"");
			code0_nodes.forEach(detach);
			t56 = claim_text(p12_nodes, ", but the DOM after hydration has 2 text nodes, ");
			code1 = claim_element(p12_nodes, "CODE", {});
			var code1_nodes = children(code1);
			t57 = claim_text(code1_nodes, "\"Count: \"");
			code1_nodes.forEach(detach);
			t58 = claim_text(p12_nodes, " and ");
			code2 = claim_element(p12_nodes, "CODE", {});
			var code2_nodes = children(code2);
			t59 = claim_text(code2_nodes, "\"0\"");
			code2_nodes.forEach(detach);
			t60 = claim_text(p12_nodes, ".");
			p12_nodes.forEach(detach);
			t61 = claim_space(section3_nodes);
			p13 = claim_element(section3_nodes, "P", {});
			var p13_nodes = children(p13);
			t62 = claim_text(p13_nodes, "Why is that so? The secret lies in the component ");
			code3 = claim_element(p13_nodes, "CODE", {});
			var code3_nodes = children(code3);
			t63 = claim_text(code3_nodes, "App");
			code3_nodes.forEach(detach);
			t64 = claim_text(p13_nodes, ".");
			p13_nodes.forEach(detach);
			t65 = claim_space(section3_nodes);
			p14 = claim_element(section3_nodes, "P", {});
			var p14_nodes = children(p14);
			t66 = claim_text(p14_nodes, "The functional component ");
			code4 = claim_element(p14_nodes, "CODE", {});
			var code4_nodes = children(code4);
			t67 = claim_text(code4_nodes, "App");
			code4_nodes.forEach(detach);
			t68 = claim_text(p14_nodes, " returns the following React element when ");
			code5 = claim_element(p14_nodes, "CODE", {});
			var code5_nodes = children(code5);
			t69 = claim_text(code5_nodes, "count");
			code5_nodes.forEach(detach);
			t70 = claim_text(p14_nodes, " is ");
			code6 = claim_element(p14_nodes, "CODE", {});
			var code6_nodes = children(code6);
			t71 = claim_text(code6_nodes, "0");
			code6_nodes.forEach(detach);
			t72 = claim_text(p14_nodes, ":");
			p14_nodes.forEach(detach);
			t73 = claim_space(section3_nodes);
			pre5 = claim_element(section3_nodes, "PRE", { class: true });
			var pre5_nodes = children(pre5);
			pre5_nodes.forEach(detach);
			t74 = claim_space(section3_nodes);
			p15 = claim_element(section3_nodes, "P", {});
			var p15_nodes = children(p15);
			t75 = claim_text(p15_nodes, "which itself is a plain JavaScript object, which is roughly:");
			p15_nodes.forEach(detach);
			t76 = claim_space(section3_nodes);
			pre6 = claim_element(section3_nodes, "PRE", { class: true });
			var pre6_nodes = children(pre6);
			pre6_nodes.forEach(detach);
			t77 = claim_space(section3_nodes);
			p16 = claim_element(section3_nodes, "P", {});
			var p16_nodes = children(p16);
			t78 = claim_text(p16_nodes, "Noticed the ");
			code7 = claim_element(p16_nodes, "CODE", {});
			var code7_nodes = children(code7);
			t79 = claim_text(code7_nodes, "div");
			code7_nodes.forEach(detach);
			t80 = claim_text(p16_nodes, " has 2 children? That's why it rendered 2 text nodes!");
			p16_nodes.forEach(detach);
			t81 = claim_space(section3_nodes);
			p17 = claim_element(section3_nodes, "P", {});
			var p17_nodes = children(p17);
			t82 = claim_text(p17_nodes, "So, when React tries to hydrate the ");
			code8 = claim_element(p17_nodes, "CODE", {});
			var code8_nodes = children(code8);
			t83 = claim_text(code8_nodes, "div");
			code8_nodes.forEach(detach);
			t84 = claim_text(p17_nodes, " from SSR, it starts with comparing all the props from the React element and the attributes from the DOM. Then, it compares the element's children.");
			p17_nodes.forEach(detach);
			t85 = claim_space(section3_nodes);
			p18 = claim_element(section3_nodes, "P", {});
			var p18_nodes = children(p18);
			t86 = claim_text(p18_nodes, "Based on the React element, React expects 2 text nodes, but the DOM only has 1. So it tries to match with the 1st text node, and create the 2nd one.");
			p18_nodes.forEach(detach);
			t87 = claim_space(section3_nodes);
			p19 = claim_element(section3_nodes, "P", {});
			var p19_nodes = children(p19);
			t88 = claim_text(p19_nodes, "It is when the matching happens, where React realizes that it is expecting the text node to contain ");
			code9 = claim_element(p19_nodes, "CODE", {});
			var code9_nodes = children(code9);
			t89 = claim_text(code9_nodes, "\"Count: \"");
			code9_nodes.forEach(detach);
			t90 = claim_text(p19_nodes, ", but the server content is ");
			code10 = claim_element(p19_nodes, "CODE", {});
			var code10_nodes = children(code10);
			t91 = claim_text(code10_nodes, "\"Count: 0\"");
			code10_nodes.forEach(detach);
			t92 = claim_text(p19_nodes, ", thus the error message:");
			p19_nodes.forEach(detach);
			t93 = claim_space(section3_nodes);
			pre7 = claim_element(section3_nodes, "PRE", { class: true });
			var pre7_nodes = children(pre7);
			pre7_nodes.forEach(detach);
			t94 = claim_space(section3_nodes);
			p20 = claim_element(section3_nodes, "P", {});
			var p20_nodes = children(p20);
			t95 = claim_text(p20_nodes, "Then, React patches the text node, by setting the content to the expected ");
			code11 = claim_element(p20_nodes, "CODE", {});
			var code11_nodes = children(code11);
			t96 = claim_text(code11_nodes, "\"Count: \"");
			code11_nodes.forEach(detach);
			t97 = claim_text(p20_nodes, ", and created another text node, ");
			code12 = claim_element(p20_nodes, "CODE", {});
			var code12_nodes = children(code12);
			t98 = claim_text(code12_nodes, "\"0\"");
			code12_nodes.forEach(detach);
			t99 = claim_text(p20_nodes, ", so visually there's no change, but in the DOM, React has changed the text content and created a new text node.");
			p20_nodes.forEach(detach);
			section3_nodes.forEach(detach);
			t100 = claim_space(nodes);
			section4 = claim_element(nodes, "SECTION", {});
			var section4_nodes = children(section4);
			h23 = claim_element(section4_nodes, "H2", {});
			var h23_nodes = children(h23);
			a16 = claim_element(h23_nodes, "A", { href: true, id: true });
			var a16_nodes = children(a16);
			t101 = claim_text(a16_nodes, "Is this a bug?");
			a16_nodes.forEach(detach);
			h23_nodes.forEach(detach);
			t102 = claim_space(section4_nodes);
			p21 = claim_element(section4_nodes, "P", {});
			var p21_nodes = children(p21);
			t103 = claim_text(p21_nodes, "So, is this a React hydration bug? or is this an expected behavior?");
			p21_nodes.forEach(detach);
			t104 = claim_space(section4_nodes);
			p22 = claim_element(section4_nodes, "P", {});
			var p22_nodes = children(p22);
			t105 = claim_text(p22_nodes, "Turns out that, it was my bug 🤮🤮.");
			p22_nodes.forEach(detach);
			t106 = claim_space(section4_nodes);
			p23 = claim_element(section4_nodes, "P", {});
			var p23_nodes = children(p23);
			t107 = claim_text(p23_nodes, "I used ");
			a17 = claim_element(p23_nodes, "A", { href: true, rel: true });
			var a17_nodes = children(a17);
			code13 = claim_element(a17_nodes, "CODE", {});
			var code13_nodes = children(code13);
			t108 = claim_text(code13_nodes, "ReactDOMServer.renderToStaticMarkup");
			code13_nodes.forEach(detach);
			a17_nodes.forEach(detach);
			t109 = claim_text(p23_nodes, " instead of ");
			a18 = claim_element(p23_nodes, "A", { href: true, rel: true });
			var a18_nodes = children(a18);
			code14 = claim_element(a18_nodes, "CODE", {});
			var code14_nodes = children(code14);
			t110 = claim_text(code14_nodes, "ReactDOMServer.renderToString");
			code14_nodes.forEach(detach);
			a18_nodes.forEach(detach);
			t111 = claim_text(p23_nodes, ".");
			p23_nodes.forEach(detach);
			t112 = claim_space(section4_nodes);
			p24 = claim_element(section4_nodes, "P", {});
			var p24_nodes = children(p24);
			t113 = claim_text(p24_nodes, "The doc says clearly,");
			p24_nodes.forEach(detach);
			t114 = claim_space(section4_nodes);
			blockquote0 = claim_element(section4_nodes, "BLOCKQUOTE", {});
			var blockquote0_nodes = children(blockquote0);
			p25 = claim_element(blockquote0_nodes, "P", {});
			var p25_nodes = children(p25);
			t115 = claim_text(p25_nodes, "If you plan to use React on the client to make the markup interactive, do not use this method. Instead, use ");
			code15 = claim_element(p25_nodes, "CODE", {});
			var code15_nodes = children(code15);
			t116 = claim_text(code15_nodes, "renderToString");
			code15_nodes.forEach(detach);
			t117 = claim_text(p25_nodes, " on the server and ");
			code16 = claim_element(p25_nodes, "CODE", {});
			var code16_nodes = children(code16);
			t118 = claim_text(code16_nodes, "ReactDOM.hydrate()");
			code16_nodes.forEach(detach);
			t119 = claim_text(p25_nodes, " on the client.");
			p25_nodes.forEach(detach);
			blockquote0_nodes.forEach(detach);
			t120 = claim_space(section4_nodes);
			p26 = claim_element(section4_nodes, "P", {});
			var p26_nodes = children(p26);
			t121 = claim_text(p26_nodes, "🙈");
			p26_nodes.forEach(detach);
			t122 = claim_space(section4_nodes);
			p27 = claim_element(section4_nodes, "P", {});
			var p27_nodes = children(p27);
			t123 = claim_text(p27_nodes, "So, what is the difference between ");
			a19 = claim_element(p27_nodes, "A", { href: true, rel: true });
			var a19_nodes = children(a19);
			code17 = claim_element(a19_nodes, "CODE", {});
			var code17_nodes = children(code17);
			t124 = claim_text(code17_nodes, "ReactDOMServer.renderToStaticMarkup");
			code17_nodes.forEach(detach);
			a19_nodes.forEach(detach);
			t125 = claim_text(p27_nodes, " and ");
			a20 = claim_element(p27_nodes, "A", { href: true, rel: true });
			var a20_nodes = children(a20);
			code18 = claim_element(a20_nodes, "CODE", {});
			var code18_nodes = children(code18);
			t126 = claim_text(code18_nodes, "ReactDOMServer.renderToString");
			code18_nodes.forEach(detach);
			a20_nodes.forEach(detach);
			t127 = claim_text(p27_nodes, " ?");
			p27_nodes.forEach(detach);
			t128 = claim_space(section4_nodes);
			p28 = claim_element(section4_nodes, "P", {});
			var p28_nodes = children(p28);
			t129 = claim_text(p28_nodes, "This is what ");
			a21 = claim_element(p28_nodes, "A", { href: true, rel: true });
			var a21_nodes = children(a21);
			code19 = claim_element(a21_nodes, "CODE", {});
			var code19_nodes = children(code19);
			t130 = claim_text(code19_nodes, "ReactDOMServer.renderToString");
			code19_nodes.forEach(detach);
			a21_nodes.forEach(detach);
			t131 = claim_text(p28_nodes, " generates:");
			p28_nodes.forEach(detach);
			t132 = claim_space(section4_nodes);
			pre8 = claim_element(section4_nodes, "PRE", { class: true });
			var pre8_nodes = children(pre8);
			pre8_nodes.forEach(detach);
			t133 = claim_space(section4_nodes);
			p29 = claim_element(section4_nodes, "P", {});
			var p29_nodes = children(p29);
			t134 = claim_text(p29_nodes, "It adds a ");
			code20 = claim_element(p29_nodes, "CODE", {});
			var code20_nodes = children(code20);
			t135 = claim_text(code20_nodes, "data-reactroot");
			code20_nodes.forEach(detach);
			t136 = claim_text(p29_nodes, " which is used by React internally. (From what I read from the code, it seemed to be used by React only to warn legacy code to ");
			a22 = claim_element(p29_nodes, "A", { href: true, rel: true });
			var a22_nodes = children(a22);
			t137 = claim_text(a22_nodes, "switch from ");
			code21 = claim_element(a22_nodes, "CODE", {});
			var code21_nodes = children(code21);
			t138 = claim_text(code21_nodes, "render()");
			code21_nodes.forEach(detach);
			t139 = claim_text(a22_nodes, " to ");
			code22 = claim_element(a22_nodes, "CODE", {});
			var code22_nodes = children(code22);
			t140 = claim_text(code22_nodes, "hydrate()");
			code22_nodes.forEach(detach);
			a22_nodes.forEach(detach);
			t141 = claim_text(p29_nodes, " before stopping support in React v17, correct me if I'm wrong).");
			p29_nodes.forEach(detach);
			t142 = claim_space(section4_nodes);
			p30 = claim_element(section4_nodes, "P", {});
			var p30_nodes = children(p30);
			t143 = claim_text(p30_nodes, "Besides, it adds a comment in between ");
			code23 = claim_element(p30_nodes, "CODE", {});
			var code23_nodes = children(code23);
			t144 = claim_text(code23_nodes, "\"Count: \"");
			code23_nodes.forEach(detach);
			t145 = claim_text(p30_nodes, " and ");
			code24 = claim_element(p30_nodes, "CODE", {});
			var code24_nodes = children(code24);
			t146 = claim_text(code24_nodes, "\"0\"");
			code24_nodes.forEach(detach);
			t147 = claim_text(p30_nodes, ", so the initial DOM looks like this:");
			p30_nodes.forEach(detach);
			t148 = claim_space(section4_nodes);
			pre9 = claim_element(section4_nodes, "PRE", { class: true });
			var pre9_nodes = children(pre9);
			pre9_nodes.forEach(detach);
			t149 = claim_space(section4_nodes);
			p31 = claim_element(section4_nodes, "P", {});
			var p31_nodes = children(p31);
			t150 = claim_text(p31_nodes, "A ");
			a23 = claim_element(p31_nodes, "A", { href: true, rel: true });
			var a23_nodes = children(a23);
			t151 = claim_text(a23_nodes, "comment node");
			a23_nodes.forEach(detach);
			t152 = claim_text(p31_nodes, " sits in between 2 text nodes, nicely separate the boundary of the 2 text nodes.");
			p31_nodes.forEach(detach);
			t153 = claim_space(section4_nodes);
			p32 = claim_element(section4_nodes, "P", {});
			var p32_nodes = children(p32);
			t154 = claim_text(p32_nodes, "As you could expect, this time around, there's no more hydration error.");
			p32_nodes.forEach(detach);
			t155 = claim_space(section4_nodes);
			p33 = claim_element(section4_nodes, "P", {});
			var p33_nodes = children(p33);
			t156 = claim_text(p33_nodes, "The initial DOM provided 2 text nodes as React would expect, and ");
			a24 = claim_element(p33_nodes, "A", { href: true, rel: true });
			var a24_nodes = children(a24);
			t157 = claim_text(a24_nodes, "React would skip comment nodes and only hydrate element nodes and text nodes");
			a24_nodes.forEach(detach);
			t158 = claim_text(p33_nodes, ".");
			p33_nodes.forEach(detach);
			section4_nodes.forEach(detach);
			t159 = claim_space(nodes);
			section5 = claim_element(nodes, "SECTION", {});
			var section5_nodes = children(section5);
			h24 = claim_element(section5_nodes, "H2", {});
			var h24_nodes = children(h24);
			a25 = claim_element(h24_nodes, "A", { href: true, id: true });
			var a25_nodes = children(a25);
			t160 = claim_text(a25_nodes, "Apply what I've learned");
			a25_nodes.forEach(detach);
			h24_nodes.forEach(detach);
			t161 = claim_space(section5_nodes);
			p34 = claim_element(section5_nodes, "P", {});
			var p34_nodes = children(p34);
			t162 = claim_text(p34_nodes, "So, the next obvious place to apply what I've learned is ");
			a26 = claim_element(p34_nodes, "A", { href: true, rel: true });
			var a26_nodes = children(a26);
			t163 = claim_text(a26_nodes, "Svelte");
			a26_nodes.forEach(detach);
			t164 = claim_text(p34_nodes, ".");
			p34_nodes.forEach(detach);
			t165 = claim_space(section5_nodes);
			p35 = claim_element(section5_nodes, "P", {});
			var p35_nodes = children(p35);
			t166 = claim_text(p35_nodes, "I found out there are 2 places that Svelte can use this technique for better hydration.");
			p35_nodes.forEach(detach);
			t167 = claim_space(section5_nodes);
			p36 = claim_element(section5_nodes, "P", {});
			var p36_nodes = children(p36);
			t168 = claim_text(p36_nodes, "The first is the hydrating text node. I found out that Svelte hydrates neighboring text nodes the same way as I described as \"a bug\", modifying the 1st text node and creating the 2nd text node. It gets \"worse\" when you have more neighboring text nodes:");
			p36_nodes.forEach(detach);
			t169 = claim_space(section5_nodes);
			pre10 = claim_element(section5_nodes, "PRE", { class: true });
			var pre10_nodes = children(pre10);
			pre10_nodes.forEach(detach);
			t170 = claim_space(section5_nodes);
			p37 = claim_element(section5_nodes, "P", {});
			var p37_nodes = children(p37);
			em = claim_element(p37_nodes, "EM", {});
			var em_nodes = children(em);
			t171 = claim_text(em_nodes, "5 neighboring text nodes");
			em_nodes.forEach(detach);
			p37_nodes.forEach(detach);
			t172 = claim_space(section5_nodes);
			p38 = claim_element(section5_nodes, "P", {});
			var p38_nodes = children(p38);
			t173 = claim_text(p38_nodes, "The second place I found the technique is useful, is hydrating ");
			a27 = claim_element(p38_nodes, "A", { href: true, rel: true });
			var a27_nodes = children(a27);
			t174 = claim_text(a27_nodes, "HTML tags (");
			code25 = claim_element(a27_nodes, "CODE", {});
			var code25_nodes = children(code25);
			t175 = claim_text(code25_nodes, "{@html string}");
			code25_nodes.forEach(detach);
			t176 = claim_text(a27_nodes, ")");
			a27_nodes.forEach(detach);
			t177 = claim_text(p38_nodes, ".");
			p38_nodes.forEach(detach);
			t178 = claim_space(section5_nodes);
			p39 = claim_element(section5_nodes, "P", {});
			var p39_nodes = children(p39);
			t179 = claim_text(p39_nodes, "HTML tags allows you to render arbitrary HTML into the DOM, just like React's ");
			a28 = claim_element(p39_nodes, "A", { href: true, rel: true });
			var a28_nodes = children(a28);
			t180 = claim_text(a28_nodes, "dangerouslySetInnerHTML");
			a28_nodes.forEach(detach);
			t181 = claim_text(p39_nodes, ".");
			p39_nodes.forEach(detach);
			t182 = claim_space(section5_nodes);
			pre11 = claim_element(section5_nodes, "PRE", { class: true });
			var pre11_nodes = children(pre11);
			pre11_nodes.forEach(detach);
			t183 = claim_space(section5_nodes);
			p40 = claim_element(section5_nodes, "P", {});
			var p40_nodes = children(p40);
			t184 = claim_text(p40_nodes, "So, why is hydrating HTML tag hard?");
			p40_nodes.forEach(detach);
			t185 = claim_space(section5_nodes);
			p41 = claim_element(section5_nodes, "P", {});
			var p41_nodes = children(p41);
			t186 = claim_text(p41_nodes, "HTML tag allow multiple elements to be passed in, which makes it hard to determine the bound of the HTML tag when hydrating.");
			p41_nodes.forEach(detach);
			t187 = claim_space(section5_nodes);
			p42 = claim_element(section5_nodes, "P", {});
			var p42_nodes = children(p42);
			t188 = claim_text(p42_nodes, "Take this example:");
			p42_nodes.forEach(detach);
			t189 = claim_space(section5_nodes);
			pre12 = claim_element(section5_nodes, "PRE", { class: true });
			var pre12_nodes = children(pre12);
			pre12_nodes.forEach(detach);
			t190 = claim_space(section5_nodes);
			p43 = claim_element(section5_nodes, "P", {});
			var p43_nodes = children(p43);
			t191 = claim_text(p43_nodes, "The rendered HTML may look something like this:");
			p43_nodes.forEach(detach);
			t192 = claim_space(section5_nodes);
			pre13 = claim_element(section5_nodes, "PRE", { class: true });
			var pre13_nodes = children(pre13);
			pre13_nodes.forEach(detach);
			t193 = claim_space(section5_nodes);
			p44 = claim_element(section5_nodes, "P", {});
			var p44_nodes = children(p44);
			t194 = claim_text(p44_nodes, "Now, can you tell me which elements belong to ");
			code26 = claim_element(p44_nodes, "CODE", {});
			var code26_nodes = children(code26);
			t195 = claim_text(code26_nodes, "<Header />");
			code26_nodes.forEach(detach);
			t196 = claim_text(p44_nodes, ", ");
			code27 = claim_element(p44_nodes, "CODE", {});
			var code27_nodes = children(code27);
			t197 = claim_text(code27_nodes, "{@html string}");
			code27_nodes.forEach(detach);
			t198 = claim_text(p44_nodes, " and ");
			code28 = claim_element(p44_nodes, "CODE", {});
			var code28_nodes = children(code28);
			t199 = claim_text(code28_nodes, "<Footer />");
			code28_nodes.forEach(detach);
			t200 = claim_text(p44_nodes, "?");
			p44_nodes.forEach(detach);
			t201 = claim_space(section5_nodes);
			p45 = claim_element(section5_nodes, "P", {});
			var p45_nodes = children(p45);
			t202 = claim_text(p45_nodes, "Let's walk through it step by step.");
			p45_nodes.forEach(detach);
			t203 = claim_space(section5_nodes);
			p46 = claim_element(section5_nodes, "P", {});
			var p46_nodes = children(p46);
			t204 = claim_text(p46_nodes, "Hydrating this component meant that we are going to claim components belong to ");
			code29 = claim_element(p46_nodes, "CODE", {});
			var code29_nodes = children(code29);
			t205 = claim_text(code29_nodes, "<Header>");
			code29_nodes.forEach(detach);
			t206 = claim_text(p46_nodes, ", ");
			code30 = claim_element(p46_nodes, "CODE", {});
			var code30_nodes = children(code30);
			t207 = claim_text(code30_nodes, "{@html string}");
			code30_nodes.forEach(detach);
			t208 = claim_text(p46_nodes, " then ");
			code31 = claim_element(p46_nodes, "CODE", {});
			var code31_nodes = children(code31);
			t209 = claim_text(code31_nodes, "<Footer>");
			code31_nodes.forEach(detach);
			t210 = claim_text(p46_nodes, ".");
			p46_nodes.forEach(detach);
			t211 = claim_space(section5_nodes);
			blockquote1 = claim_element(section5_nodes, "BLOCKQUOTE", {});
			var blockquote1_nodes = children(blockquote1);
			p47 = claim_element(blockquote1_nodes, "P", {});
			var p47_nodes = children(p47);
			strong0 = claim_element(p47_nodes, "STRONG", {});
			var strong0_nodes = children(strong0);
			t212 = claim_text(strong0_nodes, "Claiming");
			strong0_nodes.forEach(detach);
			t213 = claim_text(p47_nodes, " in Svelte means marking the element as part of the component, and hydrate it by providing reactivity to the element.");
			p47_nodes.forEach(detach);
			blockquote1_nodes.forEach(detach);
			t214 = claim_space(section5_nodes);
			p48 = claim_element(section5_nodes, "P", {});
			var p48_nodes = children(p48);
			t215 = claim_text(p48_nodes, "Claiming the ");
			code32 = claim_element(p48_nodes, "CODE", {});
			var code32_nodes = children(code32);
			t216 = claim_text(code32_nodes, "<Header />");
			code32_nodes.forEach(detach);
			t217 = claim_text(p48_nodes, " component, by itself, will claim away ");
			code33 = claim_element(p48_nodes, "CODE", {});
			var code33_nodes = children(code33);
			t218 = claim_text(code33_nodes, "<header>");
			code33_nodes.forEach(detach);
			t219 = claim_text(p48_nodes, " and ");
			code34 = claim_element(p48_nodes, "CODE", {});
			var code34_nodes = children(code34);
			t220 = claim_text(code34_nodes, "<nav>");
			code34_nodes.forEach(detach);
			t221 = claim_text(p48_nodes, ", because in ");
			code35 = claim_element(p48_nodes, "CODE", {});
			var code35_nodes = children(code35);
			t222 = claim_text(code35_nodes, "Header.svelte");
			code35_nodes.forEach(detach);
			t223 = claim_text(p48_nodes, " contains these 2 elements:");
			p48_nodes.forEach(detach);
			t224 = claim_space(section5_nodes);
			pre14 = claim_element(section5_nodes, "PRE", { class: true });
			var pre14_nodes = children(pre14);
			pre14_nodes.forEach(detach);
			t225 = claim_space(section5_nodes);
			blockquote2 = claim_element(section5_nodes, "BLOCKQUOTE", {});
			var blockquote2_nodes = children(blockquote2);
			p49 = claim_element(blockquote2_nodes, "P", {});
			var p49_nodes = children(p49);
			t226 = claim_text(p49_nodes, "You can learn about Svelte ");
			code36 = claim_element(p49_nodes, "CODE", {});
			var code36_nodes = children(code36);
			t227 = claim_text(code36_nodes, "<slot>");
			code36_nodes.forEach(detach);
			t228 = claim_space(p49_nodes);
			a29 = claim_element(p49_nodes, "A", { href: true, rel: true });
			var a29_nodes = children(a29);
			t229 = claim_text(a29_nodes, "here");
			a29_nodes.forEach(detach);
			p49_nodes.forEach(detach);
			blockquote2_nodes.forEach(detach);
			t230 = claim_space(section5_nodes);
			p50 = claim_element(section5_nodes, "P", {});
			var p50_nodes = children(p50);
			t231 = claim_text(p50_nodes, "Now claiming for ");
			code37 = claim_element(p50_nodes, "CODE", {});
			var code37_nodes = children(code37);
			t232 = claim_text(code37_nodes, "{@html string}");
			code37_nodes.forEach(detach);
			t233 = claim_text(p50_nodes, " is tricky, because you have no idea when it ends and when is the start of the ");
			code38 = claim_element(p50_nodes, "CODE", {});
			var code38_nodes = children(code38);
			t234 = claim_text(code38_nodes, "<Footer />");
			code38_nodes.forEach(detach);
			t235 = claim_text(p50_nodes, " component");
			p50_nodes.forEach(detach);
			t236 = claim_space(section5_nodes);
			p51 = claim_element(section5_nodes, "P", {});
			var p51_nodes = children(p51);
			t237 = claim_text(p51_nodes, "If we put a comment as a marker for the end of the HTML tag, it would make things easier:");
			p51_nodes.forEach(detach);
			t238 = claim_space(section5_nodes);
			pre15 = claim_element(section5_nodes, "PRE", { class: true });
			var pre15_nodes = children(pre15);
			pre15_nodes.forEach(detach);
			t239 = claim_space(section5_nodes);
			pre16 = claim_element(section5_nodes, "PRE", { class: true });
			var pre16_nodes = children(pre16);
			pre16_nodes.forEach(detach);
			section5_nodes.forEach(detach);
			t240 = claim_space(nodes);
			section6 = claim_element(nodes, "SECTION", {});
			var section6_nodes = children(section6);
			h25 = claim_element(section6_nodes, "H2", {});
			var h25_nodes = children(h25);
			a30 = claim_element(h25_nodes, "A", { href: true, id: true });
			var a30_nodes = children(a30);
			t241 = claim_text(a30_nodes, "dangerouslySetInnerHtml");
			a30_nodes.forEach(detach);
			h25_nodes.forEach(detach);
			t242 = claim_space(section6_nodes);
			p52 = claim_element(section6_nodes, "P", {});
			var p52_nodes = children(p52);
			t243 = claim_text(p52_nodes, "React has ");
			a31 = claim_element(p52_nodes, "A", { href: true, rel: true });
			var a31_nodes = children(a31);
			t244 = claim_text(a31_nodes, "dangerouslySetInnerHTML");
			a31_nodes.forEach(detach);
			t245 = claim_text(p52_nodes, " right? Does it have the same issue?");
			p52_nodes.forEach(detach);
			t246 = claim_space(section6_nodes);
			p53 = claim_element(section6_nodes, "P", {});
			var p53_nodes = children(p53);
			t247 = claim_text(p53_nodes, "Apparently not. ");
			code39 = claim_element(p53_nodes, "CODE", {});
			var code39_nodes = children(code39);
			t248 = claim_text(code39_nodes, "dangerouslySetInnerHTML");
			code39_nodes.forEach(detach);
			t249 = claim_text(p53_nodes, " is always used inside an HTML element, so the parent element is the boundary of the inner HTML content.");
			p53_nodes.forEach(detach);
			t250 = claim_space(section6_nodes);
			pre17 = claim_element(section6_nodes, "PRE", { class: true });
			var pre17_nodes = children(pre17);
			pre17_nodes.forEach(detach);
			t251 = claim_space(section6_nodes);
			pre18 = claim_element(section6_nodes, "PRE", { class: true });
			var pre18_nodes = children(pre18);
			pre18_nodes.forEach(detach);
			t252 = claim_space(section6_nodes);
			p54 = claim_element(section6_nodes, "P", {});
			var p54_nodes = children(p54);
			t253 = claim_text(p54_nodes, "Unless ");
			code40 = claim_element(p54_nodes, "CODE", {});
			var code40_nodes = children(code40);
			t254 = claim_text(code40_nodes, "dangerouslySetInnerHTML");
			code40_nodes.forEach(detach);
			t255 = claim_text(p54_nodes, " is supported on ");
			code41 = claim_element(p54_nodes, "CODE", {});
			var code41_nodes = children(code41);
			t256 = claim_text(code41_nodes, "React.Fragment");
			code41_nodes.forEach(detach);
			t257 = claim_text(p54_nodes, ", then it would not be a problem.");
			p54_nodes.forEach(detach);
			section6_nodes.forEach(detach);
			t258 = claim_space(nodes);
			section7 = claim_element(nodes, "SECTION", {});
			var section7_nodes = children(section7);
			h26 = claim_element(section7_nodes, "H2", {});
			var h26_nodes = children(h26);
			a32 = claim_element(h26_nodes, "A", { href: true, id: true });
			var a32_nodes = children(a32);
			t259 = claim_text(a32_nodes, "React Partial Hydration");
			a32_nodes.forEach(detach);
			h26_nodes.forEach(detach);
			t260 = claim_space(section7_nodes);
			p55 = claim_element(section7_nodes, "P", {});
			var p55_nodes = children(p55);
			t261 = claim_text(p55_nodes, "Partial hydration in React is a mechanism to partially hydrate a server-rendered result while other parts of the pages are still loading the code or data.");
			p55_nodes.forEach(detach);
			t262 = claim_space(section7_nodes);
			p56 = claim_element(section7_nodes, "P", {});
			var p56_nodes = children(p56);
			t263 = claim_text(p56_nodes, "This is helpful when you are hydrating a ");
			a33 = claim_element(p56_nodes, "A", { href: true, rel: true });
			var a33_nodes = children(a33);
			code42 = claim_element(a33_nodes, "CODE", {});
			var code42_nodes = children(code42);
			t264 = claim_text(code42_nodes, "<Suspense>");
			code42_nodes.forEach(detach);
			t265 = claim_text(a33_nodes, " component");
			a33_nodes.forEach(detach);
			t266 = claim_text(p56_nodes, ". The server-rendered HTML may have rendered based on the code or data, which is yet to be fetched by the component. If React now shows the fallback content during the hydration, the user may see a flash of the actual content, before turning into a loading state until the code or data is ready.");
			p56_nodes.forEach(detach);
			t267 = claim_space(section7_nodes);
			p57 = claim_element(section7_nodes, "P", {});
			var p57_nodes = children(p57);
			t268 = claim_text(p57_nodes, "Partial hydration allows React to not hydrate those ");
			code43 = claim_element(p57_nodes, "CODE", {});
			var code43_nodes = children(code43);
			t269 = claim_text(code43_nodes, "<Suspense />");
			code43_nodes.forEach(detach);
			t270 = claim_text(p57_nodes, " component until the code or data is ready.");
			p57_nodes.forEach(detach);
			t271 = claim_space(section7_nodes);
			p58 = claim_element(section7_nodes, "P", {});
			var p58_nodes = children(p58);
			t272 = claim_text(p58_nodes, "So, how does React knows the boundary of ");
			code44 = claim_element(p58_nodes, "CODE", {});
			var code44_nodes = children(code44);
			t273 = claim_text(code44_nodes, "<Suspense />");
			code44_nodes.forEach(detach);
			t274 = claim_text(p58_nodes, " from the server-rendered HTML which it could safely skip, before hydrating them when it's ready?");
			p58_nodes.forEach(detach);
			t275 = claim_space(section7_nodes);
			p59 = claim_element(section7_nodes, "P", {});
			var p59_nodes = children(p59);
			t276 = claim_text(p59_nodes, "It's ");
			a34 = claim_element(p59_nodes, "A", { href: true, rel: true });
			var a34_nodes = children(a34);
			t277 = claim_text(a34_nodes, "the marker comment");
			a34_nodes.forEach(detach);
			t278 = claim_text(p59_nodes, " to the rescue again!");
			p59_nodes.forEach(detach);
			t279 = claim_space(section7_nodes);
			blockquote3 = claim_element(section7_nodes, "BLOCKQUOTE", {});
			var blockquote3_nodes = children(blockquote3);
			p60 = claim_element(blockquote3_nodes, "P", {});
			var p60_nodes = children(p60);
			strong1 = claim_element(p60_nodes, "STRONG", {});
			var strong1_nodes = children(strong1);
			t280 = claim_text(strong1_nodes, "Disclaimer");
			strong1_nodes.forEach(detach);
			t281 = claim_text(p60_nodes, "\nThe section above is entirely based on my understanding by reading the ");
			a35 = claim_element(p60_nodes, "A", { href: true, rel: true });
			var a35_nodes = children(a35);
			t282 = claim_text(a35_nodes, "Partial Hydration PR");
			a35_nodes.forEach(detach);
			t283 = claim_text(p60_nodes, ", please feel free to correct me if I'm wrong.");
			p60_nodes.forEach(detach);
			blockquote3_nodes.forEach(detach);
			section7_nodes.forEach(detach);
			t284 = claim_space(nodes);
			section8 = claim_element(nodes, "SECTION", {});
			var section8_nodes = children(section8);
			h27 = claim_element(section8_nodes, "H2", {});
			var h27_nodes = children(h27);
			a36 = claim_element(h27_nodes, "A", { href: true, id: true });
			var a36_nodes = children(a36);
			t285 = claim_text(a36_nodes, "References");
			a36_nodes.forEach(detach);
			h27_nodes.forEach(detach);
			t286 = claim_space(section8_nodes);
			ul3 = claim_element(section8_nodes, "UL", {});
			var ul3_nodes = children(ul3);
			li11 = claim_element(ul3_nodes, "LI", {});
			var li11_nodes = children(li11);
			t287 = claim_text(li11_nodes, "Some interesting React commits and PRs that serves as a good entry point to understand hydration:");
			ul1 = claim_element(li11_nodes, "UL", {});
			var ul1_nodes = children(ul1);
			li8 = claim_element(ul1_nodes, "LI", {});
			var li8_nodes = children(li8);
			a37 = claim_element(li8_nodes, "A", { href: true, rel: true });
			var a37_nodes = children(a37);
			t288 = claim_text(a37_nodes, "Remove most comments from HTML generation output");
			a37_nodes.forEach(detach);
			li8_nodes.forEach(detach);
			t289 = claim_space(ul1_nodes);
			li9 = claim_element(ul1_nodes, "LI", {});
			var li9_nodes = children(li9);
			a38 = claim_element(li9_nodes, "A", { href: true, rel: true });
			var a38_nodes = children(a38);
			t290 = claim_text(a38_nodes, "Warn When The HTML Mismatches in DEV");
			a38_nodes.forEach(detach);
			li9_nodes.forEach(detach);
			t291 = claim_space(ul1_nodes);
			li10 = claim_element(ul1_nodes, "LI", {});
			var li10_nodes = children(li10);
			a39 = claim_element(li10_nodes, "A", { href: true, rel: true });
			var a39_nodes = children(a39);
			t292 = claim_text(a39_nodes, "Partial Hydration PR");
			a39_nodes.forEach(detach);
			li10_nodes.forEach(detach);
			ul1_nodes.forEach(detach);
			li11_nodes.forEach(detach);
			t293 = claim_space(ul3_nodes);
			li13 = claim_element(ul3_nodes, "LI", {});
			var li13_nodes = children(li13);
			t294 = claim_text(li13_nodes, "Some related Svelte PRs");
			ul2 = claim_element(li13_nodes, "UL", {});
			var ul2_nodes = children(ul2);
			li12 = claim_element(ul2_nodes, "LI", {});
			var li12_nodes = children(li12);
			a40 = claim_element(li12_nodes, "A", { href: true, rel: true });
			var a40_nodes = children(a40);
			t295 = claim_text(a40_nodes, "Use SSR rendered as initial html for runtime hydration test");
			a40_nodes.forEach(detach);
			li12_nodes.forEach(detach);
			ul2_nodes.forEach(detach);
			li13_nodes.forEach(detach);
			ul3_nodes.forEach(detach);
			section8_nodes.forEach(detach);
			this.h();
		},
		h() {
			attr(a0, "href", "#disclaimer");
			attr(a1, "href", "#background");
			attr(a2, "href", "#the-investigation");
			attr(a3, "href", "#is-this-a-bug");
			attr(a4, "href", "#apply-what-i-ve-learned");
			attr(a5, "href", "#dangerouslysetinnerhtml");
			attr(a6, "href", "#react-partial-hydration");
			attr(a7, "href", "#references");
			attr(ul0, "class", "sitemap");
			attr(ul0, "id", "sitemap");
			attr(ul0, "role", "navigation");
			attr(ul0, "aria-label", "Table of Contents");
			attr(a8, "href", "#disclaimer");
			attr(a8, "id", "disclaimer");
			attr(a9, "href", "https://developers.google.com/web/updates/2019/02/rendering-on-the-web");
			attr(a9, "rel", "nofollow");
			attr(a10, "href", "https://twitter.com/_developit");
			attr(a10, "rel", "nofollow");
			attr(a11, "href", "https://twitter.com/addyosmani");
			attr(a11, "rel", "nofollow");
			attr(a12, "href", "https://hackernoon.com/whats-new-with-server-side-rendering-in-react-16-9b0d78585d67");
			attr(a12, "rel", "nofollow");
			attr(a13, "href", "https://www.freecodecamp.org/news/demystifying-reacts-server-side-render-de335d408fe4/");
			attr(a13, "rel", "nofollow");
			attr(a14, "href", "#background");
			attr(a14, "id", "background");
			attr(pre0, "class", "language-null");
			attr(pre1, "class", "language-js");
			attr(a15, "href", "#the-investigation");
			attr(a15, "id", "the-investigation");
			attr(pre2, "class", "language-html");
			attr(pre3, "class", "language-html");
			attr(pre4, "class", "language-html");
			attr(pre5, "class", "language-jsx");
			attr(pre6, "class", "language-js");
			attr(pre7, "class", "language-null");
			attr(a16, "href", "#is-this-a-bug");
			attr(a16, "id", "is-this-a-bug");
			attr(a17, "href", "https://reactjs.org/docs/react-dom-server.html#rendertostaticmarkup");
			attr(a17, "rel", "nofollow");
			attr(a18, "href", "https://reactjs.org/docs/react-dom-server.html#rendertostring");
			attr(a18, "rel", "nofollow");
			attr(a19, "href", "https://reactjs.org/docs/react-dom-server.html#rendertostaticmarkup");
			attr(a19, "rel", "nofollow");
			attr(a20, "href", "https://reactjs.org/docs/react-dom-server.html#rendertostring");
			attr(a20, "rel", "nofollow");
			attr(a21, "href", "https://reactjs.org/docs/react-dom-server.html#rendertostring");
			attr(a21, "rel", "nofollow");
			attr(pre8, "class", "language-diff");
			attr(a22, "href", "https://hackernoon.com/whats-new-with-server-side-rendering-in-react-16-9b0d78585d67");
			attr(a22, "rel", "nofollow");
			attr(pre9, "class", "language-html");
			attr(a23, "href", "https://developer.mozilla.org/en-US/docs/Web/API/Comment");
			attr(a23, "rel", "nofollow");
			attr(a24, "href", "https://github.com/facebook/react/blob/1a6d8179b6dd427fdf7ee50d5ac45ae5a40979eb/packages/react-dom/src/client/ReactDOMHostConfig.js#L703-L709");
			attr(a24, "rel", "nofollow");
			attr(a25, "href", "#apply-what-i-ve-learned");
			attr(a25, "id", "apply-what-i-ve-learned");
			attr(a26, "href", "http://github.com/sveltejs/svelte");
			attr(a26, "rel", "nofollow");
			attr(pre10, "class", "language-html");
			attr(a27, "href", "https://svelte.dev/tutorial/html-tags");
			attr(a27, "rel", "nofollow");
			attr(a28, "href", "https://reactjs.org/docs/dom-elements.html#dangerouslysetinnerhtml");
			attr(a28, "rel", "nofollow");
			attr(pre11, "class", "language-html");
			attr(pre12, "class", "language-html");
			attr(pre13, "class", "language-html");
			attr(pre14, "class", "language-html");
			attr(a29, "href", "https://svelte.dev/tutorial/slots");
			attr(a29, "rel", "nofollow");
			attr(pre15, "class", "language-html");
			attr(pre16, "class", "language-js");
			attr(a30, "href", "#dangerouslysetinnerhtml");
			attr(a30, "id", "dangerouslysetinnerhtml");
			attr(a31, "href", "https://reactjs.org/docs/dom-elements.html#dangerouslysetinnerhtml");
			attr(a31, "rel", "nofollow");
			attr(pre17, "class", "language-js");
			attr(pre18, "class", "language-html");
			attr(a32, "href", "#react-partial-hydration");
			attr(a32, "id", "react-partial-hydration");
			attr(a33, "href", "https://reactjs.org/docs/react-api.html#reactsuspense");
			attr(a33, "rel", "nofollow");
			attr(a34, "href", "https://github.com/facebook/react/blob/1a6d8179b6dd427fdf7ee50d5ac45ae5a40979eb/packages/react-dom/src/client/ReactDOMHostConfig.js#L131-L134");
			attr(a34, "rel", "nofollow");
			attr(a35, "href", "https://github.com/facebook/react/pull/14717");
			attr(a35, "rel", "nofollow");
			attr(a36, "href", "#references");
			attr(a36, "id", "references");
			attr(a37, "href", "https://github.com/facebook/react/commit/e955008b9bbee93fcaf423d4afaf4d22023e2c3f");
			attr(a37, "rel", "nofollow");
			attr(a38, "href", "https://github.com/facebook/react/pull/10026/files");
			attr(a38, "rel", "nofollow");
			attr(a39, "href", "https://github.com/facebook/react/pull/14717");
			attr(a39, "rel", "nofollow");
			attr(a40, "href", "https://github.com/sveltejs/svelte/pull/4444");
			attr(a40, "rel", "nofollow");
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
			append(ul0, li7);
			append(li7, a7);
			append(a7, t7);
			insert(target, t8, anchor);
			insert(target, section1, anchor);
			append(section1, h20);
			append(h20, a8);
			append(a8, t9);
			append(section1, t10);
			append(section1, p0);
			append(p0, t11);
			append(p0, a9);
			append(a9, t12);
			append(p0, t13);
			append(p0, a10);
			append(a10, t14);
			append(p0, t15);
			append(p0, a11);
			append(a11, t16);
			append(p0, t17);
			append(section1, t18);
			append(section1, p1);
			append(p1, t19);
			append(p1, a12);
			append(a12, t20);
			append(p1, t21);
			append(p1, a13);
			append(a13, t22);
			append(p1, t23);
			append(section1, t24);
			append(section1, p2);
			append(p2, t25);
			insert(target, t26, anchor);
			insert(target, section2, anchor);
			append(section2, h21);
			append(h21, a14);
			append(a14, t27);
			append(section2, t28);
			append(section2, p3);
			append(p3, t29);
			append(section2, t30);
			append(section2, pre0);
			pre0.innerHTML = raw0_value;
			append(section2, t31);
			append(section2, p4);
			append(p4, t32);
			append(section2, t33);
			append(section2, pre1);
			pre1.innerHTML = raw1_value;
			append(section2, t34);
			append(section2, p5);
			append(p5, t35);
			append(section2, t36);
			append(section2, p6);
			append(p6, t37);
			append(section2, t38);
			append(section2, p7);
			append(p7, t39);
			insert(target, t40, anchor);
			insert(target, section3, anchor);
			append(section3, h22);
			append(h22, a15);
			append(a15, t41);
			append(section3, t42);
			append(section3, p8);
			append(p8, t43);
			append(section3, t44);
			append(section3, pre2);
			pre2.innerHTML = raw2_value;
			append(section3, t45);
			append(section3, p9);
			append(p9, t46);
			append(section3, t47);
			append(section3, p10);
			append(p10, t48);
			append(section3, t49);
			append(section3, pre3);
			pre3.innerHTML = raw3_value;
			append(section3, t50);
			append(section3, pre4);
			pre4.innerHTML = raw4_value;
			append(section3, t51);
			append(section3, p11);
			append(p11, t52);
			append(section3, t53);
			append(section3, p12);
			append(p12, t54);
			append(p12, code0);
			append(code0, t55);
			append(p12, t56);
			append(p12, code1);
			append(code1, t57);
			append(p12, t58);
			append(p12, code2);
			append(code2, t59);
			append(p12, t60);
			append(section3, t61);
			append(section3, p13);
			append(p13, t62);
			append(p13, code3);
			append(code3, t63);
			append(p13, t64);
			append(section3, t65);
			append(section3, p14);
			append(p14, t66);
			append(p14, code4);
			append(code4, t67);
			append(p14, t68);
			append(p14, code5);
			append(code5, t69);
			append(p14, t70);
			append(p14, code6);
			append(code6, t71);
			append(p14, t72);
			append(section3, t73);
			append(section3, pre5);
			pre5.innerHTML = raw5_value;
			append(section3, t74);
			append(section3, p15);
			append(p15, t75);
			append(section3, t76);
			append(section3, pre6);
			pre6.innerHTML = raw6_value;
			append(section3, t77);
			append(section3, p16);
			append(p16, t78);
			append(p16, code7);
			append(code7, t79);
			append(p16, t80);
			append(section3, t81);
			append(section3, p17);
			append(p17, t82);
			append(p17, code8);
			append(code8, t83);
			append(p17, t84);
			append(section3, t85);
			append(section3, p18);
			append(p18, t86);
			append(section3, t87);
			append(section3, p19);
			append(p19, t88);
			append(p19, code9);
			append(code9, t89);
			append(p19, t90);
			append(p19, code10);
			append(code10, t91);
			append(p19, t92);
			append(section3, t93);
			append(section3, pre7);
			pre7.innerHTML = raw7_value;
			append(section3, t94);
			append(section3, p20);
			append(p20, t95);
			append(p20, code11);
			append(code11, t96);
			append(p20, t97);
			append(p20, code12);
			append(code12, t98);
			append(p20, t99);
			insert(target, t100, anchor);
			insert(target, section4, anchor);
			append(section4, h23);
			append(h23, a16);
			append(a16, t101);
			append(section4, t102);
			append(section4, p21);
			append(p21, t103);
			append(section4, t104);
			append(section4, p22);
			append(p22, t105);
			append(section4, t106);
			append(section4, p23);
			append(p23, t107);
			append(p23, a17);
			append(a17, code13);
			append(code13, t108);
			append(p23, t109);
			append(p23, a18);
			append(a18, code14);
			append(code14, t110);
			append(p23, t111);
			append(section4, t112);
			append(section4, p24);
			append(p24, t113);
			append(section4, t114);
			append(section4, blockquote0);
			append(blockquote0, p25);
			append(p25, t115);
			append(p25, code15);
			append(code15, t116);
			append(p25, t117);
			append(p25, code16);
			append(code16, t118);
			append(p25, t119);
			append(section4, t120);
			append(section4, p26);
			append(p26, t121);
			append(section4, t122);
			append(section4, p27);
			append(p27, t123);
			append(p27, a19);
			append(a19, code17);
			append(code17, t124);
			append(p27, t125);
			append(p27, a20);
			append(a20, code18);
			append(code18, t126);
			append(p27, t127);
			append(section4, t128);
			append(section4, p28);
			append(p28, t129);
			append(p28, a21);
			append(a21, code19);
			append(code19, t130);
			append(p28, t131);
			append(section4, t132);
			append(section4, pre8);
			pre8.innerHTML = raw8_value;
			append(section4, t133);
			append(section4, p29);
			append(p29, t134);
			append(p29, code20);
			append(code20, t135);
			append(p29, t136);
			append(p29, a22);
			append(a22, t137);
			append(a22, code21);
			append(code21, t138);
			append(a22, t139);
			append(a22, code22);
			append(code22, t140);
			append(p29, t141);
			append(section4, t142);
			append(section4, p30);
			append(p30, t143);
			append(p30, code23);
			append(code23, t144);
			append(p30, t145);
			append(p30, code24);
			append(code24, t146);
			append(p30, t147);
			append(section4, t148);
			append(section4, pre9);
			pre9.innerHTML = raw9_value;
			append(section4, t149);
			append(section4, p31);
			append(p31, t150);
			append(p31, a23);
			append(a23, t151);
			append(p31, t152);
			append(section4, t153);
			append(section4, p32);
			append(p32, t154);
			append(section4, t155);
			append(section4, p33);
			append(p33, t156);
			append(p33, a24);
			append(a24, t157);
			append(p33, t158);
			insert(target, t159, anchor);
			insert(target, section5, anchor);
			append(section5, h24);
			append(h24, a25);
			append(a25, t160);
			append(section5, t161);
			append(section5, p34);
			append(p34, t162);
			append(p34, a26);
			append(a26, t163);
			append(p34, t164);
			append(section5, t165);
			append(section5, p35);
			append(p35, t166);
			append(section5, t167);
			append(section5, p36);
			append(p36, t168);
			append(section5, t169);
			append(section5, pre10);
			pre10.innerHTML = raw10_value;
			append(section5, t170);
			append(section5, p37);
			append(p37, em);
			append(em, t171);
			append(section5, t172);
			append(section5, p38);
			append(p38, t173);
			append(p38, a27);
			append(a27, t174);
			append(a27, code25);
			append(code25, t175);
			append(a27, t176);
			append(p38, t177);
			append(section5, t178);
			append(section5, p39);
			append(p39, t179);
			append(p39, a28);
			append(a28, t180);
			append(p39, t181);
			append(section5, t182);
			append(section5, pre11);
			pre11.innerHTML = raw11_value;
			append(section5, t183);
			append(section5, p40);
			append(p40, t184);
			append(section5, t185);
			append(section5, p41);
			append(p41, t186);
			append(section5, t187);
			append(section5, p42);
			append(p42, t188);
			append(section5, t189);
			append(section5, pre12);
			pre12.innerHTML = raw12_value;
			append(section5, t190);
			append(section5, p43);
			append(p43, t191);
			append(section5, t192);
			append(section5, pre13);
			pre13.innerHTML = raw13_value;
			append(section5, t193);
			append(section5, p44);
			append(p44, t194);
			append(p44, code26);
			append(code26, t195);
			append(p44, t196);
			append(p44, code27);
			append(code27, t197);
			append(p44, t198);
			append(p44, code28);
			append(code28, t199);
			append(p44, t200);
			append(section5, t201);
			append(section5, p45);
			append(p45, t202);
			append(section5, t203);
			append(section5, p46);
			append(p46, t204);
			append(p46, code29);
			append(code29, t205);
			append(p46, t206);
			append(p46, code30);
			append(code30, t207);
			append(p46, t208);
			append(p46, code31);
			append(code31, t209);
			append(p46, t210);
			append(section5, t211);
			append(section5, blockquote1);
			append(blockquote1, p47);
			append(p47, strong0);
			append(strong0, t212);
			append(p47, t213);
			append(section5, t214);
			append(section5, p48);
			append(p48, t215);
			append(p48, code32);
			append(code32, t216);
			append(p48, t217);
			append(p48, code33);
			append(code33, t218);
			append(p48, t219);
			append(p48, code34);
			append(code34, t220);
			append(p48, t221);
			append(p48, code35);
			append(code35, t222);
			append(p48, t223);
			append(section5, t224);
			append(section5, pre14);
			pre14.innerHTML = raw14_value;
			append(section5, t225);
			append(section5, blockquote2);
			append(blockquote2, p49);
			append(p49, t226);
			append(p49, code36);
			append(code36, t227);
			append(p49, t228);
			append(p49, a29);
			append(a29, t229);
			append(section5, t230);
			append(section5, p50);
			append(p50, t231);
			append(p50, code37);
			append(code37, t232);
			append(p50, t233);
			append(p50, code38);
			append(code38, t234);
			append(p50, t235);
			append(section5, t236);
			append(section5, p51);
			append(p51, t237);
			append(section5, t238);
			append(section5, pre15);
			pre15.innerHTML = raw15_value;
			append(section5, t239);
			append(section5, pre16);
			pre16.innerHTML = raw16_value;
			insert(target, t240, anchor);
			insert(target, section6, anchor);
			append(section6, h25);
			append(h25, a30);
			append(a30, t241);
			append(section6, t242);
			append(section6, p52);
			append(p52, t243);
			append(p52, a31);
			append(a31, t244);
			append(p52, t245);
			append(section6, t246);
			append(section6, p53);
			append(p53, t247);
			append(p53, code39);
			append(code39, t248);
			append(p53, t249);
			append(section6, t250);
			append(section6, pre17);
			pre17.innerHTML = raw17_value;
			append(section6, t251);
			append(section6, pre18);
			pre18.innerHTML = raw18_value;
			append(section6, t252);
			append(section6, p54);
			append(p54, t253);
			append(p54, code40);
			append(code40, t254);
			append(p54, t255);
			append(p54, code41);
			append(code41, t256);
			append(p54, t257);
			insert(target, t258, anchor);
			insert(target, section7, anchor);
			append(section7, h26);
			append(h26, a32);
			append(a32, t259);
			append(section7, t260);
			append(section7, p55);
			append(p55, t261);
			append(section7, t262);
			append(section7, p56);
			append(p56, t263);
			append(p56, a33);
			append(a33, code42);
			append(code42, t264);
			append(a33, t265);
			append(p56, t266);
			append(section7, t267);
			append(section7, p57);
			append(p57, t268);
			append(p57, code43);
			append(code43, t269);
			append(p57, t270);
			append(section7, t271);
			append(section7, p58);
			append(p58, t272);
			append(p58, code44);
			append(code44, t273);
			append(p58, t274);
			append(section7, t275);
			append(section7, p59);
			append(p59, t276);
			append(p59, a34);
			append(a34, t277);
			append(p59, t278);
			append(section7, t279);
			append(section7, blockquote3);
			append(blockquote3, p60);
			append(p60, strong1);
			append(strong1, t280);
			append(p60, t281);
			append(p60, a35);
			append(a35, t282);
			append(p60, t283);
			insert(target, t284, anchor);
			insert(target, section8, anchor);
			append(section8, h27);
			append(h27, a36);
			append(a36, t285);
			append(section8, t286);
			append(section8, ul3);
			append(ul3, li11);
			append(li11, t287);
			append(li11, ul1);
			append(ul1, li8);
			append(li8, a37);
			append(a37, t288);
			append(ul1, t289);
			append(ul1, li9);
			append(li9, a38);
			append(a38, t290);
			append(ul1, t291);
			append(ul1, li10);
			append(li10, a39);
			append(a39, t292);
			append(ul3, t293);
			append(ul3, li13);
			append(li13, t294);
			append(li13, ul2);
			append(ul2, li12);
			append(li12, a40);
			append(a40, t295);
		},
		p: noop,
		d(detaching) {
			if (detaching) detach(section0);
			if (detaching) detach(t8);
			if (detaching) detach(section1);
			if (detaching) detach(t26);
			if (detaching) detach(section2);
			if (detaching) detach(t40);
			if (detaching) detach(section3);
			if (detaching) detach(t100);
			if (detaching) detach(section4);
			if (detaching) detach(t159);
			if (detaching) detach(section5);
			if (detaching) detach(t240);
			if (detaching) detach(section6);
			if (detaching) detach(t258);
			if (detaching) detach(section7);
			if (detaching) detach(t284);
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
	"title": "Hydrating text content from Server-Side Rendering",
	"date": "2020-02-28T08:00:00Z",
	"slug": "hydrating-text-content",
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
