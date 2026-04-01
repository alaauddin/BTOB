import React, { useState, useEffect, useCallback } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TextInput, Switch,
  TouchableOpacity, Image, Alert, ImageBackground, ActivityIndicator, KeyboardAvoidingView, Platform
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Feather } from '@expo/vector-icons';
import { useAuth } from '../context/AuthContext';
import { useNavigation } from '@react-navigation/native';
import * as ImagePicker from 'expo-image-picker';
import MapView, { Marker } from 'react-native-maps';
import { LinearGradient } from 'expo-linear-gradient';
import client from '../api/client';

export default function MerchantProfileScreen() {
  const navigation = useNavigation();
  const { user, activeMerchant, manageableMerchants, logout, updateMerchantList, setActiveMerchant } = useAuth();
  
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  
  // Profile Form State
  const [formData, setFormData] = useState(activeMerchant || {});
  const [imagesData, setImagesData] = useState({ profile_picture: null, panal_picture: null });

  // Fallback defaults
  const primaryColor = formData?.primary_color || activeMerchant?.primary_color || '#2B5876';

  const fetchProfile = useCallback(async () => {
    if (!activeMerchant?.id) {
      setLoading(false);
      return;
    }
    try {
      const res = await client.get(`/merchant/profile/?merchant_id=${activeMerchant.id}`);
      if (res.data.success) {
        // Support both 'profile' and 'merchant' keys for robustness
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
    // If we have activeMerchant, we already initialized formData,
    // but we still fetch to get the very latest from the server.
    fetchProfile();
  }, [fetchProfile]);

  // Image Upload Logic
  const pickImage = async (field) => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('عذراً', 'نحتاج إلى إذن الوصول للصور');
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

  const updateField = (key, val) => {
    setFormData(prev => ({ ...prev, [key]: val }));
  };

  // Submit Logic
  const handleSave = async () => {
    setSaving(true);
    let successCount = 0;

    try {
      // 1. Update text/config fields via PATCH
      // Filter out fields that shouldn't be in PATCH (read-only or already strings)
      const cleanData = {};
      const skipFields = [
        'id', 'store_id', 'profile_picture', 'panal_picture', 
        'profile_picture_url', 'cover_picture_url', 'store_link'
      ];
      
      Object.keys(formData).forEach(key => {
        if (!skipFields.includes(key) && formData[key] !== null) {
          if ((key === 'latitude' || key === 'longitude') && formData[key]) {
             // Truncate to 6 decimal places to satisfy backend constraints
             cleanData[key] = parseFloat(formData[key]).toFixed(6);
          } else {
             cleanData[key] = formData[key];
          }
        }
      });

      const patchRes = await client.patch('/merchant/profile/', {
        merchant_id: activeMerchant.id,
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

      // 2. Upload images if changed via POST /branding/
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
        Alert.alert('نجاح', 'تم حفظ التغييرات بنجاح');
      }

    } catch (err) {
      console.error('Save error', err?.response?.data || err);
      Alert.alert('خطأ', 'حدث خطأ أثناء حفظ التغييرات');
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
      <View style={{flex: 1, justifyContent: 'center', alignItems: 'center'}}>
        <ActivityIndicator size="large" color={primaryColor} />
      </View>
    );
  }

  // Determine current display sources
  const coverSrc = imagesData.panal_picture?.uri || formData?.cover_picture_url || activeMerchant?.panal_picture;
  const logoSrc = imagesData.profile_picture?.uri || formData?.profile_picture_url || activeMerchant?.profile_picture;

  return (
    <SafeAreaView style={styles.root} edges={['top']}>
      <KeyboardAvoidingView style={{flex:1}} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>

          {/* ── Cover + Logo Hero with Edit Actions ── */}
          <View style={styles.heroWrap}>
            {/* Cover banner */}
            <TouchableOpacity activeOpacity={0.8} onPress={() => pickImage('panal_picture')}>
              {coverSrc ? (
                <ImageBackground source={{ uri: coverSrc }} style={styles.coverBanner} resizeMode="cover">
                  <View style={[styles.coverOverlay, { backgroundColor: '#00000044' }]} />
                  <Feather name="camera" size={24} color="#FFF" style={styles.editIconCover} />
                </ImageBackground>
              ) : (
                <View style={[styles.coverBanner, { backgroundColor: primaryColor, justifyContent: 'center', alignItems: 'center' }]}>
                  <Feather name="camera" size={24} color="#FFF" />
                  <Text style={{color: '#FFF', marginTop: 4}}>تغيير الغلاف</Text>
                </View>
              )}
            </TouchableOpacity>

            {/* Logo */}
            <View style={styles.logoWrap}>
              <TouchableOpacity activeOpacity={0.8} onPress={() => pickImage('profile_picture')} style={[styles.logoCircle, { borderColor: primaryColor }]}>
                {logoSrc ? (
                  <Image source={{ uri: logoSrc }} style={styles.logoImg} />
                ) : (
                  <Text style={[styles.logoInitial, { color: primaryColor }]}>
                    {(formData?.name?.[0] || 'M').toUpperCase()}
                  </Text>
                )}
                <View style={styles.editIconLogoWrap}>
                  <Feather name="edit-2" size={14} color="#FFF" />
                </View>
              </TouchableOpacity>
            </View>
          </View>

          {/* Name Display */}
          <View style={styles.nameSec}>
            <Text style={styles.storeName}>{formData?.name || 'المتجر'}</Text>
            {formData?.subdomain && (
              <TouchableOpacity onPress={() => {/* Copy to clipboard? */}}>
                <Text style={styles.storeLink}>{formData?.store_link}</Text>
              </TouchableOpacity>
            )}
          </View>

          {/* ── Form Data Settings ── */}
          
          <View style={styles.card}>
            <View style={styles.sectionHeaderRow}>
               <View style={[styles.sectionIconWrap, { backgroundColor: primaryColor + '15' }]}>
                  <Feather name="info" size={16} color={primaryColor} />
               </View>
               <Text style={styles.cardTitle}>المعلومات الأساسية</Text>
            </View>
            <InputField label="اسم المتجر" icon="tag" value={formData?.name} onChangeText={t => updateField('name', t)} />
            <InputField label="رقم الهاتف" icon="phone" value={formData?.phone} onChangeText={t => updateField('phone', t)} keyboardType="phone-pad" />
            <InputField label="النطاق الفرعي (Subdomain)" icon="globe" value={formData?.subdomain} onChangeText={t => updateField('subdomain', t)} />
          </View>

          <View style={styles.card}>
            <View style={styles.sectionHeaderRow}>
               <View style={[styles.sectionIconWrap, { backgroundColor: '#F59E0B15' }]}>
                  <Feather name="map-pin" size={16} color="#B45309" />
               </View>
               <Text style={[styles.cardTitle, { color: '#B45309' }]}>الموقع الجغرافي</Text>
            </View>
            
            <View style={styles.mapWrap}>
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
              <View style={styles.mapOverlayHint}>
                <Text style={styles.mapHintText}>اضغط على الخريطة لتغيير الموقع</Text>
              </View>
            </View>

            <View style={{ flexDirection: 'row', gap: 10 }}>
              <View style={{ flex: 1 }}>
                <InputField label="خط العرض" icon="hash" value={String(formData?.latitude || '')} onChangeText={t => updateField('latitude', t)} keyboardType="numeric" />
              </View>
              <View style={{ flex: 1 }}>
                <InputField label="خط الطول" icon="hash" value={String(formData?.longitude || '')} onChangeText={t => updateField('longitude', t)} keyboardType="numeric" />
              </View>
            </View>
            <InputField label="المدينة" icon="map" value={formData?.city} onChangeText={t => updateField('city', t)} />
            <InputField label="العنوان التفصيلي" icon="navigation" value={formData?.address} onChangeText={t => updateField('address', t)} />
          </View>

          <View style={styles.card}>
            <View style={styles.sectionHeaderRow}>
               <View style={[styles.sectionIconWrap, { backgroundColor: '#10B98115' }]}>
                  <Feather name="settings" size={16} color="#059669" />
               </View>
               <Text style={[styles.cardTitle, { color: '#059669' }]}>إعدادات العرض</Text>
            </View>
            <ToggleRow label="عرض قيم الطلبات" icon="dollar-sign" value={formData?.show_order_amounts} onValueChange={v => updateField('show_order_amounts', v)} color={primaryColor} />
            <ToggleRow label="عرض بقية المنتجات في تفاصيل المنتج" icon="airplay" value={formData?.show_platform_ads} onValueChange={v => updateField('show_platform_ads', v)} color={primaryColor} />
            {/* <ToggleRow label="إظهار شعار النظام" icon="shield" value={formData?.show_system_logo} onValueChange={v => updateField('show_system_logo', v)} color={primaryColor} /> */}
          </View>

          <View style={styles.card}>
            <View style={styles.sectionHeaderRow}>
               <View style={[styles.sectionIconWrap, { backgroundColor: '#8B5CF615' }]}>
                  <Feather name="eye" size={16} color="#7C3AED" />
               </View>
               <Text style={[styles.cardTitle, { color: '#7C3AED' }]}>الهوية البصرية</Text>
            </View>
            <InputField label="اللون الأساسي (HEX)" icon="edit-3" value={formData?.primary_color} onChangeText={t => updateField('primary_color', t)} />
            <InputField label="لون الخلفية السفلي" icon="layers" value={formData?.footer_color} onChangeText={t => updateField('footer_color', t)} />
            <InputField label="لون شريط التنقل (Navbar)" icon="sidebar" value={formData?.navbar_color} onChangeText={t => updateField('navbar_color', t)} />
          </View>

          <View style={styles.card}>
            <View style={styles.sectionHeaderRow}>
               <View style={[styles.sectionIconWrap, { backgroundColor: '#6366F115' }]}>
                  <Feather name="share-2" size={16} color="#4F46E5" />
               </View>
               <Text style={[styles.cardTitle, { color: '#4F46E5' }]}>التواصل والسياسات</Text>
            </View>
            <InputField label="وصف الفوتر" icon="file-text" value={formData?.footer_description} onChangeText={t => updateField('footer_description', t)} multiline />
            <InputField label="سياسة الاسترجاع" icon="refresh-cw" value={formData?.return_policy} onChangeText={t => updateField('return_policy', t)} multiline />
            <InputField label="رابط الفيسبوك" icon="facebook" value={formData?.facebook_url} onChangeText={t => updateField('facebook_url', t)} />
            <InputField label="رابط انستقرام" icon="instagram" value={formData?.instagram_url} onChangeText={t => updateField('instagram_url', t)} />
            <InputField label="رابط تويتر" icon="twitter" value={formData?.twitter_url} onChangeText={t => updateField('twitter_url', t)} />
          </View>

          {/* Managed Merchants Section */}
          {manageableMerchants && manageableMerchants.length > 1 && (
            <View style={styles.card}>
              <View style={styles.sectionHeaderRow}>
                 <View style={[styles.sectionIconWrap, { backgroundColor: '#3B82F615' }]}>
                    <Feather name="layers" size={16} color="#3B82F6" />
                 </View>
                 <Text style={[styles.cardTitle, { color: '#3B82F6' }]}>المتاجر الأخرى المُدارة</Text>
              </View>
              {manageableMerchants.map(m => (
                <View key={m.id} style={styles.merchantRow}>
                  <View style={styles.merchantInfoSide}>
                    {m.profile_picture ? (
                      <Image source={{ uri: m.profile_picture }} style={styles.miniMerchantLogo} />
                    ) : (
                      <View style={[styles.miniMerchantLogoFallback, { backgroundColor: m.primary_color || '#CBD5E1' }]}>
                         <Text style={styles.miniMerchantInitial}>{m.name?.[0]?.toUpperCase() || 'M'}</Text>
                      </View>
                    )}
                    <Text style={[styles.merchantRowName, m.id === activeMerchant?.id && { color: primaryColor }]}>{m.name}</Text>
                  </View>
                  {m.id === activeMerchant?.id && (
                    <View style={[styles.activeBadge, { backgroundColor: primaryColor + '15' }]}>
                       <Text style={[styles.activeBadgeText, { color: primaryColor }]}>نشط</Text>
                    </View>
                  )}
                </View>
              ))}
            </View>
          )}

          {/* Quick Actions / Logout */}
          <View style={styles.card}>
            <Text style={styles.cardTitle}>خيارات النظام</Text>
            <TouchableOpacity style={styles.actionRow} onPress={() => navigation.navigate('Home')}>
              <Feather name="home" size={20} color="#2563EB" />
              <Text style={styles.actionLabel}>الصفحة الرئيسية</Text>
            </TouchableOpacity>

            <TouchableOpacity style={[styles.actionRow, styles.logoutRow]} onPress={handleLogout}>
              <Feather name="log-out" size={20} color="#DC2626" />
              <Text style={[styles.actionLabel, { color: '#DC2626' }]}>تسجيل الخروج</Text>
            </TouchableOpacity>
          </View>

          <View style={{ height: 100 }} />
        </ScrollView>
      </KeyboardAvoidingView>

      {/* Save FAB */}
      <View style={styles.fabWrap}>
        <TouchableOpacity style={[styles.saveBtn, { backgroundColor: primaryColor }]} onPress={handleSave} disabled={saving}>
          {saving ? <ActivityIndicator color="#fff" /> : <Text style={styles.saveBtnText}>حفظ التغييرات</Text>}
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

// Reusable Components
const InputField = ({ label, icon, value, onChangeText, keyboardType, multiline }) => (
  <View style={styles.inputWrap}>
    <View style={styles.labelRow}>
       <Feather name={icon} size={14} color="#94A3B8" style={{ marginLeft: 8 }} />
       <Text style={styles.inputLabel}>{label}</Text>
    </View>
    <TextInput
      style={[styles.input, multiline && styles.inputMulti]}
      value={value || ''}
      onChangeText={onChangeText}
      keyboardType={keyboardType}
      multiline={multiline}
      textAlign="right"
      placeholderTextColor="#94A3B8"
    />
  </View>
);

const ToggleRow = ({ label, icon, value, onValueChange, color }) => (
  <View style={styles.toggleRow}>
    <View style={styles.labelRow}>
       <Feather name={icon} size={14} color="#94A3B8" style={{ marginLeft: 8 }} />
       <Text style={styles.toggleLabel}>{label}</Text>
    </View>
    <Switch value={Boolean(value)} onValueChange={onValueChange} trackColor={{ true: color, false: '#CBD5E1' }} />
  </View>
);

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#F8FAFC' },
  scroll: { paddingBottom: 20 },

  heroWrap: { marginBottom: 60 },
  coverBanner: { width: '100%', height: 160, position: 'relative', justifyContent: 'center', alignItems: 'center' },
  coverOverlay: { ...StyleSheet.absoluteFillObject },
  editIconCover: { position: 'absolute', right: 20, top: 20 },

  logoWrap: { position: 'absolute', bottom: -54, alignSelf: 'center' },
  logoCircle: {
    width: 108, height: 108, borderRadius: 54, backgroundColor: '#fff',
    justifyContent: 'center', alignItems: 'center', borderWidth: 3,
    shadowColor: '#000', shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15, shadowRadius: 12, elevation: 8,
  },
  logoImg: { width: '100%', height: '100%', borderRadius: 54 },
  logoInitial: { fontSize: 38, fontWeight: '800' },
  editIconLogoWrap: {
    position: 'absolute', bottom: 0, right: 0, backgroundColor: '#334155',
    width: 32, height: 32, borderRadius: 16, justifyContent: 'center', alignItems: 'center',
    borderWidth: 2, borderColor: '#FFF'
  },

  nameSec: { alignItems: 'center', marginBottom: 12, gap: 4 },
  storeName: { fontSize: 24, fontWeight: '800', color: '#0F172A' },
  storeLink: { fontSize: 13, color: '#3B82F6', textDecorationLine: 'underline', marginBottom: 10 },

  card: {
    backgroundColor: '#fff', marginHorizontal: 20, marginTop: 16, borderRadius: 24, padding: 20,
    shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.08, shadowRadius: 12, elevation: 4,
  },
  sectionHeaderRow: { flexDirection: 'row-reverse', alignItems: 'center', marginBottom: 20, gap: 10 },
  sectionIconWrap: { width: 32, height: 32, borderRadius: 10, justifyContent: 'center', alignItems: 'center' },
  cardTitle: { fontSize: 13, fontWeight: '800', color: '#94A3B8', textTransform: 'uppercase', letterSpacing: 0.5 },

  inputWrap: { marginBottom: 16 },
  labelRow: { flexDirection: 'row-reverse', alignItems: 'center', marginBottom: 8 },
  inputLabel: { fontSize: 13, color: '#64748B', fontWeight: '700' },
  input: {
    backgroundColor: '#F8FAFC', borderRadius: 12, paddingHorizontal: 16, height: 52,
    color: '#1E293B', fontSize: 15, fontWeight: '600', borderWidth: 1, borderColor: '#F1F5F9'
  },
  inputMulti: { height: 100, paddingTop: 14, textAlignVertical: 'top' },

  toggleRow: { flexDirection: 'row-reverse', justifyContent: 'space-between', alignItems: 'center', marginBottom: 18 },
  toggleLabel: { fontSize: 14, fontWeight: '600', color: '#334155' },

  mapWrap: { height: 200, borderRadius: 16, overflow: 'hidden', marginBottom: 20, borderWidth: 1, borderColor: '#F1F5F9' },
  profileMap: { flex: 1 },
  mapOverlayHint: { position: 'absolute', bottom: 10, alignSelf: 'center', backgroundColor: 'rgba(255,255,255,0.9)', paddingHorizontal: 12, paddingVertical: 4, borderRadius: 20 },
  mapHintText: { fontSize: 10, fontWeight: '700', color: '#64748B' },

  merchantRow: { flexDirection: 'row-reverse', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: '#F1F5F9' },
  merchantInfoSide: { flexDirection: 'row-reverse', alignItems: 'center', gap: 12 },
  miniMerchantLogo: { width: 36, height: 36, borderRadius: 10, backgroundColor: '#F1F5F9' },
  miniMerchantLogoFallback: { width: 36, height: 36, borderRadius: 10, justifyContent: 'center', alignItems: 'center' },
  miniMerchantInitial: { color: '#FFF', fontSize: 14, fontWeight: '800' },
  merchantRowName: { fontSize: 15, fontWeight: '600', color: '#334155' },
  activeBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8 },
  activeBadgeText: { fontSize: 11, fontWeight: '800' },

  actionRow: { flexDirection: 'row-reverse', alignItems: 'center', gap: 12, paddingVertical: 14 },
  logoutRow: { marginTop: 4 },
  actionLabel: { flex: 1, fontSize: 15, fontWeight: '700', color: '#1E293B', textAlign: 'right' },

  fabWrap: { position: 'absolute', bottom: 20, left: 16, right: 16 },
  saveBtn: { 
    height: 56, borderRadius: 20, justifyContent: 'center', alignItems: 'center',
    shadowColor: '#000', shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.2, shadowRadius: 15, elevation: 8,
  },
  saveBtnText: { color: '#FFF', fontSize: 18, fontWeight: '800', letterSpacing: 0.5 },
});
