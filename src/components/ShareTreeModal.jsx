import React, { useState, useEffect, useCallback } from 'react';
import { supabase } from '../config/supabaseClient';

const ShareTreeModal = ({ familyId, onClose }) => {
    // Hooks must always be at the top
    const [email, setEmail] = useState('');
    const [permission, setPermission] = useState('viewonly');
    const [loading, setLoading] = useState(false);
    const [collaborators, setCollaborators] = useState([]);

    // We use useCallback to keep the function stable
    const fetchCollaborators = useCallback(async () => {
        const { data, error } = await supabase
            .from('tree_permissions')
            .select('*')
            .eq('tree_id', familyId);
        
        if (!error && data) setCollaborators(data);
    }, [familyId]);

    useEffect(() => {
        if (familyId) {
            fetchCollaborators();
        }
    }, [familyId, fetchCollaborators]);

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
        if (error) {
            alert(error.message);
        } else {
            alert(`Shared successfully!`);
            setEmail('');
            fetchCollaborators(); 
        }
    };

    return (
        <div className="modal-overlay" style={{
            position: 'fixed', top: 0, left: 0, width: '100%', height: '100%',
            background: 'rgba(0,0,0,0.6)', display: 'flex', justifyContent: 'center', alignItems: 'center', 
            zIndex: 9999 
        }}>
            <div className="modal-content" style={{ 
                background: 'white', padding: '25px', borderRadius: '12px', 
                width: '90%', maxWidth: '400px', color: '#333'
            }}>
                <h3 style={{ color: '#2d6a4f', marginTop: 0 }}>Share Tree</h3>
                
                <form onSubmit={handleShare}>
                    <div style={{ marginBottom: '15px' }}>
                        <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>Email</label>
                        <input 
                            type="email" 
                            style={{ width: '100%', padding: '10px', borderRadius: '6px', border: '1px solid #ddd', boxSizing: 'border-box' }}
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            required 
                        />
                    </div>

                    <div style={{ marginBottom: '20px' }}>
                        <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>Permission</label>
                        <select 
                            style={{ width: '100%', padding: '10px', borderRadius: '6px', border: '1px solid #ddd' }}
                            value={permission}
                            onChange={(e) => setPermission(e.target.value)}
                        >
                            <option value="viewonly">View Only (Canvas Locked)</option>
                            <option value="edit">Edit (Can change info, no moving)</option>
                            <option value="full">Full Access (All controls)</option>
                        </select>
                    </div>

                    <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
                        <button type="button" onClick={onClose} style={{ padding: '8px 15px', border: 'none', background: '#eee', borderRadius: '4px' }}>Cancel</button>
                        <button type="submit" disabled={loading} style={{ background: '#2d6a4f', color: 'white', padding: '8px 15px', border: 'none', borderRadius: '4px' }}>
                            {loading ? '...' : 'Share'}
                        </button>
                    </div>
                </form>

                <div style={{ marginTop: '20px', borderTop: '1px solid #eee', paddingTop: '15px' }}>
                    <h4 style={{ margin: '0 0 10px 0', fontSize: '14px' }}>Current Access</h4>
                    {collaborators.map(c => (
                        <div key={c.user_email} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px', marginBottom: '5px' }}>
                            <span>{c.user_email} <strong>({c.role})</strong></span>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
};

export default ShareTreeModal;