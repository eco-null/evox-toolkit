// Tuş kartlarındaki çizgi ikonlar. 24x24 koordinatlı yollar Feather Icons'tan (MIT) uyarlandı;
// her ikon istenen merkeze ve boyuta ölçeklenip tek renkle çizilir.

const PATHS = Object.freeze({
  sun: ['M12 7a5 5 0 1 0 0 10a5 5 0 1 0 0-10z', 'M12 1v2', 'M12 21v2', 'M4.22 4.22l1.42 1.42', 'M18.36 18.36l1.42 1.42',
    'M1 12h2', 'M21 12h2', 'M4.22 19.78l1.42-1.42', 'M18.36 5.64l1.42-1.42'],
  moon: ['M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z'],
  cloud: ['M18 10h-1.26A8 8 0 1 0 9 20h9a5 5 0 0 0 0-10z'],
  rain: ['M16 13v8', 'M8 13v8', 'M12 15v8', 'M20 16.58A5 5 0 0 0 18 7h-1.26A8 8 0 1 0 4 15.25'],
  snow: ['M20 17.58A5 5 0 0 0 18 8h-1.26A8 8 0 1 0 4 16.25', 'M8 16h.01', 'M8 20h.01', 'M12 18h.01', 'M12 22h.01', 'M16 16h.01', 'M16 20h.01'],
  thunder: ['M19 16.9A5 5 0 0 0 18 7h-1.26a8 8 0 1 0-11.62 9', 'M13 11l-4 6h6l-4 6'],
  fog: ['M3 8h18', 'M5 12h14', 'M3 16h18', 'M7 20h10'],
  drop: ['M12 2.69l5.66 5.66a8 8 0 1 1-11.31 0z'],
  clipboard: ['M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2', 'M9 2h6a1 1 0 0 1 1 1v2a1 1 0 0 1-1 1H9a1 1 0 0 1-1-1V3a1 1 0 0 1 1-1z'],
  link: ['M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71', 'M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71'],
  type: ['M4 7V4h16v3', 'M9 20h6', 'M12 4v16'],
});

export const ICON_NAMES = Object.freeze(Object.keys(PATHS));

export function iconSvg(name, { cx, cy, size, color, strokeWidth = 2 }) {
  const paths = PATHS[name];
  if (!paths) return '';
  const scale = size / 24;
  const x = (cx - size / 2).toFixed(2);
  const y = (cy - size / 2).toFixed(2);
  return `<g transform="translate(${x} ${y}) scale(${scale.toFixed(4)})" fill="none" stroke="${color}"`
    + ` stroke-width="${strokeWidth}" stroke-linecap="round" stroke-linejoin="round">`
    + paths.map((d) => `<path d="${d}"/>`).join('') + '</g>';
}
