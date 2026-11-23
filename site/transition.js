// 切換畫面：「流量」從下面湧上來淹滿畫面 → 換到目標位置 → 流量往下退掉，露出新的一區
//   點上方選單、按「讓流量退潮」都用這個；往下捲時，每一區從下往上被「揭開」
//   全部有緩動；瀏覽器設定「減少動態」時直接跳過去
(function () {
  var reduce = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var canvas = document.createElement('canvas');
  canvas.className = 'flow-cover';
  canvas.setAttribute('aria-hidden', 'true');
  document.body.appendChild(canvas);
  var ctx = canvas.getContext('2d');
  var W = 0, H = 0, D = Math.min(window.devicePixelRatio || 1, 2);
  function resize() { W = window.innerWidth; H = window.innerHeight; canvas.width = W * D; canvas.height = H * D; ctx.setTransform(D, 0, 0, D, 0, 0); }
  window.addEventListener('resize', resize); resize();

  var busy = false, bubbles = [];
  function easeInOut(t) { return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2; }

  // level：0 = 沒有淹、1 = 淹滿；rising：往上漲（浪在上緣）還是往下退（浪在下緣）
  function draw(level, rising, t) {
    ctx.clearRect(0, 0, W, H);
    if (level <= 0) return;
    var edge = rising ? H * (1 - level) : H * level;      // 浪的位置
    ctx.beginPath();
    if (rising) { ctx.moveTo(0, H); for (var x = 0; x <= W + 10; x += 10) ctx.lineTo(x, edge + Math.sin(x * 0.012 + t * 6) * 18 + Math.sin(x * 0.03 - t * 4) * 8); ctx.lineTo(W, H); }
    else { ctx.moveTo(0, 0); for (var x2 = 0; x2 <= W + 10; x2 += 10) ctx.lineTo(x2, edge + Math.sin(x2 * 0.012 + t * 6) * 18 + Math.sin(x2 * 0.03 - t * 4) * 8); ctx.lineTo(W, 0); }
    ctx.closePath();
    var g = ctx.createLinearGradient(0, 0, 0, H);
    g.addColorStop(0, '#d92b33'); g.addColorStop(1, '#8f141b');
    ctx.fillStyle = g; ctx.fill();
    // 亮亮的浪尖
    ctx.strokeStyle = 'rgba(255,255,255,.35)'; ctx.lineWidth = 3; ctx.stroke();
    // 泡泡往上冒
    ctx.strokeStyle = 'rgba(255,255,255,.55)'; ctx.lineWidth = 1.5;
    bubbles.forEach(function (b) {
      b.y -= b.v; b.x += Math.sin(t * 3 + b.w) * 0.6;
      var top = rising ? edge : 0, bottom = rising ? H : edge;
      if (b.y < top + 10 || b.y > bottom) return;
      ctx.beginPath(); ctx.arc(b.x, b.y, b.r, 0, Math.PI * 2); ctx.stroke();
    });
  }

  function run(ms, rising, from, to) {
    return new Promise(function (done) {
      var start = performance.now();
      (function tick(now) {
        var k = Math.min(1, (now - start) / ms);
        draw(from + (to - from) * easeInOut(k), rising, now / 1000);
        if (k < 1) requestAnimationFrame(tick); else done();
      })(start);
    });
  }

  // 對外：淹滿 → 做事（換位置）→ 退潮
  window.flowTransition = function (action) {
    if (busy) return;
    if (reduce) { action(); return; }
    busy = true;
    canvas.classList.add('on');
    bubbles = [];
    for (var i = 0; i < 40; i++) bubbles.push({ x: Math.random() * W, y: H + Math.random() * H, r: 2 + Math.random() * 7, v: 3 + Math.random() * 5, w: Math.random() * 6 });
    run(650, true, 0, 1).then(function () {
      action();
      return new Promise(function (r) { setTimeout(r, 120); });
    }).then(function () {
      bubbles.forEach(function (b) { b.y = Math.random() * H; });
      return run(750, false, 1, 0);
    }).then(function () { canvas.classList.remove('on'); ctx.clearRect(0, 0, W, H); busy = false; });
  };

  // 點上方選單、頁面裡的 #連結：用流量切換過去
  document.querySelectorAll('a[href^="#"]').forEach(function (a) {
    a.addEventListener('click', function (e) {
      var id = a.getAttribute('href');
      var target = id.length > 1 ? document.querySelector(id) : document.body;
      if (!target) return;
      e.preventDefault();
      window.flowTransition(function () {
        var y = id === '#top' ? 0 : target.getBoundingClientRect().top + window.scrollY - 60;   // 留位置給釘在上面的選單
        window.scrollTo({ top: y, behavior: 'instant' });
        if (history.replaceState) history.replaceState(null, '', id);
      });
    });
  });

  // 往下捲：每一區從下往上被揭開（像流量退掉露出來）
  var bands = document.querySelectorAll('.band');
  if ('IntersectionObserver' in window && !reduce) {
    bands.forEach(function (b) { b.classList.add('unveil'); });
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (e) { if (e.isIntersecting) { e.target.classList.add('unveiled'); io.unobserve(e.target); } });
    }, { threshold: 0.08 });
    bands.forEach(function (b) { io.observe(b); });
  }
})();
