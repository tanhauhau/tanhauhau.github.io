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

var baseCss = "https://lihautan.com/notes/responsive-email-layout/assets/blog-base-3554d53c.css";

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
			attr(span, "class", "svelte-186dllz");
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
			attr(meta8, "content", "https%3A%2F%2Flihautan.com%2Fnotes%2Fresponsive-email-layout");
			attr(a, "href", "#content");
			attr(a, "class", "skip svelte-186dllz");
			attr(article, "class", "svelte-186dllz");
			attr(main, "id", "content");
			attr(main, "class", "blog svelte-186dllz");
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
	let a;
	let t0;
	let t1;
	let p1;
	let t2;
	let code0;
	let t3;
	let t4;
	let code1;
	let t5;
	let t6;
	let code2;
	let t7;
	let t8;
	let code3;
	let t9;
	let t10;
	let pre0;

	let raw0_value = `<code class="language-html"><span class="token tag"><span class="token tag"><span class="token punctuation">&lt;</span>style</span><span class="token punctuation">></span></span><span class="token style"><span class="token language-css">
  <span class="token selector">.item</span> <span class="token punctuation">&#123;</span>
    <span class="token property">display</span><span class="token punctuation">:</span> inline-block<span class="token punctuation">;</span>
    <span class="token property">min-width</span><span class="token punctuation">:</span> 50%<span class="token punctuation">;</span>
  <span class="token punctuation">&#125;</span>
  <span class="token atrule"><span class="token rule">@media</span><span class="token punctuation">(</span><span class="token property">min-width</span><span class="token punctuation">:</span> 720px<span class="token punctuation">)</span></span> <span class="token punctuation">&#123;</span>
    <span class="token selector">.item</span> <span class="token punctuation">&#123;</span>
      <span class="token property">width</span><span class="token punctuation">:</span> 25%<span class="token punctuation">;</span>
    <span class="token punctuation">&#125;</span>
  <span class="token punctuation">&#125;</span>
</span></span><span class="token tag"><span class="token tag"><span class="token punctuation">&lt;/</span>style</span><span class="token punctuation">></span></span>	

<span class="token tag"><span class="token tag"><span class="token punctuation">&lt;</span>div</span><span class="token punctuation">></span></span>
  <span class="token tag"><span class="token tag"><span class="token punctuation">&lt;</span>div</span> <span class="token attr-name">class</span><span class="token attr-value"><span class="token punctuation">=</span><span class="token punctuation">"</span>item<span class="token punctuation">"</span></span><span class="token punctuation">></span></span><span class="token tag"><span class="token tag"><span class="token punctuation">&lt;/</span>div</span><span class="token punctuation">></span></span>
  <span class="token tag"><span class="token tag"><span class="token punctuation">&lt;</span>div</span> <span class="token attr-name">class</span><span class="token attr-value"><span class="token punctuation">=</span><span class="token punctuation">"</span>item<span class="token punctuation">"</span></span><span class="token punctuation">></span></span><span class="token tag"><span class="token tag"><span class="token punctuation">&lt;/</span>div</span><span class="token punctuation">></span></span>
  <span class="token tag"><span class="token tag"><span class="token punctuation">&lt;</span>div</span> <span class="token attr-name">class</span><span class="token attr-value"><span class="token punctuation">=</span><span class="token punctuation">"</span>item<span class="token punctuation">"</span></span><span class="token punctuation">></span></span><span class="token tag"><span class="token tag"><span class="token punctuation">&lt;/</span>div</span><span class="token punctuation">></span></span>
  <span class="token tag"><span class="token tag"><span class="token punctuation">&lt;</span>div</span> <span class="token attr-name">class</span><span class="token attr-value"><span class="token punctuation">=</span><span class="token punctuation">"</span>item<span class="token punctuation">"</span></span><span class="token punctuation">></span></span><span class="token tag"><span class="token tag"><span class="token punctuation">&lt;/</span>div</span><span class="token punctuation">></span></span>
<span class="token tag"><span class="token tag"><span class="token punctuation">&lt;/</span>div</span><span class="token punctuation">></span></span></code>` + "";

	let t11;
	let pre1;

	let raw1_value = `<code class="language-html"><span class="token tag"><span class="token tag"><span class="token punctuation">&lt;</span>style</span><span class="token punctuation">></span></span><span class="token style"><span class="token language-css">
  <span class="token selector">.item</span> <span class="token punctuation">&#123;</span>
    <span class="token property">display</span><span class="token punctuation">:</span> inline-block<span class="token punctuation">;</span>
    <span class="token property">min-width</span><span class="token punctuation">:</span> 25%<span class="token punctuation">;</span>
    <span class="token property">max-width</span><span class="token punctuation">:</span> 50%<span class="token punctuation">;</span>
    <span class="token property">width</span><span class="token punctuation">:</span> <span class="token function">calc</span><span class="token punctuation">(</span><span class="token punctuation">(</span>720px - 100%<span class="token punctuation">)</span> * 720<span class="token punctuation">)</span><span class="token punctuation">;</span>
  <span class="token punctuation">&#125;</span>
</span></span><span class="token tag"><span class="token tag"><span class="token punctuation">&lt;/</span>style</span><span class="token punctuation">></span></span>	

<span class="token tag"><span class="token tag"><span class="token punctuation">&lt;</span>div</span><span class="token punctuation">></span></span>
  <span class="token tag"><span class="token tag"><span class="token punctuation">&lt;</span>div</span> <span class="token attr-name">class</span><span class="token attr-value"><span class="token punctuation">=</span><span class="token punctuation">"</span>item<span class="token punctuation">"</span></span><span class="token punctuation">></span></span><span class="token tag"><span class="token tag"><span class="token punctuation">&lt;/</span>div</span><span class="token punctuation">></span></span>
  <span class="token tag"><span class="token tag"><span class="token punctuation">&lt;</span>div</span> <span class="token attr-name">class</span><span class="token attr-value"><span class="token punctuation">=</span><span class="token punctuation">"</span>item<span class="token punctuation">"</span></span><span class="token punctuation">></span></span><span class="token tag"><span class="token tag"><span class="token punctuation">&lt;/</span>div</span><span class="token punctuation">></span></span>
  <span class="token tag"><span class="token tag"><span class="token punctuation">&lt;</span>div</span> <span class="token attr-name">class</span><span class="token attr-value"><span class="token punctuation">=</span><span class="token punctuation">"</span>item<span class="token punctuation">"</span></span><span class="token punctuation">></span></span><span class="token tag"><span class="token tag"><span class="token punctuation">&lt;/</span>div</span><span class="token punctuation">></span></span>
  <span class="token tag"><span class="token tag"><span class="token punctuation">&lt;</span>div</span> <span class="token attr-name">class</span><span class="token attr-value"><span class="token punctuation">=</span><span class="token punctuation">"</span>item<span class="token punctuation">"</span></span><span class="token punctuation">></span></span><span class="token tag"><span class="token tag"><span class="token punctuation">&lt;/</span>div</span><span class="token punctuation">></span></span>
<span class="token tag"><span class="token tag"><span class="token punctuation">&lt;/</span>div</span><span class="token punctuation">></span></span></code>` + "";

	let t12;
	let p2;
	let t13;
	let t14;
	let ul0;
	let li0;
	let t15;
	let code4;
	let t16;
	let t17;
	let code5;
	let t18;
	let t19;
	let li1;
	let t20;
	let code6;
	let t21;
	let t22;
	let code7;
	let t23;
	let t24;
	let p3;
	let t25;
	let code8;
	let t26;
	let t27;
	let code9;
	let t28;
	let t29;
	let t30;
	let p4;
	let t31;
	let code10;
	let t32;
	let t33;
	let code11;
	let t34;
	let t35;
	let t36;
	let p5;
	let t37;
	let code12;
	let t38;
	let t39;
	let ul1;
	let li2;
	let t40;
	let t41;
	let li3;
	let t42;
	let code13;
	let t43;
	let t44;
	let code14;
	let t45;
	let t46;
	let code15;
	let t47;
	let t48;
	let t49;
	let pre2;

	let raw2_value = `<code class="language-html"><span class="token tag"><span class="token tag"><span class="token punctuation">&lt;</span>style</span><span class="token punctuation">></span></span><span class="token style"><span class="token language-css">
  <span class="token selector">.item</span> <span class="token punctuation">&#123;</span>
    <span class="token property">display</span><span class="token punctuation">:</span> inline-block<span class="token punctuation">;</span>
    <span class="token property">min-width</span><span class="token punctuation">:</span> 180px<span class="token punctuation">;</span> <span class="token comment">/* fallback, 720px * 25% */</span>
    <span class="token property">min-width</span><span class="token punctuation">:</span> <span class="token function">calc</span><span class="token punctuation">(</span>25%<span class="token punctuation">)</span><span class="token punctuation">;</span>
    <span class="token property">max-width</span><span class="token punctuation">:</span> 50%<span class="token punctuation">;</span>
    <span class="token property">width</span><span class="token punctuation">:</span> 25%<span class="token punctuation">;</span> <span class="token comment">/* fallback, size for desktop layout */</span>
    <span class="token property">width</span><span class="token punctuation">:</span> <span class="token function">calc</span><span class="token punctuation">(</span><span class="token punctuation">(</span>720px - 100%<span class="token punctuation">)</span> * 720<span class="token punctuation">)</span><span class="token punctuation">;</span>
  <span class="token punctuation">&#125;</span>
</span></span><span class="token tag"><span class="token tag"><span class="token punctuation">&lt;/</span>style</span><span class="token punctuation">></span></span>	

<span class="token tag"><span class="token tag"><span class="token punctuation">&lt;</span>div</span><span class="token punctuation">></span></span>
  <span class="token tag"><span class="token tag"><span class="token punctuation">&lt;</span>div</span> <span class="token attr-name">class</span><span class="token attr-value"><span class="token punctuation">=</span><span class="token punctuation">"</span>item<span class="token punctuation">"</span></span><span class="token punctuation">></span></span><span class="token tag"><span class="token tag"><span class="token punctuation">&lt;/</span>div</span><span class="token punctuation">></span></span>
  <span class="token tag"><span class="token tag"><span class="token punctuation">&lt;</span>div</span> <span class="token attr-name">class</span><span class="token attr-value"><span class="token punctuation">=</span><span class="token punctuation">"</span>item<span class="token punctuation">"</span></span><span class="token punctuation">></span></span><span class="token tag"><span class="token tag"><span class="token punctuation">&lt;/</span>div</span><span class="token punctuation">></span></span>
  <span class="token tag"><span class="token tag"><span class="token punctuation">&lt;</span>div</span> <span class="token attr-name">class</span><span class="token attr-value"><span class="token punctuation">=</span><span class="token punctuation">"</span>item<span class="token punctuation">"</span></span><span class="token punctuation">></span></span><span class="token tag"><span class="token tag"><span class="token punctuation">&lt;/</span>div</span><span class="token punctuation">></span></span>
  <span class="token tag"><span class="token tag"><span class="token punctuation">&lt;</span>div</span> <span class="token attr-name">class</span><span class="token attr-value"><span class="token punctuation">=</span><span class="token punctuation">"</span>item<span class="token punctuation">"</span></span><span class="token punctuation">></span></span><span class="token tag"><span class="token tag"><span class="token punctuation">&lt;/</span>div</span><span class="token punctuation">></span></span>
<span class="token tag"><span class="token tag"><span class="token punctuation">&lt;/</span>div</span><span class="token punctuation">></span></span></code>` + "";

	let t50;
	let p6;
	let t51;
	let t52;
	let pre3;

	let raw3_value = `<code class="language-html"><span class="token tag"><span class="token tag"><span class="token punctuation">&lt;</span>style</span><span class="token punctuation">></span></span><span class="token style"><span class="token language-css">
  <span class="token selector">.item</span> <span class="token punctuation">&#123;</span>
    <span class="token property">display</span><span class="token punctuation">:</span> inline-block<span class="token punctuation">;</span>
    <span class="token property">min-width</span><span class="token punctuation">:</span> 180px<span class="token punctuation">;</span> <span class="token comment">/* fallback, 720px * 25% */</span>
    <span class="token property">min-width</span><span class="token punctuation">:</span> <span class="token function">-webkit-calc</span><span class="token punctuation">(</span>25%<span class="token punctuation">)</span><span class="token punctuation">;</span>
    <span class="token property">min-width</span><span class="token punctuation">:</span> <span class="token function">calc</span><span class="token punctuation">(</span>25%<span class="token punctuation">)</span><span class="token punctuation">;</span>
    <span class="token property">max-width</span><span class="token punctuation">:</span> 50%<span class="token punctuation">;</span>
    <span class="token property">width</span><span class="token punctuation">:</span> 25%<span class="token punctuation">;</span> <span class="token comment">/* fallback, size for desktop layout */</span>
    <span class="token property">width</span><span class="token punctuation">:</span> <span class="token function">-webkit-calc</span><span class="token punctuation">(</span><span class="token punctuation">(</span>720px - 100%<span class="token punctuation">)</span> * 720<span class="token punctuation">)</span><span class="token punctuation">;</span>
    <span class="token property">width</span><span class="token punctuation">:</span> <span class="token function">calc</span><span class="token punctuation">(</span><span class="token punctuation">(</span>720px - 100%<span class="token punctuation">)</span> * 720<span class="token punctuation">)</span><span class="token punctuation">;</span>
  <span class="token punctuation">&#125;</span>
</span></span><span class="token tag"><span class="token tag"><span class="token punctuation">&lt;/</span>style</span><span class="token punctuation">></span></span>	

<span class="token tag"><span class="token tag"><span class="token punctuation">&lt;</span>div</span><span class="token punctuation">></span></span>
  <span class="token tag"><span class="token tag"><span class="token punctuation">&lt;</span>div</span> <span class="token attr-name">class</span><span class="token attr-value"><span class="token punctuation">=</span><span class="token punctuation">"</span>item<span class="token punctuation">"</span></span><span class="token punctuation">></span></span><span class="token tag"><span class="token tag"><span class="token punctuation">&lt;/</span>div</span><span class="token punctuation">></span></span>
  <span class="token tag"><span class="token tag"><span class="token punctuation">&lt;</span>div</span> <span class="token attr-name">class</span><span class="token attr-value"><span class="token punctuation">=</span><span class="token punctuation">"</span>item<span class="token punctuation">"</span></span><span class="token punctuation">></span></span><span class="token tag"><span class="token tag"><span class="token punctuation">&lt;/</span>div</span><span class="token punctuation">></span></span>
  <span class="token tag"><span class="token tag"><span class="token punctuation">&lt;</span>div</span> <span class="token attr-name">class</span><span class="token attr-value"><span class="token punctuation">=</span><span class="token punctuation">"</span>item<span class="token punctuation">"</span></span><span class="token punctuation">></span></span><span class="token tag"><span class="token tag"><span class="token punctuation">&lt;/</span>div</span><span class="token punctuation">></span></span>
  <span class="token tag"><span class="token tag"><span class="token punctuation">&lt;</span>div</span> <span class="token attr-name">class</span><span class="token attr-value"><span class="token punctuation">=</span><span class="token punctuation">"</span>item<span class="token punctuation">"</span></span><span class="token punctuation">></span></span><span class="token tag"><span class="token tag"><span class="token punctuation">&lt;/</span>div</span><span class="token punctuation">></span></span>
<span class="token tag"><span class="token tag"><span class="token punctuation">&lt;/</span>div</span><span class="token punctuation">></span></span></code>` + "";

	let t53;
	let p7;
	let t54;
	let t55;
	let ul2;
	let li4;
	let t56;
	let code16;
	let t57;
	let t58;
	let code17;
	let t59;
	let t60;
	let li5;
	let t61;
	let code18;
	let t62;
	let t63;
	let t64;
	let pre4;

	let raw4_value = `<code class="language-html"><span class="token tag"><span class="token tag"><span class="token punctuation">&lt;</span>style</span><span class="token punctuation">></span></span><span class="token style"><span class="token language-css">
  <span class="token selector">.item</span> <span class="token punctuation">&#123;</span>
    <span class="token property">display</span><span class="token punctuation">:</span> inline-block<span class="token punctuation">;</span>
    <span class="token property">min-width</span><span class="token punctuation">:</span> 180px<span class="token punctuation">;</span> <span class="token comment">/* fallback, 720px * 25% */</span>
    <span class="token property">min-width</span><span class="token punctuation">:</span> <span class="token function">-webkit-calc</span><span class="token punctuation">(</span>25%<span class="token punctuation">)</span><span class="token punctuation">;</span>
    <span class="token property">min-width</span><span class="token punctuation">:</span> <span class="token function">calc</span><span class="token punctuation">(</span>25%<span class="token punctuation">)</span><span class="token punctuation">;</span>
    <span class="token property">max-width</span><span class="token punctuation">:</span> 50%<span class="token punctuation">;</span>
    <span class="token property">width</span><span class="token punctuation">:</span> 25%<span class="token punctuation">;</span> <span class="token comment">/* fallback, size for desktop layout */</span>
    <span class="token property">width</span><span class="token punctuation">:</span> <span class="token function">-webkit-calc</span><span class="token punctuation">(</span>518400px — 72000%<span class="token punctuation">)</span><span class="token punctuation">;</span>
    <span class="token property">width</span><span class="token punctuation">:</span> <span class="token function">calc</span><span class="token punctuation">(</span>518400px — 72000%<span class="token punctuation">)</span><span class="token punctuation">;</span>
  <span class="token punctuation">&#125;</span>
</span></span><span class="token tag"><span class="token tag"><span class="token punctuation">&lt;/</span>style</span><span class="token punctuation">></span></span>	

<span class="token tag"><span class="token tag"><span class="token punctuation">&lt;</span>div</span><span class="token punctuation">></span></span>
  <span class="token tag"><span class="token tag"><span class="token punctuation">&lt;</span>div</span> <span class="token attr-name">class</span><span class="token attr-value"><span class="token punctuation">=</span><span class="token punctuation">"</span>item<span class="token punctuation">"</span></span><span class="token punctuation">></span></span><span class="token tag"><span class="token tag"><span class="token punctuation">&lt;/</span>div</span><span class="token punctuation">></span></span>
  <span class="token tag"><span class="token tag"><span class="token punctuation">&lt;</span>div</span> <span class="token attr-name">class</span><span class="token attr-value"><span class="token punctuation">=</span><span class="token punctuation">"</span>item<span class="token punctuation">"</span></span><span class="token punctuation">></span></span><span class="token tag"><span class="token tag"><span class="token punctuation">&lt;/</span>div</span><span class="token punctuation">></span></span>
  <span class="token tag"><span class="token tag"><span class="token punctuation">&lt;</span>div</span> <span class="token attr-name">class</span><span class="token attr-value"><span class="token punctuation">=</span><span class="token punctuation">"</span>item<span class="token punctuation">"</span></span><span class="token punctuation">></span></span><span class="token tag"><span class="token tag"><span class="token punctuation">&lt;/</span>div</span><span class="token punctuation">></span></span>
  <span class="token tag"><span class="token tag"><span class="token punctuation">&lt;</span>div</span> <span class="token attr-name">class</span><span class="token attr-value"><span class="token punctuation">=</span><span class="token punctuation">"</span>item<span class="token punctuation">"</span></span><span class="token punctuation">></span></span><span class="token tag"><span class="token tag"><span class="token punctuation">&lt;/</span>div</span><span class="token punctuation">></span></span>
<span class="token tag"><span class="token tag"><span class="token punctuation">&lt;/</span>div</span><span class="token punctuation">></span></span></code>` + "";

	return {
		c() {
			p0 = element("p");
			a = element("a");
			t0 = text("The Fab Four technique to create Responsive Emails without Media Queries");
			t1 = space();
			p1 = element("p");
			t2 = text("Instead of using media query to switch between mobile / desktop layout, here's a trick that uses ");
			code0 = element("code");
			t3 = text("calc");
			t4 = text(", ");
			code1 = element("code");
			t5 = text("min-width");
			t6 = text(", ");
			code2 = element("code");
			t7 = text("max-width");
			t8 = text(" and ");
			code3 = element("code");
			t9 = text("width");
			t10 = space();
			pre0 = element("pre");
			t11 = space();
			pre1 = element("pre");
			t12 = space();
			p2 = element("p");
			t13 = text("💡 The key idea is that");
			t14 = space();
			ul0 = element("ul");
			li0 = element("li");
			t15 = text("📝 if ");
			code4 = element("code");
			t16 = text("max-width < width");
			t17 = text(", the width = ");
			code5 = element("code");
			t18 = text("max-width");
			t19 = space();
			li1 = element("li");
			t20 = text("📝 if ");
			code6 = element("code");
			t21 = text("min-width > width");
			t22 = text(", the width = ");
			code7 = element("code");
			t23 = text("min-width");
			t24 = space();
			p3 = element("p");
			t25 = text("if the viewport is below breakpoint, make ");
			code8 = element("code");
			t26 = text("width");
			t27 = text(" to be extremely large  ~> ");
			code9 = element("code");
			t28 = text("max-width");
			t29 = text("⬜️");
			t30 = space();
			p4 = element("p");
			t31 = text("otherwise, make ");
			code10 = element("code");
			t32 = text("width");
			t33 = text(" extremely small ~> ");
			code11 = element("code");
			t34 = text("min-width");
			t35 = text("▫️");
			t36 = space();
			p5 = element("p");
			t37 = text("It also listed how to support some older email clients that does not support ");
			code12 = element("code");
			t38 = text("calc()");
			t39 = space();
			ul1 = element("ul");
			li2 = element("li");
			t40 = text("📝 fallback to use a fixed width");
			t41 = space();
			li3 = element("li");
			t42 = text("📝 there's 2 ");
			code13 = element("code");
			t43 = text("min-width");
			t44 = text(", fixed px width for case if ");
			code14 = element("code");
			t45 = text("calc()");
			t46 = text(" is not supported, % width if ");
			code15 = element("code");
			t47 = text("calc()");
			t48 = text(" is supported");
			t49 = space();
			pre2 = element("pre");
			t50 = space();
			p6 = element("p");
			t51 = text("or browsers that requires a vendor prefix");
			t52 = space();
			pre3 = element("pre");
			t53 = space();
			p7 = element("p");
			t54 = text("There are a few mail client quirks to be wary too 😱");
			t55 = space();
			ul2 = element("ul");
			li4 = element("li");
			t56 = text("📝 Outlook(dot)com removes ");
			code16 = element("code");
			t57 = text("calc()");
			t58 = text(" that includes parenthesis ");
			code17 = element("code");
			t59 = text("()");
			t60 = space();
			li5 = element("li");
			t61 = text("📝 Outlook Web App removes inline-styles that contains ");
			code18 = element("code");
			t62 = text("calc()");
			t63 = text(" with multiplication *");
			t64 = space();
			pre4 = element("pre");
			this.h();
		},
		l(nodes) {
			p0 = claim_element(nodes, "P", {});
			var p0_nodes = children(p0);
			a = claim_element(p0_nodes, "A", { href: true, rel: true });
			var a_nodes = children(a);
			t0 = claim_text(a_nodes, "The Fab Four technique to create Responsive Emails without Media Queries");
			a_nodes.forEach(detach);
			p0_nodes.forEach(detach);
			t1 = claim_space(nodes);
			p1 = claim_element(nodes, "P", {});
			var p1_nodes = children(p1);
			t2 = claim_text(p1_nodes, "Instead of using media query to switch between mobile / desktop layout, here's a trick that uses ");
			code0 = claim_element(p1_nodes, "CODE", {});
			var code0_nodes = children(code0);
			t3 = claim_text(code0_nodes, "calc");
			code0_nodes.forEach(detach);
			t4 = claim_text(p1_nodes, ", ");
			code1 = claim_element(p1_nodes, "CODE", {});
			var code1_nodes = children(code1);
			t5 = claim_text(code1_nodes, "min-width");
			code1_nodes.forEach(detach);
			t6 = claim_text(p1_nodes, ", ");
			code2 = claim_element(p1_nodes, "CODE", {});
			var code2_nodes = children(code2);
			t7 = claim_text(code2_nodes, "max-width");
			code2_nodes.forEach(detach);
			t8 = claim_text(p1_nodes, " and ");
			code3 = claim_element(p1_nodes, "CODE", {});
			var code3_nodes = children(code3);
			t9 = claim_text(code3_nodes, "width");
			code3_nodes.forEach(detach);
			p1_nodes.forEach(detach);
			t10 = claim_space(nodes);
			pre0 = claim_element(nodes, "PRE", { class: true });
			var pre0_nodes = children(pre0);
			pre0_nodes.forEach(detach);
			t11 = claim_space(nodes);
			pre1 = claim_element(nodes, "PRE", { class: true });
			var pre1_nodes = children(pre1);
			pre1_nodes.forEach(detach);
			t12 = claim_space(nodes);
			p2 = claim_element(nodes, "P", {});
			var p2_nodes = children(p2);
			t13 = claim_text(p2_nodes, "💡 The key idea is that");
			p2_nodes.forEach(detach);
			t14 = claim_space(nodes);
			ul0 = claim_element(nodes, "UL", {});
			var ul0_nodes = children(ul0);
			li0 = claim_element(ul0_nodes, "LI", {});
			var li0_nodes = children(li0);
			t15 = claim_text(li0_nodes, "📝 if ");
			code4 = claim_element(li0_nodes, "CODE", {});
			var code4_nodes = children(code4);
			t16 = claim_text(code4_nodes, "max-width < width");
			code4_nodes.forEach(detach);
			t17 = claim_text(li0_nodes, ", the width = ");
			code5 = claim_element(li0_nodes, "CODE", {});
			var code5_nodes = children(code5);
			t18 = claim_text(code5_nodes, "max-width");
			code5_nodes.forEach(detach);
			li0_nodes.forEach(detach);
			t19 = claim_space(ul0_nodes);
			li1 = claim_element(ul0_nodes, "LI", {});
			var li1_nodes = children(li1);
			t20 = claim_text(li1_nodes, "📝 if ");
			code6 = claim_element(li1_nodes, "CODE", {});
			var code6_nodes = children(code6);
			t21 = claim_text(code6_nodes, "min-width > width");
			code6_nodes.forEach(detach);
			t22 = claim_text(li1_nodes, ", the width = ");
			code7 = claim_element(li1_nodes, "CODE", {});
			var code7_nodes = children(code7);
			t23 = claim_text(code7_nodes, "min-width");
			code7_nodes.forEach(detach);
			li1_nodes.forEach(detach);
			ul0_nodes.forEach(detach);
			t24 = claim_space(nodes);
			p3 = claim_element(nodes, "P", {});
			var p3_nodes = children(p3);
			t25 = claim_text(p3_nodes, "if the viewport is below breakpoint, make ");
			code8 = claim_element(p3_nodes, "CODE", {});
			var code8_nodes = children(code8);
			t26 = claim_text(code8_nodes, "width");
			code8_nodes.forEach(detach);
			t27 = claim_text(p3_nodes, " to be extremely large  ~> ");
			code9 = claim_element(p3_nodes, "CODE", {});
			var code9_nodes = children(code9);
			t28 = claim_text(code9_nodes, "max-width");
			code9_nodes.forEach(detach);
			t29 = claim_text(p3_nodes, "⬜️");
			p3_nodes.forEach(detach);
			t30 = claim_space(nodes);
			p4 = claim_element(nodes, "P", {});
			var p4_nodes = children(p4);
			t31 = claim_text(p4_nodes, "otherwise, make ");
			code10 = claim_element(p4_nodes, "CODE", {});
			var code10_nodes = children(code10);
			t32 = claim_text(code10_nodes, "width");
			code10_nodes.forEach(detach);
			t33 = claim_text(p4_nodes, " extremely small ~> ");
			code11 = claim_element(p4_nodes, "CODE", {});
			var code11_nodes = children(code11);
			t34 = claim_text(code11_nodes, "min-width");
			code11_nodes.forEach(detach);
			t35 = claim_text(p4_nodes, "▫️");
			p4_nodes.forEach(detach);
			t36 = claim_space(nodes);
			p5 = claim_element(nodes, "P", {});
			var p5_nodes = children(p5);
			t37 = claim_text(p5_nodes, "It also listed how to support some older email clients that does not support ");
			code12 = claim_element(p5_nodes, "CODE", {});
			var code12_nodes = children(code12);
			t38 = claim_text(code12_nodes, "calc()");
			code12_nodes.forEach(detach);
			p5_nodes.forEach(detach);
			t39 = claim_space(nodes);
			ul1 = claim_element(nodes, "UL", {});
			var ul1_nodes = children(ul1);
			li2 = claim_element(ul1_nodes, "LI", {});
			var li2_nodes = children(li2);
			t40 = claim_text(li2_nodes, "📝 fallback to use a fixed width");
			li2_nodes.forEach(detach);
			t41 = claim_space(ul1_nodes);
			li3 = claim_element(ul1_nodes, "LI", {});
			var li3_nodes = children(li3);
			t42 = claim_text(li3_nodes, "📝 there's 2 ");
			code13 = claim_element(li3_nodes, "CODE", {});
			var code13_nodes = children(code13);
			t43 = claim_text(code13_nodes, "min-width");
			code13_nodes.forEach(detach);
			t44 = claim_text(li3_nodes, ", fixed px width for case if ");
			code14 = claim_element(li3_nodes, "CODE", {});
			var code14_nodes = children(code14);
			t45 = claim_text(code14_nodes, "calc()");
			code14_nodes.forEach(detach);
			t46 = claim_text(li3_nodes, " is not supported, % width if ");
			code15 = claim_element(li3_nodes, "CODE", {});
			var code15_nodes = children(code15);
			t47 = claim_text(code15_nodes, "calc()");
			code15_nodes.forEach(detach);
			t48 = claim_text(li3_nodes, " is supported");
			li3_nodes.forEach(detach);
			ul1_nodes.forEach(detach);
			t49 = claim_space(nodes);
			pre2 = claim_element(nodes, "PRE", { class: true });
			var pre2_nodes = children(pre2);
			pre2_nodes.forEach(detach);
			t50 = claim_space(nodes);
			p6 = claim_element(nodes, "P", {});
			var p6_nodes = children(p6);
			t51 = claim_text(p6_nodes, "or browsers that requires a vendor prefix");
			p6_nodes.forEach(detach);
			t52 = claim_space(nodes);
			pre3 = claim_element(nodes, "PRE", { class: true });
			var pre3_nodes = children(pre3);
			pre3_nodes.forEach(detach);
			t53 = claim_space(nodes);
			p7 = claim_element(nodes, "P", {});
			var p7_nodes = children(p7);
			t54 = claim_text(p7_nodes, "There are a few mail client quirks to be wary too 😱");
			p7_nodes.forEach(detach);
			t55 = claim_space(nodes);
			ul2 = claim_element(nodes, "UL", {});
			var ul2_nodes = children(ul2);
			li4 = claim_element(ul2_nodes, "LI", {});
			var li4_nodes = children(li4);
			t56 = claim_text(li4_nodes, "📝 Outlook(dot)com removes ");
			code16 = claim_element(li4_nodes, "CODE", {});
			var code16_nodes = children(code16);
			t57 = claim_text(code16_nodes, "calc()");
			code16_nodes.forEach(detach);
			t58 = claim_text(li4_nodes, " that includes parenthesis ");
			code17 = claim_element(li4_nodes, "CODE", {});
			var code17_nodes = children(code17);
			t59 = claim_text(code17_nodes, "()");
			code17_nodes.forEach(detach);
			li4_nodes.forEach(detach);
			t60 = claim_space(ul2_nodes);
			li5 = claim_element(ul2_nodes, "LI", {});
			var li5_nodes = children(li5);
			t61 = claim_text(li5_nodes, "📝 Outlook Web App removes inline-styles that contains ");
			code18 = claim_element(li5_nodes, "CODE", {});
			var code18_nodes = children(code18);
			t62 = claim_text(code18_nodes, "calc()");
			code18_nodes.forEach(detach);
			t63 = claim_text(li5_nodes, " with multiplication *");
			li5_nodes.forEach(detach);
			ul2_nodes.forEach(detach);
			t64 = claim_space(nodes);
			pre4 = claim_element(nodes, "PRE", { class: true });
			var pre4_nodes = children(pre4);
			pre4_nodes.forEach(detach);
			this.h();
		},
		h() {
			attr(a, "href", "https://www.freecodecamp.org/news/the-fab-four-technique-to-create-responsive-emails-without-media-queries-baf11fdfa848/");
			attr(a, "rel", "nofollow");
			attr(pre0, "class", "language-html");
			attr(pre1, "class", "language-html");
			attr(pre2, "class", "language-html");
			attr(pre3, "class", "language-html");
			attr(pre4, "class", "language-html");
		},
		m(target, anchor) {
			insert(target, p0, anchor);
			append(p0, a);
			append(a, t0);
			insert(target, t1, anchor);
			insert(target, p1, anchor);
			append(p1, t2);
			append(p1, code0);
			append(code0, t3);
			append(p1, t4);
			append(p1, code1);
			append(code1, t5);
			append(p1, t6);
			append(p1, code2);
			append(code2, t7);
			append(p1, t8);
			append(p1, code3);
			append(code3, t9);
			insert(target, t10, anchor);
			insert(target, pre0, anchor);
			pre0.innerHTML = raw0_value;
			insert(target, t11, anchor);
			insert(target, pre1, anchor);
			pre1.innerHTML = raw1_value;
			insert(target, t12, anchor);
			insert(target, p2, anchor);
			append(p2, t13);
			insert(target, t14, anchor);
			insert(target, ul0, anchor);
			append(ul0, li0);
			append(li0, t15);
			append(li0, code4);
			append(code4, t16);
			append(li0, t17);
			append(li0, code5);
			append(code5, t18);
			append(ul0, t19);
			append(ul0, li1);
			append(li1, t20);
			append(li1, code6);
			append(code6, t21);
			append(li1, t22);
			append(li1, code7);
			append(code7, t23);
			insert(target, t24, anchor);
			insert(target, p3, anchor);
			append(p3, t25);
			append(p3, code8);
			append(code8, t26);
			append(p3, t27);
			append(p3, code9);
			append(code9, t28);
			append(p3, t29);
			insert(target, t30, anchor);
			insert(target, p4, anchor);
			append(p4, t31);
			append(p4, code10);
			append(code10, t32);
			append(p4, t33);
			append(p4, code11);
			append(code11, t34);
			append(p4, t35);
			insert(target, t36, anchor);
			insert(target, p5, anchor);
			append(p5, t37);
			append(p5, code12);
			append(code12, t38);
			insert(target, t39, anchor);
			insert(target, ul1, anchor);
			append(ul1, li2);
			append(li2, t40);
			append(ul1, t41);
			append(ul1, li3);
			append(li3, t42);
			append(li3, code13);
			append(code13, t43);
			append(li3, t44);
			append(li3, code14);
			append(code14, t45);
			append(li3, t46);
			append(li3, code15);
			append(code15, t47);
			append(li3, t48);
			insert(target, t49, anchor);
			insert(target, pre2, anchor);
			pre2.innerHTML = raw2_value;
			insert(target, t50, anchor);
			insert(target, p6, anchor);
			append(p6, t51);
			insert(target, t52, anchor);
			insert(target, pre3, anchor);
			pre3.innerHTML = raw3_value;
			insert(target, t53, anchor);
			insert(target, p7, anchor);
			append(p7, t54);
			insert(target, t55, anchor);
			insert(target, ul2, anchor);
			append(ul2, li4);
			append(li4, t56);
			append(li4, code16);
			append(code16, t57);
			append(li4, t58);
			append(li4, code17);
			append(code17, t59);
			append(ul2, t60);
			append(ul2, li5);
			append(li5, t61);
			append(li5, code18);
			append(code18, t62);
			append(li5, t63);
			insert(target, t64, anchor);
			insert(target, pre4, anchor);
			pre4.innerHTML = raw4_value;
		},
		p: noop,
		d(detaching) {
			if (detaching) detach(p0);
			if (detaching) detach(t1);
			if (detaching) detach(p1);
			if (detaching) detach(t10);
			if (detaching) detach(pre0);
			if (detaching) detach(t11);
			if (detaching) detach(pre1);
			if (detaching) detach(t12);
			if (detaching) detach(p2);
			if (detaching) detach(t14);
			if (detaching) detach(ul0);
			if (detaching) detach(t24);
			if (detaching) detach(p3);
			if (detaching) detach(t30);
			if (detaching) detach(p4);
			if (detaching) detach(t36);
			if (detaching) detach(p5);
			if (detaching) detach(t39);
			if (detaching) detach(ul1);
			if (detaching) detach(t49);
			if (detaching) detach(pre2);
			if (detaching) detach(t50);
			if (detaching) detach(p6);
			if (detaching) detach(t52);
			if (detaching) detach(pre3);
			if (detaching) detach(t53);
			if (detaching) detach(p7);
			if (detaching) detach(t55);
			if (detaching) detach(ul2);
			if (detaching) detach(t64);
			if (detaching) detach(pre4);
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
	"title": "Responsive email layout",
	"tags": ["email", "layout", "responsive", "media query"],
	"slug": "notes/responsive-email-layout",
	"type": "notes",
	"name": "responsive-email-layout",
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
