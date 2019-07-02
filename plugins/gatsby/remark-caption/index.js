const visit = require('unist-util-visit');
const rehype = require('rehype');

module.exports = function({ markdownAST }) {
  visit(markdownAST, 'html', (node, index, parent) => {
    if (
      typeof node.url === 'string' &&
      typeof node.title === 'string' &&
      typeof node.alt === 'string'
    ) {
      node.value = rehype()
        .use(addCaption, { title: node.title })
        .data('settings', { fragment: true })
        .processSync(node.value)
        .toString();
    } else if (node.type === 'html' && typeof node.lang === 'string') {
      const next = parent.children[index + 1];
      if (
        next &&
        next.type === 'paragraph' &&
        next.children.length === 1 &&
        next.children[0].type === 'emphasis'
      ) {
        const caption = next.children[0].children
          .map(html => html.value)
          .join('');
        parent.children[index + 1] = {
          type: 'html',
          value: `<div class="caption">${caption}</div>`,
        };
      }
    }
  });
};

function addCaption({ title }) {
  return function(node) {
    visit(
      node,
      {
        tagName: 'span',
      },
      node => {
        if (
          Array.isArray(node.properties.className) &&
          node.properties.className.includes('gatsby-resp-image-wrapper')
        ) {
          // converting
          //
          // span.gatsby-resp-image-wrapper
          //    img
          //
          // into
          //
          // figure.gatsby-resp-image-wrapper
          //    img
          //    figcaption[text=title]
          //
          node.children.push({
            type: 'element',
            tagName: 'figcaption',
            properties: {},
            children: [{ type: 'text', value: title }],
          });
          node.tagName = 'figure';
        }
      }
    );
    return node;
  };
}
