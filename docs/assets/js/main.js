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
  initCoachTabs();
  initCoachFadeUp();
});

/* ========================================
   Carousel / Slider
   ======================================== */
function initCarousels() {
  // Career Insight carousel
  initCarousel({
    container: '.insight-carousel',
    leftBtn: '.insight-carousel-prev',
    rightBtn: '.insight-carousel-next',
    pauseBtn: '.insight-carousel-pause',
    slideSelector: '.insight-carousel-slide',
    autoplayInterval: 4000,
  });

  // YouTube Contents carousel
  initCarousel({
    container: '.yt-carousel',
    leftBtn: '.yt-carousel-prev',
    rightBtn: '.yt-carousel-next',
    pauseBtn: '.yt-carousel-pause',
    slideSelector: '.yt-carousel-slide',
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
  const banner = document.querySelector('.banner-fixed');
  const closeBtn = document.querySelector('.banner-close-btn');

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
  const menuBtn = document.querySelector('.header-hamburger');
  if (!menuBtn) return;

  // Find the navigation list that's hidden on mobile
  const navList = document.querySelector('.header-nav');
  const ctaButtons = document.querySelector('.header-cta-primary');

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
  const list = document.querySelector('.stories-list');
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
  const scrollIndicator = list.parentElement?.querySelector('.stories-scroll-btn');
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
  const trackRecord = document.querySelector('.track-logos');
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

/* ========================================
   Stellar Coach - Tab UI
   ======================================== */
function initCoachTabs() {
  const tablist = document.querySelector('.coach-tabs[role="tablist"]');
  if (!tablist) return;

  const tabs = Array.from(tablist.querySelectorAll('[role="tab"]'));
  const panels = tabs.map(tab =>
    document.getElementById(tab.getAttribute('aria-controls'))
  );

  function activate(index) {
    tabs.forEach((tab, i) => {
      const isActive = i === index;
      tab.setAttribute('aria-selected', isActive);
      tab.tabIndex = isActive ? 0 : -1;
      tab.classList.toggle('coach-tab-btn-active', isActive);
    });
    panels.forEach((panel, i) => {
      if (i === index) {
        panel.hidden = false;
        panel.classList.add('coach-tab-panel-active');
      } else {
        panel.hidden = true;
        panel.classList.remove('coach-tab-panel-active');
      }
    });
  }

  tablist.addEventListener('click', (e) => {
    const tab = e.target.closest('[role="tab"]');
    if (!tab) return;
    activate(tabs.indexOf(tab));
    tab.focus();
  });

  tablist.addEventListener('keydown', (e) => {
    const currentIndex = tabs.indexOf(document.activeElement);
    if (currentIndex === -1) return;
    let nextIndex;
    if (e.key === 'ArrowRight') nextIndex = (currentIndex + 1) % tabs.length;
    else if (e.key === 'ArrowLeft') nextIndex = (currentIndex - 1 + tabs.length) % tabs.length;
    else return;
    e.preventDefault();
    activate(nextIndex);
    tabs[nextIndex].focus();
  });
}

/* ========================================
   Stellar Coach - Scroll Animations
   ======================================== */
function initCoachFadeUp() {
  const elements = document.querySelectorAll('.coach-fade-up');
  if (!elements.length) return;

  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
    elements.forEach(el => el.classList.add('is-visible'));
    return;
  }

  if (!('IntersectionObserver' in window)) {
    elements.forEach(el => el.classList.add('is-visible'));
    return;
  }

  const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        entry.target.classList.add('is-visible');
        observer.unobserve(entry.target);
      }
    });
  }, { threshold: 0.15 });

  elements.forEach(el => observer.observe(el));
}
