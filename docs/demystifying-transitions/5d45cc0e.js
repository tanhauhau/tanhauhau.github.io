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

var image = "https://lihautan.com/demystifying-transitions/assets/hero-twitter-2dabccfc.jpg";

/* src/layout/talk.svelte generated by Svelte v3.24.0 */

function get_each_context(ctx, list, i) {
	const child_ctx = ctx.slice();
	child_ctx[9] = list[i];
	return child_ctx;
}

function get_each_context_1(ctx, list, i) {
	const child_ctx = ctx.slice();
	child_ctx[9] = list[i];
	return child_ctx;
}

// (37:2) {#each tags as tag}
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
			attr(meta, "content", meta_content_value = /*tag*/ ctx[9]);
		},
		m(target, anchor) {
			insert(target, meta, anchor);
		},
		p(ctx, dirty) {
			if (dirty & /*tags*/ 4 && meta_content_value !== (meta_content_value = /*tag*/ ctx[9])) {
				attr(meta, "content", meta_content_value);
			}
		},
		d(detaching) {
			if (detaching) detach(meta);
		}
	};
}

// (76:2) {#each tags as tag}
function create_each_block(ctx) {
	let span;
	let t_value = /*tag*/ ctx[9] + "";
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
			attr(span, "class", "svelte-1hpcn1w");
		},
		m(target, anchor) {
			insert(target, span, anchor);
			append(span, t);
		},
		p(ctx, dirty) {
			if (dirty & /*tags*/ 4 && t_value !== (t_value = /*tag*/ ctx[9] + "")) set_data(t, t_value);
		},
		d(detaching) {
			if (detaching) detach(span);
		}
	};
}

// (81:2) {#if (occasion && occasionLink) || videoLink}
function create_if_block(ctx) {
	let div;
	let if_block0_anchor;
	let if_block0 = /*occasion*/ ctx[3] && /*occasionLink*/ ctx[4] && create_if_block_2(ctx);
	let if_block1 = /*videoLink*/ ctx[5] && create_if_block_1(ctx);

	return {
		c() {
			div = element("div");
			if (if_block0) if_block0.c();
			if_block0_anchor = empty();
			if (if_block1) if_block1.c();
			this.h();
		},
		l(nodes) {
			div = claim_element(nodes, "DIV", { class: true });
			var div_nodes = children(div);
			if (if_block0) if_block0.l(div_nodes);
			if_block0_anchor = empty();
			if (if_block1) if_block1.l(div_nodes);
			div_nodes.forEach(detach);
			this.h();
		},
		h() {
			attr(div, "class", "venue svelte-1hpcn1w");
		},
		m(target, anchor) {
			insert(target, div, anchor);
			if (if_block0) if_block0.m(div, null);
			append(div, if_block0_anchor);
			if (if_block1) if_block1.m(div, null);
		},
		p(ctx, dirty) {
			if (/*occasion*/ ctx[3] && /*occasionLink*/ ctx[4]) {
				if (if_block0) {
					if_block0.p(ctx, dirty);
				} else {
					if_block0 = create_if_block_2(ctx);
					if_block0.c();
					if_block0.m(div, if_block0_anchor);
				}
			} else if (if_block0) {
				if_block0.d(1);
				if_block0 = null;
			}

			if (/*videoLink*/ ctx[5]) {
				if (if_block1) {
					if_block1.p(ctx, dirty);
				} else {
					if_block1 = create_if_block_1(ctx);
					if_block1.c();
					if_block1.m(div, null);
				}
			} else if (if_block1) {
				if_block1.d(1);
				if_block1 = null;
			}
		},
		d(detaching) {
			if (detaching) detach(div);
			if (if_block0) if_block0.d();
			if (if_block1) if_block1.d();
		}
	};
}

// (82:23) {#if occasion && occasionLink}
function create_if_block_2(ctx) {
	let t0;
	let a;
	let t1;

	return {
		c() {
			t0 = text("Talk given at: ");
			a = element("a");
			t1 = text(/*occasion*/ ctx[3]);
			this.h();
		},
		l(nodes) {
			t0 = claim_text(nodes, "Talk given at: ");
			a = claim_element(nodes, "A", { href: true, class: true });
			var a_nodes = children(a);
			t1 = claim_text(a_nodes, /*occasion*/ ctx[3]);
			a_nodes.forEach(detach);
			this.h();
		},
		h() {
			attr(a, "href", /*occasionLink*/ ctx[4]);
			attr(a, "class", "svelte-1hpcn1w");
		},
		m(target, anchor) {
			insert(target, t0, anchor);
			insert(target, a, anchor);
			append(a, t1);
		},
		p(ctx, dirty) {
			if (dirty & /*occasion*/ 8) set_data(t1, /*occasion*/ ctx[3]);

			if (dirty & /*occasionLink*/ 16) {
				attr(a, "href", /*occasionLink*/ ctx[4]);
			}
		},
		d(detaching) {
			if (detaching) detach(t0);
			if (detaching) detach(a);
		}
	};
}

// (82:110) {#if videoLink}
function create_if_block_1(ctx) {
	let a;
	let t;

	return {
		c() {
			a = element("a");
			t = text("(Video)");
			this.h();
		},
		l(nodes) {
			a = claim_element(nodes, "A", { href: true, class: true });
			var a_nodes = children(a);
			t = claim_text(a_nodes, "(Video)");
			a_nodes.forEach(detach);
			this.h();
		},
		h() {
			attr(a, "href", /*videoLink*/ ctx[5]);
			attr(a, "class", "svelte-1hpcn1w");
		},
		m(target, anchor) {
			insert(target, a, anchor);
			append(a, t);
		},
		p(ctx, dirty) {
			if (dirty & /*videoLink*/ 32) {
				attr(a, "href", /*videoLink*/ ctx[5]);
			}
		},
		d(detaching) {
			if (detaching) detach(a);
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
		author: /*jsonLdAuthor*/ ctx[6],
		copyrightHolder: /*jsonLdAuthor*/ ctx[6],
		copyrightYear: "2020",
		creator: /*jsonLdAuthor*/ ctx[6],
		publisher: /*jsonLdAuthor*/ ctx[6],
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
					"@id": "https%3A%2F%2Flihautan.com%2Fdemystifying-transitions",
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
	let t7;
	let article;
	let t8;
	let footer;
	let newsletter;
	let t9;
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

	let if_block = (/*occasion*/ ctx[3] && /*occasionLink*/ ctx[4] || /*videoLink*/ ctx[5]) && create_if_block(ctx);
	const default_slot_template = /*$$slots*/ ctx[8].default;
	const default_slot = create_slot(default_slot_template, ctx, /*$$scope*/ ctx[7], null);
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
			if (if_block) if_block.c();
			t7 = space();
			article = element("article");
			if (default_slot) default_slot.c();
			t8 = space();
			footer = element("footer");
			create_component(newsletter.$$.fragment);
			t9 = space();
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
			if (if_block) if_block.l(main_nodes);
			t7 = claim_space(main_nodes);
			article = claim_element(main_nodes, "ARTICLE", {});
			var article_nodes = children(article);
			if (default_slot) default_slot.l(article_nodes);
			article_nodes.forEach(detach);
			main_nodes.forEach(detach);
			t8 = claim_space(nodes);
			footer = claim_element(nodes, "FOOTER", { class: true });
			var footer_nodes = children(footer);
			claim_component(newsletter.$$.fragment, footer_nodes);
			t9 = claim_space(footer_nodes);
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
			attr(meta11, "content", "https%3A%2F%2Flihautan.com%2Fdemystifying-transitions");
			attr(meta12, "itemprop", "image");
			attr(meta12, "content", image);
			html_tag = new HtmlTag(html_anchor);
			html_tag_1 = new HtmlTag(html_anchor_1);
			attr(a, "href", "#content");
			attr(a, "class", "skip svelte-1hpcn1w");
			attr(main, "id", "content");
			attr(main, "class", "blog svelte-1hpcn1w");
			attr(footer, "class", "svelte-1hpcn1w");
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
			if (if_block) if_block.m(main, null);
			append(main, t7);
			append(main, article);

			if (default_slot) {
				default_slot.m(article, null);
			}

			insert(target, t8, anchor);
			insert(target, footer, anchor);
			mount_component(newsletter, footer, null);
			append(footer, t9);
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
				author: /*jsonLdAuthor*/ ctx[6],
				copyrightHolder: /*jsonLdAuthor*/ ctx[6],
				copyrightYear: "2020",
				creator: /*jsonLdAuthor*/ ctx[6],
				publisher: /*jsonLdAuthor*/ ctx[6],
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
							"@id": "https%3A%2F%2Flihautan.com%2Fdemystifying-transitions",
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

			if (/*occasion*/ ctx[3] && /*occasionLink*/ ctx[4] || /*videoLink*/ ctx[5]) {
				if (if_block) {
					if_block.p(ctx, dirty);
				} else {
					if_block = create_if_block(ctx);
					if_block.c();
					if_block.m(main, t7);
				}
			} else if (if_block) {
				if_block.d(1);
				if_block = null;
			}

			if (default_slot) {
				if (default_slot.p && dirty & /*$$scope*/ 128) {
					update_slot(default_slot, default_slot_template, ctx, /*$$scope*/ ctx[7], dirty, null, null);
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
			if (if_block) if_block.d();
			if (default_slot) default_slot.d(detaching);
			if (detaching) detach(t8);
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
	let { occasion } = $$props;
	let { occasionLink } = $$props;
	let { videoLink } = $$props;
	const jsonLdAuthor = { ["@type"]: "Person", name: "Tan Li Hau" };
	let { $$slots = {}, $$scope } = $$props;

	$$self.$set = $$props => {
		if ("title" in $$props) $$invalidate(0, title = $$props.title);
		if ("description" in $$props) $$invalidate(1, description = $$props.description);
		if ("tags" in $$props) $$invalidate(2, tags = $$props.tags);
		if ("occasion" in $$props) $$invalidate(3, occasion = $$props.occasion);
		if ("occasionLink" in $$props) $$invalidate(4, occasionLink = $$props.occasionLink);
		if ("videoLink" in $$props) $$invalidate(5, videoLink = $$props.videoLink);
		if ("$$scope" in $$props) $$invalidate(7, $$scope = $$props.$$scope);
	};

	return [
		title,
		description,
		tags,
		occasion,
		occasionLink,
		videoLink,
		jsonLdAuthor,
		$$scope,
		$$slots
	];
}

class Talk extends SvelteComponent {
	constructor(options) {
		super();

		init(this, options, instance$2, create_fragment$2, safe_not_equal, {
			title: 0,
			description: 1,
			tags: 2,
			occasion: 3,
			occasionLink: 4,
			videoLink: 5
		});
	}
}

/* content/talk/demystifying-transitions/@@page-markup.svelte generated by Svelte v3.24.0 */

function create_default_slot(ctx) {
	let section0;
	let ul1;
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
	let li5;
	let a5;
	let t5;
	let li6;
	let a6;
	let t6;
	let li7;
	let a7;
	let t7;
	let li8;
	let a8;
	let t8;
	let li9;
	let a9;
	let t9;
	let t10;
	let section1;
	let h20;
	let a10;
	let t11;
	let t12;
	let p0;
	let t13;
	let a11;
	let t14;
	let t15;
	let t16;
	let section2;
	let h21;
	let a12;
	let t17;
	let t18;
	let p1;
	let t19;
	let t20;
	let p2;
	let t21;
	let t22;
	let p3;
	let t23;
	let t24;
	let p4;
	let t25;
	let t26;
	let p5;
	let t27;
	let t28;
	let p6;
	let t29;
	let code0;
	let t30;
	let t31;
	let t32;
	let section3;
	let h30;
	let a13;
	let t33;
	let t34;
	let p7;
	let t35;
	let t36;
	let p8;
	let t37;
	let t38;
	let p9;
	let t39;
	let t40;
	let section4;
	let h31;
	let a14;
	let t41;
	let code1;
	let t42;
	let t43;
	let t44;
	let p10;
	let t45;
	let code2;
	let t46;
	let t47;
	let t48;
	let p11;
	let t49;
	let code3;
	let t50;
	let t51;
	let code4;
	let t52;
	let t53;
	let code5;
	let t54;
	let t55;
	let t56;
	let p12;
	let t57;
	let t58;
	let p13;
	let t59;
	let code6;
	let t60;
	let t61;
	let code7;
	let t62;
	let t63;
	let t64;
	let p14;
	let t65;
	let code8;
	let t66;
	let t67;
	let code9;
	let t68;
	let t69;
	let t70;
	let p15;
	let t71;
	let code10;
	let t72;
	let t73;
	let code11;
	let t74;
	let t75;
	let code12;
	let t76;
	let t77;
	let code13;
	let t78;
	let t79;
	let t80;
	let section5;
	let h32;
	let a15;
	let t81;
	let code14;
	let t82;
	let t83;
	let t84;
	let p16;
	let t85;
	let code15;
	let t86;
	let t87;
	let t88;
	let p17;
	let t89;
	let code16;
	let t90;
	let t91;
	let code17;
	let t92;
	let t93;
	let code18;
	let t94;
	let t95;
	let code19;
	let t96;
	let t97;
	let t98;
	let p18;
	let t99;
	let t100;
	let p19;
	let t101;
	let t102;
	let p20;
	let t103;
	let code20;
	let t104;
	let t105;
	let code21;
	let t106;
	let t107;
	let code22;
	let t108;
	let t109;
	let code23;
	let t110;
	let t111;
	let code24;
	let t112;
	let t113;
	let t114;
	let p21;
	let t115;
	let t116;
	let p22;
	let t117;
	let t118;
	let section6;
	let h33;
	let a16;
	let t119;
	let t120;
	let p23;
	let t121;
	let t122;
	let p24;
	let t123;
	let t124;
	let p25;
	let t125;
	let t126;
	let p26;
	let t127;
	let t128;
	let p27;
	let t129;
	let t130;
	let p28;
	let t131;
	let code25;
	let t132;
	let t133;
	let t134;
	let p29;
	let t135;
	let code26;
	let t136;
	let t137;
	let t138;
	let p30;
	let t139;
	let t140;
	let p31;
	let t141;
	let code27;
	let t142;
	let t143;
	let code28;
	let t144;
	let t145;
	let t146;
	let p32;
	let t147;
	let t148;
	let p33;
	let t149;
	let t150;
	let p34;
	let t151;
	let code29;
	let t152;
	let t153;
	let t154;
	let p35;
	let t155;
	let code30;
	let t156;
	let t157;
	let code31;
	let t158;
	let t159;
	let code32;
	let t160;
	let t161;
	let code33;
	let t162;
	let t163;
	let code34;
	let t164;
	let t165;
	let code35;
	let t166;
	let t167;
	let t168;
	let p36;
	let t169;
	let code36;
	let t170;
	let t171;
	let code37;
	let t172;
	let t173;
	let t174;
	let p37;
	let t175;
	let code38;
	let t176;
	let t177;
	let code39;
	let t178;
	let t179;
	let t180;
	let p38;
	let t181;
	let t182;
	let p39;
	let t183;
	let code40;
	let t184;
	let t185;
	let code41;
	let t186;
	let t187;
	let code42;
	let t188;
	let t189;
	let code43;
	let t190;
	let t191;
	let code44;
	let t192;
	let t193;
	let t194;
	let p40;
	let t195;
	let code45;
	let t196;
	let t197;
	let code46;
	let t198;
	let t199;
	let code47;
	let t200;
	let t201;
	let code48;
	let t202;
	let t203;
	let code49;
	let t204;
	let t205;
	let code50;
	let t206;
	let t207;
	let t208;
	let p41;
	let t209;
	let code51;
	let t210;
	let t211;
	let t212;
	let p42;
	let t213;
	let code52;
	let t214;
	let t215;
	let code53;
	let t216;
	let t217;
	let code54;
	let t218;
	let t219;
	let t220;
	let p43;
	let t221;
	let code55;
	let t222;
	let t223;
	let t224;
	let p44;
	let t225;
	let t226;
	let p45;
	let t227;
	let t228;
	let p46;
	let a17;
	let t229;
	let t230;
	let p47;
	let t231;
	let t232;
	let p48;
	let t233;
	let t234;
	let p49;
	let t235;
	let code56;
	let t236;
	let t237;
	let strong0;
	let t238;
	let t239;
	let p50;
	let t240;
	let t241;
	let section7;
	let h34;
	let a18;
	let t242;
	let t243;
	let p51;
	let t244;
	let t245;
	let p52;
	let t246;
	let t247;
	let p53;
	let t248;
	let t249;
	let p54;
	let t250;
	let t251;
	let p55;
	let t252;
	let t253;
	let p56;
	let t254;
	let t255;
	let p57;
	let t256;
	let t257;
	let p58;
	let t258;
	let code57;
	let t259;
	let t260;
	let t261;
	let p59;
	let t262;
	let code58;
	let t263;
	let t264;
	let strong1;
	let t265;
	let t266;
	let t267;
	let p60;
	let strong2;
	let t268;
	let t269;
	let p61;
	let t270;
	let t271;
	let p62;
	let code59;
	let t272;
	let t273;
	let t274;
	let p63;
	let t275;
	let code60;
	let t276;
	let t277;
	let code61;
	let t278;
	let t279;
	let t280;
	let p64;
	let t281;
	let code62;
	let t282;
	let t283;
	let t284;
	let p65;
	let t285;
	let t286;
	let section8;
	let h35;
	let a19;
	let t287;
	let t288;
	let pre;

	let raw_value = `<code class="language-js"><span class="token keyword">const</span> app <span class="token operator">=</span> document<span class="token punctuation">.</span><span class="token function">getElementById</span><span class="token punctuation">(</span><span class="token string">"app"</span><span class="token punctuation">)</span><span class="token punctuation">;</span>

<span class="token keyword">const</span> <span class="token punctuation">[</span>btn1<span class="token punctuation">,</span> btn2<span class="token punctuation">]</span> <span class="token operator">=</span> app<span class="token punctuation">.</span><span class="token function">querySelectorAll</span><span class="token punctuation">(</span><span class="token string">"button"</span><span class="token punctuation">)</span><span class="token punctuation">;</span>
btn1<span class="token punctuation">.</span><span class="token function">addEventListener</span><span class="token punctuation">(</span><span class="token string">"click"</span><span class="token punctuation">,</span> insertNewItem<span class="token punctuation">)</span><span class="token punctuation">;</span>
btn2<span class="token punctuation">.</span><span class="token function">addEventListener</span><span class="token punctuation">(</span><span class="token string">"click"</span><span class="token punctuation">,</span> removeLastItem<span class="token punctuation">)</span><span class="token punctuation">;</span>

<span class="token keyword">let</span> ul <span class="token operator">=</span> app<span class="token punctuation">.</span><span class="token function">querySelector</span><span class="token punctuation">(</span><span class="token string">"ul"</span><span class="token punctuation">)</span><span class="token punctuation">;</span>
<span class="token keyword">let</span> list <span class="token operator">=</span> <span class="token punctuation">[</span><span class="token punctuation">]</span><span class="token punctuation">;</span>

<span class="token function">generateAnimation</span><span class="token punctuation">(</span><span class="token punctuation">)</span><span class="token punctuation">;</span>

<span class="token keyword">function</span> <span class="token function">insertNewItem</span><span class="token punctuation">(</span><span class="token punctuation">)</span> <span class="token punctuation">&#123;</span>
  <span class="token keyword">const</span> li <span class="token operator">=</span> document<span class="token punctuation">.</span><span class="token function">createElement</span><span class="token punctuation">(</span><span class="token string">"li"</span><span class="token punctuation">)</span><span class="token punctuation">;</span>
  li<span class="token punctuation">.</span>textContent <span class="token operator">=</span> <span class="token template-string"><span class="token template-punctuation string">&#96;</span><span class="token string">new item </span><span class="token interpolation"><span class="token interpolation-punctuation punctuation">$&#123;</span>list<span class="token punctuation">.</span>length<span class="token interpolation-punctuation punctuation">&#125;</span></span><span class="token template-punctuation string">&#96;</span></span><span class="token punctuation">;</span>
  ul<span class="token punctuation">.</span><span class="token function">append</span><span class="token punctuation">(</span>li<span class="token punctuation">)</span><span class="token punctuation">;</span>
  list<span class="token punctuation">.</span><span class="token function">push</span><span class="token punctuation">(</span>li<span class="token punctuation">)</span><span class="token punctuation">;</span>
  <span class="token function">transitionIn</span><span class="token punctuation">(</span>li<span class="token punctuation">,</span> <span class="token punctuation">&#123;</span>
    delay<span class="token punctuation">:</span> <span class="token number">0</span><span class="token punctuation">,</span>
    duration<span class="token punctuation">:</span> <span class="token number">500</span><span class="token punctuation">,</span>
    <span class="token function">css</span><span class="token punctuation">(</span><span class="token parameter">t<span class="token punctuation">,</span> u</span><span class="token punctuation">)</span> <span class="token punctuation">&#123;</span>
      <span class="token keyword">return</span> <span class="token template-string"><span class="token template-punctuation string">&#96;</span><span class="token string">transform: translateY(</span><span class="token interpolation"><span class="token interpolation-punctuation punctuation">$&#123;</span>u <span class="token operator">*</span> <span class="token number">50</span><span class="token interpolation-punctuation punctuation">&#125;</span></span><span class="token string">px)</span><span class="token template-punctuation string">&#96;</span></span><span class="token punctuation">;</span>
    <span class="token punctuation">&#125;</span><span class="token punctuation">,</span>
    <span class="token function">tick</span><span class="token punctuation">(</span><span class="token punctuation">)</span> <span class="token punctuation">&#123;</span>

    <span class="token punctuation">&#125;</span>
  <span class="token punctuation">&#125;</span><span class="token punctuation">)</span><span class="token punctuation">;</span>
<span class="token punctuation">&#125;</span>

<span class="token keyword">function</span> <span class="token function">generateAnimation</span><span class="token punctuation">(</span><span class="token punctuation">)</span> <span class="token punctuation">&#123;</span>
  <span class="token keyword">const</span> duration <span class="token operator">=</span> <span class="token number">2000</span><span class="token punctuation">;</span> <span class="token comment">// 2seconds</span>
  <span class="token keyword">const</span> keyframes <span class="token operator">=</span> Math<span class="token punctuation">.</span><span class="token function">ceil</span><span class="token punctuation">(</span>duration <span class="token operator">/</span> <span class="token number">16.66</span><span class="token punctuation">)</span><span class="token punctuation">;</span>

  <span class="token keyword">const</span> rules <span class="token operator">=</span> <span class="token template-string"><span class="token template-punctuation string">&#96;</span><span class="token string">
    @keyframes bounceIn &#123;
      </span><span class="token interpolation"><span class="token interpolation-punctuation punctuation">$&#123;</span><span class="token function">Array</span><span class="token punctuation">(</span>keyframes<span class="token punctuation">)</span><span class="token punctuation">.</span><span class="token function">fill</span><span class="token punctuation">(</span><span class="token keyword">null</span><span class="token punctuation">)</span><span class="token punctuation">.</span><span class="token function">map</span><span class="token punctuation">(</span><span class="token punctuation">(</span><span class="token parameter">_<span class="token punctuation">,</span> index</span><span class="token punctuation">)</span><span class="token operator">=></span> <span class="token punctuation">&#123;</span>
        <span class="token keyword">let</span> t <span class="token operator">=</span> index <span class="token operator">/</span> keyframes<span class="token punctuation">;</span>
        <span class="token keyword">let</span> eased_t <span class="token operator">=</span> <span class="token function">bounceOut</span><span class="token punctuation">(</span>t<span class="token punctuation">)</span><span class="token punctuation">;</span>

        <span class="token keyword">return</span> <span class="token template-string"><span class="token template-punctuation string">&#96;</span><span class="token interpolation"><span class="token interpolation-punctuation punctuation">$&#123;</span>t <span class="token operator">*</span> <span class="token number">100</span><span class="token interpolation-punctuation punctuation">&#125;</span></span><span class="token string">% &#123; transform: translateY(</span><span class="token interpolation"><span class="token interpolation-punctuation punctuation">$&#123;</span><span class="token punctuation">(</span><span class="token number">1</span> <span class="token operator">-</span> eased_t<span class="token punctuation">)</span> <span class="token operator">*</span> <span class="token number">50</span><span class="token interpolation-punctuation punctuation">&#125;</span></span><span class="token string">px) &#125;</span><span class="token template-punctuation string">&#96;</span></span><span class="token punctuation">;</span>
      <span class="token interpolation-punctuation punctuation">&#125;</span></span><span class="token string">).join('&#92;n')&#125;
      100% &#123; transform: translateY(0px); &#125;
    &#125;
  </span><span class="token template-punctuation string">&#96;</span></span><span class="token punctuation">;</span>

  <span class="token keyword">const</span> style <span class="token operator">=</span> document<span class="token punctuation">.</span><span class="token function">createElement</span><span class="token punctuation">(</span><span class="token string">'style'</span><span class="token punctuation">)</span><span class="token punctuation">;</span>
  document<span class="token punctuation">.</span>head<span class="token punctuation">.</span><span class="token function">appendChild</span><span class="token punctuation">(</span>style<span class="token punctuation">)</span><span class="token punctuation">;</span>
  style<span class="token punctuation">.</span>sheet<span class="token punctuation">.</span><span class="token function">insertRule</span><span class="token punctuation">(</span>rules<span class="token punctuation">)</span><span class="token punctuation">;</span>
<span class="token punctuation">&#125;</span>

<span class="token keyword">function</span> <span class="token function">removeLastItem</span><span class="token punctuation">(</span><span class="token punctuation">)</span> <span class="token punctuation">&#123;</span>
  <span class="token keyword">if</span> <span class="token punctuation">(</span>list<span class="token punctuation">.</span>length<span class="token punctuation">)</span> <span class="token punctuation">&#123;</span>
    <span class="token keyword">const</span> li <span class="token operator">=</span> list<span class="token punctuation">.</span><span class="token function">pop</span><span class="token punctuation">(</span><span class="token punctuation">)</span><span class="token punctuation">;</span>
    <span class="token keyword">const</span> text <span class="token operator">=</span> li<span class="token punctuation">.</span>textContent<span class="token punctuation">;</span>
    <span class="token function">transitionIn</span><span class="token punctuation">(</span>li<span class="token punctuation">,</span> <span class="token punctuation">&#123;</span>
      delay<span class="token punctuation">:</span> <span class="token number">0</span><span class="token punctuation">,</span>
      duration<span class="token punctuation">:</span> <span class="token number">500</span><span class="token punctuation">,</span>
      <span class="token function">css</span><span class="token punctuation">(</span><span class="token parameter">t<span class="token punctuation">,</span> u</span><span class="token punctuation">)</span> <span class="token punctuation">&#123;</span> <span class="token keyword">return</span> <span class="token string">''</span><span class="token punctuation">;</span> <span class="token punctuation">&#125;</span><span class="token punctuation">,</span>
      <span class="token function">tick</span><span class="token punctuation">(</span><span class="token parameter">t<span class="token punctuation">,</span> u</span><span class="token punctuation">)</span> <span class="token punctuation">&#123;</span>
        <span class="token keyword">if</span> <span class="token punctuation">(</span>t <span class="token operator">===</span> <span class="token number">1</span><span class="token punctuation">)</span> <span class="token punctuation">&#123;</span>
          ul<span class="token punctuation">.</span><span class="token function">removeChild</span><span class="token punctuation">(</span>li<span class="token punctuation">)</span><span class="token punctuation">;</span>
        <span class="token punctuation">&#125;</span> <span class="token keyword">else</span><span class="token punctuation">&#123;</span>
          li<span class="token punctuation">.</span>textContent <span class="token operator">=</span> text<span class="token punctuation">.</span><span class="token function">slice</span><span class="token punctuation">(</span><span class="token number">0</span><span class="token punctuation">,</span> Math<span class="token punctuation">.</span><span class="token function">round</span><span class="token punctuation">(</span>text<span class="token punctuation">.</span>length <span class="token operator">*</span> <span class="token punctuation">(</span><span class="token number">1</span> <span class="token operator">-</span> t<span class="token punctuation">)</span><span class="token punctuation">)</span><span class="token punctuation">)</span><span class="token punctuation">;</span>
        <span class="token punctuation">&#125;</span>
      <span class="token punctuation">&#125;</span>
    <span class="token punctuation">&#125;</span><span class="token punctuation">)</span><span class="token punctuation">;</span>
  <span class="token punctuation">&#125;</span>
<span class="token punctuation">&#125;</span>

<span class="token keyword">let</span> i <span class="token operator">=</span> <span class="token number">0</span><span class="token punctuation">;</span>
<span class="token keyword">function</span> <span class="token function">transitionIn</span><span class="token punctuation">(</span><span class="token parameter">element<span class="token punctuation">,</span> <span class="token punctuation">&#123;</span> duration<span class="token punctuation">,</span> delay<span class="token punctuation">,</span> easing<span class="token punctuation">,</span> css<span class="token punctuation">,</span> tick <span class="token punctuation">&#125;</span></span><span class="token punctuation">)</span> <span class="token punctuation">&#123;</span>
  <span class="token keyword">const</span> name <span class="token operator">=</span> <span class="token template-string"><span class="token template-punctuation string">&#96;</span><span class="token string">bounceIn</span><span class="token interpolation"><span class="token interpolation-punctuation punctuation">$&#123;</span>i<span class="token operator">++</span><span class="token interpolation-punctuation punctuation">&#125;</span></span><span class="token template-punctuation string">&#96;</span></span><span class="token punctuation">;</span>
  <span class="token keyword">const</span> keyframes <span class="token operator">=</span> Math<span class="token punctuation">.</span><span class="token function">ceil</span><span class="token punctuation">(</span>duration <span class="token operator">/</span> <span class="token number">16.66</span><span class="token punctuation">)</span><span class="token punctuation">;</span>
  <span class="token keyword">const</span> rules <span class="token operator">=</span> <span class="token template-string"><span class="token template-punctuation string">&#96;</span><span class="token string">
  @keyframes </span><span class="token interpolation"><span class="token interpolation-punctuation punctuation">$&#123;</span>name<span class="token interpolation-punctuation punctuation">&#125;</span></span><span class="token string"> &#123;
    </span><span class="token interpolation"><span class="token interpolation-punctuation punctuation">$&#123;</span><span class="token function">Array</span><span class="token punctuation">(</span>keyframes<span class="token punctuation">)</span><span class="token punctuation">.</span><span class="token function">fill</span><span class="token punctuation">(</span><span class="token keyword">null</span><span class="token punctuation">)</span><span class="token punctuation">.</span><span class="token function">map</span><span class="token punctuation">(</span><span class="token punctuation">(</span><span class="token parameter">_<span class="token punctuation">,</span> index</span><span class="token punctuation">)</span><span class="token operator">=></span> <span class="token punctuation">&#123;</span>
      <span class="token keyword">let</span> t <span class="token operator">=</span> index <span class="token operator">/</span> keyframes<span class="token punctuation">;</span>
      <span class="token keyword">let</span> eased_t <span class="token operator">=</span> <span class="token function">bounceOut</span><span class="token punctuation">(</span>t<span class="token punctuation">)</span><span class="token punctuation">;</span>

      <span class="token keyword">return</span> <span class="token template-string"><span class="token template-punctuation string">&#96;</span><span class="token interpolation"><span class="token interpolation-punctuation punctuation">$&#123;</span>t <span class="token operator">*</span> <span class="token number">100</span><span class="token interpolation-punctuation punctuation">&#125;</span></span><span class="token string">% &#123; </span><span class="token interpolation"><span class="token interpolation-punctuation punctuation">$&#123;</span><span class="token function">css</span><span class="token punctuation">(</span>eased_t<span class="token punctuation">,</span> <span class="token number">1</span> <span class="token operator">-</span> eased_t<span class="token punctuation">)</span><span class="token interpolation-punctuation punctuation">&#125;</span></span><span class="token string"> &#125;</span><span class="token template-punctuation string">&#96;</span></span><span class="token punctuation">;</span>
    <span class="token interpolation-punctuation punctuation">&#125;</span></span><span class="token string">).join('&#92;n')&#125;
    100% &#123; </span><span class="token interpolation"><span class="token interpolation-punctuation punctuation">$&#123;</span><span class="token function">css</span><span class="token punctuation">(</span><span class="token number">1</span><span class="token punctuation">,</span> <span class="token number">0</span><span class="token punctuation">)</span><span class="token interpolation-punctuation punctuation">&#125;</span></span><span class="token string"> &#125;
  &#125;
</span><span class="token template-punctuation string">&#96;</span></span><span class="token punctuation">;</span>
  <span class="token keyword">const</span> style <span class="token operator">=</span> document<span class="token punctuation">.</span><span class="token function">createElement</span><span class="token punctuation">(</span><span class="token string">'style'</span><span class="token punctuation">)</span><span class="token punctuation">;</span>
  document<span class="token punctuation">.</span>head<span class="token punctuation">.</span><span class="token function">appendChild</span><span class="token punctuation">(</span>style<span class="token punctuation">)</span><span class="token punctuation">;</span>
  style<span class="token punctuation">.</span>sheet<span class="token punctuation">.</span><span class="token function">insertRule</span><span class="token punctuation">(</span>rules<span class="token punctuation">)</span><span class="token punctuation">;</span>

  element<span class="token punctuation">.</span>style<span class="token punctuation">.</span>animation <span class="token operator">=</span> <span class="token template-string"><span class="token template-punctuation string">&#96;</span><span class="token interpolation"><span class="token interpolation-punctuation punctuation">$&#123;</span>name<span class="token interpolation-punctuation punctuation">&#125;</span></span><span class="token string"> </span><span class="token interpolation"><span class="token interpolation-punctuation punctuation">$&#123;</span>duration<span class="token interpolation-punctuation punctuation">&#125;</span></span><span class="token string">ms linear </span><span class="token interpolation"><span class="token interpolation-punctuation punctuation">$&#123;</span>delay<span class="token interpolation-punctuation punctuation">&#125;</span></span><span class="token string">ms 1 both</span><span class="token template-punctuation string">&#96;</span></span><span class="token punctuation">;</span>

  <span class="token comment">// js animation</span>
  <span class="token keyword">let</span> start <span class="token operator">=</span> Date<span class="token punctuation">.</span><span class="token function">now</span><span class="token punctuation">(</span><span class="token punctuation">)</span><span class="token punctuation">;</span>
  <span class="token keyword">let</span> end <span class="token operator">=</span> start <span class="token operator">+</span> duration<span class="token punctuation">;</span>
  <span class="token function">tick</span><span class="token punctuation">(</span><span class="token number">0</span><span class="token punctuation">,</span> <span class="token number">1</span><span class="token punctuation">)</span><span class="token punctuation">;</span>

  <span class="token keyword">function</span> <span class="token function">loop</span><span class="token punctuation">(</span><span class="token punctuation">)</span> <span class="token punctuation">&#123;</span>
    <span class="token keyword">let</span> now <span class="token operator">=</span> Date<span class="token punctuation">.</span><span class="token function">now</span><span class="token punctuation">(</span><span class="token punctuation">)</span><span class="token punctuation">;</span>
    <span class="token keyword">if</span> <span class="token punctuation">(</span>now <span class="token operator">></span> end<span class="token punctuation">)</span> <span class="token punctuation">&#123;</span>
      <span class="token function">tick</span><span class="token punctuation">(</span><span class="token number">1</span><span class="token punctuation">,</span> <span class="token number">0</span><span class="token punctuation">)</span><span class="token punctuation">;</span>
      <span class="token keyword">return</span><span class="token punctuation">;</span>
    <span class="token punctuation">&#125;</span>

    <span class="token keyword">let</span> t <span class="token operator">=</span> <span class="token punctuation">(</span>now <span class="token operator">-</span> start<span class="token punctuation">)</span> <span class="token operator">/</span> duration<span class="token punctuation">;</span>
    <span class="token keyword">let</span> eased_t <span class="token operator">=</span> t<span class="token punctuation">;</span>

    <span class="token function">tick</span><span class="token punctuation">(</span>eased_t<span class="token punctuation">,</span> <span class="token number">1</span> <span class="token operator">-</span> eased_t<span class="token punctuation">)</span><span class="token punctuation">;</span>
    <span class="token function">requestAnimationFrame</span><span class="token punctuation">(</span>loop<span class="token punctuation">)</span><span class="token punctuation">;</span>
  <span class="token punctuation">&#125;</span>
  <span class="token function">requestAnimationFrame</span><span class="token punctuation">(</span>loop<span class="token punctuation">)</span><span class="token punctuation">;</span>
<span class="token punctuation">&#125;</span>

<span class="token keyword">function</span> <span class="token function">startJsTransition</span><span class="token punctuation">(</span><span class="token parameter">element<span class="token punctuation">,</span> callback</span><span class="token punctuation">)</span> <span class="token punctuation">&#123;</span>
  <span class="token keyword">let</span> duration <span class="token operator">=</span> <span class="token number">2000</span><span class="token punctuation">;</span> <span class="token comment">// 2s</span>
  <span class="token keyword">let</span> start <span class="token operator">=</span> Date<span class="token punctuation">.</span><span class="token function">now</span><span class="token punctuation">(</span><span class="token punctuation">)</span><span class="token punctuation">;</span>
  <span class="token keyword">let</span> end <span class="token operator">=</span> start <span class="token operator">+</span> duration<span class="token punctuation">;</span>

  <span class="token keyword">const</span> text <span class="token operator">=</span> element<span class="token punctuation">.</span>textContent<span class="token punctuation">;</span>

  <span class="token keyword">function</span> <span class="token function">loop</span><span class="token punctuation">(</span><span class="token punctuation">)</span> <span class="token punctuation">&#123;</span>
    <span class="token keyword">let</span> now <span class="token operator">=</span> Date<span class="token punctuation">.</span><span class="token function">now</span><span class="token punctuation">(</span><span class="token punctuation">)</span><span class="token punctuation">;</span>
    <span class="token keyword">if</span> <span class="token punctuation">(</span>now <span class="token operator">></span> end<span class="token punctuation">)</span> <span class="token punctuation">&#123;</span>
      <span class="token function">callback</span><span class="token punctuation">(</span><span class="token punctuation">)</span><span class="token punctuation">;</span>
      <span class="token keyword">return</span><span class="token punctuation">;</span>
    <span class="token punctuation">&#125;</span>

    <span class="token keyword">let</span> t <span class="token operator">=</span> <span class="token punctuation">(</span>now <span class="token operator">-</span> start<span class="token punctuation">)</span> <span class="token operator">/</span> duration<span class="token punctuation">;</span>
    <span class="token keyword">let</span> eased_t <span class="token operator">=</span> t<span class="token punctuation">;</span>

    element<span class="token punctuation">.</span>textContent <span class="token operator">=</span> text<span class="token punctuation">.</span><span class="token function">slice</span><span class="token punctuation">(</span><span class="token number">0</span><span class="token punctuation">,</span> Math<span class="token punctuation">.</span><span class="token function">round</span><span class="token punctuation">(</span>text<span class="token punctuation">.</span>length <span class="token operator">*</span> <span class="token punctuation">(</span><span class="token number">1</span> <span class="token operator">-</span> eased_t<span class="token punctuation">)</span><span class="token punctuation">)</span><span class="token punctuation">)</span><span class="token punctuation">;</span>

    <span class="token function">requestAnimationFrame</span><span class="token punctuation">(</span>loop<span class="token punctuation">)</span><span class="token punctuation">;</span>
  <span class="token punctuation">&#125;</span>
  <span class="token function">requestAnimationFrame</span><span class="token punctuation">(</span>loop<span class="token punctuation">)</span><span class="token punctuation">;</span>
<span class="token punctuation">&#125;</span>

<span class="token keyword">export</span> <span class="token keyword">function</span> <span class="token function">bounceOut</span><span class="token punctuation">(</span><span class="token parameter">t</span><span class="token punctuation">)</span> <span class="token punctuation">&#123;</span>
	<span class="token keyword">const</span> a <span class="token operator">=</span> <span class="token number">4.0</span> <span class="token operator">/</span> <span class="token number">11.0</span><span class="token punctuation">;</span>
	<span class="token keyword">const</span> b <span class="token operator">=</span> <span class="token number">8.0</span> <span class="token operator">/</span> <span class="token number">11.0</span><span class="token punctuation">;</span>
	<span class="token keyword">const</span> c <span class="token operator">=</span> <span class="token number">9.0</span> <span class="token operator">/</span> <span class="token number">10.0</span><span class="token punctuation">;</span>

	<span class="token keyword">const</span> ca <span class="token operator">=</span> <span class="token number">4356.0</span> <span class="token operator">/</span> <span class="token number">361.0</span><span class="token punctuation">;</span>
	<span class="token keyword">const</span> cb <span class="token operator">=</span> <span class="token number">35442.0</span> <span class="token operator">/</span> <span class="token number">1805.0</span><span class="token punctuation">;</span>
	<span class="token keyword">const</span> cc <span class="token operator">=</span> <span class="token number">16061.0</span> <span class="token operator">/</span> <span class="token number">1805.0</span><span class="token punctuation">;</span>

	<span class="token keyword">const</span> t2 <span class="token operator">=</span> t <span class="token operator">*</span> t<span class="token punctuation">;</span>

	<span class="token keyword">return</span> t <span class="token operator">&lt;</span> a
		<span class="token operator">?</span> <span class="token number">7.5625</span> <span class="token operator">*</span> t2
		<span class="token punctuation">:</span> t <span class="token operator">&lt;</span> b
			<span class="token operator">?</span> <span class="token number">9.075</span> <span class="token operator">*</span> t2 <span class="token operator">-</span> <span class="token number">9.9</span> <span class="token operator">*</span> t <span class="token operator">+</span> <span class="token number">3.4</span>
			<span class="token punctuation">:</span> t <span class="token operator">&lt;</span> c
				<span class="token operator">?</span> ca <span class="token operator">*</span> t2 <span class="token operator">-</span> cb <span class="token operator">*</span> t <span class="token operator">+</span> cc
				<span class="token punctuation">:</span> <span class="token number">10.8</span> <span class="token operator">*</span> t <span class="token operator">*</span> t <span class="token operator">-</span> <span class="token number">20.52</span> <span class="token operator">*</span> t <span class="token operator">+</span> <span class="token number">10.72</span><span class="token punctuation">;</span>
<span class="token punctuation">&#125;</span></code>` + "";

	let t289;
	let section9;
	let h36;
	let a20;
	let code63;
	let t290;
	let t291;
	let t292;
	let p66;
	let t293;
	let t294;
	let p67;
	let t295;
	let code64;
	let t296;
	let t297;
	let code65;
	let t298;
	let t299;
	let t300;
	let p68;
	let t301;
	let code66;
	let t302;
	let t303;
	let t304;
	let p69;
	let t305;
	let code67;
	let t306;
	let t307;
	let code68;
	let t308;
	let t309;
	let t310;
	let p70;
	let t311;
	let t312;
	let p71;
	let t313;
	let code69;
	let t314;
	let t315;
	let code70;
	let t316;
	let t317;
	let t318;
	let p72;
	let t319;
	let code71;
	let t320;
	let t321;
	let code72;
	let t322;
	let t323;
	let code73;
	let t324;
	let t325;
	let code74;
	let t326;
	let t327;
	let code75;
	let t328;
	let t329;
	let code76;
	let t330;
	let t331;
	let code77;
	let t332;
	let t333;
	let t334;
	let p73;
	let t335;
	let t336;
	let p74;
	let t337;
	let t338;
	let p75;
	let t339;
	let code78;
	let t340;
	let t341;
	let code79;
	let t342;
	let t343;
	let code80;
	let t344;
	let t345;
	let code81;
	let t346;
	let t347;
	let code82;
	let t348;
	let t349;
	let code83;
	let t350;
	let t351;
	let code84;
	let t352;
	let t353;
	let t354;
	let p76;
	let t355;
	let t356;
	let p77;
	let t357;
	let code85;
	let t358;
	let t359;
	let t360;
	let p78;
	let t361;
	let code86;
	let t362;
	let t363;
	let t364;
	let p79;
	let t365;
	let code87;
	let t366;
	let t367;
	let code88;
	let t368;
	let t369;
	let code89;
	let t370;
	let t371;
	let code90;
	let t372;
	let t373;
	let t374;
	let p80;
	let t375;
	let code91;
	let t376;
	let t377;
	let code92;
	let t378;
	let t379;
	let code93;
	let t380;
	let t381;
	let code94;
	let t382;
	let t383;
	let code95;
	let t384;
	let t385;
	let t386;
	let p81;
	let t387;
	let t388;
	let p82;
	let t389;
	let code96;
	let t390;
	let t391;
	let code97;
	let t392;
	let t393;
	let t394;
	let p83;
	let t395;
	let code98;
	let t396;
	let t397;
	let t398;
	let p84;
	let t399;
	let code99;
	let t400;
	let t401;
	let t402;
	let p85;
	let t403;
	let code100;
	let t404;
	let t405;
	let code101;
	let t406;
	let t407;
	let t408;
	let p86;
	let t409;
	let t410;
	let p87;
	let t411;
	let t412;
	let ul5;
	let li12;
	let p88;
	let a21;
	let t413;
	let t414;
	let ul2;
	let li10;
	let code102;
	let t415;
	let t416;
	let code103;
	let t417;
	let t418;
	let li11;
	let code104;
	let t419;
	let t420;
	let code105;
	let t421;
	let t422;
	let code106;
	let t423;
	let t424;
	let li14;
	let p89;
	let a22;
	let t425;
	let t426;
	let ul3;
	let li13;
	let code107;
	let t427;
	let t428;
	let code108;
	let t429;
	let t430;
	let code109;
	let t431;
	let t432;
	let li16;
	let p90;
	let a23;
	let t433;
	let t434;
	let code110;
	let t435;
	let t436;
	let t437;
	let ul4;
	let li15;
	let code111;
	let t438;
	let t439;
	let code112;
	let t440;
	let t441;
	let code113;
	let t442;
	let t443;
	let code114;
	let t444;
	let t445;
	let t446;
	let p91;
	let t447;
	let code115;
	let t448;
	let t449;
	let code116;
	let t450;
	let t451;
	let code117;
	let t452;
	let t453;
	let t454;
	let p92;
	let t455;
	let t456;
	let p93;
	let t457;
	let code118;
	let t458;
	let t459;
	let code119;
	let t460;
	let t461;
	let code120;
	let t462;
	let t463;
	let code121;
	let t464;
	let t465;
	let code122;
	let t466;
	let t467;
	let t468;
	let section10;
	let h37;
	let a24;
	let t469;
	let t470;
	let p94;
	let t471;
	let t472;
	let p95;
	let t473;
	let t474;
	let p96;
	let t475;
	let a25;
	let t476;
	let t477;
	let t478;
	let p97;
	let t479;
	let a26;
	let t480;
	let t481;
	let t482;
	let p98;
	let t483;

	return {
		c() {
			section0 = element("section");
			ul1 = element("ul");
			li0 = element("li");
			a0 = element("a");
			t0 = text("Slides");
			li1 = element("li");
			a1 = element("a");
			t1 = text("Script");
			ul0 = element("ul");
			li2 = element("li");
			a2 = element("a");
			t2 = text("Who am I");
			li3 = element("li");
			a3 = element("a");
			t3 = text("Level 1. Using  transition: .");
			li4 = element("li");
			a4 = element("a");
			t4 = text("Level 2. The  transition:  contract.");
			li5 = element("li");
			a5 = element("a");
			t5 = text("Easing");
			li6 = element("li");
			a6 = element("a");
			t6 = text("Level 3, compile transition in your head.");
			li7 = element("li");
			a7 = element("a");
			t7 = text("Live Coding");
			li8 = element("li");
			a8 = element("a");
			t8 = text("transition:  in compiled JS");
			li9 = element("li");
			a9 = element("a");
			t9 = text("Recap");
			t10 = space();
			section1 = element("section");
			h20 = element("h2");
			a10 = element("a");
			t11 = text("Slides");
			t12 = space();
			p0 = element("p");
			t13 = text("[");
			a11 = element("a");
			t14 = text("Link to slides");
			t15 = text("] (Left arrow and right arrow to navigate)");
			t16 = space();
			section2 = element("section");
			h21 = element("h2");
			a12 = element("a");
			t17 = text("Script");
			t18 = space();
			p1 = element("p");
			t19 = text("Thank you for having me.");
			t20 = space();
			p2 = element("p");
			t21 = text("Transitions allow user to understand where thing comes from and where it goes to.");
			t22 = space();
			p3 = element("p");
			t23 = text("Much like the button over here, when I click on it, it fells into the center, and the title of my talk floats up from it.");
			t24 = space();
			p4 = element("p");
			t25 = text("Yes, today, I will demystify transitions in svelte. And how am I going to do it?");
			t26 = space();
			p5 = element("p");
			t27 = text("We will dive into Svelte transitions level-by-level.");
			t28 = space();
			p6 = element("p");
			t29 = text("We start at the first level, where we will learn how to use ");
			code0 = element("code");
			t30 = text("transition:");
			t31 = text(" in svelte.\nAs we reached the 2nd level, we'll look at how to author a transition in svelte.\nAt the 3rd level, we go deeper and take a look at how Svelte compiles and handle transitions under the hood.");
			t32 = space();
			section3 = element("section");
			h30 = element("h3");
			a13 = element("a");
			t33 = text("Who am I");
			t34 = space();
			p7 = element("p");
			t35 = text("My name is Tan Li Hau, I am a software engineer at Shopee. Shopee is a e-commerce platform in South east asia that is based in Singapore.");
			t36 = space();
			p8 = element("p");
			t37 = text("I grew up in a lovely town called penang in malaysia, which has the best street food in malaysia, such as char koay teow, stir-fry flat rice noodles; rojak, a eclectic fruit salad with palm sugar, peanuts and chilli dressing, and well, these are just one of the many great street foods that i hope to try again when I can go back after this coronavirus pandemic is over.");
			t38 = space();
			p9 = element("p");
			t39 = text("last but not the least, im one of the maintainers of svelte");
			t40 = space();
			section4 = element("section");
			h31 = element("h3");
			a14 = element("a");
			t41 = text("Level 1. Using ");
			code1 = element("code");
			t42 = text("transition:");
			t43 = text(".");
			t44 = space();
			p10 = element("p");
			t45 = text("Here, we have a list of items, rendered using the ");
			code2 = element("code");
			t46 = text("{#each}");
			t47 = text(" block. When we add or remove an item, the item appears and disappears in an instant. we have no idea where the item is coming from, or disappear into.");
			t48 = space();
			p11 = element("p");
			t49 = text("To add transition for the items, firstly, we import a transition from ");
			code3 = element("code");
			t50 = text("svelte/transtion");
			t51 = text(". here we import fade. to add an entrance transition for the item, we add ");
			code4 = element("code");
			t52 = text("in");
			t53 = text(" colon ");
			code5 = element("code");
			t54 = text("fade");
			t55 = text(".");
			t56 = space();
			p12 = element("p");
			t57 = text("Now the item fades into existence.");
			t58 = space();
			p13 = element("p");
			t59 = text("To customise the transition, we can add parameters. such as duration, or delay. For exit transition, we use ");
			code6 = element("code");
			t60 = text("out");
			t61 = text(" colon ");
			code7 = element("code");
			t62 = text("fade");
			t63 = text(".");
			t64 = space();
			p14 = element("p");
			t65 = text("If you want both entrance and exit transtion, you can use ");
			code8 = element("code");
			t66 = text("transition");
			t67 = text(" colon ");
			code9 = element("code");
			t68 = text("transition name");
			t69 = text(".");
			t70 = space();
			p15 = element("p");
			t71 = text("There are multiple built-in transitions in svelte, such as ");
			code10 = element("code");
			t72 = text("fly");
			t73 = text(", ");
			code11 = element("code");
			t74 = text("slide");
			t75 = text(", ");
			code12 = element("code");
			t76 = text("scale");
			t77 = text(", ");
			code13 = element("code");
			t78 = text("blur");
			t79 = text(" and more. this list is not exhaustive, which i recommend you to check them out in the docs as well as the tutorials.");
			t80 = space();
			section5 = element("section");
			h32 = element("h3");
			a15 = element("a");
			t81 = text("Level 2. The ");
			code14 = element("code");
			t82 = text("transition:");
			t83 = text(" contract.");
			t84 = space();
			p16 = element("p");
			t85 = text("Not sure if you've heard about the store contract in svelte, which states that, if any object follows the store contract, that object can be used like a store, where you can subscribe to it and read the value like a store using the ");
			code15 = element("code");
			t86 = text("$");
			t87 = text("-prefix.");
			t88 = space();
			p17 = element("p");
			t89 = text("The same thing goes with the ");
			code16 = element("code");
			t90 = text("transition");
			t91 = text(". A transition has a contract. Any function that follows the transition contract, can be used together with the ");
			code17 = element("code");
			t92 = text("in:");
			t93 = text(", ");
			code18 = element("code");
			t94 = text("out:");
			t95 = text(" or ");
			code19 = element("code");
			t96 = text("transition:");
			t97 = text(" directives.");
			t98 = space();
			p18 = element("p");
			t99 = text("Here is how the transition function should look like. It's a function that takes in 2 parameters, the element node that the transition is applied to, and the parameter that is passed into the transition.");
			t100 = space();
			p19 = element("p");
			t101 = text("And, it should return an object that describes the transition, or return a function that returns that object.");
			t102 = space();
			p20 = element("p");
			t103 = text("The object should contain properties such as ");
			code20 = element("code");
			t104 = text("delay");
			t105 = text(", in milliseconds, how long before the transition starts; ");
			code21 = element("code");
			t106 = text("duration");
			t107 = text(", in millisecond, how long the transition takes; ");
			code22 = element("code");
			t108 = text("easing");
			t109 = text(", the easing function, which I'll explained later together with; ");
			code23 = element("code");
			t110 = text("css");
			t111 = text(", a function that returns a css string; and ");
			code24 = element("code");
			t112 = text("tick");
			t113 = text(" a callback function.");
			t114 = space();
			p21 = element("p");
			t115 = text("All of the properties are optional, if not specified, the default for delay is 0ms, the default for duration is 300ms, and the default easing is linear.");
			t116 = space();
			p22 = element("p");
			t117 = text("Usually you would want the transition to be customisable, that's where the parameter is for you can return the delay or duration, passed into the parameter from the user.");
			t118 = space();
			section6 = element("section");
			h33 = element("h3");
			a16 = element("a");
			t119 = text("Easing");
			t120 = space();
			p23 = element("p");
			t121 = text("Now, let's talk about easing.");
			t122 = space();
			p24 = element("p");
			t123 = text("Easing describes how much an animation progresses at different point of time throughout the animation.");
			t124 = space();
			p25 = element("p");
			t125 = text("For convenience sake, we describe time from 0 to 1, begins with 0% and ends in a 100%.");
			t126 = space();
			p26 = element("p");
			t127 = text("Here, as the red dot moves from time 0 to 1 along the red line, the value of eased time moves from 0 to 1 as well.");
			t128 = space();
			p27 = element("p");
			t129 = text("The easing function that we are looking at now, is the linear function. The eased value grows linearly with time.");
			t130 = space();
			p28 = element("p");
			t131 = text("However if I switch to ");
			code25 = element("code");
			t132 = text("cubicIn");
			t133 = text(", the eased value grows in the power of 3 with time.");
			t134 = space();
			p29 = element("p");
			t135 = text("This is described by the ");
			code26 = element("code");
			t136 = text("cubicIn");
			t137 = text(" function.");
			t138 = space();
			p30 = element("p");
			t139 = text("Here's why we use 0 to 1 for time, because 0 power 3 is 0, and 1 power 3 is still 1. So after we power 3 the value of time, we still starts with 0 and ends in 1.");
			t140 = space();
			p31 = element("p");
			t141 = text("Well, the easing function does not have to be a polynomial function, you can have if-else case in your easing function, like the ");
			code27 = element("code");
			t142 = text("bounceOut");
			t143 = text(", or calling another function like (bounceInOut) ");
			code28 = element("code");
			t144 = text("bounceInOut");
			t145 = text(".");
			t146 = space();
			p32 = element("p");
			t147 = text("So, how do we calculate the time?");
			t148 = space();
			p33 = element("p");
			t149 = text("At the beginning of the transition, we record the start time.");
			t150 = space();
			p34 = element("p");
			t151 = text("Throughout the transition, we have ");
			code29 = element("code");
			t152 = text("t");
			t153 = text(", the time passed since the starting time, in milliseconds.");
			t154 = space();
			p35 = element("p");
			t155 = text("We divide the value of ");
			code30 = element("code");
			t156 = text("t");
			t157 = text(" by the duration of the transition, so now we get the value from ");
			code31 = element("code");
			t158 = text("0");
			t159 = text(" to ");
			code32 = element("code");
			t160 = text("1");
			t161 = text(" for ");
			code33 = element("code");
			t162 = text("t");
			t163 = text(", ");
			code34 = element("code");
			t164 = text("0");
			t165 = text(" in the beginning of the transition, and ");
			code35 = element("code");
			t166 = text("1");
			t167 = text(" at the end of the transition.");
			t168 = space();
			p36 = element("p");
			t169 = text("Now if I pass in the value of ");
			code36 = element("code");
			t170 = text("t");
			t171 = text(" into the easing function, in this case ");
			code37 = element("code");
			t172 = text("bounceInOut");
			t173 = text(", I'll get the eased value.");
			t174 = space();
			p37 = element("p");
			t175 = text("The value does not go from ");
			code38 = element("code");
			t176 = text("0");
			t177 = text(" to ");
			code39 = element("code");
			t178 = text("1");
			t179 = text(" directly, it goes to 0.05, back to 0, 0.14~5, back to 0, all the 1, 0.85, 1, 0.95, 1.");
			t180 = space();
			p38 = element("p");
			t181 = text("And if I use this eased value to calculate how much I need to translate an element, I'll get an element that bounce in out.");
			t182 = space();
			p39 = element("p");
			t183 = text("And that's how the css function works. it takes in ");
			code40 = element("code");
			t184 = text("t");
			t185 = text(", and you return a css style in string, that will be applied to the element. You also have ");
			code41 = element("code");
			t186 = text("u");
			t187 = text(", the 2nd paramter, which is ");
			code42 = element("code");
			t188 = text("1 - t");
			t189 = text(", the inverse of ");
			code43 = element("code");
			t190 = text("t");
			t191 = text(". as you can see if you use ");
			code44 = element("code");
			t192 = text("u");
			t193 = text(" instead, then the element moves in the opposite direction.");
			t194 = space();
			p40 = element("p");
			t195 = text("So, if you transition an element into the view, the ");
			code45 = element("code");
			t196 = text("t");
			t197 = text(" will go from ");
			code46 = element("code");
			t198 = text("0");
			t199 = text(" to ");
			code47 = element("code");
			t200 = text("1");
			t201 = text(", but if you transition an element out of the view, ");
			code48 = element("code");
			t202 = text("t");
			t203 = text(" will go from ");
			code49 = element("code");
			t204 = text("1");
			t205 = text(" to ");
			code50 = element("code");
			t206 = text("0");
			t207 = text(".");
			t208 = space();
			p41 = element("p");
			t209 = text("And, if you want to manipulate the element beyond CSS, you can use the ");
			code51 = element("code");
			t210 = text("tick");
			t211 = text(" function.");
			t212 = space();
			p42 = element("p");
			t213 = text("It also takes in the ");
			code52 = element("code");
			t214 = text("t");
			t215 = text(" and ");
			code53 = element("code");
			t216 = text("u");
			t217 = text(" the same way as the ");
			code54 = element("code");
			t218 = text("css");
			t219 = text(" function.");
			t220 = space();
			p43 = element("p");
			t221 = text("One very common use case of this ");
			code55 = element("code");
			t222 = text("tick");
			t223 = text(" function is to create a typewriter transition.");
			t224 = space();
			p44 = element("p");
			t225 = text("Do take note that, the tick function is going to be called on every frame, if you want your application to be buttery smooth 60 frames per second, make sure the tick function is fast to prevent jank.");
			t226 = space();
			p45 = element("p");
			t227 = text("So we've covered all the properties in the transtion contract, let's take an example of a custom transition");
			t228 = space();
			p46 = element("p");
			a17 = element("a");
			t229 = text("REPL");
			t230 = space();
			p47 = element("p");
			t231 = text("Here I applied different font styles to the element, so the text stays bold and maroon for the 1st 40% of the time, then italic the next 40% of time, and then back to regular text.");
			t232 = space();
			p48 = element("p");
			t233 = text("Well, 40% of time is debatable depending on the easing function, in this case we are using linear easing, so it is exactly 40%.");
			t234 = space();
			p49 = element("p");
			t235 = text("As you can see, you don't have to limit your css transition to just CSS transform, or having to interpolate the value of ");
			code56 = element("code");
			t236 = text("t");
			t237 = text(". ");
			strong0 = element("strong");
			t238 = text("the sky is the limit.");
			t239 = space();
			p50 = element("p");
			t240 = text("Likewise, the text stays at 'coming soon' at the 1st 40% of time, before changing back to the original text.");
			t241 = space();
			section7 = element("section");
			h34 = element("h3");
			a18 = element("a");
			t242 = text("Level 3, compile transition in your head.");
			t243 = space();
			p51 = element("p");
			t244 = text("This is a reference to the series of blogs i've written, \"compile svelte in your head\". be sure to check them out.");
			t245 = space();
			p52 = element("p");
			t246 = text("As, how we usually start with a compile svelte in your head article, we are going to explore how we can write a transition in vanilla javascript.");
			t247 = space();
			p53 = element("p");
			t248 = text("There are a few technologies at our hands we can make use of, the 1st is CSS Transition.");
			t249 = space();
			p54 = element("p");
			t250 = text("We add the transition property to a selector, describing which css property to be transitioned, the duration, easing function and delay.");
			t251 = space();
			p55 = element("p");
			t252 = text("And when you change the value of the specified property, in this case opacity, the opacity of the element will transition smoothly based on the easing function.\nso here i add the class to change the opacity to 0 and back to 1");
			t253 = space();
			p56 = element("p");
			t254 = text("However the CSS transition is a bit restrictive, you have limited easing functions, no offense, cubic bezier is great.");
			t255 = space();
			p57 = element("p");
			t256 = text("Another thing CSS offers us is CSS Animation.");
			t257 = space();
			p58 = element("p");
			t258 = text("We can define the keyframes of the animation, and then apply it to the element using the ");
			code57 = element("code");
			t259 = text("animation");
			t260 = text(" property.");
			t261 = space();
			p59 = element("p");
			t262 = text("We can have multiple animations happening at the same time, and as we change the value of the transformation, we can have different easing. Noticed that we can still use the linear easing in the ");
			code58 = element("code");
			t263 = text("animation");
			t264 = text(" property, so the keyframes will happen linearly. but as the transformation in each frame grows ");
			strong1 = element("strong");
			t265 = text("in cubic power");
			t266 = text(", the element translates in cubic easing.");
			t267 = space();
			p60 = element("p");
			strong2 = element("strong");
			t268 = text("We are no longer limited by the easing functions provided by CSS.");
			t269 = space();
			p61 = element("p");
			t270 = text("If the transition is not CSS based, we can use JavaScript.");
			t271 = space();
			p62 = element("p");
			code59 = element("code");
			t272 = text("requestAnimationFrame");
			t273 = text(" lets you tell the browser that you wish to perform an animation, the browser will call the function provided for your animation update, right before the next repaint.");
			t274 = space();
			p63 = element("p");
			t275 = text("As you can see here, we can create a loop using ");
			code60 = element("code");
			t276 = text("requestAnimationFrame");
			t277 = text(", and the ");
			code61 = element("code");
			t278 = text("loop");
			t279 = text(" function will be called on every frame right before the next repaint.");
			t280 = space();
			p64 = element("p");
			t281 = text("In the ");
			code62 = element("code");
			t282 = text("loop");
			t283 = text(" function, we have similar code as we've seen earlier, we calculate the duration since the start, and set the text content based on the duration passed.");
			t284 = space();
			p65 = element("p");
			t285 = text("So, with CSS animation and JS animation, let see how we can implement transition in vanilla JS.");
			t286 = space();
			section8 = element("section");
			h35 = element("h3");
			a19 = element("a");
			t287 = text("Live Coding");
			t288 = space();
			pre = element("pre");
			t289 = space();
			section9 = element("section");
			h36 = element("h3");
			a20 = element("a");
			code63 = element("code");
			t290 = text("transition:");
			t291 = text(" in compiled JS");
			t292 = space();
			p66 = element("p");
			t293 = text("As we've seen how we can implement transition in vanilla JS, let see how transition is compiled by Svelte.");
			t294 = space();
			p67 = element("p");
			t295 = text("If you've read my compile svelte in your head blog series, you should know about the ");
			code64 = element("code");
			t296 = text("create_fragment");
			t297 = text(" function. To those that haven't read it and have no idea what a ");
			code65 = element("code");
			t298 = text("create_fragment");
			t299 = text(" function is, well, go read it! what are you waiting for?");
			t300 = space();
			p68 = element("p");
			t301 = text("Anyway, a ");
			code66 = element("code");
			t302 = text("create_fragment");
			t303 = text(" function is part of the Svelte compiled code, it returns an object describing how to create, mount, update and destroy elements for the Svelte component. You can think of it as a recipe for Svelte components, and create, mount, update and destroy are the basics operations of all Svelte components.");
			t304 = space();
			p69 = element("p");
			t305 = text("Here are 2 more operations added if you use transitions ");
			code67 = element("code");
			t306 = text("intro");
			t307 = text(" and ");
			code68 = element("code");
			t308 = text("outro");
			t309 = text(".");
			t310 = space();
			p70 = element("p");
			t311 = text("Let's see how is it being used.");
			t312 = space();
			p71 = element("p");
			t313 = text("Say you have an each block. so in the main ");
			code69 = element("code");
			t314 = text("create_fragment");
			t315 = text(" function, you create the each block. and you have the ");
			code70 = element("code");
			t316 = text("create_each_block");
			t317 = text(" function that has the recipe to create elements for individual each items.");
			t318 = space();
			p72 = element("p");
			t319 = text("In the ");
			code71 = element("code");
			t320 = text("create_fragment");
			t321 = text(" function, we call the ");
			code72 = element("code");
			t322 = text("transition_in");
			t323 = text(" and ");
			code73 = element("code");
			t324 = text("transition_out");
			t325 = text(" in the ");
			code74 = element("code");
			t326 = text("intro");
			t327 = text(" and ");
			code75 = element("code");
			t328 = text("outro");
			t329 = text(" function. This will in turn call the ");
			code76 = element("code");
			t330 = text("intro");
			t331 = text(" and ");
			code77 = element("code");
			t332 = text("outro");
			t333 = text(" method of the individual each item block.");
			t334 = space();
			p73 = element("p");
			t335 = text("And when the each block has changes, say adding a new item to the array, svelte will also transition in the newly created block.");
			t336 = space();
			p74 = element("p");
			t337 = text("And when the item is removed from the array, svelte will start a new group of outros, transition out the removed items and synchronises the outros.");
			t338 = space();
			p75 = element("p");
			t339 = text("let's take a look how's the ");
			code78 = element("code");
			t340 = text("intro");
			t341 = text(" and ");
			code79 = element("code");
			t342 = text("outro");
			t343 = text(" method look like for each item.\nfirst in the ");
			code80 = element("code");
			t344 = text("intro");
			t345 = text(" method, it will create a bidirectional transition for the ");
			code81 = element("code");
			t346 = text("<div />");
			t347 = text(", the element we applied transition on, if it has not been created, and run it to ");
			code82 = element("code");
			t348 = text("1");
			t349 = text(". for the ");
			code83 = element("code");
			t350 = text("outro");
			t351 = text(" method on the other hand, we run the transition to ");
			code84 = element("code");
			t352 = text("0");
			t353 = text(".");
			t354 = space();
			p76 = element("p");
			t355 = text("Here, both the intro and outro is sharing the same transition object, so, if the item is added and removed immediately, when we run the transition to 0, the intro animation is cancelled and the outro animation is played immediately, depending on the outro delay.");
			t356 = space();
			p77 = element("p");
			t357 = text("If you only use the ");
			code85 = element("code");
			t358 = text("in:");
			t359 = text(" directive, then, only the intro transition is created.");
			t360 = space();
			p78 = element("p");
			t361 = text("On the other hand, same thing goes if you use only the ");
			code86 = element("code");
			t362 = text("out:");
			t363 = text(" directive.");
			t364 = space();
			p79 = element("p");
			t365 = text("Let's take a look at the how ");
			code87 = element("code");
			t366 = text("create_in_transition");
			t367 = text(" looks like, hopefully you can see some resemblance with the vanilla code that we've just written. We are going to look at just the ");
			code88 = element("code");
			t368 = text("create_in_transition");
			t369 = text(", as the ");
			code89 = element("code");
			t370 = text("create_out_transition");
			t371 = text(" and ");
			code90 = element("code");
			t372 = text("create_bidirectional_transition");
			t373 = text(" is almost similar in structure.");
			t374 = space();
			p80 = element("p");
			t375 = text("Here we have the ");
			code91 = element("code");
			t376 = text("start");
			t377 = text(", ");
			code92 = element("code");
			t378 = text("invalidate");
			t379 = text(" and ");
			code93 = element("code");
			t380 = text("end");
			t381 = text(", and the ");
			code94 = element("code");
			t382 = text("start");
			t383 = text(" will call the function ");
			code95 = element("code");
			t384 = text("go");
			t385 = text(", which starts the transition.");
			t386 = space();
			p81 = element("p");
			t387 = text("First we create the css rule. where we construct the keyframes and we insert the keyframes into the stylesheet, and apply it to the element.");
			t388 = space();
			p82 = element("p");
			t389 = text("Next we start the loop. if you look into the loop, it is implemented using ");
			code96 = element("code");
			t390 = text("requestAnimationFrame");
			t391 = text(". before we start, we record down the start time of the animation and the end time, so we know when it will end.\nand we call the 1st ");
			code97 = element("code");
			t392 = text("tick");
			t393 = text(" function.");
			t394 = space();
			p83 = element("p");
			t395 = text("If the current time has passed the start time, we calculate the eased time, and call the ");
			code98 = element("code");
			t396 = text("tick");
			t397 = text(" function.");
			t398 = space();
			p84 = element("p");
			t399 = text("And if the time passed the end time, we call the ");
			code99 = element("code");
			t400 = text("tick");
			t401 = text(" function 1 last time.");
			t402 = space();
			p85 = element("p");
			t403 = text("In the begining of the loop, we dispatch the ");
			code100 = element("code");
			t404 = text("on:introstart");
			t405 = text(" event, and when it ends, we dispatch the ");
			code101 = element("code");
			t406 = text("on:introend");
			t407 = text(" event.");
			t408 = space();
			p86 = element("p");
			t409 = text("And of course some cleanup after that.");
			t410 = space();
			p87 = element("p");
			t411 = text("Here are some source code reference if you are interested.");
			t412 = space();
			ul5 = element("ul");
			li12 = element("li");
			p88 = element("p");
			a21 = element("a");
			t413 = text("src/runtime/internal/transitions.ts");
			t414 = space();
			ul2 = element("ul");
			li10 = element("li");
			code102 = element("code");
			t415 = text("transition_in");
			t416 = text(", ");
			code103 = element("code");
			t417 = text("transition_out");
			t418 = space();
			li11 = element("li");
			code104 = element("code");
			t419 = text("create_in_transition");
			t420 = text(", ");
			code105 = element("code");
			t421 = text("create_out_transition");
			t422 = text(", ");
			code106 = element("code");
			t423 = text("create_bidirectional_transition");
			t424 = space();
			li14 = element("li");
			p89 = element("p");
			a22 = element("a");
			t425 = text("src/runtime/internal/style_manager.ts");
			t426 = space();
			ul3 = element("ul");
			li13 = element("li");
			code107 = element("code");
			t427 = text("create_rule");
			t428 = text(", ");
			code108 = element("code");
			t429 = text("delete_rule");
			t430 = text(", ");
			code109 = element("code");
			t431 = text("clear_rules");
			t432 = space();
			li16 = element("li");
			p90 = element("p");
			a23 = element("a");
			t433 = text("src/runtime/transition/index.ts");
			t434 = text(" (");
			code110 = element("code");
			t435 = text("svelte/transition");
			t436 = text(")");
			t437 = space();
			ul4 = element("ul");
			li15 = element("li");
			code111 = element("code");
			t438 = text("fade");
			t439 = text(", ");
			code112 = element("code");
			t440 = text("fly");
			t441 = text(", ");
			code113 = element("code");
			t442 = text("slide");
			t443 = text(", ");
			code114 = element("code");
			t444 = text("crossfade");
			t445 = text(", ...");
			t446 = space();
			p91 = element("p");
			t447 = text("First is the internal transitions, where the ");
			code115 = element("code");
			t448 = text("transition_in");
			t449 = text(", ");
			code116 = element("code");
			t450 = text("transition_out");
			t451 = text(", ");
			code117 = element("code");
			t452 = text("create_transition");
			t453 = text("s method being defined.");
			t454 = space();
			p92 = element("p");
			t455 = text("Following on that is the internal style manager, the part where how svelte create new keyframe rules and manages stylesheets.");
			t456 = space();
			p93 = element("p");
			t457 = text("Lastly is the runtime transitions, that's where you import ");
			code118 = element("code");
			t458 = text("svelte/transtions");
			t459 = text(" from. You can check out the code for ");
			code119 = element("code");
			t460 = text("fade");
			t461 = text(", ");
			code120 = element("code");
			t462 = text("fly");
			t463 = text(", ");
			code121 = element("code");
			t464 = text("slide");
			t465 = text(", ");
			code122 = element("code");
			t466 = text("crossfade");
			t467 = text(" and many other transitions.");
			t468 = space();
			section10 = element("section");
			h37 = element("h3");
			a24 = element("a");
			t469 = text("Recap");
			t470 = space();
			p94 = element("p");
			t471 = text("Finally a recap, we've seen how you can use a transition in svelte, author a transition in svelte, and finally how svelte implements the transition mechanism.");
			t472 = space();
			p95 = element("p");
			t473 = text("Hopefully, transition is no longer a mystical feature to you, and hope to see more creative transitions coming up.");
			t474 = space();
			p96 = element("p");
			t475 = text("Tag me on twitter or discord ");
			a25 = element("a");
			t476 = text("@lihautan");
			t477 = text(", if you created a something cool with transitions, I look forward to see them.");
			t478 = space();
			p97 = element("p");
			t479 = text("Once again, I'm ");
			a26 = element("a");
			t480 = text("@lihautan");
			t481 = text(" on twitter, follow me where i post cool and fun knowledge about svelte.");
			t482 = space();
			p98 = element("p");
			t483 = text("Thank you and enjoy the Svelte summit!");
			this.h();
		},
		l(nodes) {
			section0 = claim_element(nodes, "SECTION", {});
			var section0_nodes = children(section0);

			ul1 = claim_element(section0_nodes, "UL", {
				class: true,
				id: true,
				role: true,
				"aria-label": true
			});

			var ul1_nodes = children(ul1);
			li0 = claim_element(ul1_nodes, "LI", {});
			var li0_nodes = children(li0);
			a0 = claim_element(li0_nodes, "A", { href: true });
			var a0_nodes = children(a0);
			t0 = claim_text(a0_nodes, "Slides");
			a0_nodes.forEach(detach);
			li0_nodes.forEach(detach);
			li1 = claim_element(ul1_nodes, "LI", {});
			var li1_nodes = children(li1);
			a1 = claim_element(li1_nodes, "A", { href: true });
			var a1_nodes = children(a1);
			t1 = claim_text(a1_nodes, "Script");
			a1_nodes.forEach(detach);
			li1_nodes.forEach(detach);
			ul0 = claim_element(ul1_nodes, "UL", {});
			var ul0_nodes = children(ul0);
			li2 = claim_element(ul0_nodes, "LI", {});
			var li2_nodes = children(li2);
			a2 = claim_element(li2_nodes, "A", { href: true });
			var a2_nodes = children(a2);
			t2 = claim_text(a2_nodes, "Who am I");
			a2_nodes.forEach(detach);
			li2_nodes.forEach(detach);
			li3 = claim_element(ul0_nodes, "LI", {});
			var li3_nodes = children(li3);
			a3 = claim_element(li3_nodes, "A", { href: true });
			var a3_nodes = children(a3);
			t3 = claim_text(a3_nodes, "Level 1. Using  transition: .");
			a3_nodes.forEach(detach);
			li3_nodes.forEach(detach);
			li4 = claim_element(ul0_nodes, "LI", {});
			var li4_nodes = children(li4);
			a4 = claim_element(li4_nodes, "A", { href: true });
			var a4_nodes = children(a4);
			t4 = claim_text(a4_nodes, "Level 2. The  transition:  contract.");
			a4_nodes.forEach(detach);
			li4_nodes.forEach(detach);
			li5 = claim_element(ul0_nodes, "LI", {});
			var li5_nodes = children(li5);
			a5 = claim_element(li5_nodes, "A", { href: true });
			var a5_nodes = children(a5);
			t5 = claim_text(a5_nodes, "Easing");
			a5_nodes.forEach(detach);
			li5_nodes.forEach(detach);
			li6 = claim_element(ul0_nodes, "LI", {});
			var li6_nodes = children(li6);
			a6 = claim_element(li6_nodes, "A", { href: true });
			var a6_nodes = children(a6);
			t6 = claim_text(a6_nodes, "Level 3, compile transition in your head.");
			a6_nodes.forEach(detach);
			li6_nodes.forEach(detach);
			li7 = claim_element(ul0_nodes, "LI", {});
			var li7_nodes = children(li7);
			a7 = claim_element(li7_nodes, "A", { href: true });
			var a7_nodes = children(a7);
			t7 = claim_text(a7_nodes, "Live Coding");
			a7_nodes.forEach(detach);
			li7_nodes.forEach(detach);
			li8 = claim_element(ul0_nodes, "LI", {});
			var li8_nodes = children(li8);
			a8 = claim_element(li8_nodes, "A", { href: true });
			var a8_nodes = children(a8);
			t8 = claim_text(a8_nodes, "transition:  in compiled JS");
			a8_nodes.forEach(detach);
			li8_nodes.forEach(detach);
			li9 = claim_element(ul0_nodes, "LI", {});
			var li9_nodes = children(li9);
			a9 = claim_element(li9_nodes, "A", { href: true });
			var a9_nodes = children(a9);
			t9 = claim_text(a9_nodes, "Recap");
			a9_nodes.forEach(detach);
			li9_nodes.forEach(detach);
			ul0_nodes.forEach(detach);
			ul1_nodes.forEach(detach);
			section0_nodes.forEach(detach);
			t10 = claim_space(nodes);
			section1 = claim_element(nodes, "SECTION", {});
			var section1_nodes = children(section1);
			h20 = claim_element(section1_nodes, "H2", {});
			var h20_nodes = children(h20);
			a10 = claim_element(h20_nodes, "A", { href: true, id: true });
			var a10_nodes = children(a10);
			t11 = claim_text(a10_nodes, "Slides");
			a10_nodes.forEach(detach);
			h20_nodes.forEach(detach);
			t12 = claim_space(section1_nodes);
			p0 = claim_element(section1_nodes, "P", {});
			var p0_nodes = children(p0);
			t13 = claim_text(p0_nodes, "[");
			a11 = claim_element(p0_nodes, "A", { href: true });
			var a11_nodes = children(a11);
			t14 = claim_text(a11_nodes, "Link to slides");
			a11_nodes.forEach(detach);
			t15 = claim_text(p0_nodes, "] (Left arrow and right arrow to navigate)");
			p0_nodes.forEach(detach);
			section1_nodes.forEach(detach);
			t16 = claim_space(nodes);
			section2 = claim_element(nodes, "SECTION", {});
			var section2_nodes = children(section2);
			h21 = claim_element(section2_nodes, "H2", {});
			var h21_nodes = children(h21);
			a12 = claim_element(h21_nodes, "A", { href: true, id: true });
			var a12_nodes = children(a12);
			t17 = claim_text(a12_nodes, "Script");
			a12_nodes.forEach(detach);
			h21_nodes.forEach(detach);
			t18 = claim_space(section2_nodes);
			p1 = claim_element(section2_nodes, "P", {});
			var p1_nodes = children(p1);
			t19 = claim_text(p1_nodes, "Thank you for having me.");
			p1_nodes.forEach(detach);
			t20 = claim_space(section2_nodes);
			p2 = claim_element(section2_nodes, "P", {});
			var p2_nodes = children(p2);
			t21 = claim_text(p2_nodes, "Transitions allow user to understand where thing comes from and where it goes to.");
			p2_nodes.forEach(detach);
			t22 = claim_space(section2_nodes);
			p3 = claim_element(section2_nodes, "P", {});
			var p3_nodes = children(p3);
			t23 = claim_text(p3_nodes, "Much like the button over here, when I click on it, it fells into the center, and the title of my talk floats up from it.");
			p3_nodes.forEach(detach);
			t24 = claim_space(section2_nodes);
			p4 = claim_element(section2_nodes, "P", {});
			var p4_nodes = children(p4);
			t25 = claim_text(p4_nodes, "Yes, today, I will demystify transitions in svelte. And how am I going to do it?");
			p4_nodes.forEach(detach);
			t26 = claim_space(section2_nodes);
			p5 = claim_element(section2_nodes, "P", {});
			var p5_nodes = children(p5);
			t27 = claim_text(p5_nodes, "We will dive into Svelte transitions level-by-level.");
			p5_nodes.forEach(detach);
			t28 = claim_space(section2_nodes);
			p6 = claim_element(section2_nodes, "P", {});
			var p6_nodes = children(p6);
			t29 = claim_text(p6_nodes, "We start at the first level, where we will learn how to use ");
			code0 = claim_element(p6_nodes, "CODE", {});
			var code0_nodes = children(code0);
			t30 = claim_text(code0_nodes, "transition:");
			code0_nodes.forEach(detach);
			t31 = claim_text(p6_nodes, " in svelte.\nAs we reached the 2nd level, we'll look at how to author a transition in svelte.\nAt the 3rd level, we go deeper and take a look at how Svelte compiles and handle transitions under the hood.");
			p6_nodes.forEach(detach);
			section2_nodes.forEach(detach);
			t32 = claim_space(nodes);
			section3 = claim_element(nodes, "SECTION", {});
			var section3_nodes = children(section3);
			h30 = claim_element(section3_nodes, "H3", {});
			var h30_nodes = children(h30);
			a13 = claim_element(h30_nodes, "A", { href: true, id: true });
			var a13_nodes = children(a13);
			t33 = claim_text(a13_nodes, "Who am I");
			a13_nodes.forEach(detach);
			h30_nodes.forEach(detach);
			t34 = claim_space(section3_nodes);
			p7 = claim_element(section3_nodes, "P", {});
			var p7_nodes = children(p7);
			t35 = claim_text(p7_nodes, "My name is Tan Li Hau, I am a software engineer at Shopee. Shopee is a e-commerce platform in South east asia that is based in Singapore.");
			p7_nodes.forEach(detach);
			t36 = claim_space(section3_nodes);
			p8 = claim_element(section3_nodes, "P", {});
			var p8_nodes = children(p8);
			t37 = claim_text(p8_nodes, "I grew up in a lovely town called penang in malaysia, which has the best street food in malaysia, such as char koay teow, stir-fry flat rice noodles; rojak, a eclectic fruit salad with palm sugar, peanuts and chilli dressing, and well, these are just one of the many great street foods that i hope to try again when I can go back after this coronavirus pandemic is over.");
			p8_nodes.forEach(detach);
			t38 = claim_space(section3_nodes);
			p9 = claim_element(section3_nodes, "P", {});
			var p9_nodes = children(p9);
			t39 = claim_text(p9_nodes, "last but not the least, im one of the maintainers of svelte");
			p9_nodes.forEach(detach);
			section3_nodes.forEach(detach);
			t40 = claim_space(nodes);
			section4 = claim_element(nodes, "SECTION", {});
			var section4_nodes = children(section4);
			h31 = claim_element(section4_nodes, "H3", {});
			var h31_nodes = children(h31);
			a14 = claim_element(h31_nodes, "A", { href: true, id: true });
			var a14_nodes = children(a14);
			t41 = claim_text(a14_nodes, "Level 1. Using ");
			code1 = claim_element(a14_nodes, "CODE", {});
			var code1_nodes = children(code1);
			t42 = claim_text(code1_nodes, "transition:");
			code1_nodes.forEach(detach);
			t43 = claim_text(a14_nodes, ".");
			a14_nodes.forEach(detach);
			h31_nodes.forEach(detach);
			t44 = claim_space(section4_nodes);
			p10 = claim_element(section4_nodes, "P", {});
			var p10_nodes = children(p10);
			t45 = claim_text(p10_nodes, "Here, we have a list of items, rendered using the ");
			code2 = claim_element(p10_nodes, "CODE", {});
			var code2_nodes = children(code2);
			t46 = claim_text(code2_nodes, "{#each}");
			code2_nodes.forEach(detach);
			t47 = claim_text(p10_nodes, " block. When we add or remove an item, the item appears and disappears in an instant. we have no idea where the item is coming from, or disappear into.");
			p10_nodes.forEach(detach);
			t48 = claim_space(section4_nodes);
			p11 = claim_element(section4_nodes, "P", {});
			var p11_nodes = children(p11);
			t49 = claim_text(p11_nodes, "To add transition for the items, firstly, we import a transition from ");
			code3 = claim_element(p11_nodes, "CODE", {});
			var code3_nodes = children(code3);
			t50 = claim_text(code3_nodes, "svelte/transtion");
			code3_nodes.forEach(detach);
			t51 = claim_text(p11_nodes, ". here we import fade. to add an entrance transition for the item, we add ");
			code4 = claim_element(p11_nodes, "CODE", {});
			var code4_nodes = children(code4);
			t52 = claim_text(code4_nodes, "in");
			code4_nodes.forEach(detach);
			t53 = claim_text(p11_nodes, " colon ");
			code5 = claim_element(p11_nodes, "CODE", {});
			var code5_nodes = children(code5);
			t54 = claim_text(code5_nodes, "fade");
			code5_nodes.forEach(detach);
			t55 = claim_text(p11_nodes, ".");
			p11_nodes.forEach(detach);
			t56 = claim_space(section4_nodes);
			p12 = claim_element(section4_nodes, "P", {});
			var p12_nodes = children(p12);
			t57 = claim_text(p12_nodes, "Now the item fades into existence.");
			p12_nodes.forEach(detach);
			t58 = claim_space(section4_nodes);
			p13 = claim_element(section4_nodes, "P", {});
			var p13_nodes = children(p13);
			t59 = claim_text(p13_nodes, "To customise the transition, we can add parameters. such as duration, or delay. For exit transition, we use ");
			code6 = claim_element(p13_nodes, "CODE", {});
			var code6_nodes = children(code6);
			t60 = claim_text(code6_nodes, "out");
			code6_nodes.forEach(detach);
			t61 = claim_text(p13_nodes, " colon ");
			code7 = claim_element(p13_nodes, "CODE", {});
			var code7_nodes = children(code7);
			t62 = claim_text(code7_nodes, "fade");
			code7_nodes.forEach(detach);
			t63 = claim_text(p13_nodes, ".");
			p13_nodes.forEach(detach);
			t64 = claim_space(section4_nodes);
			p14 = claim_element(section4_nodes, "P", {});
			var p14_nodes = children(p14);
			t65 = claim_text(p14_nodes, "If you want both entrance and exit transtion, you can use ");
			code8 = claim_element(p14_nodes, "CODE", {});
			var code8_nodes = children(code8);
			t66 = claim_text(code8_nodes, "transition");
			code8_nodes.forEach(detach);
			t67 = claim_text(p14_nodes, " colon ");
			code9 = claim_element(p14_nodes, "CODE", {});
			var code9_nodes = children(code9);
			t68 = claim_text(code9_nodes, "transition name");
			code9_nodes.forEach(detach);
			t69 = claim_text(p14_nodes, ".");
			p14_nodes.forEach(detach);
			t70 = claim_space(section4_nodes);
			p15 = claim_element(section4_nodes, "P", {});
			var p15_nodes = children(p15);
			t71 = claim_text(p15_nodes, "There are multiple built-in transitions in svelte, such as ");
			code10 = claim_element(p15_nodes, "CODE", {});
			var code10_nodes = children(code10);
			t72 = claim_text(code10_nodes, "fly");
			code10_nodes.forEach(detach);
			t73 = claim_text(p15_nodes, ", ");
			code11 = claim_element(p15_nodes, "CODE", {});
			var code11_nodes = children(code11);
			t74 = claim_text(code11_nodes, "slide");
			code11_nodes.forEach(detach);
			t75 = claim_text(p15_nodes, ", ");
			code12 = claim_element(p15_nodes, "CODE", {});
			var code12_nodes = children(code12);
			t76 = claim_text(code12_nodes, "scale");
			code12_nodes.forEach(detach);
			t77 = claim_text(p15_nodes, ", ");
			code13 = claim_element(p15_nodes, "CODE", {});
			var code13_nodes = children(code13);
			t78 = claim_text(code13_nodes, "blur");
			code13_nodes.forEach(detach);
			t79 = claim_text(p15_nodes, " and more. this list is not exhaustive, which i recommend you to check them out in the docs as well as the tutorials.");
			p15_nodes.forEach(detach);
			section4_nodes.forEach(detach);
			t80 = claim_space(nodes);
			section5 = claim_element(nodes, "SECTION", {});
			var section5_nodes = children(section5);
			h32 = claim_element(section5_nodes, "H3", {});
			var h32_nodes = children(h32);
			a15 = claim_element(h32_nodes, "A", { href: true, id: true });
			var a15_nodes = children(a15);
			t81 = claim_text(a15_nodes, "Level 2. The ");
			code14 = claim_element(a15_nodes, "CODE", {});
			var code14_nodes = children(code14);
			t82 = claim_text(code14_nodes, "transition:");
			code14_nodes.forEach(detach);
			t83 = claim_text(a15_nodes, " contract.");
			a15_nodes.forEach(detach);
			h32_nodes.forEach(detach);
			t84 = claim_space(section5_nodes);
			p16 = claim_element(section5_nodes, "P", {});
			var p16_nodes = children(p16);
			t85 = claim_text(p16_nodes, "Not sure if you've heard about the store contract in svelte, which states that, if any object follows the store contract, that object can be used like a store, where you can subscribe to it and read the value like a store using the ");
			code15 = claim_element(p16_nodes, "CODE", {});
			var code15_nodes = children(code15);
			t86 = claim_text(code15_nodes, "$");
			code15_nodes.forEach(detach);
			t87 = claim_text(p16_nodes, "-prefix.");
			p16_nodes.forEach(detach);
			t88 = claim_space(section5_nodes);
			p17 = claim_element(section5_nodes, "P", {});
			var p17_nodes = children(p17);
			t89 = claim_text(p17_nodes, "The same thing goes with the ");
			code16 = claim_element(p17_nodes, "CODE", {});
			var code16_nodes = children(code16);
			t90 = claim_text(code16_nodes, "transition");
			code16_nodes.forEach(detach);
			t91 = claim_text(p17_nodes, ". A transition has a contract. Any function that follows the transition contract, can be used together with the ");
			code17 = claim_element(p17_nodes, "CODE", {});
			var code17_nodes = children(code17);
			t92 = claim_text(code17_nodes, "in:");
			code17_nodes.forEach(detach);
			t93 = claim_text(p17_nodes, ", ");
			code18 = claim_element(p17_nodes, "CODE", {});
			var code18_nodes = children(code18);
			t94 = claim_text(code18_nodes, "out:");
			code18_nodes.forEach(detach);
			t95 = claim_text(p17_nodes, " or ");
			code19 = claim_element(p17_nodes, "CODE", {});
			var code19_nodes = children(code19);
			t96 = claim_text(code19_nodes, "transition:");
			code19_nodes.forEach(detach);
			t97 = claim_text(p17_nodes, " directives.");
			p17_nodes.forEach(detach);
			t98 = claim_space(section5_nodes);
			p18 = claim_element(section5_nodes, "P", {});
			var p18_nodes = children(p18);
			t99 = claim_text(p18_nodes, "Here is how the transition function should look like. It's a function that takes in 2 parameters, the element node that the transition is applied to, and the parameter that is passed into the transition.");
			p18_nodes.forEach(detach);
			t100 = claim_space(section5_nodes);
			p19 = claim_element(section5_nodes, "P", {});
			var p19_nodes = children(p19);
			t101 = claim_text(p19_nodes, "And, it should return an object that describes the transition, or return a function that returns that object.");
			p19_nodes.forEach(detach);
			t102 = claim_space(section5_nodes);
			p20 = claim_element(section5_nodes, "P", {});
			var p20_nodes = children(p20);
			t103 = claim_text(p20_nodes, "The object should contain properties such as ");
			code20 = claim_element(p20_nodes, "CODE", {});
			var code20_nodes = children(code20);
			t104 = claim_text(code20_nodes, "delay");
			code20_nodes.forEach(detach);
			t105 = claim_text(p20_nodes, ", in milliseconds, how long before the transition starts; ");
			code21 = claim_element(p20_nodes, "CODE", {});
			var code21_nodes = children(code21);
			t106 = claim_text(code21_nodes, "duration");
			code21_nodes.forEach(detach);
			t107 = claim_text(p20_nodes, ", in millisecond, how long the transition takes; ");
			code22 = claim_element(p20_nodes, "CODE", {});
			var code22_nodes = children(code22);
			t108 = claim_text(code22_nodes, "easing");
			code22_nodes.forEach(detach);
			t109 = claim_text(p20_nodes, ", the easing function, which I'll explained later together with; ");
			code23 = claim_element(p20_nodes, "CODE", {});
			var code23_nodes = children(code23);
			t110 = claim_text(code23_nodes, "css");
			code23_nodes.forEach(detach);
			t111 = claim_text(p20_nodes, ", a function that returns a css string; and ");
			code24 = claim_element(p20_nodes, "CODE", {});
			var code24_nodes = children(code24);
			t112 = claim_text(code24_nodes, "tick");
			code24_nodes.forEach(detach);
			t113 = claim_text(p20_nodes, " a callback function.");
			p20_nodes.forEach(detach);
			t114 = claim_space(section5_nodes);
			p21 = claim_element(section5_nodes, "P", {});
			var p21_nodes = children(p21);
			t115 = claim_text(p21_nodes, "All of the properties are optional, if not specified, the default for delay is 0ms, the default for duration is 300ms, and the default easing is linear.");
			p21_nodes.forEach(detach);
			t116 = claim_space(section5_nodes);
			p22 = claim_element(section5_nodes, "P", {});
			var p22_nodes = children(p22);
			t117 = claim_text(p22_nodes, "Usually you would want the transition to be customisable, that's where the parameter is for you can return the delay or duration, passed into the parameter from the user.");
			p22_nodes.forEach(detach);
			section5_nodes.forEach(detach);
			t118 = claim_space(nodes);
			section6 = claim_element(nodes, "SECTION", {});
			var section6_nodes = children(section6);
			h33 = claim_element(section6_nodes, "H3", {});
			var h33_nodes = children(h33);
			a16 = claim_element(h33_nodes, "A", { href: true, id: true });
			var a16_nodes = children(a16);
			t119 = claim_text(a16_nodes, "Easing");
			a16_nodes.forEach(detach);
			h33_nodes.forEach(detach);
			t120 = claim_space(section6_nodes);
			p23 = claim_element(section6_nodes, "P", {});
			var p23_nodes = children(p23);
			t121 = claim_text(p23_nodes, "Now, let's talk about easing.");
			p23_nodes.forEach(detach);
			t122 = claim_space(section6_nodes);
			p24 = claim_element(section6_nodes, "P", {});
			var p24_nodes = children(p24);
			t123 = claim_text(p24_nodes, "Easing describes how much an animation progresses at different point of time throughout the animation.");
			p24_nodes.forEach(detach);
			t124 = claim_space(section6_nodes);
			p25 = claim_element(section6_nodes, "P", {});
			var p25_nodes = children(p25);
			t125 = claim_text(p25_nodes, "For convenience sake, we describe time from 0 to 1, begins with 0% and ends in a 100%.");
			p25_nodes.forEach(detach);
			t126 = claim_space(section6_nodes);
			p26 = claim_element(section6_nodes, "P", {});
			var p26_nodes = children(p26);
			t127 = claim_text(p26_nodes, "Here, as the red dot moves from time 0 to 1 along the red line, the value of eased time moves from 0 to 1 as well.");
			p26_nodes.forEach(detach);
			t128 = claim_space(section6_nodes);
			p27 = claim_element(section6_nodes, "P", {});
			var p27_nodes = children(p27);
			t129 = claim_text(p27_nodes, "The easing function that we are looking at now, is the linear function. The eased value grows linearly with time.");
			p27_nodes.forEach(detach);
			t130 = claim_space(section6_nodes);
			p28 = claim_element(section6_nodes, "P", {});
			var p28_nodes = children(p28);
			t131 = claim_text(p28_nodes, "However if I switch to ");
			code25 = claim_element(p28_nodes, "CODE", {});
			var code25_nodes = children(code25);
			t132 = claim_text(code25_nodes, "cubicIn");
			code25_nodes.forEach(detach);
			t133 = claim_text(p28_nodes, ", the eased value grows in the power of 3 with time.");
			p28_nodes.forEach(detach);
			t134 = claim_space(section6_nodes);
			p29 = claim_element(section6_nodes, "P", {});
			var p29_nodes = children(p29);
			t135 = claim_text(p29_nodes, "This is described by the ");
			code26 = claim_element(p29_nodes, "CODE", {});
			var code26_nodes = children(code26);
			t136 = claim_text(code26_nodes, "cubicIn");
			code26_nodes.forEach(detach);
			t137 = claim_text(p29_nodes, " function.");
			p29_nodes.forEach(detach);
			t138 = claim_space(section6_nodes);
			p30 = claim_element(section6_nodes, "P", {});
			var p30_nodes = children(p30);
			t139 = claim_text(p30_nodes, "Here's why we use 0 to 1 for time, because 0 power 3 is 0, and 1 power 3 is still 1. So after we power 3 the value of time, we still starts with 0 and ends in 1.");
			p30_nodes.forEach(detach);
			t140 = claim_space(section6_nodes);
			p31 = claim_element(section6_nodes, "P", {});
			var p31_nodes = children(p31);
			t141 = claim_text(p31_nodes, "Well, the easing function does not have to be a polynomial function, you can have if-else case in your easing function, like the ");
			code27 = claim_element(p31_nodes, "CODE", {});
			var code27_nodes = children(code27);
			t142 = claim_text(code27_nodes, "bounceOut");
			code27_nodes.forEach(detach);
			t143 = claim_text(p31_nodes, ", or calling another function like (bounceInOut) ");
			code28 = claim_element(p31_nodes, "CODE", {});
			var code28_nodes = children(code28);
			t144 = claim_text(code28_nodes, "bounceInOut");
			code28_nodes.forEach(detach);
			t145 = claim_text(p31_nodes, ".");
			p31_nodes.forEach(detach);
			t146 = claim_space(section6_nodes);
			p32 = claim_element(section6_nodes, "P", {});
			var p32_nodes = children(p32);
			t147 = claim_text(p32_nodes, "So, how do we calculate the time?");
			p32_nodes.forEach(detach);
			t148 = claim_space(section6_nodes);
			p33 = claim_element(section6_nodes, "P", {});
			var p33_nodes = children(p33);
			t149 = claim_text(p33_nodes, "At the beginning of the transition, we record the start time.");
			p33_nodes.forEach(detach);
			t150 = claim_space(section6_nodes);
			p34 = claim_element(section6_nodes, "P", {});
			var p34_nodes = children(p34);
			t151 = claim_text(p34_nodes, "Throughout the transition, we have ");
			code29 = claim_element(p34_nodes, "CODE", {});
			var code29_nodes = children(code29);
			t152 = claim_text(code29_nodes, "t");
			code29_nodes.forEach(detach);
			t153 = claim_text(p34_nodes, ", the time passed since the starting time, in milliseconds.");
			p34_nodes.forEach(detach);
			t154 = claim_space(section6_nodes);
			p35 = claim_element(section6_nodes, "P", {});
			var p35_nodes = children(p35);
			t155 = claim_text(p35_nodes, "We divide the value of ");
			code30 = claim_element(p35_nodes, "CODE", {});
			var code30_nodes = children(code30);
			t156 = claim_text(code30_nodes, "t");
			code30_nodes.forEach(detach);
			t157 = claim_text(p35_nodes, " by the duration of the transition, so now we get the value from ");
			code31 = claim_element(p35_nodes, "CODE", {});
			var code31_nodes = children(code31);
			t158 = claim_text(code31_nodes, "0");
			code31_nodes.forEach(detach);
			t159 = claim_text(p35_nodes, " to ");
			code32 = claim_element(p35_nodes, "CODE", {});
			var code32_nodes = children(code32);
			t160 = claim_text(code32_nodes, "1");
			code32_nodes.forEach(detach);
			t161 = claim_text(p35_nodes, " for ");
			code33 = claim_element(p35_nodes, "CODE", {});
			var code33_nodes = children(code33);
			t162 = claim_text(code33_nodes, "t");
			code33_nodes.forEach(detach);
			t163 = claim_text(p35_nodes, ", ");
			code34 = claim_element(p35_nodes, "CODE", {});
			var code34_nodes = children(code34);
			t164 = claim_text(code34_nodes, "0");
			code34_nodes.forEach(detach);
			t165 = claim_text(p35_nodes, " in the beginning of the transition, and ");
			code35 = claim_element(p35_nodes, "CODE", {});
			var code35_nodes = children(code35);
			t166 = claim_text(code35_nodes, "1");
			code35_nodes.forEach(detach);
			t167 = claim_text(p35_nodes, " at the end of the transition.");
			p35_nodes.forEach(detach);
			t168 = claim_space(section6_nodes);
			p36 = claim_element(section6_nodes, "P", {});
			var p36_nodes = children(p36);
			t169 = claim_text(p36_nodes, "Now if I pass in the value of ");
			code36 = claim_element(p36_nodes, "CODE", {});
			var code36_nodes = children(code36);
			t170 = claim_text(code36_nodes, "t");
			code36_nodes.forEach(detach);
			t171 = claim_text(p36_nodes, " into the easing function, in this case ");
			code37 = claim_element(p36_nodes, "CODE", {});
			var code37_nodes = children(code37);
			t172 = claim_text(code37_nodes, "bounceInOut");
			code37_nodes.forEach(detach);
			t173 = claim_text(p36_nodes, ", I'll get the eased value.");
			p36_nodes.forEach(detach);
			t174 = claim_space(section6_nodes);
			p37 = claim_element(section6_nodes, "P", {});
			var p37_nodes = children(p37);
			t175 = claim_text(p37_nodes, "The value does not go from ");
			code38 = claim_element(p37_nodes, "CODE", {});
			var code38_nodes = children(code38);
			t176 = claim_text(code38_nodes, "0");
			code38_nodes.forEach(detach);
			t177 = claim_text(p37_nodes, " to ");
			code39 = claim_element(p37_nodes, "CODE", {});
			var code39_nodes = children(code39);
			t178 = claim_text(code39_nodes, "1");
			code39_nodes.forEach(detach);
			t179 = claim_text(p37_nodes, " directly, it goes to 0.05, back to 0, 0.14~5, back to 0, all the 1, 0.85, 1, 0.95, 1.");
			p37_nodes.forEach(detach);
			t180 = claim_space(section6_nodes);
			p38 = claim_element(section6_nodes, "P", {});
			var p38_nodes = children(p38);
			t181 = claim_text(p38_nodes, "And if I use this eased value to calculate how much I need to translate an element, I'll get an element that bounce in out.");
			p38_nodes.forEach(detach);
			t182 = claim_space(section6_nodes);
			p39 = claim_element(section6_nodes, "P", {});
			var p39_nodes = children(p39);
			t183 = claim_text(p39_nodes, "And that's how the css function works. it takes in ");
			code40 = claim_element(p39_nodes, "CODE", {});
			var code40_nodes = children(code40);
			t184 = claim_text(code40_nodes, "t");
			code40_nodes.forEach(detach);
			t185 = claim_text(p39_nodes, ", and you return a css style in string, that will be applied to the element. You also have ");
			code41 = claim_element(p39_nodes, "CODE", {});
			var code41_nodes = children(code41);
			t186 = claim_text(code41_nodes, "u");
			code41_nodes.forEach(detach);
			t187 = claim_text(p39_nodes, ", the 2nd paramter, which is ");
			code42 = claim_element(p39_nodes, "CODE", {});
			var code42_nodes = children(code42);
			t188 = claim_text(code42_nodes, "1 - t");
			code42_nodes.forEach(detach);
			t189 = claim_text(p39_nodes, ", the inverse of ");
			code43 = claim_element(p39_nodes, "CODE", {});
			var code43_nodes = children(code43);
			t190 = claim_text(code43_nodes, "t");
			code43_nodes.forEach(detach);
			t191 = claim_text(p39_nodes, ". as you can see if you use ");
			code44 = claim_element(p39_nodes, "CODE", {});
			var code44_nodes = children(code44);
			t192 = claim_text(code44_nodes, "u");
			code44_nodes.forEach(detach);
			t193 = claim_text(p39_nodes, " instead, then the element moves in the opposite direction.");
			p39_nodes.forEach(detach);
			t194 = claim_space(section6_nodes);
			p40 = claim_element(section6_nodes, "P", {});
			var p40_nodes = children(p40);
			t195 = claim_text(p40_nodes, "So, if you transition an element into the view, the ");
			code45 = claim_element(p40_nodes, "CODE", {});
			var code45_nodes = children(code45);
			t196 = claim_text(code45_nodes, "t");
			code45_nodes.forEach(detach);
			t197 = claim_text(p40_nodes, " will go from ");
			code46 = claim_element(p40_nodes, "CODE", {});
			var code46_nodes = children(code46);
			t198 = claim_text(code46_nodes, "0");
			code46_nodes.forEach(detach);
			t199 = claim_text(p40_nodes, " to ");
			code47 = claim_element(p40_nodes, "CODE", {});
			var code47_nodes = children(code47);
			t200 = claim_text(code47_nodes, "1");
			code47_nodes.forEach(detach);
			t201 = claim_text(p40_nodes, ", but if you transition an element out of the view, ");
			code48 = claim_element(p40_nodes, "CODE", {});
			var code48_nodes = children(code48);
			t202 = claim_text(code48_nodes, "t");
			code48_nodes.forEach(detach);
			t203 = claim_text(p40_nodes, " will go from ");
			code49 = claim_element(p40_nodes, "CODE", {});
			var code49_nodes = children(code49);
			t204 = claim_text(code49_nodes, "1");
			code49_nodes.forEach(detach);
			t205 = claim_text(p40_nodes, " to ");
			code50 = claim_element(p40_nodes, "CODE", {});
			var code50_nodes = children(code50);
			t206 = claim_text(code50_nodes, "0");
			code50_nodes.forEach(detach);
			t207 = claim_text(p40_nodes, ".");
			p40_nodes.forEach(detach);
			t208 = claim_space(section6_nodes);
			p41 = claim_element(section6_nodes, "P", {});
			var p41_nodes = children(p41);
			t209 = claim_text(p41_nodes, "And, if you want to manipulate the element beyond CSS, you can use the ");
			code51 = claim_element(p41_nodes, "CODE", {});
			var code51_nodes = children(code51);
			t210 = claim_text(code51_nodes, "tick");
			code51_nodes.forEach(detach);
			t211 = claim_text(p41_nodes, " function.");
			p41_nodes.forEach(detach);
			t212 = claim_space(section6_nodes);
			p42 = claim_element(section6_nodes, "P", {});
			var p42_nodes = children(p42);
			t213 = claim_text(p42_nodes, "It also takes in the ");
			code52 = claim_element(p42_nodes, "CODE", {});
			var code52_nodes = children(code52);
			t214 = claim_text(code52_nodes, "t");
			code52_nodes.forEach(detach);
			t215 = claim_text(p42_nodes, " and ");
			code53 = claim_element(p42_nodes, "CODE", {});
			var code53_nodes = children(code53);
			t216 = claim_text(code53_nodes, "u");
			code53_nodes.forEach(detach);
			t217 = claim_text(p42_nodes, " the same way as the ");
			code54 = claim_element(p42_nodes, "CODE", {});
			var code54_nodes = children(code54);
			t218 = claim_text(code54_nodes, "css");
			code54_nodes.forEach(detach);
			t219 = claim_text(p42_nodes, " function.");
			p42_nodes.forEach(detach);
			t220 = claim_space(section6_nodes);
			p43 = claim_element(section6_nodes, "P", {});
			var p43_nodes = children(p43);
			t221 = claim_text(p43_nodes, "One very common use case of this ");
			code55 = claim_element(p43_nodes, "CODE", {});
			var code55_nodes = children(code55);
			t222 = claim_text(code55_nodes, "tick");
			code55_nodes.forEach(detach);
			t223 = claim_text(p43_nodes, " function is to create a typewriter transition.");
			p43_nodes.forEach(detach);
			t224 = claim_space(section6_nodes);
			p44 = claim_element(section6_nodes, "P", {});
			var p44_nodes = children(p44);
			t225 = claim_text(p44_nodes, "Do take note that, the tick function is going to be called on every frame, if you want your application to be buttery smooth 60 frames per second, make sure the tick function is fast to prevent jank.");
			p44_nodes.forEach(detach);
			t226 = claim_space(section6_nodes);
			p45 = claim_element(section6_nodes, "P", {});
			var p45_nodes = children(p45);
			t227 = claim_text(p45_nodes, "So we've covered all the properties in the transtion contract, let's take an example of a custom transition");
			p45_nodes.forEach(detach);
			t228 = claim_space(section6_nodes);
			p46 = claim_element(section6_nodes, "P", {});
			var p46_nodes = children(p46);
			a17 = claim_element(p46_nodes, "A", { href: true, rel: true });
			var a17_nodes = children(a17);
			t229 = claim_text(a17_nodes, "REPL");
			a17_nodes.forEach(detach);
			p46_nodes.forEach(detach);
			t230 = claim_space(section6_nodes);
			p47 = claim_element(section6_nodes, "P", {});
			var p47_nodes = children(p47);
			t231 = claim_text(p47_nodes, "Here I applied different font styles to the element, so the text stays bold and maroon for the 1st 40% of the time, then italic the next 40% of time, and then back to regular text.");
			p47_nodes.forEach(detach);
			t232 = claim_space(section6_nodes);
			p48 = claim_element(section6_nodes, "P", {});
			var p48_nodes = children(p48);
			t233 = claim_text(p48_nodes, "Well, 40% of time is debatable depending on the easing function, in this case we are using linear easing, so it is exactly 40%.");
			p48_nodes.forEach(detach);
			t234 = claim_space(section6_nodes);
			p49 = claim_element(section6_nodes, "P", {});
			var p49_nodes = children(p49);
			t235 = claim_text(p49_nodes, "As you can see, you don't have to limit your css transition to just CSS transform, or having to interpolate the value of ");
			code56 = claim_element(p49_nodes, "CODE", {});
			var code56_nodes = children(code56);
			t236 = claim_text(code56_nodes, "t");
			code56_nodes.forEach(detach);
			t237 = claim_text(p49_nodes, ". ");
			strong0 = claim_element(p49_nodes, "STRONG", {});
			var strong0_nodes = children(strong0);
			t238 = claim_text(strong0_nodes, "the sky is the limit.");
			strong0_nodes.forEach(detach);
			p49_nodes.forEach(detach);
			t239 = claim_space(section6_nodes);
			p50 = claim_element(section6_nodes, "P", {});
			var p50_nodes = children(p50);
			t240 = claim_text(p50_nodes, "Likewise, the text stays at 'coming soon' at the 1st 40% of time, before changing back to the original text.");
			p50_nodes.forEach(detach);
			section6_nodes.forEach(detach);
			t241 = claim_space(nodes);
			section7 = claim_element(nodes, "SECTION", {});
			var section7_nodes = children(section7);
			h34 = claim_element(section7_nodes, "H3", {});
			var h34_nodes = children(h34);
			a18 = claim_element(h34_nodes, "A", { href: true, id: true });
			var a18_nodes = children(a18);
			t242 = claim_text(a18_nodes, "Level 3, compile transition in your head.");
			a18_nodes.forEach(detach);
			h34_nodes.forEach(detach);
			t243 = claim_space(section7_nodes);
			p51 = claim_element(section7_nodes, "P", {});
			var p51_nodes = children(p51);
			t244 = claim_text(p51_nodes, "This is a reference to the series of blogs i've written, \"compile svelte in your head\". be sure to check them out.");
			p51_nodes.forEach(detach);
			t245 = claim_space(section7_nodes);
			p52 = claim_element(section7_nodes, "P", {});
			var p52_nodes = children(p52);
			t246 = claim_text(p52_nodes, "As, how we usually start with a compile svelte in your head article, we are going to explore how we can write a transition in vanilla javascript.");
			p52_nodes.forEach(detach);
			t247 = claim_space(section7_nodes);
			p53 = claim_element(section7_nodes, "P", {});
			var p53_nodes = children(p53);
			t248 = claim_text(p53_nodes, "There are a few technologies at our hands we can make use of, the 1st is CSS Transition.");
			p53_nodes.forEach(detach);
			t249 = claim_space(section7_nodes);
			p54 = claim_element(section7_nodes, "P", {});
			var p54_nodes = children(p54);
			t250 = claim_text(p54_nodes, "We add the transition property to a selector, describing which css property to be transitioned, the duration, easing function and delay.");
			p54_nodes.forEach(detach);
			t251 = claim_space(section7_nodes);
			p55 = claim_element(section7_nodes, "P", {});
			var p55_nodes = children(p55);
			t252 = claim_text(p55_nodes, "And when you change the value of the specified property, in this case opacity, the opacity of the element will transition smoothly based on the easing function.\nso here i add the class to change the opacity to 0 and back to 1");
			p55_nodes.forEach(detach);
			t253 = claim_space(section7_nodes);
			p56 = claim_element(section7_nodes, "P", {});
			var p56_nodes = children(p56);
			t254 = claim_text(p56_nodes, "However the CSS transition is a bit restrictive, you have limited easing functions, no offense, cubic bezier is great.");
			p56_nodes.forEach(detach);
			t255 = claim_space(section7_nodes);
			p57 = claim_element(section7_nodes, "P", {});
			var p57_nodes = children(p57);
			t256 = claim_text(p57_nodes, "Another thing CSS offers us is CSS Animation.");
			p57_nodes.forEach(detach);
			t257 = claim_space(section7_nodes);
			p58 = claim_element(section7_nodes, "P", {});
			var p58_nodes = children(p58);
			t258 = claim_text(p58_nodes, "We can define the keyframes of the animation, and then apply it to the element using the ");
			code57 = claim_element(p58_nodes, "CODE", {});
			var code57_nodes = children(code57);
			t259 = claim_text(code57_nodes, "animation");
			code57_nodes.forEach(detach);
			t260 = claim_text(p58_nodes, " property.");
			p58_nodes.forEach(detach);
			t261 = claim_space(section7_nodes);
			p59 = claim_element(section7_nodes, "P", {});
			var p59_nodes = children(p59);
			t262 = claim_text(p59_nodes, "We can have multiple animations happening at the same time, and as we change the value of the transformation, we can have different easing. Noticed that we can still use the linear easing in the ");
			code58 = claim_element(p59_nodes, "CODE", {});
			var code58_nodes = children(code58);
			t263 = claim_text(code58_nodes, "animation");
			code58_nodes.forEach(detach);
			t264 = claim_text(p59_nodes, " property, so the keyframes will happen linearly. but as the transformation in each frame grows ");
			strong1 = claim_element(p59_nodes, "STRONG", {});
			var strong1_nodes = children(strong1);
			t265 = claim_text(strong1_nodes, "in cubic power");
			strong1_nodes.forEach(detach);
			t266 = claim_text(p59_nodes, ", the element translates in cubic easing.");
			p59_nodes.forEach(detach);
			t267 = claim_space(section7_nodes);
			p60 = claim_element(section7_nodes, "P", {});
			var p60_nodes = children(p60);
			strong2 = claim_element(p60_nodes, "STRONG", {});
			var strong2_nodes = children(strong2);
			t268 = claim_text(strong2_nodes, "We are no longer limited by the easing functions provided by CSS.");
			strong2_nodes.forEach(detach);
			p60_nodes.forEach(detach);
			t269 = claim_space(section7_nodes);
			p61 = claim_element(section7_nodes, "P", {});
			var p61_nodes = children(p61);
			t270 = claim_text(p61_nodes, "If the transition is not CSS based, we can use JavaScript.");
			p61_nodes.forEach(detach);
			t271 = claim_space(section7_nodes);
			p62 = claim_element(section7_nodes, "P", {});
			var p62_nodes = children(p62);
			code59 = claim_element(p62_nodes, "CODE", {});
			var code59_nodes = children(code59);
			t272 = claim_text(code59_nodes, "requestAnimationFrame");
			code59_nodes.forEach(detach);
			t273 = claim_text(p62_nodes, " lets you tell the browser that you wish to perform an animation, the browser will call the function provided for your animation update, right before the next repaint.");
			p62_nodes.forEach(detach);
			t274 = claim_space(section7_nodes);
			p63 = claim_element(section7_nodes, "P", {});
			var p63_nodes = children(p63);
			t275 = claim_text(p63_nodes, "As you can see here, we can create a loop using ");
			code60 = claim_element(p63_nodes, "CODE", {});
			var code60_nodes = children(code60);
			t276 = claim_text(code60_nodes, "requestAnimationFrame");
			code60_nodes.forEach(detach);
			t277 = claim_text(p63_nodes, ", and the ");
			code61 = claim_element(p63_nodes, "CODE", {});
			var code61_nodes = children(code61);
			t278 = claim_text(code61_nodes, "loop");
			code61_nodes.forEach(detach);
			t279 = claim_text(p63_nodes, " function will be called on every frame right before the next repaint.");
			p63_nodes.forEach(detach);
			t280 = claim_space(section7_nodes);
			p64 = claim_element(section7_nodes, "P", {});
			var p64_nodes = children(p64);
			t281 = claim_text(p64_nodes, "In the ");
			code62 = claim_element(p64_nodes, "CODE", {});
			var code62_nodes = children(code62);
			t282 = claim_text(code62_nodes, "loop");
			code62_nodes.forEach(detach);
			t283 = claim_text(p64_nodes, " function, we have similar code as we've seen earlier, we calculate the duration since the start, and set the text content based on the duration passed.");
			p64_nodes.forEach(detach);
			t284 = claim_space(section7_nodes);
			p65 = claim_element(section7_nodes, "P", {});
			var p65_nodes = children(p65);
			t285 = claim_text(p65_nodes, "So, with CSS animation and JS animation, let see how we can implement transition in vanilla JS.");
			p65_nodes.forEach(detach);
			section7_nodes.forEach(detach);
			t286 = claim_space(nodes);
			section8 = claim_element(nodes, "SECTION", {});
			var section8_nodes = children(section8);
			h35 = claim_element(section8_nodes, "H3", {});
			var h35_nodes = children(h35);
			a19 = claim_element(h35_nodes, "A", { href: true, id: true });
			var a19_nodes = children(a19);
			t287 = claim_text(a19_nodes, "Live Coding");
			a19_nodes.forEach(detach);
			h35_nodes.forEach(detach);
			t288 = claim_space(section8_nodes);
			pre = claim_element(section8_nodes, "PRE", { class: true });
			var pre_nodes = children(pre);
			pre_nodes.forEach(detach);
			section8_nodes.forEach(detach);
			t289 = claim_space(nodes);
			section9 = claim_element(nodes, "SECTION", {});
			var section9_nodes = children(section9);
			h36 = claim_element(section9_nodes, "H3", {});
			var h36_nodes = children(h36);
			a20 = claim_element(h36_nodes, "A", { href: true, id: true });
			var a20_nodes = children(a20);
			code63 = claim_element(a20_nodes, "CODE", {});
			var code63_nodes = children(code63);
			t290 = claim_text(code63_nodes, "transition:");
			code63_nodes.forEach(detach);
			t291 = claim_text(a20_nodes, " in compiled JS");
			a20_nodes.forEach(detach);
			h36_nodes.forEach(detach);
			t292 = claim_space(section9_nodes);
			p66 = claim_element(section9_nodes, "P", {});
			var p66_nodes = children(p66);
			t293 = claim_text(p66_nodes, "As we've seen how we can implement transition in vanilla JS, let see how transition is compiled by Svelte.");
			p66_nodes.forEach(detach);
			t294 = claim_space(section9_nodes);
			p67 = claim_element(section9_nodes, "P", {});
			var p67_nodes = children(p67);
			t295 = claim_text(p67_nodes, "If you've read my compile svelte in your head blog series, you should know about the ");
			code64 = claim_element(p67_nodes, "CODE", {});
			var code64_nodes = children(code64);
			t296 = claim_text(code64_nodes, "create_fragment");
			code64_nodes.forEach(detach);
			t297 = claim_text(p67_nodes, " function. To those that haven't read it and have no idea what a ");
			code65 = claim_element(p67_nodes, "CODE", {});
			var code65_nodes = children(code65);
			t298 = claim_text(code65_nodes, "create_fragment");
			code65_nodes.forEach(detach);
			t299 = claim_text(p67_nodes, " function is, well, go read it! what are you waiting for?");
			p67_nodes.forEach(detach);
			t300 = claim_space(section9_nodes);
			p68 = claim_element(section9_nodes, "P", {});
			var p68_nodes = children(p68);
			t301 = claim_text(p68_nodes, "Anyway, a ");
			code66 = claim_element(p68_nodes, "CODE", {});
			var code66_nodes = children(code66);
			t302 = claim_text(code66_nodes, "create_fragment");
			code66_nodes.forEach(detach);
			t303 = claim_text(p68_nodes, " function is part of the Svelte compiled code, it returns an object describing how to create, mount, update and destroy elements for the Svelte component. You can think of it as a recipe for Svelte components, and create, mount, update and destroy are the basics operations of all Svelte components.");
			p68_nodes.forEach(detach);
			t304 = claim_space(section9_nodes);
			p69 = claim_element(section9_nodes, "P", {});
			var p69_nodes = children(p69);
			t305 = claim_text(p69_nodes, "Here are 2 more operations added if you use transitions ");
			code67 = claim_element(p69_nodes, "CODE", {});
			var code67_nodes = children(code67);
			t306 = claim_text(code67_nodes, "intro");
			code67_nodes.forEach(detach);
			t307 = claim_text(p69_nodes, " and ");
			code68 = claim_element(p69_nodes, "CODE", {});
			var code68_nodes = children(code68);
			t308 = claim_text(code68_nodes, "outro");
			code68_nodes.forEach(detach);
			t309 = claim_text(p69_nodes, ".");
			p69_nodes.forEach(detach);
			t310 = claim_space(section9_nodes);
			p70 = claim_element(section9_nodes, "P", {});
			var p70_nodes = children(p70);
			t311 = claim_text(p70_nodes, "Let's see how is it being used.");
			p70_nodes.forEach(detach);
			t312 = claim_space(section9_nodes);
			p71 = claim_element(section9_nodes, "P", {});
			var p71_nodes = children(p71);
			t313 = claim_text(p71_nodes, "Say you have an each block. so in the main ");
			code69 = claim_element(p71_nodes, "CODE", {});
			var code69_nodes = children(code69);
			t314 = claim_text(code69_nodes, "create_fragment");
			code69_nodes.forEach(detach);
			t315 = claim_text(p71_nodes, " function, you create the each block. and you have the ");
			code70 = claim_element(p71_nodes, "CODE", {});
			var code70_nodes = children(code70);
			t316 = claim_text(code70_nodes, "create_each_block");
			code70_nodes.forEach(detach);
			t317 = claim_text(p71_nodes, " function that has the recipe to create elements for individual each items.");
			p71_nodes.forEach(detach);
			t318 = claim_space(section9_nodes);
			p72 = claim_element(section9_nodes, "P", {});
			var p72_nodes = children(p72);
			t319 = claim_text(p72_nodes, "In the ");
			code71 = claim_element(p72_nodes, "CODE", {});
			var code71_nodes = children(code71);
			t320 = claim_text(code71_nodes, "create_fragment");
			code71_nodes.forEach(detach);
			t321 = claim_text(p72_nodes, " function, we call the ");
			code72 = claim_element(p72_nodes, "CODE", {});
			var code72_nodes = children(code72);
			t322 = claim_text(code72_nodes, "transition_in");
			code72_nodes.forEach(detach);
			t323 = claim_text(p72_nodes, " and ");
			code73 = claim_element(p72_nodes, "CODE", {});
			var code73_nodes = children(code73);
			t324 = claim_text(code73_nodes, "transition_out");
			code73_nodes.forEach(detach);
			t325 = claim_text(p72_nodes, " in the ");
			code74 = claim_element(p72_nodes, "CODE", {});
			var code74_nodes = children(code74);
			t326 = claim_text(code74_nodes, "intro");
			code74_nodes.forEach(detach);
			t327 = claim_text(p72_nodes, " and ");
			code75 = claim_element(p72_nodes, "CODE", {});
			var code75_nodes = children(code75);
			t328 = claim_text(code75_nodes, "outro");
			code75_nodes.forEach(detach);
			t329 = claim_text(p72_nodes, " function. This will in turn call the ");
			code76 = claim_element(p72_nodes, "CODE", {});
			var code76_nodes = children(code76);
			t330 = claim_text(code76_nodes, "intro");
			code76_nodes.forEach(detach);
			t331 = claim_text(p72_nodes, " and ");
			code77 = claim_element(p72_nodes, "CODE", {});
			var code77_nodes = children(code77);
			t332 = claim_text(code77_nodes, "outro");
			code77_nodes.forEach(detach);
			t333 = claim_text(p72_nodes, " method of the individual each item block.");
			p72_nodes.forEach(detach);
			t334 = claim_space(section9_nodes);
			p73 = claim_element(section9_nodes, "P", {});
			var p73_nodes = children(p73);
			t335 = claim_text(p73_nodes, "And when the each block has changes, say adding a new item to the array, svelte will also transition in the newly created block.");
			p73_nodes.forEach(detach);
			t336 = claim_space(section9_nodes);
			p74 = claim_element(section9_nodes, "P", {});
			var p74_nodes = children(p74);
			t337 = claim_text(p74_nodes, "And when the item is removed from the array, svelte will start a new group of outros, transition out the removed items and synchronises the outros.");
			p74_nodes.forEach(detach);
			t338 = claim_space(section9_nodes);
			p75 = claim_element(section9_nodes, "P", {});
			var p75_nodes = children(p75);
			t339 = claim_text(p75_nodes, "let's take a look how's the ");
			code78 = claim_element(p75_nodes, "CODE", {});
			var code78_nodes = children(code78);
			t340 = claim_text(code78_nodes, "intro");
			code78_nodes.forEach(detach);
			t341 = claim_text(p75_nodes, " and ");
			code79 = claim_element(p75_nodes, "CODE", {});
			var code79_nodes = children(code79);
			t342 = claim_text(code79_nodes, "outro");
			code79_nodes.forEach(detach);
			t343 = claim_text(p75_nodes, " method look like for each item.\nfirst in the ");
			code80 = claim_element(p75_nodes, "CODE", {});
			var code80_nodes = children(code80);
			t344 = claim_text(code80_nodes, "intro");
			code80_nodes.forEach(detach);
			t345 = claim_text(p75_nodes, " method, it will create a bidirectional transition for the ");
			code81 = claim_element(p75_nodes, "CODE", {});
			var code81_nodes = children(code81);
			t346 = claim_text(code81_nodes, "<div />");
			code81_nodes.forEach(detach);
			t347 = claim_text(p75_nodes, ", the element we applied transition on, if it has not been created, and run it to ");
			code82 = claim_element(p75_nodes, "CODE", {});
			var code82_nodes = children(code82);
			t348 = claim_text(code82_nodes, "1");
			code82_nodes.forEach(detach);
			t349 = claim_text(p75_nodes, ". for the ");
			code83 = claim_element(p75_nodes, "CODE", {});
			var code83_nodes = children(code83);
			t350 = claim_text(code83_nodes, "outro");
			code83_nodes.forEach(detach);
			t351 = claim_text(p75_nodes, " method on the other hand, we run the transition to ");
			code84 = claim_element(p75_nodes, "CODE", {});
			var code84_nodes = children(code84);
			t352 = claim_text(code84_nodes, "0");
			code84_nodes.forEach(detach);
			t353 = claim_text(p75_nodes, ".");
			p75_nodes.forEach(detach);
			t354 = claim_space(section9_nodes);
			p76 = claim_element(section9_nodes, "P", {});
			var p76_nodes = children(p76);
			t355 = claim_text(p76_nodes, "Here, both the intro and outro is sharing the same transition object, so, if the item is added and removed immediately, when we run the transition to 0, the intro animation is cancelled and the outro animation is played immediately, depending on the outro delay.");
			p76_nodes.forEach(detach);
			t356 = claim_space(section9_nodes);
			p77 = claim_element(section9_nodes, "P", {});
			var p77_nodes = children(p77);
			t357 = claim_text(p77_nodes, "If you only use the ");
			code85 = claim_element(p77_nodes, "CODE", {});
			var code85_nodes = children(code85);
			t358 = claim_text(code85_nodes, "in:");
			code85_nodes.forEach(detach);
			t359 = claim_text(p77_nodes, " directive, then, only the intro transition is created.");
			p77_nodes.forEach(detach);
			t360 = claim_space(section9_nodes);
			p78 = claim_element(section9_nodes, "P", {});
			var p78_nodes = children(p78);
			t361 = claim_text(p78_nodes, "On the other hand, same thing goes if you use only the ");
			code86 = claim_element(p78_nodes, "CODE", {});
			var code86_nodes = children(code86);
			t362 = claim_text(code86_nodes, "out:");
			code86_nodes.forEach(detach);
			t363 = claim_text(p78_nodes, " directive.");
			p78_nodes.forEach(detach);
			t364 = claim_space(section9_nodes);
			p79 = claim_element(section9_nodes, "P", {});
			var p79_nodes = children(p79);
			t365 = claim_text(p79_nodes, "Let's take a look at the how ");
			code87 = claim_element(p79_nodes, "CODE", {});
			var code87_nodes = children(code87);
			t366 = claim_text(code87_nodes, "create_in_transition");
			code87_nodes.forEach(detach);
			t367 = claim_text(p79_nodes, " looks like, hopefully you can see some resemblance with the vanilla code that we've just written. We are going to look at just the ");
			code88 = claim_element(p79_nodes, "CODE", {});
			var code88_nodes = children(code88);
			t368 = claim_text(code88_nodes, "create_in_transition");
			code88_nodes.forEach(detach);
			t369 = claim_text(p79_nodes, ", as the ");
			code89 = claim_element(p79_nodes, "CODE", {});
			var code89_nodes = children(code89);
			t370 = claim_text(code89_nodes, "create_out_transition");
			code89_nodes.forEach(detach);
			t371 = claim_text(p79_nodes, " and ");
			code90 = claim_element(p79_nodes, "CODE", {});
			var code90_nodes = children(code90);
			t372 = claim_text(code90_nodes, "create_bidirectional_transition");
			code90_nodes.forEach(detach);
			t373 = claim_text(p79_nodes, " is almost similar in structure.");
			p79_nodes.forEach(detach);
			t374 = claim_space(section9_nodes);
			p80 = claim_element(section9_nodes, "P", {});
			var p80_nodes = children(p80);
			t375 = claim_text(p80_nodes, "Here we have the ");
			code91 = claim_element(p80_nodes, "CODE", {});
			var code91_nodes = children(code91);
			t376 = claim_text(code91_nodes, "start");
			code91_nodes.forEach(detach);
			t377 = claim_text(p80_nodes, ", ");
			code92 = claim_element(p80_nodes, "CODE", {});
			var code92_nodes = children(code92);
			t378 = claim_text(code92_nodes, "invalidate");
			code92_nodes.forEach(detach);
			t379 = claim_text(p80_nodes, " and ");
			code93 = claim_element(p80_nodes, "CODE", {});
			var code93_nodes = children(code93);
			t380 = claim_text(code93_nodes, "end");
			code93_nodes.forEach(detach);
			t381 = claim_text(p80_nodes, ", and the ");
			code94 = claim_element(p80_nodes, "CODE", {});
			var code94_nodes = children(code94);
			t382 = claim_text(code94_nodes, "start");
			code94_nodes.forEach(detach);
			t383 = claim_text(p80_nodes, " will call the function ");
			code95 = claim_element(p80_nodes, "CODE", {});
			var code95_nodes = children(code95);
			t384 = claim_text(code95_nodes, "go");
			code95_nodes.forEach(detach);
			t385 = claim_text(p80_nodes, ", which starts the transition.");
			p80_nodes.forEach(detach);
			t386 = claim_space(section9_nodes);
			p81 = claim_element(section9_nodes, "P", {});
			var p81_nodes = children(p81);
			t387 = claim_text(p81_nodes, "First we create the css rule. where we construct the keyframes and we insert the keyframes into the stylesheet, and apply it to the element.");
			p81_nodes.forEach(detach);
			t388 = claim_space(section9_nodes);
			p82 = claim_element(section9_nodes, "P", {});
			var p82_nodes = children(p82);
			t389 = claim_text(p82_nodes, "Next we start the loop. if you look into the loop, it is implemented using ");
			code96 = claim_element(p82_nodes, "CODE", {});
			var code96_nodes = children(code96);
			t390 = claim_text(code96_nodes, "requestAnimationFrame");
			code96_nodes.forEach(detach);
			t391 = claim_text(p82_nodes, ". before we start, we record down the start time of the animation and the end time, so we know when it will end.\nand we call the 1st ");
			code97 = claim_element(p82_nodes, "CODE", {});
			var code97_nodes = children(code97);
			t392 = claim_text(code97_nodes, "tick");
			code97_nodes.forEach(detach);
			t393 = claim_text(p82_nodes, " function.");
			p82_nodes.forEach(detach);
			t394 = claim_space(section9_nodes);
			p83 = claim_element(section9_nodes, "P", {});
			var p83_nodes = children(p83);
			t395 = claim_text(p83_nodes, "If the current time has passed the start time, we calculate the eased time, and call the ");
			code98 = claim_element(p83_nodes, "CODE", {});
			var code98_nodes = children(code98);
			t396 = claim_text(code98_nodes, "tick");
			code98_nodes.forEach(detach);
			t397 = claim_text(p83_nodes, " function.");
			p83_nodes.forEach(detach);
			t398 = claim_space(section9_nodes);
			p84 = claim_element(section9_nodes, "P", {});
			var p84_nodes = children(p84);
			t399 = claim_text(p84_nodes, "And if the time passed the end time, we call the ");
			code99 = claim_element(p84_nodes, "CODE", {});
			var code99_nodes = children(code99);
			t400 = claim_text(code99_nodes, "tick");
			code99_nodes.forEach(detach);
			t401 = claim_text(p84_nodes, " function 1 last time.");
			p84_nodes.forEach(detach);
			t402 = claim_space(section9_nodes);
			p85 = claim_element(section9_nodes, "P", {});
			var p85_nodes = children(p85);
			t403 = claim_text(p85_nodes, "In the begining of the loop, we dispatch the ");
			code100 = claim_element(p85_nodes, "CODE", {});
			var code100_nodes = children(code100);
			t404 = claim_text(code100_nodes, "on:introstart");
			code100_nodes.forEach(detach);
			t405 = claim_text(p85_nodes, " event, and when it ends, we dispatch the ");
			code101 = claim_element(p85_nodes, "CODE", {});
			var code101_nodes = children(code101);
			t406 = claim_text(code101_nodes, "on:introend");
			code101_nodes.forEach(detach);
			t407 = claim_text(p85_nodes, " event.");
			p85_nodes.forEach(detach);
			t408 = claim_space(section9_nodes);
			p86 = claim_element(section9_nodes, "P", {});
			var p86_nodes = children(p86);
			t409 = claim_text(p86_nodes, "And of course some cleanup after that.");
			p86_nodes.forEach(detach);
			t410 = claim_space(section9_nodes);
			p87 = claim_element(section9_nodes, "P", {});
			var p87_nodes = children(p87);
			t411 = claim_text(p87_nodes, "Here are some source code reference if you are interested.");
			p87_nodes.forEach(detach);
			t412 = claim_space(section9_nodes);
			ul5 = claim_element(section9_nodes, "UL", {});
			var ul5_nodes = children(ul5);
			li12 = claim_element(ul5_nodes, "LI", {});
			var li12_nodes = children(li12);
			p88 = claim_element(li12_nodes, "P", {});
			var p88_nodes = children(p88);
			a21 = claim_element(p88_nodes, "A", { href: true, rel: true });
			var a21_nodes = children(a21);
			t413 = claim_text(a21_nodes, "src/runtime/internal/transitions.ts");
			a21_nodes.forEach(detach);
			p88_nodes.forEach(detach);
			t414 = claim_space(li12_nodes);
			ul2 = claim_element(li12_nodes, "UL", {});
			var ul2_nodes = children(ul2);
			li10 = claim_element(ul2_nodes, "LI", {});
			var li10_nodes = children(li10);
			code102 = claim_element(li10_nodes, "CODE", {});
			var code102_nodes = children(code102);
			t415 = claim_text(code102_nodes, "transition_in");
			code102_nodes.forEach(detach);
			t416 = claim_text(li10_nodes, ", ");
			code103 = claim_element(li10_nodes, "CODE", {});
			var code103_nodes = children(code103);
			t417 = claim_text(code103_nodes, "transition_out");
			code103_nodes.forEach(detach);
			li10_nodes.forEach(detach);
			t418 = claim_space(ul2_nodes);
			li11 = claim_element(ul2_nodes, "LI", {});
			var li11_nodes = children(li11);
			code104 = claim_element(li11_nodes, "CODE", {});
			var code104_nodes = children(code104);
			t419 = claim_text(code104_nodes, "create_in_transition");
			code104_nodes.forEach(detach);
			t420 = claim_text(li11_nodes, ", ");
			code105 = claim_element(li11_nodes, "CODE", {});
			var code105_nodes = children(code105);
			t421 = claim_text(code105_nodes, "create_out_transition");
			code105_nodes.forEach(detach);
			t422 = claim_text(li11_nodes, ", ");
			code106 = claim_element(li11_nodes, "CODE", {});
			var code106_nodes = children(code106);
			t423 = claim_text(code106_nodes, "create_bidirectional_transition");
			code106_nodes.forEach(detach);
			li11_nodes.forEach(detach);
			ul2_nodes.forEach(detach);
			li12_nodes.forEach(detach);
			t424 = claim_space(ul5_nodes);
			li14 = claim_element(ul5_nodes, "LI", {});
			var li14_nodes = children(li14);
			p89 = claim_element(li14_nodes, "P", {});
			var p89_nodes = children(p89);
			a22 = claim_element(p89_nodes, "A", { href: true, rel: true });
			var a22_nodes = children(a22);
			t425 = claim_text(a22_nodes, "src/runtime/internal/style_manager.ts");
			a22_nodes.forEach(detach);
			p89_nodes.forEach(detach);
			t426 = claim_space(li14_nodes);
			ul3 = claim_element(li14_nodes, "UL", {});
			var ul3_nodes = children(ul3);
			li13 = claim_element(ul3_nodes, "LI", {});
			var li13_nodes = children(li13);
			code107 = claim_element(li13_nodes, "CODE", {});
			var code107_nodes = children(code107);
			t427 = claim_text(code107_nodes, "create_rule");
			code107_nodes.forEach(detach);
			t428 = claim_text(li13_nodes, ", ");
			code108 = claim_element(li13_nodes, "CODE", {});
			var code108_nodes = children(code108);
			t429 = claim_text(code108_nodes, "delete_rule");
			code108_nodes.forEach(detach);
			t430 = claim_text(li13_nodes, ", ");
			code109 = claim_element(li13_nodes, "CODE", {});
			var code109_nodes = children(code109);
			t431 = claim_text(code109_nodes, "clear_rules");
			code109_nodes.forEach(detach);
			li13_nodes.forEach(detach);
			ul3_nodes.forEach(detach);
			li14_nodes.forEach(detach);
			t432 = claim_space(ul5_nodes);
			li16 = claim_element(ul5_nodes, "LI", {});
			var li16_nodes = children(li16);
			p90 = claim_element(li16_nodes, "P", {});
			var p90_nodes = children(p90);
			a23 = claim_element(p90_nodes, "A", { href: true, rel: true });
			var a23_nodes = children(a23);
			t433 = claim_text(a23_nodes, "src/runtime/transition/index.ts");
			a23_nodes.forEach(detach);
			t434 = claim_text(p90_nodes, " (");
			code110 = claim_element(p90_nodes, "CODE", {});
			var code110_nodes = children(code110);
			t435 = claim_text(code110_nodes, "svelte/transition");
			code110_nodes.forEach(detach);
			t436 = claim_text(p90_nodes, ")");
			p90_nodes.forEach(detach);
			t437 = claim_space(li16_nodes);
			ul4 = claim_element(li16_nodes, "UL", {});
			var ul4_nodes = children(ul4);
			li15 = claim_element(ul4_nodes, "LI", {});
			var li15_nodes = children(li15);
			code111 = claim_element(li15_nodes, "CODE", {});
			var code111_nodes = children(code111);
			t438 = claim_text(code111_nodes, "fade");
			code111_nodes.forEach(detach);
			t439 = claim_text(li15_nodes, ", ");
			code112 = claim_element(li15_nodes, "CODE", {});
			var code112_nodes = children(code112);
			t440 = claim_text(code112_nodes, "fly");
			code112_nodes.forEach(detach);
			t441 = claim_text(li15_nodes, ", ");
			code113 = claim_element(li15_nodes, "CODE", {});
			var code113_nodes = children(code113);
			t442 = claim_text(code113_nodes, "slide");
			code113_nodes.forEach(detach);
			t443 = claim_text(li15_nodes, ", ");
			code114 = claim_element(li15_nodes, "CODE", {});
			var code114_nodes = children(code114);
			t444 = claim_text(code114_nodes, "crossfade");
			code114_nodes.forEach(detach);
			t445 = claim_text(li15_nodes, ", ...");
			li15_nodes.forEach(detach);
			ul4_nodes.forEach(detach);
			li16_nodes.forEach(detach);
			ul5_nodes.forEach(detach);
			t446 = claim_space(section9_nodes);
			p91 = claim_element(section9_nodes, "P", {});
			var p91_nodes = children(p91);
			t447 = claim_text(p91_nodes, "First is the internal transitions, where the ");
			code115 = claim_element(p91_nodes, "CODE", {});
			var code115_nodes = children(code115);
			t448 = claim_text(code115_nodes, "transition_in");
			code115_nodes.forEach(detach);
			t449 = claim_text(p91_nodes, ", ");
			code116 = claim_element(p91_nodes, "CODE", {});
			var code116_nodes = children(code116);
			t450 = claim_text(code116_nodes, "transition_out");
			code116_nodes.forEach(detach);
			t451 = claim_text(p91_nodes, ", ");
			code117 = claim_element(p91_nodes, "CODE", {});
			var code117_nodes = children(code117);
			t452 = claim_text(code117_nodes, "create_transition");
			code117_nodes.forEach(detach);
			t453 = claim_text(p91_nodes, "s method being defined.");
			p91_nodes.forEach(detach);
			t454 = claim_space(section9_nodes);
			p92 = claim_element(section9_nodes, "P", {});
			var p92_nodes = children(p92);
			t455 = claim_text(p92_nodes, "Following on that is the internal style manager, the part where how svelte create new keyframe rules and manages stylesheets.");
			p92_nodes.forEach(detach);
			t456 = claim_space(section9_nodes);
			p93 = claim_element(section9_nodes, "P", {});
			var p93_nodes = children(p93);
			t457 = claim_text(p93_nodes, "Lastly is the runtime transitions, that's where you import ");
			code118 = claim_element(p93_nodes, "CODE", {});
			var code118_nodes = children(code118);
			t458 = claim_text(code118_nodes, "svelte/transtions");
			code118_nodes.forEach(detach);
			t459 = claim_text(p93_nodes, " from. You can check out the code for ");
			code119 = claim_element(p93_nodes, "CODE", {});
			var code119_nodes = children(code119);
			t460 = claim_text(code119_nodes, "fade");
			code119_nodes.forEach(detach);
			t461 = claim_text(p93_nodes, ", ");
			code120 = claim_element(p93_nodes, "CODE", {});
			var code120_nodes = children(code120);
			t462 = claim_text(code120_nodes, "fly");
			code120_nodes.forEach(detach);
			t463 = claim_text(p93_nodes, ", ");
			code121 = claim_element(p93_nodes, "CODE", {});
			var code121_nodes = children(code121);
			t464 = claim_text(code121_nodes, "slide");
			code121_nodes.forEach(detach);
			t465 = claim_text(p93_nodes, ", ");
			code122 = claim_element(p93_nodes, "CODE", {});
			var code122_nodes = children(code122);
			t466 = claim_text(code122_nodes, "crossfade");
			code122_nodes.forEach(detach);
			t467 = claim_text(p93_nodes, " and many other transitions.");
			p93_nodes.forEach(detach);
			section9_nodes.forEach(detach);
			t468 = claim_space(nodes);
			section10 = claim_element(nodes, "SECTION", {});
			var section10_nodes = children(section10);
			h37 = claim_element(section10_nodes, "H3", {});
			var h37_nodes = children(h37);
			a24 = claim_element(h37_nodes, "A", { href: true, id: true });
			var a24_nodes = children(a24);
			t469 = claim_text(a24_nodes, "Recap");
			a24_nodes.forEach(detach);
			h37_nodes.forEach(detach);
			t470 = claim_space(section10_nodes);
			p94 = claim_element(section10_nodes, "P", {});
			var p94_nodes = children(p94);
			t471 = claim_text(p94_nodes, "Finally a recap, we've seen how you can use a transition in svelte, author a transition in svelte, and finally how svelte implements the transition mechanism.");
			p94_nodes.forEach(detach);
			t472 = claim_space(section10_nodes);
			p95 = claim_element(section10_nodes, "P", {});
			var p95_nodes = children(p95);
			t473 = claim_text(p95_nodes, "Hopefully, transition is no longer a mystical feature to you, and hope to see more creative transitions coming up.");
			p95_nodes.forEach(detach);
			t474 = claim_space(section10_nodes);
			p96 = claim_element(section10_nodes, "P", {});
			var p96_nodes = children(p96);
			t475 = claim_text(p96_nodes, "Tag me on twitter or discord ");
			a25 = claim_element(p96_nodes, "A", { href: true, rel: true });
			var a25_nodes = children(a25);
			t476 = claim_text(a25_nodes, "@lihautan");
			a25_nodes.forEach(detach);
			t477 = claim_text(p96_nodes, ", if you created a something cool with transitions, I look forward to see them.");
			p96_nodes.forEach(detach);
			t478 = claim_space(section10_nodes);
			p97 = claim_element(section10_nodes, "P", {});
			var p97_nodes = children(p97);
			t479 = claim_text(p97_nodes, "Once again, I'm ");
			a26 = claim_element(p97_nodes, "A", { href: true, rel: true });
			var a26_nodes = children(a26);
			t480 = claim_text(a26_nodes, "@lihautan");
			a26_nodes.forEach(detach);
			t481 = claim_text(p97_nodes, " on twitter, follow me where i post cool and fun knowledge about svelte.");
			p97_nodes.forEach(detach);
			t482 = claim_space(section10_nodes);
			p98 = claim_element(section10_nodes, "P", {});
			var p98_nodes = children(p98);
			t483 = claim_text(p98_nodes, "Thank you and enjoy the Svelte summit!");
			p98_nodes.forEach(detach);
			section10_nodes.forEach(detach);
			this.h();
		},
		h() {
			attr(a0, "href", "#slides");
			attr(a1, "href", "#script");
			attr(a2, "href", "#who-am-i");
			attr(a3, "href", "#level-using-transition");
			attr(a4, "href", "#level-the-transition-contract");
			attr(a5, "href", "#easing");
			attr(a6, "href", "#level-compile-transition-in-your-head");
			attr(a7, "href", "#live-coding");
			attr(a8, "href", "#transition-in-compiled-js");
			attr(a9, "href", "#recap");
			attr(ul1, "class", "sitemap");
			attr(ul1, "id", "sitemap");
			attr(ul1, "role", "navigation");
			attr(ul1, "aria-label", "Table of Contents");
			attr(a10, "href", "#slides");
			attr(a10, "id", "slides");
			attr(a11, "href", "/slides/demystifying-transitions/");
			attr(a12, "href", "#script");
			attr(a12, "id", "script");
			attr(a13, "href", "#who-am-i");
			attr(a13, "id", "who-am-i");
			attr(a14, "href", "#level-using-transition");
			attr(a14, "id", "level-using-transition");
			attr(a15, "href", "#level-the-transition-contract");
			attr(a15, "id", "level-the-transition-contract");
			attr(a16, "href", "#easing");
			attr(a16, "id", "easing");
			attr(a17, "href", "https://svelte.dev/repl/c88da2fde68a415cbd43aa738bfcefab?version=3.29.0");
			attr(a17, "rel", "nofollow");
			attr(a18, "href", "#level-compile-transition-in-your-head");
			attr(a18, "id", "level-compile-transition-in-your-head");
			attr(a19, "href", "#live-coding");
			attr(a19, "id", "live-coding");
			attr(pre, "class", "language-js");
			attr(a20, "href", "#transition-in-compiled-js");
			attr(a20, "id", "transition-in-compiled-js");
			attr(a21, "href", "https://github.com/sveltejs/svelte/blob/master/src/runtime/internal/transitions.ts");
			attr(a21, "rel", "nofollow");
			attr(a22, "href", "https://github.com/sveltejs/svelte/blob/master/src/runtime/internal/style_manager.ts");
			attr(a22, "rel", "nofollow");
			attr(a23, "href", "https://github.com/sveltejs/svelte/blob/master/src/runtime/transition/index.ts");
			attr(a23, "rel", "nofollow");
			attr(a24, "href", "#recap");
			attr(a24, "id", "recap");
			attr(a25, "href", "https://twitter.com/lihautan");
			attr(a25, "rel", "nofollow");
			attr(a26, "href", "https://twitter.com/lihautan");
			attr(a26, "rel", "nofollow");
		},
		m(target, anchor) {
			insert(target, section0, anchor);
			append(section0, ul1);
			append(ul1, li0);
			append(li0, a0);
			append(a0, t0);
			append(ul1, li1);
			append(li1, a1);
			append(a1, t1);
			append(ul1, ul0);
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
			append(ul0, li8);
			append(li8, a8);
			append(a8, t8);
			append(ul0, li9);
			append(li9, a9);
			append(a9, t9);
			insert(target, t10, anchor);
			insert(target, section1, anchor);
			append(section1, h20);
			append(h20, a10);
			append(a10, t11);
			append(section1, t12);
			append(section1, p0);
			append(p0, t13);
			append(p0, a11);
			append(a11, t14);
			append(p0, t15);
			insert(target, t16, anchor);
			insert(target, section2, anchor);
			append(section2, h21);
			append(h21, a12);
			append(a12, t17);
			append(section2, t18);
			append(section2, p1);
			append(p1, t19);
			append(section2, t20);
			append(section2, p2);
			append(p2, t21);
			append(section2, t22);
			append(section2, p3);
			append(p3, t23);
			append(section2, t24);
			append(section2, p4);
			append(p4, t25);
			append(section2, t26);
			append(section2, p5);
			append(p5, t27);
			append(section2, t28);
			append(section2, p6);
			append(p6, t29);
			append(p6, code0);
			append(code0, t30);
			append(p6, t31);
			insert(target, t32, anchor);
			insert(target, section3, anchor);
			append(section3, h30);
			append(h30, a13);
			append(a13, t33);
			append(section3, t34);
			append(section3, p7);
			append(p7, t35);
			append(section3, t36);
			append(section3, p8);
			append(p8, t37);
			append(section3, t38);
			append(section3, p9);
			append(p9, t39);
			insert(target, t40, anchor);
			insert(target, section4, anchor);
			append(section4, h31);
			append(h31, a14);
			append(a14, t41);
			append(a14, code1);
			append(code1, t42);
			append(a14, t43);
			append(section4, t44);
			append(section4, p10);
			append(p10, t45);
			append(p10, code2);
			append(code2, t46);
			append(p10, t47);
			append(section4, t48);
			append(section4, p11);
			append(p11, t49);
			append(p11, code3);
			append(code3, t50);
			append(p11, t51);
			append(p11, code4);
			append(code4, t52);
			append(p11, t53);
			append(p11, code5);
			append(code5, t54);
			append(p11, t55);
			append(section4, t56);
			append(section4, p12);
			append(p12, t57);
			append(section4, t58);
			append(section4, p13);
			append(p13, t59);
			append(p13, code6);
			append(code6, t60);
			append(p13, t61);
			append(p13, code7);
			append(code7, t62);
			append(p13, t63);
			append(section4, t64);
			append(section4, p14);
			append(p14, t65);
			append(p14, code8);
			append(code8, t66);
			append(p14, t67);
			append(p14, code9);
			append(code9, t68);
			append(p14, t69);
			append(section4, t70);
			append(section4, p15);
			append(p15, t71);
			append(p15, code10);
			append(code10, t72);
			append(p15, t73);
			append(p15, code11);
			append(code11, t74);
			append(p15, t75);
			append(p15, code12);
			append(code12, t76);
			append(p15, t77);
			append(p15, code13);
			append(code13, t78);
			append(p15, t79);
			insert(target, t80, anchor);
			insert(target, section5, anchor);
			append(section5, h32);
			append(h32, a15);
			append(a15, t81);
			append(a15, code14);
			append(code14, t82);
			append(a15, t83);
			append(section5, t84);
			append(section5, p16);
			append(p16, t85);
			append(p16, code15);
			append(code15, t86);
			append(p16, t87);
			append(section5, t88);
			append(section5, p17);
			append(p17, t89);
			append(p17, code16);
			append(code16, t90);
			append(p17, t91);
			append(p17, code17);
			append(code17, t92);
			append(p17, t93);
			append(p17, code18);
			append(code18, t94);
			append(p17, t95);
			append(p17, code19);
			append(code19, t96);
			append(p17, t97);
			append(section5, t98);
			append(section5, p18);
			append(p18, t99);
			append(section5, t100);
			append(section5, p19);
			append(p19, t101);
			append(section5, t102);
			append(section5, p20);
			append(p20, t103);
			append(p20, code20);
			append(code20, t104);
			append(p20, t105);
			append(p20, code21);
			append(code21, t106);
			append(p20, t107);
			append(p20, code22);
			append(code22, t108);
			append(p20, t109);
			append(p20, code23);
			append(code23, t110);
			append(p20, t111);
			append(p20, code24);
			append(code24, t112);
			append(p20, t113);
			append(section5, t114);
			append(section5, p21);
			append(p21, t115);
			append(section5, t116);
			append(section5, p22);
			append(p22, t117);
			insert(target, t118, anchor);
			insert(target, section6, anchor);
			append(section6, h33);
			append(h33, a16);
			append(a16, t119);
			append(section6, t120);
			append(section6, p23);
			append(p23, t121);
			append(section6, t122);
			append(section6, p24);
			append(p24, t123);
			append(section6, t124);
			append(section6, p25);
			append(p25, t125);
			append(section6, t126);
			append(section6, p26);
			append(p26, t127);
			append(section6, t128);
			append(section6, p27);
			append(p27, t129);
			append(section6, t130);
			append(section6, p28);
			append(p28, t131);
			append(p28, code25);
			append(code25, t132);
			append(p28, t133);
			append(section6, t134);
			append(section6, p29);
			append(p29, t135);
			append(p29, code26);
			append(code26, t136);
			append(p29, t137);
			append(section6, t138);
			append(section6, p30);
			append(p30, t139);
			append(section6, t140);
			append(section6, p31);
			append(p31, t141);
			append(p31, code27);
			append(code27, t142);
			append(p31, t143);
			append(p31, code28);
			append(code28, t144);
			append(p31, t145);
			append(section6, t146);
			append(section6, p32);
			append(p32, t147);
			append(section6, t148);
			append(section6, p33);
			append(p33, t149);
			append(section6, t150);
			append(section6, p34);
			append(p34, t151);
			append(p34, code29);
			append(code29, t152);
			append(p34, t153);
			append(section6, t154);
			append(section6, p35);
			append(p35, t155);
			append(p35, code30);
			append(code30, t156);
			append(p35, t157);
			append(p35, code31);
			append(code31, t158);
			append(p35, t159);
			append(p35, code32);
			append(code32, t160);
			append(p35, t161);
			append(p35, code33);
			append(code33, t162);
			append(p35, t163);
			append(p35, code34);
			append(code34, t164);
			append(p35, t165);
			append(p35, code35);
			append(code35, t166);
			append(p35, t167);
			append(section6, t168);
			append(section6, p36);
			append(p36, t169);
			append(p36, code36);
			append(code36, t170);
			append(p36, t171);
			append(p36, code37);
			append(code37, t172);
			append(p36, t173);
			append(section6, t174);
			append(section6, p37);
			append(p37, t175);
			append(p37, code38);
			append(code38, t176);
			append(p37, t177);
			append(p37, code39);
			append(code39, t178);
			append(p37, t179);
			append(section6, t180);
			append(section6, p38);
			append(p38, t181);
			append(section6, t182);
			append(section6, p39);
			append(p39, t183);
			append(p39, code40);
			append(code40, t184);
			append(p39, t185);
			append(p39, code41);
			append(code41, t186);
			append(p39, t187);
			append(p39, code42);
			append(code42, t188);
			append(p39, t189);
			append(p39, code43);
			append(code43, t190);
			append(p39, t191);
			append(p39, code44);
			append(code44, t192);
			append(p39, t193);
			append(section6, t194);
			append(section6, p40);
			append(p40, t195);
			append(p40, code45);
			append(code45, t196);
			append(p40, t197);
			append(p40, code46);
			append(code46, t198);
			append(p40, t199);
			append(p40, code47);
			append(code47, t200);
			append(p40, t201);
			append(p40, code48);
			append(code48, t202);
			append(p40, t203);
			append(p40, code49);
			append(code49, t204);
			append(p40, t205);
			append(p40, code50);
			append(code50, t206);
			append(p40, t207);
			append(section6, t208);
			append(section6, p41);
			append(p41, t209);
			append(p41, code51);
			append(code51, t210);
			append(p41, t211);
			append(section6, t212);
			append(section6, p42);
			append(p42, t213);
			append(p42, code52);
			append(code52, t214);
			append(p42, t215);
			append(p42, code53);
			append(code53, t216);
			append(p42, t217);
			append(p42, code54);
			append(code54, t218);
			append(p42, t219);
			append(section6, t220);
			append(section6, p43);
			append(p43, t221);
			append(p43, code55);
			append(code55, t222);
			append(p43, t223);
			append(section6, t224);
			append(section6, p44);
			append(p44, t225);
			append(section6, t226);
			append(section6, p45);
			append(p45, t227);
			append(section6, t228);
			append(section6, p46);
			append(p46, a17);
			append(a17, t229);
			append(section6, t230);
			append(section6, p47);
			append(p47, t231);
			append(section6, t232);
			append(section6, p48);
			append(p48, t233);
			append(section6, t234);
			append(section6, p49);
			append(p49, t235);
			append(p49, code56);
			append(code56, t236);
			append(p49, t237);
			append(p49, strong0);
			append(strong0, t238);
			append(section6, t239);
			append(section6, p50);
			append(p50, t240);
			insert(target, t241, anchor);
			insert(target, section7, anchor);
			append(section7, h34);
			append(h34, a18);
			append(a18, t242);
			append(section7, t243);
			append(section7, p51);
			append(p51, t244);
			append(section7, t245);
			append(section7, p52);
			append(p52, t246);
			append(section7, t247);
			append(section7, p53);
			append(p53, t248);
			append(section7, t249);
			append(section7, p54);
			append(p54, t250);
			append(section7, t251);
			append(section7, p55);
			append(p55, t252);
			append(section7, t253);
			append(section7, p56);
			append(p56, t254);
			append(section7, t255);
			append(section7, p57);
			append(p57, t256);
			append(section7, t257);
			append(section7, p58);
			append(p58, t258);
			append(p58, code57);
			append(code57, t259);
			append(p58, t260);
			append(section7, t261);
			append(section7, p59);
			append(p59, t262);
			append(p59, code58);
			append(code58, t263);
			append(p59, t264);
			append(p59, strong1);
			append(strong1, t265);
			append(p59, t266);
			append(section7, t267);
			append(section7, p60);
			append(p60, strong2);
			append(strong2, t268);
			append(section7, t269);
			append(section7, p61);
			append(p61, t270);
			append(section7, t271);
			append(section7, p62);
			append(p62, code59);
			append(code59, t272);
			append(p62, t273);
			append(section7, t274);
			append(section7, p63);
			append(p63, t275);
			append(p63, code60);
			append(code60, t276);
			append(p63, t277);
			append(p63, code61);
			append(code61, t278);
			append(p63, t279);
			append(section7, t280);
			append(section7, p64);
			append(p64, t281);
			append(p64, code62);
			append(code62, t282);
			append(p64, t283);
			append(section7, t284);
			append(section7, p65);
			append(p65, t285);
			insert(target, t286, anchor);
			insert(target, section8, anchor);
			append(section8, h35);
			append(h35, a19);
			append(a19, t287);
			append(section8, t288);
			append(section8, pre);
			pre.innerHTML = raw_value;
			insert(target, t289, anchor);
			insert(target, section9, anchor);
			append(section9, h36);
			append(h36, a20);
			append(a20, code63);
			append(code63, t290);
			append(a20, t291);
			append(section9, t292);
			append(section9, p66);
			append(p66, t293);
			append(section9, t294);
			append(section9, p67);
			append(p67, t295);
			append(p67, code64);
			append(code64, t296);
			append(p67, t297);
			append(p67, code65);
			append(code65, t298);
			append(p67, t299);
			append(section9, t300);
			append(section9, p68);
			append(p68, t301);
			append(p68, code66);
			append(code66, t302);
			append(p68, t303);
			append(section9, t304);
			append(section9, p69);
			append(p69, t305);
			append(p69, code67);
			append(code67, t306);
			append(p69, t307);
			append(p69, code68);
			append(code68, t308);
			append(p69, t309);
			append(section9, t310);
			append(section9, p70);
			append(p70, t311);
			append(section9, t312);
			append(section9, p71);
			append(p71, t313);
			append(p71, code69);
			append(code69, t314);
			append(p71, t315);
			append(p71, code70);
			append(code70, t316);
			append(p71, t317);
			append(section9, t318);
			append(section9, p72);
			append(p72, t319);
			append(p72, code71);
			append(code71, t320);
			append(p72, t321);
			append(p72, code72);
			append(code72, t322);
			append(p72, t323);
			append(p72, code73);
			append(code73, t324);
			append(p72, t325);
			append(p72, code74);
			append(code74, t326);
			append(p72, t327);
			append(p72, code75);
			append(code75, t328);
			append(p72, t329);
			append(p72, code76);
			append(code76, t330);
			append(p72, t331);
			append(p72, code77);
			append(code77, t332);
			append(p72, t333);
			append(section9, t334);
			append(section9, p73);
			append(p73, t335);
			append(section9, t336);
			append(section9, p74);
			append(p74, t337);
			append(section9, t338);
			append(section9, p75);
			append(p75, t339);
			append(p75, code78);
			append(code78, t340);
			append(p75, t341);
			append(p75, code79);
			append(code79, t342);
			append(p75, t343);
			append(p75, code80);
			append(code80, t344);
			append(p75, t345);
			append(p75, code81);
			append(code81, t346);
			append(p75, t347);
			append(p75, code82);
			append(code82, t348);
			append(p75, t349);
			append(p75, code83);
			append(code83, t350);
			append(p75, t351);
			append(p75, code84);
			append(code84, t352);
			append(p75, t353);
			append(section9, t354);
			append(section9, p76);
			append(p76, t355);
			append(section9, t356);
			append(section9, p77);
			append(p77, t357);
			append(p77, code85);
			append(code85, t358);
			append(p77, t359);
			append(section9, t360);
			append(section9, p78);
			append(p78, t361);
			append(p78, code86);
			append(code86, t362);
			append(p78, t363);
			append(section9, t364);
			append(section9, p79);
			append(p79, t365);
			append(p79, code87);
			append(code87, t366);
			append(p79, t367);
			append(p79, code88);
			append(code88, t368);
			append(p79, t369);
			append(p79, code89);
			append(code89, t370);
			append(p79, t371);
			append(p79, code90);
			append(code90, t372);
			append(p79, t373);
			append(section9, t374);
			append(section9, p80);
			append(p80, t375);
			append(p80, code91);
			append(code91, t376);
			append(p80, t377);
			append(p80, code92);
			append(code92, t378);
			append(p80, t379);
			append(p80, code93);
			append(code93, t380);
			append(p80, t381);
			append(p80, code94);
			append(code94, t382);
			append(p80, t383);
			append(p80, code95);
			append(code95, t384);
			append(p80, t385);
			append(section9, t386);
			append(section9, p81);
			append(p81, t387);
			append(section9, t388);
			append(section9, p82);
			append(p82, t389);
			append(p82, code96);
			append(code96, t390);
			append(p82, t391);
			append(p82, code97);
			append(code97, t392);
			append(p82, t393);
			append(section9, t394);
			append(section9, p83);
			append(p83, t395);
			append(p83, code98);
			append(code98, t396);
			append(p83, t397);
			append(section9, t398);
			append(section9, p84);
			append(p84, t399);
			append(p84, code99);
			append(code99, t400);
			append(p84, t401);
			append(section9, t402);
			append(section9, p85);
			append(p85, t403);
			append(p85, code100);
			append(code100, t404);
			append(p85, t405);
			append(p85, code101);
			append(code101, t406);
			append(p85, t407);
			append(section9, t408);
			append(section9, p86);
			append(p86, t409);
			append(section9, t410);
			append(section9, p87);
			append(p87, t411);
			append(section9, t412);
			append(section9, ul5);
			append(ul5, li12);
			append(li12, p88);
			append(p88, a21);
			append(a21, t413);
			append(li12, t414);
			append(li12, ul2);
			append(ul2, li10);
			append(li10, code102);
			append(code102, t415);
			append(li10, t416);
			append(li10, code103);
			append(code103, t417);
			append(ul2, t418);
			append(ul2, li11);
			append(li11, code104);
			append(code104, t419);
			append(li11, t420);
			append(li11, code105);
			append(code105, t421);
			append(li11, t422);
			append(li11, code106);
			append(code106, t423);
			append(ul5, t424);
			append(ul5, li14);
			append(li14, p89);
			append(p89, a22);
			append(a22, t425);
			append(li14, t426);
			append(li14, ul3);
			append(ul3, li13);
			append(li13, code107);
			append(code107, t427);
			append(li13, t428);
			append(li13, code108);
			append(code108, t429);
			append(li13, t430);
			append(li13, code109);
			append(code109, t431);
			append(ul5, t432);
			append(ul5, li16);
			append(li16, p90);
			append(p90, a23);
			append(a23, t433);
			append(p90, t434);
			append(p90, code110);
			append(code110, t435);
			append(p90, t436);
			append(li16, t437);
			append(li16, ul4);
			append(ul4, li15);
			append(li15, code111);
			append(code111, t438);
			append(li15, t439);
			append(li15, code112);
			append(code112, t440);
			append(li15, t441);
			append(li15, code113);
			append(code113, t442);
			append(li15, t443);
			append(li15, code114);
			append(code114, t444);
			append(li15, t445);
			append(section9, t446);
			append(section9, p91);
			append(p91, t447);
			append(p91, code115);
			append(code115, t448);
			append(p91, t449);
			append(p91, code116);
			append(code116, t450);
			append(p91, t451);
			append(p91, code117);
			append(code117, t452);
			append(p91, t453);
			append(section9, t454);
			append(section9, p92);
			append(p92, t455);
			append(section9, t456);
			append(section9, p93);
			append(p93, t457);
			append(p93, code118);
			append(code118, t458);
			append(p93, t459);
			append(p93, code119);
			append(code119, t460);
			append(p93, t461);
			append(p93, code120);
			append(code120, t462);
			append(p93, t463);
			append(p93, code121);
			append(code121, t464);
			append(p93, t465);
			append(p93, code122);
			append(code122, t466);
			append(p93, t467);
			insert(target, t468, anchor);
			insert(target, section10, anchor);
			append(section10, h37);
			append(h37, a24);
			append(a24, t469);
			append(section10, t470);
			append(section10, p94);
			append(p94, t471);
			append(section10, t472);
			append(section10, p95);
			append(p95, t473);
			append(section10, t474);
			append(section10, p96);
			append(p96, t475);
			append(p96, a25);
			append(a25, t476);
			append(p96, t477);
			append(section10, t478);
			append(section10, p97);
			append(p97, t479);
			append(p97, a26);
			append(a26, t480);
			append(p97, t481);
			append(section10, t482);
			append(section10, p98);
			append(p98, t483);
		},
		p: noop,
		d(detaching) {
			if (detaching) detach(section0);
			if (detaching) detach(t10);
			if (detaching) detach(section1);
			if (detaching) detach(t16);
			if (detaching) detach(section2);
			if (detaching) detach(t32);
			if (detaching) detach(section3);
			if (detaching) detach(t40);
			if (detaching) detach(section4);
			if (detaching) detach(t80);
			if (detaching) detach(section5);
			if (detaching) detach(t118);
			if (detaching) detach(section6);
			if (detaching) detach(t241);
			if (detaching) detach(section7);
			if (detaching) detach(t286);
			if (detaching) detach(section8);
			if (detaching) detach(t289);
			if (detaching) detach(section9);
			if (detaching) detach(t468);
			if (detaching) detach(section10);
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

	layout_mdsvex_default = new Talk({ props: layout_mdsvex_default_props });

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
	"title": "Demystifying Transitions",
	"occasion": "Svelte Summit 2020",
	"date": "2020-10-19",
	"layout": "talk",
	"slug": "demystifying-transitions",
	"type": "talk"
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
