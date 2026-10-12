import type { Vec3T } from './math';

export const COSMIC_DURATION = 64;

export type CosmicStage = 'sky' | 'earth' | 'earth-moon' | 'solar' | 'milky-way' | 'galaxies' | 'universe';
export interface CosmicTransform {
  position: Vec3T;
  scale: number;
  opacity: number;
}
export interface CosmicFlightState {
  position: Vec3T;
  target: Vec3T;
  fov: number;
  campVisible: boolean;
  earth: CosmicTransform;
  moon: CosmicTransform;
  sun: CosmicTransform;
  solar: CosmicTransform;
  galaxy: CosmicTransform;
  galaxies: CosmicTransform;
  universe: CosmicTransform;
  stage: CosmicStage;
}

const cosmicClamp = (v: number) => Math.max(0, Math.min(1, v));
const cosmicMix = (a: number, b: number, u: number) => a + (b - a) * u;
/** Zero first/second derivatives at either end, including opacity and scale. */
function cosmicEase(t: number, start: number, end: number) {
  const u = cosmicClamp((t - start) / (end - start));
  return cosmicClamp(u * u * u * (u * (u * 6 - 15) + 10));
}
function cosmicVectorMix(a: Vec3T, b: Vec3T, u: number): Vec3T {
  return [cosmicMix(a[0], b[0], u), cosmicMix(a[1], b[1], u), cosmicMix(a[2], b[2], u)];
}
function cosmicOffset(origin: Vec3T, local: Vec3T, scale: number): Vec3T {
  return [origin[0] + local[0] * scale, origin[1] + local[1] * scale, origin[2] + local[2] * scale];
}

// Camera knots describe one flight, not a sequence of independently eased shots.
// Shared Hermite tangents retain velocity through every scale milestone.
const cosmicCameraKnots: ReadonlyArray<readonly [number, Vec3T]> = [
  [0, [-2, 2.6, 7]], [3, [-1, 9.5, 8.8]], [7, [0, 24, 12]],
  [11, [2.8, 22, 26]], [15, [5, 18, 37]], [23, [9, 29, 51]],
  [33, [15, 58, 65]], [43, [22, 81, 81]], [53, [29, 100, 103]],
  [64, [38, 126, 126]],
];
function cosmicCamera(t: number): Vec3T {
  let index = 0;
  while (index < cosmicCameraKnots.length - 2 && t > cosmicCameraKnots[index + 1]![0]) index++;
  const [start, a] = cosmicCameraKnots[index]!, [end, b] = cosmicCameraKnots[index + 1]!;
  const u = cosmicClamp((t - start) / (end - start)), u2 = u * u, u3 = u2 * u;
  const tangent = (i: number, axis: 0 | 1 | 2) => {
    const left = cosmicCameraKnots[Math.max(0, i - 1)]!, right = cosmicCameraKnots[Math.min(cosmicCameraKnots.length - 1, i + 1)]!;
    return (right[1][axis] - left[1][axis]) / (right[0] - left[0]);
  };
  return ([0, 1, 2] as const).map(axis => (2 * u3 - 3 * u2 + 1) * a[axis]
    + (u3 - 2 * u2 + u) * (end - start) * tangent(index, axis)
    + (-2 * u3 + 3 * u2) * b[axis]
    + (u3 - u2) * (end - start) * tangent(index + 1, axis)) as Vec3T;
}

/** A deterministic continuous change of display scale. Distances are compressed
 * for readability; these scene coordinates are not physical distances or a
 * claim that the observable universe has an exterior surface. All transforms
 * are world-space, even after one system shrinks into the next larger system.
 * Base radii: Earth 6, Moon 1.635, Sun 3; solar orbits 8..43; groups 24/28/28.
 * The solar group must leave its Earth slot empty: the original Earth occupies
 * angle .7 on radius 15, so the viewer follows the same planet throughout.
 */
export function cosmicFlight(time: number): CosmicFlightState {
  const t = Number.isFinite(time) ? Math.max(0, Math.min(COSMIC_DURATION, time)) : 0;
  const zero: Vec3T = [0, 0, 0];
  const universe: CosmicTransform = {
    position: [0, 0, 0], scale: cosmicMix(5, 3.2, cosmicEase(t, 53, 64)), opacity: cosmicEase(t, 51, 57.5),
  };
  const clusterMove = cosmicEase(t, 53, 62);
  const galaxies: CosmicTransform = {
    position: cosmicVectorMix(zero, cosmicOffset(universe.position, [-10, 3.2, 6], universe.scale), clusterMove),
    scale: cosmicMix(cosmicMix(3.5, 1.55, cosmicEase(t, 43, 53)), universe.scale * .055, cosmicEase(t, 53, 64)),
    opacity: cosmicEase(t, 41.5, 46),
  };
  const galaxy: CosmicTransform = {
    position: cosmicVectorMix(zero, cosmicOffset(galaxies.position, [-9, 2, 4], galaxies.scale), cosmicEase(t, 43, 51)),
    scale: cosmicMix(cosmicMix(3.4, 1.65, cosmicEase(t, 33, 43)), galaxies.scale * .065, cosmicEase(t, 43, 53)),
    opacity: cosmicEase(t, 31.5, 36),
  };
  // The solar neighbourhood is in the outer disk, away from the galactic core.
  const solar: CosmicTransform = {
    position: cosmicVectorMix(zero, cosmicOffset(galaxy.position, [Math.cos(.85) * 14.4, .15, Math.sin(.85) * 14.4], galaxy.scale), cosmicEase(t, 33, 41)),
    scale: cosmicMix(cosmicMix(1.65, .65, cosmicEase(t, 23, 33)), galaxy.scale * .009, cosmicEase(t, 33, 43)),
    // Planet sizes and orbit rings are exaggerated at this scale. Let that
    // teaching diagram dissolve before it dominates the galactic neighbourhood.
    opacity: cosmicEase(t, 23, 28) * (1 - cosmicEase(t, 33, 39)),
  };
  const earthSlot = cosmicOffset(solar.position, [Math.cos(.7) * 15, 0, Math.sin(.7) * 15], solar.scale);
  const earth: CosmicTransform = {
    position: cosmicVectorMix(zero, earthSlot, cosmicEase(t, 23, 30)),
    scale: cosmicMix(cosmicMix(1.8, 1.05, cosmicEase(t, 9, 23)), solar.scale * .08, cosmicEase(t, 23, 31)),
    opacity: cosmicEase(t, 7.4, 10.6) * (1 - cosmicEase(t, 33, 39)),
  };
  // A small continuous lunar arc makes its membership in the Earth system clear.
  const lunarAngle = .32 + .025 * (t - 13);
  const moon: CosmicTransform = {
    position: cosmicOffset(earth.position, [Math.cos(lunarAngle) * 24, 1.5, Math.sin(lunarAngle) * 24], earth.scale),
    scale: earth.scale,
    opacity: cosmicEase(t, 13, 17) * (1 - cosmicEase(t, 23, 27)),
  };
  const sun: CosmicTransform = { position: [...solar.position], scale: solar.scale, opacity: cosmicEase(t, 26.5, 30.5) };
  // First look upward until the camp has left the frame, then turn back smoothly
  // to reveal Earth. Neither look direction ever passes through the camera.
  const target: Vec3T = t < 7
    ? cosmicVectorMix([0, 5, -12], [0, 74, -28], cosmicEase(t, 0, 7))
    : cosmicVectorMix([0, 74, -28], zero, cosmicEase(t, 7, 11));
  const fov = 54 + 8 * cosmicEase(t, 0, 6) - 10 * cosmicEase(t, 7, 15)
    - 2 * cosmicEase(t, 15, 33) + 2 * cosmicEase(t, 43, 64);
  return {
    position: cosmicCamera(t), target, fov, campVisible: t < 7,
    earth, moon, sun, solar, galaxy, galaxies, universe,
    stage: t < 7 ? 'sky' : t < 15 ? 'earth' : t < 23 ? 'earth-moon' : t < 33 ? 'solar'
      : t < 43 ? 'milky-way' : t < 53 ? 'galaxies' : 'universe',
  };
}
