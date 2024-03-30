function foo() {
  console.log(baz);
  bar();

  {
    let baz = 1;
    let baz = 2;
    function bar() {
      console.log('foo');
      return 1;
    }
  }

  var baz = 2;
  var baz = 3;
  console.log(baz);
  bar();

  function bar() {
    console.log('baz');
    return 1;
  }
}

foo();