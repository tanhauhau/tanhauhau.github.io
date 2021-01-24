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

/* src/layout/Links.svelte generated by Svelte v3.24.0 */

function create_fragment(ctx) {
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
			ul = element("ul");
			li0 = element("li");
			a0 = element("a");
			t0 = text("About");
			t1 = space();
			li1 = element("li");
			a1 = element("a");
			t2 = text("Writings");
			t3 = space();
			li2 = element("li");
			a2 = element("a");
			t4 = text("Videos");
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
			ul = claim_element(nodes, "UL", { class: true });
			var ul_nodes = children(ul);
			li0 = claim_element(ul_nodes, "LI", { class: true });
			var li0_nodes = children(li0);
			a0 = claim_element(li0_nodes, "A", { href: true, class: true });
			var a0_nodes = children(a0);
			t0 = claim_text(a0_nodes, "About");
			a0_nodes.forEach(detach);
			li0_nodes.forEach(detach);
			t1 = claim_space(ul_nodes);
			li1 = claim_element(ul_nodes, "LI", { class: true });
			var li1_nodes = children(li1);
			a1 = claim_element(li1_nodes, "A", { href: true, class: true });
			var a1_nodes = children(a1);
			t2 = claim_text(a1_nodes, "Writings");
			a1_nodes.forEach(detach);
			li1_nodes.forEach(detach);
			t3 = claim_space(ul_nodes);
			li2 = claim_element(ul_nodes, "LI", { class: true });
			var li2_nodes = children(li2);
			a2 = claim_element(li2_nodes, "A", { href: true, class: true });
			var a2_nodes = children(a2);
			t4 = claim_text(a2_nodes, "Videos");
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
			this.h();
		},
		h() {
			attr(a0, "href", "/about");
			attr(a0, "class", "svelte-hjsn8n");
			attr(li0, "class", "svelte-hjsn8n");
			attr(a1, "href", "/blogs");
			attr(a1, "class", "svelte-hjsn8n");
			attr(li1, "class", "svelte-hjsn8n");
			attr(a2, "href", "/videos");
			attr(a2, "class", "svelte-hjsn8n");
			attr(li2, "class", "svelte-hjsn8n");
			attr(a3, "href", "/talks");
			attr(a3, "class", "svelte-hjsn8n");
			attr(li3, "class", "svelte-hjsn8n");
			attr(a4, "href", "/notes");
			attr(a4, "class", "svelte-hjsn8n");
			attr(li4, "class", "svelte-hjsn8n");
			attr(a5, "href", "/newsletter");
			attr(a5, "class", "svelte-hjsn8n");
			attr(li5, "class", "svelte-hjsn8n");
			attr(path0, "d", "M23 3a10.9 10.9 0 0 1-3.14 1.53 4.48 4.48 0 0 0-7.86 3v1A10.66\n  10.66 0 0 1 3 4s-4 9 5 13a11.64 11.64 0 0 1-7 2c9 5 20 0 20-11.5a4.5\n  4.5 0 0 0-.08-.83A7.72 7.72 0 0 0 23 3z");
			attr(svg0, "viewBox", "0 0 24 24");
			attr(svg0, "width", "1em");
			attr(svg0, "height", "1em");
			attr(svg0, "class", "svelte-hjsn8n");
			attr(a6, "aria-label", "Twitter account");
			attr(a6, "href", "https://twitter.com/lihautan");
			attr(a6, "class", "svelte-hjsn8n");
			attr(path1, "d", "M9 19c-5 1.5-5-2.5-7-3m14 6v-3.87a3.37 3.37 0 0\n  0-.94-2.61c3.14-.35 6.44-1.54 6.44-7A5.44 5.44 0 0 0 20 4.77 5.07\n  5.07 0 0 0 19.91 1S18.73.65 16 2.48a13.38 13.38 0 0 0-7 0C6.27.65\n  5.09 1 5.09 1A5.07 5.07 0 0 0 5 4.77a5.44 5.44 0 0 0-1.5 3.78c0 5.42\n  3.3 6.61 6.44 7A3.37 3.37 0 0 0 9 18.13V22");
			attr(svg1, "viewBox", "0 0 24 24");
			attr(svg1, "width", "1em");
			attr(svg1, "height", "1em");
			attr(svg1, "class", "svelte-hjsn8n");
			attr(a7, "aria-label", "Github account");
			attr(a7, "href", "https://github.com/tanhauhau");
			attr(a7, "class", "svelte-hjsn8n");
			attr(li6, "class", "social svelte-hjsn8n");
			attr(ul, "class", "svelte-hjsn8n");
		},
		m(target, anchor) {
			insert(target, ul, anchor);
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
			if (detaching) detach(ul);
		}
	};
}

class Links extends SvelteComponent {
	constructor(options) {
		super();
		init(this, options, null, create_fragment, safe_not_equal, {});
	}
}

/* src/routes/404.svelte generated by Svelte v3.24.0 */

function create_fragment$1(ctx) {
	let main;
	let svg;
	let path0;
	let path1;
	let path2;
	let t0;
	let h1;
	let t1;
	let t2;
	let links;
	let current;
	links = new Links({});

	return {
		c() {
			main = element("main");
			svg = svg_element("svg");
			path0 = svg_element("path");
			path1 = svg_element("path");
			path2 = svg_element("path");
			t0 = space();
			h1 = element("h1");
			t1 = text("Oops! Nothing here.");
			t2 = space();
			create_component(links.$$.fragment);
			this.h();
		},
		l(nodes) {
			main = claim_element(nodes, "MAIN", { class: true });
			var main_nodes = children(main);

			svg = claim_element(
				main_nodes,
				"svg",
				{
					width: true,
					height: true,
					xmlns: true,
					viewBox: true
				},
				1
			);

			var svg_nodes = children(svg);
			path0 = claim_element(svg_nodes, "path", { d: true }, 1);
			children(path0).forEach(detach);
			path1 = claim_element(svg_nodes, "path", { d: true }, 1);
			children(path1).forEach(detach);
			path2 = claim_element(svg_nodes, "path", { d: true }, 1);
			children(path2).forEach(detach);
			svg_nodes.forEach(detach);
			t0 = claim_space(main_nodes);
			h1 = claim_element(main_nodes, "H1", { class: true });
			var h1_nodes = children(h1);
			t1 = claim_text(h1_nodes, "Oops! Nothing here.");
			h1_nodes.forEach(detach);
			t2 = claim_space(main_nodes);
			claim_component(links.$$.fragment, main_nodes);
			main_nodes.forEach(detach);
			this.h();
		},
		h() {
			attr(path0, "d", "M352.145 196.624c-28.63 0-51.84 23.21-51.84 51.84s23.21 51.84 51.84 51.84 51.84-23.21 51.84-51.84c-.01-28.627-23.214-51.83-51.84-51.84zm-25.92 82.944c-5.726 0-10.368-4.642-10.368-10.368s4.642-10.368 10.368-10.368 10.368 4.642 10.368 10.368c-.017 5.718-4.649 10.35-10.368 10.368zm36.288-25.92c-11.452 0-20.736-9.284-20.736-20.736s9.284-20.736 20.736-20.736 20.736 9.284 20.736 20.736c.003 11.449-9.275 20.733-20.724 20.736h-.012zM186.259 248.464c.001-28.63-23.209-51.84-51.839-51.841-28.63-.001-51.84 23.209-51.841 51.839s23.209 51.84 51.839 51.841h.001c28.626-.011 51.829-23.214 51.84-51.839zm-77.76 31.1c-5.726 0-10.368-4.642-10.368-10.368s4.642-10.368 10.368-10.368 10.368 4.642 10.368 10.368c-.015 5.72-4.648 10.354-10.368 10.372v-.004zm36.288-25.92c-11.452 0-20.736-9.284-20.736-20.736s9.284-20.736 20.736-20.736 20.736 9.284 20.736 20.736c.006 11.449-9.271 20.734-20.72 20.74h-.016v-.004z");
			attr(path1, "d", "M243.282.002C108.928-.005.007 108.905 0 243.259a243.273 243.273 0 0 0 71.264 172.042c95.004 95.003 249.035 95.002 344.038-.002s95.002-249.035-.002-344.038A241.682 241.682 0 0 0 243.282.002zm0 466.556c-123.116 0-223.278-100.162-223.278-223.278S120.166 20.002 243.282 20.002 466.56 120.164 466.56 243.28 366.398 466.558 243.282 466.558z");
			attr(path2, "d", "M130.182 174.344l-1.689-19.928a59.1 59.1 0 0 0-43.776 25.433l16.465 11.363a39.172 39.172 0 0 1 29-16.868zM358.07 154.416l-1.688 19.928a39.176 39.176 0 0 1 29.006 16.868l16.459-11.363a59.094 59.094 0 0 0-43.777-25.433zM324.082 340.294c-4.11-4.611-10.289-11.577-22.1-11.577-11.85 0-18.057 6.98-22.175 11.6-3.53 3.96-4.61 4.886-7.195 4.886-2.619 0-3.71-.93-7.257-4.908-4.11-4.611-10.319-11.577-22.13-11.577s-18.031 6.977-22.14 11.594c-3.527 3.964-4.614 4.891-7.2 4.891s-3.671-.926-7.2-4.886c-4.118-4.619-10.341-11.6-22.19-11.6-11.822 0-17.968 6.977-22.077 11.594-3.527 3.969-5.136 4.891-7.136 4.891v20c12 0 17.969-6.978 22.077-11.6 3.528-3.964 4.583-4.89 7.169-4.89 2.619 0 3.7.93 7.245 4.908 4.11 4.61 10.313 11.577 22.124 11.577s18.028-6.978 22.136-11.6c3.528-3.964 4.614-4.89 7.2-4.89s3.672.925 7.2 4.886c4.118 4.619 10.34 11.6 22.19 11.6 11.81 0 18.021-6.967 22.131-11.577 3.547-3.978 4.642-4.908 7.261-4.908 2.585 0 3.609.925 7.139 4.886 4.118 4.619 10.127 11.6 22.127 11.6v-20c-1.999.008-3.65-.922-7.199-4.9z");
			attr(svg, "width", "100px");
			attr(svg, "height", "100px");
			attr(svg, "xmlns", "http://www.w3.org/2000/svg");
			attr(svg, "viewBox", "0 0 486.554 486.554");
			attr(h1, "class", "svelte-aizptz");
			attr(main, "class", "svelte-aizptz");
		},
		m(target, anchor) {
			insert(target, main, anchor);
			append(main, svg);
			append(svg, path0);
			append(svg, path1);
			append(svg, path2);
			append(main, t0);
			append(main, h1);
			append(h1, t1);
			append(main, t2);
			mount_component(links, main, null);
			current = true;
		},
		p: noop,
		i(local) {
			if (current) return;
			transition_in(links.$$.fragment, local);
			current = true;
		},
		o(local) {
			transition_out(links.$$.fragment, local);
			current = false;
		},
		d(detaching) {
			if (detaching) detach(main);
			destroy_component(links);
		}
	};
}

class _404 extends SvelteComponent {
	constructor(options) {
		super();
		init(this, options, null, create_fragment$1, safe_not_equal, {});
	}
}

const app = new _404({
  target: document.querySelector('#app'),
  hydrate: true,
});
