// Simple campus layout: rectangles that become rooms/areas.
// Coordinates in world pixels.

export const WORLD = { width: 2400, height: 1800 };

export type Room = {
  name: string;
  x: number;
  y: number;
  w: number;
  h: number;
  color: number;
  label?: string;
};

export const ROOMS: Room[] = [
  { name: "Main Gate", x: 1080, y: 1680, w: 240, h: 100, color: 0x8b5a2b, label: "MAIN GATE" },
  { name: "Reception", x: 900, y: 1420, w: 220, h: 160, color: 0xf4d35e, label: "Reception" },
  { name: "Assembly Ground", x: 800, y: 900, w: 800, h: 400, color: 0xa4c93f, label: "Assembly Ground" },
  { name: "Classroom 1", x: 120, y: 200, w: 220, h: 160, color: 0xf7a072, label: "Class 8A" },
  { name: "Classroom 2", x: 360, y: 200, w: 220, h: 160, color: 0xf7a072, label: "Class 8B" },
  { name: "Classroom 3", x: 600, y: 200, w: 220, h: 160, color: 0xf7a072, label: "Class 9A" },
  { name: "Science Lab", x: 840, y: 200, w: 260, h: 160, color: 0x9bd4e4, label: "Science Lab" },
  { name: "Computer Lab", x: 1120, y: 200, w: 260, h: 160, color: 0x6a89cc, label: "Computer Lab" },
  { name: "Library", x: 1400, y: 200, w: 260, h: 200, color: 0xd08770, label: "Library" },
  { name: "Canteen", x: 1700, y: 260, w: 300, h: 220, color: 0xffb454, label: "Canteen" },
  { name: "Staff Room", x: 1700, y: 520, w: 220, h: 160, color: 0xb48ead, label: "Staff Room" },
  { name: "Principal", x: 1940, y: 520, w: 200, h: 160, color: 0xbf616a, label: "Principal" },
  { name: "Basketball", x: 120, y: 900, w: 300, h: 220, color: 0xd97706, label: "Basketball" },
  { name: "Football", x: 120, y: 1180, w: 620, h: 440, color: 0x4ade80, label: "Football Field" },
  { name: "Garden", x: 1740, y: 900, w: 320, h: 260, color: 0x86efac, label: "Garden" },
  { name: "Auditorium", x: 1700, y: 1200, w: 380, h: 280, color: 0x7c3aed, label: "Auditorium" },
  { name: "Washrooms", x: 440, y: 460, w: 160, h: 100, color: 0x93c5fd, label: "WC" },
  { name: "Rooftop", x: 60, y: 60, w: 120, h: 100, color: 0x64748b, label: "Rooftop (?)" },
];

// Corridors (walkable paths, visual only)
export const CORRIDORS = [
  { x: 100, y: 400, w: 1600, h: 40, color: 0xe5e0d0 },
  { x: 100, y: 720, w: 2000, h: 40, color: 0xe5e0d0 },
  { x: 780, y: 400, w: 40, h: 500, color: 0xe5e0d0 },
  { x: 1660, y: 400, w: 40, h: 500, color: 0xe5e0d0 },
];

export const NPCS = [
  { name: "Prof. Churan", x: 950, y: 1500, color: 0xef4444 },
  { name: "Chemistry Rapper", x: 970, y: 280, color: 0x22d3ee },
  { name: "Coach Whistle", x: 430, y: 1400, color: 0xf59e0b },
  { name: "Librarian Silent", x: 1530, y: 300, color: 0x8b5cf6 },
];
