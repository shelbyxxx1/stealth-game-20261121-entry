// Lantern Row — the three levels. One job: where everything is.
// Coordinates are tiles (40 px each, 32 x 20). Walls and stalls are solid and
// block both movement and sight; lanterns light the floor around them; the
// canal is solid water; the exit is the boat the player must reach.
// Guard patrol segments run down clear lanes: no segment crosses a solid tile.
function wall(x, y, w, h) {
  return { x, y, w, h, kind: 'wall' };
}
function stall(x, y, w, h) {
  return { x, y, w, h, kind: 'stall' };
}
function canal(x, y, w, h) {
  return { x, y, w, h, kind: 'canal' };
}
function at(x, y) {
  return { x, y };
}

export const LEVELS = [
  {
    name: 'Lantern Row',
    sub: 'The market lane — recover 2 ledgers, then reach the boat',
    seed: 101,
    walls: [
      // Market stalls in three bands, leaving lanes between them.
      stall(4, 3, 3, 2), stall(10, 3, 3, 2), stall(18, 3, 3, 2), stall(24, 3, 3, 2),
      stall(4, 9, 3, 2), stall(10, 9, 3, 2), stall(18, 9, 3, 2), stall(24, 9, 3, 2),
      stall(4, 15, 3, 2), stall(10, 15, 3, 2), stall(18, 15, 3, 2), stall(24, 15, 3, 2),
      canal(0, 19, 32, 1),
    ],
    lanterns: [at(8, 2), at(15, 6), at(22, 2), at(8, 12), at(15, 16), at(22, 12), at(28, 6)],
    ledgers: [at(22, 5), at(6, 17)],
    exit: at(29, 18),
    player: at(2, 2),
    guards: [
      { waypoints: [at(8, 6), at(8, 13), at(15, 13), at(15, 6)], captain: false },
      { waypoints: [at(22, 6), at(22, 13), at(29, 13), at(29, 6)], captain: false },
      { waypoints: [at(16, 4), at(16, 15)], captain: false },
    ],
  },
  {
    name: 'The Spice Warehouses',
    sub: 'Canal-side warehouses — recover 3 ledgers, then reach the boat',
    seed: 202,
    walls: [
      // Warehouse blocks, top and bottom rows, with corridors between them.
      wall(3, 2, 7, 6), wall(14, 2, 7, 6), wall(23, 2, 6, 6),
      wall(3, 12, 7, 6), wall(14, 12, 7, 6), wall(23, 12, 6, 6),
      canal(31, 0, 1, 20),
    ],
    lanterns: [at(11, 4), at(22, 4), at(11, 9), at(22, 9), at(11, 15), at(22, 15), at(16, 9)],
    ledgers: [at(5, 10), at(26, 10), at(16, 18)],
    exit: at(30, 10),
    player: at(2, 10),
    guards: [
      { waypoints: [at(11, 2), at(11, 18)], captain: false },
      { waypoints: [at(22, 2), at(22, 18)], captain: false },
      { waypoints: [at(14, 9), at(28, 9)], captain: false },
      { waypoints: [at(15, 10), at(19, 10)], captain: false },
      { waypoints: [at(30, 4), at(30, 16)], captain: false },
    ],
  },
  {
    name: "The Captain's Yard",
    sub: 'A bright yard, little shadow — recover 4 ledgers, then reach the boat',
    seed: 303,
    walls: [
      // Crates and bars that split the yard into lanes.
      wall(8, 2, 1, 6), wall(8, 12, 1, 6),
      wall(16, 2, 1, 6), wall(16, 12, 1, 6),
      wall(24, 2, 1, 6), wall(24, 12, 1, 6),
      stall(6, 9, 3, 1), stall(14, 9, 3, 1), stall(22, 9, 3, 1),
      stall(6, 5, 2, 1), stall(14, 14, 2, 1), stall(22, 5, 2, 1), stall(26, 14, 2, 1),
      canal(0, 19, 32, 1),
    ],
    lanterns: [at(4, 6), at(12, 6), at(20, 6), at(28, 6), at(4, 13), at(12, 13), at(20, 13), at(28, 13)],
    ledgers: [at(3, 3), at(29, 3), at(3, 17), at(29, 17)],
    exit: at(16, 18),
    player: at(16, 1),
    guards: [
      { waypoints: [at(17, 8), at(17, 11)], captain: true },
      { waypoints: [at(4, 2), at(4, 18)], captain: false },
      { waypoints: [at(12, 2), at(12, 18)], captain: false },
      { waypoints: [at(20, 2), at(20, 18)], captain: false },
      { waypoints: [at(28, 2), at(28, 18)], captain: false },
      { waypoints: [at(2, 10), at(30, 10)], captain: false },
    ],
  },
];
