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
function query_selector_all(selector, parent = document.body) {
    return Array.from(parent.querySelectorAll(selector));
}

let current_component;
function set_current_component(component) {
    current_component = component;
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

var baseCss = "https://lihautan.com/notes/css-podcast-027-houdini-series-typed-om/assets/blog-base-248115e4.css";

var image = null;

/* src/layout/note.svelte generated by Svelte v3.24.0 */

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

// (25:2) {#each tags as tag}
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

// (43:2) {#each tags as tag}
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
			attr(span, "class", "svelte-8ynu44");
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

function create_fragment$1(ctx) {
	let title_value;
	let link;
	let meta0;
	let meta1;
	let meta2;
	let meta3;
	let meta4;
	let meta5;
	let meta6;
	let meta7;
	let meta8;
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
	let current;
	document.title = title_value = "Note: " + /*title*/ ctx[1] + " | Tan Li Hau";
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

	const default_slot_template = /*$$slots*/ ctx[4].default;
	const default_slot = create_slot(default_slot_template, ctx, /*$$scope*/ ctx[3], null);

	return {
		c() {
			link = element("link");
			meta0 = element("meta");
			meta1 = element("meta");
			meta2 = element("meta");
			meta3 = element("meta");

			for (let i = 0; i < each_blocks_1.length; i += 1) {
				each_blocks_1[i].c();
			}

			meta4 = element("meta");
			meta5 = element("meta");
			meta6 = element("meta");
			meta7 = element("meta");
			meta8 = element("meta");
			t0 = space();
			a = element("a");
			t1 = text("Skip to content");
			t2 = space();
			create_component(header.$$.fragment);
			t3 = space();
			main = element("main");
			h1 = element("h1");
			t4 = text(/*title*/ ctx[1]);
			t5 = space();

			for (let i = 0; i < each_blocks.length; i += 1) {
				each_blocks[i].c();
			}

			t6 = space();
			article = element("article");
			if (default_slot) default_slot.c();
			this.h();
		},
		l(nodes) {
			const head_nodes = query_selector_all("[data-svelte=\"svelte-179iwio\"]", document.head);
			link = claim_element(head_nodes, "LINK", { href: true, rel: true });
			meta0 = claim_element(head_nodes, "META", { name: true, content: true });
			meta1 = claim_element(head_nodes, "META", { name: true, content: true });
			meta2 = claim_element(head_nodes, "META", { name: true, content: true });
			meta3 = claim_element(head_nodes, "META", { name: true, content: true });

			for (let i = 0; i < each_blocks_1.length; i += 1) {
				each_blocks_1[i].l(head_nodes);
			}

			meta4 = claim_element(head_nodes, "META", { name: true, content: true });
			meta5 = claim_element(head_nodes, "META", { name: true, content: true });
			meta6 = claim_element(head_nodes, "META", { name: true, content: true });
			meta7 = claim_element(head_nodes, "META", { name: true, content: true });
			meta8 = claim_element(head_nodes, "META", { itemprop: true, content: true });
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
			t4 = claim_text(h1_nodes, /*title*/ ctx[1]);
			h1_nodes.forEach(detach);
			t5 = claim_space(main_nodes);

			for (let i = 0; i < each_blocks.length; i += 1) {
				each_blocks[i].l(main_nodes);
			}

			t6 = claim_space(main_nodes);
			article = claim_element(main_nodes, "ARTICLE", { class: true });
			var article_nodes = children(article);
			if (default_slot) default_slot.l(article_nodes);
			article_nodes.forEach(detach);
			main_nodes.forEach(detach);
			this.h();
		},
		h() {
			attr(link, "href", baseCss);
			attr(link, "rel", "stylesheet");
			attr(meta0, "name", "image");
			attr(meta0, "content", image);
			attr(meta1, "name", "og:image");
			attr(meta1, "content", image);
			attr(meta2, "name", "og:title");
			attr(meta2, "content", /*name*/ ctx[0]);
			attr(meta3, "name", "og:type");
			attr(meta3, "content", "website");
			attr(meta4, "name", "twitter:card");
			attr(meta4, "content", "summary_large_image");
			attr(meta5, "name", "twitter:creator");
			attr(meta5, "content", "@lihautan");
			attr(meta6, "name", "twitter:title");
			attr(meta6, "content", /*title*/ ctx[1]);
			attr(meta7, "name", "twitter:image");
			attr(meta7, "content", image);
			attr(meta8, "itemprop", "url");
			attr(meta8, "content", "https%3A%2F%2Flihautan.com%2Fnotes%2Fcss-podcast-027-houdini-series-typed-om");
			attr(a, "href", "#content");
			attr(a, "class", "skip svelte-8ynu44");
			attr(article, "class", "svelte-8ynu44");
			attr(main, "id", "content");
			attr(main, "class", "blog svelte-8ynu44");
		},
		m(target, anchor) {
			append(document.head, link);
			append(document.head, meta0);
			append(document.head, meta1);
			append(document.head, meta2);
			append(document.head, meta3);

			for (let i = 0; i < each_blocks_1.length; i += 1) {
				each_blocks_1[i].m(document.head, null);
			}

			append(document.head, meta4);
			append(document.head, meta5);
			append(document.head, meta6);
			append(document.head, meta7);
			append(document.head, meta8);
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

			current = true;
		},
		p(ctx, [dirty]) {
			if ((!current || dirty & /*title*/ 2) && title_value !== (title_value = "Note: " + /*title*/ ctx[1] + " | Tan Li Hau")) {
				document.title = title_value;
			}

			if (!current || dirty & /*name*/ 1) {
				attr(meta2, "content", /*name*/ ctx[0]);
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
						each_blocks_1[i].m(meta4.parentNode, meta4);
					}
				}

				for (; i < each_blocks_1.length; i += 1) {
					each_blocks_1[i].d(1);
				}

				each_blocks_1.length = each_value_1.length;
			}

			if (!current || dirty & /*title*/ 2) {
				attr(meta6, "content", /*title*/ ctx[1]);
			}

			if (!current || dirty & /*title*/ 2) set_data(t4, /*title*/ ctx[1]);

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
				if (default_slot.p && dirty & /*$$scope*/ 8) {
					update_slot(default_slot, default_slot_template, ctx, /*$$scope*/ ctx[3], dirty, null, null);
				}
			}
		},
		i(local) {
			if (current) return;
			transition_in(header.$$.fragment, local);
			transition_in(default_slot, local);
			current = true;
		},
		o(local) {
			transition_out(header.$$.fragment, local);
			transition_out(default_slot, local);
			current = false;
		},
		d(detaching) {
			detach(link);
			detach(meta0);
			detach(meta1);
			detach(meta2);
			detach(meta3);
			destroy_each(each_blocks_1, detaching);
			detach(meta4);
			detach(meta5);
			detach(meta6);
			detach(meta7);
			detach(meta8);
			if (detaching) detach(t0);
			if (detaching) detach(a);
			if (detaching) detach(t2);
			destroy_component(header, detaching);
			if (detaching) detach(t3);
			if (detaching) detach(main);
			destroy_each(each_blocks, detaching);
			if (default_slot) default_slot.d(detaching);
		}
	};
}

function instance($$self, $$props, $$invalidate) {
	let { name } = $$props;
	let { title } = $$props;
	let { tags = [] } = $$props;
	let { $$slots = {}, $$scope } = $$props;

	$$self.$set = $$props => {
		if ("name" in $$props) $$invalidate(0, name = $$props.name);
		if ("title" in $$props) $$invalidate(1, title = $$props.title);
		if ("tags" in $$props) $$invalidate(2, tags = $$props.tags);
		if ("$$scope" in $$props) $$invalidate(3, $$scope = $$props.$$scope);
	};

	return [name, title, tags, $$scope, $$slots];
}

class Note extends SvelteComponent {
	constructor(options) {
		super();
		init(this, options, instance, create_fragment$1, safe_not_equal, { name: 0, title: 1, tags: 2 });
	}
}

/* content/notes/@@page-markup.svelte generated by Svelte v3.24.0 */

function create_default_slot(ctx) {
	let section0;
	let ul1;
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
	let ul0;
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
	let li12;
	let a12;
	let t12;
	let t13;
	let section1;
	let h20;
	let a13;
	let t14;
	let t15;
	let ul2;
	let li13;
	let t16;
	let t17;
	let li14;
	let t18;
	let t19;
	let pre0;

	let raw0_value = `<code class="language-js"><span class="token keyword">const</span> div <span class="token operator">=</span> document<span class="token punctuation">.</span><span class="token function">createElement</span><span class="token punctuation">(</span><span class="token string">'div'</span><span class="token punctuation">)</span><span class="token punctuation">;</span>

<span class="token comment">// browser needs to parse the string to understand and use it</span>
div<span class="token punctuation">.</span>style<span class="token punctuation">.</span>height <span class="token operator">=</span> <span class="token string">'5px'</span><span class="token punctuation">;</span>

<span class="token comment">// browser understands and use the value as 5px</span>
div<span class="token punctuation">.</span>style<span class="token punctuation">.</span>height <span class="token operator">=</span> <span class="token constant">CSS</span><span class="token punctuation">.</span><span class="token function">px</span><span class="token punctuation">(</span><span class="token number">5</span><span class="token punctuation">)</span><span class="token punctuation">;</span></code>` + "";

	let t20;
	let ul3;
	let li15;
	let t21;
	let t22;
	let pre1;

	let raw1_value = `<code class="language-js">div<span class="token punctuation">.</span>attributeStyleMap<span class="token punctuation">.</span><span class="token function">set</span><span class="token punctuation">(</span><span class="token string">'color'</span><span class="token punctuation">,</span> <span class="token constant">CSS</span><span class="token punctuation">.</span><span class="token function">px</span><span class="token punctuation">(</span><span class="token number">10</span><span class="token punctuation">)</span><span class="token punctuation">)</span>
<span class="token comment">// TypeError: Failed to set, invalid type for property</span></code>` + "";

	let t23;
	let ul4;
	let li16;
	let t24;
	let t25;
	let pre2;

	let raw2_value = `<code class="language-js"><span class="token keyword">const</span> _5px <span class="token operator">=</span> <span class="token constant">CSS</span><span class="token punctuation">.</span><span class="token function">px</span><span class="token punctuation">(</span><span class="token number">5</span><span class="token punctuation">)</span><span class="token punctuation">;</span> <span class="token comment">// 5px</span>
<span class="token keyword">const</span> _15px <span class="token operator">=</span> _5px<span class="token punctuation">.</span><span class="token function">add</span><span class="token punctuation">(</span><span class="token constant">CSS</span><span class="token punctuation">.</span><span class="token function">px</span><span class="token punctuation">(</span><span class="token number">10</span><span class="token punctuation">)</span><span class="token punctuation">)</span><span class="token punctuation">;</span> <span class="token comment">// 15px;</span>

<span class="token keyword">const</span> div <span class="token operator">=</span> document<span class="token punctuation">.</span><span class="token function">createElement</span><span class="token punctuation">(</span><span class="token string">'div'</span><span class="token punctuation">)</span><span class="token punctuation">;</span>
div<span class="token punctuation">.</span>style<span class="token punctuation">.</span>height <span class="token operator">=</span> _15px<span class="token punctuation">;</span>
<span class="token comment">// &lt;div style="height: 15px;">&lt;/div></span></code>` + "";

	let t26;
	let ul5;
	let li17;
	let t27;
	let t28;
	let li18;
	let t29;
	let t30;
	let pre3;

	let raw3_value = `<code class="language-js"><span class="token comment">// checking browser support</span>
<span class="token keyword">if</span> <span class="token punctuation">(</span>window<span class="token punctuation">.</span><span class="token constant">CSS</span> <span class="token operator">&amp;&amp;</span> <span class="token constant">CSS</span><span class="token punctuation">.</span>number<span class="token punctuation">)</span> <span class="token punctuation">&#123;</span>
  <span class="token comment">// 😍 browser supports Typed OM!</span>
<span class="token punctuation">&#125;</span></code>` + "";

	let t31;
	let section2;
	let h21;
	let a14;
	let t32;
	let t33;
	let pre4;

	let raw4_value = `<code class="language-html"><span class="token tag"><span class="token tag"><span class="token punctuation">&lt;</span>script</span><span class="token punctuation">></span></span><span class="token script"><span class="token language-javascript">
  <span class="token keyword">const</span> element <span class="token operator">=</span> document<span class="token punctuation">.</span><span class="token function">querySelector</span><span class="token punctuation">(</span><span class="token string">'#app'</span><span class="token punctuation">)</span><span class="token punctuation">;</span>
  
  console<span class="token punctuation">.</span><span class="token function">log</span><span class="token punctuation">(</span>element<span class="token punctuation">.</span><span class="token function">computedStyleMap</span><span class="token punctuation">(</span><span class="token punctuation">)</span><span class="token punctuation">.</span><span class="token function">get</span><span class="token punctuation">(</span><span class="token string">'font-size'</span><span class="token punctuation">)</span><span class="token punctuation">)</span><span class="token punctuation">;</span>
  <span class="token comment">// Specification: CSSUnitValue &#123; value: 2, unit: 'rem' &#125;</span>
  <span class="token comment">// Chrome: CSSUnitValue &#123; value: 32, unit: 'px' &#125;</span>

  console<span class="token punctuation">.</span><span class="token function">log</span><span class="token punctuation">(</span>window<span class="token punctuation">.</span><span class="token function">getComputedStyle</span><span class="token punctuation">(</span>element<span class="token punctuation">)</span><span class="token punctuation">.</span>fontSize<span class="token punctuation">)</span><span class="token punctuation">;</span>
  <span class="token comment">// "32px"</span>
</span></span><span class="token tag"><span class="token tag"><span class="token punctuation">&lt;/</span>script</span><span class="token punctuation">></span></span>

<span class="token tag"><span class="token tag"><span class="token punctuation">&lt;</span>div</span> <span class="token attr-name">id</span><span class="token attr-value"><span class="token punctuation">=</span><span class="token punctuation">"</span>app<span class="token punctuation">"</span></span><span class="token style-attr language-css"><span class="token attr-name"> <span class="token attr-name">style</span></span><span class="token punctuation">="</span><span class="token attr-value"><span class="token property">font-size</span><span class="token punctuation">:</span> 2rem<span class="token punctuation">;</span></span><span class="token punctuation">"</span></span><span class="token punctuation">></span></span><span class="token tag"><span class="token tag"><span class="token punctuation">&lt;/</span>div</span><span class="token punctuation">></span></span></code>` + "";

	let t34;
	let section3;
	let h22;
	let a15;
	let t35;
	let t36;
	let ul6;
	let li19;
	let t37;
	let t38;
	let pre5;

	let raw5_value = `<code class="language-html"><span class="token tag"><span class="token tag"><span class="token punctuation">&lt;</span>script</span><span class="token punctuation">></span></span><span class="token script"><span class="token language-javascript">
  <span class="token keyword">const</span> element <span class="token operator">=</span> document<span class="token punctuation">.</span><span class="token function">querySelector</span><span class="token punctuation">(</span><span class="token string">'#app'</span><span class="token punctuation">)</span><span class="token punctuation">;</span>
  
  <span class="token keyword">const</span> inlineStyles <span class="token operator">=</span> element<span class="token punctuation">.</span>attributeStyleMap<span class="token punctuation">;</span>

  console<span class="token punctuation">.</span><span class="token function">log</span><span class="token punctuation">(</span>inlineStyles<span class="token punctuation">.</span><span class="token function">get</span><span class="token punctuation">(</span><span class="token string">'font-size'</span><span class="token punctuation">)</span><span class="token punctuation">)</span><span class="token punctuation">;</span>
  <span class="token comment">// CSSUnitValue &#123; value: 2, unit: 'rem' &#125;</span>

  inlineStyles<span class="token punctuation">.</span><span class="token function">set</span><span class="token punctuation">(</span><span class="token string">'height'</span><span class="token punctuation">,</span> <span class="token constant">CSS</span><span class="token punctuation">.</span><span class="token function">px</span><span class="token punctuation">(</span><span class="token number">10</span><span class="token punctuation">)</span><span class="token punctuation">)</span><span class="token punctuation">;</span>
  <span class="token comment">// &lt;div id="app" style="font-size: 2rem; height: 10px;">&lt;/div></span>

  inlineStyles<span class="token punctuation">.</span><span class="token function">clear</span><span class="token punctuation">(</span><span class="token punctuation">)</span><span class="token punctuation">;</span>
  <span class="token comment">// &lt;div id="app" style="">&lt;/div></span>

  inlineStyles<span class="token punctuation">.</span><span class="token function">append</span><span class="token punctuation">(</span><span class="token string">'background-image'</span><span class="token punctuation">,</span> <span class="token string">'linear-gradient(yellow, green)'</span><span class="token punctuation">)</span><span class="token punctuation">;</span>
  inlineStyles<span class="token punctuation">.</span><span class="token function">append</span><span class="token punctuation">(</span><span class="token string">'background-image'</span><span class="token punctuation">,</span> <span class="token string">'linear-gradient(to bottom, blue, red)'</span><span class="token punctuation">)</span><span class="token punctuation">;</span>
  <span class="token comment">// &lt;div id="app" </span>
  <span class="token comment">//   style="background-image: linear-gradient(yellow, green), </span>
  <span class="token comment">//                      linear-gradient(to bottom, blue, red)">&lt;/div></span>

  inlineStyles<span class="token punctuation">.</span><span class="token function">delete</span><span class="token punctuation">(</span><span class="token string">'background'</span><span class="token punctuation">)</span><span class="token punctuation">;</span>
  <span class="token comment">// &lt;div id="app" style="">&lt;/div></span>

  inlineStyles<span class="token punctuation">.</span><span class="token function">has</span><span class="token punctuation">(</span><span class="token string">'opacity'</span><span class="token punctuation">)</span><span class="token punctuation">;</span>
  <span class="token comment">// false</span>
</span></span><span class="token tag"><span class="token tag"><span class="token punctuation">&lt;/</span>script</span><span class="token punctuation">></span></span>

<span class="token tag"><span class="token tag"><span class="token punctuation">&lt;</span>div</span> <span class="token attr-name">id</span><span class="token attr-value"><span class="token punctuation">=</span><span class="token punctuation">"</span>app<span class="token punctuation">"</span></span><span class="token style-attr language-css"><span class="token attr-name"> <span class="token attr-name">style</span></span><span class="token punctuation">="</span><span class="token attr-value"><span class="token property">font-size</span><span class="token punctuation">:</span> 2rem<span class="token punctuation">;</span></span><span class="token punctuation">"</span></span><span class="token punctuation">></span></span><span class="token tag"><span class="token tag"><span class="token punctuation">&lt;/</span>div</span><span class="token punctuation">></span></span></code>` + "";

	let t39;
	let pre6;

	let raw6_value = `<code class="language-html"><span class="token tag"><span class="token tag"><span class="token punctuation">&lt;</span>script</span><span class="token punctuation">></span></span><span class="token script"><span class="token language-javascript">
  <span class="token comment">// &#96;attributeStyleMap&#96; only gets inline style</span>
  console<span class="token punctuation">.</span><span class="token function">log</span><span class="token punctuation">(</span>element<span class="token punctuation">.</span>attributeStyleMap<span class="token punctuation">.</span><span class="token function">get</span><span class="token punctuation">(</span><span class="token string">'color'</span><span class="token punctuation">)</span><span class="token punctuation">)</span><span class="token punctuation">;</span>
  <span class="token comment">// null</span>
  console<span class="token punctuation">.</span><span class="token function">log</span><span class="token punctuation">(</span>element<span class="token punctuation">.</span><span class="token function">computedStyleMap</span><span class="token punctuation">(</span><span class="token punctuation">)</span><span class="token punctuation">.</span><span class="token function">get</span><span class="token punctuation">(</span><span class="token string">'color'</span><span class="token punctuation">)</span><span class="token punctuation">)</span><span class="token punctuation">;</span>
  <span class="token comment">// CSSStyleValue &#123; /* red */ &#125;</span>
</span></span><span class="token tag"><span class="token tag"><span class="token punctuation">&lt;/</span>script</span><span class="token punctuation">></span></span>

<span class="token tag"><span class="token tag"><span class="token punctuation">&lt;</span>div</span> <span class="token attr-name">id</span><span class="token attr-value"><span class="token punctuation">=</span><span class="token punctuation">"</span>app<span class="token punctuation">"</span></span><span class="token style-attr language-css"><span class="token attr-name"> <span class="token attr-name">style</span></span><span class="token punctuation">="</span><span class="token attr-value"><span class="token property">font-size</span><span class="token punctuation">:</span> 2rem<span class="token punctuation">;</span></span><span class="token punctuation">"</span></span><span class="token punctuation">></span></span><span class="token tag"><span class="token tag"><span class="token punctuation">&lt;/</span>div</span><span class="token punctuation">></span></span>

<span class="token tag"><span class="token tag"><span class="token punctuation">&lt;</span>style</span><span class="token punctuation">></span></span><span class="token style"><span class="token language-css">
  <span class="token selector">#app</span> <span class="token punctuation">&#123;</span>
    <span class="token property">color</span><span class="token punctuation">:</span> red<span class="token punctuation">;</span>
  <span class="token punctuation">&#125;</span>
</span></span><span class="token tag"><span class="token tag"><span class="token punctuation">&lt;/</span>style</span><span class="token punctuation">></span></span></code>` + "";

	let t40;
	let section4;
	let h23;
	let a16;
	let t41;
	let t42;
	let ul7;
	let li20;
	let t43;
	let t44;
	let li21;
	let t45;
	let t46;
	let li22;
	let t47;
	let t48;
	let li23;
	let t49;
	let t50;
	let li24;
	let t51;
	let t52;
	let li25;
	let t53;
	let t54;
	let section5;
	let h30;
	let a17;
	let t55;
	let t56;
	let pre7;

	let raw7_value = `<code class="language-js">CSSStyleValue<span class="token punctuation">.</span><span class="token function">parse</span><span class="token punctuation">(</span><span class="token string">'font-size'</span><span class="token punctuation">,</span> <span class="token string">'32px'</span><span class="token punctuation">)</span><span class="token punctuation">;</span>
<span class="token comment">// CSSUnitValue &#123; value: 2, unit: 'px' &#125;</span>

CSSStyleValue<span class="token punctuation">.</span><span class="token function">parse</span><span class="token punctuation">(</span><span class="token string">'transform'</span><span class="token punctuation">,</span> <span class="token string">'translate3d(10px, 20px, 30px) scale(1.5)'</span><span class="token punctuation">)</span><span class="token punctuation">;</span>
<span class="token comment">/* 
CSSTransformValue &#123;
  0: CSSTranslate &#123;
    is2D: false
    x: CSSUnitValue &#123; value: 10, unit: 'px' &#125;
    y: CSSUnitValue &#123; value: 20, unit: 'px' &#125;
    z: CSSUnitValue &#123; value: 30, unit: 'px' &#125;
  &#125;
  1: CSSScale &#123;
    is2D: true
    x: CSSUnitValue &#123; value: 1.5, unit: 'number' &#125;
    y: CSSUnitValue &#123; value: 1.5, unit: 'number' &#125;
    z: CSSUnitValue &#123; value: 1, unit: 'number' &#125;
  &#125;
&#125;
*/</span></code>` + "";

	let t57;
	let section6;
	let h31;
	let a18;
	let t58;
	let t59;
	let ul8;
	let li26;
	let t60;
	let code0;
	let t61;
	let t62;
	let section7;
	let h32;
	let a19;
	let t63;
	let t64;
	let ul9;
	let li27;
	let code1;
	let t65;
	let t66;
	let code2;
	let t67;
	let t68;
	let t69;
	let pre8;

	let raw8_value = `<code class="language-js">CSSStyleValue<span class="token punctuation">.</span><span class="token function">parse</span><span class="token punctuation">(</span><span class="token string">'display'</span><span class="token punctuation">,</span> <span class="token string">'none'</span><span class="token punctuation">)</span><span class="token punctuation">;</span>
<span class="token comment">// CSSKeywordValue &#123; value: 'none' &#125;</span>
<span class="token keyword">const</span> keywordValue <span class="token operator">=</span> <span class="token keyword">new</span> <span class="token class-name">CSSKeywordValue</span><span class="token punctuation">(</span><span class="token string">'flex'</span><span class="token punctuation">)</span><span class="token punctuation">;</span>
<span class="token comment">// CSSKeywordValue &#123; value: 'flex' &#125;</span>
keywordValue<span class="token punctuation">.</span>value<span class="token punctuation">;</span>
<span class="token comment">// 'flex'</span></code>` + "";

	let t70;
	let section8;
	let h33;
	let a20;
	let t71;
	let t72;
	let ul10;
	let li28;
	let t73;
	let t74;
	let pre9;

	let raw9_value = `<code class="language-js"><span class="token comment">// Convert units</span>
<span class="token constant">CSS</span><span class="token punctuation">.</span><span class="token function">px</span><span class="token punctuation">(</span><span class="token number">48</span><span class="token punctuation">)</span><span class="token punctuation">.</span><span class="token function">to</span><span class="token punctuation">(</span><span class="token string">'in'</span><span class="token punctuation">)</span>
<span class="token comment">// CSSUnitValue &#123; value: 0.5, unit: 'in' &#125;</span>

<span class="token constant">CSS</span><span class="token punctuation">.</span><span class="token function">px</span><span class="token punctuation">(</span><span class="token number">48</span><span class="token punctuation">)</span><span class="token punctuation">.</span><span class="token function">to</span><span class="token punctuation">(</span><span class="token string">'rem'</span><span class="token punctuation">)</span>
<span class="token comment">// Error</span>
<span class="token comment">// Cannot transform absolute unit to relative unit</span></code>` + "";

	let t75;
	let section9;
	let h34;
	let a21;
	let t76;
	let t77;
	let ul11;
	let li29;
	let t78;
	let t79;
	let pre10;

	let raw10_value = `<code class="language-js"><span class="token keyword">new</span> <span class="token class-name">CSSMathSum</span><span class="token punctuation">(</span><span class="token constant">CSS</span><span class="token punctuation">.</span><span class="token function">px</span><span class="token punctuation">(</span><span class="token number">5</span><span class="token punctuation">)</span><span class="token punctuation">,</span> <span class="token constant">CSS</span><span class="token punctuation">.</span><span class="token function">px</span><span class="token punctuation">(</span><span class="token number">10</span><span class="token punctuation">)</span><span class="token punctuation">)</span><span class="token punctuation">;</span> <span class="token comment">// 15px</span>

div<span class="token punctuation">.</span>attributeStyleMap<span class="token punctuation">.</span><span class="token function">set</span><span class="token punctuation">(</span><span class="token string">'width'</span><span class="token punctuation">,</span> <span class="token keyword">new</span> <span class="token class-name">CSSMathMax</span><span class="token punctuation">(</span><span class="token constant">CSS</span><span class="token punctuation">.</span><span class="token function">rem</span><span class="token punctuation">(</span><span class="token number">10</span><span class="token punctuation">)</span><span class="token punctuation">,</span> <span class="token constant">CSS</span><span class="token punctuation">.</span><span class="token function">px</span><span class="token punctuation">(</span><span class="token number">30</span><span class="token punctuation">)</span><span class="token punctuation">)</span><span class="token punctuation">)</span><span class="token punctuation">;</span>
<span class="token comment">// &lt;div style="width: max(10rem, 30px)">&lt;/div></span></code>` + "";

	let t80;
	let section10;
	let h35;
	let a22;
	let t81;
	let t82;
	let pre11;

	let raw11_value = `<code class="language-js"><span class="token keyword">const</span> position <span class="token operator">=</span> <span class="token keyword">new</span> <span class="token class-name">CSSPositionValue</span><span class="token punctuation">(</span><span class="token constant">CSS</span><span class="token punctuation">.</span><span class="token function">px</span><span class="token punctuation">(</span><span class="token number">20</span><span class="token punctuation">)</span><span class="token punctuation">,</span> <span class="token constant">CSS</span><span class="token punctuation">.</span><span class="token function">px</span><span class="token punctuation">(</span><span class="token number">50</span><span class="token punctuation">)</span><span class="token punctuation">)</span>
position<span class="token punctuation">.</span>x<span class="token punctuation">;</span> <span class="token comment">// CSSUnitValue &#123; value: 20, unit: 'px' &#125;</span>
position<span class="token punctuation">.</span>y<span class="token punctuation">;</span> <span class="token comment">// CSSUnitValue &#123; value: 50, unit: 'px' &#125;</span></code>` + "";

	let t83;
	let section11;
	let h36;
	let a23;
	let t84;
	let t85;
	let ul12;
	let li30;
	let t86;
	let t87;
	let pre12;

	let raw12_value = `<code class="language-js"><span class="token keyword">const</span> transformValue <span class="token operator">=</span> CSSStyleValue<span class="token punctuation">.</span><span class="token function">parse</span><span class="token punctuation">(</span><span class="token string">'transform'</span><span class="token punctuation">,</span> <span class="token string">'translate3d(10px, 20px, 30px) scale(1.5)'</span><span class="token punctuation">)</span><span class="token punctuation">;</span>

<span class="token comment">// iterate through each transformation</span>
<span class="token keyword">for</span> <span class="token punctuation">(</span><span class="token keyword">const</span> transform <span class="token keyword">of</span> transformValue<span class="token punctuation">)</span> <span class="token punctuation">&#123;</span>
  console<span class="token punctuation">.</span><span class="token function">log</span><span class="token punctuation">(</span>transform<span class="token punctuation">)</span><span class="token punctuation">;</span>
<span class="token punctuation">&#125;</span>
<span class="token comment">// CSSTranslate &#123; ... &#125;</span>
<span class="token comment">// CSSScale &#123; ... &#125;</span>

<span class="token comment">// get DOMMatrix out of the transformValue</span>
transformValue<span class="token punctuation">.</span><span class="token function">toMatrix</span><span class="token punctuation">(</span><span class="token punctuation">)</span><span class="token punctuation">;</span>
<span class="token comment">// DOMMatrix &#123; a: 1.5, b: 0, c: 0, ... &#125;</span></code>` + "";

	let t88;
	let section12;
	let h37;
	let a24;
	let t89;
	let t90;
	let ul13;
	let li31;
	let t91;
	let t92;
	let li32;
	let t93;
	let t94;
	let pre13;

	let raw13_value = `<code class="language-html"><span class="token tag"><span class="token tag"><span class="token punctuation">&lt;</span>script</span><span class="token punctuation">></span></span><span class="token script"><span class="token language-javascript">
  <span class="token keyword">const</span> element <span class="token operator">=</span> document<span class="token punctuation">.</span><span class="token function">querySelector</span><span class="token punctuation">(</span><span class="token string">'#app'</span><span class="token punctuation">)</span><span class="token punctuation">;</span>
  
  element<span class="token punctuation">.</span>attributeStyleMap<span class="token punctuation">.</span><span class="token function">get</span><span class="token punctuation">(</span><span class="token string">'--length'</span><span class="token punctuation">)</span><span class="token punctuation">;</span>
  <span class="token comment">// CSSUnparsedValue &#123; 0: 3px &#125;</span>
</span></span><span class="token tag"><span class="token tag"><span class="token punctuation">&lt;/</span>script</span><span class="token punctuation">></span></span>
<span class="token tag"><span class="token tag"><span class="token punctuation">&lt;</span>div</span> <span class="token attr-name">id</span><span class="token attr-value"><span class="token punctuation">=</span><span class="token punctuation">"</span>app<span class="token punctuation">"</span></span><span class="token style-attr language-css"><span class="token attr-name"> <span class="token attr-name">style</span></span><span class="token punctuation">="</span><span class="token attr-value"><span class="token property">--length</span><span class="token punctuation">:</span> 3px<span class="token punctuation">;</span></span><span class="token punctuation">"</span></span><span class="token punctuation">></span></span></code>` + "";

	let t95;
	let section13;
	let h38;
	let a25;
	let t96;
	let t97;
	let ul14;
	let li33;
	let t98;
	let a26;
	let t99;
	let t100;
	let li34;
	let t101;
	let a27;
	let t102;
	let t103;
	let li35;
	let t104;
	let code3;
	let t105;
	let t106;
	let a28;
	let t107;
	let t108;
	let li36;
	let t109;
	let code4;
	let t110;
	let t111;
	let a29;
	let t112;

	return {
		c() {
			section0 = element("section");
			ul1 = element("ul");
			li0 = element("li");
			a0 = element("a");
			t0 = text("CSS Typed Object Model (Typed OM)");
			li1 = element("li");
			a1 = element("a");
			t1 = text("computedStyleMap");
			li2 = element("li");
			a2 = element("a");
			t2 = text("attributeStyleMap");
			li3 = element("li");
			a3 = element("a");
			t3 = text("Types of CSSStyleValue");
			ul0 = element("ul");
			li4 = element("li");
			a4 = element("a");
			t4 = text("create CSSStyleValue");
			li5 = element("li");
			a5 = element("a");
			t5 = text("CSSImageValue");
			li6 = element("li");
			a6 = element("a");
			t6 = text("CSSKeywordValue");
			li7 = element("li");
			a7 = element("a");
			t7 = text("CSSNumericValue");
			li8 = element("li");
			a8 = element("a");
			t8 = text("CSSMathValue");
			li9 = element("li");
			a9 = element("a");
			t9 = text("CSSPositionValue");
			li10 = element("li");
			a10 = element("a");
			t10 = text("CSSTransformValue");
			li11 = element("li");
			a11 = element("a");
			t11 = text("CSSUnparsedValue");
			li12 = element("li");
			a12 = element("a");
			t12 = text("References");
			t13 = space();
			section1 = element("section");
			h20 = element("h2");
			a13 = element("a");
			t14 = text("CSS Typed Object Model (Typed OM)");
			t15 = space();
			ul2 = element("ul");
			li13 = element("li");
			t16 = text("CSS Typed OM API allow manipulating CSS styles through a typed JS representation rather than a simple string.");
			t17 = space();
			li14 = element("li");
			t18 = text("Provide performance win. Browser understands the structured JS representation and no longer needs to parse CSS string from scratch.");
			t19 = space();
			pre0 = element("pre");
			t20 = space();
			ul3 = element("ul");
			li15 = element("li");
			t21 = text("Built-in error handling. You can't provide invalid value to a type.");
			t22 = space();
			pre1 = element("pre");
			t23 = space();
			ul4 = element("ul");
			li16 = element("li");
			t24 = text("Rather than manipulating raw string, developer can create / transform CSS in a meaningful object");
			t25 = space();
			pre2 = element("pre");
			t26 = space();
			ul5 = element("ul");
			li17 = element("li");
			t27 = text("API based on functional programming concept");
			t28 = space();
			li18 = element("li");
			t29 = text("To check browser support Typed OM, currently (21 Nov 2020) supported in Safari Tech Preview & Chromium");
			t30 = space();
			pre3 = element("pre");
			t31 = space();
			section2 = element("section");
			h21 = element("h2");
			a14 = element("a");
			t32 = text("computedStyleMap");
			t33 = space();
			pre4 = element("pre");
			t34 = space();
			section3 = element("section");
			h22 = element("h2");
			a15 = element("a");
			t35 = text("attributeStyleMap");
			t36 = space();
			ul6 = element("ul");
			li19 = element("li");
			t37 = text("parse, modify inline styles");
			t38 = space();
			pre5 = element("pre");
			t39 = space();
			pre6 = element("pre");
			t40 = space();
			section4 = element("section");
			h23 = element("h2");
			a16 = element("a");
			t41 = text("Types of CSSStyleValue");
			t42 = space();
			ul7 = element("ul");
			li20 = element("li");
			t43 = text("CSSImageValue");
			t44 = space();
			li21 = element("li");
			t45 = text("CSSKeywordValue");
			t46 = space();
			li22 = element("li");
			t47 = text("CSSNumericValue");
			t48 = space();
			li23 = element("li");
			t49 = text("CSSPositionValue");
			t50 = space();
			li24 = element("li");
			t51 = text("CSSTransformValue");
			t52 = space();
			li25 = element("li");
			t53 = text("CSSUnparsedValue");
			t54 = space();
			section5 = element("section");
			h30 = element("h3");
			a17 = element("a");
			t55 = text("create CSSStyleValue");
			t56 = space();
			pre7 = element("pre");
			t57 = space();
			section6 = element("section");
			h31 = element("h3");
			a18 = element("a");
			t58 = text("CSSImageValue");
			t59 = space();
			ul8 = element("ul");
			li26 = element("li");
			t60 = text("does not cover ");
			code0 = element("code");
			t61 = text("linear-gradient");
			t62 = space();
			section7 = element("section");
			h32 = element("h3");
			a19 = element("a");
			t63 = text("CSSKeywordValue");
			t64 = space();
			ul9 = element("ul");
			li27 = element("li");
			code1 = element("code");
			t65 = text("display: none");
			t66 = text(", ");
			code2 = element("code");
			t67 = text("none");
			t68 = text(" is a CSSKeywordValue");
			t69 = space();
			pre8 = element("pre");
			t70 = space();
			section8 = element("section");
			h33 = element("h3");
			a20 = element("a");
			t71 = text("CSSNumericValue");
			t72 = space();
			ul10 = element("ul");
			li28 = element("li");
			t73 = text("CSSNumericValue has a few subclasses, eg: CSSUnitValue, CSSMathValue");
			t74 = space();
			pre9 = element("pre");
			t75 = space();
			section9 = element("section");
			h34 = element("h3");
			a21 = element("a");
			t76 = text("CSSMathValue");
			t77 = space();
			ul11 = element("ul");
			li29 = element("li");
			t78 = text("CSSMathNegate, CSSMathMin, CSSMathMax, CSSMathSum, CSSMathProduct, CSSMathInvert");
			t79 = space();
			pre10 = element("pre");
			t80 = space();
			section10 = element("section");
			h35 = element("h3");
			a22 = element("a");
			t81 = text("CSSPositionValue");
			t82 = space();
			pre11 = element("pre");
			t83 = space();
			section11 = element("section");
			h36 = element("h3");
			a23 = element("a");
			t84 = text("CSSTransformValue");
			t85 = space();
			ul12 = element("ul");
			li30 = element("li");
			t86 = text("CSSTranslate, CSSScale, CSSRotate, CSSSkew, CSSSkewX, CSSSkewY, CSSPerspective, CSSMatrixComponent");
			t87 = space();
			pre12 = element("pre");
			t88 = space();
			section12 = element("section");
			h37 = element("h3");
			a24 = element("a");
			t89 = text("CSSUnparsedValue");
			t90 = space();
			ul13 = element("ul");
			li31 = element("li");
			t91 = text("CSSCustomProperty, that is not Houdini Property");
			t92 = space();
			li32 = element("li");
			t93 = text("the value is parsed as string");
			t94 = space();
			pre13 = element("pre");
			t95 = space();
			section13 = element("section");
			h38 = element("h3");
			a25 = element("a");
			t96 = text("References");
			t97 = space();
			ul14 = element("ul");
			li33 = element("li");
			t98 = text("Specifications ");
			a26 = element("a");
			t99 = text("https://www.w3.org/TR/css-typed-om-1/");
			t100 = space();
			li34 = element("li");
			t101 = text("MDN ");
			a27 = element("a");
			t102 = text("https://developer.mozilla.org/en-US/docs/Web/API/CSS_Typed_OM_API");
			t103 = space();
			li35 = element("li");
			t104 = text("caniuse ");
			code3 = element("code");
			t105 = text("attributeStyleMap");
			t106 = space();
			a28 = element("a");
			t107 = text("https://caniuse.com/mdn-api_element_attributestylemap");
			t108 = space();
			li36 = element("li");
			t109 = text("caniuse ");
			code4 = element("code");
			t110 = text("computedStyleMap");
			t111 = space();
			a29 = element("a");
			t112 = text("https://caniuse.com/mdn-api_element_computedstylemap");
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
			t0 = claim_text(a0_nodes, "CSS Typed Object Model (Typed OM)");
			a0_nodes.forEach(detach);
			li0_nodes.forEach(detach);
			li1 = claim_element(ul1_nodes, "LI", {});
			var li1_nodes = children(li1);
			a1 = claim_element(li1_nodes, "A", { href: true });
			var a1_nodes = children(a1);
			t1 = claim_text(a1_nodes, "computedStyleMap");
			a1_nodes.forEach(detach);
			li1_nodes.forEach(detach);
			li2 = claim_element(ul1_nodes, "LI", {});
			var li2_nodes = children(li2);
			a2 = claim_element(li2_nodes, "A", { href: true });
			var a2_nodes = children(a2);
			t2 = claim_text(a2_nodes, "attributeStyleMap");
			a2_nodes.forEach(detach);
			li2_nodes.forEach(detach);
			li3 = claim_element(ul1_nodes, "LI", {});
			var li3_nodes = children(li3);
			a3 = claim_element(li3_nodes, "A", { href: true });
			var a3_nodes = children(a3);
			t3 = claim_text(a3_nodes, "Types of CSSStyleValue");
			a3_nodes.forEach(detach);
			li3_nodes.forEach(detach);
			ul0 = claim_element(ul1_nodes, "UL", {});
			var ul0_nodes = children(ul0);
			li4 = claim_element(ul0_nodes, "LI", {});
			var li4_nodes = children(li4);
			a4 = claim_element(li4_nodes, "A", { href: true });
			var a4_nodes = children(a4);
			t4 = claim_text(a4_nodes, "create CSSStyleValue");
			a4_nodes.forEach(detach);
			li4_nodes.forEach(detach);
			li5 = claim_element(ul0_nodes, "LI", {});
			var li5_nodes = children(li5);
			a5 = claim_element(li5_nodes, "A", { href: true });
			var a5_nodes = children(a5);
			t5 = claim_text(a5_nodes, "CSSImageValue");
			a5_nodes.forEach(detach);
			li5_nodes.forEach(detach);
			li6 = claim_element(ul0_nodes, "LI", {});
			var li6_nodes = children(li6);
			a6 = claim_element(li6_nodes, "A", { href: true });
			var a6_nodes = children(a6);
			t6 = claim_text(a6_nodes, "CSSKeywordValue");
			a6_nodes.forEach(detach);
			li6_nodes.forEach(detach);
			li7 = claim_element(ul0_nodes, "LI", {});
			var li7_nodes = children(li7);
			a7 = claim_element(li7_nodes, "A", { href: true });
			var a7_nodes = children(a7);
			t7 = claim_text(a7_nodes, "CSSNumericValue");
			a7_nodes.forEach(detach);
			li7_nodes.forEach(detach);
			li8 = claim_element(ul0_nodes, "LI", {});
			var li8_nodes = children(li8);
			a8 = claim_element(li8_nodes, "A", { href: true });
			var a8_nodes = children(a8);
			t8 = claim_text(a8_nodes, "CSSMathValue");
			a8_nodes.forEach(detach);
			li8_nodes.forEach(detach);
			li9 = claim_element(ul0_nodes, "LI", {});
			var li9_nodes = children(li9);
			a9 = claim_element(li9_nodes, "A", { href: true });
			var a9_nodes = children(a9);
			t9 = claim_text(a9_nodes, "CSSPositionValue");
			a9_nodes.forEach(detach);
			li9_nodes.forEach(detach);
			li10 = claim_element(ul0_nodes, "LI", {});
			var li10_nodes = children(li10);
			a10 = claim_element(li10_nodes, "A", { href: true });
			var a10_nodes = children(a10);
			t10 = claim_text(a10_nodes, "CSSTransformValue");
			a10_nodes.forEach(detach);
			li10_nodes.forEach(detach);
			li11 = claim_element(ul0_nodes, "LI", {});
			var li11_nodes = children(li11);
			a11 = claim_element(li11_nodes, "A", { href: true });
			var a11_nodes = children(a11);
			t11 = claim_text(a11_nodes, "CSSUnparsedValue");
			a11_nodes.forEach(detach);
			li11_nodes.forEach(detach);
			li12 = claim_element(ul0_nodes, "LI", {});
			var li12_nodes = children(li12);
			a12 = claim_element(li12_nodes, "A", { href: true });
			var a12_nodes = children(a12);
			t12 = claim_text(a12_nodes, "References");
			a12_nodes.forEach(detach);
			li12_nodes.forEach(detach);
			ul0_nodes.forEach(detach);
			ul1_nodes.forEach(detach);
			section0_nodes.forEach(detach);
			t13 = claim_space(nodes);
			section1 = claim_element(nodes, "SECTION", {});
			var section1_nodes = children(section1);
			h20 = claim_element(section1_nodes, "H2", {});
			var h20_nodes = children(h20);
			a13 = claim_element(h20_nodes, "A", { href: true, id: true });
			var a13_nodes = children(a13);
			t14 = claim_text(a13_nodes, "CSS Typed Object Model (Typed OM)");
			a13_nodes.forEach(detach);
			h20_nodes.forEach(detach);
			t15 = claim_space(section1_nodes);
			ul2 = claim_element(section1_nodes, "UL", {});
			var ul2_nodes = children(ul2);
			li13 = claim_element(ul2_nodes, "LI", {});
			var li13_nodes = children(li13);
			t16 = claim_text(li13_nodes, "CSS Typed OM API allow manipulating CSS styles through a typed JS representation rather than a simple string.");
			li13_nodes.forEach(detach);
			t17 = claim_space(ul2_nodes);
			li14 = claim_element(ul2_nodes, "LI", {});
			var li14_nodes = children(li14);
			t18 = claim_text(li14_nodes, "Provide performance win. Browser understands the structured JS representation and no longer needs to parse CSS string from scratch.");
			li14_nodes.forEach(detach);
			ul2_nodes.forEach(detach);
			t19 = claim_space(section1_nodes);
			pre0 = claim_element(section1_nodes, "PRE", { class: true });
			var pre0_nodes = children(pre0);
			pre0_nodes.forEach(detach);
			t20 = claim_space(section1_nodes);
			ul3 = claim_element(section1_nodes, "UL", {});
			var ul3_nodes = children(ul3);
			li15 = claim_element(ul3_nodes, "LI", {});
			var li15_nodes = children(li15);
			t21 = claim_text(li15_nodes, "Built-in error handling. You can't provide invalid value to a type.");
			li15_nodes.forEach(detach);
			ul3_nodes.forEach(detach);
			t22 = claim_space(section1_nodes);
			pre1 = claim_element(section1_nodes, "PRE", { class: true });
			var pre1_nodes = children(pre1);
			pre1_nodes.forEach(detach);
			t23 = claim_space(section1_nodes);
			ul4 = claim_element(section1_nodes, "UL", {});
			var ul4_nodes = children(ul4);
			li16 = claim_element(ul4_nodes, "LI", {});
			var li16_nodes = children(li16);
			t24 = claim_text(li16_nodes, "Rather than manipulating raw string, developer can create / transform CSS in a meaningful object");
			li16_nodes.forEach(detach);
			ul4_nodes.forEach(detach);
			t25 = claim_space(section1_nodes);
			pre2 = claim_element(section1_nodes, "PRE", { class: true });
			var pre2_nodes = children(pre2);
			pre2_nodes.forEach(detach);
			t26 = claim_space(section1_nodes);
			ul5 = claim_element(section1_nodes, "UL", {});
			var ul5_nodes = children(ul5);
			li17 = claim_element(ul5_nodes, "LI", {});
			var li17_nodes = children(li17);
			t27 = claim_text(li17_nodes, "API based on functional programming concept");
			li17_nodes.forEach(detach);
			t28 = claim_space(ul5_nodes);
			li18 = claim_element(ul5_nodes, "LI", {});
			var li18_nodes = children(li18);
			t29 = claim_text(li18_nodes, "To check browser support Typed OM, currently (21 Nov 2020) supported in Safari Tech Preview & Chromium");
			li18_nodes.forEach(detach);
			ul5_nodes.forEach(detach);
			t30 = claim_space(section1_nodes);
			pre3 = claim_element(section1_nodes, "PRE", { class: true });
			var pre3_nodes = children(pre3);
			pre3_nodes.forEach(detach);
			section1_nodes.forEach(detach);
			t31 = claim_space(nodes);
			section2 = claim_element(nodes, "SECTION", {});
			var section2_nodes = children(section2);
			h21 = claim_element(section2_nodes, "H2", {});
			var h21_nodes = children(h21);
			a14 = claim_element(h21_nodes, "A", { href: true, id: true });
			var a14_nodes = children(a14);
			t32 = claim_text(a14_nodes, "computedStyleMap");
			a14_nodes.forEach(detach);
			h21_nodes.forEach(detach);
			t33 = claim_space(section2_nodes);
			pre4 = claim_element(section2_nodes, "PRE", { class: true });
			var pre4_nodes = children(pre4);
			pre4_nodes.forEach(detach);
			section2_nodes.forEach(detach);
			t34 = claim_space(nodes);
			section3 = claim_element(nodes, "SECTION", {});
			var section3_nodes = children(section3);
			h22 = claim_element(section3_nodes, "H2", {});
			var h22_nodes = children(h22);
			a15 = claim_element(h22_nodes, "A", { href: true, id: true });
			var a15_nodes = children(a15);
			t35 = claim_text(a15_nodes, "attributeStyleMap");
			a15_nodes.forEach(detach);
			h22_nodes.forEach(detach);
			t36 = claim_space(section3_nodes);
			ul6 = claim_element(section3_nodes, "UL", {});
			var ul6_nodes = children(ul6);
			li19 = claim_element(ul6_nodes, "LI", {});
			var li19_nodes = children(li19);
			t37 = claim_text(li19_nodes, "parse, modify inline styles");
			li19_nodes.forEach(detach);
			ul6_nodes.forEach(detach);
			t38 = claim_space(section3_nodes);
			pre5 = claim_element(section3_nodes, "PRE", { class: true });
			var pre5_nodes = children(pre5);
			pre5_nodes.forEach(detach);
			t39 = claim_space(section3_nodes);
			pre6 = claim_element(section3_nodes, "PRE", { class: true });
			var pre6_nodes = children(pre6);
			pre6_nodes.forEach(detach);
			section3_nodes.forEach(detach);
			t40 = claim_space(nodes);
			section4 = claim_element(nodes, "SECTION", {});
			var section4_nodes = children(section4);
			h23 = claim_element(section4_nodes, "H2", {});
			var h23_nodes = children(h23);
			a16 = claim_element(h23_nodes, "A", { href: true, id: true });
			var a16_nodes = children(a16);
			t41 = claim_text(a16_nodes, "Types of CSSStyleValue");
			a16_nodes.forEach(detach);
			h23_nodes.forEach(detach);
			t42 = claim_space(section4_nodes);
			ul7 = claim_element(section4_nodes, "UL", {});
			var ul7_nodes = children(ul7);
			li20 = claim_element(ul7_nodes, "LI", {});
			var li20_nodes = children(li20);
			t43 = claim_text(li20_nodes, "CSSImageValue");
			li20_nodes.forEach(detach);
			t44 = claim_space(ul7_nodes);
			li21 = claim_element(ul7_nodes, "LI", {});
			var li21_nodes = children(li21);
			t45 = claim_text(li21_nodes, "CSSKeywordValue");
			li21_nodes.forEach(detach);
			t46 = claim_space(ul7_nodes);
			li22 = claim_element(ul7_nodes, "LI", {});
			var li22_nodes = children(li22);
			t47 = claim_text(li22_nodes, "CSSNumericValue");
			li22_nodes.forEach(detach);
			t48 = claim_space(ul7_nodes);
			li23 = claim_element(ul7_nodes, "LI", {});
			var li23_nodes = children(li23);
			t49 = claim_text(li23_nodes, "CSSPositionValue");
			li23_nodes.forEach(detach);
			t50 = claim_space(ul7_nodes);
			li24 = claim_element(ul7_nodes, "LI", {});
			var li24_nodes = children(li24);
			t51 = claim_text(li24_nodes, "CSSTransformValue");
			li24_nodes.forEach(detach);
			t52 = claim_space(ul7_nodes);
			li25 = claim_element(ul7_nodes, "LI", {});
			var li25_nodes = children(li25);
			t53 = claim_text(li25_nodes, "CSSUnparsedValue");
			li25_nodes.forEach(detach);
			ul7_nodes.forEach(detach);
			section4_nodes.forEach(detach);
			t54 = claim_space(nodes);
			section5 = claim_element(nodes, "SECTION", {});
			var section5_nodes = children(section5);
			h30 = claim_element(section5_nodes, "H3", {});
			var h30_nodes = children(h30);
			a17 = claim_element(h30_nodes, "A", { href: true, id: true });
			var a17_nodes = children(a17);
			t55 = claim_text(a17_nodes, "create CSSStyleValue");
			a17_nodes.forEach(detach);
			h30_nodes.forEach(detach);
			t56 = claim_space(section5_nodes);
			pre7 = claim_element(section5_nodes, "PRE", { class: true });
			var pre7_nodes = children(pre7);
			pre7_nodes.forEach(detach);
			section5_nodes.forEach(detach);
			t57 = claim_space(nodes);
			section6 = claim_element(nodes, "SECTION", {});
			var section6_nodes = children(section6);
			h31 = claim_element(section6_nodes, "H3", {});
			var h31_nodes = children(h31);
			a18 = claim_element(h31_nodes, "A", { href: true, id: true });
			var a18_nodes = children(a18);
			t58 = claim_text(a18_nodes, "CSSImageValue");
			a18_nodes.forEach(detach);
			h31_nodes.forEach(detach);
			t59 = claim_space(section6_nodes);
			ul8 = claim_element(section6_nodes, "UL", {});
			var ul8_nodes = children(ul8);
			li26 = claim_element(ul8_nodes, "LI", {});
			var li26_nodes = children(li26);
			t60 = claim_text(li26_nodes, "does not cover ");
			code0 = claim_element(li26_nodes, "CODE", {});
			var code0_nodes = children(code0);
			t61 = claim_text(code0_nodes, "linear-gradient");
			code0_nodes.forEach(detach);
			li26_nodes.forEach(detach);
			ul8_nodes.forEach(detach);
			section6_nodes.forEach(detach);
			t62 = claim_space(nodes);
			section7 = claim_element(nodes, "SECTION", {});
			var section7_nodes = children(section7);
			h32 = claim_element(section7_nodes, "H3", {});
			var h32_nodes = children(h32);
			a19 = claim_element(h32_nodes, "A", { href: true, id: true });
			var a19_nodes = children(a19);
			t63 = claim_text(a19_nodes, "CSSKeywordValue");
			a19_nodes.forEach(detach);
			h32_nodes.forEach(detach);
			t64 = claim_space(section7_nodes);
			ul9 = claim_element(section7_nodes, "UL", {});
			var ul9_nodes = children(ul9);
			li27 = claim_element(ul9_nodes, "LI", {});
			var li27_nodes = children(li27);
			code1 = claim_element(li27_nodes, "CODE", {});
			var code1_nodes = children(code1);
			t65 = claim_text(code1_nodes, "display: none");
			code1_nodes.forEach(detach);
			t66 = claim_text(li27_nodes, ", ");
			code2 = claim_element(li27_nodes, "CODE", {});
			var code2_nodes = children(code2);
			t67 = claim_text(code2_nodes, "none");
			code2_nodes.forEach(detach);
			t68 = claim_text(li27_nodes, " is a CSSKeywordValue");
			li27_nodes.forEach(detach);
			ul9_nodes.forEach(detach);
			t69 = claim_space(section7_nodes);
			pre8 = claim_element(section7_nodes, "PRE", { class: true });
			var pre8_nodes = children(pre8);
			pre8_nodes.forEach(detach);
			section7_nodes.forEach(detach);
			t70 = claim_space(nodes);
			section8 = claim_element(nodes, "SECTION", {});
			var section8_nodes = children(section8);
			h33 = claim_element(section8_nodes, "H3", {});
			var h33_nodes = children(h33);
			a20 = claim_element(h33_nodes, "A", { href: true, id: true });
			var a20_nodes = children(a20);
			t71 = claim_text(a20_nodes, "CSSNumericValue");
			a20_nodes.forEach(detach);
			h33_nodes.forEach(detach);
			t72 = claim_space(section8_nodes);
			ul10 = claim_element(section8_nodes, "UL", {});
			var ul10_nodes = children(ul10);
			li28 = claim_element(ul10_nodes, "LI", {});
			var li28_nodes = children(li28);
			t73 = claim_text(li28_nodes, "CSSNumericValue has a few subclasses, eg: CSSUnitValue, CSSMathValue");
			li28_nodes.forEach(detach);
			ul10_nodes.forEach(detach);
			t74 = claim_space(section8_nodes);
			pre9 = claim_element(section8_nodes, "PRE", { class: true });
			var pre9_nodes = children(pre9);
			pre9_nodes.forEach(detach);
			section8_nodes.forEach(detach);
			t75 = claim_space(nodes);
			section9 = claim_element(nodes, "SECTION", {});
			var section9_nodes = children(section9);
			h34 = claim_element(section9_nodes, "H3", {});
			var h34_nodes = children(h34);
			a21 = claim_element(h34_nodes, "A", { href: true, id: true });
			var a21_nodes = children(a21);
			t76 = claim_text(a21_nodes, "CSSMathValue");
			a21_nodes.forEach(detach);
			h34_nodes.forEach(detach);
			t77 = claim_space(section9_nodes);
			ul11 = claim_element(section9_nodes, "UL", {});
			var ul11_nodes = children(ul11);
			li29 = claim_element(ul11_nodes, "LI", {});
			var li29_nodes = children(li29);
			t78 = claim_text(li29_nodes, "CSSMathNegate, CSSMathMin, CSSMathMax, CSSMathSum, CSSMathProduct, CSSMathInvert");
			li29_nodes.forEach(detach);
			ul11_nodes.forEach(detach);
			t79 = claim_space(section9_nodes);
			pre10 = claim_element(section9_nodes, "PRE", { class: true });
			var pre10_nodes = children(pre10);
			pre10_nodes.forEach(detach);
			section9_nodes.forEach(detach);
			t80 = claim_space(nodes);
			section10 = claim_element(nodes, "SECTION", {});
			var section10_nodes = children(section10);
			h35 = claim_element(section10_nodes, "H3", {});
			var h35_nodes = children(h35);
			a22 = claim_element(h35_nodes, "A", { href: true, id: true });
			var a22_nodes = children(a22);
			t81 = claim_text(a22_nodes, "CSSPositionValue");
			a22_nodes.forEach(detach);
			h35_nodes.forEach(detach);
			t82 = claim_space(section10_nodes);
			pre11 = claim_element(section10_nodes, "PRE", { class: true });
			var pre11_nodes = children(pre11);
			pre11_nodes.forEach(detach);
			section10_nodes.forEach(detach);
			t83 = claim_space(nodes);
			section11 = claim_element(nodes, "SECTION", {});
			var section11_nodes = children(section11);
			h36 = claim_element(section11_nodes, "H3", {});
			var h36_nodes = children(h36);
			a23 = claim_element(h36_nodes, "A", { href: true, id: true });
			var a23_nodes = children(a23);
			t84 = claim_text(a23_nodes, "CSSTransformValue");
			a23_nodes.forEach(detach);
			h36_nodes.forEach(detach);
			t85 = claim_space(section11_nodes);
			ul12 = claim_element(section11_nodes, "UL", {});
			var ul12_nodes = children(ul12);
			li30 = claim_element(ul12_nodes, "LI", {});
			var li30_nodes = children(li30);
			t86 = claim_text(li30_nodes, "CSSTranslate, CSSScale, CSSRotate, CSSSkew, CSSSkewX, CSSSkewY, CSSPerspective, CSSMatrixComponent");
			li30_nodes.forEach(detach);
			ul12_nodes.forEach(detach);
			t87 = claim_space(section11_nodes);
			pre12 = claim_element(section11_nodes, "PRE", { class: true });
			var pre12_nodes = children(pre12);
			pre12_nodes.forEach(detach);
			section11_nodes.forEach(detach);
			t88 = claim_space(nodes);
			section12 = claim_element(nodes, "SECTION", {});
			var section12_nodes = children(section12);
			h37 = claim_element(section12_nodes, "H3", {});
			var h37_nodes = children(h37);
			a24 = claim_element(h37_nodes, "A", { href: true, id: true });
			var a24_nodes = children(a24);
			t89 = claim_text(a24_nodes, "CSSUnparsedValue");
			a24_nodes.forEach(detach);
			h37_nodes.forEach(detach);
			t90 = claim_space(section12_nodes);
			ul13 = claim_element(section12_nodes, "UL", {});
			var ul13_nodes = children(ul13);
			li31 = claim_element(ul13_nodes, "LI", {});
			var li31_nodes = children(li31);
			t91 = claim_text(li31_nodes, "CSSCustomProperty, that is not Houdini Property");
			li31_nodes.forEach(detach);
			t92 = claim_space(ul13_nodes);
			li32 = claim_element(ul13_nodes, "LI", {});
			var li32_nodes = children(li32);
			t93 = claim_text(li32_nodes, "the value is parsed as string");
			li32_nodes.forEach(detach);
			ul13_nodes.forEach(detach);
			t94 = claim_space(section12_nodes);
			pre13 = claim_element(section12_nodes, "PRE", { class: true });
			var pre13_nodes = children(pre13);
			pre13_nodes.forEach(detach);
			section12_nodes.forEach(detach);
			t95 = claim_space(nodes);
			section13 = claim_element(nodes, "SECTION", {});
			var section13_nodes = children(section13);
			h38 = claim_element(section13_nodes, "H3", {});
			var h38_nodes = children(h38);
			a25 = claim_element(h38_nodes, "A", { href: true, id: true });
			var a25_nodes = children(a25);
			t96 = claim_text(a25_nodes, "References");
			a25_nodes.forEach(detach);
			h38_nodes.forEach(detach);
			t97 = claim_space(section13_nodes);
			ul14 = claim_element(section13_nodes, "UL", {});
			var ul14_nodes = children(ul14);
			li33 = claim_element(ul14_nodes, "LI", {});
			var li33_nodes = children(li33);
			t98 = claim_text(li33_nodes, "Specifications ");
			a26 = claim_element(li33_nodes, "A", { href: true, rel: true });
			var a26_nodes = children(a26);
			t99 = claim_text(a26_nodes, "https://www.w3.org/TR/css-typed-om-1/");
			a26_nodes.forEach(detach);
			li33_nodes.forEach(detach);
			t100 = claim_space(ul14_nodes);
			li34 = claim_element(ul14_nodes, "LI", {});
			var li34_nodes = children(li34);
			t101 = claim_text(li34_nodes, "MDN ");
			a27 = claim_element(li34_nodes, "A", { href: true, rel: true });
			var a27_nodes = children(a27);
			t102 = claim_text(a27_nodes, "https://developer.mozilla.org/en-US/docs/Web/API/CSS_Typed_OM_API");
			a27_nodes.forEach(detach);
			li34_nodes.forEach(detach);
			t103 = claim_space(ul14_nodes);
			li35 = claim_element(ul14_nodes, "LI", {});
			var li35_nodes = children(li35);
			t104 = claim_text(li35_nodes, "caniuse ");
			code3 = claim_element(li35_nodes, "CODE", {});
			var code3_nodes = children(code3);
			t105 = claim_text(code3_nodes, "attributeStyleMap");
			code3_nodes.forEach(detach);
			t106 = claim_space(li35_nodes);
			a28 = claim_element(li35_nodes, "A", { href: true, rel: true });
			var a28_nodes = children(a28);
			t107 = claim_text(a28_nodes, "https://caniuse.com/mdn-api_element_attributestylemap");
			a28_nodes.forEach(detach);
			li35_nodes.forEach(detach);
			t108 = claim_space(ul14_nodes);
			li36 = claim_element(ul14_nodes, "LI", {});
			var li36_nodes = children(li36);
			t109 = claim_text(li36_nodes, "caniuse ");
			code4 = claim_element(li36_nodes, "CODE", {});
			var code4_nodes = children(code4);
			t110 = claim_text(code4_nodes, "computedStyleMap");
			code4_nodes.forEach(detach);
			t111 = claim_space(li36_nodes);
			a29 = claim_element(li36_nodes, "A", { href: true, rel: true });
			var a29_nodes = children(a29);
			t112 = claim_text(a29_nodes, "https://caniuse.com/mdn-api_element_computedstylemap");
			a29_nodes.forEach(detach);
			li36_nodes.forEach(detach);
			ul14_nodes.forEach(detach);
			section13_nodes.forEach(detach);
			this.h();
		},
		h() {
			attr(a0, "href", "#css-typed-object-model-typed-om");
			attr(a1, "href", "#computedstylemap");
			attr(a2, "href", "#attributestylemap");
			attr(a3, "href", "#types-of-cssstylevalue");
			attr(a4, "href", "#create-cssstylevalue");
			attr(a5, "href", "#cssimagevalue");
			attr(a6, "href", "#csskeywordvalue");
			attr(a7, "href", "#cssnumericvalue");
			attr(a8, "href", "#cssmathvalue");
			attr(a9, "href", "#csspositionvalue");
			attr(a10, "href", "#csstransformvalue");
			attr(a11, "href", "#cssunparsedvalue");
			attr(a12, "href", "#references");
			attr(ul1, "class", "sitemap");
			attr(ul1, "id", "sitemap");
			attr(ul1, "role", "navigation");
			attr(ul1, "aria-label", "Table of Contents");
			attr(a13, "href", "#css-typed-object-model-typed-om");
			attr(a13, "id", "css-typed-object-model-typed-om");
			attr(pre0, "class", "language-js");
			attr(pre1, "class", "language-js");
			attr(pre2, "class", "language-js");
			attr(pre3, "class", "language-js");
			attr(a14, "href", "#computedstylemap");
			attr(a14, "id", "computedstylemap");
			attr(pre4, "class", "language-html");
			attr(a15, "href", "#attributestylemap");
			attr(a15, "id", "attributestylemap");
			attr(pre5, "class", "language-html");
			attr(pre6, "class", "language-html");
			attr(a16, "href", "#types-of-cssstylevalue");
			attr(a16, "id", "types-of-cssstylevalue");
			attr(a17, "href", "#create-cssstylevalue");
			attr(a17, "id", "create-cssstylevalue");
			attr(pre7, "class", "language-js");
			attr(a18, "href", "#cssimagevalue");
			attr(a18, "id", "cssimagevalue");
			attr(a19, "href", "#csskeywordvalue");
			attr(a19, "id", "csskeywordvalue");
			attr(pre8, "class", "language-js");
			attr(a20, "href", "#cssnumericvalue");
			attr(a20, "id", "cssnumericvalue");
			attr(pre9, "class", "language-js");
			attr(a21, "href", "#cssmathvalue");
			attr(a21, "id", "cssmathvalue");
			attr(pre10, "class", "language-js");
			attr(a22, "href", "#csspositionvalue");
			attr(a22, "id", "csspositionvalue");
			attr(pre11, "class", "language-js");
			attr(a23, "href", "#csstransformvalue");
			attr(a23, "id", "csstransformvalue");
			attr(pre12, "class", "language-js");
			attr(a24, "href", "#cssunparsedvalue");
			attr(a24, "id", "cssunparsedvalue");
			attr(pre13, "class", "language-html");
			attr(a25, "href", "#references");
			attr(a25, "id", "references");
			attr(a26, "href", "https://www.w3.org/TR/css-typed-om-1/");
			attr(a26, "rel", "nofollow");
			attr(a27, "href", "https://developer.mozilla.org/en-US/docs/Web/API/CSS_Typed_OM_API");
			attr(a27, "rel", "nofollow");
			attr(a28, "href", "https://caniuse.com/mdn-api_element_attributestylemap");
			attr(a28, "rel", "nofollow");
			attr(a29, "href", "https://caniuse.com/mdn-api_element_computedstylemap");
			attr(a29, "rel", "nofollow");
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
			append(ul1, li2);
			append(li2, a2);
			append(a2, t2);
			append(ul1, li3);
			append(li3, a3);
			append(a3, t3);
			append(ul1, ul0);
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
			append(ul0, li10);
			append(li10, a10);
			append(a10, t10);
			append(ul0, li11);
			append(li11, a11);
			append(a11, t11);
			append(ul0, li12);
			append(li12, a12);
			append(a12, t12);
			insert(target, t13, anchor);
			insert(target, section1, anchor);
			append(section1, h20);
			append(h20, a13);
			append(a13, t14);
			append(section1, t15);
			append(section1, ul2);
			append(ul2, li13);
			append(li13, t16);
			append(ul2, t17);
			append(ul2, li14);
			append(li14, t18);
			append(section1, t19);
			append(section1, pre0);
			pre0.innerHTML = raw0_value;
			append(section1, t20);
			append(section1, ul3);
			append(ul3, li15);
			append(li15, t21);
			append(section1, t22);
			append(section1, pre1);
			pre1.innerHTML = raw1_value;
			append(section1, t23);
			append(section1, ul4);
			append(ul4, li16);
			append(li16, t24);
			append(section1, t25);
			append(section1, pre2);
			pre2.innerHTML = raw2_value;
			append(section1, t26);
			append(section1, ul5);
			append(ul5, li17);
			append(li17, t27);
			append(ul5, t28);
			append(ul5, li18);
			append(li18, t29);
			append(section1, t30);
			append(section1, pre3);
			pre3.innerHTML = raw3_value;
			insert(target, t31, anchor);
			insert(target, section2, anchor);
			append(section2, h21);
			append(h21, a14);
			append(a14, t32);
			append(section2, t33);
			append(section2, pre4);
			pre4.innerHTML = raw4_value;
			insert(target, t34, anchor);
			insert(target, section3, anchor);
			append(section3, h22);
			append(h22, a15);
			append(a15, t35);
			append(section3, t36);
			append(section3, ul6);
			append(ul6, li19);
			append(li19, t37);
			append(section3, t38);
			append(section3, pre5);
			pre5.innerHTML = raw5_value;
			append(section3, t39);
			append(section3, pre6);
			pre6.innerHTML = raw6_value;
			insert(target, t40, anchor);
			insert(target, section4, anchor);
			append(section4, h23);
			append(h23, a16);
			append(a16, t41);
			append(section4, t42);
			append(section4, ul7);
			append(ul7, li20);
			append(li20, t43);
			append(ul7, t44);
			append(ul7, li21);
			append(li21, t45);
			append(ul7, t46);
			append(ul7, li22);
			append(li22, t47);
			append(ul7, t48);
			append(ul7, li23);
			append(li23, t49);
			append(ul7, t50);
			append(ul7, li24);
			append(li24, t51);
			append(ul7, t52);
			append(ul7, li25);
			append(li25, t53);
			insert(target, t54, anchor);
			insert(target, section5, anchor);
			append(section5, h30);
			append(h30, a17);
			append(a17, t55);
			append(section5, t56);
			append(section5, pre7);
			pre7.innerHTML = raw7_value;
			insert(target, t57, anchor);
			insert(target, section6, anchor);
			append(section6, h31);
			append(h31, a18);
			append(a18, t58);
			append(section6, t59);
			append(section6, ul8);
			append(ul8, li26);
			append(li26, t60);
			append(li26, code0);
			append(code0, t61);
			insert(target, t62, anchor);
			insert(target, section7, anchor);
			append(section7, h32);
			append(h32, a19);
			append(a19, t63);
			append(section7, t64);
			append(section7, ul9);
			append(ul9, li27);
			append(li27, code1);
			append(code1, t65);
			append(li27, t66);
			append(li27, code2);
			append(code2, t67);
			append(li27, t68);
			append(section7, t69);
			append(section7, pre8);
			pre8.innerHTML = raw8_value;
			insert(target, t70, anchor);
			insert(target, section8, anchor);
			append(section8, h33);
			append(h33, a20);
			append(a20, t71);
			append(section8, t72);
			append(section8, ul10);
			append(ul10, li28);
			append(li28, t73);
			append(section8, t74);
			append(section8, pre9);
			pre9.innerHTML = raw9_value;
			insert(target, t75, anchor);
			insert(target, section9, anchor);
			append(section9, h34);
			append(h34, a21);
			append(a21, t76);
			append(section9, t77);
			append(section9, ul11);
			append(ul11, li29);
			append(li29, t78);
			append(section9, t79);
			append(section9, pre10);
			pre10.innerHTML = raw10_value;
			insert(target, t80, anchor);
			insert(target, section10, anchor);
			append(section10, h35);
			append(h35, a22);
			append(a22, t81);
			append(section10, t82);
			append(section10, pre11);
			pre11.innerHTML = raw11_value;
			insert(target, t83, anchor);
			insert(target, section11, anchor);
			append(section11, h36);
			append(h36, a23);
			append(a23, t84);
			append(section11, t85);
			append(section11, ul12);
			append(ul12, li30);
			append(li30, t86);
			append(section11, t87);
			append(section11, pre12);
			pre12.innerHTML = raw12_value;
			insert(target, t88, anchor);
			insert(target, section12, anchor);
			append(section12, h37);
			append(h37, a24);
			append(a24, t89);
			append(section12, t90);
			append(section12, ul13);
			append(ul13, li31);
			append(li31, t91);
			append(ul13, t92);
			append(ul13, li32);
			append(li32, t93);
			append(section12, t94);
			append(section12, pre13);
			pre13.innerHTML = raw13_value;
			insert(target, t95, anchor);
			insert(target, section13, anchor);
			append(section13, h38);
			append(h38, a25);
			append(a25, t96);
			append(section13, t97);
			append(section13, ul14);
			append(ul14, li33);
			append(li33, t98);
			append(li33, a26);
			append(a26, t99);
			append(ul14, t100);
			append(ul14, li34);
			append(li34, t101);
			append(li34, a27);
			append(a27, t102);
			append(ul14, t103);
			append(ul14, li35);
			append(li35, t104);
			append(li35, code3);
			append(code3, t105);
			append(li35, t106);
			append(li35, a28);
			append(a28, t107);
			append(ul14, t108);
			append(ul14, li36);
			append(li36, t109);
			append(li36, code4);
			append(code4, t110);
			append(li36, t111);
			append(li36, a29);
			append(a29, t112);
		},
		p: noop,
		d(detaching) {
			if (detaching) detach(section0);
			if (detaching) detach(t13);
			if (detaching) detach(section1);
			if (detaching) detach(t31);
			if (detaching) detach(section2);
			if (detaching) detach(t34);
			if (detaching) detach(section3);
			if (detaching) detach(t40);
			if (detaching) detach(section4);
			if (detaching) detach(t54);
			if (detaching) detach(section5);
			if (detaching) detach(t57);
			if (detaching) detach(section6);
			if (detaching) detach(t62);
			if (detaching) detach(section7);
			if (detaching) detach(t70);
			if (detaching) detach(section8);
			if (detaching) detach(t75);
			if (detaching) detach(section9);
			if (detaching) detach(t80);
			if (detaching) detach(section10);
			if (detaching) detach(t83);
			if (detaching) detach(section11);
			if (detaching) detach(t88);
			if (detaching) detach(section12);
			if (detaching) detach(t95);
			if (detaching) detach(section13);
		}
	};
}

function create_fragment$2(ctx) {
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

	layout_mdsvex_default = new Note({ props: layout_mdsvex_default_props });

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
	"title": "The CSS Podcast: 027: Houdini Series: Typed Object Model",
	"tags": ["css houdini", "The CSS Podcast"],
	"slug": "notes/css-podcast-027-houdini-series-typed-om",
	"type": "notes",
	"name": "css-podcast-027-houdini-series-typed-om",
	"layout": "note"
};

class Page_markup extends SvelteComponent {
	constructor(options) {
		super();
		init(this, options, null, create_fragment$2, safe_not_equal, {});
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
