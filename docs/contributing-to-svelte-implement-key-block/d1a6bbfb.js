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
	let t12;
	let t13;
	let li7;
	let a7;
	let svg0;
	let path0;
	let t14;
	let a8;
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
			t6 = text("Videos");
			t7 = space();
			li4 = element("li");
			a4 = element("a");
			t8 = text("Talks");
			t9 = space();
			li5 = element("li");
			a5 = element("a");
			t10 = text("Notes");
			t11 = space();
			li6 = element("li");
			a6 = element("a");
			t12 = text("Newsletter");
			t13 = space();
			li7 = element("li");
			a7 = element("a");
			svg0 = svg_element("svg");
			path0 = svg_element("path");
			t14 = space();
			a8 = element("a");
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
			t6 = claim_text(a3_nodes, "Videos");
			a3_nodes.forEach(detach);
			li3_nodes.forEach(detach);
			t7 = claim_space(ul_nodes);
			li4 = claim_element(ul_nodes, "LI", { class: true });
			var li4_nodes = children(li4);
			a4 = claim_element(li4_nodes, "A", { href: true, class: true });
			var a4_nodes = children(a4);
			t8 = claim_text(a4_nodes, "Talks");
			a4_nodes.forEach(detach);
			li4_nodes.forEach(detach);
			t9 = claim_space(ul_nodes);
			li5 = claim_element(ul_nodes, "LI", { class: true });
			var li5_nodes = children(li5);
			a5 = claim_element(li5_nodes, "A", { href: true, class: true });
			var a5_nodes = children(a5);
			t10 = claim_text(a5_nodes, "Notes");
			a5_nodes.forEach(detach);
			li5_nodes.forEach(detach);
			t11 = claim_space(ul_nodes);
			li6 = claim_element(ul_nodes, "LI", { class: true });
			var li6_nodes = children(li6);
			a6 = claim_element(li6_nodes, "A", { href: true, class: true });
			var a6_nodes = children(a6);
			t12 = claim_text(a6_nodes, "Newsletter");
			a6_nodes.forEach(detach);
			li6_nodes.forEach(detach);
			t13 = claim_space(ul_nodes);
			li7 = claim_element(ul_nodes, "LI", { class: true });
			var li7_nodes = children(li7);

			a7 = claim_element(li7_nodes, "A", {
				"aria-label": true,
				href: true,
				class: true
			});

			var a7_nodes = children(a7);

			svg0 = claim_element(
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

			var svg0_nodes = children(svg0);
			path0 = claim_element(svg0_nodes, "path", { d: true }, 1);
			children(path0).forEach(detach);
			svg0_nodes.forEach(detach);
			a7_nodes.forEach(detach);
			t14 = claim_space(li7_nodes);

			a8 = claim_element(li7_nodes, "A", {
				"aria-label": true,
				href: true,
				class: true
			});

			var a8_nodes = children(a8);

			svg1 = claim_element(
				a8_nodes,
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
			a8_nodes.forEach(detach);
			li7_nodes.forEach(detach);
			ul_nodes.forEach(detach);
			nav_nodes.forEach(detach);
			header_nodes.forEach(detach);
			this.h();
		},
		h() {
			attr(a0, "href", "/");
			attr(a0, "class", "svelte-1axnxyd");
			attr(li0, "class", "svelte-1axnxyd");
			attr(a1, "href", "/about");
			attr(a1, "class", "svelte-1axnxyd");
			attr(li1, "class", "svelte-1axnxyd");
			attr(a2, "href", "/blogs");
			attr(a2, "class", "svelte-1axnxyd");
			attr(li2, "class", "svelte-1axnxyd");
			attr(a3, "href", "/videos");
			attr(a3, "class", "svelte-1axnxyd");
			attr(li3, "class", "svelte-1axnxyd");
			attr(a4, "href", "/talks");
			attr(a4, "class", "svelte-1axnxyd");
			attr(li4, "class", "svelte-1axnxyd");
			attr(a5, "href", "/notes");
			attr(a5, "class", "svelte-1axnxyd");
			attr(li5, "class", "svelte-1axnxyd");
			attr(a6, "href", "/newsletter");
			attr(a6, "class", "svelte-1axnxyd");
			attr(li6, "class", "svelte-1axnxyd");
			attr(path0, "d", "M23 3a10.9 10.9 0 0 1-3.14 1.53 4.48 4.48 0 0 0-7.86 3v1A10.66\n    10.66 0 0 1 3 4s-4 9 5 13a11.64 11.64 0 0 1-7 2c9 5 20 0 20-11.5a4.5\n    4.5 0 0 0-.08-.83A7.72 7.72 0 0 0 23 3z");
			attr(svg0, "viewBox", "0 0 24 24");
			attr(svg0, "width", "1em");
			attr(svg0, "height", "1em");
			attr(svg0, "class", "svelte-1axnxyd");
			attr(a7, "aria-label", "Twitter account");
			attr(a7, "href", "https://twitter.com/lihautan");
			attr(a7, "class", "svelte-1axnxyd");
			attr(path1, "d", "M9 19c-5 1.5-5-2.5-7-3m14 6v-3.87a3.37 3.37 0 0\n    0-.94-2.61c3.14-.35 6.44-1.54 6.44-7A5.44 5.44 0 0 0 20 4.77 5.07\n    5.07 0 0 0 19.91 1S18.73.65 16 2.48a13.38 13.38 0 0 0-7 0C6.27.65\n    5.09 1 5.09 1A5.07 5.07 0 0 0 5 4.77a5.44 5.44 0 0 0-1.5 3.78c0 5.42\n    3.3 6.61 6.44 7A3.37 3.37 0 0 0 9 18.13V22");
			attr(svg1, "viewBox", "0 0 24 24");
			attr(svg1, "width", "1em");
			attr(svg1, "height", "1em");
			attr(svg1, "class", "svelte-1axnxyd");
			attr(a8, "aria-label", "Github account");
			attr(a8, "href", "https://github.com/tanhauhau");
			attr(a8, "class", "svelte-1axnxyd");
			attr(li7, "class", "social svelte-1axnxyd");
			attr(ul, "class", "svelte-1axnxyd");
			attr(header, "class", "svelte-1axnxyd");
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
			append(a6, t12);
			append(ul, t13);
			append(ul, li7);
			append(li7, a7);
			append(a7, svg0);
			append(svg0, path0);
			append(li7, t14);
			append(li7, a8);
			append(a8, svg1);
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

var image = "https://lihautan.com/contributing-to-svelte-implement-key-block/assets/hero-twitter-a4295ce9.jpg";

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
			attr(span, "class", "svelte-142ghl5");
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
					"@id": "https%3A%2F%2Flihautan.com%2Fcontributing-to-svelte-implement-key-block",
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
			attr(meta11, "content", "https%3A%2F%2Flihautan.com%2Fcontributing-to-svelte-implement-key-block");
			attr(meta12, "itemprop", "image");
			attr(meta12, "content", image);
			html_tag = new HtmlTag(html_anchor);
			html_tag_1 = new HtmlTag(html_anchor_1);
			attr(a, "href", "#content");
			attr(a, "class", "skip svelte-142ghl5");
			attr(main, "id", "content");
			attr(main, "class", "blog svelte-142ghl5");
			attr(footer, "class", "svelte-142ghl5");
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
							"@id": "https%3A%2F%2Flihautan.com%2Fcontributing-to-svelte-implement-key-block",
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

/* content/blog/contributing-to-svelte-implement-key-block/@@page-markup.svelte generated by Svelte v3.24.0 */

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
	let ul1;
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
	let li10;
	let a10;
	let t10;
	let li11;
	let a11;
	let t11;
	let t12;
	let section1;
	let h20;
	let a12;
	let t13;
	let t14;
	let p0;
	let t15;
	let a13;
	let t16;
	let t17;
	let a14;
	let t18;
	let t19;
	let code0;
	let t20;
	let t21;
	let t22;
	let p1;
	let t23;
	let code1;
	let t24;
	let t25;
	let code2;
	let t26;
	let t27;
	let code3;
	let t28;
	let t29;
	let code4;
	let t30;
	let t31;
	let code5;
	let t32;
	let t33;
	let a15;
	let t34;
	let t35;
	let a16;
	let t36;
	let t37;
	let t38;
	let section2;
	let h21;
	let a17;
	let t39;
	let t40;
	let p2;
	let t41;
	let code6;
	let t42;
	let t43;
	let em0;
	let t44;
	let t45;
	let strong0;
	let t46;
	let t47;
	let a18;
	let t48;
	let t49;
	let t50;
	let p3;
	let t51;
	let code7;
	let t52;
	let t53;
	let code8;
	let t54;
	let t55;
	let t56;
	let p4;
	let t57;
	let code9;
	let t58;
	let t59;
	let code10;
	let t60;
	let t61;
	let t62;
	let pre0;

	let raw0_value = `<code class="language-svelte"><span class="token tag"><span class="token tag"><span class="token punctuation">&lt;</span>script</span><span class="token punctuation">></span></span><span class="token script"><span class="token language-javascript">
  <span class="token keyword">let</span> data <span class="token operator">=</span> <span class="token punctuation">[</span><span class="token punctuation">&#123;</span> id<span class="token punctuation">:</span> <span class="token number">1</span><span class="token punctuation">,</span> name<span class="token punctuation">:</span> <span class="token string">'alice'</span> <span class="token punctuation">&#125;</span><span class="token punctuation">]</span><span class="token punctuation">;</span>
  <span class="token keyword">function</span> <span class="token function">update</span><span class="token punctuation">(</span><span class="token punctuation">)</span> <span class="token punctuation">&#123;</span>
    data <span class="token operator">=</span> <span class="token punctuation">[</span><span class="token punctuation">&#123;</span> id<span class="token punctuation">:</span> <span class="token number">2</span><span class="token punctuation">,</span> name<span class="token punctuation">:</span> <span class="token string">'bob'</span> <span class="token punctuation">&#125;</span><span class="token punctuation">]</span><span class="token punctuation">;</span>
  <span class="token punctuation">&#125;</span>
</span></span><span class="token tag"><span class="token tag"><span class="token punctuation">&lt;/</span>script</span><span class="token punctuation">></span></span>
<span class="token each"><span class="token punctuation">&#123;</span><span class="token keyword">#each</span> <span class="token language-javascript">data </span><span class="token keyword">as</span> <span class="token language-javascript">item </span><span class="token language-javascript"><span class="token punctuation">(</span>item<span class="token punctuation">.</span>id<span class="token punctuation">)</span></span><span class="token punctuation">&#125;</span></span>
  <span class="token tag"><span class="token tag"><span class="token punctuation">&lt;</span>div</span><span class="token punctuation">></span></span><span class="token language-javascript"><span class="token punctuation">&#123;</span> item<span class="token punctuation">.</span>name <span class="token punctuation">&#125;</span></span><span class="token tag"><span class="token tag"><span class="token punctuation">&lt;/</span>div</span><span class="token punctuation">></span></span>
<span class="token language-javascript"><span class="token punctuation">&#123;</span><span class="token operator">/</span>each<span class="token punctuation">&#125;</span></span></code>` + "";

	let t63;
	let p5;
	let a19;
	let t64;
	let t65;
	let p6;
	let t66;
	let code11;
	let t67;
	let t68;
	let code12;
	let t69;
	let t70;
	let code13;
	let t71;
	let t72;
	let code14;
	let t73;
	let t74;
	let code15;
	let t75;
	let t76;
	let code16;
	let t77;
	let t78;
	let code17;
	let t79;
	let t80;
	let code18;
	let t81;
	let t82;
	let code19;
	let t83;
	let t84;
	let code20;
	let t85;
	let t86;
	let a20;
	let t87;
	let code21;
	let t88;
	let t89;
	let t90;
	let code22;
	let t91;
	let t92;
	let code23;
	let t93;
	let t94;
	let t95;
	let p7;
	let t96;
	let code24;
	let t97;
	let t98;
	let code25;
	let t99;
	let t100;
	let code26;
	let t101;
	let t102;
	let t103;
	let p8;
	let a21;
	let t104;
	let code27;
	let t105;
	let t106;
	let t107;
	let code28;
	let t108;
	let t109;
	let t110;
	let blockquote0;
	let p9;
	let t111;
	let code29;
	let t112;
	let t113;
	let a22;
	let t114;
	let code30;
	let t115;
	let t116;
	let t117;
	let t118;
	let p10;
	let t119;
	let code31;
	let t120;
	let t121;
	let code32;
	let t122;
	let t123;
	let strong1;
	let t124;
	let t125;
	let t126;
	let pre1;

	let raw1_value = `<code class="language-svelte"><span class="token each"><span class="token punctuation">&#123;</span><span class="token keyword">#each</span> <span class="token language-javascript">key </span><span class="token keyword">as</span> <span class="token language-javascript">k </span><span class="token language-javascript"><span class="token punctuation">(</span>k<span class="token punctuation">)</span></span><span class="token punctuation">&#125;</span></span>
  <span class="token tag"><span class="token tag"><span class="token punctuation">&lt;</span>div</span> <span class="token punctuation">/></span></span>
<span class="token language-javascript"><span class="token punctuation">&#123;</span><span class="token operator">/</span>each<span class="token punctuation">&#125;</span></span></code>` + "";

	let t127;
	let p11;
	let t128;
	let code33;
	let t129;
	let t130;
	let code34;
	let t131;
	let t132;
	let t133;
	let section3;
	let h30;
	let a23;
	let t134;
	let t135;
	let p12;
	let t136;
	let strong2;
	let t137;
	let code35;
	let t138;
	let t139;
	let t140;
	let a24;
	let t141;
	let t142;
	let t143;
	let pre2;

	let raw2_value = `<code class="language-svelte"><span class="token tag"><span class="token tag"><span class="token punctuation">&lt;</span>script</span><span class="token punctuation">></span></span><span class="token script"><span class="token language-javascript">
  <span class="token keyword">import</span> <span class="token punctuation">&#123;</span> fade <span class="token punctuation">&#125;</span> <span class="token keyword">from</span> <span class="token string">'svelte/transition'</span>
  <span class="token keyword">let</span> count <span class="token operator">=</span> <span class="token number">0</span><span class="token punctuation">;</span>
  <span class="token keyword">const</span> <span class="token function-variable function">handleClick</span> <span class="token operator">=</span> <span class="token punctuation">(</span><span class="token punctuation">)</span> <span class="token operator">=></span> count <span class="token operator">+=</span><span class="token number">1</span>
</span></span><span class="token tag"><span class="token tag"><span class="token punctuation">&lt;/</span>script</span><span class="token punctuation">></span></span>

<span class="token tag"><span class="token tag"><span class="token punctuation">&lt;</span>button</span> <span class="token attr-name"><span class="token namespace">on:</span>click=</span><span class="token language-javascript"><span class="token punctuation">&#123;</span>handleClick<span class="token punctuation">&#125;</span></span><span class="token punctuation">></span></span>Click me<span class="token tag"><span class="token tag"><span class="token punctuation">&lt;/</span>button</span><span class="token punctuation">></span></span>

<span class="token tag"><span class="token tag"><span class="token punctuation">&lt;</span>p</span><span class="token punctuation">></span></span>You clicked <span class="token tag"><span class="token tag"><span class="token punctuation">&lt;</span>strong</span> <span class="token attr-name"><span class="token namespace">transition:</span>fade</span><span class="token punctuation">></span></span><span class="token language-javascript"><span class="token punctuation">&#123;</span>count<span class="token punctuation">&#125;</span></span><span class="token tag"><span class="token tag"><span class="token punctuation">&lt;/</span>strong</span><span class="token punctuation">></span></span> times<span class="token tag"><span class="token tag"><span class="token punctuation">&lt;/</span>p</span><span class="token punctuation">></span></span></code>` + "";

	let t144;
	let p13;
	let t145;
	let t146;
	let p14;
	let t147;
	let code36;
	let t148;
	let t149;
	let t150;
	let p15;
	let t151;
	let strong3;
	let t152;
	let t153;
	let t154;
	let pre3;

	let raw3_value = `<code class="language-svelte"><span class="token tag"><span class="token tag"><span class="token punctuation">&lt;</span>script</span><span class="token punctuation">></span></span><span class="token script"><span class="token language-javascript">
  <span class="token keyword">import</span> <span class="token punctuation">&#123;</span> fade <span class="token punctuation">&#125;</span> <span class="token keyword">from</span> <span class="token string">'svelte/transition'</span>
  <span class="token keyword">let</span> count <span class="token operator">=</span> <span class="token number">0</span><span class="token punctuation">;</span>
  <span class="token keyword">const</span> <span class="token function-variable function">handleClick</span> <span class="token operator">=</span> <span class="token punctuation">(</span><span class="token punctuation">)</span> <span class="token operator">=></span> count <span class="token operator">+=</span><span class="token number">1</span>
</span></span><span class="token tag"><span class="token tag"><span class="token punctuation">&lt;/</span>script</span><span class="token punctuation">></span></span>

<span class="token tag"><span class="token tag"><span class="token punctuation">&lt;</span>button</span> <span class="token attr-name"><span class="token namespace">on:</span>click=</span><span class="token language-javascript"><span class="token punctuation">&#123;</span>handleClick<span class="token punctuation">&#125;</span></span><span class="token punctuation">></span></span>Click me<span class="token tag"><span class="token tag"><span class="token punctuation">&lt;/</span>button</span><span class="token punctuation">></span></span>

<span class="token tag"><span class="token tag"><span class="token punctuation">&lt;</span>p</span><span class="token punctuation">></span></span>You clicked
  <span class="token each"><span class="token punctuation">&#123;</span><span class="token keyword">#each</span> <span class="token language-javascript"><span class="token punctuation">[</span>count<span class="token punctuation">]</span> </span><span class="token keyword">as</span> <span class="token language-javascript">count </span><span class="token language-javascript"><span class="token punctuation">(</span>count<span class="token punctuation">)</span></span><span class="token punctuation">&#125;</span></span>
    <span class="token tag"><span class="token tag"><span class="token punctuation">&lt;</span>strong</span> <span class="token attr-name"><span class="token namespace">transition:</span>fade</span><span class="token punctuation">></span></span><span class="token language-javascript"><span class="token punctuation">&#123;</span>count<span class="token punctuation">&#125;</span></span><span class="token tag"><span class="token tag"><span class="token punctuation">&lt;/</span>strong</span><span class="token punctuation">></span></span>
  <span class="token language-javascript"><span class="token punctuation">&#123;</span><span class="token operator">/</span>each<span class="token punctuation">&#125;</span></span>
 times<span class="token tag"><span class="token tag"><span class="token punctuation">&lt;/</span>p</span><span class="token punctuation">></span></span></code>` + "";

	let t155;
	let p16;
	let t156;
	let code37;
	let t157;
	let t158;
	let t159;
	let pre4;

	let raw4_value = `<code class="language-">&lt;p&gt;You clicked
  &#123;#key count&#125;
    &lt;strong transition:fade&gt;&#123;count&#125;&lt;/strong&gt;
  &#123;/key&#125;
 times&lt;/p&gt;</code>` + "";

	let t160;
	let p17;
	let t161;
	let code38;
	let t162;
	let t163;
	let t164;
	let section4;
	let h22;
	let a25;
	let t165;
	let t166;
	let p18;
	let t167;
	let a26;
	let t168;
	let t169;
	let t170;
	let ul3;
	let li12;
	let t171;
	let t172;
	let li13;
	let t173;
	let t174;
	let li14;
	let t175;
	let t176;
	let li15;
	let t177;
	let t178;
	let p19;
	let t179;
	let t180;
	let section5;
	let h31;
	let a27;
	let t181;
	let t182;
	let p20;
	let t183;
	let a28;
	let t184;
	let t185;
	let t186;
	let pre5;

	let raw5_value = `<code class="language-js"><span class="token keyword">let</span> state<span class="token punctuation">:</span> ParserState <span class="token operator">=</span> fragment<span class="token punctuation">;</span>

<span class="token keyword">while</span> <span class="token punctuation">(</span><span class="token keyword">this</span><span class="token punctuation">.</span>index <span class="token operator">&lt;</span> <span class="token keyword">this</span><span class="token punctuation">.</span>template<span class="token punctuation">.</span>length<span class="token punctuation">)</span> <span class="token punctuation">&#123;</span>
  state <span class="token operator">=</span> <span class="token function">state</span><span class="token punctuation">(</span><span class="token keyword">this</span><span class="token punctuation">)</span> <span class="token operator">||</span> fragment<span class="token punctuation">;</span>
<span class="token punctuation">&#125;</span></code>` + "";

	let t187;
	let p21;
	let t188;
	let t189;
	let ul4;
	let li16;
	let strong4;
	let t190;
	let t191;
	let t192;
	let li17;
	let strong5;
	let t193;
	let t194;
	let code39;
	let t195;
	let t196;
	let code40;
	let t197;
	let t198;
	let code41;
	let t199;
	let t200;
	let code42;
	let t201;
	let t202;
	let t203;
	let li18;
	let strong6;
	let t204;
	let t205;
	let code43;
	let t206;
	let t207;
	let code44;
	let t208;
	let t209;
	let code45;
	let t210;
	let t211;
	let li19;
	let strong7;
	let t212;
	let t213;
	let code46;
	let t214;
	let t215;
	let code47;
	let t216;
	let t217;
	let t218;
	let p22;
	let t219;
	let code48;
	let t220;
	let t221;
	let a29;
	let strong8;
	let t222;
	let t223;
	let t224;
	let t225;
	let p23;
	let t226;
	let code49;
	let t227;
	let t228;
	let code50;
	let t229;
	let t230;
	let code51;
	let t231;
	let t232;
	let t233;
	let pre6;

	let raw6_value = `<code class="language-svelte"><span class="token language-javascript"><span class="token punctuation">&#123;</span>#key expression<span class="token punctuation">&#125;</span></span>
   <span class="token tag"><span class="token tag"><span class="token punctuation">&lt;</span>div</span> <span class="token punctuation">/></span></span>
<span class="token language-javascript"><span class="token punctuation">&#123;</span><span class="token operator">/</span>key<span class="token punctuation">&#125;</span></span>

<span class="token comment">&lt;!-- similar to --></span>
<span class="token language-javascript"><span class="token punctuation">&#123;</span>#<span class="token keyword">if</span> expression<span class="token punctuation">&#125;</span></span>
  <span class="token tag"><span class="token tag"><span class="token punctuation">&lt;</span>div</span> <span class="token punctuation">/></span></span>
<span class="token language-javascript"><span class="token punctuation">&#123;</span><span class="token operator">/</span><span class="token keyword">if</span><span class="token punctuation">&#125;</span></span></code>` + "";

	let t234;
	let p24;
	let t235;
	let code52;
	let t236;
	let t237;
	let code53;
	let t238;
	let t239;
	let t240;
	let pre7;

	let raw7_value = `<code class="language-diff-js">// ...
&#125; else if (parser.eat(#)) &#123;
<span class="token unchanged language-js"><span class="token prefix unchanged"> </span> <span class="token comment">// if &#123;#if foo&#125;, &#123;#each foo&#125; or &#123;#await foo&#125;</span>
<span class="token prefix unchanged"> </span> <span class="token keyword">let</span> type<span class="token punctuation">;</span>
</span>
<span class="token unchanged language-js"><span class="token prefix unchanged"> </span> <span class="token keyword">if</span> <span class="token punctuation">(</span>parser<span class="token punctuation">.</span><span class="token function">eat</span><span class="token punctuation">(</span><span class="token string">'if'</span><span class="token punctuation">)</span><span class="token punctuation">)</span> <span class="token punctuation">&#123;</span>
<span class="token prefix unchanged"> </span>   type <span class="token operator">=</span> <span class="token string">'IfBlock'</span><span class="token punctuation">;</span>
<span class="token prefix unchanged"> </span> <span class="token punctuation">&#125;</span> <span class="token keyword">else</span> <span class="token keyword">if</span> <span class="token punctuation">(</span>parser<span class="token punctuation">.</span><span class="token function">eat</span><span class="token punctuation">(</span><span class="token string">'each'</span><span class="token punctuation">)</span><span class="token punctuation">)</span> <span class="token punctuation">&#123;</span>
<span class="token prefix unchanged"> </span>   type <span class="token operator">=</span> <span class="token string">'EachBlock'</span><span class="token punctuation">;</span>
<span class="token prefix unchanged"> </span> <span class="token punctuation">&#125;</span> <span class="token keyword">else</span> <span class="token keyword">if</span> <span class="token punctuation">(</span>parser<span class="token punctuation">.</span><span class="token function">eat</span><span class="token punctuation">(</span><span class="token string">'await'</span><span class="token punctuation">)</span><span class="token punctuation">)</span> <span class="token punctuation">&#123;</span>
<span class="token prefix unchanged"> </span>   type <span class="token operator">=</span> <span class="token string">'AwaitBlock'</span><span class="token punctuation">;</span>
</span><span class="token inserted-sign inserted language-js"><span class="token prefix inserted">+</span>  <span class="token punctuation">&#125;</span> <span class="token keyword">else</span> <span class="token keyword">if</span> <span class="token punctuation">(</span>parser<span class="token punctuation">.</span><span class="token function">eat</span><span class="token punctuation">(</span><span class="token string">'key'</span><span class="token punctuation">)</span><span class="token punctuation">)</span> <span class="token punctuation">&#123;</span>
<span class="token prefix inserted">+</span>    type <span class="token operator">=</span> <span class="token string">'KeyBlock'</span><span class="token punctuation">;</span>
</span><span class="token unchanged language-js"><span class="token prefix unchanged"> </span> <span class="token punctuation">&#125;</span> <span class="token keyword">else</span> <span class="token punctuation">&#123;</span>
<span class="token prefix unchanged"> </span>   parser<span class="token punctuation">.</span><span class="token function">error</span><span class="token punctuation">(</span><span class="token punctuation">&#123;</span>
<span class="token prefix unchanged"> </span>     code<span class="token punctuation">:</span> <span class="token template-string"><span class="token template-punctuation string">&#96;</span><span class="token string">expected-block-type</span><span class="token template-punctuation string">&#96;</span></span><span class="token punctuation">,</span>
</span><span class="token deleted-sign deleted language-js"><span class="token prefix deleted">-</span>      message<span class="token punctuation">:</span> <span class="token template-string"><span class="token template-punctuation string">&#96;</span><span class="token string">Expected if, each or await</span><span class="token template-punctuation string">&#96;</span></span>
</span><span class="token inserted-sign inserted language-js"><span class="token prefix inserted">+</span>      message<span class="token punctuation">:</span> <span class="token template-string"><span class="token template-punctuation string">&#96;</span><span class="token string">Expected if, each, await or key</span><span class="token template-punctuation string">&#96;</span></span>
</span><span class="token unchanged language-js"><span class="token prefix unchanged"> </span>   <span class="token punctuation">&#125;</span><span class="token punctuation">)</span><span class="token punctuation">;</span>
<span class="token prefix unchanged"> </span> <span class="token punctuation">&#125;</span></span></code>` + "";

	let t241;
	let p25;
	let t242;
	let code54;
	let t243;
	let t244;
	let code55;
	let t245;
	let t246;
	let code56;
	let t247;
	let t248;
	let t249;
	let pre8;

	let raw8_value = `<code class="language-diff-js">if (parser.eat('/')) &#123;
<span class="token unchanged language-js"><span class="token prefix unchanged"> </span> <span class="token keyword">let</span> block <span class="token operator">=</span> parser<span class="token punctuation">.</span><span class="token function">current</span><span class="token punctuation">(</span><span class="token punctuation">)</span><span class="token punctuation">;</span>
<span class="token prefix unchanged"> </span> <span class="token keyword">let</span> expected<span class="token punctuation">;</span>
<span class="token prefix unchanged"> </span> <span class="token comment">// ...</span>
<span class="token prefix unchanged"> </span> <span class="token keyword">if</span> <span class="token punctuation">(</span>block<span class="token punctuation">.</span>type <span class="token operator">===</span> <span class="token string">'IfBlock'</span><span class="token punctuation">)</span> <span class="token punctuation">&#123;</span>
<span class="token prefix unchanged"> </span>   expected <span class="token operator">=</span> <span class="token string">'if'</span><span class="token punctuation">;</span>
<span class="token prefix unchanged"> </span> <span class="token punctuation">&#125;</span> <span class="token keyword">else</span> <span class="token keyword">if</span> <span class="token punctuation">(</span>block<span class="token punctuation">.</span>type <span class="token operator">===</span> <span class="token string">'EachBlock'</span><span class="token punctuation">)</span> <span class="token punctuation">&#123;</span>
<span class="token prefix unchanged"> </span>   expected <span class="token operator">=</span> <span class="token string">'each'</span><span class="token punctuation">;</span>
<span class="token prefix unchanged"> </span> <span class="token punctuation">&#125;</span> <span class="token keyword">else</span> <span class="token keyword">if</span> <span class="token punctuation">(</span>block<span class="token punctuation">.</span>type <span class="token operator">===</span> <span class="token string">'AwaitBlock'</span><span class="token punctuation">)</span> <span class="token punctuation">&#123;</span>
<span class="token prefix unchanged"> </span>   expected <span class="token operator">=</span> <span class="token string">'await'</span><span class="token punctuation">;</span>
</span><span class="token inserted-sign inserted language-js"><span class="token prefix inserted">+</span>  <span class="token punctuation">&#125;</span> <span class="token keyword">else</span> <span class="token keyword">if</span> <span class="token punctuation">(</span>block<span class="token punctuation">.</span>type <span class="token operator">===</span> <span class="token string">'KeyBlock'</span><span class="token punctuation">)</span> <span class="token punctuation">&#123;</span>
<span class="token prefix inserted">+</span>    expected <span class="token operator">=</span> <span class="token string">'key'</span><span class="token punctuation">;</span>
</span><span class="token unchanged language-js"><span class="token prefix unchanged"> </span> <span class="token punctuation">&#125;</span> <span class="token keyword">else</span> <span class="token punctuation">&#123;</span>
<span class="token prefix unchanged"> </span>   parser<span class="token punctuation">.</span><span class="token function">error</span><span class="token punctuation">(</span><span class="token punctuation">&#123;</span>
<span class="token prefix unchanged"> </span>     code<span class="token punctuation">:</span> <span class="token template-string"><span class="token template-punctuation string">&#96;</span><span class="token string">unexpected-block-close</span><span class="token template-punctuation string">&#96;</span></span><span class="token punctuation">,</span>
<span class="token prefix unchanged"> </span>     message<span class="token punctuation">:</span> <span class="token template-string"><span class="token template-punctuation string">&#96;</span><span class="token string">Unexpected block closing tag</span><span class="token template-punctuation string">&#96;</span></span>
<span class="token prefix unchanged"> </span>   <span class="token punctuation">&#125;</span><span class="token punctuation">)</span><span class="token punctuation">;</span>
<span class="token prefix unchanged"> </span> <span class="token punctuation">&#125;</span></span></code>` + "";

	let t250;
	let p26;
	let t251;
	let code57;
	let t252;
	let t253;
	let code58;
	let t254;
	let t255;
	let code59;
	let t256;
	let t257;
	let code60;
	let t258;
	let t259;
	let t260;
	let pre9;

	let raw9_value = `<code class="language-js">parser<span class="token punctuation">.</span><span class="token function">require_whitespace</span><span class="token punctuation">(</span><span class="token punctuation">)</span><span class="token punctuation">;</span>

<span class="token comment">// read the JS expression</span>
<span class="prism-highlight-code-line"><span class="token keyword">const</span> expression <span class="token operator">=</span> <span class="token function">read_expression</span><span class="token punctuation">(</span>parser<span class="token punctuation">)</span><span class="token punctuation">;</span></span>

<span class="token comment">// create the AST node</span>
<span class="token keyword">const</span> block<span class="token punctuation">:</span> TemplateNode <span class="token operator">=</span> <span class="token punctuation">&#123;</span><span class="token operator">...</span><span class="token punctuation">&#125;</span><span class="token punctuation">;</span>

parser<span class="token punctuation">.</span><span class="token function">allow_whitespace</span><span class="token punctuation">(</span><span class="token punctuation">)</span><span class="token punctuation">;</span>

<span class="token comment">// other logic blocks specific syntax</span>
<span class="token keyword">if</span> <span class="token punctuation">(</span>type <span class="token operator">===</span> <span class="token string">'EachBlock'</span><span class="token punctuation">)</span> <span class="token punctuation">&#123;</span>
  <span class="token comment">// &#123;#each&#125; block specific syntax for &#123;#each list as item&#125;</span>
  <span class="token comment">// ...</span>
<span class="token punctuation">&#125;</span></code>` + "";

	let t261;
	let p27;
	let t262;
	let t263;
	let section6;
	let h32;
	let a30;
	let t264;
	let t265;
	let p28;
	let t266;
	let code61;
	let t267;
	let t268;
	let code62;
	let t269;
	let t270;
	let t271;
	let p29;
	let t272;
	let code63;
	let t273;
	let t274;
	let code64;
	let t275;
	let t276;
	let t277;
	let pre10;

	let raw10_value = `<code class="language-js"><span class="token keyword">import</span> Expression <span class="token keyword">from</span> <span class="token string">'./shared/Expression'</span><span class="token punctuation">;</span>
<span class="token keyword">import</span> map_children <span class="token keyword">from</span> <span class="token string">'./shared/map_children'</span><span class="token punctuation">;</span>
<span class="token keyword">import</span> AbstractBlock <span class="token keyword">from</span> <span class="token string">'./shared/AbstractBlock'</span><span class="token punctuation">;</span>

<span class="token keyword">export</span> <span class="token keyword">default</span> <span class="token keyword">class</span> <span class="token class-name">KeyBlock</span> <span class="token keyword">extends</span> <span class="token class-name">AbstractBlock</span> <span class="token punctuation">&#123;</span>
  <span class="token comment">// for discriminant property for TypeScript to differentiate types</span>
  type<span class="token punctuation">:</span> <span class="token string">'KeyBlock'</span><span class="token punctuation">;</span>

  expression<span class="token punctuation">:</span> Expression<span class="token punctuation">;</span>

  <span class="token function">constructor</span><span class="token punctuation">(</span><span class="token parameter">component<span class="token punctuation">,</span> parent<span class="token punctuation">,</span> scope<span class="token punctuation">,</span> info</span><span class="token punctuation">)</span> <span class="token punctuation">&#123;</span>
    <span class="token keyword">super</span><span class="token punctuation">(</span>component<span class="token punctuation">,</span> parent<span class="token punctuation">,</span> scope<span class="token punctuation">,</span> info<span class="token punctuation">)</span><span class="token punctuation">;</span>

    <span class="token comment">// create an Expression instance for the expression</span>
    <span class="token keyword">this</span><span class="token punctuation">.</span>expression <span class="token operator">=</span> <span class="token keyword">new</span> <span class="token class-name">Expression</span><span class="token punctuation">(</span>component<span class="token punctuation">,</span> <span class="token keyword">this</span><span class="token punctuation">,</span> scope<span class="token punctuation">,</span> info<span class="token punctuation">.</span>expression<span class="token punctuation">)</span><span class="token punctuation">;</span>

    <span class="token comment">// loop through children and create respective node instance</span>
    <span class="token keyword">this</span><span class="token punctuation">.</span>children <span class="token operator">=</span> <span class="token function">map_children</span><span class="token punctuation">(</span>component<span class="token punctuation">,</span> <span class="token keyword">this</span><span class="token punctuation">,</span> scope<span class="token punctuation">,</span> info<span class="token punctuation">.</span>children<span class="token punctuation">)</span><span class="token punctuation">;</span>

    <span class="token comment">// simple validation: make sure the block is not empty</span>
    <span class="token keyword">this</span><span class="token punctuation">.</span><span class="token function">warn_if_empty_block</span><span class="token punctuation">(</span><span class="token punctuation">)</span><span class="token punctuation">;</span>
  <span class="token punctuation">&#125;</span>
<span class="token punctuation">&#125;</span></code>` + "";

	let t278;
	let p30;
	let t279;
	let t280;
	let p31;
	let t281;
	let t282;
	let ul5;
	let li20;
	let code65;
	let t283;
	let t284;
	let t285;
	let li21;
	let t286;
	let code66;
	let t287;
	let t288;
	let code67;
	let t289;
	let t290;
	let t291;
	let li22;
	let code68;
	let t292;
	let t293;
	let code69;
	let t294;
	let t295;
	let code70;
	let t296;
	let t297;
	let t298;
	let blockquote1;
	let p32;
	let t299;
	let t300;
	let p33;
	let t301;
	let t302;
	let p34;
	let t303;
	let t304;
	let ul6;
	let li23;
	let t305;
	let strong9;
	let t306;
	let t307;
	let li24;
	let t308;
	let code71;
	let t309;
	let t310;
	let a31;
	let code72;
	let t311;
	let t312;
	let strong10;
	let t313;
	let t314;
	let em1;
	let t315;
	let code73;
	let t316;
	let t317;
	let t318;
	let li25;
	let t319;
	let code74;
	let t320;
	let t321;
	let a32;
	let code75;
	let t322;
	let t323;
	let strong11;
	let t324;
	let t325;
	let em2;
	let t326;
	let code76;
	let t327;
	let t328;
	let t329;
	let p35;
	let t330;
	let t331;
	let p36;
	let t332;
	let code77;
	let t333;
	let t334;
	let code78;
	let t335;
	let t336;
	let t337;
	let pre11;

	let raw11_value = `<code class="language-js"><span class="token comment">// src/compiler/compile/nodes/shared/map_children.ts</span>
<span class="token keyword">function</span> <span class="token function">get_constructor</span><span class="token punctuation">(</span><span class="token parameter">type</span><span class="token punctuation">)</span> <span class="token punctuation">&#123;</span>
  <span class="token keyword">switch</span> <span class="token punctuation">(</span>type<span class="token punctuation">)</span> <span class="token punctuation">&#123;</span>
    <span class="token keyword">case</span> <span class="token string">'AwaitBlock'</span><span class="token punctuation">:</span>
      <span class="token keyword">return</span> AwaitBlock<span class="token punctuation">;</span>
    <span class="token keyword">case</span> <span class="token string">'Body'</span><span class="token punctuation">:</span>
      <span class="token keyword">return</span> Body<span class="token punctuation">;</span>
    <span class="token comment">// ...</span>
<span class="prism-highlight-code-line">    <span class="token keyword">case</span> <span class="token string">'KeyBlock'</span><span class="token punctuation">:</span></span>
      <span class="token keyword">return</span> KeyBlock<span class="token punctuation">;</span>
    <span class="token comment">// ...</span>
  <span class="token punctuation">&#125;</span>
<span class="token punctuation">&#125;</span></code>` + "";

	let t338;
	let p37;
	let t339;
	let code79;
	let t340;
	let t341;
	let code80;
	let t342;
	let t343;
	let t344;
	let pre12;

	let raw12_value = `<code class="language-js"><span class="token comment">// src/compiler/compile/nodes/interfaces.ts</span>
<span class="token keyword">export</span> type INode <span class="token operator">=</span>
  <span class="token operator">|</span> Action
  <span class="token operator">|</span> Animation
  <span class="token comment">// ...</span>
<span class="prism-highlight-code-line">  <span class="token operator">|</span> KeyBlock<span class="token punctuation">;</span></span>
<span class="token comment">// ...</span></code>` + "";

	let t345;
	let p38;
	let t346;
	let strong12;
	let t347;
	let t348;
	let code81;
	let t349;
	let t350;
	let t351;
	let section7;
	let h33;
	let a33;
	let t352;
	let t353;
	let p39;
	let t354;
	let strong13;
	let t355;
	let t356;
	let t357;
	let p40;
	let t358;
	let a34;
	let t359;
	let t360;
	let code82;
	let t361;
	let t362;
	let t363;
	let p41;
	let t364;
	let code83;
	let t365;
	let t366;
	let code84;
	let t367;
	let t368;
	let t369;
	let pre13;

	let raw13_value = `<code class="language-js"><span class="token keyword">function</span> <span class="token function">create_key_block</span><span class="token punctuation">(</span><span class="token parameter">ctx</span><span class="token punctuation">)</span> <span class="token punctuation">&#123;</span>
  <span class="token comment">// instructions to create / mount / update / destroy inner content of &#123;#key&#125;</span>
  <span class="token keyword">return</span> <span class="token punctuation">&#123;</span>
    <span class="token function">c</span><span class="token punctuation">(</span><span class="token punctuation">)</span> <span class="token punctuation">&#123;</span><span class="token punctuation">&#125;</span><span class="token punctuation">,</span>
    <span class="token function">m</span><span class="token punctuation">(</span><span class="token punctuation">)</span> <span class="token punctuation">&#123;</span><span class="token punctuation">&#125;</span><span class="token punctuation">,</span>
    <span class="token function">p</span><span class="token punctuation">(</span><span class="token punctuation">)</span> <span class="token punctuation">&#123;</span><span class="token punctuation">&#125;</span><span class="token punctuation">,</span>
    <span class="token function">d</span><span class="token punctuation">(</span><span class="token punctuation">)</span> <span class="token punctuation">&#123;</span><span class="token punctuation">&#125;</span><span class="token punctuation">,</span>
  <span class="token punctuation">&#125;</span><span class="token punctuation">;</span>
<span class="token punctuation">&#125;</span></code>` + "";

	let t370;
	let p42;
	let t371;
	let code85;
	let t372;
	let t373;
	let t374;
	let pre14;

	let raw14_value = `<code class="language-js"><span class="token keyword">const</span> key_block <span class="token operator">=</span> <span class="token function">create_key_block</span><span class="token punctuation">(</span>ctx<span class="token punctuation">)</span><span class="token punctuation">;</span>
<span class="token comment">// create the elements for the &#123;#key&#125;</span>
key_block<span class="token punctuation">.</span><span class="token function">c</span><span class="token punctuation">(</span><span class="token punctuation">)</span><span class="token punctuation">;</span>

<span class="token comment">// mount the elements in the &#123;#key&#125;</span>
key_block<span class="token punctuation">.</span><span class="token function">m</span><span class="token punctuation">(</span>target<span class="token punctuation">,</span> anchor<span class="token punctuation">)</span><span class="token punctuation">;</span>

<span class="token comment">// update the elements in the &#123;#key&#125;</span>
key_block<span class="token punctuation">.</span><span class="token function">p</span><span class="token punctuation">(</span>ctx<span class="token punctuation">,</span> dirty<span class="token punctuation">)</span><span class="token punctuation">;</span>

<span class="token comment">// destroy the elements in the &#123;#key&#125;</span>
key_block<span class="token punctuation">.</span><span class="token function">d</span><span class="token punctuation">(</span>detaching<span class="token punctuation">)</span><span class="token punctuation">;</span>

<span class="token comment">// intro &amp; outro the elements in the &#123;#key&#125;</span>
<span class="token function">transition_in</span><span class="token punctuation">(</span>key_block<span class="token punctuation">)</span><span class="token punctuation">;</span>
<span class="token function">transition_out</span><span class="token punctuation">(</span>key_block<span class="token punctuation">)</span><span class="token punctuation">;</span></code>` + "";

	let t375;
	let p43;
	let t376;
	let t377;
	let pre15;

	let raw15_value = `<code class="language-js"><span class="token keyword">function</span> <span class="token function">create_fragment</span><span class="token punctuation">(</span><span class="token parameter">ctx</span><span class="token punctuation">)</span> <span class="token punctuation">&#123;</span>
  <span class="token comment">// init</span>
  <span class="token keyword">let</span> key_block <span class="token operator">=</span> <span class="token function">create_key_block</span><span class="token punctuation">(</span>ctx<span class="token punctuation">)</span><span class="token punctuation">;</span>

  <span class="token keyword">return</span> <span class="token punctuation">&#123;</span>
    <span class="token function">c</span><span class="token punctuation">(</span><span class="token punctuation">)</span> <span class="token punctuation">&#123;</span>
      <span class="token comment">// create</span>
      key_block<span class="token punctuation">.</span><span class="token function">c</span><span class="token punctuation">(</span><span class="token punctuation">)</span><span class="token punctuation">;</span>
    <span class="token punctuation">&#125;</span><span class="token punctuation">,</span>
    <span class="token function">m</span><span class="token punctuation">(</span><span class="token parameter">target<span class="token punctuation">,</span> anchor</span><span class="token punctuation">)</span> <span class="token punctuation">&#123;</span>
      <span class="token comment">// mount</span>
      key_block<span class="token punctuation">.</span><span class="token function">m</span><span class="token punctuation">(</span>target<span class="token punctuation">,</span> anchor<span class="token punctuation">)</span><span class="token punctuation">;</span>
    <span class="token punctuation">&#125;</span><span class="token punctuation">,</span>
    <span class="token function">p</span><span class="token punctuation">(</span><span class="token parameter">ctx<span class="token punctuation">,</span> dirty</span><span class="token punctuation">)</span> <span class="token punctuation">&#123;</span>
      <span class="token comment">// update</span>
      key_block<span class="token punctuation">.</span><span class="token function">p</span><span class="token punctuation">(</span>ctx<span class="token punctuation">,</span> dirty<span class="token punctuation">)</span><span class="token punctuation">;</span>
    <span class="token punctuation">&#125;</span><span class="token punctuation">,</span>
    <span class="token function">i</span><span class="token punctuation">(</span><span class="token parameter">local</span><span class="token punctuation">)</span> <span class="token punctuation">&#123;</span>
      <span class="token comment">// intro</span>
      <span class="token function">transition_in</span><span class="token punctuation">(</span>key_block<span class="token punctuation">)</span><span class="token punctuation">;</span>
    <span class="token punctuation">&#125;</span><span class="token punctuation">,</span>
    <span class="token function">o</span><span class="token punctuation">(</span><span class="token parameter">local</span><span class="token punctuation">)</span> <span class="token punctuation">&#123;</span>
      <span class="token comment">// outro</span>
      <span class="token function">transition_out</span><span class="token punctuation">(</span>key_block<span class="token punctuation">)</span><span class="token punctuation">;</span>
    <span class="token punctuation">&#125;</span><span class="token punctuation">,</span>
    <span class="token function">d</span><span class="token punctuation">(</span><span class="token parameter">detaching</span><span class="token punctuation">)</span> <span class="token punctuation">&#123;</span>
      <span class="token comment">// destroy</span>
      key_block<span class="token punctuation">.</span><span class="token function">d</span><span class="token punctuation">(</span>detaching<span class="token punctuation">)</span><span class="token punctuation">;</span>
    <span class="token punctuation">&#125;</span><span class="token punctuation">,</span>
  <span class="token punctuation">&#125;</span><span class="token punctuation">;</span>
<span class="token punctuation">&#125;</span></code>` + "";

	let t378;
	let p44;
	let t379;
	let code86;
	let t380;
	let t381;
	let t382;
	let ul7;
	let li26;
	let t383;
	let t384;
	let li27;
	let t385;
	let code87;
	let t386;
	let t387;
	let t388;
	let pre16;

	let raw16_value = `<code class="language-js"><span class="token keyword">function</span> <span class="token function">create_fragment</span><span class="token punctuation">(</span><span class="token parameter">ctx</span><span class="token punctuation">)</span> <span class="token punctuation">&#123;</span>
  <span class="token comment">// we store the previous key expression value</span>
  <span class="token keyword">let</span> previous_key <span class="token operator">=</span> value_of_the_key_expression<span class="token punctuation">;</span>
  <span class="token comment">// ...</span>
  <span class="token keyword">return</span> <span class="token punctuation">&#123;</span>
    <span class="token comment">// ...</span>
    <span class="token function">p</span><span class="token punctuation">(</span><span class="token parameter">ctx<span class="token punctuation">,</span> dirty</span><span class="token punctuation">)</span> <span class="token punctuation">&#123;</span>
      <span class="token keyword">if</span> <span class="token punctuation">(</span>
        <span class="token comment">// if the any variables within the key has changed, and</span>
        dirty <span class="token operator">&amp;</span> dynamic_variables_in_key_expression <span class="token operator">&amp;&amp;</span>
        <span class="token comment">// if the value of the key expression has changed</span>
        previous_key <span class="token operator">!==</span> <span class="token punctuation">(</span>previous_key <span class="token operator">=</span> value_of_the_key_expression<span class="token punctuation">)</span>
      <span class="token punctuation">)</span> <span class="token punctuation">&#123;</span>
        <span class="token comment">// destroy the elements</span>
        <span class="token comment">// detaching = 1 (true) to remove the elements immediately</span>
        key_block<span class="token punctuation">.</span><span class="token function">d</span><span class="token punctuation">(</span><span class="token number">1</span><span class="token punctuation">)</span><span class="token punctuation">;</span>
        <span class="token comment">// create a new key_block</span>
        key_block <span class="token operator">=</span> <span class="token function">create_key_block</span><span class="token punctuation">(</span>ctx<span class="token punctuation">)</span><span class="token punctuation">;</span>
        key_block<span class="token punctuation">.</span><span class="token function">c</span><span class="token punctuation">(</span><span class="token punctuation">)</span><span class="token punctuation">;</span>
        <span class="token comment">// mount the new key_block</span>
        key_block<span class="token punctuation">.</span><span class="token function">m</span><span class="token punctuation">(</span><span class="token operator">...</span><span class="token punctuation">)</span><span class="token punctuation">;</span>
      <span class="token punctuation">&#125;</span> <span class="token keyword">else</span> <span class="token punctuation">&#123;</span>
        <span class="token comment">// if the key has not changed, make sure the content of &#123;#key&#125; is up to date</span>
        key_block<span class="token punctuation">.</span><span class="token function">p</span><span class="token punctuation">(</span><span class="token punctuation">)</span><span class="token punctuation">;</span>
      <span class="token punctuation">&#125;</span>
    <span class="token punctuation">&#125;</span>
    <span class="token comment">// ...</span>
  <span class="token punctuation">&#125;</span>
<span class="token punctuation">&#125;</span></code>` + "";

	let t389;
	let p45;
	let t390;
	let code88;
	let t391;
	let t392;
	let t393;
	let pre17;

	let raw17_value = `<code class="language-js"><span class="token comment">// instead of key_block.d(1);</span>
<span class="token function">group_outros</span><span class="token punctuation">(</span><span class="token punctuation">)</span><span class="token punctuation">;</span>
<span class="token function">transition_out</span><span class="token punctuation">(</span>key_block<span class="token punctuation">,</span> <span class="token number">1</span><span class="token punctuation">,</span> <span class="token number">1</span><span class="token punctuation">,</span> noop<span class="token punctuation">)</span><span class="token punctuation">;</span>
<span class="token function">check_outros</span><span class="token punctuation">(</span><span class="token punctuation">)</span><span class="token punctuation">;</span>

<span class="token comment">// before key_block.m(...)</span>
<span class="token function">transition_in</span><span class="token punctuation">(</span>key_block<span class="token punctuation">)</span><span class="token punctuation">;</span></code>` + "";

	let t394;
	let p46;
	let t395;
	let code89;
	let t396;
	let t397;
	let code90;
	let t398;
	let t399;
	let t400;
	let p47;
	let t401;
	let code91;
	let t402;
	let t403;
	let t404;
	let p48;
	let t405;
	let code92;
	let t406;
	let t407;
	let t408;
	let pre18;

	let raw18_value = `<code class="language-js"><span class="token keyword">export</span> <span class="token keyword">default</span> <span class="token keyword">class</span> <span class="token class-name">KeyBlockWrapper</span> <span class="token keyword">extends</span> <span class="token class-name">Wrapper</span> <span class="token punctuation">&#123;</span>
  <span class="token comment">// ...</span>
  <span class="token comment">// the &#96;key_block&#96; variable</span>
  <span class="token keyword">var</span><span class="token punctuation">:</span> Identifier <span class="token operator">=</span> <span class="token punctuation">&#123;</span> type<span class="token punctuation">:</span> <span class="token string">'Identifier'</span><span class="token punctuation">,</span> name<span class="token punctuation">:</span> <span class="token string">'key_block'</span> <span class="token punctuation">&#125;</span><span class="token punctuation">;</span>

  <span class="token function">constructor</span><span class="token punctuation">(</span><span class="token parameter">renderer<span class="token punctuation">:</span> Renderer<span class="token punctuation">,</span> block<span class="token punctuation">:</span> Block<span class="token punctuation">,</span> parent<span class="token punctuation">:</span> Wrapper<span class="token punctuation">,</span> node<span class="token punctuation">:</span> EachBlock<span class="token punctuation">,</span> strip_whitespace<span class="token punctuation">:</span> boolean<span class="token punctuation">,</span> next_sibling<span class="token punctuation">:</span> Wrapper</span><span class="token punctuation">)</span> <span class="token punctuation">&#123;</span>
    <span class="token keyword">super</span><span class="token punctuation">(</span>renderer<span class="token punctuation">,</span> block<span class="token punctuation">,</span> parent<span class="token punctuation">,</span> node<span class="token punctuation">)</span><span class="token punctuation">;</span>

    <span class="token comment">// deoptimisation, set flag indicate the content is not static</span>
    <span class="token keyword">this</span><span class="token punctuation">.</span><span class="token function">cannot_use_innerhtml</span><span class="token punctuation">(</span><span class="token punctuation">)</span><span class="token punctuation">;</span>
    <span class="token keyword">this</span><span class="token punctuation">.</span><span class="token function">not_static_content</span><span class="token punctuation">(</span><span class="token punctuation">)</span><span class="token punctuation">;</span>

    <span class="token comment">// get all the dynamic variables within the expression</span>
    <span class="token comment">// useful for later</span>
    <span class="token keyword">this</span><span class="token punctuation">.</span>dependencies <span class="token operator">=</span> node<span class="token punctuation">.</span>expression<span class="token punctuation">.</span><span class="token function">dynamic_dependencies</span><span class="token punctuation">(</span><span class="token punctuation">)</span><span class="token punctuation">;</span>

    <span class="token comment">// create a new &#96;create_fragment&#96; function</span>
    <span class="token keyword">this</span><span class="token punctuation">.</span>block <span class="token operator">=</span> block<span class="token punctuation">.</span><span class="token function">child</span><span class="token punctuation">(</span><span class="token punctuation">&#123;</span>
      comment<span class="token punctuation">:</span> <span class="token function">create_debugging_comment</span><span class="token punctuation">(</span>node<span class="token punctuation">,</span> renderer<span class="token punctuation">.</span>component<span class="token punctuation">)</span><span class="token punctuation">,</span>
      name<span class="token punctuation">:</span> renderer<span class="token punctuation">.</span>component<span class="token punctuation">.</span><span class="token function">get_unique_name</span><span class="token punctuation">(</span><span class="token string">'create_key_block'</span><span class="token punctuation">)</span><span class="token punctuation">,</span>
      type<span class="token punctuation">:</span> <span class="token string">'key'</span><span class="token punctuation">,</span>
    <span class="token punctuation">&#125;</span><span class="token punctuation">)</span><span class="token punctuation">;</span>
    renderer<span class="token punctuation">.</span>blocks<span class="token punctuation">.</span><span class="token function">push</span><span class="token punctuation">(</span>block<span class="token punctuation">)</span><span class="token punctuation">;</span>

    <span class="token comment">// create render-dom Wrappers for the children</span>
    <span class="token keyword">this</span><span class="token punctuation">.</span>fragment <span class="token operator">=</span> <span class="token keyword">new</span> <span class="token class-name">FragmentWrapper</span><span class="token punctuation">(</span>renderer<span class="token punctuation">,</span> <span class="token keyword">this</span><span class="token punctuation">.</span>block<span class="token punctuation">,</span> node<span class="token punctuation">.</span>children<span class="token punctuation">,</span> parent<span class="token punctuation">,</span> strip_whitespace<span class="token punctuation">,</span> next_sibling<span class="token punctuation">)</span><span class="token punctuation">;</span>
  <span class="token punctuation">&#125;</span>
  <span class="token function">render</span><span class="token punctuation">(</span><span class="token parameter">block<span class="token punctuation">:</span> Block<span class="token punctuation">,</span> parent_node<span class="token punctuation">:</span> Identifier<span class="token punctuation">,</span> parent_nodes<span class="token punctuation">:</span> Identifier</span><span class="token punctuation">)</span> <span class="token punctuation">&#123;</span>
    <span class="token comment">// NOTE: here is where we write the render code</span>
  <span class="token punctuation">&#125;</span>
<span class="token punctuation">&#125;</span></code>` + "";

	let t409;
	let p49;
	let t410;
	let t411;
	let ul10;
	let li30;
	let t412;
	let code93;
	let t413;
	let t414;
	let code94;
	let t415;
	let t416;
	let code95;
	let t417;
	let t418;
	let code96;
	let t419;
	let t420;
	let code97;
	let t421;
	let t422;
	let code98;
	let t423;
	let t424;
	let code99;
	let t425;
	let t426;
	let ul8;
	let li28;
	let t427;
	let code100;
	let t428;
	let t429;
	let code101;
	let t430;
	let t431;
	let li29;
	let t432;
	let code102;
	let t433;
	let t434;
	let li32;
	let t435;
	let strong14;
	let t436;
	let t437;
	let code103;
	let t438;
	let t439;
	let strong15;
	let t440;
	let t441;
	let ul9;
	let li31;
	let t442;
	let code104;
	let t443;
	let t444;
	let a35;
	let t445;
	let t446;
	let p50;
	let t447;
	let code105;
	let t448;
	let t449;
	let t450;
	let p51;
	let t451;
	let code106;
	let t452;
	let t453;
	let t454;
	let pre19;

	let raw19_value = `<code class="language-js"><span class="token function">render</span><span class="token punctuation">(</span><span class="token parameter">block<span class="token punctuation">:</span> Block<span class="token punctuation">,</span> parent_node<span class="token punctuation">:</span> Identifier<span class="token punctuation">,</span> parent_nodes<span class="token punctuation">:</span> Identifier</span><span class="token punctuation">)</span> <span class="token punctuation">&#123;</span>
<span class="prism-highlight-code-line">  <span class="token keyword">this</span><span class="token punctuation">.</span>fragment<span class="token punctuation">.</span><span class="token function">render</span><span class="token punctuation">(</span></span>
<span class="prism-highlight-code-line">    <span class="token keyword">this</span><span class="token punctuation">.</span>block<span class="token punctuation">,</span></span>
<span class="prism-highlight-code-line">    <span class="token keyword">null</span><span class="token punctuation">,</span></span>
<span class="prism-highlight-code-line">    <span class="token punctuation">(</span>x<span class="token template-string"><span class="token template-punctuation string">&#96;</span><span class="token string">#nodes</span><span class="token template-punctuation string">&#96;</span></span> <span class="token keyword">as</span> unknown<span class="token punctuation">)</span> <span class="token keyword">as</span> Identifier</span>
<span class="prism-highlight-code-line">  <span class="token punctuation">)</span><span class="token punctuation">;</span></span>
<span class="token punctuation">&#125;</span></code>` + "";

	let t455;
	let p52;
	let t456;
	let code107;
	let t457;
	let t458;
	let code108;
	let t459;
	let t460;
	let code109;
	let t461;
	let t462;
	let code110;
	let t463;
	let t464;
	let code111;
	let t465;
	let t466;
	let t467;
	let hr0;
	let t468;
	let p53;
	let t469;
	let code112;
	let t470;
	let t471;
	let code113;
	let t472;
	let t473;
	let t474;
	let pre20;

	let raw20_value = `<code class="language-html"><span class="token tag"><span class="token tag"><span class="token punctuation">&lt;</span>div</span><span class="token punctuation">></span></span>
  <span class="token tag"><span class="token tag"><span class="token punctuation">&lt;</span>span</span> <span class="token punctuation">/></span></span>
<span class="token tag"><span class="token tag"><span class="token punctuation">&lt;/</span>div</span><span class="token punctuation">></span></span></code>` + "";

	let t475;
	let p54;
	let t476;
	let code114;
	let t477;
	let t478;
	let t479;
	let pre21;

	let raw21_value = `<code class="language-js">spanWrapper<span class="token punctuation">.</span><span class="token function">render</span><span class="token punctuation">(</span>
  block<span class="token punctuation">,</span>
  <span class="token keyword">this</span><span class="token punctuation">.</span>var<span class="token punctuation">,</span> <span class="token comment">// div's var</span>
  x<span class="token template-string"><span class="token template-punctuation string">&#96;</span><span class="token interpolation"><span class="token interpolation-punctuation punctuation">$&#123;</span><span class="token keyword">this</span><span class="token punctuation">.</span>var<span class="token punctuation">.</span>name<span class="token interpolation-punctuation punctuation">&#125;</span></span><span class="token string">.childNodes</span><span class="token template-punctuation string">&#96;</span></span><span class="token punctuation">,</span> <span class="token comment">// div.childNodes</span>
<span class="token punctuation">)</span><span class="token punctuation">;</span></code>` + "";

	let t480;
	let p55;
	let t481;
	let code115;
	let t482;
	let t483;
	let code116;
	let t484;
	let t485;
	let code117;
	let t486;
	let t487;
	let t488;
	let hr1;
	let t489;
	let p56;
	let t490;
	let t491;
	let pre22;

	let raw22_value = `<code class="language-js"><span class="token comment">// let key_block = create_key_block(ctx);</span>
block<span class="token punctuation">.</span>chunks<span class="token punctuation">.</span>init<span class="token punctuation">.</span><span class="token function">push</span><span class="token punctuation">(</span>
  b<span class="token template-string"><span class="token template-punctuation string">&#96;</span><span class="token string">let </span><span class="token interpolation"><span class="token interpolation-punctuation punctuation">$&#123;</span><span class="token keyword">this</span><span class="token punctuation">.</span>var<span class="token interpolation-punctuation punctuation">&#125;</span></span><span class="token string"> = </span><span class="token interpolation"><span class="token interpolation-punctuation punctuation">$&#123;</span><span class="token keyword">this</span><span class="token punctuation">.</span>block<span class="token punctuation">.</span>name<span class="token interpolation-punctuation punctuation">&#125;</span></span><span class="token string">(#ctx)</span><span class="token template-punctuation string">&#96;</span></span>
<span class="token punctuation">)</span><span class="token punctuation">;</span>

<span class="token comment">// key_block.c();</span>
block<span class="token punctuation">.</span>chunks<span class="token punctuation">.</span>create<span class="token punctuation">.</span><span class="token function">push</span><span class="token punctuation">(</span>b<span class="token template-string"><span class="token template-punctuation string">&#96;</span><span class="token interpolation"><span class="token interpolation-punctuation punctuation">$&#123;</span><span class="token keyword">this</span><span class="token punctuation">.</span>var<span class="token interpolation-punctuation punctuation">&#125;</span></span><span class="token string">.c();</span><span class="token template-punctuation string">&#96;</span></span><span class="token punctuation">)</span><span class="token punctuation">;</span>

<span class="token comment">// key_block.m(...);</span>
block<span class="token punctuation">.</span>chunks<span class="token punctuation">.</span>mount<span class="token punctuation">.</span><span class="token function">push</span><span class="token punctuation">(</span>
  b<span class="token template-string"><span class="token template-punctuation string">&#96;</span><span class="token interpolation"><span class="token interpolation-punctuation punctuation">$&#123;</span><span class="token keyword">this</span><span class="token punctuation">.</span>var<span class="token interpolation-punctuation punctuation">&#125;</span></span><span class="token string">.m(</span><span class="token interpolation"><span class="token interpolation-punctuation punctuation">$&#123;</span>parent_node <span class="token operator">||</span> <span class="token string">"#target"</span><span class="token interpolation-punctuation punctuation">&#125;</span></span><span class="token string">, </span><span class="token interpolation"><span class="token interpolation-punctuation punctuation">$&#123;</span>parent_node <span class="token operator">?</span> <span class="token string">"null"</span> <span class="token punctuation">:</span> <span class="token string">"#anchor"</span><span class="token interpolation-punctuation punctuation">&#125;</span></span><span class="token string">);</span><span class="token template-punctuation string">&#96;</span></span>
<span class="token punctuation">)</span><span class="token punctuation">;</span>

<span class="token comment">// key_block.p(...);</span>
block<span class="token punctuation">.</span>chunks<span class="token punctuation">.</span>update<span class="token punctuation">.</span><span class="token function">push</span><span class="token punctuation">(</span>
  b<span class="token template-string"><span class="token template-punctuation string">&#96;</span><span class="token interpolation"><span class="token interpolation-punctuation punctuation">$&#123;</span><span class="token keyword">this</span><span class="token punctuation">.</span>var<span class="token interpolation-punctuation punctuation">&#125;</span></span><span class="token string">.p(#ctx, #dirty);</span><span class="token template-punctuation string">&#96;</span></span>
<span class="token punctuation">)</span><span class="token punctuation">;</span>

<span class="token comment">// key_block.d(...);</span>
block<span class="token punctuation">.</span>chunks<span class="token punctuation">.</span>destroy<span class="token punctuation">.</span><span class="token function">push</span><span class="token punctuation">(</span>b<span class="token template-string"><span class="token template-punctuation string">&#96;</span><span class="token interpolation"><span class="token interpolation-punctuation punctuation">$&#123;</span><span class="token keyword">this</span><span class="token punctuation">.</span>var<span class="token interpolation-punctuation punctuation">&#125;</span></span><span class="token string">.d(detaching)</span><span class="token template-punctuation string">&#96;</span></span><span class="token punctuation">)</span><span class="token punctuation">;</span></code>` + "";

	let t492;
	let p57;
	let t493;
	let t494;
	let ul12;
	let li33;
	let t495;
	let code118;
	let t496;
	let t497;
	let code119;
	let t498;
	let t499;
	let code120;
	let t500;
	let t501;
	let code121;
	let t502;
	let t503;
	let t504;
	let li35;
	let t505;
	let a36;
	let t506;
	let t507;
	let code122;
	let t508;
	let t509;
	let code123;
	let t510;
	let t511;
	let ul11;
	let li34;
	let t512;
	let code124;
	let t513;
	let t514;
	let a37;
	let t515;
	let t516;
	let p58;
	let t517;
	let code125;
	let t518;
	let t519;
	let pre23;
	let raw23_value = `<code class="language-js"><span class="token keyword">const</span> is_dirty <span class="token operator">=</span> <span class="token keyword">this</span><span class="token punctuation">.</span>renderer<span class="token punctuation">.</span><span class="token function">dirty</span><span class="token punctuation">(</span><span class="token keyword">this</span><span class="token punctuation">.</span>dependencies<span class="token punctuation">)</span><span class="token punctuation">;</span></code>` + "";
	let t520;
	let p59;
	let t521;
	let code126;
	let t522;
	let t523;
	let t524;
	let p60;
	let t525;
	let t526;
	let pre24;

	let raw24_value = `<code class="language-js"><span class="token comment">// we store the previous key expression value</span>
<span class="token keyword">let</span> previous_key <span class="token operator">=</span> value_of_the_key_expression<span class="token punctuation">;</span>
<span class="token comment">// ...</span>
<span class="token comment">// if the value of the key expression has changed</span>
previous_key <span class="token operator">!==</span> <span class="token punctuation">(</span>previous_key <span class="token operator">=</span> value_of_the_key_expression<span class="token punctuation">)</span></code>` + "";

	let t527;
	let p61;
	let t528;
	let code127;
	let t529;
	let t530;
	let t531;
	let pre25;

	let raw25_value = `<code class="language-js"><span class="token keyword">const</span> previous_key <span class="token operator">=</span> block<span class="token punctuation">.</span><span class="token function">get_unique_name</span><span class="token punctuation">(</span><span class="token string">'previous_key'</span><span class="token punctuation">)</span><span class="token punctuation">;</span>
<span class="token keyword">const</span> snippet <span class="token operator">=</span> <span class="token keyword">this</span><span class="token punctuation">.</span>node<span class="token punctuation">.</span>expression<span class="token punctuation">.</span><span class="token function">manipulate</span><span class="token punctuation">(</span>block<span class="token punctuation">)</span><span class="token punctuation">;</span>
block<span class="token punctuation">.</span><span class="token function">add_variable</span><span class="token punctuation">(</span>previous_key<span class="token punctuation">,</span> snippet<span class="token punctuation">)</span><span class="token punctuation">;</span></code>` + "";

	let t532;
	let p62;
	let code128;
	let t533;
	let t534;
	let code129;
	let t535;
	let t536;
	let t537;
	let pre26;

	let raw26_value = `<code class="language-js">human<span class="token punctuation">.</span>age <span class="token operator">+</span> limit
<span class="token comment">// into something like</span>
ctx<span class="token punctuation">[</span><span class="token number">0</span><span class="token punctuation">]</span><span class="token punctuation">.</span>age <span class="token operator">+</span> ctx<span class="token punctuation">[</span><span class="token number">2</span><span class="token punctuation">]</span></code>` + "";

	let t538;
	let p63;
	let t539;
	let code130;
	let t540;
	let t541;
	let t542;
	let pre27;
	let raw27_value = `<code class="language-js"><span class="token keyword">const</span> has_change <span class="token operator">=</span> x<span class="token template-string"><span class="token template-punctuation string">&#96;</span><span class="token interpolation"><span class="token interpolation-punctuation punctuation">$&#123;</span>previous_key<span class="token interpolation-punctuation punctuation">&#125;</span></span><span class="token string"> !== (</span><span class="token interpolation"><span class="token interpolation-punctuation punctuation">$&#123;</span>previous_key<span class="token interpolation-punctuation punctuation">&#125;</span></span><span class="token string"> = </span><span class="token interpolation"><span class="token interpolation-punctuation punctuation">$&#123;</span>snippet<span class="token interpolation-punctuation punctuation">&#125;</span></span><span class="token string">)</span><span class="token template-punctuation string">&#96;</span></span></code>` + "";
	let t543;
	let p64;
	let t544;
	let t545;
	let pre28;

	let raw28_value = `<code class="language-js">block<span class="token punctuation">.</span>chunks<span class="token punctuation">.</span>update<span class="token punctuation">.</span><span class="token function">push</span><span class="token punctuation">(</span>b<span class="token template-string"><span class="token template-punctuation string">&#96;</span><span class="token string">
  if (</span><span class="token interpolation"><span class="token interpolation-punctuation punctuation">$&#123;</span>is_dirty<span class="token interpolation-punctuation punctuation">&#125;</span></span><span class="token string"> &amp;&amp; </span><span class="token interpolation"><span class="token interpolation-punctuation punctuation">$&#123;</span>has_change<span class="token interpolation-punctuation punctuation">&#125;</span></span><span class="token string">) &#123;
    </span><span class="token interpolation"><span class="token interpolation-punctuation punctuation">$&#123;</span><span class="token keyword">this</span><span class="token punctuation">.</span>var<span class="token interpolation-punctuation punctuation">&#125;</span></span><span class="token string">.d(1);
    </span><span class="token interpolation"><span class="token interpolation-punctuation punctuation">$&#123;</span><span class="token keyword">this</span><span class="token punctuation">.</span>var<span class="token interpolation-punctuation punctuation">&#125;</span></span><span class="token string"> = </span><span class="token interpolation"><span class="token interpolation-punctuation punctuation">$&#123;</span><span class="token keyword">this</span><span class="token punctuation">.</span>block<span class="token punctuation">.</span>name<span class="token interpolation-punctuation punctuation">&#125;</span></span><span class="token string">(#ctx);
    </span><span class="token interpolation"><span class="token interpolation-punctuation punctuation">$&#123;</span><span class="token keyword">this</span><span class="token punctuation">.</span>var<span class="token interpolation-punctuation punctuation">&#125;</span></span><span class="token string">.c();
    </span><span class="token interpolation"><span class="token interpolation-punctuation punctuation">$&#123;</span><span class="token keyword">this</span><span class="token punctuation">.</span>var<span class="token interpolation-punctuation punctuation">&#125;</span></span><span class="token string">.m(</span><span class="token interpolation"><span class="token interpolation-punctuation punctuation">$&#123;</span><span class="token keyword">this</span><span class="token punctuation">.</span><span class="token function">get_update_mount_node</span><span class="token punctuation">(</span>anchor<span class="token punctuation">)</span><span class="token interpolation-punctuation punctuation">&#125;</span></span><span class="token string">, </span><span class="token interpolation"><span class="token interpolation-punctuation punctuation">$&#123;</span>anchor<span class="token interpolation-punctuation punctuation">&#125;</span></span><span class="token string">);
  &#125; else &#123;
    </span><span class="token interpolation"><span class="token interpolation-punctuation punctuation">$&#123;</span><span class="token keyword">this</span><span class="token punctuation">.</span>var<span class="token interpolation-punctuation punctuation">&#125;</span></span><span class="token string">.p(#ctx, #dirty);
  &#125;
</span><span class="token template-punctuation string">&#96;</span></span><span class="token punctuation">)</span><span class="token punctuation">;</span></code>` + "";

	let t546;
	let p65;
	let t547;
	let code131;
	let t548;
	let t549;
	let code132;
	let t550;
	let t551;
	let a38;
	let t552;
	let t553;
	let t554;
	let pre29;
	let raw29_value = `<code class="language-js"><span class="token keyword">const</span> anchor <span class="token operator">=</span> <span class="token keyword">this</span><span class="token punctuation">.</span><span class="token function">get_or_create_anchor</span><span class="token punctuation">(</span>block<span class="token punctuation">,</span> parent_node<span class="token punctuation">,</span> parent_nodes<span class="token punctuation">)</span><span class="token punctuation">;</span></code>` + "";
	let t555;
	let p66;
	let t556;
	let code133;
	let t557;
	let t558;
	let t559;
	let p67;
	let t560;
	let t561;
	let pre30;

	let raw30_value = `<code class="language-js"><span class="token keyword">const</span> has_transitions <span class="token operator">=</span> <span class="token operator">!</span><span class="token operator">!</span><span class="token punctuation">(</span><span class="token keyword">this</span><span class="token punctuation">.</span>block<span class="token punctuation">.</span>has_intro_method <span class="token operator">||</span> <span class="token keyword">this</span><span class="token punctuation">.</span>block<span class="token punctuation">.</span>has_outro_method<span class="token punctuation">)</span><span class="token punctuation">;</span>
<span class="token keyword">const</span> transition_out <span class="token operator">=</span> b<span class="token template-string"><span class="token template-punctuation string">&#96;</span><span class="token string">
  @group_outros();
  @transition_out(</span><span class="token interpolation"><span class="token interpolation-punctuation punctuation">$&#123;</span><span class="token keyword">this</span><span class="token punctuation">.</span>var<span class="token interpolation-punctuation punctuation">&#125;</span></span><span class="token string">, 1, 1, @noop);
  @check_outros();
</span><span class="token template-punctuation string">&#96;</span></span><span class="token punctuation">;</span>
<span class="token keyword">const</span> transition_in <span class="token operator">=</span> b<span class="token template-string"><span class="token template-punctuation string">&#96;</span><span class="token string">
  @transition_in(</span><span class="token interpolation"><span class="token interpolation-punctuation punctuation">$&#123;</span><span class="token keyword">this</span><span class="token punctuation">.</span>var<span class="token interpolation-punctuation punctuation">&#125;</span></span><span class="token string">);
</span><span class="token template-punctuation string">&#96;</span></span><span class="token punctuation">;</span></code>` + "";

	let t562;
	let p68;
	let t563;
	let t564;
	let section8;
	let h34;
	let a39;
	let t565;
	let t566;
	let p69;
	let t567;
	let code134;
	let t568;
	let t569;
	let code135;
	let t570;
	let t571;
	let t572;
	let pre31;

	let raw31_value = `<code class="language-js"><span class="token keyword">import</span> KeyBlock <span class="token keyword">from</span> <span class="token string">'../../nodes/KeyBlock'</span><span class="token punctuation">;</span>
<span class="token keyword">import</span> Renderer<span class="token punctuation">,</span> <span class="token punctuation">&#123;</span> RenderOptions <span class="token punctuation">&#125;</span> <span class="token keyword">from</span> <span class="token string">'../Renderer'</span><span class="token punctuation">;</span>

<span class="token keyword">export</span> <span class="token keyword">default</span> <span class="token keyword">function</span><span class="token punctuation">(</span><span class="token parameter">node<span class="token punctuation">:</span> KeyBlock<span class="token punctuation">,</span> renderer<span class="token punctuation">:</span> Renderer<span class="token punctuation">,</span> options<span class="token punctuation">:</span> RenderOptions</span><span class="token punctuation">)</span> <span class="token punctuation">&#123;</span>
	renderer<span class="token punctuation">.</span><span class="token function">render</span><span class="token punctuation">(</span>node<span class="token punctuation">.</span>children<span class="token punctuation">,</span> options<span class="token punctuation">)</span><span class="token punctuation">;</span>
<span class="token punctuation">&#125;</span></code>` + "";

	let t573;
	let p70;
	let t574;
	let code136;
	let t575;
	let t576;
	let code137;
	let t577;
	let t578;
	let t579;
	let section9;
	let h35;
	let a40;
	let t580;
	let t581;
	let p71;
	let t582;
	let t583;
	let p72;
	let t584;
	let t585;
	let section10;
	let h36;
	let a41;
	let t586;
	let t587;
	let ul13;
	let li36;
	let t588;
	let code138;
	let t589;
	let t590;
	let t591;
	let li37;
	let t592;
	let a42;
	let code139;
	let t593;
	let t594;
	let t595;
	let section11;
	let h23;
	let a43;
	let t596;
	let t597;
	let p73;
	let t598;
	let a44;
	let t599;
	let t600;
	let a45;
	let t601;
	let t602;
	let t603;
	let ol;
	let li38;
	let p74;
	let strong16;
	let t604;
	let t605;
	let t606;
	let li39;
	let p75;
	let strong17;
	let t607;
	let t608;
	let t609;
	let li40;
	let p76;
	let strong18;
	let t610;
	let t611;
	let strong19;
	let t612;
	let t613;
	let code140;
	let t614;
	let t615;
	let pre32;

	let raw32_value = `<code class="language-svelte"><span class="token tag"><span class="token tag"><span class="token punctuation">&lt;</span>script</span><span class="token punctuation">></span></span><span class="token script"><span class="token language-javascript">
  <span class="token keyword">let</span> reactive1<span class="token punctuation">;</span>
  <span class="token keyword">let</span> reactive2<span class="token punctuation">;</span>
  <span class="token keyword">let</span> key<span class="token punctuation">;</span>
</span></span><span class="token tag"><span class="token tag"><span class="token punctuation">&lt;/</span>script</span><span class="token punctuation">></span></span>

<span class="token language-javascript"><span class="token punctuation">&#123;</span>#key key<span class="token punctuation">&#125;</span></span>
   <span class="token language-javascript"><span class="token punctuation">&#123;</span>key<span class="token punctuation">&#125;</span></span> <span class="token language-javascript"><span class="token punctuation">&#123;</span>reactive1<span class="token punctuation">&#125;</span></span>
<span class="token language-javascript"><span class="token punctuation">&#123;</span><span class="token operator">/</span>key<span class="token punctuation">&#125;</span></span>

<span class="token language-javascript"><span class="token punctuation">&#123;</span>reactive2<span class="token punctuation">&#125;</span></span></code>` + "";

	let t616;
	let li41;
	let p77;
	let strong20;
	let t617;
	let t618;
	let t619;
	let pre33;

	let raw33_value = `<code class="language-svelte"><span class="token tag"><span class="token tag"><span class="token punctuation">&lt;</span>script</span><span class="token punctuation">></span></span><span class="token script"><span class="token language-javascript">
   <span class="token keyword">let</span> a <span class="token operator">=</span> <span class="token number">1</span><span class="token punctuation">;</span>
   <span class="token keyword">let</span> b <span class="token operator">=</span> <span class="token number">2</span><span class="token punctuation">;</span>
   <span class="token keyword">function</span> <span class="token function">update</span><span class="token punctuation">(</span><span class="token punctuation">)</span> <span class="token punctuation">&#123;</span>
     a <span class="token operator">=</span> <span class="token number">2</span><span class="token punctuation">;</span>
     b <span class="token operator">=</span> <span class="token number">1</span><span class="token punctuation">;</span>
   <span class="token punctuation">&#125;</span>
</span></span><span class="token tag"><span class="token tag"><span class="token punctuation">&lt;/</span>script</span><span class="token punctuation">></span></span>
<span class="token language-javascript"><span class="token punctuation">&#123;</span>#key a <span class="token operator">+</span> b<span class="token punctuation">&#125;</span></span>
   <span class="token tag"><span class="token tag"><span class="token punctuation">&lt;</span>div</span> <span class="token punctuation">/></span></span>
<span class="token language-javascript"><span class="token punctuation">&#123;</span><span class="token operator">/</span>key<span class="token punctuation">&#125;</span></span></code>` + "";

	let t620;
	let section12;
	let h24;
	let a46;
	let t621;
	let t622;
	let p78;
	let t623;
	let a47;
	let t624;
	let t625;
	let t626;
	let hr2;
	let t627;
	let p79;
	let t628;
	let a48;
	let t629;
	let t630;
	let t631;
	let p80;
	let t632;
	let a49;
	let t633;
	let t634;

	return {
		c() {
			section0 = element("section");
			ul2 = element("ul");
			li0 = element("li");
			a0 = element("a");
			t0 = text("Background");
			li1 = element("li");
			a1 = element("a");
			t1 = text("The motivation");
			ul0 = element("ul");
			li2 = element("li");
			a2 = element("a");
			t2 = text("Transitions for reactive data change");
			li3 = element("li");
			a3 = element("a");
			t3 = text("The implementation");
			ul1 = element("ul");
			li4 = element("li");
			a4 = element("a");
			t4 = text("Parsing");
			li5 = element("li");
			a5 = element("a");
			t5 = text("Tracking references and dependencies");
			li6 = element("li");
			a6 = element("a");
			t6 = text("Creating code blocks & fragments");
			li7 = element("li");
			a7 = element("a");
			t7 = text("Creating code for SSR");
			li8 = element("li");
			a8 = element("a");
			t8 = text("Generate code");
			li9 = element("li");
			a9 = element("a");
			t9 = text("A few other implementation consideration");
			li10 = element("li");
			a10 = element("a");
			t10 = text("The testing");
			li11 = element("li");
			a11 = element("a");
			t11 = text("Closing Notes");
			t12 = space();
			section1 = element("section");
			h20 = element("h2");
			a12 = element("a");
			t13 = text("Background");
			t14 = space();
			p0 = element("p");
			t15 = text("Unlike the other contributing to Svelte posts [");
			a13 = element("a");
			t16 = text("1");
			t17 = text("] [");
			a14 = element("a");
			t18 = text("2");
			t19 = text("], which I wrote it while implementing the fix, describing as detailed as possible, today I am going to share the process of how I implemented the ");
			code0 = element("code");
			t20 = text("{#key}");
			t21 = text(" block retrospectively.");
			t22 = space();
			p1 = element("p");
			t23 = text("The implementation of the ");
			code1 = element("code");
			t24 = text("{#key}");
			t25 = text(" block is much simpler, relative to ");
			code2 = element("code");
			t26 = text("{#if}");
			t27 = text(", ");
			code3 = element("code");
			t28 = text("{#await}");
			t29 = text(" or ");
			code4 = element("code");
			t30 = text("{#each}");
			t31 = text(". And I believe the process of implementing the ");
			code5 = element("code");
			t32 = text("{#key}");
			t33 = text(" block helps paint the pratical side of ");
			a15 = element("a");
			t34 = text("\"The Svelte Compiler Handbook\"");
			t35 = text(" or my ");
			a16 = element("a");
			t36 = text("\"Looking into the Svelte compiler\" talk");
			t37 = text(".");
			t38 = space();
			section2 = element("section");
			h21 = element("h2");
			a17 = element("a");
			t39 = text("The motivation");
			t40 = space();
			p2 = element("p");
			t41 = text("The idea of ");
			code6 = element("code");
			t42 = text("{#key}");
			t43 = text(" block starts with the feature request 2 years ago ");
			em0 = element("em");
			t44 = text("(yea, it's that long)");
			t45 = text(" for ");
			strong0 = element("strong");
			t46 = text("the ability to key a non-each component");
			t47 = text(", ");
			a18 = element("a");
			t48 = text("GitHub issue #1469");
			t49 = text(".");
			t50 = space();
			p3 = element("p");
			t51 = text("To ");
			code7 = element("code");
			t52 = text("key");
			t53 = text(" a component, is to force recreation of the component when the ");
			code8 = element("code");
			t54 = text("key");
			t55 = text(" changes.");
			t56 = space();
			p4 = element("p");
			t57 = text("And you see this ability of destroying and creating new components when using ");
			code9 = element("code");
			t58 = text("{#each}");
			t59 = text(" with ");
			code10 = element("code");
			t60 = text("key");
			t61 = text(":");
			t62 = space();
			pre0 = element("pre");
			t63 = space();
			p5 = element("p");
			a19 = element("a");
			t64 = text("REPL");
			t65 = space();
			p6 = element("p");
			t66 = text("When we call the function ");
			code11 = element("code");
			t67 = text("update");
			t68 = text(", we removed ");
			code12 = element("code");
			t69 = text("alice");
			t70 = text(" from the ");
			code13 = element("code");
			t71 = text("data");
			t72 = text(" and we added ");
			code14 = element("code");
			t73 = text("bob");
			t74 = text(". The net effect is still having a list of 1 item. However, instead of reusing the 1 ");
			code15 = element("code");
			t75 = text("<div />");
			t76 = text(" by updating ");
			code16 = element("code");
			t77 = text("{ item.name }");
			t78 = text(" to ");
			code17 = element("code");
			t79 = text("\"bob\"");
			t80 = text(", Svelte removes and destroys the ");
			code18 = element("code");
			t81 = text("<div />");
			t82 = text(" and create a new ");
			code19 = element("code");
			t83 = text("<div />");
			t84 = text(" for ");
			code20 = element("code");
			t85 = text("bob");
			t86 = text(". This is because of the ");
			a20 = element("a");
			t87 = text("key we specified to the ");
			code21 = element("code");
			t88 = text("{#each}");
			t89 = text(" block");
			t90 = text(". Svelte will not reuse the ");
			code22 = element("code");
			t91 = text("<div />");
			t92 = text(" because it was created with a different ");
			code23 = element("code");
			t93 = text("key");
			t94 = text(".");
			t95 = space();
			p7 = element("p");
			t96 = text("One of the benefits of having a key for ");
			code24 = element("code");
			t97 = text("{#each}");
			t98 = text(" item is to be able to add transition to the item correctly. Without a ");
			code25 = element("code");
			t99 = text("key");
			t100 = text(" to identify which item is added / removed, the transiion on a ");
			code26 = element("code");
			t101 = text("{#each}");
			t102 = text(" list will always applied to the last item, when the list grows or shrinks in length.");
			t103 = space();
			p8 = element("p");
			a21 = element("a");
			t104 = text("Try with and without the ");
			code27 = element("code");
			t105 = text("key");
			t106 = text(" in this REPL");
			t107 = text(" to see the importance of having a ");
			code28 = element("code");
			t108 = text("key");
			t109 = text(".");
			t110 = space();
			blockquote0 = element("blockquote");
			p9 = element("p");
			t111 = text("This is similar to the ");
			code29 = element("code");
			t112 = text("key");
			t113 = text(" attribute of React, if you are familiar with React. ");
			a22 = element("a");
			t114 = text("Check this out on how to remount a component with the ");
			code30 = element("code");
			t115 = text("key");
			t116 = text(" attribute in React");
			t117 = text(".");
			t118 = space();
			p10 = element("p");
			t119 = text("However, the ability of having to ");
			code31 = element("code");
			t120 = text("key");
			t121 = text(" an element / component only exist for the ");
			code32 = element("code");
			t122 = text("{#each}");
			t123 = text(" block. To workaround the constraint, it's common to use the ");
			strong1 = element("strong");
			t124 = text("\"1-item keyed-each hack\"");
			t125 = text(":");
			t126 = space();
			pre1 = element("pre");
			t127 = space();
			p11 = element("p");
			t128 = text("The ");
			code33 = element("code");
			t129 = text("<div />");
			t130 = text(" will be recreated if the ");
			code34 = element("code");
			t131 = text("key");
			t132 = text(" has changed.");
			t133 = space();
			section3 = element("section");
			h30 = element("h3");
			a23 = element("a");
			t134 = text("Transitions for reactive data change");
			t135 = space();
			p12 = element("p");
			t136 = text("Another commonly brought up request, to ");
			strong2 = element("strong");
			t137 = text("be able to apply ");
			code35 = element("code");
			t138 = text("transition:");
			t139 = text(" to an element when a reactive data changes");
			t140 = text(" (");
			a24 = element("a");
			t141 = text("GitHub issue #5119");
			t142 = text("):");
			t143 = space();
			pre2 = element("pre");
			t144 = space();
			p13 = element("p");
			t145 = text("This is another facet of the same issue.");
			t146 = space();
			p14 = element("p");
			t147 = text("We need an ability to transition the old element out, and transition a new element in when a data, or a ");
			code36 = element("code");
			t148 = text("key");
			t149 = text(" changes.");
			t150 = space();
			p15 = element("p");
			t151 = text("A workaround, again, is to use the ");
			strong3 = element("strong");
			t152 = text("\"1-item keyed-each hack\"");
			t153 = text(":");
			t154 = space();
			pre3 = element("pre");
			t155 = space();
			p16 = element("p");
			t156 = text("So the proposal of the feature request was to have a ");
			code37 = element("code");
			t157 = text("{#key}");
			t158 = text(" block:");
			t159 = space();
			pre4 = element("pre");
			t160 = space();
			p17 = element("p");
			t161 = text("I've seen this issue months ago, and I passed the issue. I didn't think I know good enough to implement a new logic block. However, the issue recently resurfaced as someone commented on it recently. And this time, I felt I am ready, so here's my journey of implementing the ");
			code38 = element("code");
			t162 = text("{#key}");
			t163 = text(" block.");
			t164 = space();
			section4 = element("section");
			h22 = element("h2");
			a25 = element("a");
			t165 = text("The implementation");
			t166 = space();
			p18 = element("p");
			t167 = text("As explained in ");
			a26 = element("a");
			t168 = text("\"The Svelte Compiler Handbook\"");
			t169 = text(", the Svelte compilation process can be broken into steps:");
			t170 = space();
			ul3 = element("ul");
			li12 = element("li");
			t171 = text("Parsing");
			t172 = space();
			li13 = element("li");
			t173 = text("Tracking references and dependencies");
			t174 = space();
			li14 = element("li");
			t175 = text("Creating code blocks & fragments");
			t176 = space();
			li15 = element("li");
			t177 = text("Generate code");
			t178 = space();
			p19 = element("p");
			t179 = text("Of course, that's the steps that we are going to work on as well.");
			t180 = space();
			section5 = element("section");
			h31 = element("h3");
			a27 = element("a");
			t181 = text("Parsing");
			t182 = space();
			p20 = element("p");
			t183 = text("The actual parsing starts ");
			a28 = element("a");
			t184 = text("here in src/compiler/parse/index.ts");
			t185 = text(":");
			t186 = space();
			pre5 = element("pre");
			t187 = space();
			p21 = element("p");
			t188 = text("There are 4 states in the parser:");
			t189 = space();
			ul4 = element("ul");
			li16 = element("li");
			strong4 = element("strong");
			t190 = text("fragment");
			t191 = text(" - in this state, we check the current character and determine which state we should proceed to");
			t192 = space();
			li17 = element("li");
			strong5 = element("strong");
			t193 = text("tag");
			t194 = text(" - we enter this state when we encounter ");
			code39 = element("code");
			t195 = text("<");
			t196 = text(" character. In this state, we are going to parse HTML tags (eg: ");
			code40 = element("code");
			t197 = text("<p>");
			t198 = text("), attributes (eg: ");
			code41 = element("code");
			t199 = text("class");
			t200 = text(") and directives (eg: ");
			code42 = element("code");
			t201 = text("on:");
			t202 = text(").");
			t203 = space();
			li18 = element("li");
			strong6 = element("strong");
			t204 = text("mustache");
			t205 = text(" - we enter this state when we encounter ");
			code43 = element("code");
			t206 = text("{");
			t207 = text(" character. In this state, we are going to parse expression, ");
			code44 = element("code");
			t208 = text("{ value }");
			t209 = text(" and logic blocks ");
			code45 = element("code");
			t210 = text("{#if}");
			t211 = space();
			li19 = element("li");
			strong7 = element("strong");
			t212 = text("text");
			t213 = text(" - In this state, we are going to parse texts that are neither ");
			code46 = element("code");
			t214 = text("<");
			t215 = text(" nor ");
			code47 = element("code");
			t216 = text("{");
			t217 = text(", which includes whitespace, newlines, and texts!");
			t218 = space();
			p22 = element("p");
			t219 = text("To be able to parse the ");
			code48 = element("code");
			t220 = text("{#key}");
			t221 = text(" block, we are going to take a look at the ");
			a29 = element("a");
			strong8 = element("strong");
			t222 = text("mustache");
			t223 = text(" state function");
			t224 = text(".");
			t225 = space();
			p23 = element("p");
			t226 = text("The ");
			code49 = element("code");
			t227 = text("{#key}");
			t228 = text(" block syntax is similar to ");
			code50 = element("code");
			t229 = text("{#if}");
			t230 = text(" without ");
			code51 = element("code");
			t231 = text("else");
			t232 = text(", we take in an expression in the opening block and that's all:");
			t233 = space();
			pre6 = element("pre");
			t234 = space();
			p24 = element("p");
			t235 = text("So over here, when we encounter a ");
			code52 = element("code");
			t236 = text("{#");
			t237 = text(", we add a case to check if we are starting a ");
			code53 = element("code");
			t238 = text("{#key}");
			t239 = text(" block:");
			t240 = space();
			pre7 = element("pre");
			t241 = space();
			p25 = element("p");
			t242 = text("Similarly, for closing block ");
			code54 = element("code");
			t243 = text("{/");
			t244 = text(", we are going to make sure that ");
			code55 = element("code");
			t245 = text("{#key}");
			t246 = text(" closes with ");
			code56 = element("code");
			t247 = text("{/key}");
			t248 = text(":");
			t249 = space();
			pre8 = element("pre");
			t250 = space();
			p26 = element("p");
			t251 = text("The next step is to read the JS expression. Since all logic blocks, ");
			code57 = element("code");
			t252 = text("{#if}");
			t253 = text(", ");
			code58 = element("code");
			t254 = text("{#each}");
			t255 = text(" and ");
			code59 = element("code");
			t256 = text("{#await}");
			t257 = text(" will read the JS expression next, it is no different for ");
			code60 = element("code");
			t258 = text("{#key}");
			t259 = text(" and it is already taken care of:");
			t260 = space();
			pre9 = element("pre");
			t261 = space();
			p27 = element("p");
			t262 = text("So, let's move on to the next step!");
			t263 = space();
			section6 = element("section");
			h32 = element("h3");
			a30 = element("a");
			t264 = text("Tracking references and dependencies");
			t265 = space();
			p28 = element("p");
			t266 = text("If you noticed in the previous step, the type name we created for ");
			code61 = element("code");
			t267 = text("{#key}");
			t268 = text(" block is called ");
			code62 = element("code");
			t269 = text("KeyBlock");
			t270 = text(".");
			t271 = space();
			p29 = element("p");
			t272 = text("So, to keep the name consistent, we are going to create a ");
			code63 = element("code");
			t273 = text("KeyBlock");
			t274 = text(" class in ");
			code64 = element("code");
			t275 = text("src/compiler/compile/nodes/KeyBlock.ts");
			t276 = text(":");
			t277 = space();
			pre10 = element("pre");
			t278 = space();
			p30 = element("p");
			t279 = text("I've added comments annotating the code above, hopefully it's self-explanatory.");
			t280 = space();
			p31 = element("p");
			t281 = text("A few more points:");
			t282 = space();
			ul5 = element("ul");
			li20 = element("li");
			code65 = element("code");
			t283 = text("info");
			t284 = text(" is the AST node we got from the parsing.");
			t285 = space();
			li21 = element("li");
			t286 = text("the ");
			code66 = element("code");
			t287 = text("class Expression");
			t288 = text(" is constructed with the JavaScript AST of the expression and it is where we traverse the AST and marked the variables within the expression as ");
			code67 = element("code");
			t289 = text("referenced: true");
			t290 = text(".");
			t291 = space();
			li22 = element("li");
			code68 = element("code");
			t292 = text("map_children");
			t293 = text(" is used to map the ");
			code69 = element("code");
			t294 = text("children");
			t295 = text(" of the ");
			code70 = element("code");
			t296 = text("KeyBlock");
			t297 = text(" AST node to the compile node.");
			t298 = space();
			blockquote1 = element("blockquote");
			p32 = element("p");
			t299 = text("Pardon for my lack of \"appropriate\" naming to differentiate the nodes in the Svelte codebase.");
			t300 = space();
			p33 = element("p");
			t301 = text("Throughout the Svelte compilation process, the node is transformed one to another, which in every step of the transformation, new analysis is performed, and new information are added.");
			t302 = space();
			p34 = element("p");
			t303 = text("Here, I am going to call:");
			t304 = space();
			ul6 = element("ul");
			li23 = element("li");
			t305 = text("the node resulting from the parser: ");
			strong9 = element("strong");
			t306 = text("AST node");
			t307 = space();
			li24 = element("li");
			t308 = text("the node created by the ");
			code71 = element("code");
			t309 = text("Component");
			t310 = text(", which extends from ");
			a31 = element("a");
			code72 = element("code");
			t311 = text("compiler/compile/nodes/shared/Node.ts");
			t312 = text(": ");
			strong10 = element("strong");
			t313 = text("compile node");
			t314 = space();
			em1 = element("em");
			t315 = text("(because they are stored in the ");
			code73 = element("code");
			t316 = text("compile");
			t317 = text(" folder)");
			t318 = space();
			li25 = element("li");
			t319 = text("the node created by the ");
			code74 = element("code");
			t320 = text("Renderer");
			t321 = text(", which extends from ");
			a32 = element("a");
			code75 = element("code");
			t322 = text("compiler/compile/render_dom/wrappers/shared/Wrapper.ts");
			t323 = text(": ");
			strong11 = element("strong");
			t324 = text("render-dom Wrapper");
			t325 = space();
			em2 = element("em");
			t326 = text("(also because they are stored in the ");
			code76 = element("code");
			t327 = text("render_dom/wrappers");
			t328 = text(" folder)");
			t329 = space();
			p35 = element("p");
			t330 = text("If you managed to keep up so far, you may be sensing where we are heading next.");
			t331 = space();
			p36 = element("p");
			t332 = text("We need to add ");
			code77 = element("code");
			t333 = text("KeyBlock");
			t334 = text(" into ");
			code78 = element("code");
			t335 = text("map_children");
			t336 = text(":");
			t337 = space();
			pre11 = element("pre");
			t338 = space();
			p37 = element("p");
			t339 = text("Also, we need to add ");
			code79 = element("code");
			t340 = text("KeyBlock");
			t341 = text(" as one of the ");
			code80 = element("code");
			t342 = text("INode");
			t343 = text(" type for TypeScript:");
			t344 = space();
			pre12 = element("pre");
			t345 = space();
			p38 = element("p");
			t346 = text("And now, let's move on to implementing a ");
			strong12 = element("strong");
			t347 = text("render-dom Wrapper");
			t348 = text(" for ");
			code81 = element("code");
			t349 = text("KeyBlock");
			t350 = text(".");
			t351 = space();
			section7 = element("section");
			h33 = element("h3");
			a33 = element("a");
			t352 = text("Creating code blocks & fragments");
			t353 = space();
			p39 = element("p");
			t354 = text("At this point, we need to decide how the compiled JS should look like, it's time for us to ");
			strong13 = element("strong");
			t355 = text("reverse-compile Svelte in your head");
			t356 = text("!");
			t357 = space();
			p40 = element("p");
			t358 = text("If you've read my ");
			a34 = element("a");
			t359 = text("Compile Svelte in your head (Part 4)");
			t360 = text(", you've seen how we create a different ");
			code82 = element("code");
			t361 = text("create_fragment");
			t362 = text(" function for each of the logic branches, so we can control the content within a logic branch as a whole.");
			t363 = space();
			p41 = element("p");
			t364 = text("Similarly, we can create a ");
			code83 = element("code");
			t365 = text("create_fragment");
			t366 = text(" function for the content of the ");
			code84 = element("code");
			t367 = text("{#key}");
			t368 = text(", then we can control when to create / mount / update / destroy the content.");
			t369 = space();
			pre13 = element("pre");
			t370 = space();
			p42 = element("p");
			t371 = text("To use the ");
			code85 = element("code");
			t372 = text("create_key_block");
			t373 = text(":");
			t374 = space();
			pre14 = element("pre");
			t375 = space();
			p43 = element("p");
			t376 = text("The next thing to do, is to place these statements in the right position:");
			t377 = space();
			pre15 = element("pre");
			t378 = space();
			p44 = element("p");
			t379 = text("Now, the most important piece of the ");
			code86 = element("code");
			t380 = text("{#key}");
			t381 = text(" block, the logic to");
			t382 = space();
			ul7 = element("ul");
			li26 = element("li");
			t383 = text("check if the expression has changed");
			t384 = space();
			li27 = element("li");
			t385 = text("if so, recreate the elements inside the ");
			code87 = element("code");
			t386 = text("{#key}");
			t387 = text(" block");
			t388 = space();
			pre16 = element("pre");
			t389 = space();
			p45 = element("p");
			t390 = text("If there is transition in the content of the ");
			code88 = element("code");
			t391 = text("key_block");
			t392 = text(", we need extra code for the transition:");
			t393 = space();
			pre17 = element("pre");
			t394 = space();
			p46 = element("p");
			t395 = text("I am going to gloss over the details of how ");
			code89 = element("code");
			t396 = text("outros");
			t397 = text(" / ");
			code90 = element("code");
			t398 = text("intros");
			t399 = text(" work, we will cover them in the later parts of \"Compile Svelte in your head\", so let's assume these code are up for the job.");
			t400 = space();
			p47 = element("p");
			t401 = text("Now we have done the reverse-compile Svelte in your head, let's reverse the reverse, and write the render code for Svelte ");
			code91 = element("code");
			t402 = text("{#key}");
			t403 = text(" block.");
			t404 = space();
			p48 = element("p");
			t405 = text("Here are some setup code for the render-dom Wrapper for ");
			code92 = element("code");
			t406 = text("{#key}");
			t407 = text(":");
			t408 = space();
			pre18 = element("pre");
			t409 = space();
			p49 = element("p");
			t410 = text("A few more points:");
			t411 = space();
			ul10 = element("ul");
			li30 = element("li");
			t412 = text("the ");
			code93 = element("code");
			t413 = text("block");
			t414 = text(" in the ");
			code94 = element("code");
			t415 = text("render");
			t416 = text(" method is the current ");
			code95 = element("code");
			t417 = text("create_fragment");
			t418 = text(" function that the ");
			code96 = element("code");
			t419 = text("{#key}");
			t420 = text(" block is in; ");
			code97 = element("code");
			t421 = text("this.block");
			t422 = text(" is the new ");
			code98 = element("code");
			t423 = text("create_fragment");
			t424 = text(" function that we created to put the content of the ");
			code99 = element("code");
			t425 = text("{#key}");
			t426 = text(" block");
			ul8 = element("ul");
			li28 = element("li");
			t427 = text("we named the new ");
			code100 = element("code");
			t428 = text("create_fragment");
			t429 = text(" function ");
			code101 = element("code");
			t430 = text("\"create_key_block\"");
			t431 = space();
			li29 = element("li");
			t432 = text("to make sure there's no conflicting names, we use ");
			code102 = element("code");
			t433 = text("renderer.component.get_unique_name()");
			t434 = space();
			li32 = element("li");
			t435 = text("All ");
			strong14 = element("strong");
			t436 = text("render-dom wrappers");
			t437 = text(" has a property named ");
			code103 = element("code");
			t438 = text("var");
			t439 = text(", which is the variable name referencing the element / block to be created by the ");
			strong15 = element("strong");
			t440 = text("render-dom wrapper");
			t441 = text(".");
			ul9 = element("ul");
			li31 = element("li");
			t442 = text("the ");
			code104 = element("code");
			t443 = text("var");
			t444 = text(" name will be ");
			a35 = element("a");
			t445 = text("deconflicted by the Renderer");
			t446 = space();
			p50 = element("p");
			t447 = text("Now, let's implement the ");
			code105 = element("code");
			t448 = text("render");
			t449 = text(" method.");
			t450 = space();
			p51 = element("p");
			t451 = text("Firstly, render the children into ");
			code106 = element("code");
			t452 = text("this.block");
			t453 = text(":");
			t454 = space();
			pre19 = element("pre");
			t455 = space();
			p52 = element("p");
			t456 = text("We pass in ");
			code107 = element("code");
			t457 = text("null");
			t458 = text(" as ");
			code108 = element("code");
			t459 = text("parent_node");
			t460 = text(" and ");
			code109 = element("code");
			t461 = text("x`#nodes`");
			t462 = text(" as ");
			code110 = element("code");
			t463 = text("parent_nodes");
			t464 = text(" to indicate that the children will be rendered at the root of the ");
			code111 = element("code");
			t465 = text("this.block");
			t466 = text(".");
			t467 = space();
			hr0 = element("hr");
			t468 = space();
			p53 = element("p");
			t469 = text("If I am implementing the ");
			code112 = element("code");
			t470 = text("render");
			t471 = text(" method of an Element render-dom Wrapper, and currently rendering the ");
			code113 = element("code");
			t472 = text("<div>");
			t473 = text(" in the following code snippet:");
			t474 = space();
			pre20 = element("pre");
			t475 = space();
			p54 = element("p");
			t476 = text("then I will render the ");
			code114 = element("code");
			t477 = text("<span />");
			t478 = text(" with:");
			t479 = space();
			pre21 = element("pre");
			t480 = space();
			p55 = element("p");
			t481 = text("so the ");
			code115 = element("code");
			t482 = text("<span />");
			t483 = text(" will be inserted into the current ");
			code116 = element("code");
			t484 = text("<div />");
			t485 = text(" and hydrate from the ");
			code117 = element("code");
			t486 = text("<div />");
			t487 = text("'s childNodes.");
			t488 = space();
			hr1 = element("hr");
			t489 = space();
			p56 = element("p");
			t490 = text("Next, I am going to insert code into each of the fragment methods:");
			t491 = space();
			pre22 = element("pre");
			t492 = space();
			p57 = element("p");
			t493 = text("A few more points:");
			t494 = space();
			ul12 = element("ul");
			li33 = element("li");
			t495 = text("we push the code into respective methods of the ");
			code118 = element("code");
			t496 = text("block");
			t497 = text(", eg: ");
			code119 = element("code");
			t498 = text("init");
			t499 = text(", ");
			code120 = element("code");
			t500 = text("create");
			t501 = text(", ");
			code121 = element("code");
			t502 = text("mount");
			t503 = text(", ...");
			t504 = space();
			li35 = element("li");
			t505 = text("we use ");
			a36 = element("a");
			t506 = text("tagged templates");
			t507 = text(", ");
			code122 = element("code");
			t508 = text("b`...`");
			t509 = text(" to create a JavaScript AST node. The ");
			code123 = element("code");
			t510 = text("b");
			t511 = text(" tag function allow us to pass in JavaScript AST node as placeholder, so that is very convenient.");
			ul11 = element("ul");
			li34 = element("li");
			t512 = text("You can check out more about the ");
			code124 = element("code");
			t513 = text("b");
			t514 = text(" tag function from ");
			a37 = element("a");
			t515 = text("code-red");
			t516 = space();
			p58 = element("p");
			t517 = text("Now, to implement the dirty checking, we use ");
			code125 = element("code");
			t518 = text("this.dependencies");
			t519 = space();
			pre23 = element("pre");
			t520 = space();
			p59 = element("p");
			t521 = text("To determine whether our expression value has changed, we are going to compute the expression and compare it with ");
			code126 = element("code");
			t522 = text("previous_key");
			t523 = text(" and determine whether it has changed.");
			t524 = space();
			p60 = element("p");
			t525 = text("Here's a recap of the compiled code that we've come up previously:");
			t526 = space();
			pre24 = element("pre");
			t527 = space();
			p61 = element("p");
			t528 = text("We start with declaring the variable, ");
			code127 = element("code");
			t529 = text("previous_key");
			t530 = text(":");
			t531 = space();
			pre25 = element("pre");
			t532 = space();
			p62 = element("p");
			code128 = element("code");
			t533 = text("expression.manipulate(block)");
			t534 = text(" will convert the expression to refer to the ");
			code129 = element("code");
			t535 = text("ctx");
			t536 = text(" variable, for example:");
			t537 = space();
			pre26 = element("pre");
			t538 = space();
			p63 = element("p");
			t539 = text("Next we are going to compare the new value and assign it to ");
			code130 = element("code");
			t540 = text("previous_key");
			t541 = text(" after that.");
			t542 = space();
			pre27 = element("pre");
			t543 = space();
			p64 = element("p");
			t544 = text("And to combine all of these, we have:");
			t545 = space();
			pre28 = element("pre");
			t546 = space();
			p65 = element("p");
			t547 = text("We are using the ");
			code131 = element("code");
			t548 = text("anchor");
			t549 = text(" when we are mounting the new ");
			code132 = element("code");
			t550 = text("key_block");
			t551 = text(", you can check out ");
			a38 = element("a");
			t552 = text("Compile Svelte in your head Part 4: the extra text node");
			t553 = text(", explaining why we need the anchor node, and here is how the anchor node being computed:");
			t554 = space();
			pre29 = element("pre");
			t555 = space();
			p66 = element("p");
			t556 = text("It could be the next sibling, or it could be a new ");
			code133 = element("code");
			t557 = text("empty()");
			t558 = text(" text node created.");
			t559 = space();
			p67 = element("p");
			t560 = text("Finally, if the content has transition, we need to add code for the transition as well:");
			t561 = space();
			pre30 = element("pre");
			t562 = space();
			p68 = element("p");
			t563 = text("Where to place them? Well, I'll leave that as your exercise to figure that out. 😉");
			t564 = space();
			section8 = element("section");
			h34 = element("h3");
			a39 = element("a");
			t565 = text("Creating code for SSR");
			t566 = space();
			p69 = element("p");
			t567 = text("For SSR, it is much simpler than for the ");
			code134 = element("code");
			t568 = text("dom");
			t569 = text(". ");
			code135 = element("code");
			t570 = text("{#key}");
			t571 = text(" block has no special meaning in SSR, because, you will only render once in SSR:");
			t572 = space();
			pre31 = element("pre");
			t573 = space();
			p70 = element("p");
			t574 = text("☝️ That's all the code we need for SSR. We are rendering the children, passing down the ");
			code136 = element("code");
			t575 = text("options");
			t576 = text(", and add no extra code for the ");
			code137 = element("code");
			t577 = text("{#key}");
			t578 = text(" block.");
			t579 = space();
			section9 = element("section");
			h35 = element("h3");
			a40 = element("a");
			t580 = text("Generate code");
			t581 = space();
			p71 = element("p");
			t582 = text("Well, everything in this step is set up generic enough to handle most use case.");
			t583 = space();
			p72 = element("p");
			t584 = text("So, nothing to change here. 🤷‍♂️");
			t585 = space();
			section10 = element("section");
			h36 = element("h3");
			a41 = element("a");
			t586 = text("A few other implementation consideration");
			t587 = space();
			ul13 = element("ul");
			li36 = element("li");
			t588 = text("What if the expression in the ");
			code138 = element("code");
			t589 = text("{#key}");
			t590 = text(" block is not dynamic, do we give warnings? or optimise the output?");
			t591 = space();
			li37 = element("li");
			t592 = text("How will ");
			a42 = element("a");
			code139 = element("code");
			t593 = text("<svelte:options immutable={true}>");
			t594 = text(" affect the code output?");
			t595 = space();
			section11 = element("section");
			h23 = element("h2");
			a43 = element("a");
			t596 = text("The testing");
			t597 = space();
			p73 = element("p");
			t598 = text("You've seen me implementing test cases in the previous \"Contributing to Svelte\" articles [");
			a44 = element("a");
			t599 = text("1");
			t600 = text("] [");
			a45 = element("a");
			t601 = text("2");
			t602 = text("], here I am going to skip showing the implementation of the test cases, and probably point out some thoughts I had when coming up with tests:");
			t603 = space();
			ol = element("ol");
			li38 = element("li");
			p74 = element("p");
			strong16 = element("strong");
			t604 = text("Happy path:");
			t605 = text(" changing the key expression should recreate the content");
			t606 = space();
			li39 = element("li");
			p75 = element("p");
			strong17 = element("strong");
			t607 = text("Happy path:");
			t608 = text(" Transition when recreating the content should work ✨");
			t609 = space();
			li40 = element("li");
			p76 = element("p");
			strong18 = element("strong");
			t610 = text("Possible edge case:");
			t611 = text(" Changing variables other than the key expression should ");
			strong19 = element("strong");
			t612 = text("not");
			t613 = text(" recreate the content in ");
			code140 = element("code");
			t614 = text("{#key}");
			t615 = space();
			pre32 = element("pre");
			t616 = space();
			li41 = element("li");
			p77 = element("p");
			strong20 = element("strong");
			t617 = text("Possible edge case:");
			t618 = text(" Changing the variables within the key expression but the result value of the key expression stay the same");
			t619 = space();
			pre33 = element("pre");
			t620 = space();
			section12 = element("section");
			h24 = element("h2");
			a46 = element("a");
			t621 = text("Closing Notes");
			t622 = space();
			p78 = element("p");
			t623 = text("You can read the ");
			a47 = element("a");
			t624 = text("Pull Request #5397");
			t625 = text(" to read the final implementation.");
			t626 = space();
			hr2 = element("hr");
			t627 = space();
			p79 = element("p");
			t628 = text("If you wish to learn more about Svelte, ");
			a48 = element("a");
			t629 = text("follow me on Twitter");
			t630 = text(".");
			t631 = space();
			p80 = element("p");
			t632 = text("If you have anything unclear about this article, find me on ");
			a49 = element("a");
			t633 = text("Twitter");
			t634 = text(" too!");
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
			t0 = claim_text(a0_nodes, "Background");
			a0_nodes.forEach(detach);
			li0_nodes.forEach(detach);
			li1 = claim_element(ul2_nodes, "LI", {});
			var li1_nodes = children(li1);
			a1 = claim_element(li1_nodes, "A", { href: true });
			var a1_nodes = children(a1);
			t1 = claim_text(a1_nodes, "The motivation");
			a1_nodes.forEach(detach);
			li1_nodes.forEach(detach);
			ul0 = claim_element(ul2_nodes, "UL", {});
			var ul0_nodes = children(ul0);
			li2 = claim_element(ul0_nodes, "LI", {});
			var li2_nodes = children(li2);
			a2 = claim_element(li2_nodes, "A", { href: true });
			var a2_nodes = children(a2);
			t2 = claim_text(a2_nodes, "Transitions for reactive data change");
			a2_nodes.forEach(detach);
			li2_nodes.forEach(detach);
			ul0_nodes.forEach(detach);
			li3 = claim_element(ul2_nodes, "LI", {});
			var li3_nodes = children(li3);
			a3 = claim_element(li3_nodes, "A", { href: true });
			var a3_nodes = children(a3);
			t3 = claim_text(a3_nodes, "The implementation");
			a3_nodes.forEach(detach);
			li3_nodes.forEach(detach);
			ul1 = claim_element(ul2_nodes, "UL", {});
			var ul1_nodes = children(ul1);
			li4 = claim_element(ul1_nodes, "LI", {});
			var li4_nodes = children(li4);
			a4 = claim_element(li4_nodes, "A", { href: true });
			var a4_nodes = children(a4);
			t4 = claim_text(a4_nodes, "Parsing");
			a4_nodes.forEach(detach);
			li4_nodes.forEach(detach);
			li5 = claim_element(ul1_nodes, "LI", {});
			var li5_nodes = children(li5);
			a5 = claim_element(li5_nodes, "A", { href: true });
			var a5_nodes = children(a5);
			t5 = claim_text(a5_nodes, "Tracking references and dependencies");
			a5_nodes.forEach(detach);
			li5_nodes.forEach(detach);
			li6 = claim_element(ul1_nodes, "LI", {});
			var li6_nodes = children(li6);
			a6 = claim_element(li6_nodes, "A", { href: true });
			var a6_nodes = children(a6);
			t6 = claim_text(a6_nodes, "Creating code blocks & fragments");
			a6_nodes.forEach(detach);
			li6_nodes.forEach(detach);
			li7 = claim_element(ul1_nodes, "LI", {});
			var li7_nodes = children(li7);
			a7 = claim_element(li7_nodes, "A", { href: true });
			var a7_nodes = children(a7);
			t7 = claim_text(a7_nodes, "Creating code for SSR");
			a7_nodes.forEach(detach);
			li7_nodes.forEach(detach);
			li8 = claim_element(ul1_nodes, "LI", {});
			var li8_nodes = children(li8);
			a8 = claim_element(li8_nodes, "A", { href: true });
			var a8_nodes = children(a8);
			t8 = claim_text(a8_nodes, "Generate code");
			a8_nodes.forEach(detach);
			li8_nodes.forEach(detach);
			li9 = claim_element(ul1_nodes, "LI", {});
			var li9_nodes = children(li9);
			a9 = claim_element(li9_nodes, "A", { href: true });
			var a9_nodes = children(a9);
			t9 = claim_text(a9_nodes, "A few other implementation consideration");
			a9_nodes.forEach(detach);
			li9_nodes.forEach(detach);
			ul1_nodes.forEach(detach);
			li10 = claim_element(ul2_nodes, "LI", {});
			var li10_nodes = children(li10);
			a10 = claim_element(li10_nodes, "A", { href: true });
			var a10_nodes = children(a10);
			t10 = claim_text(a10_nodes, "The testing");
			a10_nodes.forEach(detach);
			li10_nodes.forEach(detach);
			li11 = claim_element(ul2_nodes, "LI", {});
			var li11_nodes = children(li11);
			a11 = claim_element(li11_nodes, "A", { href: true });
			var a11_nodes = children(a11);
			t11 = claim_text(a11_nodes, "Closing Notes");
			a11_nodes.forEach(detach);
			li11_nodes.forEach(detach);
			ul2_nodes.forEach(detach);
			section0_nodes.forEach(detach);
			t12 = claim_space(nodes);
			section1 = claim_element(nodes, "SECTION", {});
			var section1_nodes = children(section1);
			h20 = claim_element(section1_nodes, "H2", {});
			var h20_nodes = children(h20);
			a12 = claim_element(h20_nodes, "A", { href: true, id: true });
			var a12_nodes = children(a12);
			t13 = claim_text(a12_nodes, "Background");
			a12_nodes.forEach(detach);
			h20_nodes.forEach(detach);
			t14 = claim_space(section1_nodes);
			p0 = claim_element(section1_nodes, "P", {});
			var p0_nodes = children(p0);
			t15 = claim_text(p0_nodes, "Unlike the other contributing to Svelte posts [");
			a13 = claim_element(p0_nodes, "A", { href: true });
			var a13_nodes = children(a13);
			t16 = claim_text(a13_nodes, "1");
			a13_nodes.forEach(detach);
			t17 = claim_text(p0_nodes, "] [");
			a14 = claim_element(p0_nodes, "A", { href: true });
			var a14_nodes = children(a14);
			t18 = claim_text(a14_nodes, "2");
			a14_nodes.forEach(detach);
			t19 = claim_text(p0_nodes, "], which I wrote it while implementing the fix, describing as detailed as possible, today I am going to share the process of how I implemented the ");
			code0 = claim_element(p0_nodes, "CODE", {});
			var code0_nodes = children(code0);
			t20 = claim_text(code0_nodes, "{#key}");
			code0_nodes.forEach(detach);
			t21 = claim_text(p0_nodes, " block retrospectively.");
			p0_nodes.forEach(detach);
			t22 = claim_space(section1_nodes);
			p1 = claim_element(section1_nodes, "P", {});
			var p1_nodes = children(p1);
			t23 = claim_text(p1_nodes, "The implementation of the ");
			code1 = claim_element(p1_nodes, "CODE", {});
			var code1_nodes = children(code1);
			t24 = claim_text(code1_nodes, "{#key}");
			code1_nodes.forEach(detach);
			t25 = claim_text(p1_nodes, " block is much simpler, relative to ");
			code2 = claim_element(p1_nodes, "CODE", {});
			var code2_nodes = children(code2);
			t26 = claim_text(code2_nodes, "{#if}");
			code2_nodes.forEach(detach);
			t27 = claim_text(p1_nodes, ", ");
			code3 = claim_element(p1_nodes, "CODE", {});
			var code3_nodes = children(code3);
			t28 = claim_text(code3_nodes, "{#await}");
			code3_nodes.forEach(detach);
			t29 = claim_text(p1_nodes, " or ");
			code4 = claim_element(p1_nodes, "CODE", {});
			var code4_nodes = children(code4);
			t30 = claim_text(code4_nodes, "{#each}");
			code4_nodes.forEach(detach);
			t31 = claim_text(p1_nodes, ". And I believe the process of implementing the ");
			code5 = claim_element(p1_nodes, "CODE", {});
			var code5_nodes = children(code5);
			t32 = claim_text(code5_nodes, "{#key}");
			code5_nodes.forEach(detach);
			t33 = claim_text(p1_nodes, " block helps paint the pratical side of ");
			a15 = claim_element(p1_nodes, "A", { href: true });
			var a15_nodes = children(a15);
			t34 = claim_text(a15_nodes, "\"The Svelte Compiler Handbook\"");
			a15_nodes.forEach(detach);
			t35 = claim_text(p1_nodes, " or my ");
			a16 = claim_element(p1_nodes, "A", { href: true });
			var a16_nodes = children(a16);
			t36 = claim_text(a16_nodes, "\"Looking into the Svelte compiler\" talk");
			a16_nodes.forEach(detach);
			t37 = claim_text(p1_nodes, ".");
			p1_nodes.forEach(detach);
			section1_nodes.forEach(detach);
			t38 = claim_space(nodes);
			section2 = claim_element(nodes, "SECTION", {});
			var section2_nodes = children(section2);
			h21 = claim_element(section2_nodes, "H2", {});
			var h21_nodes = children(h21);
			a17 = claim_element(h21_nodes, "A", { href: true, id: true });
			var a17_nodes = children(a17);
			t39 = claim_text(a17_nodes, "The motivation");
			a17_nodes.forEach(detach);
			h21_nodes.forEach(detach);
			t40 = claim_space(section2_nodes);
			p2 = claim_element(section2_nodes, "P", {});
			var p2_nodes = children(p2);
			t41 = claim_text(p2_nodes, "The idea of ");
			code6 = claim_element(p2_nodes, "CODE", {});
			var code6_nodes = children(code6);
			t42 = claim_text(code6_nodes, "{#key}");
			code6_nodes.forEach(detach);
			t43 = claim_text(p2_nodes, " block starts with the feature request 2 years ago ");
			em0 = claim_element(p2_nodes, "EM", {});
			var em0_nodes = children(em0);
			t44 = claim_text(em0_nodes, "(yea, it's that long)");
			em0_nodes.forEach(detach);
			t45 = claim_text(p2_nodes, " for ");
			strong0 = claim_element(p2_nodes, "STRONG", {});
			var strong0_nodes = children(strong0);
			t46 = claim_text(strong0_nodes, "the ability to key a non-each component");
			strong0_nodes.forEach(detach);
			t47 = claim_text(p2_nodes, ", ");
			a18 = claim_element(p2_nodes, "A", { href: true, rel: true });
			var a18_nodes = children(a18);
			t48 = claim_text(a18_nodes, "GitHub issue #1469");
			a18_nodes.forEach(detach);
			t49 = claim_text(p2_nodes, ".");
			p2_nodes.forEach(detach);
			t50 = claim_space(section2_nodes);
			p3 = claim_element(section2_nodes, "P", {});
			var p3_nodes = children(p3);
			t51 = claim_text(p3_nodes, "To ");
			code7 = claim_element(p3_nodes, "CODE", {});
			var code7_nodes = children(code7);
			t52 = claim_text(code7_nodes, "key");
			code7_nodes.forEach(detach);
			t53 = claim_text(p3_nodes, " a component, is to force recreation of the component when the ");
			code8 = claim_element(p3_nodes, "CODE", {});
			var code8_nodes = children(code8);
			t54 = claim_text(code8_nodes, "key");
			code8_nodes.forEach(detach);
			t55 = claim_text(p3_nodes, " changes.");
			p3_nodes.forEach(detach);
			t56 = claim_space(section2_nodes);
			p4 = claim_element(section2_nodes, "P", {});
			var p4_nodes = children(p4);
			t57 = claim_text(p4_nodes, "And you see this ability of destroying and creating new components when using ");
			code9 = claim_element(p4_nodes, "CODE", {});
			var code9_nodes = children(code9);
			t58 = claim_text(code9_nodes, "{#each}");
			code9_nodes.forEach(detach);
			t59 = claim_text(p4_nodes, " with ");
			code10 = claim_element(p4_nodes, "CODE", {});
			var code10_nodes = children(code10);
			t60 = claim_text(code10_nodes, "key");
			code10_nodes.forEach(detach);
			t61 = claim_text(p4_nodes, ":");
			p4_nodes.forEach(detach);
			t62 = claim_space(section2_nodes);
			pre0 = claim_element(section2_nodes, "PRE", { class: true });
			var pre0_nodes = children(pre0);
			pre0_nodes.forEach(detach);
			t63 = claim_space(section2_nodes);
			p5 = claim_element(section2_nodes, "P", {});
			var p5_nodes = children(p5);
			a19 = claim_element(p5_nodes, "A", { href: true, rel: true });
			var a19_nodes = children(a19);
			t64 = claim_text(a19_nodes, "REPL");
			a19_nodes.forEach(detach);
			p5_nodes.forEach(detach);
			t65 = claim_space(section2_nodes);
			p6 = claim_element(section2_nodes, "P", {});
			var p6_nodes = children(p6);
			t66 = claim_text(p6_nodes, "When we call the function ");
			code11 = claim_element(p6_nodes, "CODE", {});
			var code11_nodes = children(code11);
			t67 = claim_text(code11_nodes, "update");
			code11_nodes.forEach(detach);
			t68 = claim_text(p6_nodes, ", we removed ");
			code12 = claim_element(p6_nodes, "CODE", {});
			var code12_nodes = children(code12);
			t69 = claim_text(code12_nodes, "alice");
			code12_nodes.forEach(detach);
			t70 = claim_text(p6_nodes, " from the ");
			code13 = claim_element(p6_nodes, "CODE", {});
			var code13_nodes = children(code13);
			t71 = claim_text(code13_nodes, "data");
			code13_nodes.forEach(detach);
			t72 = claim_text(p6_nodes, " and we added ");
			code14 = claim_element(p6_nodes, "CODE", {});
			var code14_nodes = children(code14);
			t73 = claim_text(code14_nodes, "bob");
			code14_nodes.forEach(detach);
			t74 = claim_text(p6_nodes, ". The net effect is still having a list of 1 item. However, instead of reusing the 1 ");
			code15 = claim_element(p6_nodes, "CODE", {});
			var code15_nodes = children(code15);
			t75 = claim_text(code15_nodes, "<div />");
			code15_nodes.forEach(detach);
			t76 = claim_text(p6_nodes, " by updating ");
			code16 = claim_element(p6_nodes, "CODE", {});
			var code16_nodes = children(code16);
			t77 = claim_text(code16_nodes, "{ item.name }");
			code16_nodes.forEach(detach);
			t78 = claim_text(p6_nodes, " to ");
			code17 = claim_element(p6_nodes, "CODE", {});
			var code17_nodes = children(code17);
			t79 = claim_text(code17_nodes, "\"bob\"");
			code17_nodes.forEach(detach);
			t80 = claim_text(p6_nodes, ", Svelte removes and destroys the ");
			code18 = claim_element(p6_nodes, "CODE", {});
			var code18_nodes = children(code18);
			t81 = claim_text(code18_nodes, "<div />");
			code18_nodes.forEach(detach);
			t82 = claim_text(p6_nodes, " and create a new ");
			code19 = claim_element(p6_nodes, "CODE", {});
			var code19_nodes = children(code19);
			t83 = claim_text(code19_nodes, "<div />");
			code19_nodes.forEach(detach);
			t84 = claim_text(p6_nodes, " for ");
			code20 = claim_element(p6_nodes, "CODE", {});
			var code20_nodes = children(code20);
			t85 = claim_text(code20_nodes, "bob");
			code20_nodes.forEach(detach);
			t86 = claim_text(p6_nodes, ". This is because of the ");
			a20 = claim_element(p6_nodes, "A", { href: true, rel: true });
			var a20_nodes = children(a20);
			t87 = claim_text(a20_nodes, "key we specified to the ");
			code21 = claim_element(a20_nodes, "CODE", {});
			var code21_nodes = children(code21);
			t88 = claim_text(code21_nodes, "{#each}");
			code21_nodes.forEach(detach);
			t89 = claim_text(a20_nodes, " block");
			a20_nodes.forEach(detach);
			t90 = claim_text(p6_nodes, ". Svelte will not reuse the ");
			code22 = claim_element(p6_nodes, "CODE", {});
			var code22_nodes = children(code22);
			t91 = claim_text(code22_nodes, "<div />");
			code22_nodes.forEach(detach);
			t92 = claim_text(p6_nodes, " because it was created with a different ");
			code23 = claim_element(p6_nodes, "CODE", {});
			var code23_nodes = children(code23);
			t93 = claim_text(code23_nodes, "key");
			code23_nodes.forEach(detach);
			t94 = claim_text(p6_nodes, ".");
			p6_nodes.forEach(detach);
			t95 = claim_space(section2_nodes);
			p7 = claim_element(section2_nodes, "P", {});
			var p7_nodes = children(p7);
			t96 = claim_text(p7_nodes, "One of the benefits of having a key for ");
			code24 = claim_element(p7_nodes, "CODE", {});
			var code24_nodes = children(code24);
			t97 = claim_text(code24_nodes, "{#each}");
			code24_nodes.forEach(detach);
			t98 = claim_text(p7_nodes, " item is to be able to add transition to the item correctly. Without a ");
			code25 = claim_element(p7_nodes, "CODE", {});
			var code25_nodes = children(code25);
			t99 = claim_text(code25_nodes, "key");
			code25_nodes.forEach(detach);
			t100 = claim_text(p7_nodes, " to identify which item is added / removed, the transiion on a ");
			code26 = claim_element(p7_nodes, "CODE", {});
			var code26_nodes = children(code26);
			t101 = claim_text(code26_nodes, "{#each}");
			code26_nodes.forEach(detach);
			t102 = claim_text(p7_nodes, " list will always applied to the last item, when the list grows or shrinks in length.");
			p7_nodes.forEach(detach);
			t103 = claim_space(section2_nodes);
			p8 = claim_element(section2_nodes, "P", {});
			var p8_nodes = children(p8);
			a21 = claim_element(p8_nodes, "A", { href: true, rel: true });
			var a21_nodes = children(a21);
			t104 = claim_text(a21_nodes, "Try with and without the ");
			code27 = claim_element(a21_nodes, "CODE", {});
			var code27_nodes = children(code27);
			t105 = claim_text(code27_nodes, "key");
			code27_nodes.forEach(detach);
			t106 = claim_text(a21_nodes, " in this REPL");
			a21_nodes.forEach(detach);
			t107 = claim_text(p8_nodes, " to see the importance of having a ");
			code28 = claim_element(p8_nodes, "CODE", {});
			var code28_nodes = children(code28);
			t108 = claim_text(code28_nodes, "key");
			code28_nodes.forEach(detach);
			t109 = claim_text(p8_nodes, ".");
			p8_nodes.forEach(detach);
			t110 = claim_space(section2_nodes);
			blockquote0 = claim_element(section2_nodes, "BLOCKQUOTE", {});
			var blockquote0_nodes = children(blockquote0);
			p9 = claim_element(blockquote0_nodes, "P", {});
			var p9_nodes = children(p9);
			t111 = claim_text(p9_nodes, "This is similar to the ");
			code29 = claim_element(p9_nodes, "CODE", {});
			var code29_nodes = children(code29);
			t112 = claim_text(code29_nodes, "key");
			code29_nodes.forEach(detach);
			t113 = claim_text(p9_nodes, " attribute of React, if you are familiar with React. ");
			a22 = claim_element(p9_nodes, "A", { href: true, rel: true });
			var a22_nodes = children(a22);
			t114 = claim_text(a22_nodes, "Check this out on how to remount a component with the ");
			code30 = claim_element(a22_nodes, "CODE", {});
			var code30_nodes = children(code30);
			t115 = claim_text(code30_nodes, "key");
			code30_nodes.forEach(detach);
			t116 = claim_text(a22_nodes, " attribute in React");
			a22_nodes.forEach(detach);
			t117 = claim_text(p9_nodes, ".");
			p9_nodes.forEach(detach);
			blockquote0_nodes.forEach(detach);
			t118 = claim_space(section2_nodes);
			p10 = claim_element(section2_nodes, "P", {});
			var p10_nodes = children(p10);
			t119 = claim_text(p10_nodes, "However, the ability of having to ");
			code31 = claim_element(p10_nodes, "CODE", {});
			var code31_nodes = children(code31);
			t120 = claim_text(code31_nodes, "key");
			code31_nodes.forEach(detach);
			t121 = claim_text(p10_nodes, " an element / component only exist for the ");
			code32 = claim_element(p10_nodes, "CODE", {});
			var code32_nodes = children(code32);
			t122 = claim_text(code32_nodes, "{#each}");
			code32_nodes.forEach(detach);
			t123 = claim_text(p10_nodes, " block. To workaround the constraint, it's common to use the ");
			strong1 = claim_element(p10_nodes, "STRONG", {});
			var strong1_nodes = children(strong1);
			t124 = claim_text(strong1_nodes, "\"1-item keyed-each hack\"");
			strong1_nodes.forEach(detach);
			t125 = claim_text(p10_nodes, ":");
			p10_nodes.forEach(detach);
			t126 = claim_space(section2_nodes);
			pre1 = claim_element(section2_nodes, "PRE", { class: true });
			var pre1_nodes = children(pre1);
			pre1_nodes.forEach(detach);
			t127 = claim_space(section2_nodes);
			p11 = claim_element(section2_nodes, "P", {});
			var p11_nodes = children(p11);
			t128 = claim_text(p11_nodes, "The ");
			code33 = claim_element(p11_nodes, "CODE", {});
			var code33_nodes = children(code33);
			t129 = claim_text(code33_nodes, "<div />");
			code33_nodes.forEach(detach);
			t130 = claim_text(p11_nodes, " will be recreated if the ");
			code34 = claim_element(p11_nodes, "CODE", {});
			var code34_nodes = children(code34);
			t131 = claim_text(code34_nodes, "key");
			code34_nodes.forEach(detach);
			t132 = claim_text(p11_nodes, " has changed.");
			p11_nodes.forEach(detach);
			section2_nodes.forEach(detach);
			t133 = claim_space(nodes);
			section3 = claim_element(nodes, "SECTION", {});
			var section3_nodes = children(section3);
			h30 = claim_element(section3_nodes, "H3", {});
			var h30_nodes = children(h30);
			a23 = claim_element(h30_nodes, "A", { href: true, id: true });
			var a23_nodes = children(a23);
			t134 = claim_text(a23_nodes, "Transitions for reactive data change");
			a23_nodes.forEach(detach);
			h30_nodes.forEach(detach);
			t135 = claim_space(section3_nodes);
			p12 = claim_element(section3_nodes, "P", {});
			var p12_nodes = children(p12);
			t136 = claim_text(p12_nodes, "Another commonly brought up request, to ");
			strong2 = claim_element(p12_nodes, "STRONG", {});
			var strong2_nodes = children(strong2);
			t137 = claim_text(strong2_nodes, "be able to apply ");
			code35 = claim_element(strong2_nodes, "CODE", {});
			var code35_nodes = children(code35);
			t138 = claim_text(code35_nodes, "transition:");
			code35_nodes.forEach(detach);
			t139 = claim_text(strong2_nodes, " to an element when a reactive data changes");
			strong2_nodes.forEach(detach);
			t140 = claim_text(p12_nodes, " (");
			a24 = claim_element(p12_nodes, "A", { href: true, rel: true });
			var a24_nodes = children(a24);
			t141 = claim_text(a24_nodes, "GitHub issue #5119");
			a24_nodes.forEach(detach);
			t142 = claim_text(p12_nodes, "):");
			p12_nodes.forEach(detach);
			t143 = claim_space(section3_nodes);
			pre2 = claim_element(section3_nodes, "PRE", { class: true });
			var pre2_nodes = children(pre2);
			pre2_nodes.forEach(detach);
			t144 = claim_space(section3_nodes);
			p13 = claim_element(section3_nodes, "P", {});
			var p13_nodes = children(p13);
			t145 = claim_text(p13_nodes, "This is another facet of the same issue.");
			p13_nodes.forEach(detach);
			t146 = claim_space(section3_nodes);
			p14 = claim_element(section3_nodes, "P", {});
			var p14_nodes = children(p14);
			t147 = claim_text(p14_nodes, "We need an ability to transition the old element out, and transition a new element in when a data, or a ");
			code36 = claim_element(p14_nodes, "CODE", {});
			var code36_nodes = children(code36);
			t148 = claim_text(code36_nodes, "key");
			code36_nodes.forEach(detach);
			t149 = claim_text(p14_nodes, " changes.");
			p14_nodes.forEach(detach);
			t150 = claim_space(section3_nodes);
			p15 = claim_element(section3_nodes, "P", {});
			var p15_nodes = children(p15);
			t151 = claim_text(p15_nodes, "A workaround, again, is to use the ");
			strong3 = claim_element(p15_nodes, "STRONG", {});
			var strong3_nodes = children(strong3);
			t152 = claim_text(strong3_nodes, "\"1-item keyed-each hack\"");
			strong3_nodes.forEach(detach);
			t153 = claim_text(p15_nodes, ":");
			p15_nodes.forEach(detach);
			t154 = claim_space(section3_nodes);
			pre3 = claim_element(section3_nodes, "PRE", { class: true });
			var pre3_nodes = children(pre3);
			pre3_nodes.forEach(detach);
			t155 = claim_space(section3_nodes);
			p16 = claim_element(section3_nodes, "P", {});
			var p16_nodes = children(p16);
			t156 = claim_text(p16_nodes, "So the proposal of the feature request was to have a ");
			code37 = claim_element(p16_nodes, "CODE", {});
			var code37_nodes = children(code37);
			t157 = claim_text(code37_nodes, "{#key}");
			code37_nodes.forEach(detach);
			t158 = claim_text(p16_nodes, " block:");
			p16_nodes.forEach(detach);
			t159 = claim_space(section3_nodes);
			pre4 = claim_element(section3_nodes, "PRE", { class: true });
			var pre4_nodes = children(pre4);
			pre4_nodes.forEach(detach);
			t160 = claim_space(section3_nodes);
			p17 = claim_element(section3_nodes, "P", {});
			var p17_nodes = children(p17);
			t161 = claim_text(p17_nodes, "I've seen this issue months ago, and I passed the issue. I didn't think I know good enough to implement a new logic block. However, the issue recently resurfaced as someone commented on it recently. And this time, I felt I am ready, so here's my journey of implementing the ");
			code38 = claim_element(p17_nodes, "CODE", {});
			var code38_nodes = children(code38);
			t162 = claim_text(code38_nodes, "{#key}");
			code38_nodes.forEach(detach);
			t163 = claim_text(p17_nodes, " block.");
			p17_nodes.forEach(detach);
			section3_nodes.forEach(detach);
			t164 = claim_space(nodes);
			section4 = claim_element(nodes, "SECTION", {});
			var section4_nodes = children(section4);
			h22 = claim_element(section4_nodes, "H2", {});
			var h22_nodes = children(h22);
			a25 = claim_element(h22_nodes, "A", { href: true, id: true });
			var a25_nodes = children(a25);
			t165 = claim_text(a25_nodes, "The implementation");
			a25_nodes.forEach(detach);
			h22_nodes.forEach(detach);
			t166 = claim_space(section4_nodes);
			p18 = claim_element(section4_nodes, "P", {});
			var p18_nodes = children(p18);
			t167 = claim_text(p18_nodes, "As explained in ");
			a26 = claim_element(p18_nodes, "A", { href: true });
			var a26_nodes = children(a26);
			t168 = claim_text(a26_nodes, "\"The Svelte Compiler Handbook\"");
			a26_nodes.forEach(detach);
			t169 = claim_text(p18_nodes, ", the Svelte compilation process can be broken into steps:");
			p18_nodes.forEach(detach);
			t170 = claim_space(section4_nodes);
			ul3 = claim_element(section4_nodes, "UL", {});
			var ul3_nodes = children(ul3);
			li12 = claim_element(ul3_nodes, "LI", {});
			var li12_nodes = children(li12);
			t171 = claim_text(li12_nodes, "Parsing");
			li12_nodes.forEach(detach);
			t172 = claim_space(ul3_nodes);
			li13 = claim_element(ul3_nodes, "LI", {});
			var li13_nodes = children(li13);
			t173 = claim_text(li13_nodes, "Tracking references and dependencies");
			li13_nodes.forEach(detach);
			t174 = claim_space(ul3_nodes);
			li14 = claim_element(ul3_nodes, "LI", {});
			var li14_nodes = children(li14);
			t175 = claim_text(li14_nodes, "Creating code blocks & fragments");
			li14_nodes.forEach(detach);
			t176 = claim_space(ul3_nodes);
			li15 = claim_element(ul3_nodes, "LI", {});
			var li15_nodes = children(li15);
			t177 = claim_text(li15_nodes, "Generate code");
			li15_nodes.forEach(detach);
			ul3_nodes.forEach(detach);
			t178 = claim_space(section4_nodes);
			p19 = claim_element(section4_nodes, "P", {});
			var p19_nodes = children(p19);
			t179 = claim_text(p19_nodes, "Of course, that's the steps that we are going to work on as well.");
			p19_nodes.forEach(detach);
			section4_nodes.forEach(detach);
			t180 = claim_space(nodes);
			section5 = claim_element(nodes, "SECTION", {});
			var section5_nodes = children(section5);
			h31 = claim_element(section5_nodes, "H3", {});
			var h31_nodes = children(h31);
			a27 = claim_element(h31_nodes, "A", { href: true, id: true });
			var a27_nodes = children(a27);
			t181 = claim_text(a27_nodes, "Parsing");
			a27_nodes.forEach(detach);
			h31_nodes.forEach(detach);
			t182 = claim_space(section5_nodes);
			p20 = claim_element(section5_nodes, "P", {});
			var p20_nodes = children(p20);
			t183 = claim_text(p20_nodes, "The actual parsing starts ");
			a28 = claim_element(p20_nodes, "A", { href: true, rel: true });
			var a28_nodes = children(a28);
			t184 = claim_text(a28_nodes, "here in src/compiler/parse/index.ts");
			a28_nodes.forEach(detach);
			t185 = claim_text(p20_nodes, ":");
			p20_nodes.forEach(detach);
			t186 = claim_space(section5_nodes);
			pre5 = claim_element(section5_nodes, "PRE", { class: true });
			var pre5_nodes = children(pre5);
			pre5_nodes.forEach(detach);
			t187 = claim_space(section5_nodes);
			p21 = claim_element(section5_nodes, "P", {});
			var p21_nodes = children(p21);
			t188 = claim_text(p21_nodes, "There are 4 states in the parser:");
			p21_nodes.forEach(detach);
			t189 = claim_space(section5_nodes);
			ul4 = claim_element(section5_nodes, "UL", {});
			var ul4_nodes = children(ul4);
			li16 = claim_element(ul4_nodes, "LI", {});
			var li16_nodes = children(li16);
			strong4 = claim_element(li16_nodes, "STRONG", {});
			var strong4_nodes = children(strong4);
			t190 = claim_text(strong4_nodes, "fragment");
			strong4_nodes.forEach(detach);
			t191 = claim_text(li16_nodes, " - in this state, we check the current character and determine which state we should proceed to");
			li16_nodes.forEach(detach);
			t192 = claim_space(ul4_nodes);
			li17 = claim_element(ul4_nodes, "LI", {});
			var li17_nodes = children(li17);
			strong5 = claim_element(li17_nodes, "STRONG", {});
			var strong5_nodes = children(strong5);
			t193 = claim_text(strong5_nodes, "tag");
			strong5_nodes.forEach(detach);
			t194 = claim_text(li17_nodes, " - we enter this state when we encounter ");
			code39 = claim_element(li17_nodes, "CODE", {});
			var code39_nodes = children(code39);
			t195 = claim_text(code39_nodes, "<");
			code39_nodes.forEach(detach);
			t196 = claim_text(li17_nodes, " character. In this state, we are going to parse HTML tags (eg: ");
			code40 = claim_element(li17_nodes, "CODE", {});
			var code40_nodes = children(code40);
			t197 = claim_text(code40_nodes, "<p>");
			code40_nodes.forEach(detach);
			t198 = claim_text(li17_nodes, "), attributes (eg: ");
			code41 = claim_element(li17_nodes, "CODE", {});
			var code41_nodes = children(code41);
			t199 = claim_text(code41_nodes, "class");
			code41_nodes.forEach(detach);
			t200 = claim_text(li17_nodes, ") and directives (eg: ");
			code42 = claim_element(li17_nodes, "CODE", {});
			var code42_nodes = children(code42);
			t201 = claim_text(code42_nodes, "on:");
			code42_nodes.forEach(detach);
			t202 = claim_text(li17_nodes, ").");
			li17_nodes.forEach(detach);
			t203 = claim_space(ul4_nodes);
			li18 = claim_element(ul4_nodes, "LI", {});
			var li18_nodes = children(li18);
			strong6 = claim_element(li18_nodes, "STRONG", {});
			var strong6_nodes = children(strong6);
			t204 = claim_text(strong6_nodes, "mustache");
			strong6_nodes.forEach(detach);
			t205 = claim_text(li18_nodes, " - we enter this state when we encounter ");
			code43 = claim_element(li18_nodes, "CODE", {});
			var code43_nodes = children(code43);
			t206 = claim_text(code43_nodes, "{");
			code43_nodes.forEach(detach);
			t207 = claim_text(li18_nodes, " character. In this state, we are going to parse expression, ");
			code44 = claim_element(li18_nodes, "CODE", {});
			var code44_nodes = children(code44);
			t208 = claim_text(code44_nodes, "{ value }");
			code44_nodes.forEach(detach);
			t209 = claim_text(li18_nodes, " and logic blocks ");
			code45 = claim_element(li18_nodes, "CODE", {});
			var code45_nodes = children(code45);
			t210 = claim_text(code45_nodes, "{#if}");
			code45_nodes.forEach(detach);
			li18_nodes.forEach(detach);
			t211 = claim_space(ul4_nodes);
			li19 = claim_element(ul4_nodes, "LI", {});
			var li19_nodes = children(li19);
			strong7 = claim_element(li19_nodes, "STRONG", {});
			var strong7_nodes = children(strong7);
			t212 = claim_text(strong7_nodes, "text");
			strong7_nodes.forEach(detach);
			t213 = claim_text(li19_nodes, " - In this state, we are going to parse texts that are neither ");
			code46 = claim_element(li19_nodes, "CODE", {});
			var code46_nodes = children(code46);
			t214 = claim_text(code46_nodes, "<");
			code46_nodes.forEach(detach);
			t215 = claim_text(li19_nodes, " nor ");
			code47 = claim_element(li19_nodes, "CODE", {});
			var code47_nodes = children(code47);
			t216 = claim_text(code47_nodes, "{");
			code47_nodes.forEach(detach);
			t217 = claim_text(li19_nodes, ", which includes whitespace, newlines, and texts!");
			li19_nodes.forEach(detach);
			ul4_nodes.forEach(detach);
			t218 = claim_space(section5_nodes);
			p22 = claim_element(section5_nodes, "P", {});
			var p22_nodes = children(p22);
			t219 = claim_text(p22_nodes, "To be able to parse the ");
			code48 = claim_element(p22_nodes, "CODE", {});
			var code48_nodes = children(code48);
			t220 = claim_text(code48_nodes, "{#key}");
			code48_nodes.forEach(detach);
			t221 = claim_text(p22_nodes, " block, we are going to take a look at the ");
			a29 = claim_element(p22_nodes, "A", { href: true, rel: true });
			var a29_nodes = children(a29);
			strong8 = claim_element(a29_nodes, "STRONG", {});
			var strong8_nodes = children(strong8);
			t222 = claim_text(strong8_nodes, "mustache");
			strong8_nodes.forEach(detach);
			t223 = claim_text(a29_nodes, " state function");
			a29_nodes.forEach(detach);
			t224 = claim_text(p22_nodes, ".");
			p22_nodes.forEach(detach);
			t225 = claim_space(section5_nodes);
			p23 = claim_element(section5_nodes, "P", {});
			var p23_nodes = children(p23);
			t226 = claim_text(p23_nodes, "The ");
			code49 = claim_element(p23_nodes, "CODE", {});
			var code49_nodes = children(code49);
			t227 = claim_text(code49_nodes, "{#key}");
			code49_nodes.forEach(detach);
			t228 = claim_text(p23_nodes, " block syntax is similar to ");
			code50 = claim_element(p23_nodes, "CODE", {});
			var code50_nodes = children(code50);
			t229 = claim_text(code50_nodes, "{#if}");
			code50_nodes.forEach(detach);
			t230 = claim_text(p23_nodes, " without ");
			code51 = claim_element(p23_nodes, "CODE", {});
			var code51_nodes = children(code51);
			t231 = claim_text(code51_nodes, "else");
			code51_nodes.forEach(detach);
			t232 = claim_text(p23_nodes, ", we take in an expression in the opening block and that's all:");
			p23_nodes.forEach(detach);
			t233 = claim_space(section5_nodes);
			pre6 = claim_element(section5_nodes, "PRE", { class: true });
			var pre6_nodes = children(pre6);
			pre6_nodes.forEach(detach);
			t234 = claim_space(section5_nodes);
			p24 = claim_element(section5_nodes, "P", {});
			var p24_nodes = children(p24);
			t235 = claim_text(p24_nodes, "So over here, when we encounter a ");
			code52 = claim_element(p24_nodes, "CODE", {});
			var code52_nodes = children(code52);
			t236 = claim_text(code52_nodes, "{#");
			code52_nodes.forEach(detach);
			t237 = claim_text(p24_nodes, ", we add a case to check if we are starting a ");
			code53 = claim_element(p24_nodes, "CODE", {});
			var code53_nodes = children(code53);
			t238 = claim_text(code53_nodes, "{#key}");
			code53_nodes.forEach(detach);
			t239 = claim_text(p24_nodes, " block:");
			p24_nodes.forEach(detach);
			t240 = claim_space(section5_nodes);
			pre7 = claim_element(section5_nodes, "PRE", { class: true });
			var pre7_nodes = children(pre7);
			pre7_nodes.forEach(detach);
			t241 = claim_space(section5_nodes);
			p25 = claim_element(section5_nodes, "P", {});
			var p25_nodes = children(p25);
			t242 = claim_text(p25_nodes, "Similarly, for closing block ");
			code54 = claim_element(p25_nodes, "CODE", {});
			var code54_nodes = children(code54);
			t243 = claim_text(code54_nodes, "{/");
			code54_nodes.forEach(detach);
			t244 = claim_text(p25_nodes, ", we are going to make sure that ");
			code55 = claim_element(p25_nodes, "CODE", {});
			var code55_nodes = children(code55);
			t245 = claim_text(code55_nodes, "{#key}");
			code55_nodes.forEach(detach);
			t246 = claim_text(p25_nodes, " closes with ");
			code56 = claim_element(p25_nodes, "CODE", {});
			var code56_nodes = children(code56);
			t247 = claim_text(code56_nodes, "{/key}");
			code56_nodes.forEach(detach);
			t248 = claim_text(p25_nodes, ":");
			p25_nodes.forEach(detach);
			t249 = claim_space(section5_nodes);
			pre8 = claim_element(section5_nodes, "PRE", { class: true });
			var pre8_nodes = children(pre8);
			pre8_nodes.forEach(detach);
			t250 = claim_space(section5_nodes);
			p26 = claim_element(section5_nodes, "P", {});
			var p26_nodes = children(p26);
			t251 = claim_text(p26_nodes, "The next step is to read the JS expression. Since all logic blocks, ");
			code57 = claim_element(p26_nodes, "CODE", {});
			var code57_nodes = children(code57);
			t252 = claim_text(code57_nodes, "{#if}");
			code57_nodes.forEach(detach);
			t253 = claim_text(p26_nodes, ", ");
			code58 = claim_element(p26_nodes, "CODE", {});
			var code58_nodes = children(code58);
			t254 = claim_text(code58_nodes, "{#each}");
			code58_nodes.forEach(detach);
			t255 = claim_text(p26_nodes, " and ");
			code59 = claim_element(p26_nodes, "CODE", {});
			var code59_nodes = children(code59);
			t256 = claim_text(code59_nodes, "{#await}");
			code59_nodes.forEach(detach);
			t257 = claim_text(p26_nodes, " will read the JS expression next, it is no different for ");
			code60 = claim_element(p26_nodes, "CODE", {});
			var code60_nodes = children(code60);
			t258 = claim_text(code60_nodes, "{#key}");
			code60_nodes.forEach(detach);
			t259 = claim_text(p26_nodes, " and it is already taken care of:");
			p26_nodes.forEach(detach);
			t260 = claim_space(section5_nodes);
			pre9 = claim_element(section5_nodes, "PRE", { class: true });
			var pre9_nodes = children(pre9);
			pre9_nodes.forEach(detach);
			t261 = claim_space(section5_nodes);
			p27 = claim_element(section5_nodes, "P", {});
			var p27_nodes = children(p27);
			t262 = claim_text(p27_nodes, "So, let's move on to the next step!");
			p27_nodes.forEach(detach);
			section5_nodes.forEach(detach);
			t263 = claim_space(nodes);
			section6 = claim_element(nodes, "SECTION", {});
			var section6_nodes = children(section6);
			h32 = claim_element(section6_nodes, "H3", {});
			var h32_nodes = children(h32);
			a30 = claim_element(h32_nodes, "A", { href: true, id: true });
			var a30_nodes = children(a30);
			t264 = claim_text(a30_nodes, "Tracking references and dependencies");
			a30_nodes.forEach(detach);
			h32_nodes.forEach(detach);
			t265 = claim_space(section6_nodes);
			p28 = claim_element(section6_nodes, "P", {});
			var p28_nodes = children(p28);
			t266 = claim_text(p28_nodes, "If you noticed in the previous step, the type name we created for ");
			code61 = claim_element(p28_nodes, "CODE", {});
			var code61_nodes = children(code61);
			t267 = claim_text(code61_nodes, "{#key}");
			code61_nodes.forEach(detach);
			t268 = claim_text(p28_nodes, " block is called ");
			code62 = claim_element(p28_nodes, "CODE", {});
			var code62_nodes = children(code62);
			t269 = claim_text(code62_nodes, "KeyBlock");
			code62_nodes.forEach(detach);
			t270 = claim_text(p28_nodes, ".");
			p28_nodes.forEach(detach);
			t271 = claim_space(section6_nodes);
			p29 = claim_element(section6_nodes, "P", {});
			var p29_nodes = children(p29);
			t272 = claim_text(p29_nodes, "So, to keep the name consistent, we are going to create a ");
			code63 = claim_element(p29_nodes, "CODE", {});
			var code63_nodes = children(code63);
			t273 = claim_text(code63_nodes, "KeyBlock");
			code63_nodes.forEach(detach);
			t274 = claim_text(p29_nodes, " class in ");
			code64 = claim_element(p29_nodes, "CODE", {});
			var code64_nodes = children(code64);
			t275 = claim_text(code64_nodes, "src/compiler/compile/nodes/KeyBlock.ts");
			code64_nodes.forEach(detach);
			t276 = claim_text(p29_nodes, ":");
			p29_nodes.forEach(detach);
			t277 = claim_space(section6_nodes);
			pre10 = claim_element(section6_nodes, "PRE", { class: true });
			var pre10_nodes = children(pre10);
			pre10_nodes.forEach(detach);
			t278 = claim_space(section6_nodes);
			p30 = claim_element(section6_nodes, "P", {});
			var p30_nodes = children(p30);
			t279 = claim_text(p30_nodes, "I've added comments annotating the code above, hopefully it's self-explanatory.");
			p30_nodes.forEach(detach);
			t280 = claim_space(section6_nodes);
			p31 = claim_element(section6_nodes, "P", {});
			var p31_nodes = children(p31);
			t281 = claim_text(p31_nodes, "A few more points:");
			p31_nodes.forEach(detach);
			t282 = claim_space(section6_nodes);
			ul5 = claim_element(section6_nodes, "UL", {});
			var ul5_nodes = children(ul5);
			li20 = claim_element(ul5_nodes, "LI", {});
			var li20_nodes = children(li20);
			code65 = claim_element(li20_nodes, "CODE", {});
			var code65_nodes = children(code65);
			t283 = claim_text(code65_nodes, "info");
			code65_nodes.forEach(detach);
			t284 = claim_text(li20_nodes, " is the AST node we got from the parsing.");
			li20_nodes.forEach(detach);
			t285 = claim_space(ul5_nodes);
			li21 = claim_element(ul5_nodes, "LI", {});
			var li21_nodes = children(li21);
			t286 = claim_text(li21_nodes, "the ");
			code66 = claim_element(li21_nodes, "CODE", {});
			var code66_nodes = children(code66);
			t287 = claim_text(code66_nodes, "class Expression");
			code66_nodes.forEach(detach);
			t288 = claim_text(li21_nodes, " is constructed with the JavaScript AST of the expression and it is where we traverse the AST and marked the variables within the expression as ");
			code67 = claim_element(li21_nodes, "CODE", {});
			var code67_nodes = children(code67);
			t289 = claim_text(code67_nodes, "referenced: true");
			code67_nodes.forEach(detach);
			t290 = claim_text(li21_nodes, ".");
			li21_nodes.forEach(detach);
			t291 = claim_space(ul5_nodes);
			li22 = claim_element(ul5_nodes, "LI", {});
			var li22_nodes = children(li22);
			code68 = claim_element(li22_nodes, "CODE", {});
			var code68_nodes = children(code68);
			t292 = claim_text(code68_nodes, "map_children");
			code68_nodes.forEach(detach);
			t293 = claim_text(li22_nodes, " is used to map the ");
			code69 = claim_element(li22_nodes, "CODE", {});
			var code69_nodes = children(code69);
			t294 = claim_text(code69_nodes, "children");
			code69_nodes.forEach(detach);
			t295 = claim_text(li22_nodes, " of the ");
			code70 = claim_element(li22_nodes, "CODE", {});
			var code70_nodes = children(code70);
			t296 = claim_text(code70_nodes, "KeyBlock");
			code70_nodes.forEach(detach);
			t297 = claim_text(li22_nodes, " AST node to the compile node.");
			li22_nodes.forEach(detach);
			ul5_nodes.forEach(detach);
			t298 = claim_space(section6_nodes);
			blockquote1 = claim_element(section6_nodes, "BLOCKQUOTE", {});
			var blockquote1_nodes = children(blockquote1);
			p32 = claim_element(blockquote1_nodes, "P", {});
			var p32_nodes = children(p32);
			t299 = claim_text(p32_nodes, "Pardon for my lack of \"appropriate\" naming to differentiate the nodes in the Svelte codebase.");
			p32_nodes.forEach(detach);
			t300 = claim_space(blockquote1_nodes);
			p33 = claim_element(blockquote1_nodes, "P", {});
			var p33_nodes = children(p33);
			t301 = claim_text(p33_nodes, "Throughout the Svelte compilation process, the node is transformed one to another, which in every step of the transformation, new analysis is performed, and new information are added.");
			p33_nodes.forEach(detach);
			t302 = claim_space(blockquote1_nodes);
			p34 = claim_element(blockquote1_nodes, "P", {});
			var p34_nodes = children(p34);
			t303 = claim_text(p34_nodes, "Here, I am going to call:");
			p34_nodes.forEach(detach);
			t304 = claim_space(blockquote1_nodes);
			ul6 = claim_element(blockquote1_nodes, "UL", {});
			var ul6_nodes = children(ul6);
			li23 = claim_element(ul6_nodes, "LI", {});
			var li23_nodes = children(li23);
			t305 = claim_text(li23_nodes, "the node resulting from the parser: ");
			strong9 = claim_element(li23_nodes, "STRONG", {});
			var strong9_nodes = children(strong9);
			t306 = claim_text(strong9_nodes, "AST node");
			strong9_nodes.forEach(detach);
			li23_nodes.forEach(detach);
			t307 = claim_space(ul6_nodes);
			li24 = claim_element(ul6_nodes, "LI", {});
			var li24_nodes = children(li24);
			t308 = claim_text(li24_nodes, "the node created by the ");
			code71 = claim_element(li24_nodes, "CODE", {});
			var code71_nodes = children(code71);
			t309 = claim_text(code71_nodes, "Component");
			code71_nodes.forEach(detach);
			t310 = claim_text(li24_nodes, ", which extends from ");
			a31 = claim_element(li24_nodes, "A", { href: true, rel: true });
			var a31_nodes = children(a31);
			code72 = claim_element(a31_nodes, "CODE", {});
			var code72_nodes = children(code72);
			t311 = claim_text(code72_nodes, "compiler/compile/nodes/shared/Node.ts");
			code72_nodes.forEach(detach);
			a31_nodes.forEach(detach);
			t312 = claim_text(li24_nodes, ": ");
			strong10 = claim_element(li24_nodes, "STRONG", {});
			var strong10_nodes = children(strong10);
			t313 = claim_text(strong10_nodes, "compile node");
			strong10_nodes.forEach(detach);
			t314 = claim_space(li24_nodes);
			em1 = claim_element(li24_nodes, "EM", {});
			var em1_nodes = children(em1);
			t315 = claim_text(em1_nodes, "(because they are stored in the ");
			code73 = claim_element(em1_nodes, "CODE", {});
			var code73_nodes = children(code73);
			t316 = claim_text(code73_nodes, "compile");
			code73_nodes.forEach(detach);
			t317 = claim_text(em1_nodes, " folder)");
			em1_nodes.forEach(detach);
			li24_nodes.forEach(detach);
			t318 = claim_space(ul6_nodes);
			li25 = claim_element(ul6_nodes, "LI", {});
			var li25_nodes = children(li25);
			t319 = claim_text(li25_nodes, "the node created by the ");
			code74 = claim_element(li25_nodes, "CODE", {});
			var code74_nodes = children(code74);
			t320 = claim_text(code74_nodes, "Renderer");
			code74_nodes.forEach(detach);
			t321 = claim_text(li25_nodes, ", which extends from ");
			a32 = claim_element(li25_nodes, "A", { href: true, rel: true });
			var a32_nodes = children(a32);
			code75 = claim_element(a32_nodes, "CODE", {});
			var code75_nodes = children(code75);
			t322 = claim_text(code75_nodes, "compiler/compile/render_dom/wrappers/shared/Wrapper.ts");
			code75_nodes.forEach(detach);
			a32_nodes.forEach(detach);
			t323 = claim_text(li25_nodes, ": ");
			strong11 = claim_element(li25_nodes, "STRONG", {});
			var strong11_nodes = children(strong11);
			t324 = claim_text(strong11_nodes, "render-dom Wrapper");
			strong11_nodes.forEach(detach);
			t325 = claim_space(li25_nodes);
			em2 = claim_element(li25_nodes, "EM", {});
			var em2_nodes = children(em2);
			t326 = claim_text(em2_nodes, "(also because they are stored in the ");
			code76 = claim_element(em2_nodes, "CODE", {});
			var code76_nodes = children(code76);
			t327 = claim_text(code76_nodes, "render_dom/wrappers");
			code76_nodes.forEach(detach);
			t328 = claim_text(em2_nodes, " folder)");
			em2_nodes.forEach(detach);
			li25_nodes.forEach(detach);
			ul6_nodes.forEach(detach);
			blockquote1_nodes.forEach(detach);
			t329 = claim_space(section6_nodes);
			p35 = claim_element(section6_nodes, "P", {});
			var p35_nodes = children(p35);
			t330 = claim_text(p35_nodes, "If you managed to keep up so far, you may be sensing where we are heading next.");
			p35_nodes.forEach(detach);
			t331 = claim_space(section6_nodes);
			p36 = claim_element(section6_nodes, "P", {});
			var p36_nodes = children(p36);
			t332 = claim_text(p36_nodes, "We need to add ");
			code77 = claim_element(p36_nodes, "CODE", {});
			var code77_nodes = children(code77);
			t333 = claim_text(code77_nodes, "KeyBlock");
			code77_nodes.forEach(detach);
			t334 = claim_text(p36_nodes, " into ");
			code78 = claim_element(p36_nodes, "CODE", {});
			var code78_nodes = children(code78);
			t335 = claim_text(code78_nodes, "map_children");
			code78_nodes.forEach(detach);
			t336 = claim_text(p36_nodes, ":");
			p36_nodes.forEach(detach);
			t337 = claim_space(section6_nodes);
			pre11 = claim_element(section6_nodes, "PRE", { class: true });
			var pre11_nodes = children(pre11);
			pre11_nodes.forEach(detach);
			t338 = claim_space(section6_nodes);
			p37 = claim_element(section6_nodes, "P", {});
			var p37_nodes = children(p37);
			t339 = claim_text(p37_nodes, "Also, we need to add ");
			code79 = claim_element(p37_nodes, "CODE", {});
			var code79_nodes = children(code79);
			t340 = claim_text(code79_nodes, "KeyBlock");
			code79_nodes.forEach(detach);
			t341 = claim_text(p37_nodes, " as one of the ");
			code80 = claim_element(p37_nodes, "CODE", {});
			var code80_nodes = children(code80);
			t342 = claim_text(code80_nodes, "INode");
			code80_nodes.forEach(detach);
			t343 = claim_text(p37_nodes, " type for TypeScript:");
			p37_nodes.forEach(detach);
			t344 = claim_space(section6_nodes);
			pre12 = claim_element(section6_nodes, "PRE", { class: true });
			var pre12_nodes = children(pre12);
			pre12_nodes.forEach(detach);
			t345 = claim_space(section6_nodes);
			p38 = claim_element(section6_nodes, "P", {});
			var p38_nodes = children(p38);
			t346 = claim_text(p38_nodes, "And now, let's move on to implementing a ");
			strong12 = claim_element(p38_nodes, "STRONG", {});
			var strong12_nodes = children(strong12);
			t347 = claim_text(strong12_nodes, "render-dom Wrapper");
			strong12_nodes.forEach(detach);
			t348 = claim_text(p38_nodes, " for ");
			code81 = claim_element(p38_nodes, "CODE", {});
			var code81_nodes = children(code81);
			t349 = claim_text(code81_nodes, "KeyBlock");
			code81_nodes.forEach(detach);
			t350 = claim_text(p38_nodes, ".");
			p38_nodes.forEach(detach);
			section6_nodes.forEach(detach);
			t351 = claim_space(nodes);
			section7 = claim_element(nodes, "SECTION", {});
			var section7_nodes = children(section7);
			h33 = claim_element(section7_nodes, "H3", {});
			var h33_nodes = children(h33);
			a33 = claim_element(h33_nodes, "A", { href: true, id: true });
			var a33_nodes = children(a33);
			t352 = claim_text(a33_nodes, "Creating code blocks & fragments");
			a33_nodes.forEach(detach);
			h33_nodes.forEach(detach);
			t353 = claim_space(section7_nodes);
			p39 = claim_element(section7_nodes, "P", {});
			var p39_nodes = children(p39);
			t354 = claim_text(p39_nodes, "At this point, we need to decide how the compiled JS should look like, it's time for us to ");
			strong13 = claim_element(p39_nodes, "STRONG", {});
			var strong13_nodes = children(strong13);
			t355 = claim_text(strong13_nodes, "reverse-compile Svelte in your head");
			strong13_nodes.forEach(detach);
			t356 = claim_text(p39_nodes, "!");
			p39_nodes.forEach(detach);
			t357 = claim_space(section7_nodes);
			p40 = claim_element(section7_nodes, "P", {});
			var p40_nodes = children(p40);
			t358 = claim_text(p40_nodes, "If you've read my ");
			a34 = claim_element(p40_nodes, "A", { href: true });
			var a34_nodes = children(a34);
			t359 = claim_text(a34_nodes, "Compile Svelte in your head (Part 4)");
			a34_nodes.forEach(detach);
			t360 = claim_text(p40_nodes, ", you've seen how we create a different ");
			code82 = claim_element(p40_nodes, "CODE", {});
			var code82_nodes = children(code82);
			t361 = claim_text(code82_nodes, "create_fragment");
			code82_nodes.forEach(detach);
			t362 = claim_text(p40_nodes, " function for each of the logic branches, so we can control the content within a logic branch as a whole.");
			p40_nodes.forEach(detach);
			t363 = claim_space(section7_nodes);
			p41 = claim_element(section7_nodes, "P", {});
			var p41_nodes = children(p41);
			t364 = claim_text(p41_nodes, "Similarly, we can create a ");
			code83 = claim_element(p41_nodes, "CODE", {});
			var code83_nodes = children(code83);
			t365 = claim_text(code83_nodes, "create_fragment");
			code83_nodes.forEach(detach);
			t366 = claim_text(p41_nodes, " function for the content of the ");
			code84 = claim_element(p41_nodes, "CODE", {});
			var code84_nodes = children(code84);
			t367 = claim_text(code84_nodes, "{#key}");
			code84_nodes.forEach(detach);
			t368 = claim_text(p41_nodes, ", then we can control when to create / mount / update / destroy the content.");
			p41_nodes.forEach(detach);
			t369 = claim_space(section7_nodes);
			pre13 = claim_element(section7_nodes, "PRE", { class: true });
			var pre13_nodes = children(pre13);
			pre13_nodes.forEach(detach);
			t370 = claim_space(section7_nodes);
			p42 = claim_element(section7_nodes, "P", {});
			var p42_nodes = children(p42);
			t371 = claim_text(p42_nodes, "To use the ");
			code85 = claim_element(p42_nodes, "CODE", {});
			var code85_nodes = children(code85);
			t372 = claim_text(code85_nodes, "create_key_block");
			code85_nodes.forEach(detach);
			t373 = claim_text(p42_nodes, ":");
			p42_nodes.forEach(detach);
			t374 = claim_space(section7_nodes);
			pre14 = claim_element(section7_nodes, "PRE", { class: true });
			var pre14_nodes = children(pre14);
			pre14_nodes.forEach(detach);
			t375 = claim_space(section7_nodes);
			p43 = claim_element(section7_nodes, "P", {});
			var p43_nodes = children(p43);
			t376 = claim_text(p43_nodes, "The next thing to do, is to place these statements in the right position:");
			p43_nodes.forEach(detach);
			t377 = claim_space(section7_nodes);
			pre15 = claim_element(section7_nodes, "PRE", { class: true });
			var pre15_nodes = children(pre15);
			pre15_nodes.forEach(detach);
			t378 = claim_space(section7_nodes);
			p44 = claim_element(section7_nodes, "P", {});
			var p44_nodes = children(p44);
			t379 = claim_text(p44_nodes, "Now, the most important piece of the ");
			code86 = claim_element(p44_nodes, "CODE", {});
			var code86_nodes = children(code86);
			t380 = claim_text(code86_nodes, "{#key}");
			code86_nodes.forEach(detach);
			t381 = claim_text(p44_nodes, " block, the logic to");
			p44_nodes.forEach(detach);
			t382 = claim_space(section7_nodes);
			ul7 = claim_element(section7_nodes, "UL", {});
			var ul7_nodes = children(ul7);
			li26 = claim_element(ul7_nodes, "LI", {});
			var li26_nodes = children(li26);
			t383 = claim_text(li26_nodes, "check if the expression has changed");
			li26_nodes.forEach(detach);
			t384 = claim_space(ul7_nodes);
			li27 = claim_element(ul7_nodes, "LI", {});
			var li27_nodes = children(li27);
			t385 = claim_text(li27_nodes, "if so, recreate the elements inside the ");
			code87 = claim_element(li27_nodes, "CODE", {});
			var code87_nodes = children(code87);
			t386 = claim_text(code87_nodes, "{#key}");
			code87_nodes.forEach(detach);
			t387 = claim_text(li27_nodes, " block");
			li27_nodes.forEach(detach);
			ul7_nodes.forEach(detach);
			t388 = claim_space(section7_nodes);
			pre16 = claim_element(section7_nodes, "PRE", { class: true });
			var pre16_nodes = children(pre16);
			pre16_nodes.forEach(detach);
			t389 = claim_space(section7_nodes);
			p45 = claim_element(section7_nodes, "P", {});
			var p45_nodes = children(p45);
			t390 = claim_text(p45_nodes, "If there is transition in the content of the ");
			code88 = claim_element(p45_nodes, "CODE", {});
			var code88_nodes = children(code88);
			t391 = claim_text(code88_nodes, "key_block");
			code88_nodes.forEach(detach);
			t392 = claim_text(p45_nodes, ", we need extra code for the transition:");
			p45_nodes.forEach(detach);
			t393 = claim_space(section7_nodes);
			pre17 = claim_element(section7_nodes, "PRE", { class: true });
			var pre17_nodes = children(pre17);
			pre17_nodes.forEach(detach);
			t394 = claim_space(section7_nodes);
			p46 = claim_element(section7_nodes, "P", {});
			var p46_nodes = children(p46);
			t395 = claim_text(p46_nodes, "I am going to gloss over the details of how ");
			code89 = claim_element(p46_nodes, "CODE", {});
			var code89_nodes = children(code89);
			t396 = claim_text(code89_nodes, "outros");
			code89_nodes.forEach(detach);
			t397 = claim_text(p46_nodes, " / ");
			code90 = claim_element(p46_nodes, "CODE", {});
			var code90_nodes = children(code90);
			t398 = claim_text(code90_nodes, "intros");
			code90_nodes.forEach(detach);
			t399 = claim_text(p46_nodes, " work, we will cover them in the later parts of \"Compile Svelte in your head\", so let's assume these code are up for the job.");
			p46_nodes.forEach(detach);
			t400 = claim_space(section7_nodes);
			p47 = claim_element(section7_nodes, "P", {});
			var p47_nodes = children(p47);
			t401 = claim_text(p47_nodes, "Now we have done the reverse-compile Svelte in your head, let's reverse the reverse, and write the render code for Svelte ");
			code91 = claim_element(p47_nodes, "CODE", {});
			var code91_nodes = children(code91);
			t402 = claim_text(code91_nodes, "{#key}");
			code91_nodes.forEach(detach);
			t403 = claim_text(p47_nodes, " block.");
			p47_nodes.forEach(detach);
			t404 = claim_space(section7_nodes);
			p48 = claim_element(section7_nodes, "P", {});
			var p48_nodes = children(p48);
			t405 = claim_text(p48_nodes, "Here are some setup code for the render-dom Wrapper for ");
			code92 = claim_element(p48_nodes, "CODE", {});
			var code92_nodes = children(code92);
			t406 = claim_text(code92_nodes, "{#key}");
			code92_nodes.forEach(detach);
			t407 = claim_text(p48_nodes, ":");
			p48_nodes.forEach(detach);
			t408 = claim_space(section7_nodes);
			pre18 = claim_element(section7_nodes, "PRE", { class: true });
			var pre18_nodes = children(pre18);
			pre18_nodes.forEach(detach);
			t409 = claim_space(section7_nodes);
			p49 = claim_element(section7_nodes, "P", {});
			var p49_nodes = children(p49);
			t410 = claim_text(p49_nodes, "A few more points:");
			p49_nodes.forEach(detach);
			t411 = claim_space(section7_nodes);
			ul10 = claim_element(section7_nodes, "UL", {});
			var ul10_nodes = children(ul10);
			li30 = claim_element(ul10_nodes, "LI", {});
			var li30_nodes = children(li30);
			t412 = claim_text(li30_nodes, "the ");
			code93 = claim_element(li30_nodes, "CODE", {});
			var code93_nodes = children(code93);
			t413 = claim_text(code93_nodes, "block");
			code93_nodes.forEach(detach);
			t414 = claim_text(li30_nodes, " in the ");
			code94 = claim_element(li30_nodes, "CODE", {});
			var code94_nodes = children(code94);
			t415 = claim_text(code94_nodes, "render");
			code94_nodes.forEach(detach);
			t416 = claim_text(li30_nodes, " method is the current ");
			code95 = claim_element(li30_nodes, "CODE", {});
			var code95_nodes = children(code95);
			t417 = claim_text(code95_nodes, "create_fragment");
			code95_nodes.forEach(detach);
			t418 = claim_text(li30_nodes, " function that the ");
			code96 = claim_element(li30_nodes, "CODE", {});
			var code96_nodes = children(code96);
			t419 = claim_text(code96_nodes, "{#key}");
			code96_nodes.forEach(detach);
			t420 = claim_text(li30_nodes, " block is in; ");
			code97 = claim_element(li30_nodes, "CODE", {});
			var code97_nodes = children(code97);
			t421 = claim_text(code97_nodes, "this.block");
			code97_nodes.forEach(detach);
			t422 = claim_text(li30_nodes, " is the new ");
			code98 = claim_element(li30_nodes, "CODE", {});
			var code98_nodes = children(code98);
			t423 = claim_text(code98_nodes, "create_fragment");
			code98_nodes.forEach(detach);
			t424 = claim_text(li30_nodes, " function that we created to put the content of the ");
			code99 = claim_element(li30_nodes, "CODE", {});
			var code99_nodes = children(code99);
			t425 = claim_text(code99_nodes, "{#key}");
			code99_nodes.forEach(detach);
			t426 = claim_text(li30_nodes, " block");
			ul8 = claim_element(li30_nodes, "UL", {});
			var ul8_nodes = children(ul8);
			li28 = claim_element(ul8_nodes, "LI", {});
			var li28_nodes = children(li28);
			t427 = claim_text(li28_nodes, "we named the new ");
			code100 = claim_element(li28_nodes, "CODE", {});
			var code100_nodes = children(code100);
			t428 = claim_text(code100_nodes, "create_fragment");
			code100_nodes.forEach(detach);
			t429 = claim_text(li28_nodes, " function ");
			code101 = claim_element(li28_nodes, "CODE", {});
			var code101_nodes = children(code101);
			t430 = claim_text(code101_nodes, "\"create_key_block\"");
			code101_nodes.forEach(detach);
			li28_nodes.forEach(detach);
			t431 = claim_space(ul8_nodes);
			li29 = claim_element(ul8_nodes, "LI", {});
			var li29_nodes = children(li29);
			t432 = claim_text(li29_nodes, "to make sure there's no conflicting names, we use ");
			code102 = claim_element(li29_nodes, "CODE", {});
			var code102_nodes = children(code102);
			t433 = claim_text(code102_nodes, "renderer.component.get_unique_name()");
			code102_nodes.forEach(detach);
			li29_nodes.forEach(detach);
			ul8_nodes.forEach(detach);
			li30_nodes.forEach(detach);
			t434 = claim_space(ul10_nodes);
			li32 = claim_element(ul10_nodes, "LI", {});
			var li32_nodes = children(li32);
			t435 = claim_text(li32_nodes, "All ");
			strong14 = claim_element(li32_nodes, "STRONG", {});
			var strong14_nodes = children(strong14);
			t436 = claim_text(strong14_nodes, "render-dom wrappers");
			strong14_nodes.forEach(detach);
			t437 = claim_text(li32_nodes, " has a property named ");
			code103 = claim_element(li32_nodes, "CODE", {});
			var code103_nodes = children(code103);
			t438 = claim_text(code103_nodes, "var");
			code103_nodes.forEach(detach);
			t439 = claim_text(li32_nodes, ", which is the variable name referencing the element / block to be created by the ");
			strong15 = claim_element(li32_nodes, "STRONG", {});
			var strong15_nodes = children(strong15);
			t440 = claim_text(strong15_nodes, "render-dom wrapper");
			strong15_nodes.forEach(detach);
			t441 = claim_text(li32_nodes, ".");
			ul9 = claim_element(li32_nodes, "UL", {});
			var ul9_nodes = children(ul9);
			li31 = claim_element(ul9_nodes, "LI", {});
			var li31_nodes = children(li31);
			t442 = claim_text(li31_nodes, "the ");
			code104 = claim_element(li31_nodes, "CODE", {});
			var code104_nodes = children(code104);
			t443 = claim_text(code104_nodes, "var");
			code104_nodes.forEach(detach);
			t444 = claim_text(li31_nodes, " name will be ");
			a35 = claim_element(li31_nodes, "A", { href: true, rel: true });
			var a35_nodes = children(a35);
			t445 = claim_text(a35_nodes, "deconflicted by the Renderer");
			a35_nodes.forEach(detach);
			li31_nodes.forEach(detach);
			ul9_nodes.forEach(detach);
			li32_nodes.forEach(detach);
			ul10_nodes.forEach(detach);
			t446 = claim_space(section7_nodes);
			p50 = claim_element(section7_nodes, "P", {});
			var p50_nodes = children(p50);
			t447 = claim_text(p50_nodes, "Now, let's implement the ");
			code105 = claim_element(p50_nodes, "CODE", {});
			var code105_nodes = children(code105);
			t448 = claim_text(code105_nodes, "render");
			code105_nodes.forEach(detach);
			t449 = claim_text(p50_nodes, " method.");
			p50_nodes.forEach(detach);
			t450 = claim_space(section7_nodes);
			p51 = claim_element(section7_nodes, "P", {});
			var p51_nodes = children(p51);
			t451 = claim_text(p51_nodes, "Firstly, render the children into ");
			code106 = claim_element(p51_nodes, "CODE", {});
			var code106_nodes = children(code106);
			t452 = claim_text(code106_nodes, "this.block");
			code106_nodes.forEach(detach);
			t453 = claim_text(p51_nodes, ":");
			p51_nodes.forEach(detach);
			t454 = claim_space(section7_nodes);
			pre19 = claim_element(section7_nodes, "PRE", { class: true });
			var pre19_nodes = children(pre19);
			pre19_nodes.forEach(detach);
			t455 = claim_space(section7_nodes);
			p52 = claim_element(section7_nodes, "P", {});
			var p52_nodes = children(p52);
			t456 = claim_text(p52_nodes, "We pass in ");
			code107 = claim_element(p52_nodes, "CODE", {});
			var code107_nodes = children(code107);
			t457 = claim_text(code107_nodes, "null");
			code107_nodes.forEach(detach);
			t458 = claim_text(p52_nodes, " as ");
			code108 = claim_element(p52_nodes, "CODE", {});
			var code108_nodes = children(code108);
			t459 = claim_text(code108_nodes, "parent_node");
			code108_nodes.forEach(detach);
			t460 = claim_text(p52_nodes, " and ");
			code109 = claim_element(p52_nodes, "CODE", {});
			var code109_nodes = children(code109);
			t461 = claim_text(code109_nodes, "x`#nodes`");
			code109_nodes.forEach(detach);
			t462 = claim_text(p52_nodes, " as ");
			code110 = claim_element(p52_nodes, "CODE", {});
			var code110_nodes = children(code110);
			t463 = claim_text(code110_nodes, "parent_nodes");
			code110_nodes.forEach(detach);
			t464 = claim_text(p52_nodes, " to indicate that the children will be rendered at the root of the ");
			code111 = claim_element(p52_nodes, "CODE", {});
			var code111_nodes = children(code111);
			t465 = claim_text(code111_nodes, "this.block");
			code111_nodes.forEach(detach);
			t466 = claim_text(p52_nodes, ".");
			p52_nodes.forEach(detach);
			t467 = claim_space(section7_nodes);
			hr0 = claim_element(section7_nodes, "HR", {});
			t468 = claim_space(section7_nodes);
			p53 = claim_element(section7_nodes, "P", {});
			var p53_nodes = children(p53);
			t469 = claim_text(p53_nodes, "If I am implementing the ");
			code112 = claim_element(p53_nodes, "CODE", {});
			var code112_nodes = children(code112);
			t470 = claim_text(code112_nodes, "render");
			code112_nodes.forEach(detach);
			t471 = claim_text(p53_nodes, " method of an Element render-dom Wrapper, and currently rendering the ");
			code113 = claim_element(p53_nodes, "CODE", {});
			var code113_nodes = children(code113);
			t472 = claim_text(code113_nodes, "<div>");
			code113_nodes.forEach(detach);
			t473 = claim_text(p53_nodes, " in the following code snippet:");
			p53_nodes.forEach(detach);
			t474 = claim_space(section7_nodes);
			pre20 = claim_element(section7_nodes, "PRE", { class: true });
			var pre20_nodes = children(pre20);
			pre20_nodes.forEach(detach);
			t475 = claim_space(section7_nodes);
			p54 = claim_element(section7_nodes, "P", {});
			var p54_nodes = children(p54);
			t476 = claim_text(p54_nodes, "then I will render the ");
			code114 = claim_element(p54_nodes, "CODE", {});
			var code114_nodes = children(code114);
			t477 = claim_text(code114_nodes, "<span />");
			code114_nodes.forEach(detach);
			t478 = claim_text(p54_nodes, " with:");
			p54_nodes.forEach(detach);
			t479 = claim_space(section7_nodes);
			pre21 = claim_element(section7_nodes, "PRE", { class: true });
			var pre21_nodes = children(pre21);
			pre21_nodes.forEach(detach);
			t480 = claim_space(section7_nodes);
			p55 = claim_element(section7_nodes, "P", {});
			var p55_nodes = children(p55);
			t481 = claim_text(p55_nodes, "so the ");
			code115 = claim_element(p55_nodes, "CODE", {});
			var code115_nodes = children(code115);
			t482 = claim_text(code115_nodes, "<span />");
			code115_nodes.forEach(detach);
			t483 = claim_text(p55_nodes, " will be inserted into the current ");
			code116 = claim_element(p55_nodes, "CODE", {});
			var code116_nodes = children(code116);
			t484 = claim_text(code116_nodes, "<div />");
			code116_nodes.forEach(detach);
			t485 = claim_text(p55_nodes, " and hydrate from the ");
			code117 = claim_element(p55_nodes, "CODE", {});
			var code117_nodes = children(code117);
			t486 = claim_text(code117_nodes, "<div />");
			code117_nodes.forEach(detach);
			t487 = claim_text(p55_nodes, "'s childNodes.");
			p55_nodes.forEach(detach);
			t488 = claim_space(section7_nodes);
			hr1 = claim_element(section7_nodes, "HR", {});
			t489 = claim_space(section7_nodes);
			p56 = claim_element(section7_nodes, "P", {});
			var p56_nodes = children(p56);
			t490 = claim_text(p56_nodes, "Next, I am going to insert code into each of the fragment methods:");
			p56_nodes.forEach(detach);
			t491 = claim_space(section7_nodes);
			pre22 = claim_element(section7_nodes, "PRE", { class: true });
			var pre22_nodes = children(pre22);
			pre22_nodes.forEach(detach);
			t492 = claim_space(section7_nodes);
			p57 = claim_element(section7_nodes, "P", {});
			var p57_nodes = children(p57);
			t493 = claim_text(p57_nodes, "A few more points:");
			p57_nodes.forEach(detach);
			t494 = claim_space(section7_nodes);
			ul12 = claim_element(section7_nodes, "UL", {});
			var ul12_nodes = children(ul12);
			li33 = claim_element(ul12_nodes, "LI", {});
			var li33_nodes = children(li33);
			t495 = claim_text(li33_nodes, "we push the code into respective methods of the ");
			code118 = claim_element(li33_nodes, "CODE", {});
			var code118_nodes = children(code118);
			t496 = claim_text(code118_nodes, "block");
			code118_nodes.forEach(detach);
			t497 = claim_text(li33_nodes, ", eg: ");
			code119 = claim_element(li33_nodes, "CODE", {});
			var code119_nodes = children(code119);
			t498 = claim_text(code119_nodes, "init");
			code119_nodes.forEach(detach);
			t499 = claim_text(li33_nodes, ", ");
			code120 = claim_element(li33_nodes, "CODE", {});
			var code120_nodes = children(code120);
			t500 = claim_text(code120_nodes, "create");
			code120_nodes.forEach(detach);
			t501 = claim_text(li33_nodes, ", ");
			code121 = claim_element(li33_nodes, "CODE", {});
			var code121_nodes = children(code121);
			t502 = claim_text(code121_nodes, "mount");
			code121_nodes.forEach(detach);
			t503 = claim_text(li33_nodes, ", ...");
			li33_nodes.forEach(detach);
			t504 = claim_space(ul12_nodes);
			li35 = claim_element(ul12_nodes, "LI", {});
			var li35_nodes = children(li35);
			t505 = claim_text(li35_nodes, "we use ");
			a36 = claim_element(li35_nodes, "A", { href: true, rel: true });
			var a36_nodes = children(a36);
			t506 = claim_text(a36_nodes, "tagged templates");
			a36_nodes.forEach(detach);
			t507 = claim_text(li35_nodes, ", ");
			code122 = claim_element(li35_nodes, "CODE", {});
			var code122_nodes = children(code122);
			t508 = claim_text(code122_nodes, "b`...`");
			code122_nodes.forEach(detach);
			t509 = claim_text(li35_nodes, " to create a JavaScript AST node. The ");
			code123 = claim_element(li35_nodes, "CODE", {});
			var code123_nodes = children(code123);
			t510 = claim_text(code123_nodes, "b");
			code123_nodes.forEach(detach);
			t511 = claim_text(li35_nodes, " tag function allow us to pass in JavaScript AST node as placeholder, so that is very convenient.");
			ul11 = claim_element(li35_nodes, "UL", {});
			var ul11_nodes = children(ul11);
			li34 = claim_element(ul11_nodes, "LI", {});
			var li34_nodes = children(li34);
			t512 = claim_text(li34_nodes, "You can check out more about the ");
			code124 = claim_element(li34_nodes, "CODE", {});
			var code124_nodes = children(code124);
			t513 = claim_text(code124_nodes, "b");
			code124_nodes.forEach(detach);
			t514 = claim_text(li34_nodes, " tag function from ");
			a37 = claim_element(li34_nodes, "A", { href: true, rel: true });
			var a37_nodes = children(a37);
			t515 = claim_text(a37_nodes, "code-red");
			a37_nodes.forEach(detach);
			li34_nodes.forEach(detach);
			ul11_nodes.forEach(detach);
			li35_nodes.forEach(detach);
			ul12_nodes.forEach(detach);
			t516 = claim_space(section7_nodes);
			p58 = claim_element(section7_nodes, "P", {});
			var p58_nodes = children(p58);
			t517 = claim_text(p58_nodes, "Now, to implement the dirty checking, we use ");
			code125 = claim_element(p58_nodes, "CODE", {});
			var code125_nodes = children(code125);
			t518 = claim_text(code125_nodes, "this.dependencies");
			code125_nodes.forEach(detach);
			p58_nodes.forEach(detach);
			t519 = claim_space(section7_nodes);
			pre23 = claim_element(section7_nodes, "PRE", { class: true });
			var pre23_nodes = children(pre23);
			pre23_nodes.forEach(detach);
			t520 = claim_space(section7_nodes);
			p59 = claim_element(section7_nodes, "P", {});
			var p59_nodes = children(p59);
			t521 = claim_text(p59_nodes, "To determine whether our expression value has changed, we are going to compute the expression and compare it with ");
			code126 = claim_element(p59_nodes, "CODE", {});
			var code126_nodes = children(code126);
			t522 = claim_text(code126_nodes, "previous_key");
			code126_nodes.forEach(detach);
			t523 = claim_text(p59_nodes, " and determine whether it has changed.");
			p59_nodes.forEach(detach);
			t524 = claim_space(section7_nodes);
			p60 = claim_element(section7_nodes, "P", {});
			var p60_nodes = children(p60);
			t525 = claim_text(p60_nodes, "Here's a recap of the compiled code that we've come up previously:");
			p60_nodes.forEach(detach);
			t526 = claim_space(section7_nodes);
			pre24 = claim_element(section7_nodes, "PRE", { class: true });
			var pre24_nodes = children(pre24);
			pre24_nodes.forEach(detach);
			t527 = claim_space(section7_nodes);
			p61 = claim_element(section7_nodes, "P", {});
			var p61_nodes = children(p61);
			t528 = claim_text(p61_nodes, "We start with declaring the variable, ");
			code127 = claim_element(p61_nodes, "CODE", {});
			var code127_nodes = children(code127);
			t529 = claim_text(code127_nodes, "previous_key");
			code127_nodes.forEach(detach);
			t530 = claim_text(p61_nodes, ":");
			p61_nodes.forEach(detach);
			t531 = claim_space(section7_nodes);
			pre25 = claim_element(section7_nodes, "PRE", { class: true });
			var pre25_nodes = children(pre25);
			pre25_nodes.forEach(detach);
			t532 = claim_space(section7_nodes);
			p62 = claim_element(section7_nodes, "P", {});
			var p62_nodes = children(p62);
			code128 = claim_element(p62_nodes, "CODE", {});
			var code128_nodes = children(code128);
			t533 = claim_text(code128_nodes, "expression.manipulate(block)");
			code128_nodes.forEach(detach);
			t534 = claim_text(p62_nodes, " will convert the expression to refer to the ");
			code129 = claim_element(p62_nodes, "CODE", {});
			var code129_nodes = children(code129);
			t535 = claim_text(code129_nodes, "ctx");
			code129_nodes.forEach(detach);
			t536 = claim_text(p62_nodes, " variable, for example:");
			p62_nodes.forEach(detach);
			t537 = claim_space(section7_nodes);
			pre26 = claim_element(section7_nodes, "PRE", { class: true });
			var pre26_nodes = children(pre26);
			pre26_nodes.forEach(detach);
			t538 = claim_space(section7_nodes);
			p63 = claim_element(section7_nodes, "P", {});
			var p63_nodes = children(p63);
			t539 = claim_text(p63_nodes, "Next we are going to compare the new value and assign it to ");
			code130 = claim_element(p63_nodes, "CODE", {});
			var code130_nodes = children(code130);
			t540 = claim_text(code130_nodes, "previous_key");
			code130_nodes.forEach(detach);
			t541 = claim_text(p63_nodes, " after that.");
			p63_nodes.forEach(detach);
			t542 = claim_space(section7_nodes);
			pre27 = claim_element(section7_nodes, "PRE", { class: true });
			var pre27_nodes = children(pre27);
			pre27_nodes.forEach(detach);
			t543 = claim_space(section7_nodes);
			p64 = claim_element(section7_nodes, "P", {});
			var p64_nodes = children(p64);
			t544 = claim_text(p64_nodes, "And to combine all of these, we have:");
			p64_nodes.forEach(detach);
			t545 = claim_space(section7_nodes);
			pre28 = claim_element(section7_nodes, "PRE", { class: true });
			var pre28_nodes = children(pre28);
			pre28_nodes.forEach(detach);
			t546 = claim_space(section7_nodes);
			p65 = claim_element(section7_nodes, "P", {});
			var p65_nodes = children(p65);
			t547 = claim_text(p65_nodes, "We are using the ");
			code131 = claim_element(p65_nodes, "CODE", {});
			var code131_nodes = children(code131);
			t548 = claim_text(code131_nodes, "anchor");
			code131_nodes.forEach(detach);
			t549 = claim_text(p65_nodes, " when we are mounting the new ");
			code132 = claim_element(p65_nodes, "CODE", {});
			var code132_nodes = children(code132);
			t550 = claim_text(code132_nodes, "key_block");
			code132_nodes.forEach(detach);
			t551 = claim_text(p65_nodes, ", you can check out ");
			a38 = claim_element(p65_nodes, "A", { href: true });
			var a38_nodes = children(a38);
			t552 = claim_text(a38_nodes, "Compile Svelte in your head Part 4: the extra text node");
			a38_nodes.forEach(detach);
			t553 = claim_text(p65_nodes, ", explaining why we need the anchor node, and here is how the anchor node being computed:");
			p65_nodes.forEach(detach);
			t554 = claim_space(section7_nodes);
			pre29 = claim_element(section7_nodes, "PRE", { class: true });
			var pre29_nodes = children(pre29);
			pre29_nodes.forEach(detach);
			t555 = claim_space(section7_nodes);
			p66 = claim_element(section7_nodes, "P", {});
			var p66_nodes = children(p66);
			t556 = claim_text(p66_nodes, "It could be the next sibling, or it could be a new ");
			code133 = claim_element(p66_nodes, "CODE", {});
			var code133_nodes = children(code133);
			t557 = claim_text(code133_nodes, "empty()");
			code133_nodes.forEach(detach);
			t558 = claim_text(p66_nodes, " text node created.");
			p66_nodes.forEach(detach);
			t559 = claim_space(section7_nodes);
			p67 = claim_element(section7_nodes, "P", {});
			var p67_nodes = children(p67);
			t560 = claim_text(p67_nodes, "Finally, if the content has transition, we need to add code for the transition as well:");
			p67_nodes.forEach(detach);
			t561 = claim_space(section7_nodes);
			pre30 = claim_element(section7_nodes, "PRE", { class: true });
			var pre30_nodes = children(pre30);
			pre30_nodes.forEach(detach);
			t562 = claim_space(section7_nodes);
			p68 = claim_element(section7_nodes, "P", {});
			var p68_nodes = children(p68);
			t563 = claim_text(p68_nodes, "Where to place them? Well, I'll leave that as your exercise to figure that out. 😉");
			p68_nodes.forEach(detach);
			section7_nodes.forEach(detach);
			t564 = claim_space(nodes);
			section8 = claim_element(nodes, "SECTION", {});
			var section8_nodes = children(section8);
			h34 = claim_element(section8_nodes, "H3", {});
			var h34_nodes = children(h34);
			a39 = claim_element(h34_nodes, "A", { href: true, id: true });
			var a39_nodes = children(a39);
			t565 = claim_text(a39_nodes, "Creating code for SSR");
			a39_nodes.forEach(detach);
			h34_nodes.forEach(detach);
			t566 = claim_space(section8_nodes);
			p69 = claim_element(section8_nodes, "P", {});
			var p69_nodes = children(p69);
			t567 = claim_text(p69_nodes, "For SSR, it is much simpler than for the ");
			code134 = claim_element(p69_nodes, "CODE", {});
			var code134_nodes = children(code134);
			t568 = claim_text(code134_nodes, "dom");
			code134_nodes.forEach(detach);
			t569 = claim_text(p69_nodes, ". ");
			code135 = claim_element(p69_nodes, "CODE", {});
			var code135_nodes = children(code135);
			t570 = claim_text(code135_nodes, "{#key}");
			code135_nodes.forEach(detach);
			t571 = claim_text(p69_nodes, " block has no special meaning in SSR, because, you will only render once in SSR:");
			p69_nodes.forEach(detach);
			t572 = claim_space(section8_nodes);
			pre31 = claim_element(section8_nodes, "PRE", { class: true });
			var pre31_nodes = children(pre31);
			pre31_nodes.forEach(detach);
			t573 = claim_space(section8_nodes);
			p70 = claim_element(section8_nodes, "P", {});
			var p70_nodes = children(p70);
			t574 = claim_text(p70_nodes, "☝️ That's all the code we need for SSR. We are rendering the children, passing down the ");
			code136 = claim_element(p70_nodes, "CODE", {});
			var code136_nodes = children(code136);
			t575 = claim_text(code136_nodes, "options");
			code136_nodes.forEach(detach);
			t576 = claim_text(p70_nodes, ", and add no extra code for the ");
			code137 = claim_element(p70_nodes, "CODE", {});
			var code137_nodes = children(code137);
			t577 = claim_text(code137_nodes, "{#key}");
			code137_nodes.forEach(detach);
			t578 = claim_text(p70_nodes, " block.");
			p70_nodes.forEach(detach);
			section8_nodes.forEach(detach);
			t579 = claim_space(nodes);
			section9 = claim_element(nodes, "SECTION", {});
			var section9_nodes = children(section9);
			h35 = claim_element(section9_nodes, "H3", {});
			var h35_nodes = children(h35);
			a40 = claim_element(h35_nodes, "A", { href: true, id: true });
			var a40_nodes = children(a40);
			t580 = claim_text(a40_nodes, "Generate code");
			a40_nodes.forEach(detach);
			h35_nodes.forEach(detach);
			t581 = claim_space(section9_nodes);
			p71 = claim_element(section9_nodes, "P", {});
			var p71_nodes = children(p71);
			t582 = claim_text(p71_nodes, "Well, everything in this step is set up generic enough to handle most use case.");
			p71_nodes.forEach(detach);
			t583 = claim_space(section9_nodes);
			p72 = claim_element(section9_nodes, "P", {});
			var p72_nodes = children(p72);
			t584 = claim_text(p72_nodes, "So, nothing to change here. 🤷‍♂️");
			p72_nodes.forEach(detach);
			section9_nodes.forEach(detach);
			t585 = claim_space(nodes);
			section10 = claim_element(nodes, "SECTION", {});
			var section10_nodes = children(section10);
			h36 = claim_element(section10_nodes, "H3", {});
			var h36_nodes = children(h36);
			a41 = claim_element(h36_nodes, "A", { href: true, id: true });
			var a41_nodes = children(a41);
			t586 = claim_text(a41_nodes, "A few other implementation consideration");
			a41_nodes.forEach(detach);
			h36_nodes.forEach(detach);
			t587 = claim_space(section10_nodes);
			ul13 = claim_element(section10_nodes, "UL", {});
			var ul13_nodes = children(ul13);
			li36 = claim_element(ul13_nodes, "LI", {});
			var li36_nodes = children(li36);
			t588 = claim_text(li36_nodes, "What if the expression in the ");
			code138 = claim_element(li36_nodes, "CODE", {});
			var code138_nodes = children(code138);
			t589 = claim_text(code138_nodes, "{#key}");
			code138_nodes.forEach(detach);
			t590 = claim_text(li36_nodes, " block is not dynamic, do we give warnings? or optimise the output?");
			li36_nodes.forEach(detach);
			t591 = claim_space(ul13_nodes);
			li37 = claim_element(ul13_nodes, "LI", {});
			var li37_nodes = children(li37);
			t592 = claim_text(li37_nodes, "How will ");
			a42 = claim_element(li37_nodes, "A", { href: true, rel: true });
			var a42_nodes = children(a42);
			code139 = claim_element(a42_nodes, "CODE", {});
			var code139_nodes = children(code139);
			t593 = claim_text(code139_nodes, "<svelte:options immutable={true}>");
			code139_nodes.forEach(detach);
			a42_nodes.forEach(detach);
			t594 = claim_text(li37_nodes, " affect the code output?");
			li37_nodes.forEach(detach);
			ul13_nodes.forEach(detach);
			section10_nodes.forEach(detach);
			t595 = claim_space(nodes);
			section11 = claim_element(nodes, "SECTION", {});
			var section11_nodes = children(section11);
			h23 = claim_element(section11_nodes, "H2", {});
			var h23_nodes = children(h23);
			a43 = claim_element(h23_nodes, "A", { href: true, id: true });
			var a43_nodes = children(a43);
			t596 = claim_text(a43_nodes, "The testing");
			a43_nodes.forEach(detach);
			h23_nodes.forEach(detach);
			t597 = claim_space(section11_nodes);
			p73 = claim_element(section11_nodes, "P", {});
			var p73_nodes = children(p73);
			t598 = claim_text(p73_nodes, "You've seen me implementing test cases in the previous \"Contributing to Svelte\" articles [");
			a44 = claim_element(p73_nodes, "A", { href: true });
			var a44_nodes = children(a44);
			t599 = claim_text(a44_nodes, "1");
			a44_nodes.forEach(detach);
			t600 = claim_text(p73_nodes, "] [");
			a45 = claim_element(p73_nodes, "A", { href: true });
			var a45_nodes = children(a45);
			t601 = claim_text(a45_nodes, "2");
			a45_nodes.forEach(detach);
			t602 = claim_text(p73_nodes, "], here I am going to skip showing the implementation of the test cases, and probably point out some thoughts I had when coming up with tests:");
			p73_nodes.forEach(detach);
			t603 = claim_space(section11_nodes);
			ol = claim_element(section11_nodes, "OL", {});
			var ol_nodes = children(ol);
			li38 = claim_element(ol_nodes, "LI", {});
			var li38_nodes = children(li38);
			p74 = claim_element(li38_nodes, "P", {});
			var p74_nodes = children(p74);
			strong16 = claim_element(p74_nodes, "STRONG", {});
			var strong16_nodes = children(strong16);
			t604 = claim_text(strong16_nodes, "Happy path:");
			strong16_nodes.forEach(detach);
			t605 = claim_text(p74_nodes, " changing the key expression should recreate the content");
			p74_nodes.forEach(detach);
			li38_nodes.forEach(detach);
			t606 = claim_space(ol_nodes);
			li39 = claim_element(ol_nodes, "LI", {});
			var li39_nodes = children(li39);
			p75 = claim_element(li39_nodes, "P", {});
			var p75_nodes = children(p75);
			strong17 = claim_element(p75_nodes, "STRONG", {});
			var strong17_nodes = children(strong17);
			t607 = claim_text(strong17_nodes, "Happy path:");
			strong17_nodes.forEach(detach);
			t608 = claim_text(p75_nodes, " Transition when recreating the content should work ✨");
			p75_nodes.forEach(detach);
			li39_nodes.forEach(detach);
			t609 = claim_space(ol_nodes);
			li40 = claim_element(ol_nodes, "LI", {});
			var li40_nodes = children(li40);
			p76 = claim_element(li40_nodes, "P", {});
			var p76_nodes = children(p76);
			strong18 = claim_element(p76_nodes, "STRONG", {});
			var strong18_nodes = children(strong18);
			t610 = claim_text(strong18_nodes, "Possible edge case:");
			strong18_nodes.forEach(detach);
			t611 = claim_text(p76_nodes, " Changing variables other than the key expression should ");
			strong19 = claim_element(p76_nodes, "STRONG", {});
			var strong19_nodes = children(strong19);
			t612 = claim_text(strong19_nodes, "not");
			strong19_nodes.forEach(detach);
			t613 = claim_text(p76_nodes, " recreate the content in ");
			code140 = claim_element(p76_nodes, "CODE", {});
			var code140_nodes = children(code140);
			t614 = claim_text(code140_nodes, "{#key}");
			code140_nodes.forEach(detach);
			p76_nodes.forEach(detach);
			t615 = claim_space(li40_nodes);
			pre32 = claim_element(li40_nodes, "PRE", { class: true });
			var pre32_nodes = children(pre32);
			pre32_nodes.forEach(detach);
			li40_nodes.forEach(detach);
			t616 = claim_space(ol_nodes);
			li41 = claim_element(ol_nodes, "LI", {});
			var li41_nodes = children(li41);
			p77 = claim_element(li41_nodes, "P", {});
			var p77_nodes = children(p77);
			strong20 = claim_element(p77_nodes, "STRONG", {});
			var strong20_nodes = children(strong20);
			t617 = claim_text(strong20_nodes, "Possible edge case:");
			strong20_nodes.forEach(detach);
			t618 = claim_text(p77_nodes, " Changing the variables within the key expression but the result value of the key expression stay the same");
			p77_nodes.forEach(detach);
			t619 = claim_space(li41_nodes);
			pre33 = claim_element(li41_nodes, "PRE", { class: true });
			var pre33_nodes = children(pre33);
			pre33_nodes.forEach(detach);
			li41_nodes.forEach(detach);
			ol_nodes.forEach(detach);
			section11_nodes.forEach(detach);
			t620 = claim_space(nodes);
			section12 = claim_element(nodes, "SECTION", {});
			var section12_nodes = children(section12);
			h24 = claim_element(section12_nodes, "H2", {});
			var h24_nodes = children(h24);
			a46 = claim_element(h24_nodes, "A", { href: true, id: true });
			var a46_nodes = children(a46);
			t621 = claim_text(a46_nodes, "Closing Notes");
			a46_nodes.forEach(detach);
			h24_nodes.forEach(detach);
			t622 = claim_space(section12_nodes);
			p78 = claim_element(section12_nodes, "P", {});
			var p78_nodes = children(p78);
			t623 = claim_text(p78_nodes, "You can read the ");
			a47 = claim_element(p78_nodes, "A", { href: true, rel: true });
			var a47_nodes = children(a47);
			t624 = claim_text(a47_nodes, "Pull Request #5397");
			a47_nodes.forEach(detach);
			t625 = claim_text(p78_nodes, " to read the final implementation.");
			p78_nodes.forEach(detach);
			t626 = claim_space(section12_nodes);
			hr2 = claim_element(section12_nodes, "HR", {});
			t627 = claim_space(section12_nodes);
			p79 = claim_element(section12_nodes, "P", {});
			var p79_nodes = children(p79);
			t628 = claim_text(p79_nodes, "If you wish to learn more about Svelte, ");
			a48 = claim_element(p79_nodes, "A", { href: true, rel: true });
			var a48_nodes = children(a48);
			t629 = claim_text(a48_nodes, "follow me on Twitter");
			a48_nodes.forEach(detach);
			t630 = claim_text(p79_nodes, ".");
			p79_nodes.forEach(detach);
			t631 = claim_space(section12_nodes);
			p80 = claim_element(section12_nodes, "P", {});
			var p80_nodes = children(p80);
			t632 = claim_text(p80_nodes, "If you have anything unclear about this article, find me on ");
			a49 = claim_element(p80_nodes, "A", { href: true, rel: true });
			var a49_nodes = children(a49);
			t633 = claim_text(a49_nodes, "Twitter");
			a49_nodes.forEach(detach);
			t634 = claim_text(p80_nodes, " too!");
			p80_nodes.forEach(detach);
			section12_nodes.forEach(detach);
			this.h();
		},
		h() {
			attr(a0, "href", "#background");
			attr(a1, "href", "#the-motivation");
			attr(a2, "href", "#transitions-for-reactive-data-change");
			attr(a3, "href", "#the-implementation");
			attr(a4, "href", "#parsing");
			attr(a5, "href", "#tracking-references-and-dependencies");
			attr(a6, "href", "#creating-code-blocks-fragments");
			attr(a7, "href", "#creating-code-for-ssr");
			attr(a8, "href", "#generate-code");
			attr(a9, "href", "#a-few-other-implementation-consideration");
			attr(a10, "href", "#the-testing");
			attr(a11, "href", "#closing-notes");
			attr(ul2, "class", "sitemap");
			attr(ul2, "id", "sitemap");
			attr(ul2, "role", "navigation");
			attr(ul2, "aria-label", "Table of Contents");
			attr(a12, "href", "#background");
			attr(a12, "id", "background");
			attr(a13, "href", "/contributing-to-svelte-fixing-issue-5012");
			attr(a14, "href", "/contributing-to-svelte-fixing-issue-4392");
			attr(a15, "href", "/the-svelte-compiler-handbook");
			attr(a16, "href", "/looking-into-the-svelte-compiler");
			attr(a17, "href", "#the-motivation");
			attr(a17, "id", "the-motivation");
			attr(a18, "href", "https://github.com/sveltejs/svelte/issues/1469");
			attr(a18, "rel", "nofollow");
			attr(pre0, "class", "language-svelte");
			attr(a19, "href", "https://svelte.dev/repl/1be3a0b123aa4384853ff5abd103f9ae");
			attr(a19, "rel", "nofollow");
			attr(a20, "href", "https://svelte.dev/tutorial/keyed-each-blocks");
			attr(a20, "rel", "nofollow");
			attr(a21, "href", "https://svelte.dev/repl/b1f5815f8b5f4634afa9025492739fa4");
			attr(a21, "rel", "nofollow");
			attr(a22, "href", "https://www.nikgraf.com/blog/using-reacts-key-attribute-to-remount-a-component");
			attr(a22, "rel", "nofollow");
			attr(pre1, "class", "language-svelte");
			attr(a23, "href", "#transitions-for-reactive-data-change");
			attr(a23, "id", "transitions-for-reactive-data-change");
			attr(a24, "href", "https://github.com/sveltejs/svelte/issues/5119");
			attr(a24, "rel", "nofollow");
			attr(pre2, "class", "language-svelte");
			attr(pre3, "class", "language-svelte");
			attr(pre4, "class", "language-null");
			attr(a25, "href", "#the-implementation");
			attr(a25, "id", "the-implementation");
			attr(a26, "href", "/the-svelte-compiler-handbook");
			attr(a27, "href", "#parsing");
			attr(a27, "id", "parsing");
			attr(a28, "href", "https://github.com/sveltejs/svelte/blob/82dc26a31c37906153e07686b73d3af08dd50154/src/compiler/parse/index.ts#L51");
			attr(a28, "rel", "nofollow");
			attr(pre5, "class", "language-js");
			attr(a29, "href", "https://github.com/sveltejs/svelte/blob/82dc26a31c37906153e07686b73d3af08dd50154/src/compiler/parse/state/mustache.ts#L35");
			attr(a29, "rel", "nofollow");
			attr(pre6, "class", "language-svelte");
			attr(pre7, "class", "language-diff-js");
			attr(pre8, "class", "language-diff-js");
			attr(pre9, "class", "language-js");
			attr(a30, "href", "#tracking-references-and-dependencies");
			attr(a30, "id", "tracking-references-and-dependencies");
			attr(pre10, "class", "language-js");
			attr(a31, "href", "https://github.com/sveltejs/svelte/blob/caebe0deb80d959ad7c7b5276d7e017be71769c7/src/compiler/compile/nodes/shared/Node.ts");
			attr(a31, "rel", "nofollow");
			attr(a32, "href", "https://github.com/sveltejs/svelte/blob/2b2f40d32ae36a94b77b69959494687073a3ebbc/src/compiler/compile/render_dom/wrappers/shared/Wrapper.ts#L7");
			attr(a32, "rel", "nofollow");
			attr(pre11, "class", "language-js");
			attr(pre12, "class", "language-js");
			attr(a33, "href", "#creating-code-blocks-fragments");
			attr(a33, "id", "creating-code-blocks-fragments");
			attr(a34, "href", "/compile-svelte-in-your-head-part-4");
			attr(pre13, "class", "language-js");
			attr(pre14, "class", "language-js");
			attr(pre15, "class", "language-js");
			attr(pre16, "class", "language-js");
			attr(pre17, "class", "language-js");
			attr(pre18, "class", "language-js");
			attr(a35, "href", "https://github.com/sveltejs/svelte/blob/8148a7a33444805320923e4c4e071f62dee3df6c/src/compiler/compile/render_dom/Block.ts#L118-L152");
			attr(a35, "rel", "nofollow");
			attr(pre19, "class", "language-js");
			attr(pre20, "class", "language-html");
			attr(pre21, "class", "language-js");
			attr(pre22, "class", "language-js");
			attr(a36, "href", "https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Template_literals#Tagged_templates");
			attr(a36, "rel", "nofollow");
			attr(a37, "href", "https://github.com/Rich-Harris/code-red");
			attr(a37, "rel", "nofollow");
			attr(pre23, "class", "language-js");
			attr(pre24, "class", "language-js");
			attr(pre25, "class", "language-js");
			attr(pre26, "class", "language-js");
			attr(pre27, "class", "language-js");
			attr(pre28, "class", "language-js");
			attr(a38, "href", "/compile-svelte-in-your-head-part-4/#the-extra-text-node");
			attr(pre29, "class", "language-js");
			attr(pre30, "class", "language-js");
			attr(a39, "href", "#creating-code-for-ssr");
			attr(a39, "id", "creating-code-for-ssr");
			attr(pre31, "class", "language-js");
			attr(a40, "href", "#generate-code");
			attr(a40, "id", "generate-code");
			attr(a41, "href", "#a-few-other-implementation-consideration");
			attr(a41, "id", "a-few-other-implementation-consideration");
			attr(a42, "href", "https://svelte.dev/docs#svelte_options");
			attr(a42, "rel", "nofollow");
			attr(a43, "href", "#the-testing");
			attr(a43, "id", "the-testing");
			attr(a44, "href", "/contributing-to-svelte-fixing-issue-5012");
			attr(a45, "href", "/contributing-to-svelte-fixing-issue-4392");
			attr(pre32, "class", "language-svelte");
			attr(pre33, "class", "language-svelte");
			attr(a46, "href", "#closing-notes");
			attr(a46, "id", "closing-notes");
			attr(a47, "href", "https://github.com/sveltejs/svelte/pull/5397");
			attr(a47, "rel", "nofollow");
			attr(a48, "href", "https://twitter.com/lihautan");
			attr(a48, "rel", "nofollow");
			attr(a49, "href", "https://twitter.com/lihautan");
			attr(a49, "rel", "nofollow");
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
			append(ul2, li3);
			append(li3, a3);
			append(a3, t3);
			append(ul2, ul1);
			append(ul1, li4);
			append(li4, a4);
			append(a4, t4);
			append(ul1, li5);
			append(li5, a5);
			append(a5, t5);
			append(ul1, li6);
			append(li6, a6);
			append(a6, t6);
			append(ul1, li7);
			append(li7, a7);
			append(a7, t7);
			append(ul1, li8);
			append(li8, a8);
			append(a8, t8);
			append(ul1, li9);
			append(li9, a9);
			append(a9, t9);
			append(ul2, li10);
			append(li10, a10);
			append(a10, t10);
			append(ul2, li11);
			append(li11, a11);
			append(a11, t11);
			insert(target, t12, anchor);
			insert(target, section1, anchor);
			append(section1, h20);
			append(h20, a12);
			append(a12, t13);
			append(section1, t14);
			append(section1, p0);
			append(p0, t15);
			append(p0, a13);
			append(a13, t16);
			append(p0, t17);
			append(p0, a14);
			append(a14, t18);
			append(p0, t19);
			append(p0, code0);
			append(code0, t20);
			append(p0, t21);
			append(section1, t22);
			append(section1, p1);
			append(p1, t23);
			append(p1, code1);
			append(code1, t24);
			append(p1, t25);
			append(p1, code2);
			append(code2, t26);
			append(p1, t27);
			append(p1, code3);
			append(code3, t28);
			append(p1, t29);
			append(p1, code4);
			append(code4, t30);
			append(p1, t31);
			append(p1, code5);
			append(code5, t32);
			append(p1, t33);
			append(p1, a15);
			append(a15, t34);
			append(p1, t35);
			append(p1, a16);
			append(a16, t36);
			append(p1, t37);
			insert(target, t38, anchor);
			insert(target, section2, anchor);
			append(section2, h21);
			append(h21, a17);
			append(a17, t39);
			append(section2, t40);
			append(section2, p2);
			append(p2, t41);
			append(p2, code6);
			append(code6, t42);
			append(p2, t43);
			append(p2, em0);
			append(em0, t44);
			append(p2, t45);
			append(p2, strong0);
			append(strong0, t46);
			append(p2, t47);
			append(p2, a18);
			append(a18, t48);
			append(p2, t49);
			append(section2, t50);
			append(section2, p3);
			append(p3, t51);
			append(p3, code7);
			append(code7, t52);
			append(p3, t53);
			append(p3, code8);
			append(code8, t54);
			append(p3, t55);
			append(section2, t56);
			append(section2, p4);
			append(p4, t57);
			append(p4, code9);
			append(code9, t58);
			append(p4, t59);
			append(p4, code10);
			append(code10, t60);
			append(p4, t61);
			append(section2, t62);
			append(section2, pre0);
			pre0.innerHTML = raw0_value;
			append(section2, t63);
			append(section2, p5);
			append(p5, a19);
			append(a19, t64);
			append(section2, t65);
			append(section2, p6);
			append(p6, t66);
			append(p6, code11);
			append(code11, t67);
			append(p6, t68);
			append(p6, code12);
			append(code12, t69);
			append(p6, t70);
			append(p6, code13);
			append(code13, t71);
			append(p6, t72);
			append(p6, code14);
			append(code14, t73);
			append(p6, t74);
			append(p6, code15);
			append(code15, t75);
			append(p6, t76);
			append(p6, code16);
			append(code16, t77);
			append(p6, t78);
			append(p6, code17);
			append(code17, t79);
			append(p6, t80);
			append(p6, code18);
			append(code18, t81);
			append(p6, t82);
			append(p6, code19);
			append(code19, t83);
			append(p6, t84);
			append(p6, code20);
			append(code20, t85);
			append(p6, t86);
			append(p6, a20);
			append(a20, t87);
			append(a20, code21);
			append(code21, t88);
			append(a20, t89);
			append(p6, t90);
			append(p6, code22);
			append(code22, t91);
			append(p6, t92);
			append(p6, code23);
			append(code23, t93);
			append(p6, t94);
			append(section2, t95);
			append(section2, p7);
			append(p7, t96);
			append(p7, code24);
			append(code24, t97);
			append(p7, t98);
			append(p7, code25);
			append(code25, t99);
			append(p7, t100);
			append(p7, code26);
			append(code26, t101);
			append(p7, t102);
			append(section2, t103);
			append(section2, p8);
			append(p8, a21);
			append(a21, t104);
			append(a21, code27);
			append(code27, t105);
			append(a21, t106);
			append(p8, t107);
			append(p8, code28);
			append(code28, t108);
			append(p8, t109);
			append(section2, t110);
			append(section2, blockquote0);
			append(blockquote0, p9);
			append(p9, t111);
			append(p9, code29);
			append(code29, t112);
			append(p9, t113);
			append(p9, a22);
			append(a22, t114);
			append(a22, code30);
			append(code30, t115);
			append(a22, t116);
			append(p9, t117);
			append(section2, t118);
			append(section2, p10);
			append(p10, t119);
			append(p10, code31);
			append(code31, t120);
			append(p10, t121);
			append(p10, code32);
			append(code32, t122);
			append(p10, t123);
			append(p10, strong1);
			append(strong1, t124);
			append(p10, t125);
			append(section2, t126);
			append(section2, pre1);
			pre1.innerHTML = raw1_value;
			append(section2, t127);
			append(section2, p11);
			append(p11, t128);
			append(p11, code33);
			append(code33, t129);
			append(p11, t130);
			append(p11, code34);
			append(code34, t131);
			append(p11, t132);
			insert(target, t133, anchor);
			insert(target, section3, anchor);
			append(section3, h30);
			append(h30, a23);
			append(a23, t134);
			append(section3, t135);
			append(section3, p12);
			append(p12, t136);
			append(p12, strong2);
			append(strong2, t137);
			append(strong2, code35);
			append(code35, t138);
			append(strong2, t139);
			append(p12, t140);
			append(p12, a24);
			append(a24, t141);
			append(p12, t142);
			append(section3, t143);
			append(section3, pre2);
			pre2.innerHTML = raw2_value;
			append(section3, t144);
			append(section3, p13);
			append(p13, t145);
			append(section3, t146);
			append(section3, p14);
			append(p14, t147);
			append(p14, code36);
			append(code36, t148);
			append(p14, t149);
			append(section3, t150);
			append(section3, p15);
			append(p15, t151);
			append(p15, strong3);
			append(strong3, t152);
			append(p15, t153);
			append(section3, t154);
			append(section3, pre3);
			pre3.innerHTML = raw3_value;
			append(section3, t155);
			append(section3, p16);
			append(p16, t156);
			append(p16, code37);
			append(code37, t157);
			append(p16, t158);
			append(section3, t159);
			append(section3, pre4);
			pre4.innerHTML = raw4_value;
			append(section3, t160);
			append(section3, p17);
			append(p17, t161);
			append(p17, code38);
			append(code38, t162);
			append(p17, t163);
			insert(target, t164, anchor);
			insert(target, section4, anchor);
			append(section4, h22);
			append(h22, a25);
			append(a25, t165);
			append(section4, t166);
			append(section4, p18);
			append(p18, t167);
			append(p18, a26);
			append(a26, t168);
			append(p18, t169);
			append(section4, t170);
			append(section4, ul3);
			append(ul3, li12);
			append(li12, t171);
			append(ul3, t172);
			append(ul3, li13);
			append(li13, t173);
			append(ul3, t174);
			append(ul3, li14);
			append(li14, t175);
			append(ul3, t176);
			append(ul3, li15);
			append(li15, t177);
			append(section4, t178);
			append(section4, p19);
			append(p19, t179);
			insert(target, t180, anchor);
			insert(target, section5, anchor);
			append(section5, h31);
			append(h31, a27);
			append(a27, t181);
			append(section5, t182);
			append(section5, p20);
			append(p20, t183);
			append(p20, a28);
			append(a28, t184);
			append(p20, t185);
			append(section5, t186);
			append(section5, pre5);
			pre5.innerHTML = raw5_value;
			append(section5, t187);
			append(section5, p21);
			append(p21, t188);
			append(section5, t189);
			append(section5, ul4);
			append(ul4, li16);
			append(li16, strong4);
			append(strong4, t190);
			append(li16, t191);
			append(ul4, t192);
			append(ul4, li17);
			append(li17, strong5);
			append(strong5, t193);
			append(li17, t194);
			append(li17, code39);
			append(code39, t195);
			append(li17, t196);
			append(li17, code40);
			append(code40, t197);
			append(li17, t198);
			append(li17, code41);
			append(code41, t199);
			append(li17, t200);
			append(li17, code42);
			append(code42, t201);
			append(li17, t202);
			append(ul4, t203);
			append(ul4, li18);
			append(li18, strong6);
			append(strong6, t204);
			append(li18, t205);
			append(li18, code43);
			append(code43, t206);
			append(li18, t207);
			append(li18, code44);
			append(code44, t208);
			append(li18, t209);
			append(li18, code45);
			append(code45, t210);
			append(ul4, t211);
			append(ul4, li19);
			append(li19, strong7);
			append(strong7, t212);
			append(li19, t213);
			append(li19, code46);
			append(code46, t214);
			append(li19, t215);
			append(li19, code47);
			append(code47, t216);
			append(li19, t217);
			append(section5, t218);
			append(section5, p22);
			append(p22, t219);
			append(p22, code48);
			append(code48, t220);
			append(p22, t221);
			append(p22, a29);
			append(a29, strong8);
			append(strong8, t222);
			append(a29, t223);
			append(p22, t224);
			append(section5, t225);
			append(section5, p23);
			append(p23, t226);
			append(p23, code49);
			append(code49, t227);
			append(p23, t228);
			append(p23, code50);
			append(code50, t229);
			append(p23, t230);
			append(p23, code51);
			append(code51, t231);
			append(p23, t232);
			append(section5, t233);
			append(section5, pre6);
			pre6.innerHTML = raw6_value;
			append(section5, t234);
			append(section5, p24);
			append(p24, t235);
			append(p24, code52);
			append(code52, t236);
			append(p24, t237);
			append(p24, code53);
			append(code53, t238);
			append(p24, t239);
			append(section5, t240);
			append(section5, pre7);
			pre7.innerHTML = raw7_value;
			append(section5, t241);
			append(section5, p25);
			append(p25, t242);
			append(p25, code54);
			append(code54, t243);
			append(p25, t244);
			append(p25, code55);
			append(code55, t245);
			append(p25, t246);
			append(p25, code56);
			append(code56, t247);
			append(p25, t248);
			append(section5, t249);
			append(section5, pre8);
			pre8.innerHTML = raw8_value;
			append(section5, t250);
			append(section5, p26);
			append(p26, t251);
			append(p26, code57);
			append(code57, t252);
			append(p26, t253);
			append(p26, code58);
			append(code58, t254);
			append(p26, t255);
			append(p26, code59);
			append(code59, t256);
			append(p26, t257);
			append(p26, code60);
			append(code60, t258);
			append(p26, t259);
			append(section5, t260);
			append(section5, pre9);
			pre9.innerHTML = raw9_value;
			append(section5, t261);
			append(section5, p27);
			append(p27, t262);
			insert(target, t263, anchor);
			insert(target, section6, anchor);
			append(section6, h32);
			append(h32, a30);
			append(a30, t264);
			append(section6, t265);
			append(section6, p28);
			append(p28, t266);
			append(p28, code61);
			append(code61, t267);
			append(p28, t268);
			append(p28, code62);
			append(code62, t269);
			append(p28, t270);
			append(section6, t271);
			append(section6, p29);
			append(p29, t272);
			append(p29, code63);
			append(code63, t273);
			append(p29, t274);
			append(p29, code64);
			append(code64, t275);
			append(p29, t276);
			append(section6, t277);
			append(section6, pre10);
			pre10.innerHTML = raw10_value;
			append(section6, t278);
			append(section6, p30);
			append(p30, t279);
			append(section6, t280);
			append(section6, p31);
			append(p31, t281);
			append(section6, t282);
			append(section6, ul5);
			append(ul5, li20);
			append(li20, code65);
			append(code65, t283);
			append(li20, t284);
			append(ul5, t285);
			append(ul5, li21);
			append(li21, t286);
			append(li21, code66);
			append(code66, t287);
			append(li21, t288);
			append(li21, code67);
			append(code67, t289);
			append(li21, t290);
			append(ul5, t291);
			append(ul5, li22);
			append(li22, code68);
			append(code68, t292);
			append(li22, t293);
			append(li22, code69);
			append(code69, t294);
			append(li22, t295);
			append(li22, code70);
			append(code70, t296);
			append(li22, t297);
			append(section6, t298);
			append(section6, blockquote1);
			append(blockquote1, p32);
			append(p32, t299);
			append(blockquote1, t300);
			append(blockquote1, p33);
			append(p33, t301);
			append(blockquote1, t302);
			append(blockquote1, p34);
			append(p34, t303);
			append(blockquote1, t304);
			append(blockquote1, ul6);
			append(ul6, li23);
			append(li23, t305);
			append(li23, strong9);
			append(strong9, t306);
			append(ul6, t307);
			append(ul6, li24);
			append(li24, t308);
			append(li24, code71);
			append(code71, t309);
			append(li24, t310);
			append(li24, a31);
			append(a31, code72);
			append(code72, t311);
			append(li24, t312);
			append(li24, strong10);
			append(strong10, t313);
			append(li24, t314);
			append(li24, em1);
			append(em1, t315);
			append(em1, code73);
			append(code73, t316);
			append(em1, t317);
			append(ul6, t318);
			append(ul6, li25);
			append(li25, t319);
			append(li25, code74);
			append(code74, t320);
			append(li25, t321);
			append(li25, a32);
			append(a32, code75);
			append(code75, t322);
			append(li25, t323);
			append(li25, strong11);
			append(strong11, t324);
			append(li25, t325);
			append(li25, em2);
			append(em2, t326);
			append(em2, code76);
			append(code76, t327);
			append(em2, t328);
			append(section6, t329);
			append(section6, p35);
			append(p35, t330);
			append(section6, t331);
			append(section6, p36);
			append(p36, t332);
			append(p36, code77);
			append(code77, t333);
			append(p36, t334);
			append(p36, code78);
			append(code78, t335);
			append(p36, t336);
			append(section6, t337);
			append(section6, pre11);
			pre11.innerHTML = raw11_value;
			append(section6, t338);
			append(section6, p37);
			append(p37, t339);
			append(p37, code79);
			append(code79, t340);
			append(p37, t341);
			append(p37, code80);
			append(code80, t342);
			append(p37, t343);
			append(section6, t344);
			append(section6, pre12);
			pre12.innerHTML = raw12_value;
			append(section6, t345);
			append(section6, p38);
			append(p38, t346);
			append(p38, strong12);
			append(strong12, t347);
			append(p38, t348);
			append(p38, code81);
			append(code81, t349);
			append(p38, t350);
			insert(target, t351, anchor);
			insert(target, section7, anchor);
			append(section7, h33);
			append(h33, a33);
			append(a33, t352);
			append(section7, t353);
			append(section7, p39);
			append(p39, t354);
			append(p39, strong13);
			append(strong13, t355);
			append(p39, t356);
			append(section7, t357);
			append(section7, p40);
			append(p40, t358);
			append(p40, a34);
			append(a34, t359);
			append(p40, t360);
			append(p40, code82);
			append(code82, t361);
			append(p40, t362);
			append(section7, t363);
			append(section7, p41);
			append(p41, t364);
			append(p41, code83);
			append(code83, t365);
			append(p41, t366);
			append(p41, code84);
			append(code84, t367);
			append(p41, t368);
			append(section7, t369);
			append(section7, pre13);
			pre13.innerHTML = raw13_value;
			append(section7, t370);
			append(section7, p42);
			append(p42, t371);
			append(p42, code85);
			append(code85, t372);
			append(p42, t373);
			append(section7, t374);
			append(section7, pre14);
			pre14.innerHTML = raw14_value;
			append(section7, t375);
			append(section7, p43);
			append(p43, t376);
			append(section7, t377);
			append(section7, pre15);
			pre15.innerHTML = raw15_value;
			append(section7, t378);
			append(section7, p44);
			append(p44, t379);
			append(p44, code86);
			append(code86, t380);
			append(p44, t381);
			append(section7, t382);
			append(section7, ul7);
			append(ul7, li26);
			append(li26, t383);
			append(ul7, t384);
			append(ul7, li27);
			append(li27, t385);
			append(li27, code87);
			append(code87, t386);
			append(li27, t387);
			append(section7, t388);
			append(section7, pre16);
			pre16.innerHTML = raw16_value;
			append(section7, t389);
			append(section7, p45);
			append(p45, t390);
			append(p45, code88);
			append(code88, t391);
			append(p45, t392);
			append(section7, t393);
			append(section7, pre17);
			pre17.innerHTML = raw17_value;
			append(section7, t394);
			append(section7, p46);
			append(p46, t395);
			append(p46, code89);
			append(code89, t396);
			append(p46, t397);
			append(p46, code90);
			append(code90, t398);
			append(p46, t399);
			append(section7, t400);
			append(section7, p47);
			append(p47, t401);
			append(p47, code91);
			append(code91, t402);
			append(p47, t403);
			append(section7, t404);
			append(section7, p48);
			append(p48, t405);
			append(p48, code92);
			append(code92, t406);
			append(p48, t407);
			append(section7, t408);
			append(section7, pre18);
			pre18.innerHTML = raw18_value;
			append(section7, t409);
			append(section7, p49);
			append(p49, t410);
			append(section7, t411);
			append(section7, ul10);
			append(ul10, li30);
			append(li30, t412);
			append(li30, code93);
			append(code93, t413);
			append(li30, t414);
			append(li30, code94);
			append(code94, t415);
			append(li30, t416);
			append(li30, code95);
			append(code95, t417);
			append(li30, t418);
			append(li30, code96);
			append(code96, t419);
			append(li30, t420);
			append(li30, code97);
			append(code97, t421);
			append(li30, t422);
			append(li30, code98);
			append(code98, t423);
			append(li30, t424);
			append(li30, code99);
			append(code99, t425);
			append(li30, t426);
			append(li30, ul8);
			append(ul8, li28);
			append(li28, t427);
			append(li28, code100);
			append(code100, t428);
			append(li28, t429);
			append(li28, code101);
			append(code101, t430);
			append(ul8, t431);
			append(ul8, li29);
			append(li29, t432);
			append(li29, code102);
			append(code102, t433);
			append(ul10, t434);
			append(ul10, li32);
			append(li32, t435);
			append(li32, strong14);
			append(strong14, t436);
			append(li32, t437);
			append(li32, code103);
			append(code103, t438);
			append(li32, t439);
			append(li32, strong15);
			append(strong15, t440);
			append(li32, t441);
			append(li32, ul9);
			append(ul9, li31);
			append(li31, t442);
			append(li31, code104);
			append(code104, t443);
			append(li31, t444);
			append(li31, a35);
			append(a35, t445);
			append(section7, t446);
			append(section7, p50);
			append(p50, t447);
			append(p50, code105);
			append(code105, t448);
			append(p50, t449);
			append(section7, t450);
			append(section7, p51);
			append(p51, t451);
			append(p51, code106);
			append(code106, t452);
			append(p51, t453);
			append(section7, t454);
			append(section7, pre19);
			pre19.innerHTML = raw19_value;
			append(section7, t455);
			append(section7, p52);
			append(p52, t456);
			append(p52, code107);
			append(code107, t457);
			append(p52, t458);
			append(p52, code108);
			append(code108, t459);
			append(p52, t460);
			append(p52, code109);
			append(code109, t461);
			append(p52, t462);
			append(p52, code110);
			append(code110, t463);
			append(p52, t464);
			append(p52, code111);
			append(code111, t465);
			append(p52, t466);
			append(section7, t467);
			append(section7, hr0);
			append(section7, t468);
			append(section7, p53);
			append(p53, t469);
			append(p53, code112);
			append(code112, t470);
			append(p53, t471);
			append(p53, code113);
			append(code113, t472);
			append(p53, t473);
			append(section7, t474);
			append(section7, pre20);
			pre20.innerHTML = raw20_value;
			append(section7, t475);
			append(section7, p54);
			append(p54, t476);
			append(p54, code114);
			append(code114, t477);
			append(p54, t478);
			append(section7, t479);
			append(section7, pre21);
			pre21.innerHTML = raw21_value;
			append(section7, t480);
			append(section7, p55);
			append(p55, t481);
			append(p55, code115);
			append(code115, t482);
			append(p55, t483);
			append(p55, code116);
			append(code116, t484);
			append(p55, t485);
			append(p55, code117);
			append(code117, t486);
			append(p55, t487);
			append(section7, t488);
			append(section7, hr1);
			append(section7, t489);
			append(section7, p56);
			append(p56, t490);
			append(section7, t491);
			append(section7, pre22);
			pre22.innerHTML = raw22_value;
			append(section7, t492);
			append(section7, p57);
			append(p57, t493);
			append(section7, t494);
			append(section7, ul12);
			append(ul12, li33);
			append(li33, t495);
			append(li33, code118);
			append(code118, t496);
			append(li33, t497);
			append(li33, code119);
			append(code119, t498);
			append(li33, t499);
			append(li33, code120);
			append(code120, t500);
			append(li33, t501);
			append(li33, code121);
			append(code121, t502);
			append(li33, t503);
			append(ul12, t504);
			append(ul12, li35);
			append(li35, t505);
			append(li35, a36);
			append(a36, t506);
			append(li35, t507);
			append(li35, code122);
			append(code122, t508);
			append(li35, t509);
			append(li35, code123);
			append(code123, t510);
			append(li35, t511);
			append(li35, ul11);
			append(ul11, li34);
			append(li34, t512);
			append(li34, code124);
			append(code124, t513);
			append(li34, t514);
			append(li34, a37);
			append(a37, t515);
			append(section7, t516);
			append(section7, p58);
			append(p58, t517);
			append(p58, code125);
			append(code125, t518);
			append(section7, t519);
			append(section7, pre23);
			pre23.innerHTML = raw23_value;
			append(section7, t520);
			append(section7, p59);
			append(p59, t521);
			append(p59, code126);
			append(code126, t522);
			append(p59, t523);
			append(section7, t524);
			append(section7, p60);
			append(p60, t525);
			append(section7, t526);
			append(section7, pre24);
			pre24.innerHTML = raw24_value;
			append(section7, t527);
			append(section7, p61);
			append(p61, t528);
			append(p61, code127);
			append(code127, t529);
			append(p61, t530);
			append(section7, t531);
			append(section7, pre25);
			pre25.innerHTML = raw25_value;
			append(section7, t532);
			append(section7, p62);
			append(p62, code128);
			append(code128, t533);
			append(p62, t534);
			append(p62, code129);
			append(code129, t535);
			append(p62, t536);
			append(section7, t537);
			append(section7, pre26);
			pre26.innerHTML = raw26_value;
			append(section7, t538);
			append(section7, p63);
			append(p63, t539);
			append(p63, code130);
			append(code130, t540);
			append(p63, t541);
			append(section7, t542);
			append(section7, pre27);
			pre27.innerHTML = raw27_value;
			append(section7, t543);
			append(section7, p64);
			append(p64, t544);
			append(section7, t545);
			append(section7, pre28);
			pre28.innerHTML = raw28_value;
			append(section7, t546);
			append(section7, p65);
			append(p65, t547);
			append(p65, code131);
			append(code131, t548);
			append(p65, t549);
			append(p65, code132);
			append(code132, t550);
			append(p65, t551);
			append(p65, a38);
			append(a38, t552);
			append(p65, t553);
			append(section7, t554);
			append(section7, pre29);
			pre29.innerHTML = raw29_value;
			append(section7, t555);
			append(section7, p66);
			append(p66, t556);
			append(p66, code133);
			append(code133, t557);
			append(p66, t558);
			append(section7, t559);
			append(section7, p67);
			append(p67, t560);
			append(section7, t561);
			append(section7, pre30);
			pre30.innerHTML = raw30_value;
			append(section7, t562);
			append(section7, p68);
			append(p68, t563);
			insert(target, t564, anchor);
			insert(target, section8, anchor);
			append(section8, h34);
			append(h34, a39);
			append(a39, t565);
			append(section8, t566);
			append(section8, p69);
			append(p69, t567);
			append(p69, code134);
			append(code134, t568);
			append(p69, t569);
			append(p69, code135);
			append(code135, t570);
			append(p69, t571);
			append(section8, t572);
			append(section8, pre31);
			pre31.innerHTML = raw31_value;
			append(section8, t573);
			append(section8, p70);
			append(p70, t574);
			append(p70, code136);
			append(code136, t575);
			append(p70, t576);
			append(p70, code137);
			append(code137, t577);
			append(p70, t578);
			insert(target, t579, anchor);
			insert(target, section9, anchor);
			append(section9, h35);
			append(h35, a40);
			append(a40, t580);
			append(section9, t581);
			append(section9, p71);
			append(p71, t582);
			append(section9, t583);
			append(section9, p72);
			append(p72, t584);
			insert(target, t585, anchor);
			insert(target, section10, anchor);
			append(section10, h36);
			append(h36, a41);
			append(a41, t586);
			append(section10, t587);
			append(section10, ul13);
			append(ul13, li36);
			append(li36, t588);
			append(li36, code138);
			append(code138, t589);
			append(li36, t590);
			append(ul13, t591);
			append(ul13, li37);
			append(li37, t592);
			append(li37, a42);
			append(a42, code139);
			append(code139, t593);
			append(li37, t594);
			insert(target, t595, anchor);
			insert(target, section11, anchor);
			append(section11, h23);
			append(h23, a43);
			append(a43, t596);
			append(section11, t597);
			append(section11, p73);
			append(p73, t598);
			append(p73, a44);
			append(a44, t599);
			append(p73, t600);
			append(p73, a45);
			append(a45, t601);
			append(p73, t602);
			append(section11, t603);
			append(section11, ol);
			append(ol, li38);
			append(li38, p74);
			append(p74, strong16);
			append(strong16, t604);
			append(p74, t605);
			append(ol, t606);
			append(ol, li39);
			append(li39, p75);
			append(p75, strong17);
			append(strong17, t607);
			append(p75, t608);
			append(ol, t609);
			append(ol, li40);
			append(li40, p76);
			append(p76, strong18);
			append(strong18, t610);
			append(p76, t611);
			append(p76, strong19);
			append(strong19, t612);
			append(p76, t613);
			append(p76, code140);
			append(code140, t614);
			append(li40, t615);
			append(li40, pre32);
			pre32.innerHTML = raw32_value;
			append(ol, t616);
			append(ol, li41);
			append(li41, p77);
			append(p77, strong20);
			append(strong20, t617);
			append(p77, t618);
			append(li41, t619);
			append(li41, pre33);
			pre33.innerHTML = raw33_value;
			insert(target, t620, anchor);
			insert(target, section12, anchor);
			append(section12, h24);
			append(h24, a46);
			append(a46, t621);
			append(section12, t622);
			append(section12, p78);
			append(p78, t623);
			append(p78, a47);
			append(a47, t624);
			append(p78, t625);
			append(section12, t626);
			append(section12, hr2);
			append(section12, t627);
			append(section12, p79);
			append(p79, t628);
			append(p79, a48);
			append(a48, t629);
			append(p79, t630);
			append(section12, t631);
			append(section12, p80);
			append(p80, t632);
			append(p80, a49);
			append(a49, t633);
			append(p80, t634);
		},
		p: noop,
		d(detaching) {
			if (detaching) detach(section0);
			if (detaching) detach(t12);
			if (detaching) detach(section1);
			if (detaching) detach(t38);
			if (detaching) detach(section2);
			if (detaching) detach(t133);
			if (detaching) detach(section3);
			if (detaching) detach(t164);
			if (detaching) detach(section4);
			if (detaching) detach(t180);
			if (detaching) detach(section5);
			if (detaching) detach(t263);
			if (detaching) detach(section6);
			if (detaching) detach(t351);
			if (detaching) detach(section7);
			if (detaching) detach(t564);
			if (detaching) detach(section8);
			if (detaching) detach(t579);
			if (detaching) detach(section9);
			if (detaching) detach(t585);
			if (detaching) detach(section10);
			if (detaching) detach(t595);
			if (detaching) detach(section11);
			if (detaching) detach(t620);
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
	"title": "Contributing to Svelte - Implement {#key}",
	"date": "2020-09-27T08:00:00Z",
	"tags": ["Svelte", "JavaScript", "Open Source"],
	"series": "Contributing to Svelte",
	"description": "I am going to share an anecdote on how I implemented {#key} logic block in Svelte",
	"slug": "contributing-to-svelte-implement-key-block",
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
