// src/utils/dagreLayout.js

import dagre from 'dagre';

// Define dimensions and graph settings
const nodeWidth = 170; // Matches CustomPersonNode width
const nodeHeight = 100; // Matches CustomPersonNode height

/**
 * Uses the dagre algorithm to calculate positions for nodes in a graph.
 * @param {Array} nodes - ReactFlow nodes array
 * @param {Array} edges - ReactFlow edges array
 * @param {string} direction - 'TB' (Top to Bottom) or 'LR' (Left to Right)
 * @returns {Array} Nodes with updated position data
 */
export const getLayoutedElements = (nodes, edges, direction = 'TB') => {
    // 1. Initialize Dagre graph
    const dagreGraph = new dagre.graphlib.Graph();
    dagreGraph.setDefaultEdgeLabel(() => ({}));

    const isHorizontal = direction === 'LR';
    dagreGraph.setGraph({ rankdir: direction, ranksep: 50, nodesep: 50 }); // Set graph direction and spacing

    // 2. Add nodes to Dagre graph
    nodes.forEach((node) => {
        dagreGraph.setNode(node.id, { width: nodeWidth, height: nodeHeight });
    });

    // 3. Add edges to Dagre graph
    edges.forEach((edge) => {
        // Dagre uses source/target IDs directly
        dagreGraph.setEdge(edge.source, edge.target);
    });

    // 4. Run the layout algorithm
    dagre.layout(dagreGraph);

    // 5. Update ReactFlow nodes with calculated positions
    const layoutedNodes = nodes.map((node) => {
        const nodeWithPosition = dagreGraph.node(node.id);
        
        // Dagre returns coordinates based on the center of the node.
        // ReactFlow expects coordinates for the top-left corner.
        node.position = {
            x: nodeWithPosition.x - nodeWidth / 2,
            y: nodeWithPosition.y - nodeHeight / 2,
        };
        
        return node;
    });

    return layoutedNodes;
};