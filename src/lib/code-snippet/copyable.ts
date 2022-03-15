import { onMount } from 'svelte';

const map = new Map();

export function init() {
	onMount(() => {
		const copyable = document.querySelectorAll('.copy[data-copy]');
		function onClick(event: MouseEvent) {
			if (navigator.clipboard && typeof navigator.clipboard.writeText === 'function') {
				const target = event.currentTarget as HTMLElement;
				navigator.clipboard.writeText(target.getAttribute('data-copy'));

				showTick(target);
			}
		}

		copyable.forEach((element) => {
			element.addEventListener('click', onClick);
		});

		return () => {
			copyable.forEach((element) => {
				element.removeEventListener('click', onClick);
			});
		};
	});
}

function showTick(element: HTMLElement) {
	if (!map.has(element)) {
		element.dataset.original = element.innerHTML;
	} else {
		clearTimeout(map.get(element));
	}

	element.innerHTML =
		'<svg viewBox="64 64 896 896" focusable="false" data-icon="check" width="1em" height="1em" fill="currentColor" aria-hidden="true"><path d="M912 190h-69.9c-9.8 0-19.1 4.5-25.1 12.2L404.7 724.5 207 474a32 32 0 00-25.1-12.2H112c-6.7 0-10.4 7.7-6.3 12.9l273.9 347c12.8 16.2 37.4 16.2 50.3 0l488.4-618.9c4.1-5.1.4-12.8-6.3-12.8z"></path></svg>';
	const timeoutId = setTimeout(() => {
		element.innerHTML = element.dataset.original;
		delete element.dataset.original;
		map.delete(element);
	}, 2000);
	map.set(element, timeoutId);
}
