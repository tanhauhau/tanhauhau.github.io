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

var baseCss = "https://lihautan.com/micro-frontends-poc/assets/_blog-299aa480.css";

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
					"@id": "https%3A%2F%2Flihautan.com%2Fmicro-frontends-poc",
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
			attr(meta11, "content", "https%3A%2F%2Flihautan.com%2Fmicro-frontends-poc");
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
							"@id": "https%3A%2F%2Flihautan.com%2Fmicro-frontends-poc",
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

/* content/blog/micro-frontends-poc/@@page-markup.svelte generated by Svelte v3.24.0 */

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
	let ul1;
	let li6;
	let a6;
	let t6;
	let t7;
	let p0;
	let t8;
	let a7;
	let t9;
	let t10;
	let t11;
	let p1;
	let t12;
	let a8;
	let t13;
	let t14;
	let t15;
	let section1;
	let h20;
	let a9;
	let t16;
	let t17;
	let ul2;
	let li7;
	let p2;
	let strong0;
	let t18;
	let t19;
	let p3;
	let t20;
	let t21;
	let li8;
	let p4;
	let strong1;
	let t22;
	let t23;
	let p5;
	let t24;
	let code0;
	let t25;
	let t26;
	let code1;
	let t27;
	let t28;
	let strong2;
	let t29;
	let t30;
	let code2;
	let t31;
	let t32;
	let code3;
	let t33;
	let t34;
	let t35;
	let li9;
	let p6;
	let strong3;
	let t36;
	let t37;
	let p7;
	let t38;
	let a10;
	let t39;
	let t40;
	let t41;
	let p8;
	let t42;
	let t43;
	let section2;
	let h21;
	let a11;
	let t44;
	let t45;
	let p9;
	let t46;
	let a12;
	let t47;
	let t48;
	let t49;
	let p10;
	let t50;
	let t51;
	let ul3;
	let li10;
	let t52;
	let t53;
	let li11;
	let t54;
	let t55;
	let p11;
	let strong4;
	let t56;
	let t57;
	let a13;
	let t58;
	let t59;
	let strong5;
	let t60;
	let t61;
	let a14;
	let t62;
	let t63;
	let t64;
	let p12;
	let t65;
	let t66;
	let section3;
	let h22;
	let a15;
	let t67;
	let t68;
	let p13;
	let t69;
	let a16;
	let t70;
	let t71;
	let a17;
	let t72;
	let t73;
	let code4;
	let t74;
	let t75;
	let em0;
	let t76;
	let t77;
	let t78;
	let p14;
	let t79;
	let code5;
	let t80;
	let t81;
	let code6;
	let t82;
	let t83;
	let t84;
	let p15;
	let t85;
	let t86;
	let p16;
	let t87;
	let a18;
	let t88;
	let t89;
	let t90;
	let p17;
	let t91;
	let t92;
	let p18;
	let t93;
	let a19;
	let t94;
	let t95;
	let t96;
	let p19;
	let t97;
	let code7;
	let t98;
	let t99;
	let t100;
	let p20;
	let t101;
	let code8;
	let t102;
	let t103;
	let code9;
	let t104;
	let t105;
	let t106;
	let section4;
	let h23;
	let a20;
	let t107;
	let t108;
	let p21;
	let t109;
	let code10;
	let t110;
	let t111;
	let code11;
	let t112;
	let t113;
	let code12;
	let t114;
	let t115;
	let t116;
	let ul4;
	let li12;
	let p22;
	let strong6;
	let t117;
	let t118;
	let code13;
	let t119;
	let t120;
	let code14;
	let t121;
	let t122;
	let t123;
	let li13;
	let p23;
	let strong7;
	let t124;
	let t125;
	let code15;
	let t126;
	let t127;
	let code16;
	let t128;
	let t129;
	let em1;
	let t130;
	let t131;
	let t132;
	let p24;
	let t133;
	let code17;
	let t134;
	let t135;
	let code18;
	let t136;
	let t137;
	let a21;
	let t138;
	let code19;
	let t139;
	let t140;
	let t141;
	let t142;
	let p25;
	let t143;
	let em2;
	let t144;
	let t145;
	let a22;
	let t146;
	let t147;
	let a23;
	let t148;
	let t149;
	let code20;
	let t150;
	let t151;
	let t152;
	let section5;
	let h24;
	let a24;
	let t153;
	let t154;
	let p26;
	let t155;
	let a25;
	let t156;
	let code21;
	let t157;
	let t158;
	let code22;
	let t159;
	let t160;
	let p27;
	let t161;
	let a26;
	let t162;
	let t163;
	let a27;
	let t164;
	let t165;
	let t166;
	let p28;
	let t167;
	let t168;
	let section6;
	let h1;
	let a28;
	let t169;
	let t170;
	let p29;
	let t171;
	let code23;
	let t172;
	let t173;
	let a29;
	let t174;
	let t175;
	let t176;
	let p30;
	let t177;
	let code24;
	let t178;
	let t179;
	let code25;
	let t180;
	let t181;
	let t182;
	let section7;
	let h25;
	let a30;
	let t183;
	let t184;
	let p31;
	let t185;

	return {
		c() {
			section0 = element("section");
			ul0 = element("ul");
			li0 = element("li");
			a0 = element("a");
			t0 = text("What is this different?");
			li1 = element("li");
			a1 = element("a");
			t1 = text("The Bridge");
			li2 = element("li");
			a2 = element("a");
			t2 = text("The routing mechanism");
			li3 = element("li");
			a3 = element("a");
			t3 = text("The global registry");
			li4 = element("li");
			a4 = element("a");
			t4 = text("Shared Global State");
			li5 = element("li");
			a5 = element("a");
			t5 = text("Trying it out locally");
			ul1 = element("ul");
			li6 = element("li");
			a6 = element("a");
			t6 = text("Developing the micro frontend individually");
			t7 = space();
			p0 = element("p");
			t8 = text("Yes, this is ");
			a7 = element("a");
			t9 = text("yet another proof of concept for micro frontend architecture");
			t10 = text(".");
			t11 = space();
			p1 = element("p");
			t12 = text("Please ");
			a8 = element("a");
			t13 = text("check out the code");
			t14 = text(" and try to play with it locally.");
			t15 = space();
			section1 = element("section");
			h20 = element("h2");
			a9 = element("a");
			t16 = text("What is this different?");
			t17 = space();
			ul2 = element("ul");
			li7 = element("li");
			p2 = element("p");
			strong0 = element("strong");
			t18 = text("No centralised routing definition");
			t19 = space();
			p3 = element("p");
			t20 = text("Once the main SPA is deployed, new routes can be added to the SPA without redeploying the main SPA.");
			t21 = space();
			li8 = element("li");
			p4 = element("p");
			strong1 = element("strong");
			t22 = text("A central registry");
			t23 = space();
			p5 = element("p");
			t24 = text("Individual micro frontend does not need to bundle in common dependencies like ");
			code0 = element("code");
			t25 = text("react");
			t26 = text(", ");
			code1 = element("code");
			t27 = text("react-router");
			t28 = text(", eg. Furthermore, they ");
			strong2 = element("strong");
			t29 = text("shouldn't be");
			t30 = text(" bundled into the micro frontend as multiple instance of ");
			code2 = element("code");
			t31 = text("react");
			t32 = text(" or ");
			code3 = element("code");
			t33 = text("react-router");
			t34 = text(" may cause some bugs.");
			t35 = space();
			li9 = element("li");
			p6 = element("p");
			strong3 = element("strong");
			t36 = text("A shared global state");
			t37 = space();
			p7 = element("p");
			t38 = text("In this demo, I am using ");
			a10 = element("a");
			t39 = text("redux");
			t40 = text(" for state management.");
			t41 = space();
			p8 = element("p");
			t42 = text("Each micro-frontend is connected to the same global store, so data is easily shared across the application.");
			t43 = space();
			section2 = element("section");
			h21 = element("h2");
			a11 = element("a");
			t44 = text("The Bridge");
			t45 = space();
			p9 = element("p");
			t46 = text("The center piece of this micro frontend architecture is ");
			a12 = element("a");
			t47 = text("the Bridge");
			t48 = text(".");
			t49 = space();
			p10 = element("p");
			t50 = text("It contains 2 types of communication method:");
			t51 = space();
			ul3 = element("ul");
			li10 = element("li");
			t52 = text("message passing");
			t53 = space();
			li11 = element("li");
			t54 = text("shared memory");
			t55 = space();
			p11 = element("p");
			strong4 = element("strong");
			t56 = text("Message passing");
			t57 = text(" is done via a pub sub mechanism called ");
			a13 = element("a");
			t58 = text("the Channel");
			t59 = text(", whereas ");
			strong5 = element("strong");
			t60 = text("shared memory");
			t61 = text(" is done via ");
			a14 = element("a");
			t62 = text("the Registry");
			t63 = text(".");
			t64 = space();
			p12 = element("p");
			t65 = text("I attach the Bridge to the window, so each micro frontend can connect to the bridge.");
			t66 = space();
			section3 = element("section");
			h22 = element("h2");
			a15 = element("a");
			t67 = text("The routing mechanism");
			t68 = space();
			p13 = element("p");
			t69 = text("In the PoC, I used ");
			a16 = element("a");
			t70 = text("react-router");
			t71 = text(" as the routing library. The ");
			a17 = element("a");
			t72 = text("route definition");
			t73 = text(" is dynamic, as it listens ");
			code4 = element("code");
			t74 = text("\"registerRoute\"");
			t75 = text(" event through ");
			em0 = element("em");
			t76 = text("the Bridge");
			t77 = text(", and add it to the route definition.");
			t78 = space();
			p14 = element("p");
			t79 = text("One thing to note is that, I use ");
			code5 = element("code");
			t80 = text("<Switch />");
			t81 = text(", which will render the first ");
			code6 = element("code");
			t82 = text("<Route />");
			t83 = text(" that matches the url.");
			t84 = space();
			p15 = element("p");
			t85 = text("The magic happens in the last route, which will be rendered when none of the routes in the route definition matches.");
			t86 = space();
			p16 = element("p");
			t87 = text("The last route renders the ");
			a18 = element("a");
			t88 = text("Fallback Discovery");
			t89 = text(" component, which will based on the current location and some pre-defined rules, tries to find the micro frontend manifest for the unknown route.");
			t90 = space();
			p17 = element("p");
			t91 = text("If the micro frontend manifest does not exist, it will render a 404 page. However, if the manifest exists, it will fetch the manifest file.");
			t92 = space();
			p18 = element("p");
			t93 = text("The micro frontend manifest file is nothing but a json file that contains the ");
			a19 = element("a");
			t94 = text("entry asset");
			t95 = text(" for the route micro frontend.");
			t96 = space();
			p19 = element("p");
			t97 = text("Once the entry asset is loaded, the new micro frontend itself will register a new route to the route definition via ");
			code7 = element("code");
			t98 = text("\"registerRoute\"");
			t99 = text(" event, which has to be the route that matches the current URL.");
			t100 = space();
			p20 = element("p");
			t101 = text("Whenever there's a new route added, the ");
			code8 = element("code");
			t102 = text("react-router");
			t103 = text("'s ");
			code9 = element("code");
			t104 = text("<Router />");
			t105 = text(" component will re-render and it will match the newly added route, which renders our newly added micro-frontend.");
			t106 = space();
			section4 = element("section");
			h23 = element("h2");
			a20 = element("a");
			t107 = text("The global registry");
			t108 = space();
			p21 = element("p");
			t109 = text("There's 2 main reasons why I am not bundling ");
			code10 = element("code");
			t110 = text("react");
			t111 = text(", ");
			code11 = element("code");
			t112 = text("react-redux");
			t113 = text(", and ");
			code12 = element("code");
			t114 = text("react-router");
			t115 = text(" into each micro frontends:");
			t116 = space();
			ul4 = element("ul");
			li12 = element("li");
			p22 = element("p");
			strong6 = element("strong");
			t117 = text("Bundle size");
			t118 = text(", there's no reason to download duplicate copies of ");
			code13 = element("code");
			t119 = text("react");
			t120 = text(" or ");
			code14 = element("code");
			t121 = text("react-redux");
			t122 = text(".");
			t123 = space();
			li13 = element("li");
			p23 = element("p");
			strong7 = element("strong");
			t124 = text("No multiple instance");
			t125 = text(", both ");
			code15 = element("code");
			t126 = text("react-redux");
			t127 = text(" and ");
			code16 = element("code");
			t128 = text("react-router");
			t129 = text(" uses React Context to pass information down the React component tree. However, this way of data passing disallow multiple instances of the ");
			em1 = element("em");
			t130 = text("Context");
			t131 = text(" object, as each instances has a different memory reference.");
			t132 = space();
			p24 = element("p");
			t133 = text("So, the main SPA runtime bundles ");
			code17 = element("code");
			t134 = text("react");
			t135 = text(", ");
			code18 = element("code");
			t136 = text("react-redux");
			t137 = text(", etc and ");
			a21 = element("a");
			t138 = text("set it into the ");
			code19 = element("code");
			t139 = text("Bridge.Registry");
			t140 = text(".");
			t141 = text(".");
			t142 = space();
			p25 = element("p");
			t143 = text("When each micro-frontend is built, the ");
			em2 = element("em");
			t144 = text("import statement");
			t145 = text(" for these modules ");
			a22 = element("a");
			t146 = text("will be transformed");
			t147 = text(" into the ");
			a23 = element("a");
			t148 = text("some aliases");
			t149 = text(", that reads the module from the ");
			code20 = element("code");
			t150 = text("Bridge.Registry");
			t151 = text(".");
			t152 = space();
			section5 = element("section");
			h24 = element("h2");
			a24 = element("a");
			t153 = text("Shared Global State");
			t154 = space();
			p26 = element("p");
			t155 = text("In the PoC, the micro frontends are ");
			a25 = element("a");
			t156 = text("connected to the shared global store via ");
			code21 = element("code");
			t157 = text("connect()");
			t158 = text(" from ");
			code22 = element("code");
			t159 = text("react-redux");
			t160 = space();
			p27 = element("p");
			t161 = text("Interesting to note is that both ");
			a26 = element("a");
			t162 = text("the food detail");
			t163 = text(" and ");
			a27 = element("a");
			t164 = text("the food list");
			t165 = text(" register the same key for the reducer, but yet both of the works seamlessly.");
			t166 = space();
			p28 = element("p");
			t167 = text("Note that when we transit from Food List page to Food Detail page, we already have the food detail information from the store, therefore there is no need to fetch the food detail anymore.");
			t168 = space();
			section6 = element("section");
			h1 = element("h1");
			a28 = element("a");
			t169 = text("Trying it out locally");
			t170 = space();
			p29 = element("p");
			t171 = text("Run ");
			code23 = element("code");
			t172 = text("yarn start");
			t173 = text(" in the root folder, which will ");
			a29 = element("a");
			t174 = text("start a simple express server");
			t175 = text(". The express server is used to serve static files based on specific rules.");
			t176 = space();
			p30 = element("p");
			t177 = text("To build individual micro frontends, you need to go to each folder and run ");
			code24 = element("code");
			t178 = text("yarn build");
			t179 = text(". Alternatively, you can start the watch mode via ");
			code25 = element("code");
			t180 = text("yarn dev");
			t181 = text(".");
			t182 = space();
			section7 = element("section");
			h25 = element("h2");
			a30 = element("a");
			t183 = text("Developing the micro frontend individually");
			t184 = space();
			p31 = element("p");
			t185 = text("WIP");
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
			t0 = claim_text(a0_nodes, "What is this different?");
			a0_nodes.forEach(detach);
			li0_nodes.forEach(detach);
			li1 = claim_element(ul0_nodes, "LI", {});
			var li1_nodes = children(li1);
			a1 = claim_element(li1_nodes, "A", { href: true });
			var a1_nodes = children(a1);
			t1 = claim_text(a1_nodes, "The Bridge");
			a1_nodes.forEach(detach);
			li1_nodes.forEach(detach);
			li2 = claim_element(ul0_nodes, "LI", {});
			var li2_nodes = children(li2);
			a2 = claim_element(li2_nodes, "A", { href: true });
			var a2_nodes = children(a2);
			t2 = claim_text(a2_nodes, "The routing mechanism");
			a2_nodes.forEach(detach);
			li2_nodes.forEach(detach);
			li3 = claim_element(ul0_nodes, "LI", {});
			var li3_nodes = children(li3);
			a3 = claim_element(li3_nodes, "A", { href: true });
			var a3_nodes = children(a3);
			t3 = claim_text(a3_nodes, "The global registry");
			a3_nodes.forEach(detach);
			li3_nodes.forEach(detach);
			li4 = claim_element(ul0_nodes, "LI", {});
			var li4_nodes = children(li4);
			a4 = claim_element(li4_nodes, "A", { href: true });
			var a4_nodes = children(a4);
			t4 = claim_text(a4_nodes, "Shared Global State");
			a4_nodes.forEach(detach);
			li4_nodes.forEach(detach);
			ul0_nodes.forEach(detach);
			li5 = claim_element(section0_nodes, "LI", {});
			var li5_nodes = children(li5);
			a5 = claim_element(li5_nodes, "A", { href: true });
			var a5_nodes = children(a5);
			t5 = claim_text(a5_nodes, "Trying it out locally");
			a5_nodes.forEach(detach);
			li5_nodes.forEach(detach);
			ul1 = claim_element(section0_nodes, "UL", {});
			var ul1_nodes = children(ul1);
			li6 = claim_element(ul1_nodes, "LI", {});
			var li6_nodes = children(li6);
			a6 = claim_element(li6_nodes, "A", { href: true });
			var a6_nodes = children(a6);
			t6 = claim_text(a6_nodes, "Developing the micro frontend individually");
			a6_nodes.forEach(detach);
			li6_nodes.forEach(detach);
			ul1_nodes.forEach(detach);
			section0_nodes.forEach(detach);
			t7 = claim_space(nodes);
			p0 = claim_element(nodes, "P", {});
			var p0_nodes = children(p0);
			t8 = claim_text(p0_nodes, "Yes, this is ");
			a7 = claim_element(p0_nodes, "A", { href: true, rel: true });
			var a7_nodes = children(a7);
			t9 = claim_text(a7_nodes, "yet another proof of concept for micro frontend architecture");
			a7_nodes.forEach(detach);
			t10 = claim_text(p0_nodes, ".");
			p0_nodes.forEach(detach);
			t11 = claim_space(nodes);
			p1 = claim_element(nodes, "P", {});
			var p1_nodes = children(p1);
			t12 = claim_text(p1_nodes, "Please ");
			a8 = claim_element(p1_nodes, "A", { href: true, rel: true });
			var a8_nodes = children(a8);
			t13 = claim_text(a8_nodes, "check out the code");
			a8_nodes.forEach(detach);
			t14 = claim_text(p1_nodes, " and try to play with it locally.");
			p1_nodes.forEach(detach);
			t15 = claim_space(nodes);
			section1 = claim_element(nodes, "SECTION", {});
			var section1_nodes = children(section1);
			h20 = claim_element(section1_nodes, "H2", {});
			var h20_nodes = children(h20);
			a9 = claim_element(h20_nodes, "A", { href: true, id: true });
			var a9_nodes = children(a9);
			t16 = claim_text(a9_nodes, "What is this different?");
			a9_nodes.forEach(detach);
			h20_nodes.forEach(detach);
			t17 = claim_space(section1_nodes);
			ul2 = claim_element(section1_nodes, "UL", {});
			var ul2_nodes = children(ul2);
			li7 = claim_element(ul2_nodes, "LI", {});
			var li7_nodes = children(li7);
			p2 = claim_element(li7_nodes, "P", {});
			var p2_nodes = children(p2);
			strong0 = claim_element(p2_nodes, "STRONG", {});
			var strong0_nodes = children(strong0);
			t18 = claim_text(strong0_nodes, "No centralised routing definition");
			strong0_nodes.forEach(detach);
			p2_nodes.forEach(detach);
			t19 = claim_space(li7_nodes);
			p3 = claim_element(li7_nodes, "P", {});
			var p3_nodes = children(p3);
			t20 = claim_text(p3_nodes, "Once the main SPA is deployed, new routes can be added to the SPA without redeploying the main SPA.");
			p3_nodes.forEach(detach);
			li7_nodes.forEach(detach);
			t21 = claim_space(ul2_nodes);
			li8 = claim_element(ul2_nodes, "LI", {});
			var li8_nodes = children(li8);
			p4 = claim_element(li8_nodes, "P", {});
			var p4_nodes = children(p4);
			strong1 = claim_element(p4_nodes, "STRONG", {});
			var strong1_nodes = children(strong1);
			t22 = claim_text(strong1_nodes, "A central registry");
			strong1_nodes.forEach(detach);
			p4_nodes.forEach(detach);
			t23 = claim_space(li8_nodes);
			p5 = claim_element(li8_nodes, "P", {});
			var p5_nodes = children(p5);
			t24 = claim_text(p5_nodes, "Individual micro frontend does not need to bundle in common dependencies like ");
			code0 = claim_element(p5_nodes, "CODE", {});
			var code0_nodes = children(code0);
			t25 = claim_text(code0_nodes, "react");
			code0_nodes.forEach(detach);
			t26 = claim_text(p5_nodes, ", ");
			code1 = claim_element(p5_nodes, "CODE", {});
			var code1_nodes = children(code1);
			t27 = claim_text(code1_nodes, "react-router");
			code1_nodes.forEach(detach);
			t28 = claim_text(p5_nodes, ", eg. Furthermore, they ");
			strong2 = claim_element(p5_nodes, "STRONG", {});
			var strong2_nodes = children(strong2);
			t29 = claim_text(strong2_nodes, "shouldn't be");
			strong2_nodes.forEach(detach);
			t30 = claim_text(p5_nodes, " bundled into the micro frontend as multiple instance of ");
			code2 = claim_element(p5_nodes, "CODE", {});
			var code2_nodes = children(code2);
			t31 = claim_text(code2_nodes, "react");
			code2_nodes.forEach(detach);
			t32 = claim_text(p5_nodes, " or ");
			code3 = claim_element(p5_nodes, "CODE", {});
			var code3_nodes = children(code3);
			t33 = claim_text(code3_nodes, "react-router");
			code3_nodes.forEach(detach);
			t34 = claim_text(p5_nodes, " may cause some bugs.");
			p5_nodes.forEach(detach);
			li8_nodes.forEach(detach);
			t35 = claim_space(ul2_nodes);
			li9 = claim_element(ul2_nodes, "LI", {});
			var li9_nodes = children(li9);
			p6 = claim_element(li9_nodes, "P", {});
			var p6_nodes = children(p6);
			strong3 = claim_element(p6_nodes, "STRONG", {});
			var strong3_nodes = children(strong3);
			t36 = claim_text(strong3_nodes, "A shared global state");
			strong3_nodes.forEach(detach);
			p6_nodes.forEach(detach);
			t37 = claim_space(li9_nodes);
			p7 = claim_element(li9_nodes, "P", {});
			var p7_nodes = children(p7);
			t38 = claim_text(p7_nodes, "In this demo, I am using ");
			a10 = claim_element(p7_nodes, "A", { href: true, rel: true });
			var a10_nodes = children(a10);
			t39 = claim_text(a10_nodes, "redux");
			a10_nodes.forEach(detach);
			t40 = claim_text(p7_nodes, " for state management.");
			p7_nodes.forEach(detach);
			t41 = claim_space(li9_nodes);
			p8 = claim_element(li9_nodes, "P", {});
			var p8_nodes = children(p8);
			t42 = claim_text(p8_nodes, "Each micro-frontend is connected to the same global store, so data is easily shared across the application.");
			p8_nodes.forEach(detach);
			li9_nodes.forEach(detach);
			ul2_nodes.forEach(detach);
			section1_nodes.forEach(detach);
			t43 = claim_space(nodes);
			section2 = claim_element(nodes, "SECTION", {});
			var section2_nodes = children(section2);
			h21 = claim_element(section2_nodes, "H2", {});
			var h21_nodes = children(h21);
			a11 = claim_element(h21_nodes, "A", { href: true, id: true });
			var a11_nodes = children(a11);
			t44 = claim_text(a11_nodes, "The Bridge");
			a11_nodes.forEach(detach);
			h21_nodes.forEach(detach);
			t45 = claim_space(section2_nodes);
			p9 = claim_element(section2_nodes, "P", {});
			var p9_nodes = children(p9);
			t46 = claim_text(p9_nodes, "The center piece of this micro frontend architecture is ");
			a12 = claim_element(p9_nodes, "A", { href: true, rel: true });
			var a12_nodes = children(a12);
			t47 = claim_text(a12_nodes, "the Bridge");
			a12_nodes.forEach(detach);
			t48 = claim_text(p9_nodes, ".");
			p9_nodes.forEach(detach);
			t49 = claim_space(section2_nodes);
			p10 = claim_element(section2_nodes, "P", {});
			var p10_nodes = children(p10);
			t50 = claim_text(p10_nodes, "It contains 2 types of communication method:");
			p10_nodes.forEach(detach);
			t51 = claim_space(section2_nodes);
			ul3 = claim_element(section2_nodes, "UL", {});
			var ul3_nodes = children(ul3);
			li10 = claim_element(ul3_nodes, "LI", {});
			var li10_nodes = children(li10);
			t52 = claim_text(li10_nodes, "message passing");
			li10_nodes.forEach(detach);
			t53 = claim_space(ul3_nodes);
			li11 = claim_element(ul3_nodes, "LI", {});
			var li11_nodes = children(li11);
			t54 = claim_text(li11_nodes, "shared memory");
			li11_nodes.forEach(detach);
			ul3_nodes.forEach(detach);
			t55 = claim_space(section2_nodes);
			p11 = claim_element(section2_nodes, "P", {});
			var p11_nodes = children(p11);
			strong4 = claim_element(p11_nodes, "STRONG", {});
			var strong4_nodes = children(strong4);
			t56 = claim_text(strong4_nodes, "Message passing");
			strong4_nodes.forEach(detach);
			t57 = claim_text(p11_nodes, " is done via a pub sub mechanism called ");
			a13 = claim_element(p11_nodes, "A", { href: true, rel: true });
			var a13_nodes = children(a13);
			t58 = claim_text(a13_nodes, "the Channel");
			a13_nodes.forEach(detach);
			t59 = claim_text(p11_nodes, ", whereas ");
			strong5 = claim_element(p11_nodes, "STRONG", {});
			var strong5_nodes = children(strong5);
			t60 = claim_text(strong5_nodes, "shared memory");
			strong5_nodes.forEach(detach);
			t61 = claim_text(p11_nodes, " is done via ");
			a14 = claim_element(p11_nodes, "A", { href: true, rel: true });
			var a14_nodes = children(a14);
			t62 = claim_text(a14_nodes, "the Registry");
			a14_nodes.forEach(detach);
			t63 = claim_text(p11_nodes, ".");
			p11_nodes.forEach(detach);
			t64 = claim_space(section2_nodes);
			p12 = claim_element(section2_nodes, "P", {});
			var p12_nodes = children(p12);
			t65 = claim_text(p12_nodes, "I attach the Bridge to the window, so each micro frontend can connect to the bridge.");
			p12_nodes.forEach(detach);
			section2_nodes.forEach(detach);
			t66 = claim_space(nodes);
			section3 = claim_element(nodes, "SECTION", {});
			var section3_nodes = children(section3);
			h22 = claim_element(section3_nodes, "H2", {});
			var h22_nodes = children(h22);
			a15 = claim_element(h22_nodes, "A", { href: true, id: true });
			var a15_nodes = children(a15);
			t67 = claim_text(a15_nodes, "The routing mechanism");
			a15_nodes.forEach(detach);
			h22_nodes.forEach(detach);
			t68 = claim_space(section3_nodes);
			p13 = claim_element(section3_nodes, "P", {});
			var p13_nodes = children(p13);
			t69 = claim_text(p13_nodes, "In the PoC, I used ");
			a16 = claim_element(p13_nodes, "A", { href: true, rel: true });
			var a16_nodes = children(a16);
			t70 = claim_text(a16_nodes, "react-router");
			a16_nodes.forEach(detach);
			t71 = claim_text(p13_nodes, " as the routing library. The ");
			a17 = claim_element(p13_nodes, "A", { href: true, rel: true });
			var a17_nodes = children(a17);
			t72 = claim_text(a17_nodes, "route definition");
			a17_nodes.forEach(detach);
			t73 = claim_text(p13_nodes, " is dynamic, as it listens ");
			code4 = claim_element(p13_nodes, "CODE", {});
			var code4_nodes = children(code4);
			t74 = claim_text(code4_nodes, "\"registerRoute\"");
			code4_nodes.forEach(detach);
			t75 = claim_text(p13_nodes, " event through ");
			em0 = claim_element(p13_nodes, "EM", {});
			var em0_nodes = children(em0);
			t76 = claim_text(em0_nodes, "the Bridge");
			em0_nodes.forEach(detach);
			t77 = claim_text(p13_nodes, ", and add it to the route definition.");
			p13_nodes.forEach(detach);
			t78 = claim_space(section3_nodes);
			p14 = claim_element(section3_nodes, "P", {});
			var p14_nodes = children(p14);
			t79 = claim_text(p14_nodes, "One thing to note is that, I use ");
			code5 = claim_element(p14_nodes, "CODE", {});
			var code5_nodes = children(code5);
			t80 = claim_text(code5_nodes, "<Switch />");
			code5_nodes.forEach(detach);
			t81 = claim_text(p14_nodes, ", which will render the first ");
			code6 = claim_element(p14_nodes, "CODE", {});
			var code6_nodes = children(code6);
			t82 = claim_text(code6_nodes, "<Route />");
			code6_nodes.forEach(detach);
			t83 = claim_text(p14_nodes, " that matches the url.");
			p14_nodes.forEach(detach);
			t84 = claim_space(section3_nodes);
			p15 = claim_element(section3_nodes, "P", {});
			var p15_nodes = children(p15);
			t85 = claim_text(p15_nodes, "The magic happens in the last route, which will be rendered when none of the routes in the route definition matches.");
			p15_nodes.forEach(detach);
			t86 = claim_space(section3_nodes);
			p16 = claim_element(section3_nodes, "P", {});
			var p16_nodes = children(p16);
			t87 = claim_text(p16_nodes, "The last route renders the ");
			a18 = claim_element(p16_nodes, "A", { href: true, rel: true });
			var a18_nodes = children(a18);
			t88 = claim_text(a18_nodes, "Fallback Discovery");
			a18_nodes.forEach(detach);
			t89 = claim_text(p16_nodes, " component, which will based on the current location and some pre-defined rules, tries to find the micro frontend manifest for the unknown route.");
			p16_nodes.forEach(detach);
			t90 = claim_space(section3_nodes);
			p17 = claim_element(section3_nodes, "P", {});
			var p17_nodes = children(p17);
			t91 = claim_text(p17_nodes, "If the micro frontend manifest does not exist, it will render a 404 page. However, if the manifest exists, it will fetch the manifest file.");
			p17_nodes.forEach(detach);
			t92 = claim_space(section3_nodes);
			p18 = claim_element(section3_nodes, "P", {});
			var p18_nodes = children(p18);
			t93 = claim_text(p18_nodes, "The micro frontend manifest file is nothing but a json file that contains the ");
			a19 = claim_element(p18_nodes, "A", { href: true, rel: true });
			var a19_nodes = children(a19);
			t94 = claim_text(a19_nodes, "entry asset");
			a19_nodes.forEach(detach);
			t95 = claim_text(p18_nodes, " for the route micro frontend.");
			p18_nodes.forEach(detach);
			t96 = claim_space(section3_nodes);
			p19 = claim_element(section3_nodes, "P", {});
			var p19_nodes = children(p19);
			t97 = claim_text(p19_nodes, "Once the entry asset is loaded, the new micro frontend itself will register a new route to the route definition via ");
			code7 = claim_element(p19_nodes, "CODE", {});
			var code7_nodes = children(code7);
			t98 = claim_text(code7_nodes, "\"registerRoute\"");
			code7_nodes.forEach(detach);
			t99 = claim_text(p19_nodes, " event, which has to be the route that matches the current URL.");
			p19_nodes.forEach(detach);
			t100 = claim_space(section3_nodes);
			p20 = claim_element(section3_nodes, "P", {});
			var p20_nodes = children(p20);
			t101 = claim_text(p20_nodes, "Whenever there's a new route added, the ");
			code8 = claim_element(p20_nodes, "CODE", {});
			var code8_nodes = children(code8);
			t102 = claim_text(code8_nodes, "react-router");
			code8_nodes.forEach(detach);
			t103 = claim_text(p20_nodes, "'s ");
			code9 = claim_element(p20_nodes, "CODE", {});
			var code9_nodes = children(code9);
			t104 = claim_text(code9_nodes, "<Router />");
			code9_nodes.forEach(detach);
			t105 = claim_text(p20_nodes, " component will re-render and it will match the newly added route, which renders our newly added micro-frontend.");
			p20_nodes.forEach(detach);
			section3_nodes.forEach(detach);
			t106 = claim_space(nodes);
			section4 = claim_element(nodes, "SECTION", {});
			var section4_nodes = children(section4);
			h23 = claim_element(section4_nodes, "H2", {});
			var h23_nodes = children(h23);
			a20 = claim_element(h23_nodes, "A", { href: true, id: true });
			var a20_nodes = children(a20);
			t107 = claim_text(a20_nodes, "The global registry");
			a20_nodes.forEach(detach);
			h23_nodes.forEach(detach);
			t108 = claim_space(section4_nodes);
			p21 = claim_element(section4_nodes, "P", {});
			var p21_nodes = children(p21);
			t109 = claim_text(p21_nodes, "There's 2 main reasons why I am not bundling ");
			code10 = claim_element(p21_nodes, "CODE", {});
			var code10_nodes = children(code10);
			t110 = claim_text(code10_nodes, "react");
			code10_nodes.forEach(detach);
			t111 = claim_text(p21_nodes, ", ");
			code11 = claim_element(p21_nodes, "CODE", {});
			var code11_nodes = children(code11);
			t112 = claim_text(code11_nodes, "react-redux");
			code11_nodes.forEach(detach);
			t113 = claim_text(p21_nodes, ", and ");
			code12 = claim_element(p21_nodes, "CODE", {});
			var code12_nodes = children(code12);
			t114 = claim_text(code12_nodes, "react-router");
			code12_nodes.forEach(detach);
			t115 = claim_text(p21_nodes, " into each micro frontends:");
			p21_nodes.forEach(detach);
			t116 = claim_space(section4_nodes);
			ul4 = claim_element(section4_nodes, "UL", {});
			var ul4_nodes = children(ul4);
			li12 = claim_element(ul4_nodes, "LI", {});
			var li12_nodes = children(li12);
			p22 = claim_element(li12_nodes, "P", {});
			var p22_nodes = children(p22);
			strong6 = claim_element(p22_nodes, "STRONG", {});
			var strong6_nodes = children(strong6);
			t117 = claim_text(strong6_nodes, "Bundle size");
			strong6_nodes.forEach(detach);
			t118 = claim_text(p22_nodes, ", there's no reason to download duplicate copies of ");
			code13 = claim_element(p22_nodes, "CODE", {});
			var code13_nodes = children(code13);
			t119 = claim_text(code13_nodes, "react");
			code13_nodes.forEach(detach);
			t120 = claim_text(p22_nodes, " or ");
			code14 = claim_element(p22_nodes, "CODE", {});
			var code14_nodes = children(code14);
			t121 = claim_text(code14_nodes, "react-redux");
			code14_nodes.forEach(detach);
			t122 = claim_text(p22_nodes, ".");
			p22_nodes.forEach(detach);
			li12_nodes.forEach(detach);
			t123 = claim_space(ul4_nodes);
			li13 = claim_element(ul4_nodes, "LI", {});
			var li13_nodes = children(li13);
			p23 = claim_element(li13_nodes, "P", {});
			var p23_nodes = children(p23);
			strong7 = claim_element(p23_nodes, "STRONG", {});
			var strong7_nodes = children(strong7);
			t124 = claim_text(strong7_nodes, "No multiple instance");
			strong7_nodes.forEach(detach);
			t125 = claim_text(p23_nodes, ", both ");
			code15 = claim_element(p23_nodes, "CODE", {});
			var code15_nodes = children(code15);
			t126 = claim_text(code15_nodes, "react-redux");
			code15_nodes.forEach(detach);
			t127 = claim_text(p23_nodes, " and ");
			code16 = claim_element(p23_nodes, "CODE", {});
			var code16_nodes = children(code16);
			t128 = claim_text(code16_nodes, "react-router");
			code16_nodes.forEach(detach);
			t129 = claim_text(p23_nodes, " uses React Context to pass information down the React component tree. However, this way of data passing disallow multiple instances of the ");
			em1 = claim_element(p23_nodes, "EM", {});
			var em1_nodes = children(em1);
			t130 = claim_text(em1_nodes, "Context");
			em1_nodes.forEach(detach);
			t131 = claim_text(p23_nodes, " object, as each instances has a different memory reference.");
			p23_nodes.forEach(detach);
			li13_nodes.forEach(detach);
			ul4_nodes.forEach(detach);
			t132 = claim_space(section4_nodes);
			p24 = claim_element(section4_nodes, "P", {});
			var p24_nodes = children(p24);
			t133 = claim_text(p24_nodes, "So, the main SPA runtime bundles ");
			code17 = claim_element(p24_nodes, "CODE", {});
			var code17_nodes = children(code17);
			t134 = claim_text(code17_nodes, "react");
			code17_nodes.forEach(detach);
			t135 = claim_text(p24_nodes, ", ");
			code18 = claim_element(p24_nodes, "CODE", {});
			var code18_nodes = children(code18);
			t136 = claim_text(code18_nodes, "react-redux");
			code18_nodes.forEach(detach);
			t137 = claim_text(p24_nodes, ", etc and ");
			a21 = claim_element(p24_nodes, "A", { href: true, rel: true });
			var a21_nodes = children(a21);
			t138 = claim_text(a21_nodes, "set it into the ");
			code19 = claim_element(a21_nodes, "CODE", {});
			var code19_nodes = children(code19);
			t139 = claim_text(code19_nodes, "Bridge.Registry");
			code19_nodes.forEach(detach);
			t140 = claim_text(a21_nodes, ".");
			a21_nodes.forEach(detach);
			t141 = claim_text(p24_nodes, ".");
			p24_nodes.forEach(detach);
			t142 = claim_space(section4_nodes);
			p25 = claim_element(section4_nodes, "P", {});
			var p25_nodes = children(p25);
			t143 = claim_text(p25_nodes, "When each micro-frontend is built, the ");
			em2 = claim_element(p25_nodes, "EM", {});
			var em2_nodes = children(em2);
			t144 = claim_text(em2_nodes, "import statement");
			em2_nodes.forEach(detach);
			t145 = claim_text(p25_nodes, " for these modules ");
			a22 = claim_element(p25_nodes, "A", { href: true, rel: true });
			var a22_nodes = children(a22);
			t146 = claim_text(a22_nodes, "will be transformed");
			a22_nodes.forEach(detach);
			t147 = claim_text(p25_nodes, " into the ");
			a23 = claim_element(p25_nodes, "A", { href: true, rel: true });
			var a23_nodes = children(a23);
			t148 = claim_text(a23_nodes, "some aliases");
			a23_nodes.forEach(detach);
			t149 = claim_text(p25_nodes, ", that reads the module from the ");
			code20 = claim_element(p25_nodes, "CODE", {});
			var code20_nodes = children(code20);
			t150 = claim_text(code20_nodes, "Bridge.Registry");
			code20_nodes.forEach(detach);
			t151 = claim_text(p25_nodes, ".");
			p25_nodes.forEach(detach);
			section4_nodes.forEach(detach);
			t152 = claim_space(nodes);
			section5 = claim_element(nodes, "SECTION", {});
			var section5_nodes = children(section5);
			h24 = claim_element(section5_nodes, "H2", {});
			var h24_nodes = children(h24);
			a24 = claim_element(h24_nodes, "A", { href: true, id: true });
			var a24_nodes = children(a24);
			t153 = claim_text(a24_nodes, "Shared Global State");
			a24_nodes.forEach(detach);
			h24_nodes.forEach(detach);
			t154 = claim_space(section5_nodes);
			p26 = claim_element(section5_nodes, "P", {});
			var p26_nodes = children(p26);
			t155 = claim_text(p26_nodes, "In the PoC, the micro frontends are ");
			a25 = claim_element(p26_nodes, "A", { href: true, rel: true });
			var a25_nodes = children(a25);
			t156 = claim_text(a25_nodes, "connected to the shared global store via ");
			code21 = claim_element(a25_nodes, "CODE", {});
			var code21_nodes = children(code21);
			t157 = claim_text(code21_nodes, "connect()");
			code21_nodes.forEach(detach);
			t158 = claim_text(a25_nodes, " from ");
			code22 = claim_element(a25_nodes, "CODE", {});
			var code22_nodes = children(code22);
			t159 = claim_text(code22_nodes, "react-redux");
			code22_nodes.forEach(detach);
			a25_nodes.forEach(detach);
			p26_nodes.forEach(detach);
			t160 = claim_space(section5_nodes);
			p27 = claim_element(section5_nodes, "P", {});
			var p27_nodes = children(p27);
			t161 = claim_text(p27_nodes, "Interesting to note is that both ");
			a26 = claim_element(p27_nodes, "A", { href: true, rel: true });
			var a26_nodes = children(a26);
			t162 = claim_text(a26_nodes, "the food detail");
			a26_nodes.forEach(detach);
			t163 = claim_text(p27_nodes, " and ");
			a27 = claim_element(p27_nodes, "A", { href: true, rel: true });
			var a27_nodes = children(a27);
			t164 = claim_text(a27_nodes, "the food list");
			a27_nodes.forEach(detach);
			t165 = claim_text(p27_nodes, " register the same key for the reducer, but yet both of the works seamlessly.");
			p27_nodes.forEach(detach);
			t166 = claim_space(section5_nodes);
			p28 = claim_element(section5_nodes, "P", {});
			var p28_nodes = children(p28);
			t167 = claim_text(p28_nodes, "Note that when we transit from Food List page to Food Detail page, we already have the food detail information from the store, therefore there is no need to fetch the food detail anymore.");
			p28_nodes.forEach(detach);
			section5_nodes.forEach(detach);
			t168 = claim_space(nodes);
			section6 = claim_element(nodes, "SECTION", {});
			var section6_nodes = children(section6);
			h1 = claim_element(section6_nodes, "H1", {});
			var h1_nodes = children(h1);
			a28 = claim_element(h1_nodes, "A", { href: true, id: true });
			var a28_nodes = children(a28);
			t169 = claim_text(a28_nodes, "Trying it out locally");
			a28_nodes.forEach(detach);
			h1_nodes.forEach(detach);
			t170 = claim_space(section6_nodes);
			p29 = claim_element(section6_nodes, "P", {});
			var p29_nodes = children(p29);
			t171 = claim_text(p29_nodes, "Run ");
			code23 = claim_element(p29_nodes, "CODE", {});
			var code23_nodes = children(code23);
			t172 = claim_text(code23_nodes, "yarn start");
			code23_nodes.forEach(detach);
			t173 = claim_text(p29_nodes, " in the root folder, which will ");
			a29 = claim_element(p29_nodes, "A", { href: true, rel: true });
			var a29_nodes = children(a29);
			t174 = claim_text(a29_nodes, "start a simple express server");
			a29_nodes.forEach(detach);
			t175 = claim_text(p29_nodes, ". The express server is used to serve static files based on specific rules.");
			p29_nodes.forEach(detach);
			t176 = claim_space(section6_nodes);
			p30 = claim_element(section6_nodes, "P", {});
			var p30_nodes = children(p30);
			t177 = claim_text(p30_nodes, "To build individual micro frontends, you need to go to each folder and run ");
			code24 = claim_element(p30_nodes, "CODE", {});
			var code24_nodes = children(code24);
			t178 = claim_text(code24_nodes, "yarn build");
			code24_nodes.forEach(detach);
			t179 = claim_text(p30_nodes, ". Alternatively, you can start the watch mode via ");
			code25 = claim_element(p30_nodes, "CODE", {});
			var code25_nodes = children(code25);
			t180 = claim_text(code25_nodes, "yarn dev");
			code25_nodes.forEach(detach);
			t181 = claim_text(p30_nodes, ".");
			p30_nodes.forEach(detach);
			section6_nodes.forEach(detach);
			t182 = claim_space(nodes);
			section7 = claim_element(nodes, "SECTION", {});
			var section7_nodes = children(section7);
			h25 = claim_element(section7_nodes, "H2", {});
			var h25_nodes = children(h25);
			a30 = claim_element(h25_nodes, "A", { href: true, id: true });
			var a30_nodes = children(a30);
			t183 = claim_text(a30_nodes, "Developing the micro frontend individually");
			a30_nodes.forEach(detach);
			h25_nodes.forEach(detach);
			t184 = claim_space(section7_nodes);
			p31 = claim_element(section7_nodes, "P", {});
			var p31_nodes = children(p31);
			t185 = claim_text(p31_nodes, "WIP");
			p31_nodes.forEach(detach);
			section7_nodes.forEach(detach);
			this.h();
		},
		h() {
			attr(a0, "href", "#what-is-this-different");
			attr(a1, "href", "#the-bridge");
			attr(a2, "href", "#the-routing-mechanism");
			attr(a3, "href", "#the-global-registry");
			attr(a4, "href", "#shared-global-state");
			attr(ul0, "class", "sitemap");
			attr(ul0, "id", "sitemap");
			attr(ul0, "role", "navigation");
			attr(ul0, "aria-label", "Table of Contents");
			attr(a5, "href", "#trying-it-out-locally");
			attr(a6, "href", "#developing-the-micro-frontend-individually");
			attr(a7, "href", "https://github.com/tanhauhau/micro-frontend");
			attr(a7, "rel", "nofollow");
			attr(a8, "href", "https://github.com/tanhauhau/micro-frontend");
			attr(a8, "rel", "nofollow");
			attr(a9, "href", "#what-is-this-different");
			attr(a9, "id", "what-is-this-different");
			attr(a10, "href", "https://redux.js.org");
			attr(a10, "rel", "nofollow");
			attr(a11, "href", "#the-bridge");
			attr(a11, "id", "the-bridge");
			attr(a12, "href", "https://github.com/tanhauhau/micro-frontend/blob/master/packages/base/src/Bridge/index.js");
			attr(a12, "rel", "nofollow");
			attr(a13, "href", "https://github.com/tanhauhau/micro-frontend/blob/master/packages/base/src/Bridge/Channel.js");
			attr(a13, "rel", "nofollow");
			attr(a14, "href", "https://github.com/tanhauhau/micro-frontend/blob/master/packages/base/src/Bridge/Registry.js");
			attr(a14, "rel", "nofollow");
			attr(a15, "href", "#the-routing-mechanism");
			attr(a15, "id", "the-routing-mechanism");
			attr(a16, "href", "https://reacttraining.com/react-router/web");
			attr(a16, "rel", "nofollow");
			attr(a17, "href", "https://github.com/tanhauhau/micro-frontend/blob/master/packages/base/src/App/Routes.js#L17");
			attr(a17, "rel", "nofollow");
			attr(a18, "href", "https://github.com/tanhauhau/micro-frontend/blob/master/packages/base/src/App/FallbackDiscovery.js");
			attr(a18, "rel", "nofollow");
			attr(a19, "href", "https://github.com/tanhauhau/micro-frontend/blob/master/packages/base/src/App/FallbackDiscovery.js#L31");
			attr(a19, "rel", "nofollow");
			attr(a20, "href", "#the-global-registry");
			attr(a20, "id", "the-global-registry");
			attr(a21, "href", "https://github.com/tanhauhau/micro-frontend/blob/master/packages/base/src/initRegistry.js#L9");
			attr(a21, "rel", "nofollow");
			attr(a22, "href", "https://github.com/tanhauhau/micro-frontend/blob/master/packages/food/webpack.config.js#L23");
			attr(a22, "rel", "nofollow");
			attr(a23, "href", "https://github.com/tanhauhau/micro-frontend/blob/master/packages/build/BridgeAliasPlugin/aliases/react.js");
			attr(a23, "rel", "nofollow");
			attr(a24, "href", "#shared-global-state");
			attr(a24, "id", "shared-global-state");
			attr(a25, "href", "https://github.com/tanhauhau/micro-frontend/blob/master/packages/food/src/FoodDetail.js#L36");
			attr(a25, "rel", "nofollow");
			attr(a26, "href", "https://github.com/tanhauhau/micro-frontend/blob/master/packages/food/src/FoodDetail.js#L13");
			attr(a26, "rel", "nofollow");
			attr(a27, "href", "https://github.com/tanhauhau/micro-frontend/blob/master/packages/foods/src/FoodList.js");
			attr(a27, "rel", "nofollow");
			attr(a28, "href", "#trying-it-out-locally");
			attr(a28, "id", "trying-it-out-locally");
			attr(a29, "href", "https://github.com/tanhauhau/micro-frontend/blob/master/scripts/start-dev-server.js");
			attr(a29, "rel", "nofollow");
			attr(a30, "href", "#developing-the-micro-frontend-individually");
			attr(a30, "id", "developing-the-micro-frontend-individually");
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
			append(section0, li5);
			append(li5, a5);
			append(a5, t5);
			append(section0, ul1);
			append(ul1, li6);
			append(li6, a6);
			append(a6, t6);
			insert(target, t7, anchor);
			insert(target, p0, anchor);
			append(p0, t8);
			append(p0, a7);
			append(a7, t9);
			append(p0, t10);
			insert(target, t11, anchor);
			insert(target, p1, anchor);
			append(p1, t12);
			append(p1, a8);
			append(a8, t13);
			append(p1, t14);
			insert(target, t15, anchor);
			insert(target, section1, anchor);
			append(section1, h20);
			append(h20, a9);
			append(a9, t16);
			append(section1, t17);
			append(section1, ul2);
			append(ul2, li7);
			append(li7, p2);
			append(p2, strong0);
			append(strong0, t18);
			append(li7, t19);
			append(li7, p3);
			append(p3, t20);
			append(ul2, t21);
			append(ul2, li8);
			append(li8, p4);
			append(p4, strong1);
			append(strong1, t22);
			append(li8, t23);
			append(li8, p5);
			append(p5, t24);
			append(p5, code0);
			append(code0, t25);
			append(p5, t26);
			append(p5, code1);
			append(code1, t27);
			append(p5, t28);
			append(p5, strong2);
			append(strong2, t29);
			append(p5, t30);
			append(p5, code2);
			append(code2, t31);
			append(p5, t32);
			append(p5, code3);
			append(code3, t33);
			append(p5, t34);
			append(ul2, t35);
			append(ul2, li9);
			append(li9, p6);
			append(p6, strong3);
			append(strong3, t36);
			append(li9, t37);
			append(li9, p7);
			append(p7, t38);
			append(p7, a10);
			append(a10, t39);
			append(p7, t40);
			append(li9, t41);
			append(li9, p8);
			append(p8, t42);
			insert(target, t43, anchor);
			insert(target, section2, anchor);
			append(section2, h21);
			append(h21, a11);
			append(a11, t44);
			append(section2, t45);
			append(section2, p9);
			append(p9, t46);
			append(p9, a12);
			append(a12, t47);
			append(p9, t48);
			append(section2, t49);
			append(section2, p10);
			append(p10, t50);
			append(section2, t51);
			append(section2, ul3);
			append(ul3, li10);
			append(li10, t52);
			append(ul3, t53);
			append(ul3, li11);
			append(li11, t54);
			append(section2, t55);
			append(section2, p11);
			append(p11, strong4);
			append(strong4, t56);
			append(p11, t57);
			append(p11, a13);
			append(a13, t58);
			append(p11, t59);
			append(p11, strong5);
			append(strong5, t60);
			append(p11, t61);
			append(p11, a14);
			append(a14, t62);
			append(p11, t63);
			append(section2, t64);
			append(section2, p12);
			append(p12, t65);
			insert(target, t66, anchor);
			insert(target, section3, anchor);
			append(section3, h22);
			append(h22, a15);
			append(a15, t67);
			append(section3, t68);
			append(section3, p13);
			append(p13, t69);
			append(p13, a16);
			append(a16, t70);
			append(p13, t71);
			append(p13, a17);
			append(a17, t72);
			append(p13, t73);
			append(p13, code4);
			append(code4, t74);
			append(p13, t75);
			append(p13, em0);
			append(em0, t76);
			append(p13, t77);
			append(section3, t78);
			append(section3, p14);
			append(p14, t79);
			append(p14, code5);
			append(code5, t80);
			append(p14, t81);
			append(p14, code6);
			append(code6, t82);
			append(p14, t83);
			append(section3, t84);
			append(section3, p15);
			append(p15, t85);
			append(section3, t86);
			append(section3, p16);
			append(p16, t87);
			append(p16, a18);
			append(a18, t88);
			append(p16, t89);
			append(section3, t90);
			append(section3, p17);
			append(p17, t91);
			append(section3, t92);
			append(section3, p18);
			append(p18, t93);
			append(p18, a19);
			append(a19, t94);
			append(p18, t95);
			append(section3, t96);
			append(section3, p19);
			append(p19, t97);
			append(p19, code7);
			append(code7, t98);
			append(p19, t99);
			append(section3, t100);
			append(section3, p20);
			append(p20, t101);
			append(p20, code8);
			append(code8, t102);
			append(p20, t103);
			append(p20, code9);
			append(code9, t104);
			append(p20, t105);
			insert(target, t106, anchor);
			insert(target, section4, anchor);
			append(section4, h23);
			append(h23, a20);
			append(a20, t107);
			append(section4, t108);
			append(section4, p21);
			append(p21, t109);
			append(p21, code10);
			append(code10, t110);
			append(p21, t111);
			append(p21, code11);
			append(code11, t112);
			append(p21, t113);
			append(p21, code12);
			append(code12, t114);
			append(p21, t115);
			append(section4, t116);
			append(section4, ul4);
			append(ul4, li12);
			append(li12, p22);
			append(p22, strong6);
			append(strong6, t117);
			append(p22, t118);
			append(p22, code13);
			append(code13, t119);
			append(p22, t120);
			append(p22, code14);
			append(code14, t121);
			append(p22, t122);
			append(ul4, t123);
			append(ul4, li13);
			append(li13, p23);
			append(p23, strong7);
			append(strong7, t124);
			append(p23, t125);
			append(p23, code15);
			append(code15, t126);
			append(p23, t127);
			append(p23, code16);
			append(code16, t128);
			append(p23, t129);
			append(p23, em1);
			append(em1, t130);
			append(p23, t131);
			append(section4, t132);
			append(section4, p24);
			append(p24, t133);
			append(p24, code17);
			append(code17, t134);
			append(p24, t135);
			append(p24, code18);
			append(code18, t136);
			append(p24, t137);
			append(p24, a21);
			append(a21, t138);
			append(a21, code19);
			append(code19, t139);
			append(a21, t140);
			append(p24, t141);
			append(section4, t142);
			append(section4, p25);
			append(p25, t143);
			append(p25, em2);
			append(em2, t144);
			append(p25, t145);
			append(p25, a22);
			append(a22, t146);
			append(p25, t147);
			append(p25, a23);
			append(a23, t148);
			append(p25, t149);
			append(p25, code20);
			append(code20, t150);
			append(p25, t151);
			insert(target, t152, anchor);
			insert(target, section5, anchor);
			append(section5, h24);
			append(h24, a24);
			append(a24, t153);
			append(section5, t154);
			append(section5, p26);
			append(p26, t155);
			append(p26, a25);
			append(a25, t156);
			append(a25, code21);
			append(code21, t157);
			append(a25, t158);
			append(a25, code22);
			append(code22, t159);
			append(section5, t160);
			append(section5, p27);
			append(p27, t161);
			append(p27, a26);
			append(a26, t162);
			append(p27, t163);
			append(p27, a27);
			append(a27, t164);
			append(p27, t165);
			append(section5, t166);
			append(section5, p28);
			append(p28, t167);
			insert(target, t168, anchor);
			insert(target, section6, anchor);
			append(section6, h1);
			append(h1, a28);
			append(a28, t169);
			append(section6, t170);
			append(section6, p29);
			append(p29, t171);
			append(p29, code23);
			append(code23, t172);
			append(p29, t173);
			append(p29, a29);
			append(a29, t174);
			append(p29, t175);
			append(section6, t176);
			append(section6, p30);
			append(p30, t177);
			append(p30, code24);
			append(code24, t178);
			append(p30, t179);
			append(p30, code25);
			append(code25, t180);
			append(p30, t181);
			insert(target, t182, anchor);
			insert(target, section7, anchor);
			append(section7, h25);
			append(h25, a30);
			append(a30, t183);
			append(section7, t184);
			append(section7, p31);
			append(p31, t185);
		},
		d(detaching) {
			if (detaching) detach(section0);
			if (detaching) detach(t7);
			if (detaching) detach(p0);
			if (detaching) detach(t11);
			if (detaching) detach(p1);
			if (detaching) detach(t15);
			if (detaching) detach(section1);
			if (detaching) detach(t43);
			if (detaching) detach(section2);
			if (detaching) detach(t66);
			if (detaching) detach(section3);
			if (detaching) detach(t106);
			if (detaching) detach(section4);
			if (detaching) detach(t152);
			if (detaching) detach(section5);
			if (detaching) detach(t168);
			if (detaching) detach(section6);
			if (detaching) detach(t182);
			if (detaching) detach(section7);
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
	"title": "Yet Another Micro Frontend Proof of Concept",
	"date": "2019-07-15T08:00:00Z",
	"description": "A decentralised router definition",
	"wip": true,
	"slug": "micro-frontends-poc",
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
