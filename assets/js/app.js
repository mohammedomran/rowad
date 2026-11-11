/*
 * رواد — المنطق المشترك للواجهة
 * ------------------------------------------------------------------
 * Rowad.store   حالة التطبيق (localStorage) — استبدلها بنداءات الخادم.
 * Rowad.api     طبقة وهمية للمصادقة: كل دالة هنا تقابل نقطة API حقيقية لاحقًا.
 * Rowad.shell   الهيكل المشترك: الشريط الجانبي، العلوي، السفلي.
 * Rowad.tpl     قوالب البطاقات.   Rowad.ui  نوافذ وتنبيهات ومشغّل.
 */
(function () {
  'use strict';

  var DATA = window.ROWAD_DATA;
  var R = (window.Rowad = { data: DATA });

  /* ───────────── أدوات عامة ───────────── */
  var $ = function (sel, root) { return (root || document).querySelector(sel); };
  var $$ = function (sel, root) { return Array.prototype.slice.call((root || document).querySelectorAll(sel)); };
  var ESC = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' };
  var esc = function (v) { return String(v == null ? '' : v).replace(/[&<>"']/g, function (c) { return ESC[c]; }); };
  var ico = function (name, cls) {
    return '<svg class="ico' + (cls ? ' ' + cls : '') + '" aria-hidden="true" focusable="false"><use href="#i-' + name + '"/></svg>';
  };
  var wait = function (ms) { return new Promise(function (r) { setTimeout(r, ms); }); };
  var reducedMotion = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* العدّ بالعربية الفصحى: [مفرد، مثنى، جمع (3–10)، تمييز (11–99)، بعد المئة] */
  var WORDS = {
    minute: ['دقيقة واحدة', 'دقيقتان', 'دقائق', 'دقيقة', 'دقيقة'],
    story: ['قصة واحدة', 'قصتان', 'قصص', 'قصة', 'قصة'],
    episode: ['حلقة واحدة', 'حلقتان', 'حلقات', 'حلقة', 'حلقة'],
    day: ['يوم واحد', 'يومان', 'أيام', 'يومًا', 'يوم'],
    year: ['سنة واحدة', 'سنتان', 'سنوات', 'سنة', 'سنة'],
    item: ['عنصر واحد', 'عنصران', 'عناصر', 'عنصرًا', 'عنصر']
  };
  function count(n, word) {
    var f = WORDS[word];
    n = Math.max(0, Math.round(n));
    if (n === 1) return f[0];
    if (n === 2) return f[1];
    var m = n % 100;
    if (m >= 3 && m <= 10) return n + ' ' + f[2];
    if (m >= 11) return n + ' ' + f[3];
    return n + ' ' + f[4];
  }
  function clock(sec) {
    sec = Math.max(0, Math.round(sec));
    var m = Math.floor(sec / 60), s = sec % 60;
    return m + ':' + (s < 10 ? '0' : '') + s;
  }
  /* توحيد الحروف للبحث: حذف التشكيل وتوحيد الألف والياء والتاء المربوطة */
  function norm(s) {
    return String(s || '')
      .replace(/[ً-ٰٟـ]/g, '')
      .replace(/[أإآٱ]/g, 'ا').replace(/ى/g, 'ي').replace(/ة/g, 'ه')
      .replace(/ؤ/g, 'و').replace(/ئ/g, 'ي')
      .toLowerCase().trim();
  }
  function param(name) { return new URLSearchParams(location.search).get(name); }

  R.util = { $: $, $$: $$, esc: esc, ico: ico, wait: wait, count: count, clock: clock, norm: norm, param: param, reducedMotion: reducedMotion };

  /* ───────────── البيانات ───────────── */
  var byId = {};
  DATA.stories.forEach(function (s) { byId[s.id] = s; });
  var catById = {};
  DATA.categories.forEach(function (c) { catById[c.id] = c; });

  R.story = function (id) { return byId[id] || null; };
  R.category = function (id) { return catById[id] || null; };
  R.avatar = function (id) {
    return DATA.avatars.filter(function (a) { return a.id === id; })[0] || DATA.avatars[0];
  };
  /* وحدة المشاهدة: حلقة من سلسلة أو القصة نفسها (ep = 0) */
  R.unit = function (story, ep) {
    if (story.kind === 'series') {
      var e = story.episodes.filter(function (x) { return x.n === Number(ep); })[0] || story.episodes[0];
      return { ep: e.n, title: e.title, label: 'الحلقة ' + e.n + ': ' + e.title, duration: e.duration, sizeMB: e.sizeMB, thumb: e.thumb, video: e.video, summary: e.summary };
    }
    return { ep: 0, title: story.title, label: R.category(story.category).name, duration: story.duration, sizeMB: story.sizeMB, thumb: story.cover, video: story.video, summary: story.summary };
  };
  R.storyMinutes = function (story) {
    var sec = story.kind === 'series' ? story.episodes.reduce(function (a, e) { return a + e.duration; }, 0) : story.duration;
    return Math.round(sec / 60);
  };

  /* ───────────── الحالة ───────────── */
  var KEY = 'rowad:v1';
  function defaults() {
    return {
      signedIn: false,
      account: null,          // { parentName, email, child: { name, age, avatar } }
      stars: 0,
      favourites: [],         // [storyId]
      downloads: [],          // [{ id, ep, at }]
      progress: {},           // { 'id:ep': { t, d, at } }
      completed: [],          // ['id:ep']
      history: [],            // [{ id, ep, minutes, at }]
      settings: { dailyLimit: 60 },
      seenNotices: false
    };
  }
  var state;
  try { state = Object.assign(defaults(), JSON.parse(localStorage.getItem(KEY) || '{}')); }
  catch (e) { state = defaults(); }

  var listeners = [];
  var store = (R.store = {
    get: function () { return state; },
    save: function () {
      try { localStorage.setItem(KEY, JSON.stringify(state)); } catch (e) { /* وضع التصفح الخاص */ }
      listeners.forEach(function (fn) { fn(state); });
    },
    onChange: function (fn) { listeners.push(fn); },
    child: function () {
      return (state.account && state.account.child) || { name: 'صديقنا', age: 6, avatar: DATA.avatars[0].id };
    },
    isFav: function (id) { return state.favourites.indexOf(id) > -1; },
    isDownloaded: function (id, ep) {
      return state.downloads.some(function (d) { return d.id === id && d.ep === ep; });
    },
    completedStories: function () {
      var seen = {};
      state.completed.forEach(function (k) { seen[k.split(':')[0]] = 1; });
      return Object.keys(seen).length;
    }
  });

  /* بيانات الحساب التجريبي — تُحذف عند الربط بالخادم */
  function seedDemo(email) {
    var now = Date.now(), day = 864e5;
    state = defaults();
    state.signedIn = true;
    state.account = { parentName: 'وليّ الأمر', email: email, child: { name: 'أحمد', age: 6, avatar: 'youssef' } };
    state.stars = 320;
    state.favourites = ['castle', 'whale', 'robo'];
    state.downloads = [{ id: 'robo', ep: 1, at: now - day }, { id: 'moon', ep: 0, at: now - 2 * day }];
    state.progress = { 'robo:1': { t: 260, d: 300, at: now - 3600e3 } };
    state.completed = ['whale:0', 'lion:0', 'castle:0', 'moon:0'];
    state.history = [
      { id: 'robo', ep: 1, minutes: 4, at: now - 3600e3 },
      { id: 'castle', ep: 0, minutes: 5, at: now - 5 * 3600e3 },
      { id: 'whale', ep: 0, minutes: 4, at: now - day },
      { id: 'lion', ep: 0, minutes: 5, at: now - day - 3600e3 },
      { id: 'jungle', ep: 0, minutes: 6, at: now - day - 2 * 3600e3 },
      { id: 'moon', ep: 0, minutes: 4, at: now - 2 * day },
      { id: 'lantern', ep: 0, minutes: 6, at: now - 2 * day - 3600e3 },
      { id: 'rabbit', ep: 0, minutes: 5, at: now - 3 * day },
      { id: 'space', ep: 0, minutes: 7, at: now - 4 * day },
      { id: 'bee', ep: 0, minutes: 4, at: now - 4 * day - 3600e3 },
      { id: 'cloud', ep: 0, minutes: 4, at: now - 4 * day - 2 * 3600e3 },
      { id: 'castle', ep: 0, minutes: 5, at: now - 5 * day },
      { id: 'robo', ep: 1, minutes: 5, at: now - 6 * day },
      { id: 'whale', ep: 0, minutes: 4, at: now - 6 * day - 3600e3 }
    ];
  }

  /* ───────────── طبقة API الوهمية ───────────── */
  R.api = {
    /* POST /auth/login */
    login: function (cred) {
      return wait(700).then(function () {
        var known = state.account && state.account.email === cred.email;
        if (known) { state.signedIn = true; }
        else { seedDemo(cred.email); }   // أي بريد وكلمة مرور صالحين يفتحان الحساب التجريبي
        store.save();
        return state.account;
      });
    },
    /* POST /auth/register */
    signup: function (form) {
      return wait(800).then(function () {
        state = defaults();
        state.signedIn = true;
        state.account = {
          parentName: form.parentName, email: form.email,
          child: { name: form.childName, age: Number(form.age), avatar: form.avatar }
        };
        store.save();      // لا تُحفَظ كلمة المرور في المتصفح إطلاقًا
        return state.account;
      });
    },
    /* POST /auth/forgot-password */
    requestPasswordReset: function () { return wait(800).then(function () { return true; }); },
    /* POST /auth/logout */
    logout: function () { state.signedIn = false; store.save(); }
  };

  /* ───────────── التنبيهات السريعة ───────────── */
  var toastHost;
  function toast(message, opts) {
    opts = opts || {};
    if (!toastHost) {
      toastHost = document.createElement('div');
      toastHost.className = 'toasts';
      toastHost.setAttribute('role', 'status');
      toastHost.setAttribute('aria-live', 'polite');
      document.body.appendChild(toastHost);
    }
    var el = document.createElement('div');
    el.className = 'toast';
    if (opts.tone) el.dataset.tone = opts.tone;
    el.innerHTML = ico(opts.icon || 'check-circle-fill') + '<span>' + esc(message) + '</span>';
    toastHost.appendChild(el);
    while (toastHost.children.length > 2) toastHost.firstChild.remove();
    setTimeout(function () {
      el.classList.add('is-leaving');
      setTimeout(function () { el.remove(); }, 260);
    }, opts.duration || 2600);
  }

  function burst(origin) {
    if (reducedMotion || typeof window.confetti !== 'function') return;
    window.confetti({
      particleCount: 70, spread: 75, startVelocity: 38, ticks: 160, scalar: 1.05,
      origin: origin || { x: 0.5, y: 0.6 },
      colors: ['#ffc21a', '#35b4f6', '#f1352b', '#2fb24c', '#7b52e0', '#ffffff'],
      shapes: ['star', 'circle'], disableForReducedMotion: true
    });
  }

  function pop(el) {
    el.classList.remove('is-pop');
    void el.offsetWidth;
    el.classList.add('is-pop');
  }

  /* ───────────── النجوم ───────────── */
  function renderStars() {
    $$('[data-stars]').forEach(function (el) { el.textContent = state.stars; });
  }
  function addStars(n) {
    state.stars += n;
    store.save();
    renderStars();
    $$('.stars-pill').forEach(function (p) {
      p.classList.remove('is-bump'); void p.offsetWidth; p.classList.add('is-bump');
    });
  }

  /* ───────────── المفضلة والتنزيلات والمشاركة ───────────── */
  function syncFavButtons(id) {
    var on = store.isFav(id), s = R.story(id);
    $$('[data-fav="' + id + '"]').forEach(function (b) {
      b.setAttribute('aria-pressed', on ? 'true' : 'false');
      if (b.classList.contains('fav-btn')) {
        b.setAttribute('aria-label', (on ? 'إزالة «' : 'إضافة «') + s.title + (on ? '» من المفضلة' : '» إلى المفضلة'));
        b.innerHTML = ico(on ? 'heart-fill' : 'heart');
      } else {
        var i = $('.story-action__icon', b);
        if (i) i.innerHTML = ico(on ? 'heart-fill' : 'heart');
      }
    });
  }
  function toggleFav(id, btn) {
    var i = state.favourites.indexOf(id);
    if (i > -1) state.favourites.splice(i, 1); else state.favourites.unshift(id);
    store.save();
    syncFavButtons(id);
    if (btn) pop(btn);
    toast(i > -1 ? 'أُزيلت من المفضلة' : 'أُضيفت إلى المفضلة', { icon: 'heart-fill', tone: 'heart' });
    return i === -1;
  }

  function toggleDownload(id, ep) {
    var i = -1;
    state.downloads.forEach(function (d, k) { if (d.id === id && d.ep === ep) i = k; });
    if (i > -1) state.downloads.splice(i, 1); else state.downloads.unshift({ id: id, ep: ep, at: Date.now() });
    store.save();
    toast(i > -1 ? 'حُذفت من التنزيلات' : 'أُضيفت إلى التنزيلات', { icon: i > -1 ? 'trash-fill' : 'cloud-check-fill', tone: 'ok' });
    return i === -1;
  }

  function share(story) {
    var url = location.origin && location.origin !== 'null'
      ? new URL('story.html?id=' + story.id, location.href).href : location.href;
    var payload = { title: story.title + ' — رواد', text: story.summary, url: url };
    if (navigator.share) { navigator.share(payload).catch(function () {}); return; }
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(url).then(
        function () { toast('نُسخ رابط القصة', { icon: 'check-circle-fill', tone: 'ok' }); },
        function () { toast('تعذّر نسخ الرابط', { icon: 'warning-circle-fill' }); }
      );
    } else {
      toast('المشاركة غير متاحة في هذا المتصفح', { icon: 'info-fill' });
    }
  }

  R.actions = { toggleFav: toggleFav, toggleDownload: toggleDownload, share: share, addStars: addStars, syncFavButtons: syncFavButtons };

  /* نقرة واحدة تُدار مركزيًّا لكل أزرار القلب */
  document.addEventListener('click', function (ev) {
    var b = ev.target.closest && ev.target.closest('[data-fav]');
    if (!b) return;
    ev.preventDefault();
    toggleFav(b.dataset.fav, b);
  });

  /* ───────────── القوالب ───────────── */
  var tpl = (R.tpl = {});

  tpl.storyCard = function (s) {
    var fav = store.isFav(s.id);
    var meta = s.kind === 'series'
      ? '<span>' + ico('stack-fill') + count(s.episodes.length, 'episode') + '</span>'
      : '<span>' + ico('clock-fill') + count(Math.round(s.duration / 60), 'minute') + '</span>';
    return '' +
      '<article class="story-card">' +
        '<a class="story-card__link" href="story.html?id=' + s.id + '">' +
          '<img class="story-card__img" src="' + s.cover + '" alt="" width="756" height="504" loading="lazy" decoding="async">' +
          (s.isNew ? '<span class="story-card__flag badge">جديد</span>' : '') +
          '<span class="story-card__text">' +
            '<span class="story-card__title">' + esc(s.title) + '</span>' +
            '<span class="story-card__meta">' + meta + '<span>' + ico('users-three-fill') + '<span class="num">+' + s.age + '</span> سنوات</span></span>' +
          '</span>' +
        '</a>' +
        '<button class="fav-btn" type="button" data-fav="' + s.id + '" aria-pressed="' + fav + '" aria-label="' +
          (fav ? 'إزالة «' : 'إضافة «') + esc(s.title) + (fav ? '» من المفضلة' : '» إلى المفضلة') + '">' +
          ico(fav ? 'heart-fill' : 'heart') +
        '</button>' +
      '</article>';
  };

  tpl.catCard = function (c) {
    return '' +
      '<a class="cat-card" data-tone="' + c.tone + '" href="stories.html?cat=' + c.id + '">' +
        '<img class="cat-card__icon" src="' + c.icon + '" alt="" width="240" height="240" decoding="async">' +
        '<span class="cat-card__label"><small>قصص</small>' + esc(c.short) + '</span>' +
      '</a>';
  };

  tpl.empty = function (o) {
    return '' +
      '<div class="empty card">' +
        '<img src="' + o.img + '" alt="" width="240" height="240" decoding="async">' +
        '<h2 class="h2">' + esc(o.title) + '</h2>' +
        '<p>' + esc(o.text) + '</p>' +
        (o.cta ? '<a class="btn btn--sun" href="' + o.cta.href + '">' + ico(o.cta.icon || 'book-open-fill') + esc(o.cta.label) + '</a>' : '') +
      '</div>';
  };

  /* ───────────── النوافذ ───────────── */
  function dialog(html, cls) {
    var d = document.createElement('dialog');
    d.className = 'dialog' + (cls ? ' ' + cls : '');
    d.innerHTML = html;
    document.body.appendChild(d);
    d.addEventListener('close', function () { d.remove(); });
    d.addEventListener('click', function (ev) {
      if (ev.target === d || (ev.target.closest && ev.target.closest('[data-close]'))) d.close();
    });
    d.showModal();
    return d;
  }

  /* بوابة وليّ الأمر: سؤال حسابي بسيط قبل الإعدادات الحساسة */
  function parentGate() {
    if (sessionStorage.getItem('rowad:parent-ok') === '1') return Promise.resolve(true);
    return new Promise(function (resolve) {
      var a = 11 + Math.floor(Math.random() * 8), b = 3 + Math.floor(Math.random() * 4);
      var d = dialog(
        '<form class="dialog__body" method="dialog" novalidate>' +
          '<div class="dialog__head">' +
            '<div><h2 class="h2">للكبار فقط</h2><p class="muted">أجب عن السؤال للمتابعة إلى إعدادات وليّ الأمر.</p></div>' +
            '<button class="dialog__close" type="button" data-close aria-label="إغلاق">' + ico('x') + '</button>' +
          '</div>' +
          '<div class="gate__question" aria-hidden="true"><span class="num">' + a + ' × ' + b + ' = ؟</span></div>' +
          '<div class="field">' +
            '<label class="field__label" for="gateAnswer">ما ناتج <span class="num">' + a + ' × ' + b + '</span>؟</label>' +
            '<input class="input" id="gateAnswer" inputmode="numeric" autocomplete="off" dir="ltr" aria-describedby="gateErr">' +
            '<p class="field__error" id="gateErr" role="alert"></p>' +
          '</div>' +
          '<div class="dialog__actions"><button class="btn btn--blue" type="submit">متابعة</button></div>' +
        '</form>'
      );
      var ok = false, input = $('#gateAnswer', d);
      input.focus();
      $('form', d).addEventListener('submit', function (ev) {
        ev.preventDefault();
        var val = input.value.replace(/[٠-٩]/g, function (ch) { return '٠١٢٣٤٥٦٧٨٩'.indexOf(ch); }).trim();
        if (Number(val) === a * b && val !== '') {
          ok = true;
          sessionStorage.setItem('rowad:parent-ok', '1');
          d.close();
        } else {
          input.setAttribute('aria-invalid', 'true');
          $('#gateErr', d).innerHTML = ico('warning-circle-fill') + 'الإجابة غير صحيحة. حاول مرة أخرى.';
          input.select();
        }
      });
      d.addEventListener('close', function () { resolve(ok); });
    });
  }

  /* مشغّل الحلقات: فيديو حقيقي إن وُجد الرابط، وإلا حالة «قريبًا» */
  function openPlayer(story, ep) {
    var u = R.unit(story, ep), key = story.id + ':' + u.ep;
    var d = document.createElement('dialog');
    d.className = 'player';
    d.setAttribute('aria-label', 'مشاهدة: ' + story.title);
    var card = function (img, title, text) {
      return '<img class="player__poster" src="' + u.thumb + '" alt="">' +
        '<div class="soon">' +
          '<img src="' + img + '" alt="" width="240" height="240">' +
          '<h2 class="h2">' + title + '</h2><p>' + text + '</p>' +
          '<button class="btn btn--sun" type="button" data-close>حسنًا</button>' +
        '</div>';
    };
    /* الحد اليومي الذي يضبطه وليّ الأمر من لوحته */
    var limit = state.settings.dailyLimit || 0, today = new Date().toDateString();
    var watched = state.history.reduce(function (a, h) { return a + (new Date(h.at).toDateString() === today ? h.minutes : 0); }, 0);
    var stage;
    if (limit && watched >= limit) {
      u.video = null;
      stage = card('assets/img/icons/bedtime.webp', 'انتهى وقت المشاهدة اليوم', 'شاهدت حكايات جميلة اليوم. نلتقي غدًا في حكاية جديدة!');
    } else if (u.video) {
      stage = '<video src="' + esc(u.video) + '" poster="' + u.thumb + '" controls autoplay playsinline preload="metadata" controlslist="nodownload"></video>';
    } else {
      stage = card('assets/img/icons/robo-wave.webp', 'هذه الحلقة قريبًا', 'نجهّز «' + esc(u.title) + '» الآن، وستكون متاحة للمشاهدة قريبًا.');
    }
    d.innerHTML =
      '<div class="player__bar on-dark">' +
        '<button class="icon-btn icon-btn--glass" type="button" data-close aria-label="إغلاق المشغّل">' + ico('x') + '</button>' +
        '<p class="player__title">' + esc(story.title) + (story.kind === 'series' ? '<small>' + esc(u.label) + '</small>' : '') + '</p>' +
      '</div>' +
      '<div class="player__stage">' + stage + '</div>';
    document.body.appendChild(d);
    d.addEventListener('click', function (ev) { if (ev.target.closest('[data-close]')) d.close(); });

    var video = $('video', d), lastSave = 0;
    if (video) {
      var saved = state.progress[key];
      video.addEventListener('loadedmetadata', function () {
        if (saved && saved.t > 5 && saved.t < video.duration - 5) video.currentTime = saved.t;
      });
      video.addEventListener('timeupdate', function () {
        if (Date.now() - lastSave < 4000) return;
        lastSave = Date.now();
        state.progress[key] = { t: Math.floor(video.currentTime), d: Math.floor(video.duration || u.duration), at: Date.now() };
        store.save();
      });
      video.addEventListener('ended', function () {
        delete state.progress[key];
        var first = state.completed.indexOf(key) === -1;
        if (first) state.completed.push(key);
        state.history.unshift({ id: story.id, ep: u.ep, minutes: Math.round(u.duration / 60), at: Date.now() });
        store.save();
        if (first) { addStars(10); toast('أحسنت! ربحت 10 نجوم', { icon: 'star-fill' }); burst(); }
      });
      video.addEventListener('error', function () {
        toast('تعذّر تشغيل الفيديو. تحقق من الاتصال ثم أعد المحاولة.', { icon: 'warning-circle-fill', duration: 4000 });
      });
    }
    d.addEventListener('close', function () { if (video) video.pause(); d.remove(); });
    d.showModal();
  }

  R.ui = { toast: toast, burst: burst, pop: pop, dialog: dialog, parentGate: parentGate, openPlayer: openPlayer, renderStars: renderStars };

  /* ───────────── الهيكل المشترك ───────────── */
  var NAV = [
    { id: 'home', href: 'home.html', label: 'الرئيسية', icon: 'house' },
    { id: 'stories', href: 'stories.html', label: 'القصص', icon: 'book-open' },
    { id: 'favourites', href: 'favourites.html', label: 'المفضلة', icon: 'heart' },
    { id: 'downloads', href: 'downloads.html', label: 'التنزيلات', icon: 'download-simple' },
    { id: 'profile', href: 'profile.html', label: 'ملفي', icon: 'user' }
  ];
  var LOGO = '<img src="assets/img/brand/logo-280.webp" alt="رواد" width="280" height="215" decoding="async">';
  var SKY = '<div class="sky" aria-hidden="true"><span class="cloud cloud--1"></span><span class="cloud cloud--2"></span><span class="cloud cloud--3"></span><span class="cloud cloud--4"></span></div>';

  function mountShell() {
    var body = document.body, active = body.dataset.nav || body.dataset.page;
    var child = store.child(), av = R.avatar(child.avatar);

    function links(cls) {
      return NAV.map(function (n) {
        var on = n.id === active;
        return '<a class="' + cls + '" href="' + n.href + '"' + (on ? ' aria-current="page"' : '') + '>' +
          ico(n.icon + (on ? '-fill' : '')) + '<span>' + n.label + '</span></a>';
      }).join('');
    }

    var shellHtml = SKY +
      '<aside class="side" aria-label="القائمة الرئيسية">' +
        '<a class="side__logo" href="home.html" aria-label="رواد — الصفحة الرئيسية">' + LOGO + '</a>' +
        '<nav>' + links('nav-link') + '</nav>' +
        '<div class="side__foot">' +
          '<a class="side__parent" href="dashboard.html">' + ico('shield-check-fill') + '<span>لوحة وليّ الأمر<small>متابعة نشاط ' + esc(child.name) + '</small></span></a>' +
        '</div>' +
      '</aside>' +
      '<nav class="tabbar" aria-label="التنقل السريع">' + links('tab') + '</nav>';
    var skip = $('.skip-link');
    if (skip) skip.insertAdjacentHTML('afterend', shellHtml); else body.insertAdjacentHTML('afterbegin', shellHtml);

    var bar = $('#topbar');
    if (bar) {
      var fresh = !state.seenNotices;
      bar.innerHTML =
        '<div class="topbar__bell">' +
          '<button class="icon-btn" type="button" id="bellBtn" aria-expanded="false" aria-controls="bellPop" aria-label="الإشعارات' + (fresh ? ' (جديدة)' : '') + '">' +
            ico('bell') + (fresh ? '<span class="icon-btn__dot"></span>' : '') +
          '</button>' +
          '<div class="popover" id="bellPop" hidden>' +
            '<p class="popover__title">الإشعارات</p>' +
            DATA.notifications.map(function (n) {
              return '<a class="notice" href="' + n.href + '"><span class="tone-icon" data-tone="' + n.tone + '">' + ico(n.icon + '-fill') + '</span>' +
                '<span><strong>' + esc(n.title) + '</strong><span>' + esc(n.text) + '</span></span></a>';
            }).join('') +
          '</div>' +
        '</div>' +
        '<a class="topbar__logo" href="home.html" aria-label="رواد — الصفحة الرئيسية">' + LOGO + '</a>' +
        '<form class="topbar__search search" action="stories.html" role="search">' +
          '<label class="sr-only" for="topSearch">ابحث عن قصة</label>' + ico('magnifying-glass') +
          '<input id="topSearch" type="search" name="q" placeholder="ابحث عن قصة…" autocomplete="off" enterkeyhint="search">' +
        '</form>' +
        '<div class="topbar__me">' +
          '<span class="stars-pill" role="img" aria-label="رصيد النجوم">' + ico('star-fill') + '<span class="num" data-stars>' + state.stars + '</span></span>' +
          '<a class="avatar" href="profile.html" aria-label="ملفي: ' + esc(child.name) + '"><img src="' + av.src + '" alt="" width="112" height="112" data-avatar></a>' +
        '</div>';

      var bell = $('#bellBtn'), popv = $('#bellPop');
      var closePop = function () { popv.hidden = true; bell.setAttribute('aria-expanded', 'false'); };
      bell.addEventListener('click', function (ev) {
        ev.stopPropagation();
        var open = popv.hidden;
        popv.hidden = !open;
        bell.setAttribute('aria-expanded', String(open));
        if (open && !state.seenNotices) {
          state.seenNotices = true; store.save();
          var dot = $('.icon-btn__dot', bell); if (dot) dot.remove();
          bell.setAttribute('aria-label', 'الإشعارات');
        }
      });
      document.addEventListener('click', function (ev) { if (!popv.hidden && !popv.contains(ev.target)) closePop(); });
      document.addEventListener('keydown', function (ev) { if (ev.key === 'Escape' && !popv.hidden) { closePop(); bell.focus(); } });
    }
  }

  R.shell = { mount: mountShell, sky: SKY, logo: LOGO };

  /* ───────────── الإقلاع ───────────── */
  function boot() {
    var page = document.body.dataset.page;
    if (document.body.classList.contains('app')) mountShell();
    var init = R.pages && R.pages[page];
    if (typeof init === 'function') init();
  }
  /* pages.js (آخر ملف) هو من يستدعي الإقلاع بعد تسجيل صفحاته */
  R.boot = boot;
})();
