/**
 * GiftNotification - Shows incoming gift notifications
 * Appears when another player sends you a gift (gold, pebbles, or cosmetic)
 */

import React, { useState, useEffect } from 'react';

const GiftNotification = ({ gift, onClose }) => {
    const [isVisible, setIsVisible] = useState(false);
    
    useEffect(() => {
        // Animate in
        setTimeout(() => setIsVisible(true), 50);
        
        // Auto dismiss after 6 seconds
        const timeout = setTimeout(() => {
            setIsVisible(false);
            setTimeout(onClose, 300);
        }, 6000);
        
        return () => clearTimeout(timeout);
    }, [onClose]);
    
    if (!gift) return null;
    
    const getGiftDisplay = () => {
        switch (gift.giftType) {
            case 'gold':
                return {
                    icon: '🪙',
                    title: 'Gold Gift Received!',
                    amount: `${gift.amount?.toLocaleString() || 0} Gold`,
                    color: '#FBBF24'
                };
            case 'pebbles':
                return {
                    icon: '🪨',
                    title: 'Pebbles Gift Received!',
                    amount: `${gift.amount?.toLocaleString() || 0} Pebbles`,
                    color: '#6B7280'
                };
            case 'item':
                return {
                    icon: '🎁',
                    title: 'Cosmetic Gift Received!',
                    amount: gift.item?.name || gift.item?.templateId || 'Item',
                    color: '#A855F7'
                };
            default:
                return {
                    icon: '🎁',
                    title: 'Gift Received!',
                    amount: 'A gift',
                    color: '#A855F7'
                };
        }
    };
    
    const display = getGiftDisplay();
    
    return (
        <div style={{
            ...styles.container,
            transform: isVisible ? 'translateX(0)' : 'translateX(120%)',
            opacity: isVisible ? 1 : 0,
            borderColor: `${display.color}80`
        }}>
            <div style={styles.icon}>{display.icon}</div>
            <div style={styles.content}>
                <div style={styles.title}>
                    {display.title}
                </div>
                <div style={{ ...styles.amount, color: display.color }}>
                    {display.amount}
                </div>
                <div style={styles.from}>
                    from {gift.from?.username || 'A penguin'}
                </div>
                {gift.item?.serialNumber && (
                    <div style={styles.serial}>
                        #{gift.item.serialNumber}
                    </div>
                )}
            </div>
            <button style={styles.closeBtn} onClick={() => {
                setIsVisible(false);
                setTimeout(onClose, 300);
            }}>✕</button>
        </div>
    );
};

const styles = {
    container: {
        position: 'fixed',
        top: '100px',
        right: '20px',
        background: 'linear-gradient(145deg, #1a1a2e 0%, #16213e 100%)',
        borderRadius: '12px',
        border: '1px solid rgba(168, 85, 247, 0.5)',
        padding: '16px 20px',
        display: 'flex',
        alignItems: 'flex-start',
        gap: '12px',
        boxShadow: '0 10px 30px rgba(0, 0, 0, 0.4)',
        zIndex: 9999,
        transition: 'all 0.3s ease-out',
        minWidth: '280px',
        maxWidth: '320px',
    },
    icon: {
        fontSize: '28px',
    },
    content: {
        flex: 1,
    },
    title: {
        fontSize: '12px',
        color: '#A855F7',
        fontWeight: 'bold',
        textTransform: 'uppercase',
        letterSpacing: '1px',
        marginBottom: '4px',
    },
    amount: {
        fontSize: '20px',
        fontWeight: 'bold',
        color: '#fff',
        marginBottom: '2px',
    },
    from: {
        fontSize: '13px',
        color: '#888',
        marginTop: '4px',
    },
    serial: {
        fontSize: '11px',
        color: '#666',
        marginTop: '2px',
        fontStyle: 'italic',
    },
    closeBtn: {
        background: 'none',
        border: 'none',
        color: '#666',
        fontSize: '16px',
        cursor: 'pointer',
        padding: '0',
        lineHeight: '1',
    }
};

export default GiftNotification;

