// src/pages/Dashboard.jsx

import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../config/supabaseClient';
import { signOut } from '../services/auth';
import { fetchUserFamilies, createNewFamilyTree, deleteFamilyTree, renameFamilyTree } from '../services/api';
import FamilyTreeCard from '../components/FamilyTreeCard';
import Modal from '../components/Modal'; 
import ShareTreeModal from '../components/ShareTreeModal';

const Dashboard = ({ session }) => {
    // 1. ALL HOOKS MUST BE AT THE TOP
    const [user, setUser] = useState(null);
    const [families, setFamilies] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [showModal, setShowModal] = useState(false);
    const [selectedTreeForShare, setSelectedTreeForShare] = useState(null);
    const [treeName, setTreeName] = useState('');
    const [message, setMessage] = useState('');
    const [deletingId, setDeletingId] = useState(null);
    
    const navigate = useNavigate();

    const handleDeleteClick = (id) => {
    setDeletingId(id); // Open the warning modal
};
const processDelete = async () => {
    if (!deletingId) return;
    
    setMessage('Deleting tree...');
    const { error } = await deleteFamilyTree(deletingId); // Using your API service

    if (error) {
        setMessage(`Error: ${error.message}`);
    } else {
        setFamilies(families.filter(f => f.id !== deletingId));
        setMessage('Tree deleted successfully.');
        setDeletingId(null);
        // Clear message after 3 seconds
        setTimeout(() => setMessage(''), 3000);
    }
};

    useEffect(() => {
        if (session?.user) {
            setUser(session.user);
            loadFamilies(session.user.id, session.user.email);
        }
    }, [session]);

    const loadFamilies = async (userId, email) => {
        const { families: fetchedFamilies, error } = await fetchUserFamilies(userId, email);
        if (!error) setFamilies(fetchedFamilies || []);
        setIsLoading(false);
    };

    // --- FIX: Logic to handle tree creation ---
    const handleCreateTree = async (e) => {
    e.preventDefault();
    
    // Safety check: ensure session is ready
    if (!treeName.trim() || !session?.user?.id) {
        alert("Session not ready. Please wait a moment.");
        return;
    }

    try {
        console.log("Creating tree for User UUID:", session.user.id);

        // 1. Insert into families
        const { data: newFamily, error: familyError } = await supabase
            .from('families')
            .insert([{ 
                name: treeName, 
                owner_id: session.user.id // This UUID matches profiles.user_id
            }])
            .select()
            .single();

        if (familyError) throw familyError;

        // 2. IMPORTANT: Also add yourself to family_shares 
        // This prevents the "viewonly" toolbar issue on your new tree
        const { error: shareError } = await supabase
            .from('family_shares')
            .insert([{
                family_id: newFamily.id,
                shared_with_email: session.user.email,
                permission_level: 'full'
            }]);

        if (shareError) console.warn("Share entry failed, but tree was created:", shareError.message);

        // 3. Update UI
        setFamilies(prev => [newFamily, ...prev]);
        setTreeName('');
        setShowModal(false);
        
    } catch (err) {
        console.error("Tree creation failed:", err.message);
        alert(`Error: ${err.message}`);
    }
};
    

    // 2. EARLY RETURN MUST COME AFTER ALL HOOKS
    if (isLoading) return <div className="loading">Loading application...</div>;

    const sortedFamilies = [...families].sort((a, b) => {
    // This handles alphabetical sorting (A to Z)
    // .toLowerCase() ensures "apple" and "Apple" are treated correctly
    return a.name.toLowerCase().localeCompare(b.name.toLowerCase());
});
    

    return (
        <div id="app-wrapper">
            <aside id="sidebar">
                <div className="sidebar-header">
                    <h1 className="app-title">FamilyRoots</h1>
                    <p className="user-info">{session?.user?.email || "Guest"}</p>
                </div>

                <nav className="main-nav">
                    <button onClick={() => navigate('/dashboard')} className="nav-link active">🏠 My Family Trees</button>
                    <button onClick={() => setShowModal(true)} className="nav-link">➕ Start New Tree</button>
                    <button onClick={() => navigate('/profile')} className="nav-link">👤 Edit Profile</button>
                </nav>

                <div className="sidebar-footer">
                    <button onClick={signOut} className="secondary-btn">Sign Out</button>
                </div>
            </aside>

            <main id="main-content">
                <header className="main-header">
                    <h2>My Family Trees</h2>
                    <button onClick={() => setShowModal(true)} className="primary-btn">Create New Tree</button>
                </header>

                <div className="tree-grid">
                    {sortedFamilies.length > 0 ? (
                        sortedFamilies.map(family => (
                            <FamilyTreeCard 
                                key={family.id} 
                                family={family} 
                                onView={(id) => navigate(`/tree-editor/${id}`)}
                                onDelete={deleteFamilyTree}
                                onRename={renameFamilyTree}
                                onShare={() => setSelectedTreeForShare(family.id)} 
                            />
                        ))
                    ) : (
                        <div className="empty-state">
                            <h3>No Family Trees Found</h3>
                            <button onClick={() => setShowModal(true)} className="primary-btn">Create Your First Tree</button>
                        </div>
                    )}
                </div>

                {selectedTreeForShare && (
                    <ShareTreeModal 
                        familyId={selectedTreeForShare} 
                        onClose={() => setSelectedTreeForShare(null)} 
                    />
                )}
                {message && <p className="status-message">{message}</p>}
            </main>

<Modal 
            show={!!deletingId} 
            onClose={() => setDeletingId(null)} 
            title="Confirm Deletion"
        >
            <div className="warning-content">
                <p>Are you sure you want to delete this family tree? This action <strong>cannot be undone</strong> and all member data will be lost.</p>
                <div className="modal-actions">
                    <button className="secondary-btn" onClick={() => setDeletingId(null)}>Cancel</button>
                    <button className="delete-btn" onClick={processDelete}>Delete Forever</button>
                </div>
            </div>
        </Modal>
            {/* --- FIX: Added form content as children of the Modal --- */}
            <Modal 
                show={showModal} 
                onClose={() => { setShowModal(false); setMessage(''); }} 
                title="Start a New Family Tree"
            >
                <form onSubmit={handleCreateTree} className="form-content">
                    <div className="form-group" style={{ marginBottom: '15px' }}>
                        <label style={{ display: 'block', marginBottom: '5px' }}>Family Tree Name</label>
                        <input 
                            type="text" 
                            required 
                            value={treeName} 
                            onChange={(e) => setTreeName(e.target.value)}
                            placeholder="e.g., The Smith Family"
                            style={{ width: '100%', padding: '10px', borderRadius: '4px', border: '1px solid #ccc' }}
                        />
                    </div>
                    <div className="form-actions" style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
                        <button type="button" onClick={() => setShowModal(false)} className="secondary-btn">Cancel</button>
                        <button type="submit" className="primary-btn">Create Tree</button>
                    </div>
                </form>
            </Modal>
        </div>
    );
};

export default Dashboard;