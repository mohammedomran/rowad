/*
 * رواد — منطق كل صفحة. يُستدعى بحسب <body data-page="…">.
 */
(function () {
  'use strict';

  var R = window.Rowad, U = R.util, DATA = R.data, store = R.store, tpl = R.tpl, ui = R.ui, act = R.actions;
  var $ = U.$, $$ = U.$$, esc = U.esc, ico = U.ico, count = U.count, clock = U.clock;
  var pages = (R.pages = {});

  /* ───────────── مشترك ───────────── */
  function fillChild() {
    var c = store.child(), av = R.avatar(c.avatar);
    $$('[data-child-name]').forEach(function (el) { el.textContent = c.name; });
    $$('[data-child-age]').forEach(function (el) { el.textContent = count(c.age, 'year'); });
    $$('[data-avatar]').forEach(function (img) { img.src = av.src; });
  }

  var EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

  function setError(input, message) {
    var box = document.getElementById(input.getAttribute('aria-describedby'));
    input.setAttribute('aria-invalid', message ? 'true' : 'false');
    if (box) box.innerHTML = message ? ico('warning-circle-fill') + '<span>' + esc(message) + '</span>' : '';
    return !message;
  }
  function liveClear(form) {
    form.addEventListener('input', function (ev) {
      var el = ev.target;
      if (el.getAttribute && el.getAttribute('aria-invalid') === 'true') setError(el, '');
    });
  }
  function bindPasswordToggles(root) {
    $$('[data-toggle-password]', root).forEach(function (btn) {
      btn.addEventListener('click', function () {
        var input = document.getElementById(btn.dataset.togglePassword);
        var show = input.type === 'password';
        input.type = show ? 'text' : 'password';
        btn.setAttribute('aria-pressed', String(show));
        btn.setAttribute('aria-label', show ? 'إخفاء كلمة المرور' : 'إظهار كلمة المرور');
        btn.innerHTML = ico(show ? 'eye-slash' : 'eye');
      });
    });
  }
  function safeNext() {
    var next = U.param('next') || '';
    return /^[a-z-]+\.html(\?[\w=&%.-]*)?$/i.test(next) ? next : 'home.html';
  }
  function dayKey(ts) {
    var d = new Date(ts);
    return d.getFullYear() + '-' + (d.getMonth() + 1) + '-' + d.getDate();
  }

  /* ───────────── الرئيسية ───────────── */
  pages.home = function () {
    fillChild();
    var state = store.get();

    $('#heroSlides').innerHTML = DATA.featured.map(function (f, i) {
      var s = R.story(f.story);
      return '' +
        '<div class="swiper-slide hero-slide">' +
          '<img class="hero-slide__img" src="' + (s.wide || s.cover) + '" alt="" width="1536" height="1024" decoding="async"' +
            (i === 0 ? ' fetchpriority="high"' : ' loading="lazy"') + ' style="object-position:' + (s.focus || '50% 50%') + '">' +
          '<div class="hero-slide__body">' +
            '<span class="badge">' + esc(f.badge) + '</span>' +
            '<h2 class="hero-slide__title">' + esc(s.title) + '</h2>' +
            '<p class="hero-slide__line">' + esc(f.line) + '</p>' +
            '<a class="btn btn--sun btn--play" href="story.html?id=' + s.id + '"><span class="btn__play">' + ico('play-fill') + '</span>' + esc(f.cta) + '</a>' +
          '</div>' +
        '</div>';
    }).join('');

    if (window.Swiper) {
      new window.Swiper('#hero', {
        loop: DATA.featured.length > 1,
        speed: 650,
        grabCursor: true,
        autoplay: U.reducedMotion ? false : { delay: 6500, pauseOnMouseEnter: true, disableOnInteraction: false },
        keyboard: { enabled: true, onlyInViewport: true },
        pagination: { el: '#heroDots', clickable: true, bulletElement: 'button' },
        a11y: { paginationBulletMessage: 'الانتقال إلى الشريحة {{index}}', slideLabelMessage: 'الشريحة {{index}} من {{slidesLength}}' }
      });
    }

    $('#cats').innerHTML = DATA.categories.map(tpl.catCard).join('');

    /* أكمل المشاهدة: أحدث حلقة لم تكتمل */
    var keys = Object.keys(state.progress).sort(function (a, b) { return state.progress[b].at - state.progress[a].at; });
    var sec = $('#continueSec');
    if (keys.length) {
      var parts = keys[0].split(':'), s = R.story(parts[0]);
      if (s) {
        var u = R.unit(s, parts[1]), p = state.progress[keys[0]], pct = Math.min(100, Math.round((p.t / p.d) * 100));
        $('#continueCard').innerHTML =
          '<a class="continue-card card" href="story.html?id=' + s.id + '&ep=' + u.ep + '&play=1">' +
            '<span class="continue-card__body">' +
              '<strong class="continue-card__title">' + esc(s.title) + '</strong>' +
              '<span class="continue-card__ep">' + esc(u.label) + '</span>' +
              '<span class="continue-card__bar">' +
                '<span class="progress" role="progressbar" aria-label="نسبة المشاهدة" aria-valuemin="0" aria-valuemax="100" aria-valuenow="' + pct + '"><span style="--v:' + pct + '%"></span></span>' +
                '<span class="num">' + clock(p.t) + ' / ' + clock(p.d) + '</span>' +
              '</span>' +
            '</span>' +
            '<span class="thumb"><img src="' + u.thumb + '" alt="" width="756" height="504" loading="lazy" decoding="async"><span class="play-badge">' + ico('play-fill') + '</span></span>' +
          '</a>';
        sec.hidden = false;
      }
    }

    var daily = R.story(DATA.dailyStory);
    $('#dailyCard').innerHTML =
      '<a class="daily-card" href="story.html?id=' + daily.id + '" aria-label="حكاية اليوم: ' + esc(daily.title) + '">' +
        '<span class="daily-card__play">' + ico('play-fill') + '</span>' +
        '<span class="daily-card__body">' +
          '<strong class="daily-card__title">' + ico('calendar-star-fill') + 'حكاية اليوم</strong>' +
          '<span class="daily-card__text">' + esc(daily.title) + ' — قصة مميزة نختارها لك كل يوم!</span>' +
        '</span>' +
        '<img class="daily-card__art" src="assets/img/icons/daily-book.webp" alt="" width="320" height="320" loading="lazy" decoding="async">' +
      '</a>';

    $('#newRail').innerHTML = DATA.stories.filter(function (s) { return s.isNew; }).map(tpl.storyCard).join('');
  };

  /* ───────────── كل القصص ───────────── */
  pages.stories = function () {
    var grid = $('#grid'), countEl = $('#resultCount'), none = $('#noResults');
    var inputs = [$('#q'), $('#topSearch')].filter(Boolean);
    var cat = R.category(U.param('cat')) ? U.param('cat') : 'all';
    var q = U.param('q') || '';
    inputs.forEach(function (i) { i.value = q; });

    var chips = [{ id: 'all', short: 'الكل', tone: '', glyph: 'squares-four-fill' }].concat(DATA.categories.map(function (c) {
      return { id: c.id, short: c.short, tone: c.tone, glyph: { adventure: 'compass-fill', bedtime: 'moon-stars-fill', values: 'lamp-fill', animals: 'paw-print-fill' }[c.id] };
    }));
    $('#catChips').innerHTML = chips.map(function (c) {
      return '<button class="chip" type="button" data-cat="' + c.id + '" data-tone="' + c.tone + '" aria-pressed="' + (c.id === cat) + '">' + ico(c.glyph) + esc(c.short) + '</button>';
    }).join('');

    function render() {
      var needle = U.norm(q);
      var list = DATA.stories.filter(function (s) {
        if (cat !== 'all' && s.category !== cat) return false;
        if (!needle) return true;
        var hay = U.norm(s.title + ' ' + s.summary + ' ' + R.category(s.category).name +
          (s.episodes ? ' ' + s.episodes.map(function (e) { return e.title; }).join(' ') : ''));
        return hay.indexOf(needle) > -1;
      });
      grid.innerHTML = list.map(tpl.storyCard).join('');
      grid.hidden = !list.length;
      none.hidden = !!list.length;
      countEl.textContent = list.length ? count(list.length, 'story') : '';
      $$('#catChips .chip').forEach(function (b) { b.setAttribute('aria-pressed', String(b.dataset.cat === cat)); });

      var qs = new URLSearchParams();
      if (cat !== 'all') qs.set('cat', cat);
      if (q.trim()) qs.set('q', q.trim());
      var str = qs.toString();
      try { history.replaceState(null, '', location.pathname + (str ? '?' + str : '')); } catch (e) { /* file:// */ }
    }

    $('#catChips').addEventListener('click', function (ev) {
      var b = ev.target.closest('.chip');
      if (!b) return;
      cat = b.dataset.cat;
      render();
    });
    inputs.forEach(function (input) {
      input.addEventListener('input', function () {
        q = input.value;
        inputs.forEach(function (o) { if (o !== input) o.value = q; });
        render();
      });
      if (input.form) input.form.addEventListener('submit', function (ev) { ev.preventDefault(); input.blur(); });
    });
    $('#resetFilters').addEventListener('click', function () {
      cat = 'all'; q = '';
      inputs.forEach(function (i) { i.value = ''; });
      render();
    });
    render();
  };

  /* ───────────── المفضلة ───────────── */
  pages.favourites = function () {
    var grid = $('#grid'), empty = $('#empty'), countEl = $('#resultCount');
    function render() {
      var list = store.get().favourites.map(R.story).filter(Boolean);
      grid.innerHTML = list.map(tpl.storyCard).join('');
      grid.hidden = !list.length;
      empty.hidden = !!list.length;
      countEl.textContent = list.length ? count(list.length, 'story') : '';
    }
    empty.innerHTML = tpl.empty({
      img: 'assets/img/icons/empty-heart.webp',
      title: 'لا توجد قصص مفضلة بعد',
      text: 'اضغط على القلب في أي قصة تعجبك لتجدها هنا دائمًا.',
      cta: { href: 'stories.html', label: 'تصفّح القصص' }
    });
    store.onChange(render);
    render();
  };

  /* ───────────── التنزيلات ───────────── */
  pages.downloads = function () {
    var list = $('#dlList'), empty = $('#empty'), summary = $('#dlSummary');
    function render() {
      var items = store.get().downloads.map(function (d) {
        var s = R.story(d.id);
        return s ? { s: s, u: R.unit(s, d.ep) } : null;
      }).filter(Boolean);

      list.innerHTML = items.map(function (it) {
        var s = it.s, u = it.u;
        return '' +
          '<li class="dl-item card">' +
            '<a class="thumb" href="story.html?id=' + s.id + '&ep=' + u.ep + '&play=1" aria-label="مشاهدة ' + esc(s.title) + '">' +
              '<img src="' + u.thumb + '" alt="" width="756" height="504" loading="lazy" decoding="async"><span class="play-badge">' + ico('play-fill') + '</span>' +
            '</a>' +
            '<div class="dl-item__body">' +
              '<a class="dl-item__title" href="story.html?id=' + s.id + '&ep=' + u.ep + '">' + esc(s.title) + '</a>' +
              '<span class="dl-item__sub">' + esc(u.label) + '</span>' +
              '<span class="dl-item__meta">' +
                '<span class="ok">' + ico('cloud-check-fill') + 'جاهزة للمشاهدة</span>' +
                '<span>' + ico('clock-fill') + count(Math.round(u.duration / 60), 'minute') + '</span>' +
                '<span>' + ico('hard-drives-fill') + '<span class="num">' + u.sizeMB + '</span> م.ب</span>' +
              '</span>' +
            '</div>' +
            '<button class="icon-btn" type="button" data-remove="' + s.id + ':' + u.ep + '" aria-label="حذف «' + esc(s.title) + '» من التنزيلات">' + ico('trash') + '</button>' +
          '</li>';
      }).join('');

      var total = items.reduce(function (a, it) { return a + it.u.sizeMB; }, 0);
      summary.hidden = !items.length;
      list.hidden = !items.length;
      empty.hidden = !!items.length;
      if (items.length) {
        $('#dlCount').textContent = count(items.length, 'item');
        $('#dlSize').textContent = total;
      }
    }
    empty.innerHTML = tpl.empty({
      img: 'assets/img/icons/empty-cloud.webp',
      title: 'لا توجد تنزيلات بعد',
      text: 'نزّل قصصك المفضلة من صفحة القصة لتجدها هنا في أي وقت.',
      cta: { href: 'stories.html', label: 'تصفّح القصص' }
    });
    list.addEventListener('click', function (ev) {
      var b = ev.target.closest('[data-remove]');
      if (!b) return;
      var p = b.dataset.remove.split(':');
      act.toggleDownload(p[0], Number(p[1]));
      render();
    });
    render();
  };

  /* ───────────── صفحة القصة ───────────── */
  pages.story = function () {
    var story = R.story(U.param('id')), main = $('#main');
    if (!story) {
      document.title = 'القصة غير موجودة — رواد';
      main.innerHTML = '<div style="padding-top:48px">' + tpl.empty({
        img: 'assets/img/icons/robo-wave.webp',
        title: 'لم نعثر على هذه القصة',
        text: 'ربما تغيّر رابطها. تصفّح مكتبة القصص واختر حكاية أخرى.',
        cta: { href: 'stories.html', label: 'كل القصص' }
      }) + '</div>';
      return;
    }

    var hero = $('#storyHero'), ep = Number(U.param('ep')) || 0;
    var isSeries = story.kind === 'series';
    var cat = R.category(story.category);

    function renderHero() {
      var u = R.unit(story, ep);
      ep = u.ep;
      var img = story.wide && u.ep <= 1 ? story.wide : u.thumb;
      var focus = story.wide && u.ep <= 1 ? (story.focus || '50% 40%') : '50% 40%';
      var saved = store.get().progress[story.id + ':' + u.ep];
      var fav = store.isFav(story.id), dl = store.isDownloaded(story.id, u.ep);
      var watchLabel = saved ? 'أكمل المشاهدة' : (isSeries ? 'شاهد الحلقة' : 'شاهد القصة');

      document.title = story.title + (isSeries ? ' — ' + u.title : '') + ' — رواد';
      hero.style.setProperty('--cover', 'url("' + u.thumb + '")');
      hero.innerHTML =
        '<div class="story-hero__media" style="--focus:' + focus + '">' +
          '<img class="story-hero__img" src="' + img + '" alt="" width="1536" height="1024" fetchpriority="high" decoding="async">' +
          '<div class="story-hero__top">' +
            '<a class="icon-btn" href="stories.html" aria-label="رجوع إلى القصص">' + ico('arrow-right') + '</a>' +
            '<a href="home.html" aria-label="رواد — الصفحة الرئيسية">' + R.shell.logo + '</a>' +
            '<span style="width:52px" aria-hidden="true"></span>' +
          '</div>' +
        '</div>' +
        '<div class="story-hero__info">' +
          '<button class="btn btn--sun btn--lg btn--play" type="button" id="watchBtn"><span class="btn__play">' + ico('play-fill') + '</span>' + watchLabel + '</button>' +
          '<h1 class="story-hero__title">' + esc(story.title) + '</h1>' +
          (isSeries ? '<p class="story-hero__ep">' + esc(u.label) + '</p>' : '') +
          '<div class="story-hero__meta">' +
            '<span class="pill pill--glass">' + ico('clock') + count(Math.round(u.duration / 60), 'minute') + '</span>' +
            '<span class="pill pill--glass">' + ico('users-three-fill') + '<span class="num">+' + story.age + '</span> سنوات</span>' +
            '<a class="pill pill--glass" href="stories.html?cat=' + cat.id + '">' + esc(cat.name) + '</a>' +
          '</div>' +
          '<p class="story-hero__summary">' + esc(u.summary) + '</p>' +
          '<div class="story-actions">' +
            '<button class="story-action" type="button" data-fav="' + story.id + '" aria-pressed="' + fav + '">' +
              '<span class="story-action__icon">' + ico(fav ? 'heart-fill' : 'heart') + '</span>المفضلة</button>' +
            '<button class="story-action" type="button" data-action="share">' +
              '<span class="story-action__icon">' + ico('share-fat') + '</span>مشاركة</button>' +
            '<button class="story-action" type="button" data-action="download" aria-pressed="' + dl + '">' +
              '<span class="story-action__icon">' + ico(dl ? 'cloud-check-fill' : 'download-simple') + '</span><span data-dl-label>' + (dl ? 'تم التنزيل' : 'تنزيل') + '</span></button>' +
          '</div>' +
        '</div>';
    }

    hero.addEventListener('click', function (ev) {
      if (ev.target.closest('#watchBtn')) { ui.openPlayer(story, ep); return; }
      var b = ev.target.closest('[data-action]');
      if (!b) return;
      if (b.dataset.action === 'share') act.share(story);
      if (b.dataset.action === 'download') {
        var on = act.toggleDownload(story.id, ep);
        b.setAttribute('aria-pressed', String(on));
        $('.story-action__icon', b).innerHTML = ico(on ? 'cloud-check-fill' : 'download-simple');
        $('[data-dl-label]', b).textContent = on ? 'تم التنزيل' : 'تنزيل';
        ui.pop(b);
      }
    });

    /* أسفل الصفحة: حلقات السلسلة أو قصص مشابهة */
    var rail = $('#moreRail'), title = $('#moreTitle');
    if (isSeries) {
      title.innerHTML = ico('stack-fill') + 'حلقات السلسلة';
      $('#moreLink').hidden = true;
      rail.innerHTML = story.episodes.map(function (e) {
        return '<a class="ep-card" href="story.html?id=' + story.id + '&ep=' + e.n + '" data-ep="' + e.n + '" aria-label="الحلقة ' + e.n + ': ' + esc(e.title) + '">' +
          '<img src="' + e.thumb + '" alt="" width="756" height="504" loading="lazy" decoding="async">' +
          '<span class="play-badge">' + ico('play-fill') + '</span>' +
          '<span class="ep-card__label">الحلقة <span class="num">' + e.n + '</span></span></a>';
      }).join('');
      var markCurrent = function () {
        $$('.ep-card', rail).forEach(function (c) { c.setAttribute('aria-current', String(Number(c.dataset.ep) === ep)); });
      };
      rail.addEventListener('click', function (ev) {
        var c = ev.target.closest('.ep-card');
        if (!c) return;
        ev.preventDefault();
        ep = Number(c.dataset.ep);
        renderHero();
        markCurrent();
        try { history.replaceState(null, '', 'story.html?id=' + story.id + '&ep=' + ep); } catch (e) { /* file:// */ }
        window.scrollTo({ top: 0, behavior: U.reducedMotion ? 'auto' : 'smooth' });
      });
      renderHero();
      markCurrent();
    } else {
      var similar = DATA.stories.filter(function (s) { return s.id !== story.id && s.category === story.category; });
      DATA.stories.forEach(function (s) { if (similar.length < 4 && s.id !== story.id && similar.indexOf(s) === -1) similar.push(s); });
      title.innerHTML = ico('sparkle-fill') + 'قصص مشابهة';
      $('#moreLink').href = 'stories.html?cat=' + cat.id;
      rail.classList.add('rail--grid');
      rail.innerHTML = similar.slice(0, 3).map(tpl.storyCard).join('');
      renderHero();
    }

    if (U.param('play') === '1') ui.openPlayer(story, ep);
  };

  /* ───────────── ملفي ───────────── */
  pages.profile = function () {
    function render() {
      var state = store.get(), done = store.completedStories();
      fillChild();
      ui.renderStars();
      $('#statDone').textContent = done;
      $('#statFav').textContent = state.favourites.length;
      $('#statDl').textContent = state.downloads.length;
      $('#badges').innerHTML = DATA.badges.map(function (b) {
        var got = done >= b.need;
        return '<li class="medal' + (got ? '' : ' is-locked') + '">' +
          '<span class="medal__disc" data-tone="' + b.tone + '">' + ico((got ? b.icon : 'lock-key') + '-fill') + '</span>' +
          '<span>' + esc(b.name) + '</span><small>' + (got ? 'حصلت عليه' : esc(b.hint)) + '</small></li>';
      }).join('');
    }

    $('#editAvatar').addEventListener('click', function () {
      var current = store.child().avatar;
      var d = ui.dialog(
        '<form class="dialog__body" method="dialog">' +
          '<div class="dialog__head"><h2 class="h2">اختر صورتك</h2>' +
            '<button class="dialog__close" type="button" data-close aria-label="إغلاق">' + ico('x') + '</button></div>' +
          '<div class="avatar-picker" role="radiogroup" aria-label="الصور المتاحة">' +
            DATA.avatars.map(function (a) {
              return '<label class="avatar-option"><input type="radio" name="avatar" value="' + a.id + '"' + (a.id === current ? ' checked' : '') + '>' +
                '<img src="' + a.src + '" alt="' + esc(a.name) + '" width="256" height="256"></label>';
            }).join('') +
          '</div>' +
          '<div class="dialog__actions"><button class="btn btn--sun" type="submit">حفظ الصورة</button></div>' +
        '</form>', 'dialog--wide');
      $('form', d).addEventListener('submit', function () {
        var pick = $('input[name="avatar"]:checked', d);
        if (pick && pick.value !== current) {
          store.get().account.child.avatar = pick.value;
          store.save();
          render();
          ui.toast('تغيّرت صورتك', { icon: 'smiley-fill' });
        }
      });
    });

    $('#openDashboard').addEventListener('click', function () {
      ui.parentGate().then(function (ok) { if (ok) location.href = 'dashboard.html'; });
    });

    $('#editChild').addEventListener('click', function () {
      ui.parentGate().then(function (ok) {
        if (!ok) return;
        var c = store.child();
        var ages = [3, 4, 5, 6, 7, 8, 9].map(function (a) {
          return '<label><input type="radio" name="age" value="' + a + '"' + (a === c.age ? ' checked' : '') + '><span class="num">' + a + '</span></label>';
        }).join('');
        var d = ui.dialog(
          '<form class="dialog__body" novalidate>' +
            '<div class="dialog__head"><h2 class="h2">بيانات الطفل</h2>' +
              '<button class="dialog__close" type="button" data-close aria-label="إغلاق">' + ico('x') + '</button></div>' +
            '<div class="field"><label class="field__label" for="editName">اسم الطفل</label>' +
              '<input class="input" id="editName" maxlength="20" autocomplete="off" value="' + esc(c.name) + '" aria-describedby="editNameErr">' +
              '<p class="field__error" id="editNameErr" aria-live="polite"></p></div>' +
            '<fieldset class="field" style="border:0;padding:0;margin:0"><legend class="field__label" style="padding:0;margin-bottom:6px">العمر</legend>' +
              '<div class="age-picker">' + ages + '</div></fieldset>' +
            '<div class="dialog__actions"><button class="btn btn--blue" type="submit">حفظ التغييرات</button></div>' +
          '</form>');
        $('form', d).addEventListener('submit', function (ev) {
          ev.preventDefault();
          var name = $('#editName', d), val = name.value.trim();
          if (!setError(name, val.length < 2 ? 'اكتب اسم الطفل (حرفان على الأقل).' : '')) { name.focus(); return; }
          var child = store.get().account.child;
          child.name = val;
          child.age = Number($('input[name="age"]:checked', d).value);
          store.save();
          render();
          d.close();
          ui.toast('حُفظت التغييرات', { tone: 'ok' });
        });
      });
    });

    $('#logout').addEventListener('click', function () {
      ui.parentGate().then(function (ok) {
        if (!ok) return;
        sessionStorage.removeItem('rowad:parent-ok');
        R.api.logout();
        location.href = 'index.html';
      });
    });

    render();
  };

  /* ───────────── لوحة وليّ الأمر ───────────── */
  pages.dashboard = function () {
    var main = $('#main');
    ui.parentGate().then(function (ok) {
      if (!ok) { location.replace('profile.html'); return; }
      main.hidden = false;
      render();
    });

    var DAY_NAMES = ['الأحد', 'الاثنين', 'الثلاثاء', 'الأربعاء', 'الخميس', 'الجمعة', 'السبت'];
    /* ألوان التصنيفات في المخطط — مجتازة لفحص تمايز الألوان (عمى الألوان) */
    var CAT_COLOR = { adventure: '#e46e00', bedtime: '#5f36c9', values: '#35b4f6', animals: '#1d9238' };

    function week() {
      var days = [], base = new Date();
      base.setHours(12, 0, 0, 0);
      for (var i = 6; i >= 0; i--) {
        var d = new Date(base.getTime() - i * 864e5);
        days.push({ key: dayKey(d), name: DAY_NAMES[d.getDay()], minutes: 0, today: i === 0 });
      }
      return days;
    }

    function render() {
      var state = store.get(), child = store.child(), days = week();
      var index = {}, cats = {}, total = 0;
      days.forEach(function (d, i) { index[d.key] = i; });
      DATA.categories.forEach(function (c) { cats[c.id] = 0; });
      state.history.forEach(function (h) {
        var i = index[dayKey(h.at)], s = R.story(h.id);
        if (i == null || !s) return;
        days[i].minutes += h.minutes;
        cats[s.category] += h.minutes;
        total += h.minutes;
      });
      var streak = 0;
      for (var k = days.length - 1; k >= 0; k--) {
        if (days[k].minutes > 0) streak++;
        else if (k === days.length - 1) continue;   // اليوم لم ينتهِ بعد
        else break;
      }

      fillChild();
      ui.renderStars();
      $('#tWeek').textContent = total;
      $('#tDone').textContent = store.completedStories();
      $('#tFav').textContent = state.favourites.length;
      $('#tStreak').textContent = streak;
      $('#kidLine').textContent = count(child.age, 'year');

      /* المخطط الأسبوعي */
      var limit = state.settings.dailyLimit || 0;
      var peak = Math.max.apply(null, days.map(function (d) { return d.minutes; }).concat([limit, 10]));
      var max = Math.ceil(peak / 10) * 10;
      var chart = $('#weekChart'), empty = $('#weekEmpty');
      $('#weekTotal').innerHTML = '<strong class="num">' + total + '</strong> ' + (total >= 3 && total <= 10 ? 'دقائق' : 'دقيقة') + ' هذا الأسبوع';
      chart.hidden = total === 0;
      $('#weekAxis').hidden = total === 0;
      empty.hidden = total !== 0;
      chart.innerHTML =
        '<div class="bars__grid" aria-hidden="true">' +
          [1, 0.5].map(function (f) {
            return '<span style="bottom:' + f * 100 + '%"><b class="num">' + Math.round(max * f) + '</b></span>';
          }).join('') +
        '</div>' +
        (limit ? '<div class="bars__limit" style="bottom:' + (limit / max) * 100 + '%" aria-hidden="true"><span>الحد اليومي <span class="num">' + limit + '</span></span></div>' : '') +
        days.map(function (d) {
          var h = (d.minutes / max) * 100;
          var label = d.minutes ? count(d.minutes, 'minute') : 'لا مشاهدة';
          return '<div class="bar' + (d.today ? ' is-today' : '') + '" tabindex="0" role="img" style="--h:' + h + '%" aria-label="' + d.name + (d.today ? ' (اليوم)' : '') + ': ' + label + '">' +
            '<span class="bar__tip">' + label + '</span><span class="bar__fill"></span></div>';
        }).join('');
      $('#weekAxis').innerHTML = days.map(function (d) {
        return '<span class="' + (d.today ? 'is-today' : '') + '">' + (d.today ? 'اليوم' : d.name.replace(/^ال/, '')) + '</span>';
      }).join('');
      $('#weekTable tbody').innerHTML = days.map(function (d) {
        return '<tr><td>' + d.name + (d.today ? ' (اليوم)' : '') + '</td><td class="num">' + d.minutes + '</td></tr>';
      }).join('');

      /* التصنيفات */
      var top = Math.max.apply(null, Object.keys(cats).map(function (id) { return cats[id]; }).concat([1]));
      $('#catBars').innerHTML = DATA.categories.map(function (c) {
        return '<li class="hbar" style="--c:' + CAT_COLOR[c.id] + '">' +
          '<span class="hbar__name"><span class="hbar__dot"></span>' + esc(c.short) + '</span>' +
          '<span class="hbar__track"><span class="hbar__fill" style="--v:' + (cats[c.id] / top) * 100 + '%"></span></span>' +
          '<span class="hbar__value"><span class="num">' + cats[c.id] + '</span> د</span></li>';
      }).join('');

      /* آخر النشاط */
      var recent = state.history.slice(0, 5), today = dayKey(Date.now()), yesterday = dayKey(Date.now() - 864e5);
      $('#activity').innerHTML = recent.length ? recent.map(function (h) {
        var s = R.story(h.id);
        if (!s) return '';
        var u = R.unit(s, h.ep), key = dayKey(h.at);
        var when = key === today ? 'اليوم' : key === yesterday ? 'أمس' : 'قبل ' + count(Math.max(2, Math.round((Date.now() - h.at) / 864e5)), 'day');
        return '<li class="activity__item"><img src="' + u.thumb + '" alt="" width="168" height="112" loading="lazy" decoding="async">' +
          '<span><strong>' + esc(s.title) + '</strong><span>' + when + ' — ' + count(h.minutes, 'minute') + '</span></span></li>';
      }).join('') : '<li class="muted" style="padding:8px 6px">لم يشاهد ' + esc(child.name) + ' أي قصة بعد.</li>';

      $$('#limitSeg button').forEach(function (b) {
        b.setAttribute('aria-pressed', String(Number(b.dataset.limit) === limit));
      });
    }

    $('#limitSeg').addEventListener('click', function (ev) {
      var b = ev.target.closest('button');
      if (!b) return;
      store.get().settings.dailyLimit = Number(b.dataset.limit);
      store.save();
      render();
      ui.toast(Number(b.dataset.limit) ? 'حُفظ الحد اليومي' : 'أُلغي الحد اليومي', { tone: 'ok' });
    });

    $('#toggleTable').addEventListener('click', function () {
      var wrap = $('#weekTableWrap'), show = wrap.hidden;
      wrap.hidden = !show;
      this.setAttribute('aria-expanded', String(show));
      $('span', this).textContent = show ? 'إخفاء الجدول' : 'عرض كجدول';
    });
  };

  /* ───────────── تسجيل الدخول ───────────── */
  pages.login = function () {
    var form = $('#loginForm'), email = $('#email'), pass = $('#password'), btn = $('#submitBtn');
    bindPasswordToggles(form);
    liveClear(form);
    form.addEventListener('submit', function (ev) {
      ev.preventDefault();
      var a = setError(email, !email.value.trim() ? 'اكتب بريدك الإلكتروني.' : !EMAIL.test(email.value.trim()) ? 'صيغة البريد غير صحيحة. مثال: name@example.com' : '');
      var b = setError(pass, !pass.value ? 'اكتب كلمة المرور.' : '');
      if (!a) { email.focus(); return; }
      if (!b) { pass.focus(); return; }
      btn.classList.add('is-loading');
      btn.setAttribute('aria-busy', 'true');
      R.api.login({ email: email.value.trim().toLowerCase(), password: pass.value }).then(function () {
        location.href = safeNext();
      }).catch(function () {
        btn.classList.remove('is-loading');
        btn.removeAttribute('aria-busy');
        $('#formAlert').hidden = false;
      });
    });
  };

  /* ───────────── إنشاء حساب (خطوتان) ───────────── */
  pages.signup = function () {
    var form = $('#signupForm'), step = 1;
    var s1 = $('#step1'), s2 = $('#step2'), done = $('#signupDone');
    var parentName = $('#parentName'), email = $('#email'), pass = $('#password'), agree = $('#agree');
    var childName = $('#childName'), btn = $('#submitBtn');

    $('#agePicker').innerHTML = [3, 4, 5, 6, 7, 8, 9].map(function (a) {
      return '<label><input type="radio" name="age" value="' + a + '"' + (a === 5 ? ' checked' : '') + '><span class="num">' + a + '</span></label>';
    }).join('');
    $('#avatarPicker').innerHTML = DATA.avatars.map(function (a, i) {
      return '<label class="avatar-option"><input type="radio" name="avatar" value="' + a.id + '"' + (i === 0 ? ' checked' : '') + '>' +
        '<img src="' + a.src + '" alt="' + esc(a.name) + '" width="256" height="256" loading="lazy"></label>';
    }).join('');

    bindPasswordToggles(form);
    liveClear(form);

    function show(n) {
      step = n;
      s1.hidden = n !== 1;
      s2.hidden = n !== 2;
      $$('.steps__item').forEach(function (el, i) {
        el.classList.toggle('is-done', i + 1 < n);
        if (i + 1 === n) el.setAttribute('aria-current', 'step'); else el.removeAttribute('aria-current');
      });
      (n === 1 ? parentName : childName).focus();
    }

    function validStep1() {
      var checks = [
        [parentName, parentName.value.trim().length < 2 ? 'اكتب اسمك (حرفان على الأقل).' : ''],
        [email, !email.value.trim() ? 'اكتب بريدك الإلكتروني.' : !EMAIL.test(email.value.trim()) ? 'صيغة البريد غير صحيحة. مثال: name@example.com' : ''],
        [pass, pass.value.length < 8 ? 'كلمة المرور قصيرة. استخدم 8 أحرف على الأقل.' : '']
      ];
      var firstBad = null;
      checks.forEach(function (c) { if (!setError(c[0], c[1]) && !firstBad) firstBad = c[0]; });
      var agreeErr = $('#agreeErr');
      agreeErr.innerHTML = agree.checked ? '' : ico('warning-circle-fill') + '<span>يلزم قبول الشروط لإنشاء الحساب.</span>';
      if (!agree.checked && !firstBad) firstBad = agree;
      if (firstBad) firstBad.focus();
      return !firstBad;
    }
    agree.addEventListener('change', function () { if (agree.checked) $('#agreeErr').innerHTML = ''; });

    $('#backBtn').addEventListener('click', function () { show(1); });

    form.addEventListener('submit', function (ev) {
      ev.preventDefault();
      if (step === 1) { if (validStep1()) show(2); return; }
      if (!setError(childName, childName.value.trim().length < 2 ? 'اكتب اسم الطفل (حرفان على الأقل).' : '')) { childName.focus(); return; }
      btn.classList.add('is-loading');
      btn.setAttribute('aria-busy', 'true');
      R.api.signup({
        parentName: parentName.value.trim(), email: email.value.trim().toLowerCase(),
        childName: childName.value.trim(),
        age: $('input[name="age"]:checked', form).value,
        avatar: $('input[name="avatar"]:checked', form).value
      }).then(function (account) {
        form.hidden = true;
        $('.steps').hidden = true;
        $('#authHead').hidden = true;
        $('#authAlt').hidden = true;
        $('#doneName').textContent = account.child.name;
        $('#doneAvatar').src = R.avatar(account.child.avatar).src;
        done.hidden = false;
        $('#startBtn').focus();
        ui.burst({ x: 0.5, y: 0.45 });
      });
    });
  };

  /* ───────────── نسيت كلمة المرور ───────────── */
  pages.forgot = function () {
    var form = $('#forgotForm'), email = $('#email'), btn = $('#submitBtn'), done = $('#forgotDone');
    liveClear(form);
    form.addEventListener('submit', function (ev) {
      ev.preventDefault();
      var val = email.value.trim();
      if (!setError(email, !val ? 'اكتب بريدك الإلكتروني.' : !EMAIL.test(val) ? 'صيغة البريد غير صحيحة. مثال: name@example.com' : '')) { email.focus(); return; }
      btn.classList.add('is-loading');
      btn.setAttribute('aria-busy', 'true');
      R.api.requestPasswordReset(val).then(function () {
        btn.classList.remove('is-loading');
        btn.removeAttribute('aria-busy');
        form.hidden = true;
        $('#authHead').hidden = true;
        $('#sentTo').textContent = val;
        done.hidden = false;
        $('#backToLogin').focus();
      });
    });
    $('#resend').addEventListener('click', function () {
      var b = this;
      b.disabled = true;
      R.api.requestPasswordReset(email.value.trim()).then(function () {
        ui.toast('أعدنا إرسال الرسالة', { tone: 'ok' });
        setTimeout(function () { b.disabled = false; }, 20000);
      });
    });
  };

  /* ───────────── الصفحة التعريفية ───────────── */
  pages.landing = function () {
    var state = store.get();
    if (state.signedIn && state.account) {
      $('#headActions').innerHTML = '<a class="btn btn--sun btn--sm" href="home.html">' + ico('play-fill') + 'متابعة المشاهدة</a>';
      $$('[data-cta]').forEach(function (a) { a.href = 'home.html'; });
      $$('[data-cta-label]').forEach(function (el) { el.textContent = 'متابعة المشاهدة'; });
      $$('[data-login]').forEach(function (a) { a.hidden = true; });
    }
    $('#cats').innerHTML = DATA.categories.map(tpl.catCard).join('');
    $('#previewRail').innerHTML = ['whale', 'jungle', 'castle', 'lion', 'space', 'lantern'].map(function (id) {
      return tpl.storyCard(R.story(id)).replace(/<button class="fav-btn"[\s\S]*?<\/button>/, '');
    }).join('');
  };

  /* آخر ملف يُحمَّل: نبدأ الإقلاع بعد تسجيل كل الصفحات */
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', R.boot); else R.boot();
})();
