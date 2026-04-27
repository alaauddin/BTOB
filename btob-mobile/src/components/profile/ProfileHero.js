import React from 'react';
import { View, TouchableOpacity, Image, ImageBackground, Animated, StyleSheet } from 'react-native';
import { Feather, MaterialCommunityIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { THEME } from '../../theme/profileTheme';
import { styles } from '../../theme/profileStyles';
import Text from '../AppText';
import { BRAND } from '../../theme/brand';

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

  const logoScale = scrollY.interpolate({
    inputRange: [0, 100],
    outputRange: [1, 0.9],
    extrapolate: 'clamp',
  });

  return (
    <View style={styles.heroSection}>
      <Animated.View style={[styles.coverWrapper, { transform: [{ translateY: coverTranslateY }, { scale: scrollY.interpolate({ inputRange: [-200, 0], outputRange: [1.8, 1], extrapolate: 'clamp' }) }] }]}>
        <TouchableOpacity activeOpacity={0.9} onPress={onEditCover} style={{ flex: 1 }}>
          {coverSrc ? (
            <ImageBackground source={{ uri: coverSrc }} style={styles.heroCover} resizeMode="cover">
              <LinearGradient colors={['rgba(0,0,0,0.0)', 'rgba(0,0,0,0.4)']} style={StyleSheet.absoluteFill} />
            </ImageBackground>
          ) : (
            <LinearGradient colors={[primaryColor || THEME.colors.primary, THEME.colors.secondary]} style={styles.heroCover}>
              <View style={[styles.meshBlob, { top: -20, right: -20, backgroundColor: 'rgba(255,255,255,0.1)' }]} />
              <View style={[styles.meshBlob, { bottom: -40, left: -40, backgroundColor: 'rgba(255,255,255,0.05)' }]} />
              <View style={styles.coverPlaceholder}>
                 <Feather name="image" size={40} color="rgba(255,255,255,0.3)" />
                 <Text style={{ color: 'rgba(255,255,255,0.5)', marginTop: 8, fontFamily: BRAND.typography.bold, fontSize: 12 }}>اضغط لإضافة غلاف</Text>
              </View>
            </LinearGradient>
          )}
        </TouchableOpacity>
      </Animated.View>

      <View style={styles.heroMain}>
        <View style={styles.identityRow}>
          <Animated.View style={{ transform: [{ scale: logoScale }] }}>
            <TouchableOpacity activeOpacity={0.9} onPress={onEditLogo} style={styles.logoAnchor}>
              <View style={styles.logoOutline}>
                {logoSrc ? (
                  <Image source={{ uri: logoSrc }} style={styles.heroLogoImg} />
                ) : (
                  <LinearGradient 
                    colors={['#F8FAFC', '#E2E8F0']} 
                    style={styles.logoInitialWrap}
                  >
                    <Text style={[styles.heroLogoText, { color: primaryColor || THEME.colors.primary }]}>
                      {(storeName?.[0] || 'M').toUpperCase()}
                    </Text>
                  </LinearGradient>
                )}
              </View>
              <LinearGradient colors={['#FFF', '#F1F5F9']} style={styles.logoEditBadge}>
                <Feather name="camera" size={14} color={THEME.colors.slate[600]} />
              </LinearGradient>
            </TouchableOpacity>
          </Animated.View>
          
          <View style={styles.titleStack}>
            <Text style={styles.heroTitle} numberOfLines={1}>{String(storeName || 'إعدادات المتجر')}</Text>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
               <MaterialCommunityIcons name="store-outline" size={14} color={primaryColor || THEME.colors.primary} />
               <Text style={styles.heroSub}>{String(activeMerchant?.store_id || activeMerchant?.subdomain || '')}</Text>
            </View>
          </View>
        </View>
        
        <View style={styles.statsStrip}>
           <View style={styles.statItem}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                 <View style={{ 
                    width: 6, height: 6, borderRadius: 3, 
                    backgroundColor: activeMerchant?.plan_status === 'نشط' ? THEME.colors.emerald : THEME.colors.amber 
                 }} />
                 <Text style={styles.statVal}>{activeMerchant?.plan_status || 'نشط'}</Text>
              </View>
              <Text style={styles.statLab}>حالة الاشتراك</Text>
           </View>
           <View style={styles.divider} />
           <View style={styles.statItem}>
              <Text style={styles.statVal}>{activeMerchant?.plan_name || '...'}</Text>
              <Text style={styles.statLab}>الباقة الحالية</Text>
           </View>
           <View style={styles.divider} />
           <View style={styles.statItem}>
              <Text style={styles.statVal}>{activeMerchant?.city || 'اليمن'}</Text>
              <Text style={styles.statLab}>المقر الرئيسي</Text>
           </View>
        </View>
      </View>
    </View>
  );
};

export default ProfileHero;
