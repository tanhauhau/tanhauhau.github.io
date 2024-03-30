export async function load({ fetch }) {
  const response = await fetch('/api/blogs.json');
  const data = await response.json();
  return {
    blogs: data
  };
}