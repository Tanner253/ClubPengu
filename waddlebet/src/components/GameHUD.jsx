import React, { useState, useEffect, useRef } from 'react';
import GameManager from '../engine/GameManager';
import InboxButton from './InboxButton';
import WalletButton from './WalletButton';
import StatsModal from './StatsModal';
import PebblesPurchaseModal from './PebblesPurchaseModal';
import InventoryModal from './InventoryModal';
import GameInventoryModal from './GameInventoryModal';
import GameHotbar from './GameHotbar';
import MarketplaceModal from './MarketplaceModal';
import TutorialModal, { shouldShowTutorial } from './TutorialModal';
import OnboardingQuestHUD from './OnboardingQuestHUD';
import DailyBonusModal from './DailyBonusModal';
import DropGoldModal from './DropGoldModal';
import ServerPopulationPopup from './ServerPopulationPopup';
import { useMultiplayer } from '../multiplayer';
import { useLanguage } from '../i18n';

/**
 * GameHUD - Heads Up Display showing coins, stats, and quick actions
 * Responsive: horizontal on landscape/desktop, vertical sidebar on portrait mobile
 */
const GameHUD = ({ showMinimap = false, onOpenPuffles, showInbox = true, onOpenSettings, isMobile = false, playerCount = 0, totalPlayerCount = 0, onRequestAuth, currentRoom, isInsideOwnedIgloo = false, onOpenIglooSettings }) => {
    const [coins, setCoins] = useState(0);
    const [showStatsModal, setShowStatsModal] = useState(false);  // Full stats modal
    const [recentReward, setRecentReward] = useState(null);
    const [showPebblesPurchase, setShowPebblesPurchase] = useState(false);
    const [showInventory, setShowInventory] = useState(false);
    const [showGameInventory, setShowGameInventory] = useState(false);
    const [showMarketplace, setShowMarketplace] = useState(false);
    const [showTutorial, setShowTutorial] = useState(false);
    const [forceTutorial, setForceTutorial] = useState(false); // Force show even if dismissed
    const [showDailyBonus, setShowDailyBonus] = useState(false);
    const [mobileServerPopOpen, setMobileServerPopOpen] = useState(false);
    const [showDropGold, setShowDropGold] = useState(false);
    const [droppingGold, setDroppingGold] = useState(false);
    const serverPopWrapRef = useRef(null);
    
    // Get pebbles from multiplayer context
    const { userData, isAuthenticated, serverPopulation, totalPlayerCount: liveTotalCount, requestServerPopulation, dropWorldGold } = useMultiplayer();
    const { t } = useLanguage();
    const pebbles = userData?.pebbles || 0;
    
    // Track if we've already shown tutorial this session to avoid re-triggering
    const tutorialShownRef = useRef(false);
    
    // Show tutorial when user authenticates (if not dismissed)
    useEffect(() => {
        if (isAuthenticated && !tutorialShownRef.current && shouldShowTutorial()) {
            // Small delay to let the game load first
            const timer = setTimeout(() => {
                setShowTutorial(true);
                tutorialShownRef.current = true;
            }, 1500);
            return () => clearTimeout(timer);
        }
    }, [isAuthenticated]);
    
    // Listen for openTutorial event from settings
    useEffect(() => {
        const handleOpenTutorial = () => {
            setForceTutorial(true); // Force show even if previously dismissed
            setShowTutorial(true);
        };
        window.addEventListener('openTutorial', handleOpenTutorial);
        return () => window.removeEventListener('openTutorial', handleOpenTutorial);
    }, []);
    
    // Detect narrow/portrait mode for responsive layout
    // Now triggers on PC when window is narrow (<768px) OR mobile portrait
    const [isNarrow, setIsNarrow] = useState(() => 
        typeof window !== 'undefined' && (
            // Mobile portrait
            (window.innerWidth < window.innerHeight && window.innerWidth < 600) ||
            // PC narrow window
            window.innerWidth < 768
        )
    );
    
    // Also track if it's ultra narrow (vertical sidebar mode)
    const [isUltraNarrow, setIsUltraNarrow] = useState(() =>
        typeof window !== 'undefined' && window.innerWidth < 500
    );
    
    useEffect(() => {
        const checkLayout = () => {
            const isPortraitMobile = window.innerWidth < window.innerHeight && window.innerWidth < 600;
            const isNarrowWindow = window.innerWidth < 768;
            setIsNarrow(isPortraitMobile || isNarrowWindow);
            setIsUltraNarrow(window.innerWidth < 500);
        };
        window.addEventListener('resize', checkLayout);
        window.addEventListener('orientationchange', () => setTimeout(checkLayout, 100));
        return () => {
            window.removeEventListener('resize', checkLayout);
            window.removeEventListener('orientationchange', checkLayout);
        };
    }, []);
    
    // Legacy alias for existing code
    const isPortrait = isUltraNarrow;
    
    useEffect(() => {
        const gm = GameManager.getInstance();
        setCoins(gm.getCoins());
        
        // Listen for coin changes
        const unsubscribe = gm.on('coinsChanged', (data) => {
            setCoins(data.coins);
            
            // Show reward animation
            if (data.delta > 0) {
                setRecentReward({ amount: data.delta, reason: data.reason });
                setTimeout(() => setRecentReward(null), 2000);
            }
        });
        
        return () => unsubscribe();
    }, []);
    
    // Compact button style for portrait mode
    const compactBtn = "w-8 h-8 rounded-lg flex items-center justify-center text-sm transition-all active:scale-90";

    const refreshServerPopulation = () => {
        requestServerPopulation();
    };

    // Mobile only: close population panel when tapping outside
    useEffect(() => {
        if (!isMobile || !mobileServerPopOpen) return undefined;

        const handlePointerDown = (event) => {
            if (serverPopWrapRef.current?.contains(event.target)) return;
            setMobileServerPopOpen(false);
        };

        document.addEventListener('pointerdown', handlePointerDown);
        return () => document.removeEventListener('pointerdown', handlePointerDown);
    }, [isMobile, mobileServerPopOpen]);

    const onlineTotal = liveTotalCount || totalPlayerCount || playerCount + 1;

    const handleDropGold = async (amount) => {
        setDroppingGold(true);
        const result = await dropWorldGold?.(amount);
        setDroppingGold(false);
        if (!result?.error) {
            setShowDropGold(false);
        }
    };

    const coinChipClass = 'bg-black/70 backdrop-blur-md rounded-lg px-1.5 py-1 flex items-center gap-1 border border-yellow-400/30';
    const coinChipButtonClass = `${coinChipClass} hover:border-yellow-300/60 hover:bg-yellow-950/30 active:bg-yellow-950/40 transition-colors touch-manipulation cursor-pointer`;

    const playerCountButton = (compact = false) => (
        <div
            ref={serverPopWrapRef}
            className="relative group"
            onMouseEnter={!isMobile ? refreshServerPopulation : undefined}
        >
            <button
                type="button"
                onMouseDown={!isMobile ? (e) => e.preventDefault() : undefined}
                onClick={isMobile ? () => {
                    refreshServerPopulation();
                    setMobileServerPopOpen((open) => !open);
                } : undefined}
                className={`bg-black/70 backdrop-blur-md rounded-md flex items-center gap-1 border transition-colors touch-manipulation border-cyan-400/30 hover:border-cyan-400/50 active:bg-black/80 ${
                    isMobile && mobileServerPopOpen ? 'border-cyan-400/70 bg-cyan-950/40' : ''
                } ${!isMobile ? 'group-hover:border-cyan-400/70 group-hover:bg-cyan-950/40' : ''} ${compact ? 'px-1.5 py-1' : 'px-2 py-1 gap-1.5'}`}
                title={t('hud.serverPopulationHint')}
                aria-haspopup="true"
                aria-expanded={isMobile ? mobileServerPopOpen : undefined}
            >
                <span className={compact ? 'text-[10px]' : 'text-sm'}>👥</span>
                <span className={`text-cyan-300 font-bold retro-text ${compact ? 'text-[10px]' : 'text-xs'}`}>
                    {playerCount + 1}
                </span>
                <span className={`text-white/40 ${compact ? 'text-[8px]' : 'text-[10px]'}`}>/</span>
                <span className={`text-green-400 font-bold retro-text ${compact ? 'text-[10px]' : 'text-xs'}`}>
                    {onlineTotal}
                </span>
            </button>
            <div
                className={`absolute top-full right-0 z-50 pt-1 ${
                    isMobile
                        ? mobileServerPopOpen ? 'block' : 'hidden'
                        : 'hidden group-hover:block'
                } ${compact ? '' : ''}`}
            >
                <ServerPopulationPopup
                    population={serverPopulation}
                    totalPlayerCount={onlineTotal}
                    currentRoom={currentRoom}
                    compact={compact}
                />
            </div>
        </div>
    );
    
    // Portrait mode: vertical sidebar on right
    if (isPortrait) {
        return (
            <>
                {/* Portrait: Top bar with essential info */}
                <div className="absolute top-1 right-1 left-1 z-20 flex items-center justify-end gap-1">
                    {/* Wallet Button */}
                    <WalletButton onRequestAuth={onRequestAuth} compact={true} />
                    
                    {/* Player Count */}
                    {playerCountButton(true)}
                    
                    {/* Coins */}
                    {isAuthenticated ? (
                        <button
                            type="button"
                            onClick={() => setShowDropGold(true)}
                            className={coinChipButtonClass}
                            title="Drop gold in the world"
                        >
                            <span className="text-[10px]">💰</span>
                            <span className="text-yellow-300 font-bold retro-text text-[10px]">{coins}</span>
                        </button>
                    ) : (
                        <div className={coinChipClass}>
                            <span className="text-[10px]">💰</span>
                            <span className="text-yellow-300 font-bold retro-text text-[10px]">{coins}</span>
                        </div>
                    )}
                    
                    {/* Pebbles - Premium Currency (Always visible + button) */}
                    {isAuthenticated && (
                        <button 
                            onClick={() => setShowPebblesPurchase(true)}
                            className="bg-black/70 backdrop-blur-md rounded-lg px-1.5 py-1 flex items-center gap-1 border border-purple-400/50 active:border-purple-400 active:bg-purple-900/30 transition-colors touch-manipulation"
                        >
                            <span className="text-[10px]">🪨</span>
                            <span className="text-purple-300 font-bold retro-text text-[10px]">{pebbles}</span>
                            <span className="text-green-400 font-bold text-xs bg-green-500/30 rounded px-1 ml-0.5">+</span>
                        </button>
                    )}
                    
                    {/* Backpack (gameplay items) */}
                    {isAuthenticated && (
                        <button
                            onClick={() => setShowGameInventory(true)}
                            className="bg-black/70 backdrop-blur-md rounded-lg px-1.5 py-1 flex items-center gap-1 border border-teal-400/50 active:border-teal-400 active:bg-teal-900/30 transition-colors touch-manipulation"
                            title="Backpack"
                        >
                            <span className="text-[10px]">🎒</span>
                        </button>
                    )}

                    {/* Inventory Button (Mobile) */}
                    {isAuthenticated && (
                        <button 
                            onClick={() => setShowInventory(true)}
                            className="bg-black/70 backdrop-blur-md rounded-lg px-1.5 py-1 flex items-center gap-1 border border-amber-400/50 active:border-amber-400 active:bg-amber-900/30 transition-colors touch-manipulation"
                        >
                            <span className="text-[10px]">📦</span>
                        </button>
                    )}
                    
                    {/* Marketplace Button (Mobile) */}
                    {isAuthenticated && (
                        <button 
                            onClick={() => setShowMarketplace(true)}
                            className="bg-black/70 backdrop-blur-md rounded-lg px-1.5 py-1 flex items-center gap-1 border border-cyan-400/50 active:border-cyan-400 active:bg-cyan-900/30 transition-colors touch-manipulation"
                        >
                            <span className="text-[10px]">🏪</span>
                        </button>
                    )}
                </div>
                
                {/* Portrait: Vertical sidebar on right */}
                <div className="absolute top-12 right-1 z-20 flex flex-col gap-1 bg-black/50 backdrop-blur-sm rounded-lg p-1">
                    {/* Daily Bonus */}
                    {isAuthenticated && (
                        <button
                            onClick={() => setShowDailyBonus(true)}
                            className={`${compactBtn} bg-gradient-to-r from-amber-600/80 to-orange-600/80 relative`}
                            title={t('hud.dailyBonusShort')}
                        >
                            🎁
                            <span className="absolute -top-0.5 -right-0.5 w-1.5 h-1.5 bg-amber-400 rounded-full animate-pulse" />
                        </button>
                    )}
                    
                    {/* Inbox */}
                    {showInbox && <InboxButton compact={true} />}
                    
                    {/* Settings */}
                    {onOpenSettings && (
                        <button
                            onClick={onOpenSettings}
                            className={`${compactBtn} bg-gray-700/80`}
                            title={t('hud.settings')}
                        >
                            ⚙️
                        </button>
                    )}
                    
                    {/* Igloo Settings - Only show when inside owned igloo */}
                    {isInsideOwnedIgloo && onOpenIglooSettings && (
                        <button
                            onClick={onOpenIglooSettings}
                            className={`${compactBtn} bg-gradient-to-r from-purple-600/80 to-pink-600/80`}
                            title={t('hud.iglooSettings')}
                        >
                            🏠
                        </button>
                    )}
                    
                    {/* Puffles */}
                    <button
                        onClick={onOpenPuffles}
                        className={`${compactBtn} bg-purple-600/80`}
                        title={t('hud.puffles')}
                    >
                        🐾
                    </button>
                    
                    {/* Stats */}
                    <button 
                        onClick={() => setShowStatsModal(true)}
                        className={`${compactBtn} bg-black/50`}
                        title={t('hud.fullStats')}
                    >
                        📊
                    </button>
                </div>
                
                {/* Coin Reward Animation */}
                {recentReward && (
                    <div className="absolute top-14 right-12 z-30 animate-bounce">
                        <div className="bg-green-500/90 text-white px-2 py-0.5 rounded-lg retro-text text-[10px]">
                            +{recentReward.amount} 💰
                        </div>
                    </div>
                )}
                
                {/* Full Stats Modal */}
                <StatsModal
                    isOpen={showStatsModal}
                    onClose={() => setShowStatsModal(false)}
                />
                
                {/* Pebbles Purchase Modal */}
                <PebblesPurchaseModal
                    isOpen={showPebblesPurchase}
                    onClose={() => setShowPebblesPurchase(false)}
                />
                
                {/* Inventory Modal (Portrait) */}
                <InventoryModal
                    isOpen={showInventory}
                    onClose={() => setShowInventory(false)}
                />

                <GameInventoryModal
                    isOpen={showGameInventory}
                    onClose={() => setShowGameInventory(false)}
                />
                
                {/* Marketplace Modal (Portrait) */}
                <MarketplaceModal
                    isOpen={showMarketplace}
                    onClose={() => setShowMarketplace(false)}
                />
                
                {/* Tutorial Modal (Portrait) */}
                <TutorialModal
                    isOpen={showTutorial}
                    onClose={() => {
                        setShowTutorial(false);
                        setForceTutorial(false);
                    }}
                    forceShow={forceTutorial}
                />
                
                {/* Daily Bonus Modal (Portrait) */}
                <DailyBonusModal
                    isOpen={showDailyBonus}
                    onClose={() => setShowDailyBonus(false)}
                />

                <DropGoldModal
                    isOpen={showDropGold}
                    onClose={() => setShowDropGold(false)}
                    maxCoins={coins}
                    onConfirm={handleDropGold}
                    dropping={droppingGold}
                />

                <OnboardingQuestHUD isMobile={isMobile} isPortrait={isPortrait} />

                {isAuthenticated && (
                    <div className="fixed bottom-4 left-1/2 -translate-x-1/2 z-30 pointer-events-none">
                        <GameHotbar />
                    </div>
                )}
            </>
        );
    }
    
    // Landscape/Desktop: Horizontal or wrapped layout based on width
    const navChip = 'bg-black/70 backdrop-blur-md rounded-md px-2 py-1 flex items-center gap-1.5 border';
    const navIconBtn = 'rounded-md w-7 h-7 flex items-center justify-center text-xs transition-colors backdrop-blur-sm';
    const navLabel = 'font-bold retro-text text-xs hidden sm:inline';

    return (
        <>
            {/* HUD Bar - Top Right - Responsive wrap on narrow windows */}
            <div className={`absolute top-3 right-3 z-20 flex items-center gap-1 sm:gap-1.5 ${
                isNarrow && !isPortrait ? 'flex-wrap justify-end max-w-xs' : ''
            }`}>
                {/* Daily Bonus Button */}
                {isAuthenticated && (
                    <button
                        onClick={() => setShowDailyBonus(true)}
                        className="relative bg-gradient-to-r from-amber-600/80 to-orange-600/80 hover:from-amber-500 hover:to-orange-500 active:from-amber-700 active:to-orange-700 backdrop-blur-sm text-white w-7 h-7 sm:w-auto sm:h-auto sm:px-2 sm:py-1 rounded-md retro-text text-xs transition-colors flex items-center justify-center hover:scale-105 active:scale-95"
                        title={t('hud.dailyBonus')}
                    >
                        🎁
                        <span className="absolute -top-0.5 -right-0.5 w-1.5 h-1.5 bg-amber-400 rounded-full animate-pulse" />
                    </button>
                )}
                
                {/* Settings Button */}
                {onOpenSettings && (
                    <button
                        onClick={onOpenSettings}
                        className={`${navIconBtn} bg-gray-700/80 hover:bg-gray-600 active:bg-gray-500 text-white retro-text`}
                        title={t('hud.settings')}
                    >
                        ⚙️
                    </button>
                )}
                
                {/* Igloo Settings Button - Only show when inside owned igloo */}
                {isInsideOwnedIgloo && onOpenIglooSettings && (
                    <button
                        onClick={onOpenIglooSettings}
                        className={`${navIconBtn} sm:w-auto sm:px-2 sm:py-1 bg-gradient-to-r from-purple-600/80 to-pink-600/80 hover:from-purple-500 hover:to-pink-500 active:from-purple-700 active:to-pink-700 text-white retro-text gap-1`}
                        title={t('hud.iglooSettings')}
                    >
                        🏠
                        <span className="hidden sm:inline text-[10px]">{t('hud.iglooLabel')}</span>
                    </button>
                )}
                
                {/* Inbox Button */}
                {showInbox && <InboxButton compact />}
                
                {/* Puffles Button */}
                <button
                    onClick={onOpenPuffles}
                    className={`${navIconBtn} bg-purple-600/80 hover:bg-purple-500 active:bg-purple-400 text-white retro-text`}
                    title={t('hud.managePuffles')}
                >
                    🐾
                </button>
                
                {/* Wallet Connection Button */}
                <WalletButton onRequestAuth={onRequestAuth} size="sm" />
                
                {/* Stats Button */}
                <button 
                    onClick={() => setShowStatsModal(true)}
                    className={`${navIconBtn} bg-black/50 hover:bg-black/70`}
                    title={t('hud.fullStats')}
                >
                    📊
                </button>
                
                {/* Player Count - Room / Total */}
                {playerCountButton(false)}
                
                {/* Coins Display */}
                {isAuthenticated ? (
                    <button
                        type="button"
                        onClick={() => setShowDropGold(true)}
                        className={`${navChip} border-yellow-400/30 hover:border-yellow-300/60 hover:bg-yellow-950/20 transition-all`}
                        title="Drop gold in the world"
                    >
                        <span className="text-sm">💰</span>
                        <span className="text-yellow-300 font-bold retro-text text-xs tabular-nums">{coins}</span>
                    </button>
                ) : (
                    <div className={`${navChip} border-yellow-400/30`}>
                        <span className="text-sm">💰</span>
                        <span className="text-yellow-300 font-bold retro-text text-xs tabular-nums">{coins}</span>
                    </div>
                )}
                
                {/* Pebbles Display - Premium Currency */}
                {isAuthenticated && (
                    <button 
                        onClick={() => setShowPebblesPurchase(true)}
                        className={`${navChip} border-purple-400/30 hover:border-purple-400/60 hover:bg-black/80 transition-all group`}
                        title={t('hud.buyPebbles')}
                    >
                        <span className="text-sm">🪨</span>
                        <span className="text-purple-300 font-bold retro-text text-xs tabular-nums">{pebbles}</span>
                        <span className="text-green-400 font-bold text-sm ml-0.5 opacity-60 group-hover:opacity-100 transition-opacity">+</span>
                    </button>
                )}
                
                {/* Backpack (gameplay items: fish, resources, gear) */}
                {isAuthenticated && (
                    <button
                        onClick={() => setShowGameInventory(true)}
                        className={`${navChip} border-teal-400/30 hover:border-teal-400/60 hover:bg-black/80 transition-all`}
                        title="Backpack — items you gather in the world"
                    >
                        <span className="text-sm">🎒</span>
                        <span className={`${navLabel} text-teal-300`}>Backpack</span>
                    </button>
                )}

                {/* Inventory Button */}
                {isAuthenticated && (
                    <button 
                        onClick={() => setShowInventory(true)}
                        className={`${navChip} border-amber-400/30 hover:border-amber-400/60 hover:bg-black/80 transition-all`}
                        title={t('hud.openInventory')}
                    >
                        <span className="text-sm">📦</span>
                        <span className={`${navLabel} text-amber-300`}>{t('hud.inventory')}</span>
                    </button>
                )}
                
                {/* Marketplace Button */}
                {isAuthenticated && (
                    <button 
                        onClick={() => setShowMarketplace(true)}
                        className={`${navChip} border-cyan-400/30 hover:border-cyan-400/60 hover:bg-black/80 transition-all`}
                        title={t('hud.openMarketplace')}
                    >
                        <span className="text-sm">🏪</span>
                        <span className={`${navLabel} text-cyan-300`}>{t('hud.market')}</span>
                    </button>
                )}
            </div>
            
            {/* Coin Reward Animation */}
            {recentReward && (
                <div className="absolute top-12 right-3 z-30 animate-bounce">
                    <div className="bg-green-500/90 text-white px-2 py-0.5 rounded-md retro-text text-[10px]">
                        +{recentReward.amount} 💰
                    </div>
                </div>
            )}

            {isAuthenticated && (
                <div className="fixed bottom-4 left-1/2 -translate-x-1/2 z-30 pointer-events-none">
                    <GameHotbar />
                </div>
            )}
            
            {/* Full Stats Modal */}
            <StatsModal
                isOpen={showStatsModal}
                onClose={() => setShowStatsModal(false)}
            />
            
            {/* Pebbles Purchase Modal */}
            <PebblesPurchaseModal
                isOpen={showPebblesPurchase}
                onClose={() => setShowPebblesPurchase(false)}
            />
            
            {/* Inventory Modal */}
            <InventoryModal
                isOpen={showInventory}
                onClose={() => setShowInventory(false)}
            />

            <GameInventoryModal
                isOpen={showGameInventory}
                onClose={() => setShowGameInventory(false)}
            />
            
            {/* Marketplace Modal */}
            <MarketplaceModal
                isOpen={showMarketplace}
                onClose={() => setShowMarketplace(false)}
            />
            
            {/* Tutorial Modal - shows on first login */}
            <TutorialModal
                isOpen={showTutorial}
                onClose={() => {
                    setShowTutorial(false);
                    setForceTutorial(false);
                }}
                forceShow={forceTutorial}
            />
            
            {/* Daily Bonus Modal */}
            <DailyBonusModal
                isOpen={showDailyBonus}
                onClose={() => setShowDailyBonus(false)}
            />

            <DropGoldModal
                isOpen={showDropGold}
                onClose={() => setShowDropGold(false)}
                maxCoins={coins}
                onConfirm={handleDropGold}
                dropping={droppingGold}
            />

            <OnboardingQuestHUD isMobile={isMobile} isPortrait={isPortrait} />
        </>
    );
};

export default GameHUD;
