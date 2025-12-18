// src/pages/TreeEditor.jsx

import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import ReactFlow, { 
    Controls, 
    Background, 
    applyNodeChanges, 
    applyEdgeChanges, 
    addEdge,
    useReactFlow, 
    ReactFlowProvider 
} from 'reactflow';
import 'reactflow/dist/style.css'; 
import './TreeEditor.css'; 
import { getLayoutedElements } from '../utils/dagreLayout';

import { checkAuth } from '../services/auth';
import { 
    fetchPeopleByFamily, 
    saveNodePositions, 
    fetchRelationshipsByPerson,
    createPerson,
    createRelationships,
    deletePerson
} from '../services/api'; 

import PropertiesSidebar from '../components/PropertiesSidebar';
import CustomPersonNode from '../components/CustomPersonNode';
import QuickAddButton from '../components/QuickAddButton'; 
import SpouseEdge from '../components/SpouseEdge'; 

const nodeTypes = { 
    personNode: CustomPersonNode,
    junction: (props) => (
        <div 
            style={{ 
                ...props.style, 
                width: 1, 
                height: 1, 
                backgroundColor: 'transparent' 
            }} 
        />
    )
};
const edgeTypes = { spouseEdge: SpouseEdge };

const TreeEditorRenderer = () => {
    const { familyId } = useParams();
    const navigate = useNavigate();

    const reactFlowInstance = useReactFlow();
    const [nodes, setNodes] = useState([]);
    const [edges, setEdges] = useState([]);
    const [selectedNodeData, setSelectedNodeData] = useState(null);
    const [selectedFullNode, setSelectedFullNode] = useState(null);
    
    const [isLayingOut, setIsLayingOut] = useState(false);
    const [treeName, setTreeName] = useState('Loading...');
    const [saveStatus, setSaveStatus] = useState(null);
    
    

    // --- GENERATION COLOR CONFIG ---
    const generationColors = {
        0: '#FFD700', // Gold (Ancestors/Root)
        1: '#87CEEB', // Sky Blue
        2: '#98FB98', // Pale Green
        3: '#DDA0DD', // Plum
        4: '#F08080', // Light Coral
    };
    const defaultColor = '#D3D3D3';

    // --- HELPERS ---

    // Logic to calculate depth/level for each person
    const assignLevels = (people, relationships) => {
        const levelMap = {};
        const edgeList = relationships || [];
        
        // 1. Identify "Child" links
        const hasParent = new Set(edgeList.filter(r => r.type === 'child').map(r => r.person_b_id));
        
        // 2. Find roots (people who are not listed as a 'child' of anyone)
        const roots = people.filter(p => !hasParent.has(p.id));

        // 3. BFS to assign levels
        let queue = roots.map(r => ({ id: r.id, level: 0 }));
        
        while (queue.length > 0) {
            const { id, level } = queue.shift();
            
            // Only assign if not already visited or if we found a deeper path
            if (!(id in levelMap) || level > levelMap[id]) {
                levelMap[id] = level;
            }

            // Find children of this person
            const children = edgeList
                .filter(r => r.person_a_id === id && r.type === 'child')
                .map(r => r.person_b_id);
                
            children.forEach(childId => {
                queue.push({ id: childId, level: level + 1 });
            });
        }
        return levelMap;
    };

    const getParentIds = useCallback((personId) => {
        return edges
            .filter((e) => e.target === personId && e.type !== 'spouseEdge')
            .map(e => e.source);
    }, [edges]);

    const getSpouseId = useCallback((personId) => {
        const spouseEdge = edges.find(
            (e) => (e.source === personId || e.target === personId) && e.type === 'spouseEdge'
        );
        if (!spouseEdge) return null;
        return spouseEdge.source === personId ? spouseEdge.target : spouseEdge.source;
    }, [edges]); 

    // --- DATA LOADING ---
    const loadData = useCallback(async () => {
    const authUser = await checkAuth();
    if (!authUser) { navigate('/login'); return; }
    if (!familyId) return;

    const { people } = await fetchPeopleByFamily(familyId); 
    const { relationships } = await fetchRelationshipsByPerson(familyId);
    const rels = relationships || []; 
    
    // 1. Calculate Generations for color coding
    const levelMap = assignLevels(people, rels);

    if (people && people.length > 0) {
        // 2. Map People to Nodes FIRST so we can use them for Edge logic
        const initialNodes = people.map((p, index) => {
            const pos = p.position_data || { x: index * 250, y: Math.floor(index / 3) * 150 };
            const level = levelMap[p.id] || 0;
            
            return {
                id: p.id,
                type: 'personNode',
                data: { 
                    ...p, 
                    generation: level,
                    bgColor: generationColors[level % 5] || defaultColor 
                },
                position: pos,
                selected: selectedFullNode?.id === p.id,
                style: selectedFullNode?.id === p.id ? { border: '5px solid #ff9900' } : {}
            };
        });
        
        // 3. Map Relationships to Edges
        const initialEdges = rels.map(rel => {
            const isSpouse = rel.type === 'spouse';
            const isChild = rel.type === 'child';

            if (!isSpouse && !isChild) return null;

            if (isSpouse) {
                const sNode = people.find(p => p.id === rel.person_a_id);
                const tNode = people.find(p => p.id === rel.person_b_id);
                
                const sX = sNode?.position_data?.x ?? 0;
                const tX = tNode?.position_data?.x ?? 0;

                // If Target is to the left of Source
                const isTargetToLeft = tX < sX;

                return {
                    id: `e-${rel.person_a_id}-${rel.person_b_id}-spouse`,
                    source: rel.person_a_id,
                    target: rel.person_b_id,
                    type: 'spouseEdge',
                    // If spouse is on the left: Source uses Left handle, Target uses Right handle
                    sourceHandle: isTargetToLeft ? 'spouse-left' : 'spouse-right',
                    targetHandle: isTargetToLeft ? 'spouse-right' : 'spouse-left',
                    data: { relId: rel.id, type: 'spouse' }
                };
            }

            // Standard child logic connecting Top to Bottom
            return {
                id: `e-${rel.person_a_id}-${rel.person_b_id}-child`,
                source: rel.person_a_id,
                target: rel.person_b_id,
                type: 'smoothstep',
                borderRadius: 20,
                markerEnd: { type: 'arrowclosed' },
                sourceHandle: 'child-connect',
                targetHandle: 'parent-connect',
                data: { relId: rel.id, type: 'child' }
            };
        }).filter(e => e !== null);

        setNodes(initialNodes);
        setEdges(initialEdges);
        setTreeName('Family Tree'); 
    }
}, [familyId, navigate, selectedFullNode]);

    

    useEffect(() => { loadData(); }, [loadData]);

    // --- EVENT HANDLERS ---
    const onNodesChange = useCallback((changes) => setNodes((nds) => applyNodeChanges(changes, nds)), []);
    const onEdgesChange = useCallback((changes) => setEdges((eds) => applyEdgeChanges(changes, eds)), []);
    const onConnect = useCallback((params) => setEdges((eds) => addEdge(params, eds)), []);
    
    
    const onNodeClick = useCallback((event, node) => {
        setSelectedFullNode(node); 
        setSelectedNodeData(node.data); 
        
        // Explicitly update nodes to apply the selection style
        setNodes((nds) => nds.map((n) => ({
        ...n,
        selected: n.id === node.id,
        style: n.id === node.id ? { border: '5px solid #ff9900' } : { border: 'none' }
    })));
}, []);
    

    const onPaneClick = useCallback(() => {
        setSelectedNodeData(null);
        setSelectedFullNode(null);
        setNodes((nds) => nds.map((n) => ({ ...n, selected: false })));
    }, []);

    const onLayout = useCallback(() => {
        if (nodes.length === 0) return;
        setIsLayingOut(true);
        const layoutedNodes = getLayoutedElements(nodes, edges, 'TB');
        setNodes(layoutedNodes);
        setTimeout(() => {
            reactFlowInstance.fitView({ padding: 0.2 });
            setIsLayingOut(false);
        }, 10);
    }, [nodes, edges, reactFlowInstance]);

    const onAddNode = useCallback(async (parentId, relationshipType) => {
    const parentNode = nodes.find(n => n.id === parentId);
    if (!parentNode) return;

    const spouseId = getSpouseId(parentId);
    const offset = 250;
    const newPos = { 
        x: relationshipType === 'spouse' ? parentNode.position.x + offset : parentNode.position.x, 
        y: relationshipType === 'child' ? parentNode.position.y + offset : parentNode.position.y 
    };

    const { x, y } = parentNode.position;
    const horizontalOffset = 300; // Increased offset to prevent overlapping
    let newPosition;

    if (relationshipType === 'spouse') {
        // Force placement to the exact right of the selected node
        newPosition = { x: x - horizontalOffset, y: y }; 
    } else {
        // Child or other logic
        newPosition = { x: x, y: y + 250 }; 
    }

    // 1. Create Person
    const { person: newPerson, error } = await createPerson({
        first_name: `New ${relationshipType}`,
        is_alive: true,
        position_data: newPosition
    }, familyId);

    if (error) return;


    // 2. Build Relationships
    const dbRelationships = [];
    if (relationshipType === 'child') {
        // Link to Parent A
        dbRelationships.push({ family_id: familyId, person_a_id: parentId, person_b_id: newPerson.id, type: 'child' });
        // Link to Parent B (Spouse) if exists
        if (spouseId) {
            dbRelationships.push({ family_id: familyId, person_a_id: spouseId, person_b_id: newPerson.id, type: 'child' });
        }
    } else if (relationshipType === 'spouse') {
        dbRelationships.push({ family_id: familyId, person_a_id: parentId, person_b_id: newPerson.id, type: 'spouse' });

    }

    // 3. Save to DB
    if (dbRelationships.length > 0) {
        await createRelationships(dbRelationships);
    }

    // 4. Refresh everything (Generations + Links)
    await loadData();
    
}, [nodes, familyId, getSpouseId, loadData]);

    const handleSaveLayout = async () => {
        setSaveStatus('Saving...');
        const nodesToSave = reactFlowInstance.getNodes();
        const updates = nodesToSave.map(node => ({
            id: node.id,
            position_data: { x: node.position.x, y: node.position.y } 
        }));
        const { error } = await saveNodePositions(updates);
        setSaveStatus(error ? `Error: ${error.message}` : 'Saved!');
        setTimeout(() => setSaveStatus(null), 2000);
    };

    const handleDeleteSelected = useCallback(async () => {
        if (!selectedFullNode) return;
        if (!window.confirm(`Delete ${selectedFullNode.data.first_name}?`)) return;
        await deletePerson(selectedFullNode.id);
        await loadData();
        setSelectedNodeData(null);
    }, [selectedFullNode, loadData]);

    const handleSidebarSave = useCallback((updatedPerson) => {
        setNodes(nds => nds.map(node => 
            node.id === updatedPerson.id ? { ...node, data: { ...node.data, ...updatedPerson } } : node
        ));
        setSelectedNodeData(updatedPerson); 
    }, []);

    // const onNodeDragStop = useCallback((event, node) => {
    // if (!reactFlowInstance) return;
    
    // setEdges((eds) => 
    //     eds.map((edge) => {
    //         // Only care about spouse edges involving the dragged node
    //         if (edge.type === 'spouseEdge' && (edge.source === node.id || edge.target === node.id)) {
    //             const sourceNode = reactFlowInstance.getNode(edge.source);
    //             const targetNode = reactFlowInstance.getNode(edge.target);

    //             if (sourceNode && targetNode) {
    //                 // Check if target is now to the left of the source
    //                 const isTargetToLeft = targetNode.position.x < sourceNode.position.x;

    //                 return {
    //                     ...edge,
    //                     sourceHandle: isTargetToLeft ? 'spouse-left' : 'spouse-right',
    //                     targetHandle: isTargetToLeft ? 'spouse-right' : 'spouse-left',
    //                 };
    //             }
    //         }
    //         return edge;
    //     })
    // );
// }, [reactFlowInstance, setEdges]);

    return (
        <div className="tree-editor-wrapper">
            <main className="main-content-canvas">
                <header className="canvas-header">
                    <h2>{treeName} - Editor</h2>
                    <div className="header-actions">
                        <button className="secondary-btn" onClick={handleSaveLayout} disabled={saveStatus === 'Saving...'}>
                            {saveStatus || '💾 Save Layout'}
                        </button>
                        <QuickAddButton selectedPerson={selectedFullNode?.data || null} onAddNode={onAddNode} />
                        {/* <button className="secondary-btn" onClick={onLayout}>✨ Auto Arrange</button> */}
                        <button className="secondary-btn" onClick={handleDeleteSelected} disabled={!selectedFullNode}>🗑️ Delete Node</button>
                        <a href="/dashboard" className="secondary-btn">← Back</a>
                    </div>
                </header>
                <div className="react-flow-container">
                    <ReactFlow
                        nodes={nodes}
                        edges={edges}
                        onNodesChange={onNodesChange}
                        onEdgesChange={onEdgesChange}
                        onConnect={onConnect}
                        onNodeClick={onNodeClick}
                        onPaneClick={onPaneClick}
                        nodeTypes={nodeTypes}
                        edgeTypes={edgeTypes} 
                        onNodeDragStop={onNodeDragStop}
                        fitView
                    >
                        <Controls />
                        <Background color="#aaa" gap={16} />
                    </ReactFlow>
                </div>
            </main>
            <PropertiesSidebar 
                person={selectedNodeData} 
                familyId={familyId} 
                onSave={handleSidebarSave} 
                onClose={() => setSelectedNodeData(null)}
            />
        </div>
    );
};



const TreeEditor = () => (
    <ReactFlowProvider>
        <TreeEditorRenderer />
    </ReactFlowProvider>
);

export default TreeEditor;