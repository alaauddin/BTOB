import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { View, StyleSheet } from 'react-native';
import * as Haptics from 'expo-haptics';
import { setNotificationListener } from '../api/client';
import StandardToast from '../components/StandardToast';

const NotificationContext = createContext();

export const NotificationProvider = ({ children }) => {
    const [notification, setNotification] = useState(null);
    const [visible, setVisible] = useState(false);

    const showNotification = useCallback((config) => {
        setNotification(config);
        setVisible(true);

        // Physical feedback
        if (config.type === 'error') {
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
        } else if (config.type === 'success') {
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        } else {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
        }

        // Auto-hide after 5 seconds for network errors (longer for readability)
        // or 3.5 seconds for standard ones
        const duration = config.isNetworkError ? 6000 : 3500;
        
        setTimeout(() => {
            setVisible(false);
        }, duration);
    }, []);

    const hideNotification = () => setVisible(false);

    // Attach listener to the API client
    useEffect(() => {
        setNotificationListener(showNotification);
    }, [showNotification]);

    return (
        <NotificationContext.Provider value={{ showNotification, hideNotification }}>
            {children}
            {notification && (
                <StandardToast 
                    {...notification} 
                    visible={visible} 
                    onClose={hideNotification} 
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
