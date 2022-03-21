<script>
	import profilePic from '$lib/assets/profile-pic.png?w=230';
	import profilePicWebp from '$lib/assets/profile-pic.png?w=230&format=webp';
	import ogImage from '$lib/assets/og-image.jpg';
	import twitterImage from '$lib/assets/twitter-card-image.jpg';
	import Links from '$lib/Links.svelte';
</script>

<svelte:head>
	<title>Tan Li Hau</title>
	<meta name="description" content="Frontend Developer at Shopee Singapore." />
	<meta property="og:title" content="Tan Li Hau" />
	<meta property="og:description" content="Frontend Developer at Shopee Singapore." />
	<meta property="og:image" content={'https://lihautan.com/' + ogImage} />
	<meta property="og:url" content="https://lihautan.com" />
	<meta property="og:site_name" content="Tan Li Hau" />
	<meta property="og:type" content="profile" />
	<meta property="profile:first_name" content="Li Hau" />
	<meta property="profile:last_name" content="Tan" />
	<meta property="profile:gender" content="male" />

	<meta name="twitter:title" content="Tan Li Hau" />
	<meta name="twitter:description" content="Frontend Developer at Shopee Singapore." />
	<meta name="twitter:site" content="@lihautan" />
	<meta name="twitter:image" content={'https://lihautan.com/' + twitterImage} />
	<meta name="twitter:image:alt" content="Tan Li Hau" />
	<meta name="twitter:card" content="summary_large_image" />
</svelte:head>

<main>
	<div>
		<picture>
			<source type="image/webp" srcset={profilePicWebp} />
			<source type="image/png" srcset={profilePic} />
			<img src={profilePic} alt="Tan Li Hau" width="230" height="230" />
		</picture>
	</div>
	<h1>Tan Li Hau</h1>
	<h2>
		Frontend Developer at <a
			href="https://www.linkedin.com/company/shopee/"
			aria-label="Shopee LinkedIn page">Shopee Singapore</a
		>
	</h2>

	<Links />
</main>

<style>
	main {
		max-width: 675px;
		min-height: 100vh;
		margin: auto;
		padding: calc(3 * var(--prism-padding)) 0 var(--prism-padding);
		word-break: break-word;
		text-align: center;
		box-sizing: border-box;
	}

	@media only screen and (max-width: 755px) {
		main {
			padding: calc(3 * var(--prism-padding)) calc(2 * var(--prism-padding));
		}
	}

	img {
		max-width: 100%;
		border: 4px solid;
		box-shadow: var(--box-shadow);
	}

	h2 {
		margin-bottom: var(--margin);
	}
</style>
