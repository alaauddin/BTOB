import React from 'react';
import { View, StyleSheet, TouchableOpacity, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Feather } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import Logo from './Logo';
import ModeSwitcher from './ModeSwitcher';
import { BRAND } from '../theme/brand';
import Text from './AppText';
import TextInput from './AppTextInput';

import { useNavigation } from '@react-navigation/native';
import { useNotifications } from '../context/NotificationContext';

/**
 * PremiumHeader - Unified header component for the entire app.
 * 
 * @param {Function} onMenuPress - Callback when menu button is pressed
 * @param {Boolean} showSearch - Whether to show the search bar (Home screen)
 * @param {Object} searchProps - Props for the TextInput (placeholder, onChange, etc)
 */
const PremiumHeader = ({ onMenuPress, showSearch = false, searchProps = {}, rounded = true }) => {
  const navigation = useNavigation();
  const { unreadCount } = useNotifications();

  return (
    <LinearGradient 
      colors={BRAND.gradients.primary} 
      start={{ x: 0, y: 0 }} 
      end={{ x: 1, y: 1 }}
      style={[styles.headerGradient, !rounded && styles.headerNotRounded]}
    >
      <SafeAreaView style={styles.safeArea} edges={['top']}>
        <View style={styles.headerWrapper}>
          {/* Top Row: Menu | Mode Switcher | Logo */}
          <View style={styles.topRow}>
            <View style={styles.leftActions}>
              <TouchableOpacity onPress={onMenuPress} style={styles.iconButton}>
                <Feather name="menu" size={26} color="#FFF" />
              </TouchableOpacity>
              
              <TouchableOpacity 
                onPress={() => navigation.navigate('Notifications')} 
                style={[styles.iconButton, { marginLeft: 10 }]}
              >
                <Feather name="bell" size={22} color="#FFF" />
                {unreadCount > 0 && (
                  <View style={styles.badge}>
                    <Text style={styles.badgeText}>{unreadCount > 9 ? '9+' : unreadCount}</Text>
                  </View>
                )}
              </TouchableOpacity>
            </View>

            <View style={styles.switcherContainer}>
              <ModeSwitcher />
            </View>

            <View style={styles.logoContainer}>
              <Logo size={38} variant="circle" />
            </View>
          </View>

          {/* Optional Bottom Row: Search Bar */}
          {showSearch && (
            <View style={styles.searchBarContainer}>
              <View style={styles.searchBar}>
                <TextInput 
                  style={styles.searchInput}
                  placeholder="ابحث عن متجر أو تصنيف..."
                  placeholderTextColor="rgba(255,255,255,0.6)"
                  {...searchProps}
                />
                <Feather name="search" size={20} color="rgba(255,255,255,0.8)" style={styles.searchIcon} />
              </View>
            </View>
          )}
        </View>
      </SafeAreaView>
    </LinearGradient>
  );
};

const styles = StyleSheet.create({
  headerGradient: {
    borderBottomLeftRadius: 32,
    borderBottomRightRadius: 32,
    elevation: 8,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
  },
  headerNotRounded: {
    borderBottomLeftRadius: 0,
    borderBottomRightRadius: 0,
    elevation: 0,
    shadowOpacity: 0,
  },
  safeArea: { backgroundColor: "transparent" },
  headerWrapper: {
    paddingHorizontal: 16,
    paddingBottom: 18,
  },
  topRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    height: 60,
    gap: 12,
  },
  leftActions: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  iconButton: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: "rgba(255,255,255,0.15)",
    justifyContent: "center",
    alignItems: "center",
    position: 'relative',
  },
  badge: {
    position: 'absolute',
    top: -5,
    right: -5,
    backgroundColor: '#EF4444',
    borderRadius: 10,
    minWidth: 20,
    height: 20,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 4,
    borderWidth: 2,
    borderColor: BRAND.colors.primary,
  },
  badgeText: {
    color: '#FFF',
    fontSize: 10,
    fontFamily: BRAND.typography.extraBold,
  },
  switcherContainer: {
    flex: 1,
    height: 46,
  },
  logoContainer: {
    width: 44,
    alignItems: 'flex-end',
    justifyContent: 'center',
  },
  searchBarContainer: {
    marginTop: 6,
  },
  searchBar: {
    flexDirection: "row",
    backgroundColor: "rgba(255,255,255,0.15)",
    borderRadius: 14,
    height: 50,
    alignItems: "center",
    paddingHorizontal: 16,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.15)",
  },
  searchInput: {
    flex: 1,
    textAlign: "auto",
    fontSize: 15,
    color: "#FFF",
    fontFamily: BRAND.typography.bold,
  },
  searchIcon: {
    marginLeft: 12,
  },
});

export default PremiumHeader;
