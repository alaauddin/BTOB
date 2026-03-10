import React, { createContext, useState, useEffect, useContext } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import client from '../api/client';

export const AuthContext = createContext();
export const useAuth = () => useContext(AuthContext);

export const AuthProvider = ({ children }) => {
    const [user, setUser] = useState(null);
    const [isLoading, setIsLoading] = useState(true);

    // Merchant-scope state
    const [userScope, setUserScope] = useState('visitor'); // 'visitor' | 'merchant'
    const [manageableMerchants, setManageableMerchants] = useState([]);
    const [activeMerchant, setActiveMerchantState] = useState(null);

    /** true iff the logged-in user has the merchant scope */
    const isMerchant = userScope === 'merchant';

    // ── Bootstrap on app start ─────────────────────────────────────
    useEffect(() => {
        const bootstrapAsync = async () => {
            try {
                const [token, userData, scopeData, merchantsData, activeMerchantData] =
                    await AsyncStorage.multiGet([
                        'access_token',
                        'user_data',
                        'user_scope',
                        'manageable_merchants',
                        'active_merchant',
                    ]);

                if (token[1] && userData[1]) {
                    setUser(JSON.parse(userData[1]));
                    setUserScope(scopeData[1] || 'visitor');
                    setManageableMerchants(merchantsData[1] ? JSON.parse(merchantsData[1]) : []);
                    setActiveMerchantState(activeMerchantData[1] ? JSON.parse(activeMerchantData[1]) : null);
                }
            } catch (e) {
                console.error('Failed to restore session', e);
            }
            setIsLoading(false);
        };
        bootstrapAsync();
    }, []);

    // ── Helpers ────────────────────────────────────────────────────

    /**
     * Persist and update the active merchant in both state and AsyncStorage.
     * Call this when the user switches merchants.
     */
    const setActiveMerchant = async (merchant) => {
        setActiveMerchantState(merchant);
        await AsyncStorage.setItem('active_merchant', JSON.stringify(merchant));
    };

    /**
     * Update the full merchant list (e.g. after a switch API call refreshes the list).
     */
    const updateMerchantList = async (merchants) => {
        setManageableMerchants(merchants);
        await AsyncStorage.setItem('manageable_merchants', JSON.stringify(merchants));
    };

    // ── Auth actions ───────────────────────────────────────────────

    /**
     * Merchant login (username + password).
     * Sets user_scope = 'merchant' and stores the merchant list.
     */
    const login = async (username, password) => {
        try {
            const response = await client.post('/auth/login/', { username, password });
            if (response.data.success) {
                const { access, refresh } = response.data.tokens;
                const loggedInUser = response.data.user;
                const merchants = response.data.manageable_merchants || [];
                const firstMerchant = merchants[0] || null;

                await AsyncStorage.multiSet([
                    ['access_token', access],
                    ['refresh_token', refresh],
                    ['user_data', JSON.stringify(loggedInUser)],
                    ['user_scope', 'merchant'],
                    ['manageable_merchants', JSON.stringify(merchants)],
                    ['active_merchant', JSON.stringify(firstMerchant)],
                ]);

                setUser(loggedInUser);
                setUserScope('merchant');
                setManageableMerchants(merchants);
                setActiveMerchantState(firstMerchant);
                return { success: true };
            }
            return { success: false, message: response.data.message };
        } catch (error) {
            return { success: false, message: error.response?.data?.message || 'Login failed' };
        }
    };

    /**
     * Visitor login (phone number).
     * Sets user_scope = 'visitor'.
     */
    const unifiedLoginPhone = async (phone) => {
        try {
            const response = await client.post('/auth/unified-login/', { phone });
            if (response.data.success) {
                const { access, refresh } = response.data.tokens;
                const loggedInUser = response.data.user;

                await AsyncStorage.multiSet([
                    ['access_token', access],
                    ['refresh_token', refresh],
                    ['user_data', JSON.stringify(loggedInUser)],
                    ['user_scope', 'visitor'],
                    ['manageable_merchants', JSON.stringify([])],
                    ['active_merchant', JSON.stringify(null)],
                ]);

                setUser(loggedInUser);
                setUserScope('visitor');
                setManageableMerchants([]);
                setActiveMerchantState(null);
                return { success: true, isNew: response.data.is_new, user: loggedInUser };
            }
            return { success: false, message: response.data.message };
        } catch (error) {
            return { success: false, message: error.response?.data?.message || 'Login failed' };
        }
    };

    const logout = async () => {
        try {
            await AsyncStorage.multiRemove([
                'access_token', 'refresh_token', 'user_data',
                'user_scope', 'manageable_merchants', 'active_merchant',
            ]);
            setUser(null);
            setUserScope('visitor');
            setManageableMerchants([]);
            setActiveMerchantState(null);
        } catch (e) {
            console.error('Error during logout', e);
        }
    };

    return (
        <AuthContext.Provider
            value={{
                user,
                isLoading,
                // Auth actions
                login,
                logout,
                unifiedLoginPhone,
                // Merchant scope
                isMerchant,
                userScope,
                manageableMerchants,
                activeMerchant,
                setActiveMerchant,
                updateMerchantList,
            }}
        >
            {children}
        </AuthContext.Provider>
    );
};
