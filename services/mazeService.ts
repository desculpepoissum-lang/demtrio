import { MazeGrid, Position } from "../types";

export const generateMaze = (width: number, height: number): MazeGrid => {
  // Ensure odd dimensions for walls/paths
  const rows = height % 2 === 0 ? height + 1 : height;
  const cols = width % 2 === 0 ? width + 1 : width;

  // Initialize with walls
  const maze: MazeGrid = Array(rows).fill(null).map(() => Array(cols).fill('wall'));

  const carver = (x: number, y: number) => {
    const directions = [
      { x: 0, y: -2 }, // Up
      { x: 0, y: 2 },  // Down
      { x: -2, y: 0 }, // Left
      { x: 2, y: 0 }   // Right
    ].sort(() => Math.random() - 0.5); // Shuffle directions

    directions.forEach((dir) => {
      const nx = x + dir.x;
      const ny = y + dir.y;

      if (nx > 0 && nx < cols - 1 && ny > 0 && ny < rows - 1 && maze[ny][nx] === 'wall') {
        maze[ny][nx] = 'path';         // Carve destination
        maze[y + dir.y / 2][x + dir.x / 2] = 'path'; // Carve wall between
        carver(nx, ny);
      }
    });
  };

  // Start carving from (1,1)
  maze[1][1] = 'path';
  carver(1, 1);

  return maze;
};

export const findFreePositions = (maze: MazeGrid, count: number): Position[] => {
  const freeSpots: Position[] = [];
  maze.forEach((row, y) => {
    row.forEach((cell, x) => {
      // Avoid start position (1,1) usually
      if (cell === 'path' && !(x === 1 && y === 1)) {
        freeSpots.push({ x, y });
      }
    });
  });

  // Shuffle and pick
  return freeSpots.sort(() => Math.random() - 0.5).slice(0, count);
};

// Dijkstra's Algorithm to find the next step
// Allows avoiding specific positions (like letters) by assigning them higher traversal cost
export const getNextStepTowards = (
  maze: MazeGrid, 
  start: Position, 
  target: Position,
  highCostPositions: Position[] = []
): Position => {
  const h = maze.length;
  const w = maze[0].length;
  
  // Create a cost set for O(1) lookup
  const highCostSet = new Set(highCostPositions.map(p => `${p.x},${p.y}`));

  // Priority Queue structure: { pos, cost, firstStep }
  // We'll use a simple array and sort it because the grid is small (max 25x25)
  const pq: { pos: Position; cost: number; firstStep: Position | null }[] = [
    { pos: start, cost: 0, firstStep: null }
  ];

  // Track min cost to reach each cell
  const minCosts = new Map<string, number>();
  minCosts.set(`${start.x},${start.y}`, 0);

  const directions = [
    { x: 0, y: -1 }, { x: 0, y: 1 }, { x: -1, y: 0 }, { x: 1, y: 0 }
  ];

  while (pq.length > 0) {
    // Sort descending to pop the lowest cost from end (stack behavior)
    pq.sort((a, b) => b.cost - a.cost);
    const { pos, cost, firstStep } = pq.pop()!;

    // If we reached target, return the first step taken
    if (pos.x === target.x && pos.y === target.y) {
      return firstStep || start;
    }

    // Explore neighbors
    for (const dir of directions) {
      const nx = pos.x + dir.x;
      const ny = pos.y + dir.y;
      const key = `${nx},${ny}`;

      // Check bounds and walls
      if (
        nx >= 0 && nx < w &&
        ny >= 0 && ny < h &&
        maze[ny][nx] !== 'wall'
      ) {
        // Calculate new cost
        // Base move cost = 1
        // High cost penalty = 10 (Encourages going around unless detour is huge)
        const isHighCost = highCostSet.has(key) && !(nx === target.x && ny === target.y);
        const newCost = cost + 1 + (isHighCost ? 10 : 0);

        if (!minCosts.has(key) || newCost < minCosts.get(key)!) {
          minCosts.set(key, newCost);
          // Inherit firstStep, or if it's the first move, set it
          const nextFirstStep = firstStep || { x: nx, y: ny };
          pq.push({ pos: { x: nx, y: ny }, cost: newCost, firstStep: nextFirstStep });
        }
      }
    }
  }

  // Fallback: stay put if no path
  return start;
};