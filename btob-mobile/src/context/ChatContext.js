import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { BASE_URL } from '../api/client';

const ChatContext = createContext();

export const ChatProvider = ({ children }) => {
    const [threads, setThreads] = useState([]);
    const [unreadCount, setUnreadCount] = useState(0);

    // This context could also handle global socket for notifications of new messages
    // but for now, we'll keep it simple and focus on the hook for specific rooms.

    return (
        <ChatContext.Provider value={{ threads, setThreads, unreadCount, setUnreadCount }}>
            {children}
        </ChatContext.Provider>
    );
};

export const useChat = (threadId) => {
    const [messages, setMessages] = useState([]);
    const [connected, setConnected] = useState(false);
    const socket = useRef(null);

    const connect = useCallback(async () => {
        if (!threadId) return;

        const token = await AsyncStorage.getItem('access_token');
        const guestId = await AsyncStorage.getItem('guest_id');
        
        if (!token && !guestId) return;

        // Derive WS URL from BASE_URL
        const wsBase = BASE_URL.replace('http', 'ws').replace('/api', '/ws/chat');
        const url = `${wsBase}/${threadId}/?token=${token || ''}&guest_id=${guestId || ''}`;


        socket.current = new WebSocket(url);

        socket.current.onopen = () => {
            console.log('Chat Socket Connected');
            setConnected(true);
        };

        socket.current.onmessage = (e) => {
            const data = JSON.parse(e.data);
            if (data.message) {
                setMessages((prev) => [...prev, data.message]);
            }
        };

        socket.current.onerror = (e) => {
            console.error('Chat Socket Error', e);
        };

        socket.current.onclose = () => {
            console.log('Chat Socket Closed');
            setConnected(false);
        };
    }, [threadId]);

    const sendMessage = useCallback((text) => {
        if (socket.current && connected) {
            socket.current.send(JSON.stringify({ message: text }));
        }
    }, [connected]);

    useEffect(() => {
        connect();
        return () => {
            if (socket.current) {
                socket.current.close();
            }
        };
    }, [connect]);

    return { messages, setMessages, sendMessage, connected };
};

export const useChatContext = () => useContext(ChatContext);
