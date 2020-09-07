import Prism from 'prismjs';
import 'prism-svelte';

export function prism(node, { code, lang }) {
  renderPrism(node, code, lang);
  
  return {
    update({ code, lang }) {
      renderPrism(node, code, lang);
    }
  }
}

function renderPrism(node, code, lang) {
  code = code.trim();
  let html = Prism.highlight(code, lang);
  html = html
    .split('\n')
    .map(line => line.replace(/^(\s+)/, (_, m) => '<span class="tab"></span>'.repeat(m.length / 2)))
    .join('<br />');
  node.innerHTML = html; 
}