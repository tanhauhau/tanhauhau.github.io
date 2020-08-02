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
					"@id": "https%3A%2F%2Flihautan.com%2Fwebpack-plugin-main-template",
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
			attr(meta11, "content", "https%3A%2F%2Flihautan.com%2Fwebpack-plugin-main-template");
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
							"@id": "https%3A%2F%2Flihautan.com%2Fwebpack-plugin-main-template",
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

/* content/blog/webpack-plugin-main-template/@@page-markup.svelte generated by Svelte v3.24.0 */

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
	let t5;
	let p0;
	let t6;
	let t7;
	let pre0;

	let raw0_value = `<code class="language-js"><span class="token comment">// weback.config.js</span>
module<span class="token punctuation">.</span>exports <span class="token operator">=</span> <span class="token punctuation">&#123;</span>
  entry<span class="token punctuation">:</span> <span class="token string">'./src/index.js'</span><span class="token punctuation">,</span>
<span class="token punctuation">&#125;</span><span class="token punctuation">;</span>

<span class="token comment">// src/index.js</span>
<span class="token keyword">export</span> <span class="token keyword">default</span> <span class="token string">'foo'</span><span class="token punctuation">;</span></code>` + "";

	let t8;
	let p1;
	let t9;
	let code0;
	let t10;
	let t11;
	let t12;
	let pre1;

	let raw1_value = `<code class="language-js"><span class="token keyword">const</span> foo <span class="token operator">=</span> <span class="token function">require</span><span class="token punctuation">(</span><span class="token string">'./dist/bundle.js'</span><span class="token punctuation">)</span><span class="token punctuation">;</span>
console<span class="token punctuation">.</span><span class="token function">log</span><span class="token punctuation">(</span>foo<span class="token punctuation">)</span><span class="token punctuation">;</span> <span class="token comment">// prints &#96;&#123;&#125;&#96; (empty object)</span></code>` + "";

	let t13;
	let p2;
	let t14;
	let a5;
	let t15;
	let t16;
	let t17;
	let pre2;

	let raw2_value = `<code class="language-js"><span class="token comment">// dist/bundle.js</span>
<span class="token punctuation">(</span><span class="token keyword">function</span> <span class="token function">webpackStart</span><span class="token punctuation">(</span><span class="token parameter"><span class="token punctuation">&#123;</span> moduleMap<span class="token punctuation">,</span> entryPoint <span class="token punctuation">&#125;</span></span><span class="token punctuation">)</span> <span class="token punctuation">&#123;</span>
  <span class="token comment">// ...</span>
  <span class="token keyword">return</span> <span class="token function">require</span><span class="token punctuation">(</span>entryPoint<span class="token punctuation">)</span><span class="token punctuation">;</span>
<span class="token punctuation">&#125;</span><span class="token punctuation">)</span><span class="token punctuation">(</span><span class="token punctuation">&#123;</span>
  <span class="token string">'src/index.js'</span><span class="token punctuation">:</span> <span class="token keyword">function</span><span class="token punctuation">(</span><span class="token parameter">exports<span class="token punctuation">,</span> require</span><span class="token punctuation">)</span> <span class="token punctuation">&#123;</span>
    exports<span class="token punctuation">.</span>default <span class="token operator">=</span> <span class="token string">'foo'</span><span class="token punctuation">;</span>
  <span class="token punctuation">&#125;</span><span class="token punctuation">,</span>
<span class="token punctuation">&#125;</span><span class="token punctuation">)</span><span class="token punctuation">;</span></code>` + "";

	let t18;
	let p3;
	let em0;
	let t19;
	let code1;
	let t20;
	let t21;
	let t22;
	let p4;
	let t23;
	let t24;
	let ul3;
	let li5;
	let a6;
	let t25;
	let t26;
	let li6;
	let a7;
	let t27;
	let t28;
	let li7;
	let a8;
	let t29;
	let t30;
	let section1;
	let h20;
	let a9;
	let t31;
	let t32;
	let p5;
	let t33;
	let code2;
	let t34;
	let t35;
	let t36;
	let p6;
	let code3;
	let t37;
	let t38;
	let code4;
	let t39;
	let t40;
	let code5;
	let t41;
	let t42;
	let t43;
	let section2;
	let h40;
	let a10;
	let t44;
	let code6;
	let t45;
	let t46;
	let code7;
	let t47;
	let t48;
	let code8;
	let t49;
	let t50;
	let code9;
	let t51;
	let t52;
	let t53;
	let p7;
	let t54;
	let t55;
	let p8;
	let t56;
	let t57;
	let p9;
	let t58;
	let code10;
	let t59;
	let t60;
	let t61;
	let pre3;

	let raw3_value = `<code class="language-js"><span class="token comment">// webpack.config.js</span>
module<span class="token punctuation">.</span>exports <span class="token operator">=</span> <span class="token punctuation">&#123;</span>
  libraryTarget<span class="token punctuation">:</span> <span class="token string">'commonjs2'</span><span class="token punctuation">,</span>
<span class="token punctuation">&#125;</span><span class="token punctuation">;</span>
<span class="token comment">// dist/bundle.js</span>
<span class="token comment">// highlight-next-line</span>
module<span class="token punctuation">.</span>exports <span class="token operator">=</span> <span class="token punctuation">(</span><span class="token keyword">function</span> <span class="token function">webpackStart</span><span class="token punctuation">(</span><span class="token parameter"><span class="token punctuation">&#123;</span> moduleMap<span class="token punctuation">,</span> entryPoint <span class="token punctuation">&#125;</span></span><span class="token punctuation">)</span> <span class="token punctuation">&#123;</span>
  <span class="token comment">// ...</span>
  <span class="token keyword">return</span> <span class="token function">require</span><span class="token punctuation">(</span>entryPoint<span class="token punctuation">)</span><span class="token punctuation">;</span>
<span class="token punctuation">&#125;</span><span class="token punctuation">)</span><span class="token punctuation">(</span><span class="token punctuation">&#123;</span>
  <span class="token string">'src/index.js'</span><span class="token punctuation">:</span> <span class="token keyword">function</span><span class="token punctuation">(</span><span class="token parameter">exports<span class="token punctuation">,</span> require</span><span class="token punctuation">)</span> <span class="token punctuation">&#123;</span>
    exports<span class="token punctuation">.</span>default <span class="token operator">=</span> <span class="token string">'foo'</span><span class="token punctuation">;</span>
  <span class="token punctuation">&#125;</span><span class="token punctuation">,</span>
<span class="token punctuation">&#125;</span><span class="token punctuation">)</span><span class="token punctuation">;</span></code>` + "";

	let t62;
	let p10;
	let code11;
	let t63;
	let t64;
	let code12;
	let t65;
	let t66;
	let code13;
	let t67;
	let t68;
	let t69;
	let p11;
	let t70;
	let code14;
	let t71;
	let t72;
	let code15;
	let t73;
	let t74;
	let t75;
	let blockquote0;
	let p12;
	let t76;
	let a11;
	let t77;
	let t78;
	let t79;
	let section3;
	let h41;
	let a12;
	let t80;
	let code16;
	let t81;
	let t82;
	let code17;
	let t83;
	let t84;
	let code18;
	let t85;
	let t86;
	let code19;
	let t87;
	let t88;
	let code20;
	let t89;
	let t90;
	let p13;
	let t91;
	let t92;
	let p14;
	let t93;
	let code21;
	let t94;
	let t95;
	let t96;
	let pre4;

	let raw4_value = `<code class="language-js"><span class="token comment">// webpack.config.js</span>
module<span class="token punctuation">.</span>exports <span class="token operator">=</span> <span class="token punctuation">&#123;</span>
  libraryTarget<span class="token punctuation">:</span> <span class="token string">'self'</span><span class="token punctuation">,</span>
<span class="token punctuation">&#125;</span><span class="token punctuation">;</span>
<span class="token comment">// dist/bundle.js</span>
<span class="token comment">// highlight-next-line</span>
Object<span class="token punctuation">.</span><span class="token function">assign</span><span class="token punctuation">(</span>
  <span class="token comment">// highlight-next-line</span>
  self<span class="token punctuation">,</span>
  <span class="token punctuation">(</span><span class="token keyword">function</span> <span class="token function">webpackStart</span><span class="token punctuation">(</span><span class="token parameter"><span class="token punctuation">&#123;</span> moduleMap<span class="token punctuation">,</span> entryPoint <span class="token punctuation">&#125;</span></span><span class="token punctuation">)</span> <span class="token punctuation">&#123;</span>
    <span class="token comment">// ...</span>
    <span class="token keyword">return</span> <span class="token function">require</span><span class="token punctuation">(</span>entryPoint<span class="token punctuation">)</span><span class="token punctuation">;</span>
  <span class="token punctuation">&#125;</span><span class="token punctuation">)</span><span class="token punctuation">(</span><span class="token punctuation">&#123;</span>
    <span class="token string">'src/index.js'</span><span class="token punctuation">:</span> <span class="token keyword">function</span><span class="token punctuation">(</span><span class="token parameter">exports<span class="token punctuation">,</span> require</span><span class="token punctuation">)</span> <span class="token punctuation">&#123;</span>
      exports<span class="token punctuation">.</span>default <span class="token operator">=</span> <span class="token string">'foo'</span><span class="token punctuation">;</span>
    <span class="token punctuation">&#125;</span><span class="token punctuation">,</span>
  <span class="token punctuation">&#125;</span><span class="token punctuation">)</span>
<span class="token punctuation">)</span><span class="token punctuation">;</span>
<span class="token comment">// self.default === 'foo'</span></code>` + "";

	let t97;
	let p15;
	let t98;
	let code22;
	let t99;
	let t100;
	let t101;
	let p16;
	let t102;
	let code23;
	let t103;
	let t104;
	let code24;
	let t105;
	let t106;
	let t107;
	let p17;
	let t108;
	let code25;
	let t109;
	let t110;
	let code26;
	let t111;
	let t112;
	let code27;
	let t113;
	let t114;
	let t115;
	let pre5;

	let raw5_value = `<code class="language-js"><span class="token comment">// webpack.config.js</span>
module<span class="token punctuation">.</span>exports <span class="token operator">=</span> <span class="token punctuation">&#123;</span>
  library<span class="token punctuation">:</span> <span class="token string">'myApp'</span><span class="token punctuation">,</span>
  libraryTarget<span class="token punctuation">:</span> <span class="token string">'var'</span><span class="token punctuation">,</span>
<span class="token punctuation">&#125;</span><span class="token punctuation">;</span>

<span class="token comment">// dist/bundle.js</span>
<span class="token comment">// highlight-next-line</span>
<span class="token keyword">var</span> myApp <span class="token operator">=</span> <span class="token punctuation">(</span><span class="token keyword">function</span> <span class="token function">webpackStart</span><span class="token punctuation">(</span><span class="token parameter"><span class="token punctuation">&#123;</span> moduleMap<span class="token punctuation">,</span> entryPoint <span class="token punctuation">&#125;</span></span><span class="token punctuation">)</span> <span class="token punctuation">&#123;</span>
  <span class="token comment">// ...</span>
  <span class="token keyword">return</span> <span class="token function">require</span><span class="token punctuation">(</span>entryPoint<span class="token punctuation">)</span><span class="token punctuation">;</span>
<span class="token punctuation">&#125;</span><span class="token punctuation">)</span><span class="token punctuation">(</span><span class="token punctuation">&#123;</span>
  <span class="token string">'src/index.js'</span><span class="token punctuation">:</span> <span class="token keyword">function</span><span class="token punctuation">(</span><span class="token parameter">exports<span class="token punctuation">,</span> require</span><span class="token punctuation">)</span> <span class="token punctuation">&#123;</span>
    exports<span class="token punctuation">.</span>default <span class="token operator">=</span> <span class="token string">'foo'</span><span class="token punctuation">;</span>
  <span class="token punctuation">&#125;</span><span class="token punctuation">,</span>
<span class="token punctuation">&#125;</span><span class="token punctuation">)</span><span class="token punctuation">;</span>

<span class="token comment">// myApp === &#123; default: 'foo' &#125;</span></code>` + "";

	let t116;
	let p18;
	let t117;
	let code28;
	let t118;
	let t119;
	let code29;
	let t120;
	let t121;
	let t122;
	let pre6;

	let raw6_value = `<code class="language-js"><span class="token comment">// webpack.config.js</span>
module<span class="token punctuation">.</span>exports <span class="token operator">=</span> <span class="token punctuation">&#123;</span>
  library<span class="token punctuation">:</span> <span class="token string">'myApp'</span><span class="token punctuation">,</span>
  libraryTarget<span class="token punctuation">:</span> <span class="token string">'var'</span><span class="token punctuation">,</span>
  libraryExport<span class="token punctuation">:</span> <span class="token string">'default'</span><span class="token punctuation">,</span>
<span class="token punctuation">&#125;</span><span class="token punctuation">;</span>

<span class="token comment">// dist/bundle.js</span>
<span class="token keyword">var</span> myApp <span class="token operator">=</span> <span class="token punctuation">(</span><span class="token keyword">function</span> <span class="token function">webpackStart</span><span class="token punctuation">(</span><span class="token parameter"><span class="token punctuation">&#123;</span> moduleMap<span class="token punctuation">,</span> entryPoint <span class="token punctuation">&#125;</span></span><span class="token punctuation">)</span> <span class="token punctuation">&#123;</span>
  <span class="token comment">// ...</span>
  <span class="token keyword">return</span> <span class="token function">require</span><span class="token punctuation">(</span>entryPoint<span class="token punctuation">)</span><span class="token punctuation">;</span>
<span class="token punctuation">&#125;</span><span class="token punctuation">)</span><span class="token punctuation">(</span><span class="token punctuation">&#123;</span>
  <span class="token string">'src/index.js'</span><span class="token punctuation">:</span> <span class="token keyword">function</span><span class="token punctuation">(</span><span class="token parameter">exports<span class="token punctuation">,</span> require</span><span class="token punctuation">)</span> <span class="token punctuation">&#123;</span>
    exports<span class="token punctuation">.</span>default <span class="token operator">=</span> <span class="token string">'foo'</span><span class="token punctuation">;</span>
  <span class="token punctuation">&#125;</span><span class="token punctuation">,</span>
  <span class="token comment">// highlight-next-line</span>
<span class="token punctuation">&#125;</span><span class="token punctuation">)</span><span class="token punctuation">.</span>default<span class="token punctuation">;</span>

<span class="token comment">// myApp === 'foo'</span></code>` + "";

	let t123;
	let p19;
	let t124;
	let code30;
	let t125;
	let t126;
	let code31;
	let t127;
	let t128;
	let code32;
	let t129;
	let t130;
	let t131;
	let pre7;

	let raw7_value = `<code class="language-js"><span class="token comment">// libraryTarget: 'commonjs2':</span>
module<span class="token punctuation">.</span>exports <span class="token operator">=</span> <span class="token punctuation">&#123;</span><span class="token punctuation">&#123;</span><span class="token constant">BUNDLED_CODE</span><span class="token punctuation">&#125;</span><span class="token punctuation">&#125;</span><span class="token punctuation">;</span>

<span class="token comment">// libraryTarget: 'self':</span>
Object<span class="token punctuation">.</span><span class="token function">assign</span><span class="token punctuation">(</span>self<span class="token punctuation">,</span> <span class="token punctuation">&#123;</span><span class="token punctuation">&#123;</span><span class="token constant">BUNDLED_CODE</span><span class="token punctuation">&#125;</span><span class="token punctuation">&#125;</span><span class="token punctuation">)</span><span class="token punctuation">;</span>

<span class="token comment">// library: 'myApp', libraryTarget: 'var':</span>
<span class="token keyword">var</span> myApp <span class="token operator">=</span> <span class="token punctuation">&#123;</span><span class="token punctuation">&#123;</span><span class="token constant">BUNDLED_CODE</span><span class="token punctuation">&#125;</span><span class="token punctuation">&#125;</span><span class="token punctuation">;</span>

<span class="token comment">// library: 'myApp', libraryTarget: 'var', libraryExport: 'default':</span>
<span class="token keyword">var</span> myApp <span class="token operator">=</span> <span class="token punctuation">&#123;</span><span class="token punctuation">&#123;</span><span class="token constant">BUNDLED_CODE</span><span class="token punctuation">&#125;</span><span class="token punctuation">&#125;</span><span class="token punctuation">.</span>default<span class="token punctuation">;</span></code>` + "";

	let t132;
	let p20;
	let t133;
	let t134;
	let pre8;

	let raw8_value = `<code class="language-js"><span class="token comment">// libraryTarget: ???</span>
customRegistry<span class="token punctuation">.</span><span class="token function">register</span><span class="token punctuation">(</span><span class="token string">'my-app'</span><span class="token punctuation">,</span> <span class="token punctuation">&#123;</span><span class="token punctuation">&#123;</span><span class="token constant">BUNDLED_CODE</span><span class="token punctuation">&#125;</span><span class="token punctuation">&#125;</span><span class="token punctuation">)</span><span class="token punctuation">;</span></code>` + "";

	let t135;
	let p21;
	let t136;
	let a13;
	let t137;
	let t138;
	let t139;
	let section4;
	let h21;
	let a14;
	let t140;
	let t141;
	let p22;
	let t142;
	let a15;
	let t143;
	let t144;
	let a16;
	let t145;
	let t146;
	let code33;
	let t147;
	let t148;
	let t149;
	let pre9;

	let raw9_value = `<code class="language-js"><span class="token comment">// webpack/lib/LibraryTemplatePlugin.js</span>
<span class="token keyword">class</span> <span class="token class-name">LibraryTemplatePlugin</span> <span class="token punctuation">&#123;</span>
<span class="token comment">// ...</span>
<span class="token function">apply</span> <span class="token punctuation">(</span><span class="token parameter">compiler</span><span class="token punctuation">)</span> <span class="token punctuation">&#123;</span>
<span class="token comment">// ...</span>
<span class="token keyword">switch</span> <span class="token punctuation">(</span><span class="token keyword">this</span><span class="token punctuation">.</span>options<span class="token punctuation">.</span>libraryTarget<span class="token punctuation">)</span> <span class="token punctuation">&#123;</span>
  <span class="token keyword">case</span> <span class="token string">'amd'</span><span class="token punctuation">:</span>
  <span class="token keyword">case</span> <span class="token string">'amd-require'</span><span class="token punctuation">:</span>
    <span class="token comment">// ...</span>
    <span class="token keyword">new</span> <span class="token class-name">AmdTemplatePlugin</span><span class="token punctuation">(</span><span class="token comment">/*...*/</span><span class="token punctuation">)</span><span class="token punctuation">.</span><span class="token function">apply</span><span class="token punctuation">(</span>compiler<span class="token punctuation">)</span><span class="token punctuation">;</span>
    <span class="token keyword">break</span><span class="token punctuation">;</span>
  <span class="token keyword">case</span> <span class="token string">'var'</span><span class="token punctuation">:</span>
    <span class="token comment">// ...</span>
    <span class="token keyword">new</span> <span class="token class-name">SetVarTemplatePlugin</span><span class="token punctuation">(</span><span class="token comment">/*...*/</span><span class="token punctuation">)</span><span class="token punctuation">.</span><span class="token function">apply</span><span class="token punctuation">(</span>compiler<span class="token punctuation">)</span><span class="token punctuation">;</span>
    <span class="token keyword">break</span><span class="token punctuation">;</span>
  <span class="token keyword">case</span> <span class="token string">'this'</span><span class="token punctuation">:</span>
  <span class="token keyword">case</span> <span class="token string">'self'</span><span class="token punctuation">:</span>
  <span class="token keyword">case</span> <span class="token string">'window'</span><span class="token punctuation">:</span>
    <span class="token comment">// ...</span>
    <span class="token keyword">new</span> <span class="token class-name">SetVarTemplatePlugin</span><span class="token punctuation">(</span><span class="token comment">/*...*/</span><span class="token punctuation">)</span><span class="token punctuation">.</span><span class="token function">apply</span><span class="token punctuation">(</span>compiler<span class="token punctuation">)</span><span class="token punctuation">;</span>
    <span class="token keyword">break</span><span class="token punctuation">;</span>
  <span class="token comment">// ...</span>
<span class="token punctuation">&#125;</span></code>` + "";

	let t150;
	let p23;
	let t151;
	let a17;
	let t152;
	let t153;
	let t154;
	let pre10;

	let raw10_value = `<code class="language-js"><span class="token keyword">const</span> <span class="token punctuation">&#123;</span> ConcatSource <span class="token punctuation">&#125;</span> <span class="token operator">=</span> <span class="token function">require</span><span class="token punctuation">(</span><span class="token string">'webpack-sources'</span><span class="token punctuation">)</span><span class="token punctuation">;</span>

<span class="token keyword">class</span> <span class="token class-name">SetVarTemplatePlugin</span> <span class="token punctuation">&#123;</span>
  <span class="token comment">// ...</span>
  <span class="token function">apply</span><span class="token punctuation">(</span><span class="token parameter">compiler</span><span class="token punctuation">)</span> <span class="token punctuation">&#123;</span>
    compiler<span class="token punctuation">.</span>hooks<span class="token punctuation">.</span>thisCompilation<span class="token punctuation">.</span><span class="token function">tap</span><span class="token punctuation">(</span><span class="token string">'SetVarTemplatePlugin'</span><span class="token punctuation">,</span> <span class="token parameter">compilation</span> <span class="token operator">=></span> <span class="token punctuation">&#123;</span>
      <span class="token comment">// ...</span>
      hooks<span class="token punctuation">.</span>render<span class="token punctuation">.</span><span class="token function">tap</span><span class="token punctuation">(</span>
        <span class="token string">'SetVarTemplatePlugin'</span><span class="token punctuation">,</span>
        <span class="token punctuation">(</span><span class="token parameter">source<span class="token punctuation">,</span> <span class="token punctuation">&#123;</span> chunk<span class="token punctuation">,</span> chunkGraph <span class="token punctuation">&#125;</span></span><span class="token punctuation">)</span> <span class="token operator">=></span> <span class="token punctuation">&#123;</span>
          <span class="token comment">// ...</span>
          <span class="token comment">// highlight-start</span>
          <span class="token keyword">const</span> prefix <span class="token operator">=</span> <span class="token template-string"><span class="token template-punctuation string">&#96;</span><span class="token interpolation"><span class="token interpolation-punctuation punctuation">$&#123;</span>varExpression<span class="token interpolation-punctuation punctuation">&#125;</span></span><span class="token string"> =</span><span class="token template-punctuation string">&#96;</span></span><span class="token punctuation">;</span>
          <span class="token keyword">return</span> <span class="token keyword">new</span> <span class="token class-name">ConcatSource</span><span class="token punctuation">(</span>prefix<span class="token punctuation">,</span> source<span class="token punctuation">)</span><span class="token punctuation">;</span>
          <span class="token comment">// highlight-end</span>
        <span class="token punctuation">&#125;</span>
      <span class="token punctuation">)</span><span class="token punctuation">;</span>
    <span class="token punctuation">&#125;</span><span class="token punctuation">)</span><span class="token punctuation">;</span>
    <span class="token comment">// ...</span>
  <span class="token punctuation">&#125;</span>
<span class="token punctuation">&#125;</span></code>` + "";

	let t155;
	let p24;
	let t156;
	let code34;
	let t157;
	let t158;
	let code35;
	let t159;
	let t160;
	let code36;
	let t161;
	let t162;
	let code37;
	let t163;
	let t164;
	let code38;
	let t165;
	let t166;
	let t167;
	let p25;
	let t168;
	let t169;
	let pre11;
	let raw11_value = `<code class="language-js">customRegistry<span class="token punctuation">.</span><span class="token function">register</span><span class="token punctuation">(</span><span class="token string">'my-app'</span><span class="token punctuation">,</span> <span class="token punctuation">&#123;</span><span class="token punctuation">&#123;</span><span class="token constant">BUNDLED_CODE</span><span class="token punctuation">&#125;</span><span class="token punctuation">&#125;</span><span class="token punctuation">)</span><span class="token punctuation">;</span></code>` + "";
	let t170;
	let p26;
	let t171;
	let t172;
	let pre12;
	let raw12_value = `<code class="language-js"><span class="token keyword">return</span> <span class="token keyword">new</span> <span class="token class-name">ConcatSource</span><span class="token punctuation">(</span><span class="token template-string"><span class="token template-punctuation string">&#96;</span><span class="token string">customRegistry.register('my-app', </span><span class="token template-punctuation string">&#96;</span></span><span class="token punctuation">,</span> source<span class="token punctuation">,</span> <span class="token string">')'</span><span class="token punctuation">)</span><span class="token punctuation">;</span></code>` + "";
	let t173;
	let p27;
	let t174;
	let t175;
	let ol0;
	let li8;
	let t176;
	let a18;
	let t177;
	let t178;
	let li9;
	let t179;
	let t180;
	let li10;
	let t181;
	let code39;
	let t182;
	let t183;
	let code40;
	let t184;
	let t185;
	let li11;
	let t186;
	let code41;
	let t187;
	let t188;
	let t189;
	let pre13;
	let raw13_value = `<code class="language-js"><span class="token keyword">return</span> <span class="token keyword">new</span> <span class="token class-name">ConcatSource</span><span class="token punctuation">(</span><span class="token template-string"><span class="token template-punctuation string">&#96;</span><span class="token string">customRegistry.register('my-app', </span><span class="token template-punctuation string">&#96;</span></span><span class="token punctuation">,</span> source<span class="token punctuation">,</span> <span class="token string">')'</span><span class="token punctuation">)</span><span class="token punctuation">;</span></code>` + "";
	let t190;
	let ol1;
	let li12;
	let t191;
	let code42;
	let t192;
	let t193;
	let code43;
	let t194;
	let t195;
	let t196;
	let li13;
	let t197;
	let t198;
	let pre14;

	let raw14_value = `<code class="language-js"><span class="token comment">// webpack.config.js</span>
module<span class="token punctuation">.</span>exports <span class="token operator">=</span> <span class="token punctuation">&#123;</span>
  plugins<span class="token punctuation">:</span> <span class="token punctuation">[</span><span class="token keyword">new</span> <span class="token class-name">SetModuleTemplatePlugin</span><span class="token punctuation">(</span><span class="token punctuation">)</span><span class="token punctuation">]</span><span class="token punctuation">,</span>
<span class="token punctuation">&#125;</span><span class="token punctuation">;</span></code>` + "";

	let t199;
	let p28;
	let t200;
	let t201;
	let p29;
	let t202;
	let t203;
	let p30;
	let t204;
	let a19;
	let t205;
	let t206;
	let a20;
	let t207;
	let t208;
	let t209;
	let p31;
	let t210;
	let t211;
	let pre15;

	let raw15_value = `<code class="language-js"><span class="token keyword">const</span> FlagEntryExportAsUsedPlugin <span class="token operator">=</span> <span class="token function">require</span><span class="token punctuation">(</span><span class="token string">"./FlagEntryExportAsUsedPlugin"</span><span class="token punctuation">)</span><span class="token punctuation">;</span>
<span class="token keyword">new</span> <span class="token class-name">FlagEntryExportAsUsedPlugin</span><span class="token punctuation">(</span>
  <span class="token keyword">this</span><span class="token punctuation">.</span>options<span class="token punctuation">.</span>libraryTarget <span class="token operator">!==</span> <span class="token string">"module"</span><span class="token punctuation">,</span>
  <span class="token string">"used a library export"</span>
<span class="token punctuation">)</span><span class="token punctuation">.</span><span class="token function">apply</span><span class="token punctuation">(</span>compiler<span class="token punctuation">)</span><span class="token punctuation">;</span></code>` + "";

	let t212;
	let p32;
	let t213;
	let em1;
	let t214;
	let t215;
	let t216;
	let blockquote2;
	let p33;
	let t217;
	let strong0;
	let t218;
	let t219;
	let t220;
	let blockquote1;
	let p34;
	let t221;
	let strong1;
	let t222;
	let t223;
	let t224;
	let p35;
	let t225;
	let code44;
	let t226;
	let t227;
	let t228;
	let p36;
	let t229;
	let a21;
	let t230;
	let t231;
	let t232;
	let p37;
	let t233;
	let code45;
	let t234;
	let t235;
	let t236;
	let p38;
	let t237;
	let code46;
	let t238;
	let t239;
	let t240;
	let p39;
	let strong2;
	let t241;
	let t242;
	let section5;
	let h22;
	let a22;
	let t243;
	let t244;
	let p40;
	let t245;
	let t246;
	let p41;
	let em2;
	let t247;
	let a23;
	let t248;
	let t249;

	return {
		c() {
			section0 = element("section");
			ul2 = element("ul");
			li0 = element("li");
			a0 = element("a");
			t0 = text("Webpack's output.library *  options");
			ul1 = element("ul");
			ul0 = element("ul");
			li1 = element("li");
			a1 = element("a");
			t1 = text("1. Name of a module system:  \"commonjs\" ,  \"commonjs2\" ,  \"amd\" ,  \"umd\" , ...");
			li2 = element("li");
			a2 = element("a");
			t2 = text("2. Name of a variable:  \"var\" ,  \"this\" ,  \"self\" ,  \"window\" ,  \"global\"");
			li3 = element("li");
			a3 = element("a");
			t3 = text("Writing a webpack plugin");
			li4 = element("li");
			a4 = element("a");
			t4 = text("Closing Note");
			t5 = space();
			p0 = element("p");
			t6 = text("If you are using webpack to bundle your library, you most likely will export something in your entry file:");
			t7 = space();
			pre0 = element("pre");
			t8 = space();
			p1 = element("p");
			t9 = text("And if you build it with webpack just like that, out-of-the-box, you may be surprised that if you try to ");
			code0 = element("code");
			t10 = text("require()");
			t11 = text(" the built file, you would find that there's nothing being exported by the built file.");
			t12 = space();
			pre1 = element("pre");
			t13 = space();
			p2 = element("p");
			t14 = text("If you've read ");
			a5 = element("a");
			t15 = text("my previous article on writing a module bundler");
			t16 = text(", you can imagine that the output bundle looks something like this:");
			t17 = space();
			pre2 = element("pre");
			t18 = space();
			p3 = element("p");
			em0 = element("em");
			t19 = text("(Everything should be familiar, except the fact that instead of calling ");
			code1 = element("code");
			t20 = text("webpackStart");
			t21 = text(" in a separate statement, I made it into a IIFE (Immediately Invoked Function Expression) for reasons that will be apparent later)");
			t22 = space();
			p4 = element("p");
			t23 = text("In order to build for a library, ie: to expose whatever is exported by the entry file, webpack provides 3 options that you can play with:");
			t24 = space();
			ul3 = element("ul");
			li5 = element("li");
			a6 = element("a");
			t25 = text("output.library");
			t26 = space();
			li6 = element("li");
			a7 = element("a");
			t27 = text("output.libraryExport");
			t28 = space();
			li7 = element("li");
			a8 = element("a");
			t29 = text("output.libraryTarget");
			t30 = space();
			section1 = element("section");
			h20 = element("h2");
			a9 = element("a");
			t31 = text("Webpack's output.library* options");
			t32 = space();
			p5 = element("p");
			t33 = text("To understand how each of them works, let's start with ");
			code2 = element("code");
			t34 = text("output.libraryTarget");
			t35 = text(".");
			t36 = space();
			p6 = element("p");
			code3 = element("code");
			t37 = text("output.libraryTarget");
			t38 = text(" accepts ");
			code4 = element("code");
			t39 = text("string");
			t40 = text(" as value, there are 2 main groups of values that you can provide to the ");
			code5 = element("code");
			t41 = text("output.libraryTarget");
			t42 = text(" option:");
			t43 = space();
			section2 = element("section");
			h40 = element("h4");
			a10 = element("a");
			t44 = text("1. Name of a module system: ");
			code6 = element("code");
			t45 = text("\"commonjs\"");
			t46 = text(", ");
			code7 = element("code");
			t47 = text("\"commonjs2\"");
			t48 = text(", ");
			code8 = element("code");
			t49 = text("\"amd\"");
			t50 = text(", ");
			code9 = element("code");
			t51 = text("\"umd\"");
			t52 = text(", ...");
			t53 = space();
			p7 = element("p");
			t54 = text("Webpack allows you to specify the name of the module system that you want to use to expose the exported values of the entry file.");
			t55 = space();
			p8 = element("p");
			t56 = text("You can specify a module system that is different from the one that you are using in your library.");
			t57 = space();
			p9 = element("p");
			t58 = text("Let's try ");
			code10 = element("code");
			t59 = text("commonjs2");
			t60 = text(" as an example:");
			t61 = space();
			pre3 = element("pre");
			t62 = space();
			p10 = element("p");
			code11 = element("code");
			t63 = text("commonjs2");
			t64 = text(" uses ");
			code12 = element("code");
			t65 = text("module.exports");
			t66 = text(" to export values from a module. In this example, webpack assigns the return value of the IIFE to ");
			code13 = element("code");
			t67 = text("module.exports");
			t68 = text(".");
			t69 = space();
			p11 = element("p");
			t70 = text("If you look at the bundled code, it is not much different than the one without specifying ");
			code14 = element("code");
			t71 = text("output.libraryTarget");
			t72 = text(". The only difference is that the bundled code is prefixed with ");
			code15 = element("code");
			t73 = text("module.exports =");
			t74 = text(";");
			t75 = space();
			blockquote0 = element("blockquote");
			p12 = element("p");
			t76 = text("By the way, if you are curious about the difference between commonjs and commonjs2, you can follow the thread of ");
			a11 = element("a");
			t77 = text("this issue");
			t78 = text(".");
			t79 = space();
			section3 = element("section");
			h41 = element("h4");
			a12 = element("a");
			t80 = text("2. Name of a variable: ");
			code16 = element("code");
			t81 = text("\"var\"");
			t82 = text(", ");
			code17 = element("code");
			t83 = text("\"this\"");
			t84 = text(", ");
			code18 = element("code");
			t85 = text("\"self\"");
			t86 = text(", ");
			code19 = element("code");
			t87 = text("\"window\"");
			t88 = text(", ");
			code20 = element("code");
			t89 = text("\"global\"");
			t90 = space();
			p13 = element("p");
			t91 = text("On the other hand, instead of exposing the library content through a module system, you can specify the variable name which the export object is assigned to.");
			t92 = space();
			p14 = element("p");
			t93 = text("Let's take ");
			code21 = element("code");
			t94 = text("self");
			t95 = text(" as an example:");
			t96 = space();
			pre4 = element("pre");
			t97 = space();
			p15 = element("p");
			t98 = text("All the exported values are assigned to ");
			code22 = element("code");
			t99 = text("self");
			t100 = text(".");
			t101 = space();
			p16 = element("p");
			t102 = text("Again observe the bundled code, this time round we prefixed the bundled code with ");
			code23 = element("code");
			t103 = text("Object.assign(self,");
			t104 = text(" and suffixed it with ");
			code24 = element("code");
			t105 = text(");");
			t106 = text(".");
			t107 = space();
			p17 = element("p");
			t108 = text("Specifiying the ");
			code25 = element("code");
			t109 = text("output.libraryTarget");
			t110 = text(" as ");
			code26 = element("code");
			t111 = text("var");
			t112 = text(" on the other hand, allows you to assign it to a variable name, which you can provide in ");
			code27 = element("code");
			t113 = text("output.library");
			t114 = text(" option:");
			t115 = space();
			pre5 = element("pre");
			t116 = space();
			p18 = element("p");
			t117 = text("If you don't want ");
			code28 = element("code");
			t118 = text("myApp");
			t119 = text(" to contain all the exported value of the entry file, you can provide the key that you want to export only in the ");
			code29 = element("code");
			t120 = text("output.libraryExport");
			t121 = text(" option:");
			t122 = space();
			pre6 = element("pre");
			t123 = space();
			p19 = element("p");
			t124 = text("Again you can observe that by playing different option values of ");
			code30 = element("code");
			t125 = text("output.library");
			t126 = text(", ");
			code31 = element("code");
			t127 = text("output.libraryTarget");
			t128 = text(", ");
			code32 = element("code");
			t129 = text("output.libraryExport");
			t130 = text(", webpack adds different prefix and suffix to the bundled code:");
			t131 = space();
			pre7 = element("pre");
			t132 = space();
			p20 = element("p");
			t133 = text("So, instead of using the webpack built-in library targets, what should we do if we want to support a custom library target that looks something like below:");
			t134 = space();
			pre8 = element("pre");
			t135 = space();
			p21 = element("p");
			t136 = text("I searched through the ");
			a13 = element("a");
			t137 = text("webpack official docs");
			t138 = text(" and found no options that allows that. So the only solution at the moment is to write a webpack plugin.");
			t139 = space();
			section4 = element("section");
			h21 = element("h2");
			a14 = element("a");
			t140 = text("Writing a webpack plugin");
			t141 = space();
			p22 = element("p");
			t142 = text("After digging around the ");
			a15 = element("a");
			t143 = text("webpack source code");
			t144 = text(", I found out that ");
			a16 = element("a");
			t145 = text("LibraryTemplatePlugin");
			t146 = text(" instantiates different TemplatePlugins based on the value of the ");
			code33 = element("code");
			t147 = text("output.libraryTarget");
			t148 = text(" option:");
			t149 = space();
			pre9 = element("pre");
			t150 = space();
			p23 = element("p");
			t151 = text("I went to look into one of the TemplatePlugins, the ");
			a17 = element("a");
			t152 = text("SetVarTemplatePlugin");
			t153 = text(":");
			t154 = space();
			pre10 = element("pre");
			t155 = space();
			p24 = element("p");
			t156 = text("I don't understand line-by-line everything that happened in the file, but I do know that the line highlighted above, is where webpack concats the ");
			code34 = element("code");
			t157 = text("varExpression =");
			t158 = text(" (in the case of ");
			code35 = element("code");
			t159 = text("commonjs");
			t160 = text(", ");
			code36 = element("code");
			t161 = text("varExpression");
			t162 = text(" is ");
			code37 = element("code");
			t163 = text("module.exports");
			t164 = text(", thus ");
			code38 = element("code");
			t165 = text("module.exports =");
			t166 = text(") and the source (which in this case is the bundled code).");
			t167 = space();
			p25 = element("p");
			t168 = text("So, to have the following:");
			t169 = space();
			pre11 = element("pre");
			t170 = space();
			p26 = element("p");
			t171 = text("we need:");
			t172 = space();
			pre12 = element("pre");
			t173 = space();
			p27 = element("p");
			t174 = text("So, I did the following:");
			t175 = space();
			ol0 = element("ol");
			li8 = element("li");
			t176 = text("Created a new file and pasted the entire source from ");
			a18 = element("a");
			t177 = text("SetVarTemplatePlugin.js");
			t178 = space();
			li9 = element("li");
			t179 = text("Searched + replaced to rename the plugin name to something more appropriate, (SetModuleTemplatePlugin)");
			t180 = space();
			li10 = element("li");
			t181 = text("Replaced relative import, ");
			code39 = element("code");
			t182 = text("require(\"./RuntimeGlobals\")");
			t183 = text(" to require from webpack, ");
			code40 = element("code");
			t184 = text("require(\"webpack/lib/RuntimeGlobals\")");
			t185 = space();
			li11 = element("li");
			t186 = text("Replaced the line ");
			code41 = element("code");
			t187 = text("return new ConcatSource(prefix, source);");
			t188 = text(" to the following:");
			t189 = space();
			pre13 = element("pre");
			t190 = space();
			ol1 = element("ol");
			li12 = element("li");
			t191 = text("Removed ");
			code42 = element("code");
			t192 = text("output.library");
			t193 = text(", ");
			code43 = element("code");
			t194 = text("output.libraryTarget");
			t195 = text(" from webpack config");
			t196 = space();
			li13 = element("li");
			t197 = text("Added my new plugin:");
			t198 = space();
			pre14 = element("pre");
			t199 = space();
			p28 = element("p");
			t200 = text("To my surprise, it worked! Almost.");
			t201 = space();
			p29 = element("p");
			t202 = text("When I run the bundled code, the customRegistry registered an empty object, nothing is exported from the bundled code.");
			t203 = space();
			p30 = element("p");
			t204 = text("I went into ");
			a19 = element("a");
			t205 = text("LibraryTemplatePlugin.js");
			t206 = text(" to look about, because that's the most obvious place to start looking, since I've copied line-by-line from ");
			a20 = element("a");
			t207 = text("SetVarTemplatePlugin.js");
			t208 = text(".");
			t209 = space();
			p31 = element("p");
			t210 = text("I found a pretty obvious line that says:");
			t211 = space();
			pre15 = element("pre");
			t212 = space();
			p32 = element("p");
			t213 = text("If I would have to guess, I think that what this line is doing is to mark the export of the entry file as used, so that webpack would not ");
			em1 = element("em");
			t214 = text("treeshake them away");
			t215 = text(".");
			t216 = space();
			blockquote2 = element("blockquote");
			p33 = element("p");
			t217 = text("Which, ");
			strong0 = element("strong");
			t218 = text("treeshake");
			t219 = text(" is a cool word that means remove them.");
			t220 = space();
			blockquote1 = element("blockquote");
			p34 = element("p");
			t221 = text("Which you could argue that ");
			strong1 = element("strong");
			t222 = text("treeshake");
			t223 = text(" does way more that just remove the entry exports, it removes things that is only used by the entry exports, recursively.");
			t224 = space();
			p35 = element("p");
			t225 = text("I added these 2 lines into my ");
			code44 = element("code");
			t226 = text("SetModuleTemplatePlugin");
			t227 = text(", and it worked! Perfectly this time. 🎉");
			t228 = space();
			p36 = element("p");
			t229 = text("I created ");
			a21 = element("a");
			t230 = text("a gist");
			t231 = text(" for the complete code, if you are lazy.");
			t232 = space();
			p37 = element("p");
			t233 = text("Lastly, if you noticed, this example is based on the latest master webpack source (at the time writing), which is ");
			code45 = element("code");
			t234 = text("webpack@5.0.0-beta.12");
			t235 = text(".");
			t236 = space();
			p38 = element("p");
			t237 = text("If you want a similar plugin with ");
			code46 = element("code");
			t238 = text("webpack^4");
			t239 = text(", you can trust me that this article serves as a good enough entry point for you to write the plugin on your own.");
			t240 = space();
			p39 = element("p");
			strong2 = element("strong");
			t241 = text("And I trust you that you can do it. 😎");
			t242 = space();
			section5 = element("section");
			h22 = element("h2");
			a22 = element("a");
			t243 = text("Closing Note");
			t244 = space();
			p40 = element("p");
			t245 = text("Writing a webpack plugin is not impossible. It will especially be easier if you have a good understanding how webpack as a bundler works.");
			t246 = space();
			p41 = element("p");
			em2 = element("em");
			t247 = text("(Plug: if you want to know more, you can read my ");
			a23 = element("a");
			t248 = text("\"What is module bundler and how does it work?\"");
			t249 = text(")");
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
			t0 = claim_text(a0_nodes, "Webpack's output.library *  options");
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
			t1 = claim_text(a1_nodes, "1. Name of a module system:  \"commonjs\" ,  \"commonjs2\" ,  \"amd\" ,  \"umd\" , ...");
			a1_nodes.forEach(detach);
			li1_nodes.forEach(detach);
			li2 = claim_element(ul0_nodes, "LI", {});
			var li2_nodes = children(li2);
			a2 = claim_element(li2_nodes, "A", { href: true });
			var a2_nodes = children(a2);
			t2 = claim_text(a2_nodes, "2. Name of a variable:  \"var\" ,  \"this\" ,  \"self\" ,  \"window\" ,  \"global\"");
			a2_nodes.forEach(detach);
			li2_nodes.forEach(detach);
			ul0_nodes.forEach(detach);
			ul1_nodes.forEach(detach);
			li3 = claim_element(ul2_nodes, "LI", {});
			var li3_nodes = children(li3);
			a3 = claim_element(li3_nodes, "A", { href: true });
			var a3_nodes = children(a3);
			t3 = claim_text(a3_nodes, "Writing a webpack plugin");
			a3_nodes.forEach(detach);
			li3_nodes.forEach(detach);
			li4 = claim_element(ul2_nodes, "LI", {});
			var li4_nodes = children(li4);
			a4 = claim_element(li4_nodes, "A", { href: true });
			var a4_nodes = children(a4);
			t4 = claim_text(a4_nodes, "Closing Note");
			a4_nodes.forEach(detach);
			li4_nodes.forEach(detach);
			ul2_nodes.forEach(detach);
			section0_nodes.forEach(detach);
			t5 = claim_space(nodes);
			p0 = claim_element(nodes, "P", {});
			var p0_nodes = children(p0);
			t6 = claim_text(p0_nodes, "If you are using webpack to bundle your library, you most likely will export something in your entry file:");
			p0_nodes.forEach(detach);
			t7 = claim_space(nodes);
			pre0 = claim_element(nodes, "PRE", { class: true });
			var pre0_nodes = children(pre0);
			pre0_nodes.forEach(detach);
			t8 = claim_space(nodes);
			p1 = claim_element(nodes, "P", {});
			var p1_nodes = children(p1);
			t9 = claim_text(p1_nodes, "And if you build it with webpack just like that, out-of-the-box, you may be surprised that if you try to ");
			code0 = claim_element(p1_nodes, "CODE", {});
			var code0_nodes = children(code0);
			t10 = claim_text(code0_nodes, "require()");
			code0_nodes.forEach(detach);
			t11 = claim_text(p1_nodes, " the built file, you would find that there's nothing being exported by the built file.");
			p1_nodes.forEach(detach);
			t12 = claim_space(nodes);
			pre1 = claim_element(nodes, "PRE", { class: true });
			var pre1_nodes = children(pre1);
			pre1_nodes.forEach(detach);
			t13 = claim_space(nodes);
			p2 = claim_element(nodes, "P", {});
			var p2_nodes = children(p2);
			t14 = claim_text(p2_nodes, "If you've read ");
			a5 = claim_element(p2_nodes, "A", { href: true });
			var a5_nodes = children(a5);
			t15 = claim_text(a5_nodes, "my previous article on writing a module bundler");
			a5_nodes.forEach(detach);
			t16 = claim_text(p2_nodes, ", you can imagine that the output bundle looks something like this:");
			p2_nodes.forEach(detach);
			t17 = claim_space(nodes);
			pre2 = claim_element(nodes, "PRE", { class: true });
			var pre2_nodes = children(pre2);
			pre2_nodes.forEach(detach);
			t18 = claim_space(nodes);
			p3 = claim_element(nodes, "P", {});
			var p3_nodes = children(p3);
			em0 = claim_element(p3_nodes, "EM", {});
			var em0_nodes = children(em0);
			t19 = claim_text(em0_nodes, "(Everything should be familiar, except the fact that instead of calling ");
			code1 = claim_element(em0_nodes, "CODE", {});
			var code1_nodes = children(code1);
			t20 = claim_text(code1_nodes, "webpackStart");
			code1_nodes.forEach(detach);
			t21 = claim_text(em0_nodes, " in a separate statement, I made it into a IIFE (Immediately Invoked Function Expression) for reasons that will be apparent later)");
			em0_nodes.forEach(detach);
			p3_nodes.forEach(detach);
			t22 = claim_space(nodes);
			p4 = claim_element(nodes, "P", {});
			var p4_nodes = children(p4);
			t23 = claim_text(p4_nodes, "In order to build for a library, ie: to expose whatever is exported by the entry file, webpack provides 3 options that you can play with:");
			p4_nodes.forEach(detach);
			t24 = claim_space(nodes);
			ul3 = claim_element(nodes, "UL", {});
			var ul3_nodes = children(ul3);
			li5 = claim_element(ul3_nodes, "LI", {});
			var li5_nodes = children(li5);
			a6 = claim_element(li5_nodes, "A", { href: true, rel: true });
			var a6_nodes = children(a6);
			t25 = claim_text(a6_nodes, "output.library");
			a6_nodes.forEach(detach);
			li5_nodes.forEach(detach);
			t26 = claim_space(ul3_nodes);
			li6 = claim_element(ul3_nodes, "LI", {});
			var li6_nodes = children(li6);
			a7 = claim_element(li6_nodes, "A", { href: true, rel: true });
			var a7_nodes = children(a7);
			t27 = claim_text(a7_nodes, "output.libraryExport");
			a7_nodes.forEach(detach);
			li6_nodes.forEach(detach);
			t28 = claim_space(ul3_nodes);
			li7 = claim_element(ul3_nodes, "LI", {});
			var li7_nodes = children(li7);
			a8 = claim_element(li7_nodes, "A", { href: true, rel: true });
			var a8_nodes = children(a8);
			t29 = claim_text(a8_nodes, "output.libraryTarget");
			a8_nodes.forEach(detach);
			li7_nodes.forEach(detach);
			ul3_nodes.forEach(detach);
			t30 = claim_space(nodes);
			section1 = claim_element(nodes, "SECTION", {});
			var section1_nodes = children(section1);
			h20 = claim_element(section1_nodes, "H2", {});
			var h20_nodes = children(h20);
			a9 = claim_element(h20_nodes, "A", { href: true, id: true });
			var a9_nodes = children(a9);
			t31 = claim_text(a9_nodes, "Webpack's output.library* options");
			a9_nodes.forEach(detach);
			h20_nodes.forEach(detach);
			t32 = claim_space(section1_nodes);
			p5 = claim_element(section1_nodes, "P", {});
			var p5_nodes = children(p5);
			t33 = claim_text(p5_nodes, "To understand how each of them works, let's start with ");
			code2 = claim_element(p5_nodes, "CODE", {});
			var code2_nodes = children(code2);
			t34 = claim_text(code2_nodes, "output.libraryTarget");
			code2_nodes.forEach(detach);
			t35 = claim_text(p5_nodes, ".");
			p5_nodes.forEach(detach);
			t36 = claim_space(section1_nodes);
			p6 = claim_element(section1_nodes, "P", {});
			var p6_nodes = children(p6);
			code3 = claim_element(p6_nodes, "CODE", {});
			var code3_nodes = children(code3);
			t37 = claim_text(code3_nodes, "output.libraryTarget");
			code3_nodes.forEach(detach);
			t38 = claim_text(p6_nodes, " accepts ");
			code4 = claim_element(p6_nodes, "CODE", {});
			var code4_nodes = children(code4);
			t39 = claim_text(code4_nodes, "string");
			code4_nodes.forEach(detach);
			t40 = claim_text(p6_nodes, " as value, there are 2 main groups of values that you can provide to the ");
			code5 = claim_element(p6_nodes, "CODE", {});
			var code5_nodes = children(code5);
			t41 = claim_text(code5_nodes, "output.libraryTarget");
			code5_nodes.forEach(detach);
			t42 = claim_text(p6_nodes, " option:");
			p6_nodes.forEach(detach);
			section1_nodes.forEach(detach);
			t43 = claim_space(nodes);
			section2 = claim_element(nodes, "SECTION", {});
			var section2_nodes = children(section2);
			h40 = claim_element(section2_nodes, "H4", {});
			var h40_nodes = children(h40);
			a10 = claim_element(h40_nodes, "A", { href: true, id: true });
			var a10_nodes = children(a10);
			t44 = claim_text(a10_nodes, "1. Name of a module system: ");
			code6 = claim_element(a10_nodes, "CODE", {});
			var code6_nodes = children(code6);
			t45 = claim_text(code6_nodes, "\"commonjs\"");
			code6_nodes.forEach(detach);
			t46 = claim_text(a10_nodes, ", ");
			code7 = claim_element(a10_nodes, "CODE", {});
			var code7_nodes = children(code7);
			t47 = claim_text(code7_nodes, "\"commonjs2\"");
			code7_nodes.forEach(detach);
			t48 = claim_text(a10_nodes, ", ");
			code8 = claim_element(a10_nodes, "CODE", {});
			var code8_nodes = children(code8);
			t49 = claim_text(code8_nodes, "\"amd\"");
			code8_nodes.forEach(detach);
			t50 = claim_text(a10_nodes, ", ");
			code9 = claim_element(a10_nodes, "CODE", {});
			var code9_nodes = children(code9);
			t51 = claim_text(code9_nodes, "\"umd\"");
			code9_nodes.forEach(detach);
			t52 = claim_text(a10_nodes, ", ...");
			a10_nodes.forEach(detach);
			h40_nodes.forEach(detach);
			t53 = claim_space(section2_nodes);
			p7 = claim_element(section2_nodes, "P", {});
			var p7_nodes = children(p7);
			t54 = claim_text(p7_nodes, "Webpack allows you to specify the name of the module system that you want to use to expose the exported values of the entry file.");
			p7_nodes.forEach(detach);
			t55 = claim_space(section2_nodes);
			p8 = claim_element(section2_nodes, "P", {});
			var p8_nodes = children(p8);
			t56 = claim_text(p8_nodes, "You can specify a module system that is different from the one that you are using in your library.");
			p8_nodes.forEach(detach);
			t57 = claim_space(section2_nodes);
			p9 = claim_element(section2_nodes, "P", {});
			var p9_nodes = children(p9);
			t58 = claim_text(p9_nodes, "Let's try ");
			code10 = claim_element(p9_nodes, "CODE", {});
			var code10_nodes = children(code10);
			t59 = claim_text(code10_nodes, "commonjs2");
			code10_nodes.forEach(detach);
			t60 = claim_text(p9_nodes, " as an example:");
			p9_nodes.forEach(detach);
			t61 = claim_space(section2_nodes);
			pre3 = claim_element(section2_nodes, "PRE", { class: true });
			var pre3_nodes = children(pre3);
			pre3_nodes.forEach(detach);
			t62 = claim_space(section2_nodes);
			p10 = claim_element(section2_nodes, "P", {});
			var p10_nodes = children(p10);
			code11 = claim_element(p10_nodes, "CODE", {});
			var code11_nodes = children(code11);
			t63 = claim_text(code11_nodes, "commonjs2");
			code11_nodes.forEach(detach);
			t64 = claim_text(p10_nodes, " uses ");
			code12 = claim_element(p10_nodes, "CODE", {});
			var code12_nodes = children(code12);
			t65 = claim_text(code12_nodes, "module.exports");
			code12_nodes.forEach(detach);
			t66 = claim_text(p10_nodes, " to export values from a module. In this example, webpack assigns the return value of the IIFE to ");
			code13 = claim_element(p10_nodes, "CODE", {});
			var code13_nodes = children(code13);
			t67 = claim_text(code13_nodes, "module.exports");
			code13_nodes.forEach(detach);
			t68 = claim_text(p10_nodes, ".");
			p10_nodes.forEach(detach);
			t69 = claim_space(section2_nodes);
			p11 = claim_element(section2_nodes, "P", {});
			var p11_nodes = children(p11);
			t70 = claim_text(p11_nodes, "If you look at the bundled code, it is not much different than the one without specifying ");
			code14 = claim_element(p11_nodes, "CODE", {});
			var code14_nodes = children(code14);
			t71 = claim_text(code14_nodes, "output.libraryTarget");
			code14_nodes.forEach(detach);
			t72 = claim_text(p11_nodes, ". The only difference is that the bundled code is prefixed with ");
			code15 = claim_element(p11_nodes, "CODE", {});
			var code15_nodes = children(code15);
			t73 = claim_text(code15_nodes, "module.exports =");
			code15_nodes.forEach(detach);
			t74 = claim_text(p11_nodes, ";");
			p11_nodes.forEach(detach);
			t75 = claim_space(section2_nodes);
			blockquote0 = claim_element(section2_nodes, "BLOCKQUOTE", {});
			var blockquote0_nodes = children(blockquote0);
			p12 = claim_element(blockquote0_nodes, "P", {});
			var p12_nodes = children(p12);
			t76 = claim_text(p12_nodes, "By the way, if you are curious about the difference between commonjs and commonjs2, you can follow the thread of ");
			a11 = claim_element(p12_nodes, "A", { href: true, rel: true });
			var a11_nodes = children(a11);
			t77 = claim_text(a11_nodes, "this issue");
			a11_nodes.forEach(detach);
			t78 = claim_text(p12_nodes, ".");
			p12_nodes.forEach(detach);
			blockquote0_nodes.forEach(detach);
			section2_nodes.forEach(detach);
			t79 = claim_space(nodes);
			section3 = claim_element(nodes, "SECTION", {});
			var section3_nodes = children(section3);
			h41 = claim_element(section3_nodes, "H4", {});
			var h41_nodes = children(h41);
			a12 = claim_element(h41_nodes, "A", { href: true, id: true });
			var a12_nodes = children(a12);
			t80 = claim_text(a12_nodes, "2. Name of a variable: ");
			code16 = claim_element(a12_nodes, "CODE", {});
			var code16_nodes = children(code16);
			t81 = claim_text(code16_nodes, "\"var\"");
			code16_nodes.forEach(detach);
			t82 = claim_text(a12_nodes, ", ");
			code17 = claim_element(a12_nodes, "CODE", {});
			var code17_nodes = children(code17);
			t83 = claim_text(code17_nodes, "\"this\"");
			code17_nodes.forEach(detach);
			t84 = claim_text(a12_nodes, ", ");
			code18 = claim_element(a12_nodes, "CODE", {});
			var code18_nodes = children(code18);
			t85 = claim_text(code18_nodes, "\"self\"");
			code18_nodes.forEach(detach);
			t86 = claim_text(a12_nodes, ", ");
			code19 = claim_element(a12_nodes, "CODE", {});
			var code19_nodes = children(code19);
			t87 = claim_text(code19_nodes, "\"window\"");
			code19_nodes.forEach(detach);
			t88 = claim_text(a12_nodes, ", ");
			code20 = claim_element(a12_nodes, "CODE", {});
			var code20_nodes = children(code20);
			t89 = claim_text(code20_nodes, "\"global\"");
			code20_nodes.forEach(detach);
			a12_nodes.forEach(detach);
			h41_nodes.forEach(detach);
			t90 = claim_space(section3_nodes);
			p13 = claim_element(section3_nodes, "P", {});
			var p13_nodes = children(p13);
			t91 = claim_text(p13_nodes, "On the other hand, instead of exposing the library content through a module system, you can specify the variable name which the export object is assigned to.");
			p13_nodes.forEach(detach);
			t92 = claim_space(section3_nodes);
			p14 = claim_element(section3_nodes, "P", {});
			var p14_nodes = children(p14);
			t93 = claim_text(p14_nodes, "Let's take ");
			code21 = claim_element(p14_nodes, "CODE", {});
			var code21_nodes = children(code21);
			t94 = claim_text(code21_nodes, "self");
			code21_nodes.forEach(detach);
			t95 = claim_text(p14_nodes, " as an example:");
			p14_nodes.forEach(detach);
			t96 = claim_space(section3_nodes);
			pre4 = claim_element(section3_nodes, "PRE", { class: true });
			var pre4_nodes = children(pre4);
			pre4_nodes.forEach(detach);
			t97 = claim_space(section3_nodes);
			p15 = claim_element(section3_nodes, "P", {});
			var p15_nodes = children(p15);
			t98 = claim_text(p15_nodes, "All the exported values are assigned to ");
			code22 = claim_element(p15_nodes, "CODE", {});
			var code22_nodes = children(code22);
			t99 = claim_text(code22_nodes, "self");
			code22_nodes.forEach(detach);
			t100 = claim_text(p15_nodes, ".");
			p15_nodes.forEach(detach);
			t101 = claim_space(section3_nodes);
			p16 = claim_element(section3_nodes, "P", {});
			var p16_nodes = children(p16);
			t102 = claim_text(p16_nodes, "Again observe the bundled code, this time round we prefixed the bundled code with ");
			code23 = claim_element(p16_nodes, "CODE", {});
			var code23_nodes = children(code23);
			t103 = claim_text(code23_nodes, "Object.assign(self,");
			code23_nodes.forEach(detach);
			t104 = claim_text(p16_nodes, " and suffixed it with ");
			code24 = claim_element(p16_nodes, "CODE", {});
			var code24_nodes = children(code24);
			t105 = claim_text(code24_nodes, ");");
			code24_nodes.forEach(detach);
			t106 = claim_text(p16_nodes, ".");
			p16_nodes.forEach(detach);
			t107 = claim_space(section3_nodes);
			p17 = claim_element(section3_nodes, "P", {});
			var p17_nodes = children(p17);
			t108 = claim_text(p17_nodes, "Specifiying the ");
			code25 = claim_element(p17_nodes, "CODE", {});
			var code25_nodes = children(code25);
			t109 = claim_text(code25_nodes, "output.libraryTarget");
			code25_nodes.forEach(detach);
			t110 = claim_text(p17_nodes, " as ");
			code26 = claim_element(p17_nodes, "CODE", {});
			var code26_nodes = children(code26);
			t111 = claim_text(code26_nodes, "var");
			code26_nodes.forEach(detach);
			t112 = claim_text(p17_nodes, " on the other hand, allows you to assign it to a variable name, which you can provide in ");
			code27 = claim_element(p17_nodes, "CODE", {});
			var code27_nodes = children(code27);
			t113 = claim_text(code27_nodes, "output.library");
			code27_nodes.forEach(detach);
			t114 = claim_text(p17_nodes, " option:");
			p17_nodes.forEach(detach);
			t115 = claim_space(section3_nodes);
			pre5 = claim_element(section3_nodes, "PRE", { class: true });
			var pre5_nodes = children(pre5);
			pre5_nodes.forEach(detach);
			t116 = claim_space(section3_nodes);
			p18 = claim_element(section3_nodes, "P", {});
			var p18_nodes = children(p18);
			t117 = claim_text(p18_nodes, "If you don't want ");
			code28 = claim_element(p18_nodes, "CODE", {});
			var code28_nodes = children(code28);
			t118 = claim_text(code28_nodes, "myApp");
			code28_nodes.forEach(detach);
			t119 = claim_text(p18_nodes, " to contain all the exported value of the entry file, you can provide the key that you want to export only in the ");
			code29 = claim_element(p18_nodes, "CODE", {});
			var code29_nodes = children(code29);
			t120 = claim_text(code29_nodes, "output.libraryExport");
			code29_nodes.forEach(detach);
			t121 = claim_text(p18_nodes, " option:");
			p18_nodes.forEach(detach);
			t122 = claim_space(section3_nodes);
			pre6 = claim_element(section3_nodes, "PRE", { class: true });
			var pre6_nodes = children(pre6);
			pre6_nodes.forEach(detach);
			t123 = claim_space(section3_nodes);
			p19 = claim_element(section3_nodes, "P", {});
			var p19_nodes = children(p19);
			t124 = claim_text(p19_nodes, "Again you can observe that by playing different option values of ");
			code30 = claim_element(p19_nodes, "CODE", {});
			var code30_nodes = children(code30);
			t125 = claim_text(code30_nodes, "output.library");
			code30_nodes.forEach(detach);
			t126 = claim_text(p19_nodes, ", ");
			code31 = claim_element(p19_nodes, "CODE", {});
			var code31_nodes = children(code31);
			t127 = claim_text(code31_nodes, "output.libraryTarget");
			code31_nodes.forEach(detach);
			t128 = claim_text(p19_nodes, ", ");
			code32 = claim_element(p19_nodes, "CODE", {});
			var code32_nodes = children(code32);
			t129 = claim_text(code32_nodes, "output.libraryExport");
			code32_nodes.forEach(detach);
			t130 = claim_text(p19_nodes, ", webpack adds different prefix and suffix to the bundled code:");
			p19_nodes.forEach(detach);
			t131 = claim_space(section3_nodes);
			pre7 = claim_element(section3_nodes, "PRE", { class: true });
			var pre7_nodes = children(pre7);
			pre7_nodes.forEach(detach);
			t132 = claim_space(section3_nodes);
			p20 = claim_element(section3_nodes, "P", {});
			var p20_nodes = children(p20);
			t133 = claim_text(p20_nodes, "So, instead of using the webpack built-in library targets, what should we do if we want to support a custom library target that looks something like below:");
			p20_nodes.forEach(detach);
			t134 = claim_space(section3_nodes);
			pre8 = claim_element(section3_nodes, "PRE", { class: true });
			var pre8_nodes = children(pre8);
			pre8_nodes.forEach(detach);
			t135 = claim_space(section3_nodes);
			p21 = claim_element(section3_nodes, "P", {});
			var p21_nodes = children(p21);
			t136 = claim_text(p21_nodes, "I searched through the ");
			a13 = claim_element(p21_nodes, "A", { href: true, rel: true });
			var a13_nodes = children(a13);
			t137 = claim_text(a13_nodes, "webpack official docs");
			a13_nodes.forEach(detach);
			t138 = claim_text(p21_nodes, " and found no options that allows that. So the only solution at the moment is to write a webpack plugin.");
			p21_nodes.forEach(detach);
			section3_nodes.forEach(detach);
			t139 = claim_space(nodes);
			section4 = claim_element(nodes, "SECTION", {});
			var section4_nodes = children(section4);
			h21 = claim_element(section4_nodes, "H2", {});
			var h21_nodes = children(h21);
			a14 = claim_element(h21_nodes, "A", { href: true, id: true });
			var a14_nodes = children(a14);
			t140 = claim_text(a14_nodes, "Writing a webpack plugin");
			a14_nodes.forEach(detach);
			h21_nodes.forEach(detach);
			t141 = claim_space(section4_nodes);
			p22 = claim_element(section4_nodes, "P", {});
			var p22_nodes = children(p22);
			t142 = claim_text(p22_nodes, "After digging around the ");
			a15 = claim_element(p22_nodes, "A", { href: true, rel: true });
			var a15_nodes = children(a15);
			t143 = claim_text(a15_nodes, "webpack source code");
			a15_nodes.forEach(detach);
			t144 = claim_text(p22_nodes, ", I found out that ");
			a16 = claim_element(p22_nodes, "A", { href: true, rel: true });
			var a16_nodes = children(a16);
			t145 = claim_text(a16_nodes, "LibraryTemplatePlugin");
			a16_nodes.forEach(detach);
			t146 = claim_text(p22_nodes, " instantiates different TemplatePlugins based on the value of the ");
			code33 = claim_element(p22_nodes, "CODE", {});
			var code33_nodes = children(code33);
			t147 = claim_text(code33_nodes, "output.libraryTarget");
			code33_nodes.forEach(detach);
			t148 = claim_text(p22_nodes, " option:");
			p22_nodes.forEach(detach);
			t149 = claim_space(section4_nodes);
			pre9 = claim_element(section4_nodes, "PRE", { class: true });
			var pre9_nodes = children(pre9);
			pre9_nodes.forEach(detach);
			t150 = claim_space(section4_nodes);
			p23 = claim_element(section4_nodes, "P", {});
			var p23_nodes = children(p23);
			t151 = claim_text(p23_nodes, "I went to look into one of the TemplatePlugins, the ");
			a17 = claim_element(p23_nodes, "A", { href: true, rel: true });
			var a17_nodes = children(a17);
			t152 = claim_text(a17_nodes, "SetVarTemplatePlugin");
			a17_nodes.forEach(detach);
			t153 = claim_text(p23_nodes, ":");
			p23_nodes.forEach(detach);
			t154 = claim_space(section4_nodes);
			pre10 = claim_element(section4_nodes, "PRE", { class: true });
			var pre10_nodes = children(pre10);
			pre10_nodes.forEach(detach);
			t155 = claim_space(section4_nodes);
			p24 = claim_element(section4_nodes, "P", {});
			var p24_nodes = children(p24);
			t156 = claim_text(p24_nodes, "I don't understand line-by-line everything that happened in the file, but I do know that the line highlighted above, is where webpack concats the ");
			code34 = claim_element(p24_nodes, "CODE", {});
			var code34_nodes = children(code34);
			t157 = claim_text(code34_nodes, "varExpression =");
			code34_nodes.forEach(detach);
			t158 = claim_text(p24_nodes, " (in the case of ");
			code35 = claim_element(p24_nodes, "CODE", {});
			var code35_nodes = children(code35);
			t159 = claim_text(code35_nodes, "commonjs");
			code35_nodes.forEach(detach);
			t160 = claim_text(p24_nodes, ", ");
			code36 = claim_element(p24_nodes, "CODE", {});
			var code36_nodes = children(code36);
			t161 = claim_text(code36_nodes, "varExpression");
			code36_nodes.forEach(detach);
			t162 = claim_text(p24_nodes, " is ");
			code37 = claim_element(p24_nodes, "CODE", {});
			var code37_nodes = children(code37);
			t163 = claim_text(code37_nodes, "module.exports");
			code37_nodes.forEach(detach);
			t164 = claim_text(p24_nodes, ", thus ");
			code38 = claim_element(p24_nodes, "CODE", {});
			var code38_nodes = children(code38);
			t165 = claim_text(code38_nodes, "module.exports =");
			code38_nodes.forEach(detach);
			t166 = claim_text(p24_nodes, ") and the source (which in this case is the bundled code).");
			p24_nodes.forEach(detach);
			t167 = claim_space(section4_nodes);
			p25 = claim_element(section4_nodes, "P", {});
			var p25_nodes = children(p25);
			t168 = claim_text(p25_nodes, "So, to have the following:");
			p25_nodes.forEach(detach);
			t169 = claim_space(section4_nodes);
			pre11 = claim_element(section4_nodes, "PRE", { class: true });
			var pre11_nodes = children(pre11);
			pre11_nodes.forEach(detach);
			t170 = claim_space(section4_nodes);
			p26 = claim_element(section4_nodes, "P", {});
			var p26_nodes = children(p26);
			t171 = claim_text(p26_nodes, "we need:");
			p26_nodes.forEach(detach);
			t172 = claim_space(section4_nodes);
			pre12 = claim_element(section4_nodes, "PRE", { class: true });
			var pre12_nodes = children(pre12);
			pre12_nodes.forEach(detach);
			t173 = claim_space(section4_nodes);
			p27 = claim_element(section4_nodes, "P", {});
			var p27_nodes = children(p27);
			t174 = claim_text(p27_nodes, "So, I did the following:");
			p27_nodes.forEach(detach);
			t175 = claim_space(section4_nodes);
			ol0 = claim_element(section4_nodes, "OL", {});
			var ol0_nodes = children(ol0);
			li8 = claim_element(ol0_nodes, "LI", {});
			var li8_nodes = children(li8);
			t176 = claim_text(li8_nodes, "Created a new file and pasted the entire source from ");
			a18 = claim_element(li8_nodes, "A", { href: true, rel: true });
			var a18_nodes = children(a18);
			t177 = claim_text(a18_nodes, "SetVarTemplatePlugin.js");
			a18_nodes.forEach(detach);
			li8_nodes.forEach(detach);
			t178 = claim_space(ol0_nodes);
			li9 = claim_element(ol0_nodes, "LI", {});
			var li9_nodes = children(li9);
			t179 = claim_text(li9_nodes, "Searched + replaced to rename the plugin name to something more appropriate, (SetModuleTemplatePlugin)");
			li9_nodes.forEach(detach);
			t180 = claim_space(ol0_nodes);
			li10 = claim_element(ol0_nodes, "LI", {});
			var li10_nodes = children(li10);
			t181 = claim_text(li10_nodes, "Replaced relative import, ");
			code39 = claim_element(li10_nodes, "CODE", {});
			var code39_nodes = children(code39);
			t182 = claim_text(code39_nodes, "require(\"./RuntimeGlobals\")");
			code39_nodes.forEach(detach);
			t183 = claim_text(li10_nodes, " to require from webpack, ");
			code40 = claim_element(li10_nodes, "CODE", {});
			var code40_nodes = children(code40);
			t184 = claim_text(code40_nodes, "require(\"webpack/lib/RuntimeGlobals\")");
			code40_nodes.forEach(detach);
			li10_nodes.forEach(detach);
			t185 = claim_space(ol0_nodes);
			li11 = claim_element(ol0_nodes, "LI", {});
			var li11_nodes = children(li11);
			t186 = claim_text(li11_nodes, "Replaced the line ");
			code41 = claim_element(li11_nodes, "CODE", {});
			var code41_nodes = children(code41);
			t187 = claim_text(code41_nodes, "return new ConcatSource(prefix, source);");
			code41_nodes.forEach(detach);
			t188 = claim_text(li11_nodes, " to the following:");
			li11_nodes.forEach(detach);
			ol0_nodes.forEach(detach);
			t189 = claim_space(section4_nodes);
			pre13 = claim_element(section4_nodes, "PRE", { class: true });
			var pre13_nodes = children(pre13);
			pre13_nodes.forEach(detach);
			t190 = claim_space(section4_nodes);
			ol1 = claim_element(section4_nodes, "OL", {});
			var ol1_nodes = children(ol1);
			li12 = claim_element(ol1_nodes, "LI", {});
			var li12_nodes = children(li12);
			t191 = claim_text(li12_nodes, "Removed ");
			code42 = claim_element(li12_nodes, "CODE", {});
			var code42_nodes = children(code42);
			t192 = claim_text(code42_nodes, "output.library");
			code42_nodes.forEach(detach);
			t193 = claim_text(li12_nodes, ", ");
			code43 = claim_element(li12_nodes, "CODE", {});
			var code43_nodes = children(code43);
			t194 = claim_text(code43_nodes, "output.libraryTarget");
			code43_nodes.forEach(detach);
			t195 = claim_text(li12_nodes, " from webpack config");
			li12_nodes.forEach(detach);
			t196 = claim_space(ol1_nodes);
			li13 = claim_element(ol1_nodes, "LI", {});
			var li13_nodes = children(li13);
			t197 = claim_text(li13_nodes, "Added my new plugin:");
			li13_nodes.forEach(detach);
			ol1_nodes.forEach(detach);
			t198 = claim_space(section4_nodes);
			pre14 = claim_element(section4_nodes, "PRE", { class: true });
			var pre14_nodes = children(pre14);
			pre14_nodes.forEach(detach);
			t199 = claim_space(section4_nodes);
			p28 = claim_element(section4_nodes, "P", {});
			var p28_nodes = children(p28);
			t200 = claim_text(p28_nodes, "To my surprise, it worked! Almost.");
			p28_nodes.forEach(detach);
			t201 = claim_space(section4_nodes);
			p29 = claim_element(section4_nodes, "P", {});
			var p29_nodes = children(p29);
			t202 = claim_text(p29_nodes, "When I run the bundled code, the customRegistry registered an empty object, nothing is exported from the bundled code.");
			p29_nodes.forEach(detach);
			t203 = claim_space(section4_nodes);
			p30 = claim_element(section4_nodes, "P", {});
			var p30_nodes = children(p30);
			t204 = claim_text(p30_nodes, "I went into ");
			a19 = claim_element(p30_nodes, "A", { href: true, rel: true });
			var a19_nodes = children(a19);
			t205 = claim_text(a19_nodes, "LibraryTemplatePlugin.js");
			a19_nodes.forEach(detach);
			t206 = claim_text(p30_nodes, " to look about, because that's the most obvious place to start looking, since I've copied line-by-line from ");
			a20 = claim_element(p30_nodes, "A", { href: true, rel: true });
			var a20_nodes = children(a20);
			t207 = claim_text(a20_nodes, "SetVarTemplatePlugin.js");
			a20_nodes.forEach(detach);
			t208 = claim_text(p30_nodes, ".");
			p30_nodes.forEach(detach);
			t209 = claim_space(section4_nodes);
			p31 = claim_element(section4_nodes, "P", {});
			var p31_nodes = children(p31);
			t210 = claim_text(p31_nodes, "I found a pretty obvious line that says:");
			p31_nodes.forEach(detach);
			t211 = claim_space(section4_nodes);
			pre15 = claim_element(section4_nodes, "PRE", { class: true });
			var pre15_nodes = children(pre15);
			pre15_nodes.forEach(detach);
			t212 = claim_space(section4_nodes);
			p32 = claim_element(section4_nodes, "P", {});
			var p32_nodes = children(p32);
			t213 = claim_text(p32_nodes, "If I would have to guess, I think that what this line is doing is to mark the export of the entry file as used, so that webpack would not ");
			em1 = claim_element(p32_nodes, "EM", {});
			var em1_nodes = children(em1);
			t214 = claim_text(em1_nodes, "treeshake them away");
			em1_nodes.forEach(detach);
			t215 = claim_text(p32_nodes, ".");
			p32_nodes.forEach(detach);
			t216 = claim_space(section4_nodes);
			blockquote2 = claim_element(section4_nodes, "BLOCKQUOTE", {});
			var blockquote2_nodes = children(blockquote2);
			p33 = claim_element(blockquote2_nodes, "P", {});
			var p33_nodes = children(p33);
			t217 = claim_text(p33_nodes, "Which, ");
			strong0 = claim_element(p33_nodes, "STRONG", {});
			var strong0_nodes = children(strong0);
			t218 = claim_text(strong0_nodes, "treeshake");
			strong0_nodes.forEach(detach);
			t219 = claim_text(p33_nodes, " is a cool word that means remove them.");
			p33_nodes.forEach(detach);
			t220 = claim_space(blockquote2_nodes);
			blockquote1 = claim_element(blockquote2_nodes, "BLOCKQUOTE", {});
			var blockquote1_nodes = children(blockquote1);
			p34 = claim_element(blockquote1_nodes, "P", {});
			var p34_nodes = children(p34);
			t221 = claim_text(p34_nodes, "Which you could argue that ");
			strong1 = claim_element(p34_nodes, "STRONG", {});
			var strong1_nodes = children(strong1);
			t222 = claim_text(strong1_nodes, "treeshake");
			strong1_nodes.forEach(detach);
			t223 = claim_text(p34_nodes, " does way more that just remove the entry exports, it removes things that is only used by the entry exports, recursively.");
			p34_nodes.forEach(detach);
			blockquote1_nodes.forEach(detach);
			blockquote2_nodes.forEach(detach);
			t224 = claim_space(section4_nodes);
			p35 = claim_element(section4_nodes, "P", {});
			var p35_nodes = children(p35);
			t225 = claim_text(p35_nodes, "I added these 2 lines into my ");
			code44 = claim_element(p35_nodes, "CODE", {});
			var code44_nodes = children(code44);
			t226 = claim_text(code44_nodes, "SetModuleTemplatePlugin");
			code44_nodes.forEach(detach);
			t227 = claim_text(p35_nodes, ", and it worked! Perfectly this time. 🎉");
			p35_nodes.forEach(detach);
			t228 = claim_space(section4_nodes);
			p36 = claim_element(section4_nodes, "P", {});
			var p36_nodes = children(p36);
			t229 = claim_text(p36_nodes, "I created ");
			a21 = claim_element(p36_nodes, "A", { href: true, rel: true });
			var a21_nodes = children(a21);
			t230 = claim_text(a21_nodes, "a gist");
			a21_nodes.forEach(detach);
			t231 = claim_text(p36_nodes, " for the complete code, if you are lazy.");
			p36_nodes.forEach(detach);
			t232 = claim_space(section4_nodes);
			p37 = claim_element(section4_nodes, "P", {});
			var p37_nodes = children(p37);
			t233 = claim_text(p37_nodes, "Lastly, if you noticed, this example is based on the latest master webpack source (at the time writing), which is ");
			code45 = claim_element(p37_nodes, "CODE", {});
			var code45_nodes = children(code45);
			t234 = claim_text(code45_nodes, "webpack@5.0.0-beta.12");
			code45_nodes.forEach(detach);
			t235 = claim_text(p37_nodes, ".");
			p37_nodes.forEach(detach);
			t236 = claim_space(section4_nodes);
			p38 = claim_element(section4_nodes, "P", {});
			var p38_nodes = children(p38);
			t237 = claim_text(p38_nodes, "If you want a similar plugin with ");
			code46 = claim_element(p38_nodes, "CODE", {});
			var code46_nodes = children(code46);
			t238 = claim_text(code46_nodes, "webpack^4");
			code46_nodes.forEach(detach);
			t239 = claim_text(p38_nodes, ", you can trust me that this article serves as a good enough entry point for you to write the plugin on your own.");
			p38_nodes.forEach(detach);
			t240 = claim_space(section4_nodes);
			p39 = claim_element(section4_nodes, "P", {});
			var p39_nodes = children(p39);
			strong2 = claim_element(p39_nodes, "STRONG", {});
			var strong2_nodes = children(strong2);
			t241 = claim_text(strong2_nodes, "And I trust you that you can do it. 😎");
			strong2_nodes.forEach(detach);
			p39_nodes.forEach(detach);
			section4_nodes.forEach(detach);
			t242 = claim_space(nodes);
			section5 = claim_element(nodes, "SECTION", {});
			var section5_nodes = children(section5);
			h22 = claim_element(section5_nodes, "H2", {});
			var h22_nodes = children(h22);
			a22 = claim_element(h22_nodes, "A", { href: true, id: true });
			var a22_nodes = children(a22);
			t243 = claim_text(a22_nodes, "Closing Note");
			a22_nodes.forEach(detach);
			h22_nodes.forEach(detach);
			t244 = claim_space(section5_nodes);
			p40 = claim_element(section5_nodes, "P", {});
			var p40_nodes = children(p40);
			t245 = claim_text(p40_nodes, "Writing a webpack plugin is not impossible. It will especially be easier if you have a good understanding how webpack as a bundler works.");
			p40_nodes.forEach(detach);
			t246 = claim_space(section5_nodes);
			p41 = claim_element(section5_nodes, "P", {});
			var p41_nodes = children(p41);
			em2 = claim_element(p41_nodes, "EM", {});
			var em2_nodes = children(em2);
			t247 = claim_text(em2_nodes, "(Plug: if you want to know more, you can read my ");
			a23 = claim_element(em2_nodes, "A", { href: true });
			var a23_nodes = children(a23);
			t248 = claim_text(a23_nodes, "\"What is module bundler and how does it work?\"");
			a23_nodes.forEach(detach);
			t249 = claim_text(em2_nodes, ")");
			em2_nodes.forEach(detach);
			p41_nodes.forEach(detach);
			section5_nodes.forEach(detach);
			this.h();
		},
		h() {
			attr(a0, "href", "#webpack-s-output-library-options");
			attr(a1, "href", "#name-of-a-module-system-commonjs-commonjs-amd-umd");
			attr(a2, "href", "#name-of-a-variable-var-this-self-window-global");
			attr(a3, "href", "#writing-a-webpack-plugin");
			attr(a4, "href", "#closing-note");
			attr(ul2, "class", "sitemap");
			attr(ul2, "id", "sitemap");
			attr(ul2, "role", "navigation");
			attr(ul2, "aria-label", "Table of Contents");
			attr(pre0, "class", "language-js");
			attr(pre1, "class", "language-js");
			attr(a5, "href", "/i-wrote-my-module-bundler/");
			attr(pre2, "class", "language-js");
			attr(a6, "href", "https://webpack.js.org/configuration/output/#outputlibrary");
			attr(a6, "rel", "nofollow");
			attr(a7, "href", "https://webpack.js.org/configuration/output/#outputlibraryexport");
			attr(a7, "rel", "nofollow");
			attr(a8, "href", "https://webpack.js.org/configuration/output/#outputlibrarytarget");
			attr(a8, "rel", "nofollow");
			attr(a9, "href", "#webpack-s-output-library-options");
			attr(a9, "id", "webpack-s-output-library-options");
			attr(a10, "href", "#name-of-a-module-system-commonjs-commonjs-amd-umd");
			attr(a10, "id", "name-of-a-module-system-commonjs-commonjs-amd-umd");
			attr(pre3, "class", "language-js");
			attr(a11, "href", "https://github.com/webpack/webpack/issues/1114");
			attr(a11, "rel", "nofollow");
			attr(a12, "href", "#name-of-a-variable-var-this-self-window-global");
			attr(a12, "id", "name-of-a-variable-var-this-self-window-global");
			attr(pre4, "class", "language-js");
			attr(pre5, "class", "language-js");
			attr(pre6, "class", "language-js");
			attr(pre7, "class", "language-js");
			attr(pre8, "class", "language-js");
			attr(a13, "href", "https://webpack.js.org/configuration/output/");
			attr(a13, "rel", "nofollow");
			attr(a14, "href", "#writing-a-webpack-plugin");
			attr(a14, "id", "writing-a-webpack-plugin");
			attr(a15, "href", "https://github.com/webpack/webpack");
			attr(a15, "rel", "nofollow");
			attr(a16, "href", "https://github.com/webpack/webpack/blob/master/lib/LibraryTemplatePlugin.js");
			attr(a16, "rel", "nofollow");
			attr(pre9, "class", "language-js");
			attr(a17, "href", "https://github.com/webpack/webpack/blob/master/lib/SetVarTemplatePlugin.js");
			attr(a17, "rel", "nofollow");
			attr(pre10, "class", "language-js");
			attr(pre11, "class", "language-js");
			attr(pre12, "class", "language-js");
			attr(a18, "href", "https://github.com/webpack/webpack/blob/master/lib/SetVarTemplatePlugin.js");
			attr(a18, "rel", "nofollow");
			attr(pre13, "class", "language-js");
			attr(pre14, "class", "language-js");
			attr(a19, "href", "https://github.com/webpack/webpack/blob/master/lib/LibraryTemplatePlugin.js");
			attr(a19, "rel", "nofollow");
			attr(a20, "href", "https://github.com/webpack/webpack/blob/master/lib/SetVarTemplatePlugin.js");
			attr(a20, "rel", "nofollow");
			attr(pre15, "class", "language-js");
			attr(a21, "href", "https://gist.github.com/tanhauhau/b6b355fbbabe224c9242a5257baa4dec");
			attr(a21, "rel", "nofollow");
			attr(a22, "href", "#closing-note");
			attr(a22, "id", "closing-note");
			attr(a23, "href", "/what-is-module-bundler-and-how-does-it-work/");
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
			append(ul2, li3);
			append(li3, a3);
			append(a3, t3);
			append(ul2, li4);
			append(li4, a4);
			append(a4, t4);
			insert(target, t5, anchor);
			insert(target, p0, anchor);
			append(p0, t6);
			insert(target, t7, anchor);
			insert(target, pre0, anchor);
			pre0.innerHTML = raw0_value;
			insert(target, t8, anchor);
			insert(target, p1, anchor);
			append(p1, t9);
			append(p1, code0);
			append(code0, t10);
			append(p1, t11);
			insert(target, t12, anchor);
			insert(target, pre1, anchor);
			pre1.innerHTML = raw1_value;
			insert(target, t13, anchor);
			insert(target, p2, anchor);
			append(p2, t14);
			append(p2, a5);
			append(a5, t15);
			append(p2, t16);
			insert(target, t17, anchor);
			insert(target, pre2, anchor);
			pre2.innerHTML = raw2_value;
			insert(target, t18, anchor);
			insert(target, p3, anchor);
			append(p3, em0);
			append(em0, t19);
			append(em0, code1);
			append(code1, t20);
			append(em0, t21);
			insert(target, t22, anchor);
			insert(target, p4, anchor);
			append(p4, t23);
			insert(target, t24, anchor);
			insert(target, ul3, anchor);
			append(ul3, li5);
			append(li5, a6);
			append(a6, t25);
			append(ul3, t26);
			append(ul3, li6);
			append(li6, a7);
			append(a7, t27);
			append(ul3, t28);
			append(ul3, li7);
			append(li7, a8);
			append(a8, t29);
			insert(target, t30, anchor);
			insert(target, section1, anchor);
			append(section1, h20);
			append(h20, a9);
			append(a9, t31);
			append(section1, t32);
			append(section1, p5);
			append(p5, t33);
			append(p5, code2);
			append(code2, t34);
			append(p5, t35);
			append(section1, t36);
			append(section1, p6);
			append(p6, code3);
			append(code3, t37);
			append(p6, t38);
			append(p6, code4);
			append(code4, t39);
			append(p6, t40);
			append(p6, code5);
			append(code5, t41);
			append(p6, t42);
			insert(target, t43, anchor);
			insert(target, section2, anchor);
			append(section2, h40);
			append(h40, a10);
			append(a10, t44);
			append(a10, code6);
			append(code6, t45);
			append(a10, t46);
			append(a10, code7);
			append(code7, t47);
			append(a10, t48);
			append(a10, code8);
			append(code8, t49);
			append(a10, t50);
			append(a10, code9);
			append(code9, t51);
			append(a10, t52);
			append(section2, t53);
			append(section2, p7);
			append(p7, t54);
			append(section2, t55);
			append(section2, p8);
			append(p8, t56);
			append(section2, t57);
			append(section2, p9);
			append(p9, t58);
			append(p9, code10);
			append(code10, t59);
			append(p9, t60);
			append(section2, t61);
			append(section2, pre3);
			pre3.innerHTML = raw3_value;
			append(section2, t62);
			append(section2, p10);
			append(p10, code11);
			append(code11, t63);
			append(p10, t64);
			append(p10, code12);
			append(code12, t65);
			append(p10, t66);
			append(p10, code13);
			append(code13, t67);
			append(p10, t68);
			append(section2, t69);
			append(section2, p11);
			append(p11, t70);
			append(p11, code14);
			append(code14, t71);
			append(p11, t72);
			append(p11, code15);
			append(code15, t73);
			append(p11, t74);
			append(section2, t75);
			append(section2, blockquote0);
			append(blockquote0, p12);
			append(p12, t76);
			append(p12, a11);
			append(a11, t77);
			append(p12, t78);
			insert(target, t79, anchor);
			insert(target, section3, anchor);
			append(section3, h41);
			append(h41, a12);
			append(a12, t80);
			append(a12, code16);
			append(code16, t81);
			append(a12, t82);
			append(a12, code17);
			append(code17, t83);
			append(a12, t84);
			append(a12, code18);
			append(code18, t85);
			append(a12, t86);
			append(a12, code19);
			append(code19, t87);
			append(a12, t88);
			append(a12, code20);
			append(code20, t89);
			append(section3, t90);
			append(section3, p13);
			append(p13, t91);
			append(section3, t92);
			append(section3, p14);
			append(p14, t93);
			append(p14, code21);
			append(code21, t94);
			append(p14, t95);
			append(section3, t96);
			append(section3, pre4);
			pre4.innerHTML = raw4_value;
			append(section3, t97);
			append(section3, p15);
			append(p15, t98);
			append(p15, code22);
			append(code22, t99);
			append(p15, t100);
			append(section3, t101);
			append(section3, p16);
			append(p16, t102);
			append(p16, code23);
			append(code23, t103);
			append(p16, t104);
			append(p16, code24);
			append(code24, t105);
			append(p16, t106);
			append(section3, t107);
			append(section3, p17);
			append(p17, t108);
			append(p17, code25);
			append(code25, t109);
			append(p17, t110);
			append(p17, code26);
			append(code26, t111);
			append(p17, t112);
			append(p17, code27);
			append(code27, t113);
			append(p17, t114);
			append(section3, t115);
			append(section3, pre5);
			pre5.innerHTML = raw5_value;
			append(section3, t116);
			append(section3, p18);
			append(p18, t117);
			append(p18, code28);
			append(code28, t118);
			append(p18, t119);
			append(p18, code29);
			append(code29, t120);
			append(p18, t121);
			append(section3, t122);
			append(section3, pre6);
			pre6.innerHTML = raw6_value;
			append(section3, t123);
			append(section3, p19);
			append(p19, t124);
			append(p19, code30);
			append(code30, t125);
			append(p19, t126);
			append(p19, code31);
			append(code31, t127);
			append(p19, t128);
			append(p19, code32);
			append(code32, t129);
			append(p19, t130);
			append(section3, t131);
			append(section3, pre7);
			pre7.innerHTML = raw7_value;
			append(section3, t132);
			append(section3, p20);
			append(p20, t133);
			append(section3, t134);
			append(section3, pre8);
			pre8.innerHTML = raw8_value;
			append(section3, t135);
			append(section3, p21);
			append(p21, t136);
			append(p21, a13);
			append(a13, t137);
			append(p21, t138);
			insert(target, t139, anchor);
			insert(target, section4, anchor);
			append(section4, h21);
			append(h21, a14);
			append(a14, t140);
			append(section4, t141);
			append(section4, p22);
			append(p22, t142);
			append(p22, a15);
			append(a15, t143);
			append(p22, t144);
			append(p22, a16);
			append(a16, t145);
			append(p22, t146);
			append(p22, code33);
			append(code33, t147);
			append(p22, t148);
			append(section4, t149);
			append(section4, pre9);
			pre9.innerHTML = raw9_value;
			append(section4, t150);
			append(section4, p23);
			append(p23, t151);
			append(p23, a17);
			append(a17, t152);
			append(p23, t153);
			append(section4, t154);
			append(section4, pre10);
			pre10.innerHTML = raw10_value;
			append(section4, t155);
			append(section4, p24);
			append(p24, t156);
			append(p24, code34);
			append(code34, t157);
			append(p24, t158);
			append(p24, code35);
			append(code35, t159);
			append(p24, t160);
			append(p24, code36);
			append(code36, t161);
			append(p24, t162);
			append(p24, code37);
			append(code37, t163);
			append(p24, t164);
			append(p24, code38);
			append(code38, t165);
			append(p24, t166);
			append(section4, t167);
			append(section4, p25);
			append(p25, t168);
			append(section4, t169);
			append(section4, pre11);
			pre11.innerHTML = raw11_value;
			append(section4, t170);
			append(section4, p26);
			append(p26, t171);
			append(section4, t172);
			append(section4, pre12);
			pre12.innerHTML = raw12_value;
			append(section4, t173);
			append(section4, p27);
			append(p27, t174);
			append(section4, t175);
			append(section4, ol0);
			append(ol0, li8);
			append(li8, t176);
			append(li8, a18);
			append(a18, t177);
			append(ol0, t178);
			append(ol0, li9);
			append(li9, t179);
			append(ol0, t180);
			append(ol0, li10);
			append(li10, t181);
			append(li10, code39);
			append(code39, t182);
			append(li10, t183);
			append(li10, code40);
			append(code40, t184);
			append(ol0, t185);
			append(ol0, li11);
			append(li11, t186);
			append(li11, code41);
			append(code41, t187);
			append(li11, t188);
			append(section4, t189);
			append(section4, pre13);
			pre13.innerHTML = raw13_value;
			append(section4, t190);
			append(section4, ol1);
			append(ol1, li12);
			append(li12, t191);
			append(li12, code42);
			append(code42, t192);
			append(li12, t193);
			append(li12, code43);
			append(code43, t194);
			append(li12, t195);
			append(ol1, t196);
			append(ol1, li13);
			append(li13, t197);
			append(section4, t198);
			append(section4, pre14);
			pre14.innerHTML = raw14_value;
			append(section4, t199);
			append(section4, p28);
			append(p28, t200);
			append(section4, t201);
			append(section4, p29);
			append(p29, t202);
			append(section4, t203);
			append(section4, p30);
			append(p30, t204);
			append(p30, a19);
			append(a19, t205);
			append(p30, t206);
			append(p30, a20);
			append(a20, t207);
			append(p30, t208);
			append(section4, t209);
			append(section4, p31);
			append(p31, t210);
			append(section4, t211);
			append(section4, pre15);
			pre15.innerHTML = raw15_value;
			append(section4, t212);
			append(section4, p32);
			append(p32, t213);
			append(p32, em1);
			append(em1, t214);
			append(p32, t215);
			append(section4, t216);
			append(section4, blockquote2);
			append(blockquote2, p33);
			append(p33, t217);
			append(p33, strong0);
			append(strong0, t218);
			append(p33, t219);
			append(blockquote2, t220);
			append(blockquote2, blockquote1);
			append(blockquote1, p34);
			append(p34, t221);
			append(p34, strong1);
			append(strong1, t222);
			append(p34, t223);
			append(section4, t224);
			append(section4, p35);
			append(p35, t225);
			append(p35, code44);
			append(code44, t226);
			append(p35, t227);
			append(section4, t228);
			append(section4, p36);
			append(p36, t229);
			append(p36, a21);
			append(a21, t230);
			append(p36, t231);
			append(section4, t232);
			append(section4, p37);
			append(p37, t233);
			append(p37, code45);
			append(code45, t234);
			append(p37, t235);
			append(section4, t236);
			append(section4, p38);
			append(p38, t237);
			append(p38, code46);
			append(code46, t238);
			append(p38, t239);
			append(section4, t240);
			append(section4, p39);
			append(p39, strong2);
			append(strong2, t241);
			insert(target, t242, anchor);
			insert(target, section5, anchor);
			append(section5, h22);
			append(h22, a22);
			append(a22, t243);
			append(section5, t244);
			append(section5, p40);
			append(p40, t245);
			append(section5, t246);
			append(section5, p41);
			append(p41, em2);
			append(em2, t247);
			append(em2, a23);
			append(a23, t248);
			append(em2, t249);
		},
		p: noop,
		d(detaching) {
			if (detaching) detach(section0);
			if (detaching) detach(t5);
			if (detaching) detach(p0);
			if (detaching) detach(t7);
			if (detaching) detach(pre0);
			if (detaching) detach(t8);
			if (detaching) detach(p1);
			if (detaching) detach(t12);
			if (detaching) detach(pre1);
			if (detaching) detach(t13);
			if (detaching) detach(p2);
			if (detaching) detach(t17);
			if (detaching) detach(pre2);
			if (detaching) detach(t18);
			if (detaching) detach(p3);
			if (detaching) detach(t22);
			if (detaching) detach(p4);
			if (detaching) detach(t24);
			if (detaching) detach(ul3);
			if (detaching) detach(t30);
			if (detaching) detach(section1);
			if (detaching) detach(t43);
			if (detaching) detach(section2);
			if (detaching) detach(t79);
			if (detaching) detach(section3);
			if (detaching) detach(t139);
			if (detaching) detach(section4);
			if (detaching) detach(t242);
			if (detaching) detach(section5);
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
	"title": "Webpack's TemplatePlugin",
	"date": "2020-01-21T08:00:00Z",
	"slug": "webpack-plugin-main-template",
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
