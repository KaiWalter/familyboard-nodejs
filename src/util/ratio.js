export function applyGoldenRatio(containerWidth) {
  // photo panel is narrower; calendar wider at phi times photo
  const phi = 1.618;
  const photoWidth = Math.round(containerWidth / (phi + 1));
  const calendarWidth = Math.round(photoWidth * phi);
  return { photoWidth, calendarWidth };
}

export function withinTolerance(actual, expected, tolerancePercent = 5) {
  const diff = Math.abs(actual - expected);
  return (diff / expected) * 100 <= tolerancePercent;
}