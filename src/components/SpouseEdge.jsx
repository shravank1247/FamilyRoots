// src/components/SpouseEdge.jsx

import React from 'react';
import { BaseEdge, getBezierPath } from 'reactflow';

// This is a custom edge for spouse relationships
const SpouseEdge = ({ id, sourceX, sourceY, targetX, targetY, sourcePosition, targetPosition, data }) => {
    // Calculate the path of the edge (using Bezier path for smooth curves)
    const [edgePath, labelX, labelY] = getBezierPath({
        sourceX,
        sourceY,
        sourcePosition,
        targetX,
        targetY,
        targetPosition,
    });
    
    // Position the heart symbol in the middle of the edge path
    const heartX = labelX;
    const heartY = labelY;

    return (
        <>
            {/* 1. The visible line (BaseEdge) */}
            <BaseEdge id={id} path={edgePath} style={{ stroke: '#90b5b0', strokeWidth: 2 }} />

            {/* 2. The Heart Symbol Label */}
            <foreignObject
                width={20}
                height={20}
                x={heartX - 10} // Center the heart icon
                y={heartY - 10}
                requiredExtensions="http://www.w3.org/1999/xhtml"
            >
                <div style={{ 
                    fontSize: '18px', 
                    color: '#ff69b4', // Pink heart color
                    cursor: 'pointer',
                    transform: 'translate(0, 0)' // Keep the heart centered
                }}>
                    &#x2764; {/* HTML heart symbol */}
                </div>
            </foreignObject>
        </>
    );
};

export default SpouseEdge;