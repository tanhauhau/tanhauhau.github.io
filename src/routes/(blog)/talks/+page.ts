export async function load({ fetch }) {
  const response = await fetch('/api/talks.json');
  const data = await response.json();

  return {
    talks: data
  }
}
