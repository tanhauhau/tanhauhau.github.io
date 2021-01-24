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

var baseCss = "https://lihautan.com/notes/css-podcast-026-houdini-series-properties-values/assets/blog-base-248115e4.css";

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
			attr(meta8, "content", "https%3A%2F%2Flihautan.com%2Fnotes%2Fcss-podcast-026-houdini-series-properties-values");
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
	let t7;
	let section1;
	let h20;
	let a7;
	let t8;
	let t9;
	let ul2;
	let li7;
	let t10;
	let t11;
	let li8;
	let t12;
	let t13;
	let li9;
	let t14;
	let t15;
	let li10;
	let t16;
	let t17;
	let li11;
	let t18;
	let t19;
	let li12;
	let t20;
	let t21;
	let li13;
	let t22;
	let t23;
	let li14;
	let t24;
	let t25;
	let section2;
	let h21;
	let a8;
	let t26;
	let t27;
	let ul3;
	let li15;
	let t28;
	let t29;
	let li16;
	let t30;
	let t31;
	let li17;
	let t32;
	let t33;
	let li18;
	let t34;
	let t35;
	let li19;
	let t36;
	let t37;
	let li20;
	let t38;
	let t39;
	let li21;
	let t40;
	let t41;
	let section3;
	let h22;
	let a9;
	let t42;
	let t43;
	let ul4;
	let li22;
	let code0;
	let t44;
	let t45;
	let t46;
	let li23;
	let code1;
	let t47;
	let t48;
	let t49;
	let pre0;

	let raw0_value = `<code class="language-js"><span class="token constant">CSS</span><span class="token punctuation">.</span><span class="token function">registerProperty</span><span class="token punctuation">(</span><span class="token punctuation">&#123;</span>
  name<span class="token punctuation">:</span> <span class="token string">'--colorPrimary'</span><span class="token punctuation">,</span>  <span class="token comment">// start with &#96;--&#96;</span>
  syntax<span class="token punctuation">:</span> <span class="token string">'&lt;color>'</span><span class="token punctuation">,</span>       <span class="token comment">// syntax value</span>
  initialValue<span class="token punctuation">:</span> <span class="token string">'magenta'</span><span class="token punctuation">,</span> <span class="token comment">// initial value if not defined</span>
  inherits<span class="token punctuation">:</span> <span class="token boolean">false</span><span class="token punctuation">,</span>         <span class="token comment">// inherit from parent</span>
<span class="token punctuation">&#125;</span><span class="token punctuation">)</span><span class="token punctuation">;</span></code>` + "";

	let t50;
	let pre1;

	let raw1_value = `<code class="language-css"><span class="token comment">/* Included in Chromium 85 */</span>
<span class="token atrule"><span class="token rule">@property</span> --colorPrimary</span> <span class="token punctuation">&#123;</span>
  <span class="token property">syntax</span><span class="token punctuation">:</span> <span class="token string">'&lt;color>'</span><span class="token punctuation">;</span>      <span class="token comment">/* syntax value */</span>
  <span class="token property">initial-value</span><span class="token punctuation">:</span> magenta<span class="token punctuation">;</span> <span class="token comment">/* does not need to be a string */</span>
  <span class="token property">inherits</span><span class="token punctuation">:</span> false<span class="token punctuation">;</span>        <span class="token comment">/* inherit from parent */</span>
<span class="token punctuation">&#125;</span></code>` + "";

	let t51;
	let ul5;
	let li24;
	let t52;
	let code2;
	let t53;
	let t54;
	let t55;
	let li25;
	let t56;
	let t57;
	let li26;
	let t58;
	let t59;
	let section4;
	let h23;
	let a10;
	let t60;
	let t61;
	let ul13;
	let li27;
	let t62;
	let a11;
	let t63;
	let t64;
	let li28;
	let a12;
	let code3;
	let t65;
	let t66;
	let t67;
	let li30;
	let a13;
	let code4;
	let t68;
	let t69;
	let ul6;
	let li29;
	let t70;
	let t71;
	let li33;
	let a14;
	let code5;
	let t72;
	let ul7;
	let li31;
	let t73;
	let t74;
	let li32;
	let t75;
	let code6;
	let t76;
	let t77;
	let code7;
	let t78;
	let t79;
	let li35;
	let a15;
	let code8;
	let t80;
	let t81;
	let ul8;
	let li34;
	let t82;
	let t83;
	let li37;
	let a16;
	let code9;
	let t84;
	let t85;
	let ul9;
	let li36;
	let t86;
	let t87;
	let li39;
	let a17;
	let code10;
	let t88;
	let t89;
	let ul10;
	let li38;
	let t90;
	let t91;
	let li41;
	let a18;
	let code11;
	let t92;
	let t93;
	let ul11;
	let li40;
	let t94;
	let t95;
	let li42;
	let a19;
	let code12;
	let t96;
	let t97;
	let li43;
	let code13;
	let t98;
	let t99;
	let li44;
	let a20;
	let code14;
	let t100;
	let t101;
	let t102;
	let li46;
	let a21;
	let code15;
	let t103;
	let ul12;
	let li45;
	let t104;
	let t105;
	let section5;
	let h30;
	let a22;
	let t106;
	let t107;
	let p0;
	let a23;
	let t108;
	let t109;
	let ul14;
	let li47;
	let code16;
	let t110;
	let t111;
	let code17;
	let t112;
	let t113;
	let li48;
	let code18;
	let t114;
	let t115;
	let code19;
	let t116;
	let t117;
	let section6;
	let h31;
	let a24;
	let t118;
	let t119;
	let p1;
	let a25;
	let t120;
	let t121;
	let ul15;
	let li49;
	let code20;
	let t122;
	let t123;
	let code21;
	let t124;
	let t125;
	let t126;
	let section7;
	let h24;
	let a26;
	let t127;
	let t128;
	let ul16;
	let li50;
	let a27;
	let t129;
	let t130;
	let li51;
	let a28;
	let t131;
	let t132;
	let li52;
	let a29;
	let t133;

	return {
		c() {
			section0 = element("section");
			ul1 = element("ul");
			li0 = element("li");
			a0 = element("a");
			t0 = text("CSS Houdini");
			li1 = element("li");
			a1 = element("a");
			t1 = text("Properties and Values API");
			li2 = element("li");
			a2 = element("a");
			t2 = text("2 ways to register houdini custom properties");
			li3 = element("li");
			a3 = element("a");
			t3 = text("Syntax");
			ul0 = element("ul");
			li4 = element("li");
			a4 = element("a");
			t4 = text("Multipliers");
			li5 = element("li");
			a5 = element("a");
			t5 = text("Combinators");
			li6 = element("li");
			a6 = element("a");
			t6 = text("References");
			t7 = space();
			section1 = element("section");
			h20 = element("h2");
			a7 = element("a");
			t8 = text("CSS Houdini");
			t9 = space();
			ul2 = element("ul");
			li7 = element("li");
			t10 = text("Umbrella term that covers a set of low-level APIs that exposes parts of the CSS rendering engine");
			t11 = space();
			li8 = element("li");
			t12 = text("Give developers access to CSS Object Model.");
			t13 = space();
			li9 = element("li");
			t14 = text("Enable developers to extends CSS by hooking into the styling and layout processes");
			t15 = space();
			li10 = element("li");
			t16 = text("No need to wait for browsers to implement CSS primitives");
			t17 = space();
			li11 = element("li");
			t18 = text("Write your own painting and layout algorithm using worklet");
			t19 = space();
			li12 = element("li");
			t20 = text("Write less JS dependencies and polyfills, allow users write true CSS polyfills that browser can better understand");
			t21 = space();
			li13 = element("li");
			t22 = text("Allow more semantic CSS, allow performance optimisations in how the browser actually reads and parses CSS");
			t23 = space();
			li14 = element("li");
			t24 = text("Allow typechecking CSS");
			t25 = space();
			section2 = element("section");
			h21 = element("h2");
			a8 = element("a");
			t26 = text("Properties and Values API");
			t27 = space();
			ul3 = element("ul");
			li15 = element("li");
			t28 = text("create rich and typed property");
			t29 = space();
			li16 = element("li");
			t30 = text("error free, error gracefully, fallback to initial value");
			t31 = space();
			li17 = element("li");
			t32 = text("provide semantic meaning to the variable");
			t33 = space();
			li18 = element("li");
			t34 = text("custom property values are no longer a string");
			t35 = space();
			li19 = element("li");
			t36 = text("allow you to interpolate the value as you transition from 1 value to another");
			t37 = space();
			li20 = element("li");
			t38 = text("be known and passed to the function as accepted and identified parameter");
			t39 = space();
			li21 = element("li");
			t40 = text("cascade still applies");
			t41 = space();
			section3 = element("section");
			h22 = element("h2");
			a9 = element("a");
			t42 = text("2 ways to register houdini custom properties");
			t43 = space();
			ul4 = element("ul");
			li22 = element("li");
			code0 = element("code");
			t44 = text("CSS.registerProperty");
			t45 = text(" in JS");
			t46 = space();
			li23 = element("li");
			code1 = element("code");
			t47 = text("@property");
			t48 = text(" in CSS");
			t49 = space();
			pre0 = element("pre");
			t50 = space();
			pre1 = element("pre");
			t51 = space();
			ul5 = element("ul");
			li24 = element("li");
			t52 = text("enforces it the ");
			code2 = element("code");
			t53 = text("--colorPrimary");
			t54 = text(" to be a value of color");
			t55 = space();
			li25 = element("li");
			t56 = text("if it is not a color, will error gracefully by fallback to its initial value");
			t57 = space();
			li26 = element("li");
			t58 = text("trying to see the console, but haven't see it in the console yet");
			t59 = space();
			section4 = element("section");
			h23 = element("h2");
			a10 = element("a");
			t60 = text("Syntax");
			t61 = space();
			ul13 = element("ul");
			li27 = element("li");
			t62 = text("CSS definition syntax ");
			a11 = element("a");
			t63 = text("https://web.dev/at-property/#syntax");
			t64 = space();
			li28 = element("li");
			a12 = element("a");
			code3 = element("code");
			t65 = text("<length>");
			t66 = text(", eg: 1px, 2rem, 3vw");
			t67 = space();
			li30 = element("li");
			a13 = element("a");
			code4 = element("code");
			t68 = text("<percentage>");
			t69 = text(", eg: 4%");
			ul6 = element("ul");
			li29 = element("li");
			t70 = text("in linear-gradient");
			t71 = space();
			li33 = element("li");
			a14 = element("a");
			code5 = element("code");
			t72 = text("<length-percentage>");
			ul7 = element("ul");
			li31 = element("li");
			t73 = text("superset of length + percentage");
			t74 = space();
			li32 = element("li");
			t75 = text("you can use ");
			code6 = element("code");
			t76 = text("calc()");
			t77 = text(" of mixing percentage and length, eg: ");
			code7 = element("code");
			t78 = text("calc(100% - 35px)");
			t79 = space();
			li35 = element("li");
			a15 = element("a");
			code8 = element("code");
			t80 = text("<angle>");
			t81 = text(", eg: 1deg");
			ul8 = element("ul");
			li34 = element("li");
			t82 = text("in hsl, conic-gradient");
			t83 = space();
			li37 = element("li");
			a16 = element("a");
			code9 = element("code");
			t84 = text("<time>");
			t85 = text(", eg: 1s");
			ul9 = element("ul");
			li36 = element("li");
			t86 = text("in animation, transition");
			t87 = space();
			li39 = element("li");
			a17 = element("a");
			code10 = element("code");
			t88 = text("<resolution>");
			t89 = text(" , eg: 300dpi");
			ul10 = element("ul");
			li38 = element("li");
			t90 = text("in media query");
			t91 = space();
			li41 = element("li");
			a18 = element("a");
			code11 = element("code");
			t92 = text("<integer>");
			t93 = text(", positive / negative whole number");
			ul11 = element("ul");
			li40 = element("li");
			t94 = text("in z-index, grid-row");
			t95 = space();
			li42 = element("li");
			a19 = element("a");
			code12 = element("code");
			t96 = text("<number>");
			t97 = space();
			li43 = element("li");
			code13 = element("code");
			t98 = text("<color>");
			t99 = space();
			li44 = element("li");
			a20 = element("a");
			code14 = element("code");
			t100 = text("<transform-function>");
			t101 = text(", 2d / 3d transform function");
			t102 = space();
			li46 = element("li");
			a21 = element("a");
			code15 = element("code");
			t103 = text("<custom-ident>");
			ul12 = element("ul");
			li45 = element("li");
			t104 = text("eg: animation-name");
			t105 = space();
			section5 = element("section");
			h30 = element("h3");
			a22 = element("a");
			t106 = text("Multipliers");
			t107 = space();
			p0 = element("p");
			a23 = element("a");
			t108 = text("Component value multipliers");
			t109 = space();
			ul14 = element("ul");
			li47 = element("li");
			code16 = element("code");
			t110 = text("<length>+");
			t111 = text(", length can appear one or more times, eg: ");
			code17 = element("code");
			t112 = text("\"1px 2px 3px\"");
			t113 = space();
			li48 = element("li");
			code18 = element("code");
			t114 = text("<length>#");
			t115 = text(", length appear one or more times with comma separated, eg: ");
			code19 = element("code");
			t116 = text("\"1px, 2px 3px\"");
			t117 = space();
			section6 = element("section");
			h31 = element("h3");
			a24 = element("a");
			t118 = text("Combinators");
			t119 = space();
			p1 = element("p");
			a25 = element("a");
			t120 = text("Component value combinators");
			t121 = space();
			ul15 = element("ul");
			li49 = element("li");
			code20 = element("code");
			t122 = text("|");
			t123 = text(", eg: ");
			code21 = element("code");
			t124 = text("<percentage> | <length>");
			t125 = text(", must be either percentage or length, and appear only once");
			t126 = space();
			section7 = element("section");
			h24 = element("h2");
			a26 = element("a");
			t127 = text("References");
			t128 = space();
			ul16 = element("ul");
			li50 = element("li");
			a27 = element("a");
			t129 = text("https://developer.mozilla.org/en-US/docs/Web/CSS/Value_definition_syntax");
			t130 = space();
			li51 = element("li");
			a28 = element("a");
			t131 = text("https://heyjiawei.com/how-to-read-css-specification-syntax");
			t132 = space();
			li52 = element("li");
			a29 = element("a");
			t133 = text("https://web.dev/at-property");
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
			t0 = claim_text(a0_nodes, "CSS Houdini");
			a0_nodes.forEach(detach);
			li0_nodes.forEach(detach);
			li1 = claim_element(ul1_nodes, "LI", {});
			var li1_nodes = children(li1);
			a1 = claim_element(li1_nodes, "A", { href: true });
			var a1_nodes = children(a1);
			t1 = claim_text(a1_nodes, "Properties and Values API");
			a1_nodes.forEach(detach);
			li1_nodes.forEach(detach);
			li2 = claim_element(ul1_nodes, "LI", {});
			var li2_nodes = children(li2);
			a2 = claim_element(li2_nodes, "A", { href: true });
			var a2_nodes = children(a2);
			t2 = claim_text(a2_nodes, "2 ways to register houdini custom properties");
			a2_nodes.forEach(detach);
			li2_nodes.forEach(detach);
			li3 = claim_element(ul1_nodes, "LI", {});
			var li3_nodes = children(li3);
			a3 = claim_element(li3_nodes, "A", { href: true });
			var a3_nodes = children(a3);
			t3 = claim_text(a3_nodes, "Syntax");
			a3_nodes.forEach(detach);
			li3_nodes.forEach(detach);
			ul0 = claim_element(ul1_nodes, "UL", {});
			var ul0_nodes = children(ul0);
			li4 = claim_element(ul0_nodes, "LI", {});
			var li4_nodes = children(li4);
			a4 = claim_element(li4_nodes, "A", { href: true });
			var a4_nodes = children(a4);
			t4 = claim_text(a4_nodes, "Multipliers");
			a4_nodes.forEach(detach);
			li4_nodes.forEach(detach);
			li5 = claim_element(ul0_nodes, "LI", {});
			var li5_nodes = children(li5);
			a5 = claim_element(li5_nodes, "A", { href: true });
			var a5_nodes = children(a5);
			t5 = claim_text(a5_nodes, "Combinators");
			a5_nodes.forEach(detach);
			li5_nodes.forEach(detach);
			ul0_nodes.forEach(detach);
			li6 = claim_element(ul1_nodes, "LI", {});
			var li6_nodes = children(li6);
			a6 = claim_element(li6_nodes, "A", { href: true });
			var a6_nodes = children(a6);
			t6 = claim_text(a6_nodes, "References");
			a6_nodes.forEach(detach);
			li6_nodes.forEach(detach);
			ul1_nodes.forEach(detach);
			section0_nodes.forEach(detach);
			t7 = claim_space(nodes);
			section1 = claim_element(nodes, "SECTION", {});
			var section1_nodes = children(section1);
			h20 = claim_element(section1_nodes, "H2", {});
			var h20_nodes = children(h20);
			a7 = claim_element(h20_nodes, "A", { href: true, id: true });
			var a7_nodes = children(a7);
			t8 = claim_text(a7_nodes, "CSS Houdini");
			a7_nodes.forEach(detach);
			h20_nodes.forEach(detach);
			t9 = claim_space(section1_nodes);
			ul2 = claim_element(section1_nodes, "UL", {});
			var ul2_nodes = children(ul2);
			li7 = claim_element(ul2_nodes, "LI", {});
			var li7_nodes = children(li7);
			t10 = claim_text(li7_nodes, "Umbrella term that covers a set of low-level APIs that exposes parts of the CSS rendering engine");
			li7_nodes.forEach(detach);
			t11 = claim_space(ul2_nodes);
			li8 = claim_element(ul2_nodes, "LI", {});
			var li8_nodes = children(li8);
			t12 = claim_text(li8_nodes, "Give developers access to CSS Object Model.");
			li8_nodes.forEach(detach);
			t13 = claim_space(ul2_nodes);
			li9 = claim_element(ul2_nodes, "LI", {});
			var li9_nodes = children(li9);
			t14 = claim_text(li9_nodes, "Enable developers to extends CSS by hooking into the styling and layout processes");
			li9_nodes.forEach(detach);
			t15 = claim_space(ul2_nodes);
			li10 = claim_element(ul2_nodes, "LI", {});
			var li10_nodes = children(li10);
			t16 = claim_text(li10_nodes, "No need to wait for browsers to implement CSS primitives");
			li10_nodes.forEach(detach);
			t17 = claim_space(ul2_nodes);
			li11 = claim_element(ul2_nodes, "LI", {});
			var li11_nodes = children(li11);
			t18 = claim_text(li11_nodes, "Write your own painting and layout algorithm using worklet");
			li11_nodes.forEach(detach);
			t19 = claim_space(ul2_nodes);
			li12 = claim_element(ul2_nodes, "LI", {});
			var li12_nodes = children(li12);
			t20 = claim_text(li12_nodes, "Write less JS dependencies and polyfills, allow users write true CSS polyfills that browser can better understand");
			li12_nodes.forEach(detach);
			t21 = claim_space(ul2_nodes);
			li13 = claim_element(ul2_nodes, "LI", {});
			var li13_nodes = children(li13);
			t22 = claim_text(li13_nodes, "Allow more semantic CSS, allow performance optimisations in how the browser actually reads and parses CSS");
			li13_nodes.forEach(detach);
			t23 = claim_space(ul2_nodes);
			li14 = claim_element(ul2_nodes, "LI", {});
			var li14_nodes = children(li14);
			t24 = claim_text(li14_nodes, "Allow typechecking CSS");
			li14_nodes.forEach(detach);
			ul2_nodes.forEach(detach);
			section1_nodes.forEach(detach);
			t25 = claim_space(nodes);
			section2 = claim_element(nodes, "SECTION", {});
			var section2_nodes = children(section2);
			h21 = claim_element(section2_nodes, "H2", {});
			var h21_nodes = children(h21);
			a8 = claim_element(h21_nodes, "A", { href: true, id: true });
			var a8_nodes = children(a8);
			t26 = claim_text(a8_nodes, "Properties and Values API");
			a8_nodes.forEach(detach);
			h21_nodes.forEach(detach);
			t27 = claim_space(section2_nodes);
			ul3 = claim_element(section2_nodes, "UL", {});
			var ul3_nodes = children(ul3);
			li15 = claim_element(ul3_nodes, "LI", {});
			var li15_nodes = children(li15);
			t28 = claim_text(li15_nodes, "create rich and typed property");
			li15_nodes.forEach(detach);
			t29 = claim_space(ul3_nodes);
			li16 = claim_element(ul3_nodes, "LI", {});
			var li16_nodes = children(li16);
			t30 = claim_text(li16_nodes, "error free, error gracefully, fallback to initial value");
			li16_nodes.forEach(detach);
			t31 = claim_space(ul3_nodes);
			li17 = claim_element(ul3_nodes, "LI", {});
			var li17_nodes = children(li17);
			t32 = claim_text(li17_nodes, "provide semantic meaning to the variable");
			li17_nodes.forEach(detach);
			t33 = claim_space(ul3_nodes);
			li18 = claim_element(ul3_nodes, "LI", {});
			var li18_nodes = children(li18);
			t34 = claim_text(li18_nodes, "custom property values are no longer a string");
			li18_nodes.forEach(detach);
			t35 = claim_space(ul3_nodes);
			li19 = claim_element(ul3_nodes, "LI", {});
			var li19_nodes = children(li19);
			t36 = claim_text(li19_nodes, "allow you to interpolate the value as you transition from 1 value to another");
			li19_nodes.forEach(detach);
			t37 = claim_space(ul3_nodes);
			li20 = claim_element(ul3_nodes, "LI", {});
			var li20_nodes = children(li20);
			t38 = claim_text(li20_nodes, "be known and passed to the function as accepted and identified parameter");
			li20_nodes.forEach(detach);
			t39 = claim_space(ul3_nodes);
			li21 = claim_element(ul3_nodes, "LI", {});
			var li21_nodes = children(li21);
			t40 = claim_text(li21_nodes, "cascade still applies");
			li21_nodes.forEach(detach);
			ul3_nodes.forEach(detach);
			section2_nodes.forEach(detach);
			t41 = claim_space(nodes);
			section3 = claim_element(nodes, "SECTION", {});
			var section3_nodes = children(section3);
			h22 = claim_element(section3_nodes, "H2", {});
			var h22_nodes = children(h22);
			a9 = claim_element(h22_nodes, "A", { href: true, id: true });
			var a9_nodes = children(a9);
			t42 = claim_text(a9_nodes, "2 ways to register houdini custom properties");
			a9_nodes.forEach(detach);
			h22_nodes.forEach(detach);
			t43 = claim_space(section3_nodes);
			ul4 = claim_element(section3_nodes, "UL", {});
			var ul4_nodes = children(ul4);
			li22 = claim_element(ul4_nodes, "LI", {});
			var li22_nodes = children(li22);
			code0 = claim_element(li22_nodes, "CODE", {});
			var code0_nodes = children(code0);
			t44 = claim_text(code0_nodes, "CSS.registerProperty");
			code0_nodes.forEach(detach);
			t45 = claim_text(li22_nodes, " in JS");
			li22_nodes.forEach(detach);
			t46 = claim_space(ul4_nodes);
			li23 = claim_element(ul4_nodes, "LI", {});
			var li23_nodes = children(li23);
			code1 = claim_element(li23_nodes, "CODE", {});
			var code1_nodes = children(code1);
			t47 = claim_text(code1_nodes, "@property");
			code1_nodes.forEach(detach);
			t48 = claim_text(li23_nodes, " in CSS");
			li23_nodes.forEach(detach);
			ul4_nodes.forEach(detach);
			t49 = claim_space(section3_nodes);
			pre0 = claim_element(section3_nodes, "PRE", { class: true });
			var pre0_nodes = children(pre0);
			pre0_nodes.forEach(detach);
			t50 = claim_space(section3_nodes);
			pre1 = claim_element(section3_nodes, "PRE", { class: true });
			var pre1_nodes = children(pre1);
			pre1_nodes.forEach(detach);
			t51 = claim_space(section3_nodes);
			ul5 = claim_element(section3_nodes, "UL", {});
			var ul5_nodes = children(ul5);
			li24 = claim_element(ul5_nodes, "LI", {});
			var li24_nodes = children(li24);
			t52 = claim_text(li24_nodes, "enforces it the ");
			code2 = claim_element(li24_nodes, "CODE", {});
			var code2_nodes = children(code2);
			t53 = claim_text(code2_nodes, "--colorPrimary");
			code2_nodes.forEach(detach);
			t54 = claim_text(li24_nodes, " to be a value of color");
			li24_nodes.forEach(detach);
			t55 = claim_space(ul5_nodes);
			li25 = claim_element(ul5_nodes, "LI", {});
			var li25_nodes = children(li25);
			t56 = claim_text(li25_nodes, "if it is not a color, will error gracefully by fallback to its initial value");
			li25_nodes.forEach(detach);
			t57 = claim_space(ul5_nodes);
			li26 = claim_element(ul5_nodes, "LI", {});
			var li26_nodes = children(li26);
			t58 = claim_text(li26_nodes, "trying to see the console, but haven't see it in the console yet");
			li26_nodes.forEach(detach);
			ul5_nodes.forEach(detach);
			section3_nodes.forEach(detach);
			t59 = claim_space(nodes);
			section4 = claim_element(nodes, "SECTION", {});
			var section4_nodes = children(section4);
			h23 = claim_element(section4_nodes, "H2", {});
			var h23_nodes = children(h23);
			a10 = claim_element(h23_nodes, "A", { href: true, id: true });
			var a10_nodes = children(a10);
			t60 = claim_text(a10_nodes, "Syntax");
			a10_nodes.forEach(detach);
			h23_nodes.forEach(detach);
			t61 = claim_space(section4_nodes);
			ul13 = claim_element(section4_nodes, "UL", {});
			var ul13_nodes = children(ul13);
			li27 = claim_element(ul13_nodes, "LI", {});
			var li27_nodes = children(li27);
			t62 = claim_text(li27_nodes, "CSS definition syntax ");
			a11 = claim_element(li27_nodes, "A", { href: true, rel: true });
			var a11_nodes = children(a11);
			t63 = claim_text(a11_nodes, "https://web.dev/at-property/#syntax");
			a11_nodes.forEach(detach);
			li27_nodes.forEach(detach);
			t64 = claim_space(ul13_nodes);
			li28 = claim_element(ul13_nodes, "LI", {});
			var li28_nodes = children(li28);
			a12 = claim_element(li28_nodes, "A", { href: true, rel: true });
			var a12_nodes = children(a12);
			code3 = claim_element(a12_nodes, "CODE", {});
			var code3_nodes = children(code3);
			t65 = claim_text(code3_nodes, "<length>");
			code3_nodes.forEach(detach);
			a12_nodes.forEach(detach);
			t66 = claim_text(li28_nodes, ", eg: 1px, 2rem, 3vw");
			li28_nodes.forEach(detach);
			t67 = claim_space(ul13_nodes);
			li30 = claim_element(ul13_nodes, "LI", {});
			var li30_nodes = children(li30);
			a13 = claim_element(li30_nodes, "A", { href: true, rel: true });
			var a13_nodes = children(a13);
			code4 = claim_element(a13_nodes, "CODE", {});
			var code4_nodes = children(code4);
			t68 = claim_text(code4_nodes, "<percentage>");
			code4_nodes.forEach(detach);
			a13_nodes.forEach(detach);
			t69 = claim_text(li30_nodes, ", eg: 4%");
			ul6 = claim_element(li30_nodes, "UL", {});
			var ul6_nodes = children(ul6);
			li29 = claim_element(ul6_nodes, "LI", {});
			var li29_nodes = children(li29);
			t70 = claim_text(li29_nodes, "in linear-gradient");
			li29_nodes.forEach(detach);
			ul6_nodes.forEach(detach);
			li30_nodes.forEach(detach);
			t71 = claim_space(ul13_nodes);
			li33 = claim_element(ul13_nodes, "LI", {});
			var li33_nodes = children(li33);
			a14 = claim_element(li33_nodes, "A", { href: true, rel: true });
			var a14_nodes = children(a14);
			code5 = claim_element(a14_nodes, "CODE", {});
			var code5_nodes = children(code5);
			t72 = claim_text(code5_nodes, "<length-percentage>");
			code5_nodes.forEach(detach);
			a14_nodes.forEach(detach);
			ul7 = claim_element(li33_nodes, "UL", {});
			var ul7_nodes = children(ul7);
			li31 = claim_element(ul7_nodes, "LI", {});
			var li31_nodes = children(li31);
			t73 = claim_text(li31_nodes, "superset of length + percentage");
			li31_nodes.forEach(detach);
			t74 = claim_space(ul7_nodes);
			li32 = claim_element(ul7_nodes, "LI", {});
			var li32_nodes = children(li32);
			t75 = claim_text(li32_nodes, "you can use ");
			code6 = claim_element(li32_nodes, "CODE", {});
			var code6_nodes = children(code6);
			t76 = claim_text(code6_nodes, "calc()");
			code6_nodes.forEach(detach);
			t77 = claim_text(li32_nodes, " of mixing percentage and length, eg: ");
			code7 = claim_element(li32_nodes, "CODE", {});
			var code7_nodes = children(code7);
			t78 = claim_text(code7_nodes, "calc(100% - 35px)");
			code7_nodes.forEach(detach);
			li32_nodes.forEach(detach);
			ul7_nodes.forEach(detach);
			li33_nodes.forEach(detach);
			t79 = claim_space(ul13_nodes);
			li35 = claim_element(ul13_nodes, "LI", {});
			var li35_nodes = children(li35);
			a15 = claim_element(li35_nodes, "A", { href: true, rel: true });
			var a15_nodes = children(a15);
			code8 = claim_element(a15_nodes, "CODE", {});
			var code8_nodes = children(code8);
			t80 = claim_text(code8_nodes, "<angle>");
			code8_nodes.forEach(detach);
			a15_nodes.forEach(detach);
			t81 = claim_text(li35_nodes, ", eg: 1deg");
			ul8 = claim_element(li35_nodes, "UL", {});
			var ul8_nodes = children(ul8);
			li34 = claim_element(ul8_nodes, "LI", {});
			var li34_nodes = children(li34);
			t82 = claim_text(li34_nodes, "in hsl, conic-gradient");
			li34_nodes.forEach(detach);
			ul8_nodes.forEach(detach);
			li35_nodes.forEach(detach);
			t83 = claim_space(ul13_nodes);
			li37 = claim_element(ul13_nodes, "LI", {});
			var li37_nodes = children(li37);
			a16 = claim_element(li37_nodes, "A", { href: true, rel: true });
			var a16_nodes = children(a16);
			code9 = claim_element(a16_nodes, "CODE", {});
			var code9_nodes = children(code9);
			t84 = claim_text(code9_nodes, "<time>");
			code9_nodes.forEach(detach);
			a16_nodes.forEach(detach);
			t85 = claim_text(li37_nodes, ", eg: 1s");
			ul9 = claim_element(li37_nodes, "UL", {});
			var ul9_nodes = children(ul9);
			li36 = claim_element(ul9_nodes, "LI", {});
			var li36_nodes = children(li36);
			t86 = claim_text(li36_nodes, "in animation, transition");
			li36_nodes.forEach(detach);
			ul9_nodes.forEach(detach);
			li37_nodes.forEach(detach);
			t87 = claim_space(ul13_nodes);
			li39 = claim_element(ul13_nodes, "LI", {});
			var li39_nodes = children(li39);
			a17 = claim_element(li39_nodes, "A", { href: true, rel: true });
			var a17_nodes = children(a17);
			code10 = claim_element(a17_nodes, "CODE", {});
			var code10_nodes = children(code10);
			t88 = claim_text(code10_nodes, "<resolution>");
			code10_nodes.forEach(detach);
			a17_nodes.forEach(detach);
			t89 = claim_text(li39_nodes, " , eg: 300dpi");
			ul10 = claim_element(li39_nodes, "UL", {});
			var ul10_nodes = children(ul10);
			li38 = claim_element(ul10_nodes, "LI", {});
			var li38_nodes = children(li38);
			t90 = claim_text(li38_nodes, "in media query");
			li38_nodes.forEach(detach);
			ul10_nodes.forEach(detach);
			li39_nodes.forEach(detach);
			t91 = claim_space(ul13_nodes);
			li41 = claim_element(ul13_nodes, "LI", {});
			var li41_nodes = children(li41);
			a18 = claim_element(li41_nodes, "A", { href: true, rel: true });
			var a18_nodes = children(a18);
			code11 = claim_element(a18_nodes, "CODE", {});
			var code11_nodes = children(code11);
			t92 = claim_text(code11_nodes, "<integer>");
			code11_nodes.forEach(detach);
			a18_nodes.forEach(detach);
			t93 = claim_text(li41_nodes, ", positive / negative whole number");
			ul11 = claim_element(li41_nodes, "UL", {});
			var ul11_nodes = children(ul11);
			li40 = claim_element(ul11_nodes, "LI", {});
			var li40_nodes = children(li40);
			t94 = claim_text(li40_nodes, "in z-index, grid-row");
			li40_nodes.forEach(detach);
			ul11_nodes.forEach(detach);
			li41_nodes.forEach(detach);
			t95 = claim_space(ul13_nodes);
			li42 = claim_element(ul13_nodes, "LI", {});
			var li42_nodes = children(li42);
			a19 = claim_element(li42_nodes, "A", { href: true, rel: true });
			var a19_nodes = children(a19);
			code12 = claim_element(a19_nodes, "CODE", {});
			var code12_nodes = children(code12);
			t96 = claim_text(code12_nodes, "<number>");
			code12_nodes.forEach(detach);
			a19_nodes.forEach(detach);
			li42_nodes.forEach(detach);
			t97 = claim_space(ul13_nodes);
			li43 = claim_element(ul13_nodes, "LI", {});
			var li43_nodes = children(li43);
			code13 = claim_element(li43_nodes, "CODE", {});
			var code13_nodes = children(code13);
			t98 = claim_text(code13_nodes, "<color>");
			code13_nodes.forEach(detach);
			li43_nodes.forEach(detach);
			t99 = claim_space(ul13_nodes);
			li44 = claim_element(ul13_nodes, "LI", {});
			var li44_nodes = children(li44);
			a20 = claim_element(li44_nodes, "A", { href: true, rel: true });
			var a20_nodes = children(a20);
			code14 = claim_element(a20_nodes, "CODE", {});
			var code14_nodes = children(code14);
			t100 = claim_text(code14_nodes, "<transform-function>");
			code14_nodes.forEach(detach);
			a20_nodes.forEach(detach);
			t101 = claim_text(li44_nodes, ", 2d / 3d transform function");
			li44_nodes.forEach(detach);
			t102 = claim_space(ul13_nodes);
			li46 = claim_element(ul13_nodes, "LI", {});
			var li46_nodes = children(li46);
			a21 = claim_element(li46_nodes, "A", { href: true, rel: true });
			var a21_nodes = children(a21);
			code15 = claim_element(a21_nodes, "CODE", {});
			var code15_nodes = children(code15);
			t103 = claim_text(code15_nodes, "<custom-ident>");
			code15_nodes.forEach(detach);
			a21_nodes.forEach(detach);
			ul12 = claim_element(li46_nodes, "UL", {});
			var ul12_nodes = children(ul12);
			li45 = claim_element(ul12_nodes, "LI", {});
			var li45_nodes = children(li45);
			t104 = claim_text(li45_nodes, "eg: animation-name");
			li45_nodes.forEach(detach);
			ul12_nodes.forEach(detach);
			li46_nodes.forEach(detach);
			ul13_nodes.forEach(detach);
			section4_nodes.forEach(detach);
			t105 = claim_space(nodes);
			section5 = claim_element(nodes, "SECTION", {});
			var section5_nodes = children(section5);
			h30 = claim_element(section5_nodes, "H3", {});
			var h30_nodes = children(h30);
			a22 = claim_element(h30_nodes, "A", { href: true, id: true });
			var a22_nodes = children(a22);
			t106 = claim_text(a22_nodes, "Multipliers");
			a22_nodes.forEach(detach);
			h30_nodes.forEach(detach);
			t107 = claim_space(section5_nodes);
			p0 = claim_element(section5_nodes, "P", {});
			var p0_nodes = children(p0);
			a23 = claim_element(p0_nodes, "A", { href: true, rel: true });
			var a23_nodes = children(a23);
			t108 = claim_text(a23_nodes, "Component value multipliers");
			a23_nodes.forEach(detach);
			p0_nodes.forEach(detach);
			t109 = claim_space(section5_nodes);
			ul14 = claim_element(section5_nodes, "UL", {});
			var ul14_nodes = children(ul14);
			li47 = claim_element(ul14_nodes, "LI", {});
			var li47_nodes = children(li47);
			code16 = claim_element(li47_nodes, "CODE", {});
			var code16_nodes = children(code16);
			t110 = claim_text(code16_nodes, "<length>+");
			code16_nodes.forEach(detach);
			t111 = claim_text(li47_nodes, ", length can appear one or more times, eg: ");
			code17 = claim_element(li47_nodes, "CODE", {});
			var code17_nodes = children(code17);
			t112 = claim_text(code17_nodes, "\"1px 2px 3px\"");
			code17_nodes.forEach(detach);
			li47_nodes.forEach(detach);
			t113 = claim_space(ul14_nodes);
			li48 = claim_element(ul14_nodes, "LI", {});
			var li48_nodes = children(li48);
			code18 = claim_element(li48_nodes, "CODE", {});
			var code18_nodes = children(code18);
			t114 = claim_text(code18_nodes, "<length>#");
			code18_nodes.forEach(detach);
			t115 = claim_text(li48_nodes, ", length appear one or more times with comma separated, eg: ");
			code19 = claim_element(li48_nodes, "CODE", {});
			var code19_nodes = children(code19);
			t116 = claim_text(code19_nodes, "\"1px, 2px 3px\"");
			code19_nodes.forEach(detach);
			li48_nodes.forEach(detach);
			ul14_nodes.forEach(detach);
			section5_nodes.forEach(detach);
			t117 = claim_space(nodes);
			section6 = claim_element(nodes, "SECTION", {});
			var section6_nodes = children(section6);
			h31 = claim_element(section6_nodes, "H3", {});
			var h31_nodes = children(h31);
			a24 = claim_element(h31_nodes, "A", { href: true, id: true });
			var a24_nodes = children(a24);
			t118 = claim_text(a24_nodes, "Combinators");
			a24_nodes.forEach(detach);
			h31_nodes.forEach(detach);
			t119 = claim_space(section6_nodes);
			p1 = claim_element(section6_nodes, "P", {});
			var p1_nodes = children(p1);
			a25 = claim_element(p1_nodes, "A", { href: true, rel: true });
			var a25_nodes = children(a25);
			t120 = claim_text(a25_nodes, "Component value combinators");
			a25_nodes.forEach(detach);
			p1_nodes.forEach(detach);
			t121 = claim_space(section6_nodes);
			ul15 = claim_element(section6_nodes, "UL", {});
			var ul15_nodes = children(ul15);
			li49 = claim_element(ul15_nodes, "LI", {});
			var li49_nodes = children(li49);
			code20 = claim_element(li49_nodes, "CODE", {});
			var code20_nodes = children(code20);
			t122 = claim_text(code20_nodes, "|");
			code20_nodes.forEach(detach);
			t123 = claim_text(li49_nodes, ", eg: ");
			code21 = claim_element(li49_nodes, "CODE", {});
			var code21_nodes = children(code21);
			t124 = claim_text(code21_nodes, "<percentage> | <length>");
			code21_nodes.forEach(detach);
			t125 = claim_text(li49_nodes, ", must be either percentage or length, and appear only once");
			li49_nodes.forEach(detach);
			ul15_nodes.forEach(detach);
			section6_nodes.forEach(detach);
			t126 = claim_space(nodes);
			section7 = claim_element(nodes, "SECTION", {});
			var section7_nodes = children(section7);
			h24 = claim_element(section7_nodes, "H2", {});
			var h24_nodes = children(h24);
			a26 = claim_element(h24_nodes, "A", { href: true, id: true });
			var a26_nodes = children(a26);
			t127 = claim_text(a26_nodes, "References");
			a26_nodes.forEach(detach);
			h24_nodes.forEach(detach);
			t128 = claim_space(section7_nodes);
			ul16 = claim_element(section7_nodes, "UL", {});
			var ul16_nodes = children(ul16);
			li50 = claim_element(ul16_nodes, "LI", {});
			var li50_nodes = children(li50);
			a27 = claim_element(li50_nodes, "A", { href: true, rel: true });
			var a27_nodes = children(a27);
			t129 = claim_text(a27_nodes, "https://developer.mozilla.org/en-US/docs/Web/CSS/Value_definition_syntax");
			a27_nodes.forEach(detach);
			li50_nodes.forEach(detach);
			t130 = claim_space(ul16_nodes);
			li51 = claim_element(ul16_nodes, "LI", {});
			var li51_nodes = children(li51);
			a28 = claim_element(li51_nodes, "A", { href: true, rel: true });
			var a28_nodes = children(a28);
			t131 = claim_text(a28_nodes, "https://heyjiawei.com/how-to-read-css-specification-syntax");
			a28_nodes.forEach(detach);
			li51_nodes.forEach(detach);
			t132 = claim_space(ul16_nodes);
			li52 = claim_element(ul16_nodes, "LI", {});
			var li52_nodes = children(li52);
			a29 = claim_element(li52_nodes, "A", { href: true, rel: true });
			var a29_nodes = children(a29);
			t133 = claim_text(a29_nodes, "https://web.dev/at-property");
			a29_nodes.forEach(detach);
			li52_nodes.forEach(detach);
			ul16_nodes.forEach(detach);
			section7_nodes.forEach(detach);
			this.h();
		},
		h() {
			attr(a0, "href", "#css-houdini");
			attr(a1, "href", "#properties-and-values-api");
			attr(a2, "href", "#ways-to-register-houdini-custom-properties");
			attr(a3, "href", "#syntax");
			attr(a4, "href", "#multipliers");
			attr(a5, "href", "#combinators");
			attr(a6, "href", "#references");
			attr(ul1, "class", "sitemap");
			attr(ul1, "id", "sitemap");
			attr(ul1, "role", "navigation");
			attr(ul1, "aria-label", "Table of Contents");
			attr(a7, "href", "#css-houdini");
			attr(a7, "id", "css-houdini");
			attr(a8, "href", "#properties-and-values-api");
			attr(a8, "id", "properties-and-values-api");
			attr(a9, "href", "#ways-to-register-houdini-custom-properties");
			attr(a9, "id", "ways-to-register-houdini-custom-properties");
			attr(pre0, "class", "language-js");
			attr(pre1, "class", "language-css");
			attr(a10, "href", "#syntax");
			attr(a10, "id", "syntax");
			attr(a11, "href", "https://web.dev/at-property/#syntax");
			attr(a11, "rel", "nofollow");
			attr(a12, "href", "https://developer.mozilla.org/en-US/docs/Web/CSS/length");
			attr(a12, "rel", "nofollow");
			attr(a13, "href", "https://developer.mozilla.org/en-US/docs/Web/CSS/percentage");
			attr(a13, "rel", "nofollow");
			attr(a14, "href", "https://developer.mozilla.org/en-US/docs/Web/CSS/length-percentage");
			attr(a14, "rel", "nofollow");
			attr(a15, "href", "https://developer.mozilla.org/en-US/docs/Web/CSS/angle");
			attr(a15, "rel", "nofollow");
			attr(a16, "href", "https://developer.mozilla.org/en-US/docs/Web/CSS/time");
			attr(a16, "rel", "nofollow");
			attr(a17, "href", "https://developer.mozilla.org/en-US/docs/Web/CSS/resolution");
			attr(a17, "rel", "nofollow");
			attr(a18, "href", "https://developer.mozilla.org/en-US/docs/Web/CSS/integer");
			attr(a18, "rel", "nofollow");
			attr(a19, "href", "https://developer.mozilla.org/en-US/docs/Web/CSS/number");
			attr(a19, "rel", "nofollow");
			attr(a20, "href", "https://developer.mozilla.org/en-US/docs/Web/CSS/transform-function");
			attr(a20, "rel", "nofollow");
			attr(a21, "href", "https://developer.mozilla.org/en-US/docs/Web/CSS/custom-ident");
			attr(a21, "rel", "nofollow");
			attr(a22, "href", "#multipliers");
			attr(a22, "id", "multipliers");
			attr(a23, "href", "https://developer.mozilla.org/en-US/docs/Web/CSS/Value_definition_syntax#Component_value_multipliers");
			attr(a23, "rel", "nofollow");
			attr(a24, "href", "#combinators");
			attr(a24, "id", "combinators");
			attr(a25, "href", "https://developer.mozilla.org/en-US/docs/Web/CSS/Value_definition_syntax#Component_value_combinators");
			attr(a25, "rel", "nofollow");
			attr(a26, "href", "#references");
			attr(a26, "id", "references");
			attr(a27, "href", "https://developer.mozilla.org/en-US/docs/Web/CSS/Value_definition_syntax");
			attr(a27, "rel", "nofollow");
			attr(a28, "href", "https://heyjiawei.com/how-to-read-css-specification-syntax");
			attr(a28, "rel", "nofollow");
			attr(a29, "href", "https://web.dev/at-property");
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
			append(ul1, li6);
			append(li6, a6);
			append(a6, t6);
			insert(target, t7, anchor);
			insert(target, section1, anchor);
			append(section1, h20);
			append(h20, a7);
			append(a7, t8);
			append(section1, t9);
			append(section1, ul2);
			append(ul2, li7);
			append(li7, t10);
			append(ul2, t11);
			append(ul2, li8);
			append(li8, t12);
			append(ul2, t13);
			append(ul2, li9);
			append(li9, t14);
			append(ul2, t15);
			append(ul2, li10);
			append(li10, t16);
			append(ul2, t17);
			append(ul2, li11);
			append(li11, t18);
			append(ul2, t19);
			append(ul2, li12);
			append(li12, t20);
			append(ul2, t21);
			append(ul2, li13);
			append(li13, t22);
			append(ul2, t23);
			append(ul2, li14);
			append(li14, t24);
			insert(target, t25, anchor);
			insert(target, section2, anchor);
			append(section2, h21);
			append(h21, a8);
			append(a8, t26);
			append(section2, t27);
			append(section2, ul3);
			append(ul3, li15);
			append(li15, t28);
			append(ul3, t29);
			append(ul3, li16);
			append(li16, t30);
			append(ul3, t31);
			append(ul3, li17);
			append(li17, t32);
			append(ul3, t33);
			append(ul3, li18);
			append(li18, t34);
			append(ul3, t35);
			append(ul3, li19);
			append(li19, t36);
			append(ul3, t37);
			append(ul3, li20);
			append(li20, t38);
			append(ul3, t39);
			append(ul3, li21);
			append(li21, t40);
			insert(target, t41, anchor);
			insert(target, section3, anchor);
			append(section3, h22);
			append(h22, a9);
			append(a9, t42);
			append(section3, t43);
			append(section3, ul4);
			append(ul4, li22);
			append(li22, code0);
			append(code0, t44);
			append(li22, t45);
			append(ul4, t46);
			append(ul4, li23);
			append(li23, code1);
			append(code1, t47);
			append(li23, t48);
			append(section3, t49);
			append(section3, pre0);
			pre0.innerHTML = raw0_value;
			append(section3, t50);
			append(section3, pre1);
			pre1.innerHTML = raw1_value;
			append(section3, t51);
			append(section3, ul5);
			append(ul5, li24);
			append(li24, t52);
			append(li24, code2);
			append(code2, t53);
			append(li24, t54);
			append(ul5, t55);
			append(ul5, li25);
			append(li25, t56);
			append(ul5, t57);
			append(ul5, li26);
			append(li26, t58);
			insert(target, t59, anchor);
			insert(target, section4, anchor);
			append(section4, h23);
			append(h23, a10);
			append(a10, t60);
			append(section4, t61);
			append(section4, ul13);
			append(ul13, li27);
			append(li27, t62);
			append(li27, a11);
			append(a11, t63);
			append(ul13, t64);
			append(ul13, li28);
			append(li28, a12);
			append(a12, code3);
			append(code3, t65);
			append(li28, t66);
			append(ul13, t67);
			append(ul13, li30);
			append(li30, a13);
			append(a13, code4);
			append(code4, t68);
			append(li30, t69);
			append(li30, ul6);
			append(ul6, li29);
			append(li29, t70);
			append(ul13, t71);
			append(ul13, li33);
			append(li33, a14);
			append(a14, code5);
			append(code5, t72);
			append(li33, ul7);
			append(ul7, li31);
			append(li31, t73);
			append(ul7, t74);
			append(ul7, li32);
			append(li32, t75);
			append(li32, code6);
			append(code6, t76);
			append(li32, t77);
			append(li32, code7);
			append(code7, t78);
			append(ul13, t79);
			append(ul13, li35);
			append(li35, a15);
			append(a15, code8);
			append(code8, t80);
			append(li35, t81);
			append(li35, ul8);
			append(ul8, li34);
			append(li34, t82);
			append(ul13, t83);
			append(ul13, li37);
			append(li37, a16);
			append(a16, code9);
			append(code9, t84);
			append(li37, t85);
			append(li37, ul9);
			append(ul9, li36);
			append(li36, t86);
			append(ul13, t87);
			append(ul13, li39);
			append(li39, a17);
			append(a17, code10);
			append(code10, t88);
			append(li39, t89);
			append(li39, ul10);
			append(ul10, li38);
			append(li38, t90);
			append(ul13, t91);
			append(ul13, li41);
			append(li41, a18);
			append(a18, code11);
			append(code11, t92);
			append(li41, t93);
			append(li41, ul11);
			append(ul11, li40);
			append(li40, t94);
			append(ul13, t95);
			append(ul13, li42);
			append(li42, a19);
			append(a19, code12);
			append(code12, t96);
			append(ul13, t97);
			append(ul13, li43);
			append(li43, code13);
			append(code13, t98);
			append(ul13, t99);
			append(ul13, li44);
			append(li44, a20);
			append(a20, code14);
			append(code14, t100);
			append(li44, t101);
			append(ul13, t102);
			append(ul13, li46);
			append(li46, a21);
			append(a21, code15);
			append(code15, t103);
			append(li46, ul12);
			append(ul12, li45);
			append(li45, t104);
			insert(target, t105, anchor);
			insert(target, section5, anchor);
			append(section5, h30);
			append(h30, a22);
			append(a22, t106);
			append(section5, t107);
			append(section5, p0);
			append(p0, a23);
			append(a23, t108);
			append(section5, t109);
			append(section5, ul14);
			append(ul14, li47);
			append(li47, code16);
			append(code16, t110);
			append(li47, t111);
			append(li47, code17);
			append(code17, t112);
			append(ul14, t113);
			append(ul14, li48);
			append(li48, code18);
			append(code18, t114);
			append(li48, t115);
			append(li48, code19);
			append(code19, t116);
			insert(target, t117, anchor);
			insert(target, section6, anchor);
			append(section6, h31);
			append(h31, a24);
			append(a24, t118);
			append(section6, t119);
			append(section6, p1);
			append(p1, a25);
			append(a25, t120);
			append(section6, t121);
			append(section6, ul15);
			append(ul15, li49);
			append(li49, code20);
			append(code20, t122);
			append(li49, t123);
			append(li49, code21);
			append(code21, t124);
			append(li49, t125);
			insert(target, t126, anchor);
			insert(target, section7, anchor);
			append(section7, h24);
			append(h24, a26);
			append(a26, t127);
			append(section7, t128);
			append(section7, ul16);
			append(ul16, li50);
			append(li50, a27);
			append(a27, t129);
			append(ul16, t130);
			append(ul16, li51);
			append(li51, a28);
			append(a28, t131);
			append(ul16, t132);
			append(ul16, li52);
			append(li52, a29);
			append(a29, t133);
		},
		p: noop,
		d(detaching) {
			if (detaching) detach(section0);
			if (detaching) detach(t7);
			if (detaching) detach(section1);
			if (detaching) detach(t25);
			if (detaching) detach(section2);
			if (detaching) detach(t41);
			if (detaching) detach(section3);
			if (detaching) detach(t59);
			if (detaching) detach(section4);
			if (detaching) detach(t105);
			if (detaching) detach(section5);
			if (detaching) detach(t117);
			if (detaching) detach(section6);
			if (detaching) detach(t126);
			if (detaching) detach(section7);
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
	"title": "The CSS Podcast: 026: Houdini Series: Properties & Values",
	"tags": ["css houdini", "The CSS Podcast"],
	"slug": "notes/css-podcast-026-houdini-series-properties-values",
	"type": "notes",
	"name": "css-podcast-026-houdini-series-properties-values",
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
