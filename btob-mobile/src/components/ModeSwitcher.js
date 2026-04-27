import React from 'react';
import { View, TouchableOpacity, StyleSheet } from 'react-native';
import { Feather, Ionicons } from '@expo/vector-icons';
import { useNavigation, useRoute } from '@react-navigation/native';
import { BRAND } from '../theme/brand';
import { useAuth } from '../context/AuthContext';
import Text from './AppText';

/**
 * Reusable ModeSwitcher component for switching between
 * Buyer (Merchants) view and Merchant Dashboard.
 */
const ModeSwitcher = () => {
  const navigation = useNavigation();
  const route = useRoute();
  const { isMerchant } = useAuth();

  // Determine active mode based on route name
  // Home is the Buyer/Merchants view
  const isDashboardActive = [
    'MerchantDashboard',
    'MerchantOrders',
    'MerchantProducts',
    'MerchantStoreView',
    'MerchantProfile',
    'MerchantWholesaleMarket',
    'MerchantChatList',
    'MerchantOffers',
    'MerchantOrderDetail',
    'MerchantProductEdit',
    'MerchantPaymentSettings'
  ].includes(route.name);

  const goToDashboard = () => {
    if (isDashboardActive) return;
    if (isMerchant) {
      navigation.navigate('MerchantTabs');
    } else {
      navigation.navigate('Login');
    }
  };

  const goToMerchants = () => {
    if (!isDashboardActive) return;
    navigation.navigate('Home');
  };

  return (
    <View style={styles.container}>
      <TouchableOpacity
        style={[styles.modeItem, isDashboardActive && styles.modeItemActive]}
        onPress={goToDashboard}
        activeOpacity={isDashboardActive ? 1 : 0.7}
      >
        {isDashboardActive && (
          <View style={styles.activeIconBg}>
            <Feather name="grid" size={14} color="#FFF" />
          </View>
        )}
        {!isDashboardActive && <Feather name="grid" size={14} color="rgba(255,255,255,0.7)" />}
        <Text style={[styles.modeText, isDashboardActive && styles.modeTextActive]}>لوحة التحكم</Text>
      </TouchableOpacity>

      <TouchableOpacity
        style={[styles.modeItem, !isDashboardActive && styles.modeItemActive]}
        onPress={goToMerchants}
        activeOpacity={!isDashboardActive ? 1 : 0.7}
      >
        {!isDashboardActive && (
          <View style={styles.activeIconBg}>
            <Ionicons name="storefront" size={14} color="#FFF" />
          </View>
        )}
        {isDashboardActive && <Ionicons name="storefront" size={14} color="rgba(255,255,255,0.7)" />}
        <Text style={[styles.modeText, !isDashboardActive && styles.modeTextActive]}>المتاجر</Text>
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: "row",
    backgroundColor: "rgba(255,255,255,0.12)",
    borderRadius: 25,
    padding: 4,
    height: 46,
    alignItems: "center",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.1)",
    flex: 1,
  },
  modeItem: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    height: "100%",
    borderRadius: 22,
    gap: 6,
  },
  modeItemActive: {
    backgroundColor: '#D27321', // BRAND.colors.secondary
    elevation: 4,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
  },
  activeIconBg: {
    backgroundColor: "rgba(255,255,255,0.2)",
    padding: 4,
    borderRadius: 6,
  },
  modeText: {
    fontSize: 13,
    fontFamily: BRAND.typography.bold,
    color: "rgba(255,255,255,0.7)",
  },
  modeTextActive: {
    color: "#FFF",
  },
});

export default ModeSwitcher;
