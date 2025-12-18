import React, { useState, useEffect, useRef } from 'react';
import { 
    createPerson, 
    updatePerson, 
    fetchRelationshipsByPerson, 
    createRelationships,
    deleteRelationship,
    fetchAllPeopleBasic,
    saveProfilePictureUrl // Now a simple API call to save the URL to Supabase
} from '../services/api'; 
// import './PropertiesSidebar.css'; 

// Relationship type mapping for display purposes
const RELATIONSHIP_TYPES = {
    parent: 'Parent',
    child: 'Child',
    spouse: 'Spouse/Partner',
    sibling: 'Sibling'
};


const PropertiesSidebar = ({ person, familyId, onSave, onClose }) => {
    // State for Person Details Form
    const [formData, setFormData] = useState({});
    const [mode, setMode] = useState(null); // 'add' or 'edit'
    const [statusMessage, setStatusMessage] = useState(''); // Correct state setter
    const [isSaving, setIsSaving] = useState(false);
    
    // State for Relationships Panel
    const [allPeople, setAllPeople] = useState([]);
    const [relations, setRelations] = useState([]);
    const [relForm, setRelForm] = useState({ type: '', personId: '' });

    // Refs for Cloudinary Widget
    const cloudinaryRef = useRef();
    const widgetRef = useRef();

    if (!person) return null;
    const handleGenderChange = (newGender) => {
        // This triggers the handleSidebarSave in TreeEditor immediately
        onSave({ ...person, gender: newGender });
    };
    
    // Helper function to load all people and current person's relations
    const loadAllPeopleAndRelations = async (personId) => {
        // Load all people for the relationship dropdown
        const { people: allFamilyPeople, error: peopleError } = await fetchAllPeopleBasic(familyId);
        if (peopleError) {
            console.error("Failed to load all people for dropdown:", peopleError);
            return;
        }
        setAllPeople(allFamilyPeople);

        // Load existing relations if in edit mode
        if (personId) {
            const { relationships, error } = await fetchRelationshipsByPerson(familyId, personId);
            if (error) {
                console.error('Error loading relations:', error);
                return;
            }
            setRelations(relationships);
        }
    };


    // 1. CRITICAL: Initialization and Data Loading Hook
    useEffect(() => {
        // CRITICAL FIX: Exit immediately if nothing is selected (prevents crash on mount)
        if (!person) {
            setMode(null);
            return;
        }
        
        const currentMode = person.id ? 'edit' : 'add';
        setMode(currentMode);

        // Set initial form data
        setFormData({
            firstName: person.first_name || '',
            surname: person.surname || '',
            birthDate: person.birth_date || '', 
            anniversaryDate: person.anniversary_date || '',
            isAlive: person.is_alive !== false,
            gender: person.gender || '', // Added this
            notes: person.notes || '',
            tags: person.tags ? person.tags.join(', ') : '', 
            profilePictureUrl: person.profile_picture_url || ''
        });

        // Load relationships only if in edit mode
        if (currentMode === 'edit') {
            loadAllPeopleAndRelations(person.id);
        }
    }, [person, familyId]);


    // 2. Cloudinary Widget Initialization Hook (Runs once)
    useEffect(() => {
        // @ts-ignore
        cloudinaryRef.current = window.cloudinary;
        
        if (cloudinaryRef.current) {
            widgetRef.current = cloudinaryRef.current.createUploadWidget({
                cloudName: 'dqlgimafr', // REPLACE with your Cloudinary Cloud Name
                uploadPreset: 'family_tree_unsigned', // REPLACE with your unsigned preset name
                sources: ['local', 'url', 'camera'],
                folder: 'family_avatars',
                clientAllowedFormats: ["png", "jpg", "jpeg"],
                maxImageFileSize: 5000000 // 5MB limit
            }, async (error, result) => {
                // --- Widget Success Handler ---
                // CRITICAL FIX: Use setStatusMessage and ensure logic only runs on success event
                if (!error && result && result.event === 'success' && person && person.id) {
                    const url = result.info.secure_url;
                    setStatusMessage('Image uploaded. Saving URL...');
                    
                    // Call API to save the new URL to the database
                    const { error: saveError } = await saveProfilePictureUrl(person.id, url);
                    
                    if (saveError) {
                        setStatusMessage(`Error saving URL: ${saveError.message}`);
                    } else {
                        setStatusMessage('Image saved and updated!');
                        
                        // CRITICAL FIX: Update the node immediately via onSave
                        const updatedPerson = { 
                            ...person, 
                            profile_picture_url: url 
                        };
                        onSave(updatedPerson); 
                    }
                }
                if (error) {
                    setStatusMessage(`Upload Error: ${error.message}`);
                }
            });
        }
    }, [person, onSave]); // Dependencies ensure the handler uses the current person/onSave functions

    
    // --- Upload Button Handler ---
    const handleUploadClick = () => {
        if (person && person.id && widgetRef.current) {
            widgetRef.current.open();
        } else {
            // CRITICAL FIX: Use correct state setter
            setStatusMessage("Please save person details first to enable image upload."); 
        }
    };


    // --- General Form Handlers ---
    
    // REMOVED: handleFileChange (no longer needed with widget)

    const handleFormChange = (e) => {
        const { id, value, type, checked } = e.target;
        setFormData(prev => ({
            ...prev,
            [id]: type === 'checkbox' ? checked : value
        }));
    };

    const handleRelationFormChange = (e) => {
        setRelForm(prev => ({
            ...prev,
            [e.target.id]: e.target.value
        }));
    };

    // --- Person Submission Logic (ONLY FOR TEXT/DATA) ---
    const handleSubmit = async (e) => {
        e.preventDefault();
        setIsSaving(true);
        setStatusMessage('Processing...');
        
        let finalPersonId = person?.id;
        let updatePayload = {
            first_name: formData.firstName,
            surname: formData.surname,
            birth_date: formData.birthDate || null,
            anniversary_date: formData.anniversaryDate || null,
            is_alive: formData.isAlive,
            gender: formData.gender || null,
            notes: formData.notes || null,
            // Convert comma-separated string back to array for PostgreSQL
            tags: formData.tags ? formData.tags.split(',').map(tag => tag.trim()).filter(tag => tag.length > 0) : [], 
            
            // CRITICAL: Preserve existing image URL if not being uploaded via widget
            profile_picture_url: formData.profilePictureUrl || person?.profile_picture_url || null, 
        };

        if (!updatePayload.first_name) { setStatusMessage('First Name is required.'); setIsSaving(false); return; }

        // --- Create New Person Logic ---
        if (mode === 'add') {
            const { person: newPerson, error } = await createPerson(updatePayload, familyId);
            if (error) { 
                setStatusMessage(`Creation Error: ${error.message}`);
                setIsSaving(false);
                return;
            } else { 
                finalPersonId = newPerson.id; 
            }
        }
        
        // --- Update Existing Person Logic ---
        const { person: savedPerson, error: saveError } = await updatePerson(finalPersonId, updatePayload);
        
        if (saveError) {
            setStatusMessage(`Save Error: ${saveError.message}`);
        } else {
            setStatusMessage('Saved successfully!');
            onSave(savedPerson); 
            setMode('edit'); // Transition to edit mode after successful add
            setTimeout(() => setStatusMessage(''), 1500);
        }

        setIsSaving(false);
    };

    // --- Relationship Logic ---

    const handleAddRelationship = async (e) => {
        e.preventDefault();
        if (!person.id) {
            setStatusMessage("Please save the current person before adding relationships.");
            return;
        }

        const { type, personId: relatedPersonId } = relForm;
        if (!type || !relatedPersonId) return;

        setStatusMessage('Adding relationship...');
        
        const personAId = person.id;
        const personBId = relatedPersonId;

        const { error } = await createRelationships(familyId, personAId, personBId, type);

        if (error) {
            setStatusMessage(`Error creating relationship: ${error.message}`);
        } else {
            setStatusMessage('Relationship added!');
            setRelForm({ type: '', personId: '' }); // Reset form
            await loadAllPeopleAndRelations(person.id); // Reload list
            setTimeout(() => setStatusMessage(''), 1500);
        }
    };

    const handleDeleteRelationship = async (id) => {
        if (!window.confirm("Are you sure you want to delete this relationship?")) return;
        
        setStatusMessage('Deleting relationship...');
        const { success, error } = await deleteRelationship(id);
        
        if (error) {
            setStatusMessage(`Error deleting relationship: ${error.message}`);
        } else if (success) {
            setStatusMessage('Relationship deleted!');
            await loadAllPeopleAndRelations(person.id); // Reload list
            setTimeout(() => setStatusMessage(''), 1500);
        }
    };


    if (!person || mode === null) {
        return null;
    }

    return (
        <div className="properties-sidebar">
            <div className="sidebar-header">
                <h3>{mode === 'add' ? 'Add New Person' : `Editing: ${person.first_name}`}</h3>
                <button className="close-sidebar-btn" onClick={onClose}>×</button>
            </div>
            
            <form onSubmit={handleSubmit} className="form-content">
                {/* --- Person Details Section --- */}
                <h4>Person Details</h4>
                <div className="form-group">
                    <label>First Name*</label>
                    <input type="text" id="firstName" value={formData.firstName || ''} onChange={handleFormChange} required />
                </div>
                <div className="form-group">
                    <label>Surname</label>
                    <input type="text" id="surname" value={formData.surname || ''} onChange={handleFormChange} />
                </div>
                <div className="form-group">
                    <label>Birth Date</label>
                    <input type="date" id="birthDate" value={formData.birthDate || ''} onChange={handleFormChange} />
                </div>
                <div className="form-group checkbox-group">
                    <input type="checkbox" id="isAlive" checked={formData.isAlive} onChange={handleFormChange} />
                    <label htmlFor="isAlive" className="inline-label">Is this person alive?</label>
                </div>
                    <div className="form-group">
                <label>Gender</label>
                <select 
                    value={person.gender || ''} 
                    onChange={(e) => handleGenderChange(e.target.value)}
                >
                    <option value="">Not Specified</option>
                    <option value="male">Male</option>
                    <option value="female">Female</option>
                    <option value="other">Other</option>
                </select>
            </div>
                <div className="form-group">
                    <label>Anniversary Date</label>
                    <input type="date" id="anniversaryDate" value={formData.anniversaryDate || ''} onChange={handleFormChange} />
                </div>
                
                {/* Image Upload Section (Cloudinary Widget Trigger) */}
                <div className="form-group">
                    <label>Profile Picture</label>
                    {/* Display current photo URL path if available */}
                    {formData.profilePictureUrl && (
                        <p className="current-photo">Current: {formData.profilePictureUrl.split('/').pop()}</p>
                    )}
                </div>
                <button type="button" onClick={handleUploadClick} disabled={!person || !person.id || mode === 'add'}>
                    🖼️ Upload Profile Image
                </button>
                <small style={{display: 'block', marginTop: '5px'}}>*Image upload enabled after node creation.</small>


                <div className="form-group">
                    <label>Notes</label>
                    <textarea id="notes" value={formData.notes || ''} onChange={handleFormChange} rows="3"></textarea>
                </div>
                <div className="form-group">
                    <label>Tags (Comma Separated)</label>
                    <input type="text" id="tags" value={formData.tags || ''} onChange={handleFormChange} placeholder="e.g., Doctor, Baker, London" />
                </div>
                <div className="form-actions">
                    <button type="submit" className="primary-btn" disabled={isSaving}>
                        {isSaving ? 'Saving...' : (mode === 'add' ? 'Create Node' : 'Save Changes')}
                    </button>
                </div>
            </form>
            
            {/* --- Relationships Section --- */}
            {mode === 'edit' && (
                <div className="relationships-section">
                    <h4>Relationships ({relations.length})</h4>

                    {/* Add Relationship Form */}
                    <form onSubmit={handleAddRelationship} className="relationship-form">
                        <div className="form-group">
                            <label htmlFor="type">Link Type</label>
                            <select id="type" value={relForm.type} onChange={handleRelationFormChange} required>
                                <option value="">Select Type...</option>
                                {Object.entries(RELATIONSHIP_TYPES).map(([key, value]) => (
                                    <option key={key} value={key}>{value}</option>
                                ))}
                            </select>
                        </div>
                        <div className="form-group">
                            <label htmlFor="personId">Related Person</label>
                            <select id="personId" value={relForm.personId} onChange={handleRelationFormChange} required>
                                <option value="">Select Person...</option>
                                {allPeople
                                    .filter(p => p.id !== person.id) // Cannot relate to self
                                    .map(p => (
                                        <option key={p.id} value={p.id}>{p.first_name} {p.surname || p.last_name}</option>
                                    ))}
                            </select>
                        </div>
                        <button type="submit" className="primary-btn small-btn">Add Relation</button>
                    </form>
                    
                    {/* Existing Relationships List */}
                    <div className="relations-list">
                        {relations.length === 0 ? (
                            <p>No connections established.</p>
                        ) : (
                            relations.map(rel => {
                                // Determine which side (A or B) is the *other* person
                                const otherPerson = rel.person_a.id === person.id ? rel.person_b : rel.person_a;
                                return (
                                    <div key={rel.id} className="relation-item">
                                        <span>
                                            <strong>{RELATIONSHIP_TYPES[rel.type]}: </strong> 
                                            {otherPerson.first_name} {otherPerson.surname || otherPerson.last_name}
                                        </span>
                                        <button 
                                            className="delete-relation-btn"
                                            onClick={() => handleDeleteRelationship(rel.id)}
                                        >
                                            Delete
                                        </button>
                                    </div>
                                );
                            })
                        )}
                    </div>
                </div>
            )}
            
            <p className="status-message">{statusMessage}</p>

        </div>
    );
};

export default PropertiesSidebar;