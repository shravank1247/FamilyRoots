import React, { useState, useEffect } from 'react';
import { supabase } from '../config/supabaseClient';

const ShareTreeModal = ({ familyId, onClose }) => {
    const [email, setEmail] = useState('');
    const [permission, setPermission] = useState('viewonly');
    const [loading, setLoading] = useState(false);
    const [collaborators, setCollaborators] = useState([]);

    // 1. Fetch the list of people already shared with
    const fetchCollaborators = async () => {
        const { data, error } = await supabase
            .from('tree_permissions')
            .select('*')
            .eq('tree_id', familyId);
        
        if (!error) setCollaborators(data);
    };

    useEffect(() => {
        fetchCollaborators();
    }, [familyId]);

    const handleShare = async (e) => {
        e.preventDefault();
        setLoading(true);

        const { error } = await supabase
            .from('tree_permissions')
            .upsert({ 
                tree_id: familyId, 
                user_email: email.toLowerCase().trim(), 
                role: permission 
            }, { onConflict: 'tree_id, user_email' });

        setLoading(false);
        if (error) alert(error.message);
        else {
            alert(`Tree successfully shared!`);
            setEmail('');
            fetchCollaborators(); // Refresh the list
        }
    };

    const removeAccess = async (userEmail) => {
        if (window.confirm(`Remove access for ${userEmail}?`)) {
            const { error } = await supabase
                .from('tree_permissions')
                .delete()
                .eq('tree_id', familyId)
                .eq('user_email', userEmail);
            
            if (!error) fetchCollaborators();
        }
    };

    return (
        <div className="modal-overlay" style={{
            position: 'fixed', top: 0, left: 0, width: '100%', height: '100%',
            background: 'rgba(0,0,0,0.5)', display: 'flex', justifyContent: 'center', alignItems: 'center', 
            zIndex: 2000 // Fixed: z-index changed to zIndex
        }}>
            <div className="modal-content" style={{ 
                background: 'white', padding: '30px', borderRadius: '12px', 
                width: '400px', maxHeight: '90vh', overflowY: 'auto' 
            }}>
                <h3 style={{ color: '#2d6a4f', marginBottom: '20px' }}>Share Tree</h3>
                
                {/* Share Form */}
                <form onSubmit={handleShare} style={{ borderBottom: '1px solid #eee', paddingBottom: '20px', marginBottom: '20px' }}>
                    <div style={{ marginBottom: '15px' }}>
                        <label style={{ display: 'block', fontSize: '14px', marginBottom: '5px', fontWeight: 'bold' }}>Email Address</label>
                        <input 
                            type="email" 
                            style={{ width: '100%', padding: '10px', borderRadius: '6px', border: '1px solid #ddd', boxSizing: 'border-box' }}
                            placeholder="invitee@gmail.com"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            required 
                        />
                    </div>

                    <div style={{ marginBottom: '25px' }}>
                        <label style={{ display: 'block', fontSize: '14px', marginBottom: '5px', fontWeight: 'bold' }}>Permission Level</label>
                        <select 
                            style={{ width: '100%', padding: '10px', borderRadius: '6px', border: '1px solid #ddd' }}
                            value={permission}
                            onChange={(e) => setPermission(e.target.value)}
                        >
                            <option value="viewonly">View Only</option>
                            <option value="edit">Edit (Properties only)</option>
                            <option value="full">Full Access</option>
                        </select>
                    </div>

                    <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
                        <button type="button" onClick={onClose} style={{ padding: '10px 15px', border: 'none', background: '#f0f0f0', borderRadius: '6px', cursor: 'pointer' }}>Cancel</button>
                        <button type="submit" disabled={loading} style={{ background: '#2d6a4f', color: 'white', padding: '10px 15px', border: 'none', borderRadius: '6px', cursor: 'pointer' }}>
                            {loading ? 'Sharing...' : 'Share Tree'}
                        </button>
                    </div>
                </form>

                {/* Collaborators List */}
                <div className="collaborators-list">
                    <h4 style={{ fontSize: '14px', marginBottom: '10px', color: '#666' }}>People with access:</h4>
                    {collaborators.length === 0 ? (
                        <p style={{ fontSize: '13px', color: '#999' }}>Not shared with anyone yet.</p>
                    ) : (
                        collaborators.map((collab) => (
                            <div key={collab.user_email} style={{ 
                                display: 'flex', justifyContent: 'space-between', alignItems: 'center', 
                                padding: '10px 0', borderBottom: '1px solid #f9f9f9' 
                            }}>
                                <div>
                                    <div style={{ fontSize: '14px', fontWeight: '500' }}>{collab.user_email}</div>
                                    <div style={{ fontSize: '12px', color: '#2d6a4f', textTransform: 'uppercase' }}>{collab.role}</div>
                                </div>
                                <button 
                                    onClick={() => removeAccess(collab.user_email)}
                                    style={{ background: 'none', border: 'none', color: '#ff4d4d', cursor: 'pointer', fontSize: '18px' }}
                                    title="Remove Access"
                                >
                                    ✕
                                </button>
                            </div>
                        ))
                    )}
                </div>
            </div>
        </div>
    );
};

export default ShareTreeModal;