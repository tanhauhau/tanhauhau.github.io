---
title: Extract parameter types from string literal types with TypeScript
description: "Parse and derive types from string literal types in TypeScript using the Template Literal Types, turning `'/purchase/[shopid]/[itemid]/args/[...args]'` into `{ shopid: number, itemid: number, args: string[] }`"
date: '2022-03-27T08:00:00Z'
tags: 
  - typescript
  - template literal type
  - conditional type
series: Compile Svelte in your head
label: blog
---

## The Challenge

First of all, here's a TypeScript challenge for you:

```tsx
/// include: challenge
type PathSegments<Path extends string> = Path extends `${infer SegmentA}/${infer SegmentB}`
	? ParamOnly<SegmentA> | PathSegments<SegmentB>
	: ParamOnly<Path>;
type ParamOnly<Segment extends string> = Segment extends `[${infer Param}]`
	? Param
	: Segment extends `:${infer Param}`
	? Param
	: never;
type Value<Param extends string> = Param extends `...${infer Name}` ? string[] : number;
type Strip<Param extends string> = Param extends `...${infer Name}` ? Name : Param;

const app = {
	get<Path extends string>(
		path: Path,
		fn: (req: { params: { [Key in PathSegments<Path> as Strip<Key>]: Value<Key> } }) => void
	) {}
};
```

Can you figure how to define the TypeScript type for the `app.get` method below?

```ts twoslash
// @include: challenge
// ---cut---
app.get('/purchase/[shopid]/[itemid]/args/[...args]', (req) => {
	const { params } = req;
	//          ^?
});
app.get('/docs/[chapter]/[section]', (req) => {
	const { params } = req;
	//          ^?
});
```

_Try and hover the variables to look at their types._

_Notice that `...args` is a string array instead of number_ 🤯

The `req.params` is derived from the string passed in as the 1st parameter.

This is useful when you want to define types for a routing-like function, where you can pass in a route with path pattern that you can define dynamic segments with custom syntax (eg: `[shopid]` or `:shopid`), and a callback function, where the argument type is derived from the route that you just passed in.

So if you try to access parameter that is not defined, you get an error!

```ts twoslash
// @include: challenge
// @errors: 2339
// ---cut---
app.get('/purchase/[shopid]/[itemid]/args/[...args]', (req) => {
	const { foo } = req.params;
});
```

A real-world use-case for this, if you are more familiar with [React Router](https://v5.reactrouter.com/), is to derive the type for `routeProps` in the [render](https://v5.reactrouter.com/web/api/Route/render-func) function from the `path` props:

```tsx twoslash
import React from 'react';
function Route<Path extends string>({}: {
	path: Path;
	render: (routeProps: {
		match: { params: { [Key in PathSegments<Path> as Strip<Key>]: string } };
	}) => void;
}) {
	return <div />;
}
// @include: challenge
// ---cut---
<Route
	path="/user/:username"
	render={(routeProps) => {
		const params = routeProps.match.params;
		//        ^?
	}}
/>;
```

In this article, we are going to explore how to define such a type, through various TypeScript techniques, extracting types from a string literal type.

## Things you need to know

First thing first, let's talk through some basic knowledges required before we go on and tackle the problem.

### String Literal Type

Type `string` in TypeScript is a string that can have any value:

```ts twoslash
let str: string = 'abc';
str = 'def'; // no errors, string type can have any value
```

However, a [string literal type](https://www.typescriptlang.org/docs/handbook/2/everyday-types.html#literal-types), is a string type with a specific value:

```ts twoslash
// @errors: 2322
let str: 'abc' = 'abc';
str = 'def';
```

Most of the time, we use this alongside with [Union Types](https://www.typescriptlang.org/docs/handbook/2/everyday-types.html#union-types) to determine a list of string values you can pass to a function / array / object:

```ts twoslash
// @errors: 2345 2322
function eatSomething(food: 'sushi' | 'ramen') {}
eatSomething('sushi');
eatSomething('ramen');
eatSomething('pencil');

let food: Array<'sushi' | 'ramen'> = ['sushi'];
food.push('pencil');

let object: { food: 'sushi' | 'ramen' };
object = { food: 'sushi' };
object = { food: 'pencil' };
```

So how do you create a string literal type?

When you define a string variable with `const`, it is of type string literal. However if you defined it with `let`, TypeScript sees that the value of the variable could change, so it assigns the variable to a more generic type:

```ts twoslash
const food = 'sushi';
//    ^?
let drinks = 'beer';
//  ^?
```

The same reasoning applies to objects and arrays, as you can mutate the object / array value afterwards, so TypeScript assigns a more generic type:

```ts twoslash
const object = { food: 'sushi' };
//     ^?
const array = ['sushi'];
//    ^?
```

However, you can hint TypeScript that you would only read the value from the object / array and not mutate it, by using the [`const` assertions](https://www.typescriptlang.org/docs/handbook/release-notes/typescript-3-4.html#const-assertions)

```ts twoslash
const object = { food: 'sushi' } as const;
//     ^?
const array = ['sushi'] as const;
//    ^?
```

Hover over to the `object.food` property and you'll see that now the type is a string literal `'sushi'` rather than `string`!

Differentiating a string literal type vs a string type allows TypeScript to know not just the type, as well the value of a string.

#### Template Literal and String Literal Types

Since [TypeScript 4.1](https://www.typescriptlang.org/docs/handbook/release-notes/typescript-4-1.html#template-literal-types), TypeScript supports a new way to define a new string literal types, which is to use the familiar syntax of [Template literals](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Template_literals):

```ts twoslash
const a = 'a';
const b = 'b';
// In JavaScript, you can build a new string
// with template literals
const c = `${a} ${b}`; // 'a b'

type A = 'a';
type B = 'b';
// In TypeScript, you can build a new string literal type
// with template literals too!
type C = `${A} ${B}`;
//   ^?
```

### Conditional Type

[Conditional Types](https://www.typescriptlang.org/docs/handbook/2/conditional-types.html) allow you to define a type based on another type. In this example, `Collection<X>` can be either `number[]` or `Set<number>` depending on the type of `X`:

```ts twoslash
type Collection<X> = X extends 'arr' ? number[] : Set<number>;

type A = Collection<'arr'>;
//   ^?
// If you pass in something other than 'arr'
type B = Collection<'foo'>;
//   ^?
```

You use the `extends` keyword to test if the type `X` can be assigned to the type `'arr'`, and conditional operator (`condition ? a : b`) to determine the type if it test holds true or otherwise.

If you try to test a more complex type, you can infer parts of the type using the `infer` keyword, and define a new type based on the inferred part:

```ts twoslash
// Here you are testing whether X extends `() => ???`
// and let TypeScript to infer the `???` part
// TypeScript will define a new type called
// `Value` for the inferred type
type GetReturnValue<X> = X extends () => infer Value ? Value : never;

// Here we inferred that `Value` is type `string`
type A = GetReturnValue<() => string>;
//   ^?

// Here we inferred that `Value` is type `number`
type B = GetReturnValue<() => number>;
//   ^?
```

### Function Overloads and Generic Functions

Whenever you want to define the type of a function in TypeScript, where the argument types and the return type depends on each other, you'll probably will reach out for either [Function Overloads](https://www.typescriptlang.org/docs/handbook/2/functions.html#function-overloads) or [Generic Functions](https://www.typescriptlang.org/docs/handbook/2/functions.html#generic-functions).

What do I meant by having the argument types and return types depending on each other?

Here's an example where the return type is based on the argument type:

```ts twoslash
function firstElement<Type>(arr: Type[]): Type | undefined;
// ---cut---
function firstElement(arr) {
	return arr[0];
}

const string = firstElement(['a', 'b', 'c']);
const number = firstElement([1, 2, 3]);
```

... and here's another example where the 2nd argument type is based on the 1st argument type (argument types depending on each other):

```ts twoslash
type Data<Op extends string> = Op extends 'add'
	? { addend_1: number; addend_2: number }
	: Op extends 'divide'
	? { dividend: number; divisor: number }
	: never;
function calculate<Op extends string>(operation: Op, data: Data<Op>): number | undefined;
// ---cut---
function calculate(operation, data) {
	if (operation === 'add') {
		return data.addend_1 + data.addend_2;
	} else if (operation === 'divide') {
		return data.dividend / data.divisor;
	}
}

calculate('add', { addend_1: 1, addend_2: 2 });
calculate('divide', { dividend: 42, divisor: 7 });
```

So, how do you define a function like this?

If you define

```ts twoslash
function firstElement(arr: string[] | number[]): string | number {
	return arr[0];
}
```

then whatever returned is type `string | number`. This doesnt capture the essence of the function, which should return `string` if called the function with `string[]` and return `number` if you called with `number[]`.

Instead, you can define the function via [function overloads](https://www.typescriptlang.org/docs/handbook/2/functions.html#function-overloads), which is to define multiple function signatures, followed by the implementation:

```ts twoslash
// return string when passed string[]
function firstElement(arr: string[]): string;
// return number when passed number[]
function firstElement(arr: number[]): number;
// then the actual implementation
function firstElement(arr) {
	return arr[0];
}

const string = firstElement(['a', 'b', 'c']);
//    ^?
```

Alternatively, you can define a [generic function](https://www.typescriptlang.org/docs/handbook/2/functions.html#generic-functions), which declares a _type parameter_, and describe the argument type and return type in terms of the _type parameter_:

```ts twoslash
// Define type parameter `Item` and describe argument and return type in terms of `Item`
function firstElement<Item>(arr: Item[]): Item | undefined {
	return arr[0];
}
```

A plus point for generics is that the `Item` type can be any types, and TypeScript can infer what the `Item` type represents from the arguments you called the function with, and dictates what the return type should be based on the `Item` type

```ts twoslash
function firstElement<Item>(arr: Item[]): Item | undefined {
	return arr[0];
}
// ---cut---
const obj = firstElement([{ a: 1 }, { a: 3 }, { a: 5 }]);
//    ^?
```

If you do it with function overload, on the other hand, you'll probably have to define each and every possible function signatures.

But maybe you just want to pass in `string[]` or `number[]` to `firstElement(...)` only, so it's not a problem for function overloads.

Also, you can provide a constraint for the generic function, limiting that the `Item` type parameter can only be a certain type, by using the `extends` keyword:

```ts twoslash
// @errors: 2322
// `Item` can only be of `string` or `number`
function firstElement<Item extends string | number>(arr: Item[]): Item | undefined {
	return arr[0];
}
const number = firstElement([1, 3, 5]);
const obj = firstElement([{ a: 1 }, { a: 3 }, { a: 5 }]);
```

## Working on the problem

Knowing [generic functions](#function-overloads-and-generic-functions), our solution to the problem will probably take the form:

```ts
function get<Path extends string>(path: Path, callback: CallbackFn<Path>): void {
	// impplementation
}

get('/docs/[chapter]/[section]/args/[...args]', (req) => {
	const { params } = req;
});
```

We use a type parameter `Path`, which has to be a `string`. The `path` argument is of type `Path` and the callback will be `CallbackFn<Path>`, and the crux of the challenge is to figure out `CallbackFn<Path>`.

### The Game Plan

So here's the plan:

0. Given the type of the path as `Path`, which is a [string literal type](#string-literal-type),

```ts
type Path = '/purchase/[shopid]/[itemid]/args/[...args]';
```

1. We derive a new type which has the string break into it's parts _[[jump here](#splitting-a-string-literal-type)]_

```ts
type Parts<Path> = 'purchase' | '[shopid]' | '[itemid]' | 'args' | '[...args]';
```

2. Filter out the parts to contain only the params _[[jump here](#filter-out-only-the-parts-containing-the-param-syntax)]_

```ts
type FilteredParts<Path> = '[shopid]' | '[itemid]' | '[...args]';
```

3. Remove the brackets _[[jump here](#removing-the-brackets)]_

```ts
type FilteredParts<Path> = 'shopid' | 'itemid' | '...args';
```

4. Map the parts into an [object type](https://www.typescriptlang.org/docs/handbook/2/objects.html) _[[jump here](#map-the-parts-into-an-object-type)]_

```ts
type Params<Path> = {
	shopid: any;
	itemid: any;
	'...args': any;
};
```

5. Using [Conditional Types](https://www.typescriptlang.org/docs/handbook/2/conditional-types.html) to define the map value _[[jump here](#defining-the-map-value)]_

```ts
type Params<Path> = {
	shopid: number;
	itemid: number;
	'...args': string[];
};
```

6. Remap keys to remove `'...'` in `...args` _[[jump here](#remap-keys-to-remove)]_

```ts
type Params<Path> = {
	shopid: number;
	itemid: number;
	args: string[];
};
```

7. Finally

```ts
type CallbackFn<Path> = (req: { params: Params<Path> }) => void;
```

### Splitting a String Literal Type

To split a string literal type, we can use a [conditional type](#conditional-type) to check the value of the string literal:

```ts twoslash
type Parts<Path> = Path extends `a/b` ? 'a' | 'b' : never;
type AB = Parts<'a/b'>;
//   ^?
```

but to take in any string literal, that we have no idea of the value ahead of time,

```ts
type CD = Parts<'c/d'>;
type EF = Parts<'e/f'>;
```

we will have to `infer` the value in the conditional tests, and use the inferred value type:

```ts twoslash
type Parts<Path> = Path extends `${infer PartA}/${infer PartB}`
  ? PartA | PartB
  : never;
type AB = Parts<'a/b'>;
//   ^?
type CD = Parts<'c/d'>;
//   ^?
type EFGH = Parts<'ef/gh'>;
//   ^?
```

And if you pass in a string literal that does not match the pattern, we want to return the same string literal type passed in.
So, we return the `Path` type in the `false` condition branch:

```ts twoslash
type Parts<Path> = Path extends `${infer PartA}/${infer PartB}`
  ? PartA | PartB
// highlight-next-line
  : Path;
type A = Parts<'a'>;
//   ^?
```

At this point, you noticed that `PartA` will infer "non-greedily", ie: it will try to infer as much as possible, but do not contain a `"/"` character:

```ts twoslash
type Parts<Path> = Path extends `${infer PartA}/${infer PartB}` ? PartA | PartB : Path;
// ---cut---
type ABCD = Parts<'a/b/c/d'>;
//   ^?
// type PartA = 'a';
// type PartB = 'b/c/d';
```

So, to split the `Path` string literal recursively, we can return the type `Parts<PathB>` instead of `PathB`:

```ts twoslash
/// filename: Step 1: Parts<Path>
/// copy: true
type Parts<Path> = Path extends `${infer PartA}/${infer PartB}`
// highlight-next-line
  ? PartA | Parts<PartB>
  : Path;

type ABCD = Parts<'a/b/c/d'>;
//   ^?
```

Here's the breakdown of what happened:

```ts
type Parts<'a/b/c/d'> = 'a' | Parts<'b/c/d'>;
type Parts<'a/b/c/d'> = 'a' | 'b' | Parts<'c/d'>;
type Parts<'a/b/c/d'> = 'a' | 'b' | 'c' | Parts<'d'>;
type Parts<'a/b/c/d'> = 'a' | 'b' | 'c' | 'd';
```

### Filter out only the parts containing the param syntax

The key to this step is the observation that **any type [unions](https://www.typescriptlang.org/docs/handbook/2/everyday-types.html#union-types) with `never` yields the type itself**.

```ts twoslash
type A = 'a' | never;
//   ^?
type Obj = { a: 1 } | never;
//   ^?
```

If we can transform

```ts
'purchase' | '[shopid]' | '[itemid]' | 'args' | '[...args]'
```

into 

```ts
never | '[shopid]' | '[itemid]' | never | '[...args]'
```

then we will have 

```ts
'[shopid]' | '[itemid]' | '[...args]'
```

So, how, you asked?

Well, we'll have to reach out to [conditional types](#conditional-type) again for help, we can have a conditional type that returns the string literal itself if it starts with `[` and ends with `]`, and `never` if otherwise:

```ts twoslash copy
/// filename: IsParameter<Part>
type IsParameter<Part> = Part extends `[${infer Anything}]` ? Part : never;
type Purchase = IsParameter<'purchase'>;
//   ^?
type ShopId = IsParameter<'[shopid]'>;
//   ^?
type ItemId = IsParameter<'[itemid]'>;
//   ^?
type Args = IsParameter<'args'>;
//   ^?
type Args2 = IsParameter<'[...args]'>;
//   ^?
```

Although we have no idea what the string content is in between `[]`, but we can infer it in the conditional type, and we do not have to use the inferred type.

Combining this with the previous step, we have:

```ts twoslash 
/// filename: Step 2: FilteredParts<Path>
/// copy: true
// highlight-next-line
type IsParameter<Part> = Part extends `[${infer Anything}]` ? Part : never;
type FilteredParts<Path> = Path extends `${infer PartA}/${infer PartB}`
// highlight-next-line
  ? IsParameter<PartA> | FilteredParts<PartB>
// highlight-next-line
  : IsParameter<Path>;

type Params = FilteredParts<'/purchase/[shopid]/[itemid]/args/[...args]'>;
//   ^?
```

### Removing the brackets

If you've been following along until this point, you probably have a clearer idea on how we can achieve this step.

So, why not take a pause and [try it out in the TypeScript Playground](https://www.typescriptlang.org/play?#code/C4TwDgpgBAkgzgBQIYCckFsLAigPMlYAPigF4oDgoIAPbAOwBM4oADAbQBIBvAS3oBmOKAEF6IYAAt+AcwC+AXVZQA-BVRUAXFHoQAbjgDcAWABQoSFABivADbYUERpTj4kUkuWRTqdCExZWHn4hFHVCETkAemDBYUoAITlWMyhVWERUDCwcNwiSAB9rOwcnFzzgBKJUqG14AmyHNw8TUzMLaAb0OAB1XikAewBXSrQAYwBrLDJi+xwyjVcAciiwIZQxySQ4CCj2OEkBsF5GBT3+iHQTs9QZOD2AOifbuAUlokMgA)? _(I've added the boilerplate code in the link)_

To remove the bracket, we can modify the conditional type in the last step, and instead of returning the `Part`, we return the inferred type between the `[]`

```ts twoslash
/// filename: Step 3: ParamsWithoutBracket
/// copy: true
// highlight-next-line
type IsParameter<Part> = Part extends `[${infer ParamName}]` ? ParamName : never;
type FilteredParts<Path> = Path extends `${infer PartA}/${infer PartB}`
  ? IsParameter<PartA> | FilteredParts<PartB>
  : IsParameter<Path>;

type ParamsWithoutBracket = FilteredParts<'/purchase/[shopid]/[itemid]/args/[...args]'>;
```

### Map the parts into an Object Type

In this step, we are going to create an [Object Types](https://www.typescriptlang.org/docs/handbook/2/objects.html) using the result of the previous step as the key.

If you know the key type beforehand, you can create an object type via a type alias:

```ts twoslash
type Params = {
  shopid: any,
  itemid: any,
  '...args': any,
};
```

If the key type is totally unknown, you can use the [Index Signature](https://dmitripavlutin.com/typescript-index-signatures/):

```ts twoslash
type Params = {
  [key: string]: any;
};
const params: Params = { a: 1, b: 3, shopid: 2 };
```

However, in our case, the key type is not totally unknown, but it is dynamic. We use [Mapped Types](https://www.typescriptlang.org/docs/handbook/2/mapped-types.html) which has a similar syntax as the index signature:

```ts twoslash
// @errors: 2322
type Params<Keys extends string> = {
  [Key in Keys]: any;
};

const params: Params<'shopid' | 'itemid' | '...args'> = {
  shopid: 2,
  itemid: 3, 
  '...args': 4,
};

const incorrect_keys: Params<'shopid' | 'itemid' | '...args'> = {
  a: 1,
  b: 3,
  shopid: 2,
};
```

Building this on top of the previous step, we have:

```ts twoslash
/// filename: Step 4: Params<Path>
/// copy: true
type IsParameter<Part> = Part extends `[${infer ParamName}]` ? ParamName : never;
type FilteredParts<Path> = Path extends `${infer PartA}/${infer PartB}`
  ? IsParameter<PartA> | FilteredParts<PartB>
  : IsParameter<Path>;
// highlight-start
type Params<Path> = {
  [Key in FilteredParts<Path>]: any;
};
// highlight-end

type ParamObject = Params<'/purchase/[shopid]/[itemid]/args/[...args]'>;
//   ^?
```

### Defining the map value

Now if I ask you to come up with a type that is depending on the key value:
- if it is a string literal type that starts with `...`, **return a type `string[]`**
- else, **return a type `number`**

I hope that your inner voice is shouting [Conditional Types](#conditional-type)!

And yes, we are going to use a Conditional Type:

```ts twoslash
type ParamValue<Key> = Key extends `...${infer Anything}` ? string[] : number;
type ShopIdValue = ParamValue<'shopid'>;
//   ^?
type ArgValue = ParamValue<'...args'>;
//   ^?
```

But how do we get the `Key` type?

Well, in Mapped Types, when you write `{ [Key in ???]: any }`, the `Key` is the type alias of the key, which you can map it in the value type.

So writing this:

```ts twoslash
type ParamValue<Key> = Key extends `...${infer Anything}` ? string[] : number;
// ---cut---
type Params<Parts extends string> = {
  [Key in Parts]: ParamValue<Key>;
};
type ParamObject = Params<'shopid' | 'itemid' | '...args'>;
```

is the same as doing

```ts twoslash
type ParamValue<Key> = Key extends `...${infer Anything}` ? string[] : number;
// ---cut---
type Params = {
  'shopid': ParamValue<'shopid'>;
  'itemid': ParamValue<'itemid'>;
  '...args': ParamValue<'...args'>;
};
```

So, adding this on top of the previous step:

```ts twoslash
/// filename: Step 5: Params<Path>
/// copy: true
type IsParameter<Part> = Part extends `[${infer ParamName}]` ? ParamName : never;
type FilteredParts<Path> = Path extends `${infer PartA}/${infer PartB}`
  ? IsParameter<PartA> | FilteredParts<PartB>
  : IsParameter<Path>;
// highlight-next-line
type ParamValue<Key> = Key extends `...${infer Anything}` ? string[] : number;
type Params<Path> = {
  // highlight-next-line
  [Key in FilteredParts<Path>]: ParamValue<Key>;
};

type ParamObject = Params<'/purchase/[shopid]/[itemid]/args/[...args]'>;
//   ^?
```

### Remap keys to remove `'...'`

Now the final step. We are going to remove `'...'` from the `'...args'` key, and I hope you can now proudly come up with the [Conditional Types](#conditional-type) for it:

```ts twoslash
type RemovePrefixDots<Key> = Key extends `...${infer Name}` ? Name : Key;
type Args = RemovePrefixDots<'...args'>;
//   ^?
type ShopId = RemovePrefixDots<'shopid'>;
//   ^?
```

But to apply this onto our Mapped Type, you can do a [Key Remapping via `as`](https://www.typescriptlang.org/docs/handbook/2/mapped-types.html#key-remapping-via-as), which is available from TypeScript 4.1

```ts twoslash
/// filename: Step 7: Params<Path>
/// copy: true
type IsParameter<Part> = Part extends `[${infer ParamName}]` ? ParamName : never;
type FilteredParts<Path> = Path extends `${infer PartA}/${infer PartB}`
  ? IsParameter<PartA> | FilteredParts<PartB>
  : IsParameter<Path>;
type ParamValue<Key> = Key extends `...${infer Anything}` ? string[] : number;
type RemovePrefixDots<Key> = Key extends `...${infer Name}` ? Name : Key;
type Params<Path> = {
  // highlight-next-line
  [Key in FilteredParts<Path> as RemovePrefixDots<Key>]: ParamValue<Key>;
};

type ParamObject = Params<'/purchase/[shopid]/[itemid]/args/[...args]'>;
//   ^?
```

And there you go!

### The Solution

Here's the final solution to [the challenge](#the-challenge):

```ts twoslash
/// filename: Solution
/// copy: true
type IsParameter<Part> = Part extends `[${infer ParamName}]` ? ParamName : never;
type FilteredParts<Path> = Path extends `${infer PartA}/${infer PartB}`
  ? IsParameter<PartA> | FilteredParts<PartB>
  : IsParameter<Path>;
type ParamValue<Key> = Key extends `...${infer Anything}` ? string[] : number;
type RemovePrefixDots<Key> = Key extends `...${infer Name}` ? Name : Key;
type Params<Path> = {
  [Key in FilteredParts<Path> as RemovePrefixDots<Key>]: ParamValue<Key>;
};
type CallbackFn<Path> = (req: { params: Params<Path> }) => void;

// highlight-start
function get<Path extends string>(path: Path, callback: CallbackFn<Path>) {
	// TODO: implement
}
// highlight-end
```

## Conclusion

I hope this is a fun challenge for you.

As you can see, there's endless possibilities with [Conditional Types](#conditional-type) and [Template Literal Types](#template-literal-and-string-literal-types), allowing you to parse and derive types from a string literal type.

Before you go, here's another challenge, see if you can come up with the type for `Parse<Str>`:

```ts twoslash
type NestedStringArray = Array<string | NestedStringArray>;
type SkipSpace<Str extends string> = Str extends ` ${infer Str}` ? SkipSpace<Str> : Str;

type ParseStr<Str extends string> = 
  Str extends `"${infer Value}"${infer Remaining}`
    ? [SkipSpace<Remaining>, Value]
    : [Str, undefined];

type ParseItem<Str extends string> =
  ParseStr<Str> extends [infer Remaining, infer Value]
    ? Value extends string
      ? [Remaining, Value]
      : ParseStringArray<Str> extends [infer Remaining, infer Value]
        ? Value extends NestedStringArray
          ? [Remaining, Value]
          : [Remaining, undefined]
        : [Remaining, undefined]
    : [Str, undefined];

type ParseItems<Str extends string, Result extends NestedStringArray> =
  ParseItem<Str> extends [infer Remaining, infer Value]
    ? Value extends NestedStringArray[0]
      ? Remaining extends `,${infer Remaining}`
        ? ParseItems<SkipSpace<Remaining>, [...Result, Value]>
        : [Remaining, [...Result, Value]]
      : [Remaining, Result]
    : [Str, undefined]

type ParseStringArray<Str extends string, Result extends NestedStringArray = []> = 
  Str extends `[${infer Str}`
    ? ParseItems<SkipSpace<Str>, Result> extends [infer Remaining, infer Result]
      ? Remaining extends `]${infer Remaining}`
        ? [Remaining, Result]
        : [Remaining, undefined]
      : [Str, undefined]
    : [Str, undefined];
type Parse<Str extends string> = ParseStringArray<Str> extends [infer Remaining, infer Result] ? Remaining extends '' ? Result : never : never;
// ---cut---
// `Parse` parses string into a nested string array of infinite level deep
// type Parse<Str extends string> = ?;

type EmptyArray = Parse<'[]'>;
//   ^?
type StringArray = Parse<'["hello", "world"]'>
//   ^?
type NestedArray = Parse<'["hello", ["world", "ts", ["!"]], ["try this"]]'>
//   ^?
```

And you just wanna see the answer, [here's the link to it](https://www.typescriptlang.org/play?#code/C4TwDgpgBAchDOwIBMDKwBOBLAdgcwEEMMBDEKAXiiNJAB5Ft8oAfWBJNTXQ4sgPgDcAWABQoSFFQBrLGFRgSAYwh10GKBAAeSHMnhRGPfpSmZNOiHoMADKABIA3rgBmEDeoC+dgPxTZ8ooqapgmAFxmGCKiYhLQAAokGPAQ6iEa2rr6htz4JlRiUJEWWbYARE6u7lAAaiQANgCuEJ4VzjhuGgBKEAC2JLg83oVFUH4A2jJyCsqqPf2DeQA0tQ3NALojRRGTmCuNehAuuCjr0bHgCUkpAJJIveklVtlGeZQjicmpmOkmmc8GcZVbp9AY4HgrYGrJoQTaiUZjaHNJ7WHJMPBbUYTeZgiFI2GY7ZQT4pdQ8GhkX4o7JAjrVHGLPCQukaOowuEIhF+NnI-6ouCIFBk-AUkCEznY0GMlY8gnwzkInYM8H4faHY44U7ionjZV4g7II4nZAc0Y7dRqw0a07ncSXYnXCB3PrwR58l65JlQHrwRr1YDUgwCzjC3i0fIfR3Oh7qP6WVG0zreqUqr1Q2WmorctbQd1BjhCz2i8YABkzWOTC1TgagNiWlRZldx+GG8oVfhJTvurqmgVmdD1yyg4wAdGOfX7gDKc+t+NqoEqU3jR+OEJPp+zyzrB16J-7y+a9lADUbNSaxBdJJ3Q6K3fGPeiVnuA3n2IKuOjRaZxrPTCN1DWNjjA2SZeDYmIdlG3ZqAEMzBLGT5rv6calMOUI7sySbPluiI7oB6wgfSS4tuBbYSsOGHJr6+7zouVb6uqxo4YeGCWqeWpkSxbHWia0RxA6Xx3qhrx4PkUCRl8N58PQsY1omRH0aqUDoUhwDln4eGvgA5Fp4oaap4oRJqABu7iYkZECmVEF52pIACivRgKAX5UJ2dBaT+WlCGIAD0PmjAAej4l7QFJtCmG5HllAAFhA9T1AA9mUKxlAA7glGD1MgZTrF5vn+UUQUhW+nAuQJKTueMMVxYlyXDmlGVZXVZTAPAdVVQAhDl6wrFVmDkMA0VYG16y5XOoh+YFPhAA)

## Extra

Here's the type I defined for the `Route` component in the example above

```tsx twoslash
/// filename: Route component
/// copy: true
import React from 'react';

type PathSegments<Path extends string> = Path extends `${infer SegmentA}/${infer SegmentB}`
  ? ParamOnly<SegmentA> | PathSegments<SegmentB>
  : ParamOnly<Path>;
type ParamOnly<Segment extends string> = Segment extends `:${infer Param}`
  ? Param
  : never;
type RouteParams<Path extends string> = {
  [Key in PathSegments<Path>]: string;
};

function Route<Path extends string>({}: {
  path: Path;
  render: (routeProps: {
    match: { params: RouteParams<Path> };
  }) => void;
}) {
  return <div />;
}

<Route
  path="/user/:username"
  render={(routeProps) => {
    const params = routeProps.match.params;
  }}
/>;
```

## References

- TypeScript Docs
	- [Literal Types](https://www.typescriptlang.org/docs/handbook/2/everyday-types.html#literal-types)
	- [Union Types](https://www.typescriptlang.org/docs/handbook/2/everyday-types.html#union-types)
	- [Conditional Types](https://www.typescriptlang.org/docs/handbook/2/conditional-types.html)
	- [Function Overloads](https://www.typescriptlang.org/docs/handbook/2/functions.html#function-overloads)
	- [Generic Functions](https://www.typescriptlang.org/docs/handbook/2/functions.html#generic-functions)
	- [Objects](https://www.typescriptlang.org/docs/handbook/2/objects.html)
	- [Mapped Types](https://www.typescriptlang.org/docs/handbook/2/mapped-types.html)
	- [Template Literal Types](https://www.typescriptlang.org/docs/handbook/2/template-literal-types.html)
- [String Literal Types in TypeScript](https://mariusschulz.com/blog/string-literal-types-in-typescript)
- [Index Signatures in TypeScript](https://dmitripavlutin.com/typescript-index-signatures/)
