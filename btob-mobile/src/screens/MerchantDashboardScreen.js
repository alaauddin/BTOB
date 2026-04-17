import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  ActivityIndicator, RefreshControl, StatusBar, Dimensions, Animated,
  Image, ImageBackground,
} from 'react-native';
import { Feather } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { useAuth } from '../context/AuthContext';
import client from '../api/client';
import CustomHeader from '../components/CustomHeader';
import OnboardingModal from '../components/OnboardingModal';

const { width } = Dimensions.get('window');

/* ── Helpers ──────────────────────────────────────────────────────── */
const STATUS_COLORS = {
  pending: { bg: '#FEF3C7', text: '#92400E' },
  confirmed: { bg: '#D1FAE5', text: '#065F46' },
  shipped: { bg: '#DBEAFE', text: '#1E40AF' },
  delivered: { bg: '#F0FDF4', text: '#16A34A' },
  cancelled: { bg: '#FEE2E2', text: '#991B1B' },
};
const statusColor = (slug) => STATUS_COLORS[slug] || { bg: '#F1F5F9', text: '#475569' };

/* ── KPI Card ─────────────────────────────────────────────────────── */
const KpiCard = ({ icon, label, value, gradient, width: cardWidth }) => (
  <LinearGradient
    colors={gradient}
    start={{ x: 0, y: 0 }}
    end={{ x: 1, y: 1 }}
    style={[styles.kpiCard, { width: cardWidth }]}
  >
    <View style={styles.kpiIconWrap}>
      <Feather name={icon} size={18} color="rgba(255,255,255,0.9)" />
    </View>
    <Text style={styles.kpiValue}>{value ?? '—'}</Text>
    <Text style={styles.kpiLabel}>{label}</Text>
  </LinearGradient>
);

/* ── Order Row ─────────────────────────────────────────────────────── */
const OrderRow = ({ order, onPress }) => {
  const sc = statusColor(order.status_slug);
  return (
    <TouchableOpacity style={styles.orderRow} onPress={onPress} activeOpacity={0.72}>
      <View style={[styles.orderAccent, { backgroundColor: sc.text }]} />
      <View style={styles.orderRowBody}>
        <View style={styles.orderRowTop}>
          <Text style={styles.orderRowId}>طلب #{order.id}</Text>
          <View style={[styles.statusPill, { backgroundColor: sc.bg }]}>
            <Text style={[styles.statusPillText, { color: sc.text }]}>{order.status_name}</Text>
          </View>
        </View>
        <Text style={styles.orderRowCustomer}>{order.customer_name}</Text>
        <View style={styles.orderRowBottom}>
          <Text style={styles.orderRowAmount}>{parseFloat(order.total_amount).toFixed(2)} ر.ي</Text>
          <Text style={styles.orderRowDate}>{new Date(order.created_at).toLocaleDateString('ar-SA')}</Text>
        </View>
      </View>
    </TouchableOpacity>
  );
};

/* ── Main Screen ─────────────────────────────────────────────────── */
export default function MerchantDashboardScreen({ navigation }) {
  const { activeMerchant } = useAuth();

  const [dashboard, setDashboard] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [onboardingModal, setOnboardingModal] = useState({ visible: false, stepKey: null });
  const fadeAnim = useRef(new Animated.Value(0)).current;

  const primaryColor = activeMerchant?.primary_color || '#2B5876';

  /* ── Fetch ──────────────────────────────────────────────────── */
  const fetchDashboard = useCallback(async (id, silent = false) => {
    if (!id) return;
    if (!silent) setLoading(true);
    try {
      const res = await client.get(`/merchant/dashboard/?merchant_id=${id}`);
      if (res.data.success) {
        setDashboard(res.data);
        Animated.spring(fadeAnim, { toValue: 1, useNativeDriver: true, tension: 80, friction: 10 }).start();
      }
    } catch (err) {
      console.error('Dashboard error', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [fadeAnim]);

  useEffect(() => {
    if (activeMerchant?.id) {
      fetchDashboard(activeMerchant.id);
    } else {
      setLoading(false);
    }
  }, [activeMerchant?.id]);

  const onRefresh = () => { setRefreshing(true); fetchDashboard(activeMerchant?.id, true); };

  /* ── Loading ─────────────────────────────────────────────────── */
  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color={primaryColor} />
        <Text style={styles.loadingText}>جاري تحميل لوحة التحكم…</Text>
      </View>
    );
  }

  const stats = dashboard?.stats || {};
  const recentOrders = dashboard?.recent_orders || [];
  // Prefer fresh data from API (absolute URLs) over stale AsyncStorage data
  const merchantInfo = dashboard?.merchant || activeMerchant || {};

  /* Small derived helpers */
  const kpiRow1 = [
    { icon: 'shopping-bag', label: 'طلبات اليوم', value: stats.orders_today, gradient: [primaryColor, adjustColor(primaryColor, -30)] },
    { icon: 'calendar', label: 'طلبات الشهر', value: stats.orders_this_month, gradient: ['#8B5CF6', '#6D28D9'] },
  ];
  const kpiRow2 = [
    { icon: 'dollar-sign', label: 'إيرادات الشهر', value: `${parseFloat(stats.revenue_this_month || 0).toFixed(0)} ر.ي`, gradient: ['#10B981', '#059669'] },
    { icon: 'clock', label: 'طلبات معلقة', value: stats.pending_orders, gradient: ['#F59E0B', '#D97706'] },
    { icon: 'package', label: 'المنتجات', value: stats.total_products, gradient: ['#3B82F6', '#2563EB'] },
  ];
  const kpiRow3 = [
    { icon: 'list', label: 'الطلبات (الكل)', value: stats.total_orders, gradient: ['#EC4899', '#BE185D'] },
    { icon: 'star', label: 'التقييم العام', value: stats.average_rating || '-', gradient: ['#F59E0B', '#D97706'] },
    { icon: 'pie-chart', label: 'إيرادات (الكل)', value: `${parseFloat(stats.total_revenue || 0).toFixed(0)} ر.ي`, gradient: ['#10B981', '#059669'] },
  ];

  /* ── JSX ──────────────────────────────────────────────────────── */
  return (
    <View style={styles.root}>
      <StatusBar barStyle="dark-content" backgroundColor="#fff" />
      <CustomHeader />

      <Animated.ScrollView
        style={{ flex: 1, opacity: fadeAnim }}
        contentContainerStyle={styles.scroll}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={primaryColor} />}
      >
        {/* ── Welcome Strip ── */}
        <ImageBackground
          source={merchantInfo?.panal_picture ? { uri: merchantInfo.panal_picture } : null}
          style={styles.welcomeStripWrap}
          imageStyle={styles.coverBgImg}
          resizeMode="cover"
        >
          <LinearGradient
            colors={[primaryColor + 'EE', adjustColor(primaryColor, -40) + 'EE']}
            start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
            style={styles.welcomeStrip}
          >
            <View style={styles.welcomeTextBlock}>
              <Text style={[styles.welcomeHello, { textAlign: 'right' }]}>مرحباً 👋</Text>
              <Text style={[styles.welcomeStore, { textAlign: 'right' }]}>{activeMerchant?.name || 'المتجر'}</Text>
            </View>
            {/* Merchant logo — use fresh API data for absolute URLs */}
            <View style={styles.welcomeLogoWrap}>
              {merchantInfo?.profile_picture
                ? <Image source={{ uri: merchantInfo.profile_picture }} style={styles.welcomeLogo} />
                : <View style={styles.welcomeLogoPlaceholder}>
                  <Text style={[styles.welcomeLogoInitial, { color: primaryColor }]}>
                    {(activeMerchant?.name?.[0] || 'M').toUpperCase()}
                  </Text>
                </View>
              }
            </View>
          </LinearGradient>
        </ImageBackground>

        {/* ── Low Stock Alert ── */}
        {stats.low_stock_count > 0 && (
          <View style={styles.alertRow}>
            <Feather name="alert-triangle" size={14} color="#B45309" />
            <Text style={styles.alertText}>
              {stats.low_stock_count} منتج بمخزون منخفض (أقل من 5 وحدات)
            </Text>
          </View>
        )}

        {/* ── Onboarding Tracker ── */}
        {dashboard?.onboarding && (
          <View style={styles.onboardingCard}>
             <View style={{flexDirection: 'row-reverse', justifyContent: 'space-between', marginBottom: 8, alignItems: 'center'}}>
               <Text style={styles.onboardingTitle}>إعداد المتجر</Text>
               <Text style={[styles.onboardingTitle, {color: primaryColor, fontSize: 18}]}>{dashboard.onboarding.progress_percentage}%</Text>
             </View>
             
             <Text style={[styles.onboardingSub, { textAlign: 'right' }]}>
               {dashboard.onboarding.progress_percentage === 100 ? "متجرك جاهز تماماً للانطلاق! 🌟" :
                dashboard.onboarding.progress_percentage >= 80 ? "خطوة واحدة تفصلك عن النجاح! 🎯" :
                dashboard.onboarding.progress_percentage >= 50 ? "أداء رائع! استمر في بناء متجرك 🚀" :
                "أكمل الخطوات المتبقية لزيادة مبيعاتك بنسبة 300%"}
             </Text>

             <View style={[styles.progressBarWrap, { marginTop: 12, marginBottom: 16 }]}>
               <View style={[styles.progressBarFill, { width: `${dashboard.onboarding.progress_percentage}%`, backgroundColor: primaryColor }]} />
             </View>

             {/* Progress Markers Row */}
             <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 8, flexDirection: 'row-reverse' }}>
                {[
                  { key: 'has_logo', icon: 'image', label: 'الشعار', target: 'Profile' },
                  { key: 'has_cover', icon: 'layout', label: 'الغلاف', target: 'Profile' },
                  { key: 'has_location', icon: 'map-pin', label: 'الموقع', target: 'Profile' },
                  { key: 'has_currency', icon: 'dollar-sign', label: 'العملة', target: 'Profile' },
                  { key: 'has_products', icon: 'package', label: 'المنتجات', target: 'Products' },
                  { key: 'has_subdomain', icon: 'globe', label: 'الرابط', target: 'Profile' }
                ].map((step, idx) => {
                   const isDone = dashboard.onboarding[step.key];
                   return (
                     <TouchableOpacity 
                       key={idx} 
                       activeOpacity={0.7}
                       onPress={() => {
                         if (step.key === 'has_products') {
                           navigation.navigate('Products');
                         } else {
                           setOnboardingModal({ visible: true, stepKey: step.key });
                         }
                       }}
                       style={{ alignItems: 'center', marginLeft: 16, opacity: isDone ? 1 : 0.6 }}
                     >
                       <View style={{ 
                         width: 44, height: 44, borderRadius: 22, 
                         backgroundColor: isDone ? primaryColor : '#F1F5F9',
                         justifyContent: 'center', alignItems: 'center', marginBottom: 6,
                         borderWidth: isDone ? 0 : 1, borderColor: '#E2E8F0'
                       }}>
                         <Feather name={isDone ? "check" : step.icon} size={20} color={isDone ? "#FFF" : "#94A3B8"} />
                       </View>
                       <Text style={{ fontSize: 11, color: isDone ? '#0F172A' : '#64748B', fontWeight: isDone ? 'bold' : '600' }}>
                         {step.label}
                       </Text>
                     </TouchableOpacity>
                   );
                })}
             </ScrollView>

             <TouchableOpacity 
               onPress={() => navigation.navigate('Profile')}
               style={{ backgroundColor: '#F8FAFC', paddingVertical: 12, borderRadius: 10, marginTop: 12, alignItems: 'center', flexDirection: 'row', justifyContent: 'center', borderWidth: 1, borderColor: '#E2E8F0' }}
             >
               <Feather name="settings" size={16} color="#475569" style={{ marginRight: 8 }} />
               <Text style={{ color: '#0F172A', fontWeight: 'bold', fontSize: 14 }}>إعدادات ملف المتجر</Text>
             </TouchableOpacity>
          </View>
        )}

        {/* ── KPI Grid — Row 1 (two wide) ── */}
        <Text style={styles.sectionLabel}>إحصائيات</Text>
        <View style={styles.kpiRow}>
          {kpiRow1.map((k, i) => (
            <KpiCard key={i} {...k} width={(width - 44) / 2} />
          ))}
        </View>

        {/* ── KPI Grid — Row 2 (three slim) ── */}
        <View style={styles.kpiRow}>
          {kpiRow2.map((k, i) => (
            <KpiCard key={i} {...k} width={(width - 52) / 3} />
          ))}
        </View>

        {/* ── KPI Grid — Row 3 (three slim) ── */}
        <View style={styles.kpiRow}>
          {kpiRow3.map((k, i) => (
            <KpiCard key={i} {...k} width={(width - 52) / 3} />
          ))}
        </View>

        {/* ── Quick Actions ── */}
        <Text style={styles.sectionLabel}>إجراءات سريعة</Text>
        <View style={styles.actionsRow}>
          <QuickAction
            icon="package" label="المنتجات" color="#3B82F6"
            onPress={() => navigation.navigate('Products')}
          />
          <QuickAction
            icon="tag" label="العروض" color="#EC4899"
            onPress={() => navigation.navigate('MerchantOffers')}
          />
          <QuickAction
            icon="grid" label="المتجر" color="#10B981"
            onPress={() => navigation.navigate('StoreView', { storeId: merchantInfo?.store_id || activeMerchant?.store_id })}
          />
          {activeMerchant?.can_buy_wholesale && (
            <QuickAction
              icon="shopping-cart" label="سوق الجملة" color="#8B5CF6"
              onPress={() => navigation.navigate('WholesaleMarket')}
            />
          )}
        </View>
        <View style={[styles.actionsRow, { marginTop: 12 }]}>
          <QuickAction
            icon="clock" label="معلّقة" color="#F59E0B"
            onPress={() => navigation.navigate('Orders', { filter: 'pending', merchantId: activeMerchant?.id })}
          />
          <QuickAction
            icon="list" label="الطلبات" color="#6366F1"
            onPress={() => navigation.navigate('Orders', { merchantId: activeMerchant?.id })}
          />
          <QuickAction
            icon="user" label="الإعدادات" color="#8B5CF6"
            onPress={() => navigation.navigate('Profile')}
          />
        </View>

        {/* ── Top Products ── */}
        {dashboard?.top_products && dashboard.top_products.length > 0 && (
          <View style={{marginTop: 10}}>
             <Text style={styles.sectionLabel}>المنتجات الأكثر مبيعاً</Text>
             <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: 16, gap: 10, paddingBottom: 10 }}>
               {dashboard.top_products.map((p, i) => (
                  <View key={`top_${i}`} style={styles.topProdCard}>
                     {p.image ? (
                        <Image source={{uri: p.image}} style={styles.topProdImg} />
                     ) : (
                        <View style={[styles.topProdImg, {backgroundColor: '#F1F5F9', justifyContent: 'center', alignItems: 'center'}]}>
                           <Feather name="image" size={24} color="#CBD5E1" />
                        </View>
                     )}
                     <View style={styles.topProdInfo}>
                        <Text style={styles.topProdName} numberOfLines={1}>{p.name}</Text>
                        <Text style={styles.topProdPrice}>{p.price_after_discount} ر.ي</Text>
                     </View>
                  </View>
               ))}
             </ScrollView>
          </View>
        )}

        {/* ── Recent Orders ── */}
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionLabel}>آخر الطلبات</Text>
          {recentOrders.length > 0 && (
            <TouchableOpacity onPress={() => navigation.navigate('Orders', { merchantId: activeMerchant?.id })}>
              <Text style={[styles.seeAll, { color: primaryColor }]}>عرض الكل</Text>
            </TouchableOpacity>
          )}
        </View>

        {recentOrders.length === 0 ? (
          <View style={styles.emptyBox}>
            <Feather name="inbox" size={52} color="#E2E8F0" />
            <Text style={styles.emptyText}>لا توجد طلبات حتى الآن</Text>
          </View>
        ) : (
          <View style={styles.ordersCard}>
            {recentOrders.map((order, idx) => (
              <React.Fragment key={order.id}>
                <OrderRow
                  order={order}
                  onPress={() => navigation.navigate('MerchantOrderDetail', { orderId: order.id, merchantId: activeMerchant?.id })}
                />
                {idx < recentOrders.length - 1 && <View style={styles.orderDivider} />}
              </React.Fragment>
            ))}
          </View>
        )}

        <View style={{ height: 24 }} />
      </Animated.ScrollView>

      {/* ── Onboarding Modal ── */}
      <OnboardingModal
        visible={onboardingModal.visible}
        stepKey={onboardingModal.stepKey}
        onClose={() => setOnboardingModal({ visible: false, stepKey: null })}
        activeMerchant={activeMerchant}
        onSuccess={() => {
          setOnboardingModal({ visible: false, stepKey: null });
          fetchDashboard(activeMerchant?.id, true);
        }}
      />
    </View>
  );
}

/* ── Quick Action Tile ────────────────────────────────────────────── */
const QuickAction = ({ icon, label, color, onPress }) => (
  <TouchableOpacity style={styles.qaTile} onPress={onPress} activeOpacity={0.75}>
    <View style={[styles.qaIconWrap, { backgroundColor: color + '18' }]}>
      <Feather name={icon} size={22} color={color} />
    </View>
    <Text style={styles.qaLabel}>{label}</Text>
  </TouchableOpacity>
);

/* ── Helper to lighten/darken hex colour ─────────────────────────── */
function adjustColor(hex, amount) {
  try {
    const num = parseInt(hex.replace('#', ''), 16);
    const r = Math.min(255, Math.max(0, (num >> 16) + amount));
    const g = Math.min(255, Math.max(0, ((num >> 8) & 0xff) + amount));
    const b = Math.min(255, Math.max(0, (num & 0xff) + amount));
    return '#' + ((1 << 24) | (r << 16) | (g << 8) | b).toString(16).slice(1);
  } catch { return hex; }
}

/* ── Styles ─────────────────────────────────────────────────────── */
const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#F8FAFC' },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#F8FAFC' },
  loadingText: { marginTop: 12, color: '#64748B', fontSize: 14 },

  scroll: { paddingBottom: 24 },

  /* Welcome strip */
  welcomeStripWrap: {
    marginHorizontal: 16, marginTop: 16, borderRadius: 20,
    overflow: 'hidden',
    shadowColor: '#000', shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.15, shadowRadius: 12, elevation: 6,
  },
  coverBgImg: { borderRadius: 20 },
  welcomeStrip: {
    padding: 22, flexDirection: 'row-reverse', justifyContent: 'space-between', alignItems: 'center',
  },
  welcomeTextBlock: { flex: 1 },
  welcomeHello: { color: 'rgba(255,255,255,0.85)', fontSize: 13, fontWeight: '500', marginBottom: 4 },
  welcomeStore: { color: '#fff', fontSize: 22, fontWeight: '800' },
  welcomeLogoWrap: {
    width: 64, height: 64, borderRadius: 32,
    backgroundColor: 'rgba(255,255,255,0.2)',
    justifyContent: 'center', alignItems: 'center', overflow: 'hidden',
  },
  welcomeLogo: { width: 64, height: 64, borderRadius: 32 },
  welcomeLogoPlaceholder: {
    width: 64, height: 64, borderRadius: 32,
    backgroundColor: '#fff', justifyContent: 'center', alignItems: 'center',
  },
  welcomeLogoInitial: { fontSize: 26, fontWeight: '800' },

  /* Alert */
  alertRow: {
    flexDirection: 'row-reverse', alignItems: 'center', gap: 8,
    marginHorizontal: 16, marginTop: 12,
    backgroundColor: '#FEF3C7', borderRadius: 12, padding: 12,
    borderRightWidth: 3, borderRightColor: '#F59E0B',
  },
  alertText: { color: '#92400E', fontSize: 12, fontWeight: '500', flex: 1 },

  /* Onboarding Card */
  onboardingCard: {
    marginHorizontal: 16, marginTop: 12, backgroundColor: '#fff', borderRadius: 16, padding: 16,
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 8, elevation: 2,
  },
  onboardingTitle: { fontSize: 14, fontWeight: '700', color: '#0F172A' },
  progressBarWrap: { height: 8, backgroundColor: '#F1F5F9', borderRadius: 4, overflow: 'hidden', marginVertical: 8 },
  progressBarFill: { height: '100%', borderRadius: 4 },
  onboardingSub: { fontSize: 11, color: '#64748B' },

  /* Sections */
  sectionLabel: { fontSize: 16, fontWeight: '700', color: '#0F172A', marginRight: 16, marginTop: 20, marginBottom: 12, textAlign: 'right' },
  sectionHeader: { flexDirection: 'row-reverse', justifyContent: 'space-between', alignItems: 'center', marginLeft: 16 },
  seeAll: { fontSize: 13, fontWeight: '600' },

  /* KPI cards */
  kpiRow: { flexDirection: 'row-reverse', paddingHorizontal: 16, gap: 10, marginBottom: 10 },
  kpiCard: {
    borderRadius: 18, padding: 16,
    shadowColor: '#000', shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.12, shadowRadius: 8, elevation: 4,
  },
  kpiIconWrap: {
    width: 34, height: 34, borderRadius: 10,
    backgroundColor: 'rgba(255,255,255,0.2)',
    justifyContent: 'center', alignItems: 'center', marginBottom: 10,
  },
  kpiValue: { fontSize: 22, fontWeight: '800', color: '#fff', marginBottom: 3 },
  kpiLabel: { fontSize: 11, color: 'rgba(255,255,255,0.8)', fontWeight: '500' },

  /* Quick Actions */
  actionsRow: { flexDirection: 'row', paddingHorizontal: 16, gap: 10 },
  qaTile: {
    flex: 1, alignItems: 'center', backgroundColor: '#fff', borderRadius: 18,
    paddingVertical: 16, gap: 8,
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05, shadowRadius: 6, elevation: 2,
  },
  qaIconWrap: { width: 46, height: 46, borderRadius: 14, justifyContent: 'center', alignItems: 'center' },
  qaLabel: { fontSize: 12, fontWeight: '700', color: '#0F172A', textAlign: 'center' },

  /* Orders */
  ordersCard: {
    marginHorizontal: 16, backgroundColor: '#fff', borderRadius: 20,
    overflow: 'hidden',
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05, shadowRadius: 8, elevation: 2,
    direction: 'rtl'
  },
  orderRow: { flexDirection: 'row-reverse', alignItems: 'stretch' },
  orderAccent: { width: 4 },
  orderRowBody: { flex: 1, paddingHorizontal: 14, paddingVertical: 14 },
  orderRowTop: { flexDirection: 'row-reverse', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 },
  orderRowId: { fontSize: 14, fontWeight: '700', color: '#0F172A', textAlign: 'right' },
  statusPill: { paddingHorizontal: 10, paddingVertical: 3, borderRadius: 20 },
  statusPillText: { fontSize: 11, fontWeight: '700' },
  orderRowCustomer: { fontSize: 12, color: '#64748B', marginBottom: 8, textAlign: 'right' },
  orderRowBottom: { flexDirection: 'row-reverse', justifyContent: 'space-between' },
  orderRowAmount: { fontSize: 14, fontWeight: '700', color: '#0F172A', textAlign: 'right' },
  orderRowDate: { fontSize: 11, color: '#94A3B8' },
  orderDivider: { height: 1, backgroundColor: '#F1F5F9', marginRight: 4 },

  emptyBox: { alignItems: 'center', paddingVertical: 40, gap: 12, marginHorizontal: 16 },
  emptyText: { color: '#94A3B8', fontSize: 14 },

  topProdCard: {
    backgroundColor: '#fff', borderRadius: 12, width: 140, padding: 8,
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 6, elevation: 2,
  },
  topProdImg: { width: '100%', height: 100, borderRadius: 8, marginBottom: 8 },
  topProdInfo: { paddingHorizontal: 4 },
  topProdName: { fontSize: 12, fontWeight: '600', color: '#0F172A', marginBottom: 4 },
  topProdPrice: { fontSize: 11, fontWeight: '700', color: '#10B981' },
});
