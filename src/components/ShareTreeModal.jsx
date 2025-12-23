import React, { useState, useEffect, useCallback } from 'react';
import { supabase } from '../config/supabaseClient';

const ShareTreeModal = ({ familyId, onClose }) => {
    const [email, setEmail] = useState('');
    const [permission, setPermission] = useState('view'); // Default to 'view'
    const [loading, setLoading] = useState(false);
    const [collaborators, setCollaborators] = useState([]);

    const fetchCollaborators = useCallback(async () => {
        const { data, error } = await supabase
            .from('Family_Shares') 
            .select('*')
            .eq('family_id', familyId);
        if (!error && data) setCollaborators(data);
    }, [familyId]);

    useEffect(() => { fetchCollaborators(); }, [fetchCollaborators]);

    const handleShare = async (e) => {
        e.preventDefault();
        setLoading(true);
        // Save to Family_Shares table
        const { error } = await supabase.from('Family_Shares').upsert({ 
            family_id: familyId, 
            shared_with_email: email.toLowerCase().trim(), 
            role: permission 
        }, { onConflict: 'family_id, shared_with_email' });

        if (!error) {
            setEmail('');
            fetchCollaborators();
        }
        setLoading(false);
    };

    const removeAccess = async (userEmail) => {
        const { error } = await supabase
            .from('Family_Shares')
            .delete()
            .eq('family_id', familyId)
            .eq('shared_with_email', userEmail);
        if (!error) fetchCollaborators();
    };

    return (
        <div className="modal-overlay" style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 3000 }}>
            <div className="modal-content" style={{ background: 'white', padding: '25px', borderRadius: '12px', width: '380px', color: '#333' }}>
                <h3>Share Family Tree</h3>
                <form onSubmit={handleShare}>
                    <input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="Enter email" required style={{ width: '100%', padding: '10px', marginBottom: '10px', border: '1px solid #ccc', borderRadius: '4px' }} />
                    
                    <select value={permission} onChange={e => setPermission(e.target.value)} style={{ width: '100%', padding: '10px', marginBottom: '15px' }}>
                        <option value="view">View Only</option>
                        <option value="edit">Edit Properties</option>
                        <option value="full">Full Access</option>
                    </select>

                    <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
                        <button type="button" onClick={onClose} className="secondary-btn">Cancel</button>
                        <button type="submit" className="primary-btn" disabled={loading}>{loading ? 'Sharing...' : 'Share'}</button>
                    </div>
                </form>

                <div style={{ marginTop: '20px', borderTop: '1px solid #eee', paddingTop: '10px' }}>
                    <h4>Current Access</h4>
                    {collaborators.map(c => (
                        <div key={c.shared_with_email} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px', marginBottom: '8px' }}>
                            <span>{c.shared_with_email} (<strong>{c.role}</strong>)</span>
                            <button onClick={() => removeAccess(c.shared_with_email)} style={{ color: 'red', border: 'none', background: 'none', cursor: 'pointer' }}>Remove</button>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
};