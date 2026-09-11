/* VOLÀ — motion layer: scroll parallax, magnetic CTAs.
   Everything here is additive: it only ever sets inline `transform`, never
   touches layout, and switches itself off entirely under
   prefers-reduced-motion or on a device with no fine pointer. */
(function () {
  'use strict';

  var reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
  var fine = window.matchMedia('(hover: hover) and (pointer: fine)');

  /* ----------------------------------------------------------- parallax */
  function initParallax() {
    var els = document.querySelectorAll('[data-parallax]');
    if (!els.length) return;

    var visible = [];
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) {
        var i = visible.indexOf(en.target);
        if (en.isIntersecting && i === -1) visible.push(en.target);
        else if (!en.isIntersecting && i > -1) visible.splice(i, 1);
      });
    }, { rootMargin: '30% 0px' });
    Array.prototype.forEach.call(els, function (el) { io.observe(el); });

    var scheduled = false;
    function paint() {
      scheduled = false;
      var vh = window.innerHeight;
      visible.forEach(function (el) {
        var speed = parseFloat(el.getAttribute('data-parallax')) || 0.1;
        var rect = el.getBoundingClientRect();
        var offset = (rect.top + rect.height / 2 - vh / 2) * speed;
        /* The CSS oversizes these images by 12% of their own height (6%
           bled off top and bottom) precisely so a parallax drift never
           exposes the clipped container's edge. Clamping to a hair under
           that 6% keeps the guarantee regardless of viewport height,
           breakpoint, or how far past the fold the element sits when
           IntersectionObserver's rootMargin first picks it up. */
        var maxOffset = rect.height * 0.05;
        offset = clamp(offset, -maxOffset, maxOffset);
        el.style.transform = 'translate3d(0,' + (-offset).toFixed(1) + 'px,0)';
      });
    }
    function request() {
      if (!scheduled && visible.length) { scheduled = true; requestAnimationFrame(paint); }
    }
    window.addEventListener('scroll', request, { passive: true });
    window.addEventListener('resize', request);
    /* elements below the fold on load never fire an initial scroll event */
    requestAnimationFrame(function () { request(); paint(); });
  }

  function teardownParallax() {
    Array.prototype.forEach.call(document.querySelectorAll('[data-parallax]'), function (el) {
      el.style.transform = '';
    });
  }

  /* -------------------------------------------------------------- magnet */
  /* Tracks the cursor with zero added lag while the pointer is over the
     button, then springs back on release. No CSS transition is declared
     for this on .btn - one is only ever added, inline, for that release. */
  function initMagnetic() {
    var targets = document.querySelectorAll('.hero__cta .btn, .btn--accent:not(.btn--block)');
    Array.prototype.forEach.call(targets, function (btn) {
      var raf = null, tx = 0, ty = 0, revertTimer = null;

      function onMove(e) {
        var r = btn.getBoundingClientRect();
        tx = clamp((e.clientX - (r.left + r.width / 2)) * 0.22, -7, 7);
        ty = clamp((e.clientY - (r.top + r.height / 2)) * 0.32, -5, 5);
        if (raf) return;
        raf = requestAnimationFrame(function () {
          btn.style.transition = '';
          btn.style.transform = 'translate(' + tx.toFixed(1) + 'px,' + ty.toFixed(1) + 'px)';
          raf = null;
        });
      }
      function onLeave() {
        if (raf) { cancelAnimationFrame(raf); raf = null; }
        btn.style.transition = 'transform 380ms cubic-bezier(0.34, 1.56, 0.64, 1)';
        btn.style.transform = '';
        clearTimeout(revertTimer);
        revertTimer = setTimeout(function () { btn.style.transition = ''; }, 400);
      }

      btn.addEventListener('mousemove', onMove);
      btn.addEventListener('mouseleave', onLeave);
      btn.__volaMagnet = { onMove: onMove, onLeave: onLeave };
    });
  }

  function teardownMagnetic() {
    Array.prototype.forEach.call(document.querySelectorAll('.hero__cta .btn, .btn--accent'), function (btn) {
      if (!btn.__volaMagnet) return;
      btn.removeEventListener('mousemove', btn.__volaMagnet.onMove);
      btn.removeEventListener('mouseleave', btn.__volaMagnet.onLeave);
      btn.style.transform = '';
      btn.style.transition = '';
      delete btn.__volaMagnet;
    });
  }

  function clamp(v, min, max) { return Math.max(min, Math.min(max, v)); }

  /* ----------------------------------------------------------- spotlight */
  /* A warm light tracking the cursor across a dark band. Same shape as the
     magnetic handler above — rAF-throttled writes, fine pointers only — but
     it sets two custom properties instead of a transform, so the whole
     effect is one compositor-driven pseudo-element and nothing is added to
     the document.

     `is-lit` rather than toggling opacity inline: the fade belongs with the
     rest of the declaration in the stylesheet, and leaving it there means
     the reduced-motion block can overrule it without JS knowing. */
  function initSpotlight() {
    var els = document.querySelectorAll('[data-spotlight]');
    Array.prototype.forEach.call(els, function (el) {
      if (el.__volaSpot) return;
      var raf = null, x = 0, y = 0;

      function onMove(e) {
        var r = el.getBoundingClientRect();
        x = e.clientX - r.left;
        y = e.clientY - r.top;
        if (raf) return;
        raf = requestAnimationFrame(function () {
          el.style.setProperty('--sx', x.toFixed(1) + 'px');
          el.style.setProperty('--sy', y.toFixed(1) + 'px');
          raf = null;
        });
      }
      function onEnter() { el.classList.add('is-lit'); }
      function onLeave() {
        if (raf) { cancelAnimationFrame(raf); raf = null; }
        el.classList.remove('is-lit');
      }

      el.addEventListener('mousemove', onMove);
      el.addEventListener('mouseenter', onEnter);
      el.addEventListener('mouseleave', onLeave);
      el.__volaSpot = { onMove: onMove, onEnter: onEnter, onLeave: onLeave };
    });
  }

  function teardownSpotlight() {
    Array.prototype.forEach.call(document.querySelectorAll('[data-spotlight]'), function (el) {
      if (!el.__volaSpot) return;
      el.removeEventListener('mousemove', el.__volaSpot.onMove);
      el.removeEventListener('mouseenter', el.__volaSpot.onEnter);
      el.removeEventListener('mouseleave', el.__volaSpot.onLeave);
      el.classList.remove('is-lit');
      el.style.removeProperty('--sx');
      el.style.removeProperty('--sy');
      delete el.__volaSpot;
    });
  }

  /* --------------------------------------------------------------- hearts */
  /* A small blue heart drifts up and fades wherever the visitor clicks, and
     occasionally while they scroll. Purely decorative: fixed-position
     overlay, pointer-events disabled throughout, torn down under
     prefers-reduced-motion like everything else in this file. */
  var heartHost = null;
  function initHearts() {
    if (heartHost) return;
    heartHost = document.createElement('div');
    heartHost.className = 'heart-fx';
    heartHost.setAttribute('aria-hidden', 'true');
    document.body.appendChild(heartHost);

    var last = 0;
    function spawn(x, y) {
      var now = performance.now();
      if (now - last < 120) return;
      last = now;
      var img = document.createElement('img');
      img.src = 'assets/img/blue-heart.svg';
      img.alt = '';
      img.className = 'heart-fx__item';
      var size = 14 + Math.random() * 14;
      img.style.width = img.style.height = size + 'px';
      img.style.left = x + 'px';
      img.style.top = y + 'px';
      img.style.setProperty('--drift', ((Math.random() - 0.5) * 70).toFixed(1) + 'px');
      img.style.setProperty('--spin', ((Math.random() - 0.5) * 50).toFixed(1) + 'deg');
      heartHost.appendChild(img);
      img.addEventListener('animationend', function () { img.remove(); });
      setTimeout(function () { if (img.parentNode) img.remove(); }, 1500);
    }

    document.addEventListener('click', function (e) { spawn(e.clientX, e.clientY); });

    var lastY = window.scrollY;
    window.addEventListener('scroll', function () {
      var y = window.scrollY;
      if (Math.abs(y - lastY) < 50) return;
      lastY = y;
      spawn(Math.random() * window.innerWidth, 40 + Math.random() * (window.innerHeight * 0.7));
    }, { passive: true });
  }

  function teardownHearts() {
    if (!heartHost) return;
    heartHost.remove();
    heartHost = null;
  }

  /* ------------------------------------------------------------ boot */
  function boot() {
    if (reduceMotion.matches) return;
    initParallax();
    if (fine.matches) { initMagnetic(); initSpotlight(); }
    initHearts();
  }

  /* Respect a live OS-level change, not just the value at load. */
  function onReduceMotionChange() {
    if (reduceMotion.matches) {
      teardownParallax(); teardownMagnetic(); teardownSpotlight(); teardownHearts();
    } else {
      initParallax();
      if (fine.matches) { initMagnetic(); initSpotlight(); }
      initHearts();
    }
  }
  if (reduceMotion.addEventListener) reduceMotion.addEventListener('change', onReduceMotionChange);
  else reduceMotion.addListener(onReduceMotionChange); /* older Safari */

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
  else boot();
})();
