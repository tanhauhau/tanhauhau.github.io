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

var baseCss = "http://127.0.0.1:8080/webpack-additional-compilation-pass/assets/_blog-299aa480.css";

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
					"@id": "http%3A%2F%2F127.0.0.1%3A8080%2Fwebpack-additional-compilation-pass",
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
			attr(meta11, "content", "http%3A%2F%2F127.0.0.1%3A8080%2Fwebpack-additional-compilation-pass");
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
							"@id": "http%3A%2F%2F127.0.0.1%3A8080%2Fwebpack-additional-compilation-pass",
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

/* content/blog/webpack-additional-compilation-pass/@@page-markup.svelte generated by Svelte v3.24.0 */

function create_default_slot(ctx) {
	let section0;
	let ul3;
	let li0;
	let a0;
	let t0;
	let li1;
	let a1;
	let t1;
	let ul0;
	let li2;
	let a2;
	let li3;
	let a3;
	let t2;
	let ul1;
	let li4;
	let a4;
	let li5;
	let a5;
	let t3;
	let li6;
	let a6;
	let t4;
	let ul2;
	let li7;
	let a7;
	let t5;
	let p0;
	let t6;
	let t7;
	let section1;
	let h20;
	let a8;
	let t8;
	let t9;
	let p1;
	let t10;
	let t11;
	let p2;
	let t12;
	let t13;
	let pre0;

	let raw0_value = `
<code class="language-json"><span class="token punctuation">&#123;</span>
  <span class="token property">"css"</span><span class="token operator">:</span> <span class="token punctuation">[</span><span class="token string">"http://cdn/assets/style.xxx.css"</span><span class="token punctuation">]</span><span class="token punctuation">,</span>
  <span class="token property">"html"</span><span class="token operator">:</span> <span class="token string">"&lt;div class=\"container_xyz\">Hello world&lt;/div>"</span>
<span class="token punctuation">&#125;</span></code>` + "";

	let t14;
	let pre1;

	let raw1_value = `
<code class="language-css"><span class="token comment">/* filename: http://cdn/assets/style.xxx.css */</span>
<span class="token selector"><span class="token class">.container_xyz</span></span> <span class="token punctuation">&#123;</span>
  <span class="token property">font-family</span><span class="token punctuation">:</span> <span class="token string">'Comic Sans'</span><span class="token punctuation">;</span>
<span class="token punctuation">&#125;</span></code>` + "";

	let t15;
	let p3;
	let t16;
	let a9;
	let t17;
	let t18;
	let a10;
	let t19;
	let t20;
	let t21;
	let pre2;

	let raw2_value = `
<code class="language-js"><span class="token keyword module">import</span> express <span class="token keyword module">from</span> <span class="token string">'express'</span><span class="token punctuation">;</span>
<span class="token keyword module">import</span> <span class="token maybe-class-name">React</span> <span class="token keyword module">from</span> <span class="token string">'react'</span><span class="token punctuation">;</span>
<span class="token keyword module">import</span> <span class="token punctuation">&#123;</span> renderToStaticMarkup <span class="token punctuation">&#125;</span> <span class="token keyword module">from</span> <span class="token string">'react-dom/server'</span><span class="token punctuation">;</span>
<span class="token keyword module">import</span> styles <span class="token keyword module">from</span> <span class="token string">'./app.scss'</span><span class="token punctuation">;</span>

<span class="token keyword">const</span> app <span class="token operator">=</span> <span class="token function">express</span><span class="token punctuation">(</span><span class="token punctuation">)</span><span class="token punctuation">;</span>
app<span class="token punctuation">.</span><span class="token method function property-access">get</span><span class="token punctuation">(</span><span class="token string">'/'</span><span class="token punctuation">,</span> <span class="token punctuation">(</span><span class="token parameter">req<span class="token punctuation">,</span> res</span><span class="token punctuation">)</span> <span class="token arrow operator">=></span> <span class="token punctuation">&#123;</span>
  <span class="token keyword">const</span> app <span class="token operator">=</span> <span class="token operator">&lt;</span>div className<span class="token operator">=</span><span class="token punctuation">&#123;</span>styles<span class="token punctuation">.</span><span class="token property-access">container</span><span class="token punctuation">&#125;</span><span class="token operator">></span><span class="token maybe-class-name">Hello</span> world<span class="token operator">&lt;</span><span class="token operator">/</span>div<span class="token operator">></span><span class="token punctuation">;</span>
  <span class="token keyword">const</span> htmlContent <span class="token operator">=</span> <span class="token function">renderToStaticMarkup</span><span class="token punctuation">(</span>app<span class="token punctuation">)</span><span class="token punctuation">;</span>

  res<span class="token punctuation">.</span><span class="token method function property-access">json</span><span class="token punctuation">(</span><span class="token punctuation">&#123;</span>
    css<span class="token punctuation">:</span> <span class="token punctuation">[</span><span class="token punctuation">]</span><span class="token punctuation">,</span>
    html<span class="token punctuation">:</span> htmlContent<span class="token punctuation">,</span>
  <span class="token punctuation">&#125;</span><span class="token punctuation">)</span><span class="token punctuation">;</span>
<span class="token punctuation">&#125;</span><span class="token punctuation">)</span><span class="token punctuation">;</span>
app<span class="token punctuation">.</span><span class="token method function property-access">listen</span><span class="token punctuation">(</span>process<span class="token punctuation">.</span><span class="token property-access">env</span><span class="token punctuation">.</span><span class="token constant">PORT</span><span class="token punctuation">)</span><span class="token punctuation">;</span></code>` + "";

	let t22;
	let p4;
	let t23;
	let t24;
	let p5;
	let t25;
	let t26;
	let p6;
	let t27;
	let t28;
	let section2;
	let h21;
	let a11;
	let t29;
	let t30;
	let p7;
	let t31;
	let a12;
	let t32;
	let t33;
	let t34;
	let pre3;

	let raw3_value = `
<code class="language-js"><span class="token comment">// ...</span>
<span class="token keyword module">import</span> webpackManifest <span class="token keyword module">from</span> <span class="token string">'./dist/webpack-manifest.json'</span><span class="token punctuation">;</span>
<span class="token keyword">const</span> cssFiles <span class="token operator">=</span> <span class="token function">filterCssFiles</span><span class="token punctuation">(</span>webpackManifest<span class="token punctuation">)</span><span class="token punctuation">;</span>
<span class="token comment">// ...</span>
app<span class="token punctuation">.</span><span class="token method function property-access">get</span><span class="token punctuation">(</span><span class="token string">'/'</span><span class="token punctuation">,</span> <span class="token punctuation">(</span><span class="token parameter">req<span class="token punctuation">,</span> res</span><span class="token punctuation">)</span> <span class="token arrow operator">=></span> <span class="token punctuation">&#123;</span>
  res<span class="token punctuation">.</span><span class="token method function property-access">json</span><span class="token punctuation">(</span><span class="token punctuation">&#123;</span>
    css<span class="token punctuation">:</span> cssFiles<span class="token punctuation">,</span>
    html<span class="token punctuation">:</span> htmlContent<span class="token punctuation">,</span>
  <span class="token punctuation">&#125;</span><span class="token punctuation">)</span><span class="token punctuation">;</span>
<span class="token punctuation">&#125;</span><span class="token punctuation">)</span><span class="token punctuation">;</span>
<span class="token comment">// ...</span></code>` + "";

	let t35;
	let p8;
	let t36;
	let code0;
	let t37;
	let t38;
	let t39;
	let p9;
	let t40;
	let code1;
	let t41;
	let t42;
	let a13;
	let strong0;
	let t43;
	let t44;
	let code2;
	let t45;
	let t46;
	let code3;
	let t47;
	let t48;
	let code4;
	let t49;
	let t50;
	let t51;
	let pre4;

	let raw4_value = `
<code class="language-js"><span class="token comment">// ...</span>
<span class="token keyword">const</span> webpackManifest <span class="token operator">=</span> <span class="token function">__non_webpack_require__</span><span class="token punctuation">(</span><span class="token string">'./dist/webpack-manifest.json'</span><span class="token punctuation">)</span><span class="token punctuation">;</span>
<span class="token keyword">const</span> cssFiles <span class="token operator">=</span> <span class="token function">filterCssFiles</span><span class="token punctuation">(</span>webpackManifest<span class="token punctuation">)</span><span class="token punctuation">;</span>
<span class="token comment">// ...</span>
app<span class="token punctuation">.</span><span class="token method function property-access">get</span><span class="token punctuation">(</span><span class="token string">'/'</span><span class="token punctuation">,</span> <span class="token punctuation">(</span><span class="token parameter">req<span class="token punctuation">,</span> res</span><span class="token punctuation">)</span> <span class="token arrow operator">=></span> <span class="token punctuation">&#123;</span>
  res<span class="token punctuation">.</span><span class="token method function property-access">json</span><span class="token punctuation">(</span><span class="token punctuation">&#123;</span>
    css<span class="token punctuation">:</span> cssFiles<span class="token punctuation">,</span>
    html<span class="token punctuation">:</span> htmlContent<span class="token punctuation">,</span>
  <span class="token punctuation">&#125;</span><span class="token punctuation">)</span><span class="token punctuation">;</span>
<span class="token punctuation">&#125;</span><span class="token punctuation">)</span><span class="token punctuation">;</span>
<span class="token comment">// ...</span></code>` + "";

	let t52;
	let p10;
	let t53;
	let code5;
	let t54;
	let t55;
	let t56;
	let p11;
	let t57;
	let code6;
	let t58;
	let t59;
	let t60;
	let pre5;

	let raw5_value = `
<code class="language-">dist
├── webpack-manifest.json
└── bundle.js  // &lt;-- the main output bundle</code>` + "";

	let t61;
	let p12;
	let t62;
	let code7;
	let t63;
	let t64;
	let t65;
	let section3;
	let h30;
	let a14;
	let t66;
	let t67;
	let p13;
	let t68;
	let a15;
	let t69;
	let t70;
	let a16;
	let t71;
	let t72;
	let code8;
	let t73;
	let t74;
	let t75;
	let pre6;

	let raw6_value = `
<code class="language-js"><span class="token comment">// ...</span>
<span class="token keyword module">import</span> webpackManifest <span class="token keyword module">from</span> <span class="token string">'webpack-manifest'</span><span class="token punctuation">;</span>
<span class="token keyword">const</span> cssFiles <span class="token operator">=</span> <span class="token function">filterCssFiles</span><span class="token punctuation">(</span>webpackManifest<span class="token punctuation">)</span><span class="token punctuation">;</span>
<span class="token comment">// ...</span></code>` + "";

	let t76;
	let pre7;

	let raw7_value = `
<code class="language-js"><span class="token comment">// filename: webpack.config.js</span>
module<span class="token punctuation">.</span><span class="token property-access">exports</span> <span class="token operator">=</span> <span class="token punctuation">&#123;</span>
  externals<span class="token punctuation">:</span> <span class="token punctuation">&#123;</span>
    <span class="token string">'webpack-manifest'</span><span class="token punctuation">:</span> <span class="token string">"commonjs2 ./webpack-manifest.json"</span>
  <span class="token punctuation">&#125;</span>
<span class="token punctuation">&#125;</span></code>` + "";

	let t77;
	let p14;
	let t78;
	let t79;
	let pre8;

	let raw8_value = `
<code class="language-js"><span class="token comment">// filename: bundle.js</span>
<span class="token keyword">const</span> webpackManifest <span class="token operator">=</span> <span class="token function">require</span><span class="token punctuation">(</span><span class="token string">'./webpack-manifest.json'</span><span class="token punctuation">)</span><span class="token punctuation">;</span>
<span class="token keyword">const</span> cssFiles <span class="token operator">=</span> <span class="token function">filterCssFiles</span><span class="token punctuation">(</span>webpackManifest<span class="token punctuation">)</span><span class="token punctuation">;</span>
<span class="token comment">// ...</span></code>` + "";

	let t80;
	let p15;
	let t81;
	let code9;
	let t82;
	let t83;
	let t84;
	let pre9;

	let raw9_value = `
<code class="language-">dist
├── bundle.js  // &lt;-- the main output bundle
└── webpack-manifest.json // &lt;-- relative to bundle.js</code>` + "";

	let t85;
	let p16;
	let t86;
	let a17;
	let t87;
	let t88;
	let t89;
	let section4;
	let h22;
	let a18;
	let t90;
	let t91;
	let p17;
	let t92;
	let a19;
	let t93;
	let t94;
	let t95;
	let pre10;

	let raw10_value = `
<code class="language-js"><span class="token comment">// filename: bundle.js</span>
<span class="token comment">// added by template plugin</span>
<span class="token keyword">const</span> <span class="token constant">CSS_FILES</span> <span class="token operator">=</span> <span class="token punctuation">[</span><span class="token string">'http://cdn/assets/style.xxx.css'</span><span class="token punctuation">]</span><span class="token punctuation">;</span>
<span class="token comment">// END added by template plugin</span>
<span class="token comment">// ...the main bundle</span>
app<span class="token punctuation">.</span><span class="token method function property-access">get</span><span class="token punctuation">(</span><span class="token string">'/'</span><span class="token punctuation">,</span> <span class="token punctuation">(</span><span class="token parameter">req<span class="token punctuation">,</span> res</span><span class="token punctuation">)</span> <span class="token arrow operator">=></span> <span class="token punctuation">&#123;</span>
  <span class="token comment">// ...</span>
  res<span class="token punctuation">.</span><span class="token method function property-access">json</span><span class="token punctuation">(</span><span class="token punctuation">&#123;</span>
    css<span class="token punctuation">:</span> <span class="token constant">CSS_FILES</span><span class="token punctuation">,</span>
    html<span class="token punctuation">:</span> htmlContent<span class="token punctuation">,</span>
  <span class="token punctuation">&#125;</span><span class="token punctuation">)</span><span class="token punctuation">;</span>
<span class="token punctuation">&#125;</span><span class="token punctuation">)</span><span class="token punctuation">;</span></code>` + "";

	let t96;
	let p18;
	let t97;
	let code10;
	let t98;
	let t99;
	let code11;
	let t100;
	let t101;
	let t102;
	let p19;
	let t103;
	let code12;
	let t104;
	let t105;
	let t106;
	let pre11;

	let raw11_value = `
<code class="language-js"><span class="token keyword">const</span> <span class="token maybe-class-name">ManifestPlugin</span> <span class="token operator">=</span> <span class="token function">require</span><span class="token punctuation">(</span><span class="token string">'webpack-manifest-plugin'</span><span class="token punctuation">)</span><span class="token punctuation">;</span>

<span class="token keyword">class</span> <span class="token class-name">MyWebpackPlugin</span> <span class="token punctuation">&#123;</span>
  <span class="token function">apply</span><span class="token punctuation">(</span><span class="token parameter">compiler</span><span class="token punctuation">)</span> <span class="token punctuation">&#123;</span>
    <span class="token keyword">new</span> <span class="token class-name">ManifestPlugin</span><span class="token punctuation">(</span>manifestOptions<span class="token punctuation">)</span><span class="token punctuation">.</span><span class="token method function property-access">apply</span><span class="token punctuation">(</span>compiler<span class="token punctuation">)</span><span class="token punctuation">;</span>
    <span class="token comment">// get manifest from &#96;webpack-manifest-plugin&#96;</span>
    <span class="token maybe-class-name">ManifestPlugin</span><span class="token punctuation">.</span><span class="token method function property-access">getCompilerHooks</span><span class="token punctuation">(</span>compiler<span class="token punctuation">)</span><span class="token punctuation">.</span><span class="token property-access">afterEmit</span><span class="token punctuation">.</span><span class="token method function property-access">tap</span><span class="token punctuation">(</span>
      <span class="token string">'MyWebpackPlugin'</span><span class="token punctuation">,</span>
      <span class="token parameter">manifest</span> <span class="token arrow operator">=></span> <span class="token punctuation">&#123;</span>
        <span class="token keyword">this</span><span class="token punctuation">.</span><span class="token property-access">manifest</span> <span class="token operator">=</span> manifest<span class="token punctuation">;</span>
      <span class="token punctuation">&#125;</span>
    <span class="token punctuation">)</span><span class="token punctuation">;</span>

    <span class="token comment">// see https://lihautan.com/webpack-plugin-main-template</span>
    <span class="token comment">// on writing template plugin</span>
    compiler<span class="token punctuation">.</span><span class="token property-access">hooks</span><span class="token punctuation">.</span><span class="token property-access">thisCompilation</span><span class="token punctuation">.</span><span class="token method function property-access">tap</span><span class="token punctuation">(</span><span class="token string">'MyWebpackPlugin'</span><span class="token punctuation">,</span> <span class="token parameter">compilation</span> <span class="token arrow operator">=></span> <span class="token punctuation">&#123;</span>
      <span class="token comment">// ...</span>
      hooks<span class="token punctuation">.</span><span class="token property-access">render</span><span class="token punctuation">.</span><span class="token method function property-access">tap</span><span class="token punctuation">(</span><span class="token string">'MyWebpackPlugin'</span><span class="token punctuation">,</span> <span class="token punctuation">(</span><span class="token parameter">source<span class="token punctuation">,</span> <span class="token punctuation">&#123;</span> chunk<span class="token punctuation">,</span> chunkGraph <span class="token punctuation">&#125;</span></span><span class="token punctuation">)</span> <span class="token arrow operator">=></span> <span class="token punctuation">&#123;</span>
        <span class="token comment">// ...</span>
        <span class="token comment">// highlight-start</span>
        <span class="token keyword">const</span> prefix <span class="token operator">=</span> <span class="token template-string"><span class="token template-punctuation string">&#96;</span><span class="token string">const CSS_FILES = </span><span class="token interpolation"><span class="token interpolation-punctuation punctuation">$&#123;</span><span class="token known-class-name class-name">JSON</span><span class="token punctuation">.</span><span class="token method function property-access">stringify</span><span class="token punctuation">(</span><span class="token keyword">this</span><span class="token punctuation">.</span><span class="token property-access">manifest</span><span class="token punctuation">)</span><span class="token interpolation-punctuation punctuation">&#125;</span></span><span class="token string">;</span><span class="token template-punctuation string">&#96;</span></span><span class="token punctuation">;</span>
        <span class="token keyword">return</span> <span class="token keyword">new</span> <span class="token class-name">ConcatSource</span><span class="token punctuation">(</span>prefix<span class="token punctuation">,</span> source<span class="token punctuation">)</span><span class="token punctuation">;</span>
        <span class="token comment">// highlight-end</span>
      <span class="token punctuation">&#125;</span><span class="token punctuation">)</span><span class="token punctuation">;</span>
    <span class="token punctuation">&#125;</span><span class="token punctuation">)</span><span class="token punctuation">;</span>
  <span class="token punctuation">&#125;</span>
<span class="token punctuation">&#125;</span></code>` + "";

	let t107;
	let p20;
	let t108;
	let t109;
	let pre12;

	let raw12_value = `
<code class="language-js"><span class="token comment">// filename: bundle.js</span>
<span class="token keyword">const</span> <span class="token constant">CSS_FILES</span> <span class="token operator">=</span> <span class="token keyword nil">undefined</span><span class="token punctuation">;</span>
<span class="token comment">// ...continue with bundle.js</span></code>` + "";

	let t110;
	let p21;
	let t111;
	let a20;
	let t112;
	let t113;
	let t114;
	let p22;
	let t115;
	let a21;
	let t116;
	let t117;
	let t118;
	let ul4;
	let li8;
	let t119;
	let t120;
	let li9;
	let t121;
	let t122;
	let li10;
	let t123;
	let t124;
	let li11;
	let t125;
	let t126;
	let li12;
	let t127;
	let t128;
	let li13;
	let t129;
	let t130;
	let li14;
	let t131;
	let t132;
	let li15;
	let t133;
	let t134;
	let p23;
	let t135;
	let a22;
	let t136;
	let code13;
	let t137;
	let t138;
	let t139;
	let code14;
	let t140;
	let t141;
	let code15;
	let t142;
	let t143;
	let code16;
	let t144;
	let t145;
	let t146;
	let pre13;

	let raw13_value = `
<code class="language-js"><span class="token operator">-</span> <span class="token function">thisCompliation</span> <span class="token punctuation">(</span><span class="token keyword">this</span><span class="token punctuation">.</span><span class="token property-access">manifest</span> <span class="token operator">==</span> <span class="token keyword nil">undefined</span><span class="token punctuation">;</span><span class="token punctuation">)</span>
<span class="token operator">-</span> <span class="token comment">// ...</span>
<span class="token operator">-</span> <span class="token function">emit</span> <span class="token punctuation">(</span><span class="token keyword">this</span><span class="token punctuation">.</span><span class="token property-access">manifest</span> <span class="token operator">=</span> manifest<span class="token punctuation">)</span> <span class="token comment">// too late!</span></code>` + "";

	let t147;
	let p24;
	let t148;
	let code17;
	let t149;
	let t150;
	let code18;
	let t151;
	let t152;
	let code19;
	let t153;
	let t154;
	let t155;
	let pre14;

	let raw14_value = `
<code class="language-js"><span class="token keyword">const</span> <span class="token maybe-class-name">ManifestPlugin</span> <span class="token operator">=</span> <span class="token function">require</span><span class="token punctuation">(</span><span class="token string">'webpack-manifest-plugin'</span><span class="token punctuation">)</span><span class="token punctuation">;</span>

<span class="token keyword">class</span> <span class="token class-name">MyWebpackPlugin</span> <span class="token punctuation">&#123;</span>
  <span class="token function">apply</span><span class="token punctuation">(</span><span class="token parameter">compiler</span><span class="token punctuation">)</span> <span class="token punctuation">&#123;</span>
    <span class="token keyword">new</span> <span class="token class-name">ManifestPlugin</span><span class="token punctuation">(</span>manifestOptions<span class="token punctuation">)</span><span class="token punctuation">.</span><span class="token method function property-access">apply</span><span class="token punctuation">(</span>compiler<span class="token punctuation">)</span><span class="token punctuation">;</span>
    <span class="token comment">// get manifest from &#96;webpack-manifest-plugin&#96;</span>
    <span class="token maybe-class-name">ManifestPlugin</span><span class="token punctuation">.</span><span class="token method function property-access">getCompilerHooks</span><span class="token punctuation">(</span>compiler<span class="token punctuation">)</span><span class="token punctuation">.</span><span class="token property-access">afterEmit</span><span class="token punctuation">.</span><span class="token method function property-access">tap</span><span class="token punctuation">(</span>
      <span class="token string">'MyWebpackPlugin'</span><span class="token punctuation">,</span>
      <span class="token parameter">manifest</span> <span class="token arrow operator">=></span> <span class="token punctuation">&#123;</span>
        <span class="token keyword">this</span><span class="token punctuation">.</span><span class="token property-access">manifest</span> <span class="token operator">=</span> manifest<span class="token punctuation">;</span>
      <span class="token punctuation">&#125;</span>
    <span class="token punctuation">)</span><span class="token punctuation">;</span>
    compiler<span class="token punctuation">.</span><span class="token property-access">hooks</span><span class="token punctuation">.</span><span class="token property-access">emit</span><span class="token punctuation">.</span><span class="token method function property-access">tap</span><span class="token punctuation">(</span><span class="token string">'MyWebpackPlugin'</span><span class="token punctuation">,</span> <span class="token parameter">compilation</span> <span class="token arrow operator">=></span> <span class="token punctuation">&#123;</span>
      <span class="token keyword">const</span> prefix <span class="token operator">=</span> <span class="token template-string"><span class="token template-punctuation string">&#96;</span><span class="token string">const CSS_FILES = </span><span class="token interpolation"><span class="token interpolation-punctuation punctuation">$&#123;</span><span class="token known-class-name class-name">JSON</span><span class="token punctuation">.</span><span class="token method function property-access">stringify</span><span class="token punctuation">(</span><span class="token keyword">this</span><span class="token punctuation">.</span><span class="token property-access">manifest</span><span class="token punctuation">)</span><span class="token interpolation-punctuation punctuation">&#125;</span></span><span class="token string">;</span><span class="token template-punctuation string">&#96;</span></span><span class="token punctuation">;</span>

      <span class="token keyword">for</span> <span class="token punctuation">(</span><span class="token keyword">const</span> file <span class="token keyword">of</span> <span class="token known-class-name class-name">Object</span><span class="token punctuation">.</span><span class="token method function property-access">keys</span><span class="token punctuation">(</span>compilation<span class="token punctuation">.</span><span class="token property-access">assets</span><span class="token punctuation">)</span><span class="token punctuation">)</span> <span class="token punctuation">&#123;</span>
        <span class="token keyword">if</span> <span class="token punctuation">(</span><span class="token operator">!</span>file<span class="token punctuation">.</span><span class="token method function property-access">endsWith</span><span class="token punctuation">(</span><span class="token string">'.js'</span><span class="token punctuation">)</span><span class="token punctuation">)</span> <span class="token keyword">continue</span><span class="token punctuation">;</span>
        compilation<span class="token punctuation">.</span><span class="token property-access">assets</span><span class="token punctuation">[</span>file<span class="token punctuation">]</span> <span class="token operator">=</span> <span class="token keyword">new</span> <span class="token class-name">ConcatSource</span><span class="token punctuation">(</span>
          prefix<span class="token punctuation">,</span>
          compilation<span class="token punctuation">.</span><span class="token property-access">assets</span><span class="token punctuation">[</span>file<span class="token punctuation">]</span>
        <span class="token punctuation">)</span><span class="token punctuation">;</span>
      <span class="token punctuation">&#125;</span>
    <span class="token punctuation">&#125;</span><span class="token punctuation">)</span><span class="token punctuation">;</span>
  <span class="token punctuation">&#125;</span>
<span class="token punctuation">&#125;</span></code>` + "";

	let t156;
	let p25;
	let t157;
	let code20;
	let t158;
	let t159;
	let t160;
	let p26;
	let t161;
	let code21;
	let t162;
	let t163;
	let code22;
	let t164;
	let t165;
	let code23;
	let t166;
	let t167;
	let t168;
	let section5;
	let h31;
	let a23;
	let t169;
	let t170;
	let p27;
	let t171;
	let a24;
	let t172;
	let t173;
	let t174;
	let blockquote0;
	let p28;
	let t175;
	let t176;
	let a25;
	let t177;
	let t178;
	let section6;
	let h23;
	let a26;
	let t179;
	let t180;
	let p29;
	let t181;
	let a27;
	let code24;
	let t182;
	let t183;
	let em;
	let t184;
	let t185;
	let t186;
	let p30;
	let t187;
	let code25;
	let t188;
	let t189;
	let code26;
	let t190;
	let t191;
	let code27;
	let t192;
	let t193;
	let t194;
	let pre15;

	let raw15_value = `
<code class="language-js"><span class="token keyword">class</span> <span class="token class-name">MyWebpackPlugin</span> <span class="token punctuation">&#123;</span>
  <span class="token function">apply</span><span class="token punctuation">(</span><span class="token parameter">compiler</span><span class="token punctuation">)</span> <span class="token punctuation">&#123;</span>
    compiler<span class="token punctuation">.</span><span class="token property-access">hooks</span><span class="token punctuation">.</span><span class="token property-access">thisCompilation</span><span class="token punctuation">.</span><span class="token method function property-access">tap</span><span class="token punctuation">(</span><span class="token string">'MyWebpackPlugin'</span><span class="token punctuation">,</span> <span class="token parameter">compilation</span> <span class="token arrow operator">=></span> <span class="token punctuation">&#123;</span>
      compilation<span class="token punctuation">.</span><span class="token property-access">hooks</span><span class="token punctuation">.</span><span class="token property-access">needAdditionalPass</span><span class="token punctuation">.</span><span class="token method function property-access">tap</span><span class="token punctuation">(</span><span class="token string">'MyWebpackPlugin'</span><span class="token punctuation">,</span> <span class="token punctuation">(</span><span class="token punctuation">)</span> <span class="token arrow operator">=></span> <span class="token punctuation">&#123;</span>
        <span class="token keyword">return</span> <span class="token boolean">true</span><span class="token punctuation">;</span>
        <span class="token comment">// if it is always true, will lead to infinite loop!</span>
      <span class="token punctuation">&#125;</span><span class="token punctuation">)</span><span class="token punctuation">;</span>
    <span class="token punctuation">&#125;</span><span class="token punctuation">)</span><span class="token punctuation">;</span>
  <span class="token punctuation">&#125;</span>
<span class="token punctuation">&#125;</span></code>` + "";

	let t195;
	let pre16;

	let raw16_value = `
<code class="language-js"><span class="token operator">-</span> <span class="token function">thisCompliation</span> <span class="token punctuation">(</span><span class="token keyword">this</span><span class="token punctuation">.</span><span class="token property-access">manifest</span> <span class="token operator">==</span> <span class="token keyword nil">undefined</span><span class="token punctuation">;</span><span class="token punctuation">)</span>
<span class="token operator">-</span> <span class="token comment">// ...</span>
<span class="token operator">-</span> <span class="token function">emit</span> <span class="token punctuation">(</span><span class="token keyword">this</span><span class="token punctuation">.</span><span class="token property-access">manifest</span> <span class="token operator">=</span> manifest<span class="token punctuation">)</span> <span class="token comment">// too late!</span>
<span class="token operator">-</span> <span class="token comment">// ...</span>
<span class="token operator">-</span> <span class="token function">needAddtionalPass</span> <span class="token punctuation">(</span><span class="token keyword">return</span> <span class="token boolean">true</span><span class="token punctuation">)</span> <span class="token comment">// to start the compilation again</span>
<span class="token operator">-</span> <span class="token comment">// ...</span>
<span class="token operator">-</span> <span class="token function">thisCompilation</span> <span class="token punctuation">(</span><span class="token keyword">this</span><span class="token punctuation">.</span><span class="token property-access">manifest</span> <span class="token operator">==</span> manifest<span class="token punctuation">)</span> <span class="token comment">// now &#96;this.manifest&#96; is available</span>
<span class="token operator">-</span> <span class="token comment">// ... will continue run through every stages again</span>
<span class="token operator">-</span> <span class="token function">emit</span> <span class="token punctuation">(</span><span class="token keyword">this</span><span class="token punctuation">.</span><span class="token property-access">manifest</span> <span class="token operator">=</span> manifest<span class="token punctuation">)</span>
<span class="token operator">-</span> <span class="token comment">// ...</span></code>` + "";

	let t196;
	let p31;
	let t197;
	let code28;
	let t198;
	let t199;
	let t200;
	let p32;
	let t201;
	let code29;
	let t202;
	let t203;
	let code30;
	let t204;
	let t205;
	let t206;
	let p33;
	let t207;
	let a28;
	let t208;
	let code31;
	let t209;
	let t210;
	let code32;
	let t211;
	let t212;
	let code33;
	let t213;
	let t214;
	let t215;
	let p34;
	let t216;
	let a29;
	let strong1;
	let t217;
	let t218;
	let code34;
	let t219;
	let t220;
	let code35;
	let t221;
	let t222;
	let code36;
	let t223;
	let t224;
	let t225;
	let pre17;

	let raw17_value = `
<code class="language-js"><span class="token keyword">class</span> <span class="token class-name">MyWebpackPlugin</span> <span class="token punctuation">&#123;</span>
  <span class="token function">apply</span><span class="token punctuation">(</span><span class="token parameter">compiler</span><span class="token punctuation">)</span> <span class="token punctuation">&#123;</span>
    compiler<span class="token punctuation">.</span><span class="token property-access">hooks</span><span class="token punctuation">.</span><span class="token property-access">thisCompilation</span><span class="token punctuation">.</span><span class="token method function property-access">tap</span><span class="token punctuation">(</span>
      <span class="token string">'MyWebpackPlugin'</span><span class="token punctuation">,</span>
      <span class="token punctuation">(</span><span class="token parameter">compilation<span class="token punctuation">,</span> <span class="token punctuation">&#123;</span> normalModuleFactory <span class="token punctuation">&#125;</span></span><span class="token punctuation">)</span> <span class="token arrow operator">=></span> <span class="token punctuation">&#123;</span>
        normalModuleFactory<span class="token punctuation">.</span><span class="token property-access">hooks</span><span class="token punctuation">.</span><span class="token property-access">parser</span>
          <span class="token punctuation">.</span><span class="token method function property-access">for</span><span class="token punctuation">(</span><span class="token string">'javascript/auto'</span><span class="token punctuation">)</span>
          <span class="token punctuation">.</span><span class="token method function property-access">tap</span><span class="token punctuation">(</span><span class="token string">'MyWebpackPlugin'</span><span class="token punctuation">,</span> <span class="token parameter">parser</span> <span class="token arrow operator">=></span> <span class="token punctuation">&#123;</span>
            <span class="token comment">// highlight-start</span>
            parser<span class="token punctuation">.</span><span class="token property-access">hooks</span><span class="token punctuation">.</span><span class="token property-access">expression</span>
              <span class="token punctuation">.</span><span class="token method function property-access">for</span><span class="token punctuation">(</span><span class="token string">'CSS_FILES'</span><span class="token punctuation">)</span>
              <span class="token punctuation">.</span><span class="token method function property-access">tap</span><span class="token punctuation">(</span><span class="token string">'MyWebpackPlugin'</span><span class="token punctuation">,</span> <span class="token parameter">expr</span> <span class="token arrow operator">=></span> <span class="token punctuation">&#123;</span>
                <span class="token keyword">return</span> <span class="token maybe-class-name">ParserHelpers</span><span class="token punctuation">.</span><span class="token method function property-access">toConstantDependency</span><span class="token punctuation">(</span>
                  parser<span class="token punctuation">,</span>
                  <span class="token known-class-name class-name">JSON</span><span class="token punctuation">.</span><span class="token method function property-access">stringify</span><span class="token punctuation">(</span><span class="token keyword">this</span><span class="token punctuation">.</span><span class="token property-access">manifest</span><span class="token punctuation">)</span>
                <span class="token punctuation">)</span><span class="token punctuation">(</span>expr<span class="token punctuation">)</span><span class="token punctuation">;</span>
              <span class="token punctuation">&#125;</span><span class="token punctuation">)</span><span class="token punctuation">;</span>
            <span class="token comment">// highlight-end</span>
          <span class="token punctuation">&#125;</span><span class="token punctuation">)</span><span class="token punctuation">;</span>
      <span class="token punctuation">&#125;</span>
    <span class="token punctuation">)</span><span class="token punctuation">;</span>
  <span class="token punctuation">&#125;</span>
<span class="token punctuation">&#125;</span></code>` + "";

	let t226;
	let p35;
	let t227;
	let a30;
	let t228;
	let t229;
	let t230;
	let p36;
	let t231;
	let t232;
	let pre18;

	let raw18_value = `
<code class="language-js"><span class="token comment">// filename: bundle.js</span>
<span class="token comment">// ...</span>
app<span class="token punctuation">.</span><span class="token method function property-access">get</span><span class="token punctuation">(</span><span class="token string">'/'</span><span class="token punctuation">,</span> <span class="token punctuation">(</span><span class="token parameter">req<span class="token punctuation">,</span> res</span><span class="token punctuation">)</span> <span class="token arrow operator">=></span> <span class="token punctuation">&#123;</span>
  <span class="token comment">// ...</span>
  res<span class="token punctuation">.</span><span class="token method function property-access">json</span><span class="token punctuation">(</span><span class="token punctuation">&#123;</span>
    <span class="token comment">// replaced via parser hooks</span>
    <span class="token comment">// highlight-next-line</span>
    css<span class="token punctuation">:</span> <span class="token punctuation">[</span><span class="token string">'http://cdn/assets/style.xxx.css'</span><span class="token punctuation">]</span><span class="token punctuation">,</span>
    html<span class="token punctuation">:</span> htmlContent<span class="token punctuation">,</span>
  <span class="token punctuation">&#125;</span><span class="token punctuation">)</span><span class="token punctuation">;</span>
<span class="token punctuation">&#125;</span><span class="token punctuation">)</span><span class="token punctuation">;</span></code>` + "";

	let t233;
	let section7;
	let h24;
	let a31;
	let t234;
	let t235;
	let p37;
	let t236;
	let code37;
	let t237;
	let t238;
	let t239;
	let p38;
	let t240;
	let a32;
	let t241;
	let t242;
	let t243;
	let section8;
	let h32;
	let a33;
	let t244;
	let t245;
	let p39;
	let t246;
	let a34;
	let t247;
	let t248;
	let t249;
	let blockquote1;
	let p40;
	let t250;
	let a35;
	let t251;
	let t252;
	let a36;
	let t253;
	let t254;
	let a37;
	let t255;
	let t256;
	let a38;
	let t257;
	let t258;
	let a39;
	let t259;

	return {
		c() {
			section0 = element("section");
			ul3 = element("ul");
			li0 = element("li");
			a0 = element("a");
			t0 = text("The problem");
			li1 = element("li");
			a1 = element("a");
			t1 = text("The 1st approach");
			ul0 = element("ul");
			li2 = element("li");
			a2 = element("a");
			li3 = element("li");
			a3 = element("a");
			t2 = text("The 2nd approach");
			ul1 = element("ul");
			li4 = element("li");
			a4 = element("a");
			li5 = element("li");
			a5 = element("a");
			t3 = text("The 3rd approach");
			li6 = element("li");
			a6 = element("a");
			t4 = text("Closing Notes");
			ul2 = element("ul");
			li7 = element("li");
			a7 = element("a");
			t5 = space();
			p0 = element("p");
			t6 = text("Recently, I was working on a server-side rendering application, and encounter a scenario that I think it requires \"double compilation\" with webpack.");
			t7 = space();
			section1 = element("section");
			h20 = element("h2");
			a8 = element("a");
			t8 = text("The problem");
			t9 = space();
			p1 = element("p");
			t10 = text("I am not entirely sure I am doing it in the right approach, feel free to suggest or discuss it with me. The following will be about the problem I faced and how I worked on it.");
			t11 = space();
			p2 = element("p");
			t12 = text("The server-side rendering application that I worked on, has an endpoint that takes in request and respond with a partial HTML content and CSS files required for styling:");
			t13 = space();
			pre0 = element("pre");
			t14 = space();
			pre1 = element("pre");
			t15 = space();
			p3 = element("p");
			t16 = text("The application code itself uses ");
			a9 = element("a");
			t17 = text("Express");
			t18 = text(" and ");
			a10 = element("a");
			t19 = text("React");
			t20 = text(":");
			t21 = space();
			pre2 = element("pre");
			t22 = space();
			p4 = element("p");
			t23 = text("Now, the problem is, how do I get the list of CSS files?");
			t24 = space();
			p5 = element("p");
			t25 = text("The list of CSS files produced by the build is only available after I compile the application, but I need the information to be part of compiled code.");
			t26 = space();
			p6 = element("p");
			t27 = text("The compiled code being part of the compilation, needs to contain information of the compilation.");
			t28 = space();
			section2 = element("section");
			h21 = element("h2");
			a11 = element("a");
			t29 = text("The 1st approach");
			t30 = space();
			p7 = element("p");
			t31 = text("A naive solution at first is to use ");
			a12 = element("a");
			t32 = text("Webpack Manifest Plugin");
			t33 = text(" to get the compilation manifest, and in the code, import the manifest as json and consumes it:");
			t34 = space();
			pre3 = element("pre");
			t35 = space();
			p8 = element("p");
			t36 = text("Yet, the ");
			code0 = element("code");
			t37 = text("./dist/webpack-manifest.json");
			t38 = text(" is not available in the first place, before compiling the code.");
			t39 = space();
			p9 = element("p");
			t40 = text("Since the ");
			code1 = element("code");
			t41 = text("./dist/webpack-manifest.json");
			t42 = text(" can only be available after build, maybe we can import it during runtime, using ");
			a13 = element("a");
			strong0 = element("strong");
			t43 = text("non_webpack_require");
			t44 = text(". The difference between ");
			code2 = element("code");
			t45 = text("require");
			t46 = text(" and ");
			code3 = element("code");
			t47 = text("__non_webpack_require__");
			t48 = text(" is that the latter is webpack specific, which tells webpack to transform it to just pure ");
			code4 = element("code");
			t49 = text("require()");
			t50 = text(" expression, without bundling the required module:");
			t51 = space();
			pre4 = element("pre");
			t52 = space();
			p10 = element("p");
			t53 = text("If you scrutinize the code, you may wonder whether ");
			code5 = element("code");
			t54 = text("./dist/webpack-manifest.json");
			t55 = text(" is the correct relative path from the compiled code?");
			t56 = space();
			p11 = element("p");
			t57 = text("Probably ");
			code6 = element("code");
			t58 = text("./webpack-manifest.json");
			t59 = text(" would be more accurate, if our output folder looks like this:");
			t60 = space();
			pre5 = element("pre");
			t61 = space();
			p12 = element("p");
			t62 = text("One can safely argue that, the approach above works and let's move on the next task. But, curiosity drives me to seek deeper for a more \"elegant\" solution, where one don't need ");
			code7 = element("code");
			t63 = text("require('webpack-manifest.json')");
			t64 = text(" in runtime, but that information is compiled into the code.");
			t65 = space();
			section3 = element("section");
			h30 = element("h3");
			a14 = element("a");
			t66 = text("[Updated Feb 27, 2020]");
			t67 = space();
			p13 = element("p");
			t68 = text("Thanks to ");
			a15 = element("a");
			t69 = text("@wSokra");
			t70 = text("'s ");
			a16 = element("a");
			t71 = text("suggestion");
			t72 = text(", instead of using ");
			code8 = element("code");
			t73 = text("__non_webpack_require__()");
			t74 = text(", you can use a normal import and declaring the manifest file as an external:");
			t75 = space();
			pre6 = element("pre");
			t76 = space();
			pre7 = element("pre");
			t77 = space();
			p14 = element("p");
			t78 = text("What this output is something similar to the following:");
			t79 = space();
			pre8 = element("pre");
			t80 = space();
			p15 = element("p");
			t81 = text("The reason we are using the relative path ");
			code9 = element("code");
			t82 = text("./webpack-manifest.json");
			t83 = text(" is that we are assuming the output folder looks like this:");
			t84 = space();
			pre9 = element("pre");
			t85 = space();
			p16 = element("p");
			t86 = text("You can read more about webpack externals from ");
			a17 = element("a");
			t87 = text("the webpack documentation");
			t88 = text(".");
			t89 = space();
			section4 = element("section");
			h22 = element("h2");
			a18 = element("a");
			t90 = text("The 2nd approach");
			t91 = space();
			p17 = element("p");
			t92 = text("So, the next \"intuitive\" approach is to ");
			a19 = element("a");
			t93 = text("write a custom template plugin");
			t94 = text(", that adds the webpack manifest on top of the main bundle, an example of the output:");
			t95 = space();
			pre10 = element("pre");
			t96 = space();
			p18 = element("p");
			t97 = text("In the source code, I will use the global variable ");
			code10 = element("code");
			t98 = text("CSS_FILES");
			t99 = text(", and hopefully it will get defined by webpack, by adding ");
			code11 = element("code");
			t100 = text("const CSS_FILES = ...");
			t101 = text(" at the very top of the file.");
			t102 = space();
			p19 = element("p");
			t103 = text("And to be extra careful, I have to make sure also that there's no variable ");
			code12 = element("code");
			t104 = text("CSS_FILES");
			t105 = text(" declared between the global scope and the current scope the variable is being used.");
			t106 = space();
			pre11 = element("pre");
			t107 = space();
			p20 = element("p");
			t108 = text("Apparently, this does not work at all. The compiled output shows:");
			t109 = space();
			pre12 = element("pre");
			t110 = space();
			p21 = element("p");
			t111 = text("After tracing through the code, I realised that I was ignorant of the sequence of execution of the ");
			a20 = element("a");
			t112 = text("compiler hooks");
			t113 = text(".");
			t114 = space();
			p22 = element("p");
			t115 = text("In the ");
			a21 = element("a");
			t116 = text("docs for compiler hooks");
			t117 = text(", each hooks is executed in sequence:");
			t118 = space();
			ul4 = element("ul");
			li8 = element("li");
			t119 = text("...");
			t120 = space();
			li9 = element("li");
			t121 = text("run");
			t122 = space();
			li10 = element("li");
			t123 = text("...");
			t124 = space();
			li11 = element("li");
			t125 = text("thisCompilation");
			t126 = space();
			li12 = element("li");
			t127 = text("...");
			t128 = space();
			li13 = element("li");
			t129 = text("emit");
			t130 = space();
			li14 = element("li");
			t131 = text("afterEmit");
			t132 = space();
			li15 = element("li");
			t133 = text("...");
			t134 = space();
			p23 = element("p");
			t135 = text("The webpack manifest plugin executes mainly ");
			a22 = element("a");
			t136 = text("during the ");
			code13 = element("code");
			t137 = text("emit");
			t138 = text(" phase");
			t139 = text(", right before webpack writes all the assets into the output directory. And, we are modifying the template source in the ");
			code14 = element("code");
			t140 = text("thisCompilation");
			t141 = text(" phase, which is way before the ");
			code15 = element("code");
			t142 = text("emit");
			t143 = text(" phase. That's why ");
			code16 = element("code");
			t144 = text("this.manifest");
			t145 = text(" property is still undefined at the time of execution.");
			t146 = space();
			pre13 = element("pre");
			t147 = space();
			p24 = element("p");
			t148 = text("Upon reading the code fot he ");
			code17 = element("code");
			t149 = text("webpack-manifest-plugin");
			t150 = text(", I realised that during the ");
			code18 = element("code");
			t151 = text("emit");
			t152 = text(" phase, I can access to the ");
			code19 = element("code");
			t153 = text("compilation.assets");
			t154 = text(", and so, I could modifying the source for the assets during that time!");
			t155 = space();
			pre14 = element("pre");
			t156 = space();
			p25 = element("p");
			t157 = text("Apparently that works, but I wonder whether is it a good practice to modifying the source of an asset during the ");
			code20 = element("code");
			t158 = text("emit");
			t159 = text(" phase? 🤔");
			t160 = space();
			p26 = element("p");
			t161 = text("And, if you noticed, I need to append the ");
			code21 = element("code");
			t162 = text("const CSS_FILES = [...]");
			t163 = text(" to every file, that's because I have no idea in which file ");
			code22 = element("code");
			t164 = text("CSS_FILES");
			t165 = text(" is referenced. And because I declared it using ");
			code23 = element("code");
			t166 = text("const");
			t167 = text(", it only exists within the file's scope, so I have to redeclare it all the other files.");
			t168 = space();
			section5 = element("section");
			h31 = element("h3");
			a23 = element("a");
			t169 = text("[Updated Feb 27, 2020]");
			t170 = space();
			p27 = element("p");
			t171 = text("According to ");
			a24 = element("a");
			t172 = text("@evilebottnawi");
			t173 = text(" that this is not appropriate");
			t174 = space();
			blockquote0 = element("blockquote");
			p28 = element("p");
			t175 = text("A lot of plugin uses `compiler.hooks.emit` for emitting new assets, it is invalid. Ideally plugins should use `compilation.hooks.additionalAssets` for adding new assets.");
			t176 = text("— evilebottnawi (@evilebottnawi) ");
			a25 = element("a");
			t177 = text("February 20, 2020");
			t178 = space();
			section6 = element("section");
			h23 = element("h2");
			a26 = element("a");
			t179 = text("The 3rd approach");
			t180 = space();
			p29 = element("p");
			t181 = text("I was still not convinced that this is the best I could do, so I continued looking around webpack's doc. I found a particular compilation hooks, ");
			a27 = element("a");
			code24 = element("code");
			t182 = text("needAdditionalPass");
			t183 = text(", which seems useful. It says, ");
			em = element("em");
			t184 = text("\"Called to determine if an asset needs to be processed further after being emitted.\"");
			t185 = text(".");
			t186 = space();
			p30 = element("p");
			t187 = text("So, if I return ");
			code25 = element("code");
			t188 = text("true");
			t189 = text(" in the ");
			code26 = element("code");
			t190 = text("needAdditionalPass");
			t191 = text(", webpack will re");
			code27 = element("code");
			t192 = text("compile");
			t193 = text(" the asset again:");
			t194 = space();
			pre15 = element("pre");
			t195 = space();
			pre16 = element("pre");
			t196 = space();
			p31 = element("p");
			t197 = text("Note that using ");
			code28 = element("code");
			t198 = text("needAdditionalPass");
			t199 = text(" will cause the build time to roughly doubled!");
			t200 = space();
			p32 = element("p");
			t201 = text("You may argue that why do we need to rerun the ");
			code29 = element("code");
			t202 = text("compilation");
			t203 = text(" process again, isn't the end result can be equally achieved by modifying the assets source in the ");
			code30 = element("code");
			t204 = text("emit");
			t205 = text(" phase?");
			t206 = space();
			p33 = element("p");
			t207 = text("Well, that's because, I realised I could make use ");
			a28 = element("a");
			t208 = text("some of the code from the ");
			code31 = element("code");
			t209 = text("DefinePlugin");
			t210 = text(", which could replace the usage of ");
			code32 = element("code");
			t211 = text("CSS_FILES");
			t212 = text(" throughout the code. That way, I don't have to prefix every file with ");
			code33 = element("code");
			t213 = text("const CSS_FILES = ...");
			t214 = text(".");
			t215 = space();
			p34 = element("p");
			t216 = text("DefinePlugin uses something called ");
			a29 = element("a");
			strong1 = element("strong");
			t217 = text("JavaScriptParser Hooks");
			t218 = text(", which you can rename a variable through ");
			code34 = element("code");
			t219 = text("canRename");
			t220 = text(" and ");
			code35 = element("code");
			t221 = text("identifier");
			t222 = text(" hooks or replace an expression through the ");
			code36 = element("code");
			t223 = text("expression");
			t224 = text(" hook:");
			t225 = space();
			pre17 = element("pre");
			t226 = space();
			p35 = element("p");
			t227 = text("The complete code can be found in ");
			a30 = element("a");
			t228 = text("this gist");
			t229 = text(".");
			t230 = space();
			p36 = element("p");
			t231 = text("An example of the compiled output:");
			t232 = space();
			pre18 = element("pre");
			t233 = space();
			section7 = element("section");
			h24 = element("h2");
			a31 = element("a");
			t234 = text("Closing Notes");
			t235 = space();
			p37 = element("p");
			t236 = text("The compile output for the 3rd approach seemed to be better (more precise?) than the other, yet I am not entirely sure using a ");
			code37 = element("code");
			t237 = text("needAdditionalPass");
			t238 = text(" is the right way of going about it.");
			t239 = space();
			p38 = element("p");
			t240 = text("So, ");
			a32 = element("a");
			t241 = text("let me know");
			t242 = text(" if you have any thoughts or suggestions, yea?");
			t243 = space();
			section8 = element("section");
			h32 = element("h3");
			a33 = element("a");
			t244 = text("[Updated Feb 27, 2020]");
			t245 = space();
			p39 = element("p");
			t246 = text("You can read ");
			a34 = element("a");
			t247 = text("the discussions that's happening on Twitter");
			t248 = text(":");
			t249 = space();
			blockquote1 = element("blockquote");
			p40 = element("p");
			t250 = text("Need some suggestions and inputs from ");
			a35 = element("a");
			t251 = text("@webpack");
			t252 = text(" masters, I've written the problem and approaches that I've taken over here: ");
			a36 = element("a");
			t253 = text("https://t.co/gLsPG9Joeq");
			t254 = text(", still I'm not sure I am doing it right 🙈");
			a37 = element("a");
			t255 = text("@wSokra");
			t256 = space();
			a38 = element("a");
			t257 = text("@evilebottnawi");
			t258 = text("— Tan Li Hau (@lihautan) ");
			a39 = element("a");
			t259 = text("February 20, 2020");
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
			li0 = claim_element(ul3_nodes, "LI", {});
			var li0_nodes = children(li0);
			a0 = claim_element(li0_nodes, "A", { href: true });
			var a0_nodes = children(a0);
			t0 = claim_text(a0_nodes, "The problem");
			a0_nodes.forEach(detach);
			li0_nodes.forEach(detach);
			li1 = claim_element(ul3_nodes, "LI", {});
			var li1_nodes = children(li1);
			a1 = claim_element(li1_nodes, "A", { href: true });
			var a1_nodes = children(a1);
			t1 = claim_text(a1_nodes, "The 1st approach");
			a1_nodes.forEach(detach);
			li1_nodes.forEach(detach);
			ul0 = claim_element(ul3_nodes, "UL", {});
			var ul0_nodes = children(ul0);
			li2 = claim_element(ul0_nodes, "LI", {});
			var li2_nodes = children(li2);
			a2 = claim_element(li2_nodes, "A", { href: true });
			children(a2).forEach(detach);
			li2_nodes.forEach(detach);
			ul0_nodes.forEach(detach);
			li3 = claim_element(ul3_nodes, "LI", {});
			var li3_nodes = children(li3);
			a3 = claim_element(li3_nodes, "A", { href: true });
			var a3_nodes = children(a3);
			t2 = claim_text(a3_nodes, "The 2nd approach");
			a3_nodes.forEach(detach);
			li3_nodes.forEach(detach);
			ul1 = claim_element(ul3_nodes, "UL", {});
			var ul1_nodes = children(ul1);
			li4 = claim_element(ul1_nodes, "LI", {});
			var li4_nodes = children(li4);
			a4 = claim_element(li4_nodes, "A", { href: true });
			children(a4).forEach(detach);
			li4_nodes.forEach(detach);
			ul1_nodes.forEach(detach);
			li5 = claim_element(ul3_nodes, "LI", {});
			var li5_nodes = children(li5);
			a5 = claim_element(li5_nodes, "A", { href: true });
			var a5_nodes = children(a5);
			t3 = claim_text(a5_nodes, "The 3rd approach");
			a5_nodes.forEach(detach);
			li5_nodes.forEach(detach);
			li6 = claim_element(ul3_nodes, "LI", {});
			var li6_nodes = children(li6);
			a6 = claim_element(li6_nodes, "A", { href: true });
			var a6_nodes = children(a6);
			t4 = claim_text(a6_nodes, "Closing Notes");
			a6_nodes.forEach(detach);
			li6_nodes.forEach(detach);
			ul2 = claim_element(ul3_nodes, "UL", {});
			var ul2_nodes = children(ul2);
			li7 = claim_element(ul2_nodes, "LI", {});
			var li7_nodes = children(li7);
			a7 = claim_element(li7_nodes, "A", { href: true });
			children(a7).forEach(detach);
			li7_nodes.forEach(detach);
			ul2_nodes.forEach(detach);
			ul3_nodes.forEach(detach);
			section0_nodes.forEach(detach);
			t5 = claim_space(nodes);
			p0 = claim_element(nodes, "P", {});
			var p0_nodes = children(p0);
			t6 = claim_text(p0_nodes, "Recently, I was working on a server-side rendering application, and encounter a scenario that I think it requires \"double compilation\" with webpack.");
			p0_nodes.forEach(detach);
			t7 = claim_space(nodes);
			section1 = claim_element(nodes, "SECTION", {});
			var section1_nodes = children(section1);
			h20 = claim_element(section1_nodes, "H2", {});
			var h20_nodes = children(h20);
			a8 = claim_element(h20_nodes, "A", { href: true, id: true });
			var a8_nodes = children(a8);
			t8 = claim_text(a8_nodes, "The problem");
			a8_nodes.forEach(detach);
			h20_nodes.forEach(detach);
			t9 = claim_space(section1_nodes);
			p1 = claim_element(section1_nodes, "P", {});
			var p1_nodes = children(p1);
			t10 = claim_text(p1_nodes, "I am not entirely sure I am doing it in the right approach, feel free to suggest or discuss it with me. The following will be about the problem I faced and how I worked on it.");
			p1_nodes.forEach(detach);
			t11 = claim_space(section1_nodes);
			p2 = claim_element(section1_nodes, "P", {});
			var p2_nodes = children(p2);
			t12 = claim_text(p2_nodes, "The server-side rendering application that I worked on, has an endpoint that takes in request and respond with a partial HTML content and CSS files required for styling:");
			p2_nodes.forEach(detach);
			t13 = claim_space(section1_nodes);
			pre0 = claim_element(section1_nodes, "PRE", { class: true });
			var pre0_nodes = children(pre0);
			pre0_nodes.forEach(detach);
			t14 = claim_space(section1_nodes);
			pre1 = claim_element(section1_nodes, "PRE", { class: true });
			var pre1_nodes = children(pre1);
			pre1_nodes.forEach(detach);
			t15 = claim_space(section1_nodes);
			p3 = claim_element(section1_nodes, "P", {});
			var p3_nodes = children(p3);
			t16 = claim_text(p3_nodes, "The application code itself uses ");
			a9 = claim_element(p3_nodes, "A", { href: true, rel: true });
			var a9_nodes = children(a9);
			t17 = claim_text(a9_nodes, "Express");
			a9_nodes.forEach(detach);
			t18 = claim_text(p3_nodes, " and ");
			a10 = claim_element(p3_nodes, "A", { href: true, rel: true });
			var a10_nodes = children(a10);
			t19 = claim_text(a10_nodes, "React");
			a10_nodes.forEach(detach);
			t20 = claim_text(p3_nodes, ":");
			p3_nodes.forEach(detach);
			t21 = claim_space(section1_nodes);
			pre2 = claim_element(section1_nodes, "PRE", { class: true });
			var pre2_nodes = children(pre2);
			pre2_nodes.forEach(detach);
			t22 = claim_space(section1_nodes);
			p4 = claim_element(section1_nodes, "P", {});
			var p4_nodes = children(p4);
			t23 = claim_text(p4_nodes, "Now, the problem is, how do I get the list of CSS files?");
			p4_nodes.forEach(detach);
			t24 = claim_space(section1_nodes);
			p5 = claim_element(section1_nodes, "P", {});
			var p5_nodes = children(p5);
			t25 = claim_text(p5_nodes, "The list of CSS files produced by the build is only available after I compile the application, but I need the information to be part of compiled code.");
			p5_nodes.forEach(detach);
			t26 = claim_space(section1_nodes);
			p6 = claim_element(section1_nodes, "P", {});
			var p6_nodes = children(p6);
			t27 = claim_text(p6_nodes, "The compiled code being part of the compilation, needs to contain information of the compilation.");
			p6_nodes.forEach(detach);
			section1_nodes.forEach(detach);
			t28 = claim_space(nodes);
			section2 = claim_element(nodes, "SECTION", {});
			var section2_nodes = children(section2);
			h21 = claim_element(section2_nodes, "H2", {});
			var h21_nodes = children(h21);
			a11 = claim_element(h21_nodes, "A", { href: true, id: true });
			var a11_nodes = children(a11);
			t29 = claim_text(a11_nodes, "The 1st approach");
			a11_nodes.forEach(detach);
			h21_nodes.forEach(detach);
			t30 = claim_space(section2_nodes);
			p7 = claim_element(section2_nodes, "P", {});
			var p7_nodes = children(p7);
			t31 = claim_text(p7_nodes, "A naive solution at first is to use ");
			a12 = claim_element(p7_nodes, "A", { href: true, rel: true });
			var a12_nodes = children(a12);
			t32 = claim_text(a12_nodes, "Webpack Manifest Plugin");
			a12_nodes.forEach(detach);
			t33 = claim_text(p7_nodes, " to get the compilation manifest, and in the code, import the manifest as json and consumes it:");
			p7_nodes.forEach(detach);
			t34 = claim_space(section2_nodes);
			pre3 = claim_element(section2_nodes, "PRE", { class: true });
			var pre3_nodes = children(pre3);
			pre3_nodes.forEach(detach);
			t35 = claim_space(section2_nodes);
			p8 = claim_element(section2_nodes, "P", {});
			var p8_nodes = children(p8);
			t36 = claim_text(p8_nodes, "Yet, the ");
			code0 = claim_element(p8_nodes, "CODE", {});
			var code0_nodes = children(code0);
			t37 = claim_text(code0_nodes, "./dist/webpack-manifest.json");
			code0_nodes.forEach(detach);
			t38 = claim_text(p8_nodes, " is not available in the first place, before compiling the code.");
			p8_nodes.forEach(detach);
			t39 = claim_space(section2_nodes);
			p9 = claim_element(section2_nodes, "P", {});
			var p9_nodes = children(p9);
			t40 = claim_text(p9_nodes, "Since the ");
			code1 = claim_element(p9_nodes, "CODE", {});
			var code1_nodes = children(code1);
			t41 = claim_text(code1_nodes, "./dist/webpack-manifest.json");
			code1_nodes.forEach(detach);
			t42 = claim_text(p9_nodes, " can only be available after build, maybe we can import it during runtime, using ");
			a13 = claim_element(p9_nodes, "A", { href: true, rel: true });
			var a13_nodes = children(a13);
			strong0 = claim_element(a13_nodes, "STRONG", {});
			var strong0_nodes = children(strong0);
			t43 = claim_text(strong0_nodes, "non_webpack_require");
			strong0_nodes.forEach(detach);
			a13_nodes.forEach(detach);
			t44 = claim_text(p9_nodes, ". The difference between ");
			code2 = claim_element(p9_nodes, "CODE", {});
			var code2_nodes = children(code2);
			t45 = claim_text(code2_nodes, "require");
			code2_nodes.forEach(detach);
			t46 = claim_text(p9_nodes, " and ");
			code3 = claim_element(p9_nodes, "CODE", {});
			var code3_nodes = children(code3);
			t47 = claim_text(code3_nodes, "__non_webpack_require__");
			code3_nodes.forEach(detach);
			t48 = claim_text(p9_nodes, " is that the latter is webpack specific, which tells webpack to transform it to just pure ");
			code4 = claim_element(p9_nodes, "CODE", {});
			var code4_nodes = children(code4);
			t49 = claim_text(code4_nodes, "require()");
			code4_nodes.forEach(detach);
			t50 = claim_text(p9_nodes, " expression, without bundling the required module:");
			p9_nodes.forEach(detach);
			t51 = claim_space(section2_nodes);
			pre4 = claim_element(section2_nodes, "PRE", { class: true });
			var pre4_nodes = children(pre4);
			pre4_nodes.forEach(detach);
			t52 = claim_space(section2_nodes);
			p10 = claim_element(section2_nodes, "P", {});
			var p10_nodes = children(p10);
			t53 = claim_text(p10_nodes, "If you scrutinize the code, you may wonder whether ");
			code5 = claim_element(p10_nodes, "CODE", {});
			var code5_nodes = children(code5);
			t54 = claim_text(code5_nodes, "./dist/webpack-manifest.json");
			code5_nodes.forEach(detach);
			t55 = claim_text(p10_nodes, " is the correct relative path from the compiled code?");
			p10_nodes.forEach(detach);
			t56 = claim_space(section2_nodes);
			p11 = claim_element(section2_nodes, "P", {});
			var p11_nodes = children(p11);
			t57 = claim_text(p11_nodes, "Probably ");
			code6 = claim_element(p11_nodes, "CODE", {});
			var code6_nodes = children(code6);
			t58 = claim_text(code6_nodes, "./webpack-manifest.json");
			code6_nodes.forEach(detach);
			t59 = claim_text(p11_nodes, " would be more accurate, if our output folder looks like this:");
			p11_nodes.forEach(detach);
			t60 = claim_space(section2_nodes);
			pre5 = claim_element(section2_nodes, "PRE", { class: true });
			var pre5_nodes = children(pre5);
			pre5_nodes.forEach(detach);
			t61 = claim_space(section2_nodes);
			p12 = claim_element(section2_nodes, "P", {});
			var p12_nodes = children(p12);
			t62 = claim_text(p12_nodes, "One can safely argue that, the approach above works and let's move on the next task. But, curiosity drives me to seek deeper for a more \"elegant\" solution, where one don't need ");
			code7 = claim_element(p12_nodes, "CODE", {});
			var code7_nodes = children(code7);
			t63 = claim_text(code7_nodes, "require('webpack-manifest.json')");
			code7_nodes.forEach(detach);
			t64 = claim_text(p12_nodes, " in runtime, but that information is compiled into the code.");
			p12_nodes.forEach(detach);
			section2_nodes.forEach(detach);
			t65 = claim_space(nodes);
			section3 = claim_element(nodes, "SECTION", {});
			var section3_nodes = children(section3);
			h30 = claim_element(section3_nodes, "H3", {});
			var h30_nodes = children(h30);
			a14 = claim_element(h30_nodes, "A", { href: true, id: true });
			var a14_nodes = children(a14);
			t66 = claim_text(a14_nodes, "[Updated Feb 27, 2020]");
			a14_nodes.forEach(detach);
			h30_nodes.forEach(detach);
			t67 = claim_space(section3_nodes);
			p13 = claim_element(section3_nodes, "P", {});
			var p13_nodes = children(p13);
			t68 = claim_text(p13_nodes, "Thanks to ");
			a15 = claim_element(p13_nodes, "A", { href: true, rel: true });
			var a15_nodes = children(a15);
			t69 = claim_text(a15_nodes, "@wSokra");
			a15_nodes.forEach(detach);
			t70 = claim_text(p13_nodes, "'s ");
			a16 = claim_element(p13_nodes, "A", { href: true, rel: true });
			var a16_nodes = children(a16);
			t71 = claim_text(a16_nodes, "suggestion");
			a16_nodes.forEach(detach);
			t72 = claim_text(p13_nodes, ", instead of using ");
			code8 = claim_element(p13_nodes, "CODE", {});
			var code8_nodes = children(code8);
			t73 = claim_text(code8_nodes, "__non_webpack_require__()");
			code8_nodes.forEach(detach);
			t74 = claim_text(p13_nodes, ", you can use a normal import and declaring the manifest file as an external:");
			p13_nodes.forEach(detach);
			t75 = claim_space(section3_nodes);
			pre6 = claim_element(section3_nodes, "PRE", { class: true });
			var pre6_nodes = children(pre6);
			pre6_nodes.forEach(detach);
			t76 = claim_space(section3_nodes);
			pre7 = claim_element(section3_nodes, "PRE", { class: true });
			var pre7_nodes = children(pre7);
			pre7_nodes.forEach(detach);
			t77 = claim_space(section3_nodes);
			p14 = claim_element(section3_nodes, "P", {});
			var p14_nodes = children(p14);
			t78 = claim_text(p14_nodes, "What this output is something similar to the following:");
			p14_nodes.forEach(detach);
			t79 = claim_space(section3_nodes);
			pre8 = claim_element(section3_nodes, "PRE", { class: true });
			var pre8_nodes = children(pre8);
			pre8_nodes.forEach(detach);
			t80 = claim_space(section3_nodes);
			p15 = claim_element(section3_nodes, "P", {});
			var p15_nodes = children(p15);
			t81 = claim_text(p15_nodes, "The reason we are using the relative path ");
			code9 = claim_element(p15_nodes, "CODE", {});
			var code9_nodes = children(code9);
			t82 = claim_text(code9_nodes, "./webpack-manifest.json");
			code9_nodes.forEach(detach);
			t83 = claim_text(p15_nodes, " is that we are assuming the output folder looks like this:");
			p15_nodes.forEach(detach);
			t84 = claim_space(section3_nodes);
			pre9 = claim_element(section3_nodes, "PRE", { class: true });
			var pre9_nodes = children(pre9);
			pre9_nodes.forEach(detach);
			t85 = claim_space(section3_nodes);
			p16 = claim_element(section3_nodes, "P", {});
			var p16_nodes = children(p16);
			t86 = claim_text(p16_nodes, "You can read more about webpack externals from ");
			a17 = claim_element(p16_nodes, "A", { href: true, rel: true });
			var a17_nodes = children(a17);
			t87 = claim_text(a17_nodes, "the webpack documentation");
			a17_nodes.forEach(detach);
			t88 = claim_text(p16_nodes, ".");
			p16_nodes.forEach(detach);
			section3_nodes.forEach(detach);
			t89 = claim_space(nodes);
			section4 = claim_element(nodes, "SECTION", {});
			var section4_nodes = children(section4);
			h22 = claim_element(section4_nodes, "H2", {});
			var h22_nodes = children(h22);
			a18 = claim_element(h22_nodes, "A", { href: true, id: true });
			var a18_nodes = children(a18);
			t90 = claim_text(a18_nodes, "The 2nd approach");
			a18_nodes.forEach(detach);
			h22_nodes.forEach(detach);
			t91 = claim_space(section4_nodes);
			p17 = claim_element(section4_nodes, "P", {});
			var p17_nodes = children(p17);
			t92 = claim_text(p17_nodes, "So, the next \"intuitive\" approach is to ");
			a19 = claim_element(p17_nodes, "A", { href: true });
			var a19_nodes = children(a19);
			t93 = claim_text(a19_nodes, "write a custom template plugin");
			a19_nodes.forEach(detach);
			t94 = claim_text(p17_nodes, ", that adds the webpack manifest on top of the main bundle, an example of the output:");
			p17_nodes.forEach(detach);
			t95 = claim_space(section4_nodes);
			pre10 = claim_element(section4_nodes, "PRE", { class: true });
			var pre10_nodes = children(pre10);
			pre10_nodes.forEach(detach);
			t96 = claim_space(section4_nodes);
			p18 = claim_element(section4_nodes, "P", {});
			var p18_nodes = children(p18);
			t97 = claim_text(p18_nodes, "In the source code, I will use the global variable ");
			code10 = claim_element(p18_nodes, "CODE", {});
			var code10_nodes = children(code10);
			t98 = claim_text(code10_nodes, "CSS_FILES");
			code10_nodes.forEach(detach);
			t99 = claim_text(p18_nodes, ", and hopefully it will get defined by webpack, by adding ");
			code11 = claim_element(p18_nodes, "CODE", {});
			var code11_nodes = children(code11);
			t100 = claim_text(code11_nodes, "const CSS_FILES = ...");
			code11_nodes.forEach(detach);
			t101 = claim_text(p18_nodes, " at the very top of the file.");
			p18_nodes.forEach(detach);
			t102 = claim_space(section4_nodes);
			p19 = claim_element(section4_nodes, "P", {});
			var p19_nodes = children(p19);
			t103 = claim_text(p19_nodes, "And to be extra careful, I have to make sure also that there's no variable ");
			code12 = claim_element(p19_nodes, "CODE", {});
			var code12_nodes = children(code12);
			t104 = claim_text(code12_nodes, "CSS_FILES");
			code12_nodes.forEach(detach);
			t105 = claim_text(p19_nodes, " declared between the global scope and the current scope the variable is being used.");
			p19_nodes.forEach(detach);
			t106 = claim_space(section4_nodes);
			pre11 = claim_element(section4_nodes, "PRE", { class: true });
			var pre11_nodes = children(pre11);
			pre11_nodes.forEach(detach);
			t107 = claim_space(section4_nodes);
			p20 = claim_element(section4_nodes, "P", {});
			var p20_nodes = children(p20);
			t108 = claim_text(p20_nodes, "Apparently, this does not work at all. The compiled output shows:");
			p20_nodes.forEach(detach);
			t109 = claim_space(section4_nodes);
			pre12 = claim_element(section4_nodes, "PRE", { class: true });
			var pre12_nodes = children(pre12);
			pre12_nodes.forEach(detach);
			t110 = claim_space(section4_nodes);
			p21 = claim_element(section4_nodes, "P", {});
			var p21_nodes = children(p21);
			t111 = claim_text(p21_nodes, "After tracing through the code, I realised that I was ignorant of the sequence of execution of the ");
			a20 = claim_element(p21_nodes, "A", { href: true, rel: true });
			var a20_nodes = children(a20);
			t112 = claim_text(a20_nodes, "compiler hooks");
			a20_nodes.forEach(detach);
			t113 = claim_text(p21_nodes, ".");
			p21_nodes.forEach(detach);
			t114 = claim_space(section4_nodes);
			p22 = claim_element(section4_nodes, "P", {});
			var p22_nodes = children(p22);
			t115 = claim_text(p22_nodes, "In the ");
			a21 = claim_element(p22_nodes, "A", { href: true, rel: true });
			var a21_nodes = children(a21);
			t116 = claim_text(a21_nodes, "docs for compiler hooks");
			a21_nodes.forEach(detach);
			t117 = claim_text(p22_nodes, ", each hooks is executed in sequence:");
			p22_nodes.forEach(detach);
			t118 = claim_space(section4_nodes);
			ul4 = claim_element(section4_nodes, "UL", {});
			var ul4_nodes = children(ul4);
			li8 = claim_element(ul4_nodes, "LI", {});
			var li8_nodes = children(li8);
			t119 = claim_text(li8_nodes, "...");
			li8_nodes.forEach(detach);
			t120 = claim_space(ul4_nodes);
			li9 = claim_element(ul4_nodes, "LI", {});
			var li9_nodes = children(li9);
			t121 = claim_text(li9_nodes, "run");
			li9_nodes.forEach(detach);
			t122 = claim_space(ul4_nodes);
			li10 = claim_element(ul4_nodes, "LI", {});
			var li10_nodes = children(li10);
			t123 = claim_text(li10_nodes, "...");
			li10_nodes.forEach(detach);
			t124 = claim_space(ul4_nodes);
			li11 = claim_element(ul4_nodes, "LI", {});
			var li11_nodes = children(li11);
			t125 = claim_text(li11_nodes, "thisCompilation");
			li11_nodes.forEach(detach);
			t126 = claim_space(ul4_nodes);
			li12 = claim_element(ul4_nodes, "LI", {});
			var li12_nodes = children(li12);
			t127 = claim_text(li12_nodes, "...");
			li12_nodes.forEach(detach);
			t128 = claim_space(ul4_nodes);
			li13 = claim_element(ul4_nodes, "LI", {});
			var li13_nodes = children(li13);
			t129 = claim_text(li13_nodes, "emit");
			li13_nodes.forEach(detach);
			t130 = claim_space(ul4_nodes);
			li14 = claim_element(ul4_nodes, "LI", {});
			var li14_nodes = children(li14);
			t131 = claim_text(li14_nodes, "afterEmit");
			li14_nodes.forEach(detach);
			t132 = claim_space(ul4_nodes);
			li15 = claim_element(ul4_nodes, "LI", {});
			var li15_nodes = children(li15);
			t133 = claim_text(li15_nodes, "...");
			li15_nodes.forEach(detach);
			ul4_nodes.forEach(detach);
			t134 = claim_space(section4_nodes);
			p23 = claim_element(section4_nodes, "P", {});
			var p23_nodes = children(p23);
			t135 = claim_text(p23_nodes, "The webpack manifest plugin executes mainly ");
			a22 = claim_element(p23_nodes, "A", { href: true, rel: true });
			var a22_nodes = children(a22);
			t136 = claim_text(a22_nodes, "during the ");
			code13 = claim_element(a22_nodes, "CODE", {});
			var code13_nodes = children(code13);
			t137 = claim_text(code13_nodes, "emit");
			code13_nodes.forEach(detach);
			t138 = claim_text(a22_nodes, " phase");
			a22_nodes.forEach(detach);
			t139 = claim_text(p23_nodes, ", right before webpack writes all the assets into the output directory. And, we are modifying the template source in the ");
			code14 = claim_element(p23_nodes, "CODE", {});
			var code14_nodes = children(code14);
			t140 = claim_text(code14_nodes, "thisCompilation");
			code14_nodes.forEach(detach);
			t141 = claim_text(p23_nodes, " phase, which is way before the ");
			code15 = claim_element(p23_nodes, "CODE", {});
			var code15_nodes = children(code15);
			t142 = claim_text(code15_nodes, "emit");
			code15_nodes.forEach(detach);
			t143 = claim_text(p23_nodes, " phase. That's why ");
			code16 = claim_element(p23_nodes, "CODE", {});
			var code16_nodes = children(code16);
			t144 = claim_text(code16_nodes, "this.manifest");
			code16_nodes.forEach(detach);
			t145 = claim_text(p23_nodes, " property is still undefined at the time of execution.");
			p23_nodes.forEach(detach);
			t146 = claim_space(section4_nodes);
			pre13 = claim_element(section4_nodes, "PRE", { class: true });
			var pre13_nodes = children(pre13);
			pre13_nodes.forEach(detach);
			t147 = claim_space(section4_nodes);
			p24 = claim_element(section4_nodes, "P", {});
			var p24_nodes = children(p24);
			t148 = claim_text(p24_nodes, "Upon reading the code fot he ");
			code17 = claim_element(p24_nodes, "CODE", {});
			var code17_nodes = children(code17);
			t149 = claim_text(code17_nodes, "webpack-manifest-plugin");
			code17_nodes.forEach(detach);
			t150 = claim_text(p24_nodes, ", I realised that during the ");
			code18 = claim_element(p24_nodes, "CODE", {});
			var code18_nodes = children(code18);
			t151 = claim_text(code18_nodes, "emit");
			code18_nodes.forEach(detach);
			t152 = claim_text(p24_nodes, " phase, I can access to the ");
			code19 = claim_element(p24_nodes, "CODE", {});
			var code19_nodes = children(code19);
			t153 = claim_text(code19_nodes, "compilation.assets");
			code19_nodes.forEach(detach);
			t154 = claim_text(p24_nodes, ", and so, I could modifying the source for the assets during that time!");
			p24_nodes.forEach(detach);
			t155 = claim_space(section4_nodes);
			pre14 = claim_element(section4_nodes, "PRE", { class: true });
			var pre14_nodes = children(pre14);
			pre14_nodes.forEach(detach);
			t156 = claim_space(section4_nodes);
			p25 = claim_element(section4_nodes, "P", {});
			var p25_nodes = children(p25);
			t157 = claim_text(p25_nodes, "Apparently that works, but I wonder whether is it a good practice to modifying the source of an asset during the ");
			code20 = claim_element(p25_nodes, "CODE", {});
			var code20_nodes = children(code20);
			t158 = claim_text(code20_nodes, "emit");
			code20_nodes.forEach(detach);
			t159 = claim_text(p25_nodes, " phase? 🤔");
			p25_nodes.forEach(detach);
			t160 = claim_space(section4_nodes);
			p26 = claim_element(section4_nodes, "P", {});
			var p26_nodes = children(p26);
			t161 = claim_text(p26_nodes, "And, if you noticed, I need to append the ");
			code21 = claim_element(p26_nodes, "CODE", {});
			var code21_nodes = children(code21);
			t162 = claim_text(code21_nodes, "const CSS_FILES = [...]");
			code21_nodes.forEach(detach);
			t163 = claim_text(p26_nodes, " to every file, that's because I have no idea in which file ");
			code22 = claim_element(p26_nodes, "CODE", {});
			var code22_nodes = children(code22);
			t164 = claim_text(code22_nodes, "CSS_FILES");
			code22_nodes.forEach(detach);
			t165 = claim_text(p26_nodes, " is referenced. And because I declared it using ");
			code23 = claim_element(p26_nodes, "CODE", {});
			var code23_nodes = children(code23);
			t166 = claim_text(code23_nodes, "const");
			code23_nodes.forEach(detach);
			t167 = claim_text(p26_nodes, ", it only exists within the file's scope, so I have to redeclare it all the other files.");
			p26_nodes.forEach(detach);
			section4_nodes.forEach(detach);
			t168 = claim_space(nodes);
			section5 = claim_element(nodes, "SECTION", {});
			var section5_nodes = children(section5);
			h31 = claim_element(section5_nodes, "H3", {});
			var h31_nodes = children(h31);
			a23 = claim_element(h31_nodes, "A", { href: true, id: true });
			var a23_nodes = children(a23);
			t169 = claim_text(a23_nodes, "[Updated Feb 27, 2020]");
			a23_nodes.forEach(detach);
			h31_nodes.forEach(detach);
			t170 = claim_space(section5_nodes);
			p27 = claim_element(section5_nodes, "P", {});
			var p27_nodes = children(p27);
			t171 = claim_text(p27_nodes, "According to ");
			a24 = claim_element(p27_nodes, "A", { href: true, rel: true });
			var a24_nodes = children(a24);
			t172 = claim_text(a24_nodes, "@evilebottnawi");
			a24_nodes.forEach(detach);
			t173 = claim_text(p27_nodes, " that this is not appropriate");
			p27_nodes.forEach(detach);
			t174 = claim_space(section5_nodes);
			blockquote0 = claim_element(section5_nodes, "BLOCKQUOTE", { class: true });
			var blockquote0_nodes = children(blockquote0);
			p28 = claim_element(blockquote0_nodes, "P", { lang: true, dir: true });
			var p28_nodes = children(p28);
			t175 = claim_text(p28_nodes, "A lot of plugin uses `compiler.hooks.emit` for emitting new assets, it is invalid. Ideally plugins should use `compilation.hooks.additionalAssets` for adding new assets.");
			p28_nodes.forEach(detach);
			t176 = claim_text(blockquote0_nodes, "— evilebottnawi (@evilebottnawi) ");
			a25 = claim_element(blockquote0_nodes, "A", { href: true });
			var a25_nodes = children(a25);
			t177 = claim_text(a25_nodes, "February 20, 2020");
			a25_nodes.forEach(detach);
			blockquote0_nodes.forEach(detach);
			section5_nodes.forEach(detach);
			t178 = claim_space(nodes);
			section6 = claim_element(nodes, "SECTION", {});
			var section6_nodes = children(section6);
			h23 = claim_element(section6_nodes, "H2", {});
			var h23_nodes = children(h23);
			a26 = claim_element(h23_nodes, "A", { href: true, id: true });
			var a26_nodes = children(a26);
			t179 = claim_text(a26_nodes, "The 3rd approach");
			a26_nodes.forEach(detach);
			h23_nodes.forEach(detach);
			t180 = claim_space(section6_nodes);
			p29 = claim_element(section6_nodes, "P", {});
			var p29_nodes = children(p29);
			t181 = claim_text(p29_nodes, "I was still not convinced that this is the best I could do, so I continued looking around webpack's doc. I found a particular compilation hooks, ");
			a27 = claim_element(p29_nodes, "A", { href: true, rel: true });
			var a27_nodes = children(a27);
			code24 = claim_element(a27_nodes, "CODE", {});
			var code24_nodes = children(code24);
			t182 = claim_text(code24_nodes, "needAdditionalPass");
			code24_nodes.forEach(detach);
			a27_nodes.forEach(detach);
			t183 = claim_text(p29_nodes, ", which seems useful. It says, ");
			em = claim_element(p29_nodes, "EM", {});
			var em_nodes = children(em);
			t184 = claim_text(em_nodes, "\"Called to determine if an asset needs to be processed further after being emitted.\"");
			em_nodes.forEach(detach);
			t185 = claim_text(p29_nodes, ".");
			p29_nodes.forEach(detach);
			t186 = claim_space(section6_nodes);
			p30 = claim_element(section6_nodes, "P", {});
			var p30_nodes = children(p30);
			t187 = claim_text(p30_nodes, "So, if I return ");
			code25 = claim_element(p30_nodes, "CODE", {});
			var code25_nodes = children(code25);
			t188 = claim_text(code25_nodes, "true");
			code25_nodes.forEach(detach);
			t189 = claim_text(p30_nodes, " in the ");
			code26 = claim_element(p30_nodes, "CODE", {});
			var code26_nodes = children(code26);
			t190 = claim_text(code26_nodes, "needAdditionalPass");
			code26_nodes.forEach(detach);
			t191 = claim_text(p30_nodes, ", webpack will re");
			code27 = claim_element(p30_nodes, "CODE", {});
			var code27_nodes = children(code27);
			t192 = claim_text(code27_nodes, "compile");
			code27_nodes.forEach(detach);
			t193 = claim_text(p30_nodes, " the asset again:");
			p30_nodes.forEach(detach);
			t194 = claim_space(section6_nodes);
			pre15 = claim_element(section6_nodes, "PRE", { class: true });
			var pre15_nodes = children(pre15);
			pre15_nodes.forEach(detach);
			t195 = claim_space(section6_nodes);
			pre16 = claim_element(section6_nodes, "PRE", { class: true });
			var pre16_nodes = children(pre16);
			pre16_nodes.forEach(detach);
			t196 = claim_space(section6_nodes);
			p31 = claim_element(section6_nodes, "P", {});
			var p31_nodes = children(p31);
			t197 = claim_text(p31_nodes, "Note that using ");
			code28 = claim_element(p31_nodes, "CODE", {});
			var code28_nodes = children(code28);
			t198 = claim_text(code28_nodes, "needAdditionalPass");
			code28_nodes.forEach(detach);
			t199 = claim_text(p31_nodes, " will cause the build time to roughly doubled!");
			p31_nodes.forEach(detach);
			t200 = claim_space(section6_nodes);
			p32 = claim_element(section6_nodes, "P", {});
			var p32_nodes = children(p32);
			t201 = claim_text(p32_nodes, "You may argue that why do we need to rerun the ");
			code29 = claim_element(p32_nodes, "CODE", {});
			var code29_nodes = children(code29);
			t202 = claim_text(code29_nodes, "compilation");
			code29_nodes.forEach(detach);
			t203 = claim_text(p32_nodes, " process again, isn't the end result can be equally achieved by modifying the assets source in the ");
			code30 = claim_element(p32_nodes, "CODE", {});
			var code30_nodes = children(code30);
			t204 = claim_text(code30_nodes, "emit");
			code30_nodes.forEach(detach);
			t205 = claim_text(p32_nodes, " phase?");
			p32_nodes.forEach(detach);
			t206 = claim_space(section6_nodes);
			p33 = claim_element(section6_nodes, "P", {});
			var p33_nodes = children(p33);
			t207 = claim_text(p33_nodes, "Well, that's because, I realised I could make use ");
			a28 = claim_element(p33_nodes, "A", { href: true, rel: true });
			var a28_nodes = children(a28);
			t208 = claim_text(a28_nodes, "some of the code from the ");
			code31 = claim_element(a28_nodes, "CODE", {});
			var code31_nodes = children(code31);
			t209 = claim_text(code31_nodes, "DefinePlugin");
			code31_nodes.forEach(detach);
			a28_nodes.forEach(detach);
			t210 = claim_text(p33_nodes, ", which could replace the usage of ");
			code32 = claim_element(p33_nodes, "CODE", {});
			var code32_nodes = children(code32);
			t211 = claim_text(code32_nodes, "CSS_FILES");
			code32_nodes.forEach(detach);
			t212 = claim_text(p33_nodes, " throughout the code. That way, I don't have to prefix every file with ");
			code33 = claim_element(p33_nodes, "CODE", {});
			var code33_nodes = children(code33);
			t213 = claim_text(code33_nodes, "const CSS_FILES = ...");
			code33_nodes.forEach(detach);
			t214 = claim_text(p33_nodes, ".");
			p33_nodes.forEach(detach);
			t215 = claim_space(section6_nodes);
			p34 = claim_element(section6_nodes, "P", {});
			var p34_nodes = children(p34);
			t216 = claim_text(p34_nodes, "DefinePlugin uses something called ");
			a29 = claim_element(p34_nodes, "A", { href: true, rel: true });
			var a29_nodes = children(a29);
			strong1 = claim_element(a29_nodes, "STRONG", {});
			var strong1_nodes = children(strong1);
			t217 = claim_text(strong1_nodes, "JavaScriptParser Hooks");
			strong1_nodes.forEach(detach);
			a29_nodes.forEach(detach);
			t218 = claim_text(p34_nodes, ", which you can rename a variable through ");
			code34 = claim_element(p34_nodes, "CODE", {});
			var code34_nodes = children(code34);
			t219 = claim_text(code34_nodes, "canRename");
			code34_nodes.forEach(detach);
			t220 = claim_text(p34_nodes, " and ");
			code35 = claim_element(p34_nodes, "CODE", {});
			var code35_nodes = children(code35);
			t221 = claim_text(code35_nodes, "identifier");
			code35_nodes.forEach(detach);
			t222 = claim_text(p34_nodes, " hooks or replace an expression through the ");
			code36 = claim_element(p34_nodes, "CODE", {});
			var code36_nodes = children(code36);
			t223 = claim_text(code36_nodes, "expression");
			code36_nodes.forEach(detach);
			t224 = claim_text(p34_nodes, " hook:");
			p34_nodes.forEach(detach);
			t225 = claim_space(section6_nodes);
			pre17 = claim_element(section6_nodes, "PRE", { class: true });
			var pre17_nodes = children(pre17);
			pre17_nodes.forEach(detach);
			t226 = claim_space(section6_nodes);
			p35 = claim_element(section6_nodes, "P", {});
			var p35_nodes = children(p35);
			t227 = claim_text(p35_nodes, "The complete code can be found in ");
			a30 = claim_element(p35_nodes, "A", { href: true, rel: true });
			var a30_nodes = children(a30);
			t228 = claim_text(a30_nodes, "this gist");
			a30_nodes.forEach(detach);
			t229 = claim_text(p35_nodes, ".");
			p35_nodes.forEach(detach);
			t230 = claim_space(section6_nodes);
			p36 = claim_element(section6_nodes, "P", {});
			var p36_nodes = children(p36);
			t231 = claim_text(p36_nodes, "An example of the compiled output:");
			p36_nodes.forEach(detach);
			t232 = claim_space(section6_nodes);
			pre18 = claim_element(section6_nodes, "PRE", { class: true });
			var pre18_nodes = children(pre18);
			pre18_nodes.forEach(detach);
			section6_nodes.forEach(detach);
			t233 = claim_space(nodes);
			section7 = claim_element(nodes, "SECTION", {});
			var section7_nodes = children(section7);
			h24 = claim_element(section7_nodes, "H2", {});
			var h24_nodes = children(h24);
			a31 = claim_element(h24_nodes, "A", { href: true, id: true });
			var a31_nodes = children(a31);
			t234 = claim_text(a31_nodes, "Closing Notes");
			a31_nodes.forEach(detach);
			h24_nodes.forEach(detach);
			t235 = claim_space(section7_nodes);
			p37 = claim_element(section7_nodes, "P", {});
			var p37_nodes = children(p37);
			t236 = claim_text(p37_nodes, "The compile output for the 3rd approach seemed to be better (more precise?) than the other, yet I am not entirely sure using a ");
			code37 = claim_element(p37_nodes, "CODE", {});
			var code37_nodes = children(code37);
			t237 = claim_text(code37_nodes, "needAdditionalPass");
			code37_nodes.forEach(detach);
			t238 = claim_text(p37_nodes, " is the right way of going about it.");
			p37_nodes.forEach(detach);
			t239 = claim_space(section7_nodes);
			p38 = claim_element(section7_nodes, "P", {});
			var p38_nodes = children(p38);
			t240 = claim_text(p38_nodes, "So, ");
			a32 = claim_element(p38_nodes, "A", { href: true, rel: true });
			var a32_nodes = children(a32);
			t241 = claim_text(a32_nodes, "let me know");
			a32_nodes.forEach(detach);
			t242 = claim_text(p38_nodes, " if you have any thoughts or suggestions, yea?");
			p38_nodes.forEach(detach);
			section7_nodes.forEach(detach);
			t243 = claim_space(nodes);
			section8 = claim_element(nodes, "SECTION", {});
			var section8_nodes = children(section8);
			h32 = claim_element(section8_nodes, "H3", {});
			var h32_nodes = children(h32);
			a33 = claim_element(h32_nodes, "A", { href: true, id: true });
			var a33_nodes = children(a33);
			t244 = claim_text(a33_nodes, "[Updated Feb 27, 2020]");
			a33_nodes.forEach(detach);
			h32_nodes.forEach(detach);
			t245 = claim_space(section8_nodes);
			p39 = claim_element(section8_nodes, "P", {});
			var p39_nodes = children(p39);
			t246 = claim_text(p39_nodes, "You can read ");
			a34 = claim_element(p39_nodes, "A", { href: true, rel: true });
			var a34_nodes = children(a34);
			t247 = claim_text(a34_nodes, "the discussions that's happening on Twitter");
			a34_nodes.forEach(detach);
			t248 = claim_text(p39_nodes, ":");
			p39_nodes.forEach(detach);
			t249 = claim_space(section8_nodes);
			blockquote1 = claim_element(section8_nodes, "BLOCKQUOTE", { class: true });
			var blockquote1_nodes = children(blockquote1);
			p40 = claim_element(blockquote1_nodes, "P", { lang: true, dir: true });
			var p40_nodes = children(p40);
			t250 = claim_text(p40_nodes, "Need some suggestions and inputs from ");
			a35 = claim_element(p40_nodes, "A", { href: true });
			var a35_nodes = children(a35);
			t251 = claim_text(a35_nodes, "@webpack");
			a35_nodes.forEach(detach);
			t252 = claim_text(p40_nodes, " masters, I've written the problem and approaches that I've taken over here: ");
			a36 = claim_element(p40_nodes, "A", { href: true });
			var a36_nodes = children(a36);
			t253 = claim_text(a36_nodes, "https://t.co/gLsPG9Joeq");
			a36_nodes.forEach(detach);
			t254 = claim_text(p40_nodes, ", still I'm not sure I am doing it right 🙈");
			a37 = claim_element(p40_nodes, "A", { href: true });
			var a37_nodes = children(a37);
			t255 = claim_text(a37_nodes, "@wSokra");
			a37_nodes.forEach(detach);
			t256 = claim_space(p40_nodes);
			a38 = claim_element(p40_nodes, "A", { href: true });
			var a38_nodes = children(a38);
			t257 = claim_text(a38_nodes, "@evilebottnawi");
			a38_nodes.forEach(detach);
			p40_nodes.forEach(detach);
			t258 = claim_text(blockquote1_nodes, "— Tan Li Hau (@lihautan) ");
			a39 = claim_element(blockquote1_nodes, "A", { href: true });
			var a39_nodes = children(a39);
			t259 = claim_text(a39_nodes, "February 20, 2020");
			a39_nodes.forEach(detach);
			blockquote1_nodes.forEach(detach);
			section8_nodes.forEach(detach);
			this.h();
		},
		h() {
			attr(a0, "href", "#the-problem");
			attr(a1, "href", "#the-st-approach");
			attr(a2, "href", "#");
			attr(a3, "href", "#the-nd-approach");
			attr(a4, "href", "#");
			attr(a5, "href", "#the-rd-approach");
			attr(a6, "href", "#closing-notes");
			attr(a7, "href", "#");
			attr(ul3, "class", "sitemap");
			attr(ul3, "id", "sitemap");
			attr(ul3, "role", "navigation");
			attr(ul3, "aria-label", "Table of Contents");
			attr(a8, "href", "#the-problem");
			attr(a8, "id", "the-problem");
			attr(pre0, "class", "language-json");
			attr(pre1, "class", "language-css");
			attr(a9, "href", "https://expressjs.com/");
			attr(a9, "rel", "nofollow");
			attr(a10, "href", "https://reactjs.org/");
			attr(a10, "rel", "nofollow");
			attr(pre2, "class", "language-js");
			attr(a11, "href", "#the-st-approach");
			attr(a11, "id", "the-st-approach");
			attr(a12, "href", "https://www.npmjs.com/package/webpack-manifest-plugin");
			attr(a12, "rel", "nofollow");
			attr(pre3, "class", "language-js");
			attr(a13, "href", "https://webpack.js.org/api/module-variables/#__non_webpack_require__-webpack-specific");
			attr(a13, "rel", "nofollow");
			attr(pre4, "class", "language-js");
			attr(pre5, "class", "language-null");
			attr(a14, "href", "#");
			attr(a14, "id", "");
			attr(a15, "href", "https://twitter.com/wSokra");
			attr(a15, "rel", "nofollow");
			attr(a16, "href", "https://twitter.com/wSokra/status/1230448421351444482");
			attr(a16, "rel", "nofollow");
			attr(pre6, "class", "language-js");
			attr(pre7, "class", "language-js");
			attr(pre8, "class", "language-js");
			attr(pre9, "class", "language-null");
			attr(a17, "href", "https://webpack.js.org/configuration/externals/");
			attr(a17, "rel", "nofollow");
			attr(a18, "href", "#the-nd-approach");
			attr(a18, "id", "the-nd-approach");
			attr(a19, "href", "/webpack-plugin-main-template");
			attr(pre10, "class", "language-js");
			attr(pre11, "class", "language-js");
			attr(pre12, "class", "language-js");
			attr(a20, "href", "https://webpack.js.org/api/compiler-hooks/");
			attr(a20, "rel", "nofollow");
			attr(a21, "href", "https://webpack.js.org/api/compiler-hooks/");
			attr(a21, "rel", "nofollow");
			attr(a22, "href", "https://github.com/danethurber/webpack-manifest-plugin/blob/63d3ee2/lib/plugin.js#L255");
			attr(a22, "rel", "nofollow");
			attr(pre13, "class", "language-js");
			attr(pre14, "class", "language-js");
			attr(a23, "href", "#");
			attr(a23, "id", "");
			attr(a24, "href", "https://twitter.com/evilebottnawi");
			attr(a24, "rel", "nofollow");
			attr(p28, "lang", "en");
			attr(p28, "dir", "ltr");
			attr(a25, "href", "https://twitter.com/evilebottnawi/status/1230417598677954560?ref_src=twsrc%5Etfw");
			attr(blockquote0, "class", "twitter-tweet");
			attr(a26, "href", "#the-rd-approach");
			attr(a26, "id", "the-rd-approach");
			attr(a27, "href", "https://webpack.js.org/api/compilation-hooks/#needadditionalpass");
			attr(a27, "rel", "nofollow");
			attr(pre15, "class", "language-js");
			attr(pre16, "class", "language-js");
			attr(a28, "href", "https://github.com/webpack/webpack/blob/d426b6c/lib/DefinePlugin.js");
			attr(a28, "rel", "nofollow");
			attr(a29, "href", "https://webpack.js.org/api/parser/");
			attr(a29, "rel", "nofollow");
			attr(pre17, "class", "language-js");
			attr(a30, "href", "https://gist.github.com/tanhauhau/2dc6cc376fd190e05d14901b984c7fc1");
			attr(a30, "rel", "nofollow");
			attr(pre18, "class", "language-js");
			attr(a31, "href", "#closing-notes");
			attr(a31, "id", "closing-notes");
			attr(a32, "href", "https://twitter.com/lihautan");
			attr(a32, "rel", "nofollow");
			attr(a33, "href", "#");
			attr(a33, "id", "");
			attr(a34, "href", "https://twitter.com/lihautan/status/1230301241533583360");
			attr(a34, "rel", "nofollow");
			attr(a35, "href", "https://twitter.com/webpack?ref_src=twsrc%5Etfw");
			attr(a36, "href", "https://t.co/gLsPG9Joeq");
			attr(a37, "href", "https://twitter.com/wSokra?ref_src=twsrc%5Etfw");
			attr(a38, "href", "https://twitter.com/evilebottnawi?ref_src=twsrc%5Etfw");
			attr(p40, "lang", "en");
			attr(p40, "dir", "ltr");
			attr(a39, "href", "https://twitter.com/lihautan/status/1230301241533583360?ref_src=twsrc%5Etfw");
			attr(blockquote1, "class", "twitter-tweet");
		},
		m(target, anchor) {
			insert(target, section0, anchor);
			append(section0, ul3);
			append(ul3, li0);
			append(li0, a0);
			append(a0, t0);
			append(ul3, li1);
			append(li1, a1);
			append(a1, t1);
			append(ul3, ul0);
			append(ul0, li2);
			append(li2, a2);
			append(ul3, li3);
			append(li3, a3);
			append(a3, t2);
			append(ul3, ul1);
			append(ul1, li4);
			append(li4, a4);
			append(ul3, li5);
			append(li5, a5);
			append(a5, t3);
			append(ul3, li6);
			append(li6, a6);
			append(a6, t4);
			append(ul3, ul2);
			append(ul2, li7);
			append(li7, a7);
			insert(target, t5, anchor);
			insert(target, p0, anchor);
			append(p0, t6);
			insert(target, t7, anchor);
			insert(target, section1, anchor);
			append(section1, h20);
			append(h20, a8);
			append(a8, t8);
			append(section1, t9);
			append(section1, p1);
			append(p1, t10);
			append(section1, t11);
			append(section1, p2);
			append(p2, t12);
			append(section1, t13);
			append(section1, pre0);
			pre0.innerHTML = raw0_value;
			append(section1, t14);
			append(section1, pre1);
			pre1.innerHTML = raw1_value;
			append(section1, t15);
			append(section1, p3);
			append(p3, t16);
			append(p3, a9);
			append(a9, t17);
			append(p3, t18);
			append(p3, a10);
			append(a10, t19);
			append(p3, t20);
			append(section1, t21);
			append(section1, pre2);
			pre2.innerHTML = raw2_value;
			append(section1, t22);
			append(section1, p4);
			append(p4, t23);
			append(section1, t24);
			append(section1, p5);
			append(p5, t25);
			append(section1, t26);
			append(section1, p6);
			append(p6, t27);
			insert(target, t28, anchor);
			insert(target, section2, anchor);
			append(section2, h21);
			append(h21, a11);
			append(a11, t29);
			append(section2, t30);
			append(section2, p7);
			append(p7, t31);
			append(p7, a12);
			append(a12, t32);
			append(p7, t33);
			append(section2, t34);
			append(section2, pre3);
			pre3.innerHTML = raw3_value;
			append(section2, t35);
			append(section2, p8);
			append(p8, t36);
			append(p8, code0);
			append(code0, t37);
			append(p8, t38);
			append(section2, t39);
			append(section2, p9);
			append(p9, t40);
			append(p9, code1);
			append(code1, t41);
			append(p9, t42);
			append(p9, a13);
			append(a13, strong0);
			append(strong0, t43);
			append(p9, t44);
			append(p9, code2);
			append(code2, t45);
			append(p9, t46);
			append(p9, code3);
			append(code3, t47);
			append(p9, t48);
			append(p9, code4);
			append(code4, t49);
			append(p9, t50);
			append(section2, t51);
			append(section2, pre4);
			pre4.innerHTML = raw4_value;
			append(section2, t52);
			append(section2, p10);
			append(p10, t53);
			append(p10, code5);
			append(code5, t54);
			append(p10, t55);
			append(section2, t56);
			append(section2, p11);
			append(p11, t57);
			append(p11, code6);
			append(code6, t58);
			append(p11, t59);
			append(section2, t60);
			append(section2, pre5);
			pre5.innerHTML = raw5_value;
			append(section2, t61);
			append(section2, p12);
			append(p12, t62);
			append(p12, code7);
			append(code7, t63);
			append(p12, t64);
			insert(target, t65, anchor);
			insert(target, section3, anchor);
			append(section3, h30);
			append(h30, a14);
			append(a14, t66);
			append(section3, t67);
			append(section3, p13);
			append(p13, t68);
			append(p13, a15);
			append(a15, t69);
			append(p13, t70);
			append(p13, a16);
			append(a16, t71);
			append(p13, t72);
			append(p13, code8);
			append(code8, t73);
			append(p13, t74);
			append(section3, t75);
			append(section3, pre6);
			pre6.innerHTML = raw6_value;
			append(section3, t76);
			append(section3, pre7);
			pre7.innerHTML = raw7_value;
			append(section3, t77);
			append(section3, p14);
			append(p14, t78);
			append(section3, t79);
			append(section3, pre8);
			pre8.innerHTML = raw8_value;
			append(section3, t80);
			append(section3, p15);
			append(p15, t81);
			append(p15, code9);
			append(code9, t82);
			append(p15, t83);
			append(section3, t84);
			append(section3, pre9);
			pre9.innerHTML = raw9_value;
			append(section3, t85);
			append(section3, p16);
			append(p16, t86);
			append(p16, a17);
			append(a17, t87);
			append(p16, t88);
			insert(target, t89, anchor);
			insert(target, section4, anchor);
			append(section4, h22);
			append(h22, a18);
			append(a18, t90);
			append(section4, t91);
			append(section4, p17);
			append(p17, t92);
			append(p17, a19);
			append(a19, t93);
			append(p17, t94);
			append(section4, t95);
			append(section4, pre10);
			pre10.innerHTML = raw10_value;
			append(section4, t96);
			append(section4, p18);
			append(p18, t97);
			append(p18, code10);
			append(code10, t98);
			append(p18, t99);
			append(p18, code11);
			append(code11, t100);
			append(p18, t101);
			append(section4, t102);
			append(section4, p19);
			append(p19, t103);
			append(p19, code12);
			append(code12, t104);
			append(p19, t105);
			append(section4, t106);
			append(section4, pre11);
			pre11.innerHTML = raw11_value;
			append(section4, t107);
			append(section4, p20);
			append(p20, t108);
			append(section4, t109);
			append(section4, pre12);
			pre12.innerHTML = raw12_value;
			append(section4, t110);
			append(section4, p21);
			append(p21, t111);
			append(p21, a20);
			append(a20, t112);
			append(p21, t113);
			append(section4, t114);
			append(section4, p22);
			append(p22, t115);
			append(p22, a21);
			append(a21, t116);
			append(p22, t117);
			append(section4, t118);
			append(section4, ul4);
			append(ul4, li8);
			append(li8, t119);
			append(ul4, t120);
			append(ul4, li9);
			append(li9, t121);
			append(ul4, t122);
			append(ul4, li10);
			append(li10, t123);
			append(ul4, t124);
			append(ul4, li11);
			append(li11, t125);
			append(ul4, t126);
			append(ul4, li12);
			append(li12, t127);
			append(ul4, t128);
			append(ul4, li13);
			append(li13, t129);
			append(ul4, t130);
			append(ul4, li14);
			append(li14, t131);
			append(ul4, t132);
			append(ul4, li15);
			append(li15, t133);
			append(section4, t134);
			append(section4, p23);
			append(p23, t135);
			append(p23, a22);
			append(a22, t136);
			append(a22, code13);
			append(code13, t137);
			append(a22, t138);
			append(p23, t139);
			append(p23, code14);
			append(code14, t140);
			append(p23, t141);
			append(p23, code15);
			append(code15, t142);
			append(p23, t143);
			append(p23, code16);
			append(code16, t144);
			append(p23, t145);
			append(section4, t146);
			append(section4, pre13);
			pre13.innerHTML = raw13_value;
			append(section4, t147);
			append(section4, p24);
			append(p24, t148);
			append(p24, code17);
			append(code17, t149);
			append(p24, t150);
			append(p24, code18);
			append(code18, t151);
			append(p24, t152);
			append(p24, code19);
			append(code19, t153);
			append(p24, t154);
			append(section4, t155);
			append(section4, pre14);
			pre14.innerHTML = raw14_value;
			append(section4, t156);
			append(section4, p25);
			append(p25, t157);
			append(p25, code20);
			append(code20, t158);
			append(p25, t159);
			append(section4, t160);
			append(section4, p26);
			append(p26, t161);
			append(p26, code21);
			append(code21, t162);
			append(p26, t163);
			append(p26, code22);
			append(code22, t164);
			append(p26, t165);
			append(p26, code23);
			append(code23, t166);
			append(p26, t167);
			insert(target, t168, anchor);
			insert(target, section5, anchor);
			append(section5, h31);
			append(h31, a23);
			append(a23, t169);
			append(section5, t170);
			append(section5, p27);
			append(p27, t171);
			append(p27, a24);
			append(a24, t172);
			append(p27, t173);
			append(section5, t174);
			append(section5, blockquote0);
			append(blockquote0, p28);
			append(p28, t175);
			append(blockquote0, t176);
			append(blockquote0, a25);
			append(a25, t177);
			insert(target, t178, anchor);
			insert(target, section6, anchor);
			append(section6, h23);
			append(h23, a26);
			append(a26, t179);
			append(section6, t180);
			append(section6, p29);
			append(p29, t181);
			append(p29, a27);
			append(a27, code24);
			append(code24, t182);
			append(p29, t183);
			append(p29, em);
			append(em, t184);
			append(p29, t185);
			append(section6, t186);
			append(section6, p30);
			append(p30, t187);
			append(p30, code25);
			append(code25, t188);
			append(p30, t189);
			append(p30, code26);
			append(code26, t190);
			append(p30, t191);
			append(p30, code27);
			append(code27, t192);
			append(p30, t193);
			append(section6, t194);
			append(section6, pre15);
			pre15.innerHTML = raw15_value;
			append(section6, t195);
			append(section6, pre16);
			pre16.innerHTML = raw16_value;
			append(section6, t196);
			append(section6, p31);
			append(p31, t197);
			append(p31, code28);
			append(code28, t198);
			append(p31, t199);
			append(section6, t200);
			append(section6, p32);
			append(p32, t201);
			append(p32, code29);
			append(code29, t202);
			append(p32, t203);
			append(p32, code30);
			append(code30, t204);
			append(p32, t205);
			append(section6, t206);
			append(section6, p33);
			append(p33, t207);
			append(p33, a28);
			append(a28, t208);
			append(a28, code31);
			append(code31, t209);
			append(p33, t210);
			append(p33, code32);
			append(code32, t211);
			append(p33, t212);
			append(p33, code33);
			append(code33, t213);
			append(p33, t214);
			append(section6, t215);
			append(section6, p34);
			append(p34, t216);
			append(p34, a29);
			append(a29, strong1);
			append(strong1, t217);
			append(p34, t218);
			append(p34, code34);
			append(code34, t219);
			append(p34, t220);
			append(p34, code35);
			append(code35, t221);
			append(p34, t222);
			append(p34, code36);
			append(code36, t223);
			append(p34, t224);
			append(section6, t225);
			append(section6, pre17);
			pre17.innerHTML = raw17_value;
			append(section6, t226);
			append(section6, p35);
			append(p35, t227);
			append(p35, a30);
			append(a30, t228);
			append(p35, t229);
			append(section6, t230);
			append(section6, p36);
			append(p36, t231);
			append(section6, t232);
			append(section6, pre18);
			pre18.innerHTML = raw18_value;
			insert(target, t233, anchor);
			insert(target, section7, anchor);
			append(section7, h24);
			append(h24, a31);
			append(a31, t234);
			append(section7, t235);
			append(section7, p37);
			append(p37, t236);
			append(p37, code37);
			append(code37, t237);
			append(p37, t238);
			append(section7, t239);
			append(section7, p38);
			append(p38, t240);
			append(p38, a32);
			append(a32, t241);
			append(p38, t242);
			insert(target, t243, anchor);
			insert(target, section8, anchor);
			append(section8, h32);
			append(h32, a33);
			append(a33, t244);
			append(section8, t245);
			append(section8, p39);
			append(p39, t246);
			append(p39, a34);
			append(a34, t247);
			append(p39, t248);
			append(section8, t249);
			append(section8, blockquote1);
			append(blockquote1, p40);
			append(p40, t250);
			append(p40, a35);
			append(a35, t251);
			append(p40, t252);
			append(p40, a36);
			append(a36, t253);
			append(p40, t254);
			append(p40, a37);
			append(a37, t255);
			append(p40, t256);
			append(p40, a38);
			append(a38, t257);
			append(blockquote1, t258);
			append(blockquote1, a39);
			append(a39, t259);
		},
		p: noop,
		d(detaching) {
			if (detaching) detach(section0);
			if (detaching) detach(t5);
			if (detaching) detach(p0);
			if (detaching) detach(t7);
			if (detaching) detach(section1);
			if (detaching) detach(t28);
			if (detaching) detach(section2);
			if (detaching) detach(t65);
			if (detaching) detach(section3);
			if (detaching) detach(t89);
			if (detaching) detach(section4);
			if (detaching) detach(t168);
			if (detaching) detach(section5);
			if (detaching) detach(t178);
			if (detaching) detach(section6);
			if (detaching) detach(t233);
			if (detaching) detach(section7);
			if (detaching) detach(t243);
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
	"title": "Webpack Additional Compilation Pass",
	"date": "2020-02-20T08:00:00Z",
	"lastUpdated": "2020-02-27T08:00:00Z",
	"slug": "webpack-additional-compilation-pass",
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
