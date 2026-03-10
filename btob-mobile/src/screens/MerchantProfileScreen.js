import React, { useState, useEffect } from 'react';
import {
  View, Text, StyleSheet, ScrollView,
  TouchableOpacity, Image, Alert, ImageBackground, ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Feather } from '@expo/vector-icons';
import { useAuth } from '../context/AuthContext';
import { useNavigation } from '@react-navigation/native';
import client from '../api/client';

/**
 * MerchantProfileScreen
 * Fetches fresh merchant info (with absolute image URLs) from the API.
 */

const InfoRow = ({ icon, label, value }) => (
  <View style={styles.infoRow}>
    <View style={styles.infoIcon}>
      <Feather name={icon} size={16} color="#64748B" />
    </View>
    <View style={styles.infoTextWrap}>
      <Text style={styles.infoLabel}>{label}</Text>
      <Text style={styles.infoValue}>{value || '—'}</Text>
    </View>
  </View>
);

export default function MerchantProfileScreen() {
  const navigation = useNavigation();
  const { user, activeMerchant, manageableMerchants, logout, updateMerchantList, setActiveMerchant } = useAuth();
  const primaryColor = activeMerchant?.primary_color || '#2B5876';

  // Fresh merchant data from API (has absolute image URLs)
  const [freshMerchant, setFreshMerchant] = useState(null);
  const [freshManageableMerchants, setFreshManageableMerchants] = useState([]);

  useEffect(() => {
    if (!activeMerchant?.id) return;
    client.get(`/merchant/dashboard/?merchant_id=${activeMerchant.id}`)
      .then(res => {
        if (res.data.success) {
          setFreshMerchant(res.data.merchant);
          setFreshManageableMerchants(res.data.manageable_merchants || []);
          
          // Also update global auth context for absolute URLs
          if (res.data.manageable_merchants) updateMerchantList(res.data.manageable_merchants);
          if (res.data.merchant) setActiveMerchant(res.data.merchant);
        }
      })
      .catch(() => {}); // silently fall back to activeMerchant
  }, [activeMerchant?.id]);

  // Prefer fresh API data (absolute URLs), fall back to AsyncStorage
  const merchant = freshMerchant || activeMerchant || {};
  const managedList = freshManageableMerchants.length > 0 ? freshManageableMerchants : manageableMerchants;

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

  return (
    <SafeAreaView style={styles.root} edges={['top']}>
      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>

        {/* ── Cover + Logo Hero ── */}
        <View style={styles.heroWrap}>
          {/* Cover banner */}
          {merchant?.panal_picture ? (
            <ImageBackground
              source={{ uri: merchant.panal_picture }}
              style={styles.coverBanner}
              resizeMode="cover"
            >
              <View style={[styles.coverOverlay, { backgroundColor: primaryColor + '88' }]} />
            </ImageBackground>
          ) : (
            <View style={[styles.coverBanner, { backgroundColor: primaryColor }]} />
          )}

          {/* Logo — overlapping the cover bottom */}
          <View style={styles.logoWrap}>
            <View style={[styles.logoCircle, { borderColor: primaryColor }]}>
              {merchant?.profile_picture
                ? <Image source={{ uri: merchant.profile_picture }} style={styles.logoImg} />
                : <Text style={[styles.logoInitial, { color: primaryColor }]}>
                    {(activeMerchant?.name?.[0] || 'M').toUpperCase()}
                  </Text>
              }
            </View>
          </View>
        </View>

        {/* Name + Badge */}
        <View style={styles.nameSec}>
          <Text style={styles.storeName}>{activeMerchant?.name || 'المتجر'}</Text>
          <View style={[styles.badge, { backgroundColor: primaryColor + '18' }]}>
            <Feather name="briefcase" size={11} color={primaryColor} />
            <Text style={[styles.badgeText, { color: primaryColor }]}>تاجر موثّق</Text>
          </View>
        </View>

        {/* Info card */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>معلومات التاجر</Text>
          <InfoRow icon="user"      label="المستخدم"     value={user?.username || user?.first_name} />
          <InfoRow icon="briefcase" label="اسم المتجر"   value={activeMerchant?.name} />
          <InfoRow icon="hash"      label="معرّف المتجر" value={activeMerchant?.store_id} />
        </View>

        {/* Managed Merchants */}
        {managedList.length > 1 && (
          <View style={styles.card}>
            <Text style={styles.cardTitle}>المتاجر التي تديرها ({managedList.length})</Text>
            {managedList.map((m) => (
              <View key={m.id} style={[styles.merchantRow, m.id === activeMerchant?.id && { backgroundColor: primaryColor + '10' }]}>
                {m.profile_picture
                  ? <Image source={{ uri: m.profile_picture }} style={styles.merchantRowLogo} />
                  : <View style={[styles.merchantRowDot, { backgroundColor: m.primary_color || primaryColor }]} />
                }
                <Text style={[styles.merchantRowName, m.id === activeMerchant?.id && { fontWeight: '700', color: primaryColor }]}>
                  {m.name}
                </Text>
                {m.id === activeMerchant?.id && (
                  <View style={[styles.activeBadge, { backgroundColor: primaryColor }]}>
                    <Text style={styles.activeBadgeText}>نشط</Text>
                  </View>
                )}
              </View>
            ))}
          </View>
        )}

        {/* Actions */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>الإجراءات</Text>

          <TouchableOpacity style={styles.actionRow} onPress={() => navigation.navigate('Home')}>
            <View style={[styles.actionIcon, { backgroundColor: '#EFF6FF' }]}>
              <Feather name="home" size={18} color="#2563EB" />
            </View>
            <Text style={styles.actionLabel}>الصفحة الرئيسية</Text>
            <Feather name="chevron-left" size={16} color="#CBD5E1" />
          </TouchableOpacity>

          <TouchableOpacity style={[styles.actionRow, styles.logoutRow]} onPress={handleLogout}>
            <View style={[styles.actionIcon, { backgroundColor: '#FEF2F2' }]}>
              <Feather name="log-out" size={18} color="#DC2626" />
            </View>
            <Text style={[styles.actionLabel, { color: '#DC2626' }]}>تسجيل الخروج</Text>
            <Feather name="chevron-left" size={16} color="#FCA5A5" />
          </TouchableOpacity>
        </View>

        <View style={{ height: 40 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#F8FAFC' },
  scroll: { paddingBottom: 20 },

  /* Hero */
  heroWrap: { marginBottom: 56 },
  coverBanner: { width: '100%', height: 180, position: 'relative' },
  coverOverlay: { ...StyleSheet.absoluteFillObject },
  logoWrap: {
    position: 'absolute', bottom: -48, alignSelf: 'center',
  },
  logoCircle: {
    width: 96, height: 96, borderRadius: 48,
    backgroundColor: '#fff', justifyContent: 'center', alignItems: 'center',
    borderWidth: 3, overflow: 'hidden',
    shadowColor: '#000', shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15, shadowRadius: 12, elevation: 8,
  },
  logoImg: { width: '100%', height: '100%' },
  logoInitial: { fontSize: 38, fontWeight: '800' },

  nameSec: { alignItems: 'center', marginBottom: 12, gap: 6 },
  storeName: { fontSize: 22, fontWeight: '800', color: '#0F172A' },
  badge: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    paddingHorizontal: 12, paddingVertical: 5, borderRadius: 20,
  },
  badgeText: { fontSize: 12, fontWeight: '700' },

  card: {
    backgroundColor: '#fff', marginHorizontal: 16, marginTop: 14,
    borderRadius: 20, padding: 20,
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05, shadowRadius: 8, elevation: 2,
  },
  cardTitle: {
    fontSize: 13, fontWeight: '700', color: '#94A3B8',
    marginBottom: 16, textTransform: 'uppercase', letterSpacing: 0.5,
  },

  infoRow: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 16 },
  infoIcon: { width: 38, height: 38, borderRadius: 10, backgroundColor: '#F1F5F9', justifyContent: 'center', alignItems: 'center' },
  infoTextWrap: { flex: 1 },
  infoLabel: { fontSize: 11, color: '#94A3B8', fontWeight: '500', marginBottom: 2 },
  infoValue: { fontSize: 15, fontWeight: '600', color: '#0F172A' },

  merchantRow: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    paddingVertical: 10, paddingHorizontal: 10, borderRadius: 12, marginBottom: 4,
  },
  merchantRowLogo: { width: 36, height: 36, borderRadius: 18, backgroundColor: '#F1F5F9' },
  merchantRowDot: { width: 10, height: 10, borderRadius: 5 },
  merchantRowName: { flex: 1, fontSize: 15, color: '#0F172A', fontWeight: '500' },
  activeBadge: { paddingHorizontal: 10, paddingVertical: 3, borderRadius: 20 },
  activeBadgeText: { color: '#fff', fontSize: 11, fontWeight: '700' },

  actionRow: {
    flexDirection: 'row', alignItems: 'center', gap: 14,
    paddingVertical: 12, borderRadius: 12,
  },
  logoutRow: { marginTop: 4 },
  actionIcon: { width: 42, height: 42, borderRadius: 12, justifyContent: 'center', alignItems: 'center' },
  actionLabel: { flex: 1, fontSize: 15, fontWeight: '600', color: '#0F172A' },
});
