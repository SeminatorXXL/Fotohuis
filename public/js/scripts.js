window.addEventListener('scroll', () => {
  const header = document.querySelector('.site-header');
  if (header) {
    header.classList.toggle('is-scrolled', window.scrollY > 8);
  }
}, { passive: true });

if (window.Fancybox) {
  Fancybox.bind('[data-fancybox]', {
    Thumbs: false
  });
}


window.addEventListener('DOMContentLoaded', () => {

});