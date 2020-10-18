function noop() { }
const identity = x => x;
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
function action_destroyer(action_result) {
    return action_result && is_function(action_result.destroy) ? action_result.destroy : noop;
}

const is_client = typeof window !== 'undefined';
let now = is_client
    ? () => window.performance.now()
    : () => Date.now();
let raf = is_client ? cb => requestAnimationFrame(cb) : noop;

const tasks = new Set();
function run_tasks(now) {
    tasks.forEach(task => {
        if (!task.c(now)) {
            tasks.delete(task);
            task.f();
        }
    });
    if (tasks.size !== 0)
        raf(run_tasks);
}
/**
 * Creates a new task that runs on each raf frame
 * until it returns a falsy value or is aborted
 */
function loop(callback) {
    let task;
    if (tasks.size === 0)
        raf(run_tasks);
    return {
        promise: new Promise(fulfill => {
            tasks.add(task = { c: callback, f: fulfill });
        }),
        abort() {
            tasks.delete(task);
        }
    };
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
function to_number(value) {
    return value === '' ? undefined : +value;
}
function children(element) {
    return Array.from(element.childNodes);
}
function set_data(text, data) {
    data = '' + data;
    if (text.wholeText !== data)
        text.data = data;
}
function set_input_value(input, value) {
    input.value = value == null ? '' : value;
}
function set_style(node, key, value, important) {
    node.style.setProperty(key, value, important ? 'important' : '');
}
function select_option(select, value) {
    for (let i = 0; i < select.options.length; i += 1) {
        const option = select.options[i];
        if (option.__value === value) {
            option.selected = true;
            return;
        }
    }
}
function select_value(select) {
    const selected_option = select.querySelector(':checked') || select.options[0];
    return selected_option && selected_option.__value;
}
function toggle_class(element, name, toggle) {
    element.classList[toggle ? 'add' : 'remove'](name);
}
function custom_event(type, detail) {
    const e = document.createEvent('CustomEvent');
    e.initCustomEvent(type, false, false, detail);
    return e;
}

const active_docs = new Set();
let active = 0;
// https://github.com/darkskyapp/string-hash/blob/master/index.js
function hash(str) {
    let hash = 5381;
    let i = str.length;
    while (i--)
        hash = ((hash << 5) - hash) ^ str.charCodeAt(i);
    return hash >>> 0;
}
function create_rule(node, a, b, duration, delay, ease, fn, uid = 0) {
    const step = 16.666 / duration;
    let keyframes = '{\n';
    for (let p = 0; p <= 1; p += step) {
        const t = a + (b - a) * ease(p);
        keyframes += p * 100 + `%{${fn(t, 1 - t)}}\n`;
    }
    const rule = keyframes + `100% {${fn(b, 1 - b)}}\n}`;
    const name = `__svelte_${hash(rule)}_${uid}`;
    const doc = node.ownerDocument;
    active_docs.add(doc);
    const stylesheet = doc.__svelte_stylesheet || (doc.__svelte_stylesheet = doc.head.appendChild(element('style')).sheet);
    const current_rules = doc.__svelte_rules || (doc.__svelte_rules = {});
    if (!current_rules[name]) {
        current_rules[name] = true;
        stylesheet.insertRule(`@keyframes ${name} ${rule}`, stylesheet.cssRules.length);
    }
    const animation = node.style.animation || '';
    node.style.animation = `${animation ? `${animation}, ` : ``}${name} ${duration}ms linear ${delay}ms 1 both`;
    active += 1;
    return name;
}
function delete_rule(node, name) {
    const previous = (node.style.animation || '').split(', ');
    const next = previous.filter(name
        ? anim => anim.indexOf(name) < 0 // remove specific animation
        : anim => anim.indexOf('__svelte') === -1 // remove all Svelte animations
    );
    const deleted = previous.length - next.length;
    if (deleted) {
        node.style.animation = next.join(', ');
        active -= deleted;
        if (!active)
            clear_rules();
    }
}
function clear_rules() {
    raf(() => {
        if (active)
            return;
        active_docs.forEach(doc => {
            const stylesheet = doc.__svelte_stylesheet;
            let i = stylesheet.cssRules.length;
            while (i--)
                stylesheet.deleteRule(i);
            doc.__svelte_rules = {};
        });
        active_docs.clear();
    });
}

let current_component;
function set_current_component(component) {
    current_component = component;
}
function get_current_component() {
    if (!current_component)
        throw new Error(`Function called outside component initialization`);
    return current_component;
}
function onDestroy(fn) {
    get_current_component().$$.on_destroy.push(fn);
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

let promise;
function wait() {
    if (!promise) {
        promise = Promise.resolve();
        promise.then(() => {
            promise = null;
        });
    }
    return promise;
}
function dispatch(node, direction, kind) {
    node.dispatchEvent(custom_event(`${direction ? 'intro' : 'outro'}${kind}`));
}
const outroing = new Set();
let outros;
function group_outros() {
    outros = {
        r: 0,
        c: [],
        p: outros // parent group
    };
}
function check_outros() {
    if (!outros.r) {
        run_all(outros.c);
    }
    outros = outros.p;
}
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
const null_transition = { duration: 0 };
function create_in_transition(node, fn, params) {
    let config = fn(node, params);
    let running = false;
    let animation_name;
    let task;
    let uid = 0;
    function cleanup() {
        if (animation_name)
            delete_rule(node, animation_name);
    }
    function go() {
        const { delay = 0, duration = 300, easing = identity, tick = noop, css } = config || null_transition;
        if (css)
            animation_name = create_rule(node, 0, 1, duration, delay, easing, css, uid++);
        tick(0, 1);
        const start_time = now() + delay;
        const end_time = start_time + duration;
        if (task)
            task.abort();
        running = true;
        add_render_callback(() => dispatch(node, true, 'start'));
        task = loop(now => {
            if (running) {
                if (now >= end_time) {
                    tick(1, 0);
                    dispatch(node, true, 'end');
                    cleanup();
                    return running = false;
                }
                if (now >= start_time) {
                    const t = easing((now - start_time) / duration);
                    tick(t, 1 - t);
                }
            }
            return running;
        });
    }
    let started = false;
    return {
        start() {
            if (started)
                return;
            delete_rule(node);
            if (is_function(config)) {
                config = config();
                wait().then(go);
            }
            else {
                go();
            }
        },
        invalidate() {
            started = false;
        },
        end() {
            if (running) {
                cleanup();
                running = false;
            }
        }
    };
}
function create_out_transition(node, fn, params) {
    let config = fn(node, params);
    let running = true;
    let animation_name;
    const group = outros;
    group.r += 1;
    function go() {
        const { delay = 0, duration = 300, easing = identity, tick = noop, css } = config || null_transition;
        if (css)
            animation_name = create_rule(node, 1, 0, duration, delay, easing, css);
        const start_time = now() + delay;
        const end_time = start_time + duration;
        add_render_callback(() => dispatch(node, false, 'start'));
        loop(now => {
            if (running) {
                if (now >= end_time) {
                    tick(0, 1);
                    dispatch(node, false, 'end');
                    if (!--group.r) {
                        // this will result in `end()` being called,
                        // so we don't need to clean up here
                        run_all(group.c);
                    }
                    return false;
                }
                if (now >= start_time) {
                    const t = easing((now - start_time) / duration);
                    tick(1 - t, t);
                }
            }
            return running;
        });
    }
    if (is_function(config)) {
        wait().then(() => {
            // @ts-ignore
            config = config();
            go();
        });
    }
    else {
        go();
    }
    return {
        end(reset) {
            if (reset && config.tick) {
                config.tick(1, 0);
            }
            if (running) {
                if (animation_name)
                    delete_rule(node, animation_name);
                running = false;
            }
        }
    };
}
function create_bidirectional_transition(node, fn, params, intro) {
    let config = fn(node, params);
    let t = intro ? 0 : 1;
    let running_program = null;
    let pending_program = null;
    let animation_name = null;
    function clear_animation() {
        if (animation_name)
            delete_rule(node, animation_name);
    }
    function init(program, duration) {
        const d = program.b - t;
        duration *= Math.abs(d);
        return {
            a: t,
            b: program.b,
            d,
            duration,
            start: program.start,
            end: program.start + duration,
            group: program.group
        };
    }
    function go(b) {
        const { delay = 0, duration = 300, easing = identity, tick = noop, css } = config || null_transition;
        const program = {
            start: now() + delay,
            b
        };
        if (!b) {
            // @ts-ignore todo: improve typings
            program.group = outros;
            outros.r += 1;
        }
        if (running_program) {
            pending_program = program;
        }
        else {
            // if this is an intro, and there's a delay, we need to do
            // an initial tick and/or apply CSS animation immediately
            if (css) {
                clear_animation();
                animation_name = create_rule(node, t, b, duration, delay, easing, css);
            }
            if (b)
                tick(0, 1);
            running_program = init(program, duration);
            add_render_callback(() => dispatch(node, b, 'start'));
            loop(now => {
                if (pending_program && now > pending_program.start) {
                    running_program = init(pending_program, duration);
                    pending_program = null;
                    dispatch(node, running_program.b, 'start');
                    if (css) {
                        clear_animation();
                        animation_name = create_rule(node, t, running_program.b, running_program.duration, 0, easing, config.css);
                    }
                }
                if (running_program) {
                    if (now >= running_program.end) {
                        tick(t = running_program.b, 1 - t);
                        dispatch(node, running_program.b, 'end');
                        if (!pending_program) {
                            // we're done
                            if (running_program.b) {
                                // intro — we can tidy up immediately
                                clear_animation();
                            }
                            else {
                                // outro — needs to be coordinated
                                if (!--running_program.group.r)
                                    run_all(running_program.group.c);
                            }
                        }
                        running_program = null;
                    }
                    else if (now >= running_program.start) {
                        const p = now - running_program.start;
                        t = running_program.a + running_program.d * easing(p / running_program.duration);
                        tick(t, 1 - t);
                    }
                }
                return !!(running_program || pending_program);
            });
        }
    }
    return {
        run(b) {
            if (is_function(config)) {
                wait().then(() => {
                    // @ts-ignore
                    config = config();
                    go(b);
                });
            }
            else {
                go(b);
            }
        },
        end() {
            clear_animation();
            running_program = pending_program = null;
        }
    };
}

const globals = (typeof window !== 'undefined'
    ? window
    : typeof globalThis !== 'undefined'
        ? globalThis
        : global);
function outro_and_destroy_block(block, lookup) {
    transition_out(block, 1, 1, () => {
        lookup.delete(block.key);
    });
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

function bounceOut(t) {
    const a = 4.0 / 11.0;
    const b = 8.0 / 11.0;
    const c = 9.0 / 10.0;
    const ca = 4356.0 / 361.0;
    const cb = 35442.0 / 1805.0;
    const cc = 16061.0 / 1805.0;
    const t2 = t * t;
    return t < a
        ? 7.5625 * t2
        : t < b
            ? 9.075 * t2 - 9.9 * t + 3.4
            : t < c
                ? ca * t2 - cb * t + cc
                : 10.8 * t * t - 20.52 * t + 10.72;
}
function bounceInOut(t) {
    return t < 0.5
        ? 0.5 * (1.0 - bounceOut(1.0 - t * 2.0))
        : 0.5 * bounceOut(t * 2.0 - 1.0) + 0.5;
}
function bounceIn(t) {
    return 1.0 - bounceOut(1.0 - t);
}
function cubicInOut(t) {
    return t < 0.5 ? 4.0 * t * t * t : 0.5 * Math.pow(2.0 * t - 2.0, 3.0) + 1.0;
}
function cubicIn(t) {
    return t * t * t;
}
function cubicOut(t) {
    const f = t - 1.0;
    return f * f * f + 1.0;
}
function quadInOut(t) {
    t /= 0.5;
    if (t < 1)
        return 0.5 * t * t;
    t--;
    return -0.5 * (t * (t - 2) - 1);
}
function quadIn(t) {
    return t * t;
}
function quadOut(t) {
    return -t * (t - 2.0);
}
function quartInOut(t) {
    return t < 0.5
        ? +8.0 * Math.pow(t, 4.0)
        : -8.0 * Math.pow(t - 1.0, 4.0) + 1.0;
}
function quartIn(t) {
    return Math.pow(t, 4.0);
}
function quartOut(t) {
    return Math.pow(t - 1.0, 3.0) * (1.0 - t) + 1.0;
}

function blur(node, { delay = 0, duration = 400, easing = cubicInOut, amount = 5, opacity = 0 }) {
    const style = getComputedStyle(node);
    const target_opacity = +style.opacity;
    const f = style.filter === 'none' ? '' : style.filter;
    const od = target_opacity * (1 - opacity);
    return {
        delay,
        duration,
        easing,
        css: (_t, u) => `opacity: ${target_opacity - (od * u)}; filter: ${f} blur(${u * amount}px);`
    };
}
function fade(node, { delay = 0, duration = 400, easing = identity }) {
    const o = +getComputedStyle(node).opacity;
    return {
        delay,
        duration,
        easing,
        css: t => `opacity: ${t * o}`
    };
}
function fly(node, { delay = 0, duration = 400, easing = cubicOut, x = 0, y = 0, opacity = 0 }) {
    const style = getComputedStyle(node);
    const target_opacity = +style.opacity;
    const transform = style.transform === 'none' ? '' : style.transform;
    const od = target_opacity * (1 - opacity);
    return {
        delay,
        duration,
        easing,
        css: (t, u) => `
			transform: ${transform} translate(${(1 - t) * x}px, ${(1 - t) * y}px);
			opacity: ${target_opacity - (od * u)}`
    };
}
function slide(node, { delay = 0, duration = 400, easing = cubicOut }) {
    const style = getComputedStyle(node);
    const opacity = +style.opacity;
    const height = parseFloat(style.height);
    const padding_top = parseFloat(style.paddingTop);
    const padding_bottom = parseFloat(style.paddingBottom);
    const margin_top = parseFloat(style.marginTop);
    const margin_bottom = parseFloat(style.marginBottom);
    const border_top_width = parseFloat(style.borderTopWidth);
    const border_bottom_width = parseFloat(style.borderBottomWidth);
    return {
        delay,
        duration,
        easing,
        css: t => `overflow: hidden;` +
            `opacity: ${Math.min(t * 20, 1) * opacity};` +
            `height: ${t * height}px;` +
            `padding-top: ${t * padding_top}px;` +
            `padding-bottom: ${t * padding_bottom}px;` +
            `margin-top: ${t * margin_top}px;` +
            `margin-bottom: ${t * margin_bottom}px;` +
            `border-top-width: ${t * border_top_width}px;` +
            `border-bottom-width: ${t * border_bottom_width}px;`
    };
}
function scale(node, { delay = 0, duration = 400, easing = cubicOut, start = 0, opacity = 0 }) {
    const style = getComputedStyle(node);
    const target_opacity = +style.opacity;
    const transform = style.transform === 'none' ? '' : style.transform;
    const sd = 1 - start;
    const od = target_opacity * (1 - opacity);
    return {
        delay,
        duration,
        easing,
        css: (_t, u) => `
			transform: ${transform} scale(${1 - (sd * u)});
			opacity: ${target_opacity - (od * u)}
		`
    };
}

/* @@slides0.svelte generated by Svelte v3.24.0 */

function add_css() {
	var style = element("style");
	style.id = "svelte-kb1uhf-style";
	style.textContent = "h1.svelte-kb1uhf{display:grid;place-content:center;height:100%;margin:0}button.svelte-kb1uhf{background:#308cce;transition:all ease-in-out 500ms;color:white;position:fixed;bottom:100px;left:50%;transform:translateX(-50%);padding:20px 40px;font-size:22px;border-radius:8px;outline:none;border:0;animation:svelte-kb1uhf-zoom ease-in-out 2s alternate infinite both;cursor:pointer}button.svelte-kb1uhf:hover{background:#5830ce}@keyframes svelte-kb1uhf-zoom{0%{transform:translateX(-50%) scale(1);background:#308cce;box-shadow:2px 8px 15px 4px #ccc}100%{transform:translateX(-50%) scale(0.9);background:#5830ce;box-shadow:0px 0px 0px 0px #ccc}}";
	append(document.head, style);
}

// (1:0) {#if i === 2}
function create_if_block_1(ctx) {
	let h1;
	let h1_transition;
	let current;

	return {
		c() {
			h1 = element("h1");
			h1.textContent = "🚀 Demystifying Transitions";
			attr(h1, "class", "svelte-kb1uhf");
		},
		m(target, anchor) {
			insert(target, h1, anchor);
			current = true;
		},
		i(local) {
			if (current) return;

			add_render_callback(() => {
				if (!h1_transition) h1_transition = create_bidirectional_transition(
					h1,
					scale,
					{
						easing: bounceOut,
						duration: 3000,
						delay: 900
					},
					true
				);

				h1_transition.run(1);
			});

			current = true;
		},
		o(local) {
			if (!h1_transition) h1_transition = create_bidirectional_transition(
				h1,
				scale,
				{
					easing: bounceOut,
					duration: 3000,
					delay: 900
				},
				false
			);

			h1_transition.run(0);
			current = false;
		},
		d(detaching) {
			if (detaching) detach(h1);
			if (detaching && h1_transition) h1_transition.end();
		}
	};
}

// (3:0) {#if i === 1}
function create_if_block(ctx) {
	let button;
	let button_intro;
	let button_outro;
	let current;
	let mounted;
	let dispose;

	return {
		c() {
			button = element("button");
			button.textContent = "Click Me";
			attr(button, "class", "svelte-kb1uhf");
		},
		m(target, anchor) {
			insert(target, button, anchor);
			current = true;

			if (!mounted) {
				dispose = listen(button, "click", /*click_handler*/ ctx[3]);
				mounted = true;
			}
		},
		p: noop,
		i(local) {
			if (current) return;

			add_render_callback(() => {
				if (button_outro) button_outro.end(1);
				if (!button_intro) button_intro = create_in_transition(button, scale, { easing: quadInOut });
				button_intro.start();
			});

			current = true;
		},
		o(local) {
			if (button_intro) button_intro.invalidate();

			button_outro = create_out_transition(button, fly$1, {
				easing: bounceOut,
				duration: 1200,
				y: -200
			});

			current = false;
		},
		d(detaching) {
			if (detaching) detach(button);
			if (detaching && button_outro) button_outro.end();
			mounted = false;
			dispose();
		}
	};
}

function create_fragment(ctx) {
	let t;
	let if_block1_anchor;
	let current;
	let if_block0 = /*i*/ ctx[0] === 2 && create_if_block_1();
	let if_block1 = /*i*/ ctx[0] === 1 && create_if_block(ctx);

	return {
		c() {
			if (if_block0) if_block0.c();
			t = space();
			if (if_block1) if_block1.c();
			if_block1_anchor = empty();
		},
		m(target, anchor) {
			if (if_block0) if_block0.m(target, anchor);
			insert(target, t, anchor);
			if (if_block1) if_block1.m(target, anchor);
			insert(target, if_block1_anchor, anchor);
			current = true;
		},
		p(ctx, [dirty]) {
			if (/*i*/ ctx[0] === 2) {
				if (if_block0) {
					if (dirty & /*i*/ 1) {
						transition_in(if_block0, 1);
					}
				} else {
					if_block0 = create_if_block_1();
					if_block0.c();
					transition_in(if_block0, 1);
					if_block0.m(t.parentNode, t);
				}
			} else if (if_block0) {
				group_outros();

				transition_out(if_block0, 1, 1, () => {
					if_block0 = null;
				});

				check_outros();
			}

			if (/*i*/ ctx[0] === 1) {
				if (if_block1) {
					if_block1.p(ctx, dirty);

					if (dirty & /*i*/ 1) {
						transition_in(if_block1, 1);
					}
				} else {
					if_block1 = create_if_block(ctx);
					if_block1.c();
					transition_in(if_block1, 1);
					if_block1.m(if_block1_anchor.parentNode, if_block1_anchor);
				}
			} else if (if_block1) {
				group_outros();

				transition_out(if_block1, 1, 1, () => {
					if_block1 = null;
				});

				check_outros();
			}
		},
		i(local) {
			if (current) return;
			transition_in(if_block0);
			transition_in(if_block1);
			current = true;
		},
		o(local) {
			transition_out(if_block0);
			transition_out(if_block1);
			current = false;
		},
		d(detaching) {
			if (if_block0) if_block0.d(detaching);
			if (detaching) detach(t);
			if (if_block1) if_block1.d(detaching);
			if (detaching) detach(if_block1_anchor);
		}
	};
}

function fly$1(node, params) {
	return {
		delay: params.delay,
		duration: params.duration,
		easing: params.easing,
		css(t, u) {
			return `transform: translateX(-50%) translateY(${u * params.y}px) scale(${t})`;
		}
	};
}

function instance($$self, $$props, $$invalidate) {
	let i = 0;

	function next() {
		if (i === 2) return false;
		$$invalidate(0, i++, i);
		return true;
	}

	function prev() {
		if (i === 0) return false;
		$$invalidate(0, i--, i);
		return true;
	}

	const click_handler = () => $$invalidate(0, i = 2);
	return [i, next, prev, click_handler];
}

class Slides0 extends SvelteComponent {
	constructor(options) {
		super();
		if (!document.getElementById("svelte-kb1uhf-style")) add_css();
		init(this, options, instance, create_fragment, safe_not_equal, { next: 1, prev: 2 });
	}

	get next() {
		return this.$$.ctx[1];
	}

	get prev() {
		return this.$$.ctx[2];
	}
}

/* @@slides1.svelte generated by Svelte v3.24.0 */

function add_css$1() {
	var style = element("style");
	style.id = "svelte-1h90ifj-style";
	style.textContent = ".container.svelte-1h90ifj.svelte-1h90ifj{display:grid;place-content:center;height:100%}.container.svelte-1h90ifj>div.svelte-1h90ifj{margin:20px 0;font-size:42px;position:relative}.placeholder.svelte-1h90ifj.svelte-1h90ifj{opacity:0}.actual.svelte-1h90ifj.svelte-1h90ifj{position:absolute;top:0}";
	append(document.head, style);
}

// (4:4) {#if i >= 1}
function create_if_block_2(ctx) {
	let div;
	let div_transition;
	let current;

	return {
		c() {
			div = element("div");
			div.innerHTML = `🚴‍♂️  Level 1️⃣  - Using <code>transition:</code>`;
			attr(div, "class", "actual svelte-1h90ifj");
		},
		m(target, anchor) {
			insert(target, div, anchor);
			current = true;
		},
		i(local) {
			if (current) return;

			add_render_callback(() => {
				if (!div_transition) div_transition = create_bidirectional_transition(div, blur, {}, true);
				div_transition.run(1);
			});

			current = true;
		},
		o(local) {
			if (!div_transition) div_transition = create_bidirectional_transition(div, blur, {}, false);
			div_transition.run(0);
			current = false;
		},
		d(detaching) {
			if (detaching) detach(div);
			if (detaching && div_transition) div_transition.end();
		}
	};
}

// (8:4) {#if i >= 2}
function create_if_block_1$1(ctx) {
	let div;
	let div_transition;
	let current;

	return {
		c() {
			div = element("div");
			div.innerHTML = `🚗  Level 2️⃣  - The <code>transition:</code> contract`;
			attr(div, "class", "actual svelte-1h90ifj");
		},
		m(target, anchor) {
			insert(target, div, anchor);
			current = true;
		},
		i(local) {
			if (current) return;

			add_render_callback(() => {
				if (!div_transition) div_transition = create_bidirectional_transition(div, slide, {}, true);
				div_transition.run(1);
			});

			current = true;
		},
		o(local) {
			if (!div_transition) div_transition = create_bidirectional_transition(div, slide, {}, false);
			div_transition.run(0);
			current = false;
		},
		d(detaching) {
			if (detaching) detach(div);
			if (detaching && div_transition) div_transition.end();
		}
	};
}

// (12:4) {#if i >= 3}
function create_if_block$1(ctx) {
	let div;
	let div_transition;
	let current;

	return {
		c() {
			div = element("div");
			div.innerHTML = `🚀  Level 3️⃣  - Compile <code>transition:</code> in your Head`;
			attr(div, "class", "actual svelte-1h90ifj");
		},
		m(target, anchor) {
			insert(target, div, anchor);
			current = true;
		},
		i(local) {
			if (current) return;

			add_render_callback(() => {
				if (!div_transition) div_transition = create_bidirectional_transition(div, fly, { y: 30 }, true);
				div_transition.run(1);
			});

			current = true;
		},
		o(local) {
			if (!div_transition) div_transition = create_bidirectional_transition(div, fly, { y: 30 }, false);
			div_transition.run(0);
			current = false;
		},
		d(detaching) {
			if (detaching) detach(div);
			if (detaching && div_transition) div_transition.end();
		}
	};
}

function create_fragment$1(ctx) {
	let div6;
	let div1;
	let div0;
	let t2;
	let t3;
	let div3;
	let div2;
	let t7;
	let t8;
	let div5;
	let div4;
	let t12;
	let current;
	let if_block0 = /*i*/ ctx[0] >= 1 && create_if_block_2();
	let if_block1 = /*i*/ ctx[0] >= 2 && create_if_block_1$1();
	let if_block2 = /*i*/ ctx[0] >= 3 && create_if_block$1();

	return {
		c() {
			div6 = element("div");
			div1 = element("div");
			div0 = element("div");
			div0.innerHTML = `🚴‍♂️  Level 1️⃣  - Using <code>transition:</code>`;
			t2 = space();
			if (if_block0) if_block0.c();
			t3 = space();
			div3 = element("div");
			div2 = element("div");
			div2.innerHTML = `🚗  Level 2️⃣  - The <code>transition:</code> contract`;
			t7 = space();
			if (if_block1) if_block1.c();
			t8 = space();
			div5 = element("div");
			div4 = element("div");
			div4.innerHTML = `🚀  Level 3️⃣  - Compile <code>transition:</code> in your Head`;
			t12 = space();
			if (if_block2) if_block2.c();
			attr(div0, "class", "placeholder svelte-1h90ifj");
			attr(div1, "class", "svelte-1h90ifj");
			attr(div2, "class", "placeholder svelte-1h90ifj");
			attr(div3, "class", "svelte-1h90ifj");
			attr(div4, "class", "placeholder svelte-1h90ifj");
			attr(div5, "class", "svelte-1h90ifj");
			attr(div6, "class", "container svelte-1h90ifj");
		},
		m(target, anchor) {
			insert(target, div6, anchor);
			append(div6, div1);
			append(div1, div0);
			append(div1, t2);
			if (if_block0) if_block0.m(div1, null);
			append(div6, t3);
			append(div6, div3);
			append(div3, div2);
			append(div3, t7);
			if (if_block1) if_block1.m(div3, null);
			append(div6, t8);
			append(div6, div5);
			append(div5, div4);
			append(div5, t12);
			if (if_block2) if_block2.m(div5, null);
			current = true;
		},
		p(ctx, [dirty]) {
			if (/*i*/ ctx[0] >= 1) {
				if (if_block0) {
					if (dirty & /*i*/ 1) {
						transition_in(if_block0, 1);
					}
				} else {
					if_block0 = create_if_block_2();
					if_block0.c();
					transition_in(if_block0, 1);
					if_block0.m(div1, null);
				}
			} else if (if_block0) {
				group_outros();

				transition_out(if_block0, 1, 1, () => {
					if_block0 = null;
				});

				check_outros();
			}

			if (/*i*/ ctx[0] >= 2) {
				if (if_block1) {
					if (dirty & /*i*/ 1) {
						transition_in(if_block1, 1);
					}
				} else {
					if_block1 = create_if_block_1$1();
					if_block1.c();
					transition_in(if_block1, 1);
					if_block1.m(div3, null);
				}
			} else if (if_block1) {
				group_outros();

				transition_out(if_block1, 1, 1, () => {
					if_block1 = null;
				});

				check_outros();
			}

			if (/*i*/ ctx[0] >= 3) {
				if (if_block2) {
					if (dirty & /*i*/ 1) {
						transition_in(if_block2, 1);
					}
				} else {
					if_block2 = create_if_block$1();
					if_block2.c();
					transition_in(if_block2, 1);
					if_block2.m(div5, null);
				}
			} else if (if_block2) {
				group_outros();

				transition_out(if_block2, 1, 1, () => {
					if_block2 = null;
				});

				check_outros();
			}
		},
		i(local) {
			if (current) return;
			transition_in(if_block0);
			transition_in(if_block1);
			transition_in(if_block2);
			current = true;
		},
		o(local) {
			transition_out(if_block0);
			transition_out(if_block1);
			transition_out(if_block2);
			current = false;
		},
		d(detaching) {
			if (detaching) detach(div6);
			if (if_block0) if_block0.d();
			if (if_block1) if_block1.d();
			if (if_block2) if_block2.d();
		}
	};
}

function instance$1($$self, $$props, $$invalidate) {
	let i = 0;

	function next() {
		if (i === 3) return false;
		$$invalidate(0, i++, i);
		return true;
	}

	function prev() {
		if (i === 0) return false;
		$$invalidate(0, i--, i);
		return true;
	}

	return [i, next, prev];
}

class Slides1 extends SvelteComponent {
	constructor(options) {
		super();
		if (!document.getElementById("svelte-1h90ifj-style")) add_css$1();
		init(this, options, instance$1, create_fragment$1, safe_not_equal, { next: 1, prev: 2 });
	}

	get next() {
		return this.$$.ctx[1];
	}

	get prev() {
		return this.$$.ctx[2];
	}
}

var profile = "./assets/profile-pic-eb3051d8.png";

var rojak = "./assets/penang-rojak-ccce8e1d.jpg";

var ckt = "./assets/koay-teow-311547c5.jpg";

/* @@slides2.svelte generated by Svelte v3.24.0 */

function add_css$2() {
	var style = element("style");
	style.id = "svelte-1l0c6ie-style";
	style.textContent = "img.svelte-1l0c6ie.svelte-1l0c6ie{height:256px;margin-top:32px}p.svelte-1l0c6ie.svelte-1l0c6ie{text-align:center}ul.svelte-1l0c6ie.svelte-1l0c6ie{margin:40px auto;display:block;width:520px}.ckt.svelte-1l0c6ie.svelte-1l0c6ie,.rojak.svelte-1l0c6ie.svelte-1l0c6ie{transition:200ms ease-in}.ckt.svelte-1l0c6ie.svelte-1l0c6ie{position:fixed;top:0;font-size:10px;z-index:1}.ckt.svelte-1l0c6ie img.svelte-1l0c6ie{height:450px}.rojak.svelte-1l0c6ie.svelte-1l0c6ie{position:fixed;top:0;right:32px;font-size:10px;z-index:1}.rojak.svelte-1l0c6ie img.svelte-1l0c6ie{height:320px}";
	append(document.head, style);
}

function create_fragment$2(ctx) {
	let img0;
	let img0_src_value;
	let t0;
	let p;
	let t2;
	let ul;
	let t8;
	let div1;
	let img1;
	let img1_src_value;
	let t9;
	let div0;
	let t11;
	let div3;
	let img2;
	let img2_src_value;
	let t12;
	let div2;

	return {
		c() {
			img0 = element("img");
			t0 = space();
			p = element("p");
			p.textContent = "@lihautan";
			t2 = space();
			ul = element("ul");

			ul.innerHTML = `<li>👨🏻‍💻 Frontend engineer at Shopee Singapore</li> 
<li>🇲🇾 Grew up in Penang, Malaysia</li> 
<li>🛠 Svelte Maintainer</li>`;

			t8 = space();
			div1 = element("div");
			img1 = element("img");
			t9 = space();
			div0 = element("div");
			div0.textContent = "Image credit: sidechef.com";
			t11 = space();
			div3 = element("div");
			img2 = element("img");
			t12 = space();
			div2 = element("div");
			div2.textContent = "Image credit: tripadvisor.com";
			if (img0.src !== (img0_src_value = profile)) attr(img0, "src", img0_src_value);
			attr(img0, "alt", "profile");
			attr(img0, "class", "svelte-1l0c6ie");
			attr(p, "class", "svelte-1l0c6ie");
			attr(ul, "class", "svelte-1l0c6ie");
			if (img1.src !== (img1_src_value = ckt)) attr(img1, "src", img1_src_value);
			attr(img1, "alt", "char koay teow");
			attr(img1, "class", "svelte-1l0c6ie");
			attr(div1, "class", "ckt svelte-1l0c6ie");
			toggle_class(div1, "hidden", /*index*/ ctx[0] < 1 || /*index*/ ctx[0] >= 3);
			if (img2.src !== (img2_src_value = rojak)) attr(img2, "src", img2_src_value);
			attr(img2, "alt", "rojak");
			attr(img2, "class", "svelte-1l0c6ie");
			attr(div3, "class", "rojak svelte-1l0c6ie");
			toggle_class(div3, "hidden", /*index*/ ctx[0] < 2 || /*index*/ ctx[0] >= 3);
		},
		m(target, anchor) {
			insert(target, img0, anchor);
			insert(target, t0, anchor);
			insert(target, p, anchor);
			insert(target, t2, anchor);
			insert(target, ul, anchor);
			insert(target, t8, anchor);
			insert(target, div1, anchor);
			append(div1, img1);
			append(div1, t9);
			append(div1, div0);
			insert(target, t11, anchor);
			insert(target, div3, anchor);
			append(div3, img2);
			append(div3, t12);
			append(div3, div2);
		},
		p(ctx, [dirty]) {
			if (dirty & /*index*/ 1) {
				toggle_class(div1, "hidden", /*index*/ ctx[0] < 1 || /*index*/ ctx[0] >= 3);
			}

			if (dirty & /*index*/ 1) {
				toggle_class(div3, "hidden", /*index*/ ctx[0] < 2 || /*index*/ ctx[0] >= 3);
			}
		},
		i: noop,
		o: noop,
		d(detaching) {
			if (detaching) detach(img0);
			if (detaching) detach(t0);
			if (detaching) detach(p);
			if (detaching) detach(t2);
			if (detaching) detach(ul);
			if (detaching) detach(t8);
			if (detaching) detach(div1);
			if (detaching) detach(t11);
			if (detaching) detach(div3);
		}
	};
}

function instance$2($$self, $$props, $$invalidate) {
	let index = 0;

	function next() {
		if (index === 3) return false;
		$$invalidate(0, index++, index);
		return true;
	}

	function prev() {
		if (index === 0) return false;
		$$invalidate(0, index--, index);
		return true;
	}

	return [index, next, prev];
}

class Slides2 extends SvelteComponent {
	constructor(options) {
		super();
		if (!document.getElementById("svelte-1l0c6ie-style")) add_css$2();
		init(this, options, instance$2, create_fragment$2, safe_not_equal, { next: 1, prev: 2 });
	}

	get next() {
		return this.$$.ctx[1];
	}

	get prev() {
		return this.$$.ctx[2];
	}
}

/* @@slides3.svelte generated by Svelte v3.24.0 */

function add_css$3() {
	var style = element("style");
	style.id = "svelte-11o4zfu-style";
	style.textContent = "div.svelte-11o4zfu{display:grid;place-content:center;height:100%}h1.svelte-11o4zfu{margin:0}";
	append(document.head, style);
}

function create_fragment$3(ctx) {
	let div;

	return {
		c() {
			div = element("div");
			div.innerHTML = `<h1 class="svelte-11o4zfu">🚴‍♂️ 1️⃣  Using <code>transition:</code></h1>`;
			attr(div, "class", "svelte-11o4zfu");
		},
		m(target, anchor) {
			insert(target, div, anchor);
		},
		p: noop,
		i: noop,
		o: noop,
		d(detaching) {
			if (detaching) detach(div);
		}
	};
}

class Slides3 extends SvelteComponent {
	constructor(options) {
		super();
		if (!document.getElementById("svelte-11o4zfu-style")) add_css$3();
		init(this, options, null, create_fragment$3, safe_not_equal, {});
	}
}

var commonjsGlobal = typeof globalThis !== 'undefined' ? globalThis : typeof window !== 'undefined' ? window : typeof global !== 'undefined' ? global : typeof self !== 'undefined' ? self : {};

function createCommonjsModule(fn, basedir, module) {
	return module = {
	  path: basedir,
	  exports: {},
	  require: function (path, base) {
      return commonjsRequire(path, (base === undefined || base === null) ? module.path : base);
    }
	}, fn(module, module.exports), module.exports;
}

function commonjsRequire () {
	throw new Error('Dynamic requires are not currently supported by @rollup/plugin-commonjs');
}

var prism = createCommonjsModule(function (module) {
/* **********************************************
     Begin prism-core.js
********************************************** */

/// <reference lib="WebWorker"/>

var _self = (typeof window !== 'undefined')
	? window   // if in browser
	: (
		(typeof WorkerGlobalScope !== 'undefined' && self instanceof WorkerGlobalScope)
		? self // if in worker
		: {}   // if in node js
	);

/**
 * Prism: Lightweight, robust, elegant syntax highlighting
 *
 * @license MIT <https://opensource.org/licenses/MIT>
 * @author Lea Verou <https://lea.verou.me>
 * @namespace
 * @public
 */
var Prism = (function (_self){

// Private helper vars
var lang = /\blang(?:uage)?-([\w-]+)\b/i;
var uniqueId = 0;


var _ = {
	/**
	 * By default, Prism will attempt to highlight all code elements (by calling {@link Prism.highlightAll}) on the
	 * current page after the page finished loading. This might be a problem if e.g. you wanted to asynchronously load
	 * additional languages or plugins yourself.
	 *
	 * By setting this value to `true`, Prism will not automatically highlight all code elements on the page.
	 *
	 * You obviously have to change this value before the automatic highlighting started. To do this, you can add an
	 * empty Prism object into the global scope before loading the Prism script like this:
	 *
	 * ```js
	 * window.Prism = window.Prism || {};
	 * Prism.manual = true;
	 * // add a new <script> to load Prism's script
	 * ```
	 *
	 * @default false
	 * @type {boolean}
	 * @memberof Prism
	 * @public
	 */
	manual: _self.Prism && _self.Prism.manual,
	disableWorkerMessageHandler: _self.Prism && _self.Prism.disableWorkerMessageHandler,

	/**
	 * A namespace for utility methods.
	 *
	 * All function in this namespace that are not explicitly marked as _public_ are for __internal use only__ and may
	 * change or disappear at any time.
	 *
	 * @namespace
	 * @memberof Prism
	 */
	util: {
		encode: function encode(tokens) {
			if (tokens instanceof Token) {
				return new Token(tokens.type, encode(tokens.content), tokens.alias);
			} else if (Array.isArray(tokens)) {
				return tokens.map(encode);
			} else {
				return tokens.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/\u00a0/g, ' ');
			}
		},

		/**
		 * Returns the name of the type of the given value.
		 *
		 * @param {any} o
		 * @returns {string}
		 * @example
		 * type(null)      === 'Null'
		 * type(undefined) === 'Undefined'
		 * type(123)       === 'Number'
		 * type('foo')     === 'String'
		 * type(true)      === 'Boolean'
		 * type([1, 2])    === 'Array'
		 * type({})        === 'Object'
		 * type(String)    === 'Function'
		 * type(/abc+/)    === 'RegExp'
		 */
		type: function (o) {
			return Object.prototype.toString.call(o).slice(8, -1);
		},

		/**
		 * Returns a unique number for the given object. Later calls will still return the same number.
		 *
		 * @param {Object} obj
		 * @returns {number}
		 */
		objId: function (obj) {
			if (!obj['__id']) {
				Object.defineProperty(obj, '__id', { value: ++uniqueId });
			}
			return obj['__id'];
		},

		/**
		 * Creates a deep clone of the given object.
		 *
		 * The main intended use of this function is to clone language definitions.
		 *
		 * @param {T} o
		 * @param {Record<number, any>} [visited]
		 * @returns {T}
		 * @template T
		 */
		clone: function deepClone(o, visited) {
			visited = visited || {};

			var clone, id;
			switch (_.util.type(o)) {
				case 'Object':
					id = _.util.objId(o);
					if (visited[id]) {
						return visited[id];
					}
					clone = /** @type {Record<string, any>} */ ({});
					visited[id] = clone;

					for (var key in o) {
						if (o.hasOwnProperty(key)) {
							clone[key] = deepClone(o[key], visited);
						}
					}

					return /** @type {any} */ (clone);

				case 'Array':
					id = _.util.objId(o);
					if (visited[id]) {
						return visited[id];
					}
					clone = [];
					visited[id] = clone;

					(/** @type {Array} */(/** @type {any} */(o))).forEach(function (v, i) {
						clone[i] = deepClone(v, visited);
					});

					return /** @type {any} */ (clone);

				default:
					return o;
			}
		},

		/**
		 * Returns the Prism language of the given element set by a `language-xxxx` or `lang-xxxx` class.
		 *
		 * If no language is set for the element or the element is `null` or `undefined`, `none` will be returned.
		 *
		 * @param {Element} element
		 * @returns {string}
		 */
		getLanguage: function (element) {
			while (element && !lang.test(element.className)) {
				element = element.parentElement;
			}
			if (element) {
				return (element.className.match(lang) || [, 'none'])[1].toLowerCase();
			}
			return 'none';
		},

		/**
		 * Returns the script element that is currently executing.
		 *
		 * This does __not__ work for line script element.
		 *
		 * @returns {HTMLScriptElement | null}
		 */
		currentScript: function () {
			if (typeof document === 'undefined') {
				return null;
			}
			if ('currentScript' in document && 1 < 2 /* hack to trip TS' flow analysis */) {
				return /** @type {any} */ (document.currentScript);
			}

			// IE11 workaround
			// we'll get the src of the current script by parsing IE11's error stack trace
			// this will not work for inline scripts

			try {
				throw new Error();
			} catch (err) {
				// Get file src url from stack. Specifically works with the format of stack traces in IE.
				// A stack will look like this:
				//
				// Error
				//    at _.util.currentScript (http://localhost/components/prism-core.js:119:5)
				//    at Global code (http://localhost/components/prism-core.js:606:1)

				var src = (/at [^(\r\n]*\((.*):.+:.+\)$/i.exec(err.stack) || [])[1];
				if (src) {
					var scripts = document.getElementsByTagName('script');
					for (var i in scripts) {
						if (scripts[i].src == src) {
							return scripts[i];
						}
					}
				}
				return null;
			}
		},

		/**
		 * Returns whether a given class is active for `element`.
		 *
		 * The class can be activated if `element` or one of its ancestors has the given class and it can be deactivated
		 * if `element` or one of its ancestors has the negated version of the given class. The _negated version_ of the
		 * given class is just the given class with a `no-` prefix.
		 *
		 * Whether the class is active is determined by the closest ancestor of `element` (where `element` itself is
		 * closest ancestor) that has the given class or the negated version of it. If neither `element` nor any of its
		 * ancestors have the given class or the negated version of it, then the default activation will be returned.
		 *
		 * In the paradoxical situation where the closest ancestor contains __both__ the given class and the negated
		 * version of it, the class is considered active.
		 *
		 * @param {Element} element
		 * @param {string} className
		 * @param {boolean} [defaultActivation=false]
		 * @returns {boolean}
		 */
		isActive: function (element, className, defaultActivation) {
			var no = 'no-' + className;

			while (element) {
				var classList = element.classList;
				if (classList.contains(className)) {
					return true;
				}
				if (classList.contains(no)) {
					return false;
				}
				element = element.parentElement;
			}
			return !!defaultActivation;
		}
	},

	/**
	 * This namespace contains all currently loaded languages and the some helper functions to create and modify languages.
	 *
	 * @namespace
	 * @memberof Prism
	 * @public
	 */
	languages: {
		/**
		 * Creates a deep copy of the language with the given id and appends the given tokens.
		 *
		 * If a token in `redef` also appears in the copied language, then the existing token in the copied language
		 * will be overwritten at its original position.
		 *
		 * ## Best practices
		 *
		 * Since the position of overwriting tokens (token in `redef` that overwrite tokens in the copied language)
		 * doesn't matter, they can technically be in any order. However, this can be confusing to others that trying to
		 * understand the language definition because, normally, the order of tokens matters in Prism grammars.
		 *
		 * Therefore, it is encouraged to order overwriting tokens according to the positions of the overwritten tokens.
		 * Furthermore, all non-overwriting tokens should be placed after the overwriting ones.
		 *
		 * @param {string} id The id of the language to extend. This has to be a key in `Prism.languages`.
		 * @param {Grammar} redef The new tokens to append.
		 * @returns {Grammar} The new language created.
		 * @public
		 * @example
		 * Prism.languages['css-with-colors'] = Prism.languages.extend('css', {
		 *     // Prism.languages.css already has a 'comment' token, so this token will overwrite CSS' 'comment' token
		 *     // at its original position
		 *     'comment': { ... },
		 *     // CSS doesn't have a 'color' token, so this token will be appended
		 *     'color': /\b(?:red|green|blue)\b/
		 * });
		 */
		extend: function (id, redef) {
			var lang = _.util.clone(_.languages[id]);

			for (var key in redef) {
				lang[key] = redef[key];
			}

			return lang;
		},

		/**
		 * Inserts tokens _before_ another token in a language definition or any other grammar.
		 *
		 * ## Usage
		 *
		 * This helper method makes it easy to modify existing languages. For example, the CSS language definition
		 * not only defines CSS highlighting for CSS documents, but also needs to define highlighting for CSS embedded
		 * in HTML through `<style>` elements. To do this, it needs to modify `Prism.languages.markup` and add the
		 * appropriate tokens. However, `Prism.languages.markup` is a regular JavaScript object literal, so if you do
		 * this:
		 *
		 * ```js
		 * Prism.languages.markup.style = {
		 *     // token
		 * };
		 * ```
		 *
		 * then the `style` token will be added (and processed) at the end. `insertBefore` allows you to insert tokens
		 * before existing tokens. For the CSS example above, you would use it like this:
		 *
		 * ```js
		 * Prism.languages.insertBefore('markup', 'cdata', {
		 *     'style': {
		 *         // token
		 *     }
		 * });
		 * ```
		 *
		 * ## Special cases
		 *
		 * If the grammars of `inside` and `insert` have tokens with the same name, the tokens in `inside`'s grammar
		 * will be ignored.
		 *
		 * This behavior can be used to insert tokens after `before`:
		 *
		 * ```js
		 * Prism.languages.insertBefore('markup', 'comment', {
		 *     'comment': Prism.languages.markup.comment,
		 *     // tokens after 'comment'
		 * });
		 * ```
		 *
		 * ## Limitations
		 *
		 * The main problem `insertBefore` has to solve is iteration order. Since ES2015, the iteration order for object
		 * properties is guaranteed to be the insertion order (except for integer keys) but some browsers behave
		 * differently when keys are deleted and re-inserted. So `insertBefore` can't be implemented by temporarily
		 * deleting properties which is necessary to insert at arbitrary positions.
		 *
		 * To solve this problem, `insertBefore` doesn't actually insert the given tokens into the target object.
		 * Instead, it will create a new object and replace all references to the target object with the new one. This
		 * can be done without temporarily deleting properties, so the iteration order is well-defined.
		 *
		 * However, only references that can be reached from `Prism.languages` or `insert` will be replaced. I.e. if
		 * you hold the target object in a variable, then the value of the variable will not change.
		 *
		 * ```js
		 * var oldMarkup = Prism.languages.markup;
		 * var newMarkup = Prism.languages.insertBefore('markup', 'comment', { ... });
		 *
		 * assert(oldMarkup !== Prism.languages.markup);
		 * assert(newMarkup === Prism.languages.markup);
		 * ```
		 *
		 * @param {string} inside The property of `root` (e.g. a language id in `Prism.languages`) that contains the
		 * object to be modified.
		 * @param {string} before The key to insert before.
		 * @param {Grammar} insert An object containing the key-value pairs to be inserted.
		 * @param {Object<string, any>} [root] The object containing `inside`, i.e. the object that contains the
		 * object to be modified.
		 *
		 * Defaults to `Prism.languages`.
		 * @returns {Grammar} The new grammar object.
		 * @public
		 */
		insertBefore: function (inside, before, insert, root) {
			root = root || /** @type {any} */ (_.languages);
			var grammar = root[inside];
			/** @type {Grammar} */
			var ret = {};

			for (var token in grammar) {
				if (grammar.hasOwnProperty(token)) {

					if (token == before) {
						for (var newToken in insert) {
							if (insert.hasOwnProperty(newToken)) {
								ret[newToken] = insert[newToken];
							}
						}
					}

					// Do not insert token which also occur in insert. See #1525
					if (!insert.hasOwnProperty(token)) {
						ret[token] = grammar[token];
					}
				}
			}

			var old = root[inside];
			root[inside] = ret;

			// Update references in other language definitions
			_.languages.DFS(_.languages, function(key, value) {
				if (value === old && key != inside) {
					this[key] = ret;
				}
			});

			return ret;
		},

		// Traverse a language definition with Depth First Search
		DFS: function DFS(o, callback, type, visited) {
			visited = visited || {};

			var objId = _.util.objId;

			for (var i in o) {
				if (o.hasOwnProperty(i)) {
					callback.call(o, i, o[i], type || i);

					var property = o[i],
					    propertyType = _.util.type(property);

					if (propertyType === 'Object' && !visited[objId(property)]) {
						visited[objId(property)] = true;
						DFS(property, callback, null, visited);
					}
					else if (propertyType === 'Array' && !visited[objId(property)]) {
						visited[objId(property)] = true;
						DFS(property, callback, i, visited);
					}
				}
			}
		}
	},

	plugins: {},

	/**
	 * This is the most high-level function in Prism’s API.
	 * It fetches all the elements that have a `.language-xxxx` class and then calls {@link Prism.highlightElement} on
	 * each one of them.
	 *
	 * This is equivalent to `Prism.highlightAllUnder(document, async, callback)`.
	 *
	 * @param {boolean} [async=false] Same as in {@link Prism.highlightAllUnder}.
	 * @param {HighlightCallback} [callback] Same as in {@link Prism.highlightAllUnder}.
	 * @memberof Prism
	 * @public
	 */
	highlightAll: function(async, callback) {
		_.highlightAllUnder(document, async, callback);
	},

	/**
	 * Fetches all the descendants of `container` that have a `.language-xxxx` class and then calls
	 * {@link Prism.highlightElement} on each one of them.
	 *
	 * The following hooks will be run:
	 * 1. `before-highlightall`
	 * 2. All hooks of {@link Prism.highlightElement} for each element.
	 *
	 * @param {ParentNode} container The root element, whose descendants that have a `.language-xxxx` class will be highlighted.
	 * @param {boolean} [async=false] Whether each element is to be highlighted asynchronously using Web Workers.
	 * @param {HighlightCallback} [callback] An optional callback to be invoked on each element after its highlighting is done.
	 * @memberof Prism
	 * @public
	 */
	highlightAllUnder: function(container, async, callback) {
		var env = {
			callback: callback,
			container: container,
			selector: 'code[class*="language-"], [class*="language-"] code, code[class*="lang-"], [class*="lang-"] code'
		};

		_.hooks.run('before-highlightall', env);

		env.elements = Array.prototype.slice.apply(env.container.querySelectorAll(env.selector));

		_.hooks.run('before-all-elements-highlight', env);

		for (var i = 0, element; element = env.elements[i++];) {
			_.highlightElement(element, async === true, env.callback);
		}
	},

	/**
	 * Highlights the code inside a single element.
	 *
	 * The following hooks will be run:
	 * 1. `before-sanity-check`
	 * 2. `before-highlight`
	 * 3. All hooks of {@link Prism.highlight}. These hooks will only be run by the current worker if `async` is `true`.
	 * 4. `before-insert`
	 * 5. `after-highlight`
	 * 6. `complete`
	 *
	 * @param {Element} element The element containing the code.
	 * It must have a class of `language-xxxx` to be processed, where `xxxx` is a valid language identifier.
	 * @param {boolean} [async=false] Whether the element is to be highlighted asynchronously using Web Workers
	 * to improve performance and avoid blocking the UI when highlighting very large chunks of code. This option is
	 * [disabled by default](https://prismjs.com/faq.html#why-is-asynchronous-highlighting-disabled-by-default).
	 *
	 * Note: All language definitions required to highlight the code must be included in the main `prism.js` file for
	 * asynchronous highlighting to work. You can build your own bundle on the
	 * [Download page](https://prismjs.com/download.html).
	 * @param {HighlightCallback} [callback] An optional callback to be invoked after the highlighting is done.
	 * Mostly useful when `async` is `true`, since in that case, the highlighting is done asynchronously.
	 * @memberof Prism
	 * @public
	 */
	highlightElement: function(element, async, callback) {
		// Find language
		var language = _.util.getLanguage(element);
		var grammar = _.languages[language];

		// Set language on the element, if not present
		element.className = element.className.replace(lang, '').replace(/\s+/g, ' ') + ' language-' + language;

		// Set language on the parent, for styling
		var parent = element.parentElement;
		if (parent && parent.nodeName.toLowerCase() === 'pre') {
			parent.className = parent.className.replace(lang, '').replace(/\s+/g, ' ') + ' language-' + language;
		}

		var code = element.textContent;

		var env = {
			element: element,
			language: language,
			grammar: grammar,
			code: code
		};

		function insertHighlightedCode(highlightedCode) {
			env.highlightedCode = highlightedCode;

			_.hooks.run('before-insert', env);

			env.element.innerHTML = env.highlightedCode;

			_.hooks.run('after-highlight', env);
			_.hooks.run('complete', env);
			callback && callback.call(env.element);
		}

		_.hooks.run('before-sanity-check', env);

		if (!env.code) {
			_.hooks.run('complete', env);
			callback && callback.call(env.element);
			return;
		}

		_.hooks.run('before-highlight', env);

		if (!env.grammar) {
			insertHighlightedCode(_.util.encode(env.code));
			return;
		}

		if (async && _self.Worker) {
			var worker = new Worker(_.filename);

			worker.onmessage = function(evt) {
				insertHighlightedCode(evt.data);
			};

			worker.postMessage(JSON.stringify({
				language: env.language,
				code: env.code,
				immediateClose: true
			}));
		}
		else {
			insertHighlightedCode(_.highlight(env.code, env.grammar, env.language));
		}
	},

	/**
	 * Low-level function, only use if you know what you’re doing. It accepts a string of text as input
	 * and the language definitions to use, and returns a string with the HTML produced.
	 *
	 * The following hooks will be run:
	 * 1. `before-tokenize`
	 * 2. `after-tokenize`
	 * 3. `wrap`: On each {@link Token}.
	 *
	 * @param {string} text A string with the code to be highlighted.
	 * @param {Grammar} grammar An object containing the tokens to use.
	 *
	 * Usually a language definition like `Prism.languages.markup`.
	 * @param {string} language The name of the language definition passed to `grammar`.
	 * @returns {string} The highlighted HTML.
	 * @memberof Prism
	 * @public
	 * @example
	 * Prism.highlight('var foo = true;', Prism.languages.javascript, 'javascript');
	 */
	highlight: function (text, grammar, language) {
		var env = {
			code: text,
			grammar: grammar,
			language: language
		};
		_.hooks.run('before-tokenize', env);
		env.tokens = _.tokenize(env.code, env.grammar);
		_.hooks.run('after-tokenize', env);
		return Token.stringify(_.util.encode(env.tokens), env.language);
	},

	/**
	 * This is the heart of Prism, and the most low-level function you can use. It accepts a string of text as input
	 * and the language definitions to use, and returns an array with the tokenized code.
	 *
	 * When the language definition includes nested tokens, the function is called recursively on each of these tokens.
	 *
	 * This method could be useful in other contexts as well, as a very crude parser.
	 *
	 * @param {string} text A string with the code to be highlighted.
	 * @param {Grammar} grammar An object containing the tokens to use.
	 *
	 * Usually a language definition like `Prism.languages.markup`.
	 * @returns {TokenStream} An array of strings and tokens, a token stream.
	 * @memberof Prism
	 * @public
	 * @example
	 * let code = `var foo = 0;`;
	 * let tokens = Prism.tokenize(code, Prism.languages.javascript);
	 * tokens.forEach(token => {
	 *     if (token instanceof Prism.Token && token.type === 'number') {
	 *         console.log(`Found numeric literal: ${token.content}`);
	 *     }
	 * });
	 */
	tokenize: function(text, grammar) {
		var rest = grammar.rest;
		if (rest) {
			for (var token in rest) {
				grammar[token] = rest[token];
			}

			delete grammar.rest;
		}

		var tokenList = new LinkedList();
		addAfter(tokenList, tokenList.head, text);

		matchGrammar(text, tokenList, grammar, tokenList.head, 0);

		return toArray(tokenList);
	},

	/**
	 * @namespace
	 * @memberof Prism
	 * @public
	 */
	hooks: {
		all: {},

		/**
		 * Adds the given callback to the list of callbacks for the given hook.
		 *
		 * The callback will be invoked when the hook it is registered for is run.
		 * Hooks are usually directly run by a highlight function but you can also run hooks yourself.
		 *
		 * One callback function can be registered to multiple hooks and the same hook multiple times.
		 *
		 * @param {string} name The name of the hook.
		 * @param {HookCallback} callback The callback function which is given environment variables.
		 * @public
		 */
		add: function (name, callback) {
			var hooks = _.hooks.all;

			hooks[name] = hooks[name] || [];

			hooks[name].push(callback);
		},

		/**
		 * Runs a hook invoking all registered callbacks with the given environment variables.
		 *
		 * Callbacks will be invoked synchronously and in the order in which they were registered.
		 *
		 * @param {string} name The name of the hook.
		 * @param {Object<string, any>} env The environment variables of the hook passed to all callbacks registered.
		 * @public
		 */
		run: function (name, env) {
			var callbacks = _.hooks.all[name];

			if (!callbacks || !callbacks.length) {
				return;
			}

			for (var i=0, callback; callback = callbacks[i++];) {
				callback(env);
			}
		}
	},

	Token: Token
};
_self.Prism = _;


// Typescript note:
// The following can be used to import the Token type in JSDoc:
//
//   @typedef {InstanceType<import("./prism-core")["Token"]>} Token

/**
 * Creates a new token.
 *
 * @param {string} type See {@link Token#type type}
 * @param {string | TokenStream} content See {@link Token#content content}
 * @param {string|string[]} [alias] The alias(es) of the token.
 * @param {string} [matchedStr=""] A copy of the full string this token was created from.
 * @class
 * @global
 * @public
 */
function Token(type, content, alias, matchedStr) {
	/**
	 * The type of the token.
	 *
	 * This is usually the key of a pattern in a {@link Grammar}.
	 *
	 * @type {string}
	 * @see GrammarToken
	 * @public
	 */
	this.type = type;
	/**
	 * The strings or tokens contained by this token.
	 *
	 * This will be a token stream if the pattern matched also defined an `inside` grammar.
	 *
	 * @type {string | TokenStream}
	 * @public
	 */
	this.content = content;
	/**
	 * The alias(es) of the token.
	 *
	 * @type {string|string[]}
	 * @see GrammarToken
	 * @public
	 */
	this.alias = alias;
	// Copy of the full string this token was created from
	this.length = (matchedStr || '').length | 0;
}

/**
 * A token stream is an array of strings and {@link Token Token} objects.
 *
 * Token streams have to fulfill a few properties that are assumed by most functions (mostly internal ones) that process
 * them.
 *
 * 1. No adjacent strings.
 * 2. No empty strings.
 *
 *    The only exception here is the token stream that only contains the empty string and nothing else.
 *
 * @typedef {Array<string | Token>} TokenStream
 * @global
 * @public
 */

/**
 * Converts the given token or token stream to an HTML representation.
 *
 * The following hooks will be run:
 * 1. `wrap`: On each {@link Token}.
 *
 * @param {string | Token | TokenStream} o The token or token stream to be converted.
 * @param {string} language The name of current language.
 * @returns {string} The HTML representation of the token or token stream.
 * @memberof Token
 * @static
 */
Token.stringify = function stringify(o, language) {
	if (typeof o == 'string') {
		return o;
	}
	if (Array.isArray(o)) {
		var s = '';
		o.forEach(function (e) {
			s += stringify(e, language);
		});
		return s;
	}

	var env = {
		type: o.type,
		content: stringify(o.content, language),
		tag: 'span',
		classes: ['token', o.type],
		attributes: {},
		language: language
	};

	var aliases = o.alias;
	if (aliases) {
		if (Array.isArray(aliases)) {
			Array.prototype.push.apply(env.classes, aliases);
		} else {
			env.classes.push(aliases);
		}
	}

	_.hooks.run('wrap', env);

	var attributes = '';
	for (var name in env.attributes) {
		attributes += ' ' + name + '="' + (env.attributes[name] || '').replace(/"/g, '&quot;') + '"';
	}

	return '<' + env.tag + ' class="' + env.classes.join(' ') + '"' + attributes + '>' + env.content + '</' + env.tag + '>';
};

/**
 * @param {string} text
 * @param {LinkedList<string | Token>} tokenList
 * @param {any} grammar
 * @param {LinkedListNode<string | Token>} startNode
 * @param {number} startPos
 * @param {RematchOptions} [rematch]
 * @returns {void}
 * @private
 *
 * @typedef RematchOptions
 * @property {string} cause
 * @property {number} reach
 */
function matchGrammar(text, tokenList, grammar, startNode, startPos, rematch) {
	for (var token in grammar) {
		if (!grammar.hasOwnProperty(token) || !grammar[token]) {
			continue;
		}

		var patterns = grammar[token];
		patterns = Array.isArray(patterns) ? patterns : [patterns];

		for (var j = 0; j < patterns.length; ++j) {
			if (rematch && rematch.cause == token + ',' + j) {
				return;
			}

			var patternObj = patterns[j],
				inside = patternObj.inside,
				lookbehind = !!patternObj.lookbehind,
				greedy = !!patternObj.greedy,
				lookbehindLength = 0,
				alias = patternObj.alias;

			if (greedy && !patternObj.pattern.global) {
				// Without the global flag, lastIndex won't work
				var flags = patternObj.pattern.toString().match(/[imsuy]*$/)[0];
				patternObj.pattern = RegExp(patternObj.pattern.source, flags + 'g');
			}

			/** @type {RegExp} */
			var pattern = patternObj.pattern || patternObj;

			for ( // iterate the token list and keep track of the current token/string position
				var currentNode = startNode.next, pos = startPos;
				currentNode !== tokenList.tail;
				pos += currentNode.value.length, currentNode = currentNode.next
			) {

				if (rematch && pos >= rematch.reach) {
					break;
				}

				var str = currentNode.value;

				if (tokenList.length > text.length) {
					// Something went terribly wrong, ABORT, ABORT!
					return;
				}

				if (str instanceof Token) {
					continue;
				}

				var removeCount = 1; // this is the to parameter of removeBetween

				if (greedy && currentNode != tokenList.tail.prev) {
					pattern.lastIndex = pos;
					var match = pattern.exec(text);
					if (!match) {
						break;
					}

					var from = match.index + (lookbehind && match[1] ? match[1].length : 0);
					var to = match.index + match[0].length;
					var p = pos;

					// find the node that contains the match
					p += currentNode.value.length;
					while (from >= p) {
						currentNode = currentNode.next;
						p += currentNode.value.length;
					}
					// adjust pos (and p)
					p -= currentNode.value.length;
					pos = p;

					// the current node is a Token, then the match starts inside another Token, which is invalid
					if (currentNode.value instanceof Token) {
						continue;
					}

					// find the last node which is affected by this match
					for (
						var k = currentNode;
						k !== tokenList.tail && (p < to || typeof k.value === 'string');
						k = k.next
					) {
						removeCount++;
						p += k.value.length;
					}
					removeCount--;

					// replace with the new match
					str = text.slice(pos, p);
					match.index -= pos;
				} else {
					pattern.lastIndex = 0;

					var match = pattern.exec(str);
				}

				if (!match) {
					continue;
				}

				if (lookbehind) {
					lookbehindLength = match[1] ? match[1].length : 0;
				}

				var from = match.index + lookbehindLength,
					matchStr = match[0].slice(lookbehindLength),
					to = from + matchStr.length,
					before = str.slice(0, from),
					after = str.slice(to);

				var reach = pos + str.length;
				if (rematch && reach > rematch.reach) {
					rematch.reach = reach;
				}

				var removeFrom = currentNode.prev;

				if (before) {
					removeFrom = addAfter(tokenList, removeFrom, before);
					pos += before.length;
				}

				removeRange(tokenList, removeFrom, removeCount);

				var wrapped = new Token(token, inside ? _.tokenize(matchStr, inside) : matchStr, alias, matchStr);
				currentNode = addAfter(tokenList, removeFrom, wrapped);

				if (after) {
					addAfter(tokenList, currentNode, after);
				}

				if (removeCount > 1) {
					// at least one Token object was removed, so we have to do some rematching
					// this can only happen if the current pattern is greedy
					matchGrammar(text, tokenList, grammar, currentNode.prev, pos, {
						cause: token + ',' + j,
						reach: reach
					});
				}
			}
		}
	}
}

/**
 * @typedef LinkedListNode
 * @property {T} value
 * @property {LinkedListNode<T> | null} prev The previous node.
 * @property {LinkedListNode<T> | null} next The next node.
 * @template T
 * @private
 */

/**
 * @template T
 * @private
 */
function LinkedList() {
	/** @type {LinkedListNode<T>} */
	var head = { value: null, prev: null, next: null };
	/** @type {LinkedListNode<T>} */
	var tail = { value: null, prev: head, next: null };
	head.next = tail;

	/** @type {LinkedListNode<T>} */
	this.head = head;
	/** @type {LinkedListNode<T>} */
	this.tail = tail;
	this.length = 0;
}

/**
 * Adds a new node with the given value to the list.
 * @param {LinkedList<T>} list
 * @param {LinkedListNode<T>} node
 * @param {T} value
 * @returns {LinkedListNode<T>} The added node.
 * @template T
 */
function addAfter(list, node, value) {
	// assumes that node != list.tail && values.length >= 0
	var next = node.next;

	var newNode = { value: value, prev: node, next: next };
	node.next = newNode;
	next.prev = newNode;
	list.length++;

	return newNode;
}
/**
 * Removes `count` nodes after the given node. The given node will not be removed.
 * @param {LinkedList<T>} list
 * @param {LinkedListNode<T>} node
 * @param {number} count
 * @template T
 */
function removeRange(list, node, count) {
	var next = node.next;
	for (var i = 0; i < count && next !== list.tail; i++) {
		next = next.next;
	}
	node.next = next;
	next.prev = node;
	list.length -= i;
}
/**
 * @param {LinkedList<T>} list
 * @returns {T[]}
 * @template T
 */
function toArray(list) {
	var array = [];
	var node = list.head.next;
	while (node !== list.tail) {
		array.push(node.value);
		node = node.next;
	}
	return array;
}


if (!_self.document) {
	if (!_self.addEventListener) {
		// in Node.js
		return _;
	}

	if (!_.disableWorkerMessageHandler) {
		// In worker
		_self.addEventListener('message', function (evt) {
			var message = JSON.parse(evt.data),
				lang = message.language,
				code = message.code,
				immediateClose = message.immediateClose;

			_self.postMessage(_.highlight(code, _.languages[lang], lang));
			if (immediateClose) {
				_self.close();
			}
		}, false);
	}

	return _;
}

// Get current script and highlight
var script = _.util.currentScript();

if (script) {
	_.filename = script.src;

	if (script.hasAttribute('data-manual')) {
		_.manual = true;
	}
}

function highlightAutomaticallyCallback() {
	if (!_.manual) {
		_.highlightAll();
	}
}

if (!_.manual) {
	// If the document state is "loading", then we'll use DOMContentLoaded.
	// If the document state is "interactive" and the prism.js script is deferred, then we'll also use the
	// DOMContentLoaded event because there might be some plugins or languages which have also been deferred and they
	// might take longer one animation frame to execute which can create a race condition where only some plugins have
	// been loaded when Prism.highlightAll() is executed, depending on how fast resources are loaded.
	// See https://github.com/PrismJS/prism/issues/2102
	var readyState = document.readyState;
	if (readyState === 'loading' || readyState === 'interactive' && script && script.defer) {
		document.addEventListener('DOMContentLoaded', highlightAutomaticallyCallback);
	} else {
		if (window.requestAnimationFrame) {
			window.requestAnimationFrame(highlightAutomaticallyCallback);
		} else {
			window.setTimeout(highlightAutomaticallyCallback, 16);
		}
	}
}

return _;

})(_self);

if ( module.exports) {
	module.exports = Prism;
}

// hack for components to work correctly in node.js
if (typeof commonjsGlobal !== 'undefined') {
	commonjsGlobal.Prism = Prism;
}

// some additional documentation/types

/**
 * The expansion of a simple `RegExp` literal to support additional properties.
 *
 * @typedef GrammarToken
 * @property {RegExp} pattern The regular expression of the token.
 * @property {boolean} [lookbehind=false] If `true`, then the first capturing group of `pattern` will (effectively)
 * behave as a lookbehind group meaning that the captured text will not be part of the matched text of the new token.
 * @property {boolean} [greedy=false] Whether the token is greedy.
 * @property {string|string[]} [alias] An optional alias or list of aliases.
 * @property {Grammar} [inside] The nested grammar of this token.
 *
 * The `inside` grammar will be used to tokenize the text value of each token of this kind.
 *
 * This can be used to make nested and even recursive language definitions.
 *
 * Note: This can cause infinite recursion. Be careful when you embed different languages or even the same language into
 * each another.
 * @global
 * @public
*/

/**
 * @typedef Grammar
 * @type {Object<string, RegExp | GrammarToken | Array<RegExp | GrammarToken>>}
 * @property {Grammar} [rest] An optional grammar object that will be appended to this grammar.
 * @global
 * @public
 */

/**
 * A function which will invoked after an element was successfully highlighted.
 *
 * @callback HighlightCallback
 * @param {Element} element The element successfully highlighted.
 * @returns {void}
 * @global
 * @public
*/

/**
 * @callback HookCallback
 * @param {Object<string, any>} env The environment variables of the hook.
 * @returns {void}
 * @global
 * @public
 */


/* **********************************************
     Begin prism-markup.js
********************************************** */

Prism.languages.markup = {
	'comment': /<!--[\s\S]*?-->/,
	'prolog': /<\?[\s\S]+?\?>/,
	'doctype': {
		// https://www.w3.org/TR/xml/#NT-doctypedecl
		pattern: /<!DOCTYPE(?:[^>"'[\]]|"[^"]*"|'[^']*')+(?:\[(?:[^<"'\]]|"[^"]*"|'[^']*'|<(?!!--)|<!--(?:[^-]|-(?!->))*-->)*\]\s*)?>/i,
		greedy: true,
		inside: {
			'internal-subset': {
				pattern: /(\[)[\s\S]+(?=\]>$)/,
				lookbehind: true,
				greedy: true,
				inside: null // see below
			},
			'string': {
				pattern: /"[^"]*"|'[^']*'/,
				greedy: true
			},
			'punctuation': /^<!|>$|[[\]]/,
			'doctype-tag': /^DOCTYPE/,
			'name': /[^\s<>'"]+/
		}
	},
	'cdata': /<!\[CDATA\[[\s\S]*?]]>/i,
	'tag': {
		pattern: /<\/?(?!\d)[^\s>\/=$<%]+(?:\s(?:\s*[^\s>\/=]+(?:\s*=\s*(?:"[^"]*"|'[^']*'|[^\s'">=]+(?=[\s>]))|(?=[\s/>])))+)?\s*\/?>/,
		greedy: true,
		inside: {
			'tag': {
				pattern: /^<\/?[^\s>\/]+/,
				inside: {
					'punctuation': /^<\/?/,
					'namespace': /^[^\s>\/:]+:/
				}
			},
			'attr-value': {
				pattern: /=\s*(?:"[^"]*"|'[^']*'|[^\s'">=]+)/,
				inside: {
					'punctuation': [
						{
							pattern: /^=/,
							alias: 'attr-equals'
						},
						/"|'/
					]
				}
			},
			'punctuation': /\/?>/,
			'attr-name': {
				pattern: /[^\s>\/]+/,
				inside: {
					'namespace': /^[^\s>\/:]+:/
				}
			}

		}
	},
	'entity': [
		{
			pattern: /&[\da-z]{1,8};/i,
			alias: 'named-entity'
		},
		/&#x?[\da-f]{1,8};/i
	]
};

Prism.languages.markup['tag'].inside['attr-value'].inside['entity'] =
	Prism.languages.markup['entity'];
Prism.languages.markup['doctype'].inside['internal-subset'].inside = Prism.languages.markup;

// Plugin to make entity title show the real entity, idea by Roman Komarov
Prism.hooks.add('wrap', function (env) {

	if (env.type === 'entity') {
		env.attributes['title'] = env.content.replace(/&amp;/, '&');
	}
});

Object.defineProperty(Prism.languages.markup.tag, 'addInlined', {
	/**
	 * Adds an inlined language to markup.
	 *
	 * An example of an inlined language is CSS with `<style>` tags.
	 *
	 * @param {string} tagName The name of the tag that contains the inlined language. This name will be treated as
	 * case insensitive.
	 * @param {string} lang The language key.
	 * @example
	 * addInlined('style', 'css');
	 */
	value: function addInlined(tagName, lang) {
		var includedCdataInside = {};
		includedCdataInside['language-' + lang] = {
			pattern: /(^<!\[CDATA\[)[\s\S]+?(?=\]\]>$)/i,
			lookbehind: true,
			inside: Prism.languages[lang]
		};
		includedCdataInside['cdata'] = /^<!\[CDATA\[|\]\]>$/i;

		var inside = {
			'included-cdata': {
				pattern: /<!\[CDATA\[[\s\S]*?\]\]>/i,
				inside: includedCdataInside
			}
		};
		inside['language-' + lang] = {
			pattern: /[\s\S]+/,
			inside: Prism.languages[lang]
		};

		var def = {};
		def[tagName] = {
			pattern: RegExp(/(<__[\s\S]*?>)(?:<!\[CDATA\[(?:[^\]]|\](?!\]>))*\]\]>|(?!<!\[CDATA\[)[\s\S])*?(?=<\/__>)/.source.replace(/__/g, function () { return tagName; }), 'i'),
			lookbehind: true,
			greedy: true,
			inside: inside
		};

		Prism.languages.insertBefore('markup', 'cdata', def);
	}
});

Prism.languages.html = Prism.languages.markup;
Prism.languages.mathml = Prism.languages.markup;
Prism.languages.svg = Prism.languages.markup;

Prism.languages.xml = Prism.languages.extend('markup', {});
Prism.languages.ssml = Prism.languages.xml;
Prism.languages.atom = Prism.languages.xml;
Prism.languages.rss = Prism.languages.xml;


/* **********************************************
     Begin prism-css.js
********************************************** */

(function (Prism) {

	var string = /("|')(?:\\(?:\r\n|[\s\S])|(?!\1)[^\\\r\n])*\1/;

	Prism.languages.css = {
		'comment': /\/\*[\s\S]*?\*\//,
		'atrule': {
			pattern: /@[\w-]+[\s\S]*?(?:;|(?=\s*\{))/,
			inside: {
				'rule': /^@[\w-]+/,
				'selector-function-argument': {
					pattern: /(\bselector\s*\((?!\s*\))\s*)(?:[^()]|\((?:[^()]|\([^()]*\))*\))+?(?=\s*\))/,
					lookbehind: true,
					alias: 'selector'
				},
				'keyword': {
					pattern: /(^|[^\w-])(?:and|not|only|or)(?![\w-])/,
					lookbehind: true
				}
				// See rest below
			}
		},
		'url': {
			// https://drafts.csswg.org/css-values-3/#urls
			pattern: RegExp('\\burl\\((?:' + string.source + '|' + /(?:[^\\\r\n()"']|\\[\s\S])*/.source + ')\\)', 'i'),
			greedy: true,
			inside: {
				'function': /^url/i,
				'punctuation': /^\(|\)$/,
				'string': {
					pattern: RegExp('^' + string.source + '$'),
					alias: 'url'
				}
			}
		},
		'selector': RegExp('[^{}\\s](?:[^{};"\']|' + string.source + ')*?(?=\\s*\\{)'),
		'string': {
			pattern: string,
			greedy: true
		},
		'property': /[-_a-z\xA0-\uFFFF][-\w\xA0-\uFFFF]*(?=\s*:)/i,
		'important': /!important\b/i,
		'function': /[-a-z0-9]+(?=\()/i,
		'punctuation': /[(){};:,]/
	};

	Prism.languages.css['atrule'].inside.rest = Prism.languages.css;

	var markup = Prism.languages.markup;
	if (markup) {
		markup.tag.addInlined('style', 'css');

		Prism.languages.insertBefore('inside', 'attr-value', {
			'style-attr': {
				pattern: /\s*style=("|')(?:\\[\s\S]|(?!\1)[^\\])*\1/i,
				inside: {
					'attr-name': {
						pattern: /^\s*style/i,
						inside: markup.tag.inside
					},
					'punctuation': /^\s*=\s*['"]|['"]\s*$/,
					'attr-value': {
						pattern: /.+/i,
						inside: Prism.languages.css
					}
				},
				alias: 'language-css'
			}
		}, markup.tag);
	}

}(Prism));


/* **********************************************
     Begin prism-clike.js
********************************************** */

Prism.languages.clike = {
	'comment': [
		{
			pattern: /(^|[^\\])\/\*[\s\S]*?(?:\*\/|$)/,
			lookbehind: true
		},
		{
			pattern: /(^|[^\\:])\/\/.*/,
			lookbehind: true,
			greedy: true
		}
	],
	'string': {
		pattern: /(["'])(?:\\(?:\r\n|[\s\S])|(?!\1)[^\\\r\n])*\1/,
		greedy: true
	},
	'class-name': {
		pattern: /(\b(?:class|interface|extends|implements|trait|instanceof|new)\s+|\bcatch\s+\()[\w.\\]+/i,
		lookbehind: true,
		inside: {
			'punctuation': /[.\\]/
		}
	},
	'keyword': /\b(?:if|else|while|do|for|return|in|instanceof|function|new|try|throw|catch|finally|null|break|continue)\b/,
	'boolean': /\b(?:true|false)\b/,
	'function': /\w+(?=\()/,
	'number': /\b0x[\da-f]+\b|(?:\b\d+\.?\d*|\B\.\d+)(?:e[+-]?\d+)?/i,
	'operator': /[<>]=?|[!=]=?=?|--?|\+\+?|&&?|\|\|?|[?*/~^%]/,
	'punctuation': /[{}[\];(),.:]/
};


/* **********************************************
     Begin prism-javascript.js
********************************************** */

Prism.languages.javascript = Prism.languages.extend('clike', {
	'class-name': [
		Prism.languages.clike['class-name'],
		{
			pattern: /(^|[^$\w\xA0-\uFFFF])[_$A-Z\xA0-\uFFFF][$\w\xA0-\uFFFF]*(?=\.(?:prototype|constructor))/,
			lookbehind: true
		}
	],
	'keyword': [
		{
			pattern: /((?:^|})\s*)(?:catch|finally)\b/,
			lookbehind: true
		},
		{
			pattern: /(^|[^.]|\.\.\.\s*)\b(?:as|async(?=\s*(?:function\b|\(|[$\w\xA0-\uFFFF]|$))|await|break|case|class|const|continue|debugger|default|delete|do|else|enum|export|extends|for|from|function|(?:get|set)(?=\s*[\[$\w\xA0-\uFFFF])|if|implements|import|in|instanceof|interface|let|new|null|of|package|private|protected|public|return|static|super|switch|this|throw|try|typeof|undefined|var|void|while|with|yield)\b/,
			lookbehind: true
		},
	],
	'number': /\b(?:(?:0[xX](?:[\dA-Fa-f](?:_[\dA-Fa-f])?)+|0[bB](?:[01](?:_[01])?)+|0[oO](?:[0-7](?:_[0-7])?)+)n?|(?:\d(?:_\d)?)+n|NaN|Infinity)\b|(?:\b(?:\d(?:_\d)?)+\.?(?:\d(?:_\d)?)*|\B\.(?:\d(?:_\d)?)+)(?:[Ee][+-]?(?:\d(?:_\d)?)+)?/,
	// Allow for all non-ASCII characters (See http://stackoverflow.com/a/2008444)
	'function': /#?[_$a-zA-Z\xA0-\uFFFF][$\w\xA0-\uFFFF]*(?=\s*(?:\.\s*(?:apply|bind|call)\s*)?\()/,
	'operator': /--|\+\+|\*\*=?|=>|&&=?|\|\|=?|[!=]==|<<=?|>>>?=?|[-+*/%&|^!=<>]=?|\.{3}|\?\?=?|\?\.?|[~:]/
});

Prism.languages.javascript['class-name'][0].pattern = /(\b(?:class|interface|extends|implements|instanceof|new)\s+)[\w.\\]+/;

Prism.languages.insertBefore('javascript', 'keyword', {
	'regex': {
		pattern: /((?:^|[^$\w\xA0-\uFFFF."'\])\s]|\b(?:return|yield))\s*)\/(?:\[(?:[^\]\\\r\n]|\\.)*]|\\.|[^/\\\[\r\n])+\/[gimyus]{0,6}(?=(?:\s|\/\*(?:[^*]|\*(?!\/))*\*\/)*(?:$|[\r\n,.;:})\]]|\/\/))/,
		lookbehind: true,
		greedy: true
	},
	// This must be declared before keyword because we use "function" inside the look-forward
	'function-variable': {
		pattern: /#?[_$a-zA-Z\xA0-\uFFFF][$\w\xA0-\uFFFF]*(?=\s*[=:]\s*(?:async\s*)?(?:\bfunction\b|(?:\((?:[^()]|\([^()]*\))*\)|[_$a-zA-Z\xA0-\uFFFF][$\w\xA0-\uFFFF]*)\s*=>))/,
		alias: 'function'
	},
	'parameter': [
		{
			pattern: /(function(?:\s+[_$A-Za-z\xA0-\uFFFF][$\w\xA0-\uFFFF]*)?\s*\(\s*)(?!\s)(?:[^()]|\([^()]*\))+?(?=\s*\))/,
			lookbehind: true,
			inside: Prism.languages.javascript
		},
		{
			pattern: /[_$a-z\xA0-\uFFFF][$\w\xA0-\uFFFF]*(?=\s*=>)/i,
			inside: Prism.languages.javascript
		},
		{
			pattern: /(\(\s*)(?!\s)(?:[^()]|\([^()]*\))+?(?=\s*\)\s*=>)/,
			lookbehind: true,
			inside: Prism.languages.javascript
		},
		{
			pattern: /((?:\b|\s|^)(?!(?:as|async|await|break|case|catch|class|const|continue|debugger|default|delete|do|else|enum|export|extends|finally|for|from|function|get|if|implements|import|in|instanceof|interface|let|new|null|of|package|private|protected|public|return|set|static|super|switch|this|throw|try|typeof|undefined|var|void|while|with|yield)(?![$\w\xA0-\uFFFF]))(?:[_$A-Za-z\xA0-\uFFFF][$\w\xA0-\uFFFF]*\s*)\(\s*|\]\s*\(\s*)(?!\s)(?:[^()]|\([^()]*\))+?(?=\s*\)\s*\{)/,
			lookbehind: true,
			inside: Prism.languages.javascript
		}
	],
	'constant': /\b[A-Z](?:[A-Z_]|\dx?)*\b/
});

Prism.languages.insertBefore('javascript', 'string', {
	'template-string': {
		pattern: /`(?:\\[\s\S]|\${(?:[^{}]|{(?:[^{}]|{[^}]*})*})+}|(?!\${)[^\\`])*`/,
		greedy: true,
		inside: {
			'template-punctuation': {
				pattern: /^`|`$/,
				alias: 'string'
			},
			'interpolation': {
				pattern: /((?:^|[^\\])(?:\\{2})*)\${(?:[^{}]|{(?:[^{}]|{[^}]*})*})+}/,
				lookbehind: true,
				inside: {
					'interpolation-punctuation': {
						pattern: /^\${|}$/,
						alias: 'punctuation'
					},
					rest: Prism.languages.javascript
				}
			},
			'string': /[\s\S]+/
		}
	}
});

if (Prism.languages.markup) {
	Prism.languages.markup.tag.addInlined('script', 'javascript');
}

Prism.languages.js = Prism.languages.javascript;


/* **********************************************
     Begin prism-file-highlight.js
********************************************** */

(function () {
	if (typeof self === 'undefined' || !self.Prism || !self.document) {
		return;
	}

	var Prism = window.Prism;

	var LOADING_MESSAGE = 'Loading…';
	var FAILURE_MESSAGE = function (status, message) {
		return '✖ Error ' + status + ' while fetching file: ' + message;
	};
	var FAILURE_EMPTY_MESSAGE = '✖ Error: File does not exist or is empty';

	var EXTENSIONS = {
		'js': 'javascript',
		'py': 'python',
		'rb': 'ruby',
		'ps1': 'powershell',
		'psm1': 'powershell',
		'sh': 'bash',
		'bat': 'batch',
		'h': 'c',
		'tex': 'latex'
	};

	var STATUS_ATTR = 'data-src-status';
	var STATUS_LOADING = 'loading';
	var STATUS_LOADED = 'loaded';
	var STATUS_FAILED = 'failed';

	var SELECTOR = 'pre[data-src]:not([' + STATUS_ATTR + '="' + STATUS_LOADED + '"])'
		+ ':not([' + STATUS_ATTR + '="' + STATUS_LOADING + '"])';

	var lang = /\blang(?:uage)?-([\w-]+)\b/i;

	/**
	 * Sets the Prism `language-xxxx` or `lang-xxxx` class to the given language.
	 *
	 * @param {HTMLElement} element
	 * @param {string} language
	 * @returns {void}
	 */
	function setLanguageClass(element, language) {
		var className = element.className;
		className = className.replace(lang, ' ') + ' language-' + language;
		element.className = className.replace(/\s+/g, ' ').trim();
	}


	Prism.hooks.add('before-highlightall', function (env) {
		env.selector += ', ' + SELECTOR;
	});

	Prism.hooks.add('before-sanity-check', function (env) {
		var pre = /** @type {HTMLPreElement} */ (env.element);
		if (pre.matches(SELECTOR)) {
			env.code = ''; // fast-path the whole thing and go to complete

			pre.setAttribute(STATUS_ATTR, STATUS_LOADING); // mark as loading

			// add code element with loading message
			var code = pre.appendChild(document.createElement('CODE'));
			code.textContent = LOADING_MESSAGE;

			var src = pre.getAttribute('data-src');

			var language = env.language;
			if (language === 'none') {
				// the language might be 'none' because there is no language set;
				// in this case, we want to use the extension as the language
				var extension = (/\.(\w+)$/.exec(src) || [, 'none'])[1];
				language = EXTENSIONS[extension] || extension;
			}

			// set language classes
			setLanguageClass(code, language);
			setLanguageClass(pre, language);

			// preload the language
			var autoloader = Prism.plugins.autoloader;
			if (autoloader) {
				autoloader.loadLanguages(language);
			}

			// load file
			var xhr = new XMLHttpRequest();
			xhr.open('GET', src, true);
			xhr.onreadystatechange = function () {
				if (xhr.readyState == 4) {
					if (xhr.status < 400 && xhr.responseText) {
						// mark as loaded
						pre.setAttribute(STATUS_ATTR, STATUS_LOADED);

						// highlight code
						code.textContent = xhr.responseText;
						Prism.highlightElement(code);

					} else {
						// mark as failed
						pre.setAttribute(STATUS_ATTR, STATUS_FAILED);

						if (xhr.status >= 400) {
							code.textContent = FAILURE_MESSAGE(xhr.status, xhr.statusText);
						} else {
							code.textContent = FAILURE_EMPTY_MESSAGE;
						}
					}
				}
			};
			xhr.send(null);
		}
	});

	Prism.plugins.fileHighlight = {
		/**
		 * Executes the File Highlight plugin for all matching `pre` elements under the given container.
		 *
		 * Note: Elements which are already loaded or currently loading will not be touched by this method.
		 *
		 * @param {ParentNode} [container=document]
		 */
		highlight: function highlight(container) {
			var elements = (container || document).querySelectorAll(SELECTOR);

			for (var i = 0, element; element = elements[i++];) {
				Prism.highlightElement(element);
			}
		}
	};

	var logged = false;
	/** @deprecated Use `Prism.plugins.fileHighlight.highlight` instead. */
	Prism.fileHighlight = function () {
		if (!logged) {
			console.warn('Prism.fileHighlight is deprecated. Use `Prism.plugins.fileHighlight.highlight` instead.');
			logged = true;
		}
		Prism.plugins.fileHighlight.highlight.apply(this, arguments);
	};

})();
});

const blocks = '(if|else if|await|then|catch|each|html|debug)';

Prism.languages.svelte = Prism.languages.extend('markup', {
	each: {
		pattern: new RegExp(
			'{[#/]each' +
				'(?:(?:\\{(?:(?:\\{(?:[^{}])*\\})|(?:[^{}]))*\\})|(?:[^{}]))*}'
		),
		inside: {
			'language-javascript': [
				{
					pattern: /(as[\s\S]*)\([\s\S]*\)(?=\s*\})/,
					lookbehind: true,
					inside: Prism.languages['javascript'],
				},
				{
					pattern: /(as[\s]*)[\s\S]*(?=\s*)/,
					lookbehind: true,
					inside: Prism.languages['javascript'],
				},
				{
					pattern: /(#each[\s]*)[\s\S]*(?=as)/,
					lookbehind: true,
					inside: Prism.languages['javascript'],
				},
			],
			keyword: /[#/]each|as/,
			punctuation: /{|}/,
		},
	},
	block: {
		pattern: new RegExp(
			'{[#:/@]/s' +
				blocks +
				'(?:(?:\\{(?:(?:\\{(?:[^{}])*\\})|(?:[^{}]))*\\})|(?:[^{}]))*}'
		),
		inside: {
			punctuation: /^{|}$/,
			keyword: [new RegExp('[#:/@]' + blocks + '( )*'), /as/, /then/],
			'language-javascript': {
				pattern: /[\s\S]*/,
				inside: Prism.languages['javascript'],
			},
		},
	},
	tag: {
		pattern: /<\/?(?!\d)[^\s>\/=$<%]+(?:\s(?:\s*[^\s>\/=]+(?:\s*=\s*(?:(?:"[^"]*"|'[^']*'|[^\s'">=]+(?=[\s>]))|(?:"[^"]*"|'[^']*'|{[\s\S]+?}(?=[\s/>])))|(?=[\s/>])))+)?\s*\/?>/i,
		greedy: true,
		inside: {
			tag: {
				pattern: /^<\/?[^\s>\/]+/i,
				inside: {
					punctuation: /^<\/?/,
					namespace: /^[^\s>\/:]+:/,
				},
			},
			'language-javascript': {
				pattern: /\{(?:(?:\{(?:(?:\{(?:[^{}])*\})|(?:[^{}]))*\})|(?:[^{}]))*\}/,
				inside: Prism.languages['javascript'],
			},
			'attr-value': {
				pattern: /=\s*(?:"[^"]*"|'[^']*'|[^\s'">=]+)/i,
				inside: {
					punctuation: [
						/^=/,
						{
							pattern: /^(\s*)["']|["']$/,
							lookbehind: true,
						},
					],
					'language-javascript': {
						pattern: /{[\s\S]+}/,
						inside: Prism.languages['javascript'],
					},
				},
			},
			punctuation: /\/?>/,
			'attr-name': {
				pattern: /[^\s>\/]+/,
				inside: {
					namespace: /^[^\s>\/:]+:/,
				},
			},
		},
	},
	'language-javascript': {
		pattern: /\{(?:(?:\{(?:(?:\{(?:[^{}])*\})|(?:[^{}]))*\})|(?:[^{}]))*\}/,
		lookbehind: true,
		inside: Prism.languages['javascript'],
	},
});

Prism.languages.svelte['tag'].inside['attr-value'].inside['entity'] =
	Prism.languages.svelte['entity'];

Prism.hooks.add('wrap', env => {
	if (env.type === 'entity') {
		env.attributes['title'] = env.content.replace(/&amp;/, '&');
	}
});

Object.defineProperty(Prism.languages.svelte.tag, 'addInlined', {
	value: function addInlined(tagName, lang) {
		const includedCdataInside = {};
		includedCdataInside['language-' + lang] = {
			pattern: /(^<!\[CDATA\[)[\s\S]+?(?=\]\]>$)/i,
			lookbehind: true,
			inside: Prism.languages[lang],
		};
		includedCdataInside['cdata'] = /^<!\[CDATA\[|\]\]>$/i;

		const inside = {
			'included-cdata': {
				pattern: /<!\[CDATA\[[\s\S]*?\]\]>/i,
				inside: includedCdataInside,
			},
		};
		inside['language-' + lang] = {
			pattern: /[\s\S]+/,
			inside: Prism.languages[lang],
		};

		const def = {};
		def[tagName] = {
			pattern: RegExp(
				/(<__[\s\S]*?>)(?:<!\[CDATA\[[\s\S]*?\]\]>\s*|[\s\S])*?(?=<\/__>)/.source.replace(
					/__/g,
					tagName
				),
				'i'
			),
			lookbehind: true,
			greedy: true,
			inside,
		};

		Prism.languages.insertBefore('svelte', 'cdata', def);
	},
});

Prism.languages.svelte.tag.addInlined('style', 'css');
Prism.languages.svelte.tag.addInlined('script', 'javascript');

function prism$1(node, { code, lang }) {
  renderPrism(node, code, lang);

  return {
    update({ code, lang }) {
      renderPrism(node, code, lang);
    },
  };
}

function renderPrism(node, code, lang) {
  code = code.trim();
  let html = prism.highlight(code, lang);
  html = html
    .split('\n')
    .map(line => line.replace(/^(\s+)/, (_, m) => '<span class="tab"></span>'.repeat(m.length / 2)))
    .join('<br />');
  node.innerHTML = html;
}

function prismLang(lang) {
  return function prism(node, code) {
    renderPrism(node, code, lang);
    return {
      update(code) {
        renderPrism(node, code, lang);
      },
    };
  };
}

const prismHtml = prismLang(prism.languages.html);
const prismJs = prismLang(prism.languages.javascript);
const prismSvelte = prismLang(prism.languages.svelte);

var base = "{#each items as item}\n  <div>{item}</div>\n{/each}";

var codeImport = "<script>\n  import { fade } from 'svelte/transition';  \n</script>\n\n{#each items as item}\n  <div>{item}</div>\n{/each}";

var codeIn = "<script>\n  import { fade } from 'svelte/transition';  \n</script>\n\n{#each items as item}\n  <div in:fade>{item}</div>\n{/each}";

var codeInParam = "<script>\n  import { fade } from 'svelte/transition';  \n</script>\n\n{#each items as item}\n  <div in:fade={{ duration: 4000, delay: 500 }}>{item}</div>\n{/each}";

var codeOut = "<script>\n  import { fade } from 'svelte/transition';  \n</script>\n\n{#each items as item}\n  <div out:fade={{ duration: 4000, delay: 500 }}>{item}</div>\n{/each}";

var codeTransition = "<script>\n  import { fade } from 'svelte/transition';  \n</script>\n\n{#each items as item}\n  <div transition:fade={{ duration: 4000, delay: 500 }}>{item}</div>\n{/each}";

/* @@slides4.svelte generated by Svelte v3.24.0 */

function add_css$4() {
	var style = element("style");
	style.id = "svelte-zwzan3-style";
	style.textContent = ".container.svelte-zwzan3{display:grid;grid-template-columns:1fr 1fr;padding:16px;margin-top:170px}";
	append(document.head, style);
}

function get_each_context(ctx, list, i) {
	const child_ctx = ctx.slice();
	child_ctx[11] = list[i];
	return child_ctx;
}

// (7:4) {#each items as item}
function create_each_block(ctx) {
	let div;
	let t_value = /*item*/ ctx[11] + "";
	let t;
	let div_intro;
	let div_outro;
	let current;

	return {
		c() {
			div = element("div");
			t = text(t_value);
		},
		m(target, anchor) {
			insert(target, div, anchor);
			append(div, t);
			current = true;
		},
		p(ctx, dirty) {
			if ((!current || dirty & /*items*/ 1) && t_value !== (t_value = /*item*/ ctx[11] + "")) set_data(t, t_value);
		},
		i(local) {
			if (current) return;

			add_render_callback(() => {
				if (div_outro) div_outro.end(1);
				if (!div_intro) div_intro = create_in_transition(div, /*customFadeIn*/ ctx[4], {});
				div_intro.start();
			});

			current = true;
		},
		o(local) {
			if (div_intro) div_intro.invalidate();
			div_outro = create_out_transition(div, /*customFadeOut*/ ctx[5], {});
			current = false;
		},
		d(detaching) {
			if (detaching) detach(div);
			if (detaching && div_outro) div_outro.end();
		}
	};
}

function create_fragment$4(ctx) {
	let div2;
	let div0;
	let prismSvelte_action;
	let t0;
	let div1;
	let button0;
	let t2;
	let button1;
	let t4;
	let current;
	let mounted;
	let dispose;
	let each_value = /*items*/ ctx[0];
	let each_blocks = [];

	for (let i = 0; i < each_value.length; i += 1) {
		each_blocks[i] = create_each_block(get_each_context(ctx, each_value, i));
	}

	const out = i => transition_out(each_blocks[i], 1, 1, () => {
		each_blocks[i] = null;
	});

	return {
		c() {
			div2 = element("div");
			div0 = element("div");
			t0 = space();
			div1 = element("div");
			button0 = element("button");
			button0.textContent = "Add";
			t2 = space();
			button1 = element("button");
			button1.textContent = "Remove";
			t4 = space();

			for (let i = 0; i < each_blocks.length; i += 1) {
				each_blocks[i].c();
			}

			attr(div0, "class", "code");
			attr(div2, "class", "container svelte-zwzan3");
		},
		m(target, anchor) {
			insert(target, div2, anchor);
			append(div2, div0);
			append(div2, t0);
			append(div2, div1);
			append(div1, button0);
			append(div1, t2);
			append(div1, button1);
			append(div1, t4);

			for (let i = 0; i < each_blocks.length; i += 1) {
				each_blocks[i].m(div1, null);
			}

			current = true;

			if (!mounted) {
				dispose = [
					action_destroyer(prismSvelte_action = prismSvelte.call(null, div0, /*code*/ ctx[1])),
					listen(button0, "click", /*add*/ ctx[2]),
					listen(button1, "click", /*remove*/ ctx[3])
				];

				mounted = true;
			}
		},
		p(ctx, [dirty]) {
			if (prismSvelte_action && is_function(prismSvelte_action.update) && dirty & /*code*/ 2) prismSvelte_action.update.call(null, /*code*/ ctx[1]);

			if (dirty & /*items*/ 1) {
				each_value = /*items*/ ctx[0];
				let i;

				for (i = 0; i < each_value.length; i += 1) {
					const child_ctx = get_each_context(ctx, each_value, i);

					if (each_blocks[i]) {
						each_blocks[i].p(child_ctx, dirty);
						transition_in(each_blocks[i], 1);
					} else {
						each_blocks[i] = create_each_block(child_ctx);
						each_blocks[i].c();
						transition_in(each_blocks[i], 1);
						each_blocks[i].m(div1, null);
					}
				}

				group_outros();

				for (i = each_value.length; i < each_blocks.length; i += 1) {
					out(i);
				}

				check_outros();
			}
		},
		i(local) {
			if (current) return;

			for (let i = 0; i < each_value.length; i += 1) {
				transition_in(each_blocks[i]);
			}

			current = true;
		},
		o(local) {
			each_blocks = each_blocks.filter(Boolean);

			for (let i = 0; i < each_blocks.length; i += 1) {
				transition_out(each_blocks[i]);
			}

			current = false;
		},
		d(detaching) {
			if (detaching) detach(div2);
			destroy_each(each_blocks, detaching);
			mounted = false;
			run_all(dispose);
		}
	};
}

function instance$3($$self, $$props, $$invalidate) {
	let i = 0;
	const CODES = [base, codeImport, codeIn, codeInParam, codeOut, codeTransition];
	const LENGTH = CODES.length - 1;

	function next() {
		return i < LENGTH && $$invalidate(8, i++, i) < LENGTH;
	}

	function prev() {
		return i > 0 && $$invalidate(8, i--, i) > 0;
	}

	let items = ["a", "b"];

	function add() {
		$$invalidate(0, items = [...items, String.fromCharCode(97 + items.length)]);
	}

	function remove() {
		$$invalidate(0, items = items.slice(0, -1));
	}

	function customFadeIn(node) {
		return function () {
			if (i === 2) {
				return fade(node, {});
			} else if (i === 3 || i === 5) {
				return fade(node, { duration: 4000, delay: 500 });
			} else {
				return { duration: 0 };
			}
		};
	}

	function customFadeOut(node) {
		return function () {
			if (i === 4 || i === 5) {
				return fade(node, { duration: 4000, delay: 500 });
			} else {
				return { duration: 0 };
			}
		};
	}

	let code;

	$$self.$$.update = () => {
		if ($$self.$$.dirty & /*i*/ 256) {
			 $$invalidate(1, code = CODES[i]);
		}
	};

	return [items, code, add, remove, customFadeIn, customFadeOut, next, prev];
}

class Slides4 extends SvelteComponent {
	constructor(options) {
		super();
		if (!document.getElementById("svelte-zwzan3-style")) add_css$4();
		init(this, options, instance$3, create_fragment$4, safe_not_equal, { next: 6, prev: 7 });
	}

	get next() {
		return this.$$.ctx[6];
	}

	get prev() {
		return this.$$.ctx[7];
	}
}

/* @@slides5.svelte generated by Svelte v3.24.0 */

function add_css$5() {
	var style = element("style");
	style.id = "svelte-l83dwf-style";
	style.textContent = ".container.svelte-l83dwf{height:100%;display:grid;place-items:center}";
	append(document.head, style);
}

function create_fragment$5(ctx) {
	let div;
	let pre;

	let raw_value = `<code class="language-svelte"><span class="token tag"><span class="token tag"><span class="token punctuation">&lt;</span>script</span><span class="token punctuation">></span></span><span class="token script"><span class="token language-javascript">
  <span class="token keyword">import</span> <span class="token punctuation">&#123;</span> fly<span class="token punctuation">,</span> slide<span class="token punctuation">,</span> scale<span class="token punctuation">,</span> blur <span class="token punctuation">&#125;</span> <span class="token keyword">from</span> <span class="token string">'svelte/transition'</span><span class="token punctuation">;</span>
</span></span><span class="token tag"><span class="token tag"><span class="token punctuation">&lt;/</span>script</span><span class="token punctuation">></span></span>

<span class="token tag"><span class="token tag"><span class="token punctuation">&lt;</span>div</span> <span class="token attr-name"><span class="token namespace">transition:</span>fly=</span><span class="token language-javascript"><span class="token punctuation">&#123;</span><span class="token punctuation">&#123;</span>x<span class="token operator">:</span> <span class="token number">50</span><span class="token punctuation">,</span> y<span class="token operator">:</span><span class="token number">50</span><span class="token punctuation">&#125;</span><span class="token punctuation">&#125;</span></span> <span class="token punctuation">/></span></span>
<span class="token tag"><span class="token tag"><span class="token punctuation">&lt;</span>div</span> <span class="token attr-name"><span class="token namespace">transition:</span>slide</span> <span class="token punctuation">/></span></span>
<span class="token tag"><span class="token tag"><span class="token punctuation">&lt;</span>div</span> <span class="token attr-name"><span class="token namespace">transition:</span>scale=</span><span class="token language-javascript"><span class="token punctuation">&#123;</span><span class="token punctuation">&#123;</span>start<span class="token operator">:</span> <span class="token number">0.5</span><span class="token punctuation">&#125;</span><span class="token punctuation">&#125;</span></span> <span class="token punctuation">/></span></span>
<span class="token tag"><span class="token tag"><span class="token punctuation">&lt;</span>div</span> <span class="token attr-name"><span class="token namespace">transition:</span>blur=</span><span class="token language-javascript"><span class="token punctuation">&#123;</span><span class="token punctuation">&#123;</span>amount<span class="token operator">:</span> <span class="token number">2</span><span class="token punctuation">&#125;</span><span class="token punctuation">&#125;</span></span> <span class="token punctuation">/></span></span></code>` + "";

	return {
		c() {
			div = element("div");
			pre = element("pre");
			attr(pre, "class", "language-svelte");
			attr(div, "class", "container svelte-l83dwf");
		},
		m(target, anchor) {
			insert(target, div, anchor);
			append(div, pre);
			pre.innerHTML = raw_value;
		},
		p: noop,
		i: noop,
		o: noop,
		d(detaching) {
			if (detaching) detach(div);
		}
	};
}

class Slides5 extends SvelteComponent {
	constructor(options) {
		super();
		if (!document.getElementById("svelte-l83dwf-style")) add_css$5();
		init(this, options, null, create_fragment$5, safe_not_equal, {});
	}
}

/* @@slides6.svelte generated by Svelte v3.24.0 */

function add_css$6() {
	var style = element("style");
	style.id = "svelte-h8tvqg-style";
	style.textContent = "div.svelte-h8tvqg{display:grid;height:100%;align-items:center;font-size:42px}ul.svelte-h8tvqg{margin:0}li.svelte-h8tvqg{margin:45px 0}";
	append(document.head, style);
}

function create_fragment$6(ctx) {
	let div;

	return {
		c() {
			div = element("div");

			div.innerHTML = `<ul class="svelte-h8tvqg"><li class="svelte-h8tvqg"><a href="https://svelte.dev/docs#svelte_transition" rel="nofollow">https://svelte.dev/docs#svelte_transition</a></li> 
<li class="svelte-h8tvqg"><a href="https://svelte.dev/tutorial/transition" rel="nofollow">https://svelte.dev/tutorial/transition</a></li></ul>`;

			attr(div, "class", "svelte-h8tvqg");
		},
		m(target, anchor) {
			insert(target, div, anchor);
		},
		p: noop,
		i: noop,
		o: noop,
		d(detaching) {
			if (detaching) detach(div);
		}
	};
}

class Slides6 extends SvelteComponent {
	constructor(options) {
		super();
		if (!document.getElementById("svelte-h8tvqg-style")) add_css$6();
		init(this, options, null, create_fragment$6, safe_not_equal, {});
	}
}

/* @@slides7.svelte generated by Svelte v3.24.0 */

function add_css$7() {
	var style = element("style");
	style.id = "svelte-11o4zfu-style";
	style.textContent = "div.svelte-11o4zfu{display:grid;place-content:center;height:100%}h1.svelte-11o4zfu{margin:0}";
	append(document.head, style);
}

function create_fragment$7(ctx) {
	let div;

	return {
		c() {
			div = element("div");
			div.innerHTML = `<h1 class="svelte-11o4zfu">🚗 2️⃣  The <code>transition:</code> contract</h1>`;
			attr(div, "class", "svelte-11o4zfu");
		},
		m(target, anchor) {
			insert(target, div, anchor);
		},
		p: noop,
		i: noop,
		o: noop,
		d(detaching) {
			if (detaching) detach(div);
		}
	};
}

class Slides7 extends SvelteComponent {
	constructor(options) {
		super();
		if (!document.getElementById("svelte-11o4zfu-style")) add_css$7();
		init(this, options, null, create_fragment$7, safe_not_equal, {});
	}
}

/* @@slides8.svelte generated by Svelte v3.24.0 */

function create_fragment$8(ctx) {
	let h2;
	let t3;
	let pre;

	let raw_value = `<code class="language-js"><span class="token keyword">function</span> <span class="token function">transition</span><span class="token punctuation">(</span><span class="token parameter">node<span class="token punctuation">,</span> params</span><span class="token punctuation">)</span> <span class="token punctuation">&#123;</span>
  <span class="token keyword">return</span> <span class="token punctuation">&#123;</span>
    delay<span class="token operator">:</span> <span class="token number">0</span><span class="token punctuation">,</span> <span class="token comment">// delay in ms</span>
    duration<span class="token operator">:</span> <span class="token number">300</span><span class="token punctuation">,</span> <span class="token comment">// duration in ms</span>
    easing<span class="token operator">:</span> linear<span class="token punctuation">,</span> <span class="token comment">// easing function</span>
    <span class="token function-variable function">css</span><span class="token operator">:</span> <span class="token punctuation">(</span><span class="token parameter">t<span class="token punctuation">,</span> u</span><span class="token punctuation">)</span> <span class="token operator">=></span> <span class="token punctuation">&#123;</span> <span class="token comment">// css transition</span>
      <span class="token keyword">return</span> <span class="token template-string"><span class="token template-punctuation string">&#96;</span><span class="token string">transform: translateX(</span><span class="token interpolation"><span class="token interpolation-punctuation punctuation">$&#123;</span>t <span class="token operator">*</span> <span class="token number">100</span><span class="token interpolation-punctuation punctuation">&#125;</span></span><span class="token string">px)</span><span class="token template-punctuation string">&#96;</span></span><span class="token punctuation">;</span>
    <span class="token punctuation">&#125;</span><span class="token punctuation">,</span>
    <span class="token function-variable function">tick</span><span class="token operator">:</span> <span class="token punctuation">(</span><span class="token parameter">t<span class="token punctuation">,</span> u</span><span class="token punctuation">)</span> <span class="token operator">=></span> <span class="token punctuation">&#123;</span> <span class="token comment">// callback</span>
      node<span class="token punctuation">.</span>styles<span class="token punctuation">.</span>color <span class="token operator">=</span> <span class="token function">getColor</span><span class="token punctuation">(</span>t<span class="token punctuation">)</span><span class="token punctuation">;</span>
    <span class="token punctuation">&#125;</span><span class="token punctuation">,</span>
  <span class="token punctuation">&#125;</span>
<span class="token punctuation">&#125;</span></code>` + "";

	return {
		c() {
			h2 = element("h2");
			h2.innerHTML = `The <code>transition:</code> contract`;
			t3 = space();
			pre = element("pre");
			attr(pre, "class", "language-js");
		},
		m(target, anchor) {
			insert(target, h2, anchor);
			insert(target, t3, anchor);
			insert(target, pre, anchor);
			pre.innerHTML = raw_value;
		},
		p: noop,
		i: noop,
		o: noop,
		d(detaching) {
			if (detaching) detach(h2);
			if (detaching) detach(t3);
			if (detaching) detach(pre);
		}
	};
}

class Slides8 extends SvelteComponent {
	constructor(options) {
		super();
		init(this, options, null, create_fragment$8, safe_not_equal, {});
	}
}

/* @@slides9.svelte generated by Svelte v3.24.0 */

function create_fragment$9(ctx) {
	let h2;
	let t3;
	let pre;

	let raw_value = `<code class="language-js"><span class="token keyword">function</span> <span class="token function">transition</span><span class="token punctuation">(</span><span class="token parameter">node<span class="token punctuation">,</span> params</span><span class="token punctuation">)</span> <span class="token punctuation">&#123;</span>
  <span class="token keyword">return</span> <span class="token keyword">function</span> <span class="token punctuation">(</span><span class="token punctuation">)</span> <span class="token punctuation">&#123;</span>
    <span class="token keyword">return</span> <span class="token punctuation">&#123;</span>
      delay<span class="token operator">:</span> <span class="token number">0</span><span class="token punctuation">,</span> <span class="token comment">// delay in ms</span>
      duration<span class="token operator">:</span> <span class="token number">300</span><span class="token punctuation">,</span> <span class="token comment">// duration in ms</span>
      easing<span class="token operator">:</span> linear<span class="token punctuation">,</span> <span class="token comment">// easing function</span>
      <span class="token function-variable function">css</span><span class="token operator">:</span> <span class="token punctuation">(</span><span class="token parameter">t<span class="token punctuation">,</span> u</span><span class="token punctuation">)</span> <span class="token operator">=></span> <span class="token punctuation">&#123;</span> <span class="token comment">// css transition</span>
        <span class="token keyword">return</span> <span class="token template-string"><span class="token template-punctuation string">&#96;</span><span class="token string">transform: translateX(</span><span class="token interpolation"><span class="token interpolation-punctuation punctuation">$&#123;</span>t <span class="token operator">*</span> <span class="token number">100</span><span class="token interpolation-punctuation punctuation">&#125;</span></span><span class="token string">px)</span><span class="token template-punctuation string">&#96;</span></span><span class="token punctuation">;</span>
      <span class="token punctuation">&#125;</span><span class="token punctuation">,</span>
      <span class="token function-variable function">tick</span><span class="token operator">:</span> <span class="token punctuation">(</span><span class="token parameter">t<span class="token punctuation">,</span> u</span><span class="token punctuation">)</span> <span class="token operator">=></span> <span class="token punctuation">&#123;</span> <span class="token comment">// callback</span>
        node<span class="token punctuation">.</span>styles<span class="token punctuation">.</span>color <span class="token operator">=</span> <span class="token function">getColor</span><span class="token punctuation">(</span>t<span class="token punctuation">)</span><span class="token punctuation">;</span>
      <span class="token punctuation">&#125;</span><span class="token punctuation">,</span>
    <span class="token punctuation">&#125;</span>
  <span class="token punctuation">&#125;</span>
<span class="token punctuation">&#125;</span></code>` + "";

	return {
		c() {
			h2 = element("h2");
			h2.innerHTML = `The <code>transition:</code> contract`;
			t3 = space();
			pre = element("pre");
			attr(pre, "class", "language-js");
		},
		m(target, anchor) {
			insert(target, h2, anchor);
			insert(target, t3, anchor);
			insert(target, pre, anchor);
			pre.innerHTML = raw_value;
		},
		p: noop,
		i: noop,
		o: noop,
		d(detaching) {
			if (detaching) detach(h2);
			if (detaching) detach(t3);
			if (detaching) detach(pre);
		}
	};
}

class Slides9 extends SvelteComponent {
	constructor(options) {
		super();
		init(this, options, null, create_fragment$9, safe_not_equal, {});
	}
}

/* @@slides10.svelte generated by Svelte v3.24.0 */

function create_fragment$a(ctx) {
	let h2;
	let t3;
	let pre;

	let raw_value = `<code class="language-js"><span class="token keyword">function</span> <span class="token function">transition</span><span class="token punctuation">(</span><span class="token parameter">node<span class="token punctuation">,</span> params</span><span class="token punctuation">)</span> <span class="token punctuation">&#123;</span>
  <span class="token keyword">return</span> <span class="token punctuation">&#123;</span>
    delay<span class="token operator">:</span> params<span class="token punctuation">.</span>delay<span class="token punctuation">,</span> <span class="token comment">// delay in ms</span>
    duration<span class="token operator">:</span> params<span class="token punctuation">.</span>duration<span class="token punctuation">,</span> <span class="token comment">// duration in ms</span>
    easing<span class="token operator">:</span> params<span class="token punctuation">.</span>easing<span class="token punctuation">,</span> <span class="token comment">// easing function</span>
    <span class="token function-variable function">css</span><span class="token operator">:</span> <span class="token punctuation">(</span><span class="token parameter">t<span class="token punctuation">,</span> u</span><span class="token punctuation">)</span> <span class="token operator">=></span> <span class="token punctuation">&#123;</span> <span class="token comment">// css transition</span>
      <span class="token keyword">return</span> <span class="token template-string"><span class="token template-punctuation string">&#96;</span><span class="token string">transform: translateX(</span><span class="token interpolation"><span class="token interpolation-punctuation punctuation">$&#123;</span>t <span class="token operator">*</span> <span class="token number">100</span><span class="token interpolation-punctuation punctuation">&#125;</span></span><span class="token string">px)</span><span class="token template-punctuation string">&#96;</span></span><span class="token punctuation">;</span>
    <span class="token punctuation">&#125;</span><span class="token punctuation">,</span>
    <span class="token function-variable function">tick</span><span class="token operator">:</span> <span class="token punctuation">(</span><span class="token parameter">t<span class="token punctuation">,</span> u</span><span class="token punctuation">)</span> <span class="token operator">=></span> <span class="token punctuation">&#123;</span> <span class="token comment">// callback</span>
      node<span class="token punctuation">.</span>styles<span class="token punctuation">.</span>color <span class="token operator">=</span> <span class="token function">getColor</span><span class="token punctuation">(</span>t<span class="token punctuation">)</span><span class="token punctuation">;</span>
    <span class="token punctuation">&#125;</span><span class="token punctuation">,</span>
  <span class="token punctuation">&#125;</span>
<span class="token punctuation">&#125;</span></code>` + "";

	return {
		c() {
			h2 = element("h2");
			h2.innerHTML = `The <code>transition:</code> contract`;
			t3 = space();
			pre = element("pre");
			attr(pre, "class", "language-js");
		},
		m(target, anchor) {
			insert(target, h2, anchor);
			insert(target, t3, anchor);
			insert(target, pre, anchor);
			pre.innerHTML = raw_value;
		},
		p: noop,
		i: noop,
		o: noop,
		d(detaching) {
			if (detaching) detach(h2);
			if (detaching) detach(t3);
			if (detaching) detach(pre);
		}
	};
}

class Slides10 extends SvelteComponent {
	constructor(options) {
		super();
		init(this, options, null, create_fragment$a, safe_not_equal, {});
	}
}

/* demystifying-transitions/components/easing.svelte generated by Svelte v3.24.0 */

function add_css$8() {
	var style = element("style");
	style.id = "svelte-v43vje-style";
	style.textContent = ".container.svelte-v43vje.svelte-v43vje{display:grid;grid-template-columns:1fr 1fr;height:100%}.left.svelte-v43vje.svelte-v43vje{display:flex;flex-direction:column;align-items:center;justify-content:center}.right.svelte-v43vje.svelte-v43vje{margin-top:100px}svg.svelte-v43vje.svelte-v43vje{overflow:visible;margin:3em}polyline.svelte-v43vje.svelte-v43vje{fill:none;stroke:black}polyline.svelte-v43vje.svelte-v43vje{stroke:red;stroke-width:2}.x.svelte-v43vje text.svelte-v43vje{text-anchor:middle}.y.svelte-v43vje text.svelte-v43vje{text-anchor:end;dominant-baseline:middle}.square.svelte-v43vje.svelte-v43vje{margin-top:50px;background:red;height:50px;width:50px;position:relative;left:-100px}.none.svelte-v43vje.svelte-v43vje{display:none}select.svelte-v43vje.svelte-v43vje{font-family:inherit;font-size:inherit;padding:0.2em 0.4em;box-sizing:border-box;border:1px solid #ccc;border-radius:2px}";
	append(document.head, style);
}

function get_each_context$1(ctx, list, i) {
	const child_ctx = ctx.slice();
	child_ctx[7] = list[i];
	return child_ctx;
}

// (67:2) {#each fns as fn}
function create_each_block$1(ctx) {
	let option;
	let t_1_value = /*fn*/ ctx[7].name + "";
	let t_1;
	let option_value_value;

	return {
		c() {
			option = element("option");
			t_1 = text(t_1_value);
			option.__value = option_value_value = /*fn*/ ctx[7];
			option.value = option.__value;
		},
		m(target, anchor) {
			insert(target, option, anchor);
			append(option, t_1);
		},
		p: noop,
		d(detaching) {
			if (detaching) detach(option);
		}
	};
}

function create_fragment$b(ctx) {
	let div13;
	let div1;
	let select;
	let t0;
	let svg0;
	let defs;
	let marker;
	let path0;
	let path1;
	let g0;
	let text0;
	let t1;
	let text1;
	let t2;
	let text2;
	let t3;
	let path2;
	let g1;
	let text3;
	let t4;
	let text4;
	let t5;
	let text5;
	let t6;
	let polyline;
	let circle0;
	let t7;
	let svg1;
	let path3;
	let path4;
	let circle1;
	let t8;
	let div0;

	let t9_value = (/*i*/ ctx[0] === 11
	? /*u*/ ctx[3].toFixed(3)
	: /*i*/ ctx[0] === 12
		? ("Hello World").slice(0, Math.round(11 * /*u*/ ctx[3]))
		: "") + "";

	let t9;
	let t10;
	let div12;
	let div2;
	let prismJs_action;
	let t11;
	let br0;
	let t12;
	let div3;
	let prismJs_action_1;
	let t13;
	let div4;
	let prismJs_action_2;
	let t14;
	let div5;
	let prismJs_action_3;
	let t15;
	let div6;
	let prismJs_action_4;
	let t16;
	let br1;
	let t17;
	let div7;
	let prismJs_action_5;
	let t18;
	let div8;
	let prismJs_action_6;
	let t19;
	let div9;
	let prismJs_action_7;
	let t20;
	let div10;
	let prismJs_action_8;
	let t21;
	let div11;
	let prismJs_action_9;
	let mounted;
	let dispose;
	let each_value = /*fns*/ ctx[8];
	let each_blocks = [];

	for (let i = 0; i < each_value.length; i += 1) {
		each_blocks[i] = create_each_block$1(get_each_context$1(ctx, each_value, i));
	}

	return {
		c() {
			div13 = element("div");
			div1 = element("div");
			select = element("select");

			for (let i = 0; i < each_blocks.length; i += 1) {
				each_blocks[i].c();
			}

			t0 = space();
			svg0 = svg_element("svg");
			defs = svg_element("defs");
			marker = svg_element("marker");
			path0 = svg_element("path");
			path1 = svg_element("path");
			g0 = svg_element("g");
			text0 = svg_element("text");
			t1 = text("0");
			text1 = svg_element("text");
			t2 = text("1");
			text2 = svg_element("text");
			t3 = text("eased time");
			path2 = svg_element("path");
			g1 = svg_element("g");
			text3 = svg_element("text");
			t4 = text("1");
			text4 = svg_element("text");
			t5 = text("0");
			text5 = svg_element("text");
			t6 = text("time");
			polyline = svg_element("polyline");
			circle0 = svg_element("circle");
			t7 = space();
			svg1 = svg_element("svg");
			path3 = svg_element("path");
			path4 = svg_element("path");
			circle1 = svg_element("circle");
			t8 = space();
			div0 = element("div");
			t9 = text(t9_value);
			t10 = space();
			div12 = element("div");
			div2 = element("div");
			t11 = space();
			br0 = element("br");
			t12 = space();
			div3 = element("div");
			t13 = space();
			div4 = element("div");
			t14 = space();
			div5 = element("div");
			t15 = space();
			div6 = element("div");
			t16 = space();
			br1 = element("br");
			t17 = space();
			div7 = element("div");
			t18 = space();
			div8 = element("div");
			t19 = space();
			div9 = element("div");
			t20 = space();
			div10 = element("div");
			t21 = space();
			div11 = element("div");
			attr(select, "class", "svelte-v43vje");
			if (/*fn*/ ctx[7] === void 0) add_render_callback(() => /*select_change_handler*/ ctx[9].call(select));
			toggle_class(select, "hidden", /*i*/ ctx[0] < 2);
			attr(path0, "d", "M0,0 V12 L6,6 Z");
			attr(path0, "fill", "black");
			attr(marker, "id", "head");
			attr(marker, "orient", "auto");
			attr(marker, "markerWidth", "6");
			attr(marker, "markerHeight", "12");
			attr(marker, "refX", "0.1");
			attr(marker, "refY", "6");
			attr(path1, "d", "M0,0 200,0");
			attr(path1, "marker-end", "url(#head)");
			attr(path1, "stroke", "black");
			attr(text0, "x", "0");
			attr(text0, "class", "svelte-v43vje");
			attr(text1, "x", "200");
			attr(text1, "class", "svelte-v43vje");
			attr(text2, "x", "100");
			attr(text2, "class", "svelte-v43vje");
			attr(g0, "class", "x svelte-v43vje");
			attr(g0, "transform", "translate(0,-10)");
			attr(path2, "d", "M0,0 0,200");
			attr(path2, "marker-end", "url(#head)");
			attr(path2, "stroke", "black");
			attr(text3, "y", "200");
			attr(text3, "class", "svelte-v43vje");
			attr(text4, "y", "0");
			attr(text4, "class", "svelte-v43vje");
			attr(text5, "y", "100");
			attr(text5, "class", "svelte-v43vje");
			attr(g1, "class", "y svelte-v43vje");
			attr(g1, "transform", "translate(-10,0)");
			attr(polyline, "points", /*points*/ ctx[6]);
			attr(polyline, "class", "svelte-v43vje");
			attr(circle0, "r", "5");
			attr(circle0, "fill", "red");
			attr(circle0, "cx", /*cx*/ ctx[4]);
			attr(circle0, "cy", /*cy*/ ctx[5]);
			toggle_class(circle0, "hidden", /*i*/ ctx[0] < 1);
			attr(svg0, "width", "200");
			attr(svg0, "height", "200");
			attr(svg0, "class", "svelte-v43vje");
			attr(path3, "d", "M-50,0 250,0");
			attr(path3, "stroke", "#ddd");
			attr(path3, "stroke-width", "2");
			attr(path4, "d", "M0,0 200,0");
			attr(path4, "stroke", "black");
			attr(path4, "stroke-width", "3");
			attr(circle1, "r", "5");
			attr(circle1, "fill", "black");
			attr(circle1, "cx", /*cx*/ ctx[4]);
			attr(circle1, "cy", "0");
			attr(svg1, "height", "5");
			attr(svg1, "width", "200");
			set_style(svg1, "margin", "1em 0");
			attr(svg1, "class", "svelte-v43vje");
			toggle_class(svg1, "hidden", /*i*/ ctx[0] < 1);
			attr(div0, "class", "square svelte-v43vje");

			set_style(div0, "transform", "translateX(" + (/*i*/ ctx[0] === 9 || /*i*/ ctx[0] === 8
			? /*u*/ ctx[3]
			: /*i*/ ctx[0] === 10 ? 1 - /*u*/ ctx[3] : 0) * 250 + "px)");

			toggle_class(div0, "hidden", /*i*/ ctx[0] < 8);
			attr(div1, "class", "left svelte-v43vje");
			attr(div2, "class", "code");
			attr(div3, "class", "code");
			toggle_class(div3, "hidden", /*i*/ ctx[0] < 4);
			attr(div4, "class", "code");
			toggle_class(div4, "hidden", /*i*/ ctx[0] < 5);
			attr(div5, "class", "code");
			toggle_class(div5, "hidden", /*i*/ ctx[0] < 6);
			attr(div6, "class", "code");
			toggle_class(div6, "hidden", /*i*/ ctx[0] < 7);
			attr(div7, "class", "code svelte-v43vje");
			toggle_class(div7, "none", /*i*/ ctx[0] !== 8);
			attr(div8, "class", "code svelte-v43vje");
			toggle_class(div8, "none", /*i*/ ctx[0] !== 9);
			attr(div9, "class", "code svelte-v43vje");
			toggle_class(div9, "none", /*i*/ ctx[0] !== 10);
			attr(div10, "class", "code svelte-v43vje");
			toggle_class(div10, "none", /*i*/ ctx[0] !== 11);
			attr(div11, "class", "code svelte-v43vje");
			toggle_class(div11, "none", /*i*/ ctx[0] !== 12);
			attr(div12, "class", "right svelte-v43vje");
			toggle_class(div12, "hidden", /*i*/ ctx[0] < 3);
			attr(div13, "class", "container svelte-v43vje");
		},
		m(target, anchor) {
			insert(target, div13, anchor);
			append(div13, div1);
			append(div1, select);

			for (let i = 0; i < each_blocks.length; i += 1) {
				each_blocks[i].m(select, null);
			}

			select_option(select, /*fn*/ ctx[7]);
			append(div1, t0);
			append(div1, svg0);
			append(svg0, defs);
			append(defs, marker);
			append(marker, path0);
			append(svg0, path1);
			append(svg0, g0);
			append(g0, text0);
			append(text0, t1);
			append(g0, text1);
			append(text1, t2);
			append(g0, text2);
			append(text2, t3);
			append(svg0, path2);
			append(svg0, g1);
			append(g1, text3);
			append(text3, t4);
			append(g1, text4);
			append(text4, t5);
			append(g1, text5);
			append(text5, t6);
			append(svg0, polyline);
			append(svg0, circle0);
			append(div1, t7);
			append(div1, svg1);
			append(svg1, path3);
			append(svg1, path4);
			append(svg1, circle1);
			append(div1, t8);
			append(div1, div0);
			append(div0, t9);
			append(div13, t10);
			append(div13, div12);
			append(div12, div2);
			append(div12, t11);
			append(div12, br0);
			append(div12, t12);
			append(div12, div3);
			append(div12, t13);
			append(div12, div4);
			append(div12, t14);
			append(div12, div5);
			append(div12, t15);
			append(div12, div6);
			append(div12, t16);
			append(div12, br1);
			append(div12, t17);
			append(div12, div7);
			append(div12, t18);
			append(div12, div8);
			append(div12, t19);
			append(div12, div9);
			append(div12, t20);
			append(div12, div10);
			append(div12, t21);
			append(div12, div11);

			if (!mounted) {
				dispose = [
					listen(select, "change", /*select_change_handler*/ ctx[9]),
					action_destroyer(prismJs_action = prismJs.call(null, div2, /*fn*/ ctx[7].fn.toString())),
					action_destroyer(prismJs_action_1 = prismJs.call(null, div3, "let start = Date.now();")),
					action_destroyer(prismJs_action_2 = prismJs.call(null, div4, `let t = Date.now() - start; // ${throttle(/*duration*/ ctx[1])}`)),
					action_destroyer(prismJs_action_3 = prismJs.call(null, div5, `t = t / duration; // ${/*t*/ ctx[2].toFixed(3)}`)),
					action_destroyer(prismJs_action_4 = prismJs.call(null, div6, `t = ${/*fn*/ ctx[7].fn.name}(t); // ${/*u*/ ctx[3].toFixed(3)}`)),
					action_destroyer(prismJs_action_5 = prismJs.call(null, div7, `node.style.transform = \`translateX(\${t * 250}px)\`; // transformX(${(/*u*/ ctx[3] * 250).toFixed(1)}px)`)),
					action_destroyer(prismJs_action_6 = prismJs.call(null, div8, `css: (t, u) => \`translateX(\${t * 250}px)\``)),
					action_destroyer(prismJs_action_7 = prismJs.call(null, div9, `css: (t, u) => \`translateX(\${u * 250}px)\``)),
					action_destroyer(prismJs_action_8 = prismJs.call(null, div10, `tick: (t, u) => node.textContent = t`)),
					action_destroyer(prismJs_action_9 = prismJs.call(null, div11, `const string = 'Hello World';\ntick: (t, u) => {\n  node.textContent = string.slice(0, Math.round(string.length * t));\n}`))
				];

				mounted = true;
			}
		},
		p(ctx, [dirty]) {
			if (dirty & /*fns*/ 256) {
				each_value = /*fns*/ ctx[8];
				let i;

				for (i = 0; i < each_value.length; i += 1) {
					const child_ctx = get_each_context$1(ctx, each_value, i);

					if (each_blocks[i]) {
						each_blocks[i].p(child_ctx, dirty);
					} else {
						each_blocks[i] = create_each_block$1(child_ctx);
						each_blocks[i].c();
						each_blocks[i].m(select, null);
					}
				}

				for (; i < each_blocks.length; i += 1) {
					each_blocks[i].d(1);
				}

				each_blocks.length = each_value.length;
			}

			if (dirty & /*fn, fns*/ 384) {
				select_option(select, /*fn*/ ctx[7]);
			}

			if (dirty & /*i*/ 1) {
				toggle_class(select, "hidden", /*i*/ ctx[0] < 2);
			}

			if (dirty & /*points*/ 64) {
				attr(polyline, "points", /*points*/ ctx[6]);
			}

			if (dirty & /*cx*/ 16) {
				attr(circle0, "cx", /*cx*/ ctx[4]);
			}

			if (dirty & /*cy*/ 32) {
				attr(circle0, "cy", /*cy*/ ctx[5]);
			}

			if (dirty & /*i*/ 1) {
				toggle_class(circle0, "hidden", /*i*/ ctx[0] < 1);
			}

			if (dirty & /*cx*/ 16) {
				attr(circle1, "cx", /*cx*/ ctx[4]);
			}

			if (dirty & /*i*/ 1) {
				toggle_class(svg1, "hidden", /*i*/ ctx[0] < 1);
			}

			if (dirty & /*i, u*/ 9 && t9_value !== (t9_value = (/*i*/ ctx[0] === 11
			? /*u*/ ctx[3].toFixed(3)
			: /*i*/ ctx[0] === 12
				? ("Hello World").slice(0, Math.round(11 * /*u*/ ctx[3]))
				: "") + "")) set_data(t9, t9_value);

			if (dirty & /*i, u*/ 9) {
				set_style(div0, "transform", "translateX(" + (/*i*/ ctx[0] === 9 || /*i*/ ctx[0] === 8
				? /*u*/ ctx[3]
				: /*i*/ ctx[0] === 10 ? 1 - /*u*/ ctx[3] : 0) * 250 + "px)");
			}

			if (dirty & /*i*/ 1) {
				toggle_class(div0, "hidden", /*i*/ ctx[0] < 8);
			}

			if (prismJs_action && is_function(prismJs_action.update) && dirty & /*fn*/ 128) prismJs_action.update.call(null, /*fn*/ ctx[7].fn.toString());

			if (dirty & /*i*/ 1) {
				toggle_class(div3, "hidden", /*i*/ ctx[0] < 4);
			}

			if (prismJs_action_2 && is_function(prismJs_action_2.update) && dirty & /*duration*/ 2) prismJs_action_2.update.call(null, `let t = Date.now() - start; // ${throttle(/*duration*/ ctx[1])}`);

			if (dirty & /*i*/ 1) {
				toggle_class(div4, "hidden", /*i*/ ctx[0] < 5);
			}

			if (prismJs_action_3 && is_function(prismJs_action_3.update) && dirty & /*t*/ 4) prismJs_action_3.update.call(null, `t = t / duration; // ${/*t*/ ctx[2].toFixed(3)}`);

			if (dirty & /*i*/ 1) {
				toggle_class(div5, "hidden", /*i*/ ctx[0] < 6);
			}

			if (prismJs_action_4 && is_function(prismJs_action_4.update) && dirty & /*fn, u*/ 136) prismJs_action_4.update.call(null, `t = ${/*fn*/ ctx[7].fn.name}(t); // ${/*u*/ ctx[3].toFixed(3)}`);

			if (dirty & /*i*/ 1) {
				toggle_class(div6, "hidden", /*i*/ ctx[0] < 7);
			}

			if (prismJs_action_5 && is_function(prismJs_action_5.update) && dirty & /*u*/ 8) prismJs_action_5.update.call(null, `node.style.transform = \`translateX(\${t * 250}px)\`; // transformX(${(/*u*/ ctx[3] * 250).toFixed(1)}px)`);

			if (dirty & /*i*/ 1) {
				toggle_class(div7, "none", /*i*/ ctx[0] !== 8);
			}

			if (dirty & /*i*/ 1) {
				toggle_class(div8, "none", /*i*/ ctx[0] !== 9);
			}

			if (dirty & /*i*/ 1) {
				toggle_class(div9, "none", /*i*/ ctx[0] !== 10);
			}

			if (dirty & /*i*/ 1) {
				toggle_class(div10, "none", /*i*/ ctx[0] !== 11);
			}

			if (dirty & /*i*/ 1) {
				toggle_class(div11, "none", /*i*/ ctx[0] !== 12);
			}

			if (dirty & /*i*/ 1) {
				toggle_class(div12, "hidden", /*i*/ ctx[0] < 3);
			}
		},
		i: noop,
		o: noop,
		d(detaching) {
			if (detaching) detach(div13);
			destroy_each(each_blocks, detaching);
			mounted = false;
			run_all(dispose);
		}
	};
}

function linear(t) {
	return t;
}

function generatePoints(fn) {
	let point = "";

	for (let i = 0; i < 1; i += 0.005) {
		point += `${fn(i) * 200},${i * 200} `;
	}

	return point;
}

function throttle(v) {
	return v - v % 5;
}

function instance$4($$self, $$props, $$invalidate) {
	let fns = [
		{ name: "linear", fn: linear },
		{ name: "bounceInOut", fn: bounceInOut },
		{ name: "bounceIn", fn: bounceIn },
		{ name: "bounceOut", fn: bounceOut },
		{ name: "cubicInOut", fn: cubicInOut },
		{ name: "cubicIn", fn: cubicIn },
		{ name: "cubicOut", fn: cubicOut },
		{ name: "quadInOut", fn: quadInOut },
		{ name: "quadIn", fn: quadIn },
		{ name: "quadOut", fn: quadOut },
		{ name: "quartInOut", fn: quartInOut },
		{ name: "quartIn", fn: quartIn },
		{ name: "quartOut", fn: quartOut }
	];

	let fn = fns[0];
	let start = Date.now();
	let duration;
	let t = 0, u = 0;
	let { i = 3 } = $$props;
	let cx = 0, cy = 0;

	function loop() {
		const now = Date.now();
		$$invalidate(1, duration = (now - start) % d);
		$$invalidate(2, t = duration / d);
		$$invalidate(3, u = fn.fn(t));
		$$invalidate(5, cy = t * 200);
		$$invalidate(4, cx = fn.fn(t) * 200);
		requestAnimationFrame(loop);
	}

	requestAnimationFrame(loop);

	onDestroy(() => {
		cancelAnimationFrame(loop);
	});

	function select_change_handler() {
		fn = select_value(this);
		$$invalidate(7, fn);
		$$invalidate(8, fns);
	}

	$$self.$set = $$props => {
		if ("i" in $$props) $$invalidate(0, i = $$props.i);
	};

	let d;
	let points;

	$$self.$$.update = () => {
		if ($$self.$$.dirty & /*i*/ 1) {
			 d = i < 5 ? 2000 : 8000;
		}

		if ($$self.$$.dirty & /*fn*/ 128) {
			 $$invalidate(6, points = generatePoints(fn.fn));
		}
	};

	return [i, duration, t, u, cx, cy, points, fn, fns, select_change_handler];
}

class Easing extends SvelteComponent {
	constructor(options) {
		super();
		if (!document.getElementById("svelte-v43vje-style")) add_css$8();
		init(this, options, instance$4, create_fragment$b, safe_not_equal, { i: 0 });
	}
}

/* @@slides11.svelte generated by Svelte v3.24.0 */

function create_fragment$c(ctx) {
	let easing;
	let current;
	easing = new Easing({ props: { i: /*i*/ ctx[0] } });

	return {
		c() {
			create_component(easing.$$.fragment);
		},
		m(target, anchor) {
			mount_component(easing, target, anchor);
			current = true;
		},
		p(ctx, [dirty]) {
			const easing_changes = {};
			if (dirty & /*i*/ 1) easing_changes.i = /*i*/ ctx[0];
			easing.$set(easing_changes);
		},
		i(local) {
			if (current) return;
			transition_in(easing.$$.fragment, local);
			current = true;
		},
		o(local) {
			transition_out(easing.$$.fragment, local);
			current = false;
		},
		d(detaching) {
			destroy_component(easing, detaching);
		}
	};
}

const LENGTH = 12;

function instance$5($$self, $$props, $$invalidate) {
	let i = 0;

	function next() {
		return i < LENGTH && $$invalidate(0, i++, i) < LENGTH;
	}

	function prev() {
		return i > 0 && $$invalidate(0, i--, i) > 0;
	}

	return [i, next, prev];
}

class Slides11 extends SvelteComponent {
	constructor(options) {
		super();
		init(this, options, instance$5, create_fragment$c, safe_not_equal, { next: 1, prev: 2 });
	}

	get next() {
		return this.$$.ctx[1];
	}

	get prev() {
		return this.$$.ctx[2];
	}
}

/* @@slides12.svelte generated by Svelte v3.24.0 */

function create_fragment$d(ctx) {
	let h2;
	let t3;
	let pre;

	let raw_value = `<code class="language-js"><span class="token keyword">function</span> <span class="token function">transition</span><span class="token punctuation">(</span><span class="token parameter">node<span class="token punctuation">,</span> params</span><span class="token punctuation">)</span> <span class="token punctuation">&#123;</span>
  <span class="token keyword">return</span> <span class="token punctuation">&#123;</span>
    delay<span class="token operator">:</span> <span class="token number">0</span><span class="token punctuation">,</span> <span class="token comment">// delay in ms</span>
    duration<span class="token operator">:</span> <span class="token number">300</span><span class="token punctuation">,</span> <span class="token comment">// duration in ms</span>
    easing<span class="token operator">:</span> linear<span class="token punctuation">,</span> <span class="token comment">// easing function</span>
    <span class="token function-variable function">css</span><span class="token operator">:</span> <span class="token punctuation">(</span><span class="token parameter">t<span class="token punctuation">,</span> u</span><span class="token punctuation">)</span> <span class="token operator">=></span> <span class="token punctuation">&#123;</span> <span class="token comment">// css transition</span>
      <span class="token keyword">return</span> <span class="token template-string"><span class="token template-punctuation string">&#96;</span><span class="token string">transform: translateX(</span><span class="token interpolation"><span class="token interpolation-punctuation punctuation">$&#123;</span>t <span class="token operator">*</span> <span class="token number">100</span><span class="token interpolation-punctuation punctuation">&#125;</span></span><span class="token string">px)</span><span class="token template-punctuation string">&#96;</span></span><span class="token punctuation">;</span>
    <span class="token punctuation">&#125;</span><span class="token punctuation">,</span>
    <span class="token function-variable function">tick</span><span class="token operator">:</span> <span class="token punctuation">(</span><span class="token parameter">t<span class="token punctuation">,</span> u</span><span class="token punctuation">)</span> <span class="token operator">=></span> <span class="token punctuation">&#123;</span> <span class="token comment">// callback</span>
      node<span class="token punctuation">.</span>styles<span class="token punctuation">.</span>color <span class="token operator">=</span> <span class="token function">getColor</span><span class="token punctuation">(</span>t<span class="token punctuation">)</span><span class="token punctuation">;</span>
    <span class="token punctuation">&#125;</span><span class="token punctuation">,</span>
  <span class="token punctuation">&#125;</span>
<span class="token punctuation">&#125;</span></code>` + "";

	return {
		c() {
			h2 = element("h2");
			h2.innerHTML = `The <code>transition:</code> contract`;
			t3 = space();
			pre = element("pre");
			attr(pre, "class", "language-js");
		},
		m(target, anchor) {
			insert(target, h2, anchor);
			insert(target, t3, anchor);
			insert(target, pre, anchor);
			pre.innerHTML = raw_value;
		},
		p: noop,
		i: noop,
		o: noop,
		d(detaching) {
			if (detaching) detach(h2);
			if (detaching) detach(t3);
			if (detaching) detach(pre);
		}
	};
}

class Slides12 extends SvelteComponent {
	constructor(options) {
		super();
		init(this, options, null, create_fragment$d, safe_not_equal, {});
	}
}

/* @@slides13.svelte generated by Svelte v3.24.0 */

function add_css$9() {
	var style = element("style");
	style.id = "svelte-cxmxle-style";
	style.textContent = "iframe.svelte-cxmxle{height:100%;width:100%;outline:0;border:0;display:block}";
	append(document.head, style);
}

function create_fragment$e(ctx) {
	let iframe;
	let iframe_src_value;

	return {
		c() {
			iframe = element("iframe");
			if (iframe.src !== (iframe_src_value = "https://svelte.dev/repl/c88da2fde68a415cbd43aa738bfcefab?version=3.29.0")) attr(iframe, "src", iframe_src_value);
			attr(iframe, "class", "svelte-cxmxle");
		},
		m(target, anchor) {
			insert(target, iframe, anchor);
		},
		p: noop,
		i: noop,
		o: noop,
		d(detaching) {
			if (detaching) detach(iframe);
		}
	};
}

class Slides13 extends SvelteComponent {
	constructor(options) {
		super();
		if (!document.getElementById("svelte-cxmxle-style")) add_css$9();
		init(this, options, null, create_fragment$e, safe_not_equal, {});
	}
}

/* @@slides14.svelte generated by Svelte v3.24.0 */

function add_css$a() {
	var style = element("style");
	style.id = "svelte-1q4kbmd-style";
	style.textContent = ".container.svelte-1q4kbmd{display:grid;height:100%;place-items:center;margin:0;text-align:center}h1.svelte-1q4kbmd{font-size:52px}";
	append(document.head, style);
}

function create_fragment$f(ctx) {
	let div3;

	return {
		c() {
			div3 = element("div");

			div3.innerHTML = `<h1 class="svelte-1q4kbmd">🚀 3️⃣  Compile <code>transition:</code> in your Head</h1> 
<div><div>📚 Compile Svelte in your head</div> 
  <div><a href="https://lihautan.com/compile-svelte-in-your-head">https://lihautan.com/compile-svelte-in-your-head</a></div></div>`;

			attr(div3, "class", "container svelte-1q4kbmd");
		},
		m(target, anchor) {
			insert(target, div3, anchor);
		},
		p: noop,
		i: noop,
		o: noop,
		d(detaching) {
			if (detaching) detach(div3);
		}
	};
}

class Slides14 extends SvelteComponent {
	constructor(options) {
		super();
		if (!document.getElementById("svelte-1q4kbmd-style")) add_css$a();
		init(this, options, null, create_fragment$f, safe_not_equal, {});
	}
}

/* @@slides15.svelte generated by Svelte v3.24.0 */

function add_css$b() {
	var style = element("style");
	style.id = "svelte-1nbgh8f-style";
	style.textContent = "#demo.svelte-1nbgh8f{opacity:1;transition:opacity 1s ease 0.5s}#demo.transparent.svelte-1nbgh8f{opacity:0}h1.svelte-1nbgh8f{margin:0}";
	append(document.head, style);
}

// (16:0) {:else}
function create_else_block(ctx) {
	let pre;
	let raw_value = `<code class="language-html"><span class="token tag"><span class="token tag"><span class="token punctuation">&lt;</span>div</span><span class="token punctuation">></span></span>TEST<span class="token tag"><span class="token tag"><span class="token punctuation">&lt;/</span>div</span><span class="token punctuation">></span></span></code>` + "";

	return {
		c() {
			pre = element("pre");
			attr(pre, "class", "language-html");
		},
		m(target, anchor) {
			insert(target, pre, anchor);
			pre.innerHTML = raw_value;
		},
		d(detaching) {
			if (detaching) detach(pre);
		}
	};
}

// (13:0) {#if toggled}
function create_if_block$2(ctx) {
	let pre;
	let raw_value = `<code class="language-html"><span class="token tag"><span class="token tag"><span class="token punctuation">&lt;</span>div</span> <span class="token attr-name">class</span><span class="token attr-value"><span class="token punctuation attr-equals">=</span><span class="token punctuation">"</span>transparent<span class="token punctuation">"</span></span><span class="token punctuation">></span></span>TEST<span class="token tag"><span class="token tag"><span class="token punctuation">&lt;/</span>div</span><span class="token punctuation">></span></span></code>` + "";

	return {
		c() {
			pre = element("pre");
			attr(pre, "class", "language-html");
		},
		m(target, anchor) {
			insert(target, pre, anchor);
			pre.innerHTML = raw_value;
		},
		d(detaching) {
			if (detaching) detach(pre);
		}
	};
}

function create_fragment$g(ctx) {
	let h1;
	let t1;
	let pre;

	let raw_value = `<code class="language-css"><span class="token selector">div</span> <span class="token punctuation">&#123;</span>
  <span class="token property">opacity</span><span class="token punctuation">:</span> 1<span class="token punctuation">;</span>
  <span class="token property">transition</span><span class="token punctuation">:</span> opacity 1s ease 0.5s<span class="token punctuation">;</span>
<span class="token punctuation">&#125;</span>
<span class="token selector">div.transparent</span> <span class="token punctuation">&#123;</span>
  <span class="token property">opacity</span><span class="token punctuation">:</span> 0<span class="token punctuation">;</span>
<span class="token punctuation">&#125;</span></code>` + "";

	let t2;
	let hr;
	let t3;
	let div;
	let t5;
	let button;
	let t6_value = (/*toggled*/ ctx[0] ? "Remove" : "Add") + "";
	let t6;
	let t7;
	let t8;
	let if_block_anchor;
	let mounted;
	let dispose;

	function select_block_type(ctx, dirty) {
		if (/*toggled*/ ctx[0]) return create_if_block$2;
		return create_else_block;
	}

	let current_block_type = select_block_type(ctx);
	let if_block = current_block_type(ctx);

	return {
		c() {
			h1 = element("h1");
			h1.textContent = "CSS Transition";
			t1 = space();
			pre = element("pre");
			t2 = space();
			hr = element("hr");
			t3 = space();
			div = element("div");
			div.textContent = "TEST";
			t5 = space();
			button = element("button");
			t6 = text(t6_value);
			t7 = text(" class");
			t8 = space();
			if_block.c();
			if_block_anchor = empty();
			attr(h1, "class", "svelte-1nbgh8f");
			attr(pre, "class", "language-css");
			attr(div, "id", "demo");
			attr(div, "class", "svelte-1nbgh8f");
			toggle_class(div, "transparent", /*toggled*/ ctx[0]);
		},
		m(target, anchor) {
			insert(target, h1, anchor);
			insert(target, t1, anchor);
			insert(target, pre, anchor);
			pre.innerHTML = raw_value;
			insert(target, t2, anchor);
			insert(target, hr, anchor);
			insert(target, t3, anchor);
			insert(target, div, anchor);
			insert(target, t5, anchor);
			insert(target, button, anchor);
			append(button, t6);
			append(button, t7);
			insert(target, t8, anchor);
			if_block.m(target, anchor);
			insert(target, if_block_anchor, anchor);

			if (!mounted) {
				dispose = listen(button, "click", /*toggle*/ ctx[1]);
				mounted = true;
			}
		},
		p(ctx, [dirty]) {
			if (dirty & /*toggled*/ 1) {
				toggle_class(div, "transparent", /*toggled*/ ctx[0]);
			}

			if (dirty & /*toggled*/ 1 && t6_value !== (t6_value = (/*toggled*/ ctx[0] ? "Remove" : "Add") + "")) set_data(t6, t6_value);

			if (current_block_type !== (current_block_type = select_block_type(ctx))) {
				if_block.d(1);
				if_block = current_block_type(ctx);

				if (if_block) {
					if_block.c();
					if_block.m(if_block_anchor.parentNode, if_block_anchor);
				}
			}
		},
		i: noop,
		o: noop,
		d(detaching) {
			if (detaching) detach(h1);
			if (detaching) detach(t1);
			if (detaching) detach(pre);
			if (detaching) detach(t2);
			if (detaching) detach(hr);
			if (detaching) detach(t3);
			if (detaching) detach(div);
			if (detaching) detach(t5);
			if (detaching) detach(button);
			if (detaching) detach(t8);
			if_block.d(detaching);
			if (detaching) detach(if_block_anchor);
			mounted = false;
			dispose();
		}
	};
}

function instance$6($$self, $$props, $$invalidate) {
	let toggled = false;

	function toggle() {
		$$invalidate(0, toggled = !toggled);
	}

	return [toggled, toggle];
}

class Slides15 extends SvelteComponent {
	constructor(options) {
		super();
		if (!document.getElementById("svelte-1nbgh8f-style")) add_css$b();
		init(this, options, instance$6, create_fragment$g, safe_not_equal, {});
	}
}

var code = "<style>\n{{rule}}\n  div {\n    animation: slide {{duration}}s linear;\n  }\n</style>\n<div>TEXT</div>";

var linear$1 = "  @keyframes slide {\n    0% { transform: translateX(0px); }\n    10% { transform: translateX(10px); }\n    20% { transform: translateX(20px); }\n    30% { transform: translateX(30px); }\n    40% { transform: translateX(40px); }\n    50% { transform: translateX(50px); }\n    60% { transform: translateX(60px); }\n    70% { transform: translateX(70px); }\n    80% { transform: translateX(80px); }\n    90% { transform: translateX(90px); }\n    100% { transform: translateX(100px); }\n  }";

var mixed = "  @keyframes slide {\n    0% { transform: translateX(0px); opacity: 0; }\n    10% { transform: translateX(10px); opacity: 0.5; }\n    20% { transform: translateX(20px); opacity: 1; }\n    30% { transform: translateX(30px); opacity: 0.5; }\n    40% { transform: translateX(40px); opacity: 0; }\n    50% { transform: translateX(50px); opacity: 0.5; }\n    60% { transform: translateX(60px); opacity: 1; }\n    70% { transform: translateX(70px); opacity: 0.5; }\n    80% { transform: translateX(80px); opacity: 0; }\n    90% { transform: translateX(90px); opacity: 0.5; }\n    100% { transform: translateX(100px); opacity: 1; }\n  }";

var cubic = "  @keyframes slide {\n    0% { transform: translateX(0px); }\n    10% { transform: translateX(0.1px); }\n    20% { transform: translateX(0.8px); }\n    30% { transform: translateX(2.7px); }\n    40% { transform: translateX(6.4px); }\n    50% { transform: translateX(12.5px); }\n    60% { transform: translateX(21.6px); }\n    70% { transform: translateX(34.3px); }\n    80% { transform: translateX(51.2px); }\n    90% { transform: translateX(72.9px); }\n    100% { transform: translateX(100px); }\n  }";

/* @@slides16.svelte generated by Svelte v3.24.0 */

function add_css$c() {
	var style = element("style");
	style.id = "svelte-3ssdsl-style";
	style.textContent = "@keyframes anim1{0%{transform:translateX(0px)}10%{transform:translateX(10px)}20%{transform:translateX(20px)}30%{transform:translateX(30px)}40%{transform:translateX(40px)}50%{transform:translateX(50px)}60%{transform:translateX(60px)}70%{transform:translateX(70px)}80%{transform:translateX(80px)}90%{transform:translateX(90px)}100%{transform:translateX(100px)}}@keyframes anim2{0%{transform:translateX(0px);opacity:0}10%{transform:translateX(10px);opacity:0.5}20%{transform:translateX(20px);opacity:1}30%{transform:translateX(30px);opacity:0.5}40%{transform:translateX(40px);opacity:0}50%{transform:translateX(50px);opacity:0.5}60%{transform:translateX(60px);opacity:1}70%{transform:translateX(70px);opacity:0.5}80%{transform:translateX(80px);opacity:0}90%{transform:translateX(90px);opacity:0.5}100%{transform:translateX(100px);opacity:1}}@keyframes anim3{0%{transform:translateX(0px)}10%{transform:translateX(0.1px)}20%{transform:translateX(0.8px)}30%{transform:translateX(2.7px)}40%{transform:translateX(6.4px)}50%{transform:translateX(12.5px)}60%{transform:translateX(21.6px)}70%{transform:translateX(34.3px)}80%{transform:translateX(51.2px)}90%{transform:translateX(72.9px)}100%{transform:translateX(100px)}}.container.svelte-3ssdsl{display:grid;height:100%;grid-template-columns:1.5fr 1fr}h1.svelte-3ssdsl{margin:0}.demo.svelte-3ssdsl{margin-top:100px}";
	append(document.head, style);
}

function create_fragment$h(ctx) {
	let h1;
	let t1;
	let div3;
	let div0;
	let prism_action;
	let t2;
	let div2;
	let label0;
	let input0;
	let t3;
	let t4;
	let label1;
	let input1;
	let t5;
	let t6;
	let label2;
	let input2;
	let t7;
	let t8;
	let label3;
	let t9;
	let input3;
	let t10;
	let div1;
	let t11;
	let mounted;
	let dispose;

	return {
		c() {
			h1 = element("h1");
			h1.textContent = "CSS Animations";
			t1 = space();
			div3 = element("div");
			div0 = element("div");
			t2 = space();
			div2 = element("div");
			label0 = element("label");
			input0 = element("input");
			t3 = text("Linear");
			t4 = space();
			label1 = element("label");
			input1 = element("input");
			t5 = text("2 Animations");
			t6 = space();
			label2 = element("label");
			input2 = element("input");
			t7 = text("Cubic Easing");
			t8 = space();
			label3 = element("label");
			t9 = text("Duration: ");
			input3 = element("input");
			t10 = space();
			div1 = element("div");
			t11 = text("TEXT");
			attr(h1, "class", "svelte-3ssdsl");
			attr(div0, "class", "code");
			attr(input0, "type", "radio");
			input0.__value = "anim1";
			input0.value = input0.__value;
			/*$$binding_groups*/ ctx[4][0].push(input0);
			attr(input1, "type", "radio");
			input1.__value = "anim2";
			input1.value = input1.__value;
			/*$$binding_groups*/ ctx[4][0].push(input1);
			attr(input2, "type", "radio");
			input2.__value = "anim3";
			input2.value = input2.__value;
			/*$$binding_groups*/ ctx[4][0].push(input2);
			attr(input3, "type", "range");
			attr(input3, "min", "100");
			attr(input3, "max", "5000");
			attr(input3, "step", "50");
			set_style(div1, "animation", /*animation*/ ctx[0] + " " + /*duration*/ ctx[1] + "ms linear infinite both");
			attr(div2, "class", "demo svelte-3ssdsl");
			attr(div3, "class", "container svelte-3ssdsl");
		},
		m(target, anchor) {
			insert(target, h1, anchor);
			insert(target, t1, anchor);
			insert(target, div3, anchor);
			append(div3, div0);
			append(div3, t2);
			append(div3, div2);
			append(div2, label0);
			append(label0, input0);
			input0.checked = input0.__value === /*animation*/ ctx[0];
			append(label0, t3);
			append(div2, t4);
			append(div2, label1);
			append(label1, input1);
			input1.checked = input1.__value === /*animation*/ ctx[0];
			append(label1, t5);
			append(div2, t6);
			append(div2, label2);
			append(label2, input2);
			input2.checked = input2.__value === /*animation*/ ctx[0];
			append(label2, t7);
			append(div2, t8);
			append(div2, label3);
			append(label3, t9);
			append(label3, input3);
			set_input_value(input3, /*duration*/ ctx[1]);
			append(div2, t10);
			append(div2, div1);
			append(div1, t11);

			if (!mounted) {
				dispose = [
					action_destroyer(prism_action = prism$1.call(null, div0, {
						code: /*html*/ ctx[2],
						lang: prism.languages.html
					})),
					listen(input0, "change", /*input0_change_handler*/ ctx[3]),
					listen(input1, "change", /*input1_change_handler*/ ctx[5]),
					listen(input2, "change", /*input2_change_handler*/ ctx[6]),
					listen(input3, "change", /*input3_change_input_handler*/ ctx[7]),
					listen(input3, "input", /*input3_change_input_handler*/ ctx[7])
				];

				mounted = true;
			}
		},
		p(ctx, [dirty]) {
			if (prism_action && is_function(prism_action.update) && dirty & /*html*/ 4) prism_action.update.call(null, {
				code: /*html*/ ctx[2],
				lang: prism.languages.html
			});

			if (dirty & /*animation*/ 1) {
				input0.checked = input0.__value === /*animation*/ ctx[0];
			}

			if (dirty & /*animation*/ 1) {
				input1.checked = input1.__value === /*animation*/ ctx[0];
			}

			if (dirty & /*animation*/ 1) {
				input2.checked = input2.__value === /*animation*/ ctx[0];
			}

			if (dirty & /*duration*/ 2) {
				set_input_value(input3, /*duration*/ ctx[1]);
			}

			if (dirty & /*animation, duration*/ 3) {
				set_style(div1, "animation", /*animation*/ ctx[0] + " " + /*duration*/ ctx[1] + "ms linear infinite both");
			}
		},
		i: noop,
		o: noop,
		d(detaching) {
			if (detaching) detach(h1);
			if (detaching) detach(t1);
			if (detaching) detach(div3);
			/*$$binding_groups*/ ctx[4][0].splice(/*$$binding_groups*/ ctx[4][0].indexOf(input0), 1);
			/*$$binding_groups*/ ctx[4][0].splice(/*$$binding_groups*/ ctx[4][0].indexOf(input1), 1);
			/*$$binding_groups*/ ctx[4][0].splice(/*$$binding_groups*/ ctx[4][0].indexOf(input2), 1);
			mounted = false;
			run_all(dispose);
		}
	};
}

function instance$7($$self, $$props, $$invalidate) {
	const map = {
		anim1: linear$1,
		anim2: mixed,
		anim3: cubic
	};

	let animation = "anim1";
	let duration = 3000;
	const $$binding_groups = [[]];

	function input0_change_handler() {
		animation = this.__value;
		$$invalidate(0, animation);
	}

	function input1_change_handler() {
		animation = this.__value;
		$$invalidate(0, animation);
	}

	function input2_change_handler() {
		animation = this.__value;
		$$invalidate(0, animation);
	}

	function input3_change_input_handler() {
		duration = to_number(this.value);
		$$invalidate(1, duration);
	}

	let html;

	$$self.$$.update = () => {
		if ($$self.$$.dirty & /*animation, duration*/ 3) {
			 $$invalidate(2, html = code.replace("{{rule}}", map[animation]).replace("{{duration}}", (duration / 1000).toFixed(2)));
		}
	};

	return [
		animation,
		duration,
		html,
		input0_change_handler,
		$$binding_groups,
		input1_change_handler,
		input2_change_handler,
		input3_change_input_handler
	];
}

class Slides16 extends SvelteComponent {
	constructor(options) {
		super();
		if (!document.getElementById("svelte-3ssdsl-style")) add_css$c();
		init(this, options, instance$7, create_fragment$h, safe_not_equal, {});
	}
}

var jsCode = "const string = 'Hello World';\nconst duration = {{duration}}\n\nlet start = Date.now();\n\nfunction loop() {\n  const now = Date.now();\n  // time ranges from [0, 1]\n  const time = (now - start) / duration;\n\n  div.textContent = string.slice(0, Math.round(time * string.length));\n\n  requestAnimationFrame(loop);\n}\nrequestAnimationFrame(loop);";

/* @@slides17.svelte generated by Svelte v3.24.0 */

function add_css$d() {
	var style = element("style");
	style.id = "svelte-9k5trb-style";
	style.textContent = "h1.svelte-9k5trb{margin:0}";
	append(document.head, style);
}

function create_fragment$i(ctx) {
	let h1;
	let t1;
	let div0;
	let prismJs_action;
	let t2;
	let input;
	let t3;
	let div1;
	let mounted;
	let dispose;

	return {
		c() {
			h1 = element("h1");
			h1.textContent = "JS Animations";
			t1 = space();
			div0 = element("div");
			t2 = space();
			input = element("input");
			t3 = space();
			div1 = element("div");
			attr(h1, "class", "svelte-9k5trb");
			attr(div0, "class", "code");
			attr(input, "type", "range");
			attr(input, "min", "100");
			attr(input, "max", "10000");
			attr(input, "step", "50");
		},
		m(target, anchor) {
			insert(target, h1, anchor);
			insert(target, t1, anchor);
			insert(target, div0, anchor);
			insert(target, t2, anchor);
			insert(target, input, anchor);
			set_input_value(input, /*duration*/ ctx[0]);
			insert(target, t3, anchor);
			insert(target, div1, anchor);
			/*div1_binding*/ ctx[4](div1);

			if (!mounted) {
				dispose = [
					action_destroyer(prismJs_action = prismJs.call(null, div0, /*code*/ ctx[2])),
					listen(input, "change", /*input_change_input_handler*/ ctx[3]),
					listen(input, "input", /*input_change_input_handler*/ ctx[3])
				];

				mounted = true;
			}
		},
		p(ctx, [dirty]) {
			if (prismJs_action && is_function(prismJs_action.update) && dirty & /*code*/ 4) prismJs_action.update.call(null, /*code*/ ctx[2]);

			if (dirty & /*duration*/ 1) {
				set_input_value(input, /*duration*/ ctx[0]);
			}
		},
		i: noop,
		o: noop,
		d(detaching) {
			if (detaching) detach(h1);
			if (detaching) detach(t1);
			if (detaching) detach(div0);
			if (detaching) detach(t2);
			if (detaching) detach(input);
			if (detaching) detach(t3);
			if (detaching) detach(div1);
			/*div1_binding*/ ctx[4](null);
			mounted = false;
			run_all(dispose);
		}
	};
}

const string = "Hello World";

function instance$8($$self, $$props, $$invalidate) {
	let duration = 3000;
	let div;
	let start = Date.now();

	function loop() {
		const now = Date.now();
		const time = (now - start) / duration;
		const length = Math.round(time * string.length) % string.length;
		$$invalidate(1, div.textContent = string.slice(0, length === 0 ? string.length : length), div);
		requestAnimationFrame(loop);
	}

	requestAnimationFrame(loop);

	function input_change_input_handler() {
		duration = to_number(this.value);
		$$invalidate(0, duration);
	}

	function div1_binding($$value) {
		binding_callbacks[$$value ? "unshift" : "push"](() => {
			div = $$value;
			$$invalidate(1, div);
		});
	}

	let code;

	$$self.$$.update = () => {
		if ($$self.$$.dirty & /*duration*/ 1) {
			 $$invalidate(2, code = jsCode.replace("{{duration}}", `${duration}; // ${(duration / 1000).toFixed(2)}s`));
		}
	};

	return [duration, div, code, input_change_input_handler, div1_binding];
}

class Slides17 extends SvelteComponent {
	constructor(options) {
		super();
		if (!document.getElementById("svelte-9k5trb-style")) add_css$d();
		init(this, options, instance$8, create_fragment$i, safe_not_equal, {});
	}
}

/* @@slides18.svelte generated by Svelte v3.24.0 */

function create_fragment$j(ctx) {
	let h1;

	return {
		c() {
			h1 = element("h1");
			h1.innerHTML = `<code>transition:</code> in Vanilla JS`;
		},
		m(target, anchor) {
			insert(target, h1, anchor);
		},
		p: noop,
		i: noop,
		o: noop,
		d(detaching) {
			if (detaching) detach(h1);
		}
	};
}

class Slides18 extends SvelteComponent {
	constructor(options) {
		super();
		init(this, options, null, create_fragment$j, safe_not_equal, {});
	}
}

/* @@slides19.svelte generated by Svelte v3.24.0 */

function create_fragment$k(ctx) {
	let h1;

	return {
		c() {
			h1 = element("h1");
			h1.innerHTML = `<code>transition:</code> in compiled JS`;
		},
		m(target, anchor) {
			insert(target, h1, anchor);
		},
		p: noop,
		i: noop,
		o: noop,
		d(detaching) {
			if (detaching) detach(h1);
		}
	};
}

class Slides19 extends SvelteComponent {
	constructor(options) {
		super();
		init(this, options, null, create_fragment$k, safe_not_equal, {});
	}
}

var initial = "function create_fragment(ctx) {\n  return {\n    /* create */  c() { /* ... */ },\n    /* mount */   m(target, anchor) { /* ... */ },\n    /* update */  p(ctx, dirty) { /* ... */ },\n    /* destroy */ d(detaching) { /* ... */ }\n  };\n}\n";

var withIntroOutro = "function create_fragment(ctx) {\n  return {\n    /* create */  c() { /* ... */ },\n    /* mount */   m(target, anchor) { /* ... */ },\n    /* update */  p(ctx, dirty) { /* ... */ },\n\n    /* intro */   i(local) { /* ... */ },\n    /* outro */   o(local) { /* ... */ },\n\n    /* destroy */ d(detaching) { /* ... */ }\n  };\n}\n";

/* @@slides20.svelte generated by Svelte v3.24.0 */

function add_css$e() {
	var style = element("style");
	style.id = "svelte-slvxkp-style";
	style.textContent = ".container.svelte-slvxkp{display:grid;place-items:center;padding-top:200px}";
	append(document.head, style);
}

function create_fragment$l(ctx) {
	let div1;
	let div0;
	let prismJs_action;
	let mounted;
	let dispose;

	return {
		c() {
			div1 = element("div");
			div0 = element("div");
			attr(div0, "class", "code");
			attr(div1, "class", "container svelte-slvxkp");
		},
		m(target, anchor) {
			insert(target, div1, anchor);
			append(div1, div0);

			if (!mounted) {
				dispose = action_destroyer(prismJs_action = prismJs.call(null, div0, /*code*/ ctx[0]));
				mounted = true;
			}
		},
		p(ctx, [dirty]) {
			if (prismJs_action && is_function(prismJs_action.update) && dirty & /*code*/ 1) prismJs_action.update.call(null, /*code*/ ctx[0]);
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

function instance$9($$self, $$props, $$invalidate) {
	let i = 0;

	function next() {
		return i < 1 && $$invalidate(3, i++, i) < 1;
	}

	function prev() {
		return i > 0 && $$invalidate(3, i--, i) > 0;
	}

	let code;

	$$self.$$.update = () => {
		if ($$self.$$.dirty & /*i*/ 8) {
			 $$invalidate(0, code = [initial, withIntroOutro][i]);
		}
	};

	return [code, next, prev];
}

class Slides20 extends SvelteComponent {
	constructor(options) {
		super();
		if (!document.getElementById("svelte-slvxkp-style")) add_css$e();
		init(this, options, instance$9, create_fragment$l, safe_not_equal, { next: 1, prev: 2 });
	}

	get next() {
		return this.$$.ctx[1];
	}

	get prev() {
		return this.$$.ctx[2];
	}
}

var eachTransition = "{#each array as item}\n  <div transition:fade={{ delay: 10 }} />\n{/each}";

var eachIn = "{#each array as item}\n  <div in:fade={{ delay: 10 }} />\n{/each}";

var eachOut = "{#each array as item}\n  <div out:fade={{ delay: 10 }} />\n{/each}";

var withIntroOutroBlock0 = "// <div transition:fade />\nfunction create_each_block(ctx) { /*... */ }\n\n// {#each array as item}\nfunction create_fragment(ctx) {\n  let each_block = create_each_block(ctx);\n\n  return {\n    // ...\n    i(local) {},\n    o(local) {},\n    // ...\n  };\n}\n";

var withIntroOutroBlock1 = "// <div transition:fade />\nfunction create_each_block(ctx) { /*... */ }\n\n// {#each array as item}\nfunction create_fragment(ctx) {\n  let each_block = create_each_block(ctx);\n\n  return {\n    // ...\n    i(local) {\n      transition_in(each_block);\n    },\n    o(local) {\n      transition_out(each_block);\n    },\n    // ...\n  };\n}\n";

var withIntroOutroBlock = "// <div transition:fade />\nfunction create_each_block(ctx) { /*... */ }\n\n// {#each array as item}\nfunction create_fragment(ctx) {\n  let each_block = create_each_block(ctx);\n\n  return {\n    // ...\n    i(local) {\n      transition_in(each_block);\n    },\n    o(local) {\n      transition_out(each_block);\n    },\n    // ...\n  };\n}\n\nfunction transition_in(block, local = false) {\n  if (block && block.i) {\n    // ...\n    block.i(local);\n  }\n}\n\nfunction transition_out(block, local = false) {\n  if (block && block.o) {\n    // ...\n    block.o(local);\n  }\n}";

var withIntroOutroBlockItem0 = "// <div transition:fade />\nfunction create_each_block(ctx) { /*... */ }\n\n// {#each array as item}\nfunction create_fragment(ctx) {\n  let each_block = create_each_block(ctx);\n\n  return {\n    // ...\n    p(ctx, dirty) { \n      // add new item\n      transition_in(each_block);\n    },\n    i(local) {\n      transition_in(each_block);\n    },\n    o(local) {\n      transition_out(each_block);\n    },\n    // ...\n  };\n}\n\nfunction transition_in(block, local = false) {\n  if (block && block.i) {\n    // ...\n    block.i(local);\n  }\n}\n\nfunction transition_out(block, local = false) {\n  if (block && block.o) {\n    // ...\n    block.o(local);\n  }\n}";

var withIntroOutroBlockItem = "// <div transition:fade />\nfunction create_each_block(ctx) { /*... */ }\n\n// {#each array as item}\nfunction create_fragment(ctx) {\n  let each_block = create_each_block(ctx);\n\n  return {\n    // ...\n    p(ctx, dirty) { \n      // add new item\n      transition_in(each_block);\n\n      // remove unneeded item\n      group_outros();\n      transition_out(each_block_1);\n      transition_out(each_block_2);\n      check_outros();\n    },\n    i(local) {\n      transition_in(each_block);\n    },\n    o(local) {\n      transition_out(each_block);\n    },\n    // ...\n  };\n}\n\nfunction transition_in(block, local = false) {\n  if (block && block.i) {\n    // ...\n    block.i(local);\n  }\n}\n\nfunction transition_out(block, local = false) {\n  if (block && block.o) {\n    // ...\n    block.o(local);\n  }\n}";

var withIntroOutroElement0 = "// <div transition:fade />\nfunction create_each_block(ctx) {\n  return {\n    // ...\n    i(local) {},\n    o(local) {},\n    // ...\n  };\n}\n\n// {#each array as item}\nfunction create_fragment(ctx) { /* ... */}\n";

var withIntroOutroElement1 = "// <div transition:fade />\nfunction create_each_block(ctx) {\n  return {\n    // ...\n    i(local) {\n      add_render_callback(() => {\n        if (!div_transition) {\n          div_transition =\n            create_bidirectional_transition(\n              div, fade, { delay: 10 }, true\n            );\n        }\n        div_transition.run(1);\n      });\n    },\n    o(local) {},\n    // ...\n  };\n}\n\n// {#each array as item}\nfunction create_fragment(ctx) {\n  /* ... */\n}\n";

var withIntroOutroElement = "// <div transition:fade />\nfunction create_each_block(ctx) {\n  return {\n    // ...\n    i(local) {\n      add_render_callback(() => {\n        if (!div_transition) {\n          div_transition = \n            create_bidirectional_transition(\n              div, fade, { delay: 10 }, true\n            );\n        }\n        div_transition.run(1);\n      });\n    },\n    o(local) {\n      if (!div_transition) {\n        div_transition = \n          create_bidirectional_transition(\n            div, fade, { delay: 10 }, true\n          );\n      }\n      div_transition.run(0);\n    },\n    // ...\n  };\n}\n\n// {#each array as item}\nfunction create_fragment(ctx) {\n  /* ... */\n}\n";

var withIntroOutroElementIn = "// <div transition:fade />\nfunction create_each_block(ctx) {\n  return {\n    // ...\n    i(local) {\n      if (!div_intro) {\n        add_render_callback(() => {\n          div_intro = create_in_transition(\n            div, fade, { delay: 10 }\n          );\n          div_intro.start();\n        });\n      }\n    },\n    // ...\n  };\n}\n\n// {#each array as item}\nfunction create_fragment(ctx) { /* ... */ }\n";

var withIntroOutroElementOut = "// <div transition:fade />\nfunction create_each_block(ctx) {\n  return {\n    // ...\n    i(local) {\n      if (div_outro) div_outro.end(1);\n    },\n    o(local) {\n      div_outro = create_out_transition(\n        div, fade, { delay: 10 }\n      );\n    },\n    // ...\n  };\n}\n\n// {#each array as item}\nfunction create_fragment(ctx) { /* ... */ }\n";

/* @@slides21.svelte generated by Svelte v3.24.0 */

function add_css$f() {
	var style = element("style");
	style.id = "svelte-oi1ldz-style";
	style.textContent = ".container.svelte-oi1ldz{display:grid;grid-template-columns:1fr 1.3fr;height:100%}.code.svelte-oi1ldz:nth-child(1){margin-top:100px}.code.svelte-oi1ldz{overflow:auto}.box-1.svelte-oi1ldz{top:248px;left:586px;--line:6;width:400px}.box-3.svelte-oi1ldz{top:274px;left:605px;--line:2;width:400px}.box-4.svelte-oi1ldz{left:605px;width:380px;top:351px;--line:5}.box-6.svelte-oi1ldz{top:145px;left:605px;--line:9;width:500px}.box-7.svelte-oi1ldz{top:429px;left:605px;--line:7;width:500px}.box-8.svelte-oi1ldz{top:144px;left:605px;--line:7;width:500px}.box-9.svelte-oi1ldz{top:118px;left:586px;--line:8;width:500px}";
	append(document.head, style);
}

function create_fragment$m(ctx) {
	let div2;
	let div0;
	let prismSvelte_action;
	let t0;
	let div1;
	let prismJs_action;
	let t1;
	let div3;
	let div3_class_value;
	let mounted;
	let dispose;

	return {
		c() {
			div2 = element("div");
			div0 = element("div");
			t0 = space();
			div1 = element("div");
			t1 = space();
			div3 = element("div");
			attr(div0, "class", "code svelte-oi1ldz");
			attr(div1, "class", "code svelte-oi1ldz");
			attr(div2, "class", "container svelte-oi1ldz");
			attr(div3, "class", div3_class_value = "box box-" + /*i*/ ctx[0] + " svelte-oi1ldz");
			toggle_class(div3, "hidden", /*i*/ ctx[0] < 1 || /*i*/ ctx[0] === 2 || /*i*/ ctx[0] === 5);
		},
		m(target, anchor) {
			insert(target, div2, anchor);
			append(div2, div0);
			append(div2, t0);
			append(div2, div1);
			insert(target, t1, anchor);
			insert(target, div3, anchor);

			if (!mounted) {
				dispose = [
					action_destroyer(prismSvelte_action = prismSvelte.call(null, div0, /*svelteCode*/ ctx[2])),
					action_destroyer(prismJs_action = prismJs.call(null, div1, /*code*/ ctx[1]))
				];

				mounted = true;
			}
		},
		p(ctx, [dirty]) {
			if (prismSvelte_action && is_function(prismSvelte_action.update) && dirty & /*svelteCode*/ 4) prismSvelte_action.update.call(null, /*svelteCode*/ ctx[2]);
			if (prismJs_action && is_function(prismJs_action.update) && dirty & /*code*/ 2) prismJs_action.update.call(null, /*code*/ ctx[1]);

			if (dirty & /*i*/ 1 && div3_class_value !== (div3_class_value = "box box-" + /*i*/ ctx[0] + " svelte-oi1ldz")) {
				attr(div3, "class", div3_class_value);
			}

			if (dirty & /*i, i*/ 1) {
				toggle_class(div3, "hidden", /*i*/ ctx[0] < 1 || /*i*/ ctx[0] === 2 || /*i*/ ctx[0] === 5);
			}
		},
		i: noop,
		o: noop,
		d(detaching) {
			if (detaching) detach(div2);
			if (detaching) detach(t1);
			if (detaching) detach(div3);
			mounted = false;
			run_all(dispose);
		}
	};
}

function instance$a($$self, $$props, $$invalidate) {
	let i = 0;

	const CODES = [
		withIntroOutroBlock0,
		withIntroOutroBlock1,
		withIntroOutroBlock,
		//
		withIntroOutroBlockItem0,
		withIntroOutroBlockItem,
		// 
		withIntroOutroElement0,
		withIntroOutroElement1,
		withIntroOutroElement,
		// 
		withIntroOutroElementIn,
		withIntroOutroElementOut
	];

	const SVELTE_CODES = [
		eachTransition,
		eachTransition,
		eachTransition,
		//
		eachTransition,
		eachTransition,
		// 
		eachTransition,
		eachTransition,
		eachTransition,
		// 
		eachIn,
		eachOut
	];

	const LENGTH = CODES.length - 1;

	function next() {
		return i < LENGTH && $$invalidate(0, i++, i) < LENGTH;
	}

	function prev() {
		return i > 0 && $$invalidate(0, i--, i) > 0;
	}

	let code;
	let svelteCode;

	$$self.$$.update = () => {
		if ($$self.$$.dirty & /*i*/ 1) {
			 $$invalidate(1, code = CODES[i]);
		}

		if ($$self.$$.dirty & /*i*/ 1) {
			 $$invalidate(2, svelteCode = SVELTE_CODES[i]);
		}
	};

	return [i, code, svelteCode, next, prev];
}

class Slides21 extends SvelteComponent {
	constructor(options) {
		super();
		if (!document.getElementById("svelte-oi1ldz-style")) add_css$f();
		init(this, options, instance$a, create_fragment$m, safe_not_equal, { next: 3, prev: 4 });
	}

	get next() {
		return this.$$.ctx[3];
	}

	get prev() {
		return this.$$.ctx[4];
	}
}

var full = "export function create_in_transition(node, fn, params) {\n  let config = fn(node, params);\n  let running = false;\n  let animation_name;\n  let task;\n  let uid = 0;\n\n  function cleanup() {\n    if (animation_name) delete_rule(node, animation_name);\n  }\n\n  function go() {\n    const { delay = 0, duration = 300, easing = linear, tick = noop, css } = config || null_transition;\n\n    if (css) animation_name = create_rule(node, 0, 1, duration, delay, easing, css, uid++);\n    tick(0, 1);\n\n    const start_time = now() + delay;\n    const end_time = start_time + duration;\n\n    if (task) task.abort();\n    running = true;\n\n    add_render_callback(() => dispatch(node, true, 'start'));\n\n    task = loop(now => {\n      if (running) {\n        if (now >= end_time) {\n          tick(1, 0);\n\n          dispatch(node, true, 'end');\n\n          cleanup();\n          return (running = false);\n        }\n\n        if (now >= start_time) {\n          const t = easing((now - start_time) / duration);\n          tick(t, 1 - t);\n        }\n      }\n\n      return running;\n    });\n  }\n\n  let started = false;\n\n  return {\n    start() {\n      if (started) return;\n\n      delete_rule(node);\n\n      if (is_function(config)) {\n        config = config();\n        wait().then(go);\n      } else {\n        go();\n      }\n    },\n\n    invalidate() {\n      started = false;\n    },\n\n    end() {\n      if (running) {\n        cleanup();\n        running = false;\n      }\n    },\n  };\n}\n\n// src/runtime/internal/style_manager.ts\nfunction create_rule(node, a, b, duration, delay, ease, fn, uid) {\n  const step = 16.666 / duration;\n  let keyframes = '{\\n';\n\n  for (let p = 0; p <= 1; p += step) {\n    const t = a + (b - a) * ease(p);\n    keyframes += p * 100 + `%{${fn(t, 1 - t)}}\\n`;\n  }\n\n  const rule = keyframes + `100% {${fn(b, 1 - b)}}\\n}`;\n  const name = `__svelte_${hash(rule)}_${uid}`;\n  const doc = node.ownerDocument as ExtendedDoc;\n  active_docs.add(doc);\n  const stylesheet = doc.__svelte_stylesheet || (doc.__svelte_stylesheet = doc.head.appendChild(element('style') as HTMLStyleElement).sheet as CSSStyleSheet);\n  const current_rules = doc.__svelte_rules || (doc.__svelte_rules = {});\n\n  if (!current_rules[name]) {\n    current_rules[name] = true;\n    stylesheet.insertRule(`@keyframes ${name} ${rule}`, stylesheet.cssRules.length);\n  }\n\n  const animation = node.style.animation || '';\n  node.style.animation = `${animation ? `${animation}, ` : ''}${name} ${duration}ms linear ${delay}ms 1 both`;\n\n  active += 1;\n  return name;\n}";

/* @@slides22.svelte generated by Svelte v3.24.0 */

function add_css$g() {
	var style = element("style");
	style.id = "svelte-18x8sxj-style";
	style.textContent = ".container.svelte-18x8sxj{position:relative;height:100%;width:100%;overflow:scroll;margin:-16px;padding:16px}.box-1.svelte-18x8sxj{top:374px;left:40px;width:1070px;height:30px}.box-2.svelte-18x8sxj{top:1990px;left:0px;width:820px;height:26px}.box-3.svelte-18x8sxj{top:2015px;left:20px;width:652px;height:235px}.box-4.svelte-18x8sxj{top:2425px;left:20px;width:1012px;height:115px}.box-5.svelte-18x8sxj{top:2555px;left:-4px;width:1252px;height:85px}.box-6.svelte-18x8sxj{top:661px;left:40px;width:700px;height:497px}.box-7.svelte-18x8sxj{top:454px;left:40px;width:490px;height:55px}.box-8.svelte-18x8sxj{top:402px;left:40px;width:160px;height:31px}.box-9.svelte-18x8sxj{top:944px;left:90px;width:630px;height:112px}.box-10.svelte-18x8sxj{top:739px;left:110px;width:160px;height:31px}.box-11.svelte-18x8sxj{top:611px;left:41px;width:711px;height:31px}.box-12.svelte-18x8sxj{top:791px;left:116px;width:361px;height:31px}";
	append(document.head, style);
}

function create_fragment$n(ctx) {
	let div2;
	let div0;
	let prismJs_action;
	let t;
	let div1;
	let div1_class_value;
	let mounted;
	let dispose;

	return {
		c() {
			div2 = element("div");
			div0 = element("div");
			t = space();
			div1 = element("div");
			attr(div0, "class", "code");
			attr(div1, "class", div1_class_value = "box box-" + /*i*/ ctx[0] + " svelte-18x8sxj");
			toggle_class(div1, "hidden", false);
			attr(div2, "class", "container svelte-18x8sxj");
		},
		m(target, anchor) {
			insert(target, div2, anchor);
			append(div2, div0);
			append(div2, t);
			append(div2, div1);
			/*div2_binding*/ ctx[5](div2);

			if (!mounted) {
				dispose = action_destroyer(prismJs_action = prismJs.call(null, div0, /*code*/ ctx[2]));
				mounted = true;
			}
		},
		p(ctx, [dirty]) {
			if (dirty & /*i*/ 1 && div1_class_value !== (div1_class_value = "box box-" + /*i*/ ctx[0] + " svelte-18x8sxj")) {
				attr(div1, "class", div1_class_value);
			}

			if (dirty & /*i*/ 1) {
				toggle_class(div1, "hidden", false);
			}
		},
		i: noop,
		o: noop,
		d(detaching) {
			if (detaching) detach(div2);
			/*div2_binding*/ ctx[5](null);
			mounted = false;
			dispose();
		}
	};
}

function instance$b($$self, $$props, $$invalidate) {
	let i = 0;
	let container;
	const code = full;
	const TOPS = [0, 0, 1920, 1920, 2064, 2064, 544, 326, 208, 720, 444, 444, 444];
	const LENGTH = TOPS.length - 1;

	function next() {
		return i < LENGTH && $$invalidate(0, i++, i) < LENGTH;
	}

	function prev() {
		return i > 0 && $$invalidate(0, i--, i) > 0;
	}

	function div2_binding($$value) {
		binding_callbacks[$$value ? "unshift" : "push"](() => {
			container = $$value;
			$$invalidate(1, container);
		});
	}

	$$self.$$.update = () => {
		if ($$self.$$.dirty & /*container, i*/ 3) {
			 if (container && TOPS[i] !== undefined) {
				container.scrollTo({ top: TOPS[i], behavior: "smooth" });
			}
		}
	};

	return [i, container, code, next, prev, div2_binding];
}

class Slides22 extends SvelteComponent {
	constructor(options) {
		super();
		if (!document.getElementById("svelte-18x8sxj-style")) add_css$g();
		init(this, options, instance$b, create_fragment$n, safe_not_equal, { next: 3, prev: 4 });
	}

	get next() {
		return this.$$.ctx[3];
	}

	get prev() {
		return this.$$.ctx[4];
	}
}

/* @@slides23.svelte generated by Svelte v3.24.0 */

function add_css$h() {
	var style = element("style");
	style.id = "svelte-1khujlx-style";
	style.textContent = "h1.svelte-1khujlx{margin:0}h2.svelte-1khujlx{font-size:1.5em}";
	append(document.head, style);
}

function create_fragment$o(ctx) {
	let h1;
	let t1;
	let h20;
	let t3;
	let ul0;
	let t13;
	let h21;
	let t15;
	let ul1;
	let t21;
	let h22;
	let t26;
	let ul2;

	return {
		c() {
			h1 = element("h1");
			h1.textContent = "Source code reference";
			t1 = space();
			h20 = element("h2");
			h20.innerHTML = `<a href="https://github.com/sveltejs/svelte/blob/master/src/runtime/internal/transitions.ts" rel="nofollow">src/runtime/internal/transitions.ts</a>`;
			t3 = space();
			ul0 = element("ul");

			ul0.innerHTML = `<li><code>transition_in</code>, <code>transition_out</code></li> 
<li><code>create_in_transition</code>, <code>create_out_transition</code>, <code>create_bidirectional_transition</code></li>`;

			t13 = space();
			h21 = element("h2");
			h21.innerHTML = `<a href="https://github.com/sveltejs/svelte/blob/master/src/runtime/internal/style_manager.ts" rel="nofollow">src/runtime/internal/style_manager.ts</a>`;
			t15 = space();
			ul1 = element("ul");
			ul1.innerHTML = `<li><code>create_rule</code>, <code>delete_rule</code>, <code>clear_rules</code></li>`;
			t21 = space();
			h22 = element("h2");
			h22.innerHTML = `<a href="https://github.com/sveltejs/svelte/blob/master/src/runtime/transition/index.ts" rel="nofollow">src/runtime/transition/index.ts</a> (<code>svelte/transition</code>)`;
			t26 = space();
			ul2 = element("ul");
			ul2.innerHTML = `<li><code>fade</code>, <code>fly</code>, <code>slide</code>, <code>crossfade</code>, …</li>`;
			attr(h1, "class", "svelte-1khujlx");
			attr(h20, "class", "svelte-1khujlx");
			attr(h21, "class", "svelte-1khujlx");
			attr(h22, "class", "svelte-1khujlx");
		},
		m(target, anchor) {
			insert(target, h1, anchor);
			insert(target, t1, anchor);
			insert(target, h20, anchor);
			insert(target, t3, anchor);
			insert(target, ul0, anchor);
			insert(target, t13, anchor);
			insert(target, h21, anchor);
			insert(target, t15, anchor);
			insert(target, ul1, anchor);
			insert(target, t21, anchor);
			insert(target, h22, anchor);
			insert(target, t26, anchor);
			insert(target, ul2, anchor);
		},
		p: noop,
		i: noop,
		o: noop,
		d(detaching) {
			if (detaching) detach(h1);
			if (detaching) detach(t1);
			if (detaching) detach(h20);
			if (detaching) detach(t3);
			if (detaching) detach(ul0);
			if (detaching) detach(t13);
			if (detaching) detach(h21);
			if (detaching) detach(t15);
			if (detaching) detach(ul1);
			if (detaching) detach(t21);
			if (detaching) detach(h22);
			if (detaching) detach(t26);
			if (detaching) detach(ul2);
		}
	};
}

class Slides23 extends SvelteComponent {
	constructor(options) {
		super();
		if (!document.getElementById("svelte-1khujlx-style")) add_css$h();
		init(this, options, null, create_fragment$o, safe_not_equal, {});
	}
}

/* @@slides24.svelte generated by Svelte v3.24.0 */

function add_css$i() {
	var style = element("style");
	style.id = "svelte-rvhzm1-style";
	style.textContent = ".container.svelte-rvhzm1.svelte-rvhzm1{display:grid;place-content:center;height:100%}.container.svelte-rvhzm1 div.svelte-rvhzm1{margin:20px 0;font-size:42px}";
	append(document.head, style);
}

function create_fragment$p(ctx) {
	let div3;

	return {
		c() {
			div3 = element("div");

			div3.innerHTML = `<div class="svelte-rvhzm1">🚴‍♂️  Level 1️⃣  - Using <code>transition:</code></div> 
  <div class="svelte-rvhzm1">🚗  Level 2️⃣  - The <code>transition:</code> contract</div> 
  <div class="svelte-rvhzm1">🚀  Level 3️⃣  - Compile <code>transition:</code> in your Head</div>`;

			attr(div3, "class", "container svelte-rvhzm1");
		},
		m(target, anchor) {
			insert(target, div3, anchor);
		},
		p: noop,
		i: noop,
		o: noop,
		d(detaching) {
			if (detaching) detach(div3);
		}
	};
}

class Slides24 extends SvelteComponent {
	constructor(options) {
		super();
		if (!document.getElementById("svelte-rvhzm1-style")) add_css$i();
		init(this, options, null, create_fragment$p, safe_not_equal, {});
	}
}

/* @@slides25.svelte generated by Svelte v3.24.0 */

function add_css$j() {
	var style = element("style");
	style.id = "svelte-1296l67-style";
	style.textContent = ".container.svelte-1296l67{display:grid;height:100%;place-items:center;margin:0;text-align:center}";
	append(document.head, style);
}

function create_fragment$q(ctx) {
	let div1;

	return {
		c() {
			div1 = element("div");

			div1.innerHTML = `<div><h1>Thank you</h1> 
<p>@lihautan</p></div>`;

			attr(div1, "class", "container svelte-1296l67");
		},
		m(target, anchor) {
			insert(target, div1, anchor);
		},
		p: noop,
		i: noop,
		o: noop,
		d(detaching) {
			if (detaching) detach(div1);
		}
	};
}

class Slides25 extends SvelteComponent {
	constructor(options) {
		super();
		if (!document.getElementById("svelte-1296l67-style")) add_css$j();
		init(this, options, null, create_fragment$q, safe_not_equal, {});
	}
}

/* scripts/components/Slides.svelte generated by Svelte v3.24.0 */

const { document: document_1 } = globals;

function add_css$k() {
	var style = element("style");
	style.id = "svelte-180nwr6-style";
	style.textContent = "body{overflow:hidden}section.svelte-180nwr6{width:100vw;height:100vh;box-sizing:border-box;position:fixed;top:0;left:0;overflow:scroll;transition:transform 0.25s ease-in-out;padding:16px;overflow-x:hidden}";
	append(document_1.head, style);
}

function get_each_context$2(ctx, list, i) {
	const child_ctx = ctx.slice();
	child_ctx[9] = list[i];
	child_ctx[11] = i;
	return child_ctx;
}

// (60:0) {#each slides as Slide, index (index)}
function create_each_block$2(key_1, ctx) {
	let section;
	let slide_1;
	let index = /*index*/ ctx[11];
	let t;
	let section_id_value;
	let current;
	const assign_slide_1 = () => /*slide_1_binding*/ ctx[4](slide_1, index);
	const unassign_slide_1 = () => /*slide_1_binding*/ ctx[4](null, index);
	let slide_1_props = {};
	slide_1 = new /*Slide*/ ctx[9]({ props: slide_1_props });
	assign_slide_1();

	return {
		key: key_1,
		first: null,
		c() {
			section = element("section");
			create_component(slide_1.$$.fragment);
			t = space();
			attr(section, "id", section_id_value = "page-" + /*index*/ ctx[11]);
			set_style(section, "transform", "translateX(" + (/*index*/ ctx[11] - /*slideIndex*/ ctx[2]) * 100 + "%) scale(" + (/*index*/ ctx[11] === /*slideIndex*/ ctx[2] ? 1 : 0.8) + ")");
			attr(section, "class", "svelte-180nwr6");
			this.first = section;
		},
		m(target, anchor) {
			insert(target, section, anchor);
			mount_component(slide_1, section, null);
			append(section, t);
			current = true;
		},
		p(ctx, dirty) {
			if (index !== /*index*/ ctx[11]) {
				unassign_slide_1();
				index = /*index*/ ctx[11];
				assign_slide_1();
			}

			const slide_1_changes = {};
			slide_1.$set(slide_1_changes);

			if (!current || dirty & /*slides*/ 1 && section_id_value !== (section_id_value = "page-" + /*index*/ ctx[11])) {
				attr(section, "id", section_id_value);
			}

			if (!current || dirty & /*slides, slideIndex*/ 5) {
				set_style(section, "transform", "translateX(" + (/*index*/ ctx[11] - /*slideIndex*/ ctx[2]) * 100 + "%) scale(" + (/*index*/ ctx[11] === /*slideIndex*/ ctx[2] ? 1 : 0.8) + ")");
			}
		},
		i(local) {
			if (current) return;
			transition_in(slide_1.$$.fragment, local);
			current = true;
		},
		o(local) {
			transition_out(slide_1.$$.fragment, local);
			current = false;
		},
		d(detaching) {
			if (detaching) detach(section);
			unassign_slide_1();
			destroy_component(slide_1);
		}
	};
}

function create_fragment$r(ctx) {
	let t;
	let each_blocks = [];
	let each_1_lookup = new Map();
	let each_1_anchor;
	let current;
	let mounted;
	let dispose;
	let each_value = /*slides*/ ctx[0];
	const get_key = ctx => /*index*/ ctx[11];

	for (let i = 0; i < each_value.length; i += 1) {
		let child_ctx = get_each_context$2(ctx, each_value, i);
		let key = get_key(child_ctx);
		each_1_lookup.set(key, each_blocks[i] = create_each_block$2(key, child_ctx));
	}

	return {
		c() {
			t = space();

			for (let i = 0; i < each_blocks.length; i += 1) {
				each_blocks[i].c();
			}

			each_1_anchor = empty();
		},
		m(target, anchor) {
			insert(target, t, anchor);

			for (let i = 0; i < each_blocks.length; i += 1) {
				each_blocks[i].m(target, anchor);
			}

			insert(target, each_1_anchor, anchor);
			current = true;

			if (!mounted) {
				dispose = listen(document_1.body, "keydown", /*onKeyDown*/ ctx[3]);
				mounted = true;
			}
		},
		p(ctx, [dirty]) {
			if (dirty & /*slides, slideIndex, slideInstances*/ 7) {
				const each_value = /*slides*/ ctx[0];
				group_outros();
				each_blocks = update_keyed_each(each_blocks, dirty, get_key, 1, ctx, each_value, each_1_lookup, each_1_anchor.parentNode, outro_and_destroy_block, create_each_block$2, each_1_anchor, get_each_context$2);
				check_outros();
			}
		},
		i(local) {
			if (current) return;

			for (let i = 0; i < each_value.length; i += 1) {
				transition_in(each_blocks[i]);
			}

			current = true;
		},
		o(local) {
			for (let i = 0; i < each_blocks.length; i += 1) {
				transition_out(each_blocks[i]);
			}

			current = false;
		},
		d(detaching) {
			if (detaching) detach(t);

			for (let i = 0; i < each_blocks.length; i += 1) {
				each_blocks[i].d(detaching);
			}

			if (detaching) detach(each_1_anchor);
			mounted = false;
			dispose();
		}
	};
}

function instance$c($$self, $$props, $$invalidate) {
	let { slides = [] } = $$props;
	let slideInstances = [];
	let slideIndex = 0;
	const hash = window.location.hash;

	if (hash) {
		slideIndex = Number(hash.slice(("page-").length + 1));
	}

	function onKeyDown(event) {
		switch (event.key) {
			case "ArrowLeft":
			case "j":
			case "J":
				{
					prev();
					break;
				}
			case "ArrowRight":
			case "k":
			case "K":
				{
					next();
					break;
				}
			case "p":
			case "P":
				{
					if (!document.fullscreenElement) {
						console.log("fullscreen");
						document.documentElement.requestFullscreen({ navigationUI: "hide" });
					} else {
						console.log("exit fullscreen");

						if (document.exitFullscreen) {
							document.exitFullscreen();
						}
					}

					break;
				}
		}
	}

	function prev() {
		if (!(currentSlide && typeof currentSlide.prev === "function" && currentSlide.prev())) {
			$$invalidate(2, slideIndex = Math.max(slideIndex - 1, 0));
		}
	}

	function next() {
		if (!(currentSlide && typeof currentSlide.next === "function" && currentSlide.next())) {
			$$invalidate(2, slideIndex = Math.min(slideIndex + 1, slides.length - 1));
		}
	}

	function slide_1_binding($$value, index) {
		binding_callbacks[$$value ? "unshift" : "push"](() => {
			slideInstances[index] = $$value;
			$$invalidate(1, slideInstances);
			$$invalidate(0, slides);
		});
	}

	$$self.$set = $$props => {
		if ("slides" in $$props) $$invalidate(0, slides = $$props.slides);
	};

	let currentSlide;

	$$self.$$.update = () => {
		if ($$self.$$.dirty & /*slideIndex*/ 4) {
			 window.location.hash = `page-${slideIndex}`;
		}

		if ($$self.$$.dirty & /*slideInstances, slideIndex*/ 6) {
			 currentSlide = slideInstances[slideIndex];
		}
	};

	return [slides, slideInstances, slideIndex, onKeyDown, slide_1_binding];
}

class Slides extends SvelteComponent {
	constructor(options) {
		super();
		if (!document_1.getElementById("svelte-180nwr6-style")) add_css$k();
		init(this, options, instance$c, create_fragment$r, safe_not_equal, { slides: 0 });
	}
}

const slides = [
Slides0, 
Slides1, 
Slides2, 
Slides3, 
Slides4, 
Slides5, 
Slides6, 
Slides7, 
Slides8, 
Slides9, 
Slides10, 
Slides11, 
Slides12, 
Slides13, 
Slides14, 
Slides15, 
Slides16, 
Slides17, 
Slides18, 
Slides19, 
Slides20, 
Slides21, 
Slides22, 
Slides23, 
Slides24, 
Slides25, 
];
new Slides({ target: document.body, props: { slides } });
