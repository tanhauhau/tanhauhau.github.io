function renderTemplate(template, map) {
  return template.replace(/{{([^}]+)}}/g, (_, key) => map[key] || '');
}
exports.renderTemplate = renderTemplate;
