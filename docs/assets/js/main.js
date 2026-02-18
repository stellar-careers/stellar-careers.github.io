/**
 * Stellar Careers - Lightweight JS for static clone
 * Implements: Carousels, Modal/Banner, Hamburger menu, Scroll behaviors
 */

document.addEventListener('DOMContentLoaded', () => {
  initCarousels();
  initFixedBanner();
  initHamburgerMenu();
  initSuccessStoriesScroll();
  initTrackRecordScroll();
});

/* ========================================
   Carousel / Slider
   ======================================== */
function initCarousels() {
  // Career Insight carousel
  initCarousel({
    container: '[data-s-ef8b84d1-b98a-4878-ac14-ed60ba468d56]',
    leftBtn: '[data-s-935cd5ef-4742-4984-8bf9-b1e4685131b9]',
    rightBtn: '[data-s-91f540f1-c064-42be-b92d-abcdb210697b]',
    pauseBtn: '[data-s-6c0e81c8-f002-4c25-a1b4-d98c813cdfa9]',
    slideSelector: '[data-s-07ff3849-c273-4220-9b21-36a2b61c98d5]',
    autoplayInterval: 4000,
  });

  // YouTube Contents carousel
  initCarousel({
    container: '[data-s-aa2672ef-73ea-4921-9c26-ac958cd2b32f]',
    leftBtn: '[data-s-b625550b-9fe3-4ea7-a6a1-e974baa9b4d0]',
    rightBtn: '[data-s-95df33db-e68f-4d54-b1dd-fdf975bc7cb8]',
    pauseBtn: '[data-s-b0c47a24-ad71-4864-801e-41582d1a7f38]',
    slideSelector: '[data-s-a4af2623-26f1-4204-8f4f-d336107616e9]',
    autoplayInterval: 4000,
  });
}

function initCarousel(config) {
  const container = document.querySelector(config.container);
  if (!container) return;

  const slides = container.querySelectorAll(config.slideSelector);
  const leftBtn = container.querySelector(config.leftBtn) || document.querySelector(config.leftBtn);
  const rightBtn = container.querySelector(config.rightBtn) || document.querySelector(config.rightBtn);
  const pauseBtn = container.querySelector(config.pauseBtn) || document.querySelector(config.pauseBtn);

  if (!slides.length) return;

  let currentIndex = 0;
  let isPlaying = true;
  let autoplayTimer = null;
  const totalSlides = slides.length;

  // Make slides scrollable container
  const slidesWrapper = slides[0].parentElement;
  if (slidesWrapper) {
    slidesWrapper.style.overflowX = 'auto';
    slidesWrapper.style.scrollBehavior = 'smooth';
    slidesWrapper.style.scrollSnapType = 'x mandatory';
    slidesWrapper.style.msOverflowStyle = 'none';
    slidesWrapper.style.scrollbarWidth = 'none';

    slides.forEach(slide => {
      slide.style.scrollSnapAlign = 'start';
      slide.style.flexShrink = '0';
    });
  }

  function scrollToSlide(index) {
    if (index < 0) index = totalSlides - 1;
    if (index >= totalSlides) index = 0;
    currentIndex = index;

    const slide = slides[currentIndex];
    if (slide && slidesWrapper) {
      slidesWrapper.scrollTo({
        left: slide.offsetLeft - slidesWrapper.offsetLeft,
        behavior: 'smooth'
      });
    }
  }

  function startAutoplay() {
    stopAutoplay();
    if (isPlaying) {
      autoplayTimer = setInterval(() => {
        scrollToSlide(currentIndex + 1);
      }, config.autoplayInterval);
    }
  }

  function stopAutoplay() {
    if (autoplayTimer) {
      clearInterval(autoplayTimer);
      autoplayTimer = null;
    }
  }

  if (leftBtn) {
    leftBtn.addEventListener('click', (e) => {
      e.preventDefault();
      scrollToSlide(currentIndex - 1);
      startAutoplay();
    });
  }

  if (rightBtn) {
    rightBtn.addEventListener('click', (e) => {
      e.preventDefault();
      scrollToSlide(currentIndex + 1);
      startAutoplay();
    });
  }

  if (pauseBtn) {
    pauseBtn.addEventListener('click', (e) => {
      e.preventDefault();
      isPlaying = !isPlaying;
      const iconEl = pauseBtn.querySelector('.material-symbols-outlined') || pauseBtn;
      if (isPlaying) {
        iconEl.textContent = 'pause';
        startAutoplay();
      } else {
        iconEl.textContent = 'play_arrow';
        stopAutoplay();
      }
    });
  }

  startAutoplay();
}

/* ========================================
   Fixed Banner / Modal
   ======================================== */
function initFixedBanner() {
  const banner = document.querySelector('[data-s-4c1da30a-ec74-45d5-9c06-440ea440beda]');
  const closeBtn = document.querySelector('[data-s-d8eff7e8-5cb1-4665-8edc-533600b00efd]');

  if (banner && closeBtn) {
    closeBtn.addEventListener('click', (e) => {
      e.preventDefault();
      banner.style.display = 'none';
    });
  }
}

/* ========================================
   Hamburger Menu (Mobile)
   ======================================== */
function initHamburgerMenu() {
  const menuBtn = document.querySelector('[data-s-eb6b0a9c-00c1-4f38-9492-72a971ff9063]');
  if (!menuBtn) return;

  // Find the navigation list that's hidden on mobile
  const navList = document.querySelector('[data-s-d07ceb86-af8f-4408-bf0d-873881f52340]');
  const ctaButtons = document.querySelector('[data-s-1d0626e4-879a-4d8b-a3af-4ec41d69174e]');

  let isOpen = false;

  menuBtn.addEventListener('click', (e) => {
    e.preventDefault();
    isOpen = !isOpen;

    const iconEl = menuBtn.querySelector('.material-symbols-outlined') || menuBtn;

    if (isOpen) {
      iconEl.textContent = 'close';
      if (navList) {
        navList.style.display = 'flex';
        navList.style.flexDirection = 'column';
        navList.style.position = 'absolute';
        navList.style.top = '100%';
        navList.style.left = '0';
        navList.style.right = '0';
        navList.style.background = '#fff';
        navList.style.padding = '20px';
        navList.style.zIndex = '100';
        navList.style.boxShadow = '0 4px 12px rgba(0,0,0,0.1)';
        navList.style.gap = '16px';
      }
      if (ctaButtons) {
        ctaButtons.style.display = 'flex';
        ctaButtons.style.flexDirection = 'column';
        ctaButtons.style.position = 'absolute';
        ctaButtons.style.top = navList ? `calc(100% + ${navList.offsetHeight}px)` : '100%';
        ctaButtons.style.left = '0';
        ctaButtons.style.right = '0';
        ctaButtons.style.background = '#fff';
        ctaButtons.style.padding = '0 20px 20px';
        ctaButtons.style.zIndex = '100';
        ctaButtons.style.gap = '8px';
      }
    } else {
      iconEl.textContent = 'menu';
      if (navList) navList.style.display = '';
      if (ctaButtons) ctaButtons.style.display = '';
    }
  });
}

/* ========================================
   Success Stories Horizontal Scroll
   ======================================== */
function initSuccessStoriesScroll() {
  const list = document.querySelector('[data-s-292f451a-948a-4527-b317-6b754d9af353]');
  if (!list) return;

  // Enable horizontal scroll
  list.style.overflowX = 'auto';
  list.style.scrollBehavior = 'smooth';
  list.style.scrollSnapType = 'x mandatory';
  list.style.msOverflowStyle = 'none';
  list.style.scrollbarWidth = 'none';

  // Make children snap
  Array.from(list.children).forEach(child => {
    child.style.scrollSnapAlign = 'start';
    child.style.flexShrink = '0';
  });

  // Find scroll indicator arrow
  const scrollIndicator = list.parentElement?.querySelector('[data-s-2a7259e2-51f4-4fe7-b2d4-3abfb2ecd1ef]');
  if (scrollIndicator) {
    scrollIndicator.addEventListener('click', () => {
      list.scrollBy({ left: 300, behavior: 'smooth' });
    });
  }
}

/* ========================================
   Track Record Marquee Scroll
   ======================================== */
function initTrackRecordScroll() {
  // The track record section has company logos that scroll
  const trackRecord = document.querySelector('[data-s-df0e16ba-8d68-464d-a773-b419e671e81e]');
  if (!trackRecord) return;

  trackRecord.style.overflowX = 'auto';
  trackRecord.style.scrollBehavior = 'smooth';
  trackRecord.style.msOverflowStyle = 'none';
  trackRecord.style.scrollbarWidth = 'none';

  // Auto-scroll animation
  let scrollPos = 0;
  const speed = 0.5;
  let animId = null;

  function autoScroll() {
    scrollPos += speed;
    if (scrollPos >= trackRecord.scrollWidth - trackRecord.clientWidth) {
      scrollPos = 0;
    }
    trackRecord.scrollLeft = scrollPos;
    animId = requestAnimationFrame(autoScroll);
  }

  // Start auto-scroll when visible
  const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        autoScroll();
      } else {
        if (animId) cancelAnimationFrame(animId);
      }
    });
  });
  observer.observe(trackRecord);
}
