---
title: foo
---

```js
/// filename: babel.config.js
module.exports = {
	// highlight-next-line
	plugins: ['babel-plugin-macros']
};
```

```bash copy
# create a new project in the current directory
npm init svelte@next

# create a new project in my-app
npm init svelte@next my-app
```

```js
//// filename: rollup.config.js
/// copy: true
export default {
	plugins: [
		// ...
		// highlight-start
		{
			name: 'copy-worker',
			generateBundle() {
				fs.copyFileSync(path.resolve('./src/worker.js'), path.resolve('./public/build/worker.js'));
			}
		}
		// highlight-end
	]
};
```

```js diff
if (parser.eat('/')) {
  let block = parser.current();
  let expected;
  // ...
  if (block.type === 'IfBlock') {
    expected = 'if';
  } else if (block.type === 'EachBlock') {
    expected = 'each';
-  } else if (block.type === 'AwaitBlock') {
-    expected = 'await';
+  } else if (block.type === 'KeyBlock') {
+    expected = 'key';
  } else {
    parser.error({
      code: `unexpected-block-close`,
      message: `Unexpected block closing tag`
    });
  }
```

```diff-js
if (parser.eat('/')) {
  let block = parser.current();
  let expected;
  // ...
  if (block.type === 'IfBlock') {
    expected = 'if';
  } else if (block.type === 'EachBlock') {
    expected = 'each';
-  } else if (block.type === 'AwaitBlock') {
-    expected = 'await';
+  } else if (block.type === 'KeyBlock') {
+    expected = 'key';
  } else {
    parser.error({
      code: `unexpected-block-close`,
      message: `Unexpected block closing tag`
    });
  }
```

```js
/// twoslash: true
/// copy: true
const a = 1;
```

what do you want

```twoslash include main
const h1 = document.createElement('h1');
```

```ts twoslash
/// copy: true

const h1 = document.createElement('h1');
h1.textContent = 'Hello World';
// add class name to the h1 element
h1.setAttribute('class', 'abc');
// ...and add a <style> tag to the head
const style = document.createElement('style');
style.textContent = '.abc { color: blue; }';

document.head.appendChild(style);
document.body.appendChild(h1);
```

```ts twoslash {1, 3-4}
let a: number = 1;
async function foo({
	b,
	c: [d]
}: {
	b: number;
	c: [Map<string, { [key: string]: boolean }>];
}): Promise<void> {
	let g = (await b) + a;
	while (g-- > 0) {
		try {
			d.set(g + '1', { a: g > 32 });
		} catch (error: any) {
			await new Promise((resolve) => setTimeout(resolve, g));
		}
	}
}
```

```ts {1, 3-4}
let a: number = 1;
async function foo({
	b,
	c: [d]
}: {
	b: number;
	c: [Map<string, { [key: string]: boolean }>];
}): Promise<void> {
	let g = (await b) + a;
	while (g-- > 0) {
		try {
			d.set(g + '1', { a: g > 32 });
		} catch (error: any) {
			await new Promise((resolve) => setTimeout(resolve, g));
		}
	}
}
```

```ts twoslash {1,2,4-5}
function greet(person: string) {
	console.log(`Hello ${person},`);
	// @log: Hello world
	console.log(`How do?`);
	// @warn: Hello world
	// @error: Hello world
}
greet('Maddison');
```
