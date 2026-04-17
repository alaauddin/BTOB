import React from 'react';
import { View, Text, TouchableOpacity, Image, ImageBackground, Animated, StyleSheet } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { THEME } from '../../theme/profileTheme';
import { styles } from '../../theme/profileStyles';

/**
 * ProfileHero.js
 * 
 * The main header component for the Profile screen.
 * Includes cover image, logo, and store titles.
 */
const ProfileHero = ({ coverSrc, logoSrc, onEditCover, onEditLogo, storeName, primaryColor, activeMerchant, scrollY }) => {
  const coverTranslateY = scrollY.interpolate({
    inputRange: [-100, 0, 100],
    outputRange: [0, 0, 50],
  });

  return (
    <View style={styles.heroSection}>
      <Animated.View style={[styles.coverWrapper, { transform: [{ translateY: coverTranslateY }] }]}>
        <TouchableOpacity activeOpacity={0.9} onPress={onEditCover} style={{ flex: 1 }}>
          {coverSrc ? (
            <ImageBackground source={{ uri: coverSrc }} style={styles.heroCover} resizeMode="cover">
              <LinearGradient colors={['rgba(0,0,0,0.0)', 'rgba(0,0,0,0.5)']} style={StyleSheet.absoluteFill} />
            </ImageBackground>
          ) : (
            <LinearGradient colors={[primaryColor || THEME.colors.primary, THEME.colors.primaryDark]} style={styles.heroCover}>
              <View style={[styles.meshBlob, { top: -20, right: -20, backgroundColor: 'rgba(255,255,255,0.1)' }]} />
              <View style={[styles.meshBlob, { bottom: -40, left: -40, backgroundColor: 'rgba(255,255,255,0.05)' }]} />
              <View style={styles.coverPlaceholder}>
                 <Feather name="image" size={40} color="rgba(255,255,255,0.3)" />
              </View>
            </LinearGradient>
          )}
        </TouchableOpacity>
      </Animated.View>

      <View style={styles.heroMain}>
        <View style={styles.identityRow}>
          <TouchableOpacity activeOpacity={0.9} onPress={onEditLogo} style={styles.logoAnchor}>
            <View style={[styles.logoOutline, { borderColor: '#FFF' }]}>
              {logoSrc ? (
                <Image source={{ uri: logoSrc }} style={styles.heroLogoImg} />
              ) : (
                <View style={[styles.logoInitialWrap, { backgroundColor: THEME.colors.slate[50] }]}>
                  <Text style={[styles.heroLogoText, { color: primaryColor || THEME.colors.primary }]}>
                    {(storeName?.[0] || 'M').toUpperCase()}
                  </Text>
                </View>
              )}
            </View>
            <View style={[styles.logoEditBadge, { backgroundColor: primaryColor || THEME.colors.primary }]}>
              <Feather name="camera" size={12} color="#FFF" />
            </View>
          </TouchableOpacity>
          <View style={styles.titleStack}>
            <Text style={styles.heroTitle}>{String(storeName || 'إعدادات المتجر')}</Text>
            <Text style={styles.heroSub}>{String(activeMerchant?.store_link || '')}</Text>
          </View>
        </View>
        
        <View style={styles.statsStrip}>
           <View style={styles.statItem}>
              <Text style={styles.statVal}>نشط</Text>
              <Text style={styles.statLab}>الحالة</Text>
           </View>
           <View style={styles.divider} />
           <View style={styles.statItem}>
              <Text style={styles.statVal}>{activeMerchant?.plan_name || 'Standard'}</Text>
              <Text style={styles.statLab}>الباقة</Text>
           </View>
        </View>
      </View>
    </View>
  );
};

export default ProfileHero;
