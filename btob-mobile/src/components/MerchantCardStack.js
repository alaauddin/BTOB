import React, { useState, useMemo, useEffect } from 'react';
import { View, StyleSheet, Dimensions, Image, TouchableOpacity } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withRepeat,
  withSequence,
  withTiming,
  interpolate,
  Extrapolate,
  runOnJS,
  useDerivedValue,
  Easing,
} from 'react-native-reanimated';
import { GestureDetector, Gesture } from 'react-native-gesture-handler';
import { Ionicons, Feather, MaterialCommunityIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { BRAND } from '../theme/brand';
import Logo from './Logo';
import Text from './AppText';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const CARD_WIDTH = SCREEN_WIDTH * 0.52;
const CARD_HEIGHT = 240; 
const ORBIT_RADIUS = 130;

const OrbitCard = ({ merchant, index, rotation, merchantsCount, onNavigate }) => {
  const animatedStyle = useAnimatedStyle(() => {
    let relativePos = index - rotation.value;
    const halfCount = merchantsCount / 2;
    while (relativePos > halfCount) relativePos -= merchantsCount;
    while (relativePos < -halfCount) relativePos += merchantsCount;

    const baseAngle = Math.PI / 2;
    const spacing = 0.55; 
    const angleRad = baseAngle + (relativePos * spacing);

    const x = Math.cos(angleRad) * ORBIT_RADIUS * 1.8;
    const z = Math.sin(angleRad);
    const y = Math.sin(angleRad) * ORBIT_RADIUS * 0.5;

    const scale = interpolate(z, [-1, 1], [0.65, 1], Extrapolate.CLAMP);
    const opacity = interpolate(z, [-0.8, -0.4, 0.4, 1], [0, 0.2, 0.9, 1], Extrapolate.CLAMP);

    return {
      transform: [
        { translateX: x },
        { translateY: y - 80 },
        { scale: scale },
      ],
      opacity: opacity,
      zIndex: Math.round(scale * 1000),
      display: z < -0.92 ? 'none' : 'flex',
    };
  });

  const isFront = useDerivedValue(() => {
    let relativePos = index - rotation.value;
    const halfCount = merchantsCount / 2;
    while (relativePos > halfCount) relativePos -= merchantsCount;
    while (relativePos < -halfCount) relativePos += merchantsCount;
    return Math.abs(relativePos) < 0.45;
  });

  const activeContentStyle = useAnimatedStyle(() => ({
    opacity: withSpring(isFront.value ? 1 : 0, { damping: 20, stiffness: 90 }),
    transform: [{ translateY: withSpring(isFront.value ? 0 : 10, { damping: 20, stiffness: 90 }) }],
  }));

  if (!merchant) return null;

  return (
    <Animated.View style={[styles.cardBase, animatedStyle]}>
      <View style={styles.cardInternal}>
        <View style={styles.imageContainer}>
          {merchant.panal_picture ? (
            <Image source={{ uri: merchant.panal_picture }} style={styles.cardBg} />
          ) : (
            <LinearGradient colors={BRAND.gradients.primary} style={styles.cardBg} />
          )}
          <LinearGradient
            colors={['transparent', 'rgba(15, 23, 42, 0.4)', 'rgba(15, 23, 42, 0.95)']}
            style={StyleSheet.absoluteFill}
          />
        </View>

        <Animated.View style={[styles.floatingStats, activeContentStyle]}>
           <View style={styles.statPill}>
             <Ionicons name="star" size={8} color="#FFD700" />
             <Text style={styles.statText}>4.9</Text>
           </View>
        </Animated.View>
        
        <View style={styles.cardContent}>
          <View style={styles.cardTopRow}>
            <View style={[styles.cardLogoContainer, { borderColor: merchant.primary_color || BRAND.colors.primary }]}>
              <Image
                source={merchant.profile_picture ? { uri: merchant.profile_picture } : require("../../assets/images/logo.png")}
                style={styles.cardLogoImg}
                resizeMode="cover"
              />
              <View style={styles.verifiedBadge}>
                <MaterialCommunityIcons name="check-decagram" size={10} color="#fff" />
              </View>
            </View>
          </View>

          <View style={styles.metaContainer}>
            <Text style={styles.cardStoreName} numberOfLines={1}>{merchant.name}</Text>
            <Text style={styles.cardStoreCategory}>{merchant.category?.[0]?.name || "رواج"}</Text>
          </View>

          <Animated.View style={[styles.cardFooter, activeContentStyle]}>
            <TouchableOpacity 
              activeOpacity={0.9}
              onPress={() => onNavigate(merchant.store_id)}
              style={[styles.premiumActionBtn, { backgroundColor: merchant.primary_color || BRAND.colors.primary }]}
            >
              <Text style={styles.cardActionText}>زيارة</Text>
              <Feather name="arrow-left" size={12} color="#fff" />
            </TouchableOpacity>

            <TouchableOpacity style={styles.compactHeartBtn}>
               <Ionicons name="heart-outline" size={16} color="#fff" />
            </TouchableOpacity>
          </Animated.View>
        </View>
      </View>
    </Animated.View>
  );
};

const MerchantCardStack = ({ merchants, onNavigate }) => {
  const [activeIdx, setActiveIdx] = useState(0);
  const rotation = useSharedValue(0);
  const startRotation = useSharedValue(0);
  const logoElevate = useSharedValue(0);
  const merchantsCount = merchants.length;

  useEffect(() => {
    // Elegant logo emergence animation
    logoElevate.value = withRepeat(
      withSequence(
        withTiming(1, { duration: 2500, easing: Easing.inOut(Easing.sin) }),
        withTiming(0, { duration: 2500, easing: Easing.inOut(Easing.sin) })
      ),
      -1,
      true
    );
  }, []);

  const visibleMerchants = useMemo(() => {
    if (merchantsCount <= 9) return merchants.map((m, i) => ({ m, i }));
    const indices = [];
    for (let offset = -4; offset <= 4; offset++) {
      let idx = (activeIdx + offset) % merchantsCount;
      if (idx < 0) idx += merchantsCount;
      indices.push(idx);
    }
    return indices.map(idx => ({ m: merchants[idx], i: idx }));
  }, [activeIdx, merchantsCount]);

  const updateActiveIdx = (val) => {
    let idx = Math.round(val) % merchantsCount;
    if (idx < 0) idx += merchantsCount;
    if (idx !== activeIdx) setActiveIdx(idx);
  };

  const panGesture = Gesture.Pan()
    .activeOffsetX([-20, 20])
    .failOffsetY([-20, 20])
    .onBegin(() => {
      startRotation.value = rotation.value;
    })
    .onUpdate((event) => {
      const delta = (event.translationX * -1) / 450;
      let nextRotation = startRotation.value - delta;
      rotation.value = nextRotation;
      runOnJS(updateActiveIdx)(nextRotation);
    })
    .onEnd((event) => {
      const velocity = (event.velocityX * -1) / 1000;
      const target = Math.round(rotation.value - velocity);
      rotation.value = withSpring(target, { damping: 25, stiffness: 100 });
      runOnJS(updateActiveIdx)(target);
    });

  const logoAnimatedStyle = useAnimatedStyle(() => ({
    transform: [
      { translateY: interpolate(logoElevate.value, [0, 1], [0, -15]) },
      { scale: interpolate(logoElevate.value, [0, 1], [1, 1.1]) }
    ],
    opacity: interpolate(logoElevate.value, [0, 1], [0.8, 1]),
  }));

  if (!merchants || merchantsCount === 0) return null;

  return (
    <View style={styles.stackContainer}>
      {/* Emergent System Logo from Center */}
      <View style={styles.orbitCenter}>
        <Animated.View style={[styles.logoCore, logoAnimatedStyle]}>
          <Logo size={65} variant="circle" />
        </Animated.View>
        <Text style={styles.centerBrandText}>رواج</Text>
      </View>

      <GestureDetector gesture={panGesture}>
        <View style={StyleSheet.absoluteFill}>
          {visibleMerchants.map(({ m, i }) => (
            <OrbitCard 
              key={`rich-mini-orbit-${m.id}-${i}`}
              merchant={m}
              index={i}
              rotation={rotation}
              merchantsCount={merchantsCount}
              onNavigate={onNavigate}
            />
          ))}
        </View>
      </GestureDetector>
    </View>
  );
};

const styles = StyleSheet.create({
  stackContainer: {
    height: CARD_HEIGHT + 100,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 140,
    // marginBottom: 5,
    width: '100%',
  },
  orbitCenter: {
    position: 'absolute',
    alignItems: 'center',
    justifyContent: 'center',
    top: -85,
    zIndex: 0,
  },
  logoCore: {
    backgroundColor: '#fff',
    borderRadius: 40,
    padding: 8,
    elevation: 20,
    shadowColor: BRAND.colors.primary,
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.3,
    shadowRadius: 15,
    borderWidth: 2,
    borderColor: BRAND.colors.secondary,
  },
  centerBrandText: {
    marginTop: 8,
    fontSize: 18,
    color: BRAND.colors.primary,
    letterSpacing: 2,
    fontFamily: BRAND.typography.extraBold,
  },
  cardBase: {
    width: CARD_WIDTH,
    height: CARD_HEIGHT,
    position: 'absolute',
    borderRadius: 24,
    backgroundColor: '#fff',
    elevation: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3,
    shadowRadius: 20,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.8)',
    left: (SCREEN_WIDTH - CARD_WIDTH) / 2,
  },
  cardInternal: { flex: 1 },
  imageContainer: { flex: 1 },
  cardBg: { width: '100%', height: '100%', position: 'absolute' },
  floatingStats: {
    position: 'absolute',
    top: 10,
    right: 10,
    zIndex: 10,
  },
  statPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    backgroundColor: 'rgba(0,0,0,0.4)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.2)',
  },
  statText: { color: '#fff', fontSize: 9, fontFamily: BRAND.typography.extraBold },
  cardContent: { 
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    padding: 12,
    alignItems: 'center',
  },
  cardTopRow: { marginBottom: 6 },
  cardLogoContainer: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#fff',
    borderWidth: 2,
    padding: 2,
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 4,
  },
  cardLogoImg: { width: '100%', height: '100%', borderRadius: 20 },
  verifiedBadge: {
    position: 'absolute',
    bottom: -2,
    right: -2,
    backgroundColor: BRAND.colors.secondary,
    borderRadius: 8,
    padding: 1,
    borderWidth: 1,
    borderColor: '#fff',
  },
  metaContainer: { alignItems: 'center', marginBottom: 8 },
  cardStoreName: { 
    color: '#fff', 
    fontSize: 15, 
    marginBottom: 2,
    fontFamily: BRAND.typography.extraBold,
  },
  cardStoreCategory: { color: 'rgba(255,255,255,0.7)', fontSize: 10, fontFamily: BRAND.typography.bold },
  cardFooter: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    gap: 8,
    width: '100%',
    justifyContent: 'center'
  },
  premiumActionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 12,
    gap: 6,
    elevation: 4,
    flex: 1,
    justifyContent: 'center'
  },
  compactHeartBtn: {
    width: 32,
    height: 32,
    borderRadius: 10,
    backgroundColor: 'rgba(255,255,255,0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  cardActionText: { color: '#fff', fontSize: 11, fontFamily: BRAND.typography.extraBold },
});

export default MerchantCardStack;
