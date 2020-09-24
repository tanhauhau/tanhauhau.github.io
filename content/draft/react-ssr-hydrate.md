async function init() {
  const data = await fetchData();
  ReactDOM.hydrate(<App data={data} />, root);
}

// <script>
//   window.INITIAL_DATA = {...};
// </script>

// <script>
//   async function init() {
//     const data = window.INITIAL_DATA;
//     ReactDOM.hydrate(<App data={data} />, root);
//   }
// </script>

// server.js
// const data = await fetchData();
// let html = ReactDOMServer.renderToString(<App data={data} />);
// html += `<script>window.INITIAL_DATA = ${JSON.stringify(data)}</script>`

{/* <div id="root" data-react="{...}" />

<script>
  async function init() {
    const data = root.dataset.react ? JSON.parse(root.dataset.react) : {};
    ReactDOM.hydrate(<App data={data} />, root);
  }
</script> */}

// // server.js
// const data = await fetchData();
// let html = ReactDOMServer.renderToString(<App data={data} />);
// html = `<div id="root" data-react="${JSON.stringify(data)}">${html}</div>`;

{/* <script>
  async function init(data) {
    ReactDOM.hydrate(<App data={data} />, root);
  }
  window.runReactApplication = init;
</script>
<script>
  window.runReactApplication({ ... })
</script> */}

// // server.js
// const data = await fetchData();
// let html = ReactDOMServer.renderToString(<App data={data} />);
// html += `<script>window.runReactApplication(${JSON.stringify(data)})</script>`

<script>
  window.INITIAL_DATA = JSON.parse('{"data": "foo"}');
</script>

// server.js
const data = await fetchData();
let html = ReactDOMServer.renderToString(<App data={data} />);
html += `<script>window.INITIAL_DATA = JSON.parse(${JSON.stringify(JSON.stringify(data))})</script>`