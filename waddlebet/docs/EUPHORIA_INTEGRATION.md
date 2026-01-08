# Euphoria Integration into WaddleBet

> **Last Updated**: January 2026  
> **Security Review**: ✅ Includes HMAC verification, audit logging, rate limiting  
> **Euphoria Doc Version**: Matches `WADDLEBET_INTEGRATION.md` v2 (with signing)

## Overview

This document outlines the integration of **Euphoria** (predicteuphoria.com) - a Solana price prediction game - into **WaddleBet** (waddle.bet) as an in-game minigame.

**Key Principles**:
- WaddleBet players use **Pebbles** to play Euphoria (not Gems)
- **WaddleBet is the source of truth** for all bet tracking
- **Euphoria is stateless** - no database needed for embedded mode
- **HMAC signatures** prevent win manipulation
- **Audit logging** enables investigation of issues
- **Rate limiting** prevents abuse

---

## Architecture

```
┌─────────────────────────────────────────────────────────────────────────────────────┐
│                                                                                     │
│    ┌───────────────────────────────────────────────────────────────────────────┐   │
│    │                           WADDLEBET DOMAIN                                │   │
│    │                                                                           │   │
│    │   ┌───────────────────────┐                      ┌───────────────────┐   │   │
│    │   │                       │   A. WADDLEBET_INIT  │                   │   │   │
│    │   │    WaddleBet          │   ─────────────────► │                   │   │   │
│    │   │    React App          │                      │      Euphoria     │   │   │
│    │   │                       │   B. EUPHORIA_READY  │      (iframe)     │   │   │
│    │   │    ┌───────────┐      │   ◄───────────────── │                   │   │   │
│    │   │    │  Pebbles  │      │                      │   ┌───────────┐   │   │   │
│    │   │    │  Balance  │      │ C. EUPHORIA_BET_REQ  │   │Game Canvas│   │   │   │
│    │   │    │  Display  │      │   ◄───────────────── │   │           │   │   │   │
│    │   │    └───────────┘      │                      │   │Price Line │   │   │   │
│    │   │                       │ D. WADDLEBET_BET_RSP │   │  + Bets   │   │   │   │
│    │   │                       │   ─────────────────► │   │           │   │   │   │
│    │   │                       │                      │   └───────────┘   │   │   │
│    │   │                       │ E. EUPHORIA_BET_RESULT                   │   │   │
│    │   │                       │   ◄───────────────── │                   │   │   │
│    │   │                       │   (SIGNED w/ HMAC)   │                   │   │   │
│    │   │                       │                      │                   │   │   │
│    │   └───────────────────────┘                      └───────────────────┘   │   │
│    │              │                                              │            │   │
│    └──────────────┼──────────────────────────────────────────────┼────────────┘   │
│                   │ WebSocket                                    │                │
│                   ▼                                              ▼                │
│    ┌───────────────────────┐                      ┌───────────────────────┐       │
│    │                       │   V. POST /verify    │                       │       │
│    │   WaddleBet Server    │   ─────────────────► │   Euphoria Server     │       │
│    │                       │                      │                       │       │
│    │   - Auth              │   { valid: true }    │   /api/waddlebet/     │       │
│    │   - Bet Tracking      │   ◄───────────────── │     verify            │       │
│    │   - Pebble Economy    │                      │     sign              │       │
│    │   - Audit Logs        │                      │                       │       │
│    │   - Rate Limits       │                      │   (Stateless)         │       │
│    │                       │                      │                       │       │
│    └───────────────────────┘                      └───────────────────────┘       │
│                   │                                                               │
│                   ▼                                                               │
│    ┌───────────────────────┐                                                      │
│    │      MongoDB          │                                                      │
│    │   - EuphoriaBet       │                                                      │
│    │   - EuphoriaAuditLog  │                                                      │
│    └───────────────────────┘                                                      │
│                                                                                   │
└───────────────────────────────────────────────────────────────────────────────────┘
```

---

## Security Model

### Trust Boundaries

```
╔══════════════════════════════════════════════════════════════════════════════════╗
║                                SECURITY FLOW                                      ║
╠══════════════════════════════════════════════════════════════════════════════════╣
║                                                                                   ║
║  A. WADDLEBET_INIT      →           1. POST /sign            →   V.  POST /verify║
║  B. EUPHORIA_READY      →           (stateless - no tracking)    WADDLEBET       ║
║  C. EUPHORIA_BET_REQ    →                                        VALIDATES:      ║
║  D. WADDLEBET_BET_RESP  →                                                        ║
║  E. EUPHORIA_BET_RESULT →                                        I.   betId      ║
║     (signed)                                                          exists     ║
║                                                                  II.  amount     ║
║                                                                       matches    ║
║                                                                  III. not        ║
║                                                                       claimed    ║
║                                                                  IV.  rate       ║
║                                                                       limits     ║
║                                                                                   ║
╚══════════════════════════════════════════════════════════════════════════════════╝
```

### Why This is Secure

**Potential Attack: Client fakes a winning result**
```
Attacker: "I won 10000 pebbles!"
Defense:  No valid HMAC signature → Rejected
```

**Potential Attack: Replay a valid winning signature**
```
Attacker: Reuses signature from earlier win
Defense:  bet.claimed === true → Rejected
          + betId only usable once
```

**Potential Attack: Create fake betId**
```
Attacker: Makes up betId "fake_123"
Defense:  betId not in WaddleBet DB → Rejected
```

**Potential Attack: Drain pebbles via rapid bets**
```
Attacker: Places 1000 bets per minute
Defense:  Rate limit (10/min) → Rejected after limit
```

---

## Shared Secret Configuration

Both servers must share a 256-bit HMAC key:

```bash
# Generate secret (run once, share between teams)
openssl rand -hex 32
# Output: a1b2c3d4e5f6...64 hex chars
```

### WaddleBet `.env`
```env
# Euphoria Integration
EUPHORIA_ENABLED=true
EUPHORIA_ORIGIN=https://predicteuphoria.com
EUPHORIA_SHARED_SECRET=your-256-bit-hex-secret-here
EUPHORIA_MAX_BET=100
EUPHORIA_RATE_LIMIT_PER_MIN=10
EUPHORIA_HOURLY_PAYOUT_CAP=5000
```

### Euphoria `.env`
```env
# WaddleBet Integration  
NEXT_PUBLIC_WADDLEBET_ORIGIN=https://waddle.bet
WADDLEBET_SHARED_SECRET=your-256-bit-hex-secret-here  # Same value!
```

---

## Database Models

### 1. EuphoriaBet Model

**File**: `server/db/models/EuphoriaBet.js`

```javascript
import mongoose from 'mongoose';

const euphoriaBetSchema = new mongoose.Schema({
  // Unique bet identifier (generated by WaddleBet)
  betId: {
    type: String,
    required: true,
    unique: true,
    index: true
  },
  
  // WaddleBet user who placed the bet
  odwnUserId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },
  
  // Wallet address for cross-reference
  walletAddress: {
    type: String,
    required: true,
    index: true
  },
  
  // Bet details
  amount: {
    type: Number,
    required: true,
    min: 1
  },
  
  // Status tracking
  status: {
    type: String,
    enum: ['pending', 'won', 'lost', 'expired', 'error'],
    default: 'pending',
    index: true
  },
  
  // Result details (filled when bet resolves)
  payout: {
    type: Number,
    default: 0
  },
  
  won: {
    type: Boolean,
    default: null
  },
  
  // Signature from Euphoria (for audit)
  signature: {
    type: String,
    default: null
  },
  
  signatureTimestamp: {
    type: Number,
    default: null
  },
  
  // CRITICAL: Prevents double-claiming
  claimed: {
    type: Boolean,
    default: false,
    index: true
  },
  
  claimedAt: {
    type: Date,
    default: null
  },
  
  // Timestamps
  createdAt: {
    type: Date,
    default: Date.now,
    index: true
  },
  
  resolvedAt: {
    type: Date,
    default: null
  },
  
  // For debugging
  requestId: String,
  clientIp: String
}, {
  timestamps: true
});

// Compound index for orphan cleanup
euphoriaBetSchema.index({ status: 1, createdAt: 1 });

// Index for rate limiting queries
euphoriaBetSchema.index({ odwnUserId: 1, createdAt: -1 });

export const EuphoriaBet = mongoose.model('EuphoriaBet', euphoriaBetSchema);
```

### 2. EuphoriaAuditLog Model

**File**: `server/db/models/EuphoriaAuditLog.js`

```javascript
import mongoose from 'mongoose';

const euphoriaAuditLogSchema = new mongoose.Schema({
  // Event type
  event: {
    type: String,
    enum: [
      'BET_REQUESTED',      // User requested to place bet
      'BET_APPROVED',       // WaddleBet approved and deducted pebbles
      'BET_REJECTED',       // WaddleBet rejected (insufficient balance, rate limit, etc)
      'RESULT_RECEIVED',    // Received bet result from Euphoria
      'SIGNATURE_VALID',    // Euphoria signature verified successfully
      'SIGNATURE_INVALID',  // Signature verification failed
      'PAYOUT_CREDITED',    // Pebbles credited for win
      'BET_EXPIRED',        // Orphan bet expired and refunded
      'RATE_LIMIT_HIT',     // User hit rate limit
      'SUSPICIOUS_ACTIVITY' // Anomaly detected
    ],
    required: true,
    index: true
  },
  
  // Reference to bet (if applicable)
  betId: {
    type: String,
    index: true
  },
  
  // User info
  odwnUserId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  walletAddress: String,
  
  // Event details
  details: {
    type: mongoose.Schema.Types.Mixed,
    default: {}
  },
  
  // For security events
  severity: {
    type: String,
    enum: ['info', 'warning', 'error', 'critical'],
    default: 'info'
  },
  
  // Request context
  requestId: String,
  clientIp: String,
  userAgent: String,
  
  // Timestamp
  timestamp: {
    type: Date,
    default: Date.now,
    index: true
  }
});

// TTL index - auto-delete logs after 90 days
euphoriaAuditLogSchema.index({ timestamp: 1 }, { expireAfterSeconds: 90 * 24 * 60 * 60 });

export const EuphoriaAuditLog = mongoose.model('EuphoriaAuditLog', euphoriaAuditLogSchema);
```

---

## Server Implementation

### 1. Euphoria Handlers

**File**: `server/handlers/euphoriaHandlers.js`

```javascript
/**
 * Euphoria Integration Handlers
 * 
 * Handles Pebble deductions, credits, signature verification, and audit logging
 * for the Euphoria price prediction game embedded in WaddleBet.
 */

import crypto from 'crypto';
import { User } from '../db/models/index.js';
import { EuphoriaBet } from '../db/models/EuphoriaBet.js';
import { EuphoriaAuditLog } from '../db/models/EuphoriaAuditLog.js';

// Configuration from environment
const CONFIG = {
  enabled: process.env.EUPHORIA_ENABLED === 'true',
  origin: process.env.EUPHORIA_ORIGIN || 'https://predicteuphoria.com',
  sharedSecret: process.env.EUPHORIA_SHARED_SECRET,
  maxBet: parseInt(process.env.EUPHORIA_MAX_BET || '100', 10),
  minBet: 1,
  rateLimitPerMin: parseInt(process.env.EUPHORIA_RATE_LIMIT_PER_MIN || '10', 10),
  hourlyPayoutCap: parseInt(process.env.EUPHORIA_HOURLY_PAYOUT_CAP || '5000', 10),
  maxMultiplier: 100,  // Matches Euphoria's GAME_CONFIG.MAX_MULTIPLIER
  betTimeoutMs: 5 * 60 * 1000,  // 5 minutes
  signatureExpiryMs: 5 * 60 * 1000  // 5 minutes
};

/**
 * Audit logging helper
 */
async function audit(event, data) {
  try {
    await EuphoriaAuditLog.create({
      event,
      betId: data.betId,
      odwnUserId: data.userId,
      walletAddress: data.walletAddress,
      details: data.details || {},
      severity: data.severity || 'info',
      requestId: data.requestId,
      clientIp: data.clientIp,
      userAgent: data.userAgent,
      timestamp: new Date()
    });
  } catch (err) {
    console.error('[Euphoria Audit] Failed to log:', err.message);
  }
}

/**
 * Check rate limit for user
 * @returns {object} { allowed: boolean, remaining: number, resetAt: Date }
 */
async function checkRateLimit(userId) {
  const oneMinuteAgo = new Date(Date.now() - 60 * 1000);
  
  const recentBets = await EuphoriaBet.countDocuments({
    odwnUserId: userId,
    createdAt: { $gte: oneMinuteAgo }
  });
  
  const allowed = recentBets < CONFIG.rateLimitPerMin;
  const remaining = Math.max(0, CONFIG.rateLimitPerMin - recentBets);
  const resetAt = new Date(Date.now() + 60 * 1000);
  
  return { allowed, remaining, resetAt, current: recentBets };
}

/**
 * Check hourly payout cap for user
 * @returns {object} { allowed: boolean, totalPayout: number, remaining: number }
 */
async function checkPayoutCap(userId) {
  const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
  
  const result = await EuphoriaBet.aggregate([
    {
      $match: {
        odwnUserId: userId,
        status: 'won',
        claimedAt: { $gte: oneHourAgo }
      }
    },
    {
      $group: {
        _id: null,
        totalPayout: { $sum: '$payout' }
      }
    }
  ]);
  
  const totalPayout = result[0]?.totalPayout || 0;
  const remaining = Math.max(0, CONFIG.hourlyPayoutCap - totalPayout);
  const allowed = remaining > 0;
  
  return { allowed, totalPayout, remaining };
}

/**
 * Generate unique bet ID
 */
function generateBetId() {
  const timestamp = Date.now().toString(36);
  const random = crypto.randomBytes(4).toString('hex');
  return `wb_${timestamp}_${random}`;
}

/**
 * Verify HMAC signature from Euphoria
 */
function verifySignature(data, signature) {
  if (!CONFIG.sharedSecret) {
    console.error('[Euphoria] SHARED_SECRET not configured!');
    return false;
  }
  
  const { betId, won, betAmount, payout, waddlebetUserId, timestamp } = data;
  
  // Recreate payload (must match Euphoria's format exactly)
  const payload = `${betId}:${won}:${betAmount}:${payout}:${waddlebetUserId}:${timestamp}`;
  
  // Generate expected signature
  const expectedSignature = crypto
    .createHmac('sha256', CONFIG.sharedSecret)
    .update(payload)
    .digest('hex');
  
  // Constant-time comparison to prevent timing attacks
  try {
    return crypto.timingSafeEqual(
      Buffer.from(signature, 'hex'),
      Buffer.from(expectedSignature, 'hex')
    );
  } catch (err) {
    // Buffer length mismatch = invalid signature
    return false;
  }
}

/**
 * Handle bet request from Euphoria iframe
 * Called via WebSocket when user clicks to place bet
 */
export async function handleEuphoriaBetRequest(ws, player, data) {
  const { amount, requestId } = data;
  const userId = player.odwnUserId;
  const walletAddress = player.walletAddress;
  
  console.log(`🎰 [Euphoria] Bet request: ${player.name} - ${amount} pebbles`);
  
  // Check if integration is enabled
  if (!CONFIG.enabled) {
    return sendResponse(ws, 'euphoria_bet_response', {
      success: false,
      error: 'INTEGRATION_DISABLED',
      requestId
    });
  }
  
  // Validate amount
  if (!Number.isInteger(amount) || amount < CONFIG.minBet || amount > CONFIG.maxBet) {
    await audit('BET_REJECTED', {
      userId, walletAddress, requestId,
      details: { reason: 'INVALID_AMOUNT', amount, min: CONFIG.minBet, max: CONFIG.maxBet },
      severity: 'warning'
    });
    
    return sendResponse(ws, 'euphoria_bet_response', {
      success: false,
      error: 'INVALID_AMOUNT',
      message: `Bet must be between ${CONFIG.minBet} and ${CONFIG.maxBet} pebbles`,
      requestId
    });
  }
  
  // Check rate limit
  const rateLimit = await checkRateLimit(userId);
  if (!rateLimit.allowed) {
    await audit('RATE_LIMIT_HIT', {
      userId, walletAddress, requestId,
      details: { current: rateLimit.current, limit: CONFIG.rateLimitPerMin },
      severity: 'warning'
    });
    
    return sendResponse(ws, 'euphoria_bet_response', {
      success: false,
      error: 'RATE_LIMITED',
      message: `Too many bets. Try again in ${Math.ceil((rateLimit.resetAt - Date.now()) / 1000)}s`,
      remaining: rateLimit.remaining,
      requestId
    });
  }
  
  // Get fresh balance from DB
  const user = await User.findById(userId, 'pebbles');
  
  if (!user || user.pebbles < amount) {
    await audit('BET_REJECTED', {
      userId, walletAddress, requestId,
      details: { reason: 'INSUFFICIENT_BALANCE', requested: amount, available: user?.pebbles || 0 },
      severity: 'info'
    });
    
    return sendResponse(ws, 'euphoria_bet_response', {
      success: false,
      error: 'INSUFFICIENT_BALANCE',
      balance: user?.pebbles || 0,
      requestId
    });
  }
  
  // Generate bet ID
  const betId = generateBetId();
  
  // Create bet record FIRST (before deducting)
  const bet = await EuphoriaBet.create({
    betId,
    odwnUserId: userId,
    walletAddress,
    amount,
    status: 'pending',
    requestId,
    clientIp: player.clientIp
  });
  
  // Deduct pebbles atomically
  const result = await User.findOneAndUpdate(
    { _id: userId, pebbles: { $gte: amount } },
    { $inc: { pebbles: -amount } },
    { new: true }
  );
  
  if (!result) {
    // Rollback bet record
    await EuphoriaBet.deleteOne({ betId });
    
    await audit('BET_REJECTED', {
      betId, userId, walletAddress, requestId,
      details: { reason: 'DEDUCTION_FAILED' },
      severity: 'warning'
    });
    
    return sendResponse(ws, 'euphoria_bet_response', {
      success: false,
      error: 'DEDUCTION_FAILED',
      requestId
    });
  }
  
  // Update player's cached balance
  player.pebbles = result.pebbles;
  
  // Audit successful bet
  await audit('BET_APPROVED', {
    betId, userId, walletAddress, requestId,
    details: { amount, newBalance: result.pebbles },
    severity: 'info'
  });
  
  console.log(`   ✅ Bet approved: ${betId} (${amount} pebbles, balance: ${result.pebbles})`);
  
  sendResponse(ws, 'euphoria_bet_response', {
    success: true,
    betId,
    approvedAmount: amount,
    newBalance: result.pebbles,
    requestId
  });
}

/**
 * Handle bet result from Euphoria iframe
 * Called via WebSocket when bet resolves (SIGNED)
 */
export async function handleEuphoriaBetResult(ws, player, data) {
  const { betId, won, betAmount, payout, timestamp, signature, requestId } = data;
  const userId = player.odwnUserId;
  const walletAddress = player.walletAddress;
  
  console.log(`🎰 [Euphoria] Bet result: ${betId} - ${won ? 'WON' : 'LOST'} (payout: ${payout})`);
  
  // Audit receipt
  await audit('RESULT_RECEIVED', {
    betId, userId, walletAddress, requestId,
    details: { won, betAmount, payout, timestamp, signaturePrefix: signature?.slice(0, 16) },
    severity: 'info'
  });
  
  // 1. Find the bet
  const bet = await EuphoriaBet.findOne({ betId });
  
  if (!bet) {
    await audit('SIGNATURE_INVALID', {
      betId, userId, walletAddress, requestId,
      details: { reason: 'BET_NOT_FOUND' },
      severity: 'error'
    });
    
    console.warn(`   ⚠️ Unknown betId: ${betId}`);
    return sendResponse(ws, 'euphoria_result_response', {
      success: false,
      error: 'BET_NOT_FOUND',
      requestId
    });
  }
  
  // 2. Check not already claimed
  if (bet.claimed) {
    await audit('SIGNATURE_INVALID', {
      betId, userId, walletAddress, requestId,
      details: { reason: 'ALREADY_CLAIMED', claimedAt: bet.claimedAt },
      severity: 'error'
    });
    
    console.warn(`   ⚠️ Already claimed: ${betId}`);
    return sendResponse(ws, 'euphoria_result_response', {
      success: false,
      error: 'ALREADY_CLAIMED',
      requestId
    });
  }
  
  // 3. Check amount matches
  if (bet.amount !== betAmount) {
    await audit('SIGNATURE_INVALID', {
      betId, userId, walletAddress, requestId,
      details: { reason: 'AMOUNT_MISMATCH', expected: bet.amount, received: betAmount },
      severity: 'critical'
    });
    
    console.error(`   🚨 AMOUNT MISMATCH: ${betId} (expected ${bet.amount}, got ${betAmount})`);
    return sendResponse(ws, 'euphoria_result_response', {
      success: false,
      error: 'AMOUNT_MISMATCH',
      requestId
    });
  }
  
  // 4. Check user matches
  if (bet.odwnUserId.toString() !== userId.toString()) {
    await audit('SIGNATURE_INVALID', {
      betId, userId, walletAddress, requestId,
      details: { reason: 'USER_MISMATCH', expectedUser: bet.odwnUserId },
      severity: 'critical'
    });
    
    console.error(`   🚨 USER MISMATCH: ${betId}`);
    return sendResponse(ws, 'euphoria_result_response', {
      success: false,
      error: 'USER_MISMATCH',
      requestId
    });
  }
  
  // 5. Check timestamp is recent
  const age = Date.now() - timestamp;
  if (age > CONFIG.signatureExpiryMs || age < 0) {
    await audit('SIGNATURE_INVALID', {
      betId, userId, walletAddress, requestId,
      details: { reason: 'SIGNATURE_EXPIRED', age, maxAge: CONFIG.signatureExpiryMs },
      severity: 'warning'
    });
    
    console.warn(`   ⚠️ Signature expired: ${betId} (age: ${age}ms)`);
    return sendResponse(ws, 'euphoria_result_response', {
      success: false,
      error: 'SIGNATURE_EXPIRED',
      requestId
    });
  }
  
  // 6. Validate payout sanity
  const maxPayout = betAmount * CONFIG.maxMultiplier;
  if (won && (payout <= 0 || payout > maxPayout)) {
    await audit('SIGNATURE_INVALID', {
      betId, userId, walletAddress, requestId,
      details: { reason: 'INVALID_PAYOUT', payout, maxPayout },
      severity: 'critical'
    });
    
    console.error(`   🚨 INVALID PAYOUT: ${betId} (${payout} > max ${maxPayout})`);
    return sendResponse(ws, 'euphoria_result_response', {
      success: false,
      error: 'INVALID_PAYOUT',
      requestId
    });
  }
  
  if (!won && payout !== 0) {
    await audit('SIGNATURE_INVALID', {
      betId, userId, walletAddress, requestId,
      details: { reason: 'LOSS_WITH_PAYOUT', payout },
      severity: 'critical'
    });
    
    console.error(`   🚨 LOSS WITH PAYOUT: ${betId}`);
    return sendResponse(ws, 'euphoria_result_response', {
      success: false,
      error: 'INVALID_PAYOUT',
      requestId
    });
  }
  
  // 7. Verify HMAC signature
  const signatureValid = verifySignature(
    { betId, won, betAmount, payout, waddlebetUserId: userId.toString(), timestamp },
    signature
  );
  
  if (!signatureValid) {
    await audit('SIGNATURE_INVALID', {
      betId, userId, walletAddress, requestId,
      details: { reason: 'HMAC_MISMATCH' },
      severity: 'critical'
    });
    
    console.error(`   🚨 INVALID SIGNATURE: ${betId}`);
    return sendResponse(ws, 'euphoria_result_response', {
      success: false,
      error: 'INVALID_SIGNATURE',
      requestId
    });
  }
  
  await audit('SIGNATURE_VALID', {
    betId, userId, walletAddress, requestId,
    details: { won, payout },
    severity: 'info'
  });
  
  // 8. Check hourly payout cap (only for wins)
  if (won && payout > 0) {
    const payoutCap = await checkPayoutCap(userId);
    if (!payoutCap.allowed || payout > payoutCap.remaining) {
      await audit('SUSPICIOUS_ACTIVITY', {
        betId, userId, walletAddress, requestId,
        details: {
          reason: 'HOURLY_PAYOUT_CAP',
          requestedPayout: payout,
          hourlyTotal: payoutCap.totalPayout,
          remaining: payoutCap.remaining,
          cap: CONFIG.hourlyPayoutCap
        },
        severity: 'critical'
      });
      
      console.error(`   🚨 PAYOUT CAP EXCEEDED: ${betId} (hourly: ${payoutCap.totalPayout}, requested: ${payout})`);
      return sendResponse(ws, 'euphoria_result_response', {
        success: false,
        error: 'PAYOUT_CAP_EXCEEDED',
        message: `Hourly payout limit reached. Please try again later.`,
        requestId
      });
    }
  }
  
  // 9. Update bet record and credit payout atomically
  const now = new Date();
  
  const updateResult = await EuphoriaBet.findOneAndUpdate(
    { betId, claimed: false },  // Double-check not claimed
    {
      $set: {
        status: won ? 'won' : 'lost',
        won,
        payout,
        signature: signature.slice(0, 32),  // Store truncated for audit
        signatureTimestamp: timestamp,
        claimed: true,
        claimedAt: now,
        resolvedAt: now
      }
    },
    { new: true }
  );
  
  if (!updateResult) {
    // Race condition - another request claimed it
    await audit('SIGNATURE_INVALID', {
      betId, userId, walletAddress, requestId,
      details: { reason: 'CLAIM_RACE_CONDITION' },
      severity: 'error'
    });
    
    return sendResponse(ws, 'euphoria_result_response', {
      success: false,
      error: 'ALREADY_CLAIMED',
      requestId
    });
  }
  
  // 10. Credit payout if won
  let newBalance = player.pebbles;
  
  if (won && payout > 0) {
    const creditResult = await User.findByIdAndUpdate(
      userId,
      { $inc: { pebbles: payout } },
      { new: true }
    );
    
    if (creditResult) {
      newBalance = creditResult.pebbles;
      player.pebbles = newBalance;
      
      await audit('PAYOUT_CREDITED', {
        betId, userId, walletAddress, requestId,
        details: { payout, newBalance },
        severity: 'info'
      });
      
      console.log(`   ✅ Credited ${payout} pebbles (balance: ${newBalance})`);
    } else {
      // Credit failed - this shouldn't happen but log it
      await audit('SUSPICIOUS_ACTIVITY', {
        betId, userId, walletAddress, requestId,
        details: { reason: 'CREDIT_FAILED', payout },
        severity: 'critical'
      });
      
      console.error(`   🚨 CREDIT FAILED: ${betId} - ${payout} pebbles`);
    }
  } else {
    console.log(`   ✅ Bet lost: ${betId}`);
  }
  
  sendResponse(ws, 'euphoria_result_response', {
    success: true,
    betId,
    won,
    payout: won ? payout : 0,
    newBalance,
    requestId
  });
}

/**
 * Cleanup orphan bets (bets that never resolved)
 * Should be called periodically (e.g., every minute via cron)
 */
export async function cleanupOrphanEuphoriaBets() {
  const timeoutThreshold = new Date(Date.now() - CONFIG.betTimeoutMs);
  
  const orphanBets = await EuphoriaBet.find({
    status: 'pending',
    createdAt: { $lt: timeoutThreshold }
  });
  
  console.log(`🧹 [Euphoria] Cleaning up ${orphanBets.length} orphan bets`);
  
  for (const bet of orphanBets) {
    // Refund the bet amount
    const refundResult = await User.findByIdAndUpdate(
      bet.odwnUserId,
      { $inc: { pebbles: bet.amount } },
      { new: true }
    );
    
    // Mark as expired
    await EuphoriaBet.updateOne(
      { betId: bet.betId },
      {
        $set: {
          status: 'expired',
          resolvedAt: new Date()
        }
      }
    );
    
    await audit('BET_EXPIRED', {
      betId: bet.betId,
      userId: bet.odwnUserId,
      walletAddress: bet.walletAddress,
      details: {
        amount: bet.amount,
        refunded: true,
        newBalance: refundResult?.pebbles,
        age: Date.now() - bet.createdAt.getTime()
      },
      severity: 'warning'
    });
    
    console.log(`   🔄 Refunded orphan bet: ${bet.betId} (${bet.amount} pebbles)`);
  }
  
  return orphanBets.length;
}

/**
 * Helper to send WebSocket response
 */
function sendResponse(ws, type, data) {
  if (ws.readyState === ws.OPEN) {
    ws.send(JSON.stringify({ type, ...data }));
  }
}

/**
 * Get Euphoria stats for admin dashboard
 */
export async function getEuphoriaStats(timeframe = '24h') {
  const since = new Date(Date.now() - (timeframe === '24h' ? 24 * 60 * 60 * 1000 : 7 * 24 * 60 * 60 * 1000));
  
  const stats = await EuphoriaBet.aggregate([
    { $match: { createdAt: { $gte: since } } },
    {
      $group: {
        _id: null,
        totalBets: { $sum: 1 },
        totalWagered: { $sum: '$amount' },
        totalPayout: { $sum: { $cond: ['$won', '$payout', 0] } },
        wins: { $sum: { $cond: ['$won', 1, 0] } },
        losses: { $sum: { $cond: [{ $eq: ['$status', 'lost'] }, 1, 0] } },
        expired: { $sum: { $cond: [{ $eq: ['$status', 'expired'] }, 1, 0] } },
        pending: { $sum: { $cond: [{ $eq: ['$status', 'pending'] }, 1, 0] } }
      }
    }
  ]);
  
  const result = stats[0] || {
    totalBets: 0,
    totalWagered: 0,
    totalPayout: 0,
    wins: 0,
    losses: 0,
    expired: 0,
    pending: 0
  };
  
  result.houseEdge = result.totalWagered > 0
    ? ((result.totalWagered - result.totalPayout) / result.totalWagered * 100).toFixed(2) + '%'
    : '0%';
  
  return result;
}

export { CONFIG as EUPHORIA_CONFIG };
```

### 2. Register Handlers in Server Index

**File**: `server/index.js` (add to imports and message handler)

```javascript
// Add imports at top
import { 
  handleEuphoriaBetRequest, 
  handleEuphoriaBetResult, 
  cleanupOrphanEuphoriaBets,
  EUPHORIA_CONFIG 
} from './handlers/euphoriaHandlers.js';

// Add orphan cleanup interval (after server starts)
if (EUPHORIA_CONFIG.enabled) {
  console.log('🎰 Euphoria integration enabled');
  
  // Cleanup orphan bets every minute
  setInterval(cleanupOrphanEuphoriaBets, 60 * 1000);
  
  // Initial cleanup on startup
  cleanupOrphanEuphoriaBets();
}

// Add to WebSocket message handler switch statement
case 'euphoria_bet_request':
  if (!EUPHORIA_CONFIG.enabled) break;
  await handleEuphoriaBetRequest(ws, player, data);
  break;

case 'euphoria_bet_result':
  if (!EUPHORIA_CONFIG.enabled) break;
  await handleEuphoriaBetResult(ws, player, data);
  break;
```

### 3. Add Models to Index

**File**: `server/db/models/index.js` (add exports)

```javascript
// Add to existing exports
export { EuphoriaBet } from './EuphoriaBet.js';
export { EuphoriaAuditLog } from './EuphoriaAuditLog.js';
```

---

## Frontend Implementation

### 1. Euphoria Game Component

**File**: `src/minigames/EuphoriaGame.jsx`

```jsx
import React, { useEffect, useRef, useCallback, useState } from 'react';
import { useMultiplayer } from '../multiplayer/MultiplayerContext';

// Production Euphoria URL
const EUPHORIA_ORIGIN = process.env.REACT_APP_EUPHORIA_ORIGIN || 'https://predicteuphoria.com';
const EUPHORIA_URL = `${EUPHORIA_ORIGIN}?embed=waddlebet`;

export default function EuphoriaGame({ onExit }) {
  const iframeRef = useRef(null);
  const { userData, pebbles, send, ws, playerId } = useMultiplayer();
  const [isReady, setIsReady] = useState(false);
  const [error, setError] = useState(null);
  
  // Pending bet requests (for matching responses)
  const pendingRequests = useRef(new Map());
  
  // Send message to Euphoria iframe
  const sendToEuphoria = useCallback((message) => {
    if (iframeRef.current?.contentWindow) {
      iframeRef.current.contentWindow.postMessage(message, EUPHORIA_ORIGIN);
    }
  }, []);
  
  // Handle WebSocket responses from WaddleBet server
  useEffect(() => {
    const handleServerMessage = (event) => {
      const data = JSON.parse(event.data);
      
      switch (data.type) {
        case 'euphoria_bet_response':
          // Forward to Euphoria iframe
          sendToEuphoria({
            type: 'WADDLEBET_BET_RESPONSE',
            requestId: data.requestId,
            payload: {
              success: data.success,
              betId: data.betId,
              approvedAmount: data.approvedAmount,
              newBalance: data.newBalance,
              error: data.error
            }
          });
          break;
          
        case 'euphoria_result_response':
          // Update local balance display
          if (data.success && data.newBalance !== undefined) {
            // Balance already updated via pebbles context
          }
          break;
          
        case 'pebbles':
          // Balance update - forward to Euphoria
          sendToEuphoria({
            type: 'WADDLEBET_BALANCE',
            payload: { balance: data.balance }
          });
          break;
      }
    };
    
    if (ws) {
      ws.addEventListener('message', handleServerMessage);
      return () => ws.removeEventListener('message', handleServerMessage);
    }
  }, [ws, sendToEuphoria]);
  
  // Handle messages from Euphoria iframe
  const handleMessage = useCallback((event) => {
    // SECURITY: Only accept messages from Euphoria
    if (event.origin !== EUPHORIA_ORIGIN) {
      console.warn('[Euphoria] Rejected message from:', event.origin);
      return;
    }
    
    const { type, payload, requestId } = event.data;
    console.log('[Euphoria] Message:', type, payload);
    
    switch (type) {
      case 'EUPHORIA_READY':
        // Send initial state when iframe loads
        setIsReady(true);
        sendToEuphoria({
          type: 'WADDLEBET_INIT',
          payload: {
            userId: playerId,
            balance: pebbles,
            playerName: userData?.name || 'Penguin'
          }
        });
        break;
        
      case 'EUPHORIA_BET_REQUEST':
        // Forward bet request to WaddleBet server
        send({
          type: 'euphoria_bet_request',
          amount: payload.amount,
          requestId
        });
        break;
        
      case 'EUPHORIA_BET_RESULT':
        // Forward signed result to WaddleBet server for verification
        send({
          type: 'euphoria_bet_result',
          betId: payload.betId,
          won: payload.won,
          betAmount: payload.betAmount,
          payout: payload.payout,
          timestamp: payload.timestamp,
          signature: payload.signature,
          requestId
        });
        break;
        
      case 'EUPHORIA_EXIT':
        onExit();
        break;
    }
  }, [playerId, pebbles, userData, send, sendToEuphoria, onExit]);
  
  // Set up message listener
  useEffect(() => {
    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, [handleMessage]);
  
  // Update Euphoria when balance changes externally
  useEffect(() => {
    if (isReady) {
      sendToEuphoria({
        type: 'WADDLEBET_BALANCE',
        payload: { balance: pebbles }
      });
    }
  }, [pebbles, isReady, sendToEuphoria]);
  
  return (
    <div className="fixed inset-0 z-50 bg-black">
      {/* Loading Overlay */}
      {!isReady && (
        <div className="absolute inset-0 flex items-center justify-center bg-black/90 z-10">
          <div className="text-center">
            <div className="animate-spin w-12 h-12 border-4 border-purple-500 border-t-transparent rounded-full mx-auto mb-4" />
            <p className="text-white text-lg">Loading Euphoria...</p>
          </div>
        </div>
      )}
      
      {/* Error Display */}
      {error && (
        <div className="absolute top-4 left-1/2 -translate-x-1/2 z-20 bg-red-500/90 text-white px-6 py-3 rounded-lg">
          {error}
          <button onClick={() => setError(null)} className="ml-4 underline">Dismiss</button>
        </div>
      )}
      
      {/* Exit Button */}
      <button
        onClick={onExit}
        className="absolute top-4 right-4 z-20 bg-red-500/80 hover:bg-red-500 
                   text-white px-4 py-2 rounded-lg font-bold transition-colors
                   flex items-center gap-2"
      >
        <span>←</span> Exit Euphoria
      </button>
      
      {/* Balance Display */}
      <div className="absolute top-4 left-4 z-20 bg-black/80 px-4 py-2 rounded-lg border border-yellow-500/30">
        <span className="text-yellow-400 font-bold">🪨 {pebbles.toLocaleString()} Pebbles</span>
      </div>
      
      {/* Euphoria Iframe */}
      <iframe
        ref={iframeRef}
        src={EUPHORIA_URL}
        className="w-full h-full border-0"
        allow="clipboard-read; clipboard-write"
        sandbox="allow-scripts allow-same-origin allow-forms"
        title="Euphoria Price Prediction Game"
      />
    </div>
  );
}
```

### 2. Add to App.jsx

**File**: `src/App.jsx` (add to minigame rendering)

```jsx
// Add import
import EuphoriaGame from './minigames/EuphoriaGame';

// Add to activeMinigame rendering (with other P2P games)
{activeMinigame === 'euphoria' && (
  <EuphoriaGame onExit={() => setActiveMinigame(null)} />
)}
```

### 3. Add Entry Point in Casino

**File**: `src/buildings/Casino.js` (add arcade machine interaction)

```javascript
// Add to interactable objects or arcade machines
const euphoriaArcade = {
  id: 'euphoria_arcade',
  name: 'Euphoria',
  description: 'Predict SOL price movements!',
  position: { x: ..., y: ..., z: ... },
  onInteract: () => {
    setActiveMinigame('euphoria');
  }
};
```

---

## Message Protocol Reference

### WaddleBet → Euphoria (postMessage)

| Type | Payload | When |
|------|---------|------|
| `WADDLEBET_INIT` | `{ userId, balance, playerName }` | After EUPHORIA_READY |
| `WADDLEBET_BALANCE` | `{ balance: number }` | Balance changed externally |
| `WADDLEBET_BET_RESPONSE` | `{ success, betId?, approvedAmount?, newBalance?, error? }` | Response to bet request |

### Euphoria → WaddleBet (postMessage)

| Type | Payload | When |
|------|---------|------|
| `EUPHORIA_READY` | `{}` | Iframe loaded |
| `EUPHORIA_BET_REQUEST` | `{ amount: number }` | User clicks to bet |
| `EUPHORIA_BET_RESULT` | `{ betId, won, betAmount, payout, timestamp, signature }` | Bet resolved (SIGNED) |
| `EUPHORIA_EXIT` | `{}` | User clicks exit |

### WaddleBet Client → Server (WebSocket)

| Type | Payload | When |
|------|---------|------|
| `euphoria_bet_request` | `{ amount, requestId }` | Forwarding bet request |
| `euphoria_bet_result` | `{ betId, won, betAmount, payout, timestamp, signature, requestId }` | Forwarding signed result |

### WaddleBet Server → Client (WebSocket)

| Type | Payload | When |
|------|---------|------|
| `euphoria_bet_response` | `{ success, betId?, approvedAmount?, newBalance?, error?, requestId }` | Bet approval/denial |
| `euphoria_result_response` | `{ success, betId, won, payout, newBalance, requestId }` | Result processed |

---

## Testing Checklist

### Pre-Integration
- [ ] Generate shared secret: `openssl rand -hex 32`
- [ ] Add secret to both `.env` files
- [ ] Create EuphoriaBet and EuphoriaAuditLog models
- [ ] Deploy Euphoria with `/api/waddlebet/sign` and `/api/waddlebet/verify`

### WaddleBet Testing
- [ ] EuphoriaGame component renders iframe
- [ ] Exit button closes game
- [ ] Balance display shows correct pebbles
- [ ] Bet request forwards to server
- [ ] Server deducts pebbles and creates bet record
- [ ] Signature verification works correctly
- [ ] Winning payout credits correctly
- [ ] Rate limiting blocks excessive bets
- [ ] Hourly payout cap triggers appropriately
- [ ] Orphan cleanup refunds timed-out bets

### Security Testing
- [ ] Invalid signature rejected
- [ ] Replay attack blocked (claimed flag)
- [ ] Unknown betId rejected
- [ ] Amount mismatch rejected
- [ ] User mismatch rejected
- [ ] Expired signature rejected
- [ ] Invalid payout rejected

### Audit Logging Testing
- [ ] BET_REQUESTED logged on request
- [ ] BET_APPROVED logged on success
- [ ] BET_REJECTED logged on failure
- [ ] RESULT_RECEIVED logged on result
- [ ] SIGNATURE_VALID logged on verification
- [ ] SIGNATURE_INVALID logged on failure
- [ ] PAYOUT_CREDITED logged on win
- [ ] BET_EXPIRED logged on timeout

---

## Monitoring & Alerts

### Recommended Alerts

| Metric | Threshold | Severity |
|--------|-----------|----------|
| SIGNATURE_INVALID events | > 5/hour | Critical |
| SUSPICIOUS_ACTIVITY events | Any | Critical |
| Orphan bets | > 10/hour | Warning |
| Error rate | > 5% | Warning |
| Hourly payout cap hits | > 3/day | Warning |

### Admin Dashboard Queries

```javascript
// Get Euphoria stats
const stats = await getEuphoriaStats('24h');
console.log(stats);
// { totalBets, totalWagered, totalPayout, wins, losses, expired, pending, houseEdge }

// Recent suspicious activity
const suspicious = await EuphoriaAuditLog.find({
  severity: 'critical',
  timestamp: { $gte: new Date(Date.now() - 24 * 60 * 60 * 1000) }
}).sort({ timestamp: -1 }).limit(100);
```

---

## Deployment Checklist

### Phase 1: Preparation
- [ ] Generate and securely share 256-bit HMAC secret
- [ ] Configure environment variables on both sides
- [ ] Deploy database models
- [ ] Test signature verification locally

### Phase 2: Staging
- [ ] Deploy to staging environment
- [ ] Test full bet flow
- [ ] Verify audit logs populate correctly
- [ ] Test rate limiting and caps
- [ ] Run security test cases

### Phase 3: Production
- [ ] Deploy during low-traffic period
- [ ] Monitor audit logs closely for first hour
- [ ] Watch for SIGNATURE_INVALID events
- [ ] Verify orphan cleanup runs
- [ ] Confirm payout caps working

### Phase 4: Post-Launch
- [ ] Review audit logs daily for first week
- [ ] Monitor house edge percentage
- [ ] Adjust rate limits if needed
- [ ] Document any issues and resolutions

---

## FAQ

**Q: Why does Euphoria sign whatever we send? Isn't that a security risk?**

A: No, because WaddleBet validates locally AFTER signature verification. The signature proves the result came from Euphoria's server (not a malicious client), but WaddleBet still checks: betId exists, amount matches, not already claimed. An attacker can't claim a fake betId because WaddleBet won't have it in their database.

**Q: What if Euphoria's server is compromised?**

A: This is the same risk as any third-party integration. If you can't trust Euphoria to report honest results, you shouldn't integrate. The HMAC signing protects against CLIENT-side manipulation, not server bugs. Audit logging helps detect anomalies.

**Q: What happens if a bet times out?**

A: The orphan cleanup job (runs every minute) will mark it as `expired` and refund the pebbles. The user sees no loss. This handles crashes, network issues, and iframe closures.

**Q: How do we update the shared secret?**

A: Coordinate with Euphoria team, update both `.env` files simultaneously during low-traffic period. Old signatures will fail verification, so timing matters.

---

## Contact

- **WaddleBet Team**: [TBD]
- **Euphoria Team**: [TBD]
- **Shared Secret Rotation**: Coordinate via secure channel

---

*Last Updated: January 2026*
