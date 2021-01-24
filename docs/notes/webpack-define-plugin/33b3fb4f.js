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

var baseCss = "https://lihautan.com/notes/webpack-define-plugin/assets/blog-base-248115e4.css";

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
			attr(meta8, "content", "https%3A%2F%2Flihautan.com%2Fnotes%2Fwebpack-define-plugin");
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
	let ul0;
	let li0;
	let a0;
	let t0;
	let li1;
	let a1;
	let t1;
	let t2;
	let p0;
	let t3;
	let t4;
	let p1;
	let t5;
	let t6;
	let ul3;
	let li2;
	let t7;
	let t8;
	let li3;
	let t9;
	let t10;
	let li4;
	let t11;
	let t12;
	let li6;
	let t13;
	let ul2;
	let li5;
	let t14;
	let code0;
	let t15;
	let t16;
	let code1;
	let t17;
	let t18;
	let code2;
	let t19;
	let t20;
	let t21;
	let li7;
	let t22;
	let code3;
	let t23;
	let t24;
	let code4;
	let t25;
	let t26;
	let t27;
	let li8;
	let t28;
	let t29;
	let p2;
	let t30;
	let t31;
	let ul5;
	let li9;
	let t32;
	let t33;
	let li10;
	let t34;
	let t35;
	let li11;
	let t36;
	let t37;
	let li13;
	let t38;
	let ul4;
	let li12;
	let t39;
	let t40;
	let p3;
	let t41;
	let t42;
	let pre0;

	let raw0_value = `<code class="language-js"><span class="token keyword">const</span> a <span class="token operator">=</span> __FLAG__<span class="token punctuation">;</span>
<span class="token keyword">if</span> <span class="token punctuation">(</span>a<span class="token punctuation">)</span> <span class="token punctuation">&#123;</span>
   <span class="token function">require</span><span class="token punctuation">(</span><span class="token string">'foo'</span><span class="token punctuation">)</span><span class="token punctuation">;</span>
<span class="token punctuation">&#125;</span> <span class="token keyword">else</span> <span class="token punctuation">&#123;</span>
   <span class="token function">require</span><span class="token punctuation">(</span>bar'<span class="token punctuation">)</span><span class="token punctuation">;</span>
<span class="token punctuation">&#125;</span></code>` + "";

	let t43;
	let p4;
	let t44;
	let t45;
	let pre1;

	let raw1_value = `<code class="language-js"><span class="token keyword">if</span> <span class="token punctuation">(</span>__FLAG__<span class="token punctuation">)</span> <span class="token punctuation">&#123;</span>
   <span class="token function">require</span><span class="token punctuation">(</span><span class="token string">'foo'</span><span class="token punctuation">)</span><span class="token punctuation">;</span>
<span class="token punctuation">&#125;</span> <span class="token keyword">else</span> <span class="token punctuation">&#123;</span>
   <span class="token function">require</span><span class="token punctuation">(</span>bar'<span class="token punctuation">)</span><span class="token punctuation">;</span>
<span class="token punctuation">&#125;</span></code>` + "";

	let t46;
	let p5;
	let t47;
	let code5;
	let t48;
	let t49;
	let t50;
	let pre2;

	let raw2_value = `<code class="language-js"><span class="token keyword">const</span> a <span class="token operator">=</span> <span class="token boolean">true</span><span class="token punctuation">;</span>
<span class="token keyword">if</span> <span class="token punctuation">(</span>a<span class="token punctuation">)</span> <span class="token punctuation">&#123;</span>
   <span class="token function">require</span><span class="token punctuation">(</span><span class="token string">'foo'</span><span class="token punctuation">)</span><span class="token punctuation">;</span>
<span class="token punctuation">&#125;</span> <span class="token keyword">else</span> <span class="token punctuation">&#123;</span>
   <span class="token function">require</span><span class="token punctuation">(</span>bar'<span class="token punctuation">)</span><span class="token punctuation">;</span>
<span class="token punctuation">&#125;</span></code>` + "";

	let t51;
	let p6;
	let t52;
	let t53;
	let pre3;

	let raw3_value = `<code class="language-js"><span class="token keyword">if</span> <span class="token punctuation">(</span><span class="token boolean">true</span><span class="token punctuation">)</span> <span class="token punctuation">&#123;</span>
   <span class="token function">require</span><span class="token punctuation">(</span><span class="token string">'foo'</span><span class="token punctuation">)</span><span class="token punctuation">;</span>
<span class="token punctuation">&#125;</span> <span class="token keyword">else</span> <span class="token punctuation">&#123;</span>
   <span class="token function">require</span><span class="token punctuation">(</span>bar'<span class="token punctuation">)</span><span class="token punctuation">;</span>
<span class="token punctuation">&#125;</span></code>` + "";

	let t54;
	let p7;
	let t55;
	let t56;
	let blockquote;
	let p8;
	let t57;
	let a2;
	let t58;
	let t59;
	let pre4;

	let raw4_value = `<code class="language-js"><span class="token keyword">if</span> <span class="token punctuation">(</span><span class="token boolean">true</span><span class="token punctuation">)</span> <span class="token punctuation">&#123;</span>
  <span class="token function">require</span><span class="token punctuation">(</span><span class="token string">'foo'</span><span class="token punctuation">)</span><span class="token punctuation">;</span>
<span class="token punctuation">&#125;</span> <span class="token keyword">else</span> <span class="token punctuation">&#123;</span> <span class="token punctuation">&#125;</span></code>` + "";

	let t60;
	let p9;
	let t61;
	let code6;
	let t62;
	let t63;
	let code7;
	let t64;
	let t65;
	let code8;
	let t66;
	let t67;
	let t68;
	let section1;
	let h3;
	let a3;
	let t69;
	let t70;
	let p10;
	let t71;
	let t72;
	let pre5;

	let raw5_value = `<code class="language-js"><span class="token keyword">const</span> a <span class="token operator">=</span> <span class="token boolean">true</span><span class="token punctuation">;</span>
<span class="token keyword">if</span> <span class="token punctuation">(</span>a<span class="token punctuation">)</span> <span class="token punctuation">&#123;</span>
   <span class="token function">require</span><span class="token punctuation">(</span><span class="token string">'foo'</span><span class="token punctuation">)</span><span class="token punctuation">;</span>
<span class="token punctuation">&#125;</span> <span class="token keyword">else</span> <span class="token punctuation">&#123;</span>
   <span class="token function">require</span><span class="token punctuation">(</span>bar'<span class="token punctuation">)</span><span class="token punctuation">;</span>
<span class="token punctuation">&#125;</span></code>` + "";

	let t73;
	let p11;
	let t74;
	let t75;
	let pre6;
	let raw6_value = `<code class="language-js"><span class="token function">require</span><span class="token punctuation">(</span><span class="token string">'foo'</span><span class="token punctuation">)</span><span class="token punctuation">;</span></code>` + "";
	let t76;
	let p12;
	let t77;
	let code9;
	let t78;
	let t79;
	let code10;
	let t80;
	let t81;
	let t82;
	let section2;
	let h2;
	let a4;
	let t83;
	let t84;
	let ul6;
	let li14;
	let a5;
	let t85;

	return {
		c() {
			section0 = element("section");
			ul1 = element("ul");
			ul0 = element("ul");
			li0 = element("li");
			a0 = element("a");
			t0 = text("What about terser?");
			li1 = element("li");
			a1 = element("a");
			t1 = text("Read More");
			t2 = space();
			p0 = element("p");
			t3 = text("a high level of define plugin, treeshake + minification happens in the following");
			t4 = space();
			p1 = element("p");
			t5 = text("for any module,");
			t6 = space();
			ul3 = element("ul");
			li2 = element("li");
			t7 = text("webpack reads the source code");
			t8 = space();
			li3 = element("li");
			t9 = text("apply all the loaders");
			t10 = space();
			li4 = element("li");
			t11 = text("apply define plugin");
			t12 = space();
			li6 = element("li");
			t13 = text("for the final code after loaders + define plugin, ");
			ul2 = element("ul");
			li5 = element("li");
			t14 = text("for code at ");
			code0 = element("code");
			t15 = text("if (truthy)");
			t16 = text(" or ");
			code1 = element("code");
			t17 = text("truthy && ...");
			t18 = text(" or ");
			code2 = element("code");
			t19 = text("truthy ? ... : ...");
			t20 = text(", webpack will try to collapse that conditional, meaning based on truthy / falsy value, remove unwanted code logic paths");
			t21 = space();
			li7 = element("li");
			t22 = text("find all the ");
			code3 = element("code");
			t23 = text("imports");
			t24 = text(" or ");
			code4 = element("code");
			t25 = text("require");
			t26 = text(" in the code");
			t27 = space();
			li8 = element("li");
			t28 = text("traverse them and apply the same step for each module");
			t29 = space();
			p2 = element("p");
			t30 = text("after creating the module map");
			t31 = space();
			ul5 = element("ul");
			li9 = element("li");
			t32 = text("create chunks based on dynamic import()");
			t33 = space();
			li10 = element("li");
			t34 = text("apply graph based optimisation - such as mark unused exports and treeshake them away");
			t35 = space();
			li11 = element("li");
			t36 = text("granular split chuks optimisation");
			t37 = space();
			li13 = element("li");
			t38 = text("lastly, for each chunk");
			ul4 = element("ul");
			li12 = element("li");
			t39 = text("run terser to minify the code, will remove any unused variables / functions within each chunk");
			t40 = space();
			p3 = element("p");
			t41 = text("which means, there's a difference between the following contrived code:");
			t42 = space();
			pre0 = element("pre");
			t43 = space();
			p4 = element("p");
			t44 = text("and");
			t45 = space();
			pre1 = element("pre");
			t46 = space();
			p5 = element("p");
			t47 = text("after applying ");
			code5 = element("code");
			t48 = text("new DefinePlugin({ __FLAG__: true })");
			t49 = text(", you get:");
			t50 = space();
			pre2 = element("pre");
			t51 = space();
			p6 = element("p");
			t52 = text("and");
			t53 = space();
			pre3 = element("pre");
			t54 = space();
			p7 = element("p");
			t55 = text("webpack's parser is able to collapse the conditional of the latter, but not the former.");
			t56 = space();
			blockquote = element("blockquote");
			p8 = element("p");
			t57 = text("the collapse of conditional expression happens ");
			a2 = element("a");
			t58 = text("here");
			t59 = space();
			pre4 = element("pre");
			t60 = space();
			p9 = element("p");
			t61 = text("so, the former case, will have both ");
			code6 = element("code");
			t62 = text("foo");
			t63 = text(" and ");
			code7 = element("code");
			t64 = text("bar");
			t65 = text(" in the bundled code ,but the latter will only have ");
			code8 = element("code");
			t66 = text("foo");
			t67 = text(".");
			t68 = space();
			section1 = element("section");
			h3 = element("h3");
			a3 = element("a");
			t69 = text("What about terser?");
			t70 = space();
			p10 = element("p");
			t71 = text("terser runs on chunk level after all the bundling and chunking logic, so even though terser is smart enough to collapse");
			t72 = space();
			pre5 = element("pre");
			t73 = space();
			p11 = element("p");
			t74 = text("into");
			t75 = space();
			pre6 = element("pre");
			t76 = space();
			p12 = element("p");
			t77 = text("the bundled code still have ");
			code9 = element("code");
			t78 = text("foo");
			t79 = text(" and ");
			code10 = element("code");
			t80 = text("bar");
			t81 = text("'s code.");
			t82 = space();
			section2 = element("section");
			h2 = element("h2");
			a4 = element("a");
			t83 = text("Read More");
			t84 = space();
			ul6 = element("ul");
			li14 = element("li");
			a5 = element("a");
			t85 = text("https://webpack.js.org/plugins/internal-plugins/#constplugin");
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
			ul0 = claim_element(ul1_nodes, "UL", {});
			var ul0_nodes = children(ul0);
			li0 = claim_element(ul0_nodes, "LI", {});
			var li0_nodes = children(li0);
			a0 = claim_element(li0_nodes, "A", { href: true });
			var a0_nodes = children(a0);
			t0 = claim_text(a0_nodes, "What about terser?");
			a0_nodes.forEach(detach);
			li0_nodes.forEach(detach);
			ul0_nodes.forEach(detach);
			li1 = claim_element(ul1_nodes, "LI", {});
			var li1_nodes = children(li1);
			a1 = claim_element(li1_nodes, "A", { href: true });
			var a1_nodes = children(a1);
			t1 = claim_text(a1_nodes, "Read More");
			a1_nodes.forEach(detach);
			li1_nodes.forEach(detach);
			ul1_nodes.forEach(detach);
			section0_nodes.forEach(detach);
			t2 = claim_space(nodes);
			p0 = claim_element(nodes, "P", {});
			var p0_nodes = children(p0);
			t3 = claim_text(p0_nodes, "a high level of define plugin, treeshake + minification happens in the following");
			p0_nodes.forEach(detach);
			t4 = claim_space(nodes);
			p1 = claim_element(nodes, "P", {});
			var p1_nodes = children(p1);
			t5 = claim_text(p1_nodes, "for any module,");
			p1_nodes.forEach(detach);
			t6 = claim_space(nodes);
			ul3 = claim_element(nodes, "UL", {});
			var ul3_nodes = children(ul3);
			li2 = claim_element(ul3_nodes, "LI", {});
			var li2_nodes = children(li2);
			t7 = claim_text(li2_nodes, "webpack reads the source code");
			li2_nodes.forEach(detach);
			t8 = claim_space(ul3_nodes);
			li3 = claim_element(ul3_nodes, "LI", {});
			var li3_nodes = children(li3);
			t9 = claim_text(li3_nodes, "apply all the loaders");
			li3_nodes.forEach(detach);
			t10 = claim_space(ul3_nodes);
			li4 = claim_element(ul3_nodes, "LI", {});
			var li4_nodes = children(li4);
			t11 = claim_text(li4_nodes, "apply define plugin");
			li4_nodes.forEach(detach);
			t12 = claim_space(ul3_nodes);
			li6 = claim_element(ul3_nodes, "LI", {});
			var li6_nodes = children(li6);
			t13 = claim_text(li6_nodes, "for the final code after loaders + define plugin, ");
			ul2 = claim_element(li6_nodes, "UL", {});
			var ul2_nodes = children(ul2);
			li5 = claim_element(ul2_nodes, "LI", {});
			var li5_nodes = children(li5);
			t14 = claim_text(li5_nodes, "for code at ");
			code0 = claim_element(li5_nodes, "CODE", {});
			var code0_nodes = children(code0);
			t15 = claim_text(code0_nodes, "if (truthy)");
			code0_nodes.forEach(detach);
			t16 = claim_text(li5_nodes, " or ");
			code1 = claim_element(li5_nodes, "CODE", {});
			var code1_nodes = children(code1);
			t17 = claim_text(code1_nodes, "truthy && ...");
			code1_nodes.forEach(detach);
			t18 = claim_text(li5_nodes, " or ");
			code2 = claim_element(li5_nodes, "CODE", {});
			var code2_nodes = children(code2);
			t19 = claim_text(code2_nodes, "truthy ? ... : ...");
			code2_nodes.forEach(detach);
			t20 = claim_text(li5_nodes, ", webpack will try to collapse that conditional, meaning based on truthy / falsy value, remove unwanted code logic paths");
			li5_nodes.forEach(detach);
			ul2_nodes.forEach(detach);
			li6_nodes.forEach(detach);
			t21 = claim_space(ul3_nodes);
			li7 = claim_element(ul3_nodes, "LI", {});
			var li7_nodes = children(li7);
			t22 = claim_text(li7_nodes, "find all the ");
			code3 = claim_element(li7_nodes, "CODE", {});
			var code3_nodes = children(code3);
			t23 = claim_text(code3_nodes, "imports");
			code3_nodes.forEach(detach);
			t24 = claim_text(li7_nodes, " or ");
			code4 = claim_element(li7_nodes, "CODE", {});
			var code4_nodes = children(code4);
			t25 = claim_text(code4_nodes, "require");
			code4_nodes.forEach(detach);
			t26 = claim_text(li7_nodes, " in the code");
			li7_nodes.forEach(detach);
			t27 = claim_space(ul3_nodes);
			li8 = claim_element(ul3_nodes, "LI", {});
			var li8_nodes = children(li8);
			t28 = claim_text(li8_nodes, "traverse them and apply the same step for each module");
			li8_nodes.forEach(detach);
			ul3_nodes.forEach(detach);
			t29 = claim_space(nodes);
			p2 = claim_element(nodes, "P", {});
			var p2_nodes = children(p2);
			t30 = claim_text(p2_nodes, "after creating the module map");
			p2_nodes.forEach(detach);
			t31 = claim_space(nodes);
			ul5 = claim_element(nodes, "UL", {});
			var ul5_nodes = children(ul5);
			li9 = claim_element(ul5_nodes, "LI", {});
			var li9_nodes = children(li9);
			t32 = claim_text(li9_nodes, "create chunks based on dynamic import()");
			li9_nodes.forEach(detach);
			t33 = claim_space(ul5_nodes);
			li10 = claim_element(ul5_nodes, "LI", {});
			var li10_nodes = children(li10);
			t34 = claim_text(li10_nodes, "apply graph based optimisation - such as mark unused exports and treeshake them away");
			li10_nodes.forEach(detach);
			t35 = claim_space(ul5_nodes);
			li11 = claim_element(ul5_nodes, "LI", {});
			var li11_nodes = children(li11);
			t36 = claim_text(li11_nodes, "granular split chuks optimisation");
			li11_nodes.forEach(detach);
			t37 = claim_space(ul5_nodes);
			li13 = claim_element(ul5_nodes, "LI", {});
			var li13_nodes = children(li13);
			t38 = claim_text(li13_nodes, "lastly, for each chunk");
			ul4 = claim_element(li13_nodes, "UL", {});
			var ul4_nodes = children(ul4);
			li12 = claim_element(ul4_nodes, "LI", {});
			var li12_nodes = children(li12);
			t39 = claim_text(li12_nodes, "run terser to minify the code, will remove any unused variables / functions within each chunk");
			li12_nodes.forEach(detach);
			ul4_nodes.forEach(detach);
			li13_nodes.forEach(detach);
			ul5_nodes.forEach(detach);
			t40 = claim_space(nodes);
			p3 = claim_element(nodes, "P", {});
			var p3_nodes = children(p3);
			t41 = claim_text(p3_nodes, "which means, there's a difference between the following contrived code:");
			p3_nodes.forEach(detach);
			t42 = claim_space(nodes);
			pre0 = claim_element(nodes, "PRE", { class: true });
			var pre0_nodes = children(pre0);
			pre0_nodes.forEach(detach);
			t43 = claim_space(nodes);
			p4 = claim_element(nodes, "P", {});
			var p4_nodes = children(p4);
			t44 = claim_text(p4_nodes, "and");
			p4_nodes.forEach(detach);
			t45 = claim_space(nodes);
			pre1 = claim_element(nodes, "PRE", { class: true });
			var pre1_nodes = children(pre1);
			pre1_nodes.forEach(detach);
			t46 = claim_space(nodes);
			p5 = claim_element(nodes, "P", {});
			var p5_nodes = children(p5);
			t47 = claim_text(p5_nodes, "after applying ");
			code5 = claim_element(p5_nodes, "CODE", {});
			var code5_nodes = children(code5);
			t48 = claim_text(code5_nodes, "new DefinePlugin({ __FLAG__: true })");
			code5_nodes.forEach(detach);
			t49 = claim_text(p5_nodes, ", you get:");
			p5_nodes.forEach(detach);
			t50 = claim_space(nodes);
			pre2 = claim_element(nodes, "PRE", { class: true });
			var pre2_nodes = children(pre2);
			pre2_nodes.forEach(detach);
			t51 = claim_space(nodes);
			p6 = claim_element(nodes, "P", {});
			var p6_nodes = children(p6);
			t52 = claim_text(p6_nodes, "and");
			p6_nodes.forEach(detach);
			t53 = claim_space(nodes);
			pre3 = claim_element(nodes, "PRE", { class: true });
			var pre3_nodes = children(pre3);
			pre3_nodes.forEach(detach);
			t54 = claim_space(nodes);
			p7 = claim_element(nodes, "P", {});
			var p7_nodes = children(p7);
			t55 = claim_text(p7_nodes, "webpack's parser is able to collapse the conditional of the latter, but not the former.");
			p7_nodes.forEach(detach);
			t56 = claim_space(nodes);
			blockquote = claim_element(nodes, "BLOCKQUOTE", {});
			var blockquote_nodes = children(blockquote);
			p8 = claim_element(blockquote_nodes, "P", {});
			var p8_nodes = children(p8);
			t57 = claim_text(p8_nodes, "the collapse of conditional expression happens ");
			a2 = claim_element(p8_nodes, "A", { href: true, rel: true });
			var a2_nodes = children(a2);
			t58 = claim_text(a2_nodes, "here");
			a2_nodes.forEach(detach);
			p8_nodes.forEach(detach);
			blockquote_nodes.forEach(detach);
			t59 = claim_space(nodes);
			pre4 = claim_element(nodes, "PRE", { class: true });
			var pre4_nodes = children(pre4);
			pre4_nodes.forEach(detach);
			t60 = claim_space(nodes);
			p9 = claim_element(nodes, "P", {});
			var p9_nodes = children(p9);
			t61 = claim_text(p9_nodes, "so, the former case, will have both ");
			code6 = claim_element(p9_nodes, "CODE", {});
			var code6_nodes = children(code6);
			t62 = claim_text(code6_nodes, "foo");
			code6_nodes.forEach(detach);
			t63 = claim_text(p9_nodes, " and ");
			code7 = claim_element(p9_nodes, "CODE", {});
			var code7_nodes = children(code7);
			t64 = claim_text(code7_nodes, "bar");
			code7_nodes.forEach(detach);
			t65 = claim_text(p9_nodes, " in the bundled code ,but the latter will only have ");
			code8 = claim_element(p9_nodes, "CODE", {});
			var code8_nodes = children(code8);
			t66 = claim_text(code8_nodes, "foo");
			code8_nodes.forEach(detach);
			t67 = claim_text(p9_nodes, ".");
			p9_nodes.forEach(detach);
			t68 = claim_space(nodes);
			section1 = claim_element(nodes, "SECTION", {});
			var section1_nodes = children(section1);
			h3 = claim_element(section1_nodes, "H3", {});
			var h3_nodes = children(h3);
			a3 = claim_element(h3_nodes, "A", { href: true, id: true });
			var a3_nodes = children(a3);
			t69 = claim_text(a3_nodes, "What about terser?");
			a3_nodes.forEach(detach);
			h3_nodes.forEach(detach);
			t70 = claim_space(section1_nodes);
			p10 = claim_element(section1_nodes, "P", {});
			var p10_nodes = children(p10);
			t71 = claim_text(p10_nodes, "terser runs on chunk level after all the bundling and chunking logic, so even though terser is smart enough to collapse");
			p10_nodes.forEach(detach);
			t72 = claim_space(section1_nodes);
			pre5 = claim_element(section1_nodes, "PRE", { class: true });
			var pre5_nodes = children(pre5);
			pre5_nodes.forEach(detach);
			t73 = claim_space(section1_nodes);
			p11 = claim_element(section1_nodes, "P", {});
			var p11_nodes = children(p11);
			t74 = claim_text(p11_nodes, "into");
			p11_nodes.forEach(detach);
			t75 = claim_space(section1_nodes);
			pre6 = claim_element(section1_nodes, "PRE", { class: true });
			var pre6_nodes = children(pre6);
			pre6_nodes.forEach(detach);
			t76 = claim_space(section1_nodes);
			p12 = claim_element(section1_nodes, "P", {});
			var p12_nodes = children(p12);
			t77 = claim_text(p12_nodes, "the bundled code still have ");
			code9 = claim_element(p12_nodes, "CODE", {});
			var code9_nodes = children(code9);
			t78 = claim_text(code9_nodes, "foo");
			code9_nodes.forEach(detach);
			t79 = claim_text(p12_nodes, " and ");
			code10 = claim_element(p12_nodes, "CODE", {});
			var code10_nodes = children(code10);
			t80 = claim_text(code10_nodes, "bar");
			code10_nodes.forEach(detach);
			t81 = claim_text(p12_nodes, "'s code.");
			p12_nodes.forEach(detach);
			section1_nodes.forEach(detach);
			t82 = claim_space(nodes);
			section2 = claim_element(nodes, "SECTION", {});
			var section2_nodes = children(section2);
			h2 = claim_element(section2_nodes, "H2", {});
			var h2_nodes = children(h2);
			a4 = claim_element(h2_nodes, "A", { href: true, id: true });
			var a4_nodes = children(a4);
			t83 = claim_text(a4_nodes, "Read More");
			a4_nodes.forEach(detach);
			h2_nodes.forEach(detach);
			t84 = claim_space(section2_nodes);
			ul6 = claim_element(section2_nodes, "UL", {});
			var ul6_nodes = children(ul6);
			li14 = claim_element(ul6_nodes, "LI", {});
			var li14_nodes = children(li14);
			a5 = claim_element(li14_nodes, "A", { href: true, rel: true });
			var a5_nodes = children(a5);
			t85 = claim_text(a5_nodes, "https://webpack.js.org/plugins/internal-plugins/#constplugin");
			a5_nodes.forEach(detach);
			li14_nodes.forEach(detach);
			ul6_nodes.forEach(detach);
			section2_nodes.forEach(detach);
			this.h();
		},
		h() {
			attr(a0, "href", "#what-about-terser");
			attr(a1, "href", "#read-more");
			attr(ul1, "class", "sitemap");
			attr(ul1, "id", "sitemap");
			attr(ul1, "role", "navigation");
			attr(ul1, "aria-label", "Table of Contents");
			attr(pre0, "class", "language-js");
			attr(pre1, "class", "language-js");
			attr(pre2, "class", "language-js");
			attr(pre3, "class", "language-js");
			attr(a2, "href", "https://github.com/webpack/webpack/blob/master/lib/ConstPlugin.js#L133");
			attr(a2, "rel", "nofollow");
			attr(pre4, "class", "language-js");
			attr(a3, "href", "#what-about-terser");
			attr(a3, "id", "what-about-terser");
			attr(pre5, "class", "language-js");
			attr(pre6, "class", "language-js");
			attr(a4, "href", "#read-more");
			attr(a4, "id", "read-more");
			attr(a5, "href", "https://webpack.js.org/plugins/internal-plugins/#constplugin");
			attr(a5, "rel", "nofollow");
		},
		m(target, anchor) {
			insert(target, section0, anchor);
			append(section0, ul1);
			append(ul1, ul0);
			append(ul0, li0);
			append(li0, a0);
			append(a0, t0);
			append(ul1, li1);
			append(li1, a1);
			append(a1, t1);
			insert(target, t2, anchor);
			insert(target, p0, anchor);
			append(p0, t3);
			insert(target, t4, anchor);
			insert(target, p1, anchor);
			append(p1, t5);
			insert(target, t6, anchor);
			insert(target, ul3, anchor);
			append(ul3, li2);
			append(li2, t7);
			append(ul3, t8);
			append(ul3, li3);
			append(li3, t9);
			append(ul3, t10);
			append(ul3, li4);
			append(li4, t11);
			append(ul3, t12);
			append(ul3, li6);
			append(li6, t13);
			append(li6, ul2);
			append(ul2, li5);
			append(li5, t14);
			append(li5, code0);
			append(code0, t15);
			append(li5, t16);
			append(li5, code1);
			append(code1, t17);
			append(li5, t18);
			append(li5, code2);
			append(code2, t19);
			append(li5, t20);
			append(ul3, t21);
			append(ul3, li7);
			append(li7, t22);
			append(li7, code3);
			append(code3, t23);
			append(li7, t24);
			append(li7, code4);
			append(code4, t25);
			append(li7, t26);
			append(ul3, t27);
			append(ul3, li8);
			append(li8, t28);
			insert(target, t29, anchor);
			insert(target, p2, anchor);
			append(p2, t30);
			insert(target, t31, anchor);
			insert(target, ul5, anchor);
			append(ul5, li9);
			append(li9, t32);
			append(ul5, t33);
			append(ul5, li10);
			append(li10, t34);
			append(ul5, t35);
			append(ul5, li11);
			append(li11, t36);
			append(ul5, t37);
			append(ul5, li13);
			append(li13, t38);
			append(li13, ul4);
			append(ul4, li12);
			append(li12, t39);
			insert(target, t40, anchor);
			insert(target, p3, anchor);
			append(p3, t41);
			insert(target, t42, anchor);
			insert(target, pre0, anchor);
			pre0.innerHTML = raw0_value;
			insert(target, t43, anchor);
			insert(target, p4, anchor);
			append(p4, t44);
			insert(target, t45, anchor);
			insert(target, pre1, anchor);
			pre1.innerHTML = raw1_value;
			insert(target, t46, anchor);
			insert(target, p5, anchor);
			append(p5, t47);
			append(p5, code5);
			append(code5, t48);
			append(p5, t49);
			insert(target, t50, anchor);
			insert(target, pre2, anchor);
			pre2.innerHTML = raw2_value;
			insert(target, t51, anchor);
			insert(target, p6, anchor);
			append(p6, t52);
			insert(target, t53, anchor);
			insert(target, pre3, anchor);
			pre3.innerHTML = raw3_value;
			insert(target, t54, anchor);
			insert(target, p7, anchor);
			append(p7, t55);
			insert(target, t56, anchor);
			insert(target, blockquote, anchor);
			append(blockquote, p8);
			append(p8, t57);
			append(p8, a2);
			append(a2, t58);
			insert(target, t59, anchor);
			insert(target, pre4, anchor);
			pre4.innerHTML = raw4_value;
			insert(target, t60, anchor);
			insert(target, p9, anchor);
			append(p9, t61);
			append(p9, code6);
			append(code6, t62);
			append(p9, t63);
			append(p9, code7);
			append(code7, t64);
			append(p9, t65);
			append(p9, code8);
			append(code8, t66);
			append(p9, t67);
			insert(target, t68, anchor);
			insert(target, section1, anchor);
			append(section1, h3);
			append(h3, a3);
			append(a3, t69);
			append(section1, t70);
			append(section1, p10);
			append(p10, t71);
			append(section1, t72);
			append(section1, pre5);
			pre5.innerHTML = raw5_value;
			append(section1, t73);
			append(section1, p11);
			append(p11, t74);
			append(section1, t75);
			append(section1, pre6);
			pre6.innerHTML = raw6_value;
			append(section1, t76);
			append(section1, p12);
			append(p12, t77);
			append(p12, code9);
			append(code9, t78);
			append(p12, t79);
			append(p12, code10);
			append(code10, t80);
			append(p12, t81);
			insert(target, t82, anchor);
			insert(target, section2, anchor);
			append(section2, h2);
			append(h2, a4);
			append(a4, t83);
			append(section2, t84);
			append(section2, ul6);
			append(ul6, li14);
			append(li14, a5);
			append(a5, t85);
		},
		p: noop,
		d(detaching) {
			if (detaching) detach(section0);
			if (detaching) detach(t2);
			if (detaching) detach(p0);
			if (detaching) detach(t4);
			if (detaching) detach(p1);
			if (detaching) detach(t6);
			if (detaching) detach(ul3);
			if (detaching) detach(t29);
			if (detaching) detach(p2);
			if (detaching) detach(t31);
			if (detaching) detach(ul5);
			if (detaching) detach(t40);
			if (detaching) detach(p3);
			if (detaching) detach(t42);
			if (detaching) detach(pre0);
			if (detaching) detach(t43);
			if (detaching) detach(p4);
			if (detaching) detach(t45);
			if (detaching) detach(pre1);
			if (detaching) detach(t46);
			if (detaching) detach(p5);
			if (detaching) detach(t50);
			if (detaching) detach(pre2);
			if (detaching) detach(t51);
			if (detaching) detach(p6);
			if (detaching) detach(t53);
			if (detaching) detach(pre3);
			if (detaching) detach(t54);
			if (detaching) detach(p7);
			if (detaching) detach(t56);
			if (detaching) detach(blockquote);
			if (detaching) detach(t59);
			if (detaching) detach(pre4);
			if (detaching) detach(t60);
			if (detaching) detach(p9);
			if (detaching) detach(t68);
			if (detaching) detach(section1);
			if (detaching) detach(t82);
			if (detaching) detach(section2);
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
	"title": "Webpack Define Plugin",
	"tags": ["define plugin", "feature flag"],
	"slug": "notes/webpack-define-plugin",
	"type": "notes",
	"name": "webpack-define-plugin",
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
