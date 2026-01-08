# Euphoria Integration Checklist

> Quick reference for both teams. Full docs: `EUPHORIA_INTEGRATION.md`

---

## 🔑 Shared Secret Setup

```bash
# Generate (run ONCE, share via secure channel)
openssl rand -hex 32
```

| Environment | Variable | Value |
|-------------|----------|-------|
| WaddleBet `.env` | `EUPHORIA_SHARED_SECRET` | `<64 hex chars>` |
| Euphoria `.env` | `WADDLEBET_SHARED_SECRET` | `<same value>` |

---

## ✅ Euphoria Team Checklist

### Files to Create
- [ ] `src/lib/embed/waddlebetBridge.ts` - PostMessage bridge
- [ ] `src/lib/embed/betSigner.ts` - Client-side signing helper
- [ ] `src/app/api/waddlebet/sign/route.ts` - HMAC signing endpoint
- [ ] `src/app/api/waddlebet/verify/route.ts` - Signature verification endpoint

### Files to Modify
- [ ] `src/contexts/WalletContext.tsx` - Embedded mode detection
- [ ] `src/hooks/useGameEngine.ts` - Route bets through bridge
- [ ] `src/components/game/LeftSidebar.tsx` - Exit button + pebbles display
- [ ] `src/lib/game/types.ts` - Add `waddlebetBetId` to Bet type
- [ ] `next.config.ts` - Add CSP frame-ancestors
- [ ] `.env.local` - Add shared secret

### Environment Variables
```env
NEXT_PUBLIC_WADDLEBET_ORIGIN=https://waddle.bet
WADDLEBET_SHARED_SECRET=<shared-secret>
```

### Deployment
- [ ] Deploy to staging
- [ ] Test `/api/waddlebet/sign` returns valid signature
- [ ] Test `/api/waddlebet/verify` validates correctly
- [ ] Deploy to production

---

## ✅ WaddleBet Team Checklist

### Files to Create
- [ ] `server/db/models/EuphoriaBet.js` - Bet tracking model
- [ ] `server/db/models/EuphoriaAuditLog.js` - Audit log model
- [ ] `server/handlers/euphoriaHandlers.js` - WebSocket handlers
- [ ] `src/minigames/EuphoriaGame.jsx` - Frontend component

### Files to Modify
- [ ] `server/db/models/index.js` - Export new models
- [ ] `server/index.js` - Register handlers + orphan cleanup
- [ ] `src/App.jsx` - Add EuphoriaGame rendering
- [ ] `src/buildings/Casino.js` - Add entry point

### Environment Variables
```env
EUPHORIA_ENABLED=true
EUPHORIA_ORIGIN=https://predicteuphoria.com
EUPHORIA_SHARED_SECRET=<shared-secret>
EUPHORIA_MAX_BET=100
EUPHORIA_RATE_LIMIT_PER_MIN=10
EUPHORIA_HOURLY_PAYOUT_CAP=5000
```

### Deployment
- [ ] Deploy database models
- [ ] Deploy handlers
- [ ] Deploy frontend component
- [ ] Test full flow with Euphoria staging
- [ ] Deploy to production

---

## 🔄 Integration Flow

```
1. User enters Casino, clicks Euphoria arcade
2. EuphoriaGame.jsx renders iframe: predicteuphoria.com?embed=waddlebet
3. Euphoria sends: EUPHORIA_READY
4. WaddleBet sends: WADDLEBET_INIT { userId, balance, playerName }
5. User clicks to place bet in Euphoria
6. Euphoria sends: EUPHORIA_BET_REQUEST { amount }
7. WaddleBet server: validates, deducts pebbles, creates EuphoriaBet record
8. WaddleBet sends: WADDLEBET_BET_RESPONSE { success, betId, newBalance }
9. Euphoria runs game (price prediction)
10. Game resolves → Euphoria client calls /api/waddlebet/sign
11. Euphoria sends: EUPHORIA_BET_RESULT { betId, won, payout, signature }
12. WaddleBet server: verifies signature, checks bet record, credits payout
13. WaddleBet sends: euphoria_result_response { success, newBalance }
```

---

## 🛡️ Security Validations

WaddleBet server MUST check before crediting:

| Check | Code |
|-------|------|
| Bet exists | `await EuphoriaBet.findOne({ betId })` |
| Not claimed | `bet.claimed === false` |
| Amount matches | `bet.amount === betAmount` |
| User matches | `bet.odwnUserId === userId` |
| Signature valid | `verifySignature(data, signature)` |
| Timestamp recent | `Date.now() - timestamp < 5 min` |
| Payout sane | `payout <= betAmount * 100` |
| Rate limit | `< 10 bets/min` |
| Payout cap | `< 5000 pebbles/hour` |

---

## 📊 Audit Events

| Event | Severity | When |
|-------|----------|------|
| `BET_REQUESTED` | info | User requests bet |
| `BET_APPROVED` | info | Bet approved, pebbles deducted |
| `BET_REJECTED` | warning | Insufficient balance, rate limit, etc |
| `RESULT_RECEIVED` | info | Got signed result from Euphoria |
| `SIGNATURE_VALID` | info | HMAC verification passed |
| `SIGNATURE_INVALID` | critical | HMAC verification failed |
| `PAYOUT_CREDITED` | info | Pebbles credited for win |
| `BET_EXPIRED` | warning | Orphan bet timed out, refunded |
| `RATE_LIMIT_HIT` | warning | User exceeded rate limit |
| `SUSPICIOUS_ACTIVITY` | critical | Anomaly detected |

---

## 🚨 Alert Thresholds

| Metric | Threshold | Action |
|--------|-----------|--------|
| `SIGNATURE_INVALID` | > 5/hour | Investigate immediately |
| `SUSPICIOUS_ACTIVITY` | Any | Alert on-call |
| Orphan bets | > 10/hour | Check Euphoria stability |
| Error rate | > 5% | Check logs |

---

## 🧪 Test Cases

### Happy Path
1. [ ] Place bet → approved → win → payout credited
2. [ ] Place bet → approved → lose → no payout
3. [ ] Exit button returns to Casino

### Edge Cases
4. [ ] Insufficient balance → rejected with error
5. [ ] Rate limit exceeded → rejected with wait time
6. [ ] Hourly cap exceeded → rejected with message
7. [ ] Bet timeout (5 min) → refunded automatically

### Security
8. [ ] Fake signature → rejected
9. [ ] Replay old signature → "already claimed"
10. [ ] Unknown betId → rejected
11. [ ] Modified payout → signature invalid
12. [ ] Different user → rejected

---

## 📞 Coordination

- **Secret Rotation**: 24h notice, coordinate deployment timing
- **Issues**: Check audit logs first, share relevant entries
- **Staging**: Both staging environments must be up for testing

---

*Quick Reference v1.0 - January 2026*

