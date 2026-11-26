/* ==========================================================================
   Chef Kim — interaksi situs
   ========================================================================== */
(function () {
  'use strict';

  window.__ckReady = true;

  /* =========================================================
     KONFIGURASI — ubah sesuai data restoran
     ========================================================= */
  var CONFIG = {
    // Nomor WhatsApp: format internasional, tanpa "+" dan tanpa "0" di depan.
    whatsapp: '6281228885565',
    timezone: 'Asia/Jakarta',
    // Slot reservasi terakhir = jam tutup dikurangi menit ini.
    lastReservationBeforeClose: 60,
    reservationStepMinutes: 30,
    reservationMaxDaysAhead: 60,
    // Link aplikasi pesan antar. Biarkan '' bila belum ada — tombolnya otomatis disembunyikan.
    delivery: {
      gofood: '',
      grabfood: '',
      shopeefood: ''
    }
  };
  // Jam buka diambil dari tabel di index.html (tr[data-day][data-open][data-close]).

  /* ---------- helpers ---------- */
  var $ = function (sel, root) { return (root || document).querySelector(sel); };
  var $$ = function (sel, root) { return Array.prototype.slice.call((root || document).querySelectorAll(sel)); };
  var reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var numberID = new Intl.NumberFormat('id-ID');
  var rupiah = function (n) { return 'Rp ' + numberID.format(n); };
  var DAY_NAMES = ['Minggu', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'];

  var storage = {
    get: function (key) { try { return JSON.parse(window.localStorage.getItem(key)); } catch (e) { return null; } },
    set: function (key, value) { try { window.localStorage.setItem(key, JSON.stringify(value)); } catch (e) { /* abaikan */ } }
  };

  function waLink(text) {
    return 'https://wa.me/' + CONFIG.whatsapp + (text ? '?text=' + encodeURIComponent(text) : '');
  }

  // Buka WhatsApp di tab baru (lewat <a> agar tidak diblokir sebagai pop-up).
  function openWhatsApp(text) {
    var a = document.createElement('a');
    a.href = waLink(text);
    a.target = '_blank';
    a.rel = 'noopener';
    document.body.appendChild(a);
    a.click();
    a.remove();
  }

  function svgIcon(id) {
    var ns = 'http://www.w3.org/2000/svg';
    var svg = document.createElementNS(ns, 'svg');
    svg.setAttribute('class', 'icon');
    svg.setAttribute('aria-hidden', 'true');
    var use = document.createElementNS(ns, 'use');
    use.setAttribute('href', '#' + id);
    svg.appendChild(use);
    return svg;
  }

  /* ---------- waktu Jakarta (WIB) ---------- */
  var dtf = new Intl.DateTimeFormat('en-US', {
    timeZone: CONFIG.timezone, year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit', hourCycle: 'h23', weekday: 'short'
  });
  function jakartaNow() {
    var parts = {};
    dtf.formatToParts(new Date()).forEach(function (p) { parts[p.type] = p.value; });
    return {
      y: +parts.year, m: +parts.month, d: +parts.day,
      day: ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].indexOf(parts.weekday),
      minutes: (+parts.hour % 24) * 60 + +parts.minute
    };
  }
  var pad = function (n) { return (n < 10 ? '0' : '') + n; };
  var toMinutes = function (hhmm) {
    var m = /^(\d{1,2})[:.](\d{2})$/.exec(String(hhmm || '').trim());
    return m ? +m[1] * 60 + +m[2] : null;
  };
  var fmtTime = function (min) { return pad(Math.floor(min / 60) % 24) + '.' + pad(min % 60); };
  var isoDate = function (y, m, d) { return y + '-' + pad(m) + '-' + pad(d); };
  var dateFromISO = function (iso) { return new Date(iso + 'T00:00:00Z'); };
  var addDaysISO = function (iso, n) {
    var dt = dateFromISO(iso); dt.setUTCDate(dt.getUTCDate() + n);
    return isoDate(dt.getUTCFullYear(), dt.getUTCMonth() + 1, dt.getUTCDate());
  };
  var longDate = new Intl.DateTimeFormat('id-ID', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC' });

  /* =========================================================
     Jam buka & status
     ========================================================= */
  var schedule = {};
  $$('[data-hours] tr[data-day]').forEach(function (row) {
    var open = toMinutes(row.getAttribute('data-open'));
    var close = toMinutes(row.getAttribute('data-close'));
    schedule[+row.getAttribute('data-day')] = (open !== null && close !== null && close > open)
      ? { open: open, close: close, row: row }
      : { closed: true, row: row };
  });
  var hasSchedule = Object.keys(schedule).length > 0;

  function computeStatus(now) {
    var today = schedule[now.day];
    if (today && !today.closed) {
      if (now.minutes >= today.open && now.minutes < today.close) {
        return (today.close - now.minutes <= 60)
          ? { state: 'closing', text: 'Segera tutup · ' + fmtTime(today.close) }
          : { state: 'open', text: 'Buka sekarang · sampai ' + fmtTime(today.close) };
      }
      if (now.minutes < today.open) return { state: 'closed', text: 'Tutup · buka pukul ' + fmtTime(today.open) };
    }
    for (var i = 1; i <= 7; i++) {
      var d = (now.day + i) % 7;
      var s = schedule[d];
      if (s && !s.closed) {
        return { state: 'closed', text: 'Tutup · buka ' + (i === 1 ? 'besok' : DAY_NAMES[d]) + ' ' + fmtTime(s.open) };
      }
    }
    return { state: 'closed', text: 'Tutup' };
  }

  function renderStatus() {
    if (!hasSchedule) return;
    var now = jakartaNow();
    var st = computeStatus(now);
    $$('[data-open-status]').forEach(function (el) {
      el.classList.remove('is-open', 'is-closing', 'is-closed');
      el.classList.add('is-' + st.state);
      var t = $('[data-status-text]', el);
      if (t) t.textContent = st.text;
    });
    Object.keys(schedule).forEach(function (k) { schedule[k].row.classList.remove('is-today'); });
    var today = schedule[now.day];
    if (today) today.row.classList.add('is-today');
    var todayText = today && !today.closed ? fmtTime(today.open) + ' – ' + fmtTime(today.close) : 'Tutup';
    $$('[data-today-hours]').forEach(function (el) { el.textContent = todayText; });
    $$('[data-today-hours-label]').forEach(function (el) {
      el.textContent = today && !today.closed ? 'Hari ini buka ' + todayText + ' WIB' : 'Hari ini tutup';
    });
  }
  renderStatus();
  setInterval(renderStatus, 60 * 1000);

  /* =========================================================
     Header, dock, parallax
     ========================================================= */
  var header = $('[data-header]');
  var dock = $('[data-dock]');
  var band = $('.band');
  var bandImg = $('.band__img');
  var ticking = false;

  function onScroll() {
    var y = window.scrollY || window.pageYOffset;
    var vh = window.innerHeight;
    if (header) header.classList.toggle('is-scrolled', y > 24);
    if (dock) dock.classList.toggle('is-visible', y > vh * 0.55);
    if (band && bandImg && !reduceMotion) {
      var r = band.getBoundingClientRect();
      if (r.bottom > 0 && r.top < vh) {
        var p = (r.top + r.height / 2 - vh / 2) / vh;
        bandImg.style.transform = 'translate3d(0,' + (-p * 8).toFixed(2) + '%,0)';
      }
    }
    ticking = false;
  }
  window.addEventListener('scroll', function () {
    if (!ticking) { window.requestAnimationFrame(onScroll); ticking = true; }
  }, { passive: true });
  window.addEventListener('resize', onScroll);
  onScroll();

  /* =========================================================
     Navigasi mobile
     ========================================================= */
  var toggle = $('[data-menu-toggle]');
  var mobileNav = $('[data-mobile-nav]');
  var navTimer;

  function setNav(open) {
    if (!toggle || !mobileNav) return;
    clearTimeout(navTimer);
    toggle.setAttribute('aria-expanded', String(open));
    var label = $('.visually-hidden', toggle);
    if (label) label.textContent = open ? 'Tutup menu navigasi' : 'Buka menu navigasi';
    document.body.classList.toggle('is-locked', open);
    if (header) header.classList.toggle('is-menu-open', open);
    if (open) {
      mobileNav.hidden = false;
      window.requestAnimationFrame(function () {
        mobileNav.classList.add('is-open');
        var first = $('a', mobileNav);
        if (first) first.focus({ preventScroll: true });
      });
    } else {
      mobileNav.classList.remove('is-open');
      navTimer = setTimeout(function () { mobileNav.hidden = true; }, 350);
    }
  }
  if (toggle && mobileNav) {
    toggle.addEventListener('click', function () { setNav(toggle.getAttribute('aria-expanded') !== 'true'); });
    $$('a', mobileNav).forEach(function (a) { a.addEventListener('click', function () { setNav(false); }); });
    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape' && toggle.getAttribute('aria-expanded') === 'true') { setNav(false); toggle.focus(); }
    });
    var desktop = window.matchMedia('(min-width: 1024px)');
    var onDesktop = function (e) { if (e.matches) setNav(false); };
    if (desktop.addEventListener) desktop.addEventListener('change', onDesktop);
    else if (desktop.addListener) desktop.addListener(onDesktop);
  }

  /* =========================================================
     Scrollspy (menandai link nav yang aktif)
     ========================================================= */
  var navLinks = $$('.nav__link');
  if ('IntersectionObserver' in window && navLinks.length) {
    var alias = { andalan: 'menu' };
    var spy = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) {
        if (!en.isIntersecting) return;
        var id = alias[en.target.id] || en.target.id;
        navLinks.forEach(function (a) { a.classList.toggle('is-active', a.getAttribute('href') === '#' + id); });
      });
    }, { rootMargin: '-45% 0px -50% 0px' });
    $$('main section[id]').forEach(function (s) { spy.observe(s); });
  }

  /* =========================================================
     Animasi muncul saat di-scroll
     ========================================================= */
  var revealEls = $$('[data-reveal]');
  revealEls.forEach(function (el) {
    var siblings = Array.prototype.filter.call(el.parentElement.children, function (c) { return c.hasAttribute('data-reveal'); });
    el.style.setProperty('--d', Math.min(siblings.indexOf(el), 6) * 90 + 'ms');
  });
  if ('IntersectionObserver' in window && !reduceMotion) {
    // Konten hero selalu terlihat saat halaman dibuka: animasikan langsung, tanpa menunggu scroll.
    var heroEls = revealEls.filter(function (el) { return el.closest('.hero'); });
    window.requestAnimationFrame(function () {
      window.requestAnimationFrame(function () {
        heroEls.forEach(function (el) { el.classList.add('is-in'); });
      });
    });
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) {
        if (en.isIntersecting) { en.target.classList.add('is-in'); io.unobserve(en.target); }
      });
    }, { rootMargin: '0px 0px -4% 0px', threshold: 0.05 });
    revealEls.forEach(function (el) { if (heroEls.indexOf(el) === -1) io.observe(el); });
  } else {
    revealEls.forEach(function (el) { el.classList.add('is-in'); });
  }

  /* =========================================================
     Tab kategori menu
     ========================================================= */
  var tabs = $$('[data-menu-tabs] [role="tab"]');
  var cats = $$('[data-menu-board] .menu-cat');

  function selectTab(tab, focus) {
    tabs.forEach(function (t) {
      var selected = t === tab;
      t.setAttribute('aria-selected', String(selected));
      t.tabIndex = selected ? 0 : -1;
    });
    var filter = tab.getAttribute('data-filter');
    cats.forEach(function (c) {
      var show = filter === 'all' || c.getAttribute('data-cat') === filter;
      c.hidden = !show;
      if (show && !reduceMotion) {
        c.classList.remove('is-switching');
        void c.offsetWidth; // restart animasi
        c.classList.add('is-switching');
      }
    });
    if (focus) tab.focus();
    if (tab.scrollIntoView && tab.parentElement.scrollWidth > tab.parentElement.clientWidth) {
      tab.parentElement.scrollTo({ left: tab.offsetLeft - tab.parentElement.clientWidth / 2 + tab.offsetWidth / 2, behavior: reduceMotion ? 'auto' : 'smooth' });
    }
  }
  tabs.forEach(function (tab, i) {
    tab.tabIndex = tab.getAttribute('aria-selected') === 'true' ? 0 : -1;
    tab.addEventListener('click', function () { selectTab(tab); });
    tab.addEventListener('keydown', function (e) {
      var j = null;
      if (e.key === 'ArrowRight') j = (i + 1) % tabs.length;
      else if (e.key === 'ArrowLeft') j = (i - 1 + tabs.length) % tabs.length;
      else if (e.key === 'Home') j = 0;
      else if (e.key === 'End') j = tabs.length - 1;
      if (j !== null) { e.preventDefault(); selectTab(tabs[j], true); }
    });
  });

  /* =========================================================
     Toast
     ========================================================= */
  var toastEl = $('[data-toast]');
  var toastTimer;
  function toast(message) {
    if (!toastEl) return;
    toastEl.textContent = '';
    toastEl.appendChild(svgIcon('i-check'));
    toastEl.appendChild(document.createTextNode(message));
    toastEl.hidden = false;
    window.requestAnimationFrame(function () { toastEl.classList.add('is-visible'); });
    clearTimeout(toastTimer);
    toastTimer = setTimeout(function () { toastEl.classList.remove('is-visible'); }, 2200);
  }

  /* =========================================================
     Pesanan via WhatsApp
     ========================================================= */
  var ORDER_KEY = 'chefkim-order-v1';
  var order = new Map();
  (storage.get(ORDER_KEY) || []).forEach(function (l) {
    if (l && typeof l.id === 'string' && typeof l.name === 'string' && l.price > 0 && l.qty > 0) {
      order.set(l.id, { id: l.id, name: l.name, price: +l.price, qty: Math.min(+l.qty, 99) });
    }
  });

  var bar = $('[data-order-bar]');
  var dialog = $('[data-order-dialog]');
  var list = $('[data-order-list]');
  var emptyMsg = $('[data-order-empty]');
  var orderForm = $('[data-order-form]');
  var submitBtn = $('[data-order-submit]');

  function totals() {
    var count = 0, sum = 0;
    order.forEach(function (l) { count += l.qty; sum += l.qty * l.price; });
    return { count: count, sum: sum };
  }
  function saveOrder() { storage.set(ORDER_KEY, Array.from(order.values())); }

  function lineEl(l) {
    var li = document.createElement('li');
    li.className = 'order-line';

    var info = document.createElement('div');
    var name = document.createElement('div');
    name.className = 'order-line__name';
    name.textContent = l.name;
    var unit = document.createElement('div');
    unit.className = 'order-line__unit';
    unit.textContent = rupiah(l.price) + ' / porsi';
    info.appendChild(name);
    info.appendChild(unit);

    var subtotal = document.createElement('div');
    subtotal.className = 'order-line__subtotal';
    subtotal.textContent = rupiah(l.price * l.qty);

    var qty = document.createElement('div');
    qty.className = 'qty';
    var minus = document.createElement('button');
    minus.type = 'button';
    minus.setAttribute('aria-label', 'Kurangi ' + l.name);
    minus.appendChild(svgIcon('i-minus'));
    minus.addEventListener('click', function () { setQty(l.id, l.qty - 1); });
    var out = document.createElement('output');
    out.textContent = l.qty;
    out.setAttribute('aria-label', 'Jumlah ' + l.name);
    var plus = document.createElement('button');
    plus.type = 'button';
    plus.setAttribute('aria-label', 'Tambah ' + l.name);
    plus.appendChild(svgIcon('i-plus'));
    plus.addEventListener('click', function () { setQty(l.id, l.qty + 1); });
    qty.appendChild(minus); qty.appendChild(out); qty.appendChild(plus);

    li.appendChild(info);
    li.appendChild(subtotal);
    li.appendChild(qty);
    return li;
  }

  function renderOrder() {
    var t = totals();
    if (bar) bar.hidden = t.count === 0;
    document.body.classList.toggle('has-order', t.count > 0);
    $$('[data-order-count]').forEach(function (el) { el.textContent = t.count; });
    $$('[data-order-total-bar], [data-order-total]').forEach(function (el) { el.textContent = rupiah(t.sum); });
    if (list) {
      list.textContent = '';
      order.forEach(function (l) { list.appendChild(lineEl(l)); });
    }
    if (emptyMsg) emptyMsg.hidden = t.count > 0;
    if (orderForm) orderForm.hidden = t.count === 0;
    if (submitBtn) submitBtn.disabled = t.count === 0;
  }

  function addItem(item) {
    var current = order.get(item.id);
    if (current) current.qty = Math.min(current.qty + 1, 99);
    else order.set(item.id, { id: item.id, name: item.name, price: item.price, qty: 1 });
    saveOrder();
    renderOrder();
    if (bar && !reduceMotion) {
      bar.classList.remove('is-bump'); void bar.offsetWidth; bar.classList.add('is-bump');
    }
    toast(item.name + ' ditambahkan ke pesanan');
  }

  function setQty(id, qty) {
    if (!order.has(id)) return;
    if (qty <= 0) order.delete(id);
    else order.get(id).qty = Math.min(qty, 99);
    saveOrder();
    renderOrder();
  }

  document.addEventListener('click', function (e) {
    var btn = e.target.closest ? e.target.closest('[data-add]') : null;
    if (!btn) return;
    var host = btn.closest('[data-item]');
    if (!host) return;
    var price = parseInt(host.getAttribute('data-price'), 10);
    if (!(price > 0)) return;
    addItem({ id: host.getAttribute('data-id'), name: host.getAttribute('data-name'), price: price });
    btn.classList.add('is-added');
    setTimeout(function () { btn.classList.remove('is-added'); }, 650);
  });

  function openOrder() {
    if (!dialog) return;
    if (typeof dialog.showModal === 'function') { if (!dialog.open) dialog.showModal(); }
    else dialog.setAttribute('open', '');
    document.body.classList.add('is-locked');
  }
  function closeOrder() {
    if (!dialog) return;
    if (typeof dialog.close === 'function') dialog.close();
    else { dialog.removeAttribute('open'); document.body.classList.remove('is-locked'); }
  }
  if (dialog) {
    dialog.addEventListener('close', function () { document.body.classList.remove('is-locked'); });
    dialog.addEventListener('click', function (e) { if (e.target === dialog) closeOrder(); });
  }
  $$('[data-order-open]').forEach(function (b) { b.addEventListener('click', openOrder); });
  $$('[data-order-close]').forEach(function (b) { b.addEventListener('click', closeOrder); });
  $$('[data-order-clear]').forEach(function (b) {
    b.addEventListener('click', function () { order.clear(); saveOrder(); renderOrder(); });
  });

  /* ---------- validasi kecil ---------- */
  function setError(form, key, input, message) {
    var field = input ? input.closest('.field') : null;
    var holder = form.querySelector('[data-error-for="' + key + '"]');
    if (field) field.classList.toggle('has-error', !!message);
    if (holder) holder.textContent = message || '';
    if (input) {
      if (message) input.setAttribute('aria-invalid', 'true');
      else input.removeAttribute('aria-invalid');
    }
  }

  if (orderForm) {
    var addressField = $('[data-address-field]', orderForm);
    var orderName = orderForm.elements.namedItem('name');
    var orderAddress = orderForm.elements.namedItem('address');
    var orderNotes = orderForm.elements.namedItem('notes');
    var syncMode = function () {
      var mode = orderForm.querySelector('input[name="mode"]:checked');
      if (addressField) addressField.hidden = !(mode && mode.value === 'Diantar');
    };
    $$('input[name="mode"]', orderForm).forEach(function (r) { r.addEventListener('change', syncMode); });
    syncMode();

    orderForm.addEventListener('submit', function (e) {
      e.preventDefault();
      var t = totals();
      if (!t.count) return;
      var mode = orderForm.querySelector('input[name="mode"]:checked');
      var modeValue = mode ? mode.value : '';
      var name = orderName.value.trim();
      var address = orderAddress ? orderAddress.value.trim() : '';
      var ok = true;

      if (name.length < 2) { setError(orderForm, 'o-name', orderName, 'Mohon isi nama pemesan.'); ok = false; }
      else setError(orderForm, 'o-name', orderName, '');
      if (modeValue === 'Diantar' && address.length < 6) { setError(orderForm, 'o-address', orderAddress, 'Mohon isi alamat pengantaran.'); ok = false; }
      else if (orderAddress) setError(orderForm, 'o-address', orderAddress, '');
      if (!ok) { var bad = orderForm.querySelector('[aria-invalid="true"]'); if (bad) bad.focus(); return; }

      var lines = [];
      var n = 0;
      order.forEach(function (l) {
        n += 1;
        lines.push(n + '. ' + l.name + ' × ' + l.qty + ' — ' + rupiah(l.price * l.qty));
      });
      var msg = [
        'Halo Chef Kim, saya ingin memesan:',
        '',
        lines.join('\n'),
        '',
        'Estimasi total: ' + rupiah(t.sum),
        'Cara pemesanan: ' + modeValue,
        'Nama: ' + name
      ];
      if (modeValue === 'Diantar') msg.push('Alamat: ' + address);
      if (orderNotes && orderNotes.value.trim()) msg.push('Catatan: ' + orderNotes.value.trim());
      msg.push('', 'Mohon konfirmasi total dan waktu siapnya. Terima kasih!');
      openWhatsApp(msg.join('\n'));
      toast('Membuka WhatsApp…');
    });
  }

  renderOrder();

  /* =========================================================
     Formulir reservasi
     ========================================================= */
  var rForm = $('[data-reservation]');
  if (rForm) {
    var rName = rForm.elements.namedItem('name');
    var rPhone = rForm.elements.namedItem('phone');
    var rDate = rForm.elements.namedItem('date');
    var rTime = rForm.elements.namedItem('time');
    var rGuests = rForm.elements.namedItem('guests');
    var rArea = rForm.elements.namedItem('area');
    var rNotes = rForm.elements.namedItem('notes');
    var success = $('[data-reservation-success]', rForm);
    var step = CONFIG.reservationStepMinutes;

    // pilihan jumlah tamu
    rGuests.textContent = '';
    for (var g = 1; g <= 20; g++) rGuests.add(new Option(g + ' orang', String(g), false, g === 2));
    rGuests.add(new Option('Lebih dari 20 orang', '20+'));

    var todayISO = function () { var n = jakartaNow(); return isoDate(n.y, n.m, n.d); };

    function slotsFor(iso) {
      var dow = dateFromISO(iso).getUTCDay();
      var s = schedule[dow];
      if (!s || s.closed) return [];
      var start = s.open;
      var end = s.close - CONFIG.lastReservationBeforeClose;
      if (iso === todayISO()) {
        var soonest = jakartaNow().minutes + 30;
        start = Math.max(start, Math.ceil(soonest / step) * step);
      }
      var out = [];
      for (var m = start; m <= end; m += step) out.push(m);
      return out;
    }

    function renderSlots() {
      var previous = rTime.value;
      rTime.textContent = '';
      var iso = rDate.value;
      if (!iso) { rTime.add(new Option('Pilih tanggal dulu', '')); return; }
      var slots = slotsFor(iso);
      if (!slots.length) {
        rTime.add(new Option(iso === todayISO() ? 'Slot hari ini sudah habis' : 'Restoran tutup', ''));
        return;
      }
      rTime.add(new Option('Pilih jam', ''));
      slots.forEach(function (m) { rTime.add(new Option(fmtTime(m) + ' WIB', fmtTime(m))); });
      if (previous && slots.map(fmtTime).indexOf(previous) > -1) rTime.value = previous;
    }

    function setDateBounds() {
      var today = todayISO();
      rDate.min = today;
      rDate.max = addDaysISO(today, CONFIG.reservationMaxDaysAhead);
      if (!rDate.value || rDate.value < today) {
        var first = today;
        for (var i = 0; i < 8 && !slotsFor(first).length; i++) first = addDaysISO(first, 1);
        rDate.value = first;
      }
      renderSlots();
    }
    if (hasSchedule) setDateBounds();
    rDate.addEventListener('change', function () { renderSlots(); setError(rForm, 'date', rDate, ''); });
    rTime.addEventListener('change', function () { setError(rForm, 'time', rTime, ''); });
    rName.addEventListener('input', function () { if (rName.value.trim().length >= 2) setError(rForm, 'name', rName, ''); });
    rPhone.addEventListener('input', function () { if (validPhone(rPhone.value)) setError(rForm, 'phone', rPhone, ''); });

    function validPhone(v) {
      var digits = String(v).replace(/[^\d]/g, '');
      return digits.length >= 9 && digits.length <= 15;
    }

    rForm.addEventListener('submit', function (e) {
      e.preventDefault();
      var ok = true;
      var name = rName.value.trim();
      var iso = rDate.value;

      if (name.length < 2) { setError(rForm, 'name', rName, 'Mohon isi nama Anda.'); ok = false; } else setError(rForm, 'name', rName, '');
      if (!validPhone(rPhone.value)) { setError(rForm, 'phone', rPhone, 'Mohon isi nomor WhatsApp yang valid.'); ok = false; } else setError(rForm, 'phone', rPhone, '');
      if (!iso || iso < rDate.min || (rDate.max && iso > rDate.max)) { setError(rForm, 'date', rDate, 'Pilih tanggal reservasi.'); ok = false; } else setError(rForm, 'date', rDate, '');
      if (!rTime.value) { setError(rForm, 'time', rTime, 'Pilih jam kedatangan.'); ok = false; } else setError(rForm, 'time', rTime, '');
      if (!ok) { var bad = rForm.querySelector('[aria-invalid="true"]'); if (bad) bad.focus(); return; }

      var guests = rGuests.value === '20+' ? 'lebih dari 20 orang' : rGuests.value + ' orang';
      var lines = [
        'Halo Chef Kim, saya ingin reservasi meja.',
        '',
        'Nama: ' + name,
        'No. WhatsApp: ' + rPhone.value.trim(),
        'Tanggal: ' + longDate.format(dateFromISO(iso)),
        'Jam: ' + rTime.value + ' WIB',
        'Jumlah tamu: ' + guests,
        'Area: ' + rArea.value
      ];
      if (rNotes.value.trim()) lines.push('Catatan: ' + rNotes.value.trim());
      lines.push('', 'Mohon konfirmasinya. Terima kasih!');
      openWhatsApp(lines.join('\n'));

      if (success) {
        success.textContent = '';
        success.appendChild(svgIcon('i-check'));
        var p = document.createElement('p');
        p.textContent = 'Terima kasih, ' + name.split(' ')[0] + '! WhatsApp sudah terbuka di tab baru — tinggal tekan kirim. Tim kami akan segera mengonfirmasi reservasi Anda.';
        success.appendChild(p);
        success.hidden = false;
      }
    });
  }

  /* =========================================================
     Link WhatsApp, aplikasi pesan antar, tahun
     ========================================================= */
  $$('[data-wa]').forEach(function (a) { a.href = waLink(a.getAttribute('data-wa-text') || ''); });

  $$('[data-delivery]').forEach(function (a) {
    var url = CONFIG.delivery[a.getAttribute('data-delivery')];
    if (url) { a.href = url; a.hidden = false; }
  });
  var deliveryHint = $('[data-delivery-hint]');
  if (deliveryHint && CONFIG.delivery.gofood) deliveryHint.hidden = true;

  $$('[data-year]').forEach(function (el) { el.textContent = jakartaNow().y; });
})();
