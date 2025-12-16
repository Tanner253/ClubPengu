/**
 * StatBar - Visual progress/stat bar component
 * Used for displaying stats like hunger, energy, happiness
 */

import React from 'react';

const StatBar = ({ 
    label, 
    value, 
    color = 'cyan', 
    icon, 
    inverted = false,
    showValue = false,
    size = 'md'
}) => {
    const displayValue = inverted ? (100 - value) : value;
    
    const colorClasses = {
        orange: 'bg-orange-400',
        cyan: 'bg-cyan-400',
        yellow: 'bg-yellow-400',
        green: 'bg-green-400',
        red: 'bg-red-400',
        purple: 'bg-purple-400',
        blue: 'bg-blue-400',
    };
    
    const sizeClasses = {
        sm: {
            container: 'p-1.5',
            icon: 'text-xs mb-0.5',
            bar: 'h-1',
            label: 'text-[8px]',
        },
        md: {
            container: 'p-2',
            icon: 'text-sm mb-1',
            bar: 'h-1.5',
            label: 'text-[9px]',
        },
        lg: {
            container: 'p-3',
            icon: 'text-base mb-1.5',
            bar: 'h-2',
            label: 'text-xs',
        },
    };
    
    const sizes = sizeClasses[size];
    const barColor = colorClasses[color] || colorClasses.cyan;
    
    return (
        <div className={`bg-black/30 rounded-lg ${sizes.container} text-center`}>
            {icon && <div className={sizes.icon}>{icon}</div>}
            <div className={`w-full bg-black/40 rounded-full ${sizes.bar} mb-1`}>
                <div 
                    className={`${barColor} ${sizes.bar} rounded-full transition-all duration-300`}
                    style={{ width: `${Math.max(5, displayValue)}%` }}
                />
            </div>
            <div className={`text-white/60 ${sizes.label}`}>
                {label}
                {showValue && <span className="ml-1 text-white/80">{Math.round(displayValue)}%</span>}
            </div>
        </div>
    );
};

export default StatBar;

