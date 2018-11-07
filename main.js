function animateImage() {
  var img = new Image();
  img.onload = done;
  img.src = 'assets/tan_li_hau.png';
  if (img.complete) {
    done();
  }
  function done() {
    document.getElementById('hero').style.opacity = 1;
  }
}
// load styles
var links = [
  'https://fonts.googleapis.com/css?family=Roboto:300,400,700',
  '/index.css'
];
links.forEach(function(linkUrl) {
  var link = document.createElement('link');
  link.rel = 'stylesheet';
  link.href = linkUrl;
  link.type = 'text/css';
  link.onload = function() {
    doneLink(linkUrl);
  };
  document.head.append(link);
});

function doneLink(url) {
  if (url === links[1]) {
    // css loaded
    animateImage();
  }
}

// Check that service workers are registered
if ('serviceWorker' in navigator) {
  // Use the window load event to keep the page load performant
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js');
  });
}
