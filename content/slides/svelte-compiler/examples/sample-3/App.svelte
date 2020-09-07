<script>
  let value = '';
  let users = [
    'Jon',
    'Margeret',
  ];
</script>

<input bind:value={value} />

{value}

<br />

{#each users as user}
  <input bind:value={user} />
{/each}

{users}