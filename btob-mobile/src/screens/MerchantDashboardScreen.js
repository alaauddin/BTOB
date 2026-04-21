import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  ActivityIndicator, RefreshControl, StatusBar, Dimensions, Animated,
  Image, ImageBackground, Modal, FlatList, Platform
} from 'react-native';
import { Feather } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { useAuth } from '../context/AuthContext';
import client from '../api/client';
import OnboardingModal from '../components/OnboardingModal';

const { width } = Dimensions.get('window');

/* ── Helpers ──────────────────────────────────────────────────────── */
/* ── Color Identity ────────────────────────────────────────────────── */
const COLORS = {
  primarySteel: '#2B587E',    // Base Text & Main UI
  vibrantOrange: '#D27321',   // Accents & Actions
  goldAccent: '#CBA660',      // Premium Highlights
  lightBlue: '#5C8EAE',       // Gradients & Text Edges
  success: '#10B981',
  danger: '#EF4444',
  warning: '#F59E0B',
  bgLight: '#F8FAFC',
  border: '#F1F5F9'
};

const STATUS_COLORS = {
  pending: { bg: '#FEF3C7', text: '#92400E' },
  confirmed: { bg: '#D1FAE5', text: '#065F46' },
  shipped: { bg: '#DBEAFE', text: '#1E40AF' },
  delivered: { bg: '#F0FDF4', text: '#16A34A' },
  cancelled: { bg: '#FEE2E2', text: '#991B1B' },
};
const statusColor = (slug) => STATUS_COLORS[slug] || { bg: '#F1F5F9', text: '#475569' };

/* ── KPI Card ─────────────────────────────────────────────────────── */
const KpiCard = ({ icon, label, value, subValue, iconBg, width: cardWidth, isLarge }) => (
  <View style={[isLarge ? styles.kpiCardLarge : styles.kpiCardSmall, { width: cardWidth }]}>
    <View style={styles.kpiHeader}>
      <View style={[styles.kpiIconWrap, { backgroundColor: iconBg || 'rgba(255,255,255,0.2)' }]}>
        <Feather name={icon} size={isLarge ? 24 : 18} color="#fff" />
      </View>
      {isLarge && (
        <View style={styles.kpiLargeInfo}>
           <Text style={styles.kpiLargeLabel}>{label}</Text>
           <Text style={styles.kpiLargeValue}>{value}</Text>
           {subValue && (
             <View style={styles.kpiSubValueRow}>
                <Feather name="trending-up" size={12} color="#4ADE80" />
                <Text style={styles.kpiSubValueText}>{subValue}</Text>
             </View>
           )}
        </View>
      )}
    </View>
    {!isLarge && (
      <>
        <Text style={styles.kpiSmallValue}>{value}</Text>
        <Text style={styles.kpiSmallLabel}>{label}</Text>
      </>
    )}
  </View>
);

/* ── Order Row ─────────────────────────────────────────────────────── */
const OrderRow = ({ order, onPress, curr }) => {
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
          <Text style={styles.orderRowAmount}>{parseFloat(order.total_amount).toFixed(2)} {curr}</Text>
          <Text style={styles.orderRowDate}>{new Date(order.created_at).toLocaleDateString('ar-SA')}</Text>
        </View>
      </View>
    </TouchableOpacity>
  );
};

/* ── Main Screen ─────────────────────────────────────────────────── */
export default function MerchantDashboardScreen({ navigation }) {
  const { activeMerchant, manageableMerchants, setActiveMerchant, updateMerchantList, logout } = useAuth();

  const [dashboard, setDashboard] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [onboardingModal, setOnboardingModal] = useState({ visible: false, stepKey: null });
  const [switcherVisible, setSwitcherVisible] = useState(false);
  const [menuVisible, setMenuVisible] = useState(false);
  const [switchingId, setSwitchingId] = useState(null);
  const fadeAnim = useRef(new Animated.Value(0)).current;


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
      if (err.response?.status !== 402) {
        console.error('Dashboard error', err);
      }
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

  const handleSwitch = async (merchant) => {
    if (merchant.id === activeMerchant?.id) {
      setSwitcherVisible(false);
      return;
    }
    setSwitchingId(merchant.id);
    try {
      const res = await client.post("/merchant/switch/", { merchant_id: merchant.id });
      if (res.data.success) {
        await setActiveMerchant(res.data.merchant);
        await updateMerchantList(res.data.manageable_merchants);
        setSwitcherVisible(false);
      }
    } catch (err) {
      console.error("Switch merchant error", err);
    } finally {
      setSwitchingId(null);
    }
  };

  const handleLogout = () => {
    setMenuVisible(false);
    logout();
    navigation.reset({ index: 0, routes: [{ name: 'Home' }] });
  };

  /* ── Loading ─────────────────────────────────────────────────── */
  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color={COLORS.primarySteel} />
        <Text style={styles.loadingText}>جاري تحميل لوحة التحكم…</Text>
      </View>
    );
  }

  const stats = dashboard?.stats || {};
  const recentOrders = dashboard?.recent_orders || [];
  const merchantInfo = dashboard?.merchant || activeMerchant || {};
  const curr = merchantInfo?.currency_symbol || 'د.ك';

  /* ── JSX ──────────────────────────────────────────────────────── */
  return (
    <View style={styles.root}>
      <StatusBar barStyle="light-content" backgroundColor={COLORS.primarySteel} />
      
      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={styles.scroll}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#fff" />}
      >
        <LinearGradient
          colors={[COLORS.primarySteel, COLORS.lightBlue]}
          style={styles.topGradient}
        >
          <SafeAreaView edges={['top']} style={styles.headerSafe}>
             <View style={styles.headerRow}>
                <TouchableOpacity style={styles.notificationBtn}>
                   <Feather name="bell" size={24} color="#fff" />
                   <View style={styles.badge}>
                      <Text style={styles.badgeText}>3</Text>
                   </View>
                </TouchableOpacity>

                <View style={styles.headerCenter}>
                   <TouchableOpacity 
                     style={styles.merchantPicker}
                     onPress={() => manageableMerchants.length > 1 && setSwitcherVisible(true)}
                   >
                      {activeMerchant?.profile_picture && (
                        <Image source={{ uri: activeMerchant.profile_picture }} style={styles.merchantLogoHeader} />
                      )}
                      <Text style={styles.merchantNameHead}>{activeMerchant?.name}</Text>
                      {manageableMerchants.length > 1 && <Feather name="chevron-down" size={14} color="#fff" style={{marginLeft: 4}} />}
                   </TouchableOpacity>
                   <Text style={styles.welcomeRawaage}>مرحباً بك في رواج</Text>
                </View>

                <View style={styles.headerRight}>
                   <View style={styles.logoCircle}>
                      <Image source={require('../../assets/images/logo.png')} style={styles.logoImg} resizeMode="contain" />
                   </View>
                   <TouchableOpacity style={styles.menuBtn} onPress={() => setMenuVisible(true)}>
                      <Feather name="menu" size={26} color="#fff" />
                   </TouchableOpacity>
                </View>
             </View>
          </SafeAreaView>

          {/* Large KPI Card */}
          <View style={{ paddingHorizontal: 16, marginTop: 10 }}>
             <KpiCard 
                isLarge
                icon="dollar-sign" 
                label="إجمالي المبيعات" 
                value={`${parseFloat(stats.total_revenue || 0).toLocaleString()} ${curr}`}
                subValue={`${stats.revenue_change_percentage || 0}% مقارنة بالشهر الماضي`}
                iconBg={COLORS.vibrantOrange}
                width={width - 32}
             />
          </View>

          {/* KPI Row */}
          <View style={styles.kpiRow}>
             <KpiCard 
                icon="shopping-bag" 
                label="طلب اليوم" 
                value={stats.orders_today || 0}
                iconBg={COLORS.vibrantOrange}
                width={(width - 52) / 3}
             />
             <KpiCard 
                icon="trending-up" 
                label="معدل النجاح" 
                value={`${stats.success_rate || 0}%`}
                iconBg={COLORS.lightBlue}
                width={(width - 52) / 3}
             />
             <KpiCard 
                icon="users" 
                label="عملاء جدد" 
                value={stats.new_customers || 0}
                iconBg={COLORS.lightBlue}
                width={(width - 52) / 3}
             />
          </View>
        </LinearGradient>

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
               <Text style={[styles.onboardingTitle, {color: COLORS.primarySteel, fontSize: 18}]}>{dashboard.onboarding.progress_percentage}%</Text>
             </View>
             
             <Text style={[styles.onboardingSub, { textAlign: 'right' }]}>
               {dashboard.onboarding.progress_percentage === 100 ? "متجرك جاهز تماماً للانطلاق! 🌟" :
                dashboard.onboarding.progress_percentage >= 80 ? "خطوة واحدة تفصلك عن النجاح! 🎯" :
                dashboard.onboarding.progress_percentage >= 50 ? "أداء رائع! استمر في بناء متجرك 🚀" :
                "أكمل الخطوات المتبقية لزيادة مبيعاتك بنسبة 300%"}
             </Text>

             <View style={[styles.progressBarWrap, { marginTop: 12, marginBottom: 16 }]}>
               <View style={[styles.progressBarFill, { width: `${dashboard.onboarding.progress_percentage}%`, backgroundColor: COLORS.primarySteel }]} />
             </View>

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
                         backgroundColor: isDone ? COLORS.primarySteel : '#F1F5F9',
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
          </View>
        )}

        {/* ── Special Offer Banner ── */}
        {dashboard?.active_offer && (
          <TouchableOpacity 
            style={styles.offerBanner} 
            activeOpacity={0.9}
            onPress={() => navigation.navigate('MerchantOffers')}
          >
             <LinearGradient
               colors={[COLORS.vibrantOrange, COLORS.goldAccent]}
               start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
               style={styles.offerGradient}
             >
                <View style={styles.offerIconWrap}>
                   <Feather name="gift" size={20} color="#fff" />
                </View>
                <View style={styles.offerContent}>
                   <Text style={styles.offerTitle}>{dashboard.active_offer.product_name} 🔥</Text>
                   <Text style={styles.offerSub}>
                     خصم {dashboard.active_offer.discount_percentage}% لفترة محدودة
                   </Text>
                </View>
                <View style={styles.offerAction}>
                   <Text style={styles.offerActionText}>التفاصيل</Text>
                   <Feather name="arrow-left" size={14} color="#B45309" />
                </View>
             </LinearGradient>
          </TouchableOpacity>
        )}

        {/* ── Quick Actions ── */}
        <Text style={styles.sectionLabel}>إجراءات سريعة</Text>
        <View style={styles.actionsGrid}>
           <QuickAction
             icon="grid" label="المتجر" color={activeMerchant?.primary_color || '#2B5876'}
             onPress={() => navigation.navigate('StoreView', { storeId: merchantInfo?.store_id || activeMerchant?.store_id })}
           />
           <QuickAction
             icon="tag" label="العروض" color="#D48D3B"
             onPress={() => navigation.navigate('MerchantOffers')}
           />
           <QuickAction
             icon="package" label="المنتجات" color="#2B5876"
             onPress={() => navigation.navigate('Products')}
           />
           <QuickAction
             icon="users" label="الإعدادات" color="#D48D3B"
             onPress={() => navigation.navigate('Profile')}
           />
           <QuickAction
             icon="file-text" label="الطلبات" color="#2B5876"
             onPress={() => navigation.navigate('Orders', { merchantId: activeMerchant?.id })}
           />
           <QuickAction
             icon="pie-chart" label="مظهر" color="#D48D3B"
             onPress={() => {}}
           />
        </View>

        {/* ── Statistics (Detailed) ── */}
        <Text style={styles.sectionLabel}>إحصائيات</Text>
        <View style={styles.statsCol}>
           <StatsCard 
             label="إيرادات الأسبوع"
             value={`${parseFloat(stats.revenue_this_week || 0).toLocaleString()} ${curr}`}
             subValue="مباشرة من المتجر"
             icon="dollar-sign"
             color={COLORS.primarySteel}
           />
           <StatsCard 
             label="التقييم العام"
             value={`${stats.average_rating || 0}/5`}
             subValue="تقييمات العملاء الحقيقية"
             icon="trending-up"
             color={COLORS.vibrantOrange}
           />
           <StatsCard 
             label="إجراءات (مهام)"
             value={stats.tasks_count || 0}
             subValue="طلبات معلقة ومنتجات منخفضة"
             icon="shopping-cart"
             color={COLORS.lightBlue}
           />
        </View>

        {/* ── Top Products ── */}
        <View style={styles.sectionHeader}>
           <Text style={styles.sectionLabel}>المنتجات الأكثر مبيعاً</Text>
           <TouchableOpacity onPress={() => navigation.navigate('Products')}>
              <Text style={styles.seeAll}>عرض الكل</Text>
           </TouchableOpacity>
        </View>
        
        {dashboard?.top_products?.map((p, i) => (
           <TouchableOpacity key={i} style={styles.topProdRow}>
              <Image source={p.image_url ? { uri: p.image_url } : require('../../assets/images/logo.png')} style={styles.topProdImgRow} />
              <View style={styles.topProdInfoRow}>
                 <Text style={styles.topProdNameRow}>{p.name}</Text>
                 <Text style={styles.topProdStockRow}>متوفر حالياً</Text>
                 <Text style={styles.topProdPriceRow}>{p.price_after_discount} {curr}</Text>
              </View>
              <TouchableOpacity style={styles.viewDetailsBtn}>
                 <Text style={styles.viewDetailsText}>عرض التفاصيل</Text>
              </TouchableOpacity>
              {i === 0 && (
                <View style={[styles.prodBadge, { backgroundColor: COLORS.goldAccent }]}>
                   <Text style={styles.prodBadgeText}>الأكثر مبيعاً</Text>
                </View>
              )}
           </TouchableOpacity>
        ))}

        {/* ── Recent Orders ── */}
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionLabel}>آخر الطلبات</Text>
          <TouchableOpacity onPress={() => navigation.navigate('Orders', { merchantId: activeMerchant?.id })}>
            <Text style={styles.seeAll}>عرض الكل</Text>
          </TouchableOpacity>
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
                  curr={curr}
                  onPress={() => navigation.navigate('MerchantOrderDetail', { orderId: order.id, merchantId: activeMerchant?.id })}
                />
                {idx < recentOrders.length - 1 && <View style={styles.orderDivider} />}
              </React.Fragment>
            ))}
          </View>
        )}

        <View style={{ height: 24 }} />
      </ScrollView>

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

      {/* ── Merchant Menu Modal ── */}
      <Modal visible={menuVisible} transparent animationType="fade" onRequestClose={() => setMenuVisible(false)} statusBarTranslucent>
        <TouchableOpacity style={styles.modalOverlay} activeOpacity={1} onPress={() => setMenuVisible(false)}>
          <View style={styles.menuSheet}>
            <View style={styles.modalHandle} />
            <Text style={styles.modalTitle}>القائمة</Text>
            
            <View style={styles.menuGrid}>
              <MenuItem 
                icon="user" label="الملف الشخصي" 
                onPress={() => { setMenuVisible(false); navigation.navigate('Profile'); }} 
              />
              <MenuItem 
                icon="package" label="المنتجات" 
                onPress={() => { setMenuVisible(false); navigation.navigate('Products'); }} 
              />
              <MenuItem 
                icon="shopping-cart" label="الطلبات" 
                onPress={() => { setMenuVisible(false); navigation.navigate('Orders', { merchantId: activeMerchant?.id }); }} 
              />
              <MenuItem 
                icon="tag" label="العروض" 
                onPress={() => { setMenuVisible(false); navigation.navigate('MerchantOffers'); }} 
              />
              <MenuItem 
                icon="credit-card" label="إعدادات الدفع" 
                onPress={() => { setMenuVisible(false); navigation.navigate('MerchantPaymentSettings'); }} 
              />
              <MenuItem 
                icon="log-out" label="خروج" color={COLORS.danger}
                onPress={handleLogout} 
              />
            </View>
            <View style={{ height: 40 }} />
          </View>
        </TouchableOpacity>
      </Modal>

      {/* ── Merchant Switcher Modal ── */}
      <Modal visible={switcherVisible} transparent animationType="slide" onRequestClose={() => setSwitcherVisible(false)} statusBarTranslucent>
        <TouchableOpacity style={styles.modalOverlay} activeOpacity={1} onPress={() => setSwitcherVisible(false)}>
          <View style={styles.modalSheet}>
            <View style={styles.modalHandle} />
            <Text style={styles.modalTitle}>اختر المتجر</Text>
            <FlatList
              data={manageableMerchants}
              keyExtractor={(m) => String(m.id)}
              ItemSeparatorComponent={() => <View style={styles.modalDivider} />}
              renderItem={({ item }) => {
                const isActive = item.id === activeMerchant?.id;
                const isSwitching = item.id === switchingId;
                return (
                  <TouchableOpacity
                    style={[styles.switcherItem, isActive && { backgroundColor: "#F0F9FF" }]}
                    onPress={() => handleSwitch(item)}
                    disabled={!!switchingId}
                  >
                    <View style={[styles.switcherDot, { backgroundColor: item.primary_color || "#2B5876" }]} />
                    <Text style={[styles.switcherName, isActive && { fontWeight: "700", color: "#2B5876" }]}>
                      {item.name}
                    </Text>
                    {isSwitching
                      ? <ActivityIndicator size="small" color="#2B5876" />
                      : isActive
                        ? <Feather name="check-circle" size={20} color="#2B5876" />
                        : null}
                  </TouchableOpacity>
                );
              }}
            />
            <View style={{ height: 30 }} />
          </View>
        </TouchableOpacity>
      </Modal>
    </View>
  );
}

/* ── Components ────────────────────────────────────────────────── */
const QuickAction = ({ icon, label, color, onPress }) => (
  <TouchableOpacity style={styles.qaItem} onPress={onPress} activeOpacity={0.7}>
    <View style={styles.qaCard}>
      <View style={[styles.qaIconBox, { backgroundColor: color }]}>
        <Feather name={icon} size={22} color="#fff" />
      </View>
      <Text style={styles.qaLabel}>{label}</Text>
    </View>
  </TouchableOpacity>
);

const StatsCard = ({ label, value, subValue, icon, color }) => (
  <View style={[styles.statsCard, { backgroundColor: color }]}>
     <View style={styles.statsIconWrap}>
        <Feather name={icon} size={20} color="#fff" />
     </View>
     <View style={styles.statsBody}>
        <Text style={styles.statsLabel}>{label}</Text>
        <Text style={styles.statsValue}>{value}</Text>
        <Text style={styles.statsSub}>{subValue}</Text>
     </View>
  </View>
);

const MenuItem = ({ icon, label, onPress, color = '#475569' }) => (
  <TouchableOpacity style={styles.menuItem} onPress={onPress}>
    <View style={[styles.menuIconWrap, { backgroundColor: color + '10' }]}>
      <Feather name={icon} size={22} color={color} />
    </View>
    <Text style={[styles.menuItemLabel, { color }]}>{label}</Text>
  </TouchableOpacity>
);

/* ── Styles ─────────────────────────────────────────────────────── */
const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#FFFFFF' },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#F8FAFC' },
  loadingText: { marginTop: 12, color: '#64748B', fontSize: 14 },
  scroll: { paddingBottom: 24 },
  topGradient: { paddingBottom: 20, borderBottomLeftRadius: 35, borderBottomRightRadius: 35 },
  headerSafe: { paddingTop: Platform.OS === 'android' ? StatusBar.currentHeight : 0 },
  headerRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, height: 60 },
  notificationBtn: { width: 40, height: 40, justifyContent: 'center', alignItems: 'center' },
  badge: {
     position: 'absolute', top: 5, right: 5,
     backgroundColor: COLORS.vibrantOrange, width: 16, height: 16, borderRadius: 8,
     justifyContent: 'center', alignItems: 'center', borderWidth: 2, borderColor: COLORS.primarySteel
  },
  badgeText: { color: '#fff', fontSize: 8, fontWeight: 'bold' },
  headerCenter: { alignItems: 'center' },
  merchantPicker: { flexDirection: 'row-reverse', alignItems: 'center' },
  merchantLogoHeader: { width: 28, height: 28, borderRadius: 14, marginLeft: 10, borderWidth: 1.5, borderColor: 'rgba(255,255,255,0.4)' },
  merchantNameHead: { color: '#fff', fontSize: 16, fontWeight: 'bold' },
  welcomeRawaage: { color: 'rgba(255,255,255,0.7)', fontSize: 11 },
  headerRight: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  logoCircle: { width: 36, height: 36, borderRadius: 18, backgroundColor: '#fff', justifyContent: 'center', alignItems: 'center', overflow: 'hidden' },
  logoImg: { width: 24, height: 24 },
  menuBtn: { width: 32, height: 32, justifyContent: 'center', alignItems: 'center' },
  kpiCardLarge: { backgroundColor: 'rgba(255,255,255,0.12)', borderRadius: 24, padding: 20, borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)' },
  kpiHeader: { flexDirection: 'row-reverse', alignItems: 'center' },
  kpiIconWrap: { width: 44, height: 44, borderRadius: 14, justifyContent: 'center', alignItems: 'center' },
  kpiLargeInfo: { flex: 1, marginRight: 16 },
  kpiLargeLabel: { color: 'rgba(255,255,255,0.7)', fontSize: 12, textAlign: 'right' },
  kpiLargeValue: { color: '#fff', fontSize: 28, fontWeight: 'bold', textAlign: 'right', marginVertical: 2 },
  kpiSubValueRow: { flexDirection: 'row-reverse', alignItems: 'center', gap: 4 },
  kpiSubValueText: { color: 'rgba(255,255,255,0.6)', fontSize: 11 },
  kpiRow: { flexDirection: 'row-reverse', paddingHorizontal: 16, gap: 10, marginTop: 12 },
  kpiCardSmall: { backgroundColor: 'rgba(255,255,255,0.12)', borderRadius: 18, padding: 12, alignItems: 'center', borderWidth: 1, borderColor: 'rgba(255,255,255,0.05)' },
  kpiSmallValue: { color: '#fff', fontSize: 18, fontWeight: 'bold', marginTop: 8 },
  kpiSmallLabel: { color: 'rgba(255,255,255,0.6)', fontSize: 10, marginTop: 2 },
  alertRow: { flexDirection: 'row-reverse', backgroundColor: '#FFFBEB', marginHorizontal: 16, marginTop: 12, padding: 10, borderRadius: 10, alignItems: 'center', gap: 8, borderWidth: 1, borderColor: '#FEF3C7' },
  alertText: { color: '#B45309', fontSize: 12, fontWeight: '600' },
  onboardingCard: { backgroundColor: '#fff', marginHorizontal: 16, marginTop: 20, borderRadius: 24, padding: 20, borderWidth: 1, borderColor: '#F1F5F9', shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.05, shadowRadius: 10, elevation: 2 },
  onboardingTitle: { fontSize: 16, fontWeight: 'bold', color: '#1E293B' },
  onboardingSub: { fontSize: 12, color: '#64748B', lineHeight: 18 },
  progressBarWrap: { height: 8, backgroundColor: '#F1F5F9', borderRadius: 4, overflow: 'hidden' },
  progressBarFill: { height: '100%', borderRadius: 4 },
  offerBanner: { marginHorizontal: 16, marginTop: 20, elevation: 5, shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.1, shadowRadius: 8 },
  offerGradient: { borderRadius: 20, padding: 16, flexDirection: 'row-reverse', alignItems: 'center' },
  offerIconWrap: { width: 40, height: 40, borderRadius: 20, backgroundColor: 'rgba(255,255,255,0.2)', justifyContent: 'center', alignItems: 'center' },
  offerContent: { flex: 1, marginRight: 12 },
  offerTitle: { color: '#fff', fontSize: 14, fontWeight: 'bold', textAlign: 'right' },
  offerSub: { color: 'rgba(255,255,255,0.9)', fontSize: 11, textAlign: 'right' },
  offerAction: { backgroundColor: '#fff', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 15, flexDirection: 'row', alignItems: 'center', gap: 4 },
  offerActionText: { color: '#B45309', fontSize: 11, fontWeight: 'bold' },
  sectionLabel: { fontSize: 18, fontWeight: 'bold', color: '#1E293B', marginHorizontal: 16, marginTop: 24, marginBottom: 16, textAlign: 'right' },
  actionsGrid: { flexDirection: 'row-reverse', flexWrap: 'wrap', paddingHorizontal: 11 },
  qaItem: { width: '33.33%', padding: 5 },
  qaCard: { backgroundColor: '#fff', borderRadius: 20, padding: 16, alignItems: 'center', borderWidth: 1, borderColor: '#F1F5F9', shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.03, shadowRadius: 4, elevation: 1 },
  qaIconBox: { width: 44, height: 44, borderRadius: 14, justifyContent: 'center', alignItems: 'center', marginBottom: 10 },
  qaLabel: { fontSize: 12, fontWeight: '600', color: '#475569' },
  statsCol: { paddingHorizontal: 16, gap: 12 },
  statsCard: { borderRadius: 20, padding: 16, flexDirection: 'row-reverse', alignItems: 'center' },
  statsIconWrap: { width: 40, height: 40, borderRadius: 10, backgroundColor: 'rgba(255,255,255,0.15)', justifyContent: 'center', alignItems: 'center' },
  statsBody: { flex: 1, marginRight: 16 },
  statsLabel: { color: 'rgba(255,255,255,0.7)', fontSize: 11, textAlign: 'right' },
  statsValue: { color: '#fff', fontSize: 20, fontWeight: 'bold', textAlign: 'right' },
  statsSub: { color: 'rgba(255,255,255,0.6)', fontSize: 10, textAlign: 'right' },
  sectionHeader: { flexDirection: 'row-reverse', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 16, marginTop: 24, marginBottom: 12 },
  seeAll: { color: '#94A3B8', fontSize: 13 },
  topProdRow: { flexDirection: 'row-reverse', alignItems: 'center', padding: 12, backgroundColor: '#fff', borderRadius: 20, marginHorizontal: 16, marginBottom: 12, borderWidth: 1, borderColor: '#F1F5F9' },
  topProdImgRow: { width: 60, height: 60, borderRadius: 12 },
  topProdInfoRow: { flex: 1, marginRight: 12 },
  topProdNameRow: { fontSize: 14, fontWeight: 'bold', color: '#1E293B', textAlign: 'right' },
  topProdStockRow: { fontSize: 11, color: '#2ECC71', textAlign: 'right', marginVertical: 2 },
  topProdPriceRow: { fontSize: 14, fontWeight: 'bold', color: '#1E293B', textAlign: 'right' },
  viewDetailsBtn: { backgroundColor: COLORS.lightBlue, paddingHorizontal: 12, paddingVertical: 8, borderRadius: 10 },
  viewDetailsText: { color: '#fff', fontSize: 11, fontWeight: 'bold' },
  prodBadge: { position: 'absolute', top: -5, left: 10, paddingHorizontal: 8, paddingVertical: 2, borderRadius: 5 },
  prodBadgeText: { color: '#fff', fontSize: 9, fontWeight: 'bold' },
  ordersCard: { marginHorizontal: 16, backgroundColor: '#fff', borderRadius: 20, overflow: 'hidden', borderWidth: 1, borderColor: '#F1F5F9' },
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
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  modalSheet: { backgroundColor: '#fff', borderTopLeftRadius: 30, borderTopRightRadius: 30, paddingHorizontal: 20, paddingTop: 12 },
  modalHandle: { width: 40, height: 4, borderRadius: 2, backgroundColor: '#E2E8F0', alignSelf: 'center', marginBottom: 20 },
  modalTitle: { fontSize: 18, fontWeight: 'bold', color: '#1E293B', textAlign: 'center', marginBottom: 20 },
  modalDivider: { height: 1, backgroundColor: '#F1F5F9' },
  switcherItem: { flexDirection: 'row-reverse', alignItems: 'center', paddingVertical: 16, paddingHorizontal: 12, borderRadius: 12 },
  switcherDot: { width: 12, height: 12, borderRadius: 6, marginLeft: 12 },
  switcherName: { flex: 1, fontSize: 16, color: '#1E293B', textAlign: 'right' },
  /* Menu Styles */
  menuSheet: { backgroundColor: '#fff', borderTopLeftRadius: 30, borderTopRightRadius: 30, paddingHorizontal: 20, paddingTop: 12, width: '100%' },
  menuGrid: { flexDirection: 'row-reverse', flexWrap: 'wrap' },
  menuItem: { width: '33.33%', alignItems: 'center', paddingVertical: 20 },
  menuIconWrap: { width: 50, height: 50, borderRadius: 25, justifyContent: 'center', alignItems: 'center', marginBottom: 8 },
  menuItemLabel: { fontSize: 13, fontWeight: '600' },
});
