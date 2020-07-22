---
title: adding monaco to the svelte repl
date: '2020-03-22T08:00:00Z'
tag: Svelte, JavaScript
wip: true
---

# monaco samples:
https://github.com/microsoft/monaco-editor-samples/blob/master/browser-amd-monarch/index.html


tab + history undo buffer
- link to issues that was fixed previously

get inspiration from the playground
- it has 3 tabs
https://microsoft.github.io/monaco-editor/playground.html

```js
function changeTab(selectedTabNode, desiredModelId) {
  for (var i = 0; i < tabArea.childNodes.length; i++) {
    var child = tabArea.childNodes[i];
    if (/tab/.test(child.className)) {
      child.className = 'tab';
    }
  }
  selectedTabNode.className = 'tab active';

  var currentState = editor.saveViewState();

  var currentModel = editor.getModel();
  if (currentModel === data.js.model) {
    data.js.state = currentState;
  } else if (currentModel === data.css.model) {
    data.css.state = currentState;
  } else if (currentModel === data.html.model) {
    data.html.state = currentState;
  }

  editor.setModel(data[desiredModelId].model);
  editor.restoreViewState(data[desiredModelId].state);
  editor.focus();
}
```

```js
loadSample(sampleId, function (err, sample) {
  if (err) {
    alert('Sample not found! ' + err.message);
    return;
  }
  if (myToken !== currentToken) {
    return;
  }
  data.js.model.setValue(sample.js);
  data.html.model.setValue(sample.html);
  data.css.model.setValue(sample.css);
  editor.setScrollTop(0);
  run();
});
```

		data.js.model = monaco.editor.createModel('console.log("hi")', 'javascript');
		data.css.model = monaco.editor.createModel('css', 'css');
		data.html.model = monaco.editor.createModel('html', 'html');

		editor = monaco.editor.create(editorContainer, {
			model: data.js.model,
			minimap: {
				enabled: false
			}
		});

- how to add svlete language server into it
- markdown 

** store as global variable
  - window.xxx
  - right-click, "store as global variable"
  quickly test out apis, without having to wait for reload

- allow switching tabs
create new model on new tab / init
store the state when switching tabs
restore state upon selecting tabs

- listen to changes
```js
editor.onDidChangeModelContent
```


## syntax highlighting

this is rough man
- https://gearset.com/blog/writing-an-open-source-apex-syntax-highlighter-for-monaco-editor
  - vs code vs monaco
  - text mate grammars, language servers, monarch grammars
  - native library
- https://github.com/microsoft/monaco-editor/issues/171

- implement a monaco language, shouldn't be hard? 🤷‍♂️

playground https://microsoft.github.io/monaco-editor/monarch.html

- proxy based language server
  - https://medium.com/dscddu/language-server-protocol-adding-support-for-multiple-language-servers-to-monaco-editor-a3c35e42a98d
