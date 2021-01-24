import Prism from 'prismjs';
import 'prism-svelte';

export function prism(node, { code, lang }) {
  renderPrism(node, code, lang);

  return {
    update({ code, lang }) {
      renderPrism(node, code, lang);
    },
  };
}

function renderPrism(node, code, lang, noTrim) {
  if (noTrim !== true) {
    code = code.trim();
  }
  let html = Prism.highlight(code, lang);
  html = html
    .split('\n')
    .map(line => line.replace(/^(\s+)/, (_, m) => '<span class="tab"></span>'.repeat(m.length / 2)))
    .join('<br />');
  node.innerHTML = html;
}

function prismLang(lang, noTrim) {
  return function prism(node, code) {
    renderPrism(node, code, lang, noTrim);
    return {
      update(code) {
        renderPrism(node, code, lang, noTrim);
      },
    };
  };
}

export const prismHtml = prismLang(Prism.languages.html);
export const prismJs = prismLang(Prism.languages.javascript);
export const prismJsNoTrim = prismLang(Prism.languages.javascript, true);
export const prismSvelte = prismLang(Prism.languages.svelte);
