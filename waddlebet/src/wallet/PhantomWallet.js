/**
 * PhantomWallet - Handles Phantom wallet connection and signing
 * Supports both desktop (extension) and mobile (deep links)
 * For Solana wallet authentication
 */

import bs58 from 'bs58';

// Detect mobile device
const isMobile = () => {
    if (typeof window === 'undefined') return false;
    return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent) ||
           (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1); // iPadOS
};

// Check if we're inside Phantom's in-app browser
const isPhantomBrowser = () => {
    if (typeof window === 'undefined') return false;
    return window.solana && window.solana.isPhantom;
};

// Generate a random string for session
const generateNonce = () => {
    return Array.from(crypto.getRandomValues(new Uint8Array(16)))
        .map(b => b.toString(16).padStart(2, '0'))
        .join('');
};

class PhantomWallet {
    static instance = null;
    
    constructor() {
        if (PhantomWallet.instance) {
            return PhantomWallet.instance;
        }
        
        this.connected = false;
        this.publicKey = null;
        this.listeners = new Map();
        this.isMobile = isMobile();
        
        PhantomWallet.instance = this;
    }
    
    static getInstance() {
        if (!PhantomWallet.instance) {
            PhantomWallet.instance = new PhantomWallet();
        }
        return PhantomWallet.instance;
    }
    
    /**
     * Check if Phantom extension is installed (desktop) or in Phantom browser (mobile)
     */
    isPhantomInstalled() {
        return typeof window !== 'undefined' && 
               window.solana && 
               window.solana.isPhantom;
    }
    
    /**
     * Get the Phantom provider
     */
    getProvider() {
        if (this.isPhantomInstalled()) {
            return window.solana;
        }
        return null;
    }
    
    /**
     * Check if mobile deep link connection is needed
     */
    needsMobileDeepLink() {
        return this.isMobile && !this.isPhantomInstalled();
    }
    
    /**
     * Get Phantom mobile deep link URL
     * Opens Phantom app on mobile if installed
     */
    getPhantomDeepLink(action = 'connect') {
        const currentUrl = encodeURIComponent(window.location.href);
        
        // Phantom universal link for mobile
        // This will open Phantom app if installed, or App Store/Play Store if not
        if (action === 'connect') {
            return `https://phantom.app/ul/browse/${currentUrl}`;
        }
        
        return `https://phantom.app/ul/browse/${currentUrl}`;
    }
    
    /**
     * Open Phantom app on mobile (redirect)
     */
    openPhantomMobile() {
        const deepLink = this.getPhantomDeepLink();
        console.log('📱 Opening Phantom mobile app...');
        window.location.href = deepLink;
    }
    
    /**
     * Connect to Phantom wallet
     * @returns {Promise<{ success: boolean, publicKey?: string, error?: string, mobileRedirect?: boolean }>}
     */
    async connect() {
        // Desktop or Phantom in-app browser - use direct provider
        const provider = this.getProvider();
        
        if (provider) {
            try {
                // Request connection
                const response = await provider.connect();
                this.publicKey = response.publicKey.toString();
                this.connected = true;
                
                // Set up event listeners
                provider.on('disconnect', () => {
                    this.connected = false;
                    this.publicKey = null;
                    this.emit('disconnect');
                });
                
                provider.on('accountChanged', (publicKey) => {
                    if (publicKey) {
                        this.publicKey = publicKey.toString();
                        this.emit('accountChanged', this.publicKey);
                    } else {
                        this.connected = false;
                        this.publicKey = null;
                        this.emit('disconnect');
                    }
                });
                
                this.emit('connect', this.publicKey);
                console.log(`🔐 Phantom connected: ${this.publicKey.slice(0, 8)}...`);
                
                return {
                    success: true,
                    publicKey: this.publicKey
                };
            } catch (error) {
                console.error('Phantom connect error:', error);
                
                // User rejected
                if (error.code === 4001) {
                    return {
                        success: false,
                        error: 'USER_REJECTED',
                        message: 'Connection rejected by user'
                    };
                }
                
                return {
                    success: false,
                    error: error.code || 'CONNECTION_FAILED',
                    message: error.message || 'Failed to connect to Phantom'
                };
            }
        }
        
        // Mobile - need to redirect to Phantom app
        if (this.isMobile) {
            return {
                success: false,
                error: 'MOBILE_REDIRECT_NEEDED',
                message: 'Please open this site in the Phantom app browser',
                mobileRedirect: true,
                phantomUrl: this.getPhantomDeepLink()
            };
        }
        
        // Desktop - Phantom not installed
        return {
            success: false,
            error: 'PHANTOM_NOT_INSTALLED',
            message: 'Phantom wallet extension is not installed',
            installUrl: 'https://phantom.app/'
        };
    }
    
    /**
     * Disconnect from Phantom
     */
    async disconnect() {
        const provider = this.getProvider();
        
        if (provider && this.connected) {
            try {
                await provider.disconnect();
            } catch (e) {
                // Ignore disconnect errors
            }
        }
        
        this.connected = false;
        this.publicKey = null;
        this.emit('disconnect');
    }
    
    /**
     * Sign a Solana transaction
     * @param {Transaction} transaction - The transaction to sign
     * @returns {Promise<{ success: boolean, signedTransaction?: Transaction, error?: string }>}
     */
    async signTransaction(transaction) {
        const provider = this.getProvider();
        
        if (!provider || !this.connected) {
            return {
                success: false,
                error: 'NOT_CONNECTED',
                message: 'Wallet not connected'
            };
        }
        
        try {
            console.log('✍️ Requesting transaction signature from Phantom...');
            
            // Sign the transaction
            const signedTransaction = await provider.signTransaction(transaction);
            
            console.log('✅ Transaction signed successfully');
            
            return {
                success: true,
                signedTransaction
            };
        } catch (error) {
            console.error('Sign transaction error:', error);
            
            // User rejected the signature
            if (error.code === 4001 || error.message?.includes('User rejected')) {
                return {
                    success: false,
                    error: 'USER_REJECTED',
                    message: 'Transaction cancelled by user'
                };
            }
            
            return {
                success: false,
                error: error.code || 'SIGN_FAILED',
                message: error.message || 'Failed to sign transaction'
            };
        }
    }
    
    /**
     * Sign a message for authentication
     * @param {string} message - The message to sign (from server challenge)
     * @returns {Promise<{ success: boolean, signature?: string, error?: string }>}
     */
    async signMessage(message) {
        const provider = this.getProvider();
        
        if (!provider || !this.connected) {
            return {
                success: false,
                error: 'NOT_CONNECTED',
                message: 'Wallet not connected'
            };
        }
        
        try {
            // Encode message to bytes
            const messageBytes = new TextEncoder().encode(message);
            
            // Sign the message
            const signedMessage = await provider.signMessage(messageBytes, 'utf8');
            
            // Convert signature to base58
            const signature = bs58.encode(signedMessage.signature);
            
            return {
                success: true,
                signature
            };
        } catch (error) {
            console.error('Sign message error:', error);
            
            // User rejected the signature
            if (error.code === 4001) {
                return {
                    success: false,
                    error: 'USER_REJECTED',
                    message: 'User rejected the signature request'
                };
            }
            
            return {
                success: false,
                error: error.code || 'SIGN_FAILED',
                message: error.message || 'Failed to sign message'
            };
        }
    }
    
    /**
     * Send native SOL to a recipient
     * @param {string} recipientAddress - Wallet address to send SOL to
     * @param {number} amountSol - Amount in SOL (e.g., 0.1 = 0.1 SOL)
     * @param {string} memo - Optional memo for the transaction
     * @returns {Promise<{ success: boolean, signature?: string, error?: string }>}
     */
    async sendSOL(recipientAddress, amountSol, memo = '') {
        const provider = this.getProvider();
        
        if (!provider || !this.connected) {
            return {
                success: false,
                error: 'NOT_CONNECTED',
                message: 'Wallet not connected'
            };
        }
        
        try {
            const { Connection, PublicKey, Transaction, SystemProgram, LAMPORTS_PER_SOL } = await import('@solana/web3.js');
            const { createMemoInstruction } = await import('@solana/spl-memo');
            
            const SOLANA_RPC_URL = import.meta.env.VITE_SOLANA_RPC_URL || 'https://api.mainnet-beta.solana.com';
            
            console.log(`💸 Sending ${amountSol} SOL to ${recipientAddress.slice(0, 8)}...`);
            
            const connection = new Connection(SOLANA_RPC_URL, {
                commitment: 'confirmed',
                confirmTransactionInitialTimeout: 60000
            });
            
            const fromPubkey = new PublicKey(this.publicKey);
            const toPubkey = new PublicKey(recipientAddress);
            const lamports = Math.floor(amountSol * LAMPORTS_PER_SOL);
            
            // Get latest blockhash
            const { blockhash } = await connection.getLatestBlockhash('confirmed');
            
            // Create transaction with proper structure for Phantom compatibility
            const transaction = new Transaction({
                recentBlockhash: blockhash,
                feePayer: fromPubkey
            }).add(
                SystemProgram.transfer({
                    fromPubkey,
                    toPubkey,
                    lamports
                })
            );
            // Transaction version is automatically set to 0 (legacy) which Phantom parses well
            
            // Add memo instruction if provided (helps with transaction transparency and security)
            if (memo && memo.trim()) {
                transaction.add(
                    createMemoInstruction(
                        Buffer.from(memo, 'utf8'),
                        [fromPubkey] // Signer for memo
                    )
                );
                console.log(`   Memo: ${memo}`);
            }
            
            // Try to use Phantom's sendTransaction method which properly displays transaction details
            // Fallback to signTransaction + sendRawTransaction if sendTransaction is not available
            let signature;
            
            // Check if sendTransaction exists and is a function
            const hasSendTransaction = provider.sendTransaction && typeof provider.sendTransaction === 'function';
            
            if (hasSendTransaction) {
                try {
                    console.log('✍️ Using Phantom sendTransaction (shows details in popup)...');
                    signature = await provider.sendTransaction(transaction, connection, {
                        skipPreflight: false,
                        preflightCommitment: 'confirmed'
                    });
                    console.log(`✅ SOL sent via sendTransaction! Tx: ${signature}`);
                } catch (sendError) {
                    // If sendTransaction fails, fall back to sign + send
                    console.warn('⚠️ sendTransaction failed, using fallback:', sendError.message);
                    console.warn('   Error details:', sendError);
                    const signedTx = await provider.signTransaction(transaction);
                    signature = await connection.sendRawTransaction(signedTx.serialize(), {
                        skipPreflight: false,
                        preflightCommitment: 'confirmed'
                    });
                    console.log(`✅ SOL sent via fallback! Tx: ${signature}`);
                }
            } else {
                // Fallback: sign then send
                console.log('⚠️ sendTransaction not available, using signTransaction + sendRawTransaction (fallback)...');
                console.log('   Provider methods:', Object.keys(provider).filter(k => typeof provider[k] === 'function'));
                const signedTx = await provider.signTransaction(transaction);
                signature = await connection.sendRawTransaction(signedTx.serialize(), {
                    skipPreflight: false,
                    preflightCommitment: 'confirmed'
                });
                console.log(`✅ SOL sent via fallback! Tx: ${signature}`);
            }
            
            return {
                success: true,
                signature
            };
            
        } catch (error) {
            console.error('Send SOL error:', error);
            
            if (error.code === 4001 || error.message?.includes('User rejected')) {
                return {
                    success: false,
                    error: 'USER_REJECTED',
                    message: 'Transaction cancelled by user'
                };
            }
            
            if (error.message?.includes('insufficient') || error.message?.includes('Insufficient')) {
                return {
                    success: false,
                    error: 'INSUFFICIENT_BALANCE',
                    message: 'Insufficient SOL balance'
                };
            }
            
            return {
                success: false,
                error: error.code || 'SEND_FAILED',
                message: error.message || 'Failed to send SOL'
            };
        }
    }
    
    /**
     * Get the current public key
     */
    getPublicKey() {
        return this.publicKey;
    }
    
    /**
     * Check if wallet is connected
     */
    isConnected() {
        return this.connected && this.publicKey !== null;
    }
    
    /**
     * Get mobile status
     */
    getMobileStatus() {
        return {
            isMobile: this.isMobile,
            isPhantomBrowser: isPhantomBrowser(),
            needsRedirect: this.needsMobileDeepLink()
        };
    }
    
    // Event system
    on(event, callback) {
        if (!this.listeners.has(event)) {
            this.listeners.set(event, []);
        }
        this.listeners.get(event).push(callback);
        return () => this.off(event, callback);
    }
    
    off(event, callback) {
        if (this.listeners.has(event)) {
            const callbacks = this.listeners.get(event);
            const index = callbacks.indexOf(callback);
            if (index > -1) callbacks.splice(index, 1);
        }
    }
    
    emit(event, data) {
        if (this.listeners.has(event)) {
            this.listeners.get(event).forEach(cb => cb(data));
        }
    }
}

export default PhantomWallet;
