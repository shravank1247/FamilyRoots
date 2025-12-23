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
    
    const navigate = useNavigate();

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
        if (!treeName.trim()) return;

        setMessage('Creating...');
        // session.user.id is used as the profile_id
        const { family, error } = await createNewFamilyTree(treeName, session.user.id);

        if (error) {
            setMessage(`Error: ${error.message}`);
        } else {
            // Update local state so the new tree shows up immediately
            setFamilies([family, ...families]); 
            setTreeName('');
            setShowModal(false);
            setMessage('');
        }
    };

    // 2. EARLY RETURN MUST COME AFTER ALL HOOKS
    if (isLoading) return <div className="loading">Loading application...</div>;

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
                    {families.length > 0 ? (
                        families.map(family => (
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

            {/* --- FIX: Added form content as children of the Modal --- */}
            <Modal 
                show={showModal} 
                onClose={() => { setShowModal(false); setMessage(''); }} 
                title="Start a New Family Tree"
            >
                <form onSubmit={handleCreateTree} className="form-content">
                    <div className="form-group" style={{ marginBottom: '15px' }}>
                        <label htmlFor="tree-name" style={{ display: 'block', marginBottom: '5px' }}>Family Tree Name</label>
                        <input 
                            type="text" 
                            id="tree-name" 
                            required 
                            value={treeName} 
                            onChange={(e) => setTreeName(e.target.value)}
                            placeholder="e.g., The Smith Family History"
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