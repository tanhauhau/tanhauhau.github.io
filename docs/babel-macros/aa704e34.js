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

			a6 = claim_element(li6_nodes, "A", {
				"aria-label": true,
				href: true,
				class: true
			});

			var a6_nodes = children(a6);
			svg0 = claim_element(a6_nodes, "svg", { viewBox: true, class: true }, 1);
			var svg0_nodes = children(svg0);
			path0 = claim_element(svg0_nodes, "path", { d: true }, 1);
			children(path0).forEach(detach);
			svg0_nodes.forEach(detach);
			a6_nodes.forEach(detach);
			t12 = claim_space(li6_nodes);

			a7 = claim_element(li6_nodes, "A", {
				"aria-label": true,
				href: true,
				class: true
			});

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
			attr(a6, "aria-label", "Twitter account");
			attr(a6, "href", "https://twitter.com/lihautan");
			attr(a6, "class", "svelte-f3e4uo");
			attr(path1, "d", "M9 19c-5 1.5-5-2.5-7-3m14 6v-3.87a3.37 3.37 0 0\n    0-.94-2.61c3.14-.35 6.44-1.54 6.44-7A5.44 5.44 0 0 0 20 4.77 5.07\n    5.07 0 0 0 19.91 1S18.73.65 16 2.48a13.38 13.38 0 0 0-7 0C6.27.65\n    5.09 1 5.09 1A5.07 5.07 0 0 0 5 4.77a5.44 5.44 0 0 0-1.5 3.78c0 5.42\n    3.3 6.61 6.44 7A3.37 3.37 0 0 0 9 18.13V22");
			attr(svg1, "viewBox", "0 0 24 24");
			attr(svg1, "class", "svelte-f3e4uo");
			attr(a7, "aria-label", "Github account");
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
				"aria-label": true,
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
			attr(input0, "aria-label", "email address");
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

var image = "https://lihautan.com/babel-macros/assets/hero-twitter-d84d5f7e.jpg";

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
					"@id": "https%3A%2F%2Flihautan.com%2Fbabel-macros",
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
			attr(meta11, "content", "https%3A%2F%2Flihautan.com%2Fbabel-macros");
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
							"@id": "https%3A%2F%2Flihautan.com%2Fbabel-macros",
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

/* content/blog/babel-macros/@@page-markup.svelte generated by Svelte v3.24.0 */

function create_default_slot(ctx) {
	let section0;
	let ul3;
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
	let li5;
	let a5;
	let t5;
	let li6;
	let a6;
	let t6;
	let ul1;
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
	let t12;
	let p0;
	let t13;
	let t14;
	let section1;
	let h20;
	let a12;
	let t15;
	let t16;
	let p1;
	let t17;
	let a13;
	let t18;
	let t19;
	let t20;
	let p2;
	let t21;
	let t22;
	let section2;
	let h30;
	let a14;
	let t23;
	let t24;
	let p3;
	let t25;
	let code0;
	let t26;
	let t27;
	let a15;
	let t28;
	let t29;
	let t30;
	let section3;
	let h31;
	let a16;
	let t31;
	let t32;
	let p4;
	let t33;
	let t34;
	let section4;
	let h32;
	let a17;
	let t35;
	let t36;
	let p5;
	let t37;
	let t38;
	let section5;
	let h33;
	let a18;
	let t39;
	let t40;
	let p6;
	let t41;
	let t42;
	let p7;
	let t43;
	let code1;
	let t44;
	let t45;
	let t46;
	let section6;
	let h21;
	let a19;
	let t47;
	let t48;
	let p8;
	let t49;
	let t50;
	let p9;
	let t51;
	let a20;
	let t52;
	let t53;
	let code2;
	let t54;
	let t55;
	let code3;
	let t56;
	let t57;
	let t58;
	let p10;
	let strong0;
	let t59;
	let t60;
	let pre0;

	let raw0_value = `
<code class="language-js"><span class="token keyword">const</span> firstFriend <span class="token operator">=</span>
  props<span class="token punctuation">.</span>user <span class="token operator">&amp;&amp;</span> props<span class="token punctuation">.</span>user<span class="token punctuation">.</span>friends <span class="token operator">&amp;&amp;</span> props<span class="token punctuation">.</span>user<span class="token punctuation">.</span>friends<span class="token punctuation">[</span><span class="token number">0</span><span class="token punctuation">]</span>
    <span class="token operator">?</span> props<span class="token punctuation">.</span>user<span class="token punctuation">.</span>friends<span class="token punctuation">[</span><span class="token number">0</span><span class="token punctuation">]</span><span class="token punctuation">.</span>friend
    <span class="token punctuation">:</span> <span class="token keyword">null</span><span class="token punctuation">;</span>

<span class="token comment">// or with ternary</span>
<span class="token keyword">const</span> firstFriend <span class="token operator">=</span> props
  <span class="token operator">?</span> props<span class="token punctuation">.</span>user
    <span class="token operator">?</span> props<span class="token punctuation">.</span>user<span class="token punctuation">.</span>friends
      <span class="token operator">?</span> props<span class="token punctuation">.</span>user<span class="token punctuation">.</span>friends
        <span class="token operator">?</span> props<span class="token punctuation">.</span>user<span class="token punctuation">.</span>friends<span class="token punctuation">[</span><span class="token number">0</span><span class="token punctuation">]</span>
          <span class="token operator">?</span> props<span class="token punctuation">.</span>user<span class="token punctuation">.</span>friends<span class="token punctuation">[</span><span class="token number">0</span><span class="token punctuation">]</span><span class="token punctuation">.</span>friend
          <span class="token punctuation">:</span> <span class="token keyword">null</span>
        <span class="token punctuation">:</span> <span class="token keyword">null</span>
      <span class="token punctuation">:</span> <span class="token keyword">null</span>
    <span class="token punctuation">:</span> <span class="token keyword">null</span>
  <span class="token punctuation">:</span> <span class="token keyword">null</span><span class="token punctuation">;</span></code>` + "";

	let t61;
	let p11;
	let strong1;
	let t62;
	let t63;
	let pre1;

	let raw1_value = `
<code class="language-js"><span class="token keyword">const</span> firstFriend <span class="token operator">=</span> <span class="token function">idx</span><span class="token punctuation">(</span>props<span class="token punctuation">,</span> <span class="token parameter">_</span> <span class="token operator">=></span> _<span class="token punctuation">.</span>user<span class="token punctuation">.</span>friends<span class="token punctuation">[</span><span class="token number">0</span><span class="token punctuation">]</span><span class="token punctuation">.</span>friend<span class="token punctuation">)</span><span class="token punctuation">;</span>

<span class="token keyword">function</span> <span class="token function">idx</span><span class="token punctuation">(</span><span class="token parameter">input<span class="token punctuation">,</span> accessor</span><span class="token punctuation">)</span> <span class="token punctuation">&#123;</span>
  <span class="token keyword">try</span> <span class="token punctuation">&#123;</span>
    <span class="token keyword">return</span> <span class="token function">accessor</span><span class="token punctuation">(</span>input<span class="token punctuation">)</span><span class="token punctuation">;</span>
  <span class="token punctuation">&#125;</span> <span class="token keyword">catch</span> <span class="token punctuation">(</span>e<span class="token punctuation">)</span> <span class="token punctuation">&#123;</span>
    <span class="token keyword">return</span> <span class="token keyword">null</span><span class="token punctuation">;</span>
  <span class="token punctuation">&#125;</span>
<span class="token punctuation">&#125;</span></code>` + "";

	let t64;
	let blockquote0;
	let b;
	let t65;
	let t66;
	let a21;
	let t67;
	let t68;
	let a22;
	let t69;
	let t70;
	let a23;
	let t71;
	let t72;
	let a24;
	let t73;
	let t74;
	let t75;
	let p12;
	let t76;
	let strong2;
	let t77;
	let t78;
	let p13;
	let t79;
	let a25;
	let code4;
	let t80;
	let t81;
	let a26;
	let t82;
	let t83;
	let code5;
	let t84;
	let t85;
	let t86;
	let pre2;

	let raw2_value = `
<code class="language-js"><span class="token keyword">import</span> idx <span class="token keyword">from</span> <span class="token string">'idx'</span><span class="token punctuation">;</span>

<span class="token keyword">function</span> <span class="token function">getFriends</span><span class="token punctuation">(</span><span class="token punctuation">)</span> <span class="token punctuation">&#123;</span>
  <span class="token keyword">return</span> <span class="token function">idx</span><span class="token punctuation">(</span>props<span class="token punctuation">,</span> <span class="token parameter">_</span> <span class="token operator">=></span> _<span class="token punctuation">.</span>user<span class="token punctuation">.</span>friends<span class="token punctuation">[</span><span class="token number">0</span><span class="token punctuation">]</span><span class="token punctuation">.</span>friends<span class="token punctuation">)</span><span class="token punctuation">;</span>
<span class="token punctuation">&#125;</span></code>` + "";

	let t87;
	let p14;
	let t88;
	let t89;
	let pre3;

	let raw3_value = `
<code class="language-js"><span class="token keyword">function</span> <span class="token function">getFriends</span><span class="token punctuation">(</span><span class="token punctuation">)</span> <span class="token punctuation">&#123;</span>
  <span class="token keyword">return</span> props<span class="token punctuation">.</span>user <span class="token operator">==</span> <span class="token keyword">null</span>
    <span class="token operator">?</span> props<span class="token punctuation">.</span>user
    <span class="token punctuation">:</span> props<span class="token punctuation">.</span>user<span class="token punctuation">.</span>friends <span class="token operator">==</span> <span class="token keyword">null</span>
    <span class="token operator">?</span> props<span class="token punctuation">.</span>user<span class="token punctuation">.</span>friends
    <span class="token punctuation">:</span> props<span class="token punctuation">.</span>user<span class="token punctuation">.</span>friends<span class="token punctuation">[</span><span class="token number">0</span><span class="token punctuation">]</span> <span class="token operator">==</span> <span class="token keyword">null</span>
    <span class="token operator">?</span> props<span class="token punctuation">.</span>user<span class="token punctuation">.</span>friends<span class="token punctuation">[</span><span class="token number">0</span><span class="token punctuation">]</span>
    <span class="token punctuation">:</span> props<span class="token punctuation">.</span>user<span class="token punctuation">.</span>friends<span class="token punctuation">[</span><span class="token number">0</span><span class="token punctuation">]</span><span class="token punctuation">.</span>friends<span class="token punctuation">;</span>
<span class="token punctuation">&#125;</span></code>` + "";

	let t90;
	let p15;
	let t91;
	let t92;
	let p16;
	let t93;
	let t94;
	let blockquote1;
	let p17;
	let t95;
	let t96;
	let p18;
	let t97;
	let em;
	let t98;
	let t99;
	let t100;
	let p19;
	let t101;
	let t102;
	let p20;
	let strong3;
	let t103;
	let t104;
	let p21;
	let t105;
	let a27;
	let t106;
	let t107;
	let t108;
	let p22;
	let t109;
	let strong4;
	let t110;
	let t111;
	let t112;
	let p23;
	let t113;
	let code6;
	let t114;
	let t115;
	let strong5;
	let t116;
	let t117;
	let t118;
	let p24;
	let t119;
	let strong6;
	let t120;
	let t121;
	let strong7;
	let t122;
	let t123;
	let t124;
	let p25;
	let strong8;
	let t125;
	let t126;
	let p26;
	let t127;
	let t128;
	let p27;
	let t129;
	let code7;
	let t130;
	let t131;
	let code8;
	let t132;
	let t133;
	let code9;
	let t134;
	let t135;
	let strong9;
	let t136;
	let t137;
	let code10;
	let t138;
	let t139;
	let code11;
	let t140;
	let t141;
	let code12;
	let t142;
	let t143;
	let t144;
	let p28;
	let t145;
	let code13;
	let t146;
	let t147;
	let strong10;
	let t148;
	let t149;
	let t150;
	let hr;
	let t151;
	let p29;
	let t152;
	let t153;
	let p30;
	let t154;
	let a28;
	let t155;
	let t156;
	let t157;
	let section7;
	let h22;
	let a29;
	let t158;
	let t159;
	let p31;
	let t160;
	let t161;
	let p32;
	let strong11;
	let t162;
	let code14;
	let t163;
	let t164;
	let t165;
	let p33;
	let t166;
	let t167;
	let pre4;

	let raw4_value = `
<code class="language-js"><span class="token comment">// filename: babel.config.js</span>
module<span class="token punctuation">.</span>exports <span class="token operator">=</span> <span class="token punctuation">&#123;</span>
  <span class="token comment">// highlight-next-line</span>
  plugins<span class="token punctuation">:</span> <span class="token punctuation">[</span><span class="token string">'babel-plugin-macros'</span><span class="token punctuation">]</span><span class="token punctuation">,</span>
<span class="token punctuation">&#125;</span><span class="token punctuation">;</span></code>` + "";

	let t168;
	let p34;
	let strong12;
	let t169;
	let t170;
	let pre5;

	let raw5_value = `
<code class="language-js"><span class="token comment">// filename: src/utils/idx.macro.js</span>

<span class="token keyword">const</span> <span class="token punctuation">&#123;</span> createMacro <span class="token punctuation">&#125;</span> <span class="token operator">=</span> <span class="token function">require</span><span class="token punctuation">(</span><span class="token string">'babel-plugin-macros'</span><span class="token punctuation">)</span><span class="token punctuation">;</span>
module<span class="token punctuation">.</span>exports <span class="token operator">=</span> <span class="token function">createMacro</span><span class="token punctuation">(</span><span class="token punctuation">(</span><span class="token parameter"><span class="token punctuation">&#123;</span> state<span class="token punctuation">,</span> references <span class="token punctuation">&#125;</span></span><span class="token punctuation">)</span> <span class="token operator">=></span> <span class="token punctuation">&#123;</span>
  references<span class="token punctuation">.</span>default<span class="token punctuation">.</span><span class="token function">forEach</span><span class="token punctuation">(</span><span class="token parameter">referencePath</span> <span class="token operator">=></span> <span class="token punctuation">&#123;</span>
    <span class="token function">idx_transform</span><span class="token punctuation">(</span>referencePath<span class="token punctuation">.</span>parentPath<span class="token punctuation">,</span> state<span class="token punctuation">)</span><span class="token punctuation">;</span>
  <span class="token punctuation">&#125;</span><span class="token punctuation">)</span><span class="token punctuation">;</span>
<span class="token punctuation">&#125;</span><span class="token punctuation">)</span><span class="token punctuation">;</span></code>` + "";

	let t171;
	let p35;
	let t172;
	let code15;
	let t173;
	let t174;
	let code16;
	let t175;
	let t176;
	let t177;
	let p36;
	let strong13;
	let t178;
	let t179;
	let pre6;

	let raw6_value = `
<code class="language-js"><span class="token comment">// filename: src/index.js</span>
<span class="token keyword">import</span> idx <span class="token keyword">from</span> <span class="token string">'./utils/idx.macro'</span><span class="token punctuation">;</span>

<span class="token keyword">function</span> <span class="token function">getFriends</span><span class="token punctuation">(</span><span class="token punctuation">)</span> <span class="token punctuation">&#123;</span>
  <span class="token keyword">return</span> <span class="token function">idx</span><span class="token punctuation">(</span>props<span class="token punctuation">,</span> <span class="token parameter">_</span> <span class="token operator">=></span> _<span class="token punctuation">.</span>user<span class="token punctuation">.</span>friends<span class="token punctuation">[</span><span class="token number">0</span><span class="token punctuation">]</span><span class="token punctuation">.</span>friends<span class="token punctuation">)</span><span class="token punctuation">;</span>
<span class="token punctuation">&#125;</span></code>` + "";

	let t180;
	let p37;
	let t181;
	let code17;
	let t182;
	let t183;
	let t184;
	let p38;
	let t185;
	let code18;
	let t186;
	let t187;
	let code19;
	let t188;
	let t189;
	let t190;
	let p39;
	let t191;
	let t192;
	let pre7;

	let raw7_value = `
<code class="language-js"><span class="token comment">// filename: src/index.js</span>
<span class="token keyword">import</span> idx <span class="token keyword">from</span> <span class="token string">'./utils/idx.macro'</span><span class="token punctuation">;</span>

<span class="token keyword">function</span> <span class="token function">getFriends</span><span class="token punctuation">(</span><span class="token punctuation">)</span> <span class="token punctuation">&#123;</span>
  <span class="token comment">// highlight-next-line</span>
  <span class="token keyword">return</span> <span class="token function">idx</span><span class="token punctuation">(</span>props<span class="token punctuation">,</span> <span class="token parameter">_</span> <span class="token operator">=></span> _<span class="token punctuation">.</span>user<span class="token punctuation">.</span>friends<span class="token punctuation">[</span><span class="token number">0</span><span class="token punctuation">]</span><span class="token punctuation">.</span>friends<span class="token punctuation">,</span> <span class="token punctuation">&#123;</span> strict<span class="token punctuation">:</span> <span class="token boolean">false</span> <span class="token punctuation">&#125;</span><span class="token punctuation">)</span><span class="token punctuation">;</span>
<span class="token punctuation">&#125;</span></code>` + "";

	let t193;
	let p40;
	let t194;
	let t195;
	let section8;
	let h34;
	let a30;
	let t196;
	let t197;
	let p41;
	let strong14;
	let t198;
	let t199;
	let a31;
	let code20;
	let t200;
	let t201;
	let t202;
	let p42;
	let t203;
	let code21;
	let t204;
	let t205;
	let code22;
	let t206;
	let t207;
	let code23;
	let t208;
	let t209;
	let code24;
	let t210;
	let t211;
	let code25;
	let t212;
	let t213;
	let t214;
	let p43;
	let t215;
	let t216;
	let p44;
	let t217;
	let t218;
	let p45;
	let t219;
	let t220;
	let section9;
	let h23;
	let a32;
	let t221;
	let t222;
	let p46;
	let a33;
	let t223;
	let t224;
	let a34;
	let t225;
	let t226;
	let t227;
	let p47;
	let t228;
	let t229;
	let p48;
	let t230;
	let a35;
	let t231;
	let t232;
	let t233;
	let section10;
	let h35;
	let a36;
	let t234;
	let t235;
	let p49;
	let strong15;
	let t236;
	let t237;
	let p50;
	let t238;
	let t239;
	let pre8;

	let raw8_value = `
<code class="language-js"><span class="token keyword">async</span> <span class="token keyword">function</span> <span class="token function">fetchUser</span><span class="token punctuation">(</span>
  <span class="token parameter">userId<span class="token punctuation">:</span> number</span>
<span class="token punctuation">)</span><span class="token punctuation">:</span> Response<span class="token operator">&lt;</span><span class="token punctuation">&#123;</span>
  id<span class="token punctuation">:</span> number<span class="token punctuation">,</span>
  username<span class="token punctuation">:</span> string<span class="token punctuation">,</span>
  email<span class="token punctuation">:</span> string<span class="token punctuation">,</span>
  address<span class="token punctuation">:</span> string<span class="token punctuation">,</span>
<span class="token punctuation">&#125;</span><span class="token operator">></span> <span class="token punctuation">&#123;</span><span class="token punctuation">&#125;</span></code>` + "";

	let t240;
	let p51;
	let t241;
	let t242;
	let pre9;

	let raw9_value = `
<code class="language-js"><span class="token keyword">async</span> <span class="token keyword">function</span> <span class="token function">fetchUser</span><span class="token punctuation">(</span><span class="token parameter">userId<span class="token punctuation">:</span> number</span><span class="token punctuation">)</span><span class="token punctuation">:</span> Response<span class="token operator">&lt;</span><span class="token punctuation">&#123;</span> <span class="token operator">...</span> <span class="token punctuation">&#125;</span><span class="token operator">></span> <span class="token punctuation">&#123;</span>
  <span class="token comment">// highlight-start</span>
  <span class="token keyword">return</span> <span class="token punctuation">&#123;</span>
    id<span class="token punctuation">:</span> <span class="token number">1</span><span class="token punctuation">,</span>
    username<span class="token punctuation">:</span> <span class="token string">'tanhauhau'</span><span class="token punctuation">,</span>
    email<span class="token punctuation">:</span> <span class="token string">'tanhauhau@foo.bar'</span><span class="token punctuation">,</span>
    address<span class="token punctuation">:</span> <span class="token string">'123 Bar Street, Foo'</span><span class="token punctuation">,</span>
  <span class="token punctuation">&#125;</span><span class="token punctuation">;</span>
  <span class="token comment">// highlight-end</span>
<span class="token punctuation">&#125;</span></code>` + "";

	let t243;
	let p52;
	let t244;
	let t245;
	let pre10;

	let raw10_value = `
<code class="language-js"><span class="token keyword">async</span> <span class="token keyword">function</span> <span class="token function">fetchUser</span><span class="token punctuation">(</span>
  <span class="token parameter">userId<span class="token punctuation">:</span> number</span>
<span class="token punctuation">)</span><span class="token punctuation">:</span> Response<span class="token operator">&lt;</span><span class="token punctuation">&#123;</span>
  id<span class="token punctuation">:</span> number<span class="token punctuation">,</span>
  username<span class="token punctuation">:</span> string<span class="token punctuation">,</span>
  email<span class="token punctuation">:</span> string<span class="token punctuation">,</span>
  address<span class="token punctuation">:</span> string<span class="token punctuation">,</span>
  <span class="token comment">// highlight-next-line</span>
  contact<span class="token punctuation">:</span> string<span class="token punctuation">,</span>
<span class="token punctuation">&#125;</span><span class="token operator">></span> <span class="token punctuation">&#123;</span>
  <span class="token keyword">return</span> <span class="token punctuation">&#123;</span>
    id<span class="token punctuation">:</span> <span class="token number">1</span><span class="token punctuation">,</span>
    username<span class="token punctuation">:</span> <span class="token string">'tanhauhau'</span><span class="token punctuation">,</span>
    email<span class="token punctuation">:</span> <span class="token string">'tanhauhau@foo.bar'</span><span class="token punctuation">,</span>
    address<span class="token punctuation">:</span> <span class="token string">'123 Bar Street, Foo'</span><span class="token punctuation">,</span>
    <span class="token comment">// highlight-next-line</span>
    contact<span class="token punctuation">:</span> <span class="token string">'0123456789'</span><span class="token punctuation">,</span>
  <span class="token punctuation">&#125;</span><span class="token punctuation">;</span>
<span class="token punctuation">&#125;</span></code>` + "";

	let t246;
	let p53;
	let t247;
	let a37;
	let t248;
	let t249;
	let a38;
	let t250;
	let t251;
	let a39;
	let t252;
	let t253;
	let t254;
	let p54;
	let t255;
	let t256;
	let pre11;

	let raw11_value = `
<code class="language-js"><span class="token keyword">import</span> type <span class="token punctuation">&#123;</span> MockResponse <span class="token punctuation">&#125;</span> <span class="token keyword">from</span> <span class="token string">'./mock.macro'</span><span class="token punctuation">;</span>

<span class="token keyword">async</span> <span class="token keyword">function</span> <span class="token function">fetchUser</span><span class="token punctuation">(</span>
  <span class="token parameter">userId<span class="token punctuation">:</span> number</span>
<span class="token punctuation">)</span><span class="token punctuation">:</span> MockResponse<span class="token operator">&lt;</span><span class="token punctuation">&#123;</span>
  id<span class="token punctuation">:</span> number<span class="token punctuation">,</span>
  username<span class="token punctuation">:</span> string<span class="token punctuation">,</span>
  email<span class="token punctuation">:</span> string<span class="token punctuation">,</span>
  address<span class="token punctuation">:</span> string<span class="token punctuation">,</span>
  contact<span class="token punctuation">:</span> string<span class="token punctuation">,</span>
<span class="token punctuation">&#125;</span><span class="token operator">></span> <span class="token punctuation">&#123;</span>
  <span class="token comment">// TODO:</span>
<span class="token punctuation">&#125;</span></code>` + "";

	let t257;
	let p55;
	let t258;
	let code26;
	let t259;
	let t260;
	let t261;
	let p56;
	let strong16;
	let t262;
	let t263;
	let p57;
	let t264;
	let a40;
	let t265;
	let t266;
	let t267;
	let p58;
	let t268;
	let code27;
	let t269;
	let t270;
	let t271;
	let pre12;

	let raw12_value = `
<code class="language-js"><span class="token comment">// filename: mock.macro.js</span>

<span class="token keyword">const</span> <span class="token punctuation">&#123;</span> createMacro <span class="token punctuation">&#125;</span> <span class="token operator">=</span> <span class="token function">require</span><span class="token punctuation">(</span><span class="token string">'babel-plugin-macros'</span><span class="token punctuation">)</span><span class="token punctuation">;</span>

module<span class="token punctuation">.</span>exports <span class="token operator">=</span> <span class="token function">createMacro</span><span class="token punctuation">(</span><span class="token keyword">function</span><span class="token punctuation">(</span><span class="token parameter"><span class="token punctuation">&#123;</span> references<span class="token punctuation">,</span> state<span class="token punctuation">,</span> babel <span class="token punctuation">&#125;</span></span><span class="token punctuation">)</span> <span class="token punctuation">&#123;</span>
  <span class="token comment">// TODO:</span>
<span class="token punctuation">&#125;</span><span class="token punctuation">)</span><span class="token punctuation">;</span></code>` + "";

	let t272;
	let p59;
	let code28;
	let t273;
	let t274;
	let t275;
	let ul4;
	let li12;
	let strong17;
	let t276;
	let t277;
	let p60;
	let t278;
	let t279;
	let p61;
	let t280;
	let t281;
	let pre13;

	let raw13_value = `
<code class="language-js"><span class="token keyword">import</span> foo<span class="token punctuation">,</span> <span class="token punctuation">&#123;</span> bar <span class="token punctuation">&#125;</span> <span class="token keyword">from</span> <span class="token string">'./foobar.macro'</span><span class="token punctuation">;</span></code>` + "";

	let t282;
	let p62;
	let t283;
	let code29;
	let t284;
	let t285;
	let code30;
	let t286;
	let t287;
	let t288;
	let pre14;

	let raw14_value = `
<code class="language-js"><span class="token punctuation">&#123;</span>
  <span class="token string">"default"</span><span class="token punctuation">:</span> <span class="token punctuation">[</span><span class="token punctuation">]</span><span class="token punctuation">,</span>
  <span class="token string">"bar"</span><span class="token punctuation">:</span> <span class="token punctuation">[</span><span class="token punctuation">]</span><span class="token punctuation">,</span>
<span class="token punctuation">&#125;</span></code>` + "";

	let t289;
	let p63;
	let t290;
	let t291;
	let pre15;

	let raw15_value = `
<code class="language-js"><span class="token keyword">import</span> foo <span class="token keyword">from</span> <span class="token string">'./foobar.macro.js'</span><span class="token punctuation">;</span>

<span class="token function">foo</span><span class="token punctuation">(</span><span class="token string">'a'</span><span class="token punctuation">)</span> <span class="token comment">// &lt;-- referenced &#96;foo&#96;</span>

<span class="token keyword">function</span> <span class="token function">bar</span><span class="token punctuation">(</span><span class="token punctuation">)</span> <span class="token punctuation">&#123;</span>
  <span class="token keyword">return</span> foo <span class="token operator">+</span> <span class="token number">1</span><span class="token punctuation">;</span> <span class="token comment">// &lt;-- referenced &#96;foo&#96;</span>
<span class="token punctuation">&#125;</span>

<span class="token keyword">function</span> <span class="token function">baz</span><span class="token punctuation">(</span><span class="token parameter">foo</span><span class="token punctuation">)</span> <span class="token punctuation">&#123;</span>
  <span class="token keyword">return</span> foo <span class="token operator">+</span> <span class="token number">1</span><span class="token punctuation">;</span> <span class="token comment">// &lt;-- not referencing &#96;foo&#96;</span>
<span class="token punctuation">&#125;</span>

<span class="token comment">// &#96;references&#96;:</span>
<span class="token punctuation">&#123;</span>
  <span class="token string">"default"</span><span class="token punctuation">:</span> <span class="token punctuation">[</span>
    Path<span class="token punctuation">,</span> <span class="token comment">// foo in foo('a')</span>
    Path<span class="token punctuation">,</span> <span class="token comment">// foo in foo + 1</span>
  <span class="token punctuation">]</span>
<span class="token punctuation">&#125;</span></code>` + "";

	let t292;
	let ul5;
	let li13;
	let strong18;
	let t293;
	let t294;
	let p64;
	let t295;
	let t296;
	let p65;
	let t297;
	let code31;
	let t298;
	let t299;
	let t300;
	let pre16;

	let raw16_value = `
<code class="language-js"><span class="token comment">// filename: mock.macro.js</span>
module<span class="token punctuation">.</span>exports <span class="token operator">=</span> <span class="token function">createMacro</span><span class="token punctuation">(</span><span class="token keyword">function</span><span class="token punctuation">(</span><span class="token parameter"><span class="token punctuation">&#123;</span> references<span class="token punctuation">,</span> state<span class="token punctuation">,</span> babel <span class="token punctuation">&#125;</span></span><span class="token punctuation">)</span> <span class="token punctuation">&#123;</span>
  <span class="token comment">// highlight-start</span>
  <span class="token keyword">if</span> <span class="token punctuation">(</span>references<span class="token punctuation">.</span>MockResponse<span class="token punctuation">.</span>length <span class="token operator">></span> <span class="token number">0</span><span class="token punctuation">)</span> <span class="token punctuation">&#123;</span>
    <span class="token comment">// TODO:</span>
  <span class="token punctuation">&#125;</span>
  <span class="token comment">// highlight-end</span>
<span class="token punctuation">&#125;</span><span class="token punctuation">)</span><span class="token punctuation">;</span></code>` + "";

	let t301;
	let p66;
	let t302;
	let t303;
	let pre17;

	let raw17_value = `
<code class="language-js"><span class="token keyword">import</span> faker <span class="token keyword">from</span> <span class="token string">'faker'</span><span class="token punctuation">;</span>

<span class="token keyword">async</span> <span class="token keyword">function</span> <span class="token function">fetchUser</span><span class="token punctuation">(</span><span class="token parameter">userId</span><span class="token punctuation">)</span> <span class="token punctuation">&#123;</span>
  <span class="token keyword">return</span> <span class="token punctuation">&#123;</span>
    id<span class="token punctuation">:</span> faker<span class="token punctuation">.</span>random<span class="token punctuation">.</span><span class="token function">number</span><span class="token punctuation">(</span><span class="token punctuation">)</span><span class="token punctuation">,</span>
    username<span class="token punctuation">:</span> faker<span class="token punctuation">.</span>random<span class="token punctuation">.</span><span class="token function">word</span><span class="token punctuation">(</span><span class="token punctuation">)</span><span class="token punctuation">,</span>
    email<span class="token punctuation">:</span> faker<span class="token punctuation">.</span>random<span class="token punctuation">.</span><span class="token function">word</span><span class="token punctuation">(</span><span class="token punctuation">)</span><span class="token punctuation">,</span>
    address<span class="token punctuation">:</span> faker<span class="token punctuation">.</span>random<span class="token punctuation">.</span><span class="token function">word</span><span class="token punctuation">(</span><span class="token punctuation">)</span><span class="token punctuation">,</span>
    contact<span class="token punctuation">:</span> faker<span class="token punctuation">.</span>random<span class="token punctuation">.</span><span class="token function">word</span><span class="token punctuation">(</span><span class="token punctuation">)</span><span class="token punctuation">,</span>
  <span class="token punctuation">&#125;</span><span class="token punctuation">;</span>
<span class="token punctuation">&#125;</span></code>` + "";

	let t304;
	let p67;
	let t305;
	let a41;
	let t306;
	let t307;
	let t308;
	let p68;
	let t309;
	let code32;
	let t310;
	let t311;
	let t312;
	let pre18;

	let raw18_value = `
<code class="language-js">module<span class="token punctuation">.</span>exports <span class="token operator">=</span> <span class="token function">createMacro</span><span class="token punctuation">(</span><span class="token keyword">function</span><span class="token punctuation">(</span><span class="token parameter"><span class="token punctuation">&#123;</span> references<span class="token punctuation">,</span> state<span class="token punctuation">,</span> babel <span class="token punctuation">&#125;</span></span><span class="token punctuation">)</span> <span class="token punctuation">&#123;</span>
  <span class="token keyword">if</span> <span class="token punctuation">(</span>references<span class="token punctuation">.</span>MockResponse<span class="token punctuation">.</span>length <span class="token operator">></span> <span class="token number">0</span><span class="token punctuation">)</span> <span class="token punctuation">&#123;</span>
    <span class="token comment">// highlight-start</span>
    <span class="token keyword">const</span> fakerIdentifier <span class="token operator">=</span> state<span class="token punctuation">.</span>file<span class="token punctuation">.</span>path<span class="token punctuation">.</span>scope<span class="token punctuation">.</span><span class="token function">generateUidIdentifier</span><span class="token punctuation">(</span>
      <span class="token string">'faker'</span>
    <span class="token punctuation">)</span><span class="token punctuation">;</span>
    <span class="token keyword">const</span> importStatement <span class="token operator">=</span> babel<span class="token punctuation">.</span><span class="token function">template</span><span class="token punctuation">(</span><span class="token string">"import %%FAKER%% from 'faker'"</span><span class="token punctuation">)</span><span class="token punctuation">(</span><span class="token punctuation">&#123;</span>
      <span class="token constant">FAKER</span><span class="token punctuation">:</span> fakerIdentifier<span class="token punctuation">,</span>
    <span class="token punctuation">&#125;</span><span class="token punctuation">)</span><span class="token punctuation">;</span>
    state<span class="token punctuation">.</span>file<span class="token punctuation">.</span>path<span class="token punctuation">.</span><span class="token function">unshiftContainer</span><span class="token punctuation">(</span><span class="token string">'body'</span><span class="token punctuation">,</span> importStatement<span class="token punctuation">)</span><span class="token punctuation">;</span>
    <span class="token comment">// highlight-end</span>
  <span class="token punctuation">&#125;</span>
<span class="token punctuation">&#125;</span><span class="token punctuation">)</span><span class="token punctuation">;</span></code>` + "";

	let t313;
	let p69;
	let t314;
	let code33;
	let t315;
	let t316;
	let code34;
	let t317;
	let t318;
	let code35;
	let t319;
	let t320;
	let t321;
	let pre19;

	let raw19_value = `
<code class="language-js">module<span class="token punctuation">.</span>exports <span class="token operator">=</span> <span class="token function">createMacro</span><span class="token punctuation">(</span><span class="token keyword">function</span><span class="token punctuation">(</span><span class="token parameter"><span class="token punctuation">&#123;</span> references<span class="token punctuation">,</span> state<span class="token punctuation">,</span> babel <span class="token punctuation">&#125;</span></span><span class="token punctuation">)</span> <span class="token punctuation">&#123;</span>
  <span class="token keyword">if</span> <span class="token punctuation">(</span>references<span class="token punctuation">.</span>MockResponse<span class="token punctuation">.</span>length <span class="token operator">></span> <span class="token number">0</span><span class="token punctuation">)</span> <span class="token punctuation">&#123;</span>
    <span class="token comment">// ... inserting &#96;import faker from 'faker'&#96;</span>

    <span class="token comment">// highlight-start</span>
    references<span class="token punctuation">.</span>MockResponse<span class="token punctuation">.</span><span class="token function">forEach</span><span class="token punctuation">(</span><span class="token parameter">reference</span> <span class="token operator">=></span> <span class="token punctuation">&#123;</span>
      <span class="token keyword">const</span> functionDeclaration <span class="token operator">=</span> reference<span class="token punctuation">.</span><span class="token function">getFunctionParent</span><span class="token punctuation">(</span><span class="token punctuation">)</span><span class="token punctuation">;</span>
      <span class="token keyword">const</span> typeDef <span class="token operator">=</span> reference<span class="token punctuation">.</span>parentPath<span class="token punctuation">.</span><span class="token function">get</span><span class="token punctuation">(</span><span class="token string">'typeParameters.params.0'</span><span class="token punctuation">)</span><span class="token punctuation">.</span>node<span class="token punctuation">;</span>
      functionDeclaration
        <span class="token punctuation">.</span><span class="token function">get</span><span class="token punctuation">(</span><span class="token string">'body'</span><span class="token punctuation">)</span>
        <span class="token punctuation">.</span><span class="token function">unshiftContainer</span><span class="token punctuation">(</span>
          <span class="token string">'body'</span><span class="token punctuation">,</span>
          babel<span class="token punctuation">.</span>types<span class="token punctuation">.</span><span class="token function">returnStatement</span><span class="token punctuation">(</span>
            <span class="token function">generateFakerCode</span><span class="token punctuation">(</span>fakerIdentifier<span class="token punctuation">,</span> typeDef<span class="token punctuation">)</span>
          <span class="token punctuation">)</span>
        <span class="token punctuation">)</span><span class="token punctuation">;</span>
    <span class="token punctuation">&#125;</span><span class="token punctuation">)</span><span class="token punctuation">;</span>
    <span class="token comment">// highlight-end</span>
  <span class="token punctuation">&#125;</span>
<span class="token punctuation">&#125;</span><span class="token punctuation">)</span><span class="token punctuation">;</span></code>` + "";

	let t322;
	let p70;
	let t323;
	let code36;
	let t324;
	let t325;
	let code37;
	let t326;
	let t327;
	let t328;
	let pre20;

	let raw20_value = `
<code class="language-js"><span class="token keyword">function</span> <span class="token function">generateFakerCode</span><span class="token punctuation">(</span><span class="token parameter">fakerIdentifier<span class="token punctuation">,</span> typeDef</span><span class="token punctuation">)</span> <span class="token punctuation">&#123;</span>
  <span class="token keyword">switch</span> <span class="token punctuation">(</span>typeDef<span class="token punctuation">.</span>type<span class="token punctuation">)</span> <span class="token punctuation">&#123;</span>
    <span class="token keyword">case</span> <span class="token string">'ObjectTypeAnnotation'</span><span class="token punctuation">:</span>
      <span class="token keyword">return</span> babel<span class="token punctuation">.</span>types<span class="token punctuation">.</span><span class="token function">objectExpression</span><span class="token punctuation">(</span>
        typeDef<span class="token punctuation">.</span>properties<span class="token punctuation">.</span><span class="token function">map</span><span class="token punctuation">(</span><span class="token parameter">property</span> <span class="token operator">=></span>
          babel<span class="token punctuation">.</span>types<span class="token punctuation">.</span><span class="token function">objectProperty</span><span class="token punctuation">(</span>
            babel<span class="token punctuation">.</span>types<span class="token punctuation">.</span><span class="token function">identifier</span><span class="token punctuation">(</span>property<span class="token punctuation">.</span>key<span class="token punctuation">.</span>name<span class="token punctuation">)</span><span class="token punctuation">,</span>
            <span class="token function">generateFakerCode</span><span class="token punctuation">(</span>fakerIdentifier<span class="token punctuation">,</span> property<span class="token punctuation">.</span>value<span class="token punctuation">)</span>
          <span class="token punctuation">)</span>
        <span class="token punctuation">)</span>
      <span class="token punctuation">)</span><span class="token punctuation">;</span>
    <span class="token keyword">case</span> <span class="token string">'NumberTypeAnnotation'</span><span class="token punctuation">:</span>
      <span class="token keyword">return</span> babel<span class="token punctuation">.</span><span class="token function">expression</span><span class="token punctuation">(</span><span class="token string">'%%FAKER%%.random.number()'</span><span class="token punctuation">)</span><span class="token punctuation">(</span><span class="token punctuation">&#123;</span>
        <span class="token constant">FAKER</span><span class="token punctuation">:</span> fakerIdentifier<span class="token punctuation">,</span>
      <span class="token punctuation">&#125;</span><span class="token punctuation">)</span><span class="token punctuation">;</span>
    <span class="token keyword">case</span> <span class="token string">'StringTypeAnnotation'</span><span class="token punctuation">:</span>
      <span class="token keyword">return</span> babel<span class="token punctuation">.</span><span class="token function">expression</span><span class="token punctuation">(</span><span class="token string">'%%FAKER%%.random.word()'</span><span class="token punctuation">)</span><span class="token punctuation">(</span><span class="token punctuation">&#123;</span>
        <span class="token constant">FAKER</span><span class="token punctuation">:</span> fakerIdentifier<span class="token punctuation">,</span>
      <span class="token punctuation">&#125;</span><span class="token punctuation">)</span><span class="token punctuation">;</span>
    <span class="token keyword">case</span> <span class="token string">'BooleanTypeAnnotation'</span><span class="token punctuation">:</span>
      <span class="token keyword">return</span> babel<span class="token punctuation">.</span><span class="token function">expression</span><span class="token punctuation">(</span><span class="token string">'%%FAKER%%.random.boolean()'</span><span class="token punctuation">)</span><span class="token punctuation">(</span><span class="token punctuation">&#123;</span>
        <span class="token constant">FAKER</span><span class="token punctuation">:</span> fakerIdentifier<span class="token punctuation">,</span>
      <span class="token punctuation">&#125;</span><span class="token punctuation">)</span><span class="token punctuation">;</span>
    <span class="token keyword">default</span><span class="token punctuation">:</span>
      <span class="token keyword">throw</span> <span class="token keyword">new</span> <span class="token class-name">MacroError</span><span class="token punctuation">(</span><span class="token template-string"><span class="token template-punctuation string">&#96;</span><span class="token string">Unknown type definition: </span><span class="token interpolation"><span class="token interpolation-punctuation punctuation">$&#123;</span>typeDef<span class="token punctuation">.</span>type<span class="token interpolation-punctuation punctuation">&#125;</span></span><span class="token template-punctuation string">&#96;</span></span><span class="token punctuation">)</span><span class="token punctuation">;</span>
  <span class="token punctuation">&#125;</span>
<span class="token punctuation">&#125;</span></code>` + "";

	let t329;
	let p71;
	let t330;
	let t331;
	let p72;
	let t332;
	let t333;
	let p73;
	let t334;
	let code38;
	let t335;
	let t336;
	let t337;
	let pre21;

	let raw21_value = `
<code class="language-js"><span class="token keyword">async</span> <span class="token keyword">function</span> <span class="token function">fetchUser</span><span class="token punctuation">(</span><span class="token parameter"><span class="token operator">...</span></span><span class="token punctuation">)</span><span class="token punctuation">:</span> MockResponse<span class="token operator">&lt;</span><span class="token comment">/*...*/</span><span class="token punctuation">,</span> <span class="token boolean">false</span><span class="token operator">></span> <span class="token punctuation">&#123;</span><span class="token punctuation">&#125;</span></code>` + "";

	let t338;
	let p74;
	let t339;
	let code39;
	let t340;
	let t341;
	let t342;
	let pre22;

	let raw22_value = `
<code class="language-js"><span class="token comment">// filename: mock.macro.js</span>

<span class="token keyword">const</span> <span class="token punctuation">&#123;</span> createMacro <span class="token punctuation">&#125;</span> <span class="token operator">=</span> <span class="token function">require</span><span class="token punctuation">(</span><span class="token string">'babel-plugin-macros'</span><span class="token punctuation">)</span><span class="token punctuation">;</span>

module<span class="token punctuation">.</span>exports <span class="token operator">=</span> <span class="token function">createMacro</span><span class="token punctuation">(</span>
  <span class="token keyword">function</span><span class="token punctuation">(</span><span class="token parameter"><span class="token punctuation">&#123;</span> references<span class="token punctuation">,</span> state<span class="token punctuation">,</span> babel<span class="token punctuation">,</span> config <span class="token punctuation">&#125;</span></span><span class="token punctuation">)</span> <span class="token punctuation">&#123;</span>
    references<span class="token punctuation">.</span>MockResponse<span class="token punctuation">.</span><span class="token function">forEach</span><span class="token punctuation">(</span><span class="token parameter">reference</span> <span class="token operator">=></span> <span class="token punctuation">&#123;</span>
      <span class="token keyword">const</span> functionDeclaration <span class="token operator">=</span> reference<span class="token punctuation">.</span><span class="token function">getFunctionParent</span><span class="token punctuation">(</span><span class="token punctuation">)</span><span class="token punctuation">;</span>
      <span class="token keyword">const</span> typeDef <span class="token operator">=</span> reference<span class="token punctuation">.</span>parentPath<span class="token punctuation">.</span><span class="token function">get</span><span class="token punctuation">(</span><span class="token string">'typeParameters.params.0'</span><span class="token punctuation">)</span><span class="token punctuation">.</span>node<span class="token punctuation">;</span>

      <span class="token comment">// highlight-start</span>
      <span class="token comment">// if the 2nd argument present and it is 'false', disable mocking</span>
      <span class="token keyword">const</span> secondParam <span class="token operator">=</span> reference<span class="token punctuation">.</span>parentPath<span class="token punctuation">.</span><span class="token function">get</span><span class="token punctuation">(</span><span class="token string">'typeParameters.params.1'</span><span class="token punctuation">)</span><span class="token punctuation">;</span>
      <span class="token keyword">if</span> <span class="token punctuation">(</span>secondParam <span class="token operator">&amp;&amp;</span> secondParam<span class="token punctuation">.</span><span class="token function">isBooleanLiteralTypeAnnotation</span><span class="token punctuation">(</span><span class="token punctuation">&#123;</span> value<span class="token punctuation">:</span> <span class="token boolean">false</span> <span class="token punctuation">&#125;</span><span class="token punctuation">)</span><span class="token punctuation">)</span> <span class="token punctuation">&#123;</span>
        <span class="token keyword">return</span><span class="token punctuation">;</span>
      <span class="token punctuation">&#125;</span>
      <span class="token comment">// highlight-end</span>
      <span class="token comment">// ...insert return statement</span>
    <span class="token punctuation">&#125;</span>
  <span class="token punctuation">&#125;</span>
<span class="token punctuation">)</span><span class="token punctuation">;</span></code>` + "";

	let t343;
	let blockquote2;
	let p75;
	let t344;
	let a42;
	let t345;
	let t346;
	let t347;
	let section11;
	let h24;
	let a43;
	let t348;
	let t349;
	let p76;
	let t350;
	let code40;
	let t351;
	let t352;
	let code41;
	let t353;
	let t354;
	let t355;
	let p77;
	let code42;
	let t356;
	let t357;
	let code43;
	let t358;
	let t359;
	let t360;
	let section12;
	let h25;
	let a44;
	let t361;
	let t362;
	let ul6;
	let li14;
	let a45;
	let t363;
	let t364;
	let a46;
	let t365;
	let t366;
	let li15;
	let a47;
	let t367;
	let t368;
	let a48;
	let t369;
	let t370;
	let li16;
	let a49;
	let code44;
	let t371;
	let t372;
	let t373;
	let li17;
	let a50;
	let t374;
	let t375;
	let a51;
	let t376;
	let t377;
	let li18;
	let a52;
	let t378;
	let t379;
	let li19;
	let t380;
	let a53;
	let t381;

	return {
		c() {
			section0 = element("section");
			ul3 = element("ul");
			li0 = element("li");
			a0 = element("a");
			t0 = text("Motivation");
			ul0 = element("ul");
			li1 = element("li");
			a1 = element("a");
			t1 = text("Documentation and community support");
			li2 = element("li");
			a2 = element("a");
			t2 = text("Tooling");
			li3 = element("li");
			a3 = element("a");
			t3 = text("Maintainability");
			li4 = element("li");
			a4 = element("a");
			t4 = text("Consistency of the syntax");
			li5 = element("li");
			a5 = element("a");
			t5 = text("Compile-time vs Runtime");
			li6 = element("li");
			a6 = element("a");
			t6 = text("Babel macros");
			ul1 = element("ul");
			li7 = element("li");
			a7 = element("a");
			t7 = text("So what is Babel macros again?");
			li8 = element("li");
			a8 = element("a");
			t8 = text("How to write Babel macros");
			ul2 = element("ul");
			li9 = element("li");
			a9 = element("a");
			t9 = text("mock.macro");
			li10 = element("li");
			a10 = element("a");
			t10 = text("Summary");
			li11 = element("li");
			a11 = element("a");
			t11 = text("Further Reading");
			t12 = space();
			p0 = element("p");
			t13 = text("In this article, I am going to talk about Babel macros.");
			t14 = space();
			section1 = element("section");
			h20 = element("h2");
			a12 = element("a");
			t15 = text("Motivation");
			t16 = space();
			p1 = element("p");
			t17 = text("In my previous post, ");
			a13 = element("a");
			t18 = text("\"Creating custom JavaScript syntax with Babel\"");
			t19 = text(", I've shown you detailed steps on how you can create a custom syntax and write transform plugin or polyfills so that the syntax can be run in browsers today.");
			t20 = space();
			p2 = element("p");
			t21 = text("However, it is purely educational, and I am not recommending you to create your custom JavaScript syntax for production projects for several reasons:");
			t22 = space();
			section2 = element("section");
			h30 = element("h3");
			a14 = element("a");
			t23 = text("Documentation and community support");
			t24 = space();
			p3 = element("p");
			t25 = text("If anything goes wrong, the great JavaScript community out there has no idea what is the ");
			code0 = element("code");
			t26 = text("@@");
			t27 = text(" (");
			a15 = element("a");
			t28 = text("the curry function syntax we created previously");
			t29 = text(") means. Meaning the support that a new developer to the team can get is only as good as your documentation.");
			t30 = space();
			section3 = element("section");
			h31 = element("h3");
			a16 = element("a");
			t31 = text("Tooling");
			t32 = space();
			p4 = element("p");
			t33 = text("You need to make all the tooling you use to work. I mean eslint, prettier, Flowtype/TypeScript, your editor...");
			t34 = space();
			section4 = element("section");
			h32 = element("h3");
			a17 = element("a");
			t35 = text("Maintainability");
			t36 = space();
			p5 = element("p");
			t37 = text("If the forked version has a bug, do you have enough support to fix it?\nIf the babel upstream fixed a bug or added a feature, how often do you merge the upstream into your fork?");
			t38 = space();
			section5 = element("section");
			h33 = element("h3");
			a18 = element("a");
			t39 = text("Consistency of the syntax");
			t40 = space();
			p6 = element("p");
			t41 = text("This is the hardest part of creating a new syntax. An added syntax is an added mental concept for the language users, so the new mental model should be transferable to every scenario of the language.");
			t42 = space();
			p7 = element("p");
			t43 = text("Take our ");
			code1 = element("code");
			t44 = text("@@");
			t45 = text(" syntax, for example, if it works for a normal function declaration, it's expected to work for anonymous functions, arrow functions, class methods. Have you thought about how it would work with generator functions and async functions? If a curried function returns another function, does that make the returned function curried as well?");
			t46 = space();
			section6 = element("section");
			h21 = element("h2");
			a19 = element("a");
			t47 = text("Compile-time vs Runtime");
			t48 = space();
			p8 = element("p");
			t49 = text("I think you get my point. But the idea of having a magical syntax that keeps the code elegant and short is enticing.");
			t50 = space();
			p9 = element("p");
			t51 = text("Take ");
			a20 = element("a");
			t52 = text("optional chaining");
			t53 = text(" for example, before having the optional chaining operator ");
			code2 = element("code");
			t54 = text("?.");
			t55 = text(", we had a few ways to write ");
			code3 = element("code");
			t56 = text("props?.user?.friends?.[0]?.friend");
			t57 = text(", which is:");
			t58 = space();
			p10 = element("p");
			strong0 = element("strong");
			t59 = text("a mundane to write, not easy to read (less intentional), but most efficient possible:");
			t60 = space();
			pre0 = element("pre");
			t61 = space();
			p11 = element("p");
			strong1 = element("strong");
			t62 = text("easy to write, easy to read, but with slightly more runtime overhead:");
			t63 = space();
			pre1 = element("pre");
			t64 = space();
			blockquote0 = element("blockquote");
			b = element("b");
			t65 = text("Note:");
			t66 = text(" I've tried to search online whether a `try-catch` is more expensive, however the ");
			a21 = element("a");
			t67 = text("search result");
			t68 = space();
			a22 = element("a");
			t69 = text("is not");
			t70 = space();
			a23 = element("a");
			t71 = text("conclusive");
			t72 = text(". ");
			a24 = element("a");
			t73 = text("Let me know");
			t74 = text(" if you have a conclusive research on this.");
			t75 = space();
			p12 = element("p");
			t76 = text("Is there a third option that is ");
			strong2 = element("strong");
			t77 = text("easy to read and write, yet without the try-catch runtime overhead?");
			t78 = space();
			p13 = element("p");
			t79 = text("Well, if you look at the ");
			a25 = element("a");
			code4 = element("code");
			t80 = text("facebookincubator/idx");
			t81 = text(" library, it uses a ");
			a26 = element("a");
			t82 = text("Babel plugin");
			t83 = text(" to search through require or imports of ");
			code5 = element("code");
			t84 = text("idx");
			t85 = text(" and replaces all its usages, for example when you write:");
			t86 = space();
			pre2 = element("pre");
			t87 = space();
			p14 = element("p");
			t88 = text("it gets transformed into:");
			t89 = space();
			pre3 = element("pre");
			t90 = space();
			p15 = element("p");
			t91 = text("So your code is easy to read, and no runtime overhead. You get the best of both worlds!");
			t92 = space();
			p16 = element("p");
			t93 = text("Though nothing is perfect. Here, I wanted to point out some of my personal opinions about this approach:");
			t94 = space();
			blockquote1 = element("blockquote");
			p17 = element("p");
			t95 = text("While maintaining a good developer experience (DX), we've shifted the runtime overhead to compile time.");
			t96 = space();
			p18 = element("p");
			t97 = text("You can keep the way you wanted to write the code while having the compiler to transform the code to something you are ");
			em = element("em");
			t98 = text("\"supposed\"");
			t99 = text(" to write.");
			t100 = space();
			p19 = element("p");
			t101 = text("A win-win solution.");
			t102 = space();
			p20 = element("p");
			strong3 = element("strong");
			t103 = text("How do we apply this technique to other similar situations?");
			t104 = space();
			p21 = element("p");
			t105 = text("First, you need to ");
			a27 = element("a");
			t106 = text("write a Babel plugin");
			t107 = text(".");
			t108 = space();
			p22 = element("p");
			t109 = text("Secondly, you need a ");
			strong4 = element("strong");
			t110 = text("marker");
			t111 = text(" to target the transformation.");
			t112 = space();
			p23 = element("p");
			t113 = text("In this example, the default import from the ");
			code6 = element("code");
			t114 = text("\"idx\"");
			t115 = text(" module is the ");
			strong5 = element("strong");
			t116 = text("marker");
			t117 = text(", all the usage of the default import would be transformed by the Babel plugin.");
			t118 = space();
			p24 = element("p");
			t119 = text("Thirdly, you need to update your babel configuration. For every new plugin, ");
			strong6 = element("strong");
			t120 = text("you need to add them in");
			t121 = text("; ");
			strong7 = element("strong");
			t122 = text("you need to make sure the order of plugin is correct");
			t123 = text(".");
			t124 = space();
			p25 = element("p");
			strong8 = element("strong");
			t125 = text("What if there's a bug in the Babel plugin?");
			t126 = space();
			p26 = element("p");
			t127 = text("This would be the most confusing part for the new developers on the codebase.");
			t128 = space();
			p27 = element("p");
			t129 = text("In this example, if the ");
			code7 = element("code");
			t130 = text("idx");
			t131 = text(" function has a bug, it is natural for developers to dig into the source code of ");
			code8 = element("code");
			t132 = text("idx");
			t133 = text(". However, ");
			code9 = element("code");
			t134 = text("\"idx\"");
			t135 = text(" is nothing but a ");
			strong9 = element("strong");
			t136 = text("marker");
			t137 = text(" for the ");
			code10 = element("code");
			t138 = text("babel-plugin-idx");
			t139 = text(" to transform away. So if there's any bug, it should be inside ");
			code11 = element("code");
			t140 = text("babel-plugin-idx");
			t141 = text(" instead of ");
			code12 = element("code");
			t142 = text("idx");
			t143 = text(".");
			t144 = space();
			p28 = element("p");
			t145 = text("Besides, the bug may be due to the configuration of the Babel plugin instead of the code logic itself. However if you change the configuration, it could affect all the usages of the ");
			code13 = element("code");
			t146 = text("idx");
			t147 = text(" function, because ");
			strong10 = element("strong");
			t148 = text("babel configuration is global");
			t149 = text(".");
			t150 = space();
			hr = element("hr");
			t151 = space();
			p29 = element("p");
			t152 = text("To summarise, I think that this solution is a win-win for DX vs User Experience (UX), however, if we can make the transform plugin more accessible to all developers, eg: without having to update babel configuration for every new transform plugin, easier to debug, and a localized configuration.");
			t153 = space();
			p30 = element("p");
			t154 = text("Well, you are looking at ");
			a28 = element("a");
			t155 = text("babel macros");
			t156 = text(". 👀");
			t157 = space();
			section7 = element("section");
			h22 = element("h2");
			a29 = element("a");
			t158 = text("Babel macros");
			t159 = space();
			p31 = element("p");
			t160 = text("So, here's how it would look like with babel macro:");
			t161 = space();
			p32 = element("p");
			strong11 = element("strong");
			t162 = text("You add ");
			code14 = element("code");
			t163 = text("babel-plugin-macro");
			t164 = text(" to babel config");
			t165 = space();
			p33 = element("p");
			t166 = text("And that's all the change you need for babel configuration.");
			t167 = space();
			pre4 = element("pre");
			t168 = space();
			p34 = element("p");
			strong12 = element("strong");
			t169 = text("You write your own macro");
			t170 = space();
			pre5 = element("pre");
			t171 = space();
			p35 = element("p");
			t172 = text("We'll talk about the code later, one thing to take away here is that your filename has to end with ");
			code15 = element("code");
			t173 = text(".macro");
			t174 = text(" or ");
			code16 = element("code");
			t175 = text(".macro.js");
			t176 = text(".");
			t177 = space();
			p36 = element("p");
			strong13 = element("strong");
			t178 = text("Use it");
			t179 = space();
			pre6 = element("pre");
			t180 = space();
			p37 = element("p");
			t181 = text("As you can see here, if there's something wrong about ");
			code17 = element("code");
			t182 = text("idx");
			t183 = text(", the user would know which file exactly to look at.");
			t184 = space();
			p38 = element("p");
			t185 = text("You don't get the disconnection between the module ");
			code18 = element("code");
			t186 = text("idx");
			t187 = text(" and the plugin ");
			code19 = element("code");
			t188 = text("babel-plugin-idx");
			t189 = text(".");
			t190 = space();
			p39 = element("p");
			t191 = text("Besides, if you want to modify configuration, say for this usage, you can do it easily:");
			t192 = space();
			pre7 = element("pre");
			t193 = space();
			p40 = element("p");
			t194 = text("Simple and explicit. Isn't that great?");
			t195 = space();
			section8 = element("section");
			h34 = element("h3");
			a30 = element("a");
			t196 = text("So what is Babel macros again?");
			t197 = space();
			p41 = element("p");
			strong14 = element("strong");
			t198 = text("Babel macros");
			t199 = text(" is a concept from the ");
			a31 = element("a");
			code20 = element("code");
			t200 = text("babel-plugin-macros");
			t201 = text(", which defines the standard interface between compile-time code transformation and your runtime code.");
			t202 = space();
			p42 = element("p");
			t203 = text("In compile-time, ");
			code21 = element("code");
			t204 = text("babel-plugin-macros");
			t205 = text(" will look for all ");
			code22 = element("code");
			t206 = text("import");
			t207 = text(" or ");
			code23 = element("code");
			t208 = text("require");
			t209 = text(" from modules ends with ");
			code24 = element("code");
			t210 = text(".macro");
			t211 = text(", finds all references of the imported variables, and passes them to the ");
			code25 = element("code");
			t212 = text(".macro");
			t213 = text(" file to transform them.");
			t214 = space();
			p43 = element("p");
			t215 = text("The imported variables are not restricted to be a function, it can be a variable, a type from type system (Flow / TypeScript).");
			t216 = space();
			p44 = element("p");
			t217 = text("If it is a default export, you can name it any way you like, if it is a named export, you can reassign to another variable name too.");
			t218 = space();
			p45 = element("p");
			t219 = text("Cool, so how can I write my Babel macros?");
			t220 = space();
			section9 = element("section");
			h23 = element("h2");
			a32 = element("a");
			t221 = text("How to write Babel macros");
			t222 = space();
			p46 = element("p");
			a33 = element("a");
			t223 = text("Kent C Dodds");
			t224 = text(" has written ");
			a34 = element("a");
			t225 = text("a fantastic guide for macro authors");
			t226 = text(".");
			t227 = space();
			p47 = element("p");
			t228 = text("Please go read it.");
			t229 = space();
			p48 = element("p");
			t230 = text("If you insist to stay, I am going to show you how I wrote my Babel macros, in particular, the ");
			a35 = element("a");
			t231 = text("mock.macro");
			t232 = text(". And hopefully, along the way, you learned how to write your Babel macros as well.");
			t233 = space();
			section10 = element("section");
			h35 = element("h3");
			a36 = element("a");
			t234 = text("mock.macro");
			t235 = space();
			p49 = element("p");
			strong15 = element("strong");
			t236 = text("Motivation");
			t237 = space();
			p50 = element("p");
			t238 = text("Usually, when working with a backend developer on a frontend application, I would use static type to define the API schema. For example, a user api would look like this:");
			t239 = space();
			pre8 = element("pre");
			t240 = space();
			p51 = element("p");
			t241 = text("However while waiting for the backend developer to develop the API, I would have to use mock data for development:");
			t242 = space();
			pre9 = element("pre");
			t243 = space();
			p52 = element("p");
			t244 = text("And along the way, due to unforeseen circumstances and lack of foresight, the response schema of the API was changed multiple times:");
			t245 = space();
			pre10 = element("pre");
			t246 = space();
			p53 = element("p");
			t247 = text("Here you see I need to update both the type definition as well as the mock data. This reminds me of ");
			a37 = element("a");
			t248 = text("the double declaration problem");
			t249 = text(" coined by ");
			a38 = element("a");
			t250 = text("@swyx");
			t251 = space();
			a39 = element("a");
			t252 = text("in his talk");
			t253 = text(". Which means that this could potentially be solved with Babel macros.");
			t254 = space();
			p54 = element("p");
			t255 = text("So in my head, I imagined with Babel macros, I could write:");
			t256 = space();
			pre11 = element("pre");
			t257 = space();
			p55 = element("p");
			t258 = text("and when I call the function ");
			code26 = element("code");
			t259 = text("fetchUser");
			t260 = text(", I would get my mock response in return.");
			t261 = space();
			p56 = element("p");
			strong16 = element("strong");
			t262 = text("Implementing mock.macro");
			t263 = space();
			p57 = element("p");
			t264 = text("Implementing mock.macro requires some basic knowledge about Abstract Syntax Tree (AST) and writing babel transformation, you can check out ");
			a40 = element("a");
			t265 = text("the step-by-step guide I've written previously");
			t266 = text(".");
			t267 = space();
			p58 = element("p");
			t268 = text("Implementing Babel macros is quite easy, the api from the ");
			code27 = element("code");
			t269 = text("babel-plugin-macros");
			t270 = text(" is pretty straightforward, all you need is to provide a default export to your macro file:");
			t271 = space();
			pre12 = element("pre");
			t272 = space();
			p59 = element("p");
			code28 = element("code");
			t273 = text("createMacro");
			t274 = text(" takes in a callback function, which is executed when someone imports this macro file. It provides:");
			t275 = space();
			ul4 = element("ul");
			li12 = element("li");
			strong17 = element("strong");
			t276 = text("references");
			t277 = space();
			p60 = element("p");
			t278 = text("All the reference that was imported from the macro file.");
			t279 = space();
			p61 = element("p");
			t280 = text("For example:");
			t281 = space();
			pre13 = element("pre");
			t282 = space();
			p62 = element("p");
			t283 = text("will give you an object, with the import name as the ");
			code29 = element("code");
			t284 = text("key");
			t285 = text(", and array of paths as the ");
			code30 = element("code");
			t286 = text("value");
			t287 = text(":");
			t288 = space();
			pre14 = element("pre");
			t289 = space();
			p63 = element("p");
			t290 = text("Inside the array, you can get all paths where the imported names are referenced. For example:");
			t291 = space();
			pre15 = element("pre");
			t292 = space();
			ul5 = element("ul");
			li13 = element("li");
			strong18 = element("strong");
			t293 = text("state");
			t294 = space();
			p64 = element("p");
			t295 = text("It gives you the current state of the file being traversed.");
			t296 = space();
			p65 = element("p");
			t297 = text("So, in this example, I need to transform all the references of ");
			code31 = element("code");
			t298 = text("MockResponse");
			t299 = text(":");
			t300 = space();
			pre16 = element("pre");
			t301 = space();
			p66 = element("p");
			t302 = text("Next, I need to figure out how the transformed code would look like:");
			t303 = space();
			pre17 = element("pre");
			t304 = space();
			p67 = element("p");
			t305 = text("I decided to use ");
			a41 = element("a");
			t306 = text("faker.js");
			t307 = text(" as the random data generator.");
			t308 = space();
			p68 = element("p");
			t309 = text("So I have to import ");
			code32 = element("code");
			t310 = text("faker");
			t311 = text(" at the top of the file:");
			t312 = space();
			pre18 = element("pre");
			t313 = space();
			p69 = element("p");
			t314 = text("Next, for each references of ");
			code33 = element("code");
			t315 = text("MockRespone");
			t316 = text(", I need to find the ");
			code34 = element("code");
			t317 = text("FunctionDeclaration");
			t318 = text(" that it belongs to, and insert a ");
			code35 = element("code");
			t319 = text("ReturnStatement");
			t320 = text(" into the top of the function body:");
			t321 = space();
			pre19 = element("pre");
			t322 = space();
			p70 = element("p");
			t323 = text("In the ");
			code36 = element("code");
			t324 = text("generateFakerCode");
			t325 = text(", I'll generate a AST node based on the node type of the ");
			code37 = element("code");
			t326 = text("typeDef");
			t327 = text(":");
			t328 = space();
			pre20 = element("pre");
			t329 = space();
			p71 = element("p");
			t330 = text("That's it! A generated mock function via type definition using Babel macros.");
			t331 = space();
			p72 = element("p");
			t332 = text("One last thing, what happens when the API is ready, and you want to disable the mocking behavior?");
			t333 = space();
			p73 = element("p");
			t334 = text("We can read the 2nd parameter of the ");
			code38 = element("code");
			t335 = text("MockResponse");
			t336 = text(":");
			t337 = space();
			pre21 = element("pre");
			t338 = space();
			p74 = element("p");
			t339 = text("If the 2nd parameter is ");
			code39 = element("code");
			t340 = text("false");
			t341 = text(", we disable the mocking behavior:");
			t342 = space();
			pre22 = element("pre");
			t343 = space();
			blockquote2 = element("blockquote");
			p75 = element("p");
			t344 = text("You can find the full code from ");
			a42 = element("a");
			t345 = text("Github");
			t346 = text(".");
			t347 = space();
			section11 = element("section");
			h24 = element("h2");
			a43 = element("a");
			t348 = text("Summary");
			t349 = space();
			p76 = element("p");
			t350 = text("Sometimes, it is more efficient to move runtime abstraction and complexity to compile time. However, developing and maintaining a babel plugin for each of them may be difficult to maintain and debug, as there's a gap between the code written and build time plugin, eg: ");
			code40 = element("code");
			t351 = text("idx");
			t352 = text(" and ");
			code41 = element("code");
			t353 = text("babel-plugin-idx");
			t354 = text(".");
			t355 = space();
			p77 = element("p");
			code42 = element("code");
			t356 = text("babel-plugin-macros");
			t357 = text(" solves this by allow users to import ");
			code43 = element("code");
			t358 = text(".macro");
			t359 = text(" files directly into the codebase. The explicit import bridges the gap between build-time and runtime and allows the user to develop and debug their macro easily.");
			t360 = space();
			section12 = element("section");
			h25 = element("h2");
			a44 = element("a");
			t361 = text("Further Reading");
			t362 = space();
			ul6 = element("ul");
			li14 = element("li");
			a45 = element("a");
			t363 = text("babel-plugin-macros");
			t364 = text(" by ");
			a46 = element("a");
			t365 = text("Kent C. Dodds");
			t366 = space();
			li15 = element("li");
			a47 = element("a");
			t367 = text("I Can Babel Macros (and So Can You!)");
			t368 = text(" by ");
			a48 = element("a");
			t369 = text("Shawn Wang");
			t370 = space();
			li16 = element("li");
			a49 = element("a");
			code44 = element("code");
			t371 = text("babel-plugin-macros");
			t372 = text(" Usage for macros authors");
			t373 = space();
			li17 = element("li");
			a50 = element("a");
			t374 = text("Zero-config code transformation with babel-plugin-macros");
			t375 = text(" by ");
			a51 = element("a");
			t376 = text("Kent C. Dodds");
			t377 = space();
			li18 = element("li");
			a52 = element("a");
			t378 = text("Awesome list for Babel macros");
			t379 = space();
			li19 = element("li");
			t380 = text("The idea of converting type definition to mock generator comes from ");
			a53 = element("a");
			t381 = text("Manta Style, the futuristic API Mock Server for Frontend");
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
			t0 = claim_text(a0_nodes, "Motivation");
			a0_nodes.forEach(detach);
			li0_nodes.forEach(detach);
			ul0 = claim_element(ul3_nodes, "UL", {});
			var ul0_nodes = children(ul0);
			li1 = claim_element(ul0_nodes, "LI", {});
			var li1_nodes = children(li1);
			a1 = claim_element(li1_nodes, "A", { href: true });
			var a1_nodes = children(a1);
			t1 = claim_text(a1_nodes, "Documentation and community support");
			a1_nodes.forEach(detach);
			li1_nodes.forEach(detach);
			li2 = claim_element(ul0_nodes, "LI", {});
			var li2_nodes = children(li2);
			a2 = claim_element(li2_nodes, "A", { href: true });
			var a2_nodes = children(a2);
			t2 = claim_text(a2_nodes, "Tooling");
			a2_nodes.forEach(detach);
			li2_nodes.forEach(detach);
			li3 = claim_element(ul0_nodes, "LI", {});
			var li3_nodes = children(li3);
			a3 = claim_element(li3_nodes, "A", { href: true });
			var a3_nodes = children(a3);
			t3 = claim_text(a3_nodes, "Maintainability");
			a3_nodes.forEach(detach);
			li3_nodes.forEach(detach);
			li4 = claim_element(ul0_nodes, "LI", {});
			var li4_nodes = children(li4);
			a4 = claim_element(li4_nodes, "A", { href: true });
			var a4_nodes = children(a4);
			t4 = claim_text(a4_nodes, "Consistency of the syntax");
			a4_nodes.forEach(detach);
			li4_nodes.forEach(detach);
			ul0_nodes.forEach(detach);
			li5 = claim_element(ul3_nodes, "LI", {});
			var li5_nodes = children(li5);
			a5 = claim_element(li5_nodes, "A", { href: true });
			var a5_nodes = children(a5);
			t5 = claim_text(a5_nodes, "Compile-time vs Runtime");
			a5_nodes.forEach(detach);
			li5_nodes.forEach(detach);
			li6 = claim_element(ul3_nodes, "LI", {});
			var li6_nodes = children(li6);
			a6 = claim_element(li6_nodes, "A", { href: true });
			var a6_nodes = children(a6);
			t6 = claim_text(a6_nodes, "Babel macros");
			a6_nodes.forEach(detach);
			li6_nodes.forEach(detach);
			ul1 = claim_element(ul3_nodes, "UL", {});
			var ul1_nodes = children(ul1);
			li7 = claim_element(ul1_nodes, "LI", {});
			var li7_nodes = children(li7);
			a7 = claim_element(li7_nodes, "A", { href: true });
			var a7_nodes = children(a7);
			t7 = claim_text(a7_nodes, "So what is Babel macros again?");
			a7_nodes.forEach(detach);
			li7_nodes.forEach(detach);
			ul1_nodes.forEach(detach);
			li8 = claim_element(ul3_nodes, "LI", {});
			var li8_nodes = children(li8);
			a8 = claim_element(li8_nodes, "A", { href: true });
			var a8_nodes = children(a8);
			t8 = claim_text(a8_nodes, "How to write Babel macros");
			a8_nodes.forEach(detach);
			li8_nodes.forEach(detach);
			ul2 = claim_element(ul3_nodes, "UL", {});
			var ul2_nodes = children(ul2);
			li9 = claim_element(ul2_nodes, "LI", {});
			var li9_nodes = children(li9);
			a9 = claim_element(li9_nodes, "A", { href: true });
			var a9_nodes = children(a9);
			t9 = claim_text(a9_nodes, "mock.macro");
			a9_nodes.forEach(detach);
			li9_nodes.forEach(detach);
			ul2_nodes.forEach(detach);
			li10 = claim_element(ul3_nodes, "LI", {});
			var li10_nodes = children(li10);
			a10 = claim_element(li10_nodes, "A", { href: true });
			var a10_nodes = children(a10);
			t10 = claim_text(a10_nodes, "Summary");
			a10_nodes.forEach(detach);
			li10_nodes.forEach(detach);
			li11 = claim_element(ul3_nodes, "LI", {});
			var li11_nodes = children(li11);
			a11 = claim_element(li11_nodes, "A", { href: true });
			var a11_nodes = children(a11);
			t11 = claim_text(a11_nodes, "Further Reading");
			a11_nodes.forEach(detach);
			li11_nodes.forEach(detach);
			ul3_nodes.forEach(detach);
			section0_nodes.forEach(detach);
			t12 = claim_space(nodes);
			p0 = claim_element(nodes, "P", {});
			var p0_nodes = children(p0);
			t13 = claim_text(p0_nodes, "In this article, I am going to talk about Babel macros.");
			p0_nodes.forEach(detach);
			t14 = claim_space(nodes);
			section1 = claim_element(nodes, "SECTION", {});
			var section1_nodes = children(section1);
			h20 = claim_element(section1_nodes, "H2", {});
			var h20_nodes = children(h20);
			a12 = claim_element(h20_nodes, "A", { href: true, id: true });
			var a12_nodes = children(a12);
			t15 = claim_text(a12_nodes, "Motivation");
			a12_nodes.forEach(detach);
			h20_nodes.forEach(detach);
			t16 = claim_space(section1_nodes);
			p1 = claim_element(section1_nodes, "P", {});
			var p1_nodes = children(p1);
			t17 = claim_text(p1_nodes, "In my previous post, ");
			a13 = claim_element(p1_nodes, "A", { href: true });
			var a13_nodes = children(a13);
			t18 = claim_text(a13_nodes, "\"Creating custom JavaScript syntax with Babel\"");
			a13_nodes.forEach(detach);
			t19 = claim_text(p1_nodes, ", I've shown you detailed steps on how you can create a custom syntax and write transform plugin or polyfills so that the syntax can be run in browsers today.");
			p1_nodes.forEach(detach);
			t20 = claim_space(section1_nodes);
			p2 = claim_element(section1_nodes, "P", {});
			var p2_nodes = children(p2);
			t21 = claim_text(p2_nodes, "However, it is purely educational, and I am not recommending you to create your custom JavaScript syntax for production projects for several reasons:");
			p2_nodes.forEach(detach);
			section1_nodes.forEach(detach);
			t22 = claim_space(nodes);
			section2 = claim_element(nodes, "SECTION", {});
			var section2_nodes = children(section2);
			h30 = claim_element(section2_nodes, "H3", {});
			var h30_nodes = children(h30);
			a14 = claim_element(h30_nodes, "A", { href: true, id: true });
			var a14_nodes = children(a14);
			t23 = claim_text(a14_nodes, "Documentation and community support");
			a14_nodes.forEach(detach);
			h30_nodes.forEach(detach);
			t24 = claim_space(section2_nodes);
			p3 = claim_element(section2_nodes, "P", {});
			var p3_nodes = children(p3);
			t25 = claim_text(p3_nodes, "If anything goes wrong, the great JavaScript community out there has no idea what is the ");
			code0 = claim_element(p3_nodes, "CODE", {});
			var code0_nodes = children(code0);
			t26 = claim_text(code0_nodes, "@@");
			code0_nodes.forEach(detach);
			t27 = claim_text(p3_nodes, " (");
			a15 = claim_element(p3_nodes, "A", { href: true });
			var a15_nodes = children(a15);
			t28 = claim_text(a15_nodes, "the curry function syntax we created previously");
			a15_nodes.forEach(detach);
			t29 = claim_text(p3_nodes, ") means. Meaning the support that a new developer to the team can get is only as good as your documentation.");
			p3_nodes.forEach(detach);
			section2_nodes.forEach(detach);
			t30 = claim_space(nodes);
			section3 = claim_element(nodes, "SECTION", {});
			var section3_nodes = children(section3);
			h31 = claim_element(section3_nodes, "H3", {});
			var h31_nodes = children(h31);
			a16 = claim_element(h31_nodes, "A", { href: true, id: true });
			var a16_nodes = children(a16);
			t31 = claim_text(a16_nodes, "Tooling");
			a16_nodes.forEach(detach);
			h31_nodes.forEach(detach);
			t32 = claim_space(section3_nodes);
			p4 = claim_element(section3_nodes, "P", {});
			var p4_nodes = children(p4);
			t33 = claim_text(p4_nodes, "You need to make all the tooling you use to work. I mean eslint, prettier, Flowtype/TypeScript, your editor...");
			p4_nodes.forEach(detach);
			section3_nodes.forEach(detach);
			t34 = claim_space(nodes);
			section4 = claim_element(nodes, "SECTION", {});
			var section4_nodes = children(section4);
			h32 = claim_element(section4_nodes, "H3", {});
			var h32_nodes = children(h32);
			a17 = claim_element(h32_nodes, "A", { href: true, id: true });
			var a17_nodes = children(a17);
			t35 = claim_text(a17_nodes, "Maintainability");
			a17_nodes.forEach(detach);
			h32_nodes.forEach(detach);
			t36 = claim_space(section4_nodes);
			p5 = claim_element(section4_nodes, "P", {});
			var p5_nodes = children(p5);
			t37 = claim_text(p5_nodes, "If the forked version has a bug, do you have enough support to fix it?\nIf the babel upstream fixed a bug or added a feature, how often do you merge the upstream into your fork?");
			p5_nodes.forEach(detach);
			section4_nodes.forEach(detach);
			t38 = claim_space(nodes);
			section5 = claim_element(nodes, "SECTION", {});
			var section5_nodes = children(section5);
			h33 = claim_element(section5_nodes, "H3", {});
			var h33_nodes = children(h33);
			a18 = claim_element(h33_nodes, "A", { href: true, id: true });
			var a18_nodes = children(a18);
			t39 = claim_text(a18_nodes, "Consistency of the syntax");
			a18_nodes.forEach(detach);
			h33_nodes.forEach(detach);
			t40 = claim_space(section5_nodes);
			p6 = claim_element(section5_nodes, "P", {});
			var p6_nodes = children(p6);
			t41 = claim_text(p6_nodes, "This is the hardest part of creating a new syntax. An added syntax is an added mental concept for the language users, so the new mental model should be transferable to every scenario of the language.");
			p6_nodes.forEach(detach);
			t42 = claim_space(section5_nodes);
			p7 = claim_element(section5_nodes, "P", {});
			var p7_nodes = children(p7);
			t43 = claim_text(p7_nodes, "Take our ");
			code1 = claim_element(p7_nodes, "CODE", {});
			var code1_nodes = children(code1);
			t44 = claim_text(code1_nodes, "@@");
			code1_nodes.forEach(detach);
			t45 = claim_text(p7_nodes, " syntax, for example, if it works for a normal function declaration, it's expected to work for anonymous functions, arrow functions, class methods. Have you thought about how it would work with generator functions and async functions? If a curried function returns another function, does that make the returned function curried as well?");
			p7_nodes.forEach(detach);
			section5_nodes.forEach(detach);
			t46 = claim_space(nodes);
			section6 = claim_element(nodes, "SECTION", {});
			var section6_nodes = children(section6);
			h21 = claim_element(section6_nodes, "H2", {});
			var h21_nodes = children(h21);
			a19 = claim_element(h21_nodes, "A", { href: true, id: true });
			var a19_nodes = children(a19);
			t47 = claim_text(a19_nodes, "Compile-time vs Runtime");
			a19_nodes.forEach(detach);
			h21_nodes.forEach(detach);
			t48 = claim_space(section6_nodes);
			p8 = claim_element(section6_nodes, "P", {});
			var p8_nodes = children(p8);
			t49 = claim_text(p8_nodes, "I think you get my point. But the idea of having a magical syntax that keeps the code elegant and short is enticing.");
			p8_nodes.forEach(detach);
			t50 = claim_space(section6_nodes);
			p9 = claim_element(section6_nodes, "P", {});
			var p9_nodes = children(p9);
			t51 = claim_text(p9_nodes, "Take ");
			a20 = claim_element(p9_nodes, "A", { href: true, rel: true });
			var a20_nodes = children(a20);
			t52 = claim_text(a20_nodes, "optional chaining");
			a20_nodes.forEach(detach);
			t53 = claim_text(p9_nodes, " for example, before having the optional chaining operator ");
			code2 = claim_element(p9_nodes, "CODE", {});
			var code2_nodes = children(code2);
			t54 = claim_text(code2_nodes, "?.");
			code2_nodes.forEach(detach);
			t55 = claim_text(p9_nodes, ", we had a few ways to write ");
			code3 = claim_element(p9_nodes, "CODE", {});
			var code3_nodes = children(code3);
			t56 = claim_text(code3_nodes, "props?.user?.friends?.[0]?.friend");
			code3_nodes.forEach(detach);
			t57 = claim_text(p9_nodes, ", which is:");
			p9_nodes.forEach(detach);
			t58 = claim_space(section6_nodes);
			p10 = claim_element(section6_nodes, "P", {});
			var p10_nodes = children(p10);
			strong0 = claim_element(p10_nodes, "STRONG", {});
			var strong0_nodes = children(strong0);
			t59 = claim_text(strong0_nodes, "a mundane to write, not easy to read (less intentional), but most efficient possible:");
			strong0_nodes.forEach(detach);
			p10_nodes.forEach(detach);
			t60 = claim_space(section6_nodes);
			pre0 = claim_element(section6_nodes, "PRE", { class: true });
			var pre0_nodes = children(pre0);
			pre0_nodes.forEach(detach);
			t61 = claim_space(section6_nodes);
			p11 = claim_element(section6_nodes, "P", {});
			var p11_nodes = children(p11);
			strong1 = claim_element(p11_nodes, "STRONG", {});
			var strong1_nodes = children(strong1);
			t62 = claim_text(strong1_nodes, "easy to write, easy to read, but with slightly more runtime overhead:");
			strong1_nodes.forEach(detach);
			p11_nodes.forEach(detach);
			t63 = claim_space(section6_nodes);
			pre1 = claim_element(section6_nodes, "PRE", { class: true });
			var pre1_nodes = children(pre1);
			pre1_nodes.forEach(detach);
			t64 = claim_space(section6_nodes);
			blockquote0 = claim_element(section6_nodes, "BLOCKQUOTE", {});
			var blockquote0_nodes = children(blockquote0);
			b = claim_element(blockquote0_nodes, "B", {});
			var b_nodes = children(b);
			t65 = claim_text(b_nodes, "Note:");
			b_nodes.forEach(detach);
			t66 = claim_text(blockquote0_nodes, " I've tried to search online whether a `try-catch` is more expensive, however the ");
			a21 = claim_element(blockquote0_nodes, "A", { href: true });
			var a21_nodes = children(a21);
			t67 = claim_text(a21_nodes, "search result");
			a21_nodes.forEach(detach);
			t68 = claim_space(blockquote0_nodes);
			a22 = claim_element(blockquote0_nodes, "A", { href: true });
			var a22_nodes = children(a22);
			t69 = claim_text(a22_nodes, "is not");
			a22_nodes.forEach(detach);
			t70 = claim_space(blockquote0_nodes);
			a23 = claim_element(blockquote0_nodes, "A", { href: true });
			var a23_nodes = children(a23);
			t71 = claim_text(a23_nodes, "conclusive");
			a23_nodes.forEach(detach);
			t72 = claim_text(blockquote0_nodes, ". ");
			a24 = claim_element(blockquote0_nodes, "A", { href: true });
			var a24_nodes = children(a24);
			t73 = claim_text(a24_nodes, "Let me know");
			a24_nodes.forEach(detach);
			t74 = claim_text(blockquote0_nodes, " if you have a conclusive research on this.");
			blockquote0_nodes.forEach(detach);
			t75 = claim_space(section6_nodes);
			p12 = claim_element(section6_nodes, "P", {});
			var p12_nodes = children(p12);
			t76 = claim_text(p12_nodes, "Is there a third option that is ");
			strong2 = claim_element(p12_nodes, "STRONG", {});
			var strong2_nodes = children(strong2);
			t77 = claim_text(strong2_nodes, "easy to read and write, yet without the try-catch runtime overhead?");
			strong2_nodes.forEach(detach);
			p12_nodes.forEach(detach);
			t78 = claim_space(section6_nodes);
			p13 = claim_element(section6_nodes, "P", {});
			var p13_nodes = children(p13);
			t79 = claim_text(p13_nodes, "Well, if you look at the ");
			a25 = claim_element(p13_nodes, "A", { href: true, rel: true });
			var a25_nodes = children(a25);
			code4 = claim_element(a25_nodes, "CODE", {});
			var code4_nodes = children(code4);
			t80 = claim_text(code4_nodes, "facebookincubator/idx");
			code4_nodes.forEach(detach);
			a25_nodes.forEach(detach);
			t81 = claim_text(p13_nodes, " library, it uses a ");
			a26 = claim_element(p13_nodes, "A", { href: true, rel: true });
			var a26_nodes = children(a26);
			t82 = claim_text(a26_nodes, "Babel plugin");
			a26_nodes.forEach(detach);
			t83 = claim_text(p13_nodes, " to search through require or imports of ");
			code5 = claim_element(p13_nodes, "CODE", {});
			var code5_nodes = children(code5);
			t84 = claim_text(code5_nodes, "idx");
			code5_nodes.forEach(detach);
			t85 = claim_text(p13_nodes, " and replaces all its usages, for example when you write:");
			p13_nodes.forEach(detach);
			t86 = claim_space(section6_nodes);
			pre2 = claim_element(section6_nodes, "PRE", { class: true });
			var pre2_nodes = children(pre2);
			pre2_nodes.forEach(detach);
			t87 = claim_space(section6_nodes);
			p14 = claim_element(section6_nodes, "P", {});
			var p14_nodes = children(p14);
			t88 = claim_text(p14_nodes, "it gets transformed into:");
			p14_nodes.forEach(detach);
			t89 = claim_space(section6_nodes);
			pre3 = claim_element(section6_nodes, "PRE", { class: true });
			var pre3_nodes = children(pre3);
			pre3_nodes.forEach(detach);
			t90 = claim_space(section6_nodes);
			p15 = claim_element(section6_nodes, "P", {});
			var p15_nodes = children(p15);
			t91 = claim_text(p15_nodes, "So your code is easy to read, and no runtime overhead. You get the best of both worlds!");
			p15_nodes.forEach(detach);
			t92 = claim_space(section6_nodes);
			p16 = claim_element(section6_nodes, "P", {});
			var p16_nodes = children(p16);
			t93 = claim_text(p16_nodes, "Though nothing is perfect. Here, I wanted to point out some of my personal opinions about this approach:");
			p16_nodes.forEach(detach);
			t94 = claim_space(section6_nodes);
			blockquote1 = claim_element(section6_nodes, "BLOCKQUOTE", {});
			var blockquote1_nodes = children(blockquote1);
			p17 = claim_element(blockquote1_nodes, "P", {});
			var p17_nodes = children(p17);
			t95 = claim_text(p17_nodes, "While maintaining a good developer experience (DX), we've shifted the runtime overhead to compile time.");
			p17_nodes.forEach(detach);
			blockquote1_nodes.forEach(detach);
			t96 = claim_space(section6_nodes);
			p18 = claim_element(section6_nodes, "P", {});
			var p18_nodes = children(p18);
			t97 = claim_text(p18_nodes, "You can keep the way you wanted to write the code while having the compiler to transform the code to something you are ");
			em = claim_element(p18_nodes, "EM", {});
			var em_nodes = children(em);
			t98 = claim_text(em_nodes, "\"supposed\"");
			em_nodes.forEach(detach);
			t99 = claim_text(p18_nodes, " to write.");
			p18_nodes.forEach(detach);
			t100 = claim_space(section6_nodes);
			p19 = claim_element(section6_nodes, "P", {});
			var p19_nodes = children(p19);
			t101 = claim_text(p19_nodes, "A win-win solution.");
			p19_nodes.forEach(detach);
			t102 = claim_space(section6_nodes);
			p20 = claim_element(section6_nodes, "P", {});
			var p20_nodes = children(p20);
			strong3 = claim_element(p20_nodes, "STRONG", {});
			var strong3_nodes = children(strong3);
			t103 = claim_text(strong3_nodes, "How do we apply this technique to other similar situations?");
			strong3_nodes.forEach(detach);
			p20_nodes.forEach(detach);
			t104 = claim_space(section6_nodes);
			p21 = claim_element(section6_nodes, "P", {});
			var p21_nodes = children(p21);
			t105 = claim_text(p21_nodes, "First, you need to ");
			a27 = claim_element(p21_nodes, "A", { href: true });
			var a27_nodes = children(a27);
			t106 = claim_text(a27_nodes, "write a Babel plugin");
			a27_nodes.forEach(detach);
			t107 = claim_text(p21_nodes, ".");
			p21_nodes.forEach(detach);
			t108 = claim_space(section6_nodes);
			p22 = claim_element(section6_nodes, "P", {});
			var p22_nodes = children(p22);
			t109 = claim_text(p22_nodes, "Secondly, you need a ");
			strong4 = claim_element(p22_nodes, "STRONG", {});
			var strong4_nodes = children(strong4);
			t110 = claim_text(strong4_nodes, "marker");
			strong4_nodes.forEach(detach);
			t111 = claim_text(p22_nodes, " to target the transformation.");
			p22_nodes.forEach(detach);
			t112 = claim_space(section6_nodes);
			p23 = claim_element(section6_nodes, "P", {});
			var p23_nodes = children(p23);
			t113 = claim_text(p23_nodes, "In this example, the default import from the ");
			code6 = claim_element(p23_nodes, "CODE", {});
			var code6_nodes = children(code6);
			t114 = claim_text(code6_nodes, "\"idx\"");
			code6_nodes.forEach(detach);
			t115 = claim_text(p23_nodes, " module is the ");
			strong5 = claim_element(p23_nodes, "STRONG", {});
			var strong5_nodes = children(strong5);
			t116 = claim_text(strong5_nodes, "marker");
			strong5_nodes.forEach(detach);
			t117 = claim_text(p23_nodes, ", all the usage of the default import would be transformed by the Babel plugin.");
			p23_nodes.forEach(detach);
			t118 = claim_space(section6_nodes);
			p24 = claim_element(section6_nodes, "P", {});
			var p24_nodes = children(p24);
			t119 = claim_text(p24_nodes, "Thirdly, you need to update your babel configuration. For every new plugin, ");
			strong6 = claim_element(p24_nodes, "STRONG", {});
			var strong6_nodes = children(strong6);
			t120 = claim_text(strong6_nodes, "you need to add them in");
			strong6_nodes.forEach(detach);
			t121 = claim_text(p24_nodes, "; ");
			strong7 = claim_element(p24_nodes, "STRONG", {});
			var strong7_nodes = children(strong7);
			t122 = claim_text(strong7_nodes, "you need to make sure the order of plugin is correct");
			strong7_nodes.forEach(detach);
			t123 = claim_text(p24_nodes, ".");
			p24_nodes.forEach(detach);
			t124 = claim_space(section6_nodes);
			p25 = claim_element(section6_nodes, "P", {});
			var p25_nodes = children(p25);
			strong8 = claim_element(p25_nodes, "STRONG", {});
			var strong8_nodes = children(strong8);
			t125 = claim_text(strong8_nodes, "What if there's a bug in the Babel plugin?");
			strong8_nodes.forEach(detach);
			p25_nodes.forEach(detach);
			t126 = claim_space(section6_nodes);
			p26 = claim_element(section6_nodes, "P", {});
			var p26_nodes = children(p26);
			t127 = claim_text(p26_nodes, "This would be the most confusing part for the new developers on the codebase.");
			p26_nodes.forEach(detach);
			t128 = claim_space(section6_nodes);
			p27 = claim_element(section6_nodes, "P", {});
			var p27_nodes = children(p27);
			t129 = claim_text(p27_nodes, "In this example, if the ");
			code7 = claim_element(p27_nodes, "CODE", {});
			var code7_nodes = children(code7);
			t130 = claim_text(code7_nodes, "idx");
			code7_nodes.forEach(detach);
			t131 = claim_text(p27_nodes, " function has a bug, it is natural for developers to dig into the source code of ");
			code8 = claim_element(p27_nodes, "CODE", {});
			var code8_nodes = children(code8);
			t132 = claim_text(code8_nodes, "idx");
			code8_nodes.forEach(detach);
			t133 = claim_text(p27_nodes, ". However, ");
			code9 = claim_element(p27_nodes, "CODE", {});
			var code9_nodes = children(code9);
			t134 = claim_text(code9_nodes, "\"idx\"");
			code9_nodes.forEach(detach);
			t135 = claim_text(p27_nodes, " is nothing but a ");
			strong9 = claim_element(p27_nodes, "STRONG", {});
			var strong9_nodes = children(strong9);
			t136 = claim_text(strong9_nodes, "marker");
			strong9_nodes.forEach(detach);
			t137 = claim_text(p27_nodes, " for the ");
			code10 = claim_element(p27_nodes, "CODE", {});
			var code10_nodes = children(code10);
			t138 = claim_text(code10_nodes, "babel-plugin-idx");
			code10_nodes.forEach(detach);
			t139 = claim_text(p27_nodes, " to transform away. So if there's any bug, it should be inside ");
			code11 = claim_element(p27_nodes, "CODE", {});
			var code11_nodes = children(code11);
			t140 = claim_text(code11_nodes, "babel-plugin-idx");
			code11_nodes.forEach(detach);
			t141 = claim_text(p27_nodes, " instead of ");
			code12 = claim_element(p27_nodes, "CODE", {});
			var code12_nodes = children(code12);
			t142 = claim_text(code12_nodes, "idx");
			code12_nodes.forEach(detach);
			t143 = claim_text(p27_nodes, ".");
			p27_nodes.forEach(detach);
			t144 = claim_space(section6_nodes);
			p28 = claim_element(section6_nodes, "P", {});
			var p28_nodes = children(p28);
			t145 = claim_text(p28_nodes, "Besides, the bug may be due to the configuration of the Babel plugin instead of the code logic itself. However if you change the configuration, it could affect all the usages of the ");
			code13 = claim_element(p28_nodes, "CODE", {});
			var code13_nodes = children(code13);
			t146 = claim_text(code13_nodes, "idx");
			code13_nodes.forEach(detach);
			t147 = claim_text(p28_nodes, " function, because ");
			strong10 = claim_element(p28_nodes, "STRONG", {});
			var strong10_nodes = children(strong10);
			t148 = claim_text(strong10_nodes, "babel configuration is global");
			strong10_nodes.forEach(detach);
			t149 = claim_text(p28_nodes, ".");
			p28_nodes.forEach(detach);
			t150 = claim_space(section6_nodes);
			hr = claim_element(section6_nodes, "HR", {});
			t151 = claim_space(section6_nodes);
			p29 = claim_element(section6_nodes, "P", {});
			var p29_nodes = children(p29);
			t152 = claim_text(p29_nodes, "To summarise, I think that this solution is a win-win for DX vs User Experience (UX), however, if we can make the transform plugin more accessible to all developers, eg: without having to update babel configuration for every new transform plugin, easier to debug, and a localized configuration.");
			p29_nodes.forEach(detach);
			t153 = claim_space(section6_nodes);
			p30 = claim_element(section6_nodes, "P", {});
			var p30_nodes = children(p30);
			t154 = claim_text(p30_nodes, "Well, you are looking at ");
			a28 = claim_element(p30_nodes, "A", { href: true, rel: true });
			var a28_nodes = children(a28);
			t155 = claim_text(a28_nodes, "babel macros");
			a28_nodes.forEach(detach);
			t156 = claim_text(p30_nodes, ". 👀");
			p30_nodes.forEach(detach);
			section6_nodes.forEach(detach);
			t157 = claim_space(nodes);
			section7 = claim_element(nodes, "SECTION", {});
			var section7_nodes = children(section7);
			h22 = claim_element(section7_nodes, "H2", {});
			var h22_nodes = children(h22);
			a29 = claim_element(h22_nodes, "A", { href: true, id: true });
			var a29_nodes = children(a29);
			t158 = claim_text(a29_nodes, "Babel macros");
			a29_nodes.forEach(detach);
			h22_nodes.forEach(detach);
			t159 = claim_space(section7_nodes);
			p31 = claim_element(section7_nodes, "P", {});
			var p31_nodes = children(p31);
			t160 = claim_text(p31_nodes, "So, here's how it would look like with babel macro:");
			p31_nodes.forEach(detach);
			t161 = claim_space(section7_nodes);
			p32 = claim_element(section7_nodes, "P", {});
			var p32_nodes = children(p32);
			strong11 = claim_element(p32_nodes, "STRONG", {});
			var strong11_nodes = children(strong11);
			t162 = claim_text(strong11_nodes, "You add ");
			code14 = claim_element(strong11_nodes, "CODE", {});
			var code14_nodes = children(code14);
			t163 = claim_text(code14_nodes, "babel-plugin-macro");
			code14_nodes.forEach(detach);
			t164 = claim_text(strong11_nodes, " to babel config");
			strong11_nodes.forEach(detach);
			p32_nodes.forEach(detach);
			t165 = claim_space(section7_nodes);
			p33 = claim_element(section7_nodes, "P", {});
			var p33_nodes = children(p33);
			t166 = claim_text(p33_nodes, "And that's all the change you need for babel configuration.");
			p33_nodes.forEach(detach);
			t167 = claim_space(section7_nodes);
			pre4 = claim_element(section7_nodes, "PRE", { class: true });
			var pre4_nodes = children(pre4);
			pre4_nodes.forEach(detach);
			t168 = claim_space(section7_nodes);
			p34 = claim_element(section7_nodes, "P", {});
			var p34_nodes = children(p34);
			strong12 = claim_element(p34_nodes, "STRONG", {});
			var strong12_nodes = children(strong12);
			t169 = claim_text(strong12_nodes, "You write your own macro");
			strong12_nodes.forEach(detach);
			p34_nodes.forEach(detach);
			t170 = claim_space(section7_nodes);
			pre5 = claim_element(section7_nodes, "PRE", { class: true });
			var pre5_nodes = children(pre5);
			pre5_nodes.forEach(detach);
			t171 = claim_space(section7_nodes);
			p35 = claim_element(section7_nodes, "P", {});
			var p35_nodes = children(p35);
			t172 = claim_text(p35_nodes, "We'll talk about the code later, one thing to take away here is that your filename has to end with ");
			code15 = claim_element(p35_nodes, "CODE", {});
			var code15_nodes = children(code15);
			t173 = claim_text(code15_nodes, ".macro");
			code15_nodes.forEach(detach);
			t174 = claim_text(p35_nodes, " or ");
			code16 = claim_element(p35_nodes, "CODE", {});
			var code16_nodes = children(code16);
			t175 = claim_text(code16_nodes, ".macro.js");
			code16_nodes.forEach(detach);
			t176 = claim_text(p35_nodes, ".");
			p35_nodes.forEach(detach);
			t177 = claim_space(section7_nodes);
			p36 = claim_element(section7_nodes, "P", {});
			var p36_nodes = children(p36);
			strong13 = claim_element(p36_nodes, "STRONG", {});
			var strong13_nodes = children(strong13);
			t178 = claim_text(strong13_nodes, "Use it");
			strong13_nodes.forEach(detach);
			p36_nodes.forEach(detach);
			t179 = claim_space(section7_nodes);
			pre6 = claim_element(section7_nodes, "PRE", { class: true });
			var pre6_nodes = children(pre6);
			pre6_nodes.forEach(detach);
			t180 = claim_space(section7_nodes);
			p37 = claim_element(section7_nodes, "P", {});
			var p37_nodes = children(p37);
			t181 = claim_text(p37_nodes, "As you can see here, if there's something wrong about ");
			code17 = claim_element(p37_nodes, "CODE", {});
			var code17_nodes = children(code17);
			t182 = claim_text(code17_nodes, "idx");
			code17_nodes.forEach(detach);
			t183 = claim_text(p37_nodes, ", the user would know which file exactly to look at.");
			p37_nodes.forEach(detach);
			t184 = claim_space(section7_nodes);
			p38 = claim_element(section7_nodes, "P", {});
			var p38_nodes = children(p38);
			t185 = claim_text(p38_nodes, "You don't get the disconnection between the module ");
			code18 = claim_element(p38_nodes, "CODE", {});
			var code18_nodes = children(code18);
			t186 = claim_text(code18_nodes, "idx");
			code18_nodes.forEach(detach);
			t187 = claim_text(p38_nodes, " and the plugin ");
			code19 = claim_element(p38_nodes, "CODE", {});
			var code19_nodes = children(code19);
			t188 = claim_text(code19_nodes, "babel-plugin-idx");
			code19_nodes.forEach(detach);
			t189 = claim_text(p38_nodes, ".");
			p38_nodes.forEach(detach);
			t190 = claim_space(section7_nodes);
			p39 = claim_element(section7_nodes, "P", {});
			var p39_nodes = children(p39);
			t191 = claim_text(p39_nodes, "Besides, if you want to modify configuration, say for this usage, you can do it easily:");
			p39_nodes.forEach(detach);
			t192 = claim_space(section7_nodes);
			pre7 = claim_element(section7_nodes, "PRE", { class: true });
			var pre7_nodes = children(pre7);
			pre7_nodes.forEach(detach);
			t193 = claim_space(section7_nodes);
			p40 = claim_element(section7_nodes, "P", {});
			var p40_nodes = children(p40);
			t194 = claim_text(p40_nodes, "Simple and explicit. Isn't that great?");
			p40_nodes.forEach(detach);
			section7_nodes.forEach(detach);
			t195 = claim_space(nodes);
			section8 = claim_element(nodes, "SECTION", {});
			var section8_nodes = children(section8);
			h34 = claim_element(section8_nodes, "H3", {});
			var h34_nodes = children(h34);
			a30 = claim_element(h34_nodes, "A", { href: true, id: true });
			var a30_nodes = children(a30);
			t196 = claim_text(a30_nodes, "So what is Babel macros again?");
			a30_nodes.forEach(detach);
			h34_nodes.forEach(detach);
			t197 = claim_space(section8_nodes);
			p41 = claim_element(section8_nodes, "P", {});
			var p41_nodes = children(p41);
			strong14 = claim_element(p41_nodes, "STRONG", {});
			var strong14_nodes = children(strong14);
			t198 = claim_text(strong14_nodes, "Babel macros");
			strong14_nodes.forEach(detach);
			t199 = claim_text(p41_nodes, " is a concept from the ");
			a31 = claim_element(p41_nodes, "A", { href: true, rel: true });
			var a31_nodes = children(a31);
			code20 = claim_element(a31_nodes, "CODE", {});
			var code20_nodes = children(code20);
			t200 = claim_text(code20_nodes, "babel-plugin-macros");
			code20_nodes.forEach(detach);
			a31_nodes.forEach(detach);
			t201 = claim_text(p41_nodes, ", which defines the standard interface between compile-time code transformation and your runtime code.");
			p41_nodes.forEach(detach);
			t202 = claim_space(section8_nodes);
			p42 = claim_element(section8_nodes, "P", {});
			var p42_nodes = children(p42);
			t203 = claim_text(p42_nodes, "In compile-time, ");
			code21 = claim_element(p42_nodes, "CODE", {});
			var code21_nodes = children(code21);
			t204 = claim_text(code21_nodes, "babel-plugin-macros");
			code21_nodes.forEach(detach);
			t205 = claim_text(p42_nodes, " will look for all ");
			code22 = claim_element(p42_nodes, "CODE", {});
			var code22_nodes = children(code22);
			t206 = claim_text(code22_nodes, "import");
			code22_nodes.forEach(detach);
			t207 = claim_text(p42_nodes, " or ");
			code23 = claim_element(p42_nodes, "CODE", {});
			var code23_nodes = children(code23);
			t208 = claim_text(code23_nodes, "require");
			code23_nodes.forEach(detach);
			t209 = claim_text(p42_nodes, " from modules ends with ");
			code24 = claim_element(p42_nodes, "CODE", {});
			var code24_nodes = children(code24);
			t210 = claim_text(code24_nodes, ".macro");
			code24_nodes.forEach(detach);
			t211 = claim_text(p42_nodes, ", finds all references of the imported variables, and passes them to the ");
			code25 = claim_element(p42_nodes, "CODE", {});
			var code25_nodes = children(code25);
			t212 = claim_text(code25_nodes, ".macro");
			code25_nodes.forEach(detach);
			t213 = claim_text(p42_nodes, " file to transform them.");
			p42_nodes.forEach(detach);
			t214 = claim_space(section8_nodes);
			p43 = claim_element(section8_nodes, "P", {});
			var p43_nodes = children(p43);
			t215 = claim_text(p43_nodes, "The imported variables are not restricted to be a function, it can be a variable, a type from type system (Flow / TypeScript).");
			p43_nodes.forEach(detach);
			t216 = claim_space(section8_nodes);
			p44 = claim_element(section8_nodes, "P", {});
			var p44_nodes = children(p44);
			t217 = claim_text(p44_nodes, "If it is a default export, you can name it any way you like, if it is a named export, you can reassign to another variable name too.");
			p44_nodes.forEach(detach);
			t218 = claim_space(section8_nodes);
			p45 = claim_element(section8_nodes, "P", {});
			var p45_nodes = children(p45);
			t219 = claim_text(p45_nodes, "Cool, so how can I write my Babel macros?");
			p45_nodes.forEach(detach);
			section8_nodes.forEach(detach);
			t220 = claim_space(nodes);
			section9 = claim_element(nodes, "SECTION", {});
			var section9_nodes = children(section9);
			h23 = claim_element(section9_nodes, "H2", {});
			var h23_nodes = children(h23);
			a32 = claim_element(h23_nodes, "A", { href: true, id: true });
			var a32_nodes = children(a32);
			t221 = claim_text(a32_nodes, "How to write Babel macros");
			a32_nodes.forEach(detach);
			h23_nodes.forEach(detach);
			t222 = claim_space(section9_nodes);
			p46 = claim_element(section9_nodes, "P", {});
			var p46_nodes = children(p46);
			a33 = claim_element(p46_nodes, "A", { href: true, rel: true });
			var a33_nodes = children(a33);
			t223 = claim_text(a33_nodes, "Kent C Dodds");
			a33_nodes.forEach(detach);
			t224 = claim_text(p46_nodes, " has written ");
			a34 = claim_element(p46_nodes, "A", { href: true, rel: true });
			var a34_nodes = children(a34);
			t225 = claim_text(a34_nodes, "a fantastic guide for macro authors");
			a34_nodes.forEach(detach);
			t226 = claim_text(p46_nodes, ".");
			p46_nodes.forEach(detach);
			t227 = claim_space(section9_nodes);
			p47 = claim_element(section9_nodes, "P", {});
			var p47_nodes = children(p47);
			t228 = claim_text(p47_nodes, "Please go read it.");
			p47_nodes.forEach(detach);
			t229 = claim_space(section9_nodes);
			p48 = claim_element(section9_nodes, "P", {});
			var p48_nodes = children(p48);
			t230 = claim_text(p48_nodes, "If you insist to stay, I am going to show you how I wrote my Babel macros, in particular, the ");
			a35 = claim_element(p48_nodes, "A", { href: true, rel: true });
			var a35_nodes = children(a35);
			t231 = claim_text(a35_nodes, "mock.macro");
			a35_nodes.forEach(detach);
			t232 = claim_text(p48_nodes, ". And hopefully, along the way, you learned how to write your Babel macros as well.");
			p48_nodes.forEach(detach);
			section9_nodes.forEach(detach);
			t233 = claim_space(nodes);
			section10 = claim_element(nodes, "SECTION", {});
			var section10_nodes = children(section10);
			h35 = claim_element(section10_nodes, "H3", {});
			var h35_nodes = children(h35);
			a36 = claim_element(h35_nodes, "A", { href: true, id: true });
			var a36_nodes = children(a36);
			t234 = claim_text(a36_nodes, "mock.macro");
			a36_nodes.forEach(detach);
			h35_nodes.forEach(detach);
			t235 = claim_space(section10_nodes);
			p49 = claim_element(section10_nodes, "P", {});
			var p49_nodes = children(p49);
			strong15 = claim_element(p49_nodes, "STRONG", {});
			var strong15_nodes = children(strong15);
			t236 = claim_text(strong15_nodes, "Motivation");
			strong15_nodes.forEach(detach);
			p49_nodes.forEach(detach);
			t237 = claim_space(section10_nodes);
			p50 = claim_element(section10_nodes, "P", {});
			var p50_nodes = children(p50);
			t238 = claim_text(p50_nodes, "Usually, when working with a backend developer on a frontend application, I would use static type to define the API schema. For example, a user api would look like this:");
			p50_nodes.forEach(detach);
			t239 = claim_space(section10_nodes);
			pre8 = claim_element(section10_nodes, "PRE", { class: true });
			var pre8_nodes = children(pre8);
			pre8_nodes.forEach(detach);
			t240 = claim_space(section10_nodes);
			p51 = claim_element(section10_nodes, "P", {});
			var p51_nodes = children(p51);
			t241 = claim_text(p51_nodes, "However while waiting for the backend developer to develop the API, I would have to use mock data for development:");
			p51_nodes.forEach(detach);
			t242 = claim_space(section10_nodes);
			pre9 = claim_element(section10_nodes, "PRE", { class: true });
			var pre9_nodes = children(pre9);
			pre9_nodes.forEach(detach);
			t243 = claim_space(section10_nodes);
			p52 = claim_element(section10_nodes, "P", {});
			var p52_nodes = children(p52);
			t244 = claim_text(p52_nodes, "And along the way, due to unforeseen circumstances and lack of foresight, the response schema of the API was changed multiple times:");
			p52_nodes.forEach(detach);
			t245 = claim_space(section10_nodes);
			pre10 = claim_element(section10_nodes, "PRE", { class: true });
			var pre10_nodes = children(pre10);
			pre10_nodes.forEach(detach);
			t246 = claim_space(section10_nodes);
			p53 = claim_element(section10_nodes, "P", {});
			var p53_nodes = children(p53);
			t247 = claim_text(p53_nodes, "Here you see I need to update both the type definition as well as the mock data. This reminds me of ");
			a37 = claim_element(p53_nodes, "A", { href: true, rel: true });
			var a37_nodes = children(a37);
			t248 = claim_text(a37_nodes, "the double declaration problem");
			a37_nodes.forEach(detach);
			t249 = claim_text(p53_nodes, " coined by ");
			a38 = claim_element(p53_nodes, "A", { href: true, rel: true });
			var a38_nodes = children(a38);
			t250 = claim_text(a38_nodes, "@swyx");
			a38_nodes.forEach(detach);
			t251 = claim_space(p53_nodes);
			a39 = claim_element(p53_nodes, "A", { href: true, rel: true });
			var a39_nodes = children(a39);
			t252 = claim_text(a39_nodes, "in his talk");
			a39_nodes.forEach(detach);
			t253 = claim_text(p53_nodes, ". Which means that this could potentially be solved with Babel macros.");
			p53_nodes.forEach(detach);
			t254 = claim_space(section10_nodes);
			p54 = claim_element(section10_nodes, "P", {});
			var p54_nodes = children(p54);
			t255 = claim_text(p54_nodes, "So in my head, I imagined with Babel macros, I could write:");
			p54_nodes.forEach(detach);
			t256 = claim_space(section10_nodes);
			pre11 = claim_element(section10_nodes, "PRE", { class: true });
			var pre11_nodes = children(pre11);
			pre11_nodes.forEach(detach);
			t257 = claim_space(section10_nodes);
			p55 = claim_element(section10_nodes, "P", {});
			var p55_nodes = children(p55);
			t258 = claim_text(p55_nodes, "and when I call the function ");
			code26 = claim_element(p55_nodes, "CODE", {});
			var code26_nodes = children(code26);
			t259 = claim_text(code26_nodes, "fetchUser");
			code26_nodes.forEach(detach);
			t260 = claim_text(p55_nodes, ", I would get my mock response in return.");
			p55_nodes.forEach(detach);
			t261 = claim_space(section10_nodes);
			p56 = claim_element(section10_nodes, "P", {});
			var p56_nodes = children(p56);
			strong16 = claim_element(p56_nodes, "STRONG", {});
			var strong16_nodes = children(strong16);
			t262 = claim_text(strong16_nodes, "Implementing mock.macro");
			strong16_nodes.forEach(detach);
			p56_nodes.forEach(detach);
			t263 = claim_space(section10_nodes);
			p57 = claim_element(section10_nodes, "P", {});
			var p57_nodes = children(p57);
			t264 = claim_text(p57_nodes, "Implementing mock.macro requires some basic knowledge about Abstract Syntax Tree (AST) and writing babel transformation, you can check out ");
			a40 = claim_element(p57_nodes, "A", { href: true });
			var a40_nodes = children(a40);
			t265 = claim_text(a40_nodes, "the step-by-step guide I've written previously");
			a40_nodes.forEach(detach);
			t266 = claim_text(p57_nodes, ".");
			p57_nodes.forEach(detach);
			t267 = claim_space(section10_nodes);
			p58 = claim_element(section10_nodes, "P", {});
			var p58_nodes = children(p58);
			t268 = claim_text(p58_nodes, "Implementing Babel macros is quite easy, the api from the ");
			code27 = claim_element(p58_nodes, "CODE", {});
			var code27_nodes = children(code27);
			t269 = claim_text(code27_nodes, "babel-plugin-macros");
			code27_nodes.forEach(detach);
			t270 = claim_text(p58_nodes, " is pretty straightforward, all you need is to provide a default export to your macro file:");
			p58_nodes.forEach(detach);
			t271 = claim_space(section10_nodes);
			pre12 = claim_element(section10_nodes, "PRE", { class: true });
			var pre12_nodes = children(pre12);
			pre12_nodes.forEach(detach);
			t272 = claim_space(section10_nodes);
			p59 = claim_element(section10_nodes, "P", {});
			var p59_nodes = children(p59);
			code28 = claim_element(p59_nodes, "CODE", {});
			var code28_nodes = children(code28);
			t273 = claim_text(code28_nodes, "createMacro");
			code28_nodes.forEach(detach);
			t274 = claim_text(p59_nodes, " takes in a callback function, which is executed when someone imports this macro file. It provides:");
			p59_nodes.forEach(detach);
			t275 = claim_space(section10_nodes);
			ul4 = claim_element(section10_nodes, "UL", {});
			var ul4_nodes = children(ul4);
			li12 = claim_element(ul4_nodes, "LI", {});
			var li12_nodes = children(li12);
			strong17 = claim_element(li12_nodes, "STRONG", {});
			var strong17_nodes = children(strong17);
			t276 = claim_text(strong17_nodes, "references");
			strong17_nodes.forEach(detach);
			li12_nodes.forEach(detach);
			ul4_nodes.forEach(detach);
			t277 = claim_space(section10_nodes);
			p60 = claim_element(section10_nodes, "P", {});
			var p60_nodes = children(p60);
			t278 = claim_text(p60_nodes, "All the reference that was imported from the macro file.");
			p60_nodes.forEach(detach);
			t279 = claim_space(section10_nodes);
			p61 = claim_element(section10_nodes, "P", {});
			var p61_nodes = children(p61);
			t280 = claim_text(p61_nodes, "For example:");
			p61_nodes.forEach(detach);
			t281 = claim_space(section10_nodes);
			pre13 = claim_element(section10_nodes, "PRE", { class: true });
			var pre13_nodes = children(pre13);
			pre13_nodes.forEach(detach);
			t282 = claim_space(section10_nodes);
			p62 = claim_element(section10_nodes, "P", {});
			var p62_nodes = children(p62);
			t283 = claim_text(p62_nodes, "will give you an object, with the import name as the ");
			code29 = claim_element(p62_nodes, "CODE", {});
			var code29_nodes = children(code29);
			t284 = claim_text(code29_nodes, "key");
			code29_nodes.forEach(detach);
			t285 = claim_text(p62_nodes, ", and array of paths as the ");
			code30 = claim_element(p62_nodes, "CODE", {});
			var code30_nodes = children(code30);
			t286 = claim_text(code30_nodes, "value");
			code30_nodes.forEach(detach);
			t287 = claim_text(p62_nodes, ":");
			p62_nodes.forEach(detach);
			t288 = claim_space(section10_nodes);
			pre14 = claim_element(section10_nodes, "PRE", { class: true });
			var pre14_nodes = children(pre14);
			pre14_nodes.forEach(detach);
			t289 = claim_space(section10_nodes);
			p63 = claim_element(section10_nodes, "P", {});
			var p63_nodes = children(p63);
			t290 = claim_text(p63_nodes, "Inside the array, you can get all paths where the imported names are referenced. For example:");
			p63_nodes.forEach(detach);
			t291 = claim_space(section10_nodes);
			pre15 = claim_element(section10_nodes, "PRE", { class: true });
			var pre15_nodes = children(pre15);
			pre15_nodes.forEach(detach);
			t292 = claim_space(section10_nodes);
			ul5 = claim_element(section10_nodes, "UL", {});
			var ul5_nodes = children(ul5);
			li13 = claim_element(ul5_nodes, "LI", {});
			var li13_nodes = children(li13);
			strong18 = claim_element(li13_nodes, "STRONG", {});
			var strong18_nodes = children(strong18);
			t293 = claim_text(strong18_nodes, "state");
			strong18_nodes.forEach(detach);
			li13_nodes.forEach(detach);
			ul5_nodes.forEach(detach);
			t294 = claim_space(section10_nodes);
			p64 = claim_element(section10_nodes, "P", {});
			var p64_nodes = children(p64);
			t295 = claim_text(p64_nodes, "It gives you the current state of the file being traversed.");
			p64_nodes.forEach(detach);
			t296 = claim_space(section10_nodes);
			p65 = claim_element(section10_nodes, "P", {});
			var p65_nodes = children(p65);
			t297 = claim_text(p65_nodes, "So, in this example, I need to transform all the references of ");
			code31 = claim_element(p65_nodes, "CODE", {});
			var code31_nodes = children(code31);
			t298 = claim_text(code31_nodes, "MockResponse");
			code31_nodes.forEach(detach);
			t299 = claim_text(p65_nodes, ":");
			p65_nodes.forEach(detach);
			t300 = claim_space(section10_nodes);
			pre16 = claim_element(section10_nodes, "PRE", { class: true });
			var pre16_nodes = children(pre16);
			pre16_nodes.forEach(detach);
			t301 = claim_space(section10_nodes);
			p66 = claim_element(section10_nodes, "P", {});
			var p66_nodes = children(p66);
			t302 = claim_text(p66_nodes, "Next, I need to figure out how the transformed code would look like:");
			p66_nodes.forEach(detach);
			t303 = claim_space(section10_nodes);
			pre17 = claim_element(section10_nodes, "PRE", { class: true });
			var pre17_nodes = children(pre17);
			pre17_nodes.forEach(detach);
			t304 = claim_space(section10_nodes);
			p67 = claim_element(section10_nodes, "P", {});
			var p67_nodes = children(p67);
			t305 = claim_text(p67_nodes, "I decided to use ");
			a41 = claim_element(p67_nodes, "A", { href: true, rel: true });
			var a41_nodes = children(a41);
			t306 = claim_text(a41_nodes, "faker.js");
			a41_nodes.forEach(detach);
			t307 = claim_text(p67_nodes, " as the random data generator.");
			p67_nodes.forEach(detach);
			t308 = claim_space(section10_nodes);
			p68 = claim_element(section10_nodes, "P", {});
			var p68_nodes = children(p68);
			t309 = claim_text(p68_nodes, "So I have to import ");
			code32 = claim_element(p68_nodes, "CODE", {});
			var code32_nodes = children(code32);
			t310 = claim_text(code32_nodes, "faker");
			code32_nodes.forEach(detach);
			t311 = claim_text(p68_nodes, " at the top of the file:");
			p68_nodes.forEach(detach);
			t312 = claim_space(section10_nodes);
			pre18 = claim_element(section10_nodes, "PRE", { class: true });
			var pre18_nodes = children(pre18);
			pre18_nodes.forEach(detach);
			t313 = claim_space(section10_nodes);
			p69 = claim_element(section10_nodes, "P", {});
			var p69_nodes = children(p69);
			t314 = claim_text(p69_nodes, "Next, for each references of ");
			code33 = claim_element(p69_nodes, "CODE", {});
			var code33_nodes = children(code33);
			t315 = claim_text(code33_nodes, "MockRespone");
			code33_nodes.forEach(detach);
			t316 = claim_text(p69_nodes, ", I need to find the ");
			code34 = claim_element(p69_nodes, "CODE", {});
			var code34_nodes = children(code34);
			t317 = claim_text(code34_nodes, "FunctionDeclaration");
			code34_nodes.forEach(detach);
			t318 = claim_text(p69_nodes, " that it belongs to, and insert a ");
			code35 = claim_element(p69_nodes, "CODE", {});
			var code35_nodes = children(code35);
			t319 = claim_text(code35_nodes, "ReturnStatement");
			code35_nodes.forEach(detach);
			t320 = claim_text(p69_nodes, " into the top of the function body:");
			p69_nodes.forEach(detach);
			t321 = claim_space(section10_nodes);
			pre19 = claim_element(section10_nodes, "PRE", { class: true });
			var pre19_nodes = children(pre19);
			pre19_nodes.forEach(detach);
			t322 = claim_space(section10_nodes);
			p70 = claim_element(section10_nodes, "P", {});
			var p70_nodes = children(p70);
			t323 = claim_text(p70_nodes, "In the ");
			code36 = claim_element(p70_nodes, "CODE", {});
			var code36_nodes = children(code36);
			t324 = claim_text(code36_nodes, "generateFakerCode");
			code36_nodes.forEach(detach);
			t325 = claim_text(p70_nodes, ", I'll generate a AST node based on the node type of the ");
			code37 = claim_element(p70_nodes, "CODE", {});
			var code37_nodes = children(code37);
			t326 = claim_text(code37_nodes, "typeDef");
			code37_nodes.forEach(detach);
			t327 = claim_text(p70_nodes, ":");
			p70_nodes.forEach(detach);
			t328 = claim_space(section10_nodes);
			pre20 = claim_element(section10_nodes, "PRE", { class: true });
			var pre20_nodes = children(pre20);
			pre20_nodes.forEach(detach);
			t329 = claim_space(section10_nodes);
			p71 = claim_element(section10_nodes, "P", {});
			var p71_nodes = children(p71);
			t330 = claim_text(p71_nodes, "That's it! A generated mock function via type definition using Babel macros.");
			p71_nodes.forEach(detach);
			t331 = claim_space(section10_nodes);
			p72 = claim_element(section10_nodes, "P", {});
			var p72_nodes = children(p72);
			t332 = claim_text(p72_nodes, "One last thing, what happens when the API is ready, and you want to disable the mocking behavior?");
			p72_nodes.forEach(detach);
			t333 = claim_space(section10_nodes);
			p73 = claim_element(section10_nodes, "P", {});
			var p73_nodes = children(p73);
			t334 = claim_text(p73_nodes, "We can read the 2nd parameter of the ");
			code38 = claim_element(p73_nodes, "CODE", {});
			var code38_nodes = children(code38);
			t335 = claim_text(code38_nodes, "MockResponse");
			code38_nodes.forEach(detach);
			t336 = claim_text(p73_nodes, ":");
			p73_nodes.forEach(detach);
			t337 = claim_space(section10_nodes);
			pre21 = claim_element(section10_nodes, "PRE", { class: true });
			var pre21_nodes = children(pre21);
			pre21_nodes.forEach(detach);
			t338 = claim_space(section10_nodes);
			p74 = claim_element(section10_nodes, "P", {});
			var p74_nodes = children(p74);
			t339 = claim_text(p74_nodes, "If the 2nd parameter is ");
			code39 = claim_element(p74_nodes, "CODE", {});
			var code39_nodes = children(code39);
			t340 = claim_text(code39_nodes, "false");
			code39_nodes.forEach(detach);
			t341 = claim_text(p74_nodes, ", we disable the mocking behavior:");
			p74_nodes.forEach(detach);
			t342 = claim_space(section10_nodes);
			pre22 = claim_element(section10_nodes, "PRE", { class: true });
			var pre22_nodes = children(pre22);
			pre22_nodes.forEach(detach);
			t343 = claim_space(section10_nodes);
			blockquote2 = claim_element(section10_nodes, "BLOCKQUOTE", {});
			var blockquote2_nodes = children(blockquote2);
			p75 = claim_element(blockquote2_nodes, "P", {});
			var p75_nodes = children(p75);
			t344 = claim_text(p75_nodes, "You can find the full code from ");
			a42 = claim_element(p75_nodes, "A", { href: true, rel: true });
			var a42_nodes = children(a42);
			t345 = claim_text(a42_nodes, "Github");
			a42_nodes.forEach(detach);
			t346 = claim_text(p75_nodes, ".");
			p75_nodes.forEach(detach);
			blockquote2_nodes.forEach(detach);
			section10_nodes.forEach(detach);
			t347 = claim_space(nodes);
			section11 = claim_element(nodes, "SECTION", {});
			var section11_nodes = children(section11);
			h24 = claim_element(section11_nodes, "H2", {});
			var h24_nodes = children(h24);
			a43 = claim_element(h24_nodes, "A", { href: true, id: true });
			var a43_nodes = children(a43);
			t348 = claim_text(a43_nodes, "Summary");
			a43_nodes.forEach(detach);
			h24_nodes.forEach(detach);
			t349 = claim_space(section11_nodes);
			p76 = claim_element(section11_nodes, "P", {});
			var p76_nodes = children(p76);
			t350 = claim_text(p76_nodes, "Sometimes, it is more efficient to move runtime abstraction and complexity to compile time. However, developing and maintaining a babel plugin for each of them may be difficult to maintain and debug, as there's a gap between the code written and build time plugin, eg: ");
			code40 = claim_element(p76_nodes, "CODE", {});
			var code40_nodes = children(code40);
			t351 = claim_text(code40_nodes, "idx");
			code40_nodes.forEach(detach);
			t352 = claim_text(p76_nodes, " and ");
			code41 = claim_element(p76_nodes, "CODE", {});
			var code41_nodes = children(code41);
			t353 = claim_text(code41_nodes, "babel-plugin-idx");
			code41_nodes.forEach(detach);
			t354 = claim_text(p76_nodes, ".");
			p76_nodes.forEach(detach);
			t355 = claim_space(section11_nodes);
			p77 = claim_element(section11_nodes, "P", {});
			var p77_nodes = children(p77);
			code42 = claim_element(p77_nodes, "CODE", {});
			var code42_nodes = children(code42);
			t356 = claim_text(code42_nodes, "babel-plugin-macros");
			code42_nodes.forEach(detach);
			t357 = claim_text(p77_nodes, " solves this by allow users to import ");
			code43 = claim_element(p77_nodes, "CODE", {});
			var code43_nodes = children(code43);
			t358 = claim_text(code43_nodes, ".macro");
			code43_nodes.forEach(detach);
			t359 = claim_text(p77_nodes, " files directly into the codebase. The explicit import bridges the gap between build-time and runtime and allows the user to develop and debug their macro easily.");
			p77_nodes.forEach(detach);
			section11_nodes.forEach(detach);
			t360 = claim_space(nodes);
			section12 = claim_element(nodes, "SECTION", {});
			var section12_nodes = children(section12);
			h25 = claim_element(section12_nodes, "H2", {});
			var h25_nodes = children(h25);
			a44 = claim_element(h25_nodes, "A", { href: true, id: true });
			var a44_nodes = children(a44);
			t361 = claim_text(a44_nodes, "Further Reading");
			a44_nodes.forEach(detach);
			h25_nodes.forEach(detach);
			t362 = claim_space(section12_nodes);
			ul6 = claim_element(section12_nodes, "UL", {});
			var ul6_nodes = children(ul6);
			li14 = claim_element(ul6_nodes, "LI", {});
			var li14_nodes = children(li14);
			a45 = claim_element(li14_nodes, "A", { href: true, rel: true });
			var a45_nodes = children(a45);
			t363 = claim_text(a45_nodes, "babel-plugin-macros");
			a45_nodes.forEach(detach);
			t364 = claim_text(li14_nodes, " by ");
			a46 = claim_element(li14_nodes, "A", { href: true, rel: true });
			var a46_nodes = children(a46);
			t365 = claim_text(a46_nodes, "Kent C. Dodds");
			a46_nodes.forEach(detach);
			li14_nodes.forEach(detach);
			t366 = claim_space(ul6_nodes);
			li15 = claim_element(ul6_nodes, "LI", {});
			var li15_nodes = children(li15);
			a47 = claim_element(li15_nodes, "A", { href: true, rel: true });
			var a47_nodes = children(a47);
			t367 = claim_text(a47_nodes, "I Can Babel Macros (and So Can You!)");
			a47_nodes.forEach(detach);
			t368 = claim_text(li15_nodes, " by ");
			a48 = claim_element(li15_nodes, "A", { href: true, rel: true });
			var a48_nodes = children(a48);
			t369 = claim_text(a48_nodes, "Shawn Wang");
			a48_nodes.forEach(detach);
			li15_nodes.forEach(detach);
			t370 = claim_space(ul6_nodes);
			li16 = claim_element(ul6_nodes, "LI", {});
			var li16_nodes = children(li16);
			a49 = claim_element(li16_nodes, "A", { href: true, rel: true });
			var a49_nodes = children(a49);
			code44 = claim_element(a49_nodes, "CODE", {});
			var code44_nodes = children(code44);
			t371 = claim_text(code44_nodes, "babel-plugin-macros");
			code44_nodes.forEach(detach);
			t372 = claim_text(a49_nodes, " Usage for macros authors");
			a49_nodes.forEach(detach);
			li16_nodes.forEach(detach);
			t373 = claim_space(ul6_nodes);
			li17 = claim_element(ul6_nodes, "LI", {});
			var li17_nodes = children(li17);
			a50 = claim_element(li17_nodes, "A", { href: true, rel: true });
			var a50_nodes = children(a50);
			t374 = claim_text(a50_nodes, "Zero-config code transformation with babel-plugin-macros");
			a50_nodes.forEach(detach);
			t375 = claim_text(li17_nodes, " by ");
			a51 = claim_element(li17_nodes, "A", { href: true, rel: true });
			var a51_nodes = children(a51);
			t376 = claim_text(a51_nodes, "Kent C. Dodds");
			a51_nodes.forEach(detach);
			li17_nodes.forEach(detach);
			t377 = claim_space(ul6_nodes);
			li18 = claim_element(ul6_nodes, "LI", {});
			var li18_nodes = children(li18);
			a52 = claim_element(li18_nodes, "A", { href: true, rel: true });
			var a52_nodes = children(a52);
			t378 = claim_text(a52_nodes, "Awesome list for Babel macros");
			a52_nodes.forEach(detach);
			li18_nodes.forEach(detach);
			t379 = claim_space(ul6_nodes);
			li19 = claim_element(ul6_nodes, "LI", {});
			var li19_nodes = children(li19);
			t380 = claim_text(li19_nodes, "The idea of converting type definition to mock generator comes from ");
			a53 = claim_element(li19_nodes, "A", { href: true, rel: true });
			var a53_nodes = children(a53);
			t381 = claim_text(a53_nodes, "Manta Style, the futuristic API Mock Server for Frontend");
			a53_nodes.forEach(detach);
			li19_nodes.forEach(detach);
			ul6_nodes.forEach(detach);
			section12_nodes.forEach(detach);
			this.h();
		},
		h() {
			attr(a0, "href", "#motivation");
			attr(a1, "href", "#documentation-and-community-support");
			attr(a2, "href", "#tooling");
			attr(a3, "href", "#maintainability");
			attr(a4, "href", "#consistency-of-the-syntax");
			attr(a5, "href", "#compile-time-vs-runtime");
			attr(a6, "href", "#babel-macros");
			attr(a7, "href", "#so-what-is-babel-macros-again");
			attr(a8, "href", "#how-to-write-babel-macros");
			attr(a9, "href", "#mock-macro");
			attr(a10, "href", "#summary");
			attr(a11, "href", "#further-reading");
			attr(ul3, "class", "sitemap");
			attr(ul3, "id", "sitemap");
			attr(ul3, "role", "navigation");
			attr(ul3, "aria-label", "Table of Contents");
			attr(a12, "href", "#motivation");
			attr(a12, "id", "motivation");
			attr(a13, "href", "/creating-custom-javascript-syntax-with-babel");
			attr(a14, "href", "#documentation-and-community-support");
			attr(a14, "id", "documentation-and-community-support");
			attr(a15, "href", "/creating-custom-javascript-syntax-with-babel#overview");
			attr(a16, "href", "#tooling");
			attr(a16, "id", "tooling");
			attr(a17, "href", "#maintainability");
			attr(a17, "id", "maintainability");
			attr(a18, "href", "#consistency-of-the-syntax");
			attr(a18, "id", "consistency-of-the-syntax");
			attr(a19, "href", "#compile-time-vs-runtime");
			attr(a19, "id", "compile-time-vs-runtime");
			attr(a20, "href", "https://v8.dev/features/optional-chaining");
			attr(a20, "rel", "nofollow");
			attr(pre0, "class", "language-js");
			attr(pre1, "class", "language-js");
			attr(a21, "href", "https://stackoverflow.com/questions/19727905/in-javascript-is-it-expensive-to-use-try-catch-blocks-even-if-an-exception-is-n");
			attr(a22, "href", "https://news.ycombinator.com/item?id=3922963");
			attr(a23, "href", "https://stackoverflow.com/questions/3217294/javascript-try-catch-performance-vs-error-checking-code");
			attr(a24, "href", "https://twitter.com/lihautan");
			attr(a25, "href", "https://github.com/facebookincubator/idx");
			attr(a25, "rel", "nofollow");
			attr(a26, "href", "https://github.com/facebookincubator/idx#babel-plugin");
			attr(a26, "rel", "nofollow");
			attr(pre2, "class", "language-js");
			attr(pre3, "class", "language-js");
			attr(a27, "href", "/step-by-step-guide-for-writing-a-babel-transformation");
			attr(a28, "href", "https://github.com/kentcdodds/babel-plugin-macros");
			attr(a28, "rel", "nofollow");
			attr(a29, "href", "#babel-macros");
			attr(a29, "id", "babel-macros");
			attr(pre4, "class", "language-js");
			attr(pre5, "class", "language-js");
			attr(pre6, "class", "language-js");
			attr(pre7, "class", "language-js");
			attr(a30, "href", "#so-what-is-babel-macros-again");
			attr(a30, "id", "so-what-is-babel-macros-again");
			attr(a31, "href", "https://github.com/kentcdodds/babel-plugin-macros");
			attr(a31, "rel", "nofollow");
			attr(a32, "href", "#how-to-write-babel-macros");
			attr(a32, "id", "how-to-write-babel-macros");
			attr(a33, "href", "http://kentcdodds.com");
			attr(a33, "rel", "nofollow");
			attr(a34, "href", "https://github.com/kentcdodds/babel-plugin-macros/blob/master/other/docs/author.md");
			attr(a34, "rel", "nofollow");
			attr(a35, "href", "https://www.npmjs.com/package/mock.macro");
			attr(a35, "rel", "nofollow");
			attr(a36, "href", "#mock-macro");
			attr(a36, "id", "mock-macro");
			attr(pre8, "class", "language-js");
			attr(pre9, "class", "language-js");
			attr(pre10, "class", "language-js");
			attr(a37, "href", "https://babel-blade.netlify.com/docs/declarationdeclaration");
			attr(a37, "rel", "nofollow");
			attr(a38, "href", "https://twitter.com/swyx");
			attr(a38, "rel", "nofollow");
			attr(a39, "href", "https://www.youtube.com/watch?v=1WNT5RCENfo");
			attr(a39, "rel", "nofollow");
			attr(pre11, "class", "language-js");
			attr(a40, "href", "/step-by-step-guide-for-writing-a-babel-transformation");
			attr(pre12, "class", "language-js");
			attr(pre13, "class", "language-js");
			attr(pre14, "class", "language-js");
			attr(pre15, "class", "language-js");
			attr(pre16, "class", "language-js");
			attr(pre17, "class", "language-js");
			attr(a41, "href", "https://github.com/marak/Faker.js/");
			attr(a41, "rel", "nofollow");
			attr(pre18, "class", "language-js");
			attr(pre19, "class", "language-js");
			attr(pre20, "class", "language-js");
			attr(pre21, "class", "language-js");
			attr(pre22, "class", "language-js");
			attr(a42, "href", "https://github.com/tanhauhau/mock.macro");
			attr(a42, "rel", "nofollow");
			attr(a43, "href", "#summary");
			attr(a43, "id", "summary");
			attr(a44, "href", "#further-reading");
			attr(a44, "id", "further-reading");
			attr(a45, "href", "https://github.com/kentcdodds/babel-plugin-macros");
			attr(a45, "rel", "nofollow");
			attr(a46, "href", "https://twitter.com/kentcdodds/");
			attr(a46, "rel", "nofollow");
			attr(a47, "href", "https://www.youtube.com/watch?v=1WNT5RCENfo");
			attr(a47, "rel", "nofollow");
			attr(a48, "href", "https://twitter.com/swyx");
			attr(a48, "rel", "nofollow");
			attr(a49, "href", "https://github.com/kentcdodds/babel-plugin-macros/blob/master/other/docs/author.md");
			attr(a49, "rel", "nofollow");
			attr(a50, "href", "https://babeljs.io/blog/2017/09/11/zero-config-with-babel-macros");
			attr(a50, "rel", "nofollow");
			attr(a51, "href", "https://twitter.com/kentcdodds/");
			attr(a51, "rel", "nofollow");
			attr(a52, "href", "https://github.com/jgierer12/awesome-babel-macros");
			attr(a52, "rel", "nofollow");
			attr(a53, "href", "https://github.com/Cryrivers/manta-style");
			attr(a53, "rel", "nofollow");
		},
		m(target, anchor) {
			insert(target, section0, anchor);
			append(section0, ul3);
			append(ul3, li0);
			append(li0, a0);
			append(a0, t0);
			append(ul3, ul0);
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
			append(ul3, li5);
			append(li5, a5);
			append(a5, t5);
			append(ul3, li6);
			append(li6, a6);
			append(a6, t6);
			append(ul3, ul1);
			append(ul1, li7);
			append(li7, a7);
			append(a7, t7);
			append(ul3, li8);
			append(li8, a8);
			append(a8, t8);
			append(ul3, ul2);
			append(ul2, li9);
			append(li9, a9);
			append(a9, t9);
			append(ul3, li10);
			append(li10, a10);
			append(a10, t10);
			append(ul3, li11);
			append(li11, a11);
			append(a11, t11);
			insert(target, t12, anchor);
			insert(target, p0, anchor);
			append(p0, t13);
			insert(target, t14, anchor);
			insert(target, section1, anchor);
			append(section1, h20);
			append(h20, a12);
			append(a12, t15);
			append(section1, t16);
			append(section1, p1);
			append(p1, t17);
			append(p1, a13);
			append(a13, t18);
			append(p1, t19);
			append(section1, t20);
			append(section1, p2);
			append(p2, t21);
			insert(target, t22, anchor);
			insert(target, section2, anchor);
			append(section2, h30);
			append(h30, a14);
			append(a14, t23);
			append(section2, t24);
			append(section2, p3);
			append(p3, t25);
			append(p3, code0);
			append(code0, t26);
			append(p3, t27);
			append(p3, a15);
			append(a15, t28);
			append(p3, t29);
			insert(target, t30, anchor);
			insert(target, section3, anchor);
			append(section3, h31);
			append(h31, a16);
			append(a16, t31);
			append(section3, t32);
			append(section3, p4);
			append(p4, t33);
			insert(target, t34, anchor);
			insert(target, section4, anchor);
			append(section4, h32);
			append(h32, a17);
			append(a17, t35);
			append(section4, t36);
			append(section4, p5);
			append(p5, t37);
			insert(target, t38, anchor);
			insert(target, section5, anchor);
			append(section5, h33);
			append(h33, a18);
			append(a18, t39);
			append(section5, t40);
			append(section5, p6);
			append(p6, t41);
			append(section5, t42);
			append(section5, p7);
			append(p7, t43);
			append(p7, code1);
			append(code1, t44);
			append(p7, t45);
			insert(target, t46, anchor);
			insert(target, section6, anchor);
			append(section6, h21);
			append(h21, a19);
			append(a19, t47);
			append(section6, t48);
			append(section6, p8);
			append(p8, t49);
			append(section6, t50);
			append(section6, p9);
			append(p9, t51);
			append(p9, a20);
			append(a20, t52);
			append(p9, t53);
			append(p9, code2);
			append(code2, t54);
			append(p9, t55);
			append(p9, code3);
			append(code3, t56);
			append(p9, t57);
			append(section6, t58);
			append(section6, p10);
			append(p10, strong0);
			append(strong0, t59);
			append(section6, t60);
			append(section6, pre0);
			pre0.innerHTML = raw0_value;
			append(section6, t61);
			append(section6, p11);
			append(p11, strong1);
			append(strong1, t62);
			append(section6, t63);
			append(section6, pre1);
			pre1.innerHTML = raw1_value;
			append(section6, t64);
			append(section6, blockquote0);
			append(blockquote0, b);
			append(b, t65);
			append(blockquote0, t66);
			append(blockquote0, a21);
			append(a21, t67);
			append(blockquote0, t68);
			append(blockquote0, a22);
			append(a22, t69);
			append(blockquote0, t70);
			append(blockquote0, a23);
			append(a23, t71);
			append(blockquote0, t72);
			append(blockquote0, a24);
			append(a24, t73);
			append(blockquote0, t74);
			append(section6, t75);
			append(section6, p12);
			append(p12, t76);
			append(p12, strong2);
			append(strong2, t77);
			append(section6, t78);
			append(section6, p13);
			append(p13, t79);
			append(p13, a25);
			append(a25, code4);
			append(code4, t80);
			append(p13, t81);
			append(p13, a26);
			append(a26, t82);
			append(p13, t83);
			append(p13, code5);
			append(code5, t84);
			append(p13, t85);
			append(section6, t86);
			append(section6, pre2);
			pre2.innerHTML = raw2_value;
			append(section6, t87);
			append(section6, p14);
			append(p14, t88);
			append(section6, t89);
			append(section6, pre3);
			pre3.innerHTML = raw3_value;
			append(section6, t90);
			append(section6, p15);
			append(p15, t91);
			append(section6, t92);
			append(section6, p16);
			append(p16, t93);
			append(section6, t94);
			append(section6, blockquote1);
			append(blockquote1, p17);
			append(p17, t95);
			append(section6, t96);
			append(section6, p18);
			append(p18, t97);
			append(p18, em);
			append(em, t98);
			append(p18, t99);
			append(section6, t100);
			append(section6, p19);
			append(p19, t101);
			append(section6, t102);
			append(section6, p20);
			append(p20, strong3);
			append(strong3, t103);
			append(section6, t104);
			append(section6, p21);
			append(p21, t105);
			append(p21, a27);
			append(a27, t106);
			append(p21, t107);
			append(section6, t108);
			append(section6, p22);
			append(p22, t109);
			append(p22, strong4);
			append(strong4, t110);
			append(p22, t111);
			append(section6, t112);
			append(section6, p23);
			append(p23, t113);
			append(p23, code6);
			append(code6, t114);
			append(p23, t115);
			append(p23, strong5);
			append(strong5, t116);
			append(p23, t117);
			append(section6, t118);
			append(section6, p24);
			append(p24, t119);
			append(p24, strong6);
			append(strong6, t120);
			append(p24, t121);
			append(p24, strong7);
			append(strong7, t122);
			append(p24, t123);
			append(section6, t124);
			append(section6, p25);
			append(p25, strong8);
			append(strong8, t125);
			append(section6, t126);
			append(section6, p26);
			append(p26, t127);
			append(section6, t128);
			append(section6, p27);
			append(p27, t129);
			append(p27, code7);
			append(code7, t130);
			append(p27, t131);
			append(p27, code8);
			append(code8, t132);
			append(p27, t133);
			append(p27, code9);
			append(code9, t134);
			append(p27, t135);
			append(p27, strong9);
			append(strong9, t136);
			append(p27, t137);
			append(p27, code10);
			append(code10, t138);
			append(p27, t139);
			append(p27, code11);
			append(code11, t140);
			append(p27, t141);
			append(p27, code12);
			append(code12, t142);
			append(p27, t143);
			append(section6, t144);
			append(section6, p28);
			append(p28, t145);
			append(p28, code13);
			append(code13, t146);
			append(p28, t147);
			append(p28, strong10);
			append(strong10, t148);
			append(p28, t149);
			append(section6, t150);
			append(section6, hr);
			append(section6, t151);
			append(section6, p29);
			append(p29, t152);
			append(section6, t153);
			append(section6, p30);
			append(p30, t154);
			append(p30, a28);
			append(a28, t155);
			append(p30, t156);
			insert(target, t157, anchor);
			insert(target, section7, anchor);
			append(section7, h22);
			append(h22, a29);
			append(a29, t158);
			append(section7, t159);
			append(section7, p31);
			append(p31, t160);
			append(section7, t161);
			append(section7, p32);
			append(p32, strong11);
			append(strong11, t162);
			append(strong11, code14);
			append(code14, t163);
			append(strong11, t164);
			append(section7, t165);
			append(section7, p33);
			append(p33, t166);
			append(section7, t167);
			append(section7, pre4);
			pre4.innerHTML = raw4_value;
			append(section7, t168);
			append(section7, p34);
			append(p34, strong12);
			append(strong12, t169);
			append(section7, t170);
			append(section7, pre5);
			pre5.innerHTML = raw5_value;
			append(section7, t171);
			append(section7, p35);
			append(p35, t172);
			append(p35, code15);
			append(code15, t173);
			append(p35, t174);
			append(p35, code16);
			append(code16, t175);
			append(p35, t176);
			append(section7, t177);
			append(section7, p36);
			append(p36, strong13);
			append(strong13, t178);
			append(section7, t179);
			append(section7, pre6);
			pre6.innerHTML = raw6_value;
			append(section7, t180);
			append(section7, p37);
			append(p37, t181);
			append(p37, code17);
			append(code17, t182);
			append(p37, t183);
			append(section7, t184);
			append(section7, p38);
			append(p38, t185);
			append(p38, code18);
			append(code18, t186);
			append(p38, t187);
			append(p38, code19);
			append(code19, t188);
			append(p38, t189);
			append(section7, t190);
			append(section7, p39);
			append(p39, t191);
			append(section7, t192);
			append(section7, pre7);
			pre7.innerHTML = raw7_value;
			append(section7, t193);
			append(section7, p40);
			append(p40, t194);
			insert(target, t195, anchor);
			insert(target, section8, anchor);
			append(section8, h34);
			append(h34, a30);
			append(a30, t196);
			append(section8, t197);
			append(section8, p41);
			append(p41, strong14);
			append(strong14, t198);
			append(p41, t199);
			append(p41, a31);
			append(a31, code20);
			append(code20, t200);
			append(p41, t201);
			append(section8, t202);
			append(section8, p42);
			append(p42, t203);
			append(p42, code21);
			append(code21, t204);
			append(p42, t205);
			append(p42, code22);
			append(code22, t206);
			append(p42, t207);
			append(p42, code23);
			append(code23, t208);
			append(p42, t209);
			append(p42, code24);
			append(code24, t210);
			append(p42, t211);
			append(p42, code25);
			append(code25, t212);
			append(p42, t213);
			append(section8, t214);
			append(section8, p43);
			append(p43, t215);
			append(section8, t216);
			append(section8, p44);
			append(p44, t217);
			append(section8, t218);
			append(section8, p45);
			append(p45, t219);
			insert(target, t220, anchor);
			insert(target, section9, anchor);
			append(section9, h23);
			append(h23, a32);
			append(a32, t221);
			append(section9, t222);
			append(section9, p46);
			append(p46, a33);
			append(a33, t223);
			append(p46, t224);
			append(p46, a34);
			append(a34, t225);
			append(p46, t226);
			append(section9, t227);
			append(section9, p47);
			append(p47, t228);
			append(section9, t229);
			append(section9, p48);
			append(p48, t230);
			append(p48, a35);
			append(a35, t231);
			append(p48, t232);
			insert(target, t233, anchor);
			insert(target, section10, anchor);
			append(section10, h35);
			append(h35, a36);
			append(a36, t234);
			append(section10, t235);
			append(section10, p49);
			append(p49, strong15);
			append(strong15, t236);
			append(section10, t237);
			append(section10, p50);
			append(p50, t238);
			append(section10, t239);
			append(section10, pre8);
			pre8.innerHTML = raw8_value;
			append(section10, t240);
			append(section10, p51);
			append(p51, t241);
			append(section10, t242);
			append(section10, pre9);
			pre9.innerHTML = raw9_value;
			append(section10, t243);
			append(section10, p52);
			append(p52, t244);
			append(section10, t245);
			append(section10, pre10);
			pre10.innerHTML = raw10_value;
			append(section10, t246);
			append(section10, p53);
			append(p53, t247);
			append(p53, a37);
			append(a37, t248);
			append(p53, t249);
			append(p53, a38);
			append(a38, t250);
			append(p53, t251);
			append(p53, a39);
			append(a39, t252);
			append(p53, t253);
			append(section10, t254);
			append(section10, p54);
			append(p54, t255);
			append(section10, t256);
			append(section10, pre11);
			pre11.innerHTML = raw11_value;
			append(section10, t257);
			append(section10, p55);
			append(p55, t258);
			append(p55, code26);
			append(code26, t259);
			append(p55, t260);
			append(section10, t261);
			append(section10, p56);
			append(p56, strong16);
			append(strong16, t262);
			append(section10, t263);
			append(section10, p57);
			append(p57, t264);
			append(p57, a40);
			append(a40, t265);
			append(p57, t266);
			append(section10, t267);
			append(section10, p58);
			append(p58, t268);
			append(p58, code27);
			append(code27, t269);
			append(p58, t270);
			append(section10, t271);
			append(section10, pre12);
			pre12.innerHTML = raw12_value;
			append(section10, t272);
			append(section10, p59);
			append(p59, code28);
			append(code28, t273);
			append(p59, t274);
			append(section10, t275);
			append(section10, ul4);
			append(ul4, li12);
			append(li12, strong17);
			append(strong17, t276);
			append(section10, t277);
			append(section10, p60);
			append(p60, t278);
			append(section10, t279);
			append(section10, p61);
			append(p61, t280);
			append(section10, t281);
			append(section10, pre13);
			pre13.innerHTML = raw13_value;
			append(section10, t282);
			append(section10, p62);
			append(p62, t283);
			append(p62, code29);
			append(code29, t284);
			append(p62, t285);
			append(p62, code30);
			append(code30, t286);
			append(p62, t287);
			append(section10, t288);
			append(section10, pre14);
			pre14.innerHTML = raw14_value;
			append(section10, t289);
			append(section10, p63);
			append(p63, t290);
			append(section10, t291);
			append(section10, pre15);
			pre15.innerHTML = raw15_value;
			append(section10, t292);
			append(section10, ul5);
			append(ul5, li13);
			append(li13, strong18);
			append(strong18, t293);
			append(section10, t294);
			append(section10, p64);
			append(p64, t295);
			append(section10, t296);
			append(section10, p65);
			append(p65, t297);
			append(p65, code31);
			append(code31, t298);
			append(p65, t299);
			append(section10, t300);
			append(section10, pre16);
			pre16.innerHTML = raw16_value;
			append(section10, t301);
			append(section10, p66);
			append(p66, t302);
			append(section10, t303);
			append(section10, pre17);
			pre17.innerHTML = raw17_value;
			append(section10, t304);
			append(section10, p67);
			append(p67, t305);
			append(p67, a41);
			append(a41, t306);
			append(p67, t307);
			append(section10, t308);
			append(section10, p68);
			append(p68, t309);
			append(p68, code32);
			append(code32, t310);
			append(p68, t311);
			append(section10, t312);
			append(section10, pre18);
			pre18.innerHTML = raw18_value;
			append(section10, t313);
			append(section10, p69);
			append(p69, t314);
			append(p69, code33);
			append(code33, t315);
			append(p69, t316);
			append(p69, code34);
			append(code34, t317);
			append(p69, t318);
			append(p69, code35);
			append(code35, t319);
			append(p69, t320);
			append(section10, t321);
			append(section10, pre19);
			pre19.innerHTML = raw19_value;
			append(section10, t322);
			append(section10, p70);
			append(p70, t323);
			append(p70, code36);
			append(code36, t324);
			append(p70, t325);
			append(p70, code37);
			append(code37, t326);
			append(p70, t327);
			append(section10, t328);
			append(section10, pre20);
			pre20.innerHTML = raw20_value;
			append(section10, t329);
			append(section10, p71);
			append(p71, t330);
			append(section10, t331);
			append(section10, p72);
			append(p72, t332);
			append(section10, t333);
			append(section10, p73);
			append(p73, t334);
			append(p73, code38);
			append(code38, t335);
			append(p73, t336);
			append(section10, t337);
			append(section10, pre21);
			pre21.innerHTML = raw21_value;
			append(section10, t338);
			append(section10, p74);
			append(p74, t339);
			append(p74, code39);
			append(code39, t340);
			append(p74, t341);
			append(section10, t342);
			append(section10, pre22);
			pre22.innerHTML = raw22_value;
			append(section10, t343);
			append(section10, blockquote2);
			append(blockquote2, p75);
			append(p75, t344);
			append(p75, a42);
			append(a42, t345);
			append(p75, t346);
			insert(target, t347, anchor);
			insert(target, section11, anchor);
			append(section11, h24);
			append(h24, a43);
			append(a43, t348);
			append(section11, t349);
			append(section11, p76);
			append(p76, t350);
			append(p76, code40);
			append(code40, t351);
			append(p76, t352);
			append(p76, code41);
			append(code41, t353);
			append(p76, t354);
			append(section11, t355);
			append(section11, p77);
			append(p77, code42);
			append(code42, t356);
			append(p77, t357);
			append(p77, code43);
			append(code43, t358);
			append(p77, t359);
			insert(target, t360, anchor);
			insert(target, section12, anchor);
			append(section12, h25);
			append(h25, a44);
			append(a44, t361);
			append(section12, t362);
			append(section12, ul6);
			append(ul6, li14);
			append(li14, a45);
			append(a45, t363);
			append(li14, t364);
			append(li14, a46);
			append(a46, t365);
			append(ul6, t366);
			append(ul6, li15);
			append(li15, a47);
			append(a47, t367);
			append(li15, t368);
			append(li15, a48);
			append(a48, t369);
			append(ul6, t370);
			append(ul6, li16);
			append(li16, a49);
			append(a49, code44);
			append(code44, t371);
			append(a49, t372);
			append(ul6, t373);
			append(ul6, li17);
			append(li17, a50);
			append(a50, t374);
			append(li17, t375);
			append(li17, a51);
			append(a51, t376);
			append(ul6, t377);
			append(ul6, li18);
			append(li18, a52);
			append(a52, t378);
			append(ul6, t379);
			append(ul6, li19);
			append(li19, t380);
			append(li19, a53);
			append(a53, t381);
		},
		p: noop,
		d(detaching) {
			if (detaching) detach(section0);
			if (detaching) detach(t12);
			if (detaching) detach(p0);
			if (detaching) detach(t14);
			if (detaching) detach(section1);
			if (detaching) detach(t22);
			if (detaching) detach(section2);
			if (detaching) detach(t30);
			if (detaching) detach(section3);
			if (detaching) detach(t34);
			if (detaching) detach(section4);
			if (detaching) detach(t38);
			if (detaching) detach(section5);
			if (detaching) detach(t46);
			if (detaching) detach(section6);
			if (detaching) detach(t157);
			if (detaching) detach(section7);
			if (detaching) detach(t195);
			if (detaching) detach(section8);
			if (detaching) detach(t220);
			if (detaching) detach(section9);
			if (detaching) detach(t233);
			if (detaching) detach(section10);
			if (detaching) detach(t347);
			if (detaching) detach(section11);
			if (detaching) detach(t360);
			if (detaching) detach(section12);
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
	"title": "Babel macros",
	"date": "2019-10-08T08:00:00Z",
	"series": "Intermediate Babel",
	"tags": ["JavaScript", "babel", "ast", "transform"],
	"description": "Custom JavaScript syntax is hard to maintain, custom babel transform plugin is no better. That's why we need Babel macros.",
	"slug": "babel-macros",
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
