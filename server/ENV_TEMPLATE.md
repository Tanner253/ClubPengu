# SERVER
PORT
NODE_ENV
MONGODB_URI
JWT_SECRET

# SOLANA
SOLANA_RPC_URL
SOLANA_NETWORK
CPW3_TOKEN_ADDRESS
RENT_WALLET_ADDRESS

# IGLOO CONFIG
DAILY_RENT_CPW3
MINIMUM_BALANCE_CPW3
GRACE_PERIOD_HOURS

# ═══════════════════════════════════════════════════════════════════════════════
# CUSTODIAL WALLET FOR WAGER SETTLEMENTS
# ═══════════════════════════════════════════════════════════════════════════════
# 
# ⚠️⚠️⚠️ CRITICAL SECURITY WARNING ⚠️⚠️⚠️
# 
# The private key below is the MOST SENSITIVE value in this entire system.
# - NEVER log this value anywhere (client or server)
# - NEVER include in error messages
# - NEVER commit to git
# - NEVER share via chat/email
# - Generate a DEDICATED wallet - do NOT use your main wallet
# 
# The server will:
# - Read this value ONCE at startup
# - Immediately DELETE it from process.env 
# - Zero out any intermediate buffers
# - Never expose it via any API or log
#
# If compromised, regenerate immediately and transfer remaining funds.
#
# Private key in Base58 format (from `solana-keygen new`)
# CUSTODIAL_WALLET_PRIVATE_KEY=<base58_private_key>

# Admin key for emergency unlock (generate random string)
# CUSTODIAL_ADMIN_KEY=<random_secure_string>

# Security Limits (optional - defaults shown)
# CUSTODIAL_MAX_SINGLE_PAYOUT=1000000000000   # Max per payout in token base units
# CUSTODIAL_MAX_HOURLY_PAYOUTS=100            # Max payouts per hour
# CUSTODIAL_MAX_DAILY_PAYOUTS=1000            # Max payouts per day
# CUSTODIAL_FAILURE_THRESHOLD=5               # Failures before lockdown
# CUSTODIAL_LOCKDOWN_MINUTES=30               # Lockdown duration
# CUSTODIAL_MIN_INTERVAL=10                   # Min seconds between payouts to same wallet

# ═══════════════════════════════════════════════════════════════════════════════
# P2P RAKE CONFIGURATION
# ═══════════════════════════════════════════════════════════════════════════════
# 
# 5% rake is taken from all P2P wager matches and sent to the rake wallet.
# This generates revenue for the platform from player-vs-player games.
#
# RAKE_WALLET - The wallet address that receives rake payments (SOL address)
RAKE_WALLET=

# RAKE_PERCENT - Percentage of pot taken as rake (default: 5%)
# Value is in percent (5 = 5%)
RAKE_PERCENT=5
