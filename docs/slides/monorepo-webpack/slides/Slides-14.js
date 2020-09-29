/* generated by Svelte v3.24.0 */
import {
	SvelteComponent,
	attr,
	create_component,
	destroy_component,
	detach,
	element,
	init,
	insert,
	mount_component,
	noop,
	safe_not_equal,
	space,
	transition_in,
	transition_out
} from "/svelte/internal.js";

import Folder from "/components/Folder.js";
import toFolder from "/components/toFolder.js";

function create_fragment(ctx) {
	let folder_1;
	let t;
	let pre;

	let raw_value = `
<code class="language-js"><span class="token comment">// filename: /d/packages/a/index.js</span>
<span class="token keyword">import</span> c_from_a <span class="token keyword">from</span> <span class="token string">'c'</span><span class="token punctuation">;</span>
 
<span class="token comment">// filename: /d/packages/b/index.js</span>
<span class="token keyword">import</span> c_from_b <span class="token keyword">from</span> <span class="token string">'c'</span><span class="token punctuation">;</span>

c_from_a <span class="token operator">===</span> c_from_b<span class="token punctuation">;</span></code>` + "";

	let current;
	folder_1 = new Folder({ props: { folder: /*folder*/ ctx[0] } });

	return {
		c() {
			create_component(folder_1.$$.fragment);
			t = space();
			pre = element("pre");
			attr(pre, "class", "language-js");
		},
		m(target, anchor) {
			mount_component(folder_1, target, anchor);
			insert(target, t, anchor);
			insert(target, pre, anchor);
			pre.innerHTML = raw_value;
			current = true;
		},
		p: noop,
		i(local) {
			if (current) return;
			transition_in(folder_1.$$.fragment, local);
			current = true;
		},
		o(local) {
			transition_out(folder_1.$$.fragment, local);
			current = false;
		},
		d(detaching) {
			destroy_component(folder_1, detaching);
			if (detaching) detach(t);
			if (detaching) detach(pre);
		}
	};
}

function instance($$self) {
	const folder = toFolder`
+ d
  - index.js
  + packages
    - c.js
    + a
      + node_modules
        - c.js --> ../../c.js
      - index.js
    + b
      + node_modules
        - c.js --> ../../c.js
      - index.js
`;

	return [folder];
}

class Component extends SvelteComponent {
	constructor(options) {
		super();
		init(this, options, instance, create_fragment, safe_not_equal, {});
	}
}

export default Component;