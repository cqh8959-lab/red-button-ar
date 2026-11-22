// 濾鏡明信片：拖著圓形鏡片移動（鏡片會「緩緩跟上」手指），鏡片裡面是戴上濾鏡看到的樣子
//   紅色鏡片：只看得到人　藍色鏡片：看得到全部（換鏡片時顏色慢慢淡入淡出）
(function () {
  var stage = document.getElementById('lensStage');
  if (!stage) return;
  var red = document.getElementById('lensRed'), blue = document.getElementById('lensBlue'), ring = document.getElementById('lensRing');
  var caption = document.getElementById('lensCaption');
  var CAPTIONS = {
    red: '紅色鏡片：只看得到人。少了前後，看起來就像另一件事。',
    blue: '藍色鏡片：看見全部，才知道發生了什麼。'
  };
  var target = { x: 0.5, y: 0.5 }, cur = { x: 0.5, y: 0.5 }, dragging = false, touched = false;

  function radius() { return Math.max(70, Math.min(stage.clientWidth, stage.clientHeight) * 0.26); }
  function render() {
    var r = radius();
    var css = { '--x': (cur.x * 100) + '%', '--y': (cur.y * 100) + '%', '--r': r + 'px', '--rpx': r + 'px' };
    for (var k in css) stage.style.setProperty(k, css[k]);
  }
  function setFrom(e) {
    var b = stage.getBoundingClientRect();
    target.x = Math.min(1, Math.max(0, (e.clientX - b.left) / b.width));
    target.y = Math.min(1, Math.max(0, (e.clientY - b.top) / b.height));
  }
  stage.addEventListener('pointerdown', function (e) { dragging = true; touched = true; stage.setPointerCapture(e.pointerId); setFrom(e); });
  stage.addEventListener('pointermove', function (e) { if (dragging) setFrom(e); });
  stage.addEventListener('pointerup', function () { dragging = false; });
  stage.addEventListener('pointercancel', function () { dragging = false; });

  var last = performance.now();
  (function tick(now) {
    var dt = Math.min(0.05, (now - last) / 1000); last = now;
    if (!touched) {          // 還沒碰之前：鏡片自己慢慢繞一小圈，提示可以拖
      var t = now / 1000;
      target.x = 0.5 + Math.cos(t * 0.6) * 0.18;
      target.y = 0.5 + Math.sin(t * 0.6) * 0.12;
    }
    var k = 1 - Math.exp(-dt * 10);
    cur.x += (target.x - cur.x) * k;
    cur.y += (target.y - cur.y) * k;
    render();
    requestAnimationFrame(tick);
  })(last);

  document.querySelectorAll('.lp').forEach(function (btn) {
    btn.addEventListener('click', function () {
      var lens = btn.dataset.lens;
      document.querySelectorAll('.lp').forEach(function (b) { var on = b === btn; b.classList.toggle('on', on); b.setAttribute('aria-selected', on ? 'true' : 'false'); });
      red.style.opacity = lens === 'red' ? '1' : '0';
      blue.style.opacity = lens === 'blue' ? '1' : '0';
      ring.classList.toggle('blue', lens === 'blue');
      caption.style.opacity = '0';
      setTimeout(function () { caption.textContent = CAPTIONS[lens]; caption.style.opacity = '1'; }, 300);
    });
  });
  window.addEventListener('resize', render);
})();
