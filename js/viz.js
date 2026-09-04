/**
 * SVG rendering. Two independent views:
 *
 *   renderBrickDiagram - an isometric stack of three bricks, offset along the
 *                        chosen axis so the stacking gap is visible, with an
 *                        arrow continuing in the direction of the Moon.
 *   renderLadder       - a log-scale altitude axis showing how many bricks it
 *                        takes to reach each waypoint.
 *
 * These functions build SVG nodes and assign CSS classes; they never set
 * colours. All palette decisions live in css/styles.css so the two views stay
 * consistent and themeable.
 */

const SVG_NS = 'http://www.w3.org/2000/svg';
const COS30 = Math.sqrt(3) / 2;

/** Standard isometric projection, camera at (+x, +y, +z) looking at the origin. */
function project(x, y, z) {
  return [(x - y) * COS30, (x + y) * 0.5 - z];
}

function el(name, attrs = {}) {
  const node = document.createElementNS(SVG_NS, name);
  for (const [key, value] of Object.entries(attrs)) {
    node.setAttribute(key, String(value));
  }
  return node;
}

function clear(svg) {
  while (svg.firstChild) svg.removeChild(svg.firstChild);
}

function polygon(points, className) {
  return el('polygon', {
    points: points.map(([x, y]) => `${x.toFixed(2)},${y.toFixed(2)}`).join(' '),
    class: className,
    'vector-effect': 'non-scaling-stroke',
  });
}

/* ------------------------------------------------------------------ */
/* Brick diagram                                                       */
/* ------------------------------------------------------------------ */

/**
 * A circle lying flat in the XY plane projects to an axis-aligned ellipse
 * under this isometric transform, with no rotation needed.
 */
const STUD_RX = COS30 * Math.SQRT2;
const STUD_RY = 0.5 * Math.SQRT2;

/** Stud centres for the top face, laid out on the part's stud grid. */
function studPositions(brick) {
  if (!brick.studPitch) return [];
  const pitch = brick.studPitch;
  const cols = Math.max(1, Math.round(brick.dims.length / pitch));
  const rows = Math.max(1, Math.round(brick.dims.width / pitch));
  const marginX = (brick.dims.length - (cols - 1) * pitch) / 2;
  const marginY = (brick.dims.width - (rows - 1) * pitch) / 2;
  const out = [];
  for (let c = 0; c < cols; c += 1) {
    for (let r = 0; r < rows; r += 1) {
      out.push([marginX + c * pitch, marginY + r * pitch]);
    }
  }
  return out;
}

function drawBrick(group, brick, [ox, oy, oz], track) {
  const { length: L, width: W, height: H } = brick.dims;
  const p = (x, y, z) => {
    const point = project(ox + x, oy + y, oz + z);
    track(point);
    return point;
  };

  // Only three faces face the camera under this projection.
  const top = [p(0, 0, H), p(L, 0, H), p(L, W, H), p(0, W, H)];
  const right = [p(L, 0, 0), p(L, W, 0), p(L, W, H), p(L, 0, H)];
  const left = [p(0, W, 0), p(L, W, 0), p(L, W, H), p(0, W, H)];

  group.appendChild(polygon(left, 'face face-left'));
  group.appendChild(polygon(right, 'face face-right'));
  group.appendChild(polygon(top, 'face face-top'));

  // Studs, back to front, so the near ones overlap the far ones correctly.
  const studs = studPositions(brick);
  const rx = brick.studRadius * STUD_RX;
  const ry = brick.studRadius * STUD_RY;
  studs
    .map(([sx, sy]) => ({ sx, sy, base: p(sx, sy, H) }))
    .sort((a, b) => a.base[1] - b.base[1])
    .forEach(({ base }) => {
      const [cx, cyBase] = base;
      const cyTop = cyBase - brick.studHeight;
      group.appendChild(
        el('rect', {
          x: (cx - rx).toFixed(2),
          y: cyTop.toFixed(2),
          width: (rx * 2).toFixed(2),
          height: brick.studHeight.toFixed(2),
          class: 'stud-side',
        }),
      );
      group.appendChild(
        el('ellipse', {
          cx: cx.toFixed(2),
          cy: cyBase.toFixed(2),
          rx: rx.toFixed(2),
          ry: ry.toFixed(2),
          class: 'stud-side',
        }),
      );
      group.appendChild(
        el('ellipse', {
          cx: cx.toFixed(2),
          cy: cyTop.toFixed(2),
          rx: rx.toFixed(2),
          ry: ry.toFixed(2),
          class: 'stud-top',
          'vector-effect': 'non-scaling-stroke',
        }),
      );
    });
}

/**
 * @param svg        target <svg> element
 * @param brick      entry from BRICKS
 * @param axis       'length' | 'width' | 'height'
 * @param pitchMm    result of calc.stackPitchMm, so any gap shows up as a gap
 */
export function renderBrickDiagram(svg, brick, axis, pitchMm) {
  clear(svg);

  const bounds = { minX: Infinity, minY: Infinity, maxX: -Infinity, maxY: -Infinity };
  const track = ([x, y]) => {
    if (x < bounds.minX) bounds.minX = x;
    if (x > bounds.maxX) bounds.maxX = x;
    if (y < bounds.minY) bounds.minY = y;
    if (y > bounds.maxY) bounds.maxY = y;
  };

  const unit = { length: [1, 0, 0], width: [0, 1, 0], height: [0, 0, 1] }[axis];
  const COPIES = 3;
  const offsets = [];
  for (let i = 0; i < COPIES; i += 1) {
    offsets.push(unit.map((component) => component * pitchMm * i));
  }

  // Painter's algorithm: with the camera on the (+1,+1,+1) diagonal, a larger
  // coordinate sum is nearer, so sorting ascending draws far-to-near.
  const group = el('g');
  offsets
    .slice()
    .sort((a, b) => a[0] + a[1] + a[2] - (b[0] + b[1] + b[2]))
    .forEach((offset) => drawBrick(group, brick, offset, track));
  svg.appendChild(group);

  // The arrow picks up where the stack left off and keeps going.
  const from = project(...unit.map((c) => c * pitchMm * COPIES));
  const to = project(...unit.map((c) => c * pitchMm * (COPIES + 1.6)));
  track(from);
  track(to);

  const arrow = el('g', { class: 'axis-arrow' });
  arrow.appendChild(
    el('line', {
      x1: from[0].toFixed(2),
      y1: from[1].toFixed(2),
      x2: to[0].toFixed(2),
      y2: to[1].toFixed(2),
      'vector-effect': 'non-scaling-stroke',
    }),
  );

  const dx = to[0] - from[0];
  const dy = to[1] - from[1];
  const len = Math.hypot(dx, dy) || 1;
  const head = Math.max(brick.dims.height, 6) * 0.9;
  const ux = dx / len;
  const uy = dy / len;
  arrow.appendChild(
    polygon(
      [
        [to[0], to[1]],
        [to[0] - ux * head + -uy * head * 0.4, to[1] - uy * head + ux * head * 0.4],
        [to[0] - ux * head - -uy * head * 0.4, to[1] - uy * head - ux * head * 0.4],
      ],
      'arrow-head',
    ),
  );
  svg.appendChild(arrow);

  const padX = (bounds.maxX - bounds.minX) * 0.08 + 4;
  const padY = (bounds.maxY - bounds.minY) * 0.08 + 4;
  svg.setAttribute(
    'viewBox',
    [
      (bounds.minX - padX).toFixed(2),
      (bounds.minY - padY).toFixed(2),
      (bounds.maxX - bounds.minX + padX * 2).toFixed(2),
      (bounds.maxY - bounds.minY + padY * 2).toFixed(2),
    ].join(' '),
  );
}

/* ------------------------------------------------------------------ */
/* Altitude ladder                                                     */
/* ------------------------------------------------------------------ */

const LADDER = { width: 760, height: 620, top: 40, bottom: 580, axisX: 250, floorKm: 0.1 };

/**
 * @param svg         target <svg> element
 * @param milestones  MILESTONES entries
 * @param moonKm      the selected Earth-Moon distance, drawn as the top rung
 * @param countFor    (km) => number of bricks to reach that altitude
 * @param formatCount (n) => label string
 */
export function renderLadder(svg, { milestones, moonKm, countFor, formatCount }) {
  clear(svg);
  svg.setAttribute('viewBox', `0 0 ${LADDER.width} ${LADDER.height}`);

  const logMin = Math.log10(LADDER.floorKm);
  const logMax = Math.log10(moonKm);
  const yFor = (km) => {
    const t = (Math.log10(km) - logMin) / (logMax - logMin);
    return LADDER.bottom - t * (LADDER.bottom - LADDER.top);
  };

  const gradientId = 'ladder-gradient';
  const defs = el('defs');
  const gradient = el('linearGradient', {
    id: gradientId,
    x1: '0',
    y1: '1',
    x2: '0',
    y2: '0',
  });
  gradient.appendChild(el('stop', { offset: '0', class: 'grad-earth' }));
  gradient.appendChild(el('stop', { offset: '1', class: 'grad-moon' }));
  defs.appendChild(gradient);
  svg.appendChild(defs);

  svg.appendChild(
    el('line', {
      x1: LADDER.axisX,
      y1: LADDER.bottom,
      x2: LADDER.axisX,
      y2: LADDER.top,
      class: 'ladder-axis',
      stroke: `url(#${gradientId})`,
    }),
  );

  const rungs = [
    ...milestones.map((m) => ({ name: m.name, km: m.altitudeKm, emphasis: false })),
    { name: 'The Moon', km: moonKm, emphasis: true },
  ];

  for (const rung of rungs) {
    const y = yFor(rung.km);
    const group = el('g', { class: rung.emphasis ? 'rung rung-goal' : 'rung' });

    group.appendChild(
      el('line', {
        x1: LADDER.axisX - 10,
        y1: y,
        x2: LADDER.axisX + 10,
        y2: y,
        class: 'rung-tick',
      }),
    );

    const name = el('text', {
      x: LADDER.axisX - 22,
      y: y + 5,
      class: 'rung-name',
      'text-anchor': 'end',
    });
    name.textContent = rung.name;
    group.appendChild(name);

    const count = el('text', { x: LADDER.axisX + 22, y: y + 1, class: 'rung-count' });
    count.textContent = formatCount(countFor(rung.km));
    group.appendChild(count);

    const alt = el('text', { x: LADDER.axisX + 22, y: y + 17, class: 'rung-alt' });
    alt.textContent = `${new Intl.NumberFormat('en-US').format(Math.round(rung.km))} km up`;
    group.appendChild(alt);

    svg.appendChild(group);
  }

  const caption = el('text', {
    x: LADDER.axisX,
    y: LADDER.bottom + 28,
    class: 'ladder-caption',
    'text-anchor': 'middle',
  });
  caption.textContent = 'Sea level — altitude axis is logarithmic';
  svg.appendChild(caption);
}
