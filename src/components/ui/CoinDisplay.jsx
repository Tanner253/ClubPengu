/**
 * CoinDisplay - Displays coin amount with icon
 */

import React from 'react';

const CoinDisplay = ({ 
    amount, 
    size = 'md',
    showIcon = true,
    className = '',
    label = null,
}) => {
    const sizeClasses = {
        sm: {
            container: 'px-2 py-1 text-xs',
            icon: 'text-sm',
        },
        md: {
            container: 'px-3 py-2 text-sm',
            icon: 'text-lg',
        },
        lg: {
            container: 'px-4 py-2.5 text-base',
            icon: 'text-xl',
        },
    };
    
    const sizes = sizeClasses[size];
    
    return (
        <div className={`bg-black/70 backdrop-blur-md rounded-lg ${sizes.container} flex items-center gap-2 border border-yellow-400/30 ${className}`}>
            {label && <span className="text-white/50">{label}</span>}
            {showIcon && <span className={sizes.icon}>💰</span>}
            <span className="text-yellow-300 font-bold retro-text">{amount}</span>
        </div>
    );
};

export default CoinDisplay;

