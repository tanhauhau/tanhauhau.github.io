
export async function load({ params, fetch }) {
	const response = await fetch(`/api/tags/${params.name}.json`);
	const data = await response.json();
	return {
		items: data, tag: params.name
	};
}
