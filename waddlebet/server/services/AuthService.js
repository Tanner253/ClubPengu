/**
 * AuthService - Handles Phantom wallet authentication
 * Implements x403 JWT authentication with Solana wallet signature verification
 */

import jwt from 'jsonwebtoken';
import nacl from 'tweetnacl';
import bs58 from 'bs58';
import { User, AuthSession } from '../db/models/index.js';
import { getReferralService } from './ReferralService.js';

// JWT configuration
const IS_DEV = process.env.NODE_ENV !== 'production';
const JWT_SECRET = process.env.JWT_SECRET;
const JWT_EXPIRY = process.env.JWT_EXPIRY || '24h'; // 24 hours minimum before re-sign
const SESSION_EXPIRY_HOURS = 24; // 24 hours session

// SECURITY: Fail fast in production without proper JWT_SECRET
if (!JWT_SECRET) {
    if (IS_DEV) {
        console.warn('⚠️ WARNING: JWT_SECRET not set. Using insecure development secret.');
    } else {
        throw new Error('FATAL: JWT_SECRET environment variable is required in production');
    }
}
const EFFECTIVE_JWT_SECRET = JWT_SECRET || 'dev-secret-DO-NOT-USE-IN-PRODUCTION';

// Challenge nonce storage (in-memory, per-connection)
const pendingChallenges = new Map(); // playerId -> { nonce, createdAt }
const CHALLENGE_EXPIRY_MS = 3 * 60 * 1000; // 3 minutes (time to read modal)

// Get domain from environment or default
const APP_DOMAIN = process.env.APP_DOMAIN || 'clubpengu.com';
const APP_NAME = 'Club Pengu';

class AuthService {
    constructor() {
        // Clean up expired challenges periodically
        setInterval(() => this.cleanupExpiredChallenges(), 60000);
    }

    /**
     * Generate a challenge nonce for wallet signature
     * x403 Protocol - comprehensive message for signer confidence
     * @param {string} playerId - Session player ID  
     * @param {string} domain - Request origin domain (optional)
     * @returns {{ message: string, nonce: string, expiresAt: number }}
     */
    generateChallenge(playerId, domain = null) {
        const timestamp = Date.now();
        const nonce = Math.random().toString(36).substring(2, 15) + 
                      Math.random().toString(36).substring(2, 15);
        const expiresAt = timestamp + CHALLENGE_EXPIRY_MS;
        const displayDomain = domain || APP_DOMAIN;
        const issuedDate = new Date(timestamp).toISOString();
        
        // x403 comprehensive authentication message
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
            nonce: message,  // Store full message as nonce for verification
            createdAt: timestamp,
            expiresAt
        });
        
        return { 
            message, 
            nonce, 
            expiresAt,
            domain: displayDomain
        };
    }

    /**
     * Verify a Solana wallet signature
     * @param {string} playerId - Session player ID
     * @param {string} walletAddress - Solana wallet address (base58)
     * @param {string} signature - Signature (base58)
     * @returns {{ valid: boolean, error?: string }}
     */
    verifySignature(playerId, walletAddress, signature) {
        try {
            // Get the pending challenge
            const challenge = pendingChallenges.get(playerId);
            if (!challenge) {
                return { valid: false, error: 'NO_PENDING_CHALLENGE' };
            }

            // Check if challenge expired
            if (Date.now() - challenge.createdAt > CHALLENGE_EXPIRY_MS) {
                pendingChallenges.delete(playerId);
                return { valid: false, error: 'CHALLENGE_EXPIRED' };
            }

            // Decode the signature and public key
            const messageBytes = new TextEncoder().encode(challenge.nonce);
            const signatureBytes = bs58.decode(signature);
            const publicKeyBytes = bs58.decode(walletAddress);

            // Verify the signature using nacl
            const isValid = nacl.sign.detached.verify(
                messageBytes,
                signatureBytes,
                publicKeyBytes
            );

            // Clean up the challenge
            pendingChallenges.delete(playerId);

            if (!isValid) {
                return { valid: false, error: 'INVALID_SIGNATURE' };
            }

            return { valid: true };
        } catch (error) {
            console.error('Signature verification error:', error);
            return { valid: false, error: 'VERIFICATION_ERROR' };
        }
    }

    /**
     * Create or update user and generate JWT token
     * @param {string} walletAddress - Verified wallet address
     * @param {string} playerId - Session player ID
     * @param {object} clientData - Optional client data for migration
     * @param {string} ipAddress - Client IP
     * @returns {Promise<{ token: string, user: object, isNewUser: boolean, referralApplied?: boolean }>}
     */
    async authenticateUser(walletAddress, playerId, clientData = {}, ipAddress = null) {
        try {
            // Find or create user
            let user = await User.findOne({ walletAddress });
            let isNewUser = false;
            let referralApplied = false;

            if (!user) {
                isNewUser = true;
                
                // ALWAYS use default Penguin name for new users
                // They will choose their permanent username in the designer before entering world
                // This ensures isEstablishedUser() returns false until they enter world
                let username = `Penguin${walletAddress.slice(-6)}`;
                
                // If even the default is taken (very unlikely), add random suffix
                const existingWithUsername = await User.findOne({ username });
                if (existingWithUsername) {
                    username = `Penguin${walletAddress.slice(-4)}${Math.floor(Math.random() * 1000)}`;
                    console.log(`⚠️ Default username taken, assigned: ${username}`);
                }

                // Create new user with optional migration data
                user = new User({
                    walletAddress,
                    username,
                    characterType: clientData.characterType || 'penguin',
                    customization: clientData.customization || {},
                    coins: 100, // Starting bonus
                    // Migration data if provided
                    migrationSource: clientData.migrateFrom ? 'localStorage' : null,
                    migratedAt: clientData.migrateFrom ? new Date() : null,
                    // Initialize referral fields
                    referral: {
                        referralCode: username  // Default referral code is username
                    }
                });

                // If migrating, apply localStorage data
                if (clientData.migrateFrom === 'localStorage' && clientData.migrationData) {
                    await this.applyMigrationData(user, clientData.migrationData);
                }

                await user.save();
                
                // Process referral code if provided (only for new users)
                if (clientData.referralCode) {
                    const referralService = getReferralService();
                    if (referralService) {
                        const referralResult = await referralService.registerReferral(walletAddress, clientData.referralCode);
                        if (referralResult.success) {
                            referralApplied = true;
                            console.log(`🔗 Referral applied: ${username} referred by ${referralResult.referrer.username}`);
                        } else {
                            console.log(`🔗 Referral failed: ${referralResult.error}`);
                        }
                    }
                }
                
                // Record starting bonus transaction
                const Transaction = (await import('../db/models/Transaction.js')).default;
                await Transaction.record({
                    type: 'starting_bonus',
                    toWallet: walletAddress,
                    amount: 100,
                    toBalanceBefore: 0,
                    toBalanceAfter: 100,
                    reason: 'New player starting bonus'
                });

                console.log(`🆕 New user created: ${username} (${walletAddress.slice(0, 8)}...) - isEstablished: ${user.isEstablishedUser()}`);
            } else {
                console.log(`👤 Existing user found: ${user.username} (${walletAddress.slice(0, 8)}...) - isEstablished: ${user.isEstablishedUser()}, lastUsernameChangeAt: ${user.lastUsernameChangeAt ? 'SET' : 'null'}`);
            }

            // Migration: Set lastUsernameChangeAt for established users who don't have it
            if (!isNewUser && user.isEstablishedUser() && !user.lastUsernameChangeAt) {
                user.lastUsernameChangeAt = user.createdAt || new Date();
                console.log(`📝 Migrated username lock for ${user.username}`);
            }
            
            // CRITICAL: Check if user is banned BEFORE updating connection state
            if (user.isBanned) {
                // Check if ban has expired
                if (user.banExpires && user.banExpires < new Date()) {
                    user.isBanned = false;
                    user.banReason = null;
                    user.banExpires = null;
                    await user.save();
                } else {
                    // User is banned - throw error to prevent authentication
                    throw new Error('BANNED');
                }
            }
            
            // Update connection state
            user.isConnected = true;
            user.currentPlayerId = playerId;
            user.lastActiveAt = new Date();
            user.lastIpAddress = ipAddress;
            
            // IMPORTANT: Only set lastLoginAt and increment sessions for EXISTING users
            // New users should remain "not established" until they enter the world
            // This allows them to choose their username in the designer
            if (!isNewUser) {
                user.lastLoginAt = new Date();
                user.stats.session.totalSessions++;
            }
            
            await user.save();

            // Create auth session
            const expiresAt = new Date(Date.now() + SESSION_EXPIRY_HOURS * 60 * 60 * 1000);
            const token = this.generateToken(walletAddress, playerId);

            const session = new AuthSession({
                walletAddress,
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

    /**
     * Apply migration data from localStorage
     */
    async applyMigrationData(user, data) {
        // Coins (cap at reasonable amount to prevent exploits)
        if (data.coins && data.coins > 0) {
            user.coins = Math.min(data.coins, 100000); // Cap at 100k
        }

        // Unlocked items
        if (data.unlockedItems && Array.isArray(data.unlockedItems)) {
            user.unlockedCosmetics = [...new Set([...user.unlockedCosmetics, ...data.unlockedItems])];
        }

        // Stamps
        if (data.stamps && Array.isArray(data.stamps)) {
            user.stamps = data.stamps;
        }

        // Stats (merge with defaults)
        if (data.stats) {
            if (data.stats.gamesPlayed) {
                user.gameStats.overall.totalGamesPlayed = data.stats.gamesPlayed;
            }
            if (data.stats.gamesWon) {
                user.gameStats.overall.totalGamesWon = data.stats.gamesWon;
            }
        }

        // Customization
        if (data.customization) {
            user.customization = { ...user.customization, ...data.customization };
        }

        console.log(`📦 Migration data applied for ${user.walletAddress}`);
    }

    /**
     * Generate JWT token
     */
    generateToken(walletAddress, sessionId) {
        return jwt.sign(
            { 
                walletAddress, 
                sessionId,
                iat: Math.floor(Date.now() / 1000)
            },
            EFFECTIVE_JWT_SECRET,
            { expiresIn: JWT_EXPIRY }
        );
    }

    /**
     * Verify JWT token
     * @param {string} token - JWT token
     * @returns {{ valid: boolean, data?: object, error?: string }}
     */
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

    /**
     * Validate session and get user
     * @param {string} token - JWT token
     * @returns {Promise<{ valid: boolean, user?: object, error?: string }>}
     */
    async validateSession(token) {
        const tokenResult = this.verifyToken(token);
        if (!tokenResult.valid) {
            return { valid: false, error: tokenResult.error };
        }

        // Check if session exists and is active
        const session = await AuthSession.findValidSession(token);
        if (!session) {
            return { valid: false, error: 'SESSION_INVALID' };
        }

        // Get user
        const user = await User.findOne({ walletAddress: tokenResult.data.walletAddress });
        if (!user) {
            return { valid: false, error: 'USER_NOT_FOUND' };
        }

        // Update session activity
        await session.touch();
        user.lastActiveAt = new Date();
        await user.save();

        return { valid: true, user };
    }

    /**
     * Logout user
     * @param {string} walletAddress - Wallet address
     * @param {string} token - Session token (optional, invalidates specific session)
     */
    async logout(walletAddress, token = null) {
        try {
            // Update user connection state
            const user = await User.findOne({ walletAddress });
            if (user) {
                user.isConnected = false;
                user.lastLogoutAt = new Date();
                user.currentPlayerId = null;
                await user.save();
            }

            // Invalidate session(s)
            if (token) {
                const session = await AuthSession.findOne({ sessionToken: token });
                if (session) {
                    await session.invalidate();
                }
            } else {
                // Invalidate all sessions for this wallet
                await AuthSession.invalidateAllForWallet(walletAddress);
            }

            return { success: true };
        } catch (error) {
            console.error('Logout error:', error);
            return { success: false, error: error.message };
        }
    }

    /**
     * Clean up expired challenges
     */
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

    /**
     * Check if a wallet is banned
     */
    async isWalletBanned(walletAddress) {
        const user = await User.findOne({ walletAddress });
        if (!user) return false;
        
        if (user.isBanned) {
            // Check if ban has expired
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

