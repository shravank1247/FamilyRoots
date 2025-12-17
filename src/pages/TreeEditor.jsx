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

    const [nodes, setNodes] = useState([]);
    const [edges, setEdges] = useState([]);
    const [selectedNodeData, setSelectedNodeData] = useState(null);
    const [selectedFullNode, setSelectedFullNode] = useState(null);
    
    const [isLayingOut, setIsLayingOut] = useState(false);
    const [treeName, setTreeName] = useState('Loading...');
    const [saveStatus, setSaveStatus] = useState(null);
    
    const reactFlowInstance = useReactFlow();

    // --- HELPERS ---

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

    // --- NEW LOGIC: Initialize empty tree with a default node ---
    if (people && people.length === 0) {
        console.log("Empty tree detected. Creating default root node...");
        const defaultPerson = {
            first_name: "Root",
            last_name: "Person",
            is_alive: true,
            position_data: { x: 250, y: 150 } // Center the first node
        };
        
        const { person: newRoot, error } = await createPerson(defaultPerson, familyId);
        
        if (error) {
            console.error("Failed to create default node:", error);
            return;
        }

        // Add the new root node to state immediately
        const rootNode = {
            id: newRoot.id,
            type: 'personNode',
            data: { ...newRoot, generation: 0 },
            position: newRoot.position_data,
        };
        
        setNodes([rootNode]);
        setEdges([]);
        setTreeName('Family Tree');
        return; // Exit early as we've initialized the tree
    }


    const { relationships } = await fetchRelationshipsByPerson(familyId);
    const rels = relationships || []; 
    
    if (people && people.length > 0) {
        const initialNodes = people.map((p, index) => {
            const pos = p.position_data || { x: index * 250, y: Math.floor(index / 3) * 150 };
            return {
                id: p.id,
                type: 'personNode',
                data: { ...p, generation: Math.floor(pos.y / 250) }, 
                position: pos,
            };
        });
        
        const initialEdges = rels
    .filter(rel => ['child', 'spouse', 'parent', 'sibling'].includes(rel.type))
    .map(rel => {
        const isSpouse = rel.type === 'spouse';
        const sId = rel.person_a_id; 
        const tId = rel.person_b_id;

        return {
            id: `e-${sId}-${tId}-${rel.type}`,
            source: sId,
            target: tId,
            // CHANGE: Use 'smoothstep' for elbow links
            type: isSpouse ? 'spouseEdge' : 'smoothstep', 
            borderRadius: 20, // Rounds the corners of the elbow
            markerEnd: isSpouse ? undefined : { type: 'arrowclosed' },
            sourceHandle: isSpouse ? 'spouse-right' : 'child-connect',
            targetHandle: isSpouse ? 'spouse-left' : null,
            data: { relId: rel.id, type: rel.type }
        };
    }).filter(e => e !== null);

        setNodes(initialNodes);
        setEdges(initialEdges); 
        setTreeName('Family Tree'); 
    }
}, [familyId, navigate, createPerson]);

    useEffect(() => { loadData(); }, [loadData]);

    // --- EVENT HANDLERS ---

    const onNodesChange = useCallback((changes) => setNodes((nds) => applyNodeChanges(changes, nds)), []);
    const onEdgesChange = useCallback((changes) => setEdges((eds) => applyEdgeChanges(changes, eds)), []);
    const onConnect = useCallback((params) => setEdges((eds) => addEdge(params, eds)), []);
    
    const onNodeClick = useCallback((event, node) => {
        setSelectedFullNode(node); 
        setSelectedNodeData(node.data); 
        setNodes((nds) => nds.map((n) => ({
            ...n,
            selected: n.id === node.id,
            style: n.id === node.id ? { border: '5px solid #ff9900' } : {}
        })));
    }, []);
    
    const onPaneClick = useCallback(() => {
        setSelectedNodeData(null);
        setSelectedFullNode(null);
        setNodes((nds) => nds.map((n) => ({ ...n, selected: false, style: {} })));
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

    // --- QUICK ADD LOGIC ---

    const onAddNode = useCallback(async (parentId, relationshipType) => {
    const parentNode = nodes.find(n => n.id === parentId);
    if (!parentNode) return;

    const offset = 250; 
    const { x, y } = parentNode.position;
    const spouseId = getSpouseId(parentId);
    const spouseNode = spouseId ? nodes.find(n => n.id === spouseId) : null;
    
    if (relationshipType === 'child' && !spouseNode) {
        if (!window.confirm("No spouse found. Create child with single parent?")) return;
    }

    let newPosition;
    if (relationshipType === 'child') {
        newPosition = { x: spouseNode ? (x + spouseNode.position.x) / 2 : x, y: y + offset };
    } else if (relationshipType === 'spouse') {
        newPosition = { x: x + offset, y: y }; // Place spouse to the right
    } else {
        newPosition = { x: x - offset, y: y + offset };
    }
    
    const { person: newPerson, error } = await createPerson({
        first_name: `New ${relationshipType}`,
        is_alive: true,
    }, familyId);

    if (error) return;

    const newNode = {
        id: newPerson.id,
        type: 'personNode',
        data: newPerson,
        position: newPosition,
    };
    
    const dbRelationships = [];
    const localEdges = [];
    let junctionNode = null;

    if (relationshipType === 'child') {
        const junctionId = spouseId ? `junc-${parentId}-${spouseId}` : parentId;
        
        if (spouseId) {
            // Ensure visual junction exists
            junctionNode = { 
                id: junctionId,
                position: { x: (x + spouseNode.position.x) / 2 + 40, y: y + 80 },
                type: 'junction',
                data: { label: '' },
                style: { width: 1, height: 1 }
            };
        }

        // Link from Junction (or single parent) to Child
        localEdges.push({
            id: `e-${junctionId}-${newNode.id}`,
            source: junctionId,
            target: newNode.id,
            type: 'smoothstep',
            sourceHandle: 'child-connect', // Ensure this handle exists on your junction/node
            markerEnd: { type: 'arrowclosed' }
        });

        // Save relationship to BOTH parents in DB
        dbRelationships.push({ family_id: familyId, person_a_id: parentId, person_b_id: newNode.id, type: 'child' });
        if (spouseId) {
            dbRelationships.push({ family_id: familyId, person_a_id: spouseId, person_b_id: newNode.id, type: 'child' });
        }
    } 
    else if (relationshipType === 'spouse') {
        // VISUAL: Link side-to-side
        localEdges.push({
            id: `e-${parentId}-${newNode.id}-spouse`,
            source: parentId,
            target: newNode.id,
            type: 'spouseEdge',
            sourceHandle: 'spouse-right', // Force side handle
            targetHandle: 'spouse-left'   // Force side handle
        });
        dbRelationships.push({ family_id: familyId, person_a_id: parentId, person_b_id: newNode.id, type: 'spouse' });
    }
    else if (relationshipType === 'sibling') {
        const parentIds = getParentIds(parentId);
        if (parentIds.length > 0) {
            parentIds.forEach(pId => {
                localEdges.push({ id: `e-${pId}-to-${newNode.id}`, source: pId, target: newNode.id, type: 'default', markerEnd: { type: 'arrowclosed' } });
                dbRelationships.push({ family_id: familyId, person_a_id: pId, person_b_id: newNode.id, type: 'child' });
            });
        } else {
            localEdges.push({ id: `e-${parentId}-to-${newNode.id}`, source: parentId, target: newNode.id, type: 'default', markerEnd: { type: 'arrowclosed' } });
            dbRelationships.push({ family_id: familyId, person_a_id: parentId, person_b_id: newNode.id, type: 'sibling' });
        }
    } else if (relationshipType === 'parent') {
        localEdges.push({ id: `e-${newNode.id}-to-${parentId}`, source: newNode.id, target: parentId, type: 'default', markerEnd: { type: 'arrowclosed' } });
        dbRelationships.push({ family_id: familyId, person_a_id: newNode.id, person_b_id: parentId, type: 'child' });
    }

    if (dbRelationships.length > 0) await createRelationships(dbRelationships);

    setNodes((nds) => [...nds, newNode, ...(junctionNode ? [junctionNode] : [])]); 
    setEdges((eds) => [...eds, ...localEdges]);
    setSelectedFullNode(newNode);
    setSelectedNodeData(newPerson);
}, [nodes, edges, familyId, getSpouseId, getParentIds]);

    // --- SIDEBAR & ACTIONS ---

    const handleDeleteSelected = useCallback(async () => {
        if (!selectedFullNode) return;
        if (!window.confirm(`Delete ${selectedFullNode.data.first_name}?`)) return;
        await deletePerson(selectedFullNode.id);
        await loadData();
        setSelectedNodeData(null);
        setSelectedFullNode(null);
    }, [selectedFullNode, loadData]);

    const handleSidebarSave = useCallback(async (updatedPerson) => {
    // Only update LOCAL data to prevent position jumping
    setNodes(nds => nds.map(node => 
        node.id === updatedPerson.id ? { ...node, data: updatedPerson } : node
    ));
    setSelectedNodeData(updatedPerson); 
}, []);

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
                        <button className="secondary-btn" onClick={onLayout}>✨ Auto Arrange</button>
                        <button className="secondary-btn" onClick={handleDeleteSelected} disabled={!selectedFullNode}>🗑️ Delete Node</button>
                        <a href="/dashboard" className="secondary-btn">← Back to Dashboard</a>
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