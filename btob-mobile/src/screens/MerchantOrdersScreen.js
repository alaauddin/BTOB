import React, { useState, useEffect, useCallback } from 'react';
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity,
  ActivityIndicator, RefreshControl, StatusBar, Dimensions
} from 'react-native';
import { Feather } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { useAuth } from '../context/AuthContext';
import client from '../api/client';
import { BRAND } from '../theme/brand';
import Logo from '../components/Logo';

const { width } = Dimensions.get('window');

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

const getStatusStyle = (slug) => STATUS_COLORS[slug] || { bg: '#F1F5F9', text: '#475569' };

export default function MerchantOrdersScreen({ route, navigation }) {
  const { merchantId, filter: initialFilter } = route.params || {};
  const { activeMerchant } = useAuth();
  const resolvedMerchantId = merchantId || activeMerchant?.id;

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
      console.error('Fetch orders error', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
      setLoadingMore(false);
    }
  }, [resolvedMerchantId]);

  useEffect(() => {
    fetchOrders(activeFilter, 1, false);
  }, [activeFilter, fetchOrders]);

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
    const sc = getStatusStyle(item.status_slug);
    const curr = activeMerchant?.currency?.symbol || 'د.ك';
    
    return (
      <TouchableOpacity
        style={styles.orderRow}
        activeOpacity={0.72}
        onPress={() => navigation.navigate('MerchantOrderDetail', {
          orderId: item.id, merchantId: resolvedMerchantId,
        })}
      >
        <View style={[styles.orderAccent, { backgroundColor: sc.text }]} />
        <View style={styles.orderRowBody}>
          <View style={styles.orderRowTop}>
            <Text style={styles.orderRowId}>طلب #{item.id}</Text>
            <View style={[styles.statusPill, { backgroundColor: sc.bg }]}>
              <Text style={[styles.statusPillText, { color: sc.text }]}>{item.status_name}</Text>
            </View>
          </View>
          
          <Text style={styles.orderRowCustomer}>{item.customer_name}</Text>
          
          <View style={styles.orderRowBottom}>
            <Text style={styles.orderRowAmount}>
              {parseFloat(item.total_amount).toFixed(2)} {curr}
            </Text>
            <Text style={styles.orderRowDate}>
              {new Date(item.created_at).toLocaleDateString('ar-SA')}
            </Text>
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <View style={styles.root}>
      <StatusBar barStyle="light-content" />
      
      <LinearGradient colors={BRAND.gradients.primary} style={styles.headerGradient}>
        <SafeAreaView edges={['top']} style={styles.headerContent}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
            <Feather name="arrow-right" size={24} color="#fff" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>إدارة الطلبات</Text>
          <Logo variant="circle" size={32} />
        </SafeAreaView>

        <View style={styles.filterContainer}>
          <FlatList
            horizontal
            showsHorizontalScrollIndicator={false}
            data={STATUS_FILTERS}
            keyExtractor={(it) => String(it.slug)}
            contentContainerStyle={styles.filterList}
            renderItem={({ item }) => {
              const isActive = activeFilter === item.slug;
              return (
                <TouchableOpacity
                  onPress={() => setActiveFilter(item.slug)}
                  style={[
                    styles.filterTab,
                    isActive && { backgroundColor: 'rgba(255,255,255,0.2)', borderColor: '#fff' }
                  ]}
                >
                  <Text style={[styles.filterTabText, isActive && { color: '#fff' }]}>
                    {item.label}
                  </Text>
                </TouchableOpacity>
              );
            }}
          />
        </View>
      </LinearGradient>

      {loading ? (
        <View style={styles.centered}>
          <ActivityIndicator size="large" color={BRAND.colors.primary} />
        </View>
      ) : (
        <FlatList
          data={orders}
          keyExtractor={(o) => String(o.id)}
          renderItem={renderOrder}
          contentContainerStyle={styles.listContent}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={BRAND.colors.primary} />
          }
          onEndReached={loadMore}
          onEndReachedThreshold={0.3}
          ListEmptyComponent={
            <View style={styles.emptyBox}>
              <View style={styles.emptyIconWrap}>
                <Feather name="inbox" size={40} color={BRAND.colors.slate[300]} />
              </View>
              <Text style={styles.emptyText}>لا توجد طلبات في هذا التصنيف</Text>
            </View>
          }
          ListFooterComponent={loadingMore ? <ActivityIndicator style={{ margin: 16 }} color={BRAND.colors.primary} /> : null}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#F8FAFC' },
  headerGradient: {
    borderBottomLeftRadius: 30,
    borderBottomRightRadius: 30,
    paddingBottom: 20
  },
  headerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    height: 60
  },
  backBtn: { width: 40, height: 40, justifyContent: 'center', alignItems: 'center' },
  headerTitle: { fontSize: 20, fontWeight: 'bold', color: '#fff' },
  
  filterContainer: { marginTop: 10 },
  filterList: { paddingHorizontal: 16, gap: 10 },
  filterTab: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.3)',
    backgroundColor: 'rgba(255,255,255,0.05)'
  },
  filterTabText: { fontSize: 13, fontWeight: '600', color: 'rgba(255,255,255,0.8)' },

  centered: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  listContent: { padding: 16, paddingBottom: 40 },
  
  orderRow: { 
    flexDirection: 'row', 
    backgroundColor: '#fff', 
    borderRadius: 20, 
    marginBottom: 12, 
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#F1F5F9'
  },
  orderAccent: { width: 5 },
  orderRowBody: { flex: 1, padding: 16 },
  orderRowTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 },
  orderRowId: { fontSize: 15, fontWeight: 'bold', color: '#0F172A' },
  statusPill: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 20 },
  statusPillText: { fontSize: 11, fontWeight: 'bold' },
  orderRowCustomer: { fontSize: 13, color: '#64748B', marginBottom: 12 },
  orderRowBottom: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  orderRowAmount: { fontSize: 16, fontWeight: 'bold', color: '#0F172A' },
  orderRowDate: { fontSize: 12, color: '#94A3B8' },

  emptyBox: { alignItems: 'center', marginTop: 100 },
  emptyIconWrap: { 
    width: 80, 
    height: 80, 
    borderRadius: 40, 
    backgroundColor: '#F1F5F9', 
    justifyContent: 'center', 
    alignItems: 'center',
    marginBottom: 16
  },
  emptyText: { color: '#94A3B8', fontSize: 15, fontWeight: '500' }
});
