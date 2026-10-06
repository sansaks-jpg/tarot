// Coordinates of the photographed table, independent of text/control heights.
export function roomLayout(width, height, header = 58, safeBottom = 0) {
  const wide = width / height >= 0.9;
  const compactWide = wide && height <= 580;
  const sceneHeight = wide ? height * 0.58 : height;
  const sceneWidth = sceneHeight * (wide ? 840 / 577 : 841 / 1870);
  const sceneLeft = ((compactWide ? width / 2 : width) - sceneWidth) / 2;
  const footer = (compactWide ? 16 : height <= 580 ? 132 : 170) + safeBottom;
  const top = Math.max(header + 8, height * (wide ? 0.55 : 850 / 1870));
  const bottom = Math.max(top + 64, Math.min(height - footer, height * 0.91));
  const tableWidth = wide ? Math.min((compactWide ? width / 2 : width) - 32, height * 1.12) : Math.min(width - 28, sceneWidth * 0.8);
  const tableHeight = Math.max(64, bottom - top);
  const cardWidth = Math.min(112, (tableWidth - 32) / 3, (tableHeight - 24) / 1.665);
  const pickWidth = Math.min(82, tableWidth / 4.55, height <= 580 ? (tableHeight - 22) / 1.9 : (tableHeight - 46) / 2.7);
  const slotWidth = Math.min(44, pickWidth * 0.62);
  return { wide, sceneHeight, sceneWidth, sceneLeft, tableTop: top, tableLeft: ((compactWide ? width / 2 : width) - tableWidth) / 2, tableWidth, tableHeight, cardWidth, pickWidth, slotWidth };
}
