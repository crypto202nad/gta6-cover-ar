// Vice City Cover — wires the editor: photos, panels, caption, sizes, export.
// A `?shot=` query sets up a fixed scene for a screenshot instead (shots.js).

import { drawCover } from './cover.js';
import { runShot } from './shots.js';

const SIZES = {
  square: { w: 1080, h: 1080, label: '1080 x 1080' },
  portrait: { w: 1080, h: 1350, label: '1080 x 1350' },
  wide: { w: 1920, h: 1080, label: '1920 x 1080' },
};

const canvas = document.getElementById('cover');
const captionInput = document.getElementById('caption');
const subInput = document.getElementById('subcaption');
const sizeSelect = document.getElementById('size');
const status = document.getElementById('status');
const panelList = document.getElementById('panels');

// One entry per panel: the image, zoom and pan. Starts on the two samples.
const state = {
  panels: [
    { img: null, zoom: 1.1, ox: 0, oy: 0, src: 'pier' },
    { img: null, zoom: 1.1, ox: 0, oy: 0, src: 'boulevard' },
    { img: null, zoom: 1.1, ox: 0, oy: 0, src: 'pier' },
  ],
  caption: 'Vice City Nights',
  subcaption: 'A Vice City Story',
  size: 'square',
};

const uploaded = {}; // slot -> { name, img }
let uploadCount = 0;

function redraw() {
  const size = SIZES[state.size];
  if (canvas.width !== size.w || canvas.height !== size.h) {
    canvas.width = size.w;
    canvas.height = size.h;
  }
  drawCover(canvas, {
    panels: state.panels,
    caption: state.caption,
    subcaption: state.subcaption,
  });
}

export function loadImage(url) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = url;
  });
}

async function setPanelPhoto(i, src) {
  const p = state.panels[i];
  p.src = src;
  if (src === 'pier' || src === 'boulevard') {
    p.img = await loadImage(`samples/${src}.jpg`);
  } else if (uploaded[src]) {
    p.img = uploaded[src].img;
  }
  redraw();
}

function buildPanelControls() {
  panelList.innerHTML = '';
  state.panels.forEach((p, i) => {
    const box = document.createElement('div');
    box.className = 'panel';
    const titles = ['Hero panel', 'Panel 2', 'Panel 3'];
    box.innerHTML = `
      <h3>${titles[i]}</h3>
      <label>Photo
        <select data-panel="${i}" class="photo">
          <option value="pier">Sample: Pier sunset</option>
          <option value="boulevard">Sample: Boulevard</option>
        </select>
      </label>
      <label>Zoom <input data-panel="${i}" class="zoom" type="range" min="1" max="2.5" step="0.05" value="${p.zoom}"></label>
      <p class="hint">Drag on the preview to move this panel's photo.</p>`;
    panelList.appendChild(box);
  });
  panelList.querySelectorAll('select.photo').forEach((sel) => {
    sel.value = state.panels[Number(sel.dataset.panel)].src;
    sel.addEventListener('change', (e) => setPanelPhoto(Number(e.target.dataset.panel), e.target.value));
  });
  panelList.querySelectorAll('input.zoom').forEach((inp) => {
    inp.addEventListener('input', (e) => {
      state.panels[Number(e.target.dataset.panel)].zoom = Number(e.target.value);
      redraw();
    });
  });
}

function refreshPhotoOptions() {
  panelList.querySelectorAll('select.photo').forEach((sel) => {
    const cur = sel.value;
    sel.querySelectorAll('option[data-upload]').forEach((o) => o.remove());
    Object.keys(uploaded).forEach((key) => {
      const o = document.createElement('option');
      o.value = key;
      o.textContent = `Uploaded: ${uploaded[key].name}`;
      o.dataset.upload = '1';
      sel.appendChild(o);
    });
    if (sel.querySelector(`option[value="${cur}"]`)) sel.value = cur;
  });
}

document.getElementById('photos').addEventListener('change', async (e) => {
  for (const file of e.target.files) {
    if (uploadCount >= 3) break;
    uploadCount += 1;
    const key = `upload${uploadCount}`;
    const img = await loadImage(URL.createObjectURL(file));
    uploaded[key] = { name: file.name, img };
  }
  refreshPhotoOptions();
  status.textContent = uploadCount ? `${uploadCount} photo(s) uploaded — pick one per panel.` : '';
});

captionInput.addEventListener('input', () => { state.caption = captionInput.value; redraw(); });
subInput.addEventListener('input', () => { state.subcaption = subInput.value; redraw(); });
sizeSelect.addEventListener('change', () => { state.size = sizeSelect.value; redraw(); });

document.getElementById('export').addEventListener('click', () => {
  const size = SIZES[state.size];
  canvas.toBlob((blob) => {
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `vice-city-cover-${size.w}x${size.h}.png`;
    a.click();
    status.textContent = `Saved vice-city-cover-${size.w}x${size.h}.png`;
  }, 'image/png');
});

// Drag on the preview pans the photo of the panel under the pointer.
let drag = null;
function panelAt(x, y) {
  const rect = canvas.getBoundingClientRect();
  const px = (x - rect.left) * (canvas.width / rect.width);
  const py = (y - rect.top) * (canvas.height / rect.height);
  const w = canvas.width;
  const h = canvas.height;
  if (w <= h) {
    const heroH = Math.round(h * 0.58);
    if (py < heroH) return 0;
    return px < w / 2 ? 1 : 2;
  }
  const heroW = Math.round(w * 0.62);
  if (px < heroW) return 0;
  return py < h / 2 ? 1 : 2;
}
canvas.addEventListener('pointerdown', (e) => {
  drag = { panel: panelAt(e.clientX, e.clientY), x: e.clientX, y: e.clientY };
  canvas.setPointerCapture(e.pointerId);
});
canvas.addEventListener('pointermove', (e) => {
  if (!drag) return;
  const rect = canvas.getBoundingClientRect();
  const p = state.panels[drag.panel];
  p.ox = Math.max(-1, Math.min(1, p.ox + ((e.clientX - drag.x) / rect.width) * 2));
  p.oy = Math.max(-1, Math.min(1, p.oy + ((e.clientY - drag.y) / rect.height) * 2));
  drag.x = e.clientX;
  drag.y = e.clientY;
  redraw();
});
canvas.addEventListener('pointerup', () => { drag = null; });

async function init() {
  for (let i = 0; i < 3; i++) await setPanelPhoto(i, state.panels[i].src);
  redraw();
}

// The panel controls are part of the editor in every mode, shots included.
buildPanelControls();

const query = new URLSearchParams(location.search);
const shot = query.get('shot');
if (shot) {
  runShot(shot, query, { state, setPanelPhoto, redraw, SIZES });
} else {
  init();
}
