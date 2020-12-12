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

var __build_img_webp__3 = "2a11a55ff329649a.webp";

var __build_img__3 = "2a11a55ff329649a.png";

var __build_img_webp__2 = "e6f3300cabbe4833.webp";

var __build_img__2 = "e6f3300cabbe4833.jpg";

var __build_img_webp__1 = "4a14502ad5c07ae1.webp";

var __build_img__1 = "4a14502ad5c07ae1.png";

var __build_img_webp__0 = "0a1a991f55fd3342.webp";

var __build_img__0 = "0a1a991f55fd3342.png";

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
					"@id": "https%3A%2F%2Flihautan.com%2Fbuilding-a-simplified-webpack-clone",
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
			attr(meta11, "content", "https%3A%2F%2Flihautan.com%2Fbuilding-a-simplified-webpack-clone");
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
							"@id": "https%3A%2F%2Flihautan.com%2Fbuilding-a-simplified-webpack-clone",
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

/* content/blog/building-a-simplified-webpack-clone/@@page-markup.svelte generated by Svelte v3.24.0 */

function create_default_slot(ctx) {
	let section0;
	let ul3;
	let li0;
	let a0;
	let t0;
	let li1;
	let a1;
	let t1;
	let li2;
	let a2;
	let t2;
	let ul0;
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
	let ul2;
	let li10;
	let a10;
	let t10;
	let ul1;
	let li11;
	let a11;
	let t11;
	let li12;
	let a12;
	let t12;
	let li13;
	let a13;
	let t13;
	let li14;
	let a14;
	let t14;
	let t15;
	let section1;
	let h20;
	let a15;
	let t16;
	let t17;
	let p0;
	let t18;
	let t19;
	let p1;
	let t20;
	let strong;
	let t21;
	let t22;
	let t23;
	let section2;
	let h21;
	let a16;
	let t24;
	let t25;
	let ul4;
	let li15;
	let t26;
	let a17;
	let t27;
	let t28;
	let a18;
	let t29;
	let t30;
	let li16;
	let t31;
	let a19;
	let t32;
	let t33;
	let a20;
	let t34;
	let t35;
	let li17;
	let t36;
	let a21;
	let t37;
	let t38;
	let section3;
	let h22;
	let a22;
	let t39;
	let t40;
	let section4;
	let h30;
	let a23;
	let t41;
	let t42;
	let p2;
	let t43;
	let t44;
	let p3;
	let t45;
	let t46;
	let p4;
	let picture0;
	let source0;
	let source1;
	let img0;
	let t47;
	let p5;
	let t48;
	let t49;
	let p6;
	let t50;
	let t51;
	let ul5;
	let li18;
	let t52;
	let t53;
	let li19;
	let t54;
	let t55;
	let li20;
	let t56;
	let t57;
	let p7;
	let t58;
	let t59;
	let p8;
	let picture1;
	let source2;
	let source3;
	let img1;
	let t60;
	let p9;
	let t61;
	let t62;
	let section5;
	let h31;
	let a24;
	let t63;
	let t64;
	let p10;
	let t65;
	let t66;
	let section6;
	let h32;
	let a25;
	let t67;
	let t68;
	let pre0;

	let raw0_value = `<code class="language-js"><span class="token keyword">import</span> calculate <span class="token keyword">from</span> <span class="token string">'./calculate'</span><span class="token punctuation">;</span>
<span class="token keyword">import</span> <span class="token punctuation">&#123;</span> measure<span class="token punctuation">,</span> <span class="token constant">UNITS</span> <span class="token punctuation">&#125;</span> <span class="token keyword">from</span> <span class="token string">'../measurements'</span><span class="token punctuation">;</span>
<span class="token keyword">import</span> formula <span class="token keyword">from</span> <span class="token string">'formulas'</span><span class="token punctuation">;</span>

<span class="token keyword">const</span> oneCm <span class="token operator">=</span> <span class="token function">measure</span><span class="token punctuation">(</span><span class="token number">1</span><span class="token punctuation">,</span> <span class="token constant">UNITS</span><span class="token punctuation">.</span><span class="token constant">CM</span><span class="token punctuation">)</span><span class="token punctuation">;</span>
<span class="token keyword">const</span> result <span class="token operator">=</span> <span class="token function">calculate</span><span class="token punctuation">(</span>formula<span class="token punctuation">,</span> oneCm<span class="token punctuation">)</span><span class="token punctuation">;</span></code>` + "";

	let t69;
	let p11;
	let t70;
	let t71;
	let ul6;
	let li21;
	let code0;
	let t72;
	let t73;
	let li22;
	let code1;
	let t74;
	let t75;
	let li23;
	let code2;
	let t76;
	let t77;
	let p12;
	let t78;
	let t79;
	let p13;
	let t80;
	let t81;
	let p14;
	let t82;
	let t83;
	let ul7;
	let li24;
	let code3;
	let t84;
	let t85;
	let t86;
	let li25;
	let code4;
	let t87;
	let t88;
	let t89;
	let p15;
	let picture2;
	let source4;
	let source5;
	let img2;
	let t90;
	let p16;
	let t91;
	let t92;
	let ul8;
	let li26;
	let t93;
	let a26;
	let t94;
	let t95;
	let li27;
	let t96;
	let a27;
	let t97;
	let t98;
	let li28;
	let t99;
	let a28;
	let t100;
	let t101;
	let li29;
	let t102;
	let a29;
	let t103;
	let t104;
	let pre1;

	let raw1_value = `<code class="language-js"><span class="token comment">// babel</span>
<span class="token keyword">const</span> babel <span class="token operator">=</span> <span class="token function">require</span><span class="token punctuation">(</span><span class="token string">'@babel/core'</span><span class="token punctuation">)</span><span class="token punctuation">;</span>
babel<span class="token punctuation">.</span><span class="token function">parseSync</span><span class="token punctuation">(</span>code<span class="token punctuation">)</span><span class="token punctuation">;</span>

<span class="token comment">// acorn</span>
<span class="token keyword">const</span> acorn <span class="token operator">=</span> <span class="token function">require</span><span class="token punctuation">(</span><span class="token string">'acorn'</span><span class="token punctuation">)</span><span class="token punctuation">;</span>
acorn<span class="token punctuation">.</span><span class="token function">parse</span><span class="token punctuation">(</span>code<span class="token punctuation">,</span> <span class="token punctuation">&#123;</span> ecmaVersion<span class="token punctuation">:</span> <span class="token number">2020</span><span class="token punctuation">,</span> sourceType<span class="token punctuation">:</span> <span class="token string">'module'</span> <span class="token punctuation">&#125;</span><span class="token punctuation">)</span><span class="token punctuation">;</span>

<span class="token comment">// esprima</span>
<span class="token keyword">const</span> esprima <span class="token operator">=</span> <span class="token function">require</span><span class="token punctuation">(</span><span class="token string">'esprima'</span><span class="token punctuation">)</span><span class="token punctuation">;</span>
esprima<span class="token punctuation">.</span><span class="token function">parseScript</span><span class="token punctuation">(</span>code<span class="token punctuation">)</span><span class="token punctuation">;</span>

<span class="token comment">// if you just need the import &amp; export</span>
<span class="token comment">// es-module-lexer is blazing fast, it is written in c, and loaded through web-assembly</span>
<span class="token comment">// is what powers vite for parsing dependencies</span>
<span class="token keyword">const</span> <span class="token punctuation">&#123;</span> init<span class="token punctuation">,</span> parse <span class="token punctuation">&#125;</span> <span class="token operator">=</span> <span class="token function">require</span><span class="token punctuation">(</span><span class="token string">'es-module-lexer'</span><span class="token punctuation">)</span><span class="token punctuation">;</span>
<span class="token keyword">await</span> init<span class="token punctuation">;</span>
<span class="token keyword">const</span> <span class="token punctuation">[</span>imports<span class="token punctuation">,</span> exports<span class="token punctuation">]</span> <span class="token operator">=</span> <span class="token function">parse</span><span class="token punctuation">(</span>code<span class="token punctuation">)</span><span class="token punctuation">;</span></code>` + "";

	let t105;
	let p17;
	let t106;
	let t107;
	let ul9;
	let li30;
	let t108;
	let a30;
	let t109;
	let t110;
	let li31;
	let t111;
	let a31;
	let t112;
	let t113;
	let li32;
	let t114;
	let a32;
	let t115;
	let t116;
	let pre2;

	let raw2_value = `<code class="language-js"><span class="token comment">// babel</span>
<span class="token keyword">const</span> traverse <span class="token operator">=</span> <span class="token function">require</span><span class="token punctuation">(</span><span class="token string">'@babel/traverse'</span><span class="token punctuation">)</span><span class="token punctuation">.</span>default<span class="token punctuation">;</span>
<span class="token function">traverse</span><span class="token punctuation">(</span>ast<span class="token punctuation">,</span> <span class="token punctuation">&#123;</span>
  <span class="token function">ImportDeclaration</span><span class="token punctuation">(</span><span class="token parameter">node</span><span class="token punctuation">)</span> <span class="token punctuation">&#123;</span><span class="token punctuation">&#125;</span><span class="token punctuation">,</span>
<span class="token punctuation">&#125;</span><span class="token punctuation">)</span><span class="token punctuation">;</span>

<span class="token comment">// acorn</span>
walk<span class="token punctuation">.</span><span class="token function">simple</span><span class="token punctuation">(</span>ast<span class="token punctuation">,</span> <span class="token punctuation">&#123;</span>
  <span class="token function">ImportDeclaration</span><span class="token punctuation">(</span><span class="token parameter">node</span><span class="token punctuation">)</span> <span class="token punctuation">&#123;</span><span class="token punctuation">&#125;</span><span class="token punctuation">,</span>
<span class="token punctuation">&#125;</span><span class="token punctuation">)</span><span class="token punctuation">;</span>

<span class="token comment">// estree-walker</span>
<span class="token keyword">const</span> <span class="token punctuation">&#123;</span> walk <span class="token punctuation">&#125;</span> <span class="token operator">=</span> <span class="token function">require</span><span class="token punctuation">(</span><span class="token string">'estree-walker'</span><span class="token punctuation">)</span><span class="token punctuation">;</span>
<span class="token function">walk</span><span class="token punctuation">(</span>ast<span class="token punctuation">,</span> <span class="token punctuation">&#123;</span>
  <span class="token function">enter</span><span class="token punctuation">(</span><span class="token parameter">node</span><span class="token punctuation">)</span> <span class="token punctuation">&#123;</span><span class="token punctuation">&#125;</span><span class="token punctuation">,</span>
  <span class="token function">leave</span><span class="token punctuation">(</span><span class="token parameter">node</span><span class="token punctuation">)</span> <span class="token punctuation">&#123;</span><span class="token punctuation">&#125;</span><span class="token punctuation">,</span>
<span class="token punctuation">&#125;</span><span class="token punctuation">)</span><span class="token punctuation">;</span></code>` + "";

	let t117;
	let p18;
	let t118;
	let t119;
	let ul13;
	let li35;
	let t120;
	let ul10;
	let li33;
	let a33;
	let t121;
	let t122;
	let li34;
	let a34;
	let t123;
	let t124;
	let li37;
	let t125;
	let ul11;
	let li36;
	let a35;
	let t126;
	let t127;
	let li40;
	let t128;
	let ul12;
	let li38;
	let a36;
	let t129;
	let t130;
	let li39;
	let a37;
	let t131;
	let t132;
	let section7;
	let h33;
	let a38;
	let t133;
	let t134;
	let p19;
	let t135;
	let t136;
	let ul14;
	let li41;
	let t137;
	let t138;
	let li42;
	let t139;
	let t140;
	let pre3;

	let raw3_value = `<code class="language-js"><span class="token function">resolve</span><span class="token punctuation">(</span><span class="token string">'a/b/app.js'</span><span class="token punctuation">,</span> <span class="token string">'./calculate.js'</span><span class="token punctuation">)</span><span class="token punctuation">;</span>
<span class="token comment">// a/b/calculate.js</span>
<span class="token function">resolve</span><span class="token punctuation">(</span><span class="token string">'a/b/app.js'</span><span class="token punctuation">,</span> <span class="token string">'../measurements.js'</span><span class="token punctuation">)</span><span class="token punctuation">;</span>
<span class="token comment">// a/measurements.js</span>
<span class="token function">resolve</span><span class="token punctuation">(</span><span class="token string">'a/b/app.js'</span><span class="token punctuation">,</span> <span class="token string">'formulas'</span><span class="token punctuation">)</span><span class="token punctuation">;</span>
<span class="token comment">// node_modules/formulas/src/index.js</span></code>` + "";

	let t141;
	let p20;
	let t142;
	let a39;
	let t143;
	let t144;
	let p21;
	let t145;
	let t146;
	let p22;
	let t147;
	let t148;
	let ul15;
	let li43;
	let t149;
	let t150;
	let li44;
	let t151;
	let t152;
	let li45;
	let t153;
	let t154;
	let p23;
	let picture3;
	let source6;
	let source7;
	let img3;
	let t155;
	let p24;
	let t156;
	let t157;
	let ul16;
	let li46;
	let t158;
	let a40;
	let code5;
	let t159;
	let t160;
	let t161;
	let li47;
	let t162;
	let a41;
	let t163;
	let t164;
	let section8;
	let h34;
	let a42;
	let t165;
	let t166;
	let section9;
	let h35;
	let a43;
	let t167;
	let t168;
	let p25;
	let a44;
	let t169;
	let t170;
	let p26;
	let t171;
	let t172;
	let p27;
	let t173;
	let t174;
	let ul17;
	let li48;
	let code6;
	let t175;
	let t176;
	let li49;
	let code7;
	let t177;
	let t178;
	let t179;
	let li50;
	let code8;
	let t180;
	let t181;
	let code9;
	let t182;
	let t183;
	let code10;
	let t184;
	let t185;
	let t186;
	let p28;
	let t187;
	let t188;
	let ul18;
	let li51;
	let code11;
	let t189;
	let t190;
	let t191;
	let li52;
	let code12;
	let t192;
	let t193;
	let t194;
	let p29;
	let t195;
	let t196;
	let pre4;
	let raw4_value = `<code class="language-js">moduleCFromModuleA <span class="token operator">===</span> moduleCFromModuleB<span class="token punctuation">;</span></code>` + "";
	let t197;
	let p30;
	let t198;
	let t199;
	let section10;
	let h23;
	let a45;
	let t200;
	let t201;
	let p31;
	let t202;
	let t203;
	let p32;
	let t204;
	let t205;
	let p33;
	let t206;
	let t207;
	let pre5;

	let raw5_value = `<code class="language-js"><span class="token comment">// circle.js</span>
<span class="token keyword">const</span> <span class="token constant">PI</span> <span class="token operator">=</span> <span class="token number">3.141</span><span class="token punctuation">;</span>
<span class="token keyword">export</span> <span class="token keyword">default</span> <span class="token keyword">function</span> <span class="token function">area</span><span class="token punctuation">(</span><span class="token parameter">radius</span><span class="token punctuation">)</span> <span class="token punctuation">&#123;</span>
  <span class="token keyword">return</span> <span class="token constant">PI</span> <span class="token operator">*</span> radius <span class="token operator">*</span> radius<span class="token punctuation">;</span>
<span class="token punctuation">&#125;</span>

<span class="token comment">// square.js</span>
<span class="token keyword">export</span> <span class="token keyword">default</span> <span class="token keyword">function</span> <span class="token function">area</span><span class="token punctuation">(</span><span class="token parameter">side</span><span class="token punctuation">)</span> <span class="token punctuation">&#123;</span>
  <span class="token keyword">return</span> side <span class="token operator">*</span> side<span class="token punctuation">;</span>
<span class="token punctuation">&#125;</span>

<span class="token comment">// app.js</span>
<span class="token keyword">import</span> squareArea <span class="token keyword">from</span> <span class="token string">'./square'</span><span class="token punctuation">;</span>
<span class="token keyword">import</span> circleArea <span class="token keyword">from</span> <span class="token string">'./circle'</span><span class="token punctuation">;</span>

console<span class="token punctuation">.</span><span class="token function">log</span><span class="token punctuation">(</span><span class="token string">'Area of square: '</span><span class="token punctuation">,</span> <span class="token function">squareArea</span><span class="token punctuation">(</span><span class="token number">5</span><span class="token punctuation">)</span><span class="token punctuation">)</span><span class="token punctuation">;</span>
console<span class="token punctuation">.</span><span class="token function">log</span><span class="token punctuation">(</span><span class="token string">'Area of circle'</span><span class="token punctuation">,</span> <span class="token function">circleArea</span><span class="token punctuation">(</span><span class="token number">5</span><span class="token punctuation">)</span><span class="token punctuation">)</span><span class="token punctuation">;</span></code>` + "";

	let t208;
	let section11;
	let h36;
	let a46;
	let t209;
	let t210;
	let ul19;
	let li53;
	let t211;
	let t212;
	let li54;
	let t213;
	let t214;
	let li55;
	let t215;
	let t216;
	let li56;
	let t217;
	let t218;
	let pre6;

	let raw6_value = `<code class="language-js"><span class="token comment">// webpack-bundle.js</span>
<span class="token keyword">const</span> modules <span class="token operator">=</span> <span class="token punctuation">&#123;</span>
  <span class="token string">'circle.js'</span><span class="token punctuation">:</span> <span class="token keyword">function</span><span class="token punctuation">(</span><span class="token parameter">__exports<span class="token punctuation">,</span> __getModule</span><span class="token punctuation">)</span> <span class="token punctuation">&#123;</span>
    <span class="token keyword">const</span> <span class="token constant">PI</span> <span class="token operator">=</span> <span class="token number">3.141</span><span class="token punctuation">;</span>
    __exports<span class="token punctuation">.</span><span class="token function-variable function">default</span> <span class="token operator">=</span> <span class="token keyword">function</span> <span class="token function">area</span><span class="token punctuation">(</span><span class="token parameter">radius</span><span class="token punctuation">)</span> <span class="token punctuation">&#123;</span>
      <span class="token keyword">return</span> <span class="token constant">PI</span> <span class="token operator">*</span> radius <span class="token operator">*</span> radius<span class="token punctuation">;</span>
    <span class="token punctuation">&#125;</span>
  <span class="token punctuation">&#125;</span><span class="token punctuation">,</span>
  <span class="token string">'square.js'</span><span class="token punctuation">:</span> <span class="token keyword">function</span><span class="token punctuation">(</span><span class="token parameter">__exports<span class="token punctuation">,</span> __getModule</span><span class="token punctuation">)</span> <span class="token punctuation">&#123;</span>
    __exports<span class="token punctuation">.</span><span class="token function-variable function">default</span> <span class="token operator">=</span> <span class="token keyword">function</span> <span class="token function">area</span><span class="token punctuation">(</span><span class="token parameter">side</span><span class="token punctuation">)</span> <span class="token punctuation">&#123;</span>
      <span class="token keyword">return</span> side <span class="token operator">*</span> side<span class="token punctuation">;</span>
    <span class="token punctuation">&#125;</span>
  <span class="token punctuation">&#125;</span><span class="token punctuation">,</span>
  <span class="token string">'app.js'</span><span class="token punctuation">:</span> <span class="token keyword">function</span><span class="token punctuation">(</span><span class="token parameter">__exports<span class="token punctuation">,</span> __getModule</span><span class="token punctuation">)</span> <span class="token punctuation">&#123;</span>
    <span class="token keyword">const</span> squareArea <span class="token operator">=</span> <span class="token function">__getModule</span><span class="token punctuation">(</span><span class="token string">'square.js'</span><span class="token punctuation">)</span><span class="token punctuation">.</span>default<span class="token punctuation">;</span>
    <span class="token keyword">const</span> circleArea <span class="token operator">=</span> <span class="token function">__getModule</span><span class="token punctuation">(</span><span class="token string">'circle.js'</span><span class="token punctuation">)</span><span class="token punctuation">.</span>default<span class="token punctuation">;</span>
    console<span class="token punctuation">.</span><span class="token function">log</span><span class="token punctuation">(</span><span class="token string">'Area of square: '</span><span class="token punctuation">,</span> <span class="token function">squareArea</span><span class="token punctuation">(</span><span class="token number">5</span><span class="token punctuation">)</span><span class="token punctuation">)</span>
    console<span class="token punctuation">.</span><span class="token function">log</span><span class="token punctuation">(</span><span class="token string">'Area of circle'</span><span class="token punctuation">,</span> <span class="token function">circleArea</span><span class="token punctuation">(</span><span class="token number">5</span><span class="token punctuation">)</span><span class="token punctuation">)</span>
  <span class="token punctuation">&#125;</span>
<span class="token punctuation">&#125;</span>
<span class="token function">webpackRuntime</span><span class="token punctuation">(</span><span class="token punctuation">&#123;</span>
  modules<span class="token punctuation">,</span>
  entry<span class="token punctuation">:</span> <span class="token string">'app.js'</span>
<span class="token punctuation">&#125;</span><span class="token punctuation">)</span><span class="token punctuation">;</span></code>` + "";

	let t219;
	let section12;
	let h4;
	let a47;
	let t220;
	let t221;
	let ul20;
	let li57;
	let t222;
	let t223;
	let li58;
	let t224;
	let t225;
	let li59;
	let t226;
	let t227;
	let li60;
	let t228;
	let t229;
	let pre7;

	let raw7_value = `<code class="language-js"><span class="token comment">// rollup-bundle.js</span>
<span class="token keyword">const</span> <span class="token constant">PI</span> <span class="token operator">=</span> <span class="token number">3.141</span><span class="token punctuation">;</span>

<span class="token keyword">function</span> <span class="token function">circle$area</span><span class="token punctuation">(</span><span class="token parameter">radius</span><span class="token punctuation">)</span> <span class="token punctuation">&#123;</span>
    <span class="token keyword">return</span> <span class="token constant">PI</span> <span class="token operator">*</span> radius <span class="token operator">*</span> radius<span class="token punctuation">;</span>
<span class="token punctuation">&#125;</span>
<span class="token keyword">function</span> <span class="token function">square$area</span><span class="token punctuation">(</span><span class="token parameter">side</span><span class="token punctuation">)</span> <span class="token punctuation">&#123;</span>
    <span class="token keyword">return</span> side <span class="token operator">*</span> side<span class="token punctuation">;</span>
<span class="token punctuation">&#125;</span>

console<span class="token punctuation">.</span><span class="token function">log</span><span class="token punctuation">(</span><span class="token string">'Area of square: '</span><span class="token punctuation">,</span> <span class="token function">square$area</span><span class="token punctuation">(</span><span class="token number">5</span><span class="token punctuation">)</span><span class="token punctuation">)</span><span class="token punctuation">;</span>
console<span class="token punctuation">.</span><span class="token function">log</span><span class="token punctuation">(</span><span class="token string">'Area of circle'</span><span class="token punctuation">,</span> <span class="token function">circle$area</span><span class="token punctuation">(</span><span class="token number">5</span><span class="token punctuation">)</span><span class="token punctuation">)</span><span class="token punctuation">;</span></code>` + "";

	let t230;
	let section13;
	let h37;
	let a48;
	let t231;
	let t232;
	let ul21;
	let li61;
	let p34;
	let t233;
	let t234;
	let li62;
	let p35;
	let t235;
	let t236;
	let li63;
	let p36;
	let t237;
	let a49;
	let t238;
	let t239;
	let li64;
	let p37;
	let t240;
	let a50;
	let t241;
	let t242;
	let section14;
	let h38;
	let a51;
	let t243;
	let t244;
	let p38;
	let a52;
	let t245;
	let t246;
	let p39;
	let t247;
	let t248;
	let p40;
	let t249;
	let t250;
	let pre8;

	let raw8_value = `<code class="language-js"><span class="token comment">// a.js</span>
<span class="token keyword">export</span> <span class="token operator">*</span> <span class="token keyword">as</span> b <span class="token keyword">from</span> <span class="token string">'./b'</span><span class="token punctuation">;</span>
<span class="token keyword">export</span> <span class="token operator">*</span> <span class="token keyword">from</span> <span class="token string">'./c'</span><span class="token punctuation">;</span>
<span class="token keyword">export</span> <span class="token punctuation">&#123;</span> d <span class="token punctuation">&#125;</span> <span class="token keyword">from</span> <span class="token string">'./d'</span><span class="token punctuation">;</span>

<span class="token comment">// main.js</span>
<span class="token keyword">import</span> <span class="token operator">*</span> <span class="token keyword">as</span> a <span class="token keyword">from</span> <span class="token string">'./a'</span><span class="token punctuation">;</span>

console<span class="token punctuation">.</span><span class="token function">log</span><span class="token punctuation">(</span>a<span class="token punctuation">)</span><span class="token punctuation">;</span></code>` + "";

	let t251;
	let p41;
	let t252;
	let t253;
	let pre9;

	let raw9_value = `<code class="language-js"><span class="token comment">// a.js</span>
<span class="token keyword">import</span> <span class="token string">'./c'</span><span class="token punctuation">;</span>

<span class="token comment">// b.js</span>
<span class="token keyword">import</span> <span class="token string">'./c'</span><span class="token punctuation">;</span>

<span class="token comment">// c.js</span>
console<span class="token punctuation">.</span><span class="token function">log</span><span class="token punctuation">(</span><span class="token string">'c.js'</span><span class="token punctuation">)</span><span class="token punctuation">;</span>

<span class="token comment">// main.js</span>
<span class="token keyword">import</span> <span class="token string">'./a'</span><span class="token punctuation">;</span>
<span class="token keyword">import</span> <span class="token string">'./b'</span><span class="token punctuation">;</span></code>` + "";

	let t254;
	let p42;
	let t255;
	let code13;
	let t256;
	let t257;
	let code14;
	let t258;
	let t259;
	let code15;
	let t260;
	let t261;
	let t262;
	let pre10;

	let raw10_value = `<code class="language-js"><span class="token comment">// a.js</span>
<span class="token keyword">import</span> <span class="token punctuation">&#123;</span> b <span class="token punctuation">&#125;</span> <span class="token keyword">from</span> <span class="token string">'./b'</span><span class="token punctuation">;</span>
<span class="token keyword">import</span> <span class="token punctuation">&#123;</span> c <span class="token punctuation">&#125;</span> <span class="token keyword">from</span> <span class="token string">'./c'</span><span class="token punctuation">;</span>

<span class="token keyword">export</span> <span class="token keyword">const</span> a <span class="token operator">=</span> <span class="token string">'a'</span><span class="token punctuation">;</span>

<span class="token function">setTimeout</span><span class="token punctuation">(</span><span class="token punctuation">(</span><span class="token punctuation">)</span> <span class="token operator">=></span> <span class="token punctuation">&#123;</span>
  console<span class="token punctuation">.</span><span class="token function">log</span><span class="token punctuation">(</span><span class="token template-string"><span class="token template-punctuation string">&#96;</span><span class="token string">a.js | b=</span><span class="token interpolation"><span class="token interpolation-punctuation punctuation">$&#123;</span>b<span class="token interpolation-punctuation punctuation">&#125;</span></span><span class="token string"> | c=</span><span class="token interpolation"><span class="token interpolation-punctuation punctuation">$&#123;</span>c<span class="token interpolation-punctuation punctuation">&#125;</span></span><span class="token template-punctuation string">&#96;</span></span><span class="token punctuation">)</span><span class="token punctuation">;</span>
<span class="token punctuation">&#125;</span><span class="token punctuation">)</span><span class="token punctuation">;</span>

<span class="token comment">// b.js</span>
<span class="token keyword">import</span> <span class="token punctuation">&#123;</span> a <span class="token punctuation">&#125;</span> <span class="token keyword">from</span> <span class="token string">'./a'</span><span class="token punctuation">;</span>
<span class="token keyword">import</span> <span class="token punctuation">&#123;</span> c <span class="token punctuation">&#125;</span> <span class="token keyword">from</span> <span class="token string">'./c'</span><span class="token punctuation">;</span>

<span class="token keyword">export</span> <span class="token keyword">const</span> b <span class="token operator">=</span> <span class="token string">'b'</span><span class="token punctuation">;</span>

<span class="token function">setTimeout</span><span class="token punctuation">(</span><span class="token punctuation">(</span><span class="token punctuation">)</span> <span class="token operator">=></span> <span class="token punctuation">&#123;</span>
  console<span class="token punctuation">.</span><span class="token function">log</span><span class="token punctuation">(</span><span class="token template-string"><span class="token template-punctuation string">&#96;</span><span class="token string">b.js | a=</span><span class="token interpolation"><span class="token interpolation-punctuation punctuation">$&#123;</span>a<span class="token interpolation-punctuation punctuation">&#125;</span></span><span class="token string"> | c=</span><span class="token interpolation"><span class="token interpolation-punctuation punctuation">$&#123;</span>c<span class="token interpolation-punctuation punctuation">&#125;</span></span><span class="token template-punctuation string">&#96;</span></span><span class="token punctuation">)</span><span class="token punctuation">;</span>
<span class="token punctuation">&#125;</span><span class="token punctuation">)</span><span class="token punctuation">;</span>

<span class="token comment">// c.js</span>
<span class="token keyword">import</span> <span class="token punctuation">&#123;</span> a <span class="token punctuation">&#125;</span> <span class="token keyword">from</span> <span class="token string">'./a'</span><span class="token punctuation">;</span>
<span class="token keyword">import</span> <span class="token punctuation">&#123;</span> b <span class="token punctuation">&#125;</span> <span class="token keyword">from</span> <span class="token string">'./b'</span><span class="token punctuation">;</span>

<span class="token keyword">export</span> <span class="token keyword">const</span> c <span class="token operator">=</span> <span class="token string">'c'</span><span class="token punctuation">;</span>

<span class="token function">setTimeout</span><span class="token punctuation">(</span><span class="token punctuation">(</span><span class="token punctuation">)</span> <span class="token operator">=></span> <span class="token punctuation">&#123;</span>
  console<span class="token punctuation">.</span><span class="token function">log</span><span class="token punctuation">(</span><span class="token template-string"><span class="token template-punctuation string">&#96;</span><span class="token string">c.js | a=</span><span class="token interpolation"><span class="token interpolation-punctuation punctuation">$&#123;</span>a<span class="token interpolation-punctuation punctuation">&#125;</span></span><span class="token string"> | b=</span><span class="token interpolation"><span class="token interpolation-punctuation punctuation">$&#123;</span>b<span class="token interpolation-punctuation punctuation">&#125;</span></span><span class="token template-punctuation string">&#96;</span></span><span class="token punctuation">)</span><span class="token punctuation">;</span>
<span class="token punctuation">&#125;</span><span class="token punctuation">)</span><span class="token punctuation">;</span>

<span class="token comment">// main.js</span>
<span class="token keyword">import</span> <span class="token punctuation">&#123;</span> a <span class="token punctuation">&#125;</span> <span class="token keyword">from</span> <span class="token string">'./a'</span><span class="token punctuation">;</span>
<span class="token keyword">import</span> <span class="token punctuation">&#123;</span> b <span class="token punctuation">&#125;</span> <span class="token keyword">from</span> <span class="token string">'./b'</span><span class="token punctuation">;</span>
<span class="token keyword">import</span> <span class="token punctuation">&#123;</span> c <span class="token punctuation">&#125;</span> <span class="token keyword">from</span> <span class="token string">'./c'</span><span class="token punctuation">;</span>

<span class="token function">setTimeout</span><span class="token punctuation">(</span><span class="token punctuation">(</span><span class="token punctuation">)</span> <span class="token operator">=></span> <span class="token punctuation">&#123;</span>
  console<span class="token punctuation">.</span><span class="token function">log</span><span class="token punctuation">(</span><span class="token template-string"><span class="token template-punctuation string">&#96;</span><span class="token string">main.js | a=</span><span class="token interpolation"><span class="token interpolation-punctuation punctuation">$&#123;</span>a<span class="token interpolation-punctuation punctuation">&#125;</span></span><span class="token string"> | b=</span><span class="token interpolation"><span class="token interpolation-punctuation punctuation">$&#123;</span>b<span class="token interpolation-punctuation punctuation">&#125;</span></span><span class="token string"> | c=</span><span class="token interpolation"><span class="token interpolation-punctuation punctuation">$&#123;</span>c<span class="token interpolation-punctuation punctuation">&#125;</span></span><span class="token template-punctuation string">&#96;</span></span><span class="token punctuation">)</span><span class="token punctuation">;</span>
<span class="token punctuation">&#125;</span><span class="token punctuation">)</span><span class="token punctuation">;</span></code>` + "";

	let t263;
	let p43;
	let t264;
	let t265;
	let pre11;

	let raw11_value = `<code class="language-js"><span class="token comment">// a.js</span>
<span class="token keyword">let</span> a <span class="token operator">=</span> <span class="token string">'a'</span><span class="token punctuation">;</span>

<span class="token keyword">export</span> <span class="token punctuation">&#123;</span> a<span class="token punctuation">,</span> b <span class="token punctuation">&#125;</span><span class="token punctuation">;</span>

<span class="token keyword">let</span> b <span class="token operator">=</span> <span class="token string">'b'</span><span class="token punctuation">;</span>

<span class="token comment">// main.js</span>
<span class="token keyword">import</span> <span class="token punctuation">&#123;</span> a<span class="token punctuation">,</span> b <span class="token punctuation">&#125;</span> <span class="token keyword">from</span> <span class="token string">'./a'</span><span class="token punctuation">;</span>

console<span class="token punctuation">.</span><span class="token function">log</span><span class="token punctuation">(</span><span class="token string">'a = '</span> <span class="token operator">+</span> a<span class="token punctuation">)</span><span class="token punctuation">;</span>
console<span class="token punctuation">.</span><span class="token function">log</span><span class="token punctuation">(</span><span class="token string">'b = '</span> <span class="token operator">+</span> b<span class="token punctuation">)</span><span class="token punctuation">;</span></code>` + "";

	let t266;
	let p44;
	let t267;
	let code16;
	let t268;
	let t269;
	let t270;
	let pre12;

	let raw12_value = `<code class="language-js"><span class="token comment">// data.js</span>
<span class="token keyword">export</span> <span class="token keyword">let</span> count <span class="token operator">=</span> <span class="token number">1</span><span class="token punctuation">;</span>

<span class="token keyword">export</span> <span class="token keyword">function</span> <span class="token function">increment</span><span class="token punctuation">(</span><span class="token punctuation">)</span> <span class="token punctuation">&#123;</span>
  count<span class="token operator">++</span><span class="token punctuation">;</span>
<span class="token punctuation">&#125;</span>

<span class="token comment">// a.js</span>
<span class="token keyword">import</span> <span class="token punctuation">&#123;</span> count<span class="token punctuation">,</span> increment <span class="token punctuation">&#125;</span> <span class="token keyword">from</span> <span class="token string">'./data'</span><span class="token punctuation">;</span>

console<span class="token punctuation">.</span><span class="token function">log</span><span class="token punctuation">(</span><span class="token string">'count = '</span> <span class="token operator">+</span> count<span class="token punctuation">)</span><span class="token punctuation">;</span>
<span class="token function">increment</span><span class="token punctuation">(</span><span class="token punctuation">)</span><span class="token punctuation">;</span>
console<span class="token punctuation">.</span><span class="token function">log</span><span class="token punctuation">(</span><span class="token string">'count = '</span> <span class="token operator">+</span> count<span class="token punctuation">)</span><span class="token punctuation">;</span>

<span class="token comment">// b.js</span>
<span class="token keyword">import</span> <span class="token punctuation">&#123;</span> count<span class="token punctuation">,</span> increment <span class="token punctuation">&#125;</span> <span class="token keyword">from</span> <span class="token string">'./data'</span><span class="token punctuation">;</span>

console<span class="token punctuation">.</span><span class="token function">log</span><span class="token punctuation">(</span><span class="token string">'count = '</span> <span class="token operator">+</span> count<span class="token punctuation">)</span><span class="token punctuation">;</span>
<span class="token function">increment</span><span class="token punctuation">(</span><span class="token punctuation">)</span><span class="token punctuation">;</span>
console<span class="token punctuation">.</span><span class="token function">log</span><span class="token punctuation">(</span><span class="token string">'count = '</span> <span class="token operator">+</span> count<span class="token punctuation">)</span><span class="token punctuation">;</span>

<span class="token comment">// main.js</span>
<span class="token keyword">import</span> <span class="token string">'./a'</span><span class="token punctuation">;</span>
<span class="token keyword">import</span> <span class="token string">'./b'</span><span class="token punctuation">;</span></code>` + "";

	let t271;
	let p45;
	let t272;
	let t273;
	let section15;
	let h39;
	let a53;
	let t274;
	let t275;
	let p46;
	let t276;
	let a54;
	let t277;
	let t278;
	let a55;
	let t279;
	let t280;

	return {
		c() {
			section0 = element("section");
			ul3 = element("ul");
			li0 = element("li");
			a0 = element("a");
			t0 = text("Background");
			li1 = element("li");
			a1 = element("a");
			t1 = text("Prior Art");
			li2 = element("li");
			a2 = element("a");
			t2 = text("Week 1 - Resolving");
			ul0 = element("ul");
			li3 = element("li");
			a3 = element("a");
			t3 = text("Why module bundler?");
			li4 = element("li");
			a4 = element("a");
			t4 = text("1. We start from an entry file.");
			li5 = element("li");
			a5 = element("a");
			t5 = text("2. We read the file and determine what is being imported into this file");
			li6 = element("li");
			a6 = element("a");
			t6 = text("3. Now knowing what are the names you are importing from, you need to figure out their actual file path");
			li7 = element("li");
			a7 = element("a");
			t7 = text("4️⃣ After you figured the file path you're importing from, for each of the file, 🔁 repeat step 2️⃣ until no more new files to be found.");
			li8 = element("li");
			a8 = element("a");
			t8 = text("Assignment");
			li9 = element("li");
			a9 = element("a");
			t9 = text("Week 2 - Bundling");
			ul2 = element("ul");
			li10 = element("li");
			a10 = element("a");
			t10 = text("🔭 Observation: Bundle using webpack");
			ul1 = element("ul");
			li11 = element("li");
			a11 = element("a");
			t11 = text("🔭 Observation: Bundle using rollup");
			li12 = element("li");
			a12 = element("a");
			t12 = text("📤 Output target of bundling");
			li13 = element("li");
			a13 = element("a");
			t13 = text("Assignment");
			li14 = element("li");
			a14 = element("a");
			t14 = text("🔨 Manipulating AST");
			t15 = space();
			section1 = element("section");
			h20 = element("h2");
			a15 = element("a");
			t16 = text("Background");
			t17 = space();
			p0 = element("p");
			t18 = text("We are trying out a new form of our weekly sharing, which is interest group-based.");
			t19 = space();
			p1 = element("p");
			t20 = text("I am hosting the ");
			strong = element("strong");
			t21 = text("\"Building a simplified webpack clone\"");
			t22 = text(" interest group, which lasted 8 weeks, and every week, we will cover 1 concept of webpack and an assignment to implement that concept ourselves.");
			t23 = space();
			section2 = element("section");
			h21 = element("h2");
			a16 = element("a");
			t24 = text("Prior Art");
			t25 = space();
			ul4 = element("ul");
			li15 = element("li");
			t26 = text("📺 ");
			a17 = element("a");
			t27 = text("Tobias Koppers");
			t28 = text(" - bundling live by hand - ");
			a18 = element("a");
			t29 = text("https://youtube.com/watch?v=UNMkLHzofQI");
			t30 = space();
			li16 = element("li");
			t31 = text("📺 ");
			a19 = element("a");
			t32 = text("Ronen Amiel");
			t33 = text(" - build your own webpack - ");
			a20 = element("a");
			t34 = text("https://youtube.com/watch?v=Gc9-7PBqOC8");
			t35 = space();
			li17 = element("li");
			t36 = text("📖 adam kelly - ");
			a21 = element("a");
			t37 = text("https://freecodecamp.org/news/lets-learn-how-module-bundlers-work-and-then-write-one-ourselves-b2e3fe6c88ae/");
			t38 = space();
			section3 = element("section");
			h22 = element("h2");
			a22 = element("a");
			t39 = text("Week 1 - Resolving");
			t40 = space();
			section4 = element("section");
			h30 = element("h3");
			a23 = element("a");
			t41 = text("Why module bundler?");
			t42 = space();
			p2 = element("p");
			t43 = text("We love writing small modular JS files, but that shouldn't impact the users.");
			t44 = space();
			p3 = element("p");
			t45 = text("Traditionally with limit on number of request connection, 🐌 slow internet speed, we want to combine all the code into 1 file -> 1 network request");
			t46 = space();
			p4 = element("p");
			picture0 = element("picture");
			source0 = element("source");
			source1 = element("source");
			img0 = element("img");
			t47 = space();
			p5 = element("p");
			t48 = text("🕰 Traditionally, we concatenate the source files into 1 big output file.");
			t49 = space();
			p6 = element("p");
			t50 = text("But that begs the question");
			t51 = space();
			ul5 = element("ul");
			li18 = element("li");
			t52 = text("❓ what should be the order of concatenation (files may depend on each other) ?");
			t53 = space();
			li19 = element("li");
			t54 = text("❓ what if there's var naming conflict across files?");
			t55 = space();
			li20 = element("li");
			t56 = text("❓ what if there's unused file?");
			t57 = space();
			p7 = element("p");
			t58 = text("💡 That's why we need a module system to define the relationship among the JS modules");
			t59 = space();
			p8 = element("p");
			picture1 = element("picture");
			source2 = element("source");
			source3 = element("source");
			img1 = element("img");
			t60 = space();
			p9 = element("p");
			t61 = text("So now, let's take a look how we can start building a module dependency graph");
			t62 = space();
			section5 = element("section");
			h31 = element("h3");
			a24 = element("a");
			t63 = text("1. We start from an entry file.");
			t64 = space();
			p10 = element("p");
			t65 = text("This is the starting point of the application");
			t66 = space();
			section6 = element("section");
			h32 = element("h3");
			a25 = element("a");
			t67 = text("2. We read the file and determine what is being imported into this file");
			t68 = space();
			pre0 = element("pre");
			t69 = space();
			p11 = element("p");
			t70 = text("In the example above, the following is imported:");
			t71 = space();
			ul6 = element("ul");
			li21 = element("li");
			code0 = element("code");
			t72 = text("'./calculate'");
			t73 = space();
			li22 = element("li");
			code1 = element("code");
			t74 = text("'../measurements'");
			t75 = space();
			li23 = element("li");
			code2 = element("code");
			t76 = text("'formulas'");
			t77 = space();
			p12 = element("p");
			t78 = text("we can spot the import from our human eye 👀, but how can computer 🤖 do that for us?");
			t79 = space();
			p13 = element("p");
			t80 = text("🤖 can parse the code in string into Abstract Syntax Tree (AST), something representing the code that 🤖 can understand.");
			t81 = space();
			p14 = element("p");
			t82 = text("in AST, import statement is represented by a node with:");
			t83 = space();
			ul7 = element("ul");
			li24 = element("li");
			code3 = element("code");
			t84 = text("type");
			t85 = text(" = \"ImportDeclaration\"");
			t86 = space();
			li25 = element("li");
			code4 = element("code");
			t87 = text("source.value");
			t88 = text(" = the filename it's trying to import");
			t89 = space();
			p15 = element("p");
			picture2 = element("picture");
			source4 = element("source");
			source5 = element("source");
			img2 = element("img");
			t90 = space();
			p16 = element("p");
			t91 = text("There are various JavaScript parser out there, here are some of them");
			t92 = space();
			ul8 = element("ul");
			li26 = element("li");
			t93 = text("🔗 ");
			a26 = element("a");
			t94 = text("babel");
			t95 = space();
			li27 = element("li");
			t96 = text("🔗 ");
			a27 = element("a");
			t97 = text("acorn");
			t98 = space();
			li28 = element("li");
			t99 = text("🔗 ");
			a28 = element("a");
			t100 = text("esprima");
			t101 = space();
			li29 = element("li");
			t102 = text("🔗 ");
			a29 = element("a");
			t103 = text("es-module-lexer");
			t104 = space();
			pre1 = element("pre");
			t105 = space();
			p17 = element("p");
			t106 = text("...and if you forgot about your tree-traversal algorithm 😨, here are some libraries that can help you out");
			t107 = space();
			ul9 = element("ul");
			li30 = element("li");
			t108 = text("🔗 ");
			a30 = element("a");
			t109 = text("babel-traverse");
			t110 = space();
			li31 = element("li");
			t111 = text("🔗 ");
			a31 = element("a");
			t112 = text("acorn-walk");
			t113 = space();
			li32 = element("li");
			t114 = text("🔗 ");
			a32 = element("a");
			t115 = text("estree-walker");
			t116 = space();
			pre2 = element("pre");
			t117 = space();
			p18 = element("p");
			t118 = text("Some other useful links");
			t119 = space();
			ul13 = element("ul");
			li35 = element("li");
			t120 = text("Inspect your AST");
			ul10 = element("ul");
			li33 = element("li");
			a33 = element("a");
			t121 = text("https://astexplorer.net");
			t122 = space();
			li34 = element("li");
			a34 = element("a");
			t123 = text("https://lihautan.com/babel-ast-explorer/");
			t124 = space();
			li37 = element("li");
			t125 = text("The JS AST Specification");
			ul11 = element("ul");
			li36 = element("li");
			a35 = element("a");
			t126 = text("https://github.com/estree/estree");
			t127 = space();
			li40 = element("li");
			t128 = text("Guide on parsing, traversing AST");
			ul12 = element("ul");
			li38 = element("li");
			a36 = element("a");
			t129 = text("https://lihautan.com/manipulating-ast-with-javascript");
			t130 = space();
			li39 = element("li");
			a37 = element("a");
			t131 = text("https://lihautan.com/json-parser-with-javascript");
			t132 = space();
			section7 = element("section");
			h33 = element("h3");
			a38 = element("a");
			t133 = text("3. Now knowing what are the names you are importing from, you need to figure out their actual file path");
			t134 = space();
			p19 = element("p");
			t135 = text("that depends on");
			t136 = space();
			ul14 = element("ul");
			li41 = element("li");
			t137 = text("the current file path");
			t138 = space();
			li42 = element("li");
			t139 = text("the name you are importing from");
			t140 = space();
			pre3 = element("pre");
			t141 = space();
			p20 = element("p");
			t142 = text("That leads us to the ");
			a39 = element("a");
			t143 = text("Node.js Module Resolution Algorithm");
			t144 = space();
			p21 = element("p");
			t145 = text("It describes the steps taken to resolve the file.");
			t146 = space();
			p22 = element("p");
			t147 = text("there are 3 scenarios in general:");
			t148 = space();
			ul15 = element("ul");
			li43 = element("li");
			t149 = text("load as file");
			t150 = space();
			li44 = element("li");
			t151 = text("load as directory");
			t152 = space();
			li45 = element("li");
			t153 = text("load as node_modules");
			t154 = space();
			p23 = element("p");
			picture3 = element("picture");
			source6 = element("source");
			source7 = element("source");
			img3 = element("img");
			t155 = space();
			p24 = element("p");
			t156 = text("Some other module resolution:");
			t157 = space();
			ul16 = element("ul");
			li46 = element("li");
			t158 = text("webpack uses ");
			a40 = element("a");
			code5 = element("code");
			t159 = text("enhanced-resolve");
			t160 = text(" which is a highly configurable resolver");
			t161 = space();
			li47 = element("li");
			t162 = text("Typescript implements its own resolver, ");
			a41 = element("a");
			t163 = text("see how TS resolving works");
			t164 = space();
			section8 = element("section");
			h34 = element("h3");
			a42 = element("a");
			t165 = text("4️⃣ After you figured the file path you're importing from, for each of the file, 🔁 repeat step 2️⃣ until no more new files to be found.");
			t166 = space();
			section9 = element("section");
			h35 = element("h3");
			a43 = element("a");
			t167 = text("Assignment");
			t168 = space();
			p25 = element("p");
			a44 = element("a");
			t169 = text("Test cases");
			t170 = space();
			p26 = element("p");
			t171 = text("For each test cases, we provide the entry file, and we expect");
			t172 = space();
			p27 = element("p");
			t173 = text("📝 Module");
			t174 = space();
			ul17 = element("ul");
			li48 = element("li");
			code6 = element("code");
			t175 = text("filepath");
			t176 = space();
			li49 = element("li");
			code7 = element("code");
			t177 = text("dependencies");
			t178 = text(" -> list of Depedencies (see below 👇)");
			t179 = space();
			li50 = element("li");
			code8 = element("code");
			t180 = text("isEntryFile");
			t181 = text(" -> ");
			code9 = element("code");
			t182 = text("true");
			t183 = text(" if it is the entry file / ");
			code10 = element("code");
			t184 = text("false");
			t185 = text(" otherwise");
			t186 = space();
			p28 = element("p");
			t187 = text("📝 Depedencies");
			t188 = space();
			ul18 = element("ul");
			li51 = element("li");
			code11 = element("code");
			t189 = text("module");
			t190 = text(" (see above ☝️)");
			t191 = space();
			li52 = element("li");
			code12 = element("code");
			t192 = text("exports");
			t193 = text(" -> list of var names you are importing, eg \"default\", \"measure\" ..");
			t194 = space();
			p29 = element("p");
			t195 = text("📝 If 2 module are importing the same module, both should be referring to the same module instance");
			t196 = space();
			pre4 = element("pre");
			t197 = space();
			p30 = element("p");
			t198 = text("📝 Be careful with circular dependency 🙈");
			t199 = space();
			section10 = element("section");
			h23 = element("h2");
			a45 = element("a");
			t200 = text("Week 2 - Bundling");
			t201 = space();
			p31 = element("p");
			t202 = text("🤔 How do you bundle modules into 1 file?");
			t203 = space();
			p32 = element("p");
			t204 = text("After studying the 2 most popular bundlers, webpack and rollup, i found that the way they bundle are very different.");
			t205 = space();
			p33 = element("p");
			t206 = text("Both of them come a long way, I believe both has its own pros and cons");
			t207 = space();
			pre5 = element("pre");
			t208 = space();
			section11 = element("section");
			h36 = element("h3");
			a46 = element("a");
			t209 = text("🔭 Observation: Bundle using webpack");
			t210 = space();
			ul19 = element("ul");
			li53 = element("li");
			t211 = text("📝 each module wrap in a function");
			t212 = space();
			li54 = element("li");
			t213 = text("📝 a module map, module identifier as key");
			t214 = space();
			li55 = element("li");
			t215 = text("📝 a runtime glue code to piece modules together");
			t216 = space();
			li56 = element("li");
			t217 = text("📝 calling module function, with 2 parameters, 1 to assign the exports of the module, 1 to \"require\" other modules");
			t218 = space();
			pre6 = element("pre");
			t219 = space();
			section12 = element("section");
			h4 = element("h4");
			a47 = element("a");
			t220 = text("🔭 Observation: Bundle using rollup");
			t221 = space();
			ul20 = element("ul");
			li57 = element("li");
			t222 = text("📝 much flatter bundle");
			t223 = space();
			li58 = element("li");
			t224 = text("📝 module are concatenated in topological order");
			t225 = space();
			li59 = element("li");
			t226 = text("📝 exports and imports are removed by renaming them to the same variable name");
			t227 = space();
			li60 = element("li");
			t228 = text("📝 any variable in module scope that may have naming conflict with other variables are renamed");
			t229 = space();
			pre7 = element("pre");
			t230 = space();
			section13 = element("section");
			h37 = element("h3");
			a48 = element("a");
			t231 = text("📤 Output target of bundling");
			t232 = space();
			ul21 = element("ul");
			li61 = element("li");
			p34 = element("p");
			t233 = text("IIFE (the most common target, we want to execute the script)");
			t234 = space();
			li62 = element("li");
			p35 = element("p");
			t235 = text("CJS, ESM, UMD, AMD, ... (we want to bundle a library, exports of entry file is exported in selected module format)");
			t236 = space();
			li63 = element("li");
			p36 = element("p");
			t237 = text("🔗 ");
			a49 = element("a");
			t238 = text("https://webpack.js.org/configuration/output/#outputlibrarytarget");
			t239 = space();
			li64 = element("li");
			p37 = element("p");
			t240 = text("🔗 ");
			a50 = element("a");
			t241 = text("https://rollupjs.org/guide/en/#configuration-files");
			t242 = space();
			section14 = element("section");
			h38 = element("h3");
			a51 = element("a");
			t243 = text("Assignment");
			t244 = space();
			p38 = element("p");
			a52 = element("a");
			t245 = text("Test cases");
			t246 = space();
			p39 = element("p");
			t247 = text("Here are some of the the interesting test cases:");
			t248 = space();
			p40 = element("p");
			t249 = text("🧪 Able to handle re-export nicely");
			t250 = space();
			pre8 = element("pre");
			t251 = space();
			p41 = element("p");
			t252 = text("🧪 Importing the same file twice, but are you able to make sure it's gonna be evaluated only once?");
			t253 = space();
			pre9 = element("pre");
			t254 = space();
			p42 = element("p");
			t255 = text("🧪 The dreaded circular dependency, are you able to make sure to get the value of ");
			code13 = element("code");
			t256 = text("a");
			t257 = text(", ");
			code14 = element("code");
			t258 = text("b");
			t259 = text(", ");
			code15 = element("code");
			t260 = text("c");
			t261 = text(" in all the files?");
			t262 = space();
			pre10 = element("pre");
			t263 = space();
			p43 = element("p");
			t264 = text("🧪 Are you able to export a variable before it is declared? Does the order matter?");
			t265 = space();
			pre11 = element("pre");
			t266 = space();
			p44 = element("p");
			t267 = text("🧪 imported variables is not a normal variable, it's a live binding of the exported variable. Are you able to make sure that the value of ");
			code16 = element("code");
			t268 = text("count");
			t269 = text(" is always up to date?");
			t270 = space();
			pre12 = element("pre");
			t271 = space();
			p45 = element("p");
			t272 = text("📝 Be careful with circular dependency 🙈");
			t273 = space();
			section15 = element("section");
			h39 = element("h3");
			a53 = element("a");
			t274 = text("🔨 Manipulating AST");
			t275 = space();
			p46 = element("p");
			t276 = text("📖  ");
			a54 = element("a");
			t277 = text("manipulating ast with javascript");
			t278 = text(" (generic)\n📖  ");
			a55 = element("a");
			t279 = text("babel plugin handbook");
			t280 = text(" (babel)");
			this.h();
		},
		l(nodes) {
			section0 = claim_element(nodes, "SECTION", {});
			var section0_nodes = children(section0);

			ul3 = claim_element(section0_nodes, "UL", {
				class: true,
				id: true,
				role: true,
				"aria-label": true
			});

			var ul3_nodes = children(ul3);
			li0 = claim_element(ul3_nodes, "LI", {});
			var li0_nodes = children(li0);
			a0 = claim_element(li0_nodes, "A", { href: true });
			var a0_nodes = children(a0);
			t0 = claim_text(a0_nodes, "Background");
			a0_nodes.forEach(detach);
			li0_nodes.forEach(detach);
			li1 = claim_element(ul3_nodes, "LI", {});
			var li1_nodes = children(li1);
			a1 = claim_element(li1_nodes, "A", { href: true });
			var a1_nodes = children(a1);
			t1 = claim_text(a1_nodes, "Prior Art");
			a1_nodes.forEach(detach);
			li1_nodes.forEach(detach);
			li2 = claim_element(ul3_nodes, "LI", {});
			var li2_nodes = children(li2);
			a2 = claim_element(li2_nodes, "A", { href: true });
			var a2_nodes = children(a2);
			t2 = claim_text(a2_nodes, "Week 1 - Resolving");
			a2_nodes.forEach(detach);
			li2_nodes.forEach(detach);
			ul0 = claim_element(ul3_nodes, "UL", {});
			var ul0_nodes = children(ul0);
			li3 = claim_element(ul0_nodes, "LI", {});
			var li3_nodes = children(li3);
			a3 = claim_element(li3_nodes, "A", { href: true });
			var a3_nodes = children(a3);
			t3 = claim_text(a3_nodes, "Why module bundler?");
			a3_nodes.forEach(detach);
			li3_nodes.forEach(detach);
			li4 = claim_element(ul0_nodes, "LI", {});
			var li4_nodes = children(li4);
			a4 = claim_element(li4_nodes, "A", { href: true });
			var a4_nodes = children(a4);
			t4 = claim_text(a4_nodes, "1. We start from an entry file.");
			a4_nodes.forEach(detach);
			li4_nodes.forEach(detach);
			li5 = claim_element(ul0_nodes, "LI", {});
			var li5_nodes = children(li5);
			a5 = claim_element(li5_nodes, "A", { href: true });
			var a5_nodes = children(a5);
			t5 = claim_text(a5_nodes, "2. We read the file and determine what is being imported into this file");
			a5_nodes.forEach(detach);
			li5_nodes.forEach(detach);
			li6 = claim_element(ul0_nodes, "LI", {});
			var li6_nodes = children(li6);
			a6 = claim_element(li6_nodes, "A", { href: true });
			var a6_nodes = children(a6);
			t6 = claim_text(a6_nodes, "3. Now knowing what are the names you are importing from, you need to figure out their actual file path");
			a6_nodes.forEach(detach);
			li6_nodes.forEach(detach);
			li7 = claim_element(ul0_nodes, "LI", {});
			var li7_nodes = children(li7);
			a7 = claim_element(li7_nodes, "A", { href: true });
			var a7_nodes = children(a7);
			t7 = claim_text(a7_nodes, "4️⃣ After you figured the file path you're importing from, for each of the file, 🔁 repeat step 2️⃣ until no more new files to be found.");
			a7_nodes.forEach(detach);
			li7_nodes.forEach(detach);
			li8 = claim_element(ul0_nodes, "LI", {});
			var li8_nodes = children(li8);
			a8 = claim_element(li8_nodes, "A", { href: true });
			var a8_nodes = children(a8);
			t8 = claim_text(a8_nodes, "Assignment");
			a8_nodes.forEach(detach);
			li8_nodes.forEach(detach);
			ul0_nodes.forEach(detach);
			li9 = claim_element(ul3_nodes, "LI", {});
			var li9_nodes = children(li9);
			a9 = claim_element(li9_nodes, "A", { href: true });
			var a9_nodes = children(a9);
			t9 = claim_text(a9_nodes, "Week 2 - Bundling");
			a9_nodes.forEach(detach);
			li9_nodes.forEach(detach);
			ul2 = claim_element(ul3_nodes, "UL", {});
			var ul2_nodes = children(ul2);
			li10 = claim_element(ul2_nodes, "LI", {});
			var li10_nodes = children(li10);
			a10 = claim_element(li10_nodes, "A", { href: true });
			var a10_nodes = children(a10);
			t10 = claim_text(a10_nodes, "🔭 Observation: Bundle using webpack");
			a10_nodes.forEach(detach);
			li10_nodes.forEach(detach);
			ul1 = claim_element(ul2_nodes, "UL", {});
			var ul1_nodes = children(ul1);
			li11 = claim_element(ul1_nodes, "LI", {});
			var li11_nodes = children(li11);
			a11 = claim_element(li11_nodes, "A", { href: true });
			var a11_nodes = children(a11);
			t11 = claim_text(a11_nodes, "🔭 Observation: Bundle using rollup");
			a11_nodes.forEach(detach);
			li11_nodes.forEach(detach);
			ul1_nodes.forEach(detach);
			li12 = claim_element(ul2_nodes, "LI", {});
			var li12_nodes = children(li12);
			a12 = claim_element(li12_nodes, "A", { href: true });
			var a12_nodes = children(a12);
			t12 = claim_text(a12_nodes, "📤 Output target of bundling");
			a12_nodes.forEach(detach);
			li12_nodes.forEach(detach);
			li13 = claim_element(ul2_nodes, "LI", {});
			var li13_nodes = children(li13);
			a13 = claim_element(li13_nodes, "A", { href: true });
			var a13_nodes = children(a13);
			t13 = claim_text(a13_nodes, "Assignment");
			a13_nodes.forEach(detach);
			li13_nodes.forEach(detach);
			li14 = claim_element(ul2_nodes, "LI", {});
			var li14_nodes = children(li14);
			a14 = claim_element(li14_nodes, "A", { href: true });
			var a14_nodes = children(a14);
			t14 = claim_text(a14_nodes, "🔨 Manipulating AST");
			a14_nodes.forEach(detach);
			li14_nodes.forEach(detach);
			ul2_nodes.forEach(detach);
			ul3_nodes.forEach(detach);
			section0_nodes.forEach(detach);
			t15 = claim_space(nodes);
			section1 = claim_element(nodes, "SECTION", {});
			var section1_nodes = children(section1);
			h20 = claim_element(section1_nodes, "H2", {});
			var h20_nodes = children(h20);
			a15 = claim_element(h20_nodes, "A", { href: true, id: true });
			var a15_nodes = children(a15);
			t16 = claim_text(a15_nodes, "Background");
			a15_nodes.forEach(detach);
			h20_nodes.forEach(detach);
			t17 = claim_space(section1_nodes);
			p0 = claim_element(section1_nodes, "P", {});
			var p0_nodes = children(p0);
			t18 = claim_text(p0_nodes, "We are trying out a new form of our weekly sharing, which is interest group-based.");
			p0_nodes.forEach(detach);
			t19 = claim_space(section1_nodes);
			p1 = claim_element(section1_nodes, "P", {});
			var p1_nodes = children(p1);
			t20 = claim_text(p1_nodes, "I am hosting the ");
			strong = claim_element(p1_nodes, "STRONG", {});
			var strong_nodes = children(strong);
			t21 = claim_text(strong_nodes, "\"Building a simplified webpack clone\"");
			strong_nodes.forEach(detach);
			t22 = claim_text(p1_nodes, " interest group, which lasted 8 weeks, and every week, we will cover 1 concept of webpack and an assignment to implement that concept ourselves.");
			p1_nodes.forEach(detach);
			section1_nodes.forEach(detach);
			t23 = claim_space(nodes);
			section2 = claim_element(nodes, "SECTION", {});
			var section2_nodes = children(section2);
			h21 = claim_element(section2_nodes, "H2", {});
			var h21_nodes = children(h21);
			a16 = claim_element(h21_nodes, "A", { href: true, id: true });
			var a16_nodes = children(a16);
			t24 = claim_text(a16_nodes, "Prior Art");
			a16_nodes.forEach(detach);
			h21_nodes.forEach(detach);
			t25 = claim_space(section2_nodes);
			ul4 = claim_element(section2_nodes, "UL", {});
			var ul4_nodes = children(ul4);
			li15 = claim_element(ul4_nodes, "LI", {});
			var li15_nodes = children(li15);
			t26 = claim_text(li15_nodes, "📺 ");
			a17 = claim_element(li15_nodes, "A", { href: true, rel: true });
			var a17_nodes = children(a17);
			t27 = claim_text(a17_nodes, "Tobias Koppers");
			a17_nodes.forEach(detach);
			t28 = claim_text(li15_nodes, " - bundling live by hand - ");
			a18 = claim_element(li15_nodes, "A", { href: true, rel: true });
			var a18_nodes = children(a18);
			t29 = claim_text(a18_nodes, "https://youtube.com/watch?v=UNMkLHzofQI");
			a18_nodes.forEach(detach);
			li15_nodes.forEach(detach);
			t30 = claim_space(ul4_nodes);
			li16 = claim_element(ul4_nodes, "LI", {});
			var li16_nodes = children(li16);
			t31 = claim_text(li16_nodes, "📺 ");
			a19 = claim_element(li16_nodes, "A", { href: true, rel: true });
			var a19_nodes = children(a19);
			t32 = claim_text(a19_nodes, "Ronen Amiel");
			a19_nodes.forEach(detach);
			t33 = claim_text(li16_nodes, " - build your own webpack - ");
			a20 = claim_element(li16_nodes, "A", { href: true, rel: true });
			var a20_nodes = children(a20);
			t34 = claim_text(a20_nodes, "https://youtube.com/watch?v=Gc9-7PBqOC8");
			a20_nodes.forEach(detach);
			li16_nodes.forEach(detach);
			t35 = claim_space(ul4_nodes);
			li17 = claim_element(ul4_nodes, "LI", {});
			var li17_nodes = children(li17);
			t36 = claim_text(li17_nodes, "📖 adam kelly - ");
			a21 = claim_element(li17_nodes, "A", { href: true, rel: true });
			var a21_nodes = children(a21);
			t37 = claim_text(a21_nodes, "https://freecodecamp.org/news/lets-learn-how-module-bundlers-work-and-then-write-one-ourselves-b2e3fe6c88ae/");
			a21_nodes.forEach(detach);
			li17_nodes.forEach(detach);
			ul4_nodes.forEach(detach);
			section2_nodes.forEach(detach);
			t38 = claim_space(nodes);
			section3 = claim_element(nodes, "SECTION", {});
			var section3_nodes = children(section3);
			h22 = claim_element(section3_nodes, "H2", {});
			var h22_nodes = children(h22);
			a22 = claim_element(h22_nodes, "A", { href: true, id: true });
			var a22_nodes = children(a22);
			t39 = claim_text(a22_nodes, "Week 1 - Resolving");
			a22_nodes.forEach(detach);
			h22_nodes.forEach(detach);
			section3_nodes.forEach(detach);
			t40 = claim_space(nodes);
			section4 = claim_element(nodes, "SECTION", {});
			var section4_nodes = children(section4);
			h30 = claim_element(section4_nodes, "H3", {});
			var h30_nodes = children(h30);
			a23 = claim_element(h30_nodes, "A", { href: true, id: true });
			var a23_nodes = children(a23);
			t41 = claim_text(a23_nodes, "Why module bundler?");
			a23_nodes.forEach(detach);
			h30_nodes.forEach(detach);
			t42 = claim_space(section4_nodes);
			p2 = claim_element(section4_nodes, "P", {});
			var p2_nodes = children(p2);
			t43 = claim_text(p2_nodes, "We love writing small modular JS files, but that shouldn't impact the users.");
			p2_nodes.forEach(detach);
			t44 = claim_space(section4_nodes);
			p3 = claim_element(section4_nodes, "P", {});
			var p3_nodes = children(p3);
			t45 = claim_text(p3_nodes, "Traditionally with limit on number of request connection, 🐌 slow internet speed, we want to combine all the code into 1 file -> 1 network request");
			p3_nodes.forEach(detach);
			t46 = claim_space(section4_nodes);
			p4 = claim_element(section4_nodes, "P", {});
			var p4_nodes = children(p4);
			picture0 = claim_element(p4_nodes, "PICTURE", {});
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
			p4_nodes.forEach(detach);
			t47 = claim_space(section4_nodes);
			p5 = claim_element(section4_nodes, "P", {});
			var p5_nodes = children(p5);
			t48 = claim_text(p5_nodes, "🕰 Traditionally, we concatenate the source files into 1 big output file.");
			p5_nodes.forEach(detach);
			t49 = claim_space(section4_nodes);
			p6 = claim_element(section4_nodes, "P", {});
			var p6_nodes = children(p6);
			t50 = claim_text(p6_nodes, "But that begs the question");
			p6_nodes.forEach(detach);
			t51 = claim_space(section4_nodes);
			ul5 = claim_element(section4_nodes, "UL", {});
			var ul5_nodes = children(ul5);
			li18 = claim_element(ul5_nodes, "LI", {});
			var li18_nodes = children(li18);
			t52 = claim_text(li18_nodes, "❓ what should be the order of concatenation (files may depend on each other) ?");
			li18_nodes.forEach(detach);
			t53 = claim_space(ul5_nodes);
			li19 = claim_element(ul5_nodes, "LI", {});
			var li19_nodes = children(li19);
			t54 = claim_text(li19_nodes, "❓ what if there's var naming conflict across files?");
			li19_nodes.forEach(detach);
			t55 = claim_space(ul5_nodes);
			li20 = claim_element(ul5_nodes, "LI", {});
			var li20_nodes = children(li20);
			t56 = claim_text(li20_nodes, "❓ what if there's unused file?");
			li20_nodes.forEach(detach);
			ul5_nodes.forEach(detach);
			t57 = claim_space(section4_nodes);
			p7 = claim_element(section4_nodes, "P", {});
			var p7_nodes = children(p7);
			t58 = claim_text(p7_nodes, "💡 That's why we need a module system to define the relationship among the JS modules");
			p7_nodes.forEach(detach);
			t59 = claim_space(section4_nodes);
			p8 = claim_element(section4_nodes, "P", {});
			var p8_nodes = children(p8);
			picture1 = claim_element(p8_nodes, "PICTURE", {});
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
			p8_nodes.forEach(detach);
			t60 = claim_space(section4_nodes);
			p9 = claim_element(section4_nodes, "P", {});
			var p9_nodes = children(p9);
			t61 = claim_text(p9_nodes, "So now, let's take a look how we can start building a module dependency graph");
			p9_nodes.forEach(detach);
			section4_nodes.forEach(detach);
			t62 = claim_space(nodes);
			section5 = claim_element(nodes, "SECTION", {});
			var section5_nodes = children(section5);
			h31 = claim_element(section5_nodes, "H3", {});
			var h31_nodes = children(h31);
			a24 = claim_element(h31_nodes, "A", { href: true, id: true });
			var a24_nodes = children(a24);
			t63 = claim_text(a24_nodes, "1. We start from an entry file.");
			a24_nodes.forEach(detach);
			h31_nodes.forEach(detach);
			t64 = claim_space(section5_nodes);
			p10 = claim_element(section5_nodes, "P", {});
			var p10_nodes = children(p10);
			t65 = claim_text(p10_nodes, "This is the starting point of the application");
			p10_nodes.forEach(detach);
			section5_nodes.forEach(detach);
			t66 = claim_space(nodes);
			section6 = claim_element(nodes, "SECTION", {});
			var section6_nodes = children(section6);
			h32 = claim_element(section6_nodes, "H3", {});
			var h32_nodes = children(h32);
			a25 = claim_element(h32_nodes, "A", { href: true, id: true });
			var a25_nodes = children(a25);
			t67 = claim_text(a25_nodes, "2. We read the file and determine what is being imported into this file");
			a25_nodes.forEach(detach);
			h32_nodes.forEach(detach);
			t68 = claim_space(section6_nodes);
			pre0 = claim_element(section6_nodes, "PRE", { class: true });
			var pre0_nodes = children(pre0);
			pre0_nodes.forEach(detach);
			t69 = claim_space(section6_nodes);
			p11 = claim_element(section6_nodes, "P", {});
			var p11_nodes = children(p11);
			t70 = claim_text(p11_nodes, "In the example above, the following is imported:");
			p11_nodes.forEach(detach);
			t71 = claim_space(section6_nodes);
			ul6 = claim_element(section6_nodes, "UL", {});
			var ul6_nodes = children(ul6);
			li21 = claim_element(ul6_nodes, "LI", {});
			var li21_nodes = children(li21);
			code0 = claim_element(li21_nodes, "CODE", {});
			var code0_nodes = children(code0);
			t72 = claim_text(code0_nodes, "'./calculate'");
			code0_nodes.forEach(detach);
			li21_nodes.forEach(detach);
			t73 = claim_space(ul6_nodes);
			li22 = claim_element(ul6_nodes, "LI", {});
			var li22_nodes = children(li22);
			code1 = claim_element(li22_nodes, "CODE", {});
			var code1_nodes = children(code1);
			t74 = claim_text(code1_nodes, "'../measurements'");
			code1_nodes.forEach(detach);
			li22_nodes.forEach(detach);
			t75 = claim_space(ul6_nodes);
			li23 = claim_element(ul6_nodes, "LI", {});
			var li23_nodes = children(li23);
			code2 = claim_element(li23_nodes, "CODE", {});
			var code2_nodes = children(code2);
			t76 = claim_text(code2_nodes, "'formulas'");
			code2_nodes.forEach(detach);
			li23_nodes.forEach(detach);
			ul6_nodes.forEach(detach);
			t77 = claim_space(section6_nodes);
			p12 = claim_element(section6_nodes, "P", {});
			var p12_nodes = children(p12);
			t78 = claim_text(p12_nodes, "we can spot the import from our human eye 👀, but how can computer 🤖 do that for us?");
			p12_nodes.forEach(detach);
			t79 = claim_space(section6_nodes);
			p13 = claim_element(section6_nodes, "P", {});
			var p13_nodes = children(p13);
			t80 = claim_text(p13_nodes, "🤖 can parse the code in string into Abstract Syntax Tree (AST), something representing the code that 🤖 can understand.");
			p13_nodes.forEach(detach);
			t81 = claim_space(section6_nodes);
			p14 = claim_element(section6_nodes, "P", {});
			var p14_nodes = children(p14);
			t82 = claim_text(p14_nodes, "in AST, import statement is represented by a node with:");
			p14_nodes.forEach(detach);
			t83 = claim_space(section6_nodes);
			ul7 = claim_element(section6_nodes, "UL", {});
			var ul7_nodes = children(ul7);
			li24 = claim_element(ul7_nodes, "LI", {});
			var li24_nodes = children(li24);
			code3 = claim_element(li24_nodes, "CODE", {});
			var code3_nodes = children(code3);
			t84 = claim_text(code3_nodes, "type");
			code3_nodes.forEach(detach);
			t85 = claim_text(li24_nodes, " = \"ImportDeclaration\"");
			li24_nodes.forEach(detach);
			t86 = claim_space(ul7_nodes);
			li25 = claim_element(ul7_nodes, "LI", {});
			var li25_nodes = children(li25);
			code4 = claim_element(li25_nodes, "CODE", {});
			var code4_nodes = children(code4);
			t87 = claim_text(code4_nodes, "source.value");
			code4_nodes.forEach(detach);
			t88 = claim_text(li25_nodes, " = the filename it's trying to import");
			li25_nodes.forEach(detach);
			ul7_nodes.forEach(detach);
			t89 = claim_space(section6_nodes);
			p15 = claim_element(section6_nodes, "P", {});
			var p15_nodes = children(p15);
			picture2 = claim_element(p15_nodes, "PICTURE", {});
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
			p15_nodes.forEach(detach);
			t90 = claim_space(section6_nodes);
			p16 = claim_element(section6_nodes, "P", {});
			var p16_nodes = children(p16);
			t91 = claim_text(p16_nodes, "There are various JavaScript parser out there, here are some of them");
			p16_nodes.forEach(detach);
			t92 = claim_space(section6_nodes);
			ul8 = claim_element(section6_nodes, "UL", {});
			var ul8_nodes = children(ul8);
			li26 = claim_element(ul8_nodes, "LI", {});
			var li26_nodes = children(li26);
			t93 = claim_text(li26_nodes, "🔗 ");
			a26 = claim_element(li26_nodes, "A", { href: true, rel: true });
			var a26_nodes = children(a26);
			t94 = claim_text(a26_nodes, "babel");
			a26_nodes.forEach(detach);
			li26_nodes.forEach(detach);
			t95 = claim_space(ul8_nodes);
			li27 = claim_element(ul8_nodes, "LI", {});
			var li27_nodes = children(li27);
			t96 = claim_text(li27_nodes, "🔗 ");
			a27 = claim_element(li27_nodes, "A", { href: true, rel: true });
			var a27_nodes = children(a27);
			t97 = claim_text(a27_nodes, "acorn");
			a27_nodes.forEach(detach);
			li27_nodes.forEach(detach);
			t98 = claim_space(ul8_nodes);
			li28 = claim_element(ul8_nodes, "LI", {});
			var li28_nodes = children(li28);
			t99 = claim_text(li28_nodes, "🔗 ");
			a28 = claim_element(li28_nodes, "A", { href: true, rel: true });
			var a28_nodes = children(a28);
			t100 = claim_text(a28_nodes, "esprima");
			a28_nodes.forEach(detach);
			li28_nodes.forEach(detach);
			t101 = claim_space(ul8_nodes);
			li29 = claim_element(ul8_nodes, "LI", {});
			var li29_nodes = children(li29);
			t102 = claim_text(li29_nodes, "🔗 ");
			a29 = claim_element(li29_nodes, "A", { href: true, rel: true });
			var a29_nodes = children(a29);
			t103 = claim_text(a29_nodes, "es-module-lexer");
			a29_nodes.forEach(detach);
			li29_nodes.forEach(detach);
			ul8_nodes.forEach(detach);
			t104 = claim_space(section6_nodes);
			pre1 = claim_element(section6_nodes, "PRE", { class: true });
			var pre1_nodes = children(pre1);
			pre1_nodes.forEach(detach);
			t105 = claim_space(section6_nodes);
			p17 = claim_element(section6_nodes, "P", {});
			var p17_nodes = children(p17);
			t106 = claim_text(p17_nodes, "...and if you forgot about your tree-traversal algorithm 😨, here are some libraries that can help you out");
			p17_nodes.forEach(detach);
			t107 = claim_space(section6_nodes);
			ul9 = claim_element(section6_nodes, "UL", {});
			var ul9_nodes = children(ul9);
			li30 = claim_element(ul9_nodes, "LI", {});
			var li30_nodes = children(li30);
			t108 = claim_text(li30_nodes, "🔗 ");
			a30 = claim_element(li30_nodes, "A", { href: true, rel: true });
			var a30_nodes = children(a30);
			t109 = claim_text(a30_nodes, "babel-traverse");
			a30_nodes.forEach(detach);
			li30_nodes.forEach(detach);
			t110 = claim_space(ul9_nodes);
			li31 = claim_element(ul9_nodes, "LI", {});
			var li31_nodes = children(li31);
			t111 = claim_text(li31_nodes, "🔗 ");
			a31 = claim_element(li31_nodes, "A", { href: true, rel: true });
			var a31_nodes = children(a31);
			t112 = claim_text(a31_nodes, "acorn-walk");
			a31_nodes.forEach(detach);
			li31_nodes.forEach(detach);
			t113 = claim_space(ul9_nodes);
			li32 = claim_element(ul9_nodes, "LI", {});
			var li32_nodes = children(li32);
			t114 = claim_text(li32_nodes, "🔗 ");
			a32 = claim_element(li32_nodes, "A", { href: true, rel: true });
			var a32_nodes = children(a32);
			t115 = claim_text(a32_nodes, "estree-walker");
			a32_nodes.forEach(detach);
			li32_nodes.forEach(detach);
			ul9_nodes.forEach(detach);
			t116 = claim_space(section6_nodes);
			pre2 = claim_element(section6_nodes, "PRE", { class: true });
			var pre2_nodes = children(pre2);
			pre2_nodes.forEach(detach);
			t117 = claim_space(section6_nodes);
			p18 = claim_element(section6_nodes, "P", {});
			var p18_nodes = children(p18);
			t118 = claim_text(p18_nodes, "Some other useful links");
			p18_nodes.forEach(detach);
			t119 = claim_space(section6_nodes);
			ul13 = claim_element(section6_nodes, "UL", {});
			var ul13_nodes = children(ul13);
			li35 = claim_element(ul13_nodes, "LI", {});
			var li35_nodes = children(li35);
			t120 = claim_text(li35_nodes, "Inspect your AST");
			ul10 = claim_element(li35_nodes, "UL", {});
			var ul10_nodes = children(ul10);
			li33 = claim_element(ul10_nodes, "LI", {});
			var li33_nodes = children(li33);
			a33 = claim_element(li33_nodes, "A", { href: true, rel: true });
			var a33_nodes = children(a33);
			t121 = claim_text(a33_nodes, "https://astexplorer.net");
			a33_nodes.forEach(detach);
			li33_nodes.forEach(detach);
			t122 = claim_space(ul10_nodes);
			li34 = claim_element(ul10_nodes, "LI", {});
			var li34_nodes = children(li34);
			a34 = claim_element(li34_nodes, "A", { href: true, rel: true });
			var a34_nodes = children(a34);
			t123 = claim_text(a34_nodes, "https://lihautan.com/babel-ast-explorer/");
			a34_nodes.forEach(detach);
			li34_nodes.forEach(detach);
			ul10_nodes.forEach(detach);
			li35_nodes.forEach(detach);
			t124 = claim_space(ul13_nodes);
			li37 = claim_element(ul13_nodes, "LI", {});
			var li37_nodes = children(li37);
			t125 = claim_text(li37_nodes, "The JS AST Specification");
			ul11 = claim_element(li37_nodes, "UL", {});
			var ul11_nodes = children(ul11);
			li36 = claim_element(ul11_nodes, "LI", {});
			var li36_nodes = children(li36);
			a35 = claim_element(li36_nodes, "A", { href: true, rel: true });
			var a35_nodes = children(a35);
			t126 = claim_text(a35_nodes, "https://github.com/estree/estree");
			a35_nodes.forEach(detach);
			li36_nodes.forEach(detach);
			ul11_nodes.forEach(detach);
			li37_nodes.forEach(detach);
			t127 = claim_space(ul13_nodes);
			li40 = claim_element(ul13_nodes, "LI", {});
			var li40_nodes = children(li40);
			t128 = claim_text(li40_nodes, "Guide on parsing, traversing AST");
			ul12 = claim_element(li40_nodes, "UL", {});
			var ul12_nodes = children(ul12);
			li38 = claim_element(ul12_nodes, "LI", {});
			var li38_nodes = children(li38);
			a36 = claim_element(li38_nodes, "A", { href: true, rel: true });
			var a36_nodes = children(a36);
			t129 = claim_text(a36_nodes, "https://lihautan.com/manipulating-ast-with-javascript");
			a36_nodes.forEach(detach);
			li38_nodes.forEach(detach);
			t130 = claim_space(ul12_nodes);
			li39 = claim_element(ul12_nodes, "LI", {});
			var li39_nodes = children(li39);
			a37 = claim_element(li39_nodes, "A", { href: true, rel: true });
			var a37_nodes = children(a37);
			t131 = claim_text(a37_nodes, "https://lihautan.com/json-parser-with-javascript");
			a37_nodes.forEach(detach);
			li39_nodes.forEach(detach);
			ul12_nodes.forEach(detach);
			li40_nodes.forEach(detach);
			ul13_nodes.forEach(detach);
			section6_nodes.forEach(detach);
			t132 = claim_space(nodes);
			section7 = claim_element(nodes, "SECTION", {});
			var section7_nodes = children(section7);
			h33 = claim_element(section7_nodes, "H3", {});
			var h33_nodes = children(h33);
			a38 = claim_element(h33_nodes, "A", { href: true, id: true });
			var a38_nodes = children(a38);
			t133 = claim_text(a38_nodes, "3. Now knowing what are the names you are importing from, you need to figure out their actual file path");
			a38_nodes.forEach(detach);
			h33_nodes.forEach(detach);
			t134 = claim_space(section7_nodes);
			p19 = claim_element(section7_nodes, "P", {});
			var p19_nodes = children(p19);
			t135 = claim_text(p19_nodes, "that depends on");
			p19_nodes.forEach(detach);
			t136 = claim_space(section7_nodes);
			ul14 = claim_element(section7_nodes, "UL", {});
			var ul14_nodes = children(ul14);
			li41 = claim_element(ul14_nodes, "LI", {});
			var li41_nodes = children(li41);
			t137 = claim_text(li41_nodes, "the current file path");
			li41_nodes.forEach(detach);
			t138 = claim_space(ul14_nodes);
			li42 = claim_element(ul14_nodes, "LI", {});
			var li42_nodes = children(li42);
			t139 = claim_text(li42_nodes, "the name you are importing from");
			li42_nodes.forEach(detach);
			ul14_nodes.forEach(detach);
			t140 = claim_space(section7_nodes);
			pre3 = claim_element(section7_nodes, "PRE", { class: true });
			var pre3_nodes = children(pre3);
			pre3_nodes.forEach(detach);
			t141 = claim_space(section7_nodes);
			p20 = claim_element(section7_nodes, "P", {});
			var p20_nodes = children(p20);
			t142 = claim_text(p20_nodes, "That leads us to the ");
			a39 = claim_element(p20_nodes, "A", { href: true, rel: true });
			var a39_nodes = children(a39);
			t143 = claim_text(a39_nodes, "Node.js Module Resolution Algorithm");
			a39_nodes.forEach(detach);
			p20_nodes.forEach(detach);
			t144 = claim_space(section7_nodes);
			p21 = claim_element(section7_nodes, "P", {});
			var p21_nodes = children(p21);
			t145 = claim_text(p21_nodes, "It describes the steps taken to resolve the file.");
			p21_nodes.forEach(detach);
			t146 = claim_space(section7_nodes);
			p22 = claim_element(section7_nodes, "P", {});
			var p22_nodes = children(p22);
			t147 = claim_text(p22_nodes, "there are 3 scenarios in general:");
			p22_nodes.forEach(detach);
			t148 = claim_space(section7_nodes);
			ul15 = claim_element(section7_nodes, "UL", {});
			var ul15_nodes = children(ul15);
			li43 = claim_element(ul15_nodes, "LI", {});
			var li43_nodes = children(li43);
			t149 = claim_text(li43_nodes, "load as file");
			li43_nodes.forEach(detach);
			t150 = claim_space(ul15_nodes);
			li44 = claim_element(ul15_nodes, "LI", {});
			var li44_nodes = children(li44);
			t151 = claim_text(li44_nodes, "load as directory");
			li44_nodes.forEach(detach);
			t152 = claim_space(ul15_nodes);
			li45 = claim_element(ul15_nodes, "LI", {});
			var li45_nodes = children(li45);
			t153 = claim_text(li45_nodes, "load as node_modules");
			li45_nodes.forEach(detach);
			ul15_nodes.forEach(detach);
			t154 = claim_space(section7_nodes);
			p23 = claim_element(section7_nodes, "P", {});
			var p23_nodes = children(p23);
			picture3 = claim_element(p23_nodes, "PICTURE", {});
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
			p23_nodes.forEach(detach);
			t155 = claim_space(section7_nodes);
			p24 = claim_element(section7_nodes, "P", {});
			var p24_nodes = children(p24);
			t156 = claim_text(p24_nodes, "Some other module resolution:");
			p24_nodes.forEach(detach);
			t157 = claim_space(section7_nodes);
			ul16 = claim_element(section7_nodes, "UL", {});
			var ul16_nodes = children(ul16);
			li46 = claim_element(ul16_nodes, "LI", {});
			var li46_nodes = children(li46);
			t158 = claim_text(li46_nodes, "webpack uses ");
			a40 = claim_element(li46_nodes, "A", { href: true, rel: true });
			var a40_nodes = children(a40);
			code5 = claim_element(a40_nodes, "CODE", {});
			var code5_nodes = children(code5);
			t159 = claim_text(code5_nodes, "enhanced-resolve");
			code5_nodes.forEach(detach);
			a40_nodes.forEach(detach);
			t160 = claim_text(li46_nodes, " which is a highly configurable resolver");
			li46_nodes.forEach(detach);
			t161 = claim_space(ul16_nodes);
			li47 = claim_element(ul16_nodes, "LI", {});
			var li47_nodes = children(li47);
			t162 = claim_text(li47_nodes, "Typescript implements its own resolver, ");
			a41 = claim_element(li47_nodes, "A", { href: true, rel: true });
			var a41_nodes = children(a41);
			t163 = claim_text(a41_nodes, "see how TS resolving works");
			a41_nodes.forEach(detach);
			li47_nodes.forEach(detach);
			ul16_nodes.forEach(detach);
			section7_nodes.forEach(detach);
			t164 = claim_space(nodes);
			section8 = claim_element(nodes, "SECTION", {});
			var section8_nodes = children(section8);
			h34 = claim_element(section8_nodes, "H3", {});
			var h34_nodes = children(h34);
			a42 = claim_element(h34_nodes, "A", { href: true, id: true });
			var a42_nodes = children(a42);
			t165 = claim_text(a42_nodes, "4️⃣ After you figured the file path you're importing from, for each of the file, 🔁 repeat step 2️⃣ until no more new files to be found.");
			a42_nodes.forEach(detach);
			h34_nodes.forEach(detach);
			section8_nodes.forEach(detach);
			t166 = claim_space(nodes);
			section9 = claim_element(nodes, "SECTION", {});
			var section9_nodes = children(section9);
			h35 = claim_element(section9_nodes, "H3", {});
			var h35_nodes = children(h35);
			a43 = claim_element(h35_nodes, "A", { href: true, id: true });
			var a43_nodes = children(a43);
			t167 = claim_text(a43_nodes, "Assignment");
			a43_nodes.forEach(detach);
			h35_nodes.forEach(detach);
			t168 = claim_space(section9_nodes);
			p25 = claim_element(section9_nodes, "P", {});
			var p25_nodes = children(p25);
			a44 = claim_element(p25_nodes, "A", { href: true, rel: true });
			var a44_nodes = children(a44);
			t169 = claim_text(a44_nodes, "Test cases");
			a44_nodes.forEach(detach);
			p25_nodes.forEach(detach);
			t170 = claim_space(section9_nodes);
			p26 = claim_element(section9_nodes, "P", {});
			var p26_nodes = children(p26);
			t171 = claim_text(p26_nodes, "For each test cases, we provide the entry file, and we expect");
			p26_nodes.forEach(detach);
			t172 = claim_space(section9_nodes);
			p27 = claim_element(section9_nodes, "P", {});
			var p27_nodes = children(p27);
			t173 = claim_text(p27_nodes, "📝 Module");
			p27_nodes.forEach(detach);
			t174 = claim_space(section9_nodes);
			ul17 = claim_element(section9_nodes, "UL", {});
			var ul17_nodes = children(ul17);
			li48 = claim_element(ul17_nodes, "LI", {});
			var li48_nodes = children(li48);
			code6 = claim_element(li48_nodes, "CODE", {});
			var code6_nodes = children(code6);
			t175 = claim_text(code6_nodes, "filepath");
			code6_nodes.forEach(detach);
			li48_nodes.forEach(detach);
			t176 = claim_space(ul17_nodes);
			li49 = claim_element(ul17_nodes, "LI", {});
			var li49_nodes = children(li49);
			code7 = claim_element(li49_nodes, "CODE", {});
			var code7_nodes = children(code7);
			t177 = claim_text(code7_nodes, "dependencies");
			code7_nodes.forEach(detach);
			t178 = claim_text(li49_nodes, " -> list of Depedencies (see below 👇)");
			li49_nodes.forEach(detach);
			t179 = claim_space(ul17_nodes);
			li50 = claim_element(ul17_nodes, "LI", {});
			var li50_nodes = children(li50);
			code8 = claim_element(li50_nodes, "CODE", {});
			var code8_nodes = children(code8);
			t180 = claim_text(code8_nodes, "isEntryFile");
			code8_nodes.forEach(detach);
			t181 = claim_text(li50_nodes, " -> ");
			code9 = claim_element(li50_nodes, "CODE", {});
			var code9_nodes = children(code9);
			t182 = claim_text(code9_nodes, "true");
			code9_nodes.forEach(detach);
			t183 = claim_text(li50_nodes, " if it is the entry file / ");
			code10 = claim_element(li50_nodes, "CODE", {});
			var code10_nodes = children(code10);
			t184 = claim_text(code10_nodes, "false");
			code10_nodes.forEach(detach);
			t185 = claim_text(li50_nodes, " otherwise");
			li50_nodes.forEach(detach);
			ul17_nodes.forEach(detach);
			t186 = claim_space(section9_nodes);
			p28 = claim_element(section9_nodes, "P", {});
			var p28_nodes = children(p28);
			t187 = claim_text(p28_nodes, "📝 Depedencies");
			p28_nodes.forEach(detach);
			t188 = claim_space(section9_nodes);
			ul18 = claim_element(section9_nodes, "UL", {});
			var ul18_nodes = children(ul18);
			li51 = claim_element(ul18_nodes, "LI", {});
			var li51_nodes = children(li51);
			code11 = claim_element(li51_nodes, "CODE", {});
			var code11_nodes = children(code11);
			t189 = claim_text(code11_nodes, "module");
			code11_nodes.forEach(detach);
			t190 = claim_text(li51_nodes, " (see above ☝️)");
			li51_nodes.forEach(detach);
			t191 = claim_space(ul18_nodes);
			li52 = claim_element(ul18_nodes, "LI", {});
			var li52_nodes = children(li52);
			code12 = claim_element(li52_nodes, "CODE", {});
			var code12_nodes = children(code12);
			t192 = claim_text(code12_nodes, "exports");
			code12_nodes.forEach(detach);
			t193 = claim_text(li52_nodes, " -> list of var names you are importing, eg \"default\", \"measure\" ..");
			li52_nodes.forEach(detach);
			ul18_nodes.forEach(detach);
			t194 = claim_space(section9_nodes);
			p29 = claim_element(section9_nodes, "P", {});
			var p29_nodes = children(p29);
			t195 = claim_text(p29_nodes, "📝 If 2 module are importing the same module, both should be referring to the same module instance");
			p29_nodes.forEach(detach);
			t196 = claim_space(section9_nodes);
			pre4 = claim_element(section9_nodes, "PRE", { class: true });
			var pre4_nodes = children(pre4);
			pre4_nodes.forEach(detach);
			t197 = claim_space(section9_nodes);
			p30 = claim_element(section9_nodes, "P", {});
			var p30_nodes = children(p30);
			t198 = claim_text(p30_nodes, "📝 Be careful with circular dependency 🙈");
			p30_nodes.forEach(detach);
			section9_nodes.forEach(detach);
			t199 = claim_space(nodes);
			section10 = claim_element(nodes, "SECTION", {});
			var section10_nodes = children(section10);
			h23 = claim_element(section10_nodes, "H2", {});
			var h23_nodes = children(h23);
			a45 = claim_element(h23_nodes, "A", { href: true, id: true });
			var a45_nodes = children(a45);
			t200 = claim_text(a45_nodes, "Week 2 - Bundling");
			a45_nodes.forEach(detach);
			h23_nodes.forEach(detach);
			t201 = claim_space(section10_nodes);
			p31 = claim_element(section10_nodes, "P", {});
			var p31_nodes = children(p31);
			t202 = claim_text(p31_nodes, "🤔 How do you bundle modules into 1 file?");
			p31_nodes.forEach(detach);
			t203 = claim_space(section10_nodes);
			p32 = claim_element(section10_nodes, "P", {});
			var p32_nodes = children(p32);
			t204 = claim_text(p32_nodes, "After studying the 2 most popular bundlers, webpack and rollup, i found that the way they bundle are very different.");
			p32_nodes.forEach(detach);
			t205 = claim_space(section10_nodes);
			p33 = claim_element(section10_nodes, "P", {});
			var p33_nodes = children(p33);
			t206 = claim_text(p33_nodes, "Both of them come a long way, I believe both has its own pros and cons");
			p33_nodes.forEach(detach);
			t207 = claim_space(section10_nodes);
			pre5 = claim_element(section10_nodes, "PRE", { class: true });
			var pre5_nodes = children(pre5);
			pre5_nodes.forEach(detach);
			section10_nodes.forEach(detach);
			t208 = claim_space(nodes);
			section11 = claim_element(nodes, "SECTION", {});
			var section11_nodes = children(section11);
			h36 = claim_element(section11_nodes, "H3", {});
			var h36_nodes = children(h36);
			a46 = claim_element(h36_nodes, "A", { href: true, id: true });
			var a46_nodes = children(a46);
			t209 = claim_text(a46_nodes, "🔭 Observation: Bundle using webpack");
			a46_nodes.forEach(detach);
			h36_nodes.forEach(detach);
			t210 = claim_space(section11_nodes);
			ul19 = claim_element(section11_nodes, "UL", {});
			var ul19_nodes = children(ul19);
			li53 = claim_element(ul19_nodes, "LI", {});
			var li53_nodes = children(li53);
			t211 = claim_text(li53_nodes, "📝 each module wrap in a function");
			li53_nodes.forEach(detach);
			t212 = claim_space(ul19_nodes);
			li54 = claim_element(ul19_nodes, "LI", {});
			var li54_nodes = children(li54);
			t213 = claim_text(li54_nodes, "📝 a module map, module identifier as key");
			li54_nodes.forEach(detach);
			t214 = claim_space(ul19_nodes);
			li55 = claim_element(ul19_nodes, "LI", {});
			var li55_nodes = children(li55);
			t215 = claim_text(li55_nodes, "📝 a runtime glue code to piece modules together");
			li55_nodes.forEach(detach);
			t216 = claim_space(ul19_nodes);
			li56 = claim_element(ul19_nodes, "LI", {});
			var li56_nodes = children(li56);
			t217 = claim_text(li56_nodes, "📝 calling module function, with 2 parameters, 1 to assign the exports of the module, 1 to \"require\" other modules");
			li56_nodes.forEach(detach);
			ul19_nodes.forEach(detach);
			t218 = claim_space(section11_nodes);
			pre6 = claim_element(section11_nodes, "PRE", { class: true });
			var pre6_nodes = children(pre6);
			pre6_nodes.forEach(detach);
			section11_nodes.forEach(detach);
			t219 = claim_space(nodes);
			section12 = claim_element(nodes, "SECTION", {});
			var section12_nodes = children(section12);
			h4 = claim_element(section12_nodes, "H4", {});
			var h4_nodes = children(h4);
			a47 = claim_element(h4_nodes, "A", { href: true, id: true });
			var a47_nodes = children(a47);
			t220 = claim_text(a47_nodes, "🔭 Observation: Bundle using rollup");
			a47_nodes.forEach(detach);
			h4_nodes.forEach(detach);
			t221 = claim_space(section12_nodes);
			ul20 = claim_element(section12_nodes, "UL", {});
			var ul20_nodes = children(ul20);
			li57 = claim_element(ul20_nodes, "LI", {});
			var li57_nodes = children(li57);
			t222 = claim_text(li57_nodes, "📝 much flatter bundle");
			li57_nodes.forEach(detach);
			t223 = claim_space(ul20_nodes);
			li58 = claim_element(ul20_nodes, "LI", {});
			var li58_nodes = children(li58);
			t224 = claim_text(li58_nodes, "📝 module are concatenated in topological order");
			li58_nodes.forEach(detach);
			t225 = claim_space(ul20_nodes);
			li59 = claim_element(ul20_nodes, "LI", {});
			var li59_nodes = children(li59);
			t226 = claim_text(li59_nodes, "📝 exports and imports are removed by renaming them to the same variable name");
			li59_nodes.forEach(detach);
			t227 = claim_space(ul20_nodes);
			li60 = claim_element(ul20_nodes, "LI", {});
			var li60_nodes = children(li60);
			t228 = claim_text(li60_nodes, "📝 any variable in module scope that may have naming conflict with other variables are renamed");
			li60_nodes.forEach(detach);
			ul20_nodes.forEach(detach);
			t229 = claim_space(section12_nodes);
			pre7 = claim_element(section12_nodes, "PRE", { class: true });
			var pre7_nodes = children(pre7);
			pre7_nodes.forEach(detach);
			section12_nodes.forEach(detach);
			t230 = claim_space(nodes);
			section13 = claim_element(nodes, "SECTION", {});
			var section13_nodes = children(section13);
			h37 = claim_element(section13_nodes, "H3", {});
			var h37_nodes = children(h37);
			a48 = claim_element(h37_nodes, "A", { href: true, id: true });
			var a48_nodes = children(a48);
			t231 = claim_text(a48_nodes, "📤 Output target of bundling");
			a48_nodes.forEach(detach);
			h37_nodes.forEach(detach);
			t232 = claim_space(section13_nodes);
			ul21 = claim_element(section13_nodes, "UL", {});
			var ul21_nodes = children(ul21);
			li61 = claim_element(ul21_nodes, "LI", {});
			var li61_nodes = children(li61);
			p34 = claim_element(li61_nodes, "P", {});
			var p34_nodes = children(p34);
			t233 = claim_text(p34_nodes, "IIFE (the most common target, we want to execute the script)");
			p34_nodes.forEach(detach);
			li61_nodes.forEach(detach);
			t234 = claim_space(ul21_nodes);
			li62 = claim_element(ul21_nodes, "LI", {});
			var li62_nodes = children(li62);
			p35 = claim_element(li62_nodes, "P", {});
			var p35_nodes = children(p35);
			t235 = claim_text(p35_nodes, "CJS, ESM, UMD, AMD, ... (we want to bundle a library, exports of entry file is exported in selected module format)");
			p35_nodes.forEach(detach);
			li62_nodes.forEach(detach);
			t236 = claim_space(ul21_nodes);
			li63 = claim_element(ul21_nodes, "LI", {});
			var li63_nodes = children(li63);
			p36 = claim_element(li63_nodes, "P", {});
			var p36_nodes = children(p36);
			t237 = claim_text(p36_nodes, "🔗 ");
			a49 = claim_element(p36_nodes, "A", { href: true, rel: true });
			var a49_nodes = children(a49);
			t238 = claim_text(a49_nodes, "https://webpack.js.org/configuration/output/#outputlibrarytarget");
			a49_nodes.forEach(detach);
			p36_nodes.forEach(detach);
			li63_nodes.forEach(detach);
			t239 = claim_space(ul21_nodes);
			li64 = claim_element(ul21_nodes, "LI", {});
			var li64_nodes = children(li64);
			p37 = claim_element(li64_nodes, "P", {});
			var p37_nodes = children(p37);
			t240 = claim_text(p37_nodes, "🔗 ");
			a50 = claim_element(p37_nodes, "A", { href: true, rel: true });
			var a50_nodes = children(a50);
			t241 = claim_text(a50_nodes, "https://rollupjs.org/guide/en/#configuration-files");
			a50_nodes.forEach(detach);
			p37_nodes.forEach(detach);
			li64_nodes.forEach(detach);
			ul21_nodes.forEach(detach);
			section13_nodes.forEach(detach);
			t242 = claim_space(nodes);
			section14 = claim_element(nodes, "SECTION", {});
			var section14_nodes = children(section14);
			h38 = claim_element(section14_nodes, "H3", {});
			var h38_nodes = children(h38);
			a51 = claim_element(h38_nodes, "A", { href: true, id: true });
			var a51_nodes = children(a51);
			t243 = claim_text(a51_nodes, "Assignment");
			a51_nodes.forEach(detach);
			h38_nodes.forEach(detach);
			t244 = claim_space(section14_nodes);
			p38 = claim_element(section14_nodes, "P", {});
			var p38_nodes = children(p38);
			a52 = claim_element(p38_nodes, "A", { href: true, rel: true });
			var a52_nodes = children(a52);
			t245 = claim_text(a52_nodes, "Test cases");
			a52_nodes.forEach(detach);
			p38_nodes.forEach(detach);
			t246 = claim_space(section14_nodes);
			p39 = claim_element(section14_nodes, "P", {});
			var p39_nodes = children(p39);
			t247 = claim_text(p39_nodes, "Here are some of the the interesting test cases:");
			p39_nodes.forEach(detach);
			t248 = claim_space(section14_nodes);
			p40 = claim_element(section14_nodes, "P", {});
			var p40_nodes = children(p40);
			t249 = claim_text(p40_nodes, "🧪 Able to handle re-export nicely");
			p40_nodes.forEach(detach);
			t250 = claim_space(section14_nodes);
			pre8 = claim_element(section14_nodes, "PRE", { class: true });
			var pre8_nodes = children(pre8);
			pre8_nodes.forEach(detach);
			t251 = claim_space(section14_nodes);
			p41 = claim_element(section14_nodes, "P", {});
			var p41_nodes = children(p41);
			t252 = claim_text(p41_nodes, "🧪 Importing the same file twice, but are you able to make sure it's gonna be evaluated only once?");
			p41_nodes.forEach(detach);
			t253 = claim_space(section14_nodes);
			pre9 = claim_element(section14_nodes, "PRE", { class: true });
			var pre9_nodes = children(pre9);
			pre9_nodes.forEach(detach);
			t254 = claim_space(section14_nodes);
			p42 = claim_element(section14_nodes, "P", {});
			var p42_nodes = children(p42);
			t255 = claim_text(p42_nodes, "🧪 The dreaded circular dependency, are you able to make sure to get the value of ");
			code13 = claim_element(p42_nodes, "CODE", {});
			var code13_nodes = children(code13);
			t256 = claim_text(code13_nodes, "a");
			code13_nodes.forEach(detach);
			t257 = claim_text(p42_nodes, ", ");
			code14 = claim_element(p42_nodes, "CODE", {});
			var code14_nodes = children(code14);
			t258 = claim_text(code14_nodes, "b");
			code14_nodes.forEach(detach);
			t259 = claim_text(p42_nodes, ", ");
			code15 = claim_element(p42_nodes, "CODE", {});
			var code15_nodes = children(code15);
			t260 = claim_text(code15_nodes, "c");
			code15_nodes.forEach(detach);
			t261 = claim_text(p42_nodes, " in all the files?");
			p42_nodes.forEach(detach);
			t262 = claim_space(section14_nodes);
			pre10 = claim_element(section14_nodes, "PRE", { class: true });
			var pre10_nodes = children(pre10);
			pre10_nodes.forEach(detach);
			t263 = claim_space(section14_nodes);
			p43 = claim_element(section14_nodes, "P", {});
			var p43_nodes = children(p43);
			t264 = claim_text(p43_nodes, "🧪 Are you able to export a variable before it is declared? Does the order matter?");
			p43_nodes.forEach(detach);
			t265 = claim_space(section14_nodes);
			pre11 = claim_element(section14_nodes, "PRE", { class: true });
			var pre11_nodes = children(pre11);
			pre11_nodes.forEach(detach);
			t266 = claim_space(section14_nodes);
			p44 = claim_element(section14_nodes, "P", {});
			var p44_nodes = children(p44);
			t267 = claim_text(p44_nodes, "🧪 imported variables is not a normal variable, it's a live binding of the exported variable. Are you able to make sure that the value of ");
			code16 = claim_element(p44_nodes, "CODE", {});
			var code16_nodes = children(code16);
			t268 = claim_text(code16_nodes, "count");
			code16_nodes.forEach(detach);
			t269 = claim_text(p44_nodes, " is always up to date?");
			p44_nodes.forEach(detach);
			t270 = claim_space(section14_nodes);
			pre12 = claim_element(section14_nodes, "PRE", { class: true });
			var pre12_nodes = children(pre12);
			pre12_nodes.forEach(detach);
			t271 = claim_space(section14_nodes);
			p45 = claim_element(section14_nodes, "P", {});
			var p45_nodes = children(p45);
			t272 = claim_text(p45_nodes, "📝 Be careful with circular dependency 🙈");
			p45_nodes.forEach(detach);
			section14_nodes.forEach(detach);
			t273 = claim_space(nodes);
			section15 = claim_element(nodes, "SECTION", {});
			var section15_nodes = children(section15);
			h39 = claim_element(section15_nodes, "H3", {});
			var h39_nodes = children(h39);
			a53 = claim_element(h39_nodes, "A", { href: true, id: true });
			var a53_nodes = children(a53);
			t274 = claim_text(a53_nodes, "🔨 Manipulating AST");
			a53_nodes.forEach(detach);
			h39_nodes.forEach(detach);
			t275 = claim_space(section15_nodes);
			p46 = claim_element(section15_nodes, "P", {});
			var p46_nodes = children(p46);
			t276 = claim_text(p46_nodes, "📖  ");
			a54 = claim_element(p46_nodes, "A", { href: true, rel: true });
			var a54_nodes = children(a54);
			t277 = claim_text(a54_nodes, "manipulating ast with javascript");
			a54_nodes.forEach(detach);
			t278 = claim_text(p46_nodes, " (generic)\n📖  ");
			a55 = claim_element(p46_nodes, "A", { href: true, rel: true });
			var a55_nodes = children(a55);
			t279 = claim_text(a55_nodes, "babel plugin handbook");
			a55_nodes.forEach(detach);
			t280 = claim_text(p46_nodes, " (babel)");
			p46_nodes.forEach(detach);
			section15_nodes.forEach(detach);
			this.h();
		},
		h() {
			attr(a0, "href", "#background");
			attr(a1, "href", "#prior-art");
			attr(a2, "href", "#week-resolving");
			attr(a3, "href", "#why-module-bundler");
			attr(a4, "href", "#we-start-from-an-entry-file");
			attr(a5, "href", "#we-read-the-file-and-determine-what-is-being-imported-into-this-file");
			attr(a6, "href", "#now-knowing-what-are-the-names-you-are-importing-from-you-need-to-figure-out-their-actual-file-path");
			attr(a7, "href", "#after-you-figured-the-file-path-you-re-importing-from-for-each-of-the-file-repeat-step-until-no-more-new-files-to-be-found");
			attr(a8, "href", "#assignment");
			attr(a9, "href", "#week-bundling");
			attr(a10, "href", "#observation-bundle-using-webpack");
			attr(a11, "href", "#observation-bundle-using-rollup");
			attr(a12, "href", "#output-target-of-bundling");
			attr(a13, "href", "#assignment");
			attr(a14, "href", "#manipulating-ast");
			attr(ul3, "class", "sitemap");
			attr(ul3, "id", "sitemap");
			attr(ul3, "role", "navigation");
			attr(ul3, "aria-label", "Table of Contents");
			attr(a15, "href", "#background");
			attr(a15, "id", "background");
			attr(a16, "href", "#prior-art");
			attr(a16, "id", "prior-art");
			attr(a17, "href", "https://twitter.com/wSokra");
			attr(a17, "rel", "nofollow");
			attr(a18, "href", "https://youtube.com/watch?v=UNMkLHzofQI");
			attr(a18, "rel", "nofollow");
			attr(a19, "href", "https://twitter.com/ronenamiel");
			attr(a19, "rel", "nofollow");
			attr(a20, "href", "https://youtube.com/watch?v=Gc9-7PBqOC8");
			attr(a20, "rel", "nofollow");
			attr(a21, "href", "https://freecodecamp.org/news/lets-learn-how-module-bundlers-work-and-then-write-one-ourselves-b2e3fe6c88ae/");
			attr(a21, "rel", "nofollow");
			attr(a22, "href", "#week-resolving");
			attr(a22, "id", "week-resolving");
			attr(a23, "href", "#why-module-bundler");
			attr(a23, "id", "why-module-bundler");
			attr(source0, "type", "image/webp");
			attr(source0, "srcset", __build_img_webp__0);
			attr(source1, "type", "image/jpeg");
			attr(source1, "srcset", __build_img__0);
			attr(img0, "title", "null");
			attr(img0, "alt", "why bundling");
			attr(img0, "data-src", __build_img__0);
			attr(img0, "loading", "lazy");
			attr(source2, "type", "image/webp");
			attr(source2, "srcset", __build_img_webp__1);
			attr(source3, "type", "image/jpeg");
			attr(source3, "srcset", __build_img__1);
			attr(img1, "title", "null");
			attr(img1, "alt", "relationship within a bundle");
			attr(img1, "data-src", __build_img__1);
			attr(img1, "loading", "lazy");
			attr(a24, "href", "#we-start-from-an-entry-file");
			attr(a24, "id", "we-start-from-an-entry-file");
			attr(a25, "href", "#we-read-the-file-and-determine-what-is-being-imported-into-this-file");
			attr(a25, "id", "we-read-the-file-and-determine-what-is-being-imported-into-this-file");
			attr(pre0, "class", "language-js");
			attr(source4, "type", "image/webp");
			attr(source4, "srcset", __build_img_webp__2);
			attr(source5, "type", "image/jpeg");
			attr(source5, "srcset", __build_img__2);
			attr(img2, "title", "null");
			attr(img2, "alt", "ast explorer");
			attr(img2, "data-src", __build_img__2);
			attr(img2, "loading", "lazy");
			attr(a26, "href", "https://babeljs.io/docs/en/babel-core");
			attr(a26, "rel", "nofollow");
			attr(a27, "href", "https://github.com/acornjs/acorn");
			attr(a27, "rel", "nofollow");
			attr(a28, "href", "https://github.com/jquery/esprima");
			attr(a28, "rel", "nofollow");
			attr(a29, "href", "https://github.com/guybedford/es-module-lexer");
			attr(a29, "rel", "nofollow");
			attr(pre1, "class", "language-js");
			attr(a30, "href", "https://babeljs.io/docs/en/babel-traverse");
			attr(a30, "rel", "nofollow");
			attr(a31, "href", "https://github.com/acornjs/acorn/tree/master/acorn-walk");
			attr(a31, "rel", "nofollow");
			attr(a32, "href", "https://github.com/Rich-Harris/estree-walker");
			attr(a32, "rel", "nofollow");
			attr(pre2, "class", "language-js");
			attr(a33, "href", "https://astexplorer.net");
			attr(a33, "rel", "nofollow");
			attr(a34, "href", "https://lihautan.com/babel-ast-explorer/");
			attr(a34, "rel", "nofollow");
			attr(a35, "href", "https://github.com/estree/estree");
			attr(a35, "rel", "nofollow");
			attr(a36, "href", "https://lihautan.com/manipulating-ast-with-javascript");
			attr(a36, "rel", "nofollow");
			attr(a37, "href", "https://lihautan.com/json-parser-with-javascript");
			attr(a37, "rel", "nofollow");
			attr(a38, "href", "#now-knowing-what-are-the-names-you-are-importing-from-you-need-to-figure-out-their-actual-file-path");
			attr(a38, "id", "now-knowing-what-are-the-names-you-are-importing-from-you-need-to-figure-out-their-actual-file-path");
			attr(pre3, "class", "language-js");
			attr(a39, "href", "https://nodejs.org/api/modules.html#modules_all_together");
			attr(a39, "rel", "nofollow");
			attr(source6, "type", "image/webp");
			attr(source6, "srcset", __build_img_webp__3);
			attr(source7, "type", "image/jpeg");
			attr(source7, "srcset", __build_img__3);
			attr(img3, "title", "null");
			attr(img3, "alt", "node js module resolution algorithm");
			attr(img3, "data-src", __build_img__3);
			attr(img3, "loading", "lazy");
			attr(a40, "href", "https://github.com/webpack/enhanced-resolve");
			attr(a40, "rel", "nofollow");
			attr(a41, "href", "https://typescriptlang.org/docs/handbook/module-resolution.html");
			attr(a41, "rel", "nofollow");
			attr(a42, "href", "#after-you-figured-the-file-path-you-re-importing-from-for-each-of-the-file-repeat-step-until-no-more-new-files-to-be-found");
			attr(a42, "id", "after-you-figured-the-file-path-you-re-importing-from-for-each-of-the-file-repeat-step-until-no-more-new-files-to-be-found");
			attr(a43, "href", "#assignment");
			attr(a43, "id", "assignment");
			attr(a44, "href", "https://github.com/tanhauhau/rk-webpack-clone");
			attr(a44, "rel", "nofollow");
			attr(pre4, "class", "language-js");
			attr(a45, "href", "#week-bundling");
			attr(a45, "id", "week-bundling");
			attr(pre5, "class", "language-js");
			attr(a46, "href", "#observation-bundle-using-webpack");
			attr(a46, "id", "observation-bundle-using-webpack");
			attr(pre6, "class", "language-js");
			attr(a47, "href", "#observation-bundle-using-rollup");
			attr(a47, "id", "observation-bundle-using-rollup");
			attr(pre7, "class", "language-js");
			attr(a48, "href", "#output-target-of-bundling");
			attr(a48, "id", "output-target-of-bundling");
			attr(a49, "href", "https://webpack.js.org/configuration/output/#outputlibrarytarget");
			attr(a49, "rel", "nofollow");
			attr(a50, "href", "https://rollupjs.org/guide/en/#configuration-files");
			attr(a50, "rel", "nofollow");
			attr(a51, "href", "#assignment");
			attr(a51, "id", "assignment");
			attr(a52, "href", "https://github.com/tanhauhau/rk-webpack-clone");
			attr(a52, "rel", "nofollow");
			attr(pre8, "class", "language-js");
			attr(pre9, "class", "language-js");
			attr(pre10, "class", "language-js");
			attr(pre11, "class", "language-js");
			attr(pre12, "class", "language-js");
			attr(a53, "href", "#manipulating-ast");
			attr(a53, "id", "manipulating-ast");
			attr(a54, "href", "https://lihautan.com/manipulating-ast-with-javascript/");
			attr(a54, "rel", "nofollow");
			attr(a55, "href", "https://github.com/jamiebuilds/babel-handbook/blob/master/translations/en/plugin-handbook.md");
			attr(a55, "rel", "nofollow");
		},
		m(target, anchor) {
			insert(target, section0, anchor);
			append(section0, ul3);
			append(ul3, li0);
			append(li0, a0);
			append(a0, t0);
			append(ul3, li1);
			append(li1, a1);
			append(a1, t1);
			append(ul3, li2);
			append(li2, a2);
			append(a2, t2);
			append(ul3, ul0);
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
			append(ul3, li9);
			append(li9, a9);
			append(a9, t9);
			append(ul3, ul2);
			append(ul2, li10);
			append(li10, a10);
			append(a10, t10);
			append(ul2, ul1);
			append(ul1, li11);
			append(li11, a11);
			append(a11, t11);
			append(ul2, li12);
			append(li12, a12);
			append(a12, t12);
			append(ul2, li13);
			append(li13, a13);
			append(a13, t13);
			append(ul2, li14);
			append(li14, a14);
			append(a14, t14);
			insert(target, t15, anchor);
			insert(target, section1, anchor);
			append(section1, h20);
			append(h20, a15);
			append(a15, t16);
			append(section1, t17);
			append(section1, p0);
			append(p0, t18);
			append(section1, t19);
			append(section1, p1);
			append(p1, t20);
			append(p1, strong);
			append(strong, t21);
			append(p1, t22);
			insert(target, t23, anchor);
			insert(target, section2, anchor);
			append(section2, h21);
			append(h21, a16);
			append(a16, t24);
			append(section2, t25);
			append(section2, ul4);
			append(ul4, li15);
			append(li15, t26);
			append(li15, a17);
			append(a17, t27);
			append(li15, t28);
			append(li15, a18);
			append(a18, t29);
			append(ul4, t30);
			append(ul4, li16);
			append(li16, t31);
			append(li16, a19);
			append(a19, t32);
			append(li16, t33);
			append(li16, a20);
			append(a20, t34);
			append(ul4, t35);
			append(ul4, li17);
			append(li17, t36);
			append(li17, a21);
			append(a21, t37);
			insert(target, t38, anchor);
			insert(target, section3, anchor);
			append(section3, h22);
			append(h22, a22);
			append(a22, t39);
			insert(target, t40, anchor);
			insert(target, section4, anchor);
			append(section4, h30);
			append(h30, a23);
			append(a23, t41);
			append(section4, t42);
			append(section4, p2);
			append(p2, t43);
			append(section4, t44);
			append(section4, p3);
			append(p3, t45);
			append(section4, t46);
			append(section4, p4);
			append(p4, picture0);
			append(picture0, source0);
			append(picture0, source1);
			append(picture0, img0);
			append(section4, t47);
			append(section4, p5);
			append(p5, t48);
			append(section4, t49);
			append(section4, p6);
			append(p6, t50);
			append(section4, t51);
			append(section4, ul5);
			append(ul5, li18);
			append(li18, t52);
			append(ul5, t53);
			append(ul5, li19);
			append(li19, t54);
			append(ul5, t55);
			append(ul5, li20);
			append(li20, t56);
			append(section4, t57);
			append(section4, p7);
			append(p7, t58);
			append(section4, t59);
			append(section4, p8);
			append(p8, picture1);
			append(picture1, source2);
			append(picture1, source3);
			append(picture1, img1);
			append(section4, t60);
			append(section4, p9);
			append(p9, t61);
			insert(target, t62, anchor);
			insert(target, section5, anchor);
			append(section5, h31);
			append(h31, a24);
			append(a24, t63);
			append(section5, t64);
			append(section5, p10);
			append(p10, t65);
			insert(target, t66, anchor);
			insert(target, section6, anchor);
			append(section6, h32);
			append(h32, a25);
			append(a25, t67);
			append(section6, t68);
			append(section6, pre0);
			pre0.innerHTML = raw0_value;
			append(section6, t69);
			append(section6, p11);
			append(p11, t70);
			append(section6, t71);
			append(section6, ul6);
			append(ul6, li21);
			append(li21, code0);
			append(code0, t72);
			append(ul6, t73);
			append(ul6, li22);
			append(li22, code1);
			append(code1, t74);
			append(ul6, t75);
			append(ul6, li23);
			append(li23, code2);
			append(code2, t76);
			append(section6, t77);
			append(section6, p12);
			append(p12, t78);
			append(section6, t79);
			append(section6, p13);
			append(p13, t80);
			append(section6, t81);
			append(section6, p14);
			append(p14, t82);
			append(section6, t83);
			append(section6, ul7);
			append(ul7, li24);
			append(li24, code3);
			append(code3, t84);
			append(li24, t85);
			append(ul7, t86);
			append(ul7, li25);
			append(li25, code4);
			append(code4, t87);
			append(li25, t88);
			append(section6, t89);
			append(section6, p15);
			append(p15, picture2);
			append(picture2, source4);
			append(picture2, source5);
			append(picture2, img2);
			append(section6, t90);
			append(section6, p16);
			append(p16, t91);
			append(section6, t92);
			append(section6, ul8);
			append(ul8, li26);
			append(li26, t93);
			append(li26, a26);
			append(a26, t94);
			append(ul8, t95);
			append(ul8, li27);
			append(li27, t96);
			append(li27, a27);
			append(a27, t97);
			append(ul8, t98);
			append(ul8, li28);
			append(li28, t99);
			append(li28, a28);
			append(a28, t100);
			append(ul8, t101);
			append(ul8, li29);
			append(li29, t102);
			append(li29, a29);
			append(a29, t103);
			append(section6, t104);
			append(section6, pre1);
			pre1.innerHTML = raw1_value;
			append(section6, t105);
			append(section6, p17);
			append(p17, t106);
			append(section6, t107);
			append(section6, ul9);
			append(ul9, li30);
			append(li30, t108);
			append(li30, a30);
			append(a30, t109);
			append(ul9, t110);
			append(ul9, li31);
			append(li31, t111);
			append(li31, a31);
			append(a31, t112);
			append(ul9, t113);
			append(ul9, li32);
			append(li32, t114);
			append(li32, a32);
			append(a32, t115);
			append(section6, t116);
			append(section6, pre2);
			pre2.innerHTML = raw2_value;
			append(section6, t117);
			append(section6, p18);
			append(p18, t118);
			append(section6, t119);
			append(section6, ul13);
			append(ul13, li35);
			append(li35, t120);
			append(li35, ul10);
			append(ul10, li33);
			append(li33, a33);
			append(a33, t121);
			append(ul10, t122);
			append(ul10, li34);
			append(li34, a34);
			append(a34, t123);
			append(ul13, t124);
			append(ul13, li37);
			append(li37, t125);
			append(li37, ul11);
			append(ul11, li36);
			append(li36, a35);
			append(a35, t126);
			append(ul13, t127);
			append(ul13, li40);
			append(li40, t128);
			append(li40, ul12);
			append(ul12, li38);
			append(li38, a36);
			append(a36, t129);
			append(ul12, t130);
			append(ul12, li39);
			append(li39, a37);
			append(a37, t131);
			insert(target, t132, anchor);
			insert(target, section7, anchor);
			append(section7, h33);
			append(h33, a38);
			append(a38, t133);
			append(section7, t134);
			append(section7, p19);
			append(p19, t135);
			append(section7, t136);
			append(section7, ul14);
			append(ul14, li41);
			append(li41, t137);
			append(ul14, t138);
			append(ul14, li42);
			append(li42, t139);
			append(section7, t140);
			append(section7, pre3);
			pre3.innerHTML = raw3_value;
			append(section7, t141);
			append(section7, p20);
			append(p20, t142);
			append(p20, a39);
			append(a39, t143);
			append(section7, t144);
			append(section7, p21);
			append(p21, t145);
			append(section7, t146);
			append(section7, p22);
			append(p22, t147);
			append(section7, t148);
			append(section7, ul15);
			append(ul15, li43);
			append(li43, t149);
			append(ul15, t150);
			append(ul15, li44);
			append(li44, t151);
			append(ul15, t152);
			append(ul15, li45);
			append(li45, t153);
			append(section7, t154);
			append(section7, p23);
			append(p23, picture3);
			append(picture3, source6);
			append(picture3, source7);
			append(picture3, img3);
			append(section7, t155);
			append(section7, p24);
			append(p24, t156);
			append(section7, t157);
			append(section7, ul16);
			append(ul16, li46);
			append(li46, t158);
			append(li46, a40);
			append(a40, code5);
			append(code5, t159);
			append(li46, t160);
			append(ul16, t161);
			append(ul16, li47);
			append(li47, t162);
			append(li47, a41);
			append(a41, t163);
			insert(target, t164, anchor);
			insert(target, section8, anchor);
			append(section8, h34);
			append(h34, a42);
			append(a42, t165);
			insert(target, t166, anchor);
			insert(target, section9, anchor);
			append(section9, h35);
			append(h35, a43);
			append(a43, t167);
			append(section9, t168);
			append(section9, p25);
			append(p25, a44);
			append(a44, t169);
			append(section9, t170);
			append(section9, p26);
			append(p26, t171);
			append(section9, t172);
			append(section9, p27);
			append(p27, t173);
			append(section9, t174);
			append(section9, ul17);
			append(ul17, li48);
			append(li48, code6);
			append(code6, t175);
			append(ul17, t176);
			append(ul17, li49);
			append(li49, code7);
			append(code7, t177);
			append(li49, t178);
			append(ul17, t179);
			append(ul17, li50);
			append(li50, code8);
			append(code8, t180);
			append(li50, t181);
			append(li50, code9);
			append(code9, t182);
			append(li50, t183);
			append(li50, code10);
			append(code10, t184);
			append(li50, t185);
			append(section9, t186);
			append(section9, p28);
			append(p28, t187);
			append(section9, t188);
			append(section9, ul18);
			append(ul18, li51);
			append(li51, code11);
			append(code11, t189);
			append(li51, t190);
			append(ul18, t191);
			append(ul18, li52);
			append(li52, code12);
			append(code12, t192);
			append(li52, t193);
			append(section9, t194);
			append(section9, p29);
			append(p29, t195);
			append(section9, t196);
			append(section9, pre4);
			pre4.innerHTML = raw4_value;
			append(section9, t197);
			append(section9, p30);
			append(p30, t198);
			insert(target, t199, anchor);
			insert(target, section10, anchor);
			append(section10, h23);
			append(h23, a45);
			append(a45, t200);
			append(section10, t201);
			append(section10, p31);
			append(p31, t202);
			append(section10, t203);
			append(section10, p32);
			append(p32, t204);
			append(section10, t205);
			append(section10, p33);
			append(p33, t206);
			append(section10, t207);
			append(section10, pre5);
			pre5.innerHTML = raw5_value;
			insert(target, t208, anchor);
			insert(target, section11, anchor);
			append(section11, h36);
			append(h36, a46);
			append(a46, t209);
			append(section11, t210);
			append(section11, ul19);
			append(ul19, li53);
			append(li53, t211);
			append(ul19, t212);
			append(ul19, li54);
			append(li54, t213);
			append(ul19, t214);
			append(ul19, li55);
			append(li55, t215);
			append(ul19, t216);
			append(ul19, li56);
			append(li56, t217);
			append(section11, t218);
			append(section11, pre6);
			pre6.innerHTML = raw6_value;
			insert(target, t219, anchor);
			insert(target, section12, anchor);
			append(section12, h4);
			append(h4, a47);
			append(a47, t220);
			append(section12, t221);
			append(section12, ul20);
			append(ul20, li57);
			append(li57, t222);
			append(ul20, t223);
			append(ul20, li58);
			append(li58, t224);
			append(ul20, t225);
			append(ul20, li59);
			append(li59, t226);
			append(ul20, t227);
			append(ul20, li60);
			append(li60, t228);
			append(section12, t229);
			append(section12, pre7);
			pre7.innerHTML = raw7_value;
			insert(target, t230, anchor);
			insert(target, section13, anchor);
			append(section13, h37);
			append(h37, a48);
			append(a48, t231);
			append(section13, t232);
			append(section13, ul21);
			append(ul21, li61);
			append(li61, p34);
			append(p34, t233);
			append(ul21, t234);
			append(ul21, li62);
			append(li62, p35);
			append(p35, t235);
			append(ul21, t236);
			append(ul21, li63);
			append(li63, p36);
			append(p36, t237);
			append(p36, a49);
			append(a49, t238);
			append(ul21, t239);
			append(ul21, li64);
			append(li64, p37);
			append(p37, t240);
			append(p37, a50);
			append(a50, t241);
			insert(target, t242, anchor);
			insert(target, section14, anchor);
			append(section14, h38);
			append(h38, a51);
			append(a51, t243);
			append(section14, t244);
			append(section14, p38);
			append(p38, a52);
			append(a52, t245);
			append(section14, t246);
			append(section14, p39);
			append(p39, t247);
			append(section14, t248);
			append(section14, p40);
			append(p40, t249);
			append(section14, t250);
			append(section14, pre8);
			pre8.innerHTML = raw8_value;
			append(section14, t251);
			append(section14, p41);
			append(p41, t252);
			append(section14, t253);
			append(section14, pre9);
			pre9.innerHTML = raw9_value;
			append(section14, t254);
			append(section14, p42);
			append(p42, t255);
			append(p42, code13);
			append(code13, t256);
			append(p42, t257);
			append(p42, code14);
			append(code14, t258);
			append(p42, t259);
			append(p42, code15);
			append(code15, t260);
			append(p42, t261);
			append(section14, t262);
			append(section14, pre10);
			pre10.innerHTML = raw10_value;
			append(section14, t263);
			append(section14, p43);
			append(p43, t264);
			append(section14, t265);
			append(section14, pre11);
			pre11.innerHTML = raw11_value;
			append(section14, t266);
			append(section14, p44);
			append(p44, t267);
			append(p44, code16);
			append(code16, t268);
			append(p44, t269);
			append(section14, t270);
			append(section14, pre12);
			pre12.innerHTML = raw12_value;
			append(section14, t271);
			append(section14, p45);
			append(p45, t272);
			insert(target, t273, anchor);
			insert(target, section15, anchor);
			append(section15, h39);
			append(h39, a53);
			append(a53, t274);
			append(section15, t275);
			append(section15, p46);
			append(p46, t276);
			append(p46, a54);
			append(a54, t277);
			append(p46, t278);
			append(p46, a55);
			append(a55, t279);
			append(p46, t280);
		},
		p: noop,
		d(detaching) {
			if (detaching) detach(section0);
			if (detaching) detach(t15);
			if (detaching) detach(section1);
			if (detaching) detach(t23);
			if (detaching) detach(section2);
			if (detaching) detach(t38);
			if (detaching) detach(section3);
			if (detaching) detach(t40);
			if (detaching) detach(section4);
			if (detaching) detach(t62);
			if (detaching) detach(section5);
			if (detaching) detach(t66);
			if (detaching) detach(section6);
			if (detaching) detach(t132);
			if (detaching) detach(section7);
			if (detaching) detach(t164);
			if (detaching) detach(section8);
			if (detaching) detach(t166);
			if (detaching) detach(section9);
			if (detaching) detach(t199);
			if (detaching) detach(section10);
			if (detaching) detach(t208);
			if (detaching) detach(section11);
			if (detaching) detach(t219);
			if (detaching) detach(section12);
			if (detaching) detach(t230);
			if (detaching) detach(section13);
			if (detaching) detach(t242);
			if (detaching) detach(section14);
			if (detaching) detach(t273);
			if (detaching) detach(section15);
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
	"title": "Building a simplified webpack clone",
	"date": "2020-10-02T08:00:00Z",
	"tags": ["JavaScript", "webpack"],
	"slug": "building-a-simplified-webpack-clone",
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
