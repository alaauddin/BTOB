import React, { useState, useEffect, useCallback } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  ActivityIndicator, RefreshControl, StatusBar, Dimensions,
  Alert, Linking, Platform
} from 'react-native';
import { Feather, MaterialCommunityIcons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import * as Location from 'expo-location';
import { useAuth } from '../context/AuthContext';
import client from '../api/client';
import CustomHeader from '../components/CustomHeader';

const { width } = Dimensions.get('window');

const STATUS_COLORS = {
  active: { bg: '#DBEAFE', text: '#1E40AF' },
  delivered: { bg: '#F0FDF4', text: '#16A34A' },
  cancelled: { bg: '#FEE2E2', text: '#991B1B' },
};

/* ── Order Card Component ─────────────────────────────────────────── */
const DriverOrderCard = ({ order, onUpdateStatus, onOpenMap }) => {
  const isDelivered = order.status_slug === 'delivered';
  
  return (
    <View style={styles.orderCard}>
      <View style={styles.orderCardHeader}>
        <View>
          <Text style={styles.orderId}>طلب #{order.id}</Text>
          <Text style={styles.orderDate}>{new Date(order.created_at).toLocaleString('ar-SA')}</Text>
        </View>
        <View style={[styles.statusBadge, { backgroundColor: STATUS_COLORS[order.status_slug === 'delivered' ? 'delivered' : 'active'].bg }]}>
          <Text style={[styles.statusText, { color: STATUS_COLORS[order.status_slug === 'delivered' ? 'delivered' : 'active'].text }]}>
            {order.status_name}
          </Text>
        </View>
      </View>

      <View style={styles.divider} />

      <View style={styles.customerInfo}>
        <View style={styles.infoRow}>
          <Feather name="user" size={16} color="#64748B" />
          <Text style={styles.infoText}>{order.customer_name}</Text>
        </View>
        
        {order.shipping?.phone && (
          <TouchableOpacity 
            style={styles.infoRow} 
            onPress={() => Linking.openURL(`tel:${order.shipping.phone}`)}
          >
            <Feather name="phone" size={16} color="#3B82F6" />
            <Text style={[styles.infoText, { color: '#3B82F6' }]}>{order.shipping.phone}</Text>
          </TouchableOpacity>
        )}

        <View style={styles.infoRow}>
          <Feather name="map-pin" size={16} color="#64748B" />
          <Text style={styles.infoText} numberOfLines={2}>
            {order.shipping?.address_line1}, {order.shipping?.city}
          </Text>
        </View>
      </View>

      <View style={styles.cardActions}>
        <TouchableOpacity 
          style={[styles.actionButton, styles.mapButton]} 
          onPress={() => onOpenMap(order)}
        >
          <Feather name="map" size={18} color="#FFF" />
          <Text style={styles.actionButtonText}>الخريطة</Text>
        </TouchableOpacity>

        {!isDelivered && order.next_step_name && (
          <TouchableOpacity 
            style={[styles.actionButton, styles.stepButton]} 
            onPress={() => onUpdateStatus(order)}
          >
            <MaterialCommunityIcons name="arrow-right-circle-outline" size={18} color="#FFF" />
            <Text style={styles.actionButtonText}>{order.next_step_name}</Text>
          </TouchableOpacity>
        )}
        
        {order.shipping?.phone && (
          <TouchableOpacity 
            style={[styles.actionButton, styles.whatsappButton]} 
            onPress={() => Linking.openURL(`whatsapp://send?phone=${order.shipping.phone}`)}
          >
            <MaterialCommunityIcons name="whatsapp" size={18} color="#FFF" />
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
};

/* ── Main Dashboard Screen ────────────────────────────────────────── */
export default function DriverDashboardScreen({ navigation }) {
  const { logout } = useAuth();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [activeTab, setActiveTab] = useState('active');
  const [locationStatus, setLocationStatus] = useState(null);

  const fetchDashboard = useCallback(async (silent = false) => {
    if (!silent) setLoading(true);
    try {
      const res = await client.get(`/driver/dashboard/?status=${activeTab}`);
      if (res.data.success) {
        setData(res.data);
      }
    } catch (err) {
      console.error('Driver dashboard error', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [activeTab]);

  useEffect(() => {
    fetchDashboard();
  }, [fetchDashboard]);

  // Real-time Location Tracking
  useEffect(() => {
    let locationSubscription = null;

    const startTracking = async () => {
      let { status } = await Location.requestForegroundPermissionsAsync();
      setLocationStatus(status);
      if (status !== 'granted') return;

      locationSubscription = await Location.watchPositionAsync(
        {
          accuracy: Location.Accuracy.High,
          timeInterval: 60000,
          distanceInterval: 100,
        },
        async (location) => {
          try {
            // Truncate to match backend DecimalField(9,6)
            const lat = parseFloat(location.coords.latitude.toFixed(6));
            const lon = parseFloat(location.coords.longitude.toFixed(6));
            
            await client.post('/driver/location/update/', {
              latitude: lat,
              longitude: lon,
            });
          } catch (err) {
            console.warn('Location update failed', err);
          }
        }
      );
    };

    startTracking();
    return () => {
      if (locationSubscription) locationSubscription.remove();
    };
  }, []);

  const handleUpdateStatus = (order) => {
    Alert.alert(
      'تحديث الحالة',
      `هل أنت متأكد من الانتقال إلى الخطوة التالية: ${order.next_step_name}؟`,
      [
        { text: 'إلغاء', style: 'cancel' },
        { 
          text: 'نعم، تأكيد', 
          onPress: async () => {
            try {
              const res = await client.post(`/driver/orders/${order.id}/next-step/`);
              if (res.data.success) {
                fetchDashboard(true);
              } else {
                Alert.alert('تنبيه', res.data.message);
              }
            } catch (err) {
              Alert.alert('خطأ', 'تعذر تحديث الحالة.');
            }
          } 
        }
      ]
    );
  };

  const handleOpenMap = (order) => {
    const { latitude, longitude } = order.shipping || {};
    if (!latitude || !longitude) {
      Alert.alert('تنبيه', 'موقع العميل غير محدد على الخريطة.');
      return;
    }
    navigation.navigate('DriverMap', { orderId: order.id });
  };

  if (loading && !refreshing) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#3B82F6" />
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" />
      <CustomHeader 
        title={`سائق: ${data?.driver?.supplier?.name || ''}`} 
        showBack={false}
        rightComponent={
          <TouchableOpacity onPress={logout} style={styles.logoutBtn}>
            <Feather name="log-out" size={20} color="#EF4444" />
          </TouchableOpacity>
        }
      />

      <ScrollView 
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl 
            refreshing={refreshing} 
            onRefresh={() => { setRefreshing(true); fetchDashboard(true); }} 
            colors={['#3B82F6']}
          />
        }
      >
        {/* Stats Section */}
        <View style={styles.statsRow}>
          <LinearGradient colors={['#3B82F6', '#2563EB']} style={styles.statCard}>
            <Text style={styles.statValue}>{data?.stats?.active_count || 0}</Text>
            <Text style={styles.statLabel}>طلبات نشطة</Text>
          </LinearGradient>
          <LinearGradient colors={['#10B981', '#059669']} style={styles.statCard}>
            <Text style={styles.statValue}>{data?.stats?.delivered_count || 0}</Text>
            <Text style={styles.statLabel}>تم توصيلها</Text>
          </LinearGradient>
          <LinearGradient colors={['#6366F1', '#4F46E5']} style={styles.statCard}>
            <Text style={styles.statValue}>{data?.stats?.total_count || 0}</Text>
            <Text style={styles.statLabel}>الإجمالي</Text>
          </LinearGradient>
        </View>

        {/* Tabs */}
        <View style={styles.tabsContainer}>
          <TouchableOpacity 
            style={[styles.tab, activeTab === 'active' && styles.activeTab]}
            onPress={() => setActiveTab('active')}
          >
            <Text style={[styles.tabText, activeTab === 'active' && styles.activeTabText]}>الطلبات النشطة</Text>
          </TouchableOpacity>
          <TouchableOpacity 
            style={[styles.tab, activeTab === 'delivered' && styles.activeTab]}
            onPress={() => setActiveTab('delivered')}
          >
            <Text style={[styles.tabText, activeTab === 'delivered' && styles.activeTabText]}>الطلبات المستلمة</Text>
          </TouchableOpacity>
        </View>

        {/* Orders List */}
        {data?.orders?.length > 0 ? (
          data.orders.map(order => (
            <DriverOrderCard 
              key={order.id} 
              order={order} 
              onUpdateStatus={handleUpdateStatus}
              onOpenMap={handleOpenMap}
            />
          ))
        ) : (
          <View style={styles.emptyState}>
            <Feather name="package" size={48} color="#CBD5E1" />
            <Text style={styles.emptyText}>لا توجد طلبات في هذا القسم حالياً</Text>
          </View>
        )}
      </ScrollView>

      {locationStatus !== 'granted' && (
        <View style={styles.locationWarning}>
          <Feather name="alert-triangle" size={16} color="#FFF" />
          <Text style={styles.warningText}>يرجى تفعيل إذن الوصول للموقع لتتبع التحركات</Text>
        </View>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F8FAFC' },
  scrollContent: { padding: 16 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  logoutBtn: { padding: 8 },
  
  statsRow: { 
    flexDirection: 'row', 
    justifyContent: 'space-between', 
    marginBottom: 20 
  },
  statCard: { 
    width: (width - 48) / 3, 
    borderRadius: 16, 
    padding: 12, 
    alignItems: 'center',
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  statValue: { color: '#FFF', fontSize: 20, fontWeight: 'bold' },
  statLabel: { color: 'rgba(255,255,255,0.8)', fontSize: 11, marginTop: 4 },

  tabsContainer: { 
    flexDirection: 'row', 
    backgroundColor: '#E2E8F0', 
    borderRadius: 12, 
    padding: 4, 
    marginBottom: 16 
  },
  tab: { flex: 1, paddingVertical: 10, alignItems: 'center', borderRadius: 10 },
  activeTab: { backgroundColor: '#FFF', elevation: 2 },
  tabText: { color: '#64748B', fontWeight: '600' },
  activeTabText: { color: '#1E293B' },

  orderCard: {
    backgroundColor: '#FFF',
    borderRadius: 20,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#F1F5F9',
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
  },
  orderCardHeader: { 
    flexDirection: 'row-reverse', 
    justifyContent: 'space-between', 
    alignItems: 'center' 
  },
  orderId: { fontSize: 18, fontWeight: 'bold', color: '#1E293B', textAlign: 'right' },
  orderDate: { fontSize: 12, color: '#94A3B8', marginTop: 2, textAlign: 'right' },
  statusBadge: { paddingHorizontal: 12, paddingVertical: 4, borderRadius: 20 },
  statusText: { fontSize: 12, fontWeight: 'bold' },

  divider: { height: 1, backgroundColor: '#F1F5F9', marginVertical: 12 },

  customerInfo: { marginBottom: 16 },
  infoRow: { 
    flexDirection: 'row-reverse', 
    alignItems: 'center', 
    marginBottom: 8 
  },
  infoText: { 
    marginRight: 10, 
    color: '#475569', 
    fontSize: 14, 
    textAlign: 'right', 
    flex: 1 
  },

  cardActions: { flexDirection: 'row', gap: 10 },
  actionButton: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    justifyContent: 'center', 
    paddingVertical: 10, 
    paddingHorizontal: 16, 
    borderRadius: 12, 
    gap: 8 
  },
  actionButtonText: { color: '#FFF', fontWeight: 'bold', fontSize: 14 },
  mapButton: { backgroundColor: '#3B82F6', flex: 1.5 },
  stepButton: { backgroundColor: '#10B981', flex: 2 },
  whatsappButton: { backgroundColor: '#25D366', width: 44 },

  emptyState: { alignItems: 'center', marginTop: 60, opacity: 0.5 },
  emptyText: { color: '#64748B', marginTop: 12, fontSize: 15 },

  locationWarning: {
    position: 'absolute',
    bottom: 20,
    left: 20,
    right: 20,
    backgroundColor: '#F59E0B',
    flexDirection: 'row-reverse',
    padding: 12,
    borderRadius: 12,
    alignItems: 'center',
    gap: 10,
    elevation: 10
  },
  warningText: { color: '#FFF', fontSize: 12, fontWeight: '600', flex: 1, textAlign: 'right' }
});
