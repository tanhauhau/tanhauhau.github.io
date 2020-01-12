const retext = require('retext');
const smartypants = require('retext-smartypants');

// Based on https://github.com/gatsbyjs/gatsby/blob/master/packages/gatsby-remark-smartypants/src/index.js
function remarkSmartypants() {
  return {
    text(node) {
      const processedText = String(
        retext()
          .use(smartypants)
          .processSync(node.value)
      );
      node.value = processedText;
    },
  };
}

const Prism = require('prismjs');
require('prismjs/components/prism-javascript');

function remarkPrism() {
  return {
    code(node) {
      const language = 'javascript';
      const grammar = Prism.languages[language];
      const highlighted = Prism.highlight(node.value, grammar, language);
      node.type = 'html';
      node.value = `` 
        + `<pre>`
        +   `<code class="language-${language}">${highlighted}</code>`
        + `</pre>`;
    }
  }
}

const plugins = [remarkSmartypants, remarkPrism];

function remarkTransform() {
  return (ast) => {
    const visitors = {};
    plugins.forEach(plugin => {
      const pluginVisitor = plugin();
      for(const type in pluginVisitor) {
        visitors[type] = visitors[type] || [];
        visitors[type].push(pluginVisitor[type]);
      }
    });

    function traverse(node) {
      const { type } = node;
      if (type in visitors) {
        for(const visitor of visitors[type]) {
          visitor(node);
        }
      }
      if (node.children) {
        for (const child of node.children) {
          traverse(child);
        }
      }
    }

    traverse(ast);

    return ast;
  }
}

module.exports = remarkTransform;