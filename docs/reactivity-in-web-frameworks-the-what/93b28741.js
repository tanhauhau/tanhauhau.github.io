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

var baseCss = "https://lihautan.com/reactivity-in-web-frameworks-the-what/assets/_blog-299aa480.css";

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
					"@id": "https%3A%2F%2Flihautan.com%2Freactivity-in-web-frameworks-the-what",
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
			attr(meta11, "content", "https%3A%2F%2Flihautan.com%2Freactivity-in-web-frameworks-the-what");
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
							"@id": "https%3A%2F%2Flihautan.com%2Freactivity-in-web-frameworks-the-what",
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

/* content/blog/reactivity-in-web-frameworks-the-what/@@page-markup.svelte generated by Svelte v3.24.0 */

function create_default_slot(ctx) {
	let section0;
	let ul2;
	let li0;
	let a0;
	let t0;
	let ul1;
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
	let li5;
	let a5;
	let t5;
	let t6;
	let section1;
	let h2;
	let a6;
	let t7;
	let t8;
	let p0;
	let t9;
	let t10;
	let p1;
	let t11;
	let t12;
	let p2;
	let t13;
	let t14;
	let ul3;
	let li6;
	let t15;
	let t16;
	let li7;
	let t17;
	let t18;
	let p3;
	let t19;
	let a7;
	let t20;
	let t21;
	let t22;
	let pre0;

	let raw0_value = `
<code class="language-js"><span class="token keyword">function</span> <span class="token function"><span class="token maybe-class-name">App</span></span><span class="token punctuation">(</span><span class="token punctuation">)</span> <span class="token punctuation">&#123;</span>
  <span class="token keyword">const</span> <span class="token punctuation">[</span>counter<span class="token punctuation">,</span> setCounter<span class="token punctuation">]</span> <span class="token operator">=</span> <span class="token maybe-class-name">React</span><span class="token punctuation">.</span><span class="token method function property-access">useState</span><span class="token punctuation">(</span><span class="token number">0</span><span class="token punctuation">)</span><span class="token punctuation">;</span>
  <span class="token keyword">return</span> <span class="token punctuation">(</span>
    <span class="token operator">&lt;</span>div<span class="token operator">></span>
      <span class="token operator">&lt;</span>button onClick<span class="token operator">=</span><span class="token punctuation">&#123;</span><span class="token punctuation">(</span><span class="token punctuation">)</span> <span class="token arrow operator">=></span> <span class="token function">setCounter</span><span class="token punctuation">(</span><span class="token parameter">counter</span> <span class="token arrow operator">=></span> counter <span class="token operator">-</span> <span class="token number">1</span><span class="token punctuation">)</span><span class="token punctuation">&#125;</span><span class="token operator">></span><span class="token operator">-</span><span class="token operator">&lt;</span><span class="token operator">/</span>button<span class="token operator">></span>
      <span class="token operator">&lt;</span>span<span class="token operator">></span><span class="token punctuation">&#123;</span>counter<span class="token punctuation">&#125;</span><span class="token operator">&lt;</span><span class="token operator">/</span>span<span class="token operator">></span>
      <span class="token operator">&lt;</span>button onClick<span class="token operator">=</span><span class="token punctuation">&#123;</span><span class="token punctuation">(</span><span class="token punctuation">)</span> <span class="token arrow operator">=></span> <span class="token function">setCounter</span><span class="token punctuation">(</span><span class="token parameter">counter</span> <span class="token arrow operator">=></span> counter <span class="token operator">+</span> <span class="token number">1</span><span class="token punctuation">)</span><span class="token punctuation">&#125;</span><span class="token operator">></span><span class="token operator">+</span><span class="token operator">&lt;</span><span class="token operator">/</span>button<span class="token operator">></span>
    <span class="token operator">&lt;</span><span class="token operator">/</span>div<span class="token operator">></span>
  <span class="token punctuation">)</span><span class="token punctuation">;</span>
<span class="token punctuation">&#125;</span></code>` + "";

	let t23;
	let p4;
	let t24;
	let t25;
	let p5;
	let strong0;
	let t26;
	let a8;
	let t27;
	let t28;
	let p6;
	let t29;
	let a9;
	let t30;
	let t31;
	let t32;
	let p7;
	let strong1;
	let t33;
	let a10;
	let t34;
	let code0;
	let t35;
	let t36;
	let p8;
	let t37;
	let code1;
	let t38;
	let t39;
	let p9;
	let strong2;
	let t40;
	let a11;
	let t41;
	let t42;
	let p10;
	let t43;
	let code2;
	let t44;
	let t45;
	let t46;
	let p11;
	let t47;
	let t48;
	let p12;
	let t49;
	let t50;
	let p13;
	let t51;
	let strong3;
	let t52;
	let t53;
	let t54;
	let p14;
	let t55;
	let t56;
	let pre1;

	let raw1_value = `
<code class="language-js"><span class="token keyword">function</span> <span class="token function">update</span><span class="token punctuation">(</span><span class="token parameter">root<span class="token punctuation">,</span> applicationState</span><span class="token punctuation">)</span> <span class="token punctuation">&#123;</span>
  <span class="token comment">// destroy everything</span>
  root<span class="token punctuation">.</span><span class="token property-access">innerHTML</span> <span class="token operator">=</span> <span class="token string">''</span><span class="token punctuation">;</span>
  <span class="token comment">// ...and rebuild</span>
  <span class="token keyword">const</span> newElement <span class="token operator">=</span> <span class="token function">buildUi</span><span class="token punctuation">(</span>applicationState<span class="token punctuation">)</span><span class="token punctuation">;</span>
  root<span class="token punctuation">.</span><span class="token method function property-access">appendChild</span><span class="token punctuation">(</span>newElement<span class="token punctuation">)</span><span class="token punctuation">;</span>
<span class="token punctuation">&#125;</span>

<span class="token comment">// building the counter app</span>
<span class="token keyword">function</span> <span class="token function">buildUi</span><span class="token punctuation">(</span><span class="token parameter"><span class="token punctuation">&#123;</span> counter <span class="token punctuation">&#125;</span></span><span class="token punctuation">)</span> <span class="token punctuation">&#123;</span>
  <span class="token keyword">const</span> div <span class="token operator">=</span> <span class="token dom variable">document</span><span class="token punctuation">.</span><span class="token method function property-access">createElement</span><span class="token punctuation">(</span><span class="token string">'div'</span><span class="token punctuation">)</span><span class="token punctuation">;</span>

  <span class="token keyword">const</span> button1 <span class="token operator">=</span> <span class="token dom variable">document</span><span class="token punctuation">.</span><span class="token method function property-access">createElement</span><span class="token punctuation">(</span><span class="token string">'button'</span><span class="token punctuation">)</span><span class="token punctuation">;</span>
  button1<span class="token punctuation">.</span><span class="token property-access">textContent</span> <span class="token operator">=</span> <span class="token string">'-'</span><span class="token punctuation">;</span>
  div<span class="token punctuation">.</span><span class="token method function property-access">append</span><span class="token punctuation">(</span>button1<span class="token punctuation">)</span><span class="token punctuation">;</span>

  <span class="token keyword">const</span> span <span class="token operator">=</span> <span class="token dom variable">document</span><span class="token punctuation">.</span><span class="token method function property-access">createElement</span><span class="token punctuation">(</span><span class="token string">'span'</span><span class="token punctuation">)</span><span class="token punctuation">;</span>
  span<span class="token punctuation">.</span><span class="token property-access">textContent</span> <span class="token operator">=</span> counter<span class="token punctuation">;</span>
  div<span class="token punctuation">.</span><span class="token method function property-access">append</span><span class="token punctuation">(</span>span<span class="token punctuation">)</span><span class="token punctuation">;</span>

  <span class="token keyword">const</span> button2 <span class="token operator">=</span> <span class="token dom variable">document</span><span class="token punctuation">.</span><span class="token method function property-access">createElement</span><span class="token punctuation">(</span><span class="token string">'button'</span><span class="token punctuation">)</span><span class="token punctuation">;</span>
  button2<span class="token punctuation">.</span><span class="token property-access">textContent</span> <span class="token operator">=</span> <span class="token string">'+'</span><span class="token punctuation">;</span>
  div<span class="token punctuation">.</span><span class="token method function property-access">append</span><span class="token punctuation">(</span>button2<span class="token punctuation">)</span><span class="token punctuation">;</span>

  <span class="token keyword">return</span> div<span class="token punctuation">;</span>
<span class="token punctuation">&#125;</span></code>` + "";

	let t57;
	let p15;
	let t58;
	let t59;
	let section2;
	let h40;
	let a12;
	let t60;
	let t61;
	let p16;
	let t62;
	let t63;
	let ul4;
	let li8;
	let t64;
	let t65;
	let li9;
	let t66;
	let t67;
	let li10;
	let t68;
	let t69;
	let li11;
	let t70;
	let t71;
	let p17;
	let t72;
	let t73;
	let section3;
	let h41;
	let a13;
	let t74;
	let t75;
	let p18;
	let t76;
	let t77;
	let p19;
	let t78;
	let t79;
	let p20;
	let t80;
	let t81;
	let p21;
	let t82;
	let strong4;
	let t83;
	let t84;
	let strong5;
	let t85;
	let t86;
	let t87;
	let p22;
	let t88;
	let t89;
	let p23;
	let t90;
	let strong6;
	let t91;
	let t92;
	let a14;
	let t93;
	let t94;
	let strong7;
	let t95;
	let t96;
	let strong8;
	let t97;
	let t98;
	let t99;
	let p24;
	let t100;
	let t101;
	let section4;
	let h30;
	let a15;
	let t102;
	let t103;
	let p25;
	let t104;
	let strong9;
	let t105;
	let t106;
	let t107;
	let p26;
	let t108;
	let t109;
	let ul5;
	let li12;
	let t110;
	let t111;
	let li13;
	let t112;
	let t113;
	let p27;
	let t114;
	let t115;
	let pre2;

	let raw2_value = `
<code class="language-js"><span class="token keyword">let</span> previousUi <span class="token operator">=</span> <span class="token keyword null nil">null</span><span class="token punctuation">;</span>
<span class="token keyword">function</span> <span class="token function">update</span><span class="token punctuation">(</span><span class="token parameter">root<span class="token punctuation">,</span> applicationState</span><span class="token punctuation">)</span> <span class="token punctuation">&#123;</span>
  <span class="token keyword">const</span> newUi <span class="token operator">=</span> <span class="token function">buildIntermediateUi</span><span class="token punctuation">(</span>applicationState<span class="token punctuation">)</span><span class="token punctuation">;</span>
  <span class="token keyword">const</span> operationsNeeded <span class="token operator">=</span> <span class="token function">diff</span><span class="token punctuation">(</span>newUi<span class="token punctuation">,</span> previousUi<span class="token punctuation">)</span><span class="token punctuation">;</span>
  operationsNeeded<span class="token punctuation">.</span><span class="token method function property-access">forEach</span><span class="token punctuation">(</span>runOperation<span class="token punctuation">)</span><span class="token punctuation">;</span>
  <span class="token comment">// keep for comparison in the next update</span>
  previousUi <span class="token operator">=</span> newUi<span class="token punctuation">;</span>
<span class="token punctuation">&#125;</span>

<span class="token comment">// building the counter app</span>
<span class="token keyword">function</span> <span class="token function">buildIntermediateUi</span><span class="token punctuation">(</span><span class="token parameter"><span class="token punctuation">&#123;</span> counter <span class="token punctuation">&#125;</span></span><span class="token punctuation">)</span> <span class="token punctuation">&#123;</span>
  <span class="token keyword">return</span> <span class="token punctuation">&#123;</span>
    element<span class="token punctuation">:</span> <span class="token string">'div'</span><span class="token punctuation">,</span>
    children<span class="token punctuation">:</span> <span class="token punctuation">[</span>
      <span class="token punctuation">&#123;</span>
        element<span class="token punctuation">:</span> <span class="token string">'button'</span><span class="token punctuation">,</span>
        text<span class="token punctuation">:</span> <span class="token string">'-'</span><span class="token punctuation">,</span>
      <span class="token punctuation">&#125;</span><span class="token punctuation">,</span>
      <span class="token punctuation">&#123;</span>
        element<span class="token punctuation">:</span> <span class="token string">'span'</span><span class="token punctuation">,</span>
        text<span class="token punctuation">:</span> counter<span class="token punctuation">,</span>
      <span class="token punctuation">&#125;</span><span class="token punctuation">,</span>
      <span class="token punctuation">&#123;</span>
        element<span class="token punctuation">:</span> <span class="token string">'button'</span><span class="token punctuation">,</span>
        text<span class="token punctuation">:</span> <span class="token string">'+'</span><span class="token punctuation">,</span>
      <span class="token punctuation">&#125;</span><span class="token punctuation">,</span>
    <span class="token punctuation">]</span><span class="token punctuation">,</span>
  <span class="token punctuation">&#125;</span><span class="token punctuation">;</span>
<span class="token punctuation">&#125;</span></code>` + "";

	let t116;
	let p28;
	let t117;
	let strong10;
	let t118;
	let t119;
	let strong11;
	let t120;
	let t121;
	let t122;
	let p29;
	let t123;
	let t124;
	let section5;
	let h31;
	let a16;
	let t125;
	let t126;
	let p30;
	let t127;
	let t128;
	let p31;
	let t129;
	let t130;
	let pre3;

	let raw3_value = `
<code class="language-js"><span class="token keyword">function</span> <span class="token function">update</span><span class="token punctuation">(</span><span class="token parameter">root<span class="token punctuation">,</span> changes</span><span class="token punctuation">)</span> <span class="token punctuation">&#123;</span>
  <span class="token function">applyChanges</span><span class="token punctuation">(</span>root<span class="token punctuation">,</span> changes<span class="token punctuation">)</span><span class="token punctuation">;</span>
<span class="token punctuation">&#125;</span>

<span class="token comment">// an example of apply changes for the counter app</span>
<span class="token keyword">function</span> <span class="token function">applyChanges</span><span class="token punctuation">(</span><span class="token parameter">root<span class="token punctuation">,</span> changes</span><span class="token punctuation">)</span> <span class="token punctuation">&#123;</span>
  <span class="token comment">// update span's text if &#96;counter&#96; changed</span>
  <span class="token keyword">if</span> <span class="token punctuation">(</span><span class="token string">'counter'</span> <span class="token keyword">in</span> changes<span class="token punctuation">)</span> <span class="token punctuation">&#123;</span>
    root<span class="token punctuation">.</span><span class="token method function property-access">querySelector</span><span class="token punctuation">(</span><span class="token string">'span'</span><span class="token punctuation">)</span><span class="token punctuation">.</span><span class="token property-access">textContent</span> <span class="token operator">=</span> changes<span class="token punctuation">.</span><span class="token property-access">counter</span><span class="token punctuation">;</span>
  <span class="token punctuation">&#125;</span>
<span class="token punctuation">&#125;</span></code>` + "";

	let t131;
	let section6;
	let h32;
	let a17;
	let t132;
	let t133;
	let p32;
	let t134;
	let t135;
	let p33;
	let t136;
	let t137;
	let p34;
	let t138;
	let t139;
	let p35;
	let t140;

	return {
		c() {
			section0 = element("section");
			ul2 = element("ul");
			li0 = element("li");
			a0 = element("a");
			t0 = text("What is Reactivity?");
			ul1 = element("ul");
			ul0 = element("ul");
			li1 = element("li");
			a1 = element("a");
			t1 = text("- Losing element state");
			li2 = element("li");
			a2 = element("a");
			t2 = text("- Cost of creating DOM elements");
			li3 = element("li");
			a3 = element("a");
			t3 = text("Framework knows nothing about what has changed");
			li4 = element("li");
			a4 = element("a");
			t4 = text("Framework knows exactly what has changed and what needs to be updated");
			li5 = element("li");
			a5 = element("a");
			t5 = text("The Component Model");
			t6 = space();
			section1 = element("section");
			h2 = element("h2");
			a6 = element("a");
			t7 = text("What is Reactivity?");
			t8 = space();
			p0 = element("p");
			t9 = text("Reactivity is the ability of a web framework to update your view whenever the application state has changed.");
			t10 = space();
			p1 = element("p");
			t11 = text("It is the core of any modern web framework.");
			t12 = space();
			p2 = element("p");
			t13 = text("To achieve reactivity, the framework has to answer 2 questions");
			t14 = space();
			ul3 = element("ul");
			li6 = element("li");
			t15 = text("When does the application state change?");
			t16 = space();
			li7 = element("li");
			t17 = text("What has the application state changed?");
			t18 = space();
			p3 = element("p");
			t19 = text("In ");
			a7 = element("a");
			t20 = text("Part 1");
			t21 = text(", I started with a counter app example.");
			t22 = space();
			pre0 = element("pre");
			t23 = space();
			p4 = element("p");
			t24 = text("and I talked about different strategies framework used to know when does the application state change.");
			t25 = space();
			p5 = element("p");
			strong0 = element("strong");
			t26 = text("- ");
			a8 = element("a");
			t27 = text("Mutation Tracking");
			t28 = space();
			p6 = element("p");
			t29 = text("Using ");
			a9 = element("a");
			t30 = text("ES6 Proxy");
			t31 = text(", or before that, Object getters and setters, to determine when the application state has changed.");
			t32 = space();
			p7 = element("p");
			strong1 = element("strong");
			t33 = text("- ");
			a10 = element("a");
			t34 = text("Just call ");
			code0 = element("code");
			t35 = text("scheduleUpdate");
			t36 = space();
			p8 = element("p");
			t37 = text("Provide APIs that indirectly calls ");
			code1 = element("code");
			t38 = text("scheduleUpdate");
			t39 = space();
			p9 = element("p");
			strong2 = element("strong");
			t40 = text("- ");
			a11 = element("a");
			t41 = text("Static Analysis");
			t42 = space();
			p10 = element("p");
			t43 = text("Analyse the code statically, and insert ");
			code2 = element("code");
			t44 = text("scheduleUpdate");
			t45 = text(" into the code right after assignments.");
			t46 = space();
			p11 = element("p");
			t47 = text("After knowing that the application state has change, the framework will then proceed to update the view.");
			t48 = space();
			p12 = element("p");
			t49 = text("But, how?");
			t50 = space();
			p13 = element("p");
			t51 = text("The framework needs to figure out ");
			strong3 = element("strong");
			t52 = text("what needs to be updated");
			t53 = text(", so that the framework will only update the part of the view that needs to be changed.");
			t54 = space();
			p14 = element("p");
			t55 = text("Without knowing what needs to be updated, the quickest and dirtiest way of updating the view would be to destroy and recreate everything:");
			t56 = space();
			pre1 = element("pre");
			t57 = space();
			p15 = element("p");
			t58 = text("The drawbacks of this method are");
			t59 = space();
			section2 = element("section");
			h40 = element("h4");
			a12 = element("a");
			t60 = text("- Losing element state");
			t61 = space();
			p16 = element("p");
			t62 = text("We will lose the state of the element, such as:");
			t63 = space();
			ul4 = element("ul");
			li8 = element("li");
			t64 = text("input focus");
			t65 = space();
			li9 = element("li");
			t66 = text("text highlight");
			t67 = space();
			li10 = element("li");
			t68 = text("active state");
			t69 = space();
			li11 = element("li");
			t70 = text("...");
			t71 = space();
			p17 = element("p");
			t72 = text("if we didnt preserve them before destroying them.");
			t73 = space();
			section3 = element("section");
			h41 = element("h4");
			a13 = element("a");
			t74 = text("- Cost of creating DOM elements");
			t75 = space();
			p18 = element("p");
			t76 = text("It is much costly to recreate all the DOM elements needed instead of reuse and update the existing DOM elements.");
			t77 = space();
			p19 = element("p");
			t78 = text("@@@@@@@@@@@@");
			t79 = space();
			p20 = element("p");
			t80 = text("Now let's");
			t81 = space();
			p21 = element("p");
			t82 = text("framework needs to know ");
			strong4 = element("strong");
			t83 = text("what has changed");
			t84 = text(" and then based on that, figure out ");
			strong5 = element("strong");
			t85 = text("what needs to be updated");
			t86 = text(".");
			t87 = space();
			p22 = element("p");
			t88 = text("@@@@@@@@@@@@");
			t89 = space();
			p23 = element("p");
			t90 = text("Different ");
			strong6 = element("strong");
			t91 = text("\"templating\" strategies");
			t92 = text(" and ");
			a14 = element("a");
			t93 = text("WHEN strategies");
			t94 = text(" give the framework varying amount of information in terms of ");
			strong7 = element("strong");
			t95 = text("what has changed");
			t96 = text(" and ");
			strong8 = element("strong");
			t97 = text("what needs to be updated");
			t98 = text(".");
			t99 = space();
			p24 = element("p");
			t100 = text("We can put that variance in the amount of information into a spectrum.");
			t101 = space();
			section4 = element("section");
			h30 = element("h3");
			a15 = element("a");
			t102 = text("Framework knows nothing about what has changed");
			t103 = space();
			p25 = element("p");
			t104 = text("At one end, our framework ");
			strong9 = element("strong");
			t105 = text("knows nothing about what has changed");
			t106 = text(". To update the application without knowing what has change, the quickest and dirtiest mechanism would be to recreate everything.");
			t107 = space();
			p26 = element("p");
			t108 = text("However that would come with costs:");
			t109 = space();
			ul5 = element("ul");
			li12 = element("li");
			t110 = text("losing focus");
			t111 = space();
			li13 = element("li");
			t112 = text("cost of creating new elements, DOM manipulations");
			t113 = space();
			p27 = element("p");
			t114 = text("So, a more well-thought mechanism is to create a intermediate representation of the UI. Instead of tearing down and recreate every DOM element everytime when there's an update, we compare the latest intermediate representation with the previous one, figure out the difference between the two representations and generate a list of operations needed to patch the DOM.");
			t115 = space();
			pre2 = element("pre");
			t116 = space();
			p28 = element("p");
			t117 = text("By finding the differences between the new and old representations, framework figures out ");
			strong10 = element("strong");
			t118 = text("what needs to be updated");
			t119 = text(" without knowing ");
			strong11 = element("strong");
			t120 = text("what has changed");
			t121 = text(".");
			t122 = space();
			p29 = element("p");
			t123 = text("The main advantage of this mechanism is that, the intermediate representation is way cheaper to create and manipulate.");
			t124 = space();
			section5 = element("section");
			h31 = element("h3");
			a16 = element("a");
			t125 = text("Framework knows exactly what has changed and what needs to be updated");
			t126 = space();
			p30 = element("p");
			t127 = text("On the other extreme end of the spectrum, framework knows exactly what has changed and what needs to be updated.");
			t128 = space();
			p31 = element("p");
			t129 = text("This is the most efficient way of updating the UI, where everything needed by the framework has already been figured out. So the only thing the framework needs to do is to apply those updates to the DOM.");
			t130 = space();
			pre3 = element("pre");
			t131 = space();
			section6 = element("section");
			h32 = element("h3");
			a17 = element("a");
			t132 = text("The Component Model");
			t133 = space();
			p32 = element("p");
			t134 = text("TODO:");
			t135 = space();
			p33 = element("p");
			t136 = text("Components With component model, we can break the application up into is composed with components.");
			t137 = space();
			p34 = element("p");
			t138 = text("So, if the framework is able to figure out what needs to be updated early on, then , the more efficient it is (without having to figure out what needs to be updated later on)\ndecides whether the framework");
			t139 = space();
			p35 = element("p");
			t140 = text("Different \"templating\" strategies and [WHEN strategies");
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
			t0 = claim_text(a0_nodes, "What is Reactivity?");
			a0_nodes.forEach(detach);
			li0_nodes.forEach(detach);
			ul1 = claim_element(ul2_nodes, "UL", {});
			var ul1_nodes = children(ul1);
			ul0 = claim_element(ul1_nodes, "UL", {});
			var ul0_nodes = children(ul0);
			li1 = claim_element(ul0_nodes, "LI", {});
			var li1_nodes = children(li1);
			a1 = claim_element(li1_nodes, "A", { href: true });
			var a1_nodes = children(a1);
			t1 = claim_text(a1_nodes, "- Losing element state");
			a1_nodes.forEach(detach);
			li1_nodes.forEach(detach);
			li2 = claim_element(ul0_nodes, "LI", {});
			var li2_nodes = children(li2);
			a2 = claim_element(li2_nodes, "A", { href: true });
			var a2_nodes = children(a2);
			t2 = claim_text(a2_nodes, "- Cost of creating DOM elements");
			a2_nodes.forEach(detach);
			li2_nodes.forEach(detach);
			ul0_nodes.forEach(detach);
			li3 = claim_element(ul1_nodes, "LI", {});
			var li3_nodes = children(li3);
			a3 = claim_element(li3_nodes, "A", { href: true });
			var a3_nodes = children(a3);
			t3 = claim_text(a3_nodes, "Framework knows nothing about what has changed");
			a3_nodes.forEach(detach);
			li3_nodes.forEach(detach);
			li4 = claim_element(ul1_nodes, "LI", {});
			var li4_nodes = children(li4);
			a4 = claim_element(li4_nodes, "A", { href: true });
			var a4_nodes = children(a4);
			t4 = claim_text(a4_nodes, "Framework knows exactly what has changed and what needs to be updated");
			a4_nodes.forEach(detach);
			li4_nodes.forEach(detach);
			li5 = claim_element(ul1_nodes, "LI", {});
			var li5_nodes = children(li5);
			a5 = claim_element(li5_nodes, "A", { href: true });
			var a5_nodes = children(a5);
			t5 = claim_text(a5_nodes, "The Component Model");
			a5_nodes.forEach(detach);
			li5_nodes.forEach(detach);
			ul1_nodes.forEach(detach);
			ul2_nodes.forEach(detach);
			section0_nodes.forEach(detach);
			t6 = claim_space(nodes);
			section1 = claim_element(nodes, "SECTION", {});
			var section1_nodes = children(section1);
			h2 = claim_element(section1_nodes, "H2", {});
			var h2_nodes = children(h2);
			a6 = claim_element(h2_nodes, "A", { href: true, id: true });
			var a6_nodes = children(a6);
			t7 = claim_text(a6_nodes, "What is Reactivity?");
			a6_nodes.forEach(detach);
			h2_nodes.forEach(detach);
			t8 = claim_space(section1_nodes);
			p0 = claim_element(section1_nodes, "P", {});
			var p0_nodes = children(p0);
			t9 = claim_text(p0_nodes, "Reactivity is the ability of a web framework to update your view whenever the application state has changed.");
			p0_nodes.forEach(detach);
			t10 = claim_space(section1_nodes);
			p1 = claim_element(section1_nodes, "P", {});
			var p1_nodes = children(p1);
			t11 = claim_text(p1_nodes, "It is the core of any modern web framework.");
			p1_nodes.forEach(detach);
			t12 = claim_space(section1_nodes);
			p2 = claim_element(section1_nodes, "P", {});
			var p2_nodes = children(p2);
			t13 = claim_text(p2_nodes, "To achieve reactivity, the framework has to answer 2 questions");
			p2_nodes.forEach(detach);
			t14 = claim_space(section1_nodes);
			ul3 = claim_element(section1_nodes, "UL", {});
			var ul3_nodes = children(ul3);
			li6 = claim_element(ul3_nodes, "LI", {});
			var li6_nodes = children(li6);
			t15 = claim_text(li6_nodes, "When does the application state change?");
			li6_nodes.forEach(detach);
			t16 = claim_space(ul3_nodes);
			li7 = claim_element(ul3_nodes, "LI", {});
			var li7_nodes = children(li7);
			t17 = claim_text(li7_nodes, "What has the application state changed?");
			li7_nodes.forEach(detach);
			ul3_nodes.forEach(detach);
			t18 = claim_space(section1_nodes);
			p3 = claim_element(section1_nodes, "P", {});
			var p3_nodes = children(p3);
			t19 = claim_text(p3_nodes, "In ");
			a7 = claim_element(p3_nodes, "A", { href: true });
			var a7_nodes = children(a7);
			t20 = claim_text(a7_nodes, "Part 1");
			a7_nodes.forEach(detach);
			t21 = claim_text(p3_nodes, ", I started with a counter app example.");
			p3_nodes.forEach(detach);
			t22 = claim_space(section1_nodes);
			pre0 = claim_element(section1_nodes, "PRE", { class: true });
			var pre0_nodes = children(pre0);
			pre0_nodes.forEach(detach);
			t23 = claim_space(section1_nodes);
			p4 = claim_element(section1_nodes, "P", {});
			var p4_nodes = children(p4);
			t24 = claim_text(p4_nodes, "and I talked about different strategies framework used to know when does the application state change.");
			p4_nodes.forEach(detach);
			t25 = claim_space(section1_nodes);
			p5 = claim_element(section1_nodes, "P", {});
			var p5_nodes = children(p5);
			strong0 = claim_element(p5_nodes, "STRONG", {});
			var strong0_nodes = children(strong0);
			t26 = claim_text(strong0_nodes, "- ");
			a8 = claim_element(strong0_nodes, "A", { href: true });
			var a8_nodes = children(a8);
			t27 = claim_text(a8_nodes, "Mutation Tracking");
			a8_nodes.forEach(detach);
			strong0_nodes.forEach(detach);
			p5_nodes.forEach(detach);
			t28 = claim_space(section1_nodes);
			p6 = claim_element(section1_nodes, "P", {});
			var p6_nodes = children(p6);
			t29 = claim_text(p6_nodes, "Using ");
			a9 = claim_element(p6_nodes, "A", { href: true, rel: true });
			var a9_nodes = children(a9);
			t30 = claim_text(a9_nodes, "ES6 Proxy");
			a9_nodes.forEach(detach);
			t31 = claim_text(p6_nodes, ", or before that, Object getters and setters, to determine when the application state has changed.");
			p6_nodes.forEach(detach);
			t32 = claim_space(section1_nodes);
			p7 = claim_element(section1_nodes, "P", {});
			var p7_nodes = children(p7);
			strong1 = claim_element(p7_nodes, "STRONG", {});
			var strong1_nodes = children(strong1);
			t33 = claim_text(strong1_nodes, "- ");
			a10 = claim_element(strong1_nodes, "A", { href: true });
			var a10_nodes = children(a10);
			t34 = claim_text(a10_nodes, "Just call ");
			code0 = claim_element(a10_nodes, "CODE", {});
			var code0_nodes = children(code0);
			t35 = claim_text(code0_nodes, "scheduleUpdate");
			code0_nodes.forEach(detach);
			a10_nodes.forEach(detach);
			strong1_nodes.forEach(detach);
			p7_nodes.forEach(detach);
			t36 = claim_space(section1_nodes);
			p8 = claim_element(section1_nodes, "P", {});
			var p8_nodes = children(p8);
			t37 = claim_text(p8_nodes, "Provide APIs that indirectly calls ");
			code1 = claim_element(p8_nodes, "CODE", {});
			var code1_nodes = children(code1);
			t38 = claim_text(code1_nodes, "scheduleUpdate");
			code1_nodes.forEach(detach);
			p8_nodes.forEach(detach);
			t39 = claim_space(section1_nodes);
			p9 = claim_element(section1_nodes, "P", {});
			var p9_nodes = children(p9);
			strong2 = claim_element(p9_nodes, "STRONG", {});
			var strong2_nodes = children(strong2);
			t40 = claim_text(strong2_nodes, "- ");
			a11 = claim_element(strong2_nodes, "A", { href: true });
			var a11_nodes = children(a11);
			t41 = claim_text(a11_nodes, "Static Analysis");
			a11_nodes.forEach(detach);
			strong2_nodes.forEach(detach);
			p9_nodes.forEach(detach);
			t42 = claim_space(section1_nodes);
			p10 = claim_element(section1_nodes, "P", {});
			var p10_nodes = children(p10);
			t43 = claim_text(p10_nodes, "Analyse the code statically, and insert ");
			code2 = claim_element(p10_nodes, "CODE", {});
			var code2_nodes = children(code2);
			t44 = claim_text(code2_nodes, "scheduleUpdate");
			code2_nodes.forEach(detach);
			t45 = claim_text(p10_nodes, " into the code right after assignments.");
			p10_nodes.forEach(detach);
			t46 = claim_space(section1_nodes);
			p11 = claim_element(section1_nodes, "P", {});
			var p11_nodes = children(p11);
			t47 = claim_text(p11_nodes, "After knowing that the application state has change, the framework will then proceed to update the view.");
			p11_nodes.forEach(detach);
			t48 = claim_space(section1_nodes);
			p12 = claim_element(section1_nodes, "P", {});
			var p12_nodes = children(p12);
			t49 = claim_text(p12_nodes, "But, how?");
			p12_nodes.forEach(detach);
			t50 = claim_space(section1_nodes);
			p13 = claim_element(section1_nodes, "P", {});
			var p13_nodes = children(p13);
			t51 = claim_text(p13_nodes, "The framework needs to figure out ");
			strong3 = claim_element(p13_nodes, "STRONG", {});
			var strong3_nodes = children(strong3);
			t52 = claim_text(strong3_nodes, "what needs to be updated");
			strong3_nodes.forEach(detach);
			t53 = claim_text(p13_nodes, ", so that the framework will only update the part of the view that needs to be changed.");
			p13_nodes.forEach(detach);
			t54 = claim_space(section1_nodes);
			p14 = claim_element(section1_nodes, "P", {});
			var p14_nodes = children(p14);
			t55 = claim_text(p14_nodes, "Without knowing what needs to be updated, the quickest and dirtiest way of updating the view would be to destroy and recreate everything:");
			p14_nodes.forEach(detach);
			t56 = claim_space(section1_nodes);
			pre1 = claim_element(section1_nodes, "PRE", { class: true });
			var pre1_nodes = children(pre1);
			pre1_nodes.forEach(detach);
			t57 = claim_space(section1_nodes);
			p15 = claim_element(section1_nodes, "P", {});
			var p15_nodes = children(p15);
			t58 = claim_text(p15_nodes, "The drawbacks of this method are");
			p15_nodes.forEach(detach);
			section1_nodes.forEach(detach);
			t59 = claim_space(nodes);
			section2 = claim_element(nodes, "SECTION", {});
			var section2_nodes = children(section2);
			h40 = claim_element(section2_nodes, "H4", {});
			var h40_nodes = children(h40);
			a12 = claim_element(h40_nodes, "A", { href: true, id: true });
			var a12_nodes = children(a12);
			t60 = claim_text(a12_nodes, "- Losing element state");
			a12_nodes.forEach(detach);
			h40_nodes.forEach(detach);
			t61 = claim_space(section2_nodes);
			p16 = claim_element(section2_nodes, "P", {});
			var p16_nodes = children(p16);
			t62 = claim_text(p16_nodes, "We will lose the state of the element, such as:");
			p16_nodes.forEach(detach);
			t63 = claim_space(section2_nodes);
			ul4 = claim_element(section2_nodes, "UL", {});
			var ul4_nodes = children(ul4);
			li8 = claim_element(ul4_nodes, "LI", {});
			var li8_nodes = children(li8);
			t64 = claim_text(li8_nodes, "input focus");
			li8_nodes.forEach(detach);
			t65 = claim_space(ul4_nodes);
			li9 = claim_element(ul4_nodes, "LI", {});
			var li9_nodes = children(li9);
			t66 = claim_text(li9_nodes, "text highlight");
			li9_nodes.forEach(detach);
			t67 = claim_space(ul4_nodes);
			li10 = claim_element(ul4_nodes, "LI", {});
			var li10_nodes = children(li10);
			t68 = claim_text(li10_nodes, "active state");
			li10_nodes.forEach(detach);
			t69 = claim_space(ul4_nodes);
			li11 = claim_element(ul4_nodes, "LI", {});
			var li11_nodes = children(li11);
			t70 = claim_text(li11_nodes, "...");
			li11_nodes.forEach(detach);
			ul4_nodes.forEach(detach);
			t71 = claim_space(section2_nodes);
			p17 = claim_element(section2_nodes, "P", {});
			var p17_nodes = children(p17);
			t72 = claim_text(p17_nodes, "if we didnt preserve them before destroying them.");
			p17_nodes.forEach(detach);
			section2_nodes.forEach(detach);
			t73 = claim_space(nodes);
			section3 = claim_element(nodes, "SECTION", {});
			var section3_nodes = children(section3);
			h41 = claim_element(section3_nodes, "H4", {});
			var h41_nodes = children(h41);
			a13 = claim_element(h41_nodes, "A", { href: true, id: true });
			var a13_nodes = children(a13);
			t74 = claim_text(a13_nodes, "- Cost of creating DOM elements");
			a13_nodes.forEach(detach);
			h41_nodes.forEach(detach);
			t75 = claim_space(section3_nodes);
			p18 = claim_element(section3_nodes, "P", {});
			var p18_nodes = children(p18);
			t76 = claim_text(p18_nodes, "It is much costly to recreate all the DOM elements needed instead of reuse and update the existing DOM elements.");
			p18_nodes.forEach(detach);
			t77 = claim_space(section3_nodes);
			p19 = claim_element(section3_nodes, "P", {});
			var p19_nodes = children(p19);
			t78 = claim_text(p19_nodes, "@@@@@@@@@@@@");
			p19_nodes.forEach(detach);
			t79 = claim_space(section3_nodes);
			p20 = claim_element(section3_nodes, "P", {});
			var p20_nodes = children(p20);
			t80 = claim_text(p20_nodes, "Now let's");
			p20_nodes.forEach(detach);
			t81 = claim_space(section3_nodes);
			p21 = claim_element(section3_nodes, "P", {});
			var p21_nodes = children(p21);
			t82 = claim_text(p21_nodes, "framework needs to know ");
			strong4 = claim_element(p21_nodes, "STRONG", {});
			var strong4_nodes = children(strong4);
			t83 = claim_text(strong4_nodes, "what has changed");
			strong4_nodes.forEach(detach);
			t84 = claim_text(p21_nodes, " and then based on that, figure out ");
			strong5 = claim_element(p21_nodes, "STRONG", {});
			var strong5_nodes = children(strong5);
			t85 = claim_text(strong5_nodes, "what needs to be updated");
			strong5_nodes.forEach(detach);
			t86 = claim_text(p21_nodes, ".");
			p21_nodes.forEach(detach);
			t87 = claim_space(section3_nodes);
			p22 = claim_element(section3_nodes, "P", {});
			var p22_nodes = children(p22);
			t88 = claim_text(p22_nodes, "@@@@@@@@@@@@");
			p22_nodes.forEach(detach);
			t89 = claim_space(section3_nodes);
			p23 = claim_element(section3_nodes, "P", {});
			var p23_nodes = children(p23);
			t90 = claim_text(p23_nodes, "Different ");
			strong6 = claim_element(p23_nodes, "STRONG", {});
			var strong6_nodes = children(strong6);
			t91 = claim_text(strong6_nodes, "\"templating\" strategies");
			strong6_nodes.forEach(detach);
			t92 = claim_text(p23_nodes, " and ");
			a14 = claim_element(p23_nodes, "A", { href: true });
			var a14_nodes = children(a14);
			t93 = claim_text(a14_nodes, "WHEN strategies");
			a14_nodes.forEach(detach);
			t94 = claim_text(p23_nodes, " give the framework varying amount of information in terms of ");
			strong7 = claim_element(p23_nodes, "STRONG", {});
			var strong7_nodes = children(strong7);
			t95 = claim_text(strong7_nodes, "what has changed");
			strong7_nodes.forEach(detach);
			t96 = claim_text(p23_nodes, " and ");
			strong8 = claim_element(p23_nodes, "STRONG", {});
			var strong8_nodes = children(strong8);
			t97 = claim_text(strong8_nodes, "what needs to be updated");
			strong8_nodes.forEach(detach);
			t98 = claim_text(p23_nodes, ".");
			p23_nodes.forEach(detach);
			t99 = claim_space(section3_nodes);
			p24 = claim_element(section3_nodes, "P", {});
			var p24_nodes = children(p24);
			t100 = claim_text(p24_nodes, "We can put that variance in the amount of information into a spectrum.");
			p24_nodes.forEach(detach);
			section3_nodes.forEach(detach);
			t101 = claim_space(nodes);
			section4 = claim_element(nodes, "SECTION", {});
			var section4_nodes = children(section4);
			h30 = claim_element(section4_nodes, "H3", {});
			var h30_nodes = children(h30);
			a15 = claim_element(h30_nodes, "A", { href: true, id: true });
			var a15_nodes = children(a15);
			t102 = claim_text(a15_nodes, "Framework knows nothing about what has changed");
			a15_nodes.forEach(detach);
			h30_nodes.forEach(detach);
			t103 = claim_space(section4_nodes);
			p25 = claim_element(section4_nodes, "P", {});
			var p25_nodes = children(p25);
			t104 = claim_text(p25_nodes, "At one end, our framework ");
			strong9 = claim_element(p25_nodes, "STRONG", {});
			var strong9_nodes = children(strong9);
			t105 = claim_text(strong9_nodes, "knows nothing about what has changed");
			strong9_nodes.forEach(detach);
			t106 = claim_text(p25_nodes, ". To update the application without knowing what has change, the quickest and dirtiest mechanism would be to recreate everything.");
			p25_nodes.forEach(detach);
			t107 = claim_space(section4_nodes);
			p26 = claim_element(section4_nodes, "P", {});
			var p26_nodes = children(p26);
			t108 = claim_text(p26_nodes, "However that would come with costs:");
			p26_nodes.forEach(detach);
			t109 = claim_space(section4_nodes);
			ul5 = claim_element(section4_nodes, "UL", {});
			var ul5_nodes = children(ul5);
			li12 = claim_element(ul5_nodes, "LI", {});
			var li12_nodes = children(li12);
			t110 = claim_text(li12_nodes, "losing focus");
			li12_nodes.forEach(detach);
			t111 = claim_space(ul5_nodes);
			li13 = claim_element(ul5_nodes, "LI", {});
			var li13_nodes = children(li13);
			t112 = claim_text(li13_nodes, "cost of creating new elements, DOM manipulations");
			li13_nodes.forEach(detach);
			ul5_nodes.forEach(detach);
			t113 = claim_space(section4_nodes);
			p27 = claim_element(section4_nodes, "P", {});
			var p27_nodes = children(p27);
			t114 = claim_text(p27_nodes, "So, a more well-thought mechanism is to create a intermediate representation of the UI. Instead of tearing down and recreate every DOM element everytime when there's an update, we compare the latest intermediate representation with the previous one, figure out the difference between the two representations and generate a list of operations needed to patch the DOM.");
			p27_nodes.forEach(detach);
			t115 = claim_space(section4_nodes);
			pre2 = claim_element(section4_nodes, "PRE", { class: true });
			var pre2_nodes = children(pre2);
			pre2_nodes.forEach(detach);
			t116 = claim_space(section4_nodes);
			p28 = claim_element(section4_nodes, "P", {});
			var p28_nodes = children(p28);
			t117 = claim_text(p28_nodes, "By finding the differences between the new and old representations, framework figures out ");
			strong10 = claim_element(p28_nodes, "STRONG", {});
			var strong10_nodes = children(strong10);
			t118 = claim_text(strong10_nodes, "what needs to be updated");
			strong10_nodes.forEach(detach);
			t119 = claim_text(p28_nodes, " without knowing ");
			strong11 = claim_element(p28_nodes, "STRONG", {});
			var strong11_nodes = children(strong11);
			t120 = claim_text(strong11_nodes, "what has changed");
			strong11_nodes.forEach(detach);
			t121 = claim_text(p28_nodes, ".");
			p28_nodes.forEach(detach);
			t122 = claim_space(section4_nodes);
			p29 = claim_element(section4_nodes, "P", {});
			var p29_nodes = children(p29);
			t123 = claim_text(p29_nodes, "The main advantage of this mechanism is that, the intermediate representation is way cheaper to create and manipulate.");
			p29_nodes.forEach(detach);
			section4_nodes.forEach(detach);
			t124 = claim_space(nodes);
			section5 = claim_element(nodes, "SECTION", {});
			var section5_nodes = children(section5);
			h31 = claim_element(section5_nodes, "H3", {});
			var h31_nodes = children(h31);
			a16 = claim_element(h31_nodes, "A", { href: true, id: true });
			var a16_nodes = children(a16);
			t125 = claim_text(a16_nodes, "Framework knows exactly what has changed and what needs to be updated");
			a16_nodes.forEach(detach);
			h31_nodes.forEach(detach);
			t126 = claim_space(section5_nodes);
			p30 = claim_element(section5_nodes, "P", {});
			var p30_nodes = children(p30);
			t127 = claim_text(p30_nodes, "On the other extreme end of the spectrum, framework knows exactly what has changed and what needs to be updated.");
			p30_nodes.forEach(detach);
			t128 = claim_space(section5_nodes);
			p31 = claim_element(section5_nodes, "P", {});
			var p31_nodes = children(p31);
			t129 = claim_text(p31_nodes, "This is the most efficient way of updating the UI, where everything needed by the framework has already been figured out. So the only thing the framework needs to do is to apply those updates to the DOM.");
			p31_nodes.forEach(detach);
			t130 = claim_space(section5_nodes);
			pre3 = claim_element(section5_nodes, "PRE", { class: true });
			var pre3_nodes = children(pre3);
			pre3_nodes.forEach(detach);
			section5_nodes.forEach(detach);
			t131 = claim_space(nodes);
			section6 = claim_element(nodes, "SECTION", {});
			var section6_nodes = children(section6);
			h32 = claim_element(section6_nodes, "H3", {});
			var h32_nodes = children(h32);
			a17 = claim_element(h32_nodes, "A", { href: true, id: true });
			var a17_nodes = children(a17);
			t132 = claim_text(a17_nodes, "The Component Model");
			a17_nodes.forEach(detach);
			h32_nodes.forEach(detach);
			t133 = claim_space(section6_nodes);
			p32 = claim_element(section6_nodes, "P", {});
			var p32_nodes = children(p32);
			t134 = claim_text(p32_nodes, "TODO:");
			p32_nodes.forEach(detach);
			t135 = claim_space(section6_nodes);
			p33 = claim_element(section6_nodes, "P", {});
			var p33_nodes = children(p33);
			t136 = claim_text(p33_nodes, "Components With component model, we can break the application up into is composed with components.");
			p33_nodes.forEach(detach);
			t137 = claim_space(section6_nodes);
			p34 = claim_element(section6_nodes, "P", {});
			var p34_nodes = children(p34);
			t138 = claim_text(p34_nodes, "So, if the framework is able to figure out what needs to be updated early on, then , the more efficient it is (without having to figure out what needs to be updated later on)\ndecides whether the framework");
			p34_nodes.forEach(detach);
			t139 = claim_space(section6_nodes);
			p35 = claim_element(section6_nodes, "P", {});
			var p35_nodes = children(p35);
			t140 = claim_text(p35_nodes, "Different \"templating\" strategies and [WHEN strategies");
			p35_nodes.forEach(detach);
			section6_nodes.forEach(detach);
			this.h();
		},
		h() {
			attr(a0, "href", "#what-is-reactivity");
			attr(a1, "href", "#losing-element-state");
			attr(a2, "href", "#cost-of-creating-dom-elements");
			attr(a3, "href", "#framework-knows-nothing-about-what-has-changed");
			attr(a4, "href", "#framework-knows-exactly-what-has-changed-and-what-needs-to-be-updated");
			attr(a5, "href", "#the-component-model");
			attr(ul2, "class", "sitemap");
			attr(ul2, "id", "sitemap");
			attr(ul2, "role", "navigation");
			attr(ul2, "aria-label", "Table of Contents");
			attr(a6, "href", "#what-is-reactivity");
			attr(a6, "id", "what-is-reactivity");
			attr(a7, "href", "/reactivity-in-web-frameworks-the-when");
			attr(pre0, "class", "language-js");
			attr(a8, "href", "/reactivity-in-web-frameworks-the-when#mutation-tracking");
			attr(a9, "href", "https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Proxy");
			attr(a9, "rel", "nofollow");
			attr(a10, "href", "/reactivity-in-web-frameworks-the-when#just-call-schedule-update");
			attr(a11, "href", "/reactivity-in-web-frameworks-the-when#static-analysis");
			attr(pre1, "class", "language-js");
			attr(a12, "href", "#losing-element-state");
			attr(a12, "id", "losing-element-state");
			attr(a13, "href", "#cost-of-creating-dom-elements");
			attr(a13, "id", "cost-of-creating-dom-elements");
			attr(a14, "href", "/reactivity-in-web-frameworks-the-when#the-when");
			attr(a15, "href", "#framework-knows-nothing-about-what-has-changed");
			attr(a15, "id", "framework-knows-nothing-about-what-has-changed");
			attr(pre2, "class", "language-js");
			attr(a16, "href", "#framework-knows-exactly-what-has-changed-and-what-needs-to-be-updated");
			attr(a16, "id", "framework-knows-exactly-what-has-changed-and-what-needs-to-be-updated");
			attr(pre3, "class", "language-js");
			attr(a17, "href", "#the-component-model");
			attr(a17, "id", "the-component-model");
		},
		m(target, anchor) {
			insert(target, section0, anchor);
			append(section0, ul2);
			append(ul2, li0);
			append(li0, a0);
			append(a0, t0);
			append(ul2, ul1);
			append(ul1, ul0);
			append(ul0, li1);
			append(li1, a1);
			append(a1, t1);
			append(ul0, li2);
			append(li2, a2);
			append(a2, t2);
			append(ul1, li3);
			append(li3, a3);
			append(a3, t3);
			append(ul1, li4);
			append(li4, a4);
			append(a4, t4);
			append(ul1, li5);
			append(li5, a5);
			append(a5, t5);
			insert(target, t6, anchor);
			insert(target, section1, anchor);
			append(section1, h2);
			append(h2, a6);
			append(a6, t7);
			append(section1, t8);
			append(section1, p0);
			append(p0, t9);
			append(section1, t10);
			append(section1, p1);
			append(p1, t11);
			append(section1, t12);
			append(section1, p2);
			append(p2, t13);
			append(section1, t14);
			append(section1, ul3);
			append(ul3, li6);
			append(li6, t15);
			append(ul3, t16);
			append(ul3, li7);
			append(li7, t17);
			append(section1, t18);
			append(section1, p3);
			append(p3, t19);
			append(p3, a7);
			append(a7, t20);
			append(p3, t21);
			append(section1, t22);
			append(section1, pre0);
			pre0.innerHTML = raw0_value;
			append(section1, t23);
			append(section1, p4);
			append(p4, t24);
			append(section1, t25);
			append(section1, p5);
			append(p5, strong0);
			append(strong0, t26);
			append(strong0, a8);
			append(a8, t27);
			append(section1, t28);
			append(section1, p6);
			append(p6, t29);
			append(p6, a9);
			append(a9, t30);
			append(p6, t31);
			append(section1, t32);
			append(section1, p7);
			append(p7, strong1);
			append(strong1, t33);
			append(strong1, a10);
			append(a10, t34);
			append(a10, code0);
			append(code0, t35);
			append(section1, t36);
			append(section1, p8);
			append(p8, t37);
			append(p8, code1);
			append(code1, t38);
			append(section1, t39);
			append(section1, p9);
			append(p9, strong2);
			append(strong2, t40);
			append(strong2, a11);
			append(a11, t41);
			append(section1, t42);
			append(section1, p10);
			append(p10, t43);
			append(p10, code2);
			append(code2, t44);
			append(p10, t45);
			append(section1, t46);
			append(section1, p11);
			append(p11, t47);
			append(section1, t48);
			append(section1, p12);
			append(p12, t49);
			append(section1, t50);
			append(section1, p13);
			append(p13, t51);
			append(p13, strong3);
			append(strong3, t52);
			append(p13, t53);
			append(section1, t54);
			append(section1, p14);
			append(p14, t55);
			append(section1, t56);
			append(section1, pre1);
			pre1.innerHTML = raw1_value;
			append(section1, t57);
			append(section1, p15);
			append(p15, t58);
			insert(target, t59, anchor);
			insert(target, section2, anchor);
			append(section2, h40);
			append(h40, a12);
			append(a12, t60);
			append(section2, t61);
			append(section2, p16);
			append(p16, t62);
			append(section2, t63);
			append(section2, ul4);
			append(ul4, li8);
			append(li8, t64);
			append(ul4, t65);
			append(ul4, li9);
			append(li9, t66);
			append(ul4, t67);
			append(ul4, li10);
			append(li10, t68);
			append(ul4, t69);
			append(ul4, li11);
			append(li11, t70);
			append(section2, t71);
			append(section2, p17);
			append(p17, t72);
			insert(target, t73, anchor);
			insert(target, section3, anchor);
			append(section3, h41);
			append(h41, a13);
			append(a13, t74);
			append(section3, t75);
			append(section3, p18);
			append(p18, t76);
			append(section3, t77);
			append(section3, p19);
			append(p19, t78);
			append(section3, t79);
			append(section3, p20);
			append(p20, t80);
			append(section3, t81);
			append(section3, p21);
			append(p21, t82);
			append(p21, strong4);
			append(strong4, t83);
			append(p21, t84);
			append(p21, strong5);
			append(strong5, t85);
			append(p21, t86);
			append(section3, t87);
			append(section3, p22);
			append(p22, t88);
			append(section3, t89);
			append(section3, p23);
			append(p23, t90);
			append(p23, strong6);
			append(strong6, t91);
			append(p23, t92);
			append(p23, a14);
			append(a14, t93);
			append(p23, t94);
			append(p23, strong7);
			append(strong7, t95);
			append(p23, t96);
			append(p23, strong8);
			append(strong8, t97);
			append(p23, t98);
			append(section3, t99);
			append(section3, p24);
			append(p24, t100);
			insert(target, t101, anchor);
			insert(target, section4, anchor);
			append(section4, h30);
			append(h30, a15);
			append(a15, t102);
			append(section4, t103);
			append(section4, p25);
			append(p25, t104);
			append(p25, strong9);
			append(strong9, t105);
			append(p25, t106);
			append(section4, t107);
			append(section4, p26);
			append(p26, t108);
			append(section4, t109);
			append(section4, ul5);
			append(ul5, li12);
			append(li12, t110);
			append(ul5, t111);
			append(ul5, li13);
			append(li13, t112);
			append(section4, t113);
			append(section4, p27);
			append(p27, t114);
			append(section4, t115);
			append(section4, pre2);
			pre2.innerHTML = raw2_value;
			append(section4, t116);
			append(section4, p28);
			append(p28, t117);
			append(p28, strong10);
			append(strong10, t118);
			append(p28, t119);
			append(p28, strong11);
			append(strong11, t120);
			append(p28, t121);
			append(section4, t122);
			append(section4, p29);
			append(p29, t123);
			insert(target, t124, anchor);
			insert(target, section5, anchor);
			append(section5, h31);
			append(h31, a16);
			append(a16, t125);
			append(section5, t126);
			append(section5, p30);
			append(p30, t127);
			append(section5, t128);
			append(section5, p31);
			append(p31, t129);
			append(section5, t130);
			append(section5, pre3);
			pre3.innerHTML = raw3_value;
			insert(target, t131, anchor);
			insert(target, section6, anchor);
			append(section6, h32);
			append(h32, a17);
			append(a17, t132);
			append(section6, t133);
			append(section6, p32);
			append(p32, t134);
			append(section6, t135);
			append(section6, p33);
			append(p33, t136);
			append(section6, t137);
			append(section6, p34);
			append(p34, t138);
			append(section6, t139);
			append(section6, p35);
			append(p35, t140);
		},
		p: noop,
		d(detaching) {
			if (detaching) detach(section0);
			if (detaching) detach(t6);
			if (detaching) detach(section1);
			if (detaching) detach(t59);
			if (detaching) detach(section2);
			if (detaching) detach(t73);
			if (detaching) detach(section3);
			if (detaching) detach(t101);
			if (detaching) detach(section4);
			if (detaching) detach(t124);
			if (detaching) detach(section5);
			if (detaching) detach(t131);
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
	"title": "Reactivity in Web Frameworks (Part 2)",
	"date": "2020-03-05T08:00:00Z",
	"description": "Reactivity is the ability of a web framework to update your view whenever the application state has changed. How do web frameworks achieve reactivity?",
	"wip": true,
	"slug": "reactivity-in-web-frameworks-the-what",
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
