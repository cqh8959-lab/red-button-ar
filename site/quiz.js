// 媒體識讀小測驗：8 個情境，選你最直覺的做法；選完告訴你「這樣做的話」會怎樣（不說對錯）；答完看你的處事風格像哪個角色
(function () {
  var box = document.getElementById('quizBox');
  if (!box) return;
  // 每題：q 情境、o 三種做法、a 最謹慎的做法（只拿來決定結果角色，畫面上不說對錯）
  //   e：選了某個做法之後，告訴你「這樣做的話」可能會造成什麼、或忽略了什麼（每個選項一句）
  var Q = [
    { q: '你滑到一則標題：「震驚！女星深夜崩潰，畫面曝光」。你第一件事會做什麼？',
      o: ['馬上分享給朋友', '點進去看內文，找找是誰說的、有沒有證據', '看看留言多不多'], a: 1,
      e: ['聳動的標題常常會誇大。還沒看內容就分享，你可能幫一則不實的消息傳得更遠。',
          '先看消息從哪裡來、有沒有證據，再對照標題和內文說的是不是一樣，比較不會被標題牽著走。',
          '留言多只代表很多人在吵，不代表是真的；跟著留言的情緒走，很容易忽略事情本身。'] },
    { q: '一張照片裡，女星正在哭。你覺得這張照片最可能少了什麼？',
      o: ['照片外面的前因後果', '解析度', '濾鏡'], a: 0,
      e: ['照片可以被裁切，只留下最有戲劇性的一瞬間。想想框外發生了什麼，才看得到全貌。',
          '只注意畫質，容易忽略這張照片是不是被裁過、拍下的前後又發生了什麼。',
          '濾鏡改的是顏色；真正會改變意思的，往往是被裁掉的前因後果。'] },
    { q: '網路上有一段 10 秒的錄音，聽起來她說了很過分的話。你會？',
      o: ['相信，因為是她親口說的', '先找完整的版本，聽前後文', '看按讚數決定要不要相信'], a: 1,
      e: ['親口說的也可能被剪過。只聽片段就相信，可能把一句話的意思完全弄反。',
          '聽完前後文，才知道她真正想說什麼；剪掉半句話，意思可能完全相反。',
          '讚數代表多少人有反應，不代表內容完整；被剪過的片段，常常反而最多人按讚。'] },
    { q: '一則消息被轉發了好幾萬次，你會怎麼想？',
      o: ['這麼多人轉，一定是真的', '不一定，轉發多不代表有人查證過', '只要是大媒體發的就是真的'], a: 1,
      e: ['轉發數只代表很多人看到。把熱門當成真的，錯誤的消息也會一路被轉下去。',
          '越熱門的消息越值得多查一下——傳得快，往往是因為情緒強，不是因為查證過。',
          '大媒體也會出錯、也會搶快。只看是誰發的，就會跳過查證這一步。'] },
    { q: '你懷疑一張新聞照片是舊照片拿來新用。你會怎麼確認？',
      o: ['用「以圖搜圖」找它最早出現的時間和地方', '看照片好不好看', '問身邊的朋友'], a: 0,
      e: ['以圖搜圖能找到照片最早的出處；很多假消息，都是舊照片配上新的說法。',
          '好看的照片不代表是新的、是真的；舊照片配上新說法，是很常見的假消息手法。',
          '朋友看到的可能也是同一個來源。大家互相確認，不一定比較接近真相。'] },
    { q: '一篇文章裡滿是「慘遭」「失控」「惡劣」這種字。你會怎麼看？',
      o: ['事情一定很嚴重', '作者想讓我有情緒，要分清楚哪些是事實、哪些是評論', '沒什麼特別的'], a: 1,
      e: ['情緒字會讓人還沒看清楚就先生氣或害怕。被字眼帶著走，容易把評論當成事實。',
          '把形容詞拿掉，看看剩下的事實是什麼，比較不會被作者的情緒推著走。',
          '這些字不是隨便用的，它們會悄悄影響你的感受。注意到它們，才不會不知不覺被帶走。'] },
    { q: '想知道一則消息是不是真的，你通常會？',
      o: ['只看自己常看的那一家', '看社群上最熱門的說法', '比對不同的媒體，也查查事實查核網站'], a: 2,
      e: ['只看同一家，就只看得到同一種角度；它漏掉的，你也會一起漏掉。',
          '最熱門的說法，常常是最能引起情緒的說法，不一定是最接近事實的那一個。',
          '多看幾個來源、看看不同立場怎麼說，再加上事實查核，比較不容易被單一說法帶著走。'] },
    { q: '留言區有一大堆人在罵她。你會？',
      o: ['跟著罵，大家都這樣說', '先想想：我知道的是不是全部？', '截圖分享，讓更多人知道'], a: 1,
      e: ['螢幕的另一邊是一個真實的人。在不知道全部之前跟著罵，你也成了那波浪的一部分。',
          '先停一下，想想自己知道的是不是全部——這一停，可能就少了一則傷人的留言。',
          '分享出去會讓更多人加入罵聲；如果事情不是你以為的那樣，傷害已經收不回來。'] },
  ];
  // 選了幾次「最謹慎的做法」→ 你的處事風格最像哪一個角色（Q 版）
  var TYPES = [
    { min: 7, name: '宋羽晴', img: 'img/chibi_song.png', advice: '你看得見螢幕另一邊的人。在知道全部之前，你不會急著下結論。' },
    { min: 5, name: '劉煦睿', img: 'img/chibi_player.png', advice: '你一直在找真相，只是偶爾還是會被流量推著走。分享之前，再多查一步就好。' },
    { min: 3, name: '李蔓緹', img: 'img/chibi_editor.png', advice: '標題夠狠、數字夠高，你就會停下來看。試試看：先找完整的版本，再決定要不要相信。' },
    { min: 0, name: '沈崇德', img: 'img/chibi_boss.png', advice: '你只看數字，不看人。但螢幕的另一邊，是一個真實的人。再玩一次，換個角度看看。' },
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
    explain.innerHTML = '<b>這樣做的話：</b>';                 // 不說對錯，只說這個做法會帶來什麼
    explain.appendChild(document.createTextNode(item.e[k]));
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
    document.getElementById('qType').textContent = '你是「' + type.name + '」';
    var chibi = document.getElementById('qChibi');
    chibi.src = type.img; chibi.alt = type.name + '（Q 版）';
    chibi.classList.remove('pop'); void chibi.offsetWidth; chibi.classList.add('pop');
    document.getElementById('qAdvice').textContent = type.advice;
    result.classList.add('show');
    idx.textContent = '完成';
  }
  document.getElementById('qRetry').addEventListener('click', function () {
    i = 0; score = 0; result.classList.remove('show'); card.style.display = ''; render();
  });
  render();
})();
