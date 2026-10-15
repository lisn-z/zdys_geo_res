/** v3: deterministic stage/contact logic. All times are chapter-local story seconds. */
import { clamp01, mix, span, type Vec3T } from './math';

export const APOLLO_ASTRONAUT_SCALE = .70;
export const FIRST_STEP_TIME = 67.2;
export const FIRST_STEP_POSITION: Vec3T = [-.18 * APOLLO_ASTRONAUT_SCALE, 0, 3.45];
export const APOLLO_CONTACTS = [
  { time: FIRST_STEP_TIME, x: -.18 * APOLLO_ASTRONAUT_SCALE, z: 3.45, foot: 0 },
  { time: 68.95, x: .18 * APOLLO_ASTRONAUT_SCALE, z: 3.85, foot: 1 },
  { time: 70.25, x: -.18 * APOLLO_ASTRONAUT_SCALE, z: 4.26, foot: 0 },
  { time: 71.60, x: .18 * APOLLO_ASTRONAUT_SCALE, z: 4.67, foot: 1 },
  { time: 73.00, x: -.18 * APOLLO_ASTRONAUT_SCALE, z: 5.08, foot: 0 },
] as const;
export function apolloStage(t: number) {
  return t < 62 ? 'descent' : t < 63.2 ? 'settled' : t < 65.8 ? 'ladder' :
    t < 66.45 ? 'turn' : t < FIRST_STEP_TIME ? 'first-step' : t < 69.5 ? 'imprint' : 'walk';
}
/** A mark is only present after the matching sole has touched down; seeking is reversible. */
export function visibleApolloContacts(t: number) { return APOLLO_CONTACTS.filter(c => t >= c.time); }
export function apolloFeet(t: number): [Vec3T, Vec3T] {
  const out: [Vec3T, Vec3T] = [[-.18 * APOLLO_ASTRONAUT_SCALE, .16, 2.73], [.18 * APOLLO_ASTRONAUT_SCALE, .16, 2.73]];
  // During each swing the previous contact is fixed, and the moving boot follows a shallow arc.
  for (let foot = 0; foot < 2; foot++) {
    let z = 2.73, y = .16;
    for (const c of APOLLO_CONTACTS) {
      if (c.foot !== foot) continue;
      const begin = c.time === FIRST_STEP_TIME ? 66.45 : c.time - 0.85;
      if (t >= c.time) { z = c.z; y = 0; out[foot][2] = z; out[foot][1] = 0; continue; }
      if (t >= begin) {
        const u = clamp01((t - begin) / (c.time - begin));
        out[foot][2] = mix(z, c.z, u * u * (3 - 2 * u));
        out[foot][1] = mix(y, 0, u * u * (3 - 2 * u)) + Math.sin(u * Math.PI) * .15 * APOLLO_ASTRONAUT_SCALE;
      }
      break;
    }
  }
  return out;
}

/** Pose shared with the rendered rig: lower the pelvis when a wide step would exceed leg reach. */
export function apolloRigPose(t: number) {
  const feet = apolloFeet(t);
  // Contacts stay in lunar world units; every skeletal length follows the rendered scale.
  const s = APOLLO_ASTRONAUT_SCALE;
  const upper = .4*s, lower = .38*s, hipY = .88*s, soleOffset = .1005*s, soleForward = .055*s;
  const rootZ = (feet[0][2] + feet[1][2]) * .5 - soleForward;
  const reach = upper + lower - .004*s;
  let rootY = (feet[0][1] + feet[1][1]) * .5 - .035*s;
  for (const foot of feet) {
    const dz = foot[2] - soleForward - rootZ;
    const maxDown = Math.sqrt(Math.max(.001, reach * reach - dz * dz));
    rootY = Math.min(rootY, foot[1] + soleOffset - hipY + maxDown);
  }
  const legs = feet.map(foot => {
    const z = foot[2] - soleForward - rootZ;
    const down = hipY - (foot[1] + soleOffset - rootY);
    const d = Math.max(.001, Math.hypot(z, down));
    const alpha = Math.acos(Math.max(-1, Math.min(1, (upper*upper+d*d-lower*lower)/(2*upper*d))));
    const hip = -(Math.atan2(z, down) + alpha);
    const knee = Math.PI - Math.acos(Math.max(-1, Math.min(1, (upper*upper+lower*lower-d*d)/(2*upper*lower))));
    return { hip, knee, ankle: -hip-knee };
  });
  return { feet, rootY, rootZ, legs, upper, lower, hipY, soleOffset, soleForward };
}

export const DELIVERY = {
  deckY: 1.55, rampStartZ: 1.38, rampEndZ: 4.35, rampEndY: .025,
  roverScale: .68, wheelRadius: .345, wheelCenterY: .35,
};
export type RoverMission = 'change' | 'zhurong';
export function deliveryState(kind: RoverMission, t: number) {
  const lunar = kind === 'change';
  const touchdown = lunar ? 34 : 20;
  const rampStart = touchdown + .6, rampEnd = lunar ? 36 : 23;
  const depart = lunar ? 36.5 : 24, offRamp = lunar ? 42.4 : 33;
  return {
    touchdown, landed: t >= touchdown,
    clearance: (lunar ? 5 : 10) * (1 - span(t, lunar ? 29 : 8, touchdown)),
    ramp: span(t, rampStart, rampEnd),
    departure: span(t, depart, offRamp),
    travel: span(t, offRamp, lunar ? 45 : 44),
    // Solar blankets stay folded while passing the lander's equipment and solar wings.
    wings: span(t, offRamp + .25, lunar ? 44.7 : 36),
    engine: t < touchdown,
  };
}
export function rampSurface(z: number): number {
  if (z <= DELIVERY.rampStartZ) return DELIVERY.deckY;
  if (z >= DELIVERY.rampEndZ) return DELIVERY.rampEndY;
  return mix(DELIVERY.deckY, DELIVERY.rampEndY,
    (z - DELIVERY.rampStartZ) / (DELIVERY.rampEndZ - DELIVERY.rampStartZ));
}
export function roverDeliveryPose(kind: RoverMission, t: number, target = 1) {
  const state = deliveryState(kind, t);
  const z = mix(.15, 5.1, state.departure) + state.travel * 3.25;
  const x = (target - 1) * 1.8 * state.travel;
  const axle = .75 * DELIVERY.roverScale;
  const contact = (zz: number) => zz <= DELIVERY.rampEndZ ? rampSurface(zz) : .0;
  let pitch = 0;
  let front = contact(z + axle), rear = contact(z - axle);
  // Fixed, deterministic iterations keep pitch consistent with projected axle separation.
  for (let i = 0; i < 3; i++) {
    pitch = Math.atan2(rear - front, 2 * axle);
    front = contact(z + axle * Math.cos(pitch));
    rear = contact(z - axle * Math.cos(pitch));
  }
  const clearance = (DELIVERY.wheelCenterY * Math.cos(pitch) - DELIVERY.wheelRadius) * DELIVERY.roverScale;
  return { ...state, x, z, y: (front + rear) * .5 - clearance, pitch,
    yaw: state.travel > 0 ? Math.atan2((target - 1) * 1.8, 3.25) * state.travel : 0 };
}

/** Latitude rings x twelve meridians = 72 independent panels (not a grid painted on a sphere). */
export function dfhPanelVertices(radius = 1.25): Vec3T[][] {
  const latitudes = [90, 60, 30, 0, -30, -60, -90].map(d => d * Math.PI / 180);
  const point = (lat: number, lon: number): Vec3T => [radius * Math.cos(lat) * Math.cos(lon), radius * Math.sin(lat), radius * Math.cos(lat) * Math.sin(lon)];
  const panels: Vec3T[][] = [];
  for (let row = 0; row < 6; row++) for (let j = 0; j < 12; j++) {
    const a = j / 12 * Math.PI * 2, b = (j + 1) / 12 * Math.PI * 2;
    const corners: [Vec3T, Vec3T, Vec3T, Vec3T] = [point(latitudes[row]!, a), point(latitudes[row + 1]!, a), point(latitudes[row + 1]!, b), point(latitudes[row]!, b)];
    let v: Vec3T[] = corners;
    if (row === 0) v = [corners[0], corners[1], corners[2]];
    if (row === 5) v = [corners[0], corners[1], corners[3]];
    panels.push(v);
  }
  return panels;
}

const LAUNCH_IGNITIONS: Readonly<Record<string, number>> = {
  saturn: 10, cz1: 7, vostok: 7, generic: 17, cz2f: 2.5, v2: .5,
};
const LAUNCH_HOLD_SECONDS = 1;
export interface LaunchTrajectory {
  height: number;
  x: number;
  turn: number;
}
export interface LaunchState extends LaunchTrajectory {
  ignition: number;
  elapsed: number;
  lit: boolean;
  power: number;
  liftTime: number;
  followX: number;
  followY: number;
  padPower: number;
}

/** Position relative to the launch mount, in illustrative scene units.
 * elapsed is time since IGNITION, including the hold-down period. Smoke must use
 * this same function at each puff's birth time, not integrate a second trajectory.
 */
export function launchTrajectory(kind: string, elapsed: number): LaunchTrajectory {
  const time = Number.isFinite(elapsed) ? Math.max(0, elapsed) : 0;
  const liftTime = Math.max(0, time - LAUNCH_HOLD_SECONDS);
  // Integral of a smooth velocity ramp: zero velocity/acceleration at release.
  const rampDuration = .8, u = Math.min(1, liftTime / rampDuration);
  const rampedTime = liftTime < rampDuration
    ? rampDuration * (u * u * u - .5 * u * u * u * u)
    : liftTime - rampDuration / 2;
  // Recover the brief ignition delay within five seconds of release, preserving
  // the exit altitude and framing of even the short historical launch chapters.
  const flightClock = rampedTime + (LAUNCH_HOLD_SECONDS + rampDuration / 2) * span(liftTime, 0, 5);
  const height = (kind === 'generic' ? .22 : .56) * flightClock * flightClock;
  const turn = kind === 'generic' ? span(time, 12, 24) * .23 : span(time, 9, 20) * .08;
  return { height, x: height * turn * .5, turn };
}

/** Pure chapter-clock launch state: seeking, pausing and replaying are identical.
 * height/followY exclude the launch mount's world-space base height.
 * padPower is the CURRENT ground impingement, not opacity for older smoke.
 */
export function launchState(kind: string, local: number, armed = true): LaunchState {
  const ignition = LAUNCH_IGNITIONS[kind] ?? .5;
  const time = Number.isFinite(local) ? local : 0;
  const lit = (kind !== 'generic' || armed) && time >= ignition;
  const elapsed = lit ? Math.max(0, time - ignition) : 0;
  const trajectory = launchTrajectory(kind, elapsed);
  const power = lit ? span(elapsed, 0, .95) : 0;
  // Hold the early view near the pad, then catch up before the rocket can leave
  // the frame. The maximum vertical lag is below 2.5 scene units.
  const following = span(trajectory.height, .65, 8.5);
  return {
    ignition, elapsed, lit, power, liftTime: Math.max(0, elapsed - LAUNCH_HOLD_SECONDS),
    ...trajectory,
    followX: trajectory.x * following,
    followY: trajectory.height * following,
    padPower: power * (1 - span(trajectory.height, 2, 30)),
  };
}

/** Viking's scoop is a sampler, not a fourth landing foot. Deployment follows
 * touchdown; a short sample collection is shown after the landing time cut. */
export function vikingSamplerState(time:number) {
  const t=Number.isFinite(time)?Math.max(0,time):0;
  const deploy=span(t,22.5,24.5),lower=span(t,24.5,26),scrape=span(t,26.3,28.2);
  const lift=span(t,28.2,30.5),retract=span(t,31,34);
  return {scoopY:mix(1.10,.015,lower)+.82*lift,
    scoopZ:1.75+1.80*deploy-.26*scrape-1.20*retract,
    collecting:t>=26&&t<28.2,soil:t>=26.6,phase:t<22.5?'stowed':t<26?'deploy':t<28.2?'sample':t<31?'lift':'return'};
}
/** Shenzhou 5: orbital module first, service-module braking while still joined
 * to the return capsule, then service separation. Times are illustrative. */
export function shenzhouReturnState(time:number) {
  const t=Number.isFinite(time)?Math.max(0,time):0;
  return {orbitalGap:6*span(t,19.2,21)+Math.max(0,t-21)*1.25,
    serviceGap:6*span(t,25,27),returnTurn:Math.PI*span(t,21,22.2),
    brakingPower:span(t,22.2,22.4)*(1-span(t,24.1,24.4)),
    phase:t<19.2?'orbit':t<21?'orbital':t<22.2?'turn':t<24.4?'braking':t<25?'coast':t<27?'service':'capsule'};
}

/** Unit impulse with a sin-squared acceleration envelope. Integrate twice so
 * engine cutoff preserves velocity instead of stopping/reversing an animation. */
function falconBurnIntegral(t:number,start:number,end:number) {
  const duration=end-start,elapsed=Math.max(0,Math.min(duration,t-start)),u=elapsed/duration;
  return {
    velocity:u-Math.sin(2*Math.PI*u)/(2*Math.PI),
    position:elapsed*elapsed/(2*duration)+duration*(Math.cos(2*Math.PI*u)-1)/(4*Math.PI*Math.PI)+Math.max(0,t-end),
    acceleration:t>start&&t<end?2/duration*Math.sin(Math.PI*u)**2:0,
  };
}
function falconAttitudeRamp(t:number,start:number,end:number) {
  const u=clamp01((t-start)/(end-start));
  return {value:u*u*u*(u*(u*6-15)+10),rate:30*u*u*(u-1)*(u-1)/(end-start)};
}
/** Shared stage-one centre-of-mass path in both cinematic worlds. Scene units
 * and time are compressed. Attitude never changes translational position. */
export function falconBoosterTrajectory(time:number) {
  const t=Number.isFinite(time)?Math.max(0,time):0,half=6.5;
  const boost=falconBurnIntegral(t,16,22),entry=falconBurnIntegral(t,28,32.5),landing=falconBurnIntegral(t,38.5,44);
  const initialVx=.16,returnVx=-.10,entryVx=.10*5.25/11;
  const boostImpulse=returnVx-initialVx,entryImpulse=entryVx-returnVx,landingImpulse=-entryVx;
  const initialX=-initialVx*25-boostImpulse*6;
  const referenceX=initialX+initialVx*t;
  const centerX=referenceX+boostImpulse*boost.position+entryImpulse*entry.position+landingImpulse*landing.position;
  const velocityX=initialVx+boostImpulse*boost.velocity+entryImpulse*entry.velocity+landingImpulse*landing.velocity;
  const accelerationX=boostImpulse*boost.acceleration+entryImpulse*entry.acceleration+landingImpulse*landing.acceleration;
  const groundAt25=mix(56,.21,span(25,0,44)),groundSpeed25=(.21-56)*6*(25/44)*(1-25/44)/44;
  const gravity=.20,verticalImpulse=.54,initialVy=groundSpeed25+gravity*25-verticalImpulse;
  const initialY=groundAt25+half-initialVy*25+gravity*25*25/2-verticalImpulse*6;
  const referenceY=initialY+initialVy*t-gravity*t*t/2;
  const centerY=t<25?referenceY+verticalImpulse*boost.position:(t>=44?.21:mix(56,.21,span(t,0,44)))+half;
  const velocityY=t<25?initialVy-gravity*t+verticalImpulse*boost.velocity:t>=44?0:(.21-56)*6*(t/44)*(1-t/44)/44;
  const flip=falconAttitudeRamp(t,10,15.5),upright=falconAttitudeRamp(t,18.5,25);
  const tilted=-.22+1.17*flip.value;
  const pulse=(start:number,end:number)=>{const u=clamp01((t-start)/(end-start));return {value:Math.sin(Math.PI*u)**2,rate:Math.PI/(end-start)*Math.sin(2*Math.PI*u)};};
  const entryTilt=pulse(28,32.5),landingTilt=pulse(38.5,44);
  const angle=tilted*(1-upright.value)-.08*entryTilt.value+.025*landingTilt.value;
  const angularVelocity=1.17*flip.rate*(1-upright.value)-tilted*upright.rate-.08*entryTilt.rate+.025*landingTilt.rate;
  return {centerX,centerY,velocityX,velocityY,accelerationX,angle,angularVelocity,referenceX,referenceY,
    engineX:centerX+Math.sin(angle)*half,engineY:centerY-Math.cos(angle)*half};
}

/** Compressed 48-second chapter, not flight telemetry. The boostback, entry and
 * landing burns are separated by unpowered flight; only stage one returns. */
export function recoveryState(t: number) {
  t = Number.isFinite(t) ? Math.max(0, t) : 0;
  const burn = (start:number,end:number,strength:number) =>
    t < start || t >= end ? 0 : strength * span(t,start,start+.24) * (1-span(t,end-.28,end));
  const ascent = t < 7.65 ? .9 * (1-span(t,7.25,7.65)) : 0;
  const boostback = burn(16,22,.84), entry = burn(28,32.5,.78);
  const landing = burn(38.5,44,.64-.18*span(t,41.5,44));
  const power = Math.max(ascent,boostback,entry,landing);
  const phase = t < 7.65 ? 'ascent' : t < 10 ? 'separation' : t < 16 ? 'flip' :
    t < 22 ? 'boostback' : t < 28 ? 'coast' : t < 32.5 ? 'entry' :
    t < 38.5 ? 'glide' : t < 44 ? 'landing' : 'landed';
  const trajectory=falconBoosterTrajectory(t);
  return {
    phase,
    height: t >= 44 ? .21 : mix(56, .21, span(t, 0, 44)),
    burning: power > .0001,
    power,
    engineCount: power <= .0001 ? 0 : ascent > 0 ? 9 : landing > 0 ? 1 : 3,
    boosterAngle: trajectory.angle+.22,
    trajectory,
    secondStagePower: span(t,8.55,8.95),
    gridFins: span(t,13,17),
    legs: span(t,39.4,42.6),
    smokeTime: Math.max(0,t-25),
    groundSmokeTime: Math.max(0,t-39),
    groundSmokePower: span(t,39,40)*(1-span(t,45,48)),
  };
}

/** Horizontal arrays are separated by their mounting stations, not just rotated in-place. */
export const STATION_LAYOUT = {
  hubZ: -4.7, labCenterZ: -4.1,
  anchorX: .82, height: .24, boom: .6, clearance: .34,
  coreZ: 2.4, coreLength: 5, coreWidth: 1.55,
  labAnchorZ: -4.65, labLength: 8.1, labWidth: 2,
} as const;
export function stationPanelBounds() {
  const l = STATION_LAYOUT;
  const first = l.anchorX + l.boom + l.clearance;
  const bounds: {name:string; minX:number; maxX:number; minZ:number; maxZ:number}[] = [];
  for (const side of [-1,1]) {
    const ends = [side*first, side*(first+6.4)];
    bounds.push({name:`core-${side}`,minX:Math.min(...ends),maxX:Math.max(...ends),minZ:1.05-l.coreWidth/2,maxZ:1.05+l.coreWidth/2});
    const labEnds = [side*(-8.0), side*(-.3)];
    bounds.push({name:`lab-${side}`,minX:Math.min(...labEnds),maxX:Math.max(...labEnds),minZ:l.hubZ-(l.labWidth/2+.95),maxZ:l.hubZ+(l.labWidth/2+.95)});
  }
  return bounds;
}
