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
    const fullName = `${data.first_name} ${data.surname || ''}`;
    const initials = (data.first_name?.[0] || '') + (data.surname?.[0] || '');
    
    
    // Status and Generation logic
    const genderClass = gender === 'male' ? 'gender-male' : gender === 'female' ? 'gender-female' : '';
    const statusColor = data.is_alive === false ? '#ff4d4d' : '#52c41a';
    const generationClass = `gen-${(data.generation || 0) % 5}`;

    return (
        <div className={`custom-person-node ${generationClass} ${selected ? 'selected' : ''}`}>
            {/* Top/Bottom handles for Parent-Child relationships */}
            <Handle type="target" position={Position.Top} id="parent-connect" />
            
            <div className="profile-img-viz">
                {data.profile_picture_url ? (
                    <img src={data.profile_picture_url} alt={fullName} className="person-photo" />
                ) : (
                    <span className="initials-placeholder">{initials || '?'}</span>
                )}
            </div>
            <div className="gender-indicator">{gender === 'male' ? '♂️' : gender === 'female' ? '♀️' : ''}</div>
            <div className="person-info-viz">
                <div className="header-viz">
                    <div className="status-indicator" style={{ backgroundColor: statusColor }}></div>
                    <div className="name-line">
                        <strong>{data.first_name}</strong>
                        <span className="surname-text">{data.surname || ''}</span>
                    </div>
                </div>
                <p className="detail-line">DOB: {data.birth_date || 'N/A'}</p>
            </div>

            <Handle type="source" position={Position.Bottom} id="child-connect" />

            {/* CRITICAL: Side handles for Spouses */}
            {/* Left side handle */}
<Handle 
    type="source" 
    position={Position.Left} 
    id="spouse-left" 
    style={{ top: '50%', background: '#ff69b4', width: '8px', height: '8px' }} 
/>

{/* Right side handle */}
<Handle 
    type="target" 
    position={Position.Right} 
    id="spouse-right" 
    style={{ top: '50%', background: '#ff69b4', width: '8px', height: '8px' }} 
/>
        </div>
    );
};

export default CustomPersonNode;