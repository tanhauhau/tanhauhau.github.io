let count = 0, double = count * 2;

const text = document.createTextNode(`${count} x 2 = ${double}`);
parent.appendChild(text);

const button = document.createElement('button');
button.textContent = 'Increment';
button.addEventListener('click', () => {
  count++;
  update();
});
buttn.setAttribute('class', 'svelte-12345');
parent.appendChild(button);

function update() {
  double = count * 2;

  text.setData(`${count} x 2 = ${double}`);
}

const style = document.createElement('style');
style.textContent = `
  button.svelte-12345 {
    font-size: 2em;
    background: red;
  }
`;
document.head.appendChild(style);
