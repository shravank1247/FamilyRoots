// src/pages/Dashboard.jsx

import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { checkAuth, fetchProfileId, signOut } from '../services/auth';
import { fetchUserFamilies, createNewFamilyTree, deleteFamilyTree, renameFamilyTree , shareFamilyTree} from '../services/api';
import FamilyTreeCard from '../components/FamilyTreeCard';
import Modal from '../components/Modal'; 

const Dashboard = () => {
    const [user, setUser] = useState(null);
    const [profileId, setProfileId] = useState(null);
    const [families, setFamilies] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [showModal, setShowModal] = useState(false);
    const [treeName, setTreeName] = useState('');
    const [message, setMessage] = useState('');

    const navigate = useNavigate();

    // 1. Initial Authentication and Data Fetch
    useEffect(() => {
        async function authenticateAndLoad() {
        try {
            const authUser = await checkAuth();
            if (authUser) {
                setUser(authUser);
                const pId = await fetchProfileId(authUser.id);
                setProfileId(pId);
                if (pId) {
                    await loadFamilies(pId, authUser.email);
                }
            }
        } catch (err) {
            console.error(err);
            setMessage("An error occurred while loading.");
        } finally {
            // This ensures the loading screen goes away no matter what
            setIsLoading(false); 
        }
    }
    authenticateAndLoad();
}, []);// Clean dependencies

    const loadFamilies = async (pId,email) => {
        const { families: fetchedFamilies, error } = await fetchUserFamilies(pId, email);
        if (error) {
            console.error('Failed to load families:', error);
            setMessage('Failed to load family trees.');
        } else {
            setFamilies(fetchedFamilies || []);
        }
    };

    const handleCreateTree = async (e) => {
        e.preventDefault();
        setMessage('Creating...');

        if (!treeName.trim()) {
            setMessage('Tree name is required.');
            return;
        }

        const { family, error } = await createNewFamilyTree(treeName, profileId);

        if (error) {
            setMessage(`Error creating tree: ${error.message}`);
        } else {
            setFamilies([family, ...families]); 
            setMessage('Tree created successfully!');
            setTreeName('');
            setTimeout(() => {
                setShowModal(false);
                setMessage('');
            }, 500);
        }
    };

    const handleShareTree = async (familyId, email) => {
    const { error } = await shareFamilyTree(familyId, email);
    if (error) {
        alert("Error sharing: " + error.message);
    } else {
        alert("Tree shared successfully with " + email);
    }
};

    const handleRenameTree = async (familyId, newName) => {
        const { error } = await renameFamilyTree(familyId, newName);
        if (error) {
            alert("Error renaming tree: " + error.message);
        } else {
            setFamilies(prev => prev.map(f => 
                f.id === familyId ? { ...f, name: newName } : f
            ));
        }
    };

    const handleDeleteTree = async (familyId, name) => {
        if (window.confirm(`Are you sure you want to delete the entire "${name}" tree? This cannot be undone.`)) {
            const { success, error } = await deleteFamilyTree(familyId);
            if (success) {
                setFamilies(prev => prev.filter(f => f.id !== familyId));
                setMessage(`"${name}" deleted successfully.`);
                setTimeout(() => setMessage(''), 3000);
            } else {
                alert("Error deleting tree: " + error.message);
            }
        }
    };

    
    
    const handleViewTree = (familyId) => {
        navigate(`/tree-editor/${familyId}`); 
    };

    if (isLoading) {
        return <div className="loading-state">Loading application...</div>;
    }

    

    const Dashboard = () => {
    // ... existing states (user, families, showModal, treeName, etc.)
    const [isMenuOpen, setIsMenuOpen] = useState(false); // Add this for mobile toggle

    return (
        <div id="app-wrapper" className={isMenuOpen ? 'menu-open' : ''}>
            {/* Mobile Menu Toggle Button */}
            <button className="mobile-menu-toggle" onClick={() => setIsMenuOpen(!isMenuOpen)}>
                {isMenuOpen ? '✕' : '☰'}
            </button>

            <aside id="sidebar">
                <div className="sidebar-header">
                    <h1 className="app-title">FamilyRoots</h1>
                    <p id="user-display" className="user-info">{user?.email}</p>
                </div>
                <nav className="main-nav">
                    {/* Added setIsMenuOpen(false) so it closes after clicking on mobile */}
                    <button onClick={() => { navigate('/dashboard'); setIsMenuOpen(false); }} className="nav-link active">🏠 My Family Trees</button>
                    <button onClick={() => { setShowModal(true); setIsMenuOpen(false); }} className="nav-link">➕ Start New Tree</button>
                    <button onClick={() => { navigate('/profile'); setIsMenuOpen(false); }} className="nav-link">👤 Edit Profile</button>
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
                
                {/* The Grid logic remains exactly the same, 
                   we handle the responsiveness in CSS below 
                */}
                <div className="tree-grid">
                    {families.length > 0 ? (
                        families.map(family => (
                            <FamilyTreeCard 
                                key={family.id} 
                                family={family} 
                                onView={handleViewTree}
                                onDelete={handleDeleteTree}
                                onRename={handleRenameTree}
                                onShare={handleShareTree}
                            />
                        ))
                    ) : (
                        <div className="empty-state">
                            <h3>No Family Trees Found</h3>
                            <p>Start your journey by creating your first family tree.</p>
                            <button onClick={() => setShowModal(true)} className="primary-btn">Create Tree</button>
                        </div>
                    )}
                </div>
                {message && <p className="status-message">{message}</p>}
            </main>

            {/* Modal remains unchanged */}
            <Modal show={showModal} onClose={() => setShowModal(false)} title="Start a New Family Tree">
                {/* ... existing form ... */}
            </Modal>
        </div>
    );
};
  
};

export default Dashboard;