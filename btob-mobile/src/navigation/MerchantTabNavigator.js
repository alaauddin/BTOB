import React, { useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Dimensions, Platform, I18nManager } from 'react-native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Feather } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Svg, { Path } from 'react-native-svg';
import Animated, { 
  useAnimatedProps, 
  useSharedValue, 
  withSpring, 
  useAnimatedStyle,
} from 'react-native-reanimated';

import { useAuth } from '../context/AuthContext';
import { BRAND } from '../theme/brand';
import MerchantDashboardScreen from '../screens/MerchantDashboardScreen';
import MerchantOrdersScreen from '../screens/MerchantOrdersScreen';
import MerchantProductsScreen from '../screens/MerchantProductsScreen';
import ProductListScreen from '../screens/ProductListScreen';
import MerchantProfileScreen from '../screens/MerchantProfileScreen';
import WholesaleMarketScreen from '../screens/WholesaleMarketScreen';

const { width } = Dimensions.get('window');
const Tab = createBottomTabNavigator();
const AnimatedPath = Animated.createAnimatedComponent(Path);

// ── Design Constants ──────────────────────────────────────────────
const TAB_BAR_HEIGHT = 65;
const CURVE_WIDTH = 120;
const CURVE_HEIGHT = 35;

function MerchantTabBar({ state, descriptors, navigation }) {
  const { activeMerchant } = useAuth();
  const insets = useSafeAreaInsets();
  const isRTL = I18nManager.isRTL;
  
  const tabs = [
    { name: 'Dashboard',    label: 'الرئيسية',  icon: 'home' },
    { name: 'Orders',       label: 'الطلبات',   icon: 'shopping-bag' },
    { name: 'Products',     label: 'المنتجات',   icon: 'package' },
    { name: 'StoreView',    label: 'المتجر',    icon: 'grid' },
    { name: 'Profile',      label: 'الحساب',    icon: 'user' },
  ];

  const visibleRoutes = state.routes.filter(r => tabs.some(t => t.name === r.name));
  
  // The user requested to "flip the whole component". 
  // We'll keep the forced LTR for synchronization but reverse the RTL placement logic.
  // This will place the first tab (Dashboard) on the physical Left and the last (Profile) on the Right,
  // or vice versa depending on what they mean by "flip".
  // Given the previous mismatch, "flip" likely means reversing the current mapping.
  const getPhysicalX = (index) => {
    const tabWidth = width / visibleRoutes.length;
    // We reverse the previous logic to "flip" the component layout
    if (isRTL) {
      return index * tabWidth;
    }
    return (visibleRoutes.length - 1 - index) * tabWidth;
  };

  const activeIndex = visibleRoutes.findIndex(r => r.name === state.routes[state.index].name);
  const tabWidth = width / visibleRoutes.length;
  const targetX = getPhysicalX(activeIndex);
  
  const translateX = useSharedValue(targetX);

  useEffect(() => {
    translateX.value = withSpring(targetX, {
        damping: 40,
        stiffness: 800,
    });
  }, [targetX]);

  const animatedProps = useAnimatedProps(() => {
    const x = translateX.value + tabWidth / 2;
    const d = `
      M 0 0
      L ${x - CURVE_WIDTH / 2} 0
      C ${x - CURVE_WIDTH / 3} 0 ${x - CURVE_WIDTH / 4} ${CURVE_HEIGHT} ${x} ${CURVE_HEIGHT}
      C ${x + CURVE_WIDTH / 4} ${CURVE_HEIGHT} ${x + CURVE_WIDTH / 3} 0 ${x + CURVE_WIDTH / 2} 0
      L ${width} 0
      L ${width} ${TAB_BAR_HEIGHT}
      L 0 ${TAB_BAR_HEIGHT}
      Z
    `;
    return { d };
  });

  const circleStyle = useAnimatedStyle(() => {
    return {
      transform: [
        { translateX: translateX.value + tabWidth / 2 - 28 },
        { translateY: -18 }
      ]
    };
  });

  // Reversing the display order to match the new physical mapping
  const displayRoutes = isRTL ? visibleRoutes : [...visibleRoutes].reverse();

  return (
    <View style={[styles.container, { height: TAB_BAR_HEIGHT + insets.bottom }]}>
      <Svg width={width} height={TAB_BAR_HEIGHT} style={styles.svg}>
        <AnimatedPath 
            animatedProps={animatedProps} 
            fill={BRAND.colors.primary} 
        />
      </Svg>

      <Animated.View style={[styles.activeCircle, circleStyle, { backgroundColor: BRAND.colors.secondary }]}>
        <Feather 
          name={tabs.find(t => t.name === state.routes[state.index].name)?.icon || 'circle'} 
          size={24} 
          color="#FFF" 
        />
      </Animated.View>

      <View style={styles.tabItemsContainer}>
        {displayRoutes.map((route) => {
          const tab = tabs.find(t => t.name === route.name);
          const isFocused = state.routes[state.index].name === route.name;

          return (
            <TouchableOpacity
              key={route.key}
              style={styles.tabItem}
              onPress={() => navigation.navigate(route.name)}
              activeOpacity={1}
            >
              {!isFocused && (
                <Feather
                  name={tab?.icon || 'circle'}
                  size={20}
                  color="rgba(255,255,255,0.6)"
                />
              )}
              {!isFocused && (
                <Text style={styles.tabLabel}>
                  {tab?.label}
                </Text>
              )}
            </TouchableOpacity>
          );
        })}
      </View>
      <View style={[styles.safeAreaFill, { height: insets.bottom, backgroundColor: BRAND.colors.primary }]} />
    </View>
  );
}

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
      <Tab.Screen name="WholesaleMarket" component={WholesaleMarketScreen} />
    </Tab.Navigator>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: 'transparent',
    width: width,
    direction: 'ltr', 
  },
  svg: {
    position: 'absolute',
    top: 0,
    direction: 'ltr',
  },
  activeCircle: {
    position: 'absolute',
    top: 0,
    width: 56,
    height: 56,
    borderRadius: 28,
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 10,
    shadowColor: BRAND.colors.secondary,
    shadowOpacity: 0.3,
    shadowRadius: 10,
    zIndex: 10,
    borderWidth: 3,
    borderColor: '#FFF',
    direction: 'ltr',
  },
  tabItemsContainer: {
    flexDirection: 'row',
    height: TAB_BAR_HEIGHT,
    width: width,
    zIndex: 5,
    direction: 'ltr',
  },
  tabItem: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: 10,
  },
  tabLabel: {
    fontSize: 9,
    fontWeight: '800',
    marginTop: 4,
    color: 'rgba(255,255,255,0.7)',
  },
  safeAreaFill: {
    width: width,
  }
});
