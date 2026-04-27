import React, { useState, useEffect } from 'react';
import { View, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator, StatusBar, Image, Dimensions, Linking, Platform, Modal, Alert } from 'react-native';
import { Ionicons, Feather, MaterialCommunityIcons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { useAuth } from '../context/AuthContext';
import { useNotifications } from '../context/NotificationContext';
import MapView, { Marker, Polyline } from '../components/MapModule';
import client from '../api/client';
import { BRAND } from '../theme/brand';
import Logo from '../components/Logo';
import Text from '../components/AppText';
import TextInput from '../components/AppTextInput';

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

const DetailItem = ({ label, value, icon }) => (
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
  const { showNotification } = useNotifications();
  const [order, setOrder] = useState(null);

  const [loading, setLoading] = useState(true);
  const [showMap, setShowMap] = useState(false);
  const [routeCoordinates, setRouteCoordinates] = useState([]);
  const [showAddDriver, setShowAddDriver] = useState(false);
  const [isCreatingDriver, setIsCreatingDriver] = useState(false);
  const [newDriver, setNewDriver] = useState({ first_name: '', phone: '', username: '', password: '' });
  const [showReceiptViewer, setShowReceiptViewer] = useState(false);

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
    if (orderId && activeMerchant?.id) {
      client.get(`/merchant/orders/${orderId}/?merchant_id=${activeMerchant.id}`)
        .then(res => { if (res.data.success) setOrder(res.data.order); })
        .catch(err => console.error('Order detail error', err))
        .finally(() => setLoading(false));
    } else if (!orderId) {
       setLoading(false);
    }
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
        showNotification({ title: 'تم التحديث', message: 'تم تحديث حالة الطلب', type: 'success' });
      }
    } catch (e) {
      // Handled globally
    } finally {
      setLoading(false);
    }
  };

  const handleAddDriver = async () => {
    const { first_name, phone, username, password } = newDriver;
    if (!first_name || !phone || !username || !password) {
      showNotification({ title: 'تنبيه', message: 'يرجى ملء جميع الحقول المطلوبة', type: 'warning' });
      return;
    }

    try {
      setIsCreatingDriver(true);
      const res = await client.post('/merchant/drivers/', {
        merchant_id: activeMerchant?.id,
        ...newDriver
      });

      if (res.data.success) {
        showNotification({ 
          title: 'تم بنجاح', 
          message: 'تم إنشاء حساب السائق وإرسال البيانات عبر الواتساب', 
          type: 'success' 
        });
        setShowAddDriver(false);
        setNewDriver({ first_name: '', phone: '', username: '', password: '' });
        updateOrder({ driver_id: res.data.driver.id });
      }
    } catch (e) {
      // Handled globally
    } finally {
      setIsCreatingDriver(false);
    }
  };

  const handleVerifyPayment = async (txId) => {
    try {
      setLoading(true);
      const res = await client.post(`/merchant/verify-payment/`, {
        merchant_id: activeMerchant.id,
        transaction_id: txId,
        action: 'approve'
      });
      if (res.data.success) {
        showNotification({ title: 'نجاح', message: 'تم تأكيد استلام المبلغ', type: 'success' });
        setOrder(res.data.order);
      }
    } catch (e) {
      showNotification({ title: 'خطأ', message: 'فشل تحديث حالة الدفع', type: 'error' });
    } finally {
      setLoading(false);
    }
  };

  const handleRejectPayment = async (txId) => {
    Alert.prompt(
      "سبب الرفض",
      "يرجى إدخال سبب رفض الدفع (اختياري)",
      [
        { text: "إلغاء", style: "cancel" },
        {
          text: "رفض",
          style: "destructive",
          onPress: async (notes) => {
            try {
              setLoading(true);
              const res = await client.post(`/merchant/verify-payment/`, {
                merchant_id: activeMerchant.id,
                transaction_id: txId,
                action: 'reject',
                notes: notes
              });
              if (res.data.success) {
                showNotification({ title: 'تم', message: 'تم رفض إيصال الدفع', type: 'success' });
                setOrder(res.data.order);
              }
            } catch (e) {
              showNotification({ title: 'خطأ', message: 'فشل تحديث حالة الدفع', type: 'error' });
            } finally {
              setLoading(false);
            }
          }
        }
      ]
    );
  };

  const primaryColor = BRAND.colors.primary;
  const accentColor = BRAND.colors.gold;

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
  const curr = activeMerchant?.currency?.symbol || 'د.ك';

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" translucent backgroundColor="transparent" />
      
      <LinearGradient colors={BRAND.gradients.primary} style={styles.headerGradient}>
        <SafeAreaView edges={['top']} style={styles.safeHeader}>
          <View style={styles.headerContent}>
            <TouchableOpacity style={styles.headerBtn} onPress={() => navigation.goBack()}>
              <Feather name="arrow-right" size={24} color="#FFF" />
            </TouchableOpacity>
            
            <View style={styles.headerTitleGroup}>
              <Text style={styles.headerSubtitle}>إدارة الطلب</Text>
              <Text style={styles.headerTitleText}>#{order.id}</Text>
            </View>

            <View style={styles.headerActionGroup}>
              <TouchableOpacity style={styles.headerIconButton} onPress={() => Linking.openURL(`tel:${order.shipping?.phone}`)}>
                 <Feather name="phone" size={20} color="#FFF" />
              </TouchableOpacity>
              <Logo variant="circle" size={32} />
            </View>
          </View>
        </SafeAreaView>
      </LinearGradient>

      <ScrollView 
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* ── Quick Summary Stats ── */}
        <View style={styles.quickStatsRow}>
           <View style={styles.statCard}>
              <Text style={styles.statLabel}>إجمالي المبلغ</Text>
              <Text style={[styles.statValue, { color: primaryColor }]}>{parseFloat(order.total_amount).toLocaleString()} {curr}</Text>
           </View>
           <View style={styles.statCard}>
              <Text style={styles.statLabel}>عدد القطع</Text>
              <Text style={[styles.statValue, { color: BRAND.colors.secondary }]}>{order.items?.length || 0} قطع</Text>
           </View>
        </View>

        {/* ── High-Impact Status Section ── */}
        <View style={styles.statusCard}>
          <View style={[styles.statusIconBox, { backgroundColor: status.bg }]}>
            <MaterialCommunityIcons name={status.icon} size={32} color={status.text} />
          </View>
          <View style={styles.statusInfo}>
            <Text style={[styles.statusLabel, { color: status.text }]}>{status.label || order.status_name}</Text>
            <View style={styles.statusTimeRow}>
               <Feather name="clock" size={12} color="#94A3B8" />
               <Text style={styles.statusTime}>تحديث: {new Date(order.updated_at).toLocaleTimeString('ar-SA', { hour: '2-digit', minute: '2-digit' })}</Text>
            </View>
          </View>
          <View style={[styles.statusIndicator, { backgroundColor: status.text + '20' }]}>
             <View style={[styles.dot, { backgroundColor: status.text }]} />
             <Text style={[styles.badgeText, { color: status.text }]}>حالة نشطة</Text>
          </View>
        </View>

        {/* ── Interactive Workflow Stepper ── */}
        {order.workflow_steps?.length > 0 && (
          <View style={styles.workflowSection}>
            <View style={styles.workflowHeader}>
               <Text style={styles.sectionTitleSmall}>المسار الزمني للطلب</Text>
               <View style={styles.workflowBadge}>
                  <Text style={styles.workflowBadgeText}>المرحلة {order.current_priority} من {order.workflow_steps.length}</Text>
               </View>
            </View>
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
                  <View key={idx} style={styles.stepWrapper}>
                    <TouchableOpacity 
                      style={[
                        styles.stepItem, 
                        statusVariant === 'active' && { borderColor: primaryColor, backgroundColor: '#F0F9FF', elevation: 3 }
                      ]}
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
                        statusVariant === 'completed' && { backgroundColor: BRAND.colors.success },
                        statusVariant === 'active' && { backgroundColor: primaryColor },
                        statusVariant === 'pending' && { backgroundColor: BRAND.colors.slate[200] }
                      ]}>
                        {statusVariant === 'completed' ? (
                          <Ionicons name="checkmark" size={12} color="#FFF" />
                        ) : (
                          <Text style={styles.stepNumberText}>{idx + 1}</Text>
                        )}
                      </View>
                      <Text style={[styles.stepLabelText, statusVariant === 'active' && { color: primaryColor, fontFamily: BRAND.typography.extraBold }]}>
                        {step.name}
                      </Text>
                    </TouchableOpacity>
                    {idx < order.workflow_steps.length - 1 && (
                      <View style={[styles.stepConnector, statusVariant === 'completed' && { backgroundColor: BRAND.colors.success }]} />
                    )}
                  </View>
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
                  <View style={[styles.miniIconBox, { backgroundColor: BRAND.colors.secondary + '15' }]}>
                    <MaterialCommunityIcons name="moped" size={18} color={BRAND.colors.secondary} />
                  </View>
                  <Text style={styles.sectionTitleSmall}>السائق المسؤول</Text>
               </View>
               <View style={styles.driverActionsHeader}>
                 <TouchableOpacity 
                   onPress={() => setShowAddDriver(true)}
                   style={styles.quickAddBtn}
                 >
                    <Feather name="plus" size={14} color={primaryColor} />
                    <Text style={[styles.quickAddText, { color: primaryColor }]}>إضافة جديد</Text>
                 </TouchableOpacity>

                 {order.assigned_driver && (
                   <TouchableOpacity 
                     onPress={() => updateOrder({ driver_id: '' })}
                     style={styles.unassignBtn}
                   >
                      <Feather name="trash-2" size={12} color="#EF4444" />
                   </TouchableOpacity>
                 )}
               </View>
            </View>

            {order.assigned_driver ? (
               <View style={styles.assignedDriverCard}>
                  <View style={styles.driverMainInfo}>
                    <View style={[styles.driverAvatar, { backgroundColor: primaryColor + '10' }]}>
                       <Text style={[styles.driverLetter, { color: primaryColor }]}>{order.assigned_driver.name.charAt(0).toUpperCase()}</Text>
                    </View>
                    <View style={styles.driverInfo}>
                       <Text style={styles.driverNameText}>{order.assigned_driver.name}</Text>
                       <Text style={styles.driverStatusActive}>سائق نشط</Text>
                    </View>
                  </View>
                  <View style={styles.driverActions}>
                    <TouchableOpacity 
                      style={[styles.driverCircleBtn, { backgroundColor: '#F0FDF4' }]}
                      onPress={() => {
                        const ph = String(order.assigned_driver.phone).replace(/[^0-9]/g, '');
                        Linking.openURL(`https://wa.me/${ph}`);
                      }}
                    >
                       <MaterialCommunityIcons name="whatsapp" size={18} color="#16A34A" />
                    </TouchableOpacity>
                    <TouchableOpacity 
                      style={[styles.driverCircleBtn, { backgroundColor: '#F0F9FF' }]}
                      onPress={() => Linking.openURL(`tel:${order.assigned_driver.phone}`)}
                    >
                       <Feather name="phone" size={18} color={primaryColor} />
                    </TouchableOpacity>
                  </View>
               </View>
            ) : (
               <View style={styles.driverPickerWrapper}>
                  {order.available_drivers?.length > 0 ? (
                    <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ paddingVertical: 5 }}>
                       {order.available_drivers.map((drv, idx) => (
                         <TouchableOpacity 
                           key={idx} 
                           style={styles.driverOption}
                           onPress={() => updateOrder({ driver_id: drv.id })}
                         >
                            <View style={styles.drvOptIcon}>
                               <Feather name="user" size={12} color={BRAND.colors.slate[400]} />
                            </View>
                            <View>
                               <Text style={styles.driverOptionName}>{drv.name}</Text>
                               <Text style={styles.driverOptionPhone}>{drv.phone}</Text>
                            </View>
                         </TouchableOpacity>
                       ))}
                    </ScrollView>
                  ) : (
                    <View style={styles.noDriversBox}>
                       <Feather name="alert-circle" size={16} color={BRAND.colors.slate[300]} />
                       <Text style={styles.noDriversText}>لا يوجد سائقون متاحون حالياً في القائمة</Text>
                    </View>
                  )}
                  {order.current_requires_driver && (
                    <View style={styles.warningBox}>
                       <Feather name="info" size={14} color={BRAND.colors.warning} />
                       <Text style={styles.warningText}>يجب تعيين سائق لتتمكن من تحديث الحالة للمرحلة التالية</Text>
                    </View>
                  )}
               </View>
            )}
          </View>
        )}

        {/* ── Shipping Card Refined ── */}
        <View style={styles.premiumCard}>
          <View style={styles.cardHeader}>
             <Text style={styles.cardTitle}>بيانات العميل والشحن</Text>
             <View style={[styles.cardTag, { backgroundColor: primaryColor + '10' }]}>
                <Text style={[styles.cardTagText, { color: primaryColor }]}>شحن محلي</Text>
             </View>
          </View>
          
          <View style={styles.detailsGrid}>
            <View style={styles.detailRowPremium}>
               <View style={styles.detailItemPremium}>
                  <Text style={styles.premiumLabel}>الاسم</Text>
                  <Text style={styles.premiumValue}>{order.customer_name}</Text>
               </View>
               <View style={styles.detailItemPremium}>
                  <Text style={styles.premiumLabel}>التاريخ</Text>
                  <Text style={styles.premiumValue}>{new Date(order.created_at).toLocaleDateString('ar-SA')}</Text>
               </View>
            </View>

            {order.shipping && (
              <View style={styles.shippingInfoBox}>
                <View style={styles.shippingMainRow}>
                  <View style={styles.shippingAddress}>
                    <Text style={styles.premiumLabel}>العنوان</Text>
                    <Text style={styles.addressTextLarge}>
                      {order.shipping.city} — {[order.shipping.address_line1, order.shipping.address_line2].filter(Boolean).join(', ')}
                    </Text>
                  </View>
                  <TouchableOpacity style={styles.miniMapBtn} onPress={() => setShowMap(true)}>
                    <Feather name="map" size={18} color={primaryColor} />
                  </TouchableOpacity>
                </View>
                
                <View style={styles.actionButtonsRow}>
                   <TouchableOpacity 
                     style={[styles.bigActionBtn, { backgroundColor: BRAND.colors.success }]}
                     onPress={() => {
                        const ph = String(order.shipping.phone || '').replace(/[^0-9]/g, '');
                        if (ph) Linking.openURL(`https://wa.me/${ph}`);
                     }}
                   >
                     <MaterialCommunityIcons name="whatsapp" size={20} color="#FFF" />
                     <Text style={styles.bigActionText}>واتساب</Text>
                   </TouchableOpacity>

                   <TouchableOpacity 
                     style={[styles.bigActionBtn, { backgroundColor: primaryColor }]}
                     onPress={() => Linking.openURL(`tel:${order.shipping.phone}`)}
                   >
                     <Feather name="phone" size={18} color="#FFF" />
                     <Text style={styles.bigActionText}>اتصال</Text>
                   </TouchableOpacity>
                </View>
              </View>
            )}
          </View>
        </View>

        {/* ── Order Items Section ── */}
        <View style={styles.itemsSection}>
          <View style={styles.itemsHeader}>
            <Text style={styles.itemsTitle}>تفاصيل السلة</Text>
            <View style={[styles.itemsCountBadge, { backgroundColor: BRAND.colors.secondary }]}>
              <Text style={styles.itemsCountText}>{order.items?.length || 0} منتجات</Text>
            </View>
          </View>

          {(order.items || []).map((item, idx) => (
            <View key={idx} style={styles.premiumItemCard}>
              <View style={styles.itemMainRow}>
                <View style={styles.itemImageWrap}>
                   <Image source={{ uri: item.product_image }} style={styles.itemImage} />
                   <View style={styles.itemQtyOverlay}>
                      <Text style={styles.itemQtyOverlayText}>×{item.quantity}</Text>
                   </View>
                </View>
                <View style={styles.itemCoreInfo}>
                  <Text style={styles.itemName} numberOfLines={2}>{item.product_name}</Text>
                  
                  {item.selected_options_details?.length > 0 && (
                    <View style={styles.itemOptionsRow}>
                      {item.selected_options_details.map((opt) => (
                        <View key={opt.id} style={styles.variationBadge}>
                          <Text style={styles.variationText}>{opt.attribute_name}: {opt.value}</Text>
                        </View>
                      ))}
                    </View>
                  )}

                  <View style={styles.itemPricingRow}>
                    <Text style={styles.itemUnitPrice}>{parseFloat(item.unit_price).toLocaleString()} {curr}</Text>
                    <Text style={[styles.itemTotalPrice, { color: primaryColor }]}>
                      {(parseFloat(item.unit_price) * item.quantity).toLocaleString()} {curr}
                    </Text>
                  </View>
                </View>
              </View>
            </View>
          ))}
        </View>
        
        {/* ── Payment Section Refined ── */}
        {order.payment_transaction && (
          <View style={styles.premiumCard}>
            <View style={styles.cardHeader}>
               <Text style={styles.cardTitle}>عملية الدفع</Text>
               <View style={[
                  styles.statusBadgeSmall, 
                  order.payment_transaction.status === 'verified' ? { backgroundColor: '#ECFDF5' } : { backgroundColor: '#FFF7ED' }
               ]}>
                 <Text style={[
                   styles.statusBadgeTextSmall,
                   { color: order.payment_transaction.status === 'verified' ? BRAND.colors.success : BRAND.colors.warning }
                 ]}>
                   {order.payment_transaction.status_display}
                 </Text>
               </View>
            </View>

            <View style={styles.paymentDetailRow}>
               <View style={styles.payMethodBox}>
                  <View style={[styles.payMethodIcon, { backgroundColor: primaryColor + '10' }]}>
                    <Feather name="credit-card" size={16} color={primaryColor} />
                  </View>
                  <Text style={styles.payMethodName}>{order.payment_transaction.method_name}</Text>
               </View>
               <Text style={styles.payAmountText}>{parseFloat(order.total_amount).toLocaleString()} {curr}</Text>
            </View>

            {order.payment_transaction.receipt && (
              <View style={styles.receiptActionBox}>
                <TouchableOpacity 
                   onPress={() => setShowReceiptViewer(true)}
                   style={styles.viewReceiptBar}
                >
                  <Feather name="file-text" size={16} color={primaryColor} />
                  <Text style={[styles.viewReceiptText, { color: primaryColor }]}>عرض إيصال السداد المرفق</Text>
                  <Feather name="chevron-left" size={16} color={primaryColor} />
                </TouchableOpacity>
              </View>
            )}

            {order.payment_transaction.status === 'pending' && (
              <View style={styles.paymentActionButtons}>
                <TouchableOpacity 
                   style={[styles.verifyPayBtn, { backgroundColor: BRAND.colors.success }]} 
                   onPress={() => handleVerifyPayment(order.payment_transaction.id)}
                >
                  <Feather name="check-circle" size={18} color="#FFF" />
                  <Text style={styles.verifyPayBtnText}>تأكيد الدفع</Text>
                </TouchableOpacity>
                <TouchableOpacity 
                   style={styles.rejectPayBtn} 
                   onPress={() => handleRejectPayment(order.payment_transaction.id)}
                >
                  <Text style={styles.rejectPayBtnText}>رفض</Text>
                </TouchableOpacity>
              </View>
            )}
          </View>
        )}

        {/* ── Bill Summary ── */}
        <View style={styles.premiumReceiptContainer}>
          <View style={styles.receiptTopper}>
             <View style={styles.receiptNotch} />
             <Text style={styles.receiptMainTitle}>ملخص الحساب</Text>
          </View>
          
          <View style={styles.receiptContent}>
            <View style={styles.receiptLine}>
              <Text style={styles.receiptLabel}>إجمالي المنتجات</Text>
              <Text style={styles.receiptValue}>{parseFloat(order.total_amount).toLocaleString()} {curr}</Text>
            </View>
            <View style={styles.receiptLine}>
              <Text style={styles.receiptLabel}>رسوم التوصيل</Text>
              <Text style={styles.receiptValue}>0.00 {curr}</Text>
            </View>
            
            <View style={styles.receiptDashDivider} />
            
            <View style={styles.receiptGrandTotal}>
              <Text style={styles.grandTotalLabel}>المبلغ المطلوب</Text>
              <Text style={[styles.grandTotalValue, { color: primaryColor }]}>
                {parseFloat(order.total_amount).toLocaleString()} {curr}
              </Text>
            </View>
          </View>
          
          <View style={styles.receiptSecurityFooter}>
            <Feather name="shield" size={12} color={BRAND.colors.slate[400]} />
            <Text style={styles.securityText}>معاملة آمنة - نظام رواج التجاري</Text>
          </View>
        </View>

        <View style={{ height: 100 }} />
      </ScrollView>

      {/* ── Modals & Overlay (Map, Driver Add) ── */}
      <Modal visible={showMap} animationType="slide" onRequestClose={() => setShowMap(false)}>
        <SafeAreaView style={styles.mapModalContainer}>
          <View style={styles.mapHeader}>
            <TouchableOpacity style={styles.closeMapBtn} onPress={() => setShowMap(false)}>
              <Ionicons name="close" size={24} color="#1E293B" />
            </TouchableOpacity>
            <Text style={styles.mapTitle}>موقع الشحن</Text>
            <View style={{ width: 44 }} />
          </View>
          <MapView style={styles.map} initialRegion={{ latitude: parseFloat(order.merchant?.latitude) || 15.3694, longitude: parseFloat(order.merchant?.longitude) || 44.1910, latitudeDelta: 0.05, longitudeDelta: 0.05 }}>
            {order.merchant?.latitude && (
              <Marker coordinate={{ latitude: parseFloat(order.merchant.latitude), longitude: parseFloat(order.merchant.longitude) }} title="المتجر">
                <View style={[styles.markerPin, { backgroundColor: primaryColor }]}>
                  <Feather name="shopping-bag" size={14} color="#FFF" />
                </View>
              </Marker>
            )}
            {order.shipping?.latitude && (
              <Marker coordinate={{ latitude: parseFloat(order.shipping.latitude), longitude: parseFloat(order.shipping.longitude) }} title="العميل">
                <View style={[styles.markerPin, { backgroundColor: BRAND.colors.danger }]}>
                  <Feather name="user" size={14} color="#FFF" />
                </View>
              </Marker>
            )}
            {order.merchant?.latitude && order.shipping?.latitude && (
               <Polyline coordinates={routeCoordinates.length > 0 ? routeCoordinates : [{ latitude: parseFloat(order.merchant.latitude), longitude: parseFloat(order.merchant.longitude) }, { latitude: parseFloat(order.shipping.latitude), longitude: parseFloat(order.shipping.longitude) }]} strokeColor={primaryColor} strokeWidth={4} />
            )}
          </MapView>
          <View style={styles.mapFooter}>
             <TouchableOpacity style={[styles.navBtn, { backgroundColor: primaryColor }]} onPress={() => { const url = Platform.OS === 'ios' ? `maps:${order.shipping.latitude},${order.shipping.longitude}` : `geo:${order.shipping.latitude},${order.shipping.longitude}?q=${order.shipping.latitude},${order.shipping.longitude}`; Linking.openURL(url); }}>
                <Feather name="navigation" size={18} color="#FFF" />
                <Text style={styles.navBtnText}>فتح في الخرائط</Text>
             </TouchableOpacity>
          </View>
        </SafeAreaView>
      </Modal>

      {/* Quick Driver Modal */}
      {/* ── Receipt Viewer Modal ── */}
      <Modal visible={showReceiptViewer} transparent animationType="fade" onRequestClose={() => setShowReceiptViewer(false)}>
        <View style={styles.viewerOverlay}>
          <SafeAreaView style={styles.viewerContent}>
            <View style={styles.viewerHeader}>
              <TouchableOpacity style={styles.viewerCloseBtn} onPress={() => setShowReceiptViewer(false)}>
                <Ionicons name="close" size={28} color="#FFF" />
              </TouchableOpacity>
              <Text style={styles.viewerTitle}>إيصال السداد</Text>
              <Logo variant="circle" size={32} />
            </View>
            
            <View style={styles.viewerImageContainer}>
               <Image 
                 source={{ uri: order.payment_transaction?.receipt }} 
                 style={styles.fullReceiptImage}
                 resizeMode="contain"
               />
            </View>

            <View style={styles.viewerFooter}>
               <Text style={styles.viewerFooterText}>بإمكانك أخذ لقطة شاشة للاحتفاظ بالإيصال</Text>
            </View>
          </SafeAreaView>
        </View>
      </Modal>

      <Modal visible={showAddDriver} transparent animationType="fade" onRequestClose={() => setShowAddDriver(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>سائق جديد</Text>
              <TouchableOpacity onPress={() => setShowAddDriver(false)}><Feather name="x" size={24} color="#64748B" /></TouchableOpacity>
            </View>
            <ScrollView contentContainerStyle={styles.modalScroll}>
              {['الاسم الأول', 'رقم الهاتف', 'اسم المستخدم', 'كلمة المرور'].map((label, i) => {
                const keys = ['first_name', 'phone', 'username', 'password'];
                return (
                  <View key={i} style={styles.inputGroup}>
                    <Text style={styles.inputLabel}>{label}</Text>
                    <TextInput style={styles.input} secureTextEntry={i === 3} keyboardType={i === 1 ? 'phone-pad' : 'default'} value={newDriver[keys[i]]} onChangeText={(t) => setNewDriver({...newDriver, [keys[i]]: t})} />
                  </View>
                )
              })}
              <TouchableOpacity style={[styles.modalSubmit, { backgroundColor: primaryColor }]} onPress={handleAddDriver} disabled={isCreatingDriver}>
                {isCreatingDriver ? <ActivityIndicator color="#FFF" /> : <Text style={styles.modalSubmitText}>إنشاء وتعيين</Text>}
              </TouchableOpacity>
            </ScrollView>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F8FAFC' },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  loadingText: { marginTop: 12, color: '#64748B', fontSize: 14 },

  headerGradient: { borderBottomLeftRadius: 35, borderBottomRightRadius: 35, paddingBottom: 25 },
  safeHeader: { paddingTop: Platform.OS === 'android' ? StatusBar.currentHeight : 0 },
  headerContent: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, height: 70 },
  headerBtn: { width: 44, height: 44, justifyContent: 'center', alignItems: 'center' },
  headerTitleGroup: { flex: 1, alignItems: 'flex-start' },
  headerSubtitle: { color: 'rgba(255,255,255,0.7)', fontSize: 13 },
  headerTitleText: { color: '#FFF', fontSize: 24, fontFamily: BRAND.typography.bold },
  headerActionGroup: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  headerIconButton: { width: 40, height: 40, borderRadius: 20, backgroundColor: 'rgba(255,255,255,0.15)', justifyContent: 'center', alignItems: 'center' },
  merchantMiniBox: { width: 44, height: 44, borderRadius: 22, backgroundColor: 'rgba(255,255,255,0.2)', justifyContent: 'center', alignItems: 'center', overflow: 'hidden' },
  merchantLogo: { width: '100%', height: '100%' },
  merchantLogoPlaceholder: { width: '100%', height: '100%', justifyContent: 'center', alignItems: 'center' },

  scrollContent: { paddingHorizontal: 16, paddingTop: 20 },
  
  quickStatsRow: { flexDirection: 'row', gap: 12, marginBottom: 20 },
  statCard: { flex: 1, backgroundColor: '#FFF', padding: 16, borderRadius: 20, borderWidth: 1, borderColor: '#F1F5F9', elevation: 2 },
  hintText: { fontSize: 11, color: '#94A3B8', textAlign: 'center', marginTop: 8 },
  
  viewerOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.9)' },
  viewerContent: { flex: 1 },
  viewerHeader: { height: 60, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20 },
  viewerCloseBtn: { width: 44, height: 44, justifyContent: 'center', alignItems: 'center' },
  viewerTitle: { color: '#FFF', fontSize: 18, fontFamily: BRAND.typography.bold },
  viewerImageContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 20 },
  fullReceiptImage: { width: '100%', height: '100%', borderRadius: 12 },
  viewerFooter: { padding: 20, alignItems: 'center' },
  viewerFooterText: { color: 'rgba(255,255,255,0.5)', fontSize: 12 },
  
  statLabel: { fontSize: 12, color: '#94A3B8', marginBottom: 4 },
  statValue: { fontSize: 18, fontFamily: BRAND.typography.bold },

  statusCard: {
    backgroundColor: '#FFF', borderRadius: 24, padding: 18, flexDirection: 'row', alignItems: 'center',
    marginBottom: 20, borderWidth: 1, borderColor: '#F1F5F9', elevation: 3
  },
  statusIconBox: { width: 56, height: 56, borderRadius: 18, justifyContent: 'center', alignItems: 'center' },
  statusInfo: { flex: 1, marginLeft: 16 },
  statusLabel: { fontSize: 17, fontFamily: BRAND.typography.bold },
  statusTimeRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 4 },
  statusTime: { fontSize: 12, color: '#94A3B8' },
  statusIndicator: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 10 },
  dot: { width: 6, height: 6, borderRadius: 3, marginRight: 6 },
  badgeText: { fontSize: 10, fontFamily: BRAND.typography.bold },

  workflowSection: { marginBottom: 24 },
  workflowHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  sectionTitleSmall: { fontSize: 14, fontFamily: BRAND.typography.bold, color: '#1E293B' },
  workflowBadge: { backgroundColor: '#F1F5F9', paddingHorizontal: 10, paddingVertical: 3, borderRadius: 8 },
  workflowBadgeText: { fontSize: 10, fontFamily: BRAND.typography.bold, color: '#64748B' },
  stepperContainer: { paddingVertical: 8 },
  stepWrapper: { flexDirection: 'row', alignItems: 'center' },
  stepItem: {
    backgroundColor: '#FFF', paddingHorizontal: 14, paddingVertical: 10, borderRadius: 16,
    borderWidth: 1, borderColor: '#F1F5F9', flexDirection: 'row', alignItems: 'center', gap: 10
  },
  stepIconCircle: { width: 22, height: 22, borderRadius: 11, justifyContent: 'center', alignItems: 'center' },
  stepNumberText: { color: '#FFF', fontSize: 10, fontFamily: BRAND.typography.bold },
  stepLabelText: { fontSize: 13, color: '#64748B' },
  stepConnector: { width: 25, height: 2, backgroundColor: '#E2E8F0', marginHorizontal: 2 },

  driverSection: { marginBottom: 24 },
  sectionHeaderLine: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  sectionIconTitle: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  miniIconBox: { width: 32, height: 32, borderRadius: 8, justifyContent: 'center', alignItems: 'center' },
  driverActionsHeader: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  quickAddBtn: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: '#FFF', paddingHorizontal: 10, paddingVertical: 6, borderRadius: 12, borderWidth: 1, borderColor: '#E2E8F0' },
  quickAddText: { fontSize: 11, fontFamily: BRAND.typography.bold },
  unassignBtn: { width: 32, height: 32, borderRadius: 10, backgroundColor: '#FEF2F2', justifyContent: 'center', alignItems: 'center' },
  assignedDriverCard: { backgroundColor: '#FFF', borderRadius: 20, padding: 14, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', borderWidth: 1, borderColor: '#F1F5F9' },
  driverMainInfo: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  driverAvatar: { width: 44, height: 44, borderRadius: 22, justifyContent: 'center', alignItems: 'center' },
  driverLetter: { fontSize: 18, fontFamily: BRAND.typography.bold },
  driverInfo: { gap: 2 },
  driverNameText: { fontSize: 15, fontFamily: BRAND.typography.bold, color: '#1E293B' },
  driverStatusActive: { fontSize: 11, color: '#16A34A', fontFamily: BRAND.typography.semiBold },
  driverActions: { flexDirection: 'row', gap: 10 },
  driverCircleBtn: { width: 38, height: 38, borderRadius: 19, justifyContent: 'center', alignItems: 'center' },

  driverPickerWrapper: { gap: 10 },
  driverOption: { backgroundColor: '#FFF', padding: 12, borderRadius: 16, flexDirection: 'row', alignItems: 'center', gap: 10, borderWidth: 1, borderColor: '#F1F5F9', marginRight: 8 },
  drvOptIcon: { width: 24, height: 24, borderRadius: 12, backgroundColor: '#F8FAFC', justifyContent: 'center', alignItems: 'center' },
  driverOptionName: { fontSize: 13, fontFamily: BRAND.typography.bold, color: '#1E293B' },
  driverOptionPhone: { fontSize: 11, color: '#94A3B8' },
  noDriversBox: { backgroundColor: '#F8FAFC', padding: 20, borderRadius: 18, alignItems: 'center', borderStyle: 'dashed', borderWidth: 1, borderColor: '#E2E8F0', flexDirection: 'row', justifyContent: 'center', gap: 10 },
  noDriversText: { fontSize: 13, color: '#94A3B8' },
  warningBox: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: '#FFF7ED', padding: 10, borderRadius: 10 },
  warningText: { fontSize: 11, color: '#C2410C', flex: 1 },

  premiumCard: { backgroundColor: '#FFF', borderRadius: 24, padding: 20, marginBottom: 20, borderWidth: 1, borderColor: '#F1F5F9', elevation: 2 },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
  cardTitle: { fontSize: 16, fontFamily: BRAND.typography.bold, color: '#1E293B' },
  cardTag: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8 },
  cardTagText: { fontSize: 10, fontFamily: BRAND.typography.bold },
  
  detailRowPremium: { flexDirection: 'row', gap: 20, marginBottom: 16 },
  detailItemPremium: { flex: 1 },
  premiumLabel: { fontSize: 11, color: '#94A3B8', marginBottom: 4 },
  premiumValue: { fontSize: 15, fontFamily: BRAND.typography.bold, color: '#1E293B' },
  
  shippingInfoBox: { gap: 16 },
  shippingMainRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  shippingAddress: { flex: 1 },
  addressTextLarge: { fontSize: 14, color: '#475569', lineHeight: 22 },
  miniMapBtn: { width: 40, height: 40, borderRadius: 12, backgroundColor: '#F0F9FF', justifyContent: 'center', alignItems: 'center' },
  actionButtonsRow: { flexDirection: 'row', gap: 12 },
  bigActionBtn: { flex: 1, height: 48, borderRadius: 14, flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 10 },
  bigActionText: { color: '#FFF', fontSize: 14, fontFamily: BRAND.typography.bold },

  itemsSection: { marginBottom: 24 },
  itemsHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
  itemsTitle: { fontSize: 16, fontFamily: BRAND.typography.bold, color: '#1E293B' },
  itemsCountBadge: { paddingHorizontal: 12, paddingVertical: 4, borderRadius: 12 },
  itemsCountText: { color: '#FFF', fontSize: 11, fontFamily: BRAND.typography.bold },
  premiumItemCard: { backgroundColor: '#FFF', borderRadius: 20, padding: 14, marginBottom: 12, borderWidth: 1, borderColor: '#F1F5F9' },
  itemImageWrap: { width: 70, height: 70, borderRadius: 16, overflow: 'hidden' },
  itemImage: { width: '100%', height: '100%' },
  itemQtyOverlay: { position: 'absolute', bottom: 0, right: 0, backgroundColor: 'rgba(0,0,0,0.6)', paddingHorizontal: 6, paddingVertical: 2, borderTopLeftRadius: 8 },
  itemQtyOverlayText: { color: '#FFF', fontSize: 10, fontFamily: BRAND.typography.bold },
  itemCoreInfo: { flex: 1, marginLeft: 14 },
  itemName: { fontSize: 14, fontFamily: BRAND.typography.bold, color: '#1E293B', marginBottom: 4 },
  itemOptionsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 4, marginBottom: 8 },
  variationBadge: { backgroundColor: '#F8FAFC', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 5, borderWidth: 1, borderColor: '#F1F5F9' },
  variationText: { fontSize: 9, color: '#64748B' },
  itemPricingRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  itemUnitPrice: { fontSize: 12, color: '#94A3B8' },
  itemTotalPrice: { fontSize: 15, fontFamily: BRAND.typography.bold },

  paymentDetailRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: '#F8FAFC' },
  payMethodBox: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  payMethodIcon: { width: 32, height: 32, borderRadius: 8, justifyContent: 'center', alignItems: 'center' },
  payMethodName: { fontSize: 14, fontFamily: BRAND.typography.bold, color: '#1E293B' },
  payAmountText: { fontSize: 15, fontFamily: BRAND.typography.bold, color: '#1E293B' },
  statusBadgeSmall: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6 },
  statusBadgeTextSmall: { fontSize: 10, fontFamily: BRAND.typography.bold },
  receiptActionBox: { marginTop: 12 },
  viewReceiptBar: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: '#F0F9FF', padding: 12, borderRadius: 12 },
  viewReceiptText: { flex: 1, fontSize: 13, fontFamily: BRAND.typography.bold },
  paymentActionButtons: { flexDirection: 'row', gap: 10, marginTop: 16 },
  verifyPayBtn: { flex: 1, height: 48, borderRadius: 14, flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 8 },
  verifyPayBtnText: { color: '#FFF', fontSize: 14, fontFamily: BRAND.typography.bold },
  rejectPayBtn: { width: 80, height: 48, borderRadius: 14, justifyContent: 'center', alignItems: 'center', backgroundColor: '#F8FAFC', borderWidth: 1, borderColor: '#E2E8F0' },
  rejectPayBtnText: { color: '#EF4444', fontSize: 13, fontFamily: BRAND.typography.bold },

  premiumReceiptContainer: { backgroundColor: '#FFF', borderRadius: 24, overflow: 'hidden', borderWidth: 1, borderColor: '#F1F5F9', elevation: 4 },
  receiptTopper: { height: 50, backgroundColor: '#F8FAFC', justifyContent: 'center', alignItems: 'center', borderBottomWidth: 1, borderBottomColor: '#E2E8F0' },
  receiptNotch: { position: 'absolute', top: -10, width: 60, height: 20, backgroundColor: '#F8FAFC', borderRadius: 10 },
  receiptMainTitle: { fontSize: 15, fontFamily: BRAND.typography.bold, color: '#1E293B' },
  receiptContent: { padding: 20 },
  receiptLine: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 12 },
  receiptLabel: { fontSize: 13, color: '#94A3B8' },
  receiptValue: { fontSize: 14, fontFamily: BRAND.typography.semiBold, color: '#1E293B' },
  receiptDashDivider: { height: 1, backgroundColor: '#E2E8F0', marginVertical: 15, borderStyle: 'dashed' },
  receiptGrandTotal: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  grandTotalLabel: { fontSize: 16, fontFamily: BRAND.typography.bold, color: '#1E293B' },
  grandTotalValue: { fontSize: 22, fontFamily: BRAND.typography.extraBold },
  receiptSecurityFooter: { padding: 12, backgroundColor: '#F8FAFC', flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 6 },
  securityText: { fontSize: 10, color: '#94A3B8' },

  mapModalContainer: { flex: 1, backgroundColor: '#FFF' },
  mapHeader: { height: 60, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, borderBottomWidth: 1, borderBottomColor: '#F1F5F9' },
  mapTitle: { fontSize: 18, fontFamily: BRAND.typography.bold, color: '#1E293B' },
  map: { flex: 1 },
  mapFooter: { padding: 20, backgroundColor: '#FFF' },
  navBtn: { height: 56, borderRadius: 16, flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 12 },
  navBtnText: { color: '#FFF', fontSize: 16, fontFamily: BRAND.typography.bold },
  markerPin: { width: 32, height: 32, borderRadius: 16, justifyContent: 'center', alignItems: 'center', borderWidth: 2, borderColor: '#FFF', elevation: 5 },

  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'center', padding: 20 },
  modalContent: { backgroundColor: '#FFF', borderRadius: 28, padding: 20, maxHeight: '85%' },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
  modalTitle: { fontSize: 20, fontFamily: BRAND.typography.bold, color: '#1E293B' },
  modalScroll: { gap: 16 },
  inputGroup: { gap: 8 },
  inputLabel: { fontSize: 14, fontFamily: BRAND.typography.semiBold, color: '#64748B' },
  input: { backgroundColor: '#F8FAFC', height: 50, borderRadius: 12, paddingHorizontal: 16, borderWidth: 1, borderColor: '#E2E8F0', textAlign: 'auto' },
  modalSubmit: { height: 56, borderRadius: 16, justifyContent: 'center', alignItems: 'center', marginTop: 10 },
  modalSubmitText: { color: '#FFF', fontSize: 16, fontFamily: BRAND.typography.bold },
});
