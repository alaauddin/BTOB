import React, { useState, useEffect } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  ActivityIndicator, StatusBar, Image, Dimensions, Linking, Platform,
  Modal, Alert, TextInput,
} from 'react-native';
import { Ionicons, Feather, MaterialCommunityIcons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { useAuth } from '../context/AuthContext';
import MapView, { Marker, Polyline } from 'react-native-maps';
import client from '../api/client';

const { width } = Dimensions.get('window');

// Helper to decode Google-encoded polylines from OSRM
const decodePolyline = (t, e) => {
  let r, n, a = 0, l = 0, i = 0, s = [], c = 0, u = 0, h = null, d = Math.pow(10, e || 5);
  for (; a < t.length; ) {
    h = null, c = 0, u = 0;
    do h = t.charCodeAt(a++) - 63, u |= (31 & h) << c, c += 5; while (h >= 32);
    r = 1 & u ? ~(u >> 1) : u >> 1, i += r, c = 0, u = 0;
    do h = t.charCodeAt(a++) - 63, u |= (31 & h) << c, c += 5; while (h >= 32);
    n = 1 & u ? ~(u >> 1) : u >> 1, l += n, s.push({ latitude: i / d, longitude: l / d });
  }
  return s;
};

const STATUS_CONFIG = {
  pending:   { bg: '#FFF7ED', text: '#C2410C', icon: 'clock-outline', label: 'قيد الانتظار' },
  confirmed: { bg: '#F0FDF4', text: '#15803D', icon: 'check-all', label: 'مؤكد' },
  shipped:   { bg: '#EFF6FF', text: '#1D4ED8', icon: 'truck-delivery-outline', label: 'تم الشحن' },
  delivered: { bg: '#F0FDF4', text: '#15803D', icon: 'home-check-outline', label: 'تم التوصيل' },
  cancelled: { bg: '#FEF2F2', text: '#B91C1C', icon: 'close-circle-outline', label: 'ملغي' },
};

const SectionHeader = ({ title, icon, color }) => (
  <View style={styles.sectionHeader}>
    <View style={[styles.sectionIcon, { backgroundColor: color + '10' }]}>
      <Feather name={icon} size={16} color={color} />
    </View>
    <Text style={styles.sectionTitle}>{title}</Text>
  </View>
);

const DetailItem = ({ label, value, icon, isCopyable = false }) => (
  <View style={styles.detailItem}>
    <View style={styles.detailLabelRow}>
      <Feather name={icon} size={14} color="#94A3B8" />
      <Text style={styles.detailLabel}>{label}</Text>
    </View>
    <Text style={styles.detailValue} numberOfLines={1}>{value || '—'}</Text>
  </View>
);

export default function MerchantOrderDetailScreen({ route, navigation }) {
  const { orderId } = route.params || {};
  const { activeMerchant } = useAuth();
  const [order, setOrder] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showMap, setShowMap] = useState(false);
  const [routeCoordinates, setRouteCoordinates] = useState([]);
  const [showAddDriver, setShowAddDriver] = useState(false);
  const [isCreatingDriver, setIsCreatingDriver] = useState(false);
  const [newDriver, setNewDriver] = useState({ first_name: '', phone: '', username: '', password: '' });

  const fetchRoute = async () => {
    if (!order.merchant?.latitude || !order.shipping?.latitude) return;
    try {
      const url = `http://router.project-osrm.org/route/v1/driving/${order.merchant.longitude},${order.merchant.latitude};${order.shipping.longitude},${order.shipping.latitude}?overview=full`;
      const res = await fetch(url);
      const data = await res.json();
      if (data.routes && data.routes[0]) {
        const decoded = decodePolyline(data.routes[0].geometry);
        setRouteCoordinates(decoded);
      }
    } catch (e) {
      console.warn("Routing error", e);
    }
  };

  useEffect(() => {
    if (showMap && order && routeCoordinates.length === 0) {
      fetchRoute();
    }
  }, [showMap, order]);

  useEffect(() => {
    if (!orderId || !activeMerchant?.id) return;
    client.get(`/merchant/orders/${orderId}/?merchant_id=${activeMerchant.id}`)
      .then(res => { if (res.data.success) setOrder(res.data.order); })
      .catch(err => console.error('Order detail error', err))
      .finally(() => setLoading(false));
  }, [orderId, activeMerchant?.id]);

  const updateOrder = async (params) => {
    try {
      setLoading(true);
      const res = await client.patch(`merchant/orders/${orderId}/`, {
        merchant_id: activeMerchant.id,
        ...params
      });
      if (res.data.success) {
        setOrder(res.data.order);
      } else {
        Alert.alert('خطأ', res.data.message || 'فشل تحديث الطلب');
      }
    } catch (e) {
      console.error(e);
      const msg = e.response?.data?.message || 'حدث خطأ أثناء الاتصال بالخادم';
      Alert.alert('خطأ', msg);
    } finally {
      setLoading(false);
    }
  };

  const handleAddDriver = async () => {
    const { first_name, phone, username, password } = newDriver;
    if (!first_name || !phone || !username || !password) {
      Alert.alert('تنبيه', 'يرجى ملء جميع الحقول المطلوبة');
      return;
    }

    try {
      setIsCreatingDriver(true);
      const res = await client.post('/merchant/drivers/', {
        merchant_id: activeMerchant.id,
        ...newDriver
      });

      if (res.data.success) {
        Alert.alert('نجاح', 'تم إنشاء حساب السائق وإرسال البيانات عبر الواتساب');
        setShowAddDriver(false);
        setNewDriver({ first_name: '', phone: '', username: '', password: '' });
        // Auto assign the new driver to this order
        updateOrder({ driver_id: res.data.driver.id });
      } else {
        Alert.alert('خطأ', res.data.message || 'فشل إنشاء الحساب');
      }
    } catch (e) {
      console.error(e);
      const msg = e.response?.data?.message || 'حدث خطأ أثناء الاتصال بالخادم';
      Alert.alert('خطأ', msg);
    } finally {
      setIsCreatingDriver(false);
    }
  };

  const merchant = order?.merchant || activeMerchant;
  const primaryColor = merchant?.primary_color || '#2B5876';
  const accentColor = '#F58231';

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color={primaryColor} />
        <Text style={styles.loadingText}>جاري تحميل التفاصيل...</Text>
      </View>
    );
  }

  if (!order) {
    return (
      <View style={styles.centered}>
        <MaterialCommunityIcons name="package-variant-closed" size={64} color="#CBD5E1" />
        <Text style={styles.errorText}>عذراً، لم نتمكن من العثور على الطلب</Text>
        <TouchableOpacity style={styles.retryBtn} onPress={() => navigation.goBack()}>
          <Text style={styles.retryBtnText}>العودة للطلبات</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const status = STATUS_CONFIG[order.status_slug] || STATUS_CONFIG.pending;

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" translucent backgroundColor="transparent" />
      
      {/* ── Dynamic Header & Branding ── */}
      <LinearGradient
        colors={[primaryColor, primaryColor + 'DD']}
        style={styles.headerGradient}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
      >
        <SafeAreaView edges={['top']} style={styles.safeHeader}>
          <View style={styles.headerContent}>
            <TouchableOpacity style={styles.headerBtn} onPress={() => navigation.goBack()}>
              <Ionicons name="chevron-back" size={24} color="#FFF" />
            </TouchableOpacity>
            
            <View style={styles.headerTitleGroup}>
              <Text style={styles.headerSubtitle}>تفاصيل الطلب</Text>
              <Text style={styles.headerTitleText}>#{order.id}</Text>
            </View>

            <View style={styles.merchantMiniBox}>
              {merchant?.profile_picture ? (
                <Image source={{ uri: merchant.profile_picture }} style={styles.merchantLogo} />
              ) : (
                <View style={styles.merchantLogoPlaceholder}>
                  <Feather name="shopping-bag" size={14} color="#FFF" />
                </View>
              )}
            </View>
          </View>
        </SafeAreaView>
      </LinearGradient>

      <ScrollView 
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* ── High-Impact Status Section ── */}
        <View style={styles.statusCard}>
          <View style={[styles.statusIconBox, { backgroundColor: status.bg }]}>
            <MaterialCommunityIcons name={status.icon} size={32} color={status.text} />
          </View>
          <View style={styles.statusInfo}>
            <Text style={[styles.statusLabel, { color: status.text }]}>{status.label || order.status_name}</Text>
            <Text style={styles.statusTime}>آخر تحديث: {new Date(order.updated_at).toLocaleString('ar-SA', { hour: '2-digit', minute: '2-digit', day: 'numeric', month: 'short' })}</Text>
          </View>
          <View style={styles.statusBadge}>
             <View style={[styles.dot, { backgroundColor: status.text }]} />
             <Text style={[styles.badgeText, { color: status.text }]}>نشط</Text>
          </View>
        </View>

        {/* ── Interactive Workflow Stepper ── */}
        {order.workflow_steps && order.workflow_steps.length > 0 && (
          <View style={styles.workflowSection}>
            <Text style={styles.sectionTitleSmall}>مرحلة الطلب</Text>
            <ScrollView 
              horizontal 
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.stepperContainer}
            >
              {order.workflow_steps.map((step, idx) => {
                let statusVariant = 'pending';
                if (order.current_priority === step.priority) statusVariant = 'active';
                else if (step.priority < order.current_priority) statusVariant = 'completed';

                return (
                  <TouchableOpacity 
                    key={idx} 
                    style={[styles.stepItem, statusVariant === 'active' && { borderColor: primaryColor, backgroundColor: '#F8FAFC' }]}
                    onPress={() => {
                        if (statusVariant === 'pending') {
                           Alert.alert(
                             'تحديث الحالة',
                             `هل أنت متأكد من تغيير حالة الطلب إلى "${step.name}"؟`,
                             [
                               { text: 'إلغاء', style: 'cancel' },
                               { text: 'تأكيد', onPress: () => updateOrder({ status: step.slug }) }
                             ]
                           );
                        }
                    }}
                  >
                    <View style={[styles.stepIconCircle, 
                      statusVariant === 'completed' && { backgroundColor: '#10B981' },
                      statusVariant === 'active' && { backgroundColor: primaryColor },
                      statusVariant === 'pending' && { backgroundColor: '#E2E8F0' }
                    ]}>
                      {statusVariant === 'completed' ? (
                        <Ionicons name="checkmark" size={12} color="#FFF" />
                      ) : (
                        <Text style={styles.stepNumberText}>{idx + 1}</Text>
                      )}
                    </View>
                    <Text style={[styles.stepLabelText, statusVariant === 'active' && { color: primaryColor, fontWeight: '800' }]}>
                      {step.name}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
          </View>
        )}

        {/* ── Driver Management Section ── */}
        {order.enable_delivery_drivers && (
          <View style={styles.driverSection}>
            <View style={styles.sectionHeaderLine}>
               <View style={styles.sectionIconTitle}>
                  <MaterialCommunityIcons name="moped" size={20} color={accentColor} />
                  <Text style={styles.sectionTitleSmall}>سائق التوصيل</Text>
               </View>
               <View style={{ flexDirection: 'row-reverse', alignItems: 'center', gap: 8 }}>
                 <TouchableOpacity 
                   onPress={() => setShowAddDriver(true)}
                   style={styles.quickAddBtn}
                 >
                    <Feather name="user-plus" size={14} color={primaryColor} />
                    <Text style={[styles.quickAddText, { color: primaryColor }]}>إضافة سريع</Text>
                 </TouchableOpacity>

                 {order.assigned_driver && (
                   <TouchableOpacity 
                     onPress={() => updateOrder({ driver_id: '' })}
                     style={styles.unassignBtn}
                   >
                      <Text style={styles.unassignBtnText}>إلغاء التعيين</Text>
                   </TouchableOpacity>
                 )}
               </View>
            </View>

            {order.assigned_driver ? (
               <View style={styles.assignedDriverCard}>
                  <View style={styles.driverAvatar}>
                     <Text style={styles.driverLetter}>{order.assigned_driver.name.charAt(0).toUpperCase()}</Text>
                  </View>
                  <View style={styles.driverInfo}>
                     <Text style={styles.driverNameText}>{order.assigned_driver.name}</Text>
                     <TouchableOpacity onPress={() => Linking.openURL(`tel:${order.assigned_driver.phone}`)}>
                        <Text style={styles.driverPhoneText}>{order.assigned_driver.phone}</Text>
                     </TouchableOpacity>
                  </View>
                  <TouchableOpacity 
                    style={styles.driverCallBtn}
                    onPress={() => Linking.openURL(`tel:${order.assigned_driver.phone}`)}
                  >
                     <Feather name="phone" size={18} color={primaryColor} />
                  </TouchableOpacity>
               </View>
            ) : (
               <View style={styles.driverPickerWrapper}>
                  {order.available_drivers && order.available_drivers.length > 0 ? (
                    <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ paddingVertical: 5 }}>
                       {order.available_drivers.map((drv, idx) => (
                         <TouchableOpacity 
                           key={idx} 
                           style={styles.driverOption}
                           onPress={() => updateOrder({ driver_id: drv.id })}
                         >
                            <Text style={styles.driverOptionName}>{drv.name}</Text>
                            <Text style={styles.driverOptionPhone}>{drv.phone}</Text>
                         </TouchableOpacity>
                       ))}
                    </ScrollView>
                  ) : (
                    <View style={styles.noDriversBox}>
                       <Text style={styles.noDriversText}>لا يوجد سائقون متاحون حالياً</Text>
                    </View>
                  )}
                  {order.current_requires_driver && (
                    <View style={styles.warningBox}>
                       <Feather name="alert-triangle" size={14} color="#D97706" />
                       <Text style={styles.warningText}>يجب تعيين سائق للانتقال للمرحلة التالية</Text>
                    </View>
                  )}
               </View>
            )}
          </View>
        )}

        {/* ── Customer & Shipping Info ── */}
        <View style={styles.card}>
          <SectionHeader title="معلومات العميل والشحن" icon="user" color={primaryColor} />
          
          <View style={styles.detailsGrid}>
            <DetailItem label="صاحب الطلب" value={order.customer_name} icon="user" />
            <DetailItem label="تاريخ الطلب" value={new Date(order.created_at).toLocaleDateString('ar-SA')} icon="calendar" />
          </View>

          {order.shipping && (
            <>
              <View style={styles.divider} />
              <View style={styles.contactContainer}>
                <View style={styles.contactRowMain}>
                  <View style={styles.contactIcon}>
                    <Feather name="phone" size={16} color="#FFF" />
                  </View>
                  <Text style={styles.contactText}>{order.shipping.phone}</Text>
                </View>
                <View style={styles.contactActions}>
                  <TouchableOpacity 
                    style={[styles.actionBtn, { backgroundColor: '#F59E0B' }]}
                    onPress={() => setShowMap(true)}
                  >
                    <Feather name="map-pin" size={16} color="#FFF" />
                  </TouchableOpacity>

                  <TouchableOpacity 
                    style={[styles.actionBtn, { backgroundColor: '#3B82F6' }]}
                    onPress={() => Linking.openURL(`tel:${order.shipping.phone}`)}
                  >
                    <Feather name="phone" size={16} color="#FFF" />
                  </TouchableOpacity>
                  
                  <TouchableOpacity 
                    style={[styles.actionBtn, { backgroundColor: '#25D366' }]}
                    onPress={() => {
                        const ph = String(order.shipping.phone || '').replace(/[^0-9]/g, '');
                        if (ph) Linking.openURL(`https://wa.me/${ph}`);
                    }}
                  >
                    <MaterialCommunityIcons name="whatsapp" size={20} color="#FFF" />
                  </TouchableOpacity>
                </View>
              </View>

              <View style={styles.addressBox}>
                <Feather name="map-pin" size={14} color={primaryColor} />
                <Text style={styles.addressText}>
                  {order.shipping.city} — {[order.shipping.address_line1, order.shipping.address_line2].filter(Boolean).join(', ')}
                </Text>
              </View>
            </>
          )}
        </View>

        {/* ── Order Items ── */}
        <View style={styles.itemsSection}>
          <View style={styles.itemsHeader}>
            <Text style={styles.itemsTitle}>المنتجات المطلوبة</Text>
            <View style={styles.itemsCount}>
              <Text style={styles.itemsCountText}>{order.items?.length || 0}</Text>
            </View>
          </View>

          {(order.items || []).map((item, idx) => (
            <View key={idx} style={styles.itemCard}>
              <View style={styles.itemMainRow}>
                <Image 
                  source={{ uri: item.product_image }} 
                  style={styles.itemImage} 
                  resizeMode="cover"
                />
                <View style={styles.itemCoreInfo}>
                  <Text style={styles.itemName} numberOfLines={2}>{item.product_name}</Text>
                  
                  {item.selected_options_details && item.selected_options_details.length > 0 && (
                    <View style={styles.itemOptionsRow}>
                      {item.selected_options_details.map((opt) => (
                        <View key={opt.id} style={styles.variationBadge}>
                          <Text style={styles.variationText}>{opt.attribute_name}: {opt.value}</Text>
                        </View>
                      ))}
                    </View>
                  )}

                  <View style={styles.priceQtyRow}>
                    <Text style={styles.itemUnitPrice}>{parseFloat(item.unit_price).toLocaleString()} <Text style={styles.currencySmall}>ر.ي</Text></Text>
                    <View style={styles.qtyBubble}>
                      <Text style={styles.qtyText}>× {item.quantity}</Text>
                    </View>
                  </View>
                </View>
              </View>
              
              <View style={[styles.itemSubtotalPart, { borderTopColor: '#F1F5F9' }]}>
                <Text style={styles.subtotalLabel}>الإجمالي الجزئي</Text>
                <Text style={[styles.subtotalValue, { color: primaryColor }]}>
                  {(parseFloat(item.unit_price) * item.quantity).toLocaleString()} <Text style={styles.currencySmaller}>ر.ي</Text>
                </Text>
              </View>
            </View>
          ))}
        </View>

        {/* ── Grand Summary (Receipt Style) ── */}
        <View style={styles.receiptContainer}>
          <View style={styles.receiptHeader}>
            <View style={styles.receiptCircleLeft} />
            <View style={styles.receiptCircleRight} />
            <Text style={styles.receiptTitle}>ملخص الحساب</Text>
          </View>
          
          <View style={styles.receiptBody}>
            <View style={styles.receiptRow}>
              <Text style={styles.receiptLabel}>إجمالي المنتجات</Text>
              <Text style={styles.receiptValue}>{parseFloat(order.total_amount).toLocaleString()} ر.ي</Text>
            </View>
            <View style={styles.receiptRow}>
              <Text style={styles.receiptLabel}>ضريبة / رسوم</Text>
              <Text style={styles.receiptValue}>0.00 ر.ي</Text>
            </View>
            
            <View style={styles.receiptDivider} />
            
            <View style={styles.receiptTotalRow}>
              <Text style={styles.receiptTotalLabel}>الإجمالي النهائي</Text>
              <View style={styles.totalAmountContainer}>
                <Text style={[styles.receiptTotalValue, { color: primaryColor }]}>
                  {parseFloat(order.total_amount).toLocaleString()}
                </Text>
                <Text style={[styles.receiptCurrency, { color: primaryColor }]}> ر.ي</Text>
              </View>
            </View>
          </View>
          
          <LinearGradient
            colors={['#F8FAFC', '#F1F5F9']}
            style={styles.receiptFooter}
          >
            <Feather name="shield" size={12} color="#94A3B8" />
            <Text style={styles.footerText}>معاملة آمنة وموثقة عبر رواج</Text>
          </LinearGradient>
        </View>

        <View style={{ height: 60 }} />
      </ScrollView>

      {/* ── Interactive Map Modal ── */}
      <Modal
        visible={showMap}
        animationType="slide"
        onRequestClose={() => setShowMap(false)}
      >
        <SafeAreaView style={styles.mapModalContainer}>
          <View style={styles.mapHeader}>
            <TouchableOpacity style={styles.closeMapBtn} onPress={() => setShowMap(false)}>
              <Ionicons name="close" size={24} color="#1E293B" />
            </TouchableOpacity>
            <Text style={styles.mapTitle}>موقع التوصيل</Text>
            <View style={{ width: 44 }} />
          </View>
          
          <MapView
            style={styles.map}
            initialRegion={{
              latitude: parseFloat(order.merchant?.latitude || 15.3694),
              longitude: parseFloat(order.merchant?.longitude || 44.1910),
              latitudeDelta: 0.05,
              longitudeDelta: 0.05,
            }}
          >
            {order.merchant?.latitude && (
              <Marker
                coordinate={{
                  latitude: parseFloat(order.merchant.latitude),
                  longitude: parseFloat(order.merchant.longitude),
                }}
                title="متجرك"
                description={merchant?.name}
              >
                <View style={[styles.markerBubble, { backgroundColor: primaryColor }]}>
                  <Feather name="shopping-bag" size={14} color="#FFF" />
                </View>
              </Marker>
            )}

            {order.shipping?.latitude && (
              <Marker
                coordinate={{
                  latitude: parseFloat(order.shipping.latitude),
                  longitude: parseFloat(order.shipping.longitude),
                }}
                title="موقع العميل"
                description={order.customer_name}
              >
                <View style={[styles.markerBubble, { backgroundColor: '#EF4444' }]}>
                  <Feather name="map-pin" size={14} color="#FFF" />
                </View>
              </Marker>
            )}

            {order.merchant?.latitude && order.shipping?.latitude && (
               <Polyline
                 coordinates={routeCoordinates.length > 0 ? routeCoordinates : [
                   { latitude: parseFloat(order.merchant.latitude), longitude: parseFloat(order.merchant.longitude) },
                   { latitude: parseFloat(order.shipping.latitude), longitude: parseFloat(order.shipping.longitude) }
                 ]}
                 strokeColor={primaryColor}
                 strokeWidth={4}
                 lineDashPattern={routeCoordinates.length > 0 ? null : [5, 5]}
               />
            )}
          </MapView>
          
          <View style={styles.mapFooter}>
             <Text style={styles.mapFooterText}>المسافة التقريبية للموقع الموضح</Text>
             <TouchableOpacity 
               style={[styles.navigateBtn, { backgroundColor: primaryColor }]}
               onPress={() => {
                 const scheme = Platform.OS === 'ios' ? 'maps:' : 'geo:';
                 const url = `${scheme}${order.shipping.latitude},${order.shipping.longitude}?q=${order.shipping.latitude},${order.shipping.longitude}`;
                 Linking.openURL(url);
               }}
             >
                <Feather name="navigation" size={16} color="#FFF" style={{ marginLeft: 8 }} />
                <Text style={styles.navigateBtnText}>فتح في خرائط جوجل</Text>
             </TouchableOpacity>
          </View>
        </SafeAreaView>
      </Modal>

      {/* ── Quick Add Driver Modal ── */}
      <Modal
        visible={showAddDriver}
        transparent
        animationType="fade"
        onRequestClose={() => setShowAddDriver(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContainer}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>إضافة سائق جديد</Text>
              <TouchableOpacity onPress={() => setShowAddDriver(false)}>
                <Feather name="x" size={24} color="#64748B" />
              </TouchableOpacity>
            </View>

            <ScrollView contentContainerStyle={styles.modalBody}>
              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>الاسم الأول</Text>
                <TextInput
                  style={styles.input}
                  placeholder="مثال: أحمد"
                  value={newDriver.first_name}
                  onChangeText={(t) => setNewDriver({...newDriver, first_name: t})}
                />
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>رقم الهاتف</Text>
                <TextInput
                  style={styles.input}
                  placeholder="77xxxxxxx"
                  keyboardType="phone-pad"
                  value={newDriver.phone}
                  onChangeText={(t) => setNewDriver({...newDriver, phone: t})}
                />
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>اسم المستخدم (للدخول)</Text>
                <TextInput
                  style={styles.input}
                  placeholder="driver_name"
                  autoCapitalize="none"
                  value={newDriver.username}
                  onChangeText={(t) => setNewDriver({...newDriver, username: t})}
                />
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>كلمة المرور</Text>
                <TextInput
                  style={styles.input}
                  placeholder="••••••••"
                  secureTextEntry
                  value={newDriver.password}
                  onChangeText={(t) => setNewDriver({...newDriver, password: t})}
                />
              </View>

              <TouchableOpacity 
                style={[styles.submitBtn, { backgroundColor: primaryColor }]}
                onPress={handleAddDriver}
                disabled={isCreatingDriver}
              >
                {isCreatingDriver ? (
                  <ActivityIndicator color="#FFF" />
                ) : (
                  <>
                    <Feather name="check" size={18} color="#FFF" />
                    <Text style={styles.submitBtnText}>إنشاء الحساب وإرسال البيانات</Text>
                  </>
                )}
              </TouchableOpacity>

              <Text style={styles.hintText}>* سيتم إرسال بيانات الدخول للسائق عبر الواتساب فور الإنشاء</Text>
            </ScrollView>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F8FAFC' },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 20 },
  loadingText: { marginTop: 16, color: '#64748B', fontWeight: '500' },
  errorText: { marginTop: 12, color: '#64748B', textAlign: 'center', fontSize: 16 },
  retryBtn: { marginTop: 20, paddingHorizontal: 24, paddingVertical: 12, borderRadius: 12, backgroundColor: '#2B5876' },
  retryBtnText: { color: '#FFF', fontWeight: 'bold' },

  /* Header */
  headerGradient: { paddingBottom: 24 },
  safeHeader: { paddingTop: Platform.OS === 'android' ? StatusBar.currentHeight : 0 },
  headerContent: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    marginTop: 10,
  },
  headerBtn: {
    width: 44,
    height: 44,
    borderRadius: 14,
    backgroundColor: 'rgba(255,255,255,0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitleGroup: { alignItems: 'flex-end' },
  headerSubtitle: { color: 'rgba(255,255,255,0.7)', fontSize: 13, fontWeight: '500' },
  headerTitleText: { color: '#FFF', fontSize: 22, fontWeight: '800' },
  merchantMiniBox: {
    width: 44,
    height: 44,
    borderRadius: 14,
    backgroundColor: 'rgba(255,255,255,0.15)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.3)',
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden',
  },
  merchantLogo: { width: '100%', height: '100%' },

  /* Content */
  scrollContent: { paddingHorizontal: 20, paddingTop: 20 },

  /* Status Card */
  statusCard: {
    backgroundColor: '#FFF',
    borderRadius: 24,
    padding: 16,
    flexDirection: 'row-reverse',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.05,
    shadowRadius: 15,
    elevation: 3,
    marginBottom: 20,
  },
  statusIconBox: {
    width: 64,
    height: 64,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  statusInfo: { flex: 1, marginRight: 16, alignItems: 'flex-end' },
  statusLabel: { fontSize: 18, fontWeight: '800' },
  statusTime: { fontSize: 12, color: '#94A3B8', marginTop: 2 },
  statusBadge: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 5,
    backgroundColor: '#F8FAFC',
    borderRadius: 100,
  },
  dot: { width: 6, height: 6, borderRadius: 3, marginLeft: 6 },
  badgeText: { fontSize: 11, fontWeight: '700' },

  /* General Card */
  card: {
    backgroundColor: '#FFF',
    borderRadius: 24,
    padding: 24,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.03,
    shadowRadius: 10,
    elevation: 2,
  },
  sectionHeader: { flexDirection: 'row-reverse', alignItems: 'center', marginBottom: 20 },
  sectionIcon: { width: 36, height: 36, borderRadius: 10, justifyContent: 'center', alignItems: 'center', marginLeft: 12 },
  sectionTitle: { fontSize: 16, fontWeight: '800', color: '#1E293B' },

  detailsGrid: { flexDirection: 'row-reverse', justifyContent: 'space-between' },
  detailItem: { flex: 1, alignItems: 'flex-end' },
  detailLabelRow: { flexDirection: 'row-reverse', alignItems: 'center', marginBottom: 4 },
  detailLabel: { fontSize: 12, color: '#94A3B8', fontWeight: '600', marginRight: 6 },
  detailValue: { fontSize: 14, color: '#1E293B', fontWeight: '700' },

  divider: { height: 1, backgroundColor: '#F1F5F9', marginVertical: 20 },

  contactContainer: {
    flexDirection: 'row-reverse',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
    borderRadius: 20,
    padding: 12,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: '#F1F5F9',
  },
  contactRowMain: { flexDirection: 'row-reverse', alignItems: 'center' },
  contactIcon: { width: 32, height: 32, borderRadius: 10, backgroundColor: '#3B82F6', justifyContent: 'center', alignItems: 'center', marginLeft: 12 },
  contactText: { fontSize: 15, color: '#1E293B', fontWeight: '800' },
  contactActions: { flexDirection: 'row-reverse', gap: 10 },
  actionBtn: { width: 40, height: 40, borderRadius: 12, justifyContent: 'center', alignItems: 'center' },

  addressBox: { 
    flexDirection: 'row-reverse', 
    backgroundColor: '#F1F5F9', 
    padding: 16, 
    borderRadius: 16,
    gap: 10
  },
  addressText: { flex: 1, color: '#475569', fontSize: 13, lineHeight: 20, textAlign: 'right', fontWeight: '500' },

  /* Items Section */
  itemsSection: { marginBottom: 20 },
  itemsHeader: { flexDirection: 'row-reverse', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16, paddingHorizontal: 4 },
  itemsTitle: { fontSize: 17, fontWeight: '800', color: '#1E293B' },
  itemsCount: { backgroundColor: '#3B82F610', paddingHorizontal: 12, paddingVertical: 4, borderRadius: 10 },
  itemsCountText: { color: '#3B82F6', fontWeight: '800', fontSize: 12 },

  itemCard: {
    backgroundColor: '#FFF',
    borderRadius: 24,
    padding: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.03,
    shadowRadius: 10,
    elevation: 2,
  },
  itemMainRow: { flexDirection: 'row-reverse', gap: 16 },
  itemImage: { width: 90, height: 90, borderRadius: 18, backgroundColor: '#F8FAFC' },
  itemCoreInfo: { flex: 1, alignItems: 'flex-end' },
  itemName: { fontSize: 15, fontWeight: '700', color: '#1E293B', textAlign: 'right' },
  
  itemOptionsRow: { flexDirection: 'row-reverse', flexWrap: 'wrap', gap: 6, marginTop: 8 },
  variationBadge: { backgroundColor: '#F8FAFC', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 10, borderWidth: 1, borderColor: '#F1F5F9' },
  variationText: { fontSize: 10, color: '#64748B', fontWeight: '700' },

  priceQtyRow: { flexDirection: 'row-reverse', justifyContent: 'space-between', alignItems: 'center', width: '100%', marginTop: 'auto' },
  itemUnitPrice: { fontSize: 16, fontWeight: '800', color: '#1E293B' },
  currencySmall: { fontSize: 10, color: '#94A3B8' },
  qtyBubble: { paddingHorizontal: 10, paddingVertical: 4, backgroundColor: '#F1F5F9', borderRadius: 100 },
  qtyText: { fontSize: 12, fontWeight: '800', color: '#64748B' },

  itemSubtotalPart: { 
    flexDirection: 'row-reverse', 
    justifyContent: 'space-between', 
    alignItems: 'center', 
    marginTop: 16, 
    paddingTop: 16, 
    borderTopWidth: 1 
  },
  subtotalLabel: { fontSize: 12, fontWeight: '600', color: '#94A3B8' },
  subtotalValue: { fontSize: 17, fontWeight: '800' },
  currencySmaller: { fontSize: 11, color: '#94A3B8' },

  /* Receipt style */
  receiptContainer: {
    backgroundColor: '#FFF',
    borderRadius: 28,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.08,
    shadowRadius: 20,
    elevation: 5,
  },
  receiptHeader: {
    backgroundColor: '#F8FAFC',
    padding: 16,
    alignItems: 'center',
    position: 'relative',
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
    borderStyle: 'dashed',
  },
  receiptTitle: { fontSize: 14, fontWeight: '800', color: '#64748B', letterSpacing: 0.5 },
  receiptCircleLeft: { position: 'absolute', left: -10, bottom: -10, width: 20, height: 20, borderRadius: 10, backgroundColor: '#F1F5F9' },
  receiptCircleRight: { position: 'absolute', right: -10, bottom: -10, width: 20, height: 20, borderRadius: 10, backgroundColor: '#F1F5F9' },
  
  receiptBody: { padding: 24, alignItems: 'flex-end' },
  receiptRow: { flexDirection: 'row-reverse', justifyContent: 'space-between', width: '100%', marginBottom: 12 },
  receiptLabel: { fontSize: 14, color: '#94A3B8', fontWeight: '600' },
  receiptValue: { fontSize: 14, color: '#1E293B', fontWeight: '700' },
  receiptDivider: { height: 1, backgroundColor: '#F1F5F9', width: '100%', marginVertical: 16 },
  
  receiptTotalRow: { flexDirection: 'row-reverse', justifyContent: 'space-between', width: '100%', alignItems: 'center' },
  receiptTotalLabel: { fontSize: 18, fontWeight: '800', color: '#1E293B' },
  totalAmountContainer: { flexDirection: 'row-reverse', alignItems: 'baseline' },
  receiptTotalValue: { fontSize: 32, fontWeight: '900' },
  receiptCurrency: { fontSize: 14, fontWeight: '700', marginRight: 4 },
  
  receiptFooter: {
    flexDirection: 'row-reverse',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 16,
    gap: 8,
  },
  footerText: { fontSize: 11, color: '#94A3B8', fontWeight: '600' },
  mapModalContainer: { flex: 1, backgroundColor: '#FFF' },
  mapHeader: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  mapTitle: { fontSize: 17, fontWeight: '800', color: '#1E293B' },
  closeMapBtn: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: '#F1F5F9',
    justifyContent: 'center',
    alignItems: 'center',
  },
  map: { flex: 1 },
  markerBubble: {
    padding: 8,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#FFF',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 5,
    elevation: 5,
  },
  mapFooter: {
    padding: 20,
    backgroundColor: '#F8FAFC',
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
    alignItems: 'center',
    gap: 12,
  },
  mapFooterText: { fontSize: 13, color: '#64748B', fontWeight: '600' },
  navigateBtn: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 24,
    paddingVertical: 14,
    borderRadius: 16,
    width: '100%',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  navigateBtnText: { color: '#FFF', fontSize: 15, fontWeight: '800' },
  
  workflowSection: { marginHorizontal: 20, marginBottom: 15 },
  sectionTitleSmall: { fontSize: 13, fontWeight: '700', color: '#64748B', marginBottom: 10, textAlign: 'right' },
  stepperContainer: { paddingRight: 5, paddingVertical: 5 },
  stepItem: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    paddingHorizontal: 15,
    paddingVertical: 10,
    backgroundColor: '#FFF',
    borderRadius: 16,
    marginRight: 10,
    borderWidth: 1,
    borderColor: '#F1F5F9',
    gap: 8,
  },
  stepIconCircle: { width: 20, height: 20, borderRadius: 10, justifyContent: 'center', alignItems: 'center' },
  stepNumberText: { fontSize: 10, fontWeight: '800', color: '#FFF' },
  stepLabelText: { fontSize: 12, fontWeight: '700', color: '#475569' },
  
  driverSection: { marginHorizontal: 20, marginBottom: 15, backgroundColor: '#FFF', borderRadius: 24, padding: 15, borderWidth: 1, borderColor: '#F1F5F9' },
  sectionHeaderLine: { flexDirection: 'row-reverse', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  sectionIconTitle: { flexDirection: 'row-reverse', alignItems: 'center', gap: 6 },
  unassignBtn: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8, backgroundColor: '#FEF2F2' },
  unassignBtnText: { fontSize: 11, fontWeight: '700', color: '#EF4444' },
  
  assignedDriverCard: { flexDirection: 'row-reverse', alignItems: 'center', gap: 12, backgroundColor: '#F8FAFC', padding: 12, borderRadius: 16 },
  driverAvatar: { width: 40, height: 40, borderRadius: 20, backgroundColor: '#3B82F6', justifyContent: 'center', alignItems: 'center' },
  driverLetter: { color: '#FFF', fontWeight: '800', fontSize: 16 },
  driverInfo: { flex: 1, alignItems: 'flex-end' },
  driverNameText: { fontSize: 14, fontWeight: '800', color: '#1E293B' },
  driverPhoneText: { fontSize: 12, color: '#64748B', fontWeight: '600' },
  driverCallBtn: { width: 36, height: 36, borderRadius: 18, backgroundColor: '#FFF', justifyContent: 'center', alignItems: 'center' },
  
  driverOption: { paddingHorizontal: 15, paddingVertical: 10, backgroundColor: '#F8FAFC', borderRadius: 12, marginRight: 8, alignItems: 'flex-end', minWidth: 120 },
  driverOptionName: { fontSize: 12, fontWeight: '700', color: '#1E293B' },
  driverOptionPhone: { fontSize: 10, color: '#64748B' },
  noDriversBox: { padding: 15, alignItems: 'center' },
  noDriversText: { fontSize: 12, color: '#94A3B8', fontWeight: '600' },
  warningBox: { flexDirection: 'row-reverse', alignItems: 'center', gap: 6, marginTop: 10, padding: 8, backgroundColor: '#FFFBEB', borderRadius: 8 },
  warningText: { fontSize: 11, color: '#D97706', fontWeight: '700' },

  quickAddBtn: { flexDirection: 'row-reverse', alignItems: 'center', gap: 4, paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8, backgroundColor: '#F0F9FF' },
  quickAddText: { fontSize: 11, fontWeight: '700' },

  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', padding: 20 },
  modalContainer: { backgroundColor: '#FFF', borderRadius: 24, maxHeight: '80%', overflow: 'hidden' },
  modalHeader: { flexDirection: 'row-reverse', justifyContent: 'space-between', alignItems: 'center', padding: 20, borderBottomWidth: 1, borderBottomColor: '#F1F5F9' },
  modalTitle: { fontSize: 18, fontWeight: '800', color: '#1E293B' },
  modalBody: { padding: 20 },
  inputGroup: { marginBottom: 16 },
  inputLabel: { fontSize: 13, fontWeight: '700', color: '#64748B', marginBottom: 8, textAlign: 'right' },
  input: { backgroundColor: '#F8FAFC', borderRadius: 12, padding: 12, borderWidth: 1, borderColor: '#E2E8F0', textAlign: 'right', fontSize: 14, color: '#1E293B' },
  submitBtn: { flexDirection: 'row-reverse', alignItems: 'center', justifyContent: 'center', gap: 8, padding: 16, borderRadius: 16, marginTop: 10 },
  submitBtnText: { color: '#FFF', fontSize: 15, fontWeight: '800' },
  hintText: { fontSize: 11, color: '#94A3B8', marginTop: 12, textAlign: 'center', lineHeight: 16 },
});

