function syncHeaderScrollState() {
  const header = document.querySelector('.site-header');
  const homePage = document.querySelector('main.home-page');
  const isAtPageOrigin = window.scrollX <= 0 && window.scrollY <= 0;

  if (header) {
    header.classList.toggle('is-scrolled', window.scrollY > 8);
  }

  document.body.classList.toggle('is-home-top', Boolean(homePage) && isAtPageOrigin);
}

function setupMobileMenu() {
  const menuElement = document.getElementById('siteNavbarMenu');
  const menuToggle = document.querySelector('.site-navbar .navbar-toggler');

  if (!menuElement || !menuToggle || !window.bootstrap?.Offcanvas) {
    return;
  }

  const mobileQuery = window.matchMedia('(max-width: 991.98px)');
  const offcanvas = window.bootstrap.Offcanvas.getOrCreateInstance(menuElement);
  let isScrollLocked = false;
  let lockedScrollY = 0;

  const closeOpenDropdowns = () => {
    menuElement.querySelectorAll('.dropdown-toggle.show').forEach((toggle) => {
      const dropdown = window.bootstrap.Dropdown.getOrCreateInstance(toggle);
      dropdown.hide();
    });
  };

  const lockPageScroll = () => {
    if (isScrollLocked || !mobileQuery.matches) {
      return;
    }

    lockedScrollY = window.scrollY;
    isScrollLocked = true;
    document.documentElement.classList.add('mobile-menu-open');
    document.body.classList.add('mobile-menu-open');
    document.body.style.position = 'fixed';
    document.body.style.top = `-${lockedScrollY}px`;
    document.body.style.left = '0';
    document.body.style.right = '0';
    document.body.style.width = '100%';
  };

  const unlockPageScroll = () => {
    if (!isScrollLocked) {
      return;
    }

    const restoreScrollY = Math.abs(parseInt(document.body.style.top || '0', 10)) || lockedScrollY;
    const previousScrollBehavior = document.documentElement.style.scrollBehavior;

    document.documentElement.classList.remove('mobile-menu-open');
    document.body.classList.remove('mobile-menu-open');
    document.documentElement.style.scrollBehavior = 'auto';

    document.body.style.position = '';
    document.body.style.top = '';
    document.body.style.left = '';
    document.body.style.right = '';
    document.body.style.width = '';

    isScrollLocked = false;
    lockedScrollY = 0;

    window.requestAnimationFrame(() => {
      window.scrollTo(0, restoreScrollY);
      window.requestAnimationFrame(() => {
        document.documentElement.style.scrollBehavior = previousScrollBehavior;
        syncHeaderScrollState();
      });
    });
  };

  const syncMenuState = (isOpen) => {
    const shouldLockBody = isOpen && mobileQuery.matches;

    if (shouldLockBody) {
      lockPageScroll();
    } else {
      unlockPageScroll();
    }

    menuToggle.classList.toggle('is-open', shouldLockBody);
    menuToggle.setAttribute('aria-expanded', shouldLockBody ? 'true' : 'false');
    syncHeaderScrollState();
  };

  menuElement.addEventListener('show.bs.offcanvas', () => {
    syncMenuState(true);
  });

  menuElement.addEventListener('hidden.bs.offcanvas', () => {
    closeOpenDropdowns();
    syncMenuState(false);
  });

  menuElement.querySelectorAll('.nav-link, .dropdown-item').forEach((link) => {
    link.addEventListener('click', (event) => {
      if (!mobileQuery.matches || event.currentTarget.classList.contains('dropdown-toggle')) {
        return;
      }

      offcanvas.hide();
    });
  });

  const handleViewportChange = (event) => {
    if (!event.matches && menuElement.classList.contains('show')) {
      offcanvas.hide();
    }

    if (!event.matches) {
      closeOpenDropdowns();
    }

    syncMenuState(false);
  };

  if (typeof mobileQuery.addEventListener === 'function') {
    mobileQuery.addEventListener('change', handleViewportChange);
  } else if (typeof mobileQuery.addListener === 'function') {
    mobileQuery.addListener(handleViewportChange);
  }
}

let recaptchaScriptPromise = null;

function getRecaptchaProtectedForms() {
  return Array.from(document.forms).filter((form) => (
    form.hasAttribute('data-recaptcha-form') ||
    Boolean(form.querySelector('input[name="recaptcha_token"]'))
  ));
}

function ensureRecaptchaTokenInput(form) {
  let tokenInput = form.querySelector('input[name="recaptcha_token"]');

  if (tokenInput) {
    return tokenInput;
  }

  tokenInput = document.createElement('input');
  tokenInput.type = 'hidden';
  tokenInput.name = 'recaptcha_token';
  form.appendChild(tokenInput);

  return tokenInput;
}

function ensureRecaptchaNotice(form) {
  if (form.querySelector('.recaptcha-notice')) {
    return;
  }

  const notice = document.createElement('p');
  notice.className = 'recaptcha-notice';
  notice.innerHTML = 'Deze site wordt beschermd door reCAPTCHA en het Google <a href="https://policies.google.com/privacy" target="_blank" rel="noreferrer">privacybeleid</a> en de <a href="https://policies.google.com/terms" target="_blank" rel="noreferrer">servicevoorwaarden</a> zijn van toepassing.';

  const submitControl = form.querySelector('button[type="submit"], input[type="submit"]');

  if (submitControl?.parentElement) {
    submitControl.parentElement.insertBefore(notice, submitControl);
    return;
  }

  form.appendChild(notice);
}

function loadRecaptchaScript(siteKey) {
  if (window.grecaptcha?.execute) {
    return Promise.resolve(window.grecaptcha);
  }

  if (recaptchaScriptPromise) {
    return recaptchaScriptPromise;
  }

  recaptchaScriptPromise = new Promise((resolve, reject) => {
    const resolveWhenReady = () => {
      if (window.grecaptcha?.ready && window.grecaptcha?.execute) {
        resolve(window.grecaptcha);
        return;
      }

      window.setTimeout(resolveWhenReady, 50);
    };

    const existingScript = document.querySelector('script[data-recaptcha-script="true"], script[src^="https://www.google.com/recaptcha/api.js"]');

    if (existingScript) {
      if (window.grecaptcha?.execute) {
        resolve(window.grecaptcha);
        return;
      }

      existingScript.addEventListener('load', resolveWhenReady, { once: true });
      existingScript.addEventListener('error', () => reject(new Error('Failed to load reCAPTCHA.')), { once: true });
      return;
    }

    const script = document.createElement('script');
    script.src = `https://www.google.com/recaptcha/api.js?render=${encodeURIComponent(siteKey)}`;
    script.async = true;
    script.defer = true;
    script.dataset.recaptchaScript = 'true';
    script.addEventListener('load', resolveWhenReady, { once: true });
    script.addEventListener('error', () => reject(new Error('Failed to load reCAPTCHA.')), { once: true });
    document.head.appendChild(script);
  });

  return recaptchaScriptPromise;
}

function executeRecaptcha(siteKey, action) {
  return loadRecaptchaScript(siteKey).then((grecaptcha) => new Promise((resolve, reject) => {
    grecaptcha.ready(() => {
      grecaptcha.execute(siteKey, { action }).then(resolve).catch(reject);
    });
  }));
}

function setupRecaptchaForms() {
  const siteKey = String(window.siteConfig?.recaptchaSiteKey || '').trim();
  const forms = getRecaptchaProtectedForms();

  if (!siteKey || !forms.length) {
    return;
  }

  forms.forEach((form) => {
    if (form.dataset.recaptchaBound === 'true') {
      return;
    }

    form.dataset.recaptchaBound = 'true';
    ensureRecaptchaTokenInput(form);
    ensureRecaptchaNotice(form);

    form.addEventListener('submit', (event) => {
      const tokenInput = ensureRecaptchaTokenInput(form);

      if (tokenInput.value || form.dataset.recaptchaSubmitting === 'true') {
        return;
      }

      event.preventDefault();
      form.dataset.recaptchaSubmitting = 'true';

      executeRecaptcha(siteKey, form.dataset.recaptchaAction || 'submit')
        .then((token) => {
          tokenInput.value = token;
          form.submit();
        })
        .catch((error) => {
          console.error('reCAPTCHA failed to initialize.', error);
          form.dataset.recaptchaSubmitting = 'false';
          window.alert('Er ging iets mis met de beveiligingscontrole. Probeer het opnieuw.');
        });
    });
  });
}

function findSalonizedBookingIframe() {
  return document.querySelector('iframe[src*="widget.salonized.com/button"]');
}

function clickSalonizedBookingIframe() {
  const iframe = findSalonizedBookingIframe();

  if (!(iframe instanceof HTMLIFrameElement)) {
    return false;
  }

  iframe.focus();
  iframe.click();

  return iframe.dispatchEvent(new MouseEvent('click', {
    view: window,
    bubbles: true,
    cancelable: true
  }));
}

function triggerSalonizedBookingHash() {
  const bookingHash = '#sz-booking-toggle';

  if (window.location.hash === bookingHash) {
    window.history.replaceState(window.history.state, '', `${window.location.pathname}${window.location.search}`);
  }

  window.location.hash = bookingHash;
}

function setupSalonizedBookingButtons() {
  const bookingButtons = document.querySelectorAll('[data-booking-trigger="salonized"]');

  if (!bookingButtons.length) {
    return;
  }

  bookingButtons.forEach((button) => {
    if (button.dataset.bookingTriggerBound === 'true') {
      return;
    }

    button.dataset.bookingTriggerBound = 'true';
    button.addEventListener('click', (event) => {
      event.preventDefault();

      clickSalonizedBookingIframe();
      triggerSalonizedBookingHash();

      let attemptsLeft = 8;

      const retryOpen = () => {
        if (clickSalonizedBookingIframe()) {
          return;
        }

        attemptsLeft -= 1;

        if (attemptsLeft > 0) {
          window.setTimeout(retryOpen, 250);
        }
      };

      window.setTimeout(retryOpen, 150);
    });
  });
}

window.addEventListener('scroll', syncHeaderScrollState, { passive: true });

if (window.Fancybox) {
  Fancybox.bind('[data-fancybox]', {
    Thumbs: false
  });
}

window.addEventListener('DOMContentLoaded', () => {
  syncHeaderScrollState();
  setupMobileMenu();
  setupRecaptchaForms();
  setupSalonizedBookingButtons();
});
