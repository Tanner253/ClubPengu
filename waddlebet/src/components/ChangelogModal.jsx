/**
 * ChangelogModal - In-game development changelog
 * Accessible via Settings menu
 * 1:1 content parity with whitepaper changelog (separate files, updated in parallel)
 */

import React, { useRef, useState } from 'react';
import { useClickOutside, useEscapeKey } from '../hooks';
import CHANGELOG from '../data/changelogData.js';

// Change types with styling (matching whitepaper)
const CHANGE_TYPES = {
    feature: { label: 'New', bg: 'bg-green-500/20', text: 'text-green-400', border: 'border-green-500/30' },
    fix: { label: 'Fix', bg: 'bg-red-500/20', text: 'text-red-400', border: 'border-red-500/30' },
    improvement: { label: 'Improved', bg: 'bg-blue-500/20', text: 'text-blue-400', border: 'border-blue-500/30' },
    content: { label: 'Content', bg: 'bg-purple-500/20', text: 'text-purple-400', border: 'border-purple-500/30' },
    mobile: { label: 'Mobile', bg: 'bg-orange-500/20', text: 'text-orange-400', border: 'border-orange-500/30' },
    backend: { label: 'Backend', bg: 'bg-cyan-500/20', text: 'text-cyan-400', border: 'border-cyan-500/30' },
    refactor: { label: 'Refactor', bg: 'bg-yellow-500/20', text: 'text-yellow-400', border: 'border-yellow-500/30' },
    security: { label: 'Security', bg: 'bg-pink-500/20', text: 'text-pink-400', border: 'border-pink-500/30' },
    performance: { label: 'Perf', bg: 'bg-emerald-500/20', text: 'text-emerald-400', border: 'border-emerald-500/30' },
};

// Changelog entries: src/data/changelogData.js (shared with whitepaper)

// ==================== COMPONENTS ====================

const ChangeTag = ({ type }) => {
    const style = CHANGE_TYPES[type] || CHANGE_TYPES.feature;
    return (
        <span className={`inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium ${style.bg} ${style.text} border ${style.border}`}>
            {style.label}
        </span>
    );
};

const StatsBar = ({ stats }) => (
    <div className="flex flex-wrap items-center gap-2 text-[10px] font-mono mt-1">
        {stats.filesChanged && (
            <span className="text-slate-400">
                <span className="text-blue-400">{stats.filesChanged}</span> files
            </span>
        )}
        {stats.additions > 0 && (
            <span className="text-green-400">+{stats.additions.toLocaleString()}</span>
        )}
        {stats.deletions > 0 && (
            <span className="text-red-400">-{stats.deletions.toLocaleString()}</span>
        )}
    </div>
);

const VersionCard = ({ version, isExpanded, onToggle }) => {
    const borderClass = version.brand === 'robinhood'
        ? 'border-violet-500/35 ring-1 ring-violet-500/25'
        : version.highlight
            ? 'border-cyan-500/30'
            : 'border-white/5';

    return (
    <div className={`bg-black/30 rounded-xl overflow-hidden border ${borderClass}`}>
        <button
            onClick={onToggle}
            className="w-full p-3 flex items-start gap-3 text-left hover:bg-white/5 transition-colors"
        >
            <span className="text-white/50 text-sm mt-0.5">
                {isExpanded ? '▼' : '▶'}
            </span>
            <div className="flex-1 min-w-0">
                <div className="flex flex-wrap items-center gap-2 mb-1">
                    <span className={`font-mono text-xs font-bold ${version.brand === 'robinhood' ? 'text-violet-400' : 'text-cyan-400'}`}>v{version.version}</span>
                    <span className="text-white/30">•</span>
                    <span className="text-white/40 text-xs">{version.date}</span>
                    {version.brand === 'robinhood' && (
                        <span className="px-1.5 py-0.5 rounded bg-violet-500/20 border border-violet-500/30 text-violet-300 text-[10px] font-medium">
                            $WADDLE
                        </span>
                    )}
                    {version.highlight && (
                        <span className="px-1.5 py-0.5 rounded bg-yellow-500/20 border border-yellow-500/30 text-yellow-400 text-[10px] font-medium">
                            ⭐ Major
                        </span>
                    )}
                </div>
                <h4 className="text-white font-bold text-sm">{version.title}</h4>
                {version.description && (
                    <p className="text-white/50 text-xs mt-1">{version.description}</p>
                )}
                {version.stats && <StatsBar stats={version.stats} />}
                
                {/* Summary tags when collapsed */}
                {!isExpanded && (
                    <div className="flex flex-wrap gap-1 mt-2">
                        {Array.from(new Set(version.changes.map(c => c.type))).slice(0, 5).map((type) => (
                            <ChangeTag key={type} type={type} />
                        ))}
                        {version.changes.length > 5 && (
                            <span className="text-white/40 text-[10px] px-1">
                                +{version.changes.length - 5} more
                            </span>
                        )}
                    </div>
                )}
            </div>
            <span className="shrink-0 w-6 h-6 rounded-full bg-white/5 flex items-center justify-center text-white/40 text-xs">
                {version.changes.length}
            </span>
        </button>
        
        {isExpanded && (
            <div className="px-3 pb-3 border-t border-white/5">
                <ul className="mt-3 space-y-1.5">
                    {version.changes.map((change, i) => (
                        <li key={i} className="flex items-start gap-2">
                            <div className="shrink-0 mt-0.5">
                                <ChangeTag type={change.type} />
                            </div>
                            <span className="text-white/70 text-xs leading-relaxed">{change.text}</span>
                        </li>
                    ))}
                </ul>
            </div>
        )}
    </div>
);
};

// ==================== MAIN COMPONENT ====================

const ChangelogModal = ({ isOpen, onClose }) => {
    const modalRef = useRef(null);
    const [expanded, setExpanded] = useState(new Set([CHANGELOG[0]?.version]));
    const [expandAll, setExpandAll] = useState(false);
    
    useClickOutside(modalRef, onClose, isOpen);
    useEscapeKey(onClose, isOpen);
    
    if (!isOpen) return null;
    
    const toggleVersion = (v) => {
        setExpanded(prev => {
            const next = new Set(prev);
            next.has(v) ? next.delete(v) : next.add(v);
            return next;
        });
    };
    
    const handleExpandAll = () => {
        if (expandAll) {
            setExpanded(new Set([CHANGELOG[0]?.version]));
        } else {
            setExpanded(new Set(CHANGELOG.map(v => v.version)));
        }
        setExpandAll(!expandAll);
    };
    
    // Calculate totals (matching whitepaper)
    const totalChanges = CHANGELOG.reduce((acc, v) => acc + v.changes.length, 0);
    const totalVersions = CHANGELOG.length;
    const totalAdditions = CHANGELOG.reduce((acc, v) => acc + (v.stats?.additions || 0), 0);
    const totalFiles = CHANGELOG.reduce((acc, v) => acc + (v.stats?.filesChanged || 0), 0);
    
    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-2 sm:p-4">
            <div 
                ref={modalRef}
                className="relative bg-gradient-to-br from-[#0a0a1a] via-[#111128] to-[#0d1a2d] rounded-2xl border border-green-500/30 shadow-2xl shadow-green-500/10 w-full max-w-lg max-h-[90vh] flex flex-col animate-fade-in overflow-hidden"
                onClick={(e) => e.stopPropagation()}
                onTouchStart={(e) => e.stopPropagation()}
            >
                {/* Header */}
                <div className="relative flex items-center justify-between p-4 pb-2 shrink-0 border-b border-white/5">
                    <div className="flex items-center gap-3">
                        <div className="text-2xl">📋</div>
                        <div>
                            <h2 className="text-lg font-black text-transparent bg-clip-text bg-gradient-to-r from-green-400 via-cyan-400 to-blue-400">
                                CHANGELOG
                            </h2>
                            <p className="text-white/50 text-xs">Development Log</p>
                        </div>
                    </div>
                    <button 
                        onClick={onClose}
                        className="text-white/50 hover:text-white transition-colors w-10 h-10 flex items-center justify-center text-xl rounded-full hover:bg-white/10"
                    >
                        ✕
                    </button>
                </div>
                
                {/* Stats Bar */}
                <div className="px-4 py-3 bg-black/30 border-b border-white/5">
                    <div className="grid grid-cols-4 gap-2">
                        <div className="text-center">
                            <div className="text-lg font-bold text-cyan-400">{totalVersions}</div>
                            <div className="text-[9px] text-white/40 uppercase">Releases</div>
                        </div>
                        <div className="text-center border-l border-white/10">
                            <div className="text-lg font-bold text-green-400">{totalChanges}</div>
                            <div className="text-[9px] text-white/40 uppercase">Changes</div>
                        </div>
                        <div className="text-center border-l border-white/10">
                            <div className="text-lg font-bold text-purple-400">{totalFiles.toLocaleString()}</div>
                            <div className="text-[9px] text-white/40 uppercase">Files</div>
                        </div>
                        <div className="text-center border-l border-white/10">
                            <div className="text-lg font-bold text-yellow-400">{Math.round(totalAdditions / 1000)}k+</div>
                            <div className="text-[9px] text-white/40 uppercase">Lines</div>
                        </div>
                    </div>
                    
                    {/* Legend */}
                    <div className="flex flex-wrap justify-center gap-1 mt-3">
                        {Object.keys(CHANGE_TYPES).map((type) => (
                            <ChangeTag key={type} type={type} />
                        ))}
                    </div>
                    
                    {/* Expand/Collapse All */}
                    <button
                        onClick={handleExpandAll}
                        className="w-full mt-3 px-3 py-1.5 rounded-lg bg-white/5 border border-white/10 hover:bg-white/10 transition-colors text-white/60 text-xs"
                    >
                        {expandAll ? 'Collapse All' : 'Expand All'}
                    </button>
                </div>
                
                {/* Scrollable Content */}
                <div className="flex-1 overflow-y-auto px-4 py-4 space-y-3 overscroll-contain">
                    {/* Version List */}
                    {CHANGELOG.map((version) => (
                        <VersionCard
                            key={version.version}
                            version={version}
                            isExpanded={expanded.has(version.version)}
                            onToggle={() => toggleVersion(version.version)}
                        />
                    ))}
                    
                    {/* Refactoring Highlights */}
                    <div className="bg-gradient-to-r from-yellow-500/10 to-orange-500/10 rounded-xl p-3 border border-yellow-500/20">
                        <h4 className="text-yellow-400 font-bold text-xs mb-2 flex items-center gap-1">
                            ⚡ Refactoring Highlights
                        </h4>
                        <div className="grid grid-cols-3 gap-2 text-center">
                            <div className="bg-black/30 rounded-lg p-2">
                                <div className="text-[10px] text-white/40 mb-1">VoxelWorld</div>
                                <div className="text-xs font-mono">
                                    <span className="text-red-400">9.5k</span>
                                    <span className="text-white/30">→</span>
                                    <span className="text-green-400">4.2k</span>
                                </div>
                                <div className="text-[9px] text-green-400">-56%</div>
                            </div>
                            <div className="bg-black/30 rounded-lg p-2">
                                <div className="text-[10px] text-white/40 mb-1">PropsFactory</div>
                                <div className="text-xs font-mono">
                                    <span className="text-red-400">4.4k</span>
                                    <span className="text-white/30">→</span>
                                    <span className="text-green-400">1.3k</span>
                                </div>
                                <div className="text-[9px] text-green-400">-71%</div>
                            </div>
                            <div className="bg-black/30 rounded-lg p-2">
                                <div className="text-[10px] text-white/40 mb-1">Systems</div>
                                <div className="text-cyan-400 text-sm font-bold">20+</div>
                                <div className="text-[9px] text-cyan-400">Modular</div>
                            </div>
                        </div>
                    </div>
                    
                    <div className="h-2" />
                </div>
                
                {/* Footer */}
                <div className="relative p-4 shrink-0 border-t border-white/5 bg-black/30">
                    <p className="text-center text-white/40 text-[10px] mb-2">
                        Open source and always cooking 🐧🔥
                    </p>
                    <div className="flex gap-2">
                        <a
                            href="https://github.com/Tanner253/ClubPengu"
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex-1 py-2.5 bg-white/5 hover:bg-white/10 border border-white/10 text-white rounded-xl font-medium text-sm transition-all text-center flex items-center justify-center gap-2"
                        >
                            <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
                                <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z"/>
                            </svg>
                            GitHub
                        </a>
                        <button
                            onClick={onClose}
                            className="flex-1 py-2.5 bg-gradient-to-r from-green-500 to-cyan-500 hover:from-green-400 hover:to-cyan-400 text-white rounded-xl font-bold text-sm transition-all"
                        >
                            Close
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default ChangelogModal;
