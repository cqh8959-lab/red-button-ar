// 實像媒體 AR 名片
//   手機掃名片正面 → 角色從名片上浮出來（全息投影）
//   上方一排圓形按鈕：START（重播出場）＋ 每個角色一顆，點了就切換
//   ?preview：不用相機，直接在畫面上看效果（電腦也能看）
import * as THREE from 'three';

// ---------------- 角色資料（換角色：改這裡、把圖放進 assets/） ----------------
const CHARACTERS = [
  { id: 'char1', name: '你', role: '實像媒體・新進編輯', text: '剛到實像媒體報到的新人。\n桌上那顆紅色按鈕，按下去就是流量。', image: 'assets/char1.png' },
  { id: 'char2', name: '李蔓緹', role: '實像媒體・主編', text: '你的上司。\n她只在乎一個數字：點閱。', image: 'assets/char2.png' },
  { id: 'char3', name: '老闆', role: '實像媒體・老闆', text: '他看的不是新聞，\n是報表上的數字。', image: 'assets/char3.png' },
];

const CARD_ASPECT = 591 / 1063;          // 名片（辨識圖）的高 ÷ 寬
const CHAR_HEIGHT = 1.0;                  // 角色高度（名片寬度＝1）
const TINT = new THREE.Color(0x7fe9ff);   // 全息的顏色

const params = new URLSearchParams(location.search);
const PREVIEW = params.has('preview');

// ---------------- 緩動 ----------------
const easeOut = t => 1 - Math.pow(1 - t, 3);
const easeIn = t => t * t * t;
const easeInOut = t => t < .5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
const clamp01 = t => Math.min(1, Math.max(0, t));

// ---------------- 小工具：貼圖 ----------------
function radialTexture(inner = 'rgba(255,255,255,1)', outer = 'rgba(255,255,255,0)') {
  const c = document.createElement('canvas'); c.width = c.height = 128;
  const g = c.getContext('2d');
  const grd = g.createRadialGradient(64, 64, 0, 64, 64, 64);
  grd.addColorStop(0, inner); grd.addColorStop(1, outer);
  g.fillStyle = grd; g.fillRect(0, 0, 128, 128);
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t;
}

// 角色旁邊的資料卡（像全息面板）
function infoTexture(ch) {
  const c = document.createElement('canvas'); c.width = 640; c.height = 400;
  const g = c.getContext('2d');
  const r = 28;
  g.beginPath(); g.roundRect(8, 8, 624, 384, r);
  g.fillStyle = 'rgba(12, 18, 48, 0.78)'; g.fill();
  g.lineWidth = 4; g.strokeStyle = 'rgba(127, 233, 255, 0.95)'; g.stroke();
  g.fillStyle = 'rgba(229, 40, 60, 1)'; g.fillRect(36, 44, 10, 64);
  g.fillStyle = '#ffffff'; g.font = '900 60px "Noto Sans TC", "PingFang TC", sans-serif'; g.textBaseline = 'top';
  g.fillText(ch.name, 64, 40);
  g.fillStyle = '#ffd24a'; g.font = '700 30px "Noto Sans TC", "PingFang TC", sans-serif';
  g.fillText(ch.role, 64, 118);
  g.fillStyle = 'rgba(127,233,255,0.5)'; g.fillRect(36, 172, 568, 3);
  g.fillStyle = '#e8f8ff'; g.font = '500 30px "Noto Sans TC", "PingFang TC", sans-serif';
  ch.text.split('\n').forEach((line, i) => g.fillText(line, 40, 196 + i * 48));
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t;
}

// ---------------- 全息角色的材質 ----------------
function hologramMaterial(map) {
  return new THREE.ShaderMaterial({
    transparent: true, depthWrite: false, depthTest: false, side: THREE.DoubleSide,   // 永遠畫在最上面，不會被名片擋住
    uniforms: {
      map: { value: map }, time: { value: 0 }, reveal: { value: 0 }, opacity: { value: 1 },
      tint: { value: TINT }, texel: { value: new THREE.Vector2(1 / 512, 1 / 1400) }, glitch: { value: 0 },
    },
    vertexShader: `varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }`,
    fragmentShader: `
      uniform sampler2D map; uniform float time, reveal, opacity, glitch; uniform vec3 tint; uniform vec2 texel;
      varying vec2 vUv;
      void main(){
        vec2 uv = vUv;
        uv.x += glitch * 0.012 * sin(uv.y * 80.0 + time * 40.0);              // 偶爾的訊號干擾
        vec4 t = texture2D(map, uv);
        float n = 0.0;                                                        // 外框光：周圍有沒有角色
        for (int i = 0; i < 8; i++) { float a = float(i) * 0.7854; n += texture2D(map, uv + vec2(cos(a), sin(a)) * texel * 7.0).a; }
        n /= 8.0;
        float rim = clamp(n - t.a, 0.0, 1.0);
        float below = 1.0 - smoothstep(reveal - 0.004, reveal + 0.004, uv.y);  // 由下往上出現
        float edge = (1.0 - smoothstep(0.0, 0.025, abs(uv.y - reveal))) * step(0.02, max(n, t.a)) * step(0.001, reveal) * step(reveal, 0.999);
        float scan = 0.88 + 0.12 * sin(uv.y * 700.0 - time * 6.0);              // 細掃描線
        float band = exp(-pow((fract(uv.y * 0.8 - time * 0.22) - 0.5) * 14.0, 2.0)); // 往上跑的亮帶
        vec3 col = mix(t.rgb, tint, 0.3) * scan + tint * band * 0.35;
        float a = t.a * 0.9;
        float glow = rim * 1.1;
        float outA = clamp(a + glow * 0.8, 0.0, 1.0) * below + edge;
        vec3 outC = (col * a + tint * (glow + edge * 2.0)) / max(a + glow + edge, 0.001);
        gl_FragColor = vec4(outC, outA * opacity);
        if (gl_FragColor.a < 0.01) discard;
      }`,
  });
}

// 光柱：底部亮、往上淡掉，有直條紋
function beamMaterial() {
  return new THREE.ShaderMaterial({
    transparent: true, depthWrite: false, side: THREE.DoubleSide, blending: THREE.AdditiveBlending,
    uniforms: { time: { value: 0 }, strength: { value: 0 }, tint: { value: TINT } },
    vertexShader: `varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }`,
    fragmentShader: `
      uniform float time, strength; uniform vec3 tint; varying vec2 vUv;
      void main(){
        float fade = pow(1.0 - vUv.y, 2.2);
        float stripes = 0.6 + 0.4 * sin(vUv.x * 120.0 + time * 2.0);
        gl_FragColor = vec4(tint, fade * stripes * 0.32 * strength);
      }`,
  });
}

// ---------------- 建立全息投影（放在名片上） ----------------
function buildHologram() {
  const root = new THREE.Group();                 // 名片座標：名片在 XY 平面，Z 是往名片外面
  const pivot = new THREE.Group(); root.add(pivot); // 繞名片法線轉，讓角色一直面向鏡頭
  const loader = new THREE.TextureLoader();

  // 底座：發光的圓盤＋兩圈光環
  const glowTex = radialTexture('rgba(127,233,255,0.9)', 'rgba(127,233,255,0)');
  const disc = new THREE.Mesh(new THREE.CircleGeometry(0.34, 64),
    new THREE.MeshBasicMaterial({ map: glowTex, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending }));
  disc.position.z = 0.002; root.add(disc);
  const ringMat = new THREE.MeshBasicMaterial({ color: TINT, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide });
  const ring1 = new THREE.Mesh(new THREE.RingGeometry(0.27, 0.285, 96), ringMat); ring1.position.z = 0.004; root.add(ring1);
  const ring2 = new THREE.Mesh(new THREE.RingGeometry(0.31, 0.318, 96, 1, 0, Math.PI * 1.6), ringMat.clone()); ring2.position.z = 0.004; root.add(ring2);

  // 光柱（沿著 Z 往上）
  const beam = new THREE.Mesh(new THREE.CylinderGeometry(0.22, 0.29, CHAR_HEIGHT * 1.15, 64, 1, true), beamMaterial());
  beam.rotation.x = Math.PI / 2; beam.position.z = CHAR_HEIGHT * 0.575; root.add(beam);

  // 往上飄的光點
  const N = 90, pos = new Float32Array(N * 3), speed = new Float32Array(N);
  for (let i = 0; i < N; i++) {
    const a = Math.random() * Math.PI * 2, r = 0.05 + Math.random() * 0.24;
    pos[i * 3] = Math.cos(a) * r; pos[i * 3 + 1] = Math.sin(a) * r; pos[i * 3 + 2] = Math.random() * CHAR_HEIGHT * 1.2;
    speed[i] = 0.08 + Math.random() * 0.2;
  }
  const pGeo = new THREE.BufferGeometry(); pGeo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  const pMat = new THREE.PointsMaterial({ map: radialTexture(), color: TINT, size: 0.025, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, opacity: 0 });
  const points = new THREE.Points(pGeo, pMat); root.add(points);

  // 掃描環：角色出現時，一圈光從下往上掃
  const scanRing = new THREE.Mesh(new THREE.RingGeometry(0.2, 0.235, 96),
    new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide, opacity: 0 }));
  root.add(scanRing);

  // 角色（每個角色一片，站在名片上：先轉 90° 讓角色的「上」＝名片外面）
  const stand = new THREE.Group(); stand.rotation.x = Math.PI / 2; pivot.add(stand);   // 方向每一格由 orient() 決定
  const chars = CHARACTERS.map(ch => {
    const tex = loader.load(ch.image, t => {
      t.colorSpace = THREE.SRGBColorSpace;
      const aspect = t.image.width / t.image.height;
      mesh.scale.set(CHAR_HEIGHT * aspect, CHAR_HEIGHT, 1);
      mat.uniforms.texel.value.set(1 / t.image.width, 1 / t.image.height);
    });
    const mat = hologramMaterial(tex);
    const mesh = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), mat);
    mesh.geometry.translate(0, 0.5, 0);          // 腳底在原點
    mesh.visible = false;
    mesh.renderOrder = 10;
    stand.add(mesh);
    // 資料卡：浮在角色右邊
    const info = new THREE.Mesh(new THREE.PlaneGeometry(0.4, 0.25),
      new THREE.MeshBasicMaterial({ map: infoTexture(ch), transparent: true, depthWrite: false, depthTest: false, opacity: 0, side: THREE.DoubleSide }));
    info.renderOrder = 11;
    info.position.set(0.36, 0.86, 0.04); info.rotation.y = -0.3;   // 靠近角色，手機直拿也看得到 info.visible = false;
    stand.add(info);
    return { mesh, mat, info };
  });

  return { root, pivot, stand, disc, ring1, ring2, beam, points, pMat, speed, scanRing, chars };
}

// ---------------- 動畫狀態：出場、切換 ----------------
const holo = buildHologram();
let current = 0;
let phase = 'idle';            // idle → intro（底座、光柱、角色出現）→ shown；切換：out → in
let phaseStart = 0;
let next = 0;
let baseLevel = 0;             // 底座／光柱的亮度 0~1
let glitchUntil = 0;

function now() { return performance.now() / 1000; }
function playIntro(index = current) { next = index; current = index; phase = 'intro'; phaseStart = now(); showOnly(current); setActiveChip(current); }
function switchTo(index) {
  if (phase === 'idle') { playIntro(index); return; }
  if (index === current && phase === 'shown') { phase = 'in'; phaseStart = now(); return; }   // 同一個：重新投影一次
  next = index; phase = 'out'; phaseStart = now(); setActiveChip(index);
}
function showOnly(i) { holo.chars.forEach((c, k) => { c.mesh.visible = k === i; c.info.visible = k === i; }); }

function update(t, dt, cameraInCard, cameraUpInCard) {
  const c = holo.chars[current];
  const p = t - phaseStart;
  let reveal = c.mat.uniforms.reveal.value;

  if (phase === 'intro') {
    baseLevel = easeOut(clamp01(p / 0.5));                 // 0~0.5 秒：底座和光柱亮起來
    reveal = easeOut(clamp01((p - 0.35) / 1.1));          // 0.35~1.45 秒：角色由下往上出現
    if (p > 1.5) phase = 'shown';
  } else if (phase === 'out') {
    reveal = 1 - easeIn(clamp01(p / 0.4));                // 往下收掉
    if (p > 0.42) { current = next; showOnly(current); phase = 'in'; phaseStart = t; glitchUntil = t + 0.25; }
  } else if (phase === 'in') {
    reveal = easeOut(clamp01(p / 0.9));
    if (p > 0.95) phase = 'shown';
  } else if (phase === 'shown') {
    reveal = 1;
    if (Math.random() < dt * 0.15) glitchUntil = t + 0.12;   // 偶爾閃一下訊號
  }

  const cc = holo.chars[current];
  cc.mat.uniforms.reveal.value = reveal;
  cc.mat.uniforms.time.value = t;
  cc.mat.uniforms.glitch.value = t < glitchUntil ? 1 : 0;
  cc.mat.uniforms.opacity.value = 0.92 + 0.08 * Math.sin(t * 9.0) * Math.sin(t * 3.3);
  cc.info.material.opacity = easeOut(clamp01((reveal - 0.7) / 0.3)) * 0.95;
  cc.info.position.z = 0.02 + 0.015 * Math.sin(t * 1.6);

  // 角色輕輕上下浮動
  holo.pivot.position.z = 0.015 + 0.012 * Math.sin(t * 1.4);

  // 底座、光環、光柱、光點
  const bl = baseLevel;
  holo.disc.material.opacity = 0.55 * bl;
  holo.disc.scale.setScalar(0.4 + 0.6 * bl);
  holo.ring1.material.opacity = 0.9 * bl; holo.ring1.rotation.z = t * 0.6; holo.ring1.scale.setScalar(0.5 + 0.5 * bl);
  holo.ring2.material.opacity = 0.7 * bl; holo.ring2.rotation.z = -t * 0.9; holo.ring2.scale.setScalar(0.5 + 0.5 * bl);
  holo.beam.material.uniforms.strength.value = bl; holo.beam.material.uniforms.time.value = t;
  holo.pMat.opacity = 0.9 * bl;
  const arr = holo.points.geometry.attributes.position.array;
  for (let i = 0; i < holo.speed.length; i++) {
    arr[i * 3 + 2] += holo.speed[i] * dt;
    if (arr[i * 3 + 2] > CHAR_HEIGHT * 1.2) arr[i * 3 + 2] = 0;
  }
  holo.points.geometry.attributes.position.needsUpdate = true;

  // 掃描環跟著出現的位置往上跑
  const scanning = reveal > 0.01 && reveal < 0.99;
  holo.scanRing.position.z = reveal * CHAR_HEIGHT + holo.pivot.position.z;
  holo.scanRing.material.opacity = scanning ? 0.9 : 0;

  if (cameraInCard && cameraUpInCard) orient(cameraInCard, cameraUpInCard, dt);
}

// 角色永遠「面向鏡頭」、而且在手機畫面上是正的：
//   斜斜地看（名片平放在桌上）→ 角色站在名片上
//   從正上方看（名片在螢幕上、或正對著拍）→ 角色轉成面向你、照手機畫面的上方站正
//   中間的角度平順過渡，不會出現「只看到側面、人不見了」
const _d = new THREE.Vector3(), _up = new THREE.Vector3(), _right = new THREE.Vector3();
const _m = new THREE.Matrix4(), _q = new THREE.Quaternion(), _center = new THREE.Vector3(0, 0, CHAR_HEIGHT * 0.45);
function orient(cameraInCard, cameraUpInCard, dt) {
  _d.copy(cameraInCard).sub(_center).normalize();                         // 從角色看向鏡頭的方向
  const top = THREE.MathUtils.smoothstep(Math.abs(_d.z), 0.45, 0.9);       // 越接近正上方看，越照「畫面的上方」站
  _up.set(0, 0, 1).multiplyScalar(1 - top).addScaledVector(cameraUpInCard, top).normalize();
  _right.crossVectors(_up, _d);
  if (_right.lengthSq() < 1e-6) return;
  _right.normalize();
  _up.crossVectors(_d, _right).normalize();
  _m.makeBasis(_right, _up, _d);                                           // 圖片的正面朝向鏡頭
  _q.setFromRotationMatrix(_m);
  holo.stand.quaternion.slerp(_q, Math.min(1, dt * 6));                    // 慢慢轉過去（緩動），不會一下子跳
  // 從正上方看時：角色往下移、置中在名片上（不會超出畫面碰到按鈕），也稍微縮小一點
  topAmount += (top - topAmount) * Math.min(1, dt * 6);
  const standUp = new THREE.Vector3(0, 1, 0).applyQuaternion(holo.stand.quaternion);
  holo.stand.position.copy(standUp).multiplyScalar(-CHAR_HEIGHT * 0.5 * topAmount).addScaledVector(_d, 0.3 * topAmount);   // 也往鏡頭方向浮起來一點
  holo.stand.scale.setScalar(1 - 0.18 * topAmount);
}
let topAmount = 0;

// 鏡頭在名片座標裡的位置、和「手機畫面的上方」在名片座標裡的方向
function cameraInfo(camera) {
  const pos = camera.getWorldPosition(new THREE.Vector3());
  const upWorld = new THREE.Vector3(0, 1, 0).applyQuaternion(camera.getWorldQuaternion(new THREE.Quaternion()));
  const local = holo.root.worldToLocal(pos.clone());
  const upLocal = holo.root.worldToLocal(pos.clone().add(upWorld)).sub(local).normalize();
  return [local, upLocal];
}

// ---------------- 上方的按鈕 ----------------
const bar = document.getElementById('bar');
function buildBar() {
  const start = document.createElement('div'); start.className = 'chip';
  start.innerHTML = '<button aria-label="重新播放">START</button><label>重新投影</label>';
  start.querySelector('button').onclick = () => playIntro(current);
  bar.appendChild(start);
  CHARACTERS.forEach((ch, i) => {
    const chip = document.createElement('div'); chip.className = 'chip'; chip.dataset.index = i;
    const b = document.createElement('button');
    b.setAttribute('aria-label', ch.name);
    b.style.backgroundImage = `url(${ch.image})`;
    b.style.backgroundSize = '300% auto';          // 放大，只看到頭
    b.style.backgroundPosition = '50% 2%';
    b.onclick = () => switchTo(i);
    const l = document.createElement('label'); l.textContent = ch.name;
    chip.append(b, l); bar.appendChild(chip);
  });
  bar.classList.remove('hidden');
}
function setActiveChip(i) {
  bar.querySelectorAll('.chip').forEach(c => c.classList.toggle('active', Number(c.dataset.index) === i));
}

// ---------------- 預覽模式（不用相機） ----------------
async function startPreview() {
  const { OrbitControls } = await import('three/addons/controls/OrbitControls.js');
  document.getElementById('start').classList.add('hidden');
  document.getElementById('preview-tip').classList.remove('hidden');
  const container = document.getElementById('ar');
  const renderer = new THREE.WebGLRenderer({ antialias: true, preserveDrawingBuffer: true });
  renderer.setPixelRatio(Math.min(2, devicePixelRatio));
  renderer.setSize(innerWidth, innerHeight);
  container.appendChild(renderer.domElement);
  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0x0b0820);
  const camera = new THREE.PerspectiveCamera(50, innerWidth / innerHeight, 0.01, 50);
  camera.up.set(0, 0, 1);
  camera.position.set(0.2, -2.25, 1.45);
  if (params.has('top')) camera.position.set(0.05, -0.05, 2.6);       // 測試：從正上方看（像掃電腦螢幕上的名片）
  const controls = new OrbitControls(camera, renderer.domElement);
  controls.target.set(0, 0, 0.45); controls.enableDamping = true; controls.update();

  // 桌面上的名片
  const cardTex = new THREE.TextureLoader().load('assets/card_front.jpg'); cardTex.colorSpace = THREE.SRGBColorSpace;
  const card = new THREE.Mesh(new THREE.PlaneGeometry(1, CARD_ASPECT), new THREE.MeshBasicMaterial({ map: cardTex }));
  scene.add(card);
  const table = new THREE.Mesh(new THREE.PlaneGeometry(8, 8), new THREE.MeshBasicMaterial({ color: 0x14102e }));
  table.position.z = -0.01; scene.add(table);
  scene.add(holo.root);

  addEventListener('resize', () => { renderer.setSize(innerWidth, innerHeight); camera.aspect = innerWidth / innerHeight; camera.updateProjectionMatrix(); });
  buildBar();
  playIntro(0);
  let last = now();
  renderer.setAnimationLoop(() => {
    const t = now(), dt = Math.min(0.05, t - last); last = t;
    controls.update();
    const [camLocal, camUp] = cameraInfo(camera);
    update(t, dt, camLocal, camUp);
    renderer.render(scene, camera);
  });
}

// ---------------- AR 模式（相機＋辨識名片） ----------------
async function startAR() {
  const btn = document.getElementById('btnCamera');
  btn.disabled = true; btn.textContent = '啟動相機中…';
  try {
    const { MindARThree } = await import('./vendor/mindar/mindar-image-three.prod.js');
    const mindar = new MindARThree({
      container: document.getElementById('ar'),
      imageTargetSrc: './assets/card.mind',
      uiLoading: 'no', uiScanning: 'no', uiError: 'no',
      filterMinCF: 0.0001, filterBeta: 0.001,          // 穩定一點，不會抖
    });
    const { renderer, scene, camera } = mindar;
    const anchor = mindar.addAnchor(0);
    anchor.group.add(holo.root);
    const scan = document.getElementById('scan');
    let lostTimer = null;
    anchor.onTargetFound = () => {
      clearTimeout(lostTimer);
      scan.classList.add('hidden');
      if (phase === 'idle') playIntro(current);
    };
    anchor.onTargetLost = () => {
      lostTimer = setTimeout(() => { scan.classList.remove('hidden'); phase = 'idle'; baseLevel = 0; }, 600);
    };
    await mindar.start();
    document.getElementById('start').classList.add('hidden');
    scan.classList.remove('hidden');
    buildBar();
    setActiveChip(current);
    let last = now();
    renderer.setAnimationLoop(() => {
      const t = now(), dt = Math.min(0.05, t - last); last = t;
      const [camLocal, camUp] = cameraInfo(camera);
      update(t, dt, camLocal, camUp);
      renderer.render(scene, camera);
    });
  } catch (e) {
    console.error(e);
    btn.disabled = false; btn.textContent = '開啟相機，掃描名片';
    alert('相機打不開：請確認已允許使用相機，並用 Safari（iPhone）或 Chrome（Android）開啟。');
  }
}

document.getElementById('btnCamera').onclick = startAR;
if (PREVIEW) startPreview();
