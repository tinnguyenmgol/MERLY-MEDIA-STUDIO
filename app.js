const canvas = document.querySelector("#canvas");
const ctx = canvas.getContext("2d");
const video = document.querySelector("#sourceVideo");
const videoInput = document.querySelector("#videoInput");
const audioInput = document.querySelector("#audioInput");
const audioMode = document.querySelector("#audioMode");
const originalVolume = document.querySelector("#originalVolume");
const customVolume = document.querySelector("#customVolume");
const overlayPreset = document.querySelector("#overlayPreset");
const templateInput = document.querySelector("#templateInput");
const exportTemplateBtn = document.querySelector("#exportTemplateBtn");
const sceneEditor = document.querySelector("#sceneEditor");
const prefixInput = document.querySelector("#prefixInput");
const footerInput = document.querySelector("#footerInput");
const captionInput = document.querySelector("#captionInput");
const qualityPreset = document.querySelector("#qualityPreset");
const brandColor = document.querySelector("#brandColor");
const accentColor = document.querySelector("#accentColor");
const recordBtn = document.querySelector("#recordBtn");
const previewBtn = document.querySelector("#previewBtn");
const queueCount = document.querySelector("#queueCount");
const results = document.querySelector("#results");
const authSummary = document.querySelector("#authSummary");

const W = canvas.width;
const H = canvas.height;

const defaultScenes = [
  { badge: 1, headline: "LIVE\nTỐI NAY", subline: "CÓ MẪU XINH QUÁ", sticker: "heart", top: 265 },
  { badge: 2, headline: "LOẠT MẪU MỚI\nVỪA VỀ", subline: "", sticker: "hearts", top: 250 },
  { badge: 3, headline: "FORM TÔN CHÂN", subline: "DỄ MANG - SANG", sticker: "spark", top: 285 },
  { badge: 4, headline: "CÓ CẢ SIZE\n35-43", subline: "", sticker: "megaphone", top: 255 },
  { badge: 5, headline: "CHỊ EM CHẦN\n40-43", subline: "NHỚ VÀO SỚM", sticker: "spark", top: 250 },
  { badge: 6, headline: "MẪU ĐẸP", subline: "THƯỜNG HẾT SIZE\nRẤT NHANH", sticker: "clock", top: 235 },
  { badge: 7, headline: "COMMENT\n\"LIVE\"", subline: "ĐỂ MERLY\nNHẮC LỊCH", sticker: "chat", top: 235 },
  { badge: 8, headline: "FOLLOW MERLY", subline: "ĐỂ VÀO LIVE\nSĂN DEAL NHA!", sticker: "person", top: 255 },
];

const overlayPresets = [
  {
    id: "tiktok-live",
    name: "TikTok live tối nay",
    prefix: "tiktok-live",
    brandColor: "#d54f83",
    accentColor: "#f5d75b",
    footer: "HẸN CẢ NHÀ TRONG LIVE TỐI NAY NHA!",
    scenes: defaultScenes,
  },
  {
    id: "fb-noon",
    name: "Facebook live 11h30",
    prefix: "fb-live-trua",
    brandColor: "#1877f2",
    accentColor: "#ffcf4a",
    footer: "11H30 TRƯA NAY LÊN LIVE SĂN DEAL CÙNG MERLY!",
    scenes: [
      { badge: 1, headline: "LIVE FB\n11H30", subline: "CẢ NHÀ NHỚ VÀO SỚM", sticker: "clock", top: 255 },
      { badge: 2, headline: "MẪU XINH\nLÊN SÓNG", subline: "FORM DỄ MANG", sticker: "spark", top: 250 },
      { badge: 3, headline: "GIÁ LIVE\nTỐT HƠN", subline: "CHỈ CÓ TRONG BUỔI TRƯA", sticker: "megaphone", top: 245 },
      { badge: 4, headline: "CHỐT NHANH\nKẺO HẾT", subline: "SIZE ĐẸP ĐI RẤT NHANH", sticker: "clock", top: 250 },
      { badge: 5, headline: "COMMENT\n\"TRƯA\"", subline: "ĐỂ MERLY NHẮC LỊCH", sticker: "chat", top: 250 },
      { badge: 6, headline: "FREESHIP\nĐƠN LIVE", subline: "SĂN ƯU ĐÃI LIỀN TAY", sticker: "spark", top: 250 },
      { badge: 7, headline: "11H30 VÀO\nFACEBOOK", subline: "MERLY CHỜ CẢ NHÀ", sticker: "heart", top: 250 },
      { badge: 8, headline: "FOLLOW PAGE", subline: "ĐỂ KHÔNG LỠ DEAL TRƯA", sticker: "person", top: 255 },
    ],
  },
  {
    id: "fb-night",
    name: "Facebook live 19h30",
    prefix: "fb-live-toi",
    brandColor: "#7c3aed",
    accentColor: "#f59e0b",
    footer: "19H30 TỐI NAY LIVE FACEBOOK - CẢ NHÀ NHỚ VÀO NHA!",
    scenes: [
      { badge: 1, headline: "LIVE FB\n19H30", subline: "DEAL XỊN CHỜ CẢ NHÀ", sticker: "heart", top: 255 },
      { badge: 2, headline: "TỐI NAY\nLÊN MẪU", subline: "NHIỀU FORM DỄ MANG", sticker: "spark", top: 250 },
      { badge: 3, headline: "SĂN DEAL\nBUỔI TỐI", subline: "GIÁ CHỈ CÓ TRONG LIVE", sticker: "megaphone", top: 250 },
      { badge: 4, headline: "SIZE ĐẸP\nCÓ SẴN", subline: "NHẮN MERLY GIỮ TRƯỚC", sticker: "chat", top: 250 },
      { badge: 5, headline: "COMMENT\n\"TỐI\"", subline: "ĐỂ NHẮC LỊCH LIVE", sticker: "clock", top: 250 },
      { badge: 6, headline: "MUA Ở LIVE", subline: "NHẬN ƯU ĐÃI TỐT HƠN", sticker: "spark", top: 250 },
      { badge: 7, headline: "19H30\nĐỪNG BỎ LỠ", subline: "VÀO PAGE MERLY NHA", sticker: "heart", top: 250 },
      { badge: 8, headline: "FOLLOW PAGE", subline: "ĐỂ CẬP NHẬT LỊCH LIVE", sticker: "person", top: 255 },
    ],
  },
  {
    id: "sale",
    name: "Chương trình sale",
    prefix: "sale-campaign",
    brandColor: "#e11d48",
    accentColor: "#fde047",
    footer: "SALE ĐANG CHẠY - NHẮN MERLY ĐỂ CHỐT DEAL NHA!",
    scenes: [
      { badge: 1, headline: "SALE\nHÔM NAY", subline: "GIÁ TỐT KHÓ BỎ LỠ", sticker: "megaphone", top: 255 },
      { badge: 2, headline: "DEAL SỐC\nĐANG CÓ", subline: "SỐ LƯỢNG CÓ HẠN", sticker: "spark", top: 250 },
      { badge: 3, headline: "MUA NHANH\nKẺO HẾT", subline: "SIZE ĐẸP ĐI RẤT NHANH", sticker: "clock", top: 250 },
      { badge: 4, headline: "GIẢM GIÁ\nCỰC XỊN", subline: "ÁP DỤNG TRONG LIVE", sticker: "heart", top: 250 },
      { badge: 5, headline: "CHỐT ĐƠN\nNGAY", subline: "INBOX MERLY GIỮ SIZE", sticker: "chat", top: 250 },
      { badge: 6, headline: "COMBO\nTIẾT KIỆM", subline: "MUA NHIỀU LỢI HƠN", sticker: "spark", top: 250 },
      { badge: 7, headline: "SALE CUỐI\nNGÀY", subline: "ĐỪNG ĐỂ LỠ DEAL", sticker: "clock", top: 250 },
      { badge: 8, headline: "FOLLOW MERLY", subline: "ĐỂ SĂN SALE MỖI NGÀY", sticker: "person", top: 255 },
    ],
  },
  {
    id: "new-arrivals",
    name: "Hàng mới về",
    prefix: "hang-moi-ve",
    brandColor: "#0f766e",
    accentColor: "#facc15",
    footer: "HÀNG MỚI VỪA VỀ - CẢ NHÀ VÀO XEM MẪU NHA!",
    scenes: [
      { badge: 1, headline: "HÀNG MỚI\nVỪA VỀ", subline: "MẪU XINH LÊN KỆ", sticker: "spark", top: 255 },
      { badge: 2, headline: "LOẠT MẪU\nMỚI TINH", subline: "FORM ĐẸP DỄ PHỐI", sticker: "hearts", top: 250 },
      { badge: 3, headline: "MẪU MỚI\nRẤT ÊM", subline: "ĐI LÀ THÍCH LIỀN", sticker: "heart", top: 250 },
      { badge: 4, headline: "CÓ NHIỀU\nSIZE", subline: "NHẮN MERLY CHECK NHA", sticker: "chat", top: 250 },
      { badge: 5, headline: "HÀNG VỀ\nKHÔNG NHIỀU", subline: "CHỌN SỚM CÒN SIZE ĐẸP", sticker: "clock", top: 250 },
      { badge: 6, headline: "FORM MỚI\nDỄ MANG", subline: "ĐI LÀ TÔN DÁNG", sticker: "spark", top: 250 },
      { badge: 7, headline: "MẪU HOT\nVỪA LÊN", subline: "AI THÍCH THÌ CHỐT SỚM", sticker: "megaphone", top: 250 },
      { badge: 8, headline: "FOLLOW MERLY", subline: "ĐỂ XEM HÀNG MỚI MỖI NGÀY", sticker: "person", top: 255 },
    ],
  },
  {
    id: "new-products-merly",
    name: "Sản phẩm mới + lợi ích Merly",
    prefix: "san-pham-moi-merly",
    brandColor: "#d54f83",
    accentColor: "#22c55e",
    footer: "SẢN PHẨM MỚI VỀ - FREESHIP ĐƠN 300K, ĐỔI HÀNG TẬN NHÀ!",
    scenes: [
      { badge: 1, headline: "SẢN PHẨM\nMỚI VỀ", subline: "MẪU XINH LÊN KỆ", sticker: "spark", top: 255 },
      { badge: 2, headline: "FORM ĐẸP\nDỄ MANG", subline: "ĐI LÀ TÔN DÁNG", sticker: "heart", top: 250 },
      { badge: 3, headline: "FREESHIP\nĐƠN 300K", subline: "CHỐT DEAL TIẾT KIỆM HƠN", sticker: "megaphone", top: 250 },
      { badge: 4, headline: "ĐỔI HÀNG\nTẬN NHÀ", subline: "MUA ONLINE YÊN TÂM", sticker: "chat", top: 250 },
      { badge: 5, headline: "CHECK SIZE\nNHANH", subline: "MERLY TƯ VẤN KỸ", sticker: "clock", top: 250 },
      { badge: 6, headline: "MẪU MỚI\nCÓ SẴN", subline: "CHỌN SỚM CÒN SIZE ĐẸP", sticker: "spark", top: 250 },
      { badge: 7, headline: "GIÁ TỐT\nTRONG LIVE", subline: "11H30 VÀ 19H30 MỖI NGÀY", sticker: "megaphone", top: 250 },
      { badge: 8, headline: "FOLLOW MERLY", subline: "ĐỂ XEM HÀNG MỚI MỖI NGÀY", sticker: "person", top: 255 },
    ],
  },
];

let scenes = structuredClone(defaultScenes);
let files = [];
let activeFileIndex = 0;
let recording = false;
let customAudioFile = null;
let customAudioUrl = "";
let audioContext = null;
let videoAudioSource = null;
let customAudioSource = null;
let customAudio = null;
let originalGain = null;
let customGain = null;
let audioDestination = null;

footerInput.value = "HẸN CẢ NHÀ TRONG LIVE TỐI NAY NHA!";

function populateOverlayPresets() {
  overlayPreset.innerHTML = "";
  for (const preset of overlayPresets) {
    const option = document.createElement("option");
    option.value = preset.id;
    option.textContent = preset.name;
    overlayPreset.append(option);
  }
}

function renderSceneEditor() {
  sceneEditor.innerHTML = "";
  scenes.forEach((scene, index) => {
    const card = document.createElement("section");
    card.className = "scene-card";
    card.innerHTML = `
      <h3>Frame ${index + 1}</h3>
      <label>Dòng lớn</label>
      <textarea data-index="${index}" data-field="headline">${scene.headline}</textarea>
      <label>Dòng phụ</label>
      <textarea data-index="${index}" data-field="subline">${scene.subline}</textarea>
      <div class="grid two">
        <div class="field">
          <label>Số badge</label>
          <input data-index="${index}" data-field="badge" type="number" min="1" max="99" value="${scene.badge}" />
        </div>
        <div class="field">
          <label>Sticker</label>
          <select data-index="${index}" data-field="sticker">
            ${["heart", "hearts", "spark", "megaphone", "clock", "chat", "person"].map((name) => `<option value="${name}" ${scene.sticker === name ? "selected" : ""}>${name}</option>`).join("")}
          </select>
        </div>
      </div>
    `;
    sceneEditor.append(card);
  });
}

function applyTemplate(template) {
  if (!Array.isArray(template.scenes) || template.scenes.length !== 8) {
    throw new Error("Template can co dung 8 scenes");
  }

  scenes = template.scenes.map((scene, index) => ({
    badge: Number(scene.badge || index + 1),
    headline: String(scene.headline || ""),
    subline: String(scene.subline || ""),
    sticker: String(scene.sticker || "spark"),
    top: Number(scene.top || defaultScenes[index].top),
  }));

  if (template.footer) footerInput.value = String(template.footer);
  if (template.brandColor) brandColor.value = String(template.brandColor);
  if (template.accentColor) accentColor.value = String(template.accentColor);
  if (template.prefix) prefixInput.value = String(template.prefix);
  renderSceneEditor();
  drawFrame();
}

function currentTemplateData() {
  return {
    name: "MERLY MEDIA STUDIO template",
    prefix: prefixInput.value.trim() || "live-teaser",
    brandColor: brandColor.value,
    accentColor: accentColor.value,
    footer: footerInput.value,
    scenes,
  };
}

function applyOverlayPreset(id) {
  const preset = overlayPresets.find((item) => item.id === id) || overlayPresets[0];
  applyTemplate(structuredClone(preset));
}

function currentScene() {
  const duration = Number.isFinite(video.duration) && video.duration > 0 ? video.duration : 8;
  const progress = Math.min(0.999, Math.max(0, video.currentTime / duration));
  const index = Math.floor(progress * scenes.length);
  return scenes[index] || scenes[0];
}

function fitText(text, maxWidth, initialSize, minSize = 34) {
  let size = initialSize;
  ctx.font = `900 ${size}px Arial, sans-serif`;
  while (ctx.measureText(text).width > maxWidth && size > minSize) {
    size -= 2;
    ctx.font = `900 ${size}px Arial, sans-serif`;
  }
  return size;
}

function roundedRect(x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

function drawVideoCover() {
  ctx.fillStyle = "#34404c";
  ctx.fillRect(0, 0, W, H);

  if (!video.videoWidth || !video.videoHeight) {
    ctx.fillStyle = "#556271";
    ctx.fillRect(0, 0, W, H);
    ctx.fillStyle = "#ffffff";
    ctx.font = "800 58px Arial, sans-serif";
    ctx.textAlign = "center";
    ctx.fillText("Chọn clip để xem trước", W / 2, H / 2);
    return;
  }

  const scale = Math.max(W / video.videoWidth, H / video.videoHeight);
  const sw = W / scale;
  const sh = H / scale;
  const sx = (video.videoWidth - sw) / 2;
  const sy = (video.videoHeight - sh) / 2;
  ctx.drawImage(video, sx, sy, sw, sh, 0, 0, W, H);
}

function drawBadge(scene) {
  ctx.save();
  ctx.fillStyle = "#ffd8e6";
  ctx.strokeStyle = "#ffffff";
  ctx.lineWidth = 5;
  ctx.beginPath();
  ctx.arc(86, 86, 46, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();
  ctx.fillStyle = "#9e3f67";
  ctx.font = "900 54px Arial, sans-serif";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText(scene.badge, 86, 90);
  ctx.restore();
}

function drawStrokeText(text, x, y, size, color) {
  ctx.save();
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.lineJoin = "round";
  ctx.font = `900 ${size}px Arial, sans-serif`;
  ctx.strokeStyle = "#ffffff";
  ctx.lineWidth = Math.max(10, size * 0.13);
  ctx.strokeText(text, x, y);
  ctx.fillStyle = color;
  ctx.fillText(text, x, y);
  ctx.restore();
}

function drawRibbon(text, x, y, width, height, color, darkText = false, rotate = 0) {
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(rotate);
  ctx.fillStyle = color;
  ctx.shadowColor = "rgba(0,0,0,0.28)";
  ctx.shadowBlur = 18;
  ctx.shadowOffsetY = 9;
  roundedRect(-width / 2, -height / 2, width, height, 8);
  ctx.fill();
  ctx.shadowColor = "transparent";
  ctx.fillStyle = darkText ? "#111111" : "#ffffff";
  const size = fitText(text, width - 56, 56, 28);
  ctx.font = `900 ${size}px Arial, sans-serif`;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText(text, 0, 3);
  ctx.restore();
}

function drawHeadline(scene) {
  const lines = scene.headline.split("\n").filter(Boolean).slice(0, 3);
  lines.forEach((line, index) => {
    const pinkLine = /LIVE|VỪA|35|40|MẪU|FOLLOW/.test(line);
    const size = fitText(line, 880, index === 0 ? 96 : 106, 46);
    drawStrokeText(line, W / 2, scene.top + index * 112, size, pinkLine ? brandColor.value : "#111111");
  });

  const subLines = scene.subline.split("\n").filter(Boolean).slice(0, 3);
  if (subLines.length === 1) {
    drawRibbon(subLines[0], W / 2, scene.top + lines.length * 112 + 28, 760, 90, brandColor.value, false, -0.035);
    return;
  }

  subLines.forEach((line, index) => {
    const useAccent = scene.badge === 6 && index === subLines.length - 1;
    const y = scene.top + lines.length * 104 + 42 + index * 96;
    drawRibbon(line, W / 2, y, 760, 82, useAccent ? accentColor.value : brandColor.value, useAccent, index % 2 ? -0.025 : 0.025);
  });
}

function drawSticker(scene) {
  ctx.save();
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.font = "110px Arial, sans-serif";
  if (scene.sticker === "heart") ctx.fillText("♡", 790, 330);
  if (scene.sticker === "hearts") ctx.fillText("♡ ♡", 790, 230);
  if (scene.sticker === "megaphone") ctx.fillText("📣", 790, 195);
  if (scene.sticker === "clock") ctx.fillText("⏰", 795, 610);
  if (scene.sticker === "chat") ctx.fillText("♡", 820, 610);
  if (scene.sticker === "person") ctx.fillText("●", 760, 610);
  if (scene.sticker === "spark") {
    ctx.fillStyle = accentColor.value;
    for (const [x, y] of [[850, 410], [890, 455], [805, 470]]) {
      ctx.beginPath();
      ctx.arc(x, y, 12, 0, Math.PI * 2);
      ctx.fill();
    }
  }
  ctx.restore();
}

function drawFooter() {
  ctx.fillStyle = brandColor.value;
  ctx.fillRect(0, H - 96, W, 96);
  ctx.fillStyle = "#ffffff";
  const text = footerInput.value.trim();
  const size = fitText(text, W - 80, 42, 24);
  ctx.font = `800 ${size}px Arial, sans-serif`;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText(text, W / 2, H - 48);
}

function drawFrame() {
  const scene = currentScene();
  drawVideoCover();
  ctx.fillStyle = "rgba(10, 18, 26, 0.18)";
  ctx.fillRect(0, 0, W, 540);
  drawBadge(scene);
  drawHeadline(scene);
  drawSticker(scene);
  drawFooter();
}

function tick() {
  drawFrame();
  requestAnimationFrame(tick);
}

function waitForVideoReady() {
  return new Promise((resolve, reject) => {
    video.onloadedmetadata = () => resolve();
    video.onerror = () => reject(new Error("Khong doc duoc video"));
  });
}

async function loadFile(file) {
  if (video.src) URL.revokeObjectURL(video.src);
  video.src = URL.createObjectURL(file);
  await waitForVideoReady();
}

function ensureAudioGraph() {
  if (!audioContext) {
    const AudioContextClass = window.AudioContext || window.webkitAudioContext;
    audioContext = new AudioContextClass();
    audioDestination = audioContext.createMediaStreamDestination();
    originalGain = audioContext.createGain();
    customGain = audioContext.createGain();
  }

  if (!videoAudioSource) {
    videoAudioSource = audioContext.createMediaElementSource(video);
    videoAudioSource.connect(originalGain);
    originalGain.connect(audioDestination);
  }

  if (!customAudio) {
    customAudio = new Audio();
    customAudio.crossOrigin = "anonymous";
    customAudio.loop = true;
    customAudioSource = audioContext.createMediaElementSource(customAudio);
    customAudioSource.connect(customGain);
    customGain.connect(audioDestination);
  }

  originalGain.gain.value = Number(originalVolume.value) / 100;
  customGain.gain.value = Number(customVolume.value) / 100;
}

async function prepareAudio(duration) {
  ensureAudioGraph();
  if (audioContext.state === "suspended") await audioContext.resume();

  const mode = audioMode.value;
  originalGain.gain.value = mode === "replace" || mode === "mute" ? 0 : Number(originalVolume.value) / 100;
  customGain.gain.value = mode === "original" || mode === "mute" || !customAudioFile ? 0 : Number(customVolume.value) / 100;

  if (customAudioFile && mode !== "original" && mode !== "mute") {
    if (customAudio.src !== customAudioUrl) customAudio.src = customAudioUrl;
    customAudio.currentTime = 0;
    customAudio.loop = customAudio.duration ? customAudio.duration < duration : true;
    await customAudio.play();
  } else if (customAudio) {
    customAudio.pause();
  }

  return mode === "mute" ? [] : audioDestination.stream.getAudioTracks();
}

function safeName(name) {
  return name.replace(/\.[^.]+$/, "").replace(/[^a-z0-9-_]+/gi, "-").replace(/-+/g, "-").replace(/^-|-$/g, "");
}

function addResult(file, blob, index) {
  results.hidden = false;
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  const base = prefixInput.value.trim() || "live-teaser";
  link.href = url;
  link.download = `${base}-${String(index + 1).padStart(3, "0")}-${safeName(file.name)}.webm`;
  link.className = "result-link";
  link.textContent = `Tải ${link.download}`;
  results.append(link);
}

function addServerResult(result) {
  results.hidden = false;
  const item = document.createElement("div");
  item.className = "result-item";

  const link = document.createElement("a");
  link.href = result.url;
  link.download = result.name;
  link.className = "result-link";
  link.textContent = `Tải ${result.name}`;

  const actions = document.createElement("div");
  actions.className = "publish-actions";
  const tiktokBtn = document.createElement("button");
  tiktokBtn.type = "button";
  tiktokBtn.textContent = "Đăng TikTok";
  tiktokBtn.addEventListener("click", () => publishVideo("tiktok", result.name, tiktokBtn));

  const facebookBtn = document.createElement("button");
  facebookBtn.type = "button";
  facebookBtn.textContent = "Đăng Facebook";
  facebookBtn.addEventListener("click", () => publishVideo("facebook", result.name, facebookBtn));

  const youtubeBtn = document.createElement("button");
  youtubeBtn.type = "button";
  youtubeBtn.textContent = "Đăng YouTube";
  youtubeBtn.addEventListener("click", () => publishVideo("youtube", result.name, youtubeBtn));

  actions.append(tiktokBtn, facebookBtn, youtubeBtn);
  item.append(link, actions);
  results.append(item);
}

async function publishVideo(platform, fileName, button) {
  const originalText = button.textContent;
  button.disabled = true;
  button.textContent = "Đang đăng...";
  try {
    const response = await fetch(`/api/publish/${platform}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        fileName,
        caption: captionInput.value.trim(),
      }),
    });
    const data = await readJsonResponse(response);
    if (!response.ok) throw new Error(data.error || "Đăng bài thất bại");
    button.textContent = "Đã gửi đăng";
  } catch (error) {
    alert(error.message);
    button.textContent = originalText;
    button.disabled = false;
  }
}

async function readJsonResponse(response) {
  const text = await response.text();
  try {
    return text ? JSON.parse(text) : {};
  } catch {
    const plain = text
      .replace(/<script[\s\S]*?<\/script>/gi, "")
      .replace(/<style[\s\S]*?<\/style>/gi, "")
      .replace(/<[^>]+>/g, " ")
      .replace(/\s+/g, " ")
      .trim();
    return {
      error: plain
        ? `Server trả về HTML thay vì JSON: ${plain.slice(0, 1000)}`
        : `Server trả về ${response.status} ${response.statusText}, không phải JSON. Kiểm tra Runtime logs hoặc redeploy app.`,
    };
  }
}

async function refreshAuthStatus() {
  try {
    const response = await fetch("/api/auth/status");
    const status = await readJsonResponse(response);
    const connected = [
      status.tiktok ? "TikTok" : "",
      status.facebook ? "Facebook" : "",
      status.youtube ? "YouTube" : "",
    ].filter(Boolean);
    authSummary.textContent = connected.length ? `Đã kết nối: ${connected.join(", ")}` : "Chưa kết nối";
  } catch {
    authSummary.textContent = "Không kiểm tra được";
  }
}

async function recordCurrentFile(file, index) {
  await loadFile(file);
  video.currentTime = 0;
  video.muted = false;
  await video.play();

  return new Promise((resolve, reject) => {
    const duration = Number.isFinite(video.duration) ? video.duration : 10;
    prepareAudio(duration).then((audioTracks) => {
      const canvasStream = canvas.captureStream(30);
      const stream = new MediaStream([
        ...canvasStream.getVideoTracks(),
        ...audioTracks,
      ]);
    const mimeType = [
      "video/webm;codecs=vp9",
      "video/webm;codecs=vp8",
      "video/webm",
    ].find((type) => MediaRecorder.isTypeSupported(type));
    const recorder = new MediaRecorder(stream, mimeType ? { mimeType } : undefined);
    const chunks = [];

    recorder.ondataavailable = (event) => {
      if (event.data.size) chunks.push(event.data);
    };
    recorder.onerror = () => reject(new Error(`Loi xuat clip ${file.name}`));
    recorder.onstop = () => {
      if (customAudio) customAudio.pause();
      const blob = new Blob(chunks, { type: "video/webm" });
      addResult(file, blob, index);
      resolve();
    };

    recorder.start();
    setTimeout(() => recorder.stop(), Math.max(1, duration) * 1000);
    }).catch(reject);
  });
}

async function exportBatch() {
  if (!files.length || recording) return;
  recording = true;
  recordBtn.disabled = true;
  previewBtn.disabled = true;
  results.innerHTML = "";
  results.hidden = false;
  queueCount.textContent = `Đang upload ${files.length} clip`;
  recordBtn.textContent = "Đang render MP4...";

  try {
    const form = new FormData();
    files.forEach((file) => form.append("videos", file));
    if (customAudioFile) form.append("audio", customAudioFile);
    form.append("template", JSON.stringify(currentTemplateData()));
    const qualitySettings = {
      compact: { outputWidth: 720, outputHeight: 1280, fps: 20, crf: 35, maxrate: "900k", bufsize: "1800k", audioBitrate: "80k", threads: 1 },
      balanced: { outputWidth: 720, outputHeight: 1280, fps: 30, crf: 27, maxrate: "2200k", bufsize: "4400k", audioBitrate: "96k", threads: 1 },
      sharp: { outputWidth: 1080, outputHeight: 1920, fps: 30, crf: 25, maxrate: "4500k", bufsize: "9000k", audioBitrate: "128k", threads: 1 },
    }[qualityPreset.value] || {};
    form.append("settings", JSON.stringify({
      prefix: prefixInput.value.trim() || "live-teaser",
      audioMode: audioMode.value,
      originalVolume: originalVolume.value,
      customVolume: customVolume.value,
      ...qualitySettings,
    }));

    const response = await fetch("/api/render", {
      method: "POST",
      body: form,
    });
    const data = await readJsonResponse(response);
    if (!response.ok) throw new Error(data.error || "Render MP4 thất bại");

    if (data.id && data.status !== "done") {
      await pollRenderJob(data.id);
    } else {
      for (const result of data.results || []) addServerResult(result);
      queueCount.textContent = `${(data.results || []).length} clip MP4 đã xong`;
    }
  } catch (error) {
    queueCount.textContent = "Render lỗi";
    results.textContent = error.message.length > 1200 ? `...${error.message.slice(-1200)}` : error.message;
  } finally {
    recordBtn.textContent = "Xuất hàng loạt MP4";
    recordBtn.disabled = false;
    previewBtn.disabled = false;
    recording = false;
  }
}

function wait(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function pollRenderJob(jobId) {
  let shownResults = 0;
  while (true) {
    await wait(2000);
    const response = await fetch(`/api/render/${encodeURIComponent(jobId)}`);
    const job = await readJsonResponse(response);
    if (!response.ok) throw new Error(job.error || "Không đọc được tiến độ render");

    queueCount.textContent = `Đang render ${job.done}/${job.total} clip`;
    const newResults = (job.results || []).slice(shownResults);
    for (const result of newResults) addServerResult(result);
    shownResults += newResults.length;

    if (job.status === "done") {
      queueCount.textContent = `${job.results.length} clip MP4 đã xong`;
      return;
    }
    if (job.status === "error") {
      throw new Error(job.error || "Render MP4 thất bại");
    }
  }
}

async function previewFirst() {
  if (!files.length) return;
  activeFileIndex = 0;
  await loadFile(files[0]);
  video.currentTime = 0;
  await video.play();
}

videoInput.addEventListener("change", async () => {
  files = [...(videoInput.files || [])];
  queueCount.textContent = `${files.length} clip`;
  recordBtn.disabled = files.length === 0;
  previewBtn.disabled = files.length === 0;
  results.hidden = true;
  results.innerHTML = "";
  if (files.length) await previewFirst();
});

audioInput.addEventListener("change", () => {
  customAudioFile = audioInput.files?.[0] || null;
  if (customAudioUrl) URL.revokeObjectURL(customAudioUrl);
  customAudioUrl = customAudioFile ? URL.createObjectURL(customAudioFile) : "";
  if (customAudio && customAudioUrl) customAudio.src = customAudioUrl;
  if (customAudioFile && audioMode.value === "original") audioMode.value = "mix";
});

templateInput.addEventListener("change", async () => {
  const file = templateInput.files?.[0];
  if (!file) return;
  try {
    const text = await file.text();
    applyTemplate(JSON.parse(text));
    overlayPreset.value = "";
  } catch (error) {
    alert(`Template không hợp lệ: ${error.message}`);
  }
});

overlayPreset.addEventListener("change", () => {
  applyOverlayPreset(overlayPreset.value);
});

sceneEditor.addEventListener("input", (event) => {
  const target = event.target;
  const index = Number(target.dataset.index);
  const field = target.dataset.field;
  if (!Number.isInteger(index) || !field || !scenes[index]) return;
  scenes[index][field] = field === "badge" ? Number(target.value) : target.value;
  drawFrame();
});

exportTemplateBtn.addEventListener("click", () => {
  const blob = new Blob([JSON.stringify(currentTemplateData(), null, 2)], { type: "application/json" });
  const link = document.createElement("a");
  link.href = URL.createObjectURL(blob);
  link.download = "live-teaser-template.json";
  link.click();
  URL.revokeObjectURL(link.href);
});

for (const input of [footerInput, brandColor, accentColor]) {
  input.addEventListener("input", drawFrame);
}

recordBtn.addEventListener("click", exportBatch);
previewBtn.addEventListener("click", previewFirst);

populateOverlayPresets();
applyOverlayPreset("tiktok-live");
refreshAuthStatus();
tick();
