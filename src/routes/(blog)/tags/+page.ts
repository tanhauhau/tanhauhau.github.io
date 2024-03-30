export async function load({ fetch }) {
	const response = await fetch('/api/tags.json');
	const data = await response.json();
	return {
		tags: data
	};
}
