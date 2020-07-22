<script>
  export let folder = [];
  export let path = "";
  export let highlightedPath = "";
  export let level = "";

  const SPACE = `<span style='color: transparent;'>@</span>`;

  $: expand = folder.map(i => true);

  function shouldHighlight(highlightedPath, path) {
    if (Array.isArray(highlightedPath)) {
      for (const item of highlightedPath) {
        if (item === path || item.startsWith(path + "/")) {
          return true;
        }
      }
      return false;
    }
    return highlightedPath === path || highlightedPath.startsWith(path + "/");
  }
</script>

<div>
  {#if highlightedPath && !level}
    <div class="info">Selected: {Array.isArray(highlightedPath) ? highlightedPath[0] : highlightedPath}</div>
  {/if}

  {#each folder as { name, type, children, pathname, link, linkRelative, comment }, index (name)}
    <div>
      {@html level}{#if level === '' && folder.length === 1}
        <span>├─ </span>
      {:else if index === folder.length - 1}
        <span>└─ </span>
      {:else}
        <span>├─ </span>
      {/if}
      {#if type === 'D'}
        <span
          class="file"
          class:highlighted={shouldHighlight(highlightedPath, pathname)}
          on:click={() => expand[index] = !expand[index]}
        >{name}{#if comment}<span class="comment">{comment}</span>{/if}</span>
        <div class="child" class:expand={expand[index]}>
          <svelte:self
            folder={children}
            level={level + `${index === folder.length - 1 ?  (SPACE + SPACE + SPACE) : ("│" + SPACE+ SPACE)}`}
            path={pathname}
            bind:highlightedPath
          />
        </div>
      {:else}
        <span
          class="file"
          class:highlighted={shouldHighlight(highlightedPath, pathname)}
          on:click={() => {
            let target = pathname;
            if (highlightedPath === target || highlightedPath.has?.(target)) highlightedPath = "";
            else {
              if (link) {
                highlightedPath = [link, target];
              } else {
                highlightedPath = target;
              }
            }
          }}>{name}{#if link}{` --> ${linkRelative}`}{/if}{#if comment}<span class="comment">{comment}</span>{/if}</span>
      {/if}
    </div>
  {/each}
</div>

<style>
  div {
    font-family: monospace;
    user-select: none;
  }
  .highlighted {
    color: red;
  }
  .file {
    cursor: pointer;
  }
  .child {
    display: none;
  }
  .child.expand {
    display: contents;
  }
  .comment {
    color: gray;
    font-style: italic;
  }
  .info {
    white-space: break-spaces;
    word-break: break-word;
  }
</style>