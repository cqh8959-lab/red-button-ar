// 捲動到才出現；結算視窗看到時，三根膠囊從開始的數值慢慢變到最後的數值
(function () {
  var items = document.querySelectorAll('.reveal');
  var stats = document.querySelectorAll('.stat');

  function ease(t) { return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2; }

  function runStats() {
    stats.forEach(function (s, i) {
      var from = +s.dataset.from, to = +s.dataset.to;
      var fill = s.querySelector('.fill'), pct = s.querySelector('.pct');
      fill.style.transition = 'none';
      fill.style.height = from + '%';
      setTimeout(function () {
        var start = performance.now(), dur = 1400;
        fill.style.transition = '';
        fill.style.height = to + '%';
        (function tick(now) {
          var k = Math.min(1, (now - start) / dur);
          pct.textContent = Math.round(from + (to - from) * ease(k)) + '%';
          if (k < 1) requestAnimationFrame(tick);
        })(start);
      }, 300 + i * 500);
    });
  }

  if (!('IntersectionObserver' in window)) {
    items.forEach(function (el) { el.classList.add('in'); });
    runStats();
    return;
  }
  var io = new IntersectionObserver(function (entries) {
    entries.forEach(function (e) {
      if (!e.isIntersecting) return;
      e.target.classList.add('in');
      if (e.target.classList.contains('browser')) runStats();
      io.unobserve(e.target);
    });
  }, { threshold: 0.2 });
  items.forEach(function (el, i) {
    el.style.transitionDelay = (i % 3) * 0.08 + 's';
    io.observe(el);
  });
})();
