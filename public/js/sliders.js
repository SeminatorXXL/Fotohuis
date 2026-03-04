document.addEventListener('DOMContentLoaded', () => {
  const el = document.querySelector('.categories-swiper');
  if (el) {
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
  }

  const impressionEl = document.querySelector('.impression-swiper');
  if (impressionEl) {
    new Swiper(impressionEl, {
      loop: false,
      grabCursor: true,
      spaceBetween: 12,
      slidesPerView: 1.2,
      pagination: {
        el: '.swiper-pagination',
        clickable: true
      },
      breakpoints: {
        768: {
          slidesPerView: 2.2
        },
        1200: {
          slidesPerView: 3.2
        }
      }
    });
  }

  const homeHeroEl = document.querySelector('.home-hero-swiper');
  if (homeHeroEl) {
    new Swiper(homeHeroEl, {
      slidesPerView: 1,
      effect: 'fade',
      fadeEffect: { crossFade: true },
      loop: true,
      speed: 2000,
      allowTouchMove: false,
      autoplay: {
        delay: 2000,
        disableOnInteraction: false
      }
    });
  }
});
