const visit = require('unist-util-visit');
const rehype = require('rehype');

const COMMENTS = {
  html: /^<!--\s+filename:\s+(\S+)\s+-->/,
  js: /^\/\/\s+filename:\s+(\S+)/,
  jsx: /^\/\/\s+filename:\s+(\S+)/,
  text: /^filename:\s+(\S+)/,
  none: /^filename:\s+(\S+)/,
  md: /^<!--\s+filename:\s+(\S+)\s+-->/,
  css: /^\/\*\s+filename:\s+(\S+)\s+\*\//,
  yml: /^#\s+filename:\s+(\S+)/,
  sh: /^#\s+filename:\s+(\S+)/,
  json: /^NO_COMMNENTS/,
};
module.exports = function({ markdownAST }) {
  const operations = [];

  visit(markdownAST, 'code', (node, index, parent) => {
    if (!node.lang) return;

    const commentRegex = COMMENTS[cleanupLang(node.lang)];
    if (!commentRegex) {
      throw new Error('remark-filename: ' + node.lang + ' not supported');
    }

    const filenameMatch = node.value.match(commentRegex);
    node.value = node.value.replace(commentRegex, '').trimLeft();

    if (filenameMatch) {
      operations.push({
        parent,
        index,
        toAdd: {
          type: 'html',
          value: `<p class="filename">${filenameMatch[1]}</p>`,
        },
      });
    }
  });

  // assuming that for each parent, index always descending, so safe to just `splice`
  operations.reverse().forEach(({ parent, index, toAdd }) => {
    parent.children.splice(index, 0, toAdd);
  });
};

function cleanupLang(lang) {
  const index = lang.indexOf('{');
  if (index === -1) {
    return lang;
  }
  return lang.slice(0, index);
}
