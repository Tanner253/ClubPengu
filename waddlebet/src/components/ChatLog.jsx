/**
 * ChatLog - MapleStory/PoE style chat system
 * - Docked bottom-left, always visible (fades when inactive)
 * - Whisper support: /w username message
 * - Different colors for message types
 * - Scrollable history
 * - Mobile: toggleable overlay
 */

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useMultiplayer } from '../multiplayer';
import { useLanguage } from '../i18n';

// Message type colors (MapleStory inspired)
const MESSAGE_COLORS = {
    local: 'text-white',           // Regular chat
    whisperIn: 'text-yellow-300',  // Whisper received
    whisperOut: 'text-pink-300',   // Whisper sent
    system: 'text-cyan-400',       // System messages
    afk: 'text-gray-400',          // AFK messages
    emote: 'text-orange-300',      // Emotes/actions
};

const ChatLog = ({ isMobile = false, isOpen = true, onClose, minigameMode = false, onNewMessage }) => {
    const { chatMessages, playerName, playerId, sendChat, wsRef } = useMultiplayer();
    const { t } = useLanguage();
    const [isActive, setIsActive] = useState(false);
    const [inputValue, setInputValue] = useState('');
    const [localMessages, setLocalMessages] = useState([]); // Combined local + server messages
    const messagesEndRef = useRef(null);
    const inputRef = useRef(null);
    const containerRef = useRef(null);
    const fadeTimeoutRef = useRef(null);
    
    // Merge server messages into local state with type info
    useEffect(() => {
        if (chatMessages.length === 0) return;
        
        const latestServerMsg = chatMessages[chatMessages.length - 1];
        
        // Check if we already have this message
        const exists = localMessages.some(m => m.id === latestServerMsg.id);
        if (exists) return;
        
        // Determine message type
        let type = 'local';
        let displayText = latestServerMsg.text;
        
        if (latestServerMsg.text?.startsWith('💤')) {
            type = 'afk';
        } else if (latestServerMsg.isWhisper) {
            type = latestServerMsg.fromMe ? 'whisperOut' : 'whisperIn';
        }
        
        setLocalMessages(prev => [...prev.slice(-100), {
            ...latestServerMsg,
            type,
            displayText
        }]);
        
        // Notify parent for 3D chat bubbles in minigames
        if (onNewMessage && !latestServerMsg.isWhisper) {
            onNewMessage({
                senderName: latestServerMsg.name,
                text: latestServerMsg.text
            });
        }
        
        // Show chat briefly when new message arrives
        resetFadeTimer();
    }, [chatMessages, onNewMessage]);
    
    // Auto-scroll to bottom
    useEffect(() => {
        if (messagesEndRef.current) {
            messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
        }
    }, [localMessages]);
    
    // Fade timer management
    const resetFadeTimer = useCallback(() => {
        setIsActive(true);
        if (fadeTimeoutRef.current) {
            clearTimeout(fadeTimeoutRef.current);
        }
        fadeTimeoutRef.current = setTimeout(() => {
            if (document.activeElement !== inputRef.current) {
                setIsActive(false);
            }
        }, 8000); // Fade after 8 seconds of inactivity
    }, []);
    
    // Handle input focus
    const handleFocus = () => {
        setIsActive(true);
        if (fadeTimeoutRef.current) {
            clearTimeout(fadeTimeoutRef.current);
        }
    };
    
    // Handle input blur
    const handleBlur = () => {
        resetFadeTimer();
    };
    
    // Exit chat input when clicking outside chat panel
    useEffect(() => {
        const handleGlobalClick = (e) => {
            // Check if input is focused
            if (document.activeElement !== inputRef.current) return;
            
            // Check if click is outside the chat container
            if (containerRef.current && !containerRef.current.contains(e.target)) {
                inputRef.current?.blur();
            }
        };
        
        // Use capture phase to catch clicks before other handlers
        document.addEventListener('click', handleGlobalClick, true);
        
        return () => {
            document.removeEventListener('click', handleGlobalClick, true);
        };
    }, []);
    
    // Handle sending message
    const handleSend = () => {
        if (!inputValue.trim()) return;
        
        const text = inputValue.trim();
        
        // Check for whisper command: /w username message or /whisper username message
        const whisperMatch = text.match(/^\/w(?:hisper)?\s+(\S+)\s+(.+)$/i);
        if (whisperMatch) {
            const targetName = whisperMatch[1];
            const message = whisperMatch[2];
            
            // Send whisper via WebSocket - server will echo back confirmation
            if (window.__multiplayerWs?.readyState === 1) {
                window.__multiplayerWs.send(JSON.stringify({
                    type: 'whisper',
                    targetName: targetName,
                    text: message
                }));
            }
            
            // Don't add locally - wait for server confirmation (whisper_sent)
            // This prevents duplicates and handles errors properly
            
            setInputValue('');
            resetFadeTimer();
            inputRef.current?.blur(); // Auto-blur so player can move again
            return;
        }
        
        // Check for reply command: /r message (reply to last whisper)
        const replyMatch = text.match(/^\/r\s+(.+)$/i);
        if (replyMatch) {
            // Find last incoming whisper
            const lastWhisper = [...localMessages].reverse().find(m => m.type === 'whisperIn');
            if (lastWhisper && lastWhisper.fromName) {
                const message = replyMatch[1];
                
                // Send whisper via WebSocket - server will echo back confirmation
                if (window.__multiplayerWs?.readyState === 1) {
                    window.__multiplayerWs.send(JSON.stringify({
                        type: 'whisper',
                        targetName: lastWhisper.fromName,
                        text: message
                    }));
                }
                
                // Don't add locally - wait for server confirmation
            } else {
                // No one to reply to
                setLocalMessages(prev => [...prev.slice(-100), {
                    id: Date.now(),
                    type: 'system',
                    name: 'System',
                    text: 'No one to reply to.',
                    timestamp: Date.now()
                }]);
            }
            
            setInputValue('');
            resetFadeTimer();
            inputRef.current?.blur(); // Auto-blur so player can move again
            return;
        }
        
        // Check for spawn command: /spawn - teleport to spawn point if stuck
        if (text.toLowerCase() === '/spawn') {
            // Dispatch event to VoxelWorld to handle spawn teleport
            window.dispatchEvent(new CustomEvent('chatCommand', { detail: { command: 'spawn' } }));
            
            setLocalMessages(prev => [...prev.slice(-100), {
                id: Date.now(),
                type: 'system',
                name: 'System',
                text: '✨ Teleporting to spawn point...',
                timestamp: Date.now()
            }]);
            
            setInputValue('');
            resetFadeTimer();
            inputRef.current?.blur();
            return;
        }
        
        // DEV ONLY: Parkour warp commands /warp pk1, /warp pk2, etc.
        const pkMatch = text.toLowerCase().match(/^\/warp\s+(pk[1-6])$/);
        if (pkMatch && process.env.NODE_ENV === 'development') {
            const stage = pkMatch[1];
            const stageNames = {
                pk1: 'Stage 1 (Blue)',
                pk2: 'Stage 2 (Purple)',
                pk3: 'Stage 3 (Green)',
                pk4: 'Stage 4 (Orange)',
                pk5: 'Stage 5 (Red)',
                pk6: 'Stage 6 (Cyan) - The Gauntlet'
            };
            
            window.dispatchEvent(new CustomEvent('chatCommand', { detail: { command: stage } }));
            
            setLocalMessages(prev => [...prev.slice(-100), {
                id: Date.now(),
                type: 'system',
                name: 'System',
                text: `🎮 Warping to Parkour ${stageNames[stage]}...`,
                timestamp: Date.now()
            }]);
            
            setInputValue('');
            resetFadeTimer();
            inputRef.current?.blur();
            return;
        }
        
        // Regular chat message
        sendChat(text);
        setInputValue('');
        resetFadeTimer();
        
        // Auto-blur so player can move again
        inputRef.current?.blur();
    };
    
    // Handle key press
    const handleKeyDown = (e) => {
        if (e.key === 'Enter') {
            e.preventDefault();
            e.stopPropagation();
            handleSend();
        }
        if (e.key === 'Escape') {
            inputRef.current?.blur();
        }
    };
    
    // Format timestamp
    const formatTime = (timestamp) => {
        const date = new Date(timestamp);
        return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    };
    
    // Click anywhere on chat to focus input
    const handleContainerClick = (e) => {
        if (e.target === containerRef.current || e.target.closest('.chat-messages')) {
            inputRef.current?.focus();
        }
    };
    
    // Don't render if mobile and closed
    if (isMobile && !isOpen) return null;
    
    // Mobile: render with backdrop
    if (isMobile) {
        return (
            <div 
                className="fixed inset-0 z-40 pointer-events-auto flex items-center justify-center p-4"
                onClick={(e) => {
                    if (e.target === e.currentTarget) onClose?.();
                }}
                data-no-camera="true"
            >
                {/* Semi-transparent backdrop */}
                <div className="absolute inset-0 bg-black/50" onClick={onClose} />
                
                {/* Chat panel - centered */}
                <div 
                    ref={containerRef}
                    onClick={(e) => e.stopPropagation()}
                    className="relative w-full max-w-sm bg-black/95 rounded-xl border border-white/20 overflow-hidden"
                >
                    {/* Mobile Header with Close Button */}
                    <div className="flex items-center justify-between px-4 py-3 border-b border-white/10">
                        <span className="text-white text-sm retro-text">💬 Chat</span>
                        <button 
                            onClick={onClose}
                            className="text-white/60 hover:text-white text-xl leading-none p-1"
                        >
                            ✕
                        </button>
                    </div>
                    
                    {/* Messages Container - fixed height with scroll */}
                    <div className="chat-messages h-40 overflow-y-auto overflow-x-hidden overscroll-contain scrollbar-thin scrollbar-thumb-white/20 scrollbar-track-transparent">
                        <div className="p-3 space-y-1 min-h-full">
                            {localMessages.length === 0 ? (
                                <div className="text-white/30 text-sm py-4 text-center">
                                    No messages yet
                                </div>
                            ) : (
                                localMessages.map((msg, idx) => (
                                    <div 
                                        key={`${msg.id}-${idx}`} 
                                        className={`text-sm leading-relaxed break-words overflow-hidden ${MESSAGE_COLORS[msg.type] || MESSAGE_COLORS.local}`}
                                        style={{ wordBreak: 'break-word', overflowWrap: 'anywhere' }}
                                    >
                                        <span className="text-white/30 mr-1 text-xs">[{formatTime(msg.timestamp)}]</span>
                                        {msg.type === 'whisperIn' && (
                                            <span className="text-yellow-400">[From {msg.name}]: </span>
                                        )}
                                        {msg.type === 'whisperOut' && (
                                            <span className="text-pink-400">{msg.name}: </span>
                                        )}
                                        {msg.type === 'system' && (
                                            <span className="text-cyan-400">[{msg.name}] </span>
                                        )}
                                        {(msg.type === 'local' || msg.type === 'afk') && (
                                            <span className={msg.name === playerName ? 'text-green-400' : 'text-blue-300'}>
                                                {msg.name}: 
                                            </span>
                                        )}
                                        <span className="ml-1 break-words">{msg.text || msg.displayText}</span>
                                    </div>
                                ))
                            )}
                            <div ref={messagesEndRef} />
                        </div>
                    </div>
                    
                    {/* Input Area */}
                    <div className="p-3 border-t border-white/10">
                        <div className="flex items-center gap-2">
                            <input
                                ref={inputRef}
                                id="chat-input-field"
                                type="text"
                                value={inputValue}
                                onChange={(e) => setInputValue(e.target.value)}
                                onKeyDown={handleKeyDown}
                                onFocus={handleFocus}
                                onBlur={handleBlur}
                                placeholder="Type message..."
                                className="flex-1 bg-white/10 rounded-xl px-4 py-3 text-white text-sm focus:outline-none focus:ring-2 focus:ring-cyan-500 placeholder-white/30"
                                maxLength={200}
                                autoFocus
                            />
                            <button 
                                onClick={handleSend}
                                className="bg-cyan-600 hover:bg-cyan-500 active:bg-cyan-700 text-white px-5 py-3 rounded-xl text-sm retro-text transition-colors"
                            >
                                Send
                            </button>
                        </div>
                        <div className="text-[10px] text-white/40 mt-2 text-center">
                            /w name msg • /r reply • /afk • /spawn
                        </div>
                    </div>
                </div>
            </div>
        );
    }
    
    // Desktop version
    return (
        <div 
            ref={containerRef}
            onClick={handleContainerClick}
            onMouseEnter={() => setIsActive(true)}
            onMouseLeave={() => !document.activeElement?.closest('.chat-log') && resetFadeTimer()}
            className={`chat-log fixed z-30 pointer-events-auto transition-all duration-300 left-4 w-80 ${
                minigameMode ? 'top-1/2 -translate-y-1/2' : 'bottom-20'
            } ${
                isActive ? 'opacity-100' : 'opacity-40 hover:opacity-100'
            }`}
            data-no-camera="true"
        >
            {/* Messages Container */}
            <div 
                className="chat-messages bg-black/70 backdrop-blur-sm overflow-y-auto overflow-x-hidden scrollbar-thin scrollbar-thumb-white/20 scrollbar-track-transparent rounded-t-lg max-h-48"
            >
                <div className="p-2 space-y-0.5">
                    {localMessages.length === 0 ? (
                        <div className="text-white/30 text-xs py-2 text-center">
                            {t('chat.enterToChat')} • {t('chat.whisperHint')}
                        </div>
                    ) : (
                        localMessages.map((msg, idx) => (
                            <div 
                                key={`${msg.id}-${idx}`} 
                                className={`text-xs leading-relaxed break-words overflow-hidden ${MESSAGE_COLORS[msg.type] || MESSAGE_COLORS.local}`}
                                style={{ wordBreak: 'break-word', overflowWrap: 'anywhere' }}
                            >
                                <span className="text-white/30 mr-1">[{formatTime(msg.timestamp)}]</span>
                                {msg.type === 'whisperIn' && (
                                    <span className="text-yellow-400">[From {msg.name}]: </span>
                                )}
                                {msg.type === 'whisperOut' && (
                                    <span className="text-pink-400">{msg.name}: </span>
                                )}
                                {msg.type === 'system' && (
                                    <span className="text-cyan-400">[{msg.name}] </span>
                                )}
                                {(msg.type === 'local' || msg.type === 'afk') && (
                                    <span className={msg.name === playerName ? 'text-green-400' : 'text-blue-300'}>
                                        {msg.name}: 
                                    </span>
                                )}
                                <span className="ml-1 break-words">{msg.text || msg.displayText}</span>
                            </div>
                        ))
                    )}
                    <div ref={messagesEndRef} />
                </div>
            </div>
            
            {/* Input Area */}
            <div className="bg-black/80 border-t border-white/10 rounded-b-lg">
                <input
                    ref={inputRef}
                    id="chat-input-field"
                    type="text"
                    value={inputValue}
                    onChange={(e) => setInputValue(e.target.value)}
                    onKeyDown={handleKeyDown}
                    onFocus={handleFocus}
                    onBlur={handleBlur}
                    placeholder={t('chat.placeholder')}
                    className="w-full bg-transparent text-white text-xs focus:outline-none placeholder-white/30 px-3 py-2"
                    maxLength={200}
                />
            </div>
            
            {/* Help tooltip when focused */}
            {isActive && document.activeElement === inputRef.current && (
                <div className="absolute -top-6 left-0 text-[10px] text-white/40">
                    /w name msg • /r msg (reply) • /afk msg
                </div>
            )}
        </div>
    );
};

export default ChatLog;
