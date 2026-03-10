import React, { useState, useEffect, useRef } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  ActivityIndicator, StatusBar, Image, FlatList, Dimensions,
} from 'react-native';
import { Ionicons, Feather } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuth } from '../context/AuthContext';
import client from '../api/client';

const { width } = Dimensions.get('window');

const STATUS_COLORS = {
  pending:   { bg: '#FEF3C7', text: '#92400E' },
  confirmed: { bg: '#D1FAE5', text: '#065F46' },
  shipped:   { bg: '#DBEAFE', text: '#1E40AF' },
  delivered: { bg: '#F0FDF4', text: '#16A34A' },
  cancelled: { bg: '#FEE2E2', text: '#991B1B' },
};
const statusColor = (slug) => STATUS_COLORS[slug] || { bg: '#F1F5F9', text: '#475569' };

const InfoRow = ({ icon, label, value }) => (
  <View style={styles.infoRow}>
    <Feather name={icon} size={15} color="#64748B" />
    <Text style={styles.infoLabel}>{label}</Text>
    <Text style={styles.infoValue}>{value || '—'}</Text>
  </View>
);

/** Mini image strip: primary image + extra images in a horizontal scroll */
const ProductImageStrip = ({ primary, extras = [] }) => {
  const allImages = [primary, ...extras].filter(Boolean);
  if (allImages.length === 0) return null;
  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.imageStrip}>
      {allImages.map((uri, i) => (
        <Image key={i} source={{ uri }} style={styles.productThumb} resizeMode="cover" />
      ))}
    </ScrollView>
  );
};

export default function MerchantOrderDetailScreen({ route, navigation }) {
  const { orderId } = route.params || {};
  const { activeMerchant } = useAuth();

  const [order, setOrder] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!orderId) return;
    client.get(`/merchant/orders/${orderId}/`)
      .then(res => { if (res.data.success) setOrder(res.data.order); })
      .catch(err => console.error('Order detail error', err))
      .finally(() => setLoading(false));
  }, [orderId]);

  // Use merchant from the order itself (most accurate), fall back to activeMerchant
  const merchant = order?.merchant || activeMerchant;
  const primaryColor = merchant?.primary_color || '#2B5876';

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color={primaryColor} />
      </View>
    );
  }

  if (!order) {
    return (
      <View style={styles.centered}>
        <Feather name="alert-circle" size={48} color="#CBD5E1" />
        <Text style={styles.emptyText}>تعذر تحميل الطلب</Text>
      </View>
    );
  }

  const sc = statusColor(order.status_slug);

  return (
    <SafeAreaView style={styles.root} edges={['top']}>
      <StatusBar barStyle="light-content" backgroundColor={primaryColor} />

      {/* ── Header with merchant branding ── */}
      <View style={[styles.header, { backgroundColor: primaryColor }]}>
        <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={22} color="#fff" />
        </TouchableOpacity>

        <View style={styles.headerCenter}>
          {merchant?.profile_picture
            ? <Image source={{ uri: merchant.profile_picture }} style={styles.headerLogo} />
            : <View style={[styles.headerLogoPlaceholder, { borderColor: 'rgba(255,255,255,0.4)' }]}>
                <Feather name="briefcase" size={14} color="#fff" />
              </View>
          }
          <Text style={styles.headerTitle} numberOfLines={1}>طلب #{order.id}</Text>
        </View>

        <View style={{ width: 40 }} />
      </View>

      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>

        {/* Status Banner */}
        <View style={[styles.statusBanner, { backgroundColor: sc.bg }]}>
          <Text style={[styles.statusText, { color: sc.text }]}>{order.status_name}</Text>
          <Text style={[styles.statusDate, { color: sc.text + 'AA' }]}>
            {new Date(order.updated_at).toLocaleString('ar-SA')}
          </Text>
        </View>

        {/* Merchant Cover (if available) */}
        {merchant?.panal_picture && (
          <Image source={{ uri: merchant.panal_picture }} style={styles.merchantCover} resizeMode="cover" />
        )}

        {/* Order Info */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>معلومات الطلب</Text>
          <InfoRow icon="user"        label="العميل"      value={order.customer_name} />
          <InfoRow icon="dollar-sign" label="المبلغ"       value={`${parseFloat(order.total_amount).toFixed(2)} ر.ي`} />
          <InfoRow icon="calendar"    label="تاريخ الطلب" value={new Date(order.created_at).toLocaleString('ar-SA')} />
        </View>

        {/* Shipping */}
        {order.shipping && (
          <View style={styles.card}>
            <Text style={styles.cardTitle}>عنوان الشحن</Text>
            <InfoRow icon="phone"   label="الهاتف"  value={String(order.shipping.phone)} />
            <InfoRow icon="map-pin" label="العنوان" value={[order.shipping.address_line1, order.shipping.address_line2].filter(Boolean).join(' — ')} />
            <InfoRow icon="map"     label="المدينة" value={order.shipping.city} />
          </View>
        )}

        {/* Items */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>المنتجات ({order.items?.length || 0})</Text>
          {(order.items || []).map((item, idx) => (
            <View key={idx} style={[styles.itemCard, idx < order.items.length - 1 && styles.itemCardBorder]}>
              {/* Image strip */}
              <ProductImageStrip primary={item.product_image} extras={item.product_images || []} />

              {/* Details row */}
              <View style={styles.itemDetailsRow}>
                <View style={styles.itemInfo}>
                  <Text style={styles.itemName}>{item.product_name}</Text>
                  <Text style={styles.itemUnit}>
                    {parseFloat(item.unit_price).toFixed(2)} ر.ي × {item.quantity}
                  </Text>
                </View>
                <View style={styles.itemSubtotalWrap}>
                  <Text style={[styles.itemSubtotal, { color: primaryColor }]}>
                    {(parseFloat(item.unit_price) * item.quantity).toFixed(2)}
                  </Text>
                  <Text style={styles.itemSubtotalUnit}>ر.ي</Text>
                </View>
              </View>
            </View>
          ))}
        </View>

        {/* Total */}
        <View style={[styles.totalRow, { borderColor: primaryColor + '30' }]}>
          <Text style={styles.totalLabel}>إجمالي الطلب</Text>
          <Text style={[styles.totalAmount, { color: primaryColor }]}>
            {parseFloat(order.total_amount).toFixed(2)} ر.ي
          </Text>
        </View>

        <View style={{ height: 40 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#F8FAFC' },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  emptyText: { marginTop: 12, color: '#94A3B8', fontSize: 14 },

  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 16, paddingVertical: 14,
  },
  backBtn: { width: 40, height: 40, justifyContent: 'center', alignItems: 'center' },
  headerCenter: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10 },
  headerLogo: { width: 32, height: 32, borderRadius: 16, backgroundColor: 'rgba(255,255,255,0.3)' },
  headerLogoPlaceholder: {
    width: 32, height: 32, borderRadius: 16,
    backgroundColor: 'rgba(255,255,255,0.2)',
    justifyContent: 'center', alignItems: 'center', borderWidth: 1,
  },
  headerTitle: { fontSize: 17, fontWeight: '700', color: '#fff', flexShrink: 1 },

  scroll: { padding: 16, gap: 14 },

  statusBanner: { borderRadius: 16, padding: 18, alignItems: 'center', gap: 4 },
  statusText: { fontSize: 20, fontWeight: '800' },
  statusDate: { fontSize: 12 },

  merchantCover: {
    width: '100%', height: 140, borderRadius: 16, marginTop: 0,
  },

  card: {
    backgroundColor: '#fff', borderRadius: 16, padding: 16,
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06, shadowRadius: 8, elevation: 2, gap: 10,
  },
  cardTitle: { fontSize: 15, fontWeight: '700', color: '#0F172A', marginBottom: 4 },
  infoRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  infoLabel: { fontSize: 13, color: '#64748B', width: 90 },
  infoValue: { fontSize: 13, color: '#0F172A', fontWeight: '500', flex: 1 },

  /* Product items */
  itemCard: { paddingVertical: 12 },
  itemCardBorder: { borderBottomWidth: 1, borderBottomColor: '#F1F5F9' },

  imageStrip: { marginBottom: 10 },
  productThumb: {
    width: 72, height: 72, borderRadius: 10, marginRight: 8,
    backgroundColor: '#F1F5F9',
  },

  itemDetailsRow: { flexDirection: 'row', alignItems: 'center' },
  itemInfo: { flex: 1 },
  itemName: { fontSize: 14, fontWeight: '600', color: '#0F172A' },
  itemUnit: { fontSize: 12, color: '#64748B', marginTop: 3 },
  itemSubtotalWrap: { alignItems: 'flex-end' },
  itemSubtotal: { fontSize: 16, fontWeight: '800' },
  itemSubtotalUnit: { fontSize: 11, color: '#64748B' },

  totalRow: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    backgroundColor: '#fff', borderRadius: 16, padding: 16,
    borderWidth: 1.5,
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05, shadowRadius: 6, elevation: 2,
  },
  totalLabel: { fontSize: 16, fontWeight: '700', color: '#0F172A' },
  totalAmount: { fontSize: 22, fontWeight: '800' },
});
