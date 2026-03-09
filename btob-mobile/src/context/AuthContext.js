import React, { createContext, useState, useEffect, useContext } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import client from '../api/client';

export const AuthContext = createContext();
export const useAuth = () => useContext(AuthContext);

export const AuthProvider = ({ children }) => {
    const [user, setUser] = useState(null);
    const [isLoading, setIsLoading] = useState(true);

    // Check if user is already logged in on mount
    useEffect(() => {
        const bootstrapAsync = async () => {
            let userToken;
            try {
                userToken = await AsyncStorage.getItem('access_token');
                const userData = await AsyncStorage.getItem('user_data');
                if (userToken && userData) {
                    setUser(JSON.parse(userData));
                }
            } catch (e) {
                // Restoring token failed
                console.error("Failed to restore token", e);
            }
            setIsLoading(false);
        };

        bootstrapAsync();
    }, []);

    const login = async (username, password) => {
        try {
            const response = await client.post('/auth/login/', { username, password });
            if (response.data.success) {
                const { access, refresh } = response.data.tokens;
                const loggedInUser = response.data.user;

                await AsyncStorage.setItem('access_token', access);
                await AsyncStorage.setItem('refresh_token', refresh);
                await AsyncStorage.setItem('user_data', JSON.stringify(loggedInUser));

                setUser(loggedInUser);
                return { success: true };
            }
            return { success: false, message: response.data.message };
        } catch (error) {
            return {
                success: false,
                message: error.response?.data?.message || 'Login failed'
            };
        }
    };

    const unifiedLoginPhone = async (phone) => {
        try {
            const response = await client.post('/auth/unified-login/', { phone });
            if (response.data.success) {
                const { access, refresh } = response.data.tokens;
                const loggedInUser = response.data.user;

                await AsyncStorage.setItem('access_token', access);
                await AsyncStorage.setItem('refresh_token', refresh);
                await AsyncStorage.setItem('user_data', JSON.stringify(loggedInUser));

                setUser(loggedInUser);
                return { success: true, isNew: response.data.is_new, user: loggedInUser };
            }
            return { success: false, message: response.data.message };
        } catch (error) {
            return {
                success: false,
                message: error.response?.data?.message || 'Login failed'
            };
        }
    };

    const logout = async () => {
        try {
            await AsyncStorage.removeItem('access_token');
            await AsyncStorage.removeItem('refresh_token');
            await AsyncStorage.removeItem('user_data');
            setUser(null);
        } catch (e) {
            console.error("Error during logout", e);
        }
    };

    return (
        <AuthContext.Provider value={{ user, isLoading, login, logout, unifiedLoginPhone }}>
            {children}
        </AuthContext.Provider>
    );
};
