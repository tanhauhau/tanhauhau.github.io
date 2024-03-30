export async function load({ params, fetch }) {
  const response = await fetch(`/api/series/${params.name}.json`);
  const data = await response.json();
  return {
    items: data, series: params.name
  };
}