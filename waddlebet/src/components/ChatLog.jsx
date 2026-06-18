/**
 * ChatLog - RuneScape-styled tabbed chat (global, room, guild, whisper, casino, announcements, market)
 */

import React, { useState, useEffect, useLayoutEffect, useRef, useCallback, useMemo } from 'react';
import { useMultiplayer } from '../multiplayer';
import { useLanguage } from '../i18n';
import { CHAT_TAB_CONFIG, getStaffChatTag, resolveMessageStaffRole } from '../utils/chatChannels';
import {
    buildCommandInput,
    canExecuteCommand,
    completeChatInput,
    getAllChatSuggestions,
    getHelpMessages,
    getIncompleteWarpMessage,
    getUnknownCommandMessage,
    isDevEnvironment,
    isHelpCommand,
    isServerHandledSlashCommand,
    isStaffRole,
    isUnknownSlashCommand,
    resolveCommandTextOnSend,
    shouldShowChatSuggestions
} from '../utils/chatCommands';

const MESSAGE_TYPE_CLASS = {
    local: 'rs-chat-msg--local',
    whisperIn: 'rs-chat-msg--whisperIn',
    whisperOut: 'rs-chat-msg--whisperOut',
    system: 'rs-chat-msg--system',
    afk: 'rs-chat-msg--afk',
    emote: 'rs-chat-msg--system',
    casino: 'rs-chat-msg--casino',
    announcement: 'rs-chat-msg--announcement',
    market: 'rs-chat-msg--market'
};

const CHAT_MINIMIZED_KEY = 'waddlebet_chat_minimized';

const ChatLog = ({ isMobile = false, isOpen = true, onClose, minigameMode = false, onNewMessage }) => {
    const {
        chatByChannel,
        playerId,
        playerName,
        sendChat,
        sendAfk,
        getPlayersData,
        userData,
        addLocalChatMessage,
        addPlayerLocalMessage,
        unreadChatTabs,
        hasWhisperActivity,
        activeChatTab,
        setActiveChatTab,
        registerChatBubbleCallback
    } = useMultiplayer();
    const { t } = useLanguage();

    const [isActive, setIsActive] = useState(false);
    const [isMinimized, setIsMinimized] = useState(() => {
        if (typeof window === 'undefined') return false;
        return window.localStorage.getItem(CHAT_MINIMIZED_KEY) === 'true';
    });
    const [inputValue, setInputValue] = useState('');
    const [autocompleteIndex, setAutocompleteIndex] = useState(0);
    const [lastTabInput, setLastTabInput] = useState('');
    const [suggestionIndex, setSuggestionIndex] = useState(0);
    const [inputReadonly, setInputReadonly] = useState(true);
    const messagesEndRef = useRef(null);
    const messagesRef = useRef(null);
    const isNearBottomRef = useRef(true);
    const panelRef = useRef(null);
    const inputRef = useRef(null);
    const containerRef = useRef(null);
    const fadeTimeoutRef = useRef(null);

    const visibleTabs = useMemo(() => {
        return CHAT_TAB_CONFIG.filter((tab) => {
            if (tab.conditional && !hasWhisperActivity) return false;
            return true;
        });
    }, [hasWhisperActivity]);

    const activeTabConfig = CHAT_TAB_CONFIG.find((tab) => tab.id === activeChatTab) || CHAT_TAB_CONFIG[1];
    const activeMessages = chatByChannel[activeChatTab] || [];
    const canWrite = activeTabConfig.writable && !activeTabConfig.comingSoon;
    const enterPlaceholder = activeChatTab === 'local'
        ? t('chat.placeholderLocal')
        : `[${t('chat.enterToChat')}]`;
    const hasUnread = Object.keys(unreadChatTabs).length > 0;

    const setMinimized = useCallback((next) => {
        setIsMinimized(next);
        if (typeof window !== 'undefined') {
            window.localStorage.setItem(CHAT_MINIMIZED_KEY, next ? 'true' : 'false');
        }
    }, []);

    const handleChatWheel = useCallback((e) => {
        const messagesEl = messagesRef.current;
        if (!messagesEl || messagesEl.contains(e.target)) return;

        const { scrollTop, scrollHeight, clientHeight } = messagesEl;
        const atTop = scrollTop <= 0;
        const atBottom = scrollTop + clientHeight >= scrollHeight - 1;
        if ((e.deltaY < 0 && atTop) || (e.deltaY > 0 && atBottom)) return;

        e.preventDefault();
        messagesEl.scrollTop += e.deltaY;
    }, []);

    useEffect(() => {
        if (minigameMode) {
            setMinimized(true);
        }
    }, [minigameMode]);

    useEffect(() => {
        const panelEl = panelRef.current;
        if (!panelEl) return undefined;

        panelEl.addEventListener('wheel', handleChatWheel, { passive: false });
        return () => panelEl.removeEventListener('wheel', handleChatWheel);
    }, [handleChatWheel, isMinimized, isMobile, isOpen, minigameMode]);

    const scrollMessagesToBottom = useCallback((instant = false) => {
        const el = messagesRef.current;
        if (!el) return;
        const top = Math.max(0, el.scrollHeight - el.clientHeight);
        if (instant || isMobile) {
            el.scrollTop = top;
        } else {
            el.scrollTo({ top, behavior: 'smooth' });
        }
        isNearBottomRef.current = true;
    }, [isMobile]);

    useEffect(() => {
        const el = messagesRef.current;
        if (!el) return undefined;

        const onScroll = () => {
            const threshold = 64;
            isNearBottomRef.current = el.scrollHeight - el.scrollTop - el.clientHeight < threshold;
        };
        el.addEventListener('scroll', onScroll, { passive: true });
        return () => el.removeEventListener('scroll', onScroll);
    }, [isMobile, isOpen, isMinimized, activeChatTab]);

    useEffect(() => {
        if (!onNewMessage) return undefined;
        return registerChatBubbleCallback(onNewMessage);
    }, [onNewMessage, registerChatBubbleCallback]);

    // scrollIntoView breaks inside mobile fixed modals (jumps to top). Scroll the list directly.
    useLayoutEffect(() => {
        if (isMobile && !isOpen) return;
        if (!isNearBottomRef.current) return;
        scrollMessagesToBottom(isMobile);
    }, [activeMessages, activeChatTab, isMobile, isOpen, scrollMessagesToBottom]);

    useLayoutEffect(() => {
        if (!isMobile || !isOpen) return;
        isNearBottomRef.current = true;
        scrollMessagesToBottom(true);
    }, [isMobile, isOpen, activeChatTab, scrollMessagesToBottom]);

    const resetFadeTimer = useCallback(() => {
        setIsActive(true);
        if (fadeTimeoutRef.current) clearTimeout(fadeTimeoutRef.current);
        fadeTimeoutRef.current = setTimeout(() => {
            if (document.activeElement !== inputRef.current) setIsActive(false);
        }, 8000);
    }, []);

    const handleFocus = () => {
        setInputReadonly(false);
        setIsActive(true);
        if (fadeTimeoutRef.current) clearTimeout(fadeTimeoutRef.current);
    };

    const handleBlur = () => {
        setInputReadonly(true);
        resetFadeTimer();
    };

    useEffect(() => {
        const handleGlobalClick = (e) => {
            if (document.activeElement !== inputRef.current) return;
            if (containerRef.current && !containerRef.current.contains(e.target)) {
                inputRef.current?.blur();
            }
        };
        document.addEventListener('click', handleGlobalClick, true);
        return () => document.removeEventListener('click', handleGlobalClick, true);
    }, []);

    const getAllOnlinePlayerNames = useCallback(() => {
        const playersData = getPlayersData?.();
        const names = new Set();
        if (playerName) names.add(playerName);
        playersData?.forEach((player) => {
            if (player.name) names.add(player.name);
        });
        return [...names].sort((a, b) => a.toLowerCase().localeCompare(b.toLowerCase()));
    }, [getPlayersData, playerName]);

    const isStaff = isStaffRole(userData);
    const isDev = isDevEnvironment();

    const staffRoleContext = useMemo(() => ({
        playerId,
        playerName,
        userRole: userData?.role || null
    }), [playerId, playerName, userData?.role]);

    const commandSuggestions = useMemo(
        () => getAllChatSuggestions(inputValue, { isStaff, isDev }),
        [inputValue, isStaff, isDev]
    );
    const showCommandSuggestions = canWrite
        && shouldShowChatSuggestions(inputValue)
        && commandSuggestions.length > 0;

    useEffect(() => {
        setSuggestionIndex(0);
    }, [inputValue, commandSuggestions.length]);

    const applyCommandSuggestion = useCallback((cmd) => {
        setInputValue(buildCommandInput(cmd));
        setSuggestionIndex(0);
        setAutocompleteIndex(0);
        setLastTabInput('');
        inputRef.current?.focus();
    }, []);

    const handleTabCompletion = useCallback(() => {
        const result = completeChatInput(inputValue, {
            playerNames: getAllOnlinePlayerNames(),
            selfName: playerName,
            isStaff,
            isDev,
            autocompleteIndex,
            lastTabInput
        });
        if (!result) return false;

        setInputValue(result.newInput);
        setAutocompleteIndex(result.autocompleteIndex);
        setLastTabInput(result.lastTabInput);
        return true;
    }, [inputValue, getAllOnlinePlayerNames, playerName, isStaff, isDev, autocompleteIndex, lastTabInput]);

    const finishSendInput = useCallback(() => {
        setInputValue('');
        resetFadeTimer();
        setAutocompleteIndex(0);
        setLastTabInput('');
        setSuggestionIndex(0);
        if (isMobile) {
            scrollMessagesToBottom(true);
            inputRef.current?.focus();
            requestAnimationFrame(() => scrollMessagesToBottom(true));
        } else {
            inputRef.current?.blur();
        }
    }, [isMobile, resetFadeTimer, scrollMessagesToBottom]);

    const handleSend = () => {
        if (!inputValue.trim() || !canWrite) return;

        const resolved = resolveCommandTextOnSend(inputValue, {
            showSuggestions: showCommandSuggestions,
            suggestions: commandSuggestions,
            suggestionIndex,
            isStaff
        });

        if (resolved.action === 'apply') {
            setInputValue(resolved.text);
            setSuggestionIndex(0);
            setAutocompleteIndex(0);
            setLastTabInput('');
            inputRef.current?.focus();
            return;
        }

        const text = resolved.text;

        const whisperMatch = text.match(/^\/w(?:hisper)?\s+(\S+)\s+(.+)$/i);
        if (whisperMatch) {
            const [, targetName, message] = whisperMatch;
            if (window.__multiplayerWs?.readyState === 1) {
                window.__multiplayerWs.send(JSON.stringify({ type: 'whisper', targetName, text: message }));
            }
            setActiveChatTab('whisper');
            finishSendInput();
            return;
        }

        const replyMatch = text.match(/^\/r\s+(.+)$/i);
        if (replyMatch) {
            const whispers = chatByChannel.whisper || [];
            const lastWhisper = [...whispers].reverse().find((m) => m.type === 'whisperIn' || m.whisperDirection === 'in');
            if (lastWhisper?.fromName) {
                if (window.__multiplayerWs?.readyState === 1) {
                    window.__multiplayerWs.send(JSON.stringify({
                        type: 'whisper',
                        targetName: lastWhisper.fromName,
                        text: replyMatch[1]
                    }));
                }
                setActiveChatTab('whisper');
            }
            finishSendInput();
            return;
        }

        if (isHelpCommand(text)) {
            getHelpMessages({ isStaff, isDev }).forEach((line) => {
                addLocalChatMessage(line);
            });
            finishSendInput();
            return;
        }

        if (text.toLowerCase() === '/spawn') {
            window.dispatchEvent(new CustomEvent('chatCommand', { detail: { command: 'spawn' } }));
            finishSendInput();
            return;
        }

        const afkMatch = text.match(/^\/afk(?:\s+(.*))?$/i);
        if (afkMatch) {
            const afkText = (afkMatch[1] || '').trim() || 'AFK';
            const displayMsg = `💤 ${afkText}`;
            addLocalChatMessage(displayMsg, { metadata: { isAfk: true }, name: playerName });
            setActiveChatTab('local');
            sendAfk(afkText);
            window.dispatchEvent(new CustomEvent('chatCommand', {
                detail: { command: 'afk', message: displayMsg }
            }));
            finishSendInput();
            return;
        }

        if (/^\/warp(\s|$)/i.test(text)) {
            if (!isStaff) {
                addLocalChatMessage(getUnknownCommandMessage(text));
                finishSendInput();
                return;
            }
            if (/^\/warp\s*$/i.test(text)) {
                addLocalChatMessage(getIncompleteWarpMessage({ isStaff }));
                finishSendInput();
                return;
            }
        }

        if (isServerHandledSlashCommand(text, { isStaff })) {
            const channel = activeChatTab === 'global' ? 'global' : 'room';
            sendChat(text, channel);
            finishSendInput();
            return;
        }

        if (isUnknownSlashCommand(text, { isStaff })) {
            addLocalChatMessage(getUnknownCommandMessage(text));
            finishSendInput();
            return;
        }

        if (activeChatTab === 'local') {
            addPlayerLocalMessage(text);
            finishSendInput();
            return;
        }

        const channel = activeChatTab === 'global' ? 'global' : 'room';
        sendChat(text, channel);
        finishSendInput();
    };

    const handleKeyDown = (e) => {
        if (showCommandSuggestions) {
            if (e.key === 'ArrowDown') {
                e.preventDefault();
                e.stopPropagation();
                setSuggestionIndex((i) => Math.min(i + 1, commandSuggestions.length - 1));
                return;
            }
            if (e.key === 'ArrowUp') {
                e.preventDefault();
                e.stopPropagation();
                setSuggestionIndex((i) => Math.max(i - 1, 0));
                return;
            }
        }

        if (e.key === 'Enter') {
            e.preventDefault();
            e.stopPropagation();
            handleSend();
        }
        if (e.key === 'Tab') {
            e.preventDefault();
            e.stopPropagation();
            if (showCommandSuggestions) {
                applyCommandSuggestion(commandSuggestions[suggestionIndex] || commandSuggestions[0]);
            } else {
                handleTabCompletion();
            }
        }
        if (e.key === 'Escape') {
            if (showCommandSuggestions && inputValue.length > 1) {
                e.preventDefault();
                e.stopPropagation();
                setInputValue('/');
                setSuggestionIndex(0);
                return;
            }
            inputRef.current?.blur();
            setAutocompleteIndex(0);
            setLastTabInput('');
            setSuggestionIndex(0);
        }
    };

    const focusInput = () => {
        if (canWrite) inputRef.current?.focus();
    };

    const formatTime = (timestamp) => {
        const date = new Date(timestamp);
        return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    };

    const renderStaffTag = (msg) => {
        const staffTag = getStaffChatTag(resolveMessageStaffRole(msg, {
            ...staffRoleContext,
            playersById: getPlayersData?.()
        }));
        if (!staffTag) return null;
        return <span className="rs-chat-staff-tag">[{staffTag}] </span>;
    };

    const renderPlayerChatLine = (msg, body, nameOverride = null) => {
        const nameClass = (nameOverride || msg.name) === playerName ? 'rs-chat-msg-self' : 'rs-chat-msg-name';

        return (
            <>
                {renderStaffTag(msg)}
                <span className={nameClass}>{nameOverride || msg.name}:</span>
                <span className="rs-chat-msg-body"> {body}</span>
            </>
        );
    };

    const renderMessage = (msg, idx) => {
        const isPlayerLine = msg.type === 'local'
            || msg.type === 'afk'
            || ((msg.channel === 'global' || msg.channel === 'room') && msg.playerId && msg.playerId !== 'system')
            || (!msg.type && !msg.channel);
        const isSystemLine = !isPlayerLine
            && (msg.type === 'system' || ['casino', 'announcement', 'market'].includes(msg.channel));
        const typeClass = (msg.type === 'system' && MESSAGE_TYPE_CLASS[msg.channel])
            ? MESSAGE_TYPE_CLASS[msg.channel]
            : MESSAGE_TYPE_CLASS[msg.type] || MESSAGE_TYPE_CLASS.local;
        const body = msg.text || msg.displayText;
        const timeLabel = msg.timestamp ? formatTime(msg.timestamp) : null;

        return (
            <div key={`${msg.id}-${idx}`} className={`rs-chat-msg ${typeClass}`}>
                {timeLabel && <span className="rs-chat-msg-time">[{timeLabel}] </span>}
                {msg.type === 'whisperIn' && (
                    <>
                        {renderStaffTag(msg)}
                        <span className="rs-chat-msg-name">[From {msg.fromName || msg.name}]: </span>
                        <span className="rs-chat-msg-body">{body}</span>
                    </>
                )}
                {msg.type === 'whisperOut' && (
                    <>
                        {renderStaffTag(msg)}
                        <span className="rs-chat-msg-name">{msg.name}: </span>
                        <span className="rs-chat-msg-body">{body}</span>
                    </>
                )}
                {isSystemLine && (
                    <>
                        <span className="rs-chat-msg-name">[{msg.name}] </span>
                        <span className="rs-chat-msg-body">{body}</span>
                    </>
                )}
                {isPlayerLine && (
                    renderPlayerChatLine(msg, body)
                )}
            </div>
        );
    };

    const renderInputArea = () => {
        if (!canWrite) {
            return <span className="rs-chat-readonly">{t('chat.readOnlyTab')}</span>;
        }

        const inputField = (
            <input
                ref={inputRef}
                id="chat-input-field"
                type="text"
                name="waddlebet-chat-input"
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                onKeyDown={handleKeyDown}
                onFocus={handleFocus}
                onBlur={handleBlur}
                placeholder={enterPlaceholder}
                className={`rs-chat-input ${isMobile ? '' : 'w-full'}`}
                maxLength={200}
                autoComplete="off"
                autoCorrect="off"
                autoCapitalize="off"
                spellCheck={false}
                readOnly={inputReadonly}
                enterKeyHint="send"
                data-lpignore="true"
                data-1p-ignore="true"
                data-form-type="other"
            />
        );

        const suggestions = showCommandSuggestions && (
            <div className="rs-chat-suggestions chat-scroll" role="listbox" aria-label={t('chat.commandSuggestions')}>
                {commandSuggestions.map((cmd, index) => (
                    <button
                        key={cmd.usage}
                        type="button"
                        role="option"
                        aria-selected={index === suggestionIndex}
                        className={`rs-chat-suggestion${index === suggestionIndex ? ' rs-chat-suggestion--active' : ''}`}
                        onMouseDown={(e) => {
                            e.preventDefault();
                            applyCommandSuggestion(cmd);
                        }}
                        onTouchEnd={(e) => {
                            e.preventDefault();
                            applyCommandSuggestion(cmd);
                        }}
                        onMouseEnter={() => setSuggestionIndex(index)}
                    >
                        <span className="rs-chat-suggestion-cmd">{cmd.usage}</span>
                        <span className="rs-chat-suggestion-desc">{cmd.description}</span>
                    </button>
                ))}
                <div className="rs-chat-suggestion-hint">
                    {isMobile ? t('chat.suggestionHintMobile') : t('chat.suggestionHint')}
                </div>
            </div>
        );

        if (isMobile) {
            return (
                <div className="rs-chat-input-row" onClick={(e) => { e.stopPropagation(); focusInput(); }}>
                    <div className="rs-chat-input-wrap">
                        {suggestions}
                        {inputField}
                    </div>
                    <button
                        type="button"
                        className="rs-chat-send"
                        onClick={handleSend}
                        disabled={!inputValue.trim()}
                        aria-label={t('chat.send')}
                    >
                        {t('chat.send')}
                    </button>
                </div>
            );
        }

        return (
            <div className="rs-chat-input-wrap" onClick={(e) => e.stopPropagation()}>
                {suggestions}
                {inputField}
            </div>
        );
    };

    const renderPanel = ({ showClose = false, showMinimize = false } = {}) => (
        <div
            ref={panelRef}
            className={`rs-chat-panel flex flex-col min-h-0 overflow-hidden${isMobile ? ' rs-chat-panel--mobile' : ''}`}
        >
            <div className="rs-chat-header">
                <span className="rs-chat-header-icon" aria-hidden="true">{activeTabConfig.icon}</span>
                <span className="rs-chat-header-title">{t(activeTabConfig.headerKey)}</span>
                {showMinimize && (
                    <button
                        type="button"
                        className="rs-chat-minimize"
                        onClick={() => setMinimized(true)}
                        aria-label={t('chat.minimize')}
                    >
                        −
                    </button>
                )}
                {showClose && (
                    <button type="button" className="rs-chat-close" onClick={onClose} aria-label={t('common.close')}>
                        ×
                    </button>
                )}
            </div>

            <div className="rs-chat-tabs">
                {visibleTabs.map((tab) => {
                    const isActiveTab = activeChatTab === tab.id;
                    const unread = !!unreadChatTabs[tab.id];
                    return (
                        <button
                            key={tab.id}
                            type="button"
                            onClick={() => setActiveChatTab(tab.id)}
                            className={`rs-chat-tab${isActiveTab ? ' rs-chat-tab--active' : ''}${unread ? ' rs-chat-tab--unread' : ''}`}
                            title={tab.comingSoon ? t('chat.tab.comingSoon') : t(tab.labelKey)}
                            aria-label={t(tab.labelKey)}
                        >
                            <span className="rs-chat-tab-icon" aria-hidden="true">{tab.icon}</span>
                        </button>
                    );
                })}
            </div>

            <div
                ref={messagesRef}
                className={`rs-chat-messages chat-scroll chat-messages overflow-y-auto overflow-x-hidden overscroll-contain${isMobile ? ' flex-1 min-h-0' : ''}`}
            >
                <div className="px-2 py-1.5 space-y-0.5">
                    {activeTabConfig.comingSoon ? (
                        <div className="rs-chat-empty">{t('chat.tab.comingSoon')}</div>
                    ) : activeMessages.length === 0 ? (
                        <div className="rs-chat-empty">{t('chat.noMessages')}</div>
                    ) : (
                        activeMessages.map(renderMessage)
                    )}
                    <div ref={messagesEndRef} />
                </div>
            </div>

            <div
                className={`rs-chat-footer${isMobile ? ' rs-chat-footer--mobile' : ''}`}
                onClick={isMobile ? undefined : focusInput}
            >
                {isMobile ? (
                    <>
                        <div className="rs-chat-player-row" title={playerName}>
                            💬 {playerName || t('chat.guest')}
                        </div>
                        {renderInputArea()}
                    </>
                ) : (
                    <>
                        <span className="rs-chat-player" title={playerName}>
                            💬 {playerName || t('chat.guest')}
                        </span>
                        {renderInputArea()}
                    </>
                )}
            </div>
        </div>
    );

    if (isMobile && !isOpen) return null;

    if (isMobile) {
        return (
            <div
                className={`fixed inset-0 pointer-events-auto flex items-center justify-center p-4 ${
                    minigameMode ? 'z-[10050]' : 'z-40'
                }`}
                onClick={(e) => { if (e.target === e.currentTarget) onClose?.(); }}
                data-no-camera="true"
            >
                <div className="absolute inset-0 bg-black/60" onClick={onClose} />
                <div
                    ref={containerRef}
                    onClick={(e) => e.stopPropagation()}
                    className="relative flex w-full max-w-md min-h-0 flex-col"
                    style={{ height: 'min(75dvh, calc(100dvh - 2rem))' }}
                >
                    {renderPanel({ showClose: true })}
                </div>
            </div>
        );
    }

    const chatPositionClass = minigameMode
        ? 'bottom-28 left-4'
        : isMobile
            ? 'bottom-24 left-3'
            : 'bottom-20 left-4';
    const chatWidthClass = minigameMode ? 'w-[18rem] max-w-[42vw]' : 'w-[30rem]';
    const chatZClass = minigameMode ? 'z-[10050]' : 'z-30';

    if (isMinimized) {
        return (
            <button
                type="button"
                onClick={() => setMinimized(false)}
                className={`rs-chat-collapsed fixed pointer-events-auto ${chatPositionClass} ${chatZClass}${hasUnread ? ' rs-chat-collapsed--unread' : ''}`}
                aria-label={t('chat.restore')}
                data-no-camera="true"
            >
                <span className="rs-chat-collapsed-icon" aria-hidden="true">💬</span>
                <span className="rs-chat-collapsed-tab" aria-hidden="true">{activeTabConfig.icon}</span>
                <span className="rs-chat-collapsed-label">{t('chat.title')}</span>
            </button>
        );
    }

    return (
        <div
            ref={containerRef}
            onMouseEnter={() => setIsActive(true)}
            onMouseLeave={() => !document.activeElement?.closest('.chat-log') && resetFadeTimer()}
            className={`chat-log fixed pointer-events-auto transition-opacity duration-300 flex flex-col ${chatPositionClass} ${chatWidthClass} ${chatZClass} ${isActive ? 'opacity-100' : 'opacity-70 hover:opacity-100'}`}
            data-no-camera="true"
        >
            {renderPanel({ showMinimize: true })}
        </div>
    );
};

export default ChatLog;
