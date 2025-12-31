# Quick Setup Guide

## What You Need

Since you checked out your friend's repo, you're missing the `.env` file which contains configuration.

## The Errors You're Seeing

The `MongooseError: Operation buffering timed out` errors are **normal** when MongoDB isn't configured. The server is designed to run **without a database** for basic gameplay (guest mode).

- ✅ **Game works**: You can still play, select characters (penguin/dog/frog), and enter the world
- ⚠️ **Limited features**: Some features like spaces, user accounts, and persistence won't work
- ✅ **No crashes**: The server handles missing DB gracefully

## What You Actually Need

### Minimum to Run (Guest Mode - No DB Required)
**Nothing!** The game runs without `.env` for basic gameplay.

### Full Setup (Optional - For Full Features)

Create `.env` files in these locations:

#### 1. Server `.env` (in `waddlebet/server/` folder)
```env
# Required for database features
MONGODB_URI=mongodb+srv://your-connection-string-here
JWT_SECRET=your-random-secret-key-here

# Optional - Server port (defaults to 3001)
PORT=3001
NODE_ENV=development

# Optional - Solana config (only needed for payments/wagers)
SOLANA_RPC_URL=https://api.mainnet-beta.solana.com
SOLANA_NETWORK=mainnet-beta
```

#### 2. Client `.env` (in `waddlebet/` folder - same level as `package.json`)
```env
# Optional - Only needed if using Solana features
VITE_SOLANA_RPC_URL=https://api.mainnet-beta.solana.com
VITE_CPW3_TOKEN_ADDRESS=your-token-address
VITE_RENT_WALLET_ADDRESS=your-rent-wallet
```

## Quick Test (No Setup Required)

1. **Start Server** (from `waddlebet/server/`):
   ```bash
   npm install
   npm run dev
   ```
   You'll see: `⚠️ Running without database - guest mode only` (this is OK!)

2. **Start Client** (from `waddlebet/`):
   ```bash
   npm install
   npm run dev
   ```

3. **Play!** You can:
   - Select penguin, dog, or frog characters
   - Enter the game world
   - Move around and interact
   - Everything except persistent accounts and spaces

## Getting MongoDB (Optional)

If you want full features, you'll need a MongoDB database:

1. **Free MongoDB Atlas** (easiest):
   - Go to https://www.mongodb.com/cloud/atlas
   - Create free account
   - Create a free cluster
   - Get connection string
   - Add to `server/.env` as `MONGODB_URI`

2. **Local MongoDB**:
   - Install MongoDB locally
   - Use: `MONGODB_URI=mongodb://localhost:27017/waddlebet`

## Summary

**You don't need anything to start playing!** The errors are harmless and the game runs fine in guest mode. Add `.env` files only if you want persistent accounts, spaces, or payment features.
