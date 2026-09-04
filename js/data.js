/**
 * Static reference data: the brick catalogue, stacking orientations, the
 * Earth-Moon distance models, and the altitude milestones used by the ladder.
 *
 * Everything here is plain data with no behaviour. All arithmetic lives in
 * calc.js so it can be unit tested without touching the DOM.
 *
 * Units: every linear dimension is in MILLIMETRES, every mass in GRAMS,
 * every astronomical distance in KILOMETRES. Do not mix.
 */

/** The three dimensions of a brick. A stacking axis is always one of these. */
export const AXES = ['length', 'width', 'height'];

/**
 * How the brick is laid, expressed as which dimension runs along the
 * Earth -> Moon line. `axis` must be a member of AXES.
 */
export const ORIENTATIONS = [
  {
    id: 'height',
    axis: 'height',
    name: 'Stacked flat',
    blurb: 'Laid the normal way up, each brick resting on the one below.',
  },
  {
    id: 'width',
    axis: 'width',
    name: 'Rolled on its side',
    blurb: 'Tipped onto its long side, so the width is what gains altitude.',
  },
  {
    id: 'length',
    axis: 'length',
    name: 'Stood on its end',
    blurb: 'Up on end, so the longest dimension does the climbing.',
  },
];

/**
 * The catalogue.
 *
 * dims      - bounding box of the part itself, excluding anything that sticks out.
 * massGrams - mass of a single unit.
 * priceUsd  - rough single-unit street price, used only for the novelty total.
 * gap       - extra distance introduced between neighbours when stacking, and
 *             crucially WHICH axes it applies to. A LEGO stud nests into the
 *             tube below it, so stacking flat adds nothing; stack the same
 *             brick on its side and the stud has nowhere to go. Mortar, by
 *             contrast, is applied on whichever face you are bedding.
 * studPitch / studRadius / studHeight - drawing hints for the isometric render.
 */
export const BRICKS = [
  {
    id: 'lego-brick-2x4',
    name: 'LEGO brick, 2x4',
    category: 'LEGO',
    dims: { length: 31.8, width: 15.8, height: 9.6 },
    massGrams: 2.32,
    priceUsd: 0.1,
    gap: { amountMm: 1.8, axes: ['length', 'width'], label: 'stud protrusion' },
    studPitch: 8,
    studRadius: 2.4,
    studHeight: 1.8,
  },
  {
    id: 'lego-brick-1x1',
    name: 'LEGO brick, 1x1',
    category: 'LEGO',
    dims: { length: 7.8, width: 7.8, height: 9.6 },
    massGrams: 0.45,
    priceUsd: 0.06,
    gap: { amountMm: 1.8, axes: ['length', 'width'], label: 'stud protrusion' },
    studPitch: 8,
    studRadius: 2.4,
    studHeight: 1.8,
  },
  {
    id: 'lego-plate-2x4',
    name: 'LEGO plate, 2x4',
    category: 'LEGO',
    dims: { length: 31.8, width: 15.8, height: 3.2 },
    massGrams: 1.0,
    priceUsd: 0.09,
    gap: { amountMm: 1.8, axes: ['length', 'width'], label: 'stud protrusion' },
    studPitch: 8,
    studRadius: 2.4,
    studHeight: 1.8,
  },
  {
    id: 'duplo-brick-2x4',
    name: 'LEGO DUPLO brick, 2x4',
    category: 'LEGO',
    dims: { length: 63.5, width: 31.7, height: 19.2 },
    massGrams: 9.9,
    priceUsd: 0.5,
    gap: { amountMm: 4.5, axes: ['length', 'width'], label: 'stud protrusion' },
    studPitch: 16,
    studRadius: 4.6,
    studHeight: 4.5,
  },
  {
    id: 'clay-modular',
    name: 'Modular clay brick (US)',
    category: 'Masonry',
    dims: { length: 194, width: 92, height: 57 },
    massGrams: 2040,
    priceUsd: 0.65,
    gap: { amountMm: 9.5, axes: ['length', 'width', 'height'], label: 'mortar joint' },
  },
  {
    id: 'clay-uk',
    name: 'Standard clay brick (UK)',
    category: 'Masonry',
    dims: { length: 215, width: 102.5, height: 65 },
    massGrams: 2700,
    priceUsd: 0.75,
    gap: { amountMm: 10, axes: ['length', 'width', 'height'], label: 'mortar joint' },
  },
  {
    id: 'cmu-block',
    name: 'Concrete block (CMU)',
    category: 'Masonry',
    dims: { length: 390, width: 190, height: 190 },
    massGrams: 17000,
    priceUsd: 2.2,
    gap: { amountMm: 10, axes: ['length', 'width', 'height'], label: 'mortar joint' },
  },
  {
    id: 'jenga-block',
    name: 'Jenga block',
    category: 'Novelty',
    dims: { length: 75, width: 25, height: 15 },
    massGrams: 17,
    priceUsd: 0.22,
    gap: null,
  },
  {
    id: 'gold-bar',
    name: 'Gold bar (Good Delivery)',
    category: 'Novelty',
    dims: { length: 210, width: 55, height: 37 },
    massGrams: 12441,
    priceUsd: 1320000,
    gap: null,
  },
];

/** Radii used to convert centre-to-centre distances into surface-to-surface. */
export const EARTH_RADIUS_KM = 6371;
export const MOON_RADIUS_KM = 1737.4;

/**
 * Orbital distances, centre to centre. `surface` asks calc.js to subtract both
 * bodies' radii, which is the honest number if you are actually stacking
 * bricks from the ground up.
 */
export const DISTANCE_MODES = [
  {
    id: 'mean-surface',
    name: 'Average distance, ground to ground',
    centerToCenterKm: 384400,
    surface: true,
  },
  {
    id: 'mean-center',
    name: 'Average distance, centre to centre',
    centerToCenterKm: 384400,
    surface: false,
  },
  {
    id: 'perigee-surface',
    name: 'Closest approach (perigee), ground to ground',
    centerToCenterKm: 356500,
    surface: true,
  },
  {
    id: 'apogee-surface',
    name: 'Furthest point (apogee), ground to ground',
    centerToCenterKm: 406700,
    surface: true,
  },
];

/**
 * Waypoints on the way up, as altitude above mean sea level. These are always
 * measured from Earth's surface regardless of the selected distance mode, so
 * the ladder stays meaningful when you switch to centre-to-centre.
 * Kept deliberately sparse: entries closer than ~0.2 decades collide on the
 * log axis.
 */
export const MILESTONES = [
  { id: 'burj', name: 'Top of the Burj Khalifa', altitudeKm: 0.828 },
  { id: 'everest', name: 'Summit of Mount Everest', altitudeKm: 8.849 },
  { id: 'stratosphere', name: 'Top of the stratosphere', altitudeKm: 50 },
  { id: 'karman', name: 'The Karman line (space)', altitudeKm: 100 },
  { id: 'iss', name: 'International Space Station', altitudeKm: 408 },
  { id: 'gps', name: 'GPS satellites', altitudeKm: 20180 },
  { id: 'geo', name: 'Geostationary orbit', altitudeKm: 35786 },
];

/** Rates offered for the "how long would this take to build" stat. */
export const BUILD_RATES = [
  { id: '1', bricksPerSecond: 1, name: '1 brick per second' },
  { id: '10', bricksPerSecond: 10, name: '10 bricks per second' },
  { id: '1000', bricksPerSecond: 1000, name: '1,000 bricks per second' },
  { id: '1000000', bricksPerSecond: 1e6, name: 'A million bricks per second' },
];
