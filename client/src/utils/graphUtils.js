/**
 * Finds the shortest path between two nodes in a graph using Dijkstra's algorithm.
 *
 * @param {object} graphNodes The graph data, specifically the 'nodes' object.
 * @param {string} startWord The starting word node.
 * @param {string} endWord The target word node.
 * @returns {{path: string[] | null, distance: number}} An object containing the shortest path (array of words)
 *                                                      and the total distance (cost), or null path and Infinity distance if no path exists.
 */
export function findShortestPath(graphNodes, startWord, endWord) {
  if (!graphNodes[startWord] || !graphNodes[endWord]) {
    console.error("Start or end word not found in graph");
    return { path: null, distance: Infinity };
  }

  const distances = {}; // Stores shortest distance from startWord to each node
  const previousNodes = {}; // Stores the preceding node in the shortest path
  const visited = new Set(); // Stores nodes whose shortest path is finalized
  const queue = new Set(); // Nodes to visit (acting as a simple priority queue)

  // Initialize distances
  for (const node in graphNodes) {
    distances[node] = Infinity;
    previousNodes[node] = null;
    queue.add(node);
  }
  distances[startWord] = 0;

  while (queue.size > 0) {
    // Find the node with the smallest distance among those in the queue
    let closestNode = null;
    let minDistance = Infinity;
    for (const node of queue) {
      if (distances[node] < minDistance) {
        minDistance = distances[node];
        closestNode = node;
      }
    }

    if (closestNode === null || distances[closestNode] === Infinity) {
      break; // No reachable nodes left or remaining nodes are unreachable
    }

    queue.delete(closestNode);
    visited.add(closestNode);

    // If we reached the end word, we can stop early
    if (closestNode === endWord) {
      break;
    }

    // Update distances for neighbors
    const neighbors = graphNodes[closestNode]?.edges || {};
    for (const neighbor in neighbors) {
      if (visited.has(neighbor) || !graphNodes[neighbor]) continue; // Skip visited or non-existent neighbors

      const similarity = neighbors[neighbor];
      const cost = 1 - similarity; // Convert similarity to cost
      const distanceThroughClosest = distances[closestNode] + cost;

      if (distanceThroughClosest < distances[neighbor]) {
        distances[neighbor] = distanceThroughClosest;
        previousNodes[neighbor] = closestNode;
        // If using a real priority queue, would update priority here
      }
    }
  }

  // Reconstruct path if endWord was reached
  if (distances[endWord] === Infinity) {
    return { path: null, distance: Infinity }; // No path found
  }

  const path = [];
  let currentNode = endWord;
  while (currentNode !== null) {
    path.unshift(currentNode);
    currentNode = previousNodes[currentNode];
  }

  // Check if the path starts with the startWord (it should if a path exists)
  if (path[0] === startWord) {
    return { path, distance: distances[endWord] };
  } else {
    // This case should theoretically not happen if distance isn't Infinity,
    // but added as a safeguard.
    console.error("Path reconstruction failed.");
    return { path: null, distance: Infinity };
  }
} 