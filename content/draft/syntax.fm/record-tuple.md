🎧 the latest episode of @SyntaxFM about Record and Tuples

https://syntax.fm/show/287/hasty-treat-records-and-tuples-in-javascript

👬 Immutability
- cannot change things that are immutable
- if you have an immutable array, you can't add an item to / remove an item from the array. and when you change it, you get a new version of the array

You can think of

📝 `record` as `immutable object`
✍️ record start with `#` + object syntax

📝 `tuple` as `immutable array`
✍️ tupe start with `#` + array syntax

📝 you can access the value in `record` and `tuple` like how you would for object and array

```js
const record = #{ a: 1, b: 2 };
record.a // 1
const tuple = #[1, 2, 3];
tuple[1] // 2
```

Object.freeze does not freeze the object deeply, you still possible to mutate the nested object

```js
const frozen = Object.freeze({ a: { b: 2 } });
frozen.a = 1; // 🚫 you can't change frozen.a
frozen.a.b = 1; // frozen.a.b is now 1. 😢

const record = #{ a: #{ b: 2 } };
record.a = 1; // 🚫 you can't change record.a
record.a.b = 1; // 🚫 you can't change record.a.b
```

Records and Tuples is a compound primitives.

📝 Records and Tuples can only contain primitives and other Records and Tuples.
📝 As any primitives, you can use `typeof` on records and tuples

```js
typeof #{ a: 1 } === 'record'
typeof #[1, 2] === 'tuple'
```

As any primitives, you can compare record / tuples by value

📝 record and tuples content will be compared deeply

```js
{ a: 1 } !== { a: 1 } // compare by reference
#{ a: 1 } === #{ a: 1 } // compare the value deeply
```

```js
function get_text(recipe) {
  switch (recipe) {
    case #{ water: 5, food: 1 }:
      return 'low in food';
    case #{ water: 5, food: 3 }:
      return 'just nice';
    case #{ water: 5, food: 5 }:
      return 'balanced';
    default:
      return 'unknown';
  }
}

get_text(#{ water: 5, food: 3 }); // 'just nice'
```

📝 you can spread / destructuring Records and Tuples like objects and arrays

```js
// spreading records
#{...#{ a: 1 }, b: 2 }
#{...{ a: 1 }, b: 2 }

// spreading tuples
#[...#[1, 2], 3, 4]
#[...[1, 2], 3, 4]

// destructure
const [head, ...rest] = #[1, 2, 3]
const { a, ...rest } = #{ a: 1, b: 2, c: 3 }
```

📝 JSON.parseImmutable to parse JSON string into Record and Tuple

```js
JSON.parse("{a:[1]}"); // { a: [1] }
JSON.parseImmutable("{a:[1]}"); // #{ a: #[1] }
```

🔗 Proposal: https://github.com/tc39/proposal-record-tuple
🔗 Playground: https://rickbutton.github.io/record-tuple-playground/
🔗 Cookbook: https://tc39.es/proposal-record-tuple/cookbook/

Record({ a: 1 })
Tuple.from([1, 2])
