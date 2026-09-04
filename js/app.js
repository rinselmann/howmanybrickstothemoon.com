/**
 * Controller: owns the selection state, wires the form to calc.js, and hands
 * results to viz.js. State is mirrored into the query string so a particular
 * result can be linked to.
 */

import { BRICKS, ORIENTATIONS, DISTANCE_MODES, MILESTONES, BUILD_RATES } from './data.js';
import { computeStack, stackPitchMm, gapAppliesTo } from './calc.js';
import {
  formatExact,
  formatWords,
  formatMass,
  formatMoney,
  formatDuration,
  formatMm,
  formatKm,
} from './format.js';
import { renderBrickDiagram, renderLadder } from './viz.js';

const $ = (id) => document.getElementById(id);

const state = {
  brickId: BRICKS[0].id,
  axis: 'height',
  includeGap: true,
  modeId: DISTANCE_MODES[0].id,
  rateId: BUILD_RATES[0].id,
};

const byId = (list, id, fallback) => list.find((item) => item.id === id) ?? fallback;

/* ---------------------------------------------------------------- */
/* URL round-tripping                                                */
/* ---------------------------------------------------------------- */

function readUrl() {
  const params = new URLSearchParams(window.location.search);
  const brick = BRICKS.find((b) => b.id === params.get('brick'));
  if (brick) state.brickId = brick.id;
  const orientation = ORIENTATIONS.find((o) => o.id === params.get('axis'));
  if (orientation) state.axis = orientation.axis;
  const mode = DISTANCE_MODES.find((m) => m.id === params.get('distance'));
  if (mode) state.modeId = mode.id;
  const rate = BUILD_RATES.find((r) => r.id === params.get('rate'));
  if (rate) state.rateId = rate.id;
  if (params.has('gap')) state.includeGap = params.get('gap') !== '0';
}

function writeUrl() {
  const params = new URLSearchParams({
    brick: state.brickId,
    axis: state.axis,
    distance: state.modeId,
    rate: state.rateId,
    gap: state.includeGap ? '1' : '0',
  });
  window.history.replaceState(null, '', `?${params}`);
}

/* ---------------------------------------------------------------- */
/* Control construction                                              */
/* ---------------------------------------------------------------- */

function buildBrickSelect() {
  const select = $('brick-select');
  const categories = [...new Set(BRICKS.map((b) => b.category))];
  for (const category of categories) {
    const group = document.createElement('optgroup');
    group.label = category;
    for (const brick of BRICKS.filter((b) => b.category === category)) {
      const option = document.createElement('option');
      option.value = brick.id;
      option.textContent = brick.name;
      group.appendChild(option);
    }
    select.appendChild(group);
  }
  select.addEventListener('change', () => {
    state.brickId = select.value;
    render();
  });
}

function buildSimpleSelect(id, items, onPick) {
  const select = $(id);
  for (const item of items) {
    const option = document.createElement('option');
    option.value = item.id;
    option.textContent = item.name;
    select.appendChild(option);
  }
  select.addEventListener('change', () => {
    onPick(select.value);
    render();
  });
}

function buildOrientationRadios() {
  const container = $('orientation-options');
  for (const orientation of ORIENTATIONS) {
    const label = document.createElement('label');
    label.className = 'orientation';
    label.innerHTML = `
      <input type="radio" name="orientation" value="${orientation.axis}">
      <span class="orientation-body">
        <span class="orientation-name">${orientation.name}</span>
        <span class="orientation-blurb">${orientation.blurb}</span>
        <span class="orientation-pitch" data-axis="${orientation.axis}"></span>
      </span>`;
    label.querySelector('input').addEventListener('change', () => {
      state.axis = orientation.axis;
      render();
    });
    container.appendChild(label);
  }
}

/* ---------------------------------------------------------------- */
/* Render                                                            */
/* ---------------------------------------------------------------- */

function render() {
  const brick = byId(BRICKS, state.brickId, BRICKS[0]);
  const mode = byId(DISTANCE_MODES, state.modeId, DISTANCE_MODES[0]);
  const rate = byId(BUILD_RATES, state.rateId, BUILD_RATES[0]);

  const result = computeStack({
    brick,
    axis: state.axis,
    includeGap: state.includeGap,
    mode,
    bricksPerSecond: rate.bricksPerSecond,
  });

  // Reflect state back into the controls (needed on first load from a URL).
  $('brick-select').value = brick.id;
  $('distance-select').value = mode.id;
  $('rate-select').value = rate.id;
  $('gap-toggle').checked = state.includeGap;
  for (const input of document.querySelectorAll('input[name="orientation"]')) {
    input.checked = input.value === state.axis;
  }

  // Per-orientation pitch hints, so the trade-off is visible before clicking.
  for (const node of document.querySelectorAll('.orientation-pitch')) {
    const axis = node.dataset.axis;
    node.textContent = `${formatMm(stackPitchMm(brick, axis, { includeGap: state.includeGap }))} per brick`;
  }

  // The gap control only makes sense when this brick and axis actually have one.
  const gapRow = $('gap-row');
  const applies = gapAppliesTo(brick, state.axis);
  gapRow.classList.toggle('is-inert', !applies);
  $('gap-label').textContent = brick.gap
    ? `Include ${brick.gap.label} (${formatMm(brick.gap.amountMm)})`
    : 'This brick stacks with no gap';
  $('gap-toggle').disabled = !brick.gap;
  $('gap-note').textContent = brick.gap && !applies
    ? `Not a factor in this orientation — the ${brick.gap.label} does not fall along this axis.`
    : '';

  $('headline-count').textContent = formatExact(result.count);
  $('headline-words').textContent = formatWords(result.count);
  $('headline-brick').textContent = brick.name;

  $('stat-pitch').textContent = formatMm(result.pitchMm);
  $('stat-distance').textContent = formatKm(result.distanceKm);
  $('stat-mass').textContent = formatMass(result.massKg);
  $('stat-cost').textContent = formatMoney(result.costUsd);
  $('stat-time').textContent = formatDuration(result.seconds);

  const orientation = ORIENTATIONS.find((o) => o.axis === state.axis);
  $('diagram-caption').textContent =
    `${brick.name}, ${orientation.name.toLowerCase()} — each one gains ${formatMm(result.pitchMm)} of altitude.`;

  renderBrickDiagram($('brick-diagram'), brick, state.axis, result.pitchMm);
  renderLadder($('ladder'), {
    milestones: MILESTONES,
    moonKm: result.distanceKm,
    countFor: result.milestoneCount,
    formatCount: (n) => `${formatWords(n)} bricks`,
  });

  writeUrl();
}

/* ---------------------------------------------------------------- */

function init() {
  readUrl();
  buildBrickSelect();
  buildOrientationRadios();
  buildSimpleSelect('distance-select', DISTANCE_MODES, (id) => {
    state.modeId = id;
  });
  buildSimpleSelect('rate-select', BUILD_RATES, (id) => {
    state.rateId = id;
  });
  $('gap-toggle').addEventListener('change', (event) => {
    state.includeGap = event.target.checked;
    render();
  });
  render();
}

init();
