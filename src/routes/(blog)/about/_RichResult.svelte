<script>
	import ldJsonScript from '$lib/seo/ldjson';
</script>

<svelte:head>
	{@html ldJsonScript({
		'@context': 'https://schema.org',
		'@type': 'FAQPage',
		mainEntity: [
			{
				'@type': 'Question',
				name: "What is Li Hau's Chinese name?",
				acceptedAnswer: {
					'@type': 'Answer',
					text: '陈立豪'
				}
			},
			{
				'@type': 'Question',
				name: 'Where did Li Hau grew up in?',
				acceptedAnswer: {
					'@type': 'Answer',
					text: "In a lovely town named <a href='https://en.wikipedia.org/wiki/Bukit_Mertajam'>Bukit Mertajam</a> in Penang, Malaysia"
				}
			},
			{
				'@type': 'Question',
				name: 'What languages does Li Hau speak?',
				acceptedAnswer: {
					'@type': 'Answer',
					text: "Chinese, English, <a href='https://en.wikipedia.org/wiki/Malay_language'>Malay</a> and <a href='https://en.wikipedia.org/wiki/Hokkien'>Hokkien</a>"
				}
			}
		]
	})}
</svelte:head>
