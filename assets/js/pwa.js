/*
 * رواد — تطبيق الويب التقدّمي (PWA)
 * ------------------------------------------------------------------
 * 1. يسجّل عامل الخدمة sw.js (العمل دون اتصال + قابلية التثبيت).
 * 2. يضيف زر «حمّل التطبيق» العائم في كل الصفحات:
 *    • Chrome / Edge / Samsung Internet (أندرويد والحاسوب): نافذة التثبيت الأصلية.
 *    • iPhone / iPad: نافذة بخطوات «إضافة إلى الشاشة الرئيسية».
 *    • غير ذلك: نافذة بخطوات التثبيت من قائمة المتصفح.
 * 3. يختفي الزر تلقائيًّا عند فتح الموقع من التطبيق المثبَّت.
 *
 * ملف مستقل: لا يعتمد على app.js، لكنه يستخدم Rowad.ui.toast إن وُجد.
 */
(function () {
  'use strict';

  /* ───────────── عامل الخدمة ───────────── */
  if ('serviceWorker' in navigator && (location.protocol === 'https:' || location.hostname === 'localhost' || location.hostname === '127.0.0.1')) {
    window.addEventListener('load', function () {
      navigator.serviceWorker.register('sw.js').catch(function () { /* التطبيق يعمل دونه */ });
    });
  }

  /* ───────────── حالة التثبيت ───────────── */
  var ua = navigator.userAgent || '';
  var isIOS = /iPad|iPhone|iPod/.test(ua) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
  var isStandalone = function () {
    return (window.matchMedia && (window.matchMedia('(display-mode: standalone)').matches || window.matchMedia('(display-mode: minimal-ui)').matches)) ||
      window.navigator.standalone === true;
  };

  var deferredPrompt = null;
  var fab = null;

  window.addEventListener('beforeinstallprompt', function (ev) {
    ev.preventDefault();             /* نُظهر النافذة من زرّنا بدل الشريط التلقائي */
    deferredPrompt = ev;
    if (fab) fab.classList.add('install-fab--ready');
  });

  window.addEventListener('appinstalled', function () {
    deferredPrompt = null;
    hideFab();
    toast('تم تثبيت تطبيق رواد 🎉 تجده الآن على شاشتك الرئيسية');
  });

  /* ───────────── أدوات ───────────── */
  var ico = function (name) {
    return '<svg class="ico" aria-hidden="true" focusable="false"><use href="#i-' + name + '"/></svg>';
  };
  /* أيقونة «مشاركة» كما تظهر في Safari */
  var IOS_SHARE = '<svg class="install-step__glyph" viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path d="M12 3v12M7.5 7.5 12 3l4.5 4.5" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/><path d="M8 10H6.5A1.5 1.5 0 0 0 5 11.5v8A1.5 1.5 0 0 0 6.5 21h11a1.5 1.5 0 0 0 1.5-1.5v-8a1.5 1.5 0 0 0-1.5-1.5H16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>';
  var PLUS_BOX = '<svg class="install-step__glyph" viewBox="0 0 24 24" aria-hidden="true" focusable="false"><rect x="4" y="4" width="16" height="16" rx="4" fill="none" stroke="currentColor" stroke-width="2"/><path d="M12 8.5v7M8.5 12h7" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>';
  var DOTS = '<svg class="install-step__glyph" viewBox="0 0 24 24" aria-hidden="true" focusable="false"><circle cx="12" cy="5.5" r="2" fill="currentColor"/><circle cx="12" cy="12" r="2" fill="currentColor"/><circle cx="12" cy="18.5" r="2" fill="currentColor"/></svg>';

  function toast(msg) {
    if (window.Rowad && window.Rowad.ui && typeof window.Rowad.ui.toast === 'function') {
      window.Rowad.ui.toast(msg, { icon: 'check-circle-fill', tone: 'ok' });
    }
  }

  function step(n, glyph, html) {
    return '<li class="install-step"><span class="install-step__n num">' + n + '</span>' +
      '<span class="install-step__text">' + html + '</span>' +
      '<span class="install-step__icon">' + glyph + '</span></li>';
  }

  function guideDialog() {
    var steps = isIOS
      ? step(1, IOS_SHARE, 'اضغط زر <strong>المشاركة</strong> في شريط المتصفح.') +
        step(2, PLUS_BOX, 'اختر <strong>«إضافة إلى الشاشة الرئيسية»</strong>.') +
        step(3, ico('check-circle-fill'), 'اضغط <strong>«إضافة»</strong>، وستجد رواد بين تطبيقاتك.')
      : step(1, DOTS, 'افتح <strong>قائمة المتصفح</strong> من زر النقاط الثلاث.') +
        step(2, ico('download-simple'), 'اختر <strong>«تثبيت التطبيق»</strong> أو <strong>«إضافة إلى الشاشة الرئيسية»</strong>.') +
        step(3, ico('check-circle-fill'), 'أكّد التثبيت، وستجد رواد بين تطبيقاتك.');

    /* متصفحات iOS غير Safari والمتصفحات داخل التطبيقات قد لا تعرض الخيار */
    var note = isIOS && /CriOS|FxiOS|EdgiOS|GSA\/|Instagram|FBAN|FBAV|Line\//.test(ua)
      ? '<p class="install-guide__note">' + ico('info-fill') + 'إن لم تجد الخيار، افتح الموقع من متصفح Safari.</p>'
      : '';

    var d = document.createElement('dialog');
    d.className = 'dialog install-guide';
    d.setAttribute('aria-labelledby', 'installTitle');
    d.innerHTML =
      '<div class="dialog__body">' +
        '<div class="dialog__head">' +
          '<div><h2 class="h2" id="installTitle">حمّل تطبيق رواد</h2>' +
          '<p class="muted">ثبّته على جهازك في ثوانٍ — بلا متجر تطبيقات، ويفتح بلمسة واحدة.</p></div>' +
          '<button class="dialog__close" type="button" data-close aria-label="إغلاق">' + ico('x') + '</button>' +
        '</div>' +
        '<img class="install-guide__art" src="assets/img/icons/robo-wave.webp" alt="" width="320" height="320">' +
        '<ol class="install-steps">' + steps + '</ol>' + note +
        '<div class="dialog__actions"><button class="btn btn--blue" type="button" data-close>حسنًا، فهمت</button></div>' +
      '</div>';
    document.body.appendChild(d);
    d.addEventListener('close', function () { d.remove(); if (fab) fab.focus(); });
    d.addEventListener('click', function (ev) {
      if (ev.target === d || (ev.target.closest && ev.target.closest('[data-close]'))) d.close();
    });
    if (typeof d.showModal === 'function') d.showModal(); else d.setAttribute('open', '');
  }

  function install() {
    if (deferredPrompt) {
      var p = deferredPrompt;
      deferredPrompt = null;
      fab.classList.remove('install-fab--ready');
      p.prompt();
      p.userChoice.then(function (choice) {
        if (choice && choice.outcome === 'accepted') hideFab();
      }).catch(function () {});
      return;
    }
    guideDialog();
  }

  /* ───────────── الزر العائم ───────────── */
  function hideFab() {
    if (!fab) return;
    fab.classList.add('is-leaving');
    setTimeout(function () { if (fab) { fab.remove(); fab = null; } }, 260);
  }

  function mountFab() {
    if (isStandalone() || document.querySelector('.install-fab')) return;
    fab = document.createElement('button');
    fab.type = 'button';
    fab.className = 'install-fab' + (deferredPrompt ? ' install-fab--ready' : '');
    fab.setAttribute('aria-label', 'حمّل تطبيق رواد على جهازك');
    fab.innerHTML =
      '<span class="install-fab__icon">' + ico('download-simple-fill') + '</span>' +
      '<span class="install-fab__label">حمّل التطبيق</span>';
    fab.addEventListener('click', install);
    document.body.appendChild(fab);
  }

  /* إن فُتح الموقع لاحقًا كتطبيق مثبّت في نفس الجلسة */
  if (window.matchMedia) {
    var mq = window.matchMedia('(display-mode: standalone)');
    var onMode = function (e) { if (e.matches) hideFab(); };
    if (mq.addEventListener) mq.addEventListener('change', onMode); else if (mq.addListener) mq.addListener(onMode);
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', mountFab);
  else mountFab();
})();
