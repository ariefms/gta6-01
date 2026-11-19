// Solara Bay — every tuning number in one place. Golden-hour edition:
// low warm sun, long shadows, saturated facades, busier streets.
export const CONFIG = {
  seed: 1337,

  // City grid: a street every BLOCK metres, GRID streets on each axis.
  block: 40,
  grid: 9,
  roadWidth: 12,
  sidewalkWidth: 3,

  // Playable bounds and the coast.
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

  // Street life — a little busier than v1 so the frames read full.
  trafficCars: 26,
  pedestrians: 34,
  trafficSpeed: 9,

  // Wanted level.
  maxWanted: 5,
  wantedDecaySeconds: 14,
  policeCruisersMax: 6,

  // Cash per mission, in story order.
  missionReward: [250, 400, 600, 800, 2500],

  // Golden-hour rendering: warm haze, far fog so the city never washes out.
  fogNear: 120,
  fogFar: 500,
  shadowSize: 2048,

  // Golden-hour palette.
  skyTop: 0xff9e5e,
  skyBottom: 0xffe3b3,
  sunColor: 0xffd9a0,
  seaColor: 0x1e7fa8,
  sandColor: 0xe8d29a,
  asphalt: 0x3a3f46,
  sidewalk: 0x9aa0a3,

  // Saturated facades: terracotta, coral, sand, teal, cream, sunset.
  buildingPalette: [0xe07840, 0xd94f30, 0xe8b48c, 0x2e8f8a, 0xf2e3c6, 0xc25a7a, 0x4a7fb5, 0xd8a03c],
};

// The five-mission story chain. All names, briefings and targets are original.
export const MISSION_DEFS = [
  {
    id: 1,
    title: 'First Wheels',
    brief: 'Dio is back in Solara Bay with empty pockets. Steal a car and drive to the yellow marker at Coral Plaza.',
    objective: 'Steal a car, then drive to Coral Plaza',
    target: [60, 60],
    needsCar: true,
  },
  {
    id: 2,
    title: 'Package Run',
    brief: 'Marisol needs a parcel across town before the harbour bell. Pick it up at the marina, deliver it to the tower — fast. Finish this and a pistol is yours.',
    objective: 'Collect the parcel, deliver it to Solara Tower before time runs out',
    target: [-60, -60],
    pickup: [120, 140],
    timeLimit: 90,
    unlocksPistol: true,
  },
  {
    id: 3,
    title: 'Hot Pursuit',
    brief: 'The Bay Patrol is on your tail. Lose the heat: break line of sight and stay out of trouble until the stars fade.',
    objective: 'Lose a 3-star wanted level',
    target: [0, 0],
    wantedAtStart: 3,
  },
  {
    id: 4,
    title: 'Heist Prep',
    brief: 'The big score needs gear. Collect three supply crates stashed around the city — the docks, the stadium, the old market.',
    objective: 'Collect 3 supply crates (0/3)',
    targets: [[-140, 140], [140, -100], [-20, 140]],
  },
  {
    id: 5,
    title: 'The Big Score',
    brief: 'Tonight the Bay National vault opens for one hour. Reach the bank, grab the cash, and escape a 4-star chase to the safehouse.',
    objective: 'Rob Bay National, then escape to the safehouse',
    target: [0, -140],
    escape: [-140, -140],
    wantedAtStart: 4,
  },
];

// Car models. Colours and top speeds are what make each one read on screen.
export const CAR_MODELS = [
  { name: 'Comet Sedan', color: 0x4a7fb5, topSpeed: 38, accel: 24 },
  { name: 'Bay Taxi', color: 0xf2c230, topSpeed: 36, accel: 23 },
  { name: 'Harbor Truck', color: 0x7a8a99, topSpeed: 30, accel: 18 },
  { name: 'Solaris Sport', color: 0xc23b3b, topSpeed: 48, accel: 30 },
  { name: 'Coast Cruiser', color: 0x3fae7a, topSpeed: 40, accel: 25 },
];

export const CONTROLS_TEXT =
  'WASD move / drive · Mouse orbit camera · Shift run · E enter or exit car · Space handbrake · F punch · Click shoot (after Mission 2) · M mute · Esc pause';
