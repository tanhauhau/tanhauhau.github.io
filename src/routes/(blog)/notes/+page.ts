export async function load({ fetch }) {
	const response = await fetch('/api/notes.json');
	const data = await response.json();
	return {
		notes: data
	};
}
