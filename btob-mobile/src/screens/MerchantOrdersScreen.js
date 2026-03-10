import React, { useState, useEffect, useCallback } from 'react';
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity,
  ActivityIndicator, RefreshControl, StatusBar,
} from 'react-native';
import { Feather, Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuth } from '../context/AuthContext';
import client from '../api/client';

const STATUS_FILTERS = [
  { label: 'الكل',       slug: null },
  { label: 'معلقة',      slug: 'pending' },
  { label: 'مؤكدة',      slug: 'confirmed' },
  { label: 'مشحونة',     slug: 'shipped' },
  { label: 'مُسلَّمة',   slug: 'delivered' },
  { label: 'ملغاة',      slug: 'cancelled' },
];

const STATUS_COLORS = {
  pending:   { bg: '#FEF3C7', text: '#92400E' },
  confirmed: { bg: '#D1FAE5', text: '#065F46' },
  shipped:   { bg: '#DBEAFE', text: '#1E40AF' },
  delivered: { bg: '#F0FDF4', text: '#16A34A' },
  cancelled: { bg: '#FEE2E2', text: '#991B1B' },
};
const statusColor = (slug) => STATUS_COLORS[slug] || { bg: '#F1F5F9', text: '#475569' };

export default function MerchantOrdersScreen({ route, navigation }) {
  const { merchantId, filter: initialFilter } = route.params || {};
  const { activeMerchant } = useAuth();
  const resolvedMerchantId = merchantId || activeMerchant?.id;
  const primaryColor = activeMerchant?.primary_color || '#2B5876';

  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [activeFilter, setActiveFilter] = useState(initialFilter || null);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [loadingMore, setLoadingMore] = useState(false);

  const fetchOrders = useCallback(async (filterSlug, pageNum = 1, append = false) => {
    if (!resolvedMerchantId) return;
    if (pageNum === 1) setLoading(true);
    else setLoadingMore(true);

    try {
      let url = `/merchant/orders/?merchant_id=${resolvedMerchantId}&page=${pageNum}`;
      if (filterSlug) url += `&status=${filterSlug}`;
      const res = await client.get(url);
      if (res.data.success) {
        setOrders(prev => append ? [...prev, ...res.data.results] : res.data.results);
        setTotalPages(res.data.num_pages);
        setPage(pageNum);
      }
    } catch (err) {
      console.error('MerchantOrders fetch error', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
      setLoadingMore(false);
    }
  }, [resolvedMerchantId]);

  useEffect(() => {
    fetchOrders(activeFilter, 1, false);
  }, [activeFilter]);

  const onRefresh = () => {
    setRefreshing(true);
    fetchOrders(activeFilter, 1, false);
  };

  const loadMore = () => {
    if (!loadingMore && page < totalPages) {
      fetchOrders(activeFilter, page + 1, true);
    }
  };

  const renderOrder = ({ item }) => {
    const sc = statusColor(item.status_slug);
    return (
      <TouchableOpacity
        style={styles.orderCard}
        activeOpacity={0.75}
        onPress={() => navigation.navigate('MerchantOrderDetail', {
          orderId: item.id, merchantId: resolvedMerchantId,
        })}
      >
        <View style={styles.orderTop}>
          <Text style={styles.orderNum}>طلب #{item.id}</Text>
          <View style={[styles.statusChip, { backgroundColor: sc.bg }]}>
            <Text style={[styles.statusChipText, { color: sc.text }]}>{item.status_name}</Text>
          </View>
        </View>
        <Text style={styles.customerName}>{item.customer_name}</Text>
        <View style={styles.orderBottom}>
          <Text style={styles.orderTotal}>
            {parseFloat(item.total_amount).toFixed(2)} ر.ي
          </Text>
          <Text style={styles.orderDate}>
            {new Date(item.created_at).toLocaleDateString('ar-SA')}
          </Text>
        </View>
        {item.items?.length > 0 && (
          <Text style={styles.itemsHint} numberOfLines={1}>
            {item.items.map(i => `${i.product_name} x${i.quantity}`).join(' • ')}
          </Text>
        )}
      </TouchableOpacity>
    );
  };

  return (
    <SafeAreaView style={styles.root} edges={['top']}>
      <StatusBar barStyle="light-content" backgroundColor={primaryColor} />

      {/* Header */}
      <View style={[styles.header, { backgroundColor: primaryColor }]}>
        <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={22} color="#fff" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>الطلبات</Text>
        <View style={{ width: 40 }} />
      </View>

      {/* Status Filter Tabs */}
      <View style={styles.filterRow}>
        <FlatList
          horizontal
          showsHorizontalScrollIndicator={false}
          data={STATUS_FILTERS}
          keyExtractor={(f) => f.slug || 'all'}
          contentContainerStyle={{ paddingHorizontal: 12, gap: 8 }}
          renderItem={({ item: f }) => {
            const isActive = activeFilter === f.slug;
            return (
              <TouchableOpacity
                style={[
                  styles.filterTab,
                  isActive && { backgroundColor: primaryColor, borderColor: primaryColor },
                ]}
                onPress={() => setActiveFilter(f.slug)}
              >
                <Text style={[styles.filterTabText, isActive && { color: '#fff' }]}>
                  {f.label}
                </Text>
              </TouchableOpacity>
            );
          }}
        />
      </View>

      {loading ? (
        <View style={styles.centered}>
          <ActivityIndicator size="large" color={primaryColor} />
        </View>
      ) : orders.length === 0 ? (
        <View style={styles.centered}>
          <Feather name="inbox" size={52} color="#CBD5E1" />
          <Text style={styles.emptyText}>لا توجد طلبات</Text>
        </View>
      ) : (
        <FlatList
          data={orders}
          keyExtractor={(o) => String(o.id)}
          renderItem={renderOrder}
          contentContainerStyle={styles.listContent}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={primaryColor} />
          }
          onEndReached={loadMore}
          onEndReachedThreshold={0.3}
          ListFooterComponent={loadingMore ? <ActivityIndicator style={{ margin: 16 }} color={primaryColor} /> : null}
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#F8FAFC' },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 16, paddingVertical: 14,
  },
  backBtn: { width: 40, height: 40, justifyContent: 'center', alignItems: 'center' },
  headerTitle: { fontSize: 18, fontWeight: '700', color: '#fff' },
  filterRow: {
    backgroundColor: '#fff',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  filterTab: {
    paddingHorizontal: 14, paddingVertical: 6,
    borderRadius: 20, borderWidth: 1.5, borderColor: '#E2E8F0',
  },
  filterTabText: { fontSize: 13, fontWeight: '600', color: '#64748B' },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  emptyText: { marginTop: 12, color: '#94A3B8', fontSize: 14 },
  listContent: { padding: 16, gap: 12 },
  orderCard: {
    backgroundColor: '#fff', borderRadius: 16, padding: 16,
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06, shadowRadius: 8, elevation: 2,
  },
  orderTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 },
  orderNum: { fontSize: 15, fontWeight: '700', color: '#0F172A' },
  statusChip: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 20 },
  statusChipText: { fontSize: 12, fontWeight: '600' },
  customerName: { fontSize: 13, color: '#64748B', marginBottom: 10 },
  orderBottom: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 6 },
  orderTotal: { fontSize: 15, fontWeight: '700', color: '#0F172A' },
  orderDate: { fontSize: 12, color: '#94A3B8' },
  itemsHint: { fontSize: 11, color: '#94A3B8', marginTop: 2 },
});
