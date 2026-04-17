import React, { useState, useEffect, useCallback } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TextInput, Switch, Modal,
  TouchableOpacity, Image, Alert, ImageBackground, ActivityIndicator, KeyboardAvoidingView, Platform, Pressable
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

// --- SaaS Premium Design Tokens ---
const THEME = {
  colors: {
    primary: '#6366F1', // Indigo
    primaryLight: '#818CF8',
    primarySoft: '#6366F115',
    slate: {
      50: '#F8FAFC',
      100: '#F1F5F9',
      200: '#E2E8F0',
      300: '#CBD5E1',
      400: '#94A3B8',
      500: '#64748B',
      600: '#475569',
      700: '#334155',
      800: '#1E293B',
      900: '#0F172A',
    },
    emerald: '#10B981',
    amber: '#F59E0B',
    rose: '#F43F5E',
    white: '#FFFFFF',
  },
  spacing: {
    xs: 8,
    sm: 12,
    md: 16,
    lg: 24,
    xl: 32,
  },
  radius: {
    md: 12,
    lg: 20,
    xl: 24,
  }
};

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


  // Design Presets
  const PRESETS = [
    { name: 'Modern', primary: '#4F46E5', secondary: '#0F172A', navbar: '#F8FAFC', text: '#1E293B', accent: '#3B82F6', icon: 'zap' },
    { name: 'Luxury', primary: '#B45309', secondary: '#451A03', navbar: '#1C1917', text: '#FDE68A', accent: '#D97706', icon: 'award' },
    { name: 'Nature', primary: '#065F46', secondary: '#064E3B', navbar: '#ECFDF5', text: '#065F46', accent: '#10B981', icon: 'feather' },
    { name: 'Royal', primary: '#7C3AED', secondary: '#2E1065', navbar: '#F5F3FF', text: '#4C1D95', accent: '#8B5CF6', icon: 'command' },
    { name: 'Minimal', primary: '#1E293B', secondary: '#FFFFFF', navbar: '#FFFFFF', text: '#334155', accent: '#0F172A', icon: 'minus' },
  ];

  // Fallback defaults
  const primaryColor = formData?.primary_color || activeMerchant?.primary_color || THEME.colors.primary;

  const fetchProfile = useCallback(async () => {
    if (!activeMerchant?.id) {
      setLoading(false);
      return;
    }
    try {
      const res = await client.get(`/merchant/profile/?merchant_id=${activeMerchant?.id}`);
      if (res.data.success) {
        const profileData = res.data.profile || res.data.merchant;
        if (profileData) {
          setFormData(profileData);
        }
      }
    } catch (err) {
      console.error('Failed to fetch profile', err);
    } finally {
      setLoading(false);
    }
  }, [activeMerchant?.id]);

  useEffect(() => {
    fetchProfile();
  }, [fetchProfile]);

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
    setFormData(prev => ({
        ...prev,
        primary_color: colors.primary_color,
        secondary_color: colors.secondary_color,
        navbar_color: colors.navbar_color,
        navbar_text_color: colors.navbar_text_color,
        footer_color: colors.footer_color,
    }));
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
    let successCount = 0;

    try {
      const cleanData = {};
      const skipFields = [
        'id', 'store_id', 'profile_picture', 'panal_picture', 
        'profile_picture_url', 'cover_picture_url', 'store_link',
        'phone'
      ];
      
      Object.keys(formData).forEach(key => {
        if (!skipFields.includes(key) && formData[key] !== null) {
          if ((key === 'latitude' || key === 'longitude') && formData[key]) {
             cleanData[key] = parseFloat(formData[key]).toFixed(6);
          } else {
             cleanData[key] = formData[key];
          }
        }
      });

      const patchRes = await client.patch('/merchant/profile/', {
        merchant_id: activeMerchant?.id,
        ...cleanData
      });

      if (patchRes.data.success) {
        successCount++;
        const updatedProfile = patchRes.data.profile || patchRes.data.merchant;
        if (updatedProfile) {
          setFormData(updatedProfile);
          setActiveMerchant({ ...activeMerchant, ...updatedProfile });
        }
      }

      if (imagesData.profile_picture || imagesData.panal_picture) {
        const formDataBlob = new FormData();
        formDataBlob.append('merchant_id', activeMerchant.id);
        
        if (imagesData.profile_picture) {
          const u = imagesData.profile_picture.uri;
          formDataBlob.append('profile_picture', {
            uri: u, name: u.split('/').pop() || 'photo.jpg', type: 'image/jpeg'
          });
        }
        if (imagesData.panal_picture) {
          const u = imagesData.panal_picture.uri;
          formDataBlob.append('panal_picture', {
            uri: u, name: u.split('/').pop() || 'cover.jpg', type: 'image/jpeg'
          });
        }

        const brandRes = await client.post('/merchant/branding/', formDataBlob, {
          headers: { 'Content-Type': 'multipart/form-data' }
        });

        if (brandRes.data.success) {
          successCount++;
          const updatedProfile = brandRes.data.profile || brandRes.data.merchant;
          if (updatedProfile) {
            setFormData(updatedProfile);
            setActiveMerchant({ ...activeMerchant, ...updatedProfile });
            setImagesData({ profile_picture: null, panal_picture: null });
          }
        }
      }

      if (successCount > 0) {
        showNotification({
          title: 'تم الحفظ',
          message: 'تم تحديث بيانات المتجر بنجاح',
          type: 'success'
        });
      }

    } catch (err) {
    } finally {
      setSaving(false);
    }
  };

  const handleLogout = () => {
    Alert.alert('تسجيل الخروج', 'هل تريد تسجيل الخروج؟', [
      { text: 'إلغاء', style: 'cancel' },
      {
        text: 'خروج', style: 'destructive', onPress: async () => {
          await logout();
          navigation.reset({ index: 0, routes: [{ name: 'Home' }] });
        }
      },
    ]);
  };

  if (loading) {
    return (
      <View style={{flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: THEME.colors.slate[50]}}>
        <ActivityIndicator size="large" color={primaryColor} />
      </View>
    );
  }

  const coverSrc = imagesData.panal_picture?.uri || formData?.cover_picture_url || activeMerchant?.panal_picture;
  const logoSrc = imagesData.profile_picture?.uri || formData?.profile_picture_url || activeMerchant?.profile_picture;

  return (
    <SafeAreaView style={styles.root} edges={['top']}>
      <KeyboardAvoidingView style={{flex:1}} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>

          <ProfileHero 
            coverSrc={coverSrc}
            logoSrc={logoSrc}
            onEditCover={() => pickImage('panal_picture')}
            onEditLogo={() => pickImage('profile_picture')}
            storeName={formData?.name}
            primaryColor={primaryColor}
            activeMerchant={activeMerchant}
          />

          <View style={styles.contentBody}>
            <SettingsGroup title="المعلومات الأساسية" icon="info" iconColor={THEME.colors.primary}>
              <PremiumInput label="اسم المتجر" icon="tag" value={formData?.name} onChangeText={t => updateField('name', t)} />
              <PremiumInput label="رقم الهاتف (أساسي)" icon="lock" value={formData?.phone} editable={false} />
              <PremiumInput label="رقم هاتف إضافي" icon="phone" value={formData?.secondary_phone} onChangeText={t => updateField('secondary_phone', t)} keyboardType="phone-pad" />
              <PremiumInput label="النطاق الفرعي" icon="globe" value={formData?.subdomain} onChangeText={t => updateField('subdomain', t)} />
            </SettingsGroup>

            <SettingsGroup title="الموقع الجغرافي" icon="map-pin" iconColor={THEME.colors.amber}>
              <View style={styles.mapContainer}>
                <MapView
                  style={styles.profileMap}
                  region={{
                    latitude: parseFloat(formData?.latitude) || 15.3694,
                    longitude: parseFloat(formData?.longitude) || 44.1910,
                    latitudeDelta: 0.01,
                    longitudeDelta: 0.01,
                  }}
                  onPress={(e) => {
                    updateField('latitude', String(e.nativeEvent.coordinate.latitude));
                    updateField('longitude', String(e.nativeEvent.coordinate.longitude));
                  }}
                >
                  <Marker 
                    coordinate={{ 
                      latitude: parseFloat(formData?.latitude) || 15.3694, 
                      longitude: parseFloat(formData?.longitude) || 44.1910 
                    }} 
                    pinColor={primaryColor}
                  />
                </MapView>
                <BlurView intensity={20} tint="light" style={styles.mapHintBadge}>
                  <Text style={styles.mapHintText}>اضغط لتعديل الموقع</Text>
                </BlurView>
              </View>

              <View style={styles.gridRow}>
                <PremiumInput label="خط العرض" value={String(formData?.latitude || '')} onChangeText={t => updateField('latitude', t)} keyboardType="numeric" flex={1} />
                <PremiumInput label="خط الطول" value={String(formData?.longitude || '')} onChangeText={t => updateField('longitude', t)} keyboardType="numeric" flex={1} />
              </View>
              <PremiumInput label="المدينة" icon="map" value={formData?.city} onChangeText={t => updateField('city', t)} />
              <PremiumInput label="العنوان" icon="navigation" value={formData?.address} onChangeText={t => updateField('address', t)} />
            </SettingsGroup>

            <SettingsGroup title="إعدادات العرض" icon="settings" iconColor={THEME.colors.emerald}>
              <PremiumToggle label="عرض قيم الطلبات" icon="dollar-sign" value={formData?.show_order_amounts} onValueChange={v => updateField('show_order_amounts', v)} color={primaryColor} />
              <PremiumToggle label="عرض بقية المنتجات" icon="airplay" value={formData?.show_platform_ads} onValueChange={v => updateField('show_platform_ads', v)} color={primaryColor} />
              
              <TouchableOpacity style={styles.navRow} onPress={() => navigation.navigate('MerchantPaymentSettings')}>
                <View style={styles.rowLead}>
                  <View style={styles.tinyIconWrap}>
                    <Feather name="credit-card" size={14} color={THEME.colors.slate[400]} />
                  </View>
                  <Text style={styles.rowLabel}>إعدادات الدفع (Online)</Text>
                </View>
                <Feather name="chevron-left" size={18} color={THEME.colors.slate[300]} />
              </TouchableOpacity>
            </SettingsGroup>

            {biometricsAvailable && (
              <SettingsGroup title="الأمان والخصوصية" icon="shield" iconColor={THEME.colors.slate[600]}>
                <View style={{ paddingVertical: 4 }}>
                  <PremiumToggle 
                    label="تسجيل الدخول بالبصمة" 
                    icon="fingerprint" 
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

            <SettingsGroup 
              title="الهوية البصرية" 
              icon="eye" 
              iconColor="#7C3AED"
              headerAction={
                <TouchableOpacity onPress={() => setIsAiModalVisible(true)}>
                  <LinearGradient colors={['#8B5CF6', '#6366F1']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.aiTag}>
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
              <View style={styles.gridRow}>
                <PremiumInput label="نابار" value={formData?.navbar_color} onChangeText={t => updateField('navbar_color', t)} flex={1} isColor />
                <PremiumInput label="نصوص " value={formData?.navbar_text_color} onChangeText={t => updateField('navbar_text_color', t)} flex={1} isColor />
              </View>
            </SettingsGroup>

            <SettingsGroup title="التواصل والسياسات" icon="share-2" iconColor="#4F46E5">
              <PremiumInput label="وصف التذييل" icon="file-text" value={formData?.footer_description} onChangeText={t => updateField('footer_description', t)} multiline />
              <PremiumInput label="سياسة الاسترجاع" icon="refresh-cw" value={formData?.return_policy} onChangeText={t => updateField('return_policy', t)} multiline />
              <View style={styles.gridRow}>
                <PremiumInput label="فيسبوك" icon="facebook" value={formData?.facebook_url} onChangeText={t => updateField('facebook_url', t)} flex={1} />
                <PremiumInput label="انستقرام" icon="instagram" value={formData?.instagram_url} onChangeText={t => updateField('instagram_url', t)} flex={1} />
              </View>
            </SettingsGroup>

            {manageableMerchants && manageableMerchants.length > 1 && (
              <SettingsGroup title="المتاجر المُدارة" icon="layers" iconColor={THEME.colors.primary}>
                {manageableMerchants.map(m => (
                  <View key={m.id} style={styles.merchantItem}>
                    <View style={styles.merchantMain}>
                      {m.profile_picture ? (
                        <Image source={{ uri: m.profile_picture }} style={styles.merchantLogo} />
                      ) : (
                        <View style={[styles.merchantLogo, { backgroundColor: m.primary_color || THEME.colors.slate[200] }]}>
                           <Text style={styles.merchantInitial}>{m.name?.[0]?.toUpperCase() || 'M'}</Text>
                        </View>
                      )}
                      <Text style={[styles.merchantName, m.id === activeMerchant?.id && { color: THEME.colors.primary }]}>{m.name}</Text>
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
        </ScrollView>
      </KeyboardAvoidingView>

      <View style={styles.floatingAction}>
        <TouchableOpacity style={[styles.mainSaveBtn, { backgroundColor: primaryColor }]} onPress={handleSave} disabled={saving}>
          {saving ? <ActivityIndicator color="#fff" /> : (
            <>
              <Text style={styles.saveBtnText}>حفظ كافة التغييرات</Text>
              <Feather name="check" size={20} color="#FFF" style={{ marginLeft: 8 }} />
            </>
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

// --- Specialized Premium Components ---

const ProfileHero = ({ coverSrc, logoSrc, onEditCover, onEditLogo, storeName, primaryColor, activeMerchant }) => (
  <View style={styles.heroSection}>
    <TouchableOpacity activeOpacity={0.9} onPress={onEditCover}>
      {coverSrc ? (
        <ImageBackground source={{ uri: coverSrc }} style={styles.heroCover} resizeMode="cover">
          <LinearGradient colors={['transparent', 'rgba(0,0,0,0.5)']} style={StyleSheet.absoluteFill} />
          <View style={styles.coverEditChip}>
            <Feather name="camera" size={14} color="#FFF" />
            <Text style={styles.chipText}>تغيير الغلاف</Text>
          </View>
        </ImageBackground>
      ) : (
        <View style={[styles.heroCover, { backgroundColor: primaryColor }]}>
           <Feather name="image" size={32} color="rgba(255,255,255,0.4)" />
        </View>
      )}
    </TouchableOpacity>

    <View style={styles.heroLogoOuter}>
      <TouchableOpacity activeOpacity={0.9} onPress={onEditLogo} style={[styles.heroLogoCircle, { borderColor: THEME.colors.white }]}>
        {logoSrc ? (
          <Image source={{ uri: logoSrc }} style={styles.heroLogoImg} />
        ) : (
          <Text style={[styles.heroLogoText, { color: primaryColor }]}>{(storeName?.[0] || 'M').toUpperCase()}</Text>
        )}
        <View style={[styles.heroLogoEdit, { backgroundColor: THEME.colors.slate[800] }]}>
          <Feather name="edit-3" size={12} color="#FFF" />
        </View>
      </TouchableOpacity>
    </View>
    
    <View style={styles.heroTextContent}>
        <Text style={styles.heroTitle}>{storeName || 'إعدادات المتجر'}</Text>
        <Text style={styles.heroSub}>{activeMerchant?.store_link}</Text>
    </View>
  </View>
);

const SettingsGroup = ({ title, icon, iconColor, children, headerAction }) => (
  <View style={styles.groupCard}>
    <View style={styles.groupHeader}>
      <View style={styles.groupHeaderTitle}>
        <View style={[styles.groupIconWrap, { backgroundColor: iconColor + '10' }]}>
          <Feather name={icon} size={16} color={iconColor} />
        </View>
        <Text style={styles.groupHeaderText}>{title}</Text>
      </View>
      {headerAction}
    </View>
    <View style={styles.groupBody}>
      {children}
    </View>
  </View>
);

const PremiumInput = ({ label, icon, value, onChangeText, keyboardType, multiline, editable = true, flex, isColor }) => (
  <View style={[styles.premInputWrap, flex ? { flex } : {}]}>
    {label && <Text style={styles.premInputLabel}>{label}</Text>}
    <View style={[styles.premInputInner, !editable && styles.premInputDisabled]}>
      {icon && <Feather name={icon} size={16} color={THEME.colors.slate[400]} style={styles.premInputIcon} />}
      {isColor && <View style={[styles.colorPreview, { backgroundColor: value || 'transparent' }]} />}
      <TextInput
        style={[styles.premInputField, multiline && styles.premInputMulti]}
        value={value || ''}
        onChangeText={onChangeText}
        keyboardType={keyboardType}
        multiline={multiline}
        editable={editable}
        placeholderTextColor={THEME.colors.slate[300]}
        textAlign="right"
      />
    </View>
  </View>
);

const PremiumToggle = ({ label, icon, value, onValueChange, color }) => (
  <View style={styles.premToggleRow}>
    <View style={styles.premToggleLabelSide}>
      <View style={styles.tinyIconBox}>
        <Feather name={icon} size={14} color={THEME.colors.slate[400]} />
      </View>
      <Text style={styles.premToggleLabel}>{label}</Text>
    </View>
    <Switch 
      value={Boolean(value)} 
      onValueChange={onValueChange} 
      trackColor={{ true: color, false: THEME.colors.slate[200] }}
      thumbColor={Platform.OS === 'ios' ? undefined : '#FFF'}
    />
  </View>
);

const DeviceMockup = ({ formData, primaryColor }) => (
  <View style={styles.mockupFrame}>
    <View style={styles.mockupTop}>
      <View style={styles.mockupCamera} />
      <View style={[styles.mockupNav, { backgroundColor: formData?.navbar_color || '#FFF' }]}>
        <View style={styles.mockupNavItems}>
           <Feather name="menu" size={14} color={formData?.navbar_text_color || '#000'} />
           <Text style={[styles.mockupBrandName, { color: formData?.navbar_text_color || '#000' }]}>{formData?.name || 'Brand'}</Text>
           <Feather name="shopping-bag" size={14} color={formData?.navbar_text_color || '#000'} />
        </View>
      </View>
    </View>
    <View style={styles.mockupContent}>
       <View style={[styles.mockupBtnLarge, { backgroundColor: primaryColor }]}>
          <Text style={styles.mockupBtnTextLarge}>إتمام الطلب</Text>
       </View>
       <View style={styles.mockupContrast}>
          <Feather name="check-circle" size={12} color={THEME.colors.emerald} />
          <Text style={styles.mockupContrastText}>تنسيق ألوان احترافي</Text>
       </View>
    </View>
    <View style={[styles.mockupBottom, { backgroundColor: formData?.footer_color || '#F8FAFC' }]}>
       <View style={styles.mockupFooterLine} />
    </View>
  </View>
);

// --- SaaS Premium Stylesheet ---

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: THEME.colors.slate[50] },
  scroll: { paddingBottom: 40 },
  contentBody: { paddingHorizontal: THEME.spacing.md, marginTop: -20 },

  // Hero Section
  heroSection: { marginBottom: THEME.spacing.xl },
  heroCover: { width: '100%', height: 200, overflow: 'hidden' },
  coverEditChip: {
    position: 'absolute', bottom: 32, right: 16,
    backgroundColor: 'rgba(0,0,0,0.6)', paddingHorizontal: 12, paddingVertical: 6,
    borderRadius: THEME.radius.md, flexDirection: 'row-reverse', alignItems: 'center', gap: 6
  },
  chipText: { color: '#FFF', fontSize: 11, fontWeight: '700' },
  heroLogoOuter: {
    alignSelf: 'center', marginTop: -60,
    shadowColor: '#000', shadowOffset: { width: 0, height: 10 }, shadowOpacity: 0.1, shadowRadius: 20, elevation: 12
  },
  heroLogoCircle: {
    width: 120, height: 120, borderRadius: 60, backgroundColor: '#FFF',
    borderWidth: 4, justifyContent: 'center', alignItems: 'center', position: 'relative'
  },
  heroLogoImg: { width: 112, height: 112, borderRadius: 56 },
  heroLogoText: { fontSize: 44, fontWeight: '900' },
  heroLogoEdit: {
    position: 'absolute', bottom: 4, left: 4, width: 32, height: 32,
    borderRadius: 16, justifyContent: 'center', alignItems: 'center', borderWidth: 2, borderColor: '#FFF'
  },
  heroTextContent: { alignItems: 'center', marginTop: THEME.spacing.sm },
  heroTitle: { fontSize: 24, fontWeight: '900', color: THEME.colors.slate[900] },
  heroSub: { fontSize: 13, color: THEME.colors.primary, marginTop: 4, fontWeight: '700' },

  // Group Cards
  groupCard: {
    backgroundColor: THEME.colors.white, borderRadius: THEME.radius.xl,
    padding: THEME.spacing.md, marginBottom: THEME.spacing.md,
    borderWidth: 1, borderColor: THEME.colors.slate[100]
  },
  groupHeader: { flexDirection: 'row-reverse', justifyContent: 'space-between', alignItems: 'center', marginBottom: THEME.spacing.lg },
  groupHeaderTitle: { flexDirection: 'row-reverse', alignItems: 'center', gap: 10 },
  groupIconWrap: { width: 36, height: 36, borderRadius: 10, justifyContent: 'center', alignItems: 'center' },
  groupHeaderText: { fontSize: 15, fontWeight: '800', color: THEME.colors.slate[800], letterSpacing: -0.2 },
  groupBody: { gap: THEME.spacing.md },

  // Input Styles
  premInputWrap: { marginBottom: 4 },
  premInputLabel: { fontSize: 12, fontWeight: '700', color: THEME.colors.slate[500], marginBottom: 8, marginRight: 4 },
  premInputInner: {
    flexDirection: 'row-reverse', alignItems: 'center', backgroundColor: THEME.colors.slate[50],
    borderRadius: THEME.radius.md, borderWidth: 1, borderColor: THEME.colors.slate[100], height: 52, paddingHorizontal: THEME.spacing.md
  },
  premInputDisabled: { backgroundColor: THEME.colors.slate[100], borderColor: THEME.colors.slate[200] },
  premInputIcon: { marginLeft: 10 },
  premInputField: { flex: 1, fontSize: 14, fontWeight: '600', color: THEME.colors.slate[800] },
  premInputMulti: { height: 100, paddingTop: 14, textAlignVertical: 'top' },
  colorPreview: { width: 20, height: 20, borderRadius: 6, borderWidth: 1, borderColor: THEME.colors.slate[200], marginLeft: 10 },

  // Toggle Styles
  premToggleRow: {
    flexDirection: 'row-reverse', justifyContent: 'space-between', alignItems: 'center',
    paddingVertical: THEME.spacing.xs, borderBottomWidth: 1, borderBottomColor: THEME.colors.slate[50]
  },
  premToggleLabelSide: { flexDirection: 'row-reverse', alignItems: 'center', gap: 10 },
  tinyIconBox: { width: 28, height: 28, borderRadius: 8, backgroundColor: THEME.colors.slate[50], justifyContent: 'center', alignItems: 'center' },
  premToggleLabel: { fontSize: 14, fontWeight: '600', color: THEME.colors.slate[700] },

  // Layout Helpers
  gridRow: { flexDirection: 'row', gap: THEME.spacing.md },
  navRow: {
    flexDirection: 'row-reverse', justifyContent: 'space-between', alignItems: 'center',
    paddingVertical: THEME.spacing.md, marginTop: THEME.spacing.xs
  },
  rowLead: { flexDirection: 'row-reverse', alignItems: 'center', gap: 10 },
  tinyIconWrap: { width: 28, height: 28, borderRadius: 8, backgroundColor: THEME.colors.slate[50], justifyContent: 'center', alignItems: 'center' },
  rowLabel: { fontSize: 14, fontWeight: '600', color: THEME.colors.slate[600] },

  // Map
  mapContainer: { height: 180, borderRadius: THEME.radius.lg, overflow: 'hidden', marginBottom: THEME.spacing.md },
  profileMap: { flex: 1 },
  mapHintBadge: { position: 'absolute', bottom: 12, alignSelf: 'center', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20 },
  mapHintText: { fontSize: 11, fontWeight: '800', color: THEME.colors.slate[800] },

  // Brand UI
  aiTag: { flexDirection: 'row-reverse', alignItems: 'center', gap: 6, paddingHorizontal: 10, paddingVertical: 6, borderRadius: 10 },
  aiTagText: { color: '#FFF', fontSize: 11, fontWeight: '800' },
  groupSubTitle: { fontSize: 12, fontWeight: '800', color: THEME.colors.slate[400], marginTop: 10, marginBottom: 8 },
  presetList: { marginBottom: 8 },
  presetItem: {
    width: 80, height: 80, borderRadius: THEME.radius.lg, backgroundColor: THEME.colors.white,
    marginRight: THEME.spacing.xs, justifyContent: 'center', alignItems: 'center', borderWidth: 2, gap: 6
  },
  presetIconWrap: { width: 32, height: 32, borderRadius: 10, justifyContent: 'center', alignItems: 'center' },
  presetItemName: { fontSize: 10, fontWeight: '700', color: THEME.colors.slate[600] },

  // Device Mockup
  mockupFrame: {
    backgroundColor: THEME.colors.slate[900], borderRadius: THEME.radius.xl,
    padding: 8, borderWidth: 1, borderColor: THEME.colors.slate[800], marginVertical: THEME.spacing.md
  },
  mockupTop: { height: 60, backgroundColor: THEME.colors.white, borderTopLeftRadius: 16, borderTopRightRadius: 16, overflow: 'hidden' },
  mockupCamera: { width: 40, height: 4, backgroundColor: THEME.colors.slate[100], borderRadius: 2, alignSelf: 'center', marginVertical: 6 },
  mockupNav: { height: 44, paddingHorizontal: 12, justifyContent: 'center' },
  mockupNavItems: { flexDirection: 'row-reverse', justifyContent: 'space-between', alignItems: 'center' },
  mockupBrandName: { fontSize: 12, fontWeight: '900' },
  mockupContent: { height: 120, backgroundColor: THEME.colors.white, justifyContent: 'center', alignItems: 'center', gap: 10 },
  mockupBtnLarge: { paddingHorizontal: 24, paddingVertical: 10, borderRadius: 12 },
  mockupBtnTextLarge: { color: '#FFF', fontSize: 12, fontWeight: '900' },
  mockupContrast: { flexDirection: 'row-reverse', alignItems: 'center', gap: 4, paddingHorizontal: 8, paddingVertical: 4, backgroundColor: THEME.colors.emerald + '10', borderRadius: 6 },
  mockupContrastText: { color: THEME.colors.emerald, fontSize: 9, fontWeight: '800' },
  mockupBottom: { height: 40, borderBottomLeftRadius: 16, borderBottomRightRadius: 16, justifyContent: 'center', paddingHorizontal: 16 },
  mockupFooterLine: { height: 4, width: '30%', backgroundColor: THEME.colors.slate[200], borderRadius: 2 },

  // Manage Merchants
  merchantItem: { flexDirection: 'row-reverse', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: THEME.colors.slate[50] },
  merchantMain: { flexDirection: 'row-reverse', alignItems: 'center', gap: 12 },
  merchantLogo: { width: 40, height: 40, borderRadius: 12, justifyContent: 'center', alignItems: 'center' },
  merchantInitial: { color: THEME.colors.white, fontSize: 16, fontWeight: '900' },
  merchantName: { fontSize: 15, fontWeight: '700', color: THEME.colors.slate[700] },
  activePill: { backgroundColor: THEME.colors.primarySoft, paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8 },
  activePillText: { fontSize: 10, fontWeight: '800', color: THEME.colors.primary },

  // Footer Actions
  footerActions: { marginTop: THEME.spacing.xl, paddingHorizontal: THEME.spacing.xs, gap: THEME.spacing.md },
  simpleAction: { flexDirection: 'row-reverse', alignItems: 'center', gap: 12, paddingVertical: 4 },
  simpleActionText: { fontSize: 15, fontWeight: '700', color: THEME.colors.slate[500] },
  logoutAction: { marginTop: 4 },

  // Floating CTA
  floatingAction: {
    position: 'absolute', bottom: 32, left: 24, right: 24,
    shadowColor: THEME.colors.primary, shadowOffset: { width: 0, height: 12 }, shadowOpacity: 0.3, shadowRadius: 20, elevation: 15
  },
  mainSaveBtn: {
    height: 60, borderRadius: THEME.radius.lg, flexDirection: 'row-reverse', justifyContent: 'center', alignItems: 'center'
  },
  saveBtnText: { color: '#FFF', fontSize: 16, fontWeight: '900', letterSpacing: 0.2 },
});
