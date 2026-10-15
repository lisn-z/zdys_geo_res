/** Choose once at entry; resizing must not override a teacher's manual setting. */
export function initialDisplayQuality(width: number, height: number, touch: boolean): 'balanced' | 'high' {
    const shortSide = Math.min(width, height), longSide = Math.max(width, height);
    const compactViewport = width <= 1180 && shortSide <= 1024;
    const tablet = touch && shortSide <= 1366 && longSide <= 1600;
    return compactViewport || tablet ? 'balanced' : 'high';
}
