import React, { useContext } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { View, ActivityIndicator } from 'react-native';

// Context
import { AuthContext } from '../context/AuthContext';

// Navigators
import MerchantTabNavigator from './MerchantTabNavigator';

// Buyer Screens
import LoginScreen from '../screens/LoginScreen';
import SignupScreen from '../screens/SignupScreen';
import HomeScreen from '../screens/HomeScreen';
import ProductListScreen from '../screens/ProductListScreen';
import ProductDetailsScreen from '../screens/ProductDetailsScreen';
import CartScreen from '../screens/CartScreen';

// Merchant sub-screens (full-screen push, outside the tab bar)
import MerchantOrderDetailScreen from '../screens/MerchantOrderDetailScreen';

const Stack = createNativeStackNavigator();

export default function AppNavigator() {
    const { isLoading, isMerchant } = useContext(AuthContext);

    if (isLoading) {
        return (
            <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
                <ActivityIndicator size="large" color="#2B5876" />
            </View>
        );
    }

    return (
        <NavigationContainer>
            <Stack.Navigator
                initialRouteName={isMerchant ? 'MerchantTabs' : 'Home'}
            >
                {/* ── Public / Buyer ── */}
                <Stack.Screen name="Home"             component={HomeScreen}             options={{ headerShown: false }} />
                <Stack.Screen name="Products"         component={ProductListScreen}      options={{ headerShown: false }} />
                <Stack.Screen name="ProductDetails"   component={ProductDetailsScreen}   options={{ headerShown: false }} />
                <Stack.Screen name="Cart"             component={CartScreen}             options={{ title: 'My Cart' }} />

                {/* ── Auth ── */}
                <Stack.Screen name="Login"            component={LoginScreen}            options={{ headerShown: false }} />
                <Stack.Screen name="Signup"           component={SignupScreen}           options={{ title: 'Sign Up' }} />

                {/* ── Merchant (bottom-tab navigator) ── */}
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
            </Stack.Navigator>
        </NavigationContainer>
    );
}
