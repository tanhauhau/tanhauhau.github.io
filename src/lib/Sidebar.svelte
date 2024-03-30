<script>
	import { browser } from '$app/environment';

	import { fade } from 'svelte/transition';
	export let tableOfContents = [];
	let show = false;
	$: browser && lockBody(show);

	function slide(node, params) {
		return {
			...params,
			css(t, u) {
				// 0 -> -100%
				// 1 -> 0
				return `transform: translateX(${-u * 100}%)`;
			}
		};
	}

	function hide() {
		show = false;
	}

	function lockBody(show) {
		if (show) {
			document.body.style.setProperty('overflow', 'hidden');
		} else {
			document.body.style.removeProperty('overflow');
		}
	}
</script>

<div class="sidebar">
	{#if show}
		<div class="panel" transition:slide>
			<ul class="links">
				<li><a on:click={hide} href="/about">About</a></li>
				<li><a on:click={hide} href="/blogs">Writings</a></li>
				<li><a on:click={hide} href="/talks">Talks</a></li>
				<li><a on:click={hide} href="/notes">Notes</a></li>
				<li><a on:click={hide} href="/books">Books</a></li>
				<li class="social">
					<a aria-label="Twitter account" href="https://twitter.com/lihautan">
						<svg viewBox="0 0 24 24" width="1em" height="1em">
							<path
								d="M23 3a10.9 10.9 0 0 1-3.14 1.53 4.48 4.48 0 0 0-7.86 3v1A10.66
    10.66 0 0 1 3 4s-4 9 5 13a11.64 11.64 0 0 1-7 2c9 5 20 0 20-11.5a4.5
    4.5 0 0 0-.08-.83A7.72 7.72 0 0 0 23 3z"
							/>
						</svg>
					</a>
					<a aria-label="Github account" href="https://github.com/tanhauhau">
						<svg viewBox="0 0 24 24" width="1em" height="1em">
							<path
								d="M9 19c-5 1.5-5-2.5-7-3m14 6v-3.87a3.37 3.37 0 0
    0-.94-2.61c3.14-.35 6.44-1.54 6.44-7A5.44 5.44 0 0 0 20 4.77 5.07
    5.07 0 0 0 19.91 1S18.73.65 16 2.48a13.38 13.38 0 0 0-7 0C6.27.65
    5.09 1 5.09 1A5.07 5.07 0 0 0 5 4.77a5.44 5.44 0 0 0-1.5 3.78c0 5.42
    3.3 6.61 6.44 7A3.37 3.37 0 0 0 9 18.13V22"
							/>
						</svg>
					</a>
					<a aria-label="YouTube account" href="https://youtube.com/c/lihautan">
						<svg viewBox="0 0 461.001 461.001" width="1em" height="1em">
							<path
								d="M365.257 67.393H95.744C42.866 67.393 0 110.259 0 163.137v134.728c0 52.878 42.866 95.744 95.744 95.744h269.513c52.878 0 95.744-42.866 95.744-95.744V163.137c0-52.878-42.866-95.744-95.744-95.744zm-64.751 169.663-126.06 60.123c-3.359 1.602-7.239-.847-7.239-4.568V168.607c0-3.774 3.982-6.22 7.348-4.514l126.06 63.881c3.748 1.899 3.683 7.274-.109 9.082z"
							/>
						</svg>
					</a>
				</li>
			</ul>
			{#if tableOfContents?.length > 0}
				<div class="hr">. . .</div>
				<div class="toc">Table of Contents</div>
				<ol>
					{#each tableOfContents as { link, title, nested: n1 }}
						<li>
							<a on:click={hide} href="#{link}">{title}</a>
							{#if n1}
								<ol>
									{#each n1 as { link, title, nested: n2 }}
										<li>
											<a on:click={hide} href="#{link}">{title}</a>
											{#if n2}
												<ol>
													{#each n2 as { link, title, nested: n3 }}
														<li>
															<a on:click={hide} href="#{link}">{title}</a>
															{#if n3}
																<ol>
																	{#each n3 as { link, title, nested: n4 }}
																		<li>
																			<a on:click={hide} href="#{link}">{title}</a>
																			{#if n4}
																				<ol>
																					{#each n4 as { link, title }}
																						<li><a on:click={hide} href="#{link}">{title}</a></li>
																					{/each}
																				</ol>
																			{/if}
																		</li>
																	{/each}
																</ol>
															{/if}
														</li>
													{/each}
												</ol>
											{/if}
										</li>
									{/each}
								</ol>
							{/if}
						</li>
					{/each}
				</ol>
			{/if}
		</div>
		<!--svelte-ignore a11y-no-static-element-interactions -->
		<!--svelte-ignore a11y-click-events-have-key-events -->
		<div class="backdrop" on:click={() => (show = false)} transition:fade />
	{:else}
		<!--svelte-ignore a11y-no-static-element-interactions -->
		<!--svelte-ignore a11y-click-events-have-key-events -->
		<div class="float" on:click={() => (show = true)} transition:slide>
			<svg viewBox="0 0 30 50" width="30" height="50">
				<circle fill="currentColor" cy="15" cx="15" r="3" />
				<circle fill="currentColor" cy="25" cx="15" r="3" />
				<circle fill="currentColor" cy="35" cx="15" r="3" />
			</svg>
		</div>
	{/if}
</div>

<style>
	.sidebar {
		position: relative;
		z-index: 1;
	}

	@media only screen and (min-width: 770px) {
		.sidebar {
			display: none;
		}
	}

	.float {
		position: fixed;
		top: 20px;
		left: -4px;
		background: var(--background-color-1);
		padding-left: 4px;
		border-style: solid;
		border-width: 4px 4px 4px 0;
		color: var(--header-link-color);
		border-color: currentColor;
		box-shadow: 4px 4px;
		height: 50px;
		width: 34px;
	}

	.panel {
		position: fixed;
		top: 0;
		left: 0;
		max-width: 85vw;
		width: 600px;
		height: 100%;
		height: -moz-available; /* WebKit-based browsers will ignore this. */
		height: -webkit-fill-available; /* Mozilla-based browsers will ignore this. */
		height: fill-available;
		background-color: var(--background-color-1);
		z-index: 1;
		padding-top: 16px;
		padding-bottom: 16px;
		overflow: scroll;
		box-sizing: border-box;
	}
	.backdrop {
		position: fixed;
		top: 0;
		left: 0;
		z-index: -1;
		width: 100vw;
		height: 100vh;
		background: rgba(0, 0, 0, 0.4);
	}

	.links {
		list-style: none;
		padding: 0;
		margin: 0;
	}
	.links a {
		display: block;
		padding: 8px 16px;
		text-align: center;
	}
	.social {
		text-align: center;
	}
	.social a {
		display: inline-block;
		padding: 16px;
	}
	.hr {
		text-align: center;
		margin-bottom: 26px;
	}
	.toc {
		text-align: center;
		margin-bottom: 16px;
	}
	ol li:nth-child(n + 2),
	ol ol li {
		margin-top: 8px;
	}
	ol li:nth-child(n + 2) a,
	ol ol li a {
		padding-top: 8px;
	}

	ol {
		margin: 0;
		padding-left: 1.5em;
		list-style: disc;
	}
	ol ol {
		list-style: circle;
	}
	ol ol ol {
		list-style: square;
	}
</style>
