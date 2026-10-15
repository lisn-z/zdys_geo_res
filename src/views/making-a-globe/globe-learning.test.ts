import assert from 'node:assert/strict'
import test from 'node:test'
import { checkStep, createInitialState } from './globe-learning.ts'

function completeState() {
  return {
    ...createInitialState(),
    sphere: true,
    axis: true,
    poles: true,
    axisOffset: 0,
    northLabel: 'N' as const,
    southLabel: 'S' as const,
    equator: true,
    equatorOffset: 0,
    equatorTilt: 0,
    latitude: true,
    longitude: true,
    tropics: true,
    polarCircles: true,
    grid: true,
    stand: true,
  }
}

test('a student can build the globe in order, and each stage requires its new part', () => {
  const state = createInitialState()
  assert.equal(checkStep(0, state).ok, false)
  state.sphere = true
  assert.equal(checkStep(0, state).ok, true)
  assert.equal(checkStep(1, state).ok, false)
  Object.assign(state, { axis: true, axisOffset: 0, northLabel: 'N', southLabel: 'S' })
  assert.equal(checkStep(1, state).ok, true)
  assert.equal(checkStep(2, state).ok, false)
  Object.assign(state, { equator: true, equatorOffset: 0, equatorTilt: 0 })
  assert.equal(checkStep(2, state).ok, true)
  assert.equal(checkStep(3, state).ok, false)
  state.latitude = true
  assert.equal(checkStep(3, state).ok, false)
  state.longitude = true
  assert.equal(checkStep(3, state).ok, false)
  state.tropics = true
  assert.equal(checkStep(3, state).ok, false)
  state.polarCircles = true
  assert.equal(checkStep(3, state).ok, true)
  assert.equal(checkStep(4, state).ok, false)
  state.stand = true
  assert.equal(checkStep(4, state).ok, true)
})

test('later stages cannot bypass missing or incorrect earlier construction', () => {
  const defects = [
    { sphere: false },
    { axis: false },
    { axisOffset: 0.2 },
    { northLabel: null },
    { southLabel: 'N' as const },
    { equator: false },
    { equatorOffset: 0.2 },
    { equatorTilt: 10 },
  ]
  for (const defect of defects) {
    assert.equal(checkStep(3, { ...completeState(), ...defect }).ok, false, JSON.stringify(defect))
    assert.equal(checkStep(4, { ...completeState(), ...defect }).ok, false, JSON.stringify(defect))
  }
  assert.equal(checkStep(4, { ...completeState(), latitude: false }).ok, false)
  assert.equal(checkStep(4, { ...completeState(), longitude: false }).ok, false)
  for (const defect of [{ tropics: false }, { polarCircles: false }]) {
    assert.equal(checkStep(3, { ...completeState(), ...defect }).ok, false, JSON.stringify(defect))
    assert.equal(checkStep(4, { ...completeState(), ...defect }).ok, false, JSON.stringify(defect))
  }
})

test('special latitude layers start absent and the map remains optional', () => {
  const initial = createInitialState()
  assert.equal(initial.tropics, false)
  assert.equal(initial.polarCircles, false)
  assert.equal(initial.map, false)
  for (const map of [false, true]) {
    assert.equal(checkStep(3, { ...completeState(), map }).ok, true)
    assert.equal(checkStep(4, { ...completeState(), map }).ok, true)
  }
})

test('center and angle tolerances include both boundaries and reject values just outside', () => {
  for (const sign of [-1, 1]) {
    const state = completeState()
    state.axisOffset = sign * 0.015
    state.equatorOffset = sign * 0.015
    state.equatorTilt = sign * 1
    assert.equal(checkStep(2, state).ok, true)
    for (const defect of [
      { axisOffset: sign * 0.01501 },
      { equatorOffset: sign * 0.01501 },
      { equatorTilt: sign * 1.001 },
    ]) {
      assert.equal(checkStep(2, { ...state, ...defect }).ok, false, JSON.stringify(defect))
    }
  }
})

test('both pole labels must be present and in their correct locations', () => {
  for (const labels of [
    { northLabel: null, southLabel: null },
    { northLabel: 'N' as const, southLabel: null },
    { northLabel: null, southLabel: 'S' as const },
    { northLabel: 'S' as const, southLabel: 'N' as const },
    { northLabel: 'N' as const, southLabel: 'N' as const },
    { northLabel: 'S' as const, southLabel: 'S' as const },
  ]) {
    assert.equal(checkStep(1, { ...completeState(), ...labels }).ok, false, JSON.stringify(labels))
  }
})

test('non-finite geometry and invalid step numbers never count as completed work', () => {
  for (const value of [NaN, Infinity, -Infinity]) {
    for (const key of ['axisOffset', 'equatorOffset', 'equatorTilt']) {
      assert.equal(checkStep(4, { ...completeState(), [key]: value }).ok, false)
    }
  }
  for (const step of [-1, 5, 0.5, NaN, Infinity]) {
    assert.equal(checkStep(step, completeState()).ok, false)
  }
})

test('checking work is pure and initial states are independent', () => {
  const first = createInitialState()
  const second = createInitialState()
  first.sphere = true
  assert.equal(second.sphere, false)
  const state = completeState()
  const before = structuredClone(state)
  for (let step = 0; step < 5; step += 1) checkStep(step, state)
  assert.deepEqual(state, before)
})
