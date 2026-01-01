/**
 * SettingsMenu - Game settings panel
 * Left/right handed mode and camera sensitivity
 */

import React, { useRef } from 'react';
import { useClickOutside, useEscapeKey } from '../hooks';

const SettingsMenu = ({ isOpen, onClose, settings, onSettingsChange, onOpenChangelog, isAuthenticated }) => {
    const menuRef = useRef(null);
    
    // Use shared hooks for click outside and escape key
    useClickOutside(menuRef, onClose, isOpen);
    useEscapeKey(onClose, isOpen);
    
    if (!isOpen) return null;
    
    const handleToggle = (key) => {
        // Some toggles default to true (soundEnabled, snowEnabled), others to false (leftHanded, musicMuted)
        const defaultsToTrue = ['soundEnabled', 'snowEnabled'];
        const currentValue = defaultsToTrue.includes(key) 
            ? settings[key] !== false  // For default-true: undefined = true
            : settings[key] === true;  // For default-false: undefined = false
        const newSettings = { ...settings, [key]: !currentValue };
        onSettingsChange(newSettings);
        // Dispatch event for music player
        window.dispatchEvent(new CustomEvent('settingsChanged'));
    };
    
    const handleSlider = (key, value) => {
        const newSettings = { ...settings, [key]: value };
        onSettingsChange(newSettings);
        // Dispatch event for music player
        window.dispatchEvent(new CustomEvent('settingsChanged'));
    };
    
    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-2 sm:p-4">
            <div 
                ref={menuRef}
                className="bg-gradient-to-br from-gray-900/95 to-gray-800/95 rounded-2xl border border-white/10 shadow-2xl w-full max-w-[320px] landscape:max-w-[400px] max-h-[85vh] landscape:max-h-[90vh] flex flex-col animate-fade-in"
                onClick={(e) => e.stopPropagation()}
                onTouchStart={(e) => e.stopPropagation()}
            >
                {/* Header - Fixed */}
                <div className="flex items-center justify-between p-4 pb-2 shrink-0">
                    <h2 className="text-base font-bold text-white flex items-center gap-2">
                        <span>⚙️</span>
                        <span>Settings</span>
                    </h2>
                    <button 
                        onClick={onClose}
                        className="text-white/50 hover:text-white active:text-white transition-colors w-10 h-10 flex items-center justify-center text-lg touch-manipulation select-none rounded-full hover:bg-white/10 active:bg-white/20"
                    >
                        ✕
                    </button>
                </div>
                
                {/* Settings List - Scrollable */}
                <div className="flex-1 overflow-y-auto px-4 pb-2 space-y-3 overscroll-contain">
                    {/* Controls Guide */}
                    <div className="bg-black/30 rounded-xl p-3">
                        <h3 className="text-white font-medium text-sm mb-2">Controls</h3>
                        <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-[11px]">
                            <div className="text-white/50">Move</div>
                            <div className="text-white/80">WASD / Joystick</div>
                            <div className="text-white/50">Camera</div>
                            <div className="text-white/80">Mouse / Touch</div>
                            <div className="text-white/50">Jump</div>
                            <div className="text-white/80">Space</div>
                            <div className="text-white/50">Chat</div>
                            <div className="text-white/80">Enter</div>
                            <div className="text-white/50">Emotes</div>
                            <div className="text-white/80">Hold T</div>
                            <div className="text-white/50">Whisper</div>
                            <div className="text-white/80">/w name msg</div>
                            <div className="text-white/50">AFK</div>
                            <div className="text-white/80">/afk message</div>
                            <div className="text-white/50">Unstuck</div>
                            <div className="text-white/80">/spawn</div>
                        </div>
                    </div>
                    
                    {/* Left-Handed Mode */}
                    <div className="bg-black/30 rounded-xl p-3">
                        <div className="flex items-center justify-between">
                            <div className="flex-1 mr-3">
                                <h3 className="text-white font-medium text-sm">Left-Handed Mode</h3>
                                <p className="text-white/50 text-[11px] mt-0.5">
                                    Swap joystick to right side
                                </p>
                            </div>
                            <button
                                onClick={() => handleToggle('leftHanded')}
                                className={`relative w-14 h-8 rounded-full transition-colors duration-200 shrink-0 touch-manipulation select-none ${
                                    settings.leftHanded ? 'bg-green-500' : 'bg-gray-600'
                                }`}
                            >
                                <div 
                                    className={`absolute top-1 w-6 h-6 bg-white rounded-full shadow transition-transform duration-200 ${
                                        settings.leftHanded ? 'translate-x-7' : 'translate-x-1'
                                    }`}
                                />
                            </button>
                        </div>
                        
                        {/* Visual preview */}
                        <div className="mt-2 flex items-center justify-center gap-3 py-2 bg-black/20 rounded-lg">
                            <div className={`flex flex-col items-center transition-opacity ${settings.leftHanded ? 'opacity-40' : 'opacity-100'}`}>
                                <div className="w-7 h-7 rounded-full border-2 border-cyan-400/60 flex items-center justify-center">
                                    <div className="w-3 h-3 rounded-full bg-cyan-400/80" />
                                </div>
                                <span className="text-[9px] text-white/50 mt-1">Move</span>
                            </div>
                            <div className="text-white/20 text-[10px]">⟷</div>
                            <div className={`flex flex-col items-center transition-opacity ${settings.leftHanded ? 'opacity-100' : 'opacity-40'}`}>
                                <div className="w-7 h-7 rounded-full border-2 border-cyan-400/60 flex items-center justify-center">
                                    <div className="w-3 h-3 rounded-full bg-cyan-400/80" />
                                </div>
                                <span className="text-[9px] text-white/50 mt-1">Move</span>
                            </div>
                        </div>
                    </div>
                    
                    {/* Camera Sensitivity */}
                    <div className="bg-black/30 rounded-xl p-3">
                        <div className="flex items-center justify-between mb-2">
                            <h3 className="text-white font-medium text-sm">Camera Sensitivity</h3>
                            <span className="text-yellow-400 text-xs font-mono bg-black/30 px-2 py-0.5 rounded">
                                {(settings.cameraSensitivity || 0.3).toFixed(1)}
                            </span>
                        </div>
                        <input
                            type="range"
                            min="0.1"
                            max="1.0"
                            step="0.1"
                            value={settings.cameraSensitivity || 0.3}
                            onChange={(e) => handleSlider('cameraSensitivity', parseFloat(e.target.value))}
                            className="w-full h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer accent-yellow-400"
                        />
                        <div className="flex justify-between text-[10px] text-white/40 mt-1">
                            <span>Slow</span>
                            <span>Fast</span>
                        </div>
                    </div>
                    
                    {/* Performance Mode Toggle */}
                    <div className="bg-black/30 rounded-xl p-3 border border-yellow-500/20">
                        <div className="flex items-center justify-between">
                            <div className="flex-1 mr-3">
                                <h3 className="text-white font-medium text-sm">⚡ Performance Mode</h3>
                                <p className="text-yellow-400/70 text-[11px] mt-0.5">
                                    Optimize for older hardware (disables shadows, reduces quality)
                                </p>
                            </div>
                            <button
                                onClick={() => {
                                    handleToggle('performanceMode');
                                    // Dispatch event to notify that settings changed (may need page reload for some effects)
                                    window.dispatchEvent(new CustomEvent('performanceModeChanged', { 
                                        detail: { enabled: settings.performanceMode === true } 
                                    }));
                                }}
                                className={`relative w-14 h-8 rounded-full transition-colors duration-200 shrink-0 touch-manipulation select-none ${
                                    settings.performanceMode === true ? 'bg-yellow-500' : 'bg-gray-600'
                                }`}
                            >
                                <div 
                                    className={`absolute top-1 w-6 h-6 bg-white rounded-full shadow transition-transform duration-200 ${
                                        settings.performanceMode === true ? 'translate-x-7' : 'translate-x-1'
                                    }`}
                                />
                            </button>
                        </div>
                        {settings.performanceMode === true && (
                            <p className="text-yellow-300/70 text-[10px] mt-2">
                                ⚠️ Some changes require page reload to take effect
                            </p>
                        )}
                    </div>
                    
                    {/* Particle Effects Toggle */}
                    <div className="bg-black/30 rounded-xl p-3">
                        <div className="flex items-center justify-between">
                            <div className="flex-1 mr-3">
                                <h3 className="text-white font-medium text-sm">✨ Particle Effects</h3>
                                <p className="text-white/50 text-[11px] mt-0.5">
                                    Snow & nametag particles
                                </p>
                            </div>
                            <button
                                onClick={() => handleToggle('snowEnabled')}
                                className={`relative w-14 h-8 rounded-full transition-colors duration-200 shrink-0 touch-manipulation select-none ${
                                    settings.snowEnabled !== false ? 'bg-cyan-500' : 'bg-gray-600'
                                }`}
                            >
                                <div 
                                    className={`absolute top-1 w-6 h-6 bg-white rounded-full shadow transition-transform duration-200 ${
                                        settings.snowEnabled !== false ? 'translate-x-7' : 'translate-x-1'
                                    }`}
                                />
                            </button>
                        </div>
                    </div>
                    
                    {/* Mount Equip Toggle - Equip/Unequip your mount */}
                    <div className="bg-black/30 rounded-xl p-3">
                        <div className="flex items-center justify-between">
                            <div className="flex-1 mr-3">
                                <h3 className="text-white font-medium text-sm">🚣 Mount</h3>
                                <p className="text-white/50 text-[11px] mt-0.5">
                                    Equip or unequip your mount
                                </p>
                            </div>
                            <button
                                onClick={() => {
                                    handleToggle('mountEnabled');
                                    // Dispatch event to notify VoxelWorld of mount toggle
                                    window.dispatchEvent(new CustomEvent('mountToggled', { 
                                        detail: { enabled: settings.mountEnabled === false } 
                                    }));
                                }}
                                className={`relative w-14 h-8 rounded-full transition-colors duration-200 shrink-0 touch-manipulation select-none ${
                                    settings.mountEnabled !== false ? 'bg-orange-500' : 'bg-gray-600'
                                }`}
                            >
                                <div 
                                    className={`absolute top-1 w-6 h-6 bg-white rounded-full shadow transition-transform duration-200 ${
                                        settings.mountEnabled !== false ? 'translate-x-7' : 'translate-x-1'
                                    }`}
                                />
                            </button>
                        </div>
                        <p className="text-[10px] text-orange-400/70 mt-2">
                            {settings.mountEnabled !== false ? '✓ Mount equipped (visible to all)' : '✗ Mount unequipped'}
                        </p>
                    </div>
                    
                    {/* Nametag Style Selection - Only show options for authenticated users */}
                    <div className="bg-black/30 rounded-xl p-3">
                        <h3 className="text-white font-medium text-sm mb-2">🏷️ Nametag Style</h3>
                        <p className="text-white/50 text-[11px] mb-3">
                            {isAuthenticated 
                                ? 'Choose how your name appears to others'
                                : 'Connect wallet to unlock nametag styles'
                            }
                        </p>
                        
                        <div className="space-y-2">
                            {/* Day 1 Supporter - Only for authenticated users */}
                            {isAuthenticated && (
                                <button
                                    onClick={() => {
                                        const newSettings = { ...settings, nametagStyle: 'day1' };
                                        onSettingsChange(newSettings);
                                        window.dispatchEvent(new CustomEvent('nametagChanged', { 
                                            detail: { style: 'day1' } 
                                        }));
                                    }}
                                    className={`w-full p-2.5 rounded-lg border-2 transition-all touch-manipulation select-none text-left ${
                                        (settings.nametagStyle || 'day1') === 'day1'
                                            ? 'border-amber-500 bg-amber-500/10'
                                            : 'border-white/10 bg-black/20 hover:border-white/20'
                                    }`}
                                >
                                    <div className="flex items-center gap-2">
                                        <span className="text-lg">⭐</span>
                                        <div className="flex-1">
                                            <div className="flex items-center gap-2">
                                                <span className="text-amber-400 font-bold text-sm">DAY 1</span>
                                                <span className="text-white/70 text-xs">Supporter</span>
                                            </div>
                                            <p className="text-white/40 text-[10px]">Golden badge with floating animation</p>
                                        </div>
                                        {(settings.nametagStyle || 'day1') === 'day1' && (
                                            <span className="text-amber-400 text-sm">✓</span>
                                        )}
                                    </div>
                                </button>
                            )}
                            
                            {/* Whale Status - Only for authenticated users */}
                            {isAuthenticated && (
                                <button
                                    onClick={() => {
                                        const newSettings = { ...settings, nametagStyle: 'whale' };
                                        onSettingsChange(newSettings);
                                        window.dispatchEvent(new CustomEvent('nametagChanged', { 
                                            detail: { style: 'whale' } 
                                        }));
                                    }}
                                    className={`w-full p-2.5 rounded-lg border-2 transition-all touch-manipulation select-none text-left ${
                                        settings.nametagStyle === 'whale'
                                            ? 'border-cyan-500 bg-cyan-500/10'
                                            : 'border-white/10 bg-black/20 hover:border-white/20'
                                    }`}
                                >
                                    <div className="flex items-center gap-2">
                                        <span className="text-lg">🐳</span>
                                        <div className="flex-1">
                                            <div className="flex items-center gap-2">
                                                <span className="text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 via-purple-400 to-pink-400 font-bold text-sm">WHALE</span>
                                                <span className="text-white/70 text-xs">Status</span>
                                            </div>
                                            <p className="text-white/40 text-[10px]">Premium gradient with cyan/purple glow</p>
                                        </div>
                                        {settings.nametagStyle === 'whale' && (
                                            <span className="text-cyan-400 text-sm">✓</span>
                                        )}
                                    </div>
                                </button>
                            )}
                            
                            {/* Default - Always available */}
                            <button
                                onClick={() => {
                                    const newSettings = { ...settings, nametagStyle: 'default' };
                                    onSettingsChange(newSettings);
                                    window.dispatchEvent(new CustomEvent('nametagChanged', { 
                                        detail: { style: 'default' } 
                                    }));
                                }}
                                className={`w-full p-2.5 rounded-lg border-2 transition-all touch-manipulation select-none text-left ${
                                    settings.nametagStyle === 'default' || !isAuthenticated
                                        ? 'border-white/50 bg-white/10'
                                        : 'border-white/10 bg-black/20 hover:border-white/20'
                                }`}
                            >
                                <div className="flex items-center gap-2">
                                    <span className="text-lg">📛</span>
                                    <div className="flex-1">
                                        <div className="flex items-center gap-2">
                                            <span className="text-white font-bold text-sm">DEFAULT</span>
                                            <span className="text-white/70 text-xs">Classic</span>
                                        </div>
                                        <p className="text-white/40 text-[10px]">Simple clean nametag</p>
                                    </div>
                                    {(settings.nametagStyle === 'default' || !isAuthenticated) && (
                                        <span className="text-white text-sm">✓</span>
                                    )}
                                </div>
                            </button>
                        </div>
                        
                        <p className="text-[10px] text-cyan-400/70 mt-2">
                            {isAuthenticated 
                                ? '✨ Your nametag style is visible to all players'
                                : '🔒 Connect wallet to unlock premium styles'
                            }
                        </p>
                    </div>
                    
                    {/* Master Sound Toggle */}
                    <div className="bg-black/30 rounded-xl p-3">
                        <div className="flex items-center justify-between">
                            <div className="flex-1 mr-3">
                                <h3 className="text-white font-medium text-sm">🔊 Master Sound</h3>
                                <p className="text-white/50 text-[11px] mt-0.5">
                                    Toggle all game audio
                                </p>
                            </div>
                            <button
                                onClick={() => handleToggle('soundEnabled')}
                                className={`relative w-14 h-8 rounded-full transition-colors duration-200 shrink-0 touch-manipulation select-none ${
                                    settings.soundEnabled !== false ? 'bg-green-500' : 'bg-gray-600'
                                }`}
                            >
                                <div 
                                    className={`absolute top-1 w-6 h-6 bg-white rounded-full shadow transition-transform duration-200 ${
                                        settings.soundEnabled !== false ? 'translate-x-7' : 'translate-x-1'
                                    }`}
                                />
                            </button>
                        </div>
                    </div>
                    
                    {/* Music Volume with Mute Toggle */}
                    <div className="bg-black/30 rounded-xl p-3">
                        <div className="flex items-center justify-between mb-2">
                            <div className="flex items-center gap-2">
                                <h3 className="text-white font-medium text-sm">🎵 Music</h3>
                                <button
                                    onClick={() => handleToggle('musicMuted')}
                                    className={`px-3 py-1 text-[11px] font-medium rounded-lg transition-colors touch-manipulation select-none active:scale-95 ${
                                        settings.musicMuted 
                                            ? 'bg-red-500/80 text-white' 
                                            : 'bg-green-500/80 text-white'
                                    }`}
                                >
                                    {settings.musicMuted ? '🔇 MUTED' : '🔊 ON'}
                                </button>
                            </div>
                            <span className="text-purple-400 text-xs font-mono bg-black/30 px-2 py-0.5 rounded">
                                {Math.round((settings.musicVolume ?? 0.3) * 100)}%
                            </span>
                        </div>
                        <input
                            type="range"
                            min="0"
                            max="1"
                            step="0.05"
                            value={settings.musicVolume ?? 0.3}
                            onChange={(e) => handleSlider('musicVolume', parseFloat(e.target.value))}
                            disabled={settings.musicMuted}
                            className={`w-full h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer accent-purple-400 ${
                                settings.musicMuted ? 'opacity-50' : ''
                            }`}
                        />
                        <div className="flex justify-between text-[10px] text-white/40 mt-1">
                            <span>Off</span>
                            <span>Max</span>
                        </div>
                    </div>
                    
                    {/* Changelog & Info Section */}
                    <div className="bg-black/30 rounded-xl p-3">
                        <h3 className="text-white font-medium text-sm mb-2">📋 Info & Updates</h3>
                        <div className="space-y-2">
                            {/* Tutorial Button */}
                            <button
                                onClick={() => {
                                    onClose();
                                    // Dispatch event to open tutorial (handled by GameHUD)
                                    window.dispatchEvent(new CustomEvent('openTutorial'));
                                }}
                                className="w-full p-2.5 rounded-lg border border-purple-500/30 bg-purple-500/10 hover:bg-purple-500/20 transition-all text-left touch-manipulation select-none"
                            >
                                <div className="flex items-center gap-2">
                                    <span className="text-lg">❓</span>
                                    <div className="flex-1">
                                        <div className="text-purple-400 font-bold text-sm">Help & Tutorial</div>
                                        <p className="text-white/40 text-[10px]">Learn how to play waddle.bet</p>
                                    </div>
                                    <span className="text-white/30">→</span>
                                </div>
                            </button>
                            <button
                                onClick={() => {
                                    onClose();
                                    onOpenChangelog?.();
                                }}
                                className="w-full p-2.5 rounded-lg border border-green-500/30 bg-green-500/10 hover:bg-green-500/20 transition-all text-left touch-manipulation select-none"
                            >
                                <div className="flex items-center gap-2">
                                    <span className="text-lg">📋</span>
                                    <div className="flex-1">
                                        <div className="text-green-400 font-bold text-sm">Changelog</div>
                                        <p className="text-white/40 text-[10px]">See what's new in WaddleBet</p>
                                    </div>
                                    <span className="text-white/30">→</span>
                                </div>
                            </button>
                            <a
                                href="https://whitepaper.waddle.bet"
                                target="_blank"
                                rel="noopener noreferrer"
                                className="block w-full p-2.5 rounded-lg border border-cyan-500/30 bg-cyan-500/10 hover:bg-cyan-500/20 transition-all text-left touch-manipulation select-none"
                            >
                                <div className="flex items-center gap-2">
                                    <span className="text-lg">📄</span>
                                    <div className="flex-1">
                                        <div className="text-cyan-400 font-bold text-sm">Whitepaper</div>
                                        <p className="text-white/40 text-[10px]">Read the full documentation</p>
                                    </div>
                                    <span className="text-white/30">↗</span>
                                </div>
                            </a>
                        </div>
                    </div>
                    
                    {/* Spacer for scroll padding */}
                    <div className="h-2" />
                </div>
                
                {/* Close Button - Fixed at bottom */}
                <div className="p-4 pt-2 shrink-0">
                    <button
                        onClick={onClose}
                        className="w-full py-2.5 bg-gradient-to-r from-cyan-500 to-blue-500 hover:from-cyan-400 hover:to-blue-400 active:from-cyan-600 active:to-blue-600 text-white rounded-xl font-medium text-sm transition-all"
                    >
                        Done
                    </button>
                </div>
            </div>
        </div>
    );
};

export default SettingsMenu;

