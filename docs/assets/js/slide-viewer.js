// 限定公開の資料ページ（pitch-*, intro-*）用のスライド表示。
// 1枚ずつ表示し、◁ ▷・ページ番号の入力・矢印キー・左右のスワイプで移動する。
// URL の末尾に #5 のように付けると、そのページから開く。見た目は assets/css/slide-viewer.css。
(function () {
  'use strict';

  var slides = Array.prototype.slice.call(document.querySelectorAll('.sv-slide'));
  var prev = document.querySelector('.sv-prev');
  var next = document.querySelector('.sv-next');
  var page = document.querySelector('.sv-page');
  var stage = document.querySelector('.sv-stage');
  var total = slides.length;
  var current = 0;

  if (!total) {
    return;
  }

  // 前後のスライドの画像を先に読んでおき、切り替えたときにすぐ出るようにする
  function preload(i) {
    if (i < 0 || i >= total) {
      return;
    }
    var img = slides[i].querySelector('img');
    if (img && !img.dataset.preloaded) {
      img.dataset.preloaded = '1';
      var pre = new Image();
      pre.src = img.currentSrc || img.src;
    }
  }

  function show(i) {
    i = Math.max(0, Math.min(total - 1, i));
    slides[current].classList.remove('is-current');
    slides[i].classList.add('is-current');
    current = i;
    page.value = String(i + 1);
    prev.disabled = i === 0;
    next.disabled = i === total - 1;
    preload(i + 1);
    preload(i - 1);
    preload(i + 2);
    try {
      history.replaceState(null, '', i === 0 ? location.pathname + location.search : '#' + (i + 1));
    } catch (e) {}
  }

  prev.addEventListener('click', function () { show(current - 1); });
  next.addEventListener('click', function () { show(current + 1); });

  // ページ番号を入れて Enter（またはほかを押す）でそのページへ
  function jump() {
    var n = parseInt(page.value.replace(/[０-９]/g, function (c) {
      return String.fromCharCode(c.charCodeAt(0) - 0xfee0);
    }), 10);
    if (isNaN(n)) {
      page.value = String(current + 1);
      return;
    }
    show(n - 1);
  }
  page.addEventListener('change', jump);
  page.addEventListener('keydown', function (e) {
    if (e.key === 'Enter') {
      e.preventDefault();
      jump();
      page.blur();
    }
  });
  page.addEventListener('focus', function () { page.select(); });

  document.addEventListener('keydown', function (e) {
    if (e.target === page) {
      return;
    }
    if (e.key === 'ArrowRight' || e.key === 'PageDown' || e.key === ' ') {
      e.preventDefault();
      show(current + 1);
    } else if (e.key === 'ArrowLeft' || e.key === 'PageUp') {
      e.preventDefault();
      show(current - 1);
    } else if (e.key === 'Home') {
      show(0);
    } else if (e.key === 'End') {
      show(total - 1);
    }
  });

  // スマホ: 左右にスワイプして移動
  var sx = null;
  var sy = null;
  stage.addEventListener('touchstart', function (e) {
    if (e.touches.length !== 1) {
      sx = null;
      return;
    }
    sx = e.touches[0].clientX;
    sy = e.touches[0].clientY;
  }, { passive: true });
  stage.addEventListener('touchend', function (e) {
    if (sx === null) {
      return;
    }
    var dx = e.changedTouches[0].clientX - sx;
    var dy = e.changedTouches[0].clientY - sy;
    sx = null;
    if (Math.abs(dx) > 50 && Math.abs(dx) > Math.abs(dy) * 1.5) {
      show(current + (dx < 0 ? 1 : -1));
    }
  }, { passive: true });

  var start = parseInt((location.hash || '').replace('#', ''), 10);
  show(isNaN(start) ? 0 : start - 1);
})();
