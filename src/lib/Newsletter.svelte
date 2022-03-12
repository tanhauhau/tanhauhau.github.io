<script>
  let email;
</script>

<div class="form">
  <h1>Subscribe to my newsletter</h1>
  <h2>Get the latest blog posts and project updates delivered right to your inbox</h2>
  <form
    action="https://buttondown.email/api/emails/embed-subscribe/lihautan"
    method="post"
    target="popupwindow"
    onsubmit="window.open('https://buttondown.email/lihautan', 'popupwindow')"
    class="embeddable-buttondown-form"
  >
    <div class="form-item">
      <input type="email" name="email" id="bd-email" bind:value={email} aria-label="email address" placeholder="youremail@example.com" />
      <input type="submit" value="Subscribe" disabled={!email} />
    </div>
    <input type="hidden" value="1" name="embed" />
    <p>Powered by Buttondown.</p>
  </form>
</div>

<style>
  h2 {
    font-size: 18px;
  }
  .form {
    border: 4px solid;
    box-shadow: var(--box-shadow);
    margin-bottom: 32px;
    text-align: center;
    padding: var(--prism-padding);
  }
  p {
    margin: 1em 0;
    color: #acb3be;
  }
  .form-item {
    display: flex;
    margin: 40px auto 0;
    max-width: 400px;
  }
  input {
    flex: 1;
    padding: 10px 14px;
    margin: 0 6px;
    font-size: 18px;
    border: 4px solid;
    box-shadow: 4px 4px var(--primary-color);
    background: white;
    border-radius: 0;
    box-sizing: border-box;
  }
  input[type="submit"] {
    max-width: 120px;
    cursor: pointer;
  }
  input:disabled {
    border-color: rgba(0,0,0,0.4);
    cursor: no-drop;
  }

  input:enabled:hover,
  input:enabled:focus {
    box-shadow: 6px 6px var(--primary-color);
    transform: translate(-1px, -1px);
  }

  @media only screen and (max-width: 500px) {
    .form-item {
      display: block;
      padding: 10px;
    }
    input {
      width: 100%;
      margin: 0;
    }
    input[type="submit"] {
      margin-top: 16px;
    }
  }

</style>