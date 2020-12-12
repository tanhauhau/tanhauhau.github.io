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

/* src/layout/Notes.svelte generated by Svelte v3.24.0 */

function get_each_context_1(ctx, list, i) {
	const child_ctx = ctx.slice();
	child_ctx[6] = list[i];
	return child_ctx;
}

function get_each_context(ctx, list, i) {
	const child_ctx = ctx.slice();
	child_ctx[1] = (list[i].metadata !== undefined ? list[i].metadata : {}).title;
	child_ctx[2] = (list[i].metadata !== undefined ? list[i].metadata : {}).tags;
	child_ctx[3] = list[i].slug;
	return child_ctx;
}

// (15:8) {#if tags}
function create_if_block(ctx) {
	let p;
	let each_value_1 = /*tags*/ ctx[2];
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
				each_value_1 = /*tags*/ ctx[2];
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

// (15:21) {#each tags as tag}
function create_each_block_1(ctx) {
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
			attr(span, "class", "svelte-17rdosq");
		},
		m(target, anchor) {
			insert(target, span, anchor);
			append(span, t);
		},
		p(ctx, dirty) {
			if (dirty & /*data*/ 1 && t_value !== (t_value = /*tag*/ ctx[6] + "")) set_data(t, t_value);
		},
		d(detaching) {
			if (detaching) detach(span);
		}
	};
}

// (11:2) {#each data as { metadata: { title, tags }
function create_each_block(key_1, ctx) {
	let li;
	let a;
	let p;
	let t0_value = /*title*/ ctx[1] + "";
	let t0;
	let t1;
	let a_href_value;
	let t2;
	let if_block = /*tags*/ ctx[2] && create_if_block(ctx);

	return {
		key: key_1,
		first: null,
		c() {
			li = element("li");
			a = element("a");
			p = element("p");
			t0 = text(t0_value);
			t1 = space();
			if (if_block) if_block.c();
			t2 = space();
			this.h();
		},
		l(nodes) {
			li = claim_element(nodes, "LI", { class: true });
			var li_nodes = children(li);
			a = claim_element(li_nodes, "A", { href: true, class: true });
			var a_nodes = children(a);
			p = claim_element(a_nodes, "P", { class: true });
			var p_nodes = children(p);
			t0 = claim_text(p_nodes, t0_value);
			p_nodes.forEach(detach);
			t1 = claim_space(a_nodes);
			if (if_block) if_block.l(a_nodes);
			a_nodes.forEach(detach);
			t2 = claim_space(li_nodes);
			li_nodes.forEach(detach);
			this.h();
		},
		h() {
			attr(p, "class", "title svelte-17rdosq");
			attr(a, "href", a_href_value = "/" + /*slug*/ ctx[3]);
			attr(a, "class", "svelte-17rdosq");
			attr(li, "class", "svelte-17rdosq");
			this.first = li;
		},
		m(target, anchor) {
			insert(target, li, anchor);
			append(li, a);
			append(a, p);
			append(p, t0);
			append(a, t1);
			if (if_block) if_block.m(a, null);
			append(li, t2);
		},
		p(ctx, dirty) {
			if (dirty & /*data*/ 1 && t0_value !== (t0_value = /*title*/ ctx[1] + "")) set_data(t0, t0_value);

			if (/*tags*/ ctx[2]) {
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

			if (dirty & /*data*/ 1 && a_href_value !== (a_href_value = "/" + /*slug*/ ctx[3])) {
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
	const get_key = ctx => /*slug*/ ctx[3];

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
			t1 = text("Li Hau's Notes");
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
			t1 = claim_text(h1_nodes, "Li Hau's Notes");
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

class Notes extends SvelteComponent {
	constructor(options) {
		super();
		init(this, options, instance, create_fragment$1, safe_not_equal, { data: 0 });
	}
}

var data = [{"metadata":{"title":"Tools and articles for writing","tags":["writing"],"slug":"notes/writing","type":"notes","name":"writing","layout":"note"},"slug":"notes/writing"},{"metadata":{"title":"Why write Architectural Decision Records","tags":["Architectural Decision Records"],"slug":"notes/why-write-architectural-decision-records","type":"notes","name":"why-write-architectural-decision-records","layout":"note"},"slug":"notes/why-write-architectural-decision-records"},{"metadata":{"title":"What No One Told You About Z-Index","tags":["z-index","stacking-order"],"slug":"notes/what-no-one-told-you-about-z-index","type":"notes","name":"what-no-one-told-you-about-z-index","layout":"note"},"slug":"notes/what-no-one-told-you-about-z-index"},{"metadata":{"title":"Web Workers","tags":["web workers"],"slug":"notes/web-workers","type":"notes","name":"web-workers","layout":"note"},"slug":"notes/web-workers"},{"metadata":{"title":"Webpack Define Plugin","tags":["define plugin","feature flag"],"slug":"notes/webpack-define-plugin","type":"notes","name":"webpack-define-plugin","layout":"note"},"slug":"notes/webpack-define-plugin"},{"metadata":{"title":"Video Game and the Future of Education","slug":"notes/video-game-and-future-of-education","type":"notes","name":"video-game-and-future-of-education","layout":"note"},"slug":"notes/video-game-and-future-of-education"},{"metadata":{"title":"useDebounceFn","tags":["react","hooks"],"slug":"notes/useDebounceFn","type":"notes","name":"useDebounceFn","layout":"note"},"slug":"notes/useDebounceFn"},{"metadata":{"title":"Thoughts on Technical Interview","tags":["interview"],"slug":"notes/thoughts-on-interview","type":"notes","name":"thoughts-on-interview","layout":"note"},"slug":"notes/thoughts-on-interview"},{"metadata":{"tags":["technical interview","algorithm"],"slug":"notes/technical-interview-resources","type":"notes","name":"technical-interview-resources","title":"technical-interview-resources","layout":"note"},"slug":"notes/technical-interview-resources"},{"metadata":{"title":"Tech Lead Journal #2 Michael Cheng","tags":["tech lead"],"slug":"notes/tech-lead-journal-michael-cheng","type":"notes","name":"tech-lead-journal-michael-cheng","layout":"note"},"slug":"notes/tech-lead-journal-michael-cheng"},{"metadata":{"title":"Lazy Loading Svelte component","tags":["lazy load","svelte"],"slug":"notes/svelte-lazy-load","type":"notes","name":"svelte-lazy-load","layout":"note"},"slug":"notes/svelte-lazy-load"},{"metadata":{"tags":["context","svelte"],"slug":"notes/svelte-context","type":"notes","name":"svelte-context","title":"svelte-context","layout":"note"},"slug":"notes/svelte-context"},{"metadata":{"title":"Lazy quantifier in regex","tags":["regex"],"slug":"notes/regex-lazy","type":"notes","name":"regex-lazy","layout":"note"},"slug":"notes/regex-lazy"},{"metadata":{"title":"Yet another framework: stencil & svelte","tags":["svelte","stencil"],"slug":"notes/svelte-and-stencil","type":"notes","name":"svelte-and-stencil","layout":"note"},"slug":"notes/svelte-and-stencil"},{"metadata":{"title":"React Tearing","tags":["tearing","rendering","zombie child"],"slug":"notes/react-tearing","type":"notes","name":"react-tearing","layout":"note"},"slug":"notes/react-tearing"},{"metadata":{"title":"'g' flag in regex","tags":["regex"],"slug":"notes/regex-g","type":"notes","name":"regex-g","layout":"note"},"slug":"notes/regex-g"},{"metadata":{"title":"React Suspense","tags":["react"],"slug":"notes/react-suspense","type":"notes","name":"react-suspense","layout":"note"},"slug":"notes/react-suspense"},{"metadata":{"title":"Custom Flags with Puppeteer","tags":["puppeteer"],"slug":"notes/puppeteer","type":"notes","name":"puppeteer","layout":"note"},"slug":"notes/puppeteer"},{"metadata":{"title":"Nonogram Solver","slug":"notes/nonogram","type":"notes","name":"nonogram","layout":"note"},"slug":"notes/nonogram"},{"metadata":{"title":"ESM in NodeJS","tags":["NodeJS","ESM"],"slug":"notes/node-experimental-modules","type":"notes","name":"node-experimental-modules","layout":"note"},"slug":"notes/node-experimental-modules"},{"metadata":{"title":"Converting movie to gif","tags":["ffmpeg"],"slug":"notes/movie-to-gif","type":"notes","name":"movie-to-gif","layout":"note"},"slug":"notes/movie-to-gif"},{"metadata":{"title":"Webpack Module Federation","tags":["webpack"],"slug":"notes/module-federation","type":"notes","name":"module-federation","layout":"note"},"slug":"notes/module-federation"},{"metadata":{"title":"Getting module dependency from Node.js","tags":["NodeJs"],"slug":"notes/module-children","type":"notes","name":"module-children","layout":"note"},"slug":"notes/module-children"},{"metadata":{"title":"Thoughts on Micro-frontends","tags":["micro-frontend"],"slug":"notes/microfrontends","type":"notes","name":"microfrontends","layout":"note"},"slug":"notes/microfrontends"},{"metadata":{"title":"Build a JavaScript Engine with Rust","tags":["JavaScript"],"slug":"notes/javascript-engine","type":"notes","name":"javascript-engine","layout":"note"},"slug":"notes/javascript-engine"},{"metadata":{"title":"graphiql","tags":["graphql","graphiql"],"slug":"notes/graphiql-editor","type":"notes","name":"graphiql-editor","layout":"note"},"slug":"notes/graphiql-editor"},{"metadata":{"title":"Git commands","tags":["git"],"slug":"notes/git-commands","type":"notes","name":"git-commands","layout":"note"},"slug":"notes/git-commands"},{"metadata":{"title":"LeadDev New York 2019","tags":["technical leadership","conference notes"],"slug":"notes/lead-dev","type":"notes","name":"lead-dev","layout":"note"},"slug":"notes/lead-dev"},{"metadata":{"title":"Flow Internal Slots","tags":["flow internals"],"slug":"notes/flow-internal-slots","type":"notes","name":"flow-internal-slots","layout":"note"},"slug":"notes/flow-internal-slots"},{"metadata":{"title":"enhanced-resolve","tags":["webpack internals"],"slug":"notes/enhanced-resolve","type":"notes","name":"enhanced-resolve","layout":"note"},"slug":"notes/enhanced-resolve"},{"metadata":{"title":"Economics of Software Quality","tags":["software economics"],"slug":"notes/economics-of-software-quality","type":"notes","name":"economics-of-software-quality","layout":"note"},"slug":"notes/economics-of-software-quality"},{"metadata":{"title":"Digital Rights Management","tags":["DRM","streaming"],"slug":"notes/digital-rights-management","type":"notes","name":"digital-rights-management","layout":"note"},"slug":"notes/digital-rights-management"},{"metadata":{"title":"The CSS Podcast: 021: Gradients","tags":["css gradients","The CSS Podcast"],"slug":"notes/css-podcast-021-gradients","type":"notes","name":"css-podcast-021-gradients","layout":"note"},"slug":"notes/css-podcast-021-gradients"},{"metadata":{"title":"The CSS Podcast: 020: Functions","tags":["css functions","The CSS Podcast"],"slug":"notes/css-podcast-020-functions","type":"notes","name":"css-podcast-020-functions","layout":"note"},"slug":"notes/css-podcast-020-functions"},{"metadata":{"title":"CSS Houdini","tags":["css houdini"],"slug":"notes/css-houdini","type":"notes","name":"css-houdini","layout":"note"},"slug":"notes/css-houdini"},{"metadata":{"title":"Creating context menu in Chrome Extension","tags":["chrome-extension"],"slug":"notes/creating-context-menu-in-chrome-extension","type":"notes","name":"creating-context-menu-in-chrome-extension","layout":"note"},"slug":"notes/creating-context-menu-in-chrome-extension"},{"metadata":{"title":"The CSS Podcast: 019: Z-Index and Stacking Context","tags":["z-index","stacking context","The CSS Podcast"],"slug":"notes/css-podcast-019-z-index","type":"notes","name":"css-podcast-019-z-index","layout":"note"},"slug":"notes/css-podcast-019-z-index"},{"metadata":{"title":"Content Security Policy","tags":["web security"],"slug":"notes/content-security-policy","type":"notes","name":"content-security-policy","layout":"note"},"slug":"notes/content-security-policy"},{"metadata":{"title":"Chrome Dev Tools","tags":["debugging","Chrome Dev Tools"],"slug":"notes/chrome-dev-tools","type":"notes","name":"chrome-dev-tools","layout":"note"},"slug":"notes/chrome-dev-tools"},{"metadata":{"title":"Building my Svelte static site","tags":["Svelte static site"],"slug":"notes/building-my-svelte-static-site","type":"notes","name":"building-my-svelte-static-site","layout":"note"},"slug":"notes/building-my-svelte-static-site"},{"metadata":{"title":"The CSS Podcast: 023: Filters","tags":["css filters","The CSS Podcast"],"slug":"notes/css-podcast-023-filters","type":"notes","name":"css-podcast-023-filters","layout":"note"},"slug":"notes/css-podcast-023-filters"},{"metadata":{"title":"Building my Gatsby Site","tags":["Gatsby"],"slug":"notes/building-my-gatsby-site","type":"notes","name":"building-my-gatsby-site","layout":"note"},"slug":"notes/building-my-gatsby-site"},{"metadata":{"title":"Blog inspiration","tags":["writing"],"slug":"notes/blog-inspiration","type":"notes","name":"blog-inspiration","layout":"note"},"slug":"notes/blog-inspiration"},{"metadata":{"title":"Babel Plugin Ordering","slug":"notes/babel-plugin-order","type":"notes","name":"babel-plugin-order","layout":"note"},"slug":"notes/babel-plugin-order"},{"metadata":{"title":"babel flow pragma bug","tags":["babel","flow"],"slug":"notes/babel-flow-pragma-bug","type":"notes","name":"babel-flow-pragma-bug","layout":"note"},"slug":"notes/babel-flow-pragma-bug"},{"metadata":{"title":"Async initialisation of node lib","tags":["nodejs"],"slug":"notes/async-initialisation-nodejs-lib","type":"notes","name":"async-initialisation-nodejs-lib","layout":"note"},"slug":"notes/async-initialisation-nodejs-lib"},{"metadata":{"title":"Annonymous Function has no arguments","tags":["JavaScript"],"slug":"notes/annonymous-function","type":"notes","name":"annonymous-function","layout":"note"},"slug":"notes/annonymous-function"},{"metadata":{"title":"Amazing Animation Techniques with GSAP","tags":["greensock","web animation"],"slug":"notes/animation-techniques-with-Pete-Barr","type":"notes","name":"animation-techniques-with-Pete-Barr","layout":"note"},"slug":"notes/animation-techniques-with-Pete-Barr"},{"metadata":{"title":"SVG Filters","tags":["svg filters","filters","svg"],"slug":"notes/svg-filters","type":"notes","name":"svg-filters","layout":"note"},"slug":"notes/svg-filters"},{"metadata":{"title":"Syntax highlighting Svelte with Prism","tags":["svelte","prism","syntax highlighting"],"slug":"notes/svelte-with-prism","type":"notes","name":"svelte-with-prism","layout":"note"},"slug":"notes/svelte-with-prism"},{"metadata":{"title":"Button that spark joy","tags":["CSS transform","GreenSock Animation"],"slug":"notes/button-that-spark-joy","type":"notes","name":"button-that-spark-joy","layout":"note"},"slug":"notes/button-that-spark-joy"},{"metadata":{"title":"Svelte Summit 2020 Summary","tags":["svelte","conference"],"slug":"notes/svelte-summit-2020-summary","type":"notes","name":"svelte-summit-2020-summary","layout":"note"},"slug":"notes/svelte-summit-2020-summary"},{"metadata":{"title":"Solid color swipe Svelte Transition","tags":["svelte","transition"],"slug":"notes/solid-color-swipe-svelte-transition","type":"notes","name":"solid-color-swipe-svelte-transition","layout":"note"},"slug":"notes/solid-color-swipe-svelte-transition"},{"metadata":{"title":"SVG filter Svelte Transition","tags":["svelte","transition"],"slug":"notes/svg-filter-svelte-transition","type":"notes","name":"svg-filter-svelte-transition","layout":"note"},"slug":"notes/svg-filter-svelte-transition"},{"metadata":{"title":"The CSS Podcast: 026: Houdini Series: Properties & Values","tags":["css houdini","The CSS Podcast"],"slug":"notes/css-podcast-026-houdini-series-properties-values","type":"notes","name":"css-podcast-026-houdini-series-properties-values","layout":"note"},"slug":"notes/css-podcast-026-houdini-series-properties-values"},{"metadata":{"title":"The CSS Podcast: 027: Houdini Series: Typed Object Model","tags":["css houdini","The CSS Podcast"],"slug":"notes/css-podcast-027-houdini-series-typed-om","type":"notes","name":"css-podcast-027-houdini-series-typed-om","layout":"note"},"slug":"notes/css-podcast-027-houdini-series-typed-om"},{"metadata":{"title":"The CSS Podcast: 028: Houdini Series: Paint","tags":["css houdini","The CSS Podcast"],"slug":"notes/css-podcast-028-houdini-series-paint","type":"notes","name":"css-podcast-028-houdini-series-paint","layout":"note"},"slug":"notes/css-podcast-028-houdini-series-paint"},{"metadata":{"title":"Responsive email layout","tags":["email","layout","responsive","media query"],"slug":"notes/responsive-email-layout","type":"notes","name":"responsive-email-layout","layout":"note"},"slug":"notes/responsive-email-layout"}];

const app = new Notes({
  target: document.querySelector('#app'),
  hydrate: true,
  props: {
    data,
  },
});
