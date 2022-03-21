<script>
	export let data;
</script>

<section>
	<ol role="navigation" aria-label="Table of Contents">
		{#each data as { link, title, nested: n1 }}
			<li>
				<a href="#{link}">{title}</a>
				{#if n1}
					<ol>
						{#each n1 as { link, title, nested: n2 }}
							<li>
								<a href="#{link}">{title}</a>
								{#if n2}
									<ol>
										{#each n2 as { link, title, nested: n3 }}
											<li>
												<a href="#{link}">{title}</a>
												{#if n3}
													<ol>
														{#each n3 as { link, title, nested: n4 }}
															<li>
																<a href="#{link}">{title}</a>
																{#if n4}
																	<ol>
																		{#each n4 as { link, title }}
																			<li><a href="#{link}">{title}</a></li>
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
</section>

<style>
	li:nth-child(n + 2),
	ol ol li {
		margin-top: 8px;
	}
	li:nth-child(n + 2) a,
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

	section {
		background: white;
		border: 4px solid;
		box-shadow: var(--box-shadow);
		padding: 1.6em 2.6em 1.6em 1.1em;
		margin: 1em 0;
	}
</style>
