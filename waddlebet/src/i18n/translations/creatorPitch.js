/** Penguin Maker — snappy new-player pitch ($WADDLE flagship · $CP on Solana) */
const L = ['en', 'zh', 'es', 'pt', 'ko', 'ja', 'fr', 'de', 'ru', 'ar'];
const row = (en, zh, es, pt, ko, ja, fr, de, ru, ar) => {
    const v = [en, zh, es, pt, ko, ja, fr, de, ru, ar];
    const o = {};
    L.forEach((code, i) => { o[code] = v[i]; });
    return o;
};

export default {
    'creatorPitch.badge': row('TOKENOMICS', '代币经济', 'TOKENOMICS', 'TOKENOMICS', '토크노믹스', 'トークノミクス', 'TOKENOMICS', 'TOKENOMICS', 'ТОКЕНОМИКА', 'اقتصاد الرمز'),
    'creatorPitch.badgeShort': row('P2E', '赚', 'P2E', 'P2E', 'P2E', 'P2E', 'P2E', 'P2E', 'P2E', 'P2E'),

    'creatorPitch.title': row('WADDLE.BET', 'WADDLE.BET', 'WADDLE.BET', 'WADDLE.BET', 'WADDLE.BET', 'WADDLE.BET', 'WADDLE.BET', 'WADDLE.BET', 'WADDLE.BET', 'WADDLE.BET'),
    'creatorPitch.subtitle': row(
        '3D penguin MMO · $WADDLE on Robinhood · $CP on Solana',
        '3D 企鹅 MMO · Robinhood $WADDLE · Solana $CP',
        'MMO pingüino 3D · $WADDLE Robinhood · $CP Solana',
        'MMO pinguim 3D · $WADDLE Robinhood · $CP Solana',
        '3D 펭귄 MMO · Robinhood $WADDLE · Solana $CP',
        '3DペンギンMMO · Robinhood $WADDLE · Solana $CP',
        'MMO pingouin 3D · $WADDLE Robinhood · $CP Solana',
        '3D-Pinguin-MMO · $WADDLE Robinhood · $CP Solana',
        '3D MMO · $WADDLE Robinhood · $CP Solana',
        'MMO بطاريق 3D · $WADDLE Robinhood · $CP Solana'
    ),

    'creatorPitch.whatHead': row('What is this?', '这是什么？', '¿Qué es esto?', 'O que é isso?', '이게 뭐야?', 'これは何？', 'C\'est quoi ?', 'Was ist das?', 'Что это?', 'ما هذا؟'),
    'creatorPitch.whatBody': row(
        'Club Penguin energy, Runescape grind. A live multichain 3D world — walk town, fish, chop wood, hit the casino, challenge players, flip skins. Free to play.',
        '企鹅俱乐部味 + 魔兽式刷金。多链 3D 开放世界——逛城镇、钓鱼、伐木、赌场、PvP、倒卖皮肤。免费游玩。',
        'Vibra Club Penguin, grind Runescape. Mundo 3D multichain en vivo — pesca, madera, casino, PvP, skins. Gratis.',
        'Clima Club Penguin, grind Runescape. Mundo 3D multichain — pesque, madeira, cassino, PvP, skins. Grátis.',
        '클럽 펭귄 + 런스케이프 그라인드. 멀티체인 3D 월드 — 낚시, 벌목, 카지노, PvP, 스킨. 무료.',
        'クラペン感＋ランスク式グラインド。マルチチェーン3D——釣り、伐採、カジノ、PvP、スキン。無料。',
        'Esprit Club Penguin, grind Runescape. Monde 3D multichaîne — pêche, bois, casino, PvP, skins. Gratuit.',
        'Club-Penguin-Vibes, Runescape-Grind. Multichain-3D-Welt — Angeln, Holz, Casino, PvP, Skins. Kostenlos.',
        'Дух Club Penguin, гринд Runescape. Мультичейн 3D — рыбалка, лес, казино, PvP, скины. Бесплатно.',
        'روح نادي البطاريق وجني Runescape. عالم 3D متعدد السلاسل — صيد، خشب، كازينو، PvP، سكنات. مجاني.'
    ),

    'creatorPitch.moneyHead': row('Can you make money?', '能赚钱吗？', '¿Puedes ganar dinero?', 'Dá para ganhar dinheiro?', '돈 벌 수 있어?', 'お金になる？', 'Peut-on gagner de l\'argent ?', 'Kann man Geld verdienen?', 'Можно заработать?', 'هل يمكنك ربح المال؟'),
    'creatorPitch.moneyYes': row(
        'Yes. Connect MetaMask on Robinhood ($WADDLE) or Phantom on Solana ($CP), grind in-game, and claim daily bonus rewards.',
        '能。Robinhood MetaMask（$WADDLE）或 Solana Phantom（$CP）连接，游戏内刷金并领取每日奖励。',
        'Sí. MetaMask en Robinhood ($WADDLE) o Phantom en Solana ($CP), farmea y reclama bonus diario.',
        'Sim. MetaMask na Robinhood ($WADDLE) ou Phantom na Solana ($CP), farme e bônus diário.',
        '응. Robinhood MetaMask($WADDLE) 또는 Solana Phantom($CP), 그라인드 + 일일 보너스.',
        'はい。Robinhood MetaMask（$WADDLE）またはSolana Phantom（$CP）、稼ぎ＋デイリーボーナス。',
        'Oui. MetaMask sur Robinhood ($WADDLE) ou Phantom sur Solana ($CP), farmez et bonus quotidien.',
        'Ja. MetaMask auf Robinhood ($WADDLE) oder Phantom auf Solana ($CP), grinden und Daily Bonus.',
        'Да. MetaMask на Robinhood ($WADDLE) или Phantom на Solana ($CP), фарм и daily bonus.',
        'نعم. MetaMask على Robinhood ($WADDLE) أو Phantom على Solana ($CP)، اجني ومكافآت يومية.'
    ),
    'creatorPitch.moneyHow1': row('Connect MetaMask on Robinhood ($WADDLE) or Phantom on Solana ($CP)', '连接 Robinhood MetaMask（$WADDLE）或 Solana Phantom（$CP）', 'MetaMask Robinhood ($WADDLE) o Phantom Solana ($CP)', 'MetaMask Robinhood ($WADDLE) ou Phantom Solana ($CP)', 'Robinhood MetaMask($WADDLE) 또는 Solana Phantom($CP)', 'Robinhood MetaMask（$WADDLE）またはSolana Phantom（$CP）', 'MetaMask Robinhood ($WADDLE) ou Phantom Solana ($CP)', 'MetaMask Robinhood ($WADDLE) oder Phantom Solana ($CP)', 'MetaMask Robinhood ($WADDLE) или Phantom Solana ($CP)', 'MetaMask Robinhood ($WADDLE) أو Phantom Solana ($CP)'),
    'creatorPitch.moneyHow2': row('Play → earn gold (fish, wood, daily orders, PvP wagers)', '玩 → 赚金币（钓鱼、伐木、每日订单、PvP 赌注）', 'Juega → gana oro (pesca, madera, pedidos, PvP)', 'Jogue → ganhe ouro (pesca, madeira, pedidos, PvP)', '플레이 → 골드 (낚시·벌목·일일·PvP)', 'プレイ→ゴールド（釣り・伐採・デイリー・PvP）', 'Jouez → or (pêche, bois, commandes, PvP)', 'Spielen → Gold (Angeln, Holz, Aufträge, PvP)', 'Играй → золото (рыба, дерево, заказы, PvP)', 'العب → ذهب (صيد، خشب، مهام، PvP)'),
    'creatorPitch.moneyHow3': row('Daily bonus streak pays $WADDLE (Robinhood) or $CP (Solana) after 60 min play', '每日奖励 streak — 玩满 60 分钟领 $WADDLE（Robinhood）或 $CP（Solana）', 'Racha diaria paga $WADDLE (Robinhood) o $CP (Solana) tras 60 min', 'Streak diário paga $WADDLE (Robinhood) ou $CP (Solana) após 60 min', '60분 플레이 후 $WADDLE(Robinhood) 또는 $CP(Solana) 일일 보너스', '60分プレイで$WADDLE（Robinhood）または$CP（Solana）', 'Bonus quotidien $WADDLE (Robinhood) ou $CP (Solana) après 60 min', 'Daily Bonus: $WADDLE (Robinhood) oder $CP (Solana) nach 60 Min', 'Daily bonus: $WADDLE (Robinhood) или $CP (Solana) после 60 мин', 'مكافأة يومية $WADDLE (Robinhood) أو $CP (Solana) بعد 60 د'),
    'creatorPitch.moneyHow4': row('Trade $WADDLE on Robinhood DEXs or $CP on Solana DEXs like Jupiter', '在 Robinhood DEX 交易 $WADDLE 或在 Jupiter 等 Solana DEX 交易 $CP', 'Opera $WADDLE en DEX Robinhood o $CP en Jupiter/Solana', 'Negocie $WADDLE na Robinhood ou $CP na Jupiter/Solana', 'Robinhood DEX $WADDLE 또는 Jupiter $CP 거래', 'Robinhood DEXで$WADDLE、Jupiterで$CP', 'Échangez $WADDLE sur Robinhood ou $CP sur Jupiter', '$WADDLE auf Robinhood-DEXs oder $CP auf Jupiter', 'Торгуй $WADDLE на Robinhood или $CP на Jupiter', 'تداول $WADDLE على Robinhood أو $CP على Jupiter'),
    'creatorPitch.moneyNote': row(
        'Gameplay drives demand for both platform tokens — nametag tiers, igloo rent, wagers, daily bonus. Gold grind is separate from on-chain token price.',
        '玩法拉动 $WADDLE 与 $CP 需求——名牌、冰屋租金、下注、每日奖励。金币刷取与链上代币价分开。',
        'El juego impulsa demanda de $WADDLE y $CP — nametags, alquiler, apuestas, bonus. El oro no mueve el precio del token.',
        'O jogo gera demanda de $WADDLE e $CP — nametags, aluguel, apostas, bônus. Ouro não move o token.',
        '게임플레이가 $WADDLE·$CP 수요 창출 — 네임택, 이글루, 베팅, 보너스. 골드는 토큰가와 별개.',
        'ゲームが$WADDLE・$CP需要を生む——ネームタグ、イグルー、賭け、ボーナス。ゴールドは別。',
        'Le jeu crée la demande $WADDLE et $CP — nametags, loyer, paris, bonus.',
        'Gameplay treibt $WADDLE- und $CP-Nachfrage — Nametags, Miete, Wetten, Bonus.',
        'Геймплей создаёт спрос на $WADDLE и $CP — неймтеги, аренда, ставки, бонус.',
        'اللعب يخلق طلباً على $WADDLE و$CP — بطاقات، إيجار، مراهنات، مكافآت.'
    ),

    'creatorPitch.worldHead': row('In the world', '世界里有什么', 'En el mundo', 'No mundo', '월드 안에서', 'ワールドの中身', 'Dans le monde', 'In der Welt', 'В мире', 'في العالم'),
    'creatorPitch.world1': row('Town, ferries, fishing docks, forests, igloos', '城镇、渡船、钓鱼码头、森林、冰屋', 'Ciudad, ferris, muelles, bosques, iglús', 'Cidade, balsas, cais, florestas, iglus', '마을, 배, 낚시터, 숲, 이글루', '街、フェリー、釣り場、森、イグルー', 'Ville, ferries, quais, forêts, igloos', 'Stadt, Fähren, Docks, Wälder, Iglus', 'Город, паромы, причалы, леса, иглу', 'مدينة، عبّارات، أرصفة، غابات، إيغلو'),
    'creatorPitch.world2': row('PvP wagers — Card Jitsu, Connect 4, Pong, UNO, Battleship, Monopoly', 'PvP 赌注——卡牌、四子棋、乒乓、UNO、战舰、大富翁', 'Apuestas PvP — Card Jitsu, Connect 4, Pong, UNO, etc.', 'Apostas PvP — Card Jitsu, Connect 4, Pong, UNO, etc.', 'PvP 베팅 — 카드지츠, 커넥트4, 퐁, UNO 등', 'PvP賭け——カード柔術、四目並べ、ポン、UNO等', 'Paris PvP — Card Jitsu, Connect 4, Pong, UNO, etc.', 'PvP-Wetten — Card Jitsu, Connect 4, Pong, UNO, etc.', 'PvP-ставки — Card Jitsu, Connect 4, Pong, UNO и др.', 'مراهنات PvP — Card Jitsu، Connect 4، Pong، UNO'),
    'creatorPitch.world3': row('Casino — gold slots & blackjack', '赌场——金币老虎机与二十一点', 'Casino — slots y blackjack con oro', 'Cassino — slots e blackjack com ouro', '카지노 — 골드 슬롯·블랙잭', 'カジノ——ゴールドスロット・BJ', 'Casino — slots et blackjack', 'Casino — Gold-Slots & Blackjack', 'Казино — слоты и блэкджек', 'كازينو — سلوتس وبلاك جاك'),
    'creatorPitch.world4': row('Cosmetic bazaar — trade skins like CS:GO (Pebbles on Solana today)', '饰品集市——像 CS:GO 交易皮肤（Solana Pebbles）', 'Bazar cosmético — skins CS:GO (Pebbles en Solana)', 'Bazar de cosméticos — skins CS:GO (Pebbles na Solana)', '코스메틱 바자 — CS:GO식 스킨 (Solana Pebbles)', 'コスメバザール——CS:GO風スキン（Solana Pebbles）', 'Bazar cosmétique — skins CS:GO (Pebbles Solana)', 'Kosmetik-Basar — CS:GO-Skins (Pebbles Solana)', 'Базар косметики — скины CS:GO (Pebbles Solana)', 'سوق مستحضرات — سكنات CS:GO (Pebbles Solana)'),
    'creatorPitch.world5': row('Daily orders, quests, friends, emotes', '每日订单、任务、好友、表情', 'Pedidos diarios, misiones, amigos', 'Pedidos diários, missões, amigos', '일일 의뢰, 퀘스트, 친구', 'デイリー、クエスト、フレンド', 'Commandes, quêtes, amis', 'Tagesaufträge, Quests, Freunde', 'Заказы, квесты, друзья', 'مهام يومية، أصدقاء'),
    'creatorPitch.world6': row('Daily bonus — 7-day $WADDLE or $CP streak (60 min play, 24h cooldown)', '每日奖励——7 天 $WADDLE 或 $CP streak（60 分钟游玩）', 'Bonus diario — racha 7 días $WADDLE o $CP (60 min)', 'Bônus diário — streak 7 dias $WADDLE ou $CP (60 min)', '일일 보너스 — 7일 $WADDLE/$CP streak (60분)', 'デイリーボーナス——7日$WADDLE/$CP streak', 'Bonus quotidien — streak 7j $WADDLE ou $CP', 'Daily Bonus — 7-Tage $WADDLE/$CP-Streak', 'Daily bonus — 7-дневный streak $WADDLE/$CP', 'مكافأة يومية — streak 7 أيام $WADDLE/$CP'),
    'creatorPitch.world7': row('$WADDLE on Robinhood (flagship) · $CP on Solana (full legacy economy)', '$WADDLE Robinhood（旗舰）· $CP Solana（完整 legacy 经济）', '$WADDLE Robinhood (insignia) · $CP Solana (economía completa)', '$WADDLE Robinhood (carro-chefe) · $CP Solana (economia completa)', 'Robinhood $WADDLE(플래그십) · Solana $CP(풀 경제)', 'Robinhood $WADDLE（旗艦）· Solana $CP（フル経済）', '$WADDLE Robinhood (phare) · $CP Solana (économie complète)', '$WADDLE Robinhood (Flaggschiff) · $CP Solana (Volle Ökonomie)', '$WADDLE Robinhood (флагман) · $CP Solana (полная экономика)', '$WADDLE Robinhood (رائد) · $CP Solana (اقتصاد كامل)'),

    'creatorPitch.cta': row('CREATE & PLAY →', '创建并开始 →', 'CREAR Y JUGAR →', 'CRIAR E JOGAR →', '만들고 플레이 →', '作成してプレイ →', 'CRÉER & JOUER →', 'ERSTELLEN & SPIELEN →', 'СОЗДАТЬ И ИГРАТЬ →', 'أنشئ والعب →'),
};
