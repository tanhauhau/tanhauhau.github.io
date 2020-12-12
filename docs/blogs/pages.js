function noop() { }
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

function destroy_block(block, lookup) {
    block.d(1);
    lookup.delete(block.key);
}
function update_keyed_each(old_blocks, dirty, get_key, dynamic, ctx, list, lookup, node, destroy, create_each_block, next, get_context) {
    let o = old_blocks.length;
    let n = list.length;
    let i = o;
    const old_indexes = {};
    while (i--)
        old_indexes[old_blocks[i].key] = i;
    const new_blocks = [];
    const new_lookup = new Map();
    const deltas = new Map();
    i = n;
    while (i--) {
        const child_ctx = get_context(ctx, list, i);
        const key = get_key(child_ctx);
        let block = lookup.get(key);
        if (!block) {
            block = create_each_block(key, child_ctx);
            block.c();
        }
        else if (dynamic) {
            block.p(child_ctx, dirty);
        }
        new_lookup.set(key, new_blocks[i] = block);
        if (key in old_indexes)
            deltas.set(key, Math.abs(i - old_indexes[key]));
    }
    const will_move = new Set();
    const did_move = new Set();
    function insert(block) {
        transition_in(block, 1);
        block.m(node, next);
        lookup.set(block.key, block);
        next = block.first;
        n--;
    }
    while (o && n) {
        const new_block = new_blocks[n - 1];
        const old_block = old_blocks[o - 1];
        const new_key = new_block.key;
        const old_key = old_block.key;
        if (new_block === old_block) {
            // do nothing
            next = new_block.first;
            o--;
            n--;
        }
        else if (!new_lookup.has(old_key)) {
            // remove old block
            destroy(old_block, lookup);
            o--;
        }
        else if (!lookup.has(new_key) || will_move.has(new_key)) {
            insert(new_block);
        }
        else if (did_move.has(old_key)) {
            o--;
        }
        else if (deltas.get(new_key) > deltas.get(old_key)) {
            did_move.add(new_key);
            insert(new_block);
        }
        else {
            will_move.add(old_key);
            o--;
        }
    }
    while (o--) {
        const old_block = old_blocks[o];
        if (!new_lookup.has(old_block.key))
            destroy(old_block, lookup);
    }
    while (n)
        insert(new_blocks[n - 1]);
    return new_blocks;
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

/* src/layout/Blogs.svelte generated by Svelte v3.24.0 */

function get_each_context_1(ctx, list, i) {
	const child_ctx = ctx.slice();
	child_ctx[7] = list[i];
	return child_ctx;
}

function get_each_context(ctx, list, i) {
	const child_ctx = ctx.slice();
	child_ctx[1] = (list[i].metadata !== undefined ? list[i].metadata : {}).title;

	child_ctx[2] = (list[i].metadata !== undefined ? list[i].metadata : {}).description !== undefined
	? (list[i].metadata !== undefined ? list[i].metadata : {}).description
	: "";

	child_ctx[3] = (list[i].metadata !== undefined ? list[i].metadata : {}).tags;
	child_ctx[4] = list[i].slug;
	return child_ctx;
}

// (16:8) {#if tags}
function create_if_block(ctx) {
	let p;
	let each_value_1 = /*tags*/ ctx[3];
	let each_blocks = [];

	for (let i = 0; i < each_value_1.length; i += 1) {
		each_blocks[i] = create_each_block_1(get_each_context_1(ctx, each_value_1, i));
	}

	return {
		c() {
			p = element("p");

			for (let i = 0; i < each_blocks.length; i += 1) {
				each_blocks[i].c();
			}
		},
		l(nodes) {
			p = claim_element(nodes, "P", {});
			var p_nodes = children(p);

			for (let i = 0; i < each_blocks.length; i += 1) {
				each_blocks[i].l(p_nodes);
			}

			p_nodes.forEach(detach);
		},
		m(target, anchor) {
			insert(target, p, anchor);

			for (let i = 0; i < each_blocks.length; i += 1) {
				each_blocks[i].m(p, null);
			}
		},
		p(ctx, dirty) {
			if (dirty & /*data*/ 1) {
				each_value_1 = /*tags*/ ctx[3];
				let i;

				for (i = 0; i < each_value_1.length; i += 1) {
					const child_ctx = get_each_context_1(ctx, each_value_1, i);

					if (each_blocks[i]) {
						each_blocks[i].p(child_ctx, dirty);
					} else {
						each_blocks[i] = create_each_block_1(child_ctx);
						each_blocks[i].c();
						each_blocks[i].m(p, null);
					}
				}

				for (; i < each_blocks.length; i += 1) {
					each_blocks[i].d(1);
				}

				each_blocks.length = each_value_1.length;
			}
		},
		d(detaching) {
			if (detaching) detach(p);
			destroy_each(each_blocks, detaching);
		}
	};
}

// (16:21) {#each tags as tag}
function create_each_block_1(ctx) {
	let span;
	let t_value = /*tag*/ ctx[7] + "";
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
			attr(span, "class", "svelte-17rdosq");
		},
		m(target, anchor) {
			insert(target, span, anchor);
			append(span, t);
		},
		p(ctx, dirty) {
			if (dirty & /*data*/ 1 && t_value !== (t_value = /*tag*/ ctx[7] + "")) set_data(t, t_value);
		},
		d(detaching) {
			if (detaching) detach(span);
		}
	};
}

// (11:2) {#each data as { metadata: { title, description = "", tags }
function create_each_block(key_1, ctx) {
	let li;
	let a;
	let p0;
	let t0_value = /*title*/ ctx[1] + "";
	let t0;
	let t1;
	let p1;
	let t2_value = /*description*/ ctx[2] + "";
	let t2;
	let t3;
	let a_href_value;
	let t4;
	let if_block = /*tags*/ ctx[3] && create_if_block(ctx);

	return {
		key: key_1,
		first: null,
		c() {
			li = element("li");
			a = element("a");
			p0 = element("p");
			t0 = text(t0_value);
			t1 = space();
			p1 = element("p");
			t2 = text(t2_value);
			t3 = space();
			if (if_block) if_block.c();
			t4 = space();
			this.h();
		},
		l(nodes) {
			li = claim_element(nodes, "LI", { class: true });
			var li_nodes = children(li);
			a = claim_element(li_nodes, "A", { href: true, class: true });
			var a_nodes = children(a);
			p0 = claim_element(a_nodes, "P", { class: true });
			var p0_nodes = children(p0);
			t0 = claim_text(p0_nodes, t0_value);
			p0_nodes.forEach(detach);
			t1 = claim_space(a_nodes);
			p1 = claim_element(a_nodes, "P", {});
			var p1_nodes = children(p1);
			t2 = claim_text(p1_nodes, t2_value);
			p1_nodes.forEach(detach);
			t3 = claim_space(a_nodes);
			if (if_block) if_block.l(a_nodes);
			a_nodes.forEach(detach);
			t4 = claim_space(li_nodes);
			li_nodes.forEach(detach);
			this.h();
		},
		h() {
			attr(p0, "class", "title svelte-17rdosq");
			attr(a, "href", a_href_value = "/" + /*slug*/ ctx[4]);
			attr(a, "class", "svelte-17rdosq");
			attr(li, "class", "svelte-17rdosq");
			this.first = li;
		},
		m(target, anchor) {
			insert(target, li, anchor);
			append(li, a);
			append(a, p0);
			append(p0, t0);
			append(a, t1);
			append(a, p1);
			append(p1, t2);
			append(a, t3);
			if (if_block) if_block.m(a, null);
			append(li, t4);
		},
		p(ctx, dirty) {
			if (dirty & /*data*/ 1 && t0_value !== (t0_value = /*title*/ ctx[1] + "")) set_data(t0, t0_value);
			if (dirty & /*data*/ 1 && t2_value !== (t2_value = /*description*/ ctx[2] + "")) set_data(t2, t2_value);

			if (/*tags*/ ctx[3]) {
				if (if_block) {
					if_block.p(ctx, dirty);
				} else {
					if_block = create_if_block(ctx);
					if_block.c();
					if_block.m(a, null);
				}
			} else if (if_block) {
				if_block.d(1);
				if_block = null;
			}

			if (dirty & /*data*/ 1 && a_href_value !== (a_href_value = "/" + /*slug*/ ctx[4])) {
				attr(a, "href", a_href_value);
			}
		},
		d(detaching) {
			if (detaching) detach(li);
			if (if_block) if_block.d();
		}
	};
}

function create_fragment$1(ctx) {
	let header;
	let t0;
	let main;
	let h1;
	let t1;
	let t2;
	let ul;
	let each_blocks = [];
	let each_1_lookup = new Map();
	let current;
	header = new Header({});
	let each_value = /*data*/ ctx[0];
	const get_key = ctx => /*slug*/ ctx[4];

	for (let i = 0; i < each_value.length; i += 1) {
		let child_ctx = get_each_context(ctx, each_value, i);
		let key = get_key(child_ctx);
		each_1_lookup.set(key, each_blocks[i] = create_each_block(key, child_ctx));
	}

	return {
		c() {
			create_component(header.$$.fragment);
			t0 = space();
			main = element("main");
			h1 = element("h1");
			t1 = text("Li Hau's Blog");
			t2 = space();
			ul = element("ul");

			for (let i = 0; i < each_blocks.length; i += 1) {
				each_blocks[i].c();
			}

			this.h();
		},
		l(nodes) {
			claim_component(header.$$.fragment, nodes);
			t0 = claim_space(nodes);
			main = claim_element(nodes, "MAIN", { class: true });
			var main_nodes = children(main);
			h1 = claim_element(main_nodes, "H1", {});
			var h1_nodes = children(h1);
			t1 = claim_text(h1_nodes, "Li Hau's Blog");
			h1_nodes.forEach(detach);
			t2 = claim_space(main_nodes);
			ul = claim_element(main_nodes, "UL", { class: true });
			var ul_nodes = children(ul);

			for (let i = 0; i < each_blocks.length; i += 1) {
				each_blocks[i].l(ul_nodes);
			}

			ul_nodes.forEach(detach);
			main_nodes.forEach(detach);
			this.h();
		},
		h() {
			attr(ul, "class", "svelte-17rdosq");
			attr(main, "class", "blogs svelte-17rdosq");
		},
		m(target, anchor) {
			mount_component(header, target, anchor);
			insert(target, t0, anchor);
			insert(target, main, anchor);
			append(main, h1);
			append(h1, t1);
			append(main, t2);
			append(main, ul);

			for (let i = 0; i < each_blocks.length; i += 1) {
				each_blocks[i].m(ul, null);
			}

			current = true;
		},
		p(ctx, [dirty]) {
			if (dirty & /*data*/ 1) {
				const each_value = /*data*/ ctx[0];
				each_blocks = update_keyed_each(each_blocks, dirty, get_key, 1, ctx, each_value, each_1_lookup, ul, destroy_block, create_each_block, null, get_each_context);
			}
		},
		i(local) {
			if (current) return;
			transition_in(header.$$.fragment, local);
			current = true;
		},
		o(local) {
			transition_out(header.$$.fragment, local);
			current = false;
		},
		d(detaching) {
			destroy_component(header, detaching);
			if (detaching) detach(t0);
			if (detaching) detach(main);

			for (let i = 0; i < each_blocks.length; i += 1) {
				each_blocks[i].d();
			}
		}
	};
}

function instance($$self, $$props, $$invalidate) {
	let { data = [] } = $$props;

	$$self.$set = $$props => {
		if ("data" in $$props) $$invalidate(0, data = $$props.data);
	};

	return [data];
}

class Blogs extends SvelteComponent {
	constructor(options) {
		super();
		init(this, options, instance, create_fragment$1, safe_not_equal, { data: 0 });
	}
}

var data = [{"metadata":{"title":"Using variables in `<style>` tag in Svelte","tags":["svelte","style","variables"],"slug":"using-variables-in-style-tag-in-svelte","type":"blog"},"slug":"using-variables-in-style-tag-in-svelte"},{"metadata":{"title":"Compile Svelte in your head","date":"2020-10-05T08:00:00Z","tags":["Svelte","JavaScript"],"series":"Compile Svelte in your head","slug":"compile-svelte-in-your-head","type":"blog"},"slug":"compile-svelte-in-your-head"},{"metadata":{"title":"Building a simplified webpack clone","date":"2020-10-02T08:00:00Z","tags":["JavaScript","webpack"],"slug":"building-a-simplified-webpack-clone","type":"blog"},"slug":"building-a-simplified-webpack-clone"},{"metadata":{"title":"Contributing to Svelte - Implement {#key}","date":"2020-09-27T08:00:00Z","tags":["Svelte","JavaScript","Open Source"],"series":"Contributing to Svelte","description":"I am going to share an anecdote on how I implemented {#key} logic block in Svelte","slug":"contributing-to-svelte-implement-key-block","type":"blog"},"slug":"contributing-to-svelte-implement-key-block"},{"metadata":{"title":"Compile Svelte in your head (Part 4)","date":"2020-09-22T08:00:00Z","tags":["Svelte","JavaScript"],"series":"Compile Svelte in your head","slug":"compile-svelte-in-your-head-part-4","type":"blog"},"slug":"compile-svelte-in-your-head-part-4"},{"metadata":{"title":"Reduce minified code size by property mangling","date":"2020-08-08T08:00:00Z","tags":["JavaScript","Terser"],"slug":"reduce-minified-code-size-by-property-mangling","type":"blog"},"slug":"reduce-minified-code-size-by-property-mangling"},{"metadata":{"title":"Contributing to Svelte - Fixing issue #5012","date":"2020-06-25T08:00:00Z","tags":["Svelte","JavaScript","Open Source"],"series":"Contributing to Svelte","description":"Svelte issue #5012 - Slot containing only {@html value} renders in wrong place on update","slug":"contributing-to-svelte-fixing-issue-5012","type":"blog"},"slug":"contributing-to-svelte-fixing-issue-5012"},{"metadata":{"title":"Retry asynchronous function using the callback pattern, promise chain and async await","date":"2020-06-21T08:00:00Z","tags":["JavaScript","Asynchronous","Problem Solving"],"description":"How to retry asynchronous function using the callback pattern, promise chain and async await. Mental model for asynchronous JavaScript.","slug":"retry-async-function-with-callback-promise","type":"blog"},"slug":"retry-async-function-with-callback-promise"},{"metadata":{"title":"Contributing to Svelte - Fixing issue #4392","date":"2020-05-23T08:00:00Z","tags":["Svelte","JavaScript","Open Source"],"series":"Contributing to Svelte","description":"I am going to tell you an anecdote on how I investigated and fixed a bug in Svelte. I documented down my train of thoughts as detailed as possible. I hope this gives anyone who is reading, a glimpse on how to work on the Svelte source code.","slug":"contributing-to-svelte-fixing-issue-4392","type":"blog"},"slug":"contributing-to-svelte-fixing-issue-4392"},{"metadata":{"title":"Compile Svelte in your head (Part 3)","date":"2020-05-07T08:00:00Z","tags":["Svelte","JavaScript"],"series":"Compile Svelte in your head","slug":"compile-svelte-in-your-head-part-3","type":"blog"},"slug":"compile-svelte-in-your-head-part-3"},{"metadata":{"title":"The Svelte Compiler Handbook","date":"2020-04-05T08:00:00Z","tags":["Svelte","JavaScript","compiler"],"description":"The Svelte compilation process can be broken down into 4-steps, 1) parsing source code into AST, 2) tracking references and dependencies, 3) creating code blocks and fragments, and 4) generate code.","slug":"the-svelte-compiler-handbook","type":"blog"},"slug":"the-svelte-compiler-handbook"},{"metadata":{"title":"Compile Svelte in your head (Part 2)","date":"2020-03-22T08:00:00Z","tags":["Svelte","JavaScript"],"series":"Compile Svelte in your head","slug":"compile-svelte-in-your-head-part-2","type":"blog"},"slug":"compile-svelte-in-your-head-part-2"},{"metadata":{"title":"Compile Svelte in your head (Part 1)","date":"2020-03-04T08:00:00Z","tags":["Svelte","JavaScript"],"series":"Compile Svelte in your head","slug":"compile-svelte-in-your-head-part-1","type":"blog"},"slug":"compile-svelte-in-your-head-part-1"},{"metadata":{"title":"Hydrating text content from Server-Side Rendering","date":"2020-02-28T08:00:00Z","slug":"hydrating-text-content","type":"blog"},"slug":"hydrating-text-content"},{"metadata":{"title":"Webpack Additional Compilation Pass","date":"2020-02-20T08:00:00Z","lastUpdated":"2020-02-27T08:00:00Z","slug":"webpack-additional-compilation-pass","type":"blog"},"slug":"webpack-additional-compilation-pass"},{"metadata":{"title":"Webpack's TemplatePlugin","date":"2020-01-21T08:00:00Z","slug":"webpack-plugin-main-template","type":"blog"},"slug":"webpack-plugin-main-template"},{"metadata":{"title":"Debugging Story: Build failed, error from Terser","date":"2020-01-08T08:00:00Z","tags":["debugging"],"description":"It all started with an error message during the build: 'ERROR in bundle.xxx.js from Terser'.","slug":"debugging-build-failed-error-from-terser","type":"blog"},"slug":"debugging-build-failed-error-from-terser"},{"metadata":{"title":"Reactivity in Web Frameworks (Part 1)","date":"2020-01-05T08:00:00Z","lastUpdated":"2020-01-08T08:00:00Z","description":"Reactivity is the ability of a web framework to update your view whenever the application state has changed. How do web frameworks achieve reactivity?","slug":"reactivity-in-web-frameworks-the-when","type":"blog"},"slug":"reactivity-in-web-frameworks-the-when"},{"metadata":{"title":"Super Silly Hackathon 2019","date":"2019-12-14T08:00:00Z","lastUpdated":"2019-12-15T15:19:00Z","description":"A quick walkthrough on how I created my pet in the browser for the Super Silly Hackathon 2019.","tags":["JavaScript","blog","hackathon"],"series":"Hackathon Projects","slug":"super-silly-hackathon-2019","type":"blog"},"slug":"super-silly-hackathon-2019"},{"metadata":{"title":"JSON Parser with JavaScript","date":"2019-12-12T08:00:00Z","description":"Step-by-step guide on implementing a JSON parser","tags":["JavaScript","AST"],"series":"AST","slug":"json-parser-with-javascript","type":"blog"},"slug":"json-parser-with-javascript"},{"metadata":{"title":"Pause and resume a JavaScript function","date":"2019-12-09T08:00:00Z","description":"A thought experiment on how you can pause and resume the execution of a JavaScript function","tags":["JavaScript","React"],"slug":"pause-and-resume-a-javascript-function","type":"blog"},"slug":"pause-and-resume-a-javascript-function"},{"metadata":{"title":"I wrote a 12-line Rollup plugin","date":"2019-11-30T08:00:00Z","description":"Why would I install a package with so many files and dependencies, just to do a something simple that can be done in 12 lines of code?","tags":["JavaScript","rollup","plugin"],"slug":"12-line-rollup-plugin","type":"blog"},"slug":"12-line-rollup-plugin"},{"metadata":{"title":"Manipulating AST with JavaScript","date":"2019-11-22T08:00:00Z","description":"Manipulating AST is not that hard anyway","tags":["JavaScript","ast","transform","depth-first-search","dfs"],"series":"AST","slug":"manipulating-ast-with-javascript","type":"blog"},"slug":"manipulating-ast-with-javascript"},{"metadata":{"title":"I wrote my module bundler II","date":"2019-10-16T08:00:00Z","tags":["JavaScript","module bundler","dev tool","webpack"],"description":"We've built a simple bundler to bundle javascript code. Let's add CSS, HTML and serve it in the browser!","series":"Write a module bundler","slug":"i-wrote-my-module-bundler-ii-for-the-web","type":"blog"},"slug":"i-wrote-my-module-bundler-ii-for-the-web"},{"metadata":{"title":"Babel macros","date":"2019-10-08T08:00:00Z","series":"Intermediate Babel","tags":["JavaScript","babel","ast","transform"],"description":"Custom JavaScript syntax is hard to maintain, custom babel transform plugin is no better. That's why we need Babel macros.","slug":"babel-macros","type":"blog"},"slug":"babel-macros"},{"metadata":{"title":"Creating custom JavaScript syntax with Babel","date":"2019-09-25T08:00:00Z","description":"Forking babel parser and creating your custom JavaScript syntax isn't as hard as you think.","tags":["JavaScript","babel","ast","transform"],"series":"Intermediate Babel","slug":"creating-custom-javascript-syntax-with-babel","type":"blog"},"slug":"creating-custom-javascript-syntax-with-babel"},{"metadata":{"title":"I wrote my module bundler","date":"2019-09-18T08:00:00Z","tags":["JavaScript","module bundler","dev tool","webpack"],"description":"In my previous article, I explained how module bundler works. In this article, I am going to show you how I wrote my module bundler...","series":"Write a module bundler","slug":"i-wrote-my-module-bundler","type":"blog"},"slug":"i-wrote-my-module-bundler"},{"metadata":{"title":"Solving Nonogram with Code","date":"2019-09-14T08:00:00Z","description":"...said me to my colleague, \"If I could come up with a program to solve this, I would stop playing it\"","tags":["JavaScript","nonogram","algorithm"],"slug":"solving-nonogram-with-code","type":"blog"},"slug":"solving-nonogram-with-code"},{"metadata":{"title":"Step-by-step guide for writing a custom babel transformation","date":"2019-09-12T08:00:00Z","tags":["JavaScript","babel","ast","transform"],"description":"Writing your first babel plugin","series":"Intermediate Babel","slug":"step-by-step-guide-for-writing-a-babel-transformation","type":"blog"},"slug":"step-by-step-guide-for-writing-a-babel-transformation"},{"metadata":{"title":"Git commits went missing after a rebase","date":"2019-09-04T08:00:00Z","description":"What happened when you do a rebase","tags":["JavaScript","git","rebase","scm"],"slug":"commit-went-missing-after-rebase","type":"blog"},"slug":"commit-went-missing-after-rebase"},{"metadata":{"title":"What is module bundler and how does it work?","date":"2019-08-30T08:00:00Z","lastUpdated":"2019-08-30T15:05:00Z","description":"understand how module bundler works","tags":["JavaScript","module bundler","dev tool","webpack"],"series":"Write a module bundler","slug":"what-is-module-bundler-and-how-does-it-work","type":"blog"},"slug":"what-is-module-bundler-and-how-does-it-work"},{"metadata":{"title":"Learn in Public","date":"2019-06-21T08:00:00Z","description":"Starting my notes","slug":"learn-in-public","type":"blog"},"slug":"learn-in-public"},{"metadata":{"title":"How to get started in contributing to open source","date":"2019-06-05T08:00:00Z","slug":"how-to-get-started-in-contributing-to-open-source","type":"blog"},"slug":"how-to-get-started-in-contributing-to-open-source"},{"metadata":{"title":"Debugging Web Workers","date":"2019-05-22T08:00:00Z","description":"...for Chrome, Firefox and Safari","slug":"Debugging web workers","type":"blog"},"slug":"Debugging web workers"},{"metadata":{"title":"Parsing error when calling generic function with type arguments","date":"2019-04-23T08:00:00Z","lastUpdated":"2019-04-27T08:00:00Z","description":"😱","slug":"parsing-error-flow-type-parameter-instantiation","type":"blog"},"slug":"parsing-error-flow-type-parameter-instantiation"},{"metadata":{"title":"Errors encountered upgrading Flow v0.85","date":"2019-04-22T08:00:00Z","description":"and how we solved them","slug":"errors-encountered-upgrading-flow-0.85","type":"blog"},"slug":"errors-encountered-upgrading-flow-0.85"},{"metadata":{"title":"Who accessed my property?","date":"2019-03-24T08:00:00Z","description":"How to know when object property get accessed or modified","slug":"who-accessed-my-property","type":"blog"},"slug":"who-accessed-my-property"},{"metadata":{"title":"Understand the frontend tools","date":"2019-03-16T08:00:00Z","description":"About the tools frontend developer used in 2019","slug":"understand-the-frontend-tools","type":"blog"},"slug":"understand-the-frontend-tools"},{"metadata":{"title":"Codemod with babel","date":"2019-03-13T08:00:00Z","lastUpdated":"2019-09-13T08:00:00Z","description":"A template which I used","slug":"codemod-with-babel","type":"blog"},"slug":"codemod-with-babel"},{"metadata":{"title":"My eslint doesn’t work with for flow 0.85’s explicit type argument syntax","date":"2019-01-17T08:00:00Z","description":"and how I figured out why.","slug":"eslint-for-flow-explicit-type-argument-syntax","type":"blog"},"slug":"eslint-for-flow-explicit-type-argument-syntax"},{"metadata":{"title":"The `ascii_only` option in uglify-js","date":"2018-10-27T08:00:00Z","description":"that get my emoji showing in my chrome extension","slug":"uglify-ascii-only","type":"blog"},"slug":"uglify-ascii-only"},{"metadata":{"title":"Dead-code elimination","date":"2018-10-24T08:00:00Z","description":"How to hint uglify-js that your function is pure","slug":"dead-code-elimination","type":"blog"},"slug":"dead-code-elimination"},{"metadata":{"title":"Took me hours to realise why docker build ignores my .dockerignore","date":"2017-11-26T08:00:00Z","description":"...and this is what I've learned","slug":"why-docker-ignores-my-file","type":"blog"},"slug":"why-docker-ignores-my-file"},{"metadata":{"title":"Dynamically load reducers for code splitting in a React Redux application","date":"2017-11-16T08:00:00Z","description":"How to inject reducer asynchronously","slug":"dynamically-load-async-reducer-for-code-splitting-in-react","type":"blog"},"slug":"dynamically-load-async-reducer-for-code-splitting-in-react"},{"metadata":{"title":"Random stuff that I’ve learned from a browser’s developer console","date":"2016-04-20T08:00:00Z","description":"I opened up my browser’s developer console for no reason, and I found this","slug":"random-stuff-i-learned-from-browser-console","type":"blog"},"slug":"random-stuff-i-learned-from-browser-console"},{"metadata":{"title":"5 Steps to build NodeJS using Travis CI","date":"2016-04-13T08:00:00Z","description":"Setting up Travis CI for your NodeJS Github repo!","slug":"5-steps-to-build-nodejs-using-travis-ci","type":"blog"},"slug":"5-steps-to-build-nodejs-using-travis-ci"}];

const app = new Blogs({
  target: document.querySelector('#app'),
  hydrate: true,
  props: {
    data,
  },
});
