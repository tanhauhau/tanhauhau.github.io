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
function empty() {
    return text('');
}
function listen(node, event, handler, options) {
    node.addEventListener(event, handler, options);
    return () => node.removeEventListener(event, handler, options);
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
function set_input_value(input, value) {
    input.value = value == null ? '' : value;
}
function query_selector_all(selector, parent = document.body) {
    return Array.from(parent.querySelectorAll(selector));
}
class HtmlTag {
    constructor(anchor = null) {
        this.a = anchor;
        this.e = this.n = null;
    }
    m(html, target, anchor = null) {
        if (!this.e) {
            this.e = element(target.nodeName);
            this.t = target;
            this.h(html);
        }
        this.i(anchor);
    }
    h(html) {
        this.e.innerHTML = html;
        this.n = Array.from(this.e.childNodes);
    }
    i(anchor) {
        for (let i = 0; i < this.n.length; i += 1) {
            insert(this.t, this.n[i], anchor);
        }
    }
    p(html) {
        this.d();
        this.h(html);
        this.i(this.a);
    }
    d() {
        this.n.forEach(detach);
    }
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

var __build_img__8 = "a89d2417a7970cfd.png";

var __build_img__7 = "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAMgAAADICAMAAACahl6sAAAAGXRFWHRTb2Z0d2FyZQBBZG9iZSBJbWFnZVJlYWR5ccllPAAAA2hpVFh0WE1MOmNvbS5hZG9iZS54bXAAAAAAADw/eHBhY2tldCBiZWdpbj0i77u/IiBpZD0iVzVNME1wQ2VoaUh6cmVTek5UY3prYzlkIj8+IDx4OnhtcG1ldGEgeG1sbnM6eD0iYWRvYmU6bnM6bWV0YS8iIHg6eG1wdGs9IkFkb2JlIFhNUCBDb3JlIDUuMy1jMDExIDY2LjE0NTY2MSwgMjAxMi8wMi8wNi0xNDo1NjoyNyAgICAgICAgIj4gPHJkZjpSREYgeG1sbnM6cmRmPSJodHRwOi8vd3d3LnczLm9yZy8xOTk5LzAyLzIyLXJkZi1zeW50YXgtbnMjIj4gPHJkZjpEZXNjcmlwdGlvbiByZGY6YWJvdXQ9IiIgeG1sbnM6eG1wTU09Imh0dHA6Ly9ucy5hZG9iZS5jb20veGFwLzEuMC9tbS8iIHhtbG5zOnN0UmVmPSJodHRwOi8vbnMuYWRvYmUuY29tL3hhcC8xLjAvc1R5cGUvUmVzb3VyY2VSZWYjIiB4bWxuczp4bXA9Imh0dHA6Ly9ucy5hZG9iZS5jb20veGFwLzEuMC8iIHhtcE1NOk9yaWdpbmFsRG9jdW1lbnRJRD0ieG1wLmRpZDowMTgwMTE3NDA3MjA2ODExODA4M0VGM0VGRTJEMDgyMyIgeG1wTU06RG9jdW1lbnRJRD0ieG1wLmRpZDpGOUUwRkQwMjE2NjIxMUVBQTE5M0Q5NjEyNUVERjBERSIgeG1wTU06SW5zdGFuY2VJRD0ieG1wLmlpZDpGOUUwRkQwMTE2NjIxMUVBQTE5M0Q5NjEyNUVERjBERSIgeG1wOkNyZWF0b3JUb29sPSJBZG9iZSBQaG90b3Nob3AgQ1M2IChNYWNpbnRvc2gpIj4gPHhtcE1NOkRlcml2ZWRGcm9tIHN0UmVmOmluc3RhbmNlSUQ9InhtcC5paWQ6MEE4MDExNzQwNzIwNjgxMTgwODNFRjNFRkUyRDA4MjMiIHN0UmVmOmRvY3VtZW50SUQ9InhtcC5kaWQ6MDE4MDExNzQwNzIwNjgxMTgwODNFRjNFRkUyRDA4MjMiLz4gPC9yZGY6RGVzY3JpcHRpb24+IDwvcmRmOlJERj4gPC94OnhtcG1ldGE+IDw/eHBhY2tldCBlbmQ9InIiPz4sCV/fAAADAFBMVEWLi4uioqIrFy/Vg+rV1dVoaGjEhtPtV2+6V9LXAADZZbq7u7uRkZH9+f7IAADXdtnKysq2Rlvjq/GpeLXzAAC4AADFctrz2/n14vp8fHyrq6vtyvbc3Nz57fyGTZPs7OyysrKAgIDbk+zk5OTsAAB3RIPEY9ynAADdmu6ecammpqbqw/SHAAD4+PiWAAC1Vc3zKCzjAADMUrDQeOZHAAC7j8b68PzOzs7lsvLsaI/OsNaGhoaZmZlpPXRWAAD8AABzc3PpvPPNeeJ1AAD+/P709PQYAADZjOvIc935AADceM2oYbp1andmAAA4AABaNGSXR6ukfq3CcNeUgJnFxcXsPUmdnZ3CwcKSVKLKbeGjXrTPdOXx8fHgc7m5asyKgYzNduOLUJqqna2lTbsoAACbWqv89v3QduYDAAEWCxXharO7fMvx1vhTKlzJetxjOGyeMUa1fMPhpe/CetRCJkmDbYmumrKyZsXSKzD8/Pw8IEKylrmBeoPAXdmTfJnOcuS9bdBubm6vc793OIfUf+nTeeb4FRbTfOhxQXyFgobZbcpKKlOgoKCloaaufbrYGBqEPpPcXqsMAABuKDVUMF3Wed+QU53jFhd6NkzMys3LdeCKbpHXiOu8ds2QLDTGetlsaW2uZMCsUcLReuaOgZHw0veXV6bPd+TNwNDPeuTCUW7Ab9QKBQrHaN+WFRfBYZ6cU67gdsPSg+WxFxjOfePvz/fobqPfoO+1aMUmEx7Pi+DMcOLGFhmcf6PTeOUiEyXReOM2FyH59frPmd3nt/NfDAwbDx17bH//BAR5dno/HzIzHTm2acnNdNSRbplSLU7Ad9NiL26HgYhqamp+SYssEBajo6NGDQ4NBw0QCRAGAwb//v/78/336PufXLCon6qfS7RvaXBwNH7UeeSDg4O3dcfEabLVydlhGBz9DA2OQ6C2Dx6OFhizKC3Mb8ZRGyHMYsdIIk9/DA0yDRCvWo7zBQWUS3mfmaHaTJOCgoK+WdfMzMz/AAAAAADSeej///98P3mfAAABAHRSTlP///////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////8AU/cHJQAAH7FJREFUeNrsnQt8U/W9wNNShEgbape0QHmWQEpbillqiwINkJASsEGe5S1orKcCMqGK1HF5WCgIossAXa1jpZTKCHdjE6syV/3IOrHOqSC2act81N1d7u7U7epuHyn3vP7P88/JSXlY72c/Xwjt6fme3/v3/59/dFf+n4juXyD/AuntIE6nMy4uzulsvuKMK2zhpTBO+K3CluzsbOHXzczvaha/zekM8cc3DMQpS1xL66C11adPn16blLQ2eVpCbWpq6oaJ09LTz/K/TEmtTZh2elB2nJP+buHbkqp5SRrUqvzjGwWC7v50cvrEhNqUPFEqSruZUlGbnjRM1pOgu8KWYUmneeQU/vtSUnjUZB61+caDOLOT0hNSK/qUlpaV8lLWrUH65KVuSDibnnw6OTl9moCOQ5fm1Z6tHhZ3g0HiWpM3VGi6eUpE6tI+vDDYS1Mmrs123kAQZ3Zyamn39ZDS1GmtcTcMxJmUcH0wRFdKSCq8QSCFp1O6r6P0qV1beENAWqb16b6uUppaXXj9QZytE6+HWdlsNiwgpKS3NF9fEOew5OtgVjtfT3y58uXE13ci80pIiruOINcjWO38bOCsFf/z7NuvvP3sL2bNOvgZUEre2QijVwQgcUkJ19o7Pjs466Xbb/lxUZCXwBcL+92+YtbBncC+kluuD0jLNbeqnQNP3d7v0UwPFxSFy/h618J+L50CKKUJrc5rD9Kcfa2DVdXBU7cvfMaSFQgCydJbrV/v6vfSLGBgKdUtmqti3bfFsXPgS/12mXJ9QSTefI8nN9Nwa78VUCkbTrcWOq8lyDXn+GzW7bcaHC4O4wiK/8d5HJaFLw3cCcuvaUmayi9tIIXJFdeao99TmR5cHTwC+K83968//9vrqGiZmNTivDYgzqSUa87xm3xSHUHOhX7p+8ePD22r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";

var __build_img__6 = "434323b610ecc648.png";

var __build_img__5 = "8d653e6dd15ecdf5.gif";

var __build_img__4 = "fe876ff9778d7618.png";

var __build_img__3 = "3a6793d23b3282f2.gif";

var __build_img__2 = "e187d1f56cc116c3.gif";

var __build_img__1 = "0176ecb69ec20d12.gif";

var __build_img__0 = "2f89d18a8952b14c.gif";

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
			a6 = claim_element(li6_nodes, "A", { href: true, class: true });
			var a6_nodes = children(a6);
			svg0 = claim_element(a6_nodes, "svg", { viewBox: true, class: true }, 1);
			var svg0_nodes = children(svg0);
			path0 = claim_element(svg0_nodes, "path", { d: true }, 1);
			children(path0).forEach(detach);
			svg0_nodes.forEach(detach);
			a6_nodes.forEach(detach);
			t12 = claim_space(li6_nodes);
			a7 = claim_element(li6_nodes, "A", { href: true, class: true });
			var a7_nodes = children(a7);
			svg1 = claim_element(a7_nodes, "svg", { viewBox: true, class: true }, 1);
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
			attr(svg0, "class", "svelte-f3e4uo");
			attr(a6, "href", "https://twitter.com/lihautan");
			attr(a6, "class", "svelte-f3e4uo");
			attr(path1, "d", "M9 19c-5 1.5-5-2.5-7-3m14 6v-3.87a3.37 3.37 0 0\n    0-.94-2.61c3.14-.35 6.44-1.54 6.44-7A5.44 5.44 0 0 0 20 4.77 5.07\n    5.07 0 0 0 19.91 1S18.73.65 16 2.48a13.38 13.38 0 0 0-7 0C6.27.65\n    5.09 1 5.09 1A5.07 5.07 0 0 0 5 4.77a5.44 5.44 0 0 0-1.5 3.78c0 5.42\n    3.3 6.61 6.44 7A3.37 3.37 0 0 0 9 18.13V22");
			attr(svg1, "viewBox", "0 0 24 24");
			attr(svg1, "class", "svelte-f3e4uo");
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

/* src/layout/Newsletter.svelte generated by Svelte v3.24.0 */

function create_fragment$1(ctx) {
	let div1;
	let h1;
	let t0;
	let t1;
	let h2;
	let t2;
	let t3;
	let form;
	let div0;
	let input0;
	let t4;
	let input1;
	let input1_disabled_value;
	let t5;
	let input2;
	let t6;
	let p;
	let t7;
	let mounted;
	let dispose;

	return {
		c() {
			div1 = element("div");
			h1 = element("h1");
			t0 = text("Subscribe to my newsletter");
			t1 = space();
			h2 = element("h2");
			t2 = text("Get the latest blog posts and project updates delivered right to your inbox");
			t3 = space();
			form = element("form");
			div0 = element("div");
			input0 = element("input");
			t4 = space();
			input1 = element("input");
			t5 = space();
			input2 = element("input");
			t6 = space();
			p = element("p");
			t7 = text("Powered by Buttondown.");
			this.h();
		},
		l(nodes) {
			div1 = claim_element(nodes, "DIV", { class: true });
			var div1_nodes = children(div1);
			h1 = claim_element(div1_nodes, "H1", {});
			var h1_nodes = children(h1);
			t0 = claim_text(h1_nodes, "Subscribe to my newsletter");
			h1_nodes.forEach(detach);
			t1 = claim_space(div1_nodes);
			h2 = claim_element(div1_nodes, "H2", { class: true });
			var h2_nodes = children(h2);
			t2 = claim_text(h2_nodes, "Get the latest blog posts and project updates delivered right to your inbox");
			h2_nodes.forEach(detach);
			t3 = claim_space(div1_nodes);

			form = claim_element(div1_nodes, "FORM", {
				action: true,
				method: true,
				target: true,
				onsubmit: true,
				class: true
			});

			var form_nodes = children(form);
			div0 = claim_element(form_nodes, "DIV", { class: true });
			var div0_nodes = children(div0);

			input0 = claim_element(div0_nodes, "INPUT", {
				type: true,
				name: true,
				id: true,
				placeholder: true,
				class: true
			});

			t4 = claim_space(div0_nodes);

			input1 = claim_element(div0_nodes, "INPUT", {
				type: true,
				value: true,
				disabled: true,
				class: true
			});

			div0_nodes.forEach(detach);
			t5 = claim_space(form_nodes);

			input2 = claim_element(form_nodes, "INPUT", {
				type: true,
				value: true,
				name: true,
				class: true
			});

			t6 = claim_space(form_nodes);
			p = claim_element(form_nodes, "P", { class: true });
			var p_nodes = children(p);
			t7 = claim_text(p_nodes, "Powered by Buttondown.");
			p_nodes.forEach(detach);
			form_nodes.forEach(detach);
			div1_nodes.forEach(detach);
			this.h();
		},
		h() {
			attr(h2, "class", "svelte-1k1s1co");
			attr(input0, "type", "email");
			attr(input0, "name", "email");
			attr(input0, "id", "bd-email");
			attr(input0, "placeholder", "youremail@example.com");
			attr(input0, "class", "svelte-1k1s1co");
			attr(input1, "type", "submit");
			input1.value = "Subscribe";
			input1.disabled = input1_disabled_value = !/*email*/ ctx[0];
			attr(input1, "class", "svelte-1k1s1co");
			attr(div0, "class", "form-item svelte-1k1s1co");
			attr(input2, "type", "hidden");
			input2.value = "1";
			attr(input2, "name", "embed");
			attr(input2, "class", "svelte-1k1s1co");
			attr(p, "class", "svelte-1k1s1co");
			attr(form, "action", "https://buttondown.email/api/emails/embed-subscribe/lihautan");
			attr(form, "method", "post");
			attr(form, "target", "popupwindow");
			attr(form, "onsubmit", "window.open('https://buttondown.email/lihautan', 'popupwindow')");
			attr(form, "class", "embeddable-buttondown-form");
			attr(div1, "class", "form svelte-1k1s1co");
		},
		m(target, anchor) {
			insert(target, div1, anchor);
			append(div1, h1);
			append(h1, t0);
			append(div1, t1);
			append(div1, h2);
			append(h2, t2);
			append(div1, t3);
			append(div1, form);
			append(form, div0);
			append(div0, input0);
			set_input_value(input0, /*email*/ ctx[0]);
			append(div0, t4);
			append(div0, input1);
			append(form, t5);
			append(form, input2);
			append(form, t6);
			append(form, p);
			append(p, t7);

			if (!mounted) {
				dispose = listen(input0, "input", /*input0_input_handler*/ ctx[1]);
				mounted = true;
			}
		},
		p(ctx, [dirty]) {
			if (dirty & /*email*/ 1 && input0.value !== /*email*/ ctx[0]) {
				set_input_value(input0, /*email*/ ctx[0]);
			}

			if (dirty & /*email*/ 1 && input1_disabled_value !== (input1_disabled_value = !/*email*/ ctx[0])) {
				input1.disabled = input1_disabled_value;
			}
		},
		i: noop,
		o: noop,
		d(detaching) {
			if (detaching) detach(div1);
			mounted = false;
			dispose();
		}
	};
}

function instance($$self, $$props, $$invalidate) {
	let email;

	function input0_input_handler() {
		email = this.value;
		$$invalidate(0, email);
	}

	return [email, input0_input_handler];
}

class Newsletter extends SvelteComponent {
	constructor(options) {
		super();
		init(this, options, instance, create_fragment$1, safe_not_equal, {});
	}
}

var baseCss = "http://127.0.0.1:8080/super-silly-hackathon-2019/assets/_blog-299aa480.css";

var image = null;

/* src/layout/blog.svelte generated by Svelte v3.24.0 */

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

// (34:2) {#each tags as tag}
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

// (73:2) {#each tags as tag}
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
			attr(span, "class", "svelte-2w4dum");
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

function create_fragment$2(ctx) {
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
	let meta9;
	let meta10;
	let meta11;
	let meta12;
	let html_tag;

	let raw0_value = `<script type="application/ld+json">${JSON.stringify({
		"@context": "https://schema.org",
		"@type": "Article",
		author: /*jsonLdAuthor*/ ctx[3],
		copyrightHolder: /*jsonLdAuthor*/ ctx[3],
		copyrightYear: "2020",
		creator: /*jsonLdAuthor*/ ctx[3],
		publisher: /*jsonLdAuthor*/ ctx[3],
		description: /*description*/ ctx[1],
		headline: /*title*/ ctx[0],
		name: /*title*/ ctx[0],
		inLanguage: "en"
	})}</script>` + "";

	let html_anchor;
	let html_tag_1;

	let raw1_value = `<script type="application/ld+json">${JSON.stringify({
		"@context": "https://schema.org",
		"@type": "BreadcrumbList",
		"description": "Breadcrumbs list",
		"name": "Breadcrumbs",
		"itemListElement": [
			{
				"@type": "ListItem",
				"item": {
					"@id": "https://lihautan.com",
					"name": "Homepage"
				},
				"position": 1
			},
			{
				"@type": "ListItem",
				"item": {
					"@id": "http%3A%2F%2F127.0.0.1%3A8080%2Fsuper-silly-hackathon-2019",
					"name": /*title*/ ctx[0]
				},
				"position": 2
			}
		]
	})}</script>` + "";

	let html_anchor_1;
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
	let t7;
	let footer;
	let newsletter;
	let t8;
	let html_tag_2;
	let raw2_value = "<script async src=\"https://platform.twitter.com/widgets.js\" charset=\"utf-8\"></script>" + "";
	let html_anchor_2;
	let current;
	document.title = title_value = "" + (/*title*/ ctx[0] + " | Tan Li Hau");
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

	const default_slot_template = /*$$slots*/ ctx[5].default;
	const default_slot = create_slot(default_slot_template, ctx, /*$$scope*/ ctx[4], null);
	newsletter = new Newsletter({});

	return {
		c() {
			link = element("link");
			meta0 = element("meta");
			meta1 = element("meta");
			meta2 = element("meta");
			meta3 = element("meta");
			meta4 = element("meta");
			meta5 = element("meta");
			meta6 = element("meta");
			meta7 = element("meta");
			meta8 = element("meta");
			meta9 = element("meta");
			meta10 = element("meta");

			for (let i = 0; i < each_blocks_1.length; i += 1) {
				each_blocks_1[i].c();
			}

			meta11 = element("meta");
			meta12 = element("meta");
			html_anchor = empty();
			html_anchor_1 = empty();
			t0 = space();
			a = element("a");
			t1 = text("Skip to content");
			t2 = space();
			create_component(header.$$.fragment);
			t3 = space();
			main = element("main");
			h1 = element("h1");
			t4 = text(/*title*/ ctx[0]);
			t5 = space();

			for (let i = 0; i < each_blocks.length; i += 1) {
				each_blocks[i].c();
			}

			t6 = space();
			article = element("article");
			if (default_slot) default_slot.c();
			t7 = space();
			footer = element("footer");
			create_component(newsletter.$$.fragment);
			t8 = space();
			html_anchor_2 = empty();
			this.h();
		},
		l(nodes) {
			const head_nodes = query_selector_all("[data-svelte=\"svelte-1k4ncsr\"]", document.head);
			link = claim_element(head_nodes, "LINK", { href: true, rel: true });
			meta0 = claim_element(head_nodes, "META", { name: true, content: true });
			meta1 = claim_element(head_nodes, "META", { name: true, content: true });
			meta2 = claim_element(head_nodes, "META", { name: true, content: true });
			meta3 = claim_element(head_nodes, "META", { name: true, content: true });
			meta4 = claim_element(head_nodes, "META", { name: true, content: true });
			meta5 = claim_element(head_nodes, "META", { name: true, content: true });
			meta6 = claim_element(head_nodes, "META", { name: true, content: true });
			meta7 = claim_element(head_nodes, "META", { name: true, content: true });
			meta8 = claim_element(head_nodes, "META", { name: true, content: true });
			meta9 = claim_element(head_nodes, "META", { name: true, content: true });
			meta10 = claim_element(head_nodes, "META", { name: true, content: true });

			for (let i = 0; i < each_blocks_1.length; i += 1) {
				each_blocks_1[i].l(head_nodes);
			}

			meta11 = claim_element(head_nodes, "META", { itemprop: true, content: true });
			meta12 = claim_element(head_nodes, "META", { itemprop: true, content: true });
			html_anchor = empty();
			html_anchor_1 = empty();
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
			t4 = claim_text(h1_nodes, /*title*/ ctx[0]);
			h1_nodes.forEach(detach);
			t5 = claim_space(main_nodes);

			for (let i = 0; i < each_blocks.length; i += 1) {
				each_blocks[i].l(main_nodes);
			}

			t6 = claim_space(main_nodes);
			article = claim_element(main_nodes, "ARTICLE", {});
			var article_nodes = children(article);
			if (default_slot) default_slot.l(article_nodes);
			article_nodes.forEach(detach);
			main_nodes.forEach(detach);
			t7 = claim_space(nodes);
			footer = claim_element(nodes, "FOOTER", { class: true });
			var footer_nodes = children(footer);
			claim_component(newsletter.$$.fragment, footer_nodes);
			footer_nodes.forEach(detach);
			t8 = claim_space(nodes);
			html_anchor_2 = empty();
			this.h();
		},
		h() {
			attr(link, "href", baseCss);
			attr(link, "rel", "stylesheet");
			attr(meta0, "name", "description");
			attr(meta0, "content", /*description*/ ctx[1]);
			attr(meta1, "name", "image");
			attr(meta1, "content", image);
			attr(meta2, "name", "og:image");
			attr(meta2, "content", image);
			attr(meta3, "name", "og:title");
			attr(meta3, "content", /*title*/ ctx[0]);
			attr(meta4, "name", "og:description");
			attr(meta4, "content", /*description*/ ctx[1]);
			attr(meta5, "name", "og:type");
			attr(meta5, "content", "website");
			attr(meta6, "name", "twitter:card");
			attr(meta6, "content", "summary_large_image");
			attr(meta7, "name", "twitter:creator");
			attr(meta7, "content", "@lihautan");
			attr(meta8, "name", "twitter:title");
			attr(meta8, "content", /*title*/ ctx[0]);
			attr(meta9, "name", "twitter:description");
			attr(meta9, "content", /*description*/ ctx[1]);
			attr(meta10, "name", "twitter:image");
			attr(meta10, "content", image);
			attr(meta11, "itemprop", "url");
			attr(meta11, "content", "http%3A%2F%2F127.0.0.1%3A8080%2Fsuper-silly-hackathon-2019");
			attr(meta12, "itemprop", "image");
			attr(meta12, "content", image);
			html_tag = new HtmlTag(html_anchor);
			html_tag_1 = new HtmlTag(html_anchor_1);
			attr(a, "href", "#content");
			attr(a, "class", "skip svelte-2w4dum");
			attr(main, "id", "content");
			attr(main, "class", "blog svelte-2w4dum");
			attr(footer, "class", "svelte-2w4dum");
			html_tag_2 = new HtmlTag(html_anchor_2);
		},
		m(target, anchor) {
			append(document.head, link);
			append(document.head, meta0);
			append(document.head, meta1);
			append(document.head, meta2);
			append(document.head, meta3);
			append(document.head, meta4);
			append(document.head, meta5);
			append(document.head, meta6);
			append(document.head, meta7);
			append(document.head, meta8);
			append(document.head, meta9);
			append(document.head, meta10);

			for (let i = 0; i < each_blocks_1.length; i += 1) {
				each_blocks_1[i].m(document.head, null);
			}

			append(document.head, meta11);
			append(document.head, meta12);
			html_tag.m(raw0_value, document.head);
			append(document.head, html_anchor);
			html_tag_1.m(raw1_value, document.head);
			append(document.head, html_anchor_1);
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

			insert(target, t7, anchor);
			insert(target, footer, anchor);
			mount_component(newsletter, footer, null);
			insert(target, t8, anchor);
			html_tag_2.m(raw2_value, target, anchor);
			insert(target, html_anchor_2, anchor);
			current = true;
		},
		p(ctx, [dirty]) {
			if ((!current || dirty & /*title*/ 1) && title_value !== (title_value = "" + (/*title*/ ctx[0] + " | Tan Li Hau"))) {
				document.title = title_value;
			}

			if (!current || dirty & /*description*/ 2) {
				attr(meta0, "content", /*description*/ ctx[1]);
			}

			if (!current || dirty & /*title*/ 1) {
				attr(meta3, "content", /*title*/ ctx[0]);
			}

			if (!current || dirty & /*description*/ 2) {
				attr(meta4, "content", /*description*/ ctx[1]);
			}

			if (!current || dirty & /*title*/ 1) {
				attr(meta8, "content", /*title*/ ctx[0]);
			}

			if (!current || dirty & /*description*/ 2) {
				attr(meta9, "content", /*description*/ ctx[1]);
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
						each_blocks_1[i].m(meta11.parentNode, meta11);
					}
				}

				for (; i < each_blocks_1.length; i += 1) {
					each_blocks_1[i].d(1);
				}

				each_blocks_1.length = each_value_1.length;
			}

			if ((!current || dirty & /*description, title*/ 3) && raw0_value !== (raw0_value = `<script type="application/ld+json">${JSON.stringify({
				"@context": "https://schema.org",
				"@type": "Article",
				author: /*jsonLdAuthor*/ ctx[3],
				copyrightHolder: /*jsonLdAuthor*/ ctx[3],
				copyrightYear: "2020",
				creator: /*jsonLdAuthor*/ ctx[3],
				publisher: /*jsonLdAuthor*/ ctx[3],
				description: /*description*/ ctx[1],
				headline: /*title*/ ctx[0],
				name: /*title*/ ctx[0],
				inLanguage: "en"
			})}</script>` + "")) html_tag.p(raw0_value);

			if ((!current || dirty & /*title*/ 1) && raw1_value !== (raw1_value = `<script type="application/ld+json">${JSON.stringify({
				"@context": "https://schema.org",
				"@type": "BreadcrumbList",
				"description": "Breadcrumbs list",
				"name": "Breadcrumbs",
				"itemListElement": [
					{
						"@type": "ListItem",
						"item": {
							"@id": "https://lihautan.com",
							"name": "Homepage"
						},
						"position": 1
					},
					{
						"@type": "ListItem",
						"item": {
							"@id": "http%3A%2F%2F127.0.0.1%3A8080%2Fsuper-silly-hackathon-2019",
							"name": /*title*/ ctx[0]
						},
						"position": 2
					}
				]
			})}</script>` + "")) html_tag_1.p(raw1_value);

			if (!current || dirty & /*title*/ 1) set_data(t4, /*title*/ ctx[0]);

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
				if (default_slot.p && dirty & /*$$scope*/ 16) {
					update_slot(default_slot, default_slot_template, ctx, /*$$scope*/ ctx[4], dirty, null, null);
				}
			}
		},
		i(local) {
			if (current) return;
			transition_in(header.$$.fragment, local);
			transition_in(default_slot, local);
			transition_in(newsletter.$$.fragment, local);
			current = true;
		},
		o(local) {
			transition_out(header.$$.fragment, local);
			transition_out(default_slot, local);
			transition_out(newsletter.$$.fragment, local);
			current = false;
		},
		d(detaching) {
			detach(link);
			detach(meta0);
			detach(meta1);
			detach(meta2);
			detach(meta3);
			detach(meta4);
			detach(meta5);
			detach(meta6);
			detach(meta7);
			detach(meta8);
			detach(meta9);
			detach(meta10);
			destroy_each(each_blocks_1, detaching);
			detach(meta11);
			detach(meta12);
			detach(html_anchor);
			if (detaching) html_tag.d();
			detach(html_anchor_1);
			if (detaching) html_tag_1.d();
			if (detaching) detach(t0);
			if (detaching) detach(a);
			if (detaching) detach(t2);
			destroy_component(header, detaching);
			if (detaching) detach(t3);
			if (detaching) detach(main);
			destroy_each(each_blocks, detaching);
			if (default_slot) default_slot.d(detaching);
			if (detaching) detach(t7);
			if (detaching) detach(footer);
			destroy_component(newsletter);
			if (detaching) detach(t8);
			if (detaching) detach(html_anchor_2);
			if (detaching) html_tag_2.d();
		}
	};
}

function instance$1($$self, $$props, $$invalidate) {
	let { title } = $$props;
	let { description } = $$props;
	let { tags = [] } = $$props;
	const jsonLdAuthor = { ["@type"]: "Person", name: "Tan Li Hau" };
	let { $$slots = {}, $$scope } = $$props;

	$$self.$set = $$props => {
		if ("title" in $$props) $$invalidate(0, title = $$props.title);
		if ("description" in $$props) $$invalidate(1, description = $$props.description);
		if ("tags" in $$props) $$invalidate(2, tags = $$props.tags);
		if ("$$scope" in $$props) $$invalidate(4, $$scope = $$props.$$scope);
	};

	return [title, description, tags, jsonLdAuthor, $$scope, $$slots];
}

class Blog extends SvelteComponent {
	constructor(options) {
		super();
		init(this, options, instance$1, create_fragment$2, safe_not_equal, { title: 0, description: 1, tags: 2 });
	}
}

/* content/blog/super-silly-hackathon-2019/@@page-markup.svelte generated by Svelte v3.24.0 */

function create_default_slot(ctx) {
	let section0;
	let ul6;
	let li0;
	let a0;
	let t0;
	let li1;
	let a1;
	let t1;
	let ul1;
	let ul0;
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
	let ul3;
	let li6;
	let a6;
	let t6;
	let ul2;
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
	let ul5;
	let li14;
	let a14;
	let t14;
	let li15;
	let a15;
	let t15;
	let ul4;
	let li16;
	let a16;
	let t16;
	let li17;
	let a17;
	let t17;
	let li18;
	let a18;
	let t18;
	let t19;
	let p0;
	let t20;
	let a19;
	let t21;
	let t22;
	let t23;
	let blockquote0;
	let p1;
	let t24;
	let a20;
	let t25;
	let t26;
	let a21;
	let t27;
	let t28;
	let p2;
	let t29;
	let a22;
	let t30;
	let t31;
	let t32;
	let p3;
	let img0;
	let img0_src_value;
	let t33;
	let section1;
	let h20;
	let a23;
	let t34;
	let t35;
	let p4;
	let t36;
	let a24;
	let t37;
	let t38;
	let t39;
	let section2;
	let h21;
	let a25;
	let t40;
	let t41;
	let section3;
	let h40;
	let a26;
	let t42;
	let t43;
	let p5;
	let img1;
	let img1_src_value;
	let t44;
	let section4;
	let h41;
	let a27;
	let t45;
	let t46;
	let p6;
	let img2;
	let img2_src_value;
	let t47;
	let section5;
	let h42;
	let a28;
	let t48;
	let t49;
	let p7;
	let img3;
	let img3_src_value;
	let t50;
	let section6;
	let h22;
	let a29;
	let t51;
	let t52;
	let section7;
	let h30;
	let a30;
	let t53;
	let t54;
	let p8;
	let t55;
	let a31;
	let t56;
	let t57;
	let t58;
	let p9;
	let t59;
	let code0;
	let t60;
	let t61;
	let t62;
	let pre0;

	let raw0_value = `
<code class="language-json"><span class="token punctuation">&#123;</span>
  <span class="token property">"manifest_version"</span><span class="token operator">:</span> <span class="token number">2</span><span class="token punctuation">,</span>
  <span class="token property">"name"</span><span class="token operator">:</span> <span class="token string">"Super Silly Hackathon"</span><span class="token punctuation">,</span>
  <span class="token property">"description"</span><span class="token operator">:</span> <span class="token string">"Super Silly Hackathon"</span><span class="token punctuation">,</span>
  <span class="token property">"version"</span><span class="token operator">:</span> <span class="token string">"1.0.0"</span><span class="token punctuation">,</span>
  <span class="token property">"content_scripts"</span><span class="token operator">:</span> <span class="token punctuation">[</span>
    <span class="token punctuation">&#123;</span>
      <span class="token property">"matches"</span><span class="token operator">:</span> <span class="token punctuation">[</span><span class="token string">"&lt;all_urls>"</span><span class="token punctuation">]</span><span class="token punctuation">,</span>
      <span class="token property">"js"</span><span class="token operator">:</span> <span class="token punctuation">[</span><span class="token string">"content.js"</span><span class="token punctuation">]</span><span class="token punctuation">,</span>
      <span class="token property">"css"</span><span class="token operator">:</span> <span class="token punctuation">[</span><span class="token string">"content-ext.css"</span><span class="token punctuation">]</span><span class="token punctuation">,</span>
      <span class="token property">"run_at"</span><span class="token operator">:</span> <span class="token string">"document_start"</span><span class="token punctuation">,</span>
      <span class="token property">"all_frames"</span><span class="token operator">:</span> <span class="token boolean">true</span>
    <span class="token punctuation">&#125;</span>
  <span class="token punctuation">]</span>
<span class="token punctuation">&#125;</span></code>` + "";

	let t63;
	let p10;
	let t64;
	let code1;
	let t65;
	let t66;
	let t67;
	let pre1;

	let raw1_value = `
<code class="language-js"><span class="token comment">// filename: content.js</span>
<span class="token keyword">function</span> <span class="token function">onload</span><span class="token punctuation">(</span><span class="token punctuation">)</span> <span class="token punctuation">&#123;</span>
  <span class="token keyword">const</span> pet <span class="token operator">=</span> <span class="token dom variable">document</span><span class="token punctuation">.</span><span class="token method function property-access">createElement</span><span class="token punctuation">(</span><span class="token string">'div'</span><span class="token punctuation">)</span><span class="token punctuation">;</span>
  <span class="token function">updatePosition</span><span class="token punctuation">(</span><span class="token number">100</span><span class="token punctuation">,</span> <span class="token number">100</span><span class="token punctuation">)</span><span class="token punctuation">;</span>
  pet<span class="token punctuation">.</span><span class="token property-access">classList</span><span class="token punctuation">.</span><span class="token method function property-access">add</span><span class="token punctuation">(</span><span class="token string">'ssh-pet'</span><span class="token punctuation">)</span><span class="token punctuation">;</span>
  <span class="token dom variable">document</span><span class="token punctuation">.</span><span class="token property-access">body</span><span class="token punctuation">.</span><span class="token method function property-access">appendChild</span><span class="token punctuation">(</span>pet<span class="token punctuation">)</span><span class="token punctuation">;</span>
<span class="token punctuation">&#125;</span>
<span class="token dom variable">window</span><span class="token punctuation">.</span><span class="token method function property-access">addEventListener</span><span class="token punctuation">(</span><span class="token string">'load'</span><span class="token punctuation">,</span> onload<span class="token punctuation">)</span><span class="token punctuation">;</span></code>` + "";

	let t68;
	let pre2;

	let raw2_value = `
<code class="language-css"><span class="token comment">/* filename: content.css */</span>
<span class="token selector"><span class="token class">.ssh-pet</span></span> <span class="token punctuation">&#123;</span>
  <span class="token property">height</span><span class="token punctuation">:</span> <span class="token number">30</span><span class="token unit">px</span><span class="token punctuation">;</span>
  <span class="token property">width</span><span class="token punctuation">:</span> <span class="token number">30</span><span class="token unit">px</span><span class="token punctuation">;</span>
  <span class="token property">position</span><span class="token punctuation">:</span> fixed<span class="token punctuation">;</span>
  <span class="token property">z-index</span><span class="token punctuation">:</span> <span class="token number">1000</span><span class="token punctuation">;</span>
  <span class="token property">background-image</span><span class="token punctuation">:</span> <span class="token url"><span class="token function">url</span><span class="token punctuation">(</span>'/images/rest.png'<span class="token punctuation">)</span></span><span class="token punctuation">;</span>
  <span class="token property">background-size</span><span class="token punctuation">:</span> <span class="token number">30</span><span class="token unit">px</span> <span class="token number">30</span><span class="token unit">px</span><span class="token punctuation">;</span>
  <span class="token property">background-position</span><span class="token punctuation">:</span> <span class="token number">0</span> <span class="token number">0</span><span class="token punctuation">;</span>
<span class="token punctuation">&#125;</span></code>` + "";

	let t69;
	let p11;
	let t70;
	let code2;
	let t71;
	let t72;
	let t73;
	let section8;
	let h43;
	let a32;
	let t74;
	let code3;
	let t75;
	let t76;
	let code4;
	let t77;
	let t78;
	let pre3;

	let raw3_value = `
<code class="language-json"><span class="token punctuation">&#123;</span>
  <span class="token comment">// ...</span>
  <span class="token property">"web_accessible_resources"</span><span class="token operator">:</span> <span class="token punctuation">[</span><span class="token string">"images/*"</span><span class="token punctuation">]</span>
<span class="token punctuation">&#125;</span></code>` + "";

	let t79;
	let section9;
	let h44;
	let a33;
	let t80;
	let code5;
	let t81;
	let t82;
	let t83;
	let pre4;

	let raw4_value = `
<code class="language-css"><span class="token selector"><span class="token class">.ssh-pet</span></span> <span class="token punctuation">&#123;</span>
  <span class="token comment">/* ... */</span>
  <span class="token property">background-image</span><span class="token punctuation">:</span> <span class="token function">url</span><span class="token punctuation">(</span><span class="token string">'chrome-extension://__MSG_@@extension_id__/images/rest.png'</span><span class="token punctuation">)</span><span class="token punctuation">;</span>
<span class="token punctuation">&#125;</span></code>` + "";

	let t84;
	let section10;
	let h31;
	let a34;
	let t85;
	let t86;
	let p12;
	let t87;
	let t88;
	let p13;
	let t89;
	let strong0;
	let t90;
	let t91;
	let t92;
	let p14;
	let em0;
	let t93;
	let t94;
	let p15;
	let t95;
	let a35;
	let t96;
	let t97;
	let t98;
	let p16;
	let img4;
	let img4_src_value;
	let t99;
	let pre5;

	let raw5_value = `
<code class="language-css"><span class="token atrule"><span class="token rule">@keyframes</span> ssh-pet-rest</span> <span class="token punctuation">&#123;</span>
  <span class="token selector">0%</span> <span class="token punctuation">&#123;</span>
    <span class="token property">background-position-x</span><span class="token punctuation">:</span> <span class="token number">0</span><span class="token punctuation">;</span>
  <span class="token punctuation">&#125;</span>
  <span class="token selector">100%</span> <span class="token punctuation">&#123;</span>
    <span class="token property">background-position-x</span><span class="token punctuation">:</span> <span class="token number">-90</span><span class="token unit">px</span><span class="token punctuation">;</span>
  <span class="token punctuation">&#125;</span>
<span class="token punctuation">&#125;</span>

<span class="token selector"><span class="token class">.ssh-pet.rest</span></span> <span class="token punctuation">&#123;</span>
  <span class="token property">background-image</span><span class="token punctuation">:</span> <span class="token function">url</span><span class="token punctuation">(</span><span class="token string">'chrome-extension://__MSG_@@extension_id__/images/rest-sprite.png'</span><span class="token punctuation">)</span><span class="token punctuation">;</span>
  <span class="token property">background-repeat</span><span class="token punctuation">:</span> repeat-x<span class="token punctuation">;</span>
  <span class="token property">background-size</span><span class="token punctuation">:</span> <span class="token number">90</span><span class="token unit">px</span> <span class="token number">30</span><span class="token unit">px</span><span class="token punctuation">;</span>
  <span class="token property">background-position</span><span class="token punctuation">:</span> <span class="token number">0</span> <span class="token number">0</span><span class="token punctuation">;</span>
  <span class="token property">animation</span><span class="token punctuation">:</span> ssh-pet-rest <span class="token number">0.2</span><span class="token unit">s</span> <span class="token function">steps</span><span class="token punctuation">(</span><span class="token number">3</span><span class="token punctuation">)</span><span class="token punctuation">;</span>
<span class="token punctuation">&#125;</span></code>` + "";

	let t100;
	let p17;
	let t101;
	let code6;
	let t102;
	let t103;
	let t104;
	let pre6;

	let raw6_value = `
<code class="language-js">pet<span class="token punctuation">.</span><span class="token property-access">classList</span><span class="token punctuation">.</span><span class="token method function property-access">add</span><span class="token punctuation">(</span><span class="token string">'rest'</span><span class="token punctuation">)</span><span class="token punctuation">;</span>
<span class="token comment">// when the animation finished, remove the class</span>
<span class="token keyword">const</span> <span class="token function-variable function">onanimationend</span> <span class="token operator">=</span> <span class="token punctuation">(</span><span class="token punctuation">)</span> <span class="token arrow operator">=></span> <span class="token punctuation">&#123;</span>
  pet<span class="token punctuation">.</span><span class="token method function property-access">removeEventListener</span><span class="token punctuation">(</span><span class="token string">'animationend'</span><span class="token punctuation">,</span> onanimationend<span class="token punctuation">)</span><span class="token punctuation">;</span>
  pet<span class="token punctuation">.</span><span class="token property-access">classList</span><span class="token punctuation">.</span><span class="token method function property-access">remove</span><span class="token punctuation">(</span><span class="token string">'rest'</span><span class="token punctuation">)</span><span class="token punctuation">;</span>
<span class="token punctuation">&#125;</span><span class="token punctuation">;</span>
pet<span class="token punctuation">.</span><span class="token method function property-access">addEventListener</span><span class="token punctuation">(</span><span class="token string">'animationend'</span><span class="token punctuation">,</span> onanimationend<span class="token punctuation">)</span><span class="token punctuation">;</span></code>` + "";

	let t105;
	let p18;
	let t106;
	let t107;
	let pre7;

	let raw7_value = `
<code class="language-js"><span class="token keyword">async</span> <span class="token keyword">function</span> <span class="token function">doSomething</span><span class="token punctuation">(</span><span class="token parameter">random</span><span class="token punctuation">)</span> <span class="token punctuation">&#123;</span>
  <span class="token keyword">switch</span> <span class="token punctuation">(</span>random<span class="token punctuation">)</span> <span class="token punctuation">&#123;</span>
    <span class="token keyword">case</span> <span class="token number">0</span><span class="token punctuation">:</span>
    <span class="token comment">// ...</span>
    <span class="token keyword module">default</span><span class="token punctuation">:</span>
      <span class="token keyword">return</span> <span class="token function">animateRest</span><span class="token punctuation">(</span><span class="token punctuation">)</span><span class="token punctuation">;</span>
  <span class="token punctuation">&#125;</span>
<span class="token punctuation">&#125;</span>

<span class="token keyword">function</span> <span class="token function">scheduleSomething</span><span class="token punctuation">(</span><span class="token punctuation">)</span> <span class="token punctuation">&#123;</span>
  <span class="token function">setTimeout</span><span class="token punctuation">(</span><span class="token keyword">async</span> <span class="token punctuation">(</span><span class="token punctuation">)</span> <span class="token arrow operator">=></span> <span class="token punctuation">&#123;</span>
    <span class="token keyword">const</span> choices <span class="token operator">=</span> <span class="token number">10</span><span class="token punctuation">;</span>
    <span class="token comment">// cheat to do Math.floor</span>
    <span class="token keyword">const</span> random <span class="token operator">=</span> <span class="token operator">~</span><span class="token operator">~</span><span class="token punctuation">(</span><span class="token known-class-name class-name">Math</span><span class="token punctuation">.</span><span class="token method function property-access">random</span><span class="token punctuation">(</span><span class="token punctuation">)</span> <span class="token operator">*</span> choices<span class="token punctuation">)</span><span class="token punctuation">;</span>
    <span class="token keyword">await</span> <span class="token function">doSomething</span><span class="token punctuation">(</span>random<span class="token punctuation">)</span><span class="token punctuation">;</span>
    <span class="token function">scheduleSomething</span><span class="token punctuation">(</span><span class="token punctuation">)</span><span class="token punctuation">;</span>
  <span class="token punctuation">&#125;</span><span class="token punctuation">,</span> <span class="token number">800</span> <span class="token operator">+</span> <span class="token known-class-name class-name">Math</span><span class="token punctuation">.</span><span class="token method function property-access">random</span><span class="token punctuation">(</span><span class="token punctuation">)</span> <span class="token operator">*</span> <span class="token number">1000</span><span class="token punctuation">)</span><span class="token punctuation">;</span>
<span class="token punctuation">&#125;</span>

<span class="token comment">// make animation promise based</span>
<span class="token keyword">function</span> <span class="token function">animateRest</span><span class="token punctuation">(</span><span class="token punctuation">)</span> <span class="token punctuation">&#123;</span>
  <span class="token keyword">return</span> <span class="token function">animateClass</span><span class="token punctuation">(</span><span class="token string">'rest'</span><span class="token punctuation">)</span><span class="token punctuation">;</span>
<span class="token punctuation">&#125;</span>
<span class="token keyword">function</span> <span class="token function">animateClass</span><span class="token punctuation">(</span><span class="token parameter">cls</span><span class="token punctuation">)</span> <span class="token punctuation">&#123;</span>
  <span class="token keyword">return</span> <span class="token keyword">new</span> <span class="token class-name">Promise</span><span class="token punctuation">(</span><span class="token parameter">resolve</span> <span class="token arrow operator">=></span> <span class="token punctuation">&#123;</span>
    pet<span class="token punctuation">.</span><span class="token property-access">classList</span><span class="token punctuation">.</span><span class="token method function property-access">add</span><span class="token punctuation">(</span>cls<span class="token punctuation">)</span><span class="token punctuation">;</span>
    <span class="token keyword">const</span> <span class="token function-variable function">onanimationend</span> <span class="token operator">=</span> <span class="token punctuation">(</span><span class="token punctuation">)</span> <span class="token arrow operator">=></span> <span class="token punctuation">&#123;</span>
      pet<span class="token punctuation">.</span><span class="token method function property-access">removeEventListener</span><span class="token punctuation">(</span><span class="token string">'animationend'</span><span class="token punctuation">,</span> onanimationend<span class="token punctuation">)</span><span class="token punctuation">;</span>
      pet<span class="token punctuation">.</span><span class="token property-access">classList</span><span class="token punctuation">.</span><span class="token method function property-access">remove</span><span class="token punctuation">(</span>cls<span class="token punctuation">)</span><span class="token punctuation">;</span>
    <span class="token punctuation">&#125;</span><span class="token punctuation">;</span>
    pet<span class="token punctuation">.</span><span class="token method function property-access">addEventListener</span><span class="token punctuation">(</span><span class="token string">'animationend'</span><span class="token punctuation">,</span> onanimationend<span class="token punctuation">)</span><span class="token punctuation">;</span>
  <span class="token punctuation">&#125;</span><span class="token punctuation">)</span><span class="token punctuation">;</span>
<span class="token punctuation">&#125;</span></code>` + "";

	let t108;
	let p19;
	let t109;
	let code7;
	let t110;
	let t111;
	let t112;
	let section11;
	let h32;
	let a36;
	let t113;
	let t114;
	let p20;
	let t115;
	let t116;
	let p21;
	let img5;
	let img5_src_value;
	let t117;
	let p22;
	let t118;
	let code8;
	let t119;
	let t120;
	let t121;
	let pre8;

	let raw8_value = `
<code class="language-css"><span class="token atrule"><span class="token rule">@keyframes</span> ssh-pet-shift-left</span> <span class="token punctuation">&#123;</span>
  <span class="token selector">0%</span> <span class="token punctuation">&#123;</span>
    <span class="token property">background-position-x</span><span class="token punctuation">:</span> <span class="token number">0</span><span class="token punctuation">;</span>
    <span class="token comment">/* highlight-next-line */</span>
    <span class="token property">transform</span><span class="token punctuation">:</span> <span class="token function">translateX</span><span class="token punctuation">(</span><span class="token number">0</span><span class="token punctuation">)</span><span class="token punctuation">;</span>
  <span class="token punctuation">&#125;</span>
  <span class="token selector">100%</span> <span class="token punctuation">&#123;</span>
    <span class="token property">background-position-x</span><span class="token punctuation">:</span> <span class="token number">-240</span><span class="token unit">px</span><span class="token punctuation">;</span>
    <span class="token comment">/* highlight-next-line */</span>
    <span class="token property">transform</span><span class="token punctuation">:</span> <span class="token function">translateX</span><span class="token punctuation">(</span><span class="token number">-30</span><span class="token unit">px</span><span class="token punctuation">)</span><span class="token punctuation">;</span>
  <span class="token punctuation">&#125;</span>
<span class="token punctuation">&#125;</span>

<span class="token selector"><span class="token class">.ssh-pet.shift-left</span></span> <span class="token punctuation">&#123;</span>
  <span class="token property">background-image</span><span class="token punctuation">:</span> <span class="token url"><span class="token function">url</span><span class="token punctuation">(</span>'/images/shift-left-sprite.png'<span class="token punctuation">)</span></span><span class="token punctuation">;</span>
  <span class="token property">background-repeat</span><span class="token punctuation">:</span> repeat-x<span class="token punctuation">;</span>
  <span class="token property">background-size</span><span class="token punctuation">:</span> <span class="token number">240</span><span class="token unit">px</span> <span class="token number">30</span><span class="token unit">px</span><span class="token punctuation">;</span>
  <span class="token property">background-position</span><span class="token punctuation">:</span> <span class="token number">0</span> <span class="token number">0</span><span class="token punctuation">;</span>
  <span class="token property">animation</span><span class="token punctuation">:</span> ssh-pet-shift-left <span class="token number">0.8</span><span class="token unit">s</span> <span class="token function">steps</span><span class="token punctuation">(</span><span class="token number">8</span><span class="token punctuation">)</span><span class="token punctuation">;</span>
<span class="token punctuation">&#125;</span></code>` + "";

	let t122;
	let p23;
	let t123;
	let t124;
	let pre9;

	let raw9_value = `
<code class="language-js"><span class="token keyword">const</span> position <span class="token operator">=</span> <span class="token punctuation">&#123;</span> x<span class="token punctuation">:</span> <span class="token number">0</span><span class="token punctuation">,</span> y<span class="token punctuation">;</span> <span class="token number">0</span> <span class="token punctuation">&#125;</span><span class="token punctuation">;</span>

<span class="token keyword">function</span> <span class="token function">offsetPosition</span><span class="token punctuation">(</span><span class="token parameter">x<span class="token punctuation">,</span> y</span><span class="token punctuation">)</span> <span class="token punctuation">&#123;</span>
  <span class="token function">updatePosition</span><span class="token punctuation">(</span>position<span class="token punctuation">.</span><span class="token property-access">x</span> <span class="token operator">+</span> x<span class="token punctuation">,</span> position<span class="token punctuation">.</span><span class="token property-access">y</span> <span class="token operator">+</span> y<span class="token punctuation">)</span><span class="token punctuation">;</span>
<span class="token punctuation">&#125;</span>
<span class="token keyword">function</span> <span class="token function">updatePosition</span><span class="token punctuation">(</span><span class="token parameter">x<span class="token punctuation">,</span> y</span><span class="token punctuation">)</span> <span class="token punctuation">&#123;</span>
  pet<span class="token punctuation">.</span><span class="token property-access">style</span><span class="token punctuation">.</span><span class="token property-access">left</span> <span class="token operator">=</span> <span class="token punctuation">(</span>position<span class="token punctuation">.</span><span class="token property-access">x</span> <span class="token operator">=</span> x<span class="token punctuation">)</span> <span class="token operator">+</span> <span class="token string">'px'</span><span class="token punctuation">;</span>
  pet<span class="token punctuation">.</span><span class="token property-access">style</span><span class="token punctuation">.</span><span class="token property-access">top</span> <span class="token operator">=</span> <span class="token punctuation">(</span>position<span class="token punctuation">.</span><span class="token property-access">y</span> <span class="token operator">=</span> y<span class="token punctuation">)</span> <span class="token operator">+</span> <span class="token string">'px'</span><span class="token punctuation">;</span>
<span class="token punctuation">&#125;</span></code>` + "";

	let t125;
	let p24;
	let t126;
	let t127;
	let pre10;

	let raw10_value = `
<code class="language-js"><span class="token keyword">async</span> <span class="token keyword">function</span> <span class="token function">animateShiftLeft</span><span class="token punctuation">(</span><span class="token punctuation">)</span> <span class="token punctuation">&#123;</span>
  <span class="token keyword">await</span> <span class="token function">animateClass</span><span class="token punctuation">(</span><span class="token template-string"><span class="token template-punctuation string">&#96;</span><span class="token string">shift-left</span><span class="token template-punctuation string">&#96;</span></span><span class="token punctuation">)</span><span class="token punctuation">;</span>
  <span class="token function">offsetPosition</span><span class="token punctuation">(</span><span class="token operator">-</span><span class="token number">30</span><span class="token punctuation">,</span> <span class="token number">0</span><span class="token punctuation">)</span><span class="token punctuation">;</span>
<span class="token punctuation">&#125;</span></code>` + "";

	let t128;
	let p25;
	let t129;
	let code9;
	let t130;
	let t131;
	let code10;
	let t132;
	let t133;
	let code11;
	let t134;
	let t135;
	let code12;
	let t136;
	let t137;
	let t138;
	let p26;
	let t139;
	let code13;
	let t140;
	let t141;
	let t142;
	let pre11;

	let raw11_value = `
<code class="language-js">pet<span class="token punctuation">.</span><span class="token method function property-access">addEventListener</span><span class="token punctuation">(</span><span class="token string">'mousemove'</span><span class="token punctuation">,</span> <span class="token keyword">async</span> <span class="token parameter">event</span> <span class="token arrow operator">=></span> <span class="token punctuation">&#123;</span>
  <span class="token keyword">if</span> <span class="token punctuation">(</span><span class="token operator">!</span>animating<span class="token punctuation">)</span> <span class="token punctuation">&#123;</span>
    animating <span class="token operator">=</span> <span class="token boolean">true</span><span class="token punctuation">;</span>
    <span class="token keyword">await</span> <span class="token function">shiftAway</span><span class="token punctuation">(</span><span class="token punctuation">)</span><span class="token punctuation">;</span>
    animating <span class="token operator">=</span> <span class="token boolean">false</span><span class="token punctuation">;</span>
  <span class="token punctuation">&#125;</span>
<span class="token punctuation">&#125;</span><span class="token punctuation">)</span><span class="token punctuation">;</span>

<span class="token comment">// edge avoidance shifting</span>
<span class="token keyword">async</span> <span class="token keyword">function</span> <span class="token function">shiftAway</span><span class="token punctuation">(</span><span class="token punctuation">)</span> <span class="token punctuation">&#123;</span>
  <span class="token keyword">if</span> <span class="token punctuation">(</span>position<span class="token punctuation">.</span><span class="token property-access">x</span> <span class="token operator">&lt;</span> <span class="token number">40</span><span class="token punctuation">)</span> <span class="token punctuation">&#123;</span>
    <span class="token keyword">await</span> <span class="token function">animateShiftRight</span><span class="token punctuation">(</span><span class="token boolean">true</span><span class="token punctuation">)</span><span class="token punctuation">;</span>
  <span class="token punctuation">&#125;</span> <span class="token keyword">else</span> <span class="token keyword">if</span> <span class="token punctuation">(</span>position<span class="token punctuation">.</span><span class="token property-access">x</span> <span class="token operator">></span> <span class="token dom variable">window</span><span class="token punctuation">.</span><span class="token property-access">innerWidth</span> <span class="token operator">-</span> <span class="token number">40</span><span class="token punctuation">)</span> <span class="token punctuation">&#123;</span>
    <span class="token keyword">await</span> <span class="token function">animateShiftLeft</span><span class="token punctuation">(</span><span class="token boolean">true</span><span class="token punctuation">)</span><span class="token punctuation">;</span>
  <span class="token punctuation">&#125;</span> <span class="token keyword">else</span> <span class="token keyword">if</span> <span class="token punctuation">(</span><span class="token known-class-name class-name">Math</span><span class="token punctuation">.</span><span class="token method function property-access">random</span><span class="token punctuation">(</span><span class="token punctuation">)</span> <span class="token operator">></span> <span class="token number">0.5</span><span class="token punctuation">)</span> <span class="token punctuation">&#123;</span>
    <span class="token keyword">await</span> <span class="token function">animateShiftLeft</span><span class="token punctuation">(</span><span class="token boolean">true</span><span class="token punctuation">)</span><span class="token punctuation">;</span>
  <span class="token punctuation">&#125;</span> <span class="token keyword">else</span> <span class="token punctuation">&#123;</span>
    <span class="token keyword">await</span> <span class="token function">animateShiftRight</span><span class="token punctuation">(</span><span class="token boolean">true</span><span class="token punctuation">)</span><span class="token punctuation">;</span>
  <span class="token punctuation">&#125;</span>
<span class="token punctuation">&#125;</span></code>` + "";

	let t143;
	let p27;
	let t144;
	let code14;
	let t145;
	let t146;
	let t147;
	let p28;
	let t148;
	let t149;
	let section12;
	let h33;
	let a37;
	let t150;
	let t151;
	let p29;
	let t152;
	let code15;
	let t153;
	let t154;
	let code16;
	let t155;
	let t156;
	let t157;
	let pre12;

	let raw12_value = `
<code class="language-js"><span class="token dom variable">document</span><span class="token punctuation">.</span><span class="token property-access">body</span><span class="token punctuation">.</span><span class="token method function property-access">addEventListener</span><span class="token punctuation">(</span><span class="token string">'input'</span><span class="token punctuation">,</span> <span class="token keyword">async</span> <span class="token parameter">event</span> <span class="token arrow operator">=></span> <span class="token punctuation">&#123;</span>
  <span class="token function">debounceByElement</span><span class="token punctuation">(</span>event<span class="token punctuation">.</span><span class="token property-access">target</span><span class="token punctuation">,</span> eatInputValue<span class="token punctuation">,</span> <span class="token number">1000</span><span class="token punctuation">)</span><span class="token punctuation">;</span>
<span class="token punctuation">&#125;</span><span class="token punctuation">)</span><span class="token punctuation">;</span></code>` + "";

	let t158;
	let p30;
	let t159;
	let code17;
	let t160;
	let t161;
	let code18;
	let t162;
	let t163;
	let t164;
	let p31;
	let t165;
	let t166;
	let pre13;

	let raw13_value = `
<code class="language-js"><span class="token keyword">function</span> <span class="token function">eatInputValue</span><span class="token punctuation">(</span><span class="token parameter">elem</span><span class="token punctuation">)</span> <span class="token punctuation">&#123;</span>
  elem<span class="token punctuation">.</span><span class="token property-access">value</span> <span class="token operator">=</span> elem<span class="token punctuation">.</span><span class="token property-access">value</span><span class="token punctuation">.</span><span class="token method function property-access">slice</span><span class="token punctuation">(</span><span class="token number">1</span><span class="token punctuation">)</span><span class="token punctuation">;</span>

  <span class="token function">debounceByElement</span><span class="token punctuation">(</span>event<span class="token punctuation">.</span><span class="token property-access">target</span><span class="token punctuation">,</span> eatInputValue<span class="token punctuation">,</span> <span class="token number">1000</span><span class="token punctuation">)</span><span class="token punctuation">;</span>
<span class="token punctuation">&#125;</span></code>` + "";

	let t167;
	let p32;
	let t168;
	let t169;
	let pre14;

	let raw14_value = `
<code class="language-js"><span class="token keyword">function</span> <span class="token function">eatInputValue</span><span class="token punctuation">(</span><span class="token parameter">elem</span><span class="token punctuation">)</span> <span class="token punctuation">&#123;</span>
  <span class="token comment">// highlight-start</span>
  <span class="token comment">// remember selection position</span>
  <span class="token keyword">const</span> start <span class="token operator">=</span> elem<span class="token punctuation">.</span><span class="token property-access">selectionStart</span><span class="token punctuation">,</span>
    end <span class="token operator">=</span> elem<span class="token punctuation">.</span><span class="token property-access">selectionEnd</span><span class="token punctuation">;</span>
  <span class="token comment">// highlight-end</span>
  elem<span class="token punctuation">.</span><span class="token property-access">value</span> <span class="token operator">=</span> elem<span class="token punctuation">.</span><span class="token property-access">value</span><span class="token punctuation">.</span><span class="token method function property-access">slice</span><span class="token punctuation">(</span><span class="token number">1</span><span class="token punctuation">)</span><span class="token punctuation">;</span>
  <span class="token comment">// highlight-start</span>
  <span class="token comment">// restore selection position</span>
  elem<span class="token punctuation">.</span><span class="token method function property-access">setSelectionRange</span><span class="token punctuation">(</span><span class="token known-class-name class-name">Math</span><span class="token punctuation">.</span><span class="token method function property-access">max</span><span class="token punctuation">(</span>start <span class="token operator">-</span> <span class="token number">1</span><span class="token punctuation">,</span> <span class="token number">0</span><span class="token punctuation">)</span><span class="token punctuation">,</span> <span class="token known-class-name class-name">Math</span><span class="token punctuation">.</span><span class="token method function property-access">max</span><span class="token punctuation">(</span>end <span class="token operator">-</span> <span class="token number">1</span><span class="token punctuation">,</span> <span class="token number">0</span><span class="token punctuation">)</span><span class="token punctuation">)</span><span class="token punctuation">;</span>
  <span class="token comment">// highlight-end</span>

  <span class="token function">debounceByElement</span><span class="token punctuation">(</span>event<span class="token punctuation">.</span><span class="token property-access">target</span><span class="token punctuation">,</span> eatInputValue<span class="token punctuation">,</span> <span class="token number">1000</span><span class="token punctuation">)</span><span class="token punctuation">;</span>
<span class="token punctuation">&#125;</span></code>` + "";

	let t170;
	let p33;
	let t171;
	let t172;
	let p34;
	let img6;
	let img6_src_value;
	let t173;
	let p35;
	let t174;
	let strong1;
	let t175;
	let t176;
	let strong2;
	let t177;
	let t178;
	let em1;
	let t179;
	let t180;
	let t181;
	let pre15;

	let raw15_value = `
<code class="language-js"><span class="token keyword">function</span> <span class="token function">eatInputValue</span><span class="token punctuation">(</span><span class="token parameter">elem</span><span class="token punctuation">)</span> <span class="token punctuation">&#123;</span>
  <span class="token comment">// highlight-next-line</span>
  <span class="token keyword">await</span> <span class="token function">animateClass</span><span class="token punctuation">(</span><span class="token string">'eat'</span><span class="token punctuation">)</span><span class="token punctuation">;</span>

  <span class="token keyword">const</span> start <span class="token operator">=</span> elem<span class="token punctuation">.</span><span class="token property-access">selectionStart</span><span class="token punctuation">,</span>
    end <span class="token operator">=</span> elem<span class="token punctuation">.</span><span class="token property-access">selectionEnd</span><span class="token punctuation">;</span>
  elem<span class="token punctuation">.</span><span class="token property-access">value</span> <span class="token operator">=</span> elem<span class="token punctuation">.</span><span class="token property-access">value</span><span class="token punctuation">.</span><span class="token method function property-access">slice</span><span class="token punctuation">(</span><span class="token number">1</span><span class="token punctuation">)</span><span class="token punctuation">;</span>
  elem<span class="token punctuation">.</span><span class="token method function property-access">setSelectionRange</span><span class="token punctuation">(</span><span class="token known-class-name class-name">Math</span><span class="token punctuation">.</span><span class="token method function property-access">max</span><span class="token punctuation">(</span>start <span class="token operator">-</span> <span class="token number">1</span><span class="token punctuation">,</span> <span class="token number">0</span><span class="token punctuation">)</span><span class="token punctuation">,</span> <span class="token known-class-name class-name">Math</span><span class="token punctuation">.</span><span class="token method function property-access">max</span><span class="token punctuation">(</span>end <span class="token operator">-</span> <span class="token number">1</span><span class="token punctuation">,</span> <span class="token number">0</span><span class="token punctuation">)</span><span class="token punctuation">)</span><span class="token punctuation">;</span>
  <span class="token comment">// highlight-next-line</span>
  <span class="token keyword">await</span> <span class="token function">animateClass</span><span class="token punctuation">(</span><span class="token string">'digest'</span><span class="token punctuation">)</span><span class="token punctuation">;</span>

  <span class="token function">debounceByElement</span><span class="token punctuation">(</span>event<span class="token punctuation">.</span><span class="token property-access">target</span><span class="token punctuation">,</span> eatInputValue<span class="token punctuation">,</span> <span class="token number">1000</span><span class="token punctuation">)</span><span class="token punctuation">;</span>
<span class="token punctuation">&#125;</span></code>` + "";

	let t182;
	let p36;
	let t183;
	let t184;
	let pre16;

	let raw16_value = `
<code class="language-css"><span class="token atrule"><span class="token rule">@keyframes</span> ssh-pet-eat-move</span> <span class="token punctuation">&#123;</span>
  <span class="token selector">0%,
  30%</span> <span class="token punctuation">&#123;</span>
    <span class="token property">transform</span><span class="token punctuation">:</span> <span class="token function">translateX</span><span class="token punctuation">(</span><span class="token number">0</span><span class="token punctuation">)</span><span class="token punctuation">;</span>
  <span class="token punctuation">&#125;</span>
  <span class="token selector">50%</span> <span class="token punctuation">&#123;</span>
    <span class="token property">transform</span><span class="token punctuation">:</span> <span class="token function">translateX</span><span class="token punctuation">(</span><span class="token number">4</span><span class="token unit">px</span><span class="token punctuation">)</span><span class="token punctuation">;</span>
  <span class="token punctuation">&#125;</span>
  <span class="token selector">100%</span> <span class="token punctuation">&#123;</span>
    <span class="token property">transform</span><span class="token punctuation">:</span> <span class="token function">translateX</span><span class="token punctuation">(</span><span class="token number">0</span><span class="token punctuation">)</span><span class="token punctuation">;</span>
  <span class="token punctuation">&#125;</span>
<span class="token punctuation">&#125;</span></code>` + "";

	let t185;
	let p37;
	let t186;
	let t187;
	let p38;
	let t188;
	let t189;
	let p39;
	let t190;
	let strong3;
	let t191;
	let t192;
	let t193;
	let pre17;

	let raw17_value = `
<code class="language-js"><span class="token keyword">async</span> <span class="token keyword">function</span> <span class="token function">animateTeleport</span><span class="token punctuation">(</span><span class="token parameter">x<span class="token punctuation">,</span> y</span><span class="token punctuation">)</span> <span class="token punctuation">&#123;</span>
  <span class="token keyword">await</span> <span class="token function">animateClass</span><span class="token punctuation">(</span><span class="token string">'disappear'</span><span class="token punctuation">)</span><span class="token punctuation">;</span>
  pet<span class="token punctuation">.</span><span class="token property-access">style</span><span class="token punctuation">.</span><span class="token property-access">opacity</span> <span class="token operator">=</span> <span class="token number">0</span><span class="token punctuation">;</span>
  <span class="token function">updatePosition</span><span class="token punctuation">(</span>x<span class="token punctuation">,</span> y<span class="token punctuation">)</span><span class="token punctuation">;</span>
  pet<span class="token punctuation">.</span><span class="token property-access">style</span><span class="token punctuation">.</span><span class="token property-access">opacity</span> <span class="token operator">=</span> <span class="token number">100</span><span class="token punctuation">;</span>
  <span class="token keyword">await</span> <span class="token function">animateClass</span><span class="token punctuation">(</span><span class="token string">'reappear'</span><span class="token punctuation">)</span><span class="token punctuation">;</span>
<span class="token punctuation">&#125;</span></code>` + "";

	let t194;
	let p40;
	let t195;
	let a38;
	let t196;
	let t197;
	let t198;
	let pre18;

	let raw18_value = `
<code class="language-js"><span class="token keyword">function</span> <span class="token function">leftSideOf</span><span class="token punctuation">(</span><span class="token parameter">elem</span><span class="token punctuation">)</span> <span class="token punctuation">&#123;</span>
  <span class="token keyword">const</span> <span class="token punctuation">&#123;</span> x<span class="token punctuation">,</span> y<span class="token punctuation">,</span> height <span class="token punctuation">&#125;</span> <span class="token operator">=</span> elem<span class="token punctuation">.</span><span class="token method function property-access">getBoundingClientRect</span><span class="token punctuation">(</span><span class="token punctuation">)</span><span class="token punctuation">;</span>
  <span class="token keyword">const</span> to_x <span class="token operator">=</span> x <span class="token operator">-</span> pet<span class="token punctuation">.</span><span class="token property-access">size</span><span class="token punctuation">.</span><span class="token property-access">width</span> <span class="token operator">+</span> <span class="token function">paddingLeft</span><span class="token punctuation">(</span>elem<span class="token punctuation">)</span><span class="token punctuation">;</span>
  <span class="token keyword">const</span> to_y <span class="token operator">=</span> y <span class="token operator">+</span> height <span class="token operator">/</span> <span class="token number">2</span> <span class="token operator">-</span> pet<span class="token punctuation">.</span><span class="token property-access">size</span><span class="token punctuation">.</span><span class="token property-access">height</span> <span class="token operator">/</span> <span class="token number">2</span><span class="token punctuation">;</span>
  <span class="token keyword">return</span> <span class="token punctuation">[</span>to_x<span class="token punctuation">,</span> to_y<span class="token punctuation">]</span><span class="token punctuation">;</span>
<span class="token punctuation">&#125;</span>

<span class="token keyword">function</span> <span class="token function">paddingLeft</span><span class="token punctuation">(</span><span class="token parameter">elem</span><span class="token punctuation">)</span> <span class="token punctuation">&#123;</span>
  <span class="token keyword">return</span> <span class="token punctuation">(</span>
    <span class="token known-class-name class-name">Number</span><span class="token punctuation">(</span>
      <span class="token dom variable">window</span>
        <span class="token punctuation">.</span><span class="token method function property-access">getComputedStyle</span><span class="token punctuation">(</span>elem<span class="token punctuation">)</span>
        <span class="token punctuation">.</span><span class="token method function property-access">getPropertyValue</span><span class="token punctuation">(</span><span class="token string">'padding-left'</span><span class="token punctuation">)</span>
        <span class="token punctuation">.</span><span class="token method function property-access">replace</span><span class="token punctuation">(</span><span class="token regex">/px|r?em/</span><span class="token punctuation">,</span> <span class="token string">''</span><span class="token punctuation">)</span>
    <span class="token punctuation">)</span> <span class="token operator">||</span> <span class="token number">0</span>
  <span class="token punctuation">)</span><span class="token punctuation">;</span>
<span class="token punctuation">&#125;</span></code>` + "";

	let t199;
	let p41;
	let t200;
	let t201;
	let section13;
	let h34;
	let a39;
	let t202;
	let t203;
	let p42;
	let t204;
	let t205;
	let p43;
	let img7;
	let img7_src_value;
	let t206;
	let p44;
	let t207;
	let a40;
	let t208;
	let t209;
	let t210;
	let pre19;

	let raw19_value = `
<code class="language-js"><span class="token keyword">const</span> buttons <span class="token operator">=</span> <span class="token dom variable">document</span><span class="token punctuation">.</span><span class="token method function property-access">querySelectorAll</span><span class="token punctuation">(</span><span class="token string">'button, input[type="submit"], [role="button"]'</span><span class="token punctuation">)</span><span class="token punctuation">;</span>
buttons<span class="token punctuation">.</span><span class="token method function property-access">forEach</span><span class="token punctuation">(</span><span class="token parameter">button</span> <span class="token arrow operator">=></span>
  button<span class="token punctuation">.</span><span class="token method function property-access">addEventListener</span><span class="token punctuation">(</span><span class="token string">'mousemove'</span><span class="token punctuation">,</span> mouseMove<span class="token punctuation">)</span>
<span class="token punctuation">)</span><span class="token punctuation">;</span></code>` + "";

	let t211;
	let p45;
	let t212;
	let t213;
	let pre20;

	let raw20_value = `
<code class="language-js"><span class="token keyword">async</span> <span class="token keyword">function</span> <span class="token function">removeTheElement</span><span class="token punctuation">(</span><span class="token parameter">elem</span><span class="token punctuation">)</span> <span class="token punctuation">&#123;</span>
  <span class="token keyword">if</span> <span class="token punctuation">(</span>animating<span class="token punctuation">)</span> <span class="token punctuation">&#123;</span>
    <span class="token keyword">return</span><span class="token punctuation">;</span>
  <span class="token punctuation">&#125;</span>

  animating <span class="token operator">=</span> <span class="token boolean">true</span><span class="token punctuation">;</span>
  pet<span class="token punctuation">.</span><span class="token property-access">classList</span><span class="token punctuation">.</span><span class="token method function property-access">add</span><span class="token punctuation">(</span><span class="token string">'hate'</span><span class="token punctuation">)</span><span class="token punctuation">;</span>
  <span class="token keyword">await</span> <span class="token function">timeout</span><span class="token punctuation">(</span><span class="token number">400</span><span class="token punctuation">)</span><span class="token punctuation">;</span>

  elem<span class="token punctuation">.</span><span class="token method function property-access">removeEventListener</span><span class="token punctuation">(</span><span class="token string">'mousemove'</span><span class="token punctuation">,</span> mouseMove<span class="token punctuation">)</span><span class="token punctuation">;</span>

  <span class="token keyword">await</span> <span class="token function">animateClass</span><span class="token punctuation">(</span><span class="token string">'item-disappearing'</span><span class="token punctuation">,</span> elem<span class="token punctuation">)</span><span class="token punctuation">;</span>
  elem<span class="token punctuation">.</span><span class="token property-access">style</span><span class="token punctuation">.</span><span class="token property-access">visibility</span> <span class="token operator">=</span> <span class="token string">'hidden'</span><span class="token punctuation">;</span>
  pet<span class="token punctuation">.</span><span class="token property-access">classList</span><span class="token punctuation">.</span><span class="token method function property-access">remove</span><span class="token punctuation">(</span><span class="token string">'hate'</span><span class="token punctuation">)</span><span class="token punctuation">;</span>
  animating <span class="token operator">=</span> <span class="token boolean">false</span><span class="token punctuation">;</span>
<span class="token punctuation">&#125;</span></code>` + "";

	let t214;
	let p46;
	let t215;
	let code19;
	let t216;
	let t217;
	let code20;
	let t218;
	let t219;
	let t220;
	let p47;
	let t221;
	let t222;
	let pre21;

	let raw21_value = `
<code class="language-css"><span class="token atrule"><span class="token rule">@keyframes</span> hating</span> <span class="token punctuation">&#123;</span>
  <span class="token selector">0%</span> <span class="token punctuation">&#123;</span>
    <span class="token property">transform</span><span class="token punctuation">:</span> <span class="token function">scale</span><span class="token punctuation">(</span><span class="token number">1.1</span><span class="token punctuation">)</span> <span class="token function">translateX</span><span class="token punctuation">(</span><span class="token number">-2</span><span class="token unit">px</span><span class="token punctuation">)</span>
  <span class="token punctuation">&#125;</span>
  <span class="token selector">50%</span> <span class="token punctuation">&#123;</span>
    <span class="token property">transform</span><span class="token punctuation">:</span> <span class="token function">scale</span><span class="token punctuation">(</span><span class="token number">1.1</span><span class="token punctuation">)</span> <span class="token function">translateX</span><span class="token punctuation">(</span><span class="token number">2</span><span class="token unit">px</span><span class="token punctuation">)</span>
  <span class="token punctuation">&#125;</span>
  <span class="token selector">100%</span> <span class="token punctuation">&#123;</span>
    <span class="token property">transform</span><span class="token punctuation">:</span> <span class="token function">scale</span><span class="token punctuation">(</span><span class="token number">1.1</span><span class="token punctuation">)</span> <span class="token function">translateX</span><span class="token punctuation">(</span><span class="token number">-2</span><span class="token unit">px</span><span class="token punctuation">)</span>
  <span class="token punctuation">&#125;</span>
<span class="token punctuation">&#125;</span></code>` + "";

	let t223;
	let p48;
	let t224;
	let code21;
	let t225;
	let t226;
	let t227;
	let pre22;

	let raw22_value = `
<code class="language-css"><span class="token atrule"><span class="token rule">@keyframes</span> item-disappearing</span> <span class="token punctuation">&#123;</span>
  <span class="token selector">0%</span> <span class="token punctuation">&#123;</span>
    <span class="token property">filter</span><span class="token punctuation">:</span> <span class="token function">blur</span><span class="token punctuation">(</span><span class="token number">0</span><span class="token unit">px</span><span class="token punctuation">)</span><span class="token punctuation">;</span>
  <span class="token punctuation">&#125;</span>
  <span class="token selector">80%</span> <span class="token punctuation">&#123;</span>
    <span class="token property">opacity</span><span class="token punctuation">:</span> <span class="token number">1</span><span class="token punctuation">;</span>
  <span class="token punctuation">&#125;</span>
  <span class="token selector">100%</span> <span class="token punctuation">&#123;</span>
    <span class="token property">filter</span><span class="token punctuation">:</span> <span class="token function">blur</span><span class="token punctuation">(</span><span class="token number">8</span><span class="token unit">px</span><span class="token punctuation">)</span><span class="token punctuation">;</span>
    <span class="token property">transform</span><span class="token punctuation">:</span> <span class="token function">scale</span><span class="token punctuation">(</span><span class="token number">1.5</span><span class="token punctuation">)</span><span class="token punctuation">;</span>
    <span class="token property">opacity</span><span class="token punctuation">:</span> <span class="token number">0</span><span class="token punctuation">;</span>
  <span class="token punctuation">&#125;</span>
<span class="token punctuation">&#125;</span></code>` + "";

	let t228;
	let section14;
	let h23;
	let a41;
	let t229;
	let t230;
	let section15;
	let h35;
	let a42;
	let t231;
	let t232;
	let p49;
	let t233;
	let code22;
	let t234;
	let t235;
	let code23;
	let t236;
	let t237;
	let t238;
	let ul7;
	let li19;
	let t239;
	let t240;
	let li20;
	let t241;
	let t242;
	let section16;
	let h36;
	let a43;
	let t243;
	let t244;
	let p50;
	let t245;
	let code24;
	let t246;
	let t247;
	let t248;
	let p51;
	let img8;
	let img8_src_value;
	let t249;
	let p52;
	let t250;
	let t251;
	let pre23;

	let raw23_value = `
<code class="language-html"><span class="token tag"><span class="token tag"><span class="token punctuation">&lt;</span>html</span><span class="token punctuation">></span></span>
  <span class="token tag"><span class="token tag"><span class="token punctuation">&lt;</span>link</span> <span class="token attr-name">rel</span><span class="token attr-value"><span class="token punctuation">=</span><span class="token punctuation">"</span>stylesheet<span class="token punctuation">"</span></span> <span class="token attr-name">type</span><span class="token attr-value"><span class="token punctuation">=</span><span class="token punctuation">"</span>text/css<span class="token punctuation">"</span></span> <span class="token attr-name">href</span><span class="token attr-value"><span class="token punctuation">=</span><span class="token punctuation">"</span>content.css<span class="token punctuation">"</span></span> <span class="token punctuation">/></span></span>
  <span class="token tag"><span class="token tag"><span class="token punctuation">&lt;</span>body</span><span class="token punctuation">></span></span>
    <span class="token tag"><span class="token tag"><span class="token punctuation">&lt;</span>script</span> <span class="token attr-name">src</span><span class="token attr-value"><span class="token punctuation">=</span><span class="token punctuation">"</span>content.js<span class="token punctuation">"</span></span><span class="token punctuation">></span></span><span class="token script"></span><span class="token tag"><span class="token tag"><span class="token punctuation">&lt;/</span>script</span><span class="token punctuation">></span></span>
  <span class="token tag"><span class="token tag"><span class="token punctuation">&lt;/</span>body</span><span class="token punctuation">></span></span>
<span class="token tag"><span class="token tag"><span class="token punctuation">&lt;/</span>html</span><span class="token punctuation">></span></span></code>` + "";

	let t252;
	let section17;
	let h45;
	let a44;
	let t253;
	let t254;
	let p53;
	let t255;
	let code25;
	let t256;
	let t257;
	let t258;
	let p54;
	let t259;
	let code26;
	let t260;
	let t261;
	let t262;
	let p55;
	let t263;
	let code27;
	let t264;
	let t265;
	let code28;
	let t266;
	let t267;
	let t268;
	let p56;
	let t269;
	let a45;
	let t270;
	let t271;
	let t272;
	let pre24;

	let raw24_value = `
<code class="language-js"><span class="token keyword">const</span> fs <span class="token operator">=</span> <span class="token function">require</span><span class="token punctuation">(</span><span class="token string">'fs'</span><span class="token punctuation">)</span><span class="token punctuation">;</span>
<span class="token keyword">const</span> path <span class="token operator">=</span> <span class="token function">require</span><span class="token punctuation">(</span><span class="token string">'path'</span><span class="token punctuation">)</span><span class="token punctuation">;</span>
<span class="token keyword">const</span> postcss <span class="token operator">=</span> <span class="token function">require</span><span class="token punctuation">(</span><span class="token string">'postcss'</span><span class="token punctuation">)</span><span class="token punctuation">;</span>

<span class="token keyword">const</span> input <span class="token operator">=</span> path<span class="token punctuation">.</span><span class="token method function property-access">join</span><span class="token punctuation">(</span>__dirname<span class="token punctuation">,</span> <span class="token string">'../content.css'</span><span class="token punctuation">)</span><span class="token punctuation">;</span>
<span class="token keyword">const</span> output <span class="token operator">=</span> path<span class="token punctuation">.</span><span class="token method function property-access">join</span><span class="token punctuation">(</span>__dirname<span class="token punctuation">,</span> <span class="token string">'../content-ext.css'</span><span class="token punctuation">)</span><span class="token punctuation">;</span>

<span class="token comment">// watch when file change</span>
fs<span class="token punctuation">.</span><span class="token method function property-access">watchFile</span><span class="token punctuation">(</span>input<span class="token punctuation">,</span> <span class="token punctuation">(</span><span class="token punctuation">)</span> <span class="token arrow operator">=></span> <span class="token punctuation">&#123;</span>
  <span class="token keyword">const</span> css <span class="token operator">=</span> fs<span class="token punctuation">.</span><span class="token method function property-access">readFileSync</span><span class="token punctuation">(</span>input<span class="token punctuation">,</span> <span class="token string">'utf-8'</span><span class="token punctuation">)</span><span class="token punctuation">;</span>
  <span class="token comment">// NOTE: &#96;from: undefined&#96; to stop PostCSS complain about sourcemap</span>
  <span class="token function">postcss</span><span class="token punctuation">(</span><span class="token punctuation">[</span>replaceUrl<span class="token punctuation">]</span><span class="token punctuation">)</span><span class="token punctuation">.</span><span class="token method function property-access">process</span><span class="token punctuation">(</span>css<span class="token punctuation">,</span> <span class="token punctuation">&#123;</span> <span class="token keyword module">from</span><span class="token punctuation">:</span> <span class="token keyword nil">undefined</span> <span class="token punctuation">&#125;</span><span class="token punctuation">)</span><span class="token punctuation">.</span><span class="token method function property-access">then</span><span class="token punctuation">(</span><span class="token punctuation">(</span><span class="token parameter">result</span><span class="token punctuation">)</span> <span class="token arrow operator">=></span> <span class="token punctuation">&#123;</span>
    fs<span class="token punctuation">.</span><span class="token method function property-access">writeFileSync</span><span class="token punctuation">(</span>output<span class="token punctuation">,</span> result<span class="token punctuation">.</span><span class="token property-access">css</span><span class="token punctuation">,</span> <span class="token string">'utf-8'</span><span class="token punctuation">)</span><span class="token punctuation">;</span>
  <span class="token punctuation">&#125;</span><span class="token punctuation">)</span><span class="token punctuation">;</span>
<span class="token punctuation">&#125;</span><span class="token punctuation">)</span><span class="token punctuation">;</span>

<span class="token keyword">function</span> <span class="token function">replaceUrl</span><span class="token punctuation">(</span><span class="token parameter">root</span><span class="token punctuation">)</span> <span class="token punctuation">&#123;</span>
  root<span class="token punctuation">.</span><span class="token method function property-access">walkDecls</span><span class="token punctuation">(</span><span class="token string">'background-image'</span><span class="token punctuation">,</span> <span class="token parameter">decl</span> <span class="token arrow operator">=></span> <span class="token punctuation">&#123;</span>
    decl<span class="token punctuation">.</span><span class="token property-access">value</span> <span class="token operator">=</span> decl<span class="token punctuation">.</span><span class="token property-access">value</span><span class="token punctuation">.</span><span class="token method function property-access">replace</span><span class="token punctuation">(</span><span class="token regex">/url\('(.*)'\)/</span><span class="token punctuation">,</span> <span class="token string">"url('chrome-extension://__MSG_@@extension_id__$1')"</span><span class="token punctuation">)</span><span class="token punctuation">;</span>
  <span class="token punctuation">&#125;</span><span class="token punctuation">)</span><span class="token punctuation">;</span>
<span class="token punctuation">&#125;</span></code>` + "";

	let t273;
	let p57;
	let t274;
	let code29;
	let t275;
	let t276;
	let code30;
	let t277;
	let t278;
	let t279;
	let section18;
	let h24;
	let a46;
	let t280;
	let t281;
	let p58;
	let t282;
	let em2;
	let t283;
	let t284;
	let t285;
	let p59;
	let t286;
	let a47;
	let t287;
	let t288;
	let t289;
	let p60;
	let t290;
	let a48;
	let t291;
	let t292;
	let t293;
	let section19;
	let h25;
	let a49;
	let t294;
	let t295;
	let p61;
	let t296;
	let t297;
	let blockquote1;
	let p62;
	let t298;
	let a50;
	let t299;
	let t300;
	let a51;
	let t301;
	let t302;
	let a52;
	let t303;
	let t304;
	let p63;
	let t305;
	let t306;
	let p64;
	let t307;
	let t308;
	let ul8;
	let li21;
	let t309;
	let t310;
	let li22;
	let t311;
	let t312;
	let p65;
	let t313;
	let a53;
	let t314;
	let t315;

	return {
		c() {
			section0 = element("section");
			ul6 = element("ul");
			li0 = element("li");
			a0 = element("a");
			t0 = text("Inspiration?");
			li1 = element("li");
			a1 = element("a");
			t1 = text("What can it do?");
			ul1 = element("ul");
			ul0 = element("ul");
			li2 = element("li");
			a2 = element("a");
			t2 = text("1. It runs away from mouse cursor");
			li3 = element("li");
			a3 = element("a");
			t3 = text("2. It eats whatever you try to type into an input");
			li4 = element("li");
			a4 = element("a");
			t4 = text("3. It annihilates the buttons you hover onto");
			li5 = element("li");
			a5 = element("a");
			t5 = text("Implementation");
			ul3 = element("ul");
			li6 = element("li");
			a6 = element("a");
			t6 = text("Chrome Extension");
			ul2 = element("ul");
			li7 = element("li");
			a7 = element("a");
			t7 = text("1. Add  web_accessible_resources  into the  manifest.json");
			li8 = element("li");
			a8 = element("a");
			t8 = text("2. Prepend  chrome-extension://__MSG_@@extension_id__/  for the URL");
			li9 = element("li");
			a9 = element("a");
			t9 = text("Make it look alive");
			li10 = element("li");
			a10 = element("a");
			t10 = text("Avoid the cursor");
			li11 = element("li");
			a11 = element("a");
			t11 = text("Eating the characters");
			li12 = element("li");
			a12 = element("a");
			t12 = text("Annihilate the buttons");
			li13 = element("li");
			a13 = element("a");
			t13 = text("Difficulties");
			ul5 = element("ul");
			li14 = element("li");
			a14 = element("a");
			t14 = text("Synchronising interactions");
			li15 = element("li");
			a15 = element("a");
			t15 = text("Developing locally");
			ul4 = element("ul");
			li16 = element("li");
			a16 = element("a");
			t16 = text("PostCSS script");
			li17 = element("li");
			a17 = element("a");
			t17 = text("Demo");
			li18 = element("li");
			a18 = element("a");
			t18 = text("Summary");
			t19 = space();
			p0 = element("p");
			t20 = text("I just came back from the ");
			a19 = element("a");
			t21 = text("Super Silly Hackathon 2019");
			t22 = text(". It was my second time to participate in this Super Silly Hackathon.");
			t23 = space();
			blockquote0 = element("blockquote");
			p1 = element("p");
			t24 = text("Hello everybody we are ready for this year, are you?? ");
			a20 = element("a");
			t25 = text("pic.twitter.com/lem52qHO6Q");
			t26 = text("— Super Silly Hackathon — 14 Dec 2019 (@supersillyhack) ");
			a21 = element("a");
			t27 = text("December 14, 2019");
			t28 = space();
			p2 = element("p");
			t29 = text("This year, my silly hackathon idea is to build ");
			a22 = element("a");
			t30 = text("a little pet in the browser");
			t31 = text("!");
			t32 = space();
			p3 = element("p");
			img0 = element("img");
			t33 = space();
			section1 = element("section");
			h20 = element("h2");
			a23 = element("a");
			t34 = text("Inspiration?");
			t35 = space();
			p4 = element("p");
			t36 = text("I saw the ");
			a24 = element("a");
			t37 = text("tamagotchi");
			t38 = text(" on touchbar a while ago, I don't have a touchbar, but I have a browser. So why not create a pet in the browser through Chrome Extension?");
			t39 = space();
			section2 = element("section");
			h21 = element("h2");
			a25 = element("a");
			t40 = text("What can it do?");
			t41 = space();
			section3 = element("section");
			h40 = element("h4");
			a26 = element("a");
			t42 = text("1. It runs away from mouse cursor");
			t43 = space();
			p5 = element("p");
			img1 = element("img");
			t44 = space();
			section4 = element("section");
			h41 = element("h4");
			a27 = element("a");
			t45 = text("2. It eats whatever you try to type into an input");
			t46 = space();
			p6 = element("p");
			img2 = element("img");
			t47 = space();
			section5 = element("section");
			h42 = element("h4");
			a28 = element("a");
			t48 = text("3. It annihilates the buttons you hover onto");
			t49 = space();
			p7 = element("p");
			img3 = element("img");
			t50 = space();
			section6 = element("section");
			h22 = element("h2");
			a29 = element("a");
			t51 = text("Implementation");
			t52 = space();
			section7 = element("section");
			h30 = element("h3");
			a30 = element("a");
			t53 = text("Chrome Extension");
			t54 = space();
			p8 = element("p");
			t55 = text("Firstly, it is a Chrome Extension. I used ");
			a31 = element("a");
			t56 = text("Content Scripts");
			t57 = text(", so that I have access to the DOM of the pages I am visiting.");
			t58 = space();
			p9 = element("p");
			t59 = text("Here is my ");
			code0 = element("code");
			t60 = text("manifest.json");
			t61 = text(" for my extension:");
			t62 = space();
			pre0 = element("pre");
			t63 = space();
			p10 = element("p");
			t64 = text("To start, I added an ");
			code1 = element("code");
			t65 = text("onload");
			t66 = text(" event, to add my pet into the browser:");
			t67 = space();
			pre1 = element("pre");
			t68 = space();
			pre2 = element("pre");
			t69 = space();
			p11 = element("p");
			t70 = text("The first problem I encountered, is that I couldn't access the ");
			code2 = element("code");
			t71 = text("/images/rest.png");
			t72 = text(". After some googling, I need to:");
			t73 = space();
			section8 = element("section");
			h43 = element("h4");
			a32 = element("a");
			t74 = text("1. Add ");
			code3 = element("code");
			t75 = text("web_accessible_resources");
			t76 = text(" into the ");
			code4 = element("code");
			t77 = text("manifest.json");
			t78 = space();
			pre3 = element("pre");
			t79 = space();
			section9 = element("section");
			h44 = element("h4");
			a33 = element("a");
			t80 = text("2. Prepend ");
			code5 = element("code");
			t81 = text("chrome-extension://__MSG_@@extension_id__/");
			t82 = text(" for the URL");
			t83 = space();
			pre4 = element("pre");
			t84 = space();
			section10 = element("section");
			h31 = element("h3");
			a34 = element("a");
			t85 = text("Make it look alive");
			t86 = space();
			p12 = element("p");
			t87 = text("A static image will look fake.");
			t88 = space();
			p13 = element("p");
			t89 = text("As the quote says, ");
			strong0 = element("strong");
			t90 = text("\"eyes is the window to the soul\"");
			t91 = text(", to make the pet look real, we need to make the eye blink.");
			t92 = space();
			p14 = element("p");
			em0 = element("em");
			t93 = text("(That's how you judge a person is dead or alive in movies right? Dead body will just stare blankly to nowhere)");
			t94 = space();
			p15 = element("p");
			t95 = text("To make the pet blink, I found some ");
			a35 = element("a");
			t96 = text("useful tutorials");
			t97 = text(" on how to create CSS sprite sheet animations.");
			t98 = space();
			p16 = element("p");
			img4 = element("img");
			t99 = space();
			pre5 = element("pre");
			t100 = space();
			p17 = element("p");
			t101 = text("To animate it, I added the ");
			code6 = element("code");
			t102 = text("rest");
			t103 = text(" class to the pet, and removed it when it's done animating.");
			t104 = space();
			pre6 = element("pre");
			t105 = space();
			p18 = element("p");
			t106 = text("At the beginning, I thought I would add more other micro expressions to the pet, so I wrote a scheduler, to schedule expressions randomly:");
			t107 = space();
			pre7 = element("pre");
			t108 = space();
			p19 = element("p");
			t109 = text("I used ");
			code7 = element("code");
			t110 = text("await");
			t111 = text(" to wait for animation to finish, before schedule the next action again, so that it will not have 2 actions running in parallel.");
			t112 = space();
			section11 = element("section");
			h32 = element("h3");
			a36 = element("a");
			t113 = text("Avoid the cursor");
			t114 = space();
			p20 = element("p");
			t115 = text("I drew a sprite sheet that make the pet looks like it is squiggling away,");
			t116 = space();
			p21 = element("p");
			img5 = element("img");
			t117 = space();
			p22 = element("p");
			t118 = text("while at the same time set the ");
			code8 = element("code");
			t119 = text("transform: translateX()");
			t120 = text(" to actually move it:");
			t121 = space();
			pre8 = element("pre");
			t122 = space();
			p23 = element("p");
			t123 = text("In JavaScript, I tried to keep the position state inside an object:");
			t124 = space();
			pre9 = element("pre");
			t125 = space();
			p24 = element("p");
			t126 = text("So, to shift away from the cursor would be:");
			t127 = space();
			pre10 = element("pre");
			t128 = space();
			p25 = element("p");
			t129 = text("So, when the animation ends, the ");
			code9 = element("code");
			t130 = text("transform: translateX()");
			t131 = text(" will go from ");
			code10 = element("code");
			t132 = text("-30px");
			t133 = text(" back to ");
			code11 = element("code");
			t134 = text("0");
			t135 = text(", and at the same time, I moved the position of the pet ");
			code12 = element("code");
			t136 = text("-30px");
			t137 = text(" in x-axis.");
			t138 = space();
			p26 = element("p");
			t139 = text("To know when the cursor is on top of the pet, I used ");
			code13 = element("code");
			t140 = text("mousemove");
			t141 = text(" event:");
			t142 = space();
			pre11 = element("pre");
			t143 = space();
			p27 = element("p");
			t144 = text("To avoid reanimate while still animate, I added a ");
			code14 = element("code");
			t145 = text("animating");
			t146 = text(" flag, as an mutex.");
			t147 = space();
			p28 = element("p");
			t148 = text("Besides, it would be weird to see the pet shifting pass through the browser window, because that way, you would never be able to interact with it anymore 😢");
			t149 = space();
			section12 = element("section");
			h33 = element("h3");
			a37 = element("a");
			t150 = text("Eating the characters");
			t151 = space();
			p29 = element("p");
			t152 = text("To know when someone is typing into any of the input box, I attach an ");
			code15 = element("code");
			t153 = text("input");
			t154 = text(" event listener on to the ");
			code16 = element("code");
			t155 = text("document.body");
			t156 = text(":");
			t157 = space();
			pre12 = element("pre");
			t158 = space();
			p30 = element("p");
			t159 = text("There maybe multiple ");
			code17 = element("code");
			t160 = text("<input />");
			t161 = text(" on the page, so I created a debounce function for each ");
			code18 = element("code");
			t162 = text("<input />");
			t163 = text(".");
			t164 = space();
			p31 = element("p");
			t165 = text("To make the eating simple, I will always eat from the left, consuming characters from left to right:");
			t166 = space();
			pre13 = element("pre");
			t167 = space();
			p32 = element("p");
			t168 = text("However naively eating the characters this way, will screw up your cursor position / selection.\nSo I googled and pasted the code snippet to improve it:");
			t169 = space();
			pre14 = element("pre");
			t170 = space();
			p33 = element("p");
			t171 = text("After able to \"eat\" the characters, I need to animate the pet eating the characters");
			t172 = space();
			p34 = element("p");
			img6 = element("img");
			t173 = space();
			p35 = element("p");
			t174 = text("To align the eating with the removing of a character, I split the animation into 2 parts, ");
			strong1 = element("strong");
			t175 = text("the eating");
			t176 = text(" and ");
			strong2 = element("strong");
			t177 = text("the chewing");
			t178 = space();
			em1 = element("em");
			t179 = text("(I named it digesting during the hackathon)");
			t180 = text(".");
			t181 = space();
			pre15 = element("pre");
			t182 = space();
			p36 = element("p");
			t183 = text("To make it more realistic, I tried to make the pet tilt forward, while consuming the character:");
			t184 = space();
			pre16 = element("pre");
			t185 = space();
			p37 = element("p");
			t186 = text("The pixel values had been tuned to make the movement subtle, yet natural.");
			t187 = space();
			p38 = element("p");
			t188 = text("Now, how do I place my pet to the left of the input?");
			t189 = space();
			p39 = element("p");
			t190 = text("Instead of squiggle to the right position, I made the pet ");
			strong3 = element("strong");
			t191 = text("teleport");
			t192 = text("!");
			t193 = space();
			pre17 = element("pre");
			t194 = space();
			p40 = element("p");
			t195 = text("To calculate the teleport destination, I used ");
			a38 = element("a");
			t196 = text("getBoundingClientRect()");
			t197 = text(":");
			t198 = space();
			pre18 = element("pre");
			t199 = space();
			p41 = element("p");
			t200 = text("The padding of the input is important. It brings the pet closer to the character it is going to eat. 🤤");
			t201 = space();
			section13 = element("section");
			h34 = element("h3");
			a39 = element("a");
			t202 = text("Annihilate the buttons");
			t203 = space();
			p42 = element("p");
			t204 = text("Pet don't like buttons because buttons take away your concentration from your pet.");
			t205 = space();
			p43 = element("p");
			img7 = element("img");
			t206 = space();
			p44 = element("p");
			t207 = text("To get a list of buttons, I use ");
			a40 = element("a");
			t208 = text("document.querySelectorAll()");
			t209 = text(":");
			t210 = space();
			pre19 = element("pre");
			t211 = space();
			p45 = element("p");
			t212 = text("To annihilate the buttons, I animated the pet with a pair of dead red eyes, and shake it for 400 milli-seconds, before annihilating the elements into vapor:");
			t213 = space();
			pre20 = element("pre");
			t214 = space();
			p46 = element("p");
			t215 = text("I used ");
			code19 = element("code");
			t216 = text("visibility: hidden");
			t217 = text(", so that I dont disrupt the DOM structure, yet making it disappear and unclickable, unlike ");
			code20 = element("code");
			t218 = text("opacity: none");
			t219 = text(".");
			t220 = space();
			p47 = element("p");
			t221 = text("The pet with hatred is slightly bigger and agitated than the normal pet:");
			t222 = space();
			pre21 = element("pre");
			t223 = space();
			p48 = element("p");
			t224 = text("To turn the button annihilated into vapor, I used ");
			code21 = element("code");
			t225 = text("filter: blur()");
			t226 = text(":");
			t227 = space();
			pre22 = element("pre");
			t228 = space();
			section14 = element("section");
			h23 = element("h2");
			a41 = element("a");
			t229 = text("Difficulties");
			t230 = space();
			section15 = element("section");
			h35 = element("h3");
			a42 = element("a");
			t231 = text("Synchronising interactions");
			t232 = space();
			p49 = element("p");
			t233 = text("A lot edge cases has been found and fixed by using the ");
			code22 = element("code");
			t234 = text("animating");
			t235 = text(", or ");
			code23 = element("code");
			t236 = text("eating");
			t237 = text(" flag:");
			t238 = space();
			ul7 = element("ul");
			li19 = element("li");
			t239 = text("where to avoid cursor, while eating the characters");
			t240 = space();
			li20 = element("li");
			t241 = text("to annihilate or to eat?\nThere's an heuristic to choose which one to do, when both get scheduled at the same time.");
			t242 = space();
			section16 = element("section");
			h36 = element("h3");
			a43 = element("a");
			t243 = text("Developing locally");
			t244 = space();
			p50 = element("p");
			t245 = text("Everytime when the content script is updated, I need to click refresh in the ");
			code24 = element("code");
			t246 = text("chrome://extensions");
			t247 = text(" page:");
			t248 = space();
			p51 = element("p");
			img8 = element("img");
			t249 = space();
			p52 = element("p");
			t250 = text("In order to developed faster, I created a simple HTML, and test it locally.");
			t251 = space();
			pre23 = element("pre");
			t252 = space();
			section17 = element("section");
			h45 = element("h4");
			a44 = element("a");
			t253 = text("PostCSS script");
			t254 = space();
			p53 = element("p");
			t255 = text("Remember I mentioned that, for resource to be accessible from the Chrome Extension, I would have to prepend the url with ");
			code25 = element("code");
			t256 = text("chrome-extension://__MSG_@@extension_id__/");
			t257 = text("?");
			t258 = space();
			p54 = element("p");
			t259 = text("But that does not work if I developed in standalone HTML, because I can't access the assets from ");
			code26 = element("code");
			t260 = text("chrome-extension://");
			t261 = text(" protocol in my localhost.");
			t262 = space();
			p55 = element("p");
			t263 = text("I would have to write ");
			code27 = element("code");
			t264 = text("/images/rest.png");
			t265 = text(", and replaced it to ");
			code28 = element("code");
			t266 = text("chrome-extension://__MSG_@@extension_id__/images/rest.png");
			t267 = text(" when I test it on my extension.");
			t268 = space();
			p56 = element("p");
			t269 = text("So, I wrote a simple script with ");
			a45 = element("a");
			t270 = text("PostCSS");
			t271 = text(" to automatically do it:");
			t272 = space();
			pre24 = element("pre");
			t273 = space();
			p57 = element("p");
			t274 = text("I used ");
			code29 = element("code");
			t275 = text("content.css");
			t276 = text(" for my local development, and automatically built ");
			code30 = element("code");
			t277 = text("content-ext.css");
			t278 = text(" for the extension with all the URL replaced.");
			t279 = space();
			section18 = element("section");
			h24 = element("h2");
			a46 = element("a");
			t280 = text("Demo");
			t281 = space();
			p58 = element("p");
			t282 = text("I did a super quick demo, which went quite well, ");
			em2 = element("em");
			t283 = text("I think.");
			t284 = text(" 🤔");
			t285 = space();
			p59 = element("p");
			t286 = text("For those who are curious, and want to try out, you can visit ");
			a47 = element("a");
			t287 = text("here for the demo");
			t288 = text(".");
			t289 = space();
			p60 = element("p");
			t290 = text("For those who are curious about the source code, can visit ");
			a48 = element("a");
			t291 = text("the Github repo");
			t292 = text(".");
			t293 = space();
			section19 = element("section");
			h25 = element("h2");
			a49 = element("a");
			t294 = text("Summary");
			t295 = space();
			p61 = element("p");
			t296 = text("It has been a fruitful event.");
			t297 = space();
			blockquote1 = element("blockquote");
			p62 = element("p");
			t298 = text("And ");
			a50 = element("a");
			t299 = text("@lihautan");
			t300 = text(" wins a bag of tropical fruits ");
			a51 = element("a");
			t301 = text("pic.twitter.com/CtQUBGOI7h");
			t302 = text("— Yishu See (@yishusee) ");
			a52 = element("a");
			t303 = text("December 14, 2019");
			t304 = space();
			p63 = element("p");
			t305 = text("Appreciate the organisers time and effort to make the Hackathon goes as smoothly as possible.");
			t306 = space();
			p64 = element("p");
			t307 = text("I managed to do something that I never really done before:");
			t308 = space();
			ul8 = element("ul");
			li21 = element("li");
			t309 = text("CSS sprite sheet animation");
			t310 = space();
			li22 = element("li");
			t311 = text("Chrome Extension that interacts with the user and manipulates the DOM");
			t312 = space();
			p65 = element("p");
			t313 = text("Hopefully I will partcipate the ");
			a53 = element("a");
			t314 = text("Super Silly Hackathon");
			t315 = text(" again next year.");
			this.h();
		},
		l(nodes) {
			section0 = claim_element(nodes, "SECTION", {});
			var section0_nodes = children(section0);

			ul6 = claim_element(section0_nodes, "UL", {
				class: true,
				id: true,
				role: true,
				"aria-label": true
			});

			var ul6_nodes = children(ul6);
			li0 = claim_element(ul6_nodes, "LI", {});
			var li0_nodes = children(li0);
			a0 = claim_element(li0_nodes, "A", { href: true });
			var a0_nodes = children(a0);
			t0 = claim_text(a0_nodes, "Inspiration?");
			a0_nodes.forEach(detach);
			li0_nodes.forEach(detach);
			li1 = claim_element(ul6_nodes, "LI", {});
			var li1_nodes = children(li1);
			a1 = claim_element(li1_nodes, "A", { href: true });
			var a1_nodes = children(a1);
			t1 = claim_text(a1_nodes, "What can it do?");
			a1_nodes.forEach(detach);
			li1_nodes.forEach(detach);
			ul1 = claim_element(ul6_nodes, "UL", {});
			var ul1_nodes = children(ul1);
			ul0 = claim_element(ul1_nodes, "UL", {});
			var ul0_nodes = children(ul0);
			li2 = claim_element(ul0_nodes, "LI", {});
			var li2_nodes = children(li2);
			a2 = claim_element(li2_nodes, "A", { href: true });
			var a2_nodes = children(a2);
			t2 = claim_text(a2_nodes, "1. It runs away from mouse cursor");
			a2_nodes.forEach(detach);
			li2_nodes.forEach(detach);
			li3 = claim_element(ul0_nodes, "LI", {});
			var li3_nodes = children(li3);
			a3 = claim_element(li3_nodes, "A", { href: true });
			var a3_nodes = children(a3);
			t3 = claim_text(a3_nodes, "2. It eats whatever you try to type into an input");
			a3_nodes.forEach(detach);
			li3_nodes.forEach(detach);
			li4 = claim_element(ul0_nodes, "LI", {});
			var li4_nodes = children(li4);
			a4 = claim_element(li4_nodes, "A", { href: true });
			var a4_nodes = children(a4);
			t4 = claim_text(a4_nodes, "3. It annihilates the buttons you hover onto");
			a4_nodes.forEach(detach);
			li4_nodes.forEach(detach);
			ul0_nodes.forEach(detach);
			ul1_nodes.forEach(detach);
			li5 = claim_element(ul6_nodes, "LI", {});
			var li5_nodes = children(li5);
			a5 = claim_element(li5_nodes, "A", { href: true });
			var a5_nodes = children(a5);
			t5 = claim_text(a5_nodes, "Implementation");
			a5_nodes.forEach(detach);
			li5_nodes.forEach(detach);
			ul3 = claim_element(ul6_nodes, "UL", {});
			var ul3_nodes = children(ul3);
			li6 = claim_element(ul3_nodes, "LI", {});
			var li6_nodes = children(li6);
			a6 = claim_element(li6_nodes, "A", { href: true });
			var a6_nodes = children(a6);
			t6 = claim_text(a6_nodes, "Chrome Extension");
			a6_nodes.forEach(detach);
			li6_nodes.forEach(detach);
			ul2 = claim_element(ul3_nodes, "UL", {});
			var ul2_nodes = children(ul2);
			li7 = claim_element(ul2_nodes, "LI", {});
			var li7_nodes = children(li7);
			a7 = claim_element(li7_nodes, "A", { href: true });
			var a7_nodes = children(a7);
			t7 = claim_text(a7_nodes, "1. Add  web_accessible_resources  into the  manifest.json");
			a7_nodes.forEach(detach);
			li7_nodes.forEach(detach);
			li8 = claim_element(ul2_nodes, "LI", {});
			var li8_nodes = children(li8);
			a8 = claim_element(li8_nodes, "A", { href: true });
			var a8_nodes = children(a8);
			t8 = claim_text(a8_nodes, "2. Prepend  chrome-extension://__MSG_@@extension_id__/  for the URL");
			a8_nodes.forEach(detach);
			li8_nodes.forEach(detach);
			ul2_nodes.forEach(detach);
			li9 = claim_element(ul3_nodes, "LI", {});
			var li9_nodes = children(li9);
			a9 = claim_element(li9_nodes, "A", { href: true });
			var a9_nodes = children(a9);
			t9 = claim_text(a9_nodes, "Make it look alive");
			a9_nodes.forEach(detach);
			li9_nodes.forEach(detach);
			li10 = claim_element(ul3_nodes, "LI", {});
			var li10_nodes = children(li10);
			a10 = claim_element(li10_nodes, "A", { href: true });
			var a10_nodes = children(a10);
			t10 = claim_text(a10_nodes, "Avoid the cursor");
			a10_nodes.forEach(detach);
			li10_nodes.forEach(detach);
			li11 = claim_element(ul3_nodes, "LI", {});
			var li11_nodes = children(li11);
			a11 = claim_element(li11_nodes, "A", { href: true });
			var a11_nodes = children(a11);
			t11 = claim_text(a11_nodes, "Eating the characters");
			a11_nodes.forEach(detach);
			li11_nodes.forEach(detach);
			li12 = claim_element(ul3_nodes, "LI", {});
			var li12_nodes = children(li12);
			a12 = claim_element(li12_nodes, "A", { href: true });
			var a12_nodes = children(a12);
			t12 = claim_text(a12_nodes, "Annihilate the buttons");
			a12_nodes.forEach(detach);
			li12_nodes.forEach(detach);
			ul3_nodes.forEach(detach);
			li13 = claim_element(ul6_nodes, "LI", {});
			var li13_nodes = children(li13);
			a13 = claim_element(li13_nodes, "A", { href: true });
			var a13_nodes = children(a13);
			t13 = claim_text(a13_nodes, "Difficulties");
			a13_nodes.forEach(detach);
			li13_nodes.forEach(detach);
			ul5 = claim_element(ul6_nodes, "UL", {});
			var ul5_nodes = children(ul5);
			li14 = claim_element(ul5_nodes, "LI", {});
			var li14_nodes = children(li14);
			a14 = claim_element(li14_nodes, "A", { href: true });
			var a14_nodes = children(a14);
			t14 = claim_text(a14_nodes, "Synchronising interactions");
			a14_nodes.forEach(detach);
			li14_nodes.forEach(detach);
			li15 = claim_element(ul5_nodes, "LI", {});
			var li15_nodes = children(li15);
			a15 = claim_element(li15_nodes, "A", { href: true });
			var a15_nodes = children(a15);
			t15 = claim_text(a15_nodes, "Developing locally");
			a15_nodes.forEach(detach);
			li15_nodes.forEach(detach);
			ul4 = claim_element(ul5_nodes, "UL", {});
			var ul4_nodes = children(ul4);
			li16 = claim_element(ul4_nodes, "LI", {});
			var li16_nodes = children(li16);
			a16 = claim_element(li16_nodes, "A", { href: true });
			var a16_nodes = children(a16);
			t16 = claim_text(a16_nodes, "PostCSS script");
			a16_nodes.forEach(detach);
			li16_nodes.forEach(detach);
			ul4_nodes.forEach(detach);
			ul5_nodes.forEach(detach);
			li17 = claim_element(ul6_nodes, "LI", {});
			var li17_nodes = children(li17);
			a17 = claim_element(li17_nodes, "A", { href: true });
			var a17_nodes = children(a17);
			t17 = claim_text(a17_nodes, "Demo");
			a17_nodes.forEach(detach);
			li17_nodes.forEach(detach);
			li18 = claim_element(ul6_nodes, "LI", {});
			var li18_nodes = children(li18);
			a18 = claim_element(li18_nodes, "A", { href: true });
			var a18_nodes = children(a18);
			t18 = claim_text(a18_nodes, "Summary");
			a18_nodes.forEach(detach);
			li18_nodes.forEach(detach);
			ul6_nodes.forEach(detach);
			section0_nodes.forEach(detach);
			t19 = claim_space(nodes);
			p0 = claim_element(nodes, "P", {});
			var p0_nodes = children(p0);
			t20 = claim_text(p0_nodes, "I just came back from the ");
			a19 = claim_element(p0_nodes, "A", { href: true, rel: true });
			var a19_nodes = children(a19);
			t21 = claim_text(a19_nodes, "Super Silly Hackathon 2019");
			a19_nodes.forEach(detach);
			t22 = claim_text(p0_nodes, ". It was my second time to participate in this Super Silly Hackathon.");
			p0_nodes.forEach(detach);
			t23 = claim_space(nodes);
			blockquote0 = claim_element(nodes, "BLOCKQUOTE", { class: true });
			var blockquote0_nodes = children(blockquote0);
			p1 = claim_element(blockquote0_nodes, "P", { lang: true, dir: true });
			var p1_nodes = children(p1);
			t24 = claim_text(p1_nodes, "Hello everybody we are ready for this year, are you?? ");
			a20 = claim_element(p1_nodes, "A", { href: true });
			var a20_nodes = children(a20);
			t25 = claim_text(a20_nodes, "pic.twitter.com/lem52qHO6Q");
			a20_nodes.forEach(detach);
			p1_nodes.forEach(detach);
			t26 = claim_text(blockquote0_nodes, "— Super Silly Hackathon — 14 Dec 2019 (@supersillyhack) ");
			a21 = claim_element(blockquote0_nodes, "A", { href: true });
			var a21_nodes = children(a21);
			t27 = claim_text(a21_nodes, "December 14, 2019");
			a21_nodes.forEach(detach);
			blockquote0_nodes.forEach(detach);
			t28 = claim_space(nodes);
			p2 = claim_element(nodes, "P", {});
			var p2_nodes = children(p2);
			t29 = claim_text(p2_nodes, "This year, my silly hackathon idea is to build ");
			a22 = claim_element(p2_nodes, "A", { href: true, rel: true });
			var a22_nodes = children(a22);
			t30 = claim_text(a22_nodes, "a little pet in the browser");
			a22_nodes.forEach(detach);
			t31 = claim_text(p2_nodes, "!");
			p2_nodes.forEach(detach);
			t32 = claim_space(nodes);
			p3 = claim_element(nodes, "P", {});
			var p3_nodes = children(p3);
			img0 = claim_element(p3_nodes, "IMG", { src: true, alt: true });
			p3_nodes.forEach(detach);
			t33 = claim_space(nodes);
			section1 = claim_element(nodes, "SECTION", {});
			var section1_nodes = children(section1);
			h20 = claim_element(section1_nodes, "H2", {});
			var h20_nodes = children(h20);
			a23 = claim_element(h20_nodes, "A", { href: true, id: true });
			var a23_nodes = children(a23);
			t34 = claim_text(a23_nodes, "Inspiration?");
			a23_nodes.forEach(detach);
			h20_nodes.forEach(detach);
			t35 = claim_space(section1_nodes);
			p4 = claim_element(section1_nodes, "P", {});
			var p4_nodes = children(p4);
			t36 = claim_text(p4_nodes, "I saw the ");
			a24 = claim_element(p4_nodes, "A", { href: true, rel: true });
			var a24_nodes = children(a24);
			t37 = claim_text(a24_nodes, "tamagotchi");
			a24_nodes.forEach(detach);
			t38 = claim_text(p4_nodes, " on touchbar a while ago, I don't have a touchbar, but I have a browser. So why not create a pet in the browser through Chrome Extension?");
			p4_nodes.forEach(detach);
			section1_nodes.forEach(detach);
			t39 = claim_space(nodes);
			section2 = claim_element(nodes, "SECTION", {});
			var section2_nodes = children(section2);
			h21 = claim_element(section2_nodes, "H2", {});
			var h21_nodes = children(h21);
			a25 = claim_element(h21_nodes, "A", { href: true, id: true });
			var a25_nodes = children(a25);
			t40 = claim_text(a25_nodes, "What can it do?");
			a25_nodes.forEach(detach);
			h21_nodes.forEach(detach);
			section2_nodes.forEach(detach);
			t41 = claim_space(nodes);
			section3 = claim_element(nodes, "SECTION", {});
			var section3_nodes = children(section3);
			h40 = claim_element(section3_nodes, "H4", {});
			var h40_nodes = children(h40);
			a26 = claim_element(h40_nodes, "A", { href: true, id: true });
			var a26_nodes = children(a26);
			t42 = claim_text(a26_nodes, "1. It runs away from mouse cursor");
			a26_nodes.forEach(detach);
			h40_nodes.forEach(detach);
			t43 = claim_space(section3_nodes);
			p5 = claim_element(section3_nodes, "P", {});
			var p5_nodes = children(p5);
			img1 = claim_element(p5_nodes, "IMG", { src: true, alt: true });
			p5_nodes.forEach(detach);
			section3_nodes.forEach(detach);
			t44 = claim_space(nodes);
			section4 = claim_element(nodes, "SECTION", {});
			var section4_nodes = children(section4);
			h41 = claim_element(section4_nodes, "H4", {});
			var h41_nodes = children(h41);
			a27 = claim_element(h41_nodes, "A", { href: true, id: true });
			var a27_nodes = children(a27);
			t45 = claim_text(a27_nodes, "2. It eats whatever you try to type into an input");
			a27_nodes.forEach(detach);
			h41_nodes.forEach(detach);
			t46 = claim_space(section4_nodes);
			p6 = claim_element(section4_nodes, "P", {});
			var p6_nodes = children(p6);
			img2 = claim_element(p6_nodes, "IMG", { src: true, alt: true });
			p6_nodes.forEach(detach);
			section4_nodes.forEach(detach);
			t47 = claim_space(nodes);
			section5 = claim_element(nodes, "SECTION", {});
			var section5_nodes = children(section5);
			h42 = claim_element(section5_nodes, "H4", {});
			var h42_nodes = children(h42);
			a28 = claim_element(h42_nodes, "A", { href: true, id: true });
			var a28_nodes = children(a28);
			t48 = claim_text(a28_nodes, "3. It annihilates the buttons you hover onto");
			a28_nodes.forEach(detach);
			h42_nodes.forEach(detach);
			t49 = claim_space(section5_nodes);
			p7 = claim_element(section5_nodes, "P", {});
			var p7_nodes = children(p7);
			img3 = claim_element(p7_nodes, "IMG", { src: true, alt: true });
			p7_nodes.forEach(detach);
			section5_nodes.forEach(detach);
			t50 = claim_space(nodes);
			section6 = claim_element(nodes, "SECTION", {});
			var section6_nodes = children(section6);
			h22 = claim_element(section6_nodes, "H2", {});
			var h22_nodes = children(h22);
			a29 = claim_element(h22_nodes, "A", { href: true, id: true });
			var a29_nodes = children(a29);
			t51 = claim_text(a29_nodes, "Implementation");
			a29_nodes.forEach(detach);
			h22_nodes.forEach(detach);
			section6_nodes.forEach(detach);
			t52 = claim_space(nodes);
			section7 = claim_element(nodes, "SECTION", {});
			var section7_nodes = children(section7);
			h30 = claim_element(section7_nodes, "H3", {});
			var h30_nodes = children(h30);
			a30 = claim_element(h30_nodes, "A", { href: true, id: true });
			var a30_nodes = children(a30);
			t53 = claim_text(a30_nodes, "Chrome Extension");
			a30_nodes.forEach(detach);
			h30_nodes.forEach(detach);
			t54 = claim_space(section7_nodes);
			p8 = claim_element(section7_nodes, "P", {});
			var p8_nodes = children(p8);
			t55 = claim_text(p8_nodes, "Firstly, it is a Chrome Extension. I used ");
			a31 = claim_element(p8_nodes, "A", { href: true, rel: true });
			var a31_nodes = children(a31);
			t56 = claim_text(a31_nodes, "Content Scripts");
			a31_nodes.forEach(detach);
			t57 = claim_text(p8_nodes, ", so that I have access to the DOM of the pages I am visiting.");
			p8_nodes.forEach(detach);
			t58 = claim_space(section7_nodes);
			p9 = claim_element(section7_nodes, "P", {});
			var p9_nodes = children(p9);
			t59 = claim_text(p9_nodes, "Here is my ");
			code0 = claim_element(p9_nodes, "CODE", {});
			var code0_nodes = children(code0);
			t60 = claim_text(code0_nodes, "manifest.json");
			code0_nodes.forEach(detach);
			t61 = claim_text(p9_nodes, " for my extension:");
			p9_nodes.forEach(detach);
			t62 = claim_space(section7_nodes);
			pre0 = claim_element(section7_nodes, "PRE", { class: true });
			var pre0_nodes = children(pre0);
			pre0_nodes.forEach(detach);
			t63 = claim_space(section7_nodes);
			p10 = claim_element(section7_nodes, "P", {});
			var p10_nodes = children(p10);
			t64 = claim_text(p10_nodes, "To start, I added an ");
			code1 = claim_element(p10_nodes, "CODE", {});
			var code1_nodes = children(code1);
			t65 = claim_text(code1_nodes, "onload");
			code1_nodes.forEach(detach);
			t66 = claim_text(p10_nodes, " event, to add my pet into the browser:");
			p10_nodes.forEach(detach);
			t67 = claim_space(section7_nodes);
			pre1 = claim_element(section7_nodes, "PRE", { class: true });
			var pre1_nodes = children(pre1);
			pre1_nodes.forEach(detach);
			t68 = claim_space(section7_nodes);
			pre2 = claim_element(section7_nodes, "PRE", { class: true });
			var pre2_nodes = children(pre2);
			pre2_nodes.forEach(detach);
			t69 = claim_space(section7_nodes);
			p11 = claim_element(section7_nodes, "P", {});
			var p11_nodes = children(p11);
			t70 = claim_text(p11_nodes, "The first problem I encountered, is that I couldn't access the ");
			code2 = claim_element(p11_nodes, "CODE", {});
			var code2_nodes = children(code2);
			t71 = claim_text(code2_nodes, "/images/rest.png");
			code2_nodes.forEach(detach);
			t72 = claim_text(p11_nodes, ". After some googling, I need to:");
			p11_nodes.forEach(detach);
			section7_nodes.forEach(detach);
			t73 = claim_space(nodes);
			section8 = claim_element(nodes, "SECTION", {});
			var section8_nodes = children(section8);
			h43 = claim_element(section8_nodes, "H4", {});
			var h43_nodes = children(h43);
			a32 = claim_element(h43_nodes, "A", { href: true, id: true });
			var a32_nodes = children(a32);
			t74 = claim_text(a32_nodes, "1. Add ");
			code3 = claim_element(a32_nodes, "CODE", {});
			var code3_nodes = children(code3);
			t75 = claim_text(code3_nodes, "web_accessible_resources");
			code3_nodes.forEach(detach);
			t76 = claim_text(a32_nodes, " into the ");
			code4 = claim_element(a32_nodes, "CODE", {});
			var code4_nodes = children(code4);
			t77 = claim_text(code4_nodes, "manifest.json");
			code4_nodes.forEach(detach);
			a32_nodes.forEach(detach);
			h43_nodes.forEach(detach);
			t78 = claim_space(section8_nodes);
			pre3 = claim_element(section8_nodes, "PRE", { class: true });
			var pre3_nodes = children(pre3);
			pre3_nodes.forEach(detach);
			section8_nodes.forEach(detach);
			t79 = claim_space(nodes);
			section9 = claim_element(nodes, "SECTION", {});
			var section9_nodes = children(section9);
			h44 = claim_element(section9_nodes, "H4", {});
			var h44_nodes = children(h44);
			a33 = claim_element(h44_nodes, "A", { href: true, id: true });
			var a33_nodes = children(a33);
			t80 = claim_text(a33_nodes, "2. Prepend ");
			code5 = claim_element(a33_nodes, "CODE", {});
			var code5_nodes = children(code5);
			t81 = claim_text(code5_nodes, "chrome-extension://__MSG_@@extension_id__/");
			code5_nodes.forEach(detach);
			t82 = claim_text(a33_nodes, " for the URL");
			a33_nodes.forEach(detach);
			h44_nodes.forEach(detach);
			t83 = claim_space(section9_nodes);
			pre4 = claim_element(section9_nodes, "PRE", { class: true });
			var pre4_nodes = children(pre4);
			pre4_nodes.forEach(detach);
			section9_nodes.forEach(detach);
			t84 = claim_space(nodes);
			section10 = claim_element(nodes, "SECTION", {});
			var section10_nodes = children(section10);
			h31 = claim_element(section10_nodes, "H3", {});
			var h31_nodes = children(h31);
			a34 = claim_element(h31_nodes, "A", { href: true, id: true });
			var a34_nodes = children(a34);
			t85 = claim_text(a34_nodes, "Make it look alive");
			a34_nodes.forEach(detach);
			h31_nodes.forEach(detach);
			t86 = claim_space(section10_nodes);
			p12 = claim_element(section10_nodes, "P", {});
			var p12_nodes = children(p12);
			t87 = claim_text(p12_nodes, "A static image will look fake.");
			p12_nodes.forEach(detach);
			t88 = claim_space(section10_nodes);
			p13 = claim_element(section10_nodes, "P", {});
			var p13_nodes = children(p13);
			t89 = claim_text(p13_nodes, "As the quote says, ");
			strong0 = claim_element(p13_nodes, "STRONG", {});
			var strong0_nodes = children(strong0);
			t90 = claim_text(strong0_nodes, "\"eyes is the window to the soul\"");
			strong0_nodes.forEach(detach);
			t91 = claim_text(p13_nodes, ", to make the pet look real, we need to make the eye blink.");
			p13_nodes.forEach(detach);
			t92 = claim_space(section10_nodes);
			p14 = claim_element(section10_nodes, "P", {});
			var p14_nodes = children(p14);
			em0 = claim_element(p14_nodes, "EM", {});
			var em0_nodes = children(em0);
			t93 = claim_text(em0_nodes, "(That's how you judge a person is dead or alive in movies right? Dead body will just stare blankly to nowhere)");
			em0_nodes.forEach(detach);
			p14_nodes.forEach(detach);
			t94 = claim_space(section10_nodes);
			p15 = claim_element(section10_nodes, "P", {});
			var p15_nodes = children(p15);
			t95 = claim_text(p15_nodes, "To make the pet blink, I found some ");
			a35 = claim_element(p15_nodes, "A", { href: true, rel: true });
			var a35_nodes = children(a35);
			t96 = claim_text(a35_nodes, "useful tutorials");
			a35_nodes.forEach(detach);
			t97 = claim_text(p15_nodes, " on how to create CSS sprite sheet animations.");
			p15_nodes.forEach(detach);
			t98 = claim_space(section10_nodes);
			p16 = claim_element(section10_nodes, "P", {});
			var p16_nodes = children(p16);
			img4 = claim_element(p16_nodes, "IMG", { src: true, alt: true, title: true });
			p16_nodes.forEach(detach);
			t99 = claim_space(section10_nodes);
			pre5 = claim_element(section10_nodes, "PRE", { class: true });
			var pre5_nodes = children(pre5);
			pre5_nodes.forEach(detach);
			t100 = claim_space(section10_nodes);
			p17 = claim_element(section10_nodes, "P", {});
			var p17_nodes = children(p17);
			t101 = claim_text(p17_nodes, "To animate it, I added the ");
			code6 = claim_element(p17_nodes, "CODE", {});
			var code6_nodes = children(code6);
			t102 = claim_text(code6_nodes, "rest");
			code6_nodes.forEach(detach);
			t103 = claim_text(p17_nodes, " class to the pet, and removed it when it's done animating.");
			p17_nodes.forEach(detach);
			t104 = claim_space(section10_nodes);
			pre6 = claim_element(section10_nodes, "PRE", { class: true });
			var pre6_nodes = children(pre6);
			pre6_nodes.forEach(detach);
			t105 = claim_space(section10_nodes);
			p18 = claim_element(section10_nodes, "P", {});
			var p18_nodes = children(p18);
			t106 = claim_text(p18_nodes, "At the beginning, I thought I would add more other micro expressions to the pet, so I wrote a scheduler, to schedule expressions randomly:");
			p18_nodes.forEach(detach);
			t107 = claim_space(section10_nodes);
			pre7 = claim_element(section10_nodes, "PRE", { class: true });
			var pre7_nodes = children(pre7);
			pre7_nodes.forEach(detach);
			t108 = claim_space(section10_nodes);
			p19 = claim_element(section10_nodes, "P", {});
			var p19_nodes = children(p19);
			t109 = claim_text(p19_nodes, "I used ");
			code7 = claim_element(p19_nodes, "CODE", {});
			var code7_nodes = children(code7);
			t110 = claim_text(code7_nodes, "await");
			code7_nodes.forEach(detach);
			t111 = claim_text(p19_nodes, " to wait for animation to finish, before schedule the next action again, so that it will not have 2 actions running in parallel.");
			p19_nodes.forEach(detach);
			section10_nodes.forEach(detach);
			t112 = claim_space(nodes);
			section11 = claim_element(nodes, "SECTION", {});
			var section11_nodes = children(section11);
			h32 = claim_element(section11_nodes, "H3", {});
			var h32_nodes = children(h32);
			a36 = claim_element(h32_nodes, "A", { href: true, id: true });
			var a36_nodes = children(a36);
			t113 = claim_text(a36_nodes, "Avoid the cursor");
			a36_nodes.forEach(detach);
			h32_nodes.forEach(detach);
			t114 = claim_space(section11_nodes);
			p20 = claim_element(section11_nodes, "P", {});
			var p20_nodes = children(p20);
			t115 = claim_text(p20_nodes, "I drew a sprite sheet that make the pet looks like it is squiggling away,");
			p20_nodes.forEach(detach);
			t116 = claim_space(section11_nodes);
			p21 = claim_element(section11_nodes, "P", {});
			var p21_nodes = children(p21);
			img5 = claim_element(p21_nodes, "IMG", { src: true, alt: true });
			p21_nodes.forEach(detach);
			t117 = claim_space(section11_nodes);
			p22 = claim_element(section11_nodes, "P", {});
			var p22_nodes = children(p22);
			t118 = claim_text(p22_nodes, "while at the same time set the ");
			code8 = claim_element(p22_nodes, "CODE", {});
			var code8_nodes = children(code8);
			t119 = claim_text(code8_nodes, "transform: translateX()");
			code8_nodes.forEach(detach);
			t120 = claim_text(p22_nodes, " to actually move it:");
			p22_nodes.forEach(detach);
			t121 = claim_space(section11_nodes);
			pre8 = claim_element(section11_nodes, "PRE", { class: true });
			var pre8_nodes = children(pre8);
			pre8_nodes.forEach(detach);
			t122 = claim_space(section11_nodes);
			p23 = claim_element(section11_nodes, "P", {});
			var p23_nodes = children(p23);
			t123 = claim_text(p23_nodes, "In JavaScript, I tried to keep the position state inside an object:");
			p23_nodes.forEach(detach);
			t124 = claim_space(section11_nodes);
			pre9 = claim_element(section11_nodes, "PRE", { class: true });
			var pre9_nodes = children(pre9);
			pre9_nodes.forEach(detach);
			t125 = claim_space(section11_nodes);
			p24 = claim_element(section11_nodes, "P", {});
			var p24_nodes = children(p24);
			t126 = claim_text(p24_nodes, "So, to shift away from the cursor would be:");
			p24_nodes.forEach(detach);
			t127 = claim_space(section11_nodes);
			pre10 = claim_element(section11_nodes, "PRE", { class: true });
			var pre10_nodes = children(pre10);
			pre10_nodes.forEach(detach);
			t128 = claim_space(section11_nodes);
			p25 = claim_element(section11_nodes, "P", {});
			var p25_nodes = children(p25);
			t129 = claim_text(p25_nodes, "So, when the animation ends, the ");
			code9 = claim_element(p25_nodes, "CODE", {});
			var code9_nodes = children(code9);
			t130 = claim_text(code9_nodes, "transform: translateX()");
			code9_nodes.forEach(detach);
			t131 = claim_text(p25_nodes, " will go from ");
			code10 = claim_element(p25_nodes, "CODE", {});
			var code10_nodes = children(code10);
			t132 = claim_text(code10_nodes, "-30px");
			code10_nodes.forEach(detach);
			t133 = claim_text(p25_nodes, " back to ");
			code11 = claim_element(p25_nodes, "CODE", {});
			var code11_nodes = children(code11);
			t134 = claim_text(code11_nodes, "0");
			code11_nodes.forEach(detach);
			t135 = claim_text(p25_nodes, ", and at the same time, I moved the position of the pet ");
			code12 = claim_element(p25_nodes, "CODE", {});
			var code12_nodes = children(code12);
			t136 = claim_text(code12_nodes, "-30px");
			code12_nodes.forEach(detach);
			t137 = claim_text(p25_nodes, " in x-axis.");
			p25_nodes.forEach(detach);
			t138 = claim_space(section11_nodes);
			p26 = claim_element(section11_nodes, "P", {});
			var p26_nodes = children(p26);
			t139 = claim_text(p26_nodes, "To know when the cursor is on top of the pet, I used ");
			code13 = claim_element(p26_nodes, "CODE", {});
			var code13_nodes = children(code13);
			t140 = claim_text(code13_nodes, "mousemove");
			code13_nodes.forEach(detach);
			t141 = claim_text(p26_nodes, " event:");
			p26_nodes.forEach(detach);
			t142 = claim_space(section11_nodes);
			pre11 = claim_element(section11_nodes, "PRE", { class: true });
			var pre11_nodes = children(pre11);
			pre11_nodes.forEach(detach);
			t143 = claim_space(section11_nodes);
			p27 = claim_element(section11_nodes, "P", {});
			var p27_nodes = children(p27);
			t144 = claim_text(p27_nodes, "To avoid reanimate while still animate, I added a ");
			code14 = claim_element(p27_nodes, "CODE", {});
			var code14_nodes = children(code14);
			t145 = claim_text(code14_nodes, "animating");
			code14_nodes.forEach(detach);
			t146 = claim_text(p27_nodes, " flag, as an mutex.");
			p27_nodes.forEach(detach);
			t147 = claim_space(section11_nodes);
			p28 = claim_element(section11_nodes, "P", {});
			var p28_nodes = children(p28);
			t148 = claim_text(p28_nodes, "Besides, it would be weird to see the pet shifting pass through the browser window, because that way, you would never be able to interact with it anymore 😢");
			p28_nodes.forEach(detach);
			section11_nodes.forEach(detach);
			t149 = claim_space(nodes);
			section12 = claim_element(nodes, "SECTION", {});
			var section12_nodes = children(section12);
			h33 = claim_element(section12_nodes, "H3", {});
			var h33_nodes = children(h33);
			a37 = claim_element(h33_nodes, "A", { href: true, id: true });
			var a37_nodes = children(a37);
			t150 = claim_text(a37_nodes, "Eating the characters");
			a37_nodes.forEach(detach);
			h33_nodes.forEach(detach);
			t151 = claim_space(section12_nodes);
			p29 = claim_element(section12_nodes, "P", {});
			var p29_nodes = children(p29);
			t152 = claim_text(p29_nodes, "To know when someone is typing into any of the input box, I attach an ");
			code15 = claim_element(p29_nodes, "CODE", {});
			var code15_nodes = children(code15);
			t153 = claim_text(code15_nodes, "input");
			code15_nodes.forEach(detach);
			t154 = claim_text(p29_nodes, " event listener on to the ");
			code16 = claim_element(p29_nodes, "CODE", {});
			var code16_nodes = children(code16);
			t155 = claim_text(code16_nodes, "document.body");
			code16_nodes.forEach(detach);
			t156 = claim_text(p29_nodes, ":");
			p29_nodes.forEach(detach);
			t157 = claim_space(section12_nodes);
			pre12 = claim_element(section12_nodes, "PRE", { class: true });
			var pre12_nodes = children(pre12);
			pre12_nodes.forEach(detach);
			t158 = claim_space(section12_nodes);
			p30 = claim_element(section12_nodes, "P", {});
			var p30_nodes = children(p30);
			t159 = claim_text(p30_nodes, "There maybe multiple ");
			code17 = claim_element(p30_nodes, "CODE", {});
			var code17_nodes = children(code17);
			t160 = claim_text(code17_nodes, "<input />");
			code17_nodes.forEach(detach);
			t161 = claim_text(p30_nodes, " on the page, so I created a debounce function for each ");
			code18 = claim_element(p30_nodes, "CODE", {});
			var code18_nodes = children(code18);
			t162 = claim_text(code18_nodes, "<input />");
			code18_nodes.forEach(detach);
			t163 = claim_text(p30_nodes, ".");
			p30_nodes.forEach(detach);
			t164 = claim_space(section12_nodes);
			p31 = claim_element(section12_nodes, "P", {});
			var p31_nodes = children(p31);
			t165 = claim_text(p31_nodes, "To make the eating simple, I will always eat from the left, consuming characters from left to right:");
			p31_nodes.forEach(detach);
			t166 = claim_space(section12_nodes);
			pre13 = claim_element(section12_nodes, "PRE", { class: true });
			var pre13_nodes = children(pre13);
			pre13_nodes.forEach(detach);
			t167 = claim_space(section12_nodes);
			p32 = claim_element(section12_nodes, "P", {});
			var p32_nodes = children(p32);
			t168 = claim_text(p32_nodes, "However naively eating the characters this way, will screw up your cursor position / selection.\nSo I googled and pasted the code snippet to improve it:");
			p32_nodes.forEach(detach);
			t169 = claim_space(section12_nodes);
			pre14 = claim_element(section12_nodes, "PRE", { class: true });
			var pre14_nodes = children(pre14);
			pre14_nodes.forEach(detach);
			t170 = claim_space(section12_nodes);
			p33 = claim_element(section12_nodes, "P", {});
			var p33_nodes = children(p33);
			t171 = claim_text(p33_nodes, "After able to \"eat\" the characters, I need to animate the pet eating the characters");
			p33_nodes.forEach(detach);
			t172 = claim_space(section12_nodes);
			p34 = claim_element(section12_nodes, "P", {});
			var p34_nodes = children(p34);
			img6 = claim_element(p34_nodes, "IMG", { src: true, alt: true, title: true });
			p34_nodes.forEach(detach);
			t173 = claim_space(section12_nodes);
			p35 = claim_element(section12_nodes, "P", {});
			var p35_nodes = children(p35);
			t174 = claim_text(p35_nodes, "To align the eating with the removing of a character, I split the animation into 2 parts, ");
			strong1 = claim_element(p35_nodes, "STRONG", {});
			var strong1_nodes = children(strong1);
			t175 = claim_text(strong1_nodes, "the eating");
			strong1_nodes.forEach(detach);
			t176 = claim_text(p35_nodes, " and ");
			strong2 = claim_element(p35_nodes, "STRONG", {});
			var strong2_nodes = children(strong2);
			t177 = claim_text(strong2_nodes, "the chewing");
			strong2_nodes.forEach(detach);
			t178 = claim_space(p35_nodes);
			em1 = claim_element(p35_nodes, "EM", {});
			var em1_nodes = children(em1);
			t179 = claim_text(em1_nodes, "(I named it digesting during the hackathon)");
			em1_nodes.forEach(detach);
			t180 = claim_text(p35_nodes, ".");
			p35_nodes.forEach(detach);
			t181 = claim_space(section12_nodes);
			pre15 = claim_element(section12_nodes, "PRE", { class: true });
			var pre15_nodes = children(pre15);
			pre15_nodes.forEach(detach);
			t182 = claim_space(section12_nodes);
			p36 = claim_element(section12_nodes, "P", {});
			var p36_nodes = children(p36);
			t183 = claim_text(p36_nodes, "To make it more realistic, I tried to make the pet tilt forward, while consuming the character:");
			p36_nodes.forEach(detach);
			t184 = claim_space(section12_nodes);
			pre16 = claim_element(section12_nodes, "PRE", { class: true });
			var pre16_nodes = children(pre16);
			pre16_nodes.forEach(detach);
			t185 = claim_space(section12_nodes);
			p37 = claim_element(section12_nodes, "P", {});
			var p37_nodes = children(p37);
			t186 = claim_text(p37_nodes, "The pixel values had been tuned to make the movement subtle, yet natural.");
			p37_nodes.forEach(detach);
			t187 = claim_space(section12_nodes);
			p38 = claim_element(section12_nodes, "P", {});
			var p38_nodes = children(p38);
			t188 = claim_text(p38_nodes, "Now, how do I place my pet to the left of the input?");
			p38_nodes.forEach(detach);
			t189 = claim_space(section12_nodes);
			p39 = claim_element(section12_nodes, "P", {});
			var p39_nodes = children(p39);
			t190 = claim_text(p39_nodes, "Instead of squiggle to the right position, I made the pet ");
			strong3 = claim_element(p39_nodes, "STRONG", {});
			var strong3_nodes = children(strong3);
			t191 = claim_text(strong3_nodes, "teleport");
			strong3_nodes.forEach(detach);
			t192 = claim_text(p39_nodes, "!");
			p39_nodes.forEach(detach);
			t193 = claim_space(section12_nodes);
			pre17 = claim_element(section12_nodes, "PRE", { class: true });
			var pre17_nodes = children(pre17);
			pre17_nodes.forEach(detach);
			t194 = claim_space(section12_nodes);
			p40 = claim_element(section12_nodes, "P", {});
			var p40_nodes = children(p40);
			t195 = claim_text(p40_nodes, "To calculate the teleport destination, I used ");
			a38 = claim_element(p40_nodes, "A", { href: true, rel: true });
			var a38_nodes = children(a38);
			t196 = claim_text(a38_nodes, "getBoundingClientRect()");
			a38_nodes.forEach(detach);
			t197 = claim_text(p40_nodes, ":");
			p40_nodes.forEach(detach);
			t198 = claim_space(section12_nodes);
			pre18 = claim_element(section12_nodes, "PRE", { class: true });
			var pre18_nodes = children(pre18);
			pre18_nodes.forEach(detach);
			t199 = claim_space(section12_nodes);
			p41 = claim_element(section12_nodes, "P", {});
			var p41_nodes = children(p41);
			t200 = claim_text(p41_nodes, "The padding of the input is important. It brings the pet closer to the character it is going to eat. 🤤");
			p41_nodes.forEach(detach);
			section12_nodes.forEach(detach);
			t201 = claim_space(nodes);
			section13 = claim_element(nodes, "SECTION", {});
			var section13_nodes = children(section13);
			h34 = claim_element(section13_nodes, "H3", {});
			var h34_nodes = children(h34);
			a39 = claim_element(h34_nodes, "A", { href: true, id: true });
			var a39_nodes = children(a39);
			t202 = claim_text(a39_nodes, "Annihilate the buttons");
			a39_nodes.forEach(detach);
			h34_nodes.forEach(detach);
			t203 = claim_space(section13_nodes);
			p42 = claim_element(section13_nodes, "P", {});
			var p42_nodes = children(p42);
			t204 = claim_text(p42_nodes, "Pet don't like buttons because buttons take away your concentration from your pet.");
			p42_nodes.forEach(detach);
			t205 = claim_space(section13_nodes);
			p43 = claim_element(section13_nodes, "P", {});
			var p43_nodes = children(p43);
			img7 = claim_element(p43_nodes, "IMG", { src: true, alt: true });
			p43_nodes.forEach(detach);
			t206 = claim_space(section13_nodes);
			p44 = claim_element(section13_nodes, "P", {});
			var p44_nodes = children(p44);
			t207 = claim_text(p44_nodes, "To get a list of buttons, I use ");
			a40 = claim_element(p44_nodes, "A", { href: true, rel: true });
			var a40_nodes = children(a40);
			t208 = claim_text(a40_nodes, "document.querySelectorAll()");
			a40_nodes.forEach(detach);
			t209 = claim_text(p44_nodes, ":");
			p44_nodes.forEach(detach);
			t210 = claim_space(section13_nodes);
			pre19 = claim_element(section13_nodes, "PRE", { class: true });
			var pre19_nodes = children(pre19);
			pre19_nodes.forEach(detach);
			t211 = claim_space(section13_nodes);
			p45 = claim_element(section13_nodes, "P", {});
			var p45_nodes = children(p45);
			t212 = claim_text(p45_nodes, "To annihilate the buttons, I animated the pet with a pair of dead red eyes, and shake it for 400 milli-seconds, before annihilating the elements into vapor:");
			p45_nodes.forEach(detach);
			t213 = claim_space(section13_nodes);
			pre20 = claim_element(section13_nodes, "PRE", { class: true });
			var pre20_nodes = children(pre20);
			pre20_nodes.forEach(detach);
			t214 = claim_space(section13_nodes);
			p46 = claim_element(section13_nodes, "P", {});
			var p46_nodes = children(p46);
			t215 = claim_text(p46_nodes, "I used ");
			code19 = claim_element(p46_nodes, "CODE", {});
			var code19_nodes = children(code19);
			t216 = claim_text(code19_nodes, "visibility: hidden");
			code19_nodes.forEach(detach);
			t217 = claim_text(p46_nodes, ", so that I dont disrupt the DOM structure, yet making it disappear and unclickable, unlike ");
			code20 = claim_element(p46_nodes, "CODE", {});
			var code20_nodes = children(code20);
			t218 = claim_text(code20_nodes, "opacity: none");
			code20_nodes.forEach(detach);
			t219 = claim_text(p46_nodes, ".");
			p46_nodes.forEach(detach);
			t220 = claim_space(section13_nodes);
			p47 = claim_element(section13_nodes, "P", {});
			var p47_nodes = children(p47);
			t221 = claim_text(p47_nodes, "The pet with hatred is slightly bigger and agitated than the normal pet:");
			p47_nodes.forEach(detach);
			t222 = claim_space(section13_nodes);
			pre21 = claim_element(section13_nodes, "PRE", { class: true });
			var pre21_nodes = children(pre21);
			pre21_nodes.forEach(detach);
			t223 = claim_space(section13_nodes);
			p48 = claim_element(section13_nodes, "P", {});
			var p48_nodes = children(p48);
			t224 = claim_text(p48_nodes, "To turn the button annihilated into vapor, I used ");
			code21 = claim_element(p48_nodes, "CODE", {});
			var code21_nodes = children(code21);
			t225 = claim_text(code21_nodes, "filter: blur()");
			code21_nodes.forEach(detach);
			t226 = claim_text(p48_nodes, ":");
			p48_nodes.forEach(detach);
			t227 = claim_space(section13_nodes);
			pre22 = claim_element(section13_nodes, "PRE", { class: true });
			var pre22_nodes = children(pre22);
			pre22_nodes.forEach(detach);
			section13_nodes.forEach(detach);
			t228 = claim_space(nodes);
			section14 = claim_element(nodes, "SECTION", {});
			var section14_nodes = children(section14);
			h23 = claim_element(section14_nodes, "H2", {});
			var h23_nodes = children(h23);
			a41 = claim_element(h23_nodes, "A", { href: true, id: true });
			var a41_nodes = children(a41);
			t229 = claim_text(a41_nodes, "Difficulties");
			a41_nodes.forEach(detach);
			h23_nodes.forEach(detach);
			section14_nodes.forEach(detach);
			t230 = claim_space(nodes);
			section15 = claim_element(nodes, "SECTION", {});
			var section15_nodes = children(section15);
			h35 = claim_element(section15_nodes, "H3", {});
			var h35_nodes = children(h35);
			a42 = claim_element(h35_nodes, "A", { href: true, id: true });
			var a42_nodes = children(a42);
			t231 = claim_text(a42_nodes, "Synchronising interactions");
			a42_nodes.forEach(detach);
			h35_nodes.forEach(detach);
			t232 = claim_space(section15_nodes);
			p49 = claim_element(section15_nodes, "P", {});
			var p49_nodes = children(p49);
			t233 = claim_text(p49_nodes, "A lot edge cases has been found and fixed by using the ");
			code22 = claim_element(p49_nodes, "CODE", {});
			var code22_nodes = children(code22);
			t234 = claim_text(code22_nodes, "animating");
			code22_nodes.forEach(detach);
			t235 = claim_text(p49_nodes, ", or ");
			code23 = claim_element(p49_nodes, "CODE", {});
			var code23_nodes = children(code23);
			t236 = claim_text(code23_nodes, "eating");
			code23_nodes.forEach(detach);
			t237 = claim_text(p49_nodes, " flag:");
			p49_nodes.forEach(detach);
			t238 = claim_space(section15_nodes);
			ul7 = claim_element(section15_nodes, "UL", {});
			var ul7_nodes = children(ul7);
			li19 = claim_element(ul7_nodes, "LI", {});
			var li19_nodes = children(li19);
			t239 = claim_text(li19_nodes, "where to avoid cursor, while eating the characters");
			li19_nodes.forEach(detach);
			t240 = claim_space(ul7_nodes);
			li20 = claim_element(ul7_nodes, "LI", {});
			var li20_nodes = children(li20);
			t241 = claim_text(li20_nodes, "to annihilate or to eat?\nThere's an heuristic to choose which one to do, when both get scheduled at the same time.");
			li20_nodes.forEach(detach);
			ul7_nodes.forEach(detach);
			section15_nodes.forEach(detach);
			t242 = claim_space(nodes);
			section16 = claim_element(nodes, "SECTION", {});
			var section16_nodes = children(section16);
			h36 = claim_element(section16_nodes, "H3", {});
			var h36_nodes = children(h36);
			a43 = claim_element(h36_nodes, "A", { href: true, id: true });
			var a43_nodes = children(a43);
			t243 = claim_text(a43_nodes, "Developing locally");
			a43_nodes.forEach(detach);
			h36_nodes.forEach(detach);
			t244 = claim_space(section16_nodes);
			p50 = claim_element(section16_nodes, "P", {});
			var p50_nodes = children(p50);
			t245 = claim_text(p50_nodes, "Everytime when the content script is updated, I need to click refresh in the ");
			code24 = claim_element(p50_nodes, "CODE", {});
			var code24_nodes = children(code24);
			t246 = claim_text(code24_nodes, "chrome://extensions");
			code24_nodes.forEach(detach);
			t247 = claim_text(p50_nodes, " page:");
			p50_nodes.forEach(detach);
			t248 = claim_space(section16_nodes);
			p51 = claim_element(section16_nodes, "P", {});
			var p51_nodes = children(p51);
			img8 = claim_element(p51_nodes, "IMG", { src: true, alt: true });
			p51_nodes.forEach(detach);
			t249 = claim_space(section16_nodes);
			p52 = claim_element(section16_nodes, "P", {});
			var p52_nodes = children(p52);
			t250 = claim_text(p52_nodes, "In order to developed faster, I created a simple HTML, and test it locally.");
			p52_nodes.forEach(detach);
			t251 = claim_space(section16_nodes);
			pre23 = claim_element(section16_nodes, "PRE", { class: true });
			var pre23_nodes = children(pre23);
			pre23_nodes.forEach(detach);
			section16_nodes.forEach(detach);
			t252 = claim_space(nodes);
			section17 = claim_element(nodes, "SECTION", {});
			var section17_nodes = children(section17);
			h45 = claim_element(section17_nodes, "H4", {});
			var h45_nodes = children(h45);
			a44 = claim_element(h45_nodes, "A", { href: true, id: true });
			var a44_nodes = children(a44);
			t253 = claim_text(a44_nodes, "PostCSS script");
			a44_nodes.forEach(detach);
			h45_nodes.forEach(detach);
			t254 = claim_space(section17_nodes);
			p53 = claim_element(section17_nodes, "P", {});
			var p53_nodes = children(p53);
			t255 = claim_text(p53_nodes, "Remember I mentioned that, for resource to be accessible from the Chrome Extension, I would have to prepend the url with ");
			code25 = claim_element(p53_nodes, "CODE", {});
			var code25_nodes = children(code25);
			t256 = claim_text(code25_nodes, "chrome-extension://__MSG_@@extension_id__/");
			code25_nodes.forEach(detach);
			t257 = claim_text(p53_nodes, "?");
			p53_nodes.forEach(detach);
			t258 = claim_space(section17_nodes);
			p54 = claim_element(section17_nodes, "P", {});
			var p54_nodes = children(p54);
			t259 = claim_text(p54_nodes, "But that does not work if I developed in standalone HTML, because I can't access the assets from ");
			code26 = claim_element(p54_nodes, "CODE", {});
			var code26_nodes = children(code26);
			t260 = claim_text(code26_nodes, "chrome-extension://");
			code26_nodes.forEach(detach);
			t261 = claim_text(p54_nodes, " protocol in my localhost.");
			p54_nodes.forEach(detach);
			t262 = claim_space(section17_nodes);
			p55 = claim_element(section17_nodes, "P", {});
			var p55_nodes = children(p55);
			t263 = claim_text(p55_nodes, "I would have to write ");
			code27 = claim_element(p55_nodes, "CODE", {});
			var code27_nodes = children(code27);
			t264 = claim_text(code27_nodes, "/images/rest.png");
			code27_nodes.forEach(detach);
			t265 = claim_text(p55_nodes, ", and replaced it to ");
			code28 = claim_element(p55_nodes, "CODE", {});
			var code28_nodes = children(code28);
			t266 = claim_text(code28_nodes, "chrome-extension://__MSG_@@extension_id__/images/rest.png");
			code28_nodes.forEach(detach);
			t267 = claim_text(p55_nodes, " when I test it on my extension.");
			p55_nodes.forEach(detach);
			t268 = claim_space(section17_nodes);
			p56 = claim_element(section17_nodes, "P", {});
			var p56_nodes = children(p56);
			t269 = claim_text(p56_nodes, "So, I wrote a simple script with ");
			a45 = claim_element(p56_nodes, "A", { href: true, rel: true });
			var a45_nodes = children(a45);
			t270 = claim_text(a45_nodes, "PostCSS");
			a45_nodes.forEach(detach);
			t271 = claim_text(p56_nodes, " to automatically do it:");
			p56_nodes.forEach(detach);
			t272 = claim_space(section17_nodes);
			pre24 = claim_element(section17_nodes, "PRE", { class: true });
			var pre24_nodes = children(pre24);
			pre24_nodes.forEach(detach);
			t273 = claim_space(section17_nodes);
			p57 = claim_element(section17_nodes, "P", {});
			var p57_nodes = children(p57);
			t274 = claim_text(p57_nodes, "I used ");
			code29 = claim_element(p57_nodes, "CODE", {});
			var code29_nodes = children(code29);
			t275 = claim_text(code29_nodes, "content.css");
			code29_nodes.forEach(detach);
			t276 = claim_text(p57_nodes, " for my local development, and automatically built ");
			code30 = claim_element(p57_nodes, "CODE", {});
			var code30_nodes = children(code30);
			t277 = claim_text(code30_nodes, "content-ext.css");
			code30_nodes.forEach(detach);
			t278 = claim_text(p57_nodes, " for the extension with all the URL replaced.");
			p57_nodes.forEach(detach);
			section17_nodes.forEach(detach);
			t279 = claim_space(nodes);
			section18 = claim_element(nodes, "SECTION", {});
			var section18_nodes = children(section18);
			h24 = claim_element(section18_nodes, "H2", {});
			var h24_nodes = children(h24);
			a46 = claim_element(h24_nodes, "A", { href: true, id: true });
			var a46_nodes = children(a46);
			t280 = claim_text(a46_nodes, "Demo");
			a46_nodes.forEach(detach);
			h24_nodes.forEach(detach);
			t281 = claim_space(section18_nodes);
			p58 = claim_element(section18_nodes, "P", {});
			var p58_nodes = children(p58);
			t282 = claim_text(p58_nodes, "I did a super quick demo, which went quite well, ");
			em2 = claim_element(p58_nodes, "EM", {});
			var em2_nodes = children(em2);
			t283 = claim_text(em2_nodes, "I think.");
			em2_nodes.forEach(detach);
			t284 = claim_text(p58_nodes, " 🤔");
			p58_nodes.forEach(detach);
			t285 = claim_space(section18_nodes);
			p59 = claim_element(section18_nodes, "P", {});
			var p59_nodes = children(p59);
			t286 = claim_text(p59_nodes, "For those who are curious, and want to try out, you can visit ");
			a47 = claim_element(p59_nodes, "A", { href: true, rel: true });
			var a47_nodes = children(a47);
			t287 = claim_text(a47_nodes, "here for the demo");
			a47_nodes.forEach(detach);
			t288 = claim_text(p59_nodes, ".");
			p59_nodes.forEach(detach);
			t289 = claim_space(section18_nodes);
			p60 = claim_element(section18_nodes, "P", {});
			var p60_nodes = children(p60);
			t290 = claim_text(p60_nodes, "For those who are curious about the source code, can visit ");
			a48 = claim_element(p60_nodes, "A", { href: true, rel: true });
			var a48_nodes = children(a48);
			t291 = claim_text(a48_nodes, "the Github repo");
			a48_nodes.forEach(detach);
			t292 = claim_text(p60_nodes, ".");
			p60_nodes.forEach(detach);
			section18_nodes.forEach(detach);
			t293 = claim_space(nodes);
			section19 = claim_element(nodes, "SECTION", {});
			var section19_nodes = children(section19);
			h25 = claim_element(section19_nodes, "H2", {});
			var h25_nodes = children(h25);
			a49 = claim_element(h25_nodes, "A", { href: true, id: true });
			var a49_nodes = children(a49);
			t294 = claim_text(a49_nodes, "Summary");
			a49_nodes.forEach(detach);
			h25_nodes.forEach(detach);
			t295 = claim_space(section19_nodes);
			p61 = claim_element(section19_nodes, "P", {});
			var p61_nodes = children(p61);
			t296 = claim_text(p61_nodes, "It has been a fruitful event.");
			p61_nodes.forEach(detach);
			t297 = claim_space(section19_nodes);
			blockquote1 = claim_element(section19_nodes, "BLOCKQUOTE", { class: true });
			var blockquote1_nodes = children(blockquote1);
			p62 = claim_element(blockquote1_nodes, "P", { lang: true, dir: true });
			var p62_nodes = children(p62);
			t298 = claim_text(p62_nodes, "And ");
			a50 = claim_element(p62_nodes, "A", { href: true });
			var a50_nodes = children(a50);
			t299 = claim_text(a50_nodes, "@lihautan");
			a50_nodes.forEach(detach);
			t300 = claim_text(p62_nodes, " wins a bag of tropical fruits ");
			a51 = claim_element(p62_nodes, "A", { href: true });
			var a51_nodes = children(a51);
			t301 = claim_text(a51_nodes, "pic.twitter.com/CtQUBGOI7h");
			a51_nodes.forEach(detach);
			p62_nodes.forEach(detach);
			t302 = claim_text(blockquote1_nodes, "— Yishu See (@yishusee) ");
			a52 = claim_element(blockquote1_nodes, "A", { href: true });
			var a52_nodes = children(a52);
			t303 = claim_text(a52_nodes, "December 14, 2019");
			a52_nodes.forEach(detach);
			blockquote1_nodes.forEach(detach);
			t304 = claim_space(section19_nodes);
			p63 = claim_element(section19_nodes, "P", {});
			var p63_nodes = children(p63);
			t305 = claim_text(p63_nodes, "Appreciate the organisers time and effort to make the Hackathon goes as smoothly as possible.");
			p63_nodes.forEach(detach);
			t306 = claim_space(section19_nodes);
			p64 = claim_element(section19_nodes, "P", {});
			var p64_nodes = children(p64);
			t307 = claim_text(p64_nodes, "I managed to do something that I never really done before:");
			p64_nodes.forEach(detach);
			t308 = claim_space(section19_nodes);
			ul8 = claim_element(section19_nodes, "UL", {});
			var ul8_nodes = children(ul8);
			li21 = claim_element(ul8_nodes, "LI", {});
			var li21_nodes = children(li21);
			t309 = claim_text(li21_nodes, "CSS sprite sheet animation");
			li21_nodes.forEach(detach);
			t310 = claim_space(ul8_nodes);
			li22 = claim_element(ul8_nodes, "LI", {});
			var li22_nodes = children(li22);
			t311 = claim_text(li22_nodes, "Chrome Extension that interacts with the user and manipulates the DOM");
			li22_nodes.forEach(detach);
			ul8_nodes.forEach(detach);
			t312 = claim_space(section19_nodes);
			p65 = claim_element(section19_nodes, "P", {});
			var p65_nodes = children(p65);
			t313 = claim_text(p65_nodes, "Hopefully I will partcipate the ");
			a53 = claim_element(p65_nodes, "A", { href: true, rel: true });
			var a53_nodes = children(a53);
			t314 = claim_text(a53_nodes, "Super Silly Hackathon");
			a53_nodes.forEach(detach);
			t315 = claim_text(p65_nodes, " again next year.");
			p65_nodes.forEach(detach);
			section19_nodes.forEach(detach);
			this.h();
		},
		h() {
			attr(a0, "href", "#inspiration");
			attr(a1, "href", "#what-can-it-do");
			attr(a2, "href", "#it-runs-away-from-mouse-cursor");
			attr(a3, "href", "#it-eats-whatever-you-try-to-type-into-an-input");
			attr(a4, "href", "#it-annihilates-the-buttons-you-hover-onto");
			attr(a5, "href", "#implementation");
			attr(a6, "href", "#chrome-extension");
			attr(a7, "href", "#add-web-accessible-resources-into-the-manifest-json");
			attr(a8, "href", "#prepend-chrome-extension-msg-extension-id-for-the-url");
			attr(a9, "href", "#make-it-look-alive");
			attr(a10, "href", "#avoid-the-cursor");
			attr(a11, "href", "#eating-the-characters");
			attr(a12, "href", "#annihilate-the-buttons");
			attr(a13, "href", "#difficulties");
			attr(a14, "href", "#synchronising-interactions");
			attr(a15, "href", "#developing-locally");
			attr(a16, "href", "#postcss-script");
			attr(a17, "href", "#demo");
			attr(a18, "href", "#summary");
			attr(ul6, "class", "sitemap");
			attr(ul6, "id", "sitemap");
			attr(ul6, "role", "navigation");
			attr(ul6, "aria-label", "Table of Contents");
			attr(a19, "href", "https://supersillyhackathon.sg/");
			attr(a19, "rel", "nofollow");
			attr(a20, "href", "https://t.co/lem52qHO6Q");
			attr(p1, "lang", "en");
			attr(p1, "dir", "ltr");
			attr(a21, "href", "https://twitter.com/supersillyhack/status/1205671402432450563?ref_src=twsrc%5Etfw");
			attr(blockquote0, "class", "twitter-tweet");
			attr(a22, "href", "https://github.com/tanhauhau/browser-pet");
			attr(a22, "rel", "nofollow");
			if (img0.src !== (img0_src_value = __build_img__0)) attr(img0, "src", img0_src_value);
			attr(img0, "alt", "rest");
			attr(a23, "href", "#inspiration");
			attr(a23, "id", "inspiration");
			attr(a24, "href", "https://github.com/graceavery/tamagotchiTemp");
			attr(a24, "rel", "nofollow");
			attr(a25, "href", "#what-can-it-do");
			attr(a25, "id", "what-can-it-do");
			attr(a26, "href", "#it-runs-away-from-mouse-cursor");
			attr(a26, "id", "it-runs-away-from-mouse-cursor");
			if (img1.src !== (img1_src_value = __build_img__1)) attr(img1, "src", img1_src_value);
			attr(img1, "alt", "evade");
			attr(a27, "href", "#it-eats-whatever-you-try-to-type-into-an-input");
			attr(a27, "id", "it-eats-whatever-you-try-to-type-into-an-input");
			if (img2.src !== (img2_src_value = __build_img__2)) attr(img2, "src", img2_src_value);
			attr(img2, "alt", "eat");
			attr(a28, "href", "#it-annihilates-the-buttons-you-hover-onto");
			attr(a28, "id", "it-annihilates-the-buttons-you-hover-onto");
			if (img3.src !== (img3_src_value = __build_img__3)) attr(img3, "src", img3_src_value);
			attr(img3, "alt", "annihilate");
			attr(a29, "href", "#implementation");
			attr(a29, "id", "implementation");
			attr(a30, "href", "#chrome-extension");
			attr(a30, "id", "chrome-extension");
			attr(a31, "href", "https://developer.chrome.com/extensions/content_scripts");
			attr(a31, "rel", "nofollow");
			attr(pre0, "class", "language-json");
			attr(pre1, "class", "language-js");
			attr(pre2, "class", "language-css");
			attr(a32, "href", "#add-web-accessible-resources-into-the-manifest-json");
			attr(a32, "id", "add-web-accessible-resources-into-the-manifest-json");
			attr(pre3, "class", "language-json");
			attr(a33, "href", "#prepend-chrome-extension-msg-extension-id-for-the-url");
			attr(a33, "id", "prepend-chrome-extension-msg-extension-id-for-the-url");
			attr(pre4, "class", "language-css");
			attr(a34, "href", "#make-it-look-alive");
			attr(a34, "id", "make-it-look-alive");
			attr(a35, "href", "https://blog.teamtreehouse.com/css-sprite-sheet-animations-steps");
			attr(a35, "rel", "nofollow");
			if (img4.src !== (img4_src_value = __build_img__4)) attr(img4, "src", img4_src_value);
			attr(img4, "alt", "spritesheet for resting");
			attr(img4, "title", "Sprite Sheet for Resting");
			attr(pre5, "class", "language-css");
			attr(pre6, "class", "language-js");
			attr(pre7, "class", "language-js");
			attr(a36, "href", "#avoid-the-cursor");
			attr(a36, "id", "avoid-the-cursor");
			if (img5.src !== (img5_src_value = __build_img__5)) attr(img5, "src", img5_src_value);
			attr(img5, "alt", "shift");
			attr(pre8, "class", "language-css");
			attr(pre9, "class", "language-js");
			attr(pre10, "class", "language-js");
			attr(pre11, "class", "language-js");
			attr(a37, "href", "#eating-the-characters");
			attr(a37, "id", "eating-the-characters");
			attr(pre12, "class", "language-js");
			attr(pre13, "class", "language-js");
			attr(pre14, "class", "language-js");
			if (img6.src !== (img6_src_value = __build_img__6)) attr(img6, "src", img6_src_value);
			attr(img6, "alt", "spritesheet for eating");
			attr(img6, "title", "Sprite Sheet for Eating");
			attr(pre15, "class", "language-js");
			attr(pre16, "class", "language-css");
			attr(pre17, "class", "language-js");
			attr(a38, "href", "https://developer.mozilla.org/en-US/docs/Web/API/Element/getBoundingClientRect");
			attr(a38, "rel", "nofollow");
			attr(pre18, "class", "language-js");
			attr(a39, "href", "#annihilate-the-buttons");
			attr(a39, "id", "annihilate-the-buttons");
			if (img7.src !== (img7_src_value = __build_img__7)) attr(img7, "src", img7_src_value);
			attr(img7, "alt", "Eys full of hatred");
			attr(a40, "href", "https://developer.mozilla.org/en-US/docs/Web/API/Document/querySelectorAll");
			attr(a40, "rel", "nofollow");
			attr(pre19, "class", "language-js");
			attr(pre20, "class", "language-js");
			attr(pre21, "class", "language-css");
			attr(pre22, "class", "language-css");
			attr(a41, "href", "#difficulties");
			attr(a41, "id", "difficulties");
			attr(a42, "href", "#synchronising-interactions");
			attr(a42, "id", "synchronising-interactions");
			attr(a43, "href", "#developing-locally");
			attr(a43, "id", "developing-locally");
			if (img8.src !== (img8_src_value = __build_img__8)) attr(img8, "src", img8_src_value);
			attr(img8, "alt", "click refresh");
			attr(pre23, "class", "language-html");
			attr(a44, "href", "#postcss-script");
			attr(a44, "id", "postcss-script");
			attr(a45, "href", "https://postcss.org/");
			attr(a45, "rel", "nofollow");
			attr(pre24, "class", "language-js");
			attr(a46, "href", "#demo");
			attr(a46, "id", "demo");
			attr(a47, "href", "https://lihautan.com/browser-pet/");
			attr(a47, "rel", "nofollow");
			attr(a48, "href", "https://github.com/tanhauhau/browser-pet");
			attr(a48, "rel", "nofollow");
			attr(a49, "href", "#summary");
			attr(a49, "id", "summary");
			attr(a50, "href", "https://twitter.com/lihautan?ref_src=twsrc%5Etfw");
			attr(a51, "href", "https://t.co/CtQUBGOI7h");
			attr(p62, "lang", "en");
			attr(p62, "dir", "ltr");
			attr(a52, "href", "https://twitter.com/yishusee/status/1205828141194727430?ref_src=twsrc%5Etfw");
			attr(blockquote1, "class", "twitter-tweet");
			attr(a53, "href", "https://twitter.com/supersillyhack");
			attr(a53, "rel", "nofollow");
		},
		m(target, anchor) {
			insert(target, section0, anchor);
			append(section0, ul6);
			append(ul6, li0);
			append(li0, a0);
			append(a0, t0);
			append(ul6, li1);
			append(li1, a1);
			append(a1, t1);
			append(ul6, ul1);
			append(ul1, ul0);
			append(ul0, li2);
			append(li2, a2);
			append(a2, t2);
			append(ul0, li3);
			append(li3, a3);
			append(a3, t3);
			append(ul0, li4);
			append(li4, a4);
			append(a4, t4);
			append(ul6, li5);
			append(li5, a5);
			append(a5, t5);
			append(ul6, ul3);
			append(ul3, li6);
			append(li6, a6);
			append(a6, t6);
			append(ul3, ul2);
			append(ul2, li7);
			append(li7, a7);
			append(a7, t7);
			append(ul2, li8);
			append(li8, a8);
			append(a8, t8);
			append(ul3, li9);
			append(li9, a9);
			append(a9, t9);
			append(ul3, li10);
			append(li10, a10);
			append(a10, t10);
			append(ul3, li11);
			append(li11, a11);
			append(a11, t11);
			append(ul3, li12);
			append(li12, a12);
			append(a12, t12);
			append(ul6, li13);
			append(li13, a13);
			append(a13, t13);
			append(ul6, ul5);
			append(ul5, li14);
			append(li14, a14);
			append(a14, t14);
			append(ul5, li15);
			append(li15, a15);
			append(a15, t15);
			append(ul5, ul4);
			append(ul4, li16);
			append(li16, a16);
			append(a16, t16);
			append(ul6, li17);
			append(li17, a17);
			append(a17, t17);
			append(ul6, li18);
			append(li18, a18);
			append(a18, t18);
			insert(target, t19, anchor);
			insert(target, p0, anchor);
			append(p0, t20);
			append(p0, a19);
			append(a19, t21);
			append(p0, t22);
			insert(target, t23, anchor);
			insert(target, blockquote0, anchor);
			append(blockquote0, p1);
			append(p1, t24);
			append(p1, a20);
			append(a20, t25);
			append(blockquote0, t26);
			append(blockquote0, a21);
			append(a21, t27);
			insert(target, t28, anchor);
			insert(target, p2, anchor);
			append(p2, t29);
			append(p2, a22);
			append(a22, t30);
			append(p2, t31);
			insert(target, t32, anchor);
			insert(target, p3, anchor);
			append(p3, img0);
			insert(target, t33, anchor);
			insert(target, section1, anchor);
			append(section1, h20);
			append(h20, a23);
			append(a23, t34);
			append(section1, t35);
			append(section1, p4);
			append(p4, t36);
			append(p4, a24);
			append(a24, t37);
			append(p4, t38);
			insert(target, t39, anchor);
			insert(target, section2, anchor);
			append(section2, h21);
			append(h21, a25);
			append(a25, t40);
			insert(target, t41, anchor);
			insert(target, section3, anchor);
			append(section3, h40);
			append(h40, a26);
			append(a26, t42);
			append(section3, t43);
			append(section3, p5);
			append(p5, img1);
			insert(target, t44, anchor);
			insert(target, section4, anchor);
			append(section4, h41);
			append(h41, a27);
			append(a27, t45);
			append(section4, t46);
			append(section4, p6);
			append(p6, img2);
			insert(target, t47, anchor);
			insert(target, section5, anchor);
			append(section5, h42);
			append(h42, a28);
			append(a28, t48);
			append(section5, t49);
			append(section5, p7);
			append(p7, img3);
			insert(target, t50, anchor);
			insert(target, section6, anchor);
			append(section6, h22);
			append(h22, a29);
			append(a29, t51);
			insert(target, t52, anchor);
			insert(target, section7, anchor);
			append(section7, h30);
			append(h30, a30);
			append(a30, t53);
			append(section7, t54);
			append(section7, p8);
			append(p8, t55);
			append(p8, a31);
			append(a31, t56);
			append(p8, t57);
			append(section7, t58);
			append(section7, p9);
			append(p9, t59);
			append(p9, code0);
			append(code0, t60);
			append(p9, t61);
			append(section7, t62);
			append(section7, pre0);
			pre0.innerHTML = raw0_value;
			append(section7, t63);
			append(section7, p10);
			append(p10, t64);
			append(p10, code1);
			append(code1, t65);
			append(p10, t66);
			append(section7, t67);
			append(section7, pre1);
			pre1.innerHTML = raw1_value;
			append(section7, t68);
			append(section7, pre2);
			pre2.innerHTML = raw2_value;
			append(section7, t69);
			append(section7, p11);
			append(p11, t70);
			append(p11, code2);
			append(code2, t71);
			append(p11, t72);
			insert(target, t73, anchor);
			insert(target, section8, anchor);
			append(section8, h43);
			append(h43, a32);
			append(a32, t74);
			append(a32, code3);
			append(code3, t75);
			append(a32, t76);
			append(a32, code4);
			append(code4, t77);
			append(section8, t78);
			append(section8, pre3);
			pre3.innerHTML = raw3_value;
			insert(target, t79, anchor);
			insert(target, section9, anchor);
			append(section9, h44);
			append(h44, a33);
			append(a33, t80);
			append(a33, code5);
			append(code5, t81);
			append(a33, t82);
			append(section9, t83);
			append(section9, pre4);
			pre4.innerHTML = raw4_value;
			insert(target, t84, anchor);
			insert(target, section10, anchor);
			append(section10, h31);
			append(h31, a34);
			append(a34, t85);
			append(section10, t86);
			append(section10, p12);
			append(p12, t87);
			append(section10, t88);
			append(section10, p13);
			append(p13, t89);
			append(p13, strong0);
			append(strong0, t90);
			append(p13, t91);
			append(section10, t92);
			append(section10, p14);
			append(p14, em0);
			append(em0, t93);
			append(section10, t94);
			append(section10, p15);
			append(p15, t95);
			append(p15, a35);
			append(a35, t96);
			append(p15, t97);
			append(section10, t98);
			append(section10, p16);
			append(p16, img4);
			append(section10, t99);
			append(section10, pre5);
			pre5.innerHTML = raw5_value;
			append(section10, t100);
			append(section10, p17);
			append(p17, t101);
			append(p17, code6);
			append(code6, t102);
			append(p17, t103);
			append(section10, t104);
			append(section10, pre6);
			pre6.innerHTML = raw6_value;
			append(section10, t105);
			append(section10, p18);
			append(p18, t106);
			append(section10, t107);
			append(section10, pre7);
			pre7.innerHTML = raw7_value;
			append(section10, t108);
			append(section10, p19);
			append(p19, t109);
			append(p19, code7);
			append(code7, t110);
			append(p19, t111);
			insert(target, t112, anchor);
			insert(target, section11, anchor);
			append(section11, h32);
			append(h32, a36);
			append(a36, t113);
			append(section11, t114);
			append(section11, p20);
			append(p20, t115);
			append(section11, t116);
			append(section11, p21);
			append(p21, img5);
			append(section11, t117);
			append(section11, p22);
			append(p22, t118);
			append(p22, code8);
			append(code8, t119);
			append(p22, t120);
			append(section11, t121);
			append(section11, pre8);
			pre8.innerHTML = raw8_value;
			append(section11, t122);
			append(section11, p23);
			append(p23, t123);
			append(section11, t124);
			append(section11, pre9);
			pre9.innerHTML = raw9_value;
			append(section11, t125);
			append(section11, p24);
			append(p24, t126);
			append(section11, t127);
			append(section11, pre10);
			pre10.innerHTML = raw10_value;
			append(section11, t128);
			append(section11, p25);
			append(p25, t129);
			append(p25, code9);
			append(code9, t130);
			append(p25, t131);
			append(p25, code10);
			append(code10, t132);
			append(p25, t133);
			append(p25, code11);
			append(code11, t134);
			append(p25, t135);
			append(p25, code12);
			append(code12, t136);
			append(p25, t137);
			append(section11, t138);
			append(section11, p26);
			append(p26, t139);
			append(p26, code13);
			append(code13, t140);
			append(p26, t141);
			append(section11, t142);
			append(section11, pre11);
			pre11.innerHTML = raw11_value;
			append(section11, t143);
			append(section11, p27);
			append(p27, t144);
			append(p27, code14);
			append(code14, t145);
			append(p27, t146);
			append(section11, t147);
			append(section11, p28);
			append(p28, t148);
			insert(target, t149, anchor);
			insert(target, section12, anchor);
			append(section12, h33);
			append(h33, a37);
			append(a37, t150);
			append(section12, t151);
			append(section12, p29);
			append(p29, t152);
			append(p29, code15);
			append(code15, t153);
			append(p29, t154);
			append(p29, code16);
			append(code16, t155);
			append(p29, t156);
			append(section12, t157);
			append(section12, pre12);
			pre12.innerHTML = raw12_value;
			append(section12, t158);
			append(section12, p30);
			append(p30, t159);
			append(p30, code17);
			append(code17, t160);
			append(p30, t161);
			append(p30, code18);
			append(code18, t162);
			append(p30, t163);
			append(section12, t164);
			append(section12, p31);
			append(p31, t165);
			append(section12, t166);
			append(section12, pre13);
			pre13.innerHTML = raw13_value;
			append(section12, t167);
			append(section12, p32);
			append(p32, t168);
			append(section12, t169);
			append(section12, pre14);
			pre14.innerHTML = raw14_value;
			append(section12, t170);
			append(section12, p33);
			append(p33, t171);
			append(section12, t172);
			append(section12, p34);
			append(p34, img6);
			append(section12, t173);
			append(section12, p35);
			append(p35, t174);
			append(p35, strong1);
			append(strong1, t175);
			append(p35, t176);
			append(p35, strong2);
			append(strong2, t177);
			append(p35, t178);
			append(p35, em1);
			append(em1, t179);
			append(p35, t180);
			append(section12, t181);
			append(section12, pre15);
			pre15.innerHTML = raw15_value;
			append(section12, t182);
			append(section12, p36);
			append(p36, t183);
			append(section12, t184);
			append(section12, pre16);
			pre16.innerHTML = raw16_value;
			append(section12, t185);
			append(section12, p37);
			append(p37, t186);
			append(section12, t187);
			append(section12, p38);
			append(p38, t188);
			append(section12, t189);
			append(section12, p39);
			append(p39, t190);
			append(p39, strong3);
			append(strong3, t191);
			append(p39, t192);
			append(section12, t193);
			append(section12, pre17);
			pre17.innerHTML = raw17_value;
			append(section12, t194);
			append(section12, p40);
			append(p40, t195);
			append(p40, a38);
			append(a38, t196);
			append(p40, t197);
			append(section12, t198);
			append(section12, pre18);
			pre18.innerHTML = raw18_value;
			append(section12, t199);
			append(section12, p41);
			append(p41, t200);
			insert(target, t201, anchor);
			insert(target, section13, anchor);
			append(section13, h34);
			append(h34, a39);
			append(a39, t202);
			append(section13, t203);
			append(section13, p42);
			append(p42, t204);
			append(section13, t205);
			append(section13, p43);
			append(p43, img7);
			append(section13, t206);
			append(section13, p44);
			append(p44, t207);
			append(p44, a40);
			append(a40, t208);
			append(p44, t209);
			append(section13, t210);
			append(section13, pre19);
			pre19.innerHTML = raw19_value;
			append(section13, t211);
			append(section13, p45);
			append(p45, t212);
			append(section13, t213);
			append(section13, pre20);
			pre20.innerHTML = raw20_value;
			append(section13, t214);
			append(section13, p46);
			append(p46, t215);
			append(p46, code19);
			append(code19, t216);
			append(p46, t217);
			append(p46, code20);
			append(code20, t218);
			append(p46, t219);
			append(section13, t220);
			append(section13, p47);
			append(p47, t221);
			append(section13, t222);
			append(section13, pre21);
			pre21.innerHTML = raw21_value;
			append(section13, t223);
			append(section13, p48);
			append(p48, t224);
			append(p48, code21);
			append(code21, t225);
			append(p48, t226);
			append(section13, t227);
			append(section13, pre22);
			pre22.innerHTML = raw22_value;
			insert(target, t228, anchor);
			insert(target, section14, anchor);
			append(section14, h23);
			append(h23, a41);
			append(a41, t229);
			insert(target, t230, anchor);
			insert(target, section15, anchor);
			append(section15, h35);
			append(h35, a42);
			append(a42, t231);
			append(section15, t232);
			append(section15, p49);
			append(p49, t233);
			append(p49, code22);
			append(code22, t234);
			append(p49, t235);
			append(p49, code23);
			append(code23, t236);
			append(p49, t237);
			append(section15, t238);
			append(section15, ul7);
			append(ul7, li19);
			append(li19, t239);
			append(ul7, t240);
			append(ul7, li20);
			append(li20, t241);
			insert(target, t242, anchor);
			insert(target, section16, anchor);
			append(section16, h36);
			append(h36, a43);
			append(a43, t243);
			append(section16, t244);
			append(section16, p50);
			append(p50, t245);
			append(p50, code24);
			append(code24, t246);
			append(p50, t247);
			append(section16, t248);
			append(section16, p51);
			append(p51, img8);
			append(section16, t249);
			append(section16, p52);
			append(p52, t250);
			append(section16, t251);
			append(section16, pre23);
			pre23.innerHTML = raw23_value;
			insert(target, t252, anchor);
			insert(target, section17, anchor);
			append(section17, h45);
			append(h45, a44);
			append(a44, t253);
			append(section17, t254);
			append(section17, p53);
			append(p53, t255);
			append(p53, code25);
			append(code25, t256);
			append(p53, t257);
			append(section17, t258);
			append(section17, p54);
			append(p54, t259);
			append(p54, code26);
			append(code26, t260);
			append(p54, t261);
			append(section17, t262);
			append(section17, p55);
			append(p55, t263);
			append(p55, code27);
			append(code27, t264);
			append(p55, t265);
			append(p55, code28);
			append(code28, t266);
			append(p55, t267);
			append(section17, t268);
			append(section17, p56);
			append(p56, t269);
			append(p56, a45);
			append(a45, t270);
			append(p56, t271);
			append(section17, t272);
			append(section17, pre24);
			pre24.innerHTML = raw24_value;
			append(section17, t273);
			append(section17, p57);
			append(p57, t274);
			append(p57, code29);
			append(code29, t275);
			append(p57, t276);
			append(p57, code30);
			append(code30, t277);
			append(p57, t278);
			insert(target, t279, anchor);
			insert(target, section18, anchor);
			append(section18, h24);
			append(h24, a46);
			append(a46, t280);
			append(section18, t281);
			append(section18, p58);
			append(p58, t282);
			append(p58, em2);
			append(em2, t283);
			append(p58, t284);
			append(section18, t285);
			append(section18, p59);
			append(p59, t286);
			append(p59, a47);
			append(a47, t287);
			append(p59, t288);
			append(section18, t289);
			append(section18, p60);
			append(p60, t290);
			append(p60, a48);
			append(a48, t291);
			append(p60, t292);
			insert(target, t293, anchor);
			insert(target, section19, anchor);
			append(section19, h25);
			append(h25, a49);
			append(a49, t294);
			append(section19, t295);
			append(section19, p61);
			append(p61, t296);
			append(section19, t297);
			append(section19, blockquote1);
			append(blockquote1, p62);
			append(p62, t298);
			append(p62, a50);
			append(a50, t299);
			append(p62, t300);
			append(p62, a51);
			append(a51, t301);
			append(blockquote1, t302);
			append(blockquote1, a52);
			append(a52, t303);
			append(section19, t304);
			append(section19, p63);
			append(p63, t305);
			append(section19, t306);
			append(section19, p64);
			append(p64, t307);
			append(section19, t308);
			append(section19, ul8);
			append(ul8, li21);
			append(li21, t309);
			append(ul8, t310);
			append(ul8, li22);
			append(li22, t311);
			append(section19, t312);
			append(section19, p65);
			append(p65, t313);
			append(p65, a53);
			append(a53, t314);
			append(p65, t315);
		},
		p: noop,
		d(detaching) {
			if (detaching) detach(section0);
			if (detaching) detach(t19);
			if (detaching) detach(p0);
			if (detaching) detach(t23);
			if (detaching) detach(blockquote0);
			if (detaching) detach(t28);
			if (detaching) detach(p2);
			if (detaching) detach(t32);
			if (detaching) detach(p3);
			if (detaching) detach(t33);
			if (detaching) detach(section1);
			if (detaching) detach(t39);
			if (detaching) detach(section2);
			if (detaching) detach(t41);
			if (detaching) detach(section3);
			if (detaching) detach(t44);
			if (detaching) detach(section4);
			if (detaching) detach(t47);
			if (detaching) detach(section5);
			if (detaching) detach(t50);
			if (detaching) detach(section6);
			if (detaching) detach(t52);
			if (detaching) detach(section7);
			if (detaching) detach(t73);
			if (detaching) detach(section8);
			if (detaching) detach(t79);
			if (detaching) detach(section9);
			if (detaching) detach(t84);
			if (detaching) detach(section10);
			if (detaching) detach(t112);
			if (detaching) detach(section11);
			if (detaching) detach(t149);
			if (detaching) detach(section12);
			if (detaching) detach(t201);
			if (detaching) detach(section13);
			if (detaching) detach(t228);
			if (detaching) detach(section14);
			if (detaching) detach(t230);
			if (detaching) detach(section15);
			if (detaching) detach(t242);
			if (detaching) detach(section16);
			if (detaching) detach(t252);
			if (detaching) detach(section17);
			if (detaching) detach(t279);
			if (detaching) detach(section18);
			if (detaching) detach(t293);
			if (detaching) detach(section19);
		}
	};
}

function create_fragment$3(ctx) {
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

	layout_mdsvex_default = new Blog({ props: layout_mdsvex_default_props });

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
	"title": "Super Silly Hackathon 2019",
	"date": "2019-12-14T08:00:00Z",
	"lastUpdated": "2019-12-15T15:19:00Z",
	"description": "A quick walkthrough on how I created my pet in the browser for the Super Silly Hackathon 2019.",
	"tags": ["JavaScript", "blog", "hackathon"],
	"series": "Hackathon Projects",
	"slug": "super-silly-hackathon-2019",
	"type": "blog"
};

class Page_markup extends SvelteComponent {
	constructor(options) {
		super();
		init(this, options, null, create_fragment$3, safe_not_equal, {});
	}
}

const app = new Page_markup({
  target: document.querySelector('#app'),
  hydrate: true,
});
