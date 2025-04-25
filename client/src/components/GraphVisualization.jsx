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

  if (status === GameStatus.GAVE_UP) {
    if (inPlayerPath && pathDisplayMode?.player) {
      classes.push('player-path-node');
    }
    if (inOptimalPath && pathDisplayMode?.optimal) {
      classes.push('optimal-path-node');
    }
    if (inSuggestedPath && pathDisplayMode?.suggested) {
      classes.push('suggested-path-node');
    }
    if (word === currentWord && pathDisplayMode?.suggested) {
      classes.push('current-gave-up');
    }
  } else if (status === GameStatus.PLAYING || status === GameStatus.WON) {
    if (inPlayerPath) classes.push('player-path-node');
  }

  return classes.join(' ');
}

// Helper function to determine link class based on its status
function getLinkClass(linkData) {
  let classes = ['graph-link'];
  if (linkData.type === 'player') {
    classes.push('player-path-link');
  } else if (linkData.type === 'optimal') {
    classes.push('optimal-path-link');
  } else if (linkData.type === 'suggested') {
    classes.push('suggested-path-link');
  }
  return classes.join(' ');
}

// Helper function to determine label priority
function getPriority(nodeData, { currentWord, startWord, endWord, suggestedPathFromCurrent}) {
    const word = nodeData.id;
    
    if (word === currentWord && currentWord !== startWord) return 5; 

    if (word === endWord) return 4; 
    if (word === startWord) return 4; 
    
    if (suggestedPathFromCurrent && suggestedPathFromCurrent.length > 0 && word === suggestedPathFromCurrent[0]) return 2; 
    
    return 0;
}

// --- Rendering Functions --- 

function renderLinks(linkGroup, linksToRender) {
  linkGroup
    .selectAll('line.graph-link')
    .data(linksToRender, d => `${d.source.id}-${d.target.id}-${d.type}`)
    .join(
      enter => enter.append('line')
                  .attr('x1', d => d.source.x)
                  .attr('y1', d => d.source.y)
                  .attr('x2', d => d.target.x)
                  .attr('y2', d => d.target.y)
                  .attr('class', d => getLinkClass(d))
                  .style('opacity', 0)
                  .call(enter => enter.transition().duration(500).style('opacity', 1)),
      update => update
                  .attr('class', d => getLinkClass(d))
                  .call(update => update.transition().duration(500)
                      .attr('x1', d => d.source.x)
                      .attr('y1', d => d.source.y)
                      .attr('x2', d => d.target.x)
                      .attr('y2', d => d.target.y)),
      exit => exit
              .call(exit => exit.transition().duration(500).style('opacity', 0).remove())
    );
}

function renderNodes(nodeGroup, nodesToRender, {
  startWord, endWord, currentWord, playerPath, optimalPath, suggestedPathFromCurrent,
  status, pathDisplayMode,
  onNodeClick
}) {
  nodeGroup
    .selectAll('circle.graph-node')
    .data(nodesToRender, d => d.id)
    .join(
      enter => enter.append('circle')
                  .attr('transform', d => `translate(${d.x},${d.y})`)
                  .attr('r', 0)
                  .attr('class', d => getNodeClass(d.id, { startWord, endWord, currentWord, playerPath, optimalPath, suggestedPathFromCurrent, status, pathDisplayMode }))
                  .on('click', (event, d) => {
                      if (onNodeClick) {
                        onNodeClick(d.id);
                      }
                   })
                  .style('cursor', 'pointer')
                  .call(enter => enter.transition().duration(500).attr('r', 5)),
      update => update
                  .attr('class', d => getNodeClass(d.id, { startWord, endWord, currentWord, playerPath, optimalPath, suggestedPathFromCurrent, status, pathDisplayMode }))
                  .on('click', (event, d) => {
                      if (onNodeClick) {
                         onNodeClick(d.id);
                      }
                   })
                   .style('cursor', 'pointer')
                  .call(update => update.transition().duration(500)
                      .attr('transform', d => `translate(${d.x},${d.y})`)),
      exit => exit
              .call(exit => exit.transition().duration(500).attr('r', 0).remove())
    );
}

function renderLabelsAndCollide(labelGroup, nodesToRender, { 
  startWord, endWord, currentWord, status, suggestedPathFromCurrent
}) {
    const labelsToRender = nodesToRender.filter(d => 
        d.id === startWord || 
        d.id === endWord || 
        (d.id === currentWord && status === GameStatus.PLAYING && currentWord !== startWord) ||
        (suggestedPathFromCurrent && suggestedPathFromCurrent.length > 0 && d.id === suggestedPathFromCurrent[0]) 
    );

    const labelSelection = labelGroup
        .selectAll('text.graph-label')
        .data(labelsToRender, d => d.id)
        .join(
            enter => enter.append('text')
                        .attr('class', 'graph-label')
                        .attr('x', d => d.x + 12)
                        .attr('y', d => d.y + 3)
                        .text(d => d.id)
                        .classed('node-label', true)
                        .classed('visible', true),
            update => update
                      .style('opacity', 1)
                      .call(update => update.transition().duration(500)
                          .attr('x', d => d.x + 12)
                          .attr('y', d => d.y + 3)), 
            exit => exit.remove()
        );
        
    labelSelection.attr('opacity', 1);

    const labelNodes = labelSelection.nodes();
    if (labelNodes.length < 2) return;

    const labelBoxes = labelNodes.map(node => node.getBBox());
    const hiddenLabels = new Set();
    
    const sortedIndices = labelNodes.map((_, i) => i).sort((a, b) => {
        const priorityA = getPriority(labelSelection.data()[a], { currentWord, startWord, endWord, suggestedPathFromCurrent });
        const priorityB = getPriority(labelSelection.data()[b], { currentWord, startWord, endWord, suggestedPathFromCurrent });
        if (priorityB !== priorityA) {
            return priorityB - priorityA;
        }
        return labelBoxes[a].y - labelBoxes[b].y;
    });

    for (let i = 0; i < sortedIndices.length; i++) {
        const index1 = sortedIndices[i];
        if (hiddenLabels.has(index1)) continue;
        const box1 = labelBoxes[index1];

        for (let j = i + 1; j < sortedIndices.length; j++) {
            const index2 = sortedIndices[j];
            if (hiddenLabels.has(index2)) continue;
            const box2 = labelBoxes[index2];

            const overlap = !(box1.x + box1.width < box2.x || 
                              box1.x > box2.x + box2.width || 
                              box1.y + box1.height < box2.y || 
                              box1.y > box2.y + box2.height);

            if (overlap) {
                 hiddenLabels.add(index2);
            }
        }
    }

    labelSelection.style('opacity', (_, i) => hiddenLabels.has(i) ? 0 : 1);
}

function GraphVisualization({ pathDisplayMode, onNodeClick }) {
  const { graphData } = useGraphData();
  const { status, startWord, endWord, currentWord, playerPath, optimalPath, suggestedPathFromCurrent } = useGame();
  const svgRef = useRef(null);

  // --- D3 Rendering Logic --- 
  useEffect(() => {
    if (!graphData || !graphData.nodes || !svgRef.current || status === GameStatus.IDLE || status === GameStatus.LOADING) {
      d3.select(svgRef.current).selectAll('*').remove();
      return;
    }
    
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
        nodeMap.set(word, { id: word, x, y });
        minX = Math.min(minX, x);
        maxX = Math.max(maxX, x);
        minY = Math.min(minY, y);
        maxY = Math.max(maxY, y);
      } else {
        console.warn(`Node data or tsne coords missing for word: ${word}`);
      }
    });

    if (nodeMap.size === 0) {
      d3.select(svgRef.current).selectAll('*').remove();
      return;
    }

    let visibleNodeIds = new Set();
    if (status === GameStatus.PLAYING) {
      visibleNodeIds = new Set([startWord, endWord, currentWord, ...playerPath].filter(Boolean));
    } else if (status === GameStatus.GAVE_UP) {
      if (pathDisplayMode.player) {
        playerPath.forEach(word => visibleNodeIds.add(word));
      }
      if (pathDisplayMode.optimal) {
        optimalPath.forEach(word => visibleNodeIds.add(word));
      }
      if (pathDisplayMode.suggested) {
        suggestedPathFromCurrent.forEach(word => visibleNodeIds.add(word));
        if (currentWord) visibleNodeIds.add(currentWord);
      }
      
      if (startWord) visibleNodeIds.add(startWord);
      if (endWord) visibleNodeIds.add(endWord);
    } else if (status === GameStatus.WON) {
      visibleNodeIds = new Set([startWord, endWord, ...playerPath].filter(Boolean));
    } else {
      visibleNodeIds = new Set([startWord, endWord].filter(Boolean));
    }

    const nodesToRender = Array.from(nodeMap.values()).filter(node => visibleNodeIds.has(node.id));
    
    const startNodeInData = nodesToRender.find(node => node.id === startWord);
    if (!startNodeInData && nodesToRender.length > 0 && (status === GameStatus.PLAYING || status === GameStatus.GAVE_UP)) {
      console.warn(`BUG CHECK: startWord (${startWord}) is MISSING from nodesToRender array!`);
      console.log('nodesToRender:', nodesToRender);
    }

    const links = [];
    for (let i = 1; i < playerPath.length; i++) {
      const sourceNode = nodeMap.get(playerPath[i - 1]);
      const targetNode = nodeMap.get(playerPath[i]);
      if (sourceNode && targetNode) {
        links.push({ source: sourceNode, target: targetNode, type: 'player' });
      }
    }
    if (status === GameStatus.GAVE_UP && optimalPath.length > 0) {
      for (let i = 1; i < optimalPath.length; i++) {
        const sourceNode = nodeMap.get(optimalPath[i - 1]);
        const targetNode = nodeMap.get(optimalPath[i]);
        if (sourceNode && targetNode) {
          links.push({ source: sourceNode, target: targetNode, type: 'optimal' });
        }
      }
    }
    if (status === GameStatus.GAVE_UP && suggestedPathFromCurrent.length > 0) {
      for (let i = 1; i < suggestedPathFromCurrent.length; i++) {
        const sourceNode = nodeMap.get(suggestedPathFromCurrent[i - 1]);
        const targetNode = nodeMap.get(suggestedPathFromCurrent[i]);
        if (sourceNode && targetNode) {
          links.push({ source: sourceNode, target: targetNode, type: 'suggested' });
        }
      }
    }
    
    const filteredLinks = links.filter(link => {
      if (status !== GameStatus.GAVE_UP) return link.type === 'player';
      
      if (link.type === 'player' && pathDisplayMode?.player) return true;
      if (link.type === 'optimal' && pathDisplayMode?.optimal) return true;
      if (link.type === 'suggested' && pathDisplayMode?.suggested) return true;
      
      return false;
    });

    minX = Infinity; maxX = -Infinity; minY = Infinity; maxY = -Infinity;
    if (nodesToRender.length > 0) {
      nodesToRender.forEach(node => {
        minX = Math.min(minX, node.x);
        maxX = Math.max(maxX, node.x);
        minY = Math.min(minY, node.y);
        maxY = Math.max(maxY, node.y);
      });
    } else {
      minX = -50; maxX = 50; minY = -50; maxY = 50;
    }

    const currentSvgWidth = svgRef.current?.clientWidth || 500;
    const padding = currentSvgWidth < 480 ? 15 : 30;

    const width = (maxX - minX) + 2 * padding;
    const height = (maxY - minY) + 2 * padding;
    const svgWidth = width > 0 ? width : 100;
    const svgHeight = height > 0 ? height : 100;
    const viewBox = `${minX - padding} ${minY - padding} ${svgWidth} ${svgHeight}`;

    const svg = d3.select(svgRef.current);
    svg.attr('viewBox', viewBox);

    const linkGroup = svg.select('g.links').node() ? svg.select('g.links') : svg.append('g').attr('class', 'links');
    const nodeGroup = svg.select('g.nodes').node() ? svg.select('g.nodes') : svg.append('g').attr('class', 'nodes');
    const labelGroup = svg.select('g.labels').node() ? svg.select('g.labels') : svg.append('g').attr('class', 'labels');

    renderLinks(linkGroup, filteredLinks);
    renderNodes(nodeGroup, nodesToRender, { 
      startWord, endWord, currentWord, playerPath, optimalPath, suggestedPathFromCurrent,
      status, pathDisplayMode,
      onNodeClick 
    });
    renderLabelsAndCollide(labelGroup, nodesToRender, { 
      startWord, endWord, currentWord, status, suggestedPathFromCurrent
    });

  }, [graphData, status, startWord, endWord, currentWord, playerPath, optimalPath, suggestedPathFromCurrent, pathDisplayMode, onNodeClick]);

  return (
    <div className="graph-svg-wrapper">
      <svg ref={svgRef} width="100%" height="400" style={{ overflow: 'visible' }}>
      </svg>
    </div>
  );
}

export default GraphVisualization; 