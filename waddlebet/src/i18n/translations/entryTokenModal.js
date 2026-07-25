/** Penguin Maker entry — $WADDLE flagship + $CP on Solana */
const L = ['en', 'zh', 'es', 'pt', 'ko', 'ja', 'fr', 'de', 'ru', 'ar'];
const row = (en, zh, es, pt, ko, ja, fr, de, ru, ar) => {
    const v = [en, zh, es, pt, ko, ja, fr, de, ru, ar];
    const o = {};
    L.forEach((code, i) => { o[code] = v[i]; });
    return o;
};

export default {
    'entryToken.badge': row('Flagship Token', '旗舰代币', 'Token insignia', 'Token carro-chefe', '플래그십 토큰', 'フラッグシップ', 'Jeton phare', 'Flaggschiff-Token', 'Флагманский токен', 'الرمز الرائد'),
    'entryToken.title': row('$WADDLE on Robinhood Chain', 'Robinhood Chain 上的 $WADDLE', '$WADDLE en Robinhood Chain', '$WADDLE na Robinhood Chain', 'Robinhood Chain $WADDLE', 'Robinhood Chain の $WADDLE', '$WADDLE sur Robinhood Chain', '$WADDLE auf Robinhood Chain', '$WADDLE на Robinhood Chain', '$WADDLE على Robinhood Chain'),
    'entryToken.subtitle': row(
        '$WADDLE is our platform token on Robinhood Chain. $CP stays live on Solana in parallel — same game, two chains.',
        '$WADDLE 是 Robinhood Chain 上的平台代币。$CP 在 Solana 并行运行——同一游戏，两条链。',
        '$WADDLE es nuestro token en Robinhood Chain. $CP sigue en Solana en paralelo.',
        '$WADDLE é nosso token na Robinhood Chain. $CP continua na Solana em paralelo.',
        'Robinhood Chain의 $WADDLE. Solana $CP 병행 운영.',
        'Robinhood Chain の $WADDLE。Solana $CP は並行稼働。',
        '$WADDLE sur Robinhood Chain. $CP reste sur Solana en parallèle.',
        '$WADDLE auf Robinhood Chain. $CP parallel auf Solana.',
        '$WADDLE на Robinhood Chain. $CP параллельно на Solana.',
        '$WADDLE على Robinhood Chain. $CP بالتوازي على Solana.'
    ),
    'entryToken.waddleHead': row('$WADDLE · Robinhood Chain', '$WADDLE · Robinhood Chain', '$WADDLE · Robinhood Chain', '$WADDLE · Robinhood Chain', '$WADDLE · Robinhood Chain', '$WADDLE · Robinhood Chain', '$WADDLE · Robinhood Chain', '$WADDLE · Robinhood Chain', '$WADDLE · Robinhood Chain', '$WADDLE · Robinhood Chain'),
    'entryToken.waddleBody': row(
        'Connect MetaMask on Robinhood Chain to earn $WADDLE daily bonus, unlock nametag tiers, and access the expanding EVM economy.',
        '在 Robinhood Chain 连接 MetaMask，赚取 $WADDLE 每日奖励、解锁名牌等级，并接入扩展中的 EVM 经济。',
        'Conecta MetaMask en Robinhood Chain para bonus diario $WADDLE, nametags y economía EVM.',
        'Conecte MetaMask na Robinhood Chain para bônus diário $WADDLE, nametags e economia EVM.',
        'Robinhood Chain MetaMask로 $WADDLE 일일 보너스, 네임택, EVM 경제.',
        'Robinhood Chain の MetaMask で $WADDLE デイリーボーナス・ネームタグ・EVM 経済。',
        'MetaMask sur Robinhood Chain — bonus $WADDLE, nametags, économie EVM.',
        'MetaMask auf Robinhood Chain — $WADDLE Daily Bonus, Nametags, EVM-Wirtschaft.',
        'MetaMask на Robinhood Chain — daily bonus $WADDLE, неймтеги, EVM-экономика.',
        'MetaMask على Robinhood Chain — مكافآت $WADDLE يومية وبطاقات واقتصاد EVM.'
    ),
    'entryToken.waddleCaLabel': row('$WADDLE contract (CA)', '$WADDLE 合约 (CA)', 'Contrato $WADDLE (CA)', 'Contrato $WADDLE (CA)', '$WADDLE 컨트랙트 (CA)', '$WADDLE コントラクト (CA)', 'Contrat $WADDLE (CA)', '$WADDLE-Vertrag (CA)', 'Контракт $WADDLE (CA)', 'عقد $WADDLE (CA)'),
    'entryToken.solanaHead': row('$CP on Solana', 'Solana 上的 $CP', '$CP en Solana', '$CP na Solana', 'Solana $CP', 'Solana 上の $CP', '$CP sur Solana', '$CP auf Solana', '$CP на Solana', '$CP على Solana'),
    'entryToken.solanaParallel': row('Also live', '并行运行', 'También live', 'Também live', '병행 운영', '並行稼働', 'Aussi live', 'Auch live', 'Тоже live', 'مباشر أيضاً'),
    'entryToken.liveNow': row('Live', '已上线', 'En vivo', 'Ao vivo', '라이브', '稼働中', 'En ligne', 'Live', 'В сети', 'مباشر'),
    'entryToken.solanaBody': row(
        'The original $CP token on Solana — full legacy economy: pebbles, igloos, SPL wagers, NFT minting, and referrals.',
        'Solana 上的原版 $CP——完整 legacy 经济：卵石、冰屋、SPL 下注、NFT 铸造与推荐。',
        '$CP original en Solana — economía completa: pebbles, iglús, apuestas SPL, NFTs, referidos.',
        '$CP original na Solana — economia completa: pebbles, iglus, apostas SPL, NFTs, referências.',
        'Solana 원조 $CP — pebbles, 이글루, SPL 베팅, NFT, 추천 전체 경제.',
        'Solana オリジナル $CP — pebbles、イグルー、SPL賭け、NFT、紹介。',
        '$CP original sur Solana — économie complète : pebbles, igloos, paris SPL, NFT, parrainage.',
        'Originales $CP auf Solana — volle Ökonomie: Pebbles, Iglus, SPL-Wetten, NFTs, Referrals.',
        '$CP на Solana — полная экономика: pebbles, иглу, SPL-ставки, NFT, рефералы.',
        '$CP الأصلي على Solana — اقتصاد كامل: حصى، إيغلو، مراهنات SPL، NFT، إحالات.'
    ),
    'entryToken.caLabel': row('$CP contract (CA)', '$CP 合约 (CA)', 'Contrato $CP (CA)', 'Contrato $CP (CA)', '$CP 컨트랙트 (CA)', '$CP コントラクト (CA)', 'Contrat $CP (CA)', '$CP-Vertrag (CA)', 'Контракт $CP (CA)', 'عقد $CP (CA)'),
    'entryToken.copyCa': row('Copy', '复制', 'Copiar', 'Copiar', '복사', 'コピー', 'Copier', 'Kopieren', 'Копировать', 'نسخ'),
    'entryToken.copied': row('Copied!', '已复制', '¡Copiado!', 'Copiado!', '복사됨', 'コピー済', 'Copié !', 'Kopiert!', 'Скопировано!', 'تم النسخ'),
    'entryToken.buyJupiter': row('Buy $CP on Jupiter →', '在 Jupiter 购买 $CP →', 'Comprar $CP en Jupiter →', 'Comprar $CP na Jupiter →', 'Jupiter에서 $CP 구매 →', 'Jupiterで$CP購入 →', 'Acheter $CP sur Jupiter →', '$CP auf Jupiter kaufen →', 'Купить $CP на Jupiter →', 'اشترِ $CP على Jupiter →'),
    'entryToken.viewChart': row('$CP chart', '$CP 图表', 'Gráfico $CP', 'Gráfico $CP', '$CP 차트', '$CP チャート', 'Graphique $CP', '$CP-Chart', 'График $CP', 'رسم $CP'),
    'entryToken.viewExplorer': row('$WADDLE on Blockscout →', '$WADDLE Blockscout →', '$WADDLE en Blockscout →', '$WADDLE no Blockscout →', '$WADDLE Blockscout →', '$WADDLE Blockscout →', '$WADDLE sur Blockscout →', '$WADDLE auf Blockscout →', '$WADDLE на Blockscout →', '$WADDLE على Blockscout →'),
    'entryToken.viewWhitepaper': row('Whitepaper →', '白皮书 →', 'Whitepaper →', 'Whitepaper →', '백서 →', 'ホワイトペーパー →', 'Whitepaper →', 'Whitepaper →', 'Whitepaper →', 'الورقة البيضاء →'),
    'entryToken.dontShowAgain': row("Don't show again", '不再显示', 'No mostrar de nuevo', 'Não mostrar novamente', '다시 표시 안 함', '再表示しない', 'Ne plus afficher', 'Nicht mehr anzeigen', 'Больше не показывать', 'لا تظهر مرة أخرى'),
    'entryToken.continue': row('Waddle on!', 'Waddle on!', '¡Waddle on!', 'Waddle on!', 'Waddle on!', 'Waddle on!', 'Waddle on !', 'Waddle on!', 'Waddle on!', 'Waddle on!'),
    'entryToken.close': row('Close', '关闭', 'Cerrar', 'Fechar', '닫기', '閉じる', 'Fermer', 'Schließen', 'Закрыть', 'إغلاق'),
};
