// Vice City Cover — draws a multi-panel GTA-style poster onto a canvas.
//
// The cover is three photo panels (one hero, two small) under a Vice City
// sunset/neon grade, with a big bold caption. Everything is drawn with the
// canvas 2D API so the editor preview and the exported PNG are the same
// picture. No Rockstar art, logo or font is used anywhere.

/** Panel geometry for a cover of size w x h. Returns [hero, smallA, smallB]. */
export function layoutPanels(w, h) {
  const gap = Math.max(4, Math.round(Math.min(w, h) * 0.008));
  if (w <= h) {
    // Portrait / square: hero across the top, two panels side by side below.
    const heroH = Math.round(h * 0.58);
    return [
      { x: 0, y: 0, w, h: heroH },
      { x: 0, y: heroH + gap, w: Math.floor((w - gap) / 2), h: h - heroH - gap },
      { x: Math.ceil((w + gap) / 2), y: heroH + gap, w: w - Math.ceil((w + gap) / 2), h: h - heroH - gap },
    ];
  }
  // Landscape: hero on the left, two panels stacked on the right.
  const heroW = Math.round(w * 0.62);
  return [
    { x: 0, y: 0, w: heroW, h },
    { x: heroW + gap, y: 0, w: w - heroW - gap, h: Math.floor((h - gap) / 2) },
    { x: heroW + gap, y: Math.ceil((h + gap) / 2), w: w - heroW - gap, h: h - Math.ceil((h + gap) / 2) },
  ];
}

/** Draws one photo into a panel rect, cover-fit, with zoom and pan. */
function drawPanelPhoto(ctx, img, rect, zoom, ox, oy) {
  const iw = img.naturalWidth;
  const ih = img.naturalHeight;
  const base = Math.max(rect.w / iw, rect.h / ih);
  const scale = base * zoom;
  const pw = iw * scale;
  const ph = ih * scale;
  // ox, oy are pan fractions of the panel (-1..1); 0 centres the photo.
  const dx = rect.x + (rect.w - pw) / 2 + ox * rect.w * 0.25;
  const dy = rect.y + (rect.h - ph) / 2 + oy * rect.h * 0.25;
  ctx.save();
  ctx.beginPath();
  ctx.rect(rect.x, rect.y, rect.w, rect.h);
  ctx.clip();
  // Vice City grade: warm, saturated, slightly contrasty.
  ctx.filter = 'saturate(1.4) contrast(1.14) brightness(1.06) hue-rotate(-8deg) sepia(0.18)';
  ctx.drawImage(img, dx, dy, pw, ph);
  ctx.filter = 'none';
  // Sunset wash: orange at the bottom fading up, magenta at the top edge.
  const wash = ctx.createLinearGradient(rect.x, rect.y, rect.x, rect.y + rect.h);
  wash.addColorStop(0, 'rgba(255, 60, 180, 0.10)');
  wash.addColorStop(0.55, 'rgba(255, 120, 60, 0.05)');
  wash.addColorStop(1, 'rgba(255, 90, 40, 0.28)');
  ctx.fillStyle = wash;
  ctx.fillRect(rect.x, rect.y, rect.w, rect.h);
  ctx.restore();
}

/** Neon gradient stroke around a panel rect. */
function neonBorder(ctx, rect, hue) {
  const g = ctx.createLinearGradient(rect.x, rect.y, rect.x + rect.w, rect.y + rect.h);
  g.addColorStop(0, hue === 0 ? '#22e6ff' : '#ff2fb3');
  g.addColorStop(1, hue === 0 ? '#ff2fb3' : '#ffb020');
  ctx.save();
  ctx.strokeStyle = g;
  ctx.lineWidth = Math.max(2, Math.round(Math.min(rect.w, rect.h) * 0.006));
  ctx.strokeRect(rect.x + 1, rect.y + 1, rect.w - 2, rect.h - 2);
  ctx.restore();
}

/** Fits a bold condensed font size so `text` spans at most `maxW`. */
function fitCaption(ctx, text, maxW, startSize) {
  let size = startSize;
  const family = '"Anton", "Arial Narrow", "Liberation Sans Narrow", Impact, sans-serif';
  ctx.font = `900 ${size}px ${family}`;
  while (size > 10 && ctx.measureText(text).width > maxW) {
    size -= 2;
    ctx.font = `900 ${size}px ${family}`;
  }
  return size;
}

/**
 * Draws the whole cover.
 * state: { panels: [{ img, zoom, ox, oy } x3], caption, subcaption }
 * The canvas's own width/height are the export size.
 */
export function drawCover(canvas, state) {
  const ctx = canvas.getContext('2d');
  const w = canvas.width;
  const h = canvas.height;
  const rects = layoutPanels(w, h);

  // Deep purple night base, visible in the gutters.
  ctx.fillStyle = '#160a24';
  ctx.fillRect(0, 0, w, h);

  for (let i = 0; i < 3; i++) {
    const p = state.panels[i];
    const r = rects[i];
    if (p && p.img) drawPanelPhoto(ctx, p.img, r, p.zoom ?? 1, p.ox ?? 0, p.oy ?? 0);
    else {
      ctx.fillStyle = '#241533';
      ctx.fillRect(r.x, r.y, r.w, r.h);
    }
    neonBorder(ctx, r, i);
  }

  // Whole-cover sunset wash + vignette, for one consistent grade.
  const wash = ctx.createLinearGradient(0, 0, 0, h);
  wash.addColorStop(0, 'rgba(255, 45, 150, 0.08)');
  wash.addColorStop(0.5, 'rgba(255, 110, 60, 0.04)');
  wash.addColorStop(1, 'rgba(255, 80, 30, 0.20)');
  ctx.fillStyle = wash;
  ctx.fillRect(0, 0, w, h);
  const vig = ctx.createRadialGradient(w / 2, h / 2, Math.min(w, h) * 0.35, w / 2, h / 2, Math.max(w, h) * 0.75);
  vig.addColorStop(0, 'rgba(0,0,0,0)');
  vig.addColorStop(1, 'rgba(10,0,20,0.45)');
  ctx.fillStyle = vig;
  ctx.fillRect(0, 0, w, h);

  // Caption: big bold condensed capitals, low on the cover, over a dark band.
  const caption = (state.caption || '').trim().toUpperCase();
  const sub = (state.subcaption || '').trim().toUpperCase();
  if (caption) {
    const bandH = h * 0.20;
    const bandY = h - bandH;
    const band = ctx.createLinearGradient(0, bandY, 0, h);
    band.addColorStop(0, 'rgba(12, 2, 24, 0)');
    band.addColorStop(1, 'rgba(12, 2, 24, 0.82)');
    ctx.fillStyle = band;
    ctx.fillRect(0, bandY, w, bandH);

    const size = fitCaption(ctx, caption, w * 0.92, Math.round(h * 0.11));
    ctx.textAlign = 'center';
    ctx.textBaseline = 'alphabetic';
    // Warm gradient fill + dark outline, the poster-lettering look.
    const fill = ctx.createLinearGradient(0, h - h * 0.10, 0, h - h * 0.01);
    fill.addColorStop(0, '#fff7e0');
    fill.addColorStop(0.55, '#ffd23e');
    fill.addColorStop(1, '#ff5e3a');
    ctx.lineJoin = 'round';
    ctx.strokeStyle = 'rgba(16, 2, 28, 0.9)';
    ctx.lineWidth = Math.max(3, size * 0.10);
    ctx.strokeText(caption, w / 2, h - h * 0.028);
    ctx.fillStyle = fill;
    ctx.fillText(caption, w / 2, h - h * 0.028);

    if (sub) {
      const subSize = Math.max(12, Math.round(size * 0.24));
      ctx.font = `700 ${subSize}px "Arial Narrow", "Liberation Sans Narrow", Impact, sans-serif`;
      ctx.fillStyle = '#7df9ff';
      ctx.strokeStyle = 'rgba(16, 2, 28, 0.85)';
      ctx.lineWidth = Math.max(2, subSize * 0.12);
      const subY = h - h * 0.028 - size * 1.05;
      ctx.strokeText(sub, w / 2, subY);
      ctx.fillText(sub, w / 2, subY);
    }
  }
}
