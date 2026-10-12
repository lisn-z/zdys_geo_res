/** Independent hold-to-launch mission. Time is real elapsed time, never story time.
 * Distances are illustrative scene units; this is an educational flight model.
 */
export type MissionPhase = 'ready' | 'igniting' | 'flying' | 'falling' | 'crashed' | 'success';
export type MissionInputSource = 'keyboard' | 'pointer';

export interface MissionFlightState {
  readonly phase: MissionPhase;
  readonly time: number;
  readonly height: number;
  readonly velocity: number;
  readonly power: number;
  readonly held: boolean;
  readonly whiteout: number;
  readonly fallTime: number;
  readonly crashTime: number;
  readonly progress: number;
}

export const MISSION_FLIGHT = Object.freeze({
  ignitionDuration: .8,
  successHeight: 190,
  cloudBottom: 105,
  cloudTop: 175,
  whiteoutHeight: 125,
  gravity: 12,
  initialNetAcceleration: .28,
  netAccelerationGrowth: .018,
  maxNetAcceleration: .92,
  fixedStep: 1 / 120,
  maxFrameDt: .25,
  minimumFallTime: .5,
  whiteoutFadeDuration: .65,
});

const missionClamp = (value: number) => Math.max(0, Math.min(1, value));
const missionEase = (value: number) => { const t = missionClamp(value); return t * t * (3 - 2 * t); };
const initialMissionFlight = () => ({
  phase: 'ready' as MissionPhase,
  time: 0, height: 0, velocity: 0, power: 0, whiteout: 0, fallTime: 0, crashTime: 0,
});

export class LaunchMission {
  private flight = initialMissionFlight();
  private readonly inputs = new Set<MissionInputSource>();
  private accumulator = 0;
  private failureWhiteout = 0;

  get phase() { return this.flight.phase; }
  get time() { return this.flight.time; }
  get height() { return this.flight.height; }
  get velocity() { return this.flight.velocity; }
  get power() { return this.flight.power; }
  get held() { return this.inputs.size > 0; }
  get whiteout() { return this.flight.whiteout; }
  get fallTime() { return this.flight.fallTime; }
  get crashTime() { return this.flight.crashTime; }
  get progress() {
    // Reaching the same altitude ballistically after releasing cannot complete
    // the mission. Only the success phase is allowed to report full progress.
    return this.phase === 'success' ? 1 : Math.min(.999, missionClamp(this.height / MISSION_FLIGHT.successHeight));
  }

  hold(source: MissionInputSource): void {
    if (this.phase !== 'ready' && this.phase !== 'igniting' && this.phase !== 'flying') return;
    this.inputs.add(source);
    if (this.phase === 'ready') this.flight.phase = 'igniting';
  }

  release(source: MissionInputSource): void {
    this.inputs.delete(source);
    this.failIfReleased();
  }

  releaseAll(): void {
    this.inputs.clear();
    this.failIfReleased();
  }

  reset(): void {
    this.flight = initialMissionFlight();
    this.inputs.clear();
    this.accumulator = 0;
    this.failureWhiteout = 0;
  }

  snapshot(): MissionFlightState {
    return Object.freeze({ ...this.flight, held: this.held, progress: this.progress });
  }

  /** Invalid deltas do nothing. A suspended/background frame cannot skip the
   * interaction: at most .25 seconds is consumed per tick, in 1/120 s steps.
   */
  tick(dt: number): void {
    if (!Number.isFinite(dt) || dt <= 0 || this.phase === 'ready') return;
    this.accumulator += Math.min(dt, MISSION_FLIGHT.maxFrameDt);
    const step = MISSION_FLIGHT.fixedStep;
    while (this.accumulator + 1e-10 >= step) {
      this.advance(step);
      this.accumulator = Math.max(0, this.accumulator - step);
    }
  }

  private failIfReleased(): void {
    if (this.held || (this.phase !== 'igniting' && this.phase !== 'flying')) return;
    this.failureWhiteout = this.flight.whiteout;
    this.flight.phase = 'falling';
    this.flight.fallTime = 0;
    this.flight.crashTime = 0;
    this.flight.power = 0;
  }

  private advance(dt: number): void {
    const s = this.flight;
    s.time += dt;
    if (s.phase === 'igniting') {
      s.power = missionEase(s.time / MISSION_FLIGHT.ignitionDuration);
      if (s.time + 1e-10 >= MISSION_FLIGHT.ignitionDuration) {
        s.phase = 'flying';
        s.power = 1;
      }
      return;
    }
    if (s.phase === 'flying') {
      // The launch clamp is already released. Net acceleration increases as
      // propellant is consumed, reaching cloud-top success after about 30 s.
      const ascentTime = Math.max(0, s.time - dt / 2 - MISSION_FLIGHT.ignitionDuration);
      const acceleration = Math.min(MISSION_FLIGHT.maxNetAcceleration,
        MISSION_FLIGHT.initialNetAcceleration + ascentTime * MISSION_FLIGHT.netAccelerationGrowth);
      s.height += s.velocity * dt + acceleration * dt * dt / 2;
      s.velocity += acceleration * dt;
      s.power = 1;
      // The first scattered wisps remain readable; whiteout starts only after
      // the vehicle has entered the denser upper part of the cloud field.
      s.whiteout = missionEase((s.height - MISSION_FLIGHT.whiteoutHeight) /
        (MISSION_FLIGHT.successHeight - MISSION_FLIGHT.whiteoutHeight));
      if (this.held && s.height >= MISSION_FLIGHT.successHeight) {
        s.phase = 'success';
        s.height = MISSION_FLIGHT.successHeight;
        s.velocity = 0;
        s.power = 0;
        s.whiteout = 1;
      }
      return;
    }
    if (s.phase === 'falling') {
      s.fallTime += dt;
      // Preserve momentum on failure; there is no restart or mid-air rescue.
      s.height += s.velocity * dt - MISSION_FLIGHT.gravity * dt * dt / 2;
      s.velocity -= MISSION_FLIGHT.gravity * dt;
      s.whiteout = this.failureWhiteout * (1 - missionEase(s.fallTime / MISSION_FLIGHT.whiteoutFadeDuration));
      if (s.height <= 0) {
        s.height = 0;
        s.velocity = 0;
        // Even release during hold-down has a visible collapse/fall phase.
        if (s.fallTime + 1e-10 >= MISSION_FLIGHT.minimumFallTime) {
          s.phase = 'crashed';
          s.crashTime = 0;
        }
      }
      return;
    }
    if (s.phase === 'crashed') s.crashTime += dt;
    // Completed flights keep their terminal pose while effect time continues.
  }
}
