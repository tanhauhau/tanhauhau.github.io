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
function get_current_component() {
    if (!current_component)
        throw new Error(`Function called outside component initialization`);
    return current_component;
}
function onMount(fn) {
    get_current_component().$$.on_mount.push(fn);
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

/* src/layout/CarbonAd.svelte generated by Svelte v3.24.0 */

function instance$1($$self) {
	onMount(() => {
		setTimeout(
			() => {
				if (window.innerWidth > 1080) {
					const script = document.createElement("script");
					script.async = true;
					script.type = "text/javascript";
					script.src = "//cdn.carbonads.com/carbon.js?serve=CE7ITK3E&placement=lihautancom";
					script.id = "_carbonads_js";
					document.body.appendChild(script);
				}
			},
			5000
		);

		return () => {
			try {
				const ad = document.getElementById("carbonads");
				ad.parentNode.removeChild(ad);
			} catch(error) {
				
			} // ignore them
		};
	});

	return [];
}

class CarbonAd extends SvelteComponent {
	constructor(options) {
		super();
		init(this, options, instance$1, null, safe_not_equal, {});
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
					"@id": "https%3A%2F%2Flihautan.com%2Fhow-to-get-started-in-contributing-to-open-source",
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
	let carbonad;
	let t9;
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
	carbonad = new CarbonAd({});

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
			create_component(carbonad.$$.fragment);
			t9 = space();
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
			t8 = claim_space(footer_nodes);
			claim_component(carbonad.$$.fragment, footer_nodes);
			footer_nodes.forEach(detach);
			t9 = claim_space(nodes);
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
			attr(meta11, "content", "https%3A%2F%2Flihautan.com%2Fhow-to-get-started-in-contributing-to-open-source");
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
			append(footer, t8);
			mount_component(carbonad, footer, null);
			insert(target, t9, anchor);
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
							"@id": "https%3A%2F%2Flihautan.com%2Fhow-to-get-started-in-contributing-to-open-source",
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
			transition_in(carbonad.$$.fragment, local);
			current = true;
		},
		o(local) {
			transition_out(header.$$.fragment, local);
			transition_out(default_slot, local);
			transition_out(newsletter.$$.fragment, local);
			transition_out(carbonad.$$.fragment, local);
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
			destroy_component(carbonad);
			if (detaching) detach(t9);
			if (detaching) detach(html_anchor_2);
			if (detaching) html_tag_2.d();
		}
	};
}

function instance$2($$self, $$props, $$invalidate) {
	let { title = "" } = $$props;
	let { description = "" } = $$props;
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
		init(this, options, instance$2, create_fragment$2, safe_not_equal, { title: 0, description: 1, tags: 2 });
	}
}

/* content/blog/how-to-get-started-in-contributing-to-open-source/@@page-markup.svelte generated by Svelte v3.24.0 */

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
	let t4;
	let p0;
	let t5;
	let a4;
	let t6;
	let t7;
	let a5;
	let t8;
	let t9;
	let a6;
	let t10;
	let t11;
	let t12;
	let p1;
	let t13;
	let t14;
	let p2;
	let t15;
	let t16;
	let p3;
	let t17;
	let t18;
	let p4;
	let t19;
	let a7;
	let t20;
	let t21;
	let t22;
	let p5;
	let t23;
	let a8;
	let t24;
	let t25;
	let t26;
	let p6;
	let t27;
	let t28;
	let section1;
	let h20;
	let a9;
	let t29;
	let code0;
	let t30;
	let t31;
	let p7;
	let t32;
	let code1;
	let t33;
	let t34;
	let code2;
	let t35;
	let t36;
	let t37;
	let p8;
	let t38;
	let t39;
	let ul1;
	let li4;
	let a10;
	let t40;
	let t41;
	let li5;
	let a11;
	let t42;
	let t43;
	let li6;
	let a12;
	let t44;
	let t45;
	let li7;
	let a13;
	let t46;
	let t47;
	let t48;
	let p9;
	let t49;
	let code3;
	let t50;
	let t51;
	let t52;
	let section2;
	let h21;
	let a14;
	let t53;
	let t54;
	let p10;
	let t55;
	let code4;
	let t56;
	let t57;
	let code5;
	let t58;
	let t59;
	let code6;
	let t60;
	let t61;
	let t62;
	let p11;
	let t63;
	let code7;
	let t64;
	let t65;
	let t66;
	let ul2;
	let li8;
	let a15;
	let t67;
	let t68;
	let li9;
	let a16;
	let t69;
	let t70;
	let section3;
	let h22;
	let a17;
	let t71;
	let t72;
	let p12;
	let t73;
	let t74;
	let ul3;
	let li10;
	let strong0;
	let t75;
	let t76;
	let t77;
	let li11;
	let strong1;
	let t78;
	let t79;
	let t80;
	let li12;
	let strong2;
	let t81;
	let t82;
	let t83;
	let section4;
	let h23;
	let a18;
	let t84;
	let t85;
	let p13;
	let t86;
	let t87;
	let p14;
	let t88;

	return {
		c() {
			section0 = element("section");
			ul0 = element("ul");
			li0 = element("li");
			a0 = element("a");
			t0 = text("1. Read  CONTRIBUTING.md");
			li1 = element("li");
			a1 = element("a");
			t1 = text("2. Good First Issue");
			li2 = element("li");
			a2 = element("a");
			t2 = text("3. It doesn't have to be code");
			li3 = element("li");
			a3 = element("a");
			t3 = text("Closing Notes");
			t4 = space();
			p0 = element("p");
			t5 = text("Allow me to start this article with an anecdote, it was a few months ago, where ");
			a4 = element("a");
			t6 = text("we were upgrading Flow version");
			t7 = text(" and ");
			a5 = element("a");
			t8 = text("it led me to a bug in babel");
			t9 = text(". After some googling, I ");
			a6 = element("a");
			t10 = text("landed onto an issue reported to babel");
			t11 = text(".");
			t12 = space();
			p1 = element("p");
			t13 = text("I think in most cases, when we ended up onto an open Github issue, there's where all our leads ended. The only one obvious way solution is to wait, wait for the library maintainer to fix it.");
			t14 = space();
			p2 = element("p");
			t15 = text("The next best alternative is to read through the issue threads, and find any patches or workarounds that can be applied in the mean time.");
			t16 = space();
			p3 = element("p");
			t17 = text("We have been so used to making use of an open source libraries, tools or frameworks in our daily development, but it rarely occurred to us, that we should sometime, contribute back to the open source libraries, tools or frameworks we used.");
			t18 = space();
			p4 = element("p");
			t19 = text("To be honest, I felt inadequate when I made my first merge request to ");
			a7 = element("a");
			t20 = text("babel");
			t21 = text(". Who am I to make changes to the tool that was used by every JavaScript developer in the world?");
			t22 = space();
			p5 = element("p");
			t23 = text("My answer to that is, ");
			a8 = element("a");
			t24 = text("everyone plays an important role");
			t25 = text(" in shaping how babel is today. Babel, or any other library would not be what it is today, without the constant contributions from the community.");
			t26 = space();
			p6 = element("p");
			t27 = text("So, if you are interested in playing a part in the open source libraries, tools or frameworks you used, spare me a few more minutes to read my following two cents on how you could get started in contributing to open source libraries.");
			t28 = space();
			section1 = element("section");
			h20 = element("h2");
			a9 = element("a");
			t29 = text("1. Read ");
			code0 = element("code");
			t30 = text("CONTRIBUTING.md");
			t31 = space();
			p7 = element("p");
			t32 = text("Most popular open source libraries have this file called ");
			code1 = element("code");
			t33 = text("CONTRIBUTING.md");
			t34 = text(". ");
			code2 = element("code");
			t35 = text("CONTRIBUTING.md");
			t36 = text(" is where library maintainers document down what you should know before starting to contribute to the library.");
			t37 = space();
			p8 = element("p");
			t38 = text("Examples:");
			t39 = space();
			ul1 = element("ul");
			li4 = element("li");
			a10 = element("a");
			t40 = text("babel");
			t41 = space();
			li5 = element("li");
			a11 = element("a");
			t42 = text("React");
			t43 = space();
			li6 = element("li");
			a12 = element("a");
			t44 = text("TypeScript");
			t45 = space();
			li7 = element("li");
			a13 = element("a");
			t46 = text("JQuery");
			t47 = text("...");
			t48 = space();
			p9 = element("p");
			t49 = text("So if you want to start contributing, start with reading ");
			code3 = element("code");
			t50 = text("CONTRIBUTING.md");
			t51 = text("!");
			t52 = space();
			section2 = element("section");
			h21 = element("h2");
			a14 = element("a");
			t53 = text("2. Good First Issue");
			t54 = space();
			p10 = element("p");
			t55 = text("Usually mentioned within ");
			code4 = element("code");
			t56 = text("CONTRIBUTING.md");
			t57 = text(", most popular libraries do label their issues to categorize them. In our case, ");
			code5 = element("code");
			t58 = text("\"Good First Issue\"");
			t59 = text(" is what starters should look out for. When library maintainers labelled their issue as ");
			code6 = element("code");
			t60 = text("\"Good First Issue\"");
			t61 = text(", they usually expect to guide and give advice to anyone who is willing to work on the issue. By working through the issue, contributors should gain some practical understanding on how things works, and be more confident in fixing the next bug.");
			t62 = space();
			p11 = element("p");
			t63 = text("Examples of ");
			code7 = element("code");
			t64 = text("\"Good First Issue\"");
			t65 = text(":");
			t66 = space();
			ul2 = element("ul");
			li8 = element("li");
			a15 = element("a");
			t67 = text("TypeScript");
			t68 = space();
			li9 = element("li");
			a16 = element("a");
			t69 = text("React");
			t70 = space();
			section3 = element("section");
			h22 = element("h2");
			a17 = element("a");
			t71 = text("3. It doesn't have to be code");
			t72 = space();
			p12 = element("p");
			t73 = text("When we think about contributing to open source, we might just think of contributing in terms of code. Well, we don't have to limit ourselves to just contributing code. There are a lot other ways to contribute:");
			t74 = space();
			ul3 = element("ul");
			li10 = element("li");
			strong0 = element("strong");
			t75 = text("Report an issue");
			t76 = text(". Discuss and make suggestions in the issue");
			t77 = space();
			li11 = element("li");
			strong1 = element("strong");
			t78 = text("Improving the docs");
			t79 = text(". You may have spent a lot of time figuring out, maybe it will save the next person's time by converting your experience into a better doc?");
			t80 = space();
			li12 = element("li");
			strong2 = element("strong");
			t81 = text("Tweet, blog or talk");
			t82 = text(" about it. Good thing must share.");
			t83 = space();
			section4 = element("section");
			h23 = element("h2");
			a18 = element("a");
			t84 = text("Closing Notes");
			t85 = space();
			p13 = element("p");
			t86 = text("If you are interested in contributing to open source, and have no idea how to get started, these are 3 tips I can give to you.");
			t87 = space();
			p14 = element("p");
			t88 = text("Hope to see your contributions out there soon!");
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
			t0 = claim_text(a0_nodes, "1. Read  CONTRIBUTING.md");
			a0_nodes.forEach(detach);
			li0_nodes.forEach(detach);
			li1 = claim_element(ul0_nodes, "LI", {});
			var li1_nodes = children(li1);
			a1 = claim_element(li1_nodes, "A", { href: true });
			var a1_nodes = children(a1);
			t1 = claim_text(a1_nodes, "2. Good First Issue");
			a1_nodes.forEach(detach);
			li1_nodes.forEach(detach);
			li2 = claim_element(ul0_nodes, "LI", {});
			var li2_nodes = children(li2);
			a2 = claim_element(li2_nodes, "A", { href: true });
			var a2_nodes = children(a2);
			t2 = claim_text(a2_nodes, "3. It doesn't have to be code");
			a2_nodes.forEach(detach);
			li2_nodes.forEach(detach);
			li3 = claim_element(ul0_nodes, "LI", {});
			var li3_nodes = children(li3);
			a3 = claim_element(li3_nodes, "A", { href: true });
			var a3_nodes = children(a3);
			t3 = claim_text(a3_nodes, "Closing Notes");
			a3_nodes.forEach(detach);
			li3_nodes.forEach(detach);
			ul0_nodes.forEach(detach);
			section0_nodes.forEach(detach);
			t4 = claim_space(nodes);
			p0 = claim_element(nodes, "P", {});
			var p0_nodes = children(p0);
			t5 = claim_text(p0_nodes, "Allow me to start this article with an anecdote, it was a few months ago, where ");
			a4 = claim_element(p0_nodes, "A", { href: true, rel: true });
			var a4_nodes = children(a4);
			t6 = claim_text(a4_nodes, "we were upgrading Flow version");
			a4_nodes.forEach(detach);
			t7 = claim_text(p0_nodes, " and ");
			a5 = claim_element(p0_nodes, "A", { href: true, rel: true });
			var a5_nodes = children(a5);
			t8 = claim_text(a5_nodes, "it led me to a bug in babel");
			a5_nodes.forEach(detach);
			t9 = claim_text(p0_nodes, ". After some googling, I ");
			a6 = claim_element(p0_nodes, "A", { href: true, rel: true });
			var a6_nodes = children(a6);
			t10 = claim_text(a6_nodes, "landed onto an issue reported to babel");
			a6_nodes.forEach(detach);
			t11 = claim_text(p0_nodes, ".");
			p0_nodes.forEach(detach);
			t12 = claim_space(nodes);
			p1 = claim_element(nodes, "P", {});
			var p1_nodes = children(p1);
			t13 = claim_text(p1_nodes, "I think in most cases, when we ended up onto an open Github issue, there's where all our leads ended. The only one obvious way solution is to wait, wait for the library maintainer to fix it.");
			p1_nodes.forEach(detach);
			t14 = claim_space(nodes);
			p2 = claim_element(nodes, "P", {});
			var p2_nodes = children(p2);
			t15 = claim_text(p2_nodes, "The next best alternative is to read through the issue threads, and find any patches or workarounds that can be applied in the mean time.");
			p2_nodes.forEach(detach);
			t16 = claim_space(nodes);
			p3 = claim_element(nodes, "P", {});
			var p3_nodes = children(p3);
			t17 = claim_text(p3_nodes, "We have been so used to making use of an open source libraries, tools or frameworks in our daily development, but it rarely occurred to us, that we should sometime, contribute back to the open source libraries, tools or frameworks we used.");
			p3_nodes.forEach(detach);
			t18 = claim_space(nodes);
			p4 = claim_element(nodes, "P", {});
			var p4_nodes = children(p4);
			t19 = claim_text(p4_nodes, "To be honest, I felt inadequate when I made my first merge request to ");
			a7 = claim_element(p4_nodes, "A", { href: true, rel: true });
			var a7_nodes = children(a7);
			t20 = claim_text(a7_nodes, "babel");
			a7_nodes.forEach(detach);
			t21 = claim_text(p4_nodes, ". Who am I to make changes to the tool that was used by every JavaScript developer in the world?");
			p4_nodes.forEach(detach);
			t22 = claim_space(nodes);
			p5 = claim_element(nodes, "P", {});
			var p5_nodes = children(p5);
			t23 = claim_text(p5_nodes, "My answer to that is, ");
			a8 = claim_element(p5_nodes, "A", { href: true, rel: true });
			var a8_nodes = children(a8);
			t24 = claim_text(a8_nodes, "everyone plays an important role");
			a8_nodes.forEach(detach);
			t25 = claim_text(p5_nodes, " in shaping how babel is today. Babel, or any other library would not be what it is today, without the constant contributions from the community.");
			p5_nodes.forEach(detach);
			t26 = claim_space(nodes);
			p6 = claim_element(nodes, "P", {});
			var p6_nodes = children(p6);
			t27 = claim_text(p6_nodes, "So, if you are interested in playing a part in the open source libraries, tools or frameworks you used, spare me a few more minutes to read my following two cents on how you could get started in contributing to open source libraries.");
			p6_nodes.forEach(detach);
			t28 = claim_space(nodes);
			section1 = claim_element(nodes, "SECTION", {});
			var section1_nodes = children(section1);
			h20 = claim_element(section1_nodes, "H2", {});
			var h20_nodes = children(h20);
			a9 = claim_element(h20_nodes, "A", { href: true, id: true });
			var a9_nodes = children(a9);
			t29 = claim_text(a9_nodes, "1. Read ");
			code0 = claim_element(a9_nodes, "CODE", {});
			var code0_nodes = children(code0);
			t30 = claim_text(code0_nodes, "CONTRIBUTING.md");
			code0_nodes.forEach(detach);
			a9_nodes.forEach(detach);
			h20_nodes.forEach(detach);
			t31 = claim_space(section1_nodes);
			p7 = claim_element(section1_nodes, "P", {});
			var p7_nodes = children(p7);
			t32 = claim_text(p7_nodes, "Most popular open source libraries have this file called ");
			code1 = claim_element(p7_nodes, "CODE", {});
			var code1_nodes = children(code1);
			t33 = claim_text(code1_nodes, "CONTRIBUTING.md");
			code1_nodes.forEach(detach);
			t34 = claim_text(p7_nodes, ". ");
			code2 = claim_element(p7_nodes, "CODE", {});
			var code2_nodes = children(code2);
			t35 = claim_text(code2_nodes, "CONTRIBUTING.md");
			code2_nodes.forEach(detach);
			t36 = claim_text(p7_nodes, " is where library maintainers document down what you should know before starting to contribute to the library.");
			p7_nodes.forEach(detach);
			t37 = claim_space(section1_nodes);
			p8 = claim_element(section1_nodes, "P", {});
			var p8_nodes = children(p8);
			t38 = claim_text(p8_nodes, "Examples:");
			p8_nodes.forEach(detach);
			t39 = claim_space(section1_nodes);
			ul1 = claim_element(section1_nodes, "UL", {});
			var ul1_nodes = children(ul1);
			li4 = claim_element(ul1_nodes, "LI", {});
			var li4_nodes = children(li4);
			a10 = claim_element(li4_nodes, "A", { href: true, rel: true });
			var a10_nodes = children(a10);
			t40 = claim_text(a10_nodes, "babel");
			a10_nodes.forEach(detach);
			li4_nodes.forEach(detach);
			t41 = claim_space(ul1_nodes);
			li5 = claim_element(ul1_nodes, "LI", {});
			var li5_nodes = children(li5);
			a11 = claim_element(li5_nodes, "A", { href: true, rel: true });
			var a11_nodes = children(a11);
			t42 = claim_text(a11_nodes, "React");
			a11_nodes.forEach(detach);
			li5_nodes.forEach(detach);
			t43 = claim_space(ul1_nodes);
			li6 = claim_element(ul1_nodes, "LI", {});
			var li6_nodes = children(li6);
			a12 = claim_element(li6_nodes, "A", { href: true, rel: true });
			var a12_nodes = children(a12);
			t44 = claim_text(a12_nodes, "TypeScript");
			a12_nodes.forEach(detach);
			li6_nodes.forEach(detach);
			t45 = claim_space(ul1_nodes);
			li7 = claim_element(ul1_nodes, "LI", {});
			var li7_nodes = children(li7);
			a13 = claim_element(li7_nodes, "A", { href: true, rel: true });
			var a13_nodes = children(a13);
			t46 = claim_text(a13_nodes, "JQuery");
			a13_nodes.forEach(detach);
			t47 = claim_text(li7_nodes, "...");
			li7_nodes.forEach(detach);
			ul1_nodes.forEach(detach);
			t48 = claim_space(section1_nodes);
			p9 = claim_element(section1_nodes, "P", {});
			var p9_nodes = children(p9);
			t49 = claim_text(p9_nodes, "So if you want to start contributing, start with reading ");
			code3 = claim_element(p9_nodes, "CODE", {});
			var code3_nodes = children(code3);
			t50 = claim_text(code3_nodes, "CONTRIBUTING.md");
			code3_nodes.forEach(detach);
			t51 = claim_text(p9_nodes, "!");
			p9_nodes.forEach(detach);
			section1_nodes.forEach(detach);
			t52 = claim_space(nodes);
			section2 = claim_element(nodes, "SECTION", {});
			var section2_nodes = children(section2);
			h21 = claim_element(section2_nodes, "H2", {});
			var h21_nodes = children(h21);
			a14 = claim_element(h21_nodes, "A", { href: true, id: true });
			var a14_nodes = children(a14);
			t53 = claim_text(a14_nodes, "2. Good First Issue");
			a14_nodes.forEach(detach);
			h21_nodes.forEach(detach);
			t54 = claim_space(section2_nodes);
			p10 = claim_element(section2_nodes, "P", {});
			var p10_nodes = children(p10);
			t55 = claim_text(p10_nodes, "Usually mentioned within ");
			code4 = claim_element(p10_nodes, "CODE", {});
			var code4_nodes = children(code4);
			t56 = claim_text(code4_nodes, "CONTRIBUTING.md");
			code4_nodes.forEach(detach);
			t57 = claim_text(p10_nodes, ", most popular libraries do label their issues to categorize them. In our case, ");
			code5 = claim_element(p10_nodes, "CODE", {});
			var code5_nodes = children(code5);
			t58 = claim_text(code5_nodes, "\"Good First Issue\"");
			code5_nodes.forEach(detach);
			t59 = claim_text(p10_nodes, " is what starters should look out for. When library maintainers labelled their issue as ");
			code6 = claim_element(p10_nodes, "CODE", {});
			var code6_nodes = children(code6);
			t60 = claim_text(code6_nodes, "\"Good First Issue\"");
			code6_nodes.forEach(detach);
			t61 = claim_text(p10_nodes, ", they usually expect to guide and give advice to anyone who is willing to work on the issue. By working through the issue, contributors should gain some practical understanding on how things works, and be more confident in fixing the next bug.");
			p10_nodes.forEach(detach);
			t62 = claim_space(section2_nodes);
			p11 = claim_element(section2_nodes, "P", {});
			var p11_nodes = children(p11);
			t63 = claim_text(p11_nodes, "Examples of ");
			code7 = claim_element(p11_nodes, "CODE", {});
			var code7_nodes = children(code7);
			t64 = claim_text(code7_nodes, "\"Good First Issue\"");
			code7_nodes.forEach(detach);
			t65 = claim_text(p11_nodes, ":");
			p11_nodes.forEach(detach);
			t66 = claim_space(section2_nodes);
			ul2 = claim_element(section2_nodes, "UL", {});
			var ul2_nodes = children(ul2);
			li8 = claim_element(ul2_nodes, "LI", {});
			var li8_nodes = children(li8);
			a15 = claim_element(li8_nodes, "A", { href: true });
			var a15_nodes = children(a15);
			t67 = claim_text(a15_nodes, "TypeScript");
			a15_nodes.forEach(detach);
			li8_nodes.forEach(detach);
			t68 = claim_space(ul2_nodes);
			li9 = claim_element(ul2_nodes, "LI", {});
			var li9_nodes = children(li9);
			a16 = claim_element(li9_nodes, "A", { href: true, rel: true });
			var a16_nodes = children(a16);
			t69 = claim_text(a16_nodes, "React");
			a16_nodes.forEach(detach);
			li9_nodes.forEach(detach);
			ul2_nodes.forEach(detach);
			section2_nodes.forEach(detach);
			t70 = claim_space(nodes);
			section3 = claim_element(nodes, "SECTION", {});
			var section3_nodes = children(section3);
			h22 = claim_element(section3_nodes, "H2", {});
			var h22_nodes = children(h22);
			a17 = claim_element(h22_nodes, "A", { href: true, id: true });
			var a17_nodes = children(a17);
			t71 = claim_text(a17_nodes, "3. It doesn't have to be code");
			a17_nodes.forEach(detach);
			h22_nodes.forEach(detach);
			t72 = claim_space(section3_nodes);
			p12 = claim_element(section3_nodes, "P", {});
			var p12_nodes = children(p12);
			t73 = claim_text(p12_nodes, "When we think about contributing to open source, we might just think of contributing in terms of code. Well, we don't have to limit ourselves to just contributing code. There are a lot other ways to contribute:");
			p12_nodes.forEach(detach);
			t74 = claim_space(section3_nodes);
			ul3 = claim_element(section3_nodes, "UL", {});
			var ul3_nodes = children(ul3);
			li10 = claim_element(ul3_nodes, "LI", {});
			var li10_nodes = children(li10);
			strong0 = claim_element(li10_nodes, "STRONG", {});
			var strong0_nodes = children(strong0);
			t75 = claim_text(strong0_nodes, "Report an issue");
			strong0_nodes.forEach(detach);
			t76 = claim_text(li10_nodes, ". Discuss and make suggestions in the issue");
			li10_nodes.forEach(detach);
			t77 = claim_space(ul3_nodes);
			li11 = claim_element(ul3_nodes, "LI", {});
			var li11_nodes = children(li11);
			strong1 = claim_element(li11_nodes, "STRONG", {});
			var strong1_nodes = children(strong1);
			t78 = claim_text(strong1_nodes, "Improving the docs");
			strong1_nodes.forEach(detach);
			t79 = claim_text(li11_nodes, ". You may have spent a lot of time figuring out, maybe it will save the next person's time by converting your experience into a better doc?");
			li11_nodes.forEach(detach);
			t80 = claim_space(ul3_nodes);
			li12 = claim_element(ul3_nodes, "LI", {});
			var li12_nodes = children(li12);
			strong2 = claim_element(li12_nodes, "STRONG", {});
			var strong2_nodes = children(strong2);
			t81 = claim_text(strong2_nodes, "Tweet, blog or talk");
			strong2_nodes.forEach(detach);
			t82 = claim_text(li12_nodes, " about it. Good thing must share.");
			li12_nodes.forEach(detach);
			ul3_nodes.forEach(detach);
			section3_nodes.forEach(detach);
			t83 = claim_space(nodes);
			section4 = claim_element(nodes, "SECTION", {});
			var section4_nodes = children(section4);
			h23 = claim_element(section4_nodes, "H2", {});
			var h23_nodes = children(h23);
			a18 = claim_element(h23_nodes, "A", { href: true, id: true });
			var a18_nodes = children(a18);
			t84 = claim_text(a18_nodes, "Closing Notes");
			a18_nodes.forEach(detach);
			h23_nodes.forEach(detach);
			t85 = claim_space(section4_nodes);
			p13 = claim_element(section4_nodes, "P", {});
			var p13_nodes = children(p13);
			t86 = claim_text(p13_nodes, "If you are interested in contributing to open source, and have no idea how to get started, these are 3 tips I can give to you.");
			p13_nodes.forEach(detach);
			t87 = claim_space(section4_nodes);
			p14 = claim_element(section4_nodes, "P", {});
			var p14_nodes = children(p14);
			t88 = claim_text(p14_nodes, "Hope to see your contributions out there soon!");
			p14_nodes.forEach(detach);
			section4_nodes.forEach(detach);
			this.h();
		},
		h() {
			attr(a0, "href", "#read-contributing-md");
			attr(a1, "href", "#good-first-issue");
			attr(a2, "href", "#it-doesn-t-have-to-be-code");
			attr(a3, "href", "#closing-notes");
			attr(ul0, "class", "sitemap");
			attr(ul0, "id", "sitemap");
			attr(ul0, "role", "navigation");
			attr(ul0, "aria-label", "Table of Contents");
			attr(a4, "href", "https://dev.wgao19.cc/2019-04-17__making-flow-happy-after-0.85/");
			attr(a4, "rel", "nofollow");
			attr(a5, "href", "https://lihautan.com/parsing-error-flow-type-parameter-instantiation/");
			attr(a5, "rel", "nofollow");
			attr(a6, "href", "https://github.com/babel/babel/issues/9240");
			attr(a6, "rel", "nofollow");
			attr(a7, "href", "https://github.com/babel/babel");
			attr(a7, "rel", "nofollow");
			attr(a8, "href", "https://github.com/babel/babel/graphs/contributors");
			attr(a8, "rel", "nofollow");
			attr(a9, "href", "#read-contributing-md");
			attr(a9, "id", "read-contributing-md");
			attr(a10, "href", "https://github.com/babel/babel/blob/master/CONTRIBUTING.md");
			attr(a10, "rel", "nofollow");
			attr(a11, "href", "https://github.com/facebook/react/blob/master/CONTRIBUTING.md");
			attr(a11, "rel", "nofollow");
			attr(a12, "href", "https://github.com/microsoft/typescript/blob/master/CONTRIBUTING.md");
			attr(a12, "rel", "nofollow");
			attr(a13, "href", "https://github.com/jquery/jquery/blob/master/CONTRIBUTING.md");
			attr(a13, "rel", "nofollow");
			attr(a14, "href", "#good-first-issue");
			attr(a14, "id", "good-first-issue");
			attr(a15, "href", "github.com/microsoft/TypeScript/issues?q=is%3Aopen+is%3Aissue+label%3A%22good+first+issue%22");
			attr(a16, "href", "https://github.com/facebook/react/issues?q=is%3Aopen+is%3Aissue+label%3A%22good+first+issue%22");
			attr(a16, "rel", "nofollow");
			attr(a17, "href", "#it-doesn-t-have-to-be-code");
			attr(a17, "id", "it-doesn-t-have-to-be-code");
			attr(a18, "href", "#closing-notes");
			attr(a18, "id", "closing-notes");
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
			insert(target, t4, anchor);
			insert(target, p0, anchor);
			append(p0, t5);
			append(p0, a4);
			append(a4, t6);
			append(p0, t7);
			append(p0, a5);
			append(a5, t8);
			append(p0, t9);
			append(p0, a6);
			append(a6, t10);
			append(p0, t11);
			insert(target, t12, anchor);
			insert(target, p1, anchor);
			append(p1, t13);
			insert(target, t14, anchor);
			insert(target, p2, anchor);
			append(p2, t15);
			insert(target, t16, anchor);
			insert(target, p3, anchor);
			append(p3, t17);
			insert(target, t18, anchor);
			insert(target, p4, anchor);
			append(p4, t19);
			append(p4, a7);
			append(a7, t20);
			append(p4, t21);
			insert(target, t22, anchor);
			insert(target, p5, anchor);
			append(p5, t23);
			append(p5, a8);
			append(a8, t24);
			append(p5, t25);
			insert(target, t26, anchor);
			insert(target, p6, anchor);
			append(p6, t27);
			insert(target, t28, anchor);
			insert(target, section1, anchor);
			append(section1, h20);
			append(h20, a9);
			append(a9, t29);
			append(a9, code0);
			append(code0, t30);
			append(section1, t31);
			append(section1, p7);
			append(p7, t32);
			append(p7, code1);
			append(code1, t33);
			append(p7, t34);
			append(p7, code2);
			append(code2, t35);
			append(p7, t36);
			append(section1, t37);
			append(section1, p8);
			append(p8, t38);
			append(section1, t39);
			append(section1, ul1);
			append(ul1, li4);
			append(li4, a10);
			append(a10, t40);
			append(ul1, t41);
			append(ul1, li5);
			append(li5, a11);
			append(a11, t42);
			append(ul1, t43);
			append(ul1, li6);
			append(li6, a12);
			append(a12, t44);
			append(ul1, t45);
			append(ul1, li7);
			append(li7, a13);
			append(a13, t46);
			append(li7, t47);
			append(section1, t48);
			append(section1, p9);
			append(p9, t49);
			append(p9, code3);
			append(code3, t50);
			append(p9, t51);
			insert(target, t52, anchor);
			insert(target, section2, anchor);
			append(section2, h21);
			append(h21, a14);
			append(a14, t53);
			append(section2, t54);
			append(section2, p10);
			append(p10, t55);
			append(p10, code4);
			append(code4, t56);
			append(p10, t57);
			append(p10, code5);
			append(code5, t58);
			append(p10, t59);
			append(p10, code6);
			append(code6, t60);
			append(p10, t61);
			append(section2, t62);
			append(section2, p11);
			append(p11, t63);
			append(p11, code7);
			append(code7, t64);
			append(p11, t65);
			append(section2, t66);
			append(section2, ul2);
			append(ul2, li8);
			append(li8, a15);
			append(a15, t67);
			append(ul2, t68);
			append(ul2, li9);
			append(li9, a16);
			append(a16, t69);
			insert(target, t70, anchor);
			insert(target, section3, anchor);
			append(section3, h22);
			append(h22, a17);
			append(a17, t71);
			append(section3, t72);
			append(section3, p12);
			append(p12, t73);
			append(section3, t74);
			append(section3, ul3);
			append(ul3, li10);
			append(li10, strong0);
			append(strong0, t75);
			append(li10, t76);
			append(ul3, t77);
			append(ul3, li11);
			append(li11, strong1);
			append(strong1, t78);
			append(li11, t79);
			append(ul3, t80);
			append(ul3, li12);
			append(li12, strong2);
			append(strong2, t81);
			append(li12, t82);
			insert(target, t83, anchor);
			insert(target, section4, anchor);
			append(section4, h23);
			append(h23, a18);
			append(a18, t84);
			append(section4, t85);
			append(section4, p13);
			append(p13, t86);
			append(section4, t87);
			append(section4, p14);
			append(p14, t88);
		},
		d(detaching) {
			if (detaching) detach(section0);
			if (detaching) detach(t4);
			if (detaching) detach(p0);
			if (detaching) detach(t12);
			if (detaching) detach(p1);
			if (detaching) detach(t14);
			if (detaching) detach(p2);
			if (detaching) detach(t16);
			if (detaching) detach(p3);
			if (detaching) detach(t18);
			if (detaching) detach(p4);
			if (detaching) detach(t22);
			if (detaching) detach(p5);
			if (detaching) detach(t26);
			if (detaching) detach(p6);
			if (detaching) detach(t28);
			if (detaching) detach(section1);
			if (detaching) detach(t52);
			if (detaching) detach(section2);
			if (detaching) detach(t70);
			if (detaching) detach(section3);
			if (detaching) detach(t83);
			if (detaching) detach(section4);
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
	"title": "How to get started in contributing to open source",
	"date": "2019-06-05T08:00:00Z",
	"slug": "how-to-get-started-in-contributing-to-open-source",
	"type": "blog"
};

class Page_markup extends SvelteComponent {
	constructor(options) {
		super();
		init(this, options, null, create_fragment$3, safe_not_equal, {});
	}
}

setTimeout(() => {
  const app = new Page_markup({
    target: document.querySelector('#app'),
    hydrate: true,
  });
}, 3000);
