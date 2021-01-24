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
					"@id": "https%3A%2F%2Flihautan.com%2Freactivity-in-web-frameworks-the-when",
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
			attr(meta11, "content", "https%3A%2F%2Flihautan.com%2Freactivity-in-web-frameworks-the-when");
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
							"@id": "https%3A%2F%2Flihautan.com%2Freactivity-in-web-frameworks-the-when",
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

/* content/blog/reactivity-in-web-frameworks-the-when/@@page-markup.svelte generated by Svelte v3.24.0 */

function create_default_slot(ctx) {
	let section0;
	let ul0;
	let li0;
	let a0;
	let t0;
	let li1;
	let a1;
	let t1;
	let ul2;
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
	let t9;
	let section1;
	let h10;
	let a9;
	let t10;
	let t11;
	let p0;
	let t12;
	let t13;
	let p1;
	let t14;
	let t15;
	let p2;
	let t16;
	let t17;
	let p3;
	let t18;
	let t19;
	let pre0;

	let raw0_value = `<code class="language-js"><span class="token keyword">const</span> root <span class="token operator">=</span> document<span class="token punctuation">.</span><span class="token function">getElementById</span><span class="token punctuation">(</span><span class="token string">'app'</span><span class="token punctuation">)</span><span class="token punctuation">;</span>
root<span class="token punctuation">.</span>innerHTML <span class="token operator">=</span> <span class="token template-string"><span class="token template-punctuation string">&#96;</span><span class="token string">
  &lt;button>-&lt;/button>
  &lt;span>0&lt;/span>
  &lt;button>+&lt;/button>
</span><span class="token template-punctuation string">&#96;</span></span><span class="token punctuation">;</span>

<span class="token keyword">const</span> <span class="token punctuation">[</span>decrementBtn<span class="token punctuation">,</span> incrementBtn<span class="token punctuation">]</span> <span class="token operator">=</span> root<span class="token punctuation">.</span><span class="token function">querySelectorAll</span><span class="token punctuation">(</span><span class="token string">'button'</span><span class="token punctuation">)</span><span class="token punctuation">;</span>
<span class="token keyword">const</span> span <span class="token operator">=</span> root<span class="token punctuation">.</span><span class="token function">querySelector</span><span class="token punctuation">(</span><span class="token string">'span'</span><span class="token punctuation">)</span><span class="token punctuation">;</span>
<span class="token keyword">let</span> count <span class="token operator">=</span> <span class="token number">0</span><span class="token punctuation">;</span>
decrementBtn<span class="token punctuation">.</span><span class="token function">addEventListener</span><span class="token punctuation">(</span><span class="token string">'click'</span><span class="token punctuation">,</span> <span class="token punctuation">(</span><span class="token punctuation">)</span> <span class="token operator">=></span> <span class="token punctuation">&#123;</span>
  count<span class="token operator">--</span><span class="token punctuation">;</span>
  span<span class="token punctuation">.</span>innerText <span class="token operator">=</span> count<span class="token punctuation">;</span>
<span class="token punctuation">&#125;</span><span class="token punctuation">)</span><span class="token punctuation">;</span>
incrementBtn<span class="token punctuation">.</span><span class="token function">addEventListener</span><span class="token punctuation">(</span><span class="token string">'click'</span><span class="token punctuation">,</span> <span class="token punctuation">(</span><span class="token punctuation">)</span> <span class="token operator">=></span> <span class="token punctuation">&#123;</span>
  count<span class="token operator">++</span><span class="token punctuation">;</span>
  span<span class="token punctuation">.</span>innerText <span class="token operator">=</span> count<span class="token punctuation">;</span>
<span class="token punctuation">&#125;</span><span class="token punctuation">)</span><span class="token punctuation">;</span></code>` + "";

	let t20;
	let p4;
	let t21;
	let t22;
	let pre1;

	let raw1_value = `<code class="language-html"><span class="token tag"><span class="token tag"><span class="token punctuation">&lt;</span>template</span><span class="token punctuation">></span></span>
  <span class="token tag"><span class="token tag"><span class="token punctuation">&lt;</span>div</span><span class="token punctuation">></span></span>
    <span class="token tag"><span class="token tag"><span class="token punctuation">&lt;</span>button</span> <span class="token attr-name"><span class="token namespace">v-on:</span>click</span><span class="token attr-value"><span class="token punctuation">=</span><span class="token punctuation">"</span>counter -= 1<span class="token punctuation">"</span></span><span class="token punctuation">></span></span>-<span class="token tag"><span class="token tag"><span class="token punctuation">&lt;/</span>button</span><span class="token punctuation">></span></span>
    <span class="token tag"><span class="token tag"><span class="token punctuation">&lt;</span>span</span><span class="token punctuation">></span></span>&#123;&#123; counter &#125;&#125;<span class="token tag"><span class="token tag"><span class="token punctuation">&lt;/</span>span</span><span class="token punctuation">></span></span>
    <span class="token tag"><span class="token tag"><span class="token punctuation">&lt;</span>button</span> <span class="token attr-name"><span class="token namespace">v-on:</span>click</span><span class="token attr-value"><span class="token punctuation">=</span><span class="token punctuation">"</span>counter += 1<span class="token punctuation">"</span></span><span class="token punctuation">></span></span>+<span class="token tag"><span class="token tag"><span class="token punctuation">&lt;/</span>button</span><span class="token punctuation">></span></span>
  <span class="token tag"><span class="token tag"><span class="token punctuation">&lt;/</span>div</span><span class="token punctuation">></span></span>
<span class="token tag"><span class="token tag"><span class="token punctuation">&lt;/</span>template</span><span class="token punctuation">></span></span>

<span class="token tag"><span class="token tag"><span class="token punctuation">&lt;</span>script</span><span class="token punctuation">></span></span><span class="token script"><span class="token language-javascript">
  <span class="token keyword">export</span> <span class="token keyword">default</span> <span class="token punctuation">&#123;</span>
    <span class="token function">data</span><span class="token punctuation">(</span><span class="token punctuation">)</span> <span class="token punctuation">&#123;</span>
      <span class="token keyword">return</span> <span class="token punctuation">&#123;</span>
        counter<span class="token punctuation">:</span> <span class="token number">0</span><span class="token punctuation">,</span>
      <span class="token punctuation">&#125;</span><span class="token punctuation">;</span>
    <span class="token punctuation">&#125;</span><span class="token punctuation">,</span>
  <span class="token punctuation">&#125;</span><span class="token punctuation">;</span>
</span></span><span class="token tag"><span class="token tag"><span class="token punctuation">&lt;/</span>script</span><span class="token punctuation">></span></span></code>` + "";

	let t23;
	let p5;
	let t24;
	let t25;
	let pre2;

	let raw2_value = `<code class="language-js"><span class="token keyword">function</span> <span class="token function">App</span><span class="token punctuation">(</span><span class="token punctuation">)</span> <span class="token punctuation">&#123;</span>
  <span class="token keyword">const</span> <span class="token punctuation">[</span>counter<span class="token punctuation">,</span> setCounter<span class="token punctuation">]</span> <span class="token operator">=</span> React<span class="token punctuation">.</span><span class="token function">useState</span><span class="token punctuation">(</span><span class="token number">0</span><span class="token punctuation">)</span><span class="token punctuation">;</span>
  <span class="token keyword">return</span> <span class="token punctuation">(</span>
    <span class="token operator">&lt;</span><span class="token operator">></span>
      <span class="token operator">&lt;</span>button onClick<span class="token operator">=</span><span class="token punctuation">&#123;</span><span class="token punctuation">(</span><span class="token punctuation">)</span> <span class="token operator">=></span> <span class="token function">setCounter</span><span class="token punctuation">(</span><span class="token parameter">counter</span> <span class="token operator">=></span> counter <span class="token operator">-</span> <span class="token number">1</span><span class="token punctuation">)</span><span class="token punctuation">&#125;</span><span class="token operator">></span><span class="token operator">-</span><span class="token operator">&lt;</span><span class="token operator">/</span>button<span class="token operator">></span>
      <span class="token operator">&lt;</span>span<span class="token operator">></span><span class="token punctuation">&#123;</span>counter<span class="token punctuation">&#125;</span><span class="token operator">&lt;</span><span class="token operator">/</span>span<span class="token operator">></span>
      <span class="token operator">&lt;</span>button onClick<span class="token operator">=</span><span class="token punctuation">&#123;</span><span class="token punctuation">(</span><span class="token punctuation">)</span> <span class="token operator">=></span> <span class="token function">setCounter</span><span class="token punctuation">(</span><span class="token parameter">counter</span> <span class="token operator">=></span> counter <span class="token operator">+</span> <span class="token number">1</span><span class="token punctuation">)</span><span class="token punctuation">&#125;</span><span class="token operator">></span><span class="token operator">+</span><span class="token operator">&lt;</span><span class="token operator">/</span>button<span class="token operator">></span>
    <span class="token operator">&lt;</span><span class="token operator">/</span><span class="token operator">></span>
  <span class="token punctuation">)</span><span class="token punctuation">;</span>
<span class="token punctuation">&#125;</span></code>` + "";

	let t26;
	let p6;
	let t27;
	let em0;
	let u0;
	let t28;
	let t29;
	let em1;
	let u1;
	let t30;
	let t31;
	let t32;
	let p7;
	let t33;
	let code0;
	let t34;
	let t35;
	let code1;
	let t36;
	let t37;
	let t38;
	let p8;
	let t39;
	let t40;
	let p9;
	let t41;
	let t42;
	let blockquote0;
	let p10;
	let t43;
	let t44;
	let section2;
	let h11;
	let a10;
	let t45;
	let t46;
	let p11;
	let t47;
	let t48;
	let ul3;
	let li9;
	let t49;
	let t50;
	let li10;
	let t51;
	let t52;
	let p12;
	let strong0;
	let t53;
	let t54;
	let strong1;
	let t55;
	let t56;
	let t57;
	let p13;
	let t58;
	let strong2;
	let t59;
	let t60;
	let strong3;
	let t61;
	let t62;
	let strong4;
	let t63;
	let t64;
	let strong5;
	let t65;
	let t66;
	let t67;
	let section3;
	let h20;
	let a11;
	let t68;
	let t69;
	let p14;
	let t70;
	let t71;
	let p15;
	let t72;
	let code2;
	let t73;
	let t74;
	let code3;
	let t75;
	let t76;
	let code4;
	let t77;
	let t78;
	let a12;
	let t79;
	let t80;
	let t81;
	let p16;
	let t82;
	let t83;
	let pre3;

	let raw3_value = `<code class="language-js"><span class="token keyword">function</span> <span class="token function">Todos</span><span class="token punctuation">(</span><span class="token punctuation">)</span> <span class="token punctuation">&#123;</span>
  <span class="token keyword">const</span> <span class="token punctuation">[</span>todos<span class="token punctuation">,</span> setTodos<span class="token punctuation">]</span> <span class="token operator">=</span> <span class="token function">useState</span><span class="token punctuation">(</span><span class="token punctuation">[</span><span class="token punctuation">]</span><span class="token punctuation">)</span><span class="token punctuation">;</span>
  <span class="token keyword">const</span> <span class="token punctuation">[</span>totalTodos<span class="token punctuation">,</span> setTotalTodos<span class="token punctuation">]</span> <span class="token operator">=</span> <span class="token function">useState</span><span class="token punctuation">(</span><span class="token number">0</span><span class="token punctuation">)</span><span class="token punctuation">;</span>

  <span class="token keyword">const</span> <span class="token function-variable function">onAddTodo</span> <span class="token operator">=</span> <span class="token parameter">todo</span> <span class="token operator">=></span> <span class="token punctuation">&#123;</span>
    <span class="token function">setTodos</span><span class="token punctuation">(</span><span class="token parameter">todos</span> <span class="token operator">=></span> <span class="token punctuation">[</span><span class="token operator">...</span>todos<span class="token punctuation">,</span> todo<span class="token punctuation">]</span><span class="token punctuation">)</span><span class="token punctuation">;</span>
    <span class="token function">setTotalTodos</span><span class="token punctuation">(</span><span class="token parameter">totalTodos</span> <span class="token operator">=></span> totalTodos <span class="token operator">+</span> <span class="token number">1</span><span class="token punctuation">)</span><span class="token punctuation">;</span>
  <span class="token punctuation">&#125;</span><span class="token punctuation">;</span>
  <span class="token comment">// ...</span>
<span class="token punctuation">&#125;</span></code>` + "";

	let t84;
	let p17;
	let t85;
	let em2;
	let t86;
	let t87;
	let blockquote1;
	let p18;
	let t88;
	let code5;
	let t89;
	let t90;
	let code6;
	let t91;
	let t92;
	let a13;
	let t93;
	let t94;
	let p19;
	let t95;
	let t96;
	let section4;
	let h21;
	let a14;
	let t97;
	let t98;
	let p20;
	let t99;
	let t100;
	let p21;
	let t101;
	let t102;
	let p22;
	let t103;
	let t104;
	let p23;
	let t105;
	let t106;
	let pre4;

	let raw4_value = `<code class="language-js"><span class="token keyword">let</span> data <span class="token operator">=</span> <span class="token number">1</span><span class="token punctuation">;</span>
<span class="token function">render</span><span class="token punctuation">(</span>data<span class="token punctuation">)</span><span class="token punctuation">;</span>
<span class="token comment">// changes to the data will not be propagated into the render function</span>
data <span class="token operator">=</span> <span class="token number">2</span><span class="token punctuation">;</span>

<span class="token keyword">function</span> <span class="token function">render</span><span class="token punctuation">(</span><span class="token parameter">data</span><span class="token punctuation">)</span> <span class="token punctuation">&#123;</span>
  <span class="token comment">// data is a value</span>
  <span class="token comment">// however it is changed in the outside world</span>
  <span class="token comment">// got nothing to do with me</span>
  <span class="token function">setInterval</span><span class="token punctuation">(</span><span class="token punctuation">(</span><span class="token punctuation">)</span> <span class="token operator">=></span> <span class="token punctuation">&#123;</span>
    console<span class="token punctuation">.</span><span class="token function">log</span><span class="token punctuation">(</span>data<span class="token punctuation">)</span><span class="token punctuation">;</span> <span class="token comment">// will always console out &#96;1&#96;</span>
  <span class="token punctuation">&#125;</span><span class="token punctuation">,</span> <span class="token number">1000</span><span class="token punctuation">)</span><span class="token punctuation">;</span>
<span class="token punctuation">&#125;</span></code>` + "";

	let t107;
	let p24;
	let t108;
	let t109;
	let pre5;

	let raw5_value = `<code class="language-js"><span class="token keyword">let</span> data <span class="token operator">=</span> <span class="token punctuation">&#123;</span> foo<span class="token punctuation">:</span> <span class="token number">1</span> <span class="token punctuation">&#125;</span><span class="token punctuation">;</span>
<span class="token function">render</span><span class="token punctuation">(</span>data<span class="token punctuation">)</span><span class="token punctuation">;</span>
<span class="token comment">// mutate data some time later</span>
<span class="token function">setTimeout</span><span class="token punctuation">(</span><span class="token punctuation">(</span><span class="token punctuation">)</span> <span class="token operator">=></span> <span class="token punctuation">&#123;</span>
  data<span class="token punctuation">.</span>foo <span class="token operator">=</span> <span class="token number">2</span><span class="token punctuation">;</span>
<span class="token punctuation">&#125;</span><span class="token punctuation">,</span> <span class="token number">1000</span><span class="token punctuation">)</span><span class="token punctuation">;</span>

<span class="token keyword">function</span> <span class="token function">render</span><span class="token punctuation">(</span><span class="token parameter">data</span><span class="token punctuation">)</span> <span class="token punctuation">&#123;</span>
  <span class="token comment">// data is referenced to the same object</span>
  <span class="token comment">// changes to data.foo can be observed here</span>
  <span class="token function">setInterval</span><span class="token punctuation">(</span><span class="token punctuation">(</span><span class="token punctuation">)</span> <span class="token operator">=></span> <span class="token punctuation">&#123;</span>
    console<span class="token punctuation">.</span><span class="token function">log</span><span class="token punctuation">(</span>data<span class="token punctuation">.</span>foo<span class="token punctuation">)</span><span class="token punctuation">;</span> <span class="token comment">// initially &#96;1&#96;, after mutation, its &#96;2&#96;</span>
  <span class="token punctuation">&#125;</span><span class="token punctuation">,</span> <span class="token number">1000</span><span class="token punctuation">)</span><span class="token punctuation">;</span>
<span class="token punctuation">&#125;</span></code>` + "";

	let t110;
	let p25;
	let t111;
	let code7;
	let t112;
	let t113;
	let code8;
	let t114;
	let t115;
	let code9;
	let t116;
	let t117;
	let t118;
	let p26;
	let t119;
	let t120;
	let p27;
	let t121;
	let t122;
	let p28;
	let em3;
	let t123;
	let code10;
	let t124;
	let t125;
	let code11;
	let t126;
	let t127;
	let t128;
	let t129;
	let p29;
	let t130;
	let t131;
	let section5;
	let h30;
	let a15;
	let t132;
	let t133;
	let p30;
	let t134;
	let t135;
	let pre6;

	let raw6_value = `<code class="language-js"><span class="token keyword">function</span> <span class="token function">getTrackableObject</span><span class="token punctuation">(</span><span class="token parameter">obj</span><span class="token punctuation">)</span> <span class="token punctuation">&#123;</span>
  <span class="token keyword">if</span> <span class="token punctuation">(</span>obj<span class="token punctuation">[</span>Symbol<span class="token punctuation">.</span><span class="token function">for</span><span class="token punctuation">(</span><span class="token string">'isTracked'</span><span class="token punctuation">)</span><span class="token punctuation">]</span><span class="token punctuation">)</span> <span class="token keyword">return</span> obj<span class="token punctuation">;</span>
  <span class="token keyword">const</span> tracked <span class="token operator">=</span> Array<span class="token punctuation">.</span><span class="token function">isArray</span><span class="token punctuation">(</span>obj<span class="token punctuation">)</span> <span class="token operator">?</span> <span class="token punctuation">[</span><span class="token punctuation">]</span> <span class="token punctuation">:</span> <span class="token punctuation">&#123;</span><span class="token punctuation">&#125;</span><span class="token punctuation">;</span>
  <span class="token keyword">for</span> <span class="token punctuation">(</span><span class="token keyword">const</span> key <span class="token keyword">in</span> obj<span class="token punctuation">)</span> <span class="token punctuation">&#123;</span>
    Object<span class="token punctuation">.</span><span class="token function">defineProperty</span><span class="token punctuation">(</span>tracked<span class="token punctuation">,</span> key<span class="token punctuation">,</span> <span class="token punctuation">&#123;</span>
      configurable<span class="token punctuation">:</span> <span class="token boolean">true</span><span class="token punctuation">,</span>
      enumerable<span class="token punctuation">:</span> <span class="token boolean">true</span><span class="token punctuation">,</span>
      <span class="token keyword">get</span><span class="token punctuation">(</span><span class="token punctuation">)</span> <span class="token punctuation">&#123;</span>
        <span class="token keyword">return</span> obj<span class="token punctuation">[</span>key<span class="token punctuation">]</span><span class="token punctuation">;</span>
      <span class="token punctuation">&#125;</span><span class="token punctuation">,</span>
      <span class="token keyword">set</span><span class="token punctuation">(</span>value<span class="token punctuation">)</span> <span class="token punctuation">&#123;</span>
        <span class="token keyword">if</span> <span class="token punctuation">(</span><span class="token keyword">typeof</span> value <span class="token operator">===</span> <span class="token string">'object'</span><span class="token punctuation">)</span> <span class="token punctuation">&#123;</span>
          value <span class="token operator">=</span> <span class="token function">getTrackableObject</span><span class="token punctuation">(</span>value<span class="token punctuation">)</span><span class="token punctuation">;</span>
        <span class="token punctuation">&#125;</span>
        obj<span class="token punctuation">[</span>key<span class="token punctuation">]</span> <span class="token operator">=</span> value<span class="token punctuation">;</span>
        console<span class="token punctuation">.</span><span class="token function">log</span><span class="token punctuation">(</span><span class="token template-string"><span class="token template-punctuation string">&#96;</span><span class="token string">'</span><span class="token interpolation"><span class="token interpolation-punctuation punctuation">$&#123;</span>key<span class="token interpolation-punctuation punctuation">&#125;</span></span><span class="token string">' has changed.</span><span class="token template-punctuation string">&#96;</span></span><span class="token punctuation">)</span><span class="token punctuation">;</span>
      <span class="token punctuation">&#125;</span><span class="token punctuation">,</span>
    <span class="token punctuation">&#125;</span><span class="token punctuation">)</span><span class="token punctuation">;</span>
  <span class="token punctuation">&#125;</span>
  <span class="token comment">// marked as 'tracked'</span>
  Object<span class="token punctuation">.</span><span class="token function">defineProperty</span><span class="token punctuation">(</span>tracked<span class="token punctuation">,</span> Symbol<span class="token punctuation">.</span><span class="token function">for</span><span class="token punctuation">(</span><span class="token string">'isTracked'</span><span class="token punctuation">)</span><span class="token punctuation">,</span> <span class="token punctuation">&#123;</span>
    configurable<span class="token punctuation">:</span> <span class="token boolean">false</span><span class="token punctuation">,</span>
    enumerable<span class="token punctuation">:</span> <span class="token boolean">false</span><span class="token punctuation">,</span>
    value<span class="token punctuation">:</span> <span class="token boolean">true</span><span class="token punctuation">,</span>
  <span class="token punctuation">&#125;</span><span class="token punctuation">)</span><span class="token punctuation">;</span>
  <span class="token keyword">return</span> tracked<span class="token punctuation">;</span>
<span class="token punctuation">&#125;</span>

<span class="token comment">// track app state</span>
<span class="token keyword">const</span> appState <span class="token operator">=</span> <span class="token function">getTrackableObject</span><span class="token punctuation">(</span><span class="token punctuation">&#123;</span> foo<span class="token punctuation">:</span> <span class="token number">1</span> <span class="token punctuation">&#125;</span><span class="token punctuation">)</span><span class="token punctuation">;</span>
appState<span class="token punctuation">.</span>foo <span class="token operator">=</span> <span class="token number">3</span><span class="token punctuation">;</span> <span class="token comment">// log &#96;'foo' has changed.&#96;</span></code>` + "";

	let t136;
	let p31;
	let t137;
	let a16;
	let t138;
	let t139;
	let t140;
	let p32;
	let t141;
	let t142;
	let p33;
	let t143;
	let a17;
	let code12;
	let t144;
	let t145;
	let code13;
	let t146;
	let t147;
	let t148;
	let p34;
	let t149;
	let code14;
	let t150;
	let t151;
	let code15;
	let t152;
	let t153;
	let code16;
	let t154;
	let t155;
	let code17;
	let t156;
	let t157;
	let code18;
	let t158;
	let t159;
	let code19;
	let t160;
	let t161;
	let code20;
	let t162;
	let t163;
	let t164;
	let p35;
	let t165;
	let t166;
	let pre7;

	let raw7_value = `<code class="language-js"><span class="token keyword">const</span> TrackableArrayProto <span class="token operator">=</span> Object<span class="token punctuation">.</span><span class="token function">create</span><span class="token punctuation">(</span><span class="token class-name">Array</span><span class="token punctuation">.</span>prototype<span class="token punctuation">)</span><span class="token punctuation">;</span>
<span class="token keyword">for</span> <span class="token punctuation">(</span><span class="token keyword">const</span> method <span class="token keyword">of</span> <span class="token punctuation">[</span>
  <span class="token string">'push'</span><span class="token punctuation">,</span>
  <span class="token string">'pop'</span><span class="token punctuation">,</span>
  <span class="token string">'splice'</span><span class="token punctuation">,</span>
  <span class="token string">'unshift'</span><span class="token punctuation">,</span>
  <span class="token string">'shift'</span><span class="token punctuation">,</span>
  <span class="token string">'sort'</span><span class="token punctuation">,</span>
  <span class="token string">'reverse'</span><span class="token punctuation">,</span>
<span class="token punctuation">]</span><span class="token punctuation">)</span> <span class="token punctuation">&#123;</span>
  <span class="token keyword">const</span> original <span class="token operator">=</span> <span class="token class-name">Array</span><span class="token punctuation">.</span>prototype<span class="token punctuation">[</span>method<span class="token punctuation">]</span><span class="token punctuation">;</span>
  TrackableArrayProto<span class="token punctuation">[</span>method<span class="token punctuation">]</span> <span class="token operator">=</span> <span class="token keyword">function</span><span class="token punctuation">(</span><span class="token punctuation">)</span> <span class="token punctuation">&#123;</span>
    <span class="token keyword">const</span> result <span class="token operator">=</span> <span class="token function">original</span><span class="token punctuation">.</span><span class="token function">apply</span><span class="token punctuation">(</span><span class="token keyword">this</span><span class="token punctuation">,</span> arguments<span class="token punctuation">)</span><span class="token punctuation">;</span>
    console<span class="token punctuation">.</span><span class="token function">log</span><span class="token punctuation">(</span><span class="token template-string"><span class="token template-punctuation string">&#96;</span><span class="token string">'</span><span class="token interpolation"><span class="token interpolation-punctuation punctuation">$&#123;</span>method<span class="token interpolation-punctuation punctuation">&#125;</span></span><span class="token string">' was called</span><span class="token template-punctuation string">&#96;</span></span><span class="token punctuation">)</span><span class="token punctuation">;</span>
    <span class="token keyword">if</span> <span class="token punctuation">(</span>method <span class="token operator">===</span> <span class="token string">'push'</span> <span class="token operator">||</span> method <span class="token operator">===</span> <span class="token string">'unshift'</span> <span class="token operator">||</span> method <span class="token operator">===</span> <span class="token string">'splice'</span><span class="token punctuation">)</span> <span class="token punctuation">&#123;</span>
      <span class="token comment">// TODO track newly added item too!</span>
    <span class="token punctuation">&#125;</span>
    <span class="token keyword">return</span> result<span class="token punctuation">;</span>
  <span class="token punctuation">&#125;</span><span class="token punctuation">;</span>
<span class="token punctuation">&#125;</span>
<span class="token keyword">function</span> <span class="token function">getTrackableArray</span><span class="token punctuation">(</span><span class="token parameter">arr</span><span class="token punctuation">)</span> <span class="token punctuation">&#123;</span>
  <span class="token keyword">const</span> trackedArray <span class="token operator">=</span> <span class="token function">getTrackableObject</span><span class="token punctuation">(</span>arr<span class="token punctuation">)</span><span class="token punctuation">;</span>
  <span class="token comment">// set the prototype to the patched prototype</span>
  trackedArray<span class="token punctuation">.</span>__proto__ <span class="token operator">=</span> TrackableArrayProto<span class="token punctuation">;</span>
  <span class="token keyword">return</span> trackedArray<span class="token punctuation">;</span>
<span class="token punctuation">&#125;</span>

<span class="token comment">// track app state</span>
<span class="token keyword">const</span> appState <span class="token operator">=</span> <span class="token function">getTrackableArray</span><span class="token punctuation">(</span><span class="token punctuation">[</span><span class="token number">1</span><span class="token punctuation">,</span> <span class="token number">2</span><span class="token punctuation">,</span> <span class="token number">3</span><span class="token punctuation">]</span><span class="token punctuation">)</span><span class="token punctuation">;</span>
appState<span class="token punctuation">.</span><span class="token function">push</span><span class="token punctuation">(</span><span class="token number">4</span><span class="token punctuation">)</span><span class="token punctuation">;</span> <span class="token comment">// log &#96;'push' was called.&#96;</span>
appState<span class="token punctuation">[</span><span class="token number">0</span><span class="token punctuation">]</span> <span class="token operator">=</span> <span class="token string">'foo'</span><span class="token punctuation">;</span> <span class="token comment">// log &#96;'0' has changed.</span></code>` + "";

	let t167;
	let p36;
	let t168;
	let a18;
	let t169;
	let t170;
	let t171;
	let blockquote2;
	let p37;
	let t172;
	let a19;
	let t173;
	let t174;
	let p38;
	let t175;
	let t176;
	let p39;
	let t177;
	let t178;
	let p40;
	let t179;
	let a20;
	let t180;
	let t181;
	let t182;
	let section6;
	let h31;
	let a21;
	let t183;
	let t184;
	let p41;
	let t185;
	let code21;
	let t186;
	let t187;
	let code22;
	let t188;
	let t189;
	let t190;
	let pre8;

	let raw8_value = `<code class="language-js"><span class="token keyword">function</span> <span class="token function">getTrackableObject</span><span class="token punctuation">(</span><span class="token parameter">obj</span><span class="token punctuation">)</span> <span class="token punctuation">&#123;</span>
  <span class="token keyword">for</span> <span class="token punctuation">(</span><span class="token keyword">const</span> key <span class="token keyword">in</span> obj<span class="token punctuation">)</span> <span class="token punctuation">&#123;</span>
    <span class="token keyword">if</span> <span class="token punctuation">(</span><span class="token keyword">typeof</span> obj<span class="token punctuation">[</span>key<span class="token punctuation">]</span> <span class="token operator">===</span> <span class="token string">'object'</span><span class="token punctuation">)</span> <span class="token punctuation">&#123;</span>
      obj<span class="token punctuation">[</span>key<span class="token punctuation">]</span> <span class="token operator">=</span> <span class="token function">getTrackableObject</span><span class="token punctuation">(</span>obj<span class="token punctuation">[</span>key<span class="token punctuation">]</span><span class="token punctuation">)</span><span class="token punctuation">;</span>
    <span class="token punctuation">&#125;</span>
  <span class="token punctuation">&#125;</span>
  <span class="token keyword">return</span> <span class="token keyword">new</span> <span class="token class-name">Proxy</span><span class="token punctuation">(</span>obj<span class="token punctuation">,</span> <span class="token punctuation">&#123;</span>
    <span class="token function-variable function">set</span><span class="token punctuation">:</span> <span class="token keyword">function</span><span class="token punctuation">(</span><span class="token parameter">target<span class="token punctuation">,</span> key<span class="token punctuation">,</span> value</span><span class="token punctuation">)</span> <span class="token punctuation">&#123;</span>
      console<span class="token punctuation">.</span><span class="token function">log</span><span class="token punctuation">(</span><span class="token template-string"><span class="token template-punctuation string">&#96;</span><span class="token string">'</span><span class="token interpolation"><span class="token interpolation-punctuation punctuation">$&#123;</span>key<span class="token interpolation-punctuation punctuation">&#125;</span></span><span class="token string">' has changed</span><span class="token template-punctuation string">&#96;</span></span><span class="token punctuation">)</span><span class="token punctuation">;</span>
      <span class="token keyword">if</span> <span class="token punctuation">(</span><span class="token keyword">typeof</span> value <span class="token operator">===</span> <span class="token string">'object'</span><span class="token punctuation">)</span> <span class="token punctuation">&#123;</span>
        value <span class="token operator">=</span> <span class="token function">getTrackableObject</span><span class="token punctuation">(</span>value<span class="token punctuation">)</span><span class="token punctuation">;</span>
      <span class="token punctuation">&#125;</span>
      <span class="token keyword">return</span> <span class="token punctuation">(</span>target<span class="token punctuation">[</span>key<span class="token punctuation">]</span> <span class="token operator">=</span> value<span class="token punctuation">)</span><span class="token punctuation">;</span>
    <span class="token punctuation">&#125;</span><span class="token punctuation">,</span>
    <span class="token function-variable function">deleteProperty</span><span class="token punctuation">:</span> <span class="token keyword">function</span><span class="token punctuation">(</span><span class="token parameter">target<span class="token punctuation">,</span> key</span><span class="token punctuation">)</span> <span class="token punctuation">&#123;</span>
      console<span class="token punctuation">.</span><span class="token function">log</span><span class="token punctuation">(</span><span class="token template-string"><span class="token template-punctuation string">&#96;</span><span class="token string">'</span><span class="token interpolation"><span class="token interpolation-punctuation punctuation">$&#123;</span>key<span class="token interpolation-punctuation punctuation">&#125;</span></span><span class="token string">' was deleted</span><span class="token template-punctuation string">&#96;</span></span><span class="token punctuation">)</span><span class="token punctuation">;</span>
      <span class="token keyword">return</span> <span class="token keyword">delete</span> target<span class="token punctuation">[</span>key<span class="token punctuation">]</span><span class="token punctuation">;</span>
    <span class="token punctuation">&#125;</span><span class="token punctuation">,</span>
  <span class="token punctuation">&#125;</span><span class="token punctuation">)</span><span class="token punctuation">;</span>
<span class="token punctuation">&#125;</span>

<span class="token keyword">const</span> appState <span class="token operator">=</span> <span class="token function">getTrackableObject</span><span class="token punctuation">(</span><span class="token punctuation">&#123;</span> foo<span class="token punctuation">:</span> <span class="token number">1</span><span class="token punctuation">,</span> bar<span class="token punctuation">:</span> <span class="token punctuation">[</span><span class="token number">2</span><span class="token punctuation">,</span> <span class="token number">3</span><span class="token punctuation">]</span> <span class="token punctuation">&#125;</span><span class="token punctuation">)</span><span class="token punctuation">;</span>
appState<span class="token punctuation">.</span>foo <span class="token operator">=</span> <span class="token number">3</span><span class="token punctuation">;</span> <span class="token comment">// log &#96;'foo' has changed.&#96;</span>
appState<span class="token punctuation">.</span>bar<span class="token punctuation">.</span><span class="token function">push</span><span class="token punctuation">(</span><span class="token number">4</span><span class="token punctuation">)</span><span class="token punctuation">;</span> <span class="token comment">// log &#96;'2' has changed.&#96;, &#96;'length' has changed&#96;</span>
appState<span class="token punctuation">.</span>bar<span class="token punctuation">[</span><span class="token number">0</span><span class="token punctuation">]</span> <span class="token operator">=</span> <span class="token string">'foo'</span><span class="token punctuation">;</span> <span class="token comment">// log &#96;'0' has changed.</span></code>` + "";

	let t191;
	let p42;
	let strong6;
	let t192;
	let t193;
	let p43;
	let t194;
	let code23;
	let t195;
	let t196;
	let t197;
	let pre9;

	let raw9_value = `<code class="language-js">appState<span class="token punctuation">.</span>foo <span class="token operator">=</span> <span class="token number">3</span><span class="token punctuation">;</span>
appState<span class="token punctuation">.</span>bar<span class="token punctuation">.</span><span class="token function">push</span><span class="token punctuation">(</span><span class="token number">4</span><span class="token punctuation">)</span><span class="token punctuation">;</span>
appState<span class="token punctuation">.</span>bar<span class="token punctuation">[</span><span class="token number">0</span><span class="token punctuation">]</span> <span class="token operator">=</span> <span class="token string">'foo'</span><span class="token punctuation">;</span></code>` + "";

	let t198;
	let p44;
	let t199;
	let t200;
	let ul4;
	let li11;
	let t201;
	let t202;
	let li12;
	let t203;
	let t204;
	let li13;
	let t205;
	let t206;
	let pre10;

	let raw10_value = `<code class="language-js"><span class="token comment">// track a property of the component</span>
<span class="token keyword">class</span> <span class="token class-name">Component</span> <span class="token punctuation">&#123;</span>
  <span class="token function">constructor</span><span class="token punctuation">(</span><span class="token parameter">initialState</span><span class="token punctuation">)</span> <span class="token punctuation">&#123;</span>
    <span class="token keyword">this</span><span class="token punctuation">.</span>state <span class="token operator">=</span> <span class="token function">getTrackableObject</span><span class="token punctuation">(</span>initialState<span class="token punctuation">)</span><span class="token punctuation">;</span>
  <span class="token punctuation">&#125;</span>
<span class="token punctuation">&#125;</span>
<span class="token keyword">class</span> <span class="token class-name">UserComponent</span> <span class="token keyword">extends</span> <span class="token class-name">Component</span> <span class="token punctuation">&#123;</span>
  <span class="token function">constructor</span><span class="token punctuation">(</span><span class="token punctuation">)</span> <span class="token punctuation">&#123;</span>
    <span class="token keyword">super</span><span class="token punctuation">(</span><span class="token punctuation">&#123;</span> foo<span class="token punctuation">:</span> <span class="token number">1</span> <span class="token punctuation">&#125;</span><span class="token punctuation">)</span><span class="token punctuation">;</span>
  <span class="token punctuation">&#125;</span>
  <span class="token function">someHandler</span><span class="token punctuation">(</span><span class="token punctuation">)</span> <span class="token punctuation">&#123;</span>
    <span class="token keyword">this</span><span class="token punctuation">.</span>state<span class="token punctuation">.</span>foo <span class="token operator">=</span> <span class="token number">2</span><span class="token punctuation">;</span> <span class="token comment">// Log &#96;'foo' has changed&#96;</span>
    <span class="token keyword">this</span><span class="token punctuation">.</span>other<span class="token punctuation">.</span>foo <span class="token operator">=</span> <span class="token number">2</span><span class="token punctuation">;</span> <span class="token comment">// Does not track this</span>
  <span class="token punctuation">&#125;</span>
<span class="token punctuation">&#125;</span>

<span class="token comment">// track the component instance itself</span>
<span class="token keyword">class</span> <span class="token class-name">Component</span> <span class="token punctuation">&#123;</span>
  <span class="token function">constructor</span><span class="token punctuation">(</span><span class="token punctuation">)</span> <span class="token punctuation">&#123;</span>
    <span class="token keyword">return</span> <span class="token function">getTrackableObject</span><span class="token punctuation">(</span><span class="token keyword">this</span><span class="token punctuation">)</span><span class="token punctuation">;</span>
  <span class="token punctuation">&#125;</span>
<span class="token punctuation">&#125;</span>

<span class="token keyword">class</span> <span class="token class-name">UserComponent</span> <span class="token keyword">extends</span> <span class="token class-name">Component</span> <span class="token punctuation">&#123;</span>
  <span class="token function">constructor</span><span class="token punctuation">(</span><span class="token punctuation">)</span> <span class="token punctuation">&#123;</span>
    <span class="token keyword">super</span><span class="token punctuation">(</span><span class="token punctuation">)</span><span class="token punctuation">;</span>
  <span class="token punctuation">&#125;</span>
  <span class="token function">someHandler</span><span class="token punctuation">(</span><span class="token punctuation">)</span> <span class="token punctuation">&#123;</span>
    <span class="token keyword">this</span><span class="token punctuation">.</span>foo <span class="token operator">=</span> <span class="token number">1</span><span class="token punctuation">;</span> <span class="token comment">// Log &#96;'foo' has changed&#96;</span>
  <span class="token punctuation">&#125;</span>
<span class="token punctuation">&#125;</span></code>` + "";

	let t207;
	let p45;
	let t208;
	let code24;
	let t209;
	let t210;
	let code25;
	let t211;
	let t212;
	let t213;
	let p46;
	let t214;
	let a22;
	let t215;
	let t216;
	let t217;
	let p47;
	let t218;
	let t219;
	let section7;
	let h32;
	let a23;
	let t220;
	let code26;
	let t221;
	let t222;
	let p48;
	let t223;
	let t224;
	let p49;
	let t225;
	let code27;
	let t226;
	let t227;
	let t228;
	let pre11;

	let raw11_value = `<code class="language-js"><span class="token comment">// instead of</span>
<span class="token keyword">this</span><span class="token punctuation">.</span>appState<span class="token punctuation">.</span>one <span class="token operator">=</span> <span class="token string">'1'</span><span class="token punctuation">;</span>
<span class="token function">scheduleUpdate</span><span class="token punctuation">(</span><span class="token punctuation">)</span><span class="token punctuation">;</span>

<span class="token comment">// you have to use the frameworks API</span>
<span class="token keyword">this</span><span class="token punctuation">.</span><span class="token function">setAppState</span><span class="token punctuation">(</span><span class="token punctuation">&#123;</span> one<span class="token punctuation">:</span> <span class="token string">'1'</span> <span class="token punctuation">&#125;</span><span class="token punctuation">)</span><span class="token punctuation">;</span></code>` + "";

	let t229;
	let p50;
	let t230;
	let t231;
	let pre12;

	let raw12_value = `<code class="language-js"><span class="token keyword">class</span> <span class="token class-name">Component</span> <span class="token punctuation">&#123;</span>
  <span class="token function">setAppState</span><span class="token punctuation">(</span><span class="token parameter">appState</span><span class="token punctuation">)</span> <span class="token punctuation">&#123;</span>
    <span class="token keyword">this</span><span class="token punctuation">.</span>appState <span class="token operator">=</span> appState<span class="token punctuation">;</span>
    <span class="token function">scheduleUpdate</span><span class="token punctuation">(</span><span class="token punctuation">)</span><span class="token punctuation">;</span>
  <span class="token punctuation">&#125;</span>
<span class="token punctuation">&#125;</span></code>` + "";

	let t232;
	let p51;
	let t233;
	let a24;
	let t234;
	let code28;
	let t235;
	let t236;
	let t237;
	let p52;
	let t238;
	let t239;
	let pre13;

	let raw13_value = `<code class="language-js"><span class="token keyword">class</span> <span class="token class-name">MyComponent</span> <span class="token keyword">extends</span> <span class="token class-name">Component</span> <span class="token punctuation">&#123;</span>
  <span class="token function">someHandler</span><span class="token punctuation">(</span><span class="token punctuation">)</span> <span class="token punctuation">&#123;</span>
    <span class="token comment">// if setting the state directly, instead of calling &#96;setAppState&#96;</span>
    <span class="token comment">// this will not schedule an update, and thus no reactivity</span>
    <span class="token keyword">this</span><span class="token punctuation">.</span>appState<span class="token punctuation">.</span>one <span class="token operator">=</span> <span class="token string">'1'</span><span class="token punctuation">;</span>
  <span class="token punctuation">&#125;</span>
<span class="token punctuation">&#125;</span></code>` + "";

	let t240;
	let p53;
	let t241;
	let t242;
	let pre14;

	let raw14_value = `<code class="language-js"><span class="token keyword">class</span> <span class="token class-name">MyComponent</span> <span class="token keyword">extends</span> <span class="token class-name">Component</span> <span class="token punctuation">&#123;</span>
  <span class="token function">someHandler</span><span class="token punctuation">(</span><span class="token punctuation">)</span> <span class="token punctuation">&#123;</span>
    <span class="token comment">// this will not schedule update</span>
    <span class="token keyword">this</span><span class="token punctuation">.</span>appState<span class="token punctuation">.</span>list<span class="token punctuation">.</span><span class="token function">push</span><span class="token punctuation">(</span><span class="token string">'one'</span><span class="token punctuation">)</span><span class="token punctuation">;</span>
    <span class="token comment">// you need to call setAppState after the .push()</span>
    <span class="token keyword">this</span><span class="token punctuation">.</span><span class="token function">setAppState</span><span class="token punctuation">(</span><span class="token punctuation">&#123;</span> list<span class="token punctuation">:</span> <span class="token keyword">this</span><span class="token punctuation">.</span>appState<span class="token punctuation">.</span>list <span class="token punctuation">&#125;</span><span class="token punctuation">)</span><span class="token punctuation">;</span>

    <span class="token comment">// or instead, for a one-liner</span>
    <span class="token keyword">this</span><span class="token punctuation">.</span><span class="token function">setAppState</span><span class="token punctuation">(</span><span class="token punctuation">&#123;</span> list<span class="token punctuation">:</span> <span class="token punctuation">[</span><span class="token operator">...</span>this<span class="token punctuation">.</span>appState<span class="token punctuation">.</span>list<span class="token punctuation">,</span> <span class="token string">'one'</span><span class="token punctuation">]</span> <span class="token punctuation">&#125;</span><span class="token punctuation">)</span><span class="token punctuation">;</span>
  <span class="token punctuation">&#125;</span>
<span class="token punctuation">&#125;</span></code>` + "";

	let t243;
	let p54;
	let t244;
	let code29;
	let t245;
	let t246;
	let t247;
	let ul5;
	let li14;
	let t248;
	let t249;
	let li15;
	let t250;
	let code30;
	let t251;
	let t252;
	let code31;
	let t253;
	let t254;
	let t255;
	let li16;
	let t256;
	let t257;
	let li17;
	let t258;
	let t259;
	let p55;
	let t260;
	let code32;
	let t261;
	let t262;
	let t263;
	let pre15;

	let raw15_value = `<code class="language-js"><span class="token keyword">function</span> <span class="token function">timeout</span><span class="token punctuation">(</span><span class="token parameter">fn<span class="token punctuation">,</span> delay</span><span class="token punctuation">)</span> <span class="token punctuation">&#123;</span>
  <span class="token function">setTimeout</span><span class="token punctuation">(</span><span class="token punctuation">(</span><span class="token punctuation">)</span> <span class="token operator">=></span> <span class="token punctuation">&#123;</span>
    <span class="token function">fn</span><span class="token punctuation">(</span><span class="token punctuation">)</span><span class="token punctuation">;</span>
    <span class="token function">scheduleUpdate</span><span class="token punctuation">(</span><span class="token punctuation">)</span><span class="token punctuation">;</span>
  <span class="token punctuation">&#125;</span><span class="token punctuation">,</span> delay<span class="token punctuation">)</span><span class="token punctuation">;</span>
<span class="token punctuation">&#125;</span>
<span class="token comment">// user code</span>
<span class="token keyword">import</span> <span class="token punctuation">&#123;</span> $timeout <span class="token punctuation">&#125;</span> <span class="token keyword">from</span> <span class="token string">'my-custom-framework'</span><span class="token punctuation">;</span>

<span class="token keyword">class</span> <span class="token class-name">UserComponent</span> <span class="token keyword">extends</span> <span class="token class-name">Component</span> <span class="token punctuation">&#123;</span>
  <span class="token function">someHandler</span><span class="token punctuation">(</span><span class="token punctuation">)</span> <span class="token punctuation">&#123;</span>
    <span class="token comment">// will schedule update after the callback fires.</span>
    <span class="token function">$timeout</span><span class="token punctuation">(</span><span class="token punctuation">(</span><span class="token punctuation">)</span> <span class="token operator">=></span> <span class="token punctuation">&#123;</span>
      <span class="token keyword">this</span><span class="token punctuation">.</span>appState<span class="token punctuation">.</span>one <span class="token operator">=</span> <span class="token string">'1'</span><span class="token punctuation">;</span>
    <span class="token punctuation">&#125;</span><span class="token punctuation">,</span> <span class="token number">1000</span><span class="token punctuation">)</span><span class="token punctuation">;</span>

    <span class="token function">setTimeout</span><span class="token punctuation">(</span><span class="token punctuation">(</span><span class="token punctuation">)</span> <span class="token operator">=></span> <span class="token punctuation">&#123;</span>
      <span class="token comment">// this will not schedule update</span>
      <span class="token keyword">this</span><span class="token punctuation">.</span>appState<span class="token punctuation">.</span>two <span class="token operator">=</span> <span class="token string">'2'</span><span class="token punctuation">;</span>
    <span class="token punctuation">&#125;</span><span class="token punctuation">,</span> <span class="token number">1000</span><span class="token punctuation">)</span><span class="token punctuation">;</span>
  <span class="token punctuation">&#125;</span>
<span class="token punctuation">&#125;</span></code>` + "";

	let t264;
	let p56;
	let t265;
	let a25;
	let t266;
	let t267;
	let p57;
	let t268;
	let code33;
	let t269;
	let t270;
	let t271;
	let p58;
	let t272;
	let a26;
	let t273;
	let t274;
	let p59;
	let t275;
	let code34;
	let t276;
	let t277;
	let code35;
	let t278;
	let t279;
	let strong7;
	let t280;
	let t281;
	let strong8;
	let t282;
	let t283;
	let t284;
	let p60;
	let t285;
	let t286;
	let ul6;
	let li18;
	let t287;
	let t288;
	let li19;
	let t289;
	let t290;
	let p61;
	let t291;
	let code36;
	let t292;
	let t293;
	let strong9;
	let t294;
	let t295;
	let t296;
	let p62;
	let t297;
	let t298;
	let section8;
	let h33;
	let a27;
	let t299;
	let t300;
	let p63;
	let t301;
	let t302;
	let pre16;

	let raw16_value = `<code class="language-js"><span class="token keyword">class</span> <span class="token class-name">UserComponent</span> <span class="token punctuation">&#123;</span>
  <span class="token function">someHandler</span><span class="token punctuation">(</span><span class="token punctuation">)</span> <span class="token punctuation">&#123;</span>
    <span class="token keyword">this</span><span class="token punctuation">.</span>appState<span class="token punctuation">.</span>one <span class="token operator">=</span> <span class="token string">'1'</span><span class="token punctuation">;</span>
  <span class="token punctuation">&#125;</span>
<span class="token punctuation">&#125;</span></code>` + "";

	let t303;
	let p64;
	let t304;
	let t305;
	let pre17;

	let raw17_value = `<code class="language-js"><span class="token keyword">class</span> <span class="token class-name">UserComponent</span> <span class="token punctuation">&#123;</span>
  <span class="token function">someHandler</span><span class="token punctuation">(</span><span class="token punctuation">)</span> <span class="token punctuation">&#123;</span>
    <span class="token keyword">this</span><span class="token punctuation">.</span>appState<span class="token punctuation">.</span>one <span class="token operator">=</span> <span class="token string">'1'</span><span class="token punctuation">;</span>
    <span class="token function">scheduleUpdate</span><span class="token punctuation">(</span><span class="token punctuation">)</span><span class="token punctuation">;</span> <span class="token comment">// &lt;-- insert this during compilation</span>
  <span class="token punctuation">&#125;</span>
<span class="token punctuation">&#125;</span></code>` + "";

	let t306;
	let p65;
	let t307;
	let t308;
	let p66;
	let t309;
	let code37;
	let t310;
	let t311;
	let t312;
	let pre18;

	let raw18_value = `<code class="language-js"><span class="token keyword">class</span> <span class="token class-name">UserComponent</span> <span class="token punctuation">&#123;</span>
  <span class="token function">someHandler</span><span class="token punctuation">(</span><span class="token punctuation">)</span> <span class="token punctuation">&#123;</span>
    <span class="token keyword">this</span><span class="token punctuation">.</span>appState<span class="token punctuation">.</span>one <span class="token operator">=</span> <span class="token string">'1'</span><span class="token punctuation">;</span> <span class="token comment">// &lt;-- ✅changes to application state</span>
    <span class="token keyword">this</span><span class="token punctuation">.</span>foo <span class="token operator">=</span> <span class="token string">'bar'</span><span class="token punctuation">;</span> <span class="token comment">// &lt;-- ⛔️ not changing application state</span>

    <span class="token keyword">const</span> foo <span class="token operator">=</span> <span class="token keyword">this</span><span class="token punctuation">.</span>appState<span class="token punctuation">;</span>
    foo<span class="token punctuation">.</span>one <span class="token operator">=</span> <span class="token string">'1'</span><span class="token punctuation">;</span> <span class="token comment">// 🤷‍♂️do we know that this is changing application state?</span>

    <span class="token function">doSomethingMutable</span><span class="token punctuation">(</span><span class="token keyword">this</span><span class="token punctuation">.</span>appState<span class="token punctuation">)</span><span class="token punctuation">;</span>
    <span class="token keyword">function</span> <span class="token function">doSomethingMutable</span><span class="token punctuation">(</span><span class="token parameter">foo</span><span class="token punctuation">)</span> <span class="token punctuation">&#123;</span>
      foo<span class="token punctuation">.</span>one <span class="token operator">=</span> <span class="token string">'1'</span><span class="token punctuation">;</span> <span class="token comment">// 🤷‍♂️do we know that this is changing application state?</span>
    <span class="token punctuation">&#125;</span>

    <span class="token keyword">this</span><span class="token punctuation">.</span>appState<span class="token punctuation">.</span>obj <span class="token operator">=</span> <span class="token punctuation">&#123;</span>
      data<span class="token punctuation">:</span> <span class="token number">1</span><span class="token punctuation">,</span>
      <span class="token function">increment</span><span class="token punctuation">(</span><span class="token punctuation">)</span> <span class="token punctuation">&#123;</span>
        <span class="token keyword">this</span><span class="token punctuation">.</span>data <span class="token operator">=</span> <span class="token keyword">this</span><span class="token punctuation">.</span>data <span class="token operator">+</span> <span class="token number">1</span><span class="token punctuation">;</span> <span class="token comment">// 🤷‍♂️do we know that this is changing application state?</span>
      <span class="token punctuation">&#125;</span><span class="token punctuation">,</span>
    <span class="token punctuation">&#125;</span><span class="token punctuation">;</span>
    <span class="token keyword">this</span><span class="token punctuation">.</span>appState<span class="token punctuation">.</span>obj<span class="token punctuation">.</span><span class="token function">increment</span><span class="token punctuation">(</span><span class="token punctuation">)</span><span class="token punctuation">;</span>

    <span class="token keyword">this</span><span class="token punctuation">.</span>appState<span class="token punctuation">.</span>data<span class="token punctuation">.</span><span class="token function">push</span><span class="token punctuation">(</span><span class="token string">'1'</span><span class="token punctuation">)</span><span class="token punctuation">;</span> <span class="token comment">// 🤷‍♂️is push mutable?</span>
    <span class="token keyword">this</span><span class="token punctuation">.</span>appState<span class="token punctuation">.</span>list <span class="token operator">=</span> <span class="token punctuation">&#123;</span>
      <span class="token function">push</span><span class="token punctuation">(</span><span class="token parameter">item</span><span class="token punctuation">)</span> <span class="token punctuation">&#123;</span>
        console<span class="token punctuation">.</span><span class="token function">log</span><span class="token punctuation">(</span><span class="token string">'nothing change'</span><span class="token punctuation">)</span><span class="token punctuation">;</span>
      <span class="token punctuation">&#125;</span><span class="token punctuation">,</span>
    <span class="token punctuation">&#125;</span><span class="token punctuation">;</span>
    <span class="token keyword">this</span><span class="token punctuation">.</span>appState<span class="token punctuation">.</span>list<span class="token punctuation">.</span><span class="token function">push</span><span class="token punctuation">(</span><span class="token string">'1'</span><span class="token punctuation">)</span><span class="token punctuation">;</span> <span class="token comment">// 🤷‍♂️is this push mutable?</span>
  <span class="token punctuation">&#125;</span>
<span class="token punctuation">&#125;</span></code>` + "";

	let t313;
	let p67;
	let t314;
	let t315;
	let ul7;
	let li20;
	let t316;
	let code38;
	let t317;
	let t318;
	let code39;
	let t319;
	let t320;
	let code40;
	let t321;
	let t322;
	let li21;
	let t323;
	let code41;
	let t324;
	let t325;
	let t326;
	let p68;
	let t327;
	let a28;
	let t328;
	let t329;
	let code42;
	let t330;
	let t331;
	let code43;
	let t332;
	let t333;
	let code44;
	let t334;
	let t335;
	let code45;
	let t336;
	let t337;
	let t338;
	let p69;
	let t339;
	let a29;
	let t340;
	let t341;
	let t342;
	let section9;
	let h22;
	let a30;
	let t343;
	let t344;
	let p70;
	let t345;
	let t346;
	let ul8;
	let li22;
	let t347;
	let t348;
	let li23;
	let t349;
	let code46;
	let t350;
	let t351;
	let li24;
	let t352;
	let t353;
	let p71;
	let t354;
	let t355;
	let ul10;
	let li25;
	let p72;
	let t356;
	let code47;
	let t357;
	let t358;
	let t359;
	let li28;
	let p73;
	let t360;
	let t361;
	let p74;
	let t362;
	let t363;
	let ul9;
	let li26;
	let t364;
	let t365;
	let li27;
	let t366;
	let t367;
	let p75;
	let t368;
	let t369;
	let p76;
	let t370;
	let t371;
	let p77;
	let t372;
	let strong10;
	let t373;
	let t374;
	let t375;
	let hr;
	let t376;
	let p78;
	let t377;
	let a31;
	let t378;
	let t379;

	return {
		c() {
			section0 = element("section");
			ul0 = element("ul");
			li0 = element("li");
			a0 = element("a");
			t0 = text("What is Reactivity?");
			li1 = element("li");
			a1 = element("a");
			t1 = text("The WHEN and the WHAT");
			ul2 = element("ul");
			li2 = element("li");
			a2 = element("a");
			t2 = text("the WHEN");
			li3 = element("li");
			a3 = element("a");
			t3 = text("Mutation Tracking");
			ul1 = element("ul");
			li4 = element("li");
			a4 = element("a");
			t4 = text("Prior Proxy");
			li5 = element("li");
			a5 = element("a");
			t5 = text("With Proxy");
			li6 = element("li");
			a6 = element("a");
			t6 = text("Just call  scheduleUpdate");
			li7 = element("li");
			a7 = element("a");
			t7 = text("Static analysis");
			li8 = element("li");
			a8 = element("a");
			t8 = text("Summary");
			t9 = space();
			section1 = element("section");
			h10 = element("h1");
			a9 = element("a");
			t10 = text("What is Reactivity?");
			t11 = space();
			p0 = element("p");
			t12 = text("Reactivity is the ability of a web framework to update your view whenever the application state has changed.");
			t13 = space();
			p1 = element("p");
			t14 = text("It is the core of any modern web framework.");
			t15 = space();
			p2 = element("p");
			t16 = text("To understand what reactivity is, let’s look at an example counter app.");
			t17 = space();
			p3 = element("p");
			t18 = text("This is how you would write in plain JavaScript:");
			t19 = space();
			pre0 = element("pre");
			t20 = space();
			p4 = element("p");
			t21 = text("This is how you would do it in Vue:");
			t22 = space();
			pre1 = element("pre");
			t23 = space();
			p5 = element("p");
			t24 = text("… and this in React:");
			t25 = space();
			pre2 = element("pre");
			t26 = space();
			p6 = element("p");
			t27 = text("Notice that with a web framework, your code focus more on ");
			em0 = element("em");
			u0 = element("u");
			t28 = text("updating the application state based on business requirements");
			t29 = text(" and ");
			em1 = element("em");
			u1 = element("u");
			t30 = text("describing how our view looks like using templating language or JSX expression");
			t31 = text(".\nThe framework will bridge the application state and the view, updating the view whenever the application state changes.");
			t32 = space();
			p7 = element("p");
			t33 = text("No more pesky DOM manipulation statements (");
			code0 = element("code");
			t34 = text("span.innerText = counter");
			t35 = text(") sprinkled alongside with state update statements (");
			code1 = element("code");
			t36 = text("counter ++;");
			t37 = text("). No more elusive bugs of unsynchronized view and application state, when one forgets to update the view when updating the application state.");
			t38 = space();
			p8 = element("p");
			t39 = text("All these problems are now past tense when web frameworks now ship in reactivity by default, always making sure that the view is up to date of the application state changes.");
			t40 = space();
			p9 = element("p");
			t41 = text("So the main idea we are going to discuss next is,");
			t42 = space();
			blockquote0 = element("blockquote");
			p10 = element("p");
			t43 = text("How do web frameworks achieve reactivity?");
			t44 = space();
			section2 = element("section");
			h11 = element("h1");
			a10 = element("a");
			t45 = text("The WHEN and the WHAT");
			t46 = space();
			p11 = element("p");
			t47 = text("To achieve reactivity, the framework has to answer 2 questions");
			t48 = space();
			ul3 = element("ul");
			li9 = element("li");
			t49 = text("When does the application state change?");
			t50 = space();
			li10 = element("li");
			t51 = text("What has the application state changed?");
			t52 = space();
			p12 = element("p");
			strong0 = element("strong");
			t53 = text("The WHEN");
			t54 = text(" answers when the framework needs to start to do its job on updating the view. Knowing ");
			strong1 = element("strong");
			t55 = text("the WHAT");
			t56 = text(", allows the framework to optimise it's work, only update part of the view that has changed.");
			t57 = space();
			p13 = element("p");
			t58 = text("We are going to discuss different strategies to determine ");
			strong2 = element("strong");
			t59 = text("the WHEN");
			t60 = text(" and ");
			strong3 = element("strong");
			t61 = text("the WHAT");
			t62 = text(", along with code snippets for each strategy. You could combine different strategies to determine ");
			strong4 = element("strong");
			t63 = text("the WHEN");
			t64 = text(" and ");
			strong5 = element("strong");
			t65 = text("the WHAT");
			t66 = text(", yet certain combinations may remind you of some of the popular web frameworks.");
			t67 = space();
			section3 = element("section");
			h20 = element("h2");
			a11 = element("a");
			t68 = text("the WHEN");
			t69 = space();
			p14 = element("p");
			t70 = text("The WHEN notifies the framework that the application state has changed, so that the framework knows that it needs to do its job to update the view.");
			t71 = space();
			p15 = element("p");
			t72 = text("Different frameworks employ different strategies to detect when the application state has changed, but in essence, it usually boils down to calling a ");
			code2 = element("code");
			t73 = text("scheduleUpdate()");
			t74 = text(" in the framework.\n");
			code3 = element("code");
			t75 = text("scheduleUpdate");
			t76 = text(" is usually a debounced ");
			code4 = element("code");
			t77 = text("update");
			t78 = text(" function of the framework. Because changes in the application state may cause derived state changes, or the framework user may change different parts of the application state consecutively. If the framework updates the view on every state change, it may change the view too frequent, which may be inefficient, or it may have an inconsistent view (");
			a12 = element("a");
			t79 = text("may result in tearing");
			t80 = text(").");
			t81 = space();
			p16 = element("p");
			t82 = text("Imagine this contrived React example:");
			t83 = space();
			pre3 = element("pre");
			t84 = space();
			p17 = element("p");
			t85 = text("If the framework synchronously updates the todos in the view then updates the total todos count, it may have a split second where the todos and the count go out of sync. ");
			em2 = element("em");
			t86 = text("(Although it may seem impossible even in this contrived example, but you get the point. )");
			t87 = space();
			blockquote1 = element("blockquote");
			p18 = element("p");
			t88 = text("By the way, you should not set ");
			code5 = element("code");
			t89 = text("totalTodos");
			t90 = text(" this way, you should derived it from ");
			code6 = element("code");
			t91 = text("todos.length");
			t92 = text(", see ");
			a13 = element("a");
			t93 = text("\"Don't Sync State. Derive it!\" by Kent C. Dodds.");
			t94 = space();
			p19 = element("p");
			t95 = text("So how do you know when the application state has changed?");
			t96 = space();
			section4 = element("section");
			h21 = element("h2");
			a14 = element("a");
			t97 = text("Mutation Tracking");
			t98 = space();
			p20 = element("p");
			t99 = text("So we want to know when the application state has changed? Let’s track it!");
			t100 = space();
			p21 = element("p");
			t101 = text("First of all, why is it called mutation tracking? That’s because we can only track mutation.");
			t102 = space();
			p22 = element("p");
			t103 = text("By the word mutation, it infers that our application state has to be an object, because you can’t mutate a primitive.");
			t104 = space();
			p23 = element("p");
			t105 = text("Primitives like numbers, string, boolean, are passed by value into a function. So, if you reassign the primitive to another value, the reassignment will never be able to be observed within the function:");
			t106 = space();
			pre4 = element("pre");
			t107 = space();
			p24 = element("p");
			t108 = text("Object on the other hand, is passed by reference. So any changes to the same object can be observed from within:");
			t109 = space();
			pre5 = element("pre");
			t110 = space();
			p25 = element("p");
			t111 = text("This is also why most frameworks’ application state is accessed via ");
			code7 = element("code");
			t112 = text("this");
			t113 = text(", because ");
			code8 = element("code");
			t114 = text("this");
			t115 = text(" is an object, changes to ");
			code9 = element("code");
			t116 = text("this.appState");
			t117 = text(" can be observed / tracked by the framework.");
			t118 = space();
			p26 = element("p");
			t119 = text("Now we understand why is it called mutation tracking, let’s take a look at how mutation tracking is implemented.");
			t120 = space();
			p27 = element("p");
			t121 = text("We are going to look at the two common types of object in JavaScript, the plain object and the array.");
			t122 = space();
			p28 = element("p");
			em3 = element("em");
			t123 = text("(Though if you ");
			code10 = element("code");
			t124 = text("typeof");
			t125 = text(" for both object or array, they are both ");
			code11 = element("code");
			t126 = text("\"object\"");
			t127 = text(")");
			t128 = text(".");
			t129 = space();
			p29 = element("p");
			t130 = text("With the introduction of ES6 Proxy, the mutation tracking method has become much straightforward. But still, let’s take a look at how you can implement a mutation tracking with / without ES6 Proxy.");
			t131 = space();
			section5 = element("section");
			h30 = element("h3");
			a15 = element("a");
			t132 = text("Prior Proxy");
			t133 = space();
			p30 = element("p");
			t134 = text("To track mutation without proxy, we can define a custom getters and setters for all the property of the object. So whenever the framework user changes the value of a property, the custom setter will be called, and we will know that something has changed:");
			t135 = space();
			pre6 = element("pre");
			t136 = space();
			p31 = element("p");
			t137 = text("Inspired by ");
			a16 = element("a");
			t138 = text("Vue.js 2.0’s observer");
			t139 = text(".");
			t140 = space();
			p32 = element("p");
			t141 = text("However, you may notice that if we are defining getters and setters on the existing properties of the object, we may miss out changes via adding or deleting property from the object.");
			t142 = space();
			p33 = element("p");
			t143 = text("This is something you can’t fix without a better JavaScript API, so a probable workaround for this caveat is to provide a helper function instead. For example, in Vue, you need to use the helper function ");
			a17 = element("a");
			code12 = element("code");
			t144 = text("Vue.set(object, propertyName, value)");
			t145 = text(" instead of ");
			code13 = element("code");
			t146 = text("object[propertyName] = value");
			t147 = text(".");
			t148 = space();
			p34 = element("p");
			t149 = text("Tracking mutation of an array is similar to mutation tracking for an object. However, besides being able to change the array item through assignment, it is possible to mutate an array through its mutating method, eg: ");
			code14 = element("code");
			t150 = text("push");
			t151 = text(", ");
			code15 = element("code");
			t152 = text("pop");
			t153 = text(", ");
			code16 = element("code");
			t154 = text("splice");
			t155 = text(", ");
			code17 = element("code");
			t156 = text("unshift");
			t157 = text(", ");
			code18 = element("code");
			t158 = text("shift");
			t159 = text(", ");
			code19 = element("code");
			t160 = text("sort");
			t161 = text(" and ");
			code20 = element("code");
			t162 = text("reverse");
			t163 = text(".");
			t164 = space();
			p35 = element("p");
			t165 = text("To track changes made by these methods, you have to patch them:");
			t166 = space();
			pre7 = element("pre");
			t167 = space();
			p36 = element("p");
			t168 = text("Inspired by ");
			a18 = element("a");
			t169 = text("Vue.js 2.0’s array observer");
			t170 = text(".");
			t171 = space();
			blockquote2 = element("blockquote");
			p37 = element("p");
			t172 = text("CodeSandbox for ");
			a19 = element("a");
			t173 = text("mutation tracking of object and array");
			t174 = space();
			p38 = element("p");
			t175 = text("In summary, to track mutation on an object or array without Proxy, you need to define custom getters/setters for all properties, so that you can capture when the property is being set. Besides that, you need to patch all the mutating methods as well, because that will mutate your object without triggering the custom setter.");
			t176 = space();
			p39 = element("p");
			t177 = text("Yet, there’s still edge cases that cannot be covered, such as adding new property or deleting property.");
			t178 = space();
			p40 = element("p");
			t179 = text("There’s where ");
			a20 = element("a");
			t180 = text("ES6 Proxy");
			t181 = text(" comes to help.");
			t182 = space();
			section6 = element("section");
			h31 = element("h3");
			a21 = element("a");
			t183 = text("With Proxy");
			t184 = space();
			p41 = element("p");
			t185 = text("Proxy allow us to define custom behaviours on fundamental operations on the target object. This is great for mutation tracking, because Proxy allow us to intercept setting and deleting property, irrelevant to whether we uses index assignment, ");
			code21 = element("code");
			t186 = text("obj[key] = value");
			t187 = text(" or mutating methods, ");
			code22 = element("code");
			t188 = text("obj.push(value)");
			t189 = text(":");
			t190 = space();
			pre8 = element("pre");
			t191 = space();
			p42 = element("p");
			strong6 = element("strong");
			t192 = text("So how do we use mutation tracking?");
			t193 = space();
			p43 = element("p");
			t194 = text("The good thing about mutation tracking is that, if you noticed in the example above, the framework user is unaware of the tracking and treats ");
			code23 = element("code");
			t195 = text("appState");
			t196 = text(" as a normal object:");
			t197 = space();
			pre9 = element("pre");
			t198 = space();
			p44 = element("p");
			t199 = text("We can set up the tracking during the initialisation of the component, either:");
			t200 = space();
			ul4 = element("ul");
			li11 = element("li");
			t201 = text("track a property of the component,");
			t202 = space();
			li12 = element("li");
			t203 = text("track the component instance itself,");
			t204 = space();
			li13 = element("li");
			t205 = text("or something in between the above");
			t206 = space();
			pre10 = element("pre");
			t207 = space();
			p45 = element("p");
			t208 = text("Once you’ve able to track application state changes, the next thing to do is to call ");
			code24 = element("code");
			t209 = text("scheduleUpdate");
			t210 = text(" instead of ");
			code25 = element("code");
			t211 = text("console.log");
			t212 = text(".");
			t213 = space();
			p46 = element("p");
			t214 = text("You may concern whether all these complexities is worth the effort. Or you may be worried that ");
			a22 = element("a");
			t215 = text("Proxy is not supported to older browsers");
			t216 = text(".");
			t217 = space();
			p47 = element("p");
			t218 = text("Your concern is not entirely baseless. Not all frameworks use mutation tracking.");
			t219 = space();
			section7 = element("section");
			h32 = element("h3");
			a23 = element("a");
			t220 = text("Just call ");
			code26 = element("code");
			t221 = text("scheduleUpdate");
			t222 = space();
			p48 = element("p");
			t223 = text("Some frameworks design their API in the way such that it “tricks” the framework user to tell the framework that the application state has changed.");
			t224 = space();
			p49 = element("p");
			t225 = text("Instead of remembering to call ");
			code27 = element("code");
			t226 = text("scheduleUpdate");
			t227 = text(" whenever you change the application state, the framework forces you to use their API to change application state:");
			t228 = space();
			pre11 = element("pre");
			t229 = space();
			p50 = element("p");
			t230 = text("This gives us a much simpler design and less edge case to handle:");
			t231 = space();
			pre12 = element("pre");
			t232 = space();
			p51 = element("p");
			t233 = text("Inspired by ");
			a24 = element("a");
			t234 = text("React’s ");
			code28 = element("code");
			t235 = text("setState");
			t236 = text(".");
			t237 = space();
			p52 = element("p");
			t238 = text("However, this may trip new developers into the framework:");
			t239 = space();
			pre13 = element("pre");
			t240 = space();
			p53 = element("p");
			t241 = text("... and it maybe a bit clumsy when adding / removing items from an array:");
			t242 = space();
			pre14 = element("pre");
			t243 = space();
			p54 = element("p");
			t244 = text("A different approach that may have the best of both world is to insert ");
			code29 = element("code");
			t245 = text("scheduleUpdate");
			t246 = text(" in scenarios that you think that changes may most likely happen:");
			t247 = space();
			ul5 = element("ul");
			li14 = element("li");
			t248 = text("Event handlers");
			t249 = space();
			li15 = element("li");
			t250 = text("Timeout (eg: ");
			code30 = element("code");
			t251 = text("setTimeout");
			t252 = text(", ");
			code31 = element("code");
			t253 = text("setInterval");
			t254 = text(", ...)");
			t255 = space();
			li16 = element("li");
			t256 = text("API handling, promises handling");
			t257 = space();
			li17 = element("li");
			t258 = text("...");
			t259 = space();
			p55 = element("p");
			t260 = text("So, instead of enforcing framework users to use ");
			code32 = element("code");
			t261 = text("setAppState()");
			t262 = text(", framework users should use the\ncustom timeouts, api handlers, ...:");
			t263 = space();
			pre15 = element("pre");
			t264 = space();
			p56 = element("p");
			t265 = text("Inspired by ");
			a25 = element("a");
			t266 = text("AngularJS’s \\$timeout");
			t267 = space();
			p57 = element("p");
			t268 = text("Your framework user can now be free to change the application state the way he wants, as long as the changes are done within your custom handlers. Because at the end of the handler, you will call ");
			code33 = element("code");
			t269 = text("scheduleUpdate()");
			t270 = text(".");
			t271 = space();
			p58 = element("p");
			t272 = text("Similarly, this may trip new developers into the framework too! Try search ");
			a26 = element("a");
			t273 = text("\"AngularJS $timeout vs window.setTimeout\"");
			t274 = space();
			p59 = element("p");
			t275 = text("You may think, what if there are no state changes in the handler function, wouldn’t calling an extra ");
			code34 = element("code");
			t276 = text("scheduleUpdate()");
			t277 = text(" be inefficient? Well so far, we haven’t discussed what’s happening in ");
			code35 = element("code");
			t278 = text("scheduleUpdate()");
			t279 = text(", we can check ");
			strong7 = element("strong");
			t280 = text("what has changed");
			t281 = text(" (which will be covered in the next section)");
			strong8 = element("strong");
			t282 = text(",");
			t283 = text(" and if there’s nothing change, we can skip the subsequent steps.");
			t284 = space();
			p60 = element("p");
			t285 = text("If you look at the strategies that we have tried so far, you may have noticed a common struggle:");
			t286 = space();
			ul6 = element("ul");
			li18 = element("li");
			t287 = text("allow framework user to change the application state in any way he wants");
			t288 = space();
			li19 = element("li");
			t289 = text("achieve reactivity without much runtime complexity.");
			t290 = space();
			p61 = element("p");
			t291 = text("At this point, you got to agree that enforcing framework developers to call ");
			code36 = element("code");
			t292 = text("setAppState");
			t293 = text(" whenever they want to change the application state, requires ");
			strong9 = element("strong");
			t294 = text("less runtime complexity");
			t295 = text(" from the framework, and it’s unlikely to have any corner cases or caveats that need to handle.");
			t296 = space();
			p62 = element("p");
			t297 = text("If the dilemma is between developer expressiveness versus runtime complexity, probably we could get the best of both worlds by shifting the complexity from runtime to build time?");
			t298 = space();
			section8 = element("section");
			h33 = element("h3");
			a27 = element("a");
			t299 = text("Static analysis");
			t300 = space();
			p63 = element("p");
			t301 = text("If we have a compiler that allow framework users to write:");
			t302 = space();
			pre16 = element("pre");
			t303 = space();
			p64 = element("p");
			t304 = text("and compiles it to:");
			t305 = space();
			pre17 = element("pre");
			t306 = space();
			p65 = element("p");
			t307 = text("Then, we would really have best of both worlds! 😎");
			t308 = space();
			p66 = element("p");
			t309 = text("Let’s look at different scenarios that the framework user would write, and see whether we know when to insert the ");
			code37 = element("code");
			t310 = text("scheduleUpdate()");
			t311 = text(":");
			t312 = space();
			pre18 = element("pre");
			t313 = space();
			p67 = element("p");
			t314 = text("Allow me to summarise some complexities faced in the example above:");
			t315 = space();
			ul7 = element("ul");
			li20 = element("li");
			t316 = text("It is easy to track direct changes to the application state, but it is extremely difficult to track changes made indirectly, eg: ");
			code38 = element("code");
			t317 = text("foo.one");
			t318 = text(", ");
			code39 = element("code");
			t319 = text("doSomethingMutable(this.appState)");
			t320 = text(" or ");
			code40 = element("code");
			t321 = text("this.appState.obj.increment()");
			t322 = space();
			li21 = element("li");
			t323 = text("It is easy to track changes through assignment statements, but extremely difficult to track changes made through mutating methods, eg: ");
			code41 = element("code");
			t324 = text("this.appState.list.push('1')");
			t325 = text(", I mean how do you know the method is mutating?");
			t326 = space();
			p68 = element("p");
			t327 = text("So, for ");
			a28 = element("a");
			t328 = text("Svelte");
			t329 = text(", one of the frameworks that use static analysis to achieve reactivity, it only ensures reactivity through assignment operators (eg: ");
			code42 = element("code");
			t330 = text("=");
			t331 = text(", ");
			code43 = element("code");
			t332 = text("+=");
			t333 = text(", …) and unary arithmetic operators (eg: ");
			code44 = element("code");
			t334 = text("++");
			t335 = text(" and ");
			code45 = element("code");
			t336 = text("--");
			t337 = text(").");
			t338 = space();
			p69 = element("p");
			t339 = text("I believe that there’s room yet to be explored in this space, especially at the ");
			a29 = element("a");
			t340 = text("rise of TypeScript");
			t341 = text(", we may be able to understand our application state better through static types.");
			t342 = space();
			section9 = element("section");
			h22 = element("h2");
			a30 = element("a");
			t343 = text("Summary");
			t344 = space();
			p70 = element("p");
			t345 = text("We’ve gone through different strategies of knowing when the application state has changed:");
			t346 = space();
			ul8 = element("ul");
			li22 = element("li");
			t347 = text("mutation tracking");
			t348 = space();
			li23 = element("li");
			t349 = text("just call ");
			code46 = element("code");
			t350 = text("scheduleUpdate");
			t351 = space();
			li24 = element("li");
			t352 = text("static analysis");
			t353 = space();
			p71 = element("p");
			t354 = text("Different strategies manifests itself in terms of the API of the framework:");
			t355 = space();
			ul10 = element("ul");
			li25 = element("li");
			p72 = element("p");
			t356 = text("Is the framework user going to change the application state with simple object manipulation? or have to use API like ");
			code47 = element("code");
			t357 = text("setAppState()");
			t358 = text("?");
			t359 = space();
			li28 = element("li");
			p73 = element("p");
			t360 = text("Is there caveats that the framework user needs to be aware of?");
			t361 = space();
			p74 = element("p");
			t362 = text("For example:");
			t363 = space();
			ul9 = element("ul");
			li26 = element("li");
			t364 = text("Can only use assignment statement to achieve reactivity?");
			t365 = space();
			li27 = element("li");
			t366 = text("Does framework user need to use a helper function for adding new reactive property to the application state?");
			t367 = space();
			p75 = element("p");
			t368 = text("Knowing when an application state has changed, allow frameworks to know when to update our view. Yet, to optimise the updates, frameworks need to know what has changed in the application state.");
			t369 = space();
			p76 = element("p");
			t370 = text("Are we going to remove and recreate every DOM element in the view? Do we know that which part of the view is going to change based on what has changed in the application state?");
			t371 = space();
			p77 = element("p");
			t372 = text("That is, if we know ");
			strong10 = element("strong");
			t373 = text("the WHAT");
			t374 = text(".");
			t375 = space();
			hr = element("hr");
			t376 = space();
			p78 = element("p");
			t377 = text("I’d like to thank ");
			a31 = element("a");
			t378 = text("Rich Harris");
			t379 = text(" for pointing out some inaccuracies in the previous version of this article and providing valuable feedbacks. All the remaining errors are mine..");
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

			children(ul0).forEach(detach);
			li0 = claim_element(section0_nodes, "LI", {});
			var li0_nodes = children(li0);
			a0 = claim_element(li0_nodes, "A", { href: true });
			var a0_nodes = children(a0);
			t0 = claim_text(a0_nodes, "What is Reactivity?");
			a0_nodes.forEach(detach);
			li0_nodes.forEach(detach);
			li1 = claim_element(section0_nodes, "LI", {});
			var li1_nodes = children(li1);
			a1 = claim_element(li1_nodes, "A", { href: true });
			var a1_nodes = children(a1);
			t1 = claim_text(a1_nodes, "The WHEN and the WHAT");
			a1_nodes.forEach(detach);
			li1_nodes.forEach(detach);
			ul2 = claim_element(section0_nodes, "UL", {});
			var ul2_nodes = children(ul2);
			li2 = claim_element(ul2_nodes, "LI", {});
			var li2_nodes = children(li2);
			a2 = claim_element(li2_nodes, "A", { href: true });
			var a2_nodes = children(a2);
			t2 = claim_text(a2_nodes, "the WHEN");
			a2_nodes.forEach(detach);
			li2_nodes.forEach(detach);
			li3 = claim_element(ul2_nodes, "LI", {});
			var li3_nodes = children(li3);
			a3 = claim_element(li3_nodes, "A", { href: true });
			var a3_nodes = children(a3);
			t3 = claim_text(a3_nodes, "Mutation Tracking");
			a3_nodes.forEach(detach);
			li3_nodes.forEach(detach);
			ul1 = claim_element(ul2_nodes, "UL", {});
			var ul1_nodes = children(ul1);
			li4 = claim_element(ul1_nodes, "LI", {});
			var li4_nodes = children(li4);
			a4 = claim_element(li4_nodes, "A", { href: true });
			var a4_nodes = children(a4);
			t4 = claim_text(a4_nodes, "Prior Proxy");
			a4_nodes.forEach(detach);
			li4_nodes.forEach(detach);
			li5 = claim_element(ul1_nodes, "LI", {});
			var li5_nodes = children(li5);
			a5 = claim_element(li5_nodes, "A", { href: true });
			var a5_nodes = children(a5);
			t5 = claim_text(a5_nodes, "With Proxy");
			a5_nodes.forEach(detach);
			li5_nodes.forEach(detach);
			li6 = claim_element(ul1_nodes, "LI", {});
			var li6_nodes = children(li6);
			a6 = claim_element(li6_nodes, "A", { href: true });
			var a6_nodes = children(a6);
			t6 = claim_text(a6_nodes, "Just call  scheduleUpdate");
			a6_nodes.forEach(detach);
			li6_nodes.forEach(detach);
			li7 = claim_element(ul1_nodes, "LI", {});
			var li7_nodes = children(li7);
			a7 = claim_element(li7_nodes, "A", { href: true });
			var a7_nodes = children(a7);
			t7 = claim_text(a7_nodes, "Static analysis");
			a7_nodes.forEach(detach);
			li7_nodes.forEach(detach);
			ul1_nodes.forEach(detach);
			li8 = claim_element(ul2_nodes, "LI", {});
			var li8_nodes = children(li8);
			a8 = claim_element(li8_nodes, "A", { href: true });
			var a8_nodes = children(a8);
			t8 = claim_text(a8_nodes, "Summary");
			a8_nodes.forEach(detach);
			li8_nodes.forEach(detach);
			ul2_nodes.forEach(detach);
			section0_nodes.forEach(detach);
			t9 = claim_space(nodes);
			section1 = claim_element(nodes, "SECTION", {});
			var section1_nodes = children(section1);
			h10 = claim_element(section1_nodes, "H1", {});
			var h10_nodes = children(h10);
			a9 = claim_element(h10_nodes, "A", { href: true, id: true });
			var a9_nodes = children(a9);
			t10 = claim_text(a9_nodes, "What is Reactivity?");
			a9_nodes.forEach(detach);
			h10_nodes.forEach(detach);
			t11 = claim_space(section1_nodes);
			p0 = claim_element(section1_nodes, "P", {});
			var p0_nodes = children(p0);
			t12 = claim_text(p0_nodes, "Reactivity is the ability of a web framework to update your view whenever the application state has changed.");
			p0_nodes.forEach(detach);
			t13 = claim_space(section1_nodes);
			p1 = claim_element(section1_nodes, "P", {});
			var p1_nodes = children(p1);
			t14 = claim_text(p1_nodes, "It is the core of any modern web framework.");
			p1_nodes.forEach(detach);
			t15 = claim_space(section1_nodes);
			p2 = claim_element(section1_nodes, "P", {});
			var p2_nodes = children(p2);
			t16 = claim_text(p2_nodes, "To understand what reactivity is, let’s look at an example counter app.");
			p2_nodes.forEach(detach);
			t17 = claim_space(section1_nodes);
			p3 = claim_element(section1_nodes, "P", {});
			var p3_nodes = children(p3);
			t18 = claim_text(p3_nodes, "This is how you would write in plain JavaScript:");
			p3_nodes.forEach(detach);
			t19 = claim_space(section1_nodes);
			pre0 = claim_element(section1_nodes, "PRE", { class: true });
			var pre0_nodes = children(pre0);
			pre0_nodes.forEach(detach);
			t20 = claim_space(section1_nodes);
			p4 = claim_element(section1_nodes, "P", {});
			var p4_nodes = children(p4);
			t21 = claim_text(p4_nodes, "This is how you would do it in Vue:");
			p4_nodes.forEach(detach);
			t22 = claim_space(section1_nodes);
			pre1 = claim_element(section1_nodes, "PRE", { class: true });
			var pre1_nodes = children(pre1);
			pre1_nodes.forEach(detach);
			t23 = claim_space(section1_nodes);
			p5 = claim_element(section1_nodes, "P", {});
			var p5_nodes = children(p5);
			t24 = claim_text(p5_nodes, "… and this in React:");
			p5_nodes.forEach(detach);
			t25 = claim_space(section1_nodes);
			pre2 = claim_element(section1_nodes, "PRE", { class: true });
			var pre2_nodes = children(pre2);
			pre2_nodes.forEach(detach);
			t26 = claim_space(section1_nodes);
			p6 = claim_element(section1_nodes, "P", {});
			var p6_nodes = children(p6);
			t27 = claim_text(p6_nodes, "Notice that with a web framework, your code focus more on ");
			em0 = claim_element(p6_nodes, "EM", {});
			var em0_nodes = children(em0);
			u0 = claim_element(em0_nodes, "U", {});
			var u0_nodes = children(u0);
			t28 = claim_text(u0_nodes, "updating the application state based on business requirements");
			u0_nodes.forEach(detach);
			em0_nodes.forEach(detach);
			t29 = claim_text(p6_nodes, " and ");
			em1 = claim_element(p6_nodes, "EM", {});
			var em1_nodes = children(em1);
			u1 = claim_element(em1_nodes, "U", {});
			var u1_nodes = children(u1);
			t30 = claim_text(u1_nodes, "describing how our view looks like using templating language or JSX expression");
			u1_nodes.forEach(detach);
			em1_nodes.forEach(detach);
			t31 = claim_text(p6_nodes, ".\nThe framework will bridge the application state and the view, updating the view whenever the application state changes.");
			p6_nodes.forEach(detach);
			t32 = claim_space(section1_nodes);
			p7 = claim_element(section1_nodes, "P", {});
			var p7_nodes = children(p7);
			t33 = claim_text(p7_nodes, "No more pesky DOM manipulation statements (");
			code0 = claim_element(p7_nodes, "CODE", {});
			var code0_nodes = children(code0);
			t34 = claim_text(code0_nodes, "span.innerText = counter");
			code0_nodes.forEach(detach);
			t35 = claim_text(p7_nodes, ") sprinkled alongside with state update statements (");
			code1 = claim_element(p7_nodes, "CODE", {});
			var code1_nodes = children(code1);
			t36 = claim_text(code1_nodes, "counter ++;");
			code1_nodes.forEach(detach);
			t37 = claim_text(p7_nodes, "). No more elusive bugs of unsynchronized view and application state, when one forgets to update the view when updating the application state.");
			p7_nodes.forEach(detach);
			t38 = claim_space(section1_nodes);
			p8 = claim_element(section1_nodes, "P", {});
			var p8_nodes = children(p8);
			t39 = claim_text(p8_nodes, "All these problems are now past tense when web frameworks now ship in reactivity by default, always making sure that the view is up to date of the application state changes.");
			p8_nodes.forEach(detach);
			t40 = claim_space(section1_nodes);
			p9 = claim_element(section1_nodes, "P", {});
			var p9_nodes = children(p9);
			t41 = claim_text(p9_nodes, "So the main idea we are going to discuss next is,");
			p9_nodes.forEach(detach);
			t42 = claim_space(section1_nodes);
			blockquote0 = claim_element(section1_nodes, "BLOCKQUOTE", {});
			var blockquote0_nodes = children(blockquote0);
			p10 = claim_element(blockquote0_nodes, "P", {});
			var p10_nodes = children(p10);
			t43 = claim_text(p10_nodes, "How do web frameworks achieve reactivity?");
			p10_nodes.forEach(detach);
			blockquote0_nodes.forEach(detach);
			section1_nodes.forEach(detach);
			t44 = claim_space(nodes);
			section2 = claim_element(nodes, "SECTION", {});
			var section2_nodes = children(section2);
			h11 = claim_element(section2_nodes, "H1", {});
			var h11_nodes = children(h11);
			a10 = claim_element(h11_nodes, "A", { href: true, id: true });
			var a10_nodes = children(a10);
			t45 = claim_text(a10_nodes, "The WHEN and the WHAT");
			a10_nodes.forEach(detach);
			h11_nodes.forEach(detach);
			t46 = claim_space(section2_nodes);
			p11 = claim_element(section2_nodes, "P", {});
			var p11_nodes = children(p11);
			t47 = claim_text(p11_nodes, "To achieve reactivity, the framework has to answer 2 questions");
			p11_nodes.forEach(detach);
			t48 = claim_space(section2_nodes);
			ul3 = claim_element(section2_nodes, "UL", {});
			var ul3_nodes = children(ul3);
			li9 = claim_element(ul3_nodes, "LI", {});
			var li9_nodes = children(li9);
			t49 = claim_text(li9_nodes, "When does the application state change?");
			li9_nodes.forEach(detach);
			t50 = claim_space(ul3_nodes);
			li10 = claim_element(ul3_nodes, "LI", {});
			var li10_nodes = children(li10);
			t51 = claim_text(li10_nodes, "What has the application state changed?");
			li10_nodes.forEach(detach);
			ul3_nodes.forEach(detach);
			t52 = claim_space(section2_nodes);
			p12 = claim_element(section2_nodes, "P", {});
			var p12_nodes = children(p12);
			strong0 = claim_element(p12_nodes, "STRONG", {});
			var strong0_nodes = children(strong0);
			t53 = claim_text(strong0_nodes, "The WHEN");
			strong0_nodes.forEach(detach);
			t54 = claim_text(p12_nodes, " answers when the framework needs to start to do its job on updating the view. Knowing ");
			strong1 = claim_element(p12_nodes, "STRONG", {});
			var strong1_nodes = children(strong1);
			t55 = claim_text(strong1_nodes, "the WHAT");
			strong1_nodes.forEach(detach);
			t56 = claim_text(p12_nodes, ", allows the framework to optimise it's work, only update part of the view that has changed.");
			p12_nodes.forEach(detach);
			t57 = claim_space(section2_nodes);
			p13 = claim_element(section2_nodes, "P", {});
			var p13_nodes = children(p13);
			t58 = claim_text(p13_nodes, "We are going to discuss different strategies to determine ");
			strong2 = claim_element(p13_nodes, "STRONG", {});
			var strong2_nodes = children(strong2);
			t59 = claim_text(strong2_nodes, "the WHEN");
			strong2_nodes.forEach(detach);
			t60 = claim_text(p13_nodes, " and ");
			strong3 = claim_element(p13_nodes, "STRONG", {});
			var strong3_nodes = children(strong3);
			t61 = claim_text(strong3_nodes, "the WHAT");
			strong3_nodes.forEach(detach);
			t62 = claim_text(p13_nodes, ", along with code snippets for each strategy. You could combine different strategies to determine ");
			strong4 = claim_element(p13_nodes, "STRONG", {});
			var strong4_nodes = children(strong4);
			t63 = claim_text(strong4_nodes, "the WHEN");
			strong4_nodes.forEach(detach);
			t64 = claim_text(p13_nodes, " and ");
			strong5 = claim_element(p13_nodes, "STRONG", {});
			var strong5_nodes = children(strong5);
			t65 = claim_text(strong5_nodes, "the WHAT");
			strong5_nodes.forEach(detach);
			t66 = claim_text(p13_nodes, ", yet certain combinations may remind you of some of the popular web frameworks.");
			p13_nodes.forEach(detach);
			section2_nodes.forEach(detach);
			t67 = claim_space(nodes);
			section3 = claim_element(nodes, "SECTION", {});
			var section3_nodes = children(section3);
			h20 = claim_element(section3_nodes, "H2", {});
			var h20_nodes = children(h20);
			a11 = claim_element(h20_nodes, "A", { href: true, id: true });
			var a11_nodes = children(a11);
			t68 = claim_text(a11_nodes, "the WHEN");
			a11_nodes.forEach(detach);
			h20_nodes.forEach(detach);
			t69 = claim_space(section3_nodes);
			p14 = claim_element(section3_nodes, "P", {});
			var p14_nodes = children(p14);
			t70 = claim_text(p14_nodes, "The WHEN notifies the framework that the application state has changed, so that the framework knows that it needs to do its job to update the view.");
			p14_nodes.forEach(detach);
			t71 = claim_space(section3_nodes);
			p15 = claim_element(section3_nodes, "P", {});
			var p15_nodes = children(p15);
			t72 = claim_text(p15_nodes, "Different frameworks employ different strategies to detect when the application state has changed, but in essence, it usually boils down to calling a ");
			code2 = claim_element(p15_nodes, "CODE", {});
			var code2_nodes = children(code2);
			t73 = claim_text(code2_nodes, "scheduleUpdate()");
			code2_nodes.forEach(detach);
			t74 = claim_text(p15_nodes, " in the framework.\n");
			code3 = claim_element(p15_nodes, "CODE", {});
			var code3_nodes = children(code3);
			t75 = claim_text(code3_nodes, "scheduleUpdate");
			code3_nodes.forEach(detach);
			t76 = claim_text(p15_nodes, " is usually a debounced ");
			code4 = claim_element(p15_nodes, "CODE", {});
			var code4_nodes = children(code4);
			t77 = claim_text(code4_nodes, "update");
			code4_nodes.forEach(detach);
			t78 = claim_text(p15_nodes, " function of the framework. Because changes in the application state may cause derived state changes, or the framework user may change different parts of the application state consecutively. If the framework updates the view on every state change, it may change the view too frequent, which may be inefficient, or it may have an inconsistent view (");
			a12 = claim_element(p15_nodes, "A", { href: true, rel: true });
			var a12_nodes = children(a12);
			t79 = claim_text(a12_nodes, "may result in tearing");
			a12_nodes.forEach(detach);
			t80 = claim_text(p15_nodes, ").");
			p15_nodes.forEach(detach);
			t81 = claim_space(section3_nodes);
			p16 = claim_element(section3_nodes, "P", {});
			var p16_nodes = children(p16);
			t82 = claim_text(p16_nodes, "Imagine this contrived React example:");
			p16_nodes.forEach(detach);
			t83 = claim_space(section3_nodes);
			pre3 = claim_element(section3_nodes, "PRE", { class: true });
			var pre3_nodes = children(pre3);
			pre3_nodes.forEach(detach);
			t84 = claim_space(section3_nodes);
			p17 = claim_element(section3_nodes, "P", {});
			var p17_nodes = children(p17);
			t85 = claim_text(p17_nodes, "If the framework synchronously updates the todos in the view then updates the total todos count, it may have a split second where the todos and the count go out of sync. ");
			em2 = claim_element(p17_nodes, "EM", {});
			var em2_nodes = children(em2);
			t86 = claim_text(em2_nodes, "(Although it may seem impossible even in this contrived example, but you get the point. )");
			em2_nodes.forEach(detach);
			p17_nodes.forEach(detach);
			t87 = claim_space(section3_nodes);
			blockquote1 = claim_element(section3_nodes, "BLOCKQUOTE", {});
			var blockquote1_nodes = children(blockquote1);
			p18 = claim_element(blockquote1_nodes, "P", {});
			var p18_nodes = children(p18);
			t88 = claim_text(p18_nodes, "By the way, you should not set ");
			code5 = claim_element(p18_nodes, "CODE", {});
			var code5_nodes = children(code5);
			t89 = claim_text(code5_nodes, "totalTodos");
			code5_nodes.forEach(detach);
			t90 = claim_text(p18_nodes, " this way, you should derived it from ");
			code6 = claim_element(p18_nodes, "CODE", {});
			var code6_nodes = children(code6);
			t91 = claim_text(code6_nodes, "todos.length");
			code6_nodes.forEach(detach);
			t92 = claim_text(p18_nodes, ", see ");
			a13 = claim_element(p18_nodes, "A", { href: true, rel: true });
			var a13_nodes = children(a13);
			t93 = claim_text(a13_nodes, "\"Don't Sync State. Derive it!\" by Kent C. Dodds.");
			a13_nodes.forEach(detach);
			p18_nodes.forEach(detach);
			blockquote1_nodes.forEach(detach);
			t94 = claim_space(section3_nodes);
			p19 = claim_element(section3_nodes, "P", {});
			var p19_nodes = children(p19);
			t95 = claim_text(p19_nodes, "So how do you know when the application state has changed?");
			p19_nodes.forEach(detach);
			section3_nodes.forEach(detach);
			t96 = claim_space(nodes);
			section4 = claim_element(nodes, "SECTION", {});
			var section4_nodes = children(section4);
			h21 = claim_element(section4_nodes, "H2", {});
			var h21_nodes = children(h21);
			a14 = claim_element(h21_nodes, "A", { href: true, id: true });
			var a14_nodes = children(a14);
			t97 = claim_text(a14_nodes, "Mutation Tracking");
			a14_nodes.forEach(detach);
			h21_nodes.forEach(detach);
			t98 = claim_space(section4_nodes);
			p20 = claim_element(section4_nodes, "P", {});
			var p20_nodes = children(p20);
			t99 = claim_text(p20_nodes, "So we want to know when the application state has changed? Let’s track it!");
			p20_nodes.forEach(detach);
			t100 = claim_space(section4_nodes);
			p21 = claim_element(section4_nodes, "P", {});
			var p21_nodes = children(p21);
			t101 = claim_text(p21_nodes, "First of all, why is it called mutation tracking? That’s because we can only track mutation.");
			p21_nodes.forEach(detach);
			t102 = claim_space(section4_nodes);
			p22 = claim_element(section4_nodes, "P", {});
			var p22_nodes = children(p22);
			t103 = claim_text(p22_nodes, "By the word mutation, it infers that our application state has to be an object, because you can’t mutate a primitive.");
			p22_nodes.forEach(detach);
			t104 = claim_space(section4_nodes);
			p23 = claim_element(section4_nodes, "P", {});
			var p23_nodes = children(p23);
			t105 = claim_text(p23_nodes, "Primitives like numbers, string, boolean, are passed by value into a function. So, if you reassign the primitive to another value, the reassignment will never be able to be observed within the function:");
			p23_nodes.forEach(detach);
			t106 = claim_space(section4_nodes);
			pre4 = claim_element(section4_nodes, "PRE", { class: true });
			var pre4_nodes = children(pre4);
			pre4_nodes.forEach(detach);
			t107 = claim_space(section4_nodes);
			p24 = claim_element(section4_nodes, "P", {});
			var p24_nodes = children(p24);
			t108 = claim_text(p24_nodes, "Object on the other hand, is passed by reference. So any changes to the same object can be observed from within:");
			p24_nodes.forEach(detach);
			t109 = claim_space(section4_nodes);
			pre5 = claim_element(section4_nodes, "PRE", { class: true });
			var pre5_nodes = children(pre5);
			pre5_nodes.forEach(detach);
			t110 = claim_space(section4_nodes);
			p25 = claim_element(section4_nodes, "P", {});
			var p25_nodes = children(p25);
			t111 = claim_text(p25_nodes, "This is also why most frameworks’ application state is accessed via ");
			code7 = claim_element(p25_nodes, "CODE", {});
			var code7_nodes = children(code7);
			t112 = claim_text(code7_nodes, "this");
			code7_nodes.forEach(detach);
			t113 = claim_text(p25_nodes, ", because ");
			code8 = claim_element(p25_nodes, "CODE", {});
			var code8_nodes = children(code8);
			t114 = claim_text(code8_nodes, "this");
			code8_nodes.forEach(detach);
			t115 = claim_text(p25_nodes, " is an object, changes to ");
			code9 = claim_element(p25_nodes, "CODE", {});
			var code9_nodes = children(code9);
			t116 = claim_text(code9_nodes, "this.appState");
			code9_nodes.forEach(detach);
			t117 = claim_text(p25_nodes, " can be observed / tracked by the framework.");
			p25_nodes.forEach(detach);
			t118 = claim_space(section4_nodes);
			p26 = claim_element(section4_nodes, "P", {});
			var p26_nodes = children(p26);
			t119 = claim_text(p26_nodes, "Now we understand why is it called mutation tracking, let’s take a look at how mutation tracking is implemented.");
			p26_nodes.forEach(detach);
			t120 = claim_space(section4_nodes);
			p27 = claim_element(section4_nodes, "P", {});
			var p27_nodes = children(p27);
			t121 = claim_text(p27_nodes, "We are going to look at the two common types of object in JavaScript, the plain object and the array.");
			p27_nodes.forEach(detach);
			t122 = claim_space(section4_nodes);
			p28 = claim_element(section4_nodes, "P", {});
			var p28_nodes = children(p28);
			em3 = claim_element(p28_nodes, "EM", {});
			var em3_nodes = children(em3);
			t123 = claim_text(em3_nodes, "(Though if you ");
			code10 = claim_element(em3_nodes, "CODE", {});
			var code10_nodes = children(code10);
			t124 = claim_text(code10_nodes, "typeof");
			code10_nodes.forEach(detach);
			t125 = claim_text(em3_nodes, " for both object or array, they are both ");
			code11 = claim_element(em3_nodes, "CODE", {});
			var code11_nodes = children(code11);
			t126 = claim_text(code11_nodes, "\"object\"");
			code11_nodes.forEach(detach);
			t127 = claim_text(em3_nodes, ")");
			em3_nodes.forEach(detach);
			t128 = claim_text(p28_nodes, ".");
			p28_nodes.forEach(detach);
			t129 = claim_space(section4_nodes);
			p29 = claim_element(section4_nodes, "P", {});
			var p29_nodes = children(p29);
			t130 = claim_text(p29_nodes, "With the introduction of ES6 Proxy, the mutation tracking method has become much straightforward. But still, let’s take a look at how you can implement a mutation tracking with / without ES6 Proxy.");
			p29_nodes.forEach(detach);
			section4_nodes.forEach(detach);
			t131 = claim_space(nodes);
			section5 = claim_element(nodes, "SECTION", {});
			var section5_nodes = children(section5);
			h30 = claim_element(section5_nodes, "H3", {});
			var h30_nodes = children(h30);
			a15 = claim_element(h30_nodes, "A", { href: true, id: true });
			var a15_nodes = children(a15);
			t132 = claim_text(a15_nodes, "Prior Proxy");
			a15_nodes.forEach(detach);
			h30_nodes.forEach(detach);
			t133 = claim_space(section5_nodes);
			p30 = claim_element(section5_nodes, "P", {});
			var p30_nodes = children(p30);
			t134 = claim_text(p30_nodes, "To track mutation without proxy, we can define a custom getters and setters for all the property of the object. So whenever the framework user changes the value of a property, the custom setter will be called, and we will know that something has changed:");
			p30_nodes.forEach(detach);
			t135 = claim_space(section5_nodes);
			pre6 = claim_element(section5_nodes, "PRE", { class: true });
			var pre6_nodes = children(pre6);
			pre6_nodes.forEach(detach);
			t136 = claim_space(section5_nodes);
			p31 = claim_element(section5_nodes, "P", {});
			var p31_nodes = children(p31);
			t137 = claim_text(p31_nodes, "Inspired by ");
			a16 = claim_element(p31_nodes, "A", { href: true, rel: true });
			var a16_nodes = children(a16);
			t138 = claim_text(a16_nodes, "Vue.js 2.0’s observer");
			a16_nodes.forEach(detach);
			t139 = claim_text(p31_nodes, ".");
			p31_nodes.forEach(detach);
			t140 = claim_space(section5_nodes);
			p32 = claim_element(section5_nodes, "P", {});
			var p32_nodes = children(p32);
			t141 = claim_text(p32_nodes, "However, you may notice that if we are defining getters and setters on the existing properties of the object, we may miss out changes via adding or deleting property from the object.");
			p32_nodes.forEach(detach);
			t142 = claim_space(section5_nodes);
			p33 = claim_element(section5_nodes, "P", {});
			var p33_nodes = children(p33);
			t143 = claim_text(p33_nodes, "This is something you can’t fix without a better JavaScript API, so a probable workaround for this caveat is to provide a helper function instead. For example, in Vue, you need to use the helper function ");
			a17 = claim_element(p33_nodes, "A", { href: true, rel: true });
			var a17_nodes = children(a17);
			code12 = claim_element(a17_nodes, "CODE", {});
			var code12_nodes = children(code12);
			t144 = claim_text(code12_nodes, "Vue.set(object, propertyName, value)");
			code12_nodes.forEach(detach);
			a17_nodes.forEach(detach);
			t145 = claim_text(p33_nodes, " instead of ");
			code13 = claim_element(p33_nodes, "CODE", {});
			var code13_nodes = children(code13);
			t146 = claim_text(code13_nodes, "object[propertyName] = value");
			code13_nodes.forEach(detach);
			t147 = claim_text(p33_nodes, ".");
			p33_nodes.forEach(detach);
			t148 = claim_space(section5_nodes);
			p34 = claim_element(section5_nodes, "P", {});
			var p34_nodes = children(p34);
			t149 = claim_text(p34_nodes, "Tracking mutation of an array is similar to mutation tracking for an object. However, besides being able to change the array item through assignment, it is possible to mutate an array through its mutating method, eg: ");
			code14 = claim_element(p34_nodes, "CODE", {});
			var code14_nodes = children(code14);
			t150 = claim_text(code14_nodes, "push");
			code14_nodes.forEach(detach);
			t151 = claim_text(p34_nodes, ", ");
			code15 = claim_element(p34_nodes, "CODE", {});
			var code15_nodes = children(code15);
			t152 = claim_text(code15_nodes, "pop");
			code15_nodes.forEach(detach);
			t153 = claim_text(p34_nodes, ", ");
			code16 = claim_element(p34_nodes, "CODE", {});
			var code16_nodes = children(code16);
			t154 = claim_text(code16_nodes, "splice");
			code16_nodes.forEach(detach);
			t155 = claim_text(p34_nodes, ", ");
			code17 = claim_element(p34_nodes, "CODE", {});
			var code17_nodes = children(code17);
			t156 = claim_text(code17_nodes, "unshift");
			code17_nodes.forEach(detach);
			t157 = claim_text(p34_nodes, ", ");
			code18 = claim_element(p34_nodes, "CODE", {});
			var code18_nodes = children(code18);
			t158 = claim_text(code18_nodes, "shift");
			code18_nodes.forEach(detach);
			t159 = claim_text(p34_nodes, ", ");
			code19 = claim_element(p34_nodes, "CODE", {});
			var code19_nodes = children(code19);
			t160 = claim_text(code19_nodes, "sort");
			code19_nodes.forEach(detach);
			t161 = claim_text(p34_nodes, " and ");
			code20 = claim_element(p34_nodes, "CODE", {});
			var code20_nodes = children(code20);
			t162 = claim_text(code20_nodes, "reverse");
			code20_nodes.forEach(detach);
			t163 = claim_text(p34_nodes, ".");
			p34_nodes.forEach(detach);
			t164 = claim_space(section5_nodes);
			p35 = claim_element(section5_nodes, "P", {});
			var p35_nodes = children(p35);
			t165 = claim_text(p35_nodes, "To track changes made by these methods, you have to patch them:");
			p35_nodes.forEach(detach);
			t166 = claim_space(section5_nodes);
			pre7 = claim_element(section5_nodes, "PRE", { class: true });
			var pre7_nodes = children(pre7);
			pre7_nodes.forEach(detach);
			t167 = claim_space(section5_nodes);
			p36 = claim_element(section5_nodes, "P", {});
			var p36_nodes = children(p36);
			t168 = claim_text(p36_nodes, "Inspired by ");
			a18 = claim_element(p36_nodes, "A", { href: true, rel: true });
			var a18_nodes = children(a18);
			t169 = claim_text(a18_nodes, "Vue.js 2.0’s array observer");
			a18_nodes.forEach(detach);
			t170 = claim_text(p36_nodes, ".");
			p36_nodes.forEach(detach);
			t171 = claim_space(section5_nodes);
			blockquote2 = claim_element(section5_nodes, "BLOCKQUOTE", {});
			var blockquote2_nodes = children(blockquote2);
			p37 = claim_element(blockquote2_nodes, "P", {});
			var p37_nodes = children(p37);
			t172 = claim_text(p37_nodes, "CodeSandbox for ");
			a19 = claim_element(p37_nodes, "A", { href: true, rel: true });
			var a19_nodes = children(a19);
			t173 = claim_text(a19_nodes, "mutation tracking of object and array");
			a19_nodes.forEach(detach);
			p37_nodes.forEach(detach);
			blockquote2_nodes.forEach(detach);
			t174 = claim_space(section5_nodes);
			p38 = claim_element(section5_nodes, "P", {});
			var p38_nodes = children(p38);
			t175 = claim_text(p38_nodes, "In summary, to track mutation on an object or array without Proxy, you need to define custom getters/setters for all properties, so that you can capture when the property is being set. Besides that, you need to patch all the mutating methods as well, because that will mutate your object without triggering the custom setter.");
			p38_nodes.forEach(detach);
			t176 = claim_space(section5_nodes);
			p39 = claim_element(section5_nodes, "P", {});
			var p39_nodes = children(p39);
			t177 = claim_text(p39_nodes, "Yet, there’s still edge cases that cannot be covered, such as adding new property or deleting property.");
			p39_nodes.forEach(detach);
			t178 = claim_space(section5_nodes);
			p40 = claim_element(section5_nodes, "P", {});
			var p40_nodes = children(p40);
			t179 = claim_text(p40_nodes, "There’s where ");
			a20 = claim_element(p40_nodes, "A", { href: true, rel: true });
			var a20_nodes = children(a20);
			t180 = claim_text(a20_nodes, "ES6 Proxy");
			a20_nodes.forEach(detach);
			t181 = claim_text(p40_nodes, " comes to help.");
			p40_nodes.forEach(detach);
			section5_nodes.forEach(detach);
			t182 = claim_space(nodes);
			section6 = claim_element(nodes, "SECTION", {});
			var section6_nodes = children(section6);
			h31 = claim_element(section6_nodes, "H3", {});
			var h31_nodes = children(h31);
			a21 = claim_element(h31_nodes, "A", { href: true, id: true });
			var a21_nodes = children(a21);
			t183 = claim_text(a21_nodes, "With Proxy");
			a21_nodes.forEach(detach);
			h31_nodes.forEach(detach);
			t184 = claim_space(section6_nodes);
			p41 = claim_element(section6_nodes, "P", {});
			var p41_nodes = children(p41);
			t185 = claim_text(p41_nodes, "Proxy allow us to define custom behaviours on fundamental operations on the target object. This is great for mutation tracking, because Proxy allow us to intercept setting and deleting property, irrelevant to whether we uses index assignment, ");
			code21 = claim_element(p41_nodes, "CODE", {});
			var code21_nodes = children(code21);
			t186 = claim_text(code21_nodes, "obj[key] = value");
			code21_nodes.forEach(detach);
			t187 = claim_text(p41_nodes, " or mutating methods, ");
			code22 = claim_element(p41_nodes, "CODE", {});
			var code22_nodes = children(code22);
			t188 = claim_text(code22_nodes, "obj.push(value)");
			code22_nodes.forEach(detach);
			t189 = claim_text(p41_nodes, ":");
			p41_nodes.forEach(detach);
			t190 = claim_space(section6_nodes);
			pre8 = claim_element(section6_nodes, "PRE", { class: true });
			var pre8_nodes = children(pre8);
			pre8_nodes.forEach(detach);
			t191 = claim_space(section6_nodes);
			p42 = claim_element(section6_nodes, "P", {});
			var p42_nodes = children(p42);
			strong6 = claim_element(p42_nodes, "STRONG", {});
			var strong6_nodes = children(strong6);
			t192 = claim_text(strong6_nodes, "So how do we use mutation tracking?");
			strong6_nodes.forEach(detach);
			p42_nodes.forEach(detach);
			t193 = claim_space(section6_nodes);
			p43 = claim_element(section6_nodes, "P", {});
			var p43_nodes = children(p43);
			t194 = claim_text(p43_nodes, "The good thing about mutation tracking is that, if you noticed in the example above, the framework user is unaware of the tracking and treats ");
			code23 = claim_element(p43_nodes, "CODE", {});
			var code23_nodes = children(code23);
			t195 = claim_text(code23_nodes, "appState");
			code23_nodes.forEach(detach);
			t196 = claim_text(p43_nodes, " as a normal object:");
			p43_nodes.forEach(detach);
			t197 = claim_space(section6_nodes);
			pre9 = claim_element(section6_nodes, "PRE", { class: true });
			var pre9_nodes = children(pre9);
			pre9_nodes.forEach(detach);
			t198 = claim_space(section6_nodes);
			p44 = claim_element(section6_nodes, "P", {});
			var p44_nodes = children(p44);
			t199 = claim_text(p44_nodes, "We can set up the tracking during the initialisation of the component, either:");
			p44_nodes.forEach(detach);
			t200 = claim_space(section6_nodes);
			ul4 = claim_element(section6_nodes, "UL", {});
			var ul4_nodes = children(ul4);
			li11 = claim_element(ul4_nodes, "LI", {});
			var li11_nodes = children(li11);
			t201 = claim_text(li11_nodes, "track a property of the component,");
			li11_nodes.forEach(detach);
			t202 = claim_space(ul4_nodes);
			li12 = claim_element(ul4_nodes, "LI", {});
			var li12_nodes = children(li12);
			t203 = claim_text(li12_nodes, "track the component instance itself,");
			li12_nodes.forEach(detach);
			t204 = claim_space(ul4_nodes);
			li13 = claim_element(ul4_nodes, "LI", {});
			var li13_nodes = children(li13);
			t205 = claim_text(li13_nodes, "or something in between the above");
			li13_nodes.forEach(detach);
			ul4_nodes.forEach(detach);
			t206 = claim_space(section6_nodes);
			pre10 = claim_element(section6_nodes, "PRE", { class: true });
			var pre10_nodes = children(pre10);
			pre10_nodes.forEach(detach);
			t207 = claim_space(section6_nodes);
			p45 = claim_element(section6_nodes, "P", {});
			var p45_nodes = children(p45);
			t208 = claim_text(p45_nodes, "Once you’ve able to track application state changes, the next thing to do is to call ");
			code24 = claim_element(p45_nodes, "CODE", {});
			var code24_nodes = children(code24);
			t209 = claim_text(code24_nodes, "scheduleUpdate");
			code24_nodes.forEach(detach);
			t210 = claim_text(p45_nodes, " instead of ");
			code25 = claim_element(p45_nodes, "CODE", {});
			var code25_nodes = children(code25);
			t211 = claim_text(code25_nodes, "console.log");
			code25_nodes.forEach(detach);
			t212 = claim_text(p45_nodes, ".");
			p45_nodes.forEach(detach);
			t213 = claim_space(section6_nodes);
			p46 = claim_element(section6_nodes, "P", {});
			var p46_nodes = children(p46);
			t214 = claim_text(p46_nodes, "You may concern whether all these complexities is worth the effort. Or you may be worried that ");
			a22 = claim_element(p46_nodes, "A", { href: true, rel: true });
			var a22_nodes = children(a22);
			t215 = claim_text(a22_nodes, "Proxy is not supported to older browsers");
			a22_nodes.forEach(detach);
			t216 = claim_text(p46_nodes, ".");
			p46_nodes.forEach(detach);
			t217 = claim_space(section6_nodes);
			p47 = claim_element(section6_nodes, "P", {});
			var p47_nodes = children(p47);
			t218 = claim_text(p47_nodes, "Your concern is not entirely baseless. Not all frameworks use mutation tracking.");
			p47_nodes.forEach(detach);
			section6_nodes.forEach(detach);
			t219 = claim_space(nodes);
			section7 = claim_element(nodes, "SECTION", {});
			var section7_nodes = children(section7);
			h32 = claim_element(section7_nodes, "H3", {});
			var h32_nodes = children(h32);
			a23 = claim_element(h32_nodes, "A", { href: true, id: true });
			var a23_nodes = children(a23);
			t220 = claim_text(a23_nodes, "Just call ");
			code26 = claim_element(a23_nodes, "CODE", {});
			var code26_nodes = children(code26);
			t221 = claim_text(code26_nodes, "scheduleUpdate");
			code26_nodes.forEach(detach);
			a23_nodes.forEach(detach);
			h32_nodes.forEach(detach);
			t222 = claim_space(section7_nodes);
			p48 = claim_element(section7_nodes, "P", {});
			var p48_nodes = children(p48);
			t223 = claim_text(p48_nodes, "Some frameworks design their API in the way such that it “tricks” the framework user to tell the framework that the application state has changed.");
			p48_nodes.forEach(detach);
			t224 = claim_space(section7_nodes);
			p49 = claim_element(section7_nodes, "P", {});
			var p49_nodes = children(p49);
			t225 = claim_text(p49_nodes, "Instead of remembering to call ");
			code27 = claim_element(p49_nodes, "CODE", {});
			var code27_nodes = children(code27);
			t226 = claim_text(code27_nodes, "scheduleUpdate");
			code27_nodes.forEach(detach);
			t227 = claim_text(p49_nodes, " whenever you change the application state, the framework forces you to use their API to change application state:");
			p49_nodes.forEach(detach);
			t228 = claim_space(section7_nodes);
			pre11 = claim_element(section7_nodes, "PRE", { class: true });
			var pre11_nodes = children(pre11);
			pre11_nodes.forEach(detach);
			t229 = claim_space(section7_nodes);
			p50 = claim_element(section7_nodes, "P", {});
			var p50_nodes = children(p50);
			t230 = claim_text(p50_nodes, "This gives us a much simpler design and less edge case to handle:");
			p50_nodes.forEach(detach);
			t231 = claim_space(section7_nodes);
			pre12 = claim_element(section7_nodes, "PRE", { class: true });
			var pre12_nodes = children(pre12);
			pre12_nodes.forEach(detach);
			t232 = claim_space(section7_nodes);
			p51 = claim_element(section7_nodes, "P", {});
			var p51_nodes = children(p51);
			t233 = claim_text(p51_nodes, "Inspired by ");
			a24 = claim_element(p51_nodes, "A", { href: true, rel: true });
			var a24_nodes = children(a24);
			t234 = claim_text(a24_nodes, "React’s ");
			code28 = claim_element(a24_nodes, "CODE", {});
			var code28_nodes = children(code28);
			t235 = claim_text(code28_nodes, "setState");
			code28_nodes.forEach(detach);
			a24_nodes.forEach(detach);
			t236 = claim_text(p51_nodes, ".");
			p51_nodes.forEach(detach);
			t237 = claim_space(section7_nodes);
			p52 = claim_element(section7_nodes, "P", {});
			var p52_nodes = children(p52);
			t238 = claim_text(p52_nodes, "However, this may trip new developers into the framework:");
			p52_nodes.forEach(detach);
			t239 = claim_space(section7_nodes);
			pre13 = claim_element(section7_nodes, "PRE", { class: true });
			var pre13_nodes = children(pre13);
			pre13_nodes.forEach(detach);
			t240 = claim_space(section7_nodes);
			p53 = claim_element(section7_nodes, "P", {});
			var p53_nodes = children(p53);
			t241 = claim_text(p53_nodes, "... and it maybe a bit clumsy when adding / removing items from an array:");
			p53_nodes.forEach(detach);
			t242 = claim_space(section7_nodes);
			pre14 = claim_element(section7_nodes, "PRE", { class: true });
			var pre14_nodes = children(pre14);
			pre14_nodes.forEach(detach);
			t243 = claim_space(section7_nodes);
			p54 = claim_element(section7_nodes, "P", {});
			var p54_nodes = children(p54);
			t244 = claim_text(p54_nodes, "A different approach that may have the best of both world is to insert ");
			code29 = claim_element(p54_nodes, "CODE", {});
			var code29_nodes = children(code29);
			t245 = claim_text(code29_nodes, "scheduleUpdate");
			code29_nodes.forEach(detach);
			t246 = claim_text(p54_nodes, " in scenarios that you think that changes may most likely happen:");
			p54_nodes.forEach(detach);
			t247 = claim_space(section7_nodes);
			ul5 = claim_element(section7_nodes, "UL", {});
			var ul5_nodes = children(ul5);
			li14 = claim_element(ul5_nodes, "LI", {});
			var li14_nodes = children(li14);
			t248 = claim_text(li14_nodes, "Event handlers");
			li14_nodes.forEach(detach);
			t249 = claim_space(ul5_nodes);
			li15 = claim_element(ul5_nodes, "LI", {});
			var li15_nodes = children(li15);
			t250 = claim_text(li15_nodes, "Timeout (eg: ");
			code30 = claim_element(li15_nodes, "CODE", {});
			var code30_nodes = children(code30);
			t251 = claim_text(code30_nodes, "setTimeout");
			code30_nodes.forEach(detach);
			t252 = claim_text(li15_nodes, ", ");
			code31 = claim_element(li15_nodes, "CODE", {});
			var code31_nodes = children(code31);
			t253 = claim_text(code31_nodes, "setInterval");
			code31_nodes.forEach(detach);
			t254 = claim_text(li15_nodes, ", ...)");
			li15_nodes.forEach(detach);
			t255 = claim_space(ul5_nodes);
			li16 = claim_element(ul5_nodes, "LI", {});
			var li16_nodes = children(li16);
			t256 = claim_text(li16_nodes, "API handling, promises handling");
			li16_nodes.forEach(detach);
			t257 = claim_space(ul5_nodes);
			li17 = claim_element(ul5_nodes, "LI", {});
			var li17_nodes = children(li17);
			t258 = claim_text(li17_nodes, "...");
			li17_nodes.forEach(detach);
			ul5_nodes.forEach(detach);
			t259 = claim_space(section7_nodes);
			p55 = claim_element(section7_nodes, "P", {});
			var p55_nodes = children(p55);
			t260 = claim_text(p55_nodes, "So, instead of enforcing framework users to use ");
			code32 = claim_element(p55_nodes, "CODE", {});
			var code32_nodes = children(code32);
			t261 = claim_text(code32_nodes, "setAppState()");
			code32_nodes.forEach(detach);
			t262 = claim_text(p55_nodes, ", framework users should use the\ncustom timeouts, api handlers, ...:");
			p55_nodes.forEach(detach);
			t263 = claim_space(section7_nodes);
			pre15 = claim_element(section7_nodes, "PRE", { class: true });
			var pre15_nodes = children(pre15);
			pre15_nodes.forEach(detach);
			t264 = claim_space(section7_nodes);
			p56 = claim_element(section7_nodes, "P", {});
			var p56_nodes = children(p56);
			t265 = claim_text(p56_nodes, "Inspired by ");
			a25 = claim_element(p56_nodes, "A", { href: true, rel: true });
			var a25_nodes = children(a25);
			t266 = claim_text(a25_nodes, "AngularJS’s \\$timeout");
			a25_nodes.forEach(detach);
			p56_nodes.forEach(detach);
			t267 = claim_space(section7_nodes);
			p57 = claim_element(section7_nodes, "P", {});
			var p57_nodes = children(p57);
			t268 = claim_text(p57_nodes, "Your framework user can now be free to change the application state the way he wants, as long as the changes are done within your custom handlers. Because at the end of the handler, you will call ");
			code33 = claim_element(p57_nodes, "CODE", {});
			var code33_nodes = children(code33);
			t269 = claim_text(code33_nodes, "scheduleUpdate()");
			code33_nodes.forEach(detach);
			t270 = claim_text(p57_nodes, ".");
			p57_nodes.forEach(detach);
			t271 = claim_space(section7_nodes);
			p58 = claim_element(section7_nodes, "P", {});
			var p58_nodes = children(p58);
			t272 = claim_text(p58_nodes, "Similarly, this may trip new developers into the framework too! Try search ");
			a26 = claim_element(p58_nodes, "A", { href: true, rel: true });
			var a26_nodes = children(a26);
			t273 = claim_text(a26_nodes, "\"AngularJS $timeout vs window.setTimeout\"");
			a26_nodes.forEach(detach);
			p58_nodes.forEach(detach);
			t274 = claim_space(section7_nodes);
			p59 = claim_element(section7_nodes, "P", {});
			var p59_nodes = children(p59);
			t275 = claim_text(p59_nodes, "You may think, what if there are no state changes in the handler function, wouldn’t calling an extra ");
			code34 = claim_element(p59_nodes, "CODE", {});
			var code34_nodes = children(code34);
			t276 = claim_text(code34_nodes, "scheduleUpdate()");
			code34_nodes.forEach(detach);
			t277 = claim_text(p59_nodes, " be inefficient? Well so far, we haven’t discussed what’s happening in ");
			code35 = claim_element(p59_nodes, "CODE", {});
			var code35_nodes = children(code35);
			t278 = claim_text(code35_nodes, "scheduleUpdate()");
			code35_nodes.forEach(detach);
			t279 = claim_text(p59_nodes, ", we can check ");
			strong7 = claim_element(p59_nodes, "STRONG", {});
			var strong7_nodes = children(strong7);
			t280 = claim_text(strong7_nodes, "what has changed");
			strong7_nodes.forEach(detach);
			t281 = claim_text(p59_nodes, " (which will be covered in the next section)");
			strong8 = claim_element(p59_nodes, "STRONG", {});
			var strong8_nodes = children(strong8);
			t282 = claim_text(strong8_nodes, ",");
			strong8_nodes.forEach(detach);
			t283 = claim_text(p59_nodes, " and if there’s nothing change, we can skip the subsequent steps.");
			p59_nodes.forEach(detach);
			t284 = claim_space(section7_nodes);
			p60 = claim_element(section7_nodes, "P", {});
			var p60_nodes = children(p60);
			t285 = claim_text(p60_nodes, "If you look at the strategies that we have tried so far, you may have noticed a common struggle:");
			p60_nodes.forEach(detach);
			t286 = claim_space(section7_nodes);
			ul6 = claim_element(section7_nodes, "UL", {});
			var ul6_nodes = children(ul6);
			li18 = claim_element(ul6_nodes, "LI", {});
			var li18_nodes = children(li18);
			t287 = claim_text(li18_nodes, "allow framework user to change the application state in any way he wants");
			li18_nodes.forEach(detach);
			t288 = claim_space(ul6_nodes);
			li19 = claim_element(ul6_nodes, "LI", {});
			var li19_nodes = children(li19);
			t289 = claim_text(li19_nodes, "achieve reactivity without much runtime complexity.");
			li19_nodes.forEach(detach);
			ul6_nodes.forEach(detach);
			t290 = claim_space(section7_nodes);
			p61 = claim_element(section7_nodes, "P", {});
			var p61_nodes = children(p61);
			t291 = claim_text(p61_nodes, "At this point, you got to agree that enforcing framework developers to call ");
			code36 = claim_element(p61_nodes, "CODE", {});
			var code36_nodes = children(code36);
			t292 = claim_text(code36_nodes, "setAppState");
			code36_nodes.forEach(detach);
			t293 = claim_text(p61_nodes, " whenever they want to change the application state, requires ");
			strong9 = claim_element(p61_nodes, "STRONG", {});
			var strong9_nodes = children(strong9);
			t294 = claim_text(strong9_nodes, "less runtime complexity");
			strong9_nodes.forEach(detach);
			t295 = claim_text(p61_nodes, " from the framework, and it’s unlikely to have any corner cases or caveats that need to handle.");
			p61_nodes.forEach(detach);
			t296 = claim_space(section7_nodes);
			p62 = claim_element(section7_nodes, "P", {});
			var p62_nodes = children(p62);
			t297 = claim_text(p62_nodes, "If the dilemma is between developer expressiveness versus runtime complexity, probably we could get the best of both worlds by shifting the complexity from runtime to build time?");
			p62_nodes.forEach(detach);
			section7_nodes.forEach(detach);
			t298 = claim_space(nodes);
			section8 = claim_element(nodes, "SECTION", {});
			var section8_nodes = children(section8);
			h33 = claim_element(section8_nodes, "H3", {});
			var h33_nodes = children(h33);
			a27 = claim_element(h33_nodes, "A", { href: true, id: true });
			var a27_nodes = children(a27);
			t299 = claim_text(a27_nodes, "Static analysis");
			a27_nodes.forEach(detach);
			h33_nodes.forEach(detach);
			t300 = claim_space(section8_nodes);
			p63 = claim_element(section8_nodes, "P", {});
			var p63_nodes = children(p63);
			t301 = claim_text(p63_nodes, "If we have a compiler that allow framework users to write:");
			p63_nodes.forEach(detach);
			t302 = claim_space(section8_nodes);
			pre16 = claim_element(section8_nodes, "PRE", { class: true });
			var pre16_nodes = children(pre16);
			pre16_nodes.forEach(detach);
			t303 = claim_space(section8_nodes);
			p64 = claim_element(section8_nodes, "P", {});
			var p64_nodes = children(p64);
			t304 = claim_text(p64_nodes, "and compiles it to:");
			p64_nodes.forEach(detach);
			t305 = claim_space(section8_nodes);
			pre17 = claim_element(section8_nodes, "PRE", { class: true });
			var pre17_nodes = children(pre17);
			pre17_nodes.forEach(detach);
			t306 = claim_space(section8_nodes);
			p65 = claim_element(section8_nodes, "P", {});
			var p65_nodes = children(p65);
			t307 = claim_text(p65_nodes, "Then, we would really have best of both worlds! 😎");
			p65_nodes.forEach(detach);
			t308 = claim_space(section8_nodes);
			p66 = claim_element(section8_nodes, "P", {});
			var p66_nodes = children(p66);
			t309 = claim_text(p66_nodes, "Let’s look at different scenarios that the framework user would write, and see whether we know when to insert the ");
			code37 = claim_element(p66_nodes, "CODE", {});
			var code37_nodes = children(code37);
			t310 = claim_text(code37_nodes, "scheduleUpdate()");
			code37_nodes.forEach(detach);
			t311 = claim_text(p66_nodes, ":");
			p66_nodes.forEach(detach);
			t312 = claim_space(section8_nodes);
			pre18 = claim_element(section8_nodes, "PRE", { class: true });
			var pre18_nodes = children(pre18);
			pre18_nodes.forEach(detach);
			t313 = claim_space(section8_nodes);
			p67 = claim_element(section8_nodes, "P", {});
			var p67_nodes = children(p67);
			t314 = claim_text(p67_nodes, "Allow me to summarise some complexities faced in the example above:");
			p67_nodes.forEach(detach);
			t315 = claim_space(section8_nodes);
			ul7 = claim_element(section8_nodes, "UL", {});
			var ul7_nodes = children(ul7);
			li20 = claim_element(ul7_nodes, "LI", {});
			var li20_nodes = children(li20);
			t316 = claim_text(li20_nodes, "It is easy to track direct changes to the application state, but it is extremely difficult to track changes made indirectly, eg: ");
			code38 = claim_element(li20_nodes, "CODE", {});
			var code38_nodes = children(code38);
			t317 = claim_text(code38_nodes, "foo.one");
			code38_nodes.forEach(detach);
			t318 = claim_text(li20_nodes, ", ");
			code39 = claim_element(li20_nodes, "CODE", {});
			var code39_nodes = children(code39);
			t319 = claim_text(code39_nodes, "doSomethingMutable(this.appState)");
			code39_nodes.forEach(detach);
			t320 = claim_text(li20_nodes, " or ");
			code40 = claim_element(li20_nodes, "CODE", {});
			var code40_nodes = children(code40);
			t321 = claim_text(code40_nodes, "this.appState.obj.increment()");
			code40_nodes.forEach(detach);
			li20_nodes.forEach(detach);
			t322 = claim_space(ul7_nodes);
			li21 = claim_element(ul7_nodes, "LI", {});
			var li21_nodes = children(li21);
			t323 = claim_text(li21_nodes, "It is easy to track changes through assignment statements, but extremely difficult to track changes made through mutating methods, eg: ");
			code41 = claim_element(li21_nodes, "CODE", {});
			var code41_nodes = children(code41);
			t324 = claim_text(code41_nodes, "this.appState.list.push('1')");
			code41_nodes.forEach(detach);
			t325 = claim_text(li21_nodes, ", I mean how do you know the method is mutating?");
			li21_nodes.forEach(detach);
			ul7_nodes.forEach(detach);
			t326 = claim_space(section8_nodes);
			p68 = claim_element(section8_nodes, "P", {});
			var p68_nodes = children(p68);
			t327 = claim_text(p68_nodes, "So, for ");
			a28 = claim_element(p68_nodes, "A", { href: true, rel: true });
			var a28_nodes = children(a28);
			t328 = claim_text(a28_nodes, "Svelte");
			a28_nodes.forEach(detach);
			t329 = claim_text(p68_nodes, ", one of the frameworks that use static analysis to achieve reactivity, it only ensures reactivity through assignment operators (eg: ");
			code42 = claim_element(p68_nodes, "CODE", {});
			var code42_nodes = children(code42);
			t330 = claim_text(code42_nodes, "=");
			code42_nodes.forEach(detach);
			t331 = claim_text(p68_nodes, ", ");
			code43 = claim_element(p68_nodes, "CODE", {});
			var code43_nodes = children(code43);
			t332 = claim_text(code43_nodes, "+=");
			code43_nodes.forEach(detach);
			t333 = claim_text(p68_nodes, ", …) and unary arithmetic operators (eg: ");
			code44 = claim_element(p68_nodes, "CODE", {});
			var code44_nodes = children(code44);
			t334 = claim_text(code44_nodes, "++");
			code44_nodes.forEach(detach);
			t335 = claim_text(p68_nodes, " and ");
			code45 = claim_element(p68_nodes, "CODE", {});
			var code45_nodes = children(code45);
			t336 = claim_text(code45_nodes, "--");
			code45_nodes.forEach(detach);
			t337 = claim_text(p68_nodes, ").");
			p68_nodes.forEach(detach);
			t338 = claim_space(section8_nodes);
			p69 = claim_element(section8_nodes, "P", {});
			var p69_nodes = children(p69);
			t339 = claim_text(p69_nodes, "I believe that there’s room yet to be explored in this space, especially at the ");
			a29 = claim_element(p69_nodes, "A", { href: true, rel: true });
			var a29_nodes = children(a29);
			t340 = claim_text(a29_nodes, "rise of TypeScript");
			a29_nodes.forEach(detach);
			t341 = claim_text(p69_nodes, ", we may be able to understand our application state better through static types.");
			p69_nodes.forEach(detach);
			section8_nodes.forEach(detach);
			t342 = claim_space(nodes);
			section9 = claim_element(nodes, "SECTION", {});
			var section9_nodes = children(section9);
			h22 = claim_element(section9_nodes, "H2", {});
			var h22_nodes = children(h22);
			a30 = claim_element(h22_nodes, "A", { href: true, id: true });
			var a30_nodes = children(a30);
			t343 = claim_text(a30_nodes, "Summary");
			a30_nodes.forEach(detach);
			h22_nodes.forEach(detach);
			t344 = claim_space(section9_nodes);
			p70 = claim_element(section9_nodes, "P", {});
			var p70_nodes = children(p70);
			t345 = claim_text(p70_nodes, "We’ve gone through different strategies of knowing when the application state has changed:");
			p70_nodes.forEach(detach);
			t346 = claim_space(section9_nodes);
			ul8 = claim_element(section9_nodes, "UL", {});
			var ul8_nodes = children(ul8);
			li22 = claim_element(ul8_nodes, "LI", {});
			var li22_nodes = children(li22);
			t347 = claim_text(li22_nodes, "mutation tracking");
			li22_nodes.forEach(detach);
			t348 = claim_space(ul8_nodes);
			li23 = claim_element(ul8_nodes, "LI", {});
			var li23_nodes = children(li23);
			t349 = claim_text(li23_nodes, "just call ");
			code46 = claim_element(li23_nodes, "CODE", {});
			var code46_nodes = children(code46);
			t350 = claim_text(code46_nodes, "scheduleUpdate");
			code46_nodes.forEach(detach);
			li23_nodes.forEach(detach);
			t351 = claim_space(ul8_nodes);
			li24 = claim_element(ul8_nodes, "LI", {});
			var li24_nodes = children(li24);
			t352 = claim_text(li24_nodes, "static analysis");
			li24_nodes.forEach(detach);
			ul8_nodes.forEach(detach);
			t353 = claim_space(section9_nodes);
			p71 = claim_element(section9_nodes, "P", {});
			var p71_nodes = children(p71);
			t354 = claim_text(p71_nodes, "Different strategies manifests itself in terms of the API of the framework:");
			p71_nodes.forEach(detach);
			t355 = claim_space(section9_nodes);
			ul10 = claim_element(section9_nodes, "UL", {});
			var ul10_nodes = children(ul10);
			li25 = claim_element(ul10_nodes, "LI", {});
			var li25_nodes = children(li25);
			p72 = claim_element(li25_nodes, "P", {});
			var p72_nodes = children(p72);
			t356 = claim_text(p72_nodes, "Is the framework user going to change the application state with simple object manipulation? or have to use API like ");
			code47 = claim_element(p72_nodes, "CODE", {});
			var code47_nodes = children(code47);
			t357 = claim_text(code47_nodes, "setAppState()");
			code47_nodes.forEach(detach);
			t358 = claim_text(p72_nodes, "?");
			p72_nodes.forEach(detach);
			li25_nodes.forEach(detach);
			t359 = claim_space(ul10_nodes);
			li28 = claim_element(ul10_nodes, "LI", {});
			var li28_nodes = children(li28);
			p73 = claim_element(li28_nodes, "P", {});
			var p73_nodes = children(p73);
			t360 = claim_text(p73_nodes, "Is there caveats that the framework user needs to be aware of?");
			p73_nodes.forEach(detach);
			t361 = claim_space(li28_nodes);
			p74 = claim_element(li28_nodes, "P", {});
			var p74_nodes = children(p74);
			t362 = claim_text(p74_nodes, "For example:");
			p74_nodes.forEach(detach);
			t363 = claim_space(li28_nodes);
			ul9 = claim_element(li28_nodes, "UL", {});
			var ul9_nodes = children(ul9);
			li26 = claim_element(ul9_nodes, "LI", {});
			var li26_nodes = children(li26);
			t364 = claim_text(li26_nodes, "Can only use assignment statement to achieve reactivity?");
			li26_nodes.forEach(detach);
			t365 = claim_space(ul9_nodes);
			li27 = claim_element(ul9_nodes, "LI", {});
			var li27_nodes = children(li27);
			t366 = claim_text(li27_nodes, "Does framework user need to use a helper function for adding new reactive property to the application state?");
			li27_nodes.forEach(detach);
			ul9_nodes.forEach(detach);
			li28_nodes.forEach(detach);
			ul10_nodes.forEach(detach);
			t367 = claim_space(section9_nodes);
			p75 = claim_element(section9_nodes, "P", {});
			var p75_nodes = children(p75);
			t368 = claim_text(p75_nodes, "Knowing when an application state has changed, allow frameworks to know when to update our view. Yet, to optimise the updates, frameworks need to know what has changed in the application state.");
			p75_nodes.forEach(detach);
			t369 = claim_space(section9_nodes);
			p76 = claim_element(section9_nodes, "P", {});
			var p76_nodes = children(p76);
			t370 = claim_text(p76_nodes, "Are we going to remove and recreate every DOM element in the view? Do we know that which part of the view is going to change based on what has changed in the application state?");
			p76_nodes.forEach(detach);
			t371 = claim_space(section9_nodes);
			p77 = claim_element(section9_nodes, "P", {});
			var p77_nodes = children(p77);
			t372 = claim_text(p77_nodes, "That is, if we know ");
			strong10 = claim_element(p77_nodes, "STRONG", {});
			var strong10_nodes = children(strong10);
			t373 = claim_text(strong10_nodes, "the WHAT");
			strong10_nodes.forEach(detach);
			t374 = claim_text(p77_nodes, ".");
			p77_nodes.forEach(detach);
			t375 = claim_space(section9_nodes);
			hr = claim_element(section9_nodes, "HR", {});
			t376 = claim_space(section9_nodes);
			p78 = claim_element(section9_nodes, "P", {});
			var p78_nodes = children(p78);
			t377 = claim_text(p78_nodes, "I’d like to thank ");
			a31 = claim_element(p78_nodes, "A", { href: true, rel: true });
			var a31_nodes = children(a31);
			t378 = claim_text(a31_nodes, "Rich Harris");
			a31_nodes.forEach(detach);
			t379 = claim_text(p78_nodes, " for pointing out some inaccuracies in the previous version of this article and providing valuable feedbacks. All the remaining errors are mine..");
			p78_nodes.forEach(detach);
			section9_nodes.forEach(detach);
			this.h();
		},
		h() {
			attr(ul0, "class", "sitemap");
			attr(ul0, "id", "sitemap");
			attr(ul0, "role", "navigation");
			attr(ul0, "aria-label", "Table of Contents");
			attr(a0, "href", "#what-is-reactivity");
			attr(a1, "href", "#the-when-and-the-what");
			attr(a2, "href", "#the-when");
			attr(a3, "href", "#mutation-tracking");
			attr(a4, "href", "#prior-proxy");
			attr(a5, "href", "#with-proxy");
			attr(a6, "href", "#just-call-scheduleupdate");
			attr(a7, "href", "#static-analysis");
			attr(a8, "href", "#summary");
			attr(a9, "href", "#what-is-reactivity");
			attr(a9, "id", "what-is-reactivity");
			attr(pre0, "class", "language-js");
			attr(pre1, "class", "language-html");
			attr(pre2, "class", "language-js");
			attr(a10, "href", "#the-when-and-the-what");
			attr(a10, "id", "the-when-and-the-what");
			attr(a11, "href", "#the-when");
			attr(a11, "id", "the-when");
			attr(a12, "href", "https://techterms.com/definition/screen_tearing");
			attr(a12, "rel", "nofollow");
			attr(pre3, "class", "language-js");
			attr(a13, "href", "https://kentcdodds.com/blog/dont-sync-state-derive-it");
			attr(a13, "rel", "nofollow");
			attr(a14, "href", "#mutation-tracking");
			attr(a14, "id", "mutation-tracking");
			attr(pre4, "class", "language-js");
			attr(pre5, "class", "language-js");
			attr(a15, "href", "#prior-proxy");
			attr(a15, "id", "prior-proxy");
			attr(pre6, "class", "language-js");
			attr(a16, "href", "https://paper.dropbox.com/doc/Reactivity-in-Web-Frameworks--Aroey0wh9iZRE8dm9lC4Ulo0AQ-D6CkkTTpH1AqGvBlKcQ85");
			attr(a16, "rel", "nofollow");
			attr(a17, "href", "https://vuejs.org/v2/guide/reactivity.html#Change-Detection-Caveats");
			attr(a17, "rel", "nofollow");
			attr(pre7, "class", "language-js");
			attr(a18, "href", "https://github.com/vuejs/vue/blob/22790b250cd5239a8379b4ec8cc3a9b570dac4bc/src/core/observer/array.js");
			attr(a18, "rel", "nofollow");
			attr(a19, "href", "https://codesandbox.io/s/mutation-tracking-getterssetters-44ono");
			attr(a19, "rel", "nofollow");
			attr(a20, "href", "https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Proxy");
			attr(a20, "rel", "nofollow");
			attr(a21, "href", "#with-proxy");
			attr(a21, "id", "with-proxy");
			attr(pre8, "class", "language-js");
			attr(pre9, "class", "language-js");
			attr(pre10, "class", "language-js");
			attr(a22, "href", "https://caniuse.com/#feat=proxy");
			attr(a22, "rel", "nofollow");
			attr(a23, "href", "#just-call-scheduleupdate");
			attr(a23, "id", "just-call-scheduleupdate");
			attr(pre11, "class", "language-js");
			attr(pre12, "class", "language-js");
			attr(a24, "href", "https://github.com/facebook/react/blob/0cf22a56a18790ef34c71bef14f64695c0498619/packages/react/src/ReactBaseClasses.js#L57");
			attr(a24, "rel", "nofollow");
			attr(pre13, "class", "language-js");
			attr(pre14, "class", "language-js");
			attr(pre15, "class", "language-js");
			attr(a25, "href", "https://github.com/angular/angular.js/blob/master/src/ng/timeout.js#L13");
			attr(a25, "rel", "nofollow");
			attr(a26, "href", "https://www.google.com/search?q=angularjs%20$timeout%20vs%20window.setTimeout");
			attr(a26, "rel", "nofollow");
			attr(a27, "href", "#static-analysis");
			attr(a27, "id", "static-analysis");
			attr(pre16, "class", "language-js");
			attr(pre17, "class", "language-js");
			attr(pre18, "class", "language-js");
			attr(a28, "href", "http://github.com/sveltejs/svelte");
			attr(a28, "rel", "nofollow");
			attr(a29, "href", "https://2019.stateofjs.com/javascript-flavors/typescript/");
			attr(a29, "rel", "nofollow");
			attr(a30, "href", "#summary");
			attr(a30, "id", "summary");
			attr(a31, "href", "https://twitter.com/Rich_Harris");
			attr(a31, "rel", "nofollow");
		},
		m(target, anchor) {
			insert(target, section0, anchor);
			append(section0, ul0);
			append(section0, li0);
			append(li0, a0);
			append(a0, t0);
			append(section0, li1);
			append(li1, a1);
			append(a1, t1);
			append(section0, ul2);
			append(ul2, li2);
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
			append(ul2, li8);
			append(li8, a8);
			append(a8, t8);
			insert(target, t9, anchor);
			insert(target, section1, anchor);
			append(section1, h10);
			append(h10, a9);
			append(a9, t10);
			append(section1, t11);
			append(section1, p0);
			append(p0, t12);
			append(section1, t13);
			append(section1, p1);
			append(p1, t14);
			append(section1, t15);
			append(section1, p2);
			append(p2, t16);
			append(section1, t17);
			append(section1, p3);
			append(p3, t18);
			append(section1, t19);
			append(section1, pre0);
			pre0.innerHTML = raw0_value;
			append(section1, t20);
			append(section1, p4);
			append(p4, t21);
			append(section1, t22);
			append(section1, pre1);
			pre1.innerHTML = raw1_value;
			append(section1, t23);
			append(section1, p5);
			append(p5, t24);
			append(section1, t25);
			append(section1, pre2);
			pre2.innerHTML = raw2_value;
			append(section1, t26);
			append(section1, p6);
			append(p6, t27);
			append(p6, em0);
			append(em0, u0);
			append(u0, t28);
			append(p6, t29);
			append(p6, em1);
			append(em1, u1);
			append(u1, t30);
			append(p6, t31);
			append(section1, t32);
			append(section1, p7);
			append(p7, t33);
			append(p7, code0);
			append(code0, t34);
			append(p7, t35);
			append(p7, code1);
			append(code1, t36);
			append(p7, t37);
			append(section1, t38);
			append(section1, p8);
			append(p8, t39);
			append(section1, t40);
			append(section1, p9);
			append(p9, t41);
			append(section1, t42);
			append(section1, blockquote0);
			append(blockquote0, p10);
			append(p10, t43);
			insert(target, t44, anchor);
			insert(target, section2, anchor);
			append(section2, h11);
			append(h11, a10);
			append(a10, t45);
			append(section2, t46);
			append(section2, p11);
			append(p11, t47);
			append(section2, t48);
			append(section2, ul3);
			append(ul3, li9);
			append(li9, t49);
			append(ul3, t50);
			append(ul3, li10);
			append(li10, t51);
			append(section2, t52);
			append(section2, p12);
			append(p12, strong0);
			append(strong0, t53);
			append(p12, t54);
			append(p12, strong1);
			append(strong1, t55);
			append(p12, t56);
			append(section2, t57);
			append(section2, p13);
			append(p13, t58);
			append(p13, strong2);
			append(strong2, t59);
			append(p13, t60);
			append(p13, strong3);
			append(strong3, t61);
			append(p13, t62);
			append(p13, strong4);
			append(strong4, t63);
			append(p13, t64);
			append(p13, strong5);
			append(strong5, t65);
			append(p13, t66);
			insert(target, t67, anchor);
			insert(target, section3, anchor);
			append(section3, h20);
			append(h20, a11);
			append(a11, t68);
			append(section3, t69);
			append(section3, p14);
			append(p14, t70);
			append(section3, t71);
			append(section3, p15);
			append(p15, t72);
			append(p15, code2);
			append(code2, t73);
			append(p15, t74);
			append(p15, code3);
			append(code3, t75);
			append(p15, t76);
			append(p15, code4);
			append(code4, t77);
			append(p15, t78);
			append(p15, a12);
			append(a12, t79);
			append(p15, t80);
			append(section3, t81);
			append(section3, p16);
			append(p16, t82);
			append(section3, t83);
			append(section3, pre3);
			pre3.innerHTML = raw3_value;
			append(section3, t84);
			append(section3, p17);
			append(p17, t85);
			append(p17, em2);
			append(em2, t86);
			append(section3, t87);
			append(section3, blockquote1);
			append(blockquote1, p18);
			append(p18, t88);
			append(p18, code5);
			append(code5, t89);
			append(p18, t90);
			append(p18, code6);
			append(code6, t91);
			append(p18, t92);
			append(p18, a13);
			append(a13, t93);
			append(section3, t94);
			append(section3, p19);
			append(p19, t95);
			insert(target, t96, anchor);
			insert(target, section4, anchor);
			append(section4, h21);
			append(h21, a14);
			append(a14, t97);
			append(section4, t98);
			append(section4, p20);
			append(p20, t99);
			append(section4, t100);
			append(section4, p21);
			append(p21, t101);
			append(section4, t102);
			append(section4, p22);
			append(p22, t103);
			append(section4, t104);
			append(section4, p23);
			append(p23, t105);
			append(section4, t106);
			append(section4, pre4);
			pre4.innerHTML = raw4_value;
			append(section4, t107);
			append(section4, p24);
			append(p24, t108);
			append(section4, t109);
			append(section4, pre5);
			pre5.innerHTML = raw5_value;
			append(section4, t110);
			append(section4, p25);
			append(p25, t111);
			append(p25, code7);
			append(code7, t112);
			append(p25, t113);
			append(p25, code8);
			append(code8, t114);
			append(p25, t115);
			append(p25, code9);
			append(code9, t116);
			append(p25, t117);
			append(section4, t118);
			append(section4, p26);
			append(p26, t119);
			append(section4, t120);
			append(section4, p27);
			append(p27, t121);
			append(section4, t122);
			append(section4, p28);
			append(p28, em3);
			append(em3, t123);
			append(em3, code10);
			append(code10, t124);
			append(em3, t125);
			append(em3, code11);
			append(code11, t126);
			append(em3, t127);
			append(p28, t128);
			append(section4, t129);
			append(section4, p29);
			append(p29, t130);
			insert(target, t131, anchor);
			insert(target, section5, anchor);
			append(section5, h30);
			append(h30, a15);
			append(a15, t132);
			append(section5, t133);
			append(section5, p30);
			append(p30, t134);
			append(section5, t135);
			append(section5, pre6);
			pre6.innerHTML = raw6_value;
			append(section5, t136);
			append(section5, p31);
			append(p31, t137);
			append(p31, a16);
			append(a16, t138);
			append(p31, t139);
			append(section5, t140);
			append(section5, p32);
			append(p32, t141);
			append(section5, t142);
			append(section5, p33);
			append(p33, t143);
			append(p33, a17);
			append(a17, code12);
			append(code12, t144);
			append(p33, t145);
			append(p33, code13);
			append(code13, t146);
			append(p33, t147);
			append(section5, t148);
			append(section5, p34);
			append(p34, t149);
			append(p34, code14);
			append(code14, t150);
			append(p34, t151);
			append(p34, code15);
			append(code15, t152);
			append(p34, t153);
			append(p34, code16);
			append(code16, t154);
			append(p34, t155);
			append(p34, code17);
			append(code17, t156);
			append(p34, t157);
			append(p34, code18);
			append(code18, t158);
			append(p34, t159);
			append(p34, code19);
			append(code19, t160);
			append(p34, t161);
			append(p34, code20);
			append(code20, t162);
			append(p34, t163);
			append(section5, t164);
			append(section5, p35);
			append(p35, t165);
			append(section5, t166);
			append(section5, pre7);
			pre7.innerHTML = raw7_value;
			append(section5, t167);
			append(section5, p36);
			append(p36, t168);
			append(p36, a18);
			append(a18, t169);
			append(p36, t170);
			append(section5, t171);
			append(section5, blockquote2);
			append(blockquote2, p37);
			append(p37, t172);
			append(p37, a19);
			append(a19, t173);
			append(section5, t174);
			append(section5, p38);
			append(p38, t175);
			append(section5, t176);
			append(section5, p39);
			append(p39, t177);
			append(section5, t178);
			append(section5, p40);
			append(p40, t179);
			append(p40, a20);
			append(a20, t180);
			append(p40, t181);
			insert(target, t182, anchor);
			insert(target, section6, anchor);
			append(section6, h31);
			append(h31, a21);
			append(a21, t183);
			append(section6, t184);
			append(section6, p41);
			append(p41, t185);
			append(p41, code21);
			append(code21, t186);
			append(p41, t187);
			append(p41, code22);
			append(code22, t188);
			append(p41, t189);
			append(section6, t190);
			append(section6, pre8);
			pre8.innerHTML = raw8_value;
			append(section6, t191);
			append(section6, p42);
			append(p42, strong6);
			append(strong6, t192);
			append(section6, t193);
			append(section6, p43);
			append(p43, t194);
			append(p43, code23);
			append(code23, t195);
			append(p43, t196);
			append(section6, t197);
			append(section6, pre9);
			pre9.innerHTML = raw9_value;
			append(section6, t198);
			append(section6, p44);
			append(p44, t199);
			append(section6, t200);
			append(section6, ul4);
			append(ul4, li11);
			append(li11, t201);
			append(ul4, t202);
			append(ul4, li12);
			append(li12, t203);
			append(ul4, t204);
			append(ul4, li13);
			append(li13, t205);
			append(section6, t206);
			append(section6, pre10);
			pre10.innerHTML = raw10_value;
			append(section6, t207);
			append(section6, p45);
			append(p45, t208);
			append(p45, code24);
			append(code24, t209);
			append(p45, t210);
			append(p45, code25);
			append(code25, t211);
			append(p45, t212);
			append(section6, t213);
			append(section6, p46);
			append(p46, t214);
			append(p46, a22);
			append(a22, t215);
			append(p46, t216);
			append(section6, t217);
			append(section6, p47);
			append(p47, t218);
			insert(target, t219, anchor);
			insert(target, section7, anchor);
			append(section7, h32);
			append(h32, a23);
			append(a23, t220);
			append(a23, code26);
			append(code26, t221);
			append(section7, t222);
			append(section7, p48);
			append(p48, t223);
			append(section7, t224);
			append(section7, p49);
			append(p49, t225);
			append(p49, code27);
			append(code27, t226);
			append(p49, t227);
			append(section7, t228);
			append(section7, pre11);
			pre11.innerHTML = raw11_value;
			append(section7, t229);
			append(section7, p50);
			append(p50, t230);
			append(section7, t231);
			append(section7, pre12);
			pre12.innerHTML = raw12_value;
			append(section7, t232);
			append(section7, p51);
			append(p51, t233);
			append(p51, a24);
			append(a24, t234);
			append(a24, code28);
			append(code28, t235);
			append(p51, t236);
			append(section7, t237);
			append(section7, p52);
			append(p52, t238);
			append(section7, t239);
			append(section7, pre13);
			pre13.innerHTML = raw13_value;
			append(section7, t240);
			append(section7, p53);
			append(p53, t241);
			append(section7, t242);
			append(section7, pre14);
			pre14.innerHTML = raw14_value;
			append(section7, t243);
			append(section7, p54);
			append(p54, t244);
			append(p54, code29);
			append(code29, t245);
			append(p54, t246);
			append(section7, t247);
			append(section7, ul5);
			append(ul5, li14);
			append(li14, t248);
			append(ul5, t249);
			append(ul5, li15);
			append(li15, t250);
			append(li15, code30);
			append(code30, t251);
			append(li15, t252);
			append(li15, code31);
			append(code31, t253);
			append(li15, t254);
			append(ul5, t255);
			append(ul5, li16);
			append(li16, t256);
			append(ul5, t257);
			append(ul5, li17);
			append(li17, t258);
			append(section7, t259);
			append(section7, p55);
			append(p55, t260);
			append(p55, code32);
			append(code32, t261);
			append(p55, t262);
			append(section7, t263);
			append(section7, pre15);
			pre15.innerHTML = raw15_value;
			append(section7, t264);
			append(section7, p56);
			append(p56, t265);
			append(p56, a25);
			append(a25, t266);
			append(section7, t267);
			append(section7, p57);
			append(p57, t268);
			append(p57, code33);
			append(code33, t269);
			append(p57, t270);
			append(section7, t271);
			append(section7, p58);
			append(p58, t272);
			append(p58, a26);
			append(a26, t273);
			append(section7, t274);
			append(section7, p59);
			append(p59, t275);
			append(p59, code34);
			append(code34, t276);
			append(p59, t277);
			append(p59, code35);
			append(code35, t278);
			append(p59, t279);
			append(p59, strong7);
			append(strong7, t280);
			append(p59, t281);
			append(p59, strong8);
			append(strong8, t282);
			append(p59, t283);
			append(section7, t284);
			append(section7, p60);
			append(p60, t285);
			append(section7, t286);
			append(section7, ul6);
			append(ul6, li18);
			append(li18, t287);
			append(ul6, t288);
			append(ul6, li19);
			append(li19, t289);
			append(section7, t290);
			append(section7, p61);
			append(p61, t291);
			append(p61, code36);
			append(code36, t292);
			append(p61, t293);
			append(p61, strong9);
			append(strong9, t294);
			append(p61, t295);
			append(section7, t296);
			append(section7, p62);
			append(p62, t297);
			insert(target, t298, anchor);
			insert(target, section8, anchor);
			append(section8, h33);
			append(h33, a27);
			append(a27, t299);
			append(section8, t300);
			append(section8, p63);
			append(p63, t301);
			append(section8, t302);
			append(section8, pre16);
			pre16.innerHTML = raw16_value;
			append(section8, t303);
			append(section8, p64);
			append(p64, t304);
			append(section8, t305);
			append(section8, pre17);
			pre17.innerHTML = raw17_value;
			append(section8, t306);
			append(section8, p65);
			append(p65, t307);
			append(section8, t308);
			append(section8, p66);
			append(p66, t309);
			append(p66, code37);
			append(code37, t310);
			append(p66, t311);
			append(section8, t312);
			append(section8, pre18);
			pre18.innerHTML = raw18_value;
			append(section8, t313);
			append(section8, p67);
			append(p67, t314);
			append(section8, t315);
			append(section8, ul7);
			append(ul7, li20);
			append(li20, t316);
			append(li20, code38);
			append(code38, t317);
			append(li20, t318);
			append(li20, code39);
			append(code39, t319);
			append(li20, t320);
			append(li20, code40);
			append(code40, t321);
			append(ul7, t322);
			append(ul7, li21);
			append(li21, t323);
			append(li21, code41);
			append(code41, t324);
			append(li21, t325);
			append(section8, t326);
			append(section8, p68);
			append(p68, t327);
			append(p68, a28);
			append(a28, t328);
			append(p68, t329);
			append(p68, code42);
			append(code42, t330);
			append(p68, t331);
			append(p68, code43);
			append(code43, t332);
			append(p68, t333);
			append(p68, code44);
			append(code44, t334);
			append(p68, t335);
			append(p68, code45);
			append(code45, t336);
			append(p68, t337);
			append(section8, t338);
			append(section8, p69);
			append(p69, t339);
			append(p69, a29);
			append(a29, t340);
			append(p69, t341);
			insert(target, t342, anchor);
			insert(target, section9, anchor);
			append(section9, h22);
			append(h22, a30);
			append(a30, t343);
			append(section9, t344);
			append(section9, p70);
			append(p70, t345);
			append(section9, t346);
			append(section9, ul8);
			append(ul8, li22);
			append(li22, t347);
			append(ul8, t348);
			append(ul8, li23);
			append(li23, t349);
			append(li23, code46);
			append(code46, t350);
			append(ul8, t351);
			append(ul8, li24);
			append(li24, t352);
			append(section9, t353);
			append(section9, p71);
			append(p71, t354);
			append(section9, t355);
			append(section9, ul10);
			append(ul10, li25);
			append(li25, p72);
			append(p72, t356);
			append(p72, code47);
			append(code47, t357);
			append(p72, t358);
			append(ul10, t359);
			append(ul10, li28);
			append(li28, p73);
			append(p73, t360);
			append(li28, t361);
			append(li28, p74);
			append(p74, t362);
			append(li28, t363);
			append(li28, ul9);
			append(ul9, li26);
			append(li26, t364);
			append(ul9, t365);
			append(ul9, li27);
			append(li27, t366);
			append(section9, t367);
			append(section9, p75);
			append(p75, t368);
			append(section9, t369);
			append(section9, p76);
			append(p76, t370);
			append(section9, t371);
			append(section9, p77);
			append(p77, t372);
			append(p77, strong10);
			append(strong10, t373);
			append(p77, t374);
			append(section9, t375);
			append(section9, hr);
			append(section9, t376);
			append(section9, p78);
			append(p78, t377);
			append(p78, a31);
			append(a31, t378);
			append(p78, t379);
		},
		p: noop,
		d(detaching) {
			if (detaching) detach(section0);
			if (detaching) detach(t9);
			if (detaching) detach(section1);
			if (detaching) detach(t44);
			if (detaching) detach(section2);
			if (detaching) detach(t67);
			if (detaching) detach(section3);
			if (detaching) detach(t96);
			if (detaching) detach(section4);
			if (detaching) detach(t131);
			if (detaching) detach(section5);
			if (detaching) detach(t182);
			if (detaching) detach(section6);
			if (detaching) detach(t219);
			if (detaching) detach(section7);
			if (detaching) detach(t298);
			if (detaching) detach(section8);
			if (detaching) detach(t342);
			if (detaching) detach(section9);
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
	"title": "Reactivity in Web Frameworks (Part 1)",
	"date": "2020-01-05T08:00:00Z",
	"lastUpdated": "2020-01-08T08:00:00Z",
	"description": "Reactivity is the ability of a web framework to update your view whenever the application state has changed. How do web frameworks achieve reactivity?",
	"slug": "reactivity-in-web-frameworks-the-when",
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
