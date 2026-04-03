/**
 * SettingsMenu - Modern Game Settings Panel (2026 Edition)
 * Features tabbed navigation, keybind settings, and snowball controls
 */

import React, { useRef, useState, useEffect } from 'react';
import { useClickOutside, useEscapeKey } from '../hooks';
import { useLanguage } from '../i18n';
import { performanceManager, PERFORMANCE_PRESETS } from '../systems';
import ReferralPanel from './ReferralPanel';
import LanguageToggle from './LanguageToggle';

// Default keybinds
const DEFAULT_KEYBINDS = {
    snowballThrow: 'ShiftLeft',
    emoteWheel: 'KeyT',
    chat: 'Enter',
    jump: 'Space'
};

// Friendly key names for display
const KEY_DISPLAY_NAMES = {
    'ShiftLeft': 'Left Shift',
    'ShiftRight': 'Right Shift',
    'ControlLeft': 'Left Ctrl',
    'ControlRight': 'Right Ctrl',
    'AltLeft': 'Left Alt',
    'AltRight': 'Right Alt',
    'Space': 'Space',
    'Enter': 'Enter',
    'KeyT': 'T',
    'KeyE': 'E',
    'KeyQ': 'Q',
    'KeyR': 'R',
    'KeyF': 'F',
    'KeyG': 'G',
    'Tab': 'Tab',
    'CapsLock': 'Caps Lock',
    'Backquote': '`',
};

const getKeyDisplayName = (code) => {
    if (KEY_DISPLAY_NAMES[code]) return KEY_DISPLAY_NAMES[code];
    if (code.startsWith('Key')) return code.slice(3);
    if (code.startsWith('Digit')) return code.slice(5);
    return code;
};

const SettingsMenu = ({ isOpen, onClose, settings, onSettingsChange, onOpenChangelog, isAuthenticated }) => {
    const { t } = useLanguage();
    const menuRef = useRef(null);
    const [activeTab, setActiveTab] = useState('general');
    const [rebindingKey, setRebindingKey] = useState(null); // Which keybind is being rebound
    
    // Use shared hooks for click outside and escape key
    useClickOutside(menuRef, onClose, isOpen && !rebindingKey);
    useEscapeKey(() => {
        if (rebindingKey) {
            setRebindingKey(null);
        } else {
            onClose();
        }
    }, isOpen);
    
    // Listen for key press when rebinding
    useEffect(() => {
        if (!rebindingKey) return;
        
        const handleKeyDown = (e) => {
            e.preventDefault();
            e.stopPropagation();
            
            // Cancel rebinding on Escape
            if (e.code === 'Escape') {
                setRebindingKey(null);
                return;
            }
            
            // Set the new keybind
            const newKeybinds = { ...settings.keybinds, [rebindingKey]: e.code };
            onSettingsChange({ ...settings, keybinds: newKeybinds });
            setRebindingKey(null);
        };
        
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [rebindingKey, settings, onSettingsChange]);
    
    if (!isOpen) return null;
    
    const keybinds = settings.keybinds || DEFAULT_KEYBINDS;
    
    const handleToggle = (key) => {
        const defaultsToTrue = ['soundEnabled', 'snowEnabled', 'mountEnabled'];
        const currentValue = defaultsToTrue.includes(key) 
            ? settings[key] !== false
            : settings[key] === true;
        const newSettings = { ...settings, [key]: !currentValue };
        onSettingsChange(newSettings);
        window.dispatchEvent(new CustomEvent('settingsChanged'));
    };
    
    const handleSlider = (key, value) => {
        const newSettings = { ...settings, [key]: value };
        onSettingsChange(newSettings);
        window.dispatchEvent(new CustomEvent('settingsChanged'));
    };
    
    const tabs = [
        { id: 'general', icon: '⚙️', label: t('settings.tabGeneral') },
        { id: 'controls', icon: '🎮', label: t('settings.controls') },
        { id: 'audio', icon: '🔊', label: t('settings.tabAudio') },
        { id: 'display', icon: '✨', label: t('settings.tabDisplay') },
        { id: 'referral', icon: '🔗', label: t('settings.tabReferral') },
        { id: 'info', icon: '📋', label: t('settings.tabInfo') },
    ];

    const perfPresetHintKey = {
        ultra: 'settings.perfUltra',
        high: 'settings.perfHigh',
        medium: 'settings.perfMedium',
        low: 'settings.perfLow',
        potato: 'settings.perfPotato',
    };
    
    // Toggle component
    const Toggle = ({ enabled, onChange, color = 'cyan' }) => {
        const colorClasses = {
            cyan: enabled ? 'bg-cyan-500' : 'bg-white/10',
            green: enabled ? 'bg-green-500' : 'bg-white/10',
            orange: enabled ? 'bg-orange-500' : 'bg-white/10',
            purple: enabled ? 'bg-purple-500' : 'bg-white/10',
            red: enabled ? 'bg-red-500' : 'bg-white/10',
        };
        
        return (
            <button
                onClick={onChange}
                className={`relative w-12 h-6 rounded-full transition-all duration-300 shrink-0 ${colorClasses[color]} border border-white/10`}
            >
                <div 
                    className={`absolute top-0.5 w-5 h-5 bg-white rounded-full shadow-lg transition-transform duration-300 ${
                        enabled ? 'translate-x-6' : 'translate-x-0.5'
                    }`}
                />
            </button>
        );
    };
    
    // Setting Row component
    const SettingRow = ({ icon, title, description, children, noPadding = false }) => (
        <div className={`flex items-center justify-between gap-3 ${noPadding ? '' : 'py-3'} border-b border-white/5 last:border-b-0`}>
            <div className="flex items-center gap-3 min-w-0">
                {icon && <span className="text-lg shrink-0">{icon}</span>}
                <div className="min-w-0">
                    <div className="text-white text-sm font-medium truncate">{title}</div>
                    {description && <div className="text-white/40 text-xs truncate">{description}</div>}
                </div>
            </div>
            <div className="shrink-0">{children}</div>
        </div>
    );
    
    // Keybind Button component
    const KeybindButton = ({ action, label }) => {
        const currentKey = keybinds[action] || DEFAULT_KEYBINDS[action];
        const isRebinding = rebindingKey === action;
        
        return (
            <button
                onClick={() => setRebindingKey(action)}
                className={`px-4 py-2 rounded-lg font-mono text-sm transition-all min-w-[100px] ${
                    isRebinding
                        ? 'bg-cyan-500 text-white animate-pulse border-2 border-cyan-300'
                        : 'bg-white/10 text-white hover:bg-white/20 border border-white/10'
                }`}
            >
                {isRebinding ? t('settings.pressKey') : getKeyDisplayName(currentKey)}
            </button>
        );
    };
    
    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-md p-2 sm:p-4">
            <div 
                ref={menuRef}
                className="bg-gradient-to-br from-slate-900/98 via-slate-800/98 to-slate-900/98 rounded-3xl border border-white/10 shadow-2xl w-full max-w-[480px] max-h-[90vh] flex flex-col overflow-hidden animate-fade-in"
                style={{
                    boxShadow: '0 0 60px rgba(0, 200, 255, 0.1), 0 0 100px rgba(100, 50, 200, 0.05)'
                }}
                onClick={(e) => e.stopPropagation()}
                onTouchStart={(e) => e.stopPropagation()}
            >
                {/* Header */}
                <div className="relative px-6 pt-5 pb-3 border-b border-white/5">
                    <div className="flex items-center justify-between">
                        <h2 className="text-xl font-bold text-white flex items-center gap-3">
                            <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-cyan-500 to-blue-600 flex items-center justify-center shadow-lg">
                                <span className="text-lg">⚙️</span>
                            </div>
                            <span className="bg-gradient-to-r from-white to-white/80 bg-clip-text text-transparent">
                                {t('settings.title')}
                            </span>
                        </h2>
                        <button 
                            onClick={onClose}
                            className="w-10 h-10 rounded-xl bg-white/5 hover:bg-white/10 flex items-center justify-center text-white/50 hover:text-white transition-all"
                        >
                            ✕
                        </button>
                    </div>
                    
                    {/* Tab Bar */}
                    <div className="flex gap-1 mt-4 p-1 bg-white/5 rounded-2xl">
                        {tabs.map(tab => (
                            <button
                                key={tab.id}
                                onClick={() => setActiveTab(tab.id)}
                                className={`flex-1 py-2.5 px-3 rounded-xl text-xs font-medium transition-all ${
                                    activeTab === tab.id
                                        ? 'bg-gradient-to-r from-cyan-500 to-blue-500 text-white shadow-lg'
                                        : 'text-white/50 hover:text-white hover:bg-white/5'
                                }`}
                            >
                                <span className="block text-base mb-0.5">{tab.icon}</span>
                                <span className="hidden sm:block">{tab.label}</span>
                            </button>
                        ))}
                    </div>
                </div>
                
                {/* Content */}
                <div className="flex-1 overflow-y-auto px-6 py-4 space-y-1 overscroll-contain">
                    
                    {/* General Tab */}
                    {activeTab === 'general' && (
                        <>
                            <div className="py-3 border-b border-white/5">
                                <div className="flex items-center gap-3 mb-3">
                                    <span className="text-lg">🌐</span>
                                    <div>
                                        <div className="text-white text-sm font-medium">{t('settings.languageSection')}</div>
                                        <div className="text-white/40 text-xs">{t('settings.languageHint')}</div>
                                    </div>
                                </div>
                                <LanguageToggle variant="inline" />
                            </div>
                            <SettingRow
                                icon="🖐️"
                                title={t('settings.leftHanded')}
                                description={t('settings.leftHandedDesc')}
                            >
                                <Toggle 
                                    enabled={settings.leftHanded === true} 
                                    onChange={() => handleToggle('leftHanded')}
                                    color="purple"
                                />
                            </SettingRow>
                            
                            <SettingRow
                                icon="🚣"
                                title={t('settings.mount')}
                                description={t('settings.mountDesc')}
                            >
                                <Toggle 
                                    enabled={settings.mountEnabled !== false} 
                                    onChange={() => {
                                        handleToggle('mountEnabled');
                                        window.dispatchEvent(new CustomEvent('mountToggled', { 
                                            detail: { enabled: settings.mountEnabled === false } 
                                        }));
                                    }}
                                    color="orange"
                                />
                            </SettingRow>
                            
                            <SettingRow
                                icon="📈"
                                title={t('settings.greenCandles')}
                                description={t('settings.greenCandlesDesc')}
                            >
                                <Toggle 
                                    enabled={settings.greenCandlesEnabled === true} 
                                    onChange={() => {
                                        handleToggle('greenCandlesEnabled');
                                        window.dispatchEvent(new CustomEvent('greenCandlesToggled', { 
                                            detail: { enabled: !settings.greenCandlesEnabled } 
                                        }));
                                    }}
                                    color="green"
                                />
                            </SettingRow>
                            
                            {/* Nametag Style */}
                            <div className="py-3 border-b border-white/5">
                                <div className="flex items-center gap-3 mb-3">
                                    <span className="text-lg">🏷️</span>
                                    <div>
                                        <div className="text-white text-sm font-medium">{t('settings.nametagStyle')}</div>
                                        <div className="text-white/40 text-xs">
                                            {isAuthenticated ? t('settings.nametagChoose') : t('settings.nametagConnect')}
                                        </div>
                                    </div>
                                </div>
                                <div className="grid grid-cols-3 gap-2">
                                    {isAuthenticated && (
                                        <>
                                            <button
                                                onClick={() => {
                                                    onSettingsChange({ ...settings, nametagStyle: 'day1' });
                                                    window.dispatchEvent(new CustomEvent('nametagChanged', { detail: { style: 'day1' } }));
                                                }}
                                                className={`p-3 rounded-xl border-2 transition-all ${
                                                    (settings.nametagStyle || 'day1') === 'day1'
                                                        ? 'border-amber-500 bg-amber-500/10'
                                                        : 'border-white/10 bg-white/5 hover:border-white/20'
                                                }`}
                                            >
                                                <span className="text-2xl block mb-1">⭐</span>
                                                <span className="text-amber-400 text-xs font-bold">{t('settings.nametagDay1')}</span>
                                            </button>
                                            <button
                                                onClick={() => {
                                                    onSettingsChange({ ...settings, nametagStyle: 'whale' });
                                                    window.dispatchEvent(new CustomEvent('nametagChanged', { detail: { style: 'whale' } }));
                                                }}
                                                className={`p-3 rounded-xl border-2 transition-all ${
                                                    settings.nametagStyle === 'whale'
                                                        ? 'border-cyan-500 bg-cyan-500/10'
                                                        : 'border-white/10 bg-white/5 hover:border-white/20'
                                                }`}
                                            >
                                                <span className="text-2xl block mb-1">🐳</span>
                                                <span className="text-cyan-400 text-xs font-bold">{t('settings.nametagWhale')}</span>
                                            </button>
                                        </>
                                    )}
                                    <button
                                        onClick={() => {
                                            onSettingsChange({ ...settings, nametagStyle: 'default' });
                                            window.dispatchEvent(new CustomEvent('nametagChanged', { detail: { style: 'default' } }));
                                        }}
                                        className={`p-3 rounded-xl border-2 transition-all ${
                                            settings.nametagStyle === 'default' || !isAuthenticated
                                                ? 'border-white/50 bg-white/10'
                                                : 'border-white/10 bg-white/5 hover:border-white/20'
                                        }`}
                                    >
                                        <span className="text-2xl block mb-1">📛</span>
                                        <span className="text-white text-xs font-bold">{t('settings.nametagDefault')}</span>
                                    </button>
                                </div>
                            </div>
                        </>
                    )}
                    
                    {/* Controls Tab */}
                    {activeTab === 'controls' && (
                        <>
                            {/* Quick Reference */}
                            <div className="bg-gradient-to-br from-cyan-500/10 to-blue-500/10 rounded-2xl p-4 border border-cyan-500/20 mb-4">
                                <div className="text-cyan-400 text-sm font-bold mb-3 flex items-center gap-2">
                                    <span>📖</span> {t('settings.quickControls')}
                                </div>
                                <div className="grid grid-cols-2 gap-x-6 gap-y-2 text-xs">
                                    <div className="flex justify-between">
                                        <span className="text-white/50">{t('settings.ctrlMove')}</span>
                                        <span className="text-white/80 font-mono">WASD</span>
                                    </div>
                                    <div className="flex justify-between">
                                        <span className="text-white/50">{t('settings.ctrlCamera')}</span>
                                        <span className="text-white/80 font-mono">Mouse</span>
                                    </div>
                                    <div className="flex justify-between">
                                        <span className="text-white/50">{t('settings.ctrlJump')}</span>
                                        <span className="text-white/80 font-mono">Space</span>
                                    </div>
                                    <div className="flex justify-between">
                                        <span className="text-white/50">{t('settings.ctrlChat')}</span>
                                        <span className="text-white/80 font-mono">Enter</span>
                                    </div>
                                    <div className="flex justify-between">
                                        <span className="text-white/50">{t('settings.ctrlEmotes')}</span>
                                        <span className="text-white/80 font-mono">{t('settings.ctrlEmotesHold')}</span>
                                    </div>
                                    <div className="flex justify-between">
                                        <span className="text-white/50">{t('settings.ctrlWhisper')}</span>
                                        <span className="text-white/80 font-mono">/w name</span>
                                    </div>
                                    <div className="flex justify-between">
                                        <span className="text-white/50">{t('settings.ctrlAfk')}</span>
                                        <span className="text-white/80 font-mono">/afk msg</span>
                                    </div>
                                    <div className="flex justify-between">
                                        <span className="text-white/50">{t('settings.ctrlUnstuck')}</span>
                                        <span className="text-white/80 font-mono">/spawn</span>
                                    </div>
                                </div>
                            </div>
                            
                            {/* Snowball Keybind */}
                            <div className="bg-gradient-to-br from-blue-500/10 to-cyan-500/10 rounded-2xl p-4 border border-blue-500/20 mb-4">
                                <div className="flex items-center justify-between mb-3">
                                    <div className="flex items-center gap-3">
                                        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-white to-blue-200 flex items-center justify-center shadow-lg">
                                            <span className="text-lg">❄️</span>
                                        </div>
                                        <div>
                                            <div className="text-white text-sm font-bold">{t('settings.snowballTitle')}</div>
                                            <div className="text-white/40 text-xs">{t('settings.snowballHold')}</div>
                                        </div>
                                    </div>
                                    <KeybindButton action="snowballThrow" label={t('settings.snowballTitle')} />
                                </div>
                                <div className="text-white/30 text-xs pl-[52px]">
                                    • {t('settings.snowballCd1')}<br/>
                                    • {t('settings.snowballCd2')}
                                </div>
                            </div>
                            
                            {/* Camera Sensitivity */}
                            <div className="py-3">
                                <div className="flex items-center justify-between mb-3">
                                    <div className="flex items-center gap-3">
                                        <span className="text-lg">📷</span>
                                        <div>
                                            <div className="text-white text-sm font-medium">{t('settings.cameraSens')}</div>
                                            <div className="text-white/40 text-xs">{t('settings.cameraSensDesc')}</div>
                                        </div>
                                    </div>
                                    <span className="text-cyan-400 text-sm font-mono bg-cyan-500/10 px-3 py-1 rounded-lg">
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
                                    className="w-full h-2 bg-white/10 rounded-lg appearance-none cursor-pointer accent-cyan-500"
                                />
                                <div className="flex justify-between text-[10px] text-white/30 mt-1 px-1">
                                    <span>{t('settings.slow')}</span>
                                    <span>{t('settings.fast')}</span>
                                </div>
                            </div>
                        </>
                    )}
                    
                    {/* Audio Tab */}
                    {activeTab === 'audio' && (
                        <>
                            <SettingRow
                                icon="🔊"
                                title="Master Sound"
                                description="Toggle all game audio"
                            >
                                <Toggle 
                                    enabled={settings.soundEnabled !== false} 
                                    onChange={() => handleToggle('soundEnabled')}
                                    color="green"
                                />
                            </SettingRow>
                            
                            {/* Music Volume */}
                            <div className="py-3 border-b border-white/5">
                                <div className="flex items-center justify-between mb-3">
                                    <div className="flex items-center gap-3">
                                        <span className="text-lg">🎵</span>
                                        <div>
                                            <div className="text-white text-sm font-medium">{t('settings.musicVol')}</div>
                                            <div className="text-white/40 text-xs">{t('settings.musicVolDesc')}</div>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <button
                                            onClick={() => handleToggle('musicMuted')}
                                            className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-all ${
                                                settings.musicMuted 
                                                    ? 'bg-red-500/20 text-red-400 border border-red-500/30' 
                                                    : 'bg-green-500/20 text-green-400 border border-green-500/30'
                                            }`}
                                        >
                                            {settings.musicMuted ? '🔇' : '🔊'}
                                        </button>
                                        <span className="text-purple-400 text-sm font-mono bg-purple-500/10 px-3 py-1 rounded-lg min-w-[50px] text-center">
                                            {Math.round((settings.musicVolume ?? 0.3) * 100)}%
                                        </span>
                                    </div>
                                </div>
                                <input
                                    type="range"
                                    min="0"
                                    max="1"
                                    step="0.05"
                                    value={settings.musicVolume ?? 0.3}
                                    onChange={(e) => handleSlider('musicVolume', parseFloat(e.target.value))}
                                    disabled={settings.musicMuted}
                                    className={`w-full h-2 bg-white/10 rounded-lg appearance-none cursor-pointer accent-purple-500 ${
                                        settings.musicMuted ? 'opacity-40' : ''
                                    }`}
                                />
                            </div>
                        </>
                    )}
                    
                    {/* Display Tab */}
                    {activeTab === 'display' && (
                        <>
                            {/* Performance Preset - Only show on PC */}
                            {!window._isMobileGPU && (
                                <div className="py-3 border-b border-white/5">
                                    <div className="flex items-center gap-3 mb-3">
                                        <span className="text-lg">🎮</span>
                                        <div>
                                            <div className="text-white text-sm font-medium">{t('settings.perfMode')}</div>
                                            <div className="text-white/40 text-xs">{t('settings.perfModeDesc')}</div>
                                        </div>
                                    </div>
                                    <div className="grid grid-cols-5 gap-1">
                                        {Object.entries(PERFORMANCE_PRESETS).map(([key, preset]) => {
                                            const isActive = performanceManager.getPreset() === key;
                                            const colors = {
                                                ultra: 'from-purple-500 to-pink-500',
                                                high: 'from-blue-500 to-cyan-500',
                                                medium: 'from-green-500 to-emerald-500',
                                                low: 'from-yellow-500 to-orange-500',
                                                potato: 'from-red-500 to-orange-500',
                                            };
                                            return (
                                                <button
                                                    key={key}
                                                    onClick={() => {
                                                        performanceManager.setPreset(key);
                                                        // Force re-render
                                                        onSettingsChange({ ...settings, _perfUpdate: Date.now() });
                                                        // Show toast notification
                                                        alert(t('settings.perfAlert').replace('{name}', preset.name));
                                                    }}
                                                    className={`px-2 py-2 rounded-lg text-xs font-bold transition-all ${
                                                        isActive 
                                                            ? `bg-gradient-to-r ${colors[key]} text-white shadow-lg scale-105` 
                                                            : 'bg-white/5 text-white/60 hover:bg-white/10 hover:text-white'
                                                    }`}
                                                >
                                                    {preset.name}
                                                </button>
                                            );
                                        })}
                                    </div>
                                    <div className="mt-2 text-white/30 text-[10px] text-center">
                                        {t(perfPresetHintKey[performanceManager.getPreset()] || 'settings.perfMedium')}
                                    </div>
                                </div>
                            )}
                            
                            <SettingRow
                                icon="❄️"
                                title={t('settings.particles')}
                                description={t('settings.particlesDesc')}
                            >
                                <Toggle 
                                    enabled={settings.snowEnabled !== false} 
                                    onChange={() => handleToggle('snowEnabled')}
                                    color="cyan"
                                />
                            </SettingRow>
                        </>
                    )}
                    
                    {/* Referral Tab */}
                    {activeTab === 'referral' && (
                        <ReferralPanel isAuthenticated={isAuthenticated} />
                    )}
                    
                    {/* Info Tab */}
                    {activeTab === 'info' && (
                        <div className="space-y-3">
                            <button
                                onClick={() => {
                                    onClose();
                                    window.dispatchEvent(new CustomEvent('openTutorial'));
                                }}
                                className="w-full p-4 rounded-2xl bg-gradient-to-r from-purple-500/10 to-pink-500/10 border border-purple-500/20 hover:border-purple-500/40 transition-all text-left group"
                            >
                                <div className="flex items-center gap-4">
                                    <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform">
                                        <span className="text-xl">❓</span>
                                    </div>
                                    <div className="flex-1">
                                        <div className="text-white font-bold">{t('settings.helpTutorial')}</div>
                                        <p className="text-white/40 text-xs">{t('settings.helpTutorialDesc')}</p>
                                    </div>
                                    <span className="text-white/30 group-hover:text-white/60 transition-colors">→</span>
                                </div>
                            </button>
                            
                            <button
                                onClick={() => {
                                    onClose();
                                    onOpenChangelog?.();
                                }}
                                className="w-full p-4 rounded-2xl bg-gradient-to-r from-green-500/10 to-emerald-500/10 border border-green-500/20 hover:border-green-500/40 transition-all text-left group"
                            >
                                <div className="flex items-center gap-4">
                                    <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-green-500 to-emerald-500 flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform">
                                        <span className="text-xl">📋</span>
                                    </div>
                                    <div className="flex-1">
                                        <div className="text-white font-bold">{t('settings.changelogBtn')}</div>
                                        <p className="text-white/40 text-xs">{t('settings.changelogDesc')}</p>
                                    </div>
                                    <span className="text-white/30 group-hover:text-white/60 transition-colors">→</span>
                                </div>
                            </button>
                            
                            <a
                                href="https://whitepaper.waddle.bet"
                                target="_blank"
                                rel="noopener noreferrer"
                                className="w-full p-4 rounded-2xl bg-gradient-to-r from-cyan-500/10 to-blue-500/10 border border-cyan-500/20 hover:border-cyan-500/40 transition-all text-left group block"
                            >
                                <div className="flex items-center gap-4">
                                    <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-cyan-500 to-blue-500 flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform">
                                        <span className="text-xl">📄</span>
                                    </div>
                                    <div className="flex-1">
                                        <div className="text-white font-bold">{t('settings.whitepaperBtn')}</div>
                                        <p className="text-white/40 text-xs">{t('settings.whitepaperDesc')}</p>
                                    </div>
                                    <span className="text-white/30 group-hover:text-white/60 transition-colors">↗</span>
                                </div>
                            </a>
                            
                            {/* Version Info */}
                            <div className="text-center text-white/20 text-xs pt-4">
                                {t('settings.versionFooter')}
                            </div>
                        </div>
                    )}
                </div>
                
                {/* Footer */}
                <div className="p-4 border-t border-white/5">
                    <button
                        onClick={onClose}
                        className="w-full py-3 bg-gradient-to-r from-cyan-500 to-blue-500 hover:from-cyan-400 hover:to-blue-400 text-white rounded-2xl font-bold text-sm transition-all shadow-lg hover:shadow-cyan-500/25"
                    >
                        {t('settings.done')}
                    </button>
                </div>
            </div>
        </div>
    );
};

export default SettingsMenu;
