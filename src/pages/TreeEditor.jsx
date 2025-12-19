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
    deletePerson,
    updatePerson,
    fetchFamilyById
} from '../services/api'; 

import PropertiesSidebar from '../components/PropertiesSidebar';
import CustomPersonNode from '../components/CustomPersonNode';
import QuickAddButton from '../components/QuickAddButton'; 
import SpouseEdge from '../components/SpouseEdge'; 
import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';

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
    0: '#FFD700', // Gold (Roots)
    1: '#87CEEB', // Sky Blue
    2: '#98FB98', // Pale Green
    3: '#DDA0DD', // Plum
    4: '#F08080', // Light Coral
    5: '#40E0D0', // Turquoise
    6: '#FF8C00', // Dark Orange
    7: '#BA55D3', // Medium Orchid
    8: '#B0C4DE', // Light Steel Blue
    9: '#FFB6C1', // Light Pink
};

const defaultColor = '#D3D3D3';


    const handlePrintTree = async () => {
    const element = document.querySelector('.react-flow-container');
    const canvas = await html2canvas(element, {
        backgroundColor: '#ffffff',
        logging: false,
        useCORS: true, // Crucial for Cloudinary images
        scale: 2 // Higher quality
    });
    
    const imgData = canvas.toDataURL('image/png');
    const pdf = new jsPDF('l', 'mm', 'a4'); // Landscape orientation
    const imgProps = pdf.getImageProperties(imgData);
    const pdfWidth = pdf.internal.pageSize.getWidth();
    const pdfHeight = (imgProps.height * pdfWidth) / imgProps.width;
    
    pdf.addImage(imgData, 'PNG', 0, 0, pdfWidth, pdfHeight);
    pdf.save(`${treeName}-FamilyTree.pdf`);
};


//to filter on canvas
const [filterText, setFilterText] = useState('');

// This effect runs whenever filterText changes
useEffect(() => {
    setNodes((nds) =>
        nds.map((node) => {
            const matches = node.data.first_name.toLowerCase().includes(filterText.toLowerCase()) ||
                          (node.data.surname || '').toLowerCase().includes(filterText.toLowerCase());
            
            return {
                ...node,
                style: {
                    ...node.style,
                    opacity: filterText === '' || matches ? 1 : 0.2, // Dim non-matches
                    transition: 'opacity 0.3s ease',
                },
            };
        })
    );
}, [filterText, setNodes]);


// re-centers the tree when a node is selected.
useEffect(() => {
    if (selectedFullNode && reactFlowInstance) {
        const isMobile = window.innerWidth <= 768;
        
        // On mobile, we move the node slightly "up" (subtracting from Y)
        // so it sits above the bottom-sheet sidebar.
        reactFlowInstance.setCenter(
            selectedFullNode.position.x + 75, // Center of node width
            isMobile ? selectedFullNode.position.y - 150 : selectedFullNode.position.y, 
            { zoom: 0.9, duration: 600 }
        );
    }
}, [selectedFullNode, reactFlowInstance]);

//recenter 
const handleRecenter = () => {
    if (reactFlowInstance) {
        reactFlowInstance.fitView({ duration: 800, padding: 0.2 });
    }
};


// 1. Add state at the top of TreeEditorRenderer
const [isEditMode, setIsEditMode] = useState(false);

// 2. Add the toggle handler
const toggleEditMode = () => {
    setIsEditMode(!isEditMode);
    // Clear selection when entering view mode to keep it clean
    if (isEditMode) {
        setSelectedNodeData(null);
        setSelectedFullNode(null);
    }
};

    // --- HELPERS ---
    const assignLevels = (people, relationships) => {
        const levelMap = {};
        const edgeList = relationships || [];
        const hasParent = new Set(edgeList.filter(r => r.type === 'child').map(r => r.person_b_id));
        const roots = people.filter(p => !hasParent.has(p.id));
        let queue = roots.map(r => ({ id: r.id, level: 0 }));
        
        while (queue.length > 0) {
            const { id, level } = queue.shift();
            if (!(id in levelMap) || level > levelMap[id]) {
                levelMap[id] = level;
            }
            const children = edgeList
                .filter(r => r.person_a_id === id && r.type === 'child')
                .map(r => r.person_b_id);
                
            children.forEach(childId => {
                queue.push({ id: childId, level: level + 1 });
            });
        }
        return levelMap;
    };

    const getSpouseId = useCallback((personId) => {
        const spouseEdge = edges.find(
            (e) => (e.source === personId || e.target === personId) && e.type === 'spouseEdge'
        );
        if (!spouseEdge) return null;
        return spouseEdge.source === personId ? spouseEdge.target : spouseEdge.source;
    }, [edges]); 

    const loadData = useCallback(async () => {
        const authUser = await checkAuth();
        if (!authUser) { navigate('/login'); return; }
        if (!familyId) return;

        // Fetch Family Name using the service function
        const { family, error: familyError } = await fetchFamilyById(familyId);
        
        if (!familyError && family && family.name) {
            setTreeName(family.name); // This sets the actual name from DB
        } else {
            console.warn("Could not find family name, using fallback.");
            setTreeName('Family Tree'); 
        }

        const { people } = await fetchPeopleByFamily(familyId); 
        const { relationships } = await fetchRelationshipsByPerson(familyId);
        const rels = relationships || []; 
        

        


        // --- FIX: AUTO-CREATE FIRST NODE IF TREE IS EMPTY ---
    if (!people || people.length === 0) {
        console.log("Empty tree detected. Creating root node...");
        const { person: rootPerson, error } = await createPerson({
            first_name: "Root Ancestor",
            surname: "Family",
            gender: "male", // Default or 'other'
            is_alive: true,
            position_data: { x: 250, y: 50 }
        }, familyId);

        if (!error) {
            // Re-run loadData to fetch the newly created person
            loadData(); 
        }
        return;
    }
    // --- END FIX ---


        const levelMap = assignLevels(people, rels);

         if (people && people.length > 0) {
            const initialNodes = people.map((p, index) => {
                const pos = p.position_data || { x: index * 250, y: Math.floor(index / 3) * 150 };
                const level = levelMap[p.id] || 0;
                
                return {
                    id: p.id,
                    type: 'personNode',
                    data: { 
                        ...p, 
                        generation: level,
                        bgColor: generationColors[level % 10] || defaultColor 
                    },
                    position: pos,
                    selected: selectedFullNode?.id === p.id,
                    style: selectedFullNode?.id === p.id ? { border: '5px solid #ff9900' } : {}
                };
            });
            
            
            const initialEdges = rels.map(rel => {
                const isSpouse = rel.type === 'spouse';
                const isChild = rel.type === 'child';
                if (!isSpouse && !isChild) return null;

                if (isSpouse) {
                    const sNode = people.find(p => p.id === rel.person_a_id);
                    const tNode = people.find(p => p.id === rel.person_b_id);
                    const sX = sNode?.position_data?.x ?? 0;
                    const tX = tNode?.position_data?.x ?? 0;
                    const isTargetToLeft = tX < sX;

                    return {
                        id: `e-${rel.person_a_id}-${rel.person_b_id}-spouse`,
                        source: rel.person_a_id,
                        target: rel.person_b_id,
                        type: 'spouseEdge',
                        sourceHandle: isTargetToLeft ? 'spouse-left' : 'spouse-right',
                        targetHandle: isTargetToLeft ? 'spouse-right' : 'spouse-left',
                        data: { relId: rel.id, type: 'spouse' }
                    };
                }

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

    // --- NEW INTELLIGENT DRAG HANDLER ---
    const onNodeDragStop = useCallback((event, node) => {
        if (!reactFlowInstance) return;
        
        setEdges((eds) => 
            eds.map((edge) => {
                if (edge.type === 'spouseEdge' && (edge.source === node.id || edge.target === node.id)) {
                    const sourceNode = reactFlowInstance.getNode(edge.source);
                    const targetNode = reactFlowInstance.getNode(edge.target);

                    if (sourceNode && targetNode) {
                        const isTargetToLeft = targetNode.position.x < sourceNode.position.x;
                        return {
                            ...edge,
                            sourceHandle: isTargetToLeft ? 'spouse-left' : 'spouse-right',
                            targetHandle: isTargetToLeft ? 'spouse-right' : 'spouse-left',
                        };
                    }
                }
                return edge;
            })
        );
    }, [reactFlowInstance, setEdges]);

    // --- OTHER HANDLERS ---
    const onNodesChange = useCallback((changes) => setNodes((nds) => applyNodeChanges(changes, nds)), []);
    const onEdgesChange = useCallback((changes) => setEdges((eds) => applyEdgeChanges(changes, eds)), []);
    const onConnect = useCallback((params) => setEdges((eds) => addEdge(params, eds)), []);
    
    const onNodeClick = useCallback((event, node) => {
        setSelectedFullNode(node); 
        setSelectedNodeData(node.data); 
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

    const onAddNode = useCallback(async (parentId, relationshipType) => {
        const parentNode = nodes.find(n => n.id === parentId);
        if (!parentNode) return;

        //dual linking of child
        // const spouseId = getSpouseId(parentId);
        const { x, y } = parentNode.position;
        const horizontalOffset = 300; 
        
        let newPosition;
        if (relationshipType === 'spouse') {
            newPosition = { x: x - horizontalOffset, y: y }; 
        } else {
            newPosition = { x: x, y: y + 250 }; 
        }

        const { person: newPerson, error } = await createPerson({
            first_name: `New ${relationshipType}`,
            is_alive: true,
            position_data: newPosition
        }, familyId);

        if (error) return;

        const dbRelationships = [];
        if (relationshipType === 'child') {
            dbRelationships.push({ family_id: familyId, person_a_id: parentId, person_b_id: newPerson.id, type: 'child' });
            // if (spouseId) {
            //     dbRelationships.push({ family_id: familyId, person_a_id: spouseId, person_b_id: newPerson.id, type: 'child' });
            // }
        } else if (relationshipType === 'spouse') {
            dbRelationships.push({ family_id: familyId, person_a_id: parentId, person_b_id: newPerson.id, type: 'spouse' });
        }

        if (dbRelationships.length > 0) {
            await createRelationships(dbRelationships);
        }

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

    const handleSidebarSave = useCallback(async (updatedPerson) => {
    if (!updatedPerson || !updatedPerson.id) return;

    // Persist to Supabase
    const { error } = await updatePerson(updatedPerson.id, {
        first_name: updatedPerson.first_name,
        surname: updatedPerson.surname,
        gender: updatedPerson.gender, // Ensure gender is included in the payload
        is_alive: updatedPerson.is_alive,
        birth_date: updatedPerson.birth_date
    });

    if (error) {
        console.error("Database update failed:", error);
        return;
    }

    // 2. Update local state so the UI reflects the change immediately
    setNodes((nds) => 
        nds.map((node) => {
            if (node.id === updatedPerson.id) {
                return {
                    ...node,
                    data: {
                        ...node.data,
                        ...updatedPerson // Updates gender, name, etc.
                    }
                };
            }
            return node;
        })
    );
    
    setSelectedNodeData(updatedPerson);
    console.log("Gender saved successfully:", updatedPerson.gender);
    setSaveStatus('Changes Saved!');
    setTimeout(() => setSaveStatus(null), 2000);
}, [setNodes, setSelectedNodeData]);

    return (
        <div className="tree-editor-wrapper">
            <main className="main-content-canvas">
                <header className="canvas-header">
                    <h2>{treeName}</h2>
                    <div className="header-actions">
                        <div className="search-container">
                            <input 
                                type="text" 
                                placeholder="🔍 Filter by name..." 
                                value={filterText}
                                onChange={(e) => setFilterText(e.target.value)}
                                className="search-input"
                            />
                            {filterText && <button onClick={() => setFilterText('')} className="clear-search">✕</button>}
                        </div>
                        <button className="secondary-btn mobile-icon-btn" onClick={handleRecenter} title="Recenter Tree">
                            🎯 <span className="hide-on-mobile">Recenter</span>
                        </button>
                    <button 
                        className={`secondary-btn ${isEditMode ? 'edit-active' : 'view-active'}`} 
                        onClick={toggleEditMode}
                        >
                        {isEditMode ? '🔓 Edit Mode: ON' : '🔒 View Mode: Locked'}
                    </button>
        {isEditMode && (
            <>
                <button className="secondary-btn" onClick={handleSaveLayout} disabled={saveStatus === 'Saving...'}>
                            {saveStatus || '💾 Save Layout'}
                </button>
                <QuickAddButton selectedPerson={selectedFullNode?.data || null} onAddNode={onAddNode} />
                <button className="secondary-btn" onClick={handleDeleteSelected} disabled={!selectedFullNode}>🗑️ Delete Node</button>
            </>
        )}
        
        <button className="secondary-btn" onClick={handlePrintTree}>🖨️ Print PDF</button>
        <a href="/dashboard" className="secondary-btn">← Back</a>
        
                        
                    </div>
                </header>
                <div className="react-flow-container">
                    <ReactFlow
                        nodes={nodes}
                        edges={edges}
                        onNodesChange={onNodesChange}
                        onEdgesChange={onEdgesChange}
                        onNodeClick={isEditMode ? onNodeClick : undefined} // Disable sidebar trigger in view mode
                        onConnect={onConnect}
                        onPaneClick={onPaneClick}
                        onNodeDragStop={onNodeDragStop}
                        nodeTypes={nodeTypes}
                        edgeTypes={edgeTypes} 
                        // --- CONTROL INTERACTIVITY HERE ---
                        nodesDraggable={isEditMode}
                        nodesConnectable={isEditMode}
                        elementsSelectable={isEditMode}
                        panOnDrag={true} // Always allow moving across the canvas
                        fitView
                        fitViewOptions={{ padding: 0.2 }} // Adds 20% margin so nodes don't touch edges
                        minZoom={0.2}
                        maxZoom={1.5}
                        // Enable touch gestures for mobile
                        preventScrolling={false}
                    >
                        <Controls showInteractive={false}/> {/* Simplify controls for mobile */}
                        <Background color="#aaa" gap={8} />
                        
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