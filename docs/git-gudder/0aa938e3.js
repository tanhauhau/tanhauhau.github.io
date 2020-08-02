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

var __build_img_webp__23 = "89a51a224ed20d86.webp";

var __build_img__23 = "89a51a224ed20d86.png";

var __build_img_webp__22 = "c6f5adaa2d62d6a0.webp";

var __build_img__22 = "c6f5adaa2d62d6a0.png";

var __build_img_webp__21 = "ae144be0681b4ed4.webp";

var __build_img__21 = "ae144be0681b4ed4.png";

var __build_img_webp__20 = "34ca5606390b28f5.webp";

var __build_img__20 = "34ca5606390b28f5.png";

var __build_img_webp__19 = "c7dedf32afca356b.webp";

var __build_img__19 = "c7dedf32afca356b.png";

var __build_img__18 = "34921f7344aa46e5.gif";

var __build_img_webp__17 = "2b060f92d0e23b63.webp";

var __build_img__17 = "2b060f92d0e23b63.png";

var __build_img_webp__16 = "2b060f92d0e23b63.webp";

var __build_img__16 = "2b060f92d0e23b63.png";

var __build_img_webp__15 = "fd3eb938981581e2.webp";

var __build_img__15 = "fd3eb938981581e2.png";

var __build_img_webp__14 = "355841674aa71990.webp";

var __build_img__14 = "355841674aa71990.png";

var __build_img_webp__13 = "f4f5e2a02869d046.webp";

var __build_img__13 = "f4f5e2a02869d046.png";

var __build_img_webp__11 = "b2e7cead9fe8c5c8.webp";

var __build_img__11 = "b2e7cead9fe8c5c8.jpg";

var __build_img__10 = "6cff0833729fbadb.gif";

var __build_img__9 = "475d4a996ddab5a8.gif";

var __build_img__8 = "949bbf6f9817c71a.gif";

var __build_img__7 = "49e8e341afc972f0.gif";

var __build_img__6 = "f911bb098d6b5bd0.gif";

var __build_img__5 = "8f2e6d6d994d95d3.gif";

var __build_img__4 = "43f5cfa399149816.gif";

var __build_img__3 = "6455262f1f1c176c.gif";

var __build_img__2 = "8abcb6ba74bc8300.gif";

var __build_img__1 = "610fbd9b1e091b6b.gif";

var __build_img__0 = "14b76240a1dacc59.gif";

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
					"@id": "https%3A%2F%2Flihautan.com%2Fgit-gudder",
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
			attr(meta11, "content", "https%3A%2F%2Flihautan.com%2Fgit-gudder");
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
							"@id": "https%3A%2F%2Flihautan.com%2Fgit-gudder",
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

/* content/talk/git-gudder/@@page-markup.svelte generated by Svelte v3.24.0 */

function create_default_slot(ctx) {
	let section0;
	let ul4;
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
	let ul2;
	let li9;
	let a9;
	let t9;
	let ul1;
	let li10;
	let a10;
	let t10;
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
	let li15;
	let a15;
	let t15;
	let li16;
	let a16;
	let t16;
	let li17;
	let a17;
	let t17;
	let ul3;
	let li18;
	let a18;
	let t18;
	let li19;
	let a19;
	let t19;
	let li20;
	let a20;
	let t20;
	let li21;
	let a21;
	let t21;
	let li22;
	let a22;
	let t22;
	let li23;
	let a23;
	let t23;
	let li24;
	let a24;
	let t24;
	let li25;
	let a25;
	let t25;
	let li26;
	let a26;
	let t26;
	let t27;
	let p0;
	let t28;
	let t29;
	let p1;
	let t30;
	let strong0;
	let t31;
	let t32;
	let em;
	let t33;
	let t34;
	let t35;
	let blockquote;
	let p2;
	let t36;
	let t37;
	let section1;
	let h20;
	let a27;
	let t38;
	let t39;
	let p3;
	let t40;
	let a28;
	let t41;
	let t42;
	let t43;
	let section2;
	let h21;
	let a29;
	let t44;
	let t45;
	let p4;
	let t46;
	let code0;
	let t47;
	let t48;
	let strong1;
	let t49;
	let t50;
	let strong2;
	let t51;
	let t52;
	let t53;
	let section3;
	let h30;
	let a30;
	let t54;
	let t55;
	let p5;
	let t56;
	let code1;
	let t57;
	let t58;
	let code2;
	let t59;
	let t60;
	let t61;
	let p6;
	let img0;
	let img0_src_value;
	let t62;
	let div0;
	let t63;
	let t64;
	let section4;
	let h31;
	let a31;
	let t65;
	let t66;
	let p7;
	let t67;
	let code3;
	let t68;
	let t69;
	let code4;
	let t70;
	let t71;
	let t72;
	let p8;
	let img1;
	let img1_src_value;
	let t73;
	let div1;
	let t74;
	let t75;
	let p9;
	let t76;
	let t77;
	let section5;
	let h32;
	let a32;
	let t78;
	let t79;
	let p10;
	let t80;
	let code5;
	let t81;
	let t82;
	let code6;
	let t83;
	let t84;
	let code7;
	let t85;
	let t86;
	let t87;
	let p11;
	let img2;
	let img2_src_value;
	let t88;
	let div2;
	let t89;
	let t90;
	let section6;
	let h22;
	let a33;
	let t91;
	let t92;
	let p12;
	let code8;
	let t93;
	let t94;
	let t95;
	let p13;
	let code9;
	let t96;
	let t97;
	let code10;
	let t98;
	let t99;
	let code11;
	let t100;
	let t101;
	let t102;
	let p14;
	let img3;
	let img3_src_value;
	let t103;
	let div3;
	let t104;
	let t105;
	let section7;
	let h23;
	let a34;
	let t106;
	let t107;
	let p15;
	let t108;
	let t109;
	let p16;
	let code12;
	let t110;
	let t111;
	let code13;
	let t112;
	let t113;
	let t114;
	let p17;
	let img4;
	let img4_src_value;
	let t115;
	let div4;
	let t116;
	let t117;
	let section8;
	let h24;
	let a35;
	let t118;
	let t119;
	let p18;
	let code14;
	let t120;
	let t121;
	let t122;
	let p19;
	let t123;
	let code15;
	let t124;
	let t125;
	let code16;
	let t126;
	let t127;
	let code17;
	let t128;
	let t129;
	let code18;
	let t130;
	let t131;
	let t132;
	let p20;
	let img5;
	let img5_src_value;
	let t133;
	let div5;
	let t134;
	let t135;
	let p21;
	let t136;
	let code19;
	let t137;
	let t138;
	let t139;
	let p22;
	let img6;
	let img6_src_value;
	let t140;
	let div6;
	let t141;
	let t142;
	let p23;
	let t143;
	let code20;
	let t144;
	let t145;
	let code21;
	let t146;
	let t147;
	let code22;
	let t148;
	let t149;
	let t150;
	let p24;
	let code23;
	let t151;
	let t152;
	let t153;
	let p25;
	let img7;
	let img7_src_value;
	let t154;
	let div7;
	let t155;
	let t156;
	let p26;
	let t157;
	let code24;
	let t158;
	let t159;
	let code25;
	let t160;
	let t161;
	let code26;
	let t162;
	let t163;
	let code27;
	let t164;
	let t165;
	let code28;
	let t166;
	let t167;
	let t168;
	let p27;
	let img8;
	let img8_src_value;
	let t169;
	let div8;
	let t170;
	let t171;
	let section9;
	let h25;
	let a36;
	let t172;
	let t173;
	let p28;
	let code29;
	let t174;
	let t175;
	let t176;
	let p29;
	let t177;
	let code30;
	let t178;
	let t179;
	let code31;
	let t180;
	let t181;
	let code32;
	let t182;
	let t183;
	let code33;
	let t184;
	let t185;
	let code34;
	let t186;
	let t187;
	let code35;
	let t188;
	let t189;
	let t190;
	let p30;
	let code36;
	let t191;
	let t192;
	let code37;
	let t193;
	let t194;
	let t195;
	let p31;
	let img9;
	let img9_src_value;
	let t196;
	let div9;
	let t197;
	let t198;
	let p32;
	let code38;
	let t199;
	let t200;
	let t201;
	let p33;
	let code39;
	let t202;
	let t203;
	let code40;
	let t204;
	let t205;
	let t206;
	let p34;
	let img10;
	let img10_src_value;
	let t207;
	let div10;
	let t208;
	let t209;
	let p35;
	let t210;
	let t211;
	let ul5;
	let li27;
	let code41;
	let t212;
	let t213;
	let li28;
	let code42;
	let t214;
	let t215;
	let li29;
	let code43;
	let t216;
	let t217;
	let p36;
	let picture0;
	let source0;
	let source1;
	let img11;
	let img11_src_value;
	let t218;
	let div11;
	let t219;
	let t220;
	let p37;
	let t221;
	let t222;
	let ul6;
	let li30;
	let code44;
	let t223;
	let t224;
	let code45;
	let t225;
	let t226;
	let code46;
	let t227;
	let t228;
	let code47;
	let t229;
	let t230;
	let t231;
	let li31;
	let t232;
	let code48;
	let t233;
	let t234;
	let code49;
	let t235;
	let t236;
	let code50;
	let t237;
	let t238;
	let code51;
	let t239;
	let t240;
	let code52;
	let t241;
	let t242;
	let t243;
	let li32;
	let t244;
	let code53;
	let t245;
	let t246;
	let code54;
	let t247;
	let t248;
	let t249;
	let li33;
	let t250;
	let code55;
	let t251;
	let t252;
	let code56;
	let t253;
	let t254;
	let code57;
	let t255;
	let t256;
	let code58;
	let t257;
	let t258;
	let t259;
	let li34;
	let t260;
	let code59;
	let t261;
	let t262;
	let code60;
	let t263;
	let t264;
	let code61;
	let t265;
	let t266;
	let t267;
	let section10;
	let h33;
	let a37;
	let t268;
	let t269;
	let p38;
	let code62;
	let t270;
	let t271;
	let t272;
	let p39;
	let picture1;
	let source2;
	let source3;
	let img12;
	let img12_src_value;
	let t273;
	let div12;
	let t274;
	let t275;
	let p40;
	let t276;
	let code63;
	let t277;
	let t278;
	let t279;
	let pre0;

	let raw0_value = `
<code class="language-">pick #2 commit msg 2
pick #3 commit msg 3
pick #4 commit msg 4
pick #5 commit msg 5
pick #6 commit msg 6

# Rebase #1..#6 onto #1 (5 commands)
#
# Commands:
# p, pick = use commit
# r, reword = use commit, but edit the commit message
# e, edit = use commit, but stop for amending
...</code>` + "";

	let t280;
	let section11;
	let h40;
	let a38;
	let t281;
	let t282;
	let p41;
	let t283;
	let t284;
	let p42;
	let picture2;
	let source4;
	let source5;
	let img13;
	let img13_src_value;
	let t285;
	let pre1;

	let raw1_value = `
<code class="language-">pick #2 commit msg 2
pick #3 commit msg 3
pick #4 commit msg 4
pick #5 commit msg 5
pick #6 commit msg 6</code>` + "";

	let t286;
	let section12;
	let h41;
	let a39;
	let t287;
	let t288;
	let p43;
	let t289;
	let t290;
	let p44;
	let picture3;
	let source6;
	let source7;
	let img14;
	let img14_src_value;
	let t291;
	let pre2;

	let raw2_value = `
<code class="language-">pick #2 commit msg 2
drop #3 commit msg 3
pick #4 commit msg 4
pick #5 commit msg 5
pick #6 commit msg 6</code>` + "";

	let t292;
	let section13;
	let h42;
	let a40;
	let t293;
	let t294;
	let p45;
	let t295;
	let code64;
	let t296;
	let t297;
	let code65;
	let t298;
	let t299;
	let code66;
	let t300;
	let t301;
	let t302;
	let p46;
	let picture4;
	let source8;
	let source9;
	let img15;
	let img15_src_value;
	let t303;
	let pre3;

	let raw3_value = `
<code class="language-">pick   #2 commit msg 2
squash #3 commit msg 3
pick   #4 commit msg 4
fixup  #5 commit msg 5
pick   #6 commit msg 6</code>` + "";

	let t304;
	let section14;
	let h43;
	let a41;
	let t305;
	let t306;
	let p47;
	let t307;
	let code67;
	let t308;
	let t309;
	let t310;
	let p48;
	let picture5;
	let source10;
	let source11;
	let img16;
	let img16_src_value;
	let t311;
	let pre4;

	let raw4_value = `
<code class="language-">pick   #2 commit msg 2
pick   #3 commit msg 3
break
pick   #4 commit msg 4
pick   #5 commit msg 5
pick   #6 commit msg 6</code>` + "";

	let t312;
	let section15;
	let h44;
	let a42;
	let t313;
	let t314;
	let p49;
	let t315;
	let t316;
	let p50;
	let picture6;
	let source12;
	let source13;
	let img17;
	let img17_src_value;
	let t317;
	let pre5;

	let raw5_value = `
<code class="language-">pick   #2 commit msg 2
edit   #3 commit msg 3
pick   #4 commit msg 4
pick   #5 commit msg 5
pick   #6 commit msg 6</code>` + "";

	let t318;
	let section16;
	let h34;
	let a43;
	let t319;
	let t320;
	let p51;
	let t321;
	let code68;
	let t322;
	let t323;
	let code69;
	let t324;
	let t325;
	let t326;
	let p52;
	let img18;
	let img18_src_value;
	let t327;
	let div13;
	let t328;
	let t329;
	let section17;
	let h35;
	let a44;
	let t330;
	let t331;
	let p53;
	let t332;
	let code70;
	let t333;
	let t334;
	let code71;
	let t335;
	let t336;
	let code72;
	let t337;
	let t338;
	let t339;
	let p54;
	let picture7;
	let source14;
	let source15;
	let img19;
	let img19_src_value;
	let t340;
	let p55;
	let code73;
	let t341;
	let t342;
	let code74;
	let t343;
	let t344;
	let t345;
	let p56;
	let picture8;
	let source16;
	let source17;
	let img20;
	let img20_src_value;
	let t346;
	let p57;
	let t347;
	let code75;
	let t348;
	let t349;
	let code76;
	let t350;
	let t351;
	let t352;
	let p58;
	let picture9;
	let source18;
	let source19;
	let img21;
	let img21_src_value;
	let t353;
	let p59;
	let t354;
	let code77;
	let t355;
	let t356;
	let strong3;
	let t357;
	let t358;
	let code78;
	let t359;
	let t360;
	let t361;
	let p60;
	let t362;
	let code79;
	let t363;
	let t364;
	let code80;
	let t365;
	let t366;
	let code81;
	let t367;
	let t368;
	let t369;
	let p61;
	let picture10;
	let source20;
	let source21;
	let img22;
	let img22_src_value;
	let t370;
	let p62;
	let t371;
	let code82;
	let t372;
	let t373;
	let code83;
	let t374;
	let t375;
	let t376;
	let p63;
	let t377;
	let code84;
	let t378;
	let t379;
	let code85;
	let t380;
	let t381;
	let code86;
	let t382;
	let t383;
	let t384;
	let p64;
	let picture11;
	let source22;
	let source23;
	let img23;
	let img23_src_value;
	let t385;
	let p65;
	let t386;
	let code87;
	let t387;
	let t388;
	let code88;
	let t389;
	let t390;
	let code89;
	let t391;
	let t392;
	let code90;
	let t393;
	let t394;
	let t395;
	let p66;
	let t396;
	let code91;
	let t397;
	let t398;
	let code92;
	let t399;
	let t400;
	let t401;
	let section18;
	let h26;
	let a45;
	let t402;
	let t403;
	let p67;
	let t404;
	let t405;
	let section19;
	let h36;
	let a46;
	let t406;
	let t407;
	let p68;
	let t408;
	let t409;
	let section20;
	let h37;
	let a47;
	let t410;
	let t411;
	let p69;
	let t412;
	let t413;
	let section21;
	let h38;
	let a48;
	let t414;
	let t415;
	let p70;
	let t416;
	let code93;
	let t417;
	let t418;
	let section22;
	let h39;
	let a49;
	let t419;
	let t420;
	let p71;
	let code94;
	let t421;
	let t422;
	let code95;
	let t423;
	let t424;
	let code96;
	let t425;
	let t426;
	let code97;
	let t427;
	let t428;
	let t429;
	let section23;
	let h310;
	let a50;
	let t430;
	let t431;
	let p72;
	let t432;
	let code98;
	let t433;
	let t434;
	let code99;
	let t435;
	let t436;
	let t437;
	let section24;
	let h311;
	let a51;
	let t438;
	let t439;
	let p73;
	let t440;
	let code100;
	let t441;
	let t442;
	let t443;
	let section25;
	let h27;
	let a52;
	let t444;
	let t445;
	let p74;
	let t446;
	let code101;
	let t447;
	let t448;
	let code102;
	let t449;
	let t450;
	let code103;
	let t451;
	let t452;
	let t453;
	let section26;
	let h28;
	let a53;
	let t454;
	let t455;
	let p75;
	let t456;
	let t457;
	let p76;
	let t458;
	let code104;
	let t459;
	let t460;
	let t461;
	let pre6;

	let raw6_value = `<code class="language-sh">$ git bisect start # starts the bisect session
$ git bisect bad v2.5.1 # specify the commit you know is bad
$ git bisect good v2.6.13 # specify the commit you knew were good</code>` + "";

	let t462;
	let p77;
	let t463;
	let code105;
	let t464;
	let t465;
	let code106;
	let t466;
	let t467;
	let code107;
	let t468;
	let t469;
	let code108;
	let t470;
	let t471;
	let code109;
	let t472;
	let t473;
	let t474;
	let pre7;

	let raw7_value = `
<code class="language-">Bisecting: 675 revisions left to test after this (roughly 10 steps)</code>` + "";

	let t475;
	let p78;
	let t476;
	let code110;
	let t477;
	let t478;
	let code111;
	let t479;
	let t480;
	let t481;
	let pre8;

	let raw8_value = `<code class="language-sh"># if it is a good commit
$ git bisect good

# if it is a bad commit
$ git bisect bad</code>` + "";

	let t482;
	let p79;
	let t483;
	let code112;
	let t484;
	let t485;
	let t486;
	let section27;
	let h29;
	let a54;
	let t487;
	let t488;
	let p80;
	let t489;
	let t490;
	let ul7;
	let li35;
	let t491;
	let t492;
	let li36;
	let t493;
	let t494;
	let li37;
	let t495;
	let t496;
	let li38;
	let t497;
	let t498;
	let li39;
	let t499;
	let t500;
	let li40;
	let t501;
	let t502;
	let li41;
	let t503;
	let t504;
	let li42;
	let t505;
	let t506;
	let p81;
	let t507;
	let code113;
	let t508;
	let t509;
	let t510;
	let hr;
	let t511;
	let p82;
	let t512;
	let a55;
	let t513;

	return {
		c() {
			section0 = element("section");
			ul4 = element("ul");
			li0 = element("li");
			a0 = element("a");
			t0 = text("Disclaimer");
			li1 = element("li");
			a1 = element("a");
			t1 = text("git merge");
			ul0 = element("ul");
			li2 = element("li");
			a2 = element("a");
			t2 = text("Fast-forward merge");
			li3 = element("li");
			a3 = element("a");
			t3 = text("Non Fast-forward merge");
			li4 = element("li");
			a4 = element("a");
			t4 = text("git pull");
			li5 = element("li");
			a5 = element("a");
			t5 = text("git reset");
			li6 = element("li");
			a6 = element("a");
			t6 = text("git cherry-pick");
			li7 = element("li");
			a7 = element("a");
			t7 = text("git revert");
			li8 = element("li");
			a8 = element("a");
			t8 = text("git rebase");
			ul2 = element("ul");
			li9 = element("li");
			a9 = element("a");
			t9 = text("git rebase --interactive");
			ul1 = element("ul");
			li10 = element("li");
			a10 = element("a");
			t10 = text("pick");
			li11 = element("li");
			a11 = element("a");
			t11 = text("drop");
			li12 = element("li");
			a12 = element("a");
			t12 = text("squash & fixup");
			li13 = element("li");
			a13 = element("a");
			t13 = text("break");
			li14 = element("li");
			a14 = element("a");
			t14 = text("edit");
			li15 = element("li");
			a15 = element("a");
			t15 = text("git pull --rebase");
			li16 = element("li");
			a16 = element("a");
			t16 = text("git rebase a shared branch");
			li17 = element("li");
			a17 = element("a");
			t17 = text("git log");
			ul3 = element("ul");
			li18 = element("li");
			a18 = element("a");
			t18 = text("--since, --after, --until, --before");
			li19 = element("li");
			a19 = element("a");
			t19 = text("--grep");
			li20 = element("li");
			a20 = element("a");
			t20 = text("--invert-grep");
			li21 = element("li");
			a21 = element("a");
			t21 = text("--all-match");
			li22 = element("li");
			a22 = element("a");
			t22 = text("--min-parents, --max-parents, --merges, --no-merges");
			li23 = element("li");
			a23 = element("a");
			t23 = text("--first-parent");
			li24 = element("li");
			a24 = element("a");
			t24 = text("git reflog");
			li25 = element("li");
			a25 = element("a");
			t25 = text("git bisect");
			li26 = element("li");
			a26 = element("a");
			t26 = text("Summary");
			t27 = space();
			p0 = element("p");
			t28 = text("This week in React Knowledgeable, I did a sharing on Git commands.");
			t29 = space();
			p1 = element("p");
			t30 = text("The title of the talk was called ");
			strong0 = element("strong");
			t31 = text("\"Git Gudder\"");
			t32 = text(", because almost a year ago I did a lightning sharing on \"Git Gud\", ");
			em = element("em");
			t33 = text("(Get Good)");
			t34 = text(", this follow up sharing used the comparative of \"Git Gud\", therefore, \"Git Gudder\".");
			t35 = space();
			blockquote = element("blockquote");
			p2 = element("p");
			t36 = text("Will there be a \"Git Guddest\"? 🤔");
			t37 = space();
			section1 = element("section");
			h20 = element("h2");
			a27 = element("a");
			t38 = text("Disclaimer");
			t39 = space();
			p3 = element("p");
			t40 = text("I am by no means a Git master or anywhere near mastering Git. I do google or ");
			a28 = element("a");
			t41 = text("refer to the docs");
			t42 = text(" whenever I am unsure of the commands. In this talk, I listed out all the common history manipulation commands Git provides. I hoped that, with it, we are aware of what is available in our toolbox. So, we can look for it whenever we need it.");
			t43 = space();
			section2 = element("section");
			h21 = element("h2");
			a29 = element("a");
			t44 = text("git merge");
			t45 = space();
			p4 = element("p");
			t46 = text("There's 2 kind of ");
			code0 = element("code");
			t47 = text("git merge");
			t48 = text(", the ");
			strong1 = element("strong");
			t49 = text("fast-forward");
			t50 = text(" and ");
			strong2 = element("strong");
			t51 = text("non fast-forward");
			t52 = text(".");
			t53 = space();
			section3 = element("section");
			h30 = element("h3");
			a30 = element("a");
			t54 = text("Fast-forward merge");
			t55 = space();
			p5 = element("p");
			t56 = text("Merging ");
			code1 = element("code");
			t57 = text("master");
			t58 = text(" into ");
			code2 = element("code");
			t59 = text("branch A");
			t60 = text(":");
			t61 = space();
			p6 = element("p");
			img0 = element("img");
			t62 = space();
			div0 = element("div");
			t63 = text("Fast-forward merge");
			t64 = space();
			section4 = element("section");
			h31 = element("h3");
			a31 = element("a");
			t65 = text("Non Fast-forward merge");
			t66 = space();
			p7 = element("p");
			t67 = text("Merging ");
			code3 = element("code");
			t68 = text("master");
			t69 = text(" into ");
			code4 = element("code");
			t70 = text("branch A");
			t71 = text(":");
			t72 = space();
			p8 = element("p");
			img1 = element("img");
			t73 = space();
			div1 = element("div");
			t74 = text("Non fast-forward merge");
			t75 = space();
			p9 = element("p");
			t76 = text("Non fast-forward merge will create an extra commit that merges 2 branches.");
			t77 = space();
			section5 = element("section");
			h32 = element("h3");
			a32 = element("a");
			t78 = text("git pull");
			t79 = space();
			p10 = element("p");
			t80 = text("By default, ");
			code5 = element("code");
			t81 = text("git pull");
			t82 = text(" is ");
			code6 = element("code");
			t83 = text("git fetch origin branch");
			t84 = text(" + ");
			code7 = element("code");
			t85 = text("git merge origin/branch");
			t86 = text(".");
			t87 = space();
			p11 = element("p");
			img2 = element("img");
			t88 = space();
			div2 = element("div");
			t89 = text("git pull");
			t90 = space();
			section6 = element("section");
			h22 = element("h2");
			a33 = element("a");
			t91 = text("git reset");
			t92 = space();
			p12 = element("p");
			code8 = element("code");
			t93 = text("git reset --hard");
			t94 = text(" allows you to change the reference of where your branch is pointing at.");
			t95 = space();
			p13 = element("p");
			code9 = element("code");
			t96 = text("git checkout branch-b");
			t97 = text(", ");
			code10 = element("code");
			t98 = text("git reset --hard branch-a");
			t99 = text(", ");
			code11 = element("code");
			t100 = text("git reset --hard #d");
			t101 = text(":");
			t102 = space();
			p14 = element("p");
			img3 = element("img");
			t103 = space();
			div3 = element("div");
			t104 = text("git reset");
			t105 = space();
			section7 = element("section");
			h23 = element("h2");
			a34 = element("a");
			t106 = text("git cherry-pick");
			t107 = space();
			p15 = element("p");
			t108 = text("cherry-pick allows you to pick commits from some other branches, tags, or refs.");
			t109 = space();
			p16 = element("p");
			code12 = element("code");
			t110 = text("git checkout branch-b");
			t111 = text(", ");
			code13 = element("code");
			t112 = text("git cherry-pick branch-a");
			t113 = text(":");
			t114 = space();
			p17 = element("p");
			img4 = element("img");
			t115 = space();
			div4 = element("div");
			t116 = text("git cherry-pick");
			t117 = space();
			section8 = element("section");
			h24 = element("h2");
			a35 = element("a");
			t118 = text("git revert");
			t119 = space();
			p18 = element("p");
			code14 = element("code");
			t120 = text("git revert");
			t121 = text(" creates a new commit that reverses the change of the commit that you are reverting.");
			t122 = space();
			p19 = element("p");
			t123 = text("For example, if you accidentally merged ");
			code15 = element("code");
			t124 = text("feat/a");
			t125 = text(" into ");
			code16 = element("code");
			t126 = text("master");
			t127 = text(" branch, you can ");
			code17 = element("code");
			t128 = text("git checkout master");
			t129 = text(", ");
			code18 = element("code");
			t130 = text("git revert #1");
			t131 = text(":");
			t132 = space();
			p20 = element("p");
			img5 = element("img");
			t133 = space();
			div5 = element("div");
			t134 = text("git revert");
			t135 = space();
			p21 = element("p");
			t136 = text("If you know merge master into your ");
			code19 = element("code");
			t137 = text("feat/a");
			t138 = text(" branch, you would noticed that all the changes in the branch is gone, because the merge is a fast-forward merge, that includes the revert commit made in the branch:");
			t139 = space();
			p22 = element("p");
			img6 = element("img");
			t140 = space();
			div6 = element("div");
			t141 = text("Merging `master` into `feat/a`");
			t142 = space();
			p23 = element("p");
			t143 = text("If you want to recover the changes made in ");
			code20 = element("code");
			t144 = text("feat/a");
			t145 = text(", you can ");
			code21 = element("code");
			t146 = text("revert");
			t147 = text(" the ");
			code22 = element("code");
			t148 = text("revert");
			t149 = text(":");
			t150 = space();
			p24 = element("p");
			code23 = element("code");
			t151 = text("git revert ~#1");
			t152 = text(":");
			t153 = space();
			p25 = element("p");
			img7 = element("img");
			t154 = space();
			div7 = element("div");
			t155 = text("git revert the revert");
			t156 = space();
			p26 = element("p");
			t157 = text("Now, when you are ready to merge your ");
			code24 = element("code");
			t158 = text("feat/a");
			t159 = text(" branch into ");
			code25 = element("code");
			t160 = text("master");
			t161 = text(", you get the all the changes in ");
			code26 = element("code");
			t162 = text("feat/a");
			t163 = text(", a commit that revert all that, and a commit that reverts the revert commit, which meant, you still have all the changes in ");
			code27 = element("code");
			t164 = text("feat/a");
			t165 = text(" in ");
			code28 = element("code");
			t166 = text("master");
			t167 = text(":");
			t168 = space();
			p27 = element("p");
			img8 = element("img");
			t169 = space();
			div8 = element("div");
			t170 = text("Merging changes back to master");
			t171 = space();
			section9 = element("section");
			h25 = element("h2");
			a36 = element("a");
			t172 = text("git rebase");
			t173 = space();
			p28 = element("p");
			code29 = element("code");
			t174 = text("git rebase");
			t175 = text(" allows you to \"move\" commits to a different \"base\".");
			t176 = space();
			p29 = element("p");
			t177 = text("For example, you branched out ");
			code30 = element("code");
			t178 = text("branch-a");
			t179 = text(" from ");
			code31 = element("code");
			t180 = text("master");
			t181 = text(" a while ago, and ");
			code32 = element("code");
			t182 = text("master");
			t183 = text(" has made a few more commits. But if you merge your branch into master now, it would be a non fast-forward merge, creating an extra commit to the history. If you want a clean, one-line history, you can do a ");
			code33 = element("code");
			t184 = text("rebase");
			t185 = text(", replaying commits that you have made in ");
			code34 = element("code");
			t186 = text("branch-a");
			t187 = text(" on top of the latest ");
			code35 = element("code");
			t188 = text("master");
			t189 = text(".");
			t190 = space();
			p30 = element("p");
			code36 = element("code");
			t191 = text("git checkout branch-a");
			t192 = text(", ");
			code37 = element("code");
			t193 = text("git rebase master");
			t194 = text(":");
			t195 = space();
			p31 = element("p");
			img9 = element("img");
			t196 = space();
			div9 = element("div");
			t197 = text("git rebase");
			t198 = space();
			p32 = element("p");
			code38 = element("code");
			t199 = text("git rebase");
			t200 = text(" does not have to be on top of the branch that you branched out, you can rebase to anywhere:");
			t201 = space();
			p33 = element("p");
			code39 = element("code");
			t202 = text("git checkout branch-a");
			t203 = text(", ");
			code40 = element("code");
			t204 = text("git rebase --onto branch-b master branch-a");
			t205 = text(":");
			t206 = space();
			p34 = element("p");
			img10 = element("img");
			t207 = space();
			div10 = element("div");
			t208 = text("git rebase");
			t209 = space();
			p35 = element("p");
			t210 = text("There's 3 reference point you should know when doing a git rebase:");
			t211 = space();
			ul5 = element("ul");
			li27 = element("li");
			code41 = element("code");
			t212 = text("<new base>");
			t213 = space();
			li28 = element("li");
			code42 = element("code");
			t214 = text("<upstream>");
			t215 = space();
			li29 = element("li");
			code43 = element("code");
			t216 = text("<branch>");
			t217 = space();
			p36 = element("p");
			picture0 = element("picture");
			source0 = element("source");
			source1 = element("source");
			img11 = element("img");
			t218 = space();
			div11 = element("div");
			t219 = text("git rebase");
			t220 = space();
			p37 = element("p");
			t221 = text("Here are a few things you should know:");
			t222 = space();
			ul6 = element("ul");
			li30 = element("li");
			code44 = element("code");
			t223 = text("git rebase");
			t224 = text(" will replay the commits from ");
			code45 = element("code");
			t225 = text("<upstream>");
			t226 = text(" to ");
			code46 = element("code");
			t227 = text("<branch>");
			t228 = text(" onto ");
			code47 = element("code");
			t229 = text("<new base>");
			t230 = text(".");
			t231 = space();
			li31 = element("li");
			t232 = text("If you specify ");
			code48 = element("code");
			t233 = text("<upstream>");
			t234 = text(" as a branch name, ");
			code49 = element("code");
			t235 = text("git rebase");
			t236 = text(" will replay commits from the common ancestor of ");
			code50 = element("code");
			t237 = text("<upstream>");
			t238 = text(" and ");
			code51 = element("code");
			t239 = text("<branch>");
			t240 = text(" to ");
			code52 = element("code");
			t241 = text("<branch>");
			t242 = text(".");
			t243 = space();
			li32 = element("li");
			t244 = text("If you do not specify ");
			code53 = element("code");
			t245 = text("<branch>");
			t246 = text(", the default is the ");
			code54 = element("code");
			t247 = text("HEAD");
			t248 = text(", current commit you are at now.");
			t249 = space();
			li33 = element("li");
			t250 = text("If you do not specify ");
			code55 = element("code");
			t251 = text("--onto <new base>");
			t252 = text(", the new base will be default to ");
			code56 = element("code");
			t253 = text("<upsttream>");
			t254 = text(", that's why ");
			code57 = element("code");
			t255 = text("git rebase master");
			t256 = text(" is equivalent to ");
			code58 = element("code");
			t257 = text("git rebase --onto master master");
			t258 = text(".");
			t259 = space();
			li34 = element("li");
			t260 = text("If you do not specify ");
			code59 = element("code");
			t261 = text("<upstream>");
			t262 = text(", it will be the upstream of the current branch. So ");
			code60 = element("code");
			t263 = text("git rebase");
			t264 = text(" is equivalent to ");
			code61 = element("code");
			t265 = text("git rebase <origin/current-branch>");
			t266 = text(".");
			t267 = space();
			section10 = element("section");
			h33 = element("h3");
			a37 = element("a");
			t268 = text("git rebase --interactive");
			t269 = space();
			p38 = element("p");
			code62 = element("code");
			t270 = text("git rebase");
			t271 = text(" has an interactive mode, which allows you to specify instructions while replaying commits during a rebase.");
			t272 = space();
			p39 = element("p");
			picture1 = element("picture");
			source2 = element("source");
			source3 = element("source");
			img12 = element("img");
			t273 = space();
			div12 = element("div");
			t274 = text("git rebase interactive");
			t275 = space();
			p40 = element("p");
			t276 = text("When you run ");
			code63 = element("code");
			t277 = text("git rebase --interactive");
			t278 = text(", git will prompt you with an editor to edit the instructions. In it, you will see a list of commits that will be replayed:");
			t279 = space();
			pre0 = element("pre");
			t280 = space();
			section11 = element("section");
			h40 = element("h4");
			a38 = element("a");
			t281 = text("pick");
			t282 = space();
			p41 = element("p");
			t283 = text("The default instruction. Will just use the commit while replaying:");
			t284 = space();
			p42 = element("p");
			picture2 = element("picture");
			source4 = element("source");
			source5 = element("source");
			img13 = element("img");
			t285 = space();
			pre1 = element("pre");
			t286 = space();
			section12 = element("section");
			h41 = element("h4");
			a39 = element("a");
			t287 = text("drop");
			t288 = space();
			p43 = element("p");
			t289 = text("Drop will omit the commit:");
			t290 = space();
			p44 = element("p");
			picture3 = element("picture");
			source6 = element("source");
			source7 = element("source");
			img14 = element("img");
			t291 = space();
			pre2 = element("pre");
			t292 = space();
			section13 = element("section");
			h42 = element("h4");
			a40 = element("a");
			t293 = text("squash & fixup");
			t294 = space();
			p45 = element("p");
			t295 = text("Squash & Fixup will combine your commit with the previous commit, the only difference is that with ");
			code64 = element("code");
			t296 = text("squash");
			t297 = text(", git will prompt you to edit the commit message of the combined commit, while ");
			code65 = element("code");
			t298 = text("fixup");
			t299 = text(" will drop the commit of the ");
			code66 = element("code");
			t300 = text("fixup");
			t301 = text("ed commit.");
			t302 = space();
			p46 = element("p");
			picture4 = element("picture");
			source8 = element("source");
			source9 = element("source");
			img15 = element("img");
			t303 = space();
			pre3 = element("pre");
			t304 = space();
			section14 = element("section");
			h43 = element("h4");
			a41 = element("a");
			t305 = text("break");
			t306 = space();
			p47 = element("p");
			t307 = text("Pause the rebase. You can do add more commits here if you want. When you are done, make sure that your workspace and stage is clean, run ");
			code67 = element("code");
			t308 = text("git rebase --continue");
			t309 = text(" to continue.");
			t310 = space();
			p48 = element("p");
			picture5 = element("picture");
			source10 = element("source");
			source11 = element("source");
			img16 = element("img");
			t311 = space();
			pre4 = element("pre");
			t312 = space();
			section15 = element("section");
			h44 = element("h4");
			a42 = element("a");
			t313 = text("edit");
			t314 = space();
			p49 = element("p");
			t315 = text("Pause the rebase at the commit that you are editing, before the commit has been commited. You can add, remove or ammend your files before continue the rebase process.");
			t316 = space();
			p50 = element("p");
			picture6 = element("picture");
			source12 = element("source");
			source13 = element("source");
			img17 = element("img");
			t317 = space();
			pre5 = element("pre");
			t318 = space();
			section16 = element("section");
			h34 = element("h3");
			a43 = element("a");
			t319 = text("git pull --rebase");
			t320 = space();
			p51 = element("p");
			t321 = text("There's a rebase mode for git pull, where it will be ");
			code68 = element("code");
			t322 = text("git fetch origin branch");
			t323 = text(" + ");
			code69 = element("code");
			t324 = text("git rebase origin/branch");
			t325 = text(".");
			t326 = space();
			p52 = element("p");
			img18 = element("img");
			t327 = space();
			div13 = element("div");
			t328 = text("git pull --rebase");
			t329 = space();
			section17 = element("section");
			h35 = element("h3");
			a44 = element("a");
			t330 = text("git rebase a shared branch");
			t331 = space();
			p53 = element("p");
			t332 = text("Say ");
			code70 = element("code");
			t333 = text("x");
			t334 = text(" and ");
			code71 = element("code");
			t335 = text("y");
			t336 = text(" are working on the ");
			code72 = element("code");
			t337 = text("feat/a");
			t338 = text(" branch.");
			t339 = space();
			p54 = element("p");
			picture7 = element("picture");
			source14 = element("source");
			source15 = element("source");
			img19 = element("img");
			t340 = space();
			p55 = element("p");
			code73 = element("code");
			t341 = text("x");
			t342 = text(" decided to rebase the ");
			code74 = element("code");
			t343 = text("feat/a");
			t344 = text(" branch to squash and drop some commits:");
			t345 = space();
			p56 = element("p");
			picture8 = element("picture");
			source16 = element("source");
			source17 = element("source");
			img20 = element("img");
			t346 = space();
			p57 = element("p");
			t347 = text("While ");
			code75 = element("code");
			t348 = text("x");
			t349 = text(" had done that, that was just a part of the whole picture. Because the ");
			code76 = element("code");
			t350 = text("rebase");
			t351 = text(" on his local machine changed the git history on his local copy only.");
			t352 = space();
			p58 = element("p");
			picture9 = element("picture");
			source18 = element("source");
			source19 = element("source");
			img21 = element("img");
			t353 = space();
			p59 = element("p");
			t354 = text("To make the change on the remote server as well, ");
			code77 = element("code");
			t355 = text("x");
			t356 = text(" forced push his branch to the remote server. (");
			strong3 = element("strong");
			t357 = text("Note:");
			t358 = text(" You can push without ");
			code78 = element("code");
			t359 = text("--force");
			t360 = text(" if the origin branch cannot fast-forward merge your local branch)");
			t361 = space();
			p60 = element("p");
			t362 = text("While ");
			code79 = element("code");
			t363 = text("y");
			t364 = text(" on the other hand, did not know about the ");
			code80 = element("code");
			t365 = text("rebase");
			t366 = text(", so when ");
			code81 = element("code");
			t367 = text("y");
			t368 = text(" pulled the code, it ended up with a messed up merged of a messed up git history:");
			t369 = space();
			p61 = element("p");
			picture10 = element("picture");
			source20 = element("source");
			source21 = element("source");
			img22 = element("img");
			t370 = space();
			p62 = element("p");
			t371 = text("In most cases, there would be a merge conflict, because ");
			code82 = element("code");
			t372 = text("x");
			t373 = text(" and ");
			code83 = element("code");
			t374 = text("y");
			t375 = text("'s branch would have made changes on the same file.");
			t376 = space();
			p63 = element("p");
			t377 = text("So, the correct way, if the rebase is necessary, is to notify ");
			code84 = element("code");
			t378 = text("y");
			t379 = text(" about the rebase, so that ");
			code85 = element("code");
			t380 = text("y");
			t381 = text(" can ");
			code86 = element("code");
			t382 = text("git reset --hard");
			t383 = text(" his branch to the remote branch.");
			t384 = space();
			p64 = element("p");
			picture11 = element("picture");
			source22 = element("source");
			source23 = element("source");
			img23 = element("img");
			t385 = space();
			p65 = element("p");
			t386 = text("If unfortunately, at the same time, ");
			code87 = element("code");
			t387 = text("y");
			t388 = text(" has made more commits to his local branch, he would have to ");
			code88 = element("code");
			t389 = text("git rebase");
			t390 = text(" the new changes onto the remote branch, or ");
			code89 = element("code");
			t391 = text("git cherry-pick");
			t392 = text(" the new changes after the ");
			code90 = element("code");
			t393 = text("git reset --hard");
			t394 = text(".");
			t395 = space();
			p66 = element("p");
			t396 = text("In the companies that I have worked with, forbidden a ");
			code91 = element("code");
			t397 = text("rebase");
			t398 = text(" on a common branch, especially the ");
			code92 = element("code");
			t399 = text("master");
			t400 = text(" branch.");
			t401 = space();
			section18 = element("section");
			h26 = element("h2");
			a45 = element("a");
			t402 = text("git log");
			t403 = space();
			p67 = element("p");
			t404 = text("The go-to command to look at your git history. There's a few options that is worth mentioning, that allow us to search through the sea of commits:");
			t405 = space();
			section19 = element("section");
			h36 = element("h3");
			a46 = element("a");
			t406 = text("--since, --after, --until, --before");
			t407 = space();
			p68 = element("p");
			t408 = text("You can filter out commits within a specific timeframe");
			t409 = space();
			section20 = element("section");
			h37 = element("h3");
			a47 = element("a");
			t410 = text("--grep");
			t411 = space();
			p69 = element("p");
			t412 = text("You can filter out commits based on commit message");
			t413 = space();
			section21 = element("section");
			h38 = element("h3");
			a48 = element("a");
			t414 = text("--invert-grep");
			t415 = space();
			p70 = element("p");
			t416 = text("You can filter out commits that does not match the ");
			code93 = element("code");
			t417 = text("--grep");
			t418 = space();
			section22 = element("section");
			h39 = element("h3");
			a49 = element("a");
			t419 = text("--all-match");
			t420 = space();
			p71 = element("p");
			code94 = element("code");
			t421 = text("--grep");
			t422 = text(" is a ");
			code95 = element("code");
			t423 = text("OR");
			t424 = text(" filter, ");
			code96 = element("code");
			t425 = text("--all-match");
			t426 = text(" make it a ");
			code97 = element("code");
			t427 = text("AND");
			t428 = text(" filter");
			t429 = space();
			section23 = element("section");
			h310 = element("h3");
			a50 = element("a");
			t430 = text("--min-parents, --max-parents, --merges, --no-merges");
			t431 = space();
			p72 = element("p");
			t432 = text("You can specify commits with the number of parents. A simple merge commit has 2 parent, so ");
			code98 = element("code");
			t433 = text("--merge");
			t434 = text(" is equivalent to ");
			code99 = element("code");
			t435 = text("--min-parents=2");
			t436 = text(".");
			t437 = space();
			section24 = element("section");
			h311 = element("h3");
			a51 = element("a");
			t438 = text("--first-parent");
			t439 = space();
			p73 = element("p");
			t440 = text("You can follow only the first parent commit upon seeing a merge commit. This is especially useful when you have merged of branches in, ");
			code100 = element("code");
			t441 = text("--first-parent");
			t442 = text(" allow you to filter out only the merge commit and the commit you have made on the current branch.");
			t443 = space();
			section25 = element("section");
			h27 = element("h2");
			a52 = element("a");
			t444 = text("git reflog");
			t445 = space();
			p74 = element("p");
			t446 = text("The reference log shows you all the ");
			code101 = element("code");
			t447 = text("HEAD");
			t448 = text(" position you have been to. This is especially useful when you have ");
			code102 = element("code");
			t449 = text("reset --hard");
			t450 = text(" or ");
			code103 = element("code");
			t451 = text("rebase");
			t452 = text(", you can still find back the commit reference that you were at previously, so you can recover them.");
			t453 = space();
			section26 = element("section");
			h28 = element("h2");
			a53 = element("a");
			t454 = text("git bisect");
			t455 = space();
			p75 = element("p");
			t456 = text("This is a useful command that I am looking forward to use it.");
			t457 = space();
			p76 = element("p");
			t458 = text("Often times when you noticed something has changed / break / less optimised, yet you do not know when this change was introduced into your repository. ");
			code104 = element("code");
			t459 = text("git bisect");
			t460 = text(" allows you to do binary search on the history, so that you can quickly pin down the commit where the change was introduced.");
			t461 = space();
			pre6 = element("pre");
			t462 = space();
			p77 = element("p");
			t463 = text("Once you've specified at least one ");
			code105 = element("code");
			t464 = text("bad");
			t465 = text(" and one ");
			code106 = element("code");
			t466 = text("good");
			t467 = text(" commit, ");
			code107 = element("code");
			t468 = text("git bisect");
			t469 = text(" will find and checkout to a commit in the middle of that range between ");
			code108 = element("code");
			t470 = text("bad");
			t471 = text(" and ");
			code109 = element("code");
			t472 = text("good");
			t473 = text(" and greets you with:");
			t474 = space();
			pre7 = element("pre");
			t475 = space();
			p78 = element("p");
			t476 = text("You can know test / verify / profile your code, and specify whether the current commit is a ");
			code110 = element("code");
			t477 = text("good");
			t478 = text(" commit or a ");
			code111 = element("code");
			t479 = text("bad");
			t480 = text(" commit:");
			t481 = space();
			pre8 = element("pre");
			t482 = space();
			p79 = element("p");
			t483 = text("Continue doing it until eventually there's no more commit to inspect. ");
			code112 = element("code");
			t484 = text("git bisect");
			t485 = text(" will print out the description of the first bad commit.");
			t486 = space();
			section27 = element("section");
			h29 = element("h2");
			a54 = element("a");
			t487 = text("Summary");
			t488 = space();
			p80 = element("p");
			t489 = text("We've gone through the following git commands:");
			t490 = space();
			ul7 = element("ul");
			li35 = element("li");
			t491 = text("git merge");
			t492 = space();
			li36 = element("li");
			t493 = text("git reset");
			t494 = space();
			li37 = element("li");
			t495 = text("git cherry-pick");
			t496 = space();
			li38 = element("li");
			t497 = text("git revert");
			t498 = space();
			li39 = element("li");
			t499 = text("git rebase");
			t500 = space();
			li40 = element("li");
			t501 = text("git log");
			t502 = space();
			li41 = element("li");
			t503 = text("git reflog");
			t504 = space();
			li42 = element("li");
			t505 = text("git bisect");
			t506 = space();
			p81 = element("p");
			t507 = text("Hopefully we are now ");
			code113 = element("code");
			t508 = text("git gudder");
			t509 = text(" than before!");
			t510 = space();
			hr = element("hr");
			t511 = space();
			p82 = element("p");
			t512 = text("Related topic: ");
			a55 = element("a");
			t513 = text("Git commits went missing after a rebase");
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
			t0 = claim_text(a0_nodes, "Disclaimer");
			a0_nodes.forEach(detach);
			li0_nodes.forEach(detach);
			li1 = claim_element(ul4_nodes, "LI", {});
			var li1_nodes = children(li1);
			a1 = claim_element(li1_nodes, "A", { href: true });
			var a1_nodes = children(a1);
			t1 = claim_text(a1_nodes, "git merge");
			a1_nodes.forEach(detach);
			li1_nodes.forEach(detach);
			ul0 = claim_element(ul4_nodes, "UL", {});
			var ul0_nodes = children(ul0);
			li2 = claim_element(ul0_nodes, "LI", {});
			var li2_nodes = children(li2);
			a2 = claim_element(li2_nodes, "A", { href: true });
			var a2_nodes = children(a2);
			t2 = claim_text(a2_nodes, "Fast-forward merge");
			a2_nodes.forEach(detach);
			li2_nodes.forEach(detach);
			li3 = claim_element(ul0_nodes, "LI", {});
			var li3_nodes = children(li3);
			a3 = claim_element(li3_nodes, "A", { href: true });
			var a3_nodes = children(a3);
			t3 = claim_text(a3_nodes, "Non Fast-forward merge");
			a3_nodes.forEach(detach);
			li3_nodes.forEach(detach);
			li4 = claim_element(ul0_nodes, "LI", {});
			var li4_nodes = children(li4);
			a4 = claim_element(li4_nodes, "A", { href: true });
			var a4_nodes = children(a4);
			t4 = claim_text(a4_nodes, "git pull");
			a4_nodes.forEach(detach);
			li4_nodes.forEach(detach);
			ul0_nodes.forEach(detach);
			li5 = claim_element(ul4_nodes, "LI", {});
			var li5_nodes = children(li5);
			a5 = claim_element(li5_nodes, "A", { href: true });
			var a5_nodes = children(a5);
			t5 = claim_text(a5_nodes, "git reset");
			a5_nodes.forEach(detach);
			li5_nodes.forEach(detach);
			li6 = claim_element(ul4_nodes, "LI", {});
			var li6_nodes = children(li6);
			a6 = claim_element(li6_nodes, "A", { href: true });
			var a6_nodes = children(a6);
			t6 = claim_text(a6_nodes, "git cherry-pick");
			a6_nodes.forEach(detach);
			li6_nodes.forEach(detach);
			li7 = claim_element(ul4_nodes, "LI", {});
			var li7_nodes = children(li7);
			a7 = claim_element(li7_nodes, "A", { href: true });
			var a7_nodes = children(a7);
			t7 = claim_text(a7_nodes, "git revert");
			a7_nodes.forEach(detach);
			li7_nodes.forEach(detach);
			li8 = claim_element(ul4_nodes, "LI", {});
			var li8_nodes = children(li8);
			a8 = claim_element(li8_nodes, "A", { href: true });
			var a8_nodes = children(a8);
			t8 = claim_text(a8_nodes, "git rebase");
			a8_nodes.forEach(detach);
			li8_nodes.forEach(detach);
			ul2 = claim_element(ul4_nodes, "UL", {});
			var ul2_nodes = children(ul2);
			li9 = claim_element(ul2_nodes, "LI", {});
			var li9_nodes = children(li9);
			a9 = claim_element(li9_nodes, "A", { href: true });
			var a9_nodes = children(a9);
			t9 = claim_text(a9_nodes, "git rebase --interactive");
			a9_nodes.forEach(detach);
			li9_nodes.forEach(detach);
			ul1 = claim_element(ul2_nodes, "UL", {});
			var ul1_nodes = children(ul1);
			li10 = claim_element(ul1_nodes, "LI", {});
			var li10_nodes = children(li10);
			a10 = claim_element(li10_nodes, "A", { href: true });
			var a10_nodes = children(a10);
			t10 = claim_text(a10_nodes, "pick");
			a10_nodes.forEach(detach);
			li10_nodes.forEach(detach);
			li11 = claim_element(ul1_nodes, "LI", {});
			var li11_nodes = children(li11);
			a11 = claim_element(li11_nodes, "A", { href: true });
			var a11_nodes = children(a11);
			t11 = claim_text(a11_nodes, "drop");
			a11_nodes.forEach(detach);
			li11_nodes.forEach(detach);
			li12 = claim_element(ul1_nodes, "LI", {});
			var li12_nodes = children(li12);
			a12 = claim_element(li12_nodes, "A", { href: true });
			var a12_nodes = children(a12);
			t12 = claim_text(a12_nodes, "squash & fixup");
			a12_nodes.forEach(detach);
			li12_nodes.forEach(detach);
			li13 = claim_element(ul1_nodes, "LI", {});
			var li13_nodes = children(li13);
			a13 = claim_element(li13_nodes, "A", { href: true });
			var a13_nodes = children(a13);
			t13 = claim_text(a13_nodes, "break");
			a13_nodes.forEach(detach);
			li13_nodes.forEach(detach);
			li14 = claim_element(ul1_nodes, "LI", {});
			var li14_nodes = children(li14);
			a14 = claim_element(li14_nodes, "A", { href: true });
			var a14_nodes = children(a14);
			t14 = claim_text(a14_nodes, "edit");
			a14_nodes.forEach(detach);
			li14_nodes.forEach(detach);
			ul1_nodes.forEach(detach);
			li15 = claim_element(ul2_nodes, "LI", {});
			var li15_nodes = children(li15);
			a15 = claim_element(li15_nodes, "A", { href: true });
			var a15_nodes = children(a15);
			t15 = claim_text(a15_nodes, "git pull --rebase");
			a15_nodes.forEach(detach);
			li15_nodes.forEach(detach);
			li16 = claim_element(ul2_nodes, "LI", {});
			var li16_nodes = children(li16);
			a16 = claim_element(li16_nodes, "A", { href: true });
			var a16_nodes = children(a16);
			t16 = claim_text(a16_nodes, "git rebase a shared branch");
			a16_nodes.forEach(detach);
			li16_nodes.forEach(detach);
			ul2_nodes.forEach(detach);
			li17 = claim_element(ul4_nodes, "LI", {});
			var li17_nodes = children(li17);
			a17 = claim_element(li17_nodes, "A", { href: true });
			var a17_nodes = children(a17);
			t17 = claim_text(a17_nodes, "git log");
			a17_nodes.forEach(detach);
			li17_nodes.forEach(detach);
			ul3 = claim_element(ul4_nodes, "UL", {});
			var ul3_nodes = children(ul3);
			li18 = claim_element(ul3_nodes, "LI", {});
			var li18_nodes = children(li18);
			a18 = claim_element(li18_nodes, "A", { href: true });
			var a18_nodes = children(a18);
			t18 = claim_text(a18_nodes, "--since, --after, --until, --before");
			a18_nodes.forEach(detach);
			li18_nodes.forEach(detach);
			li19 = claim_element(ul3_nodes, "LI", {});
			var li19_nodes = children(li19);
			a19 = claim_element(li19_nodes, "A", { href: true });
			var a19_nodes = children(a19);
			t19 = claim_text(a19_nodes, "--grep");
			a19_nodes.forEach(detach);
			li19_nodes.forEach(detach);
			li20 = claim_element(ul3_nodes, "LI", {});
			var li20_nodes = children(li20);
			a20 = claim_element(li20_nodes, "A", { href: true });
			var a20_nodes = children(a20);
			t20 = claim_text(a20_nodes, "--invert-grep");
			a20_nodes.forEach(detach);
			li20_nodes.forEach(detach);
			li21 = claim_element(ul3_nodes, "LI", {});
			var li21_nodes = children(li21);
			a21 = claim_element(li21_nodes, "A", { href: true });
			var a21_nodes = children(a21);
			t21 = claim_text(a21_nodes, "--all-match");
			a21_nodes.forEach(detach);
			li21_nodes.forEach(detach);
			li22 = claim_element(ul3_nodes, "LI", {});
			var li22_nodes = children(li22);
			a22 = claim_element(li22_nodes, "A", { href: true });
			var a22_nodes = children(a22);
			t22 = claim_text(a22_nodes, "--min-parents, --max-parents, --merges, --no-merges");
			a22_nodes.forEach(detach);
			li22_nodes.forEach(detach);
			li23 = claim_element(ul3_nodes, "LI", {});
			var li23_nodes = children(li23);
			a23 = claim_element(li23_nodes, "A", { href: true });
			var a23_nodes = children(a23);
			t23 = claim_text(a23_nodes, "--first-parent");
			a23_nodes.forEach(detach);
			li23_nodes.forEach(detach);
			ul3_nodes.forEach(detach);
			li24 = claim_element(ul4_nodes, "LI", {});
			var li24_nodes = children(li24);
			a24 = claim_element(li24_nodes, "A", { href: true });
			var a24_nodes = children(a24);
			t24 = claim_text(a24_nodes, "git reflog");
			a24_nodes.forEach(detach);
			li24_nodes.forEach(detach);
			li25 = claim_element(ul4_nodes, "LI", {});
			var li25_nodes = children(li25);
			a25 = claim_element(li25_nodes, "A", { href: true });
			var a25_nodes = children(a25);
			t25 = claim_text(a25_nodes, "git bisect");
			a25_nodes.forEach(detach);
			li25_nodes.forEach(detach);
			li26 = claim_element(ul4_nodes, "LI", {});
			var li26_nodes = children(li26);
			a26 = claim_element(li26_nodes, "A", { href: true });
			var a26_nodes = children(a26);
			t26 = claim_text(a26_nodes, "Summary");
			a26_nodes.forEach(detach);
			li26_nodes.forEach(detach);
			ul4_nodes.forEach(detach);
			section0_nodes.forEach(detach);
			t27 = claim_space(nodes);
			p0 = claim_element(nodes, "P", {});
			var p0_nodes = children(p0);
			t28 = claim_text(p0_nodes, "This week in React Knowledgeable, I did a sharing on Git commands.");
			p0_nodes.forEach(detach);
			t29 = claim_space(nodes);
			p1 = claim_element(nodes, "P", {});
			var p1_nodes = children(p1);
			t30 = claim_text(p1_nodes, "The title of the talk was called ");
			strong0 = claim_element(p1_nodes, "STRONG", {});
			var strong0_nodes = children(strong0);
			t31 = claim_text(strong0_nodes, "\"Git Gudder\"");
			strong0_nodes.forEach(detach);
			t32 = claim_text(p1_nodes, ", because almost a year ago I did a lightning sharing on \"Git Gud\", ");
			em = claim_element(p1_nodes, "EM", {});
			var em_nodes = children(em);
			t33 = claim_text(em_nodes, "(Get Good)");
			em_nodes.forEach(detach);
			t34 = claim_text(p1_nodes, ", this follow up sharing used the comparative of \"Git Gud\", therefore, \"Git Gudder\".");
			p1_nodes.forEach(detach);
			t35 = claim_space(nodes);
			blockquote = claim_element(nodes, "BLOCKQUOTE", {});
			var blockquote_nodes = children(blockquote);
			p2 = claim_element(blockquote_nodes, "P", {});
			var p2_nodes = children(p2);
			t36 = claim_text(p2_nodes, "Will there be a \"Git Guddest\"? 🤔");
			p2_nodes.forEach(detach);
			blockquote_nodes.forEach(detach);
			t37 = claim_space(nodes);
			section1 = claim_element(nodes, "SECTION", {});
			var section1_nodes = children(section1);
			h20 = claim_element(section1_nodes, "H2", {});
			var h20_nodes = children(h20);
			a27 = claim_element(h20_nodes, "A", { href: true, id: true });
			var a27_nodes = children(a27);
			t38 = claim_text(a27_nodes, "Disclaimer");
			a27_nodes.forEach(detach);
			h20_nodes.forEach(detach);
			t39 = claim_space(section1_nodes);
			p3 = claim_element(section1_nodes, "P", {});
			var p3_nodes = children(p3);
			t40 = claim_text(p3_nodes, "I am by no means a Git master or anywhere near mastering Git. I do google or ");
			a28 = claim_element(p3_nodes, "A", { href: true, rel: true });
			var a28_nodes = children(a28);
			t41 = claim_text(a28_nodes, "refer to the docs");
			a28_nodes.forEach(detach);
			t42 = claim_text(p3_nodes, " whenever I am unsure of the commands. In this talk, I listed out all the common history manipulation commands Git provides. I hoped that, with it, we are aware of what is available in our toolbox. So, we can look for it whenever we need it.");
			p3_nodes.forEach(detach);
			section1_nodes.forEach(detach);
			t43 = claim_space(nodes);
			section2 = claim_element(nodes, "SECTION", {});
			var section2_nodes = children(section2);
			h21 = claim_element(section2_nodes, "H2", {});
			var h21_nodes = children(h21);
			a29 = claim_element(h21_nodes, "A", { href: true, id: true });
			var a29_nodes = children(a29);
			t44 = claim_text(a29_nodes, "git merge");
			a29_nodes.forEach(detach);
			h21_nodes.forEach(detach);
			t45 = claim_space(section2_nodes);
			p4 = claim_element(section2_nodes, "P", {});
			var p4_nodes = children(p4);
			t46 = claim_text(p4_nodes, "There's 2 kind of ");
			code0 = claim_element(p4_nodes, "CODE", {});
			var code0_nodes = children(code0);
			t47 = claim_text(code0_nodes, "git merge");
			code0_nodes.forEach(detach);
			t48 = claim_text(p4_nodes, ", the ");
			strong1 = claim_element(p4_nodes, "STRONG", {});
			var strong1_nodes = children(strong1);
			t49 = claim_text(strong1_nodes, "fast-forward");
			strong1_nodes.forEach(detach);
			t50 = claim_text(p4_nodes, " and ");
			strong2 = claim_element(p4_nodes, "STRONG", {});
			var strong2_nodes = children(strong2);
			t51 = claim_text(strong2_nodes, "non fast-forward");
			strong2_nodes.forEach(detach);
			t52 = claim_text(p4_nodes, ".");
			p4_nodes.forEach(detach);
			section2_nodes.forEach(detach);
			t53 = claim_space(nodes);
			section3 = claim_element(nodes, "SECTION", {});
			var section3_nodes = children(section3);
			h30 = claim_element(section3_nodes, "H3", {});
			var h30_nodes = children(h30);
			a30 = claim_element(h30_nodes, "A", { href: true, id: true });
			var a30_nodes = children(a30);
			t54 = claim_text(a30_nodes, "Fast-forward merge");
			a30_nodes.forEach(detach);
			h30_nodes.forEach(detach);
			t55 = claim_space(section3_nodes);
			p5 = claim_element(section3_nodes, "P", {});
			var p5_nodes = children(p5);
			t56 = claim_text(p5_nodes, "Merging ");
			code1 = claim_element(p5_nodes, "CODE", {});
			var code1_nodes = children(code1);
			t57 = claim_text(code1_nodes, "master");
			code1_nodes.forEach(detach);
			t58 = claim_text(p5_nodes, " into ");
			code2 = claim_element(p5_nodes, "CODE", {});
			var code2_nodes = children(code2);
			t59 = claim_text(code2_nodes, "branch A");
			code2_nodes.forEach(detach);
			t60 = claim_text(p5_nodes, ":");
			p5_nodes.forEach(detach);
			t61 = claim_space(section3_nodes);
			p6 = claim_element(section3_nodes, "P", {});
			var p6_nodes = children(p6);
			img0 = claim_element(p6_nodes, "IMG", { src: true, alt: true });
			p6_nodes.forEach(detach);
			t62 = claim_space(section3_nodes);
			div0 = claim_element(section3_nodes, "DIV", { class: true });
			var div0_nodes = children(div0);
			t63 = claim_text(div0_nodes, "Fast-forward merge");
			div0_nodes.forEach(detach);
			section3_nodes.forEach(detach);
			t64 = claim_space(nodes);
			section4 = claim_element(nodes, "SECTION", {});
			var section4_nodes = children(section4);
			h31 = claim_element(section4_nodes, "H3", {});
			var h31_nodes = children(h31);
			a31 = claim_element(h31_nodes, "A", { href: true, id: true });
			var a31_nodes = children(a31);
			t65 = claim_text(a31_nodes, "Non Fast-forward merge");
			a31_nodes.forEach(detach);
			h31_nodes.forEach(detach);
			t66 = claim_space(section4_nodes);
			p7 = claim_element(section4_nodes, "P", {});
			var p7_nodes = children(p7);
			t67 = claim_text(p7_nodes, "Merging ");
			code3 = claim_element(p7_nodes, "CODE", {});
			var code3_nodes = children(code3);
			t68 = claim_text(code3_nodes, "master");
			code3_nodes.forEach(detach);
			t69 = claim_text(p7_nodes, " into ");
			code4 = claim_element(p7_nodes, "CODE", {});
			var code4_nodes = children(code4);
			t70 = claim_text(code4_nodes, "branch A");
			code4_nodes.forEach(detach);
			t71 = claim_text(p7_nodes, ":");
			p7_nodes.forEach(detach);
			t72 = claim_space(section4_nodes);
			p8 = claim_element(section4_nodes, "P", {});
			var p8_nodes = children(p8);
			img1 = claim_element(p8_nodes, "IMG", { src: true, alt: true });
			p8_nodes.forEach(detach);
			t73 = claim_space(section4_nodes);
			div1 = claim_element(section4_nodes, "DIV", { class: true });
			var div1_nodes = children(div1);
			t74 = claim_text(div1_nodes, "Non fast-forward merge");
			div1_nodes.forEach(detach);
			t75 = claim_space(section4_nodes);
			p9 = claim_element(section4_nodes, "P", {});
			var p9_nodes = children(p9);
			t76 = claim_text(p9_nodes, "Non fast-forward merge will create an extra commit that merges 2 branches.");
			p9_nodes.forEach(detach);
			section4_nodes.forEach(detach);
			t77 = claim_space(nodes);
			section5 = claim_element(nodes, "SECTION", {});
			var section5_nodes = children(section5);
			h32 = claim_element(section5_nodes, "H3", {});
			var h32_nodes = children(h32);
			a32 = claim_element(h32_nodes, "A", { href: true, id: true });
			var a32_nodes = children(a32);
			t78 = claim_text(a32_nodes, "git pull");
			a32_nodes.forEach(detach);
			h32_nodes.forEach(detach);
			t79 = claim_space(section5_nodes);
			p10 = claim_element(section5_nodes, "P", {});
			var p10_nodes = children(p10);
			t80 = claim_text(p10_nodes, "By default, ");
			code5 = claim_element(p10_nodes, "CODE", {});
			var code5_nodes = children(code5);
			t81 = claim_text(code5_nodes, "git pull");
			code5_nodes.forEach(detach);
			t82 = claim_text(p10_nodes, " is ");
			code6 = claim_element(p10_nodes, "CODE", {});
			var code6_nodes = children(code6);
			t83 = claim_text(code6_nodes, "git fetch origin branch");
			code6_nodes.forEach(detach);
			t84 = claim_text(p10_nodes, " + ");
			code7 = claim_element(p10_nodes, "CODE", {});
			var code7_nodes = children(code7);
			t85 = claim_text(code7_nodes, "git merge origin/branch");
			code7_nodes.forEach(detach);
			t86 = claim_text(p10_nodes, ".");
			p10_nodes.forEach(detach);
			t87 = claim_space(section5_nodes);
			p11 = claim_element(section5_nodes, "P", {});
			var p11_nodes = children(p11);
			img2 = claim_element(p11_nodes, "IMG", { src: true, alt: true });
			p11_nodes.forEach(detach);
			t88 = claim_space(section5_nodes);
			div2 = claim_element(section5_nodes, "DIV", { class: true });
			var div2_nodes = children(div2);
			t89 = claim_text(div2_nodes, "git pull");
			div2_nodes.forEach(detach);
			section5_nodes.forEach(detach);
			t90 = claim_space(nodes);
			section6 = claim_element(nodes, "SECTION", {});
			var section6_nodes = children(section6);
			h22 = claim_element(section6_nodes, "H2", {});
			var h22_nodes = children(h22);
			a33 = claim_element(h22_nodes, "A", { href: true, id: true });
			var a33_nodes = children(a33);
			t91 = claim_text(a33_nodes, "git reset");
			a33_nodes.forEach(detach);
			h22_nodes.forEach(detach);
			t92 = claim_space(section6_nodes);
			p12 = claim_element(section6_nodes, "P", {});
			var p12_nodes = children(p12);
			code8 = claim_element(p12_nodes, "CODE", {});
			var code8_nodes = children(code8);
			t93 = claim_text(code8_nodes, "git reset --hard");
			code8_nodes.forEach(detach);
			t94 = claim_text(p12_nodes, " allows you to change the reference of where your branch is pointing at.");
			p12_nodes.forEach(detach);
			t95 = claim_space(section6_nodes);
			p13 = claim_element(section6_nodes, "P", {});
			var p13_nodes = children(p13);
			code9 = claim_element(p13_nodes, "CODE", {});
			var code9_nodes = children(code9);
			t96 = claim_text(code9_nodes, "git checkout branch-b");
			code9_nodes.forEach(detach);
			t97 = claim_text(p13_nodes, ", ");
			code10 = claim_element(p13_nodes, "CODE", {});
			var code10_nodes = children(code10);
			t98 = claim_text(code10_nodes, "git reset --hard branch-a");
			code10_nodes.forEach(detach);
			t99 = claim_text(p13_nodes, ", ");
			code11 = claim_element(p13_nodes, "CODE", {});
			var code11_nodes = children(code11);
			t100 = claim_text(code11_nodes, "git reset --hard #d");
			code11_nodes.forEach(detach);
			t101 = claim_text(p13_nodes, ":");
			p13_nodes.forEach(detach);
			t102 = claim_space(section6_nodes);
			p14 = claim_element(section6_nodes, "P", {});
			var p14_nodes = children(p14);
			img3 = claim_element(p14_nodes, "IMG", { src: true, alt: true });
			p14_nodes.forEach(detach);
			t103 = claim_space(section6_nodes);
			div3 = claim_element(section6_nodes, "DIV", { class: true });
			var div3_nodes = children(div3);
			t104 = claim_text(div3_nodes, "git reset");
			div3_nodes.forEach(detach);
			section6_nodes.forEach(detach);
			t105 = claim_space(nodes);
			section7 = claim_element(nodes, "SECTION", {});
			var section7_nodes = children(section7);
			h23 = claim_element(section7_nodes, "H2", {});
			var h23_nodes = children(h23);
			a34 = claim_element(h23_nodes, "A", { href: true, id: true });
			var a34_nodes = children(a34);
			t106 = claim_text(a34_nodes, "git cherry-pick");
			a34_nodes.forEach(detach);
			h23_nodes.forEach(detach);
			t107 = claim_space(section7_nodes);
			p15 = claim_element(section7_nodes, "P", {});
			var p15_nodes = children(p15);
			t108 = claim_text(p15_nodes, "cherry-pick allows you to pick commits from some other branches, tags, or refs.");
			p15_nodes.forEach(detach);
			t109 = claim_space(section7_nodes);
			p16 = claim_element(section7_nodes, "P", {});
			var p16_nodes = children(p16);
			code12 = claim_element(p16_nodes, "CODE", {});
			var code12_nodes = children(code12);
			t110 = claim_text(code12_nodes, "git checkout branch-b");
			code12_nodes.forEach(detach);
			t111 = claim_text(p16_nodes, ", ");
			code13 = claim_element(p16_nodes, "CODE", {});
			var code13_nodes = children(code13);
			t112 = claim_text(code13_nodes, "git cherry-pick branch-a");
			code13_nodes.forEach(detach);
			t113 = claim_text(p16_nodes, ":");
			p16_nodes.forEach(detach);
			t114 = claim_space(section7_nodes);
			p17 = claim_element(section7_nodes, "P", {});
			var p17_nodes = children(p17);
			img4 = claim_element(p17_nodes, "IMG", { src: true, alt: true });
			p17_nodes.forEach(detach);
			t115 = claim_space(section7_nodes);
			div4 = claim_element(section7_nodes, "DIV", { class: true });
			var div4_nodes = children(div4);
			t116 = claim_text(div4_nodes, "git cherry-pick");
			div4_nodes.forEach(detach);
			section7_nodes.forEach(detach);
			t117 = claim_space(nodes);
			section8 = claim_element(nodes, "SECTION", {});
			var section8_nodes = children(section8);
			h24 = claim_element(section8_nodes, "H2", {});
			var h24_nodes = children(h24);
			a35 = claim_element(h24_nodes, "A", { href: true, id: true });
			var a35_nodes = children(a35);
			t118 = claim_text(a35_nodes, "git revert");
			a35_nodes.forEach(detach);
			h24_nodes.forEach(detach);
			t119 = claim_space(section8_nodes);
			p18 = claim_element(section8_nodes, "P", {});
			var p18_nodes = children(p18);
			code14 = claim_element(p18_nodes, "CODE", {});
			var code14_nodes = children(code14);
			t120 = claim_text(code14_nodes, "git revert");
			code14_nodes.forEach(detach);
			t121 = claim_text(p18_nodes, " creates a new commit that reverses the change of the commit that you are reverting.");
			p18_nodes.forEach(detach);
			t122 = claim_space(section8_nodes);
			p19 = claim_element(section8_nodes, "P", {});
			var p19_nodes = children(p19);
			t123 = claim_text(p19_nodes, "For example, if you accidentally merged ");
			code15 = claim_element(p19_nodes, "CODE", {});
			var code15_nodes = children(code15);
			t124 = claim_text(code15_nodes, "feat/a");
			code15_nodes.forEach(detach);
			t125 = claim_text(p19_nodes, " into ");
			code16 = claim_element(p19_nodes, "CODE", {});
			var code16_nodes = children(code16);
			t126 = claim_text(code16_nodes, "master");
			code16_nodes.forEach(detach);
			t127 = claim_text(p19_nodes, " branch, you can ");
			code17 = claim_element(p19_nodes, "CODE", {});
			var code17_nodes = children(code17);
			t128 = claim_text(code17_nodes, "git checkout master");
			code17_nodes.forEach(detach);
			t129 = claim_text(p19_nodes, ", ");
			code18 = claim_element(p19_nodes, "CODE", {});
			var code18_nodes = children(code18);
			t130 = claim_text(code18_nodes, "git revert #1");
			code18_nodes.forEach(detach);
			t131 = claim_text(p19_nodes, ":");
			p19_nodes.forEach(detach);
			t132 = claim_space(section8_nodes);
			p20 = claim_element(section8_nodes, "P", {});
			var p20_nodes = children(p20);
			img5 = claim_element(p20_nodes, "IMG", { src: true, alt: true });
			p20_nodes.forEach(detach);
			t133 = claim_space(section8_nodes);
			div5 = claim_element(section8_nodes, "DIV", { class: true });
			var div5_nodes = children(div5);
			t134 = claim_text(div5_nodes, "git revert");
			div5_nodes.forEach(detach);
			t135 = claim_space(section8_nodes);
			p21 = claim_element(section8_nodes, "P", {});
			var p21_nodes = children(p21);
			t136 = claim_text(p21_nodes, "If you know merge master into your ");
			code19 = claim_element(p21_nodes, "CODE", {});
			var code19_nodes = children(code19);
			t137 = claim_text(code19_nodes, "feat/a");
			code19_nodes.forEach(detach);
			t138 = claim_text(p21_nodes, " branch, you would noticed that all the changes in the branch is gone, because the merge is a fast-forward merge, that includes the revert commit made in the branch:");
			p21_nodes.forEach(detach);
			t139 = claim_space(section8_nodes);
			p22 = claim_element(section8_nodes, "P", {});
			var p22_nodes = children(p22);
			img6 = claim_element(p22_nodes, "IMG", { src: true, alt: true });
			p22_nodes.forEach(detach);
			t140 = claim_space(section8_nodes);
			div6 = claim_element(section8_nodes, "DIV", { class: true });
			var div6_nodes = children(div6);
			t141 = claim_text(div6_nodes, "Merging `master` into `feat/a`");
			div6_nodes.forEach(detach);
			t142 = claim_space(section8_nodes);
			p23 = claim_element(section8_nodes, "P", {});
			var p23_nodes = children(p23);
			t143 = claim_text(p23_nodes, "If you want to recover the changes made in ");
			code20 = claim_element(p23_nodes, "CODE", {});
			var code20_nodes = children(code20);
			t144 = claim_text(code20_nodes, "feat/a");
			code20_nodes.forEach(detach);
			t145 = claim_text(p23_nodes, ", you can ");
			code21 = claim_element(p23_nodes, "CODE", {});
			var code21_nodes = children(code21);
			t146 = claim_text(code21_nodes, "revert");
			code21_nodes.forEach(detach);
			t147 = claim_text(p23_nodes, " the ");
			code22 = claim_element(p23_nodes, "CODE", {});
			var code22_nodes = children(code22);
			t148 = claim_text(code22_nodes, "revert");
			code22_nodes.forEach(detach);
			t149 = claim_text(p23_nodes, ":");
			p23_nodes.forEach(detach);
			t150 = claim_space(section8_nodes);
			p24 = claim_element(section8_nodes, "P", {});
			var p24_nodes = children(p24);
			code23 = claim_element(p24_nodes, "CODE", {});
			var code23_nodes = children(code23);
			t151 = claim_text(code23_nodes, "git revert ~#1");
			code23_nodes.forEach(detach);
			t152 = claim_text(p24_nodes, ":");
			p24_nodes.forEach(detach);
			t153 = claim_space(section8_nodes);
			p25 = claim_element(section8_nodes, "P", {});
			var p25_nodes = children(p25);
			img7 = claim_element(p25_nodes, "IMG", { src: true, alt: true });
			p25_nodes.forEach(detach);
			t154 = claim_space(section8_nodes);
			div7 = claim_element(section8_nodes, "DIV", { class: true });
			var div7_nodes = children(div7);
			t155 = claim_text(div7_nodes, "git revert the revert");
			div7_nodes.forEach(detach);
			t156 = claim_space(section8_nodes);
			p26 = claim_element(section8_nodes, "P", {});
			var p26_nodes = children(p26);
			t157 = claim_text(p26_nodes, "Now, when you are ready to merge your ");
			code24 = claim_element(p26_nodes, "CODE", {});
			var code24_nodes = children(code24);
			t158 = claim_text(code24_nodes, "feat/a");
			code24_nodes.forEach(detach);
			t159 = claim_text(p26_nodes, " branch into ");
			code25 = claim_element(p26_nodes, "CODE", {});
			var code25_nodes = children(code25);
			t160 = claim_text(code25_nodes, "master");
			code25_nodes.forEach(detach);
			t161 = claim_text(p26_nodes, ", you get the all the changes in ");
			code26 = claim_element(p26_nodes, "CODE", {});
			var code26_nodes = children(code26);
			t162 = claim_text(code26_nodes, "feat/a");
			code26_nodes.forEach(detach);
			t163 = claim_text(p26_nodes, ", a commit that revert all that, and a commit that reverts the revert commit, which meant, you still have all the changes in ");
			code27 = claim_element(p26_nodes, "CODE", {});
			var code27_nodes = children(code27);
			t164 = claim_text(code27_nodes, "feat/a");
			code27_nodes.forEach(detach);
			t165 = claim_text(p26_nodes, " in ");
			code28 = claim_element(p26_nodes, "CODE", {});
			var code28_nodes = children(code28);
			t166 = claim_text(code28_nodes, "master");
			code28_nodes.forEach(detach);
			t167 = claim_text(p26_nodes, ":");
			p26_nodes.forEach(detach);
			t168 = claim_space(section8_nodes);
			p27 = claim_element(section8_nodes, "P", {});
			var p27_nodes = children(p27);
			img8 = claim_element(p27_nodes, "IMG", { src: true, alt: true });
			p27_nodes.forEach(detach);
			t169 = claim_space(section8_nodes);
			div8 = claim_element(section8_nodes, "DIV", { class: true });
			var div8_nodes = children(div8);
			t170 = claim_text(div8_nodes, "Merging changes back to master");
			div8_nodes.forEach(detach);
			section8_nodes.forEach(detach);
			t171 = claim_space(nodes);
			section9 = claim_element(nodes, "SECTION", {});
			var section9_nodes = children(section9);
			h25 = claim_element(section9_nodes, "H2", {});
			var h25_nodes = children(h25);
			a36 = claim_element(h25_nodes, "A", { href: true, id: true });
			var a36_nodes = children(a36);
			t172 = claim_text(a36_nodes, "git rebase");
			a36_nodes.forEach(detach);
			h25_nodes.forEach(detach);
			t173 = claim_space(section9_nodes);
			p28 = claim_element(section9_nodes, "P", {});
			var p28_nodes = children(p28);
			code29 = claim_element(p28_nodes, "CODE", {});
			var code29_nodes = children(code29);
			t174 = claim_text(code29_nodes, "git rebase");
			code29_nodes.forEach(detach);
			t175 = claim_text(p28_nodes, " allows you to \"move\" commits to a different \"base\".");
			p28_nodes.forEach(detach);
			t176 = claim_space(section9_nodes);
			p29 = claim_element(section9_nodes, "P", {});
			var p29_nodes = children(p29);
			t177 = claim_text(p29_nodes, "For example, you branched out ");
			code30 = claim_element(p29_nodes, "CODE", {});
			var code30_nodes = children(code30);
			t178 = claim_text(code30_nodes, "branch-a");
			code30_nodes.forEach(detach);
			t179 = claim_text(p29_nodes, " from ");
			code31 = claim_element(p29_nodes, "CODE", {});
			var code31_nodes = children(code31);
			t180 = claim_text(code31_nodes, "master");
			code31_nodes.forEach(detach);
			t181 = claim_text(p29_nodes, " a while ago, and ");
			code32 = claim_element(p29_nodes, "CODE", {});
			var code32_nodes = children(code32);
			t182 = claim_text(code32_nodes, "master");
			code32_nodes.forEach(detach);
			t183 = claim_text(p29_nodes, " has made a few more commits. But if you merge your branch into master now, it would be a non fast-forward merge, creating an extra commit to the history. If you want a clean, one-line history, you can do a ");
			code33 = claim_element(p29_nodes, "CODE", {});
			var code33_nodes = children(code33);
			t184 = claim_text(code33_nodes, "rebase");
			code33_nodes.forEach(detach);
			t185 = claim_text(p29_nodes, ", replaying commits that you have made in ");
			code34 = claim_element(p29_nodes, "CODE", {});
			var code34_nodes = children(code34);
			t186 = claim_text(code34_nodes, "branch-a");
			code34_nodes.forEach(detach);
			t187 = claim_text(p29_nodes, " on top of the latest ");
			code35 = claim_element(p29_nodes, "CODE", {});
			var code35_nodes = children(code35);
			t188 = claim_text(code35_nodes, "master");
			code35_nodes.forEach(detach);
			t189 = claim_text(p29_nodes, ".");
			p29_nodes.forEach(detach);
			t190 = claim_space(section9_nodes);
			p30 = claim_element(section9_nodes, "P", {});
			var p30_nodes = children(p30);
			code36 = claim_element(p30_nodes, "CODE", {});
			var code36_nodes = children(code36);
			t191 = claim_text(code36_nodes, "git checkout branch-a");
			code36_nodes.forEach(detach);
			t192 = claim_text(p30_nodes, ", ");
			code37 = claim_element(p30_nodes, "CODE", {});
			var code37_nodes = children(code37);
			t193 = claim_text(code37_nodes, "git rebase master");
			code37_nodes.forEach(detach);
			t194 = claim_text(p30_nodes, ":");
			p30_nodes.forEach(detach);
			t195 = claim_space(section9_nodes);
			p31 = claim_element(section9_nodes, "P", {});
			var p31_nodes = children(p31);
			img9 = claim_element(p31_nodes, "IMG", { src: true, alt: true });
			p31_nodes.forEach(detach);
			t196 = claim_space(section9_nodes);
			div9 = claim_element(section9_nodes, "DIV", { class: true });
			var div9_nodes = children(div9);
			t197 = claim_text(div9_nodes, "git rebase");
			div9_nodes.forEach(detach);
			t198 = claim_space(section9_nodes);
			p32 = claim_element(section9_nodes, "P", {});
			var p32_nodes = children(p32);
			code38 = claim_element(p32_nodes, "CODE", {});
			var code38_nodes = children(code38);
			t199 = claim_text(code38_nodes, "git rebase");
			code38_nodes.forEach(detach);
			t200 = claim_text(p32_nodes, " does not have to be on top of the branch that you branched out, you can rebase to anywhere:");
			p32_nodes.forEach(detach);
			t201 = claim_space(section9_nodes);
			p33 = claim_element(section9_nodes, "P", {});
			var p33_nodes = children(p33);
			code39 = claim_element(p33_nodes, "CODE", {});
			var code39_nodes = children(code39);
			t202 = claim_text(code39_nodes, "git checkout branch-a");
			code39_nodes.forEach(detach);
			t203 = claim_text(p33_nodes, ", ");
			code40 = claim_element(p33_nodes, "CODE", {});
			var code40_nodes = children(code40);
			t204 = claim_text(code40_nodes, "git rebase --onto branch-b master branch-a");
			code40_nodes.forEach(detach);
			t205 = claim_text(p33_nodes, ":");
			p33_nodes.forEach(detach);
			t206 = claim_space(section9_nodes);
			p34 = claim_element(section9_nodes, "P", {});
			var p34_nodes = children(p34);
			img10 = claim_element(p34_nodes, "IMG", { src: true, alt: true });
			p34_nodes.forEach(detach);
			t207 = claim_space(section9_nodes);
			div10 = claim_element(section9_nodes, "DIV", { class: true });
			var div10_nodes = children(div10);
			t208 = claim_text(div10_nodes, "git rebase");
			div10_nodes.forEach(detach);
			t209 = claim_space(section9_nodes);
			p35 = claim_element(section9_nodes, "P", {});
			var p35_nodes = children(p35);
			t210 = claim_text(p35_nodes, "There's 3 reference point you should know when doing a git rebase:");
			p35_nodes.forEach(detach);
			t211 = claim_space(section9_nodes);
			ul5 = claim_element(section9_nodes, "UL", {});
			var ul5_nodes = children(ul5);
			li27 = claim_element(ul5_nodes, "LI", {});
			var li27_nodes = children(li27);
			code41 = claim_element(li27_nodes, "CODE", {});
			var code41_nodes = children(code41);
			t212 = claim_text(code41_nodes, "<new base>");
			code41_nodes.forEach(detach);
			li27_nodes.forEach(detach);
			t213 = claim_space(ul5_nodes);
			li28 = claim_element(ul5_nodes, "LI", {});
			var li28_nodes = children(li28);
			code42 = claim_element(li28_nodes, "CODE", {});
			var code42_nodes = children(code42);
			t214 = claim_text(code42_nodes, "<upstream>");
			code42_nodes.forEach(detach);
			li28_nodes.forEach(detach);
			t215 = claim_space(ul5_nodes);
			li29 = claim_element(ul5_nodes, "LI", {});
			var li29_nodes = children(li29);
			code43 = claim_element(li29_nodes, "CODE", {});
			var code43_nodes = children(code43);
			t216 = claim_text(code43_nodes, "<branch>");
			code43_nodes.forEach(detach);
			li29_nodes.forEach(detach);
			ul5_nodes.forEach(detach);
			t217 = claim_space(section9_nodes);
			p36 = claim_element(section9_nodes, "P", {});
			var p36_nodes = children(p36);
			picture0 = claim_element(p36_nodes, "PICTURE", {});
			var picture0_nodes = children(picture0);
			source0 = claim_element(picture0_nodes, "SOURCE", { type: true, srcset: true });
			source1 = claim_element(picture0_nodes, "SOURCE", { type: true, srcset: true });
			img11 = claim_element(picture0_nodes, "IMG", { alt: true, src: true });
			picture0_nodes.forEach(detach);
			p36_nodes.forEach(detach);
			t218 = claim_space(section9_nodes);
			div11 = claim_element(section9_nodes, "DIV", { class: true });
			var div11_nodes = children(div11);
			t219 = claim_text(div11_nodes, "git rebase");
			div11_nodes.forEach(detach);
			t220 = claim_space(section9_nodes);
			p37 = claim_element(section9_nodes, "P", {});
			var p37_nodes = children(p37);
			t221 = claim_text(p37_nodes, "Here are a few things you should know:");
			p37_nodes.forEach(detach);
			t222 = claim_space(section9_nodes);
			ul6 = claim_element(section9_nodes, "UL", {});
			var ul6_nodes = children(ul6);
			li30 = claim_element(ul6_nodes, "LI", {});
			var li30_nodes = children(li30);
			code44 = claim_element(li30_nodes, "CODE", {});
			var code44_nodes = children(code44);
			t223 = claim_text(code44_nodes, "git rebase");
			code44_nodes.forEach(detach);
			t224 = claim_text(li30_nodes, " will replay the commits from ");
			code45 = claim_element(li30_nodes, "CODE", {});
			var code45_nodes = children(code45);
			t225 = claim_text(code45_nodes, "<upstream>");
			code45_nodes.forEach(detach);
			t226 = claim_text(li30_nodes, " to ");
			code46 = claim_element(li30_nodes, "CODE", {});
			var code46_nodes = children(code46);
			t227 = claim_text(code46_nodes, "<branch>");
			code46_nodes.forEach(detach);
			t228 = claim_text(li30_nodes, " onto ");
			code47 = claim_element(li30_nodes, "CODE", {});
			var code47_nodes = children(code47);
			t229 = claim_text(code47_nodes, "<new base>");
			code47_nodes.forEach(detach);
			t230 = claim_text(li30_nodes, ".");
			li30_nodes.forEach(detach);
			t231 = claim_space(ul6_nodes);
			li31 = claim_element(ul6_nodes, "LI", {});
			var li31_nodes = children(li31);
			t232 = claim_text(li31_nodes, "If you specify ");
			code48 = claim_element(li31_nodes, "CODE", {});
			var code48_nodes = children(code48);
			t233 = claim_text(code48_nodes, "<upstream>");
			code48_nodes.forEach(detach);
			t234 = claim_text(li31_nodes, " as a branch name, ");
			code49 = claim_element(li31_nodes, "CODE", {});
			var code49_nodes = children(code49);
			t235 = claim_text(code49_nodes, "git rebase");
			code49_nodes.forEach(detach);
			t236 = claim_text(li31_nodes, " will replay commits from the common ancestor of ");
			code50 = claim_element(li31_nodes, "CODE", {});
			var code50_nodes = children(code50);
			t237 = claim_text(code50_nodes, "<upstream>");
			code50_nodes.forEach(detach);
			t238 = claim_text(li31_nodes, " and ");
			code51 = claim_element(li31_nodes, "CODE", {});
			var code51_nodes = children(code51);
			t239 = claim_text(code51_nodes, "<branch>");
			code51_nodes.forEach(detach);
			t240 = claim_text(li31_nodes, " to ");
			code52 = claim_element(li31_nodes, "CODE", {});
			var code52_nodes = children(code52);
			t241 = claim_text(code52_nodes, "<branch>");
			code52_nodes.forEach(detach);
			t242 = claim_text(li31_nodes, ".");
			li31_nodes.forEach(detach);
			t243 = claim_space(ul6_nodes);
			li32 = claim_element(ul6_nodes, "LI", {});
			var li32_nodes = children(li32);
			t244 = claim_text(li32_nodes, "If you do not specify ");
			code53 = claim_element(li32_nodes, "CODE", {});
			var code53_nodes = children(code53);
			t245 = claim_text(code53_nodes, "<branch>");
			code53_nodes.forEach(detach);
			t246 = claim_text(li32_nodes, ", the default is the ");
			code54 = claim_element(li32_nodes, "CODE", {});
			var code54_nodes = children(code54);
			t247 = claim_text(code54_nodes, "HEAD");
			code54_nodes.forEach(detach);
			t248 = claim_text(li32_nodes, ", current commit you are at now.");
			li32_nodes.forEach(detach);
			t249 = claim_space(ul6_nodes);
			li33 = claim_element(ul6_nodes, "LI", {});
			var li33_nodes = children(li33);
			t250 = claim_text(li33_nodes, "If you do not specify ");
			code55 = claim_element(li33_nodes, "CODE", {});
			var code55_nodes = children(code55);
			t251 = claim_text(code55_nodes, "--onto <new base>");
			code55_nodes.forEach(detach);
			t252 = claim_text(li33_nodes, ", the new base will be default to ");
			code56 = claim_element(li33_nodes, "CODE", {});
			var code56_nodes = children(code56);
			t253 = claim_text(code56_nodes, "<upsttream>");
			code56_nodes.forEach(detach);
			t254 = claim_text(li33_nodes, ", that's why ");
			code57 = claim_element(li33_nodes, "CODE", {});
			var code57_nodes = children(code57);
			t255 = claim_text(code57_nodes, "git rebase master");
			code57_nodes.forEach(detach);
			t256 = claim_text(li33_nodes, " is equivalent to ");
			code58 = claim_element(li33_nodes, "CODE", {});
			var code58_nodes = children(code58);
			t257 = claim_text(code58_nodes, "git rebase --onto master master");
			code58_nodes.forEach(detach);
			t258 = claim_text(li33_nodes, ".");
			li33_nodes.forEach(detach);
			t259 = claim_space(ul6_nodes);
			li34 = claim_element(ul6_nodes, "LI", {});
			var li34_nodes = children(li34);
			t260 = claim_text(li34_nodes, "If you do not specify ");
			code59 = claim_element(li34_nodes, "CODE", {});
			var code59_nodes = children(code59);
			t261 = claim_text(code59_nodes, "<upstream>");
			code59_nodes.forEach(detach);
			t262 = claim_text(li34_nodes, ", it will be the upstream of the current branch. So ");
			code60 = claim_element(li34_nodes, "CODE", {});
			var code60_nodes = children(code60);
			t263 = claim_text(code60_nodes, "git rebase");
			code60_nodes.forEach(detach);
			t264 = claim_text(li34_nodes, " is equivalent to ");
			code61 = claim_element(li34_nodes, "CODE", {});
			var code61_nodes = children(code61);
			t265 = claim_text(code61_nodes, "git rebase <origin/current-branch>");
			code61_nodes.forEach(detach);
			t266 = claim_text(li34_nodes, ".");
			li34_nodes.forEach(detach);
			ul6_nodes.forEach(detach);
			section9_nodes.forEach(detach);
			t267 = claim_space(nodes);
			section10 = claim_element(nodes, "SECTION", {});
			var section10_nodes = children(section10);
			h33 = claim_element(section10_nodes, "H3", {});
			var h33_nodes = children(h33);
			a37 = claim_element(h33_nodes, "A", { href: true, id: true });
			var a37_nodes = children(a37);
			t268 = claim_text(a37_nodes, "git rebase --interactive");
			a37_nodes.forEach(detach);
			h33_nodes.forEach(detach);
			t269 = claim_space(section10_nodes);
			p38 = claim_element(section10_nodes, "P", {});
			var p38_nodes = children(p38);
			code62 = claim_element(p38_nodes, "CODE", {});
			var code62_nodes = children(code62);
			t270 = claim_text(code62_nodes, "git rebase");
			code62_nodes.forEach(detach);
			t271 = claim_text(p38_nodes, " has an interactive mode, which allows you to specify instructions while replaying commits during a rebase.");
			p38_nodes.forEach(detach);
			t272 = claim_space(section10_nodes);
			p39 = claim_element(section10_nodes, "P", {});
			var p39_nodes = children(p39);
			picture1 = claim_element(p39_nodes, "PICTURE", {});
			var picture1_nodes = children(picture1);
			source2 = claim_element(picture1_nodes, "SOURCE", { type: true, srcset: true });
			source3 = claim_element(picture1_nodes, "SOURCE", { type: true, srcset: true });
			img12 = claim_element(picture1_nodes, "IMG", { alt: true, src: true });
			picture1_nodes.forEach(detach);
			p39_nodes.forEach(detach);
			t273 = claim_space(section10_nodes);
			div12 = claim_element(section10_nodes, "DIV", { class: true });
			var div12_nodes = children(div12);
			t274 = claim_text(div12_nodes, "git rebase interactive");
			div12_nodes.forEach(detach);
			t275 = claim_space(section10_nodes);
			p40 = claim_element(section10_nodes, "P", {});
			var p40_nodes = children(p40);
			t276 = claim_text(p40_nodes, "When you run ");
			code63 = claim_element(p40_nodes, "CODE", {});
			var code63_nodes = children(code63);
			t277 = claim_text(code63_nodes, "git rebase --interactive");
			code63_nodes.forEach(detach);
			t278 = claim_text(p40_nodes, ", git will prompt you with an editor to edit the instructions. In it, you will see a list of commits that will be replayed:");
			p40_nodes.forEach(detach);
			t279 = claim_space(section10_nodes);
			pre0 = claim_element(section10_nodes, "PRE", { class: true });
			var pre0_nodes = children(pre0);
			pre0_nodes.forEach(detach);
			section10_nodes.forEach(detach);
			t280 = claim_space(nodes);
			section11 = claim_element(nodes, "SECTION", {});
			var section11_nodes = children(section11);
			h40 = claim_element(section11_nodes, "H4", {});
			var h40_nodes = children(h40);
			a38 = claim_element(h40_nodes, "A", { href: true, id: true });
			var a38_nodes = children(a38);
			t281 = claim_text(a38_nodes, "pick");
			a38_nodes.forEach(detach);
			h40_nodes.forEach(detach);
			t282 = claim_space(section11_nodes);
			p41 = claim_element(section11_nodes, "P", {});
			var p41_nodes = children(p41);
			t283 = claim_text(p41_nodes, "The default instruction. Will just use the commit while replaying:");
			p41_nodes.forEach(detach);
			t284 = claim_space(section11_nodes);
			p42 = claim_element(section11_nodes, "P", {});
			var p42_nodes = children(p42);
			picture2 = claim_element(p42_nodes, "PICTURE", {});
			var picture2_nodes = children(picture2);
			source4 = claim_element(picture2_nodes, "SOURCE", { type: true, srcset: true });
			source5 = claim_element(picture2_nodes, "SOURCE", { type: true, srcset: true });
			img13 = claim_element(picture2_nodes, "IMG", { alt: true, src: true });
			picture2_nodes.forEach(detach);
			p42_nodes.forEach(detach);
			t285 = claim_space(section11_nodes);
			pre1 = claim_element(section11_nodes, "PRE", { class: true });
			var pre1_nodes = children(pre1);
			pre1_nodes.forEach(detach);
			section11_nodes.forEach(detach);
			t286 = claim_space(nodes);
			section12 = claim_element(nodes, "SECTION", {});
			var section12_nodes = children(section12);
			h41 = claim_element(section12_nodes, "H4", {});
			var h41_nodes = children(h41);
			a39 = claim_element(h41_nodes, "A", { href: true, id: true });
			var a39_nodes = children(a39);
			t287 = claim_text(a39_nodes, "drop");
			a39_nodes.forEach(detach);
			h41_nodes.forEach(detach);
			t288 = claim_space(section12_nodes);
			p43 = claim_element(section12_nodes, "P", {});
			var p43_nodes = children(p43);
			t289 = claim_text(p43_nodes, "Drop will omit the commit:");
			p43_nodes.forEach(detach);
			t290 = claim_space(section12_nodes);
			p44 = claim_element(section12_nodes, "P", {});
			var p44_nodes = children(p44);
			picture3 = claim_element(p44_nodes, "PICTURE", {});
			var picture3_nodes = children(picture3);
			source6 = claim_element(picture3_nodes, "SOURCE", { type: true, srcset: true });
			source7 = claim_element(picture3_nodes, "SOURCE", { type: true, srcset: true });
			img14 = claim_element(picture3_nodes, "IMG", { alt: true, src: true });
			picture3_nodes.forEach(detach);
			p44_nodes.forEach(detach);
			t291 = claim_space(section12_nodes);
			pre2 = claim_element(section12_nodes, "PRE", { class: true });
			var pre2_nodes = children(pre2);
			pre2_nodes.forEach(detach);
			section12_nodes.forEach(detach);
			t292 = claim_space(nodes);
			section13 = claim_element(nodes, "SECTION", {});
			var section13_nodes = children(section13);
			h42 = claim_element(section13_nodes, "H4", {});
			var h42_nodes = children(h42);
			a40 = claim_element(h42_nodes, "A", { href: true, id: true });
			var a40_nodes = children(a40);
			t293 = claim_text(a40_nodes, "squash & fixup");
			a40_nodes.forEach(detach);
			h42_nodes.forEach(detach);
			t294 = claim_space(section13_nodes);
			p45 = claim_element(section13_nodes, "P", {});
			var p45_nodes = children(p45);
			t295 = claim_text(p45_nodes, "Squash & Fixup will combine your commit with the previous commit, the only difference is that with ");
			code64 = claim_element(p45_nodes, "CODE", {});
			var code64_nodes = children(code64);
			t296 = claim_text(code64_nodes, "squash");
			code64_nodes.forEach(detach);
			t297 = claim_text(p45_nodes, ", git will prompt you to edit the commit message of the combined commit, while ");
			code65 = claim_element(p45_nodes, "CODE", {});
			var code65_nodes = children(code65);
			t298 = claim_text(code65_nodes, "fixup");
			code65_nodes.forEach(detach);
			t299 = claim_text(p45_nodes, " will drop the commit of the ");
			code66 = claim_element(p45_nodes, "CODE", {});
			var code66_nodes = children(code66);
			t300 = claim_text(code66_nodes, "fixup");
			code66_nodes.forEach(detach);
			t301 = claim_text(p45_nodes, "ed commit.");
			p45_nodes.forEach(detach);
			t302 = claim_space(section13_nodes);
			p46 = claim_element(section13_nodes, "P", {});
			var p46_nodes = children(p46);
			picture4 = claim_element(p46_nodes, "PICTURE", {});
			var picture4_nodes = children(picture4);
			source8 = claim_element(picture4_nodes, "SOURCE", { type: true, srcset: true });
			source9 = claim_element(picture4_nodes, "SOURCE", { type: true, srcset: true });
			img15 = claim_element(picture4_nodes, "IMG", { alt: true, src: true });
			picture4_nodes.forEach(detach);
			p46_nodes.forEach(detach);
			t303 = claim_space(section13_nodes);
			pre3 = claim_element(section13_nodes, "PRE", { class: true });
			var pre3_nodes = children(pre3);
			pre3_nodes.forEach(detach);
			section13_nodes.forEach(detach);
			t304 = claim_space(nodes);
			section14 = claim_element(nodes, "SECTION", {});
			var section14_nodes = children(section14);
			h43 = claim_element(section14_nodes, "H4", {});
			var h43_nodes = children(h43);
			a41 = claim_element(h43_nodes, "A", { href: true, id: true });
			var a41_nodes = children(a41);
			t305 = claim_text(a41_nodes, "break");
			a41_nodes.forEach(detach);
			h43_nodes.forEach(detach);
			t306 = claim_space(section14_nodes);
			p47 = claim_element(section14_nodes, "P", {});
			var p47_nodes = children(p47);
			t307 = claim_text(p47_nodes, "Pause the rebase. You can do add more commits here if you want. When you are done, make sure that your workspace and stage is clean, run ");
			code67 = claim_element(p47_nodes, "CODE", {});
			var code67_nodes = children(code67);
			t308 = claim_text(code67_nodes, "git rebase --continue");
			code67_nodes.forEach(detach);
			t309 = claim_text(p47_nodes, " to continue.");
			p47_nodes.forEach(detach);
			t310 = claim_space(section14_nodes);
			p48 = claim_element(section14_nodes, "P", {});
			var p48_nodes = children(p48);
			picture5 = claim_element(p48_nodes, "PICTURE", {});
			var picture5_nodes = children(picture5);
			source10 = claim_element(picture5_nodes, "SOURCE", { type: true, srcset: true });
			source11 = claim_element(picture5_nodes, "SOURCE", { type: true, srcset: true });
			img16 = claim_element(picture5_nodes, "IMG", { alt: true, src: true });
			picture5_nodes.forEach(detach);
			p48_nodes.forEach(detach);
			t311 = claim_space(section14_nodes);
			pre4 = claim_element(section14_nodes, "PRE", { class: true });
			var pre4_nodes = children(pre4);
			pre4_nodes.forEach(detach);
			section14_nodes.forEach(detach);
			t312 = claim_space(nodes);
			section15 = claim_element(nodes, "SECTION", {});
			var section15_nodes = children(section15);
			h44 = claim_element(section15_nodes, "H4", {});
			var h44_nodes = children(h44);
			a42 = claim_element(h44_nodes, "A", { href: true, id: true });
			var a42_nodes = children(a42);
			t313 = claim_text(a42_nodes, "edit");
			a42_nodes.forEach(detach);
			h44_nodes.forEach(detach);
			t314 = claim_space(section15_nodes);
			p49 = claim_element(section15_nodes, "P", {});
			var p49_nodes = children(p49);
			t315 = claim_text(p49_nodes, "Pause the rebase at the commit that you are editing, before the commit has been commited. You can add, remove or ammend your files before continue the rebase process.");
			p49_nodes.forEach(detach);
			t316 = claim_space(section15_nodes);
			p50 = claim_element(section15_nodes, "P", {});
			var p50_nodes = children(p50);
			picture6 = claim_element(p50_nodes, "PICTURE", {});
			var picture6_nodes = children(picture6);
			source12 = claim_element(picture6_nodes, "SOURCE", { type: true, srcset: true });
			source13 = claim_element(picture6_nodes, "SOURCE", { type: true, srcset: true });
			img17 = claim_element(picture6_nodes, "IMG", { alt: true, src: true });
			picture6_nodes.forEach(detach);
			p50_nodes.forEach(detach);
			t317 = claim_space(section15_nodes);
			pre5 = claim_element(section15_nodes, "PRE", { class: true });
			var pre5_nodes = children(pre5);
			pre5_nodes.forEach(detach);
			section15_nodes.forEach(detach);
			t318 = claim_space(nodes);
			section16 = claim_element(nodes, "SECTION", {});
			var section16_nodes = children(section16);
			h34 = claim_element(section16_nodes, "H3", {});
			var h34_nodes = children(h34);
			a43 = claim_element(h34_nodes, "A", { href: true, id: true });
			var a43_nodes = children(a43);
			t319 = claim_text(a43_nodes, "git pull --rebase");
			a43_nodes.forEach(detach);
			h34_nodes.forEach(detach);
			t320 = claim_space(section16_nodes);
			p51 = claim_element(section16_nodes, "P", {});
			var p51_nodes = children(p51);
			t321 = claim_text(p51_nodes, "There's a rebase mode for git pull, where it will be ");
			code68 = claim_element(p51_nodes, "CODE", {});
			var code68_nodes = children(code68);
			t322 = claim_text(code68_nodes, "git fetch origin branch");
			code68_nodes.forEach(detach);
			t323 = claim_text(p51_nodes, " + ");
			code69 = claim_element(p51_nodes, "CODE", {});
			var code69_nodes = children(code69);
			t324 = claim_text(code69_nodes, "git rebase origin/branch");
			code69_nodes.forEach(detach);
			t325 = claim_text(p51_nodes, ".");
			p51_nodes.forEach(detach);
			t326 = claim_space(section16_nodes);
			p52 = claim_element(section16_nodes, "P", {});
			var p52_nodes = children(p52);
			img18 = claim_element(p52_nodes, "IMG", { src: true, alt: true });
			p52_nodes.forEach(detach);
			t327 = claim_space(section16_nodes);
			div13 = claim_element(section16_nodes, "DIV", { class: true });
			var div13_nodes = children(div13);
			t328 = claim_text(div13_nodes, "git pull --rebase");
			div13_nodes.forEach(detach);
			section16_nodes.forEach(detach);
			t329 = claim_space(nodes);
			section17 = claim_element(nodes, "SECTION", {});
			var section17_nodes = children(section17);
			h35 = claim_element(section17_nodes, "H3", {});
			var h35_nodes = children(h35);
			a44 = claim_element(h35_nodes, "A", { href: true, id: true });
			var a44_nodes = children(a44);
			t330 = claim_text(a44_nodes, "git rebase a shared branch");
			a44_nodes.forEach(detach);
			h35_nodes.forEach(detach);
			t331 = claim_space(section17_nodes);
			p53 = claim_element(section17_nodes, "P", {});
			var p53_nodes = children(p53);
			t332 = claim_text(p53_nodes, "Say ");
			code70 = claim_element(p53_nodes, "CODE", {});
			var code70_nodes = children(code70);
			t333 = claim_text(code70_nodes, "x");
			code70_nodes.forEach(detach);
			t334 = claim_text(p53_nodes, " and ");
			code71 = claim_element(p53_nodes, "CODE", {});
			var code71_nodes = children(code71);
			t335 = claim_text(code71_nodes, "y");
			code71_nodes.forEach(detach);
			t336 = claim_text(p53_nodes, " are working on the ");
			code72 = claim_element(p53_nodes, "CODE", {});
			var code72_nodes = children(code72);
			t337 = claim_text(code72_nodes, "feat/a");
			code72_nodes.forEach(detach);
			t338 = claim_text(p53_nodes, " branch.");
			p53_nodes.forEach(detach);
			t339 = claim_space(section17_nodes);
			p54 = claim_element(section17_nodes, "P", {});
			var p54_nodes = children(p54);
			picture7 = claim_element(p54_nodes, "PICTURE", {});
			var picture7_nodes = children(picture7);
			source14 = claim_element(picture7_nodes, "SOURCE", { type: true, srcset: true });
			source15 = claim_element(picture7_nodes, "SOURCE", { type: true, srcset: true });
			img19 = claim_element(picture7_nodes, "IMG", { alt: true, src: true });
			picture7_nodes.forEach(detach);
			p54_nodes.forEach(detach);
			t340 = claim_space(section17_nodes);
			p55 = claim_element(section17_nodes, "P", {});
			var p55_nodes = children(p55);
			code73 = claim_element(p55_nodes, "CODE", {});
			var code73_nodes = children(code73);
			t341 = claim_text(code73_nodes, "x");
			code73_nodes.forEach(detach);
			t342 = claim_text(p55_nodes, " decided to rebase the ");
			code74 = claim_element(p55_nodes, "CODE", {});
			var code74_nodes = children(code74);
			t343 = claim_text(code74_nodes, "feat/a");
			code74_nodes.forEach(detach);
			t344 = claim_text(p55_nodes, " branch to squash and drop some commits:");
			p55_nodes.forEach(detach);
			t345 = claim_space(section17_nodes);
			p56 = claim_element(section17_nodes, "P", {});
			var p56_nodes = children(p56);
			picture8 = claim_element(p56_nodes, "PICTURE", {});
			var picture8_nodes = children(picture8);
			source16 = claim_element(picture8_nodes, "SOURCE", { type: true, srcset: true });
			source17 = claim_element(picture8_nodes, "SOURCE", { type: true, srcset: true });
			img20 = claim_element(picture8_nodes, "IMG", { alt: true, src: true });
			picture8_nodes.forEach(detach);
			p56_nodes.forEach(detach);
			t346 = claim_space(section17_nodes);
			p57 = claim_element(section17_nodes, "P", {});
			var p57_nodes = children(p57);
			t347 = claim_text(p57_nodes, "While ");
			code75 = claim_element(p57_nodes, "CODE", {});
			var code75_nodes = children(code75);
			t348 = claim_text(code75_nodes, "x");
			code75_nodes.forEach(detach);
			t349 = claim_text(p57_nodes, " had done that, that was just a part of the whole picture. Because the ");
			code76 = claim_element(p57_nodes, "CODE", {});
			var code76_nodes = children(code76);
			t350 = claim_text(code76_nodes, "rebase");
			code76_nodes.forEach(detach);
			t351 = claim_text(p57_nodes, " on his local machine changed the git history on his local copy only.");
			p57_nodes.forEach(detach);
			t352 = claim_space(section17_nodes);
			p58 = claim_element(section17_nodes, "P", {});
			var p58_nodes = children(p58);
			picture9 = claim_element(p58_nodes, "PICTURE", {});
			var picture9_nodes = children(picture9);
			source18 = claim_element(picture9_nodes, "SOURCE", { type: true, srcset: true });
			source19 = claim_element(picture9_nodes, "SOURCE", { type: true, srcset: true });
			img21 = claim_element(picture9_nodes, "IMG", { alt: true, src: true });
			picture9_nodes.forEach(detach);
			p58_nodes.forEach(detach);
			t353 = claim_space(section17_nodes);
			p59 = claim_element(section17_nodes, "P", {});
			var p59_nodes = children(p59);
			t354 = claim_text(p59_nodes, "To make the change on the remote server as well, ");
			code77 = claim_element(p59_nodes, "CODE", {});
			var code77_nodes = children(code77);
			t355 = claim_text(code77_nodes, "x");
			code77_nodes.forEach(detach);
			t356 = claim_text(p59_nodes, " forced push his branch to the remote server. (");
			strong3 = claim_element(p59_nodes, "STRONG", {});
			var strong3_nodes = children(strong3);
			t357 = claim_text(strong3_nodes, "Note:");
			strong3_nodes.forEach(detach);
			t358 = claim_text(p59_nodes, " You can push without ");
			code78 = claim_element(p59_nodes, "CODE", {});
			var code78_nodes = children(code78);
			t359 = claim_text(code78_nodes, "--force");
			code78_nodes.forEach(detach);
			t360 = claim_text(p59_nodes, " if the origin branch cannot fast-forward merge your local branch)");
			p59_nodes.forEach(detach);
			t361 = claim_space(section17_nodes);
			p60 = claim_element(section17_nodes, "P", {});
			var p60_nodes = children(p60);
			t362 = claim_text(p60_nodes, "While ");
			code79 = claim_element(p60_nodes, "CODE", {});
			var code79_nodes = children(code79);
			t363 = claim_text(code79_nodes, "y");
			code79_nodes.forEach(detach);
			t364 = claim_text(p60_nodes, " on the other hand, did not know about the ");
			code80 = claim_element(p60_nodes, "CODE", {});
			var code80_nodes = children(code80);
			t365 = claim_text(code80_nodes, "rebase");
			code80_nodes.forEach(detach);
			t366 = claim_text(p60_nodes, ", so when ");
			code81 = claim_element(p60_nodes, "CODE", {});
			var code81_nodes = children(code81);
			t367 = claim_text(code81_nodes, "y");
			code81_nodes.forEach(detach);
			t368 = claim_text(p60_nodes, " pulled the code, it ended up with a messed up merged of a messed up git history:");
			p60_nodes.forEach(detach);
			t369 = claim_space(section17_nodes);
			p61 = claim_element(section17_nodes, "P", {});
			var p61_nodes = children(p61);
			picture10 = claim_element(p61_nodes, "PICTURE", {});
			var picture10_nodes = children(picture10);
			source20 = claim_element(picture10_nodes, "SOURCE", { type: true, srcset: true });
			source21 = claim_element(picture10_nodes, "SOURCE", { type: true, srcset: true });
			img22 = claim_element(picture10_nodes, "IMG", { alt: true, src: true });
			picture10_nodes.forEach(detach);
			p61_nodes.forEach(detach);
			t370 = claim_space(section17_nodes);
			p62 = claim_element(section17_nodes, "P", {});
			var p62_nodes = children(p62);
			t371 = claim_text(p62_nodes, "In most cases, there would be a merge conflict, because ");
			code82 = claim_element(p62_nodes, "CODE", {});
			var code82_nodes = children(code82);
			t372 = claim_text(code82_nodes, "x");
			code82_nodes.forEach(detach);
			t373 = claim_text(p62_nodes, " and ");
			code83 = claim_element(p62_nodes, "CODE", {});
			var code83_nodes = children(code83);
			t374 = claim_text(code83_nodes, "y");
			code83_nodes.forEach(detach);
			t375 = claim_text(p62_nodes, "'s branch would have made changes on the same file.");
			p62_nodes.forEach(detach);
			t376 = claim_space(section17_nodes);
			p63 = claim_element(section17_nodes, "P", {});
			var p63_nodes = children(p63);
			t377 = claim_text(p63_nodes, "So, the correct way, if the rebase is necessary, is to notify ");
			code84 = claim_element(p63_nodes, "CODE", {});
			var code84_nodes = children(code84);
			t378 = claim_text(code84_nodes, "y");
			code84_nodes.forEach(detach);
			t379 = claim_text(p63_nodes, " about the rebase, so that ");
			code85 = claim_element(p63_nodes, "CODE", {});
			var code85_nodes = children(code85);
			t380 = claim_text(code85_nodes, "y");
			code85_nodes.forEach(detach);
			t381 = claim_text(p63_nodes, " can ");
			code86 = claim_element(p63_nodes, "CODE", {});
			var code86_nodes = children(code86);
			t382 = claim_text(code86_nodes, "git reset --hard");
			code86_nodes.forEach(detach);
			t383 = claim_text(p63_nodes, " his branch to the remote branch.");
			p63_nodes.forEach(detach);
			t384 = claim_space(section17_nodes);
			p64 = claim_element(section17_nodes, "P", {});
			var p64_nodes = children(p64);
			picture11 = claim_element(p64_nodes, "PICTURE", {});
			var picture11_nodes = children(picture11);
			source22 = claim_element(picture11_nodes, "SOURCE", { type: true, srcset: true });
			source23 = claim_element(picture11_nodes, "SOURCE", { type: true, srcset: true });
			img23 = claim_element(picture11_nodes, "IMG", { alt: true, src: true });
			picture11_nodes.forEach(detach);
			p64_nodes.forEach(detach);
			t385 = claim_space(section17_nodes);
			p65 = claim_element(section17_nodes, "P", {});
			var p65_nodes = children(p65);
			t386 = claim_text(p65_nodes, "If unfortunately, at the same time, ");
			code87 = claim_element(p65_nodes, "CODE", {});
			var code87_nodes = children(code87);
			t387 = claim_text(code87_nodes, "y");
			code87_nodes.forEach(detach);
			t388 = claim_text(p65_nodes, " has made more commits to his local branch, he would have to ");
			code88 = claim_element(p65_nodes, "CODE", {});
			var code88_nodes = children(code88);
			t389 = claim_text(code88_nodes, "git rebase");
			code88_nodes.forEach(detach);
			t390 = claim_text(p65_nodes, " the new changes onto the remote branch, or ");
			code89 = claim_element(p65_nodes, "CODE", {});
			var code89_nodes = children(code89);
			t391 = claim_text(code89_nodes, "git cherry-pick");
			code89_nodes.forEach(detach);
			t392 = claim_text(p65_nodes, " the new changes after the ");
			code90 = claim_element(p65_nodes, "CODE", {});
			var code90_nodes = children(code90);
			t393 = claim_text(code90_nodes, "git reset --hard");
			code90_nodes.forEach(detach);
			t394 = claim_text(p65_nodes, ".");
			p65_nodes.forEach(detach);
			t395 = claim_space(section17_nodes);
			p66 = claim_element(section17_nodes, "P", {});
			var p66_nodes = children(p66);
			t396 = claim_text(p66_nodes, "In the companies that I have worked with, forbidden a ");
			code91 = claim_element(p66_nodes, "CODE", {});
			var code91_nodes = children(code91);
			t397 = claim_text(code91_nodes, "rebase");
			code91_nodes.forEach(detach);
			t398 = claim_text(p66_nodes, " on a common branch, especially the ");
			code92 = claim_element(p66_nodes, "CODE", {});
			var code92_nodes = children(code92);
			t399 = claim_text(code92_nodes, "master");
			code92_nodes.forEach(detach);
			t400 = claim_text(p66_nodes, " branch.");
			p66_nodes.forEach(detach);
			section17_nodes.forEach(detach);
			t401 = claim_space(nodes);
			section18 = claim_element(nodes, "SECTION", {});
			var section18_nodes = children(section18);
			h26 = claim_element(section18_nodes, "H2", {});
			var h26_nodes = children(h26);
			a45 = claim_element(h26_nodes, "A", { href: true, id: true });
			var a45_nodes = children(a45);
			t402 = claim_text(a45_nodes, "git log");
			a45_nodes.forEach(detach);
			h26_nodes.forEach(detach);
			t403 = claim_space(section18_nodes);
			p67 = claim_element(section18_nodes, "P", {});
			var p67_nodes = children(p67);
			t404 = claim_text(p67_nodes, "The go-to command to look at your git history. There's a few options that is worth mentioning, that allow us to search through the sea of commits:");
			p67_nodes.forEach(detach);
			section18_nodes.forEach(detach);
			t405 = claim_space(nodes);
			section19 = claim_element(nodes, "SECTION", {});
			var section19_nodes = children(section19);
			h36 = claim_element(section19_nodes, "H3", {});
			var h36_nodes = children(h36);
			a46 = claim_element(h36_nodes, "A", { href: true, id: true });
			var a46_nodes = children(a46);
			t406 = claim_text(a46_nodes, "--since, --after, --until, --before");
			a46_nodes.forEach(detach);
			h36_nodes.forEach(detach);
			t407 = claim_space(section19_nodes);
			p68 = claim_element(section19_nodes, "P", {});
			var p68_nodes = children(p68);
			t408 = claim_text(p68_nodes, "You can filter out commits within a specific timeframe");
			p68_nodes.forEach(detach);
			section19_nodes.forEach(detach);
			t409 = claim_space(nodes);
			section20 = claim_element(nodes, "SECTION", {});
			var section20_nodes = children(section20);
			h37 = claim_element(section20_nodes, "H3", {});
			var h37_nodes = children(h37);
			a47 = claim_element(h37_nodes, "A", { href: true, id: true });
			var a47_nodes = children(a47);
			t410 = claim_text(a47_nodes, "--grep");
			a47_nodes.forEach(detach);
			h37_nodes.forEach(detach);
			t411 = claim_space(section20_nodes);
			p69 = claim_element(section20_nodes, "P", {});
			var p69_nodes = children(p69);
			t412 = claim_text(p69_nodes, "You can filter out commits based on commit message");
			p69_nodes.forEach(detach);
			section20_nodes.forEach(detach);
			t413 = claim_space(nodes);
			section21 = claim_element(nodes, "SECTION", {});
			var section21_nodes = children(section21);
			h38 = claim_element(section21_nodes, "H3", {});
			var h38_nodes = children(h38);
			a48 = claim_element(h38_nodes, "A", { href: true, id: true });
			var a48_nodes = children(a48);
			t414 = claim_text(a48_nodes, "--invert-grep");
			a48_nodes.forEach(detach);
			h38_nodes.forEach(detach);
			t415 = claim_space(section21_nodes);
			p70 = claim_element(section21_nodes, "P", {});
			var p70_nodes = children(p70);
			t416 = claim_text(p70_nodes, "You can filter out commits that does not match the ");
			code93 = claim_element(p70_nodes, "CODE", {});
			var code93_nodes = children(code93);
			t417 = claim_text(code93_nodes, "--grep");
			code93_nodes.forEach(detach);
			p70_nodes.forEach(detach);
			section21_nodes.forEach(detach);
			t418 = claim_space(nodes);
			section22 = claim_element(nodes, "SECTION", {});
			var section22_nodes = children(section22);
			h39 = claim_element(section22_nodes, "H3", {});
			var h39_nodes = children(h39);
			a49 = claim_element(h39_nodes, "A", { href: true, id: true });
			var a49_nodes = children(a49);
			t419 = claim_text(a49_nodes, "--all-match");
			a49_nodes.forEach(detach);
			h39_nodes.forEach(detach);
			t420 = claim_space(section22_nodes);
			p71 = claim_element(section22_nodes, "P", {});
			var p71_nodes = children(p71);
			code94 = claim_element(p71_nodes, "CODE", {});
			var code94_nodes = children(code94);
			t421 = claim_text(code94_nodes, "--grep");
			code94_nodes.forEach(detach);
			t422 = claim_text(p71_nodes, " is a ");
			code95 = claim_element(p71_nodes, "CODE", {});
			var code95_nodes = children(code95);
			t423 = claim_text(code95_nodes, "OR");
			code95_nodes.forEach(detach);
			t424 = claim_text(p71_nodes, " filter, ");
			code96 = claim_element(p71_nodes, "CODE", {});
			var code96_nodes = children(code96);
			t425 = claim_text(code96_nodes, "--all-match");
			code96_nodes.forEach(detach);
			t426 = claim_text(p71_nodes, " make it a ");
			code97 = claim_element(p71_nodes, "CODE", {});
			var code97_nodes = children(code97);
			t427 = claim_text(code97_nodes, "AND");
			code97_nodes.forEach(detach);
			t428 = claim_text(p71_nodes, " filter");
			p71_nodes.forEach(detach);
			section22_nodes.forEach(detach);
			t429 = claim_space(nodes);
			section23 = claim_element(nodes, "SECTION", {});
			var section23_nodes = children(section23);
			h310 = claim_element(section23_nodes, "H3", {});
			var h310_nodes = children(h310);
			a50 = claim_element(h310_nodes, "A", { href: true, id: true });
			var a50_nodes = children(a50);
			t430 = claim_text(a50_nodes, "--min-parents, --max-parents, --merges, --no-merges");
			a50_nodes.forEach(detach);
			h310_nodes.forEach(detach);
			t431 = claim_space(section23_nodes);
			p72 = claim_element(section23_nodes, "P", {});
			var p72_nodes = children(p72);
			t432 = claim_text(p72_nodes, "You can specify commits with the number of parents. A simple merge commit has 2 parent, so ");
			code98 = claim_element(p72_nodes, "CODE", {});
			var code98_nodes = children(code98);
			t433 = claim_text(code98_nodes, "--merge");
			code98_nodes.forEach(detach);
			t434 = claim_text(p72_nodes, " is equivalent to ");
			code99 = claim_element(p72_nodes, "CODE", {});
			var code99_nodes = children(code99);
			t435 = claim_text(code99_nodes, "--min-parents=2");
			code99_nodes.forEach(detach);
			t436 = claim_text(p72_nodes, ".");
			p72_nodes.forEach(detach);
			section23_nodes.forEach(detach);
			t437 = claim_space(nodes);
			section24 = claim_element(nodes, "SECTION", {});
			var section24_nodes = children(section24);
			h311 = claim_element(section24_nodes, "H3", {});
			var h311_nodes = children(h311);
			a51 = claim_element(h311_nodes, "A", { href: true, id: true });
			var a51_nodes = children(a51);
			t438 = claim_text(a51_nodes, "--first-parent");
			a51_nodes.forEach(detach);
			h311_nodes.forEach(detach);
			t439 = claim_space(section24_nodes);
			p73 = claim_element(section24_nodes, "P", {});
			var p73_nodes = children(p73);
			t440 = claim_text(p73_nodes, "You can follow only the first parent commit upon seeing a merge commit. This is especially useful when you have merged of branches in, ");
			code100 = claim_element(p73_nodes, "CODE", {});
			var code100_nodes = children(code100);
			t441 = claim_text(code100_nodes, "--first-parent");
			code100_nodes.forEach(detach);
			t442 = claim_text(p73_nodes, " allow you to filter out only the merge commit and the commit you have made on the current branch.");
			p73_nodes.forEach(detach);
			section24_nodes.forEach(detach);
			t443 = claim_space(nodes);
			section25 = claim_element(nodes, "SECTION", {});
			var section25_nodes = children(section25);
			h27 = claim_element(section25_nodes, "H2", {});
			var h27_nodes = children(h27);
			a52 = claim_element(h27_nodes, "A", { href: true, id: true });
			var a52_nodes = children(a52);
			t444 = claim_text(a52_nodes, "git reflog");
			a52_nodes.forEach(detach);
			h27_nodes.forEach(detach);
			t445 = claim_space(section25_nodes);
			p74 = claim_element(section25_nodes, "P", {});
			var p74_nodes = children(p74);
			t446 = claim_text(p74_nodes, "The reference log shows you all the ");
			code101 = claim_element(p74_nodes, "CODE", {});
			var code101_nodes = children(code101);
			t447 = claim_text(code101_nodes, "HEAD");
			code101_nodes.forEach(detach);
			t448 = claim_text(p74_nodes, " position you have been to. This is especially useful when you have ");
			code102 = claim_element(p74_nodes, "CODE", {});
			var code102_nodes = children(code102);
			t449 = claim_text(code102_nodes, "reset --hard");
			code102_nodes.forEach(detach);
			t450 = claim_text(p74_nodes, " or ");
			code103 = claim_element(p74_nodes, "CODE", {});
			var code103_nodes = children(code103);
			t451 = claim_text(code103_nodes, "rebase");
			code103_nodes.forEach(detach);
			t452 = claim_text(p74_nodes, ", you can still find back the commit reference that you were at previously, so you can recover them.");
			p74_nodes.forEach(detach);
			section25_nodes.forEach(detach);
			t453 = claim_space(nodes);
			section26 = claim_element(nodes, "SECTION", {});
			var section26_nodes = children(section26);
			h28 = claim_element(section26_nodes, "H2", {});
			var h28_nodes = children(h28);
			a53 = claim_element(h28_nodes, "A", { href: true, id: true });
			var a53_nodes = children(a53);
			t454 = claim_text(a53_nodes, "git bisect");
			a53_nodes.forEach(detach);
			h28_nodes.forEach(detach);
			t455 = claim_space(section26_nodes);
			p75 = claim_element(section26_nodes, "P", {});
			var p75_nodes = children(p75);
			t456 = claim_text(p75_nodes, "This is a useful command that I am looking forward to use it.");
			p75_nodes.forEach(detach);
			t457 = claim_space(section26_nodes);
			p76 = claim_element(section26_nodes, "P", {});
			var p76_nodes = children(p76);
			t458 = claim_text(p76_nodes, "Often times when you noticed something has changed / break / less optimised, yet you do not know when this change was introduced into your repository. ");
			code104 = claim_element(p76_nodes, "CODE", {});
			var code104_nodes = children(code104);
			t459 = claim_text(code104_nodes, "git bisect");
			code104_nodes.forEach(detach);
			t460 = claim_text(p76_nodes, " allows you to do binary search on the history, so that you can quickly pin down the commit where the change was introduced.");
			p76_nodes.forEach(detach);
			t461 = claim_space(section26_nodes);
			pre6 = claim_element(section26_nodes, "PRE", { class: true });
			var pre6_nodes = children(pre6);
			pre6_nodes.forEach(detach);
			t462 = claim_space(section26_nodes);
			p77 = claim_element(section26_nodes, "P", {});
			var p77_nodes = children(p77);
			t463 = claim_text(p77_nodes, "Once you've specified at least one ");
			code105 = claim_element(p77_nodes, "CODE", {});
			var code105_nodes = children(code105);
			t464 = claim_text(code105_nodes, "bad");
			code105_nodes.forEach(detach);
			t465 = claim_text(p77_nodes, " and one ");
			code106 = claim_element(p77_nodes, "CODE", {});
			var code106_nodes = children(code106);
			t466 = claim_text(code106_nodes, "good");
			code106_nodes.forEach(detach);
			t467 = claim_text(p77_nodes, " commit, ");
			code107 = claim_element(p77_nodes, "CODE", {});
			var code107_nodes = children(code107);
			t468 = claim_text(code107_nodes, "git bisect");
			code107_nodes.forEach(detach);
			t469 = claim_text(p77_nodes, " will find and checkout to a commit in the middle of that range between ");
			code108 = claim_element(p77_nodes, "CODE", {});
			var code108_nodes = children(code108);
			t470 = claim_text(code108_nodes, "bad");
			code108_nodes.forEach(detach);
			t471 = claim_text(p77_nodes, " and ");
			code109 = claim_element(p77_nodes, "CODE", {});
			var code109_nodes = children(code109);
			t472 = claim_text(code109_nodes, "good");
			code109_nodes.forEach(detach);
			t473 = claim_text(p77_nodes, " and greets you with:");
			p77_nodes.forEach(detach);
			t474 = claim_space(section26_nodes);
			pre7 = claim_element(section26_nodes, "PRE", { class: true });
			var pre7_nodes = children(pre7);
			pre7_nodes.forEach(detach);
			t475 = claim_space(section26_nodes);
			p78 = claim_element(section26_nodes, "P", {});
			var p78_nodes = children(p78);
			t476 = claim_text(p78_nodes, "You can know test / verify / profile your code, and specify whether the current commit is a ");
			code110 = claim_element(p78_nodes, "CODE", {});
			var code110_nodes = children(code110);
			t477 = claim_text(code110_nodes, "good");
			code110_nodes.forEach(detach);
			t478 = claim_text(p78_nodes, " commit or a ");
			code111 = claim_element(p78_nodes, "CODE", {});
			var code111_nodes = children(code111);
			t479 = claim_text(code111_nodes, "bad");
			code111_nodes.forEach(detach);
			t480 = claim_text(p78_nodes, " commit:");
			p78_nodes.forEach(detach);
			t481 = claim_space(section26_nodes);
			pre8 = claim_element(section26_nodes, "PRE", { class: true });
			var pre8_nodes = children(pre8);
			pre8_nodes.forEach(detach);
			t482 = claim_space(section26_nodes);
			p79 = claim_element(section26_nodes, "P", {});
			var p79_nodes = children(p79);
			t483 = claim_text(p79_nodes, "Continue doing it until eventually there's no more commit to inspect. ");
			code112 = claim_element(p79_nodes, "CODE", {});
			var code112_nodes = children(code112);
			t484 = claim_text(code112_nodes, "git bisect");
			code112_nodes.forEach(detach);
			t485 = claim_text(p79_nodes, " will print out the description of the first bad commit.");
			p79_nodes.forEach(detach);
			section26_nodes.forEach(detach);
			t486 = claim_space(nodes);
			section27 = claim_element(nodes, "SECTION", {});
			var section27_nodes = children(section27);
			h29 = claim_element(section27_nodes, "H2", {});
			var h29_nodes = children(h29);
			a54 = claim_element(h29_nodes, "A", { href: true, id: true });
			var a54_nodes = children(a54);
			t487 = claim_text(a54_nodes, "Summary");
			a54_nodes.forEach(detach);
			h29_nodes.forEach(detach);
			t488 = claim_space(section27_nodes);
			p80 = claim_element(section27_nodes, "P", {});
			var p80_nodes = children(p80);
			t489 = claim_text(p80_nodes, "We've gone through the following git commands:");
			p80_nodes.forEach(detach);
			t490 = claim_space(section27_nodes);
			ul7 = claim_element(section27_nodes, "UL", {});
			var ul7_nodes = children(ul7);
			li35 = claim_element(ul7_nodes, "LI", {});
			var li35_nodes = children(li35);
			t491 = claim_text(li35_nodes, "git merge");
			li35_nodes.forEach(detach);
			t492 = claim_space(ul7_nodes);
			li36 = claim_element(ul7_nodes, "LI", {});
			var li36_nodes = children(li36);
			t493 = claim_text(li36_nodes, "git reset");
			li36_nodes.forEach(detach);
			t494 = claim_space(ul7_nodes);
			li37 = claim_element(ul7_nodes, "LI", {});
			var li37_nodes = children(li37);
			t495 = claim_text(li37_nodes, "git cherry-pick");
			li37_nodes.forEach(detach);
			t496 = claim_space(ul7_nodes);
			li38 = claim_element(ul7_nodes, "LI", {});
			var li38_nodes = children(li38);
			t497 = claim_text(li38_nodes, "git revert");
			li38_nodes.forEach(detach);
			t498 = claim_space(ul7_nodes);
			li39 = claim_element(ul7_nodes, "LI", {});
			var li39_nodes = children(li39);
			t499 = claim_text(li39_nodes, "git rebase");
			li39_nodes.forEach(detach);
			t500 = claim_space(ul7_nodes);
			li40 = claim_element(ul7_nodes, "LI", {});
			var li40_nodes = children(li40);
			t501 = claim_text(li40_nodes, "git log");
			li40_nodes.forEach(detach);
			t502 = claim_space(ul7_nodes);
			li41 = claim_element(ul7_nodes, "LI", {});
			var li41_nodes = children(li41);
			t503 = claim_text(li41_nodes, "git reflog");
			li41_nodes.forEach(detach);
			t504 = claim_space(ul7_nodes);
			li42 = claim_element(ul7_nodes, "LI", {});
			var li42_nodes = children(li42);
			t505 = claim_text(li42_nodes, "git bisect");
			li42_nodes.forEach(detach);
			ul7_nodes.forEach(detach);
			t506 = claim_space(section27_nodes);
			p81 = claim_element(section27_nodes, "P", {});
			var p81_nodes = children(p81);
			t507 = claim_text(p81_nodes, "Hopefully we are now ");
			code113 = claim_element(p81_nodes, "CODE", {});
			var code113_nodes = children(code113);
			t508 = claim_text(code113_nodes, "git gudder");
			code113_nodes.forEach(detach);
			t509 = claim_text(p81_nodes, " than before!");
			p81_nodes.forEach(detach);
			t510 = claim_space(section27_nodes);
			hr = claim_element(section27_nodes, "HR", {});
			t511 = claim_space(section27_nodes);
			p82 = claim_element(section27_nodes, "P", {});
			var p82_nodes = children(p82);
			t512 = claim_text(p82_nodes, "Related topic: ");
			a55 = claim_element(p82_nodes, "A", { href: true });
			var a55_nodes = children(a55);
			t513 = claim_text(a55_nodes, "Git commits went missing after a rebase");
			a55_nodes.forEach(detach);
			p82_nodes.forEach(detach);
			section27_nodes.forEach(detach);
			this.h();
		},
		h() {
			attr(a0, "href", "#disclaimer");
			attr(a1, "href", "#git-merge");
			attr(a2, "href", "#fast-forward-merge");
			attr(a3, "href", "#non-fast-forward-merge");
			attr(a4, "href", "#git-pull");
			attr(a5, "href", "#git-reset");
			attr(a6, "href", "#git-cherry-pick");
			attr(a7, "href", "#git-revert");
			attr(a8, "href", "#git-rebase");
			attr(a9, "href", "#git-rebase-interactive");
			attr(a10, "href", "#pick");
			attr(a11, "href", "#drop");
			attr(a12, "href", "#squash-fixup");
			attr(a13, "href", "#break");
			attr(a14, "href", "#edit");
			attr(a15, "href", "#git-pull-rebase");
			attr(a16, "href", "#git-rebase-a-shared-branch");
			attr(a17, "href", "#git-log");
			attr(a18, "href", "#since-after-until-before");
			attr(a19, "href", "#grep");
			attr(a20, "href", "#invert-grep");
			attr(a21, "href", "#all-match");
			attr(a22, "href", "#min-parents-max-parents-merges-no-merges");
			attr(a23, "href", "#first-parent");
			attr(a24, "href", "#git-reflog");
			attr(a25, "href", "#git-bisect");
			attr(a26, "href", "#summary");
			attr(ul4, "class", "sitemap");
			attr(ul4, "id", "sitemap");
			attr(ul4, "role", "navigation");
			attr(ul4, "aria-label", "Table of Contents");
			attr(a27, "href", "#disclaimer");
			attr(a27, "id", "disclaimer");
			attr(a28, "href", "https://git-scm.com");
			attr(a28, "rel", "nofollow");
			attr(a29, "href", "#git-merge");
			attr(a29, "id", "git-merge");
			attr(a30, "href", "#fast-forward-merge");
			attr(a30, "id", "fast-forward-merge");
			if (img0.src !== (img0_src_value = __build_img__0)) attr(img0, "src", img0_src_value);
			attr(img0, "alt", "git-merge-ff");
			attr(div0, "class", "caption svelte-koydfe");
			attr(a31, "href", "#non-fast-forward-merge");
			attr(a31, "id", "non-fast-forward-merge");
			if (img1.src !== (img1_src_value = __build_img__1)) attr(img1, "src", img1_src_value);
			attr(img1, "alt", "git-merge-non-ff");
			attr(div1, "class", "caption svelte-koydfe");
			attr(a32, "href", "#git-pull");
			attr(a32, "id", "git-pull");
			if (img2.src !== (img2_src_value = __build_img__2)) attr(img2, "src", img2_src_value);
			attr(img2, "alt", "git-pull");
			attr(div2, "class", "caption svelte-koydfe");
			attr(a33, "href", "#git-reset");
			attr(a33, "id", "git-reset");
			if (img3.src !== (img3_src_value = __build_img__3)) attr(img3, "src", img3_src_value);
			attr(img3, "alt", "git-reset");
			attr(div3, "class", "caption svelte-koydfe");
			attr(a34, "href", "#git-cherry-pick");
			attr(a34, "id", "git-cherry-pick");
			if (img4.src !== (img4_src_value = __build_img__4)) attr(img4, "src", img4_src_value);
			attr(img4, "alt", "git-cherry-pick");
			attr(div4, "class", "caption svelte-koydfe");
			attr(a35, "href", "#git-revert");
			attr(a35, "id", "git-revert");
			if (img5.src !== (img5_src_value = __build_img__5)) attr(img5, "src", img5_src_value);
			attr(img5, "alt", "git-revert");
			attr(div5, "class", "caption svelte-koydfe");
			if (img6.src !== (img6_src_value = __build_img__6)) attr(img6, "src", img6_src_value);
			attr(img6, "alt", "git-revert-2");
			attr(div6, "class", "caption svelte-koydfe");
			if (img7.src !== (img7_src_value = __build_img__7)) attr(img7, "src", img7_src_value);
			attr(img7, "alt", "git-revert-3");
			attr(div7, "class", "caption svelte-koydfe");
			if (img8.src !== (img8_src_value = __build_img__8)) attr(img8, "src", img8_src_value);
			attr(img8, "alt", "git-revert-4");
			attr(div8, "class", "caption svelte-koydfe");
			attr(a36, "href", "#git-rebase");
			attr(a36, "id", "git-rebase");
			if (img9.src !== (img9_src_value = __build_img__9)) attr(img9, "src", img9_src_value);
			attr(img9, "alt", "git-rebase");
			attr(div9, "class", "caption svelte-koydfe");
			if (img10.src !== (img10_src_value = __build_img__10)) attr(img10, "src", img10_src_value);
			attr(img10, "alt", "git-rebase-2");
			attr(div10, "class", "caption svelte-koydfe");
			attr(source0, "type", "image/webp");
			attr(source0, "srcset", __build_img_webp__11);
			attr(source1, "type", "image/jpeg");
			attr(source1, "srcset", __build_img__11);
			attr(img11, "alt", "git-rebase");
			if (img11.src !== (img11_src_value = __build_img__11)) attr(img11, "src", img11_src_value);
			attr(div11, "class", "caption svelte-koydfe");
			attr(a37, "href", "#git-rebase-interactive");
			attr(a37, "id", "git-rebase-interactive");
			attr(source2, "type", "image/webp");
			attr(source2, "srcset", __build_img_webp__13);
			attr(source3, "type", "image/jpeg");
			attr(source3, "srcset", __build_img__13);
			attr(img12, "alt", "git-rebase-i-pick");
			if (img12.src !== (img12_src_value = __build_img__13)) attr(img12, "src", img12_src_value);
			attr(div12, "class", "caption svelte-koydfe");
			attr(pre0, "class", "language-null");
			attr(a38, "href", "#pick");
			attr(a38, "id", "pick");
			attr(source4, "type", "image/webp");
			attr(source4, "srcset", __build_img_webp__13);
			attr(source5, "type", "image/jpeg");
			attr(source5, "srcset", __build_img__13);
			attr(img13, "alt", "git-rebase-i-pick");
			if (img13.src !== (img13_src_value = __build_img__13)) attr(img13, "src", img13_src_value);
			attr(pre1, "class", "language-null");
			attr(a39, "href", "#drop");
			attr(a39, "id", "drop");
			attr(source6, "type", "image/webp");
			attr(source6, "srcset", __build_img_webp__14);
			attr(source7, "type", "image/jpeg");
			attr(source7, "srcset", __build_img__14);
			attr(img14, "alt", "git-rebase-i-drop");
			if (img14.src !== (img14_src_value = __build_img__14)) attr(img14, "src", img14_src_value);
			attr(pre2, "class", "language-null");
			attr(a40, "href", "#squash-fixup");
			attr(a40, "id", "squash-fixup");
			attr(source8, "type", "image/webp");
			attr(source8, "srcset", __build_img_webp__15);
			attr(source9, "type", "image/jpeg");
			attr(source9, "srcset", __build_img__15);
			attr(img15, "alt", "git-rebase-i-squash");
			if (img15.src !== (img15_src_value = __build_img__15)) attr(img15, "src", img15_src_value);
			attr(pre3, "class", "language-null");
			attr(a41, "href", "#break");
			attr(a41, "id", "break");
			attr(source10, "type", "image/webp");
			attr(source10, "srcset", __build_img_webp__16);
			attr(source11, "type", "image/jpeg");
			attr(source11, "srcset", __build_img__16);
			attr(img16, "alt", "git-rebase-i-break");
			if (img16.src !== (img16_src_value = __build_img__16)) attr(img16, "src", img16_src_value);
			attr(pre4, "class", "language-null");
			attr(a42, "href", "#edit");
			attr(a42, "id", "edit");
			attr(source12, "type", "image/webp");
			attr(source12, "srcset", __build_img_webp__17);
			attr(source13, "type", "image/jpeg");
			attr(source13, "srcset", __build_img__17);
			attr(img17, "alt", "git-rebase-i-edit");
			if (img17.src !== (img17_src_value = __build_img__17)) attr(img17, "src", img17_src_value);
			attr(pre5, "class", "language-null");
			attr(a43, "href", "#git-pull-rebase");
			attr(a43, "id", "git-pull-rebase");
			if (img18.src !== (img18_src_value = __build_img__18)) attr(img18, "src", img18_src_value);
			attr(img18, "alt", "git-pull-rebase");
			attr(div13, "class", "caption svelte-koydfe");
			attr(a44, "href", "#git-rebase-a-shared-branch");
			attr(a44, "id", "git-rebase-a-shared-branch");
			attr(source14, "type", "image/webp");
			attr(source14, "srcset", __build_img_webp__19);
			attr(source15, "type", "image/jpeg");
			attr(source15, "srcset", __build_img__19);
			attr(img19, "alt", "git-rebase-w");
			if (img19.src !== (img19_src_value = __build_img__19)) attr(img19, "src", img19_src_value);
			attr(source16, "type", "image/webp");
			attr(source16, "srcset", __build_img_webp__20);
			attr(source17, "type", "image/jpeg");
			attr(source17, "srcset", __build_img__20);
			attr(img20, "alt", "git-rebase-w-2");
			if (img20.src !== (img20_src_value = __build_img__20)) attr(img20, "src", img20_src_value);
			attr(source18, "type", "image/webp");
			attr(source18, "srcset", __build_img_webp__21);
			attr(source19, "type", "image/jpeg");
			attr(source19, "srcset", __build_img__21);
			attr(img21, "alt", "git-rebase-w-3");
			if (img21.src !== (img21_src_value = __build_img__21)) attr(img21, "src", img21_src_value);
			attr(source20, "type", "image/webp");
			attr(source20, "srcset", __build_img_webp__22);
			attr(source21, "type", "image/jpeg");
			attr(source21, "srcset", __build_img__22);
			attr(img22, "alt", "git-rebase-w-4");
			if (img22.src !== (img22_src_value = __build_img__22)) attr(img22, "src", img22_src_value);
			attr(source22, "type", "image/webp");
			attr(source22, "srcset", __build_img_webp__23);
			attr(source23, "type", "image/jpeg");
			attr(source23, "srcset", __build_img__23);
			attr(img23, "alt", "git-rebase-w-5");
			if (img23.src !== (img23_src_value = __build_img__23)) attr(img23, "src", img23_src_value);
			attr(a45, "href", "#git-log");
			attr(a45, "id", "git-log");
			attr(a46, "href", "#since-after-until-before");
			attr(a46, "id", "since-after-until-before");
			attr(a47, "href", "#grep");
			attr(a47, "id", "grep");
			attr(a48, "href", "#invert-grep");
			attr(a48, "id", "invert-grep");
			attr(a49, "href", "#all-match");
			attr(a49, "id", "all-match");
			attr(a50, "href", "#min-parents-max-parents-merges-no-merges");
			attr(a50, "id", "min-parents-max-parents-merges-no-merges");
			attr(a51, "href", "#first-parent");
			attr(a51, "id", "first-parent");
			attr(a52, "href", "#git-reflog");
			attr(a52, "id", "git-reflog");
			attr(a53, "href", "#git-bisect");
			attr(a53, "id", "git-bisect");
			attr(pre6, "class", "language-sh");
			attr(pre7, "class", "language-null");
			attr(pre8, "class", "language-sh");
			attr(a54, "href", "#summary");
			attr(a54, "id", "summary");
			attr(a55, "href", "/commit-went-missing-after-rebase/");
		},
		m(target, anchor) {
			insert(target, section0, anchor);
			append(section0, ul4);
			append(ul4, li0);
			append(li0, a0);
			append(a0, t0);
			append(ul4, li1);
			append(li1, a1);
			append(a1, t1);
			append(ul4, ul0);
			append(ul0, li2);
			append(li2, a2);
			append(a2, t2);
			append(ul0, li3);
			append(li3, a3);
			append(a3, t3);
			append(ul0, li4);
			append(li4, a4);
			append(a4, t4);
			append(ul4, li5);
			append(li5, a5);
			append(a5, t5);
			append(ul4, li6);
			append(li6, a6);
			append(a6, t6);
			append(ul4, li7);
			append(li7, a7);
			append(a7, t7);
			append(ul4, li8);
			append(li8, a8);
			append(a8, t8);
			append(ul4, ul2);
			append(ul2, li9);
			append(li9, a9);
			append(a9, t9);
			append(ul2, ul1);
			append(ul1, li10);
			append(li10, a10);
			append(a10, t10);
			append(ul1, li11);
			append(li11, a11);
			append(a11, t11);
			append(ul1, li12);
			append(li12, a12);
			append(a12, t12);
			append(ul1, li13);
			append(li13, a13);
			append(a13, t13);
			append(ul1, li14);
			append(li14, a14);
			append(a14, t14);
			append(ul2, li15);
			append(li15, a15);
			append(a15, t15);
			append(ul2, li16);
			append(li16, a16);
			append(a16, t16);
			append(ul4, li17);
			append(li17, a17);
			append(a17, t17);
			append(ul4, ul3);
			append(ul3, li18);
			append(li18, a18);
			append(a18, t18);
			append(ul3, li19);
			append(li19, a19);
			append(a19, t19);
			append(ul3, li20);
			append(li20, a20);
			append(a20, t20);
			append(ul3, li21);
			append(li21, a21);
			append(a21, t21);
			append(ul3, li22);
			append(li22, a22);
			append(a22, t22);
			append(ul3, li23);
			append(li23, a23);
			append(a23, t23);
			append(ul4, li24);
			append(li24, a24);
			append(a24, t24);
			append(ul4, li25);
			append(li25, a25);
			append(a25, t25);
			append(ul4, li26);
			append(li26, a26);
			append(a26, t26);
			insert(target, t27, anchor);
			insert(target, p0, anchor);
			append(p0, t28);
			insert(target, t29, anchor);
			insert(target, p1, anchor);
			append(p1, t30);
			append(p1, strong0);
			append(strong0, t31);
			append(p1, t32);
			append(p1, em);
			append(em, t33);
			append(p1, t34);
			insert(target, t35, anchor);
			insert(target, blockquote, anchor);
			append(blockquote, p2);
			append(p2, t36);
			insert(target, t37, anchor);
			insert(target, section1, anchor);
			append(section1, h20);
			append(h20, a27);
			append(a27, t38);
			append(section1, t39);
			append(section1, p3);
			append(p3, t40);
			append(p3, a28);
			append(a28, t41);
			append(p3, t42);
			insert(target, t43, anchor);
			insert(target, section2, anchor);
			append(section2, h21);
			append(h21, a29);
			append(a29, t44);
			append(section2, t45);
			append(section2, p4);
			append(p4, t46);
			append(p4, code0);
			append(code0, t47);
			append(p4, t48);
			append(p4, strong1);
			append(strong1, t49);
			append(p4, t50);
			append(p4, strong2);
			append(strong2, t51);
			append(p4, t52);
			insert(target, t53, anchor);
			insert(target, section3, anchor);
			append(section3, h30);
			append(h30, a30);
			append(a30, t54);
			append(section3, t55);
			append(section3, p5);
			append(p5, t56);
			append(p5, code1);
			append(code1, t57);
			append(p5, t58);
			append(p5, code2);
			append(code2, t59);
			append(p5, t60);
			append(section3, t61);
			append(section3, p6);
			append(p6, img0);
			append(section3, t62);
			append(section3, div0);
			append(div0, t63);
			insert(target, t64, anchor);
			insert(target, section4, anchor);
			append(section4, h31);
			append(h31, a31);
			append(a31, t65);
			append(section4, t66);
			append(section4, p7);
			append(p7, t67);
			append(p7, code3);
			append(code3, t68);
			append(p7, t69);
			append(p7, code4);
			append(code4, t70);
			append(p7, t71);
			append(section4, t72);
			append(section4, p8);
			append(p8, img1);
			append(section4, t73);
			append(section4, div1);
			append(div1, t74);
			append(section4, t75);
			append(section4, p9);
			append(p9, t76);
			insert(target, t77, anchor);
			insert(target, section5, anchor);
			append(section5, h32);
			append(h32, a32);
			append(a32, t78);
			append(section5, t79);
			append(section5, p10);
			append(p10, t80);
			append(p10, code5);
			append(code5, t81);
			append(p10, t82);
			append(p10, code6);
			append(code6, t83);
			append(p10, t84);
			append(p10, code7);
			append(code7, t85);
			append(p10, t86);
			append(section5, t87);
			append(section5, p11);
			append(p11, img2);
			append(section5, t88);
			append(section5, div2);
			append(div2, t89);
			insert(target, t90, anchor);
			insert(target, section6, anchor);
			append(section6, h22);
			append(h22, a33);
			append(a33, t91);
			append(section6, t92);
			append(section6, p12);
			append(p12, code8);
			append(code8, t93);
			append(p12, t94);
			append(section6, t95);
			append(section6, p13);
			append(p13, code9);
			append(code9, t96);
			append(p13, t97);
			append(p13, code10);
			append(code10, t98);
			append(p13, t99);
			append(p13, code11);
			append(code11, t100);
			append(p13, t101);
			append(section6, t102);
			append(section6, p14);
			append(p14, img3);
			append(section6, t103);
			append(section6, div3);
			append(div3, t104);
			insert(target, t105, anchor);
			insert(target, section7, anchor);
			append(section7, h23);
			append(h23, a34);
			append(a34, t106);
			append(section7, t107);
			append(section7, p15);
			append(p15, t108);
			append(section7, t109);
			append(section7, p16);
			append(p16, code12);
			append(code12, t110);
			append(p16, t111);
			append(p16, code13);
			append(code13, t112);
			append(p16, t113);
			append(section7, t114);
			append(section7, p17);
			append(p17, img4);
			append(section7, t115);
			append(section7, div4);
			append(div4, t116);
			insert(target, t117, anchor);
			insert(target, section8, anchor);
			append(section8, h24);
			append(h24, a35);
			append(a35, t118);
			append(section8, t119);
			append(section8, p18);
			append(p18, code14);
			append(code14, t120);
			append(p18, t121);
			append(section8, t122);
			append(section8, p19);
			append(p19, t123);
			append(p19, code15);
			append(code15, t124);
			append(p19, t125);
			append(p19, code16);
			append(code16, t126);
			append(p19, t127);
			append(p19, code17);
			append(code17, t128);
			append(p19, t129);
			append(p19, code18);
			append(code18, t130);
			append(p19, t131);
			append(section8, t132);
			append(section8, p20);
			append(p20, img5);
			append(section8, t133);
			append(section8, div5);
			append(div5, t134);
			append(section8, t135);
			append(section8, p21);
			append(p21, t136);
			append(p21, code19);
			append(code19, t137);
			append(p21, t138);
			append(section8, t139);
			append(section8, p22);
			append(p22, img6);
			append(section8, t140);
			append(section8, div6);
			append(div6, t141);
			append(section8, t142);
			append(section8, p23);
			append(p23, t143);
			append(p23, code20);
			append(code20, t144);
			append(p23, t145);
			append(p23, code21);
			append(code21, t146);
			append(p23, t147);
			append(p23, code22);
			append(code22, t148);
			append(p23, t149);
			append(section8, t150);
			append(section8, p24);
			append(p24, code23);
			append(code23, t151);
			append(p24, t152);
			append(section8, t153);
			append(section8, p25);
			append(p25, img7);
			append(section8, t154);
			append(section8, div7);
			append(div7, t155);
			append(section8, t156);
			append(section8, p26);
			append(p26, t157);
			append(p26, code24);
			append(code24, t158);
			append(p26, t159);
			append(p26, code25);
			append(code25, t160);
			append(p26, t161);
			append(p26, code26);
			append(code26, t162);
			append(p26, t163);
			append(p26, code27);
			append(code27, t164);
			append(p26, t165);
			append(p26, code28);
			append(code28, t166);
			append(p26, t167);
			append(section8, t168);
			append(section8, p27);
			append(p27, img8);
			append(section8, t169);
			append(section8, div8);
			append(div8, t170);
			insert(target, t171, anchor);
			insert(target, section9, anchor);
			append(section9, h25);
			append(h25, a36);
			append(a36, t172);
			append(section9, t173);
			append(section9, p28);
			append(p28, code29);
			append(code29, t174);
			append(p28, t175);
			append(section9, t176);
			append(section9, p29);
			append(p29, t177);
			append(p29, code30);
			append(code30, t178);
			append(p29, t179);
			append(p29, code31);
			append(code31, t180);
			append(p29, t181);
			append(p29, code32);
			append(code32, t182);
			append(p29, t183);
			append(p29, code33);
			append(code33, t184);
			append(p29, t185);
			append(p29, code34);
			append(code34, t186);
			append(p29, t187);
			append(p29, code35);
			append(code35, t188);
			append(p29, t189);
			append(section9, t190);
			append(section9, p30);
			append(p30, code36);
			append(code36, t191);
			append(p30, t192);
			append(p30, code37);
			append(code37, t193);
			append(p30, t194);
			append(section9, t195);
			append(section9, p31);
			append(p31, img9);
			append(section9, t196);
			append(section9, div9);
			append(div9, t197);
			append(section9, t198);
			append(section9, p32);
			append(p32, code38);
			append(code38, t199);
			append(p32, t200);
			append(section9, t201);
			append(section9, p33);
			append(p33, code39);
			append(code39, t202);
			append(p33, t203);
			append(p33, code40);
			append(code40, t204);
			append(p33, t205);
			append(section9, t206);
			append(section9, p34);
			append(p34, img10);
			append(section9, t207);
			append(section9, div10);
			append(div10, t208);
			append(section9, t209);
			append(section9, p35);
			append(p35, t210);
			append(section9, t211);
			append(section9, ul5);
			append(ul5, li27);
			append(li27, code41);
			append(code41, t212);
			append(ul5, t213);
			append(ul5, li28);
			append(li28, code42);
			append(code42, t214);
			append(ul5, t215);
			append(ul5, li29);
			append(li29, code43);
			append(code43, t216);
			append(section9, t217);
			append(section9, p36);
			append(p36, picture0);
			append(picture0, source0);
			append(picture0, source1);
			append(picture0, img11);
			append(section9, t218);
			append(section9, div11);
			append(div11, t219);
			append(section9, t220);
			append(section9, p37);
			append(p37, t221);
			append(section9, t222);
			append(section9, ul6);
			append(ul6, li30);
			append(li30, code44);
			append(code44, t223);
			append(li30, t224);
			append(li30, code45);
			append(code45, t225);
			append(li30, t226);
			append(li30, code46);
			append(code46, t227);
			append(li30, t228);
			append(li30, code47);
			append(code47, t229);
			append(li30, t230);
			append(ul6, t231);
			append(ul6, li31);
			append(li31, t232);
			append(li31, code48);
			append(code48, t233);
			append(li31, t234);
			append(li31, code49);
			append(code49, t235);
			append(li31, t236);
			append(li31, code50);
			append(code50, t237);
			append(li31, t238);
			append(li31, code51);
			append(code51, t239);
			append(li31, t240);
			append(li31, code52);
			append(code52, t241);
			append(li31, t242);
			append(ul6, t243);
			append(ul6, li32);
			append(li32, t244);
			append(li32, code53);
			append(code53, t245);
			append(li32, t246);
			append(li32, code54);
			append(code54, t247);
			append(li32, t248);
			append(ul6, t249);
			append(ul6, li33);
			append(li33, t250);
			append(li33, code55);
			append(code55, t251);
			append(li33, t252);
			append(li33, code56);
			append(code56, t253);
			append(li33, t254);
			append(li33, code57);
			append(code57, t255);
			append(li33, t256);
			append(li33, code58);
			append(code58, t257);
			append(li33, t258);
			append(ul6, t259);
			append(ul6, li34);
			append(li34, t260);
			append(li34, code59);
			append(code59, t261);
			append(li34, t262);
			append(li34, code60);
			append(code60, t263);
			append(li34, t264);
			append(li34, code61);
			append(code61, t265);
			append(li34, t266);
			insert(target, t267, anchor);
			insert(target, section10, anchor);
			append(section10, h33);
			append(h33, a37);
			append(a37, t268);
			append(section10, t269);
			append(section10, p38);
			append(p38, code62);
			append(code62, t270);
			append(p38, t271);
			append(section10, t272);
			append(section10, p39);
			append(p39, picture1);
			append(picture1, source2);
			append(picture1, source3);
			append(picture1, img12);
			append(section10, t273);
			append(section10, div12);
			append(div12, t274);
			append(section10, t275);
			append(section10, p40);
			append(p40, t276);
			append(p40, code63);
			append(code63, t277);
			append(p40, t278);
			append(section10, t279);
			append(section10, pre0);
			pre0.innerHTML = raw0_value;
			insert(target, t280, anchor);
			insert(target, section11, anchor);
			append(section11, h40);
			append(h40, a38);
			append(a38, t281);
			append(section11, t282);
			append(section11, p41);
			append(p41, t283);
			append(section11, t284);
			append(section11, p42);
			append(p42, picture2);
			append(picture2, source4);
			append(picture2, source5);
			append(picture2, img13);
			append(section11, t285);
			append(section11, pre1);
			pre1.innerHTML = raw1_value;
			insert(target, t286, anchor);
			insert(target, section12, anchor);
			append(section12, h41);
			append(h41, a39);
			append(a39, t287);
			append(section12, t288);
			append(section12, p43);
			append(p43, t289);
			append(section12, t290);
			append(section12, p44);
			append(p44, picture3);
			append(picture3, source6);
			append(picture3, source7);
			append(picture3, img14);
			append(section12, t291);
			append(section12, pre2);
			pre2.innerHTML = raw2_value;
			insert(target, t292, anchor);
			insert(target, section13, anchor);
			append(section13, h42);
			append(h42, a40);
			append(a40, t293);
			append(section13, t294);
			append(section13, p45);
			append(p45, t295);
			append(p45, code64);
			append(code64, t296);
			append(p45, t297);
			append(p45, code65);
			append(code65, t298);
			append(p45, t299);
			append(p45, code66);
			append(code66, t300);
			append(p45, t301);
			append(section13, t302);
			append(section13, p46);
			append(p46, picture4);
			append(picture4, source8);
			append(picture4, source9);
			append(picture4, img15);
			append(section13, t303);
			append(section13, pre3);
			pre3.innerHTML = raw3_value;
			insert(target, t304, anchor);
			insert(target, section14, anchor);
			append(section14, h43);
			append(h43, a41);
			append(a41, t305);
			append(section14, t306);
			append(section14, p47);
			append(p47, t307);
			append(p47, code67);
			append(code67, t308);
			append(p47, t309);
			append(section14, t310);
			append(section14, p48);
			append(p48, picture5);
			append(picture5, source10);
			append(picture5, source11);
			append(picture5, img16);
			append(section14, t311);
			append(section14, pre4);
			pre4.innerHTML = raw4_value;
			insert(target, t312, anchor);
			insert(target, section15, anchor);
			append(section15, h44);
			append(h44, a42);
			append(a42, t313);
			append(section15, t314);
			append(section15, p49);
			append(p49, t315);
			append(section15, t316);
			append(section15, p50);
			append(p50, picture6);
			append(picture6, source12);
			append(picture6, source13);
			append(picture6, img17);
			append(section15, t317);
			append(section15, pre5);
			pre5.innerHTML = raw5_value;
			insert(target, t318, anchor);
			insert(target, section16, anchor);
			append(section16, h34);
			append(h34, a43);
			append(a43, t319);
			append(section16, t320);
			append(section16, p51);
			append(p51, t321);
			append(p51, code68);
			append(code68, t322);
			append(p51, t323);
			append(p51, code69);
			append(code69, t324);
			append(p51, t325);
			append(section16, t326);
			append(section16, p52);
			append(p52, img18);
			append(section16, t327);
			append(section16, div13);
			append(div13, t328);
			insert(target, t329, anchor);
			insert(target, section17, anchor);
			append(section17, h35);
			append(h35, a44);
			append(a44, t330);
			append(section17, t331);
			append(section17, p53);
			append(p53, t332);
			append(p53, code70);
			append(code70, t333);
			append(p53, t334);
			append(p53, code71);
			append(code71, t335);
			append(p53, t336);
			append(p53, code72);
			append(code72, t337);
			append(p53, t338);
			append(section17, t339);
			append(section17, p54);
			append(p54, picture7);
			append(picture7, source14);
			append(picture7, source15);
			append(picture7, img19);
			append(section17, t340);
			append(section17, p55);
			append(p55, code73);
			append(code73, t341);
			append(p55, t342);
			append(p55, code74);
			append(code74, t343);
			append(p55, t344);
			append(section17, t345);
			append(section17, p56);
			append(p56, picture8);
			append(picture8, source16);
			append(picture8, source17);
			append(picture8, img20);
			append(section17, t346);
			append(section17, p57);
			append(p57, t347);
			append(p57, code75);
			append(code75, t348);
			append(p57, t349);
			append(p57, code76);
			append(code76, t350);
			append(p57, t351);
			append(section17, t352);
			append(section17, p58);
			append(p58, picture9);
			append(picture9, source18);
			append(picture9, source19);
			append(picture9, img21);
			append(section17, t353);
			append(section17, p59);
			append(p59, t354);
			append(p59, code77);
			append(code77, t355);
			append(p59, t356);
			append(p59, strong3);
			append(strong3, t357);
			append(p59, t358);
			append(p59, code78);
			append(code78, t359);
			append(p59, t360);
			append(section17, t361);
			append(section17, p60);
			append(p60, t362);
			append(p60, code79);
			append(code79, t363);
			append(p60, t364);
			append(p60, code80);
			append(code80, t365);
			append(p60, t366);
			append(p60, code81);
			append(code81, t367);
			append(p60, t368);
			append(section17, t369);
			append(section17, p61);
			append(p61, picture10);
			append(picture10, source20);
			append(picture10, source21);
			append(picture10, img22);
			append(section17, t370);
			append(section17, p62);
			append(p62, t371);
			append(p62, code82);
			append(code82, t372);
			append(p62, t373);
			append(p62, code83);
			append(code83, t374);
			append(p62, t375);
			append(section17, t376);
			append(section17, p63);
			append(p63, t377);
			append(p63, code84);
			append(code84, t378);
			append(p63, t379);
			append(p63, code85);
			append(code85, t380);
			append(p63, t381);
			append(p63, code86);
			append(code86, t382);
			append(p63, t383);
			append(section17, t384);
			append(section17, p64);
			append(p64, picture11);
			append(picture11, source22);
			append(picture11, source23);
			append(picture11, img23);
			append(section17, t385);
			append(section17, p65);
			append(p65, t386);
			append(p65, code87);
			append(code87, t387);
			append(p65, t388);
			append(p65, code88);
			append(code88, t389);
			append(p65, t390);
			append(p65, code89);
			append(code89, t391);
			append(p65, t392);
			append(p65, code90);
			append(code90, t393);
			append(p65, t394);
			append(section17, t395);
			append(section17, p66);
			append(p66, t396);
			append(p66, code91);
			append(code91, t397);
			append(p66, t398);
			append(p66, code92);
			append(code92, t399);
			append(p66, t400);
			insert(target, t401, anchor);
			insert(target, section18, anchor);
			append(section18, h26);
			append(h26, a45);
			append(a45, t402);
			append(section18, t403);
			append(section18, p67);
			append(p67, t404);
			insert(target, t405, anchor);
			insert(target, section19, anchor);
			append(section19, h36);
			append(h36, a46);
			append(a46, t406);
			append(section19, t407);
			append(section19, p68);
			append(p68, t408);
			insert(target, t409, anchor);
			insert(target, section20, anchor);
			append(section20, h37);
			append(h37, a47);
			append(a47, t410);
			append(section20, t411);
			append(section20, p69);
			append(p69, t412);
			insert(target, t413, anchor);
			insert(target, section21, anchor);
			append(section21, h38);
			append(h38, a48);
			append(a48, t414);
			append(section21, t415);
			append(section21, p70);
			append(p70, t416);
			append(p70, code93);
			append(code93, t417);
			insert(target, t418, anchor);
			insert(target, section22, anchor);
			append(section22, h39);
			append(h39, a49);
			append(a49, t419);
			append(section22, t420);
			append(section22, p71);
			append(p71, code94);
			append(code94, t421);
			append(p71, t422);
			append(p71, code95);
			append(code95, t423);
			append(p71, t424);
			append(p71, code96);
			append(code96, t425);
			append(p71, t426);
			append(p71, code97);
			append(code97, t427);
			append(p71, t428);
			insert(target, t429, anchor);
			insert(target, section23, anchor);
			append(section23, h310);
			append(h310, a50);
			append(a50, t430);
			append(section23, t431);
			append(section23, p72);
			append(p72, t432);
			append(p72, code98);
			append(code98, t433);
			append(p72, t434);
			append(p72, code99);
			append(code99, t435);
			append(p72, t436);
			insert(target, t437, anchor);
			insert(target, section24, anchor);
			append(section24, h311);
			append(h311, a51);
			append(a51, t438);
			append(section24, t439);
			append(section24, p73);
			append(p73, t440);
			append(p73, code100);
			append(code100, t441);
			append(p73, t442);
			insert(target, t443, anchor);
			insert(target, section25, anchor);
			append(section25, h27);
			append(h27, a52);
			append(a52, t444);
			append(section25, t445);
			append(section25, p74);
			append(p74, t446);
			append(p74, code101);
			append(code101, t447);
			append(p74, t448);
			append(p74, code102);
			append(code102, t449);
			append(p74, t450);
			append(p74, code103);
			append(code103, t451);
			append(p74, t452);
			insert(target, t453, anchor);
			insert(target, section26, anchor);
			append(section26, h28);
			append(h28, a53);
			append(a53, t454);
			append(section26, t455);
			append(section26, p75);
			append(p75, t456);
			append(section26, t457);
			append(section26, p76);
			append(p76, t458);
			append(p76, code104);
			append(code104, t459);
			append(p76, t460);
			append(section26, t461);
			append(section26, pre6);
			pre6.innerHTML = raw6_value;
			append(section26, t462);
			append(section26, p77);
			append(p77, t463);
			append(p77, code105);
			append(code105, t464);
			append(p77, t465);
			append(p77, code106);
			append(code106, t466);
			append(p77, t467);
			append(p77, code107);
			append(code107, t468);
			append(p77, t469);
			append(p77, code108);
			append(code108, t470);
			append(p77, t471);
			append(p77, code109);
			append(code109, t472);
			append(p77, t473);
			append(section26, t474);
			append(section26, pre7);
			pre7.innerHTML = raw7_value;
			append(section26, t475);
			append(section26, p78);
			append(p78, t476);
			append(p78, code110);
			append(code110, t477);
			append(p78, t478);
			append(p78, code111);
			append(code111, t479);
			append(p78, t480);
			append(section26, t481);
			append(section26, pre8);
			pre8.innerHTML = raw8_value;
			append(section26, t482);
			append(section26, p79);
			append(p79, t483);
			append(p79, code112);
			append(code112, t484);
			append(p79, t485);
			insert(target, t486, anchor);
			insert(target, section27, anchor);
			append(section27, h29);
			append(h29, a54);
			append(a54, t487);
			append(section27, t488);
			append(section27, p80);
			append(p80, t489);
			append(section27, t490);
			append(section27, ul7);
			append(ul7, li35);
			append(li35, t491);
			append(ul7, t492);
			append(ul7, li36);
			append(li36, t493);
			append(ul7, t494);
			append(ul7, li37);
			append(li37, t495);
			append(ul7, t496);
			append(ul7, li38);
			append(li38, t497);
			append(ul7, t498);
			append(ul7, li39);
			append(li39, t499);
			append(ul7, t500);
			append(ul7, li40);
			append(li40, t501);
			append(ul7, t502);
			append(ul7, li41);
			append(li41, t503);
			append(ul7, t504);
			append(ul7, li42);
			append(li42, t505);
			append(section27, t506);
			append(section27, p81);
			append(p81, t507);
			append(p81, code113);
			append(code113, t508);
			append(p81, t509);
			append(section27, t510);
			append(section27, hr);
			append(section27, t511);
			append(section27, p82);
			append(p82, t512);
			append(p82, a55);
			append(a55, t513);
		},
		p: noop,
		d(detaching) {
			if (detaching) detach(section0);
			if (detaching) detach(t27);
			if (detaching) detach(p0);
			if (detaching) detach(t29);
			if (detaching) detach(p1);
			if (detaching) detach(t35);
			if (detaching) detach(blockquote);
			if (detaching) detach(t37);
			if (detaching) detach(section1);
			if (detaching) detach(t43);
			if (detaching) detach(section2);
			if (detaching) detach(t53);
			if (detaching) detach(section3);
			if (detaching) detach(t64);
			if (detaching) detach(section4);
			if (detaching) detach(t77);
			if (detaching) detach(section5);
			if (detaching) detach(t90);
			if (detaching) detach(section6);
			if (detaching) detach(t105);
			if (detaching) detach(section7);
			if (detaching) detach(t117);
			if (detaching) detach(section8);
			if (detaching) detach(t171);
			if (detaching) detach(section9);
			if (detaching) detach(t267);
			if (detaching) detach(section10);
			if (detaching) detach(t280);
			if (detaching) detach(section11);
			if (detaching) detach(t286);
			if (detaching) detach(section12);
			if (detaching) detach(t292);
			if (detaching) detach(section13);
			if (detaching) detach(t304);
			if (detaching) detach(section14);
			if (detaching) detach(t312);
			if (detaching) detach(section15);
			if (detaching) detach(t318);
			if (detaching) detach(section16);
			if (detaching) detach(t329);
			if (detaching) detach(section17);
			if (detaching) detach(t401);
			if (detaching) detach(section18);
			if (detaching) detach(t405);
			if (detaching) detach(section19);
			if (detaching) detach(t409);
			if (detaching) detach(section20);
			if (detaching) detach(t413);
			if (detaching) detach(section21);
			if (detaching) detach(t418);
			if (detaching) detach(section22);
			if (detaching) detach(t429);
			if (detaching) detach(section23);
			if (detaching) detach(t437);
			if (detaching) detach(section24);
			if (detaching) detach(t443);
			if (detaching) detach(section25);
			if (detaching) detach(t453);
			if (detaching) detach(section26);
			if (detaching) detach(t486);
			if (detaching) detach(section27);
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
	"title": "Git Gudder",
	"venue": "Shopee SG",
	"venueLink": "https://www.google.com.sg/maps/place/Shopee+Building/@1.2923933,103.7860786,19z/data=!3m1!4b1!4m5!3m4!1s0x31da1b803e3bae77:0x154e17d66760912b!8m2!3d1.2923933!4d103.7866258",
	"occasion": "React Knowledgeable Week 41",
	"occasionLink": "https://github.com/Shopee/shopee-react-knowledgeable/issues/129",
	"slides": "https://slides.com/tanhauhau/git-gudder",
	"date": "2019-08-30",
	"slug": "git-gudder",
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
}, 3000);
