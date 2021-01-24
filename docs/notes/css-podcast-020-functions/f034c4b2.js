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

var baseCss = "https://lihautan.com/notes/css-podcast-020-functions/assets/blog-base-248115e4.css";

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
			attr(meta8, "content", "https%3A%2F%2Flihautan.com%2Fnotes%2Fcss-podcast-020-functions");
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
	let ul0;
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
	let t18;
	let section1;
	let h20;
	let a18;
	let t19;
	let t20;
	let p;
	let t21;
	let t22;
	let ul1;
	let li18;
	let t23;
	let t24;
	let li19;
	let t25;
	let t26;
	let li20;
	let t27;
	let code0;
	let t28;
	let t29;
	let t30;
	let li21;
	let t31;
	let code1;
	let t32;
	let t33;
	let li22;
	let t34;
	let t35;
	let li23;
	let t36;
	let code2;
	let t37;
	let t38;
	let section2;
	let h21;
	let a19;
	let t39;
	let t40;
	let ul2;
	let li24;
	let code3;
	let t41;
	let t42;
	let code4;
	let t43;
	let t44;
	let code5;
	let t45;
	let t46;
	let code6;
	let t47;
	let t48;
	let code7;
	let t49;
	let t50;
	let code8;
	let t51;
	let t52;
	let li25;
	let a20;
	let code9;
	let t53;
	let t54;
	let ul3;
	let li26;
	let a21;
	let t55;
	let t56;
	let pre0;

	let raw0_value = `<code class="language-css"><span class="token selector">.element</span> <span class="token punctuation">&#123;</span>
  <span class="token property">color</span><span class="token punctuation">:</span> <span class="token function">rgb</span><span class="token punctuation">(</span>255<span class="token punctuation">,</span> 0<span class="token punctuation">,</span> 0<span class="token punctuation">)</span><span class="token punctuation">;</span>
  <span class="token property">color</span><span class="token punctuation">:</span> <span class="token function">rgba</span><span class="token punctuation">(</span>255<span class="token punctuation">,</span> 0<span class="token punctuation">,</span> 0<span class="token punctuation">,</span> 1<span class="token punctuation">)</span><span class="token punctuation">;</span>
  <span class="token property">color</span><span class="token punctuation">:</span> <span class="token function">hsl</span><span class="token punctuation">(</span>0deg<span class="token punctuation">,</span> 100%<span class="token punctuation">,</span> 50%<span class="token punctuation">)</span><span class="token punctuation">;</span>
  <span class="token property">color</span><span class="token punctuation">:</span> <span class="token function">hsla</span><span class="token punctuation">(</span>0deg<span class="token punctuation">,</span> 100%<span class="token punctuation">,</span> 50%<span class="token punctuation">,</span> 100%<span class="token punctuation">)</span><span class="token punctuation">;</span>
  <span class="token property">color</span><span class="token punctuation">:</span> <span class="token function">lab</span><span class="token punctuation">(</span>53.23% 80.11 67.22<span class="token punctuation">)</span><span class="token punctuation">;</span>
  <span class="token property">color</span><span class="token punctuation">:</span> <span class="token function">lch</span><span class="token punctuation">(</span>53.23% 104.58 40<span class="token punctuation">)</span><span class="token punctuation">;</span>
<span class="token punctuation">&#125;</span></code>` + "";

	let t57;
	let section3;
	let h22;
	let a22;
	let t58;
	let t59;
	let ul4;
	let li27;
	let code10;
	let t60;
	let t61;
	let code11;
	let t62;
	let t63;
	let t64;
	let li28;
	let code12;
	let t65;
	let t66;
	let code13;
	let t67;
	let t68;
	let t69;
	let li29;
	let code14;
	let t70;
	let t71;
	let code15;
	let t72;
	let t73;
	let t74;
	let pre1;

	let raw1_value = `<code class="language-css"><span class="token selector">.element</span> <span class="token punctuation">&#123;</span>
  <span class="token property">background</span><span class="token punctuation">:</span> <span class="token function">linear-gradient</span><span class="token punctuation">(</span>45deg<span class="token punctuation">,</span> lightcoral<span class="token punctuation">,</span> beige<span class="token punctuation">)</span><span class="token punctuation">;</span>
  <span class="token property">background</span><span class="token punctuation">:</span> <span class="token function">repeating-linear-gradient</span><span class="token punctuation">(</span>45deg<span class="token punctuation">,</span> lightcoral 25px<span class="token punctuation">,</span> beige 50px<span class="token punctuation">)</span><span class="token punctuation">;</span>
  <span class="token property">background</span><span class="token punctuation">:</span> <span class="token function">radial-gradient</span><span class="token punctuation">(</span>lightcoral 25px<span class="token punctuation">,</span> beige 50px<span class="token punctuation">)</span><span class="token punctuation">;</span>
  <span class="token property">background</span><span class="token punctuation">:</span> <span class="token function">repeating-radial-gradient</span><span class="token punctuation">(</span>lightcoral 25px<span class="token punctuation">,</span> beige 50px<span class="token punctuation">)</span><span class="token punctuation">;</span>
  <span class="token property">background</span><span class="token punctuation">:</span> <span class="token function">conic-gradient</span><span class="token punctuation">(</span>lightcoral 25deg<span class="token punctuation">,</span> beige 50deg<span class="token punctuation">)</span><span class="token punctuation">;</span>
  <span class="token property">background</span><span class="token punctuation">:</span> <span class="token function">repeating-conic-gradient</span><span class="token punctuation">(</span>lightcoral 25deg<span class="token punctuation">,</span> beige 50deg<span class="token punctuation">)</span><span class="token punctuation">;</span>
<span class="token punctuation">&#125;</span></code>` + "";

	let t75;
	let section4;
	let h23;
	let a23;
	let t76;
	let code16;
	let t77;
	let t78;
	let ul5;
	let li30;
	let t79;
	let t80;
	let pre2;

	let raw2_value = `<code class="language-html"><span class="token tag"><span class="token tag"><span class="token punctuation">&lt;</span>div</span> <span class="token attr-name">class</span><span class="token attr-value"><span class="token punctuation">=</span><span class="token punctuation">"</span>element<span class="token punctuation">"</span></span> <span class="token attr-name">data-color</span><span class="token attr-value"><span class="token punctuation">=</span><span class="token punctuation">"</span>red<span class="token punctuation">"</span></span> <span class="token attr-name">data-title</span><span class="token attr-value"><span class="token punctuation">=</span><span class="token punctuation">"</span>hello<span class="token punctuation">"</span></span><span class="token punctuation">></span></span><span class="token tag"><span class="token tag"><span class="token punctuation">&lt;/</span>div</span><span class="token punctuation">></span></span>
<span class="token tag"><span class="token tag"><span class="token punctuation">&lt;</span>style</span><span class="token punctuation">></span></span><span class="token style"><span class="token language-css">
  <span class="token selector">.element::before</span> <span class="token punctuation">&#123;</span>
    <span class="token property">content</span><span class="token punctuation">:</span> <span class="token function">attr</span><span class="token punctuation">(</span>data-title<span class="token punctuation">)</span><span class="token punctuation">;</span>
    <span class="token comment">/* Providing type-or-unit and fallback to &#96;attr()&#96; is still experimental */</span>
    <span class="token property">color</span><span class="token punctuation">:</span> <span class="token function">attr</span><span class="token punctuation">(</span>data-color color<span class="token punctuation">,</span> blue<span class="token punctuation">)</span><span class="token punctuation">;</span>
  <span class="token punctuation">&#125;</span>
</span></span><span class="token tag"><span class="token tag"><span class="token punctuation">&lt;/</span>style</span><span class="token punctuation">></span></span></code>` + "";

	let t81;
	let section5;
	let h24;
	let a24;
	let t82;
	let code17;
	let t83;
	let t84;
	let ul6;
	let li31;
	let t85;
	let t86;
	let pre3;

	let raw3_value = `<code class="language-css"><span class="token selector">:root</span> <span class="token punctuation">&#123;</span>
  <span class="token property">--item-height</span><span class="token punctuation">:</span> 42px<span class="token punctuation">;</span>
<span class="token punctuation">&#125;</span>
<span class="token selector">.element</span> <span class="token punctuation">&#123;</span>
  <span class="token property">height</span><span class="token punctuation">:</span> <span class="token function">var</span><span class="token punctuation">(</span>--item-height<span class="token punctuation">)</span><span class="token punctuation">;</span>
  <span class="token comment">/* with fallback value */</span>
  <span class="token property">width</span><span class="token punctuation">:</span> <span class="token function">var</span><span class="token punctuation">(</span>--item-width<span class="token punctuation">,</span> 50px<span class="token punctuation">)</span><span class="token punctuation">;</span>
<span class="token punctuation">&#125;</span></code>` + "";

	let t87;
	let section6;
	let h25;
	let a25;
	let t88;
	let code18;
	let t89;
	let t90;
	let ul7;
	let li32;
	let t91;
	let t92;
	let pre4;

	let raw4_value = `<code class="language-css"><span class="token selector">.element</span> <span class="token punctuation">&#123;</span>
  <span class="token comment">/* absolute url */</span>
  <span class="token property">background-image</span><span class="token punctuation">:</span> <span class="token url"><span class="token function">url</span><span class="token punctuation">(</span>https://example.com/image.jpg<span class="token punctuation">)</span></span><span class="token punctuation">;</span>
  <span class="token comment">/* relative url */</span>
  <span class="token property">background-image</span><span class="token punctuation">:</span> <span class="token url"><span class="token function">url</span><span class="token punctuation">(</span>image.jpg<span class="token punctuation">)</span></span><span class="token punctuation">;</span>
  <span class="token comment">/* base 64 data uri */</span>
  <span class="token property">background-image</span><span class="token punctuation">:</span> <span class="token url"><span class="token function">url</span><span class="token punctuation">(</span>data:image/png;base64,iRxVB0…<span class="token punctuation">)</span></span><span class="token punctuation">;</span>
  <span class="token comment">/* reference to ID of an SVG shape */</span>
  <span class="token property">offset-path</span><span class="token punctuation">:</span> <span class="token url"><span class="token function">url</span><span class="token punctuation">(</span>#mask<span class="token punctuation">)</span></span><span class="token punctuation">;</span>
<span class="token punctuation">&#125;</span></code>` + "";

	let t93;
	let section7;
	let h26;
	let a26;
	let t94;
	let code19;
	let t95;
	let t96;
	let ul8;
	let li33;
	let t97;
	let t98;
	let pre5;

	let raw5_value = `<code class="language-css"><span class="token selector">.element</span> <span class="token punctuation">&#123;</span>
  <span class="token property">background-image</span><span class="token punctuation">:</span> <span class="token function">image-set</span><span class="token punctuation">(</span>
    <span class="token string">'cat.png'</span> 1x<span class="token punctuation">,</span>
    <span class="token string">'cat-2x.png'</span> 2x<span class="token punctuation">,</span>
    <span class="token string">'cat-print.png'</span> 600dpi
  <span class="token punctuation">)</span><span class="token punctuation">;</span>
<span class="token punctuation">&#125;</span></code>` + "";

	let t99;
	let section8;
	let h27;
	let a27;
	let t100;
	let t101;
	let ul9;
	let li34;
	let code20;
	let t102;
	let t103;
	let code21;
	let t104;
	let t105;
	let code22;
	let t106;
	let t107;
	let code23;
	let t108;
	let t109;
	let code24;
	let t110;
	let t111;
	let t112;
	let li35;
	let code25;
	let t113;
	let t114;
	let code26;
	let t115;
	let t116;
	let code27;
	let t117;
	let t118;
	let code28;
	let t119;
	let t120;
	let li36;
	let a28;
	let t121;
	let t122;
	let section9;
	let h28;
	let a29;
	let t123;
	let t124;
	let ul10;
	let li37;
	let code29;
	let t125;
	let t126;
	let code30;
	let t127;
	let t128;
	let code31;
	let t129;
	let t130;
	let code32;
	let t131;
	let t132;
	let pre6;

	let raw6_value = `<code class="language-css"><span class="token selector">.element</span> <span class="token punctuation">&#123;</span>
  <span class="token property">height</span><span class="token punctuation">:</span> <span class="token function">calc</span><span class="token punctuation">(</span>100vh - 42px<span class="token punctuation">)</span><span class="token punctuation">;</span>
  <span class="token comment">/* set to smallest value between 8vw and 200px */</span>
  <span class="token property">width</span><span class="token punctuation">:</span> <span class="token function">min</span><span class="token punctuation">(</span>8vw<span class="token punctuation">,</span> 200px<span class="token punctuation">)</span><span class="token punctuation">;</span>
  <span class="token comment">/* set to biggest value between 8vw and 16px */</span>
  <span class="token property">margin-top</span><span class="token punctuation">:</span> <span class="token function">max</span><span class="token punctuation">(</span>8vw<span class="token punctuation">,</span> 16px<span class="token punctuation">)</span><span class="token punctuation">;</span>
  <span class="token comment">/* set to 2.5vw, but wont go smaller than 1rem and not larget than 2rem */</span>
  <span class="token comment">/* clamp(MIN, VAL, MAX) === max(MIN, min(VAL, MAX)) */</span>
  <span class="token property">font-size</span><span class="token punctuation">:</span> <span class="token function">clamp</span><span class="token punctuation">(</span>1rem<span class="token punctuation">,</span> 2.5vw<span class="token punctuation">,</span> 2rem<span class="token punctuation">)</span><span class="token punctuation">;</span>
<span class="token punctuation">&#125;</span></code>` + "";

	let t133;
	let section10;
	let h29;
	let a30;
	let t134;
	let t135;
	let ul11;
	let li38;
	let code33;
	let t136;
	let t137;
	let code34;
	let t138;
	let t139;
	let code35;
	let t140;
	let t141;
	let code36;
	let t142;
	let t143;
	let code37;
	let t144;
	let t145;
	let code38;
	let t146;
	let t147;
	let code39;
	let t148;
	let t149;
	let code40;
	let t150;
	let t151;
	let code41;
	let t152;
	let t153;
	let section11;
	let h210;
	let a31;
	let t154;
	let code42;
	let t155;
	let t156;
	let ul12;
	let li39;
	let t157;
	let a32;
	let t158;
	let t159;
	let a33;
	let t160;
	let t161;
	let t162;
	let pre7;

	let raw7_value = `<code class="language-css"><span class="token selector">.element</span> <span class="token punctuation">&#123;</span>
  <span class="token property">animation</span><span class="token punctuation">:</span> swing 1s <span class="token function">cubic-bezier</span><span class="token punctuation">(</span>0.6<span class="token punctuation">,</span> 0<span class="token punctuation">,</span> 1<span class="token punctuation">,</span> 1<span class="token punctuation">)</span><span class="token punctuation">;</span>
<span class="token punctuation">&#125;</span></code>` + "";

	let t163;
	let section12;
	let h211;
	let a34;
	let t164;
	let code43;
	let t165;
	let t166;
	let ul13;
	let li40;
	let t167;
	let t168;
	let li41;
	let t169;
	let t170;
	let pre8;

	let raw8_value = `<code class="language-css"><span class="token selector">.element</span> <span class="token punctuation">&#123;</span>
  <span class="token property">animation</span><span class="token punctuation">:</span> drive 10s <span class="token function">steps</span><span class="token punctuation">(</span>5<span class="token punctuation">,</span> end<span class="token punctuation">)</span><span class="token punctuation">;</span>
<span class="token punctuation">&#125;</span></code>` + "";

	let t171;
	let section13;
	let h212;
	let a35;
	let t172;
	let t173;
	let ul14;
	let li42;
	let code44;
	let t174;
	let t175;
	let code45;
	let t176;
	let t177;
	let code46;
	let t178;
	let t179;
	let code47;
	let t180;
	let t181;
	let code48;
	let t182;
	let t183;
	let pre9;

	let raw9_value = `<code class="language-css"><span class="token selector">.element</span> <span class="token punctuation">&#123;</span>
  <span class="token property">offset-path</span><span class="token punctuation">:</span> <span class="token function">path</span><span class="token punctuation">(</span><span class="token string">'m5 0 l 300 300 l 0 300 l 5 0'</span><span class="token punctuation">)</span><span class="token punctuation">;</span>
  <span class="token property">clip-path</span><span class="token punctuation">:</span> <span class="token function">ellipse</span><span class="token punctuation">(</span>5px 8px<span class="token punctuation">)</span><span class="token punctuation">;</span>
  <span class="token property">shape-outside</span><span class="token punctuation">:</span> <span class="token function">circle</span><span class="token punctuation">(</span>10px<span class="token punctuation">)</span><span class="token punctuation">;</span>
  <span class="token property">offset-path</span><span class="token punctuation">:</span> <span class="token function">inset</span><span class="token punctuation">(</span>4px 16px<span class="token punctuation">)</span><span class="token punctuation">;</span>
  <span class="token property">clip-path</span><span class="token punctuation">:</span> <span class="token function">polygon</span><span class="token punctuation">(</span>5px 0px<span class="token punctuation">,</span> 300px 300px<span class="token punctuation">,</span> 0 300px<span class="token punctuation">)</span><span class="token punctuation">;</span>
<span class="token punctuation">&#125;</span></code>` + "";

	let t184;
	let section14;
	let h213;
	let a36;
	let t185;
	let t186;
	let ul15;
	let li43;
	let t187;
	let t188;
	let li44;
	let t189;
	let t190;
	let li45;
	let t191;
	let t192;
	let li46;
	let t193;
	let t194;
	let li47;
	let t195;
	let t196;
	let section15;
	let h214;
	let a37;
	let t197;
	let t198;
	let ul16;
	let li48;
	let t199;
	let t200;
	let pre10;

	let raw10_value = `<code class="language-css"><span class="token selector">.element</span> <span class="token punctuation">&#123;</span>
  <span class="token property">filter</span><span class="token punctuation">:</span> <span class="token function">blur</span><span class="token punctuation">(</span>1px<span class="token punctuation">)</span><span class="token punctuation">;</span>
  <span class="token property">filter</span><span class="token punctuation">:</span> <span class="token function">brightness</span><span class="token punctuation">(</span>1.3<span class="token punctuation">)</span><span class="token punctuation">;</span>
  <span class="token property">filter</span><span class="token punctuation">:</span> <span class="token function">contrast</span><span class="token punctuation">(</span>0.5<span class="token punctuation">)</span><span class="token punctuation">;</span>
  <span class="token property">filter</span><span class="token punctuation">:</span> <span class="token function">grayscale</span><span class="token punctuation">(</span>0.4<span class="token punctuation">)</span><span class="token punctuation">;</span>
  <span class="token property">filter</span><span class="token punctuation">:</span> <span class="token function">sepia</span><span class="token punctuation">(</span>1<span class="token punctuation">)</span><span class="token punctuation">;</span>
  <span class="token property">filter</span><span class="token punctuation">:</span> <span class="token function">invert</span><span class="token punctuation">(</span>1<span class="token punctuation">)</span><span class="token punctuation">;</span>
  <span class="token property">filter</span><span class="token punctuation">:</span> <span class="token function">hue-rotate</span><span class="token punctuation">(</span>45deg<span class="token punctuation">)</span><span class="token punctuation">;</span>
  <span class="token property">filter</span><span class="token punctuation">:</span> <span class="token function">opacity</span><span class="token punctuation">(</span>0.5<span class="token punctuation">)</span><span class="token punctuation">;</span>
  <span class="token property">filter</span><span class="token punctuation">:</span> <span class="token function">drop-shadow</span><span class="token punctuation">(</span>2px 4px 6px black<span class="token punctuation">)</span><span class="token punctuation">;</span>
<span class="token punctuation">&#125;</span></code>` + "";

	let t201;
	let section16;
	let h215;
	let a38;
	let t202;
	let t203;
	let ul17;
	let li49;
	let code49;
	let t204;
	let t205;
	let code50;
	let t206;
	let t207;
	let code51;
	let t208;
	let t209;
	let section17;
	let h216;
	let a39;
	let t210;
	let t211;
	let ul18;
	let li50;
	let t212;
	let t213;
	let li51;
	let t214;
	let t215;
	let pre11;

	let raw11_value = `<code class="language-css"><span class="token atrule"><span class="token rule">@media</span> <span class="token punctuation">(</span><span class="token property">min-width</span><span class="token punctuation">:</span> 600px<span class="token punctuation">)</span></span> <span class="token punctuation">&#123;</span>
  <span class="token selector">.element</span> <span class="token punctuation">&#123;</span>
    <span class="token property">background</span><span class="token punctuation">:</span> blue<span class="token punctuation">;</span>
  <span class="token punctuation">&#125;</span>
<span class="token punctuation">&#125;</span>

<span class="token comment">/* Display-P3 color, when supported. */</span>
<span class="token atrule"><span class="token rule">@supports</span> <span class="token punctuation">(</span><span class="token property">color</span><span class="token punctuation">:</span> <span class="token function">color</span><span class="token punctuation">(</span>display-p3 1 1 1<span class="token punctuation">)</span><span class="token punctuation">)</span></span> <span class="token punctuation">&#123;</span>
  <span class="token selector">.element</span> <span class="token punctuation">&#123;</span>
      <span class="token property">color</span><span class="token punctuation">:</span> <span class="token function">color</span><span class="token punctuation">(</span>display-p3 0 1 0<span class="token punctuation">)</span><span class="token punctuation">;</span>
  <span class="token punctuation">&#125;</span>
<span class="token punctuation">&#125;</span></code>` + "";

	let t216;
	let section18;
	let h217;
	let a40;
	let t217;
	let t218;
	let ul19;
	let li52;
	let t219;
	let a41;
	let t220;
	let t221;
	let t222;
	let li53;
	let t223;
	let code52;
	let t224;
	let t225;
	let code53;
	let t226;
	let t227;
	let li54;
	let a42;
	let t228;
	let t229;
	let pre12;

	let raw12_value = `<code class="language-css"><span class="token comment">/* Billion Laughs Attack */</span>
<span class="token comment">/* create a value in custom property so big that it runs out of memory */</span>
<span class="token selector">:root</span> <span class="token punctuation">&#123;</span>
  <span class="token property">--v1</span><span class="token punctuation">:</span> <span class="token string">"lol"</span><span class="token punctuation">;</span>
  <span class="token property">--v2</span><span class="token punctuation">:</span> <span class="token function">var</span><span class="token punctuation">(</span>--v1<span class="token punctuation">)</span> <span class="token function">var</span><span class="token punctuation">(</span>--v1<span class="token punctuation">)</span> <span class="token function">var</span><span class="token punctuation">(</span>--v1<span class="token punctuation">)</span> <span class="token function">var</span><span class="token punctuation">(</span>--v1<span class="token punctuation">)</span> <span class="token function">var</span><span class="token punctuation">(</span>--v1<span class="token punctuation">)</span> <span class="token function">var</span><span class="token punctuation">(</span>--v1<span class="token punctuation">)</span> <span class="token function">var</span><span class="token punctuation">(</span>--v1<span class="token punctuation">)</span> <span class="token function">var</span><span class="token punctuation">(</span>--v1<span class="token punctuation">)</span> <span class="token function">var</span><span class="token punctuation">(</span>--v1<span class="token punctuation">)</span> <span class="token function">var</span><span class="token punctuation">(</span>--v1<span class="token punctuation">)</span><span class="token punctuation">;</span>
  <span class="token property">--v3</span><span class="token punctuation">:</span> <span class="token function">var</span><span class="token punctuation">(</span>--v2<span class="token punctuation">)</span> <span class="token function">var</span><span class="token punctuation">(</span>--v2<span class="token punctuation">)</span> <span class="token function">var</span><span class="token punctuation">(</span>--v2<span class="token punctuation">)</span> <span class="token function">var</span><span class="token punctuation">(</span>--v2<span class="token punctuation">)</span> <span class="token function">var</span><span class="token punctuation">(</span>--v2<span class="token punctuation">)</span> <span class="token function">var</span><span class="token punctuation">(</span>--v2<span class="token punctuation">)</span> <span class="token function">var</span><span class="token punctuation">(</span>--v2<span class="token punctuation">)</span> <span class="token function">var</span><span class="token punctuation">(</span>--v2<span class="token punctuation">)</span> <span class="token function">var</span><span class="token punctuation">(</span>--v2<span class="token punctuation">)</span> <span class="token function">var</span><span class="token punctuation">(</span>--v2<span class="token punctuation">)</span><span class="token punctuation">;</span>
  <span class="token property">--v4</span><span class="token punctuation">:</span> <span class="token function">var</span><span class="token punctuation">(</span>--v3<span class="token punctuation">)</span> <span class="token function">var</span><span class="token punctuation">(</span>--v3<span class="token punctuation">)</span> <span class="token function">var</span><span class="token punctuation">(</span>--v3<span class="token punctuation">)</span> <span class="token function">var</span><span class="token punctuation">(</span>--v3<span class="token punctuation">)</span> <span class="token function">var</span><span class="token punctuation">(</span>--v3<span class="token punctuation">)</span> <span class="token function">var</span><span class="token punctuation">(</span>--v3<span class="token punctuation">)</span> <span class="token function">var</span><span class="token punctuation">(</span>--v3<span class="token punctuation">)</span> <span class="token function">var</span><span class="token punctuation">(</span>--v3<span class="token punctuation">)</span> <span class="token function">var</span><span class="token punctuation">(</span>--v3<span class="token punctuation">)</span> <span class="token function">var</span><span class="token punctuation">(</span>--v3<span class="token punctuation">)</span><span class="token punctuation">;</span>
  <span class="token property">--v5</span><span class="token punctuation">:</span> <span class="token function">var</span><span class="token punctuation">(</span>--v4<span class="token punctuation">)</span> <span class="token function">var</span><span class="token punctuation">(</span>--v4<span class="token punctuation">)</span> <span class="token function">var</span><span class="token punctuation">(</span>--v4<span class="token punctuation">)</span> <span class="token function">var</span><span class="token punctuation">(</span>--v4<span class="token punctuation">)</span> <span class="token function">var</span><span class="token punctuation">(</span>--v4<span class="token punctuation">)</span> <span class="token function">var</span><span class="token punctuation">(</span>--v4<span class="token punctuation">)</span> <span class="token function">var</span><span class="token punctuation">(</span>--v4<span class="token punctuation">)</span> <span class="token function">var</span><span class="token punctuation">(</span>--v4<span class="token punctuation">)</span> <span class="token function">var</span><span class="token punctuation">(</span>--v4<span class="token punctuation">)</span> <span class="token function">var</span><span class="token punctuation">(</span>--v4<span class="token punctuation">)</span><span class="token punctuation">;</span>
  <span class="token property">--v6</span><span class="token punctuation">:</span> <span class="token function">var</span><span class="token punctuation">(</span>--v5<span class="token punctuation">)</span> <span class="token function">var</span><span class="token punctuation">(</span>--v5<span class="token punctuation">)</span> <span class="token function">var</span><span class="token punctuation">(</span>--v5<span class="token punctuation">)</span> <span class="token function">var</span><span class="token punctuation">(</span>--v5<span class="token punctuation">)</span> <span class="token function">var</span><span class="token punctuation">(</span>--v5<span class="token punctuation">)</span> <span class="token function">var</span><span class="token punctuation">(</span>--v5<span class="token punctuation">)</span> <span class="token function">var</span><span class="token punctuation">(</span>--v5<span class="token punctuation">)</span> <span class="token function">var</span><span class="token punctuation">(</span>--v5<span class="token punctuation">)</span> <span class="token function">var</span><span class="token punctuation">(</span>--v5<span class="token punctuation">)</span> <span class="token function">var</span><span class="token punctuation">(</span>--v5<span class="token punctuation">)</span><span class="token punctuation">;</span>
  <span class="token property">--v7</span><span class="token punctuation">:</span> <span class="token function">var</span><span class="token punctuation">(</span>--v6<span class="token punctuation">)</span> <span class="token function">var</span><span class="token punctuation">(</span>--v6<span class="token punctuation">)</span> <span class="token function">var</span><span class="token punctuation">(</span>--v6<span class="token punctuation">)</span> <span class="token function">var</span><span class="token punctuation">(</span>--v6<span class="token punctuation">)</span> <span class="token function">var</span><span class="token punctuation">(</span>--v6<span class="token punctuation">)</span> <span class="token function">var</span><span class="token punctuation">(</span>--v6<span class="token punctuation">)</span> <span class="token function">var</span><span class="token punctuation">(</span>--v6<span class="token punctuation">)</span> <span class="token function">var</span><span class="token punctuation">(</span>--v6<span class="token punctuation">)</span> <span class="token function">var</span><span class="token punctuation">(</span>--v6<span class="token punctuation">)</span> <span class="token function">var</span><span class="token punctuation">(</span>--v6<span class="token punctuation">)</span><span class="token punctuation">;</span>
  <span class="token property">--v8</span><span class="token punctuation">:</span> <span class="token function">var</span><span class="token punctuation">(</span>--v7<span class="token punctuation">)</span> <span class="token function">var</span><span class="token punctuation">(</span>--v7<span class="token punctuation">)</span> <span class="token function">var</span><span class="token punctuation">(</span>--v7<span class="token punctuation">)</span> <span class="token function">var</span><span class="token punctuation">(</span>--v7<span class="token punctuation">)</span> <span class="token function">var</span><span class="token punctuation">(</span>--v7<span class="token punctuation">)</span> <span class="token function">var</span><span class="token punctuation">(</span>--v7<span class="token punctuation">)</span> <span class="token function">var</span><span class="token punctuation">(</span>--v7<span class="token punctuation">)</span> <span class="token function">var</span><span class="token punctuation">(</span>--v7<span class="token punctuation">)</span> <span class="token function">var</span><span class="token punctuation">(</span>--v7<span class="token punctuation">)</span> <span class="token function">var</span><span class="token punctuation">(</span>--v7<span class="token punctuation">)</span><span class="token punctuation">;</span>
  <span class="token property">--v9</span><span class="token punctuation">:</span> <span class="token function">var</span><span class="token punctuation">(</span>--v8<span class="token punctuation">)</span> <span class="token function">var</span><span class="token punctuation">(</span>--v8<span class="token punctuation">)</span> <span class="token function">var</span><span class="token punctuation">(</span>--v8<span class="token punctuation">)</span> <span class="token function">var</span><span class="token punctuation">(</span>--v8<span class="token punctuation">)</span> <span class="token function">var</span><span class="token punctuation">(</span>--v8<span class="token punctuation">)</span> <span class="token function">var</span><span class="token punctuation">(</span>--v8<span class="token punctuation">)</span> <span class="token function">var</span><span class="token punctuation">(</span>--v8<span class="token punctuation">)</span> <span class="token function">var</span><span class="token punctuation">(</span>--v8<span class="token punctuation">)</span> <span class="token function">var</span><span class="token punctuation">(</span>--v8<span class="token punctuation">)</span> <span class="token function">var</span><span class="token punctuation">(</span>--v8<span class="token punctuation">)</span><span class="token punctuation">;</span>
  <span class="token property">--v10</span><span class="token punctuation">:</span> <span class="token function">var</span><span class="token punctuation">(</span>--v9<span class="token punctuation">)</span> <span class="token function">var</span><span class="token punctuation">(</span>--v9<span class="token punctuation">)</span> <span class="token function">var</span><span class="token punctuation">(</span>--v9<span class="token punctuation">)</span> <span class="token function">var</span><span class="token punctuation">(</span>--v9<span class="token punctuation">)</span> <span class="token function">var</span><span class="token punctuation">(</span>--v9<span class="token punctuation">)</span> <span class="token function">var</span><span class="token punctuation">(</span>--v9<span class="token punctuation">)</span> <span class="token function">var</span><span class="token punctuation">(</span>--v9<span class="token punctuation">)</span> <span class="token function">var</span><span class="token punctuation">(</span>--v9<span class="token punctuation">)</span> <span class="token function">var</span><span class="token punctuation">(</span>--v9<span class="token punctuation">)</span> <span class="token function">var</span><span class="token punctuation">(</span>--v9<span class="token punctuation">)</span><span class="token punctuation">;</span>
<span class="token punctuation">&#125;</span></code>` + "";

	return {
		c() {
			section0 = element("section");
			ul0 = element("ul");
			li0 = element("li");
			a0 = element("a");
			t0 = text("CSS Functions");
			li1 = element("li");
			a1 = element("a");
			t1 = text("1️⃣Color functions");
			li2 = element("li");
			a2 = element("a");
			t2 = text("2️⃣Gradient functions");
			li3 = element("li");
			a3 = element("a");
			t3 = text("3️⃣  attr()");
			li4 = element("li");
			a4 = element("a");
			t4 = text("4️⃣  var()");
			li5 = element("li");
			a5 = element("a");
			t5 = text("5️⃣  url()");
			li6 = element("li");
			a6 = element("a");
			t6 = text("6️⃣  image-set()");
			li7 = element("li");
			a7 = element("a");
			t7 = text("7️⃣ Functional Selectors");
			li8 = element("li");
			a8 = element("a");
			t8 = text("8️⃣ Mathematical Functions");
			li9 = element("li");
			a9 = element("a");
			t9 = text("9️⃣ Trigonometry Functions");
			li10 = element("li");
			a10 = element("a");
			t10 = text("1️⃣0️⃣  cubic-bezier()");
			li11 = element("li");
			a11 = element("a");
			t11 = text("1️⃣1️⃣  steps()");
			li12 = element("li");
			a12 = element("a");
			t12 = text("1️⃣2️⃣ Shape Functions");
			li13 = element("li");
			a13 = element("a");
			t13 = text("1️⃣3️⃣ Transform Functions");
			li14 = element("li");
			a14 = element("a");
			t14 = text("1️⃣4️⃣ Filter Functions");
			li15 = element("li");
			a15 = element("a");
			t15 = text("1️⃣5️⃣ Grid Template Functions");
			li16 = element("li");
			a16 = element("a");
			t16 = text("1️⃣6️⃣ Media Queries");
			li17 = element("li");
			a17 = element("a");
			t17 = text("1️⃣7️⃣ Vulnerabilities");
			t18 = space();
			section1 = element("section");
			h20 = element("h2");
			a18 = element("a");
			t19 = text("CSS Functions");
			t20 = space();
			p = element("p");
			t21 = text("Runtime contextual expressions that return dynamic real-time value per the state of the browser in that moment");
			t22 = space();
			ul1 = element("ul");
			li18 = element("li");
			t23 = text("within global space, no need to import");
			t24 = space();
			li19 = element("li");
			t25 = text("can be nested, calc(var(--v))");
			t26 = space();
			li20 = element("li");
			t27 = text("typed, wrong type may fail, eg: ");
			code0 = element("code");
			t28 = text("rotate(45px)");
			t29 = text(" will not work");
			t30 = space();
			li21 = element("li");
			t31 = text("type cast, eg: ");
			code1 = element("code");
			t32 = text("calc(5 * 60 * 60s)");
			t33 = space();
			li22 = element("li");
			t34 = text("keep the function live, recompute on value changes and updates");
			t35 = space();
			li23 = element("li");
			t36 = text("many of them are pure functions, counter-example: ");
			code2 = element("code");
			t37 = text("counter()");
			t38 = space();
			section2 = element("section");
			h21 = element("h2");
			a19 = element("a");
			t39 = text("1️⃣Color functions");
			t40 = space();
			ul2 = element("ul");
			li24 = element("li");
			code3 = element("code");
			t41 = text("rgb()");
			t42 = text(", ");
			code4 = element("code");
			t43 = text("rgba()");
			t44 = text(", ");
			code5 = element("code");
			t45 = text("hsl()");
			t46 = text(", ");
			code6 = element("code");
			t47 = text("hsla()");
			t48 = text(", ");
			code7 = element("code");
			t49 = text("lab()");
			t50 = text(", ");
			code8 = element("code");
			t51 = text("lch()");
			t52 = space();
			li25 = element("li");
			a20 = element("a");
			code9 = element("code");
			t53 = text("color()");
			t54 = space();
			ul3 = element("ul");
			li26 = element("li");
			a21 = element("a");
			t55 = text("newer browser supports comma-less notation");
			t56 = space();
			pre0 = element("pre");
			t57 = space();
			section3 = element("section");
			h22 = element("h2");
			a22 = element("a");
			t58 = text("2️⃣Gradient functions");
			t59 = space();
			ul4 = element("ul");
			li27 = element("li");
			code10 = element("code");
			t60 = text("linear-gradient()");
			t61 = text(", ");
			code11 = element("code");
			t62 = text("repeating-linear-gradient()");
			t63 = text("\ntop -> bottom");
			t64 = space();
			li28 = element("li");
			code12 = element("code");
			t65 = text("radiant-gradient()");
			t66 = text(", ");
			code13 = element("code");
			t67 = text("repeating-radiant-gradient()");
			t68 = text("\ncenter -> outer");
			t69 = space();
			li29 = element("li");
			code14 = element("code");
			t70 = text("conic-gradient()");
			t71 = text(" and ");
			code15 = element("code");
			t72 = text("repeating-conical-gradient()");
			t73 = text("\nclockwise");
			t74 = space();
			pre1 = element("pre");
			t75 = space();
			section4 = element("section");
			h23 = element("h2");
			a23 = element("a");
			t76 = text("3️⃣ ");
			code16 = element("code");
			t77 = text("attr()");
			t78 = space();
			ul5 = element("ul");
			li30 = element("li");
			t79 = text("allow you to read value from attribute of the element you are targeting");
			t80 = space();
			pre2 = element("pre");
			t81 = space();
			section5 = element("section");
			h24 = element("h2");
			a24 = element("a");
			t82 = text("4️⃣ ");
			code17 = element("code");
			t83 = text("var()");
			t84 = space();
			ul6 = element("ul");
			li31 = element("li");
			t85 = text("allow you to insert value of the CSS Custom Property");
			t86 = space();
			pre3 = element("pre");
			t87 = space();
			section6 = element("section");
			h25 = element("h2");
			a25 = element("a");
			t88 = text("5️⃣ ");
			code18 = element("code");
			t89 = text("url()");
			t90 = space();
			ul7 = element("ul");
			li32 = element("li");
			t91 = text("use for fetching assets");
			t92 = space();
			pre4 = element("pre");
			t93 = space();
			section7 = element("section");
			h26 = element("h2");
			a26 = element("a");
			t94 = text("6️⃣ ");
			code19 = element("code");
			t95 = text("image-set()");
			t96 = space();
			ul8 = element("ul");
			li33 = element("li");
			t97 = text("grab image based on resolution");
			t98 = space();
			pre5 = element("pre");
			t99 = space();
			section8 = element("section");
			h27 = element("h2");
			a27 = element("a");
			t100 = text("7️⃣ Functional Selectors");
			t101 = space();
			ul9 = element("ul");
			li34 = element("li");
			code20 = element("code");
			t102 = text(":is()");
			t103 = text(", ");
			code21 = element("code");
			t104 = text(":where()");
			t105 = space();
			code22 = element("code");
			t106 = text(":not()");
			t107 = text(", ");
			code23 = element("code");
			t108 = text(":lang()");
			t109 = text(", ");
			code24 = element("code");
			t110 = text(":dir()");
			t111 = text(",");
			t112 = space();
			li35 = element("li");
			code25 = element("code");
			t113 = text("nth-child()");
			t114 = text(", ");
			code26 = element("code");
			t115 = text("nth-last-child()");
			t116 = text(", ");
			code27 = element("code");
			t117 = text("nth-of-type()");
			t118 = text(", ");
			code28 = element("code");
			t119 = text("nth-last-of-type()");
			t120 = space();
			li36 = element("li");
			a28 = element("a");
			t121 = text("see pseudo selectors");
			t122 = space();
			section9 = element("section");
			h28 = element("h2");
			a29 = element("a");
			t123 = text("8️⃣ Mathematical Functions");
			t124 = space();
			ul10 = element("ul");
			li37 = element("li");
			code29 = element("code");
			t125 = text("calc()");
			t126 = text(", ");
			code30 = element("code");
			t127 = text("min()");
			t128 = text(", ");
			code31 = element("code");
			t129 = text("max()");
			t130 = text(", ");
			code32 = element("code");
			t131 = text("clamp()");
			t132 = space();
			pre6 = element("pre");
			t133 = space();
			section10 = element("section");
			h29 = element("h2");
			a30 = element("a");
			t134 = text("9️⃣ Trigonometry Functions");
			t135 = space();
			ul11 = element("ul");
			li38 = element("li");
			code33 = element("code");
			t136 = text("sin()");
			t137 = text(", ");
			code34 = element("code");
			t138 = text("cos()");
			t139 = text(", ");
			code35 = element("code");
			t140 = text("acos()");
			t141 = text(", ");
			code36 = element("code");
			t142 = text("asin()");
			t143 = text(", ");
			code37 = element("code");
			t144 = text("atan()");
			t145 = text(", ");
			code38 = element("code");
			t146 = text("atan2()");
			t147 = text(", ");
			code39 = element("code");
			t148 = text("sqrt()");
			t149 = text(", ");
			code40 = element("code");
			t150 = text("hypot()");
			t151 = text(", ");
			code41 = element("code");
			t152 = text("pow()");
			t153 = space();
			section11 = element("section");
			h210 = element("h2");
			a31 = element("a");
			t154 = text("1️⃣0️⃣ ");
			code42 = element("code");
			t155 = text("cubic-bezier()");
			t156 = space();
			ul12 = element("ul");
			li39 = element("li");
			t157 = text("@wgao19's ");
			a32 = element("a");
			t158 = text("article");
			t159 = text(" and ");
			a33 = element("a");
			t160 = text("talk");
			t161 = text(" on bezier curves");
			t162 = space();
			pre7 = element("pre");
			t163 = space();
			section12 = element("section");
			h211 = element("h2");
			a34 = element("a");
			t164 = text("1️⃣1️⃣ ");
			code43 = element("code");
			t165 = text("steps()");
			t166 = space();
			ul13 = element("ul");
			li40 = element("li");
			t167 = text("divide the output value into equal distance steps.");
			t168 = space();
			li41 = element("li");
			t169 = text("useful for animating sprites");
			t170 = space();
			pre8 = element("pre");
			t171 = space();
			section13 = element("section");
			h212 = element("h2");
			a35 = element("a");
			t172 = text("1️⃣2️⃣ Shape Functions");
			t173 = space();
			ul14 = element("ul");
			li42 = element("li");
			code44 = element("code");
			t174 = text("path()");
			t175 = text(", ");
			code45 = element("code");
			t176 = text("circle()");
			t177 = text(", ");
			code46 = element("code");
			t178 = text("ellipse()");
			t179 = text(", ");
			code47 = element("code");
			t180 = text("polygon()");
			t181 = text(", ");
			code48 = element("code");
			t182 = text("inset()");
			t183 = space();
			pre9 = element("pre");
			t184 = space();
			section14 = element("section");
			h213 = element("h2");
			a36 = element("a");
			t185 = text("1️⃣3️⃣ Transform Functions");
			t186 = space();
			ul15 = element("ul");
			li43 = element("li");
			t187 = text("scaleX(), scaleY(), scaleZ(), scale(), scale3d()");
			t188 = space();
			li44 = element("li");
			t189 = text("perspective()");
			t190 = space();
			li45 = element("li");
			t191 = text("translateX(), translateY(), translateZ(), translate(), translate3d()");
			t192 = space();
			li46 = element("li");
			t193 = text("rotateX(), rotateY(), rotateZ(), rotate(), rotate3d()");
			t194 = space();
			li47 = element("li");
			t195 = text("skewX(), skewY(), skew()");
			t196 = space();
			section15 = element("section");
			h214 = element("h2");
			a37 = element("a");
			t197 = text("1️⃣4️⃣ Filter Functions");
			t198 = space();
			ul16 = element("ul");
			li48 = element("li");
			t199 = text("blur(), brightness(), contrast(), grayscale(), hue-rotate(), invert(), opacity(), saturate(), sepia(), drop-shadow(), url()");
			t200 = space();
			pre10 = element("pre");
			t201 = space();
			section16 = element("section");
			h215 = element("h2");
			a38 = element("a");
			t202 = text("1️⃣5️⃣ Grid Template Functions");
			t203 = space();
			ul17 = element("ul");
			li49 = element("li");
			code49 = element("code");
			t204 = text("fit-content()");
			t205 = text(", ");
			code50 = element("code");
			t206 = text("min-max()");
			t207 = text(", ");
			code51 = element("code");
			t208 = text("repeat()");
			t209 = space();
			section17 = element("section");
			h216 = element("h2");
			a39 = element("a");
			t210 = text("1️⃣6️⃣ Media Queries");
			t211 = space();
			ul18 = element("ul");
			li50 = element("li");
			t212 = text("@media");
			t213 = space();
			li51 = element("li");
			t214 = text("@support");
			t215 = space();
			pre11 = element("pre");
			t216 = space();
			section18 = element("section");
			h217 = element("h2");
			a40 = element("a");
			t217 = text("1️⃣7️⃣ Vulnerabilities");
			t218 = space();
			ul19 = element("ul");
			li52 = element("li");
			t219 = text("Billion Laughs Attack (");
			a41 = element("a");
			t220 = text("https://drafts.csswg.org/css-variables/#long-variables");
			t221 = text(")");
			t222 = space();
			li53 = element("li");
			t223 = text("XSS through ");
			code52 = element("code");
			t224 = text("url()");
			t225 = text(" + ");
			code53 = element("code");
			t226 = text("attr()");
			t227 = space();
			li54 = element("li");
			a42 = element("a");
			t228 = text("Third party CSS is not safe");
			t229 = space();
			pre12 = element("pre");
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

			var ul0_nodes = children(ul0);
			li0 = claim_element(ul0_nodes, "LI", {});
			var li0_nodes = children(li0);
			a0 = claim_element(li0_nodes, "A", { href: true });
			var a0_nodes = children(a0);
			t0 = claim_text(a0_nodes, "CSS Functions");
			a0_nodes.forEach(detach);
			li0_nodes.forEach(detach);
			li1 = claim_element(ul0_nodes, "LI", {});
			var li1_nodes = children(li1);
			a1 = claim_element(li1_nodes, "A", { href: true });
			var a1_nodes = children(a1);
			t1 = claim_text(a1_nodes, "1️⃣Color functions");
			a1_nodes.forEach(detach);
			li1_nodes.forEach(detach);
			li2 = claim_element(ul0_nodes, "LI", {});
			var li2_nodes = children(li2);
			a2 = claim_element(li2_nodes, "A", { href: true });
			var a2_nodes = children(a2);
			t2 = claim_text(a2_nodes, "2️⃣Gradient functions");
			a2_nodes.forEach(detach);
			li2_nodes.forEach(detach);
			li3 = claim_element(ul0_nodes, "LI", {});
			var li3_nodes = children(li3);
			a3 = claim_element(li3_nodes, "A", { href: true });
			var a3_nodes = children(a3);
			t3 = claim_text(a3_nodes, "3️⃣  attr()");
			a3_nodes.forEach(detach);
			li3_nodes.forEach(detach);
			li4 = claim_element(ul0_nodes, "LI", {});
			var li4_nodes = children(li4);
			a4 = claim_element(li4_nodes, "A", { href: true });
			var a4_nodes = children(a4);
			t4 = claim_text(a4_nodes, "4️⃣  var()");
			a4_nodes.forEach(detach);
			li4_nodes.forEach(detach);
			li5 = claim_element(ul0_nodes, "LI", {});
			var li5_nodes = children(li5);
			a5 = claim_element(li5_nodes, "A", { href: true });
			var a5_nodes = children(a5);
			t5 = claim_text(a5_nodes, "5️⃣  url()");
			a5_nodes.forEach(detach);
			li5_nodes.forEach(detach);
			li6 = claim_element(ul0_nodes, "LI", {});
			var li6_nodes = children(li6);
			a6 = claim_element(li6_nodes, "A", { href: true });
			var a6_nodes = children(a6);
			t6 = claim_text(a6_nodes, "6️⃣  image-set()");
			a6_nodes.forEach(detach);
			li6_nodes.forEach(detach);
			li7 = claim_element(ul0_nodes, "LI", {});
			var li7_nodes = children(li7);
			a7 = claim_element(li7_nodes, "A", { href: true });
			var a7_nodes = children(a7);
			t7 = claim_text(a7_nodes, "7️⃣ Functional Selectors");
			a7_nodes.forEach(detach);
			li7_nodes.forEach(detach);
			li8 = claim_element(ul0_nodes, "LI", {});
			var li8_nodes = children(li8);
			a8 = claim_element(li8_nodes, "A", { href: true });
			var a8_nodes = children(a8);
			t8 = claim_text(a8_nodes, "8️⃣ Mathematical Functions");
			a8_nodes.forEach(detach);
			li8_nodes.forEach(detach);
			li9 = claim_element(ul0_nodes, "LI", {});
			var li9_nodes = children(li9);
			a9 = claim_element(li9_nodes, "A", { href: true });
			var a9_nodes = children(a9);
			t9 = claim_text(a9_nodes, "9️⃣ Trigonometry Functions");
			a9_nodes.forEach(detach);
			li9_nodes.forEach(detach);
			li10 = claim_element(ul0_nodes, "LI", {});
			var li10_nodes = children(li10);
			a10 = claim_element(li10_nodes, "A", { href: true });
			var a10_nodes = children(a10);
			t10 = claim_text(a10_nodes, "1️⃣0️⃣  cubic-bezier()");
			a10_nodes.forEach(detach);
			li10_nodes.forEach(detach);
			li11 = claim_element(ul0_nodes, "LI", {});
			var li11_nodes = children(li11);
			a11 = claim_element(li11_nodes, "A", { href: true });
			var a11_nodes = children(a11);
			t11 = claim_text(a11_nodes, "1️⃣1️⃣  steps()");
			a11_nodes.forEach(detach);
			li11_nodes.forEach(detach);
			li12 = claim_element(ul0_nodes, "LI", {});
			var li12_nodes = children(li12);
			a12 = claim_element(li12_nodes, "A", { href: true });
			var a12_nodes = children(a12);
			t12 = claim_text(a12_nodes, "1️⃣2️⃣ Shape Functions");
			a12_nodes.forEach(detach);
			li12_nodes.forEach(detach);
			li13 = claim_element(ul0_nodes, "LI", {});
			var li13_nodes = children(li13);
			a13 = claim_element(li13_nodes, "A", { href: true });
			var a13_nodes = children(a13);
			t13 = claim_text(a13_nodes, "1️⃣3️⃣ Transform Functions");
			a13_nodes.forEach(detach);
			li13_nodes.forEach(detach);
			li14 = claim_element(ul0_nodes, "LI", {});
			var li14_nodes = children(li14);
			a14 = claim_element(li14_nodes, "A", { href: true });
			var a14_nodes = children(a14);
			t14 = claim_text(a14_nodes, "1️⃣4️⃣ Filter Functions");
			a14_nodes.forEach(detach);
			li14_nodes.forEach(detach);
			li15 = claim_element(ul0_nodes, "LI", {});
			var li15_nodes = children(li15);
			a15 = claim_element(li15_nodes, "A", { href: true });
			var a15_nodes = children(a15);
			t15 = claim_text(a15_nodes, "1️⃣5️⃣ Grid Template Functions");
			a15_nodes.forEach(detach);
			li15_nodes.forEach(detach);
			li16 = claim_element(ul0_nodes, "LI", {});
			var li16_nodes = children(li16);
			a16 = claim_element(li16_nodes, "A", { href: true });
			var a16_nodes = children(a16);
			t16 = claim_text(a16_nodes, "1️⃣6️⃣ Media Queries");
			a16_nodes.forEach(detach);
			li16_nodes.forEach(detach);
			li17 = claim_element(ul0_nodes, "LI", {});
			var li17_nodes = children(li17);
			a17 = claim_element(li17_nodes, "A", { href: true });
			var a17_nodes = children(a17);
			t17 = claim_text(a17_nodes, "1️⃣7️⃣ Vulnerabilities");
			a17_nodes.forEach(detach);
			li17_nodes.forEach(detach);
			ul0_nodes.forEach(detach);
			section0_nodes.forEach(detach);
			t18 = claim_space(nodes);
			section1 = claim_element(nodes, "SECTION", {});
			var section1_nodes = children(section1);
			h20 = claim_element(section1_nodes, "H2", {});
			var h20_nodes = children(h20);
			a18 = claim_element(h20_nodes, "A", { href: true, id: true });
			var a18_nodes = children(a18);
			t19 = claim_text(a18_nodes, "CSS Functions");
			a18_nodes.forEach(detach);
			h20_nodes.forEach(detach);
			t20 = claim_space(section1_nodes);
			p = claim_element(section1_nodes, "P", {});
			var p_nodes = children(p);
			t21 = claim_text(p_nodes, "Runtime contextual expressions that return dynamic real-time value per the state of the browser in that moment");
			p_nodes.forEach(detach);
			t22 = claim_space(section1_nodes);
			ul1 = claim_element(section1_nodes, "UL", {});
			var ul1_nodes = children(ul1);
			li18 = claim_element(ul1_nodes, "LI", {});
			var li18_nodes = children(li18);
			t23 = claim_text(li18_nodes, "within global space, no need to import");
			li18_nodes.forEach(detach);
			t24 = claim_space(ul1_nodes);
			li19 = claim_element(ul1_nodes, "LI", {});
			var li19_nodes = children(li19);
			t25 = claim_text(li19_nodes, "can be nested, calc(var(--v))");
			li19_nodes.forEach(detach);
			t26 = claim_space(ul1_nodes);
			li20 = claim_element(ul1_nodes, "LI", {});
			var li20_nodes = children(li20);
			t27 = claim_text(li20_nodes, "typed, wrong type may fail, eg: ");
			code0 = claim_element(li20_nodes, "CODE", {});
			var code0_nodes = children(code0);
			t28 = claim_text(code0_nodes, "rotate(45px)");
			code0_nodes.forEach(detach);
			t29 = claim_text(li20_nodes, " will not work");
			li20_nodes.forEach(detach);
			t30 = claim_space(ul1_nodes);
			li21 = claim_element(ul1_nodes, "LI", {});
			var li21_nodes = children(li21);
			t31 = claim_text(li21_nodes, "type cast, eg: ");
			code1 = claim_element(li21_nodes, "CODE", {});
			var code1_nodes = children(code1);
			t32 = claim_text(code1_nodes, "calc(5 * 60 * 60s)");
			code1_nodes.forEach(detach);
			li21_nodes.forEach(detach);
			t33 = claim_space(ul1_nodes);
			li22 = claim_element(ul1_nodes, "LI", {});
			var li22_nodes = children(li22);
			t34 = claim_text(li22_nodes, "keep the function live, recompute on value changes and updates");
			li22_nodes.forEach(detach);
			t35 = claim_space(ul1_nodes);
			li23 = claim_element(ul1_nodes, "LI", {});
			var li23_nodes = children(li23);
			t36 = claim_text(li23_nodes, "many of them are pure functions, counter-example: ");
			code2 = claim_element(li23_nodes, "CODE", {});
			var code2_nodes = children(code2);
			t37 = claim_text(code2_nodes, "counter()");
			code2_nodes.forEach(detach);
			li23_nodes.forEach(detach);
			ul1_nodes.forEach(detach);
			section1_nodes.forEach(detach);
			t38 = claim_space(nodes);
			section2 = claim_element(nodes, "SECTION", {});
			var section2_nodes = children(section2);
			h21 = claim_element(section2_nodes, "H2", {});
			var h21_nodes = children(h21);
			a19 = claim_element(h21_nodes, "A", { href: true, id: true });
			var a19_nodes = children(a19);
			t39 = claim_text(a19_nodes, "1️⃣Color functions");
			a19_nodes.forEach(detach);
			h21_nodes.forEach(detach);
			t40 = claim_space(section2_nodes);
			ul2 = claim_element(section2_nodes, "UL", {});
			var ul2_nodes = children(ul2);
			li24 = claim_element(ul2_nodes, "LI", {});
			var li24_nodes = children(li24);
			code3 = claim_element(li24_nodes, "CODE", {});
			var code3_nodes = children(code3);
			t41 = claim_text(code3_nodes, "rgb()");
			code3_nodes.forEach(detach);
			t42 = claim_text(li24_nodes, ", ");
			code4 = claim_element(li24_nodes, "CODE", {});
			var code4_nodes = children(code4);
			t43 = claim_text(code4_nodes, "rgba()");
			code4_nodes.forEach(detach);
			t44 = claim_text(li24_nodes, ", ");
			code5 = claim_element(li24_nodes, "CODE", {});
			var code5_nodes = children(code5);
			t45 = claim_text(code5_nodes, "hsl()");
			code5_nodes.forEach(detach);
			t46 = claim_text(li24_nodes, ", ");
			code6 = claim_element(li24_nodes, "CODE", {});
			var code6_nodes = children(code6);
			t47 = claim_text(code6_nodes, "hsla()");
			code6_nodes.forEach(detach);
			t48 = claim_text(li24_nodes, ", ");
			code7 = claim_element(li24_nodes, "CODE", {});
			var code7_nodes = children(code7);
			t49 = claim_text(code7_nodes, "lab()");
			code7_nodes.forEach(detach);
			t50 = claim_text(li24_nodes, ", ");
			code8 = claim_element(li24_nodes, "CODE", {});
			var code8_nodes = children(code8);
			t51 = claim_text(code8_nodes, "lch()");
			code8_nodes.forEach(detach);
			li24_nodes.forEach(detach);
			t52 = claim_space(ul2_nodes);
			li25 = claim_element(ul2_nodes, "LI", {});
			var li25_nodes = children(li25);
			a20 = claim_element(li25_nodes, "A", { href: true, rel: true });
			var a20_nodes = children(a20);
			code9 = claim_element(a20_nodes, "CODE", {});
			var code9_nodes = children(code9);
			t53 = claim_text(code9_nodes, "color()");
			code9_nodes.forEach(detach);
			a20_nodes.forEach(detach);
			li25_nodes.forEach(detach);
			ul2_nodes.forEach(detach);
			t54 = claim_space(section2_nodes);
			ul3 = claim_element(section2_nodes, "UL", {});
			var ul3_nodes = children(ul3);
			li26 = claim_element(ul3_nodes, "LI", {});
			var li26_nodes = children(li26);
			a21 = claim_element(li26_nodes, "A", { href: true, rel: true });
			var a21_nodes = children(a21);
			t55 = claim_text(a21_nodes, "newer browser supports comma-less notation");
			a21_nodes.forEach(detach);
			li26_nodes.forEach(detach);
			ul3_nodes.forEach(detach);
			t56 = claim_space(section2_nodes);
			pre0 = claim_element(section2_nodes, "PRE", { class: true });
			var pre0_nodes = children(pre0);
			pre0_nodes.forEach(detach);
			section2_nodes.forEach(detach);
			t57 = claim_space(nodes);
			section3 = claim_element(nodes, "SECTION", {});
			var section3_nodes = children(section3);
			h22 = claim_element(section3_nodes, "H2", {});
			var h22_nodes = children(h22);
			a22 = claim_element(h22_nodes, "A", { href: true, id: true });
			var a22_nodes = children(a22);
			t58 = claim_text(a22_nodes, "2️⃣Gradient functions");
			a22_nodes.forEach(detach);
			h22_nodes.forEach(detach);
			t59 = claim_space(section3_nodes);
			ul4 = claim_element(section3_nodes, "UL", {});
			var ul4_nodes = children(ul4);
			li27 = claim_element(ul4_nodes, "LI", {});
			var li27_nodes = children(li27);
			code10 = claim_element(li27_nodes, "CODE", {});
			var code10_nodes = children(code10);
			t60 = claim_text(code10_nodes, "linear-gradient()");
			code10_nodes.forEach(detach);
			t61 = claim_text(li27_nodes, ", ");
			code11 = claim_element(li27_nodes, "CODE", {});
			var code11_nodes = children(code11);
			t62 = claim_text(code11_nodes, "repeating-linear-gradient()");
			code11_nodes.forEach(detach);
			t63 = claim_text(li27_nodes, "\ntop -> bottom");
			li27_nodes.forEach(detach);
			t64 = claim_space(ul4_nodes);
			li28 = claim_element(ul4_nodes, "LI", {});
			var li28_nodes = children(li28);
			code12 = claim_element(li28_nodes, "CODE", {});
			var code12_nodes = children(code12);
			t65 = claim_text(code12_nodes, "radiant-gradient()");
			code12_nodes.forEach(detach);
			t66 = claim_text(li28_nodes, ", ");
			code13 = claim_element(li28_nodes, "CODE", {});
			var code13_nodes = children(code13);
			t67 = claim_text(code13_nodes, "repeating-radiant-gradient()");
			code13_nodes.forEach(detach);
			t68 = claim_text(li28_nodes, "\ncenter -> outer");
			li28_nodes.forEach(detach);
			t69 = claim_space(ul4_nodes);
			li29 = claim_element(ul4_nodes, "LI", {});
			var li29_nodes = children(li29);
			code14 = claim_element(li29_nodes, "CODE", {});
			var code14_nodes = children(code14);
			t70 = claim_text(code14_nodes, "conic-gradient()");
			code14_nodes.forEach(detach);
			t71 = claim_text(li29_nodes, " and ");
			code15 = claim_element(li29_nodes, "CODE", {});
			var code15_nodes = children(code15);
			t72 = claim_text(code15_nodes, "repeating-conical-gradient()");
			code15_nodes.forEach(detach);
			t73 = claim_text(li29_nodes, "\nclockwise");
			li29_nodes.forEach(detach);
			ul4_nodes.forEach(detach);
			t74 = claim_space(section3_nodes);
			pre1 = claim_element(section3_nodes, "PRE", { class: true });
			var pre1_nodes = children(pre1);
			pre1_nodes.forEach(detach);
			section3_nodes.forEach(detach);
			t75 = claim_space(nodes);
			section4 = claim_element(nodes, "SECTION", {});
			var section4_nodes = children(section4);
			h23 = claim_element(section4_nodes, "H2", {});
			var h23_nodes = children(h23);
			a23 = claim_element(h23_nodes, "A", { href: true, id: true });
			var a23_nodes = children(a23);
			t76 = claim_text(a23_nodes, "3️⃣ ");
			code16 = claim_element(a23_nodes, "CODE", {});
			var code16_nodes = children(code16);
			t77 = claim_text(code16_nodes, "attr()");
			code16_nodes.forEach(detach);
			a23_nodes.forEach(detach);
			h23_nodes.forEach(detach);
			t78 = claim_space(section4_nodes);
			ul5 = claim_element(section4_nodes, "UL", {});
			var ul5_nodes = children(ul5);
			li30 = claim_element(ul5_nodes, "LI", {});
			var li30_nodes = children(li30);
			t79 = claim_text(li30_nodes, "allow you to read value from attribute of the element you are targeting");
			li30_nodes.forEach(detach);
			ul5_nodes.forEach(detach);
			t80 = claim_space(section4_nodes);
			pre2 = claim_element(section4_nodes, "PRE", { class: true });
			var pre2_nodes = children(pre2);
			pre2_nodes.forEach(detach);
			section4_nodes.forEach(detach);
			t81 = claim_space(nodes);
			section5 = claim_element(nodes, "SECTION", {});
			var section5_nodes = children(section5);
			h24 = claim_element(section5_nodes, "H2", {});
			var h24_nodes = children(h24);
			a24 = claim_element(h24_nodes, "A", { href: true, id: true });
			var a24_nodes = children(a24);
			t82 = claim_text(a24_nodes, "4️⃣ ");
			code17 = claim_element(a24_nodes, "CODE", {});
			var code17_nodes = children(code17);
			t83 = claim_text(code17_nodes, "var()");
			code17_nodes.forEach(detach);
			a24_nodes.forEach(detach);
			h24_nodes.forEach(detach);
			t84 = claim_space(section5_nodes);
			ul6 = claim_element(section5_nodes, "UL", {});
			var ul6_nodes = children(ul6);
			li31 = claim_element(ul6_nodes, "LI", {});
			var li31_nodes = children(li31);
			t85 = claim_text(li31_nodes, "allow you to insert value of the CSS Custom Property");
			li31_nodes.forEach(detach);
			ul6_nodes.forEach(detach);
			t86 = claim_space(section5_nodes);
			pre3 = claim_element(section5_nodes, "PRE", { class: true });
			var pre3_nodes = children(pre3);
			pre3_nodes.forEach(detach);
			section5_nodes.forEach(detach);
			t87 = claim_space(nodes);
			section6 = claim_element(nodes, "SECTION", {});
			var section6_nodes = children(section6);
			h25 = claim_element(section6_nodes, "H2", {});
			var h25_nodes = children(h25);
			a25 = claim_element(h25_nodes, "A", { href: true, id: true });
			var a25_nodes = children(a25);
			t88 = claim_text(a25_nodes, "5️⃣ ");
			code18 = claim_element(a25_nodes, "CODE", {});
			var code18_nodes = children(code18);
			t89 = claim_text(code18_nodes, "url()");
			code18_nodes.forEach(detach);
			a25_nodes.forEach(detach);
			h25_nodes.forEach(detach);
			t90 = claim_space(section6_nodes);
			ul7 = claim_element(section6_nodes, "UL", {});
			var ul7_nodes = children(ul7);
			li32 = claim_element(ul7_nodes, "LI", {});
			var li32_nodes = children(li32);
			t91 = claim_text(li32_nodes, "use for fetching assets");
			li32_nodes.forEach(detach);
			ul7_nodes.forEach(detach);
			t92 = claim_space(section6_nodes);
			pre4 = claim_element(section6_nodes, "PRE", { class: true });
			var pre4_nodes = children(pre4);
			pre4_nodes.forEach(detach);
			section6_nodes.forEach(detach);
			t93 = claim_space(nodes);
			section7 = claim_element(nodes, "SECTION", {});
			var section7_nodes = children(section7);
			h26 = claim_element(section7_nodes, "H2", {});
			var h26_nodes = children(h26);
			a26 = claim_element(h26_nodes, "A", { href: true, id: true });
			var a26_nodes = children(a26);
			t94 = claim_text(a26_nodes, "6️⃣ ");
			code19 = claim_element(a26_nodes, "CODE", {});
			var code19_nodes = children(code19);
			t95 = claim_text(code19_nodes, "image-set()");
			code19_nodes.forEach(detach);
			a26_nodes.forEach(detach);
			h26_nodes.forEach(detach);
			t96 = claim_space(section7_nodes);
			ul8 = claim_element(section7_nodes, "UL", {});
			var ul8_nodes = children(ul8);
			li33 = claim_element(ul8_nodes, "LI", {});
			var li33_nodes = children(li33);
			t97 = claim_text(li33_nodes, "grab image based on resolution");
			li33_nodes.forEach(detach);
			ul8_nodes.forEach(detach);
			t98 = claim_space(section7_nodes);
			pre5 = claim_element(section7_nodes, "PRE", { class: true });
			var pre5_nodes = children(pre5);
			pre5_nodes.forEach(detach);
			section7_nodes.forEach(detach);
			t99 = claim_space(nodes);
			section8 = claim_element(nodes, "SECTION", {});
			var section8_nodes = children(section8);
			h27 = claim_element(section8_nodes, "H2", {});
			var h27_nodes = children(h27);
			a27 = claim_element(h27_nodes, "A", { href: true, id: true });
			var a27_nodes = children(a27);
			t100 = claim_text(a27_nodes, "7️⃣ Functional Selectors");
			a27_nodes.forEach(detach);
			h27_nodes.forEach(detach);
			t101 = claim_space(section8_nodes);
			ul9 = claim_element(section8_nodes, "UL", {});
			var ul9_nodes = children(ul9);
			li34 = claim_element(ul9_nodes, "LI", {});
			var li34_nodes = children(li34);
			code20 = claim_element(li34_nodes, "CODE", {});
			var code20_nodes = children(code20);
			t102 = claim_text(code20_nodes, ":is()");
			code20_nodes.forEach(detach);
			t103 = claim_text(li34_nodes, ", ");
			code21 = claim_element(li34_nodes, "CODE", {});
			var code21_nodes = children(code21);
			t104 = claim_text(code21_nodes, ":where()");
			code21_nodes.forEach(detach);
			t105 = claim_space(li34_nodes);
			code22 = claim_element(li34_nodes, "CODE", {});
			var code22_nodes = children(code22);
			t106 = claim_text(code22_nodes, ":not()");
			code22_nodes.forEach(detach);
			t107 = claim_text(li34_nodes, ", ");
			code23 = claim_element(li34_nodes, "CODE", {});
			var code23_nodes = children(code23);
			t108 = claim_text(code23_nodes, ":lang()");
			code23_nodes.forEach(detach);
			t109 = claim_text(li34_nodes, ", ");
			code24 = claim_element(li34_nodes, "CODE", {});
			var code24_nodes = children(code24);
			t110 = claim_text(code24_nodes, ":dir()");
			code24_nodes.forEach(detach);
			t111 = claim_text(li34_nodes, ",");
			li34_nodes.forEach(detach);
			t112 = claim_space(ul9_nodes);
			li35 = claim_element(ul9_nodes, "LI", {});
			var li35_nodes = children(li35);
			code25 = claim_element(li35_nodes, "CODE", {});
			var code25_nodes = children(code25);
			t113 = claim_text(code25_nodes, "nth-child()");
			code25_nodes.forEach(detach);
			t114 = claim_text(li35_nodes, ", ");
			code26 = claim_element(li35_nodes, "CODE", {});
			var code26_nodes = children(code26);
			t115 = claim_text(code26_nodes, "nth-last-child()");
			code26_nodes.forEach(detach);
			t116 = claim_text(li35_nodes, ", ");
			code27 = claim_element(li35_nodes, "CODE", {});
			var code27_nodes = children(code27);
			t117 = claim_text(code27_nodes, "nth-of-type()");
			code27_nodes.forEach(detach);
			t118 = claim_text(li35_nodes, ", ");
			code28 = claim_element(li35_nodes, "CODE", {});
			var code28_nodes = children(code28);
			t119 = claim_text(code28_nodes, "nth-last-of-type()");
			code28_nodes.forEach(detach);
			li35_nodes.forEach(detach);
			t120 = claim_space(ul9_nodes);
			li36 = claim_element(ul9_nodes, "LI", {});
			var li36_nodes = children(li36);
			a28 = claim_element(li36_nodes, "A", { href: true, rel: true });
			var a28_nodes = children(a28);
			t121 = claim_text(a28_nodes, "see pseudo selectors");
			a28_nodes.forEach(detach);
			li36_nodes.forEach(detach);
			ul9_nodes.forEach(detach);
			section8_nodes.forEach(detach);
			t122 = claim_space(nodes);
			section9 = claim_element(nodes, "SECTION", {});
			var section9_nodes = children(section9);
			h28 = claim_element(section9_nodes, "H2", {});
			var h28_nodes = children(h28);
			a29 = claim_element(h28_nodes, "A", { href: true, id: true });
			var a29_nodes = children(a29);
			t123 = claim_text(a29_nodes, "8️⃣ Mathematical Functions");
			a29_nodes.forEach(detach);
			h28_nodes.forEach(detach);
			t124 = claim_space(section9_nodes);
			ul10 = claim_element(section9_nodes, "UL", {});
			var ul10_nodes = children(ul10);
			li37 = claim_element(ul10_nodes, "LI", {});
			var li37_nodes = children(li37);
			code29 = claim_element(li37_nodes, "CODE", {});
			var code29_nodes = children(code29);
			t125 = claim_text(code29_nodes, "calc()");
			code29_nodes.forEach(detach);
			t126 = claim_text(li37_nodes, ", ");
			code30 = claim_element(li37_nodes, "CODE", {});
			var code30_nodes = children(code30);
			t127 = claim_text(code30_nodes, "min()");
			code30_nodes.forEach(detach);
			t128 = claim_text(li37_nodes, ", ");
			code31 = claim_element(li37_nodes, "CODE", {});
			var code31_nodes = children(code31);
			t129 = claim_text(code31_nodes, "max()");
			code31_nodes.forEach(detach);
			t130 = claim_text(li37_nodes, ", ");
			code32 = claim_element(li37_nodes, "CODE", {});
			var code32_nodes = children(code32);
			t131 = claim_text(code32_nodes, "clamp()");
			code32_nodes.forEach(detach);
			li37_nodes.forEach(detach);
			ul10_nodes.forEach(detach);
			t132 = claim_space(section9_nodes);
			pre6 = claim_element(section9_nodes, "PRE", { class: true });
			var pre6_nodes = children(pre6);
			pre6_nodes.forEach(detach);
			section9_nodes.forEach(detach);
			t133 = claim_space(nodes);
			section10 = claim_element(nodes, "SECTION", {});
			var section10_nodes = children(section10);
			h29 = claim_element(section10_nodes, "H2", {});
			var h29_nodes = children(h29);
			a30 = claim_element(h29_nodes, "A", { href: true, id: true });
			var a30_nodes = children(a30);
			t134 = claim_text(a30_nodes, "9️⃣ Trigonometry Functions");
			a30_nodes.forEach(detach);
			h29_nodes.forEach(detach);
			t135 = claim_space(section10_nodes);
			ul11 = claim_element(section10_nodes, "UL", {});
			var ul11_nodes = children(ul11);
			li38 = claim_element(ul11_nodes, "LI", {});
			var li38_nodes = children(li38);
			code33 = claim_element(li38_nodes, "CODE", {});
			var code33_nodes = children(code33);
			t136 = claim_text(code33_nodes, "sin()");
			code33_nodes.forEach(detach);
			t137 = claim_text(li38_nodes, ", ");
			code34 = claim_element(li38_nodes, "CODE", {});
			var code34_nodes = children(code34);
			t138 = claim_text(code34_nodes, "cos()");
			code34_nodes.forEach(detach);
			t139 = claim_text(li38_nodes, ", ");
			code35 = claim_element(li38_nodes, "CODE", {});
			var code35_nodes = children(code35);
			t140 = claim_text(code35_nodes, "acos()");
			code35_nodes.forEach(detach);
			t141 = claim_text(li38_nodes, ", ");
			code36 = claim_element(li38_nodes, "CODE", {});
			var code36_nodes = children(code36);
			t142 = claim_text(code36_nodes, "asin()");
			code36_nodes.forEach(detach);
			t143 = claim_text(li38_nodes, ", ");
			code37 = claim_element(li38_nodes, "CODE", {});
			var code37_nodes = children(code37);
			t144 = claim_text(code37_nodes, "atan()");
			code37_nodes.forEach(detach);
			t145 = claim_text(li38_nodes, ", ");
			code38 = claim_element(li38_nodes, "CODE", {});
			var code38_nodes = children(code38);
			t146 = claim_text(code38_nodes, "atan2()");
			code38_nodes.forEach(detach);
			t147 = claim_text(li38_nodes, ", ");
			code39 = claim_element(li38_nodes, "CODE", {});
			var code39_nodes = children(code39);
			t148 = claim_text(code39_nodes, "sqrt()");
			code39_nodes.forEach(detach);
			t149 = claim_text(li38_nodes, ", ");
			code40 = claim_element(li38_nodes, "CODE", {});
			var code40_nodes = children(code40);
			t150 = claim_text(code40_nodes, "hypot()");
			code40_nodes.forEach(detach);
			t151 = claim_text(li38_nodes, ", ");
			code41 = claim_element(li38_nodes, "CODE", {});
			var code41_nodes = children(code41);
			t152 = claim_text(code41_nodes, "pow()");
			code41_nodes.forEach(detach);
			li38_nodes.forEach(detach);
			ul11_nodes.forEach(detach);
			section10_nodes.forEach(detach);
			t153 = claim_space(nodes);
			section11 = claim_element(nodes, "SECTION", {});
			var section11_nodes = children(section11);
			h210 = claim_element(section11_nodes, "H2", {});
			var h210_nodes = children(h210);
			a31 = claim_element(h210_nodes, "A", { href: true, id: true });
			var a31_nodes = children(a31);
			t154 = claim_text(a31_nodes, "1️⃣0️⃣ ");
			code42 = claim_element(a31_nodes, "CODE", {});
			var code42_nodes = children(code42);
			t155 = claim_text(code42_nodes, "cubic-bezier()");
			code42_nodes.forEach(detach);
			a31_nodes.forEach(detach);
			h210_nodes.forEach(detach);
			t156 = claim_space(section11_nodes);
			ul12 = claim_element(section11_nodes, "UL", {});
			var ul12_nodes = children(ul12);
			li39 = claim_element(ul12_nodes, "LI", {});
			var li39_nodes = children(li39);
			t157 = claim_text(li39_nodes, "@wgao19's ");
			a32 = claim_element(li39_nodes, "A", { href: true, rel: true });
			var a32_nodes = children(a32);
			t158 = claim_text(a32_nodes, "article");
			a32_nodes.forEach(detach);
			t159 = claim_text(li39_nodes, " and ");
			a33 = claim_element(li39_nodes, "A", { href: true, rel: true });
			var a33_nodes = children(a33);
			t160 = claim_text(a33_nodes, "talk");
			a33_nodes.forEach(detach);
			t161 = claim_text(li39_nodes, " on bezier curves");
			li39_nodes.forEach(detach);
			ul12_nodes.forEach(detach);
			t162 = claim_space(section11_nodes);
			pre7 = claim_element(section11_nodes, "PRE", { class: true });
			var pre7_nodes = children(pre7);
			pre7_nodes.forEach(detach);
			section11_nodes.forEach(detach);
			t163 = claim_space(nodes);
			section12 = claim_element(nodes, "SECTION", {});
			var section12_nodes = children(section12);
			h211 = claim_element(section12_nodes, "H2", {});
			var h211_nodes = children(h211);
			a34 = claim_element(h211_nodes, "A", { href: true, id: true });
			var a34_nodes = children(a34);
			t164 = claim_text(a34_nodes, "1️⃣1️⃣ ");
			code43 = claim_element(a34_nodes, "CODE", {});
			var code43_nodes = children(code43);
			t165 = claim_text(code43_nodes, "steps()");
			code43_nodes.forEach(detach);
			a34_nodes.forEach(detach);
			h211_nodes.forEach(detach);
			t166 = claim_space(section12_nodes);
			ul13 = claim_element(section12_nodes, "UL", {});
			var ul13_nodes = children(ul13);
			li40 = claim_element(ul13_nodes, "LI", {});
			var li40_nodes = children(li40);
			t167 = claim_text(li40_nodes, "divide the output value into equal distance steps.");
			li40_nodes.forEach(detach);
			t168 = claim_space(ul13_nodes);
			li41 = claim_element(ul13_nodes, "LI", {});
			var li41_nodes = children(li41);
			t169 = claim_text(li41_nodes, "useful for animating sprites");
			li41_nodes.forEach(detach);
			ul13_nodes.forEach(detach);
			t170 = claim_space(section12_nodes);
			pre8 = claim_element(section12_nodes, "PRE", { class: true });
			var pre8_nodes = children(pre8);
			pre8_nodes.forEach(detach);
			section12_nodes.forEach(detach);
			t171 = claim_space(nodes);
			section13 = claim_element(nodes, "SECTION", {});
			var section13_nodes = children(section13);
			h212 = claim_element(section13_nodes, "H2", {});
			var h212_nodes = children(h212);
			a35 = claim_element(h212_nodes, "A", { href: true, id: true });
			var a35_nodes = children(a35);
			t172 = claim_text(a35_nodes, "1️⃣2️⃣ Shape Functions");
			a35_nodes.forEach(detach);
			h212_nodes.forEach(detach);
			t173 = claim_space(section13_nodes);
			ul14 = claim_element(section13_nodes, "UL", {});
			var ul14_nodes = children(ul14);
			li42 = claim_element(ul14_nodes, "LI", {});
			var li42_nodes = children(li42);
			code44 = claim_element(li42_nodes, "CODE", {});
			var code44_nodes = children(code44);
			t174 = claim_text(code44_nodes, "path()");
			code44_nodes.forEach(detach);
			t175 = claim_text(li42_nodes, ", ");
			code45 = claim_element(li42_nodes, "CODE", {});
			var code45_nodes = children(code45);
			t176 = claim_text(code45_nodes, "circle()");
			code45_nodes.forEach(detach);
			t177 = claim_text(li42_nodes, ", ");
			code46 = claim_element(li42_nodes, "CODE", {});
			var code46_nodes = children(code46);
			t178 = claim_text(code46_nodes, "ellipse()");
			code46_nodes.forEach(detach);
			t179 = claim_text(li42_nodes, ", ");
			code47 = claim_element(li42_nodes, "CODE", {});
			var code47_nodes = children(code47);
			t180 = claim_text(code47_nodes, "polygon()");
			code47_nodes.forEach(detach);
			t181 = claim_text(li42_nodes, ", ");
			code48 = claim_element(li42_nodes, "CODE", {});
			var code48_nodes = children(code48);
			t182 = claim_text(code48_nodes, "inset()");
			code48_nodes.forEach(detach);
			li42_nodes.forEach(detach);
			ul14_nodes.forEach(detach);
			t183 = claim_space(section13_nodes);
			pre9 = claim_element(section13_nodes, "PRE", { class: true });
			var pre9_nodes = children(pre9);
			pre9_nodes.forEach(detach);
			section13_nodes.forEach(detach);
			t184 = claim_space(nodes);
			section14 = claim_element(nodes, "SECTION", {});
			var section14_nodes = children(section14);
			h213 = claim_element(section14_nodes, "H2", {});
			var h213_nodes = children(h213);
			a36 = claim_element(h213_nodes, "A", { href: true, id: true });
			var a36_nodes = children(a36);
			t185 = claim_text(a36_nodes, "1️⃣3️⃣ Transform Functions");
			a36_nodes.forEach(detach);
			h213_nodes.forEach(detach);
			t186 = claim_space(section14_nodes);
			ul15 = claim_element(section14_nodes, "UL", {});
			var ul15_nodes = children(ul15);
			li43 = claim_element(ul15_nodes, "LI", {});
			var li43_nodes = children(li43);
			t187 = claim_text(li43_nodes, "scaleX(), scaleY(), scaleZ(), scale(), scale3d()");
			li43_nodes.forEach(detach);
			t188 = claim_space(ul15_nodes);
			li44 = claim_element(ul15_nodes, "LI", {});
			var li44_nodes = children(li44);
			t189 = claim_text(li44_nodes, "perspective()");
			li44_nodes.forEach(detach);
			t190 = claim_space(ul15_nodes);
			li45 = claim_element(ul15_nodes, "LI", {});
			var li45_nodes = children(li45);
			t191 = claim_text(li45_nodes, "translateX(), translateY(), translateZ(), translate(), translate3d()");
			li45_nodes.forEach(detach);
			t192 = claim_space(ul15_nodes);
			li46 = claim_element(ul15_nodes, "LI", {});
			var li46_nodes = children(li46);
			t193 = claim_text(li46_nodes, "rotateX(), rotateY(), rotateZ(), rotate(), rotate3d()");
			li46_nodes.forEach(detach);
			t194 = claim_space(ul15_nodes);
			li47 = claim_element(ul15_nodes, "LI", {});
			var li47_nodes = children(li47);
			t195 = claim_text(li47_nodes, "skewX(), skewY(), skew()");
			li47_nodes.forEach(detach);
			ul15_nodes.forEach(detach);
			section14_nodes.forEach(detach);
			t196 = claim_space(nodes);
			section15 = claim_element(nodes, "SECTION", {});
			var section15_nodes = children(section15);
			h214 = claim_element(section15_nodes, "H2", {});
			var h214_nodes = children(h214);
			a37 = claim_element(h214_nodes, "A", { href: true, id: true });
			var a37_nodes = children(a37);
			t197 = claim_text(a37_nodes, "1️⃣4️⃣ Filter Functions");
			a37_nodes.forEach(detach);
			h214_nodes.forEach(detach);
			t198 = claim_space(section15_nodes);
			ul16 = claim_element(section15_nodes, "UL", {});
			var ul16_nodes = children(ul16);
			li48 = claim_element(ul16_nodes, "LI", {});
			var li48_nodes = children(li48);
			t199 = claim_text(li48_nodes, "blur(), brightness(), contrast(), grayscale(), hue-rotate(), invert(), opacity(), saturate(), sepia(), drop-shadow(), url()");
			li48_nodes.forEach(detach);
			ul16_nodes.forEach(detach);
			t200 = claim_space(section15_nodes);
			pre10 = claim_element(section15_nodes, "PRE", { class: true });
			var pre10_nodes = children(pre10);
			pre10_nodes.forEach(detach);
			section15_nodes.forEach(detach);
			t201 = claim_space(nodes);
			section16 = claim_element(nodes, "SECTION", {});
			var section16_nodes = children(section16);
			h215 = claim_element(section16_nodes, "H2", {});
			var h215_nodes = children(h215);
			a38 = claim_element(h215_nodes, "A", { href: true, id: true });
			var a38_nodes = children(a38);
			t202 = claim_text(a38_nodes, "1️⃣5️⃣ Grid Template Functions");
			a38_nodes.forEach(detach);
			h215_nodes.forEach(detach);
			t203 = claim_space(section16_nodes);
			ul17 = claim_element(section16_nodes, "UL", {});
			var ul17_nodes = children(ul17);
			li49 = claim_element(ul17_nodes, "LI", {});
			var li49_nodes = children(li49);
			code49 = claim_element(li49_nodes, "CODE", {});
			var code49_nodes = children(code49);
			t204 = claim_text(code49_nodes, "fit-content()");
			code49_nodes.forEach(detach);
			t205 = claim_text(li49_nodes, ", ");
			code50 = claim_element(li49_nodes, "CODE", {});
			var code50_nodes = children(code50);
			t206 = claim_text(code50_nodes, "min-max()");
			code50_nodes.forEach(detach);
			t207 = claim_text(li49_nodes, ", ");
			code51 = claim_element(li49_nodes, "CODE", {});
			var code51_nodes = children(code51);
			t208 = claim_text(code51_nodes, "repeat()");
			code51_nodes.forEach(detach);
			li49_nodes.forEach(detach);
			ul17_nodes.forEach(detach);
			section16_nodes.forEach(detach);
			t209 = claim_space(nodes);
			section17 = claim_element(nodes, "SECTION", {});
			var section17_nodes = children(section17);
			h216 = claim_element(section17_nodes, "H2", {});
			var h216_nodes = children(h216);
			a39 = claim_element(h216_nodes, "A", { href: true, id: true });
			var a39_nodes = children(a39);
			t210 = claim_text(a39_nodes, "1️⃣6️⃣ Media Queries");
			a39_nodes.forEach(detach);
			h216_nodes.forEach(detach);
			t211 = claim_space(section17_nodes);
			ul18 = claim_element(section17_nodes, "UL", {});
			var ul18_nodes = children(ul18);
			li50 = claim_element(ul18_nodes, "LI", {});
			var li50_nodes = children(li50);
			t212 = claim_text(li50_nodes, "@media");
			li50_nodes.forEach(detach);
			t213 = claim_space(ul18_nodes);
			li51 = claim_element(ul18_nodes, "LI", {});
			var li51_nodes = children(li51);
			t214 = claim_text(li51_nodes, "@support");
			li51_nodes.forEach(detach);
			ul18_nodes.forEach(detach);
			t215 = claim_space(section17_nodes);
			pre11 = claim_element(section17_nodes, "PRE", { class: true });
			var pre11_nodes = children(pre11);
			pre11_nodes.forEach(detach);
			section17_nodes.forEach(detach);
			t216 = claim_space(nodes);
			section18 = claim_element(nodes, "SECTION", {});
			var section18_nodes = children(section18);
			h217 = claim_element(section18_nodes, "H2", {});
			var h217_nodes = children(h217);
			a40 = claim_element(h217_nodes, "A", { href: true, id: true });
			var a40_nodes = children(a40);
			t217 = claim_text(a40_nodes, "1️⃣7️⃣ Vulnerabilities");
			a40_nodes.forEach(detach);
			h217_nodes.forEach(detach);
			t218 = claim_space(section18_nodes);
			ul19 = claim_element(section18_nodes, "UL", {});
			var ul19_nodes = children(ul19);
			li52 = claim_element(ul19_nodes, "LI", {});
			var li52_nodes = children(li52);
			t219 = claim_text(li52_nodes, "Billion Laughs Attack (");
			a41 = claim_element(li52_nodes, "A", { href: true, rel: true });
			var a41_nodes = children(a41);
			t220 = claim_text(a41_nodes, "https://drafts.csswg.org/css-variables/#long-variables");
			a41_nodes.forEach(detach);
			t221 = claim_text(li52_nodes, ")");
			li52_nodes.forEach(detach);
			t222 = claim_space(ul19_nodes);
			li53 = claim_element(ul19_nodes, "LI", {});
			var li53_nodes = children(li53);
			t223 = claim_text(li53_nodes, "XSS through ");
			code52 = claim_element(li53_nodes, "CODE", {});
			var code52_nodes = children(code52);
			t224 = claim_text(code52_nodes, "url()");
			code52_nodes.forEach(detach);
			t225 = claim_text(li53_nodes, " + ");
			code53 = claim_element(li53_nodes, "CODE", {});
			var code53_nodes = children(code53);
			t226 = claim_text(code53_nodes, "attr()");
			code53_nodes.forEach(detach);
			li53_nodes.forEach(detach);
			t227 = claim_space(ul19_nodes);
			li54 = claim_element(ul19_nodes, "LI", {});
			var li54_nodes = children(li54);
			a42 = claim_element(li54_nodes, "A", { href: true, rel: true });
			var a42_nodes = children(a42);
			t228 = claim_text(a42_nodes, "Third party CSS is not safe");
			a42_nodes.forEach(detach);
			li54_nodes.forEach(detach);
			ul19_nodes.forEach(detach);
			t229 = claim_space(section18_nodes);
			pre12 = claim_element(section18_nodes, "PRE", { class: true });
			var pre12_nodes = children(pre12);
			pre12_nodes.forEach(detach);
			section18_nodes.forEach(detach);
			this.h();
		},
		h() {
			attr(a0, "href", "#css-functions");
			attr(a1, "href", "#color-functions");
			attr(a2, "href", "#gradient-functions");
			attr(a3, "href", "#attr");
			attr(a4, "href", "#var");
			attr(a5, "href", "#url");
			attr(a6, "href", "#image-set");
			attr(a7, "href", "#functional-selectors");
			attr(a8, "href", "#mathematical-functions");
			attr(a9, "href", "#trigonometry-functions");
			attr(a10, "href", "#cubic-bezier");
			attr(a11, "href", "#steps");
			attr(a12, "href", "#shape-functions");
			attr(a13, "href", "#transform-functions");
			attr(a14, "href", "#filter-functions");
			attr(a15, "href", "#grid-template-functions");
			attr(a16, "href", "#media-queries");
			attr(a17, "href", "#vulnerabilities");
			attr(ul0, "class", "sitemap");
			attr(ul0, "id", "sitemap");
			attr(ul0, "role", "navigation");
			attr(ul0, "aria-label", "Table of Contents");
			attr(a18, "href", "#css-functions");
			attr(a18, "id", "css-functions");
			attr(a19, "href", "#color-functions");
			attr(a19, "id", "color-functions");
			attr(a20, "href", "https://www.w3.org/TR/css-color-4/#icc-colors");
			attr(a20, "rel", "nofollow");
			attr(a21, "href", "https://css-tricks.com/no-comma-color-functions-in-css/");
			attr(a21, "rel", "nofollow");
			attr(pre0, "class", "language-css");
			attr(a22, "href", "#gradient-functions");
			attr(a22, "id", "gradient-functions");
			attr(pre1, "class", "language-css");
			attr(a23, "href", "#attr");
			attr(a23, "id", "attr");
			attr(pre2, "class", "language-html");
			attr(a24, "href", "#var");
			attr(a24, "id", "var");
			attr(pre3, "class", "language-css");
			attr(a25, "href", "#url");
			attr(a25, "id", "url");
			attr(pre4, "class", "language-css");
			attr(a26, "href", "#image-set");
			attr(a26, "id", "image-set");
			attr(pre5, "class", "language-css");
			attr(a27, "href", "#functional-selectors");
			attr(a27, "id", "functional-selectors");
			attr(a28, "href", "https://twitter.com/lihautan/status/1278189274114842624?s=20");
			attr(a28, "rel", "nofollow");
			attr(a29, "href", "#mathematical-functions");
			attr(a29, "id", "mathematical-functions");
			attr(pre6, "class", "language-css");
			attr(a30, "href", "#trigonometry-functions");
			attr(a30, "id", "trigonometry-functions");
			attr(a31, "href", "#cubic-bezier");
			attr(a31, "id", "cubic-bezier");
			attr(a32, "href", "https://dev.wgao19.cc/cubic-bezier/");
			attr(a32, "rel", "nofollow");
			attr(a33, "href", "https://engineers.sg/video/the-obscurities-of-bezier-curves-explained-to-my-computer-engineer-friends-talk-css-52--4057");
			attr(a33, "rel", "nofollow");
			attr(pre7, "class", "language-css");
			attr(a34, "href", "#steps");
			attr(a34, "id", "steps");
			attr(pre8, "class", "language-css");
			attr(a35, "href", "#shape-functions");
			attr(a35, "id", "shape-functions");
			attr(pre9, "class", "language-css");
			attr(a36, "href", "#transform-functions");
			attr(a36, "id", "transform-functions");
			attr(a37, "href", "#filter-functions");
			attr(a37, "id", "filter-functions");
			attr(pre10, "class", "language-css");
			attr(a38, "href", "#grid-template-functions");
			attr(a38, "id", "grid-template-functions");
			attr(a39, "href", "#media-queries");
			attr(a39, "id", "media-queries");
			attr(pre11, "class", "language-css");
			attr(a40, "href", "#vulnerabilities");
			attr(a40, "id", "vulnerabilities");
			attr(a41, "href", "https://drafts.csswg.org/css-variables/#long-variables");
			attr(a41, "rel", "nofollow");
			attr(a42, "href", "https://jakearchibald.com/2018/third-party-css-is-not-safe/");
			attr(a42, "rel", "nofollow");
			attr(pre12, "class", "language-css");
		},
		m(target, anchor) {
			insert(target, section0, anchor);
			append(section0, ul0);
			append(ul0, li0);
			append(li0, a0);
			append(a0, t0);
			append(ul0, li1);
			append(li1, a1);
			append(a1, t1);
			append(ul0, li2);
			append(li2, a2);
			append(a2, t2);
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
			append(ul0, li13);
			append(li13, a13);
			append(a13, t13);
			append(ul0, li14);
			append(li14, a14);
			append(a14, t14);
			append(ul0, li15);
			append(li15, a15);
			append(a15, t15);
			append(ul0, li16);
			append(li16, a16);
			append(a16, t16);
			append(ul0, li17);
			append(li17, a17);
			append(a17, t17);
			insert(target, t18, anchor);
			insert(target, section1, anchor);
			append(section1, h20);
			append(h20, a18);
			append(a18, t19);
			append(section1, t20);
			append(section1, p);
			append(p, t21);
			append(section1, t22);
			append(section1, ul1);
			append(ul1, li18);
			append(li18, t23);
			append(ul1, t24);
			append(ul1, li19);
			append(li19, t25);
			append(ul1, t26);
			append(ul1, li20);
			append(li20, t27);
			append(li20, code0);
			append(code0, t28);
			append(li20, t29);
			append(ul1, t30);
			append(ul1, li21);
			append(li21, t31);
			append(li21, code1);
			append(code1, t32);
			append(ul1, t33);
			append(ul1, li22);
			append(li22, t34);
			append(ul1, t35);
			append(ul1, li23);
			append(li23, t36);
			append(li23, code2);
			append(code2, t37);
			insert(target, t38, anchor);
			insert(target, section2, anchor);
			append(section2, h21);
			append(h21, a19);
			append(a19, t39);
			append(section2, t40);
			append(section2, ul2);
			append(ul2, li24);
			append(li24, code3);
			append(code3, t41);
			append(li24, t42);
			append(li24, code4);
			append(code4, t43);
			append(li24, t44);
			append(li24, code5);
			append(code5, t45);
			append(li24, t46);
			append(li24, code6);
			append(code6, t47);
			append(li24, t48);
			append(li24, code7);
			append(code7, t49);
			append(li24, t50);
			append(li24, code8);
			append(code8, t51);
			append(ul2, t52);
			append(ul2, li25);
			append(li25, a20);
			append(a20, code9);
			append(code9, t53);
			append(section2, t54);
			append(section2, ul3);
			append(ul3, li26);
			append(li26, a21);
			append(a21, t55);
			append(section2, t56);
			append(section2, pre0);
			pre0.innerHTML = raw0_value;
			insert(target, t57, anchor);
			insert(target, section3, anchor);
			append(section3, h22);
			append(h22, a22);
			append(a22, t58);
			append(section3, t59);
			append(section3, ul4);
			append(ul4, li27);
			append(li27, code10);
			append(code10, t60);
			append(li27, t61);
			append(li27, code11);
			append(code11, t62);
			append(li27, t63);
			append(ul4, t64);
			append(ul4, li28);
			append(li28, code12);
			append(code12, t65);
			append(li28, t66);
			append(li28, code13);
			append(code13, t67);
			append(li28, t68);
			append(ul4, t69);
			append(ul4, li29);
			append(li29, code14);
			append(code14, t70);
			append(li29, t71);
			append(li29, code15);
			append(code15, t72);
			append(li29, t73);
			append(section3, t74);
			append(section3, pre1);
			pre1.innerHTML = raw1_value;
			insert(target, t75, anchor);
			insert(target, section4, anchor);
			append(section4, h23);
			append(h23, a23);
			append(a23, t76);
			append(a23, code16);
			append(code16, t77);
			append(section4, t78);
			append(section4, ul5);
			append(ul5, li30);
			append(li30, t79);
			append(section4, t80);
			append(section4, pre2);
			pre2.innerHTML = raw2_value;
			insert(target, t81, anchor);
			insert(target, section5, anchor);
			append(section5, h24);
			append(h24, a24);
			append(a24, t82);
			append(a24, code17);
			append(code17, t83);
			append(section5, t84);
			append(section5, ul6);
			append(ul6, li31);
			append(li31, t85);
			append(section5, t86);
			append(section5, pre3);
			pre3.innerHTML = raw3_value;
			insert(target, t87, anchor);
			insert(target, section6, anchor);
			append(section6, h25);
			append(h25, a25);
			append(a25, t88);
			append(a25, code18);
			append(code18, t89);
			append(section6, t90);
			append(section6, ul7);
			append(ul7, li32);
			append(li32, t91);
			append(section6, t92);
			append(section6, pre4);
			pre4.innerHTML = raw4_value;
			insert(target, t93, anchor);
			insert(target, section7, anchor);
			append(section7, h26);
			append(h26, a26);
			append(a26, t94);
			append(a26, code19);
			append(code19, t95);
			append(section7, t96);
			append(section7, ul8);
			append(ul8, li33);
			append(li33, t97);
			append(section7, t98);
			append(section7, pre5);
			pre5.innerHTML = raw5_value;
			insert(target, t99, anchor);
			insert(target, section8, anchor);
			append(section8, h27);
			append(h27, a27);
			append(a27, t100);
			append(section8, t101);
			append(section8, ul9);
			append(ul9, li34);
			append(li34, code20);
			append(code20, t102);
			append(li34, t103);
			append(li34, code21);
			append(code21, t104);
			append(li34, t105);
			append(li34, code22);
			append(code22, t106);
			append(li34, t107);
			append(li34, code23);
			append(code23, t108);
			append(li34, t109);
			append(li34, code24);
			append(code24, t110);
			append(li34, t111);
			append(ul9, t112);
			append(ul9, li35);
			append(li35, code25);
			append(code25, t113);
			append(li35, t114);
			append(li35, code26);
			append(code26, t115);
			append(li35, t116);
			append(li35, code27);
			append(code27, t117);
			append(li35, t118);
			append(li35, code28);
			append(code28, t119);
			append(ul9, t120);
			append(ul9, li36);
			append(li36, a28);
			append(a28, t121);
			insert(target, t122, anchor);
			insert(target, section9, anchor);
			append(section9, h28);
			append(h28, a29);
			append(a29, t123);
			append(section9, t124);
			append(section9, ul10);
			append(ul10, li37);
			append(li37, code29);
			append(code29, t125);
			append(li37, t126);
			append(li37, code30);
			append(code30, t127);
			append(li37, t128);
			append(li37, code31);
			append(code31, t129);
			append(li37, t130);
			append(li37, code32);
			append(code32, t131);
			append(section9, t132);
			append(section9, pre6);
			pre6.innerHTML = raw6_value;
			insert(target, t133, anchor);
			insert(target, section10, anchor);
			append(section10, h29);
			append(h29, a30);
			append(a30, t134);
			append(section10, t135);
			append(section10, ul11);
			append(ul11, li38);
			append(li38, code33);
			append(code33, t136);
			append(li38, t137);
			append(li38, code34);
			append(code34, t138);
			append(li38, t139);
			append(li38, code35);
			append(code35, t140);
			append(li38, t141);
			append(li38, code36);
			append(code36, t142);
			append(li38, t143);
			append(li38, code37);
			append(code37, t144);
			append(li38, t145);
			append(li38, code38);
			append(code38, t146);
			append(li38, t147);
			append(li38, code39);
			append(code39, t148);
			append(li38, t149);
			append(li38, code40);
			append(code40, t150);
			append(li38, t151);
			append(li38, code41);
			append(code41, t152);
			insert(target, t153, anchor);
			insert(target, section11, anchor);
			append(section11, h210);
			append(h210, a31);
			append(a31, t154);
			append(a31, code42);
			append(code42, t155);
			append(section11, t156);
			append(section11, ul12);
			append(ul12, li39);
			append(li39, t157);
			append(li39, a32);
			append(a32, t158);
			append(li39, t159);
			append(li39, a33);
			append(a33, t160);
			append(li39, t161);
			append(section11, t162);
			append(section11, pre7);
			pre7.innerHTML = raw7_value;
			insert(target, t163, anchor);
			insert(target, section12, anchor);
			append(section12, h211);
			append(h211, a34);
			append(a34, t164);
			append(a34, code43);
			append(code43, t165);
			append(section12, t166);
			append(section12, ul13);
			append(ul13, li40);
			append(li40, t167);
			append(ul13, t168);
			append(ul13, li41);
			append(li41, t169);
			append(section12, t170);
			append(section12, pre8);
			pre8.innerHTML = raw8_value;
			insert(target, t171, anchor);
			insert(target, section13, anchor);
			append(section13, h212);
			append(h212, a35);
			append(a35, t172);
			append(section13, t173);
			append(section13, ul14);
			append(ul14, li42);
			append(li42, code44);
			append(code44, t174);
			append(li42, t175);
			append(li42, code45);
			append(code45, t176);
			append(li42, t177);
			append(li42, code46);
			append(code46, t178);
			append(li42, t179);
			append(li42, code47);
			append(code47, t180);
			append(li42, t181);
			append(li42, code48);
			append(code48, t182);
			append(section13, t183);
			append(section13, pre9);
			pre9.innerHTML = raw9_value;
			insert(target, t184, anchor);
			insert(target, section14, anchor);
			append(section14, h213);
			append(h213, a36);
			append(a36, t185);
			append(section14, t186);
			append(section14, ul15);
			append(ul15, li43);
			append(li43, t187);
			append(ul15, t188);
			append(ul15, li44);
			append(li44, t189);
			append(ul15, t190);
			append(ul15, li45);
			append(li45, t191);
			append(ul15, t192);
			append(ul15, li46);
			append(li46, t193);
			append(ul15, t194);
			append(ul15, li47);
			append(li47, t195);
			insert(target, t196, anchor);
			insert(target, section15, anchor);
			append(section15, h214);
			append(h214, a37);
			append(a37, t197);
			append(section15, t198);
			append(section15, ul16);
			append(ul16, li48);
			append(li48, t199);
			append(section15, t200);
			append(section15, pre10);
			pre10.innerHTML = raw10_value;
			insert(target, t201, anchor);
			insert(target, section16, anchor);
			append(section16, h215);
			append(h215, a38);
			append(a38, t202);
			append(section16, t203);
			append(section16, ul17);
			append(ul17, li49);
			append(li49, code49);
			append(code49, t204);
			append(li49, t205);
			append(li49, code50);
			append(code50, t206);
			append(li49, t207);
			append(li49, code51);
			append(code51, t208);
			insert(target, t209, anchor);
			insert(target, section17, anchor);
			append(section17, h216);
			append(h216, a39);
			append(a39, t210);
			append(section17, t211);
			append(section17, ul18);
			append(ul18, li50);
			append(li50, t212);
			append(ul18, t213);
			append(ul18, li51);
			append(li51, t214);
			append(section17, t215);
			append(section17, pre11);
			pre11.innerHTML = raw11_value;
			insert(target, t216, anchor);
			insert(target, section18, anchor);
			append(section18, h217);
			append(h217, a40);
			append(a40, t217);
			append(section18, t218);
			append(section18, ul19);
			append(ul19, li52);
			append(li52, t219);
			append(li52, a41);
			append(a41, t220);
			append(li52, t221);
			append(ul19, t222);
			append(ul19, li53);
			append(li53, t223);
			append(li53, code52);
			append(code52, t224);
			append(li53, t225);
			append(li53, code53);
			append(code53, t226);
			append(ul19, t227);
			append(ul19, li54);
			append(li54, a42);
			append(a42, t228);
			append(section18, t229);
			append(section18, pre12);
			pre12.innerHTML = raw12_value;
		},
		p: noop,
		d(detaching) {
			if (detaching) detach(section0);
			if (detaching) detach(t18);
			if (detaching) detach(section1);
			if (detaching) detach(t38);
			if (detaching) detach(section2);
			if (detaching) detach(t57);
			if (detaching) detach(section3);
			if (detaching) detach(t75);
			if (detaching) detach(section4);
			if (detaching) detach(t81);
			if (detaching) detach(section5);
			if (detaching) detach(t87);
			if (detaching) detach(section6);
			if (detaching) detach(t93);
			if (detaching) detach(section7);
			if (detaching) detach(t99);
			if (detaching) detach(section8);
			if (detaching) detach(t122);
			if (detaching) detach(section9);
			if (detaching) detach(t133);
			if (detaching) detach(section10);
			if (detaching) detach(t153);
			if (detaching) detach(section11);
			if (detaching) detach(t163);
			if (detaching) detach(section12);
			if (detaching) detach(t171);
			if (detaching) detach(section13);
			if (detaching) detach(t184);
			if (detaching) detach(section14);
			if (detaching) detach(t196);
			if (detaching) detach(section15);
			if (detaching) detach(t201);
			if (detaching) detach(section16);
			if (detaching) detach(t209);
			if (detaching) detach(section17);
			if (detaching) detach(t216);
			if (detaching) detach(section18);
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
	"title": "The CSS Podcast: 020: Functions",
	"tags": ["css functions", "The CSS Podcast"],
	"slug": "notes/css-podcast-020-functions",
	"type": "notes",
	"name": "css-podcast-020-functions",
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
