// src/components/SpouseEdge.jsx
import React from 'react';
import { BaseEdge, getBezierPath, EdgeLabelRenderer } from 'reactflow';

const SpouseEdge = ({ id, sourceX, sourceY, targetX, targetY, sourcePosition, targetPosition }) => {
    const [edgePath, labelX, labelY] = getBezierPath({
        sourceX,
        sourceY,
        sourcePosition,
        targetX,
        targetY,
        targetPosition,
    });

    return (
        <>
            {/* The pink connection line */}
            <BaseEdge id={id} path={edgePath} style={{ stroke: '#ff69b4', strokeWidth: 3 }} />
            
            <EdgeLabelRenderer>
                <div
                    style={{
                        position: 'absolute',
                        transform: `translate(-50%, -50%) translate(${labelX}px,${labelY}px)`,
                        pointerEvents: 'all',
                        fontSize: '22px',
                        zIndex: 10,
                    }}
                >
                    ❤️
                </div>
            </EdgeLabelRenderer>
        </>
    );
};

export default SpouseEdge;