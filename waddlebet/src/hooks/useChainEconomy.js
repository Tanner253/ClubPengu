/**
 * Post-sign-in chain economy context — single-chain UX after wallet connect.
 */

import { useMemo } from 'react';
import { useMultiplayer } from '../multiplayer';
import { SOLANA_CHAIN_ID } from '../config/evm.js';
import { getPlatformTokenSymbol, isEvmChainId } from '../config/tokens.js';
import { isChainFeatureLive } from '../config/chainFeatures.js';

export function useChainEconomy() {
    const { userData, isAuthenticated } = useMultiplayer();

    const chainId = userData?.chainId || SOLANA_CHAIN_ID;
    const isEvm = isEvmChainId(chainId);
    const isSolana = !isEvm;
    const platformToken = getPlatformTokenSymbol(chainId);

    return useMemo(() => {
        const isFeatureLive = (feature) => isChainFeatureLive(chainId, feature);

        return {
            chainId,
            isEvm,
            isSolana,
            isAuthenticated,
            platformToken,
            isFeatureLive,
            canClaimDailyBonus: isFeatureLive('dailyBonusClaim'),
            canUsePebblesRail: isFeatureLive('pebblesRail'),
            canRentIgloo: isFeatureLive('iglooRent'),
            canPayIglooEntryFee: isFeatureLive('iglooEntryFee'),
            canTokenWager: isFeatureLive('tokenWagers'),
            canSplGift: isFeatureLive('splGifts'),
            canReferralPayout: isFeatureLive('referralPayouts'),
            canReadNametagTiers: isFeatureLive('nametagTiers'),
        };
    }, [chainId, isEvm, isSolana, isAuthenticated, platformToken]);
}
