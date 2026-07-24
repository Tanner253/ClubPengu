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
  "nav.multichain": "Multichain",
  "nav.caCopyTitle": "Copy $CP contract address",
  "nav.caCopied": "Copied!",

  "hero.badge": "First Multichain Metaverse",
  "hero.taglineStart": "The First ",
  "hero.taglineHighlight": "Multichain",
  "hero.taglineEnd": " Social Wagering Metaverse",
  "hero.taglineSingle": "The First Multichain Social Wagering Metaverse",
  "hero.sub":
    "$WADDLE is live on Robinhood Chain — the flagship platform token. Solana ($CP) fully playable in parallel. Connect your wallet, wager any token, and waddle into the first multichain social metaverse.",
  "pill.noKyc": "No KYC",
  "pill.x403": "x403 Wallet Auth",
  "pill.x402": "x402 P2P Protocol",
  "pill.anySpl": "Any SPL / EVM Token",
  "pill.cults": "All Solana Cults",
  "pill.multichain": "Multichain",
  "pill.robinhoodEvm": "Robinhood EVM · Phase 1 Live",
  "hero.chains.title": "Built for Two Chains",
  "hero.chains.solana": "Solana",
  "hero.chains.solanaStatus": "Live",
  "hero.chains.robinhood": "Robinhood Chain",
  "hero.chains.robinhoodStatus": "Phase 1 Live",
  "hero.chains.robinhoodSub": "Ethereum EVM",
  "hero.cta.multichain": "Multichain Vision",
  "hero.stat.peak": "Peak Concurrent",
  "hero.stat.p2p": "P2P Games",
  "hero.stat.mainnet": "On Mainnet",
  "hero.stat.live": "Live",
  "hero.cta.explore": "Explore Whitepaper",
  "hero.cta.play": "Play Now",
  "hero.token.chains": "Robinhood Chain ($WADDLE) + Solana ($CP) — multichain live",
  "hero.scroll": "Scroll",
  "hero.videoBgTitle": "WaddleBet gameplay trailer (background)",
  "hero.scrollLift": "Scroll to reveal the trailer",

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
    "WaddleBet brings classic penguin social gaming into Web3 — $WADDLE on Robinhood Chain is the flagship token, with $CP live on Solana. Every utility on Solana is rolling out on EVM in parallel.",

  "about.firstKind": "First of Its Kind",
  "about.wagerAny": "Wager Any SPL or EVM Token",
  "about.p1":
    "The first true multi-token PvP platform. $BONK vs $WIF on Solana today — any ERC-20 on Robinhood Chain as rails expand. Every community, one arena.",
  "about.anyToken": "Any Token",
  "about.enterCa":
    "Enter any contract address. SPL on Solana or ERC-20 on Robinhood Chain — if it's on a supported chain, you can wager it. Real-time blockchain validation ensures authenticity.",
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

  "multichain.kicker": "Multichain Vision",
  "multichain.title": "The First Multichain",
  "multichain.titleHighlight": "Social Metaverse",
  "multichain.lead":
    "WaddleBet is expanding beyond Solana. We're building toward Robinhood Chain — Robinhood's Ethereum-compatible EVM layer — so millions of new users can waddle in without switching ecosystems.",
  "multichain.robinhood.badge": "Phase 1 Live",
  "multichain.robinhood.title": "Robinhood Chain · Ethereum EVM",
  "multichain.robinhood.p1":
    "Robinhood is bringing crypto to a mainstream audience of 25M+ users. Their EVM-compatible chain opens the door for WaddleBet to meet that audience where they already are — with the same social wagering, cosmetics economy, and penguin metaverse they love on Solana.",
  "multichain.robinhood.p2":
    "$WADDLE is deployed on Robinhood Chain. MetaMask sign-in, world play, gold economy, Diamond Flippers nametags, and daily bonus rewards are live today. Pebbles, igloos, and token wagers ship in later phases — Solana ($CP) remains fully playable in parallel.",
  "multichain.robinhood.caLabel": "Contract Address",
  "multichain.why.title": "Why Multichain?",
  "multichain.why.p1":
    "Crypto shouldn't be a single-chain island. Supporting Ethereum via Robinhood Chain lets WaddleBet reach a broader audience — ETH holders, Robinhood traders, and EVM-native communities — while keeping our Solana roots intact.",
  "multichain.why.b1": "First multichain social wagering metaverse in crypto",
  "multichain.why.b2": "Broader audience — Ethereum + Robinhood's mainstream reach",
  "multichain.why.b3": "Same penguin world, two chains — one community",
  "multichain.why.b4": "More tokens, more liquidity, more wagers",
  "multichain.why.b5": "Future-proof architecture as Web3 goes multichain",
  "multichain.solana.title": "Solana · Live Now",
  "multichain.solana.desc":
    "Our production chain today. Instant settlement, SPL wagering, Phantom wallet auth, and the full WaddleBet experience — playable right now at waddle.bet.",
  "multichain.solana.status": "● Live on Mainnet",
  "multichain.robinhood.status": "● Live on Robinhood Chain",

  "contract.tokenLabel": "$CP",
  "contract.liveOn": "Live on",
  "contract.platform": "Solana",
  "contract.ethLabel": "$WADDLE (Robinhood Chain)",
  "contract.ethPlatform": "Robinhood Chain",
  "contract.copyEthTitle": "Copy ETH contract address",
  "contract.cpw3OriginalLabel": "Original $CPW3 (Solana) — ~$700k ATH",
  "contract.copyCpw3Title": "Copy original $CPW3 mint",
  "contract.note":
    "$WADDLE above is the flagship platform token on Robinhood Chain. $CP on Solana is live in parallel. The $CPW3 mint below is the original deployment — shown for track record only. Verify any contract before trading.",
  "contract.redeployStory":
    "$CP is a clean redeploy after the original $CPW3 chart became unusable. $CPW3 was never a taggable ticker on X, which made discovery and community growth nearly impossible. After peaking near ~$700k market cap on Solana, a massive sell-off left the chart exposed: a third party bundled roughly 40% of supply and effectively held the chart hostage. We redeployed as $CP — a proper, taggable ticker — so the community and product could move forward on a chart we control.",
  "contract.copyTitle": "Copy contract address",

  "chart.kicker": "Track record",
  "chart.title": "Original token $CPW3",
  "chart.sub":
    "The original $CPW3 token reached roughly ~$700k market cap on Solana — proof of real demand for what we were building. $CPW3 was not a taggable ticker on X. After a steep sell-off from that ATH, a third party bundled about 40% of supply and held the chart hostage, prompting our redeploy as $CP.",
  "chart.mintLabel": "SPL mint (contract address)",
  "chart.copyMint": "Copy mint address",

  "economy.tokenSubtitle": "Flagship $WADDLE on Robinhood EVM — same utility as Solana ($CP), rolling out across both chains",

  "footer.tagline": "Permissionless Social Wagering",
  "footer.builtOn": "Built on",
  "footer.chains": "Solana · Robinhood Chain (EVM)",
  "footer.community": "Community",
  "footer.devNoticeTitle": "Development Notice",
  "footer.disclaimerTitle": "Disclaimer",
  "footer.disclaimerBody":
    "WaddleBet is currently in active development. Features, tokenomics, and gameplay mechanics described in this whitepaper are subject to change. This is not financial advice. Always do your own research before participating in any cryptocurrency projects.",

  "changelog.kicker": "Development Log",
  "changelog.title": "Changelog",
  "changelog.lead": "Every line of code, every feature, every optimization documented.",
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
  "roadmap.lead": "From social wagering to a lightweight MMORPG — levels, gathering, and a $WADDLE-backed economy. Building in public, shipping in phases.",
  "roadmap.progressLabel": "Development Progress",
  "roadmap.phasesComplete": "Phases Complete",
  "roadmap.featuresDone": "Features Done",
  "roadmap.inProgress": "In Progress",
  "roadmap.p2pGames": "P2P Games",
  "roadmap.daysBuilding": "Days building (total)",
  "roadmap.status.complete": "✓ Complete",
  "roadmap.status.current": "● In Progress",
  "roadmap.status.next": "◐ Next",
  "roadmap.status.planned": "◇ Planned",
  "roadmap.mmorpg.kicker": "MMORPG Pivot",
  "roadmap.mmorpg.title": "Progression, Gathering & Living Economy",
  "roadmap.mmorpg.lead": "We extend what is already live — not a reboot. Players earn XP, unlock zones, chop wood in the forest, fish on the ice, complete daily & weekly challenges, and participate in a circulating economy backed by $WADDLE (and $CP on Solana).",
  "roadmap.mmorpg.bullet1": "Level gates — Ice Fields Lv 10, Casino Lv 5, Forest Lv 3",
  "roadmap.mmorpg.bullet2": "Skills — Fishing, Woodcutting, Parkour improve yields",
  "roadmap.mmorpg.bullet3": "Economy — Gold circulates; $WADDLE / $CP earns are capped; materials trade on market",
  "roadmap.mmorpg.bullet4": "Property — Igloo rentals today; more ownership options explored with community",
  "roadmap.mmorpg.fullDoc": "Read the full MMORPG roadmap on GitHub",
  "roadmap.mmorpg.fullDocHref": "https://github.com/Tanner253/waddlebet/blob/main/waddlebet/docs/MMORPG_ROADMAP.md",

  "finalCta.title": "Ready to waddle in?",
  "finalCta.sub":
    "Everything you just read is live right now. Hop into the world, customize your penguin, and pull up a seat at the table.",
  "finalCta.community": "Join the Community",
};

const zhTW: Record<string, string> = {
  "lang.en": "English",
  "lang.zhTW": "繁體中文",
  "lang.switchAria": "語言",

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
  "nav.multichain": "多鏈",
  "nav.caCopyTitle": "複製 $CP 合約地址",
  "nav.caCopied": "已複製！",

  "hero.badge": "首個多鏈元宇宙",
  "hero.taglineStart": "",
  "hero.taglineHighlight": "",
  "hero.taglineEnd": "",
  "hero.taglineSingle": "首個多鏈社交博弈元宇宙",
  "hero.sub":
    "$WADDLE 已於 Robinhood Chain 上線——旗艦平台代幣。Solana（$CP）仍完全可玩。連接錢包、以任意代幣對賭，進入首個多鏈社交元宇宙。",
  "hero.subAnySpl": "任意 SPL / EVM 代幣",
  "pill.noKyc": "無需 KYC",
  "pill.x403": "x403 錢包驗證",
  "pill.x402": "x402 P2P 協議",
  "pill.anySpl": "任意 SPL / EVM 代幣",
  "pill.cults": "所有 Solana 社群",
  "pill.multichain": "多鏈",
  "pill.robinhoodEvm": "Robinhood EVM · 第一階段",
  "hero.chains.title": "雙鏈建置",
  "hero.chains.solana": "Solana",
  "hero.chains.solanaStatus": "已上線",
  "hero.chains.robinhood": "Robinhood Chain",
  "hero.chains.robinhoodStatus": "第一階段已上線",
  "hero.chains.robinhoodSub": "以太坊 EVM",
  "hero.cta.multichain": "多鏈願景",
  "hero.stat.peak": "同時在線高峰",
  "hero.stat.p2p": "P2P 遊戲",
  "hero.stat.mainnet": "主網上線",
  "hero.stat.live": "已上線",
  "hero.cta.explore": "閱讀白皮書",
  "hero.cta.play": "立即遊玩",
  "hero.token.chains": "Robinhood Chain（$WADDLE）+ Solana（$CP）— 多鏈已上線",
  "hero.scroll": "向下捲動",
  "hero.videoBgTitle": "WaddleBet 實機預告（背景）",
  "hero.scrollLift": "捲動以揭開預告片",

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
    "WaddleBet 將經典企鵝社交遊戲帶入 Web3——Robinhood Chain 上的 $WADDLE 為旗艦代幣，Solana 上的 $CP 仍完全可玩。Solana 上的每項功能正同步推向 EVM。",

  "about.firstKind": "首創之舉",
  "about.wagerAny": "以任何 SPL 或 EVM 代幣對賭",
  "about.p1":
    "真正的多代幣 P2P 平台。Solana 上 $BONK 對 $WIF——Robinhood Chain 上任意 ERC-20 隨功能擴展。每個社群，同一競技場。",
  "about.anyToken": "任意代幣",
  "about.enterCa":
    "輸入任何合約地址。Solana 上的 SPL 或 Robinhood Chain 上的 ERC-20——在支援的鏈上即可對賭。即時鏈上驗證確保真實性。",
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

  "multichain.kicker": "多鏈願景",
  "multichain.title": "首個多鏈",
  "multichain.titleHighlight": "社交元宇宙",
  "multichain.lead":
    "WaddleBet 正超越 Solana。我們正朝 Robinhood Chain——Robinhood 的以太坊相容 EVM 層——擴展，讓數百萬新用戶無需切換生態即可搖擺入場。",
  "multichain.robinhood.badge": "第一階段已上線",
  "multichain.robinhood.title": "Robinhood Chain · 以太坊 EVM",
  "multichain.robinhood.p1":
    "Robinhood 正將加密帶給 2500 萬以上的主流用戶。其 EVM 相容鏈讓 WaddleBet 能在用戶已熟悉的地方相遇——與 Solana 上相同的社交對賭、外觀經濟與企鵝元宇宙。",
  "multichain.robinhood.p2":
    "$WADDLE 已部署於 Robinhood Chain。MetaMask 登入、世界遊玩、金幣經濟與 Diamond Flippers 名牌今日已上線。鏈上功能（每日獎勵、卵石、冰屋、代幣對賭）分階段推出——Solana（$CP）仍完全可玩。",
  "multichain.robinhood.caLabel": "合約地址",
  "multichain.why.title": "為何多鏈？",
  "multichain.why.p1":
    "加密不應是單鏈孤島。透過 Robinhood Chain 支援以太坊，讓 WaddleBet 觸及更廣受眾——ETH 持有者、Robinhood 交易者與 EVM 原生社群——同時保留 Solana 根基。",
  "multichain.why.b1": "加密領域首個多鏈社交博弈元宇宙",
  "multichain.why.b2": "更廣受眾——以太坊 + Robinhood 主流觸達",
  "multichain.why.b3": "同一企鵝世界、雙鏈——一個社群",
  "multichain.why.b4": "更多代幣、更多流動性、更多對賭",
  "multichain.why.b5": "Web3 多鏈時代的面向未來架構",
  "multichain.solana.title": "Solana · 現已上線",
  "multichain.solana.desc":
    "我們目前的生產鏈。即時結算、SPL 對賭、Phantom 錢包驗證與完整 WaddleBet 體驗——現在即可在 waddle.bet 遊玩。",
  "multichain.solana.status": "● 主網已上線",
  "multichain.robinhood.status": "● Robinhood Chain 已上線",

  "contract.tokenLabel": "$CP",
  "contract.liveOn": "上線於",
  "contract.platform": "Solana",
  "contract.ethLabel": "$WADDLE（Robinhood Chain）",
  "contract.ethPlatform": "Robinhood Chain",
  "contract.copyEthTitle": "複製 ETH 合約地址",
  "contract.cpw3OriginalLabel": "原始 $CPW3（Solana）— 約 70 萬美元 ATH",
  "contract.copyCpw3Title": "複製原始 $CPW3 鑄幣",
  "contract.note":
    "上方 $WADDLE 為 Robinhood Chain 旗艦平台代幣。Solana 上的 $CP 仍並行上線。下方 $CPW3 鑄幣為原始部署，僅作歷史紀錄。交易前請自行核對合約。",
  "contract.redeployStory":
    "$CP 是在原始 $CPW3 圖表無法再使用後的重新部署。$CPW3 在 X 上無法被標記（tag），幾乎無法被發現與建立社群。在 Solana 上市值曾接近約 70 萬美元 ATH 後，大量拋售使圖表暴露風險：第三方捆綁約 40% 供應量，實質上綁架了圖表。我們以 $CP 重新部署——可在 X 上正確標記的代幣——讓社群與產品能在我們可掌控的圖表上繼續前進。",
  "contract.copyTitle": "複製合約地址",

  "chart.kicker": "歷史紀錄",
  "chart.title": "原始代幣 $CPW3",
  "chart.sub":
    "原始 $CPW3 在 Solana 上曾達約 70 萬美元市值 ATH，證明我們所打造內容的真實需求。$CPW3 在 X 上無法被標記。ATH 後的大幅拋售中，第三方捆綁約 40% 供應量並綁架圖表，促使我們以 $CP 重新部署。",
  "chart.mintLabel": "SPL 鑄幣地址",
  "chart.copyMint": "複製鑄幣地址",

  "economy.tokenSubtitle": "旗艦 $WADDLE（Robinhood EVM）— 與 Solana（$CP）相同功能，雙鏈同步推出",

  "footer.tagline": "無需許可的社交博弈",
  "footer.builtOn": "建置於",
  "footer.chains": "Solana · Robinhood Chain（EVM）",
  "footer.community": "社群",
  "footer.devNoticeTitle": "開發中提醒",
  "footer.disclaimerTitle": "免責聲明",
  "footer.disclaimerBody":
    "WaddleBet 仍積極開發中。本白皮書所述功能、代幣經濟與遊戲機制可能變更。本文非投資建議。參與任何加密專案前請自行研究。",

  "changelog.kicker": "開發日誌",
  "changelog.title": "更新日誌",
  "changelog.lead": "每一行程式、每項功能、每次最佳化皆有記錄。",
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
  "roadmap.lead": "從社交對賭到輕量 MMORPG——等級、採集與 $WADDLE 支撐的循環經濟。公開建置、分階段交付。",
  "roadmap.progressLabel": "開發進度",
  "roadmap.phasesComplete": "階段完成",
  "roadmap.featuresDone": "已完成功能",
  "roadmap.inProgress": "進行中",
  "roadmap.p2pGames": "P2P 遊戲",
  "roadmap.daysBuilding": "開發天數（累計）",
  "roadmap.status.complete": "✓ 已完成",
  "roadmap.status.current": "● 進行中",
  "roadmap.status.next": "◐ 下一步",
  "roadmap.status.planned": "◇ 規劃中",
  "roadmap.mmorpg.kicker": "MMORPG 轉型",
  "roadmap.mmorpg.title": "成長、採集與活躍經濟",
  "roadmap.mmorpg.lead": "在既有玩法上擴展，而非重來。玩家獲得 XP、解鎖區域、森林伐木、冰原釣魚、完成每日／每週挑戰，並參與以 $WADDLE（及 Solana 上的 $CP）支撐的循環經濟。",
  "roadmap.mmorpg.bullet1": "等級門檻——冰原 Lv10、賭場 Lv5、森林 Lv3",
  "roadmap.mmorpg.bullet2": "技能——釣魚、伐木、跑酷提升收益",
  "roadmap.mmorpg.bullet3": "經濟——金幣循環；$WADDLE / $CP 有上限；材料可交易",
  "roadmap.mmorpg.bullet4": "地產——冰屋租賃已上線；更多持有形式依社群需求探索",
  "roadmap.mmorpg.fullDoc": "完整 MMORPG 路線圖見 GitHub",
  "roadmap.mmorpg.fullDocHref": "https://github.com/Tanner253/waddlebet/blob/main/waddlebet/docs/MMORPG_ROADMAP.md",

  "finalCta.title": "準備好搖搖擺擺進場了嗎？",
  "finalCta.sub": "你剛讀到的一切現在都已上線。進入世界、打造你的企鵝，在牌桌前入座。",
  "finalCta.community": "加入社群",
};

const BUNDLES: Record<WhitepaperLocale, Record<string, string>> = {
  en,
  "zh-TW": { ...en, ...zhTW },
};

export function getWhitepaperMessage(locale: WhitepaperLocale, key: string): string {
  return BUNDLES[locale][key] ?? BUNDLES.en[key] ?? key;
}
