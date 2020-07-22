<script context="module">
  let options = {
    root: document.querySelector('#scrollArea'),
    rootMargin: '0px',
    threshold: 1.0
  }

  function callback(entries) {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        console.log(entry.target.getAttribute('data-note')?.trim());
      }
    });
  }

  let observer = new IntersectionObserver(callback, options);
</script>

<script>
  export let note;

  function observe(elem) {
    observer.observe(elem);
  }
  
</script>

<div use:observe data-note={note} />