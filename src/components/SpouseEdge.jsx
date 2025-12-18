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
            <BaseEdge id={id} path={edgePath} style={{ stroke: '#ff69b4', strokeWidth: 3, opacity: 0.6 }} />
            
            {/* EdgeLabelRenderer is specifically designed to handle labels/icons on edges */}
            <EdgeLabelRenderer>
                <div
                    style={{
                        position: 'absolute',
                        transform: `translate(-50%, -50%) translate(${labelX}px,${labelY}px)`,
                        fontSize: '20px',
                        pointerEvents: 'all',
                    }}
                    className="nodrag nopan"
                >
                    ❤️
                </div>
            </EdgeLabelRenderer>
        </>
    );
};

export default SpouseEdge;