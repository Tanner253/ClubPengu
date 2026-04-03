/**
 * Whitepaper copy: English (default) and Traditional Chinese (zh-TW).
 * Keys are flat dot-notation strings for use with useLanguage().t()
 */

export type WhitepaperLocale = "en" | "zh-TW";

export const DEFAULT_LOCALE: WhitepaperLocale = "en";

const en: Record<string, string> = {
  "lang.en": "English",
  "lang.zhTW": "繁體中文",
  "lang.switchAria": "Language",

  "bsc.banner.title": "BSC migration in development",
  "bsc.banner.body":
    "We are building a move toward Binance Smart Chain (BSC) as the primary home for $WADDLE—supporting Binance, BNB, and BEP-20—due to Solana holder volatility. Details are in the roadmap.",
  "bsc.banner.cta": "Open roadmap",
  "bsc.modal.title": "BSC roadmap & what’s next",
  "bsc.modal.body": `We are actively developing a migration toward Binance Smart Chain (BSC). Volatility among Solana holders has made it harder to build a stable long-term economy on a single chain—so we are integrating Binance, BNB, and BEP-20 into the product. Over time, BSC will become the primary chain for $WADDLE; contract (CA) updates and timing will be announced as we ship each phase.

What we are working on:
• Chain & wallet: BSC RPC, deposits and withdrawals, and safe settlement.
• $WADDLE on BSC: contract updates will be announced with timing—nothing changes until we publish details.
• “Create wallet for me”: optional account so you can play without an external wallet or Phantom—sign in like a normal game (custodial / email-linked; exact flow TBD).
• Wagers: extend today’s economy to tokens you hold on BSC—not only SPL.
• Chinese players: stronger 中文 UX, clearer onboarding, and regional options as we grow BSC.
• Guests: PvP minigames vs each other with no wallet and no wagers—casual matches for everyone.

Features ship in phases; this is our roadmap.`,
  "bsc.modal.dismiss": "Got it",

  "bsc.roadmapCard.phase": "Phase · In progress",
  "bsc.roadmapCard.title": "BSC migration — primary chain for $WADDLE",
  "bsc.roadmapCard.summary":
    "Binance Smart Chain support, BNB & BEP-20, and $WADDLE as the primary chain over time. Tap for the full roadmap.",
  "bsc.roadmapCard.cta": "View full roadmap",

  "nav.product": "Product",
  "nav.economics": "Economics",
  "nav.team": "Team",
  "nav.roadmap": "Roadmap",
  "nav.features": "Features",
  "nav.customization": "Customization",
  "nav.whaleStatus": "Whale Status",
  "nav.gachaSystem": "Gacha System",
  "nav.tokenEconomy": "Token Economy",
  "nav.changelog": "Changelog",
  "nav.play": "Play Now",
  "nav.whitepaper": "Whitepaper",

  "hero.badge": "Multi-chain: Binance BSC & Solana",
  "hero.taglineStart": "The First ",
  "hero.taglineHighlight": "Permissionless",
  "hero.taglineEnd": " Social Wagering Platform",
  "hero.taglineSingle": "The First Permissionless Social Wagering Platform",
  "hero.sub":
    "No KYC. No accounts. Just connect your wallet and wager any SPL token against anyone, anywhere. Powered by x402 payment protocol with instant on-chain settlement.",
  "pill.noKyc": "No KYC",
  "pill.x403": "x403 Wallet Auth",
  "pill.x402": "x402 P2P Protocol",
  "pill.anySpl": "Any SPL Token",
  "pill.cults": "All Solana Cults",
  "hero.stat.peak": "Peak Concurrent",
  "hero.stat.p2p": "P2P Games",
  "hero.stat.mainnet": "On Mainnet",
  "hero.stat.live": "Live",
  "hero.cta.explore": "Explore Whitepaper",
  "hero.cta.play": "Play Now",
  "hero.token.chains": "BSC-native (Binance) · Metaverse on Solana & BSC",
  "hero.scroll": "Scroll",

  "video.kicker": "Gameplay",
  "video.title": "See WaddleBet in Action",
  "video.titleZh": "親眼看看 WaddleBet",
  "video.desc":
    "Watch real gameplay footage and see what we’re building. This is not a concept—it’s playable right now.",
  "video.badge1": "Real Gameplay",
  "video.badge2": "Active Development",
  "video.badge3": "Playable Now",

  "about.kicker": "About",
  "about.title": "Waddle Into Web3",
  "about.title.web3": "Web3",
  "about.lead":
    "WaddleBet brings the nostalgia of classic penguin social gaming into the future—combining beloved mechanics with Solana’s speed and the thrill of crypto-native wagering.",

  "about.firstKind": "First of Its Kind",
  "about.wagerAny": "Wager Any SPL Token",
  "about.p1":
    "The first true multi-token PvP platform. No more fragmented communities. $BONK holder? Challenge a $WIF degen. $PENGU maxi? Wager against $SOL whales. Every Solana community, one arena.",
  "about.anyToken": "Any Token",
  "about.enterCa":
    "Enter any contract address. If it’s on Solana, you can wager it. Real-time blockchain validation ensures authenticity.",
  "about.whyMatters": "Why This Matters",
  "about.wh1": "Liquidity for every token",
  "about.wh2": "Cross-community interaction",
  "about.wh3": "Real utility beyond trading",
  "about.wh4": "Instant on-chain settlement",
  "about.wh5": "Custodial escrow protection",

  "about.feature1.title": "Classic Social Gaming",
  "about.feature1.desc":
    "3D voxel world, penguin customization, puffles, emotes, and the social experience you remember—rebuilt for Web3.",
  "about.feature2.title": "Virtual Properties",
  "about.feature2.desc":
    "Rent igloos and lounges. Paywall your space with any token. Host exclusive hangouts and earn from visitors.",
  "about.feature3.title": "Open Market Trading",
  "about.feature3.desc":
    "Runescape-style cosmetics marketplace. Trade items with other players. Build your collection through gacha and deals.",

  "about.quick1": "8+ Minigames",
  "about.quick2": "267+ Cosmetics",
  "about.quick3": "Puffle Pets",
  "about.quick4": "Own Property",
  "about.quick5": "P2P Wagers",
  "about.quick6": "Instant Settle",

  "contract.tokenLabel": "$WADDLE Token",
  "contract.liveOn": "Live on",
  "contract.pumpfun": "Pump.fun",
  "contract.note":
    "700k ATH pump never supported us. Fresh start on Pump.fun with a community that believes in the product.",
  "contract.copyTitle": "Copy address",

  "economy.tokenSubtitle": "BSC-native (Binance) · Ecosystem spans Solana & BSC",

  "footer.tagline": "Permissionless Social Wagering",
  "footer.builtOn": "Built on",
  "footer.chains": "Solana & BSC",
  "footer.community": "Community",
  "footer.devNoticeTitle": "Development Notice",
  "footer.disclaimerTitle": "Disclaimer",
  "footer.disclaimerBody":
    "WaddleBet is currently in active development. Features, tokenomics, and gameplay mechanics described in this whitepaper are subject to change. This is not financial advice. Always do your own research before participating in any cryptocurrency projects.",

  "changelog.kicker": "Development Log",
  "changelog.title": "Changelog",
  "changelog.lead": "Every line of code, every feature, every optimization documented.",
  "changelog.leadHighlight": "36 days of shipping.",
  "changelog.stat.releases": "Releases",
  "changelog.stat.changes": "Changes",
  "changelog.stat.files": "Files Touched",
  "changelog.stat.lines": "Lines Written",
  "changelog.expandAll": "Expand All",
  "changelog.collapseAll": "Collapse All",
  "changelog.refactorTitle": "Refactoring Highlights",
  "changelog.localeNote": "Changelog entries below are in English.",

  "roadmap.kicker": "Roadmap",
  "roadmap.title": "The Journey",
  "roadmap.titleHighlight": "Journey",
  "roadmap.lead": "From concept to the ultimate Web3 social gaming platform. Building in public, shipping fast.",
  "roadmap.progressLabel": "Development Progress",
  "roadmap.phasesComplete": "Phases Complete",
  "roadmap.featuresDone": "Features Done",
  "roadmap.inProgress": "In Progress",
  "roadmap.p2pGames": "P2P Games",
  "roadmap.daysBuilding": "Days Building",
  "roadmap.status.complete": "✓ Complete",
  "roadmap.status.current": "● In Progress",
  "roadmap.status.next": "◐ Next",
};

const zhTW: Record<string, string> = {
  "lang.en": "English",
  "lang.zhTW": "繁體中文",
  "lang.switchAria": "語言",

  "bsc.banner.title": "BSC 遷移開發中",
  "bsc.banner.body":
    "我們正將 $WADDLE 的主戰場移向幣安智能鏈（BSC），支援 Binance、BNB 與 BEP-20——因應 Solana 持幣者波動。詳見路線圖。",
  "bsc.banner.cta": "開啟路線圖",
  "bsc.modal.title": "BSC 路線圖與後續計畫",
  "bsc.modal.body": `我們正積極開發遷移至幣安智能鏈（BSC）。Solana 持幣者波動使單一鏈上長期穩定經濟更難建立——因此我們將 Binance、BNB 與 BEP-20 整合進產品。隨著各階段上線，BSC 將成為 $WADDLE 的主鏈；合約（CA）與時程將另行公告。

推進中的工作：
• 鏈與錢包：BSC RPC、充提與安全結算。
• BSC 上的 $WADDLE：合約更新將與時程一併公告——正式公布前不變。
•「幫我建立錢包」：可選帳戶，無需外接錢包或 Phantom 也能遊玩——像一般遊戲登入（託管／信箱連結等流程待定）。
• 下注：將現有經濟擴展至您在 BSC 持有的代幣——不限於 SPL。
• 中文玩家：隨 BSC 擴展，強化中文體驗、引導與在地選項。
• 訪客：無需錢包、無下注，即可與他人進行小遊戲 PvP——人人可玩的休閒對戰。

功能將分階段上線；本文為路線圖說明。`,
  "bsc.modal.dismiss": "知道了",

  "bsc.roadmapCard.phase": "階段 · 進行中",
  "bsc.roadmapCard.title": "BSC 遷移 — $WADDLE 主鏈",
  "bsc.roadmapCard.summary":
    "幣安智能鏈支援、BNB 與 BEP-20，$WADDLE 將逐步以 BSC 為主鏈。點此查看完整路線圖。",
  "bsc.roadmapCard.cta": "查看完整路線圖",

  "nav.product": "產品",
  "nav.economics": "經濟",
  "nav.team": "團隊",
  "nav.roadmap": "路線圖",
  "nav.features": "功能",
  "nav.customization": "自訂",
  "nav.whaleStatus": "巨鯨狀態",
  "nav.gachaSystem": "轉蛋",
  "nav.tokenEconomy": "代幣經濟",
  "nav.changelog": "更新日誌",
  "nav.play": "立即遊玩",
  "nav.whitepaper": "白皮書",

  "hero.badge": "多鏈：幣安 BSC 與 Solana",
  "hero.taglineStart": "",
  "hero.taglineHighlight": "",
  "hero.taglineEnd": "",
  "hero.taglineSingle": "首個無需許可的社交博弈平台",
  "hero.sub":
    "無需 KYC、無需帳號。連接錢包即可與任何人、在任何地方以任何 SPL 代幣對賭。透過 x402 支付協議與鏈上即時結算。",
  "hero.subAnySpl": "任何 SPL 代幣",
  "pill.noKyc": "無需 KYC",
  "pill.x403": "x403 錢包驗證",
  "pill.x402": "x402 P2P 協議",
  "pill.anySpl": "任意 SPL 代幣",
  "pill.cults": "所有 Solana 社群",
  "hero.stat.peak": "同時在線高峰",
  "hero.stat.p2p": "P2P 遊戲",
  "hero.stat.mainnet": "主網上線",
  "hero.stat.live": "已上線",
  "hero.cta.explore": "閱讀白皮書",
  "hero.cta.play": "立即遊玩",
  "hero.token.chains": "BSC 原生（幣安）· 元宇宙支援 Solana 與 BSC",
  "hero.scroll": "向下捲動",

  "video.kicker": "實機畫面",
  "video.title": "See WaddleBet in Action",
  "video.titleZh": "親眼看看 WaddleBet",
  "video.desc": "觀看實際遊玩片段與我們正在打造的內容。這不是概念——現在就能玩。",
  "video.badge1": "真實遊玩",
  "video.badge2": "積極開發",
  "video.badge3": "可立即遊玩",

  "about.kicker": "關於",
  "about.title": "搖搖晃晃進入 Web3",
  "about.title.web3": "Web3",
  "about.lead":
    "WaddleBet 將經典企鵝社交遊戲的懷舊感帶進未來——結合令人懷念的玩法、Solana 的速度與原生加密博弈的刺激。",

  "about.firstKind": "首創之舉",
  "about.wagerAny": "以任何 SPL 代幣對賭",
  "about.p1":
    "真正的多代幣 P2P 平台。不再各自為政。持有 $BONK？向 $WIF 玩家挑戰。$PENGU 鐵粉？與 $SOL 巨鯨對賭。每個 Solana 社群，同一個競技場。",
  "about.anyToken": "任意代幣",
  "about.enterCa":
    "輸入任何合約地址。在 Solana 上就能對賭。即時鏈上驗證確保真實性。",
  "about.whyMatters": "為何重要",
  "about.wh1": "每種代幣都有流動性",
  "about.wh2": "跨社群互動",
  "about.wh3": "超越交易的實際用途",
  "about.wh4": "鏈上即時結算",
  "about.wh5": "託管託管保護",

  "about.feature1.title": "經典社交遊戲",
  "about.feature1.desc":
    "3D 體素世界、企鵝自訂、Puffle、表情動作，以及你記得的社交體驗——為 Web3 重建。",
  "about.feature2.title": "虛擬資產",
  "about.feature2.desc": "租賃冰屋與休息室。以任何代幣設付費門檻。舉辦專屬聚會並從訪客獲得收益。",
  "about.feature3.title": "開放市場交易",
  "about.feature3.desc":
    "Runescape 風格外觀市集。與其他玩家交易物品。透過轉蛋與交易建立收藏。",

  "about.quick1": "8+ 小遊戲",
  "about.quick2": "267+ 外觀",
  "about.quick3": "Puffle 寵物",
  "about.quick4": "擁有房產",
  "about.quick5": "P2P 對賭",
  "about.quick6": "即時結算",

  "contract.tokenLabel": "$WADDLE 代幣",
  "contract.liveOn": "上線於",
  "contract.pumpfun": "Pump.fun",
  "contract.note":
    "曾經 70 萬 ATH 的 pump 從未支持我們。在 Pump.fun 重新出發，與相信產品的社群同行。",
  "contract.copyTitle": "複製地址",

  "economy.tokenSubtitle": "BSC 原生（幣安）· 生態涵蓋 Solana 與 BSC",

  "footer.tagline": "無需許可的社交博弈",
  "footer.builtOn": "建置於",
  "footer.chains": "Solana 與 BSC",
  "footer.community": "社群",
  "footer.devNoticeTitle": "開發中提醒",
  "footer.disclaimerTitle": "免責聲明",
  "footer.disclaimerBody":
    "WaddleBet 仍積極開發中。本白皮書所述功能、代幣經濟與遊戲機制可能變更。本文非投資建議。參與任何加密專案前請自行研究。",

  "changelog.kicker": "開發日誌",
  "changelog.title": "更新日誌",
  "changelog.lead": "每一行程式、每項功能、每次最佳化皆有記錄。",
  "changelog.leadHighlight": "連續 36 天交付。",
  "changelog.stat.releases": "版本",
  "changelog.stat.changes": "變更",
  "changelog.stat.files": "涉及檔案",
  "changelog.stat.lines": "程式行數",
  "changelog.expandAll": "全部展開",
  "changelog.collapseAll": "全部收合",
  "changelog.refactorTitle": "重構亮點",
  "changelog.localeNote": "以下更新條目為英文原文。",

  "roadmap.kicker": "路線圖",
  "roadmap.title": "旅程",
  "roadmap.titleHighlight": "旅程",
  "roadmap.lead": "從概念到終極 Web3 社交遊戲平台。公開建置、快速交付。",
  "roadmap.progressLabel": "開發進度",
  "roadmap.phasesComplete": "階段完成",
  "roadmap.featuresDone": "已完成功能",
  "roadmap.inProgress": "進行中",
  "roadmap.p2pGames": "P2P 遊戲",
  "roadmap.daysBuilding": "開發天數",
  "roadmap.status.complete": "✓ 已完成",
  "roadmap.status.current": "● 進行中",
  "roadmap.status.next": "◐ 下一步",
};

const BUNDLES: Record<WhitepaperLocale, Record<string, string>> = {
  en,
  "zh-TW": { ...en, ...zhTW },
};

export function getWhitepaperMessage(locale: WhitepaperLocale, key: string): string {
  return BUNDLES[locale][key] ?? BUNDLES.en[key] ?? key;
}
