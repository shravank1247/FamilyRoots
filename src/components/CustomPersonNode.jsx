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
    const { first_name, surname, gender, is_alive, profile_picture_url, generation } = data;
    
    // Gender-based styling
    const genderIcon = gender === 'male' ? '♂️' : gender === 'female' ? '♀️' : '👤';
    const genderClass = gender ? `gender-${gender}` : 'gender-unknown';
    
    const initials = (first_name?.[0] || '') + (surname?.[0] || '');
    const statusColor = is_alive === false ? '#ff4d4d' : '#52c41a';
    const generationClass = `gen-${(generation || 0) % 5}`;

    return (
        <div className={`custom-person-node ${generationClass} ${genderClass} ${selected ? 'selected' : ''}`}>
            <Handle type="target" position={Position.Top} id="parent-connect" />
            
            <div className="node-main-content">
                {/* Gender Badge */}
                <div className="gender-badge">{genderIcon}</div>

                <div className="profile-img-viz">
                    {profile_picture_url ? (
                        <img src={profile_picture_url} alt={first_name} className="person-photo" />
                    ) : (
                        <span className="initials-placeholder">{initials}</span>
                    )}
                </div>
                
                <div className="person-info-viz">
                    <div className="header-viz">
                        <div className="status-indicator" style={{ backgroundColor: statusColor }}></div>
                        <div className="name-line">
                            <strong>{first_name}</strong>
                        </div>
                    </div>
                </div>
            </div>

            <Handle type="source" position={Position.Bottom} id="child-connect" />
            <Handle type="bidirectional" position={Position.Left} id="spouse-left" style={{ top: '50%' }} />
            <Handle type="bidirectional" position={Position.Right} id="spouse-right" style={{ top: '50%' }} />
        </div>
    );
};

export default CustomPersonNode;