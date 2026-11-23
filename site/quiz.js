// 媒體識讀小問答：8 題，選了馬上告訴你對不對、為什麼；答完看你是哪一種讀者
(function () {
  var box = document.getElementById('quizBox');
  if (!box) return;
  var Q = [
    { q: '你滑到一則標題：「震驚！女星深夜崩潰，畫面曝光」。你第一件事會做什麼？',
      o: ['馬上分享給朋友', '點進去看內文，找找是誰說的、有沒有證據', '看看留言多不多'], a: 1,
      e: '聳動的標題常常會誇大。先看內文：消息從哪裡來？有沒有證據？標題寫的和內文說的一樣嗎？' },
    { q: '一張照片裡，女星正在哭。這張照片最可能少了什麼？',
      o: ['照片外面的前因後果', '解析度', '濾鏡'], a: 0,
      e: '照片可以被裁切，只留下最有戲劇性的一瞬間。框外發生了什麼，往往才是重點。' },
    { q: '網路上有一段 10 秒的錄音，聽起來她說了很過分的話。你應該？',
      o: ['相信，因為是她親口說的', '先找完整的版本，聽前後文', '看按讚數決定要不要相信'], a: 1,
      e: '剪掉半句話，意思就可能完全相反。只聽片段，很容易誤會一個人。' },
    { q: '一則消息被轉發了好幾萬次，這代表？',
      o: ['一定是真的', '不一定，轉發多不代表有人查證過', '只要是大媒體發的就是真的'], a: 1,
      e: '轉發數只代表「很多人看到」，不代表「是真的」。越熱門的消息，越值得多查一下。' },
    { q: '你懷疑一張新聞照片是舊照片拿來新用。可以怎麼確認？',
      o: ['用「以圖搜圖」找它最早出現的時間和地方', '看照片好不好看', '問身邊的朋友'], a: 0,
      e: '以圖搜圖可以找到照片最早的出處。很多假消息，都是把舊照片配上新的說法。' },
    { q: '一篇文章裡滿是「慘遭」「失控」「惡劣」這種字。這代表？',
      o: ['事情一定很嚴重', '作者想讓你有情緒，要分清楚哪些是事實、哪些是評論', '沒什麼特別的'], a: 1,
      e: '情緒字會讓人還沒看清楚就先生氣或害怕。把形容詞拿掉，看看剩下的事實是什麼。' },
    { q: '想確認一則消息是不是真的，最好的做法是？',
      o: ['只看自己常看的那一家', '看社群上最熱門的說法', '比對不同的媒體，也查查事實查核網站'], a: 2,
      e: '多看幾個來源、看看不同立場怎麼說，再加上事實查核，比較不容易被單一說法帶著走。' },
    { q: '留言區有一大堆人在罵她。你會？',
      o: ['跟著罵，大家都這樣說', '先想想：我知道的是不是全部？', '截圖分享，讓更多人知道'], a: 1,
      e: '螢幕的另一邊，是一個真實的人。在不知道全部之前，先停一下，不要讓自己變成浪的一部分。' },
  ];
  var TYPES = [
    { min: 8, name: '查證高手', advice: '你會先停一下、找來源、看前後文。網路上需要更多像你這樣的讀者。' },
    { min: 6, name: '冷靜的讀者', advice: '大部分時候你都看得很清楚。下次遇到很聳動的標題，再多查一步就更好了。' },
    { min: 4, name: '容易被帶著走的讀者', advice: '標題和情緒字有時候會影響你。試試看：分享之前，先找完整的版本。' },
    { min: 0, name: '流量的好朋友', advice: '主編最喜歡你這樣的讀者了。但螢幕的另一邊，是一個真實的人。再玩一次，換個角度看看。' },
  ];
  var LETTERS = ['A', 'B', 'C'];
  var i = 0, score = 0, answered = false;
  var card = document.getElementById('qCard'), text = document.getElementById('qText'), opts = document.getElementById('qOptions');
  var explain = document.getElementById('qExplain'), next = document.getElementById('qNext'), bar = document.getElementById('qBar');
  var idx = document.getElementById('qIndex'), result = document.getElementById('qResult');

  function render() {
    var item = Q[i];
    answered = false;
    idx.textContent = '第 ' + (i + 1) + ' 題 / ' + Q.length;
    bar.style.width = (i / Q.length * 100) + '%';
    text.textContent = item.q;
    opts.innerHTML = '';
    item.o.forEach(function (o, k) {
      var b = document.createElement('button');
      b.className = 'opt';
      b.innerHTML = '<span class="letter">' + LETTERS[k] + '</span><span></span>';
      b.lastChild.textContent = o;
      b.addEventListener('click', function () { choose(k, b); });
      opts.appendChild(b);
    });
    explain.classList.remove('show');
    explain.innerHTML = '';
    next.classList.remove('show');
  }
  function choose(k, btn) {
    if (answered) return;
    answered = true;
    var item = Q[i], right = k === item.a;
    if (right) score++;
    opts.querySelectorAll('.opt').forEach(function (b, n) { b.disabled = true; if (n === item.a) b.classList.add('right'); });
    if (!right) btn.classList.add('wrong');
    explain.innerHTML = '<b>' + (right ? '答對了！' : '再想想：答案是 ' + LETTERS[item.a]) + '</b>';
    explain.appendChild(document.createTextNode(item.e));
    explain.classList.add('show');
    next.textContent = i < Q.length - 1 ? '下一題' : '看結果';
    next.classList.add('show');
    bar.style.width = ((i + 1) / Q.length * 100) + '%';
  }
  next.addEventListener('click', function () {
    if (i >= Q.length - 1) { finish(); return; }
    card.classList.add('swap');
    setTimeout(function () { i++; render(); card.classList.remove('swap'); }, 300);
  });
  function finish() {
    card.style.display = 'none';
    var type = TYPES.filter(function (t) { return score >= t.min; })[0];
    document.getElementById('qScore').textContent = '答對 ' + score + ' / ' + Q.length + ' 題';
    document.getElementById('qType').textContent = '你是「' + type.name + '」';
    document.getElementById('qAdvice').textContent = type.advice;
    result.classList.add('show');
    idx.textContent = '完成';
  }
  document.getElementById('qRetry').addEventListener('click', function () {
    i = 0; score = 0; result.classList.remove('show'); card.style.display = ''; render();
  });
  render();
})();
