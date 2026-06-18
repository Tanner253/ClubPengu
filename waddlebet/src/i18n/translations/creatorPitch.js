/** Penguin Maker — snappy new-player pitch */
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
        '3D penguin MMO · grind · wager · trade · on Solana',
        '3D 企鹅 MMO · 刷金 · 赌注 · 交易 · Solana',
        'MMO pingüino 3D · farmeo · apuestas · trade · Solana',
        'MMO pinguim 3D · grind · apostas · trade · Solana',
        '3D 펭귄 MMO · 그라인드 · 베팅 · 거래 · Solana',
        '3DペンギンMMO・稼ぎ・賭け・取引・Solana',
        'MMO pingouin 3D · grind · paris · trade · Solana',
        '3D-Pinguin-MMO · Grind · Wetten · Trade · Solana',
        '3D MMO пингвинов · гринд · ставки · трейд · Solana',
        'MMO بطاريق 3D · جمع · مراهنات · تداول · Solana'
    ),

    'creatorPitch.whatHead': row('What is this?', '这是什么？', '¿Qué es esto?', 'O que é isso?', '이게 뭐야?', 'これは何？', 'C\'est quoi ?', 'Was ist das?', 'Что это?', 'ما هذا؟'),
    'creatorPitch.whatBody': row(
        'Club Penguin energy, Runescape grind. A live 3D world — walk town, fish, chop wood, hit the casino, challenge players, flip skins. Free to play.',
        '企鹅俱乐部味 + 魔兽式刷金。开放 3D 世界——逛城镇、钓鱼、伐木、进赌场、挑战玩家、倒卖皮肤。免费游玩。',
        'Vibra Club Penguin, grind estilo Runescape. Mundo 3D en vivo — pesca, madera, casino, reta jugadores, flip skins. Gratis.',
        'Clima Club Penguin, grind estilo Runescape. Mundo 3D ao vivo — pesque, madeira, cassino, desafie jogadores, flip skins. Grátis.',
        '클럽 펭귄 감성 + 런스케이프식 그라인드. 라이브 3D 월드 — 낚시, 벌목, 카지노, PvP, 스킨 거래. 무료.',
        'クラペン感＋ランスク式グラインド。ライブ3Dワールド——釣り、伐採、カジノ、PvP、スキン取引。無料。',
        'Esprit Club Penguin, grind Runescape. Monde 3D live — pêche, bois, casino, défie des joueurs, flip skins. Gratuit.',
        'Club-Penguin-Vibes, Runescape-Grind. Live-3D-Welt — Angeln, Holz, Casino, PvP, Skins handeln. Kostenlos.',
        'Дух Club Penguin, гринд как Runescape. Живой 3D-мир — рыбалка, лес, казино, PvP, скины. Бесплатно.',
        'روح نادي البطاريق وجني مثل Runescape. عالم 3D حي — صيد، خشب، كازينو، PvP، سكنات. مجاني.'
    ),

    'creatorPitch.moneyHead': row('Can you make money?', '能赚钱吗？', '¿Puedes ganar dinero?', 'Dá para ganhar dinheiro?', '돈 벌 수 있어?', 'お金になる？', 'Peut-on gagner de l\'argent ?', 'Kann man Geld verdienen?', 'Можно заработать?', 'هل يمكنك ربح المال؟'),
    'creatorPitch.moneyYes': row(
        'Yes. Connect a Solana wallet, grind in-game, cash out at the Town Bank.',
        '能。连接 Solana 钱包，游戏内刷金，在城镇银行兑现。',
        'Sí. Conecta wallet Solana, farmea en el juego, cobra en el banco.',
        'Sim. Conecte carteira Solana, farme no jogo, saque no banco.',
        '응. Solana 지갑 연결, 인게임 그라인드, 마을 은행에서 현금화.',
        'はい。Solanaウォレット接続、ゲーム内で稼ぎ、街の銀行で換金。',
        'Oui. Connectez un wallet Solana, farmez en jeu, encaissez à la banque.',
        'Ja. Solana-Wallet verbinden, im Spiel grinden, an der Bank auszahlen.',
        'Да. Подключи Solana-кошелёк, фарми в игре, обналичь в банке.',
        'نعم. اربط محفظة Solana، اجني في اللعبة، اسحب عند البنك.'
    ),
    'creatorPitch.moneyHow1': row('Connect your Solana wallet', '连接 Solana 钱包', 'Conecta tu wallet Solana', 'Conecte sua carteira Solana', 'Solana 지갑 연결', 'Solanaウォレットを接続', 'Connectez votre wallet Solana', 'Solana-Wallet verbinden', 'Подключи Solana-кошелёк', 'اربط محفظة Solana'),
    'creatorPitch.moneyHow2': row('Play → earn gold (fish, wood, daily orders, PvP wagers)', '玩 → 赚金币（钓鱼、伐木、每日订单、PvP 赌注）', 'Juega → gana oro (pesca, madera, pedidos, PvP)', 'Jogue → ganhe ouro (pesca, madeira, pedidos, PvP)', '플레이 → 골드 (낚시·벌목·일일·PvP)', 'プレイ→ゴールド（釣り・伐採・デイリー・PvP）', 'Jouez → or (pêche, bois, commandes, PvP)', 'Spielen → Gold (Angeln, Holz, Aufträge, PvP)', 'Играй → золото (рыба, дерево, заказы, PvP)', 'العب → ذهب (صيد، خشب، مهام، PvP)'),
    'creatorPitch.moneyHow3': row('Bank ATM → sell gold for $CP (rate = what players trade)', '银行 ATM → 金币换 $CP（汇率=玩家成交价）', 'ATM banco → oro por $CP (precio = mercado)', 'ATM → ouro por $CP (preço = mercado)', '은행 ATM → 골드→$CP (시세=플레이어 거래)', '銀行ATM→ゴールド→$CP（相場=プレイヤー取引）', 'ATM → or contre $CP (cours = marché)', 'Bank-ATM → Gold für $CP (Kurs = Markt)', 'Банкомат → золото за $CP (курс = рынок)', 'صراف البنك → ذهب مقابل $CP'),
    'creatorPitch.moneyHow4': row('Swap $CP → USD on any DEX', 'DEX 将 $CP 换成美元', 'Cambia $CP → USD en cualquier DEX', 'Troque $CP → USD em qualquer DEX', 'DEX에서 $CP→USD', 'DEXで$CP→USD', 'Échangez $CP → USD sur un DEX', '$CP → USD auf jedem DEX', 'Меняй $CP → USD на DEX', 'بدّل $CP → USD على DEX'),
    'creatorPitch.moneyNote': row(
        'Gameplay drives $CP demand — igloo rent, wagers, whales buying gold to skip grind. Gold supply doesn\'t move the token price on DEX.',
        '玩法拉动 $CP 需求——冰屋租金、赌注、土豪买金跳刷。金币供应量不影响 DEX 上的代币价。',
        'El juego impulsa demanda de $CP — alquiler, apuestas, ballenas comprando oro. La oferta de oro no mueve el precio del token.',
        'O jogo gera demanda de $CP — aluguel, apostas, baleias comprando ouro. Oferta de ouro não move o token.',
        '게임플레이가 $CP 수요를 만듦 — 이글루·베팅·골드 구매. 골드 공급은 DEX 토큰가에 영향 없음.',
        'ゲームが$CP需要を生む——イグルー・賭け・ゴールド購入。ゴールド供給はDEX価格に無関係。',
        'Le jeu crée la demande $CP — loyer, paris, baleines qui achètent l\'or. L\'offre d\'or ne bouge pas le token.',
        'Gameplay treibt $CP-Nachfrage — Miete, Wetten, Wale kaufen Gold. Gold-Angebot bewegt den Token-Preis nicht.',
        'Геймплей создаёт спрос на $CP — аренда, ставки, покупка золота. Золото не двигает цену токена.',
        'اللعب يخلق طلباً على $CP — إيجار، مراهنات، شراء ذهب. عرض الذهب لا يحرك سعر الرمز.'
    ),

    'creatorPitch.worldHead': row('In the world', '世界里有什么', 'En el mundo', 'No mundo', '월드 안에서', 'ワールドの中身', 'Dans le monde', 'In der Welt', 'В мире', 'في العالم'),
    'creatorPitch.world1': row('Town, ferries, fishing docks, forests, igloos', '城镇、渡船、钓鱼码头、森林、冰屋', 'Ciudad, ferris, muelles, bosques, iglús', 'Cidade, balsas, cais, florestas, iglus', '마을, 배, 낚시터, 숲, 이글루', '街、フェリー、釣り場、森、イグルー', 'Ville, ferries, quais, forêts, igloos', 'Stadt, Fähren, Docks, Wälder, Iglus', 'Город, паромы, причалы, леса, иглу', 'مدينة، عبّارات، أرصفة، غابات، إيغلو'),
    'creatorPitch.world2': row('PvP wagers — Card Jitsu, Connect 4, Pong, UNO, Battleship, Monopoly', 'PvP 赌注——卡牌、四子棋、乒乓、UNO、战舰、大富翁', 'Apuestas PvP — Card Jitsu, Connect 4, Pong, UNO, etc.', 'Apostas PvP — Card Jitsu, Connect 4, Pong, UNO, etc.', 'PvP 베팅 — 카드지츠, 커넥트4, 퐁, UNO 등', 'PvP賭け——カード柔術、四目並べ、ポン、UNO等', 'Paris PvP — Card Jitsu, Connect 4, Pong, UNO, etc.', 'PvP-Wetten — Card Jitsu, Connect 4, Pong, UNO, etc.', 'PvP-ставки — Card Jitsu, Connect 4, Pong, UNO и др.', 'مراهنات PvP — Card Jitsu، Connect 4، Pong، UNO'),
    'creatorPitch.world3': row('Casino — gold slots & blackjack', '赌场——金币老虎机与二十一点', 'Casino — slots y blackjack con oro', 'Cassino — slots e blackjack com ouro', '카지노 — 골드 슬롯·블랙잭', 'カジノ——ゴールドスロット・BJ', 'Casino — slots et blackjack', 'Casino — Gold-Slots & Blackjack', 'Казино — слоты и блэкджек', 'كازينو — سلوتس وبلاك جاك'),
    'creatorPitch.world4': row('Cosmetic bazaar — trade skins like CS:GO (Pebbles, separate from cash-out)', '饰品集市——像 CS:GO 交易皮肤（鹅卵石，非兑现路径）', 'Bazar cosmético — skins estilo CS:GO (Pebbles, aparte del cobro)', 'Bazar de cosméticos — skins estilo CS:GO (Pebbles)', '코스메틱 바자 — CS:GO식 스킨 (페블, 현금화 아님)', 'コスメバザール——CS:GO風スキン（ペブル、換金ルートではない）', 'Bazar cosmétique — skins CS:GO (Pebbles)', 'Kosmetik-Basar — CS:GO-Skins (Pebbles)', 'Базар косметики — скины как CS:GO (Pebbles)', 'سوق مستحضرات — سكنات مثل CS:GO (حصى)'),
    'creatorPitch.world5': row('Daily orders, quests, friends, emotes', '每日订单、任务、好友、表情', 'Pedidos diarios, misiones, amigos', 'Pedidos diários, missões, amigos', '일일 의뢰, 퀘스트, 친구', 'デイリー、クエスト、フレンド', 'Commandes, quêtes, amis', 'Tagesaufträge, Quests, Freunde', 'Заказы, квесты, друзья', 'مهام يومية، أصدقاء'),
    'creatorPitch.world6': row('Town Bank — gold ↔ $CP on casino street', '城镇银行——赌场街金币↔$CP', 'Banco — oro ↔ $CP', 'Banco — ouro ↔ $CP', '마을 은행 — 골드↔$CP', '街の銀行——ゴールド↔$CP', 'Banque — or ↔ $CP', 'Bank — Gold ↔ $CP', 'Банк — золото ↔ $CP', 'بنك — ذهب↔$CP'),
    'creatorPitch.world7': row('$CP on Solana — igloo rent, SPL wagers, whale tags', '$CP on Solana — 冰屋租金、SPL 赌注、鲸鱼名牌', '$CP en Solana — alquiler, apuestas SPL, tags', '$CP na Solana — aluguel, apostas SPL, tags', 'Solana $CP — 이글루·SPL 베팅·고래 태그', 'Solana $CP——イグルー・SPL賭け・クジラタグ', '$CP sur Solana — loyer, paris SPL, tags', '$CP auf Solana — Miete, SPL-Wetten, Wal-Tags', '$CP на Solana — аренда, SPL-ставки, теги', '$CP على Solana — إيجار، مراهنات SPL'),

    'creatorPitch.cta': row('CREATE & PLAY →', '创建并开始 →', 'CREAR Y JUGAR →', 'CRIAR E JOGAR →', '만들고 플레이 →', '作成してプレイ →', 'CRÉER & JOUER →', 'ERSTELLEN & SPIELEN →', 'СОЗДАТЬ И ИГРАТЬ →', 'أنشئ والعب →'),
};
