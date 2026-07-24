/** Chain-specific economy copy — post sign-in single-chain UX */
const L = ['en', 'zh', 'es', 'pt', 'ko', 'ja', 'fr', 'de', 'ru', 'ar'];
const row = (en, zh, es, pt, ko, ja, fr, de, ru, ar) => {
    const v = [en, zh, es, pt, ko, ja, fr, de, ru, ar];
    const o = {};
    L.forEach((code, i) => { o[code] = v[i]; });
    return o;
};

export default {
    'chainEconomy.comingSoon': row(
        'Coming soon',
        '即将推出',
        'Próximamente',
        'Em breve',
        '곧 출시',
        '近日公開',
        'Bientôt',
        'Demnächst',
        'Скоро',
        'قريباً'
    ),
    'chainEconomy.comingSoonBody': row(
        'This on-chain feature is not available on your network yet.',
        '此链上功能在您的网络上尚未开放。',
        'Esta función on-chain aún no está disponible en tu red.',
        'Este recurso on-chain ainda não está disponível na sua rede.',
        '온체인 기능이 아직 이 네트워크에서 제공되지 않습니다.',
        'このオンチェーン機能はまだご利用いただけません。',
        'Cette fonction on-chain n\'est pas encore disponible sur votre réseau.',
        'Diese On-Chain-Funktion ist in Ihrem Netzwerk noch nicht verfügbar.',
        'Эта on-chain функция пока недоступна в вашей сети.',
        'ميزة السلسلة هذه غير متاحة على شبكتك بعد.'
    ),
    'chainEconomy.comingSoonEvmBody': row(
        '{token} redemption and custodial payouts on Robinhood Chain ship in a later phase. Gold grind, cosmetics, and social play work today.',
        '{token} 兑换与 Robinhood Chain 托管发放将在后续阶段上线。金币刷取、装扮与社交玩法现已可用。',
        'Canje de {token} y pagos custodiales en Robinhood Chain llegarán en una fase posterior.',
        'Resgate de {token} e pagamentos custodiais na Robinhood Chain chegam em fase posterior.',
        'Robinhood Chain {token} 상환·커스터디 지급은 이후 단계에서 제공됩니다. 골드·코스메틱·소셜 플레이는 지금 가능합니다.',
        'Robinhood Chainの{token}換金・カストディ配布は今後のフェーズで提供。ゴールド・コスメ・ソーシャルは利用可。',
        'Échange {token} et paiements custodiaux sur Robinhood Chain arrivent plus tard.',
        '{token}-Einlösung und Custodial-Auszahlungen auf Robinhood Chain folgen in einer späteren Phase.',
        'Вывод {token} и кастодиальные выплаты на Robinhood Chain — в следующей фазе.',
        'استرداد {token} والمدفوعات الاحتجازية على Robinhood Chain لاحقاً.'
    ),
    'chainEconomy.dailyBonusTitle': row(
        'Daily {token} bonus — coming soon',
        '每日 {token} 奖励 — 即将推出',
        'Bono diario {token} — próximamente',
        'Bônus diário {token} — em breve',
        '일일 {token} 보너스 — 곧 출시',
        'デイリー{token}ボーナス — 近日',
        'Bonus quotidien {token} — bientôt',
        'Täglicher {token}-Bonus — demnächst',
        'Ежедневный бонус {token} — скоро',
        'مكافأة {token} اليومية — قريباً'
    ),
    'chainEconomy.pebblesTitle': row(
        'Pebbles (ETH) — coming soon',
        '卵石（ETH）— 即将推出',
        'Pebbles (ETH) — próximamente',
        'Pebbles (ETH) — em breve',
        '페블(ETH) — 곧 출시',
        'ペブル（ETH）— 近日',
        'Pebbles (ETH) — bientôt',
        'Pebbles (ETH) — demnächst',
        'Pebbles (ETH) — скоро',
        'Pebbles (ETH) — قريباً'
    ),
    'chainEconomy.iglooTitle': row(
        'Igloo {token} payments — coming soon',
        '冰屋 {token} 支付 — 即将推出',
        'Pagos de iglú en {token} — próximamente',
        'Pagamentos de iglu em {token} — em breve',
        '이글루 {token} 결제 — 곧 출시',
        'イグルー{token}支払い — 近日',
        'Paiements igloo {token} — bientôt',
        'Igloo-{token}-Zahlungen — demnächst',
        'Платежи за иглу в {token} — скоро',
        'مدفوعات الإيغلو {token} — قريباً'
    ),
    'chainEconomy.wagerTitle': row(
        'Token wagers — coming soon',
        '代币赌注 — 即将推出',
        'Apuestas con token — próximamente',
        'Apostas com token — em breve',
        '토큰 베팅 — 곧 출시',
        'トークン賭け — 近日',
        'Paris token — bientôt',
        'Token-Wetten — demnächst',
        'Ставки токеном — скоро',
        'مراهنات الرمز — قريباً'
    ),
    'chainEconomy.wagerHint': row(
        'Gold wagers (in-game coins) still work. SPL/ERC-20 token wagers arrive with the {token} rail.',
        '金币赌注仍可用。SPL/ERC-20 代币赌注随 {token} 通道上线。',
        'Las apuestas en oro siguen activas. Las apuestas con token llegan con el rail {token}.',
        'Apostas em ouro continuam. Apostas com token chegam com o rail {token}.',
        '골드 베팅은 가능. 토큰 베팅은 {token} 레일과 함께 제공.',
        'ゴールド賭けは利用可。トークン賭けは{token}レールと同時。',
        'Paris en or actifs. Paris token avec le rail {token}.',
        'Gold-Wetten funktionieren. Token-Wetten mit {token}-Rail.',
        'Ставки золотом работают. Токен-ставки с rail {token}.',
        'مراهنات الذهب تعمل. مراهنات الرمز مع سكة {token}.'
    ),
    'chainEconomy.giftSplDisabled': row(
        'SPL token gifts — Solana only (for now)',
        'SPL 代币礼物 — 仅 Solana（暂时）',
        'Regalos SPL — solo Solana (por ahora)',
        'Presentes SPL — só Solana (por agora)',
        'SPL 선물 — Solana 전용(현재)',
        'SPLギフト — Solanaのみ（現時点）',
        'Cadeaux SPL — Solana uniquement (pour l\'instant)',
        'SPL-Geschenke — nur Solana (vorerst)',
        'SPL-подарки — только Solana (пока)',
        'هدايا SPL — Solana فقط (حالياً)'
    ),
};
