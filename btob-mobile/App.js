import React from 'react';
import { AuthProvider } from './src/context/AuthContext';
import AppNavigator from './src/navigation/AppNavigator';
import { I18nManager } from 'react-native';

I18nManager.allowRTL(true);
I18nManager.forceRTL(true);

import { NotificationProvider } from './src/context/NotificationContext';

export default function App() {
    return (
        <AuthProvider>
            <NotificationProvider>
                <AppNavigator />
            </NotificationProvider>
        </AuthProvider>
    );
}

