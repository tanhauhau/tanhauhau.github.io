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

var __build_img_webp__3 = "47830b248a76313c.webp";

var __build_img__3 = "47830b248a76313c.png";

var __build_img_webp__2 = "88f1e669536ed3b0.webp";

var __build_img__2 = "88f1e669536ed3b0.png";

var __build_img_webp__1 = "47830b248a76313c.webp";

var __build_img__1 = "47830b248a76313c.png";

var __build_img_webp__0 = "f67eed7cfc0548de.webp";

var __build_img__0 = "f67eed7cfc0548de.png";

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
					"@id": "https%3A%2F%2Flihautan.com%2Feslint-for-flow-explicit-type-argument-syntax",
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
			attr(meta11, "content", "https%3A%2F%2Flihautan.com%2Feslint-for-flow-explicit-type-argument-syntax");
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
							"@id": "https%3A%2F%2Flihautan.com%2Feslint-for-flow-explicit-type-argument-syntax",
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

/* content/blog/eslint-for-flow-explicit-type-argument-syntax/@@page-markup.svelte generated by Svelte v3.24.0 */

function create_default_slot(ctx) {
	let p0;
	let t0;
	let a0;
	let t1;
	let t2;
	let t3;
	let p1;
	let t4;
	let a1;
	let t5;
	let t6;
	let a2;
	let t7;
	let t8;
	let t9;
	let p2;
	let t10;
	let t11;
	let pre0;
	let raw0_value = `<code class="language-js">fooFunction<span class="token operator">&lt;</span>Bar<span class="token operator">></span><span class="token punctuation">(</span><span class="token number">1</span><span class="token punctuation">,</span> <span class="token number">2</span><span class="token punctuation">,</span> <span class="token number">3</span><span class="token punctuation">)</span><span class="token punctuation">;</span></code>` + "";
	let t12;
	let p3;
	let t13;
	let a3;
	let t14;
	let t15;
	let em;
	let t16;
	let t17;
	let t18;
	let pre1;
	let raw1_value = `<code class="language-js">fooFunction <span class="token operator">&lt;</span> Bar <span class="token operator">></span> <span class="token punctuation">(</span><span class="token number">1</span><span class="token punctuation">,</span> <span class="token number">2</span><span class="token punctuation">,</span> <span class="token number">3</span><span class="token punctuation">)</span><span class="token punctuation">;</span></code>` + "";
	let t19;
	let p4;
	let t20;
	let code0;
	let t21;
	let t22;
	let code1;
	let t23;
	let t24;
	let code2;
	let t25;
	let t26;
	let t27;
	let p5;
	let t28;
	let a4;
	let t29;
	let t30;
	let a5;
	let t31;
	let t32;
	let hr0;
	let t33;
	let p6;
	let t34;
	let a6;
	let t35;
	let t36;
	let t37;
	let p7;
	let picture0;
	let source0;
	let source1;
	let img0;
	let t38;
	let p8;
	let t39;
	let t40;
	let ul;
	let li0;
	let strong0;
	let t41;
	let t42;
	let code3;
	let t43;
	let t44;
	let code4;
	let t45;
	let t46;
	let a7;
	let t47;
	let t48;
	let t49;
	let li1;
	let strong1;
	let t50;
	let t51;
	let a8;
	let t52;
	let t53;
	let a9;
	let t54;
	let t55;
	let t56;
	let li2;
	let strong2;
	let t57;
	let t58;
	let strong3;
	let t59;
	let t60;
	let strong4;
	let t61;
	let t62;
	let t63;
	let li3;
	let strong5;
	let t64;
	let t65;
	let t66;
	let li4;
	let strong6;
	let t67;
	let t68;
	let t69;
	let hr1;
	let t70;
	let p9;
	let t71;
	let t72;
	let p10;
	let picture1;
	let source2;
	let source3;
	let img1;
	let t73;
	let p11;
	let t74;
	let t75;
	let p12;
	let picture2;
	let source4;
	let source5;
	let img2;
	let t76;
	let p13;
	let t77;
	let t78;
	let hr2;
	let t79;
	let p14;
	let strong7;
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
	let t88;
	let p15;
	let strong8;
	let t89;
	let t90;
	let a10;
	let t91;
	let t92;
	let code8;
	let t93;
	let t94;
	let code9;
	let t95;
	let t96;
	let code10;
	let t97;
	let t98;
	let code11;
	let t99;
	let t100;
	let code12;
	let t101;
	let t102;
	let code13;
	let t103;
	let t104;
	let code14;
	let t105;
	let t106;
	let code15;
	let t107;
	let t108;
	let code16;
	let t109;
	let t110;
	let t111;
	let hr3;
	let t112;
	let p16;
	let t113;
	let code17;
	let t114;
	let t115;
	let code18;
	let t116;
	let t117;
	let t118;
	let p17;
	let t119;
	let t120;
	let p18;
	let picture3;
	let source6;
	let source7;
	let img3;
	let t121;
	let p19;
	let t122;
	let code19;
	let t123;
	let t124;
	let a11;
	let t125;
	let t126;

	return {
		c() {
			p0 = element("p");
			t0 = text("Today ");
			a0 = element("a");
			t1 = text("Wei Gao");
			t2 = text(" posed an interesting question:");
			t3 = space();
			p1 = element("p");
			t4 = text("She was upgrading Flow to v0.85, ");
			a1 = element("a");
			t5 = text("which requires her to explicitly type the argument of the function call");
			t6 = text(". However, when she saved the file, our ");
			a2 = element("a");
			t7 = text("eslint-prettier");
			t8 = text(" automatically format the code into a weird syntax:");
			t9 = space();
			p2 = element("p");
			t10 = text("So, when she wrote:");
			t11 = space();
			pre0 = element("pre");
			t12 = space();
			p3 = element("p");
			t13 = text("With ");
			a3 = element("a");
			t14 = text("eslint-plugin-prettier");
			t15 = text(", eslint ");
			em = element("em");
			t16 = text("“fixed”");
			t17 = text(" the code into:");
			t18 = space();
			pre1 = element("pre");
			t19 = space();
			p4 = element("p");
			t20 = text("It felt like eslint sees ");
			code0 = element("code");
			t21 = text("<");
			t22 = text(" and ");
			code1 = element("code");
			t23 = text(">");
			t24 = text(" as the comparison operator, rather than ");
			code2 = element("code");
			t25 = text("<Type>");
			t26 = text(" as a whole!");
			t27 = space();
			p5 = element("p");
			t28 = text("To confirm with my hypothesis, I opened up my favourite tool for inspecting ");
			a4 = element("a");
			t29 = text("AST");
			t30 = text(": ");
			a5 = element("a");
			t31 = text("astexplorer.net");
			t32 = space();
			hr0 = element("hr");
			t33 = space();
			p6 = element("p");
			t34 = text("You can paste your code into ");
			a6 = element("a");
			t35 = text("astexplorer.net");
			t36 = text(" and see how different parser “sees” your code in terms of a AST (Abstract Syntax Tree).");
			t37 = space();
			p7 = element("p");
			picture0 = element("picture");
			source0 = element("source");
			source1 = element("source");
			img0 = element("img");
			t38 = space();
			p8 = element("p");
			t39 = text("As you can see from the picture above, you can choose from different parsers:");
			t40 = space();
			ul = element("ul");
			li0 = element("li");
			strong0 = element("strong");
			t41 = text("acorn");
			t42 = text(" — the parser used by webpack after the loaders, webpack uses acorn’s AST to find ");
			code3 = element("code");
			t43 = text("import");
			t44 = text(" and ");
			code4 = element("code");
			t45 = text("require()");
			t46 = text(" syntax to know generate the dependency tree of your project, as well as provide an entry for plugins like ");
			a7 = element("a");
			t47 = text("DefinePlugin");
			t48 = text(" to transform the transpiled code.");
			t49 = space();
			li1 = element("li");
			strong1 = element("strong");
			t50 = text("babylon");
			t51 = text("— the ");
			a8 = element("a");
			t52 = text("babel");
			t53 = text(" parser, now it’s called ");
			a9 = element("a");
			t54 = text("@babel/parser");
			t55 = text(".");
			t56 = space();
			li2 = element("li");
			strong2 = element("strong");
			t57 = text("flow");
			t58 = text(", ");
			strong3 = element("strong");
			t59 = text("typescript");
			t60 = text(", ");
			strong4 = element("strong");
			t61 = text("uglify-js");
			t62 = text("— the parsers that each of the library uses");
			t63 = space();
			li3 = element("li");
			strong5 = element("strong");
			t64 = text("esprima");
			t65 = text(" — the default eslint parser");
			t66 = space();
			li4 = element("li");
			strong6 = element("strong");
			t67 = text("babel-eslint");
			t68 = text(" — a wrapper of babel parser for eslint, which is also the one we used, because we have a ton of babel plugins configured, so by using babel-eslint we don’t have to reconfigure the same plugins for eslint.");
			t69 = space();
			hr1 = element("hr");
			t70 = space();
			p9 = element("p");
			t71 = text("So I copied our code into astexplorer, and selected the “flow” parser:");
			t72 = space();
			p10 = element("p");
			picture1 = element("picture");
			source2 = element("source");
			source3 = element("source");
			img1 = element("img");
			t73 = space();
			p11 = element("p");
			t74 = text("I can see the type annotation is being parsed as “TypeParameterInstantiation”, however when I changed the parser to “babel-eslint8”,");
			t75 = space();
			p12 = element("p");
			picture2 = element("picture");
			source4 = element("source");
			source5 = element("source");
			img2 = element("img");
			t76 = space();
			p13 = element("p");
			t77 = text("I get a Binary Expression and a SequenceExpression!");
			t78 = space();
			hr2 = element("hr");
			t79 = space();
			p14 = element("p");
			strong7 = element("strong");
			t80 = text("Binary Expression");
			t81 = text(" is a way to express logical expression and mathematical expression, eg: ");
			code5 = element("code");
			t82 = text("a + b");
			t83 = text(" , ");
			code6 = element("code");
			t84 = text("a && b");
			t85 = text(" , ");
			code7 = element("code");
			t86 = text("a <= b");
			t87 = text(", etc.");
			t88 = space();
			p15 = element("p");
			strong8 = element("strong");
			t89 = text("Sequence Expression");
			t90 = text(" on the other hand is something you don’t see people write that often, you can look up how it works in ");
			a10 = element("a");
			t91 = text("Comma operator (MDN)");
			t92 = text(", basically you can write expressions as a expression by joining them with a comma operator (");
			code8 = element("code");
			t93 = text(",");
			t94 = text("), and the expression returns the value of the last expression, eg: result = ");
			code9 = element("code");
			t95 = text("(a++, b++, c -= 2, d.push(e), --f)");
			t96 = text(", you increment ");
			code10 = element("code");
			t97 = text("a");
			t98 = text(" , ");
			code11 = element("code");
			t99 = text("b");
			t100 = text(" , decrement ");
			code12 = element("code");
			t101 = text("c");
			t102 = text(" by 2, and pushed ");
			code13 = element("code");
			t103 = text("e");
			t104 = text(" into ");
			code14 = element("code");
			t105 = text("d");
			t106 = text(" and decrement ");
			code15 = element("code");
			t107 = text("f");
			t108 = text(" and set result to the new value of ");
			code16 = element("code");
			t109 = text("f");
			t110 = text(". Wow, that’s a lot in one statement! It’s confusing to read, but you see this often in a minified code.");
			t111 = space();
			hr3 = element("hr");
			t112 = space();
			p16 = element("p");
			t113 = text("Now this explains why prettier will try to add space in between ");
			code17 = element("code");
			t114 = text("<");
			t115 = text(" and ");
			code18 = element("code");
			t116 = text(">");
			t117 = text(" .");
			t118 = space();
			p17 = element("p");
			t119 = text("I saw that there’s a babel-eslint9, and I gave it a try, and…");
			t120 = space();
			p18 = element("p");
			picture3 = element("picture");
			source6 = element("source");
			source7 = element("source");
			img3 = element("img");
			t121 = space();
			p19 = element("p");
			t122 = text("It seems like the bug was fixed on ");
			code19 = element("code");
			t123 = text("babel-eslint9");
			t124 = text(", so I plowed through the release notes of babel-eslint, and I found this ");
			a11 = element("a");
			t125 = text("merge commit");
			t126 = text(". So it seems like upgrading babel-eslint to v9 will solve the issue! 🎉");
			this.h();
		},
		l(nodes) {
			p0 = claim_element(nodes, "P", {});
			var p0_nodes = children(p0);
			t0 = claim_text(p0_nodes, "Today ");
			a0 = claim_element(p0_nodes, "A", { href: true, rel: true });
			var a0_nodes = children(a0);
			t1 = claim_text(a0_nodes, "Wei Gao");
			a0_nodes.forEach(detach);
			t2 = claim_text(p0_nodes, " posed an interesting question:");
			p0_nodes.forEach(detach);
			t3 = claim_space(nodes);
			p1 = claim_element(nodes, "P", {});
			var p1_nodes = children(p1);
			t4 = claim_text(p1_nodes, "She was upgrading Flow to v0.85, ");
			a1 = claim_element(p1_nodes, "A", { href: true, rel: true });
			var a1_nodes = children(a1);
			t5 = claim_text(a1_nodes, "which requires her to explicitly type the argument of the function call");
			a1_nodes.forEach(detach);
			t6 = claim_text(p1_nodes, ". However, when she saved the file, our ");
			a2 = claim_element(p1_nodes, "A", { href: true, rel: true });
			var a2_nodes = children(a2);
			t7 = claim_text(a2_nodes, "eslint-prettier");
			a2_nodes.forEach(detach);
			t8 = claim_text(p1_nodes, " automatically format the code into a weird syntax:");
			p1_nodes.forEach(detach);
			t9 = claim_space(nodes);
			p2 = claim_element(nodes, "P", {});
			var p2_nodes = children(p2);
			t10 = claim_text(p2_nodes, "So, when she wrote:");
			p2_nodes.forEach(detach);
			t11 = claim_space(nodes);
			pre0 = claim_element(nodes, "PRE", { class: true });
			var pre0_nodes = children(pre0);
			pre0_nodes.forEach(detach);
			t12 = claim_space(nodes);
			p3 = claim_element(nodes, "P", {});
			var p3_nodes = children(p3);
			t13 = claim_text(p3_nodes, "With ");
			a3 = claim_element(p3_nodes, "A", { href: true, rel: true });
			var a3_nodes = children(a3);
			t14 = claim_text(a3_nodes, "eslint-plugin-prettier");
			a3_nodes.forEach(detach);
			t15 = claim_text(p3_nodes, ", eslint ");
			em = claim_element(p3_nodes, "EM", {});
			var em_nodes = children(em);
			t16 = claim_text(em_nodes, "“fixed”");
			em_nodes.forEach(detach);
			t17 = claim_text(p3_nodes, " the code into:");
			p3_nodes.forEach(detach);
			t18 = claim_space(nodes);
			pre1 = claim_element(nodes, "PRE", { class: true });
			var pre1_nodes = children(pre1);
			pre1_nodes.forEach(detach);
			t19 = claim_space(nodes);
			p4 = claim_element(nodes, "P", {});
			var p4_nodes = children(p4);
			t20 = claim_text(p4_nodes, "It felt like eslint sees ");
			code0 = claim_element(p4_nodes, "CODE", {});
			var code0_nodes = children(code0);
			t21 = claim_text(code0_nodes, "<");
			code0_nodes.forEach(detach);
			t22 = claim_text(p4_nodes, " and ");
			code1 = claim_element(p4_nodes, "CODE", {});
			var code1_nodes = children(code1);
			t23 = claim_text(code1_nodes, ">");
			code1_nodes.forEach(detach);
			t24 = claim_text(p4_nodes, " as the comparison operator, rather than ");
			code2 = claim_element(p4_nodes, "CODE", {});
			var code2_nodes = children(code2);
			t25 = claim_text(code2_nodes, "<Type>");
			code2_nodes.forEach(detach);
			t26 = claim_text(p4_nodes, " as a whole!");
			p4_nodes.forEach(detach);
			t27 = claim_space(nodes);
			p5 = claim_element(nodes, "P", {});
			var p5_nodes = children(p5);
			t28 = claim_text(p5_nodes, "To confirm with my hypothesis, I opened up my favourite tool for inspecting ");
			a4 = claim_element(p5_nodes, "A", { href: true, rel: true });
			var a4_nodes = children(a4);
			t29 = claim_text(a4_nodes, "AST");
			a4_nodes.forEach(detach);
			t30 = claim_text(p5_nodes, ": ");
			a5 = claim_element(p5_nodes, "A", { href: true, rel: true });
			var a5_nodes = children(a5);
			t31 = claim_text(a5_nodes, "astexplorer.net");
			a5_nodes.forEach(detach);
			p5_nodes.forEach(detach);
			t32 = claim_space(nodes);
			hr0 = claim_element(nodes, "HR", {});
			t33 = claim_space(nodes);
			p6 = claim_element(nodes, "P", {});
			var p6_nodes = children(p6);
			t34 = claim_text(p6_nodes, "You can paste your code into ");
			a6 = claim_element(p6_nodes, "A", { href: true, rel: true });
			var a6_nodes = children(a6);
			t35 = claim_text(a6_nodes, "astexplorer.net");
			a6_nodes.forEach(detach);
			t36 = claim_text(p6_nodes, " and see how different parser “sees” your code in terms of a AST (Abstract Syntax Tree).");
			p6_nodes.forEach(detach);
			t37 = claim_space(nodes);
			p7 = claim_element(nodes, "P", {});
			var p7_nodes = children(p7);
			picture0 = claim_element(p7_nodes, "PICTURE", {});
			var picture0_nodes = children(picture0);
			source0 = claim_element(picture0_nodes, "SOURCE", { type: true, srcset: true });
			source1 = claim_element(picture0_nodes, "SOURCE", { type: true, srcset: true });

			img0 = claim_element(picture0_nodes, "IMG", {
				title: true,
				alt: true,
				"data-src": true,
				loading: true
			});

			picture0_nodes.forEach(detach);
			p7_nodes.forEach(detach);
			t38 = claim_space(nodes);
			p8 = claim_element(nodes, "P", {});
			var p8_nodes = children(p8);
			t39 = claim_text(p8_nodes, "As you can see from the picture above, you can choose from different parsers:");
			p8_nodes.forEach(detach);
			t40 = claim_space(nodes);
			ul = claim_element(nodes, "UL", {});
			var ul_nodes = children(ul);
			li0 = claim_element(ul_nodes, "LI", {});
			var li0_nodes = children(li0);
			strong0 = claim_element(li0_nodes, "STRONG", {});
			var strong0_nodes = children(strong0);
			t41 = claim_text(strong0_nodes, "acorn");
			strong0_nodes.forEach(detach);
			t42 = claim_text(li0_nodes, " — the parser used by webpack after the loaders, webpack uses acorn’s AST to find ");
			code3 = claim_element(li0_nodes, "CODE", {});
			var code3_nodes = children(code3);
			t43 = claim_text(code3_nodes, "import");
			code3_nodes.forEach(detach);
			t44 = claim_text(li0_nodes, " and ");
			code4 = claim_element(li0_nodes, "CODE", {});
			var code4_nodes = children(code4);
			t45 = claim_text(code4_nodes, "require()");
			code4_nodes.forEach(detach);
			t46 = claim_text(li0_nodes, " syntax to know generate the dependency tree of your project, as well as provide an entry for plugins like ");
			a7 = claim_element(li0_nodes, "A", { href: true, rel: true });
			var a7_nodes = children(a7);
			t47 = claim_text(a7_nodes, "DefinePlugin");
			a7_nodes.forEach(detach);
			t48 = claim_text(li0_nodes, " to transform the transpiled code.");
			li0_nodes.forEach(detach);
			t49 = claim_space(ul_nodes);
			li1 = claim_element(ul_nodes, "LI", {});
			var li1_nodes = children(li1);
			strong1 = claim_element(li1_nodes, "STRONG", {});
			var strong1_nodes = children(strong1);
			t50 = claim_text(strong1_nodes, "babylon");
			strong1_nodes.forEach(detach);
			t51 = claim_text(li1_nodes, "— the ");
			a8 = claim_element(li1_nodes, "A", { href: true, rel: true });
			var a8_nodes = children(a8);
			t52 = claim_text(a8_nodes, "babel");
			a8_nodes.forEach(detach);
			t53 = claim_text(li1_nodes, " parser, now it’s called ");
			a9 = claim_element(li1_nodes, "A", { href: true, rel: true });
			var a9_nodes = children(a9);
			t54 = claim_text(a9_nodes, "@babel/parser");
			a9_nodes.forEach(detach);
			t55 = claim_text(li1_nodes, ".");
			li1_nodes.forEach(detach);
			t56 = claim_space(ul_nodes);
			li2 = claim_element(ul_nodes, "LI", {});
			var li2_nodes = children(li2);
			strong2 = claim_element(li2_nodes, "STRONG", {});
			var strong2_nodes = children(strong2);
			t57 = claim_text(strong2_nodes, "flow");
			strong2_nodes.forEach(detach);
			t58 = claim_text(li2_nodes, ", ");
			strong3 = claim_element(li2_nodes, "STRONG", {});
			var strong3_nodes = children(strong3);
			t59 = claim_text(strong3_nodes, "typescript");
			strong3_nodes.forEach(detach);
			t60 = claim_text(li2_nodes, ", ");
			strong4 = claim_element(li2_nodes, "STRONG", {});
			var strong4_nodes = children(strong4);
			t61 = claim_text(strong4_nodes, "uglify-js");
			strong4_nodes.forEach(detach);
			t62 = claim_text(li2_nodes, "— the parsers that each of the library uses");
			li2_nodes.forEach(detach);
			t63 = claim_space(ul_nodes);
			li3 = claim_element(ul_nodes, "LI", {});
			var li3_nodes = children(li3);
			strong5 = claim_element(li3_nodes, "STRONG", {});
			var strong5_nodes = children(strong5);
			t64 = claim_text(strong5_nodes, "esprima");
			strong5_nodes.forEach(detach);
			t65 = claim_text(li3_nodes, " — the default eslint parser");
			li3_nodes.forEach(detach);
			t66 = claim_space(ul_nodes);
			li4 = claim_element(ul_nodes, "LI", {});
			var li4_nodes = children(li4);
			strong6 = claim_element(li4_nodes, "STRONG", {});
			var strong6_nodes = children(strong6);
			t67 = claim_text(strong6_nodes, "babel-eslint");
			strong6_nodes.forEach(detach);
			t68 = claim_text(li4_nodes, " — a wrapper of babel parser for eslint, which is also the one we used, because we have a ton of babel plugins configured, so by using babel-eslint we don’t have to reconfigure the same plugins for eslint.");
			li4_nodes.forEach(detach);
			ul_nodes.forEach(detach);
			t69 = claim_space(nodes);
			hr1 = claim_element(nodes, "HR", {});
			t70 = claim_space(nodes);
			p9 = claim_element(nodes, "P", {});
			var p9_nodes = children(p9);
			t71 = claim_text(p9_nodes, "So I copied our code into astexplorer, and selected the “flow” parser:");
			p9_nodes.forEach(detach);
			t72 = claim_space(nodes);
			p10 = claim_element(nodes, "P", {});
			var p10_nodes = children(p10);
			picture1 = claim_element(p10_nodes, "PICTURE", {});
			var picture1_nodes = children(picture1);
			source2 = claim_element(picture1_nodes, "SOURCE", { type: true, srcset: true });
			source3 = claim_element(picture1_nodes, "SOURCE", { type: true, srcset: true });

			img1 = claim_element(picture1_nodes, "IMG", {
				title: true,
				alt: true,
				"data-src": true,
				loading: true
			});

			picture1_nodes.forEach(detach);
			p10_nodes.forEach(detach);
			t73 = claim_space(nodes);
			p11 = claim_element(nodes, "P", {});
			var p11_nodes = children(p11);
			t74 = claim_text(p11_nodes, "I can see the type annotation is being parsed as “TypeParameterInstantiation”, however when I changed the parser to “babel-eslint8”,");
			p11_nodes.forEach(detach);
			t75 = claim_space(nodes);
			p12 = claim_element(nodes, "P", {});
			var p12_nodes = children(p12);
			picture2 = claim_element(p12_nodes, "PICTURE", {});
			var picture2_nodes = children(picture2);
			source4 = claim_element(picture2_nodes, "SOURCE", { type: true, srcset: true });
			source5 = claim_element(picture2_nodes, "SOURCE", { type: true, srcset: true });

			img2 = claim_element(picture2_nodes, "IMG", {
				title: true,
				alt: true,
				"data-src": true,
				loading: true
			});

			picture2_nodes.forEach(detach);
			p12_nodes.forEach(detach);
			t76 = claim_space(nodes);
			p13 = claim_element(nodes, "P", {});
			var p13_nodes = children(p13);
			t77 = claim_text(p13_nodes, "I get a Binary Expression and a SequenceExpression!");
			p13_nodes.forEach(detach);
			t78 = claim_space(nodes);
			hr2 = claim_element(nodes, "HR", {});
			t79 = claim_space(nodes);
			p14 = claim_element(nodes, "P", {});
			var p14_nodes = children(p14);
			strong7 = claim_element(p14_nodes, "STRONG", {});
			var strong7_nodes = children(strong7);
			t80 = claim_text(strong7_nodes, "Binary Expression");
			strong7_nodes.forEach(detach);
			t81 = claim_text(p14_nodes, " is a way to express logical expression and mathematical expression, eg: ");
			code5 = claim_element(p14_nodes, "CODE", {});
			var code5_nodes = children(code5);
			t82 = claim_text(code5_nodes, "a + b");
			code5_nodes.forEach(detach);
			t83 = claim_text(p14_nodes, " , ");
			code6 = claim_element(p14_nodes, "CODE", {});
			var code6_nodes = children(code6);
			t84 = claim_text(code6_nodes, "a && b");
			code6_nodes.forEach(detach);
			t85 = claim_text(p14_nodes, " , ");
			code7 = claim_element(p14_nodes, "CODE", {});
			var code7_nodes = children(code7);
			t86 = claim_text(code7_nodes, "a <= b");
			code7_nodes.forEach(detach);
			t87 = claim_text(p14_nodes, ", etc.");
			p14_nodes.forEach(detach);
			t88 = claim_space(nodes);
			p15 = claim_element(nodes, "P", {});
			var p15_nodes = children(p15);
			strong8 = claim_element(p15_nodes, "STRONG", {});
			var strong8_nodes = children(strong8);
			t89 = claim_text(strong8_nodes, "Sequence Expression");
			strong8_nodes.forEach(detach);
			t90 = claim_text(p15_nodes, " on the other hand is something you don’t see people write that often, you can look up how it works in ");
			a10 = claim_element(p15_nodes, "A", { href: true, rel: true });
			var a10_nodes = children(a10);
			t91 = claim_text(a10_nodes, "Comma operator (MDN)");
			a10_nodes.forEach(detach);
			t92 = claim_text(p15_nodes, ", basically you can write expressions as a expression by joining them with a comma operator (");
			code8 = claim_element(p15_nodes, "CODE", {});
			var code8_nodes = children(code8);
			t93 = claim_text(code8_nodes, ",");
			code8_nodes.forEach(detach);
			t94 = claim_text(p15_nodes, "), and the expression returns the value of the last expression, eg: result = ");
			code9 = claim_element(p15_nodes, "CODE", {});
			var code9_nodes = children(code9);
			t95 = claim_text(code9_nodes, "(a++, b++, c -= 2, d.push(e), --f)");
			code9_nodes.forEach(detach);
			t96 = claim_text(p15_nodes, ", you increment ");
			code10 = claim_element(p15_nodes, "CODE", {});
			var code10_nodes = children(code10);
			t97 = claim_text(code10_nodes, "a");
			code10_nodes.forEach(detach);
			t98 = claim_text(p15_nodes, " , ");
			code11 = claim_element(p15_nodes, "CODE", {});
			var code11_nodes = children(code11);
			t99 = claim_text(code11_nodes, "b");
			code11_nodes.forEach(detach);
			t100 = claim_text(p15_nodes, " , decrement ");
			code12 = claim_element(p15_nodes, "CODE", {});
			var code12_nodes = children(code12);
			t101 = claim_text(code12_nodes, "c");
			code12_nodes.forEach(detach);
			t102 = claim_text(p15_nodes, " by 2, and pushed ");
			code13 = claim_element(p15_nodes, "CODE", {});
			var code13_nodes = children(code13);
			t103 = claim_text(code13_nodes, "e");
			code13_nodes.forEach(detach);
			t104 = claim_text(p15_nodes, " into ");
			code14 = claim_element(p15_nodes, "CODE", {});
			var code14_nodes = children(code14);
			t105 = claim_text(code14_nodes, "d");
			code14_nodes.forEach(detach);
			t106 = claim_text(p15_nodes, " and decrement ");
			code15 = claim_element(p15_nodes, "CODE", {});
			var code15_nodes = children(code15);
			t107 = claim_text(code15_nodes, "f");
			code15_nodes.forEach(detach);
			t108 = claim_text(p15_nodes, " and set result to the new value of ");
			code16 = claim_element(p15_nodes, "CODE", {});
			var code16_nodes = children(code16);
			t109 = claim_text(code16_nodes, "f");
			code16_nodes.forEach(detach);
			t110 = claim_text(p15_nodes, ". Wow, that’s a lot in one statement! It’s confusing to read, but you see this often in a minified code.");
			p15_nodes.forEach(detach);
			t111 = claim_space(nodes);
			hr3 = claim_element(nodes, "HR", {});
			t112 = claim_space(nodes);
			p16 = claim_element(nodes, "P", {});
			var p16_nodes = children(p16);
			t113 = claim_text(p16_nodes, "Now this explains why prettier will try to add space in between ");
			code17 = claim_element(p16_nodes, "CODE", {});
			var code17_nodes = children(code17);
			t114 = claim_text(code17_nodes, "<");
			code17_nodes.forEach(detach);
			t115 = claim_text(p16_nodes, " and ");
			code18 = claim_element(p16_nodes, "CODE", {});
			var code18_nodes = children(code18);
			t116 = claim_text(code18_nodes, ">");
			code18_nodes.forEach(detach);
			t117 = claim_text(p16_nodes, " .");
			p16_nodes.forEach(detach);
			t118 = claim_space(nodes);
			p17 = claim_element(nodes, "P", {});
			var p17_nodes = children(p17);
			t119 = claim_text(p17_nodes, "I saw that there’s a babel-eslint9, and I gave it a try, and…");
			p17_nodes.forEach(detach);
			t120 = claim_space(nodes);
			p18 = claim_element(nodes, "P", {});
			var p18_nodes = children(p18);
			picture3 = claim_element(p18_nodes, "PICTURE", {});
			var picture3_nodes = children(picture3);
			source6 = claim_element(picture3_nodes, "SOURCE", { type: true, srcset: true });
			source7 = claim_element(picture3_nodes, "SOURCE", { type: true, srcset: true });

			img3 = claim_element(picture3_nodes, "IMG", {
				title: true,
				alt: true,
				"data-src": true,
				loading: true
			});

			picture3_nodes.forEach(detach);
			p18_nodes.forEach(detach);
			t121 = claim_space(nodes);
			p19 = claim_element(nodes, "P", {});
			var p19_nodes = children(p19);
			t122 = claim_text(p19_nodes, "It seems like the bug was fixed on ");
			code19 = claim_element(p19_nodes, "CODE", {});
			var code19_nodes = children(code19);
			t123 = claim_text(code19_nodes, "babel-eslint9");
			code19_nodes.forEach(detach);
			t124 = claim_text(p19_nodes, ", so I plowed through the release notes of babel-eslint, and I found this ");
			a11 = claim_element(p19_nodes, "A", { href: true, rel: true });
			var a11_nodes = children(a11);
			t125 = claim_text(a11_nodes, "merge commit");
			a11_nodes.forEach(detach);
			t126 = claim_text(p19_nodes, ". So it seems like upgrading babel-eslint to v9 will solve the issue! 🎉");
			p19_nodes.forEach(detach);
			this.h();
		},
		h() {
			attr(a0, "href", "https://dev.wgao19.cc/");
			attr(a0, "rel", "nofollow");
			attr(a1, "href", "https://medium.com/flow-type/asking-for-required-annotations-64d4f9c1edf8");
			attr(a1, "rel", "nofollow");
			attr(a2, "href", "https://github.com/prettier/prettier");
			attr(a2, "rel", "nofollow");
			attr(pre0, "class", "language-js");
			attr(a3, "href", "https://github.com/prettier/eslint-plugin-prettier");
			attr(a3, "rel", "nofollow");
			attr(pre1, "class", "language-js");
			attr(a4, "href", "https://en.wikipedia.org/wiki/Abstract_syntax_tree");
			attr(a4, "rel", "nofollow");
			attr(a5, "href", "https://astexplorer.net/");
			attr(a5, "rel", "nofollow");
			attr(a6, "href", "https://astexplorer.net/");
			attr(a6, "rel", "nofollow");
			attr(source0, "type", "image/webp");
			attr(source0, "srcset", __build_img_webp__0);
			attr(source1, "type", "image/jpeg");
			attr(source1, "srcset", __build_img__0);
			attr(img0, "title", "null");
			attr(img0, "alt", "You can choose different a parser!");
			attr(img0, "data-src", __build_img__0);
			attr(img0, "loading", "lazy");
			attr(a7, "href", "https://webpack.js.org/plugins/define-plugin/");
			attr(a7, "rel", "nofollow");
			attr(a8, "href", "https://github.com/babel/babel/");
			attr(a8, "rel", "nofollow");
			attr(a9, "href", "https://babeljs.io/docs/en/babel-parser");
			attr(a9, "rel", "nofollow");
			attr(source2, "type", "image/webp");
			attr(source2, "srcset", __build_img_webp__1);
			attr(source3, "type", "image/jpeg");
			attr(source3, "srcset", __build_img__1);
			attr(img1, "title", "null");
			attr(img1, "alt", "flow ast");
			attr(img1, "data-src", __build_img__1);
			attr(img1, "loading", "lazy");
			attr(source4, "type", "image/webp");
			attr(source4, "srcset", __build_img_webp__2);
			attr(source5, "type", "image/jpeg");
			attr(source5, "srcset", __build_img__2);
			attr(img2, "title", "null");
			attr(img2, "alt", "babel eslint 8 ast");
			attr(img2, "data-src", __build_img__2);
			attr(img2, "loading", "lazy");
			attr(a10, "href", "https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Operators/Comma_Operator");
			attr(a10, "rel", "nofollow");
			attr(source6, "type", "image/webp");
			attr(source6, "srcset", __build_img_webp__3);
			attr(source7, "type", "image/jpeg");
			attr(source7, "srcset", __build_img__3);
			attr(img3, "title", "null");
			attr(img3, "alt", "babel eslint 9 ast");
			attr(img3, "data-src", __build_img__3);
			attr(img3, "loading", "lazy");
			attr(a11, "href", "https://github.com/babel/babel-eslint/pull/444");
			attr(a11, "rel", "nofollow");
		},
		m(target, anchor) {
			insert(target, p0, anchor);
			append(p0, t0);
			append(p0, a0);
			append(a0, t1);
			append(p0, t2);
			insert(target, t3, anchor);
			insert(target, p1, anchor);
			append(p1, t4);
			append(p1, a1);
			append(a1, t5);
			append(p1, t6);
			append(p1, a2);
			append(a2, t7);
			append(p1, t8);
			insert(target, t9, anchor);
			insert(target, p2, anchor);
			append(p2, t10);
			insert(target, t11, anchor);
			insert(target, pre0, anchor);
			pre0.innerHTML = raw0_value;
			insert(target, t12, anchor);
			insert(target, p3, anchor);
			append(p3, t13);
			append(p3, a3);
			append(a3, t14);
			append(p3, t15);
			append(p3, em);
			append(em, t16);
			append(p3, t17);
			insert(target, t18, anchor);
			insert(target, pre1, anchor);
			pre1.innerHTML = raw1_value;
			insert(target, t19, anchor);
			insert(target, p4, anchor);
			append(p4, t20);
			append(p4, code0);
			append(code0, t21);
			append(p4, t22);
			append(p4, code1);
			append(code1, t23);
			append(p4, t24);
			append(p4, code2);
			append(code2, t25);
			append(p4, t26);
			insert(target, t27, anchor);
			insert(target, p5, anchor);
			append(p5, t28);
			append(p5, a4);
			append(a4, t29);
			append(p5, t30);
			append(p5, a5);
			append(a5, t31);
			insert(target, t32, anchor);
			insert(target, hr0, anchor);
			insert(target, t33, anchor);
			insert(target, p6, anchor);
			append(p6, t34);
			append(p6, a6);
			append(a6, t35);
			append(p6, t36);
			insert(target, t37, anchor);
			insert(target, p7, anchor);
			append(p7, picture0);
			append(picture0, source0);
			append(picture0, source1);
			append(picture0, img0);
			insert(target, t38, anchor);
			insert(target, p8, anchor);
			append(p8, t39);
			insert(target, t40, anchor);
			insert(target, ul, anchor);
			append(ul, li0);
			append(li0, strong0);
			append(strong0, t41);
			append(li0, t42);
			append(li0, code3);
			append(code3, t43);
			append(li0, t44);
			append(li0, code4);
			append(code4, t45);
			append(li0, t46);
			append(li0, a7);
			append(a7, t47);
			append(li0, t48);
			append(ul, t49);
			append(ul, li1);
			append(li1, strong1);
			append(strong1, t50);
			append(li1, t51);
			append(li1, a8);
			append(a8, t52);
			append(li1, t53);
			append(li1, a9);
			append(a9, t54);
			append(li1, t55);
			append(ul, t56);
			append(ul, li2);
			append(li2, strong2);
			append(strong2, t57);
			append(li2, t58);
			append(li2, strong3);
			append(strong3, t59);
			append(li2, t60);
			append(li2, strong4);
			append(strong4, t61);
			append(li2, t62);
			append(ul, t63);
			append(ul, li3);
			append(li3, strong5);
			append(strong5, t64);
			append(li3, t65);
			append(ul, t66);
			append(ul, li4);
			append(li4, strong6);
			append(strong6, t67);
			append(li4, t68);
			insert(target, t69, anchor);
			insert(target, hr1, anchor);
			insert(target, t70, anchor);
			insert(target, p9, anchor);
			append(p9, t71);
			insert(target, t72, anchor);
			insert(target, p10, anchor);
			append(p10, picture1);
			append(picture1, source2);
			append(picture1, source3);
			append(picture1, img1);
			insert(target, t73, anchor);
			insert(target, p11, anchor);
			append(p11, t74);
			insert(target, t75, anchor);
			insert(target, p12, anchor);
			append(p12, picture2);
			append(picture2, source4);
			append(picture2, source5);
			append(picture2, img2);
			insert(target, t76, anchor);
			insert(target, p13, anchor);
			append(p13, t77);
			insert(target, t78, anchor);
			insert(target, hr2, anchor);
			insert(target, t79, anchor);
			insert(target, p14, anchor);
			append(p14, strong7);
			append(strong7, t80);
			append(p14, t81);
			append(p14, code5);
			append(code5, t82);
			append(p14, t83);
			append(p14, code6);
			append(code6, t84);
			append(p14, t85);
			append(p14, code7);
			append(code7, t86);
			append(p14, t87);
			insert(target, t88, anchor);
			insert(target, p15, anchor);
			append(p15, strong8);
			append(strong8, t89);
			append(p15, t90);
			append(p15, a10);
			append(a10, t91);
			append(p15, t92);
			append(p15, code8);
			append(code8, t93);
			append(p15, t94);
			append(p15, code9);
			append(code9, t95);
			append(p15, t96);
			append(p15, code10);
			append(code10, t97);
			append(p15, t98);
			append(p15, code11);
			append(code11, t99);
			append(p15, t100);
			append(p15, code12);
			append(code12, t101);
			append(p15, t102);
			append(p15, code13);
			append(code13, t103);
			append(p15, t104);
			append(p15, code14);
			append(code14, t105);
			append(p15, t106);
			append(p15, code15);
			append(code15, t107);
			append(p15, t108);
			append(p15, code16);
			append(code16, t109);
			append(p15, t110);
			insert(target, t111, anchor);
			insert(target, hr3, anchor);
			insert(target, t112, anchor);
			insert(target, p16, anchor);
			append(p16, t113);
			append(p16, code17);
			append(code17, t114);
			append(p16, t115);
			append(p16, code18);
			append(code18, t116);
			append(p16, t117);
			insert(target, t118, anchor);
			insert(target, p17, anchor);
			append(p17, t119);
			insert(target, t120, anchor);
			insert(target, p18, anchor);
			append(p18, picture3);
			append(picture3, source6);
			append(picture3, source7);
			append(picture3, img3);
			insert(target, t121, anchor);
			insert(target, p19, anchor);
			append(p19, t122);
			append(p19, code19);
			append(code19, t123);
			append(p19, t124);
			append(p19, a11);
			append(a11, t125);
			append(p19, t126);
		},
		p: noop,
		d(detaching) {
			if (detaching) detach(p0);
			if (detaching) detach(t3);
			if (detaching) detach(p1);
			if (detaching) detach(t9);
			if (detaching) detach(p2);
			if (detaching) detach(t11);
			if (detaching) detach(pre0);
			if (detaching) detach(t12);
			if (detaching) detach(p3);
			if (detaching) detach(t18);
			if (detaching) detach(pre1);
			if (detaching) detach(t19);
			if (detaching) detach(p4);
			if (detaching) detach(t27);
			if (detaching) detach(p5);
			if (detaching) detach(t32);
			if (detaching) detach(hr0);
			if (detaching) detach(t33);
			if (detaching) detach(p6);
			if (detaching) detach(t37);
			if (detaching) detach(p7);
			if (detaching) detach(t38);
			if (detaching) detach(p8);
			if (detaching) detach(t40);
			if (detaching) detach(ul);
			if (detaching) detach(t69);
			if (detaching) detach(hr1);
			if (detaching) detach(t70);
			if (detaching) detach(p9);
			if (detaching) detach(t72);
			if (detaching) detach(p10);
			if (detaching) detach(t73);
			if (detaching) detach(p11);
			if (detaching) detach(t75);
			if (detaching) detach(p12);
			if (detaching) detach(t76);
			if (detaching) detach(p13);
			if (detaching) detach(t78);
			if (detaching) detach(hr2);
			if (detaching) detach(t79);
			if (detaching) detach(p14);
			if (detaching) detach(t88);
			if (detaching) detach(p15);
			if (detaching) detach(t111);
			if (detaching) detach(hr3);
			if (detaching) detach(t112);
			if (detaching) detach(p16);
			if (detaching) detach(t118);
			if (detaching) detach(p17);
			if (detaching) detach(t120);
			if (detaching) detach(p18);
			if (detaching) detach(t121);
			if (detaching) detach(p19);
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
	"title": "My eslint doesn’t work with for flow 0.85’s explicit type argument syntax",
	"date": "2019-01-17T08:00:00Z",
	"description": "and how I figured out why.",
	"slug": "eslint-for-flow-explicit-type-argument-syntax",
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
