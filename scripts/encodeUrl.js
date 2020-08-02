function encodeUrl(url) {
  const map = { ['%3A']: ':', ['%2F']: '/' };
  url = encodeURIComponent(url);
  return url.replace(/(%3A|%2F)/g, match => map[match]);
}
exports.encodeUrl = encodeUrl;
