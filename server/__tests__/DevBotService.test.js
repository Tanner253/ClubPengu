import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import devBotService, { BOT_CONFIG } from '../services/DevBotService.js';

// Mock the services
const mockChallengeService = {
    acceptChallenge: vi.fn(),
    denyChallenge: vi.fn()
};

const mockMatchService = {
    makeMove: vi.fn(),
    getMatch: vi.fn()
};

const mockSendToPlayer = vi.fn();

describe('DevBotService', () => {
    beforeEach(() => {
        // Reset all mocks
        vi.clearAllMocks();
        
        // Initialize the service
        devBotService.init({
            challengeService: mockChallengeService,
            matchService: mockMatchService,
            sendToPlayer: mockSendToPlayer
        });
    });
    
    afterEach(() => {
        devBotService.cleanup();
    });
    
    describe('initialization', () => {
        it('should create a bot player with correct config', () => {
            const bot = devBotService.getBotPlayer();
            
            expect(bot).toBeDefined();
            expect(bot.id).toBe(BOT_CONFIG.id);
            expect(bot.name).toBe(BOT_CONFIG.name);
            expect(bot.room).toBe(BOT_CONFIG.room);
            expect(bot.position).toEqual(BOT_CONFIG.position);
            expect(bot.isBot).toBe(true);
            expect(bot.isAuthenticated).toBe(true);
        });
        
        it('should correctly identify bot player ID', () => {
            expect(devBotService.isBot(BOT_CONFIG.id)).toBe(true);
            expect(devBotService.isBot('some_other_id')).toBe(false);
        });
    });
    
    describe('challenge handling', () => {
        it('should accept challenges targeted at bot', async () => {
            const challenge = {
                challengeId: 'test_challenge_1',
                challengerName: 'TestPlayer',
                challengerId: 'player_123',
                targetId: BOT_CONFIG.id,
                gameType: 'tic_tac_toe',
                wagerAmount: 100
            };
            
            mockChallengeService.acceptChallenge.mockResolvedValue({ success: true });
            
            const handled = await devBotService.handleChallenge(challenge);
            
            expect(handled).toBe(true);
            
            // Wait for the delayed acceptance
            await new Promise(resolve => setTimeout(resolve, 3500));
            
            expect(mockChallengeService.acceptChallenge).toHaveBeenCalledWith(
                challenge.challengeId,
                BOT_CONFIG.id
            );
        });
        
        it('should ignore challenges not targeted at bot', async () => {
            const challenge = {
                challengeId: 'test_challenge_2',
                challengerName: 'TestPlayer',
                challengerId: 'player_123',
                targetId: 'other_player',
                gameType: 'tic_tac_toe'
            };
            
            const handled = await devBotService.handleChallenge(challenge);
            
            expect(handled).toBe(false);
            expect(mockChallengeService.acceptChallenge).not.toHaveBeenCalled();
        });
        
        it('should decline challenges when bot is already in a match', async () => {
            // Set bot as in a match
            devBotService.activeMatch = { id: 'existing_match' };
            
            const challenge = {
                challengeId: 'test_challenge_3',
                challengerName: 'TestPlayer',
                targetId: BOT_CONFIG.id,
                gameType: 'tic_tac_toe'
            };
            
            await devBotService.handleChallenge(challenge);
            
            expect(mockChallengeService.denyChallenge).toHaveBeenCalledWith(
                challenge.challengeId,
                BOT_CONFIG.id
            );
        });
    });
    
    describe('match handling', () => {
        it('should track match start when bot is player1', () => {
            const match = {
                id: 'match_1',
                gameType: 'tic_tac_toe',
                player1: { id: BOT_CONFIG.id, name: BOT_CONFIG.name },
                player2: { id: 'opponent', name: 'Opponent' },
                state: { board: Array(9).fill(null), currentTurn: 'X' }
            };
            
            const handled = devBotService.handleMatchStart(match);
            
            expect(handled).toBe(true);
            expect(devBotService.activeMatch).toBeDefined();
            expect(devBotService.activeMatch.id).toBe('match_1');
            expect(devBotService.activeMatch.isBotPlayer1).toBe(true);
        });
        
        it('should track match start when bot is player2', () => {
            const match = {
                id: 'match_2',
                gameType: 'tic_tac_toe',
                player1: { id: 'opponent', name: 'Opponent' },
                player2: { id: BOT_CONFIG.id, name: BOT_CONFIG.name },
                state: { board: Array(9).fill(null), currentTurn: 'X' }
            };
            
            const handled = devBotService.handleMatchStart(match);
            
            expect(handled).toBe(true);
            expect(devBotService.activeMatch).toBeDefined();
            expect(devBotService.activeMatch.isBotPlayer1).toBe(false);
        });
        
        it('should ignore matches not involving bot', () => {
            const match = {
                id: 'match_3',
                gameType: 'tic_tac_toe',
                player1: { id: 'player1', name: 'Player1' },
                player2: { id: 'player2', name: 'Player2' },
                state: { board: Array(9).fill(null) }
            };
            
            const handled = devBotService.handleMatchStart(match);
            
            expect(handled).toBe(false);
            expect(devBotService.activeMatch).toBeNull();
        });
    });
    
    describe('TicTacToe AI', () => {
        beforeEach(() => {
            // Set up bot in an active match
            devBotService.activeMatch = {
                id: 'ttt_match',
                gameType: 'tic_tac_toe',
                isBotPlayer1: true,
                opponentId: 'human_player'
            };
            
            mockMatchService.makeMove.mockReturnValue({ success: true });
        });
        
        it('should make a move on empty board', () => {
            const state = {
                board: [null, null, null, null, null, null, null, null, null],
                currentTurn: 'X'
            };
            
            devBotService.makeTicTacToeMove('ttt_match', state);
            
            expect(mockMatchService.makeMove).toHaveBeenCalledWith(
                'ttt_match',
                BOT_CONFIG.id,
                expect.objectContaining({ position: expect.any(Number) })
            );
            
            // Position should be 0-8
            const call = mockMatchService.makeMove.mock.calls[0];
            expect(call[2].position).toBeGreaterThanOrEqual(0);
            expect(call[2].position).toBeLessThanOrEqual(8);
        });
        
        it('should only move to empty cells', () => {
            const state = {
                board: ['X', 'O', 'X', 'O', 'X', 'O', 'X', null, null],
                currentTurn: 'X'
            };
            
            devBotService.makeTicTacToeMove('ttt_match', state);
            
            const call = mockMatchService.makeMove.mock.calls[0];
            // Only positions 7 and 8 are empty
            expect([7, 8]).toContain(call[2].position);
        });
        
        it('should not move if board is full', () => {
            const state = {
                board: ['X', 'O', 'X', 'O', 'X', 'O', 'X', 'O', 'X'],
                currentTurn: 'X'
            };
            
            devBotService.makeTicTacToeMove('ttt_match', state);
            
            expect(mockMatchService.makeMove).not.toHaveBeenCalled();
        });
    });
    
    describe('match state handling', () => {
        beforeEach(() => {
            devBotService.activeMatch = {
                id: 'state_match',
                gameType: 'tic_tac_toe',
                isBotPlayer1: false, // Bot is O
                opponentId: 'human_player'
            };
        });
        
        it('should respond to state update when it is bot turn', async () => {
            const state = {
                board: ['X', null, null, null, null, null, null, null, null],
                currentTurn: 'O' // Bot's turn
            };
            
            mockMatchService.makeMove.mockReturnValue({ success: true });
            
            devBotService.handleMatchState('state_match', state);
            
            // Wait for delayed move
            await new Promise(resolve => setTimeout(resolve, 2500));
            
            expect(mockMatchService.makeMove).toHaveBeenCalled();
        });
        
        it('should not respond when it is opponent turn', async () => {
            const state = {
                board: ['X', null, null, null, null, null, null, null, null],
                currentTurn: 'X' // Opponent's turn
            };
            
            devBotService.handleMatchState('state_match', state);
            
            // Wait to ensure no delayed move happens
            await new Promise(resolve => setTimeout(resolve, 500));
            
            expect(mockMatchService.makeMove).not.toHaveBeenCalled();
        });
        
        it('should clear active match on game complete', () => {
            const state = {
                board: ['X', 'X', 'X', 'O', 'O', null, null, null, null],
                winner: 'X',
                phase: 'complete'
            };
            
            devBotService.handleMatchState('state_match', state);
            
            expect(devBotService.activeMatch).toBeNull();
        });
    });
    
    describe('match end handling', () => {
        it('should clean up active match on end', () => {
            devBotService.activeMatch = { id: 'ending_match' };
            
            const handled = devBotService.handleMatchEnd('ending_match');
            
            expect(handled).toBe(true);
            expect(devBotService.activeMatch).toBeNull();
        });
        
        it('should not handle end for different match', () => {
            devBotService.activeMatch = { id: 'my_match' };
            
            const handled = devBotService.handleMatchEnd('other_match');
            
            expect(handled).toBe(false);
            expect(devBotService.activeMatch).not.toBeNull();
        });
    });
    
    describe('cleanup', () => {
        it('should reset all state on cleanup', () => {
            devBotService.activeMatch = { id: 'test' };
            devBotService.pendingChallenges.set('ch1', { id: 'ch1' });
            
            devBotService.cleanup();
            
            expect(devBotService.activeMatch).toBeNull();
            expect(devBotService.pendingChallenges.size).toBe(0);
        });
    });
});

describe('BOT_CONFIG', () => {
    it('should have required properties', () => {
        expect(BOT_CONFIG.id).toBe('dev_bot_wager');
        expect(BOT_CONFIG.name).toBe('🤖 WagerBot');
        expect(BOT_CONFIG.room).toBe('town');
        expect(BOT_CONFIG.position).toEqual({ x: 105, y: 0, z: 100 });
    });
    
    it('should have appearance settings matching client format', () => {
        expect(BOT_CONFIG.appearance).toBeDefined();
        expect(BOT_CONFIG.appearance.skin).toBe('purple');
        expect(BOT_CONFIG.appearance.hat).toBe('tophat');
        expect(BOT_CONFIG.appearance.eyes).toBe('normal');
        expect(BOT_CONFIG.appearance.mouth).toBe('beak');
    });
});

