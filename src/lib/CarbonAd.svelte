<script>
	import { onMount } from 'svelte';
	onMount(() => {
		let removed = false;
		const timeoutId = setTimeout(() => {
			if (window.innerWidth > 1080) {
				const script = document.createElement('script');
				script.onerror = script.onload = function () {
					if (removed) removeCarbonAds();
				};
				script.async = true;
				script.type = 'text/javascript';
				script.id = '_carbonads_js';
				document.body.appendChild(script);
				script.src = '//cdn.carbonads.com/carbon.js?serve=CE7ITK3E&placement=lihautancom';
			}
		}, 5000);
		return () => {
			clearTimeout(timeoutId);
			removeCarbonAds();
			removed = true;
		};
	});
	function removeCarbonAds() {
		['_carbonads_js', 'carbonads', '_carbonads_projs', '_carbonads_fallbackjs'].forEach((id) => {
			try {
				const ad = document.getElementById(id);
				ad.parentNode.removeChild(ad);
			} catch (error) {
				// ignore them
			}
		});
	}
</script>

<style>
	:global(#carbonads) {
		box-sizing: content-box;
		display: block;
		overflow: hidden;
		position: fixed;
		bottom: 16px;
		right: 16px;
		padding: 1em;
		width: 130px;
		background: #fff;
		text-align: center;
		font-size: 14px;
		font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen-Sans, Ubuntu,
			Cantarell, 'Helvetica Neue', sans-serif;
		line-height: 1.5;
	}

	@media (max-width: 1080px) {
		:global(#carbonads) {
			display: none;
		}
	}

	:global(#carbonads a) {
		color: inherit;
		text-decoration: none;
	}

	:global(#carbonads a:hover) {
		color: inherit;
	}

	:global(#carbonads span) {
		display: block;
		overflow: hidden;
	}

	:global(.carbon-img) {
		display: block;
		margin: 0 auto 8px;
		line-height: 1;
	}

	:global(.carbon-text) {
		display: block;
		margin-bottom: 8px;
	}

	:global(.carbon-poweredby) {
		display: block;
		text-transform: uppercase;
		letter-spacing: 1px;
		font-size: 10px;
		line-height: 1;
	}
</style>
