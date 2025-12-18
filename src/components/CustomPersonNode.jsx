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
const CustomPersonNode = ({ data, isConnectable, selected }) => {
    const fullName = `${data.first_name} ${data.surname || data.last_name || ''}`;
    const initials = (data.first_name ? data.first_name[0] : '') + (data.surname || data.last_name ? (data.surname || data.last_name)[0] : '');
    const photoUrl = getPhotoUrl(data.profile_picture_url);

    // Calculate Age and Status
    const age = calculateAge(data.birth_date);
    const birthYear = data.birth_date ? new Date(data.birth_date).getFullYear() : 'N/A';
    // Use data.anniversary_date directly from the API response (if it exists)
    const anniversaryYear = data.anniversary_date ? new Date(data.anniversary_date).getFullYear() : null; 
    
    // Status color based on is_alive property
    const statusColor = data.is_alive === false ? '#ff4d4d' : '#52c41a'; // Red/Green
    
    // Tags processing
    const tagsDisplay = data.tags && Array.isArray(data.tags) && data.tags.length > 0 ? data.tags.join(', ') : null;
    
    // Generation Class for Coloring (Relies on data.generation passed from TreeEditor)
   const generationClass = `gen-${(data.generation || 0) % 4}`;

    return (
        <div className={`custom-person-node ${generationClass} ${selected ? 'selected' : ''}`}>
            <Handle type="target" position={Position.Top} isConnectable={isConnectable} id="parent-connect" /> 
            
            <div className="profile-img-viz">
                {photoUrl ? (
                    <img src={photoUrl} alt={fullName} className="person-photo" />
                ) : (
                    <span className="initials-placeholder">{initials || '?'}</span>
                )}
            </div>
            
            {/* 2. REMOVED the nested <div> that had the hardcoded background: data.bgColor */}
            <div className="person-info-viz">
                <div className="header-viz">
                    <div className="status-indicator" style={{ backgroundColor: statusColor }}></div>
                    <div className="name-line">
                        <strong>{data.first_name}</strong>
                        <span className="surname-text">{data.surname || data.last_name || ''}</span>
                    </div>
                </div>

                <p className="detail-line">DOB: {birthYear} ({age} yrs)</p>
                {anniversaryYear && <p className="detail-line">Anniv: {anniversaryYear}</p>}
                {tagsDisplay && <p className="tag-line">Tags: {tagsDisplay}</p>}
            </div>

            <Handle type="source" position={Position.Bottom} isConnectable={isConnectable} id="child-connect" />
            <Handle type="target" position={Position.Left} isConnectable={isConnectable} id="spouse-left" />
            <Handle type="source" position={Position.Right} isConnectable={isConnectable} id="spouse-right" />
        </div>
    );
};

export default CustomPersonNode;