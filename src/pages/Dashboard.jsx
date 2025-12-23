// src/pages/Dashboard.jsx

import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../config/supabaseClient';
import { signOut } from '../services/auth';
import { fetchUserFamilies, createNewFamilyTree, deleteFamilyTree, renameFamilyTree } from '../services/api';
import FamilyTreeCard from '../components/FamilyTreeCard';
import Modal from '../components/Modal'; 
import ShareTreeModal from '../components/ShareTreeModal'; // Ensure this is imported

const Dashboard = ({ session }) => {
    // 1. ALL HOOKS MUST BE AT THE TOP - NO EXCEPTIONS
    const [user, setUser] = useState(null);
    const [families, setFamilies] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [showModal, setShowModal] = useState(false);
    const [selectedTreeForShare, setSelectedTreeForShare] = useState(null); // State for Share Modal
    const [treeName, setTreeName] = useState('');
    const [message, setMessage] = useState('');
    const userEmail = session?.user?.email || "Guest";

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

    // 2. EARLY RETURN MUST COME AFTER ALL HOOKS
    if (isLoading) return <div className="loading">Loading...</div>;

    return (
    <div id="app-wrapper">
        <aside id="sidebar">
            {/* ADD THIS: Sidebar Header with Logo and User Info */}
            <div className="sidebar-header">
                <h1 className="app-title">FamilyRoots</h1>
                <p className="user-info">{session?.user?.email || "Guest"}</p>
            </div>

            {/* ADD THIS: Main Navigation Links */}
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
                {families.map(family => (
                    <FamilyTreeCard 
                        key={family.id} 
                        family={family} 
                        onView={(id) => navigate(`/tree-editor/${id}`)}
                        onDelete={deleteFamilyTree}
                        onRename={renameFamilyTree}
                        onShare={() => setSelectedTreeForShare(family.id)} 
                    />
                ))}
            </div>

            {selectedTreeForShare && (
                <ShareTreeModal 
                    familyId={selectedTreeForShare} 
                    onClose={() => setSelectedTreeForShare(null)} 
                />
            )}
        </main>

        <Modal show={showModal} onClose={() => setShowModal(false)} title="Start a New Family Tree">
            {/* Ensure your form content logic is here */}
        </Modal>
    </div>
);
};

export default Dashboard;