function syncHeaderScrollState() {
  const header = document.querySelector('.site-header');
  if (header) {
    header.classList.toggle('is-scrolled', window.scrollY > 8);
  }
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

window.addEventListener('scroll', syncHeaderScrollState, { passive: true });

if (window.Fancybox) {
  Fancybox.bind('[data-fancybox]', {
    Thumbs: false
  });
}

window.addEventListener('DOMContentLoaded', () => {
  syncHeaderScrollState();
  setupMobileMenu();
});
