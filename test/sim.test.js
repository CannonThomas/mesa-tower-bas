// Runs the plant and controller model headless and checks the sequence of operations.
const { test } = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const src = fs.readFileSync(path.join(__dirname, '../src/parts/2-sim.html'), 'utf8').replace(/<\/?script[^>]*>/g, '');
const ctx = vm.createContext({});
vm.runInContext(src + '\n;globalThis.api = {makeSim, step, DT, zoneDev};', ctx);
const { makeSim, step, DT, zoneDev } = ctx.api;

const runFor = (S, minutes) => { for (let i = 0; i < minutes / DT; i++) step(S); };
const hour = S => (S.t / 60) % 24;
const active = (S, key) => S.alarms.some(a => a.key === key && a.active);
// model starts at 10:30; advance to a given hour of the next day
const runTo = (S, h) => runFor(S, ((h - 10.5 + 24) % 24 || 24) * 60);

test('holds supply air temperature, duct static and zone setpoints at midday', () => {
  const S = makeSim(); runFor(S, 26 * 60);
  assert.ok(Math.abs(S.sat - S.satSp) < 0.5, 'SAT ' + S.sat);
  assert.ok(Math.abs(S.dsp - S.dspSp) < 0.05, 'static ' + S.dsp);
  for (const z of S.zones) assert.ok(Math.abs(zoneDev(z, S.occ)) < 0.5, z.name + ' ' + z.T);
});

test('a normal two-day run raises no alarms', () => {
  const S = makeSim(); runFor(S, 48 * 60);
  assert.strictEqual(S.alarms.length, 0);
});

test('unit is off overnight with outside air shut and return damper open', () => {
  const S = makeSim(); runTo(S, 2);
  assert.ok(Math.abs(hour(S) - 2) < 0.01);
  assert.strictEqual(S.fanCmd, false);
  assert.strictEqual(S.speed, 0);
  assert.strictEqual(S.oa, 0);
  assert.strictEqual(S.clg, 0);
});

test('economizer opens the outside air damper on a cool morning and releases in the afternoon', () => {
  const S = makeSim(); runTo(S, 7);
  assert.strictEqual(S.econ, true);
  assert.ok(S.oa > S.minOA + 0.2, 'OA damper ' + S.oa);
  runFor(S, 7 * 60);
  assert.strictEqual(S.econ, false);
  assert.ok(Math.abs(S.oa - S.minOA) < 1e-9);
});

test('loss of fan status alarms within two minutes and shuts the valves and outside air damper', () => {
  const S = makeSim(); runFor(S, 90);
  S.faults.fan = true; runFor(S, 3);
  assert.ok(active(S, 'sf'));
  assert.strictEqual(S.proven, false);
  assert.strictEqual(S.clg, 0);
  assert.strictEqual(S.oa, 0);
  for (const z of S.zones) assert.strictEqual(z.rh, 0);
  S.faults.fan = false; runFor(S, 30);
  assert.ok(!active(S, 'sf'));
  assert.ok(Math.abs(S.sat - S.satSp) < 1, 'SAT after reset ' + S.sat);
});

test('a stuck chilled water valve raises a high supply air temperature alarm', () => {
  const S = makeSim(); runFor(S, 90);
  S.faults.chw = true; runFor(S, 30);
  assert.ok(active(S, 'sat'));
});

test('a loaded filter raises a maintenance alarm', () => {
  const S = makeSim(); runFor(S, 90);
  S.faults.filter = true; runFor(S, 5);
  assert.ok(active(S, 'flt'));
});

test('night setback cycles the unit on a cold night and keeps zones off the floor', () => {
  const S = makeSim(); S.oatAuto = false; S.oatMan = 15;
  let ran = false, min = 99;
  for (let i = 0; i < 24 * 60 / DT; i++){
    step(S);
    if (!S.occ && S.setback){ ran = true; assert.strictEqual(S.oa, 0); assert.strictEqual(S.clg, 0); }
    for (const z of S.zones) min = Math.min(min, z.T);
  }
  assert.ok(ran, 'setback never ran');
  assert.ok(min > 60, 'coldest zone ' + min);
});

test('holds setpoint on a 100 °F day without alarms', () => {
  const S = makeSim(); S.oatAuto = false; S.oatMan = 100; runFor(S, 26 * 60);
  assert.ok(Math.abs(S.sat - S.satSp) < 0.5);
  assert.strictEqual(S.alarms.length, 0);
});
