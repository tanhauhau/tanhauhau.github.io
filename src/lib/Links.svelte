<script>
	export let mode = 'home';
</script>

<ul class="mode-{mode}">
	{#if mode !== 'home'}<li><a href="/">Tan Li Hau</a></li>{/if}
	<li class="desktop"><a data-sveltekit-preload-data href="/about">About</a></li>
	<li class="desktop"><a data-sveltekit-preload-data href="/blogs">Writings</a></li>
	<li class="desktop"><a data-sveltekit-preload-data href="/talks">Talks</a></li>
	<li class="desktop"><a data-sveltekit-preload-data href="/notes">Notes</a></li>
	<li class="desktop"><a data-sveltekit-preload-data href="/books">Books</a></li>
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

<style>
	svg {
		height: 1em;
		width: 1em;
		position: relative;
		top: 2px;
		fill: #612e77;
	}

	ul {
		margin: 0;
		padding: 0;
		list-style: none;
	}
	ul:global(.mode-home) {
		text-align: center;
		margin-top: 1em;
		display: block;
	}

	ul:global(.mode-home) li {
		display: inline-block;
	}

	a:hover {
		box-shadow: 8px 8px;
		transform: translate(-2px, -2px);
	}

	a {
		list-style: none;
		box-shadow: 4px 4px;
		margin-bottom: 1.2em;
		margin-right: 0.8em;
		border: 4px solid;
		padding: 4px 8px;
		text-decoration: none;
		display: inline-block;
		transition: 100ms ease;
		font-weight: 500;
		color: var(--header-link-color);
	}

	ul:global(.mode-sidebar) .social {
		margin-top: 2em;
	}

	@media only screen and (max-width: 1100px) {
		ul:global(.mode-sidebar) {
			display: block;
		}
		ul:global(.mode-sidebar) li {
			display: inline-block;
		}
		ul:global(.mode-sidebar) .social {
			margin-top: 0;
		}
	}
	@media only screen and (max-width: 769px) {
		ul:global(.mode-sidebar) .desktop {
			display: none;
		}
	}
	@media only screen and (max-width: 425px) {
		ul:global(.mode-sidebar) .social {
			display: none;
		}
	}
</style>
