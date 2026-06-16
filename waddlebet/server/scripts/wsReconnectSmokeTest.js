/**
 * One-shot reconnect smoke test — run while dev server is on ws://localhost:3001
 * node scripts/wsReconnectSmokeTest.js
 */
import WebSocket from 'ws';

const URL = process.env.WS_URL || 'ws://localhost:3001';

function connectOnce(label) {
    return new Promise((resolve, reject) => {
        const ws = new WebSocket(URL);
        const messages = [];
        const timeout = setTimeout(() => {
            ws.close();
            reject(new Error(`${label}: timed out waiting for messages`));
        }, 8000);

        ws.on('open', () => {
            ws.send(JSON.stringify({ type: 'ping' }));
            ws.send(JSON.stringify({
                type: 'auth_restore',
                token: 'invalid-token-for-smoke-test',
                walletAddress: 'FakeWallet1111111111111111111111111111'
            }));
        });

        ws.on('message', (data) => {
            messages.push(JSON.parse(data.toString()));
            const types = messages.map((m) => m.type);
            if (types.includes('connected') && types.includes('pong') && types.includes('auth_failure')) {
                clearTimeout(timeout);
                ws.close();
                resolve(messages);
            }
        });

        ws.on('error', (err) => {
            clearTimeout(timeout);
            reject(new Error(`${label}: ${err.message || err.code || String(err)}`));
        });
    });
}

async function main() {
    console.log(`Testing reconnect against ${URL}...`);

    const first = await connectOnce('first connection');
    console.log('First connection message types:', first.map((m) => m.type));

    await new Promise((r) => setTimeout(r, 500));

    const second = await connectOnce('reconnect');
    console.log('Reconnect message types:', second.map((m) => m.type));

    const firstConnected = first.find((m) => m.type === 'connected');
    const secondConnected = second.find((m) => m.type === 'connected');
    const secondAuthFail = second.find((m) => m.type === 'auth_failure');

    if (!firstConnected?.playerId || !secondConnected?.playerId) {
        throw new Error('Missing playerId on connect');
    }
    if (firstConnected.playerId === secondConnected.playerId) {
        throw new Error('Expected new playerId after reconnect');
    }
    if (!secondAuthFail) {
        throw new Error('Expected auth_failure for invalid restore token on reconnect');
    }

    console.log('OK: reconnect gets new playerId and server still validates auth_restore');
    console.log(`  first playerId:  ${firstConnected.playerId}`);
    console.log(`  second playerId: ${secondConnected.playerId}`);
    console.log(`  auth_failure:    ${secondAuthFail.error}`);
}

main().catch((err) => {
    console.error('Smoke test failed:', err.message);
    process.exit(1);
});
