import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Platform } from 'react-native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Feather } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useAuth } from '../context/AuthContext';
import MerchantDashboardScreen from '../screens/MerchantDashboardScreen';
import MerchantOrdersScreen from '../screens/MerchantOrdersScreen';
import MerchantProductsScreen from '../screens/MerchantProductsScreen';
import ProductListScreen from '../screens/ProductListScreen';
import MerchantProfileScreen from '../screens/MerchantProfileScreen';

const Tab = createBottomTabNavigator();

// ── Custom Tab Bar ────────────────────────────────────────────────
function MerchantTabBar({ state, descriptors, navigation }) {
  const { activeMerchant } = useAuth();
  const primaryColor = activeMerchant?.primary_color || '#2B5876';
  const insets = useSafeAreaInsets();

  const tabs = [
    { name: 'Dashboard',    label: 'الرئيسية',  icon: 'home' },
    { name: 'Orders',       label: 'الطلبات',   icon: 'shopping-bag' },
    { name: 'Products',     label: 'المنتجات',   icon: 'package' },
    { name: 'StoreView',    label: 'المتجر',    icon: 'grid' },
    { name: 'Profile',      label: 'الحساب',    icon: 'user' },
  ];

  return (
    <View style={[styles.tabBar, { paddingBottom: insets.bottom + 4 }]}>
      {state.routes.map((route, index) => {
        const tab = tabs.find(t => t.name === route.name) || tabs[index];
        const isFocused = state.index === index;

        const onPress = () => {
          const event = navigation.emit({ type: 'tabPress', target: route.key, canPreventDefault: true });
          if (!isFocused && !event.defaultPrevented) {
            navigation.navigate(route.name);
          }
        };

        return (
          <TouchableOpacity
            key={route.key}
            style={styles.tabItem}
            onPress={onPress}
            activeOpacity={0.7}
          >
            {isFocused && (
              <View style={[styles.activeIndicator, { backgroundColor: primaryColor + '18' }]} />
            )}
            <Feather
              name={tab?.icon || 'circle'}
              size={22}
              color={isFocused ? primaryColor : '#94A3B8'}
            />
            <Text style={[styles.tabLabel, { color: isFocused ? primaryColor : '#94A3B8' }]}>
              {tab?.label}
            </Text>
            {isFocused && <View style={[styles.tabDot, { backgroundColor: primaryColor }]} />}
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

// ── Navigator ─────────────────────────────────────────────────────
export default function MerchantTabNavigator() {
  const { activeMerchant } = useAuth();

  return (
    <Tab.Navigator
      tabBar={props => <MerchantTabBar {...props} />}
      screenOptions={{ headerShown: false }}
    >
      <Tab.Screen name="Dashboard" component={MerchantDashboardScreen} />
      <Tab.Screen
        name="Orders"
        component={MerchantOrdersScreen}
        initialParams={{ merchantId: activeMerchant?.id }}
      />
      <Tab.Screen
        name="Products"
        component={MerchantProductsScreen}
      />
      <Tab.Screen
        name="StoreView"
        component={ProductListScreen}
        initialParams={{ storeId: activeMerchant?.store_id }}
      />
      <Tab.Screen name="Profile" component={MerchantProfileScreen} />
    </Tab.Navigator>
  );
}

const styles = StyleSheet.create({
  tabBar: {
    flexDirection: 'row',
    backgroundColor: '#fff',
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
    paddingTop: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.06,
    shadowRadius: 12,
    elevation: 12,
  },
  tabItem: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 6,
    position: 'relative',
  },
  activeIndicator: {
    position: 'absolute',
    top: -8,
    width: 56,
    height: 56,
    borderRadius: 28,
  },
  tabLabel: {
    fontSize: 11,
    fontWeight: '600',
    marginTop: 3,
  },
  tabDot: {
    position: 'absolute',
    top: -9,
    width: 4,
    height: 4,
    borderRadius: 2,
  },
});
