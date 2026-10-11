// Geometry of the Nizamo mark, drawn from docs/brand/logo-reference.jpg and tidied onto a grid.
// Shared by <Logo/> (React SVG) and the generated icon / social images, so there is ONE source.
//
// FULL mark (48px and up), viewBox 158 x 152, grid: thin bar 10, every gap 8.
//   three thin bars | diagonal "N" stroke cut by 8-unit gaps (terracotta + espresso) | solid pillar, two slots
//   One diagonal slope (29/24) runs through all four pieces, so the edges line up exactly.
// SIMPLE mark (16-32px, favicon), viewBox 32 x 32, whole numbers only so it stays crisp:
//   two bars | ONE terracotta diagonal band | pillar with one slot.

export const COLORS = { espresso: '#2C1810', terracotta: '#C4622D', cream: '#F5F0E8' }

export const FULL = {
  viewBox: '0 0 158 152',
  width: 158,
  height: 152,
  // 'e' = espresso (becomes cream in the reverse version), 't' = terracotta
  parts: [
    { c: 'e', d: 'M0 0h10v152H0zM18 0h10v152H18zM36 0h10v152H36z' }, // thin bars
    { c: 't', d: 'M54 0L74 24.17V66H54z' }, // diagonal, top
    { c: 'e', d: 'M82 33.83L102 58V66H82z' }, // diagonal, top-right wedge
    { c: 'e', d: 'M54 74h20v44.17L54 94z' }, // diagonal, lower-left
    { c: 't', d: 'M82 74h20v20H82z' }, // diagonal, middle square
    { c: 't', d: 'M82 102h20v50L82 127.83z' }, // diagonal, foot
  ],
  pillar: 'M110 0h48v152h-48z',
  slots: ['M120 32h10v62h-10z', 'M138 32h10v62h-10z'],
}

export const SIMPLE = {
  viewBox: '0 0 32 32',
  width: 32,
  height: 32,
  parts: [
    { c: 'e', d: 'M0 0h4v32H0zM7 0h4v32H7z' }, // two bars
    { c: 't', d: 'M14 0L21 8V32L14 24z' }, // one clean diagonal band
  ],
  pillar: 'M24 0h8v32h-8z',
  slots: ['M27 7h2v14h-2z'],
}

/** Which drawing to use for a mark drawn `px` pixels tall. */
export function markFor(px, simplified) {
  const useSimple = simplified ?? px < 48
  return useSimple ? SIMPLE : FULL
}
