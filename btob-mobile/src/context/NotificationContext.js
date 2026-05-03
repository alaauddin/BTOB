import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import { View, StyleSheet } from 'react-native';
import * as Haptics from 'expo-haptics';
import { Audio } from 'expo-av';
import * as Device from 'expo-device';
import * as Notifications from 'expo-notifications';
import Constants from 'expo-constants';
import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import client, { BASE_URL, setNotificationListener } from '../api/client';
import StandardToast from '../components/StandardToast';

const NotificationContext = createContext();

Notifications.setNotificationHandler({
    handleNotification: async () => ({
        shouldShowAlert: true,
        shouldPlaySound: true,
        shouldSetBadge: true,
    }),
});

export const NotificationProvider = ({ children }) => {
    const [notifications, setNotifications] = useState([]);
    const [unreadCount, setUnreadCount] = useState(0);
    const [toast, setToast] = useState(null);
    const [toastVisible, setToastVisible] = useState(false);
    const socket = useRef(null);
    const [connected, setConnected] = useState(false);

    const fetchNotifications = useCallback(async () => {
        try {
            const token = await AsyncStorage.getItem('access_token');
            if (!token) return;

            const response = await client.get('/notifications/');
            setNotifications(response.data.results || response.data);
            
            // Calculate unread count
            const unread = (response.data.results || response.data).filter(n => !n.is_read).length;
            setUnreadCount(unread);
        } catch (error) {
            console.error('Error fetching notifications:', error);
        }
    }, []);

    const playSound = async () => {
        try {
            const { sound } = await Audio.Sound.createAsync(
                { uri: 'https://assets.mixkit.co/active_storage/sfx/2857/2857-preview.mp3' } // Fast Light Ping
            );
            await sound.playAsync();
            // Automatically unload after playing
            sound.setOnPlaybackStatusUpdate((status) => {
                if (status.didJustFinish) {
                    sound.unloadAsync();
                }
            });
        } catch (error) {
            console.error('Error playing sound:', error);
        }
    };

    const showToast = useCallback((config) => {
        setToast(config);
        setToastVisible(true);

        // Physical feedback
        if (config.type === 'error') {
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
        } else if (config.type === 'success') {
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        } else {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
        }

        // Sound feedback
        playSound();

        const duration = config.isNetworkError ? 6000 : 3500;
        
        setTimeout(() => {
            setToastVisible(false);
        }, duration);
    }, []);

    const hideToast = () => setToastVisible(false);

    const markAsRead = async (id) => {
        try {
            await client.post(`/notifications/${id}/mark_read/`);
            setNotifications(prev => prev.map(n => n.id === id ? { ...n, is_read: true } : n));
            setUnreadCount(prev => Math.max(0, prev - 1));
        } catch (error) {
            console.error('Error marking notification as read:', error);
        }
    };

    const markAllAsRead = async () => {
        try {
            await client.post('/notifications/mark_all_read/');
            setNotifications(prev => prev.map(n => ({ ...n, is_read: true })));
            setUnreadCount(0);
        } catch (error) {
            console.error('Error marking all notifications as read:', error);
        }
    };

    const connectWebSocket = useCallback(async () => {
        const token = await AsyncStorage.getItem('access_token');
        if (!token) return;

        // Derive WS URL from BASE_URL
        const wsBase = BASE_URL.replace('http', 'ws').replace('/api', '/ws/notifications');
        const url = `${wsBase}/?token=${token}`;

        if (socket.current) {
            socket.current.close();
        }

        socket.current = new WebSocket(url);

        socket.current.onopen = () => {
            console.log('Notifications Socket Connected');
            setConnected(true);
        };

        socket.current.onmessage = (e) => {
            console.log('DEBUG: WebSocket message received:', e.data);
            const data = JSON.parse(e.data);
            
            setNotifications(prev => {
                // Prevent duplicate IDs
                if (prev.some(n => n.id === data.id)) return prev;
                return [data, ...prev];
            });

            setUnreadCount(prev => prev + 1);

            // Show toast for the new notification
            showToast({
                title: data.title,
                message: data.message,
                type: data.notification_type || 'info'
            });
        };


        socket.current.onerror = (e) => {
            console.error('Notifications Socket Error', e);
        };

        socket.current.onclose = () => {
            console.log('Notifications Socket Closed');
            setConnected(false);
            // Attempt to reconnect after 5 seconds
            setTimeout(connectWebSocket, 5000);
        };
    }, [showToast]);

    const registerForPushNotificationsAsync = async () => {
        if (!Device.isDevice) {
            return;
        }

        const { status: existingStatus } = await Notifications.getPermissionsAsync();
        let finalStatus = existingStatus;
        if (existingStatus !== 'granted') {
            const { status } = await Notifications.requestPermissionsAsync();
            finalStatus = status;
        }
        if (finalStatus !== 'granted') {
            return;
        }

        try {
            // Android Best Practice: Set up high-importance channel
            if (Platform.OS === 'android') {
                await Notifications.setNotificationChannelAsync('default', {
                    name: 'Default',
                    importance: Notifications.AndroidImportance.MAX,
                    vibrationPattern: [0, 250, 250, 250],
                    lightColor: '#FF231F7C',
                    enableVibration: true,
                    showBadge: true,
                });
            }

            const projectId = Constants.expoConfig?.extra?.eas?.projectId ?? Constants.easConfig?.projectId;
            const token = (await Notifications.getExpoPushTokenAsync({ projectId })).data;

            // Force registration for debugging
            await client.post('/notifications/register_push_token/', {
                token: token,
                device_name: `${Device.brand} ${Device.modelName}`
            });
            await AsyncStorage.setItem('pushToken', token);
            console.log('DEBUG: Push token registration sent to server');
        } catch (error) {
            console.error('Error in push registration flow:', error);
        }
    };

    useEffect(() => {
        setNotificationListener(showToast);
        fetchNotifications();
        connectWebSocket();
        registerForPushNotificationsAsync();

        // Foreground notification listener
        const notificationSubscription = Notifications.addNotificationReceivedListener(notification => {
            // Sync internal state when a push arrives
            fetchNotifications();
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        });

        // Notification tap listener (App was closed or backgrounded)
        const responseSubscription = Notifications.addNotificationResponseReceivedListener(response => {
            const data = response.notification.request.content.data;
            // Best Practice: Navigate to specific screen based on data
            // navigation.navigate('Notifications');
        });

        return () => {
            if (socket.current) {
                socket.current.close();
            }
            notificationSubscription.remove();
            responseSubscription.remove();
        };
    }, [showToast, fetchNotifications, connectWebSocket]);

    // Best Practice: Keep app badge in sync with unread count
    useEffect(() => {
        if (unreadCount > 0) {
            Notifications.setBadgeCountAsync(unreadCount);
        } else {
            Notifications.setBadgeCountAsync(0);
        }
    }, [unreadCount]);


    return (
        <NotificationContext.Provider value={{ 
            notifications, 
            unreadCount, 
            markAsRead, 
            markAllAsRead,
            fetchNotifications,
            showNotification: showToast, 
            hideNotification: hideToast 
        }}>
            {children}
            {toast && (
                <StandardToast 
                    {...toast} 
                    visible={toastVisible} 
                    onClose={hideToast} 
                />
            )}
        </NotificationContext.Provider>
    );
};

export const useNotifications = () => {
    const context = useContext(NotificationContext);
    if (!context) {
        throw new Error('useNotifications must be used within a NotificationProvider');
    }
    return context;
};
