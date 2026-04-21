import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import {
  View, Text, ScrollView, Modal, TouchableOpacity, Image, Alert, 
  ActivityIndicator, KeyboardAvoidingView, Platform, Animated, StyleSheet, StatusBar
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Feather, MaterialCommunityIcons, Ionicons } from '@expo/vector-icons';
import { BlurView } from 'expo-blur';
import { useAuth } from '../context/AuthContext';
import { useNotifications } from '../context/NotificationContext';
import { useNavigation } from '@react-navigation/native';
import * as ImagePicker from 'expo-image-picker';
import MapView, { Marker } from '../components/MapModule';
import { LinearGradient } from 'expo-linear-gradient';
import client from '../api/client';
import Logo from '../components/Logo';
import BrandGenModal from '../components/BrandGenModal';

// Theme & Components
import { THEME } from '../theme/profileTheme';
import { styles } from '../theme/profileStyles';
import ProfileHero from '../components/profile/ProfileHero';
import SettingsGroup from '../components/profile/SettingsGroup';
import PremiumInput from '../components/profile/PremiumInput';
import PremiumToggle from '../components/profile/PremiumToggle';
import DeviceMockup from '../components/profile/DeviceMockup';
import { BRAND } from '../theme/brand';

export default function MerchantProfileScreen() {
  const navigation = useNavigation();
  const { 
    user, activeMerchant, manageableMerchants, logout, 
    updateMerchantList, setActiveMerchant,
    biometricsAvailable, biometricsEnabled, 
    enableBiometrics, disableBiometrics 
  } = useAuth();
  const { showNotification } = useNotifications();
  
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  
  // Profile Form State
  const [formData, setFormData] = useState(activeMerchant || {});
  const [imagesData, setImagesData] = useState({ profile_picture: null, panal_picture: null });
  const [isAiModalVisible, setIsAiModalVisible] = useState(false);

  // Detect changes to show/hide save button
  const hasChanges = useMemo(() => {
    if (!activeMerchant) return false;
    if (imagesData.profile_picture || imagesData.panal_picture) return true;

    const fields = [
        'name', 'store_id', 'secondary_phone', 'subdomain', 'latitude', 'longitude', 
        'city', 'country', 'address', 'primary_color', 'secondary_color', 'accent_color', 
        'footer_text_color', 'navbar_color', 'navbar_text_color', 'footer_color',
        'delivery_fee_ratio', 'facebook_url', 'instagram_url', 'twitter_url', 
        'tiktok_url', 'footer_description', 'return_policy', 'is_active'
    ];

    return fields.some(key => {
        const val1 = formData[key];
        const val2 = activeMerchant[key];
        // Handle potential null/undefined vs empty string
        if (!val1 && !val2) return false;
        return String(val1) !== String(val2);
    });
  }, [formData, activeMerchant, imagesData]);

  // Animations
  const scrollY = useRef(new Animated.Value(0)).current;
  const fadeAnims = useRef([...Array(10)].map(() => new Animated.Value(0))).current;

  // Design Presets
  const PRESETS = [
    { name: 'رواج الافتراضي', primary: '#2B5876', secondary: '#F8FAFC', navbar: '#FFFFFF', text: '#1E293B', accent: '#D48231', icon: 'shield' },
    { name: 'احترافي داكن', primary: '#0F172A', secondary: '#0F172A', navbar: '#0F172A', text: '#F8FAFC', accent: '#3B82F6', icon: 'zap' },
    { name: 'ذهبي ملكي', primary: '#78350F', secondary: '#FFFBEB', navbar: '#1C1917', text: '#F59E0B', accent: '#FCD34D', icon: 'award' },
    { name: 'وردي عصري', primary: '#BE185D', secondary: '#FDF2F8', navbar: '#FFFFFF', text: '#831843', accent: '#F472B6', icon: 'heart' },
    { name: 'أخضر طبيعي', primary: '#065F46', secondary: '#F0FDF4', navbar: '#065F46', text: '#FFFFFF', accent: '#34D399', icon: 'feather' },
    { name: 'نيلي أنيق', primary: '#4338CA', secondary: '#F5F3FF', navbar: '#1E1B4B', text: '#FFFFFF', accent: '#A5B4FC', icon: 'moon' },
    { name: 'رملي وبحر', primary: '#0D9488', secondary: '#FEFCE8', navbar: '#0D9488', text: '#FFFFFF', accent: '#99F6E4', icon: 'sun' },
    { name: 'بسيط كلاسيكي', primary: '#18181B', secondary: '#FAFAFA', navbar: '#FFFFFF', text: '#18181B', accent: '#71717A', icon: 'box' },
  ];

  const primaryColor = String(formData?.primary_color || activeMerchant?.primary_color || BRAND.colors.primary);

  const [paymentMethods, setPaymentMethods] = useState([]);
  const [currencies, setCurrencies] = useState([]);

  const fetchProfile = useCallback(async () => {
    if (!activeMerchant?.id) {
       setLoading(false);
       return;
    }
    try {
      const [profRes, payRes, currRes] = await Promise.all([
        client.get(`/merchant/profile/?merchant_id=${activeMerchant?.id}`),
        client.get(`/merchant/payment-settings/?merchant_id=${activeMerchant?.id}`),
        client.get('/core/currencies/')
      ]);
      
      if (profRes.data.success) {
        const profileData = profRes.data.profile || profRes.data.merchant;
        if (profileData) setFormData(profileData);
      }
      
      setPaymentMethods(Array.isArray(payRes.data.results) ? payRes.data.results : (Array.isArray(payRes.data) ? payRes.data : []));
      if (currRes.data.success) setCurrencies(currRes.data.currencies || []);
    } catch (err) {
      if (err.response?.status !== 402) {
        console.error('Failed to fetch profile/payments', err);
      }
    } finally {
      setLoading(false);
    }
  }, [activeMerchant?.id]);

  useEffect(() => {
    fetchProfile();
  }, [fetchProfile]);

  useEffect(() => {
    if (!loading) {
      const animations = fadeAnims.map((anim, i) => 
        Animated.timing(anim, {
          toValue: 1,
          duration: 600,
          delay: i * 100,
          useNativeDriver: true,
        })
      );
      Animated.parallel(animations).start();
    }
  }, [loading]);

  const pickImage = async (field) => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      showNotification({ title: 'عذراً', message: 'نحتاج إلى إذن الوصول للصور', type: 'warning' });
      return;
    }

    let result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      quality: 0.8,
    });

    if (!result.canceled) {
      setImagesData(prev => ({ ...prev, [field]: result.assets[0] }));
    }
  };
  
  const handleAiColorsGenerated = (colors) => {
    setFormData(prev => ({ ...prev, ...colors }));
  };

  const applyPreset = (preset) => {
    setFormData(prev => ({
        ...prev,
        primary_color: preset.primary,
        secondary_color: preset.secondary,
        navbar_color: preset.navbar,
        footer_color: preset.secondary,
        navbar_text_color: preset.text,
        footer_text_color: preset.text,
        accent_color: preset.accent,
    }));
  };

  const updateField = (key, val) => {
    setFormData(prev => ({ ...prev, [key]: val }));
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const cleanData = {};
      const skipFields = [
        'id', 'profile_picture', 'panal_picture', 'profile_picture_url', 
        'cover_picture_url', 'store_link', 'category', 'currency', 'managing_users',
        'agreed_to_terms', 'terms_agreed_at', 'show_system_logo', 'show_out_of_stock',
        'enable_delivery_drivers', 'can_buy_wholesale', 'can_add_products', 
        'can_add_product_categories', 'can_add_categories', 'show_platform_ads',
        'enable_delivery_fees', 'show_order_amounts'
      ];
      
      Object.keys(formData).forEach(key => {
        if (!skipFields.includes(key) && formData[key] !== null) {
          cleanData[key] = formData[key];
        }
      });

      // Special handling for currency_id if needed
      if (formData.currency?.id) {
          cleanData.currency_id = formData.currency.id;
      }

      const patchRes = await client.patch('/merchant/profile/', {
        merchant_id: activeMerchant?.id,
        ...cleanData
      });

      if (patchRes.data.success) {
        const updated = patchRes.data.profile || patchRes.data.merchant;
        if (updated) {
          setFormData(updated);
          setActiveMerchant({ ...activeMerchant, ...updated });
        }
      }

      if (imagesData.profile_picture || imagesData.panal_picture) {
        const fd = new FormData();
        fd.append('merchant_id', activeMerchant.id);
        if (imagesData.profile_picture) {
           const u = imagesData.profile_picture.uri;
           fd.append('profile_picture', { uri: u, name: 'logo.jpg', type: 'image/jpeg' });
        }
        if (imagesData.panal_picture) {
           const u = imagesData.panal_picture.uri;
           fd.append('panal_picture', { uri: u, name: 'cover.jpg', type: 'image/jpeg' });
        }
        const brandRes = await client.post('/merchant/branding/', fd, {
          headers: { 'Content-Type': 'multipart/form-data' }
        });
        if (brandRes.data.success) {
          const updated = brandRes.data.profile || brandRes.data.merchant;
          if (updated) {
            setFormData(updated);
            setActiveMerchant({ ...activeMerchant, ...updated });
            setImagesData({ profile_picture: null, panal_picture: null });
          }
        }
      }

      showNotification({ title: 'تم الحفظ', message: 'تم تحديث كافة بيانات المتجر بنجاح', type: 'success' });
    } catch (err) {
       console.error(err);
       showNotification({ title: 'خطأ', message: 'فشل في حفظ البيانات، يرجى المحاولة لاحقاً', type: 'error' });
    } finally {
      setSaving(false);
    }
  };

  const handleLogout = () => {
    Alert.alert('تسجيل الخروج', 'هل أنت متأكد من رغبتك في تسجيل الخروج من حساب التاجر؟', [
      { text: 'إلغاء', style: 'cancel' },
      { text: 'خروج', style: 'destructive', onPress: async () => {
          await logout();
          navigation.reset({ index: 0, routes: [{ name: 'Home' }] });
      }},
    ]);
  };

  const coverSrc = String(imagesData.panal_picture?.uri || formData?.cover_picture_url || activeMerchant?.panal_picture || '');
  const logoSrc = String(imagesData.profile_picture?.uri || formData?.profile_picture_url || activeMerchant?.profile_picture || '');

  const headerOpacity = scrollY.interpolate({
    inputRange: [80, 160],
    outputRange: [0, 1],
    extrapolate: 'clamp',
  });

  const headerTitleOpacity = scrollY.interpolate({
    inputRange: [140, 200],
    outputRange: [0, 1],
    extrapolate: 'clamp',
  });

  const backBtnBg = scrollY.interpolate({
    inputRange: [0, 100],
    outputRange: ['rgba(0,0,0,0.3)', 'rgba(0,0,0,0)'],
    extrapolate: 'clamp',
  });

  return (
    <View style={styles.root}>
      <StatusBar barStyle="light-content" translucent backgroundColor="transparent" />
      
      {/* Animated Sticky Header */}
      <View style={styles.stickyHeader}>
        <Animated.View style={[StyleSheet.absoluteFill, { opacity: headerOpacity }]}>
          <BlurView intensity={Platform.OS === 'ios' ? 60 : 100} tint="dark" style={StyleSheet.absoluteFill} />
          <LinearGradient 
            colors={BRAND.gradients.primary} 
            style={[StyleSheet.absoluteFill, { opacity: 0.85 }]} 
            start={{ x: 0, y: 0 }} 
            end={{ x: 1, y: 1 }} 
          />
        </Animated.View>
        
        <SafeAreaView edges={['top']} style={styles.headerSafe}>
          <View style={styles.headerContent}>
            <TouchableOpacity 
              style={styles.floatingBackBtn} 
              onPress={() => navigation.goBack()}
              activeOpacity={0.7}
            >
              <Animated.View style={[StyleSheet.absoluteFill, { backgroundColor: backBtnBg, borderRadius: 15 }]} />
              <Feather name="arrow-right" size={24} color="#FFF" />
            </TouchableOpacity>

            <Animated.Text style={[styles.headerTitle, { opacity: headerTitleOpacity }]} numberOfLines={1}>
              {formData?.name || 'إعدادات المتجر'}
            </Animated.Text>

            <Logo variant="circle" size={32} />
          </View>
        </SafeAreaView>
      </View>

      <KeyboardAvoidingView style={{flex:1}} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <Animated.ScrollView 
            contentContainerStyle={styles.scroll} 
            showsVerticalScrollIndicator={false}
            onScroll={Animated.event([{ nativeEvent: { contentOffset: { y: scrollY } } }], { useNativeDriver: false })}
            scrollEventThrottle={16}
        >

          <ProfileHero 
            coverSrc={coverSrc}
            logoSrc={logoSrc}
            onEditCover={() => pickImage('panal_picture')}
            onEditLogo={() => pickImage('profile_picture')}
            storeName={formData?.name}
            primaryColor={primaryColor}
            activeMerchant={formData}
            scrollY={scrollY}
          />

          <View style={styles.contentBody}>
            {/* Basic Identity */}
            <SettingsGroup title="الهوية الأساسية" icon="info" iconColor={BRAND.colors.primary} fadeAnim={fadeAnims[0]}>
              <PremiumToggle label="حالة المتجر (نشط)" icon="activity" value={formData?.is_active} onValueChange={v => updateField('is_active', v)} color={BRAND.colors.success} />
              <PremiumInput label="اسم المتجر" icon="tag" value={formData?.name} onChangeText={t => updateField('name', t)} />
              <PremiumInput label="المعرف الفريد (Slug)" icon="at-sign" value={formData?.store_id} onChangeText={t => updateField('store_id', t)} />
              <PremiumInput label="رقم الهاتف الأساسي" icon="lock" value={formData?.phone} editable={false} />
              <PremiumInput label="رقم هاتف إضافي" icon="phone" value={formData?.secondary_phone} onChangeText={t => updateField('secondary_phone', t)} keyboardType="phone-pad" />
              <PremiumInput label="النطاق الفرعي (Subdomain)" icon="globe" value={formData?.subdomain} onChangeText={t => updateField('subdomain', t)} />
            </SettingsGroup>

            {/* Geographical Presence */}
            <SettingsGroup title="الموقع والانتشار" icon="map-pin" iconColor={THEME.colors.amber} fadeAnim={fadeAnims[1]}>
              <View style={styles.mapContainer}>
                <MapView
                  style={styles.profileMap}
                  region={{
                    latitude: Number.isFinite(parseFloat(formData?.latitude)) ? parseFloat(formData?.latitude) : 15.3694,
                    longitude: Number.isFinite(parseFloat(formData?.longitude)) ? parseFloat(formData?.longitude) : 44.1910,
                    latitudeDelta: 0.01,
                    longitudeDelta: 0.01,
                  }}
                  onPress={(e) => {
                    const coords = e?.nativeEvent?.coordinate;
                    if (coords) {
                      updateField('latitude', String(coords.latitude));
                      updateField('longitude', String(coords.longitude));
                    }
                  }}
                >
                  <Marker 
                    coordinate={{ 
                      latitude: Number.isFinite(parseFloat(formData?.latitude)) ? parseFloat(formData?.latitude) : 15.3694, 
                      longitude: Number.isFinite(parseFloat(formData?.longitude)) ? parseFloat(formData?.longitude) : 44.1910
                    }} 
                    pinColor={primaryColor}
                  />
                </MapView>
                <LinearGradient colors={['rgba(255,255,255,0.9)', 'rgba(255,255,255,0.7)']} style={styles.mapHintBadge}>
                  <Text style={[styles.mapHintText, { color: BRAND.colors.primary }]}>انقر على الخريطة لتحديد الموقع</Text>
                </LinearGradient>
              </View>

              <View style={styles.gridRow}>
                <PremiumInput label="المدينة" icon="map" value={formData?.city} onChangeText={t => updateField('city', t)} flex={1} />
                <PremiumInput label="الدولة" icon="flag" value={formData?.country} onChangeText={t => updateField('country', t)} flex={1} />
              </View>
              <PremiumInput label="العنوان التفصيلي" icon="navigation" value={formData?.address} onChangeText={t => updateField('address', t)} />
            </SettingsGroup>

            {/* Branding & Design */}
            <SettingsGroup title="تصميم المتجر (UI)" icon="layout" iconColor="#7C3AED" fadeAnim={fadeAnims[2]}
              headerAction={
                <TouchableOpacity onPress={() => setIsAiModalVisible(true)}>
                  <LinearGradient colors={['#8B5CF6', '#6366F1']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.aiTag}>
                    <Ionicons name="sparkles" size={14} color="#FFF" />
                    <Text style={styles.aiTagText}>تنسيق ذكي</Text>
                  </LinearGradient>
                </TouchableOpacity>
              }
            >
              <DeviceMockup formData={formData} primaryColor={primaryColor} />

              <Text style={styles.groupSubTitle}>القوالب اللونية المقترحة</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.presetList}>
                {PRESETS.map(p => (
                  <TouchableOpacity 
                    key={p.name} 
                    style={[styles.presetItem, { borderColor: formData?.primary_color === p.primary ? p.primary : '#F1F5F9' }]}
                    onPress={() => applyPreset(p)}
                  >
                    <View style={[styles.presetIconWrap, { backgroundColor: p.primary + '15' }]}>
                      <Feather name={p.icon} size={18} color={p.primary} />
                    </View>
                    <Text style={styles.presetItemName}>{p.name}</Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>

              <View style={styles.gridRow}>
                <PremiumInput label="اللون الأساسي" value={formData?.primary_color} onChangeText={t => updateField('primary_color', t)} flex={1} isColor />
                <PremiumInput label="اللون الثانوي" value={formData?.secondary_color} onChangeText={t => updateField('secondary_color', t)} flex={1} isColor />
              </View>
              <View style={styles.gridRow}>
                <PremiumInput label="لون التمييز" value={formData?.accent_color} onChangeText={t => updateField('accent_color', t)} flex={1} isColor />
                <PremiumInput label="لون نصوص التذييل" value={formData?.footer_text_color} onChangeText={t => updateField('footer_text_color', t)} flex={1} isColor />
              </View>
              <View style={styles.gridRow}>
                <PremiumInput label="لون القائمة" value={formData?.navbar_color} onChangeText={t => updateField('navbar_color', t)} flex={1} isColor />
                <PremiumInput label="نص القائمة" value={formData?.navbar_text_color} onChangeText={t => updateField('navbar_text_color', t)} flex={1} isColor />
              </View>
              <View style={styles.gridRow}>
                <PremiumInput label="لون التذييل" value={formData?.footer_color} onChangeText={t => updateField('footer_color', t)} flex={1} isColor />
                <View style={{ flex: 1 }} />
              </View>
            </SettingsGroup>

            {/* Financials & Delivery */}
            <SettingsGroup title="المالية والتوصيل" icon="credit-card" iconColor={BRAND.colors.success} fadeAnim={fadeAnims[3]}>
               <PremiumInput label="نسبة رسوم التوصيل (لكل كم)" icon="truck" value={String(formData?.delivery_fee_ratio || '0')} onChangeText={t => updateField('delivery_fee_ratio', t)} keyboardType="numeric" />
               
               <TouchableOpacity 
                activeOpacity={0.8} 
                onPress={() => navigation.navigate('MerchantPaymentSettings')}
                style={styles.paymentLinkCard}
              >
                <View style={styles.paymentLinkContent}>
                  <View style={styles.paymentActiveList}>
                    {paymentMethods.filter(m => m.is_active).length > 0 ? (
                      paymentMethods.filter(m => m.is_active).slice(0, 3).map((pm, idx) => (
                        <View key={idx} style={[styles.tinyMethodCircle, { zIndex: 10 - idx, marginStart: idx === 0 ? 0 : -15 }]}>
                          {pm.method_logo ? (
                            <Image source={{ uri: pm.method_logo }} style={{ width: '100%', height: '100%', borderRadius: 10 }} />
                          ) : (
                            <View style={{ width: '100%', height: '100%', borderRadius: 10, backgroundColor: '#F8FAFC', justifyContent: 'center', alignItems: 'center' }}>
                               <Feather name="credit-card" size={14} color={BRAND.colors.primary} />
                            </View>
                          )}
                        </View>
                      ))
                    ) : (
                      <View style={styles.tinyMethodCircle}>
                         <View style={{ flex: 1, backgroundColor: '#F1F5F9', borderRadius: 10, justifyContent: 'center', alignItems: 'center' }}>
                            <Feather name="plus" size={14} color={BRAND.colors.slate[400]} />
                         </View>
                      </View>
                    )}
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.paymentTitle}>الحسابات والتحصيل</Text>
                    <Text style={styles.paymentSub} numberOfLines={1}>إدارة المحافظ والتحصيل الإلكتروني</Text>
                  </View>
                </View>
                <Feather name="chevron-left" size={20} color={THEME.colors.slate[400]} />
              </TouchableOpacity>
            </SettingsGroup>

            {/* Social Media Links */}
            <SettingsGroup title="روابط التواصل الاجتماعي" icon="share-2" iconColor="#3B82F6" fadeAnim={fadeAnims[4]}>
               <PremiumInput label="فيسبوك" icon="facebook" value={formData?.facebook_url} onChangeText={t => updateField('facebook_url', t)} keyboardType="url" />
               <PremiumInput label="انستقرام" icon="instagram" value={formData?.instagram_url} onChangeText={t => updateField('instagram_url', t)} keyboardType="url" />
               <PremiumInput label="تويتر (X)" icon="twitter" value={formData?.twitter_url} onChangeText={t => updateField('twitter_url', t)} keyboardType="url" />
               <PremiumInput label="تيك توك" icon="video" value={formData?.tiktok_url} onChangeText={t => updateField('tiktok_url', t)} keyboardType="url" />
            </SettingsGroup>

            {/* Policies & Long Text */}
            <SettingsGroup title="سياسات المتجر" icon="file-text" iconColor="#64748B" fadeAnim={fadeAnims[5]}>
              <PremiumInput label="وصف التذييل (Footer)" icon="edit-3" value={formData?.footer_description} onChangeText={t => updateField('footer_description', t)} multiline />
              <PremiumInput label="سياسة الاستبدال والاسترجاع" icon="refresh-ccw" value={formData?.return_policy} onChangeText={t => updateField('return_policy', t)} multiline />
            </SettingsGroup>

            {/* Security */}
            {biometricsAvailable && (
              <SettingsGroup title="الأمان والخصوصية" icon="shield" iconColor="#6366F1" fadeAnim={fadeAnims[6]}>
                  <PremiumToggle 
                    label="الدخول بالبصمة" 
                    icon="cpu" 
                    value={biometricsEnabled} 
                    onValueChange={async (v) => {
                      if (v) {
                        Alert.alert('تفعيل البصمة', 'لتفعيل الدخول بالبصمة، يرجى تسجيل الدخول يدوياً في المرة القادمة والموافقة على طلب التفعيل.');
                      } else {
                        await disableBiometrics();
                        showNotification({ title: 'تراجع', message: 'تم تعطيل الدخول بالبصمة', type: 'info' });
                      }
                    }} 
                    color={primaryColor} 
                  />
                  <Text style={{ fontSize: 11, color: THEME.colors.slate[400], paddingHorizontal: 16, marginTop: 8, textAlign: 'right' }}>
                    استخدم التقنيات البيومترية لتأمين حسابك وسرعة الوصول
                  </Text>
              </SettingsGroup>
            )}

            {/* Managed Merchants */}
            {manageableMerchants && manageableMerchants.length > 1 && (
              <SettingsGroup title="المتاجر المُدارة" icon="users" iconColor={BRAND.colors.primary} fadeAnim={fadeAnims[7]}>
                {manageableMerchants.map(m => (
                  <View key={m.id} style={styles.merchantItem}>
                    <View style={styles.merchantMain}>
                      {m.profile_picture ? (
                        <Image source={{ uri: m.profile_picture }} style={styles.merchantLogo} />
                      ) : (
                        <View style={[styles.merchantLogo, { backgroundColor: m.primary_color || '#E2E8F0' }]}>
                           <Text style={styles.merchantInitial}>{String(m.name || 'M')[0].toUpperCase()}</Text>
                        </View>
                      )}
                      <Text style={[styles.merchantName, m.id === activeMerchant?.id && { color: BRAND.colors.primary }]}>{String(m.name || '')}</Text>
                    </View>
                    {m.id === activeMerchant?.id && (
                      <View style={styles.activePill}>
                         <Text style={styles.activePillText}>المتجر الحالي</Text>
                      </View>
                    )}
                  </View>
                ))}
              </SettingsGroup>
            )}

            <View style={styles.footerActions}>
              <TouchableOpacity style={styles.simpleAction} onPress={() => navigation.navigate('Home')}>
                <Feather name="external-link" size={18} color={THEME.colors.slate[400]} />
                <Text style={styles.simpleActionText}>زيارة المتجر كعميل</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.simpleAction, styles.logoutAction]} onPress={handleLogout}>
                <Feather name="log-out" size={18} color={THEME.colors.rose} />
                <Text style={[styles.simpleActionText, { color: THEME.colors.rose }]}>تسجيل الخروج النهائي</Text>
              </TouchableOpacity>
            </View>
          </View>

          <View style={{ height: 120 }} />
        </Animated.ScrollView>
      </KeyboardAvoidingView>

      {hasChanges && (
        <View style={styles.floatingAction}>
          <TouchableOpacity 
            style={styles.mainSaveBtn} 
            onPress={handleSave} 
            disabled={saving}
            activeOpacity={0.9}
          >
            <LinearGradient 
                colors={BRAND.gradients.primary} 
                start={{ x: 0, y: 0 }} 
                end={{ x: 1, y: 1 }} 
                style={[StyleSheet.absoluteFill, { borderRadius: 28 }]} 
            />
            {saving ? <ActivityIndicator color="#fff" /> : (
              <View style={styles.btnInner}>
                <Text style={styles.saveBtnText}>حفظ كافة التغييرات</Text>
                <Feather name="save" size={22} color="#FFF" />
              </View>
            )}
          </TouchableOpacity>
        </View>
      )}

      <BrandGenModal 
        visible={isAiModalVisible}
        onClose={() => setIsAiModalVisible(false)}
        onSuccess={handleAiColorsGenerated}
        merchantId={activeMerchant?.id}
      />
    </View>
  );
}
