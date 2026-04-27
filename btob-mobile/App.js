import 'react-native-gesture-handler';
import React from 'react';
import { AuthProvider } from './src/context/AuthContext';
import AppNavigator from './src/navigation/AppNavigator';
import { I18nManager } from 'react-native';

I18nManager.allowRTL(true);
I18nManager.forceRTL(true);

import { NotificationProvider } from './src/context/NotificationContext';
import { ChatProvider } from './src/context/ChatContext';

import { GestureHandlerRootView } from 'react-native-gesture-handler';
import {
    useFonts,
    Cairo_400Regular,
    Cairo_500Medium,
    Cairo_600SemiBold,
    Cairo_700Bold,
    Cairo_900Black
} from '@expo-google-fonts/cairo';
import { Text, TextInput, StyleSheet } from 'react-native';
import { BRAND } from './src/theme/brand';

export default function App() {
    let [fontsLoaded] = useFonts({
        Cairo_400Regular,
        Cairo_500Medium,
        Cairo_600SemiBold,
        Cairo_700Bold,
        Cairo_900Black,
    });

    if (!fontsLoaded) {
        return null;
    }

    return (
        <GestureHandlerRootView style={{ flex: 1 }}>
            <AuthProvider>
                <NotificationProvider>
                    <ChatProvider>
                        <AppNavigator />
                    </ChatProvider>
                </NotificationProvider>
            </AuthProvider>
        </GestureHandlerRootView>
    );
}


