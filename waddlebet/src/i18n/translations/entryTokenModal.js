/** Penguin Maker entry — $CP token CTA modal */
const L = ['en', 'zh', 'es', 'pt', 'ko', 'ja', 'fr', 'de', 'ru', 'ar'];
const row = (en, zh, es, pt, ko, ja, fr, de, ru, ar) => {
    const v = [en, zh, es, pt, ko, ja, fr, de, ru, ar];
    const o = {};
    L.forEach((code, i) => { o[code] = v[i]; });
    return o;
};

export default {
    'entryToken.badge': row('Platform Token', '平台代币', 'Token de plataforma', 'Token da plataforma', '플랫폼 토큰', 'プラットフォームトークン', 'Jeton plateforme', 'Plattform-Token', 'Токен платформы', 'رمز المنصة'),
    'entryToken.title': row('Buy $CP on Solana', '在 Solana 购买 $CP', 'Compra $CP en Solana', 'Compre $CP na Solana', 'Solana에서 $CP 구매', 'Solanaで$CPを購入', 'Acheter $CP sur Solana', '$CP auf Solana kaufen', 'Купить $CP на Solana', 'اشترِ $CP على Solana'),
    'entryToken.subtitle': row(
        'The WaddleBet platform token powers the economy — igloos, wagers, and in-world trade.',
        'WaddleBet 平台代币驱动经济——冰屋、赌注与游戏内交易。',
        'El token impulsa la economía — iglús, apuestas y comercio.',
        'O token move a economia — iglus, apostas e comércio.',
        '플랫폼 토큰으로 이글루·베팅·거래가 돌아갑니다.',
        'プラットフォームトークンで経済を支えます。',
        'Le jeton alimente l\'économie — igloos, paris, échanges.',
        'Der Token treibt Igloos, Wetten und Handel an.',
        'Токен для аренды, ставок и торговли.',
        'الرمز يشغّل الاقتصاد — إيجار ومراهنات وتداول.'
    ),
    'entryToken.solanaHead': row('Solana', 'Solana', 'Solana', 'Solana', 'Solana', 'Solana', 'Solana', 'Solana', 'Solana', 'Solana'),
    'entryToken.liveNow': row('Live', '已上线', 'En vivo', 'Ao vivo', '라이브', '稼働中', 'En ligne', 'Live', 'В сети', 'مباشر'),
    'entryToken.solanaBody': row(
        'Swap SOL for $CP on Jupiter or paste the contract address (CA) into your wallet or DEX.',
        '在 Jupiter 用 SOL 换 $CP，或将合约地址 (CA) 粘贴到钱包或 DEX。',
        'Intercambia SOL por $CP en Jupiter o pega la CA en tu wallet o DEX.',
        'Troque SOL por $CP na Jupiter ou cole o CA na carteira ou DEX.',
        'Jupiter에서 SOL→$CP 또는 CA를 지갑/DEX에 붙여넣기.',
        'JupiterでSOL→$CP、またはCAをウォレット/DEXに貼り付け。',
        'Échangez SOL contre $CP sur Jupiter ou collez le CA.',
        'Tausche SOL gegen $CP auf Jupiter oder füge die CA ein.',
        'Меняй SOL на $CP в Jupiter или вставь CA.',
        'بدّل SOL مقابل $CP على Jupiter أو الصق CA.'
    ),
    'entryToken.caLabel': row('Contract address (CA)', '合约地址 (CA)', 'Dirección del contrato (CA)', 'Endereço do contrato (CA)', '컨트랙트 주소 (CA)', 'コントラクトアドレス (CA)', 'Adresse du contrat (CA)', 'Vertragsadresse (CA)', 'Адрес контракта (CA)', 'عنوان العقد (CA)'),
    'entryToken.copyCa': row('Copy', '复制', 'Copiar', 'Copiar', '복사', 'コピー', 'Copier', 'Kopieren', 'Копировать', 'نسخ'),
    'entryToken.copied': row('Copied!', '已复制', '¡Copiado!', 'Copiado!', '복사됨', 'コピー済', 'Copié !', 'Kopiert!', 'Скопировано!', 'تم النسخ'),
    'entryToken.buyJupiter': row('Buy on Jupiter →', '在 Jupiter 购买 →', 'Comprar en Jupiter →', 'Comprar na Jupiter →', 'Jupiter에서 구매 →', 'Jupiterで購入 →', 'Acheter sur Jupiter →', 'Auf Jupiter kaufen →', 'Купить на Jupiter →', 'اشترِ على Jupiter →'),
    'entryToken.viewChart': row('View chart', '查看图表', 'Ver gráfico', 'Ver gráfico', '차트 보기', 'チャート', 'Voir le graphique', 'Chart ansehen', 'График', 'الرسم البياني'),
    'entryToken.robinhoodHead': row('Robinhood Chain', 'Robinhood 链', 'Robinhood Chain', 'Robinhood Chain', 'Robinhood Chain', 'Robinhood Chain', 'Robinhood Chain', 'Robinhood Chain', 'Robinhood Chain', 'Robinhood Chain'),
    'entryToken.comingSoon': row('Coming soon', '即将推出', 'Próximamente', 'Em breve', '곧 출시', '近日公開', 'Bientôt', 'Demnächst', 'Скоро', 'قريباً'),
    'entryToken.robinhoodBody': row(
        'WaddleBet is expanding to Robinhood Chain (EVM). Same social metaverse — multichain wagers and economy on the way.',
        'WaddleBet 将扩展至 Robinhood Chain (EVM)。同一社交元宇宙——多链赌注与经济即将到来。',
        'WaddleBet se expande a Robinhood Chain (EVM). Mismo metaverso — economía multichain en camino.',
        'WaddleBet expande para Robinhood Chain (EVM). Mesmo metaverso — economia multichain a caminho.',
        'Robinhood Chain(EVM)로 확장 예정. 같은 메타버스 — 멀티체인 경제.',
        'Robinhood Chain（EVM）へ拡張予定。同じメタバース——マルチチェーンへ。',
        'Extension vers Robinhood Chain (EVM). Même metavers — multichaîne en route.',
        'Erweiterung auf Robinhood Chain (EVM). Gleiches Metaversum — Multichain.',
        'Расширение на Robinhood Chain (EVM). Тот же метавселенная.',
        'التوسع إلى Robinhood Chain (EVM). نفس العالم الاجتماعي.'
    ),
    'entryToken.dontShowAgain': row("Don't show again", '不再显示', 'No mostrar de nuevo', 'Não mostrar novamente', '다시 표시 안 함', '再表示しない', 'Ne plus afficher', 'Nicht mehr anzeigen', 'Больше не показывать', 'لا تظهر مرة أخرى'),
    'entryToken.continue': row('Waddle on!', 'Waddle on!', '¡Waddle on!', 'Waddle on!', 'Waddle on!', 'Waddle on!', 'Waddle on !', 'Waddle on!', 'Waddle on!', 'Waddle on!'),
    'entryToken.close': row('Close', '关闭', 'Cerrar', 'Fechar', '닫기', '閉じる', 'Fermer', 'Schließen', 'Закрыть', 'إغلاق'),
};
