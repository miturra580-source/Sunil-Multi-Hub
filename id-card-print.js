const { jsPDF } = window.jspdf;

const REF_W = 856;
const REF_H = 540;
const A4_W = 210;
const A4_H = 297;
const state = { front: null, back: null, active: 'front', drag: false, lastX: 0, lastY: 0, page: 0 };
const $ = id => document.getElementById(id);
const crop = $('cropCanvas');
const ctx = crop.getContext('2d');
const sheet = $('sheetCanvas');
const sctx = sheet.getContext('2d');
let timer;

function toast(message) {
  $('toast').textContent = message;
  $('toast').classList.add('show');
  clearTimeout(timer);
  timer = setTimeout(() => $('toast').classList.remove('show'), 2600);
}

function clamp(value, min, max, fallback) {
  const n = Number(value);
  return Number.isFinite(n) ? Math.min(max, Math.max(min, n)) : fallback;
}

function readImage(file) {
  return new Promise((resolve, reject) => {
    if (!file || !/^image\/(jpeg|png|webp)$/.test(file.type)) return reject(new Error('JPG, PNG या WEBP image चुनें'));
    if (file.size > 15 * 1024 * 1024) return reject(new Error('Image 15 MB से छोटी रखें'));
    const reader = new FileReader();
    reader.onload = () => {
      const img = new Image();
      img.onload = () => resolve(img);
      img.onerror = () => reject(new Error('Image नहीं खुली'));
      img.src = reader.result;
    };
    reader.onerror = () => reject(new Error('File read नहीं हुई'));
    reader.readAsDataURL(file);
  });
}

function fresh(img) {
  const cover = Math.max(REF_W / img.width, REF_H / img.height);
  return {
    img,
    scale: cover,
    base: cover,
    x: (REF_W - img.width * cover) / 2,
    y: (REF_H - img.height * cover) / 2,
    rotation: 0,
    filter: 'none',
    brightness: 100,
    contrast: 100,
    saturation: 100,
    invert: false,
    flipH: false,
    flipV: false
  };
}

async function load(side, file) {
  try {
    const img = await readImage(file);
    state[side] = fresh(img);
    $(side + 'Name').textContent = file.name;
    state.active = side;
    state.page = 0;
    setTab();
    syncControls();
    drawCrop();
    drawSheet();
    toast((side === 'front' ? 'Front' : 'Back') + ' image loaded');
  } catch (error) {
    toast(error.message || 'Image नहीं खुली');
  }
}

$('frontInput').onchange = e => load('front', e.target.files[0]);
$('backInput').onchange = e => load('back', e.target.files[0]);

document.querySelectorAll('.upload-box').forEach(box => {
  ['dragenter', 'dragover'].forEach(type => box.addEventListener(type, e => {
    e.preventDefault();
    box.classList.add('dragging');
  }));
  ['dragleave', 'drop'].forEach(type => box.addEventListener(type, e => {
    e.preventDefault();
    box.classList.remove('dragging');
  }));
  box.addEventListener('drop', e => {
    const file = e.dataTransfer.files && e.dataTransfer.files[0];
    if (file) load(box.dataset.drop, file);
  });
});

document.querySelectorAll('.side-tabs button').forEach(button => {
  button.onclick = () => {
    state.active = button.dataset.side;
    setTab();
    syncControls();
    drawCrop();
  };
});

function setTab() {
  document.querySelectorAll('.side-tabs button').forEach(button => button.classList.toggle('active', button.dataset.side === state.active));
}

function activeState() {
  return state[state.active];
}

function syncControls() {
  const s = activeState();
  const zoom = s ? s.scale / s.base : 1;
  $('zoom').value = zoom;
  $('zoomOut').value = Math.round(zoom * 100) + '%';
  ['brightness', 'contrast', 'saturation'].forEach(id => {
    const value = s ? s[id] : 100;
    $(id).value = value;
    $(id + 'Out').value = value + '%';
  });
  document.querySelectorAll('.filter-btn').forEach(button => button.classList.toggle('active', !!s && button.dataset.filter === s.filter));
  if (!s) document.querySelector('.filter-btn[data-filter="none"]').classList.add('active');
  $('invertBtn').classList.toggle('active', !!s && s.invert);
  $('flipHBtn').classList.toggle('active', !!s && s.flipH);
  $('flipVBtn').classList.toggle('active', !!s && s.flipV);
}

function filterCss(target) {
  if (!target) return 'none';
  const preset = target.filter === 'scan'
    ? 'grayscale(.22) contrast(1.28) brightness(1.06)'
    : target.filter === 'mono'
      ? 'grayscale(1) contrast(1.65) brightness(1.1)'
      : target.filter === 'color'
        ? 'contrast(1.15) saturate(1.18) brightness(1.03)'
        : '';
  return `${preset} brightness(${target.brightness / 100}) contrast(${target.contrast / 100}) saturate(${target.saturation / 100})${target.invert ? ' invert(1)' : ''}`.trim() || 'none';
}

function roundedPath(c, x, y, w, h, r) {
  const radius = Math.min(r, w / 2, h / 2);
  c.beginPath();
  c.moveTo(x + radius, y);
  c.arcTo(x + w, y, x + w, y + h, radius);
  c.arcTo(x + w, y + h, x, y + h, radius);
  c.arcTo(x, y + h, x, y, radius);
  c.arcTo(x, y, x + w, y, radius);
  c.closePath();
}

function renderState(c, target, outW = REF_W, outH = REF_H, roundedPx = 0) {
  c.save();
  c.clearRect(0, 0, outW, outH);
  if (roundedPx > 0) {
    roundedPath(c, 0, 0, outW, outH, roundedPx);
    c.clip();
  }
  c.fillStyle = '#fff';
  c.fillRect(0, 0, outW, outH);
  if (target) {
    const sx = outW / REF_W;
    const sy = outH / REF_H;
    const refW = target.img.width * target.scale;
    const refH = target.img.height * target.scale;
    const w = refW * sx;
    const h = refH * sy;
    const centerX = (target.x + refW / 2) * sx;
    const centerY = (target.y + refH / 2) * sy;
    c.filter = filterCss(target);
    c.translate(centerX, centerY);
    c.rotate(target.rotation * Math.PI / 180);
    c.scale(target.flipH ? -1 : 1, target.flipV ? -1 : 1);
    c.drawImage(target.img, -w / 2, -h / 2, w, h);
    c.filter = 'none';
  }
  c.restore();
}

function drawCrop() {
  const s = activeState();
  renderState(ctx, s, crop.width, crop.height, 0);
  $('emptyCrop').style.display = s ? 'none' : 'grid';
}

$('zoom').oninput = e => {
  const s = activeState();
  if (!s) return;
  const oldScale = s.scale;
  s.scale = s.base * Number(e.target.value);
  const ratio = s.scale / oldScale;
  s.x = REF_W / 2 - (REF_W / 2 - s.x) * ratio;
  s.y = REF_H / 2 - (REF_H / 2 - s.y) * ratio;
  $('zoomOut').value = Math.round(Number(e.target.value) * 100) + '%';
  drawCrop();
  drawSheet();
};

['brightness', 'contrast', 'saturation'].forEach(id => {
  $(id).oninput = e => {
    const s = activeState();
    if (!s) return;
    s[id] = Number(e.target.value);
    $(id + 'Out').value = e.target.value + '%';
    drawCrop();
    drawSheet();
  };
});

function rotate(delta) {
  const s = activeState();
  if (!s) return toast('पहले image चुनें');
  s.rotation = (s.rotation + delta + 360) % 360;
  drawCrop();
  drawSheet();
}

$('leftBtn').onclick = () => rotate(-90);
$('rightBtn').onclick = () => rotate(90);

$('flipHBtn').onclick = () => {
  const s = activeState();
  if (!s) return toast('पहले image चुनें');
  s.flipH = !s.flipH;
  syncControls();
  drawCrop();
  drawSheet();
};

$('flipVBtn').onclick = () => {
  const s = activeState();
  if (!s) return toast('पहले image चुनें');
  s.flipV = !s.flipV;
  syncControls();
  drawCrop();
  drawSheet();
};

document.querySelectorAll('.preset-btn').forEach(button => {
  button.onclick = () => {
    $('cardW').value = button.dataset.w;
    $('cardH').value = button.dataset.h;
    document.querySelectorAll('.preset-btn').forEach(x => x.classList.toggle('active', x === button));
    state.page = 0;
    drawSheet();
    toast(button.textContent + ' size लागू');
  };
});

document.querySelectorAll('.filter-btn').forEach(button => {
  button.onclick = () => {
    const s = activeState();
    if (!s) return toast('पहले ' + state.active + ' image चुनें');
    s.filter = button.dataset.filter;
    syncControls();
    drawCrop();
    drawSheet();
  };
});

$('autoEnhanceBtn').onclick = () => {
  const s = activeState();
  if (!s) return toast('पहले image चुनें');
  s.filter = 'scan';
  s.brightness = 104;
  s.contrast = 112;
  s.saturation = 104;
  s.invert = false;
  syncControls();
  drawCrop();
  drawSheet();
  toast('Auto Enhance लागू');
};

$('invertBtn').onclick = () => {
  const s = activeState();
  if (!s) return toast('पहले image चुनें');
  s.invert = !s.invert;
  syncControls();
  drawCrop();
  drawSheet();
};

$('centerBtn').onclick = () => {
  const s = activeState();
  if (!s) return toast('पहले image चुनें');
  const cover = Math.max(REF_W / s.img.width, REF_H / s.img.height);
  s.base = cover;
  s.scale = cover;
  s.x = (REF_W - s.img.width * cover) / 2;
  s.y = (REF_H - s.img.height * cover) / 2;
  syncControls();
  drawCrop();
  drawSheet();
  toast('Crop center किया गया');
};

$('resetBtn').onclick = () => {
  const s = activeState();
  if (!s) return;
  state[state.active] = fresh(s.img);
  syncControls();
  drawCrop();
  drawSheet();
  toast('Editor reset');
};

function point(e) {
  const rect = crop.getBoundingClientRect();
  const t = e.touches ? e.touches[0] : e;
  return {
    x: (t.clientX - rect.left) * crop.width / rect.width,
    y: (t.clientY - rect.top) * crop.height / rect.height
  };
}

function startDrag(e) {
  if (!activeState()) return;
  const p = point(e);
  state.drag = true;
  state.lastX = p.x;
  state.lastY = p.y;
  e.preventDefault();
}

function moveDrag(e) {
  if (!state.drag) return;
  const p = point(e);
  const s = activeState();
  s.x += p.x - state.lastX;
  s.y += p.y - state.lastY;
  state.lastX = p.x;
  state.lastY = p.y;
  drawCrop();
  e.preventDefault();
}

function endDrag() {
  if (state.drag) {
    state.drag = false;
    drawSheet();
  }
}

crop.addEventListener('mousedown', startDrag);
crop.addEventListener('mousemove', moveDrag);
window.addEventListener('mouseup', endDrag);
crop.addEventListener('touchstart', startDrag, { passive: false });
crop.addEventListener('touchmove', moveDrag, { passive: false });
window.addEventListener('touchend', endDrag);

$('bigScreenBtn').onclick = async () => {
  try {
    if (!document.fullscreenElement) await $('cropStage').requestFullscreen();
    else await document.exitFullscreen();
  } catch (_) {
    toast('Browser में fullscreen उपलब्ध नहीं है');
  }
};

function cardCanvas(target, width = 1012, height = 638, rounded = false) {
  if (!target) return null;
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  renderState(canvas.getContext('2d'), target, width, height, rounded ? Math.round(height * 0.065) : 0);
  return canvas;
}

function settings() {
  return {
    w: clamp($('cardW').value, 20, 190, 85.6),
    h: clamp($('cardH').value, 20, 277, 53.98),
    copies: clamp($('copies').value, 1, 100, 1),
    margin: clamp($('margin').value, 0, 40, 10),
    gapH: clamp($('gapH').value, 0, 30, 5),
    gapV: clamp($('gapV').value, 0, 30, 5),
    single: $('singleSide').checked,
    cropMarks: $('cropMarks').checked,
    thinBorder: $('thinBorder').checked,
    rounded: $('roundedCorners').checked
  };
}

function printItems() {
  const o = settings();
  const items = [];
  for (let i = 0; i < o.copies; i++) {
    if (state.front) items.push({ side: 'front', target: state.front });
    if (!o.single && state.back) items.push({ side: 'back', target: state.back });
  }
  return items;
}

function metrics(pageW = A4_W, pageH = A4_H) {
  const o = settings();
  const usableW = Math.max(o.w, pageW - o.margin * 2);
  const usableH = Math.max(o.h, pageH - o.margin * 2);
  const cols = Math.max(1, Math.floor((usableW + o.gapH) / (o.w + o.gapH)));
  const rows = Math.max(1, Math.floor((usableH + o.gapV) / (o.h + o.gapV)));
  return { ...o, cols, rows, capacity: Math.max(1, cols * rows) };
}

function pageCount() {
  const items = printItems();
  const { capacity } = metrics();
  return Math.max(1, Math.ceil(items.length / capacity));
}

function layoutPage(draw, pageIndex, pageW = A4_W, pageH = A4_H) {
  const items = printItems();
  const o = metrics(pageW, pageH);
  const start = pageIndex * o.capacity;
  const current = items.slice(start, start + o.capacity);
  current.forEach((item, i) => {
    const col = i % o.cols;
    const row = Math.floor(i / o.cols);
    const x = o.margin + col * (o.w + o.gapH);
    const y = o.margin + row * (o.h + o.gapV);
    draw(item, x, y, o.w, o.h, o);
  });
  return { totalItems: items.length, pageItems: current.length, pages: Math.max(1, Math.ceil(items.length / o.capacity)), options: o };
}

function drawCropMarksCanvas(c, x, y, w, h, pxPerMm) {
  const len = 3 * pxPerMm;
  const off = 1.5 * pxPerMm;
  c.beginPath();
  c.moveTo(x - off - len, y); c.lineTo(x - off, y);
  c.moveTo(x, y - off - len); c.lineTo(x, y - off);
  c.moveTo(x + w + off, y); c.lineTo(x + w + off + len, y);
  c.moveTo(x + w, y - off - len); c.lineTo(x + w, y - off);
  c.moveTo(x - off - len, y + h); c.lineTo(x - off, y + h);
  c.moveTo(x, y + h + off); c.lineTo(x, y + h + off + len);
  c.moveTo(x + w + off, y + h); c.lineTo(x + w + off + len, y + h);
  c.moveTo(x + w, y + h + off); c.lineTo(x + w, y + h + off + len);
  c.stroke();
}

function drawCardFrameCanvas(c, x, y, w, h, o, pxPerMm) {
  c.save();
  c.strokeStyle = '#303846';
  c.lineWidth = Math.max(1, 0.18 * pxPerMm);
  if (o.thinBorder) {
    if (o.rounded) {
      roundedPath(c, x, y, w, h, Math.min(w, h) * 0.06);
      c.stroke();
    } else c.strokeRect(x, y, w, h);
  }
  if (o.cropMarks) drawCropMarksCanvas(c, x, y, w, h, pxPerMm);
  c.restore();
}

function drawSheet() {
  const pages = pageCount();
  state.page = Math.min(Math.max(0, state.page), pages - 1);
  sctx.fillStyle = '#fff';
  sctx.fillRect(0, 0, sheet.width, sheet.height);
  const pxPerMm = sheet.width / A4_W;
  const cache = {};
  const info = layoutPage((item, x, y, w, h, o) => {
    if (!cache[item.side]) cache[item.side] = cardCanvas(item.target, REF_W, REF_H, o.rounded);
    sctx.drawImage(cache[item.side], x * pxPerMm, y * pxPerMm, w * pxPerMm, h * pxPerMm);
    drawCardFrameCanvas(sctx, x * pxPerMm, y * pxPerMm, w * pxPerMm, h * pxPerMm, o, pxPerMm);
  }, state.page);
  $('queueInfo').textContent = info.totalItems ? `${info.totalItems} card sides • ${info.pages} page${info.pages > 1 ? 's' : ''}` : 'No cards loaded';
  $('pageLabel').textContent = `Page ${state.page + 1} / ${pages}`;
  $('prevPage').disabled = state.page === 0;
  $('nextPage').disabled = state.page >= pages - 1;
}

['cardW', 'cardH', 'copies', 'margin', 'gapH', 'gapV', 'singleSide', 'cropMarks', 'thinBorder', 'roundedCorners'].forEach(id => {
  $(id).addEventListener('input', () => {
    state.page = 0;
    drawSheet();
  });
});

$('prevPage').onclick = () => {
  state.page = Math.max(0, state.page - 1);
  drawSheet();
};
$('nextPage').onclick = () => {
  state.page = Math.min(pageCount() - 1, state.page + 1);
  drawSheet();
};

function validate() {
  const o = settings();
  if (!state.front && !state.back) {
    toast('पहले Front या Back image चुनें');
    return false;
  }
  if (o.single && !state.front) {
    toast('Single Side Mode में Front image चुनें');
    return false;
  }
  return true;
}

function renderPageCanvas(pageIndex, dpi = 300) {
  const width = Math.round(A4_W * dpi / 25.4);
  const height = Math.round(A4_H * dpi / 25.4);
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const c = canvas.getContext('2d');
  const pxPerMm = width / A4_W;
  c.fillStyle = '#fff';
  c.fillRect(0, 0, width, height);
  const cache = {};
  layoutPage((item, x, y, w, h, o) => {
    const cw = Math.max(1, Math.round(w * pxPerMm));
    const ch = Math.max(1, Math.round(h * pxPerMm));
    const key = `${item.side}-${cw}x${ch}-${o.rounded}`;
    if (!cache[key]) cache[key] = cardCanvas(item.target, cw, ch, o.rounded);
    const px = x * pxPerMm;
    const py = y * pxPerMm;
    c.drawImage(cache[key], px, py, w * pxPerMm, h * pxPerMm);
    drawCardFrameCanvas(c, px, py, w * pxPerMm, h * pxPerMm, o, pxPerMm);
  }, pageIndex);
  return canvas;
}

function drawPdfMarks(pdf, x, y, w, h) {
  const len = 3;
  const off = 1.5;
  pdf.line(x - off - len, y, x - off, y);
  pdf.line(x, y - off - len, x, y - off);
  pdf.line(x + w + off, y, x + w + off + len, y);
  pdf.line(x + w, y - off - len, x + w, y - off);
  pdf.line(x - off - len, y + h, x - off, y + h);
  pdf.line(x, y + h + off, x, y + h + off + len);
  pdf.line(x + w + off, y + h, x + w + off + len, y + h);
  pdf.line(x + w, y + h + off, x + w, y + h + off + len);
}

function buildPdf() {
  const pdf = new jsPDF({ unit: 'mm', format: 'a4', compress: true });
  const pages = pageCount();
  const cache = {};
  for (let page = 0; page < pages; page++) {
    if (page > 0) pdf.addPage('a4', 'portrait');
    layoutPage((item, x, y, w, h, o) => {
      const key = `${item.side}-${o.rounded}`;
      if (!cache[key]) cache[key] = cardCanvas(item.target, 1012, 638, o.rounded).toDataURL('image/jpeg', 0.96);
      pdf.addImage(cache[key], 'JPEG', x, y, w, h, undefined, 'FAST');
      pdf.setDrawColor(48, 56, 70);
      pdf.setLineWidth(0.18);
      if (o.thinBorder) {
        if (o.rounded) pdf.roundedRect(x, y, w, h, Math.min(w, h) * 0.06, Math.min(w, h) * 0.06, 'S');
        else pdf.rect(x, y, w, h, 'S');
      }
      if (o.cropMarks) drawPdfMarks(pdf, x, y, w, h);
    }, page);
  }
  return pdf;
}

$('pdfBtn').onclick = () => {
  if (!validate()) return;
  const pdf = buildPdf();
  pdf.save('multi-hub-24-smart-id-print.pdf');
  toast(`${pageCount()} page PDF तैयार है`);
};

$('jpgBtn').onclick = () => {
  if (!validate()) return;
  const canvas = renderPageCanvas(state.page, 300);
  const link = document.createElement('a');
  link.href = canvas.toDataURL('image/jpeg', 0.96);
  link.download = `multi-hub-24-id-page-${state.page + 1}-300dpi.jpg`;
  link.click();
  toast(`Page ${state.page + 1} HD JPG तैयार है`);
};

$('printBtn').onclick = () => {
  if (!validate()) return;
  const pages = pageCount();
  const images = [];
  for (let i = 0; i < pages; i++) images.push(renderPageCanvas(i, 200).toDataURL('image/jpeg', 0.94));
  const w = window.open('', '_blank');
  if (!w) return toast('Popup allow करें');
  w.document.write(`<!doctype html><html><head><title>Smart ID Print</title><style>@page{size:A4;margin:0}html,body{margin:0;padding:0}.page{width:210mm;height:297mm;page-break-after:always}.page:last-child{page-break-after:auto}.page img{display:block;width:210mm;height:297mm}</style></head><body>${images.map(src => `<div class="page"><img src="${src}"></div>`).join('')}</body></html>`);
  w.document.close();
  w.onload = () => setTimeout(() => w.print(), 150);
};

$('clearBtn').onclick = () => {
  state.front = null;
  state.back = null;
  state.page = 0;
  $('frontInput').value = '';
  $('backInput').value = '';
  $('frontName').textContent = 'फोटो चुनें / Drop करें';
  $('backName').textContent = 'फोटो चुनें / Drop करें';
  state.active = 'front';
  setTab();
  syncControls();
  drawCrop();
  drawSheet();
  toast('Images clear हो गईं');
};

setTab();
syncControls();
drawCrop();
drawSheet();
