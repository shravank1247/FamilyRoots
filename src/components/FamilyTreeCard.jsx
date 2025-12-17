// src/components/FamilyTreeCard.jsx

import React, { useState } from 'react';

    const FamilyTreeCard = ({ family, onView, onDelete, onRename, onShare }) => {
    const [isRenaming, setIsRenaming] = useState(false);
    const [newName, setNewName] = useState(family.name);

    const dateCreated = new Date(family.created_at).toLocaleDateString(undefined, { 
        year: 'numeric', month: 'long', day: 'numeric' 
    });

    const handleRenameSubmit = async () => {
        if (newName.trim() && newName !== family.name) {
            await onRename(family.id, newName);
        }
        setIsRenaming(false);
    };

    const handleShareClick = (e) => {
        e.stopPropagation(); // Stop card click from opening the tree
        const email = prompt("Enter user email to share this tree with:");
        if (email && email.includes('@')) {
            onShare(family.id, email);
        } else if (email) {
            alert("Please enter a valid email.");
        }
    };

    return (
        <div className="tree-card" style={{ borderLeft: '5px solid var(--primary-color)', padding: '20px', borderRadius: '8px', boxShadow: '0 4px 6px rgba(0,0,0,0.1)', background: '#fff' }}>
            <div className="card-header" style={{ marginBottom: '15px' }}>
                {isRenaming ? (
                    <div style={{ display: 'flex', gap: '10px' }}>
                        <input 
                            type="text" 
                            value={newName} 
                            onChange={(e) => setNewName(e.target.value)}
                            style={{ flex: 1, padding: '5px', borderRadius: '4px', border: '1px solid #ccc' }}
                            autoFocus
                        />
                        <button onClick={handleRenameSubmit} className="primary-btn" style={{ padding: '5px 10px' }}>Save</button>
                        <button onClick={() => setIsRenaming(false)} className="secondary-btn" style={{ padding: '5px 10px' }}>X</button>
                    </div>
                ) : (
                    <h3 style={{ margin: 0, color: '#333' }}>{family.name}</h3>
                )}
            </div>

            <div className="card-body" style={{ color: '#666', fontSize: '0.9rem', marginBottom: '20px' }}>
                <p style={{ margin: '5px 0' }}><strong>Status:</strong> Active</p>
                <p className="creation-date" style={{ margin: '5px 0' }}>Created: {dateCreated}</p>
            </div>

            <div className="card-footer" style={{ display: 'flex', justifyContent: 'space-between', gap: '10px', borderTop: '1px solid #eee', paddingTop: '15px' }}>
                <div style={{ display: 'flex', gap: '8px' }}>
                    <button 
                        className="primary-btn" 
                        onClick={() => onView(family.id)}
                        style={{ backgroundColor: '#4CAF50', color: 'white', padding: '8px 12px', borderRadius: '4px', cursor: 'pointer', border: 'none' }}
                    >
                        👁️ View
                    </button>
                    <button 
                        className="secondary-btn"
                        onClick={() => setIsRenaming(true)}
                        style={{ padding: '8px 12px', borderRadius: '4px', cursor: 'pointer', border: '1px solid #ccc' }}
                    >
                        ✏️ Rename
                    </button>
                    <button onClick={handleShareClick} className="share-btn" style={{ backgroundColor: '#9b59b6', color: 'white', border: 'none', padding: '8px 12px', borderRadius: '4px', cursor: 'pointer' }}>
                    🔗 Share
                </button>
                </div>
                
                <button 
                    className="delete-btn"
                    onClick={(e) => {
                        e.stopPropagation();
                        onDelete(family.id, family.name);
                    }}
                    style={{ backgroundColor: '#ff4d4d', color: 'white', padding: '8px 12px', borderRadius: '4px', cursor: 'pointer', border: 'none' }}
                >
                    🗑️ Delete
                </button>
            </div>
        </div>
    );
};

export default FamilyTreeCard;