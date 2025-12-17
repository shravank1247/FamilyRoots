// src/components/Modal.jsx

import React from 'react';
// import './Modal.css'; // Assume you have this local CSS file

const Modal = ({ show, onClose, title, children }) => {
    if (!show) {
        return null;
    }

    // Stop propagation to prevent clicks inside the modal from closing it
    const handleContentClick = (e) => {
        e.stopPropagation();
    };

    return (
        <div className="modal-overlay" onClick={onClose}>
            <div className="modal-content" onClick={handleContentClick}>
                <div className="modal-header">
                    <h3>{title}</h3>
                    <span className="close-btn" onClick={onClose}>&times;</span>
                </div>
                <div className="modal-body">
                    {children}
                </div>
            </div>
        </div>
    );
};

export default Modal;