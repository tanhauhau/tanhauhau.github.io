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
					"@id": "https%3A%2F%2Flihautan.com%2Funderstand-the-frontend-tools",
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
			attr(meta11, "content", "https%3A%2F%2Flihautan.com%2Funderstand-the-frontend-tools");
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
							"@id": "https%3A%2F%2Flihautan.com%2Funderstand-the-frontend-tools",
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

/* content/blog/understand-the-frontend-tools/@@page-markup.svelte generated by Svelte v3.24.0 */

function create_default_slot(ctx) {
	let section0;
	let ul;
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
	let section1;
	let h20;
	let a4;
	let t5;
	let t6;
	let p0;
	let t7;
	let em0;
	let t8;
	let t9;
	let t10;
	let p1;
	let a5;
	let t11;
	let t12;
	let a6;
	let t13;
	let t14;
	let t15;
	let blockquote0;
	let p2;
	let t16;
	let t17;
	let p3;
	let t18;
	let t19;
	let section2;
	let h21;
	let a7;
	let t20;
	let t21;
	let p4;
	let t22;
	let t23;
	let blockquote1;
	let p5;
	let t24;
	let t25;
	let p6;
	let t26;
	let t27;
	let blockquote2;
	let p7;
	let t28;
	let t29;
	let p8;
	let t30;
	let t31;
	let blockquote3;
	let p9;
	let t32;
	let t33;
	let section3;
	let h22;
	let a8;
	let t34;
	let t35;
	let p10;
	let t36;
	let t37;
	let p11;
	let t38;
	let t39;
	let p12;
	let t40;
	let t41;
	let p13;
	let t42;
	let a9;
	let t43;
	let t44;
	let t45;
	let ol;
	let li4;
	let p14;
	let strong0;
	let t46;
	let t47;
	let em1;
	let t48;
	let t49;
	let t50;
	let li5;
	let p15;
	let t51;
	let strong1;
	let t52;
	let t53;
	let em2;
	let t54;
	let t55;
	let t56;
	let li6;
	let p16;
	let strong2;
	let t57;
	let t58;
	let em3;
	let t59;
	let t60;
	let em4;
	let t61;
	let t62;
	let t63;
	let li7;
	let p17;
	let strong3;
	let t64;
	let t65;
	let t66;
	let li8;
	let p18;
	let t67;
	let a10;
	let t68;
	let t69;
	let t70;
	let li9;
	let p19;
	let t71;
	let code0;
	let t72;
	let t73;
	let code1;
	let t74;
	let t75;
	let code2;
	let t76;
	let t77;
	let code3;
	let t78;
	let t79;
	let code4;
	let t80;
	let t81;
	let code5;
	let t82;
	let t83;
	let code6;
	let t84;
	let t85;
	let code7;
	let t86;
	let t87;
	let a11;
	let t88;
	let t89;
	let t90;
	let li10;
	let p20;
	let strong4;
	let t91;
	let t92;
	let t93;
	let li11;
	let p21;
	let strong5;
	let t94;
	let t95;
	let t96;
	let li12;
	let p22;
	let strong6;
	let t97;
	let t98;
	let t99;
	let section4;
	let h23;
	let a12;
	let t100;
	let t101;
	let p23;
	let t102;

	return {
		c() {
			section0 = element("section");
			ul = element("ul");
			li0 = element("li");
			a0 = element("a");
			t0 = text("Motivation");
			li1 = element("li");
			a1 = element("a");
			t1 = text("Disclaimer");
			li2 = element("li");
			a2 = element("a");
			t2 = text("Asking Questions");
			li3 = element("li");
			a3 = element("a");
			t3 = text("Answering Them");
			t4 = space();
			section1 = element("section");
			h20 = element("h2");
			a4 = element("a");
			t5 = text("Motivation");
			t6 = space();
			p0 = element("p");
			t7 = text("Some people said, ");
			em0 = element("em");
			t8 = text("\"A year in the JavaScript world is equal to 10 years in the outside world.\"");
			t9 = text(" It maybe a bit of exaggerated, but it shed some light on the learning hell of a frontend developer.");
			t10 = space();
			p1 = element("p");
			a5 = element("a");
			t11 = text("Kamran Ahmed");
			t12 = text(" has written a nice article on ");
			a6 = element("a");
			t13 = text("frontend developer's roadmap in 2018");
			t14 = text(", according to him, if you want to be a frontend developer, you would require to learn preprocessors, package managers, frameworks, build tools, and etc. The list keeps going on and honestly it is tough to keep up with all the new things that's coming out.");
			t15 = space();
			blockquote0 = element("blockquote");
			p2 = element("p");
			t16 = text("So, how should we make sense of all these tools, libraries and frameworks to make ourselves a better frontend developer?");
			t17 = space();
			p3 = element("p");
			t18 = text("In this post and the posts to come, I would like to share some of my insights on how I navigate around all these ever evolving tools, libraries and frameworks.");
			t19 = space();
			section2 = element("section");
			h21 = element("h2");
			a7 = element("a");
			t20 = text("Disclaimer");
			t21 = space();
			p4 = element("p");
			t22 = text("Before you move on, I have to make some disclaimers.");
			t23 = space();
			blockquote1 = element("blockquote");
			p5 = element("p");
			t24 = text("I am just another frontend developer. I am writing this to share, and hopefully get your feedback, on how to make sense with all the frontend development tools.");
			t25 = space();
			p6 = element("p");
			t26 = text("And there's a lot of articles out there for beginners to pick up JavaScript and CSS, and so I am not covering that.");
			t27 = space();
			blockquote2 = element("blockquote");
			p7 = element("p");
			t28 = text("I will be assuming you have a basic understanding on how JavaScript and CSS works in building a web application.");
			t29 = space();
			p8 = element("p");
			t30 = text("Lastly, the opinions and insights I gathered are from articles, tweets, Github issues, and source code of the libraries.");
			t31 = space();
			blockquote3 = element("blockquote");
			p9 = element("p");
			t32 = text("So some opinions I have might not be the true intention of the library maintainers, but I am giving my perspective in the way I think is the best for me and for you to understand the tools.");
			t33 = space();
			section3 = element("section");
			h22 = element("h2");
			a8 = element("a");
			t34 = text("Asking Questions");
			t35 = space();
			p10 = element("p");
			t36 = text("I realised that in 2019, someone new to frontend development, there is a lot of knowledge and concepts required to acquire, plethora of tools to learn, and I persoanlly think that's a lot to ask. But yet, this is our state of our industry currently.");
			t37 = space();
			p11 = element("p");
			t38 = text("Therefore, I am writing down the thought process and concepts that I've gained so far, and hoped that these articles would help new comers to the frontend development world a better foothold on understanding the frontend ecosystem.");
			t39 = space();
			p12 = element("p");
			t40 = text("When picking up a new tool, I strongly believe that the best way to learn about it is to ask youself, what kind of problems were you facing without this new tool, and how did you solve these problems? Does the new tool solved your problems?");
			t41 = space();
			p13 = element("p");
			t42 = text("So, in my humble opinion, the best way of learning all the tools out there in the JavaScript world, is to go back to the basics, ie: writing ");
			a9 = element("a");
			t43 = text("Vanilla JavaScript");
			t44 = text(" and plain CSS, and start asking questions:");
			t45 = space();
			ol = element("ol");
			li4 = element("li");
			p14 = element("p");
			strong0 = element("strong");
			t46 = text("Modularity");
			t47 = text(". How do I break down my code (JavaScript and CSS alike) into separate modules? How do I ");
			em1 = element("em");
			t48 = text("\"import\"");
			t49 = text(" then when I need the module? If this module is to be used in multiple projects, how do I share them across projects? or better, how to share the modules to other people around the world?");
			t50 = space();
			li5 = element("li");
			p15 = element("p");
			t51 = text("Following up on question ");
			strong1 = element("strong");
			t52 = text("1.");
			t53 = text(", How do I piece all my ");
			em2 = element("em");
			t54 = text("\"modules\"");
			t55 = text(" together? How do I download the code for the modules I only when I need it?");
			t56 = space();
			li6 = element("li");
			p16 = element("p");
			strong2 = element("strong");
			t57 = text("CSS Modularity");
			t58 = text(". How do I ensure that in a big application that there's no naming conflict for my CSS ");
			em3 = element("em");
			t59 = text("classname");
			t60 = text(" or ");
			em4 = element("em");
			t61 = text("id");
			t62 = text("?");
			t63 = space();
			li7 = element("li");
			p17 = element("p");
			strong3 = element("strong");
			t64 = text("Abstraction");
			t65 = text(". if I can abstract common logic out in JavaScript, how do I have abstraction for CSS?");
			t66 = space();
			li8 = element("li");
			p18 = element("p");
			t67 = text("In all fairness, ");
			a10 = element("a");
			t68 = text("JavaScript is not the best designed language");
			t69 = text(". JavaScript has its own quirks. So how can JavaScript evolve as a language itself, and how do I make use of the latest language syntax without risking browser compatibility?");
			t70 = space();
			li9 = element("li");
			p19 = element("p");
			t71 = text("When I write code, I noticed a common pattern in the code that may cause bugs, for example, using variable without defined it in scope, missing ");
			code0 = element("code");
			t72 = text("default");
			t73 = text(" case in ");
			code1 = element("code");
			t74 = text("switch");
			t75 = text(" statement, adding ");
			code2 = element("code");
			t76 = text("string");
			t77 = text(" with ");
			code3 = element("code");
			t78 = text("number");
			t79 = text(", etc. How do I prevent myself from writing such code? Adding ");
			code4 = element("code");
			t80 = text("string");
			t81 = text(" and ");
			code5 = element("code");
			t82 = text("number");
			t83 = text(" is still a valid JavaScript code, but it will be a source of problem if we assume the result to be a ");
			code6 = element("code");
			t84 = text("number");
			t85 = text(". How do I make myself to be aware of the ");
			code7 = element("code");
			t86 = text("type");
			t87 = text(" of the variable, given that JavaScript is a ");
			a11 = element("a");
			t88 = text("dynamically-typed");
			t89 = text(" language?");
			t90 = space();
			li10 = element("li");
			p20 = element("p");
			strong4 = element("strong");
			t91 = text("Testing");
			t92 = text(". How should I test my code? If test code explains the behavior of my code, how do I write test code such that when other people reads the test code, they can understand all the quirks and behaviours of my actual code?");
			t93 = space();
			li11 = element("li");
			p21 = element("p");
			strong5 = element("strong");
			t94 = text("Test coverage");
			t95 = text(". How do I ensure that I test all the possible scenarios? How do I know that my code has some impossible path/logic that will never execute, knowing all the possible test cases?");
			t96 = space();
			li12 = element("li");
			p22 = element("p");
			strong6 = element("strong");
			t97 = text("Optimisation");
			t98 = text(". How does the browser downloads and exectues my code? What can I do to optimise the performance of my code? and how do I do it?");
			t99 = space();
			section4 = element("section");
			h23 = element("h2");
			a12 = element("a");
			t100 = text("Answering Them");
			t101 = space();
			p23 = element("p");
			t102 = text("The above are questions that I asked, and I am going to answer them one by one in the future articles.");
			this.h();
		},
		l(nodes) {
			section0 = claim_element(nodes, "SECTION", {});
			var section0_nodes = children(section0);

			ul = claim_element(section0_nodes, "UL", {
				class: true,
				id: true,
				role: true,
				"aria-label": true
			});

			var ul_nodes = children(ul);
			li0 = claim_element(ul_nodes, "LI", {});
			var li0_nodes = children(li0);
			a0 = claim_element(li0_nodes, "A", { href: true });
			var a0_nodes = children(a0);
			t0 = claim_text(a0_nodes, "Motivation");
			a0_nodes.forEach(detach);
			li0_nodes.forEach(detach);
			li1 = claim_element(ul_nodes, "LI", {});
			var li1_nodes = children(li1);
			a1 = claim_element(li1_nodes, "A", { href: true });
			var a1_nodes = children(a1);
			t1 = claim_text(a1_nodes, "Disclaimer");
			a1_nodes.forEach(detach);
			li1_nodes.forEach(detach);
			li2 = claim_element(ul_nodes, "LI", {});
			var li2_nodes = children(li2);
			a2 = claim_element(li2_nodes, "A", { href: true });
			var a2_nodes = children(a2);
			t2 = claim_text(a2_nodes, "Asking Questions");
			a2_nodes.forEach(detach);
			li2_nodes.forEach(detach);
			li3 = claim_element(ul_nodes, "LI", {});
			var li3_nodes = children(li3);
			a3 = claim_element(li3_nodes, "A", { href: true });
			var a3_nodes = children(a3);
			t3 = claim_text(a3_nodes, "Answering Them");
			a3_nodes.forEach(detach);
			li3_nodes.forEach(detach);
			ul_nodes.forEach(detach);
			section0_nodes.forEach(detach);
			t4 = claim_space(nodes);
			section1 = claim_element(nodes, "SECTION", {});
			var section1_nodes = children(section1);
			h20 = claim_element(section1_nodes, "H2", {});
			var h20_nodes = children(h20);
			a4 = claim_element(h20_nodes, "A", { href: true, id: true });
			var a4_nodes = children(a4);
			t5 = claim_text(a4_nodes, "Motivation");
			a4_nodes.forEach(detach);
			h20_nodes.forEach(detach);
			t6 = claim_space(section1_nodes);
			p0 = claim_element(section1_nodes, "P", {});
			var p0_nodes = children(p0);
			t7 = claim_text(p0_nodes, "Some people said, ");
			em0 = claim_element(p0_nodes, "EM", {});
			var em0_nodes = children(em0);
			t8 = claim_text(em0_nodes, "\"A year in the JavaScript world is equal to 10 years in the outside world.\"");
			em0_nodes.forEach(detach);
			t9 = claim_text(p0_nodes, " It maybe a bit of exaggerated, but it shed some light on the learning hell of a frontend developer.");
			p0_nodes.forEach(detach);
			t10 = claim_space(section1_nodes);
			p1 = claim_element(section1_nodes, "P", {});
			var p1_nodes = children(p1);
			a5 = claim_element(p1_nodes, "A", { href: true, rel: true });
			var a5_nodes = children(a5);
			t11 = claim_text(a5_nodes, "Kamran Ahmed");
			a5_nodes.forEach(detach);
			t12 = claim_text(p1_nodes, " has written a nice article on ");
			a6 = claim_element(p1_nodes, "A", { href: true, rel: true });
			var a6_nodes = children(a6);
			t13 = claim_text(a6_nodes, "frontend developer's roadmap in 2018");
			a6_nodes.forEach(detach);
			t14 = claim_text(p1_nodes, ", according to him, if you want to be a frontend developer, you would require to learn preprocessors, package managers, frameworks, build tools, and etc. The list keeps going on and honestly it is tough to keep up with all the new things that's coming out.");
			p1_nodes.forEach(detach);
			t15 = claim_space(section1_nodes);
			blockquote0 = claim_element(section1_nodes, "BLOCKQUOTE", {});
			var blockquote0_nodes = children(blockquote0);
			p2 = claim_element(blockquote0_nodes, "P", {});
			var p2_nodes = children(p2);
			t16 = claim_text(p2_nodes, "So, how should we make sense of all these tools, libraries and frameworks to make ourselves a better frontend developer?");
			p2_nodes.forEach(detach);
			blockquote0_nodes.forEach(detach);
			t17 = claim_space(section1_nodes);
			p3 = claim_element(section1_nodes, "P", {});
			var p3_nodes = children(p3);
			t18 = claim_text(p3_nodes, "In this post and the posts to come, I would like to share some of my insights on how I navigate around all these ever evolving tools, libraries and frameworks.");
			p3_nodes.forEach(detach);
			section1_nodes.forEach(detach);
			t19 = claim_space(nodes);
			section2 = claim_element(nodes, "SECTION", {});
			var section2_nodes = children(section2);
			h21 = claim_element(section2_nodes, "H2", {});
			var h21_nodes = children(h21);
			a7 = claim_element(h21_nodes, "A", { href: true, id: true });
			var a7_nodes = children(a7);
			t20 = claim_text(a7_nodes, "Disclaimer");
			a7_nodes.forEach(detach);
			h21_nodes.forEach(detach);
			t21 = claim_space(section2_nodes);
			p4 = claim_element(section2_nodes, "P", {});
			var p4_nodes = children(p4);
			t22 = claim_text(p4_nodes, "Before you move on, I have to make some disclaimers.");
			p4_nodes.forEach(detach);
			t23 = claim_space(section2_nodes);
			blockquote1 = claim_element(section2_nodes, "BLOCKQUOTE", {});
			var blockquote1_nodes = children(blockquote1);
			p5 = claim_element(blockquote1_nodes, "P", {});
			var p5_nodes = children(p5);
			t24 = claim_text(p5_nodes, "I am just another frontend developer. I am writing this to share, and hopefully get your feedback, on how to make sense with all the frontend development tools.");
			p5_nodes.forEach(detach);
			blockquote1_nodes.forEach(detach);
			t25 = claim_space(section2_nodes);
			p6 = claim_element(section2_nodes, "P", {});
			var p6_nodes = children(p6);
			t26 = claim_text(p6_nodes, "And there's a lot of articles out there for beginners to pick up JavaScript and CSS, and so I am not covering that.");
			p6_nodes.forEach(detach);
			t27 = claim_space(section2_nodes);
			blockquote2 = claim_element(section2_nodes, "BLOCKQUOTE", {});
			var blockquote2_nodes = children(blockquote2);
			p7 = claim_element(blockquote2_nodes, "P", {});
			var p7_nodes = children(p7);
			t28 = claim_text(p7_nodes, "I will be assuming you have a basic understanding on how JavaScript and CSS works in building a web application.");
			p7_nodes.forEach(detach);
			blockquote2_nodes.forEach(detach);
			t29 = claim_space(section2_nodes);
			p8 = claim_element(section2_nodes, "P", {});
			var p8_nodes = children(p8);
			t30 = claim_text(p8_nodes, "Lastly, the opinions and insights I gathered are from articles, tweets, Github issues, and source code of the libraries.");
			p8_nodes.forEach(detach);
			t31 = claim_space(section2_nodes);
			blockquote3 = claim_element(section2_nodes, "BLOCKQUOTE", {});
			var blockquote3_nodes = children(blockquote3);
			p9 = claim_element(blockquote3_nodes, "P", {});
			var p9_nodes = children(p9);
			t32 = claim_text(p9_nodes, "So some opinions I have might not be the true intention of the library maintainers, but I am giving my perspective in the way I think is the best for me and for you to understand the tools.");
			p9_nodes.forEach(detach);
			blockquote3_nodes.forEach(detach);
			section2_nodes.forEach(detach);
			t33 = claim_space(nodes);
			section3 = claim_element(nodes, "SECTION", {});
			var section3_nodes = children(section3);
			h22 = claim_element(section3_nodes, "H2", {});
			var h22_nodes = children(h22);
			a8 = claim_element(h22_nodes, "A", { href: true, id: true });
			var a8_nodes = children(a8);
			t34 = claim_text(a8_nodes, "Asking Questions");
			a8_nodes.forEach(detach);
			h22_nodes.forEach(detach);
			t35 = claim_space(section3_nodes);
			p10 = claim_element(section3_nodes, "P", {});
			var p10_nodes = children(p10);
			t36 = claim_text(p10_nodes, "I realised that in 2019, someone new to frontend development, there is a lot of knowledge and concepts required to acquire, plethora of tools to learn, and I persoanlly think that's a lot to ask. But yet, this is our state of our industry currently.");
			p10_nodes.forEach(detach);
			t37 = claim_space(section3_nodes);
			p11 = claim_element(section3_nodes, "P", {});
			var p11_nodes = children(p11);
			t38 = claim_text(p11_nodes, "Therefore, I am writing down the thought process and concepts that I've gained so far, and hoped that these articles would help new comers to the frontend development world a better foothold on understanding the frontend ecosystem.");
			p11_nodes.forEach(detach);
			t39 = claim_space(section3_nodes);
			p12 = claim_element(section3_nodes, "P", {});
			var p12_nodes = children(p12);
			t40 = claim_text(p12_nodes, "When picking up a new tool, I strongly believe that the best way to learn about it is to ask youself, what kind of problems were you facing without this new tool, and how did you solve these problems? Does the new tool solved your problems?");
			p12_nodes.forEach(detach);
			t41 = claim_space(section3_nodes);
			p13 = claim_element(section3_nodes, "P", {});
			var p13_nodes = children(p13);
			t42 = claim_text(p13_nodes, "So, in my humble opinion, the best way of learning all the tools out there in the JavaScript world, is to go back to the basics, ie: writing ");
			a9 = claim_element(p13_nodes, "A", { href: true, rel: true });
			var a9_nodes = children(a9);
			t43 = claim_text(a9_nodes, "Vanilla JavaScript");
			a9_nodes.forEach(detach);
			t44 = claim_text(p13_nodes, " and plain CSS, and start asking questions:");
			p13_nodes.forEach(detach);
			t45 = claim_space(section3_nodes);
			ol = claim_element(section3_nodes, "OL", {});
			var ol_nodes = children(ol);
			li4 = claim_element(ol_nodes, "LI", {});
			var li4_nodes = children(li4);
			p14 = claim_element(li4_nodes, "P", {});
			var p14_nodes = children(p14);
			strong0 = claim_element(p14_nodes, "STRONG", {});
			var strong0_nodes = children(strong0);
			t46 = claim_text(strong0_nodes, "Modularity");
			strong0_nodes.forEach(detach);
			t47 = claim_text(p14_nodes, ". How do I break down my code (JavaScript and CSS alike) into separate modules? How do I ");
			em1 = claim_element(p14_nodes, "EM", {});
			var em1_nodes = children(em1);
			t48 = claim_text(em1_nodes, "\"import\"");
			em1_nodes.forEach(detach);
			t49 = claim_text(p14_nodes, " then when I need the module? If this module is to be used in multiple projects, how do I share them across projects? or better, how to share the modules to other people around the world?");
			p14_nodes.forEach(detach);
			li4_nodes.forEach(detach);
			t50 = claim_space(ol_nodes);
			li5 = claim_element(ol_nodes, "LI", {});
			var li5_nodes = children(li5);
			p15 = claim_element(li5_nodes, "P", {});
			var p15_nodes = children(p15);
			t51 = claim_text(p15_nodes, "Following up on question ");
			strong1 = claim_element(p15_nodes, "STRONG", {});
			var strong1_nodes = children(strong1);
			t52 = claim_text(strong1_nodes, "1.");
			strong1_nodes.forEach(detach);
			t53 = claim_text(p15_nodes, ", How do I piece all my ");
			em2 = claim_element(p15_nodes, "EM", {});
			var em2_nodes = children(em2);
			t54 = claim_text(em2_nodes, "\"modules\"");
			em2_nodes.forEach(detach);
			t55 = claim_text(p15_nodes, " together? How do I download the code for the modules I only when I need it?");
			p15_nodes.forEach(detach);
			li5_nodes.forEach(detach);
			t56 = claim_space(ol_nodes);
			li6 = claim_element(ol_nodes, "LI", {});
			var li6_nodes = children(li6);
			p16 = claim_element(li6_nodes, "P", {});
			var p16_nodes = children(p16);
			strong2 = claim_element(p16_nodes, "STRONG", {});
			var strong2_nodes = children(strong2);
			t57 = claim_text(strong2_nodes, "CSS Modularity");
			strong2_nodes.forEach(detach);
			t58 = claim_text(p16_nodes, ". How do I ensure that in a big application that there's no naming conflict for my CSS ");
			em3 = claim_element(p16_nodes, "EM", {});
			var em3_nodes = children(em3);
			t59 = claim_text(em3_nodes, "classname");
			em3_nodes.forEach(detach);
			t60 = claim_text(p16_nodes, " or ");
			em4 = claim_element(p16_nodes, "EM", {});
			var em4_nodes = children(em4);
			t61 = claim_text(em4_nodes, "id");
			em4_nodes.forEach(detach);
			t62 = claim_text(p16_nodes, "?");
			p16_nodes.forEach(detach);
			li6_nodes.forEach(detach);
			t63 = claim_space(ol_nodes);
			li7 = claim_element(ol_nodes, "LI", {});
			var li7_nodes = children(li7);
			p17 = claim_element(li7_nodes, "P", {});
			var p17_nodes = children(p17);
			strong3 = claim_element(p17_nodes, "STRONG", {});
			var strong3_nodes = children(strong3);
			t64 = claim_text(strong3_nodes, "Abstraction");
			strong3_nodes.forEach(detach);
			t65 = claim_text(p17_nodes, ". if I can abstract common logic out in JavaScript, how do I have abstraction for CSS?");
			p17_nodes.forEach(detach);
			li7_nodes.forEach(detach);
			t66 = claim_space(ol_nodes);
			li8 = claim_element(ol_nodes, "LI", {});
			var li8_nodes = children(li8);
			p18 = claim_element(li8_nodes, "P", {});
			var p18_nodes = children(p18);
			t67 = claim_text(p18_nodes, "In all fairness, ");
			a10 = claim_element(p18_nodes, "A", { href: true, rel: true });
			var a10_nodes = children(a10);
			t68 = claim_text(a10_nodes, "JavaScript is not the best designed language");
			a10_nodes.forEach(detach);
			t69 = claim_text(p18_nodes, ". JavaScript has its own quirks. So how can JavaScript evolve as a language itself, and how do I make use of the latest language syntax without risking browser compatibility?");
			p18_nodes.forEach(detach);
			li8_nodes.forEach(detach);
			t70 = claim_space(ol_nodes);
			li9 = claim_element(ol_nodes, "LI", {});
			var li9_nodes = children(li9);
			p19 = claim_element(li9_nodes, "P", {});
			var p19_nodes = children(p19);
			t71 = claim_text(p19_nodes, "When I write code, I noticed a common pattern in the code that may cause bugs, for example, using variable without defined it in scope, missing ");
			code0 = claim_element(p19_nodes, "CODE", {});
			var code0_nodes = children(code0);
			t72 = claim_text(code0_nodes, "default");
			code0_nodes.forEach(detach);
			t73 = claim_text(p19_nodes, " case in ");
			code1 = claim_element(p19_nodes, "CODE", {});
			var code1_nodes = children(code1);
			t74 = claim_text(code1_nodes, "switch");
			code1_nodes.forEach(detach);
			t75 = claim_text(p19_nodes, " statement, adding ");
			code2 = claim_element(p19_nodes, "CODE", {});
			var code2_nodes = children(code2);
			t76 = claim_text(code2_nodes, "string");
			code2_nodes.forEach(detach);
			t77 = claim_text(p19_nodes, " with ");
			code3 = claim_element(p19_nodes, "CODE", {});
			var code3_nodes = children(code3);
			t78 = claim_text(code3_nodes, "number");
			code3_nodes.forEach(detach);
			t79 = claim_text(p19_nodes, ", etc. How do I prevent myself from writing such code? Adding ");
			code4 = claim_element(p19_nodes, "CODE", {});
			var code4_nodes = children(code4);
			t80 = claim_text(code4_nodes, "string");
			code4_nodes.forEach(detach);
			t81 = claim_text(p19_nodes, " and ");
			code5 = claim_element(p19_nodes, "CODE", {});
			var code5_nodes = children(code5);
			t82 = claim_text(code5_nodes, "number");
			code5_nodes.forEach(detach);
			t83 = claim_text(p19_nodes, " is still a valid JavaScript code, but it will be a source of problem if we assume the result to be a ");
			code6 = claim_element(p19_nodes, "CODE", {});
			var code6_nodes = children(code6);
			t84 = claim_text(code6_nodes, "number");
			code6_nodes.forEach(detach);
			t85 = claim_text(p19_nodes, ". How do I make myself to be aware of the ");
			code7 = claim_element(p19_nodes, "CODE", {});
			var code7_nodes = children(code7);
			t86 = claim_text(code7_nodes, "type");
			code7_nodes.forEach(detach);
			t87 = claim_text(p19_nodes, " of the variable, given that JavaScript is a ");
			a11 = claim_element(p19_nodes, "A", { href: true, rel: true });
			var a11_nodes = children(a11);
			t88 = claim_text(a11_nodes, "dynamically-typed");
			a11_nodes.forEach(detach);
			t89 = claim_text(p19_nodes, " language?");
			p19_nodes.forEach(detach);
			li9_nodes.forEach(detach);
			t90 = claim_space(ol_nodes);
			li10 = claim_element(ol_nodes, "LI", {});
			var li10_nodes = children(li10);
			p20 = claim_element(li10_nodes, "P", {});
			var p20_nodes = children(p20);
			strong4 = claim_element(p20_nodes, "STRONG", {});
			var strong4_nodes = children(strong4);
			t91 = claim_text(strong4_nodes, "Testing");
			strong4_nodes.forEach(detach);
			t92 = claim_text(p20_nodes, ". How should I test my code? If test code explains the behavior of my code, how do I write test code such that when other people reads the test code, they can understand all the quirks and behaviours of my actual code?");
			p20_nodes.forEach(detach);
			li10_nodes.forEach(detach);
			t93 = claim_space(ol_nodes);
			li11 = claim_element(ol_nodes, "LI", {});
			var li11_nodes = children(li11);
			p21 = claim_element(li11_nodes, "P", {});
			var p21_nodes = children(p21);
			strong5 = claim_element(p21_nodes, "STRONG", {});
			var strong5_nodes = children(strong5);
			t94 = claim_text(strong5_nodes, "Test coverage");
			strong5_nodes.forEach(detach);
			t95 = claim_text(p21_nodes, ". How do I ensure that I test all the possible scenarios? How do I know that my code has some impossible path/logic that will never execute, knowing all the possible test cases?");
			p21_nodes.forEach(detach);
			li11_nodes.forEach(detach);
			t96 = claim_space(ol_nodes);
			li12 = claim_element(ol_nodes, "LI", {});
			var li12_nodes = children(li12);
			p22 = claim_element(li12_nodes, "P", {});
			var p22_nodes = children(p22);
			strong6 = claim_element(p22_nodes, "STRONG", {});
			var strong6_nodes = children(strong6);
			t97 = claim_text(strong6_nodes, "Optimisation");
			strong6_nodes.forEach(detach);
			t98 = claim_text(p22_nodes, ". How does the browser downloads and exectues my code? What can I do to optimise the performance of my code? and how do I do it?");
			p22_nodes.forEach(detach);
			li12_nodes.forEach(detach);
			ol_nodes.forEach(detach);
			section3_nodes.forEach(detach);
			t99 = claim_space(nodes);
			section4 = claim_element(nodes, "SECTION", {});
			var section4_nodes = children(section4);
			h23 = claim_element(section4_nodes, "H2", {});
			var h23_nodes = children(h23);
			a12 = claim_element(h23_nodes, "A", { href: true, id: true });
			var a12_nodes = children(a12);
			t100 = claim_text(a12_nodes, "Answering Them");
			a12_nodes.forEach(detach);
			h23_nodes.forEach(detach);
			t101 = claim_space(section4_nodes);
			p23 = claim_element(section4_nodes, "P", {});
			var p23_nodes = children(p23);
			t102 = claim_text(p23_nodes, "The above are questions that I asked, and I am going to answer them one by one in the future articles.");
			p23_nodes.forEach(detach);
			section4_nodes.forEach(detach);
			this.h();
		},
		h() {
			attr(a0, "href", "#motivation");
			attr(a1, "href", "#disclaimer");
			attr(a2, "href", "#asking-questions");
			attr(a3, "href", "#answering-them");
			attr(ul, "class", "sitemap");
			attr(ul, "id", "sitemap");
			attr(ul, "role", "navigation");
			attr(ul, "aria-label", "Table of Contents");
			attr(a4, "href", "#motivation");
			attr(a4, "id", "motivation");
			attr(a5, "href", "https://medium.com/@kamranahmedse");
			attr(a5, "rel", "nofollow");
			attr(a6, "href", "https://medium.com/tech-tajawal/modern-frontend-developer-in-2018-4c2072fa2b9c");
			attr(a6, "rel", "nofollow");
			attr(a7, "href", "#disclaimer");
			attr(a7, "id", "disclaimer");
			attr(a8, "href", "#asking-questions");
			attr(a8, "id", "asking-questions");
			attr(a9, "href", "https://stackoverflow.com/a/20435744/1513547");
			attr(a9, "rel", "nofollow");
			attr(a10, "href", "https://github.com/getify/You-Dont-Know-JS");
			attr(a10, "rel", "nofollow");
			attr(a11, "href", "https://developer.mozilla.org/en-US/docs/Glossary/Dynamic_typing");
			attr(a11, "rel", "nofollow");
			attr(a12, "href", "#answering-them");
			attr(a12, "id", "answering-them");
		},
		m(target, anchor) {
			insert(target, section0, anchor);
			append(section0, ul);
			append(ul, li0);
			append(li0, a0);
			append(a0, t0);
			append(ul, li1);
			append(li1, a1);
			append(a1, t1);
			append(ul, li2);
			append(li2, a2);
			append(a2, t2);
			append(ul, li3);
			append(li3, a3);
			append(a3, t3);
			insert(target, t4, anchor);
			insert(target, section1, anchor);
			append(section1, h20);
			append(h20, a4);
			append(a4, t5);
			append(section1, t6);
			append(section1, p0);
			append(p0, t7);
			append(p0, em0);
			append(em0, t8);
			append(p0, t9);
			append(section1, t10);
			append(section1, p1);
			append(p1, a5);
			append(a5, t11);
			append(p1, t12);
			append(p1, a6);
			append(a6, t13);
			append(p1, t14);
			append(section1, t15);
			append(section1, blockquote0);
			append(blockquote0, p2);
			append(p2, t16);
			append(section1, t17);
			append(section1, p3);
			append(p3, t18);
			insert(target, t19, anchor);
			insert(target, section2, anchor);
			append(section2, h21);
			append(h21, a7);
			append(a7, t20);
			append(section2, t21);
			append(section2, p4);
			append(p4, t22);
			append(section2, t23);
			append(section2, blockquote1);
			append(blockquote1, p5);
			append(p5, t24);
			append(section2, t25);
			append(section2, p6);
			append(p6, t26);
			append(section2, t27);
			append(section2, blockquote2);
			append(blockquote2, p7);
			append(p7, t28);
			append(section2, t29);
			append(section2, p8);
			append(p8, t30);
			append(section2, t31);
			append(section2, blockquote3);
			append(blockquote3, p9);
			append(p9, t32);
			insert(target, t33, anchor);
			insert(target, section3, anchor);
			append(section3, h22);
			append(h22, a8);
			append(a8, t34);
			append(section3, t35);
			append(section3, p10);
			append(p10, t36);
			append(section3, t37);
			append(section3, p11);
			append(p11, t38);
			append(section3, t39);
			append(section3, p12);
			append(p12, t40);
			append(section3, t41);
			append(section3, p13);
			append(p13, t42);
			append(p13, a9);
			append(a9, t43);
			append(p13, t44);
			append(section3, t45);
			append(section3, ol);
			append(ol, li4);
			append(li4, p14);
			append(p14, strong0);
			append(strong0, t46);
			append(p14, t47);
			append(p14, em1);
			append(em1, t48);
			append(p14, t49);
			append(ol, t50);
			append(ol, li5);
			append(li5, p15);
			append(p15, t51);
			append(p15, strong1);
			append(strong1, t52);
			append(p15, t53);
			append(p15, em2);
			append(em2, t54);
			append(p15, t55);
			append(ol, t56);
			append(ol, li6);
			append(li6, p16);
			append(p16, strong2);
			append(strong2, t57);
			append(p16, t58);
			append(p16, em3);
			append(em3, t59);
			append(p16, t60);
			append(p16, em4);
			append(em4, t61);
			append(p16, t62);
			append(ol, t63);
			append(ol, li7);
			append(li7, p17);
			append(p17, strong3);
			append(strong3, t64);
			append(p17, t65);
			append(ol, t66);
			append(ol, li8);
			append(li8, p18);
			append(p18, t67);
			append(p18, a10);
			append(a10, t68);
			append(p18, t69);
			append(ol, t70);
			append(ol, li9);
			append(li9, p19);
			append(p19, t71);
			append(p19, code0);
			append(code0, t72);
			append(p19, t73);
			append(p19, code1);
			append(code1, t74);
			append(p19, t75);
			append(p19, code2);
			append(code2, t76);
			append(p19, t77);
			append(p19, code3);
			append(code3, t78);
			append(p19, t79);
			append(p19, code4);
			append(code4, t80);
			append(p19, t81);
			append(p19, code5);
			append(code5, t82);
			append(p19, t83);
			append(p19, code6);
			append(code6, t84);
			append(p19, t85);
			append(p19, code7);
			append(code7, t86);
			append(p19, t87);
			append(p19, a11);
			append(a11, t88);
			append(p19, t89);
			append(ol, t90);
			append(ol, li10);
			append(li10, p20);
			append(p20, strong4);
			append(strong4, t91);
			append(p20, t92);
			append(ol, t93);
			append(ol, li11);
			append(li11, p21);
			append(p21, strong5);
			append(strong5, t94);
			append(p21, t95);
			append(ol, t96);
			append(ol, li12);
			append(li12, p22);
			append(p22, strong6);
			append(strong6, t97);
			append(p22, t98);
			insert(target, t99, anchor);
			insert(target, section4, anchor);
			append(section4, h23);
			append(h23, a12);
			append(a12, t100);
			append(section4, t101);
			append(section4, p23);
			append(p23, t102);
		},
		d(detaching) {
			if (detaching) detach(section0);
			if (detaching) detach(t4);
			if (detaching) detach(section1);
			if (detaching) detach(t19);
			if (detaching) detach(section2);
			if (detaching) detach(t33);
			if (detaching) detach(section3);
			if (detaching) detach(t99);
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
	"title": "Understand the frontend tools",
	"date": "2019-03-16T08:00:00Z",
	"description": "About the tools frontend developer used in 2019",
	"slug": "understand-the-frontend-tools",
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
