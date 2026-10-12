
/** Deterministic, renderer-independent helpers. Units for the orbit experiment are km and seconds. */
export type Vec3T = [
    number,
    number,
    number
];
export const clamp01 = (v: number) => Math.max(0, Math.min(1, v));
export const mix = (a: number, b: number, t: number) => a + (b - a) * t;
export const smooth = (t: number) => { const x = clamp01(t); return x * x * (3 - 2 * x); };
export const span = (t: number, a: number, b: number) => smooth((t - a) / Math.max(.001, b - a));
export function seeded(seed = 123456) { let s = seed >>> 0; return () => { s = (1664525 * s + 1013904223) >>> 0; return s / 4294967296; }; }
export function formatTime(t: number) { const n = Math.max(0, Math.floor(t)); return `${String(Math.floor(n / 60)).padStart(2, '0')}:${String(n % 60).padStart(2, '0')}`; }
export const EARTH_KM = 6371;
export const MU_EARTH = 398600.4418;
export const ORBIT_ALTITUDE = 400;
export const circularSpeed = (alt = ORBIT_ALTITUDE) => Math.sqrt(MU_EARTH / (EARTH_KM + alt));
export const escapeSpeed = (alt = ORBIT_ALTITUDE) => Math.SQRT2 * circularSpeed(alt);
export interface OrbitResult {
    points: Vec3T[];
    speeds: number[];
    times: number[];
    kind: 'impact' | 'bound' | 'escape';
    perigee: number;
    apogee: number;
    eccentricity: number;
    period: number;
    energy: number;
    maxRelativeEnergyError: number;
}
/** Tangential release in a spherical, airless two-body model. Impact means the
 * trajectory intersects the surface, not an arbitrary atmospheric altitude. */
export function solveOrbit(speed: number, altitude = ORBIT_ALTITUDE, dt = 3, samples = 2400): OrbitResult {
    if (!Number.isFinite(speed) || speed < 0 || !Number.isFinite(altitude) || altitude < 0 || !Number.isFinite(dt) || dt <= 0 || !Number.isFinite(samples) || samples < 2)
        throw new RangeError('轨道参数无效');
    const r0 = EARTH_KM + altitude;
    const rawEnergy = .5 * speed * speed - MU_EARTH / r0;
    const energy = Math.abs(rawEnergy) < MU_EARTH / r0 * 1e-12 ? 0 : rawEnergy;
    const h = r0 * speed;
    const eccentricity = Math.abs(r0 * speed * speed / MU_EARTH - 1);
    const p = h * h / MU_EARTH;
    const perigee = (p / (1 + eccentricity)) - EARTH_KM;
    const a = energy < 0 ? -MU_EARTH / (2 * energy) : Infinity;
    const apogee = energy < 0 ? a * (1 + eccentricity) - EARTH_KM : Infinity;
    const period = Number.isFinite(a) ? 2 * Math.PI * Math.sqrt(a * a * a / MU_EARTH) : Infinity;
    const kind = perigee <= 0 ? 'impact' : energy < 0 ? 'bound' : 'escape';
    const duration = Math.min(18000, Number.isFinite(period) ? period : 16000);
    const maxSteps = Math.min(16000, Math.ceil(duration / Math.min(dt, duration / samples)));
    const step = duration / maxSteps;
    let x = 0, y = r0, vx = speed, vy = 0, ax = 0, ay = -MU_EARTH / (r0 * r0), err = 0;
    const points: Vec3T[] = [], speeds: number[] = [], times: number[] = [];
    for (let i = 0; i <= maxSteps; i++) {
        const r = Math.hypot(x, y);
        points.push([x, y, 0]);
        speeds.push(Math.hypot(vx, vy));
        times.push(i * step);
        // Use the characteristic orbital energy near the parabolic limit;
        // dividing by zero binding energy gives a meaningless error estimate.
        err = Math.max(err, Math.abs((.5 * (vx * vx + vy * vy) - MU_EARTH / r - energy) / Math.max(Math.abs(energy), MU_EARTH / r0)));
        if (r <= EARTH_KM || r > 6 * r0 || i === maxSteps)
            break;
        const nx = x + vx * step + .5 * ax * step * step;
        const ny = y + vy * step + .5 * ay * step * step;
        const nr = Math.hypot(nx, ny);
        if (nr <= EARTH_KM) {
            const dx = nx - x, dy = ny - y;
            const qa = dx * dx + dy * dy, qb = 2 * (x * dx + y * dy), qc = r * r - EARTH_KM * EARTH_KM;
            const fraction = clamp01((-qb - Math.sqrt(Math.max(0, qb * qb - 4 * qa * qc))) / (2 * qa));
            points.push([x + dx * fraction, y + dy * fraction, 0]);
            speeds.push(Math.sqrt(Math.max(0, 2 * (energy + MU_EARTH / EARTH_KM))));
            times.push((i + fraction) * step);
            break;
        }
        const nax = -MU_EARTH * nx / (nr ** 3), nay = -MU_EARTH * ny / (nr ** 3);
        vx += .5 * (ax + nax) * step;
        vy += .5 * (ay + nay) * step;
        x = nx;
        y = ny;
        ax = nax;
        ay = nay;
    }
    return { points, speeds, times, kind, perigee, apogee, eccentricity, period, energy, maxRelativeEnergyError: err };
}
export interface LandingState {
    height: number;
    velocity: number;
    fuel: number;
    elapsed: number;
    status: 'flying' | 'landed' | 'crashed';
}
export const newLanding = (): LandingState => ({ height: 32, velocity: -3.2, fuel: 100, elapsed: 0, status: 'flying' });
/** 1D lunar landing teaching model, fixed 1/120 s integration in the player. Positive velocity is upward. */
export function stepLanding(s: LandingState, dt: number, thrust: boolean, assist = true): LandingState {
    if (s.status !== 'flying')
        return s;
    const gravity = 1.62;
    // Assisted baseline burn reduces workload, while the student's hold input still changes the result.
    const desired = -Math.min(3.2, Math.max(.45, s.height * .13));
    const base = assist ? Math.max(0, Math.min(2.7, gravity + (desired - s.velocity) * .65)) : 0;
    const accel = s.fuel > 0 ? base + (thrust ? 1.45 : 0) : 0;
    let v = s.velocity + (accel - gravity) * dt;
    v = Math.min(v, 2.2);
    const height = Math.max(0, s.height + v * dt);
    return { height, velocity: v, fuel: Math.max(0, s.fuel - accel * .64 * dt), elapsed: s.elapsed + dt,
        status: height <= 0 ? (Math.abs(v) <= 2 ? 'landed' : 'crashed') : 'flying' };
}
/** Segment vs sphere visibility, used for the Queqiao demonstration. */
export function segmentClear(a: Vec3T, b: Vec3T, c: Vec3T, r: number) {
    const d: Vec3T = [b[0] - a[0], b[1] - a[1], b[2] - a[2]];
    const q: Vec3T = [a[0] - c[0], a[1] - c[1], a[2] - c[2]];
    const l2 = d.reduce((s, v) => s + v * v, 0);
    const u = Math.max(0, Math.min(1, -(q[0] * d[0] + q[1] * d[1] + q[2] * d[2]) / Math.max(1e-9, l2)));
    return Math.hypot(q[0] + u * d[0], q[1] + u * d[1], q[2] + u * d[2]) >= r - 1e-5;
}
