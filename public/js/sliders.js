document.addEventListener('DOMContentLoaded', () => {
  const el = document.querySelector('.categories-swiper');
  if (!el) return;

  new Swiper(el, {
    freeMode: {
      enabled: true,
      momentum: true,
      momentumRatio: 0.8,
    },

    grabCursor: true,
    spaceBetween: 20,

    slidesPerView: 1.7,

    breakpoints: {
      768: {
        slidesPerView: 'auto',
      }
    }
  });
});
