/**
 * Shown when an on-chain feature is not yet live on the player's chain (e.g. EVM custodial payouts).
 */

import React from 'react';
import { useLanguage } from '../i18n';
import { useChainEconomy } from '../hooks/useChainEconomy.js';

const ChainComingSoonPanel = ({
    title,
    description,
    className = '',
    showTokenNote = true,
}) => {
    const { t } = useLanguage();
    const { platformToken, isEvm } = useChainEconomy();

    const body = description
        || (showTokenNote && isEvm
            ? t('chainEconomy.comingSoonEvmBody').replace(/\{token\}/g, platformToken)
            : t('chainEconomy.comingSoonBody'));

    return (
        <div className={`rounded-2xl border border-amber-500/30 bg-amber-500/10 p-4 sm:p-5 text-center ${className}`}>
            <div className="text-2xl mb-2" aria-hidden="true">🔜</div>
            <p className="text-amber-200 font-bold text-sm sm:text-base">
                {title || t('chainEconomy.comingSoon')}
            </p>
            <p className="text-white/55 text-xs sm:text-sm mt-2 leading-relaxed">{body}</p>
        </div>
    );
};

export default ChainComingSoonPanel;
