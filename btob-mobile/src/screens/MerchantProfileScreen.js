import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  View, Text, ScrollView, Modal, TouchableOpacity, Image, Alert, 
  ActivityIndicator, KeyboardAvoidingView, Platform, Animated, StyleSheet
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Feather } from '@expo/vector-icons';
import { BlurView } from 'expo-blur';
import { useAuth } from '../context/AuthContext';
import { useNotifications } from '../context/NotificationContext';
import { useNavigation } from '@react-navigation/native';
import * as ImagePicker from 'expo-image-picker';
import MapView, { Marker } from '../components/MapModule';
import { LinearGradient } from 'expo-linear-gradient';
import client from '../api/client';
import BrandGenModal from '../components/BrandGenModal';

// Imported Refactored Components
import { THEME } from '../theme/profileTheme';
import { styles } from '../theme/profileStyles';
import ProfileHero from '../components/profile/ProfileHero';
import SettingsGroup from '../components/profile/SettingsGroup';
import PremiumInput from '../components/profile/PremiumInput';
import PremiumToggle from '../components/profile/PremiumToggle';
import DeviceMockup from '../components/profile/DeviceMockup';

export default function MerchantProfileScreen() {
  const navigation = useNavigation();
  const { 
    user, activeMerchant, manageableMerchants, logout, 
    updateMerchantList, setActiveMerchant,
    biometricsAvailable, biometricsEnabled, 
    enableBiometrics, disableBiometrics 
  } = useAuth();
  const { showNotification } = useNotifications();
  
  const [errorStatus, setErrorStatus] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  
  // Profile Form State
  const [formData, setFormData] = useState(activeMerchant || {});
  const [imagesData, setImagesData] = useState({ profile_picture: null, panal_picture: null });
  const [isAiModalVisible, setIsAiModalVisible] = useState(false);

  // Animations
  const scrollY = useRef(new Animated.Value(0)).current;
  const fadeAnims = useRef([
    new Animated.Value(0), new Animated.Value(0), 
    new Animated.Value(0), new Animated.Value(0), 
    new Animated.Value(0), new Animated.Value(0),
    new Animated.Value(0)
  ]).current;

  // Design Presets
  const PRESETS = [
    { name: 'Modern', primary: '#4F46E5', secondary: '#0F172A', navbar: '#F8FAFC', text: '#1E293B', accent: '#3B82F6', icon: 'zap' },
    { name: 'Luxury', primary: '#B45309', secondary: '#451A03', navbar: '#1C1917', text: '#FDE68A', accent: '#D97706', icon: 'award' },
    { name: 'Nature', primary: '#065F46', secondary: '#064E3B', navbar: '#ECFDF5', text: '#065F46', accent: '#10B981', icon: 'feather' },
    { name: 'Royal', primary: '#7C3AED', secondary: '#2E1065', navbar: '#F5F3FF', text: '#4C1D95', accent: '#8B5CF6', icon: 'command' },
    { name: 'Minimal', primary: '#1E293B', secondary: '#FFFFFF', navbar: '#FFFFFF', text: '#334155', accent: '#0F172A', icon: 'minus' },
  ];

  const primaryColor = String(formData?.primary_color || activeMerchant?.primary_color || THEME.colors.primary);

  const [paymentMethods, setPaymentMethods] = useState([]);

  const fetchProfile = useCallback(async () => {
    if (!activeMerchant?.id) {
       setLoading(false);
       return;
    }
    try {
      const [profRes, payRes] = await Promise.all([
        client.get(`/merchant/profile/?merchant_id=${activeMerchant?.id}`),
        client.get(`/merchant/payment-settings/?merchant_id=${activeMerchant?.id}`)
      ]);
      
      if (profRes.data.success) {
        const profileData = profRes.data.profile || profRes.data.merchant;
        if (profileData) setFormData(profileData);
      }
      
      setPaymentMethods(payRes.data.results || payRes.data || []);
    } catch (err) {
      console.error('Failed to fetch profile/payments', err);
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
          duration: 500,
          delay: i * 80,
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
      mediaTypes: 'images',
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
    }));
  };

  const updateField = (key, val) => {
    setFormData(prev => ({ ...prev, [key]: val }));
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const cleanData = {};
      const skipFields = ['id', 'store_id', 'profile_picture', 'panal_picture', 'profile_picture_url', 'cover_picture_url', 'store_link', 'phone'];
      
      Object.keys(formData).forEach(key => {
        if (!skipFields.includes(key) && formData[key] !== null) {
          cleanData[key] = formData[key];
        }
      });

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

      showNotification({ title: 'تم الحفظ', message: 'تم تحديث بيانات المتجر بنجاح', type: 'success' });
    } catch (err) {
       console.error(err);
    } finally {
      setSaving(false);
    }
  };

  const handleLogout = () => {
    Alert.alert('تسجيل الخروج', 'هل تريد تسجيل الخروج؟', [
      { text: 'إلغاء', style: 'cancel' },
      { text: 'خروج', style: 'destructive', onPress: async () => {
          await logout();
          navigation.reset({ index: 0, routes: [{ name: 'Home' }] });
      }},
    ]);
  };

  if (loading) {
    return (
      <SafeAreaView style={[styles.root, { justifyContent: 'center', alignItems: 'center' }]}>
        <ActivityIndicator size="large" color={THEME.colors.primary} />
        <Text style={styles.loadingText}>جاري تحميل عالمك الخاص...</Text>
      </SafeAreaView>
    );
  }

  const coverSrc = String(imagesData.panal_picture?.uri || formData?.cover_picture_url || activeMerchant?.panal_picture || '');
  const logoSrc = String(imagesData.profile_picture?.uri || formData?.profile_picture_url || activeMerchant?.profile_picture || '');

  const headerOpacity = scrollY.interpolate({
    inputRange: [180, 240],
    outputRange: [0, 1],
    extrapolate: 'clamp',
  });

  return (
    <SafeAreaView style={styles.root} edges={['top']}>
      <Animated.View style={[styles.stickyHeader, { opacity: headerOpacity }]}>
          <BlurView intensity={80} tint="light" style={StyleSheet.absoluteFill} />
          <View style={styles.headerContent}>
             <Text style={styles.headerTitle}>{String(formData?.name || '')}</Text>
             <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
                <Feather name="chevron-right" size={24} color={THEME.colors.slate[800]} />
             </TouchableOpacity>
          </View>
      </Animated.View>

      <KeyboardAvoidingView style={{flex:1}} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <Animated.ScrollView 
            contentContainerStyle={styles.scroll} 
            showsVerticalScrollIndicator={false}
            onScroll={Animated.event([{ nativeEvent: { contentOffset: { y: scrollY } } }], { useNativeDriver: true })}
            scrollEventThrottle={16}
        >

          <ProfileHero 
            coverSrc={coverSrc}
            logoSrc={logoSrc}
            onEditCover={() => pickImage('panal_picture')}
            onEditLogo={() => pickImage('profile_picture')}
            storeName={formData?.name}
            primaryColor={primaryColor}
            activeMerchant={activeMerchant}
            scrollY={scrollY}
          />

          <View style={styles.contentBody}>
            <SettingsGroup title="المعلومات الأساسية" icon="info" iconColor={THEME.colors.primary} fadeAnim={fadeAnims[0]}>
              <PremiumInput label="اسم المتجر" icon="tag" value={formData?.name} onChangeText={t => updateField('name', t)} />
              <PremiumInput label="رقم الهاتف (أساسي)" icon="lock" value={formData?.phone} editable={false} />
              <PremiumInput label="رقم هاتف إضافي" icon="phone" value={formData?.secondary_phone} onChangeText={t => updateField('secondary_phone', t)} keyboardType="phone-pad" />
              <PremiumInput label="النطاق الفرعي" icon="globe" value={formData?.subdomain} onChangeText={t => updateField('subdomain', t)} />
            </SettingsGroup>

            <SettingsGroup title="الموقع الجغرافي" icon="map-pin" iconColor={THEME.colors.amber} fadeAnim={fadeAnims[1]}>
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
                <View style={[styles.mapHintBadge, { backgroundColor: 'rgba(255,255,255,0.8)', overflow: 'hidden', borderRadius: 12 }]}>
                 <BlurView intensity={20} tint="light" style={StyleSheet.absoluteFill} />
                 <Text style={[styles.mapHintText, { color: '#000', paddingHorizontal: 10, paddingVertical: 4 }]}>اضغط لتعديل الموقع</Text>
                </View>
              </View>

              <View style={styles.gridRow}>
                <PremiumInput label="خط العرض" value={String(formData?.latitude || '')} onChangeText={t => updateField('latitude', t)} keyboardType="numeric" flex={1} />
                <PremiumInput label="خط الطول" value={String(formData?.longitude || '')} onChangeText={t => updateField('longitude', t)} keyboardType="numeric" flex={1} />
              </View>
              <PremiumInput label="المدينة" icon="map" value={formData?.city} onChangeText={t => updateField('city', t)} />
              <PremiumInput label="العنوان" icon="navigation" value={formData?.address} onChangeText={t => updateField('address', t)} />
            </SettingsGroup>

            <SettingsGroup title="الهوية البصرية" icon="eye" iconColor="#7C3AED" fadeAnim={fadeAnims[2]}
              headerAction={
                <TouchableOpacity onPress={() => setIsAiModalVisible(true)}>
                  <LinearGradient colors={['#8B5CF6', '#6366F1']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={[styles.aiTag, { overflow: 'hidden' }]}>
                    <Feather name="zap" size={12} color="#FFF" />
                    <Text style={styles.aiTagText}>المولد الذكي</Text>
                  </LinearGradient>
                </TouchableOpacity>
              }
            >
              <DeviceMockup formData={formData} primaryColor={primaryColor} />

              <Text style={styles.groupSubTitle}>القوالب الجاهزة</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.presetList}>
                {PRESETS.map(p => (
                  <TouchableOpacity 
                    key={p.name} 
                    style={[styles.presetItem, { borderColor: formData?.primary_color === p.primary ? p.primary : THEME.colors.slate[100] }]}
                    onPress={() => applyPreset(p)}
                  >
                    <View style={[styles.presetIconWrap, { backgroundColor: p.primary + '15' }]}>
                      <Feather name={p.icon} size={16} color={p.primary} />
                    </View>
                    <Text style={styles.presetItemName}>{p.name}</Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>

              <View style={styles.gridRow}>
                <PremiumInput label="الأساسي" value={formData?.primary_color} onChangeText={t => updateField('primary_color', t)} flex={1} isColor />
                <PremiumInput label="التذييل" value={formData?.footer_color} onChangeText={t => updateField('footer_color', t)} flex={1} isColor />
              </View>
            </SettingsGroup>

            <SettingsGroup title="طرق الدفع الإلكتروني" icon="credit-card" iconColor="#10B981" fadeAnim={fadeAnims[3]}>
              <TouchableOpacity 
                activeOpacity={0.7} 
                onPress={() => navigation.navigate('MerchantPaymentSettings')}
                style={styles.paymentLinkCard}
              >
                <View style={styles.paymentLinkContent}>
                  <View style={styles.paymentActiveList}>
                    {paymentMethods.filter(m => m.is_active).length > 0 ? (
                      paymentMethods.filter(m => m.is_active).slice(0, 3).map((pm, idx) => (
                        <View key={idx} style={[styles.tinyMethodCircle, { zIndex: 10 - idx, marginLeft: idx === 0 ? 0 : -10 }]}>
                          {pm.method_logo ? (
                            <Image source={{ uri: pm.method_logo }} style={{ width: '100%', height: '100%', borderRadius: 10 }} />
                          ) : (
                            <View style={{ width: '100%', height: '100%', borderRadius: 10, backgroundColor: THEME.colors.slate[100], justifyContent: 'center', alignItems: 'center' }}>
                               <Feather name="wallet" size={10} color={primaryColor} />
                            </View>
                          )}
                        </View>
                      ))
                    ) : (
                      <Text style={styles.noPaymentsText}>لم يتم تفعيل أي وسيلة</Text>
                    )}
                  </View>
                  <View style={{ alignItems: 'flex-start' }}>
                    <Text style={styles.paymentTitle}>إدارة الحسابات البنكية</Text>
                    <Text style={styles.paymentSub}>التحصيل عبر الكريمي، المحافظ، والتحويلات</Text>
                  </View>
                </View>
                <Feather name="chevron-left" size={18} color={THEME.colors.slate[300]} />
              </TouchableOpacity>
            </SettingsGroup>

            {biometricsAvailable && (
              <SettingsGroup title="الأمان والخصوصية" icon="shield" iconColor={THEME.colors.slate[600]} fadeAnim={fadeAnims[4]}>
                <View style={{ paddingVertical: 4 }}>
                  <PremiumToggle 
                    label="تسجيل الدخول بالبصمة" 
                    icon="shield" 
                    value={biometricsEnabled} 
                    onValueChange={async (v) => {
                      if (v) {
                        Alert.alert('تفعيل البصمة', 'لتفعيل الدخول بالبصمة، يرجى تسجيل الدخول يدوياً في المرة القادمة والموافقة على طلب التفعيل.');
                      } else {
                        await disableBiometrics();
                        showNotification({ title: 'نجاح', message: 'تم تعطيل الدخول بالبصمة', type: 'success' });
                      }
                    }} 
                    color={primaryColor} 
                  />
                  <Text style={{ fontSize: 11, color: THEME.colors.slate[500], paddingHorizontal: 16, marginTop: -4, textAlign: 'right' }}>
                    استخدم بصمة الإصبع أو الوجه للدخول السريع مستقبلاً
                  </Text>
                </View>
              </SettingsGroup>
            )}

            <SettingsGroup title="التواصل والسياسات" icon="share-2" iconColor="#4F46E5" fadeAnim={fadeAnims[5]}>
              <PremiumInput label="وصف التذييل" icon="file-text" value={formData?.footer_description} onChangeText={t => updateField('footer_description', t)} multiline />
              <PremiumInput label="سياسة الاسترجاع" icon="refresh-cw" value={formData?.return_policy} onChangeText={t => updateField('return_policy', t)} multiline />
            </SettingsGroup>

            {manageableMerchants && manageableMerchants.length > 1 && (
              <SettingsGroup title="المتاجر المُدارة" icon="layers" iconColor={THEME.colors.primary} fadeAnim={fadeAnims[6]}>
                {manageableMerchants.map(m => (
                  <View key={m.id} style={styles.merchantItem}>
                    <View style={styles.merchantMain}>
                      {m.profile_picture ? (
                        <Image source={{ uri: m.profile_picture }} style={styles.merchantLogo} />
                      ) : (
                        <View style={[styles.merchantLogo, { backgroundColor: m.primary_color || THEME.colors.slate[200] }]}>
                           <Text style={styles.merchantInitial}>{String(m.name || 'M')[0].toUpperCase()}</Text>
                        </View>
                      )}
                      <Text style={[styles.merchantName, m.id === activeMerchant?.id && { color: THEME.colors.primary }]}>{String(m.name || '')}</Text>
                    </View>
                    {m.id === activeMerchant?.id && (
                      <View style={styles.activePill}>
                         <Text style={styles.activePillText}>نشط الآن</Text>
                      </View>
                    )}
                  </View>
                ))}
              </SettingsGroup>
            )}

            <View style={styles.footerActions}>
              <TouchableOpacity style={styles.simpleAction} onPress={() => navigation.navigate('Home')}>
                <Feather name="home" size={20} color={THEME.colors.slate[500]} />
                <Text style={styles.simpleActionText}>العودة للرئيسية</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.simpleAction, styles.logoutAction]} onPress={handleLogout}>
                <Feather name="log-out" size={20} color={THEME.colors.rose} />
                <Text style={[styles.simpleActionText, { color: THEME.colors.rose }]}>تسجيل الخروج</Text>
              </TouchableOpacity>
            </View>
          </View>

          <View style={{ height: 120 }} />
        </Animated.ScrollView>
      </KeyboardAvoidingView>

      <View style={styles.floatingAction}>
        <TouchableOpacity style={[styles.mainSaveBtn, { backgroundColor: primaryColor }]} onPress={handleSave} disabled={saving}>
          {saving ? <ActivityIndicator color="#fff" /> : (
            <View style={styles.btnInner}>
              <Text style={styles.saveBtnText}>حفظ كافة التغييرات</Text>
              <Feather name="check-circle" size={20} color="#FFF" style={{ marginLeft: 8 }} />
            </View>
          )}
        </TouchableOpacity>
      </View>

      <BrandGenModal 
        visible={isAiModalVisible}
        onClose={() => setIsAiModalVisible(false)}
        onSuccess={handleAiColorsGenerated}
        merchantId={activeMerchant?.id}
      />
    </SafeAreaView>
  );
}
