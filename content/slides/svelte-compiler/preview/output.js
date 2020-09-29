function noop() { }
const identity = x => x;
function assign(tar, src) {
    // @ts-ignore
    for (const k in src)
        tar[k] = src[k];
    return tar;
}
function is_promise(value) {
    return value && typeof value === 'object' && typeof value.then === 'function';
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
function subscribe(store, ...callbacks) {
    if (store == null) {
        return noop;
    }
    const unsub = store.subscribe(...callbacks);
    return unsub.unsubscribe ? () => unsub.unsubscribe() : unsub;
}
function component_subscribe(component, store, callback) {
    component.$$.on_destroy.push(subscribe(store, callback));
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
function null_to_empty(value) {
    return value == null ? '' : value;
}
function set_store_value(store, ret, value = ret) {
    store.set(value);
    return ret;
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
function stop_propagation(fn) {
    return function (event) {
        event.stopPropagation();
        // @ts-ignore
        return fn.call(this, event);
    };
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
// unfortunately this can't be a constant as that wouldn't be tree-shakeable
// so we cache the result instead
let crossorigin;
function is_crossorigin() {
    if (crossorigin === undefined) {
        crossorigin = false;
        try {
            if (typeof window !== 'undefined' && window.parent) {
                void window.parent.document;
            }
        }
        catch (error) {
            crossorigin = true;
        }
    }
    return crossorigin;
}
function add_resize_listener(node, fn) {
    const computed_style = getComputedStyle(node);
    const z_index = (parseInt(computed_style.zIndex) || 0) - 1;
    if (computed_style.position === 'static') {
        node.style.position = 'relative';
    }
    const iframe = element('iframe');
    iframe.setAttribute('style', `display: block; position: absolute; top: 0; left: 0; width: 100%; height: 100%; ` +
        `overflow: hidden; border: 0; opacity: 0; pointer-events: none; z-index: ${z_index};`);
    iframe.setAttribute('aria-hidden', 'true');
    iframe.tabIndex = -1;
    const crossorigin = is_crossorigin();
    let unsubscribe;
    if (crossorigin) {
        iframe.src = `data:text/html,<script>onresize=function(){parent.postMessage(0,'*')}</script>`;
        unsubscribe = listen(window, 'message', (event) => {
            if (event.source === iframe.contentWindow)
                fn();
        });
    }
    else {
        iframe.src = 'about:blank';
        iframe.onload = () => {
            unsubscribe = listen(iframe.contentWindow, 'resize', fn);
        };
    }
    append(node, iframe);
    return () => {
        if (crossorigin) {
            unsubscribe();
        }
        else if (unsubscribe && iframe.contentWindow) {
            unsubscribe();
        }
        detach(iframe);
    };
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
function onMount(fn) {
    get_current_component().$$.on_mount.push(fn);
}
function createEventDispatcher() {
    const component = get_current_component();
    return (type, detail) => {
        const callbacks = component.$$.callbacks[type];
        if (callbacks) {
            // TODO are there situations where events could be dispatched
            // in a server (non-DOM) environment?
            const event = custom_event(type, detail);
            callbacks.slice().forEach(fn => {
                fn.call(component, event);
            });
        }
    };
}
function setContext(key, context) {
    get_current_component().$$.context.set(key, context);
}
function getContext(key) {
    return get_current_component().$$.context.get(key);
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
function add_flush_callback(fn) {
    flush_callbacks.push(fn);
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

function handle_promise(promise, info) {
    const token = info.token = {};
    function update(type, index, key, value) {
        if (info.token !== token)
            return;
        info.resolved = value;
        let child_ctx = info.ctx;
        if (key !== undefined) {
            child_ctx = child_ctx.slice();
            child_ctx[key] = value;
        }
        const block = type && (info.current = type)(child_ctx);
        let needs_flush = false;
        if (info.block) {
            if (info.blocks) {
                info.blocks.forEach((block, i) => {
                    if (i !== index && block) {
                        group_outros();
                        transition_out(block, 1, 1, () => {
                            info.blocks[i] = null;
                        });
                        check_outros();
                    }
                });
            }
            else {
                info.block.d(1);
            }
            block.c();
            transition_in(block, 1);
            block.m(info.mount(), info.anchor);
            needs_flush = true;
        }
        info.block = block;
        if (info.blocks)
            info.blocks[index] = block;
        if (needs_flush) {
            flush();
        }
    }
    if (is_promise(promise)) {
        const current_component = get_current_component();
        promise.then(value => {
            set_current_component(current_component);
            update(info.then, 1, info.value, value);
            set_current_component(null);
        }, error => {
            set_current_component(current_component);
            update(info.catch, 2, info.error, error);
            set_current_component(null);
        });
        // if we previously had a then/catch block, destroy it
        if (info.current !== info.pending) {
            update(info.pending, 0);
            return true;
        }
    }
    else {
        if (info.current !== info.then) {
            update(info.then, 1, info.value, promise);
            return true;
        }
        info.resolved = promise;
    }
}

const globals = (typeof window !== 'undefined'
    ? window
    : typeof globalThis !== 'undefined'
        ? globalThis
        : global);

function destroy_block(block, lookup) {
    block.d(1);
    lookup.delete(block.key);
}
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

function bind(component, name, callback) {
    const index = component.$$.props[name];
    if (index !== undefined) {
        component.$$.bound[index] = callback;
        callback(component.$$.ctx[index]);
    }
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

/*! *****************************************************************************
Copyright (c) Microsoft Corporation. All rights reserved.
Licensed under the Apache License, Version 2.0 (the "License"); you may not use
this file except in compliance with the License. You may obtain a copy of the
License at http://www.apache.org/licenses/LICENSE-2.0

THIS CODE IS PROVIDED ON AN *AS IS* BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
KIND, EITHER EXPRESS OR IMPLIED, INCLUDING WITHOUT LIMITATION ANY IMPLIED
WARRANTIES OR CONDITIONS OF TITLE, FITNESS FOR A PARTICULAR PURPOSE,
MERCHANTABLITY OR NON-INFRINGEMENT.

See the Apache Version 2.0 License for specific language governing permissions
and limitations under the License.
***************************************************************************** */

function __rest(s, e) {
    var t = {};
    for (var p in s) if (Object.prototype.hasOwnProperty.call(s, p) && e.indexOf(p) < 0)
        t[p] = s[p];
    if (s != null && typeof Object.getOwnPropertySymbols === "function")
        for (var i = 0, p = Object.getOwnPropertySymbols(s); i < p.length; i++) {
            if (e.indexOf(p[i]) < 0 && Object.prototype.propertyIsEnumerable.call(s, p[i]))
                t[p[i]] = s[p[i]];
        }
    return t;
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
function crossfade(_a) {
    var { fallback } = _a, defaults = __rest(_a, ["fallback"]);
    const to_receive = new Map();
    const to_send = new Map();
    function crossfade(from, node, params) {
        const { delay = 0, duration = d => Math.sqrt(d) * 30, easing = cubicOut } = assign(assign({}, defaults), params);
        const to = node.getBoundingClientRect();
        const dx = from.left - to.left;
        const dy = from.top - to.top;
        const dw = from.width / to.width;
        const dh = from.height / to.height;
        const d = Math.sqrt(dx * dx + dy * dy);
        const style = getComputedStyle(node);
        const transform = style.transform === 'none' ? '' : style.transform;
        const opacity = +style.opacity;
        return {
            delay,
            duration: is_function(duration) ? duration(d) : duration,
            easing,
            css: (t, u) => `
				opacity: ${t * opacity};
				transform-origin: top left;
				transform: ${transform} translate(${u * dx}px,${u * dy}px) scale(${t + (1 - t) * dw}, ${t + (1 - t) * dh});
			`
        };
    }
    function transition(items, counterparts, intro) {
        return (node, params) => {
            items.set(params.key, {
                rect: node.getBoundingClientRect()
            });
            return () => {
                if (counterparts.has(params.key)) {
                    const { rect } = counterparts.get(params.key);
                    counterparts.delete(params.key);
                    return crossfade(rect, node, params);
                }
                // if the node is disappearing altogether
                // (i.e. wasn't claimed by the other list)
                // then we need to supply an outro
                items.delete(params.key);
                return fallback && fallback(node, params, intro);
            };
        };
    }
    return [
        transition(to_send, to_receive, false),
        transition(to_receive, to_send, true)
    ];
}

/* @@slides0.svelte generated by Svelte v3.24.0 */

function add_css() {
	var style = element("style");
	style.id = "svelte-18ya16r-style";
	style.textContent = ".svelte-18ya16r.svelte-18ya16r{transition:200ms ease-in}.container.svelte-18ya16r.svelte-18ya16r{position:absolute;display:grid;place-content:center;height:100%;width:100%;top:0;left:0}.code.svelte-18ya16r.svelte-18ya16r{font-family:\"Consolas\", \"Bitstream Vera Sans Mono\", \"Courier New\", Courier, monospace;position:relative;grid-row:1 / 2;grid-column:1 / 2}.template.svelte-18ya16r.svelte-18ya16r{position:absolute;bottom:50px;left:50%;transform:translateX(-50%);font-size:20px}.template-header.svelte-18ya16r.svelte-18ya16r{margin-top:40px;margin-bottom:10px;font-weight:bold}.tab{width:1ch;display:inline-block}.hidden.svelte-18ya16r.svelte-18ya16r{opacity:0}.moveUp.svelte-18ya16r.svelte-18ya16r{transform:translateY(-200px)}.moveUp2.svelte-18ya16r.svelte-18ya16r{transform:translateY(-60px)}.original.svelte-18ya16r.svelte-18ya16r{color:blue}.change.svelte-18ya16r.svelte-18ya16r{color:orange}.code-2.svelte-18ya16r .original.svelte-18ya16r,.code-2.svelte-18ya16r .change.svelte-18ya16r,.code-3.svelte-18ya16r .original.svelte-18ya16r,.code-3.svelte-18ya16r .change.svelte-18ya16r{display:inline-block}.sizes.svelte-18ya16r.svelte-18ya16r{position:fixed;bottom:30px;left:50%;transform:translateX(-50%);display:grid;grid-template-columns:1fr 1fr 1fr 1fr;grid-gap:0 14px;grid-template-rows:repeat(42, 6.6px);overflow:hidden}.sizes.svelte-18ya16r>div.svelte-18ya16r{padding:6px 12px;font-size:18px;text-align:center;display:flex;flex-direction:column;justify-content:center;transform:translateY(calc(var(--shift, 0) * 6.6px));transition-timing-function:linear}.react.svelte-18ya16r.svelte-18ya16r{grid-row:3 / 43;grid-column:1 / 2;background:#25d6fb;transition-duration:430ms}.react.hidden.svelte-18ya16r.svelte-18ya16r,.appcode1.hidden.svelte-18ya16r.svelte-18ya16r{--shift:43}.vue2.svelte-18ya16r.svelte-18ya16r{background:#46b583;grid-row:20 / 43;grid-column:2 / 3;transition-duration:230ms}.vue2.hidden.svelte-18ya16r.svelte-18ya16r,.appcode2.hidden.svelte-18ya16r.svelte-18ya16r{--shift:23}.vue3.svelte-18ya16r.svelte-18ya16r{background:#46b583;grid-row:33 / 43;grid-column:3 / 4;transition-duration:130ms}.vue3.hidden.svelte-18ya16r.svelte-18ya16r,.appcode3.hidden.svelte-18ya16r.svelte-18ya16r{--shift:13}.svelte.svelte-18ya16r.svelte-18ya16r{background:linear-gradient(to top right, #fc401d, 72%, lightgrey);color:white;grid-row:39 / 43;grid-column:4 / 5;transition-duration:30ms}.svelte.hidden.svelte-18ya16r.svelte-18ya16r{--shift:4}.appcode1.svelte-18ya16r.svelte-18ya16r,.appcode2.svelte-18ya16r.svelte-18ya16r,.appcode3.svelte-18ya16r.svelte-18ya16r{background:lightgray}.appcode1.svelte-18ya16r.svelte-18ya16r{grid-row:1 / 3;grid-column:1 / 2;transition-duration:430ms}.appcode2.svelte-18ya16r.svelte-18ya16r{grid-row:18 / 20;grid-column:2 / 3;transition-duration:230ms}.appcode3.svelte-18ya16r.svelte-18ya16r{grid-row:31 / 33;grid-column:3 / 4;transition-duration:130ms}";
	append(document.head, style);
}

// (100:0) {:else}
function create_else_block(ctx) {
	let div1;
	let div0;
	let span0;
	let span0_intro;
	let t1;
	let span1;
	let span1_intro;
	let t3;
	let span2;
	let span2_intro;
	let t5;
	let span3;
	let span3_intro;
	let t7;
	let span4;
	let span4_intro;

	return {
		c() {
			div1 = element("div");
			div0 = element("div");
			span0 = element("span");
			span0.textContent = "framework_magic(";
			t1 = space();
			span1 = element("span");
			span1.textContent = "view";
			t3 = space();
			span2 = element("span");
			span2.textContent = ",";
			t5 = space();
			span3 = element("span");
			span3.textContent = "view";
			t7 = space();
			span4 = element("span");
			span4.textContent = ")";
			attr(span0, "class", "svelte-18ya16r");
			attr(span1, "class", "original svelte-18ya16r");
			attr(span2, "class", "svelte-18ya16r");
			attr(span3, "class", "change svelte-18ya16r");
			attr(span4, "class", "svelte-18ya16r");
			attr(div0, "class", "code code-3 svelte-18ya16r");
			attr(div1, "class", "container svelte-18ya16r");
		},
		m(target, anchor) {
			insert(target, div1, anchor);
			append(div1, div0);
			append(div0, span0);
			append(div0, t1);
			append(div0, span1);
			append(div0, t3);
			append(div0, span2);
			append(div0, t5);
			append(div0, span3);
			append(div0, t7);
			append(div0, span4);
		},
		p: noop,
		i(local) {
			if (!span0_intro) {
				add_render_callback(() => {
					span0_intro = create_in_transition(span0, fade, {
						duration: 200,
						easing: cubicIn,
						delay: 500
					});

					span0_intro.start();
				});
			}

			if (!span1_intro) {
				add_render_callback(() => {
					span1_intro = create_in_transition(span1, fly, {
						x: -101,
						opacity: 1,
						easing: identity,
						duration: 500
					});

					span1_intro.start();
				});
			}

			if (!span2_intro) {
				add_render_callback(() => {
					span2_intro = create_in_transition(span2, fade, {
						duration: 200,
						easing: cubicIn,
						delay: 500
					});

					span2_intro.start();
				});
			}

			if (!span3_intro) {
				add_render_callback(() => {
					span3_intro = create_in_transition(span3, fly, {
						x: -96,
						opacity: 1,
						easing: identity,
						duration: 500
					});

					span3_intro.start();
				});
			}

			if (!span4_intro) {
				add_render_callback(() => {
					span4_intro = create_in_transition(span4, fade, {
						duration: 200,
						easing: cubicIn,
						delay: 500
					});

					span4_intro.start();
				});
			}
		},
		o: noop,
		d(detaching) {
			if (detaching) detach(div1);
		}
	};
}

// (92:22) 
function create_if_block_2(ctx) {
	let div1;
	let div0;
	let span0;
	let span0_intro;
	let t1;
	let span1;
	let span1_intro;
	let t3;
	let span2;
	let span2_intro;

	return {
		c() {
			div1 = element("div");
			div0 = element("div");
			span0 = element("span");
			span0.textContent = "view";
			t1 = space();
			span1 = element("span");
			span1.textContent = "->";
			t3 = space();
			span2 = element("span");
			span2.textContent = "view";
			attr(span0, "class", "original svelte-18ya16r");
			attr(span1, "class", "svelte-18ya16r");
			attr(span2, "class", "change svelte-18ya16r");
			attr(div0, "class", "code code-2 svelte-18ya16r");
			attr(div1, "class", "container svelte-18ya16r");
		},
		m(target, anchor) {
			insert(target, div1, anchor);
			append(div1, div0);
			append(div0, span0);
			append(div0, t1);
			append(div0, span1);
			append(div0, t3);
			append(div0, span2);
		},
		p: noop,
		i(local) {
			if (!span0_intro) {
				add_render_callback(() => {
					span0_intro = create_in_transition(span0, fly, {
						y: -60,
						x: -40,
						opacity: 1,
						easing: identity,
						duration: 500
					});

					span0_intro.start();
				});
			}

			if (!span1_intro) {
				add_render_callback(() => {
					span1_intro = create_in_transition(span1, fade, {
						easing: cubicIn,
						duration: 200,
						delay: 500
					});

					span1_intro.start();
				});
			}

			if (!span2_intro) {
				add_render_callback(() => {
					span2_intro = create_in_transition(span2, fly, {
						x: -145,
						opacity: 1,
						easing: identity,
						duration: 500
					});

					span2_intro.start();
				});
			}
		},
		o: noop,
		d(detaching) {
			if (detaching) detach(div1);
		}
	};
}

// (42:0) {#if index < 7}
function create_if_block(ctx) {
	let div1;
	let div0;
	let span0;
	let t1;
	let span1;
	let t3;
	let span2;
	let t5;
	let span3;
	let t7;
	let div3;
	let div2;
	let span4;
	let t9;
	let span5;
	let t11;
	let span6;
	let t13;
	let span7;
	let t15;
	let div4;
	let current;
	let if_block = /*index*/ ctx[0] === 2 && create_if_block_1(ctx);

	return {
		c() {
			div1 = element("div");
			div0 = element("div");
			span0 = element("span");
			span0.textContent = "view";
			t1 = space();
			span1 = element("span");
			span1.textContent = "= fn(";
			t3 = space();
			span2 = element("span");
			span2.textContent = "state";
			t5 = space();
			span3 = element("span");
			span3.textContent = ")";
			t7 = space();
			div3 = element("div");
			div2 = element("div");
			span4 = element("span");
			span4.textContent = "view";
			t9 = space();
			span5 = element("span");
			span5.textContent = "= fn(";
			t11 = space();
			span6 = element("span");
			span6.textContent = "state";
			t13 = space();
			span7 = element("span");
			span7.textContent = ")";
			t15 = space();
			div4 = element("div");
			if (if_block) if_block.c();
			attr(span0, "class", "original svelte-18ya16r");
			attr(span1, "class", "svelte-18ya16r");
			toggle_class(span1, "hidden", /*index*/ ctx[0] >= 6);
			attr(span2, "class", "original svelte-18ya16r");
			toggle_class(span2, "hidden", /*index*/ ctx[0] >= 6);
			attr(span3, "class", "svelte-18ya16r");
			toggle_class(span3, "hidden", /*index*/ ctx[0] >= 6);
			attr(div0, "class", "code svelte-18ya16r");
			toggle_class(div0, "moveUp", /*index*/ ctx[0] === 2);
			attr(div1, "class", "container svelte-18ya16r");
			toggle_class(div1, "hidden", /*index*/ ctx[0] < 4);
			toggle_class(div1, "moveUp2", /*index*/ ctx[0] >= 4);
			attr(span4, "class", "original svelte-18ya16r");
			toggle_class(span4, "hidden", /*index*/ ctx[0] < 0);
			toggle_class(span4, "change", /*index*/ ctx[0] >= 5);
			attr(span5, "class", "svelte-18ya16r");
			toggle_class(span5, "hidden", /*index*/ ctx[0] <= 0 || /*index*/ ctx[0] >= 6);
			attr(span6, "class", "original svelte-18ya16r");
			toggle_class(span6, "hidden", /*index*/ ctx[0] <= 0 || /*index*/ ctx[0] >= 6);
			toggle_class(span6, "change", /*index*/ ctx[0] >= 4);
			attr(span7, "class", "svelte-18ya16r");
			toggle_class(span7, "hidden", /*index*/ ctx[0] <= 0 || /*index*/ ctx[0] >= 6);
			attr(div2, "class", "code svelte-18ya16r");
			toggle_class(div2, "moveUp", /*index*/ ctx[0] === 2);
			attr(div3, "class", "container svelte-18ya16r");
			attr(div4, "class", "container svelte-18ya16r");
		},
		m(target, anchor) {
			insert(target, div1, anchor);
			append(div1, div0);
			append(div0, span0);
			append(div0, t1);
			append(div0, span1);
			append(div0, t3);
			append(div0, span2);
			append(div0, t5);
			append(div0, span3);
			insert(target, t7, anchor);
			insert(target, div3, anchor);
			append(div3, div2);
			append(div2, span4);
			append(div2, t9);
			append(div2, span5);
			append(div2, t11);
			append(div2, span6);
			append(div2, t13);
			append(div2, span7);
			insert(target, t15, anchor);
			insert(target, div4, anchor);
			if (if_block) if_block.m(div4, null);
			current = true;
		},
		p(ctx, dirty) {
			if (dirty & /*index*/ 1) {
				toggle_class(span1, "hidden", /*index*/ ctx[0] >= 6);
			}

			if (dirty & /*index*/ 1) {
				toggle_class(span2, "hidden", /*index*/ ctx[0] >= 6);
			}

			if (dirty & /*index*/ 1) {
				toggle_class(span3, "hidden", /*index*/ ctx[0] >= 6);
			}

			if (dirty & /*index*/ 1) {
				toggle_class(div0, "moveUp", /*index*/ ctx[0] === 2);
			}

			if (dirty & /*index*/ 1) {
				toggle_class(div1, "hidden", /*index*/ ctx[0] < 4);
			}

			if (dirty & /*index*/ 1) {
				toggle_class(div1, "moveUp2", /*index*/ ctx[0] >= 4);
			}

			if (dirty & /*index*/ 1) {
				toggle_class(span4, "hidden", /*index*/ ctx[0] < 0);
			}

			if (dirty & /*index*/ 1) {
				toggle_class(span4, "change", /*index*/ ctx[0] >= 5);
			}

			if (dirty & /*index*/ 1) {
				toggle_class(span5, "hidden", /*index*/ ctx[0] <= 0 || /*index*/ ctx[0] >= 6);
			}

			if (dirty & /*index*/ 1) {
				toggle_class(span6, "hidden", /*index*/ ctx[0] <= 0 || /*index*/ ctx[0] >= 6);
			}

			if (dirty & /*index*/ 1) {
				toggle_class(span6, "change", /*index*/ ctx[0] >= 4);
			}

			if (dirty & /*index*/ 1) {
				toggle_class(span7, "hidden", /*index*/ ctx[0] <= 0 || /*index*/ ctx[0] >= 6);
			}

			if (dirty & /*index*/ 1) {
				toggle_class(div2, "moveUp", /*index*/ ctx[0] === 2);
			}

			if (/*index*/ ctx[0] === 2) {
				if (if_block) {
					if_block.p(ctx, dirty);

					if (dirty & /*index*/ 1) {
						transition_in(if_block, 1);
					}
				} else {
					if_block = create_if_block_1(ctx);
					if_block.c();
					transition_in(if_block, 1);
					if_block.m(div4, null);
				}
			} else if (if_block) {
				group_outros();

				transition_out(if_block, 1, 1, () => {
					if_block = null;
				});

				check_outros();
			}
		},
		i(local) {
			if (current) return;
			transition_in(if_block);
			current = true;
		},
		o(local) {
			transition_out(if_block);
			current = false;
		},
		d(detaching) {
			if (detaching) detach(div1);
			if (detaching) detach(t7);
			if (detaching) detach(div3);
			if (detaching) detach(t15);
			if (detaching) detach(div4);
			if (if_block) if_block.d();
		}
	};
}

// (60:2) {#if index === 2}
function create_if_block_1(ctx) {
	let div4;
	let div0;
	let div0_intro;
	let div0_outro;
	let t1;
	let div1;
	let prism_action;
	let div1_intro;
	let div1_outro;
	let t2;
	let div2;
	let div2_intro;
	let div2_outro;
	let t4;
	let div3;
	let prism_action_1;
	let div3_intro;
	let div3_outro;
	let current;
	let mounted;
	let dispose;

	return {
		c() {
			div4 = element("div");
			div0 = element("div");
			div0.textContent = "Template";
			t1 = space();
			div1 = element("div");
			t2 = space();
			div2 = element("div");
			div2.textContent = "JSX";
			t4 = space();
			div3 = element("div");
			attr(div0, "class", "template-header svelte-18ya16r");
			attr(div1, "class", "svelte-18ya16r");
			attr(div2, "class", "template-header svelte-18ya16r");
			attr(div3, "class", "svelte-18ya16r");
			attr(div4, "class", "template svelte-18ya16r");
		},
		m(target, anchor) {
			insert(target, div4, anchor);
			append(div4, div0);
			append(div4, t1);
			append(div4, div1);
			append(div4, t2);
			append(div4, div2);
			append(div4, t4);
			append(div4, div3);
			current = true;

			if (!mounted) {
				dispose = [
					action_destroyer(prism_action = /*prism*/ ctx[2].call(null, div1, {
						code: `
<div>{count}</div>
<button on:click="doSomething">Click me</button>
  `,
						lang: prism.languages.html
					})),
					action_destroyer(prism_action_1 = /*prism*/ ctx[2].call(null, div3, {
						code: `
function Component({ count, doSomething }) {
  return (
    <>
      <div>{count}</div>
      <button onClick={doSomething}>Click me</button>
    </>
  );
}`,
						lang: prism.languages.javascript
					}))
				];

				mounted = true;
			}
		},
		p: noop,
		i(local) {
			if (current) return;

			add_render_callback(() => {
				if (div0_outro) div0_outro.end(1);
				if (!div0_intro) div0_intro = create_in_transition(div0, fly, { y: 50, easing: cubicIn, duration: 200 });
				div0_intro.start();
			});

			add_render_callback(() => {
				if (div1_outro) div1_outro.end(1);
				if (!div1_intro) div1_intro = create_in_transition(div1, fly, { y: 50, easing: cubicIn, duration: 200 });
				div1_intro.start();
			});

			add_render_callback(() => {
				if (div2_outro) div2_outro.end(1);

				if (!div2_intro) div2_intro = create_in_transition(div2, fly, {
					y: 50,
					easing: cubicIn,
					duration: 200,
					delay: 1000
				});

				div2_intro.start();
			});

			add_render_callback(() => {
				if (div3_outro) div3_outro.end(1);

				if (!div3_intro) div3_intro = create_in_transition(div3, fly, {
					y: 50,
					easing: cubicIn,
					duration: 200,
					delay: 1000
				});

				div3_intro.start();
			});

			current = true;
		},
		o(local) {
			if (div0_intro) div0_intro.invalidate();
			div0_outro = create_out_transition(div0, fly, /*flyOut*/ ctx[1]);
			if (div1_intro) div1_intro.invalidate();
			div1_outro = create_out_transition(div1, fly, /*flyOut*/ ctx[1]);
			if (div2_intro) div2_intro.invalidate();
			div2_outro = create_out_transition(div2, fly, /*flyOut*/ ctx[1]);
			if (div3_intro) div3_intro.invalidate();
			div3_outro = create_out_transition(div3, fly, /*flyOut*/ ctx[1]);
			current = false;
		},
		d(detaching) {
			if (detaching) detach(div4);
			if (detaching && div0_outro) div0_outro.end();
			if (detaching && div1_outro) div1_outro.end();
			if (detaching && div2_outro) div2_outro.end();
			if (detaching && div3_outro) div3_outro.end();
			mounted = false;
			run_all(dispose);
		}
	};
}

function create_fragment(ctx) {
	let current_block_type_index;
	let if_block;
	let t0;
	let div10;
	let div1;
	let t3;
	let div3;
	let t6;
	let div5;
	let t9;
	let div6;
	let t11;
	let div7;
	let t12;
	let div8;
	let t13;
	let div9;
	let current;
	const if_block_creators = [create_if_block, create_if_block_2, create_else_block];
	const if_blocks = [];

	function select_block_type(ctx, dirty) {
		if (/*index*/ ctx[0] < 7) return 0;
		if (/*index*/ ctx[0] === 7) return 1;
		return 2;
	}

	current_block_type_index = select_block_type(ctx);
	if_block = if_blocks[current_block_type_index] = if_block_creators[current_block_type_index](ctx);

	return {
		c() {
			if_block.c();
			t0 = space();
			div10 = element("div");
			div1 = element("div");
			div1.innerHTML = `React<div class="size svelte-18ya16r">~40KB</div>`;
			t3 = space();
			div3 = element("div");
			div3.innerHTML = `Vue 2<div class="size svelte-18ya16r">~23KB</div>`;
			t6 = space();
			div5 = element("div");
			div5.innerHTML = `Vue 3<div class="size svelte-18ya16r">~10KB</div>`;
			t9 = space();
			div6 = element("div");
			div6.textContent = "Svelte";
			t11 = space();
			div7 = element("div");
			t12 = space();
			div8 = element("div");
			t13 = space();
			div9 = element("div");
			attr(div1, "class", "react svelte-18ya16r");
			toggle_class(div1, "hidden", /*index*/ ctx[0] < 9);
			attr(div3, "class", "vue2 svelte-18ya16r");
			toggle_class(div3, "hidden", /*index*/ ctx[0] < 10);
			attr(div5, "class", "vue3 svelte-18ya16r");
			toggle_class(div5, "hidden", /*index*/ ctx[0] < 11);
			attr(div6, "class", "svelte svelte-18ya16r");
			toggle_class(div6, "hidden", /*index*/ ctx[0] < 12);
			attr(div7, "class", "appcode1 svelte-18ya16r");
			toggle_class(div7, "hidden", /*index*/ ctx[0] < 9);
			attr(div8, "class", "appcode2 svelte-18ya16r");
			toggle_class(div8, "hidden", /*index*/ ctx[0] < 10);
			attr(div9, "class", "appcode3 svelte-18ya16r");
			toggle_class(div9, "hidden", /*index*/ ctx[0] < 11);
			attr(div10, "class", "sizes svelte-18ya16r");
		},
		m(target, anchor) {
			if_blocks[current_block_type_index].m(target, anchor);
			insert(target, t0, anchor);
			insert(target, div10, anchor);
			append(div10, div1);
			append(div10, t3);
			append(div10, div3);
			append(div10, t6);
			append(div10, div5);
			append(div10, t9);
			append(div10, div6);
			append(div10, t11);
			append(div10, div7);
			append(div10, t12);
			append(div10, div8);
			append(div10, t13);
			append(div10, div9);
			current = true;
		},
		p(ctx, [dirty]) {
			let previous_block_index = current_block_type_index;
			current_block_type_index = select_block_type(ctx);

			if (current_block_type_index === previous_block_index) {
				if_blocks[current_block_type_index].p(ctx, dirty);
			} else {
				group_outros();

				transition_out(if_blocks[previous_block_index], 1, 1, () => {
					if_blocks[previous_block_index] = null;
				});

				check_outros();
				if_block = if_blocks[current_block_type_index];

				if (!if_block) {
					if_block = if_blocks[current_block_type_index] = if_block_creators[current_block_type_index](ctx);
					if_block.c();
				}

				transition_in(if_block, 1);
				if_block.m(t0.parentNode, t0);
			}

			if (dirty & /*index*/ 1) {
				toggle_class(div1, "hidden", /*index*/ ctx[0] < 9);
			}

			if (dirty & /*index*/ 1) {
				toggle_class(div3, "hidden", /*index*/ ctx[0] < 10);
			}

			if (dirty & /*index*/ 1) {
				toggle_class(div5, "hidden", /*index*/ ctx[0] < 11);
			}

			if (dirty & /*index*/ 1) {
				toggle_class(div6, "hidden", /*index*/ ctx[0] < 12);
			}

			if (dirty & /*index*/ 1) {
				toggle_class(div7, "hidden", /*index*/ ctx[0] < 9);
			}

			if (dirty & /*index*/ 1) {
				toggle_class(div8, "hidden", /*index*/ ctx[0] < 10);
			}

			if (dirty & /*index*/ 1) {
				toggle_class(div9, "hidden", /*index*/ ctx[0] < 11);
			}
		},
		i(local) {
			if (current) return;
			transition_in(if_block);
			current = true;
		},
		o(local) {
			transition_out(if_block);
			current = false;
		},
		d(detaching) {
			if_blocks[current_block_type_index].d(detaching);
			if (detaching) detach(t0);
			if (detaching) detach(div10);
		}
	};
}

let MAX_SLIDES = 12;

function instance($$self, $$props, $$invalidate) {
	let index = -1;
	let flyOut = { y: 50, easing: cubicOut, duration: 200 };

	function next() {
		if (index === MAX_SLIDES) return false;
		$$invalidate(0, index++, index);
		return true;
	}

	function prev() {
		if (index === 0) return false;
		$$invalidate(0, index--, index);
		return true;
	}

	function prism$1(node, { code, lang }) {
		code = code.trim();
		let html = prism.highlight(code, lang);
		html = html.split("\n").map(line => line.replace(/^(\s+)/, (_, m) => ("<span class=\"tab\"></span>").repeat(m.length / 2))).join("<br />");
		node.innerHTML = html;
	}

	const [send, receive] = crossfade({
		duration: 500,
		easing: cubicIn,
		fallback: fade
	});

	return [index, flyOut, prism$1, next, prev];
}

class Slides0 extends SvelteComponent {
	constructor(options) {
		super();
		if (!document.getElementById("svelte-18ya16r-style")) add_css();
		init(this, options, instance, create_fragment, safe_not_equal, { next: 3, prev: 4 });
	}

	get next() {
		return this.$$.ctx[3];
	}

	get prev() {
		return this.$$.ctx[4];
	}
}

/* @@slides1.svelte generated by Svelte v3.24.0 */

function add_css$1() {
	var style = element("style");
	style.id = "svelte-hm3k6-style";
	style.textContent = "h1.svelte-hm3k6{height:100%;display:grid;place-items:center;margin:0}";
	append(document.head, style);
}

function create_fragment$1(ctx) {
	let h1;

	return {
		c() {
			h1 = element("h1");
			h1.textContent = "Looking into the Svelte compiler";
			attr(h1, "class", "svelte-hm3k6");
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

class Slides1 extends SvelteComponent {
	constructor(options) {
		super();
		if (!document.getElementById("svelte-hm3k6-style")) add_css$1();
		init(this, options, null, create_fragment$1, safe_not_equal, {});
	}
}

var profile = "./assets/profile-pic-eb3051d8.png";

var rojak = "./assets/penang-rojak-ccce8e1d.jpg";

var ckt = "./assets/koay-teow-311547c5.jpg";

/* @@slides2.svelte generated by Svelte v3.24.0 */

function add_css$2() {
	var style = element("style");
	style.id = "svelte-13ltwf6-style";
	style.textContent = "img.svelte-13ltwf6.svelte-13ltwf6{height:256px;margin-top:32px}p.svelte-13ltwf6.svelte-13ltwf6{text-align:center}ul.svelte-13ltwf6.svelte-13ltwf6{margin:40px auto;display:block;width:520px}.ckt.svelte-13ltwf6.svelte-13ltwf6,.rojak.svelte-13ltwf6.svelte-13ltwf6{transition:200ms ease-in}.ckt.svelte-13ltwf6.svelte-13ltwf6{position:fixed;top:0;font-size:10px;z-index:1}.ckt.svelte-13ltwf6 img.svelte-13ltwf6{height:450px}.rojak.svelte-13ltwf6.svelte-13ltwf6{position:fixed;top:0;right:32px;font-size:10px;z-index:1}.rojak.svelte-13ltwf6 img.svelte-13ltwf6{height:320px}.hidden.svelte-13ltwf6.svelte-13ltwf6{opacity:0}";
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
			attr(img0, "class", "svelte-13ltwf6");
			attr(p, "class", "svelte-13ltwf6");
			attr(ul, "class", "svelte-13ltwf6");
			if (img1.src !== (img1_src_value = ckt)) attr(img1, "src", img1_src_value);
			attr(img1, "alt", "char koay teow");
			attr(img1, "class", "svelte-13ltwf6");
			attr(div1, "class", "ckt svelte-13ltwf6");
			toggle_class(div1, "hidden", /*index*/ ctx[0] < 1 || /*index*/ ctx[0] >= 3);
			if (img2.src !== (img2_src_value = rojak)) attr(img2, "src", img2_src_value);
			attr(img2, "alt", "rojak");
			attr(img2, "class", "svelte-13ltwf6");
			attr(div3, "class", "rojak svelte-13ltwf6");
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

function instance$1($$self, $$props, $$invalidate) {
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
		if (!document.getElementById("svelte-13ltwf6-style")) add_css$2();
		init(this, options, instance$1, create_fragment$2, safe_not_equal, { next: 1, prev: 2 });
	}

	get next() {
		return this.$$.ctx[1];
	}

	get prev() {
		return this.$$.ctx[2];
	}
}

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
    }
  }
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

const subscriber_queue = [];
/**
 * Create a `Writable` store that allows both updating and reading by subscription.
 * @param {*=}value initial value
 * @param {StartStopNotifier=}start start and stop notifications for subscriptions
 */
function writable(value, start = noop) {
    let stop;
    const subscribers = [];
    function set(new_value) {
        if (safe_not_equal(value, new_value)) {
            value = new_value;
            if (stop) { // store is ready
                const run_queue = !subscriber_queue.length;
                for (let i = 0; i < subscribers.length; i += 1) {
                    const s = subscribers[i];
                    s[1]();
                    subscriber_queue.push(s, value);
                }
                if (run_queue) {
                    for (let i = 0; i < subscriber_queue.length; i += 2) {
                        subscriber_queue[i][0](subscriber_queue[i + 1]);
                    }
                    subscriber_queue.length = 0;
                }
            }
        }
    }
    function update(fn) {
        set(fn(value));
    }
    function subscribe(run, invalidate = noop) {
        const subscriber = [run, invalidate];
        subscribers.push(subscriber);
        if (subscribers.length === 1) {
            stop = start(set) || noop;
        }
        run(value);
        return () => {
            const index = subscribers.indexOf(subscriber);
            if (index !== -1) {
                subscribers.splice(index, 1);
            }
            if (subscribers.length === 0) {
                stop();
                stop = null;
            }
        };
    }
    return { set, update, subscribe };
}

function clamp(num, min, max) {
    return num < min ? min : num > max ? max : num;
}

/* node_modules/@sveltejs/svelte-repl/src/SplitPane.svelte generated by Svelte v3.24.0 */

function add_css$3() {
	var style = element("style");
	style.id = "svelte-1k0d9r4-style";
	style.textContent = ".container.svelte-1k0d9r4{position:relative;width:100%;height:100%}.pane.svelte-1k0d9r4{position:relative;float:left;width:100%;height:100%;overflow:auto}.mousecatcher.svelte-1k0d9r4{position:absolute;left:0;top:0;width:100%;height:100%;background:rgba(255,255,255,.01)}.divider.svelte-1k0d9r4{position:absolute;z-index:10;display:none}.divider.svelte-1k0d9r4::after{content:'';position:absolute;background-color:var(--second)}.horizontal.svelte-1k0d9r4{padding:0 8px;width:0;height:100%;cursor:ew-resize}.horizontal.svelte-1k0d9r4::after{left:8px;top:0;width:1px;height:100%}.vertical.svelte-1k0d9r4{padding:8px 0;width:100%;height:0;cursor:ns-resize}.vertical.svelte-1k0d9r4::after{top:8px;left:0;width:100%;height:1px}.left.svelte-1k0d9r4,.right.svelte-1k0d9r4,.divider.svelte-1k0d9r4{display:block}.left.svelte-1k0d9r4,.right.svelte-1k0d9r4{height:100%;float:left}.top.svelte-1k0d9r4,.bottom.svelte-1k0d9r4{position:absolute;width:100%}.top.svelte-1k0d9r4{top:0}.bottom.svelte-1k0d9r4{bottom:0}";
	append(document.head, style);
}

const get_b_slot_changes = dirty => ({});
const get_b_slot_context = ctx => ({});
const get_a_slot_changes = dirty => ({});
const get_a_slot_context = ctx => ({});

// (200:1) {#if !fixed}
function create_if_block_1$1(ctx) {
	let div;
	let div_class_value;
	let div_style_value;
	let drag_action;
	let touchDrag_action;
	let mounted;
	let dispose;

	return {
		c() {
			div = element("div");
			attr(div, "class", div_class_value = "" + (/*type*/ ctx[1] + " divider" + " svelte-1k0d9r4"));
			attr(div, "style", div_style_value = "" + (/*side*/ ctx[7] + ": calc(" + /*pos*/ ctx[0] + "% - 8px)"));
		},
		m(target, anchor) {
			insert(target, div, anchor);

			if (!mounted) {
				dispose = [
					action_destroyer(drag_action = /*drag*/ ctx[11].call(null, div, /*setPos*/ ctx[9])),
					action_destroyer(touchDrag_action = /*touchDrag*/ ctx[12].call(null, div, /*setTouchPos*/ ctx[10]))
				];

				mounted = true;
			}
		},
		p(ctx, dirty) {
			if (dirty & /*type*/ 2 && div_class_value !== (div_class_value = "" + (/*type*/ ctx[1] + " divider" + " svelte-1k0d9r4"))) {
				attr(div, "class", div_class_value);
			}

			if (dirty & /*side, pos*/ 129 && div_style_value !== (div_style_value = "" + (/*side*/ ctx[7] + ": calc(" + /*pos*/ ctx[0] + "% - 8px)"))) {
				attr(div, "style", div_style_value);
			}
		},
		d(detaching) {
			if (detaching) detach(div);
			mounted = false;
			run_all(dispose);
		}
	};
}

// (205:0) {#if dragging}
function create_if_block$1(ctx) {
	let div;

	return {
		c() {
			div = element("div");
			attr(div, "class", "mousecatcher svelte-1k0d9r4");
		},
		m(target, anchor) {
			insert(target, div, anchor);
		},
		d(detaching) {
			if (detaching) detach(div);
		}
	};
}

function create_fragment$3(ctx) {
	let div2;
	let div0;
	let div0_style_value;
	let t0;
	let div1;
	let div1_style_value;
	let t1;
	let div2_resize_listener;
	let t2;
	let if_block1_anchor;
	let current;
	const a_slot_template = /*$$slots*/ ctx[17].a;
	const a_slot = create_slot(a_slot_template, ctx, /*$$scope*/ ctx[16], get_a_slot_context);
	const b_slot_template = /*$$slots*/ ctx[17].b;
	const b_slot = create_slot(b_slot_template, ctx, /*$$scope*/ ctx[16], get_b_slot_context);
	let if_block0 = !/*fixed*/ ctx[2] && create_if_block_1$1(ctx);
	let if_block1 = /*dragging*/ ctx[6] && create_if_block$1();

	return {
		c() {
			div2 = element("div");
			div0 = element("div");
			if (a_slot) a_slot.c();
			t0 = space();
			div1 = element("div");
			if (b_slot) b_slot.c();
			t1 = space();
			if (if_block0) if_block0.c();
			t2 = space();
			if (if_block1) if_block1.c();
			if_block1_anchor = empty();
			attr(div0, "class", "pane svelte-1k0d9r4");
			attr(div0, "style", div0_style_value = "" + (/*dimension*/ ctx[8] + ": " + /*pos*/ ctx[0] + "%;"));
			attr(div1, "class", "pane svelte-1k0d9r4");
			attr(div1, "style", div1_style_value = "" + (/*dimension*/ ctx[8] + ": " + (100 - /*pos*/ ctx[0]) + "%;"));
			attr(div2, "class", "container svelte-1k0d9r4");
			add_render_callback(() => /*div2_elementresize_handler*/ ctx[19].call(div2));
		},
		m(target, anchor) {
			insert(target, div2, anchor);
			append(div2, div0);

			if (a_slot) {
				a_slot.m(div0, null);
			}

			append(div2, t0);
			append(div2, div1);

			if (b_slot) {
				b_slot.m(div1, null);
			}

			append(div2, t1);
			if (if_block0) if_block0.m(div2, null);
			/*div2_binding*/ ctx[18](div2);
			div2_resize_listener = add_resize_listener(div2, /*div2_elementresize_handler*/ ctx[19].bind(div2));
			insert(target, t2, anchor);
			if (if_block1) if_block1.m(target, anchor);
			insert(target, if_block1_anchor, anchor);
			current = true;
		},
		p(ctx, [dirty]) {
			if (a_slot) {
				if (a_slot.p && dirty & /*$$scope*/ 65536) {
					update_slot(a_slot, a_slot_template, ctx, /*$$scope*/ ctx[16], dirty, get_a_slot_changes, get_a_slot_context);
				}
			}

			if (!current || dirty & /*dimension, pos*/ 257 && div0_style_value !== (div0_style_value = "" + (/*dimension*/ ctx[8] + ": " + /*pos*/ ctx[0] + "%;"))) {
				attr(div0, "style", div0_style_value);
			}

			if (b_slot) {
				if (b_slot.p && dirty & /*$$scope*/ 65536) {
					update_slot(b_slot, b_slot_template, ctx, /*$$scope*/ ctx[16], dirty, get_b_slot_changes, get_b_slot_context);
				}
			}

			if (!current || dirty & /*dimension, pos*/ 257 && div1_style_value !== (div1_style_value = "" + (/*dimension*/ ctx[8] + ": " + (100 - /*pos*/ ctx[0]) + "%;"))) {
				attr(div1, "style", div1_style_value);
			}

			if (!/*fixed*/ ctx[2]) {
				if (if_block0) {
					if_block0.p(ctx, dirty);
				} else {
					if_block0 = create_if_block_1$1(ctx);
					if_block0.c();
					if_block0.m(div2, null);
				}
			} else if (if_block0) {
				if_block0.d(1);
				if_block0 = null;
			}

			if (/*dragging*/ ctx[6]) {
				if (if_block1) ; else {
					if_block1 = create_if_block$1();
					if_block1.c();
					if_block1.m(if_block1_anchor.parentNode, if_block1_anchor);
				}
			} else if (if_block1) {
				if_block1.d(1);
				if_block1 = null;
			}
		},
		i(local) {
			if (current) return;
			transition_in(a_slot, local);
			transition_in(b_slot, local);
			current = true;
		},
		o(local) {
			transition_out(a_slot, local);
			transition_out(b_slot, local);
			current = false;
		},
		d(detaching) {
			if (detaching) detach(div2);
			if (a_slot) a_slot.d(detaching);
			if (b_slot) b_slot.d(detaching);
			if (if_block0) if_block0.d();
			/*div2_binding*/ ctx[18](null);
			div2_resize_listener();
			if (detaching) detach(t2);
			if (if_block1) if_block1.d(detaching);
			if (detaching) detach(if_block1_anchor);
		}
	};
}

function instance$2($$self, $$props, $$invalidate) {
	const dispatch = createEventDispatcher();
	let { type } = $$props;
	let { pos = 50 } = $$props;
	let { fixed = false } = $$props;
	let { buffer = 42 } = $$props;
	let { min } = $$props;
	let { max } = $$props;
	let w;
	let h;
	const refs = {};
	let dragging = false;

	function setPos(event) {
		const { top, left } = refs.container.getBoundingClientRect();

		const px = type === "vertical"
		? event.clientY - top
		: event.clientX - left;

		$$invalidate(0, pos = 100 * px / size);
		dispatch("change");
	}

	function setTouchPos(event) {
		const { top, left } = refs.container.getBoundingClientRect();

		const px = type === "vertical"
		? event.touches[0].clientY - top
		: event.touches[0].clientX - left;

		$$invalidate(0, pos = 100 * px / size);
		dispatch("change");
	}

	function drag(node, callback) {
		const mousedown = event => {
			if (event.which !== 1) return;
			event.preventDefault();
			$$invalidate(6, dragging = true);

			const onmouseup = () => {
				$$invalidate(6, dragging = false);
				window.removeEventListener("mousemove", callback, false);
				window.removeEventListener("mouseup", onmouseup, false);
			};

			window.addEventListener("mousemove", callback, false);
			window.addEventListener("mouseup", onmouseup, false);
		};

		node.addEventListener("mousedown", mousedown, false);

		return {
			destroy() {
				node.removeEventListener("mousedown", mousedown, false);
			}
		};
	}

	function touchDrag(node, callback) {
		const touchdown = event => {
			if (event.targetTouches.length > 1) return;
			event.preventDefault();
			$$invalidate(6, dragging = true);

			const ontouchend = () => {
				$$invalidate(6, dragging = false);
				window.removeEventListener("touchmove", callback, false);
				window.removeEventListener("touchend", ontouchend, false);
			};

			window.addEventListener("touchmove", callback, false);
			window.addEventListener("touchend", ontouchend, false);
		};

		node.addEventListener("touchstart", touchdown, false);

		return {
			destroy() {
				node.removeEventListener("touchstart", touchdown, false);
			}
		};
	}

	let { $$slots = {}, $$scope } = $$props;

	function div2_binding($$value) {
		binding_callbacks[$$value ? "unshift" : "push"](() => {
			refs.container = $$value;
			$$invalidate(5, refs);
		});
	}

	function div2_elementresize_handler() {
		w = this.clientWidth;
		h = this.clientHeight;
		$$invalidate(3, w);
		$$invalidate(4, h);
	}

	$$self.$set = $$props => {
		if ("type" in $$props) $$invalidate(1, type = $$props.type);
		if ("pos" in $$props) $$invalidate(0, pos = $$props.pos);
		if ("fixed" in $$props) $$invalidate(2, fixed = $$props.fixed);
		if ("buffer" in $$props) $$invalidate(15, buffer = $$props.buffer);
		if ("min" in $$props) $$invalidate(13, min = $$props.min);
		if ("max" in $$props) $$invalidate(14, max = $$props.max);
		if ("$$scope" in $$props) $$invalidate(16, $$scope = $$props.$$scope);
	};

	let size;
	let side;
	let dimension;

	$$self.$$.update = () => {
		if ($$self.$$.dirty & /*type, h, w*/ 26) {
			 $$invalidate(20, size = type === "vertical" ? h : w);
		}

		if ($$self.$$.dirty & /*buffer, size*/ 1081344) {
			 $$invalidate(13, min = 100 * (buffer / size));
		}

		if ($$self.$$.dirty & /*min*/ 8192) {
			 $$invalidate(14, max = 100 - min);
		}

		if ($$self.$$.dirty & /*pos, min, max*/ 24577) {
			 $$invalidate(0, pos = clamp(pos, min, max));
		}

		if ($$self.$$.dirty & /*type*/ 2) {
			 $$invalidate(7, side = type === "horizontal" ? "left" : "top");
		}

		if ($$self.$$.dirty & /*type*/ 2) {
			 $$invalidate(8, dimension = type === "horizontal" ? "width" : "height");
		}
	};

	return [
		pos,
		type,
		fixed,
		w,
		h,
		refs,
		dragging,
		side,
		dimension,
		setPos,
		setTouchPos,
		drag,
		touchDrag,
		min,
		max,
		buffer,
		$$scope,
		$$slots,
		div2_binding,
		div2_elementresize_handler
	];
}

class SplitPane extends SvelteComponent {
	constructor(options) {
		super();
		if (!document.getElementById("svelte-1k0d9r4-style")) add_css$3();

		init(this, options, instance$2, create_fragment$3, safe_not_equal, {
			type: 1,
			pos: 0,
			fixed: 2,
			buffer: 15,
			min: 13,
			max: 14
		});
	}
}

/* node_modules/@sveltejs/svelte-repl/src/Input/ComponentSelector.svelte generated by Svelte v3.24.0 */

const { document: document_1 } = globals;

function add_css$4() {
	var style = element("style");
	style.id = "svelte-cghqrp-style";
	style.textContent = ".component-selector.svelte-cghqrp.svelte-cghqrp{position:relative;border-bottom:1px solid #eee;overflow:hidden}.file-tabs.svelte-cghqrp.svelte-cghqrp{border:none;margin:0;white-space:nowrap;overflow-x:auto;overflow-y:hidden;height:10em}.file-tabs.svelte-cghqrp .button.svelte-cghqrp,.file-tabs.svelte-cghqrp button.svelte-cghqrp{position:relative;display:inline-block;font:400 12px/1.5 var(--font);background:white;border:none;border-bottom:3px solid transparent;padding:12px 14px 8px 16px;margin:0;color:#999;border-radius:0;cursor:pointer}.file-tabs.svelte-cghqrp .button.active.svelte-cghqrp{color:#333;border-bottom:3px solid var(--prime)}.editable.svelte-cghqrp.svelte-cghqrp,.uneditable.svelte-cghqrp.svelte-cghqrp,.input-sizer.svelte-cghqrp.svelte-cghqrp,input.svelte-cghqrp.svelte-cghqrp{display:inline-block;position:relative;line-height:1}.input-sizer.svelte-cghqrp.svelte-cghqrp{color:#ccc}input.svelte-cghqrp.svelte-cghqrp{position:absolute;width:100%;left:16px;top:12px;font:400 12px/1.5 var(--font);border:none;color:var(--flash);outline:none;background-color:transparent}.duplicate.svelte-cghqrp.svelte-cghqrp{color:var(--prime)}.remove.svelte-cghqrp.svelte-cghqrp{position:absolute;display:none;right:1px;top:4px;width:16px;text-align:right;padding:12px 0 12px 5px;font-size:8px;cursor:pointer}.remove.svelte-cghqrp.svelte-cghqrp:hover{color:var(--flash)}.file-tabs.svelte-cghqrp .button.active .editable.svelte-cghqrp{cursor:text}.file-tabs.svelte-cghqrp .button.active .remove.svelte-cghqrp{display:block}.file-tabs.svelte-cghqrp .button.drag-over.svelte-cghqrp{background:#67677814}.file-tabs.svelte-cghqrp .button.drag-over.svelte-cghqrp{cursor:move}.add-new.svelte-cghqrp.svelte-cghqrp{position:absolute;left:0;top:0;padding:12px 10px 8px 0 !important;height:40px;text-align:center;background-color:white}.add-new.svelte-cghqrp.svelte-cghqrp:hover{color:var(--flash) !important}.drag-handle.svelte-cghqrp.svelte-cghqrp{cursor:move;width:5px;height:25px;position:absolute;left:5px;top:9px;--drag-handle-color:#dedede;background:linear-gradient(to right,\n\t\t\tvar(--drag-handle-color) 1px, white 1px,\n\t\t\twhite 2px, var(--drag-handle-color) 2px,\n\t\t\tvar(--drag-handle-color) 3px, white 3px,\n\t\t\twhite 4px, var(--drag-handle-color) 4px\n\t\t)}svg.svelte-cghqrp.svelte-cghqrp{position:relative;overflow:hidden;vertical-align:middle;-o-object-fit:contain;object-fit:contain;-webkit-transform-origin:center center;transform-origin:center center;stroke:currentColor;stroke-width:2;stroke-linecap:round;stroke-linejoin:round;fill:none}";
	append(document_1.head, style);
}

function get_each_context(ctx, list, i) {
	const child_ctx = ctx.slice();
	child_ctx[26] = list[i];
	child_ctx[28] = i;
	return child_ctx;
}

// (270:1) {#if $components.length}
function create_if_block$2(ctx) {
	let div;
	let t;
	let button;
	let mounted;
	let dispose;
	let each_value = /*$components*/ ctx[4];
	let each_blocks = [];

	for (let i = 0; i < each_value.length; i += 1) {
		each_blocks[i] = create_each_block(get_each_context(ctx, each_value, i));
	}

	return {
		c() {
			div = element("div");

			for (let i = 0; i < each_blocks.length; i += 1) {
				each_blocks[i].c();
			}

			t = space();
			button = element("button");
			button.innerHTML = `<svg width="12" height="12" viewBox="0 0 24 24" class="svelte-cghqrp"><line stroke="#999" x1="12" y1="5" x2="12" y2="19"></line><line stroke="#999" x1="5" y1="12" x2="19" y2="12"></line></svg>`;
			attr(button, "class", "add-new svelte-cghqrp");
			attr(button, "title", "add new component");
			attr(div, "class", "file-tabs svelte-cghqrp");
		},
		m(target, anchor) {
			insert(target, div, anchor);

			for (let i = 0; i < each_blocks.length; i += 1) {
				each_blocks[i].m(div, null);
			}

			append(div, t);
			append(div, button);

			if (!mounted) {
				dispose = [
					listen(button, "click", /*addNew*/ ctx[10]),
					listen(div, "dblclick", /*addNew*/ ctx[10])
				];

				mounted = true;
			}
		},
		p(ctx, dirty) {
			if (dirty & /*$components, editing, $selected, over, selectComponent, dragStart, dragOver, dragLeave, dragEnd, isComponentNameUsed, selectInput, closeEdit, remove, editTab*/ 64478) {
				each_value = /*$components*/ ctx[4];
				let i;

				for (i = 0; i < each_value.length; i += 1) {
					const child_ctx = get_each_context(ctx, each_value, i);

					if (each_blocks[i]) {
						each_blocks[i].p(child_ctx, dirty);
					} else {
						each_blocks[i] = create_each_block(child_ctx);
						each_blocks[i].c();
						each_blocks[i].m(div, t);
					}
				}

				for (; i < each_blocks.length; i += 1) {
					each_blocks[i].d(1);
				}

				each_blocks.length = each_value.length;
			}
		},
		d(detaching) {
			if (detaching) detach(div);
			destroy_each(each_blocks, detaching);
			mounted = false;
			run_all(dispose);
		}
	};
}

// (307:6) {:else}
function create_else_block$1(ctx) {
	let div;
	let t0_value = /*component*/ ctx[26].name + "";
	let t0;
	let t1;
	let t2_value = /*component*/ ctx[26].type + "";
	let t2;
	let t3;
	let span;
	let mounted;
	let dispose;

	function click_handler(...args) {
		return /*click_handler*/ ctx[19](/*component*/ ctx[26], ...args);
	}

	function click_handler_1(...args) {
		return /*click_handler_1*/ ctx[20](/*component*/ ctx[26], ...args);
	}

	return {
		c() {
			div = element("div");
			t0 = text(t0_value);
			t1 = text(".");
			t2 = text(t2_value);
			t3 = space();
			span = element("span");
			span.innerHTML = `<svg width="12" height="12" viewBox="0 0 24 24" class="svelte-cghqrp"><line stroke="#999" x1="18" y1="6" x2="6" y2="18"></line><line stroke="#999" x1="6" y1="6" x2="18" y2="18"></line></svg>`;
			attr(div, "class", "editable svelte-cghqrp");
			attr(div, "title", "edit component name");
			attr(span, "class", "remove svelte-cghqrp");
		},
		m(target, anchor) {
			insert(target, div, anchor);
			append(div, t0);
			append(div, t1);
			append(div, t2);
			insert(target, t3, anchor);
			insert(target, span, anchor);

			if (!mounted) {
				dispose = [
					listen(div, "click", click_handler),
					listen(span, "click", click_handler_1)
				];

				mounted = true;
			}
		},
		p(new_ctx, dirty) {
			ctx = new_ctx;
			if (dirty & /*$components*/ 16 && t0_value !== (t0_value = /*component*/ ctx[26].name + "")) set_data(t0, t0_value);
			if (dirty & /*$components*/ 16 && t2_value !== (t2_value = /*component*/ ctx[26].type + "")) set_data(t2, t2_value);
		},
		d(detaching) {
			if (detaching) detach(div);
			if (detaching) detach(t3);
			if (detaching) detach(span);
			mounted = false;
			run_all(dispose);
		}
	};
}

// (294:6) {#if component === editing}
function create_if_block_2$1(ctx) {
	let span;

	let t0_value = /*editing*/ ctx[1].name + ((/\./).test(/*editing*/ ctx[1].name)
	? ""
	: `.${/*editing*/ ctx[1].type}`) + "";

	let t0;
	let t1;
	let input;
	let input_spellcheck_value;
	let mounted;
	let dispose;

	return {
		c() {
			span = element("span");
			t0 = text(t0_value);
			t1 = space();
			input = element("input");
			attr(span, "class", "input-sizer svelte-cghqrp");
			input.autofocus = true;
			attr(input, "spellcheck", input_spellcheck_value = false);
			attr(input, "class", "svelte-cghqrp");
			toggle_class(input, "duplicate", /*isComponentNameUsed*/ ctx[11](/*editing*/ ctx[1]));
		},
		m(target, anchor) {
			insert(target, span, anchor);
			append(span, t0);
			insert(target, t1, anchor);
			insert(target, input, anchor);
			set_input_value(input, /*editing*/ ctx[1].name);
			input.focus();

			if (!mounted) {
				dispose = [
					listen(input, "input", /*input_input_handler*/ ctx[17]),
					listen(input, "focus", selectInput),
					listen(input, "blur", /*closeEdit*/ ctx[8]),
					listen(input, "keydown", /*keydown_handler*/ ctx[18])
				];

				mounted = true;
			}
		},
		p(ctx, dirty) {
			if (dirty & /*editing*/ 2 && t0_value !== (t0_value = /*editing*/ ctx[1].name + ((/\./).test(/*editing*/ ctx[1].name)
			? ""
			: `.${/*editing*/ ctx[1].type}`) + "")) set_data(t0, t0_value);

			if (dirty & /*editing*/ 2 && input.value !== /*editing*/ ctx[1].name) {
				set_input_value(input, /*editing*/ ctx[1].name);
			}

			if (dirty & /*isComponentNameUsed, editing*/ 2050) {
				toggle_class(input, "duplicate", /*isComponentNameUsed*/ ctx[11](/*editing*/ ctx[1]));
			}
		},
		d(detaching) {
			if (detaching) detach(span);
			if (detaching) detach(t1);
			if (detaching) detach(input);
			mounted = false;
			run_all(dispose);
		}
	};
}

// (289:5) {#if component.name === 'App' && component !== editing}
function create_if_block_1$2(ctx) {
	let div;

	return {
		c() {
			div = element("div");
			div.textContent = "App.svelte";
			attr(div, "class", "uneditable svelte-cghqrp");
		},
		m(target, anchor) {
			insert(target, div, anchor);
		},
		p: noop,
		d(detaching) {
			if (detaching) detach(div);
		}
	};
}

// (272:3) {#each $components as component, index}
function create_each_block(ctx) {
	let div;
	let i;
	let t;
	let div_id_value;
	let div_draggable_value;
	let mounted;
	let dispose;

	function select_block_type(ctx, dirty) {
		if (/*component*/ ctx[26].name === "App" && /*component*/ ctx[26] !== /*editing*/ ctx[1]) return create_if_block_1$2;
		if (/*component*/ ctx[26] === /*editing*/ ctx[1]) return create_if_block_2$1;
		return create_else_block$1;
	}

	let current_block_type = select_block_type(ctx);
	let if_block = current_block_type(ctx);

	function click_handler_2(...args) {
		return /*click_handler_2*/ ctx[21](/*component*/ ctx[26], ...args);
	}

	return {
		c() {
			div = element("div");
			i = element("i");
			t = space();
			if_block.c();
			attr(i, "class", "drag-handle svelte-cghqrp");
			attr(div, "id", div_id_value = /*component*/ ctx[26].name);
			attr(div, "class", "button svelte-cghqrp");
			attr(div, "role", "button");
			attr(div, "draggable", div_draggable_value = /*component*/ ctx[26] !== /*editing*/ ctx[1]);
			toggle_class(div, "active", /*component*/ ctx[26] === /*$selected*/ ctx[3]);
			toggle_class(div, "draggable", /*component*/ ctx[26] !== /*editing*/ ctx[1] && /*index*/ ctx[28] !== 0);
			toggle_class(div, "drag-over", /*over*/ ctx[2] === /*component*/ ctx[26].name);
		},
		m(target, anchor) {
			insert(target, div, anchor);
			append(div, i);
			append(div, t);
			if_block.m(div, null);

			if (!mounted) {
				dispose = [
					listen(div, "click", click_handler_2),
					listen(div, "dblclick", dblclick_handler),
					listen(div, "dragstart", /*dragStart*/ ctx[12]),
					listen(div, "dragover", /*dragOver*/ ctx[14]),
					listen(div, "dragleave", /*dragLeave*/ ctx[13]),
					listen(div, "drop", /*dragEnd*/ ctx[15])
				];

				mounted = true;
			}
		},
		p(new_ctx, dirty) {
			ctx = new_ctx;

			if (current_block_type === (current_block_type = select_block_type(ctx)) && if_block) {
				if_block.p(ctx, dirty);
			} else {
				if_block.d(1);
				if_block = current_block_type(ctx);

				if (if_block) {
					if_block.c();
					if_block.m(div, null);
				}
			}

			if (dirty & /*$components*/ 16 && div_id_value !== (div_id_value = /*component*/ ctx[26].name)) {
				attr(div, "id", div_id_value);
			}

			if (dirty & /*$components, editing*/ 18 && div_draggable_value !== (div_draggable_value = /*component*/ ctx[26] !== /*editing*/ ctx[1])) {
				attr(div, "draggable", div_draggable_value);
			}

			if (dirty & /*$components, $selected*/ 24) {
				toggle_class(div, "active", /*component*/ ctx[26] === /*$selected*/ ctx[3]);
			}

			if (dirty & /*$components, editing*/ 18) {
				toggle_class(div, "draggable", /*component*/ ctx[26] !== /*editing*/ ctx[1] && /*index*/ ctx[28] !== 0);
			}

			if (dirty & /*over, $components*/ 20) {
				toggle_class(div, "drag-over", /*over*/ ctx[2] === /*component*/ ctx[26].name);
			}
		},
		d(detaching) {
			if (detaching) detach(div);
			if_block.d();
			mounted = false;
			run_all(dispose);
		}
	};
}

function create_fragment$4(ctx) {
	let div;
	let if_block = /*$components*/ ctx[4].length && create_if_block$2(ctx);

	return {
		c() {
			div = element("div");
			if (if_block) if_block.c();
			attr(div, "class", "component-selector svelte-cghqrp");
		},
		m(target, anchor) {
			insert(target, div, anchor);
			if (if_block) if_block.m(div, null);
		},
		p(ctx, [dirty]) {
			if (/*$components*/ ctx[4].length) {
				if (if_block) {
					if_block.p(ctx, dirty);
				} else {
					if_block = create_if_block$2(ctx);
					if_block.c();
					if_block.m(div, null);
				}
			} else if (if_block) {
				if_block.d(1);
				if_block = null;
			}
		},
		i: noop,
		o: noop,
		d(detaching) {
			if (detaching) detach(div);
			if (if_block) if_block.d();
		}
	};
}

function selectInput(event) {
	setTimeout(() => {
		event.target.select();
	});
}

const dblclick_handler = e => e.stopPropagation();

function instance$3($$self, $$props, $$invalidate) {
	let $selected;

	let $components,
		$$unsubscribe_components = noop,
		$$subscribe_components = () => ($$unsubscribe_components(), $$unsubscribe_components = subscribe(components, $$value => $$invalidate(4, $components = $$value)), components);

	$$self.$$.on_destroy.push(() => $$unsubscribe_components());
	let { handle_select } = $$props;
	const { components, selected, request_focus, rebundle } = getContext("REPL");
	$$subscribe_components();
	component_subscribe($$self, selected, value => $$invalidate(3, $selected = value));
	let editing = null;

	function selectComponent(component) {
		if ($selected !== component) {
			$$invalidate(1, editing = null);
			handle_select(component);
		}
	}

	function editTab(component) {
		if ($selected === component) {
			$$invalidate(1, editing = $selected);
		}
	}

	function closeEdit() {
		const match = (/(.+)\.(svelte|js|json|md)$/).exec($selected.name);
		set_store_value(selected, $selected.name = match ? match[1] : $selected.name, $selected);

		if (isComponentNameUsed($selected)) {
			let i = 1;
			let name = $selected.name;

			do {
				set_store_value(selected, $selected.name = `${name}_${i++}`, $selected);
			} while (isComponentNameUsed($selected));
		}

		if (match && match[2]) set_store_value(selected, $selected.type = match[2], $selected);
		$$invalidate(1, editing = null);

		// re-select, in case the type changed
		handle_select($selected);

		$$subscribe_components($$invalidate(0, components)); // TODO necessary?

		// focus the editor, but wait a beat (so key events aren't misdirected)
		setTimeout(request_focus);

		rebundle();
	}

	function remove(component) {
		let result = confirm(`Are you sure you want to delete ${component.name}.${component.type}?`);

		if (result) {
			const index = $components.indexOf(component);

			if (~index) {
				components.set($components.slice(0, index).concat($components.slice(index + 1)));
			} else {
				console.error(`Could not find component! That's... odd`);
			}

			handle_select($components[index] || $components[$components.length - 1]);
		}
	}

	let uid = 1;

	function addNew() {
		const component = {
			name: uid++ ? `Component${uid}` : "Component1",
			type: "svelte",
			source: ""
		};

		$$invalidate(1, editing = component);

		setTimeout(() => {
			// TODO we can do this without IDs
			document.getElementById(component.name).scrollIntoView(false);
		});

		components.update(components => components.concat(component));
		handle_select(component);
	}

	function isComponentNameUsed(editing) {
		return $components.find(component => component !== editing && component.name === editing.name);
	}

	// drag and drop
	let from = null;

	let over = null;

	function dragStart(event) {
		from = event.currentTarget.id;
	}

	function dragLeave() {
		$$invalidate(2, over = null);
	}

	function dragOver(event) {
		event.preventDefault();
		$$invalidate(2, over = event.currentTarget.id);
	}

	function dragEnd(event) {
		event.preventDefault();

		if (from && over) {
			const from_index = $components.findIndex(component => component.name === from);
			const to_index = $components.findIndex(component => component.name === over);
			const from_component = $components[from_index];
			$components.splice(from_index, 1);
			components.set($components.slice(0, to_index).concat(from_component).concat($components.slice(to_index)));
		}

		from = $$invalidate(2, over = null);
	}

	function input_input_handler() {
		editing.name = this.value;
		$$invalidate(1, editing);
	}

	const keydown_handler = e => e.which === 13 && !isComponentNameUsed(editing) && e.target.blur();
	const click_handler = component => editTab(component);
	const click_handler_1 = component => remove(component);
	const click_handler_2 = component => selectComponent(component);

	$$self.$set = $$props => {
		if ("handle_select" in $$props) $$invalidate(16, handle_select = $$props.handle_select);
	};

	return [
		components,
		editing,
		over,
		$selected,
		$components,
		selected,
		selectComponent,
		editTab,
		closeEdit,
		remove,
		addNew,
		isComponentNameUsed,
		dragStart,
		dragLeave,
		dragOver,
		dragEnd,
		handle_select,
		input_input_handler,
		keydown_handler,
		click_handler,
		click_handler_1,
		click_handler_2
	];
}

class ComponentSelector extends SvelteComponent {
	constructor(options) {
		super();
		if (!document_1.getElementById("svelte-cghqrp-style")) add_css$4();
		init(this, options, instance$3, create_fragment$4, safe_not_equal, { handle_select: 16 });
	}
}

const is_browser = typeof window !== 'undefined';

/* node_modules/@sveltejs/svelte-repl/src/Message.svelte generated by Svelte v3.24.0 */

function add_css$5() {
	var style = element("style");
	style.id = "svelte-9488n4-style";
	style.textContent = ".message.svelte-9488n4{position:relative;color:white;padding:12px 16px 12px 44px;font:400 12px/1.7 var(--font);margin:0;border-top:1px solid white}.navigable.svelte-9488n4{cursor:pointer}.message.svelte-9488n4::before{content:'!';position:absolute;left:12px;top:10px;text-align:center;line-height:1;padding:4px;border-radius:50%;color:white;border:2px solid white;box-sizing:content-box;width:10px;height:10px;font-size:11px;font-weight:700}.truncate.svelte-9488n4{white-space:pre;overflow-x:hidden;text-overflow:ellipsis}p.svelte-9488n4{margin:0}.error.svelte-9488n4{background-color:#da106e}.warning.svelte-9488n4{background-color:#e47e0a}.info.svelte-9488n4{background-color:var(--second)}";
	append(document.head, style);
}

// (88:1) {:else}
function create_else_block$2(ctx) {
	let current;
	const default_slot_template = /*$$slots*/ ctx[7].default;
	const default_slot = create_slot(default_slot_template, ctx, /*$$scope*/ ctx[6], null);

	return {
		c() {
			if (default_slot) default_slot.c();
		},
		m(target, anchor) {
			if (default_slot) {
				default_slot.m(target, anchor);
			}

			current = true;
		},
		p(ctx, dirty) {
			if (default_slot) {
				if (default_slot.p && dirty & /*$$scope*/ 64) {
					update_slot(default_slot, default_slot_template, ctx, /*$$scope*/ ctx[6], dirty, null, null);
				}
			}
		},
		i(local) {
			if (current) return;
			transition_in(default_slot, local);
			current = true;
		},
		o(local) {
			transition_out(default_slot, local);
			current = false;
		},
		d(detaching) {
			if (default_slot) default_slot.d(detaching);
		}
	};
}

// (83:1) {#if details}
function create_if_block$3(ctx) {
	let p;
	let t_value = /*message*/ ctx[4](/*details*/ ctx[1]) + "";
	let t;
	let mounted;
	let dispose;

	return {
		c() {
			p = element("p");
			t = text(t_value);
			attr(p, "class", "svelte-9488n4");
			toggle_class(p, "navigable", /*details*/ ctx[1].filename);
		},
		m(target, anchor) {
			insert(target, p, anchor);
			append(p, t);

			if (!mounted) {
				dispose = listen(p, "click", /*click_handler*/ ctx[8]);
				mounted = true;
			}
		},
		p(ctx, dirty) {
			if (dirty & /*details*/ 2 && t_value !== (t_value = /*message*/ ctx[4](/*details*/ ctx[1]) + "")) set_data(t, t_value);

			if (dirty & /*details*/ 2) {
				toggle_class(p, "navigable", /*details*/ ctx[1].filename);
			}
		},
		i: noop,
		o: noop,
		d(detaching) {
			if (detaching) detach(p);
			mounted = false;
			dispose();
		}
	};
}

function create_fragment$5(ctx) {
	let div;
	let current_block_type_index;
	let if_block;
	let div_class_value;
	let div_intro;
	let div_outro;
	let current;
	const if_block_creators = [create_if_block$3, create_else_block$2];
	const if_blocks = [];

	function select_block_type(ctx, dirty) {
		if (/*details*/ ctx[1]) return 0;
		return 1;
	}

	current_block_type_index = select_block_type(ctx);
	if_block = if_blocks[current_block_type_index] = if_block_creators[current_block_type_index](ctx);

	return {
		c() {
			div = element("div");
			if_block.c();
			attr(div, "class", div_class_value = "message " + /*kind*/ ctx[0] + " svelte-9488n4");
			toggle_class(div, "truncate", /*truncate*/ ctx[2]);
		},
		m(target, anchor) {
			insert(target, div, anchor);
			if_blocks[current_block_type_index].m(div, null);
			current = true;
		},
		p(ctx, [dirty]) {
			let previous_block_index = current_block_type_index;
			current_block_type_index = select_block_type(ctx);

			if (current_block_type_index === previous_block_index) {
				if_blocks[current_block_type_index].p(ctx, dirty);
			} else {
				group_outros();

				transition_out(if_blocks[previous_block_index], 1, 1, () => {
					if_blocks[previous_block_index] = null;
				});

				check_outros();
				if_block = if_blocks[current_block_type_index];

				if (!if_block) {
					if_block = if_blocks[current_block_type_index] = if_block_creators[current_block_type_index](ctx);
					if_block.c();
				}

				transition_in(if_block, 1);
				if_block.m(div, null);
			}

			if (!current || dirty & /*kind*/ 1 && div_class_value !== (div_class_value = "message " + /*kind*/ ctx[0] + " svelte-9488n4")) {
				attr(div, "class", div_class_value);
			}

			if (dirty & /*kind, truncate*/ 5) {
				toggle_class(div, "truncate", /*truncate*/ ctx[2]);
			}
		},
		i(local) {
			if (current) return;
			transition_in(if_block);

			add_render_callback(() => {
				if (div_outro) div_outro.end(1);
				if (!div_intro) div_intro = create_in_transition(div, slide, { delay: 150, duration: 100 });
				div_intro.start();
			});

			current = true;
		},
		o(local) {
			transition_out(if_block);
			if (div_intro) div_intro.invalidate();
			div_outro = create_out_transition(div, slide, { duration: 100 });
			current = false;
		},
		d(detaching) {
			if (detaching) detach(div);
			if_blocks[current_block_type_index].d();
			if (detaching && div_outro) div_outro.end();
		}
	};
}

function instance$4($$self, $$props, $$invalidate) {
	const { navigate } = getContext("REPL");
	let { kind } = $$props;
	let { details = null } = $$props;
	let { filename = null } = $$props;
	let { truncate } = $$props;

	function message(details) {
		let str = details.message || "[missing message]";
		let loc = [];

		if (details.filename && details.filename !== filename) {
			loc.push(details.filename);
		}

		if (details.start) loc.push(details.start.line, details.start.column);
		return str + (loc.length ? ` (${loc.join(":")})` : ``);
	}

	
	let { $$slots = {}, $$scope } = $$props;
	const click_handler = () => navigate(details);

	$$self.$set = $$props => {
		if ("kind" in $$props) $$invalidate(0, kind = $$props.kind);
		if ("details" in $$props) $$invalidate(1, details = $$props.details);
		if ("filename" in $$props) $$invalidate(5, filename = $$props.filename);
		if ("truncate" in $$props) $$invalidate(2, truncate = $$props.truncate);
		if ("$$scope" in $$props) $$invalidate(6, $$scope = $$props.$$scope);
	};

	return [
		kind,
		details,
		truncate,
		navigate,
		message,
		filename,
		$$scope,
		$$slots,
		click_handler
	];
}

class Message extends SvelteComponent {
	constructor(options) {
		super();
		if (!document.getElementById("svelte-9488n4-style")) add_css$5();

		init(this, options, instance$4, create_fragment$5, safe_not_equal, {
			kind: 0,
			details: 1,
			filename: 5,
			truncate: 2
		});
	}
}

/* node_modules/@sveltejs/svelte-repl/src/CodeMirror.svelte generated by Svelte v3.24.0 */

function add_css$6() {
	var style = element("style");
	style.id = "svelte-s9cc8a-style";
	style.textContent = ".codemirror-container.svelte-s9cc8a.svelte-s9cc8a{position:relative;width:100%;height:100%;border:none;line-height:1.5;overflow:hidden}.codemirror-container.svelte-s9cc8a.svelte-s9cc8a .CodeMirror{height:100%;background:transparent;font:400 14px/1.7 var(--font-mono);color:var(--base)}.codemirror-container.flex.svelte-s9cc8a.svelte-s9cc8a .CodeMirror{height:auto}.codemirror-container.flex.svelte-s9cc8a.svelte-s9cc8a .CodeMirror-lines{padding:0}.codemirror-container.svelte-s9cc8a.svelte-s9cc8a .CodeMirror-gutters{padding:0 16px 0 8px;border:none}.codemirror-container.svelte-s9cc8a.svelte-s9cc8a .error-loc{position:relative;border-bottom:2px solid #da106e}.codemirror-container.svelte-s9cc8a.svelte-s9cc8a .error-line{background-color:rgba(200, 0, 0, .05)}textarea.svelte-s9cc8a.svelte-s9cc8a{visibility:hidden}pre.svelte-s9cc8a.svelte-s9cc8a{position:absolute;width:100%;height:100%;top:0;left:0;border:none;padding:4px 4px 4px 60px;resize:none;font-family:var(--font-mono);font-size:13px;line-height:1.7;user-select:none;pointer-events:none;color:#ccc;tab-size:2;-moz-tab-size:2}.flex.svelte-s9cc8a pre.svelte-s9cc8a{padding:0 0 0 4px;height:auto}";
	append(document.head, style);
}

// (298:1) {#if !CodeMirror}
function create_if_block$4(ctx) {
	let pre;
	let t0;
	let t1;
	let div;
	let message;
	let current;

	message = new Message({
			props: {
				kind: "info",
				$$slots: { default: [create_default_slot] },
				$$scope: { ctx }
			}
		});

	return {
		c() {
			pre = element("pre");
			t0 = text(/*code*/ ctx[3]);
			t1 = space();
			div = element("div");
			create_component(message.$$.fragment);
			set_style(pre, "position", "absolute");
			set_style(pre, "left", "0");
			set_style(pre, "top", "0");
			attr(pre, "class", "svelte-s9cc8a");
			set_style(div, "position", "absolute");
			set_style(div, "width", "100%");
			set_style(div, "bottom", "0");
		},
		m(target, anchor) {
			insert(target, pre, anchor);
			append(pre, t0);
			insert(target, t1, anchor);
			insert(target, div, anchor);
			mount_component(message, div, null);
			current = true;
		},
		p(ctx, dirty) {
			if (!current || dirty & /*code*/ 8) set_data(t0, /*code*/ ctx[3]);
			const message_changes = {};

			if (dirty & /*$$scope*/ 1073741824) {
				message_changes.$$scope = { dirty, ctx };
			}

			message.$set(message_changes);
		},
		i(local) {
			if (current) return;
			transition_in(message.$$.fragment, local);
			current = true;
		},
		o(local) {
			transition_out(message.$$.fragment, local);
			current = false;
		},
		d(detaching) {
			if (detaching) detach(pre);
			if (detaching) detach(t1);
			if (detaching) detach(div);
			destroy_component(message);
		}
	};
}

// (303:3) <Message kind='info'>
function create_default_slot(ctx) {
	let t;

	return {
		c() {
			t = text("loading editor...");
		},
		m(target, anchor) {
			insert(target, t, anchor);
		},
		d(detaching) {
			if (detaching) detach(t);
		}
	};
}

function create_fragment$6(ctx) {
	let div;
	let textarea;
	let t;
	let div_resize_listener;
	let current;
	let if_block = !/*CodeMirror*/ ctx[5] && create_if_block$4(ctx);

	return {
		c() {
			div = element("div");
			textarea = element("textarea");
			t = space();
			if (if_block) if_block.c();
			attr(textarea, "tabindex", "2");
			textarea.readOnly = true;
			textarea.value = /*code*/ ctx[3];
			attr(textarea, "class", "svelte-s9cc8a");
			attr(div, "class", "codemirror-container svelte-s9cc8a");
			add_render_callback(() => /*div_elementresize_handler*/ ctx[18].call(div));
			toggle_class(div, "flex", /*flex*/ ctx[0]);
		},
		m(target, anchor) {
			insert(target, div, anchor);
			append(div, textarea);
			/*textarea_binding*/ ctx[17](textarea);
			append(div, t);
			if (if_block) if_block.m(div, null);
			div_resize_listener = add_resize_listener(div, /*div_elementresize_handler*/ ctx[18].bind(div));
			current = true;
		},
		p(ctx, [dirty]) {
			if (!current || dirty & /*code*/ 8) {
				textarea.value = /*code*/ ctx[3];
			}

			if (!/*CodeMirror*/ ctx[5]) {
				if (if_block) {
					if_block.p(ctx, dirty);

					if (dirty & /*CodeMirror*/ 32) {
						transition_in(if_block, 1);
					}
				} else {
					if_block = create_if_block$4(ctx);
					if_block.c();
					transition_in(if_block, 1);
					if_block.m(div, null);
				}
			} else if (if_block) {
				group_outros();

				transition_out(if_block, 1, 1, () => {
					if_block = null;
				});

				check_outros();
			}

			if (dirty & /*flex*/ 1) {
				toggle_class(div, "flex", /*flex*/ ctx[0]);
			}
		},
		i(local) {
			if (current) return;
			transition_in(if_block);
			current = true;
		},
		o(local) {
			transition_out(if_block);
			current = false;
		},
		d(detaching) {
			if (detaching) detach(div);
			/*textarea_binding*/ ctx[17](null);
			if (if_block) if_block.d();
			div_resize_listener();
		}
	};
}

let codemirror_promise;
let _CodeMirror;

if (is_browser) {
	codemirror_promise = import('./codemirror-c2ba4ab9.js');

	codemirror_promise.then(mod => {
		_CodeMirror = mod.default;
	});
}

function sleep(ms) {
	return new Promise(fulfil => setTimeout(fulfil, ms));
}

function instance$5($$self, $$props, $$invalidate) {
	const dispatch = createEventDispatcher();
	let { readonly = false } = $$props;
	let { errorLoc = null } = $$props;
	let { flex = false } = $$props;
	let { lineNumbers = true } = $$props;
	let { tab = true } = $$props;
	let w;
	let h;
	let code = "";
	let mode;

	async function set(new_code, new_mode) {
		if (new_mode !== mode) {
			await createEditor(mode = new_mode);
		}

		$$invalidate(3, code = new_code);
		updating_externally = true;
		if (editor) editor.setValue(code);
		updating_externally = false;
	}

	function update(new_code) {
		$$invalidate(3, code = new_code);

		if (editor) {
			const { left, top } = editor.getScrollInfo();
			editor.setValue($$invalidate(3, code = new_code));
			editor.scrollTo(left, top);
		}
	}

	function resize() {
		editor.refresh();
	}

	function focus() {
		editor.focus();
	}

	function getHistory() {
		return editor.getHistory();
	}

	function setHistory(history) {
		editor.setHistory(history);
	}

	function clearHistory() {
		if (editor) editor.clearHistory();
	}

	const modes = {
		js: { name: "javascript", json: false },
		json: { name: "javascript", json: true },
		svelte: { name: "handlebars", base: "text/html" },
		md: { name: "markdown" }
	};

	const refs = {};
	let editor;
	let updating_externally = false;
	let marker;
	let error_line;
	let destroyed = false;
	let CodeMirror;
	let previous_error_line;

	onMount(() => {
		(async () => {
			if (!_CodeMirror) {
				let mod = await codemirror_promise;
				$$invalidate(5, CodeMirror = mod.default);
			} else {
				$$invalidate(5, CodeMirror = _CodeMirror);
			}

			await createEditor(mode || "svelte");
			if (editor) editor.setValue(code || "");
		})();

		return () => {
			destroyed = true;
			if (editor) editor.toTextArea();
		};
	});

	let first = true;

	async function createEditor(mode) {
		if (destroyed || !CodeMirror) return;
		if (editor) editor.toTextArea();

		const opts = {
			lineNumbers,
			lineWrapping: true,
			indentWithTabs: true,
			indentUnit: 2,
			tabSize: 2,
			value: "",
			mode: modes[mode] || { name: mode },
			readOnly: readonly,
			autoCloseBrackets: true,
			autoCloseTags: true,
			extraKeys: {
				"Enter": "newlineAndIndentContinueMarkdownList",
				"Ctrl-/": "toggleComment",
				"Cmd-/": "toggleComment",
				"Ctrl-Q"(cm) {
					cm.foldCode(cm.getCursor());
				},
				"Cmd-Q"(cm) {
					cm.foldCode(cm.getCursor());
				}
			},
			foldGutter: true,
			gutters: ["CodeMirror-linenumbers", "CodeMirror-foldgutter"]
		};

		if (!tab) {
			opts.extraKeys["Tab"] = tab;
			opts.extraKeys["Shift-Tab"] = tab;
		}

		// Creating a text editor is a lot of work, so we yield
		// the main thread for a moment. This helps reduce jank
		if (first) await sleep(50);

		if (destroyed) return;
		$$invalidate(20, editor = CodeMirror.fromTextArea(refs.editor, opts));

		editor.on("change", instance => {
			if (!updating_externally) {
				const value = instance.getValue();
				dispatch("change", { value });
			}
		});

		if (first) await sleep(50);
		editor.refresh();
		first = false;
	}

	function textarea_binding($$value) {
		binding_callbacks[$$value ? "unshift" : "push"](() => {
			refs.editor = $$value;
			$$invalidate(4, refs);
		});
	}

	function div_elementresize_handler() {
		w = this.offsetWidth;
		h = this.offsetHeight;
		$$invalidate(1, w);
		$$invalidate(2, h);
	}

	$$self.$set = $$props => {
		if ("readonly" in $$props) $$invalidate(6, readonly = $$props.readonly);
		if ("errorLoc" in $$props) $$invalidate(7, errorLoc = $$props.errorLoc);
		if ("flex" in $$props) $$invalidate(0, flex = $$props.flex);
		if ("lineNumbers" in $$props) $$invalidate(8, lineNumbers = $$props.lineNumbers);
		if ("tab" in $$props) $$invalidate(9, tab = $$props.tab);
	};

	$$self.$$.update = () => {
		if ($$self.$$.dirty & /*editor, w, h*/ 1048582) {
			 if (editor && w && h) {
				editor.refresh();
			}
		}

		if ($$self.$$.dirty & /*marker, errorLoc, editor*/ 5243008) {
			 {
				if (marker) marker.clear();

				if (errorLoc) {
					const line = errorLoc.line - 1;
					const ch = errorLoc.column;
					$$invalidate(22, marker = editor.markText({ line, ch }, { line, ch: ch + 1 }, { className: "error-loc" }));
					$$invalidate(23, error_line = line);
				} else {
					$$invalidate(23, error_line = null);
				}
			}
		}

		if ($$self.$$.dirty & /*editor, previous_error_line, error_line*/ 42991616) {
			 if (editor) {
				if (previous_error_line != null) {
					editor.removeLineClass(previous_error_line, "wrap", "error-line");
				}

				if (error_line && error_line !== previous_error_line) {
					editor.addLineClass(error_line, "wrap", "error-line");
					$$invalidate(25, previous_error_line = error_line);
				}
			}
		}
	};

	return [
		flex,
		w,
		h,
		code,
		refs,
		CodeMirror,
		readonly,
		errorLoc,
		lineNumbers,
		tab,
		set,
		update,
		resize,
		focus,
		getHistory,
		setHistory,
		clearHistory,
		textarea_binding,
		div_elementresize_handler
	];
}

class CodeMirror_1 extends SvelteComponent {
	constructor(options) {
		super();
		if (!document.getElementById("svelte-s9cc8a-style")) add_css$6();

		init(this, options, instance$5, create_fragment$6, safe_not_equal, {
			readonly: 6,
			errorLoc: 7,
			flex: 0,
			lineNumbers: 8,
			tab: 9,
			set: 10,
			update: 11,
			resize: 12,
			focus: 13,
			getHistory: 14,
			setHistory: 15,
			clearHistory: 16
		});
	}

	get set() {
		return this.$$.ctx[10];
	}

	get update() {
		return this.$$.ctx[11];
	}

	get resize() {
		return this.$$.ctx[12];
	}

	get focus() {
		return this.$$.ctx[13];
	}

	get getHistory() {
		return this.$$.ctx[14];
	}

	get setHistory() {
		return this.$$.ctx[15];
	}

	get clearHistory() {
		return this.$$.ctx[16];
	}
}

/* node_modules/@sveltejs/svelte-repl/src/Input/ModuleEditor.svelte generated by Svelte v3.24.0 */

function add_css$7() {
	var style = element("style");
	style.id = "svelte-m7nlxn-style";
	style.textContent = ".editor-wrapper.svelte-m7nlxn{z-index:5;background:var(--back-light);display:flex;flex-direction:column}.editor.svelte-m7nlxn{height:0;flex:1 1 auto}.info.svelte-m7nlxn{background-color:var(--second);max-height:50%;overflow:auto}.columns .editor-wrapper.svelte-m7nlxn{padding-right:8px;height:auto}";
	append(document.head, style);
}

function get_each_context$1(ctx, list, i) {
	const child_ctx = ctx.slice();
	child_ctx[10] = list[i];
	return child_ctx;
}

// (57:2) {#if $bundle}
function create_if_block$5(ctx) {
	let current_block_type_index;
	let if_block;
	let if_block_anchor;
	let current;
	const if_block_creators = [create_if_block_1$3, create_if_block_2$2];
	const if_blocks = [];

	function select_block_type(ctx, dirty) {
		if (/*$bundle*/ ctx[2].error) return 0;
		if (/*$bundle*/ ctx[2].warnings.length > 0) return 1;
		return -1;
	}

	if (~(current_block_type_index = select_block_type(ctx))) {
		if_block = if_blocks[current_block_type_index] = if_block_creators[current_block_type_index](ctx);
	}

	return {
		c() {
			if (if_block) if_block.c();
			if_block_anchor = empty();
		},
		m(target, anchor) {
			if (~current_block_type_index) {
				if_blocks[current_block_type_index].m(target, anchor);
			}

			insert(target, if_block_anchor, anchor);
			current = true;
		},
		p(ctx, dirty) {
			let previous_block_index = current_block_type_index;
			current_block_type_index = select_block_type(ctx);

			if (current_block_type_index === previous_block_index) {
				if (~current_block_type_index) {
					if_blocks[current_block_type_index].p(ctx, dirty);
				}
			} else {
				if (if_block) {
					group_outros();

					transition_out(if_blocks[previous_block_index], 1, 1, () => {
						if_blocks[previous_block_index] = null;
					});

					check_outros();
				}

				if (~current_block_type_index) {
					if_block = if_blocks[current_block_type_index];

					if (!if_block) {
						if_block = if_blocks[current_block_type_index] = if_block_creators[current_block_type_index](ctx);
						if_block.c();
					}

					transition_in(if_block, 1);
					if_block.m(if_block_anchor.parentNode, if_block_anchor);
				} else {
					if_block = null;
				}
			}
		},
		i(local) {
			if (current) return;
			transition_in(if_block);
			current = true;
		},
		o(local) {
			transition_out(if_block);
			current = false;
		},
		d(detaching) {
			if (~current_block_type_index) {
				if_blocks[current_block_type_index].d(detaching);
			}

			if (detaching) detach(if_block_anchor);
		}
	};
}

// (60:41) 
function create_if_block_2$2(ctx) {
	let each_1_anchor;
	let current;
	let each_value = /*$bundle*/ ctx[2].warnings;
	let each_blocks = [];

	for (let i = 0; i < each_value.length; i += 1) {
		each_blocks[i] = create_each_block$1(get_each_context$1(ctx, each_value, i));
	}

	const out = i => transition_out(each_blocks[i], 1, 1, () => {
		each_blocks[i] = null;
	});

	return {
		c() {
			for (let i = 0; i < each_blocks.length; i += 1) {
				each_blocks[i].c();
			}

			each_1_anchor = empty();
		},
		m(target, anchor) {
			for (let i = 0; i < each_blocks.length; i += 1) {
				each_blocks[i].m(target, anchor);
			}

			insert(target, each_1_anchor, anchor);
			current = true;
		},
		p(ctx, dirty) {
			if (dirty & /*$bundle, $selected*/ 12) {
				each_value = /*$bundle*/ ctx[2].warnings;
				let i;

				for (i = 0; i < each_value.length; i += 1) {
					const child_ctx = get_each_context$1(ctx, each_value, i);

					if (each_blocks[i]) {
						each_blocks[i].p(child_ctx, dirty);
						transition_in(each_blocks[i], 1);
					} else {
						each_blocks[i] = create_each_block$1(child_ctx);
						each_blocks[i].c();
						transition_in(each_blocks[i], 1);
						each_blocks[i].m(each_1_anchor.parentNode, each_1_anchor);
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
			destroy_each(each_blocks, detaching);
			if (detaching) detach(each_1_anchor);
		}
	};
}

// (58:3) {#if $bundle.error}
function create_if_block_1$3(ctx) {
	let message;
	let current;

	message = new Message({
			props: {
				kind: "error",
				details: /*$bundle*/ ctx[2].error,
				filename: "" + (/*$selected*/ ctx[3].name + "." + /*$selected*/ ctx[3].type)
			}
		});

	return {
		c() {
			create_component(message.$$.fragment);
		},
		m(target, anchor) {
			mount_component(message, target, anchor);
			current = true;
		},
		p(ctx, dirty) {
			const message_changes = {};
			if (dirty & /*$bundle*/ 4) message_changes.details = /*$bundle*/ ctx[2].error;
			if (dirty & /*$selected*/ 8) message_changes.filename = "" + (/*$selected*/ ctx[3].name + "." + /*$selected*/ ctx[3].type);
			message.$set(message_changes);
		},
		i(local) {
			if (current) return;
			transition_in(message.$$.fragment, local);
			current = true;
		},
		o(local) {
			transition_out(message.$$.fragment, local);
			current = false;
		},
		d(detaching) {
			destroy_component(message, detaching);
		}
	};
}

// (61:4) {#each $bundle.warnings as warning}
function create_each_block$1(ctx) {
	let message;
	let current;

	message = new Message({
			props: {
				kind: "warning",
				details: /*warning*/ ctx[10],
				filename: "" + (/*$selected*/ ctx[3].name + "." + /*$selected*/ ctx[3].type)
			}
		});

	return {
		c() {
			create_component(message.$$.fragment);
		},
		m(target, anchor) {
			mount_component(message, target, anchor);
			current = true;
		},
		p(ctx, dirty) {
			const message_changes = {};
			if (dirty & /*$bundle*/ 4) message_changes.details = /*warning*/ ctx[10];
			if (dirty & /*$selected*/ 8) message_changes.filename = "" + (/*$selected*/ ctx[3].name + "." + /*$selected*/ ctx[3].type);
			message.$set(message_changes);
		},
		i(local) {
			if (current) return;
			transition_in(message.$$.fragment, local);
			current = true;
		},
		o(local) {
			transition_out(message.$$.fragment, local);
			current = false;
		},
		d(detaching) {
			destroy_component(message, detaching);
		}
	};
}

function create_fragment$7(ctx) {
	let div2;
	let div0;
	let codemirror;
	let t;
	let div1;
	let current;
	let codemirror_props = { errorLoc: /*errorLoc*/ ctx[0] };
	codemirror = new CodeMirror_1({ props: codemirror_props });
	/*codemirror_binding*/ ctx[8](codemirror);
	codemirror.$on("change", /*handle_change*/ ctx[6]);
	let if_block = /*$bundle*/ ctx[2] && create_if_block$5(ctx);

	return {
		c() {
			div2 = element("div");
			div0 = element("div");
			create_component(codemirror.$$.fragment);
			t = space();
			div1 = element("div");
			if (if_block) if_block.c();
			attr(div0, "class", "editor notranslate svelte-m7nlxn");
			attr(div0, "translate", "no");
			attr(div1, "class", "info svelte-m7nlxn");
			attr(div2, "class", "editor-wrapper svelte-m7nlxn");
		},
		m(target, anchor) {
			insert(target, div2, anchor);
			append(div2, div0);
			mount_component(codemirror, div0, null);
			append(div2, t);
			append(div2, div1);
			if (if_block) if_block.m(div1, null);
			current = true;
		},
		p(ctx, [dirty]) {
			const codemirror_changes = {};
			if (dirty & /*errorLoc*/ 1) codemirror_changes.errorLoc = /*errorLoc*/ ctx[0];
			codemirror.$set(codemirror_changes);

			if (/*$bundle*/ ctx[2]) {
				if (if_block) {
					if_block.p(ctx, dirty);

					if (dirty & /*$bundle*/ 4) {
						transition_in(if_block, 1);
					}
				} else {
					if_block = create_if_block$5(ctx);
					if_block.c();
					transition_in(if_block, 1);
					if_block.m(div1, null);
				}
			} else if (if_block) {
				group_outros();

				transition_out(if_block, 1, 1, () => {
					if_block = null;
				});

				check_outros();
			}
		},
		i(local) {
			if (current) return;
			transition_in(codemirror.$$.fragment, local);
			transition_in(if_block);
			current = true;
		},
		o(local) {
			transition_out(codemirror.$$.fragment, local);
			transition_out(if_block);
			current = false;
		},
		d(detaching) {
			if (detaching) detach(div2);
			/*codemirror_binding*/ ctx[8](null);
			destroy_component(codemirror);
			if (if_block) if_block.d();
		}
	};
}

function instance$6($$self, $$props, $$invalidate) {
	let $bundle;
	let $selected;
	const { bundle, selected, handle_change, register_module_editor } = getContext("REPL");
	component_subscribe($$self, bundle, value => $$invalidate(2, $bundle = value));
	component_subscribe($$self, selected, value => $$invalidate(3, $selected = value));
	let { errorLoc } = $$props;
	let editor;

	onMount(() => {
		register_module_editor(editor);
	});

	function focus() {
		editor.focus();
	}

	function codemirror_binding($$value) {
		binding_callbacks[$$value ? "unshift" : "push"](() => {
			editor = $$value;
			$$invalidate(1, editor);
		});
	}

	$$self.$set = $$props => {
		if ("errorLoc" in $$props) $$invalidate(0, errorLoc = $$props.errorLoc);
	};

	return [
		errorLoc,
		editor,
		$bundle,
		$selected,
		bundle,
		selected,
		handle_change,
		focus,
		codemirror_binding
	];
}

class ModuleEditor extends SvelteComponent {
	constructor(options) {
		super();
		if (!document.getElementById("svelte-m7nlxn-style")) add_css$7();
		init(this, options, instance$6, create_fragment$7, safe_not_equal, { errorLoc: 0, focus: 7 });
	}

	get focus() {
		return this.$$.ctx[7];
	}
}

var defaults = createCommonjsModule(function (module) {
function getDefaults() {
  return {
    baseUrl: null,
    breaks: false,
    gfm: true,
    headerIds: true,
    headerPrefix: '',
    highlight: null,
    langPrefix: 'language-',
    mangle: true,
    pedantic: false,
    renderer: null,
    sanitize: false,
    sanitizer: null,
    silent: false,
    smartLists: false,
    smartypants: false,
    xhtml: false
  };
}

function changeDefaults(newDefaults) {
  module.exports.defaults = newDefaults;
}

module.exports = {
  defaults: getDefaults(),
  getDefaults,
  changeDefaults
};
});

/**
 * Helpers
 */
const escapeTest = /[&<>"']/;
const escapeReplace = /[&<>"']/g;
const escapeTestNoEncode = /[<>"']|&(?!#?\w+;)/;
const escapeReplaceNoEncode = /[<>"']|&(?!#?\w+;)/g;
const escapeReplacements = {
  '&': '&amp;',
  '<': '&lt;',
  '>': '&gt;',
  '"': '&quot;',
  "'": '&#39;'
};
const getEscapeReplacement = (ch) => escapeReplacements[ch];
function escape(html, encode) {
  if (encode) {
    if (escapeTest.test(html)) {
      return html.replace(escapeReplace, getEscapeReplacement);
    }
  } else {
    if (escapeTestNoEncode.test(html)) {
      return html.replace(escapeReplaceNoEncode, getEscapeReplacement);
    }
  }

  return html;
}

const unescapeTest = /&(#(?:\d+)|(?:#x[0-9A-Fa-f]+)|(?:\w+));?/ig;

function unescape(html) {
  // explicitly match decimal, hex, and named HTML entities
  return html.replace(unescapeTest, (_, n) => {
    n = n.toLowerCase();
    if (n === 'colon') return ':';
    if (n.charAt(0) === '#') {
      return n.charAt(1) === 'x'
        ? String.fromCharCode(parseInt(n.substring(2), 16))
        : String.fromCharCode(+n.substring(1));
    }
    return '';
  });
}

const caret = /(^|[^\[])\^/g;
function edit(regex, opt) {
  regex = regex.source || regex;
  opt = opt || '';
  const obj = {
    replace: (name, val) => {
      val = val.source || val;
      val = val.replace(caret, '$1');
      regex = regex.replace(name, val);
      return obj;
    },
    getRegex: () => {
      return new RegExp(regex, opt);
    }
  };
  return obj;
}

const nonWordAndColonTest = /[^\w:]/g;
const originIndependentUrl = /^$|^[a-z][a-z0-9+.-]*:|^[?#]/i;
function cleanUrl(sanitize, base, href) {
  if (sanitize) {
    let prot;
    try {
      prot = decodeURIComponent(unescape(href))
        .replace(nonWordAndColonTest, '')
        .toLowerCase();
    } catch (e) {
      return null;
    }
    if (prot.indexOf('javascript:') === 0 || prot.indexOf('vbscript:') === 0 || prot.indexOf('data:') === 0) {
      return null;
    }
  }
  if (base && !originIndependentUrl.test(href)) {
    href = resolveUrl(base, href);
  }
  try {
    href = encodeURI(href).replace(/%25/g, '%');
  } catch (e) {
    return null;
  }
  return href;
}

const baseUrls = {};
const justDomain = /^[^:]+:\/*[^/]*$/;
const protocol = /^([^:]+:)[\s\S]*$/;
const domain = /^([^:]+:\/*[^/]*)[\s\S]*$/;

function resolveUrl(base, href) {
  if (!baseUrls[' ' + base]) {
    // we can ignore everything in base after the last slash of its path component,
    // but we might need to add _that_
    // https://tools.ietf.org/html/rfc3986#section-3
    if (justDomain.test(base)) {
      baseUrls[' ' + base] = base + '/';
    } else {
      baseUrls[' ' + base] = rtrim(base, '/', true);
    }
  }
  base = baseUrls[' ' + base];
  const relativeBase = base.indexOf(':') === -1;

  if (href.substring(0, 2) === '//') {
    if (relativeBase) {
      return href;
    }
    return base.replace(protocol, '$1') + href;
  } else if (href.charAt(0) === '/') {
    if (relativeBase) {
      return href;
    }
    return base.replace(domain, '$1') + href;
  } else {
    return base + href;
  }
}

const noopTest = { exec: function noopTest() {} };

function merge(obj) {
  let i = 1,
    target,
    key;

  for (; i < arguments.length; i++) {
    target = arguments[i];
    for (key in target) {
      if (Object.prototype.hasOwnProperty.call(target, key)) {
        obj[key] = target[key];
      }
    }
  }

  return obj;
}

function splitCells(tableRow, count) {
  // ensure that every cell-delimiting pipe has a space
  // before it to distinguish it from an escaped pipe
  const row = tableRow.replace(/\|/g, (match, offset, str) => {
      let escaped = false,
        curr = offset;
      while (--curr >= 0 && str[curr] === '\\') escaped = !escaped;
      if (escaped) {
        // odd number of slashes means | is escaped
        // so we leave it alone
        return '|';
      } else {
        // add space before unescaped |
        return ' |';
      }
    }),
    cells = row.split(/ \|/);
  let i = 0;

  if (cells.length > count) {
    cells.splice(count);
  } else {
    while (cells.length < count) cells.push('');
  }

  for (; i < cells.length; i++) {
    // leading or trailing whitespace is ignored per the gfm spec
    cells[i] = cells[i].trim().replace(/\\\|/g, '|');
  }
  return cells;
}

// Remove trailing 'c's. Equivalent to str.replace(/c*$/, '').
// /c*$/ is vulnerable to REDOS.
// invert: Remove suffix of non-c chars instead. Default falsey.
function rtrim(str, c, invert) {
  const l = str.length;
  if (l === 0) {
    return '';
  }

  // Length of suffix matching the invert condition.
  let suffLen = 0;

  // Step left until we fail to match the invert condition.
  while (suffLen < l) {
    const currChar = str.charAt(l - suffLen - 1);
    if (currChar === c && !invert) {
      suffLen++;
    } else if (currChar !== c && invert) {
      suffLen++;
    } else {
      break;
    }
  }

  return str.substr(0, l - suffLen);
}

function findClosingBracket(str, b) {
  if (str.indexOf(b[1]) === -1) {
    return -1;
  }
  const l = str.length;
  let level = 0,
    i = 0;
  for (; i < l; i++) {
    if (str[i] === '\\') {
      i++;
    } else if (str[i] === b[0]) {
      level++;
    } else if (str[i] === b[1]) {
      level--;
      if (level < 0) {
        return i;
      }
    }
  }
  return -1;
}

function checkSanitizeDeprecation(opt) {
  if (opt && opt.sanitize && !opt.silent) {
    console.warn('marked(): sanitize and sanitizer parameters are deprecated since version 0.7.0, should not be used and will be removed in the future. Read more here: https://marked.js.org/#/USING_ADVANCED.md#options');
  }
}

var helpers = {
  escape,
  unescape,
  edit,
  cleanUrl,
  resolveUrl,
  noopTest,
  merge,
  splitCells,
  rtrim,
  findClosingBracket,
  checkSanitizeDeprecation
};

const {
  noopTest: noopTest$1,
  edit: edit$1,
  merge: merge$1
} = helpers;

/**
 * Block-Level Grammar
 */
const block = {
  newline: /^\n+/,
  code: /^( {4}[^\n]+\n*)+/,
  fences: /^ {0,3}(`{3,}(?=[^`\n]*\n)|~{3,})([^\n]*)\n(?:|([\s\S]*?)\n)(?: {0,3}\1[~`]* *(?:\n+|$)|$)/,
  hr: /^ {0,3}((?:- *){3,}|(?:_ *){3,}|(?:\* *){3,})(?:\n+|$)/,
  heading: /^ {0,3}(#{1,6}) +([^\n]*?)(?: +#+)? *(?:\n+|$)/,
  blockquote: /^( {0,3}> ?(paragraph|[^\n]*)(?:\n|$))+/,
  list: /^( {0,3})(bull) [\s\S]+?(?:hr|def|\n{2,}(?! )(?!\1bull )\n*|\s*$)/,
  html: '^ {0,3}(?:' // optional indentation
    + '<(script|pre|style)[\\s>][\\s\\S]*?(?:</\\1>[^\\n]*\\n+|$)' // (1)
    + '|comment[^\\n]*(\\n+|$)' // (2)
    + '|<\\?[\\s\\S]*?\\?>\\n*' // (3)
    + '|<![A-Z][\\s\\S]*?>\\n*' // (4)
    + '|<!\\[CDATA\\[[\\s\\S]*?\\]\\]>\\n*' // (5)
    + '|</?(tag)(?: +|\\n|/?>)[\\s\\S]*?(?:\\n{2,}|$)' // (6)
    + '|<(?!script|pre|style)([a-z][\\w-]*)(?:attribute)*? */?>(?=[ \\t]*(?:\\n|$))[\\s\\S]*?(?:\\n{2,}|$)' // (7) open tag
    + '|</(?!script|pre|style)[a-z][\\w-]*\\s*>(?=[ \\t]*(?:\\n|$))[\\s\\S]*?(?:\\n{2,}|$)' // (7) closing tag
    + ')',
  def: /^ {0,3}\[(label)\]: *\n? *<?([^\s>]+)>?(?:(?: +\n? *| *\n *)(title))? *(?:\n+|$)/,
  nptable: noopTest$1,
  table: noopTest$1,
  lheading: /^([^\n]+)\n {0,3}(=+|-+) *(?:\n+|$)/,
  // regex template, placeholders will be replaced according to different paragraph
  // interruption rules of commonmark and the original markdown spec:
  _paragraph: /^([^\n]+(?:\n(?!hr|heading|lheading|blockquote|fences|list|html)[^\n]+)*)/,
  text: /^[^\n]+/
};

block._label = /(?!\s*\])(?:\\[\[\]]|[^\[\]])+/;
block._title = /(?:"(?:\\"?|[^"\\])*"|'[^'\n]*(?:\n[^'\n]+)*\n?'|\([^()]*\))/;
block.def = edit$1(block.def)
  .replace('label', block._label)
  .replace('title', block._title)
  .getRegex();

block.bullet = /(?:[*+-]|\d{1,9}\.)/;
block.item = /^( *)(bull) ?[^\n]*(?:\n(?!\1bull ?)[^\n]*)*/;
block.item = edit$1(block.item, 'gm')
  .replace(/bull/g, block.bullet)
  .getRegex();

block.list = edit$1(block.list)
  .replace(/bull/g, block.bullet)
  .replace('hr', '\\n+(?=\\1?(?:(?:- *){3,}|(?:_ *){3,}|(?:\\* *){3,})(?:\\n+|$))')
  .replace('def', '\\n+(?=' + block.def.source + ')')
  .getRegex();

block._tag = 'address|article|aside|base|basefont|blockquote|body|caption'
  + '|center|col|colgroup|dd|details|dialog|dir|div|dl|dt|fieldset|figcaption'
  + '|figure|footer|form|frame|frameset|h[1-6]|head|header|hr|html|iframe'
  + '|legend|li|link|main|menu|menuitem|meta|nav|noframes|ol|optgroup|option'
  + '|p|param|section|source|summary|table|tbody|td|tfoot|th|thead|title|tr'
  + '|track|ul';
block._comment = /<!--(?!-?>)[\s\S]*?-->/;
block.html = edit$1(block.html, 'i')
  .replace('comment', block._comment)
  .replace('tag', block._tag)
  .replace('attribute', / +[a-zA-Z:_][\w.:-]*(?: *= *"[^"\n]*"| *= *'[^'\n]*'| *= *[^\s"'=<>`]+)?/)
  .getRegex();

block.paragraph = edit$1(block._paragraph)
  .replace('hr', block.hr)
  .replace('heading', ' {0,3}#{1,6} ')
  .replace('|lheading', '') // setex headings don't interrupt commonmark paragraphs
  .replace('blockquote', ' {0,3}>')
  .replace('fences', ' {0,3}(?:`{3,}(?=[^`\\n]*\\n)|~{3,})[^\\n]*\\n')
  .replace('list', ' {0,3}(?:[*+-]|1[.)]) ') // only lists starting from 1 can interrupt
  .replace('html', '</?(?:tag)(?: +|\\n|/?>)|<(?:script|pre|style|!--)')
  .replace('tag', block._tag) // pars can be interrupted by type (6) html blocks
  .getRegex();

block.blockquote = edit$1(block.blockquote)
  .replace('paragraph', block.paragraph)
  .getRegex();

/**
 * Normal Block Grammar
 */

block.normal = merge$1({}, block);

/**
 * GFM Block Grammar
 */

block.gfm = merge$1({}, block.normal, {
  nptable: '^ *([^|\\n ].*\\|.*)\\n' // Header
    + ' *([-:]+ *\\|[-| :]*)' // Align
    + '(?:\\n((?:(?!\\n|hr|heading|blockquote|code|fences|list|html).*(?:\\n|$))*)\\n*|$)', // Cells
  table: '^ *\\|(.+)\\n' // Header
    + ' *\\|?( *[-:]+[-| :]*)' // Align
    + '(?:\\n *((?:(?!\\n|hr|heading|blockquote|code|fences|list|html).*(?:\\n|$))*)\\n*|$)' // Cells
});

block.gfm.nptable = edit$1(block.gfm.nptable)
  .replace('hr', block.hr)
  .replace('heading', ' {0,3}#{1,6} ')
  .replace('blockquote', ' {0,3}>')
  .replace('code', ' {4}[^\\n]')
  .replace('fences', ' {0,3}(?:`{3,}(?=[^`\\n]*\\n)|~{3,})[^\\n]*\\n')
  .replace('list', ' {0,3}(?:[*+-]|1[.)]) ') // only lists starting from 1 can interrupt
  .replace('html', '</?(?:tag)(?: +|\\n|/?>)|<(?:script|pre|style|!--)')
  .replace('tag', block._tag) // tables can be interrupted by type (6) html blocks
  .getRegex();

block.gfm.table = edit$1(block.gfm.table)
  .replace('hr', block.hr)
  .replace('heading', ' {0,3}#{1,6} ')
  .replace('blockquote', ' {0,3}>')
  .replace('code', ' {4}[^\\n]')
  .replace('fences', ' {0,3}(?:`{3,}(?=[^`\\n]*\\n)|~{3,})[^\\n]*\\n')
  .replace('list', ' {0,3}(?:[*+-]|1[.)]) ') // only lists starting from 1 can interrupt
  .replace('html', '</?(?:tag)(?: +|\\n|/?>)|<(?:script|pre|style|!--)')
  .replace('tag', block._tag) // tables can be interrupted by type (6) html blocks
  .getRegex();

/**
 * Pedantic grammar (original John Gruber's loose markdown specification)
 */

block.pedantic = merge$1({}, block.normal, {
  html: edit$1(
    '^ *(?:comment *(?:\\n|\\s*$)'
    + '|<(tag)[\\s\\S]+?</\\1> *(?:\\n{2,}|\\s*$)' // closed tag
    + '|<tag(?:"[^"]*"|\'[^\']*\'|\\s[^\'"/>\\s]*)*?/?> *(?:\\n{2,}|\\s*$))')
    .replace('comment', block._comment)
    .replace(/tag/g, '(?!(?:'
      + 'a|em|strong|small|s|cite|q|dfn|abbr|data|time|code|var|samp|kbd|sub'
      + '|sup|i|b|u|mark|ruby|rt|rp|bdi|bdo|span|br|wbr|ins|del|img)'
      + '\\b)\\w+(?!:|[^\\w\\s@]*@)\\b')
    .getRegex(),
  def: /^ *\[([^\]]+)\]: *<?([^\s>]+)>?(?: +(["(][^\n]+[")]))? *(?:\n+|$)/,
  heading: /^ *(#{1,6}) *([^\n]+?) *(?:#+ *)?(?:\n+|$)/,
  fences: noopTest$1, // fences not supported
  paragraph: edit$1(block.normal._paragraph)
    .replace('hr', block.hr)
    .replace('heading', ' *#{1,6} *[^\n]')
    .replace('lheading', block.lheading)
    .replace('blockquote', ' {0,3}>')
    .replace('|fences', '')
    .replace('|list', '')
    .replace('|html', '')
    .getRegex()
});

/**
 * Inline-Level Grammar
 */
const inline = {
  escape: /^\\([!"#$%&'()*+,\-./:;<=>?@\[\]\\^_`{|}~])/,
  autolink: /^<(scheme:[^\s\x00-\x1f<>]*|email)>/,
  url: noopTest$1,
  tag: '^comment'
    + '|^</[a-zA-Z][\\w:-]*\\s*>' // self-closing tag
    + '|^<[a-zA-Z][\\w-]*(?:attribute)*?\\s*/?>' // open tag
    + '|^<\\?[\\s\\S]*?\\?>' // processing instruction, e.g. <?php ?>
    + '|^<![a-zA-Z]+\\s[\\s\\S]*?>' // declaration, e.g. <!DOCTYPE html>
    + '|^<!\\[CDATA\\[[\\s\\S]*?\\]\\]>', // CDATA section
  link: /^!?\[(label)\]\(\s*(href)(?:\s+(title))?\s*\)/,
  reflink: /^!?\[(label)\]\[(?!\s*\])((?:\\[\[\]]?|[^\[\]\\])+)\]/,
  nolink: /^!?\[(?!\s*\])((?:\[[^\[\]]*\]|\\[\[\]]|[^\[\]])*)\](?:\[\])?/,
  strong: /^__([^\s_])__(?!_)|^\*\*([^\s*])\*\*(?!\*)|^__([^\s][\s\S]*?[^\s])__(?!_)|^\*\*([^\s][\s\S]*?[^\s])\*\*(?!\*)/,
  em: /^_([^\s_])_(?!_)|^\*([^\s*<\[])\*(?!\*)|^_([^\s<][\s\S]*?[^\s_])_(?!_|[^\spunctuation])|^_([^\s_<][\s\S]*?[^\s])_(?!_|[^\spunctuation])|^\*([^\s<"][\s\S]*?[^\s\*])\*(?!\*|[^\spunctuation])|^\*([^\s*"<\[][\s\S]*?[^\s])\*(?!\*)/,
  code: /^(`+)([^`]|[^`][\s\S]*?[^`])\1(?!`)/,
  br: /^( {2,}|\\)\n(?!\s*$)/,
  del: noopTest$1,
  text: /^(`+|[^`])(?:[\s\S]*?(?:(?=[\\<!\[`*]|\b_|$)|[^ ](?= {2,}\n))|(?= {2,}\n))/
};

// list of punctuation marks from common mark spec
// without ` and ] to workaround Rule 17 (inline code blocks/links)
inline._punctuation = '!"#$%&\'()*+,\\-./:;<=>?@\\[^_{|}~';
inline.em = edit$1(inline.em).replace(/punctuation/g, inline._punctuation).getRegex();

inline._escapes = /\\([!"#$%&'()*+,\-./:;<=>?@\[\]\\^_`{|}~])/g;

inline._scheme = /[a-zA-Z][a-zA-Z0-9+.-]{1,31}/;
inline._email = /[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+(@)[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)+(?![-_])/;
inline.autolink = edit$1(inline.autolink)
  .replace('scheme', inline._scheme)
  .replace('email', inline._email)
  .getRegex();

inline._attribute = /\s+[a-zA-Z:_][\w.:-]*(?:\s*=\s*"[^"]*"|\s*=\s*'[^']*'|\s*=\s*[^\s"'=<>`]+)?/;

inline.tag = edit$1(inline.tag)
  .replace('comment', block._comment)
  .replace('attribute', inline._attribute)
  .getRegex();

inline._label = /(?:\[[^\[\]]*\]|\\.|`[^`]*`|[^\[\]\\`])*?/;
inline._href = /<(?:\\[<>]?|[^\s<>\\])*>|[^\s\x00-\x1f]*/;
inline._title = /"(?:\\"?|[^"\\])*"|'(?:\\'?|[^'\\])*'|\((?:\\\)?|[^)\\])*\)/;

inline.link = edit$1(inline.link)
  .replace('label', inline._label)
  .replace('href', inline._href)
  .replace('title', inline._title)
  .getRegex();

inline.reflink = edit$1(inline.reflink)
  .replace('label', inline._label)
  .getRegex();

/**
 * Normal Inline Grammar
 */

inline.normal = merge$1({}, inline);

/**
 * Pedantic Inline Grammar
 */

inline.pedantic = merge$1({}, inline.normal, {
  strong: /^__(?=\S)([\s\S]*?\S)__(?!_)|^\*\*(?=\S)([\s\S]*?\S)\*\*(?!\*)/,
  em: /^_(?=\S)([\s\S]*?\S)_(?!_)|^\*(?=\S)([\s\S]*?\S)\*(?!\*)/,
  link: edit$1(/^!?\[(label)\]\((.*?)\)/)
    .replace('label', inline._label)
    .getRegex(),
  reflink: edit$1(/^!?\[(label)\]\s*\[([^\]]*)\]/)
    .replace('label', inline._label)
    .getRegex()
});

/**
 * GFM Inline Grammar
 */

inline.gfm = merge$1({}, inline.normal, {
  escape: edit$1(inline.escape).replace('])', '~|])').getRegex(),
  _extended_email: /[A-Za-z0-9._+-]+(@)[a-zA-Z0-9-_]+(?:\.[a-zA-Z0-9-_]*[a-zA-Z0-9])+(?![-_])/,
  url: /^((?:ftp|https?):\/\/|www\.)(?:[a-zA-Z0-9\-]+\.?)+[^\s<]*|^email/,
  _backpedal: /(?:[^?!.,:;*_~()&]+|\([^)]*\)|&(?![a-zA-Z0-9]+;$)|[?!.,:;*_~)]+(?!$))+/,
  del: /^~+(?=\S)([\s\S]*?\S)~+/,
  text: /^(`+|[^`])(?:[\s\S]*?(?:(?=[\\<!\[`*~]|\b_|https?:\/\/|ftp:\/\/|www\.|$)|[^ ](?= {2,}\n)|[^a-zA-Z0-9.!#$%&'*+\/=?_`{\|}~-](?=[a-zA-Z0-9.!#$%&'*+\/=?_`{\|}~-]+@))|(?= {2,}\n|[a-zA-Z0-9.!#$%&'*+\/=?_`{\|}~-]+@))/
});

inline.gfm.url = edit$1(inline.gfm.url, 'i')
  .replace('email', inline.gfm._extended_email)
  .getRegex();
/**
 * GFM + Line Breaks Inline Grammar
 */

inline.breaks = merge$1({}, inline.gfm, {
  br: edit$1(inline.br).replace('{2,}', '*').getRegex(),
  text: edit$1(inline.gfm.text)
    .replace('\\b_', '\\b_| {2,}\\n')
    .replace(/\{2,\}/g, '*')
    .getRegex()
});

var rules = {
  block,
  inline
};

const { defaults: defaults$1 } = defaults;
const { block: block$1 } = rules;
const {
  rtrim: rtrim$1,
  splitCells: splitCells$1,
  escape: escape$1
} = helpers;

/**
 * Block Lexer
 */
var Lexer_1 = class Lexer {
  constructor(options) {
    this.tokens = [];
    this.tokens.links = Object.create(null);
    this.options = options || defaults$1;
    this.rules = block$1.normal;

    if (this.options.pedantic) {
      this.rules = block$1.pedantic;
    } else if (this.options.gfm) {
      this.rules = block$1.gfm;
    }
  }

  /**
   * Expose Block Rules
   */
  static get rules() {
    return block$1;
  }

  /**
   * Static Lex Method
   */
  static lex(src, options) {
    const lexer = new Lexer(options);
    return lexer.lex(src);
  };

  /**
   * Preprocessing
   */
  lex(src) {
    src = src
      .replace(/\r\n|\r/g, '\n')
      .replace(/\t/g, '    ');

    return this.token(src, true);
  };

  /**
   * Lexing
   */
  token(src, top) {
    src = src.replace(/^ +$/gm, '');
    let next,
      loose,
      cap,
      bull,
      b,
      item,
      listStart,
      listItems,
      t,
      space,
      i,
      tag,
      l,
      isordered,
      istask,
      ischecked;

    while (src) {
      // newline
      if (cap = this.rules.newline.exec(src)) {
        src = src.substring(cap[0].length);
        if (cap[0].length > 1) {
          this.tokens.push({
            type: 'space'
          });
        }
      }

      // code
      if (cap = this.rules.code.exec(src)) {
        const lastToken = this.tokens[this.tokens.length - 1];
        src = src.substring(cap[0].length);
        // An indented code block cannot interrupt a paragraph.
        if (lastToken && lastToken.type === 'paragraph') {
          lastToken.text += '\n' + cap[0].trimRight();
        } else {
          cap = cap[0].replace(/^ {4}/gm, '');
          this.tokens.push({
            type: 'code',
            codeBlockStyle: 'indented',
            text: !this.options.pedantic
              ? rtrim$1(cap, '\n')
              : cap
          });
        }
        continue;
      }

      // fences
      if (cap = this.rules.fences.exec(src)) {
        src = src.substring(cap[0].length);
        this.tokens.push({
          type: 'code',
          lang: cap[2] ? cap[2].trim() : cap[2],
          text: cap[3] || ''
        });
        continue;
      }

      // heading
      if (cap = this.rules.heading.exec(src)) {
        src = src.substring(cap[0].length);
        this.tokens.push({
          type: 'heading',
          depth: cap[1].length,
          text: cap[2]
        });
        continue;
      }

      // table no leading pipe (gfm)
      if (cap = this.rules.nptable.exec(src)) {
        item = {
          type: 'table',
          header: splitCells$1(cap[1].replace(/^ *| *\| *$/g, '')),
          align: cap[2].replace(/^ *|\| *$/g, '').split(/ *\| */),
          cells: cap[3] ? cap[3].replace(/\n$/, '').split('\n') : []
        };

        if (item.header.length === item.align.length) {
          src = src.substring(cap[0].length);

          for (i = 0; i < item.align.length; i++) {
            if (/^ *-+: *$/.test(item.align[i])) {
              item.align[i] = 'right';
            } else if (/^ *:-+: *$/.test(item.align[i])) {
              item.align[i] = 'center';
            } else if (/^ *:-+ *$/.test(item.align[i])) {
              item.align[i] = 'left';
            } else {
              item.align[i] = null;
            }
          }

          for (i = 0; i < item.cells.length; i++) {
            item.cells[i] = splitCells$1(item.cells[i], item.header.length);
          }

          this.tokens.push(item);

          continue;
        }
      }

      // hr
      if (cap = this.rules.hr.exec(src)) {
        src = src.substring(cap[0].length);
        this.tokens.push({
          type: 'hr'
        });
        continue;
      }

      // blockquote
      if (cap = this.rules.blockquote.exec(src)) {
        src = src.substring(cap[0].length);

        this.tokens.push({
          type: 'blockquote_start'
        });

        cap = cap[0].replace(/^ *> ?/gm, '');

        // Pass `top` to keep the current
        // "toplevel" state. This is exactly
        // how markdown.pl works.
        this.token(cap, top);

        this.tokens.push({
          type: 'blockquote_end'
        });

        continue;
      }

      // list
      if (cap = this.rules.list.exec(src)) {
        src = src.substring(cap[0].length);
        bull = cap[2];
        isordered = bull.length > 1;

        listStart = {
          type: 'list_start',
          ordered: isordered,
          start: isordered ? +bull : '',
          loose: false
        };

        this.tokens.push(listStart);

        // Get each top-level item.
        cap = cap[0].match(this.rules.item);

        listItems = [];
        next = false;
        l = cap.length;
        i = 0;

        for (; i < l; i++) {
          item = cap[i];

          // Remove the list item's bullet
          // so it is seen as the next token.
          space = item.length;
          item = item.replace(/^ *([*+-]|\d+\.) */, '');

          // Outdent whatever the
          // list item contains. Hacky.
          if (~item.indexOf('\n ')) {
            space -= item.length;
            item = !this.options.pedantic
              ? item.replace(new RegExp('^ {1,' + space + '}', 'gm'), '')
              : item.replace(/^ {1,4}/gm, '');
          }

          // Determine whether the next list item belongs here.
          // Backpedal if it does not belong in this list.
          if (i !== l - 1) {
            b = block$1.bullet.exec(cap[i + 1])[0];
            if (bull.length > 1 ? b.length === 1
              : (b.length > 1 || (this.options.smartLists && b !== bull))) {
              src = cap.slice(i + 1).join('\n') + src;
              i = l - 1;
            }
          }

          // Determine whether item is loose or not.
          // Use: /(^|\n)(?! )[^\n]+\n\n(?!\s*$)/
          // for discount behavior.
          loose = next || /\n\n(?!\s*$)/.test(item);
          if (i !== l - 1) {
            next = item.charAt(item.length - 1) === '\n';
            if (!loose) loose = next;
          }

          if (loose) {
            listStart.loose = true;
          }

          // Check for task list items
          istask = /^\[[ xX]\] /.test(item);
          ischecked = undefined;
          if (istask) {
            ischecked = item[1] !== ' ';
            item = item.replace(/^\[[ xX]\] +/, '');
          }

          t = {
            type: 'list_item_start',
            task: istask,
            checked: ischecked,
            loose: loose
          };

          listItems.push(t);
          this.tokens.push(t);

          // Recurse.
          this.token(item, false);

          this.tokens.push({
            type: 'list_item_end'
          });
        }

        if (listStart.loose) {
          l = listItems.length;
          i = 0;
          for (; i < l; i++) {
            listItems[i].loose = true;
          }
        }

        this.tokens.push({
          type: 'list_end'
        });

        continue;
      }

      // html
      if (cap = this.rules.html.exec(src)) {
        src = src.substring(cap[0].length);
        this.tokens.push({
          type: this.options.sanitize
            ? 'paragraph'
            : 'html',
          pre: !this.options.sanitizer
            && (cap[1] === 'pre' || cap[1] === 'script' || cap[1] === 'style'),
          text: this.options.sanitize ? (this.options.sanitizer ? this.options.sanitizer(cap[0]) : escape$1(cap[0])) : cap[0]
        });
        continue;
      }

      // def
      if (top && (cap = this.rules.def.exec(src))) {
        src = src.substring(cap[0].length);
        if (cap[3]) cap[3] = cap[3].substring(1, cap[3].length - 1);
        tag = cap[1].toLowerCase().replace(/\s+/g, ' ');
        if (!this.tokens.links[tag]) {
          this.tokens.links[tag] = {
            href: cap[2],
            title: cap[3]
          };
        }
        continue;
      }

      // table (gfm)
      if (cap = this.rules.table.exec(src)) {
        item = {
          type: 'table',
          header: splitCells$1(cap[1].replace(/^ *| *\| *$/g, '')),
          align: cap[2].replace(/^ *|\| *$/g, '').split(/ *\| */),
          cells: cap[3] ? cap[3].replace(/\n$/, '').split('\n') : []
        };

        if (item.header.length === item.align.length) {
          src = src.substring(cap[0].length);

          for (i = 0; i < item.align.length; i++) {
            if (/^ *-+: *$/.test(item.align[i])) {
              item.align[i] = 'right';
            } else if (/^ *:-+: *$/.test(item.align[i])) {
              item.align[i] = 'center';
            } else if (/^ *:-+ *$/.test(item.align[i])) {
              item.align[i] = 'left';
            } else {
              item.align[i] = null;
            }
          }

          for (i = 0; i < item.cells.length; i++) {
            item.cells[i] = splitCells$1(
              item.cells[i].replace(/^ *\| *| *\| *$/g, ''),
              item.header.length);
          }

          this.tokens.push(item);

          continue;
        }
      }

      // lheading
      if (cap = this.rules.lheading.exec(src)) {
        src = src.substring(cap[0].length);
        this.tokens.push({
          type: 'heading',
          depth: cap[2].charAt(0) === '=' ? 1 : 2,
          text: cap[1]
        });
        continue;
      }

      // top-level paragraph
      if (top && (cap = this.rules.paragraph.exec(src))) {
        src = src.substring(cap[0].length);
        this.tokens.push({
          type: 'paragraph',
          text: cap[1].charAt(cap[1].length - 1) === '\n'
            ? cap[1].slice(0, -1)
            : cap[1]
        });
        continue;
      }

      // text
      if (cap = this.rules.text.exec(src)) {
        // Top-level should never reach here.
        src = src.substring(cap[0].length);
        this.tokens.push({
          type: 'text',
          text: cap[0]
        });
        continue;
      }

      if (src) {
        throw new Error('Infinite loop on byte: ' + src.charCodeAt(0));
      }
    }

    return this.tokens;
  };
};

const { defaults: defaults$2 } = defaults;
const {
  cleanUrl: cleanUrl$1,
  escape: escape$2
} = helpers;

/**
 * Renderer
 */
var Renderer_1 = class Renderer {
  constructor(options) {
    this.options = options || defaults$2;
  }

  code(code, infostring, escaped) {
    const lang = (infostring || '').match(/\S*/)[0];
    if (this.options.highlight) {
      const out = this.options.highlight(code, lang);
      if (out != null && out !== code) {
        escaped = true;
        code = out;
      }
    }

    if (!lang) {
      return '<pre><code>'
        + (escaped ? code : escape$2(code, true))
        + '</code></pre>';
    }

    return '<pre><code class="'
      + this.options.langPrefix
      + escape$2(lang, true)
      + '">'
      + (escaped ? code : escape$2(code, true))
      + '</code></pre>\n';
  };

  blockquote(quote) {
    return '<blockquote>\n' + quote + '</blockquote>\n';
  };

  html(html) {
    return html;
  };

  heading(text, level, raw, slugger) {
    if (this.options.headerIds) {
      return '<h'
        + level
        + ' id="'
        + this.options.headerPrefix
        + slugger.slug(raw)
        + '">'
        + text
        + '</h'
        + level
        + '>\n';
    }
    // ignore IDs
    return '<h' + level + '>' + text + '</h' + level + '>\n';
  };

  hr() {
    return this.options.xhtml ? '<hr/>\n' : '<hr>\n';
  };

  list(body, ordered, start) {
    const type = ordered ? 'ol' : 'ul',
      startatt = (ordered && start !== 1) ? (' start="' + start + '"') : '';
    return '<' + type + startatt + '>\n' + body + '</' + type + '>\n';
  };

  listitem(text) {
    return '<li>' + text + '</li>\n';
  };

  checkbox(checked) {
    return '<input '
      + (checked ? 'checked="" ' : '')
      + 'disabled="" type="checkbox"'
      + (this.options.xhtml ? ' /' : '')
      + '> ';
  };

  paragraph(text) {
    return '<p>' + text + '</p>\n';
  };

  table(header, body) {
    if (body) body = '<tbody>' + body + '</tbody>';

    return '<table>\n'
      + '<thead>\n'
      + header
      + '</thead>\n'
      + body
      + '</table>\n';
  };

  tablerow(content) {
    return '<tr>\n' + content + '</tr>\n';
  };

  tablecell(content, flags) {
    const type = flags.header ? 'th' : 'td';
    const tag = flags.align
      ? '<' + type + ' align="' + flags.align + '">'
      : '<' + type + '>';
    return tag + content + '</' + type + '>\n';
  };

  // span level renderer
  strong(text) {
    return '<strong>' + text + '</strong>';
  };

  em(text) {
    return '<em>' + text + '</em>';
  };

  codespan(text) {
    return '<code>' + text + '</code>';
  };

  br() {
    return this.options.xhtml ? '<br/>' : '<br>';
  };

  del(text) {
    return '<del>' + text + '</del>';
  };

  link(href, title, text) {
    href = cleanUrl$1(this.options.sanitize, this.options.baseUrl, href);
    if (href === null) {
      return text;
    }
    let out = '<a href="' + escape$2(href) + '"';
    if (title) {
      out += ' title="' + title + '"';
    }
    out += '>' + text + '</a>';
    return out;
  };

  image(href, title, text) {
    href = cleanUrl$1(this.options.sanitize, this.options.baseUrl, href);
    if (href === null) {
      return text;
    }

    let out = '<img src="' + href + '" alt="' + text + '"';
    if (title) {
      out += ' title="' + title + '"';
    }
    out += this.options.xhtml ? '/>' : '>';
    return out;
  };

  text(text) {
    return text;
  };
};

/**
 * Slugger generates header id
 */
var Slugger_1 = class Slugger {
  constructor() {
    this.seen = {};
  }

  /**
   * Convert string to unique id
   */
  slug(value) {
    let slug = value
      .toLowerCase()
      .trim()
      // remove html tags
      .replace(/<[!\/a-z].*?>/ig, '')
      // remove unwanted chars
      .replace(/[\u2000-\u206F\u2E00-\u2E7F\\'!"#$%&()*+,./:;<=>?@[\]^`{|}~]/g, '')
      .replace(/\s/g, '-');

    if (this.seen.hasOwnProperty(slug)) {
      const originalSlug = slug;
      do {
        this.seen[originalSlug]++;
        slug = originalSlug + '-' + this.seen[originalSlug];
      } while (this.seen.hasOwnProperty(slug));
    }
    this.seen[slug] = 0;

    return slug;
  };
};

const { defaults: defaults$3 } = defaults;
const { inline: inline$1 } = rules;
const {
  findClosingBracket: findClosingBracket$1,
  escape: escape$3
} = helpers;

/**
 * Inline Lexer & Compiler
 */
var InlineLexer_1 = class InlineLexer {
  constructor(links, options) {
    this.options = options || defaults$3;
    this.links = links;
    this.rules = inline$1.normal;
    this.options.renderer = this.options.renderer || new Renderer_1();
    this.renderer = this.options.renderer;
    this.renderer.options = this.options;

    if (!this.links) {
      throw new Error('Tokens array requires a `links` property.');
    }

    if (this.options.pedantic) {
      this.rules = inline$1.pedantic;
    } else if (this.options.gfm) {
      if (this.options.breaks) {
        this.rules = inline$1.breaks;
      } else {
        this.rules = inline$1.gfm;
      }
    }
  }

  /**
   * Expose Inline Rules
   */
  static get rules() {
    return inline$1;
  }

  /**
   * Static Lexing/Compiling Method
   */
  static output(src, links, options) {
    const inline = new InlineLexer(links, options);
    return inline.output(src);
  }

  /**
   * Lexing/Compiling
   */
  output(src) {
    let out = '',
      link,
      text,
      href,
      title,
      cap,
      prevCapZero;

    while (src) {
      // escape
      if (cap = this.rules.escape.exec(src)) {
        src = src.substring(cap[0].length);
        out += escape$3(cap[1]);
        continue;
      }

      // tag
      if (cap = this.rules.tag.exec(src)) {
        if (!this.inLink && /^<a /i.test(cap[0])) {
          this.inLink = true;
        } else if (this.inLink && /^<\/a>/i.test(cap[0])) {
          this.inLink = false;
        }
        if (!this.inRawBlock && /^<(pre|code|kbd|script)(\s|>)/i.test(cap[0])) {
          this.inRawBlock = true;
        } else if (this.inRawBlock && /^<\/(pre|code|kbd|script)(\s|>)/i.test(cap[0])) {
          this.inRawBlock = false;
        }

        src = src.substring(cap[0].length);
        out += this.renderer.html(this.options.sanitize
          ? (this.options.sanitizer
            ? this.options.sanitizer(cap[0])
            : escape$3(cap[0]))
          : cap[0]);
        continue;
      }

      // link
      if (cap = this.rules.link.exec(src)) {
        const lastParenIndex = findClosingBracket$1(cap[2], '()');
        if (lastParenIndex > -1) {
          const start = cap[0].indexOf('!') === 0 ? 5 : 4;
          const linkLen = start + cap[1].length + lastParenIndex;
          cap[2] = cap[2].substring(0, lastParenIndex);
          cap[0] = cap[0].substring(0, linkLen).trim();
          cap[3] = '';
        }
        src = src.substring(cap[0].length);
        this.inLink = true;
        href = cap[2];
        if (this.options.pedantic) {
          link = /^([^'"]*[^\s])\s+(['"])(.*)\2/.exec(href);

          if (link) {
            href = link[1];
            title = link[3];
          } else {
            title = '';
          }
        } else {
          title = cap[3] ? cap[3].slice(1, -1) : '';
        }
        href = href.trim().replace(/^<([\s\S]*)>$/, '$1');
        out += this.outputLink(cap, {
          href: InlineLexer.escapes(href),
          title: InlineLexer.escapes(title)
        });
        this.inLink = false;
        continue;
      }

      // reflink, nolink
      if ((cap = this.rules.reflink.exec(src))
          || (cap = this.rules.nolink.exec(src))) {
        src = src.substring(cap[0].length);
        link = (cap[2] || cap[1]).replace(/\s+/g, ' ');
        link = this.links[link.toLowerCase()];
        if (!link || !link.href) {
          out += cap[0].charAt(0);
          src = cap[0].substring(1) + src;
          continue;
        }
        this.inLink = true;
        out += this.outputLink(cap, link);
        this.inLink = false;
        continue;
      }

      // strong
      if (cap = this.rules.strong.exec(src)) {
        src = src.substring(cap[0].length);
        out += this.renderer.strong(this.output(cap[4] || cap[3] || cap[2] || cap[1]));
        continue;
      }

      // em
      if (cap = this.rules.em.exec(src)) {
        src = src.substring(cap[0].length);
        out += this.renderer.em(this.output(cap[6] || cap[5] || cap[4] || cap[3] || cap[2] || cap[1]));
        continue;
      }

      // code
      if (cap = this.rules.code.exec(src)) {
        src = src.substring(cap[0].length);
        out += this.renderer.codespan(escape$3(cap[2].trim(), true));
        continue;
      }

      // br
      if (cap = this.rules.br.exec(src)) {
        src = src.substring(cap[0].length);
        out += this.renderer.br();
        continue;
      }

      // del (gfm)
      if (cap = this.rules.del.exec(src)) {
        src = src.substring(cap[0].length);
        out += this.renderer.del(this.output(cap[1]));
        continue;
      }

      // autolink
      if (cap = this.rules.autolink.exec(src)) {
        src = src.substring(cap[0].length);
        if (cap[2] === '@') {
          text = escape$3(this.mangle(cap[1]));
          href = 'mailto:' + text;
        } else {
          text = escape$3(cap[1]);
          href = text;
        }
        out += this.renderer.link(href, null, text);
        continue;
      }

      // url (gfm)
      if (!this.inLink && (cap = this.rules.url.exec(src))) {
        if (cap[2] === '@') {
          text = escape$3(cap[0]);
          href = 'mailto:' + text;
        } else {
          // do extended autolink path validation
          do {
            prevCapZero = cap[0];
            cap[0] = this.rules._backpedal.exec(cap[0])[0];
          } while (prevCapZero !== cap[0]);
          text = escape$3(cap[0]);
          if (cap[1] === 'www.') {
            href = 'http://' + text;
          } else {
            href = text;
          }
        }
        src = src.substring(cap[0].length);
        out += this.renderer.link(href, null, text);
        continue;
      }

      // text
      if (cap = this.rules.text.exec(src)) {
        src = src.substring(cap[0].length);
        if (this.inRawBlock) {
          out += this.renderer.text(this.options.sanitize ? (this.options.sanitizer ? this.options.sanitizer(cap[0]) : escape$3(cap[0])) : cap[0]);
        } else {
          out += this.renderer.text(escape$3(this.smartypants(cap[0])));
        }
        continue;
      }

      if (src) {
        throw new Error('Infinite loop on byte: ' + src.charCodeAt(0));
      }
    }

    return out;
  }

  static escapes(text) {
    return text ? text.replace(InlineLexer.rules._escapes, '$1') : text;
  }

  /**
   * Compile Link
   */
  outputLink(cap, link) {
    const href = link.href,
      title = link.title ? escape$3(link.title) : null;

    return cap[0].charAt(0) !== '!'
      ? this.renderer.link(href, title, this.output(cap[1]))
      : this.renderer.image(href, title, escape$3(cap[1]));
  }

  /**
   * Smartypants Transformations
   */
  smartypants(text) {
    if (!this.options.smartypants) return text;
    return text
      // em-dashes
      .replace(/---/g, '\u2014')
      // en-dashes
      .replace(/--/g, '\u2013')
      // opening singles
      .replace(/(^|[-\u2014/(\[{"\s])'/g, '$1\u2018')
      // closing singles & apostrophes
      .replace(/'/g, '\u2019')
      // opening doubles
      .replace(/(^|[-\u2014/(\[{\u2018\s])"/g, '$1\u201c')
      // closing doubles
      .replace(/"/g, '\u201d')
      // ellipses
      .replace(/\.{3}/g, '\u2026');
  }

  /**
   * Mangle Links
   */
  mangle(text) {
    if (!this.options.mangle) return text;
    const l = text.length;
    let out = '',
      i = 0,
      ch;

    for (; i < l; i++) {
      ch = text.charCodeAt(i);
      if (Math.random() > 0.5) {
        ch = 'x' + ch.toString(16);
      }
      out += '&#' + ch + ';';
    }

    return out;
  }
};

/**
 * TextRenderer
 * returns only the textual part of the token
 */
var TextRenderer_1 = class TextRenderer {
  // no need for block level renderers
  strong(text) {
    return text;
  }

  em(text) {
    return text;
  }

  codespan(text) {
    return text;
  }

  del(text) {
    return text;
  }

  html(text) {
    return text;
  }

  text(text) {
    return text;
  }

  link(href, title, text) {
    return '' + text;
  }

  image(href, title, text) {
    return '' + text;
  }

  br() {
    return '';
  }
};

const { defaults: defaults$4 } = defaults;
const {
  merge: merge$2,
  unescape: unescape$1
} = helpers;

/**
 * Parsing & Compiling
 */
var Parser_1 = class Parser {
  constructor(options) {
    this.tokens = [];
    this.token = null;
    this.options = options || defaults$4;
    this.options.renderer = this.options.renderer || new Renderer_1();
    this.renderer = this.options.renderer;
    this.renderer.options = this.options;
    this.slugger = new Slugger_1();
  }

  /**
   * Static Parse Method
   */
  static parse(tokens, options) {
    const parser = new Parser(options);
    return parser.parse(tokens);
  };

  /**
   * Parse Loop
   */
  parse(tokens) {
    this.inline = new InlineLexer_1(tokens.links, this.options);
    // use an InlineLexer with a TextRenderer to extract pure text
    this.inlineText = new InlineLexer_1(
      tokens.links,
      merge$2({}, this.options, { renderer: new TextRenderer_1() })
    );
    this.tokens = tokens.reverse();

    let out = '';
    while (this.next()) {
      out += this.tok();
    }

    return out;
  };

  /**
   * Next Token
   */
  next() {
    this.token = this.tokens.pop();
    return this.token;
  };

  /**
   * Preview Next Token
   */
  peek() {
    return this.tokens[this.tokens.length - 1] || 0;
  };

  /**
   * Parse Text Tokens
   */
  parseText() {
    let body = this.token.text;

    while (this.peek().type === 'text') {
      body += '\n' + this.next().text;
    }

    return this.inline.output(body);
  };

  /**
   * Parse Current Token
   */
  tok() {
    let body = '';
    switch (this.token.type) {
      case 'space': {
        return '';
      }
      case 'hr': {
        return this.renderer.hr();
      }
      case 'heading': {
        return this.renderer.heading(
          this.inline.output(this.token.text),
          this.token.depth,
          unescape$1(this.inlineText.output(this.token.text)),
          this.slugger);
      }
      case 'code': {
        return this.renderer.code(this.token.text,
          this.token.lang,
          this.token.escaped);
      }
      case 'table': {
        let header = '',
          i,
          row,
          cell,
          j;

        // header
        cell = '';
        for (i = 0; i < this.token.header.length; i++) {
          cell += this.renderer.tablecell(
            this.inline.output(this.token.header[i]),
            { header: true, align: this.token.align[i] }
          );
        }
        header += this.renderer.tablerow(cell);

        for (i = 0; i < this.token.cells.length; i++) {
          row = this.token.cells[i];

          cell = '';
          for (j = 0; j < row.length; j++) {
            cell += this.renderer.tablecell(
              this.inline.output(row[j]),
              { header: false, align: this.token.align[j] }
            );
          }

          body += this.renderer.tablerow(cell);
        }
        return this.renderer.table(header, body);
      }
      case 'blockquote_start': {
        body = '';

        while (this.next().type !== 'blockquote_end') {
          body += this.tok();
        }

        return this.renderer.blockquote(body);
      }
      case 'list_start': {
        body = '';
        const ordered = this.token.ordered,
          start = this.token.start;

        while (this.next().type !== 'list_end') {
          body += this.tok();
        }

        return this.renderer.list(body, ordered, start);
      }
      case 'list_item_start': {
        body = '';
        const loose = this.token.loose;
        const checked = this.token.checked;
        const task = this.token.task;

        if (this.token.task) {
          if (loose) {
            if (this.peek().type === 'text') {
              const nextToken = this.peek();
              nextToken.text = this.renderer.checkbox(checked) + ' ' + nextToken.text;
            } else {
              this.tokens.push({
                type: 'text',
                text: this.renderer.checkbox(checked)
              });
            }
          } else {
            body += this.renderer.checkbox(checked);
          }
        }

        while (this.next().type !== 'list_item_end') {
          body += !loose && this.token.type === 'text'
            ? this.parseText()
            : this.tok();
        }
        return this.renderer.listitem(body, task, checked);
      }
      case 'html': {
        // TODO parse inline content if parameter markdown=1
        return this.renderer.html(this.token.text);
      }
      case 'paragraph': {
        return this.renderer.paragraph(this.inline.output(this.token.text));
      }
      case 'text': {
        return this.renderer.paragraph(this.parseText());
      }
      default: {
        const errMsg = 'Token with "' + this.token.type + '" type was not found.';
        if (this.options.silent) {
          console.log(errMsg);
        } else {
          throw new Error(errMsg);
        }
      }
    }
  };
};

const {
  merge: merge$3,
  checkSanitizeDeprecation: checkSanitizeDeprecation$1,
  escape: escape$4
} = helpers;
const {
  getDefaults,
  changeDefaults,
  defaults: defaults$5
} = defaults;

/**
 * Marked
 */
function marked(src, opt, callback) {
  // throw error in case of non string input
  if (typeof src === 'undefined' || src === null) {
    throw new Error('marked(): input parameter is undefined or null');
  }
  if (typeof src !== 'string') {
    throw new Error('marked(): input parameter is of type '
      + Object.prototype.toString.call(src) + ', string expected');
  }

  if (callback || typeof opt === 'function') {
    if (!callback) {
      callback = opt;
      opt = null;
    }

    opt = merge$3({}, marked.defaults, opt || {});
    checkSanitizeDeprecation$1(opt);
    const highlight = opt.highlight;
    let tokens,
      pending,
      i = 0;

    try {
      tokens = Lexer_1.lex(src, opt);
    } catch (e) {
      return callback(e);
    }

    pending = tokens.length;

    const done = function(err) {
      if (err) {
        opt.highlight = highlight;
        return callback(err);
      }

      let out;

      try {
        out = Parser_1.parse(tokens, opt);
      } catch (e) {
        err = e;
      }

      opt.highlight = highlight;

      return err
        ? callback(err)
        : callback(null, out);
    };

    if (!highlight || highlight.length < 3) {
      return done();
    }

    delete opt.highlight;

    if (!pending) return done();

    for (; i < tokens.length; i++) {
      (function(token) {
        if (token.type !== 'code') {
          return --pending || done();
        }
        return highlight(token.text, token.lang, function(err, code) {
          if (err) return done(err);
          if (code == null || code === token.text) {
            return --pending || done();
          }
          token.text = code;
          token.escaped = true;
          --pending || done();
        });
      })(tokens[i]);
    }

    return;
  }
  try {
    opt = merge$3({}, marked.defaults, opt || {});
    checkSanitizeDeprecation$1(opt);
    return Parser_1.parse(Lexer_1.lex(src, opt), opt);
  } catch (e) {
    e.message += '\nPlease report this to https://github.com/markedjs/marked.';
    if ((opt || marked.defaults).silent) {
      return '<p>An error occurred:</p><pre>'
        + escape$4(e.message + '', true)
        + '</pre>';
    }
    throw e;
  }
}

/**
 * Options
 */

marked.options =
marked.setOptions = function(opt) {
  merge$3(marked.defaults, opt);
  changeDefaults(marked.defaults);
  return marked;
};

marked.getDefaults = getDefaults;

marked.defaults = defaults$5;

/**
 * Expose
 */

marked.Parser = Parser_1;
marked.parser = Parser_1.parse;

marked.Renderer = Renderer_1;
marked.TextRenderer = TextRenderer_1;

marked.Lexer = Lexer_1;
marked.lexer = Lexer_1.lex;

marked.InlineLexer = InlineLexer_1;
marked.inlineLexer = InlineLexer_1.output;

marked.Slugger = Slugger_1;

marked.parse = marked;

var marked_1 = marked;

var charToInteger = {};
var chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/=';
for (var i = 0; i < chars.length; i++) {
    charToInteger[chars.charCodeAt(i)] = i;
}
function decode(mappings) {
    var decoded = [];
    var line = [];
    var segment = [
        0,
        0,
        0,
        0,
        0,
    ];
    var j = 0;
    for (var i = 0, shift = 0, value = 0; i < mappings.length; i++) {
        var c = mappings.charCodeAt(i);
        if (c === 44) { // ","
            segmentify(line, segment, j);
            j = 0;
        }
        else if (c === 59) { // ";"
            segmentify(line, segment, j);
            j = 0;
            decoded.push(line);
            line = [];
            segment[0] = 0;
        }
        else {
            var integer = charToInteger[c];
            if (integer === undefined) {
                throw new Error('Invalid character (' + String.fromCharCode(c) + ')');
            }
            var hasContinuationBit = integer & 32;
            integer &= 31;
            value += integer << shift;
            if (hasContinuationBit) {
                shift += 5;
            }
            else {
                var shouldNegate = value & 1;
                value >>>= 1;
                if (shouldNegate) {
                    value = value === 0 ? -0x80000000 : -value;
                }
                segment[j] += value;
                j++;
                value = shift = 0; // reset
            }
        }
    }
    segmentify(line, segment, j);
    decoded.push(line);
    return decoded;
}
function segmentify(line, segment, j) {
    // This looks ugly, but we're creating specialized arrays with a specific
    // length. This is much faster than creating a new array (which v8 expands to
    // a capacity of 17 after pushing the first item), or slicing out a subarray
    // (which is slow). Length 4 is assumed to be the most frequent, followed by
    // length 5 (since not everything will have an associated name), followed by
    // length 1 (it's probably rare for a source substring to not have an
    // associated segment data).
    if (j === 4)
        line.push([segment[0], segment[1], segment[2], segment[3]]);
    else if (j === 5)
        line.push([segment[0], segment[1], segment[2], segment[3], segment[4]]);
    else if (j === 1)
        line.push([segment[0]]);
}

function getLocationFromStack(stack, map) {
	if (!stack) return;
	const last = stack.split('\n')[1];
	const match = /<anonymous>:(\d+):(\d+)\)$/.exec(last);

	if (!match) return null;

	const line = +match[1];
	const column = +match[2];

	return trace({ line, column }, map);
}

function trace(loc, map) {
	const mappings = decode(map.mappings);
	const segments = mappings[loc.line - 1];

	for (let i = 0; i < segments.length; i += 1) {
		const segment = segments[i];
		if (segment[0] === loc.column) {
			const [, sourceIndex, line, column] = segment;
			const source = map.sources[sourceIndex].slice(2);

			return { source, line: line + 1, column };
		}
	}

	return null;
}

function is_date(obj) {
    return Object.prototype.toString.call(obj) === '[object Date]';
}

function tick_spring(ctx, last_value, current_value, target_value) {
    if (typeof current_value === 'number' || is_date(current_value)) {
        // @ts-ignore
        const delta = target_value - current_value;
        // @ts-ignore
        const velocity = (current_value - last_value) / (ctx.dt || 1 / 60); // guard div by 0
        const spring = ctx.opts.stiffness * delta;
        const damper = ctx.opts.damping * velocity;
        const acceleration = (spring - damper) * ctx.inv_mass;
        const d = (velocity + acceleration) * ctx.dt;
        if (Math.abs(d) < ctx.opts.precision && Math.abs(delta) < ctx.opts.precision) {
            return target_value; // settled
        }
        else {
            ctx.settled = false; // signal loop to keep ticking
            // @ts-ignore
            return is_date(current_value) ?
                new Date(current_value.getTime() + d) : current_value + d;
        }
    }
    else if (Array.isArray(current_value)) {
        // @ts-ignore
        return current_value.map((_, i) => tick_spring(ctx, last_value[i], current_value[i], target_value[i]));
    }
    else if (typeof current_value === 'object') {
        const next_value = {};
        for (const k in current_value)
            // @ts-ignore
            next_value[k] = tick_spring(ctx, last_value[k], current_value[k], target_value[k]);
        // @ts-ignore
        return next_value;
    }
    else {
        throw new Error(`Cannot spring ${typeof current_value} values`);
    }
}
function spring(value, opts = {}) {
    const store = writable(value);
    const { stiffness = 0.15, damping = 0.8, precision = 0.01 } = opts;
    let last_time;
    let task;
    let current_token;
    let last_value = value;
    let target_value = value;
    let inv_mass = 1;
    let inv_mass_recovery_rate = 0;
    let cancel_task = false;
    function set(new_value, opts = {}) {
        target_value = new_value;
        const token = current_token = {};
        if (value == null || opts.hard || (spring.stiffness >= 1 && spring.damping >= 1)) {
            cancel_task = true; // cancel any running animation
            last_time = now();
            last_value = new_value;
            store.set(value = target_value);
            return Promise.resolve();
        }
        else if (opts.soft) {
            const rate = opts.soft === true ? .5 : +opts.soft;
            inv_mass_recovery_rate = 1 / (rate * 60);
            inv_mass = 0; // infinite mass, unaffected by spring forces
        }
        if (!task) {
            last_time = now();
            cancel_task = false;
            task = loop(now => {
                if (cancel_task) {
                    cancel_task = false;
                    task = null;
                    return false;
                }
                inv_mass = Math.min(inv_mass + inv_mass_recovery_rate, 1);
                const ctx = {
                    inv_mass,
                    opts: spring,
                    settled: true,
                    dt: (now - last_time) * 60 / 1000
                };
                const next_value = tick_spring(ctx, last_value, value, target_value);
                last_time = now;
                last_value = value;
                store.set(value = next_value);
                if (ctx.settled)
                    task = null;
                return !ctx.settled;
            });
        }
        return new Promise(fulfil => {
            task.promise.then(() => {
                if (token === current_token)
                    fulfil();
            });
        });
    }
    const spring = {
        set,
        update: (fn, opts) => set(fn(target_value, value), opts),
        subscribe: store.subscribe,
        stiffness,
        damping,
        precision
    };
    return spring;
}

/* node_modules/@sveltejs/svelte-repl/src/Output/PaneWithPanel.svelte generated by Svelte v3.24.0 */

function add_css$8() {
	var style = element("style");
	style.id = "svelte-160vuma-style";
	style.textContent = ".panel-header.svelte-160vuma{height:42px;display:flex;justify-content:space-between;align-items:center;padding:0 0.5em;cursor:pointer}.panel-body.svelte-160vuma{overflow:auto}h3.svelte-160vuma{font:700 12px/1.5 var(--font);color:#333}section.svelte-160vuma{overflow:hidden}";
	append(document.head, style);
}

const get_panel_body_slot_changes = dirty => ({});
const get_panel_body_slot_context = ctx => ({});
const get_panel_header_slot_changes = dirty => ({});
const get_panel_header_slot_context = ctx => ({});
const get_main_slot_changes = dirty => ({});
const get_main_slot_context = ctx => ({});

// (29:1) <section slot="a">
function create_a_slot(ctx) {
	let section;
	let current;
	const main_slot_template = /*$$slots*/ ctx[5].main;
	const main_slot = create_slot(main_slot_template, ctx, /*$$scope*/ ctx[8], get_main_slot_context);

	return {
		c() {
			section = element("section");
			if (main_slot) main_slot.c();
			attr(section, "slot", "a");
			attr(section, "class", "svelte-160vuma");
		},
		m(target, anchor) {
			insert(target, section, anchor);

			if (main_slot) {
				main_slot.m(section, null);
			}

			current = true;
		},
		p(ctx, dirty) {
			if (main_slot) {
				if (main_slot.p && dirty & /*$$scope*/ 256) {
					update_slot(main_slot, main_slot_template, ctx, /*$$scope*/ ctx[8], dirty, get_main_slot_changes, get_main_slot_context);
				}
			}
		},
		i(local) {
			if (current) return;
			transition_in(main_slot, local);
			current = true;
		},
		o(local) {
			transition_out(main_slot, local);
			current = false;
		},
		d(detaching) {
			if (detaching) detach(section);
			if (main_slot) main_slot.d(detaching);
		}
	};
}

// (33:1) <section slot="b">
function create_b_slot(ctx) {
	let section;
	let div0;
	let h3;
	let t0;
	let t1;
	let t2;
	let div1;
	let current;
	let mounted;
	let dispose;
	const panel_header_slot_template = /*$$slots*/ ctx[5]["panel-header"];
	const panel_header_slot = create_slot(panel_header_slot_template, ctx, /*$$scope*/ ctx[8], get_panel_header_slot_context);
	const panel_body_slot_template = /*$$slots*/ ctx[5]["panel-body"];
	const panel_body_slot = create_slot(panel_body_slot_template, ctx, /*$$scope*/ ctx[8], get_panel_body_slot_context);

	return {
		c() {
			section = element("section");
			div0 = element("div");
			h3 = element("h3");
			t0 = text(/*panel*/ ctx[1]);
			t1 = space();
			if (panel_header_slot) panel_header_slot.c();
			t2 = space();
			div1 = element("div");
			if (panel_body_slot) panel_body_slot.c();
			attr(h3, "class", "svelte-160vuma");
			attr(div0, "class", "panel-header svelte-160vuma");
			attr(div1, "class", "panel-body svelte-160vuma");
			attr(section, "slot", "b");
			attr(section, "class", "svelte-160vuma");
		},
		m(target, anchor) {
			insert(target, section, anchor);
			append(section, div0);
			append(div0, h3);
			append(h3, t0);
			append(div0, t1);

			if (panel_header_slot) {
				panel_header_slot.m(div0, null);
			}

			append(section, t2);
			append(section, div1);

			if (panel_body_slot) {
				panel_body_slot.m(div1, null);
			}

			current = true;

			if (!mounted) {
				dispose = listen(div0, "click", /*toggle*/ ctx[4]);
				mounted = true;
			}
		},
		p(ctx, dirty) {
			if (!current || dirty & /*panel*/ 2) set_data(t0, /*panel*/ ctx[1]);

			if (panel_header_slot) {
				if (panel_header_slot.p && dirty & /*$$scope*/ 256) {
					update_slot(panel_header_slot, panel_header_slot_template, ctx, /*$$scope*/ ctx[8], dirty, get_panel_header_slot_changes, get_panel_header_slot_context);
				}
			}

			if (panel_body_slot) {
				if (panel_body_slot.p && dirty & /*$$scope*/ 256) {
					update_slot(panel_body_slot, panel_body_slot_template, ctx, /*$$scope*/ ctx[8], dirty, get_panel_body_slot_changes, get_panel_body_slot_context);
				}
			}
		},
		i(local) {
			if (current) return;
			transition_in(panel_header_slot, local);
			transition_in(panel_body_slot, local);
			current = true;
		},
		o(local) {
			transition_out(panel_header_slot, local);
			transition_out(panel_body_slot, local);
			current = false;
		},
		d(detaching) {
			if (detaching) detach(section);
			if (panel_header_slot) panel_header_slot.d(detaching);
			if (panel_body_slot) panel_body_slot.d(detaching);
			mounted = false;
			dispose();
		}
	};
}

// (28:0) <SplitPane bind:max type="vertical" bind:pos={pos}>
function create_default_slot$1(ctx) {
	let t;

	return {
		c() {
			t = space();
		},
		m(target, anchor) {
			insert(target, t, anchor);
		},
		p: noop,
		i: noop,
		o: noop,
		d(detaching) {
			if (detaching) detach(t);
		}
	};
}

function create_fragment$8(ctx) {
	let splitpane;
	let updating_max;
	let updating_pos;
	let current;

	function splitpane_max_binding(value) {
		/*splitpane_max_binding*/ ctx[6].call(null, value);
	}

	function splitpane_pos_binding(value) {
		/*splitpane_pos_binding*/ ctx[7].call(null, value);
	}

	let splitpane_props = {
		type: "vertical",
		$$slots: {
			default: [create_default_slot$1],
			b: [create_b_slot],
			a: [create_a_slot]
		},
		$$scope: { ctx }
	};

	if (/*max*/ ctx[2] !== void 0) {
		splitpane_props.max = /*max*/ ctx[2];
	}

	if (/*pos*/ ctx[0] !== void 0) {
		splitpane_props.pos = /*pos*/ ctx[0];
	}

	splitpane = new SplitPane({ props: splitpane_props });
	binding_callbacks.push(() => bind(splitpane, "max", splitpane_max_binding));
	binding_callbacks.push(() => bind(splitpane, "pos", splitpane_pos_binding));

	return {
		c() {
			create_component(splitpane.$$.fragment);
		},
		m(target, anchor) {
			mount_component(splitpane, target, anchor);
			current = true;
		},
		p(ctx, [dirty]) {
			const splitpane_changes = {};

			if (dirty & /*$$scope, panel*/ 258) {
				splitpane_changes.$$scope = { dirty, ctx };
			}

			if (!updating_max && dirty & /*max*/ 4) {
				updating_max = true;
				splitpane_changes.max = /*max*/ ctx[2];
				add_flush_callback(() => updating_max = false);
			}

			if (!updating_pos && dirty & /*pos*/ 1) {
				updating_pos = true;
				splitpane_changes.pos = /*pos*/ ctx[0];
				add_flush_callback(() => updating_pos = false);
			}

			splitpane.$set(splitpane_changes);
		},
		i(local) {
			if (current) return;
			transition_in(splitpane.$$.fragment, local);
			current = true;
		},
		o(local) {
			transition_out(splitpane.$$.fragment, local);
			current = false;
		},
		d(detaching) {
			destroy_component(splitpane, detaching);
		}
	};
}

function instance$7($$self, $$props, $$invalidate) {
	let $driver;
	let { panel } = $$props;
	let { pos = 50 } = $$props;
	let previous_pos = Math.min(pos, 70);
	let max;

	// we can't bind to the spring itself, but we
	// can still use the spring to drive `pos`
	const driver = spring(pos);

	component_subscribe($$self, driver, value => $$invalidate(10, $driver = value));

	const toggle = () => {
		driver.set(pos, { hard: true });

		if (pos > 80) {
			driver.set(previous_pos);
		} else {
			previous_pos = pos;
			driver.set(max);
		}
	};

	let { $$slots = {}, $$scope } = $$props;

	function splitpane_max_binding(value) {
		max = value;
		$$invalidate(2, max);
	}

	function splitpane_pos_binding(value) {
		pos = value;
		($$invalidate(0, pos), $$invalidate(10, $driver));
	}

	$$self.$set = $$props => {
		if ("panel" in $$props) $$invalidate(1, panel = $$props.panel);
		if ("pos" in $$props) $$invalidate(0, pos = $$props.pos);
		if ("$$scope" in $$props) $$invalidate(8, $$scope = $$props.$$scope);
	};

	$$self.$$.update = () => {
		if ($$self.$$.dirty & /*$driver*/ 1024) {
			 $$invalidate(0, pos = $driver);
		}
	};

	return [
		pos,
		panel,
		max,
		driver,
		toggle,
		$$slots,
		splitpane_max_binding,
		splitpane_pos_binding,
		$$scope
	];
}

class PaneWithPanel extends SvelteComponent {
	constructor(options) {
		super();
		if (!document.getElementById("svelte-160vuma-style")) add_css$8();
		init(this, options, instance$7, create_fragment$8, safe_not_equal, { panel: 1, pos: 0 });
	}
}

let uid = 1;

class ReplProxy {
	constructor(iframe, handlers) {
		this.iframe = iframe;
		this.handlers = handlers;

		this.pending_cmds = new Map();

		this.handle_event = e => this.handle_repl_message(e);
		window.addEventListener('message', this.handle_event, false);
	}

	destroy() {
		window.removeEventListener('message', this.handle_event);
	}

	iframe_command(action, args) {
		return new Promise((resolve, reject) => {
			const cmd_id = uid++;

			this.pending_cmds.set(cmd_id, { resolve, reject });

			this.iframe.contentWindow.postMessage({ action, cmd_id, args }, '*');
		});
	}

	handle_command_message(cmd_data) {
		let action = cmd_data.action;
		let id = cmd_data.cmd_id;
		let handler = this.pending_cmds.get(id);

		if (handler) {
			this.pending_cmds.delete(id);
			if (action === 'cmd_error') {
				let { message, stack } = cmd_data;
				let e = new Error(message);
				e.stack = stack;
				handler.reject(e);
			}

			if (action === 'cmd_ok') {
				handler.resolve(cmd_data.args);
			}
		} else {
			console.error('command not found', id, cmd_data, [...this.pending_cmds.keys()]);
		}
	}

	handle_repl_message(event) {
		if (event.source !== this.iframe.contentWindow) return;

		const { action, args } = event.data;

		switch (action) {
			case 'cmd_error':
			case 'cmd_ok':
				return this.handle_command_message(event.data);
			case 'fetch_progress':
				return this.handlers.on_fetch_progress(args.remaining)
			case 'error':
				return this.handlers.on_error(event.data);
			case 'unhandledrejection':
				return this.handlers.on_unhandled_rejection(event.data);
			case 'console':
				return this.handlers.on_console(event.data);
			case 'console_group':
				return this.handlers.on_console_group(event.data);
			case 'console_group_collapsed':
				return this.handlers.on_console_group_collapsed(event.data);
			case 'console_group_end':
				return this.handlers.on_console_group_end(event.data);
		}
	}

	eval(script) {
		return this.iframe_command('eval', { script });
	}

	handle_links() {
		return this.iframe_command('catch_clicks', {});
	}
}

/* node_modules/svelte-json-tree/src/JSONArrow.svelte generated by Svelte v3.24.0 */

function add_css$9() {
	var style = element("style");
	style.id = "svelte-kniv4z-style";
	style.textContent = ".container.svelte-kniv4z{display:inline-block;width:var(--li-identation);cursor:pointer;margin-left:calc(-7px - var(--li-identation));text-align:right}.arrow.svelte-kniv4z{transform-origin:67% 50%;position:relative;line-height:1.1em;font-size:0.75em;margin-left:0;transition:150ms;color:var(--arrow-sign)}.expanded.svelte-kniv4z{transform:rotateZ(90deg) translateX(-3px)}";
	append(document.head, style);
}

function create_fragment$9(ctx) {
	let div1;
	let div0;
	let mounted;
	let dispose;

	return {
		c() {
			div1 = element("div");
			div0 = element("div");
			div0.textContent = `${"▶"}`;
			attr(div0, "class", "arrow svelte-kniv4z");
			toggle_class(div0, "expanded", /*expanded*/ ctx[0]);
			attr(div1, "class", "container svelte-kniv4z");
		},
		m(target, anchor) {
			insert(target, div1, anchor);
			append(div1, div0);

			if (!mounted) {
				dispose = listen(div1, "click", /*onClick*/ ctx[1]);
				mounted = true;
			}
		},
		p(ctx, [dirty]) {
			if (dirty & /*expanded*/ 1) {
				toggle_class(div0, "expanded", /*expanded*/ ctx[0]);
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

function instance$8($$self, $$props, $$invalidate) {
	const dispatch = createEventDispatcher();

	function onClick(event) {
		dispatch("click", event);
	}

	let { expanded } = $$props;

	$$self.$set = $$props => {
		if ("expanded" in $$props) $$invalidate(0, expanded = $$props.expanded);
	};

	return [expanded, onClick];
}

class JSONArrow extends SvelteComponent {
	constructor(options) {
		super();
		if (!document.getElementById("svelte-kniv4z-style")) add_css$9();
		init(this, options, instance$8, create_fragment$9, safe_not_equal, { expanded: 0 });
	}
}

function objType(obj) {
  const type = Object.prototype.toString.call(obj).slice(8, -1);
  if (type === 'Object') {
    if (typeof obj[Symbol.iterator] === 'function') {
      return 'Iterable';
    }
    return obj.constructor.name;
  }

  return type;
}

/* node_modules/svelte-json-tree/src/JSONKey.svelte generated by Svelte v3.24.0 */

function add_css$a() {
	var style = element("style");
	style.id = "svelte-15h461i-style";
	style.textContent = "label.svelte-15h461i{display:inline-block;color:var(--label-color);margin:0}.spaced.svelte-15h461i{margin-right:var(--li-colon-space)}";
	append(document.head, style);
}

// (19:0) {#if showKey && key}
function create_if_block$6(ctx) {
	let label;
	let span;
	let t0;
	let t1;

	return {
		c() {
			label = element("label");
			span = element("span");
			t0 = text(/*key*/ ctx[0]);
			t1 = text(/*colon*/ ctx[2]);
			attr(label, "class", "svelte-15h461i");
			toggle_class(label, "spaced", /*isParentExpanded*/ ctx[1]);
		},
		m(target, anchor) {
			insert(target, label, anchor);
			append(label, span);
			append(span, t0);
			append(span, t1);
		},
		p(ctx, dirty) {
			if (dirty & /*key*/ 1) set_data(t0, /*key*/ ctx[0]);
			if (dirty & /*colon*/ 4) set_data(t1, /*colon*/ ctx[2]);

			if (dirty & /*isParentExpanded*/ 2) {
				toggle_class(label, "spaced", /*isParentExpanded*/ ctx[1]);
			}
		},
		d(detaching) {
			if (detaching) detach(label);
		}
	};
}

function create_fragment$a(ctx) {
	let if_block_anchor;
	let if_block = /*showKey*/ ctx[3] && /*key*/ ctx[0] && create_if_block$6(ctx);

	return {
		c() {
			if (if_block) if_block.c();
			if_block_anchor = empty();
		},
		m(target, anchor) {
			if (if_block) if_block.m(target, anchor);
			insert(target, if_block_anchor, anchor);
		},
		p(ctx, [dirty]) {
			if (/*showKey*/ ctx[3] && /*key*/ ctx[0]) {
				if (if_block) {
					if_block.p(ctx, dirty);
				} else {
					if_block = create_if_block$6(ctx);
					if_block.c();
					if_block.m(if_block_anchor.parentNode, if_block_anchor);
				}
			} else if (if_block) {
				if_block.d(1);
				if_block = null;
			}
		},
		i: noop,
		o: noop,
		d(detaching) {
			if (if_block) if_block.d(detaching);
			if (detaching) detach(if_block_anchor);
		}
	};
}

function instance$9($$self, $$props, $$invalidate) {
	let { key } = $$props,
		{ isParentExpanded } = $$props,
		{ isParentArray = false } = $$props,
		{ colon = ":" } = $$props;

	$$self.$set = $$props => {
		if ("key" in $$props) $$invalidate(0, key = $$props.key);
		if ("isParentExpanded" in $$props) $$invalidate(1, isParentExpanded = $$props.isParentExpanded);
		if ("isParentArray" in $$props) $$invalidate(4, isParentArray = $$props.isParentArray);
		if ("colon" in $$props) $$invalidate(2, colon = $$props.colon);
	};

	let showKey;

	$$self.$$.update = () => {
		if ($$self.$$.dirty & /*isParentExpanded, isParentArray, key*/ 19) {
			 $$invalidate(3, showKey = isParentExpanded || !isParentArray || key != +key);
		}
	};

	return [key, isParentExpanded, colon, showKey, isParentArray];
}

class JSONKey extends SvelteComponent {
	constructor(options) {
		super();
		if (!document.getElementById("svelte-15h461i-style")) add_css$a();

		init(this, options, instance$9, create_fragment$a, safe_not_equal, {
			key: 0,
			isParentExpanded: 1,
			isParentArray: 4,
			colon: 2
		});
	}
}

var contextKey = {};

/* node_modules/svelte-json-tree/src/JSONNested.svelte generated by Svelte v3.24.0 */

function add_css$b() {
	var style = element("style");
	style.id = "svelte-2jkrkt-style";
	style.textContent = ".indent.svelte-2jkrkt{margin-left:var(--li-identation)}.collapse.svelte-2jkrkt{--li-display:inline;display:inline;font-style:italic}.comma.svelte-2jkrkt{margin-left:-0.5em;margin-right:0.5em}";
	append(document.head, style);
}

function get_each_context$2(ctx, list, i) {
	const child_ctx = ctx.slice();
	child_ctx[12] = list[i];
	child_ctx[20] = i;
	return child_ctx;
}

// (48:2) {#if expandable && isParentExpanded}
function create_if_block_3(ctx) {
	let jsonarrow;
	let current;
	jsonarrow = new JSONArrow({ props: { expanded: /*expanded*/ ctx[0] } });
	jsonarrow.$on("click", /*toggleExpand*/ ctx[15]);

	return {
		c() {
			create_component(jsonarrow.$$.fragment);
		},
		m(target, anchor) {
			mount_component(jsonarrow, target, anchor);
			current = true;
		},
		p(ctx, dirty) {
			const jsonarrow_changes = {};
			if (dirty & /*expanded*/ 1) jsonarrow_changes.expanded = /*expanded*/ ctx[0];
			jsonarrow.$set(jsonarrow_changes);
		},
		i(local) {
			if (current) return;
			transition_in(jsonarrow.$$.fragment, local);
			current = true;
		},
		o(local) {
			transition_out(jsonarrow.$$.fragment, local);
			current = false;
		},
		d(detaching) {
			destroy_component(jsonarrow, detaching);
		}
	};
}

// (65:4) {:else}
function create_else_block$3(ctx) {
	let span;

	return {
		c() {
			span = element("span");
			span.textContent = "…";
		},
		m(target, anchor) {
			insert(target, span, anchor);
		},
		p: noop,
		i: noop,
		o: noop,
		d(detaching) {
			if (detaching) detach(span);
		}
	};
}

// (53:4) {#if isParentExpanded}
function create_if_block$7(ctx) {
	let ul;
	let t;
	let current;
	let mounted;
	let dispose;
	let each_value = /*slicedKeys*/ ctx[13];
	let each_blocks = [];

	for (let i = 0; i < each_value.length; i += 1) {
		each_blocks[i] = create_each_block$2(get_each_context$2(ctx, each_value, i));
	}

	const out = i => transition_out(each_blocks[i], 1, 1, () => {
		each_blocks[i] = null;
	});

	let if_block = /*slicedKeys*/ ctx[13].length < /*previewKeys*/ ctx[7].length && create_if_block_1$4();

	return {
		c() {
			ul = element("ul");

			for (let i = 0; i < each_blocks.length; i += 1) {
				each_blocks[i].c();
			}

			t = space();
			if (if_block) if_block.c();
			attr(ul, "class", "svelte-2jkrkt");
			toggle_class(ul, "collapse", !/*expanded*/ ctx[0]);
		},
		m(target, anchor) {
			insert(target, ul, anchor);

			for (let i = 0; i < each_blocks.length; i += 1) {
				each_blocks[i].m(ul, null);
			}

			append(ul, t);
			if (if_block) if_block.m(ul, null);
			current = true;

			if (!mounted) {
				dispose = listen(ul, "click", /*expand*/ ctx[16]);
				mounted = true;
			}
		},
		p(ctx, dirty) {
			if (dirty & /*expanded, previewKeys, getKey, slicedKeys, isArray, getValue, getPreviewValue*/ 10129) {
				each_value = /*slicedKeys*/ ctx[13];
				let i;

				for (i = 0; i < each_value.length; i += 1) {
					const child_ctx = get_each_context$2(ctx, each_value, i);

					if (each_blocks[i]) {
						each_blocks[i].p(child_ctx, dirty);
						transition_in(each_blocks[i], 1);
					} else {
						each_blocks[i] = create_each_block$2(child_ctx);
						each_blocks[i].c();
						transition_in(each_blocks[i], 1);
						each_blocks[i].m(ul, t);
					}
				}

				group_outros();

				for (i = each_value.length; i < each_blocks.length; i += 1) {
					out(i);
				}

				check_outros();
			}

			if (/*slicedKeys*/ ctx[13].length < /*previewKeys*/ ctx[7].length) {
				if (if_block) ; else {
					if_block = create_if_block_1$4();
					if_block.c();
					if_block.m(ul, null);
				}
			} else if (if_block) {
				if_block.d(1);
				if_block = null;
			}

			if (dirty & /*expanded*/ 1) {
				toggle_class(ul, "collapse", !/*expanded*/ ctx[0]);
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
			if (detaching) detach(ul);
			destroy_each(each_blocks, detaching);
			if (if_block) if_block.d();
			mounted = false;
			dispose();
		}
	};
}

// (57:10) {#if !expanded && index < previewKeys.length - 1}
function create_if_block_2$3(ctx) {
	let span;

	return {
		c() {
			span = element("span");
			span.textContent = ",";
			attr(span, "class", "comma svelte-2jkrkt");
		},
		m(target, anchor) {
			insert(target, span, anchor);
		},
		d(detaching) {
			if (detaching) detach(span);
		}
	};
}

// (55:8) {#each slicedKeys as key, index}
function create_each_block$2(ctx) {
	let jsonnode;
	let t;
	let if_block_anchor;
	let current;

	jsonnode = new JSONNode({
			props: {
				key: /*getKey*/ ctx[8](/*key*/ ctx[12]),
				isParentExpanded: /*expanded*/ ctx[0],
				isParentArray: /*isArray*/ ctx[4],
				value: /*expanded*/ ctx[0]
				? /*getValue*/ ctx[9](/*key*/ ctx[12])
				: /*getPreviewValue*/ ctx[10](/*key*/ ctx[12])
			}
		});

	let if_block = !/*expanded*/ ctx[0] && /*index*/ ctx[20] < /*previewKeys*/ ctx[7].length - 1 && create_if_block_2$3();

	return {
		c() {
			create_component(jsonnode.$$.fragment);
			t = space();
			if (if_block) if_block.c();
			if_block_anchor = empty();
		},
		m(target, anchor) {
			mount_component(jsonnode, target, anchor);
			insert(target, t, anchor);
			if (if_block) if_block.m(target, anchor);
			insert(target, if_block_anchor, anchor);
			current = true;
		},
		p(ctx, dirty) {
			const jsonnode_changes = {};
			if (dirty & /*getKey, slicedKeys*/ 8448) jsonnode_changes.key = /*getKey*/ ctx[8](/*key*/ ctx[12]);
			if (dirty & /*expanded*/ 1) jsonnode_changes.isParentExpanded = /*expanded*/ ctx[0];
			if (dirty & /*isArray*/ 16) jsonnode_changes.isParentArray = /*isArray*/ ctx[4];

			if (dirty & /*expanded, getValue, slicedKeys, getPreviewValue*/ 9729) jsonnode_changes.value = /*expanded*/ ctx[0]
			? /*getValue*/ ctx[9](/*key*/ ctx[12])
			: /*getPreviewValue*/ ctx[10](/*key*/ ctx[12]);

			jsonnode.$set(jsonnode_changes);

			if (!/*expanded*/ ctx[0] && /*index*/ ctx[20] < /*previewKeys*/ ctx[7].length - 1) {
				if (if_block) ; else {
					if_block = create_if_block_2$3();
					if_block.c();
					if_block.m(if_block_anchor.parentNode, if_block_anchor);
				}
			} else if (if_block) {
				if_block.d(1);
				if_block = null;
			}
		},
		i(local) {
			if (current) return;
			transition_in(jsonnode.$$.fragment, local);
			current = true;
		},
		o(local) {
			transition_out(jsonnode.$$.fragment, local);
			current = false;
		},
		d(detaching) {
			destroy_component(jsonnode, detaching);
			if (detaching) detach(t);
			if (if_block) if_block.d(detaching);
			if (detaching) detach(if_block_anchor);
		}
	};
}

// (61:8) {#if slicedKeys.length < previewKeys.length }
function create_if_block_1$4(ctx) {
	let span;

	return {
		c() {
			span = element("span");
			span.textContent = "…";
		},
		m(target, anchor) {
			insert(target, span, anchor);
		},
		d(detaching) {
			if (detaching) detach(span);
		}
	};
}

function create_fragment$b(ctx) {
	let li;
	let t0;
	let jsonkey;
	let t1;
	let span1;
	let span0;
	let t2;
	let t3;
	let t4;
	let current_block_type_index;
	let if_block1;
	let t5;
	let span2;
	let t6;
	let current;
	let mounted;
	let dispose;
	let if_block0 = /*expandable*/ ctx[11] && /*isParentExpanded*/ ctx[2] && create_if_block_3(ctx);

	jsonkey = new JSONKey({
			props: {
				key: /*key*/ ctx[12],
				colon: /*context*/ ctx[14].colon,
				isParentExpanded: /*isParentExpanded*/ ctx[2],
				isParentArray: /*isParentArray*/ ctx[3]
			}
		});

	const if_block_creators = [create_if_block$7, create_else_block$3];
	const if_blocks = [];

	function select_block_type(ctx, dirty) {
		if (/*isParentExpanded*/ ctx[2]) return 0;
		return 1;
	}

	current_block_type_index = select_block_type(ctx);
	if_block1 = if_blocks[current_block_type_index] = if_block_creators[current_block_type_index](ctx);

	return {
		c() {
			li = element("li");
			if (if_block0) if_block0.c();
			t0 = space();
			create_component(jsonkey.$$.fragment);
			t1 = space();
			span1 = element("span");
			span0 = element("span");
			t2 = text(/*label*/ ctx[1]);
			t3 = text(/*bracketOpen*/ ctx[5]);
			t4 = space();
			if_block1.c();
			t5 = space();
			span2 = element("span");
			t6 = text(/*bracketClose*/ ctx[6]);
			attr(li, "class", "svelte-2jkrkt");
			toggle_class(li, "indent", /*isParentExpanded*/ ctx[2]);
		},
		m(target, anchor) {
			insert(target, li, anchor);
			if (if_block0) if_block0.m(li, null);
			append(li, t0);
			mount_component(jsonkey, li, null);
			append(li, t1);
			append(li, span1);
			append(span1, span0);
			append(span0, t2);
			append(span1, t3);
			append(li, t4);
			if_blocks[current_block_type_index].m(li, null);
			append(li, t5);
			append(li, span2);
			append(span2, t6);
			current = true;

			if (!mounted) {
				dispose = listen(span0, "click", /*toggleExpand*/ ctx[15]);
				mounted = true;
			}
		},
		p(ctx, [dirty]) {
			if (/*expandable*/ ctx[11] && /*isParentExpanded*/ ctx[2]) {
				if (if_block0) {
					if_block0.p(ctx, dirty);

					if (dirty & /*expandable, isParentExpanded*/ 2052) {
						transition_in(if_block0, 1);
					}
				} else {
					if_block0 = create_if_block_3(ctx);
					if_block0.c();
					transition_in(if_block0, 1);
					if_block0.m(li, t0);
				}
			} else if (if_block0) {
				group_outros();

				transition_out(if_block0, 1, 1, () => {
					if_block0 = null;
				});

				check_outros();
			}

			const jsonkey_changes = {};
			if (dirty & /*key*/ 4096) jsonkey_changes.key = /*key*/ ctx[12];
			if (dirty & /*isParentExpanded*/ 4) jsonkey_changes.isParentExpanded = /*isParentExpanded*/ ctx[2];
			if (dirty & /*isParentArray*/ 8) jsonkey_changes.isParentArray = /*isParentArray*/ ctx[3];
			jsonkey.$set(jsonkey_changes);
			if (!current || dirty & /*label*/ 2) set_data(t2, /*label*/ ctx[1]);
			if (!current || dirty & /*bracketOpen*/ 32) set_data(t3, /*bracketOpen*/ ctx[5]);
			let previous_block_index = current_block_type_index;
			current_block_type_index = select_block_type(ctx);

			if (current_block_type_index === previous_block_index) {
				if_blocks[current_block_type_index].p(ctx, dirty);
			} else {
				group_outros();

				transition_out(if_blocks[previous_block_index], 1, 1, () => {
					if_blocks[previous_block_index] = null;
				});

				check_outros();
				if_block1 = if_blocks[current_block_type_index];

				if (!if_block1) {
					if_block1 = if_blocks[current_block_type_index] = if_block_creators[current_block_type_index](ctx);
					if_block1.c();
				}

				transition_in(if_block1, 1);
				if_block1.m(li, t5);
			}

			if (!current || dirty & /*bracketClose*/ 64) set_data(t6, /*bracketClose*/ ctx[6]);

			if (dirty & /*isParentExpanded*/ 4) {
				toggle_class(li, "indent", /*isParentExpanded*/ ctx[2]);
			}
		},
		i(local) {
			if (current) return;
			transition_in(if_block0);
			transition_in(jsonkey.$$.fragment, local);
			transition_in(if_block1);
			current = true;
		},
		o(local) {
			transition_out(if_block0);
			transition_out(jsonkey.$$.fragment, local);
			transition_out(if_block1);
			current = false;
		},
		d(detaching) {
			if (detaching) detach(li);
			if (if_block0) if_block0.d();
			destroy_component(jsonkey);
			if_blocks[current_block_type_index].d();
			mounted = false;
			dispose();
		}
	};
}

function instance$a($$self, $$props, $$invalidate) {
	let { key } = $$props,
		{ keys } = $$props,
		{ colon = ":" } = $$props,
		{ label = "" } = $$props,
		{ isParentExpanded } = $$props,
		{ isParentArray } = $$props,
		{ isArray = false } = $$props,
		{ bracketOpen } = $$props,
		{ bracketClose } = $$props;

	let { previewKeys = keys } = $$props;
	let { getKey = key => key } = $$props;
	let { getValue = key => key } = $$props;
	let { getPreviewValue = getValue } = $$props;
	let { expanded = false } = $$props, { expandable = true } = $$props;
	const context = getContext(contextKey);
	setContext(contextKey, { ...context, colon });

	function toggleExpand() {
		$$invalidate(0, expanded = !expanded);
	}

	function expand() {
		$$invalidate(0, expanded = true);
	}

	$$self.$set = $$props => {
		if ("key" in $$props) $$invalidate(12, key = $$props.key);
		if ("keys" in $$props) $$invalidate(17, keys = $$props.keys);
		if ("colon" in $$props) $$invalidate(18, colon = $$props.colon);
		if ("label" in $$props) $$invalidate(1, label = $$props.label);
		if ("isParentExpanded" in $$props) $$invalidate(2, isParentExpanded = $$props.isParentExpanded);
		if ("isParentArray" in $$props) $$invalidate(3, isParentArray = $$props.isParentArray);
		if ("isArray" in $$props) $$invalidate(4, isArray = $$props.isArray);
		if ("bracketOpen" in $$props) $$invalidate(5, bracketOpen = $$props.bracketOpen);
		if ("bracketClose" in $$props) $$invalidate(6, bracketClose = $$props.bracketClose);
		if ("previewKeys" in $$props) $$invalidate(7, previewKeys = $$props.previewKeys);
		if ("getKey" in $$props) $$invalidate(8, getKey = $$props.getKey);
		if ("getValue" in $$props) $$invalidate(9, getValue = $$props.getValue);
		if ("getPreviewValue" in $$props) $$invalidate(10, getPreviewValue = $$props.getPreviewValue);
		if ("expanded" in $$props) $$invalidate(0, expanded = $$props.expanded);
		if ("expandable" in $$props) $$invalidate(11, expandable = $$props.expandable);
	};

	let slicedKeys;

	$$self.$$.update = () => {
		if ($$self.$$.dirty & /*isParentExpanded*/ 4) {
			 if (!isParentExpanded) {
				$$invalidate(0, expanded = false);
			}
		}

		if ($$self.$$.dirty & /*expanded, keys, previewKeys*/ 131201) {
			 $$invalidate(13, slicedKeys = expanded ? keys : previewKeys.slice(0, 5));
		}
	};

	return [
		expanded,
		label,
		isParentExpanded,
		isParentArray,
		isArray,
		bracketOpen,
		bracketClose,
		previewKeys,
		getKey,
		getValue,
		getPreviewValue,
		expandable,
		key,
		slicedKeys,
		context,
		toggleExpand,
		expand,
		keys,
		colon
	];
}

class JSONNested extends SvelteComponent {
	constructor(options) {
		super();
		if (!document.getElementById("svelte-2jkrkt-style")) add_css$b();

		init(this, options, instance$a, create_fragment$b, safe_not_equal, {
			key: 12,
			keys: 17,
			colon: 18,
			label: 1,
			isParentExpanded: 2,
			isParentArray: 3,
			isArray: 4,
			bracketOpen: 5,
			bracketClose: 6,
			previewKeys: 7,
			getKey: 8,
			getValue: 9,
			getPreviewValue: 10,
			expanded: 0,
			expandable: 11
		});
	}
}

/* node_modules/svelte-json-tree/src/JSONObjectNode.svelte generated by Svelte v3.24.0 */

function create_fragment$c(ctx) {
	let jsonnested;
	let current;

	jsonnested = new JSONNested({
			props: {
				key: /*key*/ ctx[0],
				expanded: /*expanded*/ ctx[4],
				isParentExpanded: /*isParentExpanded*/ ctx[1],
				isParentArray: /*isParentArray*/ ctx[2],
				keys: /*keys*/ ctx[5],
				getValue: /*getValue*/ ctx[6],
				label: "" + (/*nodeType*/ ctx[3] + " "),
				bracketOpen: "{",
				bracketClose: "}"
			}
		});

	return {
		c() {
			create_component(jsonnested.$$.fragment);
		},
		m(target, anchor) {
			mount_component(jsonnested, target, anchor);
			current = true;
		},
		p(ctx, [dirty]) {
			const jsonnested_changes = {};
			if (dirty & /*key*/ 1) jsonnested_changes.key = /*key*/ ctx[0];
			if (dirty & /*expanded*/ 16) jsonnested_changes.expanded = /*expanded*/ ctx[4];
			if (dirty & /*isParentExpanded*/ 2) jsonnested_changes.isParentExpanded = /*isParentExpanded*/ ctx[1];
			if (dirty & /*isParentArray*/ 4) jsonnested_changes.isParentArray = /*isParentArray*/ ctx[2];
			if (dirty & /*keys*/ 32) jsonnested_changes.keys = /*keys*/ ctx[5];
			if (dirty & /*nodeType*/ 8) jsonnested_changes.label = "" + (/*nodeType*/ ctx[3] + " ");
			jsonnested.$set(jsonnested_changes);
		},
		i(local) {
			if (current) return;
			transition_in(jsonnested.$$.fragment, local);
			current = true;
		},
		o(local) {
			transition_out(jsonnested.$$.fragment, local);
			current = false;
		},
		d(detaching) {
			destroy_component(jsonnested, detaching);
		}
	};
}

function instance$b($$self, $$props, $$invalidate) {
	let { key } = $$props,
		{ value } = $$props,
		{ isParentExpanded } = $$props,
		{ isParentArray } = $$props,
		{ nodeType } = $$props;

	let { expanded = false } = $$props;

	function getValue(key) {
		return value[key];
	}

	$$self.$set = $$props => {
		if ("key" in $$props) $$invalidate(0, key = $$props.key);
		if ("value" in $$props) $$invalidate(7, value = $$props.value);
		if ("isParentExpanded" in $$props) $$invalidate(1, isParentExpanded = $$props.isParentExpanded);
		if ("isParentArray" in $$props) $$invalidate(2, isParentArray = $$props.isParentArray);
		if ("nodeType" in $$props) $$invalidate(3, nodeType = $$props.nodeType);
		if ("expanded" in $$props) $$invalidate(4, expanded = $$props.expanded);
	};

	let keys;

	$$self.$$.update = () => {
		if ($$self.$$.dirty & /*value*/ 128) {
			 $$invalidate(5, keys = Object.getOwnPropertyNames(value));
		}
	};

	return [
		key,
		isParentExpanded,
		isParentArray,
		nodeType,
		expanded,
		keys,
		getValue,
		value
	];
}

class JSONObjectNode extends SvelteComponent {
	constructor(options) {
		super();

		init(this, options, instance$b, create_fragment$c, safe_not_equal, {
			key: 0,
			value: 7,
			isParentExpanded: 1,
			isParentArray: 2,
			nodeType: 3,
			expanded: 4
		});
	}
}

/* node_modules/svelte-json-tree/src/JSONArrayNode.svelte generated by Svelte v3.24.0 */

function create_fragment$d(ctx) {
	let jsonnested;
	let current;

	jsonnested = new JSONNested({
			props: {
				key: /*key*/ ctx[0],
				expanded: /*expanded*/ ctx[4],
				isParentExpanded: /*isParentExpanded*/ ctx[2],
				isParentArray: /*isParentArray*/ ctx[3],
				isArray: true,
				keys: /*keys*/ ctx[5],
				previewKeys: /*previewKeys*/ ctx[6],
				getValue: /*getValue*/ ctx[7],
				label: "Array(" + /*value*/ ctx[1].length + ")",
				bracketOpen: "[",
				bracketClose: "]"
			}
		});

	return {
		c() {
			create_component(jsonnested.$$.fragment);
		},
		m(target, anchor) {
			mount_component(jsonnested, target, anchor);
			current = true;
		},
		p(ctx, [dirty]) {
			const jsonnested_changes = {};
			if (dirty & /*key*/ 1) jsonnested_changes.key = /*key*/ ctx[0];
			if (dirty & /*expanded*/ 16) jsonnested_changes.expanded = /*expanded*/ ctx[4];
			if (dirty & /*isParentExpanded*/ 4) jsonnested_changes.isParentExpanded = /*isParentExpanded*/ ctx[2];
			if (dirty & /*isParentArray*/ 8) jsonnested_changes.isParentArray = /*isParentArray*/ ctx[3];
			if (dirty & /*keys*/ 32) jsonnested_changes.keys = /*keys*/ ctx[5];
			if (dirty & /*previewKeys*/ 64) jsonnested_changes.previewKeys = /*previewKeys*/ ctx[6];
			if (dirty & /*value*/ 2) jsonnested_changes.label = "Array(" + /*value*/ ctx[1].length + ")";
			jsonnested.$set(jsonnested_changes);
		},
		i(local) {
			if (current) return;
			transition_in(jsonnested.$$.fragment, local);
			current = true;
		},
		o(local) {
			transition_out(jsonnested.$$.fragment, local);
			current = false;
		},
		d(detaching) {
			destroy_component(jsonnested, detaching);
		}
	};
}

function instance$c($$self, $$props, $$invalidate) {
	let { key } = $$props,
		{ value } = $$props,
		{ isParentExpanded } = $$props,
		{ isParentArray } = $$props;

	let { expanded = false } = $$props;
	const filteredKey = new Set(["length"]);

	function getValue(key) {
		return value[key];
	}

	$$self.$set = $$props => {
		if ("key" in $$props) $$invalidate(0, key = $$props.key);
		if ("value" in $$props) $$invalidate(1, value = $$props.value);
		if ("isParentExpanded" in $$props) $$invalidate(2, isParentExpanded = $$props.isParentExpanded);
		if ("isParentArray" in $$props) $$invalidate(3, isParentArray = $$props.isParentArray);
		if ("expanded" in $$props) $$invalidate(4, expanded = $$props.expanded);
	};

	let keys;
	let previewKeys;

	$$self.$$.update = () => {
		if ($$self.$$.dirty & /*value*/ 2) {
			 $$invalidate(5, keys = Object.getOwnPropertyNames(value));
		}

		if ($$self.$$.dirty & /*keys*/ 32) {
			 $$invalidate(6, previewKeys = keys.filter(key => !filteredKey.has(key)));
		}
	};

	return [
		key,
		value,
		isParentExpanded,
		isParentArray,
		expanded,
		keys,
		previewKeys,
		getValue
	];
}

class JSONArrayNode extends SvelteComponent {
	constructor(options) {
		super();

		init(this, options, instance$c, create_fragment$d, safe_not_equal, {
			key: 0,
			value: 1,
			isParentExpanded: 2,
			isParentArray: 3,
			expanded: 4
		});
	}
}

/* node_modules/svelte-json-tree/src/JSONIterableArrayNode.svelte generated by Svelte v3.24.0 */

function create_fragment$e(ctx) {
	let jsonnested;
	let current;

	jsonnested = new JSONNested({
			props: {
				key: /*key*/ ctx[0],
				isParentExpanded: /*isParentExpanded*/ ctx[1],
				isParentArray: /*isParentArray*/ ctx[2],
				keys: /*keys*/ ctx[4],
				getKey,
				getValue,
				isArray: true,
				label: "" + (/*nodeType*/ ctx[3] + "(" + /*keys*/ ctx[4].length + ")"),
				bracketOpen: "{",
				bracketClose: "}"
			}
		});

	return {
		c() {
			create_component(jsonnested.$$.fragment);
		},
		m(target, anchor) {
			mount_component(jsonnested, target, anchor);
			current = true;
		},
		p(ctx, [dirty]) {
			const jsonnested_changes = {};
			if (dirty & /*key*/ 1) jsonnested_changes.key = /*key*/ ctx[0];
			if (dirty & /*isParentExpanded*/ 2) jsonnested_changes.isParentExpanded = /*isParentExpanded*/ ctx[1];
			if (dirty & /*isParentArray*/ 4) jsonnested_changes.isParentArray = /*isParentArray*/ ctx[2];
			if (dirty & /*keys*/ 16) jsonnested_changes.keys = /*keys*/ ctx[4];
			if (dirty & /*nodeType, keys*/ 24) jsonnested_changes.label = "" + (/*nodeType*/ ctx[3] + "(" + /*keys*/ ctx[4].length + ")");
			jsonnested.$set(jsonnested_changes);
		},
		i(local) {
			if (current) return;
			transition_in(jsonnested.$$.fragment, local);
			current = true;
		},
		o(local) {
			transition_out(jsonnested.$$.fragment, local);
			current = false;
		},
		d(detaching) {
			destroy_component(jsonnested, detaching);
		}
	};
}

function getKey(key) {
	return String(key[0]);
}

function getValue(key) {
	return key[1];
}

function instance$d($$self, $$props, $$invalidate) {
	let { key } = $$props,
		{ value } = $$props,
		{ isParentExpanded } = $$props,
		{ isParentArray } = $$props,
		{ nodeType } = $$props;

	let keys = [];

	$$self.$set = $$props => {
		if ("key" in $$props) $$invalidate(0, key = $$props.key);
		if ("value" in $$props) $$invalidate(5, value = $$props.value);
		if ("isParentExpanded" in $$props) $$invalidate(1, isParentExpanded = $$props.isParentExpanded);
		if ("isParentArray" in $$props) $$invalidate(2, isParentArray = $$props.isParentArray);
		if ("nodeType" in $$props) $$invalidate(3, nodeType = $$props.nodeType);
	};

	$$self.$$.update = () => {
		if ($$self.$$.dirty & /*value*/ 32) {
			 {
				let result = [];
				let i = 0;

				for (const entry of value) {
					result.push([i++, entry]);
				}

				$$invalidate(4, keys = result);
			}
		}
	};

	return [key, isParentExpanded, isParentArray, nodeType, keys, value];
}

class JSONIterableArrayNode extends SvelteComponent {
	constructor(options) {
		super();

		init(this, options, instance$d, create_fragment$e, safe_not_equal, {
			key: 0,
			value: 5,
			isParentExpanded: 1,
			isParentArray: 2,
			nodeType: 3
		});
	}
}

class MapEntry {
  constructor(key, value) {
    this.key = key;
    this.value = value;
  }
}

/* node_modules/svelte-json-tree/src/JSONIterableMapNode.svelte generated by Svelte v3.24.0 */

function create_fragment$f(ctx) {
	let jsonnested;
	let current;

	jsonnested = new JSONNested({
			props: {
				key: /*key*/ ctx[0],
				isParentExpanded: /*isParentExpanded*/ ctx[1],
				isParentArray: /*isParentArray*/ ctx[2],
				keys: /*keys*/ ctx[4],
				getKey: getKey$1,
				getValue: getValue$1,
				label: "" + (/*nodeType*/ ctx[3] + "(" + /*keys*/ ctx[4].length + ")"),
				colon: "",
				bracketOpen: "{",
				bracketClose: "}"
			}
		});

	return {
		c() {
			create_component(jsonnested.$$.fragment);
		},
		m(target, anchor) {
			mount_component(jsonnested, target, anchor);
			current = true;
		},
		p(ctx, [dirty]) {
			const jsonnested_changes = {};
			if (dirty & /*key*/ 1) jsonnested_changes.key = /*key*/ ctx[0];
			if (dirty & /*isParentExpanded*/ 2) jsonnested_changes.isParentExpanded = /*isParentExpanded*/ ctx[1];
			if (dirty & /*isParentArray*/ 4) jsonnested_changes.isParentArray = /*isParentArray*/ ctx[2];
			if (dirty & /*keys*/ 16) jsonnested_changes.keys = /*keys*/ ctx[4];
			if (dirty & /*nodeType, keys*/ 24) jsonnested_changes.label = "" + (/*nodeType*/ ctx[3] + "(" + /*keys*/ ctx[4].length + ")");
			jsonnested.$set(jsonnested_changes);
		},
		i(local) {
			if (current) return;
			transition_in(jsonnested.$$.fragment, local);
			current = true;
		},
		o(local) {
			transition_out(jsonnested.$$.fragment, local);
			current = false;
		},
		d(detaching) {
			destroy_component(jsonnested, detaching);
		}
	};
}

function getKey$1(entry) {
	return entry[0];
}

function getValue$1(entry) {
	return entry[1];
}

function instance$e($$self, $$props, $$invalidate) {
	let { key } = $$props,
		{ value } = $$props,
		{ isParentExpanded } = $$props,
		{ isParentArray } = $$props,
		{ nodeType } = $$props;

	let keys = [];

	$$self.$set = $$props => {
		if ("key" in $$props) $$invalidate(0, key = $$props.key);
		if ("value" in $$props) $$invalidate(5, value = $$props.value);
		if ("isParentExpanded" in $$props) $$invalidate(1, isParentExpanded = $$props.isParentExpanded);
		if ("isParentArray" in $$props) $$invalidate(2, isParentArray = $$props.isParentArray);
		if ("nodeType" in $$props) $$invalidate(3, nodeType = $$props.nodeType);
	};

	$$self.$$.update = () => {
		if ($$self.$$.dirty & /*value*/ 32) {
			 {
				let result = [];
				let i = 0;

				for (const entry of value) {
					result.push([i++, new MapEntry(entry[0], entry[1])]);
				}

				$$invalidate(4, keys = result);
			}
		}
	};

	return [key, isParentExpanded, isParentArray, nodeType, keys, value];
}

class JSONIterableMapNode extends SvelteComponent {
	constructor(options) {
		super();

		init(this, options, instance$e, create_fragment$f, safe_not_equal, {
			key: 0,
			value: 5,
			isParentExpanded: 1,
			isParentArray: 2,
			nodeType: 3
		});
	}
}

/* node_modules/svelte-json-tree/src/JSONMapEntryNode.svelte generated by Svelte v3.24.0 */

function create_fragment$g(ctx) {
	let jsonnested;
	let current;

	jsonnested = new JSONNested({
			props: {
				expanded: /*expanded*/ ctx[4],
				isParentExpanded: /*isParentExpanded*/ ctx[2],
				isParentArray: /*isParentArray*/ ctx[3],
				key: /*isParentExpanded*/ ctx[2]
				? String(/*key*/ ctx[0])
				: /*value*/ ctx[1].key,
				keys: /*keys*/ ctx[5],
				getValue: /*getValue*/ ctx[6],
				label: /*isParentExpanded*/ ctx[2] ? ": Entry " : "=> ",
				bracketOpen: "{",
				bracketClose: "}"
			}
		});

	return {
		c() {
			create_component(jsonnested.$$.fragment);
		},
		m(target, anchor) {
			mount_component(jsonnested, target, anchor);
			current = true;
		},
		p(ctx, [dirty]) {
			const jsonnested_changes = {};
			if (dirty & /*expanded*/ 16) jsonnested_changes.expanded = /*expanded*/ ctx[4];
			if (dirty & /*isParentExpanded*/ 4) jsonnested_changes.isParentExpanded = /*isParentExpanded*/ ctx[2];
			if (dirty & /*isParentArray*/ 8) jsonnested_changes.isParentArray = /*isParentArray*/ ctx[3];

			if (dirty & /*isParentExpanded, key, value*/ 7) jsonnested_changes.key = /*isParentExpanded*/ ctx[2]
			? String(/*key*/ ctx[0])
			: /*value*/ ctx[1].key;

			if (dirty & /*isParentExpanded*/ 4) jsonnested_changes.label = /*isParentExpanded*/ ctx[2] ? ": Entry " : "=> ";
			jsonnested.$set(jsonnested_changes);
		},
		i(local) {
			if (current) return;
			transition_in(jsonnested.$$.fragment, local);
			current = true;
		},
		o(local) {
			transition_out(jsonnested.$$.fragment, local);
			current = false;
		},
		d(detaching) {
			destroy_component(jsonnested, detaching);
		}
	};
}

function instance$f($$self, $$props, $$invalidate) {
	let { key } = $$props,
		{ value } = $$props,
		{ isParentExpanded } = $$props,
		{ isParentArray } = $$props;

	let { expanded = false } = $$props;
	const keys = ["key", "value"];

	function getValue(key) {
		return value[key];
	}

	$$self.$set = $$props => {
		if ("key" in $$props) $$invalidate(0, key = $$props.key);
		if ("value" in $$props) $$invalidate(1, value = $$props.value);
		if ("isParentExpanded" in $$props) $$invalidate(2, isParentExpanded = $$props.isParentExpanded);
		if ("isParentArray" in $$props) $$invalidate(3, isParentArray = $$props.isParentArray);
		if ("expanded" in $$props) $$invalidate(4, expanded = $$props.expanded);
	};

	return [key, value, isParentExpanded, isParentArray, expanded, keys, getValue];
}

class JSONMapEntryNode extends SvelteComponent {
	constructor(options) {
		super();

		init(this, options, instance$f, create_fragment$g, safe_not_equal, {
			key: 0,
			value: 1,
			isParentExpanded: 2,
			isParentArray: 3,
			expanded: 4
		});
	}
}

/* node_modules/svelte-json-tree/src/JSONValueNode.svelte generated by Svelte v3.24.0 */

function add_css$c() {
	var style = element("style");
	style.id = "svelte-1m3zj06-style";
	style.textContent = "li.svelte-1m3zj06{user-select:text;word-wrap:break-word;word-break:break-all}.indent.svelte-1m3zj06{margin-left:var(--li-identation)}.String.svelte-1m3zj06{color:var(--string-color)}.Date.svelte-1m3zj06{color:var(--date-color)}.Number.svelte-1m3zj06{color:var(--number-color)}.Boolean.svelte-1m3zj06{color:var(--boolean-color)}.Null.svelte-1m3zj06{color:var(--null-color)}.Undefined.svelte-1m3zj06{color:var(--undefined-color)}.Function.svelte-1m3zj06{color:var(--function-color);font-style:italic}.Symbol.svelte-1m3zj06{color:var(--symbol-color)}";
	append(document.head, style);
}

function create_fragment$h(ctx) {
	let li;
	let jsonkey;
	let t0;
	let span;

	let t1_value = (/*valueGetter*/ ctx[2]
	? /*valueGetter*/ ctx[2](/*value*/ ctx[1])
	: /*value*/ ctx[1]) + "";

	let t1;
	let span_class_value;
	let current;

	jsonkey = new JSONKey({
			props: {
				key: /*key*/ ctx[0],
				colon: /*colon*/ ctx[6],
				isParentExpanded: /*isParentExpanded*/ ctx[3],
				isParentArray: /*isParentArray*/ ctx[4]
			}
		});

	return {
		c() {
			li = element("li");
			create_component(jsonkey.$$.fragment);
			t0 = space();
			span = element("span");
			t1 = text(t1_value);
			attr(span, "class", span_class_value = "" + (null_to_empty(/*nodeType*/ ctx[5]) + " svelte-1m3zj06"));
			attr(li, "class", "svelte-1m3zj06");
			toggle_class(li, "indent", /*isParentExpanded*/ ctx[3]);
		},
		m(target, anchor) {
			insert(target, li, anchor);
			mount_component(jsonkey, li, null);
			append(li, t0);
			append(li, span);
			append(span, t1);
			current = true;
		},
		p(ctx, [dirty]) {
			const jsonkey_changes = {};
			if (dirty & /*key*/ 1) jsonkey_changes.key = /*key*/ ctx[0];
			if (dirty & /*isParentExpanded*/ 8) jsonkey_changes.isParentExpanded = /*isParentExpanded*/ ctx[3];
			if (dirty & /*isParentArray*/ 16) jsonkey_changes.isParentArray = /*isParentArray*/ ctx[4];
			jsonkey.$set(jsonkey_changes);

			if ((!current || dirty & /*valueGetter, value*/ 6) && t1_value !== (t1_value = (/*valueGetter*/ ctx[2]
			? /*valueGetter*/ ctx[2](/*value*/ ctx[1])
			: /*value*/ ctx[1]) + "")) set_data(t1, t1_value);

			if (!current || dirty & /*nodeType*/ 32 && span_class_value !== (span_class_value = "" + (null_to_empty(/*nodeType*/ ctx[5]) + " svelte-1m3zj06"))) {
				attr(span, "class", span_class_value);
			}

			if (dirty & /*isParentExpanded*/ 8) {
				toggle_class(li, "indent", /*isParentExpanded*/ ctx[3]);
			}
		},
		i(local) {
			if (current) return;
			transition_in(jsonkey.$$.fragment, local);
			current = true;
		},
		o(local) {
			transition_out(jsonkey.$$.fragment, local);
			current = false;
		},
		d(detaching) {
			if (detaching) detach(li);
			destroy_component(jsonkey);
		}
	};
}

function instance$g($$self, $$props, $$invalidate) {
	let { key } = $$props,
		{ value } = $$props,
		{ valueGetter = null } = $$props,
		{ isParentExpanded } = $$props,
		{ isParentArray } = $$props,
		{ nodeType } = $$props;

	const { colon } = getContext(contextKey);

	$$self.$set = $$props => {
		if ("key" in $$props) $$invalidate(0, key = $$props.key);
		if ("value" in $$props) $$invalidate(1, value = $$props.value);
		if ("valueGetter" in $$props) $$invalidate(2, valueGetter = $$props.valueGetter);
		if ("isParentExpanded" in $$props) $$invalidate(3, isParentExpanded = $$props.isParentExpanded);
		if ("isParentArray" in $$props) $$invalidate(4, isParentArray = $$props.isParentArray);
		if ("nodeType" in $$props) $$invalidate(5, nodeType = $$props.nodeType);
	};

	return [key, value, valueGetter, isParentExpanded, isParentArray, nodeType, colon];
}

class JSONValueNode extends SvelteComponent {
	constructor(options) {
		super();
		if (!document.getElementById("svelte-1m3zj06-style")) add_css$c();

		init(this, options, instance$g, create_fragment$h, safe_not_equal, {
			key: 0,
			value: 1,
			valueGetter: 2,
			isParentExpanded: 3,
			isParentArray: 4,
			nodeType: 5
		});
	}
}

/* node_modules/svelte-json-tree/src/ErrorNode.svelte generated by Svelte v3.24.0 */

function add_css$d() {
	var style = element("style");
	style.id = "svelte-zydcof-style";
	style.textContent = "li.svelte-zydcof{user-select:text;word-wrap:break-word;word-break:break-all}.indent.svelte-zydcof{margin-left:var(--li-identation)}.collapse.svelte-zydcof{--li-display:inline;display:inline;font-style:italic}";
	append(document.head, style);
}

function get_each_context$3(ctx, list, i) {
	const child_ctx = ctx.slice();
	child_ctx[8] = list[i];
	child_ctx[10] = i;
	return child_ctx;
}

// (40:2) {#if isParentExpanded}
function create_if_block_2$4(ctx) {
	let jsonarrow;
	let current;
	jsonarrow = new JSONArrow({ props: { expanded: /*expanded*/ ctx[0] } });
	jsonarrow.$on("click", /*toggleExpand*/ ctx[7]);

	return {
		c() {
			create_component(jsonarrow.$$.fragment);
		},
		m(target, anchor) {
			mount_component(jsonarrow, target, anchor);
			current = true;
		},
		p(ctx, dirty) {
			const jsonarrow_changes = {};
			if (dirty & /*expanded*/ 1) jsonarrow_changes.expanded = /*expanded*/ ctx[0];
			jsonarrow.$set(jsonarrow_changes);
		},
		i(local) {
			if (current) return;
			transition_in(jsonarrow.$$.fragment, local);
			current = true;
		},
		o(local) {
			transition_out(jsonarrow.$$.fragment, local);
			current = false;
		},
		d(detaching) {
			destroy_component(jsonarrow, detaching);
		}
	};
}

// (45:2) {#if isParentExpanded}
function create_if_block$8(ctx) {
	let ul;
	let current;
	let if_block = /*expanded*/ ctx[0] && create_if_block_1$5(ctx);

	return {
		c() {
			ul = element("ul");
			if (if_block) if_block.c();
			attr(ul, "class", "svelte-zydcof");
			toggle_class(ul, "collapse", !/*expanded*/ ctx[0]);
		},
		m(target, anchor) {
			insert(target, ul, anchor);
			if (if_block) if_block.m(ul, null);
			current = true;
		},
		p(ctx, dirty) {
			if (/*expanded*/ ctx[0]) {
				if (if_block) {
					if_block.p(ctx, dirty);

					if (dirty & /*expanded*/ 1) {
						transition_in(if_block, 1);
					}
				} else {
					if_block = create_if_block_1$5(ctx);
					if_block.c();
					transition_in(if_block, 1);
					if_block.m(ul, null);
				}
			} else if (if_block) {
				group_outros();

				transition_out(if_block, 1, 1, () => {
					if_block = null;
				});

				check_outros();
			}

			if (dirty & /*expanded*/ 1) {
				toggle_class(ul, "collapse", !/*expanded*/ ctx[0]);
			}
		},
		i(local) {
			if (current) return;
			transition_in(if_block);
			current = true;
		},
		o(local) {
			transition_out(if_block);
			current = false;
		},
		d(detaching) {
			if (detaching) detach(ul);
			if (if_block) if_block.d();
		}
	};
}

// (47:6) {#if expanded}
function create_if_block_1$5(ctx) {
	let jsonnode;
	let t0;
	let li;
	let jsonkey;
	let t1;
	let span;
	let current;

	jsonnode = new JSONNode({
			props: {
				key: "message",
				value: /*value*/ ctx[2].message
			}
		});

	jsonkey = new JSONKey({
			props: {
				key: "stack",
				colon: ":",
				isParentExpanded: /*isParentExpanded*/ ctx[3]
			}
		});

	let each_value = /*stack*/ ctx[5];
	let each_blocks = [];

	for (let i = 0; i < each_value.length; i += 1) {
		each_blocks[i] = create_each_block$3(get_each_context$3(ctx, each_value, i));
	}

	return {
		c() {
			create_component(jsonnode.$$.fragment);
			t0 = space();
			li = element("li");
			create_component(jsonkey.$$.fragment);
			t1 = space();
			span = element("span");

			for (let i = 0; i < each_blocks.length; i += 1) {
				each_blocks[i].c();
			}

			attr(li, "class", "svelte-zydcof");
		},
		m(target, anchor) {
			mount_component(jsonnode, target, anchor);
			insert(target, t0, anchor);
			insert(target, li, anchor);
			mount_component(jsonkey, li, null);
			append(li, t1);
			append(li, span);

			for (let i = 0; i < each_blocks.length; i += 1) {
				each_blocks[i].m(span, null);
			}

			current = true;
		},
		p(ctx, dirty) {
			const jsonnode_changes = {};
			if (dirty & /*value*/ 4) jsonnode_changes.value = /*value*/ ctx[2].message;
			jsonnode.$set(jsonnode_changes);
			const jsonkey_changes = {};
			if (dirty & /*isParentExpanded*/ 8) jsonkey_changes.isParentExpanded = /*isParentExpanded*/ ctx[3];
			jsonkey.$set(jsonkey_changes);

			if (dirty & /*stack*/ 32) {
				each_value = /*stack*/ ctx[5];
				let i;

				for (i = 0; i < each_value.length; i += 1) {
					const child_ctx = get_each_context$3(ctx, each_value, i);

					if (each_blocks[i]) {
						each_blocks[i].p(child_ctx, dirty);
					} else {
						each_blocks[i] = create_each_block$3(child_ctx);
						each_blocks[i].c();
						each_blocks[i].m(span, null);
					}
				}

				for (; i < each_blocks.length; i += 1) {
					each_blocks[i].d(1);
				}

				each_blocks.length = each_value.length;
			}
		},
		i(local) {
			if (current) return;
			transition_in(jsonnode.$$.fragment, local);
			transition_in(jsonkey.$$.fragment, local);
			current = true;
		},
		o(local) {
			transition_out(jsonnode.$$.fragment, local);
			transition_out(jsonkey.$$.fragment, local);
			current = false;
		},
		d(detaching) {
			destroy_component(jsonnode, detaching);
			if (detaching) detach(t0);
			if (detaching) detach(li);
			destroy_component(jsonkey);
			destroy_each(each_blocks, detaching);
		}
	};
}

// (52:12) {#each stack as line, index}
function create_each_block$3(ctx) {
	let span;
	let t_value = /*line*/ ctx[8] + "";
	let t;
	let br;

	return {
		c() {
			span = element("span");
			t = text(t_value);
			br = element("br");
			attr(span, "class", "svelte-zydcof");
			toggle_class(span, "indent", /*index*/ ctx[10] > 0);
		},
		m(target, anchor) {
			insert(target, span, anchor);
			append(span, t);
			insert(target, br, anchor);
		},
		p(ctx, dirty) {
			if (dirty & /*stack*/ 32 && t_value !== (t_value = /*line*/ ctx[8] + "")) set_data(t, t_value);
		},
		d(detaching) {
			if (detaching) detach(span);
			if (detaching) detach(br);
		}
	};
}

function create_fragment$i(ctx) {
	let li;
	let t0;
	let jsonkey;
	let t1;
	let span;
	let t2;
	let t3_value = (/*expanded*/ ctx[0] ? "" : /*value*/ ctx[2].message) + "";
	let t3;
	let t4;
	let current;
	let mounted;
	let dispose;
	let if_block0 = /*isParentExpanded*/ ctx[3] && create_if_block_2$4(ctx);

	jsonkey = new JSONKey({
			props: {
				key: /*key*/ ctx[1],
				colon: /*context*/ ctx[6].colon,
				isParentExpanded: /*isParentExpanded*/ ctx[3],
				isParentArray: /*isParentArray*/ ctx[4]
			}
		});

	let if_block1 = /*isParentExpanded*/ ctx[3] && create_if_block$8(ctx);

	return {
		c() {
			li = element("li");
			if (if_block0) if_block0.c();
			t0 = space();
			create_component(jsonkey.$$.fragment);
			t1 = space();
			span = element("span");
			t2 = text("Error: ");
			t3 = text(t3_value);
			t4 = space();
			if (if_block1) if_block1.c();
			attr(li, "class", "svelte-zydcof");
			toggle_class(li, "indent", /*isParentExpanded*/ ctx[3]);
		},
		m(target, anchor) {
			insert(target, li, anchor);
			if (if_block0) if_block0.m(li, null);
			append(li, t0);
			mount_component(jsonkey, li, null);
			append(li, t1);
			append(li, span);
			append(span, t2);
			append(span, t3);
			append(li, t4);
			if (if_block1) if_block1.m(li, null);
			current = true;

			if (!mounted) {
				dispose = listen(span, "click", /*toggleExpand*/ ctx[7]);
				mounted = true;
			}
		},
		p(ctx, [dirty]) {
			if (/*isParentExpanded*/ ctx[3]) {
				if (if_block0) {
					if_block0.p(ctx, dirty);

					if (dirty & /*isParentExpanded*/ 8) {
						transition_in(if_block0, 1);
					}
				} else {
					if_block0 = create_if_block_2$4(ctx);
					if_block0.c();
					transition_in(if_block0, 1);
					if_block0.m(li, t0);
				}
			} else if (if_block0) {
				group_outros();

				transition_out(if_block0, 1, 1, () => {
					if_block0 = null;
				});

				check_outros();
			}

			const jsonkey_changes = {};
			if (dirty & /*key*/ 2) jsonkey_changes.key = /*key*/ ctx[1];
			if (dirty & /*isParentExpanded*/ 8) jsonkey_changes.isParentExpanded = /*isParentExpanded*/ ctx[3];
			if (dirty & /*isParentArray*/ 16) jsonkey_changes.isParentArray = /*isParentArray*/ ctx[4];
			jsonkey.$set(jsonkey_changes);
			if ((!current || dirty & /*expanded, value*/ 5) && t3_value !== (t3_value = (/*expanded*/ ctx[0] ? "" : /*value*/ ctx[2].message) + "")) set_data(t3, t3_value);

			if (/*isParentExpanded*/ ctx[3]) {
				if (if_block1) {
					if_block1.p(ctx, dirty);

					if (dirty & /*isParentExpanded*/ 8) {
						transition_in(if_block1, 1);
					}
				} else {
					if_block1 = create_if_block$8(ctx);
					if_block1.c();
					transition_in(if_block1, 1);
					if_block1.m(li, null);
				}
			} else if (if_block1) {
				group_outros();

				transition_out(if_block1, 1, 1, () => {
					if_block1 = null;
				});

				check_outros();
			}

			if (dirty & /*isParentExpanded*/ 8) {
				toggle_class(li, "indent", /*isParentExpanded*/ ctx[3]);
			}
		},
		i(local) {
			if (current) return;
			transition_in(if_block0);
			transition_in(jsonkey.$$.fragment, local);
			transition_in(if_block1);
			current = true;
		},
		o(local) {
			transition_out(if_block0);
			transition_out(jsonkey.$$.fragment, local);
			transition_out(if_block1);
			current = false;
		},
		d(detaching) {
			if (detaching) detach(li);
			if (if_block0) if_block0.d();
			destroy_component(jsonkey);
			if (if_block1) if_block1.d();
			mounted = false;
			dispose();
		}
	};
}

function instance$h($$self, $$props, $$invalidate) {
	let { key } = $$props,
		{ value } = $$props,
		{ isParentExpanded } = $$props,
		{ isParentArray } = $$props;

	let { expanded = false } = $$props;
	const context = getContext(contextKey);
	setContext(contextKey, { ...context, colon: ":" });

	function toggleExpand() {
		$$invalidate(0, expanded = !expanded);
	}

	$$self.$set = $$props => {
		if ("key" in $$props) $$invalidate(1, key = $$props.key);
		if ("value" in $$props) $$invalidate(2, value = $$props.value);
		if ("isParentExpanded" in $$props) $$invalidate(3, isParentExpanded = $$props.isParentExpanded);
		if ("isParentArray" in $$props) $$invalidate(4, isParentArray = $$props.isParentArray);
		if ("expanded" in $$props) $$invalidate(0, expanded = $$props.expanded);
	};

	let stack;

	$$self.$$.update = () => {
		if ($$self.$$.dirty & /*value*/ 4) {
			 $$invalidate(5, stack = value.stack.split("\n"));
		}

		if ($$self.$$.dirty & /*isParentExpanded*/ 8) {
			 if (!isParentExpanded) {
				$$invalidate(0, expanded = false);
			}
		}
	};

	return [
		expanded,
		key,
		value,
		isParentExpanded,
		isParentArray,
		stack,
		context,
		toggleExpand
	];
}

class ErrorNode extends SvelteComponent {
	constructor(options) {
		super();
		if (!document.getElementById("svelte-zydcof-style")) add_css$d();

		init(this, options, instance$h, create_fragment$i, safe_not_equal, {
			key: 1,
			value: 2,
			isParentExpanded: 3,
			isParentArray: 4,
			expanded: 0
		});
	}
}

/* node_modules/svelte-json-tree/src/JSONNode.svelte generated by Svelte v3.24.0 */

function create_else_block_1(ctx) {
	let jsonvaluenode;
	let current;

	jsonvaluenode = new JSONValueNode({
			props: {
				key: /*key*/ ctx[0],
				value: /*value*/ ctx[1],
				isParentExpanded: /*isParentExpanded*/ ctx[2],
				isParentArray: /*isParentArray*/ ctx[3],
				nodeType: /*nodeType*/ ctx[4],
				valueGetter: /*func_6*/ ctx[5]
			}
		});

	return {
		c() {
			create_component(jsonvaluenode.$$.fragment);
		},
		m(target, anchor) {
			mount_component(jsonvaluenode, target, anchor);
			current = true;
		},
		p(ctx, dirty) {
			const jsonvaluenode_changes = {};
			if (dirty & /*key*/ 1) jsonvaluenode_changes.key = /*key*/ ctx[0];
			if (dirty & /*value*/ 2) jsonvaluenode_changes.value = /*value*/ ctx[1];
			if (dirty & /*isParentExpanded*/ 4) jsonvaluenode_changes.isParentExpanded = /*isParentExpanded*/ ctx[2];
			if (dirty & /*isParentArray*/ 8) jsonvaluenode_changes.isParentArray = /*isParentArray*/ ctx[3];
			jsonvaluenode.$set(jsonvaluenode_changes);
		},
		i(local) {
			if (current) return;
			transition_in(jsonvaluenode.$$.fragment, local);
			current = true;
		},
		o(local) {
			transition_out(jsonvaluenode.$$.fragment, local);
			current = false;
		},
		d(detaching) {
			destroy_component(jsonvaluenode, detaching);
		}
	};
}

// (41:59) 
function create_if_block_12(ctx) {
	let jsonvaluenode;
	let current;

	jsonvaluenode = new JSONValueNode({
			props: {
				key: /*key*/ ctx[0],
				value: /*value*/ ctx[1],
				isParentExpanded: /*isParentExpanded*/ ctx[2],
				isParentArray: /*isParentArray*/ ctx[3],
				nodeType: /*nodeType*/ ctx[4],
				valueGetter: func_5
			}
		});

	return {
		c() {
			create_component(jsonvaluenode.$$.fragment);
		},
		m(target, anchor) {
			mount_component(jsonvaluenode, target, anchor);
			current = true;
		},
		p(ctx, dirty) {
			const jsonvaluenode_changes = {};
			if (dirty & /*key*/ 1) jsonvaluenode_changes.key = /*key*/ ctx[0];
			if (dirty & /*value*/ 2) jsonvaluenode_changes.value = /*value*/ ctx[1];
			if (dirty & /*isParentExpanded*/ 4) jsonvaluenode_changes.isParentExpanded = /*isParentExpanded*/ ctx[2];
			if (dirty & /*isParentArray*/ 8) jsonvaluenode_changes.isParentArray = /*isParentArray*/ ctx[3];
			jsonvaluenode.$set(jsonvaluenode_changes);
		},
		i(local) {
			if (current) return;
			transition_in(jsonvaluenode.$$.fragment, local);
			current = true;
		},
		o(local) {
			transition_out(jsonvaluenode.$$.fragment, local);
			current = false;
		},
		d(detaching) {
			destroy_component(jsonvaluenode, detaching);
		}
	};
}

// (39:35) 
function create_if_block_11(ctx) {
	let jsonvaluenode;
	let current;

	jsonvaluenode = new JSONValueNode({
			props: {
				key: /*key*/ ctx[0],
				value: /*value*/ ctx[1],
				isParentExpanded: /*isParentExpanded*/ ctx[2],
				isParentArray: /*isParentArray*/ ctx[3],
				nodeType: /*nodeType*/ ctx[4],
				valueGetter: func_4
			}
		});

	return {
		c() {
			create_component(jsonvaluenode.$$.fragment);
		},
		m(target, anchor) {
			mount_component(jsonvaluenode, target, anchor);
			current = true;
		},
		p(ctx, dirty) {
			const jsonvaluenode_changes = {};
			if (dirty & /*key*/ 1) jsonvaluenode_changes.key = /*key*/ ctx[0];
			if (dirty & /*value*/ 2) jsonvaluenode_changes.value = /*value*/ ctx[1];
			if (dirty & /*isParentExpanded*/ 4) jsonvaluenode_changes.isParentExpanded = /*isParentExpanded*/ ctx[2];
			if (dirty & /*isParentArray*/ 8) jsonvaluenode_changes.isParentArray = /*isParentArray*/ ctx[3];
			jsonvaluenode.$set(jsonvaluenode_changes);
		},
		i(local) {
			if (current) return;
			transition_in(jsonvaluenode.$$.fragment, local);
			current = true;
		},
		o(local) {
			transition_out(jsonvaluenode.$$.fragment, local);
			current = false;
		},
		d(detaching) {
			destroy_component(jsonvaluenode, detaching);
		}
	};
}

// (37:30) 
function create_if_block_10(ctx) {
	let jsonvaluenode;
	let current;

	jsonvaluenode = new JSONValueNode({
			props: {
				key: /*key*/ ctx[0],
				value: /*value*/ ctx[1],
				isParentExpanded: /*isParentExpanded*/ ctx[2],
				isParentArray: /*isParentArray*/ ctx[3],
				nodeType: /*nodeType*/ ctx[4],
				valueGetter: func_3
			}
		});

	return {
		c() {
			create_component(jsonvaluenode.$$.fragment);
		},
		m(target, anchor) {
			mount_component(jsonvaluenode, target, anchor);
			current = true;
		},
		p(ctx, dirty) {
			const jsonvaluenode_changes = {};
			if (dirty & /*key*/ 1) jsonvaluenode_changes.key = /*key*/ ctx[0];
			if (dirty & /*value*/ 2) jsonvaluenode_changes.value = /*value*/ ctx[1];
			if (dirty & /*isParentExpanded*/ 4) jsonvaluenode_changes.isParentExpanded = /*isParentExpanded*/ ctx[2];
			if (dirty & /*isParentArray*/ 8) jsonvaluenode_changes.isParentArray = /*isParentArray*/ ctx[3];
			jsonvaluenode.$set(jsonvaluenode_changes);
		},
		i(local) {
			if (current) return;
			transition_in(jsonvaluenode.$$.fragment, local);
			current = true;
		},
		o(local) {
			transition_out(jsonvaluenode.$$.fragment, local);
			current = false;
		},
		d(detaching) {
			destroy_component(jsonvaluenode, detaching);
		}
	};
}

// (35:30) 
function create_if_block_9(ctx) {
	let jsonvaluenode;
	let current;

	jsonvaluenode = new JSONValueNode({
			props: {
				key: /*key*/ ctx[0],
				value: /*value*/ ctx[1],
				isParentExpanded: /*isParentExpanded*/ ctx[2],
				isParentArray: /*isParentArray*/ ctx[3],
				nodeType: /*nodeType*/ ctx[4],
				valueGetter: func_2
			}
		});

	return {
		c() {
			create_component(jsonvaluenode.$$.fragment);
		},
		m(target, anchor) {
			mount_component(jsonvaluenode, target, anchor);
			current = true;
		},
		p(ctx, dirty) {
			const jsonvaluenode_changes = {};
			if (dirty & /*key*/ 1) jsonvaluenode_changes.key = /*key*/ ctx[0];
			if (dirty & /*value*/ 2) jsonvaluenode_changes.value = /*value*/ ctx[1];
			if (dirty & /*isParentExpanded*/ 4) jsonvaluenode_changes.isParentExpanded = /*isParentExpanded*/ ctx[2];
			if (dirty & /*isParentArray*/ 8) jsonvaluenode_changes.isParentArray = /*isParentArray*/ ctx[3];
			jsonvaluenode.$set(jsonvaluenode_changes);
		},
		i(local) {
			if (current) return;
			transition_in(jsonvaluenode.$$.fragment, local);
			current = true;
		},
		o(local) {
			transition_out(jsonvaluenode.$$.fragment, local);
			current = false;
		},
		d(detaching) {
			destroy_component(jsonvaluenode, detaching);
		}
	};
}

// (33:33) 
function create_if_block_8(ctx) {
	let jsonvaluenode;
	let current;

	jsonvaluenode = new JSONValueNode({
			props: {
				key: /*key*/ ctx[0],
				value: /*value*/ ctx[1],
				isParentExpanded: /*isParentExpanded*/ ctx[2],
				isParentArray: /*isParentArray*/ ctx[3],
				nodeType: /*nodeType*/ ctx[4],
				valueGetter: func_1
			}
		});

	return {
		c() {
			create_component(jsonvaluenode.$$.fragment);
		},
		m(target, anchor) {
			mount_component(jsonvaluenode, target, anchor);
			current = true;
		},
		p(ctx, dirty) {
			const jsonvaluenode_changes = {};
			if (dirty & /*key*/ 1) jsonvaluenode_changes.key = /*key*/ ctx[0];
			if (dirty & /*value*/ 2) jsonvaluenode_changes.value = /*value*/ ctx[1];
			if (dirty & /*isParentExpanded*/ 4) jsonvaluenode_changes.isParentExpanded = /*isParentExpanded*/ ctx[2];
			if (dirty & /*isParentArray*/ 8) jsonvaluenode_changes.isParentArray = /*isParentArray*/ ctx[3];
			jsonvaluenode.$set(jsonvaluenode_changes);
		},
		i(local) {
			if (current) return;
			transition_in(jsonvaluenode.$$.fragment, local);
			current = true;
		},
		o(local) {
			transition_out(jsonvaluenode.$$.fragment, local);
			current = false;
		},
		d(detaching) {
			destroy_component(jsonvaluenode, detaching);
		}
	};
}

// (31:32) 
function create_if_block_7(ctx) {
	let jsonvaluenode;
	let current;

	jsonvaluenode = new JSONValueNode({
			props: {
				key: /*key*/ ctx[0],
				value: /*value*/ ctx[1],
				isParentExpanded: /*isParentExpanded*/ ctx[2],
				isParentArray: /*isParentArray*/ ctx[3],
				nodeType: /*nodeType*/ ctx[4]
			}
		});

	return {
		c() {
			create_component(jsonvaluenode.$$.fragment);
		},
		m(target, anchor) {
			mount_component(jsonvaluenode, target, anchor);
			current = true;
		},
		p(ctx, dirty) {
			const jsonvaluenode_changes = {};
			if (dirty & /*key*/ 1) jsonvaluenode_changes.key = /*key*/ ctx[0];
			if (dirty & /*value*/ 2) jsonvaluenode_changes.value = /*value*/ ctx[1];
			if (dirty & /*isParentExpanded*/ 4) jsonvaluenode_changes.isParentExpanded = /*isParentExpanded*/ ctx[2];
			if (dirty & /*isParentArray*/ 8) jsonvaluenode_changes.isParentArray = /*isParentArray*/ ctx[3];
			jsonvaluenode.$set(jsonvaluenode_changes);
		},
		i(local) {
			if (current) return;
			transition_in(jsonvaluenode.$$.fragment, local);
			current = true;
		},
		o(local) {
			transition_out(jsonvaluenode.$$.fragment, local);
			current = false;
		},
		d(detaching) {
			destroy_component(jsonvaluenode, detaching);
		}
	};
}

// (29:32) 
function create_if_block_6(ctx) {
	let jsonvaluenode;
	let current;

	jsonvaluenode = new JSONValueNode({
			props: {
				key: /*key*/ ctx[0],
				value: /*value*/ ctx[1],
				isParentExpanded: /*isParentExpanded*/ ctx[2],
				isParentArray: /*isParentArray*/ ctx[3],
				nodeType: /*nodeType*/ ctx[4],
				valueGetter: func
			}
		});

	return {
		c() {
			create_component(jsonvaluenode.$$.fragment);
		},
		m(target, anchor) {
			mount_component(jsonvaluenode, target, anchor);
			current = true;
		},
		p(ctx, dirty) {
			const jsonvaluenode_changes = {};
			if (dirty & /*key*/ 1) jsonvaluenode_changes.key = /*key*/ ctx[0];
			if (dirty & /*value*/ 2) jsonvaluenode_changes.value = /*value*/ ctx[1];
			if (dirty & /*isParentExpanded*/ 4) jsonvaluenode_changes.isParentExpanded = /*isParentExpanded*/ ctx[2];
			if (dirty & /*isParentArray*/ 8) jsonvaluenode_changes.isParentArray = /*isParentArray*/ ctx[3];
			jsonvaluenode.$set(jsonvaluenode_changes);
		},
		i(local) {
			if (current) return;
			transition_in(jsonvaluenode.$$.fragment, local);
			current = true;
		},
		o(local) {
			transition_out(jsonvaluenode.$$.fragment, local);
			current = false;
		},
		d(detaching) {
			destroy_component(jsonvaluenode, detaching);
		}
	};
}

// (27:34) 
function create_if_block_5(ctx) {
	let jsonmapentrynode;
	let current;

	jsonmapentrynode = new JSONMapEntryNode({
			props: {
				key: /*key*/ ctx[0],
				value: /*value*/ ctx[1],
				isParentExpanded: /*isParentExpanded*/ ctx[2],
				isParentArray: /*isParentArray*/ ctx[3],
				nodeType: /*nodeType*/ ctx[4]
			}
		});

	return {
		c() {
			create_component(jsonmapentrynode.$$.fragment);
		},
		m(target, anchor) {
			mount_component(jsonmapentrynode, target, anchor);
			current = true;
		},
		p(ctx, dirty) {
			const jsonmapentrynode_changes = {};
			if (dirty & /*key*/ 1) jsonmapentrynode_changes.key = /*key*/ ctx[0];
			if (dirty & /*value*/ 2) jsonmapentrynode_changes.value = /*value*/ ctx[1];
			if (dirty & /*isParentExpanded*/ 4) jsonmapentrynode_changes.isParentExpanded = /*isParentExpanded*/ ctx[2];
			if (dirty & /*isParentArray*/ 8) jsonmapentrynode_changes.isParentArray = /*isParentArray*/ ctx[3];
			jsonmapentrynode.$set(jsonmapentrynode_changes);
		},
		i(local) {
			if (current) return;
			transition_in(jsonmapentrynode.$$.fragment, local);
			current = true;
		},
		o(local) {
			transition_out(jsonmapentrynode.$$.fragment, local);
			current = false;
		},
		d(detaching) {
			destroy_component(jsonmapentrynode, detaching);
		}
	};
}

// (21:78) 
function create_if_block_3$1(ctx) {
	let current_block_type_index;
	let if_block;
	let if_block_anchor;
	let current;
	const if_block_creators = [create_if_block_4, create_else_block$4];
	const if_blocks = [];

	function select_block_type_1(ctx, dirty) {
		if (typeof /*value*/ ctx[1].set === "function") return 0;
		return 1;
	}

	current_block_type_index = select_block_type_1(ctx);
	if_block = if_blocks[current_block_type_index] = if_block_creators[current_block_type_index](ctx);

	return {
		c() {
			if_block.c();
			if_block_anchor = empty();
		},
		m(target, anchor) {
			if_blocks[current_block_type_index].m(target, anchor);
			insert(target, if_block_anchor, anchor);
			current = true;
		},
		p(ctx, dirty) {
			let previous_block_index = current_block_type_index;
			current_block_type_index = select_block_type_1(ctx);

			if (current_block_type_index === previous_block_index) {
				if_blocks[current_block_type_index].p(ctx, dirty);
			} else {
				group_outros();

				transition_out(if_blocks[previous_block_index], 1, 1, () => {
					if_blocks[previous_block_index] = null;
				});

				check_outros();
				if_block = if_blocks[current_block_type_index];

				if (!if_block) {
					if_block = if_blocks[current_block_type_index] = if_block_creators[current_block_type_index](ctx);
					if_block.c();
				}

				transition_in(if_block, 1);
				if_block.m(if_block_anchor.parentNode, if_block_anchor);
			}
		},
		i(local) {
			if (current) return;
			transition_in(if_block);
			current = true;
		},
		o(local) {
			transition_out(if_block);
			current = false;
		},
		d(detaching) {
			if_blocks[current_block_type_index].d(detaching);
			if (detaching) detach(if_block_anchor);
		}
	};
}

// (19:31) 
function create_if_block_2$5(ctx) {
	let jsonarraynode;
	let current;

	jsonarraynode = new JSONArrayNode({
			props: {
				key: /*key*/ ctx[0],
				value: /*value*/ ctx[1],
				isParentExpanded: /*isParentExpanded*/ ctx[2],
				isParentArray: /*isParentArray*/ ctx[3]
			}
		});

	return {
		c() {
			create_component(jsonarraynode.$$.fragment);
		},
		m(target, anchor) {
			mount_component(jsonarraynode, target, anchor);
			current = true;
		},
		p(ctx, dirty) {
			const jsonarraynode_changes = {};
			if (dirty & /*key*/ 1) jsonarraynode_changes.key = /*key*/ ctx[0];
			if (dirty & /*value*/ 2) jsonarraynode_changes.value = /*value*/ ctx[1];
			if (dirty & /*isParentExpanded*/ 4) jsonarraynode_changes.isParentExpanded = /*isParentExpanded*/ ctx[2];
			if (dirty & /*isParentArray*/ 8) jsonarraynode_changes.isParentArray = /*isParentArray*/ ctx[3];
			jsonarraynode.$set(jsonarraynode_changes);
		},
		i(local) {
			if (current) return;
			transition_in(jsonarraynode.$$.fragment, local);
			current = true;
		},
		o(local) {
			transition_out(jsonarraynode.$$.fragment, local);
			current = false;
		},
		d(detaching) {
			destroy_component(jsonarraynode, detaching);
		}
	};
}

// (17:31) 
function create_if_block_1$6(ctx) {
	let errornode;
	let current;

	errornode = new ErrorNode({
			props: {
				key: /*key*/ ctx[0],
				value: /*value*/ ctx[1],
				isParentExpanded: /*isParentExpanded*/ ctx[2],
				isParentArray: /*isParentArray*/ ctx[3]
			}
		});

	return {
		c() {
			create_component(errornode.$$.fragment);
		},
		m(target, anchor) {
			mount_component(errornode, target, anchor);
			current = true;
		},
		p(ctx, dirty) {
			const errornode_changes = {};
			if (dirty & /*key*/ 1) errornode_changes.key = /*key*/ ctx[0];
			if (dirty & /*value*/ 2) errornode_changes.value = /*value*/ ctx[1];
			if (dirty & /*isParentExpanded*/ 4) errornode_changes.isParentExpanded = /*isParentExpanded*/ ctx[2];
			if (dirty & /*isParentArray*/ 8) errornode_changes.isParentArray = /*isParentArray*/ ctx[3];
			errornode.$set(errornode_changes);
		},
		i(local) {
			if (current) return;
			transition_in(errornode.$$.fragment, local);
			current = true;
		},
		o(local) {
			transition_out(errornode.$$.fragment, local);
			current = false;
		},
		d(detaching) {
			destroy_component(errornode, detaching);
		}
	};
}

// (15:0) {#if nodeType === 'Object'}
function create_if_block$9(ctx) {
	let jsonobjectnode;
	let current;

	jsonobjectnode = new JSONObjectNode({
			props: {
				key: /*key*/ ctx[0],
				value: /*value*/ ctx[1],
				isParentExpanded: /*isParentExpanded*/ ctx[2],
				isParentArray: /*isParentArray*/ ctx[3],
				nodeType: /*nodeType*/ ctx[4]
			}
		});

	return {
		c() {
			create_component(jsonobjectnode.$$.fragment);
		},
		m(target, anchor) {
			mount_component(jsonobjectnode, target, anchor);
			current = true;
		},
		p(ctx, dirty) {
			const jsonobjectnode_changes = {};
			if (dirty & /*key*/ 1) jsonobjectnode_changes.key = /*key*/ ctx[0];
			if (dirty & /*value*/ 2) jsonobjectnode_changes.value = /*value*/ ctx[1];
			if (dirty & /*isParentExpanded*/ 4) jsonobjectnode_changes.isParentExpanded = /*isParentExpanded*/ ctx[2];
			if (dirty & /*isParentArray*/ 8) jsonobjectnode_changes.isParentArray = /*isParentArray*/ ctx[3];
			jsonobjectnode.$set(jsonobjectnode_changes);
		},
		i(local) {
			if (current) return;
			transition_in(jsonobjectnode.$$.fragment, local);
			current = true;
		},
		o(local) {
			transition_out(jsonobjectnode.$$.fragment, local);
			current = false;
		},
		d(detaching) {
			destroy_component(jsonobjectnode, detaching);
		}
	};
}

// (24:2) {:else}
function create_else_block$4(ctx) {
	let jsoniterablearraynode;
	let current;

	jsoniterablearraynode = new JSONIterableArrayNode({
			props: {
				key: /*key*/ ctx[0],
				value: /*value*/ ctx[1],
				isParentExpanded: /*isParentExpanded*/ ctx[2],
				isParentArray: /*isParentArray*/ ctx[3],
				nodeType: /*nodeType*/ ctx[4]
			}
		});

	return {
		c() {
			create_component(jsoniterablearraynode.$$.fragment);
		},
		m(target, anchor) {
			mount_component(jsoniterablearraynode, target, anchor);
			current = true;
		},
		p(ctx, dirty) {
			const jsoniterablearraynode_changes = {};
			if (dirty & /*key*/ 1) jsoniterablearraynode_changes.key = /*key*/ ctx[0];
			if (dirty & /*value*/ 2) jsoniterablearraynode_changes.value = /*value*/ ctx[1];
			if (dirty & /*isParentExpanded*/ 4) jsoniterablearraynode_changes.isParentExpanded = /*isParentExpanded*/ ctx[2];
			if (dirty & /*isParentArray*/ 8) jsoniterablearraynode_changes.isParentArray = /*isParentArray*/ ctx[3];
			jsoniterablearraynode.$set(jsoniterablearraynode_changes);
		},
		i(local) {
			if (current) return;
			transition_in(jsoniterablearraynode.$$.fragment, local);
			current = true;
		},
		o(local) {
			transition_out(jsoniterablearraynode.$$.fragment, local);
			current = false;
		},
		d(detaching) {
			destroy_component(jsoniterablearraynode, detaching);
		}
	};
}

// (22:2) {#if typeof value.set === 'function'}
function create_if_block_4(ctx) {
	let jsoniterablemapnode;
	let current;

	jsoniterablemapnode = new JSONIterableMapNode({
			props: {
				key: /*key*/ ctx[0],
				value: /*value*/ ctx[1],
				isParentExpanded: /*isParentExpanded*/ ctx[2],
				isParentArray: /*isParentArray*/ ctx[3],
				nodeType: /*nodeType*/ ctx[4]
			}
		});

	return {
		c() {
			create_component(jsoniterablemapnode.$$.fragment);
		},
		m(target, anchor) {
			mount_component(jsoniterablemapnode, target, anchor);
			current = true;
		},
		p(ctx, dirty) {
			const jsoniterablemapnode_changes = {};
			if (dirty & /*key*/ 1) jsoniterablemapnode_changes.key = /*key*/ ctx[0];
			if (dirty & /*value*/ 2) jsoniterablemapnode_changes.value = /*value*/ ctx[1];
			if (dirty & /*isParentExpanded*/ 4) jsoniterablemapnode_changes.isParentExpanded = /*isParentExpanded*/ ctx[2];
			if (dirty & /*isParentArray*/ 8) jsoniterablemapnode_changes.isParentArray = /*isParentArray*/ ctx[3];
			jsoniterablemapnode.$set(jsoniterablemapnode_changes);
		},
		i(local) {
			if (current) return;
			transition_in(jsoniterablemapnode.$$.fragment, local);
			current = true;
		},
		o(local) {
			transition_out(jsoniterablemapnode.$$.fragment, local);
			current = false;
		},
		d(detaching) {
			destroy_component(jsoniterablemapnode, detaching);
		}
	};
}

function create_fragment$j(ctx) {
	let current_block_type_index;
	let if_block;
	let if_block_anchor;
	let current;

	const if_block_creators = [
		create_if_block$9,
		create_if_block_1$6,
		create_if_block_2$5,
		create_if_block_3$1,
		create_if_block_5,
		create_if_block_6,
		create_if_block_7,
		create_if_block_8,
		create_if_block_9,
		create_if_block_10,
		create_if_block_11,
		create_if_block_12,
		create_else_block_1
	];

	const if_blocks = [];

	function select_block_type(ctx, dirty) {
		if (/*nodeType*/ ctx[4] === "Object") return 0;
		if (/*nodeType*/ ctx[4] === "Error") return 1;
		if (/*nodeType*/ ctx[4] === "Array") return 2;
		if (/*nodeType*/ ctx[4] === "Iterable" || /*nodeType*/ ctx[4] === "Map" || /*nodeType*/ ctx[4] === "Set") return 3;
		if (/*nodeType*/ ctx[4] === "MapEntry") return 4;
		if (/*nodeType*/ ctx[4] === "String") return 5;
		if (/*nodeType*/ ctx[4] === "Number") return 6;
		if (/*nodeType*/ ctx[4] === "Boolean") return 7;
		if (/*nodeType*/ ctx[4] === "Date") return 8;
		if (/*nodeType*/ ctx[4] === "Null") return 9;
		if (/*nodeType*/ ctx[4] === "Undefined") return 10;
		if (/*nodeType*/ ctx[4] === "Function" || /*nodeType*/ ctx[4] === "Symbol") return 11;
		return 12;
	}

	current_block_type_index = select_block_type(ctx);
	if_block = if_blocks[current_block_type_index] = if_block_creators[current_block_type_index](ctx);

	return {
		c() {
			if_block.c();
			if_block_anchor = empty();
		},
		m(target, anchor) {
			if_blocks[current_block_type_index].m(target, anchor);
			insert(target, if_block_anchor, anchor);
			current = true;
		},
		p(ctx, [dirty]) {
			if_block.p(ctx, dirty);
		},
		i(local) {
			if (current) return;
			transition_in(if_block);
			current = true;
		},
		o(local) {
			transition_out(if_block);
			current = false;
		},
		d(detaching) {
			if_blocks[current_block_type_index].d(detaching);
			if (detaching) detach(if_block_anchor);
		}
	};
}

const func = raw => `"${raw}"`;
const func_1 = raw => raw ? "true" : "false";
const func_2 = raw => raw.toISOString();
const func_3 = () => "null";
const func_4 = () => "undefined";
const func_5 = raw => raw.toString();

function instance$i($$self, $$props, $$invalidate) {
	let { key } = $$props,
		{ value } = $$props,
		{ isParentExpanded } = $$props,
		{ isParentArray } = $$props;

	const nodeType = objType(value);
	const func_6 = () => `<${nodeType}>`;

	$$self.$set = $$props => {
		if ("key" in $$props) $$invalidate(0, key = $$props.key);
		if ("value" in $$props) $$invalidate(1, value = $$props.value);
		if ("isParentExpanded" in $$props) $$invalidate(2, isParentExpanded = $$props.isParentExpanded);
		if ("isParentArray" in $$props) $$invalidate(3, isParentArray = $$props.isParentArray);
	};

	return [key, value, isParentExpanded, isParentArray, nodeType, func_6];
}

class JSONNode extends SvelteComponent {
	constructor(options) {
		super();

		init(this, options, instance$i, create_fragment$j, safe_not_equal, {
			key: 0,
			value: 1,
			isParentExpanded: 2,
			isParentArray: 3
		});
	}
}

/* node_modules/svelte-json-tree/src/index.svelte generated by Svelte v3.24.0 */

function add_css$e() {
	var style = element("style");
	style.id = "svelte-fisoh6-style";
	style.textContent = "ul.svelte-fisoh6{--string-color:#cb3f41;--symbol-color:#cb3f41;--boolean-color:#112aa7;--function-color:#112aa7;--number-color:#3029cf;--label-color:#871d8f;--arrow-color:#727272;--null-color:#8d8d8d;--undefined-color:#8d8d8d;--date-color:#8d8d8d;--li-identation:1em;--li-colon-space:0.3em;font-size:var(--json-tree-font-size, 12px);font-family:'Courier New', Courier, monospace}ul.svelte-fisoh6 li{line-height:var(--li-line-height, 1.3);display:var(--li-display, list-item);list-style:none}ul.svelte-fisoh6,ul.svelte-fisoh6 ul{padding:0;margin:0}";
	append(document.head, style);
}

function create_fragment$k(ctx) {
	let ul;
	let jsonnode;
	let current;

	jsonnode = new JSONNode({
			props: {
				key: /*key*/ ctx[0],
				value: /*value*/ ctx[1],
				isParentExpanded: true,
				isParentArray: false
			}
		});

	return {
		c() {
			ul = element("ul");
			create_component(jsonnode.$$.fragment);
			attr(ul, "class", "svelte-fisoh6");
		},
		m(target, anchor) {
			insert(target, ul, anchor);
			mount_component(jsonnode, ul, null);
			current = true;
		},
		p(ctx, [dirty]) {
			const jsonnode_changes = {};
			if (dirty & /*key*/ 1) jsonnode_changes.key = /*key*/ ctx[0];
			if (dirty & /*value*/ 2) jsonnode_changes.value = /*value*/ ctx[1];
			jsonnode.$set(jsonnode_changes);
		},
		i(local) {
			if (current) return;
			transition_in(jsonnode.$$.fragment, local);
			current = true;
		},
		o(local) {
			transition_out(jsonnode.$$.fragment, local);
			current = false;
		},
		d(detaching) {
			if (detaching) detach(ul);
			destroy_component(jsonnode);
		}
	};
}

function instance$j($$self, $$props, $$invalidate) {
	setContext(contextKey, {});
	let { key = "" } = $$props, { value } = $$props;

	$$self.$set = $$props => {
		if ("key" in $$props) $$invalidate(0, key = $$props.key);
		if ("value" in $$props) $$invalidate(1, value = $$props.value);
	};

	return [key, value];
}

class Src extends SvelteComponent {
	constructor(options) {
		super();
		if (!document.getElementById("svelte-fisoh6-style")) add_css$e();
		init(this, options, instance$j, create_fragment$k, safe_not_equal, { key: 0, value: 1 });
	}
}

/* node_modules/@sveltejs/svelte-repl/src/Output/ConsoleTable.svelte generated by Svelte v3.24.0 */

function add_css$f() {
	var style = element("style");
	style.id = "svelte-12l2iaz-style";
	style.textContent = ".table.svelte-12l2iaz{margin:8px;overflow:auto;max-height:200px}table.svelte-12l2iaz{font-size:12px;font-family:var(--font-mono);border-collapse:collapse;line-height:1;border:1px solid #aaa}th.svelte-12l2iaz{background:#f3f3f3;padding:4px 8px;border:1px solid #aaa;position:sticky;top:0}td.svelte-12l2iaz{padding:2px 8px}tr.svelte-12l2iaz:nth-child(2n){background:#f2f7fd}th.svelte-12l2iaz,td.svelte-12l2iaz{border-right:1px solid #aaa}";
	append(document.head, style);
}

function get_each_context_1(ctx, list, i) {
	const child_ctx = ctx.slice();
	child_ctx[8] = list[i];
	return child_ctx;
}

function get_each_context$4(ctx, list, i) {
	const child_ctx = ctx.slice();
	child_ctx[5] = list[i];
	return child_ctx;
}

function get_each_context_2(ctx, list, i) {
	const child_ctx = ctx.slice();
	child_ctx[8] = list[i];
	return child_ctx;
}

// (32:4) {#each columns_to_render as column}
function create_each_block_2(ctx) {
	let th;
	let t_value = /*column*/ ctx[8] + "";
	let t;

	return {
		c() {
			th = element("th");
			t = text(t_value);
			attr(th, "class", "svelte-12l2iaz");
		},
		m(target, anchor) {
			insert(target, th, anchor);
			append(th, t);
		},
		p(ctx, dirty) {
			if (dirty & /*columns_to_render*/ 4 && t_value !== (t_value = /*column*/ ctx[8] + "")) set_data(t, t_value);
		},
		d(detaching) {
			if (detaching) detach(th);
		}
	};
}

// (47:6) {:else}
function create_else_block$5(ctx) {
	let td;

	return {
		c() {
			td = element("td");
			attr(td, "class", "svelte-12l2iaz");
		},
		m(target, anchor) {
			insert(target, td, anchor);
		},
		p: noop,
		i: noop,
		o: noop,
		d(detaching) {
			if (detaching) detach(td);
		}
	};
}

// (45:36) 
function create_if_block_2$6(ctx) {
	let td;
	let jsonnode;
	let current;

	jsonnode = new Src({
			props: {
				value: /*data*/ ctx[0][/*key*/ ctx[5]][/*column*/ ctx[8]]
			}
		});

	return {
		c() {
			td = element("td");
			create_component(jsonnode.$$.fragment);
			attr(td, "class", "svelte-12l2iaz");
		},
		m(target, anchor) {
			insert(target, td, anchor);
			mount_component(jsonnode, td, null);
			current = true;
		},
		p(ctx, dirty) {
			const jsonnode_changes = {};
			if (dirty & /*data, keys, columns_to_render*/ 7) jsonnode_changes.value = /*data*/ ctx[0][/*key*/ ctx[5]][/*column*/ ctx[8]];
			jsonnode.$set(jsonnode_changes);
		},
		i(local) {
			if (current) return;
			transition_in(jsonnode.$$.fragment, local);
			current = true;
		},
		o(local) {
			transition_out(jsonnode.$$.fragment, local);
			current = false;
		},
		d(detaching) {
			if (detaching) detach(td);
			destroy_component(jsonnode);
		}
	};
}

// (43:37) 
function create_if_block_1$7(ctx) {
	let td;
	let jsonnode;
	let current;

	jsonnode = new Src({
			props: { value: /*data*/ ctx[0][/*key*/ ctx[5]] }
		});

	return {
		c() {
			td = element("td");
			create_component(jsonnode.$$.fragment);
			attr(td, "class", "svelte-12l2iaz");
		},
		m(target, anchor) {
			insert(target, td, anchor);
			mount_component(jsonnode, td, null);
			current = true;
		},
		p(ctx, dirty) {
			const jsonnode_changes = {};
			if (dirty & /*data, keys*/ 3) jsonnode_changes.value = /*data*/ ctx[0][/*key*/ ctx[5]];
			jsonnode.$set(jsonnode_changes);
		},
		i(local) {
			if (current) return;
			transition_in(jsonnode.$$.fragment, local);
			current = true;
		},
		o(local) {
			transition_out(jsonnode.$$.fragment, local);
			current = false;
		},
		d(detaching) {
			if (detaching) detach(td);
			destroy_component(jsonnode);
		}
	};
}

// (41:6) {#if column === INDEX_KEY}
function create_if_block$a(ctx) {
	let td;
	let t_value = /*key*/ ctx[5] + "";
	let t;

	return {
		c() {
			td = element("td");
			t = text(t_value);
			attr(td, "class", "svelte-12l2iaz");
		},
		m(target, anchor) {
			insert(target, td, anchor);
			append(td, t);
		},
		p(ctx, dirty) {
			if (dirty & /*keys*/ 2 && t_value !== (t_value = /*key*/ ctx[5] + "")) set_data(t, t_value);
		},
		i: noop,
		o: noop,
		d(detaching) {
			if (detaching) detach(td);
		}
	};
}

// (40:5) {#each columns_to_render as column}
function create_each_block_1(ctx) {
	let current_block_type_index;
	let if_block;
	let if_block_anchor;
	let current;
	const if_block_creators = [create_if_block$a, create_if_block_1$7, create_if_block_2$6, create_else_block$5];
	const if_blocks = [];

	function select_block_type(ctx, dirty) {
		if (/*column*/ ctx[8] === INDEX_KEY) return 0;
		if (/*column*/ ctx[8] === VALUE_KEY) return 1;
		if (/*column*/ ctx[8] in /*data*/ ctx[0][/*key*/ ctx[5]]) return 2;
		return 3;
	}

	current_block_type_index = select_block_type(ctx);
	if_block = if_blocks[current_block_type_index] = if_block_creators[current_block_type_index](ctx);

	return {
		c() {
			if_block.c();
			if_block_anchor = empty();
		},
		m(target, anchor) {
			if_blocks[current_block_type_index].m(target, anchor);
			insert(target, if_block_anchor, anchor);
			current = true;
		},
		p(ctx, dirty) {
			let previous_block_index = current_block_type_index;
			current_block_type_index = select_block_type(ctx);

			if (current_block_type_index === previous_block_index) {
				if_blocks[current_block_type_index].p(ctx, dirty);
			} else {
				group_outros();

				transition_out(if_blocks[previous_block_index], 1, 1, () => {
					if_blocks[previous_block_index] = null;
				});

				check_outros();
				if_block = if_blocks[current_block_type_index];

				if (!if_block) {
					if_block = if_blocks[current_block_type_index] = if_block_creators[current_block_type_index](ctx);
					if_block.c();
				}

				transition_in(if_block, 1);
				if_block.m(if_block_anchor.parentNode, if_block_anchor);
			}
		},
		i(local) {
			if (current) return;
			transition_in(if_block);
			current = true;
		},
		o(local) {
			transition_out(if_block);
			current = false;
		},
		d(detaching) {
			if_blocks[current_block_type_index].d(detaching);
			if (detaching) detach(if_block_anchor);
		}
	};
}

// (38:3) {#each keys as key}
function create_each_block$4(ctx) {
	let tr;
	let t;
	let current;
	let each_value_1 = /*columns_to_render*/ ctx[2];
	let each_blocks = [];

	for (let i = 0; i < each_value_1.length; i += 1) {
		each_blocks[i] = create_each_block_1(get_each_context_1(ctx, each_value_1, i));
	}

	const out = i => transition_out(each_blocks[i], 1, 1, () => {
		each_blocks[i] = null;
	});

	return {
		c() {
			tr = element("tr");

			for (let i = 0; i < each_blocks.length; i += 1) {
				each_blocks[i].c();
			}

			t = space();
			attr(tr, "class", "svelte-12l2iaz");
		},
		m(target, anchor) {
			insert(target, tr, anchor);

			for (let i = 0; i < each_blocks.length; i += 1) {
				each_blocks[i].m(tr, null);
			}

			append(tr, t);
			current = true;
		},
		p(ctx, dirty) {
			if (dirty & /*keys, columns_to_render, INDEX_KEY, data, VALUE_KEY*/ 7) {
				each_value_1 = /*columns_to_render*/ ctx[2];
				let i;

				for (i = 0; i < each_value_1.length; i += 1) {
					const child_ctx = get_each_context_1(ctx, each_value_1, i);

					if (each_blocks[i]) {
						each_blocks[i].p(child_ctx, dirty);
						transition_in(each_blocks[i], 1);
					} else {
						each_blocks[i] = create_each_block_1(child_ctx);
						each_blocks[i].c();
						transition_in(each_blocks[i], 1);
						each_blocks[i].m(tr, t);
					}
				}

				group_outros();

				for (i = each_value_1.length; i < each_blocks.length; i += 1) {
					out(i);
				}

				check_outros();
			}
		},
		i(local) {
			if (current) return;

			for (let i = 0; i < each_value_1.length; i += 1) {
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
			if (detaching) detach(tr);
			destroy_each(each_blocks, detaching);
		}
	};
}

function create_fragment$l(ctx) {
	let div;
	let table;
	let thead;
	let tr;
	let t;
	let tbody;
	let current;
	let each_value_2 = /*columns_to_render*/ ctx[2];
	let each_blocks_1 = [];

	for (let i = 0; i < each_value_2.length; i += 1) {
		each_blocks_1[i] = create_each_block_2(get_each_context_2(ctx, each_value_2, i));
	}

	let each_value = /*keys*/ ctx[1];
	let each_blocks = [];

	for (let i = 0; i < each_value.length; i += 1) {
		each_blocks[i] = create_each_block$4(get_each_context$4(ctx, each_value, i));
	}

	const out = i => transition_out(each_blocks[i], 1, 1, () => {
		each_blocks[i] = null;
	});

	return {
		c() {
			div = element("div");
			table = element("table");
			thead = element("thead");
			tr = element("tr");

			for (let i = 0; i < each_blocks_1.length; i += 1) {
				each_blocks_1[i].c();
			}

			t = space();
			tbody = element("tbody");

			for (let i = 0; i < each_blocks.length; i += 1) {
				each_blocks[i].c();
			}

			attr(tr, "class", "svelte-12l2iaz");
			attr(table, "class", "svelte-12l2iaz");
			attr(div, "class", "table svelte-12l2iaz");
		},
		m(target, anchor) {
			insert(target, div, anchor);
			append(div, table);
			append(table, thead);
			append(thead, tr);

			for (let i = 0; i < each_blocks_1.length; i += 1) {
				each_blocks_1[i].m(tr, null);
			}

			append(table, t);
			append(table, tbody);

			for (let i = 0; i < each_blocks.length; i += 1) {
				each_blocks[i].m(tbody, null);
			}

			current = true;
		},
		p(ctx, [dirty]) {
			if (dirty & /*columns_to_render*/ 4) {
				each_value_2 = /*columns_to_render*/ ctx[2];
				let i;

				for (i = 0; i < each_value_2.length; i += 1) {
					const child_ctx = get_each_context_2(ctx, each_value_2, i);

					if (each_blocks_1[i]) {
						each_blocks_1[i].p(child_ctx, dirty);
					} else {
						each_blocks_1[i] = create_each_block_2(child_ctx);
						each_blocks_1[i].c();
						each_blocks_1[i].m(tr, null);
					}
				}

				for (; i < each_blocks_1.length; i += 1) {
					each_blocks_1[i].d(1);
				}

				each_blocks_1.length = each_value_2.length;
			}

			if (dirty & /*columns_to_render, keys, INDEX_KEY, data, VALUE_KEY*/ 7) {
				each_value = /*keys*/ ctx[1];
				let i;

				for (i = 0; i < each_value.length; i += 1) {
					const child_ctx = get_each_context$4(ctx, each_value, i);

					if (each_blocks[i]) {
						each_blocks[i].p(child_ctx, dirty);
						transition_in(each_blocks[i], 1);
					} else {
						each_blocks[i] = create_each_block$4(child_ctx);
						each_blocks[i].c();
						transition_in(each_blocks[i], 1);
						each_blocks[i].m(tbody, null);
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
			if (detaching) detach(div);
			destroy_each(each_blocks_1, detaching);
			destroy_each(each_blocks, detaching);
		}
	};
}

const INDEX_KEY = "(index)";
const VALUE_KEY = "Value";

function instance$k($$self, $$props, $$invalidate) {
	let { data } = $$props;
	let { columns } = $$props;

	function get_columns_to_render(data, keys) {
		const columns = new Set([INDEX_KEY]);

		for (const key of keys) {
			const value = data[key];

			if (typeof value === "object") {
				Object.keys(value).forEach(key => columns.add(key));
			} else {
				columns.add(VALUE_KEY);
			}
		}

		return [...columns];
	}

	$$self.$set = $$props => {
		if ("data" in $$props) $$invalidate(0, data = $$props.data);
		if ("columns" in $$props) $$invalidate(3, columns = $$props.columns);
	};

	let keys;
	let columns_to_render;

	$$self.$$.update = () => {
		if ($$self.$$.dirty & /*data*/ 1) {
			 $$invalidate(1, keys = Object.keys(data));
		}

		if ($$self.$$.dirty & /*columns, data, keys*/ 11) {
			 $$invalidate(2, columns_to_render = columns || get_columns_to_render(data, keys));
		}
	};

	return [data, keys, columns_to_render, columns];
}

class ConsoleTable extends SvelteComponent {
	constructor(options) {
		super();
		if (!document.getElementById("svelte-12l2iaz-style")) add_css$f();
		init(this, options, instance$k, create_fragment$l, safe_not_equal, { data: 0, columns: 3 });
	}
}

/* node_modules/@sveltejs/svelte-repl/src/Output/ConsoleLine.svelte generated by Svelte v3.24.0 */

function add_css$g() {
	var style = element("style");
	style.id = "svelte-wz5xz8-style";
	style.textContent = ".log.svelte-wz5xz8{border-bottom:1px solid #eee;padding:5px 10px 0px;display:flex;position:relative;font-size:12px;font-family:var(--font-mono)}.log.svelte-wz5xz8>*{margin-right:10px;font-family:var(--font-mono)}.console-warn.svelte-wz5xz8,.console-system-warn.svelte-wz5xz8{background:#fffbe6;border-color:#fff4c4}.console-error.svelte-wz5xz8,.console-assert.svelte-wz5xz8{background:#fff0f0;border-color:#fed6d7}.console-group.svelte-wz5xz8,.arrow.svelte-wz5xz8{cursor:pointer;user-select:none}.console-trace.svelte-wz5xz8,.console-assert.svelte-wz5xz8{border-bottom:none}.console-assert+.trace.svelte-wz5xz8{background:#fff0f0;border-color:#fed6d7}.trace.svelte-wz5xz8{border-bottom:1px solid #eee;font-size:12px;font-family:var(--font-mono);padding:4px 0 2px}.trace.svelte-wz5xz8>div{margin-left:15px}.count.svelte-wz5xz8{color:#999;font-size:12px;line-height:1.2}.info.svelte-wz5xz8{color:#666;font-family:var(--font) !important;font-size:12px}.error.svelte-wz5xz8{color:#da106e}.outline.svelte-wz5xz8{border-left:1px solid #9c9cab;position:absolute;top:0;bottom:-1px}.arrow.svelte-wz5xz8{position:absolute;font-size:0.6em;transition:150ms;transform-origin:50% 50%;transform:translateY(1px) translateX(-50%)}.arrow.expand.svelte-wz5xz8{transform:translateY(1px) translateX(-50%) rotateZ(90deg)}.title.svelte-wz5xz8{font-family:var(--font-mono);font-size:13px;font-weight:bold;padding-left:11px;height:19px}.assert.svelte-wz5xz8{padding-left:11px;font-weight:bold;color:#da106e}";
	append(document.head, style);
}

function get_each_context$5(ctx, list, i) {
	const child_ctx = ctx.slice();
	child_ctx[3] = list[i];
	return child_ctx;
}

function get_each_context_1$1(ctx, list, i) {
	const child_ctx = ctx.slice();
	child_ctx[6] = list[i];
	return child_ctx;
}

function get_each_context_2$1(ctx, list, i) {
	const child_ctx = ctx.slice();
	child_ctx[9] = list[i];
	child_ctx[11] = i;
	return child_ctx;
}

function get_each_context_4(ctx, list, i) {
	const child_ctx = ctx.slice();
	child_ctx[12] = list[i];
	return child_ctx;
}

function get_each_context_3(ctx, list, i) {
	const child_ctx = ctx.slice();
	child_ctx[12] = list[i];
	return child_ctx;
}

// (13:0) {#if log.level === 'table'}
function create_if_block_10$1(ctx) {
	let consoletable;
	let current;

	consoletable = new ConsoleTable({
			props: {
				data: /*log*/ ctx[0].args[0],
				columns: /*log*/ ctx[0].args[1]
			}
		});

	return {
		c() {
			create_component(consoletable.$$.fragment);
		},
		m(target, anchor) {
			mount_component(consoletable, target, anchor);
			current = true;
		},
		p(ctx, dirty) {
			const consoletable_changes = {};
			if (dirty & /*log*/ 1) consoletable_changes.data = /*log*/ ctx[0].args[0];
			if (dirty & /*log*/ 1) consoletable_changes.columns = /*log*/ ctx[0].args[1];
			consoletable.$set(consoletable_changes);
		},
		i(local) {
			if (current) return;
			transition_in(consoletable.$$.fragment, local);
			current = true;
		},
		o(local) {
			transition_out(consoletable.$$.fragment, local);
			current = false;
		},
		d(detaching) {
			destroy_component(consoletable, detaching);
		}
	};
}

// (18:1) {#if log.count > 1}
function create_if_block_9$1(ctx) {
	let span;
	let t0_value = /*log*/ ctx[0].count + "";
	let t0;
	let t1;

	return {
		c() {
			span = element("span");
			t0 = text(t0_value);
			t1 = text("x");
			attr(span, "class", "count svelte-wz5xz8");
		},
		m(target, anchor) {
			insert(target, span, anchor);
			append(span, t0);
			append(span, t1);
		},
		p(ctx, dirty) {
			if (dirty & /*log*/ 1 && t0_value !== (t0_value = /*log*/ ctx[0].count + "")) set_data(t0, t0_value);
		},
		d(detaching) {
			if (detaching) detach(span);
		}
	};
}

// (22:1) {#if log.level === 'trace' || log.level === 'assert'}
function create_if_block_8$1(ctx) {
	let div;
	let mounted;
	let dispose;

	return {
		c() {
			div = element("div");
			div.textContent = "▶";
			attr(div, "class", "arrow svelte-wz5xz8");
			toggle_class(div, "expand", !/*log*/ ctx[0].collapsed);
		},
		m(target, anchor) {
			insert(target, div, anchor);

			if (!mounted) {
				dispose = listen(div, "click", /*toggleGroupCollapse*/ ctx[2]);
				mounted = true;
			}
		},
		p(ctx, dirty) {
			if (dirty & /*log*/ 1) {
				toggle_class(div, "expand", !/*log*/ ctx[0].collapsed);
			}
		},
		d(detaching) {
			if (detaching) detach(div);
			mounted = false;
			dispose();
		}
	};
}

// (26:1) {#if log.level === 'assert'}
function create_if_block_7$1(ctx) {
	let span;

	return {
		c() {
			span = element("span");
			span.textContent = "Assertion failed:";
			attr(span, "class", "assert svelte-wz5xz8");
		},
		m(target, anchor) {
			insert(target, span, anchor);
		},
		d(detaching) {
			if (detaching) detach(span);
		}
	};
}

// (43:1) {:else}
function create_else_block$6(ctx) {
	let each_1_anchor;
	let current;
	let each_value_4 = /*log*/ ctx[0].args;
	let each_blocks = [];

	for (let i = 0; i < each_value_4.length; i += 1) {
		each_blocks[i] = create_each_block_4(get_each_context_4(ctx, each_value_4, i));
	}

	const out = i => transition_out(each_blocks[i], 1, 1, () => {
		each_blocks[i] = null;
	});

	return {
		c() {
			for (let i = 0; i < each_blocks.length; i += 1) {
				each_blocks[i].c();
			}

			each_1_anchor = empty();
		},
		m(target, anchor) {
			for (let i = 0; i < each_blocks.length; i += 1) {
				each_blocks[i].m(target, anchor);
			}

			insert(target, each_1_anchor, anchor);
			current = true;
		},
		p(ctx, dirty) {
			if (dirty & /*log*/ 1) {
				each_value_4 = /*log*/ ctx[0].args;
				let i;

				for (i = 0; i < each_value_4.length; i += 1) {
					const child_ctx = get_each_context_4(ctx, each_value_4, i);

					if (each_blocks[i]) {
						each_blocks[i].p(child_ctx, dirty);
						transition_in(each_blocks[i], 1);
					} else {
						each_blocks[i] = create_each_block_4(child_ctx);
						each_blocks[i].c();
						transition_in(each_blocks[i], 1);
						each_blocks[i].m(each_1_anchor.parentNode, each_1_anchor);
					}
				}

				group_outros();

				for (i = each_value_4.length; i < each_blocks.length; i += 1) {
					out(i);
				}

				check_outros();
			}
		},
		i(local) {
			if (current) return;

			for (let i = 0; i < each_value_4.length; i += 1) {
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
			destroy_each(each_blocks, detaching);
			if (detaching) detach(each_1_anchor);
		}
	};
}

// (41:33) 
function create_if_block_6$1(ctx) {
	let jsonnode;
	let current;
	jsonnode = new Src({ props: { value: /*log*/ ctx[0].args[0] } });

	return {
		c() {
			create_component(jsonnode.$$.fragment);
		},
		m(target, anchor) {
			mount_component(jsonnode, target, anchor);
			current = true;
		},
		p(ctx, dirty) {
			const jsonnode_changes = {};
			if (dirty & /*log*/ 1) jsonnode_changes.value = /*log*/ ctx[0].args[0];
			jsonnode.$set(jsonnode_changes);
		},
		i(local) {
			if (current) return;
			transition_in(jsonnode.$$.fragment, local);
			current = true;
		},
		o(local) {
			transition_out(jsonnode.$$.fragment, local);
			current = false;
		},
		d(detaching) {
			destroy_component(jsonnode, detaching);
		}
	};
}

// (37:42) 
function create_if_block_5$1(ctx) {
	let each_1_anchor;
	let each_value_3 = /*log*/ ctx[0].args;
	let each_blocks = [];

	for (let i = 0; i < each_value_3.length; i += 1) {
		each_blocks[i] = create_each_block_3(get_each_context_3(ctx, each_value_3, i));
	}

	return {
		c() {
			for (let i = 0; i < each_blocks.length; i += 1) {
				each_blocks[i].c();
			}

			each_1_anchor = empty();
		},
		m(target, anchor) {
			for (let i = 0; i < each_blocks.length; i += 1) {
				each_blocks[i].m(target, anchor);
			}

			insert(target, each_1_anchor, anchor);
		},
		p(ctx, dirty) {
			if (dirty & /*log*/ 1) {
				each_value_3 = /*log*/ ctx[0].args;
				let i;

				for (i = 0; i < each_value_3.length; i += 1) {
					const child_ctx = get_each_context_3(ctx, each_value_3, i);

					if (each_blocks[i]) {
						each_blocks[i].p(child_ctx, dirty);
					} else {
						each_blocks[i] = create_each_block_3(child_ctx);
						each_blocks[i].c();
						each_blocks[i].m(each_1_anchor.parentNode, each_1_anchor);
					}
				}

				for (; i < each_blocks.length; i += 1) {
					each_blocks[i].d(1);
				}

				each_blocks.length = each_value_3.length;
			}
		},
		i: noop,
		o: noop,
		d(detaching) {
			destroy_each(each_blocks, detaching);
			if (detaching) detach(each_1_anchor);
		}
	};
}

// (34:33) 
function create_if_block_4$1(ctx) {
	let div;
	let t1;
	let span;
	let t2_value = /*log*/ ctx[0].label + "";
	let t2;

	return {
		c() {
			div = element("div");
			div.textContent = "▶";
			t1 = space();
			span = element("span");
			t2 = text(t2_value);
			attr(div, "class", "arrow svelte-wz5xz8");
			toggle_class(div, "expand", !/*log*/ ctx[0].collapsed);
			attr(span, "class", "title svelte-wz5xz8");
		},
		m(target, anchor) {
			insert(target, div, anchor);
			insert(target, t1, anchor);
			insert(target, span, anchor);
			append(span, t2);
		},
		p(ctx, dirty) {
			if (dirty & /*log*/ 1) {
				toggle_class(div, "expand", !/*log*/ ctx[0].collapsed);
			}

			if (dirty & /*log*/ 1 && t2_value !== (t2_value = /*log*/ ctx[0].label + "")) set_data(t2, t2_value);
		},
		i: noop,
		o: noop,
		d(detaching) {
			if (detaching) detach(div);
			if (detaching) detach(t1);
			if (detaching) detach(span);
		}
	};
}

// (32:38) 
function create_if_block_3$2(ctx) {
	let span;

	return {
		c() {
			span = element("span");
			span.textContent = "Message could not be cloned. Open devtools to see it";
			attr(span, "class", "info error svelte-wz5xz8");
		},
		m(target, anchor) {
			insert(target, span, anchor);
		},
		p: noop,
		i: noop,
		o: noop,
		d(detaching) {
			if (detaching) detach(span);
		}
	};
}

// (30:1) {#if log.level === 'clear'}
function create_if_block_2$7(ctx) {
	let span;

	return {
		c() {
			span = element("span");
			span.textContent = "Console was cleared";
			attr(span, "class", "info svelte-wz5xz8");
		},
		m(target, anchor) {
			insert(target, span, anchor);
		},
		p: noop,
		i: noop,
		o: noop,
		d(detaching) {
			if (detaching) detach(span);
		}
	};
}

// (44:2) {#each log.args as arg}
function create_each_block_4(ctx) {
	let jsonnode;
	let current;
	jsonnode = new Src({ props: { value: /*arg*/ ctx[12] } });

	return {
		c() {
			create_component(jsonnode.$$.fragment);
		},
		m(target, anchor) {
			mount_component(jsonnode, target, anchor);
			current = true;
		},
		p(ctx, dirty) {
			const jsonnode_changes = {};
			if (dirty & /*log*/ 1) jsonnode_changes.value = /*arg*/ ctx[12];
			jsonnode.$set(jsonnode_changes);
		},
		i(local) {
			if (current) return;
			transition_in(jsonnode.$$.fragment, local);
			current = true;
		},
		o(local) {
			transition_out(jsonnode.$$.fragment, local);
			current = false;
		},
		d(detaching) {
			destroy_component(jsonnode, detaching);
		}
	};
}

// (38:2) {#each log.args as arg}
function create_each_block_3(ctx) {
	let t_value = /*arg*/ ctx[12] + "";
	let t;

	return {
		c() {
			t = text(t_value);
		},
		m(target, anchor) {
			insert(target, t, anchor);
		},
		p(ctx, dirty) {
			if (dirty & /*log*/ 1 && t_value !== (t_value = /*arg*/ ctx[12] + "")) set_data(t, t_value);
		},
		d(detaching) {
			if (detaching) detach(t);
		}
	};
}

// (48:1) {#each new Array(level - 1) as _, idx}
function create_each_block_2$1(ctx) {
	let div;

	return {
		c() {
			div = element("div");
			attr(div, "class", "outline svelte-wz5xz8");
			set_style(div, "left", /*idx*/ ctx[11] * 15 + 15 + "px");
		},
		m(target, anchor) {
			insert(target, div, anchor);
		},
		d(detaching) {
			if (detaching) detach(div);
		}
	};
}

// (53:0) {#if log.level === 'group' && !log.collapsed}
function create_if_block_1$8(ctx) {
	let each_1_anchor;
	let current;
	let each_value_1 = /*log*/ ctx[0].logs;
	let each_blocks = [];

	for (let i = 0; i < each_value_1.length; i += 1) {
		each_blocks[i] = create_each_block_1$1(get_each_context_1$1(ctx, each_value_1, i));
	}

	const out = i => transition_out(each_blocks[i], 1, 1, () => {
		each_blocks[i] = null;
	});

	return {
		c() {
			for (let i = 0; i < each_blocks.length; i += 1) {
				each_blocks[i].c();
			}

			each_1_anchor = empty();
		},
		m(target, anchor) {
			for (let i = 0; i < each_blocks.length; i += 1) {
				each_blocks[i].m(target, anchor);
			}

			insert(target, each_1_anchor, anchor);
			current = true;
		},
		p(ctx, dirty) {
			if (dirty & /*log, level*/ 3) {
				each_value_1 = /*log*/ ctx[0].logs;
				let i;

				for (i = 0; i < each_value_1.length; i += 1) {
					const child_ctx = get_each_context_1$1(ctx, each_value_1, i);

					if (each_blocks[i]) {
						each_blocks[i].p(child_ctx, dirty);
						transition_in(each_blocks[i], 1);
					} else {
						each_blocks[i] = create_each_block_1$1(child_ctx);
						each_blocks[i].c();
						transition_in(each_blocks[i], 1);
						each_blocks[i].m(each_1_anchor.parentNode, each_1_anchor);
					}
				}

				group_outros();

				for (i = each_value_1.length; i < each_blocks.length; i += 1) {
					out(i);
				}

				check_outros();
			}
		},
		i(local) {
			if (current) return;

			for (let i = 0; i < each_value_1.length; i += 1) {
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
			destroy_each(each_blocks, detaching);
			if (detaching) detach(each_1_anchor);
		}
	};
}

// (54:1) {#each log.logs as childLog}
function create_each_block_1$1(ctx) {
	let consoleline;
	let current;

	consoleline = new ConsoleLine({
			props: {
				log: /*childLog*/ ctx[6],
				level: /*level*/ ctx[1] + 1
			}
		});

	return {
		c() {
			create_component(consoleline.$$.fragment);
		},
		m(target, anchor) {
			mount_component(consoleline, target, anchor);
			current = true;
		},
		p(ctx, dirty) {
			const consoleline_changes = {};
			if (dirty & /*log*/ 1) consoleline_changes.log = /*childLog*/ ctx[6];
			if (dirty & /*level*/ 2) consoleline_changes.level = /*level*/ ctx[1] + 1;
			consoleline.$set(consoleline_changes);
		},
		i(local) {
			if (current) return;
			transition_in(consoleline.$$.fragment, local);
			current = true;
		},
		o(local) {
			transition_out(consoleline.$$.fragment, local);
			current = false;
		},
		d(detaching) {
			destroy_component(consoleline, detaching);
		}
	};
}

// (59:0) {#if (log.level === 'trace' || log.level === 'assert') && !log.collapsed}
function create_if_block$b(ctx) {
	let div;
	let each_value = /*log*/ ctx[0].stack.split("\n").slice(2);
	let each_blocks = [];

	for (let i = 0; i < each_value.length; i += 1) {
		each_blocks[i] = create_each_block$5(get_each_context$5(ctx, each_value, i));
	}

	return {
		c() {
			div = element("div");

			for (let i = 0; i < each_blocks.length; i += 1) {
				each_blocks[i].c();
			}

			attr(div, "class", "trace svelte-wz5xz8");
		},
		m(target, anchor) {
			insert(target, div, anchor);

			for (let i = 0; i < each_blocks.length; i += 1) {
				each_blocks[i].m(div, null);
			}
		},
		p(ctx, dirty) {
			if (dirty & /*log*/ 1) {
				each_value = /*log*/ ctx[0].stack.split("\n").slice(2);
				let i;

				for (i = 0; i < each_value.length; i += 1) {
					const child_ctx = get_each_context$5(ctx, each_value, i);

					if (each_blocks[i]) {
						each_blocks[i].p(child_ctx, dirty);
					} else {
						each_blocks[i] = create_each_block$5(child_ctx);
						each_blocks[i].c();
						each_blocks[i].m(div, null);
					}
				}

				for (; i < each_blocks.length; i += 1) {
					each_blocks[i].d(1);
				}

				each_blocks.length = each_value.length;
			}
		},
		d(detaching) {
			if (detaching) detach(div);
			destroy_each(each_blocks, detaching);
		}
	};
}

// (61:2) {#each log.stack.split('\n').slice(2) as stack}
function create_each_block$5(ctx) {
	let div;
	let t_value = /*stack*/ ctx[3].replace(/^\s*at\s+/, "") + "";
	let t;

	return {
		c() {
			div = element("div");
			t = text(t_value);
		},
		m(target, anchor) {
			insert(target, div, anchor);
			append(div, t);
		},
		p(ctx, dirty) {
			if (dirty & /*log*/ 1 && t_value !== (t_value = /*stack*/ ctx[3].replace(/^\s*at\s+/, "") + "")) set_data(t, t_value);
		},
		d(detaching) {
			if (detaching) detach(div);
		}
	};
}

function create_fragment$m(ctx) {
	let t0;
	let div;
	let t1;
	let t2;
	let t3;
	let show_if;
	let current_block_type_index;
	let if_block4;
	let t4;
	let div_class_value;
	let t5;
	let t6;
	let if_block6_anchor;
	let current;
	let mounted;
	let dispose;
	let if_block0 = /*log*/ ctx[0].level === "table" && create_if_block_10$1(ctx);
	let if_block1 = /*log*/ ctx[0].count > 1 && create_if_block_9$1(ctx);
	let if_block2 = (/*log*/ ctx[0].level === "trace" || /*log*/ ctx[0].level === "assert") && create_if_block_8$1(ctx);
	let if_block3 = /*log*/ ctx[0].level === "assert" && create_if_block_7$1();

	const if_block_creators = [
		create_if_block_2$7,
		create_if_block_3$2,
		create_if_block_4$1,
		create_if_block_5$1,
		create_if_block_6$1,
		create_else_block$6
	];

	const if_blocks = [];

	function select_block_type(ctx, dirty) {
		if (/*log*/ ctx[0].level === "clear") return 0;
		if (/*log*/ ctx[0].level === "unclonable") return 1;
		if (/*log*/ ctx[0].level === "group") return 2;
		if (dirty & /*log*/ 1) show_if = !!/*log*/ ctx[0].level.startsWith("system");
		if (show_if) return 3;
		if (/*log*/ ctx[0].level === "table") return 4;
		return 5;
	}

	current_block_type_index = select_block_type(ctx, -1);
	if_block4 = if_blocks[current_block_type_index] = if_block_creators[current_block_type_index](ctx);
	let each_value_2 = new Array(/*level*/ ctx[1] - 1);
	let each_blocks = [];

	for (let i = 0; i < each_value_2.length; i += 1) {
		each_blocks[i] = create_each_block_2$1(get_each_context_2$1(ctx, each_value_2, i));
	}

	let if_block5 = /*log*/ ctx[0].level === "group" && !/*log*/ ctx[0].collapsed && create_if_block_1$8(ctx);
	let if_block6 = (/*log*/ ctx[0].level === "trace" || /*log*/ ctx[0].level === "assert") && !/*log*/ ctx[0].collapsed && create_if_block$b(ctx);

	return {
		c() {
			if (if_block0) if_block0.c();
			t0 = space();
			div = element("div");
			if (if_block1) if_block1.c();
			t1 = space();
			if (if_block2) if_block2.c();
			t2 = space();
			if (if_block3) if_block3.c();
			t3 = space();
			if_block4.c();
			t4 = space();

			for (let i = 0; i < each_blocks.length; i += 1) {
				each_blocks[i].c();
			}

			t5 = space();
			if (if_block5) if_block5.c();
			t6 = space();
			if (if_block6) if_block6.c();
			if_block6_anchor = empty();
			attr(div, "class", div_class_value = "log console-" + /*log*/ ctx[0].level + " svelte-wz5xz8");
			set_style(div, "padding-left", /*level*/ ctx[1] * 15 + "px");
		},
		m(target, anchor) {
			if (if_block0) if_block0.m(target, anchor);
			insert(target, t0, anchor);
			insert(target, div, anchor);
			if (if_block1) if_block1.m(div, null);
			append(div, t1);
			if (if_block2) if_block2.m(div, null);
			append(div, t2);
			if (if_block3) if_block3.m(div, null);
			append(div, t3);
			if_blocks[current_block_type_index].m(div, null);
			append(div, t4);

			for (let i = 0; i < each_blocks.length; i += 1) {
				each_blocks[i].m(div, null);
			}

			insert(target, t5, anchor);
			if (if_block5) if_block5.m(target, anchor);
			insert(target, t6, anchor);
			if (if_block6) if_block6.m(target, anchor);
			insert(target, if_block6_anchor, anchor);
			current = true;

			if (!mounted) {
				dispose = listen(div, "click", function () {
					if (is_function(/*log*/ ctx[0].level === "group"
					? /*toggleGroupCollapse*/ ctx[2]
					: undefined)) (/*log*/ ctx[0].level === "group"
					? /*toggleGroupCollapse*/ ctx[2]
					: undefined).apply(this, arguments);
				});

				mounted = true;
			}
		},
		p(new_ctx, [dirty]) {
			ctx = new_ctx;

			if (/*log*/ ctx[0].level === "table") {
				if (if_block0) {
					if_block0.p(ctx, dirty);

					if (dirty & /*log*/ 1) {
						transition_in(if_block0, 1);
					}
				} else {
					if_block0 = create_if_block_10$1(ctx);
					if_block0.c();
					transition_in(if_block0, 1);
					if_block0.m(t0.parentNode, t0);
				}
			} else if (if_block0) {
				group_outros();

				transition_out(if_block0, 1, 1, () => {
					if_block0 = null;
				});

				check_outros();
			}

			if (/*log*/ ctx[0].count > 1) {
				if (if_block1) {
					if_block1.p(ctx, dirty);
				} else {
					if_block1 = create_if_block_9$1(ctx);
					if_block1.c();
					if_block1.m(div, t1);
				}
			} else if (if_block1) {
				if_block1.d(1);
				if_block1 = null;
			}

			if (/*log*/ ctx[0].level === "trace" || /*log*/ ctx[0].level === "assert") {
				if (if_block2) {
					if_block2.p(ctx, dirty);
				} else {
					if_block2 = create_if_block_8$1(ctx);
					if_block2.c();
					if_block2.m(div, t2);
				}
			} else if (if_block2) {
				if_block2.d(1);
				if_block2 = null;
			}

			if (/*log*/ ctx[0].level === "assert") {
				if (if_block3) ; else {
					if_block3 = create_if_block_7$1();
					if_block3.c();
					if_block3.m(div, t3);
				}
			} else if (if_block3) {
				if_block3.d(1);
				if_block3 = null;
			}

			let previous_block_index = current_block_type_index;
			current_block_type_index = select_block_type(ctx, dirty);

			if (current_block_type_index === previous_block_index) {
				if_blocks[current_block_type_index].p(ctx, dirty);
			} else {
				group_outros();

				transition_out(if_blocks[previous_block_index], 1, 1, () => {
					if_blocks[previous_block_index] = null;
				});

				check_outros();
				if_block4 = if_blocks[current_block_type_index];

				if (!if_block4) {
					if_block4 = if_blocks[current_block_type_index] = if_block_creators[current_block_type_index](ctx);
					if_block4.c();
				}

				transition_in(if_block4, 1);
				if_block4.m(div, t4);
			}

			if (dirty & /*level*/ 2) {
				const old_length = each_value_2.length;
				each_value_2 = new Array(/*level*/ ctx[1] - 1);
				let i;

				for (i = old_length; i < each_value_2.length; i += 1) {
					const child_ctx = get_each_context_2$1(ctx, each_value_2, i);

					if (!each_blocks[i]) {
						each_blocks[i] = create_each_block_2$1(child_ctx);
						each_blocks[i].c();
						each_blocks[i].m(div, null);
					}
				}

				for (i = each_value_2.length; i < old_length; i += 1) {
					each_blocks[i].d(1);
				}

				each_blocks.length = each_value_2.length;
			}

			if (!current || dirty & /*log*/ 1 && div_class_value !== (div_class_value = "log console-" + /*log*/ ctx[0].level + " svelte-wz5xz8")) {
				attr(div, "class", div_class_value);
			}

			if (!current || dirty & /*level*/ 2) {
				set_style(div, "padding-left", /*level*/ ctx[1] * 15 + "px");
			}

			if (/*log*/ ctx[0].level === "group" && !/*log*/ ctx[0].collapsed) {
				if (if_block5) {
					if_block5.p(ctx, dirty);

					if (dirty & /*log*/ 1) {
						transition_in(if_block5, 1);
					}
				} else {
					if_block5 = create_if_block_1$8(ctx);
					if_block5.c();
					transition_in(if_block5, 1);
					if_block5.m(t6.parentNode, t6);
				}
			} else if (if_block5) {
				group_outros();

				transition_out(if_block5, 1, 1, () => {
					if_block5 = null;
				});

				check_outros();
			}

			if ((/*log*/ ctx[0].level === "trace" || /*log*/ ctx[0].level === "assert") && !/*log*/ ctx[0].collapsed) {
				if (if_block6) {
					if_block6.p(ctx, dirty);
				} else {
					if_block6 = create_if_block$b(ctx);
					if_block6.c();
					if_block6.m(if_block6_anchor.parentNode, if_block6_anchor);
				}
			} else if (if_block6) {
				if_block6.d(1);
				if_block6 = null;
			}
		},
		i(local) {
			if (current) return;
			transition_in(if_block0);
			transition_in(if_block4);
			transition_in(if_block5);
			current = true;
		},
		o(local) {
			transition_out(if_block0);
			transition_out(if_block4);
			transition_out(if_block5);
			current = false;
		},
		d(detaching) {
			if (if_block0) if_block0.d(detaching);
			if (detaching) detach(t0);
			if (detaching) detach(div);
			if (if_block1) if_block1.d();
			if (if_block2) if_block2.d();
			if (if_block3) if_block3.d();
			if_blocks[current_block_type_index].d();
			destroy_each(each_blocks, detaching);
			if (detaching) detach(t5);
			if (if_block5) if_block5.d(detaching);
			if (detaching) detach(t6);
			if (if_block6) if_block6.d(detaching);
			if (detaching) detach(if_block6_anchor);
			mounted = false;
			dispose();
		}
	};
}

function instance$l($$self, $$props, $$invalidate) {
	let { log } = $$props;
	let { level = 1 } = $$props;

	function toggleGroupCollapse() {
		$$invalidate(0, log.collapsed = !log.collapsed, log);
	}

	$$self.$set = $$props => {
		if ("log" in $$props) $$invalidate(0, log = $$props.log);
		if ("level" in $$props) $$invalidate(1, level = $$props.level);
	};

	return [log, level, toggleGroupCollapse];
}

class ConsoleLine extends SvelteComponent {
	constructor(options) {
		super();
		if (!document.getElementById("svelte-wz5xz8-style")) add_css$g();
		init(this, options, instance$l, create_fragment$m, safe_not_equal, { log: 0, level: 1 });
	}
}

/* node_modules/@sveltejs/svelte-repl/src/Output/Console.svelte generated by Svelte v3.24.0 */

function get_each_context$6(ctx, list, i) {
	const child_ctx = ctx.slice();
	child_ctx[1] = list[i];
	return child_ctx;
}

// (9:1) {#each logs as log}
function create_each_block$6(ctx) {
	let consoleline;
	let current;
	consoleline = new ConsoleLine({ props: { log: /*log*/ ctx[1] } });

	return {
		c() {
			create_component(consoleline.$$.fragment);
		},
		m(target, anchor) {
			mount_component(consoleline, target, anchor);
			current = true;
		},
		p(ctx, dirty) {
			const consoleline_changes = {};
			if (dirty & /*logs*/ 1) consoleline_changes.log = /*log*/ ctx[1];
			consoleline.$set(consoleline_changes);
		},
		i(local) {
			if (current) return;
			transition_in(consoleline.$$.fragment, local);
			current = true;
		},
		o(local) {
			transition_out(consoleline.$$.fragment, local);
			current = false;
		},
		d(detaching) {
			destroy_component(consoleline, detaching);
		}
	};
}

function create_fragment$n(ctx) {
	let div;
	let current;
	let each_value = /*logs*/ ctx[0];
	let each_blocks = [];

	for (let i = 0; i < each_value.length; i += 1) {
		each_blocks[i] = create_each_block$6(get_each_context$6(ctx, each_value, i));
	}

	const out = i => transition_out(each_blocks[i], 1, 1, () => {
		each_blocks[i] = null;
	});

	return {
		c() {
			div = element("div");

			for (let i = 0; i < each_blocks.length; i += 1) {
				each_blocks[i].c();
			}

			attr(div, "class", "container");
		},
		m(target, anchor) {
			insert(target, div, anchor);

			for (let i = 0; i < each_blocks.length; i += 1) {
				each_blocks[i].m(div, null);
			}

			current = true;
		},
		p(ctx, [dirty]) {
			if (dirty & /*logs*/ 1) {
				each_value = /*logs*/ ctx[0];
				let i;

				for (i = 0; i < each_value.length; i += 1) {
					const child_ctx = get_each_context$6(ctx, each_value, i);

					if (each_blocks[i]) {
						each_blocks[i].p(child_ctx, dirty);
						transition_in(each_blocks[i], 1);
					} else {
						each_blocks[i] = create_each_block$6(child_ctx);
						each_blocks[i].c();
						transition_in(each_blocks[i], 1);
						each_blocks[i].m(div, null);
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
			if (detaching) detach(div);
			destroy_each(each_blocks, detaching);
		}
	};
}

function instance$m($$self, $$props, $$invalidate) {
	let { logs } = $$props;

	$$self.$set = $$props => {
		if ("logs" in $$props) $$invalidate(0, logs = $$props.logs);
	};

	return [logs];
}

class Console extends SvelteComponent {
	constructor(options) {
		super();
		init(this, options, instance$m, create_fragment$n, safe_not_equal, { logs: 0 });
	}
}

var srcdoc = "<!doctype html>\n<html>\n\t<head>\n\t\t<style>\n\t\t\thtml, body {\n\tposition: relative;\n\twidth: 100%;\n\theight: 100%;\n}\n\nbody {\n\tcolor: #333;\n\tmargin: 0;\n\tpadding: 8px;\n\tbox-sizing: border-box;\n\tfont-family: -apple-system, BlinkMacSystemFont, \"Segoe UI\", Roboto, Oxygen-Sans, Ubuntu, Cantarell, \"Helvetica Neue\", sans-serif;\n}\n\na {\n\tcolor: rgb(0,100,200);\n\ttext-decoration: none;\n}\n\na:hover {\n\ttext-decoration: underline;\n}\n\na:visited {\n\tcolor: rgb(0,80,160);\n}\n\nlabel {\n\tdisplay: block;\n}\n\ninput, button, select, textarea {\n\tfont-family: inherit;\n\tfont-size: inherit;\n\tpadding: 0.4em;\n\tmargin: 0 0 0.5em 0;\n\tbox-sizing: border-box;\n\tborder: 1px solid #ccc;\n\tborder-radius: 2px;\n}\n\ninput:disabled {\n\tcolor: #ccc;\n}\n\ninput[type=\"range\"] {\n\theight: 0;\n}\n\nbutton {\n\tcolor: #333;\n\tbackground-color: #f4f4f4;\n\toutline: none;\n}\n\nbutton:disabled {\n\tcolor: #999;\n}\n\nbutton:not(:disabled):active {\n\tbackground-color: #ddd;\n}\n\nbutton:focus {\n\tborder-color: #666;\n}\n\n\t\t</style>\n\n\t\t<script>\n\t\t\t(function(){\n\t\t\t\tfunction handle_message(ev) {\n\t\t\t\t\tlet { action, cmd_id } = ev.data;\n\t\t\t\t\tconst send_message = (payload) => parent.postMessage( { ...payload }, ev.origin);\n\t\t\t\t\tconst send_reply = (payload) => send_message({ ...payload, cmd_id });\n\t\t\t\t\tconst send_ok = () => send_reply({ action: 'cmd_ok' });\n\t\t\t\t\tconst send_error = (message, stack) => send_reply({ action: 'cmd_error', message, stack });\n\n\t\t\t\t\tif (action === 'eval') {\n\t\t\t\t\t\ttry {\n\t\t\t\t\t\t\tconst { script } = ev.data.args;\n\t\t\t\t\t\t\teval(script);\n\t\t\t\t\t\t\tsend_ok();\n\t\t\t\t\t\t} catch (e) {\n\t\t\t\t\t\t\tsend_error(e.message, e.stack);\n\t\t\t\t\t\t}\n\t\t\t\t\t}\n\n\t\t\t\t\tif (action === 'catch_clicks') {\n\t\t\t\t\t\ttry {\n\t\t\t\t\t\t\tconst top_origin = ev.origin;\n\t\t\t\t\t\t\tdocument.body.addEventListener('click', event => {\n\t\t\t\t\t\t\t\tif (event.which !== 1) return;\n\t\t\t\t\t\t\t\tif (event.metaKey || event.ctrlKey || event.shiftKey) return;\n\t\t\t\t\t\t\t\tif (event.defaultPrevented) return;\n\n\t\t\t\t\t\t\t\t// ensure target is a link\n\t\t\t\t\t\t\t\tlet el = event.target;\n\t\t\t\t\t\t\t\twhile (el && el.nodeName !== 'A') el = el.parentNode;\n\t\t\t\t\t\t\t\tif (!el || el.nodeName !== 'A') return;\n\n\t\t\t\t\t\t\t\tif (el.hasAttribute('download') || el.getAttribute('rel') === 'external' || el.target) return;\n\n\t\t\t\t\t\t\t\tevent.preventDefault();\n\n\t\t\t\t\t\t\t\tif (el.href.startsWith(top_origin)) {\n\t\t\t\t\t\t\t\t\tconst url = new URL(el.href);\n\t\t\t\t\t\t\t\t\tif (url.hash[0] === '#') {\n\t\t\t\t\t\t\t\t\t\twindow.location.hash = url.hash;\n\t\t\t\t\t\t\t\t\t\treturn;\n\t\t\t\t\t\t\t\t\t}\n\t\t\t\t\t\t\t\t}\n\n\t\t\t\t\t\t\t\twindow.open(el.href, '_blank');\n\t\t\t\t\t\t\t});\n\t\t\t\t\t\t\tsend_ok();\n\t\t\t\t\t\t} catch(e) {\n\t\t\t\t\t\t\tsend_error(e.message, e.stack);\n\t\t\t\t\t\t}\n\t\t\t\t\t}\n\t\t\t\t}\n\n\t\t\t\twindow.addEventListener('message', handle_message, false);\n\n\t\t\t\twindow.onerror = function (msg, url, lineNo, columnNo, error) {\n\t\t\t\t\tparent.postMessage({ action: 'error', value: error }, '*');\n\t\t\t\t}\n\n\t\t\t\twindow.addEventListener(\"unhandledrejection\", event => {\n\t\t\t\t\tparent.postMessage({ action: 'unhandledrejection', value: event.reason }, '*');\n\t\t\t\t});\n\t\t\t}).call(this);\n\n\t\t\tlet previous = { level: null, args: null };\n\n\t\t\t['clear', 'log', 'info', 'dir', 'warn', 'error', 'table'].forEach((level) => {\n\t\t\t\tconst original = console[level];\n\t\t\t\tconsole[level] = (...args) => {\n\t\t\t\t\tconst stringifiedArgs = stringify(args);\n\t\t\t\t\tif (\n\t\t\t\t\t\tprevious.level === level &&\n\t\t\t\t\t\tprevious.args &&\n\t\t\t\t\t\tprevious.args === stringifiedArgs\n\t\t\t\t\t) {\n\t\t\t\t\t\tparent.postMessage({ action: 'console', level, duplicate: true }, '*');\n\t\t\t\t\t} else {\n\t\t\t\t\t\tprevious = { level, args: stringifiedArgs };\n\n\t\t\t\t\t\ttry {\n\t\t\t\t\t\t\tparent.postMessage({ action: 'console', level, args }, '*');\n\t\t\t\t\t\t} catch (err) {\n\t\t\t\t\t\t\tparent.postMessage({ action: 'console', level: 'unclonable' }, '*');\n\t\t\t\t\t\t}\n\t\t\t\t\t}\n\n\t\t\t\t\toriginal(...args);\n\t\t\t\t}\n\t\t\t});\n\n\t\t\t[\n\t\t\t\t{ method: 'group', action: 'console_group' },\n\t\t\t\t{ method: 'groupEnd', action: 'console_group_end' },\n\t\t\t\t{ method: 'groupCollapsed', action: 'console_group_collapsed' },\n\t\t\t].forEach((group_action) => {\n\t\t\t\tconst original = console[group_action.method];\n\t\t\t\tconsole[group_action.method] = (label) => {\n\t\t\t\t\tparent.postMessage({ action: group_action.action, label }, '*');\n\n\t\t\t\t\toriginal(label);\n\t\t\t\t};\n\t\t\t});\n\n\t\t\tconst timers = new Map();\n\t\t\tconst original_time = console.time;\n\t\t\tconst original_timelog = console.timeLog;\n\t\t\tconst original_timeend = console.timeEnd;\n\n\t\t\tconsole.time = (label = 'default') => {\n\t\t\t\toriginal_time(label);\n\t\t\t\ttimers.set(label, performance.now());\n\t\t\t}\n\t\t\tconsole.timeLog = (label = 'default') => {\n\t\t\t\toriginal_timelog(label);\n\t\t\t\tconst now = performance.now();\n\t\t\t\tif (timers.has(label)) {\n\t\t\t\t\tparent.postMessage({ action: 'console', level: 'system-log', args: [`${label}: ${now - timers.get(label)}ms`] }, '*');\n\t\t\t\t} else {\n\t\t\t\t\tparent.postMessage({ action: 'console', level: 'system-warn', args: [`Timer '${label}' does not exist`] }, '*');\n\t\t\t\t}\n\t\t\t}\n\t\t\tconsole.timeEnd = (label = 'default') => {\n\t\t\t\toriginal_timeend(label);\n\t\t\t\tconst now = performance.now();\n\t\t\t\tif (timers.has(label)) {\n\t\t\t\t\tparent.postMessage({ action: 'console', level: 'system-log', args: [`${label}: ${now - timers.get(label)}ms`] }, '*');\n\t\t\t\t} else {\n\t\t\t\t\tparent.postMessage({ action: 'console', level: 'system-warn', args: [`Timer '${label}' does not exist`] }, '*');\n\t\t\t\t}\n\t\t\t\ttimers.delete(label);\n\t\t\t};\n\n\t\t\tconst original_assert = console.assert;\n\t\t\tconsole.assert = (condition, ...args) => {\n\t\t\t\tif (condition) {\n\t\t\t\t\tconst stack = new Error().stack;\n\t\t\t\t\tparent.postMessage({ action: 'console', level: 'assert', args, stack }, '*');\n\t\t\t\t}\n\t\t\t\toriginal_assert(condition, ...args);\n\t\t\t};\n\n\t\t\tconst counter = new Map();\n\t\t\tconst original_count = console.count;\n\t\t\tconst original_countreset = console.countReset;\n\n\t\t\tconsole.count = (label = 'default') => {\n\t\t\t\tcounter.set(label, (counter.get(label) || 0) + 1);\n\t\t\t\tparent.postMessage({ action: 'console', level: 'system-log', args: `${label}: ${counter.get(label)}` }, '*');\n\t\t\t\toriginal_count(label);\n\t\t\t};\n\n\t\t\tconsole.countReset = (label = 'default') => {\n\t\t\t\tif (counter.has(label)) {\n\t\t\t\t\tcounter.set(label, 0);\n\t\t\t\t} else {\n\t\t\t\t\tparent.postMessage({ action: 'console', level: 'system-warn', args: `Count for '${label}' does not exist` }, '*');\n\t\t\t\t}\n\t\t\t\toriginal_countreset(label);\n\t\t\t};\n\n\t\t\tconst original_trace = console.trace;\n\n\t\t\tconsole.trace = (...args) => {\n\t\t\t\tconst stack = new Error().stack;\n\t\t\t\tparent.postMessage({ action: 'console', level: 'trace', args, stack }, '*');\n\t\t\t\toriginal_trace(...args);\n\t\t\t};\n\n\t\t\tfunction stringify(args) {\n\t\t\t\ttry {\n\t\t\t\t\treturn JSON.stringify(args);\n\t\t\t\t} catch (error) {\n\t\t\t\t\treturn null;\n\t\t\t\t}\n\t\t\t}\n\t\t</script>\n\t</head>\n\t<body></body>\n</html>";

/* node_modules/@sveltejs/svelte-repl/src/Output/Viewer.svelte generated by Svelte v3.24.0 */

function add_css$h() {
	var style = element("style");
	style.id = "svelte-ivx2cg-style";
	style.textContent = ".iframe-container.svelte-ivx2cg{position:absolute;background-color:white;border:none;width:100%;height:100%}iframe.svelte-ivx2cg{width:100%;height:100%;border:none;display:block}.greyed-out.svelte-ivx2cg{filter:grayscale(50%) blur(1px);opacity:.25}button.svelte-ivx2cg{color:#999;font-size:12px;text-transform:uppercase;display:block}button.svelte-ivx2cg:hover{color:#333}.overlay.svelte-ivx2cg{position:absolute;bottom:0;width:100%}";
	append(document.head, style);
}

// (234:2) <div slot="main">
function create_main_slot(ctx) {
	let div;
	let iframe_1;
	let iframe_1_sandbox_value;
	let iframe_1_class_value;

	return {
		c() {
			div = element("div");
			iframe_1 = element("iframe");
			attr(iframe_1, "title", "Result");
			attr(iframe_1, "sandbox", iframe_1_sandbox_value = "allow-popups-to-escape-sandbox allow-scripts allow-popups allow-forms allow-pointer-lock allow-top-navigation allow-modals " + (/*relaxed*/ ctx[2] ? "allow-same-origin" : ""));

			attr(iframe_1, "class", iframe_1_class_value = "" + (null_to_empty(/*error*/ ctx[0] || pending || /*pending_imports*/ ctx[5]
			? "greyed-out"
			: "") + " svelte-ivx2cg"));

			attr(iframe_1, "srcdoc", srcdoc);
			toggle_class(iframe_1, "inited", /*inited*/ ctx[6]);
			attr(div, "slot", "main");
		},
		m(target, anchor) {
			insert(target, div, anchor);
			append(div, iframe_1);
			/*iframe_1_binding*/ ctx[13](iframe_1);
		},
		p(ctx, dirty) {
			if (dirty & /*relaxed*/ 4 && iframe_1_sandbox_value !== (iframe_1_sandbox_value = "allow-popups-to-escape-sandbox allow-scripts allow-popups allow-forms allow-pointer-lock allow-top-navigation allow-modals " + (/*relaxed*/ ctx[2] ? "allow-same-origin" : ""))) {
				attr(iframe_1, "sandbox", iframe_1_sandbox_value);
			}

			if (dirty & /*error, pending_imports*/ 33 && iframe_1_class_value !== (iframe_1_class_value = "" + (null_to_empty(/*error*/ ctx[0] || pending || /*pending_imports*/ ctx[5]
			? "greyed-out"
			: "") + " svelte-ivx2cg"))) {
				attr(iframe_1, "class", iframe_1_class_value);
			}

			if (dirty & /*error, pending_imports, inited*/ 97) {
				toggle_class(iframe_1, "inited", /*inited*/ ctx[6]);
			}
		},
		d(detaching) {
			if (detaching) detach(div);
			/*iframe_1_binding*/ ctx[13](null);
		}
	};
}

// (247:4) {#if (logs.length > 0)}
function create_if_block_2$8(ctx) {
	let t0;
	let t1_value = /*logs*/ ctx[3].length + "";
	let t1;
	let t2;

	return {
		c() {
			t0 = text("(");
			t1 = text(t1_value);
			t2 = text(")");
		},
		m(target, anchor) {
			insert(target, t0, anchor);
			insert(target, t1, anchor);
			insert(target, t2, anchor);
		},
		p(ctx, dirty) {
			if (dirty & /*logs*/ 8 && t1_value !== (t1_value = /*logs*/ ctx[3].length + "")) set_data(t1, t1_value);
		},
		d(detaching) {
			if (detaching) detach(t0);
			if (detaching) detach(t1);
			if (detaching) detach(t2);
		}
	};
}

// (245:2) <div slot="panel-header">
function create_panel_header_slot(ctx) {
	let div;
	let button;
	let t;
	let mounted;
	let dispose;
	let if_block = /*logs*/ ctx[3].length > 0 && create_if_block_2$8(ctx);

	return {
		c() {
			div = element("div");
			button = element("button");
			if (if_block) if_block.c();
			t = text("\n\t\t\t\tClear");
			attr(button, "class", "svelte-ivx2cg");
			attr(div, "slot", "panel-header");
		},
		m(target, anchor) {
			insert(target, div, anchor);
			append(div, button);
			if (if_block) if_block.m(button, null);
			append(button, t);

			if (!mounted) {
				dispose = listen(button, "click", stop_propagation(/*clear_logs*/ ctx[9]));
				mounted = true;
			}
		},
		p(ctx, dirty) {
			if (/*logs*/ ctx[3].length > 0) {
				if (if_block) {
					if_block.p(ctx, dirty);
				} else {
					if_block = create_if_block_2$8(ctx);
					if_block.c();
					if_block.m(button, t);
				}
			} else if (if_block) {
				if_block.d(1);
				if_block = null;
			}
		},
		d(detaching) {
			if (detaching) detach(div);
			if (if_block) if_block.d();
			mounted = false;
			dispose();
		}
	};
}

// (252:2) <section slot="panel-body">
function create_panel_body_slot(ctx) {
	let section;
	let console;
	let current;
	console = new Console({ props: { logs: /*logs*/ ctx[3] } });
	console.$on("clear", /*clear_logs*/ ctx[9]);

	return {
		c() {
			section = element("section");
			create_component(console.$$.fragment);
			attr(section, "slot", "panel-body");
		},
		m(target, anchor) {
			insert(target, section, anchor);
			mount_component(console, section, null);
			current = true;
		},
		p(ctx, dirty) {
			const console_changes = {};
			if (dirty & /*logs*/ 8) console_changes.logs = /*logs*/ ctx[3];
			console.$set(console_changes);
		},
		i(local) {
			if (current) return;
			transition_in(console.$$.fragment, local);
			current = true;
		},
		o(local) {
			transition_out(console.$$.fragment, local);
			current = false;
		},
		d(detaching) {
			if (detaching) detach(section);
			destroy_component(console);
		}
	};
}

// (233:1) <PaneWithPanel pos={100} panel="Console">
function create_default_slot_1(ctx) {
	let t0;
	let t1;

	return {
		c() {
			t0 = space();
			t1 = space();
		},
		m(target, anchor) {
			insert(target, t0, anchor);
			insert(target, t1, anchor);
		},
		p: noop,
		i: noop,
		o: noop,
		d(detaching) {
			if (detaching) detach(t0);
			if (detaching) detach(t1);
		}
	};
}

// (260:31) 
function create_if_block_1$9(ctx) {
	let message;
	let current;

	message = new Message({
			props: {
				kind: "info",
				truncate: true,
				$$slots: { default: [create_default_slot$2] },
				$$scope: { ctx }
			}
		});

	return {
		c() {
			create_component(message.$$.fragment);
		},
		m(target, anchor) {
			mount_component(message, target, anchor);
			current = true;
		},
		p(ctx, dirty) {
			const message_changes = {};

			if (dirty & /*$$scope, status*/ 536870914) {
				message_changes.$$scope = { dirty, ctx };
			}

			message.$set(message_changes);
		},
		i(local) {
			if (current) return;
			transition_in(message.$$.fragment, local);
			current = true;
		},
		o(local) {
			transition_out(message.$$.fragment, local);
			current = false;
		},
		d(detaching) {
			destroy_component(message, detaching);
		}
	};
}

// (258:2) {#if error}
function create_if_block$c(ctx) {
	let message;
	let current;

	message = new Message({
			props: { kind: "error", details: /*error*/ ctx[0] }
		});

	return {
		c() {
			create_component(message.$$.fragment);
		},
		m(target, anchor) {
			mount_component(message, target, anchor);
			current = true;
		},
		p(ctx, dirty) {
			const message_changes = {};
			if (dirty & /*error*/ 1) message_changes.details = /*error*/ ctx[0];
			message.$set(message_changes);
		},
		i(local) {
			if (current) return;
			transition_in(message.$$.fragment, local);
			current = true;
		},
		o(local) {
			transition_out(message.$$.fragment, local);
			current = false;
		},
		d(detaching) {
			destroy_component(message, detaching);
		}
	};
}

// (261:3) <Message kind="info" truncate>
function create_default_slot$2(ctx) {
	let t_value = (/*status*/ ctx[1] || "loading Svelte compiler...") + "";
	let t;

	return {
		c() {
			t = text(t_value);
		},
		m(target, anchor) {
			insert(target, t, anchor);
		},
		p(ctx, dirty) {
			if (dirty & /*status*/ 2 && t_value !== (t_value = (/*status*/ ctx[1] || "loading Svelte compiler...") + "")) set_data(t, t_value);
		},
		d(detaching) {
			if (detaching) detach(t);
		}
	};
}

function create_fragment$o(ctx) {
	let div1;
	let panewithpanel;
	let t;
	let div0;
	let current_block_type_index;
	let if_block;
	let current;

	panewithpanel = new PaneWithPanel({
			props: {
				pos: 100,
				panel: "Console",
				$$slots: {
					default: [create_default_slot_1],
					"panel-body": [create_panel_body_slot],
					"panel-header": [create_panel_header_slot],
					main: [create_main_slot]
				},
				$$scope: { ctx }
			}
		});

	const if_block_creators = [create_if_block$c, create_if_block_1$9];
	const if_blocks = [];

	function select_block_type(ctx, dirty) {
		if (/*error*/ ctx[0]) return 0;
		if (/*status*/ ctx[1] || !/*$bundle*/ ctx[7]) return 1;
		return -1;
	}

	if (~(current_block_type_index = select_block_type(ctx))) {
		if_block = if_blocks[current_block_type_index] = if_block_creators[current_block_type_index](ctx);
	}

	return {
		c() {
			div1 = element("div");
			create_component(panewithpanel.$$.fragment);
			t = space();
			div0 = element("div");
			if (if_block) if_block.c();
			attr(div0, "class", "overlay svelte-ivx2cg");
			attr(div1, "class", "iframe-container svelte-ivx2cg");
		},
		m(target, anchor) {
			insert(target, div1, anchor);
			mount_component(panewithpanel, div1, null);
			append(div1, t);
			append(div1, div0);

			if (~current_block_type_index) {
				if_blocks[current_block_type_index].m(div0, null);
			}

			current = true;
		},
		p(ctx, [dirty]) {
			const panewithpanel_changes = {};

			if (dirty & /*$$scope, logs, relaxed, error, pending_imports, iframe, inited*/ 536871037) {
				panewithpanel_changes.$$scope = { dirty, ctx };
			}

			panewithpanel.$set(panewithpanel_changes);
			let previous_block_index = current_block_type_index;
			current_block_type_index = select_block_type(ctx);

			if (current_block_type_index === previous_block_index) {
				if (~current_block_type_index) {
					if_blocks[current_block_type_index].p(ctx, dirty);
				}
			} else {
				if (if_block) {
					group_outros();

					transition_out(if_blocks[previous_block_index], 1, 1, () => {
						if_blocks[previous_block_index] = null;
					});

					check_outros();
				}

				if (~current_block_type_index) {
					if_block = if_blocks[current_block_type_index];

					if (!if_block) {
						if_block = if_blocks[current_block_type_index] = if_block_creators[current_block_type_index](ctx);
						if_block.c();
					}

					transition_in(if_block, 1);
					if_block.m(div0, null);
				} else {
					if_block = null;
				}
			}
		},
		i(local) {
			if (current) return;
			transition_in(panewithpanel.$$.fragment, local);
			transition_in(if_block);
			current = true;
		},
		o(local) {
			transition_out(panewithpanel.$$.fragment, local);
			transition_out(if_block);
			current = false;
		},
		d(detaching) {
			if (detaching) detach(div1);
			destroy_component(panewithpanel);

			if (~current_block_type_index) {
				if_blocks[current_block_type_index].d();
			}
		}
	};
}

let pending = false;

function instance$n($$self, $$props, $$invalidate) {
	let $bundle;
	const { bundle } = getContext("REPL");
	component_subscribe($$self, bundle, value => $$invalidate(7, $bundle = value));
	let { error } = $$props; // TODO should this be exposed as a prop?
	let logs = [];
	let log_group_stack = [];
	let current_log_group = logs;

	function setProp(prop, value) {
		if (!proxy) return;
		proxy.setProp(prop, value);
	}

	let { status } = $$props;
	let { relaxed = false } = $$props;
	let { injectedJS = "" } = $$props;
	let { injectedCSS = "" } = $$props;
	let iframe;
	let pending_imports = 0;
	let proxy = null;
	let ready = false;
	let inited = false;
	let last_console_event;

	onMount(() => {
		proxy = new ReplProxy(iframe,
		{
				on_fetch_progress: progress => {
					$$invalidate(5, pending_imports = progress);
				},
				on_error: event => {
					push_logs({ level: "error", args: [event.value] });
				},
				on_unhandled_rejection: event => {
					let error = event.value;
					if (typeof error === "string") error = { message: error };
					error.message = "Uncaught (in promise): " + error.message;
					push_logs({ level: "error", args: [error] });
				},
				on_console: log => {
					if (log.level === "clear") {
						clear_logs();
						push_logs(log);
					} else if (log.duplicate) {
						increment_duplicate_log();
					} else {
						push_logs(log);
					}
				},
				on_console_group: action => {
					group_logs(action.label, false);
				},
				on_console_group_end: () => {
					ungroup_logs();
				},
				on_console_group_collapsed: action => {
					group_logs(action.label, true);
				}
			});

		iframe.addEventListener("load", () => {
			proxy.handle_links();
			$$invalidate(16, ready = true);
		});

		return () => {
			proxy.destroy();
		};
	});

	async function apply_bundle($bundle) {
		if (!$bundle || $bundle.error) return;

		try {
			clear_logs();

			await proxy.eval(`
				${injectedJS}

				${styles}

				const styles = document.querySelectorAll('style[id^=svelte-]');

				${$bundle.dom.code}

				let i = styles.length;
				while (i--) styles[i].parentNode.removeChild(styles[i]);

				if (window.component) {
					try {
						window.component.$destroy();
					} catch (err) {
						console.error(err);
					}
				}

				document.body.innerHTML = '';
				window.location.hash = '';
				window._svelteTransitionManager = null;

				window.component = new SvelteComponent.default({
					target: document.body
				});
			`);

			$$invalidate(0, error = null);
		} catch(e) {
			show_error(e);
		}

		$$invalidate(6, inited = true);
	}

	function show_error(e) {
		const loc = getLocationFromStack(e.stack, $bundle.dom.map);

		if (loc) {
			e.filename = loc.source;
			e.loc = { line: loc.line, column: loc.column };
		}

		$$invalidate(0, error = e);
	}

	function push_logs(log) {
		current_log_group.push(last_console_event = log);
		$$invalidate(3, logs);
	}

	function group_logs(label, collapsed) {
		const group_log = {
			level: "group",
			label,
			collapsed,
			logs: []
		};

		current_log_group.push(group_log);
		log_group_stack.push(current_log_group);
		current_log_group = group_log.logs;
		$$invalidate(3, logs);
	}

	function ungroup_logs() {
		current_log_group = log_group_stack.pop();
	}

	function increment_duplicate_log() {
		const last_log = current_log_group[current_log_group.length - 1];

		if (last_log) {
			last_log.count = (last_log.count || 1) + 1;
			$$invalidate(3, logs);
		} else {
			last_console_event.count = 1;
			push_logs(last_console_event);
		}
	}

	function clear_logs() {
		current_log_group = $$invalidate(3, logs = []);
	}

	function iframe_1_binding($$value) {
		binding_callbacks[$$value ? "unshift" : "push"](() => {
			iframe = $$value;
			$$invalidate(4, iframe);
		});
	}

	$$self.$set = $$props => {
		if ("error" in $$props) $$invalidate(0, error = $$props.error);
		if ("status" in $$props) $$invalidate(1, status = $$props.status);
		if ("relaxed" in $$props) $$invalidate(2, relaxed = $$props.relaxed);
		if ("injectedJS" in $$props) $$invalidate(11, injectedJS = $$props.injectedJS);
		if ("injectedCSS" in $$props) $$invalidate(12, injectedCSS = $$props.injectedCSS);
	};

	let styles;

	$$self.$$.update = () => {
		if ($$self.$$.dirty & /*ready, $bundle*/ 65664) {
			 if (ready) apply_bundle($bundle);
		}

		if ($$self.$$.dirty & /*injectedCSS*/ 4096) {
			 styles = injectedCSS && `{
		const style = document.createElement('style');
		style.textContent = ${JSON.stringify(injectedCSS)};
		document.head.appendChild(style);
	}`;
		}
	};

	return [
		error,
		status,
		relaxed,
		logs,
		iframe,
		pending_imports,
		inited,
		$bundle,
		bundle,
		clear_logs,
		setProp,
		injectedJS,
		injectedCSS,
		iframe_1_binding
	];
}

class Viewer extends SvelteComponent {
	constructor(options) {
		super();
		if (!document.getElementById("svelte-ivx2cg-style")) add_css$h();

		init(this, options, instance$n, create_fragment$o, safe_not_equal, {
			error: 0,
			setProp: 10,
			status: 1,
			relaxed: 2,
			injectedJS: 11,
			injectedCSS: 12
		});
	}

	get setProp() {
		return this.$$.ctx[10];
	}
}

/* node_modules/@sveltejs/svelte-repl/src/Output/CompilerOptions.svelte generated by Svelte v3.24.0 */

function add_css$i() {
	var style = element("style");
	style.id = "svelte-159cly1-style";
	style.textContent = ".options.svelte-159cly1{padding:0 10px;font-family:var(--font-mono);font-size:13px;color:#999;line-height:1.8}.option.svelte-159cly1{display:block;padding:0 0 0 1.25em;white-space:nowrap;color:#333;user-select:none}.key.svelte-159cly1{display:inline-block;width:9em}.string.svelte-159cly1{color:hsl(41, 37%, 45%)}.boolean.svelte-159cly1{color:hsl(45, 7%, 45%)}label.svelte-159cly1{display:inline-block}label[for].svelte-159cly1{color:var(--string)}input[type=checkbox].svelte-159cly1{top:-1px}input[type=radio].svelte-159cly1{position:absolute;top:auto;overflow:hidden;clip:rect(1px, 1px, 1px, 1px);width:1px;height:1px;white-space:nowrap}input[type=radio]+label.svelte-159cly1{padding:0 0 0 1.6em;margin:0 0.6em 0 0;opacity:0.7}input[type=radio]:checked+label.svelte-159cly1{opacity:1}input[type=radio]+label.svelte-159cly1:before{content:'';background:#eee;display:block;box-sizing:border-box;float:left;width:15px;height:15px;margin-left:-21px;margin-top:4px;vertical-align:top;cursor:pointer;text-align:center;transition:box-shadow 0.1s ease-out}input[type=radio]+label.svelte-159cly1:before{background-color:var(--second);border-radius:100%;box-shadow:inset 0 0 0 0.5em rgba(255, 255, 255, .95);border:1px solid var(--second)}input[type=radio]:checked+label.svelte-159cly1:before{background-color:var(--prime);box-shadow:inset 0 0 0 .15em rgba(255, 255, 255, .95);border:1px solid var(--second);transition:box-shadow 0.2s ease-out}";
	append(document.head, style);
}

function create_fragment$p(ctx) {
	let div1;
	let t0;
	let div0;
	let span0;
	let t2;
	let input0;
	let t3;
	let label0;
	let t5;
	let input1;
	let t6;
	let label1;
	let t9;
	let label2;
	let span3;
	let t11;
	let input2;
	let t12;
	let span4;
	let t13_value = /*$compile_options*/ ctx[0].dev + "";
	let t13;
	let t14;
	let t15;
	let label3;
	let span5;
	let t17;
	let input3;
	let t18;
	let span6;
	let t19_value = /*$compile_options*/ ctx[0].css + "";
	let t19;
	let t20;
	let t21;
	let label4;
	let span7;
	let t23;
	let input4;
	let t24;
	let span8;
	let t25_value = /*$compile_options*/ ctx[0].hydratable + "";
	let t25;
	let t26;
	let t27;
	let label5;
	let span9;
	let t29;
	let input5;
	let t30;
	let span10;
	let t31_value = /*$compile_options*/ ctx[0].customElement + "";
	let t31;
	let t32;
	let t33;
	let label6;
	let span11;
	let t35;
	let input6;
	let t36;
	let span12;
	let t37_value = /*$compile_options*/ ctx[0].immutable + "";
	let t37;
	let t38;
	let t39;
	let label7;
	let span13;
	let t41;
	let input7;
	let t42;
	let span14;
	let t43_value = /*$compile_options*/ ctx[0].legacy + "";
	let t43;
	let t44;
	let mounted;
	let dispose;

	return {
		c() {
			div1 = element("div");
			t0 = text("result = svelte.compile(source, {\n\t");
			div0 = element("div");
			span0 = element("span");
			span0.textContent = "generate:";
			t2 = space();
			input0 = element("input");
			t3 = space();
			label0 = element("label");
			label0.innerHTML = `<span class="string svelte-159cly1">&quot;dom&quot;</span>`;
			t5 = space();
			input1 = element("input");
			t6 = space();
			label1 = element("label");
			label1.innerHTML = `<span class="string svelte-159cly1">&quot;ssr&quot;</span>,`;
			t9 = space();
			label2 = element("label");
			span3 = element("span");
			span3.textContent = "dev:";
			t11 = space();
			input2 = element("input");
			t12 = space();
			span4 = element("span");
			t13 = text(t13_value);
			t14 = text(",");
			t15 = space();
			label3 = element("label");
			span5 = element("span");
			span5.textContent = "css:";
			t17 = space();
			input3 = element("input");
			t18 = space();
			span6 = element("span");
			t19 = text(t19_value);
			t20 = text(",");
			t21 = space();
			label4 = element("label");
			span7 = element("span");
			span7.textContent = "hydratable:";
			t23 = space();
			input4 = element("input");
			t24 = space();
			span8 = element("span");
			t25 = text(t25_value);
			t26 = text(",");
			t27 = space();
			label5 = element("label");
			span9 = element("span");
			span9.textContent = "customElement:";
			t29 = space();
			input5 = element("input");
			t30 = space();
			span10 = element("span");
			t31 = text(t31_value);
			t32 = text(",");
			t33 = space();
			label6 = element("label");
			span11 = element("span");
			span11.textContent = "immutable:";
			t35 = space();
			input6 = element("input");
			t36 = space();
			span12 = element("span");
			t37 = text(t37_value);
			t38 = text(",");
			t39 = space();
			label7 = element("label");
			span13 = element("span");
			span13.textContent = "legacy:";
			t41 = space();
			input7 = element("input");
			t42 = space();
			span14 = element("span");
			t43 = text(t43_value);
			t44 = text("\n\t});");
			attr(span0, "class", "key svelte-159cly1");
			attr(input0, "id", "dom-input");
			attr(input0, "type", "radio");
			input0.__value = "dom";
			input0.value = input0.__value;
			attr(input0, "class", "svelte-159cly1");
			/*$$binding_groups*/ ctx[3][0].push(input0);
			attr(label0, "for", "dom-input");
			attr(label0, "class", "svelte-159cly1");
			attr(input1, "id", "ssr-input");
			attr(input1, "type", "radio");
			input1.__value = "ssr";
			input1.value = input1.__value;
			attr(input1, "class", "svelte-159cly1");
			/*$$binding_groups*/ ctx[3][0].push(input1);
			attr(label1, "for", "ssr-input");
			attr(label1, "class", "svelte-159cly1");
			attr(div0, "class", "option svelte-159cly1");
			attr(span3, "class", "key svelte-159cly1");
			attr(input2, "type", "checkbox");
			attr(input2, "class", "svelte-159cly1");
			attr(span4, "class", "boolean svelte-159cly1");
			attr(label2, "class", "option svelte-159cly1");
			attr(span5, "class", "key svelte-159cly1");
			attr(input3, "type", "checkbox");
			attr(input3, "class", "svelte-159cly1");
			attr(span6, "class", "boolean svelte-159cly1");
			attr(label3, "class", "option svelte-159cly1");
			attr(span7, "class", "key svelte-159cly1");
			attr(input4, "type", "checkbox");
			attr(input4, "class", "svelte-159cly1");
			attr(span8, "class", "boolean svelte-159cly1");
			attr(label4, "class", "option svelte-159cly1");
			attr(span9, "class", "key svelte-159cly1");
			attr(input5, "type", "checkbox");
			attr(input5, "class", "svelte-159cly1");
			attr(span10, "class", "boolean svelte-159cly1");
			attr(label5, "class", "option svelte-159cly1");
			attr(span11, "class", "key svelte-159cly1");
			attr(input6, "type", "checkbox");
			attr(input6, "class", "svelte-159cly1");
			attr(span12, "class", "boolean svelte-159cly1");
			attr(label6, "class", "option svelte-159cly1");
			attr(span13, "class", "key svelte-159cly1");
			attr(input7, "type", "checkbox");
			attr(input7, "class", "svelte-159cly1");
			attr(span14, "class", "boolean svelte-159cly1");
			attr(label7, "class", "option svelte-159cly1");
			attr(div1, "class", "options svelte-159cly1");
		},
		m(target, anchor) {
			insert(target, div1, anchor);
			append(div1, t0);
			append(div1, div0);
			append(div0, span0);
			append(div0, t2);
			append(div0, input0);
			input0.checked = input0.__value === /*$compile_options*/ ctx[0].generate;
			append(div0, t3);
			append(div0, label0);
			append(div0, t5);
			append(div0, input1);
			input1.checked = input1.__value === /*$compile_options*/ ctx[0].generate;
			append(div0, t6);
			append(div0, label1);
			append(div1, t9);
			append(div1, label2);
			append(label2, span3);
			append(label2, t11);
			append(label2, input2);
			input2.checked = /*$compile_options*/ ctx[0].dev;
			append(label2, t12);
			append(label2, span4);
			append(span4, t13);
			append(label2, t14);
			append(div1, t15);
			append(div1, label3);
			append(label3, span5);
			append(label3, t17);
			append(label3, input3);
			input3.checked = /*$compile_options*/ ctx[0].css;
			append(label3, t18);
			append(label3, span6);
			append(span6, t19);
			append(label3, t20);
			append(div1, t21);
			append(div1, label4);
			append(label4, span7);
			append(label4, t23);
			append(label4, input4);
			input4.checked = /*$compile_options*/ ctx[0].hydratable;
			append(label4, t24);
			append(label4, span8);
			append(span8, t25);
			append(label4, t26);
			append(div1, t27);
			append(div1, label5);
			append(label5, span9);
			append(label5, t29);
			append(label5, input5);
			input5.checked = /*$compile_options*/ ctx[0].customElement;
			append(label5, t30);
			append(label5, span10);
			append(span10, t31);
			append(label5, t32);
			append(div1, t33);
			append(div1, label6);
			append(label6, span11);
			append(label6, t35);
			append(label6, input6);
			input6.checked = /*$compile_options*/ ctx[0].immutable;
			append(label6, t36);
			append(label6, span12);
			append(span12, t37);
			append(label6, t38);
			append(div1, t39);
			append(div1, label7);
			append(label7, span13);
			append(label7, t41);
			append(label7, input7);
			input7.checked = /*$compile_options*/ ctx[0].legacy;
			append(label7, t42);
			append(label7, span14);
			append(span14, t43);
			append(div1, t44);

			if (!mounted) {
				dispose = [
					listen(input0, "change", /*input0_change_handler*/ ctx[2]),
					listen(input1, "change", /*input1_change_handler*/ ctx[4]),
					listen(input2, "change", /*input2_change_handler*/ ctx[5]),
					listen(input3, "change", /*input3_change_handler*/ ctx[6]),
					listen(input4, "change", /*input4_change_handler*/ ctx[7]),
					listen(input5, "change", /*input5_change_handler*/ ctx[8]),
					listen(input6, "change", /*input6_change_handler*/ ctx[9]),
					listen(input7, "change", /*input7_change_handler*/ ctx[10])
				];

				mounted = true;
			}
		},
		p(ctx, [dirty]) {
			if (dirty & /*$compile_options*/ 1) {
				input0.checked = input0.__value === /*$compile_options*/ ctx[0].generate;
			}

			if (dirty & /*$compile_options*/ 1) {
				input1.checked = input1.__value === /*$compile_options*/ ctx[0].generate;
			}

			if (dirty & /*$compile_options*/ 1) {
				input2.checked = /*$compile_options*/ ctx[0].dev;
			}

			if (dirty & /*$compile_options*/ 1 && t13_value !== (t13_value = /*$compile_options*/ ctx[0].dev + "")) set_data(t13, t13_value);

			if (dirty & /*$compile_options*/ 1) {
				input3.checked = /*$compile_options*/ ctx[0].css;
			}

			if (dirty & /*$compile_options*/ 1 && t19_value !== (t19_value = /*$compile_options*/ ctx[0].css + "")) set_data(t19, t19_value);

			if (dirty & /*$compile_options*/ 1) {
				input4.checked = /*$compile_options*/ ctx[0].hydratable;
			}

			if (dirty & /*$compile_options*/ 1 && t25_value !== (t25_value = /*$compile_options*/ ctx[0].hydratable + "")) set_data(t25, t25_value);

			if (dirty & /*$compile_options*/ 1) {
				input5.checked = /*$compile_options*/ ctx[0].customElement;
			}

			if (dirty & /*$compile_options*/ 1 && t31_value !== (t31_value = /*$compile_options*/ ctx[0].customElement + "")) set_data(t31, t31_value);

			if (dirty & /*$compile_options*/ 1) {
				input6.checked = /*$compile_options*/ ctx[0].immutable;
			}

			if (dirty & /*$compile_options*/ 1 && t37_value !== (t37_value = /*$compile_options*/ ctx[0].immutable + "")) set_data(t37, t37_value);

			if (dirty & /*$compile_options*/ 1) {
				input7.checked = /*$compile_options*/ ctx[0].legacy;
			}

			if (dirty & /*$compile_options*/ 1 && t43_value !== (t43_value = /*$compile_options*/ ctx[0].legacy + "")) set_data(t43, t43_value);
		},
		i: noop,
		o: noop,
		d(detaching) {
			if (detaching) detach(div1);
			/*$$binding_groups*/ ctx[3][0].splice(/*$$binding_groups*/ ctx[3][0].indexOf(input0), 1);
			/*$$binding_groups*/ ctx[3][0].splice(/*$$binding_groups*/ ctx[3][0].indexOf(input1), 1);
			mounted = false;
			run_all(dispose);
		}
	};
}

function instance$o($$self, $$props, $$invalidate) {
	let $compile_options;
	const { compile_options } = getContext("REPL");
	component_subscribe($$self, compile_options, value => $$invalidate(0, $compile_options = value));
	const $$binding_groups = [[]];

	function input0_change_handler() {
		$compile_options.generate = this.__value;
		compile_options.set($compile_options);
	}

	function input1_change_handler() {
		$compile_options.generate = this.__value;
		compile_options.set($compile_options);
	}

	function input2_change_handler() {
		$compile_options.dev = this.checked;
		compile_options.set($compile_options);
	}

	function input3_change_handler() {
		$compile_options.css = this.checked;
		compile_options.set($compile_options);
	}

	function input4_change_handler() {
		$compile_options.hydratable = this.checked;
		compile_options.set($compile_options);
	}

	function input5_change_handler() {
		$compile_options.customElement = this.checked;
		compile_options.set($compile_options);
	}

	function input6_change_handler() {
		$compile_options.immutable = this.checked;
		compile_options.set($compile_options);
	}

	function input7_change_handler() {
		$compile_options.legacy = this.checked;
		compile_options.set($compile_options);
	}

	return [
		$compile_options,
		compile_options,
		input0_change_handler,
		$$binding_groups,
		input1_change_handler,
		input2_change_handler,
		input3_change_handler,
		input4_change_handler,
		input5_change_handler,
		input6_change_handler,
		input7_change_handler
	];
}

class CompilerOptions extends SvelteComponent {
	constructor(options) {
		super();
		if (!document.getElementById("svelte-159cly1-style")) add_css$i();
		init(this, options, instance$o, create_fragment$p, safe_not_equal, {});
	}
}

const workers = new Map();

let uid$1 = 1;

class Compiler {
	constructor(workersUrl, svelteUrl) {
		if (!workers.has(svelteUrl)) {
			const worker = new Worker(`${workersUrl}/compiler.js`);
			worker.postMessage({ type: 'init', svelteUrl });
			workers.set(svelteUrl, worker);
		}

		this.worker = workers.get(svelteUrl);

		this.handlers = new Map();

		this.worker.addEventListener('message', event => {
			const handler = this.handlers.get(event.data.id);

			if (handler) { // if no handler, was meant for a different REPL
				handler(event.data.result);
				this.handlers.delete(event.data.id);
			}
		});
	}

	compile(component, options) {
		return new Promise(fulfil => {
			const id = uid$1++;

			this.handlers.set(id, fulfil);

			this.worker.postMessage({
				id,
				type: 'compile',
				source: component.source,
				options: Object.assign({
					name: component.name,
					filename: `${component.name}.svelte`
				}, options),
				entry: component.name === 'App'
			});
		});
	}

	destroy() {
		this.worker.terminate();
	}
}

/* node_modules/@sveltejs/svelte-repl/src/Output/index.svelte generated by Svelte v3.24.0 */

function add_css$j() {
	var style = element("style");
	style.id = "svelte-4izmoy-style";
	style.textContent = ".view-toggle.svelte-4izmoy{height:var(--pane-controls-h);border-bottom:1px solid #eee;white-space:nowrap;box-sizing:border-box}button.svelte-4izmoy{background:white;text-align:left;position:relative;font:400 12px/1.5 var(--font);border:none;border-bottom:3px solid transparent;padding:12px 12px 8px 12px;color:#999;border-radius:0}button.active.svelte-4izmoy{border-bottom:3px solid var(--prime);color:#333}div[slot].svelte-4izmoy{height:100%}.tab-content.svelte-4izmoy{position:absolute;width:100%;height:calc(100% - 42px) !important;opacity:0;pointer-events:none}.tab-content.visible.svelte-4izmoy{opacity:1;pointer-events:all}iframe.svelte-4izmoy{width:100%;height:100%;border:none;display:block}";
	append(document.head, style);
}

// (132:1) {:else}
function create_else_block_1$1(ctx) {
	let button0;
	let t1;
	let button1;
	let t3;
	let button2;
	let mounted;
	let dispose;

	return {
		c() {
			button0 = element("button");
			button0.textContent = "Result";
			t1 = space();
			button1 = element("button");
			button1.textContent = "JS output";
			t3 = space();
			button2 = element("button");
			button2.textContent = "CSS output";
			attr(button0, "class", "svelte-4izmoy");
			toggle_class(button0, "active", /*view*/ ctx[10] === "result");
			attr(button1, "class", "svelte-4izmoy");
			toggle_class(button1, "active", /*view*/ ctx[10] === "js");
			attr(button2, "class", "svelte-4izmoy");
			toggle_class(button2, "active", /*view*/ ctx[10] === "css");
		},
		m(target, anchor) {
			insert(target, button0, anchor);
			insert(target, t1, anchor);
			insert(target, button1, anchor);
			insert(target, t3, anchor);
			insert(target, button2, anchor);

			if (!mounted) {
				dispose = [
					listen(button0, "click", /*click_handler*/ ctx[15]),
					listen(button1, "click", /*click_handler_1*/ ctx[16]),
					listen(button2, "click", /*click_handler_2*/ ctx[17])
				];

				mounted = true;
			}
		},
		p(ctx, dirty) {
			if (dirty & /*view*/ 1024) {
				toggle_class(button0, "active", /*view*/ ctx[10] === "result");
			}

			if (dirty & /*view*/ 1024) {
				toggle_class(button1, "active", /*view*/ ctx[10] === "js");
			}

			if (dirty & /*view*/ 1024) {
				toggle_class(button2, "active", /*view*/ ctx[10] === "css");
			}
		},
		d(detaching) {
			if (detaching) detach(button0);
			if (detaching) detach(t1);
			if (detaching) detach(button1);
			if (detaching) detach(t3);
			if (detaching) detach(button2);
			mounted = false;
			run_all(dispose);
		}
	};
}

// (130:1) {#if selected_type === 'md'}
function create_if_block_1$a(ctx) {
	let button;

	return {
		c() {
			button = element("button");
			button.textContent = "Markdown";
			attr(button, "class", "active svelte-4izmoy");
		},
		m(target, anchor) {
			insert(target, button, anchor);
		},
		p: noop,
		d(detaching) {
			if (detaching) detach(button);
		}
	};
}

// (171:1) {:else}
function create_else_block$7(ctx) {
	let panewithpanel;
	let current;

	panewithpanel = new PaneWithPanel({
			props: {
				pos: 67,
				panel: "Compiler options",
				$$slots: {
					default: [create_default_slot$3],
					"panel-body": [create_panel_body_slot$1],
					main: [create_main_slot$1]
				},
				$$scope: { ctx }
			}
		});

	return {
		c() {
			create_component(panewithpanel.$$.fragment);
		},
		m(target, anchor) {
			mount_component(panewithpanel, target, anchor);
			current = true;
		},
		p(ctx, dirty) {
			const panewithpanel_changes = {};

			if (dirty & /*$$scope, sourceErrorLoc, js_editor*/ 134217988) {
				panewithpanel_changes.$$scope = { dirty, ctx };
			}

			panewithpanel.$set(panewithpanel_changes);
		},
		i(local) {
			if (current) return;
			transition_in(panewithpanel.$$.fragment, local);
			current = true;
		},
		o(local) {
			transition_out(panewithpanel.$$.fragment, local);
			current = false;
		},
		d(detaching) {
			destroy_component(panewithpanel, detaching);
		}
	};
}

// (164:1) {#if embedded}
function create_if_block$d(ctx) {
	let codemirror;
	let current;

	let codemirror_props = {
		mode: "js",
		errorLoc: /*sourceErrorLoc*/ ctx[2],
		readonly: true
	};

	codemirror = new CodeMirror_1({ props: codemirror_props });
	/*codemirror_binding*/ ctx[20](codemirror);

	return {
		c() {
			create_component(codemirror.$$.fragment);
		},
		m(target, anchor) {
			mount_component(codemirror, target, anchor);
			current = true;
		},
		p(ctx, dirty) {
			const codemirror_changes = {};
			if (dirty & /*sourceErrorLoc*/ 4) codemirror_changes.errorLoc = /*sourceErrorLoc*/ ctx[2];
			codemirror.$set(codemirror_changes);
		},
		i(local) {
			if (current) return;
			transition_in(codemirror.$$.fragment, local);
			current = true;
		},
		o(local) {
			transition_out(codemirror.$$.fragment, local);
			current = false;
		},
		d(detaching) {
			/*codemirror_binding*/ ctx[20](null);
			destroy_component(codemirror, detaching);
		}
	};
}

// (173:3) <div slot="main">
function create_main_slot$1(ctx) {
	let div;
	let codemirror;
	let current;

	let codemirror_props = {
		mode: "js",
		errorLoc: /*sourceErrorLoc*/ ctx[2],
		readonly: true
	};

	codemirror = new CodeMirror_1({ props: codemirror_props });
	/*codemirror_binding_1*/ ctx[21](codemirror);

	return {
		c() {
			div = element("div");
			create_component(codemirror.$$.fragment);
			attr(div, "slot", "main");
			attr(div, "class", "svelte-4izmoy");
		},
		m(target, anchor) {
			insert(target, div, anchor);
			mount_component(codemirror, div, null);
			current = true;
		},
		p(ctx, dirty) {
			const codemirror_changes = {};
			if (dirty & /*sourceErrorLoc*/ 4) codemirror_changes.errorLoc = /*sourceErrorLoc*/ ctx[2];
			codemirror.$set(codemirror_changes);
		},
		i(local) {
			if (current) return;
			transition_in(codemirror.$$.fragment, local);
			current = true;
		},
		o(local) {
			transition_out(codemirror.$$.fragment, local);
			current = false;
		},
		d(detaching) {
			if (detaching) detach(div);
			/*codemirror_binding_1*/ ctx[21](null);
			destroy_component(codemirror);
		}
	};
}

// (182:3) <div slot="panel-body">
function create_panel_body_slot$1(ctx) {
	let div;
	let compileroptions;
	let current;
	compileroptions = new CompilerOptions({});

	return {
		c() {
			div = element("div");
			create_component(compileroptions.$$.fragment);
			attr(div, "slot", "panel-body");
			attr(div, "class", "svelte-4izmoy");
		},
		m(target, anchor) {
			insert(target, div, anchor);
			mount_component(compileroptions, div, null);
			current = true;
		},
		i(local) {
			if (current) return;
			transition_in(compileroptions.$$.fragment, local);
			current = true;
		},
		o(local) {
			transition_out(compileroptions.$$.fragment, local);
			current = false;
		},
		d(detaching) {
			if (detaching) detach(div);
			destroy_component(compileroptions);
		}
	};
}

// (172:2) <PaneWithPanel pos={67} panel="Compiler options">
function create_default_slot$3(ctx) {
	let t;

	return {
		c() {
			t = space();
		},
		m(target, anchor) {
			insert(target, t, anchor);
		},
		p: noop,
		i: noop,
		o: noop,
		d(detaching) {
			if (detaching) detach(t);
		}
	};
}

function create_fragment$q(ctx) {
	let div0;
	let t0;
	let div1;
	let viewer_1;
	let updating_error;
	let t1;
	let div2;
	let current_block_type_index;
	let if_block1;
	let t2;
	let div3;
	let codemirror;
	let t3;
	let div4;
	let iframe;
	let current;

	function select_block_type(ctx, dirty) {
		if (/*selected_type*/ ctx[11] === "md") return create_if_block_1$a;
		return create_else_block_1$1;
	}

	let current_block_type = select_block_type(ctx);
	let if_block0 = current_block_type(ctx);

	function viewer_1_error_binding(value) {
		/*viewer_1_error_binding*/ ctx[19].call(null, value);
	}

	let viewer_1_props = {
		status: /*status*/ ctx[1],
		relaxed: /*relaxed*/ ctx[4],
		injectedJS: /*injectedJS*/ ctx[5],
		injectedCSS: /*injectedCSS*/ ctx[6]
	};

	if (/*runtimeError*/ ctx[0] !== void 0) {
		viewer_1_props.error = /*runtimeError*/ ctx[0];
	}

	viewer_1 = new Viewer({ props: viewer_1_props });
	/*viewer_1_binding*/ ctx[18](viewer_1);
	binding_callbacks.push(() => bind(viewer_1, "error", viewer_1_error_binding));
	const if_block_creators = [create_if_block$d, create_else_block$7];
	const if_blocks = [];

	function select_block_type_1(ctx, dirty) {
		if (/*embedded*/ ctx[3]) return 0;
		return 1;
	}

	current_block_type_index = select_block_type_1(ctx);
	if_block1 = if_blocks[current_block_type_index] = if_block_creators[current_block_type_index](ctx);

	let codemirror_props = {
		mode: "css",
		errorLoc: /*sourceErrorLoc*/ ctx[2],
		readonly: true
	};

	codemirror = new CodeMirror_1({ props: codemirror_props });
	/*codemirror_binding_2*/ ctx[22](codemirror);

	return {
		c() {
			div0 = element("div");
			if_block0.c();
			t0 = space();
			div1 = element("div");
			create_component(viewer_1.$$.fragment);
			t1 = space();
			div2 = element("div");
			if_block1.c();
			t2 = space();
			div3 = element("div");
			create_component(codemirror.$$.fragment);
			t3 = space();
			div4 = element("div");
			iframe = element("iframe");
			attr(div0, "class", "view-toggle svelte-4izmoy");
			attr(div1, "class", "tab-content svelte-4izmoy");
			toggle_class(div1, "visible", /*selected_type*/ ctx[11] !== "md" && /*view*/ ctx[10] === "result");
			attr(div2, "class", "tab-content svelte-4izmoy");
			toggle_class(div2, "visible", /*selected_type*/ ctx[11] !== "md" && /*view*/ ctx[10] === "js");
			attr(div3, "class", "tab-content svelte-4izmoy");
			toggle_class(div3, "visible", /*selected_type*/ ctx[11] !== "md" && /*view*/ ctx[10] === "css");
			attr(iframe, "title", "Markdown");
			attr(iframe, "srcdoc", /*markdown*/ ctx[12]);
			attr(iframe, "class", "svelte-4izmoy");
			attr(div4, "class", "tab-content svelte-4izmoy");
			toggle_class(div4, "visible", /*selected_type*/ ctx[11] === "md");
		},
		m(target, anchor) {
			insert(target, div0, anchor);
			if_block0.m(div0, null);
			insert(target, t0, anchor);
			insert(target, div1, anchor);
			mount_component(viewer_1, div1, null);
			insert(target, t1, anchor);
			insert(target, div2, anchor);
			if_blocks[current_block_type_index].m(div2, null);
			insert(target, t2, anchor);
			insert(target, div3, anchor);
			mount_component(codemirror, div3, null);
			insert(target, t3, anchor);
			insert(target, div4, anchor);
			append(div4, iframe);
			current = true;
		},
		p(ctx, [dirty]) {
			if (current_block_type === (current_block_type = select_block_type(ctx)) && if_block0) {
				if_block0.p(ctx, dirty);
			} else {
				if_block0.d(1);
				if_block0 = current_block_type(ctx);

				if (if_block0) {
					if_block0.c();
					if_block0.m(div0, null);
				}
			}

			const viewer_1_changes = {};
			if (dirty & /*status*/ 2) viewer_1_changes.status = /*status*/ ctx[1];
			if (dirty & /*relaxed*/ 16) viewer_1_changes.relaxed = /*relaxed*/ ctx[4];
			if (dirty & /*injectedJS*/ 32) viewer_1_changes.injectedJS = /*injectedJS*/ ctx[5];
			if (dirty & /*injectedCSS*/ 64) viewer_1_changes.injectedCSS = /*injectedCSS*/ ctx[6];

			if (!updating_error && dirty & /*runtimeError*/ 1) {
				updating_error = true;
				viewer_1_changes.error = /*runtimeError*/ ctx[0];
				add_flush_callback(() => updating_error = false);
			}

			viewer_1.$set(viewer_1_changes);

			if (dirty & /*selected_type, view*/ 3072) {
				toggle_class(div1, "visible", /*selected_type*/ ctx[11] !== "md" && /*view*/ ctx[10] === "result");
			}

			let previous_block_index = current_block_type_index;
			current_block_type_index = select_block_type_1(ctx);

			if (current_block_type_index === previous_block_index) {
				if_blocks[current_block_type_index].p(ctx, dirty);
			} else {
				group_outros();

				transition_out(if_blocks[previous_block_index], 1, 1, () => {
					if_blocks[previous_block_index] = null;
				});

				check_outros();
				if_block1 = if_blocks[current_block_type_index];

				if (!if_block1) {
					if_block1 = if_blocks[current_block_type_index] = if_block_creators[current_block_type_index](ctx);
					if_block1.c();
				}

				transition_in(if_block1, 1);
				if_block1.m(div2, null);
			}

			if (dirty & /*selected_type, view*/ 3072) {
				toggle_class(div2, "visible", /*selected_type*/ ctx[11] !== "md" && /*view*/ ctx[10] === "js");
			}

			const codemirror_changes = {};
			if (dirty & /*sourceErrorLoc*/ 4) codemirror_changes.errorLoc = /*sourceErrorLoc*/ ctx[2];
			codemirror.$set(codemirror_changes);

			if (dirty & /*selected_type, view*/ 3072) {
				toggle_class(div3, "visible", /*selected_type*/ ctx[11] !== "md" && /*view*/ ctx[10] === "css");
			}

			if (!current || dirty & /*markdown*/ 4096) {
				attr(iframe, "srcdoc", /*markdown*/ ctx[12]);
			}

			if (dirty & /*selected_type*/ 2048) {
				toggle_class(div4, "visible", /*selected_type*/ ctx[11] === "md");
			}
		},
		i(local) {
			if (current) return;
			transition_in(viewer_1.$$.fragment, local);
			transition_in(if_block1);
			transition_in(codemirror.$$.fragment, local);
			current = true;
		},
		o(local) {
			transition_out(viewer_1.$$.fragment, local);
			transition_out(if_block1);
			transition_out(codemirror.$$.fragment, local);
			current = false;
		},
		d(detaching) {
			if (detaching) detach(div0);
			if_block0.d();
			if (detaching) detach(t0);
			if (detaching) detach(div1);
			/*viewer_1_binding*/ ctx[18](null);
			destroy_component(viewer_1);
			if (detaching) detach(t1);
			if (detaching) detach(div2);
			if_blocks[current_block_type_index].d();
			if (detaching) detach(t2);
			if (detaching) detach(div3);
			/*codemirror_binding_2*/ ctx[22](null);
			destroy_component(codemirror);
			if (detaching) detach(t3);
			if (detaching) detach(div4);
		}
	};
}

function instance$p($$self, $$props, $$invalidate) {
	const { register_output } = getContext("REPL");
	let { svelteUrl } = $$props;
	let { workersUrl } = $$props;
	let { status } = $$props;
	let { sourceErrorLoc = null } = $$props;
	let { runtimeError = null } = $$props;
	let { embedded = false } = $$props;
	let { relaxed = false } = $$props;
	let { injectedJS } = $$props;
	let { injectedCSS } = $$props;

	register_output({
		set: async (selected, options) => {
			$$invalidate(11, selected_type = selected.type);

			if (selected.type === "js" || selected.type === "json") {
				js_editor.set(`/* Select a component to see its compiled code */`);
				css_editor.set(`/* Select a component to see its compiled code */`);
				return;
			}

			if (selected.type === "md") {
				$$invalidate(12, markdown = marked_1(selected.source));
				return;
			}

			const compiled = await compiler.compile(selected, options);
			if (!js_editor) return; // unmounted
			js_editor.set(compiled.js, "js");
			css_editor.set(compiled.css, "css");
		},
		update: async (selected, options) => {
			if (selected.type === "js" || selected.type === "json") return;

			if (selected.type === "md") {
				$$invalidate(12, markdown = marked_1(selected.source));
				return;
			}

			const compiled = await compiler.compile(selected, options);
			if (!js_editor) return; // unmounted
			js_editor.update(compiled.js);
			css_editor.update(compiled.css);
		}
	});

	const compiler = is_browser && new Compiler(workersUrl, svelteUrl);

	// refs
	let viewer;

	let js_editor;
	let css_editor;
	let view = "result";
	let selected_type = "";
	let markdown = "";
	const click_handler = () => $$invalidate(10, view = "result");
	const click_handler_1 = () => $$invalidate(10, view = "js");
	const click_handler_2 = () => $$invalidate(10, view = "css");

	function viewer_1_binding($$value) {
		binding_callbacks[$$value ? "unshift" : "push"](() => {
			viewer = $$value;
			$$invalidate(7, viewer);
		});
	}

	function viewer_1_error_binding(value) {
		runtimeError = value;
		$$invalidate(0, runtimeError);
	}

	function codemirror_binding($$value) {
		binding_callbacks[$$value ? "unshift" : "push"](() => {
			js_editor = $$value;
			$$invalidate(8, js_editor);
		});
	}

	function codemirror_binding_1($$value) {
		binding_callbacks[$$value ? "unshift" : "push"](() => {
			js_editor = $$value;
			$$invalidate(8, js_editor);
		});
	}

	function codemirror_binding_2($$value) {
		binding_callbacks[$$value ? "unshift" : "push"](() => {
			css_editor = $$value;
			$$invalidate(9, css_editor);
		});
	}

	$$self.$set = $$props => {
		if ("svelteUrl" in $$props) $$invalidate(13, svelteUrl = $$props.svelteUrl);
		if ("workersUrl" in $$props) $$invalidate(14, workersUrl = $$props.workersUrl);
		if ("status" in $$props) $$invalidate(1, status = $$props.status);
		if ("sourceErrorLoc" in $$props) $$invalidate(2, sourceErrorLoc = $$props.sourceErrorLoc);
		if ("runtimeError" in $$props) $$invalidate(0, runtimeError = $$props.runtimeError);
		if ("embedded" in $$props) $$invalidate(3, embedded = $$props.embedded);
		if ("relaxed" in $$props) $$invalidate(4, relaxed = $$props.relaxed);
		if ("injectedJS" in $$props) $$invalidate(5, injectedJS = $$props.injectedJS);
		if ("injectedCSS" in $$props) $$invalidate(6, injectedCSS = $$props.injectedCSS);
	};

	return [
		runtimeError,
		status,
		sourceErrorLoc,
		embedded,
		relaxed,
		injectedJS,
		injectedCSS,
		viewer,
		js_editor,
		css_editor,
		view,
		selected_type,
		markdown,
		svelteUrl,
		workersUrl,
		click_handler,
		click_handler_1,
		click_handler_2,
		viewer_1_binding,
		viewer_1_error_binding,
		codemirror_binding,
		codemirror_binding_1,
		codemirror_binding_2
	];
}

class Output extends SvelteComponent {
	constructor(options) {
		super();
		if (!document.getElementById("svelte-4izmoy-style")) add_css$j();

		init(this, options, instance$p, create_fragment$q, safe_not_equal, {
			svelteUrl: 13,
			workersUrl: 14,
			status: 1,
			sourceErrorLoc: 2,
			runtimeError: 0,
			embedded: 3,
			relaxed: 4,
			injectedJS: 5,
			injectedCSS: 6
		});
	}
}

const workers$1 = new Map();

let uid$2 = 1;

class Bundler {
	constructor({ workersUrl, packagesUrl, svelteUrl, onstatus }) {
		const hash = `${packagesUrl}:${svelteUrl}`;

		if (!workers$1.has(hash)) {
			const worker = new Worker(`${workersUrl}/bundler.js`);
			worker.postMessage({ type: 'init', packagesUrl, svelteUrl });
			workers$1.set(hash, worker);
		}

		this.worker = workers$1.get(hash);

		this.handlers = new Map();

		this.worker.addEventListener('message', event => {
			const handler = this.handlers.get(event.data.uid);

			if (handler) { // if no handler, was meant for a different REPL
				if (event.data.type === 'status') {
					onstatus(event.data.message);
					return;
				}

				onstatus(null);
				handler(event.data);
				this.handlers.delete(event.data.uid);
			}
		});
	}

	bundle(components) {
		return new Promise(fulfil => {
			this.handlers.set(uid$2, fulfil);

			this.worker.postMessage({
				uid: uid$2,
				type: 'bundle',
				components
			});

			uid$2 += 1;
		});
	}

	destroy() {
		this.worker.terminate();
	}
}

/* node_modules/@sveltejs/svelte-repl/src/Repl.svelte generated by Svelte v3.24.0 */

function add_css$k() {
	var style = element("style");
	style.id = "svelte-177xqak-style";
	style.textContent = ".container.svelte-177xqak{position:relative;width:100%;height:100%}.container.svelte-177xqak section{position:relative;padding:42px 0 0 0;height:100%;box-sizing:border-box}.container.svelte-177xqak section>*:first-child{position:absolute;top:0;left:0;width:100%;height:42px;box-sizing:border-box}.container.svelte-177xqak section>*:last-child{width:100%;height:100%}";
	append(document.head, style);
}

// (234:2) <section slot=a>
function create_a_slot$1(ctx) {
	let section;
	let componentselector;
	let t;
	let moduleeditor;
	let current;

	componentselector = new ComponentSelector({
			props: { handle_select: /*handle_select*/ ctx[15] }
		});

	let moduleeditor_props = {
		errorLoc: /*sourceErrorLoc*/ ctx[16] || /*runtimeErrorLoc*/ ctx[17]
	};

	moduleeditor = new ModuleEditor({ props: moduleeditor_props });
	/*moduleeditor_binding*/ ctx[22](moduleeditor);

	return {
		c() {
			section = element("section");
			create_component(componentselector.$$.fragment);
			t = space();
			create_component(moduleeditor.$$.fragment);
			attr(section, "slot", "a");
		},
		m(target, anchor) {
			insert(target, section, anchor);
			mount_component(componentselector, section, null);
			append(section, t);
			mount_component(moduleeditor, section, null);
			current = true;
		},
		p(ctx, dirty) {
			const moduleeditor_changes = {};
			moduleeditor.$set(moduleeditor_changes);
		},
		i(local) {
			if (current) return;
			transition_in(componentselector.$$.fragment, local);
			transition_in(moduleeditor.$$.fragment, local);
			current = true;
		},
		o(local) {
			transition_out(componentselector.$$.fragment, local);
			transition_out(moduleeditor.$$.fragment, local);
			current = false;
		},
		d(detaching) {
			if (detaching) detach(section);
			destroy_component(componentselector);
			/*moduleeditor_binding*/ ctx[22](null);
			destroy_component(moduleeditor);
		}
	};
}

// (239:2) <section slot=b style='height: 100%;'>
function create_b_slot$1(ctx) {
	let section;
	let output_1;
	let current;

	output_1 = new Output({
			props: {
				svelteUrl: /*svelteUrl*/ ctx[2],
				workersUrl: /*workersUrl*/ ctx[1],
				status: /*status*/ ctx[10],
				embedded: /*embedded*/ ctx[3],
				relaxed: /*relaxed*/ ctx[5],
				injectedJS: /*injectedJS*/ ctx[8],
				injectedCSS: /*injectedCSS*/ ctx[0]
			}
		});

	return {
		c() {
			section = element("section");
			create_component(output_1.$$.fragment);
			attr(section, "slot", "b");
			set_style(section, "height", "100%");
		},
		m(target, anchor) {
			insert(target, section, anchor);
			mount_component(output_1, section, null);
			current = true;
		},
		p(ctx, dirty) {
			const output_1_changes = {};
			if (dirty[0] & /*svelteUrl*/ 4) output_1_changes.svelteUrl = /*svelteUrl*/ ctx[2];
			if (dirty[0] & /*workersUrl*/ 2) output_1_changes.workersUrl = /*workersUrl*/ ctx[1];
			if (dirty[0] & /*status*/ 1024) output_1_changes.status = /*status*/ ctx[10];
			if (dirty[0] & /*embedded*/ 8) output_1_changes.embedded = /*embedded*/ ctx[3];
			if (dirty[0] & /*relaxed*/ 32) output_1_changes.relaxed = /*relaxed*/ ctx[5];
			if (dirty[0] & /*injectedJS*/ 256) output_1_changes.injectedJS = /*injectedJS*/ ctx[8];
			if (dirty[0] & /*injectedCSS*/ 1) output_1_changes.injectedCSS = /*injectedCSS*/ ctx[0];
			output_1.$set(output_1_changes);
		},
		i(local) {
			if (current) return;
			transition_in(output_1.$$.fragment, local);
			current = true;
		},
		o(local) {
			transition_out(output_1.$$.fragment, local);
			current = false;
		},
		d(detaching) {
			if (detaching) detach(section);
			destroy_component(output_1);
		}
	};
}

// (229:1) <SplitPane   type="{orientation === 'rows' ? 'vertical' : 'horizontal'}"   pos="{fixed ? fixedPos : orientation === 'rows' ? 50 : 60}"   {fixed}  >
function create_default_slot$4(ctx) {
	let t;

	return {
		c() {
			t = space();
		},
		m(target, anchor) {
			insert(target, t, anchor);
		},
		p: noop,
		i: noop,
		o: noop,
		d(detaching) {
			if (detaching) detach(t);
		}
	};
}

function create_fragment$r(ctx) {
	let div;
	let splitpane;
	let current;

	splitpane = new SplitPane({
			props: {
				type: /*orientation*/ ctx[4] === "rows"
				? "vertical"
				: "horizontal",
				pos: /*fixed*/ ctx[6]
				? /*fixedPos*/ ctx[7]
				: /*orientation*/ ctx[4] === "rows" ? 50 : 60,
				fixed: /*fixed*/ ctx[6],
				$$slots: {
					default: [create_default_slot$4],
					b: [create_b_slot$1],
					a: [create_a_slot$1]
				},
				$$scope: { ctx }
			}
		});

	return {
		c() {
			div = element("div");
			create_component(splitpane.$$.fragment);
			attr(div, "class", "container svelte-177xqak");
			toggle_class(div, "orientation", /*orientation*/ ctx[4]);
		},
		m(target, anchor) {
			insert(target, div, anchor);
			mount_component(splitpane, div, null);
			current = true;
		},
		p(ctx, dirty) {
			const splitpane_changes = {};

			if (dirty[0] & /*orientation*/ 16) splitpane_changes.type = /*orientation*/ ctx[4] === "rows"
			? "vertical"
			: "horizontal";

			if (dirty[0] & /*fixed, fixedPos, orientation*/ 208) splitpane_changes.pos = /*fixed*/ ctx[6]
			? /*fixedPos*/ ctx[7]
			: /*orientation*/ ctx[4] === "rows" ? 50 : 60;

			if (dirty[0] & /*fixed*/ 64) splitpane_changes.fixed = /*fixed*/ ctx[6];

			if (dirty[0] & /*svelteUrl, workersUrl, status, embedded, relaxed, injectedJS, injectedCSS, input*/ 1839 | dirty[1] & /*$$scope*/ 128) {
				splitpane_changes.$$scope = { dirty, ctx };
			}

			splitpane.$set(splitpane_changes);

			if (dirty[0] & /*orientation*/ 16) {
				toggle_class(div, "orientation", /*orientation*/ ctx[4]);
			}
		},
		i(local) {
			if (current) return;
			transition_in(splitpane.$$.fragment, local);
			current = true;
		},
		o(local) {
			transition_out(splitpane.$$.fragment, local);
			current = false;
		},
		d(detaching) {
			if (detaching) detach(div);
			destroy_component(splitpane);
		}
	};
}

function get_component_name(component) {
	return `${component.name}.${component.type}`;
}

function instance$q($$self, $$props, $$invalidate) {
	let $bundle;
	let $components;
	let $selected;
	let $compile_options;
	let { workersUrl } = $$props;
	let { packagesUrl = "https://unpkg.com" } = $$props;
	let { svelteUrl = `${packagesUrl}/svelte` } = $$props;
	let { embedded = false } = $$props;
	let { orientation = "columns" } = $$props;
	let { relaxed = false } = $$props;
	let { fixed = false } = $$props;
	let { fixedPos = 50 } = $$props;
	let { injectedJS = "" } = $$props;
	let { injectedCSS = "" } = $$props;
	const historyMap = new Map();

	function toJSON() {
		return {
			imports: $bundle.imports,
			components: $components
		};
	}

	async function set(data) {
		components.set(data.components);
		selected.set(data.components[0]);
		rebundle();
		await module_editor_ready;
		await output_ready;
		$$invalidate(0, injectedCSS = data.css || "");
		await module_editor.set($selected.source, $selected.type);
		output.set($selected, $compile_options);
		historyMap.clear();
		module_editor.clearHistory();
	}

	function update(data) {
		const { name, type } = $selected || {};
		components.set(data.components);
		const matched_component = data.components.find(file => file.name === name && file.type === type);
		selected.set(matched_component || data.components[0]);
		$$invalidate(0, injectedCSS = data.css || "");

		if (matched_component) {
			module_editor.update(matched_component.source);
			output.update(matched_component, $compile_options);
		} else {
			module_editor.set(matched_component.source, matched_component.type);
			output.set(matched_component, $compile_options);
			module_editor.clearHistory();
		}
	}

	if (!workersUrl) {
		throw new Error(`You must supply workersUrl prop to <Repl>`);
	}

	const dispatch = createEventDispatcher();
	const components = writable([]);
	component_subscribe($$self, components, value => $$invalidate(29, $components = value));
	const selected = writable(null);
	component_subscribe($$self, selected, value => $$invalidate(30, $selected = value));
	const bundle = writable(null);
	component_subscribe($$self, bundle, value => $$invalidate(28, $bundle = value));

	const compile_options = writable({
		generate: "dom",
		dev: false,
		css: false,
		hydratable: false,
		customElement: false,
		immutable: false,
		legacy: false
	});

	component_subscribe($$self, compile_options, value => $$invalidate(31, $compile_options = value));
	let module_editor;
	let output;
	let current_token;

	async function rebundle() {
		const token = current_token = {};
		const result = await bundler.bundle($components);
		if (result && token === current_token) bundle.set(result);
	}

	// TODO this is a horrible kludge, written in a panic. fix it
	let fulfil_module_editor_ready;

	let module_editor_ready = new Promise(f => fulfil_module_editor_ready = f);
	let fulfil_output_ready;
	let output_ready = new Promise(f => fulfil_output_ready = f);

	setContext("REPL", {
		components,
		selected,
		bundle,
		compile_options,
		rebundle,
		navigate: item => {
			const match = (/^(.+)\.(\w+)$/).exec(item.filename);
			if (!match) return; // ???
			const [,name, type] = match;
			const component = $components.find(c => c.name === name && c.type === type);
			handle_select(component);
		}, // TODO select the line/column in question
		handle_change: event => {
			selected.update(component => {
				// TODO this is a bit hacky — we're relying on mutability
				// so that updating components works... might be better
				// if a) components had unique IDs, b) we tracked selected
				// *index* rather than component, and c) `selected` was
				// derived from `components` and `index`
				component.source = event.detail.value;

				return component;
			});

			components.update(c => c);

			// recompile selected component
			output.update($selected, $compile_options);

			rebundle();
			dispatch("change", { components: $components });
		},
		register_module_editor(editor) {
			module_editor = editor;
			fulfil_module_editor_ready();
		},
		register_output(handlers) {
			$$invalidate(24, output = handlers);
			fulfil_output_ready();
		},
		request_focus() {
			module_editor.focus();
		}
	});

	function handle_select(component) {
		historyMap.set(get_component_name($selected), module_editor.getHistory());
		selected.set(component);
		module_editor.set(component.source, component.type);

		if (historyMap.has(get_component_name($selected))) {
			module_editor.setHistory(historyMap.get(get_component_name($selected)));
		} else {
			module_editor.clearHistory();
		}

		output.set($selected, $compile_options);
	}

	let input;
	let sourceErrorLoc;
	let runtimeErrorLoc; // TODO refactor this stuff — runtimeErrorLoc is unused
	let status = null;

	const bundler = is_browser && new Bundler({
			workersUrl,
			packagesUrl,
			svelteUrl,
			onstatus: message => {
				$$invalidate(10, status = message);
			}
		});

	function moduleeditor_binding($$value) {
		binding_callbacks[$$value ? "unshift" : "push"](() => {
			input = $$value;
			$$invalidate(9, input);
		});
	}

	$$self.$set = $$props => {
		if ("workersUrl" in $$props) $$invalidate(1, workersUrl = $$props.workersUrl);
		if ("packagesUrl" in $$props) $$invalidate(18, packagesUrl = $$props.packagesUrl);
		if ("svelteUrl" in $$props) $$invalidate(2, svelteUrl = $$props.svelteUrl);
		if ("embedded" in $$props) $$invalidate(3, embedded = $$props.embedded);
		if ("orientation" in $$props) $$invalidate(4, orientation = $$props.orientation);
		if ("relaxed" in $$props) $$invalidate(5, relaxed = $$props.relaxed);
		if ("fixed" in $$props) $$invalidate(6, fixed = $$props.fixed);
		if ("fixedPos" in $$props) $$invalidate(7, fixedPos = $$props.fixedPos);
		if ("injectedJS" in $$props) $$invalidate(8, injectedJS = $$props.injectedJS);
		if ("injectedCSS" in $$props) $$invalidate(0, injectedCSS = $$props.injectedCSS);
	};

	$$self.$$.update = () => {
		if ($$self.$$.dirty[0] & /*output, $selected*/ 1090519040 | $$self.$$.dirty[1] & /*$compile_options*/ 1) {
			 if (output && $selected) {
				output.update($selected, $compile_options);
			}
		}
	};

	return [
		injectedCSS,
		workersUrl,
		svelteUrl,
		embedded,
		orientation,
		relaxed,
		fixed,
		fixedPos,
		injectedJS,
		input,
		status,
		components,
		selected,
		bundle,
		compile_options,
		handle_select,
		sourceErrorLoc,
		runtimeErrorLoc,
		packagesUrl,
		toJSON,
		set,
		update,
		moduleeditor_binding
	];
}

class Repl extends SvelteComponent {
	constructor(options) {
		super();
		if (!document.getElementById("svelte-177xqak-style")) add_css$k();

		init(
			this,
			options,
			instance$q,
			create_fragment$r,
			safe_not_equal,
			{
				workersUrl: 1,
				packagesUrl: 18,
				svelteUrl: 2,
				embedded: 3,
				orientation: 4,
				relaxed: 5,
				fixed: 6,
				fixedPos: 7,
				injectedJS: 8,
				injectedCSS: 0,
				toJSON: 19,
				set: 20,
				update: 21
			},
			[-1, -1]
		);
	}

	get toJSON() {
		return this.$$.ctx[19];
	}

	get set() {
		return this.$$.ctx[20];
	}

	get update() {
		return this.$$.ctx[21];
	}
}

/* svelte-compiler/components/Repl.svelte generated by Svelte v3.24.0 */

function add_css$l() {
	var style = element("style");
	style.id = "svelte-1vplgkg-style";
	style.textContent = "div.svelte-1vplgkg{position:absolute;top:0;left:0;width:100%;height:100%}";
	append(document.head, style);
}

function create_fragment$s(ctx) {
	let div;
	let repl_1;
	let current;
	let mounted;
	let dispose;

	let repl_1_props = {
		workersUrl: "worker",
		rollupUrl: /*rollupUrl*/ ctx[1],
		svelteUrl: /*svelteUrl*/ ctx[2]
	};

	repl_1 = new Repl({ props: repl_1_props });
	/*repl_1_binding*/ ctx[4](repl_1);

	return {
		c() {
			div = element("div");
			create_component(repl_1.$$.fragment);
			attr(div, "class", "svelte-1vplgkg");
		},
		m(target, anchor) {
			insert(target, div, anchor);
			mount_component(repl_1, div, null);
			current = true;

			if (!mounted) {
				dispose = listen(div, "keydown", keyDown);
				mounted = true;
			}
		},
		p(ctx, [dirty]) {
			const repl_1_changes = {};
			repl_1.$set(repl_1_changes);
		},
		i(local) {
			if (current) return;
			transition_in(repl_1.$$.fragment, local);
			current = true;
		},
		o(local) {
			transition_out(repl_1.$$.fragment, local);
			current = false;
		},
		d(detaching) {
			if (detaching) detach(div);
			/*repl_1_binding*/ ctx[4](null);
			destroy_component(repl_1);
			mounted = false;
			dispose();
		}
	};
}

function keyDown(event) {
	event.stopPropagation();
}

function instance$r($$self, $$props, $$invalidate) {
	let repl;
	let { components } = $$props;
	const rollupUrl = `https://unpkg.com/rollup@1/dist/rollup.browser.js`;
	const svelteUrl = `https://unpkg.com/svelte@3.24.1`;

	function repl_1_binding($$value) {
		binding_callbacks[$$value ? "unshift" : "push"](() => {
			repl = $$value;
			$$invalidate(0, repl);
		});
	}

	$$self.$set = $$props => {
		if ("components" in $$props) $$invalidate(3, components = $$props.components);
	};

	$$self.$$.update = () => {
		if ($$self.$$.dirty & /*repl, components*/ 9) {
			 repl && repl.set({ components });
		}
	};

	return [repl, rollupUrl, svelteUrl, components, repl_1_binding];
}

class Repl_1 extends SvelteComponent {
	constructor(options) {
		super();
		if (!document.getElementById("svelte-1vplgkg-style")) add_css$l();
		init(this, options, instance$r, create_fragment$s, safe_not_equal, { components: 3 });
	}
}

var app0 = "<button>Increment</button>\n";

var app1 = "<script>\n</script>\n\n<button>Increment</button>\n";

var app2 = "<script>\n  let count = 0;\n</script>\n\n<button>Increment</button>\n";

var app3 = "<script>\n  let count = 0;\n</script>\n\n{count}\n<button>Increment</button>\n";

var app4 = "<script>\n  let count = 0;\n</script>\n\n{count}\n<button on:click={() => count++}>Increment</button>\n";

var app5 = "<script>\n  let count = 0;\n</script>\n\n{count}\n<button on:click={() => count++}>Increment</button>\n\n<style>\n  button {\n    font-size: 2em;\n    background: red;\n  }\n</style>";

var app6 = "<script>\n  let count = 0;\n\n  $: double = count * 2;\n</script>\n\n{count} x 2 = {double}\n<button on:click={() => count++}>Increment</button>\n\n<style>\n  button {\n    font-size: 2em;\n    background: red;\n  }\n</style>";

var app7 = "let count = 0, double = count * 2;\n";

var app8 = "let count = 0, double = count * 2;\n\nconst text = document.createTextNode(`${count} x 2 = ${double}`);\nparent.appendChild(text);\n";

var app9 = "let count = 0, double = count * 2;\n\nconst text = document.createTextNode(`${count} x 2 = ${double}`);\nparent.appendChild(text);\n\nconst button = document.createElement('button');\nbutton.textContent = 'Increment';\nbutton.addEventListener('click', () => count++);\nparent.appendChild(button);\n";

var app10 = "let count = 0, double = count * 2;\n\nconst text = document.createTextNode(`${count} x 2 = ${double}`);\nparent.appendChild(text);\n\nconst button = document.createElement('button');\nbutton.textContent = 'Increment';\nbutton.addEventListener('click', () => {\n  count++;\n  update();\n});\nparent.appendChild(button);\n\nfunction update() {\n  double = count * 2;\n\n  text.setData(`${count} x 2 = ${double}`);\n}\n";

var app11 = "let count = 0, double = count * 2;\n\nconst text = document.createTextNode(`${count} x 2 = ${double}`);\nparent.appendChild(text);\n\nconst button = document.createElement('button');\nbutton.textContent = 'Increment';\nbutton.addEventListener('click', () => {\n  count++;\n  update();\n});\nparent.appendChild(button);\n\nfunction update() {\n  double = count * 2;\n\n  text.setData(`${count} x 2 = ${double}`);\n}\n\nconst style = document.createElement('style');\nstyle.textContent = `\n  button {\n    font-size: 2em;\n    background: red;\n  }\n`;\ndocument.head.appendChild(style);\n";

var app12 = "let count = 0, double = count * 2;\n\nconst text = document.createTextNode(`${count} x 2 = ${double}`);\nparent.appendChild(text);\n\nconst button = document.createElement('button');\nbutton.textContent = 'Increment';\nbutton.addEventListener('click', () => {\n  count++;\n  update();\n});\nbuttn.setAttribute('class', 'svelte-12345');\nparent.appendChild(button);\n\nfunction update() {\n  double = count * 2;\n\n  text.setData(`${count} x 2 = ${double}`);\n}\n\nconst style = document.createElement('style');\nstyle.textContent = `\n  button.svelte-12345 {\n    font-size: 2em;\n    background: red;\n  }\n`;\ndocument.head.appendChild(style);\n";

/* @@slides3.svelte generated by Svelte v3.24.0 */

function add_css$m() {
	var style = element("style");
	style.id = "svelte-1xa38vg-style";
	style.textContent = ".code.svelte-1xa38vg{z-index:2;position:absolute;left:70px;font-size:20px;background:white;padding:16px;border:1px solid black;box-shadow:8px 8px 10px #ddd;max-height:calc(100vh - 32px);top:16px;box-sizing:border-box;overflow-y:auto}";
	append(document.head, style);
}

// (49:0) {#if index >= components.length}
function create_if_block$e(ctx) {
	let div;
	let prism_action;
	let mounted;
	let dispose;

	return {
		c() {
			div = element("div");
			attr(div, "class", "code svelte-1xa38vg");
		},
		m(target, anchor) {
			insert(target, div, anchor);

			if (!mounted) {
				dispose = action_destroyer(prism_action = prism$1.call(null, div, {
					code: /*js*/ ctx[2][/*index*/ ctx[0] - /*components*/ ctx[1].length],
					lang: prism.languages.js
				}));

				mounted = true;
			}
		},
		p(ctx, dirty) {
			if (prism_action && is_function(prism_action.update) && dirty & /*index*/ 1) prism_action.update.call(null, {
				code: /*js*/ ctx[2][/*index*/ ctx[0] - /*components*/ ctx[1].length],
				lang: prism.languages.js
			});
		},
		d(detaching) {
			if (detaching) detach(div);
			mounted = false;
			dispose();
		}
	};
}

function create_fragment$t(ctx) {
	let repl;
	let t;
	let if_block_anchor;
	let current;

	repl = new Repl_1({
			props: {
				workersUrl: "workers",
				components: /*components*/ ctx[1][Math.min(/*index*/ ctx[0], /*components*/ ctx[1].length - 1)]
			}
		});

	let if_block = /*index*/ ctx[0] >= /*components*/ ctx[1].length && create_if_block$e(ctx);

	return {
		c() {
			create_component(repl.$$.fragment);
			t = space();
			if (if_block) if_block.c();
			if_block_anchor = empty();
		},
		m(target, anchor) {
			mount_component(repl, target, anchor);
			insert(target, t, anchor);
			if (if_block) if_block.m(target, anchor);
			insert(target, if_block_anchor, anchor);
			current = true;
		},
		p(ctx, [dirty]) {
			const repl_changes = {};
			if (dirty & /*index*/ 1) repl_changes.components = /*components*/ ctx[1][Math.min(/*index*/ ctx[0], /*components*/ ctx[1].length - 1)];
			repl.$set(repl_changes);

			if (/*index*/ ctx[0] >= /*components*/ ctx[1].length) {
				if (if_block) {
					if_block.p(ctx, dirty);
				} else {
					if_block = create_if_block$e(ctx);
					if_block.c();
					if_block.m(if_block_anchor.parentNode, if_block_anchor);
				}
			} else if (if_block) {
				if_block.d(1);
				if_block = null;
			}
		},
		i(local) {
			if (current) return;
			transition_in(repl.$$.fragment, local);
			current = true;
		},
		o(local) {
			transition_out(repl.$$.fragment, local);
			current = false;
		},
		d(detaching) {
			destroy_component(repl, detaching);
			if (detaching) detach(t);
			if (if_block) if_block.d(detaching);
			if (detaching) detach(if_block_anchor);
		}
	};
}

function instance$s($$self, $$props, $$invalidate) {
	let index = 0;

	let components = [
		[{ name: "App", type: "svelte", source: "" }],
		[
			{
				name: "App",
				type: "svelte",
				source: app0
			}
		],
		[
			{
				name: "App",
				type: "svelte",
				source: app1
			}
		],
		[
			{
				name: "App",
				type: "svelte",
				source: app2
			}
		],
		[
			{
				name: "App",
				type: "svelte",
				source: app3
			}
		],
		[
			{
				name: "App",
				type: "svelte",
				source: app4
			}
		],
		[
			{
				name: "App",
				type: "svelte",
				source: app5
			}
		],
		[
			{
				name: "App",
				type: "svelte",
				source: app6
			}
		]
	];

	let js = [app7, app8, app9, app10, app11, app12];

	function next() {
		if (index < components.length + js.length - 1) {
			$$invalidate(0, index++, index);
			return true;
		}

		return false;
	}

	return [index, components, js, next];
}

class Slides3 extends SvelteComponent {
	constructor(options) {
		super();
		if (!document.getElementById("svelte-1xa38vg-style")) add_css$m();
		init(this, options, instance$s, create_fragment$t, safe_not_equal, { next: 3 });
	}

	get next() {
		return this.$$.ctx[3];
	}
}

var app = "<script>\n  import { getRandomDogImage } from './api';\n  let ready = false;\n  $: someApi = ready && getRandomDogImage();\n</script>\n\n{#if ready}\n  {#await someApi}\n    Loading...\n  {:then list}\n    {#each list as item}\n      <img src={item} alt=\"dog ceo\"/>\n    {/each}\n  {/await}\n{:else}\n  Are you ready?\n  <button on:click={() => { ready = true; }}>\n    I'm ready\n  </button>\n{/if}\n\n<style>\n  img {\n    width: 100%;\n  }\n</style>";

/* @@slides4.svelte generated by Svelte v3.24.0 */

function add_css$n() {
	var style = element("style");
	style.id = "svelte-15y44u-style";
	style.textContent = ".code.svelte-15y44u{padding:16px;background:#f5f5f5;font-size:20px}.container.svelte-15y44u{display:grid;grid-template-columns:1fr 1fr}.rendered.svelte-15y44u{border:1px solid black;box-shadow:8px 8px 10px #ddd;margin:16px 32px;padding:16px;overflow:scroll;max-height:calc(100vh - 64px);box-sizing:border-box}.box.svelte-15y44u{border:1px solid red;position:absolute;z-index:10;width:450px;left:25px;pointer-events:none;--offset:34px;--height:24px}.box1.svelte-15y44u{top:calc(var(--offset) + var(--height) * 6);height:calc(var(--height) * 14)}.box2.svelte-15y44u{top:calc(var(--offset) + var(--height) * 7);height:calc(var(--height) * 7);left:50px;width:352px}.box3.svelte-15y44u{top:calc(var(--offset) + var(--height) * 10);height:calc(var(--height) * 3);left:72px;width:330px}img.svelte-15y44u{width:100%}";
	append(document.head, style);
}

function get_each_context$7(ctx, list, i) {
	const child_ctx = ctx.slice();
	child_ctx[7] = list[i];
	return child_ctx;
}

// (44:4) {:else}
function create_else_block$8(ctx) {
	let t0;
	let button;
	let mounted;
	let dispose;

	return {
		c() {
			t0 = text("Are you ready?\n      ");
			button = element("button");
			button.textContent = "I'm ready";
		},
		m(target, anchor) {
			insert(target, t0, anchor);
			insert(target, button, anchor);

			if (!mounted) {
				dispose = listen(button, "click", /*click_handler*/ ctx[5]);
				mounted = true;
			}
		},
		p: noop,
		d(detaching) {
			if (detaching) detach(t0);
			if (detaching) detach(button);
			mounted = false;
			dispose();
		}
	};
}

// (36:4) {#if ready}
function create_if_block$f(ctx) {
	let await_block_anchor;
	let promise;

	let info = {
		ctx,
		current: null,
		token: null,
		pending: create_pending_block,
		then: create_then_block,
		catch: create_catch_block,
		value: 6
	};

	handle_promise(promise = /*someApi*/ ctx[2], info);

	return {
		c() {
			await_block_anchor = empty();
			info.block.c();
		},
		m(target, anchor) {
			insert(target, await_block_anchor, anchor);
			info.block.m(target, info.anchor = anchor);
			info.mount = () => await_block_anchor.parentNode;
			info.anchor = await_block_anchor;
		},
		p(new_ctx, dirty) {
			ctx = new_ctx;
			info.ctx = ctx;

			if (dirty & /*someApi*/ 4 && promise !== (promise = /*someApi*/ ctx[2]) && handle_promise(promise, info)) ; else {
				const child_ctx = ctx.slice();
				child_ctx[6] = info.resolved;
				info.block.p(child_ctx, dirty);
			}
		},
		d(detaching) {
			if (detaching) detach(await_block_anchor);
			info.block.d(detaching);
			info.token = null;
			info = null;
		}
	};
}

// (1:0) <script>   import app from 'raw://./examples/sample-2/App.svelte';   import Prism from 'prismjs';   import { prism }
function create_catch_block(ctx) {
	return { c: noop, m: noop, p: noop, d: noop };
}

// (39:6) {:then list}
function create_then_block(ctx) {
	let each_1_anchor;
	let each_value = /*list*/ ctx[6];
	let each_blocks = [];

	for (let i = 0; i < each_value.length; i += 1) {
		each_blocks[i] = create_each_block$7(get_each_context$7(ctx, each_value, i));
	}

	return {
		c() {
			for (let i = 0; i < each_blocks.length; i += 1) {
				each_blocks[i].c();
			}

			each_1_anchor = empty();
		},
		m(target, anchor) {
			for (let i = 0; i < each_blocks.length; i += 1) {
				each_blocks[i].m(target, anchor);
			}

			insert(target, each_1_anchor, anchor);
		},
		p(ctx, dirty) {
			if (dirty & /*someApi*/ 4) {
				each_value = /*list*/ ctx[6];
				let i;

				for (i = 0; i < each_value.length; i += 1) {
					const child_ctx = get_each_context$7(ctx, each_value, i);

					if (each_blocks[i]) {
						each_blocks[i].p(child_ctx, dirty);
					} else {
						each_blocks[i] = create_each_block$7(child_ctx);
						each_blocks[i].c();
						each_blocks[i].m(each_1_anchor.parentNode, each_1_anchor);
					}
				}

				for (; i < each_blocks.length; i += 1) {
					each_blocks[i].d(1);
				}

				each_blocks.length = each_value.length;
			}
		},
		d(detaching) {
			destroy_each(each_blocks, detaching);
			if (detaching) detach(each_1_anchor);
		}
	};
}

// (40:8) {#each list as item}
function create_each_block$7(ctx) {
	let img;
	let img_src_value;

	return {
		c() {
			img = element("img");
			if (img.src !== (img_src_value = /*item*/ ctx[7])) attr(img, "src", img_src_value);
			attr(img, "alt", "dog ceo");
			attr(img, "class", "svelte-15y44u");
		},
		m(target, anchor) {
			insert(target, img, anchor);
		},
		p(ctx, dirty) {
			if (dirty & /*someApi*/ 4 && img.src !== (img_src_value = /*item*/ ctx[7])) {
				attr(img, "src", img_src_value);
			}
		},
		d(detaching) {
			if (detaching) detach(img);
		}
	};
}

// (37:22)          Loading...       {:then list}
function create_pending_block(ctx) {
	let t;

	return {
		c() {
			t = text("Loading...");
		},
		m(target, anchor) {
			insert(target, t, anchor);
		},
		p: noop,
		d(detaching) {
			if (detaching) detach(t);
		}
	};
}

function create_fragment$u(ctx) {
	let div2;
	let div0;
	let prism_action;
	let t0;
	let div1;
	let t1;
	let div3;
	let mounted;
	let dispose;

	function select_block_type(ctx, dirty) {
		if (/*ready*/ ctx[1]) return create_if_block$f;
		return create_else_block$8;
	}

	let current_block_type = select_block_type(ctx);
	let if_block = current_block_type(ctx);

	return {
		c() {
			div2 = element("div");
			div0 = element("div");
			t0 = space();
			div1 = element("div");
			if_block.c();
			t1 = space();
			div3 = element("div");
			attr(div0, "class", "code svelte-15y44u");
			attr(div1, "class", "rendered svelte-15y44u");
			attr(div2, "class", "container svelte-15y44u");
			attr(div3, "class", "svelte-15y44u");
			toggle_class(div3, "box", /*index*/ ctx[0] > 0);
			toggle_class(div3, "box1", /*index*/ ctx[0] === 1);
			toggle_class(div3, "box2", /*index*/ ctx[0] === 2);
			toggle_class(div3, "box3", /*index*/ ctx[0] === 3);
		},
		m(target, anchor) {
			insert(target, div2, anchor);
			append(div2, div0);
			append(div2, t0);
			append(div2, div1);
			if_block.m(div1, null);
			insert(target, t1, anchor);
			insert(target, div3, anchor);

			if (!mounted) {
				dispose = action_destroyer(prism_action = prism$1.call(null, div0, { code: app, lang: prism.languages.svelte }));
				mounted = true;
			}
		},
		p(ctx, [dirty]) {
			if (current_block_type === (current_block_type = select_block_type(ctx)) && if_block) {
				if_block.p(ctx, dirty);
			} else {
				if_block.d(1);
				if_block = current_block_type(ctx);

				if (if_block) {
					if_block.c();
					if_block.m(div1, null);
				}
			}

			if (dirty & /*index*/ 1) {
				toggle_class(div3, "box", /*index*/ ctx[0] > 0);
			}

			if (dirty & /*index*/ 1) {
				toggle_class(div3, "box1", /*index*/ ctx[0] === 1);
			}

			if (dirty & /*index*/ 1) {
				toggle_class(div3, "box2", /*index*/ ctx[0] === 2);
			}

			if (dirty & /*index*/ 1) {
				toggle_class(div3, "box3", /*index*/ ctx[0] === 3);
			}
		},
		i: noop,
		o: noop,
		d(detaching) {
			if (detaching) detach(div2);
			if_block.d();
			if (detaching) detach(t1);
			if (detaching) detach(div3);
			mounted = false;
			dispose();
		}
	};
}

async function getRandomDogImage() {
	const response = await fetch("https://dog.ceo/api/breeds/image/random/3");
	const { message } = await response.json();
	return message;
}

function instance$t($$self, $$props, $$invalidate) {
	let index = 0;

	function next() {
		if (index < 3) {
			$$invalidate(0, index++, index);
			return true;
		}

		return false;
	}

	function prev() {
		if (index > 0) {
			$$invalidate(0, index--, index);
			return true;
		}

		return false;
	}

	let ready = false;

	const click_handler = () => {
		$$invalidate(1, ready = true);
	};

	let someApi;

	$$self.$$.update = () => {
		if ($$self.$$.dirty & /*ready*/ 2) {
			 $$invalidate(2, someApi = ready && getRandomDogImage());
		}
	};

	return [index, ready, someApi, next, prev, click_handler];
}

class Slides4 extends SvelteComponent {
	constructor(options) {
		super();
		if (!document.getElementById("svelte-15y44u-style")) add_css$n();
		init(this, options, instance$t, create_fragment$u, safe_not_equal, { next: 3, prev: 4 });
	}

	get next() {
		return this.$$.ctx[3];
	}

	get prev() {
		return this.$$.ctx[4];
	}
}

var app$1 = "<script>\n  let value = '';\n  let users = [\n    'Jon',\n    'Margeret',\n  ];\n</script>\n\n<input bind:value={value} />\n\n{value}\n\n<br />\n\n{#each users as user}\n  <input bind:value={user} />\n{/each}\n\n{users}";

/* @@slides5.svelte generated by Svelte v3.24.0 */

function add_css$o() {
	var style = element("style");
	style.id = "svelte-u46rfc-style";
	style.textContent = ".code.svelte-u46rfc{padding:16px;background:#f5f5f5}.container.svelte-u46rfc{display:grid;grid-template-columns:1fr 1fr}.rendered.svelte-u46rfc{border:1px solid black;box-shadow:8px 8px 10px #ddd;margin:16px 32px;padding:16px}input.svelte-u46rfc{padding:8px;margin-right:8px}";
	append(document.head, style);
}

function get_each_context$8(ctx, list, i) {
	const child_ctx = ctx.slice();
	child_ctx[4] = list[i];
	child_ctx[5] = list;
	child_ctx[6] = i;
	return child_ctx;
}

// (18:4) {#each users as user}
function create_each_block$8(ctx) {
	let input;
	let mounted;
	let dispose;

	function input_input_handler_1() {
		/*input_input_handler_1*/ ctx[3].call(input, /*each_value*/ ctx[5], /*user_index*/ ctx[6]);
	}

	return {
		c() {
			input = element("input");
			attr(input, "class", "svelte-u46rfc");
		},
		m(target, anchor) {
			insert(target, input, anchor);
			set_input_value(input, /*user*/ ctx[4]);

			if (!mounted) {
				dispose = listen(input, "input", input_input_handler_1);
				mounted = true;
			}
		},
		p(new_ctx, dirty) {
			ctx = new_ctx;

			if (dirty & /*users*/ 2 && input.value !== /*user*/ ctx[4]) {
				set_input_value(input, /*user*/ ctx[4]);
			}
		},
		d(detaching) {
			if (detaching) detach(input);
			mounted = false;
			dispose();
		}
	};
}

function create_fragment$v(ctx) {
	let div2;
	let div0;
	let prism_action;
	let t0;
	let div1;
	let input;
	let t1;
	let p0;
	let t2;
	let t3;
	let br;
	let t4;
	let t5;
	let p1;
	let t6;
	let mounted;
	let dispose;
	let each_value = /*users*/ ctx[1];
	let each_blocks = [];

	for (let i = 0; i < each_value.length; i += 1) {
		each_blocks[i] = create_each_block$8(get_each_context$8(ctx, each_value, i));
	}

	return {
		c() {
			div2 = element("div");
			div0 = element("div");
			t0 = space();
			div1 = element("div");
			input = element("input");
			t1 = space();
			p0 = element("p");
			t2 = text(/*value*/ ctx[0]);
			t3 = space();
			br = element("br");
			t4 = space();

			for (let i = 0; i < each_blocks.length; i += 1) {
				each_blocks[i].c();
			}

			t5 = space();
			p1 = element("p");
			t6 = text(/*users*/ ctx[1]);
			attr(div0, "class", "code svelte-u46rfc");
			attr(input, "class", "svelte-u46rfc");
			attr(div1, "class", "rendered svelte-u46rfc");
			attr(div2, "class", "container svelte-u46rfc");
		},
		m(target, anchor) {
			insert(target, div2, anchor);
			append(div2, div0);
			append(div2, t0);
			append(div2, div1);
			append(div1, input);
			set_input_value(input, /*value*/ ctx[0]);
			append(div1, t1);
			append(div1, p0);
			append(p0, t2);
			append(div1, t3);
			append(div1, br);
			append(div1, t4);

			for (let i = 0; i < each_blocks.length; i += 1) {
				each_blocks[i].m(div1, null);
			}

			append(div1, t5);
			append(div1, p1);
			append(p1, t6);

			if (!mounted) {
				dispose = [
					action_destroyer(prism_action = prism$1.call(null, div0, { code: app$1, lang: prism.languages.svelte })),
					listen(input, "input", /*input_input_handler*/ ctx[2])
				];

				mounted = true;
			}
		},
		p(ctx, [dirty]) {
			if (dirty & /*value*/ 1 && input.value !== /*value*/ ctx[0]) {
				set_input_value(input, /*value*/ ctx[0]);
			}

			if (dirty & /*value*/ 1) set_data(t2, /*value*/ ctx[0]);

			if (dirty & /*users*/ 2) {
				each_value = /*users*/ ctx[1];
				let i;

				for (i = 0; i < each_value.length; i += 1) {
					const child_ctx = get_each_context$8(ctx, each_value, i);

					if (each_blocks[i]) {
						each_blocks[i].p(child_ctx, dirty);
					} else {
						each_blocks[i] = create_each_block$8(child_ctx);
						each_blocks[i].c();
						each_blocks[i].m(div1, t5);
					}
				}

				for (; i < each_blocks.length; i += 1) {
					each_blocks[i].d(1);
				}

				each_blocks.length = each_value.length;
			}

			if (dirty & /*users*/ 2) set_data(t6, /*users*/ ctx[1]);
		},
		i: noop,
		o: noop,
		d(detaching) {
			if (detaching) detach(div2);
			destroy_each(each_blocks, detaching);
			mounted = false;
			run_all(dispose);
		}
	};
}

function instance$u($$self, $$props, $$invalidate) {
	let value = "";
	let users = ["Jon", "Margeret"];

	function input_input_handler() {
		value = this.value;
		$$invalidate(0, value);
	}

	function input_input_handler_1(each_value, user_index) {
		each_value[user_index] = this.value;
		$$invalidate(1, users);
	}

	return [value, users, input_input_handler, input_input_handler_1];
}

class Slides5 extends SvelteComponent {
	constructor(options) {
		super();
		if (!document.getElementById("svelte-u46rfc-style")) add_css$o();
		init(this, options, instance$u, create_fragment$v, safe_not_equal, {});
	}
}

var app$2 = "<script>\n  import { fade, fly, blur } from 'svelte/transition';\n\n  let array = [];\n  \n  function add() {\n    array.push(Math.round(Math.random() * 100));\n    array = array;\n  }\n  function remove() {\n    array = array.slice(0, -1);\n  }\n</script>\n\n<button on:click={add}>Add</button>\n<button on:click={remove}>Remove</button>\n\n<ul>\n  {#each array as item}\n    <li transition:blur>{item}</li>\n    <li in:fade out:fly={{y:30}}>{item}</li>\n  {/each}\n</ul>\n";

/* @@slides6.svelte generated by Svelte v3.24.0 */

function add_css$p() {
	var style = element("style");
	style.id = "svelte-12pcbrq-style";
	style.textContent = ".code.svelte-12pcbrq{padding:16px;background:#f5f5f5;font-size:20px}.container.svelte-12pcbrq{display:grid;grid-template-columns:1fr 1fr}.rendered.svelte-12pcbrq{border:1px solid black;box-shadow:8px 8px 10px #ddd;margin:16px 32px;padding:16px}";
	append(document.head, style);
}

function get_each_context$9(ctx, list, i) {
	const child_ctx = ctx.slice();
	child_ctx[3] = list[i];
	return child_ctx;
}

// (24:6) {#each array as item}
function create_each_block$9(ctx) {
	let li0;
	let t0_value = /*item*/ ctx[3] + "";
	let t0;
	let li0_transition;
	let t1;
	let li1;
	let t2_value = /*item*/ ctx[3] + "";
	let t2;
	let li1_intro;
	let li1_outro;
	let current;

	return {
		c() {
			li0 = element("li");
			t0 = text(t0_value);
			t1 = space();
			li1 = element("li");
			t2 = text(t2_value);
		},
		m(target, anchor) {
			insert(target, li0, anchor);
			append(li0, t0);
			insert(target, t1, anchor);
			insert(target, li1, anchor);
			append(li1, t2);
			current = true;
		},
		p(ctx, dirty) {
			if ((!current || dirty & /*array*/ 1) && t0_value !== (t0_value = /*item*/ ctx[3] + "")) set_data(t0, t0_value);
			if ((!current || dirty & /*array*/ 1) && t2_value !== (t2_value = /*item*/ ctx[3] + "")) set_data(t2, t2_value);
		},
		i(local) {
			if (current) return;

			add_render_callback(() => {
				if (!li0_transition) li0_transition = create_bidirectional_transition(li0, blur, {}, true);
				li0_transition.run(1);
			});

			add_render_callback(() => {
				if (li1_outro) li1_outro.end(1);
				if (!li1_intro) li1_intro = create_in_transition(li1, fade, {});
				li1_intro.start();
			});

			current = true;
		},
		o(local) {
			if (!li0_transition) li0_transition = create_bidirectional_transition(li0, blur, {}, false);
			li0_transition.run(0);
			if (li1_intro) li1_intro.invalidate();
			li1_outro = create_out_transition(li1, fly, { y: 30 });
			current = false;
		},
		d(detaching) {
			if (detaching) detach(li0);
			if (detaching && li0_transition) li0_transition.end();
			if (detaching) detach(t1);
			if (detaching) detach(li1);
			if (detaching && li1_outro) li1_outro.end();
		}
	};
}

function create_fragment$w(ctx) {
	let div2;
	let div0;
	let prism_action;
	let t0;
	let div1;
	let button0;
	let t2;
	let button1;
	let t4;
	let ul;
	let current;
	let mounted;
	let dispose;
	let each_value = /*array*/ ctx[0];
	let each_blocks = [];

	for (let i = 0; i < each_value.length; i += 1) {
		each_blocks[i] = create_each_block$9(get_each_context$9(ctx, each_value, i));
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
			ul = element("ul");

			for (let i = 0; i < each_blocks.length; i += 1) {
				each_blocks[i].c();
			}

			attr(div0, "class", "code svelte-12pcbrq");
			attr(div1, "class", "rendered svelte-12pcbrq");
			attr(div2, "class", "container svelte-12pcbrq");
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
			append(div1, ul);

			for (let i = 0; i < each_blocks.length; i += 1) {
				each_blocks[i].m(ul, null);
			}

			current = true;

			if (!mounted) {
				dispose = [
					action_destroyer(prism_action = prism$1.call(null, div0, { code: app$2, lang: prism.languages.svelte })),
					listen(button0, "click", /*add*/ ctx[1]),
					listen(button1, "click", /*remove*/ ctx[2])
				];

				mounted = true;
			}
		},
		p(ctx, [dirty]) {
			if (dirty & /*array*/ 1) {
				each_value = /*array*/ ctx[0];
				let i;

				for (i = 0; i < each_value.length; i += 1) {
					const child_ctx = get_each_context$9(ctx, each_value, i);

					if (each_blocks[i]) {
						each_blocks[i].p(child_ctx, dirty);
						transition_in(each_blocks[i], 1);
					} else {
						each_blocks[i] = create_each_block$9(child_ctx);
						each_blocks[i].c();
						transition_in(each_blocks[i], 1);
						each_blocks[i].m(ul, null);
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

function instance$v($$self, $$props, $$invalidate) {
	let array = [];

	function add() {
		array.push(Math.round(Math.random() * 100));
		$$invalidate(0, array);
	}

	function remove() {
		$$invalidate(0, array = array.slice(0, -1));
	}

	return [array, add, remove];
}

class Slides6 extends SvelteComponent {
	constructor(options) {
		super();
		if (!document.getElementById("svelte-12pcbrq-style")) add_css$p();
		init(this, options, instance$v, create_fragment$w, safe_not_equal, {});
	}
}

var app$3 = "<script>\n  import Component from './Component.svelte';\n</script>\n\n<Component>\n  <span slot=\"name\">World</span>\n</Component>\n";

var component = "Hello <slot name=\"name\" />";

/* @@slides7.svelte generated by Svelte v3.24.0 */

function add_css$q() {
	var style = element("style");
	style.id = "svelte-1ereplm-style";
	style.textContent = ".code.svelte-1ereplm{padding:16px;background:#f5f5f5;font-size:20px}.code1.svelte-1ereplm{grid-column:1 / 2}.code2.svelte-1ereplm{grid-column:1 / 2}.code1.svelte-1ereplm,.code2.svelte-1ereplm{display:grid;grid-template-rows:auto 1fr}.container.svelte-1ereplm{display:grid;grid-template-columns:1fr 1fr;grid-template-rows:1fr 1fr;grid-gap:8px;height:100%}.rendered.svelte-1ereplm{border:1px solid black;box-shadow:8px 8px 10px #ddd;margin:16px 32px;padding:16px;grid-row:1 / 3;grid-column:2 / 3}";
	append(document.head, style);
}

function create_fragment$x(ctx) {
	let div5;
	let div1;
	let p0;
	let t1;
	let div0;
	let prism_action;
	let t2;
	let div3;
	let p1;
	let t4;
	let div2;
	let prism_action_1;
	let t5;
	let div4;
	let mounted;
	let dispose;

	return {
		c() {
			div5 = element("div");
			div1 = element("div");
			p0 = element("p");
			p0.textContent = "App.svelte";
			t1 = space();
			div0 = element("div");
			t2 = space();
			div3 = element("div");
			p1 = element("p");
			p1.textContent = "Component.svelte";
			t4 = space();
			div2 = element("div");
			t5 = space();
			div4 = element("div");
			div4.textContent = "Hello World";
			attr(div0, "class", "code svelte-1ereplm");
			attr(div1, "class", "code1 svelte-1ereplm");
			attr(div2, "class", "code svelte-1ereplm");
			attr(div3, "class", "code2 svelte-1ereplm");
			attr(div4, "class", "rendered svelte-1ereplm");
			attr(div5, "class", "container svelte-1ereplm");
		},
		m(target, anchor) {
			insert(target, div5, anchor);
			append(div5, div1);
			append(div1, p0);
			append(div1, t1);
			append(div1, div0);
			append(div5, t2);
			append(div5, div3);
			append(div3, p1);
			append(div3, t4);
			append(div3, div2);
			append(div5, t5);
			append(div5, div4);

			if (!mounted) {
				dispose = [
					action_destroyer(prism_action = prism$1.call(null, div0, { code: app$3, lang: prism.languages.svelte })),
					action_destroyer(prism_action_1 = prism$1.call(null, div2, {
						code: component,
						lang: prism.languages.svelte
					}))
				];

				mounted = true;
			}
		},
		p: noop,
		i: noop,
		o: noop,
		d(detaching) {
			if (detaching) detach(div5);
			mounted = false;
			run_all(dispose);
		}
	};
}

class Slides7 extends SvelteComponent {
	constructor(options) {
		super();
		if (!document.getElementById("svelte-1ereplm-style")) add_css$q();
		init(this, options, null, create_fragment$x, safe_not_equal, {});
	}
}

/* @@slides8.svelte generated by Svelte v3.24.0 */

function add_css$r() {
	var style = element("style");
	style.id = "svelte-1yxlmwg-style";
	style.textContent = "h1.svelte-1yxlmwg{display:grid;height:100%;margin:0;place-items:center}";
	append(document.head, style);
}

function create_fragment$y(ctx) {
	let h1;

	return {
		c() {
			h1 = element("h1");
			h1.textContent = "The Svelte Compiler";
			attr(h1, "class", "svelte-1yxlmwg");
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

class Slides8 extends SvelteComponent {
	constructor(options) {
		super();
		if (!document.getElementById("svelte-1yxlmwg-style")) add_css$r();
		init(this, options, null, create_fragment$y, safe_not_equal, {});
	}
}

var ast = "./assets/ast-2e3b16e8.png";

var ast2 = "./assets/ast-2-171feb30.png";

/* @@slides9.svelte generated by Svelte v3.24.0 */

function add_css$s() {
	var style = element("style");
	style.id = "svelte-qfqgcm-style";
	style.textContent = "h2.svelte-qfqgcm{position:absolute;margin:0;top:50%;left:50%;transform:translate(-50%, -50%);transition:200ms ease-in}h2.top.svelte-qfqgcm{top:30px;left:30px;transform:none}.row.svelte-qfqgcm{grid-template-columns:1fr 1fr}.container.svelte-qfqgcm{height:100%}.tokens.svelte-qfqgcm{position:absolute;top:50%;left:50%;transform:translate(-50%, -50%);transition:200ms ease-in;white-space:nowrap}.tokens.right.svelte-qfqgcm{left:75%}.tokens.left.svelte-qfqgcm{left:25%}.tokens.out.svelte-qfqgcm{left:-25%}img.svelte-qfqgcm{position:absolute;max-width:50%;top:50%;transform:translate(-50%, -50%);transition:200ms ease-in}img.right.svelte-qfqgcm{left:75%}img.left.svelte-qfqgcm{left:25%}img.out.svelte-qfqgcm{left:-25%}span.svelte-qfqgcm{display:inline-block;transition:200ms ease-in}span.tokenized.svelte-qfqgcm{margin:5px;padding:5px;border:1px solid black}.overview1.svelte-qfqgcm{transform:translate(-50%, -50%) scale(0.6);left:12.5%}.overview2.svelte-qfqgcm{transform:translate(-50%, -50%) scale(0.65);left:40.5%}.overview3.svelte-qfqgcm{transform:translate(-50%, -50%) scale(0.65);left:66.5%}.overview4.svelte-qfqgcm{transform:translate(-50%, -50%) scale(0.65);left:87.5%}.title1.svelte-qfqgcm{position:absolute;top:80%;left:25%;transform:translate(-50%, 0)}.title2.svelte-qfqgcm{position:absolute;top:80%;left:55%;transform:translate(-50%, 0)}.title3.svelte-qfqgcm{position:absolute;top:80%;left:75%;transform:translate(-50%, 0)}";
	append(document.head, style);
}

// (26:2) {#if i >= 0}
function create_if_block_6$2(ctx) {
	let div2;
	let div0;
	let span0;
	let t1;
	let span1;
	let t3;
	let span2;
	let t5;
	let span3;
	let t7;
	let div1;
	let span4;
	let span5;
	let span6;
	let span7;
	let t12;
	let span8;
	let t14;
	let span9;
	let t16;
	let span10;
	let t18;
	let span11;
	let div2_intro;

	return {
		c() {
			div2 = element("div");
			div0 = element("div");
			span0 = element("span");
			span0.textContent = "const";
			t1 = space();
			span1 = element("span");
			span1.textContent = "name";
			t3 = space();
			span2 = element("span");
			span2.textContent = "=";
			t5 = space();
			span3 = element("span");
			span3.textContent = "'World'";
			t7 = space();
			div1 = element("div");
			span4 = element("span");
			span4.textContent = "console";
			span5 = element("span");
			span5.textContent = ".";
			span6 = element("span");
			span6.textContent = "log";
			span7 = element("span");
			span7.textContent = "(";
			t12 = space();
			span8 = element("span");
			span8.textContent = "'Hello '";
			t14 = space();
			span9 = element("span");
			span9.textContent = "+";
			t16 = space();
			span10 = element("span");
			span10.textContent = "name";
			t18 = space();
			span11 = element("span");
			span11.textContent = ")";
			attr(span0, "class", "token keyword svelte-qfqgcm");
			toggle_class(span0, "tokenized", /*i*/ ctx[0] >= 1);
			attr(span1, "class", "svelte-qfqgcm");
			toggle_class(span1, "tokenized", /*i*/ ctx[0] >= 2);
			attr(span2, "class", "token operator svelte-qfqgcm");
			toggle_class(span2, "tokenized", /*i*/ ctx[0] >= 3);
			attr(span3, "class", "token string svelte-qfqgcm");
			toggle_class(span3, "tokenized", /*i*/ ctx[0] >= 4);
			attr(span4, "class", "svelte-qfqgcm");
			toggle_class(span4, "tokenized", /*i*/ ctx[0] >= 5);
			attr(span5, "class", "token punctuation svelte-qfqgcm");
			toggle_class(span5, "tokenized", /*i*/ ctx[0] >= 6);
			attr(span6, "class", "token function svelte-qfqgcm");
			toggle_class(span6, "tokenized", /*i*/ ctx[0] >= 7);
			attr(span7, "class", "token punctuation svelte-qfqgcm");
			toggle_class(span7, "tokenized", /*i*/ ctx[0] >= 8);
			attr(span8, "class", "token string svelte-qfqgcm");
			toggle_class(span8, "tokenized", /*i*/ ctx[0] >= 9);
			attr(span9, "class", "token operator svelte-qfqgcm");
			toggle_class(span9, "tokenized", /*i*/ ctx[0] >= 10);
			attr(span10, "class", "svelte-qfqgcm");
			toggle_class(span10, "tokenized", /*i*/ ctx[0] >= 11);
			attr(span11, "class", "token punctuation svelte-qfqgcm");
			toggle_class(span11, "tokenized", /*i*/ ctx[0] >= 12);
			attr(div2, "class", "tokens svelte-qfqgcm");
			toggle_class(div2, "left", /*i*/ ctx[0] === 13);
			toggle_class(div2, "out", /*i*/ ctx[0] > 13 && /*i*/ ctx[0] < 16);
			toggle_class(div2, "overview1", /*i*/ ctx[0] >= 16);
		},
		m(target, anchor) {
			insert(target, div2, anchor);
			append(div2, div0);
			append(div0, span0);
			append(div0, t1);
			append(div0, span1);
			append(div0, t3);
			append(div0, span2);
			append(div0, t5);
			append(div0, span3);
			append(div2, t7);
			append(div2, div1);
			append(div1, span4);
			append(div1, span5);
			append(div1, span6);
			append(div1, span7);
			append(div1, t12);
			append(div1, span8);
			append(div1, t14);
			append(div1, span9);
			append(div1, t16);
			append(div1, span10);
			append(div1, t18);
			append(div1, span11);
		},
		p(ctx, dirty) {
			if (dirty & /*i*/ 1) {
				toggle_class(span0, "tokenized", /*i*/ ctx[0] >= 1);
			}

			if (dirty & /*i*/ 1) {
				toggle_class(span1, "tokenized", /*i*/ ctx[0] >= 2);
			}

			if (dirty & /*i*/ 1) {
				toggle_class(span2, "tokenized", /*i*/ ctx[0] >= 3);
			}

			if (dirty & /*i*/ 1) {
				toggle_class(span3, "tokenized", /*i*/ ctx[0] >= 4);
			}

			if (dirty & /*i*/ 1) {
				toggle_class(span4, "tokenized", /*i*/ ctx[0] >= 5);
			}

			if (dirty & /*i*/ 1) {
				toggle_class(span5, "tokenized", /*i*/ ctx[0] >= 6);
			}

			if (dirty & /*i*/ 1) {
				toggle_class(span6, "tokenized", /*i*/ ctx[0] >= 7);
			}

			if (dirty & /*i*/ 1) {
				toggle_class(span7, "tokenized", /*i*/ ctx[0] >= 8);
			}

			if (dirty & /*i*/ 1) {
				toggle_class(span8, "tokenized", /*i*/ ctx[0] >= 9);
			}

			if (dirty & /*i*/ 1) {
				toggle_class(span9, "tokenized", /*i*/ ctx[0] >= 10);
			}

			if (dirty & /*i*/ 1) {
				toggle_class(span10, "tokenized", /*i*/ ctx[0] >= 11);
			}

			if (dirty & /*i*/ 1) {
				toggle_class(span11, "tokenized", /*i*/ ctx[0] >= 12);
			}

			if (dirty & /*i*/ 1) {
				toggle_class(div2, "left", /*i*/ ctx[0] === 13);
			}

			if (dirty & /*i*/ 1) {
				toggle_class(div2, "out", /*i*/ ctx[0] > 13 && /*i*/ ctx[0] < 16);
			}

			if (dirty & /*i*/ 1) {
				toggle_class(div2, "overview1", /*i*/ ctx[0] >= 16);
			}
		},
		i(local) {
			if (!div2_intro) {
				add_render_callback(() => {
					div2_intro = create_in_transition(div2, fade, /*ease*/ ctx[1]);
					div2_intro.start();
				});
			}
		},
		o: noop,
		d(detaching) {
			if (detaching) detach(div2);
		}
	};
}

// (46:2) {#if i >= 13}
function create_if_block_5$2(ctx) {
	let img;
	let img_src_value;
	let img_transition;
	let current;

	return {
		c() {
			img = element("img");
			if (img.src !== (img_src_value = ast)) attr(img, "src", img_src_value);
			attr(img, "alt", ".");
			attr(img, "class", "svelte-qfqgcm");
			toggle_class(img, "right", /*i*/ ctx[0] === 13);
			toggle_class(img, "left", /*i*/ ctx[0] === 14);
			toggle_class(img, "out", /*i*/ ctx[0] > 14 && /*i*/ ctx[0] < 16);
			toggle_class(img, "overview2", /*i*/ ctx[0] >= 16);
		},
		m(target, anchor) {
			insert(target, img, anchor);
			current = true;
		},
		p(ctx, dirty) {
			if (dirty & /*i*/ 1) {
				toggle_class(img, "right", /*i*/ ctx[0] === 13);
			}

			if (dirty & /*i*/ 1) {
				toggle_class(img, "left", /*i*/ ctx[0] === 14);
			}

			if (dirty & /*i*/ 1) {
				toggle_class(img, "out", /*i*/ ctx[0] > 14 && /*i*/ ctx[0] < 16);
			}

			if (dirty & /*i*/ 1) {
				toggle_class(img, "overview2", /*i*/ ctx[0] >= 16);
			}
		},
		i(local) {
			if (current) return;

			add_render_callback(() => {
				if (!img_transition) img_transition = create_bidirectional_transition(img, fade, /*ease*/ ctx[1], true);
				img_transition.run(1);
			});

			current = true;
		},
		o(local) {
			if (!img_transition) img_transition = create_bidirectional_transition(img, fade, /*ease*/ ctx[1], false);
			img_transition.run(0);
			current = false;
		},
		d(detaching) {
			if (detaching) detach(img);
			if (detaching && img_transition) img_transition.end();
		}
	};
}

// (49:2) {#if i >= 14}
function create_if_block_4$2(ctx) {
	let img;
	let img_src_value;
	let img_transition;
	let current;

	return {
		c() {
			img = element("img");
			if (img.src !== (img_src_value = ast2)) attr(img, "src", img_src_value);
			attr(img, "alt", ".");
			attr(img, "class", "svelte-qfqgcm");
			toggle_class(img, "right", /*i*/ ctx[0] === 14);
			toggle_class(img, "left", /*i*/ ctx[0] === 15);
			toggle_class(img, "overview3", /*i*/ ctx[0] >= 16);
		},
		m(target, anchor) {
			insert(target, img, anchor);
			current = true;
		},
		p(ctx, dirty) {
			if (dirty & /*i*/ 1) {
				toggle_class(img, "right", /*i*/ ctx[0] === 14);
			}

			if (dirty & /*i*/ 1) {
				toggle_class(img, "left", /*i*/ ctx[0] === 15);
			}

			if (dirty & /*i*/ 1) {
				toggle_class(img, "overview3", /*i*/ ctx[0] >= 16);
			}
		},
		i(local) {
			if (current) return;

			add_render_callback(() => {
				if (!img_transition) img_transition = create_bidirectional_transition(img, fade, /*ease*/ ctx[1], true);
				img_transition.run(1);
			});

			current = true;
		},
		o(local) {
			if (!img_transition) img_transition = create_bidirectional_transition(img, fade, /*ease*/ ctx[1], false);
			img_transition.run(0);
			current = false;
		},
		d(detaching) {
			if (detaching) detach(img);
			if (detaching && img_transition) img_transition.end();
		}
	};
}

// (52:2) {#if i >= 15}
function create_if_block_3$3(ctx) {
	let div1;
	let div1_transition;
	let current;

	return {
		c() {
			div1 = element("div");

			div1.innerHTML = `<div><span class="svelte-qfqgcm">console</span><span class="token punctuation svelte-qfqgcm">.</span><span class="token function svelte-qfqgcm">log</span><span class="token punctuation svelte-qfqgcm">(</span>  
        <span class="token string svelte-qfqgcm">&#39;Hello World&#39;</span>  
        <span class="token punctuation svelte-qfqgcm">)</span></div>`;

			attr(div1, "class", "tokens svelte-qfqgcm");
			toggle_class(div1, "right", /*i*/ ctx[0] === 15);
			toggle_class(div1, "overview4", /*i*/ ctx[0] >= 16);
		},
		m(target, anchor) {
			insert(target, div1, anchor);
			current = true;
		},
		p(ctx, dirty) {
			if (dirty & /*i*/ 1) {
				toggle_class(div1, "right", /*i*/ ctx[0] === 15);
			}

			if (dirty & /*i*/ 1) {
				toggle_class(div1, "overview4", /*i*/ ctx[0] >= 16);
			}
		},
		i(local) {
			if (current) return;

			add_render_callback(() => {
				if (!div1_transition) div1_transition = create_bidirectional_transition(div1, fade, /*ease*/ ctx[1], true);
				div1_transition.run(1);
			});

			current = true;
		},
		o(local) {
			if (!div1_transition) div1_transition = create_bidirectional_transition(div1, fade, /*ease*/ ctx[1], false);
			div1_transition.run(0);
			current = false;
		},
		d(detaching) {
			if (detaching) detach(div1);
			if (detaching && div1_transition) div1_transition.end();
		}
	};
}

// (64:2) {#if i >= 17}
function create_if_block_2$9(ctx) {
	let div;
	let div_transition;
	let current;

	return {
		c() {
			div = element("div");
			div.textContent = "Parsing";
			attr(div, "class", "title1 svelte-qfqgcm");
		},
		m(target, anchor) {
			insert(target, div, anchor);
			current = true;
		},
		i(local) {
			if (current) return;

			add_render_callback(() => {
				if (!div_transition) div_transition = create_bidirectional_transition(div, fade, /*ease*/ ctx[1], true);
				div_transition.run(1);
			});

			current = true;
		},
		o(local) {
			if (!div_transition) div_transition = create_bidirectional_transition(div, fade, /*ease*/ ctx[1], false);
			div_transition.run(0);
			current = false;
		},
		d(detaching) {
			if (detaching) detach(div);
			if (detaching && div_transition) div_transition.end();
		}
	};
}

// (67:2) {#if i >= 18}
function create_if_block_1$b(ctx) {
	let div3;
	let div3_transition;
	let current;

	return {
		c() {
			div3 = element("div");

			div3.innerHTML = `<div>Static Analysis</div> 
      <div>Optimisation</div> 
      <div>Transformation</div>`;

			attr(div3, "class", "title2 svelte-qfqgcm");
		},
		m(target, anchor) {
			insert(target, div3, anchor);
			current = true;
		},
		i(local) {
			if (current) return;

			add_render_callback(() => {
				if (!div3_transition) div3_transition = create_bidirectional_transition(div3, fade, /*ease*/ ctx[1], true);
				div3_transition.run(1);
			});

			current = true;
		},
		o(local) {
			if (!div3_transition) div3_transition = create_bidirectional_transition(div3, fade, /*ease*/ ctx[1], false);
			div3_transition.run(0);
			current = false;
		},
		d(detaching) {
			if (detaching) detach(div3);
			if (detaching && div3_transition) div3_transition.end();
		}
	};
}

// (74:2) {#if i >= 19}
function create_if_block$g(ctx) {
	let div;
	let div_transition;
	let current;

	return {
		c() {
			div = element("div");
			div.textContent = "Code Generation";
			attr(div, "class", "title3 svelte-qfqgcm");
		},
		m(target, anchor) {
			insert(target, div, anchor);
			current = true;
		},
		i(local) {
			if (current) return;

			add_render_callback(() => {
				if (!div_transition) div_transition = create_bidirectional_transition(div, fade, /*ease*/ ctx[1], true);
				div_transition.run(1);
			});

			current = true;
		},
		o(local) {
			if (!div_transition) div_transition = create_bidirectional_transition(div, fade, /*ease*/ ctx[1], false);
			div_transition.run(0);
			current = false;
		},
		d(detaching) {
			if (detaching) detach(div);
			if (detaching && div_transition) div_transition.end();
		}
	};
}

function create_fragment$z(ctx) {
	let h2;
	let t1;
	let div;
	let t2;
	let t3;
	let t4;
	let t5;
	let t6;
	let t7;
	let current;
	let if_block0 = /*i*/ ctx[0] >= 0 && create_if_block_6$2(ctx);
	let if_block1 = /*i*/ ctx[0] >= 13 && create_if_block_5$2(ctx);
	let if_block2 = /*i*/ ctx[0] >= 14 && create_if_block_4$2(ctx);
	let if_block3 = /*i*/ ctx[0] >= 15 && create_if_block_3$3(ctx);
	let if_block4 = /*i*/ ctx[0] >= 17 && create_if_block_2$9(ctx);
	let if_block5 = /*i*/ ctx[0] >= 18 && create_if_block_1$b(ctx);
	let if_block6 = /*i*/ ctx[0] >= 19 && create_if_block$g(ctx);

	return {
		c() {
			h2 = element("h2");
			h2.textContent = "How does compiler work?";
			t1 = space();
			div = element("div");
			if (if_block0) if_block0.c();
			t2 = space();
			if (if_block1) if_block1.c();
			t3 = space();
			if (if_block2) if_block2.c();
			t4 = space();
			if (if_block3) if_block3.c();
			t5 = space();
			if (if_block4) if_block4.c();
			t6 = space();
			if (if_block5) if_block5.c();
			t7 = space();
			if (if_block6) if_block6.c();
			attr(h2, "class", "svelte-qfqgcm");
			toggle_class(h2, "top", /*i*/ ctx[0] >= 0);
			attr(div, "class", "container svelte-qfqgcm");
			toggle_class(div, "row", /*i*/ ctx[0] >= 13);
		},
		m(target, anchor) {
			insert(target, h2, anchor);
			insert(target, t1, anchor);
			insert(target, div, anchor);
			if (if_block0) if_block0.m(div, null);
			append(div, t2);
			if (if_block1) if_block1.m(div, null);
			append(div, t3);
			if (if_block2) if_block2.m(div, null);
			append(div, t4);
			if (if_block3) if_block3.m(div, null);
			append(div, t5);
			if (if_block4) if_block4.m(div, null);
			append(div, t6);
			if (if_block5) if_block5.m(div, null);
			append(div, t7);
			if (if_block6) if_block6.m(div, null);
			current = true;
		},
		p(ctx, [dirty]) {
			if (dirty & /*i*/ 1) {
				toggle_class(h2, "top", /*i*/ ctx[0] >= 0);
			}

			if (/*i*/ ctx[0] >= 0) {
				if (if_block0) {
					if_block0.p(ctx, dirty);

					if (dirty & /*i*/ 1) {
						transition_in(if_block0, 1);
					}
				} else {
					if_block0 = create_if_block_6$2(ctx);
					if_block0.c();
					transition_in(if_block0, 1);
					if_block0.m(div, t2);
				}
			} else if (if_block0) {
				if_block0.d(1);
				if_block0 = null;
			}

			if (/*i*/ ctx[0] >= 13) {
				if (if_block1) {
					if_block1.p(ctx, dirty);

					if (dirty & /*i*/ 1) {
						transition_in(if_block1, 1);
					}
				} else {
					if_block1 = create_if_block_5$2(ctx);
					if_block1.c();
					transition_in(if_block1, 1);
					if_block1.m(div, t3);
				}
			} else if (if_block1) {
				group_outros();

				transition_out(if_block1, 1, 1, () => {
					if_block1 = null;
				});

				check_outros();
			}

			if (/*i*/ ctx[0] >= 14) {
				if (if_block2) {
					if_block2.p(ctx, dirty);

					if (dirty & /*i*/ 1) {
						transition_in(if_block2, 1);
					}
				} else {
					if_block2 = create_if_block_4$2(ctx);
					if_block2.c();
					transition_in(if_block2, 1);
					if_block2.m(div, t4);
				}
			} else if (if_block2) {
				group_outros();

				transition_out(if_block2, 1, 1, () => {
					if_block2 = null;
				});

				check_outros();
			}

			if (/*i*/ ctx[0] >= 15) {
				if (if_block3) {
					if_block3.p(ctx, dirty);

					if (dirty & /*i*/ 1) {
						transition_in(if_block3, 1);
					}
				} else {
					if_block3 = create_if_block_3$3(ctx);
					if_block3.c();
					transition_in(if_block3, 1);
					if_block3.m(div, t5);
				}
			} else if (if_block3) {
				group_outros();

				transition_out(if_block3, 1, 1, () => {
					if_block3 = null;
				});

				check_outros();
			}

			if (/*i*/ ctx[0] >= 17) {
				if (if_block4) {
					if (dirty & /*i*/ 1) {
						transition_in(if_block4, 1);
					}
				} else {
					if_block4 = create_if_block_2$9(ctx);
					if_block4.c();
					transition_in(if_block4, 1);
					if_block4.m(div, t6);
				}
			} else if (if_block4) {
				group_outros();

				transition_out(if_block4, 1, 1, () => {
					if_block4 = null;
				});

				check_outros();
			}

			if (/*i*/ ctx[0] >= 18) {
				if (if_block5) {
					if (dirty & /*i*/ 1) {
						transition_in(if_block5, 1);
					}
				} else {
					if_block5 = create_if_block_1$b(ctx);
					if_block5.c();
					transition_in(if_block5, 1);
					if_block5.m(div, t7);
				}
			} else if (if_block5) {
				group_outros();

				transition_out(if_block5, 1, 1, () => {
					if_block5 = null;
				});

				check_outros();
			}

			if (/*i*/ ctx[0] >= 19) {
				if (if_block6) {
					if (dirty & /*i*/ 1) {
						transition_in(if_block6, 1);
					}
				} else {
					if_block6 = create_if_block$g(ctx);
					if_block6.c();
					transition_in(if_block6, 1);
					if_block6.m(div, null);
				}
			} else if (if_block6) {
				group_outros();

				transition_out(if_block6, 1, 1, () => {
					if_block6 = null;
				});

				check_outros();
			}

			if (dirty & /*i*/ 1) {
				toggle_class(div, "row", /*i*/ ctx[0] >= 13);
			}
		},
		i(local) {
			if (current) return;
			transition_in(if_block0);
			transition_in(if_block1);
			transition_in(if_block2);
			transition_in(if_block3);
			transition_in(if_block4);
			transition_in(if_block5);
			transition_in(if_block6);
			current = true;
		},
		o(local) {
			transition_out(if_block1);
			transition_out(if_block2);
			transition_out(if_block3);
			transition_out(if_block4);
			transition_out(if_block5);
			transition_out(if_block6);
			current = false;
		},
		d(detaching) {
			if (detaching) detach(h2);
			if (detaching) detach(t1);
			if (detaching) detach(div);
			if (if_block0) if_block0.d();
			if (if_block1) if_block1.d();
			if (if_block2) if_block2.d();
			if (if_block3) if_block3.d();
			if (if_block4) if_block4.d();
			if (if_block5) if_block5.d();
			if (if_block6) if_block6.d();
		}
	};
}

function instance$w($$self, $$props, $$invalidate) {
	let i = -1;

	function next() {
		if (i < 19) {
			$$invalidate(0, i++, i);
			return true;
		}

		return false;
	}

	function prev() {
		if (i >= 0) {
			$$invalidate(0, i--, i);
			return true;
		}

		return false;
	}

	const ease = { easing: cubicIn, duration: 200 };
	return [i, ease, next, prev];
}

class Slides9 extends SvelteComponent {
	constructor(options) {
		super();
		if (!document.getElementById("svelte-qfqgcm-style")) add_css$s();
		init(this, options, instance$w, create_fragment$z, safe_not_equal, { next: 2, prev: 3 });
	}

	get next() {
		return this.$$.ctx[2];
	}

	get prev() {
		return this.$$.ctx[3];
	}
}

var overview = "./assets/overview-c061b6c3.png";

/* @@slides10.svelte generated by Svelte v3.24.0 */

function add_css$t() {
	var style = element("style");
	style.id = "svelte-5yd29m-style";
	style.textContent = "h2.svelte-5yd29m{margin:0}.hidden.svelte-5yd29m{opacity:0}img.center.svelte-5yd29m{transform:translateY(120px)}img.svelte-5yd29m{transition:200ms ease-in}.code.svelte-5yd29m{font-size:23px;line-height:1.39;margin-top:16px;font-family:\"Consolas\", \"Bitstream Vera Sans Mono\", \"Courier New\", Courier, monospace}.box.svelte-5yd29m{border:1px solid red;position:absolute;z-index:10;width:400px;left:45px;pointer-events:none;transition:200ms ease-in}.box2.svelte-5yd29m{top:92px;left:8px;height:219px;width:390px}.box3.svelte-5yd29m{top:92px;left:172px;height:219px;width:530px}.box4.svelte-5yd29m{top:92px;left:474px;height:219px;width:500px}.box5.svelte-5yd29m{top:92px;left:834px;height:219px;width:431px}";
	append(document.head, style);
}

// (29:0) {#if i >= 2}
function create_if_block_4$3(ctx) {
	let div0;
	let div0_transition;
	let t10;
	let div1;
	let div1_transition;
	let t12;
	let div2;
	let div2_transition;
	let current;

	return {
		c() {
			div0 = element("div");
			div0.innerHTML = `<span class="token keyword">const</span> source <span class="token operator">=</span> fs<span class="token punctuation">.</span><span class="token function">readFileSync</span><span class="token punctuation">(</span><span class="token string">&#39;App.svelte&#39;</span><span class="token punctuation">)</span><span class="token punctuation">;</span>`;
			t10 = space();
			div1 = element("div");
			div1.innerHTML = `<span class="token comment">// parse source code into AST</span>`;
			t12 = space();
			div2 = element("div");
			div2.innerHTML = `<span class="token keyword">const</span> ast <span class="token operator">=</span>  <span class="token function">parse</span><span class="token punctuation">(</span>source<span class="token punctuation">)</span><span class="token punctuation">;</span>`;
		},
		m(target, anchor) {
			insert(target, div0, anchor);
			insert(target, t10, anchor);
			insert(target, div1, anchor);
			insert(target, t12, anchor);
			insert(target, div2, anchor);
			current = true;
		},
		i(local) {
			if (current) return;

			add_render_callback(() => {
				if (!div0_transition) div0_transition = create_bidirectional_transition(div0, fade, /*ease*/ ctx[1], true);
				div0_transition.run(1);
			});

			add_render_callback(() => {
				if (!div1_transition) div1_transition = create_bidirectional_transition(div1, fade, /*ease*/ ctx[1], true);
				div1_transition.run(1);
			});

			add_render_callback(() => {
				if (!div2_transition) div2_transition = create_bidirectional_transition(div2, fade, /*ease*/ ctx[1], true);
				div2_transition.run(1);
			});

			current = true;
		},
		o(local) {
			if (!div0_transition) div0_transition = create_bidirectional_transition(div0, fade, /*ease*/ ctx[1], false);
			div0_transition.run(0);
			if (!div1_transition) div1_transition = create_bidirectional_transition(div1, fade, /*ease*/ ctx[1], false);
			div1_transition.run(0);
			if (!div2_transition) div2_transition = create_bidirectional_transition(div2, fade, /*ease*/ ctx[1], false);
			div2_transition.run(0);
			current = false;
		},
		d(detaching) {
			if (detaching) detach(div0);
			if (detaching && div0_transition) div0_transition.end();
			if (detaching) detach(t10);
			if (detaching) detach(div1);
			if (detaching && div1_transition) div1_transition.end();
			if (detaching) detach(t12);
			if (detaching) detach(div2);
			if (detaching && div2_transition) div2_transition.end();
		}
	};
}

// (34:0) {#if i >= 3}
function create_if_block_3$4(ctx) {
	let div0;
	let div0_transition;
	let t1;
	let div1;
	let div1_transition;
	let current;

	return {
		c() {
			div0 = element("div");
			div0.innerHTML = `<span class="token comment">// tracking refrences and dependencies</span>`;
			t1 = space();
			div1 = element("div");
			div1.innerHTML = `<span class="token keyword">const</span> component <span class="token operator">=</span>  <span class="token keyword">new</span>  <span class="token class-name">Component</span><span class="token punctuation">(</span>ast<span class="token punctuation">)</span><span class="token punctuation">;</span>`;
		},
		m(target, anchor) {
			insert(target, div0, anchor);
			insert(target, t1, anchor);
			insert(target, div1, anchor);
			current = true;
		},
		i(local) {
			if (current) return;

			add_render_callback(() => {
				if (!div0_transition) div0_transition = create_bidirectional_transition(div0, fade, /*ease*/ ctx[1], true);
				div0_transition.run(1);
			});

			add_render_callback(() => {
				if (!div1_transition) div1_transition = create_bidirectional_transition(div1, fade, /*ease*/ ctx[1], true);
				div1_transition.run(1);
			});

			current = true;
		},
		o(local) {
			if (!div0_transition) div0_transition = create_bidirectional_transition(div0, fade, /*ease*/ ctx[1], false);
			div0_transition.run(0);
			if (!div1_transition) div1_transition = create_bidirectional_transition(div1, fade, /*ease*/ ctx[1], false);
			div1_transition.run(0);
			current = false;
		},
		d(detaching) {
			if (detaching) detach(div0);
			if (detaching && div0_transition) div0_transition.end();
			if (detaching) detach(t1);
			if (detaching) detach(div1);
			if (detaching && div1_transition) div1_transition.end();
		}
	};
}

// (38:0) {#if i >= 4}
function create_if_block_2$a(ctx) {
	let div0;
	let div0_transition;
	let t1;
	let div1;
	let div1_transition;
	let current;

	return {
		c() {
			div0 = element("div");
			div0.innerHTML = `<span class="token comment">// creating code blocks and fragments</span>`;
			t1 = space();
			div1 = element("div");
			div1.innerHTML = `<span class="token keyword">const</span> rerender <span class="token operator">=</span> options<span class="token punctuation">.</span>generate <span class="token operator">===</span>  <span class="token string">&#39;ssr&#39;</span>  <span class="token operator">?</span>  <span class="token function">SSRRenderer</span><span class="token punctuation">(</span>component<span class="token punctuation">)</span>  <span class="token operator">:</span>  <span class="token function">DomRenderer</span><span class="token punctuation">(</span>component<span class="token punctuation">)</span><span class="token punctuation">;</span>`;
		},
		m(target, anchor) {
			insert(target, div0, anchor);
			insert(target, t1, anchor);
			insert(target, div1, anchor);
			current = true;
		},
		i(local) {
			if (current) return;

			add_render_callback(() => {
				if (!div0_transition) div0_transition = create_bidirectional_transition(div0, fade, /*ease*/ ctx[1], true);
				div0_transition.run(1);
			});

			add_render_callback(() => {
				if (!div1_transition) div1_transition = create_bidirectional_transition(div1, fade, /*ease*/ ctx[1], true);
				div1_transition.run(1);
			});

			current = true;
		},
		o(local) {
			if (!div0_transition) div0_transition = create_bidirectional_transition(div0, fade, /*ease*/ ctx[1], false);
			div0_transition.run(0);
			if (!div1_transition) div1_transition = create_bidirectional_transition(div1, fade, /*ease*/ ctx[1], false);
			div1_transition.run(0);
			current = false;
		},
		d(detaching) {
			if (detaching) detach(div0);
			if (detaching && div0_transition) div0_transition.end();
			if (detaching) detach(t1);
			if (detaching) detach(div1);
			if (detaching && div1_transition) div1_transition.end();
		}
	};
}

// (42:0) {#if i >= 5}
function create_if_block_1$c(ctx) {
	let div0;
	let div0_transition;
	let t1;
	let div1;
	let span1;
	let t3;
	let span2;
	let raw_value = "{" + "";
	let t4;
	let span3;
	let t6;
	let span4;
	let t8;
	let span5;
	let t10;
	let span6;
	let span7;
	let span8;
	let span9;
	let span10;
	let div1_transition;
	let t16;
	let div2;
	let div2_transition;
	let t26;
	let div3;
	let div3_transition;
	let current;

	return {
		c() {
			div0 = element("div");
			div0.innerHTML = `<span class="token comment">// generate code</span>`;
			t1 = space();
			div1 = element("div");
			span1 = element("span");
			span1.textContent = "const";
			t3 = space();
			span2 = element("span");
			t4 = text(" js");
			span3 = element("span");
			span3.textContent = ",";
			t6 = text(" css ");
			span4 = element("span");
			span4.textContent = "}";
			t8 = space();
			span5 = element("span");
			span5.textContent = "=";
			t10 = text(" renderer");
			span6 = element("span");
			span6.textContent = ".";
			span7 = element("span");
			span7.textContent = "render";
			span8 = element("span");
			span8.textContent = "(";
			span9 = element("span");
			span9.textContent = ")";
			span10 = element("span");
			span10.textContent = ";";
			t16 = space();
			div2 = element("div");
			div2.innerHTML = `fs<span class="token punctuation">.</span><span class="token function">writeFileSync</span><span class="token punctuation">(</span><span class="token string">&#39;App.js&#39;</span><span class="token punctuation">,</span> js<span class="token punctuation">)</span><span class="token punctuation">;</span>`;
			t26 = space();
			div3 = element("div");
			div3.innerHTML = `fs<span class="token punctuation">.</span><span class="token function">writeFileSync</span><span class="token punctuation">(</span><span class="token string">&#39;App.css&#39;</span><span class="token punctuation">,</span> css<span class="token punctuation">)</span><span class="token punctuation">;</span>`;
			attr(span1, "class", "token keyword");
			attr(span2, "class", "token punctuation");
			attr(span3, "class", "token punctuation");
			attr(span4, "class", "token punctuation");
			attr(span5, "class", "token operator");
			attr(span6, "class", "token punctuation");
			attr(span7, "class", "token function");
			attr(span8, "class", "token punctuation");
			attr(span9, "class", "token punctuation");
			attr(span10, "class", "token punctuation");
		},
		m(target, anchor) {
			insert(target, div0, anchor);
			insert(target, t1, anchor);
			insert(target, div1, anchor);
			append(div1, span1);
			append(div1, t3);
			append(div1, span2);
			span2.innerHTML = raw_value;
			append(div1, t4);
			append(div1, span3);
			append(div1, t6);
			append(div1, span4);
			append(div1, t8);
			append(div1, span5);
			append(div1, t10);
			append(div1, span6);
			append(div1, span7);
			append(div1, span8);
			append(div1, span9);
			append(div1, span10);
			insert(target, t16, anchor);
			insert(target, div2, anchor);
			insert(target, t26, anchor);
			insert(target, div3, anchor);
			current = true;
		},
		i(local) {
			if (current) return;

			add_render_callback(() => {
				if (!div0_transition) div0_transition = create_bidirectional_transition(div0, fade, /*ease*/ ctx[1], true);
				div0_transition.run(1);
			});

			add_render_callback(() => {
				if (!div1_transition) div1_transition = create_bidirectional_transition(div1, fade, /*ease*/ ctx[1], true);
				div1_transition.run(1);
			});

			add_render_callback(() => {
				if (!div2_transition) div2_transition = create_bidirectional_transition(div2, fade, /*ease*/ ctx[1], true);
				div2_transition.run(1);
			});

			add_render_callback(() => {
				if (!div3_transition) div3_transition = create_bidirectional_transition(div3, fade, /*ease*/ ctx[1], true);
				div3_transition.run(1);
			});

			current = true;
		},
		o(local) {
			if (!div0_transition) div0_transition = create_bidirectional_transition(div0, fade, /*ease*/ ctx[1], false);
			div0_transition.run(0);
			if (!div1_transition) div1_transition = create_bidirectional_transition(div1, fade, /*ease*/ ctx[1], false);
			div1_transition.run(0);
			if (!div2_transition) div2_transition = create_bidirectional_transition(div2, fade, /*ease*/ ctx[1], false);
			div2_transition.run(0);
			if (!div3_transition) div3_transition = create_bidirectional_transition(div3, fade, /*ease*/ ctx[1], false);
			div3_transition.run(0);
			current = false;
		},
		d(detaching) {
			if (detaching) detach(div0);
			if (detaching && div0_transition) div0_transition.end();
			if (detaching) detach(t1);
			if (detaching) detach(div1);
			if (detaching && div1_transition) div1_transition.end();
			if (detaching) detach(t16);
			if (detaching) detach(div2);
			if (detaching && div2_transition) div2_transition.end();
			if (detaching) detach(t26);
			if (detaching) detach(div3);
			if (detaching && div3_transition) div3_transition.end();
		}
	};
}

// (49:0) {#if i >= 2}
function create_if_block$h(ctx) {
	let div;
	let div_class_value;
	let div_transition;
	let current;

	return {
		c() {
			div = element("div");
			attr(div, "class", div_class_value = "box box" + /*i*/ ctx[0] + " svelte-5yd29m");
		},
		m(target, anchor) {
			insert(target, div, anchor);
			current = true;
		},
		p(ctx, dirty) {
			if (!current || dirty & /*i*/ 1 && div_class_value !== (div_class_value = "box box" + /*i*/ ctx[0] + " svelte-5yd29m")) {
				attr(div, "class", div_class_value);
			}
		},
		i(local) {
			if (current) return;

			add_render_callback(() => {
				if (!div_transition) div_transition = create_bidirectional_transition(div, fade, /*ease*/ ctx[1], true);
				div_transition.run(1);
			});

			current = true;
		},
		o(local) {
			if (!div_transition) div_transition = create_bidirectional_transition(div, fade, /*ease*/ ctx[1], false);
			div_transition.run(0);
			current = false;
		},
		d(detaching) {
			if (detaching) detach(div);
			if (detaching && div_transition) div_transition.end();
		}
	};
}

function create_fragment$A(ctx) {
	let h2;
	let t1;
	let img;
	let img_src_value;
	let img_transition;
	let t2;
	let div;
	let t3;
	let t4;
	let t5;
	let t6;
	let if_block4_anchor;
	let current;
	let if_block0 = /*i*/ ctx[0] >= 2 && create_if_block_4$3(ctx);
	let if_block1 = /*i*/ ctx[0] >= 3 && create_if_block_3$4(ctx);
	let if_block2 = /*i*/ ctx[0] >= 4 && create_if_block_2$a(ctx);
	let if_block3 = /*i*/ ctx[0] >= 5 && create_if_block_1$c(ctx);
	let if_block4 = /*i*/ ctx[0] >= 2 && create_if_block$h(ctx);

	return {
		c() {
			h2 = element("h2");
			h2.textContent = "How does Svelte compiler work?";
			t1 = space();
			img = element("img");
			t2 = space();
			div = element("div");
			if (if_block0) if_block0.c();
			t3 = space();
			if (if_block1) if_block1.c();
			t4 = space();
			if (if_block2) if_block2.c();
			t5 = space();
			if (if_block3) if_block3.c();
			t6 = space();
			if (if_block4) if_block4.c();
			if_block4_anchor = empty();
			attr(h2, "class", "svelte-5yd29m");
			if (img.src !== (img_src_value = overview)) attr(img, "src", img_src_value);
			attr(img, "alt", ".");
			attr(img, "class", "svelte-5yd29m");
			toggle_class(img, "hidden", /*i*/ ctx[0] < 1);
			toggle_class(img, "center", /*i*/ ctx[0] <= 1);
			attr(div, "class", "code svelte-5yd29m");
		},
		m(target, anchor) {
			insert(target, h2, anchor);
			insert(target, t1, anchor);
			insert(target, img, anchor);
			insert(target, t2, anchor);
			insert(target, div, anchor);
			if (if_block0) if_block0.m(div, null);
			append(div, t3);
			if (if_block1) if_block1.m(div, null);
			append(div, t4);
			if (if_block2) if_block2.m(div, null);
			append(div, t5);
			if (if_block3) if_block3.m(div, null);
			insert(target, t6, anchor);
			if (if_block4) if_block4.m(target, anchor);
			insert(target, if_block4_anchor, anchor);
			current = true;
		},
		p(ctx, [dirty]) {
			if (dirty & /*i*/ 1) {
				toggle_class(img, "hidden", /*i*/ ctx[0] < 1);
			}

			if (dirty & /*i*/ 1) {
				toggle_class(img, "center", /*i*/ ctx[0] <= 1);
			}

			if (/*i*/ ctx[0] >= 2) {
				if (if_block0) {
					if (dirty & /*i*/ 1) {
						transition_in(if_block0, 1);
					}
				} else {
					if_block0 = create_if_block_4$3(ctx);
					if_block0.c();
					transition_in(if_block0, 1);
					if_block0.m(div, t3);
				}
			} else if (if_block0) {
				group_outros();

				transition_out(if_block0, 1, 1, () => {
					if_block0 = null;
				});

				check_outros();
			}

			if (/*i*/ ctx[0] >= 3) {
				if (if_block1) {
					if (dirty & /*i*/ 1) {
						transition_in(if_block1, 1);
					}
				} else {
					if_block1 = create_if_block_3$4(ctx);
					if_block1.c();
					transition_in(if_block1, 1);
					if_block1.m(div, t4);
				}
			} else if (if_block1) {
				group_outros();

				transition_out(if_block1, 1, 1, () => {
					if_block1 = null;
				});

				check_outros();
			}

			if (/*i*/ ctx[0] >= 4) {
				if (if_block2) {
					if (dirty & /*i*/ 1) {
						transition_in(if_block2, 1);
					}
				} else {
					if_block2 = create_if_block_2$a(ctx);
					if_block2.c();
					transition_in(if_block2, 1);
					if_block2.m(div, t5);
				}
			} else if (if_block2) {
				group_outros();

				transition_out(if_block2, 1, 1, () => {
					if_block2 = null;
				});

				check_outros();
			}

			if (/*i*/ ctx[0] >= 5) {
				if (if_block3) {
					if (dirty & /*i*/ 1) {
						transition_in(if_block3, 1);
					}
				} else {
					if_block3 = create_if_block_1$c(ctx);
					if_block3.c();
					transition_in(if_block3, 1);
					if_block3.m(div, null);
				}
			} else if (if_block3) {
				group_outros();

				transition_out(if_block3, 1, 1, () => {
					if_block3 = null;
				});

				check_outros();
			}

			if (/*i*/ ctx[0] >= 2) {
				if (if_block4) {
					if_block4.p(ctx, dirty);

					if (dirty & /*i*/ 1) {
						transition_in(if_block4, 1);
					}
				} else {
					if_block4 = create_if_block$h(ctx);
					if_block4.c();
					transition_in(if_block4, 1);
					if_block4.m(if_block4_anchor.parentNode, if_block4_anchor);
				}
			} else if (if_block4) {
				group_outros();

				transition_out(if_block4, 1, 1, () => {
					if_block4 = null;
				});

				check_outros();
			}
		},
		i(local) {
			if (current) return;

			add_render_callback(() => {
				if (!img_transition) img_transition = create_bidirectional_transition(img, fade, /*ease*/ ctx[1], true);
				img_transition.run(1);
			});

			transition_in(if_block0);
			transition_in(if_block1);
			transition_in(if_block2);
			transition_in(if_block3);
			transition_in(if_block4);
			current = true;
		},
		o(local) {
			if (!img_transition) img_transition = create_bidirectional_transition(img, fade, /*ease*/ ctx[1], false);
			img_transition.run(0);
			transition_out(if_block0);
			transition_out(if_block1);
			transition_out(if_block2);
			transition_out(if_block3);
			transition_out(if_block4);
			current = false;
		},
		d(detaching) {
			if (detaching) detach(h2);
			if (detaching) detach(t1);
			if (detaching) detach(img);
			if (detaching && img_transition) img_transition.end();
			if (detaching) detach(t2);
			if (detaching) detach(div);
			if (if_block0) if_block0.d();
			if (if_block1) if_block1.d();
			if (if_block2) if_block2.d();
			if (if_block3) if_block3.d();
			if (detaching) detach(t6);
			if (if_block4) if_block4.d(detaching);
			if (detaching) detach(if_block4_anchor);
		}
	};
}

function instance$x($$self, $$props, $$invalidate) {
	const ease = { easing: cubicIn, duration: 200 };
	let i = 0;

	function next() {
		if (i < 5) {
			$$invalidate(0, i++, i);
			return true;
		}

		return false;
	}

	function prev() {
		if (i > 0) {
			$$invalidate(0, i--, i);
			return true;
		}

		return false;
	}

	return [i, ease, next, prev];
}

class Slides10 extends SvelteComponent {
	constructor(options) {
		super();
		if (!document.getElementById("svelte-5yd29m-style")) add_css$t();
		init(this, options, instance$x, create_fragment$A, safe_not_equal, { next: 2, prev: 3 });
	}

	get next() {
		return this.$$.ctx[2];
	}

	get prev() {
		return this.$$.ctx[3];
	}
}

/* @@slides11.svelte generated by Svelte v3.24.0 */

function add_css$u() {
	var style = element("style");
	style.id = "svelte-vd3fee-style";
	style.textContent = "h1.svelte-vd3fee{display:grid;height:100%;place-items:center;margin:0}";
	append(document.head, style);
}

function create_fragment$B(ctx) {
	let h1;

	return {
		c() {
			h1 = element("h1");
			h1.textContent = "1. Parsing Svelte code";
			attr(h1, "class", "svelte-vd3fee");
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

class Slides11 extends SvelteComponent {
	constructor(options) {
		super();
		if (!document.getElementById("svelte-vd3fee-style")) add_css$u();
		init(this, options, null, create_fragment$B, safe_not_equal, {});
	}
}

var code = "<script>\n  let count = 5;\n  let values;\n\n  $: double = count * 2;\n  $: {\n    const data = [];\n    for (let i = 0; i < double; i++) {\n      data[i] = Math.floor(Math.random() * 10);\n    } \n    values = data;\n  }\n</script>\n\n<input bind:value={count} />\n\n{#each values as value}\n  <div class:even={value % 2 === 0}>{value}</div>\n{/each}\n\n<style>\n  .even {\n    color: red;\n  }\n</style>";

var ast$1 = "./assets/svelte-ast-a07813f5.png";

function convertTextToSpan(elem) {
  if (elem.childNodes.length === 1 && elem.childNodes[0].nodeName === '#text') {
    return;
  }
  elem.childNodes.forEach(c => {
    if (c.nodeName === '#text') {
      if (c.data.trim().length > 0) {
        const s = document.createElement('span');
        c.replaceWith(s);
        s.appendChild(c);
      }
    } else {
      convertTextToSpan(c);
    }
  });

  return {
    update(tokenize) {
      if (tokenize) {
        toggleOnClass(elem);
      } else {
        toggleOffClass(elem);
      }
    },
  };
}

function toggleOnClass(elem) {
  if (elem.childNodes.length === 1 && elem.childNodes[0].nodeName === '#text') {
    elem.classList.add('lex-token');
    return;
  }
  elem.childNodes.forEach(c => {
    if (c.nodeName !== '#text') {
      toggleOnClass(c);
    }
  });
}
function toggleOffClass(elem) {
  elem.querySelectorAll('.lex-token').forEach(c => {
    c.classList.remove('lex-token');
  });
}

/* @@slides12.svelte generated by Svelte v3.24.0 */

function add_css$v() {
	var style = element("style");
	style.id = "svelte-1reytr0-style";
	style.textContent = ".tab{width:2ch;display:inline-block}.code.svelte-1reytr0{font-family:\"Consolas\", \"Bitstream Vera Sans Mono\", \"Courier New\", Courier, monospace;font-size:22px}.code.svelte-1reytr0 span{transition:200ms ease-in}.code.svelte-1reytr0 span.lex-token{border:1px solid black;margin:2px}.container.svelte-1reytr0{display:grid;grid-template-columns:auto 1fr}li.svelte-1reytr0{transition:200ms ease-in}.hidden.svelte-1reytr0{opacity:0}.box.svelte-1reytr0{border:1px solid red;position:absolute;z-index:10;pointer-events:none;--line-height:26px;top:calc(14px + var(--start, 0) * var(--line-height));height:calc(var(--line) * var(--line-height));margin-left:14px;left:calc(var(--tab) * 1ch);width:calc(var(--char, 27) * 1ch)}.box-0-0.svelte-1reytr0{--start:0;--line:13;--tab:0;--char:44}.box-0-1.svelte-1reytr0{--start:14;--line:1;--tab:0}.box-0-2.svelte-1reytr0{--start:17;--line:1;--tab:2;--char:44}.box-0-3.svelte-1reytr0{--start:20;--line:5;--tab:0}.box-1-0.svelte-1reytr0{--start:16;--line:3;--tab:0;--char:46}.box-2-0.svelte-1reytr0{--start:1;--line:11;--tab:2;--char:42}.box-3-0.svelte-1reytr0{--start:14;--line:1;--tab:17.6;--char:4.6}.box-3-1.svelte-1reytr0{--start:17;--line:1;--tab:17.6;--char:14}.box-3-2.svelte-1reytr0{--start:17;--line:1;--tab:34.3;--char:4.6}.box-4-0.svelte-1reytr0{--start:21;--line:3;--tab:2}";
	append(document.head, style);
}

function get_each_context_1$2(ctx, list, i) {
	const child_ctx = ctx.slice();
	child_ctx[10] = list[i];
	child_ctx[12] = i;
	return child_ctx;
}

function get_each_context$a(ctx, list, i) {
	const child_ctx = ctx.slice();
	child_ctx[6] = list[i].n;
	child_ctx[7] = list[i].step;
	child_ctx[9] = i;
	return child_ctx;
}

// (63:4) {:else}
function create_else_block$9(ctx) {
	let img;
	let img_src_value;
	let img_transition;
	let current;

	return {
		c() {
			img = element("img");
			attr(img, "alt", ".");
			if (img.src !== (img_src_value = ast$1)) attr(img, "src", img_src_value);
		},
		m(target, anchor) {
			insert(target, img, anchor);
			current = true;
		},
		p: noop,
		i(local) {
			if (current) return;

			add_render_callback(() => {
				if (!img_transition) img_transition = create_bidirectional_transition(img, fade, { duration: 200, easing: cubicIn }, true);
				img_transition.run(1);
			});

			current = true;
		},
		o(local) {
			if (!img_transition) img_transition = create_bidirectional_transition(img, fade, { duration: 200, easing: cubicIn }, false);
			img_transition.run(0);
			current = false;
		},
		d(detaching) {
			if (detaching) detach(img);
			if (detaching && img_transition) img_transition.end();
		}
	};
}

// (43:4) {#if i < 10}
function create_if_block$i(ctx) {
	let ul3;
	let li2;
	let t0;
	let ul0;
	let li0;
	let t2;
	let li1;
	let t4;
	let li5;
	let t5;
	let ul1;
	let li3;
	let span0;
	let prism_action;
	let t6;
	let t7;
	let li4;
	let t8;
	let span1;
	let prism_action_1;
	let t9;
	let li7;
	let t10;
	let ul2;
	let li6;
	let span2;
	let prism_action_2;
	let t11;
	let mounted;
	let dispose;

	return {
		c() {
			ul3 = element("ul");
			li2 = element("li");
			t0 = text("Svelte implements its own parser\n          ");
			ul0 = element("ul");
			li0 = element("li");
			li0.textContent = "HTML syntax";
			t2 = space();
			li1 = element("li");
			li1.textContent = "Logic blocks";
			t4 = space();
			li5 = element("li");
			t5 = text("Svelte uses acorn to parse JavaScript\n          ");
			ul1 = element("ul");
			li3 = element("li");
			span0 = element("span");
			t6 = text(" tag");
			t7 = space();
			li4 = element("li");
			t8 = text("Curly brakcets ");
			span1 = element("span");
			t9 = space();
			li7 = element("li");
			t10 = text("Svelte uses css-tree to parse CSS\n          ");
			ul2 = element("ul");
			li6 = element("li");
			span2 = element("span");
			t11 = text(" tag");
			attr(li0, "class", "svelte-1reytr0");
			toggle_class(li0, "hidden", /*i*/ ctx[0] < 2 || /*i*/ ctx[0] >= 9);
			attr(li1, "class", "svelte-1reytr0");
			toggle_class(li1, "hidden", /*i*/ ctx[0] < 3 || /*i*/ ctx[0] >= 9);
			attr(li2, "class", "svelte-1reytr0");
			toggle_class(li2, "hidden", /*i*/ ctx[0] < 1 || /*i*/ ctx[0] >= 9);
			attr(li3, "class", "svelte-1reytr0");
			toggle_class(li3, "hidden", /*i*/ ctx[0] < 5 || /*i*/ ctx[0] >= 9);
			attr(li4, "class", "svelte-1reytr0");
			toggle_class(li4, "hidden", /*i*/ ctx[0] < 6 || /*i*/ ctx[0] >= 9);
			attr(li5, "class", "svelte-1reytr0");
			toggle_class(li5, "hidden", /*i*/ ctx[0] < 4 || /*i*/ ctx[0] >= 9);
			attr(li6, "class", "svelte-1reytr0");
			toggle_class(li6, "hidden", /*i*/ ctx[0] < 8 || /*i*/ ctx[0] >= 9);
			attr(li7, "class", "svelte-1reytr0");
			toggle_class(li7, "hidden", /*i*/ ctx[0] < 7 || /*i*/ ctx[0] >= 9);
		},
		m(target, anchor) {
			insert(target, ul3, anchor);
			append(ul3, li2);
			append(li2, t0);
			append(li2, ul0);
			append(ul0, li0);
			append(ul0, t2);
			append(ul0, li1);
			append(ul3, t4);
			append(ul3, li5);
			append(li5, t5);
			append(li5, ul1);
			append(ul1, li3);
			append(li3, span0);
			append(li3, t6);
			append(ul1, t7);
			append(ul1, li4);
			append(li4, t8);
			append(li4, span1);
			append(ul3, t9);
			append(ul3, li7);
			append(li7, t10);
			append(li7, ul2);
			append(ul2, li6);
			append(li6, span2);
			append(li6, t11);

			if (!mounted) {
				dispose = [
					action_destroyer(prism_action = prism$1.call(null, span0, {
						code: "<script>",
						lang: prism.languages.html
					})),
					action_destroyer(prism_action_1 = prism$1.call(null, span1, {
						code: "{ }",
						lang: prism.languages.javascript
					})),
					action_destroyer(prism_action_2 = prism$1.call(null, span2, {
						code: "<style>",
						lang: prism.languages.html
					}))
				];

				mounted = true;
			}
		},
		p(ctx, dirty) {
			if (dirty & /*i*/ 1) {
				toggle_class(li0, "hidden", /*i*/ ctx[0] < 2 || /*i*/ ctx[0] >= 9);
			}

			if (dirty & /*i*/ 1) {
				toggle_class(li1, "hidden", /*i*/ ctx[0] < 3 || /*i*/ ctx[0] >= 9);
			}

			if (dirty & /*i*/ 1) {
				toggle_class(li2, "hidden", /*i*/ ctx[0] < 1 || /*i*/ ctx[0] >= 9);
			}

			if (dirty & /*i*/ 1) {
				toggle_class(li3, "hidden", /*i*/ ctx[0] < 5 || /*i*/ ctx[0] >= 9);
			}

			if (dirty & /*i*/ 1) {
				toggle_class(li4, "hidden", /*i*/ ctx[0] < 6 || /*i*/ ctx[0] >= 9);
			}

			if (dirty & /*i*/ 1) {
				toggle_class(li5, "hidden", /*i*/ ctx[0] < 4 || /*i*/ ctx[0] >= 9);
			}

			if (dirty & /*i*/ 1) {
				toggle_class(li6, "hidden", /*i*/ ctx[0] < 8 || /*i*/ ctx[0] >= 9);
			}

			if (dirty & /*i*/ 1) {
				toggle_class(li7, "hidden", /*i*/ ctx[0] < 7 || /*i*/ ctx[0] >= 9);
			}
		},
		i: noop,
		o: noop,
		d(detaching) {
			if (detaching) detach(ul3);
			mounted = false;
			run_all(dispose);
		}
	};
}

// (69:2) {#each { length: n } as _, j (j)}
function create_each_block_1$2(key_1, ctx) {
	let div;
	let div_class_value;

	return {
		key: key_1,
		first: null,
		c() {
			div = element("div");
			attr(div, "class", div_class_value = "box box-" + /*k*/ ctx[9] + "-" + /*j*/ ctx[12] + " svelte-1reytr0");
			toggle_class(div, "hidden", /*i*/ ctx[0] !== /*step*/ ctx[7]);
			this.first = div;
		},
		m(target, anchor) {
			insert(target, div, anchor);
		},
		p(ctx, dirty) {
			if (dirty & /*i, box*/ 5) {
				toggle_class(div, "hidden", /*i*/ ctx[0] !== /*step*/ ctx[7]);
			}
		},
		d(detaching) {
			if (detaching) detach(div);
		}
	};
}

// (68:0) {#each box as { n, step }
function create_each_block$a(key_1, ctx) {
	let first;
	let each_blocks = [];
	let each_1_lookup = new Map();
	let each_1_anchor;
	let each_value_1 = { length: /*n*/ ctx[6] };
	const get_key = ctx => /*j*/ ctx[12];

	for (let i = 0; i < each_value_1.length; i += 1) {
		let child_ctx = get_each_context_1$2(ctx, each_value_1, i);
		let key = get_key(child_ctx);
		each_1_lookup.set(key, each_blocks[i] = create_each_block_1$2(key, child_ctx));
	}

	return {
		key: key_1,
		first: null,
		c() {
			first = empty();

			for (let i = 0; i < each_blocks.length; i += 1) {
				each_blocks[i].c();
			}

			each_1_anchor = empty();
			this.first = first;
		},
		m(target, anchor) {
			insert(target, first, anchor);

			for (let i = 0; i < each_blocks.length; i += 1) {
				each_blocks[i].m(target, anchor);
			}

			insert(target, each_1_anchor, anchor);
		},
		p(ctx, dirty) {
			if (dirty & /*box, i*/ 5) {
				const each_value_1 = { length: /*n*/ ctx[6] };
				each_blocks = update_keyed_each(each_blocks, dirty, get_key, 1, ctx, each_value_1, each_1_lookup, each_1_anchor.parentNode, destroy_block, create_each_block_1$2, each_1_anchor, get_each_context_1$2);
			}
		},
		d(detaching) {
			if (detaching) detach(first);

			for (let i = 0; i < each_blocks.length; i += 1) {
				each_blocks[i].d(detaching);
			}

			if (detaching) detach(each_1_anchor);
		}
	};
}

function create_fragment$C(ctx) {
	let div2;
	let div0;
	let prism_action;
	let convertTextToSpan_action;
	let t0;
	let div1;
	let current_block_type_index;
	let if_block;
	let t1;
	let each_blocks = [];
	let each_1_lookup = new Map();
	let each_1_anchor;
	let current;
	let mounted;
	let dispose;
	const if_block_creators = [create_if_block$i, create_else_block$9];
	const if_blocks = [];

	function select_block_type(ctx, dirty) {
		if (/*i*/ ctx[0] < 10) return 0;
		return 1;
	}

	current_block_type_index = select_block_type(ctx);
	if_block = if_blocks[current_block_type_index] = if_block_creators[current_block_type_index](ctx);
	let each_value = /*box*/ ctx[2];
	const get_key = ctx => /*step*/ ctx[7];

	for (let i = 0; i < each_value.length; i += 1) {
		let child_ctx = get_each_context$a(ctx, each_value, i);
		let key = get_key(child_ctx);
		each_1_lookup.set(key, each_blocks[i] = create_each_block$a(key, child_ctx));
	}

	return {
		c() {
			div2 = element("div");
			div0 = element("div");
			t0 = space();
			div1 = element("div");
			if_block.c();
			t1 = space();

			for (let i = 0; i < each_blocks.length; i += 1) {
				each_blocks[i].c();
			}

			each_1_anchor = empty();
			attr(div0, "class", "code svelte-1reytr0");
			attr(div2, "class", "container svelte-1reytr0");
		},
		m(target, anchor) {
			insert(target, div2, anchor);
			append(div2, div0);
			/*div0_binding*/ ctx[5](div0);
			append(div2, t0);
			append(div2, div1);
			if_blocks[current_block_type_index].m(div1, null);
			insert(target, t1, anchor);

			for (let i = 0; i < each_blocks.length; i += 1) {
				each_blocks[i].m(target, anchor);
			}

			insert(target, each_1_anchor, anchor);
			current = true;

			if (!mounted) {
				dispose = [
					action_destroyer(prism_action = prism$1.call(null, div0, { code, lang: prism.languages.svelte })),
					action_destroyer(convertTextToSpan_action = convertTextToSpan.call(null, div0, /*i*/ ctx[0] >= 9))
				];

				mounted = true;
			}
		},
		p(ctx, [dirty]) {
			if (convertTextToSpan_action && is_function(convertTextToSpan_action.update) && dirty & /*i*/ 1) convertTextToSpan_action.update.call(null, /*i*/ ctx[0] >= 9);
			let previous_block_index = current_block_type_index;
			current_block_type_index = select_block_type(ctx);

			if (current_block_type_index === previous_block_index) {
				if_blocks[current_block_type_index].p(ctx, dirty);
			} else {
				group_outros();

				transition_out(if_blocks[previous_block_index], 1, 1, () => {
					if_blocks[previous_block_index] = null;
				});

				check_outros();
				if_block = if_blocks[current_block_type_index];

				if (!if_block) {
					if_block = if_blocks[current_block_type_index] = if_block_creators[current_block_type_index](ctx);
					if_block.c();
				}

				transition_in(if_block, 1);
				if_block.m(div1, null);
			}

			if (dirty & /*box, i*/ 5) {
				const each_value = /*box*/ ctx[2];
				each_blocks = update_keyed_each(each_blocks, dirty, get_key, 1, ctx, each_value, each_1_lookup, each_1_anchor.parentNode, destroy_block, create_each_block$a, each_1_anchor, get_each_context$a);
			}
		},
		i(local) {
			if (current) return;
			transition_in(if_block);
			current = true;
		},
		o(local) {
			transition_out(if_block);
			current = false;
		},
		d(detaching) {
			if (detaching) detach(div2);
			/*div0_binding*/ ctx[5](null);
			if_blocks[current_block_type_index].d();
			if (detaching) detach(t1);

			for (let i = 0; i < each_blocks.length; i += 1) {
				each_blocks[i].d(detaching);
			}

			if (detaching) detach(each_1_anchor);
			mounted = false;
			run_all(dispose);
		}
	};
}

function instance$y($$self, $$props, $$invalidate) {
	let i = 0;
	let codeContainer;

	const box = [
		{ n: 4, step: 2 },
		{ n: 1, step: 3 },
		{ n: 1, step: 5 },
		{ n: 3, step: 6 },
		{ n: 1, step: 8 }
	];

	function next() {
		if (i < 10) {
			$$invalidate(0, i++, i);
			return true;
		}

		return false;
	}

	function prev() {
		if (i > 0) {
			$$invalidate(0, i--, i);
			return true;
		}

		return false;
	}

	function div0_binding($$value) {
		binding_callbacks[$$value ? "unshift" : "push"](() => {
			codeContainer = $$value;
			$$invalidate(1, codeContainer);
		});
	}

	return [i, codeContainer, box, next, prev, div0_binding];
}

class Slides12 extends SvelteComponent {
	constructor(options) {
		super();
		if (!document.getElementById("svelte-1reytr0-style")) add_css$v();
		init(this, options, instance$y, create_fragment$C, safe_not_equal, { next: 3, prev: 4 });
	}

	get next() {
		return this.$$.ctx[3];
	}

	get prev() {
		return this.$$.ctx[4];
	}
}

/* @@slides13.svelte generated by Svelte v3.24.0 */

function add_css$w() {
	var style = element("style");
	style.id = "svelte-vd3fee-style";
	style.textContent = "h1.svelte-vd3fee{display:grid;height:100%;place-items:center;margin:0}";
	append(document.head, style);
}

function create_fragment$D(ctx) {
	let h1;

	return {
		c() {
			h1 = element("h1");
			h1.textContent = "2. Static Analysis";
			attr(h1, "class", "svelte-vd3fee");
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

class Slides13 extends SvelteComponent {
	constructor(options) {
		super();
		if (!document.getElementById("svelte-vd3fee-style")) add_css$w();
		init(this, options, null, create_fragment$D, safe_not_equal, {});
	}
}

var code$1 = "<script>\n  let count = 5;\n  let values;\n\n  $: double = count * 2;\n  $: {\n    const data = [];\n    for (let i = 0; i < double; i++) {\n      data[i] = Math.floor(Math.random() * 10);\n    } \n    values = data;\n  }\n</script>\n\n<input bind:value={count} />\n\n{#each values as value}\n  <div class:even={value % 2 === 0} class=\"svelte-xxx\">{value}</div>\n{/each}\n\n<style>\n  .even.svelte-xxx {\n    color: red;\n  }\n</style>";

/* @@slides14.svelte generated by Svelte v3.24.0 */

function add_css$x() {
	var style = element("style");
	style.id = "svelte-wxv401-style";
	style.textContent = ".tab{width:2ch;display:inline-block}.code.svelte-wxv401.svelte-wxv401{font-family:\"Consolas\", \"Bitstream Vera Sans Mono\", \"Courier New\", Courier, monospace;font-size:22px}.container.svelte-wxv401.svelte-wxv401{display:grid;grid-template-columns:1fr 1fr}.container.svelte-wxv401 li.svelte-wxv401{transition:200ms ease-in}.hidden.svelte-wxv401.svelte-wxv401{opacity:0}.vars.svelte-wxv401.svelte-wxv401{position:absolute;right:64px;bottom:64px;width:520px;height:280px;font-size:20px;border:1px solid #888;border-radius:12px;padding:16px 32px;box-shadow:8px 8px 10px #ddd}.vars.svelte-wxv401 ul.svelte-wxv401{margin:0}.var-prop.svelte-wxv401.svelte-wxv401{color:white;padding:3px 8px;font-size:0.8em;margin-left:4px;border-radius:8px;white-space:nowrap}.var-injected.svelte-wxv401.svelte-wxv401{background:rebeccapurple}.var-referenced-script.svelte-wxv401.svelte-wxv401{background:orange}.var-mutated.svelte-wxv401.svelte-wxv401{background:cadetblue}.var-referenced-template.svelte-wxv401.svelte-wxv401{background:crimson}.scope.svelte-wxv401.svelte-wxv401{padding:8px 16px;border:1px solid #aaa;margin-top:8px;font-size:0.9em}.scope.svelte-wxv401 .title.svelte-wxv401{margin-top:6px}.vars.svelte-wxv401 span.svelte-wxv401{position:absolute}.vars.svelte-wxv401 span.relative.svelte-wxv401,.vars.svelte-wxv401 span.var-prop.svelte-wxv401{position:relative}.box.svelte-wxv401.svelte-wxv401{border:1px solid red;position:absolute;z-index:10;pointer-events:none;--line-height:26px;top:calc(14px + var(--start, 0) * var(--line-height));height:var(--line-height);margin-left:14px;left:calc(var(--tab) * 1ch);width:calc(var(--char, 27) * 1ch)}.box-1.svelte-wxv401.svelte-wxv401,.box-2.svelte-wxv401.svelte-wxv401,.box-3.svelte-wxv401.svelte-wxv401,.box-4.svelte-wxv401.svelte-wxv401{--start:1;--tab:5.5;--char:5}.box-5.svelte-wxv401.svelte-wxv401,.box-6.svelte-wxv401.svelte-wxv401{--start:2;--tab:5.5;--char:5.8}.box-7.svelte-wxv401.svelte-wxv401,.box-8.svelte-wxv401.svelte-wxv401,.box-9.svelte-wxv401.svelte-wxv401{--start:4;--tab:4.5;--char:5.8}.box-10.svelte-wxv401.svelte-wxv401,.box-11.svelte-wxv401.svelte-wxv401{--start:4;--tab:13;--char:5}.box-12.svelte-wxv401.svelte-wxv401{--start:6;--tab:9;--char:4.2}.box-13.svelte-wxv401.svelte-wxv401{--start:7;--tab:12;--char:1}.box-14.svelte-wxv401.svelte-wxv401,.box-15.svelte-wxv401.svelte-wxv401{--start:7;--tab:22;--char:6}.box-16.svelte-wxv401.svelte-wxv401{--start:8;--tab:14.6;--char:4}.box-17.svelte-wxv401.svelte-wxv401,.box-18.svelte-wxv401.svelte-wxv401,.box-19.svelte-wxv401.svelte-wxv401{--start:10;--tab:3.5;--char:13.3}.box-20.svelte-wxv401.svelte-wxv401,.box-21.svelte-wxv401.svelte-wxv401{--start:14;--tab:6.3;--char:17.3}.box-22.svelte-wxv401.svelte-wxv401,.box-23.svelte-wxv401.svelte-wxv401,.box-24.svelte-wxv401.svelte-wxv401,.box-25.svelte-wxv401.svelte-wxv401{--start:16;--tab:0;--char:21.5}.box-26.svelte-wxv401.svelte-wxv401,.box-27.svelte-wxv401.svelte-wxv401{--start:17;--tab:17.6;--char:5}.box-28.svelte-wxv401.svelte-wxv401{--start:17;--tab:34;--char:5}";
	append(document.head, style);
}

// (48:4) {#if i >= 4}
function create_if_block_11$1(ctx) {
	let li;
	let span;
	let span_intro;
	let if_block0_anchor;
	let if_block0 = /*i*/ ctx[0] >= 11 && create_if_block_13();
	let if_block1 = /*i*/ ctx[0] >= 21 && create_if_block_12$1();

	return {
		c() {
			li = element("li");
			span = element("span");
			span.textContent = "count";
			if (if_block0) if_block0.c();
			if_block0_anchor = empty();
			if (if_block1) if_block1.c();
			attr(span, "class", "svelte-wxv401");
			toggle_class(span, "relative", /*i*/ ctx[0] > 4);
		},
		m(target, anchor) {
			insert(target, li, anchor);
			append(li, span);
			if (if_block0) if_block0.m(li, null);
			append(li, if_block0_anchor);
			if (if_block1) if_block1.m(li, null);
		},
		p(ctx, dirty) {
			if (dirty & /*i*/ 1) {
				toggle_class(span, "relative", /*i*/ ctx[0] > 4);
			}

			if (/*i*/ ctx[0] >= 11) {
				if (if_block0) ; else {
					if_block0 = create_if_block_13();
					if_block0.c();
					if_block0.m(li, if_block0_anchor);
				}
			} else if (if_block0) {
				if_block0.d(1);
				if_block0 = null;
			}

			if (/*i*/ ctx[0] >= 21) {
				if (if_block1) ; else {
					if_block1 = create_if_block_12$1();
					if_block1.c();
					if_block1.m(li, null);
				}
			} else if (if_block1) {
				if_block1.d(1);
				if_block1 = null;
			}
		},
		i(local) {
			if (!span_intro) {
				add_render_callback(() => {
					span_intro = create_in_transition(span, fly, {
						x: -610,
						y: -329,
						duration: 800,
						easing: cubicInOut,
						opacity: 1
					});

					span_intro.start();
				});
			}
		},
		o: noop,
		d(detaching) {
			if (detaching) detach(li);
			if (if_block0) if_block0.d();
			if (if_block1) if_block1.d();
		}
	};
}

// (48:138) {#if i>=11}
function create_if_block_13(ctx) {
	let span;

	return {
		c() {
			span = element("span");
			span.textContent = "referenced (script)";
			attr(span, "class", "var-prop var-referenced-script svelte-wxv401");
		},
		m(target, anchor) {
			insert(target, span, anchor);
		},
		d(detaching) {
			if (detaching) detach(span);
		}
	};
}

// (48:225) {#if i>=21}
function create_if_block_12$1(ctx) {
	let span0;
	let span1;

	return {
		c() {
			span0 = element("span");
			span0.textContent = "referenced (template)";
			span1 = element("span");
			span1.textContent = "mutated";
			attr(span0, "class", "var-prop var-referenced-template svelte-wxv401");
			attr(span1, "class", "var-prop var-mutated svelte-wxv401");
		},
		m(target, anchor) {
			insert(target, span0, anchor);
			insert(target, span1, anchor);
		},
		d(detaching) {
			if (detaching) detach(span0);
			if (detaching) detach(span1);
		}
	};
}

// (49:4) {#if i >= 6}
function create_if_block_8$2(ctx) {
	let li;
	let span;
	let span_intro;
	let if_block0_anchor;
	let if_block0 = /*i*/ ctx[0] >= 18 && create_if_block_10$2();
	let if_block1 = /*i*/ ctx[0] >= 25 && create_if_block_9$2();

	return {
		c() {
			li = element("li");
			span = element("span");
			span.textContent = "values";
			if (if_block0) if_block0.c();
			if_block0_anchor = empty();
			if (if_block1) if_block1.c();
			attr(span, "class", "svelte-wxv401");
			toggle_class(span, "relative", /*i*/ ctx[0] > 6);
		},
		m(target, anchor) {
			insert(target, li, anchor);
			append(li, span);
			if (if_block0) if_block0.m(li, null);
			append(li, if_block0_anchor);
			if (if_block1) if_block1.m(li, null);
		},
		p(ctx, dirty) {
			if (dirty & /*i*/ 1) {
				toggle_class(span, "relative", /*i*/ ctx[0] > 6);
			}

			if (/*i*/ ctx[0] >= 18) {
				if (if_block0) ; else {
					if_block0 = create_if_block_10$2();
					if_block0.c();
					if_block0.m(li, if_block0_anchor);
				}
			} else if (if_block0) {
				if_block0.d(1);
				if_block0 = null;
			}

			if (/*i*/ ctx[0] >= 25) {
				if (if_block1) ; else {
					if_block1 = create_if_block_9$2();
					if_block1.c();
					if_block1.m(li, null);
				}
			} else if (if_block1) {
				if_block1.d(1);
				if_block1 = null;
			}
		},
		i(local) {
			if (!span_intro) {
				add_render_callback(() => {
					span_intro = create_in_transition(span, fly, {
						x: -610,
						y: -335,
						duration: 800,
						easing: cubicInOut,
						opacity: 1
					});

					span_intro.start();
				});
			}
		},
		o: noop,
		d(detaching) {
			if (detaching) detach(li);
			if (if_block0) if_block0.d();
			if (if_block1) if_block1.d();
		}
	};
}

// (49:139) {#if i>=18}
function create_if_block_10$2(ctx) {
	let span;

	return {
		c() {
			span = element("span");
			span.textContent = "mutated";
			attr(span, "class", "var-prop var-mutated svelte-wxv401");
		},
		m(target, anchor) {
			insert(target, span, anchor);
		},
		d(detaching) {
			if (detaching) detach(span);
		}
	};
}

// (49:204) {#if i>=25}
function create_if_block_9$2(ctx) {
	let span;

	return {
		c() {
			span = element("span");
			span.textContent = "referenced (template)";
			attr(span, "class", "var-prop var-referenced-template svelte-wxv401");
		},
		m(target, anchor) {
			insert(target, span, anchor);
		},
		d(detaching) {
			if (detaching) detach(span);
		}
	};
}

// (50:4) {#if i >= 8}
function create_if_block_5$3(ctx) {
	let li;
	let span;
	let span_intro;
	let if_block0_anchor;
	let if_block0 = /*i*/ ctx[0] >= 9 && create_if_block_7$2();
	let if_block1 = /*i*/ ctx[0] >= 15 && create_if_block_6$3();

	return {
		c() {
			li = element("li");
			span = element("span");
			span.textContent = "double";
			if (if_block0) if_block0.c();
			if_block0_anchor = empty();
			if (if_block1) if_block1.c();
			attr(span, "class", "svelte-wxv401");
			toggle_class(span, "relative", /*i*/ ctx[0] > 8);
		},
		m(target, anchor) {
			insert(target, li, anchor);
			append(li, span);
			if (if_block0) if_block0.m(li, null);
			append(li, if_block0_anchor);
			if (if_block1) if_block1.m(li, null);
		},
		p(ctx, dirty) {
			if (dirty & /*i*/ 1) {
				toggle_class(span, "relative", /*i*/ ctx[0] > 8);
			}

			if (/*i*/ ctx[0] >= 9) {
				if (if_block0) ; else {
					if_block0 = create_if_block_7$2();
					if_block0.c();
					if_block0.m(li, if_block0_anchor);
				}
			} else if (if_block0) {
				if_block0.d(1);
				if_block0 = null;
			}

			if (/*i*/ ctx[0] >= 15) {
				if (if_block1) ; else {
					if_block1 = create_if_block_6$3();
					if_block1.c();
					if_block1.m(li, null);
				}
			} else if (if_block1) {
				if_block1.d(1);
				if_block1 = null;
			}
		},
		i(local) {
			if (!span_intro) {
				add_render_callback(() => {
					span_intro = create_in_transition(span, fly, {
						x: -620,
						y: -315,
						duration: 800,
						easing: cubicInOut,
						opacity: 1
					});

					span_intro.start();
				});
			}
		},
		o: noop,
		d(detaching) {
			if (detaching) detach(li);
			if (if_block0) if_block0.d();
			if (if_block1) if_block1.d();
		}
	};
}

// (50:140) {#if i>=9}
function create_if_block_7$2(ctx) {
	let span;

	return {
		c() {
			span = element("span");
			span.textContent = "injected";
			attr(span, "class", "var-prop var-injected svelte-wxv401");
		},
		m(target, anchor) {
			insert(target, span, anchor);
		},
		d(detaching) {
			if (detaching) detach(span);
		}
	};
}

// (50:206) {#if i>=15}
function create_if_block_6$3(ctx) {
	let span;

	return {
		c() {
			span = element("span");
			span.textContent = "referenced (script)";
			attr(span, "class", "var-prop var-referenced-script svelte-wxv401");
		},
		m(target, anchor) {
			insert(target, span, anchor);
		},
		d(detaching) {
			if (detaching) detach(span);
		}
	};
}

// (51:4) {#if i >= 11}
function create_if_block_3$5(ctx) {
	let svg;
	let defs;
	let marker;
	let path0;
	let path1;
	let if_block = /*i*/ ctx[0] >= 18 && create_if_block_4$4();

	return {
		c() {
			svg = svg_element("svg");
			defs = svg_element("defs");
			marker = svg_element("marker");
			path0 = svg_element("path");
			path1 = svg_element("path");
			if (if_block) if_block.c();
			attr(path0, "d", "M 0 0 L 10 5 L 0 10 z");
			attr(marker, "id", "arrowhead");
			attr(marker, "viewBox", "0 0 10 10");
			attr(marker, "refX", "3");
			attr(marker, "refY", "5");
			attr(marker, "markerWidth", "6");
			attr(marker, "markerHeight", "6");
			attr(marker, "orient", "auto");
			attr(path1, "d", "M9,0 C40,0 40,65 9,65");
			attr(path1, "marker-end", "url(#arrowhead)");
			set_style(svg, "position", "absolute");
			set_style(svg, "stroke-width", "2px");
			set_style(svg, "stroke", "black");
			set_style(svg, "fill", "none");
			set_style(svg, "top", "60px");
			set_style(svg, "left", "53px");
			set_style(svg, "transform", "scaleX(-1) translateX(105%)");
			attr(svg, "width", "45px");
			attr(svg, "height", "72px");
		},
		m(target, anchor) {
			insert(target, svg, anchor);
			append(svg, defs);
			append(defs, marker);
			append(marker, path0);
			append(svg, path1);
			if (if_block) if_block.m(svg, null);
		},
		p(ctx, dirty) {
			if (/*i*/ ctx[0] >= 18) {
				if (if_block) ; else {
					if_block = create_if_block_4$4();
					if_block.c();
					if_block.m(svg, null);
				}
			} else if (if_block) {
				if_block.d(1);
				if_block = null;
			}
		},
		d(detaching) {
			if (detaching) detach(svg);
			if (if_block) if_block.d();
		}
	};
}

// (59:8) {#if i >= 18}
function create_if_block_4$4(ctx) {
	let path;

	return {
		c() {
			path = svg_element("path");
			attr(path, "d", "M9,55 C20,55 20,35 9,35");
			attr(path, "marker-end", "url(#arrowhead)");
		},
		m(target, anchor) {
			insert(target, path, anchor);
		},
		d(detaching) {
			if (detaching) detach(path);
		}
	};
}

// (67:10) {#if i >= 24}
function create_if_block_2$b(ctx) {
	let span;
	let span_intro;

	return {
		c() {
			span = element("span");
			span.textContent = "values";
			attr(span, "class", "svelte-wxv401");
		},
		m(target, anchor) {
			insert(target, span, anchor);
		},
		i(local) {
			if (!span_intro) {
				add_render_callback(() => {
					span_intro = create_in_transition(span, fly, {
						x: -610,
						y: -101,
						duration: 800,
						easing: cubicInOut,
						opacity: 1
					});

					span_intro.start();
				});
			}
		},
		o: noop,
		d(detaching) {
			if (detaching) detach(span);
		}
	};
}

// (71:10) {#if i >= 24}
function create_if_block$j(ctx) {
	let span;
	let span_intro;
	let if_block_anchor;
	let if_block = /*i*/ ctx[0] >= 27 && create_if_block_1$d();

	return {
		c() {
			span = element("span");
			span.textContent = "value";
			if (if_block) if_block.c();
			if_block_anchor = empty();
			attr(span, "class", "svelte-wxv401");
			toggle_class(span, "relative", /*i*/ ctx[0] > 24);
		},
		m(target, anchor) {
			insert(target, span, anchor);
			if (if_block) if_block.m(target, anchor);
			insert(target, if_block_anchor, anchor);
		},
		p(ctx, dirty) {
			if (dirty & /*i*/ 1) {
				toggle_class(span, "relative", /*i*/ ctx[0] > 24);
			}

			if (/*i*/ ctx[0] >= 27) {
				if (if_block) ; else {
					if_block = create_if_block_1$d();
					if_block.c();
					if_block.m(if_block_anchor.parentNode, if_block_anchor);
				}
			} else if (if_block) {
				if_block.d(1);
				if_block = null;
			}
		},
		i(local) {
			if (!span_intro) {
				add_render_callback(() => {
					span_intro = create_in_transition(span, fly, {
						x: -487,
						y: -160,
						duration: 800,
						easing: cubicInOut,
						opacity: 1
					});

					span_intro.start();
				});
			}
		},
		o: noop,
		d(detaching) {
			if (detaching) detach(span);
			if (if_block) if_block.d(detaching);
			if (detaching) detach(if_block_anchor);
		}
	};
}

// (71:142) {#if i>=27}
function create_if_block_1$d(ctx) {
	let span;

	return {
		c() {
			span = element("span");
			span.textContent = "referenced (template)";
			attr(span, "class", "var-prop var-referenced-template svelte-wxv401");
		},
		m(target, anchor) {
			insert(target, span, anchor);
		},
		d(detaching) {
			if (detaching) detach(span);
		}
	};
}

function create_fragment$E(ctx) {
	let div2;
	let div0;
	let prism_action;
	let t0;
	let div1;
	let ol;
	let li0;
	let t2;
	let li1;
	let t4;
	let li2;
	let t6;
	let li4;
	let t7;
	let ul0;
	let li3;
	let t8;
	let span;
	let prism_action_1;
	let t9;
	let t10;
	let div8;
	let div3;
	let t12;
	let ul1;
	let t13;
	let t14;
	let t15;
	let t16;
	let div7;
	let div4;
	let prism_action_2;
	let t17;
	let div5;
	let t19;
	let ul2;
	let li5;
	let t20;
	let div6;
	let t22;
	let ul3;
	let li6;
	let t23;
	let div9;
	let div9_class_value;
	let mounted;
	let dispose;
	let if_block0 = /*i*/ ctx[0] >= 4 && create_if_block_11$1(ctx);
	let if_block1 = /*i*/ ctx[0] >= 6 && create_if_block_8$2(ctx);
	let if_block2 = /*i*/ ctx[0] >= 8 && create_if_block_5$3(ctx);
	let if_block3 = /*i*/ ctx[0] >= 11 && create_if_block_3$5(ctx);
	let if_block4 = /*i*/ ctx[0] >= 24 && create_if_block_2$b();
	let if_block5 = /*i*/ ctx[0] >= 24 && create_if_block$j(ctx);

	return {
		c() {
			div2 = element("div");
			div0 = element("div");
			t0 = space();
			div1 = element("div");
			ol = element("ol");
			li0 = element("li");
			li0.textContent = "Traverse the script";
			t2 = space();
			li1 = element("li");
			li1.textContent = "Traverse the template";
			t4 = space();
			li2 = element("li");
			li2.textContent = "Traverse the script again (for optimisation)";
			t6 = space();
			li4 = element("li");
			t7 = text("Traverse the style\n        ");
			ul0 = element("ul");
			li3 = element("li");
			t8 = text("Add ");
			span = element("span");
			t9 = text(" to selectors");
			t10 = space();
			div8 = element("div");
			div3 = element("div");
			div3.textContent = "Variables";
			t12 = space();
			ul1 = element("ul");
			if (if_block0) if_block0.c();
			t13 = space();
			if (if_block1) if_block1.c();
			t14 = space();
			if (if_block2) if_block2.c();
			t15 = space();
			if (if_block3) if_block3.c();
			t16 = space();
			div7 = element("div");
			div4 = element("div");
			t17 = space();
			div5 = element("div");
			div5.textContent = "Dependencies:";
			t19 = space();
			ul2 = element("ul");
			li5 = element("li");
			if (if_block4) if_block4.c();
			t20 = space();
			div6 = element("div");
			div6.textContent = "Variables";
			t22 = space();
			ul3 = element("ul");
			li6 = element("li");
			if (if_block5) if_block5.c();
			t23 = space();
			div9 = element("div");
			attr(div0, "class", "code svelte-wxv401");
			attr(li0, "class", "svelte-wxv401");
			toggle_class(li0, "hidden", /*i*/ ctx[0] < 1);
			attr(li1, "class", "svelte-wxv401");
			toggle_class(li1, "hidden", /*i*/ ctx[0] < 19);
			attr(li2, "class", "svelte-wxv401");
			toggle_class(li2, "hidden", /*i*/ ctx[0] < 29);
			attr(li3, "class", "svelte-wxv401");
			toggle_class(li3, "hidden", /*i*/ ctx[0] < 31);
			attr(li4, "class", "svelte-wxv401");
			toggle_class(li4, "hidden", /*i*/ ctx[0] < 30);
			attr(div2, "class", "container svelte-wxv401");
			attr(ul1, "class", "svelte-wxv401");
			attr(div5, "class", "title svelte-wxv401");
			attr(ul2, "class", "svelte-wxv401");
			attr(div6, "class", "title svelte-wxv401");
			attr(ul3, "class", "svelte-wxv401");
			attr(div7, "class", "scope svelte-wxv401");
			toggle_class(div7, "hidden", /*i*/ ctx[0] < 23);
			attr(div8, "class", "vars svelte-wxv401");
			toggle_class(div8, "hidden", /*i*/ ctx[0] < 3);
			attr(div9, "class", div9_class_value = "box box-" + /*i*/ ctx[0] + " svelte-wxv401");
			toggle_class(div9, "hidden", /*i*/ ctx[0] < 2 || /*i*/ ctx[0] === 19 || /*i*/ ctx[0] > 28);
		},
		m(target, anchor) {
			insert(target, div2, anchor);
			append(div2, div0);
			append(div2, t0);
			append(div2, div1);
			append(div1, ol);
			append(ol, li0);
			append(ol, t2);
			append(ol, li1);
			append(ol, t4);
			append(ol, li2);
			append(ol, t6);
			append(ol, li4);
			append(li4, t7);
			append(li4, ul0);
			append(ul0, li3);
			append(li3, t8);
			append(li3, span);
			append(li3, t9);
			insert(target, t10, anchor);
			insert(target, div8, anchor);
			append(div8, div3);
			append(div8, t12);
			append(div8, ul1);
			if (if_block0) if_block0.m(ul1, null);
			append(ul1, t13);
			if (if_block1) if_block1.m(ul1, null);
			append(ul1, t14);
			if (if_block2) if_block2.m(ul1, null);
			append(ul1, t15);
			if (if_block3) if_block3.m(ul1, null);
			append(div8, t16);
			append(div8, div7);
			append(div7, div4);
			append(div7, t17);
			append(div7, div5);
			append(div7, t19);
			append(div7, ul2);
			append(ul2, li5);
			if (if_block4) if_block4.m(li5, null);
			append(div7, t20);
			append(div7, div6);
			append(div7, t22);
			append(div7, ul3);
			append(ul3, li6);
			if (if_block5) if_block5.m(li6, null);
			insert(target, t23, anchor);
			insert(target, div9, anchor);

			if (!mounted) {
				dispose = [
					action_destroyer(prism_action = prism$1.call(null, div0, {
						code: /*i*/ ctx[0] < 32 ? code : code$1,
						lang: prism.languages.svelte
					})),
					action_destroyer(prism_action_1 = prism$1.call(null, span, {
						code: ".svelte-xxx",
						lang: prism.languages.css
					})),
					action_destroyer(prism_action_2 = prism$1.call(null, div4, {
						code: "{#each}",
						lang: prism.languages.svelte
					}))
				];

				mounted = true;
			}
		},
		p(ctx, [dirty]) {
			if (prism_action && is_function(prism_action.update) && dirty & /*i*/ 1) prism_action.update.call(null, {
				code: /*i*/ ctx[0] < 32 ? code : code$1,
				lang: prism.languages.svelte
			});

			if (dirty & /*i*/ 1) {
				toggle_class(li0, "hidden", /*i*/ ctx[0] < 1);
			}

			if (dirty & /*i*/ 1) {
				toggle_class(li1, "hidden", /*i*/ ctx[0] < 19);
			}

			if (dirty & /*i*/ 1) {
				toggle_class(li2, "hidden", /*i*/ ctx[0] < 29);
			}

			if (dirty & /*i*/ 1) {
				toggle_class(li3, "hidden", /*i*/ ctx[0] < 31);
			}

			if (dirty & /*i*/ 1) {
				toggle_class(li4, "hidden", /*i*/ ctx[0] < 30);
			}

			if (/*i*/ ctx[0] >= 4) {
				if (if_block0) {
					if_block0.p(ctx, dirty);

					if (dirty & /*i*/ 1) {
						transition_in(if_block0, 1);
					}
				} else {
					if_block0 = create_if_block_11$1(ctx);
					if_block0.c();
					transition_in(if_block0, 1);
					if_block0.m(ul1, t13);
				}
			} else if (if_block0) {
				if_block0.d(1);
				if_block0 = null;
			}

			if (/*i*/ ctx[0] >= 6) {
				if (if_block1) {
					if_block1.p(ctx, dirty);

					if (dirty & /*i*/ 1) {
						transition_in(if_block1, 1);
					}
				} else {
					if_block1 = create_if_block_8$2(ctx);
					if_block1.c();
					transition_in(if_block1, 1);
					if_block1.m(ul1, t14);
				}
			} else if (if_block1) {
				if_block1.d(1);
				if_block1 = null;
			}

			if (/*i*/ ctx[0] >= 8) {
				if (if_block2) {
					if_block2.p(ctx, dirty);

					if (dirty & /*i*/ 1) {
						transition_in(if_block2, 1);
					}
				} else {
					if_block2 = create_if_block_5$3(ctx);
					if_block2.c();
					transition_in(if_block2, 1);
					if_block2.m(ul1, t15);
				}
			} else if (if_block2) {
				if_block2.d(1);
				if_block2 = null;
			}

			if (/*i*/ ctx[0] >= 11) {
				if (if_block3) {
					if_block3.p(ctx, dirty);
				} else {
					if_block3 = create_if_block_3$5(ctx);
					if_block3.c();
					if_block3.m(ul1, null);
				}
			} else if (if_block3) {
				if_block3.d(1);
				if_block3 = null;
			}

			if (/*i*/ ctx[0] >= 24) {
				if (if_block4) {
					if (dirty & /*i*/ 1) {
						transition_in(if_block4, 1);
					}
				} else {
					if_block4 = create_if_block_2$b();
					if_block4.c();
					transition_in(if_block4, 1);
					if_block4.m(li5, null);
				}
			} else if (if_block4) {
				if_block4.d(1);
				if_block4 = null;
			}

			if (/*i*/ ctx[0] >= 24) {
				if (if_block5) {
					if_block5.p(ctx, dirty);

					if (dirty & /*i*/ 1) {
						transition_in(if_block5, 1);
					}
				} else {
					if_block5 = create_if_block$j(ctx);
					if_block5.c();
					transition_in(if_block5, 1);
					if_block5.m(li6, null);
				}
			} else if (if_block5) {
				if_block5.d(1);
				if_block5 = null;
			}

			if (dirty & /*i*/ 1) {
				toggle_class(div7, "hidden", /*i*/ ctx[0] < 23);
			}

			if (dirty & /*i*/ 1) {
				toggle_class(div8, "hidden", /*i*/ ctx[0] < 3);
			}

			if (dirty & /*i*/ 1 && div9_class_value !== (div9_class_value = "box box-" + /*i*/ ctx[0] + " svelte-wxv401")) {
				attr(div9, "class", div9_class_value);
			}

			if (dirty & /*i, i*/ 1) {
				toggle_class(div9, "hidden", /*i*/ ctx[0] < 2 || /*i*/ ctx[0] === 19 || /*i*/ ctx[0] > 28);
			}
		},
		i(local) {
			transition_in(if_block0);
			transition_in(if_block1);
			transition_in(if_block2);
			transition_in(if_block4);
			transition_in(if_block5);
		},
		o: noop,
		d(detaching) {
			if (detaching) detach(div2);
			if (detaching) detach(t10);
			if (detaching) detach(div8);
			if (if_block0) if_block0.d();
			if (if_block1) if_block1.d();
			if (if_block2) if_block2.d();
			if (if_block3) if_block3.d();
			if (if_block4) if_block4.d();
			if (if_block5) if_block5.d();
			if (detaching) detach(t23);
			if (detaching) detach(div9);
			mounted = false;
			run_all(dispose);
		}
	};
}

function instance$z($$self, $$props, $$invalidate) {
	let i = 0;

	function next() {
		if (i < 32) {
			$$invalidate(0, i++, i);
			return true;
		}

		return false;
	}

	function prev() {
		if (i > 0) {
			$$invalidate(0, i--, i);
			return true;
		}

		return false;
	}

	return [i, next, prev];
}

class Slides14 extends SvelteComponent {
	constructor(options) {
		super();
		if (!document.getElementById("svelte-wxv401-style")) add_css$x();
		init(this, options, instance$z, create_fragment$E, safe_not_equal, { next: 1, prev: 2 });
	}

	get next() {
		return this.$$.ctx[1];
	}

	get prev() {
		return this.$$.ctx[2];
	}
}

/* @@slides15.svelte generated by Svelte v3.24.0 */

function add_css$y() {
	var style = element("style");
	style.id = "svelte-vd3fee-style";
	style.textContent = "h1.svelte-vd3fee{display:grid;height:100%;place-items:center;margin:0}";
	append(document.head, style);
}

function create_fragment$F(ctx) {
	let h1;

	return {
		c() {
			h1 = element("h1");
			h1.textContent = "3. Rendering";
			attr(h1, "class", "svelte-vd3fee");
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

class Slides15 extends SvelteComponent {
	constructor(options) {
		super();
		if (!document.getElementById("svelte-vd3fee-style")) add_css$y();
		init(this, options, null, create_fragment$F, safe_not_equal, {});
	}
}

/* @@slides16.svelte generated by Svelte v3.24.0 */

function add_css$z() {
	var style = element("style");
	style.id = "svelte-m3cyta-style";
	style.textContent = "div.svelte-m3cyta{display:flex;flex-direction:column;align-items:center;height:100%;justify-content:center}";
	append(document.head, style);
}

function create_fragment$G(ctx) {
	let div;

	return {
		c() {
			div = element("div");

			div.innerHTML = `<h2>2 different targets:</h2> 
<ul><li>generate: dom</li> 
<li>generate: ssr</li></ul>`;

			attr(div, "class", "svelte-m3cyta");
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

class Slides16 extends SvelteComponent {
	constructor(options) {
		super();
		if (!document.getElementById("svelte-m3cyta-style")) add_css$z();
		init(this, options, null, create_fragment$G, safe_not_equal, {});
	}
}

/* @@slides17.svelte generated by Svelte v3.24.0 */

function add_css$A() {
	var style = element("style");
	style.id = "svelte-vd3fee-style";
	style.textContent = "h1.svelte-vd3fee{display:grid;height:100%;place-items:center;margin:0}";
	append(document.head, style);
}

function create_fragment$H(ctx) {
	let h1;

	return {
		c() {
			h1 = element("h1");
			h1.textContent = "3.1. generate: dom";
			attr(h1, "class", "svelte-vd3fee");
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

class Slides17 extends SvelteComponent {
	constructor(options) {
		super();
		if (!document.getElementById("svelte-vd3fee-style")) add_css$A();
		init(this, options, null, create_fragment$H, safe_not_equal, {});
	}
}

var app1$1 = "function create_fragment(ctx) {\n  return {\n    c() {},\n    m() {},\n    p() {},\n    d() {},\n  };\n}\n\nfunction instance($$self, $$props, $$invalidate) {\n  \n}\n\nclass App extends SvelteComponent {\n  constructor(options) {\n    super();\n    init(this, options, instance, create_fragment, safe_not_equal, {});\n  }\n}\n\nexport default App;\n";

var app2$1 = "function create_fragment(ctx) {\n  let input;\n\n  return {\n    c() {\n      input = element(\"input\");\n    },\n    m() {},\n    p() {},\n    d() {},\n  };\n}\n\nfunction instance($$self, $$props, $$invalidate) {\n  \n}\n\nclass App extends SvelteComponent {\n  constructor(options) {\n    super();\n    init(this, options, instance, create_fragment, safe_not_equal, {});\n  }\n}\n\nexport default App;\n";

var app3$1 = "function create_fragment(ctx) {\n  let input;\n\n  return {\n    c() {\n      input = element(\"input\");\n    },\n    m(target, anchor) {\n      insert(target, input, anchor);\n    },\n    p() {},\n    d() {},\n  };\n}\n\nfunction instance($$self, $$props, $$invalidate) {\n  \n}\n\nclass App extends SvelteComponent {\n  constructor(options) {\n    super();\n    init(this, options, instance, create_fragment, safe_not_equal, {});\n  }\n}\n\nexport default App;\n";

var app4$1 = "function create_fragment(ctx) {\n  let input;\n\n  return {\n    c() {\n      input = element(\"input\");\n    },\n    m(target, anchor) {\n      insert(target, input, anchor);\n    },\n    p() {},\n    d(detaching) {\n      if (detaching) detach(input);\n    },\n  };\n}\n\nfunction instance($$self, $$props, $$invalidate) {\n  \n}\n\nclass App extends SvelteComponent {\n  constructor(options) {\n    super();\n    init(this, options, instance, create_fragment, safe_not_equal, {});\n  }\n}\n\nexport default App;\n";

var app5$1 = "function create_fragment(ctx) {\n  let input;\n\n  return {\n    c() {\n      input = element(\"input\");\n    },\n    m(target, anchor) {\n      insert(target, input, anchor);\n      set_input_value(input, ctx.count);\n    },\n    p() {},\n    d(detaching) {\n      if (detaching) detach(input);\n    },\n  };\n}\n\nfunction instance($$self, $$props, $$invalidate) {\n  \n}\n\nclass App extends SvelteComponent {\n  constructor(options) {\n    super();\n    init(this, options, instance, create_fragment, safe_not_equal, {});\n  }\n}\n\nexport default App;\n";

var app6$1 = "function create_fragment(ctx) {\n  let input, dispose;\n\n  return {\n    c() {\n      input = element(\"input\");\n    },\n    m(target, anchor) {\n      insert(target, input, anchor);\n      set_input_value(input, ctx.count);\n\n      dispose = listen(input, \"input\", ctx.input_handler);\n    },\n    p() {},\n    d(detaching) {\n      if (detaching) detach(input);\n    },\n  };\n}\n\nfunction instance($$self, $$props, $$invalidate) {\n  \n}\n\nclass App extends SvelteComponent {\n  constructor(options) {\n    super();\n    init(this, options, instance, create_fragment, safe_not_equal, {});\n  }\n}\n\nexport default App;\n";

var app7$1 = "function create_fragment(ctx) {\n  let input, dispose;\n\n  return {\n    c() {\n      input = element(\"input\");\n    },\n    m(target, anchor) {\n      insert(target, input, anchor);\n      set_input_value(input, ctx.count);\n\n      dispose = listen(input, \"input\", ctx.input_handler);\n    },\n    p() {},\n    d(detaching) {\n      if (detaching) detach(input);\n      dispose();\n    },\n  };\n}\n\nfunction instance($$self, $$props, $$invalidate) {\n  \n}\n\nclass App extends SvelteComponent {\n  constructor(options) {\n    super();\n    init(this, options, instance, create_fragment, safe_not_equal, {});\n  }\n}\n\nexport default App;\n";

var app8$1 = "function create_fragment(ctx) {\n  let input, dispose;\n\n  return {\n    c() {\n      input = element(\"input\");\n    },\n    m(target, anchor) {\n      insert(target, input, anchor);\n      set_input_value(input, ctx.count);\n\n      dispose = listen(input, \"input\", ctx.input_handler);\n    },\n    p(ctx, dirty) {\n      if ('count' in dirty && input.value !== ctx.count) {\n        set_input_value(input, ctx.count);\n      }\n    },\n    d(detaching) {\n      if (detaching) detach(input);\n      dispose();\n    },\n  };\n}\n\nfunction instance($$self, $$props, $$invalidate) {\n  \n}\n\nclass App extends SvelteComponent {\n  constructor(options) {\n    super();\n    init(this, options, instance, create_fragment, safe_not_equal, {});\n  }\n}\n\nexport default App;\n";

var app9$1 = "function create_each_block(ctx) {\n  return {\n    c() {},\n    m() {},\n    p() {},\n    d() {},\n  };\n}\n\nfunction create_fragment(ctx) {\n  let input, dispose;\n\n  return {\n    c() {\n      input = element(\"input\");\n    },\n    m(target, anchor) {\n      insert(target, input, anchor);\n      set_input_value(input, ctx.count);\n\n      dispose = listen(input, \"input\", ctx.input_handler);\n    },\n    p(ctx, dirty) {\n      if ('count' in dirty && input.value !== ctx.count) {\n        set_input_value(input, ctx.count);\n      }\n    },\n    d(detaching) {\n      if (detaching) detach(input);\n      dispose();\n    },\n  };\n}\n\nfunction instance($$self, $$props, $$invalidate) {\n  \n}\n\nclass App extends SvelteComponent {\n  constructor(options) {\n    super();\n    init(this, options, instance, create_fragment, safe_not_equal, {});\n  }\n}\n\nexport default App;\n";

var app10$1 = "function get_each_context(ctx, i) {\n  return {\n    ...ctx,\n    value: ctx.values[i],\n  }\n}\n\nfunction create_each_block(ctx) {\n  return {\n    c() {},\n    m() {},\n    p() {},\n    d() {},\n  };\n}\n\nfunction create_fragment(ctx) {\n  let input, dispose;\n\n  return {\n    c() {\n      input = element(\"input\");\n      create_each_blocks(ctx.values, create_each_block, get_each_context);\n    },\n    m(target, anchor) {\n      insert(target, input, anchor);\n      set_input_value(input, ctx.count);\n\n      dispose = listen(input, \"input\", ctx.input_handler);\n    },\n    p(ctx, dirty) {\n      if ('count' in dirty && input.value !== ctx.count) {\n        set_input_value(input, ctx.count);\n      }\n    },\n    d(detaching) {\n      if (detaching) detach(input);\n      dispose();\n    },\n  };\n}\n\nfunction instance($$self, $$props, $$invalidate) {\n  \n}\n\nclass App extends SvelteComponent {\n  constructor(options) {\n    super();\n    init(this, options, instance, create_fragment, safe_not_equal, {});\n  }\n}\n\nexport default App;\n";

var app11$1 = "function get_each_context(ctx, i) {\n  return {\n    ...ctx,\n    value: ctx.values[i],\n  }\n}\n\nfunction create_each_block(ctx) {\n  let div;\n  return {\n    c() {\n      div = element('div');\n      attr(div, 'class', 'svelte-xyz');\n      toggle_class(div, 'even', ctx.value % 2 === 0);\n    },\n    m(target, anchor) {\n      insert(target, div, anchor);\n    },\n    p(ctx, dirty) {\n      if ('values' in dirty && t_value !== (t_value = ctx.value + '')) set_data(t, t_value);\n\n      if ('values' in dirty) {\n        toggle_class(div, 'even', ctx.value % 2 === 0);\n      }\n    },\n    d(detaching) {\n      if (detaching) detach(div);\n    },\n  };\n}\n\nfunction create_fragment(ctx) {\n  let input, dispose;\n\n  return {\n    c() {\n      input = element('input');\n      create_each_blocks(ctx.values, create_each_block, get_each_context);\n    },\n    m(target, anchor) {\n      insert(target, input, anchor);\n      set_input_value(input, ctx.count);\n\n      dispose = listen(input, 'input', ctx.input_handler);\n    },\n    p(ctx, dirty) {\n      if ('count' in dirty && input.value !== ctx.count) {\n        set_input_value(input, ctx.count);\n      }\n    },\n    d(detaching) {\n      if (detaching) detach(input);\n      dispose();\n    },\n  };\n}\n\nfunction instance($$self, $$props, $$invalidate) {}\n\nclass App extends SvelteComponent {\n  constructor(options) {\n    super();\n    init(this, options, instance, create_fragment, safe_not_equal, {});\n  }\n}\n\nexport default App;\n";

var app12$1 = "function get_each_context(ctx, i) { /* ... */ }\nfunction create_each_block(ctx) { /* ... */ }\nfunction create_fragment(ctx) { /* ... */ }\n\nfunction instance($$self, $$props, $$invalidate) {\n  \n}\n\nclass App extends SvelteComponent {\n  constructor(options) {\n    super();\n    init(this, options, instance, create_fragment, safe_not_equal, {});\n  }\n}\n\nexport default App;\n";

var app13 = "function get_each_context(ctx, i) { /* ... */ }\nfunction create_each_block(ctx) { /* ... */ }\nfunction create_fragment(ctx) { /* ... */ }\n\nfunction instance($$self, $$props, $$invalidate) {\n  let count = 5;\n  let values;\n}\n\nclass App extends SvelteComponent {\n  constructor(options) {\n    super();\n    init(this, options, instance, create_fragment, safe_not_equal, {});\n  }\n}\n\nexport default App;\n";

var app14 = "function get_each_context(ctx, i) { /* ... */ }\nfunction create_each_block(ctx) { /* ... */ }\nfunction create_fragment(ctx) { /* ... */ }\n\nfunction instance($$self, $$props, $$invalidate) {\n  let count = 5;\n  let values;\n\n  $$self.$$.update = () => {\n    if ('count' in $$self.$$.dirty) {\n      $: double = count * 2;\n    }\n\n    if ('double' in $$self.$$.dirty) {\n      $: {\n        const data = [];\n\n        for (let i = 0; i < double; i++) {\n          data[i] = Math.floor(Math.random() * 10);\n        }\n\n        values = data;\n      }\n    }\n  };\n}\n\nclass App extends SvelteComponent {\n  constructor(options) {\n    super();\n    init(this, options, instance, create_fragment, safe_not_equal, {});\n  }\n}\n\nexport default App;\n";

var app15 = "function get_each_context(ctx, i) { /* ... */ }\nfunction create_each_block(ctx) { /* ... */ }\nfunction create_fragment(ctx) { /* ... */ }\n\nfunction instance($$self, $$props, $$invalidate) {\n  let count = 5;\n  let values;\n\n  function input_input_handler() {\n    count = this.value;\n  }\n\n  $$self.$$.update = () => {\n    if ('count' in $$self.$$.dirty) {\n      $: double = count * 2;\n    }\n\n    if ('double' in $$self.$$.dirty) {\n      $: {\n        const data = [];\n\n        for (let i = 0; i < double; i++) {\n          data[i] = Math.floor(Math.random() * 10);\n        }\n\n        values = data;\n      }\n    }\n  };\n}\n\nclass App extends SvelteComponent {\n  constructor(options) {\n    super();\n    init(this, options, instance, create_fragment, safe_not_equal, {});\n  }\n}\n\nexport default App;\n";

var app16 = "function get_each_context(ctx, i) { /* ... */ }\nfunction create_each_block(ctx) { /* ... */ }\nfunction create_fragment(ctx) { /* ... */ }\n\nfunction instance($$self, $$props, $$invalidate) {\n  let count = 5;\n  let values;\n\n  function input_input_handler() {\n    count = this.value;\n  }\n\n  $$self.$$.update = () => { /* */ };\n\n  return { count, values, input_handler };\n}\n\nclass App extends SvelteComponent {\n  constructor(options) {\n    super();\n    init(this, options, instance, create_fragment, safe_not_equal, {});\n  }\n}\n\nexport default App;\n";

var app17 = "function get_each_context(ctx, i) { /* ... */ }\nfunction create_each_block(ctx) { /* ... */ }\nfunction create_fragment(ctx) { /* ... */ }\n\nfunction instance($$self, $$props, $$invalidate) {\n  let count = 5;\n  let values;\n\n  function input_input_handler() {\n    count = this.value;\n    $$invalidate('count', count);\n  }\n\n  $$self.$$.update = () => { /* */ };\n\n  return { count, values, input_handler };\n}\n\nclass App extends SvelteComponent {\n  constructor(options) {\n    super();\n    init(this, options, instance, create_fragment, safe_not_equal, {});\n  }\n}\n\nexport default App;\n";

var app18 = "function get_each_context(ctx, i) { /* ... */ }\nfunction create_each_block(ctx) { /* ... */ }\nfunction create_fragment(ctx) { /* ... */ }\n\nfunction instance($$self, $$props, $$invalidate) {\n  let count = 5;\n  let values;\n\n  function input_input_handler() {\n    count = this.value;\n    $$invalidate('count', count);\n  }\n\n  $$self.$$.update = () => {\n    if ('count' in $$self.$$.dirty) {\n      $: double = count * 2;\n      $$invalidate('double', double);\n    }\n\n    if ('double' in $$self.$$.dirty) {\n      $: {\n        const data = [];\n\n        for (let i = 0; i < double; i++) {\n          data[i] = Math.floor(Math.random() * 10);\n        }\n\n        values = data;\n      }\n    }\n  };\n\n  return { count, values, input_handler };\n}\n\nclass App extends SvelteComponent {\n  constructor(options) {\n    super();\n    init(this, options, instance, create_fragment, safe_not_equal, {});\n  }\n}\n\nexport default App;\n";

var app19 = "function get_each_context(ctx, i) { /* ... */ }\nfunction create_each_block(ctx) { /* ... */ }\nfunction create_fragment(ctx) { /* ... */ }\n\nfunction instance($$self, $$props, $$invalidate) {\n  let count = 5;\n  let values;\n\n  function input_input_handler() {\n    count = this.value;\n    $$invalidate('count', count);\n  }\n\n  $$self.$$.update = () => {\n    if ('count' in $$self.$$.dirty) {\n      $: double = count * 2;\n      $$invalidate('double', double);\n    }\n\n    if ('double' in $$self.$$.dirty) {\n      $: {\n        const data = [];\n\n        for (let i = 0; i < double; i++) {\n          data[i] = Math.floor(Math.random() * 10);\n        }\n\n        values = data;\n        $$invalidate('values', values);\n      }\n    }\n  };\n\n  return { count, values, input_handler };\n}\n\nclass App extends SvelteComponent {\n  constructor(options) {\n    super();\n    init(this, options, instance, create_fragment, safe_not_equal, {});\n  }\n}\n\nexport default App;\n";

/* @@slides18.svelte generated by Svelte v3.24.0 */

function add_css$B() {
	var style = element("style");
	style.id = "svelte-nkk9cm-style";
	style.textContent = ".tab{width:2ch;display:inline-block}.code.svelte-nkk9cm.svelte-nkk9cm{font-family:\"Consolas\", \"Bitstream Vera Sans Mono\", \"Courier New\", Courier, monospace;font-size:22px}.source.svelte-nkk9cm.svelte-nkk9cm{background:#efefef}.output.svelte-nkk9cm.svelte-nkk9cm{overflow:scroll;height:calc(100vh - 32px);position:relative}.container.svelte-nkk9cm.svelte-nkk9cm{display:grid;grid-template-columns:1fr 1fr;grid-gap:16px;overflow:hidden;height:calc(100vh - 32px)}.hidden.svelte-nkk9cm.svelte-nkk9cm{opacity:0}.vars.hidden.svelte-nkk9cm.svelte-nkk9cm{transform:translateX(300px)}.vars.svelte-nkk9cm.svelte-nkk9cm{z-index:20;background:white;position:absolute;right:64px;bottom:64px;width:520px;font-size:20px;border:1px solid #888;border-radius:12px;padding:16px 32px;box-shadow:8px 8px 10px #ddd;transition:200ms ease-in}.vars.left.svelte-nkk9cm.svelte-nkk9cm{transform:translateX(-570px)}.vars.svelte-nkk9cm ul.svelte-nkk9cm{margin:0}.var-prop.svelte-nkk9cm.svelte-nkk9cm{color:white;padding:3px 8px;font-size:0.8em;margin-left:4px;border-radius:8px;white-space:nowrap}.var-injected.svelte-nkk9cm.svelte-nkk9cm{background:rebeccapurple}.var-referenced-script.svelte-nkk9cm.svelte-nkk9cm{background:orange}.var-mutated.svelte-nkk9cm.svelte-nkk9cm{background:cadetblue}.var-referenced-template.svelte-nkk9cm.svelte-nkk9cm{background:crimson}.scope.svelte-nkk9cm.svelte-nkk9cm{padding:8px 16px;border:1px solid #aaa;margin-top:8px;font-size:0.9em}.scope.svelte-nkk9cm .title.svelte-nkk9cm{margin-top:6px}.box.svelte-nkk9cm.svelte-nkk9cm{border:1px solid red;position:absolute;z-index:10;pointer-events:none;--line-height:26px;top:calc(14px + var(--start, 0) * var(--line-height));height:calc(var(--line) * var(--line-height));margin-left:14px;left:calc(var(--tab) * 1ch);width:calc(var(--char, 27) * 1ch)}.box.blue.svelte-nkk9cm.svelte-nkk9cm{border-color:blue;margin-left:-18px;top:calc(var(--start, 0) * var(--line-height))}.blue.box-2.svelte-nkk9cm.svelte-nkk9cm{--char:31;--line:8;margin-left:0}.blue.box-3.svelte-nkk9cm.svelte-nkk9cm{--start:9;--line:3;--char:47;margin-left:0}.blue.box-4.svelte-nkk9cm.svelte-nkk9cm{--start:13;--line:7;--char:47;margin-left:0}.blue.box-7.svelte-nkk9cm.svelte-nkk9cm{--start:5;--tab:6.5;--line:1;--char:24}.blue.box-8.svelte-nkk9cm.svelte-nkk9cm{--start:8;--tab:6.5;--line:1;--char:29}.blue.box-9.svelte-nkk9cm.svelte-nkk9cm{--start:12;--tab:6.5;--line:1;--char:28}.red.box-6.svelte-nkk9cm.svelte-nkk9cm,.red.box-7.svelte-nkk9cm.svelte-nkk9cm,.red.box-8.svelte-nkk9cm.svelte-nkk9cm,.red.box-9.svelte-nkk9cm.svelte-nkk9cm{--start:14;--line:1;--tab:0}.red.box-10.svelte-nkk9cm.svelte-nkk9cm,.red.box-11.svelte-nkk9cm.svelte-nkk9cm,.red.box-12.svelte-nkk9cm.svelte-nkk9cm,.red.box-13.svelte-nkk9cm.svelte-nkk9cm,.red.box-14.svelte-nkk9cm.svelte-nkk9cm,.red.box-15.svelte-nkk9cm.svelte-nkk9cm,.red.box-16.svelte-nkk9cm.svelte-nkk9cm,.red.box-17.svelte-nkk9cm.svelte-nkk9cm{--start:14;--tab:6.5;--line:1;--char:17}.blue.box-14.svelte-nkk9cm.svelte-nkk9cm{--line:1;--start:9;--tab:6.5;--char:32}.blue.box-15.svelte-nkk9cm.svelte-nkk9cm{--line:2;--start:11;--tab:1;--char:38}.blue.box-16.svelte-nkk9cm.svelte-nkk9cm{--line:1;--start:17;--tab:6.5;--char:11}.blue.box-17.svelte-nkk9cm.svelte-nkk9cm{--line:4;--start:15;--tab:1.5;--char:42}.red.box-18.svelte-nkk9cm.svelte-nkk9cm,.red.box-19.svelte-nkk9cm.svelte-nkk9cm,.red.box-20.svelte-nkk9cm.svelte-nkk9cm,.red.box-21.svelte-nkk9cm.svelte-nkk9cm,.red.box-22.svelte-nkk9cm.svelte-nkk9cm,.red.box-23.svelte-nkk9cm.svelte-nkk9cm{--line:4;--start:16;--tab:0;--char:47}.blue.box-19.svelte-nkk9cm.svelte-nkk9cm{--start:0;--line:8;--char:31;margin-left:0}.blue.box-20.svelte-nkk9cm.svelte-nkk9cm,.blue.box-21.svelte-nkk9cm.svelte-nkk9cm{--start:0;--line:6;--char:33;margin-left:0}.blue.box-25.svelte-nkk9cm.svelte-nkk9cm{--start:5;--line:2;--tab:3;--char:14}.red.box-25.svelte-nkk9cm.svelte-nkk9cm{--line:2;--start:1;--char:14}.blue.box-26.svelte-nkk9cm.svelte-nkk9cm,.blue.box-27.svelte-nkk9cm.svelte-nkk9cm{--start:8;--line:18;--tab:3;--char:43}.red.box-26.svelte-nkk9cm.svelte-nkk9cm,.red.box-27.svelte-nkk9cm.svelte-nkk9cm{--line:8;--start:4;--char:43}.blue.box-28.svelte-nkk9cm.svelte-nkk9cm{--start:8;--char:31;--tab:3;--line:3}.blue.box-29.svelte-nkk9cm.svelte-nkk9cm{--start:14;--tab:3;--char:38;--line:1}.blue.box-31.svelte-nkk9cm.svelte-nkk9cm{--start:10;--line:1;--char:28;--tab:5}.blue.box-32.svelte-nkk9cm.svelte-nkk9cm{--start:16;--line:1;--char:29;--tab:7}.blue.box-33.svelte-nkk9cm.svelte-nkk9cm{--start:29;--line:1;--char:30;--tab:8.4}";
	append(document.head, style);
}

// (104:4) {#if i >= 12}
function create_if_block$k(ctx) {
	let li;

	return {
		c() {
			li = element("li");
			li.innerHTML = `<span>input_handler</span><span class="var-prop var-injected svelte-nkk9cm">injected</span><span class="var-prop var-referenced-template svelte-nkk9cm">referenced (template)</span>`;
		},
		m(target, anchor) {
			insert(target, li, anchor);
		},
		d(detaching) {
			if (detaching) detach(li);
		}
	};
}

function create_fragment$I(ctx) {
	let div4;
	let div0;
	let prism_action;
	let t0;
	let div3;
	let div1;
	let prism_action_1;
	let t1;
	let div2;
	let div2_class_value;
	let t2;
	let div5;
	let div5_class_value;
	let t3;
	let div11;
	let div6;
	let t5;
	let ul0;
	let li0;
	let t10;
	let li1;
	let t14;
	let li2;
	let t18;
	let t19;
	let svg;
	let defs;
	let marker;
	let path0;
	let path1;
	let path2;
	let t20;
	let div10;
	let div7;
	let prism_action_2;
	let t21;
	let div8;
	let t23;
	let ul1;
	let t25;
	let div9;
	let t27;
	let ul2;
	let mounted;
	let dispose;
	let if_block = /*i*/ ctx[0] >= 12 && create_if_block$k();

	return {
		c() {
			div4 = element("div");
			div0 = element("div");
			t0 = space();
			div3 = element("div");
			div1 = element("div");
			t1 = space();
			div2 = element("div");
			t2 = space();
			div5 = element("div");
			t3 = space();
			div11 = element("div");
			div6 = element("div");
			div6.textContent = "Variables";
			t5 = space();
			ul0 = element("ul");
			li0 = element("li");
			li0.innerHTML = `<span>count</span><span class="var-prop var-referenced-script svelte-nkk9cm">referenced (script)</span><span class="var-prop var-referenced-template svelte-nkk9cm">referenced (template)</span><span class="var-prop var-mutated svelte-nkk9cm">mutated</span>`;
			t10 = space();
			li1 = element("li");
			li1.innerHTML = `<span>values</span><span class="var-prop var-mutated svelte-nkk9cm">mutated</span><span class="var-prop var-referenced-template svelte-nkk9cm">referenced (template)</span>`;
			t14 = space();
			li2 = element("li");
			li2.innerHTML = `<span>double</span><span class="var-prop var-injected svelte-nkk9cm">injected</span><span class="var-prop var-referenced-script svelte-nkk9cm">referenced (script)</span>`;
			t18 = space();
			if (if_block) if_block.c();
			t19 = space();
			svg = svg_element("svg");
			defs = svg_element("defs");
			marker = svg_element("marker");
			path0 = svg_element("path");
			path1 = svg_element("path");
			path2 = svg_element("path");
			t20 = space();
			div10 = element("div");
			div7 = element("div");
			t21 = space();
			div8 = element("div");
			div8.textContent = "Dependencies:";
			t23 = space();
			ul1 = element("ul");
			ul1.innerHTML = `<li><span>values</span></li>`;
			t25 = space();
			div9 = element("div");
			div9.textContent = "Variables";
			t27 = space();
			ul2 = element("ul");
			ul2.innerHTML = `<li><span>value</span><span class="var-prop var-referenced-template svelte-nkk9cm">referenced (template)</span></li>`;
			attr(div0, "class", "code source svelte-nkk9cm");
			attr(div1, "class", "code svelte-nkk9cm");
			toggle_class(div1, "hidden", /*i*/ ctx[0] < 1);
			attr(div2, "class", div2_class_value = "box blue box-" + /*i*/ ctx[0] + " svelte-nkk9cm");
			toggle_class(div2, "hidden", /*i*/ ctx[0] < 2 || /*i*/ ctx[0] > 4 && /*i*/ ctx[0] < 7 || /*i*/ ctx[0] > 9 && /*i*/ ctx[0] < 14 || /*i*/ ctx[0] === 18 || /*i*/ ctx[0] > 21 && /*i*/ ctx[0] < 25 || /*i*/ ctx[0] === 30 || /*i*/ ctx[0] > 33);
			attr(div3, "class", "output svelte-nkk9cm");
			attr(div4, "class", "container svelte-nkk9cm");
			attr(div5, "class", div5_class_value = "box red box-" + /*i*/ ctx[0] + " svelte-nkk9cm");
			toggle_class(div5, "hidden", /*i*/ ctx[0] < 6 || /*i*/ ctx[0] === 24 || /*i*/ ctx[0] > 27);
			attr(path0, "d", "M 0 0 L 10 5 L 0 10 z");
			attr(marker, "id", "arrowhead");
			attr(marker, "viewBox", "0 0 10 10");
			attr(marker, "refX", "3");
			attr(marker, "refY", "5");
			attr(marker, "markerWidth", "6");
			attr(marker, "markerHeight", "6");
			attr(marker, "orient", "auto");
			attr(path1, "d", "M9,0 C40,0 40,65 9,65");
			attr(path1, "marker-end", "url(#arrowhead)");
			attr(path2, "d", "M9,55 C20,55 20,35 9,35");
			attr(path2, "marker-end", "url(#arrowhead)");
			set_style(svg, "position", "absolute");
			set_style(svg, "stroke-width", "2px");
			set_style(svg, "stroke", "black");
			set_style(svg, "fill", "none");
			set_style(svg, "top", "60px");
			set_style(svg, "left", "53px");
			set_style(svg, "transform", "scaleX(-1) translateX(105%)");
			attr(svg, "width", "45px");
			attr(svg, "height", "72px");
			attr(ul0, "class", "svelte-nkk9cm");
			attr(div8, "class", "title svelte-nkk9cm");
			attr(ul1, "class", "svelte-nkk9cm");
			attr(div9, "class", "title svelte-nkk9cm");
			attr(ul2, "class", "svelte-nkk9cm");
			attr(div10, "class", "scope svelte-nkk9cm");
			attr(div11, "class", "vars svelte-nkk9cm");
			toggle_class(div11, "left", /*i*/ ctx[0] >= 27);
			toggle_class(div11, "hidden", /*i*/ ctx[0] < 11 || /*i*/ ctx[0] > 12 && /*i*/ ctx[0] < 21 || /*i*/ ctx[0] > 21 && /*i*/ ctx[0] < 27 || /*i*/ ctx[0] > 29);
		},
		m(target, anchor) {
			insert(target, div4, anchor);
			append(div4, div0);
			append(div4, t0);
			append(div4, div3);
			append(div3, div1);
			append(div3, t1);
			append(div3, div2);
			insert(target, t2, anchor);
			insert(target, div5, anchor);
			insert(target, t3, anchor);
			insert(target, div11, anchor);
			append(div11, div6);
			append(div11, t5);
			append(div11, ul0);
			append(ul0, li0);
			append(ul0, t10);
			append(ul0, li1);
			append(ul0, t14);
			append(ul0, li2);
			append(ul0, t18);
			if (if_block) if_block.m(ul0, null);
			append(ul0, t19);
			append(ul0, svg);
			append(svg, defs);
			append(defs, marker);
			append(marker, path0);
			append(svg, path1);
			append(svg, path2);
			append(div11, t20);
			append(div11, div10);
			append(div10, div7);
			append(div10, t21);
			append(div10, div8);
			append(div10, t23);
			append(div10, ul1);
			append(div10, t25);
			append(div10, div9);
			append(div10, t27);
			append(div10, ul2);

			if (!mounted) {
				dispose = [
					action_destroyer(prism_action = prism$1.call(null, div0, { code: code$1, lang: prism.languages.svelte })),
					action_destroyer(prism_action_1 = prism$1.call(null, div1, {
						code: /*app*/ ctx[1][/*i*/ ctx[0]] || /*app*/ ctx[1][/*app*/ ctx[1].length - 1],
						lang: prism.languages.javascript
					})),
					action_destroyer(prism_action_2 = prism$1.call(null, div7, {
						code: "{#each}",
						lang: prism.languages.svelte
					}))
				];

				mounted = true;
			}
		},
		p(ctx, [dirty]) {
			if (prism_action_1 && is_function(prism_action_1.update) && dirty & /*i*/ 1) prism_action_1.update.call(null, {
				code: /*app*/ ctx[1][/*i*/ ctx[0]] || /*app*/ ctx[1][/*app*/ ctx[1].length - 1],
				lang: prism.languages.javascript
			});

			if (dirty & /*i*/ 1) {
				toggle_class(div1, "hidden", /*i*/ ctx[0] < 1);
			}

			if (dirty & /*i*/ 1 && div2_class_value !== (div2_class_value = "box blue box-" + /*i*/ ctx[0] + " svelte-nkk9cm")) {
				attr(div2, "class", div2_class_value);
			}

			if (dirty & /*i, i*/ 1) {
				toggle_class(div2, "hidden", /*i*/ ctx[0] < 2 || /*i*/ ctx[0] > 4 && /*i*/ ctx[0] < 7 || /*i*/ ctx[0] > 9 && /*i*/ ctx[0] < 14 || /*i*/ ctx[0] === 18 || /*i*/ ctx[0] > 21 && /*i*/ ctx[0] < 25 || /*i*/ ctx[0] === 30 || /*i*/ ctx[0] > 33);
			}

			if (dirty & /*i*/ 1 && div5_class_value !== (div5_class_value = "box red box-" + /*i*/ ctx[0] + " svelte-nkk9cm")) {
				attr(div5, "class", div5_class_value);
			}

			if (dirty & /*i, i*/ 1) {
				toggle_class(div5, "hidden", /*i*/ ctx[0] < 6 || /*i*/ ctx[0] === 24 || /*i*/ ctx[0] > 27);
			}

			if (/*i*/ ctx[0] >= 12) {
				if (if_block) ; else {
					if_block = create_if_block$k();
					if_block.c();
					if_block.m(ul0, t19);
				}
			} else if (if_block) {
				if_block.d(1);
				if_block = null;
			}

			if (dirty & /*i*/ 1) {
				toggle_class(div11, "left", /*i*/ ctx[0] >= 27);
			}

			if (dirty & /*i*/ 1) {
				toggle_class(div11, "hidden", /*i*/ ctx[0] < 11 || /*i*/ ctx[0] > 12 && /*i*/ ctx[0] < 21 || /*i*/ ctx[0] > 21 && /*i*/ ctx[0] < 27 || /*i*/ ctx[0] > 29);
			}
		},
		i: noop,
		o: noop,
		d(detaching) {
			if (detaching) detach(div4);
			if (detaching) detach(t2);
			if (detaching) detach(div5);
			if (detaching) detach(t3);
			if (detaching) detach(div11);
			if (if_block) if_block.d();
			mounted = false;
			run_all(dispose);
		}
	};
}

function instance$A($$self, $$props, $$invalidate) {
	let i = 0;

	const app = [
		app1$1,
		app1$1,
		app1$1,
		app1$1,
		app1$1,
		app1$1,
		app1$1,
		app2$1,
		app3$1,
		app4$1,
		app4$1,
		app4$1,
		app4$1,
		app4$1,
		app5$1,
		app6$1,
		app7$1,
		app8$1,
		app8$1,
		app9$1,
		app10$1,
		app10$1,
		app10$1,
		app11$1,
		app12$1,
		app13,
		app14,
		app14,
		app15,
		app16,
		app16,
		app17,
		app18,
		app19
	];

	function next() {
		if (i < 34) {
			$$invalidate(0, i++, i);
			return true;
		}

		return false;
	}

	function prev() {
		if (i > 0) {
			$$invalidate(0, i--, i);
			return true;
		}

		return false;
	}

	return [i, app, next, prev];
}

class Slides18 extends SvelteComponent {
	constructor(options) {
		super();
		if (!document.getElementById("svelte-nkk9cm-style")) add_css$B();
		init(this, options, instance$A, create_fragment$I, safe_not_equal, { next: 2, prev: 3 });
	}

	get next() {
		return this.$$.ctx[2];
	}

	get prev() {
		return this.$$.ctx[3];
	}
}

/* @@slides19.svelte generated by Svelte v3.24.0 */

function add_css$C() {
	var style = element("style");
	style.id = "svelte-vd3fee-style";
	style.textContent = "h1.svelte-vd3fee{display:grid;height:100%;place-items:center;margin:0}";
	append(document.head, style);
}

function create_fragment$J(ctx) {
	let h1;

	return {
		c() {
			h1 = element("h1");
			h1.textContent = "3.2. generate: ssr";
			attr(h1, "class", "svelte-vd3fee");
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
		if (!document.getElementById("svelte-vd3fee-style")) add_css$C();
		init(this, options, null, create_fragment$J, safe_not_equal, {});
	}
}

var app1$2 = "const App = create_ssr_component(\n  ($$result, $$props, $$bindings, $$slots) => {\n    return '';\n  }\n);\n\nexport default App;\n";

var app2$2 = "const App = create_ssr_component(\n  ($$result, $$props, $$bindings, $$slots) => {\n    let count = 5;\n    let values;\n\n    return '';\n  }\n);\n\nexport default App;\n";

var app3$2 = "const App = create_ssr_component(\n  ($$result, $$props, $$bindings, $$slots) => {\n    let count = 5;\n    let values;\n\n    let double = count * 2;\n    $: {\n      const data = [];\n      for (let i = 0; i < double; i++) {\n        data[i] = Math.floor(Math.random() * 10);\n      }\n      values = data;\n    }\n\n    return '';\n  }\n);\n\nexport default App;\n";

var app4$2 = "const App = create_ssr_component(\n  ($$result, $$props, $$bindings, $$slots) => {\n    let count = 5;\n    let values;\n\n    let double = count * 2;\n    $: {\n      const data = [];\n      for (let i = 0; i < double; i++) {\n        data[i] = Math.floor(Math.random() * 10);\n      }\n      values = data;\n    }\n\n    return `<input `;\n  }\n);\n\nexport default App;\n";

var app5$2 = "const App = create_ssr_component(\n  ($$result, $$props, $$bindings, $$slots) => {\n    let count = 5;\n    let values;\n\n    let double = count * 2;\n    $: {\n      const data = [];\n      for (let i = 0; i < double; i++) {\n        data[i] = Math.floor(Math.random() * 10);\n      }\n      values = data;\n    }\n\n    return `<input value=${count}`;\n  }\n);\n\nexport default App;\n";

var app6$2 = "const App = create_ssr_component(\n  ($$result, $$props, $$bindings, $$slots) => {\n    let count = 5;\n    let values;\n\n    let double = count * 2;\n    $: {\n      const data = [];\n      for (let i = 0; i < double; i++) {\n        data[i] = Math.floor(Math.random() * 10);\n      }\n      values = data;\n    }\n\n    return `<input value=${count}></input>`;\n  }\n);\n\nexport default App;\n";

var app7$2 = "const App = create_ssr_component(\n  ($$result, $$props, $$bindings, $$slots) => {\n    let count = 5;\n    let values;\n\n    let double = count * 2;\n    $: {\n      const data = [];\n      for (let i = 0; i < double; i++) {\n        data[i] = Math.floor(Math.random() * 10);\n      }\n      values = data;\n    }\n\n    return `<input value=${count}></input>\n\n    ${each()}\n    `;\n  }\n);\n\nexport default App;\n";

var app8$2 = "const App = create_ssr_component(\n  ($$result, $$props, $$bindings, $$slots) => {\n    let count = 5;\n    let values;\n\n    let double = count * 2;\n    $: {\n      const data = [];\n      for (let i = 0; i < double; i++) {\n        data[i] = Math.floor(Math.random() * 10);\n      }\n      values = data;\n    }\n\n    return `<input value=${count}></input>\n\n    ${each(values, )}\n    `;\n  }\n);\n\nexport default App;\n";

var app9$2 = "const App = create_ssr_component(\n  ($$result, $$props, $$bindings, $$slots) => {\n    let count = 5;\n    let values;\n\n    let double = count * 2;\n    $: {\n      const data = [];\n      for (let i = 0; i < double; i++) {\n        data[i] = Math.floor(Math.random() * 10);\n      }\n      values = data;\n    }\n\n    return `<input value=${count}></input>\n\n    ${each(values, value => ``)}\n    `;\n  }\n);\n\nexport default App;\n";

var app10$2 = "const App = create_ssr_component(\n  ($$result, $$props, $$bindings, $$slots) => {\n    let count = 5;\n    let values;\n\n    let double = count * 2;\n    $: {\n      const data = [];\n      for (let i = 0; i < double; i++) {\n        data[i] = Math.floor(Math.random() * 10);\n      }\n      values = data;\n    }\n\n    return `<input value=${count}></input>\n\n    ${each(values, value => `<div `)}\n    `;\n  }\n);\n\nexport default App;\n";

var app11$2 = "const App = create_ssr_component(\n  ($$result, $$props, $$bindings, $$slots) => {\n    let count = 5;\n    let values;\n\n    let double = count * 2;\n    $: {\n      const data = [];\n      for (let i = 0; i < double; i++) {\n        data[i] = Math.floor(Math.random() * 10);\n      }\n      values = data;\n    }\n\n    return `<input value=${count}></input>\n\n    ${each(values, value => `<div \n      class=\"${(value % 2 === 0) ? 'even' : ''} svelte-xyz\"`\n    )}\n    `;\n  }\n);\n\nexport default App;\n";

var app12$2 = "const App = create_ssr_component(\n  ($$result, $$props, $$bindings, $$slots) => {\n    let count = 5;\n    let values;\n\n    let double = count * 2;\n    $: {\n      const data = [];\n      for (let i = 0; i < double; i++) {\n        data[i] = Math.floor(Math.random() * 10);\n      }\n      values = data;\n    }\n\n    return `<input value=${count}></input>\n\n    ${each(values, value => `<div \n      class=\"${(value % 2 === 0) ? 'even' : ''} svelte-xyz\">${value}`\n    )}\n    `;\n  }\n);\n\nexport default App;\n";

var app13$1 = "const App = create_ssr_component(\n  ($$result, $$props, $$bindings, $$slots) => {\n    let count = 5;\n    let values;\n\n    let double = count * 2;\n    $: {\n      const data = [];\n      for (let i = 0; i < double; i++) {\n        data[i] = Math.floor(Math.random() * 10);\n      }\n      values = data;\n    }\n\n    return `<input value=${count}></input>\n\n    ${each(values, value => `<div \n      class=\"${(value % 2 === 0) ? 'even' : ''} svelte-xyz\">${value}</div>`\n    )}\n    `;\n  }\n);\n\nexport default App;\n";

/* @@slides20.svelte generated by Svelte v3.24.0 */

function add_css$D() {
	var style = element("style");
	style.id = "svelte-1e4t7n0-style";
	style.textContent = ".tab{width:2ch;display:inline-block}.code.svelte-1e4t7n0.svelte-1e4t7n0{font-family:\"Consolas\", \"Bitstream Vera Sans Mono\", \"Courier New\", Courier, monospace;font-size:22px}.source.svelte-1e4t7n0.svelte-1e4t7n0{background:#efefef}.container.svelte-1e4t7n0.svelte-1e4t7n0{display:grid;grid-template-columns:1fr 1fr;grid-gap:16px}.hidden.svelte-1e4t7n0.svelte-1e4t7n0{opacity:0}.vars.hidden.svelte-1e4t7n0.svelte-1e4t7n0{transform:translateX(300px)}.vars.svelte-1e4t7n0.svelte-1e4t7n0{z-index:20;background:white;position:absolute;right:64px;bottom:64px;width:520px;font-size:20px;border:1px solid #888;border-radius:12px;padding:16px 32px;box-shadow:8px 8px 10px #ddd;transition:200ms ease-in}.vars.left.svelte-1e4t7n0.svelte-1e4t7n0{transform:translateX(-570px)}.vars.svelte-1e4t7n0 ul.svelte-1e4t7n0{margin:0}.var-prop.svelte-1e4t7n0.svelte-1e4t7n0{color:white;padding:3px 8px;font-size:0.8em;margin-left:4px;border-radius:8px;white-space:nowrap}.var-injected.svelte-1e4t7n0.svelte-1e4t7n0{background:rebeccapurple}.var-referenced-script.svelte-1e4t7n0.svelte-1e4t7n0{background:orange}.var-mutated.svelte-1e4t7n0.svelte-1e4t7n0{background:cadetblue}.var-referenced-template.svelte-1e4t7n0.svelte-1e4t7n0{background:crimson}.scope.svelte-1e4t7n0.svelte-1e4t7n0{padding:8px 16px;border:1px solid #aaa;margin-top:8px;font-size:0.9em}.scope.svelte-1e4t7n0 .title.svelte-1e4t7n0{margin-top:6px}.box.svelte-1e4t7n0.svelte-1e4t7n0{border:1px solid red;position:absolute;z-index:10;pointer-events:none;--line-height:26px;top:calc(14px + var(--start, 0) * var(--line-height));height:calc(var(--line) * var(--line-height));margin-left:14px;left:calc(var(--tab) * 1ch);width:calc(var(--char, 27) * 1ch)}.box.blue.svelte-1e4t7n0.svelte-1e4t7n0{border-color:blue;margin-left:calc(49%)}.red.box-2.svelte-1e4t7n0.svelte-1e4t7n0{--line:2;--start:1;--char:14}.red.box-3.svelte-1e4t7n0.svelte-1e4t7n0{--line:8;--start:4;--char:43}.red.box-4.svelte-1e4t7n0.svelte-1e4t7n0{--line:1;--start:14;--char:27;--tab:0}.red.box-5.svelte-1e4t7n0.svelte-1e4t7n0{--line:1;--start:14;--char:18;--tab:6}.red.box-6.svelte-1e4t7n0.svelte-1e4t7n0{--line:1;--start:14;--char:27;--tab:0}.red.box-7.svelte-1e4t7n0.svelte-1e4t7n0{--line:4;--start:16;--char:47;--tab:0}.red.box-8.svelte-1e4t7n0.svelte-1e4t7n0{--line:1;--start:16;--char:6;--tab:6.3}.red.box-9.svelte-1e4t7n0.svelte-1e4t7n0{--line:1;--start:16;--char:5;--tab:15.5}.red.box-10.svelte-1e4t7n0.svelte-1e4t7n0{--line:2;--start:17;--char:47;--tab:0}.red.box-11.svelte-1e4t7n0.svelte-1e4t7n0{--line:1;--start:17;--char:41;--tab:6}.red.box-12.svelte-1e4t7n0.svelte-1e4t7n0{--line:1;--start:18;--char:6.6;--tab:4.5}.red.box-13.svelte-1e4t7n0.svelte-1e4t7n0{--line:2;--start:17;--char:47;--tab:0}.blue.box-2.svelte-1e4t7n0.svelte-1e4t7n0{--char:14;--line:2;--start:2;--tab:5}.blue.box-3.svelte-1e4t7n0.svelte-1e4t7n0{--start:5;--line:8;--char:43;--tab:4.5}.blue.box-4.svelte-1e4t7n0.svelte-1e4t7n0{--start:14;--line:1;--char:16;--tab:5}.blue.box-5.svelte-1e4t7n0.svelte-1e4t7n0{--start:14;--line:1;--char:13;--tab:19}.blue.box-6.svelte-1e4t7n0.svelte-1e4t7n0{--start:14;--line:1;--char:38;--tab:5}.blue.box-7.svelte-1e4t7n0.svelte-1e4t7n0{--start:16;--line:1;--char:9;--tab:5}.blue.box-8.svelte-1e4t7n0.svelte-1e4t7n0{--start:16;--line:1;--char:6;--tab:11.5}.blue.box-9.svelte-1e4t7n0.svelte-1e4t7n0{--start:16;--line:1;--char:11;--tab:18.5}.blue.box-10.svelte-1e4t7n0.svelte-1e4t7n0{--start:16;--line:1;--char:5;--tab:28}.blue.box-11.svelte-1e4t7n0.svelte-1e4t7n0{--start:17;--line:2;--char:44;--tab:1.5}.blue.box-12.svelte-1e4t7n0.svelte-1e4t7n0{--start:18;--line:1;--char:8;--tab:12.5}.blue.box-13.svelte-1e4t7n0.svelte-1e4t7n0{--start:18;--line:1;--char:6;--tab:20}";
	append(document.head, style);
}

function create_fragment$K(ctx) {
	let div2;
	let div0;
	let prism_action;
	let t0;
	let div1;
	let prism_action_1;
	let t1;
	let div3;
	let div3_class_value;
	let t2;
	let div4;
	let div4_class_value;
	let t3;
	let div10;
	let div5;
	let t5;
	let ul0;
	let t19;
	let div9;
	let div6;
	let prism_action_2;
	let t20;
	let div7;
	let t22;
	let ul1;
	let t24;
	let div8;
	let t26;
	let ul2;
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
			t2 = space();
			div4 = element("div");
			t3 = space();
			div10 = element("div");
			div5 = element("div");
			div5.textContent = "Variables";
			t5 = space();
			ul0 = element("ul");

			ul0.innerHTML = `<li><span>count</span><span class="var-prop var-referenced-script svelte-1e4t7n0">referenced (script)</span><span class="var-prop var-referenced-template svelte-1e4t7n0">referenced (template)</span><span class="var-prop var-mutated svelte-1e4t7n0">mutated</span></li> 
    <li><span>values</span><span class="var-prop var-mutated svelte-1e4t7n0">mutated</span><span class="var-prop var-referenced-template svelte-1e4t7n0">referenced (template)</span></li> 
    <li><span>double</span><span class="var-prop var-injected svelte-1e4t7n0">injected</span><span class="var-prop var-referenced-script svelte-1e4t7n0">referenced (script)</span></li> 
    <svg style="position: absolute;stroke-width: 2px;stroke: black;fill: none;top: 60px;left: 53px;transform: scaleX(-1) translateX(105%);" width="45px" height="72px"><defs><marker id="arrowhead" viewBox="0 0 10 10" refX="3" refY="5" markerWidth="6" markerHeight="6" orient="auto"><path d="M 0 0 L 10 5 L 0 10 z"></path></marker></defs><path d="M9,0 C40,0 40,65 9,65" marker-end="url(#arrowhead)"></path><path d="M9,55 C20,55 20,35 9,35" marker-end="url(#arrowhead)"></path></svg>`;

			t19 = space();
			div9 = element("div");
			div6 = element("div");
			t20 = space();
			div7 = element("div");
			div7.textContent = "Dependencies:";
			t22 = space();
			ul1 = element("ul");
			ul1.innerHTML = `<li><span>values</span></li>`;
			t24 = space();
			div8 = element("div");
			div8.textContent = "Variables";
			t26 = space();
			ul2 = element("ul");
			ul2.innerHTML = `<li><span>value</span><span class="var-prop var-referenced-template svelte-1e4t7n0">referenced (template)</span></li>`;
			attr(div0, "class", "code source svelte-1e4t7n0");
			attr(div1, "class", "code svelte-1e4t7n0");
			toggle_class(div1, "hidden", /*i*/ ctx[0] < 1);
			attr(div2, "class", "container svelte-1e4t7n0");
			attr(div3, "class", div3_class_value = "box red box-" + /*i*/ ctx[0] + " svelte-1e4t7n0");
			toggle_class(div3, "hidden", /*i*/ ctx[0] < 2 || /*i*/ ctx[0] > 13);
			attr(div4, "class", div4_class_value = "box blue box-" + /*i*/ ctx[0] + " svelte-1e4t7n0");
			toggle_class(div4, "hidden", /*i*/ ctx[0] < 2 || /*i*/ ctx[0] > 13);
			attr(ul0, "class", "svelte-1e4t7n0");
			attr(div7, "class", "title svelte-1e4t7n0");
			attr(ul1, "class", "svelte-1e4t7n0");
			attr(div8, "class", "title svelte-1e4t7n0");
			attr(ul2, "class", "svelte-1e4t7n0");
			attr(div9, "class", "scope svelte-1e4t7n0");
			attr(div10, "class", "vars svelte-1e4t7n0");
			toggle_class(div10, "hidden", true);
		},
		m(target, anchor) {
			insert(target, div2, anchor);
			append(div2, div0);
			append(div2, t0);
			append(div2, div1);
			insert(target, t1, anchor);
			insert(target, div3, anchor);
			insert(target, t2, anchor);
			insert(target, div4, anchor);
			insert(target, t3, anchor);
			insert(target, div10, anchor);
			append(div10, div5);
			append(div10, t5);
			append(div10, ul0);
			append(div10, t19);
			append(div10, div9);
			append(div9, div6);
			append(div9, t20);
			append(div9, div7);
			append(div9, t22);
			append(div9, ul1);
			append(div9, t24);
			append(div9, div8);
			append(div9, t26);
			append(div9, ul2);

			if (!mounted) {
				dispose = [
					action_destroyer(prism_action = prism$1.call(null, div0, { code: code$1, lang: prism.languages.svelte })),
					action_destroyer(prism_action_1 = prism$1.call(null, div1, {
						code: /*app*/ ctx[1][/*i*/ ctx[0]] || /*app*/ ctx[1][/*app*/ ctx[1].length - 1],
						lang: prism.languages.javascript
					})),
					action_destroyer(prism_action_2 = prism$1.call(null, div6, {
						code: "{#each}",
						lang: prism.languages.svelte
					}))
				];

				mounted = true;
			}
		},
		p(ctx, [dirty]) {
			if (prism_action_1 && is_function(prism_action_1.update) && dirty & /*i*/ 1) prism_action_1.update.call(null, {
				code: /*app*/ ctx[1][/*i*/ ctx[0]] || /*app*/ ctx[1][/*app*/ ctx[1].length - 1],
				lang: prism.languages.javascript
			});

			if (dirty & /*i*/ 1) {
				toggle_class(div1, "hidden", /*i*/ ctx[0] < 1);
			}

			if (dirty & /*i*/ 1 && div3_class_value !== (div3_class_value = "box red box-" + /*i*/ ctx[0] + " svelte-1e4t7n0")) {
				attr(div3, "class", div3_class_value);
			}

			if (dirty & /*i, i*/ 1) {
				toggle_class(div3, "hidden", /*i*/ ctx[0] < 2 || /*i*/ ctx[0] > 13);
			}

			if (dirty & /*i*/ 1 && div4_class_value !== (div4_class_value = "box blue box-" + /*i*/ ctx[0] + " svelte-1e4t7n0")) {
				attr(div4, "class", div4_class_value);
			}

			if (dirty & /*i, i*/ 1) {
				toggle_class(div4, "hidden", /*i*/ ctx[0] < 2 || /*i*/ ctx[0] > 13);
			}
		},
		i: noop,
		o: noop,
		d(detaching) {
			if (detaching) detach(div2);
			if (detaching) detach(t1);
			if (detaching) detach(div3);
			if (detaching) detach(t2);
			if (detaching) detach(div4);
			if (detaching) detach(t3);
			if (detaching) detach(div10);
			mounted = false;
			run_all(dispose);
		}
	};
}

function instance$B($$self, $$props, $$invalidate) {
	let i = 0;

	const app = [
		app1$2,
		app1$2,
		app2$2,
		app3$2,
		app4$2,
		app5$2,
		app6$2,
		app7$2,
		app8$2,
		app9$2,
		app10$2,
		app11$2,
		app12$2,
		app13$1
	];

	function next() {
		if (i < 14) {
			$$invalidate(0, i++, i);
			return true;
		}

		return false;
	}

	function prev() {
		if (i > 0) {
			$$invalidate(0, i--, i);
			return true;
		}

		return false;
	}

	return [i, app, next, prev];
}

class Slides20 extends SvelteComponent {
	constructor(options) {
		super();
		if (!document.getElementById("svelte-1e4t7n0-style")) add_css$D();
		init(this, options, instance$B, create_fragment$K, safe_not_equal, { next: 2, prev: 3 });
	}

	get next() {
		return this.$$.ctx[2];
	}

	get prev() {
		return this.$$.ctx[3];
	}
}

/* @@slides21.svelte generated by Svelte v3.24.0 */

function add_css$E() {
	var style = element("style");
	style.id = "svelte-1tlcbvk-style";
	style.textContent = ".container.svelte-1tlcbvk{display:flex;flex-direction:column;align-items:center;height:100%;justify-content:center}h1.svelte-1tlcbvk{margin-top:0}";
	append(document.head, style);
}

function create_fragment$L(ctx) {
	let div1;
	let h1;
	let t1;
	let div0;
	let prism_action;
	let mounted;
	let dispose;

	return {
		c() {
			div1 = element("div");
			h1 = element("h1");
			h1.textContent = "4. Output as js + css";
			t1 = space();
			div0 = element("div");
			attr(h1, "class", "svelte-1tlcbvk");
			attr(div0, "class", "code");
			attr(div1, "class", "container svelte-1tlcbvk");
		},
		m(target, anchor) {
			insert(target, div1, anchor);
			append(div1, h1);
			append(div1, t1);
			append(div1, div0);

			if (!mounted) {
				dispose = action_destroyer(prism_action = prism$1.call(null, div0, {
					code: `
{
  js: {
    code: string,
    map: SourceMap,
  },
  css: {
    code: string,
    map: SourceMap,
  }
}`,
					lang: prism.languages.javascript
				}));

				mounted = true;
			}
		},
		p: noop,
		i: noop,
		o: noop,
		d(detaching) {
			if (detaching) detach(div1);
			mounted = false;
			dispose();
		}
	};
}

class Slides21 extends SvelteComponent {
	constructor(options) {
		super();
		if (!document.getElementById("svelte-1tlcbvk-style")) add_css$E();
		init(this, options, null, create_fragment$L, safe_not_equal, {});
	}
}

/* @@slides22.svelte generated by Svelte v3.24.0 */

function add_css$F() {
	var style = element("style");
	style.id = "svelte-9k5trb-style";
	style.textContent = "h1.svelte-9k5trb{margin:0}";
	append(document.head, style);
}

function create_fragment$M(ctx) {
	let div;

	return {
		c() {
			div = element("div");

			div.innerHTML = `<h1 class="svelte-9k5trb">Summary</h1> 
<ol><li><p>Parsing Svelte code</p></li> 
<li><p>Static Analysis</p></li> 
<li><p>Rendering</p> 
<p>3.1. generate: dom</p> 
<p>3.2. generate: ssr</p></li> 
<li><p>Output as js + css</p></li></ol>`;
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

class Slides22 extends SvelteComponent {
	constructor(options) {
		super();
		if (!document.getElementById("svelte-9k5trb-style")) add_css$F();
		init(this, options, null, create_fragment$M, safe_not_equal, {});
	}
}

/* @@slides23.svelte generated by Svelte v3.24.0 */

function add_css$G() {
	var style = element("style");
	style.id = "svelte-1296l67-style";
	style.textContent = ".container.svelte-1296l67{display:grid;height:100%;place-items:center;margin:0;text-align:center}";
	append(document.head, style);
}

function create_fragment$N(ctx) {
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

class Slides23 extends SvelteComponent {
	constructor(options) {
		super();
		if (!document.getElementById("svelte-1296l67-style")) add_css$G();
		init(this, options, null, create_fragment$N, safe_not_equal, {});
	}
}

/* scripts/components/Slides.svelte generated by Svelte v3.24.0 */

const { document: document_1$1 } = globals;

function add_css$H() {
	var style = element("style");
	style.id = "svelte-180nwr6-style";
	style.textContent = "body{overflow:hidden}section.svelte-180nwr6{width:100vw;height:100vh;box-sizing:border-box;position:fixed;top:0;left:0;overflow:scroll;transition:transform 0.25s ease-in-out;padding:16px;overflow-x:hidden}";
	append(document_1$1.head, style);
}

function get_each_context$b(ctx, list, i) {
	const child_ctx = ctx.slice();
	child_ctx[9] = list[i];
	child_ctx[11] = i;
	return child_ctx;
}

// (60:0) {#each slides as Slide, index (index)}
function create_each_block$b(key_1, ctx) {
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

function create_fragment$O(ctx) {
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
		let child_ctx = get_each_context$b(ctx, each_value, i);
		let key = get_key(child_ctx);
		each_1_lookup.set(key, each_blocks[i] = create_each_block$b(key, child_ctx));
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
				dispose = listen(document_1$1.body, "keydown", /*onKeyDown*/ ctx[3]);
				mounted = true;
			}
		},
		p(ctx, [dirty]) {
			if (dirty & /*slides, slideIndex, slideInstances*/ 7) {
				const each_value = /*slides*/ ctx[0];
				group_outros();
				each_blocks = update_keyed_each(each_blocks, dirty, get_key, 1, ctx, each_value, each_1_lookup, each_1_anchor.parentNode, outro_and_destroy_block, create_each_block$b, each_1_anchor, get_each_context$b);
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

function instance$C($$self, $$props, $$invalidate) {
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
		if (!document_1$1.getElementById("svelte-180nwr6-style")) add_css$H();
		init(this, options, instance$C, create_fragment$O, safe_not_equal, { slides: 0 });
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
];
new Slides({ target: document.body, props: { slides } });

export { commonjsGlobal as a, createCommonjsModule as c };
