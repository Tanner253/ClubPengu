/**
 * SolanaPayment - Real Solana SPL token transfers
 * Builds, signs, and broadcasts actual transactions to the Solana network
 * 
 * This replaces the "signed intent" approach with real on-chain transfers
 */

import { Connection, PublicKey, Transaction } from '@solana/web3.js';
import { 
    getAssociatedTokenAddress, 
    createTransferInstruction, 
    createAssociatedTokenAccountIdempotentInstruction,
    TOKEN_PROGRAM_ID,
    TOKEN_2022_PROGRAM_ID,
    getMint,
    ASSOCIATED_TOKEN_PROGRAM_ID
} from '@solana/spl-token';
import PhantomWallet from './PhantomWallet.js';

// Configuration - uses VITE_SOLANA_RPC_URL from environment
const SOLANA_RPC_URL = import.meta.env.VITE_SOLANA_RPC_URL || 'https://api.mainnet-beta.solana.com';

/**
 * Confirm transaction using polling (no WebSocket needed)
 * Many RPC providers don't support WebSocket subscriptions
 */
async function confirmTransactionPolling(connection, signature, maxRetries = 60) {
    let retries = 0;
    
    while (retries < maxRetries) {
        try {
            const status = await connection.getSignatureStatus(signature);
            
            if (status?.value?.confirmationStatus === 'confirmed' || 
                status?.value?.confirmationStatus === 'finalized') {
                return true;
            }
            
            if (status?.value?.err) {
                throw new Error(`Transaction failed: ${JSON.stringify(status.value.err)}`);
            }
            
            // Wait 1 second before next check
            await new Promise(resolve => setTimeout(resolve, 1000));
            retries++;
        } catch (error) {
            retries++;
            await new Promise(resolve => setTimeout(resolve, 1000));
        }
    }
    
    return false; // Timeout
}

/**
 * Send SPL tokens to a recipient
 * This creates, signs, and broadcasts a real Solana transaction
 * 
 * DEAD SIMPLE: Just send tokens from wallet A to wallet B
 * - Automatically fetches token decimals from on-chain
 * - Automatically creates recipient's ATA if needed (no questions asked)
 * 
 * @param {Object} options
 * @param {string} options.recipientAddress - Wallet address to send tokens to
 * @param {string} options.tokenMintAddress - SPL token mint address
 * @param {number} options.amount - Amount in human readable units (e.g., 10000 means 10000 tokens)
 * @param {string} options.memo - Optional memo for the transaction
 * @returns {Promise<{success: boolean, signature?: string, error?: string}>}
 */
export async function sendSPLToken(options) {
    const {
        recipientAddress,
        tokenMintAddress,
        amount,
        memo = ''
    } = options;
    
    const wallet = PhantomWallet.getInstance();
    
    // Check wallet connection
    if (!wallet.isConnected()) {
        return {
            success: false,
            error: 'WALLET_NOT_CONNECTED',
            message: 'Please connect your wallet first'
        };
    }
    
    try {
        const senderAddress = wallet.getPublicKey();
        
        console.log('💳 Processing SPL token payment...');
        console.log(`   From: ${senderAddress.slice(0, 8)}...`);
        console.log(`   To: ${recipientAddress.slice(0, 8)}...`);
        console.log(`   Token: ${tokenMintAddress.slice(0, 8)}...`);
        console.log(`   Amount: ${amount}`);
        
        // Create connection
        const connection = new Connection(SOLANA_RPC_URL, {
            commitment: 'confirmed',
            confirmTransactionInitialTimeout: 60000
        });
        
        // Convert addresses to PublicKeys
        const senderPubkey = new PublicKey(senderAddress);
        const recipientPubkey = new PublicKey(recipientAddress);
        const mintPubkey = new PublicKey(tokenMintAddress);
        
        // Determine token program and decimals by checking the mint account on-chain
        // This works for ANY SPL token (standard or Token-2022)
        let tokenProgramId = TOKEN_PROGRAM_ID;
        let decimals = 6; // Default fallback
        
        console.log('🔧 Detecting token program and decimals...');
        
        try {
            // First, check the mint account's owner to determine which program it uses
            const mintAccountInfo = await connection.getAccountInfo(mintPubkey);
            
            if (mintAccountInfo) {
                const ownerProgramId = mintAccountInfo.owner.toBase58();
                
                if (ownerProgramId === TOKEN_2022_PROGRAM_ID.toBase58()) {
                    tokenProgramId = TOKEN_2022_PROGRAM_ID;
                    console.log('🔧 Token uses Token-2022 (Token Extensions) program');
                } else if (ownerProgramId === TOKEN_PROGRAM_ID.toBase58()) {
                    tokenProgramId = TOKEN_PROGRAM_ID;
                    console.log('🔧 Token uses standard SPL Token program');
                } else {
                    console.warn(`⚠️ Unknown token program: ${ownerProgramId}, defaulting to standard`);
                }
                
                // Now fetch decimals using the correct program
                try {
                    const mintInfo = await getMint(connection, mintPubkey, 'confirmed', tokenProgramId);
                    decimals = mintInfo.decimals;
                } catch (mintError) {
                    console.warn('⚠️ Could not fetch decimals, using default 6:', mintError.message);
                }
            } else {
                console.warn('⚠️ Could not fetch mint account, using defaults');
            }
        } catch (detectError) {
            console.warn('⚠️ Token detection failed, trying fallback:', detectError.message);
            // Fallback: try pump.fun heuristic
            if (tokenMintAddress.endsWith('pump')) {
                tokenProgramId = TOKEN_2022_PROGRAM_ID;
                console.log('🔧 Fallback: Using Token-2022 for pump.fun token');
            }
        }
        
        console.log(`   Token decimals: ${decimals}`);
        console.log(`   Token program: ${tokenProgramId.toBase58().slice(0, 8)}...`);
        
        // Get associated token accounts (with correct token program)
        console.log('🔧 Getting token accounts...');
        
        const senderTokenAccount = await getAssociatedTokenAddress(
            mintPubkey,
            senderPubkey,
            false, // allowOwnerOffCurve
            tokenProgramId,
            ASSOCIATED_TOKEN_PROGRAM_ID
        );
        
        const recipientTokenAccount = await getAssociatedTokenAddress(
            mintPubkey,
            recipientPubkey,
            false, // allowOwnerOffCurve
            tokenProgramId,
            ASSOCIATED_TOKEN_PROGRAM_ID
        );
        
        console.log(`   Sender ATA: ${senderTokenAccount.toBase58().slice(0, 8)}...`);
        console.log(`   Recipient ATA: ${recipientTokenAccount.toBase58().slice(0, 8)}...`);
        
        // Convert amount to raw units based on decimals
        // For pump.fun tokens (6 decimals): 10000 tokens = 10000 * 10^6 = 10,000,000,000 raw
        const transferAmount = BigInt(Math.floor(amount * Math.pow(10, decimals)));
        
        console.log(`   Transfer amount (raw): ${transferAmount}`);
        
        // Get latest blockhash
        const { blockhash } = await connection.getLatestBlockhash('confirmed');
        console.log(`   Blockhash: ${blockhash.slice(0, 8)}...`);
        
        // Create transaction
        const transaction = new Transaction();
        transaction.recentBlockhash = blockhash;
        transaction.feePayer = senderPubkey;
        
        // ALWAYS add instruction to create recipient's ATA if it doesn't exist
        // This is idempotent - if ATA exists, instruction succeeds without creating
        // This is the "no questions asked" approach - just make sure recipient can receive
        // NOTE: Must use correct token program (Token-2022 for pump.fun)
        transaction.add(
            createAssociatedTokenAccountIdempotentInstruction(
                senderPubkey,           // payer (sender pays for ATA creation if needed)
                recipientTokenAccount,  // ATA address
                recipientPubkey,        // owner of the ATA
                mintPubkey,             // token mint
                tokenProgramId,         // Token program (Token-2022 for pump.fun!)
                ASSOCIATED_TOKEN_PROGRAM_ID
            )
        );
        
        // Add transfer instruction (with correct token program)
        transaction.add(
            createTransferInstruction(
                senderTokenAccount,
                recipientTokenAccount,
                senderPubkey,
                transferAmount,
                [],
                tokenProgramId  // Token program (Token-2022 for pump.fun!)
            )
        );
        
        console.log('✅ Transaction built (with ATA creation if needed)');
        console.log('✍️ Requesting wallet signature...');
        
        // Sign the transaction using Phantom
        const signResult = await wallet.signTransaction(transaction);
        
        if (!signResult.success) {
            return {
                success: false,
                error: signResult.error,
                message: signResult.message || 'Failed to sign transaction'
            };
        }
        
        console.log('✅ Transaction signed!');
        console.log('📡 Broadcasting to Solana network...');
        
        // Broadcast the signed transaction
        const signature = await connection.sendRawTransaction(signResult.signedTransaction.serialize());
        
        console.log(`✅ Transaction broadcast! Signature: ${signature}`);
        
        // Wait for confirmation using polling
        console.log('⏳ Waiting for confirmation...');
        const confirmed = await confirmTransactionPolling(connection, signature, 60);
        
        if (!confirmed) {
            // Return success with warning - user can verify manually
            console.warn('⚠️ Confirmation timeout (payment likely succeeded)');
            return {
                success: true,
                signature,
                warning: `Payment sent but confirmation timed out. Verify at: https://solscan.io/tx/${signature}`
            };
        }
        
        console.log('✅ Payment confirmed!');
        
        return {
            success: true,
            signature
        };
        
    } catch (error) {
        console.error('❌ Payment failed:', error);
        
        // Parse common error messages
        let userMessage = error.message || 'Payment failed';
        
        if (error.message?.includes('User rejected') || error.message?.includes('user rejected')) {
            userMessage = 'Transaction cancelled by user';
        } else if (error.message?.includes('Insufficient funds') || error.message?.includes('insufficient lamports')) {
            userMessage = 'Insufficient SOL for transaction fee';
        } else if (error.message?.includes('insufficient funds')) {
            userMessage = 'Insufficient token balance';
        } else if (error.message?.includes('Blockhash not found')) {
            userMessage = 'Network congestion. Please try again.';
        }
        
        return {
            success: false,
            error: 'PAYMENT_FAILED',
            message: userMessage
        };
    }
}

/**
 * Pay igloo entry fee
 * Convenience wrapper for sendSPLToken specifically for igloo entry fees
 * 
 * DEAD SIMPLE: Just pay the igloo owner in their specified token
 * - Decimals are fetched automatically from on-chain
 * - Recipient ATA is created if needed (no questions asked)
 * 
 * @param {string} iglooId - ID of the igloo being entered
 * @param {number} amount - Fee amount in human readable units (e.g., 10000 = 10000 tokens)
 * @param {string} ownerWallet - Igloo owner's wallet address (receives the fee)
 * @param {string} tokenAddress - Token mint address for the fee
 */
export async function payIglooEntryFee(iglooId, amount, ownerWallet, tokenAddress) {
    console.log('🏠 Paying igloo entry fee...');
    console.log(`   Igloo: ${iglooId}`);
    console.log(`   Amount: ${amount} tokens`);
    console.log(`   To: ${ownerWallet.slice(0, 8)}...`);
    console.log(`   Token: ${tokenAddress.slice(0, 8)}...`);
    
    return sendSPLToken({
        recipientAddress: ownerWallet,
        tokenMintAddress: tokenAddress,
        amount,
        memo: `entry:${iglooId}`
    });
}

/**
 * Pay igloo rent
 * Sends $WADDLE tokens to the rent treasury wallet
 * 
 * @param {string} iglooId - ID of the igloo being rented
 * @param {number} amount - Rent amount in $WADDLE (human readable, e.g., 10000)
 * @param {string} rentWalletAddress - Treasury wallet that receives rent
 * @param {string} tokenAddress - $WADDLE token address
 */
export async function payIglooRent(iglooId, amount, rentWalletAddress, tokenAddress) {
    console.log('🏠 Paying igloo rent...');
    console.log(`   Igloo: ${iglooId}`);
    console.log(`   Amount: ${amount} $WADDLE`);
    console.log(`   To Treasury: ${rentWalletAddress.slice(0, 8)}...`);
    
    return sendSPLToken({
        recipientAddress: rentWalletAddress,
        tokenMintAddress: tokenAddress,
        amount,
        memo: `rent:${iglooId}`
    });
}

/**
 * Check SPL token balance
 * 
 * @param {string} walletAddress - Wallet to check
 * @param {string} tokenMintAddress - Token mint address
 * @returns {Promise<{balance: number, error?: string}>}
 */
export async function getTokenBalance(walletAddress, tokenMintAddress) {
    try {
        const connection = new Connection(SOLANA_RPC_URL, { commitment: 'confirmed' });
        const walletPubkey = new PublicKey(walletAddress);
        const mintPubkey = new PublicKey(tokenMintAddress);
        
        const tokenAccount = await getAssociatedTokenAddress(mintPubkey, walletPubkey);
        
        try {
            const balance = await connection.getTokenAccountBalance(tokenAccount);
            return {
                balance: balance.value.uiAmount || 0
            };
        } catch (e) {
            // No token account = 0 balance
            if (e.message?.includes('could not find account')) {
                return { balance: 0 };
            }
            throw e;
        }
    } catch (error) {
        console.error('Error checking token balance:', error);
        return { balance: 0, error: error.message };
    }
}

/**
 * Create a pre-signed wager transaction (for P2P matches)
 * 
 * This builds and signs a REAL Solana transaction but does NOT broadcast it.
 * The signed transaction is returned for the server to hold.
 * After the game, the server broadcasts ONLY the loser's transaction.
 * 
 * KEY SECURITY: Transactions include a recent blockhash and expire in ~2 minutes.
 * This is why we get the signature RIGHT BEFORE the game starts, not when challenging.
 * 
 * @param {Object} options
 * @param {string} options.recipientAddress - Winner's wallet (opponent)
 * @param {string} options.tokenMintAddress - SPL token mint address  
 * @param {number} options.amount - Amount in human readable units
 * @param {string} options.matchId - Match identifier for memo
 * @returns {Promise<{success: boolean, signedTransaction?: string, error?: string}>}
 */
export async function createSignedWagerTransaction(options) {
    const {
        recipientAddress,
        tokenMintAddress,
        amount,
        matchId
    } = options;
    
    const wallet = PhantomWallet.getInstance();
    
    if (!wallet.isConnected()) {
        return {
            success: false,
            error: 'WALLET_NOT_CONNECTED',
            message: 'Please connect your wallet first'
        };
    }
    
    try {
        const senderAddress = wallet.getPublicKey();
        
        console.log('🎲 Building wager transaction...');
        console.log(`   Match: ${matchId}`);
        console.log(`   From: ${senderAddress.slice(0, 8)}...`);
        console.log(`   To: ${recipientAddress.slice(0, 8)}...`);
        console.log(`   Amount: ${amount}`);
        
        const connection = new Connection(SOLANA_RPC_URL, { commitment: 'confirmed' });
        
        const senderPubkey = new PublicKey(senderAddress);
        const recipientPubkey = new PublicKey(recipientAddress);
        const mintPubkey = new PublicKey(tokenMintAddress);
        
        // Get token info
        let tokenProgramId = TOKEN_PROGRAM_ID;
        let decimals = 6;
        
        try {
            const mintInfo = await getMint(connection, mintPubkey, 'confirmed', TOKEN_PROGRAM_ID);
            decimals = mintInfo.decimals;
        } catch {
            try {
                const mintInfo = await getMint(connection, mintPubkey, 'confirmed', TOKEN_2022_PROGRAM_ID);
                decimals = mintInfo.decimals;
                tokenProgramId = TOKEN_2022_PROGRAM_ID;
            } catch {
                console.warn('Could not fetch mint info, using defaults');
            }
        }
        
        // Get token accounts
        const senderTokenAccount = await getAssociatedTokenAddress(
            mintPubkey, senderPubkey, false, tokenProgramId, ASSOCIATED_TOKEN_PROGRAM_ID
        );
        const recipientTokenAccount = await getAssociatedTokenAddress(
            mintPubkey, recipientPubkey, false, tokenProgramId, ASSOCIATED_TOKEN_PROGRAM_ID
        );
        
        // Calculate transfer amount
        const transferAmount = BigInt(Math.floor(amount * Math.pow(10, decimals)));
        
        // Get fresh blockhash (transaction will expire in ~2 minutes)
        const { blockhash, lastValidBlockHeight } = await connection.getLatestBlockhash('confirmed');
        
        // Build transaction
        const transaction = new Transaction({
            recentBlockhash: blockhash,
            feePayer: senderPubkey
        });
        
        // Create recipient ATA if needed (idempotent)
        transaction.add(
            createAssociatedTokenAccountIdempotentInstruction(
                senderPubkey, recipientTokenAccount, recipientPubkey, mintPubkey, 
                tokenProgramId, ASSOCIATED_TOKEN_PROGRAM_ID
            )
        );
        
        // Add transfer
        transaction.add(
            createTransferInstruction(
                senderTokenAccount, recipientTokenAccount, senderPubkey,
                transferAmount, [], tokenProgramId
            )
        );
        
        console.log('✍️ Requesting wager signature...');
        console.log('⚠️ This authorizes payment IF you lose the match');
        
        // Sign (but don't broadcast)
        const signResult = await wallet.signTransaction(transaction);
        
        if (!signResult.success) {
            return {
                success: false,
                error: signResult.error,
                message: signResult.message || 'Failed to sign wager transaction'
            };
        }
        
        // Serialize the signed transaction for server storage
        const serializedTx = signResult.signedTransaction.serialize().toString('base64');
        
        console.log('✅ Wager transaction signed (not broadcast)');
        console.log(`   Expires at block: ${lastValidBlockHeight}`);
        
        return {
            success: true,
            signedTransaction: serializedTx,
            blockhash,
            lastValidBlockHeight,
            expiresInSeconds: 120 // ~2 minutes
        };
        
    } catch (error) {
        console.error('❌ Wager transaction creation failed:', error);
        
        let userMessage = error.message || 'Failed to create wager';
        if (error.message?.includes('User rejected')) {
            userMessage = 'Transaction cancelled by user';
        } else if (error.message?.includes('insufficient')) {
            userMessage = 'Insufficient balance for wager';
        }
        
        return {
            success: false,
            error: 'WAGER_FAILED',
            message: userMessage
        };
    }
}

export default {
    sendSPLToken,
    payIglooEntryFee,
    payIglooRent,
    getTokenBalance,
    createSignedWagerTransaction
};

