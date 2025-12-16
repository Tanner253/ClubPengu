/**
 * Modal - Reusable modal wrapper component
 * Handles backdrop, click-outside, escape key, animations
 */

import React, { useRef } from 'react';
import { useClickOutside, useEscapeKey } from '../../hooks';

const Modal = ({
    isOpen,
    onClose,
    title,
    children,
    size = 'md',
    className = '',
    showCloseButton = true,
    closeOnBackdrop = true,
    closeOnEscape = true,
}) => {
    const modalRef = useRef(null);
    
    useClickOutside(modalRef, () => {
        if (closeOnBackdrop) onClose();
    }, isOpen);
    
    useEscapeKey(onClose, isOpen && closeOnEscape);
    
    if (!isOpen) return null;
    
    const sizeClasses = {
        sm: 'w-[280px] sm:w-[320px]',
        md: 'w-[320px] sm:w-[380px]',
        lg: 'w-[380px] sm:w-[480px]',
        xl: 'w-full max-w-2xl',
        full: 'w-full max-w-4xl',
    };
    
    const handleBackdropClick = (e) => {
        if (e.target === e.currentTarget && closeOnBackdrop) {
            onClose();
        }
    };
    
    const handleModalInteraction = (e) => {
        e.stopPropagation();
    };
    
    return (
        <div 
            className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm animate-fade-in overflow-hidden"
            onClick={handleBackdropClick}
        >
            <div 
                className="w-full h-full flex items-start sm:items-center justify-center p-3 sm:p-4 overflow-y-auto overscroll-contain"
                style={{ WebkitOverflowScrolling: 'touch' }}
                onClick={handleBackdropClick}
            >
                {/* Modal wrapper with outset close button */}
                <div className="relative my-4 sm:my-auto flex-shrink-0">
                    {/* Close button - outset */}
                    {showCloseButton && (
                        <button 
                            onClick={onClose}
                            className="absolute -top-3 -right-3 z-10 w-9 h-9 bg-gray-800 hover:bg-gray-700 border border-white/20 rounded-full flex items-center justify-center text-white/70 hover:text-white text-base shadow-lg transition-colors"
                        >
                            ✕
                        </button>
                    )}
                    
                    <div 
                        ref={modalRef}
                        className={`bg-gradient-to-br from-gray-900/95 to-gray-800/95 backdrop-blur-xl rounded-2xl border border-white/10 shadow-2xl ${sizeClasses[size]} ${className}`}
                        onClick={handleModalInteraction}
                        onMouseDown={handleModalInteraction}
                        data-no-camera="true"
                    >
                        {/* Header with title */}
                        {title && (
                            <div className="px-4 sm:px-5 pt-4 sm:pt-5 pb-2">
                                <h3 className="text-base sm:text-lg font-bold text-white">
                                    {title}
                                </h3>
                            </div>
                        )}
                        
                        {/* Content */}
                        <div className={title ? 'px-4 sm:px-5 pb-4 sm:pb-5' : 'p-4 sm:p-5'}>
                            {children}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default Modal;

