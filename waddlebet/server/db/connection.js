/**
 * MongoDB Connection Module
 * Handles database connection with connection pooling and error handling
 */

import mongoose from 'mongoose';

// Connection state tracking
let isConnected = false;

/**
 * Connect to MongoDB Atlas
 * Uses connection pooling for efficient handling of multiple requests
 */
const connectDB = async () => {
    if (isConnected) {
        console.log('📦 Using existing MongoDB connection');
        return;
    }

    const mongoUri = process.env.MONGODB_URI;
    
    if (!mongoUri) {
        console.error('❌ MONGODB_URI environment variable is not set');
        console.log('⚠️ Running in memory-only mode (no data persistence)');
        return false;
    }

    try {
        const options = {
            maxPoolSize: 100,          // Maximum number of connections in pool
            minPoolSize: 10,           // Minimum connections to maintain
            serverSelectionTimeoutMS: 5000,  // Timeout for server selection
            socketTimeoutMS: 45000,    // Socket timeout
            family: 4,                 // Use IPv4
            retryWrites: true,
            w: 'majority',
            bufferMaxEntries: 0,       // Disable Mongoose buffering when disconnected (prevents timeout errors)
            bufferCommands: false      // Don't buffer commands when disconnected
        };

        await mongoose.connect(mongoUri, options);
        
        isConnected = true;
        console.log('🗄️ MongoDB Atlas connected successfully');
        
        // Connection event handlers
        mongoose.connection.on('error', (err) => {
            console.error('❌ MongoDB connection error:', err);
            isConnected = false;
        });

        mongoose.connection.on('disconnected', () => {
            console.log('⚠️ MongoDB disconnected');
            isConnected = false;
        });

        mongoose.connection.on('reconnected', () => {
            console.log('🔄 MongoDB reconnected');
            isConnected = true;
        });

        return true;
    } catch (error) {
        console.error('❌ MongoDB connection failed:', error.message);
        isConnected = false;
        return false;
    }
};

/**
 * Check if database is connected
 */
const isDBConnected = () => {
    return isConnected && mongoose.connection.readyState === 1;
};

/**
 * Graceful shutdown
 */
const disconnectDB = async () => {
    if (isConnected) {
        await mongoose.connection.close();
        isConnected = false;
        console.log('🔌 MongoDB connection closed');
    }
};

export { connectDB, isDBConnected, disconnectDB };
export default connectDB;





