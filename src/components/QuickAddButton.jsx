// src/components/QuickAddButton.jsx (Final Toolbar Button Implementation)

import React, { useEffect, useRef } from 'react';

// Relationship type mapping for display purposes
const RELATIONSHIP_TYPES = {
    parent: 'Parent',
    child: 'Child',
    spouse: 'Spouse/Partner',
    sibling: 'Sibling'
};


const QuickAddButton = ({ selectedPerson, onAddNode }) => {
    // We are no longer using dropdown state or the outside click hook, so they are removed.
    // const [showDropdown, setShowDropdown] = useState(false);
    // const dropdownRef = useRef(null); 
    
    // The handleAdd function must be defined here, using the props passed to the component.
    const handleAdd = (relationType) => {
        if (selectedPerson) {
            // Call the parent function with the selected person's ID and the type
            onAddNode(selectedPerson.id, relationType); 
        } else {
            // Optional: Provide feedback if the button is somehow clicked while disabled
            alert("Please select a person on the canvas first.");
        }
    };
    
    // Note: The useEffect for handleClickOutside is removed as the dropdown is removed.

    return (
        // The container is now the toolbar itself
        <div 
            className="quick-add-toolbar" 
            // Note: dropdownRef is removed as it's not needed for toolbar buttons
        >
            <span className="toolbar-label">Quick Add:</span>
            
            {/* Iterate over the map and create a button for each type */}
            {Object.entries(RELATIONSHIP_TYPES).map(([typeKey, typeLabel]) => (
                <button
                    key={typeKey}
                    className={`quick-add-btn ${typeKey}`}
                    // Call the correct handler with the relationship type key
                    onClick={() => handleAdd(typeKey)}
                    // Use selectedPerson to determine disabled state
                    disabled={!selectedPerson}
                    title={selectedPerson 
                        ? `Add new ${typeLabel} for ${selectedPerson.first_name}` 
                        : 'Select a person to quick-add a node'
                    }
                >
                    {/* Display the user-friendly label */}
                    + {typeLabel} 
                </button>
            ))}
        </div>
    );
};

export default QuickAddButton;