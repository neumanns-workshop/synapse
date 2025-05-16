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

// --- Helper for Euclidean Distance (Squared) ---
// Moved from GameContext/GameReportUtils
export function calculateDistanceSquared(coord1, coord2) {
    if (!coord1 || !coord2 || coord1.length !== 2 || coord2.length !== 2) {
      return Infinity; // Treat missing coords as infinitely far
    }
    const dx = coord1[0] - coord2[0];
    const dy = coord1[1] - coord2[1];
    return dx * dx + dy * dy;
}

// --- Find Valid Word Pair Function --- 
const MAX_PAIR_FINDING_ATTEMPTS = 200;

export function findValidWordPair(nodes, constraints) {
    const {
        minPathMoves = 3,
        maxPathMoves = 8,
        minCoordDistanceSquared = 900, // Default 30*30
        minNodeDegree = 2
    } = constraints;

    const allWords = Object.keys(nodes);
    if (allWords.length < 2) {
      console.error('Not enough words in the graph to find a pair.');
      return null; // Or throw error
    }

    let attempts = 0;
    while (attempts < MAX_PAIR_FINDING_ATTEMPTS) {
      attempts++;
      // Select two distinct random words
      let randomIndex1 = Math.floor(Math.random() * allWords.length);
      let randomIndex2 = Math.floor(Math.random() * allWords.length);
      while (randomIndex1 === randomIndex2) {
        randomIndex2 = Math.floor(Math.random() * allWords.length);
      }
      const potentialStart = allWords[randomIndex1];
      const potentialEnd = allWords[randomIndex2];

      // Check node degrees
      const startNodeData = nodes[potentialStart];
      const endNodeData = nodes[potentialEnd];
      const startDegree = startNodeData?.edges ? Object.keys(startNodeData.edges).length : 0;
      const endDegree = endNodeData?.edges ? Object.keys(endNodeData.edges).length : 0;

      if (startDegree < minNodeDegree || endDegree < minNodeDegree) {
        continue; 
      }

      // Check path length
      const result = findShortestPath(nodes, potentialStart, potentialEnd);
      const moves = result.path ? result.path.length - 1 : 0;
      
      if (result.path && moves >= minPathMoves && moves <= maxPathMoves) {
        // Check visual distance
        if (startNodeData?.tsne && endNodeData?.tsne) {
          const distSq = calculateDistanceSquared(startNodeData.tsne, endNodeData.tsne);

          if (distSq >= minCoordDistanceSquared) {
            // Check for alternate approach near the end
            let hasAlternateApproach = false;
            if (result.path.length >= 2) {
              const penultimateNode = result.path[result.path.length - 2];
              const penultimateNeighbors = nodes[penultimateNode]?.edges;
              if (penultimateNeighbors) {
                for (const neighbor of Object.keys(penultimateNeighbors)) {
                  if (neighbor !== potentialEnd) {
                    const neighborNodeData = nodes[neighbor];
                    if (neighborNodeData?.edges && neighborNodeData.edges[potentialEnd]) {
                      hasAlternateApproach = true;
                      break;
                    }
                  }
                }
              }
            }
            
            if (hasAlternateApproach) {
             // Valid pair found!
             return { 
                 startWord: potentialStart, 
                 endWord: potentialEnd, 
                 path: result.path, 
                 distance: result.distance, 
                 moves 
             };
            } 
          } 
        } 
      } 
    } // end while loop

    // Failed to find a pair after max attempts
    console.error(`Could not find a suitable word pair after ${MAX_PAIR_FINDING_ATTEMPTS} attempts.`);
    return null;
}

// Add other graph-related utilities here if needed 