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

var baseCss = "https://lihautan.com/notes/css-podcast-028-houdini-series-paint/assets/blog-base-248115e4.css";

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
			attr(meta8, "content", "https%3A%2F%2Flihautan.com%2Fnotes%2Fcss-podcast-028-houdini-series-paint");
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
	let p0;
	let t0;
	let t1;
	let p1;
	let t2;
	let t3;
	let ul0;
	let li0;
	let t4;
	let t5;
	let li1;
	let t6;
	let t7;
	let p2;
	let t8;
	let t9;
	let ul1;
	let li2;
	let p3;
	let t10;
	let t11;
	let li3;
	let p4;
	let t12;
	let t13;
	let li4;
	let p5;
	let t14;
	let t15;
	let li5;
	let p6;
	let t16;
	let t17;
	let li6;
	let p7;
	let t18;
	let t19;
	let li7;
	let p8;
	let t20;
	let t21;
	let li8;
	let p9;
	let t22;
	let t23;
	let li9;
	let p10;
	let t24;
	let t25;
	let li10;
	let p11;
	let t26;
	let t27;
	let p12;
	let t28;
	let t29;
	let p13;
	let t30;
	let t31;
	let pre0;

	let raw0_value = `<code class="language-js"><span class="token comment">// worklet.js</span>
<span class="token comment">// 1️⃣ define the worklet class</span>
<span class="token keyword">class</span> <span class="token class-name">CheckerboardPainter</span> <span class="token punctuation">&#123;</span>
  <span class="token function">paint</span><span class="token punctuation">(</span><span class="token parameter">ctx<span class="token punctuation">,</span> geometry<span class="token punctuation">,</span> property<span class="token punctuation">,</span> args</span><span class="token punctuation">)</span> <span class="token punctuation">&#123;</span>
    <span class="token comment">// ...    </span>
  <span class="token punctuation">&#125;</span>
<span class="token punctuation">&#125;</span>
<span class="token comment">// 2️⃣ register the worklet: registerPaint(name, workletClass)</span>
<span class="token function">registerPaint</span><span class="token punctuation">(</span><span class="token string">'checkerboard'</span><span class="token punctuation">,</span> CheckerboardPaint<span class="token punctuation">)</span><span class="token punctuation">;</span>

<span class="token comment">// ---------------------</span>
<span class="token comment">// main.js</span>
<span class="token comment">// 3️⃣ add worklet</span>
<span class="token constant">CSS</span><span class="token punctuation">.</span>paintWorklet<span class="token punctuation">.</span><span class="token function">addModule</span><span class="token punctuation">(</span><span class="token string">'worklet.js'</span><span class="token punctuation">)</span><span class="token punctuation">;</span>

<span class="token comment">// main.css</span>
<span class="token comment">// 4️⃣ use the paint worklet</span>
li <span class="token punctuation">&#123;</span> 
  background<span class="token operator">-</span>image<span class="token punctuation">:</span> <span class="token function">paint</span><span class="token punctuation">(</span>checkerboard<span class="token punctuation">)</span><span class="token punctuation">;</span>
  border<span class="token operator">-</span>image<span class="token punctuation">:</span> <span class="token function">paint</span><span class="token punctuation">(</span>checkerboard<span class="token punctuation">)</span><span class="token punctuation">;</span>
<span class="token punctuation">&#125;</span></code>` + "";

	let t32;
	let p14;
	let t33;
	let t34;
	let ul5;
	let li13;
	let t35;
	let ul2;
	let li11;
	let t36;
	let code0;
	let t37;
	let t38;
	let li12;
	let t39;
	let code1;
	let t40;
	let t41;
	let li16;
	let t42;
	let ul3;
	let li14;
	let t43;
	let t44;
	let li15;
	let code2;
	let t45;
	let t46;
	let code3;
	let t47;
	let t48;
	let li19;
	let t49;
	let ul4;
	let li17;
	let t50;
	let t51;
	let li18;
	let t52;
	let t53;
	let pre1;

	let raw1_value = `<code class="language-js"><span class="token comment">// worklet.js</span>
<span class="token keyword">class</span> <span class="token class-name">SuperUnderlinePainter</span> <span class="token punctuation">&#123;</span>
  <span class="token comment">// return an array of input properties</span>
  <span class="token keyword">static</span> <span class="token keyword">get</span> <span class="token function">inputProperties</span><span class="token punctuation">(</span><span class="token punctuation">)</span> <span class="token punctuation">&#123;</span>
    <span class="token keyword">return</span> <span class="token punctuation">[</span><span class="token string">'--underlineWidth'</span><span class="token punctuation">,</span> <span class="token string">'--underlineColor'</span><span class="token punctuation">]</span><span class="token punctuation">;</span>
  <span class="token punctuation">&#125;</span>
  <span class="token function">paint</span><span class="token punctuation">(</span><span class="token parameter">ctx<span class="token punctuation">,</span> geometry<span class="token punctuation">,</span> properties</span><span class="token punctuation">)</span> <span class="token punctuation">&#123;</span>
    <span class="token comment">// get the property value from CSS</span>
    <span class="token keyword">const</span> underlineWidth <span class="token operator">=</span> properties<span class="token punctuation">.</span><span class="token function">get</span><span class="token punctuation">(</span><span class="token string">'--underlineWidth'</span><span class="token punctuation">)</span><span class="token punctuation">;</span>
    <span class="token keyword">const</span> underlineColor <span class="token operator">=</span> properties<span class="token punctuation">.</span><span class="token function">get</span><span class="token punctuation">(</span><span class="token string">'--underlineColor'</span><span class="token punctuation">)</span><span class="token punctuation">;</span>

    <span class="token comment">// use them to paint</span>
    ctx<span class="token punctuation">.</span>fillStyle <span class="token operator">=</span> underlineColor<span class="token punctuation">;</span>
    ctx<span class="token punctuation">.</span><span class="token function">fillRect</span><span class="token punctuation">(</span><span class="token number">0</span><span class="token punctuation">,</span> <span class="token number">0</span><span class="token punctuation">,</span> <span class="token number">3</span><span class="token punctuation">,</span> underlineWidth<span class="token punctuation">)</span><span class="token punctuation">;</span>
  <span class="token punctuation">&#125;</span>
<span class="token punctuation">&#125;</span>
<span class="token comment">// main.css</span>
li <span class="token punctuation">&#123;</span> 
  <span class="token operator">--</span>underlineWidth<span class="token punctuation">:</span> <span class="token number">3</span><span class="token punctuation">;</span>
  <span class="token operator">--</span>underlineColor<span class="token punctuation">:</span> red<span class="token punctuation">;</span>
  background<span class="token punctuation">:</span> <span class="token function">paint</span><span class="token punctuation">(</span><span class="token keyword">super</span><span class="token operator">-</span>underline<span class="token punctuation">)</span><span class="token punctuation">;</span>
<span class="token punctuation">&#125;</span></code>` + "";

	let t54;
	let ul7;
	let li22;
	let t55;
	let ul6;
	let li20;
	let t56;
	let t57;
	let li21;
	let t58;
	let t59;
	let pre2;

	let raw2_value = `<code class="language-js"><span class="token comment">// worklet.js</span>
<span class="token keyword">class</span> <span class="token class-name">SuperUnderlinePainter</span> <span class="token punctuation">&#123;</span>
  <span class="token comment">// return an array of input argument types</span>
  <span class="token keyword">static</span> <span class="token keyword">get</span> <span class="token function">inputArguments</span><span class="token punctuation">(</span><span class="token punctuation">)</span> <span class="token punctuation">&#123;</span>
    <span class="token keyword">return</span> <span class="token punctuation">[</span>
      <span class="token string">'&lt;number>'</span><span class="token punctuation">,</span> <span class="token comment">// underline width</span>
      <span class="token string">'&lt;color>'</span><span class="token punctuation">,</span>  <span class="token comment">// underline color</span>
    <span class="token punctuation">]</span><span class="token punctuation">;</span>
  <span class="token punctuation">&#125;</span>
  <span class="token function">paint</span><span class="token punctuation">(</span><span class="token parameter">ctx<span class="token punctuation">,</span> geometry<span class="token punctuation">,</span> properties<span class="token punctuation">,</span> args</span><span class="token punctuation">)</span> <span class="token punctuation">&#123;</span>
    <span class="token comment">// get the argument value</span>
    <span class="token keyword">const</span> <span class="token punctuation">[</span>underlineWidth<span class="token punctuation">,</span> underlineColor<span class="token punctuation">]</span> <span class="token operator">=</span> args<span class="token punctuation">;</span>
    <span class="token comment">// use them to paint</span>
    ctx<span class="token punctuation">.</span>fillStyle <span class="token operator">=</span> underlineColor<span class="token punctuation">.</span>cssText<span class="token punctuation">;</span>
    ctx<span class="token punctuation">.</span><span class="token function">fillRect</span><span class="token punctuation">(</span><span class="token number">0</span><span class="token punctuation">,</span> <span class="token number">0</span><span class="token punctuation">,</span> <span class="token number">3</span><span class="token punctuation">,</span> underlineWidth<span class="token punctuation">.</span>value<span class="token punctuation">)</span><span class="token punctuation">;</span>
  <span class="token punctuation">&#125;</span>
<span class="token punctuation">&#125;</span>
<span class="token comment">// main.css</span>
li <span class="token punctuation">&#123;</span> 
  background<span class="token punctuation">:</span> <span class="token function">paint</span><span class="token punctuation">(</span><span class="token keyword">super</span><span class="token operator">-</span>underline<span class="token punctuation">,</span> <span class="token number">3</span><span class="token punctuation">,</span> red<span class="token punctuation">)</span><span class="token punctuation">;</span>
<span class="token punctuation">&#125;</span></code>` + "";

	let t60;
	let pre3;

	let raw3_value = `<code class="language-js"><span class="token comment">// worklet.js</span>
<span class="token keyword">class</span> <span class="token class-name">Painter</span> <span class="token punctuation">&#123;</span>
  <span class="token comment">/* 
    define if alphatransparency is allowed
  */</span>
  <span class="token keyword">static</span> <span class="token keyword">get</span> <span class="token function">contextOptions</span><span class="token punctuation">(</span><span class="token punctuation">)</span> <span class="token punctuation">&#123;</span> 
    <span class="token keyword">return</span> <span class="token punctuation">&#123;</span> alpha<span class="token punctuation">:</span> <span class="token boolean">true</span> <span class="token punctuation">&#125;</span><span class="token punctuation">;</span> 
  <span class="token punctuation">&#125;</span>
<span class="token punctuation">&#125;</span></code>` + "";

	let t61;
	let ul8;
	let li23;
	let t62;
	let code4;
	let t63;
	let t64;
	let t65;
	let li24;
	let t66;
	let t67;
	let li25;
	let a;
	let t68;
	let t69;
	let p15;
	let t70;

	return {
		c() {
			p0 = element("p");
			t0 = text("worklet");
			t1 = space();
			p1 = element("p");
			t2 = text("paint worklet");
			t3 = space();
			ul0 = element("ul");
			li0 = element("li");
			t4 = text("a.k.a CSS Paint API");
			t5 = space();
			li1 = element("li");
			t6 = text("allow developers to define canvas like custom painting functions, that can be used directly in CSS as background, border, ...");
			t7 = space();
			p2 = element("p");
			t8 = text("worklet");
			t9 = space();
			ul1 = element("ul");
			li2 = element("li");
			p3 = element("p");
			t10 = text("self-contained, can be run off the main thread");
			t11 = space();
			li3 = element("li");
			p4 = element("p");
			t12 = text("all worklets are workers, worklet is more specific workers");
			t13 = space();
			li4 = element("li");
			p5 = element("p");
			t14 = text("worklet have a tight limited contract between the script and the application that created it");
			t15 = space();
			li5 = element("li");
			p6 = element("p");
			t16 = text("limited in the hopes of doing something powerful");
			t17 = space();
			li6 = element("li");
			p7 = element("p");
			t18 = text("worklet scripts are always invoked in their own sandbox, with their allocated computing power, allow them to be created and destroyed very quickly");
			t19 = space();
			li7 = element("li");
			p8 = element("p");
			t20 = text("secure, served and run from a https server");
			t21 = space();
			li8 = element("li");
			p9 = element("p");
			t22 = text("will run off the main thread");
			t23 = space();
			li9 = element("li");
			p10 = element("p");
			t24 = text("browser will forward the request found in the CSS for background paint job from a custom houdini worklet, worklet will run in it's own thread, and will return a painted canvas for the browser to use");
			t25 = space();
			li10 = element("li");
			p11 = element("p");
			t26 = text("secure, fast, off-the-main thread");
			t27 = space();
			p12 = element("p");
			t28 = text("gotcha: if run locally, need to serve from a local server");
			t29 = space();
			p13 = element("p");
			t30 = text("registerPaint(name, workletClass)");
			t31 = space();
			pre0 = element("pre");
			t32 = space();
			p14 = element("p");
			t33 = text("paint(ctx, geometry, property, arguments)");
			t34 = space();
			ul5 = element("ul");
			li13 = element("li");
			t35 = text("ctx");
			ul2 = element("ul");
			li11 = element("li");
			t36 = text("akin to the canvas context, ");
			code0 = element("code");
			t37 = text("canvas.getContext('2d')");
			t38 = space();
			li12 = element("li");
			t39 = text("same full API as canvas context, ");
			code1 = element("code");
			t40 = text("ctx.fill()");
			t41 = space();
			li16 = element("li");
			t42 = text("geometry");
			ul3 = element("ul");
			li14 = element("li");
			t43 = text("height and width of your element");
			t44 = space();
			li15 = element("li");
			code2 = element("code");
			t45 = text("geometry.height");
			t46 = text(", ");
			code3 = element("code");
			t47 = text("geometry.width");
			t48 = space();
			li19 = element("li");
			t49 = text("property");
			ul4 = element("ul");
			li17 = element("li");
			t50 = text("pull in input properties, custom properties in CSS, and used them as values to customise the worklet");
			t51 = space();
			li18 = element("li");
			t52 = text("can use together with CSS Properties and Values API");
			t53 = space();
			pre1 = element("pre");
			t54 = space();
			ul7 = element("ul");
			li22 = element("li");
			t55 = text("arguments");
			ul6 = element("ul");
			li20 = element("li");
			t56 = text("don't have to share the same property if using the multiple paint worklet on the same element");
			t57 = space();
			li21 = element("li");
			t58 = text("can give different argument for each of the paint worklet");
			t59 = space();
			pre2 = element("pre");
			t60 = space();
			pre3 = element("pre");
			t61 = space();
			ul8 = element("ul");
			li23 = element("li");
			t62 = text("take note if using ");
			code4 = element("code");
			t63 = text("Math.random()");
			t64 = text(" within paint() to paint a random background");
			t65 = space();
			li24 = element("li");
			t66 = text("background will change when you are typing, or resizing, because it repaints");
			t67 = space();
			li25 = element("li");
			a = element("a");
			t68 = text("https://jakearchibald.com/2020/css-paint-predictably-random/");
			t69 = space();
			p15 = element("p");
			t70 = text("PIZZA NIGHT");
			this.h();
		},
		l(nodes) {
			p0 = claim_element(nodes, "P", {});
			var p0_nodes = children(p0);
			t0 = claim_text(p0_nodes, "worklet");
			p0_nodes.forEach(detach);
			t1 = claim_space(nodes);
			p1 = claim_element(nodes, "P", {});
			var p1_nodes = children(p1);
			t2 = claim_text(p1_nodes, "paint worklet");
			p1_nodes.forEach(detach);
			t3 = claim_space(nodes);
			ul0 = claim_element(nodes, "UL", {});
			var ul0_nodes = children(ul0);
			li0 = claim_element(ul0_nodes, "LI", {});
			var li0_nodes = children(li0);
			t4 = claim_text(li0_nodes, "a.k.a CSS Paint API");
			li0_nodes.forEach(detach);
			t5 = claim_space(ul0_nodes);
			li1 = claim_element(ul0_nodes, "LI", {});
			var li1_nodes = children(li1);
			t6 = claim_text(li1_nodes, "allow developers to define canvas like custom painting functions, that can be used directly in CSS as background, border, ...");
			li1_nodes.forEach(detach);
			ul0_nodes.forEach(detach);
			t7 = claim_space(nodes);
			p2 = claim_element(nodes, "P", {});
			var p2_nodes = children(p2);
			t8 = claim_text(p2_nodes, "worklet");
			p2_nodes.forEach(detach);
			t9 = claim_space(nodes);
			ul1 = claim_element(nodes, "UL", {});
			var ul1_nodes = children(ul1);
			li2 = claim_element(ul1_nodes, "LI", {});
			var li2_nodes = children(li2);
			p3 = claim_element(li2_nodes, "P", {});
			var p3_nodes = children(p3);
			t10 = claim_text(p3_nodes, "self-contained, can be run off the main thread");
			p3_nodes.forEach(detach);
			li2_nodes.forEach(detach);
			t11 = claim_space(ul1_nodes);
			li3 = claim_element(ul1_nodes, "LI", {});
			var li3_nodes = children(li3);
			p4 = claim_element(li3_nodes, "P", {});
			var p4_nodes = children(p4);
			t12 = claim_text(p4_nodes, "all worklets are workers, worklet is more specific workers");
			p4_nodes.forEach(detach);
			li3_nodes.forEach(detach);
			t13 = claim_space(ul1_nodes);
			li4 = claim_element(ul1_nodes, "LI", {});
			var li4_nodes = children(li4);
			p5 = claim_element(li4_nodes, "P", {});
			var p5_nodes = children(p5);
			t14 = claim_text(p5_nodes, "worklet have a tight limited contract between the script and the application that created it");
			p5_nodes.forEach(detach);
			li4_nodes.forEach(detach);
			t15 = claim_space(ul1_nodes);
			li5 = claim_element(ul1_nodes, "LI", {});
			var li5_nodes = children(li5);
			p6 = claim_element(li5_nodes, "P", {});
			var p6_nodes = children(p6);
			t16 = claim_text(p6_nodes, "limited in the hopes of doing something powerful");
			p6_nodes.forEach(detach);
			li5_nodes.forEach(detach);
			t17 = claim_space(ul1_nodes);
			li6 = claim_element(ul1_nodes, "LI", {});
			var li6_nodes = children(li6);
			p7 = claim_element(li6_nodes, "P", {});
			var p7_nodes = children(p7);
			t18 = claim_text(p7_nodes, "worklet scripts are always invoked in their own sandbox, with their allocated computing power, allow them to be created and destroyed very quickly");
			p7_nodes.forEach(detach);
			li6_nodes.forEach(detach);
			t19 = claim_space(ul1_nodes);
			li7 = claim_element(ul1_nodes, "LI", {});
			var li7_nodes = children(li7);
			p8 = claim_element(li7_nodes, "P", {});
			var p8_nodes = children(p8);
			t20 = claim_text(p8_nodes, "secure, served and run from a https server");
			p8_nodes.forEach(detach);
			li7_nodes.forEach(detach);
			t21 = claim_space(ul1_nodes);
			li8 = claim_element(ul1_nodes, "LI", {});
			var li8_nodes = children(li8);
			p9 = claim_element(li8_nodes, "P", {});
			var p9_nodes = children(p9);
			t22 = claim_text(p9_nodes, "will run off the main thread");
			p9_nodes.forEach(detach);
			li8_nodes.forEach(detach);
			t23 = claim_space(ul1_nodes);
			li9 = claim_element(ul1_nodes, "LI", {});
			var li9_nodes = children(li9);
			p10 = claim_element(li9_nodes, "P", {});
			var p10_nodes = children(p10);
			t24 = claim_text(p10_nodes, "browser will forward the request found in the CSS for background paint job from a custom houdini worklet, worklet will run in it's own thread, and will return a painted canvas for the browser to use");
			p10_nodes.forEach(detach);
			li9_nodes.forEach(detach);
			t25 = claim_space(ul1_nodes);
			li10 = claim_element(ul1_nodes, "LI", {});
			var li10_nodes = children(li10);
			p11 = claim_element(li10_nodes, "P", {});
			var p11_nodes = children(p11);
			t26 = claim_text(p11_nodes, "secure, fast, off-the-main thread");
			p11_nodes.forEach(detach);
			li10_nodes.forEach(detach);
			ul1_nodes.forEach(detach);
			t27 = claim_space(nodes);
			p12 = claim_element(nodes, "P", {});
			var p12_nodes = children(p12);
			t28 = claim_text(p12_nodes, "gotcha: if run locally, need to serve from a local server");
			p12_nodes.forEach(detach);
			t29 = claim_space(nodes);
			p13 = claim_element(nodes, "P", {});
			var p13_nodes = children(p13);
			t30 = claim_text(p13_nodes, "registerPaint(name, workletClass)");
			p13_nodes.forEach(detach);
			t31 = claim_space(nodes);
			pre0 = claim_element(nodes, "PRE", { class: true });
			var pre0_nodes = children(pre0);
			pre0_nodes.forEach(detach);
			t32 = claim_space(nodes);
			p14 = claim_element(nodes, "P", {});
			var p14_nodes = children(p14);
			t33 = claim_text(p14_nodes, "paint(ctx, geometry, property, arguments)");
			p14_nodes.forEach(detach);
			t34 = claim_space(nodes);
			ul5 = claim_element(nodes, "UL", {});
			var ul5_nodes = children(ul5);
			li13 = claim_element(ul5_nodes, "LI", {});
			var li13_nodes = children(li13);
			t35 = claim_text(li13_nodes, "ctx");
			ul2 = claim_element(li13_nodes, "UL", {});
			var ul2_nodes = children(ul2);
			li11 = claim_element(ul2_nodes, "LI", {});
			var li11_nodes = children(li11);
			t36 = claim_text(li11_nodes, "akin to the canvas context, ");
			code0 = claim_element(li11_nodes, "CODE", {});
			var code0_nodes = children(code0);
			t37 = claim_text(code0_nodes, "canvas.getContext('2d')");
			code0_nodes.forEach(detach);
			li11_nodes.forEach(detach);
			t38 = claim_space(ul2_nodes);
			li12 = claim_element(ul2_nodes, "LI", {});
			var li12_nodes = children(li12);
			t39 = claim_text(li12_nodes, "same full API as canvas context, ");
			code1 = claim_element(li12_nodes, "CODE", {});
			var code1_nodes = children(code1);
			t40 = claim_text(code1_nodes, "ctx.fill()");
			code1_nodes.forEach(detach);
			li12_nodes.forEach(detach);
			ul2_nodes.forEach(detach);
			li13_nodes.forEach(detach);
			t41 = claim_space(ul5_nodes);
			li16 = claim_element(ul5_nodes, "LI", {});
			var li16_nodes = children(li16);
			t42 = claim_text(li16_nodes, "geometry");
			ul3 = claim_element(li16_nodes, "UL", {});
			var ul3_nodes = children(ul3);
			li14 = claim_element(ul3_nodes, "LI", {});
			var li14_nodes = children(li14);
			t43 = claim_text(li14_nodes, "height and width of your element");
			li14_nodes.forEach(detach);
			t44 = claim_space(ul3_nodes);
			li15 = claim_element(ul3_nodes, "LI", {});
			var li15_nodes = children(li15);
			code2 = claim_element(li15_nodes, "CODE", {});
			var code2_nodes = children(code2);
			t45 = claim_text(code2_nodes, "geometry.height");
			code2_nodes.forEach(detach);
			t46 = claim_text(li15_nodes, ", ");
			code3 = claim_element(li15_nodes, "CODE", {});
			var code3_nodes = children(code3);
			t47 = claim_text(code3_nodes, "geometry.width");
			code3_nodes.forEach(detach);
			li15_nodes.forEach(detach);
			ul3_nodes.forEach(detach);
			li16_nodes.forEach(detach);
			t48 = claim_space(ul5_nodes);
			li19 = claim_element(ul5_nodes, "LI", {});
			var li19_nodes = children(li19);
			t49 = claim_text(li19_nodes, "property");
			ul4 = claim_element(li19_nodes, "UL", {});
			var ul4_nodes = children(ul4);
			li17 = claim_element(ul4_nodes, "LI", {});
			var li17_nodes = children(li17);
			t50 = claim_text(li17_nodes, "pull in input properties, custom properties in CSS, and used them as values to customise the worklet");
			li17_nodes.forEach(detach);
			t51 = claim_space(ul4_nodes);
			li18 = claim_element(ul4_nodes, "LI", {});
			var li18_nodes = children(li18);
			t52 = claim_text(li18_nodes, "can use together with CSS Properties and Values API");
			li18_nodes.forEach(detach);
			ul4_nodes.forEach(detach);
			li19_nodes.forEach(detach);
			ul5_nodes.forEach(detach);
			t53 = claim_space(nodes);
			pre1 = claim_element(nodes, "PRE", { class: true });
			var pre1_nodes = children(pre1);
			pre1_nodes.forEach(detach);
			t54 = claim_space(nodes);
			ul7 = claim_element(nodes, "UL", {});
			var ul7_nodes = children(ul7);
			li22 = claim_element(ul7_nodes, "LI", {});
			var li22_nodes = children(li22);
			t55 = claim_text(li22_nodes, "arguments");
			ul6 = claim_element(li22_nodes, "UL", {});
			var ul6_nodes = children(ul6);
			li20 = claim_element(ul6_nodes, "LI", {});
			var li20_nodes = children(li20);
			t56 = claim_text(li20_nodes, "don't have to share the same property if using the multiple paint worklet on the same element");
			li20_nodes.forEach(detach);
			t57 = claim_space(ul6_nodes);
			li21 = claim_element(ul6_nodes, "LI", {});
			var li21_nodes = children(li21);
			t58 = claim_text(li21_nodes, "can give different argument for each of the paint worklet");
			li21_nodes.forEach(detach);
			ul6_nodes.forEach(detach);
			li22_nodes.forEach(detach);
			ul7_nodes.forEach(detach);
			t59 = claim_space(nodes);
			pre2 = claim_element(nodes, "PRE", { class: true });
			var pre2_nodes = children(pre2);
			pre2_nodes.forEach(detach);
			t60 = claim_space(nodes);
			pre3 = claim_element(nodes, "PRE", { class: true });
			var pre3_nodes = children(pre3);
			pre3_nodes.forEach(detach);
			t61 = claim_space(nodes);
			ul8 = claim_element(nodes, "UL", {});
			var ul8_nodes = children(ul8);
			li23 = claim_element(ul8_nodes, "LI", {});
			var li23_nodes = children(li23);
			t62 = claim_text(li23_nodes, "take note if using ");
			code4 = claim_element(li23_nodes, "CODE", {});
			var code4_nodes = children(code4);
			t63 = claim_text(code4_nodes, "Math.random()");
			code4_nodes.forEach(detach);
			t64 = claim_text(li23_nodes, " within paint() to paint a random background");
			li23_nodes.forEach(detach);
			t65 = claim_space(ul8_nodes);
			li24 = claim_element(ul8_nodes, "LI", {});
			var li24_nodes = children(li24);
			t66 = claim_text(li24_nodes, "background will change when you are typing, or resizing, because it repaints");
			li24_nodes.forEach(detach);
			t67 = claim_space(ul8_nodes);
			li25 = claim_element(ul8_nodes, "LI", {});
			var li25_nodes = children(li25);
			a = claim_element(li25_nodes, "A", { href: true, rel: true });
			var a_nodes = children(a);
			t68 = claim_text(a_nodes, "https://jakearchibald.com/2020/css-paint-predictably-random/");
			a_nodes.forEach(detach);
			li25_nodes.forEach(detach);
			ul8_nodes.forEach(detach);
			t69 = claim_space(nodes);
			p15 = claim_element(nodes, "P", {});
			var p15_nodes = children(p15);
			t70 = claim_text(p15_nodes, "PIZZA NIGHT");
			p15_nodes.forEach(detach);
			this.h();
		},
		h() {
			attr(pre0, "class", "language-js");
			attr(pre1, "class", "language-js");
			attr(pre2, "class", "language-js");
			attr(pre3, "class", "language-js");
			attr(a, "href", "https://jakearchibald.com/2020/css-paint-predictably-random/");
			attr(a, "rel", "nofollow");
		},
		m(target, anchor) {
			insert(target, p0, anchor);
			append(p0, t0);
			insert(target, t1, anchor);
			insert(target, p1, anchor);
			append(p1, t2);
			insert(target, t3, anchor);
			insert(target, ul0, anchor);
			append(ul0, li0);
			append(li0, t4);
			append(ul0, t5);
			append(ul0, li1);
			append(li1, t6);
			insert(target, t7, anchor);
			insert(target, p2, anchor);
			append(p2, t8);
			insert(target, t9, anchor);
			insert(target, ul1, anchor);
			append(ul1, li2);
			append(li2, p3);
			append(p3, t10);
			append(ul1, t11);
			append(ul1, li3);
			append(li3, p4);
			append(p4, t12);
			append(ul1, t13);
			append(ul1, li4);
			append(li4, p5);
			append(p5, t14);
			append(ul1, t15);
			append(ul1, li5);
			append(li5, p6);
			append(p6, t16);
			append(ul1, t17);
			append(ul1, li6);
			append(li6, p7);
			append(p7, t18);
			append(ul1, t19);
			append(ul1, li7);
			append(li7, p8);
			append(p8, t20);
			append(ul1, t21);
			append(ul1, li8);
			append(li8, p9);
			append(p9, t22);
			append(ul1, t23);
			append(ul1, li9);
			append(li9, p10);
			append(p10, t24);
			append(ul1, t25);
			append(ul1, li10);
			append(li10, p11);
			append(p11, t26);
			insert(target, t27, anchor);
			insert(target, p12, anchor);
			append(p12, t28);
			insert(target, t29, anchor);
			insert(target, p13, anchor);
			append(p13, t30);
			insert(target, t31, anchor);
			insert(target, pre0, anchor);
			pre0.innerHTML = raw0_value;
			insert(target, t32, anchor);
			insert(target, p14, anchor);
			append(p14, t33);
			insert(target, t34, anchor);
			insert(target, ul5, anchor);
			append(ul5, li13);
			append(li13, t35);
			append(li13, ul2);
			append(ul2, li11);
			append(li11, t36);
			append(li11, code0);
			append(code0, t37);
			append(ul2, t38);
			append(ul2, li12);
			append(li12, t39);
			append(li12, code1);
			append(code1, t40);
			append(ul5, t41);
			append(ul5, li16);
			append(li16, t42);
			append(li16, ul3);
			append(ul3, li14);
			append(li14, t43);
			append(ul3, t44);
			append(ul3, li15);
			append(li15, code2);
			append(code2, t45);
			append(li15, t46);
			append(li15, code3);
			append(code3, t47);
			append(ul5, t48);
			append(ul5, li19);
			append(li19, t49);
			append(li19, ul4);
			append(ul4, li17);
			append(li17, t50);
			append(ul4, t51);
			append(ul4, li18);
			append(li18, t52);
			insert(target, t53, anchor);
			insert(target, pre1, anchor);
			pre1.innerHTML = raw1_value;
			insert(target, t54, anchor);
			insert(target, ul7, anchor);
			append(ul7, li22);
			append(li22, t55);
			append(li22, ul6);
			append(ul6, li20);
			append(li20, t56);
			append(ul6, t57);
			append(ul6, li21);
			append(li21, t58);
			insert(target, t59, anchor);
			insert(target, pre2, anchor);
			pre2.innerHTML = raw2_value;
			insert(target, t60, anchor);
			insert(target, pre3, anchor);
			pre3.innerHTML = raw3_value;
			insert(target, t61, anchor);
			insert(target, ul8, anchor);
			append(ul8, li23);
			append(li23, t62);
			append(li23, code4);
			append(code4, t63);
			append(li23, t64);
			append(ul8, t65);
			append(ul8, li24);
			append(li24, t66);
			append(ul8, t67);
			append(ul8, li25);
			append(li25, a);
			append(a, t68);
			insert(target, t69, anchor);
			insert(target, p15, anchor);
			append(p15, t70);
		},
		p: noop,
		d(detaching) {
			if (detaching) detach(p0);
			if (detaching) detach(t1);
			if (detaching) detach(p1);
			if (detaching) detach(t3);
			if (detaching) detach(ul0);
			if (detaching) detach(t7);
			if (detaching) detach(p2);
			if (detaching) detach(t9);
			if (detaching) detach(ul1);
			if (detaching) detach(t27);
			if (detaching) detach(p12);
			if (detaching) detach(t29);
			if (detaching) detach(p13);
			if (detaching) detach(t31);
			if (detaching) detach(pre0);
			if (detaching) detach(t32);
			if (detaching) detach(p14);
			if (detaching) detach(t34);
			if (detaching) detach(ul5);
			if (detaching) detach(t53);
			if (detaching) detach(pre1);
			if (detaching) detach(t54);
			if (detaching) detach(ul7);
			if (detaching) detach(t59);
			if (detaching) detach(pre2);
			if (detaching) detach(t60);
			if (detaching) detach(pre3);
			if (detaching) detach(t61);
			if (detaching) detach(ul8);
			if (detaching) detach(t69);
			if (detaching) detach(p15);
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
	"title": "The CSS Podcast: 028: Houdini Series: Paint",
	"tags": ["css houdini", "The CSS Podcast"],
	"slug": "notes/css-podcast-028-houdini-series-paint",
	"type": "notes",
	"name": "css-podcast-028-houdini-series-paint",
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
