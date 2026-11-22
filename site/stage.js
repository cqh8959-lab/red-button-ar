// 開場舞台：角色站在「流量」裡
//   畫面下面是一池會晃的液體（流量），角色的下半身泡在裡面
//   拿起角色（按住拖曳）→ 搖一搖：液體晃動、冒出泡泡和留言 → 放開：角色彈回原位
//   下面的小圖切換角色：舊的沉下去、新的浮上來，顏色跟著慢慢變
(function () {
  var stage = document.getElementById('stage');
  if (!stage) return;
  var canvas = document.getElementById('liquid');
  var ctx = canvas.getContext('2d');
  var hero = document.getElementById('heroChar');
  var reduce = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  var THEMES = [
    { name: '你', img: 'img/char1.png', alt: '你，實像傳媒新進編輯', top: '#f3e4e2', liquid: '#d92b33', deep: '#8f141b', ink: '#3a1013',
      word: '流量', title: '按下去', night: 1, k1: '職位', v1: '新進編輯', k2: '良心', v2: '100%', bigLabel: '流量加成', big: '+1100%', fizz: 0.35,
      copy: '剛到實像傳媒報到的新人。桌上那顆紅色按鈕，按下去就是流量。',
      chips: ['+1', '已分享', '太扯了吧', '求後續', '真的假的', '#失控女星'] },
    { name: '主編', img: 'img/char2.png', alt: '李蔓緹，實像傳媒主編', top: '#ebe5f3', liquid: '#6b3fa0', deep: '#3c1f63', ink: '#24123a',
      word: '點閱', title: '第一名', night: 2, k1: '姓名', v1: '李蔓緹', k2: '在乎', v2: '只有點閱', bigLabel: '今晚點閱', big: '2,434 萬', fizz: 0.7,
      copy: '你的上司。她只在乎一個數字：點閱。天亮前，要看到第一名。',
      chips: ['再狠一點', '標題呢？', '第一名', '快發', '點閱 +12 萬', '別讓它冷掉'] },
    { name: '老闆', img: 'img/char3.png', alt: '實像傳媒的老闆', top: '#e3e9f0', liquid: '#25466f', deep: '#122540', ink: '#0f1d33',
      word: '報表', title: '數字', night: 3, k1: '職位', v1: '老闆', k2: '看的是', v2: '報表', bigLabel: '本季獲利', big: '+50%', fizz: 1,
      copy: '實像傳媒的老闆。他看的不是新聞，是報表上的數字。',
      chips: ['$', '廣告 +1', '業績', '簽約', '股價 +3%', '漂亮'] },
  ];

  // ---------- 液體：一排會互相拉扯的點（彈簧），畫成波浪 ----------
  var W = 0, H = 0, DPR = Math.min(window.devicePixelRatio || 1, 2);
  var N = 64, ys = new Float32Array(N), vs = new Float32Array(N);
  var level = 0.78;                                  // 液面高度（畫面的 78% 處）
  var bubbles = [], chips = [];
  var color = hexToRgb(THEMES[0].liquid), colorTarget = color.slice();

  function resize() {
    var r = stage.getBoundingClientRect();
    W = r.width; H = r.height;
    canvas.width = Math.round(W * DPR); canvas.height = Math.round(H * DPR);
    ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
    level = W < 820 ? 0.8 : 0.78;
  }
  window.addEventListener('resize', resize);
  resize();

  function splash(x, force) {
    var i = Math.max(0, Math.min(N - 1, Math.round(x / W * (N - 1))));
    for (var k = -3; k <= 3; k++) {
      var j = i + k;
      if (j >= 0 && j < N) vs[j] += force * (1 - Math.abs(k) / 4);
    }
  }

  function addBubble(x, y, big) {
    bubbles.push({ x: x, y: y, r: big ? 3 + Math.random() * 9 : 2 + Math.random() * 4, vy: 20 + Math.random() * 50, wob: Math.random() * 6, life: 1 });
  }
  function addChip(x, y) {
    if (chips.length >= 5) return;                // 同時最多 5 則，不會疊成一團
    var t = THEMES[current];
    chips.push({ x: x, y: y, vx: (Math.random() - 0.5) * 160, vy: -120 - Math.random() * 160, text: t.chips[Math.floor(Math.random() * t.chips.length)], life: 1, rot: (Math.random() - 0.5) * 0.4 });
  }
  // 平常也有一點點泡泡
  for (var b = 0; b < 26; b++) addBubble(Math.random() * W, H * level + Math.random() * H * (1 - level), false);

  var last = performance.now();
  function frame(now) {
    var dt = Math.min(0.05, (now - last) / 1000); last = now;

    // 波浪：每個點被拉回原位、也被左右的點拉著；慢慢停下來
    for (var s = 0; s < 2; s++) {
      for (var i = 0; i < N; i++) {
        var left = i > 0 ? ys[i - 1] : ys[i], right = i < N - 1 ? ys[i + 1] : ys[i];
        vs[i] += (-ys[i] * 40 + (left + right - 2 * ys[i]) * 120) * dt * 0.5;
        vs[i] *= Math.pow(0.35, dt);
      }
      for (var i2 = 0; i2 < N; i2++) ys[i2] += vs[i2] * dt * 0.5;
    }
    for (var c = 0; c < 3; c++) color[c] += (colorTarget[c] - color[c]) * (1 - Math.exp(-dt * 4));

    ctx.clearRect(0, 0, W, H);
    var base = H * level, t = now / 1000;
    function surface(x) {
      var f = x / W * (N - 1), i0 = Math.floor(f), i1 = Math.min(N - 1, i0 + 1), k = f - i0;
      var spring = ys[i0] * (1 - k) + ys[i1] * k;
      return base + spring + Math.sin(x * 0.012 + t * 1.6) * 4 + Math.sin(x * 0.027 - t * 1.1) * 2.5;
    }
    // 液體本體（半透明，看得到泡在裡面的角色）
    ctx.beginPath();
    ctx.moveTo(0, H);
    for (var x = 0; x <= W + 8; x += 8) ctx.lineTo(x, surface(x));
    ctx.lineTo(W, H);
    ctx.closePath();
    var grad = ctx.createLinearGradient(0, base, 0, H);
    grad.addColorStop(0, rgba(color, 0.78));
    grad.addColorStop(1, rgba(color, 0.94));
    ctx.fillStyle = grad;
    ctx.fill();
    // 液面的亮線
    ctx.beginPath();
    for (var x2 = 0; x2 <= W + 8; x2 += 8) { var y2 = surface(x2); if (x2 === 0) ctx.moveTo(x2, y2); else ctx.lineTo(x2, y2); }
    ctx.strokeStyle = 'rgba(255,255,255,.35)';
    ctx.lineWidth = 2;
    ctx.stroke();

    // 泡泡：往上浮、左右輕晃，浮到液面就破掉；平常的泡泡會一直補
    ctx.lineWidth = 1.4;
    for (var n = bubbles.length - 1; n >= 0; n--) {
      var bb = bubbles[n];
      bb.y -= bb.vy * dt;
      bb.x += Math.sin(t * 2 + bb.wob) * 10 * dt;
      var top = surface(bb.x);
      if (bb.y < top + bb.r) { bubbles.splice(n, 1); if (bubbles.length < 26) addBubble(Math.random() * W, H + 10, false); continue; }
      ctx.beginPath();
      ctx.arc(bb.x, bb.y, bb.r, 0, Math.PI * 2);
      ctx.strokeStyle = 'rgba(255,255,255,.55)';
      ctx.stroke();
    }
    // 留言：從液面噴出來，畫出弧線再掉回去
    ctx.font = '700 14px "Noto Sans TC", sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    for (var m = chips.length - 1; m >= 0; m--) {
      var ch = chips[m];
      ch.vy += 420 * dt; ch.x += ch.vx * dt; ch.y += ch.vy * dt; ch.life -= dt * 0.55;
      if (ch.life <= 0 || ch.y > H + 40) { chips.splice(m, 1); continue; }
      var a = Math.min(1, ch.life * 2);
      var w = ctx.measureText(ch.text).width + 20;
      ctx.save();
      ctx.translate(ch.x, ch.y); ctx.rotate(ch.rot);
      ctx.globalAlpha = a;
      ctx.fillStyle = '#fff';
      roundRect(-w / 2, -14, w, 28, 14); ctx.fill();
      ctx.fillStyle = rgba(color, 1);
      ctx.fillText(ch.text, 0, 1);
      ctx.restore();
    }

    if (!dragging) idle(t, dt);
    requestAnimationFrame(frame);
  }
  requestAnimationFrame(frame);

  function roundRect(x, y, w, h, r) {
    ctx.beginPath();
    ctx.moveTo(x + r, y); ctx.arcTo(x + w, y, x + w, y + h, r); ctx.arcTo(x + w, y + h, x, y + h, r);
    ctx.arcTo(x, y + h, x, y, r); ctx.arcTo(x, y, x + w, y, r); ctx.closePath();
  }

  // ---------- 角色：拿起來、搖一搖、放回去 ----------
  var pos = { x: 0, y: 0 }, vel = { x: 0, y: 0 }, rot = 0, sinkY = 0;
  var dragging = false, grab = { x: 0, y: 0 }, lastP = null, lastT = 0;

  function apply() {
    hero.style.transform = 'translate(calc(-50% + ' + pos.x + 'px), ' + (pos.y + sinkY) + 'px) rotate(' + rot + 'deg)';
  }
  function idle(t, dt) {
    // 放開後：像彈簧一樣回到原位（會超過一點點再收回來）
    var k = 90, d = 12;
    vel.x += (-k * pos.x - d * vel.x) * dt;
    vel.y += (-k * pos.y - d * vel.y) * dt;
    pos.x += vel.x * dt; pos.y += vel.y * dt;
    rot += (-rot) * (1 - Math.exp(-dt * 8));
    var bob = reduce ? 0 : Math.sin(t * 1.3) * 4;
    hero.style.transform = 'translate(calc(-50% + ' + pos.x + 'px), ' + (pos.y + sinkY + bob) + 'px) rotate(' + rot + 'deg)';
    // 掉回液體裡時，濺一下
    if (pos.y > -2 && vel.y > 150) { splash(W / 2 + pos.x, vel.y * 0.25); for (var i = 0; i < 6; i++) addBubble(W / 2 + pos.x + (Math.random() - 0.5) * 80, H * level + 20 + Math.random() * 40, true); }
  }

  hero.addEventListener('pointerdown', function (e) {
    dragging = true;
    hero.setPointerCapture(e.pointerId);
    hero.classList.add('dragging');
    grab.x = e.clientX - pos.x; grab.y = e.clientY - pos.y;
    lastP = { x: e.clientX, y: e.clientY }; lastT = performance.now();
    document.querySelector('.hint').style.opacity = '0';
  });
  hero.addEventListener('pointermove', function (e) {
    if (!dragging) return;
    var now = performance.now(), dt = Math.max(0.008, (now - lastT) / 1000);
    var nx = e.clientX - grab.x, ny = Math.min(0, e.clientY - grab.y);     // 不能往下壓進液體裡
    var vx = (e.clientX - lastP.x) / dt, vy = (e.clientY - lastP.y) / dt;
    pos.x = nx; pos.y = ny; vel.x = vx; vel.y = vy;
    rot += ((vx * 0.012) - rot) * 0.3;
    rot = Math.max(-18, Math.min(18, rot));
    apply();
    // 搖得越用力：液體晃越大、冒出越多泡泡和留言
    var speed = Math.sqrt(vx * vx + vy * vy);
    if (speed > 600) {
      var cx = W / 2 + pos.x;
      splash(cx, (Math.random() - 0.5) * speed * 0.05);
      if (Math.random() < Math.min(0.35, speed / 6000)) addChip(cx + (Math.random() - 0.5) * 120, H * level);
      for (var i = 0; i < 2; i++) addBubble(cx + (Math.random() - 0.5) * 120, H * level + 30 + Math.random() * 60, true);
    }
    lastP = { x: e.clientX, y: e.clientY }; lastT = now;
  });
  function release() {
    if (!dragging) return;
    dragging = false;
    hero.classList.remove('dragging');
    vel.x *= 0.3; vel.y = Math.max(vel.y, 0) * 0.3;
  }
  hero.addEventListener('pointerup', release);
  hero.addEventListener('pointercancel', release);

  // ---------- 換角色：舊的沉下去 → 顏色、字一起換 → 新的浮上來 ----------
  var current = 0, switching = false;
  var picks = document.querySelectorAll('.pick');
  picks.forEach(function (btn) {
    btn.addEventListener('click', function () { show(+btn.dataset.i); });
  });

  function animate(from, to, ms, ease, step) {
    return new Promise(function (done) {
      var s = performance.now();
      (function tick(now) {
        var k = Math.min(1, (now - s) / ms);
        step(from + (to - from) * ease(k));
        if (k < 1) requestAnimationFrame(tick); else done();
      })(s);
    });
  }
  function easeIn(t) { return t * t * t; }
  function easeOutBack(t) { var c = 1.5; return 1 + (c + 1) * Math.pow(t - 1, 3) + c * Math.pow(t - 1, 2); }

  function show(i) {
    if (i === current || switching) return;
    switching = true;
    var t = THEMES[i];
    picks.forEach(function (p, k) { p.classList.toggle('on', k === i); p.setAttribute('aria-selected', k === i ? 'true' : 'false'); });
    var word = document.getElementById('bigWord');
    word.classList.add('out');
    document.querySelectorAll('.side').forEach(function (el) { el.classList.add('out'); });
    var depth = H * 0.9;
    animate(0, depth, reduce ? 1 : 420, easeIn, function (v) { sinkY = v; apply(); }).then(function () {
      splash(W / 2, 260);
      for (var n = 0; n < 24; n++) addBubble(W / 2 + (Math.random() - 0.5) * 200, H * level + 20 + Math.random() * 120, true);
      // 換內容
      hero.src = t.img; hero.alt = t.alt;
      stage.style.setProperty('--top', t.top);
      stage.style.setProperty('--liquid', t.liquid);
      stage.style.setProperty('--deep', t.deep);
      stage.style.setProperty('--ink2', t.ink);
      colorTarget = hexToRgb(t.liquid);
      word.textContent = t.word;
      setText('title', t.title); setText('night', t.night); setText('k1', t.k1); setText('v1', t.v1);
      setText('k2', t.k2); setText('v2', t.v2); setText('bigLabel', t.bigLabel); setText('bigNum', t.big); setText('copy', t.copy);
      document.getElementById('fizzFill').style.width = Math.round(t.fizz * 100) + '%';
      word.classList.remove('out');
      document.querySelectorAll('.side').forEach(function (el) { el.classList.remove('out'); });
      return animate(depth, 0, reduce ? 1 : 700, easeOutBack, function (v) { sinkY = v; apply(); });
    }).then(function () { current = i; switching = false; });
  }
  function setText(id, v) { var el = document.getElementById(id); if (el) el.textContent = v; }
  document.getElementById('fizzFill').style.width = Math.round(THEMES[0].fizz * 100) + '%';

  function hexToRgb(h) { var n = parseInt(h.slice(1), 16); return [(n >> 16) & 255, (n >> 8) & 255, n & 255]; }
  function rgba(c, a) { return 'rgba(' + Math.round(c[0]) + ',' + Math.round(c[1]) + ',' + Math.round(c[2]) + ',' + a + ')'; }
})();
