
export async function load({ fetch }) {
	const response = await fetch('/api/series.json');
	const data = await response.json();
	return {
		series: data
	};
}
