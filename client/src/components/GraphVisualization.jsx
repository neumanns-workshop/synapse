import React, { useEffect, useRef } from 'react';
import * as d3 from 'd3';
import { useGraphData } from '../context/GraphDataContext';
import { useGame, GameStatus } from '../context/GameContext';

// Helper function to determine node class based on its status
function getNodeClass(word, { startWord, endWord, currentWord, playerPath, optimalPath, suggestedPathFromCurrent, status, pathDisplayMode }) {
  let classes = ['graph-node'];
  const inPlayerPath = playerPath.includes(word);
  const inOptimalPath = status === GameStatus.GAVE_UP && optimalPath.includes(word);
  const inSuggestedPath = status === GameStatus.GAVE_UP && suggestedPathFromCurrent.includes(word);

  if (word === startWord) classes.push('start');
  if (word === endWord) classes.push('end');
  if (word === currentWord && status === GameStatus.PLAYING) classes.push('current');

  if (status === GameStatus.GAVE_UP) {
    if (inPlayerPath && (pathDisplayMode === 'player' || pathDisplayMode === 'both')) classes.push('player-path-node');
    if (inOptimalPath && (pathDisplayMode === 'optimal' || pathDisplayMode === 'both')) classes.push('optimal-path-node');
    if (inSuggestedPath && pathDisplayMode === 'suggested') classes.push('suggested-path-node');

    if (word === currentWord && pathDisplayMode === 'suggested') classes.push('current-gave-up');
  } else if (status === GameStatus.PLAYING) {
    if (inPlayerPath) classes.push('player-path-node');
  }

  return classes.join(' ');
}

// Helper function to determine link class based on its status
function getLinkClass(linkData, { status, pathDisplayMode }) {
  let classes = ['graph-link'];
  if (linkData.type === 'player') {
    classes.push('player-path-link');
    if (status === GameStatus.GAVE_UP && pathDisplayMode === 'both') {
      classes.push('dimmed');
    }
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
        if (pathDisplayMode === 'player') {
            visibleNodeIds = new Set([startWord, endWord, ...playerPath].filter(Boolean));
        } else if (pathDisplayMode === 'optimal') {
            visibleNodeIds = new Set([startWord, endWord, ...optimalPath].filter(Boolean));
        } else if (pathDisplayMode === 'suggested') {
            // Also include current word when suggested path is shown
            visibleNodeIds = new Set([startWord, endWord, currentWord, ...suggestedPathFromCurrent].filter(Boolean));
        } else { // 'both' or default
            visibleNodeIds = new Set([startWord, endWord, ...playerPath, ...optimalPath].filter(Boolean));
        }
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
        if (status !== GameStatus.GAVE_UP) return link.type === 'player'; // Only player path if playing
        if (pathDisplayMode === 'player') return link.type === 'player';
        if (pathDisplayMode === 'optimal') return link.type === 'optimal';
        if (pathDisplayMode === 'suggested') return link.type === 'suggested';
        if (pathDisplayMode === 'both') return link.type === 'player' || link.type === 'optimal';
        return false; // Should not happen
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

    const padding = 30;
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

    // -- Render Labels (Only Start, Current/End, SuggestedStart) --
    const labelsToRender = nodesToRender.filter(d => 
        d.id === startWord || 
        d.id === endWord || 
        (d.id === currentWord && status === GameStatus.PLAYING) || 
        (pathDisplayMode === 'suggested' && d.id === suggestedPathFromCurrent[0])
    );

    const labelSelection = labelGroup
        .selectAll('text.graph-label')
        .data(labelsToRender, d => d.id)
        .join(
            enter => enter.append('text')
                        .attr('class', 'graph-label')
                        .attr('x', d => d.x + 10)
                        .attr('y', d => d.y + 3)
                        .text(d => d.id),
                        // Ensure labels start visible before collision check
                        // .style('opacity', 1), // Default opacity is 1
            update => update
                      .style('opacity', 1) // Reset opacity on update
                      .call(update => update.transition().duration(500)
                          .attr('x', d => d.x + 10)
                          .attr('y', d => d.y + 3)), 
            exit => exit.remove()
        );
        
    // --- Collision Detection & Hiding --- 
    labelSelection.attr('opacity', 1); // Ensure all potentially visible labels start visible

    const labelNodes = labelSelection.nodes(); // Get the actual DOM nodes
    const labelData = labelSelection.data(); // Get the associated data
    const hiddenLabels = new Set(); // Keep track of labels we've decided to hide

    function checkOverlap(rect1, rect2) {
        // Add some padding to the check to avoid labels barely touching
        const padding = 2;
        return !(
            rect1.right < rect2.left + padding ||
            rect1.left > rect2.right - padding ||
            rect1.bottom < rect2.top + padding ||
            rect1.top > rect2.bottom - padding
        );
    }

    function getPriority(nodeData) {
        const word = nodeData.id;
        // Highest priority: Current node during play OR End node when won
        if (word === currentWord && status === GameStatus.PLAYING) return 4; 
        if (word === endWord && status === GameStatus.WON) return 4; // Give End node top priority on win
        
        // Next priority: Start node
        if (word === startWord) return 3;
        
        // Lower priority: End node (when not won - e.g., during play/gave up)
        if (word === endWord) return 2;
        
        // Lowest static label priority: Start of suggested path
        if (pathDisplayMode === 'suggested' && word === suggestedPathFromCurrent[0]) return 1; 
        
        return 0; // Should not happen for filtered static labels
    }

    if (labelNodes.length > 1) {
        const bboxes = labelNodes.map(node => node.getBBox());

        for (let i = 0; i < labelNodes.length; i++) {
            if (hiddenLabels.has(i)) continue; // Skip if already hidden

            for (let j = i + 1; j < labelNodes.length; j++) {
                if (hiddenLabels.has(j)) continue; // Skip if other label is already hidden

                if (checkOverlap(bboxes[i], bboxes[j])) {
                    const priorityI = getPriority(labelData[i]);
                    const priorityJ = getPriority(labelData[j]);

                    if (priorityI > priorityJ) {
                        d3.select(labelNodes[j]).attr('opacity', 0);
                        hiddenLabels.add(j);
                    } else if (priorityJ > priorityI) {
                        d3.select(labelNodes[i]).attr('opacity', 0);
                        hiddenLabels.add(i);
                        break; // Move to the next i, as current i is hidden
                    } else {
                        // Same priority, hide the one lower down (higher y value)?
                        if (bboxes[i].y > bboxes[j].y) {
                             d3.select(labelNodes[j]).attr('opacity', 0);
                             hiddenLabels.add(j);
                        } else {
                             d3.select(labelNodes[i]).attr('opacity', 0);
                             hiddenLabels.add(i);
                             break; // Move to next i
                        }
                    }
                }
            }
        }
    }
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