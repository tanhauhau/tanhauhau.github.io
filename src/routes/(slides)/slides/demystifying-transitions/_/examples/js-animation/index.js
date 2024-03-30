const string = 'Hello World';
const duration = {{duration}}

let start = Date.now();

function loop() {
  const now = Date.now();
  // time ranges from [0, 1]
  const time = (now - start) / duration;

  div.textContent = string.slice(0, Math.round(time * string.length));

  requestAnimationFrame(loop);
}
requestAnimationFrame(loop);