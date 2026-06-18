import React, { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import GameManager from '../engine/GameManager';
import HudTopBar from './HudTopBar';
import StatsModal from './StatsModal';
import PebblesPurchaseModal from './PebblesPurchaseModal';
import InventoryModal from './InventoryModal';
import GameInventoryModal from './GameInventoryModal';
import GameHotbar from './GameHotbar';
import MarketplaceModal from './MarketplaceModal';
import TutorialModal, { shouldShowTutorial } from './TutorialModal';
import OnboardingQuestHUD from './OnboardingQuestHUD';
import DailyQuestHUD from './DailyQuestHUD';
import DailyBonusModal from './DailyBonusModal';
import DropGoldModal from './DropGoldModal';
import { playSfx } from '../audio';
import ServerPopulationPopup from './ServerPopulationPopup';
import { useMultiplayer } from '../multiplayer';
import { useLanguage } from '../i18n';
import { useDeviceDetection } from '../hooks';
import { getRoomLabel } from '../utils/roomLabels';

/**
 * GameHUD - Heads Up Display: zoned top bar on all form factors.
 * Mobile portrait uses compact layout; desktop / mobile landscape use standard bar.
 */
const GameHUD = ({
    showMinimap = false,
    showInbox = true,
    onOpenSettings,
    isMobile = false,
    playerCount = 0,
    totalPlayerCount = 0,
    onRequestAuth,
    currentRoom,
    isInsideOwnedIgloo = false,
    onOpenIglooSettings,
}) => {
    const [coins, setCoins] = useState(0);
    const [showStatsModal, setShowStatsModal] = useState(false);
    const [recentReward, setRecentReward] = useState(null);
    const [showPebblesPurchase, setShowPebblesPurchase] = useState(false);
    const [showInventory, setShowInventory] = useState(false);
    const [showGameInventory, setShowGameInventory] = useState(false);
    const [showMarketplace, setShowMarketplace] = useState(false);
    const [showTutorial, setShowTutorial] = useState(false);
    const [forceTutorial, setForceTutorial] = useState(false);
    const [showDailyBonus, setShowDailyBonus] = useState(false);
    const [mobileServerPopOpen, setMobileServerPopOpen] = useState(false);
    const [showDropGold, setShowDropGold] = useState(false);
    const [droppingGold, setDroppingGold] = useState(false);
    const [dropGoldError, setDropGoldError] = useState(null);
    const tutorialShownRef = useRef(false);

    const { isLandscape } = useDeviceDetection();
    const { userData, isAuthenticated, serverPopulation, totalPlayerCount: liveTotalCount, requestServerPopulation, dropWorldGold } = useMultiplayer();
    const { t } = useLanguage();
    const pebbles = userData?.pebbles || 0;

    const compactHud = isMobile && !isLandscape;
    const isPortrait = compactHud;

    useEffect(() => {
        if (isAuthenticated && !tutorialShownRef.current && shouldShowTutorial()) {
            const timer = setTimeout(() => {
                setShowTutorial(true);
                tutorialShownRef.current = true;
            }, 1500);
            return () => clearTimeout(timer);
        }
    }, [isAuthenticated]);

    useEffect(() => {
        const handleOpenTutorial = () => {
            setForceTutorial(true);
            setShowTutorial(true);
        };
        window.addEventListener('openTutorial', handleOpenTutorial);
        return () => window.removeEventListener('openTutorial', handleOpenTutorial);
    }, []);

    useEffect(() => {
        const handleToggleBackpack = () => {
            if (!isAuthenticated) return;
            setShowGameInventory((prev) => !prev);
        };
        window.addEventListener('toggleGameInventory', handleToggleBackpack);
        return () => window.removeEventListener('toggleGameInventory', handleToggleBackpack);
    }, [isAuthenticated]);

    useEffect(() => {
        const gm = GameManager.getInstance();
        setCoins(gm.getCoins());

        const unsubscribe = gm.on('coinsChanged', (data) => {
            setCoins(data.coins);
            if (data.delta > 0) {
                setRecentReward({ amount: data.delta, reason: data.reason });
                setTimeout(() => setRecentReward(null), 2000);
            }
        });

        return () => unsubscribe();
    }, []);

    const refreshServerPopulation = () => {
        requestServerPopulation();
    };

    const onlineTotal = liveTotalCount || totalPlayerCount || playerCount + 1;

    const handleDropGold = async (amount) => {
        setDroppingGold(true);
        setDropGoldError(null);
        const result = await dropWorldGold?.(amount);
        setDroppingGold(false);
        if (result?.error) {
            setDropGoldError(result.message || 'Could not drop gold');
            return;
        }
        playSfx('drop_gold');
        setShowDropGold(false);
    };

    const mobileServerPopOverlay = isMobile && mobileServerPopOpen ? createPortal(
        <div
            className="fixed inset-0 z-[10050] flex items-start justify-center bg-black/50 backdrop-blur-[2px] p-3 pt-14 pointer-events-auto"
            onClick={() => setMobileServerPopOpen(false)}
            data-player-modal="true"
        >
            <div className="w-full max-w-xs" onClick={(e) => e.stopPropagation()}>
                <ServerPopulationPopup
                    population={serverPopulation}
                    totalPlayerCount={onlineTotal}
                    currentRoom={currentRoom}
                    compact
                />
            </div>
        </div>,
        document.body,
    ) : null;

    const roomLocationLabel = currentRoom ? (
        <p className="text-xs font-bold retro-text text-yellow-400 truncate drop-shadow-[0_1px_2px_rgba(0,0,0,0.9)] pointer-events-none max-w-[38vw]">
            {getRoomLabel(currentRoom, t, { emoji: true })}
        </p>
    ) : null;

    return (
        <>
            {mobileServerPopOverlay}

            {compactHud && roomLocationLabel && (
                <div className="absolute top-2 left-2 z-20 pointer-events-none max-w-[40%]">
                    {roomLocationLabel}
                </div>
            )}

            <HudTopBar
                coins={coins}
                pebbles={pebbles}
                isAuthenticated={isAuthenticated}
                playerCount={playerCount}
                onlineTotal={onlineTotal}
                serverPopulation={serverPopulation}
                currentRoom={currentRoom}
                onDropGold={() => setShowDropGold(true)}
                onPebblesPurchase={() => setShowPebblesPurchase(true)}
                onBackpack={() => setShowGameInventory(true)}
                onInventory={() => setShowInventory(true)}
                onMarket={() => setShowMarketplace(true)}
                onOpenSettings={onOpenSettings}
                onOpenStats={() => setShowStatsModal(true)}
                onOpenDailyBonus={() => setShowDailyBonus(true)}
                onOpenIglooSettings={onOpenIglooSettings}
                isInsideOwnedIgloo={isInsideOwnedIgloo}
                showInbox={showInbox}
                onRequestAuth={onRequestAuth}
                onRefreshPopulation={refreshServerPopulation}
                isMobile={isMobile}
                compact={compactHud}
                mobileServerPopOpen={mobileServerPopOpen}
                onToggleMobileServerPop={() => {
                    refreshServerPopulation();
                    setMobileServerPopOpen((open) => !open);
                }}
                t={t}
            />

            {recentReward && (
                <div className={`absolute z-30 animate-bounce ${compactHud ? 'top-12 right-3' : 'top-12 right-3'}`}>
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

            <StatsModal isOpen={showStatsModal} onClose={() => setShowStatsModal(false)} />
            <PebblesPurchaseModal isOpen={showPebblesPurchase} onClose={() => setShowPebblesPurchase(false)} />
            <InventoryModal isOpen={showInventory} onClose={() => setShowInventory(false)} />
            <GameInventoryModal isOpen={showGameInventory} onClose={() => setShowGameInventory(false)} />
            <MarketplaceModal isOpen={showMarketplace} onClose={() => setShowMarketplace(false)} />
            <TutorialModal
                isOpen={showTutorial}
                onClose={() => {
                    setShowTutorial(false);
                    setForceTutorial(false);
                }}
                forceShow={forceTutorial}
            />
            <DailyBonusModal isOpen={showDailyBonus} onClose={() => setShowDailyBonus(false)} />
            <DropGoldModal
                isOpen={showDropGold}
                onClose={() => {
                    setShowDropGold(false);
                    setDropGoldError(null);
                }}
                maxCoins={coins}
                onConfirm={handleDropGold}
                dropping={droppingGold}
                error={dropGoldError}
            />

            <OnboardingQuestHUD isMobile={isMobile} isPortrait={isPortrait} />
            <DailyQuestHUD isMobile={isMobile} isPortrait={isPortrait} />
        </>
    );
};

export default GameHUD;
