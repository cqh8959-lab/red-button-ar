// 開場：深夜的發布台
//   按紅色按鈕＝發一則更狠的標題：點閱數字跳上去、留言噴出來、「流量」漲高一點，慢慢淹過角色
//   漲到最高會停下來：「螢幕的另一邊，是一個真實的人。」→ 可以讓流量退潮
//   角色可以按住拿起來、搖一搖（液體會晃、冒泡泡），放開會彈回原位
//   左邊的便利貼換角色：舊的沉下去、新的浮上來
(function () {
  var stage = document.getElementById('top');
  if (!stage) return;
  var canvas = document.getElementById('liquid');
  var ctx = canvas.getContext('2d');
  var hero = document.getElementById('heroChar');
  var redBtn = document.getElementById('redBtn');
  var reduce = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  var CHARS = [
    { img: 'img/char1.png', alt: '你，實像傳媒新進編輯', liquid: '#c8242d' },
    { img: 'img/char2.png', alt: '李蔓緹，實像傳媒主編', liquid: '#7b3fb3' },
    { img: 'img/char3.png', alt: '實像傳媒的老闆', liquid: '#2b5fa8' },
  ];
  var HEADLINES = [
    '女星宋羽晴深夜現身',
    '宋羽晴深夜崩潰？畫面曝光',
    '【獨家】宋羽晴失控畫面',
    '人設崩塌！網友：退圈吧',
    '「既然隨便」全網抵制宋羽晴',
    '她還有臉出現嗎？',
  ];
  var CHIPS = ['+1', '已分享', '太扯了吧', '求後續', '退圈啦', '真的假的', '#失控女星', '早就知道'];
  var TICKER = ['實像傳媒衝上發燒榜第二名', '女星深夜現身 畫面曝光', '網友熱議：她到底怎麼了', '點閱破千萬 留言湧入', '更多後續 持續更新中'];

  // 快訊跑馬燈
  var track = document.getElementById('tickerTrack');
  track.innerHTML = TICKER.concat(TICKER).map(function (t) { return '<span>' + t + '</span>'; }).join('');

  // ---------- 液體 ----------
  var W = 0, H = 0, DPR = Math.min(window.devicePixelRatio || 1, 2);
  var N = 64, ys = new Float32Array(N), vs = new Float32Array(N);
  var BASE = 0.86, STEP = 0.075, presses = 0, MAX = HEADLINES.length;
  var level = BASE, levelTarget = BASE;
  var bubbles = [], chips = [];
  var color = hex(CHARS[0].liquid), colorTarget = color.slice();

  function resize() {
    var r = stage.getBoundingClientRect();
    W = r.width; H = r.height;
    canvas.width = Math.round(W * DPR); canvas.height = Math.round(H * DPR);
    ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
  }
  window.addEventListener('resize', resize);
  resize();

  function splash(x, force) {
    var i = Math.max(0, Math.min(N - 1, Math.round(x / W * (N - 1))));
    for (var k = -4; k <= 4; k++) { var j = i + k; if (j >= 0 && j < N) vs[j] += force * (1 - Math.abs(k) / 5); }
  }
  function addBubble(x, y, big) {
    bubbles.push({ x: x, y: y, r: big ? 3 + Math.random() * 8 : 1.5 + Math.random() * 3.5, vy: 25 + Math.random() * 50, wob: Math.random() * 6 });
  }
  function addChip(x, y, big) {
    if (chips.length >= 7) return;
    chips.push({ x: x, y: y, vx: (Math.random() - 0.5) * 220, vy: -160 - Math.random() * 200, text: CHIPS[Math.floor(Math.random() * CHIPS.length)], life: 1, rot: (Math.random() - 0.5) * 0.5, big: big });
  }
  for (var b = 0; b < 24; b++) addBubble(Math.random() * W, H * level + Math.random() * H * (1 - level), false);

  function surface(x, t) {
    var f = x / W * (N - 1), i0 = Math.floor(f), i1 = Math.min(N - 1, i0 + 1), k = f - i0;
    return H * level + ys[i0] * (1 - k) + ys[i1] * k + Math.sin(x * 0.012 + t * 1.5) * 4 + Math.sin(x * 0.03 - t * 1.1) * 2;
  }

  var last = performance.now();
  function frame(now) {
    var dt = Math.min(0.05, (now - last) / 1000); last = now;
    var t = now / 1000;
    for (var s = 0; s < 2; s++) {
      for (var i = 0; i < N; i++) {
        var l = i > 0 ? ys[i - 1] : ys[i], r = i < N - 1 ? ys[i + 1] : ys[i];
        vs[i] += (-ys[i] * 40 + (l + r - 2 * ys[i]) * 120) * dt * 0.5;
        vs[i] *= Math.pow(0.35, dt);
      }
      for (var j = 0; j < N; j++) ys[j] += vs[j] * dt * 0.5;
    }
    level += (levelTarget - level) * (1 - Math.exp(-dt * 2.2));          // 漲潮、退潮都慢慢來
    for (var c = 0; c < 3; c++) color[c] += (colorTarget[c] - color[c]) * (1 - Math.exp(-dt * 4));

    ctx.clearRect(0, 0, W, H);
    ctx.beginPath();
    ctx.moveTo(0, H);
    for (var x = 0; x <= W + 8; x += 8) ctx.lineTo(x, surface(x, t));
    ctx.lineTo(W, H); ctx.closePath();
    var g = ctx.createLinearGradient(0, H * level, 0, H);
    g.addColorStop(0, rgba(color, 0.72)); g.addColorStop(1, rgba(color, 0.95));
    ctx.fillStyle = g; ctx.fill();
    ctx.beginPath();
    for (var x2 = 0; x2 <= W + 8; x2 += 8) { var y2 = surface(x2, t); if (x2 === 0) ctx.moveTo(x2, y2); else ctx.lineTo(x2, y2); }
    ctx.strokeStyle = 'rgba(255,255,255,.35)'; ctx.lineWidth = 2; ctx.stroke();

    ctx.lineWidth = 1.4;
    for (var n = bubbles.length - 1; n >= 0; n--) {
      var bb = bubbles[n];
      bb.y -= bb.vy * dt; bb.x += Math.sin(t * 2 + bb.wob) * 10 * dt;
      if (bb.y < surface(bb.x, t) + bb.r) { bubbles.splice(n, 1); if (bubbles.length < 24) addBubble(Math.random() * W, H + 10, false); continue; }
      ctx.beginPath(); ctx.arc(bb.x, bb.y, bb.r, 0, Math.PI * 2); ctx.strokeStyle = 'rgba(255,255,255,.5)'; ctx.stroke();
    }
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    for (var m = chips.length - 1; m >= 0; m--) {
      var ch = chips[m];
      ch.vy += 420 * dt; ch.x += ch.vx * dt; ch.y += ch.vy * dt; ch.life -= dt * 0.5;
      if (ch.life <= 0 || ch.y > H + 40) { chips.splice(m, 1); continue; }
      ctx.font = '700 ' + (ch.big ? 16 : 14) + 'px "Noto Sans TC", sans-serif';
      var w = ctx.measureText(ch.text).width + 22;
      ctx.save(); ctx.translate(ch.x, ch.y); ctx.rotate(ch.rot); ctx.globalAlpha = Math.min(1, ch.life * 2);
      ctx.fillStyle = '#f3ead3'; roundRect(-w / 2, -15, w, 30, 15); ctx.fill();
      ctx.fillStyle = rgba(color, 1); ctx.fillText(ch.text, 0, 1);
      ctx.restore();
    }
    if (!dragging) idle(t, dt);
    requestAnimationFrame(frame);
  }
  requestAnimationFrame(frame);
  function roundRect(x, y, w, h, r) {
    ctx.beginPath(); ctx.moveTo(x + r, y); ctx.arcTo(x + w, y, x + w, y + h, r); ctx.arcTo(x + w, y + h, x, y + h, r);
    ctx.arcTo(x, y + h, x, y, r); ctx.arcTo(x, y, x + w, y, r); ctx.closePath();
  }

  // ---------- 紅色按鈕：發一則 ----------
  var views = 0, numEl = document.getElementById('viewNum'), headEl = document.getElementById('nextHeadline'), countEl = document.getElementById('pubCount');
  function countTo(to) {
    var from = views, start = performance.now();
    views = to;
    numEl.classList.remove('bump'); void numEl.offsetWidth; numEl.classList.add('bump');
    (function tick(now) {
      var k = Math.min(1, (now - start) / 900), e = 1 - Math.pow(1 - k, 3);
      numEl.textContent = Math.round(from + (to - from) * e).toLocaleString('zh-TW');
      if (k < 1) requestAnimationFrame(tick);
    })(start);
  }
  function setHeadline(text) {
    headEl.classList.add('swap');
    setTimeout(function () { headEl.textContent = text; headEl.classList.remove('swap'); }, 250);
  }
  redBtn.addEventListener('click', function () {
    if (presses >= MAX) return;
    presses++;
    redBtn.classList.add('pressed'); setTimeout(function () { redBtn.classList.remove('pressed'); }, 160);
    countTo(views + Math.round(80 + presses * presses * 60 + Math.random() * 60));
    levelTarget = BASE - presses * STEP;
    var cx = W / 2 + pos.x;
    splash(cx, 180 + presses * 30);
    for (var i = 0; i < 4 + presses; i++) addChip(cx + (Math.random() - 0.5) * W * 0.4, H * levelTarget, presses > 3);
    for (var k = 0; k < 18; k++) addBubble(Math.random() * W, H * level + 30 + Math.random() * 120, true);
    if (presses < MAX) { setHeadline(HEADLINES[presses]); countEl.textContent = '第 ' + (presses + 1) + ' 則'; }
    else {
      redBtn.disabled = true;
      countEl.textContent = '發完了';
      document.querySelector('.ticker').classList.add('alarm');
      // 淹沒：角色慢慢沉到流量底下，點閱數字淡掉，只剩一句話
      setTimeout(function () {
        stage.classList.add('flooded-on');
        animate(sinkY, H * 0.75, reduce ? 1 : 1600, easeInOut, function (v) { sinkY = v; apply(); });
        document.getElementById('flooded').classList.add('show');
      }, 900);
    }
    document.getElementById('stageHint').style.opacity = '0';
  });
  document.getElementById('drainBtn').addEventListener('click', function () {
    if (window.flowTransition) { window.flowTransition(drain); return; }   // 整個畫面被流量淹過，退潮後回到一開始
    drain();
  });
  function drain() {
    presses = 0; levelTarget = BASE;
    document.getElementById('flooded').classList.remove('show');
    stage.classList.remove('flooded-on');
    animate(sinkY, 0, reduce ? 1 : 1100, easeOutBack, function (v) { sinkY = v; apply(); });
    document.querySelector('.ticker').classList.remove('alarm');
    redBtn.disabled = false;
    setHeadline(HEADLINES[0]); countEl.textContent = '第 1 則';
    countTo(0);
    for (var k = 0; k < 30; k++) addBubble(Math.random() * W, H * 0.7 + Math.random() * H * 0.3, true);
  }

  // ---------- 角色：拿起來、搖一搖、放回去 ----------
  var pos = { x: 0, y: 0 }, vel = { x: 0, y: 0 }, rot = 0, sinkY = 0;
  var dragging = false, grab = { x: 0, y: 0 }, lastP = null, lastT = 0;
  function apply(extra) { hero.style.transform = 'translate(calc(-50% + ' + pos.x + 'px), ' + (pos.y + sinkY + (extra || 0)) + 'px) rotate(' + rot + 'deg)'; }
  function idle(t, dt) {
    var k = 90, d = 12;
    vel.x += (-k * pos.x - d * vel.x) * dt; vel.y += (-k * pos.y - d * vel.y) * dt;
    pos.x += vel.x * dt; pos.y += vel.y * dt;
    rot += (-rot) * (1 - Math.exp(-dt * 8));
    apply(reduce ? 0 : Math.sin(t * 1.3) * 4);
    if (pos.y > -2 && vel.y > 150) { splash(W / 2 + pos.x, vel.y * 0.25); for (var i = 0; i < 5; i++) addBubble(W / 2 + pos.x + (Math.random() - 0.5) * 80, H * level + 20 + Math.random() * 40, true); }
  }
  hero.addEventListener('pointerdown', function (e) {
    dragging = true; hero.setPointerCapture(e.pointerId); hero.classList.add('dragging');
    grab.x = e.clientX - pos.x; grab.y = e.clientY - pos.y; lastP = { x: e.clientX, y: e.clientY }; lastT = performance.now();
    document.getElementById('stageHint').style.opacity = '0';
  });
  hero.addEventListener('pointermove', function (e) {
    if (!dragging) return;
    var now = performance.now(), dt = Math.max(0.008, (now - lastT) / 1000);
    var vx = (e.clientX - lastP.x) / dt, vy = (e.clientY - lastP.y) / dt;
    pos.x = e.clientX - grab.x; pos.y = Math.min(0, e.clientY - grab.y); vel.x = vx; vel.y = vy;
    rot += ((vx * 0.012) - rot) * 0.3; rot = Math.max(-18, Math.min(18, rot));
    apply();
    var speed = Math.sqrt(vx * vx + vy * vy);
    if (speed > 600) {
      var cx = W / 2 + pos.x;
      splash(cx, (Math.random() - 0.5) * speed * 0.05);
      if (Math.random() < Math.min(0.3, speed / 6000)) addChip(cx + (Math.random() - 0.5) * 120, H * level, false);
      for (var i = 0; i < 2; i++) addBubble(cx + (Math.random() - 0.5) * 120, H * level + 30 + Math.random() * 60, true);
    }
    lastP = { x: e.clientX, y: e.clientY }; lastT = now;
  });
  function release() { if (!dragging) return; dragging = false; hero.classList.remove('dragging'); vel.x *= 0.3; vel.y = Math.max(vel.y, 0) * 0.3; }
  hero.addEventListener('pointerup', release);
  hero.addEventListener('pointercancel', release);

  // ---------- 換角色：沉下去 → 換 → 浮上來 ----------
  var current = 0, switching = false, notes = document.querySelectorAll('.note');
  notes.forEach(function (btn) { btn.addEventListener('click', function () { show(+btn.dataset.i); }); });
  function animate(from, to, ms, ease, step) {
    return new Promise(function (done) {
      var s = performance.now();
      (function tick(now) { var k = Math.min(1, (now - s) / ms); step(from + (to - from) * ease(k)); if (k < 1) requestAnimationFrame(tick); else done(); })(s);
    });
  }
  function easeIn(t) { return t * t * t; }
  function easeInOut(t) { return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2; }
  function easeOutBack(t) { var c = 1.5; return 1 + (c + 1) * Math.pow(t - 1, 3) + c * Math.pow(t - 1, 2); }
  function show(i) {
    if (i === current || switching || presses >= MAX) return;   // 淹沒的時候先不能換
    switching = true;
    notes.forEach(function (n, k) { n.classList.toggle('on', k === i); n.setAttribute('aria-selected', k === i ? 'true' : 'false'); });
    var depth = H * 0.9;
    animate(0, depth, reduce ? 1 : 420, easeIn, function (v) { sinkY = v; apply(); }).then(function () {
      splash(W / 2, 260);
      for (var n = 0; n < 20; n++) addBubble(W / 2 + (Math.random() - 0.5) * 200, H * level + 20 + Math.random() * 120, true);
      hero.src = CHARS[i].img; hero.alt = CHARS[i].alt;
      colorTarget = hex(CHARS[i].liquid);
      return animate(depth, 0, reduce ? 1 : 700, easeOutBack, function (v) { sinkY = v; apply(); });
    }).then(function () { current = i; switching = false; });
  }

  function hex(h) { var n = parseInt(h.slice(1), 16); return [(n >> 16) & 255, (n >> 8) & 255, n & 255]; }
  function rgba(c, a) { return 'rgba(' + Math.round(c[0]) + ',' + Math.round(c[1]) + ',' + Math.round(c[2]) + ',' + a + ')'; }
})();
