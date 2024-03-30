<script context="module" lang="ts">
	import { browser } from '$app/environment';
	let observer: IntersectionObserver;
	if (browser) {
		let options = {
			root: document.querySelector('#scrollArea'),
			rootMargin: '0px',
			threshold: 1.0
		};

		function callback(entries) {
			entries.forEach((entry) => {
				if (entry.isIntersecting) {
					console.log(entry.target.getAttribute('data-note')?.trim());
				}
			});
		}

		observer = new IntersectionObserver(callback, options);
	}
</script>

<script>
	export let note;

	function observe(elem) {
		if (browser) {
			observer.observe(elem);
			return {
				destroy() {
					observer.unobserve(elem);
				}
			};
		}
	}
</script>

<div use:observe data-note={note} />
