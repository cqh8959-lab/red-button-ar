// 團隊 AR 名片（4 位成員）
//   手機掃名片正面 → 名片上立起一片透明的玻璃介紹：頭像、名字、自我介紹、擅長、三個特質、聯絡按鈕
//   上方四顆圓形按鈕可以切換成員；網址加 ?p=2 會直接打開第 2 位（每個人的名片 QR Code 指向自己的號碼）
//   ?preview：不用相機，直接在畫面上看（電腦也能看）
//   全部動作都有緩動：玻璃片一片一片浮上來、特質卡翻面、按鈕按下去會彈一下
import * as THREE from 'three';

// ---------------- 成員資料（改這裡就好；目前都是假文） ----------------
//   photo：頭像圖片的路徑，例如 'img/member1.png'（放在 team/img/ 裡）。留空 = 顯示頭像框
//   group：群聊邀請連結。留空 = 按了會提示「還沒填」
const TEAM = [
  {
    name: '成員一', role: '遊戲企劃・程式', accent: '#e5283c', photo: '', group: '',
    intro: '這裡放一句自我介紹，大約二十個字左右就好。',
    skills: ['技能一', '技能二', '技能三', '技能四'],
    traits: [
      { word: '特質一', example: '一句小例子，說明這個特質。' },
      { word: '特質二', example: '一句小例子，說明這個特質。' },
      { word: '特質三', example: '一句小例子，說明這個特質。' },
    ],
  },
  {
    name: '成員二', role: '美術・角色設計', accent: '#ffb020', photo: '', group: '',
    intro: '這裡放一句自我介紹，大約二十個字左右就好。',
    skills: ['技能一', '技能二', '技能三'],
    traits: [
      { word: '特質一', example: '一句小例子，說明這個特質。' },
      { word: '特質二', example: '一句小例子，說明這個特質。' },
      { word: '特質三', example: '一句小例子，說明這個特質。' },
    ],
  },
  {
    name: '成員三', role: '劇本・敘事設計', accent: '#3fc7e8', photo: '', group: '',
    intro: '這裡放一句自我介紹，大約二十個字左右就好。',
    skills: ['技能一', '技能二', '技能三', '技能四'],
    traits: [
      { word: '特質一', example: '一句小例子，說明這個特質。' },
      { word: '特質二', example: '一句小例子，說明這個特質。' },
      { word: '特質三', example: '一句小例子，說明這個特質。' },
    ],
  },
  {
    name: '成員四', role: '音效・介面設計', accent: '#9b7bff', photo: '', group: '',
    intro: '這裡放一句自我介紹，大約二十個字左右就好。',
    skills: ['技能一', '技能二', '技能三'],
    traits: [
      { word: '特質一', example: '一句小例子，說明這個特質。' },
      { word: '特質二', example: '一句小例子，說明這個特質。' },
      { word: '特質三', example: '一句小例子，說明這個特質。' },
    ],
  },
];
const WORK_LINK = '../site/';                  // 「代表作」按鈕打開的網址（之後可以換成 itch.io 頁面）
const CARD_ASPECT = 591 / 1063;               // 名片（辨識圖）的高 ÷ 寬
const PX = 640;                                // 每 1 單位（名片寬）畫多少像素，越大字越清楚
const FONT = '"Noto Sans TC", "PingFang TC", "Microsoft JhengHei", sans-serif';

const params = new URLSearchParams(location.search);
const PREVIEW = params.has('preview');
let current = Math.min(TEAM.length - 1, Math.max(0, (parseInt(params.get('p'), 10) || 1) - 1));

// ---------------- 緩動 ----------------
const clamp01 = t => Math.min(1, Math.max(0, t));
const easeOut = t => 1 - Math.pow(1 - t, 3);
const easeIn = t => t * t * t;
const easeInOut = t => t < .5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
const easeOutBack = t => { const c = 1.4; return 1 + (c + 1) * Math.pow(t - 1, 3) + c * Math.pow(t - 1, 2); };
const now = () => performance.now() / 1000;

// ---------------- 畫布小工具 ----------------
function canvasFor(w, h) {
  const c = document.createElement('canvas');
  c.width = Math.round(w * PX); c.height = Math.round(h * PX);
  return [c, c.getContext('2d')];
}
function toTexture(c) { const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 4; return t; }

// 透明玻璃：淡淡的白、上面亮一點，加一圈細邊
function glass(g, w, h, r, tint = 'rgba(255,255,255,0.10)', edge = 'rgba(255,255,255,0.55)') {
  g.beginPath(); g.roundRect(3, 3, w - 6, h - 6, r);
  g.fillStyle = tint; g.fill();
  const shine = g.createLinearGradient(0, 0, 0, h);
  shine.addColorStop(0, 'rgba(255,255,255,0.16)'); shine.addColorStop(0.45, 'rgba(255,255,255,0.02)'); shine.addColorStop(1, 'rgba(255,255,255,0.06)');
  g.fillStyle = shine; g.fill();
  g.lineWidth = 3; g.strokeStyle = edge; g.stroke();
}

// 中文一個字一個字換行；超過行數就在最後加「…」
function wrapLines(g, text, maxW, maxLines) {
  const lines = []; let line = '';
  for (const ch of text) {
    if (g.measureText(line + ch).width > maxW && line) { lines.push(line); line = ch; } else line += ch;
  }
  if (line) lines.push(line);
  if (lines.length > maxLines) { lines.length = maxLines; lines[maxLines - 1] = lines[maxLines - 1].slice(0, -1) + '…'; }
  return lines;
}

// ---------------- 每一片的內容 ----------------
//   版面（由上到下）：頭像＋名字 → 分隔線 → 關於我 → 擅長 → 特質（三張卡）→ 兩顆按鈕
//   只有最外面那片玻璃有邊框，裡面靠留白和小標題分區，看起來比較乾淨、有質感
const PLATE_W = 1.0, PLATE_H = 1.36;
const PAD = 0.07;                                 // 左右留白
const INNER = PLATE_W - PAD * 2;

function label(g, text, x, y, color = 'rgba(255,255,255,0.5)') {
  g.save();
  g.font = `700 22px ${FONT}`; g.fillStyle = color; g.textBaseline = 'top';
  if ('letterSpacing' in g) g.letterSpacing = '4px';
  g.fillText(text, x, y);
  g.restore();
}

function drawBack(p) {
  const [c, g] = canvasFor(PLATE_W, PLATE_H);
  glass(g, c.width, c.height, 40, 'rgba(18,20,48,0.42)', 'rgba(255,255,255,0.32)');
  // 上緣一道很淡的成員代表色光（不是發光邊框，是玻璃裡透出來的顏色）
  const top = g.createLinearGradient(0, 0, 0, c.height * 0.35);
  top.addColorStop(0, p.accent + '33'); top.addColorStop(1, p.accent + '00');
  g.beginPath(); g.roundRect(3, 3, c.width - 6, c.height * 0.35, 40); g.fillStyle = top; g.fill();
  // 頭像區下面的細分隔線
  g.fillStyle = 'rgba(255,255,255,0.18)'; g.fillRect(PAD * PX, c.height - 0.98 * PX, INNER * PX, 2);
  return c;
}

function drawAvatar(p, img) {
  const [c, g] = canvasFor(0.3, 0.3);
  const s = c.width, r = s / 2 - 8;
  g.save(); g.beginPath(); g.arc(s / 2, s / 2, r, 0, Math.PI * 2); g.closePath();
  g.fillStyle = 'rgba(255,255,255,0.08)'; g.fill();
  if (img) {
    g.clip();                                              // 頭像：等比例放大填滿圓形（不變形，多的裁掉）
    const k = Math.max((r * 2) / img.width, (r * 2) / img.height);
    const w = img.width * k, h = img.height * k;
    g.drawImage(img, s / 2 - w / 2, s / 2 - h / 2, w, h);
  }
  g.restore();
  g.beginPath(); g.arc(s / 2, s / 2, r, 0, Math.PI * 2);
  g.lineWidth = 5; g.strokeStyle = p.accent;
  if (!img) g.setLineDash([12, 9]);
  g.stroke(); g.setLineDash([]);
  if (!img) {
    g.fillStyle = 'rgba(255,255,255,0.8)'; g.textAlign = 'center'; g.textBaseline = 'middle';
    g.font = `700 30px ${FONT}`; g.fillText('頭像', s / 2, s / 2);
  }
  return c;
}

function drawName(p) {
  const [c, g] = canvasFor(0.56, 0.3);
  g.textBaseline = 'alphabetic';
  g.fillStyle = '#ffffff'; g.font = `900 66px ${FONT}`; g.fillText(p.name, 4, 104);
  g.fillStyle = p.accent; g.fillRect(6, 128, 44, 5);
  g.fillStyle = 'rgba(255,255,255,0.75)'; g.font = `500 27px ${FONT}`;
  wrapLines(g, p.role, c.width - 10, 1).forEach(l => g.fillText(l, 4, 178));
  return c;
}

function drawIntro(p) {
  const [c, g] = canvasFor(INNER, 0.2);
  label(g, '關於我', 0, 0);
  g.fillStyle = '#f1f6ff'; g.font = `400 31px ${FONT}`; g.textBaseline = 'top';
  wrapLines(g, p.intro, c.width, 2).forEach((l, i) => g.fillText(l, 0, 40 + i * 42));
  return c;
}

function drawSkills(p) {
  const [c, g] = canvasFor(INNER, 0.15);
  label(g, '擅長', 0, 0);
  g.font = `500 26px ${FONT}`; g.textBaseline = 'middle';
  let x = 0; const y = 40, h = 46;
  for (const s of p.skills) {
    const w = g.measureText(s).width + 34;
    if (x + w > c.width) break;                             // 放不下就不畫，不會超出去
    g.beginPath(); g.roundRect(x, y, w, h, h / 2);
    g.fillStyle = 'rgba(255,255,255,0.10)'; g.fill();
    g.fillStyle = '#ffffff'; g.fillText(s, x + 17, y + h / 2 + 1);
    x += w + 10;
  }
  return c;
}

function drawSectionLabel(text) {
  const [c, g] = canvasFor(INNER, 0.06);
  label(g, text, 0, 6);
  return c;
}

function drawTrait(p, t, back) {
  const [c, g] = canvasFor(0.27, 0.2);
  glass(g, c.width, c.height, 20, back ? 'rgba(255,255,255,0.16)' : 'rgba(255,255,255,0.07)', back ? p.accent : 'rgba(255,255,255,0.28)');
  g.textAlign = 'center'; g.textBaseline = 'middle';
  if (!back) {
    g.fillStyle = '#ffffff'; g.font = `800 34px ${FONT}`; g.fillText(t.word, c.width / 2, c.height / 2 - 6);
    // 右下角一個小小的翻頁角（程式畫的三角形）
    g.beginPath(); g.moveTo(c.width - 14, c.height - 38); g.lineTo(c.width - 14, c.height - 14); g.lineTo(c.width - 38, c.height - 14); g.closePath();
    g.fillStyle = p.accent; g.fill();
  } else {
    g.fillStyle = '#ffffff'; g.font = `400 20px ${FONT}`;
    const lines = wrapLines(g, t.example, c.width - 34, 3);
    const lh = 28, top = c.height / 2 - (lines.length - 1) * lh / 2;
    lines.forEach((l, i) => g.fillText(l, c.width / 2, top + i * lh));
  }
  return c;
}

function drawButton(label, fill, solid) {
  const [c, g] = canvasFor(0.41, 0.11);
  g.beginPath(); g.roundRect(3, 3, c.width - 6, c.height - 6, (c.height - 6) / 2);
  g.fillStyle = fill; g.fill();
  if (!solid) { g.lineWidth = 2; g.strokeStyle = 'rgba(255,255,255,0.6)'; g.stroke(); }
  g.fillStyle = '#ffffff'; g.font = `700 28px ${FONT}`; g.textAlign = 'center'; g.textBaseline = 'middle';
  g.fillText(label, c.width / 2, c.height / 2 + 1);
  return c;
}

// ---------------- 立起來的玻璃介面 ----------------
const root = new THREE.Group();             // 跟著名片走
const stand = new THREE.Group();            // 從名片下緣立起來、稍微往後仰
stand.position.set(0, -CARD_ASPECT * 0.32, 0.02);
stand.rotation.x = 1.2;
root.add(stand);

// 名片上的投影光暈
const glow = (() => {
  const [c, g] = canvasFor(1, 1);
  const grd = g.createRadialGradient(c.width / 2, c.height / 2, 0, c.width / 2, c.height / 2, c.width / 2);
  grd.addColorStop(0, 'rgba(160,230,255,0.5)'); grd.addColorStop(1, 'rgba(160,230,255,0)');
  g.fillStyle = grd; g.fillRect(0, 0, c.width, c.height);
  const m = new THREE.Mesh(new THREE.PlaneGeometry(1.1, 0.5), new THREE.MeshBasicMaterial({ map: toTexture(c), transparent: true, depthWrite: false, opacity: 0 }));
  m.position.set(0, -CARD_ASPECT * 0.28, 0.003);
  root.add(m);
  return m;
})();

let items = [];         // 每一片：{ mesh, delay, x, y, z, ... }
let tappables = [];
let traits = [];
let shownAt = 0, hiding = null;

function addPiece(canvas, w, h, x, y, z, delay, order) {
  const mat = new THREE.MeshBasicMaterial({ map: toTexture(canvas), transparent: true, depthWrite: false, depthTest: false, opacity: 0, side: THREE.DoubleSide });
  const mesh = new THREE.Mesh(new THREE.PlaneGeometry(w, h), mat);
  mesh.renderOrder = order;
  stand.add(mesh);
  const it = { mesh, delay, x, y, z, punch: -10 };
  items.push(it);
  return it;
}

function clearPieces() {
  for (const it of items) {
    stand.remove(it.mesh); it.mesh.material.map.dispose(); it.mesh.material.dispose(); it.mesh.geometry.dispose();
    if (it.back) it.back.dispose();
    if (it.front && it.front !== it.mesh.material.map) it.front.dispose();
  }
  items = []; tappables = []; traits = [];
}

const photoCache = {};
function loadPhoto(src) {
  if (!src) return Promise.resolve(null);
  if (photoCache[src]) return photoCache[src];
  photoCache[src] = new Promise(res => { const im = new Image(); im.onload = () => res(im); im.onerror = () => res(null); im.src = src; });
  return photoCache[src];
}

async function build(index) {
  const p = TEAM[index];
  const photo = await loadPhoto(p.photo);
  clearPieces();
  const left = -PLATE_W / 2 + PAD;                                      // 內容的左邊界
  addPiece(drawBack(p), PLATE_W, PLATE_H, 0, PLATE_H / 2, 0, 0, 1);
  addPiece(drawAvatar(p, photo), 0.3, 0.3, left + 0.15, 1.17, 0.05, 0.10, 3);
  addPiece(drawName(p), 0.56, 0.3, left + 0.3 + 0.05 + 0.28, 1.17, 0.035, 0.16, 3);
  addPiece(drawIntro(p), INNER, 0.2, 0, 0.84, 0.03, 0.24, 2);
  addPiece(drawSkills(p), INNER, 0.15, 0, 0.635, 0.03, 0.30, 2);
  addPiece(drawSectionLabel('特質（點一下翻面）'), INNER, 0.06, 0, 0.505, 0.03, 0.34, 2);
  p.traits.slice(0, 3).forEach((t, i) => {
    const it = addPiece(drawTrait(p, t, false), 0.27, 0.2, left + 0.135 + i * (0.27 + 0.0) + i * ((INNER - 0.81) / 2), 0.36, 0.06, 0.38 + i * 0.06, 4);
    it.front = it.mesh.material.map; it.back = toTexture(drawTrait(p, t, true));
    it.flip = 0; it.flipTo = 0;
    it.onTap = () => { it.flipTo = it.flipTo ? 0 : 1; };
    tappables.push(it); traits.push(it);
  });
  const bw = 0.41, gap = INNER - bw * 2;
  const work = addPiece(drawButton('代表作', p.accent, true), bw, 0.11, left + bw / 2, 0.13, 0.05, 0.58, 4);
  work.onTap = () => setTimeout(() => { location.href = WORK_LINK; }, 220);
  const chat = addPiece(drawButton('加入群聊', 'rgba(255,255,255,0.08)', false), bw, 0.11, left + bw + gap + bw / 2, 0.13, 0.05, 0.64, 4);
  chat.onTap = () => {
    if (p.group) setTimeout(() => { location.href = p.group; }, 220);
    else toast('群聊連結還沒填（在 team.js 的 group 填上）');
  };
  tappables.push(work, chat);
  shownAt = now();
}

// 切換成員：舊的淡出縮小 → 新的一片一片浮上來
function switchTo(index) {
  if (index === current && items.length) { shownAt = now(); return; }    // 同一位：重播出場
  current = index;
  setActiveChip(index);
  hiding = { start: now(), then: () => build(index) };
  history.replaceState(null, '', `?${PREVIEW ? 'preview&' : ''}p=${index + 1}`);
}

function update(t) {
  stand.position.z = 0.02 + Math.sin(t * 1.3) * 0.008;              // 輕輕浮著
  let hideK = 0;
  if (hiding) {
    hideK = clamp01((t - hiding.start) / 0.28);
    if (hideK >= 1) { const go = hiding.then; hiding = null; hideK = 0; go(); return; }
  }
  const out = easeIn(hideK);
  glow.material.opacity = 0.9 * easeOut(clamp01((t - shownAt) / 0.5)) * (1 - out);
  for (const it of items) {
    const k = clamp01((t - shownAt - it.delay) / 0.6);
    const e = easeOutBack(k);
    let s = (0.7 + 0.3 * e) * (1 - 0.15 * out);
    const ps = t - it.punch;                                          // 按下去：縮一下再彈回來
    if (ps < 0.3) s *= 1 - 0.08 * Math.sin(Math.PI * ps / 0.3);
    it.mesh.scale.setScalar(s);
    it.mesh.position.set(it.x, it.y - 0.08 * (1 - e), it.z * e);
    it.mesh.material.opacity = easeOut(k) * (1 - out);
    if (it.flipTo !== undefined) {                                    // 特質卡翻面：前半轉到側面、換內容、後半轉回正面
      it.flip += Math.sign(it.flipTo - it.flip) * Math.min(Math.abs(it.flipTo - it.flip), 1 / 60 / 0.5);
      const f = easeInOut(it.flip);
      const showBack = f >= 0.5;
      it.mesh.material.map = showBack ? it.back : it.front;
      it.mesh.rotation.y = showBack ? (f - 1) * Math.PI : f * Math.PI;
    }
  }
}

// ---------------- 點擊（射線打到哪一片） ----------------
const ray = new THREE.Raycaster();
function bindTap(renderer, camera) {
  let downAt = null;
  const el = renderer.domElement;
  addEventListener('pointerdown', e => { downAt = [e.clientX, e.clientY]; });
  addEventListener('pointerup', e => {
    if (!downAt || Math.hypot(e.clientX - downAt[0], e.clientY - downAt[1]) > 10) return;   // 拖曳不算點
    if (e.target.closest && e.target.closest('#bar, #start')) return;
    const r = el.getBoundingClientRect();
    ray.setFromCamera(new THREE.Vector2(((e.clientX - r.left) / r.width) * 2 - 1, -((e.clientY - r.top) / r.height) * 2 + 1), camera);
    const hit = ray.intersectObjects(tappables.map(i => i.mesh), false)[0];
    if (!hit) return;
    const it = tappables.find(i => i.mesh === hit.object);
    if (it && it.mesh.material.opacity > 0.5) { it.punch = now(); it.onTap(); }
  });
}

// ---------------- 上方的成員按鈕 ----------------
const bar = document.getElementById('bar');
function buildBar() {
  bar.innerHTML = '';
  TEAM.forEach((p, i) => {
    const chip = document.createElement('div'); chip.className = 'chip'; chip.dataset.index = i;
    const b = document.createElement('button'); b.className = 'member';
    b.setAttribute('aria-label', p.name);
    b.style.setProperty('--accent', p.accent);
    if (p.photo) { b.classList.add('has-photo'); b.style.backgroundImage = `url(${p.photo})`; }
    else b.innerHTML = portraitSVG(p.accent);                       // 還沒放頭像：先畫一個簡單的人像
    b.onclick = () => switchTo(i);
    const l = document.createElement('label'); l.textContent = p.name;
    chip.append(b, l); bar.appendChild(chip);
  });
  bar.classList.remove('hidden');
  setActiveChip(current);
}
// 頭像預設圖：成員代表色的底＋白色的頭和肩膀（用程式畫，不用文字符號）
function portraitSVG(accent) {
  return `<svg viewBox="0 0 60 60" aria-hidden="true">
    <defs><linearGradient id="g${accent.slice(1)}" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${accent}" stop-opacity=".95"/><stop offset="1" stop-color="${accent}" stop-opacity=".55"/></linearGradient></defs>
    <circle cx="30" cy="30" r="30" fill="url(#g${accent.slice(1)})"/>
    <circle cx="30" cy="24" r="10" fill="rgba(255,255,255,.92)"/>
    <path d="M12 54c2-11 9-16 18-16s16 5 18 16a30 30 0 0 1-36 0z" fill="rgba(255,255,255,.92)"/>
  </svg>`;
}
function setActiveChip(i) { bar.querySelectorAll('.chip').forEach(c => c.classList.toggle('active', Number(c.dataset.index) === i)); }

let toastTimer = null;
function toast(text) {
  const el = document.getElementById('toast');
  el.textContent = text; el.classList.remove('hidden');
  requestAnimationFrame(() => el.classList.add('show'));
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => { el.classList.remove('show'); setTimeout(() => el.classList.add('hidden'), 320); }, 2200);
}

// 開始畫面：看得出是誰的名片
document.getElementById('who').innerHTML = `${TEAM[current].name} 的名片<br>把手機鏡頭對準名片正面，名片上會浮出介紹。`;
document.getElementById('btnPreview').href = `?preview&p=${current + 1}`;

// ---------------- 「回到正面」按鈕（像地圖的「回到目前位置」） ----------------
//   轉了視角、翻了特質卡、不知道怎麼回到一開始的樣子時，右下角會浮出這顆按鈕
//   按下去：鏡頭慢慢轉回正面、翻過的卡片翻回來、介紹重新一片一片浮上來
const HOME_POS = new THREE.Vector3(0, -2.55, 1.6);
const HOME_TARGET = new THREE.Vector3(0, 0, 0.62);
let previewCam = null, recenter = null;
const homeBtn = document.getElementById('home');

function drifted() {
  if (traits.some(t => t.flipTo)) return true;
  if (previewCam) {
    const { camera, controls } = previewCam;
    return camera.position.distanceTo(HOME_POS) > 0.25 || controls.target.distanceTo(HOME_TARGET) > 0.1;
  }
  return false;
}
function checkDrift() { homeBtn.classList.toggle('show', !recenter && !hiding && items.length > 0 && drifted()); }

function goHome() {
  traits.forEach(t => { t.flipTo = 0; });
  if (previewCam) recenter = { start: now(), pos: previewCam.camera.position.clone(), target: previewCam.controls.target.clone() };
  shownAt = now();                                                   // 介紹重新浮上來一次
}
function stepRecenter(t) {
  if (!recenter || !previewCam) return;
  const k = clamp01((t - recenter.start) / 0.7), e = easeInOut(k);
  previewCam.camera.position.lerpVectors(recenter.pos, HOME_POS, e);
  previewCam.controls.target.lerpVectors(recenter.target, HOME_TARGET, e);
  if (k >= 1) recenter = null;
}
homeBtn.onclick = goHome;

// ---------------- 預覽模式（不用相機） ----------------
async function startPreview() {
  const { OrbitControls } = await import('three/addons/controls/OrbitControls.js');
  document.getElementById('start').classList.add('hidden');
  document.getElementById('preview-tip').classList.remove('hidden');
  const renderer = new THREE.WebGLRenderer({ antialias: true });
  renderer.setPixelRatio(Math.min(2, devicePixelRatio));
  renderer.setSize(innerWidth, innerHeight);
  document.getElementById('ar').appendChild(renderer.domElement);
  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0x0b0820);
  const camera = new THREE.PerspectiveCamera(50, innerWidth / innerHeight, 0.01, 50);
  camera.up.set(0, 0, 1);
  camera.position.copy(HOME_POS);              // 手機直拿也看得到整片
  const controls = new OrbitControls(camera, renderer.domElement);
  controls.target.copy(HOME_TARGET); controls.enableDamping = true; controls.update();
  previewCam = { camera, controls };

  const cardTex = new THREE.TextureLoader().load('../assets/card_front.jpg'); cardTex.colorSpace = THREE.SRGBColorSpace;
  scene.add(new THREE.Mesh(new THREE.PlaneGeometry(1, CARD_ASPECT), new THREE.MeshBasicMaterial({ map: cardTex })));
  const table = new THREE.Mesh(new THREE.PlaneGeometry(8, 8), new THREE.MeshBasicMaterial({ color: 0x14102e }));
  table.position.z = -0.01; scene.add(table);
  scene.add(root);

  addEventListener('resize', () => { renderer.setSize(innerWidth, innerHeight); camera.aspect = innerWidth / innerHeight; camera.updateProjectionMatrix(); });
  buildBar();
  bindTap(renderer, camera);
  build(current);
  renderer.setAnimationLoop(() => { const t = now(); stepRecenter(t); controls.update(); update(t); checkDrift(); renderer.render(scene, camera); });
}

// ---------------- AR 模式（相機＋辨識名片） ----------------
async function startAR() {
  const btn = document.getElementById('btnCamera');
  btn.disabled = true; btn.textContent = '啟動相機中…';
  try {
    const { MindARThree } = await import('../vendor/mindar/mindar-image-three.prod.js');
    const mindar = new MindARThree({
      container: document.getElementById('ar'),
      imageTargetSrc: '../assets/card.mind',          // 目前先用遊戲名片正面當掃描目標（之後換成你們自己的名片設計）
      uiLoading: 'no', uiScanning: 'no', uiError: 'no',
      filterMinCF: 0.0001, filterBeta: 0.001,
    });
    const { renderer, scene, camera } = mindar;
    const anchor = mindar.addAnchor(0);
    anchor.group.add(root);
    const scan = document.getElementById('scan');
    let lostTimer = null, visible = false;
    anchor.onTargetFound = () => {
      clearTimeout(lostTimer);
      scan.classList.add('hidden');
      if (!visible) { visible = true; build(current); }               // 對到名片：重新一片一片浮上來
    };
    anchor.onTargetLost = () => { lostTimer = setTimeout(() => { scan.classList.remove('hidden'); visible = false; }, 600); };
    await mindar.start();
    document.getElementById('start').classList.add('hidden');
    scan.classList.remove('hidden');
    buildBar();
    bindTap(renderer, camera);
    renderer.setAnimationLoop(() => { update(now()); checkDrift(); renderer.render(scene, camera); });
  } catch (e) {
    console.error(e);
    btn.disabled = false; btn.textContent = '開啟相機，掃描名片';
    toast('相機打不開：請允許使用相機，並用 Safari（iPhone）或 Chrome（Android）開啟。');
  }
}

document.getElementById('btnCamera').onclick = startAR;
if (PREVIEW) startPreview();
