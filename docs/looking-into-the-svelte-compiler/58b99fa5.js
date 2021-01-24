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

var image = "https://lihautan.com/looking-into-the-svelte-compiler/assets/hero-twitter-bcb1536f.jpg";

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
			attr(span, "class", "svelte-hvyckn");
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
			attr(div, "class", "venue svelte-hvyckn");
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
			attr(a, "class", "svelte-hvyckn");
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
			attr(a, "class", "svelte-hvyckn");
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
					"@id": "https%3A%2F%2Flihautan.com%2Flooking-into-the-svelte-compiler",
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
			attr(meta11, "content", "https%3A%2F%2Flihautan.com%2Flooking-into-the-svelte-compiler");
			attr(meta12, "itemprop", "image");
			attr(meta12, "content", image);
			html_tag = new HtmlTag(html_anchor);
			html_tag_1 = new HtmlTag(html_anchor_1);
			attr(a, "href", "#content");
			attr(a, "class", "skip svelte-hvyckn");
			attr(main, "id", "content");
			attr(main, "class", "blog svelte-hvyckn");
			attr(footer, "class", "svelte-hvyckn");
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
							"@id": "https%3A%2F%2Flihautan.com%2Flooking-into-the-svelte-compiler",
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

/* content/talk/looking-into-the-svelte-compiler/@@page-markup.svelte generated by Svelte v3.24.0 */

function create_default_slot(ctx) {
	let section0;
	let ul1;
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
	let t5;
	let section1;
	let h20;
	let a5;
	let t6;
	let t7;
	let section2;
	let h30;
	let a6;
	let t8;
	let t9;
	let iframe0;
	let iframe0_src_value;
	let t10;
	let section3;
	let h31;
	let a7;
	let t11;
	let t12;
	let iframe1;
	let iframe1_src_value;
	let t13;
	let section4;
	let h21;
	let a8;
	let t14;
	let t15;
	let p0;
	let t16;
	let a9;
	let t17;
	let t18;
	let t19;
	let section5;
	let h22;
	let a10;
	let t20;
	let t21;
	let p1;
	let t22;
	let strong0;
	let t23;
	let t24;
	let t25;
	let p2;
	let t26;
	let t27;
	let p3;
	let t28;
	let t29;
	let p4;
	let t30;
	let t31;
	let p5;
	let strong1;
	let t32;
	let t33;
	let p6;
	let t34;
	let code0;
	let t35;
	let t36;
	let t37;
	let p7;
	let t38;
	let t39;
	let p8;
	let t40;
	let code1;
	let t41;
	let t42;
	let t43;
	let p9;
	let t44;
	let t45;
	let p10;
	let t46;
	let t47;
	let p11;
	let t48;
	let strong2;
	let t49;
	let t50;
	let t51;
	let p12;
	let t52;
	let code2;
	let t53;
	let t54;
	let t55;
	let p13;
	let t56;
	let t57;
	let p14;
	let t58;
	let t59;
	let p15;
	let t60;
	let strong3;
	let t61;
	let t62;
	let strong4;
	let t63;
	let t64;
	let t65;
	let p16;
	let t66;
	let t67;
	let p17;
	let t68;
	let t69;
	let p18;
	let t70;
	let t71;
	let p19;
	let t72;
	let t73;
	let p20;
	let t74;
	let t75;
	let p21;
	let t76;
	let t77;
	let p22;
	let t78;
	let code3;
	let t79;
	let t80;
	let t81;
	let p23;
	let t82;
	let t83;
	let p24;
	let t84;
	let code4;
	let t85;
	let t86;
	let t87;
	let p25;
	let t88;
	let t89;
	let p26;
	let strong5;
	let t90;
	let t91;
	let t92;
	let p27;
	let t93;
	let code5;
	let t94;
	let t95;
	let code6;
	let t96;
	let t97;
	let code7;
	let t98;
	let t99;
	let code8;
	let t100;
	let t101;
	let code9;
	let t102;
	let t103;
	let t104;
	let p28;
	let t105;
	let t106;
	let p29;
	let t107;
	let t108;
	let p30;
	let t109;
	let strong6;
	let t110;
	let t111;
	let p31;
	let em0;
	let t112;
	let t113;
	let p32;
	let t114;
	let t115;
	let p33;
	let t116;
	let t117;
	let p34;
	let t118;
	let t119;
	let p35;
	let t120;
	let t121;
	let p36;
	let t122;
	let t123;
	let p37;
	let t124;
	let t125;
	let p38;
	let t126;
	let t127;
	let p39;
	let em1;
	let t128;
	let t129;
	let p40;
	let t130;
	let t131;
	let p41;
	let t132;
	let strong7;
	let t133;
	let t134;
	let t135;
	let p42;
	let t136;
	let t137;
	let p43;
	let t138;
	let t139;
	let p44;
	let t140;
	let t141;
	let p45;
	let t142;
	let t143;
	let p46;
	let em2;
	let t144;
	let t145;
	let p47;
	let t146;
	let strong8;
	let t147;
	let t148;
	let p48;
	let t149;
	let t150;
	let p49;
	let em3;
	let t151;
	let t152;
	let p50;
	let t153;
	let strong9;
	let code10;
	let t154;
	let t155;
	let strong10;
	let code11;
	let t156;
	let t157;
	let strong11;
	let code12;
	let t158;
	let t159;
	let t160;
	let p51;
	let t161;
	let code13;
	let t162;
	let t163;
	let t164;
	let p52;
	let t165;
	let code14;
	let t166;
	let t167;
	let code15;
	let t168;
	let t169;
	let code16;
	let t170;
	let t171;
	let t172;
	let p53;
	let t173;
	let t174;
	let p54;
	let t175;
	let t176;
	let p55;
	let t177;
	let t178;
	let p56;
	let t179;
	let t180;
	let p57;
	let t181;
	let t182;
	let p58;
	let t183;
	let t184;
	let p59;
	let t185;
	let t186;
	let p60;
	let t187;
	let t188;
	let p61;
	let t189;
	let t190;
	let p62;
	let t191;
	let t192;
	let p63;
	let t193;
	let t194;
	let p64;
	let t195;
	let t196;
	let p65;
	let t197;
	let t198;
	let p66;
	let t199;
	let t200;
	let p67;
	let t201;
	let t202;
	let p68;
	let t203;
	let t204;
	let p69;
	let t205;
	let t206;
	let p70;
	let t207;
	let t208;
	let p71;
	let t209;
	let t210;
	let p72;
	let t211;
	let t212;
	let p73;
	let t213;
	let t214;
	let p74;
	let t215;
	let t216;
	let p75;
	let t217;
	let t218;
	let p76;
	let t219;
	let t220;
	let p77;
	let t221;
	let t222;
	let p78;
	let t223;
	let t224;
	let p79;
	let t225;
	let t226;
	let p80;
	let t227;
	let t228;
	let p81;
	let t229;
	let t230;
	let p82;
	let t231;
	let t232;
	let p83;
	let t233;
	let t234;
	let p84;
	let t235;
	let t236;
	let p85;
	let t237;
	let code17;
	let t238;
	let t239;
	let t240;
	let p86;
	let t241;
	let t242;
	let p87;
	let t243;
	let t244;
	let p88;
	let t245;
	let code18;
	let t246;
	let t247;
	let t248;
	let p89;
	let t249;
	let t250;
	let p90;
	let t251;
	let code19;
	let t252;
	let t253;
	let code20;
	let t254;
	let t255;
	let t256;
	let p91;
	let t257;
	let code21;
	let t258;
	let t259;
	let code22;
	let t260;
	let t261;
	let t262;
	let p92;
	let t263;
	let code23;
	let t264;
	let t265;
	let code24;
	let t266;
	let t267;
	let code25;
	let t268;
	let t269;
	let code26;
	let t270;
	let t271;
	let code27;
	let t272;
	let t273;
	let t274;
	let p93;
	let t275;
	let t276;
	let p94;
	let t277;
	let code28;
	let t278;
	let t279;
	let code29;
	let t280;
	let t281;
	let t282;
	let p95;
	let t283;
	let t284;
	let p96;
	let t285;
	let t286;
	let p97;
	let t287;
	let t288;
	let p98;
	let t289;
	let t290;
	let p99;
	let t291;
	let t292;
	let p100;
	let t293;
	let t294;
	let p101;
	let t295;
	let t296;
	let p102;
	let t297;
	let t298;
	let p103;
	let t299;
	let t300;
	let p104;
	let t301;
	let code30;
	let t302;
	let t303;
	let code31;
	let t304;
	let t305;
	let code32;
	let t306;
	let t307;
	let code33;
	let t308;
	let t309;
	let code34;
	let t310;
	let t311;
	let code35;
	let t312;
	let t313;
	let code36;
	let t314;
	let t315;
	let code37;
	let t316;
	let t317;
	let t318;
	let p105;
	let t319;
	let t320;
	let p106;
	let t321;
	let code38;
	let t322;
	let t323;
	let code39;
	let t324;
	let t325;
	let code40;
	let t326;
	let t327;
	let t328;
	let p107;
	let t329;
	let t330;
	let p108;
	let t331;
	let t332;
	let p109;
	let t333;
	let code41;
	let t334;
	let t335;
	let code42;
	let t336;
	let t337;
	let code43;
	let t338;
	let t339;
	let t340;
	let p110;
	let t341;
	let t342;
	let p111;
	let t343;
	let code44;
	let t344;
	let t345;
	let code45;
	let t346;
	let t347;
	let t348;
	let p112;
	let t349;
	let t350;
	let p113;
	let t351;
	let code46;
	let t352;
	let t353;
	let code47;
	let t354;
	let t355;
	let t356;
	let p114;
	let t357;
	let t358;
	let p115;
	let t359;
	let code48;
	let t360;
	let t361;
	let t362;
	let p116;
	let t363;
	let code49;
	let t364;
	let t365;
	let t366;
	let p117;
	let t367;
	let t368;
	let p118;
	let t369;
	let strong12;
	let t370;
	let t371;
	let t372;
	let p119;
	let t373;
	let code50;
	let t374;
	let t375;
	let t376;
	let p120;
	let t377;
	let t378;
	let p121;
	let t379;
	let t380;
	let p122;
	let t381;
	let t382;
	let p123;
	let t383;
	let code51;
	let t384;
	let t385;
	let t386;
	let p124;
	let t387;
	let code52;
	let t388;
	let t389;
	let t390;
	let p125;
	let t391;
	let t392;
	let p126;
	let t393;
	let t394;
	let p127;
	let t395;
	let t396;
	let p128;
	let t397;
	let t398;
	let p129;
	let t399;
	let t400;
	let p130;
	let t401;

	return {
		c() {
			section0 = element("section");
			ul1 = element("ul");
			li0 = element("li");
			a0 = element("a");
			t0 = text("Recorded talk");
			ul0 = element("ul");
			li1 = element("li");
			a1 = element("a");
			t1 = text("CityJS Conference 2020");
			li2 = element("li");
			a2 = element("a");
			t2 = text("MMT Tech Meetup - Sept 2020");
			li3 = element("li");
			a3 = element("a");
			t3 = text("Slides");
			li4 = element("li");
			a4 = element("a");
			t4 = text("Script");
			t5 = space();
			section1 = element("section");
			h20 = element("h2");
			a5 = element("a");
			t6 = text("Recorded talk");
			t7 = space();
			section2 = element("section");
			h30 = element("h3");
			a6 = element("a");
			t8 = text("CityJS Conference 2020");
			t9 = space();
			iframe0 = element("iframe");
			t10 = space();
			section3 = element("section");
			h31 = element("h3");
			a7 = element("a");
			t11 = text("MMT Tech Meetup - Sept 2020");
			t12 = space();
			iframe1 = element("iframe");
			t13 = space();
			section4 = element("section");
			h21 = element("h2");
			a8 = element("a");
			t14 = text("Slides");
			t15 = space();
			p0 = element("p");
			t16 = text("[");
			a9 = element("a");
			t17 = text("Link to slides");
			t18 = text("] (Left arrow and right arrow to navigate)");
			t19 = space();
			section5 = element("section");
			h22 = element("h2");
			a10 = element("a");
			t20 = text("Script");
			t21 = space();
			p1 = element("p");
			t22 = text("Modern web frameworks allow us to describe our ");
			strong0 = element("strong");
			t23 = text("UI");
			t24 = text(" declaratively, as a function of state, of the application.");
			t25 = space();
			p2 = element("p");
			t26 = text("The function can be written in a form of template, or template-like syntax, which describes exactly how the view should look like, in all possible states.");
			t27 = space();
			p3 = element("p");
			t28 = text("When the state change, the view should change as well.");
			t29 = space();
			p4 = element("p");
			t30 = text("We don't need to describe how one view transition to another view. We don't need to describe what elements to be added, removed or modified.");
			t31 = space();
			p5 = element("p");
			strong1 = element("strong");
			t32 = text("Modern Web Framework do that for us.");
			t33 = space();
			p6 = element("p");
			t34 = text("The ");
			code0 = element("code");
			t35 = text("framework_magic");
			t36 = text(" takes in 2 subsequent views and figure out how to transition from 1 to another.");
			t37 = space();
			p7 = element("p");
			t38 = text("Modern web frameworks like React and Vue do that using a technique called a virtual DOM.");
			t39 = space();
			p8 = element("p");
			t40 = text("To handle all the possible scenarios, this ");
			code1 = element("code");
			t41 = text("framework_magic");
			t42 = text(" could be very huge in code size, and it is independent of the application it is supporting.");
			t43 = space();
			p9 = element("p");
			t44 = text("For react is 40kb gzipped and vue2 is 23kb gzipped, vue3 is 10kb.");
			t45 = space();
			p10 = element("p");
			t46 = text("and if your application is simple, it could disproportionately small in terms of code size relative to the framework library, which is shown in the gray portion of the chart.");
			t47 = space();
			p11 = element("p");
			t48 = text("However, this doesnt have to be, ");
			strong2 = element("strong");
			t49 = text("the only way");
			t50 = text(" of doing things.");
			t51 = space();
			p12 = element("p");
			t52 = text("What if we could shift all of the work done in the ");
			code2 = element("code");
			t53 = text("framework_magic");
			t54 = text(" from runtime to build time?");
			t55 = space();
			p13 = element("p");
			t56 = text("We can analyse the code and figure out all the possible states and views, and the possible transitions between them, and generate just enough code to do just that?");
			t57 = space();
			p14 = element("p");
			t58 = text("And that's the core idea of Svelte.");
			t59 = space();
			p15 = element("p");
			t60 = text("The Svelte compiler compiles the Svelte code into ");
			strong3 = element("strong");
			t61 = text("optimised");
			t62 = text(" JavaScript code that ");
			strong4 = element("strong");
			t63 = text("grows linearly");
			t64 = text(" along with your application code.");
			t65 = space();
			p16 = element("p");
			t66 = text("and today we are going to look into the Svelte compiler.");
			t67 = space();
			p17 = element("p");
			t68 = text("Don't worry if you are not familiar with Svelte / compiler, I'll try my best to avoid the jargons and explain the general idea of the process.");
			t69 = space();
			p18 = element("p");
			t70 = text("My name is Tan Li Hau, I am a software engineer at Shopee. Shopee is a e-commerce platform in South east asia that is based in Singapore.");
			t71 = space();
			p19 = element("p");
			t72 = text("I grew up in a lovely town called penang in malaysia, which has the best street food in malaysia, such as char koay teow, stir-fry flat rice noodles; rojak, a eclectic fruit salad with palm sugar, peanuts and chilli dressing, and dont get me started with food. Hopefully you guys can come visit Malaysia after this coronavirus pandemic is over.");
			t73 = space();
			p20 = element("p");
			t74 = text("last but not the least, Im one of the maintainers of svelte");
			t75 = space();
			p21 = element("p");
			t76 = text("Before we start talking about compilers, for the benefit of those who havn't have a chance to look into Svelte, lets take a look at how a svelte component looks like.");
			t77 = space();
			p22 = element("p");
			t78 = text("a svelte component is written in a file with a ");
			code3 = element("code");
			t79 = text(".svelte");
			t80 = text(" extension. Each file describes 1 svelte  component.");
			t81 = space();
			p23 = element("p");
			t82 = text("You can add 1 script tag to the component. The script tag allows you to define variable, just like how you would in any javascript code,  and you can reference the variables in your html template, with a curly bracket.");
			t83 = space();
			p24 = element("p");
			t84 = text("To add event listener, you use a ");
			code4 = element("code");
			t85 = text("on:");
			t86 = text(" directive, and you can update the variable just like this, and it will automatically updated in your DOM.");
			t87 = space();
			p25 = element("p");
			t88 = text("You can add a style tag and write some css to style your component. What's cool about it is that, the css is scoped within the component. so when i say button, background: red, only the button written in this component file has the background red. not the child component, not the parent component. just this component.");
			t89 = space();
			p26 = element("p");
			strong5 = element("strong");
			t90 = text("now");
			t91 = text(", here is one of the most powerful, and somewhat controversial feature of svelte, reactive declarations.");
			t92 = space();
			p27 = element("p");
			t93 = text("here you have a ");
			code5 = element("code");
			t94 = text("double = count * 2");
			t95 = text(", with a dollar + colon sign in front of the statement. this means that the variable ");
			code6 = element("code");
			t96 = text("double");
			t97 = text(" is always 2 times of ");
			code7 = element("code");
			t98 = text("count");
			t99 = text(", whenever the value of ");
			code8 = element("code");
			t100 = text("count");
			t101 = text(" has changed, the value of ");
			code9 = element("code");
			t102 = text("double");
			t103 = text(" will update as well.");
			t104 = space();
			p28 = element("p");
			t105 = text("This definitely feels weird in the beginning, but the more you use it, you'll ask yourself why didn't we have this earlier.");
			t106 = space();
			p29 = element("p");
			t107 = text("So, here we have 1 big red button, and a text of multiply equation as a Svelte component.");
			t108 = space();
			p30 = element("p");
			t109 = text("I am gonna pause here for a moment, and ask you this question, ");
			strong6 = element("strong");
			t110 = text("how would you implement this, if you are not allowed to use any framework and you have to write it in Vanilla JavaScript?");
			t111 = space();
			p31 = element("p");
			em0 = element("em");
			t112 = text("(pause)");
			t113 = space();
			p32 = element("p");
			t114 = text("So, firstly we are going to start with the variable declaration.");
			t115 = space();
			p33 = element("p");
			t116 = text("Next we create the text with document.createTextNode, and insert it to the parent");
			t117 = space();
			p34 = element("p");
			t118 = text("Next we create the button, change the text, add event listener and insert it to the parent.");
			t119 = space();
			p35 = element("p");
			t120 = text("To update the text when the count is updated, we create an update function, where we update the value of double and update the content of the text.");
			t121 = space();
			p36 = element("p");
			t122 = text("Finally for the style tag, we create a style tag, set the content and insert into the head.");
			t123 = space();
			p37 = element("p");
			t124 = text("To make sure that the button only targets this button that we just created, we add a class to the button.");
			t125 = space();
			p38 = element("p");
			t126 = text("Here the class name is random, but it could be generated based on the hash of the style code, so you get consistent class name.");
			t127 = space();
			p39 = element("p");
			em1 = element("em");
			t128 = text("(CLICK TO VIEW JS OUTPUT)");
			t129 = space();
			p40 = element("p");
			t130 = text("In fact if you take a look at the svelte generated JS output, it is very similar to the code we just wrote.");
			t131 = space();
			p41 = element("p");
			t132 = text("So, this is just the code you need to ");
			strong7 = element("strong");
			t133 = text("create a button and a text");
			t134 = text(". You don't need 40KB Virtual DOM library to recreate the same component.");
			t135 = space();
			p42 = element("p");
			t136 = text("Of course, you don't have to write all of these yourself.");
			t137 = space();
			p43 = element("p");
			t138 = text("The Svelte compiler will do it for you. It will analyse the code above, and generate the code below for you.");
			t139 = space();
			p44 = element("p");
			t140 = text("And now, if you try to choose \"SSR\" as the generated output, you can see now Svelte generates a function that returns a string composed using template literals.");
			t141 = space();
			p45 = element("p");
			t142 = text("This is a few orders more performant than generating a tree object and serialising them into a HTML string.");
			t143 = space();
			p46 = element("p");
			em2 = element("em");
			t144 = text("(DONT MOVE)");
			t145 = space();
			p47 = element("p");
			t146 = text("So, Let's take a few more examples of the Svelte syntax, and along the way, I hope you ask yourself this question, ");
			strong8 = element("strong");
			t147 = text("\"how do i convert this / write this in plain JavaScript?\"");
			t148 = space();
			p48 = element("p");
			t149 = text("and don't worry, you can find this repl on the svelte website. and you can compare the input and the js output anyway you want.");
			t150 = space();
			p49 = element("p");
			em3 = element("em");
			t151 = text("(OKAY NOW MOVE)");
			t152 = space();
			p50 = element("p");
			t153 = text("To express logics within the template, Svelte provides logic block, such as ");
			strong9 = element("strong");
			code10 = element("code");
			t154 = text("{#if}");
			t155 = text(", ");
			strong10 = element("strong");
			code11 = element("code");
			t156 = text("{#await}");
			t157 = text(", and ");
			strong11 = element("strong");
			code12 = element("code");
			t158 = text("{#each}");
			t159 = text(".");
			t160 = space();
			p51 = element("p");
			t161 = text("To reduce the boilerplate code for binding a variable to an input, Svelte provides the ");
			code13 = element("code");
			t162 = text("bind:");
			t163 = text(" directive.");
			t164 = space();
			p52 = element("p");
			t165 = text("To provide transition for elements coming into or out of the DOM, Svelte provides the ");
			code14 = element("code");
			t166 = text("transition");
			t167 = text(", ");
			code15 = element("code");
			t168 = text("in");
			t169 = text(" and ");
			code16 = element("code");
			t170 = text("out");
			t171 = text(" directive.");
			t172 = space();
			p53 = element("p");
			t173 = text("To compose Components, Svelte provides slots and templates similar to the Web Component APIs.");
			t174 = space();
			p54 = element("p");
			t175 = text("There's so much I would like to share here, but I have to segue into the Svelte compiler, because that's the main topic of today's talk.");
			t176 = space();
			p55 = element("p");
			t177 = text("Now, finally, let's take a look at the Svelte compiler.");
			t178 = space();
			p56 = element("p");
			t179 = text("So, how does a compiler works?");
			t180 = space();
			p57 = element("p");
			t181 = text("A compiler first reads through your code, and break it down into smaller pieces, called tokens.");
			t182 = space();
			p58 = element("p");
			t183 = text("The compiler then goes through this list of tokens and arrange them into a tree structure, according to the grammar of the language. The tree structure is what a compiler call “Abstract syntax tree” or AST for short.");
			t184 = space();
			p59 = element("p");
			t185 = text("An AST is a tree representation of the input code.");
			t186 = space();
			p60 = element("p");
			t187 = text("And what the compiler sometimes do, is to analyse and apply transformation to the AST.\nUsing tree traversal algorithms, such as depth first search");
			t188 = space();
			p61 = element("p");
			t189 = text("And finally, the compiler generates a code output based on the final AST.");
			t190 = space();
			p62 = element("p");
			t191 = text("In summary, a generic compilation process involves parsing the code to an AST, doing analysis, optimsiation or transformation on the AST, and then generate code out from the AST.");
			t192 = space();
			p63 = element("p");
			t193 = text("Finally, let's take a look how Svelte compiler works.");
			t194 = space();
			p64 = element("p");
			t195 = text("Svelte parses the Svelte code into AST");
			t196 = space();
			p65 = element("p");
			t197 = text("Svelte then analyses the AST, which we will explore in detailed later.");
			t198 = space();
			p66 = element("p");
			t199 = text("With the analysis, Svelte generates JavaScript code depending on the compile target, whether it's for SSR or it's for the browser.\nFinally, js and css is generated, and can be written into a file or be consumed by your build process.");
			t200 = space();
			p67 = element("p");
			t201 = text("So lets start from the beginning, the parsing.");
			t202 = space();
			p68 = element("p");
			t203 = text("Here is a Svelte component that we are going to use throughout this talk.");
			t204 = space();
			p69 = element("p");
			t205 = text("Svelte, implements its own parser");
			t206 = space();
			p70 = element("p");
			t207 = text("That parses the html syntax, as well as logic blocks, like each, if, and await");
			t208 = space();
			p71 = element("p");
			t209 = text("Because js is a fairly complex language, whenever svelte encounters a script tag, or a curly brackets, it will hand it over to acorn, a lightweight JavaScript parser, to parse the JS content.\nThe same thing goes with css as well. svelte uses css-tree to parse CSS content in between the style tag.");
			t210 = space();
			p72 = element("p");
			t211 = text("So, through the process, the svelte code is broken down into tokens, and is arranged into the Svelte AST.");
			t212 = space();
			p73 = element("p");
			t213 = text("If you interested to see how the Svelte AST looks like, you can check them out at ASTExplorer.net.");
			t214 = space();
			p74 = element("p");
			t215 = text("The next step is to analyse the AST.");
			t216 = space();
			p75 = element("p");
			t217 = text("Here, our code is already in AST, BUT to help visualise the process, i'm going to show you the original code.");
			t218 = space();
			p76 = element("p");
			t219 = text("The first thing Svelte do is to traverse through the script AST.");
			t220 = space();
			p77 = element("p");
			t221 = text("Whenever it encounters a variable, in this case, count, it will record down the variable name.");
			t222 = space();
			p78 = element("p");
			t223 = text("here we record values and double.");
			t224 = space();
			p79 = element("p");
			t225 = text("the \"double\" here, in this svelte code is a reactive declared variable. but to vanilla JavaScript, we are assigning value to this variable \"double\", which is not declared anywhere.");
			t226 = space();
			p80 = element("p");
			t227 = text("in strict mode, this is a \"assignment to undeclared variable\" error.");
			t228 = space();
			p81 = element("p");
			t229 = text("Svelte marks the variable, \"double\", as \"injected\", so the declaration of the variable will be injected later. other examples of injected variables are svelte magic global, such as $$props, or a $ prefix of a store variable.");
			t230 = space();
			p82 = element("p");
			t231 = text("here we encounter \"count\" again, this time its being referenced, instead of being assinged to a value, and it is used to compute the value of double. so we draw a dependency relationship between count and double.so double is depending on count.");
			t232 = space();
			p83 = element("p");
			t233 = text("lets continue.");
			t234 = space();
			p84 = element("p");
			t235 = text("here we see data. data is not declared at the top level scope, as it is within the curly bracket block scope. so we are not going to record it down.");
			t236 = space();
			p85 = element("p");
			t237 = text("same thing goes with ");
			code17 = element("code");
			t238 = text("i");
			t239 = text(".");
			t240 = space();
			p86 = element("p");
			t241 = text("here we encountered double again, so we mark it as referenced.");
			t242 = space();
			p87 = element("p");
			t243 = text("Math, a js global, we are going to ignore it.");
			t244 = space();
			p88 = element("p");
			t245 = text("here ");
			code18 = element("code");
			t246 = text("values");
			t247 = text(" is mutated.");
			t248 = space();
			p89 = element("p");
			t249 = text("now we reach the end of the script, the next step is to traverse the template AST.");
			t250 = space();
			p90 = element("p");
			t251 = text("we start from the ");
			code19 = element("code");
			t252 = text("input");
			t253 = text(" element, which has a ");
			code20 = element("code");
			t254 = text("bind:value");
			t255 = text(".");
			t256 = space();
			p91 = element("p");
			t257 = text("Here we are binding the value of the input to the variable ");
			code21 = element("code");
			t258 = text("count");
			t259 = text(". so we mark ");
			code22 = element("code");
			t260 = text("count");
			t261 = text(" as referenced from template and mutated.");
			t262 = space();
			p92 = element("p");
			t263 = text("Now we encountered the each block. Here we are iterating through the variable ");
			code23 = element("code");
			t264 = text("values");
			t265 = text(" and we are using the variable ");
			code24 = element("code");
			t266 = text("value");
			t267 = text(" as each item. So the template within the each block will have a new scope, where ");
			code25 = element("code");
			t268 = text("value");
			t269 = text(" is declared. Also, we mark ");
			code26 = element("code");
			t270 = text("values");
			t271 = text(" as the dependency of the each block. This means that whenever ");
			code27 = element("code");
			t272 = text("values");
			t273 = text(" has changed, we are going to update the each block.");
			t274 = space();
			p93 = element("p");
			t275 = text("...and, we mark values as referenced too.");
			t276 = space();
			p94 = element("p");
			t277 = text("next, we move into the each block and the div element. Here we mark ");
			code28 = element("code");
			t278 = text("value");
			t279 = text(" as referenced from the template, we encounter ");
			code29 = element("code");
			t280 = text("value");
			t281 = text(" again and we've reachead the end of the template.");
			t282 = space();
			p95 = element("p");
			t283 = text("and Svelte traverse through the script again, this time mainly for optimisation. figuring out which variables are not referenced, and does not need to be reactive.");
			t284 = space();
			p96 = element("p");
			t285 = text("Similarly, if a reactive declaration's dependency will never change, by seeing whether their dependencies were marked as mutated, we can mark it as static, which is more efficient, and much smaller in code size.");
			t286 = space();
			p97 = element("p");
			t287 = text("Next, Svelte traverse through the style.");
			t288 = space();
			p98 = element("p");
			t289 = text("for each selector, it will determine whether it will match any elements in the template, and if it does, svelte will add a svelte-hash class name to the selector as well as the matched eelement. Although this will increase the specificity of the selector, but it will make the selector scoped only to the current svelte component.");
			t290 = space();
			p99 = element("p");
			t291 = text("At the end of this step, Svelte has figured out all the variables declared, their behavior and their relationship.");
			t292 = space();
			p100 = element("p");
			t293 = text("With this, we are moving on to the rendering phase.");
			t294 = space();
			p101 = element("p");
			t295 = text("This step is where svelte will generate the javascript code.\nThere are 2 different compile targets, 1 is DOM, for the client side, and another is ssr, for the server side.");
			t296 = space();
			p102 = element("p");
			t297 = text("Lets first take a look at the dom render target.");
			t298 = space();
			p103 = element("p");
			t299 = text("Here we have the source code. and here is the outline of how a dom output looks like.");
			t300 = space();
			p104 = element("p");
			t301 = text("Here is what I called a fragment block. the create fragment function returns an object, that acts as a recipe to create the elements in the component. each method in the recipe object, represents a stage in the component lifecycle, here we have ");
			code30 = element("code");
			t302 = text("c");
			t303 = text(" for ");
			code31 = element("code");
			t304 = text("create");
			t305 = text(", ");
			code32 = element("code");
			t306 = text("m");
			t307 = text(" for ");
			code33 = element("code");
			t308 = text("mounting");
			t309 = text(", ");
			code34 = element("code");
			t310 = text("p");
			t311 = text(" for ");
			code35 = element("code");
			t312 = text("update");
			t313 = text(", and ");
			code36 = element("code");
			t314 = text("d");
			t315 = text(" for ");
			code37 = element("code");
			t316 = text("destroy");
			t317 = text(".");
			t318 = space();
			p105 = element("p");
			t319 = text("next on, we have the instance function. here's where the state and component logic goes into.");
			t320 = space();
			p106 = element("p");
			t321 = text("finally we have the svelte component class. so each svelte component is compiled into a class which is the default export. in the constructor, as you can see, calls the ");
			code38 = element("code");
			t322 = text("init");
			t323 = text(" function which takes in the ");
			code39 = element("code");
			t324 = text("instance");
			t325 = text(" and ");
			code40 = element("code");
			t326 = text("create_fragment");
			t327 = text(" function. and this is how the 3 different pieces of the svelte compoenent come together.");
			t328 = space();
			p107 = element("p");
			t329 = text("Now, svelte walks through the template again, and starts inserting code into output.");
			t330 = space();
			p108 = element("p");
			t331 = text("First we have the input element. we insert instructions to create the input element, mounting the element to the target, and remove the element from the target.");
			t332 = space();
			p109 = element("p");
			t333 = text("next we have the binding of the input value to the ");
			code41 = element("code");
			t334 = text("count");
			t335 = text(" variable. we need an input handler to listen to the input changes, so we can update the value of the ");
			code42 = element("code");
			t336 = text("count");
			t337 = text(" variable. here we pull out the variables list, and add ");
			code43 = element("code");
			t338 = text("input_handler");
			t339 = text(".");
			t340 = space();
			p110 = element("p");
			t341 = text("we set the input value based on the variable count and add event listener for input changes which we should remove event listener when we destroy the component.");
			t342 = space();
			p111 = element("p");
			t343 = text("and in the update phase, if the ");
			code44 = element("code");
			t344 = text("count");
			t345 = text(" has changed, we need to update the value of the input based on the value of ");
			code45 = element("code");
			t346 = text("count");
			t347 = text(".");
			t348 = space();
			p112 = element("p");
			t349 = text("next we move on to the each block.");
			t350 = space();
			p113 = element("p");
			t351 = text("we create a new fragment block for the each block, which contains the recipe for creating elements for 1 each item. And because in the each block we have a child scope that defines the variable ");
			code46 = element("code");
			t352 = text("value");
			t353 = text(", we have a ");
			code47 = element("code");
			t354 = text("get_each_context");
			t355 = text(" function to emulate that.");
			t356 = space();
			p114 = element("p");
			t357 = text("Here we fast forward through the steps, where for each element, we insert code for how we create, mount, update and destroy them. If you are interested to know the details, you can check out my series of blog, called \"Compile Svelte in your head\".");
			t358 = space();
			p115 = element("p");
			t359 = text("Now we look at how Svelte fills up the instance function. In most cases, Svelte just copies over whatever is written within the ");
			code48 = element("code");
			t360 = text("<script>");
			t361 = text(" tag.");
			t362 = space();
			p116 = element("p");
			t363 = text("For reactive declarations, they were added inside the ");
			code49 = element("code");
			t364 = text("$$.update");
			t365 = text(" function, and for each statement, we add an if statement to check whether their dependency has changed, based on the dependency relationship we've drawn earlier.");
			t366 = space();
			p117 = element("p");
			t367 = text("Now we need to declare and add those injected variables.");
			t368 = space();
			p118 = element("p");
			t369 = text("Finally, we return the list of variables that are ");
			strong12 = element("strong");
			t370 = text("referenced by the template");
			t371 = text(" only.");
			t372 = space();
			p119 = element("p");
			t373 = text("Now, to make the variables actually reactive, we instruments the ");
			code50 = element("code");
			t374 = text("$$invalidate");
			t375 = text(" after each assignment statements, so that it will kickstart a next round of update cycle.");
			t376 = space();
			p120 = element("p");
			t377 = text("So here you have it, the compile output for the DOM target.");
			t378 = space();
			p121 = element("p");
			t379 = text("Let's take a quick look at how things going for compiling to the SSR target.");
			t380 = space();
			p122 = element("p");
			t381 = text("The structure of the output code for the SSR target is much simpler. it is a function that returns a string.");
			t382 = space();
			p123 = element("p");
			t383 = text("Because there wont be any reactivity needed in the server, we can copy over the code verbatim from the script tag. same thing goes with reactive declarations, of course we need to remember to declare the injected variable, ");
			code51 = element("code");
			t384 = text("double");
			t385 = text(".");
			t386 = space();
			p124 = element("p");
			t387 = text("as we traverse through the template, we add insert strings or expressions into the output template literal. For the each block, we iterate through the variable ");
			code52 = element("code");
			t388 = text("values");
			t389 = text(" and return the child elements as string.");
			t390 = space();
			p125 = element("p");
			t391 = text("And there you go, the output code of a svelte component for SSR.");
			t392 = space();
			p126 = element("p");
			t393 = text("Finally, Svelte outputs the code in JS and CSS, with the code as string as well as the sourcemap.");
			t394 = space();
			p127 = element("p");
			t395 = text("These can be written into file system directly, or be consumed by your module bundler, such as rollup-svelte-plugin in rollup or svelte-loader for webpack.");
			t396 = space();
			p128 = element("p");
			t397 = text("So lets review again the svelte compilation pipeline,\nSvelte parses the code into ast, runs a series of steps to analsye the code, tracking the variable references and dependencies. Then svelte generates the code depending on the compile target, whether it's for the client side or server-side.\nAnd the output of the render step is in terms of JS and CSS, which can be written into a file / consumed by your build tools.");
			t398 = space();
			p129 = element("p");
			t399 = text("Thank you so much for listening. If you like to learn more about svelte, or if you have any questions about svelte, you can follow me on twitter. I am Li Hau. hope you have fun with the talks throughout the conference.");
			t400 = space();
			p130 = element("p");
			t401 = text("See ya.");
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
			t0 = claim_text(a0_nodes, "Recorded talk");
			a0_nodes.forEach(detach);
			li0_nodes.forEach(detach);
			ul0 = claim_element(ul1_nodes, "UL", {});
			var ul0_nodes = children(ul0);
			li1 = claim_element(ul0_nodes, "LI", {});
			var li1_nodes = children(li1);
			a1 = claim_element(li1_nodes, "A", { href: true });
			var a1_nodes = children(a1);
			t1 = claim_text(a1_nodes, "CityJS Conference 2020");
			a1_nodes.forEach(detach);
			li1_nodes.forEach(detach);
			li2 = claim_element(ul0_nodes, "LI", {});
			var li2_nodes = children(li2);
			a2 = claim_element(li2_nodes, "A", { href: true });
			var a2_nodes = children(a2);
			t2 = claim_text(a2_nodes, "MMT Tech Meetup - Sept 2020");
			a2_nodes.forEach(detach);
			li2_nodes.forEach(detach);
			ul0_nodes.forEach(detach);
			li3 = claim_element(ul1_nodes, "LI", {});
			var li3_nodes = children(li3);
			a3 = claim_element(li3_nodes, "A", { href: true });
			var a3_nodes = children(a3);
			t3 = claim_text(a3_nodes, "Slides");
			a3_nodes.forEach(detach);
			li3_nodes.forEach(detach);
			li4 = claim_element(ul1_nodes, "LI", {});
			var li4_nodes = children(li4);
			a4 = claim_element(li4_nodes, "A", { href: true });
			var a4_nodes = children(a4);
			t4 = claim_text(a4_nodes, "Script");
			a4_nodes.forEach(detach);
			li4_nodes.forEach(detach);
			ul1_nodes.forEach(detach);
			section0_nodes.forEach(detach);
			t5 = claim_space(nodes);
			section1 = claim_element(nodes, "SECTION", {});
			var section1_nodes = children(section1);
			h20 = claim_element(section1_nodes, "H2", {});
			var h20_nodes = children(h20);
			a5 = claim_element(h20_nodes, "A", { href: true, id: true });
			var a5_nodes = children(a5);
			t6 = claim_text(a5_nodes, "Recorded talk");
			a5_nodes.forEach(detach);
			h20_nodes.forEach(detach);
			section1_nodes.forEach(detach);
			t7 = claim_space(nodes);
			section2 = claim_element(nodes, "SECTION", {});
			var section2_nodes = children(section2);
			h30 = claim_element(section2_nodes, "H3", {});
			var h30_nodes = children(h30);
			a6 = claim_element(h30_nodes, "A", { href: true, id: true });
			var a6_nodes = children(a6);
			t8 = claim_text(a6_nodes, "CityJS Conference 2020");
			a6_nodes.forEach(detach);
			h30_nodes.forEach(detach);
			t9 = claim_space(section2_nodes);

			iframe0 = claim_element(section2_nodes, "IFRAME", {
				width: true,
				height: true,
				src: true,
				frameborder: true,
				allow: true,
				allowfullscreen: true
			});

			children(iframe0).forEach(detach);
			section2_nodes.forEach(detach);
			t10 = claim_space(nodes);
			section3 = claim_element(nodes, "SECTION", {});
			var section3_nodes = children(section3);
			h31 = claim_element(section3_nodes, "H3", {});
			var h31_nodes = children(h31);
			a7 = claim_element(h31_nodes, "A", { href: true, id: true });
			var a7_nodes = children(a7);
			t11 = claim_text(a7_nodes, "MMT Tech Meetup - Sept 2020");
			a7_nodes.forEach(detach);
			h31_nodes.forEach(detach);
			t12 = claim_space(section3_nodes);

			iframe1 = claim_element(section3_nodes, "IFRAME", {
				width: true,
				height: true,
				src: true,
				frameborder: true,
				allow: true,
				allowfullscreen: true
			});

			children(iframe1).forEach(detach);
			section3_nodes.forEach(detach);
			t13 = claim_space(nodes);
			section4 = claim_element(nodes, "SECTION", {});
			var section4_nodes = children(section4);
			h21 = claim_element(section4_nodes, "H2", {});
			var h21_nodes = children(h21);
			a8 = claim_element(h21_nodes, "A", { href: true, id: true });
			var a8_nodes = children(a8);
			t14 = claim_text(a8_nodes, "Slides");
			a8_nodes.forEach(detach);
			h21_nodes.forEach(detach);
			t15 = claim_space(section4_nodes);
			p0 = claim_element(section4_nodes, "P", {});
			var p0_nodes = children(p0);
			t16 = claim_text(p0_nodes, "[");
			a9 = claim_element(p0_nodes, "A", { href: true });
			var a9_nodes = children(a9);
			t17 = claim_text(a9_nodes, "Link to slides");
			a9_nodes.forEach(detach);
			t18 = claim_text(p0_nodes, "] (Left arrow and right arrow to navigate)");
			p0_nodes.forEach(detach);
			section4_nodes.forEach(detach);
			t19 = claim_space(nodes);
			section5 = claim_element(nodes, "SECTION", {});
			var section5_nodes = children(section5);
			h22 = claim_element(section5_nodes, "H2", {});
			var h22_nodes = children(h22);
			a10 = claim_element(h22_nodes, "A", { href: true, id: true });
			var a10_nodes = children(a10);
			t20 = claim_text(a10_nodes, "Script");
			a10_nodes.forEach(detach);
			h22_nodes.forEach(detach);
			t21 = claim_space(section5_nodes);
			p1 = claim_element(section5_nodes, "P", {});
			var p1_nodes = children(p1);
			t22 = claim_text(p1_nodes, "Modern web frameworks allow us to describe our ");
			strong0 = claim_element(p1_nodes, "STRONG", {});
			var strong0_nodes = children(strong0);
			t23 = claim_text(strong0_nodes, "UI");
			strong0_nodes.forEach(detach);
			t24 = claim_text(p1_nodes, " declaratively, as a function of state, of the application.");
			p1_nodes.forEach(detach);
			t25 = claim_space(section5_nodes);
			p2 = claim_element(section5_nodes, "P", {});
			var p2_nodes = children(p2);
			t26 = claim_text(p2_nodes, "The function can be written in a form of template, or template-like syntax, which describes exactly how the view should look like, in all possible states.");
			p2_nodes.forEach(detach);
			t27 = claim_space(section5_nodes);
			p3 = claim_element(section5_nodes, "P", {});
			var p3_nodes = children(p3);
			t28 = claim_text(p3_nodes, "When the state change, the view should change as well.");
			p3_nodes.forEach(detach);
			t29 = claim_space(section5_nodes);
			p4 = claim_element(section5_nodes, "P", {});
			var p4_nodes = children(p4);
			t30 = claim_text(p4_nodes, "We don't need to describe how one view transition to another view. We don't need to describe what elements to be added, removed or modified.");
			p4_nodes.forEach(detach);
			t31 = claim_space(section5_nodes);
			p5 = claim_element(section5_nodes, "P", {});
			var p5_nodes = children(p5);
			strong1 = claim_element(p5_nodes, "STRONG", {});
			var strong1_nodes = children(strong1);
			t32 = claim_text(strong1_nodes, "Modern Web Framework do that for us.");
			strong1_nodes.forEach(detach);
			p5_nodes.forEach(detach);
			t33 = claim_space(section5_nodes);
			p6 = claim_element(section5_nodes, "P", {});
			var p6_nodes = children(p6);
			t34 = claim_text(p6_nodes, "The ");
			code0 = claim_element(p6_nodes, "CODE", {});
			var code0_nodes = children(code0);
			t35 = claim_text(code0_nodes, "framework_magic");
			code0_nodes.forEach(detach);
			t36 = claim_text(p6_nodes, " takes in 2 subsequent views and figure out how to transition from 1 to another.");
			p6_nodes.forEach(detach);
			t37 = claim_space(section5_nodes);
			p7 = claim_element(section5_nodes, "P", {});
			var p7_nodes = children(p7);
			t38 = claim_text(p7_nodes, "Modern web frameworks like React and Vue do that using a technique called a virtual DOM.");
			p7_nodes.forEach(detach);
			t39 = claim_space(section5_nodes);
			p8 = claim_element(section5_nodes, "P", {});
			var p8_nodes = children(p8);
			t40 = claim_text(p8_nodes, "To handle all the possible scenarios, this ");
			code1 = claim_element(p8_nodes, "CODE", {});
			var code1_nodes = children(code1);
			t41 = claim_text(code1_nodes, "framework_magic");
			code1_nodes.forEach(detach);
			t42 = claim_text(p8_nodes, " could be very huge in code size, and it is independent of the application it is supporting.");
			p8_nodes.forEach(detach);
			t43 = claim_space(section5_nodes);
			p9 = claim_element(section5_nodes, "P", {});
			var p9_nodes = children(p9);
			t44 = claim_text(p9_nodes, "For react is 40kb gzipped and vue2 is 23kb gzipped, vue3 is 10kb.");
			p9_nodes.forEach(detach);
			t45 = claim_space(section5_nodes);
			p10 = claim_element(section5_nodes, "P", {});
			var p10_nodes = children(p10);
			t46 = claim_text(p10_nodes, "and if your application is simple, it could disproportionately small in terms of code size relative to the framework library, which is shown in the gray portion of the chart.");
			p10_nodes.forEach(detach);
			t47 = claim_space(section5_nodes);
			p11 = claim_element(section5_nodes, "P", {});
			var p11_nodes = children(p11);
			t48 = claim_text(p11_nodes, "However, this doesnt have to be, ");
			strong2 = claim_element(p11_nodes, "STRONG", {});
			var strong2_nodes = children(strong2);
			t49 = claim_text(strong2_nodes, "the only way");
			strong2_nodes.forEach(detach);
			t50 = claim_text(p11_nodes, " of doing things.");
			p11_nodes.forEach(detach);
			t51 = claim_space(section5_nodes);
			p12 = claim_element(section5_nodes, "P", {});
			var p12_nodes = children(p12);
			t52 = claim_text(p12_nodes, "What if we could shift all of the work done in the ");
			code2 = claim_element(p12_nodes, "CODE", {});
			var code2_nodes = children(code2);
			t53 = claim_text(code2_nodes, "framework_magic");
			code2_nodes.forEach(detach);
			t54 = claim_text(p12_nodes, " from runtime to build time?");
			p12_nodes.forEach(detach);
			t55 = claim_space(section5_nodes);
			p13 = claim_element(section5_nodes, "P", {});
			var p13_nodes = children(p13);
			t56 = claim_text(p13_nodes, "We can analyse the code and figure out all the possible states and views, and the possible transitions between them, and generate just enough code to do just that?");
			p13_nodes.forEach(detach);
			t57 = claim_space(section5_nodes);
			p14 = claim_element(section5_nodes, "P", {});
			var p14_nodes = children(p14);
			t58 = claim_text(p14_nodes, "And that's the core idea of Svelte.");
			p14_nodes.forEach(detach);
			t59 = claim_space(section5_nodes);
			p15 = claim_element(section5_nodes, "P", {});
			var p15_nodes = children(p15);
			t60 = claim_text(p15_nodes, "The Svelte compiler compiles the Svelte code into ");
			strong3 = claim_element(p15_nodes, "STRONG", {});
			var strong3_nodes = children(strong3);
			t61 = claim_text(strong3_nodes, "optimised");
			strong3_nodes.forEach(detach);
			t62 = claim_text(p15_nodes, " JavaScript code that ");
			strong4 = claim_element(p15_nodes, "STRONG", {});
			var strong4_nodes = children(strong4);
			t63 = claim_text(strong4_nodes, "grows linearly");
			strong4_nodes.forEach(detach);
			t64 = claim_text(p15_nodes, " along with your application code.");
			p15_nodes.forEach(detach);
			t65 = claim_space(section5_nodes);
			p16 = claim_element(section5_nodes, "P", {});
			var p16_nodes = children(p16);
			t66 = claim_text(p16_nodes, "and today we are going to look into the Svelte compiler.");
			p16_nodes.forEach(detach);
			t67 = claim_space(section5_nodes);
			p17 = claim_element(section5_nodes, "P", {});
			var p17_nodes = children(p17);
			t68 = claim_text(p17_nodes, "Don't worry if you are not familiar with Svelte / compiler, I'll try my best to avoid the jargons and explain the general idea of the process.");
			p17_nodes.forEach(detach);
			t69 = claim_space(section5_nodes);
			p18 = claim_element(section5_nodes, "P", {});
			var p18_nodes = children(p18);
			t70 = claim_text(p18_nodes, "My name is Tan Li Hau, I am a software engineer at Shopee. Shopee is a e-commerce platform in South east asia that is based in Singapore.");
			p18_nodes.forEach(detach);
			t71 = claim_space(section5_nodes);
			p19 = claim_element(section5_nodes, "P", {});
			var p19_nodes = children(p19);
			t72 = claim_text(p19_nodes, "I grew up in a lovely town called penang in malaysia, which has the best street food in malaysia, such as char koay teow, stir-fry flat rice noodles; rojak, a eclectic fruit salad with palm sugar, peanuts and chilli dressing, and dont get me started with food. Hopefully you guys can come visit Malaysia after this coronavirus pandemic is over.");
			p19_nodes.forEach(detach);
			t73 = claim_space(section5_nodes);
			p20 = claim_element(section5_nodes, "P", {});
			var p20_nodes = children(p20);
			t74 = claim_text(p20_nodes, "last but not the least, Im one of the maintainers of svelte");
			p20_nodes.forEach(detach);
			t75 = claim_space(section5_nodes);
			p21 = claim_element(section5_nodes, "P", {});
			var p21_nodes = children(p21);
			t76 = claim_text(p21_nodes, "Before we start talking about compilers, for the benefit of those who havn't have a chance to look into Svelte, lets take a look at how a svelte component looks like.");
			p21_nodes.forEach(detach);
			t77 = claim_space(section5_nodes);
			p22 = claim_element(section5_nodes, "P", {});
			var p22_nodes = children(p22);
			t78 = claim_text(p22_nodes, "a svelte component is written in a file with a ");
			code3 = claim_element(p22_nodes, "CODE", {});
			var code3_nodes = children(code3);
			t79 = claim_text(code3_nodes, ".svelte");
			code3_nodes.forEach(detach);
			t80 = claim_text(p22_nodes, " extension. Each file describes 1 svelte  component.");
			p22_nodes.forEach(detach);
			t81 = claim_space(section5_nodes);
			p23 = claim_element(section5_nodes, "P", {});
			var p23_nodes = children(p23);
			t82 = claim_text(p23_nodes, "You can add 1 script tag to the component. The script tag allows you to define variable, just like how you would in any javascript code,  and you can reference the variables in your html template, with a curly bracket.");
			p23_nodes.forEach(detach);
			t83 = claim_space(section5_nodes);
			p24 = claim_element(section5_nodes, "P", {});
			var p24_nodes = children(p24);
			t84 = claim_text(p24_nodes, "To add event listener, you use a ");
			code4 = claim_element(p24_nodes, "CODE", {});
			var code4_nodes = children(code4);
			t85 = claim_text(code4_nodes, "on:");
			code4_nodes.forEach(detach);
			t86 = claim_text(p24_nodes, " directive, and you can update the variable just like this, and it will automatically updated in your DOM.");
			p24_nodes.forEach(detach);
			t87 = claim_space(section5_nodes);
			p25 = claim_element(section5_nodes, "P", {});
			var p25_nodes = children(p25);
			t88 = claim_text(p25_nodes, "You can add a style tag and write some css to style your component. What's cool about it is that, the css is scoped within the component. so when i say button, background: red, only the button written in this component file has the background red. not the child component, not the parent component. just this component.");
			p25_nodes.forEach(detach);
			t89 = claim_space(section5_nodes);
			p26 = claim_element(section5_nodes, "P", {});
			var p26_nodes = children(p26);
			strong5 = claim_element(p26_nodes, "STRONG", {});
			var strong5_nodes = children(strong5);
			t90 = claim_text(strong5_nodes, "now");
			strong5_nodes.forEach(detach);
			t91 = claim_text(p26_nodes, ", here is one of the most powerful, and somewhat controversial feature of svelte, reactive declarations.");
			p26_nodes.forEach(detach);
			t92 = claim_space(section5_nodes);
			p27 = claim_element(section5_nodes, "P", {});
			var p27_nodes = children(p27);
			t93 = claim_text(p27_nodes, "here you have a ");
			code5 = claim_element(p27_nodes, "CODE", {});
			var code5_nodes = children(code5);
			t94 = claim_text(code5_nodes, "double = count * 2");
			code5_nodes.forEach(detach);
			t95 = claim_text(p27_nodes, ", with a dollar + colon sign in front of the statement. this means that the variable ");
			code6 = claim_element(p27_nodes, "CODE", {});
			var code6_nodes = children(code6);
			t96 = claim_text(code6_nodes, "double");
			code6_nodes.forEach(detach);
			t97 = claim_text(p27_nodes, " is always 2 times of ");
			code7 = claim_element(p27_nodes, "CODE", {});
			var code7_nodes = children(code7);
			t98 = claim_text(code7_nodes, "count");
			code7_nodes.forEach(detach);
			t99 = claim_text(p27_nodes, ", whenever the value of ");
			code8 = claim_element(p27_nodes, "CODE", {});
			var code8_nodes = children(code8);
			t100 = claim_text(code8_nodes, "count");
			code8_nodes.forEach(detach);
			t101 = claim_text(p27_nodes, " has changed, the value of ");
			code9 = claim_element(p27_nodes, "CODE", {});
			var code9_nodes = children(code9);
			t102 = claim_text(code9_nodes, "double");
			code9_nodes.forEach(detach);
			t103 = claim_text(p27_nodes, " will update as well.");
			p27_nodes.forEach(detach);
			t104 = claim_space(section5_nodes);
			p28 = claim_element(section5_nodes, "P", {});
			var p28_nodes = children(p28);
			t105 = claim_text(p28_nodes, "This definitely feels weird in the beginning, but the more you use it, you'll ask yourself why didn't we have this earlier.");
			p28_nodes.forEach(detach);
			t106 = claim_space(section5_nodes);
			p29 = claim_element(section5_nodes, "P", {});
			var p29_nodes = children(p29);
			t107 = claim_text(p29_nodes, "So, here we have 1 big red button, and a text of multiply equation as a Svelte component.");
			p29_nodes.forEach(detach);
			t108 = claim_space(section5_nodes);
			p30 = claim_element(section5_nodes, "P", {});
			var p30_nodes = children(p30);
			t109 = claim_text(p30_nodes, "I am gonna pause here for a moment, and ask you this question, ");
			strong6 = claim_element(p30_nodes, "STRONG", {});
			var strong6_nodes = children(strong6);
			t110 = claim_text(strong6_nodes, "how would you implement this, if you are not allowed to use any framework and you have to write it in Vanilla JavaScript?");
			strong6_nodes.forEach(detach);
			p30_nodes.forEach(detach);
			t111 = claim_space(section5_nodes);
			p31 = claim_element(section5_nodes, "P", {});
			var p31_nodes = children(p31);
			em0 = claim_element(p31_nodes, "EM", {});
			var em0_nodes = children(em0);
			t112 = claim_text(em0_nodes, "(pause)");
			em0_nodes.forEach(detach);
			p31_nodes.forEach(detach);
			t113 = claim_space(section5_nodes);
			p32 = claim_element(section5_nodes, "P", {});
			var p32_nodes = children(p32);
			t114 = claim_text(p32_nodes, "So, firstly we are going to start with the variable declaration.");
			p32_nodes.forEach(detach);
			t115 = claim_space(section5_nodes);
			p33 = claim_element(section5_nodes, "P", {});
			var p33_nodes = children(p33);
			t116 = claim_text(p33_nodes, "Next we create the text with document.createTextNode, and insert it to the parent");
			p33_nodes.forEach(detach);
			t117 = claim_space(section5_nodes);
			p34 = claim_element(section5_nodes, "P", {});
			var p34_nodes = children(p34);
			t118 = claim_text(p34_nodes, "Next we create the button, change the text, add event listener and insert it to the parent.");
			p34_nodes.forEach(detach);
			t119 = claim_space(section5_nodes);
			p35 = claim_element(section5_nodes, "P", {});
			var p35_nodes = children(p35);
			t120 = claim_text(p35_nodes, "To update the text when the count is updated, we create an update function, where we update the value of double and update the content of the text.");
			p35_nodes.forEach(detach);
			t121 = claim_space(section5_nodes);
			p36 = claim_element(section5_nodes, "P", {});
			var p36_nodes = children(p36);
			t122 = claim_text(p36_nodes, "Finally for the style tag, we create a style tag, set the content and insert into the head.");
			p36_nodes.forEach(detach);
			t123 = claim_space(section5_nodes);
			p37 = claim_element(section5_nodes, "P", {});
			var p37_nodes = children(p37);
			t124 = claim_text(p37_nodes, "To make sure that the button only targets this button that we just created, we add a class to the button.");
			p37_nodes.forEach(detach);
			t125 = claim_space(section5_nodes);
			p38 = claim_element(section5_nodes, "P", {});
			var p38_nodes = children(p38);
			t126 = claim_text(p38_nodes, "Here the class name is random, but it could be generated based on the hash of the style code, so you get consistent class name.");
			p38_nodes.forEach(detach);
			t127 = claim_space(section5_nodes);
			p39 = claim_element(section5_nodes, "P", {});
			var p39_nodes = children(p39);
			em1 = claim_element(p39_nodes, "EM", {});
			var em1_nodes = children(em1);
			t128 = claim_text(em1_nodes, "(CLICK TO VIEW JS OUTPUT)");
			em1_nodes.forEach(detach);
			p39_nodes.forEach(detach);
			t129 = claim_space(section5_nodes);
			p40 = claim_element(section5_nodes, "P", {});
			var p40_nodes = children(p40);
			t130 = claim_text(p40_nodes, "In fact if you take a look at the svelte generated JS output, it is very similar to the code we just wrote.");
			p40_nodes.forEach(detach);
			t131 = claim_space(section5_nodes);
			p41 = claim_element(section5_nodes, "P", {});
			var p41_nodes = children(p41);
			t132 = claim_text(p41_nodes, "So, this is just the code you need to ");
			strong7 = claim_element(p41_nodes, "STRONG", {});
			var strong7_nodes = children(strong7);
			t133 = claim_text(strong7_nodes, "create a button and a text");
			strong7_nodes.forEach(detach);
			t134 = claim_text(p41_nodes, ". You don't need 40KB Virtual DOM library to recreate the same component.");
			p41_nodes.forEach(detach);
			t135 = claim_space(section5_nodes);
			p42 = claim_element(section5_nodes, "P", {});
			var p42_nodes = children(p42);
			t136 = claim_text(p42_nodes, "Of course, you don't have to write all of these yourself.");
			p42_nodes.forEach(detach);
			t137 = claim_space(section5_nodes);
			p43 = claim_element(section5_nodes, "P", {});
			var p43_nodes = children(p43);
			t138 = claim_text(p43_nodes, "The Svelte compiler will do it for you. It will analyse the code above, and generate the code below for you.");
			p43_nodes.forEach(detach);
			t139 = claim_space(section5_nodes);
			p44 = claim_element(section5_nodes, "P", {});
			var p44_nodes = children(p44);
			t140 = claim_text(p44_nodes, "And now, if you try to choose \"SSR\" as the generated output, you can see now Svelte generates a function that returns a string composed using template literals.");
			p44_nodes.forEach(detach);
			t141 = claim_space(section5_nodes);
			p45 = claim_element(section5_nodes, "P", {});
			var p45_nodes = children(p45);
			t142 = claim_text(p45_nodes, "This is a few orders more performant than generating a tree object and serialising them into a HTML string.");
			p45_nodes.forEach(detach);
			t143 = claim_space(section5_nodes);
			p46 = claim_element(section5_nodes, "P", {});
			var p46_nodes = children(p46);
			em2 = claim_element(p46_nodes, "EM", {});
			var em2_nodes = children(em2);
			t144 = claim_text(em2_nodes, "(DONT MOVE)");
			em2_nodes.forEach(detach);
			p46_nodes.forEach(detach);
			t145 = claim_space(section5_nodes);
			p47 = claim_element(section5_nodes, "P", {});
			var p47_nodes = children(p47);
			t146 = claim_text(p47_nodes, "So, Let's take a few more examples of the Svelte syntax, and along the way, I hope you ask yourself this question, ");
			strong8 = claim_element(p47_nodes, "STRONG", {});
			var strong8_nodes = children(strong8);
			t147 = claim_text(strong8_nodes, "\"how do i convert this / write this in plain JavaScript?\"");
			strong8_nodes.forEach(detach);
			p47_nodes.forEach(detach);
			t148 = claim_space(section5_nodes);
			p48 = claim_element(section5_nodes, "P", {});
			var p48_nodes = children(p48);
			t149 = claim_text(p48_nodes, "and don't worry, you can find this repl on the svelte website. and you can compare the input and the js output anyway you want.");
			p48_nodes.forEach(detach);
			t150 = claim_space(section5_nodes);
			p49 = claim_element(section5_nodes, "P", {});
			var p49_nodes = children(p49);
			em3 = claim_element(p49_nodes, "EM", {});
			var em3_nodes = children(em3);
			t151 = claim_text(em3_nodes, "(OKAY NOW MOVE)");
			em3_nodes.forEach(detach);
			p49_nodes.forEach(detach);
			t152 = claim_space(section5_nodes);
			p50 = claim_element(section5_nodes, "P", {});
			var p50_nodes = children(p50);
			t153 = claim_text(p50_nodes, "To express logics within the template, Svelte provides logic block, such as ");
			strong9 = claim_element(p50_nodes, "STRONG", {});
			var strong9_nodes = children(strong9);
			code10 = claim_element(strong9_nodes, "CODE", {});
			var code10_nodes = children(code10);
			t154 = claim_text(code10_nodes, "{#if}");
			code10_nodes.forEach(detach);
			strong9_nodes.forEach(detach);
			t155 = claim_text(p50_nodes, ", ");
			strong10 = claim_element(p50_nodes, "STRONG", {});
			var strong10_nodes = children(strong10);
			code11 = claim_element(strong10_nodes, "CODE", {});
			var code11_nodes = children(code11);
			t156 = claim_text(code11_nodes, "{#await}");
			code11_nodes.forEach(detach);
			strong10_nodes.forEach(detach);
			t157 = claim_text(p50_nodes, ", and ");
			strong11 = claim_element(p50_nodes, "STRONG", {});
			var strong11_nodes = children(strong11);
			code12 = claim_element(strong11_nodes, "CODE", {});
			var code12_nodes = children(code12);
			t158 = claim_text(code12_nodes, "{#each}");
			code12_nodes.forEach(detach);
			strong11_nodes.forEach(detach);
			t159 = claim_text(p50_nodes, ".");
			p50_nodes.forEach(detach);
			t160 = claim_space(section5_nodes);
			p51 = claim_element(section5_nodes, "P", {});
			var p51_nodes = children(p51);
			t161 = claim_text(p51_nodes, "To reduce the boilerplate code for binding a variable to an input, Svelte provides the ");
			code13 = claim_element(p51_nodes, "CODE", {});
			var code13_nodes = children(code13);
			t162 = claim_text(code13_nodes, "bind:");
			code13_nodes.forEach(detach);
			t163 = claim_text(p51_nodes, " directive.");
			p51_nodes.forEach(detach);
			t164 = claim_space(section5_nodes);
			p52 = claim_element(section5_nodes, "P", {});
			var p52_nodes = children(p52);
			t165 = claim_text(p52_nodes, "To provide transition for elements coming into or out of the DOM, Svelte provides the ");
			code14 = claim_element(p52_nodes, "CODE", {});
			var code14_nodes = children(code14);
			t166 = claim_text(code14_nodes, "transition");
			code14_nodes.forEach(detach);
			t167 = claim_text(p52_nodes, ", ");
			code15 = claim_element(p52_nodes, "CODE", {});
			var code15_nodes = children(code15);
			t168 = claim_text(code15_nodes, "in");
			code15_nodes.forEach(detach);
			t169 = claim_text(p52_nodes, " and ");
			code16 = claim_element(p52_nodes, "CODE", {});
			var code16_nodes = children(code16);
			t170 = claim_text(code16_nodes, "out");
			code16_nodes.forEach(detach);
			t171 = claim_text(p52_nodes, " directive.");
			p52_nodes.forEach(detach);
			t172 = claim_space(section5_nodes);
			p53 = claim_element(section5_nodes, "P", {});
			var p53_nodes = children(p53);
			t173 = claim_text(p53_nodes, "To compose Components, Svelte provides slots and templates similar to the Web Component APIs.");
			p53_nodes.forEach(detach);
			t174 = claim_space(section5_nodes);
			p54 = claim_element(section5_nodes, "P", {});
			var p54_nodes = children(p54);
			t175 = claim_text(p54_nodes, "There's so much I would like to share here, but I have to segue into the Svelte compiler, because that's the main topic of today's talk.");
			p54_nodes.forEach(detach);
			t176 = claim_space(section5_nodes);
			p55 = claim_element(section5_nodes, "P", {});
			var p55_nodes = children(p55);
			t177 = claim_text(p55_nodes, "Now, finally, let's take a look at the Svelte compiler.");
			p55_nodes.forEach(detach);
			t178 = claim_space(section5_nodes);
			p56 = claim_element(section5_nodes, "P", {});
			var p56_nodes = children(p56);
			t179 = claim_text(p56_nodes, "So, how does a compiler works?");
			p56_nodes.forEach(detach);
			t180 = claim_space(section5_nodes);
			p57 = claim_element(section5_nodes, "P", {});
			var p57_nodes = children(p57);
			t181 = claim_text(p57_nodes, "A compiler first reads through your code, and break it down into smaller pieces, called tokens.");
			p57_nodes.forEach(detach);
			t182 = claim_space(section5_nodes);
			p58 = claim_element(section5_nodes, "P", {});
			var p58_nodes = children(p58);
			t183 = claim_text(p58_nodes, "The compiler then goes through this list of tokens and arrange them into a tree structure, according to the grammar of the language. The tree structure is what a compiler call “Abstract syntax tree” or AST for short.");
			p58_nodes.forEach(detach);
			t184 = claim_space(section5_nodes);
			p59 = claim_element(section5_nodes, "P", {});
			var p59_nodes = children(p59);
			t185 = claim_text(p59_nodes, "An AST is a tree representation of the input code.");
			p59_nodes.forEach(detach);
			t186 = claim_space(section5_nodes);
			p60 = claim_element(section5_nodes, "P", {});
			var p60_nodes = children(p60);
			t187 = claim_text(p60_nodes, "And what the compiler sometimes do, is to analyse and apply transformation to the AST.\nUsing tree traversal algorithms, such as depth first search");
			p60_nodes.forEach(detach);
			t188 = claim_space(section5_nodes);
			p61 = claim_element(section5_nodes, "P", {});
			var p61_nodes = children(p61);
			t189 = claim_text(p61_nodes, "And finally, the compiler generates a code output based on the final AST.");
			p61_nodes.forEach(detach);
			t190 = claim_space(section5_nodes);
			p62 = claim_element(section5_nodes, "P", {});
			var p62_nodes = children(p62);
			t191 = claim_text(p62_nodes, "In summary, a generic compilation process involves parsing the code to an AST, doing analysis, optimsiation or transformation on the AST, and then generate code out from the AST.");
			p62_nodes.forEach(detach);
			t192 = claim_space(section5_nodes);
			p63 = claim_element(section5_nodes, "P", {});
			var p63_nodes = children(p63);
			t193 = claim_text(p63_nodes, "Finally, let's take a look how Svelte compiler works.");
			p63_nodes.forEach(detach);
			t194 = claim_space(section5_nodes);
			p64 = claim_element(section5_nodes, "P", {});
			var p64_nodes = children(p64);
			t195 = claim_text(p64_nodes, "Svelte parses the Svelte code into AST");
			p64_nodes.forEach(detach);
			t196 = claim_space(section5_nodes);
			p65 = claim_element(section5_nodes, "P", {});
			var p65_nodes = children(p65);
			t197 = claim_text(p65_nodes, "Svelte then analyses the AST, which we will explore in detailed later.");
			p65_nodes.forEach(detach);
			t198 = claim_space(section5_nodes);
			p66 = claim_element(section5_nodes, "P", {});
			var p66_nodes = children(p66);
			t199 = claim_text(p66_nodes, "With the analysis, Svelte generates JavaScript code depending on the compile target, whether it's for SSR or it's for the browser.\nFinally, js and css is generated, and can be written into a file or be consumed by your build process.");
			p66_nodes.forEach(detach);
			t200 = claim_space(section5_nodes);
			p67 = claim_element(section5_nodes, "P", {});
			var p67_nodes = children(p67);
			t201 = claim_text(p67_nodes, "So lets start from the beginning, the parsing.");
			p67_nodes.forEach(detach);
			t202 = claim_space(section5_nodes);
			p68 = claim_element(section5_nodes, "P", {});
			var p68_nodes = children(p68);
			t203 = claim_text(p68_nodes, "Here is a Svelte component that we are going to use throughout this talk.");
			p68_nodes.forEach(detach);
			t204 = claim_space(section5_nodes);
			p69 = claim_element(section5_nodes, "P", {});
			var p69_nodes = children(p69);
			t205 = claim_text(p69_nodes, "Svelte, implements its own parser");
			p69_nodes.forEach(detach);
			t206 = claim_space(section5_nodes);
			p70 = claim_element(section5_nodes, "P", {});
			var p70_nodes = children(p70);
			t207 = claim_text(p70_nodes, "That parses the html syntax, as well as logic blocks, like each, if, and await");
			p70_nodes.forEach(detach);
			t208 = claim_space(section5_nodes);
			p71 = claim_element(section5_nodes, "P", {});
			var p71_nodes = children(p71);
			t209 = claim_text(p71_nodes, "Because js is a fairly complex language, whenever svelte encounters a script tag, or a curly brackets, it will hand it over to acorn, a lightweight JavaScript parser, to parse the JS content.\nThe same thing goes with css as well. svelte uses css-tree to parse CSS content in between the style tag.");
			p71_nodes.forEach(detach);
			t210 = claim_space(section5_nodes);
			p72 = claim_element(section5_nodes, "P", {});
			var p72_nodes = children(p72);
			t211 = claim_text(p72_nodes, "So, through the process, the svelte code is broken down into tokens, and is arranged into the Svelte AST.");
			p72_nodes.forEach(detach);
			t212 = claim_space(section5_nodes);
			p73 = claim_element(section5_nodes, "P", {});
			var p73_nodes = children(p73);
			t213 = claim_text(p73_nodes, "If you interested to see how the Svelte AST looks like, you can check them out at ASTExplorer.net.");
			p73_nodes.forEach(detach);
			t214 = claim_space(section5_nodes);
			p74 = claim_element(section5_nodes, "P", {});
			var p74_nodes = children(p74);
			t215 = claim_text(p74_nodes, "The next step is to analyse the AST.");
			p74_nodes.forEach(detach);
			t216 = claim_space(section5_nodes);
			p75 = claim_element(section5_nodes, "P", {});
			var p75_nodes = children(p75);
			t217 = claim_text(p75_nodes, "Here, our code is already in AST, BUT to help visualise the process, i'm going to show you the original code.");
			p75_nodes.forEach(detach);
			t218 = claim_space(section5_nodes);
			p76 = claim_element(section5_nodes, "P", {});
			var p76_nodes = children(p76);
			t219 = claim_text(p76_nodes, "The first thing Svelte do is to traverse through the script AST.");
			p76_nodes.forEach(detach);
			t220 = claim_space(section5_nodes);
			p77 = claim_element(section5_nodes, "P", {});
			var p77_nodes = children(p77);
			t221 = claim_text(p77_nodes, "Whenever it encounters a variable, in this case, count, it will record down the variable name.");
			p77_nodes.forEach(detach);
			t222 = claim_space(section5_nodes);
			p78 = claim_element(section5_nodes, "P", {});
			var p78_nodes = children(p78);
			t223 = claim_text(p78_nodes, "here we record values and double.");
			p78_nodes.forEach(detach);
			t224 = claim_space(section5_nodes);
			p79 = claim_element(section5_nodes, "P", {});
			var p79_nodes = children(p79);
			t225 = claim_text(p79_nodes, "the \"double\" here, in this svelte code is a reactive declared variable. but to vanilla JavaScript, we are assigning value to this variable \"double\", which is not declared anywhere.");
			p79_nodes.forEach(detach);
			t226 = claim_space(section5_nodes);
			p80 = claim_element(section5_nodes, "P", {});
			var p80_nodes = children(p80);
			t227 = claim_text(p80_nodes, "in strict mode, this is a \"assignment to undeclared variable\" error.");
			p80_nodes.forEach(detach);
			t228 = claim_space(section5_nodes);
			p81 = claim_element(section5_nodes, "P", {});
			var p81_nodes = children(p81);
			t229 = claim_text(p81_nodes, "Svelte marks the variable, \"double\", as \"injected\", so the declaration of the variable will be injected later. other examples of injected variables are svelte magic global, such as $$props, or a $ prefix of a store variable.");
			p81_nodes.forEach(detach);
			t230 = claim_space(section5_nodes);
			p82 = claim_element(section5_nodes, "P", {});
			var p82_nodes = children(p82);
			t231 = claim_text(p82_nodes, "here we encounter \"count\" again, this time its being referenced, instead of being assinged to a value, and it is used to compute the value of double. so we draw a dependency relationship between count and double.so double is depending on count.");
			p82_nodes.forEach(detach);
			t232 = claim_space(section5_nodes);
			p83 = claim_element(section5_nodes, "P", {});
			var p83_nodes = children(p83);
			t233 = claim_text(p83_nodes, "lets continue.");
			p83_nodes.forEach(detach);
			t234 = claim_space(section5_nodes);
			p84 = claim_element(section5_nodes, "P", {});
			var p84_nodes = children(p84);
			t235 = claim_text(p84_nodes, "here we see data. data is not declared at the top level scope, as it is within the curly bracket block scope. so we are not going to record it down.");
			p84_nodes.forEach(detach);
			t236 = claim_space(section5_nodes);
			p85 = claim_element(section5_nodes, "P", {});
			var p85_nodes = children(p85);
			t237 = claim_text(p85_nodes, "same thing goes with ");
			code17 = claim_element(p85_nodes, "CODE", {});
			var code17_nodes = children(code17);
			t238 = claim_text(code17_nodes, "i");
			code17_nodes.forEach(detach);
			t239 = claim_text(p85_nodes, ".");
			p85_nodes.forEach(detach);
			t240 = claim_space(section5_nodes);
			p86 = claim_element(section5_nodes, "P", {});
			var p86_nodes = children(p86);
			t241 = claim_text(p86_nodes, "here we encountered double again, so we mark it as referenced.");
			p86_nodes.forEach(detach);
			t242 = claim_space(section5_nodes);
			p87 = claim_element(section5_nodes, "P", {});
			var p87_nodes = children(p87);
			t243 = claim_text(p87_nodes, "Math, a js global, we are going to ignore it.");
			p87_nodes.forEach(detach);
			t244 = claim_space(section5_nodes);
			p88 = claim_element(section5_nodes, "P", {});
			var p88_nodes = children(p88);
			t245 = claim_text(p88_nodes, "here ");
			code18 = claim_element(p88_nodes, "CODE", {});
			var code18_nodes = children(code18);
			t246 = claim_text(code18_nodes, "values");
			code18_nodes.forEach(detach);
			t247 = claim_text(p88_nodes, " is mutated.");
			p88_nodes.forEach(detach);
			t248 = claim_space(section5_nodes);
			p89 = claim_element(section5_nodes, "P", {});
			var p89_nodes = children(p89);
			t249 = claim_text(p89_nodes, "now we reach the end of the script, the next step is to traverse the template AST.");
			p89_nodes.forEach(detach);
			t250 = claim_space(section5_nodes);
			p90 = claim_element(section5_nodes, "P", {});
			var p90_nodes = children(p90);
			t251 = claim_text(p90_nodes, "we start from the ");
			code19 = claim_element(p90_nodes, "CODE", {});
			var code19_nodes = children(code19);
			t252 = claim_text(code19_nodes, "input");
			code19_nodes.forEach(detach);
			t253 = claim_text(p90_nodes, " element, which has a ");
			code20 = claim_element(p90_nodes, "CODE", {});
			var code20_nodes = children(code20);
			t254 = claim_text(code20_nodes, "bind:value");
			code20_nodes.forEach(detach);
			t255 = claim_text(p90_nodes, ".");
			p90_nodes.forEach(detach);
			t256 = claim_space(section5_nodes);
			p91 = claim_element(section5_nodes, "P", {});
			var p91_nodes = children(p91);
			t257 = claim_text(p91_nodes, "Here we are binding the value of the input to the variable ");
			code21 = claim_element(p91_nodes, "CODE", {});
			var code21_nodes = children(code21);
			t258 = claim_text(code21_nodes, "count");
			code21_nodes.forEach(detach);
			t259 = claim_text(p91_nodes, ". so we mark ");
			code22 = claim_element(p91_nodes, "CODE", {});
			var code22_nodes = children(code22);
			t260 = claim_text(code22_nodes, "count");
			code22_nodes.forEach(detach);
			t261 = claim_text(p91_nodes, " as referenced from template and mutated.");
			p91_nodes.forEach(detach);
			t262 = claim_space(section5_nodes);
			p92 = claim_element(section5_nodes, "P", {});
			var p92_nodes = children(p92);
			t263 = claim_text(p92_nodes, "Now we encountered the each block. Here we are iterating through the variable ");
			code23 = claim_element(p92_nodes, "CODE", {});
			var code23_nodes = children(code23);
			t264 = claim_text(code23_nodes, "values");
			code23_nodes.forEach(detach);
			t265 = claim_text(p92_nodes, " and we are using the variable ");
			code24 = claim_element(p92_nodes, "CODE", {});
			var code24_nodes = children(code24);
			t266 = claim_text(code24_nodes, "value");
			code24_nodes.forEach(detach);
			t267 = claim_text(p92_nodes, " as each item. So the template within the each block will have a new scope, where ");
			code25 = claim_element(p92_nodes, "CODE", {});
			var code25_nodes = children(code25);
			t268 = claim_text(code25_nodes, "value");
			code25_nodes.forEach(detach);
			t269 = claim_text(p92_nodes, " is declared. Also, we mark ");
			code26 = claim_element(p92_nodes, "CODE", {});
			var code26_nodes = children(code26);
			t270 = claim_text(code26_nodes, "values");
			code26_nodes.forEach(detach);
			t271 = claim_text(p92_nodes, " as the dependency of the each block. This means that whenever ");
			code27 = claim_element(p92_nodes, "CODE", {});
			var code27_nodes = children(code27);
			t272 = claim_text(code27_nodes, "values");
			code27_nodes.forEach(detach);
			t273 = claim_text(p92_nodes, " has changed, we are going to update the each block.");
			p92_nodes.forEach(detach);
			t274 = claim_space(section5_nodes);
			p93 = claim_element(section5_nodes, "P", {});
			var p93_nodes = children(p93);
			t275 = claim_text(p93_nodes, "...and, we mark values as referenced too.");
			p93_nodes.forEach(detach);
			t276 = claim_space(section5_nodes);
			p94 = claim_element(section5_nodes, "P", {});
			var p94_nodes = children(p94);
			t277 = claim_text(p94_nodes, "next, we move into the each block and the div element. Here we mark ");
			code28 = claim_element(p94_nodes, "CODE", {});
			var code28_nodes = children(code28);
			t278 = claim_text(code28_nodes, "value");
			code28_nodes.forEach(detach);
			t279 = claim_text(p94_nodes, " as referenced from the template, we encounter ");
			code29 = claim_element(p94_nodes, "CODE", {});
			var code29_nodes = children(code29);
			t280 = claim_text(code29_nodes, "value");
			code29_nodes.forEach(detach);
			t281 = claim_text(p94_nodes, " again and we've reachead the end of the template.");
			p94_nodes.forEach(detach);
			t282 = claim_space(section5_nodes);
			p95 = claim_element(section5_nodes, "P", {});
			var p95_nodes = children(p95);
			t283 = claim_text(p95_nodes, "and Svelte traverse through the script again, this time mainly for optimisation. figuring out which variables are not referenced, and does not need to be reactive.");
			p95_nodes.forEach(detach);
			t284 = claim_space(section5_nodes);
			p96 = claim_element(section5_nodes, "P", {});
			var p96_nodes = children(p96);
			t285 = claim_text(p96_nodes, "Similarly, if a reactive declaration's dependency will never change, by seeing whether their dependencies were marked as mutated, we can mark it as static, which is more efficient, and much smaller in code size.");
			p96_nodes.forEach(detach);
			t286 = claim_space(section5_nodes);
			p97 = claim_element(section5_nodes, "P", {});
			var p97_nodes = children(p97);
			t287 = claim_text(p97_nodes, "Next, Svelte traverse through the style.");
			p97_nodes.forEach(detach);
			t288 = claim_space(section5_nodes);
			p98 = claim_element(section5_nodes, "P", {});
			var p98_nodes = children(p98);
			t289 = claim_text(p98_nodes, "for each selector, it will determine whether it will match any elements in the template, and if it does, svelte will add a svelte-hash class name to the selector as well as the matched eelement. Although this will increase the specificity of the selector, but it will make the selector scoped only to the current svelte component.");
			p98_nodes.forEach(detach);
			t290 = claim_space(section5_nodes);
			p99 = claim_element(section5_nodes, "P", {});
			var p99_nodes = children(p99);
			t291 = claim_text(p99_nodes, "At the end of this step, Svelte has figured out all the variables declared, their behavior and their relationship.");
			p99_nodes.forEach(detach);
			t292 = claim_space(section5_nodes);
			p100 = claim_element(section5_nodes, "P", {});
			var p100_nodes = children(p100);
			t293 = claim_text(p100_nodes, "With this, we are moving on to the rendering phase.");
			p100_nodes.forEach(detach);
			t294 = claim_space(section5_nodes);
			p101 = claim_element(section5_nodes, "P", {});
			var p101_nodes = children(p101);
			t295 = claim_text(p101_nodes, "This step is where svelte will generate the javascript code.\nThere are 2 different compile targets, 1 is DOM, for the client side, and another is ssr, for the server side.");
			p101_nodes.forEach(detach);
			t296 = claim_space(section5_nodes);
			p102 = claim_element(section5_nodes, "P", {});
			var p102_nodes = children(p102);
			t297 = claim_text(p102_nodes, "Lets first take a look at the dom render target.");
			p102_nodes.forEach(detach);
			t298 = claim_space(section5_nodes);
			p103 = claim_element(section5_nodes, "P", {});
			var p103_nodes = children(p103);
			t299 = claim_text(p103_nodes, "Here we have the source code. and here is the outline of how a dom output looks like.");
			p103_nodes.forEach(detach);
			t300 = claim_space(section5_nodes);
			p104 = claim_element(section5_nodes, "P", {});
			var p104_nodes = children(p104);
			t301 = claim_text(p104_nodes, "Here is what I called a fragment block. the create fragment function returns an object, that acts as a recipe to create the elements in the component. each method in the recipe object, represents a stage in the component lifecycle, here we have ");
			code30 = claim_element(p104_nodes, "CODE", {});
			var code30_nodes = children(code30);
			t302 = claim_text(code30_nodes, "c");
			code30_nodes.forEach(detach);
			t303 = claim_text(p104_nodes, " for ");
			code31 = claim_element(p104_nodes, "CODE", {});
			var code31_nodes = children(code31);
			t304 = claim_text(code31_nodes, "create");
			code31_nodes.forEach(detach);
			t305 = claim_text(p104_nodes, ", ");
			code32 = claim_element(p104_nodes, "CODE", {});
			var code32_nodes = children(code32);
			t306 = claim_text(code32_nodes, "m");
			code32_nodes.forEach(detach);
			t307 = claim_text(p104_nodes, " for ");
			code33 = claim_element(p104_nodes, "CODE", {});
			var code33_nodes = children(code33);
			t308 = claim_text(code33_nodes, "mounting");
			code33_nodes.forEach(detach);
			t309 = claim_text(p104_nodes, ", ");
			code34 = claim_element(p104_nodes, "CODE", {});
			var code34_nodes = children(code34);
			t310 = claim_text(code34_nodes, "p");
			code34_nodes.forEach(detach);
			t311 = claim_text(p104_nodes, " for ");
			code35 = claim_element(p104_nodes, "CODE", {});
			var code35_nodes = children(code35);
			t312 = claim_text(code35_nodes, "update");
			code35_nodes.forEach(detach);
			t313 = claim_text(p104_nodes, ", and ");
			code36 = claim_element(p104_nodes, "CODE", {});
			var code36_nodes = children(code36);
			t314 = claim_text(code36_nodes, "d");
			code36_nodes.forEach(detach);
			t315 = claim_text(p104_nodes, " for ");
			code37 = claim_element(p104_nodes, "CODE", {});
			var code37_nodes = children(code37);
			t316 = claim_text(code37_nodes, "destroy");
			code37_nodes.forEach(detach);
			t317 = claim_text(p104_nodes, ".");
			p104_nodes.forEach(detach);
			t318 = claim_space(section5_nodes);
			p105 = claim_element(section5_nodes, "P", {});
			var p105_nodes = children(p105);
			t319 = claim_text(p105_nodes, "next on, we have the instance function. here's where the state and component logic goes into.");
			p105_nodes.forEach(detach);
			t320 = claim_space(section5_nodes);
			p106 = claim_element(section5_nodes, "P", {});
			var p106_nodes = children(p106);
			t321 = claim_text(p106_nodes, "finally we have the svelte component class. so each svelte component is compiled into a class which is the default export. in the constructor, as you can see, calls the ");
			code38 = claim_element(p106_nodes, "CODE", {});
			var code38_nodes = children(code38);
			t322 = claim_text(code38_nodes, "init");
			code38_nodes.forEach(detach);
			t323 = claim_text(p106_nodes, " function which takes in the ");
			code39 = claim_element(p106_nodes, "CODE", {});
			var code39_nodes = children(code39);
			t324 = claim_text(code39_nodes, "instance");
			code39_nodes.forEach(detach);
			t325 = claim_text(p106_nodes, " and ");
			code40 = claim_element(p106_nodes, "CODE", {});
			var code40_nodes = children(code40);
			t326 = claim_text(code40_nodes, "create_fragment");
			code40_nodes.forEach(detach);
			t327 = claim_text(p106_nodes, " function. and this is how the 3 different pieces of the svelte compoenent come together.");
			p106_nodes.forEach(detach);
			t328 = claim_space(section5_nodes);
			p107 = claim_element(section5_nodes, "P", {});
			var p107_nodes = children(p107);
			t329 = claim_text(p107_nodes, "Now, svelte walks through the template again, and starts inserting code into output.");
			p107_nodes.forEach(detach);
			t330 = claim_space(section5_nodes);
			p108 = claim_element(section5_nodes, "P", {});
			var p108_nodes = children(p108);
			t331 = claim_text(p108_nodes, "First we have the input element. we insert instructions to create the input element, mounting the element to the target, and remove the element from the target.");
			p108_nodes.forEach(detach);
			t332 = claim_space(section5_nodes);
			p109 = claim_element(section5_nodes, "P", {});
			var p109_nodes = children(p109);
			t333 = claim_text(p109_nodes, "next we have the binding of the input value to the ");
			code41 = claim_element(p109_nodes, "CODE", {});
			var code41_nodes = children(code41);
			t334 = claim_text(code41_nodes, "count");
			code41_nodes.forEach(detach);
			t335 = claim_text(p109_nodes, " variable. we need an input handler to listen to the input changes, so we can update the value of the ");
			code42 = claim_element(p109_nodes, "CODE", {});
			var code42_nodes = children(code42);
			t336 = claim_text(code42_nodes, "count");
			code42_nodes.forEach(detach);
			t337 = claim_text(p109_nodes, " variable. here we pull out the variables list, and add ");
			code43 = claim_element(p109_nodes, "CODE", {});
			var code43_nodes = children(code43);
			t338 = claim_text(code43_nodes, "input_handler");
			code43_nodes.forEach(detach);
			t339 = claim_text(p109_nodes, ".");
			p109_nodes.forEach(detach);
			t340 = claim_space(section5_nodes);
			p110 = claim_element(section5_nodes, "P", {});
			var p110_nodes = children(p110);
			t341 = claim_text(p110_nodes, "we set the input value based on the variable count and add event listener for input changes which we should remove event listener when we destroy the component.");
			p110_nodes.forEach(detach);
			t342 = claim_space(section5_nodes);
			p111 = claim_element(section5_nodes, "P", {});
			var p111_nodes = children(p111);
			t343 = claim_text(p111_nodes, "and in the update phase, if the ");
			code44 = claim_element(p111_nodes, "CODE", {});
			var code44_nodes = children(code44);
			t344 = claim_text(code44_nodes, "count");
			code44_nodes.forEach(detach);
			t345 = claim_text(p111_nodes, " has changed, we need to update the value of the input based on the value of ");
			code45 = claim_element(p111_nodes, "CODE", {});
			var code45_nodes = children(code45);
			t346 = claim_text(code45_nodes, "count");
			code45_nodes.forEach(detach);
			t347 = claim_text(p111_nodes, ".");
			p111_nodes.forEach(detach);
			t348 = claim_space(section5_nodes);
			p112 = claim_element(section5_nodes, "P", {});
			var p112_nodes = children(p112);
			t349 = claim_text(p112_nodes, "next we move on to the each block.");
			p112_nodes.forEach(detach);
			t350 = claim_space(section5_nodes);
			p113 = claim_element(section5_nodes, "P", {});
			var p113_nodes = children(p113);
			t351 = claim_text(p113_nodes, "we create a new fragment block for the each block, which contains the recipe for creating elements for 1 each item. And because in the each block we have a child scope that defines the variable ");
			code46 = claim_element(p113_nodes, "CODE", {});
			var code46_nodes = children(code46);
			t352 = claim_text(code46_nodes, "value");
			code46_nodes.forEach(detach);
			t353 = claim_text(p113_nodes, ", we have a ");
			code47 = claim_element(p113_nodes, "CODE", {});
			var code47_nodes = children(code47);
			t354 = claim_text(code47_nodes, "get_each_context");
			code47_nodes.forEach(detach);
			t355 = claim_text(p113_nodes, " function to emulate that.");
			p113_nodes.forEach(detach);
			t356 = claim_space(section5_nodes);
			p114 = claim_element(section5_nodes, "P", {});
			var p114_nodes = children(p114);
			t357 = claim_text(p114_nodes, "Here we fast forward through the steps, where for each element, we insert code for how we create, mount, update and destroy them. If you are interested to know the details, you can check out my series of blog, called \"Compile Svelte in your head\".");
			p114_nodes.forEach(detach);
			t358 = claim_space(section5_nodes);
			p115 = claim_element(section5_nodes, "P", {});
			var p115_nodes = children(p115);
			t359 = claim_text(p115_nodes, "Now we look at how Svelte fills up the instance function. In most cases, Svelte just copies over whatever is written within the ");
			code48 = claim_element(p115_nodes, "CODE", {});
			var code48_nodes = children(code48);
			t360 = claim_text(code48_nodes, "<script>");
			code48_nodes.forEach(detach);
			t361 = claim_text(p115_nodes, " tag.");
			p115_nodes.forEach(detach);
			t362 = claim_space(section5_nodes);
			p116 = claim_element(section5_nodes, "P", {});
			var p116_nodes = children(p116);
			t363 = claim_text(p116_nodes, "For reactive declarations, they were added inside the ");
			code49 = claim_element(p116_nodes, "CODE", {});
			var code49_nodes = children(code49);
			t364 = claim_text(code49_nodes, "$$.update");
			code49_nodes.forEach(detach);
			t365 = claim_text(p116_nodes, " function, and for each statement, we add an if statement to check whether their dependency has changed, based on the dependency relationship we've drawn earlier.");
			p116_nodes.forEach(detach);
			t366 = claim_space(section5_nodes);
			p117 = claim_element(section5_nodes, "P", {});
			var p117_nodes = children(p117);
			t367 = claim_text(p117_nodes, "Now we need to declare and add those injected variables.");
			p117_nodes.forEach(detach);
			t368 = claim_space(section5_nodes);
			p118 = claim_element(section5_nodes, "P", {});
			var p118_nodes = children(p118);
			t369 = claim_text(p118_nodes, "Finally, we return the list of variables that are ");
			strong12 = claim_element(p118_nodes, "STRONG", {});
			var strong12_nodes = children(strong12);
			t370 = claim_text(strong12_nodes, "referenced by the template");
			strong12_nodes.forEach(detach);
			t371 = claim_text(p118_nodes, " only.");
			p118_nodes.forEach(detach);
			t372 = claim_space(section5_nodes);
			p119 = claim_element(section5_nodes, "P", {});
			var p119_nodes = children(p119);
			t373 = claim_text(p119_nodes, "Now, to make the variables actually reactive, we instruments the ");
			code50 = claim_element(p119_nodes, "CODE", {});
			var code50_nodes = children(code50);
			t374 = claim_text(code50_nodes, "$$invalidate");
			code50_nodes.forEach(detach);
			t375 = claim_text(p119_nodes, " after each assignment statements, so that it will kickstart a next round of update cycle.");
			p119_nodes.forEach(detach);
			t376 = claim_space(section5_nodes);
			p120 = claim_element(section5_nodes, "P", {});
			var p120_nodes = children(p120);
			t377 = claim_text(p120_nodes, "So here you have it, the compile output for the DOM target.");
			p120_nodes.forEach(detach);
			t378 = claim_space(section5_nodes);
			p121 = claim_element(section5_nodes, "P", {});
			var p121_nodes = children(p121);
			t379 = claim_text(p121_nodes, "Let's take a quick look at how things going for compiling to the SSR target.");
			p121_nodes.forEach(detach);
			t380 = claim_space(section5_nodes);
			p122 = claim_element(section5_nodes, "P", {});
			var p122_nodes = children(p122);
			t381 = claim_text(p122_nodes, "The structure of the output code for the SSR target is much simpler. it is a function that returns a string.");
			p122_nodes.forEach(detach);
			t382 = claim_space(section5_nodes);
			p123 = claim_element(section5_nodes, "P", {});
			var p123_nodes = children(p123);
			t383 = claim_text(p123_nodes, "Because there wont be any reactivity needed in the server, we can copy over the code verbatim from the script tag. same thing goes with reactive declarations, of course we need to remember to declare the injected variable, ");
			code51 = claim_element(p123_nodes, "CODE", {});
			var code51_nodes = children(code51);
			t384 = claim_text(code51_nodes, "double");
			code51_nodes.forEach(detach);
			t385 = claim_text(p123_nodes, ".");
			p123_nodes.forEach(detach);
			t386 = claim_space(section5_nodes);
			p124 = claim_element(section5_nodes, "P", {});
			var p124_nodes = children(p124);
			t387 = claim_text(p124_nodes, "as we traverse through the template, we add insert strings or expressions into the output template literal. For the each block, we iterate through the variable ");
			code52 = claim_element(p124_nodes, "CODE", {});
			var code52_nodes = children(code52);
			t388 = claim_text(code52_nodes, "values");
			code52_nodes.forEach(detach);
			t389 = claim_text(p124_nodes, " and return the child elements as string.");
			p124_nodes.forEach(detach);
			t390 = claim_space(section5_nodes);
			p125 = claim_element(section5_nodes, "P", {});
			var p125_nodes = children(p125);
			t391 = claim_text(p125_nodes, "And there you go, the output code of a svelte component for SSR.");
			p125_nodes.forEach(detach);
			t392 = claim_space(section5_nodes);
			p126 = claim_element(section5_nodes, "P", {});
			var p126_nodes = children(p126);
			t393 = claim_text(p126_nodes, "Finally, Svelte outputs the code in JS and CSS, with the code as string as well as the sourcemap.");
			p126_nodes.forEach(detach);
			t394 = claim_space(section5_nodes);
			p127 = claim_element(section5_nodes, "P", {});
			var p127_nodes = children(p127);
			t395 = claim_text(p127_nodes, "These can be written into file system directly, or be consumed by your module bundler, such as rollup-svelte-plugin in rollup or svelte-loader for webpack.");
			p127_nodes.forEach(detach);
			t396 = claim_space(section5_nodes);
			p128 = claim_element(section5_nodes, "P", {});
			var p128_nodes = children(p128);
			t397 = claim_text(p128_nodes, "So lets review again the svelte compilation pipeline,\nSvelte parses the code into ast, runs a series of steps to analsye the code, tracking the variable references and dependencies. Then svelte generates the code depending on the compile target, whether it's for the client side or server-side.\nAnd the output of the render step is in terms of JS and CSS, which can be written into a file / consumed by your build tools.");
			p128_nodes.forEach(detach);
			t398 = claim_space(section5_nodes);
			p129 = claim_element(section5_nodes, "P", {});
			var p129_nodes = children(p129);
			t399 = claim_text(p129_nodes, "Thank you so much for listening. If you like to learn more about svelte, or if you have any questions about svelte, you can follow me on twitter. I am Li Hau. hope you have fun with the talks throughout the conference.");
			p129_nodes.forEach(detach);
			t400 = claim_space(section5_nodes);
			p130 = claim_element(section5_nodes, "P", {});
			var p130_nodes = children(p130);
			t401 = claim_text(p130_nodes, "See ya.");
			p130_nodes.forEach(detach);
			section5_nodes.forEach(detach);
			this.h();
		},
		h() {
			attr(a0, "href", "#recorded-talk");
			attr(a1, "href", "#cityjs-conference");
			attr(a2, "href", "#mmt-tech-meetup-sept");
			attr(a3, "href", "#slides");
			attr(a4, "href", "#script");
			attr(ul1, "class", "sitemap");
			attr(ul1, "id", "sitemap");
			attr(ul1, "role", "navigation");
			attr(ul1, "aria-label", "Table of Contents");
			attr(a5, "href", "#recorded-talk");
			attr(a5, "id", "recorded-talk");
			attr(a6, "href", "#cityjs-conference");
			attr(a6, "id", "cityjs-conference");
			attr(iframe0, "width", "560");
			attr(iframe0, "height", "315");
			if (iframe0.src !== (iframe0_src_value = "https://www.youtube.com/embed/sP7dtZm_Wx0?start=6618")) attr(iframe0, "src", iframe0_src_value);
			attr(iframe0, "frameborder", "0");
			attr(iframe0, "allow", "accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture");
			iframe0.allowFullscreen = true;
			attr(a7, "href", "#mmt-tech-meetup-sept");
			attr(a7, "id", "mmt-tech-meetup-sept");
			attr(iframe1, "width", "560");
			attr(iframe1, "height", "315");
			if (iframe1.src !== (iframe1_src_value = "https://www.youtube.com/embed/tT1altUaaJU")) attr(iframe1, "src", iframe1_src_value);
			attr(iframe1, "frameborder", "0");
			attr(iframe1, "allow", "accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture");
			iframe1.allowFullscreen = true;
			attr(a8, "href", "#slides");
			attr(a8, "id", "slides");
			attr(a9, "href", "/slides/svelte-compiler/");
			attr(a10, "href", "#script");
			attr(a10, "id", "script");
		},
		m(target, anchor) {
			insert(target, section0, anchor);
			append(section0, ul1);
			append(ul1, li0);
			append(li0, a0);
			append(a0, t0);
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
			insert(target, t5, anchor);
			insert(target, section1, anchor);
			append(section1, h20);
			append(h20, a5);
			append(a5, t6);
			insert(target, t7, anchor);
			insert(target, section2, anchor);
			append(section2, h30);
			append(h30, a6);
			append(a6, t8);
			append(section2, t9);
			append(section2, iframe0);
			insert(target, t10, anchor);
			insert(target, section3, anchor);
			append(section3, h31);
			append(h31, a7);
			append(a7, t11);
			append(section3, t12);
			append(section3, iframe1);
			insert(target, t13, anchor);
			insert(target, section4, anchor);
			append(section4, h21);
			append(h21, a8);
			append(a8, t14);
			append(section4, t15);
			append(section4, p0);
			append(p0, t16);
			append(p0, a9);
			append(a9, t17);
			append(p0, t18);
			insert(target, t19, anchor);
			insert(target, section5, anchor);
			append(section5, h22);
			append(h22, a10);
			append(a10, t20);
			append(section5, t21);
			append(section5, p1);
			append(p1, t22);
			append(p1, strong0);
			append(strong0, t23);
			append(p1, t24);
			append(section5, t25);
			append(section5, p2);
			append(p2, t26);
			append(section5, t27);
			append(section5, p3);
			append(p3, t28);
			append(section5, t29);
			append(section5, p4);
			append(p4, t30);
			append(section5, t31);
			append(section5, p5);
			append(p5, strong1);
			append(strong1, t32);
			append(section5, t33);
			append(section5, p6);
			append(p6, t34);
			append(p6, code0);
			append(code0, t35);
			append(p6, t36);
			append(section5, t37);
			append(section5, p7);
			append(p7, t38);
			append(section5, t39);
			append(section5, p8);
			append(p8, t40);
			append(p8, code1);
			append(code1, t41);
			append(p8, t42);
			append(section5, t43);
			append(section5, p9);
			append(p9, t44);
			append(section5, t45);
			append(section5, p10);
			append(p10, t46);
			append(section5, t47);
			append(section5, p11);
			append(p11, t48);
			append(p11, strong2);
			append(strong2, t49);
			append(p11, t50);
			append(section5, t51);
			append(section5, p12);
			append(p12, t52);
			append(p12, code2);
			append(code2, t53);
			append(p12, t54);
			append(section5, t55);
			append(section5, p13);
			append(p13, t56);
			append(section5, t57);
			append(section5, p14);
			append(p14, t58);
			append(section5, t59);
			append(section5, p15);
			append(p15, t60);
			append(p15, strong3);
			append(strong3, t61);
			append(p15, t62);
			append(p15, strong4);
			append(strong4, t63);
			append(p15, t64);
			append(section5, t65);
			append(section5, p16);
			append(p16, t66);
			append(section5, t67);
			append(section5, p17);
			append(p17, t68);
			append(section5, t69);
			append(section5, p18);
			append(p18, t70);
			append(section5, t71);
			append(section5, p19);
			append(p19, t72);
			append(section5, t73);
			append(section5, p20);
			append(p20, t74);
			append(section5, t75);
			append(section5, p21);
			append(p21, t76);
			append(section5, t77);
			append(section5, p22);
			append(p22, t78);
			append(p22, code3);
			append(code3, t79);
			append(p22, t80);
			append(section5, t81);
			append(section5, p23);
			append(p23, t82);
			append(section5, t83);
			append(section5, p24);
			append(p24, t84);
			append(p24, code4);
			append(code4, t85);
			append(p24, t86);
			append(section5, t87);
			append(section5, p25);
			append(p25, t88);
			append(section5, t89);
			append(section5, p26);
			append(p26, strong5);
			append(strong5, t90);
			append(p26, t91);
			append(section5, t92);
			append(section5, p27);
			append(p27, t93);
			append(p27, code5);
			append(code5, t94);
			append(p27, t95);
			append(p27, code6);
			append(code6, t96);
			append(p27, t97);
			append(p27, code7);
			append(code7, t98);
			append(p27, t99);
			append(p27, code8);
			append(code8, t100);
			append(p27, t101);
			append(p27, code9);
			append(code9, t102);
			append(p27, t103);
			append(section5, t104);
			append(section5, p28);
			append(p28, t105);
			append(section5, t106);
			append(section5, p29);
			append(p29, t107);
			append(section5, t108);
			append(section5, p30);
			append(p30, t109);
			append(p30, strong6);
			append(strong6, t110);
			append(section5, t111);
			append(section5, p31);
			append(p31, em0);
			append(em0, t112);
			append(section5, t113);
			append(section5, p32);
			append(p32, t114);
			append(section5, t115);
			append(section5, p33);
			append(p33, t116);
			append(section5, t117);
			append(section5, p34);
			append(p34, t118);
			append(section5, t119);
			append(section5, p35);
			append(p35, t120);
			append(section5, t121);
			append(section5, p36);
			append(p36, t122);
			append(section5, t123);
			append(section5, p37);
			append(p37, t124);
			append(section5, t125);
			append(section5, p38);
			append(p38, t126);
			append(section5, t127);
			append(section5, p39);
			append(p39, em1);
			append(em1, t128);
			append(section5, t129);
			append(section5, p40);
			append(p40, t130);
			append(section5, t131);
			append(section5, p41);
			append(p41, t132);
			append(p41, strong7);
			append(strong7, t133);
			append(p41, t134);
			append(section5, t135);
			append(section5, p42);
			append(p42, t136);
			append(section5, t137);
			append(section5, p43);
			append(p43, t138);
			append(section5, t139);
			append(section5, p44);
			append(p44, t140);
			append(section5, t141);
			append(section5, p45);
			append(p45, t142);
			append(section5, t143);
			append(section5, p46);
			append(p46, em2);
			append(em2, t144);
			append(section5, t145);
			append(section5, p47);
			append(p47, t146);
			append(p47, strong8);
			append(strong8, t147);
			append(section5, t148);
			append(section5, p48);
			append(p48, t149);
			append(section5, t150);
			append(section5, p49);
			append(p49, em3);
			append(em3, t151);
			append(section5, t152);
			append(section5, p50);
			append(p50, t153);
			append(p50, strong9);
			append(strong9, code10);
			append(code10, t154);
			append(p50, t155);
			append(p50, strong10);
			append(strong10, code11);
			append(code11, t156);
			append(p50, t157);
			append(p50, strong11);
			append(strong11, code12);
			append(code12, t158);
			append(p50, t159);
			append(section5, t160);
			append(section5, p51);
			append(p51, t161);
			append(p51, code13);
			append(code13, t162);
			append(p51, t163);
			append(section5, t164);
			append(section5, p52);
			append(p52, t165);
			append(p52, code14);
			append(code14, t166);
			append(p52, t167);
			append(p52, code15);
			append(code15, t168);
			append(p52, t169);
			append(p52, code16);
			append(code16, t170);
			append(p52, t171);
			append(section5, t172);
			append(section5, p53);
			append(p53, t173);
			append(section5, t174);
			append(section5, p54);
			append(p54, t175);
			append(section5, t176);
			append(section5, p55);
			append(p55, t177);
			append(section5, t178);
			append(section5, p56);
			append(p56, t179);
			append(section5, t180);
			append(section5, p57);
			append(p57, t181);
			append(section5, t182);
			append(section5, p58);
			append(p58, t183);
			append(section5, t184);
			append(section5, p59);
			append(p59, t185);
			append(section5, t186);
			append(section5, p60);
			append(p60, t187);
			append(section5, t188);
			append(section5, p61);
			append(p61, t189);
			append(section5, t190);
			append(section5, p62);
			append(p62, t191);
			append(section5, t192);
			append(section5, p63);
			append(p63, t193);
			append(section5, t194);
			append(section5, p64);
			append(p64, t195);
			append(section5, t196);
			append(section5, p65);
			append(p65, t197);
			append(section5, t198);
			append(section5, p66);
			append(p66, t199);
			append(section5, t200);
			append(section5, p67);
			append(p67, t201);
			append(section5, t202);
			append(section5, p68);
			append(p68, t203);
			append(section5, t204);
			append(section5, p69);
			append(p69, t205);
			append(section5, t206);
			append(section5, p70);
			append(p70, t207);
			append(section5, t208);
			append(section5, p71);
			append(p71, t209);
			append(section5, t210);
			append(section5, p72);
			append(p72, t211);
			append(section5, t212);
			append(section5, p73);
			append(p73, t213);
			append(section5, t214);
			append(section5, p74);
			append(p74, t215);
			append(section5, t216);
			append(section5, p75);
			append(p75, t217);
			append(section5, t218);
			append(section5, p76);
			append(p76, t219);
			append(section5, t220);
			append(section5, p77);
			append(p77, t221);
			append(section5, t222);
			append(section5, p78);
			append(p78, t223);
			append(section5, t224);
			append(section5, p79);
			append(p79, t225);
			append(section5, t226);
			append(section5, p80);
			append(p80, t227);
			append(section5, t228);
			append(section5, p81);
			append(p81, t229);
			append(section5, t230);
			append(section5, p82);
			append(p82, t231);
			append(section5, t232);
			append(section5, p83);
			append(p83, t233);
			append(section5, t234);
			append(section5, p84);
			append(p84, t235);
			append(section5, t236);
			append(section5, p85);
			append(p85, t237);
			append(p85, code17);
			append(code17, t238);
			append(p85, t239);
			append(section5, t240);
			append(section5, p86);
			append(p86, t241);
			append(section5, t242);
			append(section5, p87);
			append(p87, t243);
			append(section5, t244);
			append(section5, p88);
			append(p88, t245);
			append(p88, code18);
			append(code18, t246);
			append(p88, t247);
			append(section5, t248);
			append(section5, p89);
			append(p89, t249);
			append(section5, t250);
			append(section5, p90);
			append(p90, t251);
			append(p90, code19);
			append(code19, t252);
			append(p90, t253);
			append(p90, code20);
			append(code20, t254);
			append(p90, t255);
			append(section5, t256);
			append(section5, p91);
			append(p91, t257);
			append(p91, code21);
			append(code21, t258);
			append(p91, t259);
			append(p91, code22);
			append(code22, t260);
			append(p91, t261);
			append(section5, t262);
			append(section5, p92);
			append(p92, t263);
			append(p92, code23);
			append(code23, t264);
			append(p92, t265);
			append(p92, code24);
			append(code24, t266);
			append(p92, t267);
			append(p92, code25);
			append(code25, t268);
			append(p92, t269);
			append(p92, code26);
			append(code26, t270);
			append(p92, t271);
			append(p92, code27);
			append(code27, t272);
			append(p92, t273);
			append(section5, t274);
			append(section5, p93);
			append(p93, t275);
			append(section5, t276);
			append(section5, p94);
			append(p94, t277);
			append(p94, code28);
			append(code28, t278);
			append(p94, t279);
			append(p94, code29);
			append(code29, t280);
			append(p94, t281);
			append(section5, t282);
			append(section5, p95);
			append(p95, t283);
			append(section5, t284);
			append(section5, p96);
			append(p96, t285);
			append(section5, t286);
			append(section5, p97);
			append(p97, t287);
			append(section5, t288);
			append(section5, p98);
			append(p98, t289);
			append(section5, t290);
			append(section5, p99);
			append(p99, t291);
			append(section5, t292);
			append(section5, p100);
			append(p100, t293);
			append(section5, t294);
			append(section5, p101);
			append(p101, t295);
			append(section5, t296);
			append(section5, p102);
			append(p102, t297);
			append(section5, t298);
			append(section5, p103);
			append(p103, t299);
			append(section5, t300);
			append(section5, p104);
			append(p104, t301);
			append(p104, code30);
			append(code30, t302);
			append(p104, t303);
			append(p104, code31);
			append(code31, t304);
			append(p104, t305);
			append(p104, code32);
			append(code32, t306);
			append(p104, t307);
			append(p104, code33);
			append(code33, t308);
			append(p104, t309);
			append(p104, code34);
			append(code34, t310);
			append(p104, t311);
			append(p104, code35);
			append(code35, t312);
			append(p104, t313);
			append(p104, code36);
			append(code36, t314);
			append(p104, t315);
			append(p104, code37);
			append(code37, t316);
			append(p104, t317);
			append(section5, t318);
			append(section5, p105);
			append(p105, t319);
			append(section5, t320);
			append(section5, p106);
			append(p106, t321);
			append(p106, code38);
			append(code38, t322);
			append(p106, t323);
			append(p106, code39);
			append(code39, t324);
			append(p106, t325);
			append(p106, code40);
			append(code40, t326);
			append(p106, t327);
			append(section5, t328);
			append(section5, p107);
			append(p107, t329);
			append(section5, t330);
			append(section5, p108);
			append(p108, t331);
			append(section5, t332);
			append(section5, p109);
			append(p109, t333);
			append(p109, code41);
			append(code41, t334);
			append(p109, t335);
			append(p109, code42);
			append(code42, t336);
			append(p109, t337);
			append(p109, code43);
			append(code43, t338);
			append(p109, t339);
			append(section5, t340);
			append(section5, p110);
			append(p110, t341);
			append(section5, t342);
			append(section5, p111);
			append(p111, t343);
			append(p111, code44);
			append(code44, t344);
			append(p111, t345);
			append(p111, code45);
			append(code45, t346);
			append(p111, t347);
			append(section5, t348);
			append(section5, p112);
			append(p112, t349);
			append(section5, t350);
			append(section5, p113);
			append(p113, t351);
			append(p113, code46);
			append(code46, t352);
			append(p113, t353);
			append(p113, code47);
			append(code47, t354);
			append(p113, t355);
			append(section5, t356);
			append(section5, p114);
			append(p114, t357);
			append(section5, t358);
			append(section5, p115);
			append(p115, t359);
			append(p115, code48);
			append(code48, t360);
			append(p115, t361);
			append(section5, t362);
			append(section5, p116);
			append(p116, t363);
			append(p116, code49);
			append(code49, t364);
			append(p116, t365);
			append(section5, t366);
			append(section5, p117);
			append(p117, t367);
			append(section5, t368);
			append(section5, p118);
			append(p118, t369);
			append(p118, strong12);
			append(strong12, t370);
			append(p118, t371);
			append(section5, t372);
			append(section5, p119);
			append(p119, t373);
			append(p119, code50);
			append(code50, t374);
			append(p119, t375);
			append(section5, t376);
			append(section5, p120);
			append(p120, t377);
			append(section5, t378);
			append(section5, p121);
			append(p121, t379);
			append(section5, t380);
			append(section5, p122);
			append(p122, t381);
			append(section5, t382);
			append(section5, p123);
			append(p123, t383);
			append(p123, code51);
			append(code51, t384);
			append(p123, t385);
			append(section5, t386);
			append(section5, p124);
			append(p124, t387);
			append(p124, code52);
			append(code52, t388);
			append(p124, t389);
			append(section5, t390);
			append(section5, p125);
			append(p125, t391);
			append(section5, t392);
			append(section5, p126);
			append(p126, t393);
			append(section5, t394);
			append(section5, p127);
			append(p127, t395);
			append(section5, t396);
			append(section5, p128);
			append(p128, t397);
			append(section5, t398);
			append(section5, p129);
			append(p129, t399);
			append(section5, t400);
			append(section5, p130);
			append(p130, t401);
		},
		d(detaching) {
			if (detaching) detach(section0);
			if (detaching) detach(t5);
			if (detaching) detach(section1);
			if (detaching) detach(t7);
			if (detaching) detach(section2);
			if (detaching) detach(t10);
			if (detaching) detach(section3);
			if (detaching) detach(t13);
			if (detaching) detach(section4);
			if (detaching) detach(t19);
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
	"title": "Looking into the Svelte Compiler",
	"occasion": "CityJS Conf 2020",
	"date": "2020-09-14",
	"layout": "talk",
	"slug": "looking-into-the-svelte-compiler",
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
