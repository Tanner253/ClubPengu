/**
 * AuthService - Wallet authentication (Solana x403 + EVM SIWE)
 * JWT sessions with Solana Ed25519 or EIP-4361 signature verification
 */

import jwt from 'jsonwebtoken';
import nacl from 'tweetnacl';
import bs58 from 'bs58';
import crypto from 'crypto';
import { SiweMessage } from 'siwe';
import { User, AuthSession } from '../db/models/index.js';
import { getReferralService } from './ReferralService.js';
import UserService from './UserService.js';
import { STARTING_COINS, GOLD_ECONOMY_VERSION } from '../config/goldEconomy.js';
import {
    normalizeChainId,
    isAllowedEvmChainId,
    parseEvmChainId,
    SOLANA_CHAIN_ID
} from '../config/evm.js';
import { toChecksumAddress } from '../utils/evmAddress.js';
import { findUserByWallet, canonicalWalletAddress, walletsMatch } from '../utils/walletIdentity.js';

const userServiceForAuth = new UserService();

const IS_DEV = process.env.NODE_ENV !== 'production';
const JWT_SECRET = process.env.JWT_SECRET;
const JWT_EXPIRY = process.env.JWT_EXPIRY || '24h';
const SESSION_EXPIRY_HOURS = 24;

if (!JWT_SECRET) {
    if (IS_DEV) {
        console.warn('⚠️ WARNING: JWT_SECRET not set. Using insecure development secret.');
    } else {
        throw new Error('FATAL: JWT_SECRET environment variable is required in production');
    }
}
const EFFECTIVE_JWT_SECRET = JWT_SECRET || 'dev-secret-DO-NOT-USE-IN-PRODUCTION';

const pendingChallenges = new Map();
const CHALLENGE_EXPIRY_MS = 3 * 60 * 1000;

const APP_DOMAIN = process.env.APP_DOMAIN || 'clubpengu.com';
const APP_NAME = 'Club Pengu';

class AuthService {
    constructor() {
        setInterval(() => this.cleanupExpiredChallenges(), 60000);
    }

    normalizeChainId(chainId) {
        return normalizeChainId(chainId);
    }

    isAllowedEvmChain(chainId) {
        return isAllowedEvmChainId(chainId);
    }

    /**
     * @param {object} options
     * @param {'solana'|'evm'} [options.walletType]
     * @param {string|number} [options.chainId]
     * @param {string} [options.walletAddress] - required for EVM SIWE
     * @param {string} [options.uri]
     */
    generateChallenge(playerId, domain = null, options = {}) {
        const walletType = options.walletType || 'solana';
        const displayDomain = domain || APP_DOMAIN;

        if (walletType === 'evm') {
            return this.generateSiweChallenge(
                playerId,
                displayDomain,
                options.chainId,
                options.walletAddress,
                options.uri
            );
        }

        return this.generateSolanaChallenge(playerId, displayDomain);
    }

    generateSolanaChallenge(playerId, displayDomain) {
        const timestamp = Date.now();
        const nonce = Math.random().toString(36).substring(2, 15)
            + Math.random().toString(36).substring(2, 15);
        const expiresAt = timestamp + CHALLENGE_EXPIRY_MS;
        const issuedDate = new Date(timestamp).toISOString();

        const message = `🐧 ${APP_NAME} Wallet Verification

This signature proves you own this wallet.

WHY THIS IS SAFE:
• This is NOT a transaction (costs $0)
• We're just verifying wallet ownership
• No funds can be moved with this signature
• This helps prevent bots and keep games fair

⚠️ SECURITY: Always verify you're on the correct domain
✓ Expected domain: ${displayDomain}
✗ Never sign on unfamiliar domains!

WHAT THIS ENABLES:
• Save your penguin customization and progress
• Earn and keep gold coins from minigames
• Challenge other players to P2P matches
• Track your game statistics and achievements

BY SIGNING, YOU AUTHORIZE ${APP_NAME.toUpperCase()} TO:
• Create an authentication session for your wallet
• Track your game statistics and earnings
• Enforce fair-play rules (one wallet = one player)

Technical Details:
━━━━━━━━━━━━━━━━━━━━━━━
Domain: ${displayDomain}
Nonce: ${nonce}
Issued: ${issuedDate}
Expires: 3 minutes
Session: ${playerId.slice(0, 8)}...
━━━━━━━━━━━━━━━━━━━━━━━

x403 Protocol - Learn more: https://github.com/ByrgerBib/webx403`;

        pendingChallenges.set(playerId, {
            walletType: 'solana',
            chainId: SOLANA_CHAIN_ID,
            nonce: message,
            createdAt: timestamp,
            expiresAt
        });

        return {
            message,
            nonce,
            expiresAt,
            domain: displayDomain,
            walletType: 'solana',
            chainId: SOLANA_CHAIN_ID
        };
    }

    generateSiweChallenge(playerId, domain, chainId, walletAddress, uri) {
        const parsedChainId = parseEvmChainId(chainId);
        if (!parsedChainId) {
            throw new Error('INVALID_EVM_CHAIN');
        }

        let checksummedAddress;
        try {
            checksummedAddress = toChecksumAddress(walletAddress);
        } catch {
            throw new Error('INVALID_EVM_ADDRESS');
        }

        const timestamp = Date.now();
        const expiresAt = timestamp + CHALLENGE_EXPIRY_MS;
        const nonce = crypto.randomBytes(16).toString('hex');
        const chainIdStr = String(parsedChainId);
        const originUri = uri || (domain.startsWith('http') ? domain : `https://${domain}`);

        const siweMessage = new SiweMessage({
            domain,
            address: checksummedAddress,
            statement: `Sign in to ${APP_NAME} with your Robinhood Chain wallet.`,
            uri: originUri,
            version: '1',
            chainId: parsedChainId,
            nonce,
            expirationTime: new Date(expiresAt).toISOString()
        });

        const message = siweMessage.prepareMessage();

        pendingChallenges.set(playerId, {
            walletType: 'evm',
            chainId: chainIdStr,
            nonce: message,
            walletAddress: checksummedAddress.toLowerCase(),
            createdAt: timestamp,
            expiresAt
        });

        return {
            message,
            nonce,
            expiresAt,
            domain,
            walletType: 'evm',
            chainId: chainIdStr
        };
    }

    /**
     * @param {object} [options]
     * @param {'solana'|'evm'} [options.walletType]
     * @param {string} [options.message] - SIWE message (required for evm)
     */
    async verifySignature(playerId, walletAddress, signature, options = {}) {
        const walletType = options.walletType || 'solana';

        if (walletType === 'evm') {
            return this.verifySiweSignature(playerId, walletAddress, signature, options.message);
        }

        return this.verifySolanaSignature(playerId, walletAddress, signature);
    }

    verifySolanaSignature(playerId, walletAddress, signature) {
        try {
            const challenge = pendingChallenges.get(playerId);
            if (!challenge || challenge.walletType !== 'solana') {
                return { valid: false, error: 'NO_PENDING_CHALLENGE' };
            }

            if (Date.now() - challenge.createdAt > CHALLENGE_EXPIRY_MS) {
                pendingChallenges.delete(playerId);
                return { valid: false, error: 'CHALLENGE_EXPIRED' };
            }

            const messageBytes = new TextEncoder().encode(challenge.nonce);
            const signatureBytes = bs58.decode(signature);
            const publicKeyBytes = bs58.decode(walletAddress);

            const isValid = nacl.sign.detached.verify(
                messageBytes,
                signatureBytes,
                publicKeyBytes
            );

            pendingChallenges.delete(playerId);

            if (!isValid) {
                return { valid: false, error: 'INVALID_SIGNATURE' };
            }

            return { valid: true, chainId: SOLANA_CHAIN_ID };
        } catch (error) {
            console.error('Solana signature verification error:', error);
            return { valid: false, error: 'VERIFICATION_ERROR' };
        }
    }

    async verifySiweSignature(playerId, walletAddress, signature, message) {
        try {
            const challenge = pendingChallenges.get(playerId);
            if (!challenge || challenge.walletType !== 'evm') {
                return { valid: false, error: 'NO_PENDING_CHALLENGE' };
            }

            if (Date.now() - challenge.createdAt > CHALLENGE_EXPIRY_MS) {
                pendingChallenges.delete(playerId);
                return { valid: false, error: 'CHALLENGE_EXPIRED' };
            }

            if (!message || message !== challenge.nonce) {
                return { valid: false, error: 'MESSAGE_MISMATCH' };
            }

            const siweMessage = new SiweMessage(message);
            const result = await siweMessage.verify({ signature });

            if (result.data.address.toLowerCase() !== walletAddress.toLowerCase()) {
                pendingChallenges.delete(playerId);
                return { valid: false, error: 'ADDRESS_MISMATCH' };
            }

            if (String(result.data.chainId) !== challenge.chainId) {
                pendingChallenges.delete(playerId);
                return { valid: false, error: 'CHAIN_MISMATCH' };
            }

            pendingChallenges.delete(playerId);
            return { valid: true, chainId: challenge.chainId };
        } catch (error) {
            console.error('SIWE verification error:', error);
            pendingChallenges.delete(playerId);
            return { valid: false, error: 'INVALID_SIGNATURE' };
        }
    }

    async findUser(walletAddress, chainId = SOLANA_CHAIN_ID) {
        return findUserByWallet(User, walletAddress, chainId);
    }

    async authenticateUser(walletAddress, playerId, clientData = {}, ipAddress = null, chainId = SOLANA_CHAIN_ID) {
        const normalizedChainId = normalizeChainId(chainId);
        const normalizedWallet = canonicalWalletAddress(walletAddress, normalizedChainId);

        try {
            let user = await this.findUser(normalizedWallet, normalizedChainId);
            let isNewUser = false;
            let referralApplied = false;

            if (!user) {
                isNewUser = true;

                let username = `Penguin${normalizedWallet.slice(-6)}`;
                const existingWithUsername = await User.findOne({ username });
                if (existingWithUsername) {
                    username = `Penguin${normalizedWallet.slice(-4)}${Math.floor(Math.random() * 1000)}`;
                    console.log(`⚠️ Default username taken, assigned: ${username}`);
                }

                user = new User({
                    walletAddress: normalizedWallet,
                    chainId: normalizedChainId,
                    username,
                    characterType: clientData.characterType || 'penguin',
                    customization: clientData.customization || {},
                    coins: STARTING_COINS,
                    goldEconomyVersion: GOLD_ECONOMY_VERSION,
                    gameInventory: {
                        columns: 10,
                        displayRows: 6,
                        unlockedSlots: 5,
                        slots: Array.from({ length: 5 }, () => ({ itemId: null, quantity: 0, metadata: {} }))
                    },
                    referral: {
                        referralCode: username
                    }
                });

                await user.save();

                if (clientData.referralCode) {
                    const referralService = getReferralService();
                    if (referralService) {
                        const referralResult = await referralService.registerReferral(normalizedWallet, clientData.referralCode);
                        if (referralResult.success) {
                            referralApplied = true;
                            console.log(`🔗 Referral applied: ${username} referred by ${referralResult.referrer.username}`);
                        } else {
                            console.log(`🔗 Referral failed: ${referralResult.error}`);
                        }
                    }
                }

                const Transaction = (await import('../db/models/Transaction.js')).default;
                await Transaction.record({
                    type: 'starting_bonus',
                    toWallet: normalizedWallet,
                    amount: STARTING_COINS,
                    toBalanceBefore: 0,
                    toBalanceAfter: STARTING_COINS,
                    reason: 'New player starting bonus'
                });

                console.log(`🆕 New user created: ${username} (${normalizedWallet.slice(0, 8)}..., chain ${normalizedChainId})`);
            } else {
                console.log(`👤 Existing user found: ${user.username} (${normalizedWallet.slice(0, 8)}..., chain ${normalizedChainId})`);
                await userServiceForAuth.ensureGoldEconomyApplied(user);
                if (user.ensureDay1NametagGrandfather()) {
                    console.log(`⭐ Day 1 nametag grandfathered for ${user.username}`);
                }
            }

            if (!isNewUser && user.isEstablishedUser() && !user.lastUsernameChangeAt) {
                user.lastUsernameChangeAt = user.createdAt || new Date();
                console.log(`📝 Migrated username lock for ${user.username}`);
            }

            if (user.isBanned) {
                if (user.banExpires && user.banExpires < new Date()) {
                    user.isBanned = false;
                    user.banReason = null;
                    user.banExpires = null;
                    await user.save();
                } else {
                    throw new Error('BANNED');
                }
            }

            user.isConnected = true;
            user.currentPlayerId = playerId;
            user.lastActiveAt = new Date();
            user.lastIpAddress = ipAddress;

            if (!isNewUser) {
                user.lastLoginAt = new Date();
                user.stats.session.totalSessions++;
            }

            await user.save();

            const expiresAt = new Date(Date.now() + SESSION_EXPIRY_HOURS * 60 * 60 * 1000);
            const token = this.generateToken(normalizedWallet, playerId, normalizedChainId);

            const session = new AuthSession({
                walletAddress: normalizedWallet,
                chainId: normalizedChainId,
                sessionToken: token,
                expiresAt,
                ipAddress
            });
            await session.save();

            return {
                token,
                user: await user.getFullDataAsync(),
                isNewUser,
                referralApplied
            };
        } catch (error) {
            console.error('Authentication error:', error);
            throw error;
        }
    }

    generateToken(walletAddress, sessionId, chainId = SOLANA_CHAIN_ID) {
        return jwt.sign(
            {
                walletAddress,
                chainId: normalizeChainId(chainId),
                sessionId,
                iat: Math.floor(Date.now() / 1000)
            },
            EFFECTIVE_JWT_SECRET,
            { expiresIn: JWT_EXPIRY }
        );
    }

    verifyToken(token) {
        try {
            const decoded = jwt.verify(token, EFFECTIVE_JWT_SECRET);
            return { valid: true, data: decoded };
        } catch (error) {
            if (error.name === 'TokenExpiredError') {
                return { valid: false, error: 'TOKEN_EXPIRED' };
            }
            return { valid: false, error: 'INVALID_TOKEN' };
        }
    }

    async validateSession(token) {
        const tokenResult = this.verifyToken(token);
        if (!tokenResult.valid) {
            return { valid: false, error: tokenResult.error };
        }

        const session = await AuthSession.findValidSession(token);
        if (!session) {
            return { valid: false, error: 'SESSION_INVALID' };
        }

        const chainId = normalizeChainId(tokenResult.data.chainId || session.chainId || SOLANA_CHAIN_ID);
        const user = await this.findUser(tokenResult.data.walletAddress, chainId);
        if (!user) {
            return { valid: false, error: 'USER_NOT_FOUND' };
        }

        await session.touch();
        user.lastActiveAt = new Date();
        await user.save();

        return { valid: true, user };
    }

    async logout(walletAddress, token = null, chainId = SOLANA_CHAIN_ID) {
        const normalizedChainId = normalizeChainId(chainId);

        try {
            const user = await this.findUser(walletAddress, normalizedChainId);
            if (user) {
                user.isConnected = false;
                user.lastLogoutAt = new Date();
                user.currentPlayerId = null;
                await user.save();
            }

            if (token) {
                const session = await AuthSession.findOne({ sessionToken: token });
                if (session) {
                    await session.invalidate();
                }
            } else {
                await AuthSession.invalidateAllForWallet(walletAddress, normalizedChainId);
            }

            return { success: true };
        } catch (error) {
            console.error('Logout error:', error);
            return { success: false, error: error.message };
        }
    }

    cleanupExpiredChallenges() {
        const now = Date.now();
        let cleaned = 0;

        for (const [playerId, challenge] of pendingChallenges) {
            if (now - challenge.createdAt > CHALLENGE_EXPIRY_MS) {
                pendingChallenges.delete(playerId);
                cleaned++;
            }
        }

        if (cleaned > 0) {
            console.log(`🧹 Cleaned up ${cleaned} expired auth challenges`);
        }
    }

    async isWalletBanned(walletAddress, chainId = SOLANA_CHAIN_ID) {
        const user = await this.findUser(walletAddress, chainId);
        if (!user) return false;

        if (user.isBanned) {
            if (user.banExpires && user.banExpires < new Date()) {
                user.isBanned = false;
                user.banReason = null;
                user.banExpires = null;
                await user.save();
                return false;
            }
            return true;
        }
        return false;
    }
}

export default AuthService;
