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

var image = "https://lihautan.com/reduce-minified-code-size-by-property-mangling/assets/hero-twitter-b6836b1f.jpg";

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
					"@id": "https%3A%2F%2Flihautan.com%2Freduce-minified-code-size-by-property-mangling",
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
			attr(meta11, "content", "https%3A%2F%2Flihautan.com%2Freduce-minified-code-size-by-property-mangling");
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
							"@id": "https%3A%2F%2Flihautan.com%2Freduce-minified-code-size-by-property-mangling",
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

/* content/blog/reduce-minified-code-size-by-property-mangling/@@page-markup.svelte generated by Svelte v3.24.0 */

function create_default_slot(ctx) {
	let section0;
	let ul4;
	let li0;
	let a0;
	let t0;
	let ul1;
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
	let ul2;
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
	let ul3;
	let li9;
	let a9;
	let t9;
	let li10;
	let a10;
	let t10;
	let li11;
	let a11;
	let t11;
	let li12;
	let a12;
	let t12;
	let t13;
	let section1;
	let h20;
	let a13;
	let t14;
	let t15;
	let p0;
	let t16;
	let t17;
	let pre0;

	let raw0_value = `<code class="language-js"><span class="token keyword">class</span> <span class="token class-name">Human</span> <span class="token punctuation">&#123;</span>
  <span class="token function">constructor</span><span class="token punctuation">(</span><span class="token parameter">chewAmount</span><span class="token punctuation">)</span> <span class="token punctuation">&#123;</span>
    <span class="token keyword">this</span><span class="token punctuation">.</span>chewAmount <span class="token operator">=</span> <span class="token number">3</span><span class="token punctuation">;</span>
  <span class="token punctuation">&#125;</span>
  <span class="token function">eat</span><span class="token punctuation">(</span><span class="token punctuation">)</span> <span class="token punctuation">&#123;</span>
    <span class="token keyword">for</span> <span class="token punctuation">(</span><span class="token keyword">let</span> amount <span class="token operator">=</span> <span class="token number">3</span><span class="token punctuation">;</span> amount <span class="token operator">&lt;</span> <span class="token keyword">this</span><span class="token punctuation">.</span>chewAmount<span class="token punctuation">;</span> amount<span class="token operator">++</span><span class="token punctuation">)</span> <span class="token punctuation">&#123;</span>
      <span class="token keyword">this</span><span class="token punctuation">.</span><span class="token function">chew</span><span class="token punctuation">(</span><span class="token punctuation">)</span><span class="token punctuation">;</span>
    <span class="token punctuation">&#125;</span>
  <span class="token punctuation">&#125;</span>
  <span class="token function">chew</span><span class="token punctuation">(</span><span class="token punctuation">)</span> <span class="token punctuation">&#123;</span><span class="token punctuation">&#125;</span>
<span class="token punctuation">&#125;</span>

<span class="token keyword">function</span> <span class="token function">getHumanEating</span><span class="token punctuation">(</span><span class="token punctuation">)</span> <span class="token punctuation">&#123;</span>
  <span class="token keyword">const</span> lihau <span class="token operator">=</span> <span class="token keyword">new</span> <span class="token class-name">Human</span><span class="token punctuation">(</span><span class="token punctuation">)</span><span class="token punctuation">;</span>
  <span class="token keyword">return</span> lihau<span class="token punctuation">.</span><span class="token function">eat</span><span class="token punctuation">(</span><span class="token punctuation">)</span><span class="token punctuation">;</span>
<span class="token punctuation">&#125;</span></code>` + "";

	let t18;
	let p1;
	let strong0;
	let t19;
	let t20;
	let p2;
	let t21;
	let a14;
	let t22;
	let t23;
	let t24;
	let pre1;

	let raw1_value = `<code class="language-js"><span class="token keyword">class</span> <span class="token class-name">Human</span> <span class="token punctuation">&#123;</span>
  <span class="token function">constructor</span><span class="token punctuation">(</span><span class="token parameter">chewAmount</span><span class="token punctuation">)</span> <span class="token punctuation">&#123;</span>
    <span class="token keyword">this</span><span class="token punctuation">.</span>chewAmount <span class="token operator">=</span> <span class="token number">3</span><span class="token punctuation">;</span>
  <span class="token punctuation">&#125;</span>
  <span class="token function">eat</span><span class="token punctuation">(</span><span class="token punctuation">)</span> <span class="token punctuation">&#123;</span>
    <span class="token keyword">for</span> <span class="token punctuation">(</span><span class="token keyword">let</span> i <span class="token operator">=</span> <span class="token number">3</span><span class="token punctuation">;</span> i <span class="token operator">&lt;</span> <span class="token keyword">this</span><span class="token punctuation">.</span>chewAmount<span class="token punctuation">;</span> i<span class="token operator">++</span><span class="token punctuation">)</span> <span class="token punctuation">&#123;</span>
      <span class="token keyword">this</span><span class="token punctuation">.</span><span class="token function">chew</span><span class="token punctuation">(</span><span class="token punctuation">)</span><span class="token punctuation">;</span>
    <span class="token punctuation">&#125;</span>
  <span class="token punctuation">&#125;</span>
  <span class="token function">chew</span><span class="token punctuation">(</span><span class="token punctuation">)</span> <span class="token punctuation">&#123;</span><span class="token punctuation">&#125;</span>
<span class="token punctuation">&#125;</span>
<span class="token keyword">function</span> <span class="token function">getHumanEating</span><span class="token punctuation">(</span><span class="token punctuation">)</span> <span class="token punctuation">&#123;</span>
  <span class="token keyword">return</span> <span class="token keyword">new</span> <span class="token class-name">Human</span><span class="token punctuation">(</span><span class="token punctuation">)</span><span class="token punctuation">.</span><span class="token function">eat</span><span class="token punctuation">(</span><span class="token punctuation">)</span><span class="token punctuation">;</span>
<span class="token punctuation">&#125;</span></code>` + "";

	let t25;
	let p3;
	let strong1;
	let t26;
	let t27;
	let p4;
	let em0;
	let t28;
	let t29;
	let p5;
	let t30;
	let t31;
	let p6;
	let t32;
	let strong2;
	let t33;
	let t34;
	let t35;
	let p7;
	let t36;
	let a15;
	let t37;
	let t38;
	let strong3;
	let t39;
	let t40;
	let strong4;
	let t41;
	let t42;
	let strong5;
	let t43;
	let t44;
	let t45;
	let p8;
	let t46;
	let code0;
	let t47;
	let t48;
	let code1;
	let t49;
	let t50;
	let t51;
	let pre2;

	let raw2_value = `<code class="language-js"><span class="token comment">// Terser option: &#123; mangle: &#123; module: true &#125; &#125;</span>
<span class="token keyword">class</span> <span class="token class-name">H</span> <span class="token punctuation">&#123;</span>
  <span class="token function">constructor</span><span class="token punctuation">(</span><span class="token parameter">chewAmount</span><span class="token punctuation">)</span> <span class="token punctuation">&#123;</span>
    <span class="token keyword">this</span><span class="token punctuation">.</span>chewAmount <span class="token operator">=</span> <span class="token number">3</span><span class="token punctuation">;</span>
  <span class="token punctuation">&#125;</span>
  <span class="token function">eat</span><span class="token punctuation">(</span><span class="token punctuation">)</span> <span class="token punctuation">&#123;</span>
    <span class="token keyword">for</span> <span class="token punctuation">(</span><span class="token keyword">let</span> i <span class="token operator">=</span> <span class="token number">3</span><span class="token punctuation">;</span> i <span class="token operator">&lt;</span> <span class="token keyword">this</span><span class="token punctuation">.</span>chewAmount<span class="token punctuation">;</span> i<span class="token operator">++</span><span class="token punctuation">)</span> <span class="token punctuation">&#123;</span>
      <span class="token keyword">this</span><span class="token punctuation">.</span><span class="token function">chew</span><span class="token punctuation">(</span><span class="token punctuation">)</span><span class="token punctuation">;</span>
    <span class="token punctuation">&#125;</span>
  <span class="token punctuation">&#125;</span>
  <span class="token function">chew</span><span class="token punctuation">(</span><span class="token punctuation">)</span> <span class="token punctuation">&#123;</span><span class="token punctuation">&#125;</span>
<span class="token punctuation">&#125;</span>
<span class="token keyword">function</span> <span class="token function">e</span><span class="token punctuation">(</span><span class="token punctuation">)</span> <span class="token punctuation">&#123;</span>
  <span class="token keyword">return</span> <span class="token keyword">new</span> <span class="token class-name">H</span><span class="token punctuation">(</span><span class="token punctuation">)</span><span class="token punctuation">.</span><span class="token function">eat</span><span class="token punctuation">(</span><span class="token punctuation">)</span><span class="token punctuation">;</span>
<span class="token punctuation">&#125;</span>
<span class="token keyword">export</span> <span class="token punctuation">&#123;</span> <span class="token constant">H</span> <span class="token keyword">as</span> Human<span class="token punctuation">,</span> e <span class="token keyword">as</span> getHumanEating <span class="token punctuation">&#125;</span><span class="token punctuation">;</span></code>` + "";

	let t52;
	let p9;
	let strong6;
	let t53;
	let t54;
	let p10;
	let t55;
	let t56;
	let p11;
	let t57;
	let code2;
	let t58;
	let t59;
	let t60;
	let p12;
	let t61;
	let t62;
	let pre3;

	let raw3_value = `<code class="language-js"><span class="token keyword">class</span> <span class="token class-name">H</span> <span class="token punctuation">&#123;</span>
  <span class="token function">constructor</span><span class="token punctuation">(</span><span class="token parameter">t</span><span class="token punctuation">)</span> <span class="token punctuation">&#123;</span>
    <span class="token keyword">this</span><span class="token punctuation">.</span>c <span class="token operator">=</span> <span class="token number">3</span><span class="token punctuation">;</span>
  <span class="token punctuation">&#125;</span>
  <span class="token function">a</span><span class="token punctuation">(</span><span class="token punctuation">)</span> <span class="token punctuation">&#123;</span>
    <span class="token keyword">for</span> <span class="token punctuation">(</span><span class="token keyword">let</span> t <span class="token operator">=</span> <span class="token number">3</span><span class="token punctuation">;</span> t <span class="token operator">&lt;</span> <span class="token keyword">this</span><span class="token punctuation">.</span>c<span class="token punctuation">;</span> t<span class="token operator">++</span><span class="token punctuation">)</span> <span class="token keyword">this</span><span class="token punctuation">.</span><span class="token function">s</span><span class="token punctuation">(</span><span class="token punctuation">)</span><span class="token punctuation">;</span>
  <span class="token punctuation">&#125;</span>
  <span class="token function">s</span><span class="token punctuation">(</span><span class="token punctuation">)</span> <span class="token punctuation">&#123;</span><span class="token punctuation">&#125;</span>
<span class="token punctuation">&#125;</span>
<span class="token keyword">function</span> <span class="token function">e</span><span class="token punctuation">(</span><span class="token punctuation">)</span> <span class="token punctuation">&#123;</span>
  <span class="token keyword">return</span> <span class="token keyword">new</span> <span class="token class-name">H</span><span class="token punctuation">(</span><span class="token punctuation">)</span><span class="token punctuation">.</span><span class="token function">a</span><span class="token punctuation">(</span><span class="token punctuation">)</span><span class="token punctuation">;</span>
<span class="token punctuation">&#125;</span>
<span class="token keyword">export</span> <span class="token punctuation">&#123;</span> <span class="token constant">H</span> <span class="token keyword">as</span> Human<span class="token punctuation">,</span> e <span class="token keyword">as</span> getHumanEating <span class="token punctuation">&#125;</span><span class="token punctuation">;</span></code>` + "";

	let t63;
	let p13;
	let strong7;
	let t64;
	let t65;
	let p14;
	let t66;
	let t67;
	let p15;
	let strong8;
	let t68;
	let t69;
	let p16;
	let t70;
	let t71;
	let p17;
	let t72;
	let code3;
	let t73;
	let t74;
	let code4;
	let t75;
	let t76;
	let t77;
	let p18;
	let t78;
	let code5;
	let t79;
	let t80;
	let code6;
	let t81;
	let t82;
	let code7;
	let t83;
	let t84;
	let t85;
	let p19;
	let strong9;
	let t86;
	let t87;
	let p20;
	let t88;
	let strong10;
	let t89;
	let t90;
	let a16;
	let t91;
	let t92;
	let t93;
	let section2;
	let h30;
	let a17;
	let t94;
	let t95;
	let p21;
	let t96;
	let strong11;
	let t97;
	let t98;
	let t99;
	let pre4;

	let raw4_value = `<code class="language-js"><span class="token comment">// filename: source.js</span>
<span class="token keyword">export</span> <span class="token keyword">function</span> <span class="token function">doSomething</span><span class="token punctuation">(</span><span class="token parameter"><span class="token punctuation">&#123;</span> paramA<span class="token punctuation">,</span> paramB <span class="token punctuation">&#125;</span></span><span class="token punctuation">)</span> <span class="token punctuation">&#123;</span>
  <span class="token keyword">return</span> <span class="token punctuation">&#123;</span> sum<span class="token punctuation">:</span> paramA <span class="token operator">+</span> paramB <span class="token punctuation">&#125;</span><span class="token punctuation">;</span>
<span class="token punctuation">&#125;</span>
<span class="token keyword">export</span> <span class="token keyword">class</span> <span class="token class-name">Car</span> <span class="token punctuation">&#123;</span>
  <span class="token function">constructor</span><span class="token punctuation">(</span><span class="token parameter"><span class="token punctuation">&#123;</span> model <span class="token punctuation">&#125;</span></span><span class="token punctuation">)</span> <span class="token punctuation">&#123;</span>
    <span class="token keyword">this</span><span class="token punctuation">.</span>model <span class="token operator">=</span> model<span class="token punctuation">;</span>
  <span class="token punctuation">&#125;</span>
  <span class="token function">drive</span><span class="token punctuation">(</span><span class="token punctuation">)</span> <span class="token punctuation">&#123;</span><span class="token punctuation">&#125;</span>
<span class="token punctuation">&#125;</span></code>` + "";

	let t100;
	let pre5;

	let raw5_value = `<code class="language-js"><span class="token comment">// filename: source.min.js</span>
<span class="token keyword">export</span> <span class="token keyword">function</span> <span class="token function">doSomething</span><span class="token punctuation">(</span><span class="token parameter"><span class="token punctuation">&#123;</span> o<span class="token punctuation">:</span> t<span class="token punctuation">,</span> t<span class="token punctuation">:</span> o <span class="token punctuation">&#125;</span></span><span class="token punctuation">)</span> <span class="token punctuation">&#123;</span>
  <span class="token keyword">return</span> <span class="token punctuation">&#123;</span> m<span class="token punctuation">:</span> t <span class="token operator">+</span> o <span class="token punctuation">&#125;</span><span class="token punctuation">;</span>
<span class="token punctuation">&#125;</span>
<span class="token keyword">export</span> <span class="token keyword">class</span> <span class="token class-name">Car</span> <span class="token punctuation">&#123;</span>
  <span class="token function">constructor</span><span class="token punctuation">(</span><span class="token parameter"><span class="token punctuation">&#123;</span> s<span class="token punctuation">:</span> t <span class="token punctuation">&#125;</span></span><span class="token punctuation">)</span> <span class="token punctuation">&#123;</span>
    <span class="token keyword">this</span><span class="token punctuation">.</span>s <span class="token operator">=</span> t<span class="token punctuation">;</span>
  <span class="token punctuation">&#125;</span>
  <span class="token function">i</span><span class="token punctuation">(</span><span class="token punctuation">)</span> <span class="token punctuation">&#123;</span><span class="token punctuation">&#125;</span>
<span class="token punctuation">&#125;</span></code>` + "";

	let t101;
	let p22;
	let t102;
	let code8;
	let t103;
	let t104;
	let code9;
	let t105;
	let t106;
	let t107;
	let p23;
	let t108;
	let strong12;
	let t109;
	let t110;
	let t111;
	let pre6;

	let raw6_value = `<code class="language-js"><span class="token comment">// filename: source.js</span>
<span class="token keyword">import</span> <span class="token punctuation">&#123;</span> doSomething <span class="token punctuation">&#125;</span> <span class="token keyword">from</span> <span class="token string">'some-library'</span><span class="token punctuation">;</span>

<span class="token function">doSomething</span><span class="token punctuation">(</span><span class="token punctuation">&#123;</span> paramA<span class="token punctuation">:</span> <span class="token number">1</span><span class="token punctuation">,</span> paramB<span class="token punctuation">:</span> <span class="token number">2</span> <span class="token punctuation">&#125;</span><span class="token punctuation">)</span><span class="token punctuation">;</span></code>` + "";

	let t112;
	let pre7;

	let raw7_value = `<code class="language-js"><span class="token comment">// filename: source.min.js</span>
<span class="token keyword">import</span> <span class="token punctuation">&#123;</span> doSomething <span class="token keyword">as</span> r <span class="token punctuation">&#125;</span> <span class="token keyword">from</span> <span class="token string">'some-library'</span><span class="token punctuation">;</span>

<span class="token function">r</span><span class="token punctuation">(</span><span class="token punctuation">&#123;</span> m<span class="token punctuation">:</span> <span class="token number">1</span><span class="token punctuation">,</span> o<span class="token punctuation">:</span> <span class="token number">2</span> <span class="token punctuation">&#125;</span><span class="token punctuation">)</span><span class="token punctuation">;</span></code>` + "";

	let t113;
	let p24;
	let t114;
	let em1;
	let t115;
	let t116;
	let code10;
	let t117;
	let t118;
	let code11;
	let t119;
	let t120;
	let t121;
	let p25;
	let t122;
	let strong13;
	let t123;
	let t124;
	let strong14;
	let t125;
	let t126;
	let t127;
	let p26;
	let t128;
	let strong15;
	let t129;
	let t130;
	let t131;
	let p27;
	let t132;
	let t133;
	let ul5;
	let li13;
	let t134;
	let t135;
	let li14;
	let t136;
	let t137;
	let p28;
	let t138;
	let t139;
	let pre8;

	let raw8_value = `<code class="language-js"><span class="token comment">// filename: source.js</span>
<span class="token keyword">class</span> <span class="token class-name">CarA</span> <span class="token punctuation">&#123;</span>
  <span class="token function">drive</span><span class="token punctuation">(</span><span class="token punctuation">)</span> <span class="token punctuation">&#123;</span><span class="token punctuation">&#125;</span>
<span class="token punctuation">&#125;</span>
<span class="token keyword">class</span> <span class="token class-name">CarB</span> <span class="token punctuation">&#123;</span>
  <span class="token function">drive</span><span class="token punctuation">(</span><span class="token punctuation">)</span> <span class="token punctuation">&#123;</span><span class="token punctuation">&#125;</span>
<span class="token punctuation">&#125;</span>
<span class="token keyword">const</span> car <span class="token operator">=</span> Math<span class="token punctuation">.</span><span class="token function">random</span><span class="token punctuation">(</span><span class="token punctuation">)</span> <span class="token operator">></span> <span class="token number">0.5</span> <span class="token operator">?</span> <span class="token keyword">new</span> <span class="token class-name">CarA</span><span class="token punctuation">(</span><span class="token punctuation">)</span> <span class="token punctuation">:</span> <span class="token keyword">new</span> <span class="token class-name">CarB</span><span class="token punctuation">(</span><span class="token punctuation">)</span><span class="token punctuation">;</span>
car<span class="token punctuation">.</span><span class="token function">drive</span><span class="token punctuation">(</span><span class="token punctuation">)</span><span class="token punctuation">;</span>

<span class="token function">foo</span><span class="token punctuation">(</span><span class="token punctuation">&#123;</span> drive<span class="token punctuation">:</span> <span class="token string">'bar'</span> <span class="token punctuation">&#125;</span><span class="token punctuation">)</span><span class="token punctuation">;</span></code>` + "";

	let t140;
	let pre9;

	let raw9_value = `<code class="language-js"><span class="token comment">// filename: source.min.js</span>
<span class="token keyword">class</span> <span class="token class-name">s</span> <span class="token punctuation">&#123;</span>
  <span class="token function">s</span><span class="token punctuation">(</span><span class="token punctuation">)</span> <span class="token punctuation">&#123;</span><span class="token punctuation">&#125;</span>
<span class="token punctuation">&#125;</span>
<span class="token keyword">class</span> <span class="token class-name">e</span> <span class="token punctuation">&#123;</span>
  <span class="token function">s</span><span class="token punctuation">(</span><span class="token punctuation">)</span> <span class="token punctuation">&#123;</span><span class="token punctuation">&#125;</span>
<span class="token punctuation">&#125;</span>
<span class="token keyword">const</span> a <span class="token operator">=</span> Math<span class="token punctuation">.</span><span class="token function">random</span><span class="token punctuation">(</span><span class="token punctuation">)</span> <span class="token operator">></span> <span class="token number">0.5</span> <span class="token operator">?</span> <span class="token keyword">new</span> <span class="token class-name">s</span><span class="token punctuation">(</span><span class="token punctuation">)</span> <span class="token punctuation">:</span> <span class="token keyword">new</span> <span class="token class-name">e</span><span class="token punctuation">(</span><span class="token punctuation">)</span><span class="token punctuation">;</span>
a<span class="token punctuation">.</span><span class="token function">s</span><span class="token punctuation">(</span><span class="token punctuation">)</span><span class="token punctuation">,</span> <span class="token function">foo</span><span class="token punctuation">(</span><span class="token punctuation">&#123;</span> s<span class="token punctuation">:</span> <span class="token string">'bar'</span> <span class="token punctuation">&#125;</span><span class="token punctuation">)</span><span class="token punctuation">;</span></code>` + "";

	let t141;
	let p29;
	let t142;
	let code12;
	let t143;
	let t144;
	let t145;
	let p30;
	let t146;
	let code13;
	let t147;
	let t148;
	let code14;
	let t149;
	let t150;
	let code15;
	let t151;
	let t152;
	let code16;
	let t153;
	let t154;
	let t155;
	let section3;
	let h4;
	let a18;
	let t156;
	let t157;
	let p31;
	let strong16;
	let t158;
	let t159;
	let t160;
	let p32;
	let t161;
	let code17;
	let t162;
	let t163;
	let t164;
	let p33;
	let strong17;
	let t165;
	let t166;
	let p34;
	let t167;
	let t168;
	let ul6;
	let li15;
	let t169;
	let code18;
	let t170;
	let t171;
	let code19;
	let t172;
	let t173;
	let li16;
	let t174;
	let code20;
	let t175;
	let t176;
	let code21;
	let t177;
	let t178;
	let p35;
	let t179;
	let a19;
	let t180;
	let t181;
	let a20;
	let code22;
	let t182;
	let t183;
	let t184;
	let p36;
	let t185;
	let code23;
	let t186;
	let t187;
	let a21;
	let t188;
	let t189;
	let code24;
	let t190;
	let t191;
	let strong18;
	let t192;
	let t193;
	let p37;
	let strong19;
	let t194;
	let t195;
	let p38;
	let t196;
	let t197;
	let p39;
	let t198;
	let code25;
	let t199;
	let t200;
	let a22;
	let t201;
	let t202;
	let code26;
	let t203;
	let t204;
	let t205;
	let section4;
	let h31;
	let a23;
	let t206;
	let t207;
	let p40;
	let t208;
	let a24;
	let t209;
	let t210;
	let a25;
	let t211;
	let t212;
	let t213;
	let p41;
	let strong20;
	let t214;
	let t215;
	let t216;
	let p42;
	let t217;
	let t218;
	let p43;
	let t219;
	let t220;
	let section5;
	let h21;
	let a26;
	let t221;
	let t222;
	let p44;
	let t223;
	let t224;
	let p45;
	let t225;
	let t226;
	let section6;
	let h32;
	let a27;
	let t227;
	let t228;
	let p46;
	let t229;
	let code27;
	let t230;
	let t231;
	let code28;
	let t232;
	let t233;
	let t234;
	let pre10;

	let raw10_value = `<code class="language-js"><span class="token comment">// filename: source.js</span>
<span class="token keyword">class</span> <span class="token class-name">Car</span> <span class="token punctuation">&#123;</span>
  <span class="token function">driveTo</span><span class="token punctuation">(</span><span class="token parameter"><span class="token punctuation">&#123;</span> destination <span class="token punctuation">&#125;</span></span><span class="token punctuation">)</span> <span class="token punctuation">&#123;</span>
    <span class="token keyword">this</span><span class="token punctuation">.</span>destination <span class="token operator">=</span> destination<span class="token punctuation">;</span>
    <span class="token keyword">this</span><span class="token punctuation">.</span><span class="token function">calculateRoute</span><span class="token punctuation">(</span><span class="token punctuation">)</span><span class="token punctuation">;</span>
    <span class="token keyword">this</span><span class="token punctuation">.</span><span class="token function">startDriving</span><span class="token punctuation">(</span><span class="token punctuation">)</span><span class="token punctuation">;</span>
  <span class="token punctuation">&#125;</span>
  <span class="token function">calculateRoute</span><span class="token punctuation">(</span><span class="token punctuation">)</span> <span class="token punctuation">&#123;</span>
    <span class="token keyword">this</span><span class="token punctuation">.</span><span class="token function">planRoute</span><span class="token punctuation">(</span><span class="token keyword">this</span><span class="token punctuation">.</span>currentLocation<span class="token punctuation">,</span> <span class="token keyword">this</span><span class="token punctuation">.</span>destination<span class="token punctuation">)</span><span class="token punctuation">;</span>
  <span class="token punctuation">&#125;</span>
  <span class="token function">startDriving</span><span class="token punctuation">(</span><span class="token punctuation">)</span> <span class="token punctuation">&#123;</span><span class="token punctuation">&#125;</span>
  <span class="token function">planRoute</span><span class="token punctuation">(</span><span class="token punctuation">)</span> <span class="token punctuation">&#123;</span><span class="token punctuation">&#125;</span>
<span class="token punctuation">&#125;</span></code>` + "";

	let t235;
	let p47;
	let t236;
	let code29;
	let t237;
	let t238;
	let code30;
	let t239;
	let t240;
	let code31;
	let t241;
	let t242;
	let code32;
	let t243;
	let t244;
	let code33;
	let t245;
	let t246;
	let code34;
	let t247;
	let t248;
	let t249;
	let p48;
	let t250;
	let t251;
	let p49;
	let strong21;
	let t252;
	let t253;
	let pre11;

	let raw11_value = `<code class="language-js"><span class="token comment">// filename: terser_options.js</span>
<span class="token keyword">const</span> terserOptions <span class="token operator">=</span> <span class="token punctuation">&#123;</span>
  mangle<span class="token punctuation">:</span> <span class="token punctuation">&#123;</span>
    properties<span class="token punctuation">:</span> <span class="token punctuation">&#123;</span>
      reserved<span class="token punctuation">:</span> <span class="token punctuation">[</span><span class="token string">'driveTo'</span><span class="token punctuation">]</span><span class="token punctuation">,</span>
    <span class="token punctuation">&#125;</span><span class="token punctuation">,</span>
  <span class="token punctuation">&#125;</span><span class="token punctuation">,</span>
<span class="token punctuation">&#125;</span><span class="token punctuation">;</span></code>` + "";

	let t254;
	let p50;
	let strong22;
	let t255;
	let t256;
	let pre12;

	let raw12_value = `<code class="language-js"><span class="token comment">// filename: terser_options.js</span>
<span class="token keyword">const</span> terserOptions <span class="token operator">=</span> <span class="token punctuation">&#123;</span>
  mangle<span class="token punctuation">:</span> <span class="token punctuation">&#123;</span>
    properties<span class="token punctuation">:</span> <span class="token punctuation">&#123;</span>
      regex<span class="token punctuation">:</span> <span class="token regex">/^(destination|calculateRoute|currentLocation|startDriving|planRoute)$/</span><span class="token punctuation">,</span>
    <span class="token punctuation">&#125;</span><span class="token punctuation">,</span>
  <span class="token punctuation">&#125;</span><span class="token punctuation">,</span>
<span class="token punctuation">&#125;</span><span class="token punctuation">;</span></code>` + "";

	let t257;
	let p51;
	let t258;
	let a28;
	let t259;
	let t260;
	let code35;
	let t261;
	let t262;
	let t263;
	let pre13;

	let raw13_value = `<code class="language-js"><span class="token comment">// filename: source.js</span>
<span class="token keyword">class</span> <span class="token class-name">Car</span> <span class="token punctuation">&#123;</span>
  <span class="token function">driveTo</span><span class="token punctuation">(</span><span class="token parameter"><span class="token punctuation">&#123;</span> destination <span class="token punctuation">&#125;</span></span><span class="token punctuation">)</span> <span class="token punctuation">&#123;</span>
    <span class="token keyword">this</span><span class="token punctuation">.</span>_destination <span class="token operator">=</span> destination<span class="token punctuation">;</span>
    <span class="token keyword">this</span><span class="token punctuation">.</span><span class="token function">_calculateRoute</span><span class="token punctuation">(</span><span class="token punctuation">)</span><span class="token punctuation">;</span>
    <span class="token keyword">this</span><span class="token punctuation">.</span><span class="token function">_startDriving</span><span class="token punctuation">(</span><span class="token punctuation">)</span><span class="token punctuation">;</span>
  <span class="token punctuation">&#125;</span>
  <span class="token function">_calculateRoute</span><span class="token punctuation">(</span><span class="token punctuation">)</span> <span class="token punctuation">&#123;</span>
    <span class="token keyword">this</span><span class="token punctuation">.</span><span class="token function">_planRoute</span><span class="token punctuation">(</span><span class="token keyword">this</span><span class="token punctuation">.</span>_currentLocation<span class="token punctuation">,</span> <span class="token keyword">this</span><span class="token punctuation">.</span>_destination<span class="token punctuation">)</span><span class="token punctuation">;</span>
  <span class="token punctuation">&#125;</span>
  <span class="token function">_startDriving</span><span class="token punctuation">(</span><span class="token punctuation">)</span> <span class="token punctuation">&#123;</span><span class="token punctuation">&#125;</span>
  <span class="token function">_planRoute</span><span class="token punctuation">(</span><span class="token punctuation">)</span> <span class="token punctuation">&#123;</span><span class="token punctuation">&#125;</span>
<span class="token punctuation">&#125;</span></code>` + "";

	let t264;
	let p52;
	let t265;
	let t266;
	let pre14;

	let raw14_value = `<code class="language-js"><span class="token comment">// filename: terser_options.js</span>
<span class="token keyword">const</span> terserOptions <span class="token operator">=</span> <span class="token punctuation">&#123;</span>
  mangle<span class="token punctuation">:</span> <span class="token punctuation">&#123;</span>
    properties<span class="token punctuation">:</span> <span class="token punctuation">&#123;</span>
      regex<span class="token punctuation">:</span> <span class="token regex">/^_/</span><span class="token punctuation">,</span>
    <span class="token punctuation">&#125;</span><span class="token punctuation">,</span>
  <span class="token punctuation">&#125;</span><span class="token punctuation">,</span>
<span class="token punctuation">&#125;</span><span class="token punctuation">;</span></code>` + "";

	let t267;
	let section7;
	let h33;
	let a29;
	let t268;
	let t269;
	let p53;
	let t270;
	let code36;
	let t271;
	let t272;
	let code37;
	let t273;
	let t274;
	let t275;
	let p54;
	let code38;
	let t276;
	let t277;
	let t278;
	let pre15;

	let raw15_value = `<code class="language-js"><span class="token keyword">const</span> fs <span class="token operator">=</span> <span class="token function">require</span><span class="token punctuation">(</span><span class="token string">'fs'</span><span class="token punctuation">)</span><span class="token punctuation">.</span>promises<span class="token punctuation">;</span>
<span class="token keyword">const</span> terser <span class="token operator">=</span> <span class="token function">require</span><span class="token punctuation">(</span><span class="token string">'terser'</span><span class="token punctuation">)</span><span class="token punctuation">;</span>
<span class="token keyword">const</span> nameCache <span class="token operator">=</span> <span class="token punctuation">&#123;</span><span class="token punctuation">&#125;</span><span class="token punctuation">;</span>
<span class="token keyword">await</span> terser<span class="token punctuation">.</span><span class="token function">minify</span><span class="token punctuation">(</span>code<span class="token punctuation">,</span> <span class="token punctuation">&#123;</span>
  nameCache<span class="token punctuation">,</span>
<span class="token punctuation">&#125;</span><span class="token punctuation">)</span><span class="token punctuation">;</span>

<span class="token comment">// serialise and store &#96;nameCache&#96;</span>
<span class="token keyword">await</span> fs<span class="token punctuation">.</span><span class="token function">writeFile</span><span class="token punctuation">(</span><span class="token string">'nameCache.json'</span><span class="token punctuation">,</span> <span class="token constant">JSON</span><span class="token punctuation">.</span><span class="token function">stringify</span><span class="token punctuation">(</span>nameCache<span class="token punctuation">)</span><span class="token punctuation">,</span> <span class="token string">'utf-8'</span><span class="token punctuation">)</span><span class="token punctuation">;</span>

<span class="token comment">// deserialise and seed Terser</span>
<span class="token keyword">const</span> nameCache <span class="token operator">=</span> <span class="token constant">JSON</span><span class="token punctuation">.</span><span class="token function">parse</span><span class="token punctuation">(</span><span class="token keyword">await</span> fs<span class="token punctuation">.</span><span class="token function">readFile</span><span class="token punctuation">(</span><span class="token string">'nameCache.json'</span><span class="token punctuation">,</span> <span class="token string">'utf-8'</span><span class="token punctuation">)</span><span class="token punctuation">)</span><span class="token punctuation">;</span>
<span class="token keyword">await</span> terser<span class="token punctuation">.</span><span class="token function">minify</span><span class="token punctuation">(</span>code<span class="token punctuation">,</span> <span class="token punctuation">&#123;</span>
  nameCache<span class="token punctuation">,</span>
<span class="token punctuation">&#125;</span><span class="token punctuation">)</span><span class="token punctuation">;</span></code>` + "";

	let t279;
	let section8;
	let h34;
	let a30;
	let t280;
	let t281;
	let p55;
	let t282;
	let t283;
	let p56;
	let t284;
	let t285;
	let p57;
	let t286;
	let t287;
	let p58;
	let t288;
	let t289;
	let p59;
	let t290;
	let t291;
	let p60;
	let t292;
	let a31;
	let t293;
	let t294;
	let t295;
	let p61;
	let t296;
	let t297;
	let p62;
	let t298;
	let t299;
	let pre16;

	let raw16_value = `<code class="language-js"><span class="token comment">// filename: babel.config.js</span>
<span class="token keyword">const</span> nameMapping <span class="token operator">=</span> <span class="token punctuation">&#123;</span>
  driveTo<span class="token punctuation">:</span> <span class="token string">'d'</span><span class="token punctuation">,</span> <span class="token comment">// rename all &#96;.driveTo&#96; to &#96;.d&#96;</span>
<span class="token punctuation">&#125;</span><span class="token punctuation">;</span>

<span class="token keyword">return</span> <span class="token punctuation">&#123;</span>
  plugins<span class="token punctuation">:</span> <span class="token punctuation">[</span>
    <span class="token punctuation">[</span>
      <span class="token string">'babel-plugin-transform-rename-properties'</span><span class="token punctuation">,</span>
      <span class="token punctuation">&#123;</span>
        rename<span class="token punctuation">:</span> nameMapping<span class="token punctuation">,</span>
      <span class="token punctuation">&#125;</span><span class="token punctuation">,</span>
    <span class="token punctuation">]</span><span class="token punctuation">,</span>
  <span class="token punctuation">]</span><span class="token punctuation">,</span>
<span class="token punctuation">&#125;</span><span class="token punctuation">;</span></code>` + "";

	let t300;
	let section9;
	let h22;
	let a32;
	let t301;
	let t302;
	let section10;
	let h35;
	let a33;
	let t303;
	let t304;
	let p63;
	let t305;
	let code39;
	let t306;
	let t307;
	let a34;
	let t308;
	let t309;
	let a35;
	let t310;
	let t311;
	let t312;
	let p64;
	let t313;
	let a36;
	let t314;
	let t315;
	let t316;
	let pre17;

	let raw17_value = `<code class="language-js"><span class="token comment">// filename: webpack.config.js</span>
<span class="token keyword">const</span> TerserPlugin <span class="token operator">=</span> <span class="token function">require</span><span class="token punctuation">(</span><span class="token string">'terser-webpack-plugin'</span><span class="token punctuation">)</span><span class="token punctuation">;</span>
module<span class="token punctuation">.</span>exports <span class="token operator">=</span> <span class="token punctuation">&#123;</span>
  optimization<span class="token punctuation">:</span> <span class="token punctuation">&#123;</span>
    minimize<span class="token punctuation">:</span> <span class="token boolean">true</span><span class="token punctuation">,</span>
    minimizer<span class="token punctuation">:</span> <span class="token punctuation">[</span>
      <span class="token keyword">new</span> <span class="token class-name">TerserPlugin</span><span class="token punctuation">(</span><span class="token punctuation">&#123;</span>
        terserOptions<span class="token punctuation">:</span> <span class="token punctuation">&#123;</span>
          mangle<span class="token punctuation">:</span> <span class="token punctuation">&#123;</span>
            properties<span class="token punctuation">:</span> <span class="token punctuation">&#123;</span>
              regex<span class="token punctuation">:</span> <span class="token regex">/^_/</span><span class="token punctuation">,</span>
            <span class="token punctuation">&#125;</span><span class="token punctuation">,</span>
          <span class="token punctuation">&#125;</span><span class="token punctuation">,</span>
        <span class="token punctuation">&#125;</span><span class="token punctuation">,</span>
      <span class="token punctuation">&#125;</span><span class="token punctuation">)</span><span class="token punctuation">,</span>
    <span class="token punctuation">]</span><span class="token punctuation">,</span>
  <span class="token punctuation">&#125;</span><span class="token punctuation">,</span>
<span class="token punctuation">&#125;</span><span class="token punctuation">;</span></code>` + "";

	let t317;
	let p65;
	let t318;
	let a37;
	let t319;
	let t320;
	let pre18;

	let raw18_value = `<code class="language-js"><span class="token comment">// filename: rollup.config.js</span>
<span class="token keyword">import</span> <span class="token punctuation">&#123;</span> terser <span class="token punctuation">&#125;</span> <span class="token keyword">from</span> <span class="token string">'rollup-plugin-terser'</span><span class="token punctuation">;</span>
<span class="token function">rollup</span><span class="token punctuation">(</span><span class="token punctuation">&#123;</span>
  plugins<span class="token punctuation">:</span> <span class="token punctuation">[</span>
    <span class="token function">terser</span><span class="token punctuation">(</span><span class="token punctuation">&#123;</span>
      mangle<span class="token punctuation">:</span> <span class="token punctuation">&#123;</span>
        properties<span class="token punctuation">:</span> <span class="token punctuation">&#123;</span>
          regex<span class="token punctuation">:</span> <span class="token regex">/^_/</span><span class="token punctuation">,</span>
        <span class="token punctuation">&#125;</span><span class="token punctuation">,</span>
      <span class="token punctuation">&#125;</span><span class="token punctuation">,</span>
    <span class="token punctuation">&#125;</span><span class="token punctuation">)</span><span class="token punctuation">,</span>
  <span class="token punctuation">]</span><span class="token punctuation">,</span>
<span class="token punctuation">&#125;</span><span class="token punctuation">)</span><span class="token punctuation">;</span></code>` + "";

	let t321;
	let section11;
	let h36;
	let a38;
	let t322;
	let t323;
	let blockquote0;
	let p66;
	let t324;
	let a39;
	let t325;
	let t326;
	let a40;
	let t327;
	let t328;
	let t329;
	let p67;
	let t330;
	let t331;
	let p68;
	let t332;
	let t333;
	let table;
	let thead;
	let tr0;
	let th0;
	let t334;
	let t335;
	let th1;
	let t336;
	let t337;
	let tbody;
	let tr1;
	let td0;
	let t338;
	let t339;
	let td1;
	let t340;
	let t341;
	let tr2;
	let td2;
	let t342;
	let t343;
	let td3;
	let t344;
	let t345;
	let p69;
	let t346;
	let code40;
	let t347;
	let t348;
	let t349;
	let ul7;
	let li17;
	let code41;
	let t350;
	let t351;
	let li18;
	let code42;
	let t352;
	let t353;
	let t354;
	let li19;
	let code43;
	let t355;
	let t356;
	let code44;
	let t357;
	let t358;
	let t359;
	let li20;
	let code45;
	let t360;
	let t361;
	let code46;
	let t362;
	let t363;
	let t364;
	let p70;
	let t365;
	let code47;
	let t366;
	let t367;
	let a41;
	let code48;
	let t368;
	let t369;
	let t370;
	let blockquote1;
	let p71;
	let t371;
	let code49;
	let t372;
	let t373;
	let a42;
	let t374;
	let t375;
	let p72;
	let t376;
	let a43;
	let t377;
	let t378;
	let code50;
	let t379;
	let t380;
	let code51;
	let t381;
	let t382;
	let code52;
	let t383;
	let t384;
	let a44;
	let t385;
	let t386;
	let t387;
	let section12;
	let h23;
	let a45;
	let t388;
	let t389;
	let p73;
	let t390;
	let t391;
	let p74;
	let t392;
	let t393;
	let section13;
	let h24;
	let a46;
	let t394;
	let t395;
	let ul8;
	let li21;
	let a47;
	let t396;
	let t397;
	let li22;
	let a48;
	let t398;
	let t399;
	let li23;
	let a49;
	let t400;

	return {
		c() {
			section0 = element("section");
			ul4 = element("ul");
			li0 = element("li");
			a0 = element("a");
			t0 = text("What is Mangling Property");
			ul1 = element("ul");
			li1 = element("li");
			a1 = element("a");
			t1 = text("Why is property mangling considered unsafe?");
			ul0 = element("ul");
			li2 = element("li");
			a2 = element("a");
			t2 = text("Set or get property from the global scope");
			li3 = element("li");
			a3 = element("a");
			t3 = text("Mangling for rollup / webpack bundled code");
			li4 = element("li");
			a4 = element("a");
			t4 = text("How to mangle property responsibly and safely");
			ul2 = element("ul");
			li5 = element("li");
			a5 = element("a");
			t5 = text("Private property");
			li6 = element("li");
			a6 = element("a");
			t6 = text("Consistent property mangling across subsequent minifications");
			li7 = element("li");
			a7 = element("a");
			t7 = text("Consistent property mangling across different builds");
			li8 = element("li");
			a8 = element("a");
			t8 = text("Misc");
			ul3 = element("ul");
			li9 = element("li");
			a9 = element("a");
			t9 = text("Webpack and Rollup");
			li10 = element("li");
			a10 = element("a");
			t10 = text("A curious case of Preact");
			li11 = element("li");
			a11 = element("a");
			t11 = text("Closing Note");
			li12 = element("li");
			a12 = element("a");
			t12 = text("Further Reading");
			t13 = space();
			section1 = element("section");
			h20 = element("h2");
			a13 = element("a");
			t14 = text("What is Mangling Property");
			t15 = space();
			p0 = element("p");
			t16 = text("Assume you have the following JavaScript code:");
			t17 = space();
			pre0 = element("pre");
			t18 = space();
			p1 = element("p");
			strong0 = element("strong");
			t19 = text("Original: 268 Bytes");
			t20 = space();
			p2 = element("p");
			t21 = text("If you minify this with the default options with ");
			a14 = element("a");
			t22 = text("Terser");
			t23 = text(", you probably get something like:");
			t24 = space();
			pre1 = element("pre");
			t25 = space();
			p3 = element("p");
			strong1 = element("strong");
			t26 = text("207 Bytes (77.2%)");
			t27 = space();
			p4 = element("p");
			em0 = element("em");
			t28 = text("(Usually Terser would compress whitespace too, but for ease of reading, allow me to keep the whitespace)");
			t29 = space();
			p5 = element("p");
			t30 = text("Your code still behaves the same, even though the variable name has changed.");
			t31 = space();
			p6 = element("p");
			t32 = text("This behavior of renaming variable name to compress JavaScript code is called ");
			strong2 = element("strong");
			t33 = text("Mangle");
			t34 = text(".");
			t35 = space();
			p7 = element("p");
			t36 = text("Terser has several ");
			a15 = element("a");
			t37 = text("Mangle options");
			t38 = text(", that allows you to control whether or not to mangle ");
			strong3 = element("strong");
			t39 = text("class name");
			t40 = text(", ");
			strong4 = element("strong");
			t41 = text("function name");
			t42 = text(", ");
			strong5 = element("strong");
			t43 = text("property name");
			t44 = text(", or specify any reserved keywords to not mangle, or should it mangle global variable.");
			t45 = space();
			p8 = element("p");
			t46 = text("If the above code is written within a ES Module, then probably we wont refer the class ");
			code0 = element("code");
			t47 = text("Human");
			t48 = text(" globally, rather refer it through ");
			code1 = element("code");
			t49 = text("import");
			t50 = text(", then the name of the class probably does not matter:");
			t51 = space();
			pre2 = element("pre");
			t52 = space();
			p9 = element("p");
			strong6 = element("strong");
			t53 = text("186 Bytes (69.4%)");
			t54 = space();
			p10 = element("p");
			t55 = text("But can we do better?");
			t56 = space();
			p11 = element("p");
			t57 = text("Well, if you look at the code, the property named ");
			code2 = element("code");
			t58 = text("chewAmount");
			t59 = text(" takes up 20 characters, which is almost 10% of the code.");
			t60 = space();
			p12 = element("p");
			t61 = text("If we rename all the property name to 1 character variable, then we would end up with a much smaller code:");
			t62 = space();
			pre3 = element("pre");
			t63 = space();
			p13 = element("p");
			strong7 = element("strong");
			t64 = text("107 Bytes (39.9%)");
			t65 = space();
			p14 = element("p");
			t66 = text("If it ends up with a much smaller bundle, should we rename our property name and method name to a shorter name? And why didn't Terser do this by default?");
			t67 = space();
			p15 = element("p");
			strong8 = element("strong");
			t68 = text("Should we rename our property name and method name to something short?");
			t69 = space();
			p16 = element("p");
			t70 = text("No! That would hurt the readability of the code. 😥");
			t71 = space();
			p17 = element("p");
			t72 = text("Also, what if someone else imports the class ");
			code3 = element("code");
			t73 = text("Human");
			t74 = text(" and wants to use the property ");
			code4 = element("code");
			t75 = text("chewAmount");
			t76 = text("?");
			t77 = space();
			p18 = element("p");
			t78 = text("He would have to rename it to ");
			code5 = element("code");
			t79 = text("human.c");
			t80 = text(" instead of ");
			code6 = element("code");
			t81 = text("human.chewAmount");
			t82 = text(" and probably scratching his head everytime he reads his code, wondering what does ");
			code7 = element("code");
			t83 = text("human.c");
			t84 = text(" mean?");
			t85 = space();
			p19 = element("p");
			strong9 = element("strong");
			t86 = text("Why Terser didn't mangle property name by default?");
			t87 = space();
			p20 = element("p");
			t88 = text("Because property mangling requires certain assumption on your code, therefore it is marked as ");
			strong10 = element("strong");
			t89 = text("very unsafe");
			t90 = text(" in the ");
			a16 = element("a");
			t91 = text("Terser documentation");
			t92 = text(" to turn it on entirely.");
			t93 = space();
			section2 = element("section");
			h30 = element("h3");
			a17 = element("a");
			t94 = text("Why is property mangling considered unsafe?");
			t95 = space();
			p21 = element("p");
			t96 = text("If you are a library author, or you wrote a module that will be used by others, and if you mangle the property of the library / module ");
			strong11 = element("strong");
			t97 = text("alone");
			t98 = text(", all your method name, object property name will be mangled, and therefore all your APIs will be broken!");
			t99 = space();
			pre4 = element("pre");
			t100 = space();
			pre5 = element("pre");
			t101 = space();
			p22 = element("p");
			t102 = text("Your user that calls ");
			code8 = element("code");
			t103 = text("doSomething({ paramA: 1, paramB: 2 })");
			t104 = text(" or ");
			code9 = element("code");
			t105 = text("car.drive()");
			t106 = text(" will not work with the minified code!");
			t107 = space();
			p23 = element("p");
			t108 = text("The same ways goes if you are importing some other library or module, and you mangle your code ");
			strong12 = element("strong");
			t109 = text("alone");
			t110 = text(", your code will be broken too!");
			t111 = space();
			pre6 = element("pre");
			t112 = space();
			pre7 = element("pre");
			t113 = space();
			p24 = element("p");
			t114 = text("I ran both the code above through the same Terser configuration, which means it also serves as a good example that the property name Terser mangles into is not consistent. It is computed and assigned at ");
			em1 = element("em");
			t115 = text("\"random\"");
			t116 = text(". You should not expect that ");
			code10 = element("code");
			t117 = text("paramA");
			t118 = text(" always get mangled into ");
			code11 = element("code");
			t119 = text("m");
			t120 = text(" everytime!");
			t121 = space();
			p25 = element("p");
			t122 = text("In summary, property mangling will break your code if you mangle your code alone. It will break at the boundary of your code, where you exports your functions or class that relies on ");
			strong13 = element("strong");
			t123 = text("public property or method");
			t124 = text("; or where you import functions or class which you ");
			strong14 = element("strong");
			t125 = text("pass in an object or calls a public method");
			t126 = text(".");
			t127 = space();
			p26 = element("p");
			t128 = text("If you ");
			strong15 = element("strong");
			t129 = text("do neither of those");
			t130 = text(", you are actually safe to mangle all properties by default.");
			t131 = space();
			p27 = element("p");
			t132 = text("If you have a standalone script that:");
			t133 = space();
			ul5 = element("ul");
			li13 = element("li");
			t134 = text("does not import nor export anything");
			t135 = space();
			li14 = element("li");
			t136 = text("does not set or read any property from the global scope (*)");
			t137 = space();
			p28 = element("p");
			t138 = text("Then you are safe to mangle all your properties. Property or method name across the file will be mangled consistently:");
			t139 = space();
			pre8 = element("pre");
			t140 = space();
			pre9 = element("pre");
			t141 = space();
			p29 = element("p");
			t142 = text("If you use the property or method named ");
			code12 = element("code");
			t143 = text("\"drive\"");
			t144 = text(", it will be mangled to the same name throughout the file.");
			t145 = space();
			p30 = element("p");
			t146 = text("In the example above, the method ");
			code13 = element("code");
			t147 = text("drive");
			t148 = text(" in both classes and the property ");
			code14 = element("code");
			t149 = text("drive");
			t150 = text(" in ");
			code15 = element("code");
			t151 = text("foo({ drive: 'bar' })");
			t152 = text(" means different things, but they are mangled into the same name, ");
			code16 = element("code");
			t153 = text("s");
			t154 = text(".");
			t155 = space();
			section3 = element("section");
			h4 = element("h4");
			a18 = element("a");
			t156 = text("Set or get property from the global scope");
			t157 = space();
			p31 = element("p");
			strong16 = element("strong");
			t158 = text("Rule of thumb:");
			t159 = text(" If you set or get property from global scope, property mangling blindly will break your code.");
			t160 = space();
			p32 = element("p");
			t161 = text("Of course, there's caveat of when this might be safe, protected by ");
			code17 = element("code");
			t162 = text("default: false");
			t163 = text(" options that you can turn on at your own risk. 🙈");
			t164 = space();
			p33 = element("p");
			strong17 = element("strong");
			t165 = text("Accessing DOM properties or method from built-in Objects");
			t166 = space();
			p34 = element("p");
			t167 = text("Terser keeps a list of property names that exempt from mangling, such as:");
			t168 = space();
			ul6 = element("ul");
			li15 = element("li");
			t169 = text("DOM properties: ");
			code18 = element("code");
			t170 = text("window.location");
			t171 = text(", ");
			code19 = element("code");
			t172 = text("document.createElement");
			t173 = space();
			li16 = element("li");
			t174 = text("Methods of built-in objects: ");
			code20 = element("code");
			t175 = text("Array.from");
			t176 = text(", ");
			code21 = element("code");
			t177 = text("Object.defineProperty");
			t178 = space();
			p35 = element("p");
			t179 = text("The list can be found in ");
			a19 = element("a");
			t180 = text("domprops.js");
			t181 = text(" and ");
			a20 = element("a");
			code22 = element("code");
			t182 = text("find_builtins");
			t183 = text(".");
			t184 = space();
			p36 = element("p");
			t185 = text("This behavior is protected by the ");
			code23 = element("code");
			t186 = text("builtins");
			t187 = text(" option in the ");
			a21 = element("a");
			t188 = text("Mangle properties option");
			t189 = text(", set it to ");
			code24 = element("code");
			t190 = text("true");
			t191 = text(" to mangle builtin properties as well. ");
			strong18 = element("strong");
			t192 = text("Override at your own risk");
			t193 = space();
			p37 = element("p");
			strong19 = element("strong");
			t194 = text("Accessing property or method of a undeclared variable");
			t195 = space();
			p38 = element("p");
			t196 = text("Variable that is not declared within the code, can be considered as global variable that is defined outside. Their properties or methods will not be mangled too.");
			t197 = space();
			p39 = element("p");
			t198 = text("You can override this behavior via the ");
			code25 = element("code");
			t199 = text("undeclared");
			t200 = text(" option in the ");
			a22 = element("a");
			t201 = text("Mangle properties option");
			t202 = text(", set it to ");
			code26 = element("code");
			t203 = text("true");
			t204 = text(" to mangle them too.");
			t205 = space();
			section4 = element("section");
			h31 = element("h3");
			a23 = element("a");
			t206 = text("Mangling for rollup / webpack bundled code");
			t207 = space();
			p40 = element("p");
			t208 = text("If you add ");
			a24 = element("a");
			t209 = text("terser-webpack-plugin");
			t210 = text(" or ");
			a25 = element("a");
			t211 = text("rollup-plugin-terser");
			t212 = text(" to your bundling step, are you safe to mangle properties?");
			t213 = space();
			p41 = element("p");
			strong20 = element("strong");
			t214 = text("Rule of thumb:");
			t215 = text(" If your bundler emits more than 1 file, No.");
			t216 = space();
			p42 = element("p");
			t217 = text("This means any bundling set up that involves code-splitting.");
			t218 = space();
			p43 = element("p");
			t219 = text("It is not safe because, terser is run after the code is split into separate files. Thus, the property or method names across files will not be mangled consistently.");
			t220 = space();
			section5 = element("section");
			h21 = element("h2");
			a26 = element("a");
			t221 = text("How to mangle property responsibly and safely");
			t222 = space();
			p44 = element("p");
			t223 = text("With so much restrictions in mind, you may wonder how can I utilise property mangling safely and responsibly?");
			t224 = space();
			p45 = element("p");
			t225 = text("Property mangling is not a all-or-nothing option in Terser, there's a few options you can play around to do property mangling safely.");
			t226 = space();
			section6 = element("section");
			h32 = element("h3");
			a27 = element("a");
			t227 = text("Private property");
			t228 = space();
			p46 = element("p");
			t229 = text("In the following example, the only publicly documented method in the class ");
			code27 = element("code");
			t230 = text("Car");
			t231 = text(" is ");
			code28 = element("code");
			t232 = text("driveTo()");
			t233 = text(", so it is okay to mangle other private methods.");
			t234 = space();
			pre10 = element("pre");
			t235 = space();
			p47 = element("p");
			t236 = text("We want to mangle ");
			code29 = element("code");
			t237 = text("this.currentLocation");
			t238 = text(", ");
			code30 = element("code");
			t239 = text("this.destination");
			t240 = text(", ");
			code31 = element("code");
			t241 = text("this.calculateRoute");
			t242 = text(", ");
			code32 = element("code");
			t243 = text("this.startDriving");
			t244 = text(", ");
			code33 = element("code");
			t245 = text("this.planRoute");
			t246 = text(", but give ");
			code34 = element("code");
			t247 = text("this.driveTo");
			t248 = text(" untouched.");
			t249 = space();
			p48 = element("p");
			t250 = text("You can choose to either");
			t251 = space();
			p49 = element("p");
			strong21 = element("strong");
			t252 = text("1. mangle all methods and properties, except a reserved list of names:");
			t253 = space();
			pre11 = element("pre");
			t254 = space();
			p50 = element("p");
			strong22 = element("strong");
			t255 = text("2. specify a list of names to be mangled with a regex:");
			t256 = space();
			pre12 = element("pre");
			t257 = space();
			p51 = element("p");
			t258 = text("Here, a ");
			a28 = element("a");
			t259 = text("unofficial JavaScript naming convention");
			t260 = text(" for private method / properties come in handy. Often times, when a variable name starts with ");
			code35 = element("code");
			t261 = text("_");
			t262 = text(", it is intended to be private.");
			t263 = space();
			pre13 = element("pre");
			t264 = space();
			p52 = element("p");
			t265 = text("This way, it makes our regex much easier:");
			t266 = space();
			pre14 = element("pre");
			t267 = space();
			section7 = element("section");
			h33 = element("h3");
			a29 = element("a");
			t268 = text("Consistent property mangling across subsequent minifications");
			t269 = space();
			p53 = element("p");
			t270 = text("If you want ");
			code36 = element("code");
			t271 = text("_calculateRoute");
			t272 = text(" to always mangled to the same name no matter how much you have changed the input file, the ");
			code37 = element("code");
			t273 = text("nameCache");
			t274 = text(" may come in handy.");
			t275 = space();
			p54 = element("p");
			code38 = element("code");
			t276 = text("nameCache");
			t277 = text(" is the internal state of Terser, that can be serialised and deserialised to seed the Terser mangling state.");
			t278 = space();
			pre15 = element("pre");
			t279 = space();
			section8 = element("section");
			h34 = element("h3");
			a30 = element("a");
			t280 = text("Consistent property mangling across different builds");
			t281 = space();
			p55 = element("p");
			t282 = text("What if you have multiple independent projects, and you want to make sure property mangling work across these projects?");
			t283 = space();
			p56 = element("p");
			t284 = text("If the variables you mangled are private properties or methods, then, you don't have an issue with this. Different projects should be nicely encapsulated, and should not depends on internal properties or methods.");
			t285 = space();
			p57 = element("p");
			t286 = text("So, what I am describing now is for public API methods and properties.");
			t287 = space();
			p58 = element("p");
			t288 = text("What if you want to mangle them as well, how do you make sure that they wont break the user after mangling the public methods or properties?");
			t289 = space();
			p59 = element("p");
			t290 = text("Since it involves public methods and properties, additional steps in setting up is understandable.");
			t291 = space();
			p60 = element("p");
			t292 = text("In that case, I would recommend maintain a name mapping of how the properties should mangle into, and use ");
			a31 = element("a");
			t293 = text("babel-plugin-transform-rename-properties");
			t294 = text(" to rename them.");
			t295 = space();
			p61 = element("p");
			t296 = text("The name mapping is a manually curated list of names of your public properties and methods, and only need to be updated whenever there's a change in your public API.");
			t297 = space();
			p62 = element("p");
			t298 = text("Think of it as part of your documentation, which should be updated whenever you change your public API.");
			t299 = space();
			pre16 = element("pre");
			t300 = space();
			section9 = element("section");
			h22 = element("h2");
			a32 = element("a");
			t301 = text("Misc");
			t302 = space();
			section10 = element("section");
			h35 = element("h3");
			a33 = element("a");
			t303 = text("Webpack and Rollup");
			t304 = space();
			p63 = element("p");
			t305 = text("Throughout the article, we mentioned Terser and ");
			code39 = element("code");
			t306 = text("terserOptions");
			t307 = text(", and didnt really go into how you would use it for projects bundled with ");
			a34 = element("a");
			t308 = text("webpack");
			t309 = text(" or ");
			a35 = element("a");
			t310 = text("rollup");
			t311 = text(".");
			t312 = space();
			p64 = element("p");
			t313 = text("For webpack user, you can use ");
			a36 = element("a");
			t314 = text("terser-webpack-plugin");
			t315 = text(".");
			t316 = space();
			pre17 = element("pre");
			t317 = space();
			p65 = element("p");
			t318 = text("For rollup user, you can use ");
			a37 = element("a");
			t319 = text("rollup-plugin-terser");
			t320 = space();
			pre18 = element("pre");
			t321 = space();
			section11 = element("section");
			h36 = element("h3");
			a38 = element("a");
			t322 = text("A curious case of Preact");
			t323 = space();
			blockquote0 = element("blockquote");
			p66 = element("p");
			t324 = text("The rabbit hole of how to mangle property names starts with investigating the ");
			a39 = element("a");
			t325 = text("Preact");
			t326 = space();
			a40 = element("a");
			t327 = text("Suspense bug");
			t328 = text(", but that would be a story for another time.");
			t329 = space();
			p67 = element("p");
			t330 = text("Preact is a fast 3kB React alternative, with the same modern API.");
			t331 = space();
			p68 = element("p");
			t332 = text("Property mangling contributed an important part to keep the library slim.");
			t333 = space();
			table = element("table");
			thead = element("thead");
			tr0 = element("tr");
			th0 = element("th");
			t334 = text("Without mangling");
			t335 = space();
			th1 = element("th");
			t336 = text("With mangling");
			t337 = space();
			tbody = element("tbody");
			tr1 = element("tr");
			td0 = element("td");
			t338 = text("10.7 KB minified");
			t339 = space();
			td1 = element("td");
			t340 = text("9.7 Kb minified (reduced ~10%)");
			t341 = space();
			tr2 = element("tr");
			td2 = element("td");
			t342 = text("4.2 KB minified + gzipped");
			t343 = space();
			td3 = element("td");
			t344 = text("3.9 KB minified + gzipped (reduced ~5%)");
			t345 = space();
			p69 = element("p");
			t346 = text("There's several different builds for ");
			code40 = element("code");
			t347 = text("preact");
			t348 = text(":");
			t349 = space();
			ul7 = element("ul");
			li17 = element("li");
			code41 = element("code");
			t350 = text("preact/core");
			t351 = space();
			li18 = element("li");
			code42 = element("code");
			t352 = text("preact/compat");
			t353 = text(" - a compat layer on top of preact to provide all React API");
			t354 = space();
			li19 = element("li");
			code43 = element("code");
			t355 = text("preact/debug");
			t356 = text(" - a layer on top of ");
			code44 = element("code");
			t357 = text("preact/core");
			t358 = text(" that provides a better debugging experience");
			t359 = space();
			li20 = element("li");
			code45 = element("code");
			t360 = text("preact/devtools");
			t361 = text(" - the bridge between ");
			code46 = element("code");
			t362 = text("preact/core");
			t363 = text(" and the devtools extension.");
			t364 = space();
			p70 = element("p");
			t365 = text("To have a consistent mangle properties across different builds, ");
			code47 = element("code");
			t366 = text("babel-plugin-transform-rename-properties");
			t367 = text(" is used, and the name mapping is stored at ");
			a41 = element("a");
			code48 = element("code");
			t368 = text("mangle.json");
			t369 = text(".");
			t370 = space();
			blockquote1 = element("blockquote");
			p71 = element("p");
			t371 = text("Check out this Pull Request that adds ");
			code49 = element("code");
			t372 = text("babel-plugin-transform-rename-properties");
			t373 = text(" into Preact: ");
			a42 = element("a");
			t374 = text("https://github.com/preactjs/preact/pull/2548");
			t375 = space();
			p72 = element("p");
			t376 = text("For mangling private properties, the bundling process of Preact is abstracted in ");
			a43 = element("a");
			t377 = text("microbundle");
			t378 = text(", which reads the mangle options from ");
			code50 = element("code");
			t379 = text("mangle.json");
			t380 = text(" or the ");
			code51 = element("code");
			t381 = text("mangle");
			t382 = text(" property from ");
			code52 = element("code");
			t383 = text("package.json");
			t384 = text(". See ");
			a44 = element("a");
			t385 = text("Mangling Properties for microbundle");
			t386 = text(".");
			t387 = space();
			section12 = element("section");
			h23 = element("h2");
			a45 = element("a");
			t388 = text("Closing Note");
			t389 = space();
			p73 = element("p");
			t390 = text("We've covered what is property mangling and all the caveats come along with it.");
			t391 = space();
			p74 = element("p");
			t392 = text("With the full grasp of the caveats, we looked at various tactics that we can use to utilise property mangling to reduce our minified code output.");
			t393 = space();
			section13 = element("section");
			h24 = element("h2");
			a46 = element("a");
			t394 = text("Further Reading");
			t395 = space();
			ul8 = element("ul");
			li21 = element("li");
			a47 = element("a");
			t396 = text("Terser Mangle options");
			t397 = space();
			li22 = element("li");
			a48 = element("a");
			t398 = text("microbundle Mangling Properties");
			t399 = space();
			li23 = element("li");
			a49 = element("a");
			t400 = text("babel-plugin-transform-rename-properties");
			this.h();
		},
		l(nodes) {
			section0 = claim_element(nodes, "SECTION", {});
			var section0_nodes = children(section0);

			ul4 = claim_element(section0_nodes, "UL", {
				class: true,
				id: true,
				role: true,
				"aria-label": true
			});

			var ul4_nodes = children(ul4);
			li0 = claim_element(ul4_nodes, "LI", {});
			var li0_nodes = children(li0);
			a0 = claim_element(li0_nodes, "A", { href: true });
			var a0_nodes = children(a0);
			t0 = claim_text(a0_nodes, "What is Mangling Property");
			a0_nodes.forEach(detach);
			li0_nodes.forEach(detach);
			ul1 = claim_element(ul4_nodes, "UL", {});
			var ul1_nodes = children(ul1);
			li1 = claim_element(ul1_nodes, "LI", {});
			var li1_nodes = children(li1);
			a1 = claim_element(li1_nodes, "A", { href: true });
			var a1_nodes = children(a1);
			t1 = claim_text(a1_nodes, "Why is property mangling considered unsafe?");
			a1_nodes.forEach(detach);
			li1_nodes.forEach(detach);
			ul0 = claim_element(ul1_nodes, "UL", {});
			var ul0_nodes = children(ul0);
			li2 = claim_element(ul0_nodes, "LI", {});
			var li2_nodes = children(li2);
			a2 = claim_element(li2_nodes, "A", { href: true });
			var a2_nodes = children(a2);
			t2 = claim_text(a2_nodes, "Set or get property from the global scope");
			a2_nodes.forEach(detach);
			li2_nodes.forEach(detach);
			ul0_nodes.forEach(detach);
			li3 = claim_element(ul1_nodes, "LI", {});
			var li3_nodes = children(li3);
			a3 = claim_element(li3_nodes, "A", { href: true });
			var a3_nodes = children(a3);
			t3 = claim_text(a3_nodes, "Mangling for rollup / webpack bundled code");
			a3_nodes.forEach(detach);
			li3_nodes.forEach(detach);
			ul1_nodes.forEach(detach);
			li4 = claim_element(ul4_nodes, "LI", {});
			var li4_nodes = children(li4);
			a4 = claim_element(li4_nodes, "A", { href: true });
			var a4_nodes = children(a4);
			t4 = claim_text(a4_nodes, "How to mangle property responsibly and safely");
			a4_nodes.forEach(detach);
			li4_nodes.forEach(detach);
			ul2 = claim_element(ul4_nodes, "UL", {});
			var ul2_nodes = children(ul2);
			li5 = claim_element(ul2_nodes, "LI", {});
			var li5_nodes = children(li5);
			a5 = claim_element(li5_nodes, "A", { href: true });
			var a5_nodes = children(a5);
			t5 = claim_text(a5_nodes, "Private property");
			a5_nodes.forEach(detach);
			li5_nodes.forEach(detach);
			li6 = claim_element(ul2_nodes, "LI", {});
			var li6_nodes = children(li6);
			a6 = claim_element(li6_nodes, "A", { href: true });
			var a6_nodes = children(a6);
			t6 = claim_text(a6_nodes, "Consistent property mangling across subsequent minifications");
			a6_nodes.forEach(detach);
			li6_nodes.forEach(detach);
			li7 = claim_element(ul2_nodes, "LI", {});
			var li7_nodes = children(li7);
			a7 = claim_element(li7_nodes, "A", { href: true });
			var a7_nodes = children(a7);
			t7 = claim_text(a7_nodes, "Consistent property mangling across different builds");
			a7_nodes.forEach(detach);
			li7_nodes.forEach(detach);
			ul2_nodes.forEach(detach);
			li8 = claim_element(ul4_nodes, "LI", {});
			var li8_nodes = children(li8);
			a8 = claim_element(li8_nodes, "A", { href: true });
			var a8_nodes = children(a8);
			t8 = claim_text(a8_nodes, "Misc");
			a8_nodes.forEach(detach);
			li8_nodes.forEach(detach);
			ul3 = claim_element(ul4_nodes, "UL", {});
			var ul3_nodes = children(ul3);
			li9 = claim_element(ul3_nodes, "LI", {});
			var li9_nodes = children(li9);
			a9 = claim_element(li9_nodes, "A", { href: true });
			var a9_nodes = children(a9);
			t9 = claim_text(a9_nodes, "Webpack and Rollup");
			a9_nodes.forEach(detach);
			li9_nodes.forEach(detach);
			li10 = claim_element(ul3_nodes, "LI", {});
			var li10_nodes = children(li10);
			a10 = claim_element(li10_nodes, "A", { href: true });
			var a10_nodes = children(a10);
			t10 = claim_text(a10_nodes, "A curious case of Preact");
			a10_nodes.forEach(detach);
			li10_nodes.forEach(detach);
			ul3_nodes.forEach(detach);
			li11 = claim_element(ul4_nodes, "LI", {});
			var li11_nodes = children(li11);
			a11 = claim_element(li11_nodes, "A", { href: true });
			var a11_nodes = children(a11);
			t11 = claim_text(a11_nodes, "Closing Note");
			a11_nodes.forEach(detach);
			li11_nodes.forEach(detach);
			li12 = claim_element(ul4_nodes, "LI", {});
			var li12_nodes = children(li12);
			a12 = claim_element(li12_nodes, "A", { href: true });
			var a12_nodes = children(a12);
			t12 = claim_text(a12_nodes, "Further Reading");
			a12_nodes.forEach(detach);
			li12_nodes.forEach(detach);
			ul4_nodes.forEach(detach);
			section0_nodes.forEach(detach);
			t13 = claim_space(nodes);
			section1 = claim_element(nodes, "SECTION", {});
			var section1_nodes = children(section1);
			h20 = claim_element(section1_nodes, "H2", {});
			var h20_nodes = children(h20);
			a13 = claim_element(h20_nodes, "A", { href: true, id: true });
			var a13_nodes = children(a13);
			t14 = claim_text(a13_nodes, "What is Mangling Property");
			a13_nodes.forEach(detach);
			h20_nodes.forEach(detach);
			t15 = claim_space(section1_nodes);
			p0 = claim_element(section1_nodes, "P", {});
			var p0_nodes = children(p0);
			t16 = claim_text(p0_nodes, "Assume you have the following JavaScript code:");
			p0_nodes.forEach(detach);
			t17 = claim_space(section1_nodes);
			pre0 = claim_element(section1_nodes, "PRE", { class: true });
			var pre0_nodes = children(pre0);
			pre0_nodes.forEach(detach);
			t18 = claim_space(section1_nodes);
			p1 = claim_element(section1_nodes, "P", {});
			var p1_nodes = children(p1);
			strong0 = claim_element(p1_nodes, "STRONG", {});
			var strong0_nodes = children(strong0);
			t19 = claim_text(strong0_nodes, "Original: 268 Bytes");
			strong0_nodes.forEach(detach);
			p1_nodes.forEach(detach);
			t20 = claim_space(section1_nodes);
			p2 = claim_element(section1_nodes, "P", {});
			var p2_nodes = children(p2);
			t21 = claim_text(p2_nodes, "If you minify this with the default options with ");
			a14 = claim_element(p2_nodes, "A", { href: true, rel: true });
			var a14_nodes = children(a14);
			t22 = claim_text(a14_nodes, "Terser");
			a14_nodes.forEach(detach);
			t23 = claim_text(p2_nodes, ", you probably get something like:");
			p2_nodes.forEach(detach);
			t24 = claim_space(section1_nodes);
			pre1 = claim_element(section1_nodes, "PRE", { class: true });
			var pre1_nodes = children(pre1);
			pre1_nodes.forEach(detach);
			t25 = claim_space(section1_nodes);
			p3 = claim_element(section1_nodes, "P", {});
			var p3_nodes = children(p3);
			strong1 = claim_element(p3_nodes, "STRONG", {});
			var strong1_nodes = children(strong1);
			t26 = claim_text(strong1_nodes, "207 Bytes (77.2%)");
			strong1_nodes.forEach(detach);
			p3_nodes.forEach(detach);
			t27 = claim_space(section1_nodes);
			p4 = claim_element(section1_nodes, "P", {});
			var p4_nodes = children(p4);
			em0 = claim_element(p4_nodes, "EM", {});
			var em0_nodes = children(em0);
			t28 = claim_text(em0_nodes, "(Usually Terser would compress whitespace too, but for ease of reading, allow me to keep the whitespace)");
			em0_nodes.forEach(detach);
			p4_nodes.forEach(detach);
			t29 = claim_space(section1_nodes);
			p5 = claim_element(section1_nodes, "P", {});
			var p5_nodes = children(p5);
			t30 = claim_text(p5_nodes, "Your code still behaves the same, even though the variable name has changed.");
			p5_nodes.forEach(detach);
			t31 = claim_space(section1_nodes);
			p6 = claim_element(section1_nodes, "P", {});
			var p6_nodes = children(p6);
			t32 = claim_text(p6_nodes, "This behavior of renaming variable name to compress JavaScript code is called ");
			strong2 = claim_element(p6_nodes, "STRONG", {});
			var strong2_nodes = children(strong2);
			t33 = claim_text(strong2_nodes, "Mangle");
			strong2_nodes.forEach(detach);
			t34 = claim_text(p6_nodes, ".");
			p6_nodes.forEach(detach);
			t35 = claim_space(section1_nodes);
			p7 = claim_element(section1_nodes, "P", {});
			var p7_nodes = children(p7);
			t36 = claim_text(p7_nodes, "Terser has several ");
			a15 = claim_element(p7_nodes, "A", { href: true, rel: true });
			var a15_nodes = children(a15);
			t37 = claim_text(a15_nodes, "Mangle options");
			a15_nodes.forEach(detach);
			t38 = claim_text(p7_nodes, ", that allows you to control whether or not to mangle ");
			strong3 = claim_element(p7_nodes, "STRONG", {});
			var strong3_nodes = children(strong3);
			t39 = claim_text(strong3_nodes, "class name");
			strong3_nodes.forEach(detach);
			t40 = claim_text(p7_nodes, ", ");
			strong4 = claim_element(p7_nodes, "STRONG", {});
			var strong4_nodes = children(strong4);
			t41 = claim_text(strong4_nodes, "function name");
			strong4_nodes.forEach(detach);
			t42 = claim_text(p7_nodes, ", ");
			strong5 = claim_element(p7_nodes, "STRONG", {});
			var strong5_nodes = children(strong5);
			t43 = claim_text(strong5_nodes, "property name");
			strong5_nodes.forEach(detach);
			t44 = claim_text(p7_nodes, ", or specify any reserved keywords to not mangle, or should it mangle global variable.");
			p7_nodes.forEach(detach);
			t45 = claim_space(section1_nodes);
			p8 = claim_element(section1_nodes, "P", {});
			var p8_nodes = children(p8);
			t46 = claim_text(p8_nodes, "If the above code is written within a ES Module, then probably we wont refer the class ");
			code0 = claim_element(p8_nodes, "CODE", {});
			var code0_nodes = children(code0);
			t47 = claim_text(code0_nodes, "Human");
			code0_nodes.forEach(detach);
			t48 = claim_text(p8_nodes, " globally, rather refer it through ");
			code1 = claim_element(p8_nodes, "CODE", {});
			var code1_nodes = children(code1);
			t49 = claim_text(code1_nodes, "import");
			code1_nodes.forEach(detach);
			t50 = claim_text(p8_nodes, ", then the name of the class probably does not matter:");
			p8_nodes.forEach(detach);
			t51 = claim_space(section1_nodes);
			pre2 = claim_element(section1_nodes, "PRE", { class: true });
			var pre2_nodes = children(pre2);
			pre2_nodes.forEach(detach);
			t52 = claim_space(section1_nodes);
			p9 = claim_element(section1_nodes, "P", {});
			var p9_nodes = children(p9);
			strong6 = claim_element(p9_nodes, "STRONG", {});
			var strong6_nodes = children(strong6);
			t53 = claim_text(strong6_nodes, "186 Bytes (69.4%)");
			strong6_nodes.forEach(detach);
			p9_nodes.forEach(detach);
			t54 = claim_space(section1_nodes);
			p10 = claim_element(section1_nodes, "P", {});
			var p10_nodes = children(p10);
			t55 = claim_text(p10_nodes, "But can we do better?");
			p10_nodes.forEach(detach);
			t56 = claim_space(section1_nodes);
			p11 = claim_element(section1_nodes, "P", {});
			var p11_nodes = children(p11);
			t57 = claim_text(p11_nodes, "Well, if you look at the code, the property named ");
			code2 = claim_element(p11_nodes, "CODE", {});
			var code2_nodes = children(code2);
			t58 = claim_text(code2_nodes, "chewAmount");
			code2_nodes.forEach(detach);
			t59 = claim_text(p11_nodes, " takes up 20 characters, which is almost 10% of the code.");
			p11_nodes.forEach(detach);
			t60 = claim_space(section1_nodes);
			p12 = claim_element(section1_nodes, "P", {});
			var p12_nodes = children(p12);
			t61 = claim_text(p12_nodes, "If we rename all the property name to 1 character variable, then we would end up with a much smaller code:");
			p12_nodes.forEach(detach);
			t62 = claim_space(section1_nodes);
			pre3 = claim_element(section1_nodes, "PRE", { class: true });
			var pre3_nodes = children(pre3);
			pre3_nodes.forEach(detach);
			t63 = claim_space(section1_nodes);
			p13 = claim_element(section1_nodes, "P", {});
			var p13_nodes = children(p13);
			strong7 = claim_element(p13_nodes, "STRONG", {});
			var strong7_nodes = children(strong7);
			t64 = claim_text(strong7_nodes, "107 Bytes (39.9%)");
			strong7_nodes.forEach(detach);
			p13_nodes.forEach(detach);
			t65 = claim_space(section1_nodes);
			p14 = claim_element(section1_nodes, "P", {});
			var p14_nodes = children(p14);
			t66 = claim_text(p14_nodes, "If it ends up with a much smaller bundle, should we rename our property name and method name to a shorter name? And why didn't Terser do this by default?");
			p14_nodes.forEach(detach);
			t67 = claim_space(section1_nodes);
			p15 = claim_element(section1_nodes, "P", {});
			var p15_nodes = children(p15);
			strong8 = claim_element(p15_nodes, "STRONG", {});
			var strong8_nodes = children(strong8);
			t68 = claim_text(strong8_nodes, "Should we rename our property name and method name to something short?");
			strong8_nodes.forEach(detach);
			p15_nodes.forEach(detach);
			t69 = claim_space(section1_nodes);
			p16 = claim_element(section1_nodes, "P", {});
			var p16_nodes = children(p16);
			t70 = claim_text(p16_nodes, "No! That would hurt the readability of the code. 😥");
			p16_nodes.forEach(detach);
			t71 = claim_space(section1_nodes);
			p17 = claim_element(section1_nodes, "P", {});
			var p17_nodes = children(p17);
			t72 = claim_text(p17_nodes, "Also, what if someone else imports the class ");
			code3 = claim_element(p17_nodes, "CODE", {});
			var code3_nodes = children(code3);
			t73 = claim_text(code3_nodes, "Human");
			code3_nodes.forEach(detach);
			t74 = claim_text(p17_nodes, " and wants to use the property ");
			code4 = claim_element(p17_nodes, "CODE", {});
			var code4_nodes = children(code4);
			t75 = claim_text(code4_nodes, "chewAmount");
			code4_nodes.forEach(detach);
			t76 = claim_text(p17_nodes, "?");
			p17_nodes.forEach(detach);
			t77 = claim_space(section1_nodes);
			p18 = claim_element(section1_nodes, "P", {});
			var p18_nodes = children(p18);
			t78 = claim_text(p18_nodes, "He would have to rename it to ");
			code5 = claim_element(p18_nodes, "CODE", {});
			var code5_nodes = children(code5);
			t79 = claim_text(code5_nodes, "human.c");
			code5_nodes.forEach(detach);
			t80 = claim_text(p18_nodes, " instead of ");
			code6 = claim_element(p18_nodes, "CODE", {});
			var code6_nodes = children(code6);
			t81 = claim_text(code6_nodes, "human.chewAmount");
			code6_nodes.forEach(detach);
			t82 = claim_text(p18_nodes, " and probably scratching his head everytime he reads his code, wondering what does ");
			code7 = claim_element(p18_nodes, "CODE", {});
			var code7_nodes = children(code7);
			t83 = claim_text(code7_nodes, "human.c");
			code7_nodes.forEach(detach);
			t84 = claim_text(p18_nodes, " mean?");
			p18_nodes.forEach(detach);
			t85 = claim_space(section1_nodes);
			p19 = claim_element(section1_nodes, "P", {});
			var p19_nodes = children(p19);
			strong9 = claim_element(p19_nodes, "STRONG", {});
			var strong9_nodes = children(strong9);
			t86 = claim_text(strong9_nodes, "Why Terser didn't mangle property name by default?");
			strong9_nodes.forEach(detach);
			p19_nodes.forEach(detach);
			t87 = claim_space(section1_nodes);
			p20 = claim_element(section1_nodes, "P", {});
			var p20_nodes = children(p20);
			t88 = claim_text(p20_nodes, "Because property mangling requires certain assumption on your code, therefore it is marked as ");
			strong10 = claim_element(p20_nodes, "STRONG", {});
			var strong10_nodes = children(strong10);
			t89 = claim_text(strong10_nodes, "very unsafe");
			strong10_nodes.forEach(detach);
			t90 = claim_text(p20_nodes, " in the ");
			a16 = claim_element(p20_nodes, "A", { href: true, rel: true });
			var a16_nodes = children(a16);
			t91 = claim_text(a16_nodes, "Terser documentation");
			a16_nodes.forEach(detach);
			t92 = claim_text(p20_nodes, " to turn it on entirely.");
			p20_nodes.forEach(detach);
			section1_nodes.forEach(detach);
			t93 = claim_space(nodes);
			section2 = claim_element(nodes, "SECTION", {});
			var section2_nodes = children(section2);
			h30 = claim_element(section2_nodes, "H3", {});
			var h30_nodes = children(h30);
			a17 = claim_element(h30_nodes, "A", { href: true, id: true });
			var a17_nodes = children(a17);
			t94 = claim_text(a17_nodes, "Why is property mangling considered unsafe?");
			a17_nodes.forEach(detach);
			h30_nodes.forEach(detach);
			t95 = claim_space(section2_nodes);
			p21 = claim_element(section2_nodes, "P", {});
			var p21_nodes = children(p21);
			t96 = claim_text(p21_nodes, "If you are a library author, or you wrote a module that will be used by others, and if you mangle the property of the library / module ");
			strong11 = claim_element(p21_nodes, "STRONG", {});
			var strong11_nodes = children(strong11);
			t97 = claim_text(strong11_nodes, "alone");
			strong11_nodes.forEach(detach);
			t98 = claim_text(p21_nodes, ", all your method name, object property name will be mangled, and therefore all your APIs will be broken!");
			p21_nodes.forEach(detach);
			t99 = claim_space(section2_nodes);
			pre4 = claim_element(section2_nodes, "PRE", { class: true });
			var pre4_nodes = children(pre4);
			pre4_nodes.forEach(detach);
			t100 = claim_space(section2_nodes);
			pre5 = claim_element(section2_nodes, "PRE", { class: true });
			var pre5_nodes = children(pre5);
			pre5_nodes.forEach(detach);
			t101 = claim_space(section2_nodes);
			p22 = claim_element(section2_nodes, "P", {});
			var p22_nodes = children(p22);
			t102 = claim_text(p22_nodes, "Your user that calls ");
			code8 = claim_element(p22_nodes, "CODE", {});
			var code8_nodes = children(code8);
			t103 = claim_text(code8_nodes, "doSomething({ paramA: 1, paramB: 2 })");
			code8_nodes.forEach(detach);
			t104 = claim_text(p22_nodes, " or ");
			code9 = claim_element(p22_nodes, "CODE", {});
			var code9_nodes = children(code9);
			t105 = claim_text(code9_nodes, "car.drive()");
			code9_nodes.forEach(detach);
			t106 = claim_text(p22_nodes, " will not work with the minified code!");
			p22_nodes.forEach(detach);
			t107 = claim_space(section2_nodes);
			p23 = claim_element(section2_nodes, "P", {});
			var p23_nodes = children(p23);
			t108 = claim_text(p23_nodes, "The same ways goes if you are importing some other library or module, and you mangle your code ");
			strong12 = claim_element(p23_nodes, "STRONG", {});
			var strong12_nodes = children(strong12);
			t109 = claim_text(strong12_nodes, "alone");
			strong12_nodes.forEach(detach);
			t110 = claim_text(p23_nodes, ", your code will be broken too!");
			p23_nodes.forEach(detach);
			t111 = claim_space(section2_nodes);
			pre6 = claim_element(section2_nodes, "PRE", { class: true });
			var pre6_nodes = children(pre6);
			pre6_nodes.forEach(detach);
			t112 = claim_space(section2_nodes);
			pre7 = claim_element(section2_nodes, "PRE", { class: true });
			var pre7_nodes = children(pre7);
			pre7_nodes.forEach(detach);
			t113 = claim_space(section2_nodes);
			p24 = claim_element(section2_nodes, "P", {});
			var p24_nodes = children(p24);
			t114 = claim_text(p24_nodes, "I ran both the code above through the same Terser configuration, which means it also serves as a good example that the property name Terser mangles into is not consistent. It is computed and assigned at ");
			em1 = claim_element(p24_nodes, "EM", {});
			var em1_nodes = children(em1);
			t115 = claim_text(em1_nodes, "\"random\"");
			em1_nodes.forEach(detach);
			t116 = claim_text(p24_nodes, ". You should not expect that ");
			code10 = claim_element(p24_nodes, "CODE", {});
			var code10_nodes = children(code10);
			t117 = claim_text(code10_nodes, "paramA");
			code10_nodes.forEach(detach);
			t118 = claim_text(p24_nodes, " always get mangled into ");
			code11 = claim_element(p24_nodes, "CODE", {});
			var code11_nodes = children(code11);
			t119 = claim_text(code11_nodes, "m");
			code11_nodes.forEach(detach);
			t120 = claim_text(p24_nodes, " everytime!");
			p24_nodes.forEach(detach);
			t121 = claim_space(section2_nodes);
			p25 = claim_element(section2_nodes, "P", {});
			var p25_nodes = children(p25);
			t122 = claim_text(p25_nodes, "In summary, property mangling will break your code if you mangle your code alone. It will break at the boundary of your code, where you exports your functions or class that relies on ");
			strong13 = claim_element(p25_nodes, "STRONG", {});
			var strong13_nodes = children(strong13);
			t123 = claim_text(strong13_nodes, "public property or method");
			strong13_nodes.forEach(detach);
			t124 = claim_text(p25_nodes, "; or where you import functions or class which you ");
			strong14 = claim_element(p25_nodes, "STRONG", {});
			var strong14_nodes = children(strong14);
			t125 = claim_text(strong14_nodes, "pass in an object or calls a public method");
			strong14_nodes.forEach(detach);
			t126 = claim_text(p25_nodes, ".");
			p25_nodes.forEach(detach);
			t127 = claim_space(section2_nodes);
			p26 = claim_element(section2_nodes, "P", {});
			var p26_nodes = children(p26);
			t128 = claim_text(p26_nodes, "If you ");
			strong15 = claim_element(p26_nodes, "STRONG", {});
			var strong15_nodes = children(strong15);
			t129 = claim_text(strong15_nodes, "do neither of those");
			strong15_nodes.forEach(detach);
			t130 = claim_text(p26_nodes, ", you are actually safe to mangle all properties by default.");
			p26_nodes.forEach(detach);
			t131 = claim_space(section2_nodes);
			p27 = claim_element(section2_nodes, "P", {});
			var p27_nodes = children(p27);
			t132 = claim_text(p27_nodes, "If you have a standalone script that:");
			p27_nodes.forEach(detach);
			t133 = claim_space(section2_nodes);
			ul5 = claim_element(section2_nodes, "UL", {});
			var ul5_nodes = children(ul5);
			li13 = claim_element(ul5_nodes, "LI", {});
			var li13_nodes = children(li13);
			t134 = claim_text(li13_nodes, "does not import nor export anything");
			li13_nodes.forEach(detach);
			t135 = claim_space(ul5_nodes);
			li14 = claim_element(ul5_nodes, "LI", {});
			var li14_nodes = children(li14);
			t136 = claim_text(li14_nodes, "does not set or read any property from the global scope (*)");
			li14_nodes.forEach(detach);
			ul5_nodes.forEach(detach);
			t137 = claim_space(section2_nodes);
			p28 = claim_element(section2_nodes, "P", {});
			var p28_nodes = children(p28);
			t138 = claim_text(p28_nodes, "Then you are safe to mangle all your properties. Property or method name across the file will be mangled consistently:");
			p28_nodes.forEach(detach);
			t139 = claim_space(section2_nodes);
			pre8 = claim_element(section2_nodes, "PRE", { class: true });
			var pre8_nodes = children(pre8);
			pre8_nodes.forEach(detach);
			t140 = claim_space(section2_nodes);
			pre9 = claim_element(section2_nodes, "PRE", { class: true });
			var pre9_nodes = children(pre9);
			pre9_nodes.forEach(detach);
			t141 = claim_space(section2_nodes);
			p29 = claim_element(section2_nodes, "P", {});
			var p29_nodes = children(p29);
			t142 = claim_text(p29_nodes, "If you use the property or method named ");
			code12 = claim_element(p29_nodes, "CODE", {});
			var code12_nodes = children(code12);
			t143 = claim_text(code12_nodes, "\"drive\"");
			code12_nodes.forEach(detach);
			t144 = claim_text(p29_nodes, ", it will be mangled to the same name throughout the file.");
			p29_nodes.forEach(detach);
			t145 = claim_space(section2_nodes);
			p30 = claim_element(section2_nodes, "P", {});
			var p30_nodes = children(p30);
			t146 = claim_text(p30_nodes, "In the example above, the method ");
			code13 = claim_element(p30_nodes, "CODE", {});
			var code13_nodes = children(code13);
			t147 = claim_text(code13_nodes, "drive");
			code13_nodes.forEach(detach);
			t148 = claim_text(p30_nodes, " in both classes and the property ");
			code14 = claim_element(p30_nodes, "CODE", {});
			var code14_nodes = children(code14);
			t149 = claim_text(code14_nodes, "drive");
			code14_nodes.forEach(detach);
			t150 = claim_text(p30_nodes, " in ");
			code15 = claim_element(p30_nodes, "CODE", {});
			var code15_nodes = children(code15);
			t151 = claim_text(code15_nodes, "foo({ drive: 'bar' })");
			code15_nodes.forEach(detach);
			t152 = claim_text(p30_nodes, " means different things, but they are mangled into the same name, ");
			code16 = claim_element(p30_nodes, "CODE", {});
			var code16_nodes = children(code16);
			t153 = claim_text(code16_nodes, "s");
			code16_nodes.forEach(detach);
			t154 = claim_text(p30_nodes, ".");
			p30_nodes.forEach(detach);
			section2_nodes.forEach(detach);
			t155 = claim_space(nodes);
			section3 = claim_element(nodes, "SECTION", {});
			var section3_nodes = children(section3);
			h4 = claim_element(section3_nodes, "H4", {});
			var h4_nodes = children(h4);
			a18 = claim_element(h4_nodes, "A", { href: true, id: true });
			var a18_nodes = children(a18);
			t156 = claim_text(a18_nodes, "Set or get property from the global scope");
			a18_nodes.forEach(detach);
			h4_nodes.forEach(detach);
			t157 = claim_space(section3_nodes);
			p31 = claim_element(section3_nodes, "P", {});
			var p31_nodes = children(p31);
			strong16 = claim_element(p31_nodes, "STRONG", {});
			var strong16_nodes = children(strong16);
			t158 = claim_text(strong16_nodes, "Rule of thumb:");
			strong16_nodes.forEach(detach);
			t159 = claim_text(p31_nodes, " If you set or get property from global scope, property mangling blindly will break your code.");
			p31_nodes.forEach(detach);
			t160 = claim_space(section3_nodes);
			p32 = claim_element(section3_nodes, "P", {});
			var p32_nodes = children(p32);
			t161 = claim_text(p32_nodes, "Of course, there's caveat of when this might be safe, protected by ");
			code17 = claim_element(p32_nodes, "CODE", {});
			var code17_nodes = children(code17);
			t162 = claim_text(code17_nodes, "default: false");
			code17_nodes.forEach(detach);
			t163 = claim_text(p32_nodes, " options that you can turn on at your own risk. 🙈");
			p32_nodes.forEach(detach);
			t164 = claim_space(section3_nodes);
			p33 = claim_element(section3_nodes, "P", {});
			var p33_nodes = children(p33);
			strong17 = claim_element(p33_nodes, "STRONG", {});
			var strong17_nodes = children(strong17);
			t165 = claim_text(strong17_nodes, "Accessing DOM properties or method from built-in Objects");
			strong17_nodes.forEach(detach);
			p33_nodes.forEach(detach);
			t166 = claim_space(section3_nodes);
			p34 = claim_element(section3_nodes, "P", {});
			var p34_nodes = children(p34);
			t167 = claim_text(p34_nodes, "Terser keeps a list of property names that exempt from mangling, such as:");
			p34_nodes.forEach(detach);
			t168 = claim_space(section3_nodes);
			ul6 = claim_element(section3_nodes, "UL", {});
			var ul6_nodes = children(ul6);
			li15 = claim_element(ul6_nodes, "LI", {});
			var li15_nodes = children(li15);
			t169 = claim_text(li15_nodes, "DOM properties: ");
			code18 = claim_element(li15_nodes, "CODE", {});
			var code18_nodes = children(code18);
			t170 = claim_text(code18_nodes, "window.location");
			code18_nodes.forEach(detach);
			t171 = claim_text(li15_nodes, ", ");
			code19 = claim_element(li15_nodes, "CODE", {});
			var code19_nodes = children(code19);
			t172 = claim_text(code19_nodes, "document.createElement");
			code19_nodes.forEach(detach);
			li15_nodes.forEach(detach);
			t173 = claim_space(ul6_nodes);
			li16 = claim_element(ul6_nodes, "LI", {});
			var li16_nodes = children(li16);
			t174 = claim_text(li16_nodes, "Methods of built-in objects: ");
			code20 = claim_element(li16_nodes, "CODE", {});
			var code20_nodes = children(code20);
			t175 = claim_text(code20_nodes, "Array.from");
			code20_nodes.forEach(detach);
			t176 = claim_text(li16_nodes, ", ");
			code21 = claim_element(li16_nodes, "CODE", {});
			var code21_nodes = children(code21);
			t177 = claim_text(code21_nodes, "Object.defineProperty");
			code21_nodes.forEach(detach);
			li16_nodes.forEach(detach);
			ul6_nodes.forEach(detach);
			t178 = claim_space(section3_nodes);
			p35 = claim_element(section3_nodes, "P", {});
			var p35_nodes = children(p35);
			t179 = claim_text(p35_nodes, "The list can be found in ");
			a19 = claim_element(p35_nodes, "A", { href: true, rel: true });
			var a19_nodes = children(a19);
			t180 = claim_text(a19_nodes, "domprops.js");
			a19_nodes.forEach(detach);
			t181 = claim_text(p35_nodes, " and ");
			a20 = claim_element(p35_nodes, "A", { href: true, rel: true });
			var a20_nodes = children(a20);
			code22 = claim_element(a20_nodes, "CODE", {});
			var code22_nodes = children(code22);
			t182 = claim_text(code22_nodes, "find_builtins");
			code22_nodes.forEach(detach);
			a20_nodes.forEach(detach);
			t183 = claim_text(p35_nodes, ".");
			p35_nodes.forEach(detach);
			t184 = claim_space(section3_nodes);
			p36 = claim_element(section3_nodes, "P", {});
			var p36_nodes = children(p36);
			t185 = claim_text(p36_nodes, "This behavior is protected by the ");
			code23 = claim_element(p36_nodes, "CODE", {});
			var code23_nodes = children(code23);
			t186 = claim_text(code23_nodes, "builtins");
			code23_nodes.forEach(detach);
			t187 = claim_text(p36_nodes, " option in the ");
			a21 = claim_element(p36_nodes, "A", { href: true, rel: true });
			var a21_nodes = children(a21);
			t188 = claim_text(a21_nodes, "Mangle properties option");
			a21_nodes.forEach(detach);
			t189 = claim_text(p36_nodes, ", set it to ");
			code24 = claim_element(p36_nodes, "CODE", {});
			var code24_nodes = children(code24);
			t190 = claim_text(code24_nodes, "true");
			code24_nodes.forEach(detach);
			t191 = claim_text(p36_nodes, " to mangle builtin properties as well. ");
			strong18 = claim_element(p36_nodes, "STRONG", {});
			var strong18_nodes = children(strong18);
			t192 = claim_text(strong18_nodes, "Override at your own risk");
			strong18_nodes.forEach(detach);
			p36_nodes.forEach(detach);
			t193 = claim_space(section3_nodes);
			p37 = claim_element(section3_nodes, "P", {});
			var p37_nodes = children(p37);
			strong19 = claim_element(p37_nodes, "STRONG", {});
			var strong19_nodes = children(strong19);
			t194 = claim_text(strong19_nodes, "Accessing property or method of a undeclared variable");
			strong19_nodes.forEach(detach);
			p37_nodes.forEach(detach);
			t195 = claim_space(section3_nodes);
			p38 = claim_element(section3_nodes, "P", {});
			var p38_nodes = children(p38);
			t196 = claim_text(p38_nodes, "Variable that is not declared within the code, can be considered as global variable that is defined outside. Their properties or methods will not be mangled too.");
			p38_nodes.forEach(detach);
			t197 = claim_space(section3_nodes);
			p39 = claim_element(section3_nodes, "P", {});
			var p39_nodes = children(p39);
			t198 = claim_text(p39_nodes, "You can override this behavior via the ");
			code25 = claim_element(p39_nodes, "CODE", {});
			var code25_nodes = children(code25);
			t199 = claim_text(code25_nodes, "undeclared");
			code25_nodes.forEach(detach);
			t200 = claim_text(p39_nodes, " option in the ");
			a22 = claim_element(p39_nodes, "A", { href: true, rel: true });
			var a22_nodes = children(a22);
			t201 = claim_text(a22_nodes, "Mangle properties option");
			a22_nodes.forEach(detach);
			t202 = claim_text(p39_nodes, ", set it to ");
			code26 = claim_element(p39_nodes, "CODE", {});
			var code26_nodes = children(code26);
			t203 = claim_text(code26_nodes, "true");
			code26_nodes.forEach(detach);
			t204 = claim_text(p39_nodes, " to mangle them too.");
			p39_nodes.forEach(detach);
			section3_nodes.forEach(detach);
			t205 = claim_space(nodes);
			section4 = claim_element(nodes, "SECTION", {});
			var section4_nodes = children(section4);
			h31 = claim_element(section4_nodes, "H3", {});
			var h31_nodes = children(h31);
			a23 = claim_element(h31_nodes, "A", { href: true, id: true });
			var a23_nodes = children(a23);
			t206 = claim_text(a23_nodes, "Mangling for rollup / webpack bundled code");
			a23_nodes.forEach(detach);
			h31_nodes.forEach(detach);
			t207 = claim_space(section4_nodes);
			p40 = claim_element(section4_nodes, "P", {});
			var p40_nodes = children(p40);
			t208 = claim_text(p40_nodes, "If you add ");
			a24 = claim_element(p40_nodes, "A", { href: true, rel: true });
			var a24_nodes = children(a24);
			t209 = claim_text(a24_nodes, "terser-webpack-plugin");
			a24_nodes.forEach(detach);
			t210 = claim_text(p40_nodes, " or ");
			a25 = claim_element(p40_nodes, "A", { href: true, rel: true });
			var a25_nodes = children(a25);
			t211 = claim_text(a25_nodes, "rollup-plugin-terser");
			a25_nodes.forEach(detach);
			t212 = claim_text(p40_nodes, " to your bundling step, are you safe to mangle properties?");
			p40_nodes.forEach(detach);
			t213 = claim_space(section4_nodes);
			p41 = claim_element(section4_nodes, "P", {});
			var p41_nodes = children(p41);
			strong20 = claim_element(p41_nodes, "STRONG", {});
			var strong20_nodes = children(strong20);
			t214 = claim_text(strong20_nodes, "Rule of thumb:");
			strong20_nodes.forEach(detach);
			t215 = claim_text(p41_nodes, " If your bundler emits more than 1 file, No.");
			p41_nodes.forEach(detach);
			t216 = claim_space(section4_nodes);
			p42 = claim_element(section4_nodes, "P", {});
			var p42_nodes = children(p42);
			t217 = claim_text(p42_nodes, "This means any bundling set up that involves code-splitting.");
			p42_nodes.forEach(detach);
			t218 = claim_space(section4_nodes);
			p43 = claim_element(section4_nodes, "P", {});
			var p43_nodes = children(p43);
			t219 = claim_text(p43_nodes, "It is not safe because, terser is run after the code is split into separate files. Thus, the property or method names across files will not be mangled consistently.");
			p43_nodes.forEach(detach);
			section4_nodes.forEach(detach);
			t220 = claim_space(nodes);
			section5 = claim_element(nodes, "SECTION", {});
			var section5_nodes = children(section5);
			h21 = claim_element(section5_nodes, "H2", {});
			var h21_nodes = children(h21);
			a26 = claim_element(h21_nodes, "A", { href: true, id: true });
			var a26_nodes = children(a26);
			t221 = claim_text(a26_nodes, "How to mangle property responsibly and safely");
			a26_nodes.forEach(detach);
			h21_nodes.forEach(detach);
			t222 = claim_space(section5_nodes);
			p44 = claim_element(section5_nodes, "P", {});
			var p44_nodes = children(p44);
			t223 = claim_text(p44_nodes, "With so much restrictions in mind, you may wonder how can I utilise property mangling safely and responsibly?");
			p44_nodes.forEach(detach);
			t224 = claim_space(section5_nodes);
			p45 = claim_element(section5_nodes, "P", {});
			var p45_nodes = children(p45);
			t225 = claim_text(p45_nodes, "Property mangling is not a all-or-nothing option in Terser, there's a few options you can play around to do property mangling safely.");
			p45_nodes.forEach(detach);
			section5_nodes.forEach(detach);
			t226 = claim_space(nodes);
			section6 = claim_element(nodes, "SECTION", {});
			var section6_nodes = children(section6);
			h32 = claim_element(section6_nodes, "H3", {});
			var h32_nodes = children(h32);
			a27 = claim_element(h32_nodes, "A", { href: true, id: true });
			var a27_nodes = children(a27);
			t227 = claim_text(a27_nodes, "Private property");
			a27_nodes.forEach(detach);
			h32_nodes.forEach(detach);
			t228 = claim_space(section6_nodes);
			p46 = claim_element(section6_nodes, "P", {});
			var p46_nodes = children(p46);
			t229 = claim_text(p46_nodes, "In the following example, the only publicly documented method in the class ");
			code27 = claim_element(p46_nodes, "CODE", {});
			var code27_nodes = children(code27);
			t230 = claim_text(code27_nodes, "Car");
			code27_nodes.forEach(detach);
			t231 = claim_text(p46_nodes, " is ");
			code28 = claim_element(p46_nodes, "CODE", {});
			var code28_nodes = children(code28);
			t232 = claim_text(code28_nodes, "driveTo()");
			code28_nodes.forEach(detach);
			t233 = claim_text(p46_nodes, ", so it is okay to mangle other private methods.");
			p46_nodes.forEach(detach);
			t234 = claim_space(section6_nodes);
			pre10 = claim_element(section6_nodes, "PRE", { class: true });
			var pre10_nodes = children(pre10);
			pre10_nodes.forEach(detach);
			t235 = claim_space(section6_nodes);
			p47 = claim_element(section6_nodes, "P", {});
			var p47_nodes = children(p47);
			t236 = claim_text(p47_nodes, "We want to mangle ");
			code29 = claim_element(p47_nodes, "CODE", {});
			var code29_nodes = children(code29);
			t237 = claim_text(code29_nodes, "this.currentLocation");
			code29_nodes.forEach(detach);
			t238 = claim_text(p47_nodes, ", ");
			code30 = claim_element(p47_nodes, "CODE", {});
			var code30_nodes = children(code30);
			t239 = claim_text(code30_nodes, "this.destination");
			code30_nodes.forEach(detach);
			t240 = claim_text(p47_nodes, ", ");
			code31 = claim_element(p47_nodes, "CODE", {});
			var code31_nodes = children(code31);
			t241 = claim_text(code31_nodes, "this.calculateRoute");
			code31_nodes.forEach(detach);
			t242 = claim_text(p47_nodes, ", ");
			code32 = claim_element(p47_nodes, "CODE", {});
			var code32_nodes = children(code32);
			t243 = claim_text(code32_nodes, "this.startDriving");
			code32_nodes.forEach(detach);
			t244 = claim_text(p47_nodes, ", ");
			code33 = claim_element(p47_nodes, "CODE", {});
			var code33_nodes = children(code33);
			t245 = claim_text(code33_nodes, "this.planRoute");
			code33_nodes.forEach(detach);
			t246 = claim_text(p47_nodes, ", but give ");
			code34 = claim_element(p47_nodes, "CODE", {});
			var code34_nodes = children(code34);
			t247 = claim_text(code34_nodes, "this.driveTo");
			code34_nodes.forEach(detach);
			t248 = claim_text(p47_nodes, " untouched.");
			p47_nodes.forEach(detach);
			t249 = claim_space(section6_nodes);
			p48 = claim_element(section6_nodes, "P", {});
			var p48_nodes = children(p48);
			t250 = claim_text(p48_nodes, "You can choose to either");
			p48_nodes.forEach(detach);
			t251 = claim_space(section6_nodes);
			p49 = claim_element(section6_nodes, "P", {});
			var p49_nodes = children(p49);
			strong21 = claim_element(p49_nodes, "STRONG", {});
			var strong21_nodes = children(strong21);
			t252 = claim_text(strong21_nodes, "1. mangle all methods and properties, except a reserved list of names:");
			strong21_nodes.forEach(detach);
			p49_nodes.forEach(detach);
			t253 = claim_space(section6_nodes);
			pre11 = claim_element(section6_nodes, "PRE", { class: true });
			var pre11_nodes = children(pre11);
			pre11_nodes.forEach(detach);
			t254 = claim_space(section6_nodes);
			p50 = claim_element(section6_nodes, "P", {});
			var p50_nodes = children(p50);
			strong22 = claim_element(p50_nodes, "STRONG", {});
			var strong22_nodes = children(strong22);
			t255 = claim_text(strong22_nodes, "2. specify a list of names to be mangled with a regex:");
			strong22_nodes.forEach(detach);
			p50_nodes.forEach(detach);
			t256 = claim_space(section6_nodes);
			pre12 = claim_element(section6_nodes, "PRE", { class: true });
			var pre12_nodes = children(pre12);
			pre12_nodes.forEach(detach);
			t257 = claim_space(section6_nodes);
			p51 = claim_element(section6_nodes, "P", {});
			var p51_nodes = children(p51);
			t258 = claim_text(p51_nodes, "Here, a ");
			a28 = claim_element(p51_nodes, "A", { href: true, rel: true });
			var a28_nodes = children(a28);
			t259 = claim_text(a28_nodes, "unofficial JavaScript naming convention");
			a28_nodes.forEach(detach);
			t260 = claim_text(p51_nodes, " for private method / properties come in handy. Often times, when a variable name starts with ");
			code35 = claim_element(p51_nodes, "CODE", {});
			var code35_nodes = children(code35);
			t261 = claim_text(code35_nodes, "_");
			code35_nodes.forEach(detach);
			t262 = claim_text(p51_nodes, ", it is intended to be private.");
			p51_nodes.forEach(detach);
			t263 = claim_space(section6_nodes);
			pre13 = claim_element(section6_nodes, "PRE", { class: true });
			var pre13_nodes = children(pre13);
			pre13_nodes.forEach(detach);
			t264 = claim_space(section6_nodes);
			p52 = claim_element(section6_nodes, "P", {});
			var p52_nodes = children(p52);
			t265 = claim_text(p52_nodes, "This way, it makes our regex much easier:");
			p52_nodes.forEach(detach);
			t266 = claim_space(section6_nodes);
			pre14 = claim_element(section6_nodes, "PRE", { class: true });
			var pre14_nodes = children(pre14);
			pre14_nodes.forEach(detach);
			section6_nodes.forEach(detach);
			t267 = claim_space(nodes);
			section7 = claim_element(nodes, "SECTION", {});
			var section7_nodes = children(section7);
			h33 = claim_element(section7_nodes, "H3", {});
			var h33_nodes = children(h33);
			a29 = claim_element(h33_nodes, "A", { href: true, id: true });
			var a29_nodes = children(a29);
			t268 = claim_text(a29_nodes, "Consistent property mangling across subsequent minifications");
			a29_nodes.forEach(detach);
			h33_nodes.forEach(detach);
			t269 = claim_space(section7_nodes);
			p53 = claim_element(section7_nodes, "P", {});
			var p53_nodes = children(p53);
			t270 = claim_text(p53_nodes, "If you want ");
			code36 = claim_element(p53_nodes, "CODE", {});
			var code36_nodes = children(code36);
			t271 = claim_text(code36_nodes, "_calculateRoute");
			code36_nodes.forEach(detach);
			t272 = claim_text(p53_nodes, " to always mangled to the same name no matter how much you have changed the input file, the ");
			code37 = claim_element(p53_nodes, "CODE", {});
			var code37_nodes = children(code37);
			t273 = claim_text(code37_nodes, "nameCache");
			code37_nodes.forEach(detach);
			t274 = claim_text(p53_nodes, " may come in handy.");
			p53_nodes.forEach(detach);
			t275 = claim_space(section7_nodes);
			p54 = claim_element(section7_nodes, "P", {});
			var p54_nodes = children(p54);
			code38 = claim_element(p54_nodes, "CODE", {});
			var code38_nodes = children(code38);
			t276 = claim_text(code38_nodes, "nameCache");
			code38_nodes.forEach(detach);
			t277 = claim_text(p54_nodes, " is the internal state of Terser, that can be serialised and deserialised to seed the Terser mangling state.");
			p54_nodes.forEach(detach);
			t278 = claim_space(section7_nodes);
			pre15 = claim_element(section7_nodes, "PRE", { class: true });
			var pre15_nodes = children(pre15);
			pre15_nodes.forEach(detach);
			section7_nodes.forEach(detach);
			t279 = claim_space(nodes);
			section8 = claim_element(nodes, "SECTION", {});
			var section8_nodes = children(section8);
			h34 = claim_element(section8_nodes, "H3", {});
			var h34_nodes = children(h34);
			a30 = claim_element(h34_nodes, "A", { href: true, id: true });
			var a30_nodes = children(a30);
			t280 = claim_text(a30_nodes, "Consistent property mangling across different builds");
			a30_nodes.forEach(detach);
			h34_nodes.forEach(detach);
			t281 = claim_space(section8_nodes);
			p55 = claim_element(section8_nodes, "P", {});
			var p55_nodes = children(p55);
			t282 = claim_text(p55_nodes, "What if you have multiple independent projects, and you want to make sure property mangling work across these projects?");
			p55_nodes.forEach(detach);
			t283 = claim_space(section8_nodes);
			p56 = claim_element(section8_nodes, "P", {});
			var p56_nodes = children(p56);
			t284 = claim_text(p56_nodes, "If the variables you mangled are private properties or methods, then, you don't have an issue with this. Different projects should be nicely encapsulated, and should not depends on internal properties or methods.");
			p56_nodes.forEach(detach);
			t285 = claim_space(section8_nodes);
			p57 = claim_element(section8_nodes, "P", {});
			var p57_nodes = children(p57);
			t286 = claim_text(p57_nodes, "So, what I am describing now is for public API methods and properties.");
			p57_nodes.forEach(detach);
			t287 = claim_space(section8_nodes);
			p58 = claim_element(section8_nodes, "P", {});
			var p58_nodes = children(p58);
			t288 = claim_text(p58_nodes, "What if you want to mangle them as well, how do you make sure that they wont break the user after mangling the public methods or properties?");
			p58_nodes.forEach(detach);
			t289 = claim_space(section8_nodes);
			p59 = claim_element(section8_nodes, "P", {});
			var p59_nodes = children(p59);
			t290 = claim_text(p59_nodes, "Since it involves public methods and properties, additional steps in setting up is understandable.");
			p59_nodes.forEach(detach);
			t291 = claim_space(section8_nodes);
			p60 = claim_element(section8_nodes, "P", {});
			var p60_nodes = children(p60);
			t292 = claim_text(p60_nodes, "In that case, I would recommend maintain a name mapping of how the properties should mangle into, and use ");
			a31 = claim_element(p60_nodes, "A", { href: true, rel: true });
			var a31_nodes = children(a31);
			t293 = claim_text(a31_nodes, "babel-plugin-transform-rename-properties");
			a31_nodes.forEach(detach);
			t294 = claim_text(p60_nodes, " to rename them.");
			p60_nodes.forEach(detach);
			t295 = claim_space(section8_nodes);
			p61 = claim_element(section8_nodes, "P", {});
			var p61_nodes = children(p61);
			t296 = claim_text(p61_nodes, "The name mapping is a manually curated list of names of your public properties and methods, and only need to be updated whenever there's a change in your public API.");
			p61_nodes.forEach(detach);
			t297 = claim_space(section8_nodes);
			p62 = claim_element(section8_nodes, "P", {});
			var p62_nodes = children(p62);
			t298 = claim_text(p62_nodes, "Think of it as part of your documentation, which should be updated whenever you change your public API.");
			p62_nodes.forEach(detach);
			t299 = claim_space(section8_nodes);
			pre16 = claim_element(section8_nodes, "PRE", { class: true });
			var pre16_nodes = children(pre16);
			pre16_nodes.forEach(detach);
			section8_nodes.forEach(detach);
			t300 = claim_space(nodes);
			section9 = claim_element(nodes, "SECTION", {});
			var section9_nodes = children(section9);
			h22 = claim_element(section9_nodes, "H2", {});
			var h22_nodes = children(h22);
			a32 = claim_element(h22_nodes, "A", { href: true, id: true });
			var a32_nodes = children(a32);
			t301 = claim_text(a32_nodes, "Misc");
			a32_nodes.forEach(detach);
			h22_nodes.forEach(detach);
			section9_nodes.forEach(detach);
			t302 = claim_space(nodes);
			section10 = claim_element(nodes, "SECTION", {});
			var section10_nodes = children(section10);
			h35 = claim_element(section10_nodes, "H3", {});
			var h35_nodes = children(h35);
			a33 = claim_element(h35_nodes, "A", { href: true, id: true });
			var a33_nodes = children(a33);
			t303 = claim_text(a33_nodes, "Webpack and Rollup");
			a33_nodes.forEach(detach);
			h35_nodes.forEach(detach);
			t304 = claim_space(section10_nodes);
			p63 = claim_element(section10_nodes, "P", {});
			var p63_nodes = children(p63);
			t305 = claim_text(p63_nodes, "Throughout the article, we mentioned Terser and ");
			code39 = claim_element(p63_nodes, "CODE", {});
			var code39_nodes = children(code39);
			t306 = claim_text(code39_nodes, "terserOptions");
			code39_nodes.forEach(detach);
			t307 = claim_text(p63_nodes, ", and didnt really go into how you would use it for projects bundled with ");
			a34 = claim_element(p63_nodes, "A", { href: true, rel: true });
			var a34_nodes = children(a34);
			t308 = claim_text(a34_nodes, "webpack");
			a34_nodes.forEach(detach);
			t309 = claim_text(p63_nodes, " or ");
			a35 = claim_element(p63_nodes, "A", { href: true, rel: true });
			var a35_nodes = children(a35);
			t310 = claim_text(a35_nodes, "rollup");
			a35_nodes.forEach(detach);
			t311 = claim_text(p63_nodes, ".");
			p63_nodes.forEach(detach);
			t312 = claim_space(section10_nodes);
			p64 = claim_element(section10_nodes, "P", {});
			var p64_nodes = children(p64);
			t313 = claim_text(p64_nodes, "For webpack user, you can use ");
			a36 = claim_element(p64_nodes, "A", { href: true, rel: true });
			var a36_nodes = children(a36);
			t314 = claim_text(a36_nodes, "terser-webpack-plugin");
			a36_nodes.forEach(detach);
			t315 = claim_text(p64_nodes, ".");
			p64_nodes.forEach(detach);
			t316 = claim_space(section10_nodes);
			pre17 = claim_element(section10_nodes, "PRE", { class: true });
			var pre17_nodes = children(pre17);
			pre17_nodes.forEach(detach);
			t317 = claim_space(section10_nodes);
			p65 = claim_element(section10_nodes, "P", {});
			var p65_nodes = children(p65);
			t318 = claim_text(p65_nodes, "For rollup user, you can use ");
			a37 = claim_element(p65_nodes, "A", { href: true, rel: true });
			var a37_nodes = children(a37);
			t319 = claim_text(a37_nodes, "rollup-plugin-terser");
			a37_nodes.forEach(detach);
			p65_nodes.forEach(detach);
			t320 = claim_space(section10_nodes);
			pre18 = claim_element(section10_nodes, "PRE", { class: true });
			var pre18_nodes = children(pre18);
			pre18_nodes.forEach(detach);
			section10_nodes.forEach(detach);
			t321 = claim_space(nodes);
			section11 = claim_element(nodes, "SECTION", {});
			var section11_nodes = children(section11);
			h36 = claim_element(section11_nodes, "H3", {});
			var h36_nodes = children(h36);
			a38 = claim_element(h36_nodes, "A", { href: true, id: true });
			var a38_nodes = children(a38);
			t322 = claim_text(a38_nodes, "A curious case of Preact");
			a38_nodes.forEach(detach);
			h36_nodes.forEach(detach);
			t323 = claim_space(section11_nodes);
			blockquote0 = claim_element(section11_nodes, "BLOCKQUOTE", {});
			var blockquote0_nodes = children(blockquote0);
			p66 = claim_element(blockquote0_nodes, "P", {});
			var p66_nodes = children(p66);
			t324 = claim_text(p66_nodes, "The rabbit hole of how to mangle property names starts with investigating the ");
			a39 = claim_element(p66_nodes, "A", { href: true, rel: true });
			var a39_nodes = children(a39);
			t325 = claim_text(a39_nodes, "Preact");
			a39_nodes.forEach(detach);
			t326 = claim_space(p66_nodes);
			a40 = claim_element(p66_nodes, "A", { href: true, rel: true });
			var a40_nodes = children(a40);
			t327 = claim_text(a40_nodes, "Suspense bug");
			a40_nodes.forEach(detach);
			t328 = claim_text(p66_nodes, ", but that would be a story for another time.");
			p66_nodes.forEach(detach);
			blockquote0_nodes.forEach(detach);
			t329 = claim_space(section11_nodes);
			p67 = claim_element(section11_nodes, "P", {});
			var p67_nodes = children(p67);
			t330 = claim_text(p67_nodes, "Preact is a fast 3kB React alternative, with the same modern API.");
			p67_nodes.forEach(detach);
			t331 = claim_space(section11_nodes);
			p68 = claim_element(section11_nodes, "P", {});
			var p68_nodes = children(p68);
			t332 = claim_text(p68_nodes, "Property mangling contributed an important part to keep the library slim.");
			p68_nodes.forEach(detach);
			t333 = claim_space(section11_nodes);
			table = claim_element(section11_nodes, "TABLE", {});
			var table_nodes = children(table);
			thead = claim_element(table_nodes, "THEAD", {});
			var thead_nodes = children(thead);
			tr0 = claim_element(thead_nodes, "TR", {});
			var tr0_nodes = children(tr0);
			th0 = claim_element(tr0_nodes, "TH", {});
			var th0_nodes = children(th0);
			t334 = claim_text(th0_nodes, "Without mangling");
			th0_nodes.forEach(detach);
			t335 = claim_space(tr0_nodes);
			th1 = claim_element(tr0_nodes, "TH", {});
			var th1_nodes = children(th1);
			t336 = claim_text(th1_nodes, "With mangling");
			th1_nodes.forEach(detach);
			tr0_nodes.forEach(detach);
			thead_nodes.forEach(detach);
			t337 = claim_space(table_nodes);
			tbody = claim_element(table_nodes, "TBODY", {});
			var tbody_nodes = children(tbody);
			tr1 = claim_element(tbody_nodes, "TR", {});
			var tr1_nodes = children(tr1);
			td0 = claim_element(tr1_nodes, "TD", {});
			var td0_nodes = children(td0);
			t338 = claim_text(td0_nodes, "10.7 KB minified");
			td0_nodes.forEach(detach);
			t339 = claim_space(tr1_nodes);
			td1 = claim_element(tr1_nodes, "TD", {});
			var td1_nodes = children(td1);
			t340 = claim_text(td1_nodes, "9.7 Kb minified (reduced ~10%)");
			td1_nodes.forEach(detach);
			tr1_nodes.forEach(detach);
			t341 = claim_space(tbody_nodes);
			tr2 = claim_element(tbody_nodes, "TR", {});
			var tr2_nodes = children(tr2);
			td2 = claim_element(tr2_nodes, "TD", {});
			var td2_nodes = children(td2);
			t342 = claim_text(td2_nodes, "4.2 KB minified + gzipped");
			td2_nodes.forEach(detach);
			t343 = claim_space(tr2_nodes);
			td3 = claim_element(tr2_nodes, "TD", {});
			var td3_nodes = children(td3);
			t344 = claim_text(td3_nodes, "3.9 KB minified + gzipped (reduced ~5%)");
			td3_nodes.forEach(detach);
			tr2_nodes.forEach(detach);
			tbody_nodes.forEach(detach);
			table_nodes.forEach(detach);
			t345 = claim_space(section11_nodes);
			p69 = claim_element(section11_nodes, "P", {});
			var p69_nodes = children(p69);
			t346 = claim_text(p69_nodes, "There's several different builds for ");
			code40 = claim_element(p69_nodes, "CODE", {});
			var code40_nodes = children(code40);
			t347 = claim_text(code40_nodes, "preact");
			code40_nodes.forEach(detach);
			t348 = claim_text(p69_nodes, ":");
			p69_nodes.forEach(detach);
			t349 = claim_space(section11_nodes);
			ul7 = claim_element(section11_nodes, "UL", {});
			var ul7_nodes = children(ul7);
			li17 = claim_element(ul7_nodes, "LI", {});
			var li17_nodes = children(li17);
			code41 = claim_element(li17_nodes, "CODE", {});
			var code41_nodes = children(code41);
			t350 = claim_text(code41_nodes, "preact/core");
			code41_nodes.forEach(detach);
			li17_nodes.forEach(detach);
			t351 = claim_space(ul7_nodes);
			li18 = claim_element(ul7_nodes, "LI", {});
			var li18_nodes = children(li18);
			code42 = claim_element(li18_nodes, "CODE", {});
			var code42_nodes = children(code42);
			t352 = claim_text(code42_nodes, "preact/compat");
			code42_nodes.forEach(detach);
			t353 = claim_text(li18_nodes, " - a compat layer on top of preact to provide all React API");
			li18_nodes.forEach(detach);
			t354 = claim_space(ul7_nodes);
			li19 = claim_element(ul7_nodes, "LI", {});
			var li19_nodes = children(li19);
			code43 = claim_element(li19_nodes, "CODE", {});
			var code43_nodes = children(code43);
			t355 = claim_text(code43_nodes, "preact/debug");
			code43_nodes.forEach(detach);
			t356 = claim_text(li19_nodes, " - a layer on top of ");
			code44 = claim_element(li19_nodes, "CODE", {});
			var code44_nodes = children(code44);
			t357 = claim_text(code44_nodes, "preact/core");
			code44_nodes.forEach(detach);
			t358 = claim_text(li19_nodes, " that provides a better debugging experience");
			li19_nodes.forEach(detach);
			t359 = claim_space(ul7_nodes);
			li20 = claim_element(ul7_nodes, "LI", {});
			var li20_nodes = children(li20);
			code45 = claim_element(li20_nodes, "CODE", {});
			var code45_nodes = children(code45);
			t360 = claim_text(code45_nodes, "preact/devtools");
			code45_nodes.forEach(detach);
			t361 = claim_text(li20_nodes, " - the bridge between ");
			code46 = claim_element(li20_nodes, "CODE", {});
			var code46_nodes = children(code46);
			t362 = claim_text(code46_nodes, "preact/core");
			code46_nodes.forEach(detach);
			t363 = claim_text(li20_nodes, " and the devtools extension.");
			li20_nodes.forEach(detach);
			ul7_nodes.forEach(detach);
			t364 = claim_space(section11_nodes);
			p70 = claim_element(section11_nodes, "P", {});
			var p70_nodes = children(p70);
			t365 = claim_text(p70_nodes, "To have a consistent mangle properties across different builds, ");
			code47 = claim_element(p70_nodes, "CODE", {});
			var code47_nodes = children(code47);
			t366 = claim_text(code47_nodes, "babel-plugin-transform-rename-properties");
			code47_nodes.forEach(detach);
			t367 = claim_text(p70_nodes, " is used, and the name mapping is stored at ");
			a41 = claim_element(p70_nodes, "A", { href: true, rel: true });
			var a41_nodes = children(a41);
			code48 = claim_element(a41_nodes, "CODE", {});
			var code48_nodes = children(code48);
			t368 = claim_text(code48_nodes, "mangle.json");
			code48_nodes.forEach(detach);
			a41_nodes.forEach(detach);
			t369 = claim_text(p70_nodes, ".");
			p70_nodes.forEach(detach);
			t370 = claim_space(section11_nodes);
			blockquote1 = claim_element(section11_nodes, "BLOCKQUOTE", {});
			var blockquote1_nodes = children(blockquote1);
			p71 = claim_element(blockquote1_nodes, "P", {});
			var p71_nodes = children(p71);
			t371 = claim_text(p71_nodes, "Check out this Pull Request that adds ");
			code49 = claim_element(p71_nodes, "CODE", {});
			var code49_nodes = children(code49);
			t372 = claim_text(code49_nodes, "babel-plugin-transform-rename-properties");
			code49_nodes.forEach(detach);
			t373 = claim_text(p71_nodes, " into Preact: ");
			a42 = claim_element(p71_nodes, "A", { href: true, rel: true });
			var a42_nodes = children(a42);
			t374 = claim_text(a42_nodes, "https://github.com/preactjs/preact/pull/2548");
			a42_nodes.forEach(detach);
			p71_nodes.forEach(detach);
			blockquote1_nodes.forEach(detach);
			t375 = claim_space(section11_nodes);
			p72 = claim_element(section11_nodes, "P", {});
			var p72_nodes = children(p72);
			t376 = claim_text(p72_nodes, "For mangling private properties, the bundling process of Preact is abstracted in ");
			a43 = claim_element(p72_nodes, "A", { href: true, rel: true });
			var a43_nodes = children(a43);
			t377 = claim_text(a43_nodes, "microbundle");
			a43_nodes.forEach(detach);
			t378 = claim_text(p72_nodes, ", which reads the mangle options from ");
			code50 = claim_element(p72_nodes, "CODE", {});
			var code50_nodes = children(code50);
			t379 = claim_text(code50_nodes, "mangle.json");
			code50_nodes.forEach(detach);
			t380 = claim_text(p72_nodes, " or the ");
			code51 = claim_element(p72_nodes, "CODE", {});
			var code51_nodes = children(code51);
			t381 = claim_text(code51_nodes, "mangle");
			code51_nodes.forEach(detach);
			t382 = claim_text(p72_nodes, " property from ");
			code52 = claim_element(p72_nodes, "CODE", {});
			var code52_nodes = children(code52);
			t383 = claim_text(code52_nodes, "package.json");
			code52_nodes.forEach(detach);
			t384 = claim_text(p72_nodes, ". See ");
			a44 = claim_element(p72_nodes, "A", { href: true, rel: true });
			var a44_nodes = children(a44);
			t385 = claim_text(a44_nodes, "Mangling Properties for microbundle");
			a44_nodes.forEach(detach);
			t386 = claim_text(p72_nodes, ".");
			p72_nodes.forEach(detach);
			section11_nodes.forEach(detach);
			t387 = claim_space(nodes);
			section12 = claim_element(nodes, "SECTION", {});
			var section12_nodes = children(section12);
			h23 = claim_element(section12_nodes, "H2", {});
			var h23_nodes = children(h23);
			a45 = claim_element(h23_nodes, "A", { href: true, id: true });
			var a45_nodes = children(a45);
			t388 = claim_text(a45_nodes, "Closing Note");
			a45_nodes.forEach(detach);
			h23_nodes.forEach(detach);
			t389 = claim_space(section12_nodes);
			p73 = claim_element(section12_nodes, "P", {});
			var p73_nodes = children(p73);
			t390 = claim_text(p73_nodes, "We've covered what is property mangling and all the caveats come along with it.");
			p73_nodes.forEach(detach);
			t391 = claim_space(section12_nodes);
			p74 = claim_element(section12_nodes, "P", {});
			var p74_nodes = children(p74);
			t392 = claim_text(p74_nodes, "With the full grasp of the caveats, we looked at various tactics that we can use to utilise property mangling to reduce our minified code output.");
			p74_nodes.forEach(detach);
			section12_nodes.forEach(detach);
			t393 = claim_space(nodes);
			section13 = claim_element(nodes, "SECTION", {});
			var section13_nodes = children(section13);
			h24 = claim_element(section13_nodes, "H2", {});
			var h24_nodes = children(h24);
			a46 = claim_element(h24_nodes, "A", { href: true, id: true });
			var a46_nodes = children(a46);
			t394 = claim_text(a46_nodes, "Further Reading");
			a46_nodes.forEach(detach);
			h24_nodes.forEach(detach);
			t395 = claim_space(section13_nodes);
			ul8 = claim_element(section13_nodes, "UL", {});
			var ul8_nodes = children(ul8);
			li21 = claim_element(ul8_nodes, "LI", {});
			var li21_nodes = children(li21);
			a47 = claim_element(li21_nodes, "A", { href: true, rel: true });
			var a47_nodes = children(a47);
			t396 = claim_text(a47_nodes, "Terser Mangle options");
			a47_nodes.forEach(detach);
			li21_nodes.forEach(detach);
			t397 = claim_space(ul8_nodes);
			li22 = claim_element(ul8_nodes, "LI", {});
			var li22_nodes = children(li22);
			a48 = claim_element(li22_nodes, "A", { href: true, rel: true });
			var a48_nodes = children(a48);
			t398 = claim_text(a48_nodes, "microbundle Mangling Properties");
			a48_nodes.forEach(detach);
			li22_nodes.forEach(detach);
			t399 = claim_space(ul8_nodes);
			li23 = claim_element(ul8_nodes, "LI", {});
			var li23_nodes = children(li23);
			a49 = claim_element(li23_nodes, "A", { href: true, rel: true });
			var a49_nodes = children(a49);
			t400 = claim_text(a49_nodes, "babel-plugin-transform-rename-properties");
			a49_nodes.forEach(detach);
			li23_nodes.forEach(detach);
			ul8_nodes.forEach(detach);
			section13_nodes.forEach(detach);
			this.h();
		},
		h() {
			attr(a0, "href", "#what-is-mangling-property");
			attr(a1, "href", "#why-is-property-mangling-considered-unsafe");
			attr(a2, "href", "#set-or-get-property-from-the-global-scope");
			attr(a3, "href", "#mangling-for-rollup-webpack-bundled-code");
			attr(a4, "href", "#how-to-mangle-property-responsibly-and-safely");
			attr(a5, "href", "#private-property");
			attr(a6, "href", "#consistent-property-mangling-across-subsequent-minifications");
			attr(a7, "href", "#consistent-property-mangling-across-different-builds");
			attr(a8, "href", "#misc");
			attr(a9, "href", "#webpack-and-rollup");
			attr(a10, "href", "#a-curious-case-of-preact");
			attr(a11, "href", "#closing-note");
			attr(a12, "href", "#further-reading");
			attr(ul4, "class", "sitemap");
			attr(ul4, "id", "sitemap");
			attr(ul4, "role", "navigation");
			attr(ul4, "aria-label", "Table of Contents");
			attr(a13, "href", "#what-is-mangling-property");
			attr(a13, "id", "what-is-mangling-property");
			attr(pre0, "class", "language-js");
			attr(a14, "href", "https://github.com/terser/terser");
			attr(a14, "rel", "nofollow");
			attr(pre1, "class", "language-js");
			attr(a15, "href", "https://github.com/terser/terser#mangle-options");
			attr(a15, "rel", "nofollow");
			attr(pre2, "class", "language-js");
			attr(pre3, "class", "language-js");
			attr(a16, "href", "https://github.com/terser/terser#cli-mangling-property-names---mangle-props");
			attr(a16, "rel", "nofollow");
			attr(a17, "href", "#why-is-property-mangling-considered-unsafe");
			attr(a17, "id", "why-is-property-mangling-considered-unsafe");
			attr(pre4, "class", "language-js");
			attr(pre5, "class", "language-js");
			attr(pre6, "class", "language-js");
			attr(pre7, "class", "language-js");
			attr(pre8, "class", "language-js");
			attr(pre9, "class", "language-js");
			attr(a18, "href", "#set-or-get-property-from-the-global-scope");
			attr(a18, "id", "set-or-get-property-from-the-global-scope");
			attr(a19, "href", "https://github.com/terser/terser/blob/aacd5770d9364ecaca80ff450fe329e021ac98aa/tools/domprops.js");
			attr(a19, "rel", "nofollow");
			attr(a20, "href", "https://github.com/terser/terser/blob/aacd5770d9364ecaca80ff450fe329e021ac98aa/lib/propmangle.js#L67");
			attr(a20, "rel", "nofollow");
			attr(a21, "href", "https://github.com/terser/terser#mangle-properties-options");
			attr(a21, "rel", "nofollow");
			attr(a22, "href", "https://github.com/terser/terser#mangle-properties-options");
			attr(a22, "rel", "nofollow");
			attr(a23, "href", "#mangling-for-rollup-webpack-bundled-code");
			attr(a23, "id", "mangling-for-rollup-webpack-bundled-code");
			attr(a24, "href", "https://webpack.js.org/plugins/terser-webpack-plugin/");
			attr(a24, "rel", "nofollow");
			attr(a25, "href", "https://www.npmjs.com/package/rollup-plugin-terser");
			attr(a25, "rel", "nofollow");
			attr(a26, "href", "#how-to-mangle-property-responsibly-and-safely");
			attr(a26, "id", "how-to-mangle-property-responsibly-and-safely");
			attr(a27, "href", "#private-property");
			attr(a27, "id", "private-property");
			attr(pre10, "class", "language-js");
			attr(pre11, "class", "language-js");
			attr(pre12, "class", "language-js");
			attr(a28, "href", "https://www.robinwieruch.de/javascript-naming-conventions");
			attr(a28, "rel", "nofollow");
			attr(pre13, "class", "language-js");
			attr(pre14, "class", "language-js");
			attr(a29, "href", "#consistent-property-mangling-across-subsequent-minifications");
			attr(a29, "id", "consistent-property-mangling-across-subsequent-minifications");
			attr(pre15, "class", "language-js");
			attr(a30, "href", "#consistent-property-mangling-across-different-builds");
			attr(a30, "id", "consistent-property-mangling-across-different-builds");
			attr(a31, "href", "https://www.npmjs.com/package/babel-plugin-transform-rename-properties");
			attr(a31, "rel", "nofollow");
			attr(pre16, "class", "language-js");
			attr(a32, "href", "#misc");
			attr(a32, "id", "misc");
			attr(a33, "href", "#webpack-and-rollup");
			attr(a33, "id", "webpack-and-rollup");
			attr(a34, "href", "https://webpack.js.org/");
			attr(a34, "rel", "nofollow");
			attr(a35, "href", "https://rollupjs.org/");
			attr(a35, "rel", "nofollow");
			attr(a36, "href", "https://github.com/webpack-contrib/terser-webpack-plugin/");
			attr(a36, "rel", "nofollow");
			attr(pre17, "class", "language-js");
			attr(a37, "href", "https://www.npmjs.com/package/rollup-plugin-terser");
			attr(a37, "rel", "nofollow");
			attr(pre18, "class", "language-js");
			attr(a38, "href", "#a-curious-case-of-preact");
			attr(a38, "id", "a-curious-case-of-preact");
			attr(a39, "href", "https://github.com/preactjs/preact");
			attr(a39, "rel", "nofollow");
			attr(a40, "href", "https://github.com/preactjs/preact/pull/2661");
			attr(a40, "rel", "nofollow");
			attr(a41, "href", "https://github.com/preactjs/preact/blob/c2c9b9414bc4202b2ac487b55be626f955fba65f/mangle.json");
			attr(a41, "rel", "nofollow");
			attr(a42, "href", "https://github.com/preactjs/preact/pull/2548");
			attr(a42, "rel", "nofollow");
			attr(a43, "href", "https://github.com/developit/microbundle");
			attr(a43, "rel", "nofollow");
			attr(a44, "href", "https://github.com/developit/microbundle#mangling-properties");
			attr(a44, "rel", "nofollow");
			attr(a45, "href", "#closing-note");
			attr(a45, "id", "closing-note");
			attr(a46, "href", "#further-reading");
			attr(a46, "id", "further-reading");
			attr(a47, "href", "https://github.com/terser/terser#mangle-options");
			attr(a47, "rel", "nofollow");
			attr(a48, "href", "https://github.com/developit/microbundle#mangling-properties");
			attr(a48, "rel", "nofollow");
			attr(a49, "href", "https://www.npmjs.com/package/babel-plugin-transform-rename-properties");
			attr(a49, "rel", "nofollow");
		},
		m(target, anchor) {
			insert(target, section0, anchor);
			append(section0, ul4);
			append(ul4, li0);
			append(li0, a0);
			append(a0, t0);
			append(ul4, ul1);
			append(ul1, li1);
			append(li1, a1);
			append(a1, t1);
			append(ul1, ul0);
			append(ul0, li2);
			append(li2, a2);
			append(a2, t2);
			append(ul1, li3);
			append(li3, a3);
			append(a3, t3);
			append(ul4, li4);
			append(li4, a4);
			append(a4, t4);
			append(ul4, ul2);
			append(ul2, li5);
			append(li5, a5);
			append(a5, t5);
			append(ul2, li6);
			append(li6, a6);
			append(a6, t6);
			append(ul2, li7);
			append(li7, a7);
			append(a7, t7);
			append(ul4, li8);
			append(li8, a8);
			append(a8, t8);
			append(ul4, ul3);
			append(ul3, li9);
			append(li9, a9);
			append(a9, t9);
			append(ul3, li10);
			append(li10, a10);
			append(a10, t10);
			append(ul4, li11);
			append(li11, a11);
			append(a11, t11);
			append(ul4, li12);
			append(li12, a12);
			append(a12, t12);
			insert(target, t13, anchor);
			insert(target, section1, anchor);
			append(section1, h20);
			append(h20, a13);
			append(a13, t14);
			append(section1, t15);
			append(section1, p0);
			append(p0, t16);
			append(section1, t17);
			append(section1, pre0);
			pre0.innerHTML = raw0_value;
			append(section1, t18);
			append(section1, p1);
			append(p1, strong0);
			append(strong0, t19);
			append(section1, t20);
			append(section1, p2);
			append(p2, t21);
			append(p2, a14);
			append(a14, t22);
			append(p2, t23);
			append(section1, t24);
			append(section1, pre1);
			pre1.innerHTML = raw1_value;
			append(section1, t25);
			append(section1, p3);
			append(p3, strong1);
			append(strong1, t26);
			append(section1, t27);
			append(section1, p4);
			append(p4, em0);
			append(em0, t28);
			append(section1, t29);
			append(section1, p5);
			append(p5, t30);
			append(section1, t31);
			append(section1, p6);
			append(p6, t32);
			append(p6, strong2);
			append(strong2, t33);
			append(p6, t34);
			append(section1, t35);
			append(section1, p7);
			append(p7, t36);
			append(p7, a15);
			append(a15, t37);
			append(p7, t38);
			append(p7, strong3);
			append(strong3, t39);
			append(p7, t40);
			append(p7, strong4);
			append(strong4, t41);
			append(p7, t42);
			append(p7, strong5);
			append(strong5, t43);
			append(p7, t44);
			append(section1, t45);
			append(section1, p8);
			append(p8, t46);
			append(p8, code0);
			append(code0, t47);
			append(p8, t48);
			append(p8, code1);
			append(code1, t49);
			append(p8, t50);
			append(section1, t51);
			append(section1, pre2);
			pre2.innerHTML = raw2_value;
			append(section1, t52);
			append(section1, p9);
			append(p9, strong6);
			append(strong6, t53);
			append(section1, t54);
			append(section1, p10);
			append(p10, t55);
			append(section1, t56);
			append(section1, p11);
			append(p11, t57);
			append(p11, code2);
			append(code2, t58);
			append(p11, t59);
			append(section1, t60);
			append(section1, p12);
			append(p12, t61);
			append(section1, t62);
			append(section1, pre3);
			pre3.innerHTML = raw3_value;
			append(section1, t63);
			append(section1, p13);
			append(p13, strong7);
			append(strong7, t64);
			append(section1, t65);
			append(section1, p14);
			append(p14, t66);
			append(section1, t67);
			append(section1, p15);
			append(p15, strong8);
			append(strong8, t68);
			append(section1, t69);
			append(section1, p16);
			append(p16, t70);
			append(section1, t71);
			append(section1, p17);
			append(p17, t72);
			append(p17, code3);
			append(code3, t73);
			append(p17, t74);
			append(p17, code4);
			append(code4, t75);
			append(p17, t76);
			append(section1, t77);
			append(section1, p18);
			append(p18, t78);
			append(p18, code5);
			append(code5, t79);
			append(p18, t80);
			append(p18, code6);
			append(code6, t81);
			append(p18, t82);
			append(p18, code7);
			append(code7, t83);
			append(p18, t84);
			append(section1, t85);
			append(section1, p19);
			append(p19, strong9);
			append(strong9, t86);
			append(section1, t87);
			append(section1, p20);
			append(p20, t88);
			append(p20, strong10);
			append(strong10, t89);
			append(p20, t90);
			append(p20, a16);
			append(a16, t91);
			append(p20, t92);
			insert(target, t93, anchor);
			insert(target, section2, anchor);
			append(section2, h30);
			append(h30, a17);
			append(a17, t94);
			append(section2, t95);
			append(section2, p21);
			append(p21, t96);
			append(p21, strong11);
			append(strong11, t97);
			append(p21, t98);
			append(section2, t99);
			append(section2, pre4);
			pre4.innerHTML = raw4_value;
			append(section2, t100);
			append(section2, pre5);
			pre5.innerHTML = raw5_value;
			append(section2, t101);
			append(section2, p22);
			append(p22, t102);
			append(p22, code8);
			append(code8, t103);
			append(p22, t104);
			append(p22, code9);
			append(code9, t105);
			append(p22, t106);
			append(section2, t107);
			append(section2, p23);
			append(p23, t108);
			append(p23, strong12);
			append(strong12, t109);
			append(p23, t110);
			append(section2, t111);
			append(section2, pre6);
			pre6.innerHTML = raw6_value;
			append(section2, t112);
			append(section2, pre7);
			pre7.innerHTML = raw7_value;
			append(section2, t113);
			append(section2, p24);
			append(p24, t114);
			append(p24, em1);
			append(em1, t115);
			append(p24, t116);
			append(p24, code10);
			append(code10, t117);
			append(p24, t118);
			append(p24, code11);
			append(code11, t119);
			append(p24, t120);
			append(section2, t121);
			append(section2, p25);
			append(p25, t122);
			append(p25, strong13);
			append(strong13, t123);
			append(p25, t124);
			append(p25, strong14);
			append(strong14, t125);
			append(p25, t126);
			append(section2, t127);
			append(section2, p26);
			append(p26, t128);
			append(p26, strong15);
			append(strong15, t129);
			append(p26, t130);
			append(section2, t131);
			append(section2, p27);
			append(p27, t132);
			append(section2, t133);
			append(section2, ul5);
			append(ul5, li13);
			append(li13, t134);
			append(ul5, t135);
			append(ul5, li14);
			append(li14, t136);
			append(section2, t137);
			append(section2, p28);
			append(p28, t138);
			append(section2, t139);
			append(section2, pre8);
			pre8.innerHTML = raw8_value;
			append(section2, t140);
			append(section2, pre9);
			pre9.innerHTML = raw9_value;
			append(section2, t141);
			append(section2, p29);
			append(p29, t142);
			append(p29, code12);
			append(code12, t143);
			append(p29, t144);
			append(section2, t145);
			append(section2, p30);
			append(p30, t146);
			append(p30, code13);
			append(code13, t147);
			append(p30, t148);
			append(p30, code14);
			append(code14, t149);
			append(p30, t150);
			append(p30, code15);
			append(code15, t151);
			append(p30, t152);
			append(p30, code16);
			append(code16, t153);
			append(p30, t154);
			insert(target, t155, anchor);
			insert(target, section3, anchor);
			append(section3, h4);
			append(h4, a18);
			append(a18, t156);
			append(section3, t157);
			append(section3, p31);
			append(p31, strong16);
			append(strong16, t158);
			append(p31, t159);
			append(section3, t160);
			append(section3, p32);
			append(p32, t161);
			append(p32, code17);
			append(code17, t162);
			append(p32, t163);
			append(section3, t164);
			append(section3, p33);
			append(p33, strong17);
			append(strong17, t165);
			append(section3, t166);
			append(section3, p34);
			append(p34, t167);
			append(section3, t168);
			append(section3, ul6);
			append(ul6, li15);
			append(li15, t169);
			append(li15, code18);
			append(code18, t170);
			append(li15, t171);
			append(li15, code19);
			append(code19, t172);
			append(ul6, t173);
			append(ul6, li16);
			append(li16, t174);
			append(li16, code20);
			append(code20, t175);
			append(li16, t176);
			append(li16, code21);
			append(code21, t177);
			append(section3, t178);
			append(section3, p35);
			append(p35, t179);
			append(p35, a19);
			append(a19, t180);
			append(p35, t181);
			append(p35, a20);
			append(a20, code22);
			append(code22, t182);
			append(p35, t183);
			append(section3, t184);
			append(section3, p36);
			append(p36, t185);
			append(p36, code23);
			append(code23, t186);
			append(p36, t187);
			append(p36, a21);
			append(a21, t188);
			append(p36, t189);
			append(p36, code24);
			append(code24, t190);
			append(p36, t191);
			append(p36, strong18);
			append(strong18, t192);
			append(section3, t193);
			append(section3, p37);
			append(p37, strong19);
			append(strong19, t194);
			append(section3, t195);
			append(section3, p38);
			append(p38, t196);
			append(section3, t197);
			append(section3, p39);
			append(p39, t198);
			append(p39, code25);
			append(code25, t199);
			append(p39, t200);
			append(p39, a22);
			append(a22, t201);
			append(p39, t202);
			append(p39, code26);
			append(code26, t203);
			append(p39, t204);
			insert(target, t205, anchor);
			insert(target, section4, anchor);
			append(section4, h31);
			append(h31, a23);
			append(a23, t206);
			append(section4, t207);
			append(section4, p40);
			append(p40, t208);
			append(p40, a24);
			append(a24, t209);
			append(p40, t210);
			append(p40, a25);
			append(a25, t211);
			append(p40, t212);
			append(section4, t213);
			append(section4, p41);
			append(p41, strong20);
			append(strong20, t214);
			append(p41, t215);
			append(section4, t216);
			append(section4, p42);
			append(p42, t217);
			append(section4, t218);
			append(section4, p43);
			append(p43, t219);
			insert(target, t220, anchor);
			insert(target, section5, anchor);
			append(section5, h21);
			append(h21, a26);
			append(a26, t221);
			append(section5, t222);
			append(section5, p44);
			append(p44, t223);
			append(section5, t224);
			append(section5, p45);
			append(p45, t225);
			insert(target, t226, anchor);
			insert(target, section6, anchor);
			append(section6, h32);
			append(h32, a27);
			append(a27, t227);
			append(section6, t228);
			append(section6, p46);
			append(p46, t229);
			append(p46, code27);
			append(code27, t230);
			append(p46, t231);
			append(p46, code28);
			append(code28, t232);
			append(p46, t233);
			append(section6, t234);
			append(section6, pre10);
			pre10.innerHTML = raw10_value;
			append(section6, t235);
			append(section6, p47);
			append(p47, t236);
			append(p47, code29);
			append(code29, t237);
			append(p47, t238);
			append(p47, code30);
			append(code30, t239);
			append(p47, t240);
			append(p47, code31);
			append(code31, t241);
			append(p47, t242);
			append(p47, code32);
			append(code32, t243);
			append(p47, t244);
			append(p47, code33);
			append(code33, t245);
			append(p47, t246);
			append(p47, code34);
			append(code34, t247);
			append(p47, t248);
			append(section6, t249);
			append(section6, p48);
			append(p48, t250);
			append(section6, t251);
			append(section6, p49);
			append(p49, strong21);
			append(strong21, t252);
			append(section6, t253);
			append(section6, pre11);
			pre11.innerHTML = raw11_value;
			append(section6, t254);
			append(section6, p50);
			append(p50, strong22);
			append(strong22, t255);
			append(section6, t256);
			append(section6, pre12);
			pre12.innerHTML = raw12_value;
			append(section6, t257);
			append(section6, p51);
			append(p51, t258);
			append(p51, a28);
			append(a28, t259);
			append(p51, t260);
			append(p51, code35);
			append(code35, t261);
			append(p51, t262);
			append(section6, t263);
			append(section6, pre13);
			pre13.innerHTML = raw13_value;
			append(section6, t264);
			append(section6, p52);
			append(p52, t265);
			append(section6, t266);
			append(section6, pre14);
			pre14.innerHTML = raw14_value;
			insert(target, t267, anchor);
			insert(target, section7, anchor);
			append(section7, h33);
			append(h33, a29);
			append(a29, t268);
			append(section7, t269);
			append(section7, p53);
			append(p53, t270);
			append(p53, code36);
			append(code36, t271);
			append(p53, t272);
			append(p53, code37);
			append(code37, t273);
			append(p53, t274);
			append(section7, t275);
			append(section7, p54);
			append(p54, code38);
			append(code38, t276);
			append(p54, t277);
			append(section7, t278);
			append(section7, pre15);
			pre15.innerHTML = raw15_value;
			insert(target, t279, anchor);
			insert(target, section8, anchor);
			append(section8, h34);
			append(h34, a30);
			append(a30, t280);
			append(section8, t281);
			append(section8, p55);
			append(p55, t282);
			append(section8, t283);
			append(section8, p56);
			append(p56, t284);
			append(section8, t285);
			append(section8, p57);
			append(p57, t286);
			append(section8, t287);
			append(section8, p58);
			append(p58, t288);
			append(section8, t289);
			append(section8, p59);
			append(p59, t290);
			append(section8, t291);
			append(section8, p60);
			append(p60, t292);
			append(p60, a31);
			append(a31, t293);
			append(p60, t294);
			append(section8, t295);
			append(section8, p61);
			append(p61, t296);
			append(section8, t297);
			append(section8, p62);
			append(p62, t298);
			append(section8, t299);
			append(section8, pre16);
			pre16.innerHTML = raw16_value;
			insert(target, t300, anchor);
			insert(target, section9, anchor);
			append(section9, h22);
			append(h22, a32);
			append(a32, t301);
			insert(target, t302, anchor);
			insert(target, section10, anchor);
			append(section10, h35);
			append(h35, a33);
			append(a33, t303);
			append(section10, t304);
			append(section10, p63);
			append(p63, t305);
			append(p63, code39);
			append(code39, t306);
			append(p63, t307);
			append(p63, a34);
			append(a34, t308);
			append(p63, t309);
			append(p63, a35);
			append(a35, t310);
			append(p63, t311);
			append(section10, t312);
			append(section10, p64);
			append(p64, t313);
			append(p64, a36);
			append(a36, t314);
			append(p64, t315);
			append(section10, t316);
			append(section10, pre17);
			pre17.innerHTML = raw17_value;
			append(section10, t317);
			append(section10, p65);
			append(p65, t318);
			append(p65, a37);
			append(a37, t319);
			append(section10, t320);
			append(section10, pre18);
			pre18.innerHTML = raw18_value;
			insert(target, t321, anchor);
			insert(target, section11, anchor);
			append(section11, h36);
			append(h36, a38);
			append(a38, t322);
			append(section11, t323);
			append(section11, blockquote0);
			append(blockquote0, p66);
			append(p66, t324);
			append(p66, a39);
			append(a39, t325);
			append(p66, t326);
			append(p66, a40);
			append(a40, t327);
			append(p66, t328);
			append(section11, t329);
			append(section11, p67);
			append(p67, t330);
			append(section11, t331);
			append(section11, p68);
			append(p68, t332);
			append(section11, t333);
			append(section11, table);
			append(table, thead);
			append(thead, tr0);
			append(tr0, th0);
			append(th0, t334);
			append(tr0, t335);
			append(tr0, th1);
			append(th1, t336);
			append(table, t337);
			append(table, tbody);
			append(tbody, tr1);
			append(tr1, td0);
			append(td0, t338);
			append(tr1, t339);
			append(tr1, td1);
			append(td1, t340);
			append(tbody, t341);
			append(tbody, tr2);
			append(tr2, td2);
			append(td2, t342);
			append(tr2, t343);
			append(tr2, td3);
			append(td3, t344);
			append(section11, t345);
			append(section11, p69);
			append(p69, t346);
			append(p69, code40);
			append(code40, t347);
			append(p69, t348);
			append(section11, t349);
			append(section11, ul7);
			append(ul7, li17);
			append(li17, code41);
			append(code41, t350);
			append(ul7, t351);
			append(ul7, li18);
			append(li18, code42);
			append(code42, t352);
			append(li18, t353);
			append(ul7, t354);
			append(ul7, li19);
			append(li19, code43);
			append(code43, t355);
			append(li19, t356);
			append(li19, code44);
			append(code44, t357);
			append(li19, t358);
			append(ul7, t359);
			append(ul7, li20);
			append(li20, code45);
			append(code45, t360);
			append(li20, t361);
			append(li20, code46);
			append(code46, t362);
			append(li20, t363);
			append(section11, t364);
			append(section11, p70);
			append(p70, t365);
			append(p70, code47);
			append(code47, t366);
			append(p70, t367);
			append(p70, a41);
			append(a41, code48);
			append(code48, t368);
			append(p70, t369);
			append(section11, t370);
			append(section11, blockquote1);
			append(blockquote1, p71);
			append(p71, t371);
			append(p71, code49);
			append(code49, t372);
			append(p71, t373);
			append(p71, a42);
			append(a42, t374);
			append(section11, t375);
			append(section11, p72);
			append(p72, t376);
			append(p72, a43);
			append(a43, t377);
			append(p72, t378);
			append(p72, code50);
			append(code50, t379);
			append(p72, t380);
			append(p72, code51);
			append(code51, t381);
			append(p72, t382);
			append(p72, code52);
			append(code52, t383);
			append(p72, t384);
			append(p72, a44);
			append(a44, t385);
			append(p72, t386);
			insert(target, t387, anchor);
			insert(target, section12, anchor);
			append(section12, h23);
			append(h23, a45);
			append(a45, t388);
			append(section12, t389);
			append(section12, p73);
			append(p73, t390);
			append(section12, t391);
			append(section12, p74);
			append(p74, t392);
			insert(target, t393, anchor);
			insert(target, section13, anchor);
			append(section13, h24);
			append(h24, a46);
			append(a46, t394);
			append(section13, t395);
			append(section13, ul8);
			append(ul8, li21);
			append(li21, a47);
			append(a47, t396);
			append(ul8, t397);
			append(ul8, li22);
			append(li22, a48);
			append(a48, t398);
			append(ul8, t399);
			append(ul8, li23);
			append(li23, a49);
			append(a49, t400);
		},
		p: noop,
		d(detaching) {
			if (detaching) detach(section0);
			if (detaching) detach(t13);
			if (detaching) detach(section1);
			if (detaching) detach(t93);
			if (detaching) detach(section2);
			if (detaching) detach(t155);
			if (detaching) detach(section3);
			if (detaching) detach(t205);
			if (detaching) detach(section4);
			if (detaching) detach(t220);
			if (detaching) detach(section5);
			if (detaching) detach(t226);
			if (detaching) detach(section6);
			if (detaching) detach(t267);
			if (detaching) detach(section7);
			if (detaching) detach(t279);
			if (detaching) detach(section8);
			if (detaching) detach(t300);
			if (detaching) detach(section9);
			if (detaching) detach(t302);
			if (detaching) detach(section10);
			if (detaching) detach(t321);
			if (detaching) detach(section11);
			if (detaching) detach(t387);
			if (detaching) detach(section12);
			if (detaching) detach(t393);
			if (detaching) detach(section13);
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
	"title": "Reduce minified code size by property mangling",
	"date": "2020-08-08T08:00:00Z",
	"tags": ["JavaScript", "Terser"],
	"slug": "reduce-minified-code-size-by-property-mangling",
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
