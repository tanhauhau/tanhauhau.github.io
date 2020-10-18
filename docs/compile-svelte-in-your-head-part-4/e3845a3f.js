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

			svg0 = claim_element(
				a6_nodes,
				"svg",
				{
					viewBox: true,
					width: true,
					height: true,
					class: true
				},
				1
			);

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

			svg1 = claim_element(
				a7_nodes,
				"svg",
				{
					viewBox: true,
					width: true,
					height: true,
					class: true
				},
				1
			);

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
			attr(svg0, "width", "1em");
			attr(svg0, "height", "1em");
			attr(svg0, "class", "svelte-f3e4uo");
			attr(a6, "aria-label", "Twitter account");
			attr(a6, "href", "https://twitter.com/lihautan");
			attr(a6, "class", "svelte-f3e4uo");
			attr(path1, "d", "M9 19c-5 1.5-5-2.5-7-3m14 6v-3.87a3.37 3.37 0 0\n    0-.94-2.61c3.14-.35 6.44-1.54 6.44-7A5.44 5.44 0 0 0 20 4.77 5.07\n    5.07 0 0 0 19.91 1S18.73.65 16 2.48a13.38 13.38 0 0 0-7 0C6.27.65\n    5.09 1 5.09 1A5.07 5.07 0 0 0 5 4.77a5.44 5.44 0 0 0-1.5 3.78c0 5.42\n    3.3 6.61 6.44 7A3.37 3.37 0 0 0 9 18.13V22");
			attr(svg1, "viewBox", "0 0 24 24");
			attr(svg1, "width", "1em");
			attr(svg1, "height", "1em");
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

var image = "https://lihautan.com/compile-svelte-in-your-head-part-4/assets/hero-twitter-cf288ab2.jpg";

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
			attr(span, "class", "svelte-9tqnza");
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
				"name": "Homepage",
				"position": 1
			},
			{
				"@type": "ListItem",
				"item": {
					"@id": "https%3A%2F%2Flihautan.com%2Fcompile-svelte-in-your-head-part-4",
					"name": /*title*/ ctx[0]
				},
				"name": /*title*/ ctx[0],
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
			this.h();
		},
		l(nodes) {
			const head_nodes = query_selector_all("[data-svelte=\"svelte-15e3uyc\"]", document.head);
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
			attr(meta11, "content", "https%3A%2F%2Flihautan.com%2Fcompile-svelte-in-your-head-part-4");
			attr(meta12, "itemprop", "image");
			attr(meta12, "content", image);
			html_tag = new HtmlTag(html_anchor);
			html_tag_1 = new HtmlTag(html_anchor_1);
			attr(a, "href", "#content");
			attr(a, "class", "skip svelte-9tqnza");
			attr(main, "id", "content");
			attr(main, "class", "blog svelte-9tqnza");
			attr(footer, "class", "svelte-9tqnza");
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
						"name": "Homepage",
						"position": 1
					},
					{
						"@type": "ListItem",
						"item": {
							"@id": "https%3A%2F%2Flihautan.com%2Fcompile-svelte-in-your-head-part-4",
							"name": /*title*/ ctx[0]
						},
						"name": /*title*/ ctx[0],
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

/* content/blog/compile-svelte-in-your-head-part-4/@@page-markup.svelte generated by Svelte v3.24.0 */

function create_default_slot(ctx) {
	let section0;
	let ul2;
	let li0;
	let a0;
	let t0;
	let li1;
	let a1;
	let t1;
	let ul0;
	let li2;
	let a2;
	let t2;
	let li3;
	let a3;
	let t3;
	let li4;
	let a4;
	let t4;
	let ul1;
	let li5;
	let a5;
	let t5;
	let li6;
	let a6;
	let t6;
	let t7;
	let p0;
	let strong0;
	let t8;
	let a7;
	let t9;
	let t10;
	let t11;
	let p1;
	let t12;
	let strong1;
	let t13;
	let t14;
	let t15;
	let p2;
	let t16;
	let t17;
	let section1;
	let h20;
	let a8;
	let t18;
	let code0;
	let t19;
	let t20;
	let t21;
	let p3;
	let t22;
	let code1;
	let t23;
	let t24;
	let t25;
	let pre0;

	let raw0_value = `<code class="language-svelte"><span class="token language-javascript"><span class="token punctuation">&#123;</span>#<span class="token keyword">if</span> condition<span class="token punctuation">&#125;</span></span>
  <span class="token tag"><span class="token tag"><span class="token punctuation">&lt;</span>div</span><span class="token punctuation">></span></span>Conditionally rendered content<span class="token tag"><span class="token tag"><span class="token punctuation">&lt;/</span>div</span><span class="token punctuation">></span></span>
<span class="token language-javascript"><span class="token punctuation">&#123;</span><span class="token operator">/</span><span class="token keyword">if</span><span class="token punctuation">&#125;</span></span></code>` + "";

	let t26;
	let p4;
	let t27;
	let code2;
	let t28;
	let t29;
	let code3;
	let t30;
	let t31;
	let t32;
	let p5;
	let t33;
	let code4;
	let t34;
	let t35;
	let code5;
	let t36;
	let t37;
	let t38;
	let pre1;

	let raw1_value = `<code class="language-svelte"><span class="token language-javascript"><span class="token punctuation">&#123;</span>#<span class="token keyword">if</span> condition_a<span class="token punctuation">&#125;</span></span>
  <span class="token tag"><span class="token tag"><span class="token punctuation">&lt;</span>div</span><span class="token punctuation">></span></span>Rendered due to condition_a<span class="token tag"><span class="token tag"><span class="token punctuation">&lt;/</span>div</span><span class="token punctuation">></span></span>
<span class="token language-javascript"><span class="token punctuation">&#123;</span><span class="token punctuation">:</span><span class="token keyword">else</span> <span class="token keyword">if</span> condition_b<span class="token punctuation">&#125;</span></span>
  <span class="token tag"><span class="token tag"><span class="token punctuation">&lt;</span>div</span><span class="token punctuation">></span></span>Rendered due to condition_b<span class="token tag"><span class="token tag"><span class="token punctuation">&lt;/</span>div</span><span class="token punctuation">></span></span>
<span class="token language-javascript"><span class="token punctuation">&#123;</span><span class="token punctuation">:</span><span class="token keyword">else</span><span class="token punctuation">&#125;</span></span>
  <span class="token tag"><span class="token tag"><span class="token punctuation">&lt;</span>div</span><span class="token punctuation">></span></span>Otherwise<span class="token tag"><span class="token tag"><span class="token punctuation">&lt;/</span>div</span><span class="token punctuation">></span></span>
<span class="token language-javascript"><span class="token punctuation">&#123;</span><span class="token operator">/</span><span class="token keyword">if</span><span class="token punctuation">&#125;</span></span></code>` + "";

	let t39;
	let p6;
	let t40;
	let a9;
	let code6;
	let t41;
	let t42;
	let t43;
	let t44;
	let section2;
	let h21;
	let a10;
	let t45;
	let t46;
	let p7;
	let t47;
	let code7;
	let t48;
	let t49;
	let t50;
	let p8;
	let t51;
	let a11;
	let t52;
	let t53;
	let t54;
	let section3;
	let h30;
	let a12;
	let t55;
	let t56;
	let p9;
	let t57;
	let code8;
	let t58;
	let t59;
	let t60;
	let pre2;

	let raw2_value = `<code class="language-js"><span class="token keyword">function</span> <span class="token function">createElementsIfConditionA</span><span class="token punctuation">(</span><span class="token punctuation">)</span> <span class="token punctuation">&#123;</span>
  <span class="token comment">// code to create &#96;&lt;div>Rendered due to condition_a&lt;/div>&#96;</span>
<span class="token punctuation">&#125;</span>
<span class="token keyword">function</span> <span class="token function">createElementsIfConditionB</span><span class="token punctuation">(</span><span class="token punctuation">)</span> <span class="token punctuation">&#123;</span>
  <span class="token comment">// code to create &#96;&lt;div>Rendered due to condition_b&lt;/div>&#96;</span>
<span class="token punctuation">&#125;</span>
<span class="token keyword">function</span> <span class="token function">createElementsElse</span><span class="token punctuation">(</span><span class="token punctuation">)</span> <span class="token punctuation">&#123;</span>
  <span class="token comment">// code to create &#96;&lt;div>Otherwise&lt;/div>&#96;</span>
<span class="token punctuation">&#125;</span>

<span class="token keyword">function</span> <span class="token function">createIfBlock</span><span class="token punctuation">(</span><span class="token punctuation">)</span> <span class="token punctuation">&#123;</span>
  <span class="token keyword">if</span> <span class="token punctuation">(</span>condition_a<span class="token punctuation">)</span> <span class="token punctuation">&#123;</span>
    <span class="token function">createElementsIfConditionA</span><span class="token punctuation">(</span><span class="token punctuation">)</span><span class="token punctuation">;</span>
  <span class="token punctuation">&#125;</span> <span class="token keyword">else</span> <span class="token keyword">if</span> <span class="token punctuation">(</span>condition_b<span class="token punctuation">)</span> <span class="token punctuation">&#123;</span>
    <span class="token function">createElementsIfConditionB</span><span class="token punctuation">(</span><span class="token punctuation">)</span><span class="token punctuation">;</span>
  <span class="token punctuation">&#125;</span> <span class="token keyword">else</span> <span class="token punctuation">&#123;</span>
    <span class="token function">createElementsElse</span><span class="token punctuation">(</span><span class="token punctuation">)</span><span class="token punctuation">;</span>
  <span class="token punctuation">&#125;</span>
<span class="token punctuation">&#125;</span></code>` + "";

	let t61;
	let p10;
	let t62;
	let code9;
	let t63;
	let t64;
	let code10;
	let t65;
	let t66;
	let code11;
	let t67;
	let t68;
	let t69;
	let p11;
	let t70;
	let t71;
	let p12;
	let t72;
	let t73;
	let pre3;

	let raw3_value = `<code class="language-js"><span class="token keyword">function</span> <span class="token function">destroyElementsIfConditionA</span><span class="token punctuation">(</span><span class="token punctuation">)</span> <span class="token punctuation">&#123;</span>
  <span class="token comment">// code to destroy &#96;&lt;div>Rendered due to condition_a&lt;/div>&#96;</span>
<span class="token punctuation">&#125;</span>
<span class="token keyword">function</span> <span class="token function">destroyElementsIfConditionB</span><span class="token punctuation">(</span><span class="token punctuation">)</span> <span class="token punctuation">&#123;</span>
  <span class="token comment">// code to destroy &#96;&lt;div>Rendered due to condition_b&lt;/div>&#96;</span>
<span class="token punctuation">&#125;</span>
<span class="token keyword">function</span> <span class="token function">destroyElementsElse</span><span class="token punctuation">(</span><span class="token punctuation">)</span> <span class="token punctuation">&#123;</span>
  <span class="token comment">// code to destroy &#96;&lt;div>Otherwise&lt;/div>&#96;</span>
<span class="token punctuation">&#125;</span>

<span class="prism-highlight-code-line"><span class="token keyword">let</span> previousDestroy<span class="token punctuation">;</span></span>
<span class="prism-highlight-code-line"><span class="token keyword">function</span> <span class="token function">getPreviousDestroy</span><span class="token punctuation">(</span><span class="token punctuation">)</span> <span class="token punctuation">&#123;</span></span>
<span class="prism-highlight-code-line">  <span class="token keyword">if</span> <span class="token punctuation">(</span>condition_a<span class="token punctuation">)</span> <span class="token punctuation">&#123;</span></span>
<span class="prism-highlight-code-line">    previousDestroy <span class="token operator">=</span> destroyElementsIfConditionA<span class="token punctuation">;</span></span>
<span class="prism-highlight-code-line">  <span class="token punctuation">&#125;</span> <span class="token keyword">else</span> <span class="token keyword">if</span> <span class="token punctuation">(</span>condition_b<span class="token punctuation">)</span> <span class="token punctuation">&#123;</span></span>
<span class="prism-highlight-code-line">    previousDestroy <span class="token operator">=</span> destroyElementsIfConditionB<span class="token punctuation">;</span></span>
<span class="prism-highlight-code-line">  <span class="token punctuation">&#125;</span> <span class="token keyword">else</span> <span class="token punctuation">&#123;</span></span>
<span class="prism-highlight-code-line">    previousDestroy <span class="token operator">=</span> destroyElementsElse<span class="token punctuation">;</span></span>
<span class="prism-highlight-code-line">  <span class="token punctuation">&#125;</span></span>
<span class="prism-highlight-code-line"><span class="token punctuation">&#125;</span></span>

<span class="token keyword">function</span> <span class="token function">createIfBlock</span><span class="token punctuation">(</span><span class="token punctuation">)</span> <span class="token punctuation">&#123;</span>
  <span class="token comment">// ...</span>
<span class="prism-highlight-code-line">  <span class="token function">getPreviousDestroy</span><span class="token punctuation">(</span><span class="token punctuation">)</span><span class="token punctuation">;</span></span>
<span class="token punctuation">&#125;</span></code>` + "";

	let t74;
	let p13;
	let t75;
	let strong2;
	let t76;
	let t77;
	let t78;
	let pre4;

	let raw4_value = `<code class="language-js"><span class="token keyword">function</span> <span class="token function">updateIfBlock</span><span class="token punctuation">(</span><span class="token punctuation">)</span> <span class="token punctuation">&#123;</span>
  <span class="token comment">// if &#96;condition_a&#96; or &#96;condition_b&#96; changed</span>
  <span class="token keyword">if</span> <span class="token punctuation">(</span>conditionChanged<span class="token punctuation">)</span> <span class="token punctuation">&#123;</span>
    <span class="token function">previousDestroy</span><span class="token punctuation">(</span><span class="token punctuation">)</span><span class="token punctuation">;</span>
    <span class="token function">createIfBlock</span><span class="token punctuation">(</span><span class="token punctuation">)</span><span class="token punctuation">;</span>
  <span class="token punctuation">&#125;</span>
<span class="token punctuation">&#125;</span></code>` + "";

	let t79;
	let p14;
	let t80;
	let code12;
	let t81;
	let t82;
	let code13;
	let t83;
	let t84;
	let code14;
	let t85;
	let t86;
	let t87;
	let pre5;

	let raw5_value = `<code class="language-svelte"><span class="token language-javascript"><span class="token punctuation">&#123;</span>#<span class="token keyword">if</span> condition_a<span class="token punctuation">&#125;</span></span>
  <span class="token tag"><span class="token tag"><span class="token punctuation">&lt;</span>div</span><span class="token punctuation">></span></span><span class="token language-javascript"><span class="token punctuation">&#123;</span> value_a <span class="token punctuation">&#125;</span></span><span class="token tag"><span class="token tag"><span class="token punctuation">&lt;/</span>div</span><span class="token punctuation">></span></span>
<span class="token language-javascript"><span class="token punctuation">&#123;</span><span class="token punctuation">:</span><span class="token keyword">else</span> <span class="token keyword">if</span> condition_b<span class="token punctuation">&#125;</span></span>
  <span class="token tag"><span class="token tag"><span class="token punctuation">&lt;</span>div</span><span class="token punctuation">></span></span><span class="token language-javascript"><span class="token punctuation">&#123;</span> value_b <span class="token punctuation">&#125;</span></span><span class="token tag"><span class="token tag"><span class="token punctuation">&lt;/</span>div</span><span class="token punctuation">></span></span>
<span class="token language-javascript"><span class="token punctuation">&#123;</span><span class="token punctuation">:</span><span class="token keyword">else</span><span class="token punctuation">&#125;</span></span>
  <span class="token tag"><span class="token tag"><span class="token punctuation">&lt;</span>div</span><span class="token punctuation">></span></span><span class="token language-javascript"><span class="token punctuation">&#123;</span> value_else <span class="token punctuation">&#125;</span></span><span class="token tag"><span class="token tag"><span class="token punctuation">&lt;/</span>div</span><span class="token punctuation">></span></span>
<span class="token language-javascript"><span class="token punctuation">&#123;</span><span class="token operator">/</span><span class="token keyword">if</span><span class="token punctuation">&#125;</span></span></code>` + "";

	let t88;
	let p15;
	let t89;
	let t90;
	let pre6;

	let raw6_value = `<code class="language-js"><span class="token keyword">function</span> <span class="token function">updateElementsIfConditionA</span><span class="token punctuation">(</span><span class="token punctuation">)</span> <span class="token punctuation">&#123;</span>
  <span class="token comment">// code to update &#96;&lt;div>&#123; value_a &#125;&lt;/div>&#96;</span>
<span class="token punctuation">&#125;</span>
<span class="token keyword">function</span> <span class="token function">updateElementsIfConditionB</span><span class="token punctuation">(</span><span class="token punctuation">)</span> <span class="token punctuation">&#123;</span>
  <span class="token comment">// code to update &#96;&lt;div>&#123; value_b &#125;&lt;/div>&#96;</span>
<span class="token punctuation">&#125;</span>
<span class="token keyword">function</span> <span class="token function">updateElementsElse</span><span class="token punctuation">(</span><span class="token punctuation">)</span> <span class="token punctuation">&#123;</span>
  <span class="token comment">// code to update &#96;&lt;div>&#123; value_else &#125;&lt;/div>&#96;</span>
<span class="token punctuation">&#125;</span>

<span class="token keyword">function</span> <span class="token function">updateIfBlock</span><span class="token punctuation">(</span><span class="token punctuation">)</span> <span class="token punctuation">&#123;</span>
  <span class="token comment">// if &#96;condition_a&#96; or &#96;condition_b&#96; changed</span>
  <span class="token keyword">if</span> <span class="token punctuation">(</span>conditionChanged<span class="token punctuation">)</span> <span class="token punctuation">&#123;</span>
    <span class="token function">previousDestroy</span><span class="token punctuation">(</span><span class="token punctuation">)</span><span class="token punctuation">;</span>
    <span class="token function">createIfBlock</span><span class="token punctuation">(</span><span class="token punctuation">)</span><span class="token punctuation">;</span>
<span class="prism-highlight-code-line">  <span class="token punctuation">&#125;</span> <span class="token keyword">else</span> <span class="token punctuation">&#123;</span></span>
<span class="prism-highlight-code-line">    <span class="token keyword">if</span> <span class="token punctuation">(</span>condition_a<span class="token punctuation">)</span> <span class="token punctuation">&#123;</span></span>
<span class="prism-highlight-code-line">      <span class="token function">updateElementsIfConditionA</span><span class="token punctuation">(</span><span class="token punctuation">)</span><span class="token punctuation">;</span></span>
<span class="prism-highlight-code-line">    <span class="token punctuation">&#125;</span> <span class="token keyword">else</span> <span class="token keyword">if</span> <span class="token punctuation">(</span>condition_b<span class="token punctuation">)</span> <span class="token punctuation">&#123;</span></span>
<span class="prism-highlight-code-line">      <span class="token function">updateElementsIfConditionB</span><span class="token punctuation">(</span><span class="token punctuation">)</span><span class="token punctuation">;</span></span>
<span class="prism-highlight-code-line">    <span class="token punctuation">&#125;</span> <span class="token keyword">else</span> <span class="token punctuation">&#123;</span></span>
<span class="prism-highlight-code-line">      <span class="token function">updateElementsElse</span><span class="token punctuation">(</span><span class="token punctuation">)</span><span class="token punctuation">;</span></span>
<span class="prism-highlight-code-line">    <span class="token punctuation">&#125;</span></span>
<span class="prism-highlight-code-line">  <span class="token punctuation">&#125;</span></span>
<span class="token punctuation">&#125;</span></code>` + "";

	let t91;
	let p16;
	let t92;
	let code15;
	let t93;
	let t94;
	let code16;
	let t95;
	let t96;
	let t97;
	let pre7;

	let raw7_value = `<code class="language-js"><span class="token keyword">function</span> <span class="token function">destroyIfBlock</span><span class="token punctuation">(</span><span class="token punctuation">)</span> <span class="token punctuation">&#123;</span>
  <span class="token function">previousDestroy</span><span class="token punctuation">(</span><span class="token punctuation">)</span><span class="token punctuation">;</span>
<span class="token punctuation">&#125;</span></code>` + "";

	let t98;
	let p17;
	let t99;
	let code17;
	let t100;
	let t101;
	let code18;
	let t102;
	let t103;
	let code19;
	let t104;
	let t105;
	let code20;
	let t106;
	let t107;
	let code21;
	let t108;
	let t109;
	let code22;
	let t110;
	let t111;
	let code23;
	let t112;
	let t113;
	let t114;
	let p18;
	let t115;
	let t116;
	let section4;
	let h31;
	let a13;
	let t117;
	let t118;
	let p19;
	let t119;
	let t120;
	let ul3;
	let li7;
	let code24;
	let t121;
	let t122;
	let li8;
	let code25;
	let t123;
	let t124;
	let li9;
	let code26;
	let t125;
	let t126;
	let p20;
	let t127;
	let a14;
	let t128;
	let t129;
	let t130;
	let p21;
	let t131;
	let code27;
	let t132;
	let t133;
	let t134;
	let pre8;

	let raw8_value = `<code class="language-js"><span class="token keyword">const</span> operationConditionA <span class="token operator">=</span> <span class="token punctuation">&#123;</span>
  create<span class="token punctuation">:</span> createElementsIfConditionA<span class="token punctuation">,</span>
  update<span class="token punctuation">:</span> updateElementsIfConditionA<span class="token punctuation">,</span>
  destroy<span class="token punctuation">:</span> destroyElementsIfConditionA<span class="token punctuation">,</span>
<span class="token punctuation">&#125;</span><span class="token punctuation">;</span>
<span class="token keyword">const</span> operationConditionB <span class="token operator">=</span> <span class="token punctuation">&#123;</span>
  create<span class="token punctuation">:</span> createElementsIfConditionB<span class="token punctuation">,</span>
  update<span class="token punctuation">:</span> updateElementsIfConditionB<span class="token punctuation">,</span>
  destroy<span class="token punctuation">:</span> destroyElementsIfConditionB<span class="token punctuation">,</span>
<span class="token punctuation">&#125;</span><span class="token punctuation">;</span>
<span class="token keyword">const</span> operationConditionElse <span class="token operator">=</span> <span class="token punctuation">&#123;</span>
  create<span class="token punctuation">:</span> createElementsElse<span class="token punctuation">,</span>
  update<span class="token punctuation">:</span> updateElementsElse<span class="token punctuation">,</span>
  destroy<span class="token punctuation">:</span> destroyElementsElse<span class="token punctuation">,</span>
<span class="token punctuation">&#125;</span><span class="token punctuation">;</span></code>` + "";

	let t135;
	let p22;
	let t136;
	let t137;
	let pre9;

	let raw9_value = `<code class="language-js"><span class="token keyword">function</span> <span class="token function">getOperation</span><span class="token punctuation">(</span><span class="token punctuation">)</span> <span class="token punctuation">&#123;</span>
  <span class="token keyword">if</span> <span class="token punctuation">(</span>condition_a<span class="token punctuation">)</span> <span class="token punctuation">&#123;</span>
    <span class="token keyword">return</span> operationConditionA<span class="token punctuation">;</span>
  <span class="token punctuation">&#125;</span> <span class="token keyword">else</span> <span class="token keyword">if</span> <span class="token punctuation">(</span>condition_b<span class="token punctuation">)</span> <span class="token punctuation">&#123;</span>
    <span class="token keyword">return</span> operationConditionB<span class="token punctuation">;</span>
  <span class="token punctuation">&#125;</span> <span class="token keyword">else</span> <span class="token punctuation">&#123;</span>
    <span class="token keyword">return</span> operationConditionElse<span class="token punctuation">;</span>
  <span class="token punctuation">&#125;</span>
<span class="token punctuation">&#125;</span></code>` + "";

	let t138;
	let p23;
	let t139;
	let code28;
	let t140;
	let t141;
	let code29;
	let t142;
	let t143;
	let code30;
	let t144;
	let t145;
	let t146;
	let pre10;

	let raw10_value = `<code class="language-js"><span class="token keyword">let</span> currentOperation <span class="token operator">=</span> <span class="token function">getOperation</span><span class="token punctuation">(</span><span class="token punctuation">)</span><span class="token punctuation">;</span>

<span class="token keyword">function</span> <span class="token function">createIfBlock</span><span class="token punctuation">(</span><span class="token punctuation">)</span> <span class="token punctuation">&#123;</span>
  currentOperation<span class="token punctuation">.</span><span class="token function">create</span><span class="token punctuation">(</span><span class="token punctuation">)</span><span class="token punctuation">;</span>
<span class="token punctuation">&#125;</span>

<span class="token keyword">function</span> <span class="token function">updateIfBlock</span><span class="token punctuation">(</span><span class="token punctuation">)</span> <span class="token punctuation">&#123;</span>
  <span class="token keyword">const</span> previousOperation <span class="token operator">=</span> currentOperation<span class="token punctuation">;</span>
  currentOperation <span class="token operator">=</span> <span class="token function">getOperation</span><span class="token punctuation">(</span><span class="token punctuation">)</span><span class="token punctuation">;</span>
  <span class="token comment">// if (conditionChanged)</span>
  <span class="token keyword">if</span> <span class="token punctuation">(</span>currentOperation <span class="token operator">!==</span> previousOperation<span class="token punctuation">)</span> <span class="token punctuation">&#123;</span>
    previousOperation<span class="token punctuation">.</span><span class="token function">destroy</span><span class="token punctuation">(</span><span class="token punctuation">)</span><span class="token punctuation">;</span>
    currentOperation<span class="token punctuation">.</span><span class="token function">create</span><span class="token punctuation">(</span><span class="token punctuation">)</span><span class="token punctuation">;</span>
  <span class="token punctuation">&#125;</span> <span class="token keyword">else</span> <span class="token punctuation">&#123;</span>
    currentOperation<span class="token punctuation">.</span><span class="token function">update</span><span class="token punctuation">(</span><span class="token punctuation">)</span><span class="token punctuation">;</span>
  <span class="token punctuation">&#125;</span>
<span class="token punctuation">&#125;</span>

<span class="token keyword">function</span> <span class="token function">destroyIfBlock</span><span class="token punctuation">(</span><span class="token punctuation">)</span> <span class="token punctuation">&#123;</span>
  currentOperation<span class="token punctuation">.</span><span class="token function">destroy</span><span class="token punctuation">(</span><span class="token punctuation">)</span><span class="token punctuation">;</span>
<span class="token punctuation">&#125;</span></code>` + "";

	let t147;
	let p24;
	let t148;
	let t149;
	let section5;
	let h22;
	let a15;
	let t150;
	let t151;
	let p25;
	let t152;
	let code31;
	let t153;
	let t154;
	let t155;
	let pre11;

	let raw11_value = `<code class="language-svelte"><span class="token tag"><span class="token tag"><span class="token punctuation">&lt;</span>script</span><span class="token punctuation">></span></span><span class="token script"><span class="token language-javascript">
	<span class="token keyword">let</span> loggedIn <span class="token operator">=</span> <span class="token boolean">false</span><span class="token punctuation">;</span>

	<span class="token keyword">function</span> <span class="token function">toggle</span><span class="token punctuation">(</span><span class="token punctuation">)</span> <span class="token punctuation">&#123;</span>
		loggedIn <span class="token operator">=</span> <span class="token operator">!</span>loggedIn<span class="token punctuation">;</span>
	<span class="token punctuation">&#125;</span>
</span></span><span class="token tag"><span class="token tag"><span class="token punctuation">&lt;/</span>script</span><span class="token punctuation">></span></span>

<span class="token language-javascript"><span class="token punctuation">&#123;</span>#<span class="token keyword">if</span> loggedIn<span class="token punctuation">&#125;</span></span>
	<span class="token tag"><span class="token tag"><span class="token punctuation">&lt;</span>button</span> <span class="token attr-name"><span class="token namespace">on:</span>click=</span><span class="token language-javascript"><span class="token punctuation">&#123;</span>toggle<span class="token punctuation">&#125;</span></span><span class="token punctuation">></span></span>
		Log out
	<span class="token tag"><span class="token tag"><span class="token punctuation">&lt;/</span>button</span><span class="token punctuation">></span></span>
<span class="token language-javascript"><span class="token punctuation">&#123;</span><span class="token punctuation">:</span><span class="token keyword">else</span><span class="token punctuation">&#125;</span></span>
	<span class="token tag"><span class="token tag"><span class="token punctuation">&lt;</span>button</span> <span class="token attr-name"><span class="token namespace">on:</span>click=</span><span class="token language-javascript"><span class="token punctuation">&#123;</span>toggle<span class="token punctuation">&#125;</span></span><span class="token punctuation">></span></span>
		Log in
	<span class="token tag"><span class="token tag"><span class="token punctuation">&lt;/</span>button</span><span class="token punctuation">></span></span>
<span class="token language-javascript"><span class="token punctuation">&#123;</span><span class="token operator">/</span><span class="token keyword">if</span><span class="token punctuation">&#125;</span></span></code>` + "";

	let t156;
	let p26;
	let a16;
	let t157;
	let t158;
	let p27;
	let t159;
	let t160;
	let details;
	let summary;
	let t161;
	let t162;
	let pre12;

	let raw12_value = `<code class="language-js"><span class="token comment">/* App.svelte generated by Svelte v3.25.1 */</span>
<span class="token comment">// ...</span>
<span class="token keyword">function</span> <span class="token function">create_else_block</span><span class="token punctuation">(</span><span class="token parameter">ctx</span><span class="token punctuation">)</span> <span class="token punctuation">&#123;</span>
  <span class="token comment">// ...</span>
  <span class="token keyword">return</span> <span class="token punctuation">&#123;</span>
    <span class="token function">c</span><span class="token punctuation">(</span><span class="token punctuation">)</span> <span class="token punctuation">&#123;</span> <span class="token comment">/* ... */</span> <span class="token punctuation">&#125;</span><span class="token punctuation">,</span>
    <span class="token function">m</span><span class="token punctuation">(</span><span class="token parameter">target<span class="token punctuation">,</span> anchor</span><span class="token punctuation">)</span> <span class="token punctuation">&#123;</span> <span class="token comment">/* ... */</span> <span class="token punctuation">&#125;</span><span class="token punctuation">,</span>
    p<span class="token punctuation">:</span> noop<span class="token punctuation">,</span>
    <span class="token function">d</span><span class="token punctuation">(</span><span class="token parameter">detaching</span><span class="token punctuation">)</span> <span class="token punctuation">&#123;</span> <span class="token comment">/* ... */</span> <span class="token punctuation">&#125;</span><span class="token punctuation">,</span>
  <span class="token punctuation">&#125;</span><span class="token punctuation">;</span>
<span class="token punctuation">&#125;</span>

<span class="token comment">// (9:0) &#123;#if loggedIn&#125;</span>
<span class="token keyword">function</span> <span class="token function">create_if_block</span><span class="token punctuation">(</span><span class="token parameter">ctx</span><span class="token punctuation">)</span> <span class="token punctuation">&#123;</span>
  <span class="token comment">// ...</span>
  <span class="token keyword">return</span> <span class="token punctuation">&#123;</span>
    <span class="token function">c</span><span class="token punctuation">(</span><span class="token punctuation">)</span> <span class="token punctuation">&#123;</span> <span class="token comment">/* ... */</span> <span class="token punctuation">&#125;</span><span class="token punctuation">,</span>
    <span class="token function">m</span><span class="token punctuation">(</span><span class="token parameter">target<span class="token punctuation">,</span> anchor</span><span class="token punctuation">)</span> <span class="token punctuation">&#123;</span> <span class="token comment">/* ... */</span> <span class="token punctuation">&#125;</span><span class="token punctuation">,</span>
    p<span class="token punctuation">:</span> noop<span class="token punctuation">,</span>
    <span class="token function">d</span><span class="token punctuation">(</span><span class="token parameter">detaching</span><span class="token punctuation">)</span> <span class="token punctuation">&#123;</span> <span class="token comment">/* ... */</span> <span class="token punctuation">&#125;</span><span class="token punctuation">,</span>
  <span class="token punctuation">&#125;</span><span class="token punctuation">;</span>
<span class="token punctuation">&#125;</span>

<span class="token keyword">function</span> <span class="token function">create_fragment</span><span class="token punctuation">(</span><span class="token parameter">ctx</span><span class="token punctuation">)</span> <span class="token punctuation">&#123;</span>
  <span class="token comment">// ...</span>
  <span class="token keyword">function</span> <span class="token function">select_block_type</span><span class="token punctuation">(</span><span class="token parameter">ctx<span class="token punctuation">,</span> dirty</span><span class="token punctuation">)</span> <span class="token punctuation">&#123;</span>
    <span class="token keyword">if</span> <span class="token punctuation">(</span><span class="token comment">/*loggedIn*/</span> ctx<span class="token punctuation">[</span><span class="token number">0</span><span class="token punctuation">]</span><span class="token punctuation">)</span> <span class="token keyword">return</span> create_if_block<span class="token punctuation">;</span>
    <span class="token keyword">return</span> create_else_block<span class="token punctuation">;</span>
  <span class="token punctuation">&#125;</span>

  <span class="token keyword">let</span> current_block_type <span class="token operator">=</span> <span class="token function">select_block_type</span><span class="token punctuation">(</span>ctx<span class="token punctuation">,</span> <span class="token operator">-</span><span class="token number">1</span><span class="token punctuation">)</span><span class="token punctuation">;</span>
  <span class="token keyword">let</span> if_block <span class="token operator">=</span> <span class="token function">current_block_type</span><span class="token punctuation">(</span>ctx<span class="token punctuation">)</span><span class="token punctuation">;</span>

  <span class="token keyword">return</span> <span class="token punctuation">&#123;</span>
    <span class="token function">c</span><span class="token punctuation">(</span><span class="token punctuation">)</span> <span class="token punctuation">&#123;</span>
      if_block<span class="token punctuation">.</span><span class="token function">c</span><span class="token punctuation">(</span><span class="token punctuation">)</span><span class="token punctuation">;</span>
      if_block_anchor <span class="token operator">=</span> <span class="token function">empty</span><span class="token punctuation">(</span><span class="token punctuation">)</span><span class="token punctuation">;</span>
    <span class="token punctuation">&#125;</span><span class="token punctuation">,</span>
    <span class="token function">m</span><span class="token punctuation">(</span><span class="token parameter">target<span class="token punctuation">,</span> anchor</span><span class="token punctuation">)</span> <span class="token punctuation">&#123;</span>
      if_block<span class="token punctuation">.</span><span class="token function">m</span><span class="token punctuation">(</span>target<span class="token punctuation">,</span> anchor<span class="token punctuation">)</span><span class="token punctuation">;</span>
      <span class="token function">insert</span><span class="token punctuation">(</span>target<span class="token punctuation">,</span> if_block_anchor<span class="token punctuation">,</span> anchor<span class="token punctuation">)</span><span class="token punctuation">;</span>
    <span class="token punctuation">&#125;</span><span class="token punctuation">,</span>
    <span class="token function">p</span><span class="token punctuation">(</span><span class="token parameter">ctx<span class="token punctuation">,</span> <span class="token punctuation">[</span>dirty<span class="token punctuation">]</span></span><span class="token punctuation">)</span> <span class="token punctuation">&#123;</span>
      <span class="token keyword">if</span> <span class="token punctuation">(</span>current_block_type <span class="token operator">===</span> <span class="token punctuation">(</span>current_block_type <span class="token operator">=</span> <span class="token function">select_block_type</span><span class="token punctuation">(</span>ctx<span class="token punctuation">,</span> dirty<span class="token punctuation">)</span><span class="token punctuation">)</span> <span class="token operator">&amp;&amp;</span> if_block<span class="token punctuation">)</span> <span class="token punctuation">&#123;</span>
        if_block<span class="token punctuation">.</span><span class="token function">p</span><span class="token punctuation">(</span>ctx<span class="token punctuation">,</span> dirty<span class="token punctuation">)</span><span class="token punctuation">;</span>
      <span class="token punctuation">&#125;</span> <span class="token keyword">else</span> <span class="token punctuation">&#123;</span>
        if_block<span class="token punctuation">.</span><span class="token function">d</span><span class="token punctuation">(</span><span class="token number">1</span><span class="token punctuation">)</span><span class="token punctuation">;</span>
        if_block <span class="token operator">=</span> <span class="token function">current_block_type</span><span class="token punctuation">(</span>ctx<span class="token punctuation">)</span><span class="token punctuation">;</span>

        <span class="token keyword">if</span> <span class="token punctuation">(</span>if_block<span class="token punctuation">)</span> <span class="token punctuation">&#123;</span>
          if_block<span class="token punctuation">.</span><span class="token function">c</span><span class="token punctuation">(</span><span class="token punctuation">)</span><span class="token punctuation">;</span>
          if_block<span class="token punctuation">.</span><span class="token function">m</span><span class="token punctuation">(</span>if_block_anchor<span class="token punctuation">.</span>parentNode<span class="token punctuation">,</span> if_block_anchor<span class="token punctuation">)</span><span class="token punctuation">;</span>
        <span class="token punctuation">&#125;</span>
      <span class="token punctuation">&#125;</span>
    <span class="token punctuation">&#125;</span><span class="token punctuation">,</span>
    i<span class="token punctuation">:</span> noop<span class="token punctuation">,</span>
    o<span class="token punctuation">:</span> noop<span class="token punctuation">,</span>
    <span class="token function">d</span><span class="token punctuation">(</span><span class="token parameter">detaching</span><span class="token punctuation">)</span> <span class="token punctuation">&#123;</span>
      if_block<span class="token punctuation">.</span><span class="token function">d</span><span class="token punctuation">(</span>detaching<span class="token punctuation">)</span><span class="token punctuation">;</span>
      <span class="token keyword">if</span> <span class="token punctuation">(</span>detaching<span class="token punctuation">)</span> <span class="token function">detach</span><span class="token punctuation">(</span>if_block_anchor<span class="token punctuation">)</span><span class="token punctuation">;</span>
    <span class="token punctuation">&#125;</span><span class="token punctuation">,</span>
  <span class="token punctuation">&#125;</span><span class="token punctuation">;</span>
<span class="token punctuation">&#125;</span></code>` + "";

	let t163;
	let p28;
	let t164;
	let t165;
	let p29;
	let strong3;
	let t166;
	let t167;
	let ul4;
	let li10;
	let p30;
	let t168;
	let a17;
	let code32;
	let t169;
	let t170;
	let t171;
	let code33;
	let t172;
	let t173;
	let code34;
	let t174;
	let t175;
	let em;
	let t176;
	let t177;
	let t178;
	let p31;
	let t179;
	let code35;
	let t180;
	let t181;
	let code36;
	let t182;
	let t183;
	let code37;
	let t184;
	let t185;
	let t186;
	let li11;
	let p32;
	let t187;
	let code38;
	let t188;
	let t189;
	let code39;
	let t190;
	let t191;
	let t192;
	let p33;
	let t193;
	let code40;
	let t194;
	let t195;
	let t196;
	let li12;
	let p34;
	let t197;
	let t198;
	let pre13;

	let raw13_value = `<code class="language-js"><span class="token keyword">let</span> current_block_type <span class="token operator">=</span> <span class="token function">select_block_type</span><span class="token punctuation">(</span>ctx<span class="token punctuation">,</span> <span class="token operator">-</span><span class="token number">1</span><span class="token punctuation">)</span><span class="token punctuation">;</span>
<span class="token keyword">let</span> if_block <span class="token operator">=</span> <span class="token function">current_block_type</span><span class="token punctuation">(</span>ctx<span class="token punctuation">)</span><span class="token punctuation">;</span></code>` + "";

	let t199;
	let ul6;
	let li17;
	let p35;
	let t200;
	let t201;
	let ul5;
	let li13;
	let t202;
	let code41;
	let t203;
	let t204;
	let li14;
	let t205;
	let code42;
	let t206;
	let t207;
	let li15;
	let t208;
	let code43;
	let t209;
	let t210;
	let li16;
	let t211;
	let code44;
	let t212;
	let t213;
	let p36;
	let t214;
	let code45;
	let t215;
	let t216;
	let t217;
	let li18;
	let p37;
	let t218;
	let code46;
	let t219;
	let t220;
	let strong4;
	let t221;
	let t222;
	let code47;
	let t223;
	let t224;
	let code48;
	let t225;
	let t226;
	let t227;
	let p38;
	let t228;
	let code49;
	let t229;
	let t230;
	let code50;
	let t231;
	let t232;
	let code51;
	let t233;
	let t234;
	let code52;
	let t235;
	let t236;
	let t237;
	let p39;
	let t238;
	let code53;
	let t239;
	let t240;
	let code54;
	let t241;
	let t242;
	let code55;
	let t243;
	let t244;
	let t245;
	let p40;
	let strong5;
	let t246;
	let code56;
	let t247;
	let t248;
	let code57;
	let t249;
	let t250;
	let pre14;
	let raw14_value = `<code class="language-js">if_block_anchor <span class="token operator">=</span> <span class="token function">empty</span><span class="token punctuation">(</span><span class="token punctuation">)</span></code>` + "";
	let t251;
	let p41;
	let code58;
	let t252;
	let t253;
	let t254;
	let pre15;

	let raw15_value = `<code class="language-js"><span class="token comment">// https://github.com/sveltejs/svelte/blob/v3.25.1/src/runtime/internal/dom.ts#L56-L58</span>
<span class="token keyword">export</span> <span class="token keyword">function</span> <span class="token function">empty</span><span class="token punctuation">(</span><span class="token punctuation">)</span> <span class="token punctuation">&#123;</span>
  <span class="token keyword">return</span> <span class="token function">text</span><span class="token punctuation">(</span><span class="token string">''</span><span class="token punctuation">)</span><span class="token punctuation">;</span>
<span class="token punctuation">&#125;</span></code>` + "";

	let t255;
	let p42;
	let t256;
	let code59;
	let t257;
	let t258;
	let code60;
	let t259;
	let t260;
	let strong6;
	let t261;
	let t262;
	let t263;
	let pre16;
	let raw16_value = `<code class="language-js">if_block<span class="token punctuation">.</span><span class="token function">m</span><span class="token punctuation">(</span>if_block_anchor<span class="token punctuation">.</span>parentNode<span class="token punctuation">,</span> if_block_anchor<span class="token punctuation">)</span></code>` + "";
	let t264;
	let p43;
	let t265;
	let t266;
	let section6;
	let h32;
	let a18;
	let t267;
	let t268;
	let p44;
	let t269;
	let code61;
	let t270;
	let t271;
	let t272;
	let p45;
	let t273;
	let a19;
	let code62;
	let t274;
	let t275;
	let t276;
	let p46;
	let t277;
	let code63;
	let t278;
	let t279;
	let t280;
	let p47;
	let strong7;
	let t281;
	let code64;
	let t282;
	let t283;
	let t284;
	let pre17;

	let raw17_value = `<code class="language-svelte"><span class="token language-javascript"><span class="token punctuation">&#123;</span>#<span class="token keyword">if</span> condition<span class="token punctuation">&#125;</span></span>
  <span class="token tag"><span class="token tag"><span class="token punctuation">&lt;</span>div</span> <span class="token punctuation">/></span></span>
<span class="token language-javascript"><span class="token punctuation">&#123;</span><span class="token operator">/</span><span class="token keyword">if</span><span class="token punctuation">&#125;</span></span>
<span class="token tag"><span class="token tag"><span class="token punctuation">&lt;</span>span</span> <span class="token punctuation">/></span></span></code>` + "";

	let t285;
	let p48;
	let a20;
	let t286;
	let t287;
	let p49;
	let t288;
	let t289;
	let ul7;
	let li19;
	let t290;
	let t291;
	let li20;
	let t292;
	let code65;
	let t293;
	let t294;
	let t295;
	let pre18;
	let raw18_value = `<code class="language-js">if_block<span class="token punctuation">.</span><span class="token function">m</span><span class="token punctuation">(</span>span<span class="token punctuation">.</span>parentNode<span class="token punctuation">,</span> span<span class="token punctuation">)</span></code>` + "";
	let t296;
	let blockquote0;
	let p50;
	let t297;
	let code66;
	let t298;
	let t299;
	let code67;
	let t300;
	let t301;
	let code68;
	let t302;
	let t303;
	let t304;
	let p51;
	let strong8;
	let t305;
	let code69;
	let t306;
	let t307;
	let code70;
	let t308;
	let t309;
	let t310;
	let pre19;

	let raw19_value = `<code class="language-svelte"><span class="token tag"><span class="token tag"><span class="token punctuation">&lt;</span>div</span><span class="token punctuation">></span></span>
  <span class="token language-javascript"><span class="token punctuation">&#123;</span>#<span class="token keyword">if</span> condition<span class="token punctuation">&#125;</span></span>
    <span class="token tag"><span class="token tag"><span class="token punctuation">&lt;</span>div</span> <span class="token punctuation">/></span></span>
  <span class="token language-javascript"><span class="token punctuation">&#123;</span><span class="token operator">/</span><span class="token keyword">if</span><span class="token punctuation">&#125;</span></span>
<span class="token tag"><span class="token tag"><span class="token punctuation">&lt;/</span>div</span><span class="token punctuation">></span></span></code>` + "";

	let t311;
	let p52;
	let a21;
	let t312;
	let t313;
	let p53;
	let t314;
	let t315;
	let ul8;
	let li21;
	let t316;
	let t317;
	let li22;
	let t318;
	let code71;
	let t319;
	let t320;
	let code72;
	let t321;
	let t322;
	let code73;
	let t323;
	let t324;
	let code74;
	let t325;
	let t326;
	let code75;
	let t327;
	let t328;
	let t329;
	let pre20;
	let raw20_value = `<code class="language-js">if_block<span class="token punctuation">.</span><span class="token function">m</span><span class="token punctuation">(</span>div<span class="token punctuation">,</span> <span class="token keyword">null</span><span class="token punctuation">)</span><span class="token punctuation">;</span></code>` + "";
	let t330;
	let blockquote1;
	let p54;
	let t331;
	let code76;
	let t332;
	let t333;
	let code77;
	let t334;
	let t335;
	let code78;
	let t336;
	let t337;
	let t338;
	let p55;
	let strong9;
	let t339;
	let code79;
	let t340;
	let t341;
	let code80;
	let t342;
	let t343;
	let t344;
	let pre21;

	let raw21_value = `<code class="language-svelte"><span class="token language-javascript"><span class="token punctuation">&#123;</span>#<span class="token keyword">if</span> condition<span class="token punctuation">&#125;</span></span>
  <span class="token tag"><span class="token tag"><span class="token punctuation">&lt;</span>div</span> <span class="token punctuation">/></span></span>
<span class="token language-javascript"><span class="token punctuation">&#123;</span><span class="token operator">/</span><span class="token keyword">if</span><span class="token punctuation">&#125;</span></span></code>` + "";

	let t345;
	let p56;
	let a22;
	let t346;
	let t347;
	let p57;
	let t348;
	let t349;
	let ul9;
	let li23;
	let t350;
	let code81;
	let t351;
	let t352;
	let t353;
	let li24;
	let t354;
	let code82;
	let t355;
	let t356;
	let code83;
	let t357;
	let t358;
	let t359;
	let li25;
	let t360;
	let strong10;
	let t361;
	let t362;
	let code84;
	let t363;
	let t364;
	let code85;
	let t365;
	let t366;
	let t367;
	let pre22;
	let raw22_value = `<code class="language-js">if_block<span class="token punctuation">.</span><span class="token function">m</span><span class="token punctuation">(</span>if_block_anchor<span class="token punctuation">.</span>parentNode<span class="token punctuation">,</span> if_block_anchor<span class="token punctuation">)</span><span class="token punctuation">;</span></code>` + "";
	let t368;
	let blockquote2;
	let p58;
	let t369;
	let code86;
	let t370;
	let t371;
	let code87;
	let t372;
	let t373;
	let code88;
	let t374;
	let t375;
	let t376;
	let p59;
	let t377;
	let t378;
	let p60;
	let t379;
	let t380;
	let p61;
	let t381;
	let t382;
	let pre23;

	let raw23_value = `<code class="language-svelte"><span class="token comment">&lt;!-- A.svelte --></span>
<span class="token language-javascript"><span class="token punctuation">&#123;</span>#<span class="token keyword">if</span> condition<span class="token punctuation">&#125;</span></span>
  <span class="token tag"><span class="token tag"><span class="token punctuation">&lt;</span>div</span> <span class="token attr-name">id</span><span class="token attr-value"><span class="token punctuation">=</span><span class="token punctuation">"</span>a<span class="token punctuation">"</span></span> <span class="token punctuation">/></span></span>
<span class="token language-javascript"><span class="token punctuation">&#123;</span><span class="token operator">/</span><span class="token keyword">if</span><span class="token punctuation">&#125;</span></span>

<span class="token comment">&lt;!-- B.svelte --></span>
<span class="token tag"><span class="token tag"><span class="token punctuation">&lt;</span>div</span> <span class="token attr-name">id</span><span class="token attr-value"><span class="token punctuation">=</span><span class="token punctuation">"</span>b<span class="token punctuation">"</span></span> <span class="token punctuation">/></span></span>

<span class="token comment">&lt;!-- App.svelte --></span>
<span class="token tag"><span class="token tag"><span class="token punctuation">&lt;</span>script</span><span class="token punctuation">></span></span><span class="token script"><span class="token language-javascript">
  <span class="token keyword">import</span> <span class="token constant">A</span> <span class="token keyword">from</span> <span class="token string">'./A.svelte'</span><span class="token punctuation">;</span>
  <span class="token keyword">import</span> <span class="token constant">B</span> <span class="token keyword">from</span> <span class="token string">'./B.svelte'</span><span class="token punctuation">;</span>
</span></span><span class="token tag"><span class="token tag"><span class="token punctuation">&lt;/</span>script</span><span class="token punctuation">></span></span>

<span class="token tag"><span class="token tag"><span class="token punctuation">&lt;</span>div</span> <span class="token attr-name">id</span><span class="token attr-value"><span class="token punctuation">=</span><span class="token punctuation">"</span>parent<span class="token punctuation">"</span></span><span class="token punctuation">></span></span>
  <span class="token tag"><span class="token tag"><span class="token punctuation">&lt;</span>A</span> <span class="token punctuation">/></span></span>
  <span class="token tag"><span class="token tag"><span class="token punctuation">&lt;</span>B</span> <span class="token punctuation">/></span></span>
<span class="token tag"><span class="token tag"><span class="token punctuation">&lt;/</span>div</span><span class="token punctuation">></span></span></code>` + "";

	let t383;
	let p62;
	let t384;
	let code89;
	let t385;
	let t386;
	let code90;
	let t387;
	let t388;
	let t389;
	let p63;
	let t390;
	let code91;
	let t391;
	let t392;
	let code92;
	let t393;
	let t394;
	let code93;
	let t395;
	let t396;
	let code94;
	let t397;
	let t398;
	let code95;
	let t399;
	let t400;
	let code96;
	let t401;
	let t402;
	let code97;
	let t403;
	let t404;
	let code98;
	let t405;
	let t406;
	let code99;
	let t407;
	let t408;
	let code100;
	let t409;
	let t410;
	let code101;
	let t411;
	let t412;
	let code102;
	let t413;
	let t414;
	let t415;
	let pre24;

	let raw24_value = `<code class="language-html"><span class="token tag"><span class="token tag"><span class="token punctuation">&lt;</span>div</span> <span class="token attr-name">id</span><span class="token attr-value"><span class="token punctuation">=</span><span class="token punctuation">"</span>parent<span class="token punctuation">"</span></span><span class="token punctuation">></span></span>
  <span class="token tag"><span class="token tag"><span class="token punctuation">&lt;</span>div</span> <span class="token attr-name">id</span><span class="token attr-value"><span class="token punctuation">=</span><span class="token punctuation">"</span>b<span class="token punctuation">"</span></span><span class="token punctuation">></span></span><span class="token tag"><span class="token tag"><span class="token punctuation">&lt;/</span>div</span><span class="token punctuation">></span></span>
  <span class="token tag"><span class="token tag"><span class="token punctuation">&lt;</span>div</span> <span class="token attr-name">id</span><span class="token attr-value"><span class="token punctuation">=</span><span class="token punctuation">"</span>a<span class="token punctuation">"</span></span><span class="token punctuation">></span></span><span class="token tag"><span class="token tag"><span class="token punctuation">&lt;/</span>div</span><span class="token punctuation">></span></span> <span class="token comment">&lt;!-- newly inserted element --></span>
<span class="token tag"><span class="token tag"><span class="token punctuation">&lt;/</span>div</span><span class="token punctuation">></span></span></code>` + "";

	let t416;
	let p64;
	let t417;
	let code103;
	let t418;
	let t419;
	let t420;
	let p65;
	let t421;
	let code104;
	let t422;
	let t423;
	let code105;
	let t424;
	let t425;
	let t426;
	let pre25;

	let raw25_value = `<code class="language-html"><span class="token tag"><span class="token tag"><span class="token punctuation">&lt;</span>div</span> <span class="token attr-name">id</span><span class="token attr-value"><span class="token punctuation">=</span><span class="token punctuation">"</span>parent<span class="token punctuation">"</span></span><span class="token punctuation">></span></span>
  <span class="token tag"><span class="token tag"><span class="token punctuation">&lt;</span>#text</span> <span class="token punctuation">/></span></span> <span class="token comment">&lt;!-- an empty text node, not visible to the user --></span>
  <span class="token tag"><span class="token tag"><span class="token punctuation">&lt;</span>div</span> <span class="token attr-name">id</span><span class="token attr-value"><span class="token punctuation">=</span><span class="token punctuation">"</span>b<span class="token punctuation">"</span></span><span class="token punctuation">></span></span><span class="token tag"><span class="token tag"><span class="token punctuation">&lt;/</span>div</span><span class="token punctuation">></span></span>
<span class="token tag"><span class="token tag"><span class="token punctuation">&lt;/</span>div</span><span class="token punctuation">></span></span></code>` + "";

	let t427;
	let p66;
	let t428;
	let code106;
	let t429;
	let t430;
	let code107;
	let t431;
	let t432;
	let code108;
	let t433;
	let t434;
	let code109;
	let t435;
	let t436;
	let t437;
	let pre26;

	let raw26_value = `<code class="language-html"><span class="token tag"><span class="token tag"><span class="token punctuation">&lt;</span>div</span> <span class="token attr-name">id</span><span class="token attr-value"><span class="token punctuation">=</span><span class="token punctuation">"</span>parent<span class="token punctuation">"</span></span><span class="token punctuation">></span></span>
  <span class="token tag"><span class="token tag"><span class="token punctuation">&lt;</span>div</span> <span class="token attr-name">id</span><span class="token attr-value"><span class="token punctuation">=</span><span class="token punctuation">"</span>a<span class="token punctuation">"</span></span><span class="token punctuation">></span></span><span class="token tag"><span class="token tag"><span class="token punctuation">&lt;/</span>div</span><span class="token punctuation">></span></span> <span class="token comment">&lt;!-- newly inserted element --></span>
  <span class="token tag"><span class="token tag"><span class="token punctuation">&lt;</span>#text</span> <span class="token punctuation">/></span></span> <span class="token comment">&lt;!-- an empty text node, not visible to the user --></span>
  <span class="token tag"><span class="token tag"><span class="token punctuation">&lt;</span>div</span> <span class="token attr-name">id</span><span class="token attr-value"><span class="token punctuation">=</span><span class="token punctuation">"</span>b<span class="token punctuation">"</span></span><span class="token punctuation">></span></span><span class="token tag"><span class="token tag"><span class="token punctuation">&lt;/</span>div</span><span class="token punctuation">></span></span>
<span class="token tag"><span class="token tag"><span class="token punctuation">&lt;/</span>div</span><span class="token punctuation">></span></span></code>` + "";

	let t438;
	let p67;
	let t439;
	let code110;
	let t440;
	let t441;
	let code111;
	let t442;
	let t443;
	let t444;
	let p68;
	let t445;
	let code112;
	let t446;
	let t447;
	let code113;
	let t448;
	let t449;
	let a23;
	let t450;
	let t451;
	let code114;
	let t452;
	let t453;
	let code115;
	let t454;
	let t455;
	let t456;
	let p69;
	let strong11;
	let t457;
	let code116;
	let t458;
	let t459;
	let t460;
	let p70;
	let t461;
	let code117;
	let t462;
	let t463;
	let t464;
	let pre27;

	let raw27_value = `<code class="language-svelte"><span class="token language-javascript"><span class="token punctuation">&#123;</span>#<span class="token keyword">if</span> condition<span class="token punctuation">&#125;</span></span>
  <span class="token tag"><span class="token tag"><span class="token punctuation">&lt;</span>div</span> <span class="token attr-name">id</span><span class="token attr-value"><span class="token punctuation">=</span><span class="token punctuation">"</span>a<span class="token punctuation">"</span></span> <span class="token punctuation">/></span></span>
<span class="token language-javascript"><span class="token punctuation">&#123;</span><span class="token operator">/</span><span class="token keyword">if</span><span class="token punctuation">&#125;</span></span>
<span class="token language-javascript"><span class="token punctuation">&#123;</span>#<span class="token keyword">if</span> condition2<span class="token punctuation">&#125;</span></span>
  <span class="token tag"><span class="token tag"><span class="token punctuation">&lt;</span>div</span> <span class="token attr-name">id</span><span class="token attr-value"><span class="token punctuation">=</span><span class="token punctuation">"</span>b<span class="token punctuation">"</span></span> <span class="token punctuation">/></span></span>
<span class="token language-javascript"><span class="token punctuation">&#123;</span><span class="token operator">/</span><span class="token keyword">if</span><span class="token punctuation">&#125;</span></span></code>` + "";

	let t465;
	let p71;
	let t466;
	let code118;
	let t467;
	let t468;
	let code119;
	let t469;
	let t470;
	let code120;
	let t471;
	let t472;
	let code121;
	let t473;
	let t474;
	let t475;
	let p72;
	let t476;
	let code122;
	let t477;
	let t478;
	let code123;
	let t479;
	let t480;
	let code124;
	let t481;
	let t482;
	let code125;
	let t483;
	let t484;
	let code126;
	let t485;
	let t486;
	let t487;
	let section7;
	let h23;
	let a24;
	let t488;
	let t489;
	let p73;
	let t490;
	let code127;
	let t491;
	let t492;
	let code128;
	let t493;
	let t494;
	let code129;
	let t495;
	let t496;
	let t497;
	let p74;
	let t498;
	let a25;
	let t499;
	let t500;
	let t501;
	let p75;
	let t502;
	let code130;
	let t503;
	let t504;

	return {
		c() {
			section0 = element("section");
			ul2 = element("ul");
			li0 = element("li");
			a0 = element("a");
			t0 = text("The  {#if}  block");
			li1 = element("li");
			a1 = element("a");
			t1 = text("The Vanilla JS");
			ul0 = element("ul");
			li2 = element("li");
			a2 = element("a");
			t2 = text("Implementating the if block");
			li3 = element("li");
			a3 = element("a");
			t3 = text("Refactor the code");
			li4 = element("li");
			a4 = element("a");
			t4 = text("The Compiled JS");
			ul1 = element("ul");
			li5 = element("li");
			a5 = element("a");
			t5 = text("The extra text node");
			li6 = element("li");
			a6 = element("a");
			t6 = text("Closing Note");
			t7 = space();
			p0 = element("p");
			strong0 = element("strong");
			t8 = text("⬅ ⬅ Previously in ");
			a7 = element("a");
			t9 = text("Part 3");
			t10 = text(".");
			t11 = space();
			p1 = element("p");
			t12 = text("In this article, we are going to cover our first logic block, the ");
			strong1 = element("strong");
			t13 = text("if block");
			t14 = text(".");
			t15 = space();
			p2 = element("p");
			t16 = text("To make sure we are on the same page, let's first explain how if block works.");
			t17 = space();
			section1 = element("section");
			h20 = element("h2");
			a8 = element("a");
			t18 = text("The ");
			code0 = element("code");
			t19 = text("{#if}");
			t20 = text(" block");
			t21 = space();
			p3 = element("p");
			t22 = text("To render content conditionally, you can wrap it with the ");
			code1 = element("code");
			t23 = text("{#if}");
			t24 = text(" block:");
			t25 = space();
			pre0 = element("pre");
			t26 = space();
			p4 = element("p");
			t27 = text("If the ");
			code2 = element("code");
			t28 = text("condition");
			t29 = text(" is truthy, you will see the ");
			code3 = element("code");
			t30 = text("<div>Conditionally rendered content</div>");
			t31 = text(", otherwise you will see nothing.");
			t32 = space();
			p5 = element("p");
			t33 = text("Like JavaScript, you can use ");
			code4 = element("code");
			t34 = text("else");
			t35 = text(" and ");
			code5 = element("code");
			t36 = text("else if");
			t37 = text(" in Svelte to test multiple conditions too:");
			t38 = space();
			pre1 = element("pre");
			t39 = space();
			p6 = element("p");
			t40 = text("You can visit Svelte's interactive tutorial to learn more about the ");
			a9 = element("a");
			code6 = element("code");
			t41 = text("{#if}");
			t42 = text(" logic block");
			t43 = text(".");
			t44 = space();
			section2 = element("section");
			h21 = element("h2");
			a10 = element("a");
			t45 = text("The Vanilla JS");
			t46 = space();
			p7 = element("p");
			t47 = text("So how do we implement an ");
			code7 = element("code");
			t48 = text("{#if}");
			t49 = text(" logic without any framework?");
			t50 = space();
			p8 = element("p");
			t51 = text("As ");
			a11 = element("a");
			t52 = text("mentioned in the Part 1 of the series");
			t53 = text(", we've seen how we can create elements without framework help.");
			t54 = space();
			section3 = element("section");
			h30 = element("h3");
			a12 = element("a");
			t55 = text("Implementating the if block");
			t56 = space();
			p9 = element("p");
			t57 = text("Implementing an ");
			code8 = element("code");
			t58 = text("{#if}");
			t59 = text(" logic block can be as follow:");
			t60 = space();
			pre2 = element("pre");
			t61 = space();
			p10 = element("p");
			t62 = text("The ");
			code9 = element("code");
			t63 = text("condition_a");
			t64 = text(" and ");
			code10 = element("code");
			t65 = text("condition_b");
			t66 = text(" could be dynamic, which means if the condition changed, we may need to call ");
			code11 = element("code");
			t67 = text("createIfBlock");
			t68 = text(" again.");
			t69 = space();
			p11 = element("p");
			t70 = text("But before that, we need to remove the elements that we created previously. This depends on which conditions were met previously, and which elements were created previously.");
			t71 = space();
			p12 = element("p");
			t72 = text("So, let's store that information in a variable:");
			t73 = space();
			pre3 = element("pre");
			t74 = space();
			p13 = element("p");
			t75 = text("So, ");
			strong2 = element("strong");
			t76 = text("if conditions changed");
			t77 = text(", we destroy the previously created elements, and create a new one:");
			t78 = space();
			pre4 = element("pre");
			t79 = space();
			p14 = element("p");
			t80 = text("However, if the condition does not change, but the content within the if block changes, for example, ");
			code12 = element("code");
			t81 = text("value_a");
			t82 = text(", ");
			code13 = element("code");
			t83 = text("value_b");
			t84 = text(" or ");
			code14 = element("code");
			t85 = text("value_else");
			t86 = text(" change in the following code:");
			t87 = space();
			pre5 = element("pre");
			t88 = space();
			p15 = element("p");
			t89 = text("Then we need to know how to update the elements as well:");
			t90 = space();
			pre6 = element("pre");
			t91 = space();
			p16 = element("p");
			t92 = text("Finally to destroy the elements if we want to unmount the whole ");
			code15 = element("code");
			t93 = text("{#if}");
			t94 = text(" block, we can use ");
			code16 = element("code");
			t95 = text("previousDestroy");
			t96 = text(", since it will be based on the conditions that the elements were created with:");
			t97 = space();
			pre7 = element("pre");
			t98 = space();
			p17 = element("p");
			t99 = text("Here we have ");
			code17 = element("code");
			t100 = text("createIfBlock");
			t101 = text(", ");
			code18 = element("code");
			t102 = text("updateIfBlock");
			t103 = text(" and ");
			code19 = element("code");
			t104 = text("destroyIfBlock");
			t105 = text(". It looks unwieldy, as the ");
			code20 = element("code");
			t106 = text("if (condition)");
			t107 = text(" logic is scattered across ");
			code21 = element("code");
			t108 = text("createIfBlock");
			t109 = text(", ");
			code22 = element("code");
			t110 = text("getPreviousDestroy");
			t111 = text(" and ");
			code23 = element("code");
			t112 = text("updateIfBlock");
			t113 = text(".");
			t114 = space();
			p18 = element("p");
			t115 = text("So, let's refactor this. Let's shift code around to make it cleaner. ✨");
			t116 = space();
			section4 = element("section");
			h31 = element("h3");
			a13 = element("a");
			t117 = text("Refactor the code");
			t118 = space();
			p19 = element("p");
			t119 = text("For each of the logic branch, we have functions to create, update and destroy its elements. For the first condition branch, we have:");
			t120 = space();
			ul3 = element("ul");
			li7 = element("li");
			code24 = element("code");
			t121 = text("createElementsIfConditionA");
			t122 = space();
			li8 = element("li");
			code25 = element("code");
			t123 = text("updateElementsIfConditionA");
			t124 = space();
			li9 = element("li");
			code26 = element("code");
			t125 = text("destroyElementsIfConditionA");
			t126 = space();
			p20 = element("p");
			t127 = text("It seems like we can employ some sort of ");
			a14 = element("a");
			t128 = text("Strategy Pattern");
			t129 = text(" over here.");
			t130 = space();
			p21 = element("p");
			t131 = text("We can group the operations for each condition branch together, where each operation has the same interface, ");
			code27 = element("code");
			t132 = text("{ create(){}, update(){}, destroy(){} }");
			t133 = text(" :");
			t134 = space();
			pre8 = element("pre");
			t135 = space();
			p22 = element("p");
			t136 = text("Now, we choose the operation based on the condition, since they have the same interface, they should be able to be used interchangeably:");
			t137 = space();
			pre9 = element("pre");
			t138 = space();
			p23 = element("p");
			t139 = text("Here, we can rewrite our ");
			code28 = element("code");
			t140 = text("createIfBlock");
			t141 = text(", ");
			code29 = element("code");
			t142 = text("updateIfBlock");
			t143 = text(" and ");
			code30 = element("code");
			t144 = text("destroyIfBlock");
			t145 = text(":");
			t146 = space();
			pre10 = element("pre");
			t147 = space();
			p24 = element("p");
			t148 = text("To determine whether the condition changed, we can compute the operation and compare it with the previous operation to see if it has changed.");
			t149 = space();
			section5 = element("section");
			h22 = element("h2");
			a15 = element("a");
			t150 = text("The Compiled JS");
			t151 = space();
			p25 = element("p");
			t152 = text("Now let's take look at how Svelte compiles ");
			code31 = element("code");
			t153 = text("{#if}");
			t154 = text(" into output JavaScript.");
			t155 = space();
			pre11 = element("pre");
			t156 = space();
			p26 = element("p");
			a16 = element("a");
			t157 = text("Svelte REPL");
			t158 = space();
			p27 = element("p");
			t159 = text("The output code:");
			t160 = space();
			details = element("details");
			summary = element("summary");
			t161 = text("Click to expand...");
			t162 = space();
			pre12 = element("pre");
			t163 = space();
			p28 = element("p");
			t164 = text("Some observations:");
			t165 = space();
			p29 = element("p");
			strong3 = element("strong");
			t166 = text("Observation 1: If you compare the Svelte's compiled output and the JS code we came out earlier, you may see some resemblance:");
			t167 = space();
			ul4 = element("ul");
			li10 = element("li");
			p30 = element("p");
			t168 = text("For each logic branch, we have a ");
			a17 = element("a");
			code32 = element("code");
			t169 = text("create_fragment");
			t170 = text(" function");
			t171 = text(", which in this case is ");
			code33 = element("code");
			t172 = text("create_else_block");
			t173 = text(" and ");
			code34 = element("code");
			t174 = text("create_if_block");
			t175 = text(". As explain in the previous article, these functions return an ");
			em = element("em");
			t176 = text("instruction manual");
			t177 = text(" on how to build the DOM fragment for each logic branch.");
			t178 = space();
			p31 = element("p");
			t179 = text("This is similar to the operations we discussed earlier, eg: ");
			code35 = element("code");
			t180 = text("operationConditionA");
			t181 = text(", ");
			code36 = element("code");
			t182 = text("operationConditionB");
			t183 = text(" and ");
			code37 = element("code");
			t184 = text("operationConditionElse");
			t185 = text(".");
			t186 = space();
			li11 = element("li");
			p32 = element("p");
			t187 = text("To determine which ");
			code38 = element("code");
			t188 = text("create_fragment");
			t189 = text(" function to use, we have the ");
			code39 = element("code");
			t190 = text("select_block_type");
			t191 = text(" function.");
			t192 = space();
			p33 = element("p");
			t193 = text("This is similar to the ");
			code40 = element("code");
			t194 = text("getOperation");
			t195 = text(" we discussed earlier.");
			t196 = space();
			li12 = element("li");
			p34 = element("p");
			t197 = text("We then initialise the fragment for the current condition branch,");
			t198 = space();
			pre13 = element("pre");
			t199 = space();
			ul6 = element("ul");
			li17 = element("li");
			p35 = element("p");
			t200 = text("Now we can:");
			t201 = space();
			ul5 = element("ul");
			li13 = element("li");
			t202 = text("create ");
			code41 = element("code");
			t203 = text("if_block.c()");
			t204 = space();
			li14 = element("li");
			t205 = text("mount ");
			code42 = element("code");
			t206 = text("if_block.m(target, anchor)");
			t207 = space();
			li15 = element("li");
			t208 = text("update ");
			code43 = element("code");
			t209 = text("if_block.p(ctx, dirty)");
			t210 = space();
			li16 = element("li");
			t211 = text("destroy ");
			code44 = element("code");
			t212 = text("if_block.d(detaching)");
			t213 = space();
			p36 = element("p");
			t214 = text("elements for the ");
			code45 = element("code");
			t215 = text("{#if}");
			t216 = text(" block.");
			t217 = space();
			li18 = element("li");
			p37 = element("p");
			t218 = text("In the ");
			code46 = element("code");
			t219 = text("p");
			t220 = space();
			strong4 = element("strong");
			t221 = text("(u_p_date)");
			t222 = text(" method, we check if the ");
			code47 = element("code");
			t223 = text("current_block_type");
			t224 = text(" has changed, if not, then we call ");
			code48 = element("code");
			t225 = text("if_block.p(ctx, dirty)");
			t226 = text(" to update as necessary.");
			t227 = space();
			p38 = element("p");
			t228 = text("If there's change, then we destroy ");
			code49 = element("code");
			t229 = text("if_block.d(1)");
			t230 = text(" the previous elements, create a new fragment based on the ");
			code50 = element("code");
			t231 = text("current_block_type");
			t232 = text(", then create and mount the elements via ");
			code51 = element("code");
			t233 = text("if_block.c()");
			t234 = text(" and ");
			code52 = element("code");
			t235 = text("if_block.m(...)");
			t236 = text(".");
			t237 = space();
			p39 = element("p");
			t238 = text("This is similar to how we call ");
			code53 = element("code");
			t239 = text("previousOperation.destroy()");
			t240 = text(" and ");
			code54 = element("code");
			t241 = text("currentOperation.create()");
			t242 = text("  or ");
			code55 = element("code");
			t243 = text("currentOperation.update()");
			t244 = text(".");
			t245 = space();
			p40 = element("p");
			strong5 = element("strong");
			t246 = text("Observation 2: There's a ");
			code56 = element("code");
			t247 = text("if_block_anchor");
			t248 = text(" inserted after the ");
			code57 = element("code");
			t249 = text("if_block");
			t250 = space();
			pre14 = element("pre");
			t251 = space();
			p41 = element("p");
			code58 = element("code");
			t252 = text("empty()");
			t253 = text(" creates an empty text node.");
			t254 = space();
			pre15 = element("pre");
			t255 = space();
			p42 = element("p");
			t256 = text("The ");
			code59 = element("code");
			t257 = text("if_block_anchor");
			t258 = text(" is then used when mounting the ");
			code60 = element("code");
			t259 = text("if_block");
			t260 = text(" in the ");
			strong6 = element("strong");
			t261 = text("u_p_date");
			t262 = text(" method.");
			t263 = space();
			pre16 = element("pre");
			t264 = space();
			p43 = element("p");
			t265 = text("So what is this extra empty text node for?");
			t266 = space();
			section6 = element("section");
			h32 = element("h3");
			a18 = element("a");
			t267 = text("The extra text node");
			t268 = space();
			p44 = element("p");
			t269 = text("When we update the ");
			code61 = element("code");
			t270 = text("{#if}");
			t271 = text(" block and notice that we need to change the fragment block type, we need to destroy the elements created previously, and insert newly created elements.");
			t272 = space();
			p45 = element("p");
			t273 = text("When we insert the new elements, we need to know where to insert them. The ");
			a19 = element("a");
			code62 = element("code");
			t274 = text("insertBefore");
			t275 = text(" API allow us to specify which node the elements should be inserted before. So now it begs the question, which node?");
			t276 = space();
			p46 = element("p");
			t277 = text("The answer depends on the position ");
			code63 = element("code");
			t278 = text("{#if}");
			t279 = text(" block is written in the component. There are 4 possible scenarios:");
			t280 = space();
			p47 = element("p");
			strong7 = element("strong");
			t281 = text("1. There's an element right after the ");
			code64 = element("code");
			t282 = text("{#if}");
			t283 = text(" block");
			t284 = space();
			pre17 = element("pre");
			t285 = space();
			p48 = element("p");
			a20 = element("a");
			t286 = text("Svelte REPL");
			t287 = space();
			p49 = element("p");
			t288 = text("You'll see that");
			t289 = space();
			ul7 = element("ul");
			li19 = element("li");
			t290 = text("Svelte does not create the extra text node");
			t291 = space();
			li20 = element("li");
			t292 = text("Instead, Svelte uses the ");
			code65 = element("code");
			t293 = text("<span />");
			t294 = text(" node instead");
			t295 = space();
			pre18 = element("pre");
			t296 = space();
			blockquote0 = element("blockquote");
			p50 = element("p");
			t297 = text("When the ");
			code66 = element("code");
			t298 = text("{#if}");
			t299 = text(" condition changes, ");
			code67 = element("code");
			t300 = text("{#if}");
			t301 = text(" block will replace and insert new elements before the ");
			code68 = element("code");
			t302 = text("<span />");
			t303 = text(" element.");
			t304 = space();
			p51 = element("p");
			strong8 = element("strong");
			t305 = text("2. ");
			code69 = element("code");
			t306 = text("{#if}");
			t307 = text(" block is the last child, ");
			code70 = element("code");
			t308 = text("{#if}");
			t309 = text(" block has a parent");
			t310 = space();
			pre19 = element("pre");
			t311 = space();
			p52 = element("p");
			a21 = element("a");
			t312 = text("Svelte REPL");
			t313 = space();
			p53 = element("p");
			t314 = text("You'll see that");
			t315 = space();
			ul8 = element("ul");
			li21 = element("li");
			t316 = text("Svelte does not create the extra text node");
			t317 = space();
			li22 = element("li");
			t318 = text("Instead, Svelte inserts the ");
			code71 = element("code");
			t319 = text("{#if}");
			t320 = text(" block into the parent node, ");
			code72 = element("code");
			t321 = text("<div />");
			t322 = text(" and insert before ");
			code73 = element("code");
			t323 = text("null");
			t324 = text(". (If you pass ");
			code74 = element("code");
			t325 = text("null");
			t326 = text(" to ");
			code75 = element("code");
			t327 = text("insertBefore");
			t328 = text(", it will append the element as the last child)");
			t329 = space();
			pre20 = element("pre");
			t330 = space();
			blockquote1 = element("blockquote");
			p54 = element("p");
			t331 = text("When the ");
			code76 = element("code");
			t332 = text("{#if}");
			t333 = text(" condition changes, ");
			code77 = element("code");
			t334 = text("{#if}");
			t335 = text(" block will replace and insert new elements as the last children of the parent ");
			code78 = element("code");
			t336 = text("<div />");
			t337 = text(" element.");
			t338 = space();
			p55 = element("p");
			strong9 = element("strong");
			t339 = text("3. ");
			code79 = element("code");
			t340 = text("{#if}");
			t341 = text(" block is the last child, ");
			code80 = element("code");
			t342 = text("{#if}");
			t343 = text(" block does not have a parent");
			t344 = space();
			pre21 = element("pre");
			t345 = space();
			p56 = element("p");
			a22 = element("a");
			t346 = text("Svelte REPL");
			t347 = space();
			p57 = element("p");
			t348 = text("You'll see that");
			t349 = space();
			ul9 = element("ul");
			li23 = element("li");
			t350 = text("Svelte creates an extra ");
			code81 = element("code");
			t351 = text("anchor");
			t352 = text(" element");
			t353 = space();
			li24 = element("li");
			t354 = text("The ");
			code82 = element("code");
			t355 = text("anchor");
			t356 = text(" element is inserted after the ");
			code83 = element("code");
			t357 = text("{#if}");
			t358 = text(" block.");
			t359 = space();
			li25 = element("li");
			t360 = text("Subsequently in the ");
			strong10 = element("strong");
			t361 = text("u_p_date");
			t362 = text(" function, Svelte insert ");
			code84 = element("code");
			t363 = text("{#if}");
			t364 = text(" block before the ");
			code85 = element("code");
			t365 = text("anchor");
			t366 = text(" element.");
			t367 = space();
			pre22 = element("pre");
			t368 = space();
			blockquote2 = element("blockquote");
			p58 = element("p");
			t369 = text("When the ");
			code86 = element("code");
			t370 = text("{#if}");
			t371 = text(" condition changes, ");
			code87 = element("code");
			t372 = text("{#if}");
			t373 = text(" block will replace and insert new elements before the ");
			code88 = element("code");
			t374 = text("anchor");
			t375 = text(" element.");
			t376 = space();
			p59 = element("p");
			t377 = text("But why?");
			t378 = space();
			p60 = element("p");
			t379 = text("This is because a Svelte component can be used in anywhere.");
			t380 = space();
			p61 = element("p");
			t381 = text("Let's take a look at the scenario below:");
			t382 = space();
			pre23 = element("pre");
			t383 = space();
			p62 = element("p");
			t384 = text("In the ");
			code89 = element("code");
			t385 = text("A.svelte");
			t386 = text(", the ");
			code90 = element("code");
			t387 = text("{#if}");
			t388 = text(" block is the last child, it does not have any sibling elements after it.");
			t389 = space();
			p63 = element("p");
			t390 = text("Let's first assume we don't have the ");
			code91 = element("code");
			t391 = text("anchor");
			t392 = text(" element. When the ");
			code92 = element("code");
			t393 = text("condition");
			t394 = text(" changes from ");
			code93 = element("code");
			t395 = text("false");
			t396 = text(" to ");
			code94 = element("code");
			t397 = text("true");
			t398 = text(", Svelte will have to insert the new element ");
			code95 = element("code");
			t399 = text("<div id=\"a\">");
			t400 = text(" into its parent. And because there's no next element after ");
			code96 = element("code");
			t401 = text("{#if}");
			t402 = text(" block, and no ");
			code97 = element("code");
			t403 = text("anchor");
			t404 = text(" element, we will have to insert before ");
			code98 = element("code");
			t405 = text("null");
			t406 = text(". In which, the ");
			code99 = element("code");
			t407 = text("<div id=\"a\" />");
			t408 = text(" will be inserted as the last child of the parent element, ");
			code100 = element("code");
			t409 = text("<div id=\"parent\">");
			t410 = text(". And hey, we got ourselves a bug! Elements inside ");
			code101 = element("code");
			t411 = text("<A />");
			t412 = text(" appears after ");
			code102 = element("code");
			t413 = text("<B />");
			t414 = text("!");
			t415 = space();
			pre24 = element("pre");
			t416 = space();
			p64 = element("p");
			t417 = text("We can prevent this from happening by adding an ");
			code103 = element("code");
			t418 = text("anchor");
			t419 = text(" element.");
			t420 = space();
			p65 = element("p");
			t421 = text("When the ");
			code104 = element("code");
			t422 = text("condition");
			t423 = text(" is ");
			code105 = element("code");
			t424 = text("false");
			t425 = text(", our DOM looks like this:");
			t426 = space();
			pre25 = element("pre");
			t427 = space();
			p66 = element("p");
			t428 = text("And when the ");
			code106 = element("code");
			t429 = text("condition");
			t430 = text(" turns ");
			code107 = element("code");
			t431 = text("true");
			t432 = text(", we insert ");
			code108 = element("code");
			t433 = text("<div id=\"a\" />");
			t434 = text(" before the ");
			code109 = element("code");
			t435 = text("anchor");
			t436 = text(" element:");
			t437 = space();
			pre26 = element("pre");
			t438 = space();
			p67 = element("p");
			t439 = text("Yay, we maintain the order of ");
			code110 = element("code");
			t440 = text("<A />");
			t441 = text(" and ");
			code111 = element("code");
			t442 = text("<B />");
			t443 = text(" 🎉 !");
			t444 = space();
			p68 = element("p");
			t445 = text("The ");
			code112 = element("code");
			t446 = text("anchor");
			t447 = text(" element to the ");
			code113 = element("code");
			t448 = text("{#if}");
			t449 = text(" block, is like ");
			a23 = element("a");
			t450 = text("an anchor to a ship");
			t451 = text(", \"Here is where ");
			code114 = element("code");
			t452 = text("{#if}");
			t453 = text(" block should ");
			code115 = element("code");
			t454 = text("insertBefore()");
			t455 = text(" !\"");
			t456 = space();
			p69 = element("p");
			strong11 = element("strong");
			t457 = text("4. ");
			code116 = element("code");
			t458 = text("{#if}");
			t459 = text(" block followed by another logic block");
			t460 = space();
			p70 = element("p");
			t461 = text("The final scenario. ");
			code117 = element("code");
			t462 = text("{#if}");
			t463 = text(" block followed by another logic block:");
			t464 = space();
			pre27 = element("pre");
			t465 = space();
			p71 = element("p");
			t466 = text("The 2nd ");
			code118 = element("code");
			t467 = text("{#if}");
			t468 = text(" block condition could be ");
			code119 = element("code");
			t469 = text("true");
			t470 = text(" or ");
			code120 = element("code");
			t471 = text("false");
			t472 = text(". Which means ");
			code121 = element("code");
			t473 = text("<div id=\"b\" />");
			t474 = text(" could be there or not there.");
			t475 = space();
			p72 = element("p");
			t476 = text("So, to know where we should insert ");
			code122 = element("code");
			t477 = text("<div id=\"a\" />");
			t478 = text(" when chaging the ");
			code123 = element("code");
			t479 = text("condition");
			t480 = text(", we need an ");
			code124 = element("code");
			t481 = text("anchor");
			t482 = text(" element after the 1st ");
			code125 = element("code");
			t483 = text("{#if}");
			t484 = text(" block, before the 2nd ");
			code126 = element("code");
			t485 = text("{#if}");
			t486 = text(" block.");
			t487 = space();
			section7 = element("section");
			h23 = element("h2");
			a24 = element("a");
			t488 = text("Closing Note");
			t489 = space();
			p73 = element("p");
			t490 = text("We've covered how Svelte compiles an ");
			code127 = element("code");
			t491 = text("{#if}");
			t492 = text(" block, as well as how and why an ");
			code128 = element("code");
			t493 = text("anchor");
			t494 = text(" element is needed for the ");
			code129 = element("code");
			t495 = text("{#if}");
			t496 = text(" block.");
			t497 = space();
			p74 = element("p");
			t498 = text("If you wish to learn more about Svelte, ");
			a25 = element("a");
			t499 = text("follow me on Twitter");
			t500 = text(".");
			t501 = space();
			p75 = element("p");
			t502 = text("I'll post it on Twitter when the next part is ready, the next post will be about ");
			code130 = element("code");
			t503 = text("{#each}");
			t504 = text(" logic block.");
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
			t0 = claim_text(a0_nodes, "The  {#if}  block");
			a0_nodes.forEach(detach);
			li0_nodes.forEach(detach);
			li1 = claim_element(ul2_nodes, "LI", {});
			var li1_nodes = children(li1);
			a1 = claim_element(li1_nodes, "A", { href: true });
			var a1_nodes = children(a1);
			t1 = claim_text(a1_nodes, "The Vanilla JS");
			a1_nodes.forEach(detach);
			li1_nodes.forEach(detach);
			ul0 = claim_element(ul2_nodes, "UL", {});
			var ul0_nodes = children(ul0);
			li2 = claim_element(ul0_nodes, "LI", {});
			var li2_nodes = children(li2);
			a2 = claim_element(li2_nodes, "A", { href: true });
			var a2_nodes = children(a2);
			t2 = claim_text(a2_nodes, "Implementating the if block");
			a2_nodes.forEach(detach);
			li2_nodes.forEach(detach);
			li3 = claim_element(ul0_nodes, "LI", {});
			var li3_nodes = children(li3);
			a3 = claim_element(li3_nodes, "A", { href: true });
			var a3_nodes = children(a3);
			t3 = claim_text(a3_nodes, "Refactor the code");
			a3_nodes.forEach(detach);
			li3_nodes.forEach(detach);
			ul0_nodes.forEach(detach);
			li4 = claim_element(ul2_nodes, "LI", {});
			var li4_nodes = children(li4);
			a4 = claim_element(li4_nodes, "A", { href: true });
			var a4_nodes = children(a4);
			t4 = claim_text(a4_nodes, "The Compiled JS");
			a4_nodes.forEach(detach);
			li4_nodes.forEach(detach);
			ul1 = claim_element(ul2_nodes, "UL", {});
			var ul1_nodes = children(ul1);
			li5 = claim_element(ul1_nodes, "LI", {});
			var li5_nodes = children(li5);
			a5 = claim_element(li5_nodes, "A", { href: true });
			var a5_nodes = children(a5);
			t5 = claim_text(a5_nodes, "The extra text node");
			a5_nodes.forEach(detach);
			li5_nodes.forEach(detach);
			ul1_nodes.forEach(detach);
			li6 = claim_element(ul2_nodes, "LI", {});
			var li6_nodes = children(li6);
			a6 = claim_element(li6_nodes, "A", { href: true });
			var a6_nodes = children(a6);
			t6 = claim_text(a6_nodes, "Closing Note");
			a6_nodes.forEach(detach);
			li6_nodes.forEach(detach);
			ul2_nodes.forEach(detach);
			section0_nodes.forEach(detach);
			t7 = claim_space(nodes);
			p0 = claim_element(nodes, "P", {});
			var p0_nodes = children(p0);
			strong0 = claim_element(p0_nodes, "STRONG", {});
			var strong0_nodes = children(strong0);
			t8 = claim_text(strong0_nodes, "⬅ ⬅ Previously in ");
			a7 = claim_element(strong0_nodes, "A", { href: true });
			var a7_nodes = children(a7);
			t9 = claim_text(a7_nodes, "Part 3");
			a7_nodes.forEach(detach);
			t10 = claim_text(strong0_nodes, ".");
			strong0_nodes.forEach(detach);
			p0_nodes.forEach(detach);
			t11 = claim_space(nodes);
			p1 = claim_element(nodes, "P", {});
			var p1_nodes = children(p1);
			t12 = claim_text(p1_nodes, "In this article, we are going to cover our first logic block, the ");
			strong1 = claim_element(p1_nodes, "STRONG", {});
			var strong1_nodes = children(strong1);
			t13 = claim_text(strong1_nodes, "if block");
			strong1_nodes.forEach(detach);
			t14 = claim_text(p1_nodes, ".");
			p1_nodes.forEach(detach);
			t15 = claim_space(nodes);
			p2 = claim_element(nodes, "P", {});
			var p2_nodes = children(p2);
			t16 = claim_text(p2_nodes, "To make sure we are on the same page, let's first explain how if block works.");
			p2_nodes.forEach(detach);
			t17 = claim_space(nodes);
			section1 = claim_element(nodes, "SECTION", {});
			var section1_nodes = children(section1);
			h20 = claim_element(section1_nodes, "H2", {});
			var h20_nodes = children(h20);
			a8 = claim_element(h20_nodes, "A", { href: true, id: true });
			var a8_nodes = children(a8);
			t18 = claim_text(a8_nodes, "The ");
			code0 = claim_element(a8_nodes, "CODE", {});
			var code0_nodes = children(code0);
			t19 = claim_text(code0_nodes, "{#if}");
			code0_nodes.forEach(detach);
			t20 = claim_text(a8_nodes, " block");
			a8_nodes.forEach(detach);
			h20_nodes.forEach(detach);
			t21 = claim_space(section1_nodes);
			p3 = claim_element(section1_nodes, "P", {});
			var p3_nodes = children(p3);
			t22 = claim_text(p3_nodes, "To render content conditionally, you can wrap it with the ");
			code1 = claim_element(p3_nodes, "CODE", {});
			var code1_nodes = children(code1);
			t23 = claim_text(code1_nodes, "{#if}");
			code1_nodes.forEach(detach);
			t24 = claim_text(p3_nodes, " block:");
			p3_nodes.forEach(detach);
			t25 = claim_space(section1_nodes);
			pre0 = claim_element(section1_nodes, "PRE", { class: true });
			var pre0_nodes = children(pre0);
			pre0_nodes.forEach(detach);
			t26 = claim_space(section1_nodes);
			p4 = claim_element(section1_nodes, "P", {});
			var p4_nodes = children(p4);
			t27 = claim_text(p4_nodes, "If the ");
			code2 = claim_element(p4_nodes, "CODE", {});
			var code2_nodes = children(code2);
			t28 = claim_text(code2_nodes, "condition");
			code2_nodes.forEach(detach);
			t29 = claim_text(p4_nodes, " is truthy, you will see the ");
			code3 = claim_element(p4_nodes, "CODE", {});
			var code3_nodes = children(code3);
			t30 = claim_text(code3_nodes, "<div>Conditionally rendered content</div>");
			code3_nodes.forEach(detach);
			t31 = claim_text(p4_nodes, ", otherwise you will see nothing.");
			p4_nodes.forEach(detach);
			t32 = claim_space(section1_nodes);
			p5 = claim_element(section1_nodes, "P", {});
			var p5_nodes = children(p5);
			t33 = claim_text(p5_nodes, "Like JavaScript, you can use ");
			code4 = claim_element(p5_nodes, "CODE", {});
			var code4_nodes = children(code4);
			t34 = claim_text(code4_nodes, "else");
			code4_nodes.forEach(detach);
			t35 = claim_text(p5_nodes, " and ");
			code5 = claim_element(p5_nodes, "CODE", {});
			var code5_nodes = children(code5);
			t36 = claim_text(code5_nodes, "else if");
			code5_nodes.forEach(detach);
			t37 = claim_text(p5_nodes, " in Svelte to test multiple conditions too:");
			p5_nodes.forEach(detach);
			t38 = claim_space(section1_nodes);
			pre1 = claim_element(section1_nodes, "PRE", { class: true });
			var pre1_nodes = children(pre1);
			pre1_nodes.forEach(detach);
			t39 = claim_space(section1_nodes);
			p6 = claim_element(section1_nodes, "P", {});
			var p6_nodes = children(p6);
			t40 = claim_text(p6_nodes, "You can visit Svelte's interactive tutorial to learn more about the ");
			a9 = claim_element(p6_nodes, "A", { href: true, rel: true });
			var a9_nodes = children(a9);
			code6 = claim_element(a9_nodes, "CODE", {});
			var code6_nodes = children(code6);
			t41 = claim_text(code6_nodes, "{#if}");
			code6_nodes.forEach(detach);
			t42 = claim_text(a9_nodes, " logic block");
			a9_nodes.forEach(detach);
			t43 = claim_text(p6_nodes, ".");
			p6_nodes.forEach(detach);
			section1_nodes.forEach(detach);
			t44 = claim_space(nodes);
			section2 = claim_element(nodes, "SECTION", {});
			var section2_nodes = children(section2);
			h21 = claim_element(section2_nodes, "H2", {});
			var h21_nodes = children(h21);
			a10 = claim_element(h21_nodes, "A", { href: true, id: true });
			var a10_nodes = children(a10);
			t45 = claim_text(a10_nodes, "The Vanilla JS");
			a10_nodes.forEach(detach);
			h21_nodes.forEach(detach);
			t46 = claim_space(section2_nodes);
			p7 = claim_element(section2_nodes, "P", {});
			var p7_nodes = children(p7);
			t47 = claim_text(p7_nodes, "So how do we implement an ");
			code7 = claim_element(p7_nodes, "CODE", {});
			var code7_nodes = children(code7);
			t48 = claim_text(code7_nodes, "{#if}");
			code7_nodes.forEach(detach);
			t49 = claim_text(p7_nodes, " logic without any framework?");
			p7_nodes.forEach(detach);
			t50 = claim_space(section2_nodes);
			p8 = claim_element(section2_nodes, "P", {});
			var p8_nodes = children(p8);
			t51 = claim_text(p8_nodes, "As ");
			a11 = claim_element(p8_nodes, "A", { href: true });
			var a11_nodes = children(a11);
			t52 = claim_text(a11_nodes, "mentioned in the Part 1 of the series");
			a11_nodes.forEach(detach);
			t53 = claim_text(p8_nodes, ", we've seen how we can create elements without framework help.");
			p8_nodes.forEach(detach);
			section2_nodes.forEach(detach);
			t54 = claim_space(nodes);
			section3 = claim_element(nodes, "SECTION", {});
			var section3_nodes = children(section3);
			h30 = claim_element(section3_nodes, "H3", {});
			var h30_nodes = children(h30);
			a12 = claim_element(h30_nodes, "A", { href: true, id: true });
			var a12_nodes = children(a12);
			t55 = claim_text(a12_nodes, "Implementating the if block");
			a12_nodes.forEach(detach);
			h30_nodes.forEach(detach);
			t56 = claim_space(section3_nodes);
			p9 = claim_element(section3_nodes, "P", {});
			var p9_nodes = children(p9);
			t57 = claim_text(p9_nodes, "Implementing an ");
			code8 = claim_element(p9_nodes, "CODE", {});
			var code8_nodes = children(code8);
			t58 = claim_text(code8_nodes, "{#if}");
			code8_nodes.forEach(detach);
			t59 = claim_text(p9_nodes, " logic block can be as follow:");
			p9_nodes.forEach(detach);
			t60 = claim_space(section3_nodes);
			pre2 = claim_element(section3_nodes, "PRE", { class: true });
			var pre2_nodes = children(pre2);
			pre2_nodes.forEach(detach);
			t61 = claim_space(section3_nodes);
			p10 = claim_element(section3_nodes, "P", {});
			var p10_nodes = children(p10);
			t62 = claim_text(p10_nodes, "The ");
			code9 = claim_element(p10_nodes, "CODE", {});
			var code9_nodes = children(code9);
			t63 = claim_text(code9_nodes, "condition_a");
			code9_nodes.forEach(detach);
			t64 = claim_text(p10_nodes, " and ");
			code10 = claim_element(p10_nodes, "CODE", {});
			var code10_nodes = children(code10);
			t65 = claim_text(code10_nodes, "condition_b");
			code10_nodes.forEach(detach);
			t66 = claim_text(p10_nodes, " could be dynamic, which means if the condition changed, we may need to call ");
			code11 = claim_element(p10_nodes, "CODE", {});
			var code11_nodes = children(code11);
			t67 = claim_text(code11_nodes, "createIfBlock");
			code11_nodes.forEach(detach);
			t68 = claim_text(p10_nodes, " again.");
			p10_nodes.forEach(detach);
			t69 = claim_space(section3_nodes);
			p11 = claim_element(section3_nodes, "P", {});
			var p11_nodes = children(p11);
			t70 = claim_text(p11_nodes, "But before that, we need to remove the elements that we created previously. This depends on which conditions were met previously, and which elements were created previously.");
			p11_nodes.forEach(detach);
			t71 = claim_space(section3_nodes);
			p12 = claim_element(section3_nodes, "P", {});
			var p12_nodes = children(p12);
			t72 = claim_text(p12_nodes, "So, let's store that information in a variable:");
			p12_nodes.forEach(detach);
			t73 = claim_space(section3_nodes);
			pre3 = claim_element(section3_nodes, "PRE", { class: true });
			var pre3_nodes = children(pre3);
			pre3_nodes.forEach(detach);
			t74 = claim_space(section3_nodes);
			p13 = claim_element(section3_nodes, "P", {});
			var p13_nodes = children(p13);
			t75 = claim_text(p13_nodes, "So, ");
			strong2 = claim_element(p13_nodes, "STRONG", {});
			var strong2_nodes = children(strong2);
			t76 = claim_text(strong2_nodes, "if conditions changed");
			strong2_nodes.forEach(detach);
			t77 = claim_text(p13_nodes, ", we destroy the previously created elements, and create a new one:");
			p13_nodes.forEach(detach);
			t78 = claim_space(section3_nodes);
			pre4 = claim_element(section3_nodes, "PRE", { class: true });
			var pre4_nodes = children(pre4);
			pre4_nodes.forEach(detach);
			t79 = claim_space(section3_nodes);
			p14 = claim_element(section3_nodes, "P", {});
			var p14_nodes = children(p14);
			t80 = claim_text(p14_nodes, "However, if the condition does not change, but the content within the if block changes, for example, ");
			code12 = claim_element(p14_nodes, "CODE", {});
			var code12_nodes = children(code12);
			t81 = claim_text(code12_nodes, "value_a");
			code12_nodes.forEach(detach);
			t82 = claim_text(p14_nodes, ", ");
			code13 = claim_element(p14_nodes, "CODE", {});
			var code13_nodes = children(code13);
			t83 = claim_text(code13_nodes, "value_b");
			code13_nodes.forEach(detach);
			t84 = claim_text(p14_nodes, " or ");
			code14 = claim_element(p14_nodes, "CODE", {});
			var code14_nodes = children(code14);
			t85 = claim_text(code14_nodes, "value_else");
			code14_nodes.forEach(detach);
			t86 = claim_text(p14_nodes, " change in the following code:");
			p14_nodes.forEach(detach);
			t87 = claim_space(section3_nodes);
			pre5 = claim_element(section3_nodes, "PRE", { class: true });
			var pre5_nodes = children(pre5);
			pre5_nodes.forEach(detach);
			t88 = claim_space(section3_nodes);
			p15 = claim_element(section3_nodes, "P", {});
			var p15_nodes = children(p15);
			t89 = claim_text(p15_nodes, "Then we need to know how to update the elements as well:");
			p15_nodes.forEach(detach);
			t90 = claim_space(section3_nodes);
			pre6 = claim_element(section3_nodes, "PRE", { class: true });
			var pre6_nodes = children(pre6);
			pre6_nodes.forEach(detach);
			t91 = claim_space(section3_nodes);
			p16 = claim_element(section3_nodes, "P", {});
			var p16_nodes = children(p16);
			t92 = claim_text(p16_nodes, "Finally to destroy the elements if we want to unmount the whole ");
			code15 = claim_element(p16_nodes, "CODE", {});
			var code15_nodes = children(code15);
			t93 = claim_text(code15_nodes, "{#if}");
			code15_nodes.forEach(detach);
			t94 = claim_text(p16_nodes, " block, we can use ");
			code16 = claim_element(p16_nodes, "CODE", {});
			var code16_nodes = children(code16);
			t95 = claim_text(code16_nodes, "previousDestroy");
			code16_nodes.forEach(detach);
			t96 = claim_text(p16_nodes, ", since it will be based on the conditions that the elements were created with:");
			p16_nodes.forEach(detach);
			t97 = claim_space(section3_nodes);
			pre7 = claim_element(section3_nodes, "PRE", { class: true });
			var pre7_nodes = children(pre7);
			pre7_nodes.forEach(detach);
			t98 = claim_space(section3_nodes);
			p17 = claim_element(section3_nodes, "P", {});
			var p17_nodes = children(p17);
			t99 = claim_text(p17_nodes, "Here we have ");
			code17 = claim_element(p17_nodes, "CODE", {});
			var code17_nodes = children(code17);
			t100 = claim_text(code17_nodes, "createIfBlock");
			code17_nodes.forEach(detach);
			t101 = claim_text(p17_nodes, ", ");
			code18 = claim_element(p17_nodes, "CODE", {});
			var code18_nodes = children(code18);
			t102 = claim_text(code18_nodes, "updateIfBlock");
			code18_nodes.forEach(detach);
			t103 = claim_text(p17_nodes, " and ");
			code19 = claim_element(p17_nodes, "CODE", {});
			var code19_nodes = children(code19);
			t104 = claim_text(code19_nodes, "destroyIfBlock");
			code19_nodes.forEach(detach);
			t105 = claim_text(p17_nodes, ". It looks unwieldy, as the ");
			code20 = claim_element(p17_nodes, "CODE", {});
			var code20_nodes = children(code20);
			t106 = claim_text(code20_nodes, "if (condition)");
			code20_nodes.forEach(detach);
			t107 = claim_text(p17_nodes, " logic is scattered across ");
			code21 = claim_element(p17_nodes, "CODE", {});
			var code21_nodes = children(code21);
			t108 = claim_text(code21_nodes, "createIfBlock");
			code21_nodes.forEach(detach);
			t109 = claim_text(p17_nodes, ", ");
			code22 = claim_element(p17_nodes, "CODE", {});
			var code22_nodes = children(code22);
			t110 = claim_text(code22_nodes, "getPreviousDestroy");
			code22_nodes.forEach(detach);
			t111 = claim_text(p17_nodes, " and ");
			code23 = claim_element(p17_nodes, "CODE", {});
			var code23_nodes = children(code23);
			t112 = claim_text(code23_nodes, "updateIfBlock");
			code23_nodes.forEach(detach);
			t113 = claim_text(p17_nodes, ".");
			p17_nodes.forEach(detach);
			t114 = claim_space(section3_nodes);
			p18 = claim_element(section3_nodes, "P", {});
			var p18_nodes = children(p18);
			t115 = claim_text(p18_nodes, "So, let's refactor this. Let's shift code around to make it cleaner. ✨");
			p18_nodes.forEach(detach);
			section3_nodes.forEach(detach);
			t116 = claim_space(nodes);
			section4 = claim_element(nodes, "SECTION", {});
			var section4_nodes = children(section4);
			h31 = claim_element(section4_nodes, "H3", {});
			var h31_nodes = children(h31);
			a13 = claim_element(h31_nodes, "A", { href: true, id: true });
			var a13_nodes = children(a13);
			t117 = claim_text(a13_nodes, "Refactor the code");
			a13_nodes.forEach(detach);
			h31_nodes.forEach(detach);
			t118 = claim_space(section4_nodes);
			p19 = claim_element(section4_nodes, "P", {});
			var p19_nodes = children(p19);
			t119 = claim_text(p19_nodes, "For each of the logic branch, we have functions to create, update and destroy its elements. For the first condition branch, we have:");
			p19_nodes.forEach(detach);
			t120 = claim_space(section4_nodes);
			ul3 = claim_element(section4_nodes, "UL", {});
			var ul3_nodes = children(ul3);
			li7 = claim_element(ul3_nodes, "LI", {});
			var li7_nodes = children(li7);
			code24 = claim_element(li7_nodes, "CODE", {});
			var code24_nodes = children(code24);
			t121 = claim_text(code24_nodes, "createElementsIfConditionA");
			code24_nodes.forEach(detach);
			li7_nodes.forEach(detach);
			t122 = claim_space(ul3_nodes);
			li8 = claim_element(ul3_nodes, "LI", {});
			var li8_nodes = children(li8);
			code25 = claim_element(li8_nodes, "CODE", {});
			var code25_nodes = children(code25);
			t123 = claim_text(code25_nodes, "updateElementsIfConditionA");
			code25_nodes.forEach(detach);
			li8_nodes.forEach(detach);
			t124 = claim_space(ul3_nodes);
			li9 = claim_element(ul3_nodes, "LI", {});
			var li9_nodes = children(li9);
			code26 = claim_element(li9_nodes, "CODE", {});
			var code26_nodes = children(code26);
			t125 = claim_text(code26_nodes, "destroyElementsIfConditionA");
			code26_nodes.forEach(detach);
			li9_nodes.forEach(detach);
			ul3_nodes.forEach(detach);
			t126 = claim_space(section4_nodes);
			p20 = claim_element(section4_nodes, "P", {});
			var p20_nodes = children(p20);
			t127 = claim_text(p20_nodes, "It seems like we can employ some sort of ");
			a14 = claim_element(p20_nodes, "A", { href: true, rel: true });
			var a14_nodes = children(a14);
			t128 = claim_text(a14_nodes, "Strategy Pattern");
			a14_nodes.forEach(detach);
			t129 = claim_text(p20_nodes, " over here.");
			p20_nodes.forEach(detach);
			t130 = claim_space(section4_nodes);
			p21 = claim_element(section4_nodes, "P", {});
			var p21_nodes = children(p21);
			t131 = claim_text(p21_nodes, "We can group the operations for each condition branch together, where each operation has the same interface, ");
			code27 = claim_element(p21_nodes, "CODE", {});
			var code27_nodes = children(code27);
			t132 = claim_text(code27_nodes, "{ create(){}, update(){}, destroy(){} }");
			code27_nodes.forEach(detach);
			t133 = claim_text(p21_nodes, " :");
			p21_nodes.forEach(detach);
			t134 = claim_space(section4_nodes);
			pre8 = claim_element(section4_nodes, "PRE", { class: true });
			var pre8_nodes = children(pre8);
			pre8_nodes.forEach(detach);
			t135 = claim_space(section4_nodes);
			p22 = claim_element(section4_nodes, "P", {});
			var p22_nodes = children(p22);
			t136 = claim_text(p22_nodes, "Now, we choose the operation based on the condition, since they have the same interface, they should be able to be used interchangeably:");
			p22_nodes.forEach(detach);
			t137 = claim_space(section4_nodes);
			pre9 = claim_element(section4_nodes, "PRE", { class: true });
			var pre9_nodes = children(pre9);
			pre9_nodes.forEach(detach);
			t138 = claim_space(section4_nodes);
			p23 = claim_element(section4_nodes, "P", {});
			var p23_nodes = children(p23);
			t139 = claim_text(p23_nodes, "Here, we can rewrite our ");
			code28 = claim_element(p23_nodes, "CODE", {});
			var code28_nodes = children(code28);
			t140 = claim_text(code28_nodes, "createIfBlock");
			code28_nodes.forEach(detach);
			t141 = claim_text(p23_nodes, ", ");
			code29 = claim_element(p23_nodes, "CODE", {});
			var code29_nodes = children(code29);
			t142 = claim_text(code29_nodes, "updateIfBlock");
			code29_nodes.forEach(detach);
			t143 = claim_text(p23_nodes, " and ");
			code30 = claim_element(p23_nodes, "CODE", {});
			var code30_nodes = children(code30);
			t144 = claim_text(code30_nodes, "destroyIfBlock");
			code30_nodes.forEach(detach);
			t145 = claim_text(p23_nodes, ":");
			p23_nodes.forEach(detach);
			t146 = claim_space(section4_nodes);
			pre10 = claim_element(section4_nodes, "PRE", { class: true });
			var pre10_nodes = children(pre10);
			pre10_nodes.forEach(detach);
			t147 = claim_space(section4_nodes);
			p24 = claim_element(section4_nodes, "P", {});
			var p24_nodes = children(p24);
			t148 = claim_text(p24_nodes, "To determine whether the condition changed, we can compute the operation and compare it with the previous operation to see if it has changed.");
			p24_nodes.forEach(detach);
			section4_nodes.forEach(detach);
			t149 = claim_space(nodes);
			section5 = claim_element(nodes, "SECTION", {});
			var section5_nodes = children(section5);
			h22 = claim_element(section5_nodes, "H2", {});
			var h22_nodes = children(h22);
			a15 = claim_element(h22_nodes, "A", { href: true, id: true });
			var a15_nodes = children(a15);
			t150 = claim_text(a15_nodes, "The Compiled JS");
			a15_nodes.forEach(detach);
			h22_nodes.forEach(detach);
			t151 = claim_space(section5_nodes);
			p25 = claim_element(section5_nodes, "P", {});
			var p25_nodes = children(p25);
			t152 = claim_text(p25_nodes, "Now let's take look at how Svelte compiles ");
			code31 = claim_element(p25_nodes, "CODE", {});
			var code31_nodes = children(code31);
			t153 = claim_text(code31_nodes, "{#if}");
			code31_nodes.forEach(detach);
			t154 = claim_text(p25_nodes, " into output JavaScript.");
			p25_nodes.forEach(detach);
			t155 = claim_space(section5_nodes);
			pre11 = claim_element(section5_nodes, "PRE", { class: true });
			var pre11_nodes = children(pre11);
			pre11_nodes.forEach(detach);
			t156 = claim_space(section5_nodes);
			p26 = claim_element(section5_nodes, "P", {});
			var p26_nodes = children(p26);
			a16 = claim_element(p26_nodes, "A", { href: true, rel: true });
			var a16_nodes = children(a16);
			t157 = claim_text(a16_nodes, "Svelte REPL");
			a16_nodes.forEach(detach);
			p26_nodes.forEach(detach);
			t158 = claim_space(section5_nodes);
			p27 = claim_element(section5_nodes, "P", {});
			var p27_nodes = children(p27);
			t159 = claim_text(p27_nodes, "The output code:");
			p27_nodes.forEach(detach);
			t160 = claim_space(section5_nodes);
			details = claim_element(section5_nodes, "DETAILS", {});
			var details_nodes = children(details);
			summary = claim_element(details_nodes, "SUMMARY", {});
			var summary_nodes = children(summary);
			t161 = claim_text(summary_nodes, "Click to expand...");
			summary_nodes.forEach(detach);
			t162 = claim_space(details_nodes);
			pre12 = claim_element(details_nodes, "PRE", { class: true });
			var pre12_nodes = children(pre12);
			pre12_nodes.forEach(detach);
			details_nodes.forEach(detach);
			t163 = claim_space(section5_nodes);
			p28 = claim_element(section5_nodes, "P", {});
			var p28_nodes = children(p28);
			t164 = claim_text(p28_nodes, "Some observations:");
			p28_nodes.forEach(detach);
			t165 = claim_space(section5_nodes);
			p29 = claim_element(section5_nodes, "P", {});
			var p29_nodes = children(p29);
			strong3 = claim_element(p29_nodes, "STRONG", {});
			var strong3_nodes = children(strong3);
			t166 = claim_text(strong3_nodes, "Observation 1: If you compare the Svelte's compiled output and the JS code we came out earlier, you may see some resemblance:");
			strong3_nodes.forEach(detach);
			p29_nodes.forEach(detach);
			t167 = claim_space(section5_nodes);
			ul4 = claim_element(section5_nodes, "UL", {});
			var ul4_nodes = children(ul4);
			li10 = claim_element(ul4_nodes, "LI", {});
			var li10_nodes = children(li10);
			p30 = claim_element(li10_nodes, "P", {});
			var p30_nodes = children(p30);
			t168 = claim_text(p30_nodes, "For each logic branch, we have a ");
			a17 = claim_element(p30_nodes, "A", { href: true });
			var a17_nodes = children(a17);
			code32 = claim_element(a17_nodes, "CODE", {});
			var code32_nodes = children(code32);
			t169 = claim_text(code32_nodes, "create_fragment");
			code32_nodes.forEach(detach);
			t170 = claim_text(a17_nodes, " function");
			a17_nodes.forEach(detach);
			t171 = claim_text(p30_nodes, ", which in this case is ");
			code33 = claim_element(p30_nodes, "CODE", {});
			var code33_nodes = children(code33);
			t172 = claim_text(code33_nodes, "create_else_block");
			code33_nodes.forEach(detach);
			t173 = claim_text(p30_nodes, " and ");
			code34 = claim_element(p30_nodes, "CODE", {});
			var code34_nodes = children(code34);
			t174 = claim_text(code34_nodes, "create_if_block");
			code34_nodes.forEach(detach);
			t175 = claim_text(p30_nodes, ". As explain in the previous article, these functions return an ");
			em = claim_element(p30_nodes, "EM", {});
			var em_nodes = children(em);
			t176 = claim_text(em_nodes, "instruction manual");
			em_nodes.forEach(detach);
			t177 = claim_text(p30_nodes, " on how to build the DOM fragment for each logic branch.");
			p30_nodes.forEach(detach);
			t178 = claim_space(li10_nodes);
			p31 = claim_element(li10_nodes, "P", {});
			var p31_nodes = children(p31);
			t179 = claim_text(p31_nodes, "This is similar to the operations we discussed earlier, eg: ");
			code35 = claim_element(p31_nodes, "CODE", {});
			var code35_nodes = children(code35);
			t180 = claim_text(code35_nodes, "operationConditionA");
			code35_nodes.forEach(detach);
			t181 = claim_text(p31_nodes, ", ");
			code36 = claim_element(p31_nodes, "CODE", {});
			var code36_nodes = children(code36);
			t182 = claim_text(code36_nodes, "operationConditionB");
			code36_nodes.forEach(detach);
			t183 = claim_text(p31_nodes, " and ");
			code37 = claim_element(p31_nodes, "CODE", {});
			var code37_nodes = children(code37);
			t184 = claim_text(code37_nodes, "operationConditionElse");
			code37_nodes.forEach(detach);
			t185 = claim_text(p31_nodes, ".");
			p31_nodes.forEach(detach);
			li10_nodes.forEach(detach);
			t186 = claim_space(ul4_nodes);
			li11 = claim_element(ul4_nodes, "LI", {});
			var li11_nodes = children(li11);
			p32 = claim_element(li11_nodes, "P", {});
			var p32_nodes = children(p32);
			t187 = claim_text(p32_nodes, "To determine which ");
			code38 = claim_element(p32_nodes, "CODE", {});
			var code38_nodes = children(code38);
			t188 = claim_text(code38_nodes, "create_fragment");
			code38_nodes.forEach(detach);
			t189 = claim_text(p32_nodes, " function to use, we have the ");
			code39 = claim_element(p32_nodes, "CODE", {});
			var code39_nodes = children(code39);
			t190 = claim_text(code39_nodes, "select_block_type");
			code39_nodes.forEach(detach);
			t191 = claim_text(p32_nodes, " function.");
			p32_nodes.forEach(detach);
			t192 = claim_space(li11_nodes);
			p33 = claim_element(li11_nodes, "P", {});
			var p33_nodes = children(p33);
			t193 = claim_text(p33_nodes, "This is similar to the ");
			code40 = claim_element(p33_nodes, "CODE", {});
			var code40_nodes = children(code40);
			t194 = claim_text(code40_nodes, "getOperation");
			code40_nodes.forEach(detach);
			t195 = claim_text(p33_nodes, " we discussed earlier.");
			p33_nodes.forEach(detach);
			li11_nodes.forEach(detach);
			t196 = claim_space(ul4_nodes);
			li12 = claim_element(ul4_nodes, "LI", {});
			var li12_nodes = children(li12);
			p34 = claim_element(li12_nodes, "P", {});
			var p34_nodes = children(p34);
			t197 = claim_text(p34_nodes, "We then initialise the fragment for the current condition branch,");
			p34_nodes.forEach(detach);
			li12_nodes.forEach(detach);
			ul4_nodes.forEach(detach);
			t198 = claim_space(section5_nodes);
			pre13 = claim_element(section5_nodes, "PRE", { class: true });
			var pre13_nodes = children(pre13);
			pre13_nodes.forEach(detach);
			t199 = claim_space(section5_nodes);
			ul6 = claim_element(section5_nodes, "UL", {});
			var ul6_nodes = children(ul6);
			li17 = claim_element(ul6_nodes, "LI", {});
			var li17_nodes = children(li17);
			p35 = claim_element(li17_nodes, "P", {});
			var p35_nodes = children(p35);
			t200 = claim_text(p35_nodes, "Now we can:");
			p35_nodes.forEach(detach);
			t201 = claim_space(li17_nodes);
			ul5 = claim_element(li17_nodes, "UL", {});
			var ul5_nodes = children(ul5);
			li13 = claim_element(ul5_nodes, "LI", {});
			var li13_nodes = children(li13);
			t202 = claim_text(li13_nodes, "create ");
			code41 = claim_element(li13_nodes, "CODE", {});
			var code41_nodes = children(code41);
			t203 = claim_text(code41_nodes, "if_block.c()");
			code41_nodes.forEach(detach);
			li13_nodes.forEach(detach);
			t204 = claim_space(ul5_nodes);
			li14 = claim_element(ul5_nodes, "LI", {});
			var li14_nodes = children(li14);
			t205 = claim_text(li14_nodes, "mount ");
			code42 = claim_element(li14_nodes, "CODE", {});
			var code42_nodes = children(code42);
			t206 = claim_text(code42_nodes, "if_block.m(target, anchor)");
			code42_nodes.forEach(detach);
			li14_nodes.forEach(detach);
			t207 = claim_space(ul5_nodes);
			li15 = claim_element(ul5_nodes, "LI", {});
			var li15_nodes = children(li15);
			t208 = claim_text(li15_nodes, "update ");
			code43 = claim_element(li15_nodes, "CODE", {});
			var code43_nodes = children(code43);
			t209 = claim_text(code43_nodes, "if_block.p(ctx, dirty)");
			code43_nodes.forEach(detach);
			li15_nodes.forEach(detach);
			t210 = claim_space(ul5_nodes);
			li16 = claim_element(ul5_nodes, "LI", {});
			var li16_nodes = children(li16);
			t211 = claim_text(li16_nodes, "destroy ");
			code44 = claim_element(li16_nodes, "CODE", {});
			var code44_nodes = children(code44);
			t212 = claim_text(code44_nodes, "if_block.d(detaching)");
			code44_nodes.forEach(detach);
			li16_nodes.forEach(detach);
			ul5_nodes.forEach(detach);
			t213 = claim_space(li17_nodes);
			p36 = claim_element(li17_nodes, "P", {});
			var p36_nodes = children(p36);
			t214 = claim_text(p36_nodes, "elements for the ");
			code45 = claim_element(p36_nodes, "CODE", {});
			var code45_nodes = children(code45);
			t215 = claim_text(code45_nodes, "{#if}");
			code45_nodes.forEach(detach);
			t216 = claim_text(p36_nodes, " block.");
			p36_nodes.forEach(detach);
			li17_nodes.forEach(detach);
			t217 = claim_space(ul6_nodes);
			li18 = claim_element(ul6_nodes, "LI", {});
			var li18_nodes = children(li18);
			p37 = claim_element(li18_nodes, "P", {});
			var p37_nodes = children(p37);
			t218 = claim_text(p37_nodes, "In the ");
			code46 = claim_element(p37_nodes, "CODE", {});
			var code46_nodes = children(code46);
			t219 = claim_text(code46_nodes, "p");
			code46_nodes.forEach(detach);
			t220 = claim_space(p37_nodes);
			strong4 = claim_element(p37_nodes, "STRONG", {});
			var strong4_nodes = children(strong4);
			t221 = claim_text(strong4_nodes, "(u_p_date)");
			strong4_nodes.forEach(detach);
			t222 = claim_text(p37_nodes, " method, we check if the ");
			code47 = claim_element(p37_nodes, "CODE", {});
			var code47_nodes = children(code47);
			t223 = claim_text(code47_nodes, "current_block_type");
			code47_nodes.forEach(detach);
			t224 = claim_text(p37_nodes, " has changed, if not, then we call ");
			code48 = claim_element(p37_nodes, "CODE", {});
			var code48_nodes = children(code48);
			t225 = claim_text(code48_nodes, "if_block.p(ctx, dirty)");
			code48_nodes.forEach(detach);
			t226 = claim_text(p37_nodes, " to update as necessary.");
			p37_nodes.forEach(detach);
			t227 = claim_space(li18_nodes);
			p38 = claim_element(li18_nodes, "P", {});
			var p38_nodes = children(p38);
			t228 = claim_text(p38_nodes, "If there's change, then we destroy ");
			code49 = claim_element(p38_nodes, "CODE", {});
			var code49_nodes = children(code49);
			t229 = claim_text(code49_nodes, "if_block.d(1)");
			code49_nodes.forEach(detach);
			t230 = claim_text(p38_nodes, " the previous elements, create a new fragment based on the ");
			code50 = claim_element(p38_nodes, "CODE", {});
			var code50_nodes = children(code50);
			t231 = claim_text(code50_nodes, "current_block_type");
			code50_nodes.forEach(detach);
			t232 = claim_text(p38_nodes, ", then create and mount the elements via ");
			code51 = claim_element(p38_nodes, "CODE", {});
			var code51_nodes = children(code51);
			t233 = claim_text(code51_nodes, "if_block.c()");
			code51_nodes.forEach(detach);
			t234 = claim_text(p38_nodes, " and ");
			code52 = claim_element(p38_nodes, "CODE", {});
			var code52_nodes = children(code52);
			t235 = claim_text(code52_nodes, "if_block.m(...)");
			code52_nodes.forEach(detach);
			t236 = claim_text(p38_nodes, ".");
			p38_nodes.forEach(detach);
			t237 = claim_space(li18_nodes);
			p39 = claim_element(li18_nodes, "P", {});
			var p39_nodes = children(p39);
			t238 = claim_text(p39_nodes, "This is similar to how we call ");
			code53 = claim_element(p39_nodes, "CODE", {});
			var code53_nodes = children(code53);
			t239 = claim_text(code53_nodes, "previousOperation.destroy()");
			code53_nodes.forEach(detach);
			t240 = claim_text(p39_nodes, " and ");
			code54 = claim_element(p39_nodes, "CODE", {});
			var code54_nodes = children(code54);
			t241 = claim_text(code54_nodes, "currentOperation.create()");
			code54_nodes.forEach(detach);
			t242 = claim_text(p39_nodes, "  or ");
			code55 = claim_element(p39_nodes, "CODE", {});
			var code55_nodes = children(code55);
			t243 = claim_text(code55_nodes, "currentOperation.update()");
			code55_nodes.forEach(detach);
			t244 = claim_text(p39_nodes, ".");
			p39_nodes.forEach(detach);
			li18_nodes.forEach(detach);
			ul6_nodes.forEach(detach);
			t245 = claim_space(section5_nodes);
			p40 = claim_element(section5_nodes, "P", {});
			var p40_nodes = children(p40);
			strong5 = claim_element(p40_nodes, "STRONG", {});
			var strong5_nodes = children(strong5);
			t246 = claim_text(strong5_nodes, "Observation 2: There's a ");
			code56 = claim_element(strong5_nodes, "CODE", {});
			var code56_nodes = children(code56);
			t247 = claim_text(code56_nodes, "if_block_anchor");
			code56_nodes.forEach(detach);
			t248 = claim_text(strong5_nodes, " inserted after the ");
			code57 = claim_element(strong5_nodes, "CODE", {});
			var code57_nodes = children(code57);
			t249 = claim_text(code57_nodes, "if_block");
			code57_nodes.forEach(detach);
			strong5_nodes.forEach(detach);
			p40_nodes.forEach(detach);
			t250 = claim_space(section5_nodes);
			pre14 = claim_element(section5_nodes, "PRE", { class: true });
			var pre14_nodes = children(pre14);
			pre14_nodes.forEach(detach);
			t251 = claim_space(section5_nodes);
			p41 = claim_element(section5_nodes, "P", {});
			var p41_nodes = children(p41);
			code58 = claim_element(p41_nodes, "CODE", {});
			var code58_nodes = children(code58);
			t252 = claim_text(code58_nodes, "empty()");
			code58_nodes.forEach(detach);
			t253 = claim_text(p41_nodes, " creates an empty text node.");
			p41_nodes.forEach(detach);
			t254 = claim_space(section5_nodes);
			pre15 = claim_element(section5_nodes, "PRE", { class: true });
			var pre15_nodes = children(pre15);
			pre15_nodes.forEach(detach);
			t255 = claim_space(section5_nodes);
			p42 = claim_element(section5_nodes, "P", {});
			var p42_nodes = children(p42);
			t256 = claim_text(p42_nodes, "The ");
			code59 = claim_element(p42_nodes, "CODE", {});
			var code59_nodes = children(code59);
			t257 = claim_text(code59_nodes, "if_block_anchor");
			code59_nodes.forEach(detach);
			t258 = claim_text(p42_nodes, " is then used when mounting the ");
			code60 = claim_element(p42_nodes, "CODE", {});
			var code60_nodes = children(code60);
			t259 = claim_text(code60_nodes, "if_block");
			code60_nodes.forEach(detach);
			t260 = claim_text(p42_nodes, " in the ");
			strong6 = claim_element(p42_nodes, "STRONG", {});
			var strong6_nodes = children(strong6);
			t261 = claim_text(strong6_nodes, "u_p_date");
			strong6_nodes.forEach(detach);
			t262 = claim_text(p42_nodes, " method.");
			p42_nodes.forEach(detach);
			t263 = claim_space(section5_nodes);
			pre16 = claim_element(section5_nodes, "PRE", { class: true });
			var pre16_nodes = children(pre16);
			pre16_nodes.forEach(detach);
			t264 = claim_space(section5_nodes);
			p43 = claim_element(section5_nodes, "P", {});
			var p43_nodes = children(p43);
			t265 = claim_text(p43_nodes, "So what is this extra empty text node for?");
			p43_nodes.forEach(detach);
			section5_nodes.forEach(detach);
			t266 = claim_space(nodes);
			section6 = claim_element(nodes, "SECTION", {});
			var section6_nodes = children(section6);
			h32 = claim_element(section6_nodes, "H3", {});
			var h32_nodes = children(h32);
			a18 = claim_element(h32_nodes, "A", { href: true, id: true });
			var a18_nodes = children(a18);
			t267 = claim_text(a18_nodes, "The extra text node");
			a18_nodes.forEach(detach);
			h32_nodes.forEach(detach);
			t268 = claim_space(section6_nodes);
			p44 = claim_element(section6_nodes, "P", {});
			var p44_nodes = children(p44);
			t269 = claim_text(p44_nodes, "When we update the ");
			code61 = claim_element(p44_nodes, "CODE", {});
			var code61_nodes = children(code61);
			t270 = claim_text(code61_nodes, "{#if}");
			code61_nodes.forEach(detach);
			t271 = claim_text(p44_nodes, " block and notice that we need to change the fragment block type, we need to destroy the elements created previously, and insert newly created elements.");
			p44_nodes.forEach(detach);
			t272 = claim_space(section6_nodes);
			p45 = claim_element(section6_nodes, "P", {});
			var p45_nodes = children(p45);
			t273 = claim_text(p45_nodes, "When we insert the new elements, we need to know where to insert them. The ");
			a19 = claim_element(p45_nodes, "A", { href: true, rel: true });
			var a19_nodes = children(a19);
			code62 = claim_element(a19_nodes, "CODE", {});
			var code62_nodes = children(code62);
			t274 = claim_text(code62_nodes, "insertBefore");
			code62_nodes.forEach(detach);
			a19_nodes.forEach(detach);
			t275 = claim_text(p45_nodes, " API allow us to specify which node the elements should be inserted before. So now it begs the question, which node?");
			p45_nodes.forEach(detach);
			t276 = claim_space(section6_nodes);
			p46 = claim_element(section6_nodes, "P", {});
			var p46_nodes = children(p46);
			t277 = claim_text(p46_nodes, "The answer depends on the position ");
			code63 = claim_element(p46_nodes, "CODE", {});
			var code63_nodes = children(code63);
			t278 = claim_text(code63_nodes, "{#if}");
			code63_nodes.forEach(detach);
			t279 = claim_text(p46_nodes, " block is written in the component. There are 4 possible scenarios:");
			p46_nodes.forEach(detach);
			t280 = claim_space(section6_nodes);
			p47 = claim_element(section6_nodes, "P", {});
			var p47_nodes = children(p47);
			strong7 = claim_element(p47_nodes, "STRONG", {});
			var strong7_nodes = children(strong7);
			t281 = claim_text(strong7_nodes, "1. There's an element right after the ");
			code64 = claim_element(strong7_nodes, "CODE", {});
			var code64_nodes = children(code64);
			t282 = claim_text(code64_nodes, "{#if}");
			code64_nodes.forEach(detach);
			t283 = claim_text(strong7_nodes, " block");
			strong7_nodes.forEach(detach);
			p47_nodes.forEach(detach);
			t284 = claim_space(section6_nodes);
			pre17 = claim_element(section6_nodes, "PRE", { class: true });
			var pre17_nodes = children(pre17);
			pre17_nodes.forEach(detach);
			t285 = claim_space(section6_nodes);
			p48 = claim_element(section6_nodes, "P", {});
			var p48_nodes = children(p48);
			a20 = claim_element(p48_nodes, "A", { href: true, rel: true });
			var a20_nodes = children(a20);
			t286 = claim_text(a20_nodes, "Svelte REPL");
			a20_nodes.forEach(detach);
			p48_nodes.forEach(detach);
			t287 = claim_space(section6_nodes);
			p49 = claim_element(section6_nodes, "P", {});
			var p49_nodes = children(p49);
			t288 = claim_text(p49_nodes, "You'll see that");
			p49_nodes.forEach(detach);
			t289 = claim_space(section6_nodes);
			ul7 = claim_element(section6_nodes, "UL", {});
			var ul7_nodes = children(ul7);
			li19 = claim_element(ul7_nodes, "LI", {});
			var li19_nodes = children(li19);
			t290 = claim_text(li19_nodes, "Svelte does not create the extra text node");
			li19_nodes.forEach(detach);
			t291 = claim_space(ul7_nodes);
			li20 = claim_element(ul7_nodes, "LI", {});
			var li20_nodes = children(li20);
			t292 = claim_text(li20_nodes, "Instead, Svelte uses the ");
			code65 = claim_element(li20_nodes, "CODE", {});
			var code65_nodes = children(code65);
			t293 = claim_text(code65_nodes, "<span />");
			code65_nodes.forEach(detach);
			t294 = claim_text(li20_nodes, " node instead");
			li20_nodes.forEach(detach);
			ul7_nodes.forEach(detach);
			t295 = claim_space(section6_nodes);
			pre18 = claim_element(section6_nodes, "PRE", { class: true });
			var pre18_nodes = children(pre18);
			pre18_nodes.forEach(detach);
			t296 = claim_space(section6_nodes);
			blockquote0 = claim_element(section6_nodes, "BLOCKQUOTE", {});
			var blockquote0_nodes = children(blockquote0);
			p50 = claim_element(blockquote0_nodes, "P", {});
			var p50_nodes = children(p50);
			t297 = claim_text(p50_nodes, "When the ");
			code66 = claim_element(p50_nodes, "CODE", {});
			var code66_nodes = children(code66);
			t298 = claim_text(code66_nodes, "{#if}");
			code66_nodes.forEach(detach);
			t299 = claim_text(p50_nodes, " condition changes, ");
			code67 = claim_element(p50_nodes, "CODE", {});
			var code67_nodes = children(code67);
			t300 = claim_text(code67_nodes, "{#if}");
			code67_nodes.forEach(detach);
			t301 = claim_text(p50_nodes, " block will replace and insert new elements before the ");
			code68 = claim_element(p50_nodes, "CODE", {});
			var code68_nodes = children(code68);
			t302 = claim_text(code68_nodes, "<span />");
			code68_nodes.forEach(detach);
			t303 = claim_text(p50_nodes, " element.");
			p50_nodes.forEach(detach);
			blockquote0_nodes.forEach(detach);
			t304 = claim_space(section6_nodes);
			p51 = claim_element(section6_nodes, "P", {});
			var p51_nodes = children(p51);
			strong8 = claim_element(p51_nodes, "STRONG", {});
			var strong8_nodes = children(strong8);
			t305 = claim_text(strong8_nodes, "2. ");
			code69 = claim_element(strong8_nodes, "CODE", {});
			var code69_nodes = children(code69);
			t306 = claim_text(code69_nodes, "{#if}");
			code69_nodes.forEach(detach);
			t307 = claim_text(strong8_nodes, " block is the last child, ");
			code70 = claim_element(strong8_nodes, "CODE", {});
			var code70_nodes = children(code70);
			t308 = claim_text(code70_nodes, "{#if}");
			code70_nodes.forEach(detach);
			t309 = claim_text(strong8_nodes, " block has a parent");
			strong8_nodes.forEach(detach);
			p51_nodes.forEach(detach);
			t310 = claim_space(section6_nodes);
			pre19 = claim_element(section6_nodes, "PRE", { class: true });
			var pre19_nodes = children(pre19);
			pre19_nodes.forEach(detach);
			t311 = claim_space(section6_nodes);
			p52 = claim_element(section6_nodes, "P", {});
			var p52_nodes = children(p52);
			a21 = claim_element(p52_nodes, "A", { href: true, rel: true });
			var a21_nodes = children(a21);
			t312 = claim_text(a21_nodes, "Svelte REPL");
			a21_nodes.forEach(detach);
			p52_nodes.forEach(detach);
			t313 = claim_space(section6_nodes);
			p53 = claim_element(section6_nodes, "P", {});
			var p53_nodes = children(p53);
			t314 = claim_text(p53_nodes, "You'll see that");
			p53_nodes.forEach(detach);
			t315 = claim_space(section6_nodes);
			ul8 = claim_element(section6_nodes, "UL", {});
			var ul8_nodes = children(ul8);
			li21 = claim_element(ul8_nodes, "LI", {});
			var li21_nodes = children(li21);
			t316 = claim_text(li21_nodes, "Svelte does not create the extra text node");
			li21_nodes.forEach(detach);
			t317 = claim_space(ul8_nodes);
			li22 = claim_element(ul8_nodes, "LI", {});
			var li22_nodes = children(li22);
			t318 = claim_text(li22_nodes, "Instead, Svelte inserts the ");
			code71 = claim_element(li22_nodes, "CODE", {});
			var code71_nodes = children(code71);
			t319 = claim_text(code71_nodes, "{#if}");
			code71_nodes.forEach(detach);
			t320 = claim_text(li22_nodes, " block into the parent node, ");
			code72 = claim_element(li22_nodes, "CODE", {});
			var code72_nodes = children(code72);
			t321 = claim_text(code72_nodes, "<div />");
			code72_nodes.forEach(detach);
			t322 = claim_text(li22_nodes, " and insert before ");
			code73 = claim_element(li22_nodes, "CODE", {});
			var code73_nodes = children(code73);
			t323 = claim_text(code73_nodes, "null");
			code73_nodes.forEach(detach);
			t324 = claim_text(li22_nodes, ". (If you pass ");
			code74 = claim_element(li22_nodes, "CODE", {});
			var code74_nodes = children(code74);
			t325 = claim_text(code74_nodes, "null");
			code74_nodes.forEach(detach);
			t326 = claim_text(li22_nodes, " to ");
			code75 = claim_element(li22_nodes, "CODE", {});
			var code75_nodes = children(code75);
			t327 = claim_text(code75_nodes, "insertBefore");
			code75_nodes.forEach(detach);
			t328 = claim_text(li22_nodes, ", it will append the element as the last child)");
			li22_nodes.forEach(detach);
			ul8_nodes.forEach(detach);
			t329 = claim_space(section6_nodes);
			pre20 = claim_element(section6_nodes, "PRE", { class: true });
			var pre20_nodes = children(pre20);
			pre20_nodes.forEach(detach);
			t330 = claim_space(section6_nodes);
			blockquote1 = claim_element(section6_nodes, "BLOCKQUOTE", {});
			var blockquote1_nodes = children(blockquote1);
			p54 = claim_element(blockquote1_nodes, "P", {});
			var p54_nodes = children(p54);
			t331 = claim_text(p54_nodes, "When the ");
			code76 = claim_element(p54_nodes, "CODE", {});
			var code76_nodes = children(code76);
			t332 = claim_text(code76_nodes, "{#if}");
			code76_nodes.forEach(detach);
			t333 = claim_text(p54_nodes, " condition changes, ");
			code77 = claim_element(p54_nodes, "CODE", {});
			var code77_nodes = children(code77);
			t334 = claim_text(code77_nodes, "{#if}");
			code77_nodes.forEach(detach);
			t335 = claim_text(p54_nodes, " block will replace and insert new elements as the last children of the parent ");
			code78 = claim_element(p54_nodes, "CODE", {});
			var code78_nodes = children(code78);
			t336 = claim_text(code78_nodes, "<div />");
			code78_nodes.forEach(detach);
			t337 = claim_text(p54_nodes, " element.");
			p54_nodes.forEach(detach);
			blockquote1_nodes.forEach(detach);
			t338 = claim_space(section6_nodes);
			p55 = claim_element(section6_nodes, "P", {});
			var p55_nodes = children(p55);
			strong9 = claim_element(p55_nodes, "STRONG", {});
			var strong9_nodes = children(strong9);
			t339 = claim_text(strong9_nodes, "3. ");
			code79 = claim_element(strong9_nodes, "CODE", {});
			var code79_nodes = children(code79);
			t340 = claim_text(code79_nodes, "{#if}");
			code79_nodes.forEach(detach);
			t341 = claim_text(strong9_nodes, " block is the last child, ");
			code80 = claim_element(strong9_nodes, "CODE", {});
			var code80_nodes = children(code80);
			t342 = claim_text(code80_nodes, "{#if}");
			code80_nodes.forEach(detach);
			t343 = claim_text(strong9_nodes, " block does not have a parent");
			strong9_nodes.forEach(detach);
			p55_nodes.forEach(detach);
			t344 = claim_space(section6_nodes);
			pre21 = claim_element(section6_nodes, "PRE", { class: true });
			var pre21_nodes = children(pre21);
			pre21_nodes.forEach(detach);
			t345 = claim_space(section6_nodes);
			p56 = claim_element(section6_nodes, "P", {});
			var p56_nodes = children(p56);
			a22 = claim_element(p56_nodes, "A", { href: true, rel: true });
			var a22_nodes = children(a22);
			t346 = claim_text(a22_nodes, "Svelte REPL");
			a22_nodes.forEach(detach);
			p56_nodes.forEach(detach);
			t347 = claim_space(section6_nodes);
			p57 = claim_element(section6_nodes, "P", {});
			var p57_nodes = children(p57);
			t348 = claim_text(p57_nodes, "You'll see that");
			p57_nodes.forEach(detach);
			t349 = claim_space(section6_nodes);
			ul9 = claim_element(section6_nodes, "UL", {});
			var ul9_nodes = children(ul9);
			li23 = claim_element(ul9_nodes, "LI", {});
			var li23_nodes = children(li23);
			t350 = claim_text(li23_nodes, "Svelte creates an extra ");
			code81 = claim_element(li23_nodes, "CODE", {});
			var code81_nodes = children(code81);
			t351 = claim_text(code81_nodes, "anchor");
			code81_nodes.forEach(detach);
			t352 = claim_text(li23_nodes, " element");
			li23_nodes.forEach(detach);
			t353 = claim_space(ul9_nodes);
			li24 = claim_element(ul9_nodes, "LI", {});
			var li24_nodes = children(li24);
			t354 = claim_text(li24_nodes, "The ");
			code82 = claim_element(li24_nodes, "CODE", {});
			var code82_nodes = children(code82);
			t355 = claim_text(code82_nodes, "anchor");
			code82_nodes.forEach(detach);
			t356 = claim_text(li24_nodes, " element is inserted after the ");
			code83 = claim_element(li24_nodes, "CODE", {});
			var code83_nodes = children(code83);
			t357 = claim_text(code83_nodes, "{#if}");
			code83_nodes.forEach(detach);
			t358 = claim_text(li24_nodes, " block.");
			li24_nodes.forEach(detach);
			t359 = claim_space(ul9_nodes);
			li25 = claim_element(ul9_nodes, "LI", {});
			var li25_nodes = children(li25);
			t360 = claim_text(li25_nodes, "Subsequently in the ");
			strong10 = claim_element(li25_nodes, "STRONG", {});
			var strong10_nodes = children(strong10);
			t361 = claim_text(strong10_nodes, "u_p_date");
			strong10_nodes.forEach(detach);
			t362 = claim_text(li25_nodes, " function, Svelte insert ");
			code84 = claim_element(li25_nodes, "CODE", {});
			var code84_nodes = children(code84);
			t363 = claim_text(code84_nodes, "{#if}");
			code84_nodes.forEach(detach);
			t364 = claim_text(li25_nodes, " block before the ");
			code85 = claim_element(li25_nodes, "CODE", {});
			var code85_nodes = children(code85);
			t365 = claim_text(code85_nodes, "anchor");
			code85_nodes.forEach(detach);
			t366 = claim_text(li25_nodes, " element.");
			li25_nodes.forEach(detach);
			ul9_nodes.forEach(detach);
			t367 = claim_space(section6_nodes);
			pre22 = claim_element(section6_nodes, "PRE", { class: true });
			var pre22_nodes = children(pre22);
			pre22_nodes.forEach(detach);
			t368 = claim_space(section6_nodes);
			blockquote2 = claim_element(section6_nodes, "BLOCKQUOTE", {});
			var blockquote2_nodes = children(blockquote2);
			p58 = claim_element(blockquote2_nodes, "P", {});
			var p58_nodes = children(p58);
			t369 = claim_text(p58_nodes, "When the ");
			code86 = claim_element(p58_nodes, "CODE", {});
			var code86_nodes = children(code86);
			t370 = claim_text(code86_nodes, "{#if}");
			code86_nodes.forEach(detach);
			t371 = claim_text(p58_nodes, " condition changes, ");
			code87 = claim_element(p58_nodes, "CODE", {});
			var code87_nodes = children(code87);
			t372 = claim_text(code87_nodes, "{#if}");
			code87_nodes.forEach(detach);
			t373 = claim_text(p58_nodes, " block will replace and insert new elements before the ");
			code88 = claim_element(p58_nodes, "CODE", {});
			var code88_nodes = children(code88);
			t374 = claim_text(code88_nodes, "anchor");
			code88_nodes.forEach(detach);
			t375 = claim_text(p58_nodes, " element.");
			p58_nodes.forEach(detach);
			blockquote2_nodes.forEach(detach);
			t376 = claim_space(section6_nodes);
			p59 = claim_element(section6_nodes, "P", {});
			var p59_nodes = children(p59);
			t377 = claim_text(p59_nodes, "But why?");
			p59_nodes.forEach(detach);
			t378 = claim_space(section6_nodes);
			p60 = claim_element(section6_nodes, "P", {});
			var p60_nodes = children(p60);
			t379 = claim_text(p60_nodes, "This is because a Svelte component can be used in anywhere.");
			p60_nodes.forEach(detach);
			t380 = claim_space(section6_nodes);
			p61 = claim_element(section6_nodes, "P", {});
			var p61_nodes = children(p61);
			t381 = claim_text(p61_nodes, "Let's take a look at the scenario below:");
			p61_nodes.forEach(detach);
			t382 = claim_space(section6_nodes);
			pre23 = claim_element(section6_nodes, "PRE", { class: true });
			var pre23_nodes = children(pre23);
			pre23_nodes.forEach(detach);
			t383 = claim_space(section6_nodes);
			p62 = claim_element(section6_nodes, "P", {});
			var p62_nodes = children(p62);
			t384 = claim_text(p62_nodes, "In the ");
			code89 = claim_element(p62_nodes, "CODE", {});
			var code89_nodes = children(code89);
			t385 = claim_text(code89_nodes, "A.svelte");
			code89_nodes.forEach(detach);
			t386 = claim_text(p62_nodes, ", the ");
			code90 = claim_element(p62_nodes, "CODE", {});
			var code90_nodes = children(code90);
			t387 = claim_text(code90_nodes, "{#if}");
			code90_nodes.forEach(detach);
			t388 = claim_text(p62_nodes, " block is the last child, it does not have any sibling elements after it.");
			p62_nodes.forEach(detach);
			t389 = claim_space(section6_nodes);
			p63 = claim_element(section6_nodes, "P", {});
			var p63_nodes = children(p63);
			t390 = claim_text(p63_nodes, "Let's first assume we don't have the ");
			code91 = claim_element(p63_nodes, "CODE", {});
			var code91_nodes = children(code91);
			t391 = claim_text(code91_nodes, "anchor");
			code91_nodes.forEach(detach);
			t392 = claim_text(p63_nodes, " element. When the ");
			code92 = claim_element(p63_nodes, "CODE", {});
			var code92_nodes = children(code92);
			t393 = claim_text(code92_nodes, "condition");
			code92_nodes.forEach(detach);
			t394 = claim_text(p63_nodes, " changes from ");
			code93 = claim_element(p63_nodes, "CODE", {});
			var code93_nodes = children(code93);
			t395 = claim_text(code93_nodes, "false");
			code93_nodes.forEach(detach);
			t396 = claim_text(p63_nodes, " to ");
			code94 = claim_element(p63_nodes, "CODE", {});
			var code94_nodes = children(code94);
			t397 = claim_text(code94_nodes, "true");
			code94_nodes.forEach(detach);
			t398 = claim_text(p63_nodes, ", Svelte will have to insert the new element ");
			code95 = claim_element(p63_nodes, "CODE", {});
			var code95_nodes = children(code95);
			t399 = claim_text(code95_nodes, "<div id=\"a\">");
			code95_nodes.forEach(detach);
			t400 = claim_text(p63_nodes, " into its parent. And because there's no next element after ");
			code96 = claim_element(p63_nodes, "CODE", {});
			var code96_nodes = children(code96);
			t401 = claim_text(code96_nodes, "{#if}");
			code96_nodes.forEach(detach);
			t402 = claim_text(p63_nodes, " block, and no ");
			code97 = claim_element(p63_nodes, "CODE", {});
			var code97_nodes = children(code97);
			t403 = claim_text(code97_nodes, "anchor");
			code97_nodes.forEach(detach);
			t404 = claim_text(p63_nodes, " element, we will have to insert before ");
			code98 = claim_element(p63_nodes, "CODE", {});
			var code98_nodes = children(code98);
			t405 = claim_text(code98_nodes, "null");
			code98_nodes.forEach(detach);
			t406 = claim_text(p63_nodes, ". In which, the ");
			code99 = claim_element(p63_nodes, "CODE", {});
			var code99_nodes = children(code99);
			t407 = claim_text(code99_nodes, "<div id=\"a\" />");
			code99_nodes.forEach(detach);
			t408 = claim_text(p63_nodes, " will be inserted as the last child of the parent element, ");
			code100 = claim_element(p63_nodes, "CODE", {});
			var code100_nodes = children(code100);
			t409 = claim_text(code100_nodes, "<div id=\"parent\">");
			code100_nodes.forEach(detach);
			t410 = claim_text(p63_nodes, ". And hey, we got ourselves a bug! Elements inside ");
			code101 = claim_element(p63_nodes, "CODE", {});
			var code101_nodes = children(code101);
			t411 = claim_text(code101_nodes, "<A />");
			code101_nodes.forEach(detach);
			t412 = claim_text(p63_nodes, " appears after ");
			code102 = claim_element(p63_nodes, "CODE", {});
			var code102_nodes = children(code102);
			t413 = claim_text(code102_nodes, "<B />");
			code102_nodes.forEach(detach);
			t414 = claim_text(p63_nodes, "!");
			p63_nodes.forEach(detach);
			t415 = claim_space(section6_nodes);
			pre24 = claim_element(section6_nodes, "PRE", { class: true });
			var pre24_nodes = children(pre24);
			pre24_nodes.forEach(detach);
			t416 = claim_space(section6_nodes);
			p64 = claim_element(section6_nodes, "P", {});
			var p64_nodes = children(p64);
			t417 = claim_text(p64_nodes, "We can prevent this from happening by adding an ");
			code103 = claim_element(p64_nodes, "CODE", {});
			var code103_nodes = children(code103);
			t418 = claim_text(code103_nodes, "anchor");
			code103_nodes.forEach(detach);
			t419 = claim_text(p64_nodes, " element.");
			p64_nodes.forEach(detach);
			t420 = claim_space(section6_nodes);
			p65 = claim_element(section6_nodes, "P", {});
			var p65_nodes = children(p65);
			t421 = claim_text(p65_nodes, "When the ");
			code104 = claim_element(p65_nodes, "CODE", {});
			var code104_nodes = children(code104);
			t422 = claim_text(code104_nodes, "condition");
			code104_nodes.forEach(detach);
			t423 = claim_text(p65_nodes, " is ");
			code105 = claim_element(p65_nodes, "CODE", {});
			var code105_nodes = children(code105);
			t424 = claim_text(code105_nodes, "false");
			code105_nodes.forEach(detach);
			t425 = claim_text(p65_nodes, ", our DOM looks like this:");
			p65_nodes.forEach(detach);
			t426 = claim_space(section6_nodes);
			pre25 = claim_element(section6_nodes, "PRE", { class: true });
			var pre25_nodes = children(pre25);
			pre25_nodes.forEach(detach);
			t427 = claim_space(section6_nodes);
			p66 = claim_element(section6_nodes, "P", {});
			var p66_nodes = children(p66);
			t428 = claim_text(p66_nodes, "And when the ");
			code106 = claim_element(p66_nodes, "CODE", {});
			var code106_nodes = children(code106);
			t429 = claim_text(code106_nodes, "condition");
			code106_nodes.forEach(detach);
			t430 = claim_text(p66_nodes, " turns ");
			code107 = claim_element(p66_nodes, "CODE", {});
			var code107_nodes = children(code107);
			t431 = claim_text(code107_nodes, "true");
			code107_nodes.forEach(detach);
			t432 = claim_text(p66_nodes, ", we insert ");
			code108 = claim_element(p66_nodes, "CODE", {});
			var code108_nodes = children(code108);
			t433 = claim_text(code108_nodes, "<div id=\"a\" />");
			code108_nodes.forEach(detach);
			t434 = claim_text(p66_nodes, " before the ");
			code109 = claim_element(p66_nodes, "CODE", {});
			var code109_nodes = children(code109);
			t435 = claim_text(code109_nodes, "anchor");
			code109_nodes.forEach(detach);
			t436 = claim_text(p66_nodes, " element:");
			p66_nodes.forEach(detach);
			t437 = claim_space(section6_nodes);
			pre26 = claim_element(section6_nodes, "PRE", { class: true });
			var pre26_nodes = children(pre26);
			pre26_nodes.forEach(detach);
			t438 = claim_space(section6_nodes);
			p67 = claim_element(section6_nodes, "P", {});
			var p67_nodes = children(p67);
			t439 = claim_text(p67_nodes, "Yay, we maintain the order of ");
			code110 = claim_element(p67_nodes, "CODE", {});
			var code110_nodes = children(code110);
			t440 = claim_text(code110_nodes, "<A />");
			code110_nodes.forEach(detach);
			t441 = claim_text(p67_nodes, " and ");
			code111 = claim_element(p67_nodes, "CODE", {});
			var code111_nodes = children(code111);
			t442 = claim_text(code111_nodes, "<B />");
			code111_nodes.forEach(detach);
			t443 = claim_text(p67_nodes, " 🎉 !");
			p67_nodes.forEach(detach);
			t444 = claim_space(section6_nodes);
			p68 = claim_element(section6_nodes, "P", {});
			var p68_nodes = children(p68);
			t445 = claim_text(p68_nodes, "The ");
			code112 = claim_element(p68_nodes, "CODE", {});
			var code112_nodes = children(code112);
			t446 = claim_text(code112_nodes, "anchor");
			code112_nodes.forEach(detach);
			t447 = claim_text(p68_nodes, " element to the ");
			code113 = claim_element(p68_nodes, "CODE", {});
			var code113_nodes = children(code113);
			t448 = claim_text(code113_nodes, "{#if}");
			code113_nodes.forEach(detach);
			t449 = claim_text(p68_nodes, " block, is like ");
			a23 = claim_element(p68_nodes, "A", { href: true, rel: true });
			var a23_nodes = children(a23);
			t450 = claim_text(a23_nodes, "an anchor to a ship");
			a23_nodes.forEach(detach);
			t451 = claim_text(p68_nodes, ", \"Here is where ");
			code114 = claim_element(p68_nodes, "CODE", {});
			var code114_nodes = children(code114);
			t452 = claim_text(code114_nodes, "{#if}");
			code114_nodes.forEach(detach);
			t453 = claim_text(p68_nodes, " block should ");
			code115 = claim_element(p68_nodes, "CODE", {});
			var code115_nodes = children(code115);
			t454 = claim_text(code115_nodes, "insertBefore()");
			code115_nodes.forEach(detach);
			t455 = claim_text(p68_nodes, " !\"");
			p68_nodes.forEach(detach);
			t456 = claim_space(section6_nodes);
			p69 = claim_element(section6_nodes, "P", {});
			var p69_nodes = children(p69);
			strong11 = claim_element(p69_nodes, "STRONG", {});
			var strong11_nodes = children(strong11);
			t457 = claim_text(strong11_nodes, "4. ");
			code116 = claim_element(strong11_nodes, "CODE", {});
			var code116_nodes = children(code116);
			t458 = claim_text(code116_nodes, "{#if}");
			code116_nodes.forEach(detach);
			t459 = claim_text(strong11_nodes, " block followed by another logic block");
			strong11_nodes.forEach(detach);
			p69_nodes.forEach(detach);
			t460 = claim_space(section6_nodes);
			p70 = claim_element(section6_nodes, "P", {});
			var p70_nodes = children(p70);
			t461 = claim_text(p70_nodes, "The final scenario. ");
			code117 = claim_element(p70_nodes, "CODE", {});
			var code117_nodes = children(code117);
			t462 = claim_text(code117_nodes, "{#if}");
			code117_nodes.forEach(detach);
			t463 = claim_text(p70_nodes, " block followed by another logic block:");
			p70_nodes.forEach(detach);
			t464 = claim_space(section6_nodes);
			pre27 = claim_element(section6_nodes, "PRE", { class: true });
			var pre27_nodes = children(pre27);
			pre27_nodes.forEach(detach);
			t465 = claim_space(section6_nodes);
			p71 = claim_element(section6_nodes, "P", {});
			var p71_nodes = children(p71);
			t466 = claim_text(p71_nodes, "The 2nd ");
			code118 = claim_element(p71_nodes, "CODE", {});
			var code118_nodes = children(code118);
			t467 = claim_text(code118_nodes, "{#if}");
			code118_nodes.forEach(detach);
			t468 = claim_text(p71_nodes, " block condition could be ");
			code119 = claim_element(p71_nodes, "CODE", {});
			var code119_nodes = children(code119);
			t469 = claim_text(code119_nodes, "true");
			code119_nodes.forEach(detach);
			t470 = claim_text(p71_nodes, " or ");
			code120 = claim_element(p71_nodes, "CODE", {});
			var code120_nodes = children(code120);
			t471 = claim_text(code120_nodes, "false");
			code120_nodes.forEach(detach);
			t472 = claim_text(p71_nodes, ". Which means ");
			code121 = claim_element(p71_nodes, "CODE", {});
			var code121_nodes = children(code121);
			t473 = claim_text(code121_nodes, "<div id=\"b\" />");
			code121_nodes.forEach(detach);
			t474 = claim_text(p71_nodes, " could be there or not there.");
			p71_nodes.forEach(detach);
			t475 = claim_space(section6_nodes);
			p72 = claim_element(section6_nodes, "P", {});
			var p72_nodes = children(p72);
			t476 = claim_text(p72_nodes, "So, to know where we should insert ");
			code122 = claim_element(p72_nodes, "CODE", {});
			var code122_nodes = children(code122);
			t477 = claim_text(code122_nodes, "<div id=\"a\" />");
			code122_nodes.forEach(detach);
			t478 = claim_text(p72_nodes, " when chaging the ");
			code123 = claim_element(p72_nodes, "CODE", {});
			var code123_nodes = children(code123);
			t479 = claim_text(code123_nodes, "condition");
			code123_nodes.forEach(detach);
			t480 = claim_text(p72_nodes, ", we need an ");
			code124 = claim_element(p72_nodes, "CODE", {});
			var code124_nodes = children(code124);
			t481 = claim_text(code124_nodes, "anchor");
			code124_nodes.forEach(detach);
			t482 = claim_text(p72_nodes, " element after the 1st ");
			code125 = claim_element(p72_nodes, "CODE", {});
			var code125_nodes = children(code125);
			t483 = claim_text(code125_nodes, "{#if}");
			code125_nodes.forEach(detach);
			t484 = claim_text(p72_nodes, " block, before the 2nd ");
			code126 = claim_element(p72_nodes, "CODE", {});
			var code126_nodes = children(code126);
			t485 = claim_text(code126_nodes, "{#if}");
			code126_nodes.forEach(detach);
			t486 = claim_text(p72_nodes, " block.");
			p72_nodes.forEach(detach);
			section6_nodes.forEach(detach);
			t487 = claim_space(nodes);
			section7 = claim_element(nodes, "SECTION", {});
			var section7_nodes = children(section7);
			h23 = claim_element(section7_nodes, "H2", {});
			var h23_nodes = children(h23);
			a24 = claim_element(h23_nodes, "A", { href: true, id: true });
			var a24_nodes = children(a24);
			t488 = claim_text(a24_nodes, "Closing Note");
			a24_nodes.forEach(detach);
			h23_nodes.forEach(detach);
			t489 = claim_space(section7_nodes);
			p73 = claim_element(section7_nodes, "P", {});
			var p73_nodes = children(p73);
			t490 = claim_text(p73_nodes, "We've covered how Svelte compiles an ");
			code127 = claim_element(p73_nodes, "CODE", {});
			var code127_nodes = children(code127);
			t491 = claim_text(code127_nodes, "{#if}");
			code127_nodes.forEach(detach);
			t492 = claim_text(p73_nodes, " block, as well as how and why an ");
			code128 = claim_element(p73_nodes, "CODE", {});
			var code128_nodes = children(code128);
			t493 = claim_text(code128_nodes, "anchor");
			code128_nodes.forEach(detach);
			t494 = claim_text(p73_nodes, " element is needed for the ");
			code129 = claim_element(p73_nodes, "CODE", {});
			var code129_nodes = children(code129);
			t495 = claim_text(code129_nodes, "{#if}");
			code129_nodes.forEach(detach);
			t496 = claim_text(p73_nodes, " block.");
			p73_nodes.forEach(detach);
			t497 = claim_space(section7_nodes);
			p74 = claim_element(section7_nodes, "P", {});
			var p74_nodes = children(p74);
			t498 = claim_text(p74_nodes, "If you wish to learn more about Svelte, ");
			a25 = claim_element(p74_nodes, "A", { href: true, rel: true });
			var a25_nodes = children(a25);
			t499 = claim_text(a25_nodes, "follow me on Twitter");
			a25_nodes.forEach(detach);
			t500 = claim_text(p74_nodes, ".");
			p74_nodes.forEach(detach);
			t501 = claim_space(section7_nodes);
			p75 = claim_element(section7_nodes, "P", {});
			var p75_nodes = children(p75);
			t502 = claim_text(p75_nodes, "I'll post it on Twitter when the next part is ready, the next post will be about ");
			code130 = claim_element(p75_nodes, "CODE", {});
			var code130_nodes = children(code130);
			t503 = claim_text(code130_nodes, "{#each}");
			code130_nodes.forEach(detach);
			t504 = claim_text(p75_nodes, " logic block.");
			p75_nodes.forEach(detach);
			section7_nodes.forEach(detach);
			this.h();
		},
		h() {
			attr(a0, "href", "#the-if-block");
			attr(a1, "href", "#the-vanilla-js");
			attr(a2, "href", "#implementating-the-if-block");
			attr(a3, "href", "#refactor-the-code");
			attr(a4, "href", "#the-compiled-js");
			attr(a5, "href", "#the-extra-text-node");
			attr(a6, "href", "#closing-note");
			attr(ul2, "class", "sitemap");
			attr(ul2, "id", "sitemap");
			attr(ul2, "role", "navigation");
			attr(ul2, "aria-label", "Table of Contents");
			attr(a7, "href", "/compile-svelte-in-your-head-part-3/");
			attr(a8, "href", "#the-if-block");
			attr(a8, "id", "the-if-block");
			attr(pre0, "class", "language-svelte");
			attr(pre1, "class", "language-svelte");
			attr(a9, "href", "https://svelte.dev/tutorial/if-blocks");
			attr(a9, "rel", "nofollow");
			attr(a10, "href", "#the-vanilla-js");
			attr(a10, "id", "the-vanilla-js");
			attr(a11, "href", "/compile-svelte-in-your-head-part-1/#creating-an-element");
			attr(a12, "href", "#implementating-the-if-block");
			attr(a12, "id", "implementating-the-if-block");
			attr(pre2, "class", "language-js");
			attr(pre3, "class", "language-js");
			attr(pre4, "class", "language-js");
			attr(pre5, "class", "language-svelte");
			attr(pre6, "class", "language-js");
			attr(pre7, "class", "language-js");
			attr(a13, "href", "#refactor-the-code");
			attr(a13, "id", "refactor-the-code");
			attr(a14, "href", "https://dev.to/carlillo/design-patterns---strategy-pattern-in-javascript-2hg3");
			attr(a14, "rel", "nofollow");
			attr(pre8, "class", "language-js");
			attr(pre9, "class", "language-js");
			attr(pre10, "class", "language-js");
			attr(a15, "href", "#the-compiled-js");
			attr(a15, "id", "the-compiled-js");
			attr(pre11, "class", "language-svelte");
			attr(a16, "href", "https://svelte.dev/repl/39aec874a5214a35b34ff069ae9fa143");
			attr(a16, "rel", "nofollow");
			attr(pre12, "class", "language-js");
			attr(a17, "href", "/compile-svelte-in-your-head-part-1/#create-fragment");
			attr(pre13, "class", "language-js");
			attr(pre14, "class", "language-js");
			attr(pre15, "class", "language-js");
			attr(pre16, "class", "language-js");
			attr(a18, "href", "#the-extra-text-node");
			attr(a18, "id", "the-extra-text-node");
			attr(a19, "href", "https://developer.mozilla.org/en-US/docs/Web/API/Node/insertBefore");
			attr(a19, "rel", "nofollow");
			attr(pre17, "class", "language-svelte");
			attr(a20, "href", "https://svelte.dev/repl/5d75daf3190f412f83656fd2e689cb14");
			attr(a20, "rel", "nofollow");
			attr(pre18, "class", "language-js");
			attr(pre19, "class", "language-svelte");
			attr(a21, "href", "https://svelte.dev/repl/5fac48804cfb49639cfda1ab8273cba8");
			attr(a21, "rel", "nofollow");
			attr(pre20, "class", "language-js");
			attr(pre21, "class", "language-svelte");
			attr(a22, "href", "https://svelte.dev/repl/b9b5dae5ab9f4399bf901f802a6885cb");
			attr(a22, "rel", "nofollow");
			attr(pre22, "class", "language-js");
			attr(pre23, "class", "language-svelte");
			attr(pre24, "class", "language-html");
			attr(pre25, "class", "language-html");
			attr(pre26, "class", "language-html");
			attr(a23, "href", "https://www.britannica.com/technology/anchor-nautical-device");
			attr(a23, "rel", "nofollow");
			attr(pre27, "class", "language-svelte");
			attr(a24, "href", "#closing-note");
			attr(a24, "id", "closing-note");
			attr(a25, "href", "https://twitter.com/lihautan");
			attr(a25, "rel", "nofollow");
		},
		m(target, anchor) {
			insert(target, section0, anchor);
			append(section0, ul2);
			append(ul2, li0);
			append(li0, a0);
			append(a0, t0);
			append(ul2, li1);
			append(li1, a1);
			append(a1, t1);
			append(ul2, ul0);
			append(ul0, li2);
			append(li2, a2);
			append(a2, t2);
			append(ul0, li3);
			append(li3, a3);
			append(a3, t3);
			append(ul2, li4);
			append(li4, a4);
			append(a4, t4);
			append(ul2, ul1);
			append(ul1, li5);
			append(li5, a5);
			append(a5, t5);
			append(ul2, li6);
			append(li6, a6);
			append(a6, t6);
			insert(target, t7, anchor);
			insert(target, p0, anchor);
			append(p0, strong0);
			append(strong0, t8);
			append(strong0, a7);
			append(a7, t9);
			append(strong0, t10);
			insert(target, t11, anchor);
			insert(target, p1, anchor);
			append(p1, t12);
			append(p1, strong1);
			append(strong1, t13);
			append(p1, t14);
			insert(target, t15, anchor);
			insert(target, p2, anchor);
			append(p2, t16);
			insert(target, t17, anchor);
			insert(target, section1, anchor);
			append(section1, h20);
			append(h20, a8);
			append(a8, t18);
			append(a8, code0);
			append(code0, t19);
			append(a8, t20);
			append(section1, t21);
			append(section1, p3);
			append(p3, t22);
			append(p3, code1);
			append(code1, t23);
			append(p3, t24);
			append(section1, t25);
			append(section1, pre0);
			pre0.innerHTML = raw0_value;
			append(section1, t26);
			append(section1, p4);
			append(p4, t27);
			append(p4, code2);
			append(code2, t28);
			append(p4, t29);
			append(p4, code3);
			append(code3, t30);
			append(p4, t31);
			append(section1, t32);
			append(section1, p5);
			append(p5, t33);
			append(p5, code4);
			append(code4, t34);
			append(p5, t35);
			append(p5, code5);
			append(code5, t36);
			append(p5, t37);
			append(section1, t38);
			append(section1, pre1);
			pre1.innerHTML = raw1_value;
			append(section1, t39);
			append(section1, p6);
			append(p6, t40);
			append(p6, a9);
			append(a9, code6);
			append(code6, t41);
			append(a9, t42);
			append(p6, t43);
			insert(target, t44, anchor);
			insert(target, section2, anchor);
			append(section2, h21);
			append(h21, a10);
			append(a10, t45);
			append(section2, t46);
			append(section2, p7);
			append(p7, t47);
			append(p7, code7);
			append(code7, t48);
			append(p7, t49);
			append(section2, t50);
			append(section2, p8);
			append(p8, t51);
			append(p8, a11);
			append(a11, t52);
			append(p8, t53);
			insert(target, t54, anchor);
			insert(target, section3, anchor);
			append(section3, h30);
			append(h30, a12);
			append(a12, t55);
			append(section3, t56);
			append(section3, p9);
			append(p9, t57);
			append(p9, code8);
			append(code8, t58);
			append(p9, t59);
			append(section3, t60);
			append(section3, pre2);
			pre2.innerHTML = raw2_value;
			append(section3, t61);
			append(section3, p10);
			append(p10, t62);
			append(p10, code9);
			append(code9, t63);
			append(p10, t64);
			append(p10, code10);
			append(code10, t65);
			append(p10, t66);
			append(p10, code11);
			append(code11, t67);
			append(p10, t68);
			append(section3, t69);
			append(section3, p11);
			append(p11, t70);
			append(section3, t71);
			append(section3, p12);
			append(p12, t72);
			append(section3, t73);
			append(section3, pre3);
			pre3.innerHTML = raw3_value;
			append(section3, t74);
			append(section3, p13);
			append(p13, t75);
			append(p13, strong2);
			append(strong2, t76);
			append(p13, t77);
			append(section3, t78);
			append(section3, pre4);
			pre4.innerHTML = raw4_value;
			append(section3, t79);
			append(section3, p14);
			append(p14, t80);
			append(p14, code12);
			append(code12, t81);
			append(p14, t82);
			append(p14, code13);
			append(code13, t83);
			append(p14, t84);
			append(p14, code14);
			append(code14, t85);
			append(p14, t86);
			append(section3, t87);
			append(section3, pre5);
			pre5.innerHTML = raw5_value;
			append(section3, t88);
			append(section3, p15);
			append(p15, t89);
			append(section3, t90);
			append(section3, pre6);
			pre6.innerHTML = raw6_value;
			append(section3, t91);
			append(section3, p16);
			append(p16, t92);
			append(p16, code15);
			append(code15, t93);
			append(p16, t94);
			append(p16, code16);
			append(code16, t95);
			append(p16, t96);
			append(section3, t97);
			append(section3, pre7);
			pre7.innerHTML = raw7_value;
			append(section3, t98);
			append(section3, p17);
			append(p17, t99);
			append(p17, code17);
			append(code17, t100);
			append(p17, t101);
			append(p17, code18);
			append(code18, t102);
			append(p17, t103);
			append(p17, code19);
			append(code19, t104);
			append(p17, t105);
			append(p17, code20);
			append(code20, t106);
			append(p17, t107);
			append(p17, code21);
			append(code21, t108);
			append(p17, t109);
			append(p17, code22);
			append(code22, t110);
			append(p17, t111);
			append(p17, code23);
			append(code23, t112);
			append(p17, t113);
			append(section3, t114);
			append(section3, p18);
			append(p18, t115);
			insert(target, t116, anchor);
			insert(target, section4, anchor);
			append(section4, h31);
			append(h31, a13);
			append(a13, t117);
			append(section4, t118);
			append(section4, p19);
			append(p19, t119);
			append(section4, t120);
			append(section4, ul3);
			append(ul3, li7);
			append(li7, code24);
			append(code24, t121);
			append(ul3, t122);
			append(ul3, li8);
			append(li8, code25);
			append(code25, t123);
			append(ul3, t124);
			append(ul3, li9);
			append(li9, code26);
			append(code26, t125);
			append(section4, t126);
			append(section4, p20);
			append(p20, t127);
			append(p20, a14);
			append(a14, t128);
			append(p20, t129);
			append(section4, t130);
			append(section4, p21);
			append(p21, t131);
			append(p21, code27);
			append(code27, t132);
			append(p21, t133);
			append(section4, t134);
			append(section4, pre8);
			pre8.innerHTML = raw8_value;
			append(section4, t135);
			append(section4, p22);
			append(p22, t136);
			append(section4, t137);
			append(section4, pre9);
			pre9.innerHTML = raw9_value;
			append(section4, t138);
			append(section4, p23);
			append(p23, t139);
			append(p23, code28);
			append(code28, t140);
			append(p23, t141);
			append(p23, code29);
			append(code29, t142);
			append(p23, t143);
			append(p23, code30);
			append(code30, t144);
			append(p23, t145);
			append(section4, t146);
			append(section4, pre10);
			pre10.innerHTML = raw10_value;
			append(section4, t147);
			append(section4, p24);
			append(p24, t148);
			insert(target, t149, anchor);
			insert(target, section5, anchor);
			append(section5, h22);
			append(h22, a15);
			append(a15, t150);
			append(section5, t151);
			append(section5, p25);
			append(p25, t152);
			append(p25, code31);
			append(code31, t153);
			append(p25, t154);
			append(section5, t155);
			append(section5, pre11);
			pre11.innerHTML = raw11_value;
			append(section5, t156);
			append(section5, p26);
			append(p26, a16);
			append(a16, t157);
			append(section5, t158);
			append(section5, p27);
			append(p27, t159);
			append(section5, t160);
			append(section5, details);
			append(details, summary);
			append(summary, t161);
			append(details, t162);
			append(details, pre12);
			pre12.innerHTML = raw12_value;
			append(section5, t163);
			append(section5, p28);
			append(p28, t164);
			append(section5, t165);
			append(section5, p29);
			append(p29, strong3);
			append(strong3, t166);
			append(section5, t167);
			append(section5, ul4);
			append(ul4, li10);
			append(li10, p30);
			append(p30, t168);
			append(p30, a17);
			append(a17, code32);
			append(code32, t169);
			append(a17, t170);
			append(p30, t171);
			append(p30, code33);
			append(code33, t172);
			append(p30, t173);
			append(p30, code34);
			append(code34, t174);
			append(p30, t175);
			append(p30, em);
			append(em, t176);
			append(p30, t177);
			append(li10, t178);
			append(li10, p31);
			append(p31, t179);
			append(p31, code35);
			append(code35, t180);
			append(p31, t181);
			append(p31, code36);
			append(code36, t182);
			append(p31, t183);
			append(p31, code37);
			append(code37, t184);
			append(p31, t185);
			append(ul4, t186);
			append(ul4, li11);
			append(li11, p32);
			append(p32, t187);
			append(p32, code38);
			append(code38, t188);
			append(p32, t189);
			append(p32, code39);
			append(code39, t190);
			append(p32, t191);
			append(li11, t192);
			append(li11, p33);
			append(p33, t193);
			append(p33, code40);
			append(code40, t194);
			append(p33, t195);
			append(ul4, t196);
			append(ul4, li12);
			append(li12, p34);
			append(p34, t197);
			append(section5, t198);
			append(section5, pre13);
			pre13.innerHTML = raw13_value;
			append(section5, t199);
			append(section5, ul6);
			append(ul6, li17);
			append(li17, p35);
			append(p35, t200);
			append(li17, t201);
			append(li17, ul5);
			append(ul5, li13);
			append(li13, t202);
			append(li13, code41);
			append(code41, t203);
			append(ul5, t204);
			append(ul5, li14);
			append(li14, t205);
			append(li14, code42);
			append(code42, t206);
			append(ul5, t207);
			append(ul5, li15);
			append(li15, t208);
			append(li15, code43);
			append(code43, t209);
			append(ul5, t210);
			append(ul5, li16);
			append(li16, t211);
			append(li16, code44);
			append(code44, t212);
			append(li17, t213);
			append(li17, p36);
			append(p36, t214);
			append(p36, code45);
			append(code45, t215);
			append(p36, t216);
			append(ul6, t217);
			append(ul6, li18);
			append(li18, p37);
			append(p37, t218);
			append(p37, code46);
			append(code46, t219);
			append(p37, t220);
			append(p37, strong4);
			append(strong4, t221);
			append(p37, t222);
			append(p37, code47);
			append(code47, t223);
			append(p37, t224);
			append(p37, code48);
			append(code48, t225);
			append(p37, t226);
			append(li18, t227);
			append(li18, p38);
			append(p38, t228);
			append(p38, code49);
			append(code49, t229);
			append(p38, t230);
			append(p38, code50);
			append(code50, t231);
			append(p38, t232);
			append(p38, code51);
			append(code51, t233);
			append(p38, t234);
			append(p38, code52);
			append(code52, t235);
			append(p38, t236);
			append(li18, t237);
			append(li18, p39);
			append(p39, t238);
			append(p39, code53);
			append(code53, t239);
			append(p39, t240);
			append(p39, code54);
			append(code54, t241);
			append(p39, t242);
			append(p39, code55);
			append(code55, t243);
			append(p39, t244);
			append(section5, t245);
			append(section5, p40);
			append(p40, strong5);
			append(strong5, t246);
			append(strong5, code56);
			append(code56, t247);
			append(strong5, t248);
			append(strong5, code57);
			append(code57, t249);
			append(section5, t250);
			append(section5, pre14);
			pre14.innerHTML = raw14_value;
			append(section5, t251);
			append(section5, p41);
			append(p41, code58);
			append(code58, t252);
			append(p41, t253);
			append(section5, t254);
			append(section5, pre15);
			pre15.innerHTML = raw15_value;
			append(section5, t255);
			append(section5, p42);
			append(p42, t256);
			append(p42, code59);
			append(code59, t257);
			append(p42, t258);
			append(p42, code60);
			append(code60, t259);
			append(p42, t260);
			append(p42, strong6);
			append(strong6, t261);
			append(p42, t262);
			append(section5, t263);
			append(section5, pre16);
			pre16.innerHTML = raw16_value;
			append(section5, t264);
			append(section5, p43);
			append(p43, t265);
			insert(target, t266, anchor);
			insert(target, section6, anchor);
			append(section6, h32);
			append(h32, a18);
			append(a18, t267);
			append(section6, t268);
			append(section6, p44);
			append(p44, t269);
			append(p44, code61);
			append(code61, t270);
			append(p44, t271);
			append(section6, t272);
			append(section6, p45);
			append(p45, t273);
			append(p45, a19);
			append(a19, code62);
			append(code62, t274);
			append(p45, t275);
			append(section6, t276);
			append(section6, p46);
			append(p46, t277);
			append(p46, code63);
			append(code63, t278);
			append(p46, t279);
			append(section6, t280);
			append(section6, p47);
			append(p47, strong7);
			append(strong7, t281);
			append(strong7, code64);
			append(code64, t282);
			append(strong7, t283);
			append(section6, t284);
			append(section6, pre17);
			pre17.innerHTML = raw17_value;
			append(section6, t285);
			append(section6, p48);
			append(p48, a20);
			append(a20, t286);
			append(section6, t287);
			append(section6, p49);
			append(p49, t288);
			append(section6, t289);
			append(section6, ul7);
			append(ul7, li19);
			append(li19, t290);
			append(ul7, t291);
			append(ul7, li20);
			append(li20, t292);
			append(li20, code65);
			append(code65, t293);
			append(li20, t294);
			append(section6, t295);
			append(section6, pre18);
			pre18.innerHTML = raw18_value;
			append(section6, t296);
			append(section6, blockquote0);
			append(blockquote0, p50);
			append(p50, t297);
			append(p50, code66);
			append(code66, t298);
			append(p50, t299);
			append(p50, code67);
			append(code67, t300);
			append(p50, t301);
			append(p50, code68);
			append(code68, t302);
			append(p50, t303);
			append(section6, t304);
			append(section6, p51);
			append(p51, strong8);
			append(strong8, t305);
			append(strong8, code69);
			append(code69, t306);
			append(strong8, t307);
			append(strong8, code70);
			append(code70, t308);
			append(strong8, t309);
			append(section6, t310);
			append(section6, pre19);
			pre19.innerHTML = raw19_value;
			append(section6, t311);
			append(section6, p52);
			append(p52, a21);
			append(a21, t312);
			append(section6, t313);
			append(section6, p53);
			append(p53, t314);
			append(section6, t315);
			append(section6, ul8);
			append(ul8, li21);
			append(li21, t316);
			append(ul8, t317);
			append(ul8, li22);
			append(li22, t318);
			append(li22, code71);
			append(code71, t319);
			append(li22, t320);
			append(li22, code72);
			append(code72, t321);
			append(li22, t322);
			append(li22, code73);
			append(code73, t323);
			append(li22, t324);
			append(li22, code74);
			append(code74, t325);
			append(li22, t326);
			append(li22, code75);
			append(code75, t327);
			append(li22, t328);
			append(section6, t329);
			append(section6, pre20);
			pre20.innerHTML = raw20_value;
			append(section6, t330);
			append(section6, blockquote1);
			append(blockquote1, p54);
			append(p54, t331);
			append(p54, code76);
			append(code76, t332);
			append(p54, t333);
			append(p54, code77);
			append(code77, t334);
			append(p54, t335);
			append(p54, code78);
			append(code78, t336);
			append(p54, t337);
			append(section6, t338);
			append(section6, p55);
			append(p55, strong9);
			append(strong9, t339);
			append(strong9, code79);
			append(code79, t340);
			append(strong9, t341);
			append(strong9, code80);
			append(code80, t342);
			append(strong9, t343);
			append(section6, t344);
			append(section6, pre21);
			pre21.innerHTML = raw21_value;
			append(section6, t345);
			append(section6, p56);
			append(p56, a22);
			append(a22, t346);
			append(section6, t347);
			append(section6, p57);
			append(p57, t348);
			append(section6, t349);
			append(section6, ul9);
			append(ul9, li23);
			append(li23, t350);
			append(li23, code81);
			append(code81, t351);
			append(li23, t352);
			append(ul9, t353);
			append(ul9, li24);
			append(li24, t354);
			append(li24, code82);
			append(code82, t355);
			append(li24, t356);
			append(li24, code83);
			append(code83, t357);
			append(li24, t358);
			append(ul9, t359);
			append(ul9, li25);
			append(li25, t360);
			append(li25, strong10);
			append(strong10, t361);
			append(li25, t362);
			append(li25, code84);
			append(code84, t363);
			append(li25, t364);
			append(li25, code85);
			append(code85, t365);
			append(li25, t366);
			append(section6, t367);
			append(section6, pre22);
			pre22.innerHTML = raw22_value;
			append(section6, t368);
			append(section6, blockquote2);
			append(blockquote2, p58);
			append(p58, t369);
			append(p58, code86);
			append(code86, t370);
			append(p58, t371);
			append(p58, code87);
			append(code87, t372);
			append(p58, t373);
			append(p58, code88);
			append(code88, t374);
			append(p58, t375);
			append(section6, t376);
			append(section6, p59);
			append(p59, t377);
			append(section6, t378);
			append(section6, p60);
			append(p60, t379);
			append(section6, t380);
			append(section6, p61);
			append(p61, t381);
			append(section6, t382);
			append(section6, pre23);
			pre23.innerHTML = raw23_value;
			append(section6, t383);
			append(section6, p62);
			append(p62, t384);
			append(p62, code89);
			append(code89, t385);
			append(p62, t386);
			append(p62, code90);
			append(code90, t387);
			append(p62, t388);
			append(section6, t389);
			append(section6, p63);
			append(p63, t390);
			append(p63, code91);
			append(code91, t391);
			append(p63, t392);
			append(p63, code92);
			append(code92, t393);
			append(p63, t394);
			append(p63, code93);
			append(code93, t395);
			append(p63, t396);
			append(p63, code94);
			append(code94, t397);
			append(p63, t398);
			append(p63, code95);
			append(code95, t399);
			append(p63, t400);
			append(p63, code96);
			append(code96, t401);
			append(p63, t402);
			append(p63, code97);
			append(code97, t403);
			append(p63, t404);
			append(p63, code98);
			append(code98, t405);
			append(p63, t406);
			append(p63, code99);
			append(code99, t407);
			append(p63, t408);
			append(p63, code100);
			append(code100, t409);
			append(p63, t410);
			append(p63, code101);
			append(code101, t411);
			append(p63, t412);
			append(p63, code102);
			append(code102, t413);
			append(p63, t414);
			append(section6, t415);
			append(section6, pre24);
			pre24.innerHTML = raw24_value;
			append(section6, t416);
			append(section6, p64);
			append(p64, t417);
			append(p64, code103);
			append(code103, t418);
			append(p64, t419);
			append(section6, t420);
			append(section6, p65);
			append(p65, t421);
			append(p65, code104);
			append(code104, t422);
			append(p65, t423);
			append(p65, code105);
			append(code105, t424);
			append(p65, t425);
			append(section6, t426);
			append(section6, pre25);
			pre25.innerHTML = raw25_value;
			append(section6, t427);
			append(section6, p66);
			append(p66, t428);
			append(p66, code106);
			append(code106, t429);
			append(p66, t430);
			append(p66, code107);
			append(code107, t431);
			append(p66, t432);
			append(p66, code108);
			append(code108, t433);
			append(p66, t434);
			append(p66, code109);
			append(code109, t435);
			append(p66, t436);
			append(section6, t437);
			append(section6, pre26);
			pre26.innerHTML = raw26_value;
			append(section6, t438);
			append(section6, p67);
			append(p67, t439);
			append(p67, code110);
			append(code110, t440);
			append(p67, t441);
			append(p67, code111);
			append(code111, t442);
			append(p67, t443);
			append(section6, t444);
			append(section6, p68);
			append(p68, t445);
			append(p68, code112);
			append(code112, t446);
			append(p68, t447);
			append(p68, code113);
			append(code113, t448);
			append(p68, t449);
			append(p68, a23);
			append(a23, t450);
			append(p68, t451);
			append(p68, code114);
			append(code114, t452);
			append(p68, t453);
			append(p68, code115);
			append(code115, t454);
			append(p68, t455);
			append(section6, t456);
			append(section6, p69);
			append(p69, strong11);
			append(strong11, t457);
			append(strong11, code116);
			append(code116, t458);
			append(strong11, t459);
			append(section6, t460);
			append(section6, p70);
			append(p70, t461);
			append(p70, code117);
			append(code117, t462);
			append(p70, t463);
			append(section6, t464);
			append(section6, pre27);
			pre27.innerHTML = raw27_value;
			append(section6, t465);
			append(section6, p71);
			append(p71, t466);
			append(p71, code118);
			append(code118, t467);
			append(p71, t468);
			append(p71, code119);
			append(code119, t469);
			append(p71, t470);
			append(p71, code120);
			append(code120, t471);
			append(p71, t472);
			append(p71, code121);
			append(code121, t473);
			append(p71, t474);
			append(section6, t475);
			append(section6, p72);
			append(p72, t476);
			append(p72, code122);
			append(code122, t477);
			append(p72, t478);
			append(p72, code123);
			append(code123, t479);
			append(p72, t480);
			append(p72, code124);
			append(code124, t481);
			append(p72, t482);
			append(p72, code125);
			append(code125, t483);
			append(p72, t484);
			append(p72, code126);
			append(code126, t485);
			append(p72, t486);
			insert(target, t487, anchor);
			insert(target, section7, anchor);
			append(section7, h23);
			append(h23, a24);
			append(a24, t488);
			append(section7, t489);
			append(section7, p73);
			append(p73, t490);
			append(p73, code127);
			append(code127, t491);
			append(p73, t492);
			append(p73, code128);
			append(code128, t493);
			append(p73, t494);
			append(p73, code129);
			append(code129, t495);
			append(p73, t496);
			append(section7, t497);
			append(section7, p74);
			append(p74, t498);
			append(p74, a25);
			append(a25, t499);
			append(p74, t500);
			append(section7, t501);
			append(section7, p75);
			append(p75, t502);
			append(p75, code130);
			append(code130, t503);
			append(p75, t504);
		},
		p: noop,
		d(detaching) {
			if (detaching) detach(section0);
			if (detaching) detach(t7);
			if (detaching) detach(p0);
			if (detaching) detach(t11);
			if (detaching) detach(p1);
			if (detaching) detach(t15);
			if (detaching) detach(p2);
			if (detaching) detach(t17);
			if (detaching) detach(section1);
			if (detaching) detach(t44);
			if (detaching) detach(section2);
			if (detaching) detach(t54);
			if (detaching) detach(section3);
			if (detaching) detach(t116);
			if (detaching) detach(section4);
			if (detaching) detach(t149);
			if (detaching) detach(section5);
			if (detaching) detach(t266);
			if (detaching) detach(section6);
			if (detaching) detach(t487);
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
	"title": "Compile Svelte in your head (Part 4)",
	"date": "2020-09-22T08:00:00Z",
	"tags": ["Svelte", "JavaScript"],
	"series": "Compile Svelte in your head",
	"slug": "compile-svelte-in-your-head-part-4",
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

  if (document.querySelector('.twitter-tweet')) {
    const script = document.createElement('script');
    script.async = true;
    script.src = 'https://platform.twitter.com/widgets.js';
    script.charset = 'utf-8';
    document.body.appendChild(script);
  }

  // TODO
  if ('loading' in HTMLImageElement.prototype) {
    const images = document.querySelectorAll('img[loading="lazy"]');
    images.forEach(img => {
      img.src = img.dataset.src;
    });
  } else {
    const script = document.createElement('script');
    script.src =
      'https://cdnjs.cloudflare.com/ajax/libs/lazysizes/5.1.2/lazysizes.min.js';
    document.body.appendChild(script);
  }
}, 3000);
