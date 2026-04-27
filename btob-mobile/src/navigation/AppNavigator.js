import React, { useContext } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { View, ActivityIndicator } from 'react-native';
import { navigationRef } from './navigationRef';

// Context
import { AuthContext } from '../context/AuthContext';

// Navigators
import MerchantTabNavigator from './MerchantTabNavigator';

// Components
import Logo from '../components/Logo';
import SubscriptionModal from '../components/SubscriptionModal';
import { BRAND } from '../theme/brand';

// Buyer Screens
import LoginScreen from '../screens/LoginScreen';
import SignupScreen from '../screens/SignupScreen';
import MerchantRegistrationScreen from '../screens/MerchantRegistrationScreen';
import HomeScreen from '../screens/HomeScreen';
import ProductListScreen from '../screens/ProductListScreen';
import ProductDetailsScreen from '../screens/ProductDetailsScreen';
import CartScreen from '../screens/CartScreen';

// Merchant sub-screens (full-screen push, outside the tab bar)
import MerchantOrderDetailScreen from '../screens/MerchantOrderDetailScreen';
import MerchantOffersScreen from '../screens/MerchantOffersScreen';
import MerchantProductEditScreen from '../screens/MerchantProductEditScreen';
import MerchantPaymentSettingsScreen from '../screens/MerchantPaymentSettingsScreen';
import SubscriptionScreen from '../screens/SubscriptionScreen';
import SubscriptionPaymentScreen from '../screens/SubscriptionPaymentScreen';
import ChatListScreen from '../screens/ChatListScreen';
import ChatScreen from '../screens/ChatScreen';


// Driver Screens
import DriverDashboardScreen from '../screens/DriverDashboardScreen';
import DriverTrackingScreen from '../screens/DriverTrackingScreen';

const Stack = createNativeStackNavigator();

export default function AppNavigator() {
    const { isLoading, isMerchant, isDriver, subModalVisible, setSubModalVisible } = useContext(AuthContext);

    if (isLoading) {
        return (
            <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: BRAND.colors.slate[50] }}>
                <Logo size={180} />
                <ActivityIndicator size="small" color={BRAND.colors.primary} style={{ marginTop: 20 }} />
            </View>
        );
    }

    const getInitialRoute = () => {
        if (isMerchant) return 'MerchantTabs';
        if (isDriver) return 'DriverDashboard';
        return 'Home';
    };

    return (
        <NavigationContainer ref={navigationRef}>
            <Stack.Navigator
                initialRouteName={getInitialRoute()}
            >
                {/* ── Public / Buyer ── */}
                <Stack.Screen name="Home" component={HomeScreen} options={{ headerShown: false }} />
                <Stack.Screen name="Products" component={ProductListScreen} options={{ headerShown: false }} />
                <Stack.Screen name="ProductDetails" component={ProductDetailsScreen} options={{ headerShown: false }} />
                <Stack.Screen name="Cart" component={CartScreen} options={{ title: 'My Cart' }} />

                {/* ── Auth ── */}
                <Stack.Screen name="Login" component={LoginScreen} options={{ headerShown: false }} />
                <Stack.Screen name="Signup" component={SignupScreen} options={{ title: 'Sign Up' }} />
                <Stack.Screen name="MerchantRegistration" component={MerchantRegistrationScreen} options={{ headerShown: false }} />

                {/* ── Merchant (bottom-tab navigator) ── */}
                {isMerchant && (
                    <>
                        <Stack.Screen
                            name="MerchantTabs"
                            component={MerchantTabNavigator}
                            options={{ headerShown: false }}
                        />

                        {/* Order detail is a full-screen push above the tabs */}
                        <Stack.Screen
                            name="MerchantOrderDetail"
                            component={MerchantOrderDetailScreen}
                            options={{ headerShown: false }}
                        />
                        <Stack.Screen
                            name="MerchantOffers"
                            component={MerchantOffersScreen}
                            options={{ headerShown: false }}
                        />
                        <Stack.Screen
                            name="MerchantProductEdit"
                            component={MerchantProductEditScreen}
                            options={{ headerShown: false }}
                        />
                        <Stack.Screen
                            name="MerchantPaymentSettings"
                            component={MerchantPaymentSettingsScreen}
                            options={{ headerShown: false }}
                        />
                        <Stack.Screen
                            name="Subscription"
                            component={SubscriptionScreen}
                            options={{ headerShown: false }}
                        />
                        <Stack.Screen
                            name="SubscriptionPayment"
                            component={SubscriptionPaymentScreen}
                            options={{ headerShown: false }}
                        />
                    </>
                )}

                {/* ── Driver Screens ── */}
                {isDriver && (
                    <>
                        <Stack.Screen
                            name="DriverDashboard"
                            component={DriverDashboardScreen}
                            options={{ headerShown: false }}
                        />
                        <Stack.Screen
                            name="DriverMap"
                            component={DriverTrackingScreen}
                            options={{ headerShown: false }}
                        />
                    </>
                )}

                {/* ── Chat Screens ── */}
                <Stack.Screen
                    name="ChatList"
                    component={ChatListScreen}
                    options={{ headerShown: false }}
                />
                <Stack.Screen
                    name="Chat"
                    component={ChatScreen}
                    options={{ headerShown: false }}
                />

            </Stack.Navigator>
            <SubscriptionModal
                visible={subModalVisible}
                onClose={() => setSubModalVisible(false)}
            />
        </NavigationContainer>
    );
}
