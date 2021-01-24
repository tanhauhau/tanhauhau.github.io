{#await promise}
  <div>Loading</div>
{:then result}
  <div>{result}</div>
{:catch error}
  <div>{error}</div>
{/await}