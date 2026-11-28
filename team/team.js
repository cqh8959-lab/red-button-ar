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
function drawBack(p) {
  const [c, g] = canvasFor(1.0, 1.12);
  glass(g, c.width, c.height, 36, 'rgba(20,24,60,0.38)', 'rgba(255,255,255,0.35)');
  g.fillStyle = p.accent; g.fillRect(36, c.height - 26, c.width - 72, 6);        // 底部一條成員代表色
  return c;
}

function drawAvatar(p, img) {
  const [c, g] = canvasFor(0.34, 0.34);
  const s = c.width, r = s / 2 - 10;
  g.save(); g.beginPath(); g.arc(s / 2, s / 2, r, 0, Math.PI * 2); g.closePath();
  g.fillStyle = 'rgba(255,255,255,0.10)'; g.fill();
  if (img) {
    // 頭像圖：等比例放大到填滿圓形（不變形，多的裁掉）
    g.clip();
    const k = Math.max((r * 2) / img.width, (r * 2) / img.height);
    const w = img.width * k, h = img.height * k;
    g.drawImage(img, s / 2 - w / 2, s / 2 - h / 2, w, h);
  }
  g.restore();
  g.beginPath(); g.arc(s / 2, s / 2, r, 0, Math.PI * 2);
  g.lineWidth = 6; g.strokeStyle = p.accent;
  if (!img) g.setLineDash([14, 10]);
  g.stroke(); g.setLineDash([]);
  if (!img) {
    g.fillStyle = 'rgba(255,255,255,0.85)'; g.textAlign = 'center'; g.textBaseline = 'middle';
    g.font = `800 40px ${FONT}`; g.fillText('頭像', s / 2, s / 2 - 14);
    g.fillStyle = 'rgba(255,255,255,0.55)'; g.font = `500 22px ${FONT}`; g.fillText('之後放圖', s / 2, s / 2 + 26);
  }
  return c;
}

function drawName(p) {
  const [c, g] = canvasFor(0.56, 0.26);
  g.textBaseline = 'top';
  g.fillStyle = '#ffffff'; g.font = `900 64px ${FONT}`; g.fillText(p.name, 8, 22);
  g.fillStyle = p.accent; g.fillRect(10, 104, 56, 6);
  g.fillStyle = '#ffd24a'; g.font = `700 30px ${FONT}`;
  wrapLines(g, p.role, c.width - 16, 1).forEach((l, i) => g.fillText(l, 8, 124 + i * 36));
  return c;
}

function drawIntro(p) {
  const [c, g] = canvasFor(0.92, 0.15);
  glass(g, c.width, c.height, 22);
  g.fillStyle = '#eef6ff'; g.font = `500 30px ${FONT}`; g.textBaseline = 'middle';
  const lines = wrapLines(g, p.intro, c.width - 56, 2);
  const lh = 38, top = c.height / 2 - (lines.length - 1) * lh / 2;
  lines.forEach((l, i) => g.fillText(l, 28, top + i * lh));
  return c;
}

function drawSkills(p) {
  const [c, g] = canvasFor(0.92, 0.12);
  g.font = `700 26px ${FONT}`; g.textBaseline = 'middle';
  g.fillStyle = 'rgba(255,255,255,0.6)'; g.fillText('擅長', 6, c.height / 2);
  let x = 82;
  for (const s of p.skills) {
    const w = g.measureText(s).width + 36;
    if (x + w > c.width - 4) break;                       // 放不下就不畫，不會疊到外面
    g.beginPath(); g.roundRect(x, c.height / 2 - 24, w, 48, 24);
    g.fillStyle = 'rgba(255,255,255,0.14)'; g.fill();
    g.lineWidth = 2; g.strokeStyle = 'rgba(255,255,255,0.5)'; g.stroke();
    g.fillStyle = '#ffffff'; g.fillText(s, x + 18, c.height / 2 + 1);
    x += w + 12;
  }
  return c;
}

function drawTrait(p, t, back) {
  const [c, g] = canvasFor(0.28, 0.2);
  glass(g, c.width, c.height, 22, back ? 'rgba(255,255,255,0.20)' : 'rgba(255,255,255,0.10)', back ? p.accent : 'rgba(255,255,255,0.55)');
  g.textAlign = 'center'; g.textBaseline = 'middle';
  if (!back) {
    g.fillStyle = '#ffffff'; g.font = `900 38px ${FONT}`; g.fillText(t.word, c.width / 2, c.height / 2 - 10);
    g.fillStyle = 'rgba(255,255,255,0.5)'; g.font = `500 18px ${FONT}`; g.fillText('點我翻面', c.width / 2, c.height - 22);
  } else {
    g.fillStyle = '#ffffff'; g.font = `500 21px ${FONT}`;
    const lines = wrapLines(g, t.example, c.width - 32, 3);
    const lh = 28, top = c.height / 2 - (lines.length - 1) * lh / 2;
    lines.forEach((l, i) => g.fillText(l, c.width / 2, top + i * lh));
  }
  return c;
}

function drawButton(label, color) {
  const [c, g] = canvasFor(0.43, 0.12);
  g.beginPath(); g.roundRect(4, 4, c.width - 8, c.height - 8, (c.height - 8) / 2);
  g.fillStyle = color; g.fill();
  g.lineWidth = 3; g.strokeStyle = 'rgba(255,255,255,0.75)'; g.stroke();
  g.fillStyle = '#ffffff'; g.font = `800 32px ${FONT}`; g.textAlign = 'center'; g.textBaseline = 'middle';
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
  grd.addColorStop(0, 'rgba(160,230,255,0.55)'); grd.addColorStop(1, 'rgba(160,230,255,0)');
  g.fillStyle = grd; g.fillRect(0, 0, c.width, c.height);
  const m = new THREE.Mesh(new THREE.PlaneGeometry(1.1, 0.5), new THREE.MeshBasicMaterial({ map: toTexture(c), transparent: true, depthWrite: false, opacity: 0 }));
  m.position.set(0, -CARD_ASPECT * 0.28, 0.003);
  root.add(m);
  return m;
})();

let items = [];         // 每一片：{ mesh, delay, x, y, z, ... }
let tappables = [];
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
  for (const it of items) { stand.remove(it.mesh); it.mesh.material.map.dispose(); it.mesh.material.dispose(); it.mesh.geometry.dispose(); }
  items = []; tappables = [];
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
  addPiece(drawBack(p), 1.0, 1.12, 0, 0.6, 0, 0, 1);
  addPiece(drawAvatar(p, photo), 0.34, 0.34, -0.29, 0.98, 0.05, 0.10, 3);
  addPiece(drawName(p), 0.56, 0.26, 0.19, 0.98, 0.035, 0.16, 3);
  addPiece(drawIntro(p), 0.92, 0.15, 0, 0.75, 0.03, 0.24, 2);
  addPiece(drawSkills(p), 0.92, 0.12, 0, 0.6, 0.03, 0.30, 2);
  p.traits.slice(0, 3).forEach((t, i) => {
    const it = addPiece(drawTrait(p, t, false), 0.28, 0.2, -0.31 + i * 0.31, 0.4, 0.06, 0.38 + i * 0.06, 4);
    it.front = it.mesh.material.map; it.back = toTexture(drawTrait(p, t, true));
    it.flip = 0; it.flipTo = 0;
    it.onTap = () => { it.flipTo = it.flipTo ? 0 : 1; };
    tappables.push(it);
  });
  const work = addPiece(drawButton('代表作', p.accent), 0.43, 0.12, -0.235, 0.17, 0.05, 0.58, 4);
  work.onTap = () => setTimeout(() => { location.href = WORK_LINK; }, 220);
  const chat = addPiece(drawButton('加入群聊', 'rgba(255,255,255,0.18)'), 0.43, 0.12, 0.235, 0.17, 0.05, 0.64, 4);
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
    const b = document.createElement('button'); b.className = 'member'; b.textContent = String(i + 1);
    b.setAttribute('aria-label', p.name);
    if (p.photo) { b.classList.add('has-photo'); b.style.backgroundImage = `url(${p.photo})`; }
    b.onclick = () => switchTo(i);
    const l = document.createElement('label'); l.textContent = p.name;
    chip.append(b, l); bar.appendChild(chip);
  });
  bar.classList.remove('hidden');
  setActiveChip(current);
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
  camera.position.set(0, -2.5, 1.45);        // 手機直拿也看得到整片
  const controls = new OrbitControls(camera, renderer.domElement);
  controls.target.set(0, 0, 0.5); controls.enableDamping = true; controls.update();

  const cardTex = new THREE.TextureLoader().load('../assets/card_front.jpg'); cardTex.colorSpace = THREE.SRGBColorSpace;
  scene.add(new THREE.Mesh(new THREE.PlaneGeometry(1, CARD_ASPECT), new THREE.MeshBasicMaterial({ map: cardTex })));
  const table = new THREE.Mesh(new THREE.PlaneGeometry(8, 8), new THREE.MeshBasicMaterial({ color: 0x14102e }));
  table.position.z = -0.01; scene.add(table);
  scene.add(root);

  addEventListener('resize', () => { renderer.setSize(innerWidth, innerHeight); camera.aspect = innerWidth / innerHeight; camera.updateProjectionMatrix(); });
  buildBar();
  bindTap(renderer, camera);
  build(current);
  renderer.setAnimationLoop(() => { controls.update(); update(now()); renderer.render(scene, camera); });
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
    renderer.setAnimationLoop(() => { update(now()); renderer.render(scene, camera); });
  } catch (e) {
    console.error(e);
    btn.disabled = false; btn.textContent = '開啟相機，掃描名片';
    toast('相機打不開：請允許使用相機，並用 Safari（iPhone）或 Chrome（Android）開啟。');
  }
}

document.getElementById('btnCamera').onclick = startAR;
if (PREVIEW) startPreview();
