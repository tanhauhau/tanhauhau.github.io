<script>
	export let data;
</script>

<section>
	<ul role="navigation" aria-label="Table of Contents">
		{#each data as { link, title, nested: n1 }}
			<li><a href="#{link}">{title}</a></li>
			{#if n1}
				<ul>
					{#each n1 as { link, title, nested: n2 }}
						<li><a href="#{link}">{title}</a></li>
						{#if n2}
							<ul>
								{#each n2 as { link, title, nested: n3 }}
									<li><a href="#{link}">{title}</a></li>
									{#if n3}
										<ul>
											{#each n3 as { link, title, nested: n4 }}
												<li><a href="#{link}">{title}</a></li>
												{#if n4}
													<ul>
														{#each n4 as { link, title }}
															<li><a href="#{link}">{title}</a></li>
														{/each}
													</ul>
												{/if}
											{/each}
										</ul>
									{/if}
								{/each}
							</ul>
						{/if}
					{/each}
				</ul>
			{/if}
		{/each}
	</ul>
</section>

<style>
	li:nth-child(n + 2),
	ul ul li {
		margin-top: 8px;
	}
	ul {
		margin: 0;
		padding-left: 1.5em;
	}
	section {
		background: white;
		border: 4px solid;
		box-shadow: var(--box-shadow);
		padding: 1.6em 2.6em 1.6em 1.1em;
		margin: 1em 0;
	}
</style>
