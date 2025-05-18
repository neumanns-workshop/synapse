// Utility: Dijkstra's algorithm for shortest path in the word graph
import { GraphData } from "./gameReportUtils";

export const findShortestPath = (
  graphData: GraphData | null,
  start: string,
  end: string,
): string[] => {
  if (!graphData || !graphData[start] || !graphData[end]) {
    console.error(
      `findShortestPath: Invalid graph data or start/end words (start=${start}, end=${end})`,
    );
    return [];
  }

  // Track distances from start node
  const distances: { [key: string]: number } = {};
  // Track previous nodes in optimal path
  const previousNodes: { [key: string]: string | null } = {};
  // Track nodes that have been visited
  const visited = new Set<string>();
  // Nodes to be visited (all nodes initially)
  const unvisited = new Set<string>();

  // Initialize all distances as infinity and previousNodes as null
  for (const word in graphData) {
    distances[word] = Infinity;
    previousNodes[word] = null;
    unvisited.add(word);
  }

  // Distance from start node to itself is 0
  distances[start] = 0;

  // Main Dijkstra algorithm loop
  while (unvisited.size > 0) {
    // Find unvisited node with smallest distance
    let currentNode: string | null = null;
    let minDistance = Infinity;

    for (const word of unvisited) {
      if (distances[word] < minDistance) {
        minDistance = distances[word];
        currentNode = word;
      }
    }

    // If all remaining unvisited nodes are inaccessible, or if we reached end node
    if (
      currentNode === null ||
      distances[currentNode] === Infinity ||
      currentNode === end
    ) {
      break;
    }

    // Remove current node from unvisited set and add to visited
    unvisited.delete(currentNode);
    visited.add(currentNode);

    // For each neighbor of current node
    const edges = graphData[currentNode]?.edges || {};
    for (const neighbor in edges) {
      // Skip if neighbor has been visited
      if (visited.has(neighbor)) continue;

      // Calculate new distance (similarity is between 0-1, we want cost to be small for similar words)
      const similarity = edges[neighbor];
      const cost = 1 - similarity; // Convert similarity to cost (higher similarity = lower cost)
      const tentativeDistance = distances[currentNode] + cost;

      // If this path is better than previous one
      if (tentativeDistance < distances[neighbor]) {
        distances[neighbor] = tentativeDistance;
        previousNodes[neighbor] = currentNode;
      }
    }
  }

  // Reconstruct path
  const path: string[] = [];
  let current = end;

  // If end is unreachable
  if (distances[end] === Infinity) {
    console.warn(`No path found from ${start} to ${end}`);
    return [];
  }

  // Trace back from end to start
  while (current) {
    path.unshift(current);
    current = previousNodes[current] as string;
    if (current === start) {
      path.unshift(start);
      break;
    }
  }

  return path;
};
