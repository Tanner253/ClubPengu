/**
 * Notification - Toast notification component
 */

import React from 'react';
import { useChallenge } from '../challenge';

const Notification = () => {
    const { notification } = useChallenge();
    
    if (!notification) return null;
    
    const bgColors = {
        info: 'from-cyan-500/90 to-blue-500/90',
        success: 'from-green-500/90 to-emerald-500/90',
        error: 'from-red-500/90 to-rose-500/90',
        warning: 'from-yellow-500/90 to-orange-500/90',
        challenge: 'from-purple-500/90 to-pink-500/90'
    };
    
    return (
        <div className="fixed top-20 left-1/2 -translate-x-1/2 z-50 animate-fade-in">
            <div className={`bg-gradient-to-r ${bgColors[notification.type] || bgColors.info} backdrop-blur-xl px-6 py-3 rounded-xl shadow-2xl border border-white/20`}>
                <p className="text-white font-medium text-sm">
                    {notification.message}
                </p>
            </div>
        </div>
    );
};

export default Notification;





