export function convertTextToSpan(elem) {
  if (elem.childNodes.length === 1 && elem.childNodes[0].nodeName === '#text') {
    return;
  }
  elem.childNodes.forEach(c => {
    if (c.nodeName === '#text') {
      if (c.data.trim().length > 0) {
        const s = document.createElement('span');
        c.replaceWith(s);
        s.appendChild(c);
      }
    } else {
      convertTextToSpan(c);
    }
  });

  return {
    update(tokenize) {
      if (tokenize) {
        toggleOnClass(elem);
      } else {
        toggleOffClass(elem);
      }
    },
  };
}

function toLexToken(elem) {}

function toggleOnClass(elem) {
  if (elem.childNodes.length === 1 && elem.childNodes[0].nodeName === '#text') {
    elem.classList.add('lex-token');
    return;
  }
  elem.childNodes.forEach(c => {
    if (c.nodeName !== '#text') {
      toggleOnClass(c);
    }
  });
}
function toggleOffClass(elem) {
  elem.querySelectorAll('.lex-token').forEach(c => {
    c.classList.remove('lex-token');
  });
}
