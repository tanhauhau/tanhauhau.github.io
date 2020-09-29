🎧 the latest episode of @SyntaxFM about Record and Tuples

https://syntax.fm/show/287/hasty-treat-records-and-tuples-in-javascript

👬 Immutability
- cannot change things that are immutable
- if you have an immutable array, you can't add an item to / remove an item from the array. and when you change it, you get a new version of the array


record -> immutable object
tuple -> immutable array

const record = #{ a: 1, b: 2 };
record.a // 1
const tuple = #[1, 2, 3];
tuple[1] // 2

Object.freeze does not freeze the object deeply, you still possible to mutate the nested object

Compound primitives

Records and Tuples can only contain primitives and other Records and Tuples. You could think of Records and Tuples as "compound primitives". By being thoroughly based on primitives, not objects, Records and Tuples are deeply immutable.


typeof #{ a: 1 } === 'record'
typeof #[1, 2] === 'tuple'

comparable deeply
{ a: 1 } !== { a: 1 } // compare by reference
#{ a: 1 } === #{ a: 1 } // compare the value deeply

🔗 Playground: https://rickbutton.github.io/record-tuple-playground/
🔗 Proposal: https://github.com/tc39/proposal-record-tuple
🔗 Cookbook: https://tc39.es/proposal-record-tuple/cookbook/

Record({ a: 1 })
Tuple.from([1, 2])

JSON.parseImmutable

#{...#{ a: 1 }, b: 2 }
#[...[1, 2], 3, 4]