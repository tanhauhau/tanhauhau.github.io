const visit = require('unist-util-visit');
const emojiRegex = require('emoji-regex');

module.exports = function({ markdownAST }) {
  visit(markdownAST, 'text', node => {
    node.type = 'html';
    node.value = node.value.replace(
      emojiRegex(),
      val => `<span class="emoji">${val}</span>`
    );
  });
};
