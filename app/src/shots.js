// Fixed scenes for screenshots: ?shot=editor shows the page with sample photos;
// ?shot=cover shows the cover alone. `photo` picks the hero sample, `caption`
// the words, `size` the export size (square, portrait, wide).
// window.__shotReady is set once the cover has been painted.
export async function runShot(shot, query, api) {
  const { state, setPanelPhoto, redraw, SIZES } = api;
  if (shot === 'cover') document.body.classList.add('shot-cover');
  const size = query.get('size') || 'square';
  if (SIZES[size]) {
    state.size = size;
    const sel = document.getElementById('size');
    if (sel) sel.value = size;
  }
  const caption = query.get('caption');
  if (caption) {
    state.caption = caption;
    const input = document.getElementById('caption');
    if (input) input.value = caption;
  }
  const sub = query.get('subcaption');
  if (sub) {
    state.subcaption = sub;
    const input = document.getElementById('subcaption');
    if (input) input.value = sub;
  }
  const hero = query.get('photo') || 'pier';
  const second = query.get('photo2') || 'boulevard';
  await setPanelPhoto(0, hero);
  await setPanelPhoto(1, second);
  await setPanelPhoto(2, hero);
  redraw();
  requestAnimationFrame(() => requestAnimationFrame(() => { window.__shotReady = true; }));
}
