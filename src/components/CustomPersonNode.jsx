import React, { useEffect } from 'react';
import { Handle, Position } from 'reactflow';
import './CustomPersonNode.css';

// Helper function to calculate age accurately
const calculateAge = (birthDateString) => {
    if (!birthDateString || birthDateString === 'N/A') return 'N/A';
    
    const today = new Date();
    const birthDate = new Date(birthDateString);

    // Check for invalid date
    if (isNaN(birthDate)) return 'N/A';

    let age = today.getFullYear() - birthDate.getFullYear();
    const m = today.getMonth() - birthDate.getMonth();
    
    // Adjust age if the birthday hasn't passed this year
    if (m < 0 || (m === 0 && today.getDate() < birthDate.getDate())) {
        age--;
    }
    return age;
};

/**
 * Gets the photo URL. We assume the path stored in the database is the final,
 * full public URL (due to the Cloudinary migration).
 * @param {string} path - The value from profile_picture_url.
 * @returns {string|null} The final image URL.
 */
const getPhotoUrl = (path) => {
    if (!path || typeof path !== 'string') {
        return null;
    }
    
    // Cloudinary URLs or other public links will start with https://
    if (path.startsWith('https://')) {
        return path; 
    }
    
    // Fallback logic for legacy paths is now highly discouraged. 
    // If the path isn't a full URL, it's likely a misconfiguration.
    return null;
}

// --- MAIN COMPONENT DECLARATION (MUST ONLY APPEAR ONCE) ---
const CustomPersonNode = ({ data, selected }) => {
    const { first_name, gender, generation } = data;
    
    // 1. Gender Styling
    const genderIcon = gender === 'male' ? '♂️' : gender === 'female' ? '♀️' : '👤';
    const borderStyle = gender === 'male' ? '3px solid #1890ff' : gender === 'female' ? '3px solid #eb2f96' : '1px solid #ddd';

    return (
        <div style={{ 
            padding: '10px', 
            borderRadius: '5px', 
            background: 'white', 
            border: selected ? '5px solid #ff9900' : borderStyle, // Selection takes priority
            minWidth: '150px' 
        }}>
            <Handle type="target" position={Position.Top} id="parent-connect" />
            
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span style={{ fontSize: '20px' }}>{genderIcon}</span>
                <div>
                    <div style={{ fontWeight: 'bold' }}>{first_name}</div>
                    <div style={{ fontSize: '10px', color: '#666' }}>Gen {generation}</div>
                </div>
            </div>

            <Handle type="source" position={Position.Bottom} id="child-connect" />
            <Handle type="bidirectional" position={Position.Left} id="spouse-left" style={{ top: '50%' }} />
            <Handle type="bidirectional" position={Position.Right} id="spouse-right" style={{ top: '50%' }} />
        </div>
    );
};

export default CustomPersonNode;