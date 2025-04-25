import React, { useEffect, useRef } from 'react';
import * as d3 from 'd3';
import { useGraphData } from '../context/GraphDataContext';
import { useGame, GameStatus } from '../context/GameContext';

// Helper function to determine node class based on its status
function getNodeClass(word, { startWord, endWord, currentWord, playerPath, optimalPath, suggestedPathFromCurrent, status, pathDisplayMode }) {
  let classes = ['graph-node'];
  const inPlayerPath = playerPath.includes(word);
  const inOptimalPath = optimalPath.includes(word);
  const inSuggestedPath = suggestedPathFromCurrent.includes(word);

  if (word === startWord) classes.push('start');
  if (word === endWord) classes.push('end');
  if (word === currentWord && status === GameStatus.PLAYING) classes.push('current');

  // Apply path classes based on mode for GAVE_UP state
  if (status === GameStatus.GAVE_UP) {
    if (inPlayerPath && (pathDisplayMode === 'player' || pathDisplayMode === 'player_optimal' || pathDisplayMode === 'player_suggested')) {
      classes.push('player-path-node');
    }
    if (inOptimalPath && (pathDisplayMode === 'optimal' || pathDisplayMode === 'player_optimal' || pathDisplayMode === 'optimal_suggested')) {
      classes.push('optimal-path-node');
    }
    if (inSuggestedPath && (pathDisplayMode === 'suggested' || pathDisplayMode === 'player_suggested' || pathDisplayMode === 'optimal_suggested')) {
      classes.push('suggested-path-node');
    }

    // Specific styling for current node when suggested path is active
    if (word === currentWord && (pathDisplayMode === 'suggested' || pathDisplayMode === 'player_suggested' || pathDisplayMode === 'optimal_suggested')) {
      classes.push('current-gave-up'); // Potentially overrides other fills if CSS is specific
    }
  } else if (status === GameStatus.PLAYING || status === GameStatus.WON) {
    // Apply player path styling during play or on win screen
    if (inPlayerPath) classes.push('player-path-node');
  }

  return classes.join(' ');
}

// Helper function to determine link class based on its status
function getLinkClass(linkData, { status, pathDisplayMode }) {
  let classes = ['graph-link'];
  // Just apply the base class for the type. CSS handles the visual distinction.
  if (linkData.type === 'player') {
    classes.push('player-path-link');
    // REMOVED Dimming logic: rely on distinct path styles
    // if (status === GameStatus.GAVE_UP && pathDisplayMode === 'player_optimal') {
    //   classes.push('dimmed');
    // }
  } else if (linkData.type === 'optimal') {
    classes.push('optimal-path-link');
  } else if (linkData.type === 'suggested') {
    classes.push('suggested-path-link');
  }
  return classes.join(' ');
}

function GraphVisualization({ pathDisplayMode, onNodeClick }) {
  const { graphData } = useGraphData();
  const gameContext = useGame(); // Get the whole context
  const { status, startWord, endWord, currentWord, playerPath, optimalPath, suggestedPathFromCurrent } = gameContext;
  const svgRef = useRef(null);

  // --- D3 Rendering Logic --- 
  useEffect(() => {
    if (!graphData || !graphData.nodes || !svgRef.current || status === GameStatus.IDLE || status === GameStatus.LOADING) {
      // Clear SVG if not ready or idle
      d3.select(svgRef.current).selectAll('*').remove();
      return;
    }
    
    // 1. Prepare data for D3 (Nodes and Links)
    let wordsInvolved = new Set([startWord, endWord, currentWord].filter(Boolean));
    playerPath.forEach(word => wordsInvolved.add(word));
  if (status === GameStatus.GAVE_UP) {
        optimalPath.forEach(word => wordsInvolved.add(word));
        suggestedPathFromCurrent.forEach(word => wordsInvolved.add(word));
  }

    const nodeMap = new Map();
  let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
    wordsInvolved.forEach(word => {
    const node = graphData.nodes[word];
    if (node && node.tsne) {
      const [x, y] = node.tsne;
            nodeMap.set(word, { id: word, x, y }); // D3 often uses 'id'
      minX = Math.min(minX, x);
      maxX = Math.max(maxX, x);
      minY = Math.min(minY, y);
      maxY = Math.max(maxY, y);
    } else {
         console.warn(`Node data or tsne coords missing for word: ${word}`);
      }
    });

    if (nodeMap.size === 0) {
        d3.select(svgRef.current).selectAll('*').remove(); // Clear if no nodes
        return;
    }

    // -- Determine Visible Nodes based on mode --
    let visibleNodeIds = new Set();
    if (status === GameStatus.PLAYING) {
        visibleNodeIds = new Set([startWord, endWord, currentWord, ...playerPath].filter(Boolean));
    } else if (status === GameStatus.GAVE_UP) {
        // Base nodes for gave up state
        const baseNodes = new Set([startWord, endWord].filter(Boolean));
        playerPath.forEach(word => baseNodes.add(word)); // Always include player path nodes initially?

        if (pathDisplayMode === 'player') {
            playerPath.forEach(word => visibleNodeIds.add(word));
        } else if (pathDisplayMode === 'optimal') {
            optimalPath.forEach(word => visibleNodeIds.add(word));
        } else if (pathDisplayMode === 'suggested') {
            // Also include current word when suggested path is shown
            suggestedPathFromCurrent.forEach(word => visibleNodeIds.add(word));
            if (currentWord) visibleNodeIds.add(currentWord); // Ensure current is visible
        } else if (pathDisplayMode === 'player_optimal') { // Changed from 'both'
            playerPath.forEach(word => visibleNodeIds.add(word));
            optimalPath.forEach(word => visibleNodeIds.add(word));
        } else if (pathDisplayMode === 'player_suggested') {
            playerPath.forEach(word => visibleNodeIds.add(word));
            suggestedPathFromCurrent.forEach(word => visibleNodeIds.add(word));
            if (currentWord) visibleNodeIds.add(currentWord); // Ensure current is visible
        } else if (pathDisplayMode === 'optimal_suggested') {
            optimalPath.forEach(word => visibleNodeIds.add(word));
            suggestedPathFromCurrent.forEach(word => visibleNodeIds.add(word));
            if (currentWord) visibleNodeIds.add(currentWord); // Ensure current is visible
        } else { // Default (could be player? or player_optimal?)
            playerPath.forEach(word => visibleNodeIds.add(word));
            optimalPath.forEach(word => visibleNodeIds.add(word));
        }
        // Always ensure start and end words are visible
        if (startWord) visibleNodeIds.add(startWord);
        if (endWord) visibleNodeIds.add(endWord);
    } else if (status === GameStatus.WON) {
        // Show Start, End, and the full player path upon winning
        visibleNodeIds = new Set([startWord, endWord, ...playerPath].filter(Boolean));
    } else { // IDLE, LOADING, ERROR
        // Show only Start and End before game starts or on error
        visibleNodeIds = new Set([startWord, endWord].filter(Boolean));
    }

    // Filter the nodes from nodeMap based on visibility
    const nodesToRender = Array.from(nodeMap.values()).filter(node => visibleNodeIds.has(node.id));
    
    // --- DEBUG LOG --- 
    const startNodeInData = nodesToRender.find(node => node.id === startWord);
    if (!startNodeInData && nodesToRender.length > 0 && (status === GameStatus.PLAYING || status === GameStatus.GAVE_UP)) { // Check if nodesToRender isn't just empty
      console.warn(`BUG CHECK: startWord (${startWord}) is MISSING from nodesToRender array!`);
      console.log('nodesToRender:', nodesToRender);
    }
    // --- END DEBUG --- 

    // -- Calculate Links (based on original paths, filtering happens during D3 join or here) --
    const links = [];
    // Player Path Links (always calculate, filter visibility with CSS/D3 join)
    for (let i = 1; i < playerPath.length; i++) {
        const sourceNode = nodeMap.get(playerPath[i - 1]);
        const targetNode = nodeMap.get(playerPath[i]);
        if (sourceNode && targetNode) {
            links.push({ source: sourceNode, target: targetNode, type: 'player' });
        }
    }
    // Optimal Path Links (always calculate if GAVE_UP, filter visibility with CSS/D3 join)
    if (status === GameStatus.GAVE_UP && optimalPath.length > 0) {
        for (let i = 1; i < optimalPath.length; i++) {
            const sourceNode = nodeMap.get(optimalPath[i - 1]);
            const targetNode = nodeMap.get(optimalPath[i]);
            if (sourceNode && targetNode) {
                links.push({ source: sourceNode, target: targetNode, type: 'optimal' });
            }
        }
    }
    // Suggested Path Links (always calculate if GAVE_UP, filter visibility with CSS/D3 join)
    if (status === GameStatus.GAVE_UP && suggestedPathFromCurrent.length > 0) {
        for (let i = 1; i < suggestedPathFromCurrent.length; i++) {
            const sourceNode = nodeMap.get(suggestedPathFromCurrent[i - 1]);
            const targetNode = nodeMap.get(suggestedPathFromCurrent[i]);
            if (sourceNode && targetNode) {
                links.push({ source: sourceNode, target: targetNode, type: 'suggested' });
            }
        }
    }
    // Filter links based on pathDisplayMode *before* binding
    const linksToRender = links.filter(link => {
        if (status !== GameStatus.GAVE_UP) return link.type === 'player'; // Only player path if playing or won
        // Handle GAVE_UP states
        if (pathDisplayMode === 'player') return link.type === 'player';
        if (pathDisplayMode === 'optimal') return link.type === 'optimal';
        if (pathDisplayMode === 'suggested') return link.type === 'suggested';
        if (pathDisplayMode === 'player_optimal') return link.type === 'player' || link.type === 'optimal';
        if (pathDisplayMode === 'player_suggested') return link.type === 'player' || link.type === 'suggested';
        if (pathDisplayMode === 'optimal_suggested') return link.type === 'optimal' || link.type === 'suggested';

        return false; // Default: should not happen if mode is set correctly
    });

    // 2. Calculate viewBox (use nodesToRender for bounds)
    // Recalculate bounds based only on visible nodes
    minX = Infinity; maxX = -Infinity; minY = Infinity; maxY = -Infinity;
    if (nodesToRender.length > 0) {
        nodesToRender.forEach(node => {
            minX = Math.min(minX, node.x);
            maxX = Math.max(maxX, node.x);
            minY = Math.min(minY, node.y);
            maxY = Math.max(maxY, node.y);
        });
    } else {
        // Handle case with no visible nodes? Default viewbox?
        minX = -50; maxX = 50; minY = -50; maxY = 50; // Example default
    }

    // Make padding responsive
    const currentSvgWidth = svgRef.current?.clientWidth || 500; // Get current SVG width or default
    const padding = currentSvgWidth < 480 ? 15 : 30; // Use smaller padding on small screens

    const width = (maxX - minX) + 2 * padding;
    const height = (maxY - minY) + 2 * padding;
    const svgWidth = width > 0 ? width : 100; // Ensure non-zero width
    const svgHeight = height > 0 ? height : 100; // Ensure non-zero height
    const viewBox = `${minX - padding} ${minY - padding} ${svgWidth} ${svgHeight}`;

    // 3. D3 Selection and Rendering
    const svg = d3.select(svgRef.current);
    svg.attr('viewBox', viewBox);

    // Use groups for organization
    const linkGroup = svg.select('g.links').node() ? svg.select('g.links') : svg.append('g').attr('class', 'links');
    const nodeGroup = svg.select('g.nodes').node() ? svg.select('g.nodes') : svg.append('g').attr('class', 'nodes');
    const labelGroup = svg.select('g.labels').node() ? svg.select('g.labels') : svg.append('g').attr('class', 'labels');

    // -- Render Links --
    linkGroup
      .selectAll('line.graph-link')
      .data(linksToRender, d => `${d.source.id}-${d.target.id}-${d.type}`) // Use filtered links
      .join(
        enter => enter.append('line')
                    .attr('x1', d => d.source.x)
                    .attr('y1', d => d.source.y)
                    .attr('x2', d => d.target.x)
                    .attr('y2', d => d.target.y)
                    .attr('class', d => getLinkClass(d, { status, pathDisplayMode })) // Apply dynamic class
                    .style('opacity', 0) // Start transparent for transition
                    .call(enter => enter.transition().duration(500).style('opacity', 1)), // Fade in
        update => update
                    .attr('class', d => getLinkClass(d, { status, pathDisplayMode })) // Update class if mode changes
                    .call(update => update.transition().duration(500) // Optional: transition existing links if needed
                        .attr('x1', d => d.source.x)
                        .attr('y1', d => d.source.y)
                        .attr('x2', d => d.target.x)
                        .attr('y2', d => d.target.y)),
        exit => exit
                .call(exit => exit.transition().duration(500).style('opacity', 0).remove()) // Fade out and remove
      );

    // -- Render Nodes --
    nodeGroup
      .selectAll('circle.graph-node')
      .data(nodesToRender, d => d.id)
      .join(
        enter => enter.append('circle')
                    .attr('transform', d => `translate(${d.x},${d.y})`)
                    .attr('r', 0)
                    .attr('class', d => getNodeClass(d.id, gameContext))
                    // ADDED: onclick handler (function will be passed via props)
                    .on('click', (event, d) => {
                        if (onNodeClick) { // Check if the handler prop exists
                          onNodeClick(d.id); // Call the passed handler with the word
                        }
                     })
                    .style('cursor', 'pointer') // Indicate clickability (move to CSS later)
                    .call(enter => enter.transition().duration(500).attr('r', 5)),
        update => update
                    .attr('class', d => getNodeClass(d.id, gameContext))
                    // Make sure click handler is attached to updated nodes too
                    .on('click', (event, d) => {
                        if (onNodeClick) {
                           onNodeClick(d.id);
                        }
                     })
                     .style('cursor', 'pointer') // Ensure cursor style on update
                    .call(update => update.transition().duration(500)
                        .attr('transform', d => `translate(${d.x},${d.y})`)),
        exit => exit
                .call(exit => exit.transition().duration(500).attr('r', 0).remove())
      );

    // -- Render Labels (Only Start, Current(if different from Start), End, SuggestedStart) --
    const labelsToRender = nodesToRender.filter(d => 
        d.id === startWord || 
        d.id === endWord || 
        (d.id === currentWord && status === GameStatus.PLAYING && currentWord !== startWord) || // Only show current if it's moved
        (pathDisplayMode === 'suggested' && d.id === suggestedPathFromCurrent[0]) ||
        (pathDisplayMode === 'player_suggested' && d.id === suggestedPathFromCurrent[0]) || // Label start of suggested
        (pathDisplayMode === 'optimal_suggested' && d.id === suggestedPathFromCurrent[0])   // Label start of suggested
    );

    const labelSelection = labelGroup
        .selectAll('text.graph-label')
        .data(labelsToRender, d => d.id)
        .join(
            enter => enter.append('text')
                        .attr('class', 'graph-label')
                        .attr('x', d => d.x + 12)
                        .attr('y', d => d.y + 3)
                        .text(d => d.id),
            update => update
                      .style('opacity', 1)
                      .call(update => update.transition().duration(500)
                          .attr('x', d => d.x + 12)
                          .attr('y', d => d.y + 3)), 
            exit => exit.remove()
        );
        
    // --- Collision Detection & Hiding --- 
    // Restore collision detection logic
    // /*
    labelSelection.attr('opacity', 1); // Ensure all labels are initially visible before checking

    const labelNodes = labelSelection.nodes();
    const labelBoxes = labelNodes.map(node => node.getBBox());
    const hiddenLabels = new Set();

    // Define priority for labels (higher value = less likely to be hidden)
    function getPriority(nodeData) {
        const word = nodeData.id;
        
        // Highest priority: Current node (only shown when != start)
        if (word === currentWord && status === GameStatus.PLAYING && currentWord !== startWord) return 5; 

        // Next highest priority: Start and End nodes
        if (word === endWord) return 4; 
        if (word === startWord) return 4; 
        
        // Lower priority: Start of suggested path
        if (pathDisplayMode === 'suggested' && word === suggestedPathFromCurrent[0]) return 2; 
        
        return 0; // Default/fallback
    }
    
    // Simple Axis-Aligned Bounding Box (AABB) collision detection
    // Sort labels by priority (descending) then y-coordinate (ascending) for consistent hiding
    const sortedIndices = labelNodes.map((_, i) => i).sort((a, b) => {
        const priorityA = getPriority(labelSelection.data()[a]);
        const priorityB = getPriority(labelSelection.data()[b]);
        if (priorityB !== priorityA) {
            return priorityB - priorityA; // Higher priority first
        }
        // Tie-breaker: lower y-coordinate first (top-most on screen)
        return labelBoxes[a].y - labelBoxes[b].y; 
    });

    for (let i = 0; i < sortedIndices.length; i++) {
        const index1 = sortedIndices[i];
        if (hiddenLabels.has(index1)) continue; // Skip if already hidden

        const box1 = labelBoxes[index1];

        for (let j = i + 1; j < sortedIndices.length; j++) {
            const index2 = sortedIndices[j];
            if (hiddenLabels.has(index2)) continue;

            const box2 = labelBoxes[index2];

            // Check for overlap (AABB)
            const overlap = !(box1.x + box1.width < box2.x || 
                              box1.x > box2.x + box2.width || 
                              box1.y + box1.height < box2.y || 
                              box1.y > box2.y + box2.height);

            if (overlap) {
                // Hide the label with lower priority (which will be index2 due to sorting)
                 hiddenLabels.add(index2);
            }
        }
    }

    // Apply visibility based on collision results
    labelSelection.style('opacity', (_, i) => hiddenLabels.has(i) ? 0 : 1);
    // */ 
    // --- End Collision Detection ---

  // Dependency array: Re-run D3 code when these change
  }, [graphData, status, currentWord, playerPath, optimalPath, suggestedPathFromCurrent, pathDisplayMode, gameContext, startWord, endWord]);

  return (
    <div className="graph-svg-wrapper">
      <svg ref={svgRef} width="100%" height="400" style={{ overflow: 'visible' }}>
        {/* D3 will manage content here - links, nodes, labels groups */}
      </svg>
    </div>
  );
}

export default GraphVisualization; 