// 整頁的小互動：捲動出現、編輯台換標題、便條紙翻面、角色卡跟著滑鼠傾斜＋點了說話、波浪分隔線
(function () {
  function ease(t) { return 1 - Math.pow(1 - t, 3); }

  // ---------- 上方選單：往下捲之後加深色底 ----------
  var topbar = document.querySelector('.topbar');
  function onScroll() { if (topbar) topbar.classList.toggle('scrolled', window.scrollY > 40); }
  window.addEventListener('scroll', onScroll, { passive: true });
  onScroll();

  // ---------- 捲動到才出現 ----------
  var items = document.querySelectorAll('.reveal');
  if ('IntersectionObserver' in window) {
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (e) { if (e.isIntersecting) { e.target.classList.add('in'); io.unobserve(e.target); } });
    }, { threshold: 0.15 });
    items.forEach(function (el, i) { el.style.transitionDelay = (i % 3) * 0.08 + 's'; io.observe(el); });
  } else items.forEach(function (el) { el.classList.add('in'); });

  // ---------- 編輯台：換標題，流量和良心跟著變 ----------
  var title = document.getElementById('draftTitle');
  document.querySelectorAll('.choice').forEach(function (btn) {
    btn.addEventListener('click', function () {
      document.querySelectorAll('.choice').forEach(function (b) { var on = b === btn; b.classList.toggle('on', on); b.setAttribute('aria-checked', on ? 'true' : 'false'); });
      title.classList.add('swap');
      setTimeout(function () { title.textContent = btn.dataset.t; title.classList.remove('swap'); }, 250);
      document.getElementById('gTraffic').style.width = btn.dataset.v + '%';
      document.getElementById('gConscience').style.width = btn.dataset.c + '%';
    });
  });

  // ---------- 便條紙翻面 ----------
  document.querySelectorAll('.flip').forEach(function (f) {
    f.addEventListener('click', function () { f.classList.toggle('open'); });
  });

  // ---------- 角色卡：跟著滑鼠輕輕傾斜；點了說一句話（打字機） ----------
  document.querySelectorAll('.person').forEach(function (card) {
    var rx = 0, ry = 0, tx = 0, ty = 0, running = false, typing = null;
    function loop() {
      rx += (tx - rx) * 0.12; ry += (ty - ry) * 0.12;
      card.style.transform = 'perspective(800px) rotateX(' + rx + 'deg) rotateY(' + ry + 'deg)';
      if (Math.abs(tx - rx) > 0.01 || Math.abs(ty - ry) > 0.01) requestAnimationFrame(loop); else running = false;
    }
    function go() { if (!running) { running = true; requestAnimationFrame(loop); } }
    card.addEventListener('pointermove', function (e) {
      var b = card.getBoundingClientRect();
      ty = ((e.clientX - b.left) / b.width - 0.5) * 12;
      tx = -((e.clientY - b.top) / b.height - 0.5) * 10;
      go();
    });
    card.addEventListener('pointerleave', function () { tx = ty = 0; go(); });
    card.addEventListener('click', function () {
      var on = card.classList.toggle('chibi-on');          // 變成 Q 版／變回來
      if (!on) { card.classList.remove('talk'); return; }
      var bubble = card.querySelector('.bubble'), text = card.dataset.say, i = 0;
      if (typing) clearInterval(typing);
      bubble.textContent = '';
      card.classList.add('talk');
      typing = setInterval(function () {
        bubble.textContent = text.slice(0, ++i);
        if (i >= text.length) {
          clearInterval(typing);
          typing = setTimeout(function () { card.classList.remove('talk'); }, 2600);
        }
      }, 55);
    });
  });

  // ---------- 波浪分隔線：一條會慢慢晃的「流量」，捲越快晃越大 ----------
  var seps = [];
  document.querySelectorAll('.wave-sep canvas').forEach(function (c) { seps.push({ c: c, ctx: c.getContext('2d'), flip: c.parentNode.classList.contains('flip-y') }); });
  var lastY = window.scrollY, energy = 0;
  window.addEventListener('scroll', function () { energy = Math.min(1, energy + Math.abs(window.scrollY - lastY) / 600); lastY = window.scrollY; }, { passive: true });
  function draw(now) {
    var t = now / 1000;
    energy *= 0.96;
    seps.forEach(function (s) {
      var w = s.c.clientWidth, h = s.c.clientHeight, d = Math.min(window.devicePixelRatio || 1, 2);
      if (s.c.width !== Math.round(w * d)) { s.c.width = Math.round(w * d); s.c.height = Math.round(h * d); }
      var ctx = s.ctx; ctx.setTransform(d, 0, 0, d, 0, 0); ctx.clearRect(0, 0, w, h);
      var amp = 6 + energy * 18;
      for (var layer = 0; layer < 2; layer++) {
        ctx.beginPath();
        ctx.moveTo(0, s.flip ? 0 : h);
        for (var x = 0; x <= w + 10; x += 10) {
          var y = h * 0.5 + Math.sin(x * 0.01 + t * (1.2 + layer * 0.4) + layer * 2) * amp + Math.sin(x * 0.027 - t) * amp * 0.4;
          ctx.lineTo(x, s.flip ? h - y : y);
        }
        ctx.lineTo(w, s.flip ? 0 : h); ctx.closePath();
        ctx.fillStyle = layer === 0 ? 'rgba(200,36,45,.35)' : '#1b1830';
        ctx.fill();
      }
    });
    requestAnimationFrame(draw);
  }
  requestAnimationFrame(draw);
})();
