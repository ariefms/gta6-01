// Solara Bay — every tuning number lives here, in one place.
// Golden-hour edition: a low warm sun, saturated facades, busier streets,
// and a fog that never washes the city out.
export const CONFIG = {
  // The seed pins the city down: same seed, same streets, same buildings.
  seed: 1337,

  // Street grid: one street every BLOCK metres, GRID of them per axis.
  block: 40,
  grid: 9,
  roadWidth: 12,
  sidewalkWidth: 3,

  // Playable bounds, and where the coast begins.
  halfCity: 180,
  beachZ: 190,
  seaZ: 230,

  // Dio on foot.
  walkSpeed: 6,
  runSpeed: 11,
  playerHealth: 100,

  // Arcade car feel.
  carAccel: 26,
  carBrake: 40,
  carMaxSpeed: 42,
  carReverseMax: 12,
  carTurn: 1.9,
  carDrag: 0.6,

  // Street life: a little busier than the first build, so frames read full.
  trafficCars: 26,
  pedestrians: 34,
  trafficSpeed: 9,

  // The wanted system.
  maxWanted: 5,
  wantedDecaySeconds: 14,
  policeCruisersMax: 6,

  // Cash paid per mission, in story order.
  missionReward: [250, 400, 600, 800, 2500],

  // Rendering: warm haze, and a far fog plane so the skyline stays crisp.
  fogNear: 120,
  fogFar: 500,
  shadowSize: 2048,

  // Golden-hour palette: amber sky, honey sun, warm sand and sea.
  skyTop: 0xff9e5e,
  skyBottom: 0xffe3b3,
  sunColor: 0xffd9a0,
  seaColor: 0x1e7fa8,
  sandColor: 0xe8d29a,
  asphalt: 0x3a3f46,
  sidewalk: 0x9aa0a3,

  // Facades in saturated sunset colours: terracotta, coral, sand, teal,
  // cream, rose, sky blue and amber.
  buildingPalette: [0xcf6b3f, 0xe05a4e, 0xe8c98a, 0x2f8f8a, 0xf5e9c8, 0xc25a6e, 0x5a8fc0, 0xd9a441],
};

// The story chain, five jobs in order. Targets, pickups and timers are the
// gameplay contract; the words around them are Dio's story, all original.
export const MISSION_DEFS = [
  {
    id: 1,
    title: 'First Wheels',
    brief: 'Dio is home in Solara Bay, broke and on foot. Borrow a car — any car — and take it to the yellow marker at Coral Plaza.',
    objective: 'Borrow a car, then drive to Coral Plaza',
    target: [60, 60],
    needsCar: true,
  },
  {
    id: 2,
    title: 'Package Run',
    brief: 'Marisol has a parcel that has to cross town before the harbour bell. Pick it up at the marina and run it to the tower. Do it quick and a pistol is yours.',
    objective: 'Collect the parcel, deliver it to Solara Tower before time runs out',
    target: [-60, -60],
    pickup: [120, 140],
    timeLimit: 90,
    unlocksPistol: true,
  },
  {
    id: 3,
    title: 'Hot Pursuit',
    brief: 'The Bay Patrol has your plate. Shake them: break line of sight and keep your nose clean until the stars fade out.',
    objective: 'Lose a 3-star wanted level',
    target: [0, 0],
    wantedAtStart: 3,
  },
  {
    id: 4,
    title: 'Heist Prep',
    brief: 'The big score needs kit. Three supply crates are stashed around town — the docks, the stadium, the old market. Go get them.',
    objective: 'Collect 3 supply crates (0/3)',
    targets: [[-140, 140], [140, -100], [-20, 140]],
  },
  {
    id: 5,
    title: 'The Big Score',
    brief: 'Tonight the Bay National vault is open for one hour. Hit the bank, grab the cash, and outrun a 4-star chase back to the safehouse.',
    objective: 'Rob Bay National, then escape to the safehouse',
    target: [0, -140],
    escape: [-140, -140],
    wantedAtStart: 4,
  },
];

// The cars of Solara Bay: five procedural models, each with its own paint
// and pace. The Solaris Sport is the quick one; the truck is the slow one.
export const CAR_MODELS = [
  { name: 'Comet Sedan', color: 0x4a7fb5, topSpeed: 38, accel: 24 },
  { name: 'Bay Taxi', color: 0xf2c230, topSpeed: 36, accel: 23 },
  { name: 'Harbor Truck', color: 0x7a8a99, topSpeed: 30, accel: 18 },
  { name: 'Solaris Sport', color: 0xc23b3b, topSpeed: 48, accel: 30 },
  { name: 'Coast Cruiser', color: 0x3fae7a, topSpeed: 40, accel: 25 },
];

export const CONTROLS_TEXT =
  'WASD move / drive · Mouse orbit camera · Shift run · E enter or exit car · Space handbrake · F punch · Click shoot (after Mission 2) · M mute · Esc pause';
