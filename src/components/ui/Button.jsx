/**
 * Button - Consistent button component with variants
 */

import React from 'react';

const Button = ({
    children,
    variant = 'primary',
    size = 'md',
    disabled = false,
    fullWidth = false,
    onClick,
    className = '',
    type = 'button',
    ...props
}) => {
    const baseClasses = 'font-bold rounded-xl transition-all active:scale-95 flex items-center justify-center gap-2';
    
    const variantClasses = {
        primary: 'bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white',
        secondary: 'bg-gray-600 hover:bg-gray-500 active:bg-gray-400 text-white',
        danger: 'bg-gradient-to-r from-red-500 to-rose-600 hover:from-red-400 hover:to-rose-500 text-white',
        success: 'bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-400 hover:to-emerald-500 text-white',
        warning: 'bg-gradient-to-r from-yellow-500 to-orange-600 hover:from-yellow-400 hover:to-orange-500 text-white',
        ghost: 'bg-white/10 hover:bg-white/20 active:bg-white/30 text-white',
        challenge: 'bg-gradient-to-r from-red-500 to-orange-500 hover:from-red-400 hover:to-orange-400 text-white',
    };
    
    const sizeClasses = {
        sm: 'px-3 py-1.5 text-xs',
        md: 'px-4 py-2 text-sm',
        lg: 'px-6 py-3 text-base',
    };
    
    const disabledClasses = disabled 
        ? 'bg-gray-600 cursor-not-allowed opacity-50 hover:bg-gray-600' 
        : '';
    
    const widthClass = fullWidth ? 'w-full' : '';
    
    return (
        <button
            type={type}
            onClick={disabled ? undefined : onClick}
            disabled={disabled}
            className={`
                ${baseClasses}
                ${disabled ? disabledClasses : variantClasses[variant]}
                ${sizeClasses[size]}
                ${widthClass}
                ${className}
            `.trim()}
            {...props}
        >
            {children}
        </button>
    );
};

export default Button;

