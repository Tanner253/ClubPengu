/**
 * Active Player Stats Script
 * 
 * Run with: node scripts/activePlayerStats.js
 * Make sure to set MONGODB_URI in your environment
 */

import mongoose from 'mongoose';
import dotenv from 'dotenv';

dotenv.config();

const MONGODB_URI = process.env.MONGODB_URI;

if (!MONGODB_URI) {
    console.error('❌ MONGODB_URI not set in environment');
    process.exit(1);
}

async function getActivePlayerStats() {
    try {
        console.log('🔌 Connecting to MongoDB...');
        await mongoose.connect(MONGODB_URI);
        console.log('✅ Connected!\n');

        const User = mongoose.connection.collection('users');
        
        const now = new Date();
        const oneDay = 24 * 60 * 60 * 1000;
        const oneWeek = 7 * oneDay;
        const oneMonth = 30 * oneDay;

        // Calculate date thresholds
        const oneDayAgo = new Date(now - oneDay);
        const oneWeekAgo = new Date(now - oneWeek);
        const oneMonthAgo = new Date(now - oneMonth);

        // Run all queries in parallel
        const [
            totalUsers,
            last24Hours,
            last7Days,
            last30Days,
            currentlyConnected,
            newUsersWeek,
            usersWithGames
        ] = await Promise.all([
            User.countDocuments({}),
            User.countDocuments({ lastLoginAt: { $gte: oneDayAgo } }),
            User.countDocuments({ lastLoginAt: { $gte: oneWeekAgo } }),
            User.countDocuments({ lastLoginAt: { $gte: oneMonthAgo } }),
            User.countDocuments({ isConnected: true }),
            User.countDocuments({ createdAt: { $gte: oneWeekAgo } }),
            User.countDocuments({ 'gameStats.overall.totalGamesPlayed': { $gt: 0 } })
        ]);

        // Get top players by activity (last 7 days)
        const activeUsers = await User.find(
            { lastLoginAt: { $gte: oneWeekAgo } },
            { username: 1, lastLoginAt: 1, 'stats.session.totalPlayTimeMinutes': 1, 'gameStats.overall.totalGamesPlayed': 1 }
        )
        .sort({ lastLoginAt: -1 })
        .limit(10)
        .toArray();

        // Get users by activity level (based on lastActiveAt for more precision)
        const activeToday = await User.countDocuments({ lastActiveAt: { $gte: oneDayAgo } });
        const activeThisWeek = await User.countDocuments({ lastActiveAt: { $gte: oneWeekAgo } });

        console.log('═══════════════════════════════════════════════════════');
        console.log('           🐧 WADDLEBET ACTIVE PLAYER STATS 🐧          ');
        console.log('═══════════════════════════════════════════════════════\n');

        console.log('📊 TOTAL COUNTS');
        console.log('───────────────────────────────────────────────────────');
        console.log(`   Total Registered Users:     ${totalUsers.toLocaleString()}`);
        console.log(`   Users Who Played Games:     ${usersWithGames.toLocaleString()}`);
        console.log(`   Currently Online:           ${currentlyConnected.toLocaleString()}`);
        console.log('');

        console.log('🕐 ACTIVE USERS (by last login)');
        console.log('───────────────────────────────────────────────────────');
        console.log(`   Last 24 Hours:              ${last24Hours.toLocaleString()}`);
        console.log(`   Last 7 Days:                ${last7Days.toLocaleString()} ⭐`);
        console.log(`   Last 30 Days:               ${last30Days.toLocaleString()}`);
        console.log('');

        console.log('⚡ ACTIVE USERS (by last activity)');
        console.log('───────────────────────────────────────────────────────');
        console.log(`   Active Today:               ${activeToday.toLocaleString()}`);
        console.log(`   Active This Week:           ${activeThisWeek.toLocaleString()}`);
        console.log('');

        console.log('📈 GROWTH');
        console.log('───────────────────────────────────────────────────────');
        console.log(`   New Users (Last 7 Days):    ${newUsersWeek.toLocaleString()}`);
        const retentionRate = totalUsers > 0 ? ((last7Days / totalUsers) * 100).toFixed(1) : 0;
        console.log(`   7-Day Retention Rate:       ${retentionRate}%`);
        console.log('');

        if (activeUsers.length > 0) {
            console.log('👥 RECENT ACTIVE USERS (Last 10)');
            console.log('───────────────────────────────────────────────────────');
            activeUsers.forEach((user, i) => {
                const lastLogin = new Date(user.lastLoginAt);
                const hoursAgo = Math.round((now - lastLogin) / (1000 * 60 * 60));
                const playtime = user.stats?.session?.totalPlayTimeMinutes || 0;
                const games = user.gameStats?.overall?.totalGamesPlayed || 0;
                console.log(`   ${i + 1}. ${user.username.padEnd(18)} ${hoursAgo}h ago | ${playtime}min played | ${games} games`);
            });
            console.log('');
        }

        console.log('═══════════════════════════════════════════════════════');
        console.log(`   Report generated: ${now.toISOString()}`);
        console.log('═══════════════════════════════════════════════════════\n');

    } catch (error) {
        console.error('❌ Error:', error.message);
    } finally {
        await mongoose.disconnect();
        console.log('🔌 Disconnected from MongoDB');
    }
}

getActivePlayerStats();

