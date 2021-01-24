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

var baseCss = "https://lihautan.com/notes/lead-dev/assets/blog-base-248115e4.css";

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
			attr(meta8, "content", "https%3A%2F%2Flihautan.com%2Fnotes%2Flead-dev");
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
	let ul4;
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
	let ul1;
	let li4;
	let a4;
	let t4;
	let li5;
	let a5;
	let t5;
	let ul0;
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
	let ul3;
	let li10;
	let a10;
	let t10;
	let li11;
	let a11;
	let t11;
	let ul2;
	let li12;
	let a12;
	let t12;
	let li13;
	let a13;
	let t13;
	let t14;
	let section1;
	let h20;
	let a14;
	let t15;
	let t16;
	let p0;
	let a15;
	let t17;
	let t18;
	let ul5;
	let li14;
	let p1;
	let a16;
	let t19;
	let t20;
	let li15;
	let p2;
	let t21;
	let t22;
	let li16;
	let p3;
	let strong0;
	let t23;
	let t24;
	let t25;
	let li17;
	let p4;
	let t26;
	let t27;
	let p5;
	let t28;
	let t29;
	let ul6;
	let li18;
	let t30;
	let t31;
	let li19;
	let t32;
	let t33;
	let li20;
	let t34;
	let t35;
	let p6;
	let t36;
	let t37;
	let ul8;
	let li21;
	let t38;
	let t39;
	let li22;
	let t40;
	let t41;
	let li25;
	let t42;
	let ul7;
	let li23;
	let t43;
	let t44;
	let li24;
	let t45;
	let t46;
	let li26;
	let t47;
	let t48;
	let section2;
	let h21;
	let a17;
	let t49;
	let t50;
	let p7;
	let a18;
	let t51;
	let t52;
	let ul10;
	let li28;
	let strong1;
	let t53;
	let ul9;
	let li27;
	let t54;
	let t55;
	let ol0;
	let li32;
	let t56;
	let ul11;
	let li29;
	let t57;
	let t58;
	let li30;
	let t59;
	let t60;
	let li31;
	let t61;
	let t62;
	let li35;
	let t63;
	let ul12;
	let li33;
	let t64;
	let t65;
	let li34;
	let t66;
	let t67;
	let li37;
	let t68;
	let ul13;
	let li36;
	let t69;
	let t70;
	let li40;
	let t71;
	let ul14;
	let li38;
	let t72;
	let t73;
	let li39;
	let strong2;
	let t74;
	let t75;
	let t76;
	let li41;
	let t77;
	let t78;
	let li43;
	let t79;
	let ul15;
	let li42;
	let t80;
	let t81;
	let li45;
	let t82;
	let ul16;
	let li44;
	let t83;
	let t84;
	let li47;
	let t85;
	let ul17;
	let li46;
	let t86;
	let t87;
	let li52;
	let t88;
	let ul18;
	let li48;
	let t89;
	let t90;
	let li49;
	let t91;
	let t92;
	let li50;
	let t93;
	let t94;
	let li51;
	let t95;
	let t96;
	let li53;
	let t97;
	let t98;
	let section3;
	let h22;
	let a19;
	let t99;
	let t100;
	let p8;
	let a20;
	let t101;
	let t102;
	let ul19;
	let li54;
	let t103;
	let t104;
	let ol1;
	let li56;
	let t105;
	let ul20;
	let li55;
	let t106;
	let t107;
	let li57;
	let t108;
	let t109;
	let li59;
	let t110;
	let ul21;
	let li58;
	let t111;
	let t112;
	let li61;
	let t113;
	let ul22;
	let li60;
	let t114;
	let t115;
	let blockquote;
	let p9;
	let t116;
	let t117;
	let section4;
	let h23;
	let a21;
	let t118;
	let t119;
	let p10;
	let a22;
	let t120;
	let t121;
	let section5;
	let h30;
	let a23;
	let t122;
	let t123;
	let ul25;
	let li62;
	let t124;
	let t125;
	let li63;
	let t126;
	let t127;
	let li64;
	let t128;
	let t129;
	let li71;
	let t130;
	let ul24;
	let li65;
	let t131;
	let t132;
	let li66;
	let t133;
	let t134;
	let li68;
	let t135;
	let ul23;
	let li67;
	let t136;
	let t137;
	let li69;
	let t138;
	let t139;
	let li70;
	let t140;
	let t141;
	let li72;
	let a24;
	let t142;
	let t143;
	let section6;
	let h31;
	let a25;
	let t144;
	let t145;
	let ul28;
	let li74;
	let t146;
	let ul26;
	let li73;
	let a26;
	let t147;
	let t148;
	let li78;
	let t149;
	let ul27;
	let li75;
	let t150;
	let t151;
	let li76;
	let t152;
	let t153;
	let li77;
	let t154;
	let t155;
	let li79;
	let t156;
	let t157;
	let li80;
	let t158;
	let t159;
	let section7;
	let h40;
	let a27;
	let t160;
	let t161;
	let ul30;
	let li81;
	let t162;
	let t163;
	let li82;
	let t164;
	let t165;
	let li85;
	let t166;
	let ul29;
	let li83;
	let t167;
	let t168;
	let li84;
	let t169;
	let t170;
	let li86;
	let t171;
	let t172;
	let section8;
	let h32;
	let a28;
	let t173;
	let t174;
	let ul32;
	let li88;
	let t175;
	let ul31;
	let li87;
	let t176;
	let t177;
	let section9;
	let h33;
	let a29;
	let t178;
	let t179;
	let ul33;
	let li89;
	let t180;
	let t181;
	let section10;
	let h24;
	let a30;
	let t182;
	let t183;
	let p11;
	let a31;
	let t184;
	let t185;
	let section11;
	let h34;
	let a32;
	let t186;
	let t187;
	let p12;
	let t188;
	let strong3;
	let t189;
	let t190;
	let t191;
	let p13;
	let t192;
	let t193;
	let p14;
	let t194;
	let t195;
	let p15;
	let t196;
	let code0;
	let t197;
	let t198;
	let code1;
	let t199;
	let t200;
	let t201;
	let section12;
	let h35;
	let a33;
	let t202;
	let t203;
	let section13;
	let h41;
	let a34;
	let t204;
	let t205;
	let p16;
	let t206;
	let strong4;
	let t207;
	let t208;
	let t209;
	let p17;
	let t210;
	let t211;
	let section14;
	let h36;
	let a35;
	let t212;
	let t213;
	let ul35;
	let li92;
	let t214;
	let ul34;
	let li90;
	let t215;
	let t216;
	let li91;
	let t217;
	let t218;
	let p18;
	let t219;

	return {
		c() {
			section0 = element("section");
			ul4 = element("ul");
			li0 = element("li");
			a0 = element("a");
			t0 = text("Different type of technical leadership");
			li1 = element("li");
			a1 = element("a");
			t1 = text("How to scale yourself at the speed of Slack");
			li2 = element("li");
			a2 = element("a");
			t2 = text("Optimising the glue work in your team");
			li3 = element("li");
			a3 = element("a");
			t3 = text("Communicating and documenting architectural decisions");
			ul1 = element("ul");
			li4 = element("li");
			a4 = element("a");
			t4 = text("1. Lightweight Architectural Decision Records (ADR)");
			li5 = element("li");
			a5 = element("a");
			t5 = text("2. Enterprise Architecture Guilds");
			ul0 = element("ul");
			li6 = element("li");
			a6 = element("a");
			t6 = text("Guild meetings");
			li7 = element("li");
			a7 = element("a");
			t7 = text("3. Build Reference Implementations");
			li8 = element("li");
			a8 = element("a");
			t8 = text("4. Tracer Bullet / Steel Thread");
			li9 = element("li");
			a9 = element("a");
			t9 = text("Being right is only half the battle");
			ul3 = element("ul");
			li10 = element("li");
			a10 = element("a");
			t10 = text("How to read minds");
			li11 = element("li");
			a11 = element("a");
			t11 = text("How to control reality");
			ul2 = element("ul");
			li12 = element("li");
			a12 = element("a");
			t12 = text("Specifying priorities / strategies");
			li13 = element("li");
			a13 = element("a");
			t13 = text("How to predict future");
			t14 = space();
			section1 = element("section");
			h20 = element("h2");
			a14 = element("a");
			t15 = text("Different type of technical leadership");
			t16 = space();
			p0 = element("p");
			a15 = element("a");
			t17 = text("Different type of technical leadership");
			t18 = space();
			ul5 = element("ul");
			li14 = element("li");
			p1 = element("p");
			a16 = element("a");
			t19 = text("https://www.patkua.com/");
			t20 = space();
			li15 = element("li");
			p2 = element("p");
			t21 = text("Technical leadership - act of leading a group of people in a technical context");
			t22 = space();
			li16 = element("li");
			p3 = element("p");
			strong0 = element("strong");
			t23 = text("Shift");
			t24 = text(" from Maker to Multiplier");
			t25 = space();
			li17 = element("li");
			p4 = element("p");
			t26 = text("Growing impact");
			t27 = space();
			p5 = element("p");
			t28 = text("Trident model");
			t29 = space();
			ul6 = element("ul");
			li18 = element("li");
			t30 = text("Technical Leader");
			t31 = space();
			li19 = element("li");
			t32 = text("Individual Contributor");
			t33 = space();
			li20 = element("li");
			t34 = text("Management");
			t35 = space();
			p6 = element("p");
			t36 = text("4 types of technical leader");
			t37 = space();
			ul8 = element("ul");
			li21 = element("li");
			t38 = text("knowledge cultivator");
			t39 = space();
			li22 = element("li");
			t40 = text("the advocate");
			t41 = space();
			li25 = element("li");
			t42 = text("the connector");
			ul7 = element("ul");
			li23 = element("li");
			t43 = text("reputation score");
			t44 = space();
			li24 = element("li");
			t45 = text("experience, knowledge, likeable");
			t46 = space();
			li26 = element("li");
			t47 = text("the story teller");
			t48 = space();
			section2 = element("section");
			h21 = element("h2");
			a17 = element("a");
			t49 = text("How to scale yourself at the speed of Slack");
			t50 = space();
			p7 = element("p");
			a18 = element("a");
			t51 = text("How to scale yourself at the speed of Slack");
			t52 = space();
			ul10 = element("ul");
			li28 = element("li");
			strong1 = element("strong");
			t53 = text("No Parachute");
			ul9 = element("ul");
			li27 = element("li");
			t54 = text("Your old job doesn't exists! (You cant go back anymore!)");
			t55 = space();
			ol0 = element("ol");
			li32 = element("li");
			t56 = text("Writing well (and quickly) is an incredible asset");
			ul11 = element("ul");
			li29 = element("li");
			t57 = text("always write down talking points");
			t58 = space();
			li30 = element("li");
			t59 = text("organise thoughts and ensure intent is clear");
			t60 = space();
			li31 = element("li");
			t61 = text("unorganised thoughts and talks in front of people -> lose credibility");
			t62 = space();
			li35 = element("li");
			t63 = text("Stories are very powerful");
			ul12 = element("ul");
			li33 = element("li");
			t64 = text("Pitching your team to candidates");
			t65 = space();
			li34 = element("li");
			t66 = text("Pitching your team's work to execs");
			t67 = space();
			li37 = element("li");
			t68 = text("Have a communications plan for everything");
			ul13 = element("ul");
			li36 = element("li");
			t69 = text("Don't YOLO the comms");
			t70 = space();
			li40 = element("li");
			t71 = text("Know your audience");
			ul14 = element("ul");
			li38 = element("li");
			t72 = text("down / sideways / up");
			t73 = space();
			li39 = element("li");
			strong2 = element("strong");
			t74 = text("Just ask");
			t75 = text(" what is on top of the others mind");
			t76 = space();
			li41 = element("li");
			t77 = text("\"Too many meetings\" is often a symptom of misalignment");
			t78 = space();
			li43 = element("li");
			t79 = text("Create structure and process around thing you do often");
			ul15 = element("ul");
			li42 = element("li");
			t80 = text("it's okay for the rest to be messy (things happen once in a year 🙈)");
			t81 = space();
			li45 = element("li");
			t82 = text("Always ask: \"who is the decision maker?\"");
			ul16 = element("ul");
			li44 = element("li");
			t83 = text("who will be held accountable for the decision");
			t84 = space();
			li47 = element("li");
			t85 = text("Credit always flows to the most senior/tenured/visible person naturally");
			ul17 = element("ul");
			li46 = element("li");
			t86 = text("making sure credit flows to less visible person who really need it");
			t87 = space();
			li52 = element("li");
			t88 = text("Leaders build organizations that mirror their personal strengths and weaknesses");
			ul18 = element("ul");
			li48 = element("li");
			t89 = text("because people who emulate the leaders will get promoted more easily");
			t90 = space();
			li49 = element("li");
			t91 = text("what is your biggest weakness and how do you compensate it in your hierachy?");
			t92 = space();
			li50 = element("li");
			t93 = text("how do you ensure hiring people that are like yourself?");
			t94 = space();
			li51 = element("li");
			t95 = text("how do you ensure diversity?");
			t96 = space();
			li53 = element("li");
			t97 = text("Treat people fairly and with respect. It's a tremendous privilege to be thier leader.");
			t98 = space();
			section3 = element("section");
			h22 = element("h2");
			a19 = element("a");
			t99 = text("Optimising the glue work in your team");
			t100 = space();
			p8 = element("p");
			a20 = element("a");
			t101 = text("Optimising the glue work in your team");
			t102 = space();
			ul19 = element("ul");
			li54 = element("li");
			t103 = text("what to do if you are a glue");
			t104 = space();
			ol1 = element("ol");
			li56 = element("li");
			t105 = text("have the career conversation");
			ul20 = element("ul");
			li55 = element("li");
			t106 = text("what do you need to do to get promoted?");
			t107 = space();
			li57 = element("li");
			t108 = text("Get a useful title");
			t109 = space();
			li59 = element("li");
			t110 = text("Tell the story");
			ul21 = element("ul");
			li58 = element("li");
			t111 = text("\"Due to your work, ... happens\"");
			t112 = space();
			li61 = element("li");
			t113 = text("Giving up and do exactly the thing on the job ladder");
			ul22 = element("ul");
			li60 = element("li");
			t114 = text("\"That's not my problem\"");
			t115 = space();
			blockquote = element("blockquote");
			p9 = element("p");
			t116 = text("\"Our skills are not fixed in place, we can learn to do a lot of things\"");
			t117 = space();
			section4 = element("section");
			h23 = element("h2");
			a21 = element("a");
			t118 = text("Communicating and documenting architectural decisions");
			t119 = space();
			p10 = element("p");
			a22 = element("a");
			t120 = text("Communicating and documenting architectural decisions");
			t121 = space();
			section5 = element("section");
			h30 = element("h3");
			a23 = element("a");
			t122 = text("1. Lightweight Architectural Decision Records (ADR)");
			t123 = space();
			ul25 = element("ul");
			li62 = element("li");
			t124 = text("\"Why did we decide to do it this way?\"");
			t125 = space();
			li63 = element("li");
			t126 = text("Record the why");
			t127 = space();
			li64 = element("li");
			t128 = text("Do it along with the code");
			t129 = space();
			li71 = element("li");
			t130 = text("Parts");
			ul24 = element("ul");
			li65 = element("li");
			t131 = text("title");
			t132 = space();
			li66 = element("li");
			t133 = text("status: proposed, accepted, superceded (?), deprecated (?)");
			t134 = space();
			li68 = element("li");
			t135 = text("context");
			ul23 = element("ul");
			li67 = element("li");
			t136 = text("bias, tensions");
			t137 = space();
			li69 = element("li");
			t138 = text("decision");
			t139 = space();
			li70 = element("li");
			t140 = text("consequences");
			t141 = space();
			li72 = element("li");
			a24 = element("a");
			t142 = text("Why write ADRs");
			t143 = space();
			section6 = element("section");
			h31 = element("h3");
			a25 = element("a");
			t144 = text("2. Enterprise Architecture Guilds");
			t145 = space();
			ul28 = element("ul");
			li74 = element("li");
			t146 = text("Open decision making to all");
			ul26 = element("ul");
			li73 = element("li");
			a26 = element("a");
			t147 = text("https://webcache.googleusercontent.com/search?q=cache:hNe5kCpxt20J:https://engineering.atspotify.com/2014/03/27/spotify-engineering-culture-part-1/+&cd=1&hl=en&ct=clnk≷=sg");
			t148 = space();
			li78 = element("li");
			t149 = text("Steps");
			ul27 = element("ul");
			li75 = element("li");
			t150 = text("Write Decision Records");
			t151 = space();
			li76 = element("li");
			t152 = text("Form Short-Term Special Interest Groups (SIG)");
			t153 = space();
			li77 = element("li");
			t154 = text("Long Running Special Interest Groups");
			t155 = space();
			li79 = element("li");
			t156 = text("Socializing Decisions");
			t157 = space();
			li80 = element("li");
			t158 = text("Newsletter of ADRs");
			t159 = space();
			section7 = element("section");
			h40 = element("h4");
			a27 = element("a");
			t160 = text("Guild meetings");
			t161 = space();
			ul30 = element("ul");
			li81 = element("li");
			t162 = text("report from each SIG on the work they have done");
			t163 = space();
			li82 = element("li");
			t164 = text("discussion on short-term SIG and should they continue or not");
			t165 = space();
			li85 = element("li");
			t166 = text("review and discuss open ADRs");
			ul29 = element("ul");
			li83 = element("li");
			t167 = text("voting to adopt, or");
			t168 = space();
			li84 = element("li");
			t169 = text("send back for more discussion");
			t170 = space();
			li86 = element("li");
			t171 = text("Open discussion");
			t172 = space();
			section8 = element("section");
			h32 = element("h3");
			a28 = element("a");
			t173 = text("3. Build Reference Implementations");
			t174 = space();
			ul32 = element("ul");
			li88 = element("li");
			t175 = text("implicit commitment to maintain");
			ul31 = element("ul");
			li87 = element("li");
			t176 = text("maintained by SIG");
			t177 = space();
			section9 = element("section");
			h33 = element("h3");
			a29 = element("a");
			t178 = text("4. Tracer Bullet / Steel Thread");
			t179 = space();
			ul33 = element("ul");
			li89 = element("li");
			t180 = text("simplest possible thing that executes all the components in the path, to show how each of them connects.");
			t181 = space();
			section10 = element("section");
			h24 = element("h2");
			a30 = element("a");
			t182 = text("Being right is only half the battle");
			t183 = space();
			p11 = element("p");
			a31 = element("a");
			t184 = text("Being right is only half the battle");
			t185 = space();
			section11 = element("section");
			h34 = element("h3");
			a32 = element("a");
			t186 = text("How to read minds");
			t187 = space();
			p12 = element("p");
			t188 = text("Ask questions. ");
			strong3 = element("strong");
			t189 = text("Ask questions");
			t190 = text(" drives you to understand people");
			t191 = space();
			p13 = element("p");
			t192 = text("Play back and verify.");
			t193 = space();
			p14 = element("p");
			t194 = text("\"What does ___ mean to you?\"");
			t195 = space();
			p15 = element("p");
			t196 = text("\"On a scale from 1 to 10, what do you feel about ___? How can I help you from ");
			code0 = element("code");
			t197 = text("n");
			t198 = text(" to ");
			code1 = element("code");
			t199 = text("m");
			t200 = text("?\"");
			t201 = space();
			section12 = element("section");
			h35 = element("h3");
			a33 = element("a");
			t202 = text("How to control reality");
			t203 = space();
			section13 = element("section");
			h41 = element("h4");
			a34 = element("a");
			t204 = text("Specifying priorities / strategies");
			t205 = space();
			p16 = element("p");
			t206 = text("\"Even over\" - \"we will focus on ");
			strong4 = element("strong");
			t207 = text("even over ");
			t208 = text("\"");
			t209 = space();
			p17 = element("p");
			t210 = text("eg: \"fixing old bugs even over shipping new featuers\", \"quick iteration even over polished ui\"");
			t211 = space();
			section14 = element("section");
			h36 = element("h3");
			a35 = element("a");
			t212 = text("How to predict future");
			t213 = space();
			ul35 = element("ul");
			li92 = element("li");
			t214 = text("socialise and get feedbacks in the early stage");
			ul34 = element("ul");
			li90 = element("li");
			t215 = text("\"How would you react if I said we should ....\"");
			t216 = space();
			li91 = element("li");
			t217 = text("\"What would worry you if we decided to ...\"");
			t218 = space();
			p18 = element("p");
			t219 = text("Write things down and share it as widely as possible");
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
			t0 = claim_text(a0_nodes, "Different type of technical leadership");
			a0_nodes.forEach(detach);
			li0_nodes.forEach(detach);
			li1 = claim_element(ul4_nodes, "LI", {});
			var li1_nodes = children(li1);
			a1 = claim_element(li1_nodes, "A", { href: true });
			var a1_nodes = children(a1);
			t1 = claim_text(a1_nodes, "How to scale yourself at the speed of Slack");
			a1_nodes.forEach(detach);
			li1_nodes.forEach(detach);
			li2 = claim_element(ul4_nodes, "LI", {});
			var li2_nodes = children(li2);
			a2 = claim_element(li2_nodes, "A", { href: true });
			var a2_nodes = children(a2);
			t2 = claim_text(a2_nodes, "Optimising the glue work in your team");
			a2_nodes.forEach(detach);
			li2_nodes.forEach(detach);
			li3 = claim_element(ul4_nodes, "LI", {});
			var li3_nodes = children(li3);
			a3 = claim_element(li3_nodes, "A", { href: true });
			var a3_nodes = children(a3);
			t3 = claim_text(a3_nodes, "Communicating and documenting architectural decisions");
			a3_nodes.forEach(detach);
			li3_nodes.forEach(detach);
			ul1 = claim_element(ul4_nodes, "UL", {});
			var ul1_nodes = children(ul1);
			li4 = claim_element(ul1_nodes, "LI", {});
			var li4_nodes = children(li4);
			a4 = claim_element(li4_nodes, "A", { href: true });
			var a4_nodes = children(a4);
			t4 = claim_text(a4_nodes, "1. Lightweight Architectural Decision Records (ADR)");
			a4_nodes.forEach(detach);
			li4_nodes.forEach(detach);
			li5 = claim_element(ul1_nodes, "LI", {});
			var li5_nodes = children(li5);
			a5 = claim_element(li5_nodes, "A", { href: true });
			var a5_nodes = children(a5);
			t5 = claim_text(a5_nodes, "2. Enterprise Architecture Guilds");
			a5_nodes.forEach(detach);
			li5_nodes.forEach(detach);
			ul0 = claim_element(ul1_nodes, "UL", {});
			var ul0_nodes = children(ul0);
			li6 = claim_element(ul0_nodes, "LI", {});
			var li6_nodes = children(li6);
			a6 = claim_element(li6_nodes, "A", { href: true });
			var a6_nodes = children(a6);
			t6 = claim_text(a6_nodes, "Guild meetings");
			a6_nodes.forEach(detach);
			li6_nodes.forEach(detach);
			ul0_nodes.forEach(detach);
			li7 = claim_element(ul1_nodes, "LI", {});
			var li7_nodes = children(li7);
			a7 = claim_element(li7_nodes, "A", { href: true });
			var a7_nodes = children(a7);
			t7 = claim_text(a7_nodes, "3. Build Reference Implementations");
			a7_nodes.forEach(detach);
			li7_nodes.forEach(detach);
			li8 = claim_element(ul1_nodes, "LI", {});
			var li8_nodes = children(li8);
			a8 = claim_element(li8_nodes, "A", { href: true });
			var a8_nodes = children(a8);
			t8 = claim_text(a8_nodes, "4. Tracer Bullet / Steel Thread");
			a8_nodes.forEach(detach);
			li8_nodes.forEach(detach);
			ul1_nodes.forEach(detach);
			li9 = claim_element(ul4_nodes, "LI", {});
			var li9_nodes = children(li9);
			a9 = claim_element(li9_nodes, "A", { href: true });
			var a9_nodes = children(a9);
			t9 = claim_text(a9_nodes, "Being right is only half the battle");
			a9_nodes.forEach(detach);
			li9_nodes.forEach(detach);
			ul3 = claim_element(ul4_nodes, "UL", {});
			var ul3_nodes = children(ul3);
			li10 = claim_element(ul3_nodes, "LI", {});
			var li10_nodes = children(li10);
			a10 = claim_element(li10_nodes, "A", { href: true });
			var a10_nodes = children(a10);
			t10 = claim_text(a10_nodes, "How to read minds");
			a10_nodes.forEach(detach);
			li10_nodes.forEach(detach);
			li11 = claim_element(ul3_nodes, "LI", {});
			var li11_nodes = children(li11);
			a11 = claim_element(li11_nodes, "A", { href: true });
			var a11_nodes = children(a11);
			t11 = claim_text(a11_nodes, "How to control reality");
			a11_nodes.forEach(detach);
			li11_nodes.forEach(detach);
			ul2 = claim_element(ul3_nodes, "UL", {});
			var ul2_nodes = children(ul2);
			li12 = claim_element(ul2_nodes, "LI", {});
			var li12_nodes = children(li12);
			a12 = claim_element(li12_nodes, "A", { href: true });
			var a12_nodes = children(a12);
			t12 = claim_text(a12_nodes, "Specifying priorities / strategies");
			a12_nodes.forEach(detach);
			li12_nodes.forEach(detach);
			ul2_nodes.forEach(detach);
			li13 = claim_element(ul3_nodes, "LI", {});
			var li13_nodes = children(li13);
			a13 = claim_element(li13_nodes, "A", { href: true });
			var a13_nodes = children(a13);
			t13 = claim_text(a13_nodes, "How to predict future");
			a13_nodes.forEach(detach);
			li13_nodes.forEach(detach);
			ul3_nodes.forEach(detach);
			ul4_nodes.forEach(detach);
			section0_nodes.forEach(detach);
			t14 = claim_space(nodes);
			section1 = claim_element(nodes, "SECTION", {});
			var section1_nodes = children(section1);
			h20 = claim_element(section1_nodes, "H2", {});
			var h20_nodes = children(h20);
			a14 = claim_element(h20_nodes, "A", { href: true, id: true });
			var a14_nodes = children(a14);
			t15 = claim_text(a14_nodes, "Different type of technical leadership");
			a14_nodes.forEach(detach);
			h20_nodes.forEach(detach);
			t16 = claim_space(section1_nodes);
			p0 = claim_element(section1_nodes, "P", {});
			var p0_nodes = children(p0);
			a15 = claim_element(p0_nodes, "A", { href: true, rel: true });
			var a15_nodes = children(a15);
			t17 = claim_text(a15_nodes, "Different type of technical leadership");
			a15_nodes.forEach(detach);
			p0_nodes.forEach(detach);
			t18 = claim_space(section1_nodes);
			ul5 = claim_element(section1_nodes, "UL", {});
			var ul5_nodes = children(ul5);
			li14 = claim_element(ul5_nodes, "LI", {});
			var li14_nodes = children(li14);
			p1 = claim_element(li14_nodes, "P", {});
			var p1_nodes = children(p1);
			a16 = claim_element(p1_nodes, "A", { href: true, rel: true });
			var a16_nodes = children(a16);
			t19 = claim_text(a16_nodes, "https://www.patkua.com/");
			a16_nodes.forEach(detach);
			p1_nodes.forEach(detach);
			li14_nodes.forEach(detach);
			t20 = claim_space(ul5_nodes);
			li15 = claim_element(ul5_nodes, "LI", {});
			var li15_nodes = children(li15);
			p2 = claim_element(li15_nodes, "P", {});
			var p2_nodes = children(p2);
			t21 = claim_text(p2_nodes, "Technical leadership - act of leading a group of people in a technical context");
			p2_nodes.forEach(detach);
			li15_nodes.forEach(detach);
			t22 = claim_space(ul5_nodes);
			li16 = claim_element(ul5_nodes, "LI", {});
			var li16_nodes = children(li16);
			p3 = claim_element(li16_nodes, "P", {});
			var p3_nodes = children(p3);
			strong0 = claim_element(p3_nodes, "STRONG", {});
			var strong0_nodes = children(strong0);
			t23 = claim_text(strong0_nodes, "Shift");
			strong0_nodes.forEach(detach);
			t24 = claim_text(p3_nodes, " from Maker to Multiplier");
			p3_nodes.forEach(detach);
			li16_nodes.forEach(detach);
			t25 = claim_space(ul5_nodes);
			li17 = claim_element(ul5_nodes, "LI", {});
			var li17_nodes = children(li17);
			p4 = claim_element(li17_nodes, "P", {});
			var p4_nodes = children(p4);
			t26 = claim_text(p4_nodes, "Growing impact");
			p4_nodes.forEach(detach);
			li17_nodes.forEach(detach);
			ul5_nodes.forEach(detach);
			t27 = claim_space(section1_nodes);
			p5 = claim_element(section1_nodes, "P", {});
			var p5_nodes = children(p5);
			t28 = claim_text(p5_nodes, "Trident model");
			p5_nodes.forEach(detach);
			t29 = claim_space(section1_nodes);
			ul6 = claim_element(section1_nodes, "UL", {});
			var ul6_nodes = children(ul6);
			li18 = claim_element(ul6_nodes, "LI", {});
			var li18_nodes = children(li18);
			t30 = claim_text(li18_nodes, "Technical Leader");
			li18_nodes.forEach(detach);
			t31 = claim_space(ul6_nodes);
			li19 = claim_element(ul6_nodes, "LI", {});
			var li19_nodes = children(li19);
			t32 = claim_text(li19_nodes, "Individual Contributor");
			li19_nodes.forEach(detach);
			t33 = claim_space(ul6_nodes);
			li20 = claim_element(ul6_nodes, "LI", {});
			var li20_nodes = children(li20);
			t34 = claim_text(li20_nodes, "Management");
			li20_nodes.forEach(detach);
			ul6_nodes.forEach(detach);
			t35 = claim_space(section1_nodes);
			p6 = claim_element(section1_nodes, "P", {});
			var p6_nodes = children(p6);
			t36 = claim_text(p6_nodes, "4 types of technical leader");
			p6_nodes.forEach(detach);
			t37 = claim_space(section1_nodes);
			ul8 = claim_element(section1_nodes, "UL", {});
			var ul8_nodes = children(ul8);
			li21 = claim_element(ul8_nodes, "LI", {});
			var li21_nodes = children(li21);
			t38 = claim_text(li21_nodes, "knowledge cultivator");
			li21_nodes.forEach(detach);
			t39 = claim_space(ul8_nodes);
			li22 = claim_element(ul8_nodes, "LI", {});
			var li22_nodes = children(li22);
			t40 = claim_text(li22_nodes, "the advocate");
			li22_nodes.forEach(detach);
			t41 = claim_space(ul8_nodes);
			li25 = claim_element(ul8_nodes, "LI", {});
			var li25_nodes = children(li25);
			t42 = claim_text(li25_nodes, "the connector");
			ul7 = claim_element(li25_nodes, "UL", {});
			var ul7_nodes = children(ul7);
			li23 = claim_element(ul7_nodes, "LI", {});
			var li23_nodes = children(li23);
			t43 = claim_text(li23_nodes, "reputation score");
			li23_nodes.forEach(detach);
			t44 = claim_space(ul7_nodes);
			li24 = claim_element(ul7_nodes, "LI", {});
			var li24_nodes = children(li24);
			t45 = claim_text(li24_nodes, "experience, knowledge, likeable");
			li24_nodes.forEach(detach);
			ul7_nodes.forEach(detach);
			li25_nodes.forEach(detach);
			t46 = claim_space(ul8_nodes);
			li26 = claim_element(ul8_nodes, "LI", {});
			var li26_nodes = children(li26);
			t47 = claim_text(li26_nodes, "the story teller");
			li26_nodes.forEach(detach);
			ul8_nodes.forEach(detach);
			section1_nodes.forEach(detach);
			t48 = claim_space(nodes);
			section2 = claim_element(nodes, "SECTION", {});
			var section2_nodes = children(section2);
			h21 = claim_element(section2_nodes, "H2", {});
			var h21_nodes = children(h21);
			a17 = claim_element(h21_nodes, "A", { href: true, id: true });
			var a17_nodes = children(a17);
			t49 = claim_text(a17_nodes, "How to scale yourself at the speed of Slack");
			a17_nodes.forEach(detach);
			h21_nodes.forEach(detach);
			t50 = claim_space(section2_nodes);
			p7 = claim_element(section2_nodes, "P", {});
			var p7_nodes = children(p7);
			a18 = claim_element(p7_nodes, "A", { href: true, rel: true });
			var a18_nodes = children(a18);
			t51 = claim_text(a18_nodes, "How to scale yourself at the speed of Slack");
			a18_nodes.forEach(detach);
			p7_nodes.forEach(detach);
			t52 = claim_space(section2_nodes);
			ul10 = claim_element(section2_nodes, "UL", {});
			var ul10_nodes = children(ul10);
			li28 = claim_element(ul10_nodes, "LI", {});
			var li28_nodes = children(li28);
			strong1 = claim_element(li28_nodes, "STRONG", {});
			var strong1_nodes = children(strong1);
			t53 = claim_text(strong1_nodes, "No Parachute");
			strong1_nodes.forEach(detach);
			ul9 = claim_element(li28_nodes, "UL", {});
			var ul9_nodes = children(ul9);
			li27 = claim_element(ul9_nodes, "LI", {});
			var li27_nodes = children(li27);
			t54 = claim_text(li27_nodes, "Your old job doesn't exists! (You cant go back anymore!)");
			li27_nodes.forEach(detach);
			ul9_nodes.forEach(detach);
			li28_nodes.forEach(detach);
			ul10_nodes.forEach(detach);
			t55 = claim_space(section2_nodes);
			ol0 = claim_element(section2_nodes, "OL", {});
			var ol0_nodes = children(ol0);
			li32 = claim_element(ol0_nodes, "LI", {});
			var li32_nodes = children(li32);
			t56 = claim_text(li32_nodes, "Writing well (and quickly) is an incredible asset");
			ul11 = claim_element(li32_nodes, "UL", {});
			var ul11_nodes = children(ul11);
			li29 = claim_element(ul11_nodes, "LI", {});
			var li29_nodes = children(li29);
			t57 = claim_text(li29_nodes, "always write down talking points");
			li29_nodes.forEach(detach);
			t58 = claim_space(ul11_nodes);
			li30 = claim_element(ul11_nodes, "LI", {});
			var li30_nodes = children(li30);
			t59 = claim_text(li30_nodes, "organise thoughts and ensure intent is clear");
			li30_nodes.forEach(detach);
			t60 = claim_space(ul11_nodes);
			li31 = claim_element(ul11_nodes, "LI", {});
			var li31_nodes = children(li31);
			t61 = claim_text(li31_nodes, "unorganised thoughts and talks in front of people -> lose credibility");
			li31_nodes.forEach(detach);
			ul11_nodes.forEach(detach);
			li32_nodes.forEach(detach);
			t62 = claim_space(ol0_nodes);
			li35 = claim_element(ol0_nodes, "LI", {});
			var li35_nodes = children(li35);
			t63 = claim_text(li35_nodes, "Stories are very powerful");
			ul12 = claim_element(li35_nodes, "UL", {});
			var ul12_nodes = children(ul12);
			li33 = claim_element(ul12_nodes, "LI", {});
			var li33_nodes = children(li33);
			t64 = claim_text(li33_nodes, "Pitching your team to candidates");
			li33_nodes.forEach(detach);
			t65 = claim_space(ul12_nodes);
			li34 = claim_element(ul12_nodes, "LI", {});
			var li34_nodes = children(li34);
			t66 = claim_text(li34_nodes, "Pitching your team's work to execs");
			li34_nodes.forEach(detach);
			ul12_nodes.forEach(detach);
			li35_nodes.forEach(detach);
			t67 = claim_space(ol0_nodes);
			li37 = claim_element(ol0_nodes, "LI", {});
			var li37_nodes = children(li37);
			t68 = claim_text(li37_nodes, "Have a communications plan for everything");
			ul13 = claim_element(li37_nodes, "UL", {});
			var ul13_nodes = children(ul13);
			li36 = claim_element(ul13_nodes, "LI", {});
			var li36_nodes = children(li36);
			t69 = claim_text(li36_nodes, "Don't YOLO the comms");
			li36_nodes.forEach(detach);
			ul13_nodes.forEach(detach);
			li37_nodes.forEach(detach);
			t70 = claim_space(ol0_nodes);
			li40 = claim_element(ol0_nodes, "LI", {});
			var li40_nodes = children(li40);
			t71 = claim_text(li40_nodes, "Know your audience");
			ul14 = claim_element(li40_nodes, "UL", {});
			var ul14_nodes = children(ul14);
			li38 = claim_element(ul14_nodes, "LI", {});
			var li38_nodes = children(li38);
			t72 = claim_text(li38_nodes, "down / sideways / up");
			li38_nodes.forEach(detach);
			t73 = claim_space(ul14_nodes);
			li39 = claim_element(ul14_nodes, "LI", {});
			var li39_nodes = children(li39);
			strong2 = claim_element(li39_nodes, "STRONG", {});
			var strong2_nodes = children(strong2);
			t74 = claim_text(strong2_nodes, "Just ask");
			strong2_nodes.forEach(detach);
			t75 = claim_text(li39_nodes, " what is on top of the others mind");
			li39_nodes.forEach(detach);
			ul14_nodes.forEach(detach);
			li40_nodes.forEach(detach);
			t76 = claim_space(ol0_nodes);
			li41 = claim_element(ol0_nodes, "LI", {});
			var li41_nodes = children(li41);
			t77 = claim_text(li41_nodes, "\"Too many meetings\" is often a symptom of misalignment");
			li41_nodes.forEach(detach);
			t78 = claim_space(ol0_nodes);
			li43 = claim_element(ol0_nodes, "LI", {});
			var li43_nodes = children(li43);
			t79 = claim_text(li43_nodes, "Create structure and process around thing you do often");
			ul15 = claim_element(li43_nodes, "UL", {});
			var ul15_nodes = children(ul15);
			li42 = claim_element(ul15_nodes, "LI", {});
			var li42_nodes = children(li42);
			t80 = claim_text(li42_nodes, "it's okay for the rest to be messy (things happen once in a year 🙈)");
			li42_nodes.forEach(detach);
			ul15_nodes.forEach(detach);
			li43_nodes.forEach(detach);
			t81 = claim_space(ol0_nodes);
			li45 = claim_element(ol0_nodes, "LI", {});
			var li45_nodes = children(li45);
			t82 = claim_text(li45_nodes, "Always ask: \"who is the decision maker?\"");
			ul16 = claim_element(li45_nodes, "UL", {});
			var ul16_nodes = children(ul16);
			li44 = claim_element(ul16_nodes, "LI", {});
			var li44_nodes = children(li44);
			t83 = claim_text(li44_nodes, "who will be held accountable for the decision");
			li44_nodes.forEach(detach);
			ul16_nodes.forEach(detach);
			li45_nodes.forEach(detach);
			t84 = claim_space(ol0_nodes);
			li47 = claim_element(ol0_nodes, "LI", {});
			var li47_nodes = children(li47);
			t85 = claim_text(li47_nodes, "Credit always flows to the most senior/tenured/visible person naturally");
			ul17 = claim_element(li47_nodes, "UL", {});
			var ul17_nodes = children(ul17);
			li46 = claim_element(ul17_nodes, "LI", {});
			var li46_nodes = children(li46);
			t86 = claim_text(li46_nodes, "making sure credit flows to less visible person who really need it");
			li46_nodes.forEach(detach);
			ul17_nodes.forEach(detach);
			li47_nodes.forEach(detach);
			t87 = claim_space(ol0_nodes);
			li52 = claim_element(ol0_nodes, "LI", {});
			var li52_nodes = children(li52);
			t88 = claim_text(li52_nodes, "Leaders build organizations that mirror their personal strengths and weaknesses");
			ul18 = claim_element(li52_nodes, "UL", {});
			var ul18_nodes = children(ul18);
			li48 = claim_element(ul18_nodes, "LI", {});
			var li48_nodes = children(li48);
			t89 = claim_text(li48_nodes, "because people who emulate the leaders will get promoted more easily");
			li48_nodes.forEach(detach);
			t90 = claim_space(ul18_nodes);
			li49 = claim_element(ul18_nodes, "LI", {});
			var li49_nodes = children(li49);
			t91 = claim_text(li49_nodes, "what is your biggest weakness and how do you compensate it in your hierachy?");
			li49_nodes.forEach(detach);
			t92 = claim_space(ul18_nodes);
			li50 = claim_element(ul18_nodes, "LI", {});
			var li50_nodes = children(li50);
			t93 = claim_text(li50_nodes, "how do you ensure hiring people that are like yourself?");
			li50_nodes.forEach(detach);
			t94 = claim_space(ul18_nodes);
			li51 = claim_element(ul18_nodes, "LI", {});
			var li51_nodes = children(li51);
			t95 = claim_text(li51_nodes, "how do you ensure diversity?");
			li51_nodes.forEach(detach);
			ul18_nodes.forEach(detach);
			li52_nodes.forEach(detach);
			t96 = claim_space(ol0_nodes);
			li53 = claim_element(ol0_nodes, "LI", {});
			var li53_nodes = children(li53);
			t97 = claim_text(li53_nodes, "Treat people fairly and with respect. It's a tremendous privilege to be thier leader.");
			li53_nodes.forEach(detach);
			ol0_nodes.forEach(detach);
			section2_nodes.forEach(detach);
			t98 = claim_space(nodes);
			section3 = claim_element(nodes, "SECTION", {});
			var section3_nodes = children(section3);
			h22 = claim_element(section3_nodes, "H2", {});
			var h22_nodes = children(h22);
			a19 = claim_element(h22_nodes, "A", { href: true, id: true });
			var a19_nodes = children(a19);
			t99 = claim_text(a19_nodes, "Optimising the glue work in your team");
			a19_nodes.forEach(detach);
			h22_nodes.forEach(detach);
			t100 = claim_space(section3_nodes);
			p8 = claim_element(section3_nodes, "P", {});
			var p8_nodes = children(p8);
			a20 = claim_element(p8_nodes, "A", { href: true, rel: true });
			var a20_nodes = children(a20);
			t101 = claim_text(a20_nodes, "Optimising the glue work in your team");
			a20_nodes.forEach(detach);
			p8_nodes.forEach(detach);
			t102 = claim_space(section3_nodes);
			ul19 = claim_element(section3_nodes, "UL", {});
			var ul19_nodes = children(ul19);
			li54 = claim_element(ul19_nodes, "LI", {});
			var li54_nodes = children(li54);
			t103 = claim_text(li54_nodes, "what to do if you are a glue");
			li54_nodes.forEach(detach);
			ul19_nodes.forEach(detach);
			t104 = claim_space(section3_nodes);
			ol1 = claim_element(section3_nodes, "OL", {});
			var ol1_nodes = children(ol1);
			li56 = claim_element(ol1_nodes, "LI", {});
			var li56_nodes = children(li56);
			t105 = claim_text(li56_nodes, "have the career conversation");
			ul20 = claim_element(li56_nodes, "UL", {});
			var ul20_nodes = children(ul20);
			li55 = claim_element(ul20_nodes, "LI", {});
			var li55_nodes = children(li55);
			t106 = claim_text(li55_nodes, "what do you need to do to get promoted?");
			li55_nodes.forEach(detach);
			ul20_nodes.forEach(detach);
			li56_nodes.forEach(detach);
			t107 = claim_space(ol1_nodes);
			li57 = claim_element(ol1_nodes, "LI", {});
			var li57_nodes = children(li57);
			t108 = claim_text(li57_nodes, "Get a useful title");
			li57_nodes.forEach(detach);
			t109 = claim_space(ol1_nodes);
			li59 = claim_element(ol1_nodes, "LI", {});
			var li59_nodes = children(li59);
			t110 = claim_text(li59_nodes, "Tell the story");
			ul21 = claim_element(li59_nodes, "UL", {});
			var ul21_nodes = children(ul21);
			li58 = claim_element(ul21_nodes, "LI", {});
			var li58_nodes = children(li58);
			t111 = claim_text(li58_nodes, "\"Due to your work, ... happens\"");
			li58_nodes.forEach(detach);
			ul21_nodes.forEach(detach);
			li59_nodes.forEach(detach);
			t112 = claim_space(ol1_nodes);
			li61 = claim_element(ol1_nodes, "LI", {});
			var li61_nodes = children(li61);
			t113 = claim_text(li61_nodes, "Giving up and do exactly the thing on the job ladder");
			ul22 = claim_element(li61_nodes, "UL", {});
			var ul22_nodes = children(ul22);
			li60 = claim_element(ul22_nodes, "LI", {});
			var li60_nodes = children(li60);
			t114 = claim_text(li60_nodes, "\"That's not my problem\"");
			li60_nodes.forEach(detach);
			ul22_nodes.forEach(detach);
			li61_nodes.forEach(detach);
			ol1_nodes.forEach(detach);
			t115 = claim_space(section3_nodes);
			blockquote = claim_element(section3_nodes, "BLOCKQUOTE", {});
			var blockquote_nodes = children(blockquote);
			p9 = claim_element(blockquote_nodes, "P", {});
			var p9_nodes = children(p9);
			t116 = claim_text(p9_nodes, "\"Our skills are not fixed in place, we can learn to do a lot of things\"");
			p9_nodes.forEach(detach);
			blockquote_nodes.forEach(detach);
			section3_nodes.forEach(detach);
			t117 = claim_space(nodes);
			section4 = claim_element(nodes, "SECTION", {});
			var section4_nodes = children(section4);
			h23 = claim_element(section4_nodes, "H2", {});
			var h23_nodes = children(h23);
			a21 = claim_element(h23_nodes, "A", { href: true, id: true });
			var a21_nodes = children(a21);
			t118 = claim_text(a21_nodes, "Communicating and documenting architectural decisions");
			a21_nodes.forEach(detach);
			h23_nodes.forEach(detach);
			t119 = claim_space(section4_nodes);
			p10 = claim_element(section4_nodes, "P", {});
			var p10_nodes = children(p10);
			a22 = claim_element(p10_nodes, "A", { href: true, rel: true });
			var a22_nodes = children(a22);
			t120 = claim_text(a22_nodes, "Communicating and documenting architectural decisions");
			a22_nodes.forEach(detach);
			p10_nodes.forEach(detach);
			section4_nodes.forEach(detach);
			t121 = claim_space(nodes);
			section5 = claim_element(nodes, "SECTION", {});
			var section5_nodes = children(section5);
			h30 = claim_element(section5_nodes, "H3", {});
			var h30_nodes = children(h30);
			a23 = claim_element(h30_nodes, "A", { href: true, id: true });
			var a23_nodes = children(a23);
			t122 = claim_text(a23_nodes, "1. Lightweight Architectural Decision Records (ADR)");
			a23_nodes.forEach(detach);
			h30_nodes.forEach(detach);
			t123 = claim_space(section5_nodes);
			ul25 = claim_element(section5_nodes, "UL", {});
			var ul25_nodes = children(ul25);
			li62 = claim_element(ul25_nodes, "LI", {});
			var li62_nodes = children(li62);
			t124 = claim_text(li62_nodes, "\"Why did we decide to do it this way?\"");
			li62_nodes.forEach(detach);
			t125 = claim_space(ul25_nodes);
			li63 = claim_element(ul25_nodes, "LI", {});
			var li63_nodes = children(li63);
			t126 = claim_text(li63_nodes, "Record the why");
			li63_nodes.forEach(detach);
			t127 = claim_space(ul25_nodes);
			li64 = claim_element(ul25_nodes, "LI", {});
			var li64_nodes = children(li64);
			t128 = claim_text(li64_nodes, "Do it along with the code");
			li64_nodes.forEach(detach);
			t129 = claim_space(ul25_nodes);
			li71 = claim_element(ul25_nodes, "LI", {});
			var li71_nodes = children(li71);
			t130 = claim_text(li71_nodes, "Parts");
			ul24 = claim_element(li71_nodes, "UL", {});
			var ul24_nodes = children(ul24);
			li65 = claim_element(ul24_nodes, "LI", {});
			var li65_nodes = children(li65);
			t131 = claim_text(li65_nodes, "title");
			li65_nodes.forEach(detach);
			t132 = claim_space(ul24_nodes);
			li66 = claim_element(ul24_nodes, "LI", {});
			var li66_nodes = children(li66);
			t133 = claim_text(li66_nodes, "status: proposed, accepted, superceded (?), deprecated (?)");
			li66_nodes.forEach(detach);
			t134 = claim_space(ul24_nodes);
			li68 = claim_element(ul24_nodes, "LI", {});
			var li68_nodes = children(li68);
			t135 = claim_text(li68_nodes, "context");
			ul23 = claim_element(li68_nodes, "UL", {});
			var ul23_nodes = children(ul23);
			li67 = claim_element(ul23_nodes, "LI", {});
			var li67_nodes = children(li67);
			t136 = claim_text(li67_nodes, "bias, tensions");
			li67_nodes.forEach(detach);
			ul23_nodes.forEach(detach);
			li68_nodes.forEach(detach);
			t137 = claim_space(ul24_nodes);
			li69 = claim_element(ul24_nodes, "LI", {});
			var li69_nodes = children(li69);
			t138 = claim_text(li69_nodes, "decision");
			li69_nodes.forEach(detach);
			t139 = claim_space(ul24_nodes);
			li70 = claim_element(ul24_nodes, "LI", {});
			var li70_nodes = children(li70);
			t140 = claim_text(li70_nodes, "consequences");
			li70_nodes.forEach(detach);
			ul24_nodes.forEach(detach);
			li71_nodes.forEach(detach);
			t141 = claim_space(ul25_nodes);
			li72 = claim_element(ul25_nodes, "LI", {});
			var li72_nodes = children(li72);
			a24 = claim_element(li72_nodes, "A", { href: true });
			var a24_nodes = children(a24);
			t142 = claim_text(a24_nodes, "Why write ADRs");
			a24_nodes.forEach(detach);
			li72_nodes.forEach(detach);
			ul25_nodes.forEach(detach);
			section5_nodes.forEach(detach);
			t143 = claim_space(nodes);
			section6 = claim_element(nodes, "SECTION", {});
			var section6_nodes = children(section6);
			h31 = claim_element(section6_nodes, "H3", {});
			var h31_nodes = children(h31);
			a25 = claim_element(h31_nodes, "A", { href: true, id: true });
			var a25_nodes = children(a25);
			t144 = claim_text(a25_nodes, "2. Enterprise Architecture Guilds");
			a25_nodes.forEach(detach);
			h31_nodes.forEach(detach);
			t145 = claim_space(section6_nodes);
			ul28 = claim_element(section6_nodes, "UL", {});
			var ul28_nodes = children(ul28);
			li74 = claim_element(ul28_nodes, "LI", {});
			var li74_nodes = children(li74);
			t146 = claim_text(li74_nodes, "Open decision making to all");
			ul26 = claim_element(li74_nodes, "UL", {});
			var ul26_nodes = children(ul26);
			li73 = claim_element(ul26_nodes, "LI", {});
			var li73_nodes = children(li73);
			a26 = claim_element(li73_nodes, "A", { href: true, rel: true });
			var a26_nodes = children(a26);
			t147 = claim_text(a26_nodes, "https://webcache.googleusercontent.com/search?q=cache:hNe5kCpxt20J:https://engineering.atspotify.com/2014/03/27/spotify-engineering-culture-part-1/+&cd=1&hl=en&ct=clnk≷=sg");
			a26_nodes.forEach(detach);
			li73_nodes.forEach(detach);
			ul26_nodes.forEach(detach);
			li74_nodes.forEach(detach);
			t148 = claim_space(ul28_nodes);
			li78 = claim_element(ul28_nodes, "LI", {});
			var li78_nodes = children(li78);
			t149 = claim_text(li78_nodes, "Steps");
			ul27 = claim_element(li78_nodes, "UL", {});
			var ul27_nodes = children(ul27);
			li75 = claim_element(ul27_nodes, "LI", {});
			var li75_nodes = children(li75);
			t150 = claim_text(li75_nodes, "Write Decision Records");
			li75_nodes.forEach(detach);
			t151 = claim_space(ul27_nodes);
			li76 = claim_element(ul27_nodes, "LI", {});
			var li76_nodes = children(li76);
			t152 = claim_text(li76_nodes, "Form Short-Term Special Interest Groups (SIG)");
			li76_nodes.forEach(detach);
			t153 = claim_space(ul27_nodes);
			li77 = claim_element(ul27_nodes, "LI", {});
			var li77_nodes = children(li77);
			t154 = claim_text(li77_nodes, "Long Running Special Interest Groups");
			li77_nodes.forEach(detach);
			ul27_nodes.forEach(detach);
			li78_nodes.forEach(detach);
			t155 = claim_space(ul28_nodes);
			li79 = claim_element(ul28_nodes, "LI", {});
			var li79_nodes = children(li79);
			t156 = claim_text(li79_nodes, "Socializing Decisions");
			li79_nodes.forEach(detach);
			t157 = claim_space(ul28_nodes);
			li80 = claim_element(ul28_nodes, "LI", {});
			var li80_nodes = children(li80);
			t158 = claim_text(li80_nodes, "Newsletter of ADRs");
			li80_nodes.forEach(detach);
			ul28_nodes.forEach(detach);
			section6_nodes.forEach(detach);
			t159 = claim_space(nodes);
			section7 = claim_element(nodes, "SECTION", {});
			var section7_nodes = children(section7);
			h40 = claim_element(section7_nodes, "H4", {});
			var h40_nodes = children(h40);
			a27 = claim_element(h40_nodes, "A", { href: true, id: true });
			var a27_nodes = children(a27);
			t160 = claim_text(a27_nodes, "Guild meetings");
			a27_nodes.forEach(detach);
			h40_nodes.forEach(detach);
			t161 = claim_space(section7_nodes);
			ul30 = claim_element(section7_nodes, "UL", {});
			var ul30_nodes = children(ul30);
			li81 = claim_element(ul30_nodes, "LI", {});
			var li81_nodes = children(li81);
			t162 = claim_text(li81_nodes, "report from each SIG on the work they have done");
			li81_nodes.forEach(detach);
			t163 = claim_space(ul30_nodes);
			li82 = claim_element(ul30_nodes, "LI", {});
			var li82_nodes = children(li82);
			t164 = claim_text(li82_nodes, "discussion on short-term SIG and should they continue or not");
			li82_nodes.forEach(detach);
			t165 = claim_space(ul30_nodes);
			li85 = claim_element(ul30_nodes, "LI", {});
			var li85_nodes = children(li85);
			t166 = claim_text(li85_nodes, "review and discuss open ADRs");
			ul29 = claim_element(li85_nodes, "UL", {});
			var ul29_nodes = children(ul29);
			li83 = claim_element(ul29_nodes, "LI", {});
			var li83_nodes = children(li83);
			t167 = claim_text(li83_nodes, "voting to adopt, or");
			li83_nodes.forEach(detach);
			t168 = claim_space(ul29_nodes);
			li84 = claim_element(ul29_nodes, "LI", {});
			var li84_nodes = children(li84);
			t169 = claim_text(li84_nodes, "send back for more discussion");
			li84_nodes.forEach(detach);
			ul29_nodes.forEach(detach);
			li85_nodes.forEach(detach);
			t170 = claim_space(ul30_nodes);
			li86 = claim_element(ul30_nodes, "LI", {});
			var li86_nodes = children(li86);
			t171 = claim_text(li86_nodes, "Open discussion");
			li86_nodes.forEach(detach);
			ul30_nodes.forEach(detach);
			section7_nodes.forEach(detach);
			t172 = claim_space(nodes);
			section8 = claim_element(nodes, "SECTION", {});
			var section8_nodes = children(section8);
			h32 = claim_element(section8_nodes, "H3", {});
			var h32_nodes = children(h32);
			a28 = claim_element(h32_nodes, "A", { href: true, id: true });
			var a28_nodes = children(a28);
			t173 = claim_text(a28_nodes, "3. Build Reference Implementations");
			a28_nodes.forEach(detach);
			h32_nodes.forEach(detach);
			t174 = claim_space(section8_nodes);
			ul32 = claim_element(section8_nodes, "UL", {});
			var ul32_nodes = children(ul32);
			li88 = claim_element(ul32_nodes, "LI", {});
			var li88_nodes = children(li88);
			t175 = claim_text(li88_nodes, "implicit commitment to maintain");
			ul31 = claim_element(li88_nodes, "UL", {});
			var ul31_nodes = children(ul31);
			li87 = claim_element(ul31_nodes, "LI", {});
			var li87_nodes = children(li87);
			t176 = claim_text(li87_nodes, "maintained by SIG");
			li87_nodes.forEach(detach);
			ul31_nodes.forEach(detach);
			li88_nodes.forEach(detach);
			ul32_nodes.forEach(detach);
			section8_nodes.forEach(detach);
			t177 = claim_space(nodes);
			section9 = claim_element(nodes, "SECTION", {});
			var section9_nodes = children(section9);
			h33 = claim_element(section9_nodes, "H3", {});
			var h33_nodes = children(h33);
			a29 = claim_element(h33_nodes, "A", { href: true, id: true });
			var a29_nodes = children(a29);
			t178 = claim_text(a29_nodes, "4. Tracer Bullet / Steel Thread");
			a29_nodes.forEach(detach);
			h33_nodes.forEach(detach);
			t179 = claim_space(section9_nodes);
			ul33 = claim_element(section9_nodes, "UL", {});
			var ul33_nodes = children(ul33);
			li89 = claim_element(ul33_nodes, "LI", {});
			var li89_nodes = children(li89);
			t180 = claim_text(li89_nodes, "simplest possible thing that executes all the components in the path, to show how each of them connects.");
			li89_nodes.forEach(detach);
			ul33_nodes.forEach(detach);
			section9_nodes.forEach(detach);
			t181 = claim_space(nodes);
			section10 = claim_element(nodes, "SECTION", {});
			var section10_nodes = children(section10);
			h24 = claim_element(section10_nodes, "H2", {});
			var h24_nodes = children(h24);
			a30 = claim_element(h24_nodes, "A", { href: true, id: true });
			var a30_nodes = children(a30);
			t182 = claim_text(a30_nodes, "Being right is only half the battle");
			a30_nodes.forEach(detach);
			h24_nodes.forEach(detach);
			t183 = claim_space(section10_nodes);
			p11 = claim_element(section10_nodes, "P", {});
			var p11_nodes = children(p11);
			a31 = claim_element(p11_nodes, "A", { href: true, rel: true });
			var a31_nodes = children(a31);
			t184 = claim_text(a31_nodes, "Being right is only half the battle");
			a31_nodes.forEach(detach);
			p11_nodes.forEach(detach);
			section10_nodes.forEach(detach);
			t185 = claim_space(nodes);
			section11 = claim_element(nodes, "SECTION", {});
			var section11_nodes = children(section11);
			h34 = claim_element(section11_nodes, "H3", {});
			var h34_nodes = children(h34);
			a32 = claim_element(h34_nodes, "A", { href: true, id: true });
			var a32_nodes = children(a32);
			t186 = claim_text(a32_nodes, "How to read minds");
			a32_nodes.forEach(detach);
			h34_nodes.forEach(detach);
			t187 = claim_space(section11_nodes);
			p12 = claim_element(section11_nodes, "P", {});
			var p12_nodes = children(p12);
			t188 = claim_text(p12_nodes, "Ask questions. ");
			strong3 = claim_element(p12_nodes, "STRONG", {});
			var strong3_nodes = children(strong3);
			t189 = claim_text(strong3_nodes, "Ask questions");
			strong3_nodes.forEach(detach);
			t190 = claim_text(p12_nodes, " drives you to understand people");
			p12_nodes.forEach(detach);
			t191 = claim_space(section11_nodes);
			p13 = claim_element(section11_nodes, "P", {});
			var p13_nodes = children(p13);
			t192 = claim_text(p13_nodes, "Play back and verify.");
			p13_nodes.forEach(detach);
			t193 = claim_space(section11_nodes);
			p14 = claim_element(section11_nodes, "P", {});
			var p14_nodes = children(p14);
			t194 = claim_text(p14_nodes, "\"What does ___ mean to you?\"");
			p14_nodes.forEach(detach);
			t195 = claim_space(section11_nodes);
			p15 = claim_element(section11_nodes, "P", {});
			var p15_nodes = children(p15);
			t196 = claim_text(p15_nodes, "\"On a scale from 1 to 10, what do you feel about ___? How can I help you from ");
			code0 = claim_element(p15_nodes, "CODE", {});
			var code0_nodes = children(code0);
			t197 = claim_text(code0_nodes, "n");
			code0_nodes.forEach(detach);
			t198 = claim_text(p15_nodes, " to ");
			code1 = claim_element(p15_nodes, "CODE", {});
			var code1_nodes = children(code1);
			t199 = claim_text(code1_nodes, "m");
			code1_nodes.forEach(detach);
			t200 = claim_text(p15_nodes, "?\"");
			p15_nodes.forEach(detach);
			section11_nodes.forEach(detach);
			t201 = claim_space(nodes);
			section12 = claim_element(nodes, "SECTION", {});
			var section12_nodes = children(section12);
			h35 = claim_element(section12_nodes, "H3", {});
			var h35_nodes = children(h35);
			a33 = claim_element(h35_nodes, "A", { href: true, id: true });
			var a33_nodes = children(a33);
			t202 = claim_text(a33_nodes, "How to control reality");
			a33_nodes.forEach(detach);
			h35_nodes.forEach(detach);
			section12_nodes.forEach(detach);
			t203 = claim_space(nodes);
			section13 = claim_element(nodes, "SECTION", {});
			var section13_nodes = children(section13);
			h41 = claim_element(section13_nodes, "H4", {});
			var h41_nodes = children(h41);
			a34 = claim_element(h41_nodes, "A", { href: true, id: true });
			var a34_nodes = children(a34);
			t204 = claim_text(a34_nodes, "Specifying priorities / strategies");
			a34_nodes.forEach(detach);
			h41_nodes.forEach(detach);
			t205 = claim_space(section13_nodes);
			p16 = claim_element(section13_nodes, "P", {});
			var p16_nodes = children(p16);
			t206 = claim_text(p16_nodes, "\"Even over\" - \"we will focus on ");
			strong4 = claim_element(p16_nodes, "STRONG", {});
			var strong4_nodes = children(strong4);
			t207 = claim_text(strong4_nodes, "even over ");
			strong4_nodes.forEach(detach);
			t208 = claim_text(p16_nodes, "\"");
			p16_nodes.forEach(detach);
			t209 = claim_space(section13_nodes);
			p17 = claim_element(section13_nodes, "P", {});
			var p17_nodes = children(p17);
			t210 = claim_text(p17_nodes, "eg: \"fixing old bugs even over shipping new featuers\", \"quick iteration even over polished ui\"");
			p17_nodes.forEach(detach);
			section13_nodes.forEach(detach);
			t211 = claim_space(nodes);
			section14 = claim_element(nodes, "SECTION", {});
			var section14_nodes = children(section14);
			h36 = claim_element(section14_nodes, "H3", {});
			var h36_nodes = children(h36);
			a35 = claim_element(h36_nodes, "A", { href: true, id: true });
			var a35_nodes = children(a35);
			t212 = claim_text(a35_nodes, "How to predict future");
			a35_nodes.forEach(detach);
			h36_nodes.forEach(detach);
			t213 = claim_space(section14_nodes);
			ul35 = claim_element(section14_nodes, "UL", {});
			var ul35_nodes = children(ul35);
			li92 = claim_element(ul35_nodes, "LI", {});
			var li92_nodes = children(li92);
			t214 = claim_text(li92_nodes, "socialise and get feedbacks in the early stage");
			ul34 = claim_element(li92_nodes, "UL", {});
			var ul34_nodes = children(ul34);
			li90 = claim_element(ul34_nodes, "LI", {});
			var li90_nodes = children(li90);
			t215 = claim_text(li90_nodes, "\"How would you react if I said we should ....\"");
			li90_nodes.forEach(detach);
			t216 = claim_space(ul34_nodes);
			li91 = claim_element(ul34_nodes, "LI", {});
			var li91_nodes = children(li91);
			t217 = claim_text(li91_nodes, "\"What would worry you if we decided to ...\"");
			li91_nodes.forEach(detach);
			ul34_nodes.forEach(detach);
			li92_nodes.forEach(detach);
			ul35_nodes.forEach(detach);
			t218 = claim_space(section14_nodes);
			p18 = claim_element(section14_nodes, "P", {});
			var p18_nodes = children(p18);
			t219 = claim_text(p18_nodes, "Write things down and share it as widely as possible");
			p18_nodes.forEach(detach);
			section14_nodes.forEach(detach);
			this.h();
		},
		h() {
			attr(a0, "href", "#different-type-of-technical-leadership");
			attr(a1, "href", "#how-to-scale-yourself-at-the-speed-of-slack");
			attr(a2, "href", "#optimising-the-glue-work-in-your-team");
			attr(a3, "href", "#communicating-and-documenting-architectural-decisions");
			attr(a4, "href", "#lightweight-architectural-decision-records-adr");
			attr(a5, "href", "#enterprise-architecture-guilds");
			attr(a6, "href", "#guild-meetings");
			attr(a7, "href", "#build-reference-implementations");
			attr(a8, "href", "#tracer-bullet-steel-thread");
			attr(a9, "href", "#being-right-is-only-half-the-battle");
			attr(a10, "href", "#how-to-read-minds");
			attr(a11, "href", "#how-to-control-reality");
			attr(a12, "href", "#specifying-priorities-strategies");
			attr(a13, "href", "#how-to-predict-future");
			attr(ul4, "class", "sitemap");
			attr(ul4, "id", "sitemap");
			attr(ul4, "role", "navigation");
			attr(ul4, "aria-label", "Table of Contents");
			attr(a14, "href", "#different-type-of-technical-leadership");
			attr(a14, "id", "different-type-of-technical-leadership");
			attr(a15, "href", "https://leaddev.com/exploring-different-types-technical-leadership");
			attr(a15, "rel", "nofollow");
			attr(a16, "href", "https://www.patkua.com/");
			attr(a16, "rel", "nofollow");
			attr(a17, "href", "#how-to-scale-yourself-at-the-speed-of-slack");
			attr(a17, "id", "how-to-scale-yourself-at-the-speed-of-slack");
			attr(a18, "href", "https://leaddev.com/how-scale-yourself-speed-slack");
			attr(a18, "rel", "nofollow");
			attr(a19, "href", "#optimising-the-glue-work-in-your-team");
			attr(a19, "id", "optimising-the-glue-work-in-your-team");
			attr(a20, "href", "https://leaddev.com/optimizing-glue-work-your-team");
			attr(a20, "rel", "nofollow");
			attr(a21, "href", "#communicating-and-documenting-architectural-decisions");
			attr(a21, "id", "communicating-and-documenting-architectural-decisions");
			attr(a22, "href", "https://leaddev.com/documenting-and-communicating-architectural-decisions");
			attr(a22, "rel", "nofollow");
			attr(a23, "href", "#lightweight-architectural-decision-records-adr");
			attr(a23, "id", "lightweight-architectural-decision-records-adr");
			attr(a24, "href", "/notes/why-write-architectural-decision-records.md");
			attr(a25, "href", "#enterprise-architecture-guilds");
			attr(a25, "id", "enterprise-architecture-guilds");
			attr(a26, "href", "https://webcache.googleusercontent.com/search?q=cache:hNe5kCpxt20J:https://engineering.atspotify.com/2014/03/27/spotify-engineering-culture-part-1/+&cd=1&hl=en&ct=clnk≷=sg");
			attr(a26, "rel", "nofollow");
			attr(a27, "href", "#guild-meetings");
			attr(a27, "id", "guild-meetings");
			attr(a28, "href", "#build-reference-implementations");
			attr(a28, "id", "build-reference-implementations");
			attr(a29, "href", "#tracer-bullet-steel-thread");
			attr(a29, "id", "tracer-bullet-steel-thread");
			attr(a30, "href", "#being-right-is-only-half-the-battle");
			attr(a30, "id", "being-right-is-only-half-the-battle");
			attr(a31, "href", "https://leaddev.com/being-right-only-half-battle-how-optimize-your-interpersonal-connections");
			attr(a31, "rel", "nofollow");
			attr(a32, "href", "#how-to-read-minds");
			attr(a32, "id", "how-to-read-minds");
			attr(a33, "href", "#how-to-control-reality");
			attr(a33, "id", "how-to-control-reality");
			attr(a34, "href", "#specifying-priorities-strategies");
			attr(a34, "id", "specifying-priorities-strategies");
			attr(a35, "href", "#how-to-predict-future");
			attr(a35, "id", "how-to-predict-future");
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
			append(ul4, li2);
			append(li2, a2);
			append(a2, t2);
			append(ul4, li3);
			append(li3, a3);
			append(a3, t3);
			append(ul4, ul1);
			append(ul1, li4);
			append(li4, a4);
			append(a4, t4);
			append(ul1, li5);
			append(li5, a5);
			append(a5, t5);
			append(ul1, ul0);
			append(ul0, li6);
			append(li6, a6);
			append(a6, t6);
			append(ul1, li7);
			append(li7, a7);
			append(a7, t7);
			append(ul1, li8);
			append(li8, a8);
			append(a8, t8);
			append(ul4, li9);
			append(li9, a9);
			append(a9, t9);
			append(ul4, ul3);
			append(ul3, li10);
			append(li10, a10);
			append(a10, t10);
			append(ul3, li11);
			append(li11, a11);
			append(a11, t11);
			append(ul3, ul2);
			append(ul2, li12);
			append(li12, a12);
			append(a12, t12);
			append(ul3, li13);
			append(li13, a13);
			append(a13, t13);
			insert(target, t14, anchor);
			insert(target, section1, anchor);
			append(section1, h20);
			append(h20, a14);
			append(a14, t15);
			append(section1, t16);
			append(section1, p0);
			append(p0, a15);
			append(a15, t17);
			append(section1, t18);
			append(section1, ul5);
			append(ul5, li14);
			append(li14, p1);
			append(p1, a16);
			append(a16, t19);
			append(ul5, t20);
			append(ul5, li15);
			append(li15, p2);
			append(p2, t21);
			append(ul5, t22);
			append(ul5, li16);
			append(li16, p3);
			append(p3, strong0);
			append(strong0, t23);
			append(p3, t24);
			append(ul5, t25);
			append(ul5, li17);
			append(li17, p4);
			append(p4, t26);
			append(section1, t27);
			append(section1, p5);
			append(p5, t28);
			append(section1, t29);
			append(section1, ul6);
			append(ul6, li18);
			append(li18, t30);
			append(ul6, t31);
			append(ul6, li19);
			append(li19, t32);
			append(ul6, t33);
			append(ul6, li20);
			append(li20, t34);
			append(section1, t35);
			append(section1, p6);
			append(p6, t36);
			append(section1, t37);
			append(section1, ul8);
			append(ul8, li21);
			append(li21, t38);
			append(ul8, t39);
			append(ul8, li22);
			append(li22, t40);
			append(ul8, t41);
			append(ul8, li25);
			append(li25, t42);
			append(li25, ul7);
			append(ul7, li23);
			append(li23, t43);
			append(ul7, t44);
			append(ul7, li24);
			append(li24, t45);
			append(ul8, t46);
			append(ul8, li26);
			append(li26, t47);
			insert(target, t48, anchor);
			insert(target, section2, anchor);
			append(section2, h21);
			append(h21, a17);
			append(a17, t49);
			append(section2, t50);
			append(section2, p7);
			append(p7, a18);
			append(a18, t51);
			append(section2, t52);
			append(section2, ul10);
			append(ul10, li28);
			append(li28, strong1);
			append(strong1, t53);
			append(li28, ul9);
			append(ul9, li27);
			append(li27, t54);
			append(section2, t55);
			append(section2, ol0);
			append(ol0, li32);
			append(li32, t56);
			append(li32, ul11);
			append(ul11, li29);
			append(li29, t57);
			append(ul11, t58);
			append(ul11, li30);
			append(li30, t59);
			append(ul11, t60);
			append(ul11, li31);
			append(li31, t61);
			append(ol0, t62);
			append(ol0, li35);
			append(li35, t63);
			append(li35, ul12);
			append(ul12, li33);
			append(li33, t64);
			append(ul12, t65);
			append(ul12, li34);
			append(li34, t66);
			append(ol0, t67);
			append(ol0, li37);
			append(li37, t68);
			append(li37, ul13);
			append(ul13, li36);
			append(li36, t69);
			append(ol0, t70);
			append(ol0, li40);
			append(li40, t71);
			append(li40, ul14);
			append(ul14, li38);
			append(li38, t72);
			append(ul14, t73);
			append(ul14, li39);
			append(li39, strong2);
			append(strong2, t74);
			append(li39, t75);
			append(ol0, t76);
			append(ol0, li41);
			append(li41, t77);
			append(ol0, t78);
			append(ol0, li43);
			append(li43, t79);
			append(li43, ul15);
			append(ul15, li42);
			append(li42, t80);
			append(ol0, t81);
			append(ol0, li45);
			append(li45, t82);
			append(li45, ul16);
			append(ul16, li44);
			append(li44, t83);
			append(ol0, t84);
			append(ol0, li47);
			append(li47, t85);
			append(li47, ul17);
			append(ul17, li46);
			append(li46, t86);
			append(ol0, t87);
			append(ol0, li52);
			append(li52, t88);
			append(li52, ul18);
			append(ul18, li48);
			append(li48, t89);
			append(ul18, t90);
			append(ul18, li49);
			append(li49, t91);
			append(ul18, t92);
			append(ul18, li50);
			append(li50, t93);
			append(ul18, t94);
			append(ul18, li51);
			append(li51, t95);
			append(ol0, t96);
			append(ol0, li53);
			append(li53, t97);
			insert(target, t98, anchor);
			insert(target, section3, anchor);
			append(section3, h22);
			append(h22, a19);
			append(a19, t99);
			append(section3, t100);
			append(section3, p8);
			append(p8, a20);
			append(a20, t101);
			append(section3, t102);
			append(section3, ul19);
			append(ul19, li54);
			append(li54, t103);
			append(section3, t104);
			append(section3, ol1);
			append(ol1, li56);
			append(li56, t105);
			append(li56, ul20);
			append(ul20, li55);
			append(li55, t106);
			append(ol1, t107);
			append(ol1, li57);
			append(li57, t108);
			append(ol1, t109);
			append(ol1, li59);
			append(li59, t110);
			append(li59, ul21);
			append(ul21, li58);
			append(li58, t111);
			append(ol1, t112);
			append(ol1, li61);
			append(li61, t113);
			append(li61, ul22);
			append(ul22, li60);
			append(li60, t114);
			append(section3, t115);
			append(section3, blockquote);
			append(blockquote, p9);
			append(p9, t116);
			insert(target, t117, anchor);
			insert(target, section4, anchor);
			append(section4, h23);
			append(h23, a21);
			append(a21, t118);
			append(section4, t119);
			append(section4, p10);
			append(p10, a22);
			append(a22, t120);
			insert(target, t121, anchor);
			insert(target, section5, anchor);
			append(section5, h30);
			append(h30, a23);
			append(a23, t122);
			append(section5, t123);
			append(section5, ul25);
			append(ul25, li62);
			append(li62, t124);
			append(ul25, t125);
			append(ul25, li63);
			append(li63, t126);
			append(ul25, t127);
			append(ul25, li64);
			append(li64, t128);
			append(ul25, t129);
			append(ul25, li71);
			append(li71, t130);
			append(li71, ul24);
			append(ul24, li65);
			append(li65, t131);
			append(ul24, t132);
			append(ul24, li66);
			append(li66, t133);
			append(ul24, t134);
			append(ul24, li68);
			append(li68, t135);
			append(li68, ul23);
			append(ul23, li67);
			append(li67, t136);
			append(ul24, t137);
			append(ul24, li69);
			append(li69, t138);
			append(ul24, t139);
			append(ul24, li70);
			append(li70, t140);
			append(ul25, t141);
			append(ul25, li72);
			append(li72, a24);
			append(a24, t142);
			insert(target, t143, anchor);
			insert(target, section6, anchor);
			append(section6, h31);
			append(h31, a25);
			append(a25, t144);
			append(section6, t145);
			append(section6, ul28);
			append(ul28, li74);
			append(li74, t146);
			append(li74, ul26);
			append(ul26, li73);
			append(li73, a26);
			append(a26, t147);
			append(ul28, t148);
			append(ul28, li78);
			append(li78, t149);
			append(li78, ul27);
			append(ul27, li75);
			append(li75, t150);
			append(ul27, t151);
			append(ul27, li76);
			append(li76, t152);
			append(ul27, t153);
			append(ul27, li77);
			append(li77, t154);
			append(ul28, t155);
			append(ul28, li79);
			append(li79, t156);
			append(ul28, t157);
			append(ul28, li80);
			append(li80, t158);
			insert(target, t159, anchor);
			insert(target, section7, anchor);
			append(section7, h40);
			append(h40, a27);
			append(a27, t160);
			append(section7, t161);
			append(section7, ul30);
			append(ul30, li81);
			append(li81, t162);
			append(ul30, t163);
			append(ul30, li82);
			append(li82, t164);
			append(ul30, t165);
			append(ul30, li85);
			append(li85, t166);
			append(li85, ul29);
			append(ul29, li83);
			append(li83, t167);
			append(ul29, t168);
			append(ul29, li84);
			append(li84, t169);
			append(ul30, t170);
			append(ul30, li86);
			append(li86, t171);
			insert(target, t172, anchor);
			insert(target, section8, anchor);
			append(section8, h32);
			append(h32, a28);
			append(a28, t173);
			append(section8, t174);
			append(section8, ul32);
			append(ul32, li88);
			append(li88, t175);
			append(li88, ul31);
			append(ul31, li87);
			append(li87, t176);
			insert(target, t177, anchor);
			insert(target, section9, anchor);
			append(section9, h33);
			append(h33, a29);
			append(a29, t178);
			append(section9, t179);
			append(section9, ul33);
			append(ul33, li89);
			append(li89, t180);
			insert(target, t181, anchor);
			insert(target, section10, anchor);
			append(section10, h24);
			append(h24, a30);
			append(a30, t182);
			append(section10, t183);
			append(section10, p11);
			append(p11, a31);
			append(a31, t184);
			insert(target, t185, anchor);
			insert(target, section11, anchor);
			append(section11, h34);
			append(h34, a32);
			append(a32, t186);
			append(section11, t187);
			append(section11, p12);
			append(p12, t188);
			append(p12, strong3);
			append(strong3, t189);
			append(p12, t190);
			append(section11, t191);
			append(section11, p13);
			append(p13, t192);
			append(section11, t193);
			append(section11, p14);
			append(p14, t194);
			append(section11, t195);
			append(section11, p15);
			append(p15, t196);
			append(p15, code0);
			append(code0, t197);
			append(p15, t198);
			append(p15, code1);
			append(code1, t199);
			append(p15, t200);
			insert(target, t201, anchor);
			insert(target, section12, anchor);
			append(section12, h35);
			append(h35, a33);
			append(a33, t202);
			insert(target, t203, anchor);
			insert(target, section13, anchor);
			append(section13, h41);
			append(h41, a34);
			append(a34, t204);
			append(section13, t205);
			append(section13, p16);
			append(p16, t206);
			append(p16, strong4);
			append(strong4, t207);
			append(p16, t208);
			append(section13, t209);
			append(section13, p17);
			append(p17, t210);
			insert(target, t211, anchor);
			insert(target, section14, anchor);
			append(section14, h36);
			append(h36, a35);
			append(a35, t212);
			append(section14, t213);
			append(section14, ul35);
			append(ul35, li92);
			append(li92, t214);
			append(li92, ul34);
			append(ul34, li90);
			append(li90, t215);
			append(ul34, t216);
			append(ul34, li91);
			append(li91, t217);
			append(section14, t218);
			append(section14, p18);
			append(p18, t219);
		},
		d(detaching) {
			if (detaching) detach(section0);
			if (detaching) detach(t14);
			if (detaching) detach(section1);
			if (detaching) detach(t48);
			if (detaching) detach(section2);
			if (detaching) detach(t98);
			if (detaching) detach(section3);
			if (detaching) detach(t117);
			if (detaching) detach(section4);
			if (detaching) detach(t121);
			if (detaching) detach(section5);
			if (detaching) detach(t143);
			if (detaching) detach(section6);
			if (detaching) detach(t159);
			if (detaching) detach(section7);
			if (detaching) detach(t172);
			if (detaching) detach(section8);
			if (detaching) detach(t177);
			if (detaching) detach(section9);
			if (detaching) detach(t181);
			if (detaching) detach(section10);
			if (detaching) detach(t185);
			if (detaching) detach(section11);
			if (detaching) detach(t201);
			if (detaching) detach(section12);
			if (detaching) detach(t203);
			if (detaching) detach(section13);
			if (detaching) detach(t211);
			if (detaching) detach(section14);
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
	"title": "LeadDev New York 2019",
	"tags": ["technical leadership", "conference notes"],
	"slug": "notes/lead-dev",
	"type": "notes",
	"name": "lead-dev",
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
