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
                {/* Sidebar Content */}
                <button onClick={signOut}>Sign Out</button>
            </aside>

            <main id="main-content">
                <div className="tree-grid">
                    {families.map(family => (
                        <FamilyTreeCard 
                            key={family.id} 
                            family={family} 
                            onView={(id) => navigate(`/tree-editor/${id}`)}
                            onDelete={deleteFamilyTree}
                            onRename={renameFamilyTree}
                            // FIXED: Passing a function that updates the state above
                            onShare={() => setSelectedTreeForShare(family.id)} 
                        />
                    ))}
                </div>

                {/* FIXED: Modal sits as a sibling to the grid, NOT inside the map loop */}
                {selectedTreeForShare && (
                    <ShareTreeModal 
                        familyId={selectedTreeForShare} 
                        onClose={() => setSelectedTreeForShare(null)} 
                    />
                )}
            </main>

            {/* Create Tree Modal */}
            <Modal show={showModal} onClose={() => setShowModal(false)}>
                {/* Form content */}
            </Modal>
        </div>
    );
};

export default Dashboard;