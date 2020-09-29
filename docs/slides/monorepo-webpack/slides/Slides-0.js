/* generated by Svelte v3.24.0 */
import {
	SvelteComponent,
	detach,
	element,
	init,
	insert,
	noop,
	safe_not_equal,
	set_style,
	space
} from "/svelte/internal.js";

function create_fragment(ctx) {
	let h1;
	let t1;
	let div;

	return {
		c() {
			h1 = element("h1");
			h1.textContent = "🎒 Monorepo and our Webpack";
			t1 = space();
			div = element("div");
			div.textContent = "Mattermost: @tanlh | Twitter: @lihautan";
			set_style(div, "text-align", "center");
		},
		m(target, anchor) {
			insert(target, h1, anchor);
			insert(target, t1, anchor);
			insert(target, div, anchor);
		},
		p: noop,
		i: noop,
		o: noop,
		d(detaching) {
			if (detaching) detach(h1);
			if (detaching) detach(t1);
			if (detaching) detach(div);
		}
	};
}

class Component extends SvelteComponent {
	constructor(options) {
		super();
		init(this, options, null, create_fragment, safe_not_equal, {});
	}
}

export default Component;