import React, { useState, useEffect, useRef } from 'react';
import { View, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator, Alert, Platform, Image, Animated, Dimensions, StatusBar, Clipboard } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Feather, MaterialCommunityIcons, Ionicons } from '@expo/vector-icons';
import { BlurView } from 'expo-blur';
import { LinearGradient } from 'expo-linear-gradient';
import { useNavigation } from '@react-navigation/native';
import { useAuth } from '../context/AuthContext';
import { useNotifications } from '../context/NotificationContext';
import client from '../api/client';
import Logo from '../components/Logo';
import { BRAND } from '../theme/brand';
import PremiumInput from '../components/profile/PremiumInput';
import Text from '../components/AppText';
import TextInput from '../components/AppTextInput';

const { width, height } = Dimensions.get('window');

const MethodCard = ({ item, onToggle, onDelete, pColor, index }) => {
  const animatedScale = useRef(new Animated.Value(0.95)).current;
  const animatedOpacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.spring(animatedScale, {
        toValue: 1,
        tension: 50,
        friction: 7,
        useNativeDriver: true,
        delay: index * 100
      }),
      Animated.timing(animatedOpacity, {
        toValue: 1,
        duration: 400,
        useNativeDriver: true,
        delay: index * 100
      })
    ]).start();
  }, []);

  const copyToClipboard = () => {
    Clipboard.setString(item.account_field_value);
  };

  return (
    <Animated.View style={[styles.methodCard, { transform: [{ scale: animatedScale }], opacity: animatedOpacity }]}>
      <View style={styles.methodTop}>
        <View style={styles.methodInfo}>
          <View style={styles.methodLogoContainer}>
            {item.method_logo ? (
              <Image source={{ uri: item.method_logo }} style={styles.methodLogo} />
            ) : (
              <MaterialCommunityIcons name="bank" size={24} color={pColor} />
            )}
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.methodNameText}>{item.method_name}</Text>
            <View style={styles.statusRow}>
              <View style={[styles.statusDot, { backgroundColor: item.is_active ? BRAND.colors.success : BRAND.colors.slate[300] }]} />
              <Text style={styles.statusText}>{item.is_active ? 'نشط ويظهر للعملاء' : 'معطل مؤقتاً'}</Text>
            </View>
          </View>
        </View>
        
        <View style={styles.methodActions}>
          <TouchableOpacity 
            style={[styles.actionBtn, { backgroundColor: item.is_active ? BRAND.colors.success + '15' : BRAND.colors.slate[100] }]} 
            onPress={() => onToggle(item)}
            activeOpacity={0.7}
          >
            <Feather name={item.is_active ? "eye" : "eye-off"} size={18} color={item.is_active ? BRAND.colors.success : BRAND.colors.slate[400]} />
          </TouchableOpacity>
          <TouchableOpacity 
            style={styles.actionBtnDelete} 
            onPress={() => onDelete(item)}
            activeOpacity={0.7}
          >
            <Feather name="trash-2" size={18} color={BRAND.colors.danger} />
          </TouchableOpacity>
        </View>
      </View>
      
      <TouchableOpacity 
        style={styles.methodDataBox} 
        activeOpacity={0.8}
        onPress={copyToClipboard}
      >
        <View style={{ flex: 1 }}>
            <View style={styles.dataLabelRow}>
                <Text style={styles.dataLabel}>{item.account_field_name}</Text>
                <Feather name="copy" size={12} color={BRAND.colors.slate[400]} />
            </View>
            <Text style={styles.dataValue}>{item.account_field_value}</Text>
        </View>
        <LinearGradient 
            colors={[BRAND.colors.accent, BRAND.colors.secondary]} 
            style={styles.dataAccentLine} 
        />
      </TouchableOpacity>
    </Animated.View>
  );
};

export default function MerchantPaymentSettingsScreen() {
  const navigation = useNavigation();
  const { activeMerchant } = useAuth();
  const { showNotification } = useNotifications();
  
  const pColor = activeMerchant?.primary_color || BRAND.colors.primary;

  const [loading, setLoading] = useState(true);
  const [globalMethods, setGlobalMethods] = useState([]);
  const [merchantMethods, setMerchantMethods] = useState([]);
  const [showAddModal, setShowAddModal] = useState(false);
  const [selectedGlobalMethod, setSelectedGlobalMethod] = useState(null);
  const [accountValue, setAccountValue] = useState('');
  const [fieldName, setFieldName] = useState('رقم الحساب');
  const [saving, setSaving] = useState(false);

  // Animations
  const scrollY = useRef(new Animated.Value(0)).current;
  const fadeAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    fetchData();
  }, []);

  useEffect(() => {
    if (!loading) {
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 800,
        useNativeDriver: true,
      }).start();
    }
  }, [loading]);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [globalsRes, merchantRes] = await Promise.all([
        client.get('/payment-methods/'),
        client.get(`/merchant/payment-settings/?merchant_id=${activeMerchant?.id}`)
      ]);
      const globals = globalsRes.data.results || globalsRes.data;
      setGlobalMethods(globals.filter(m => m.name.toLowerCase() !== 'cash on delivery' && m.is_active));
      setMerchantMethods(merchantRes.data.results || merchantRes.data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleAddMethod = async () => {
    if (!selectedGlobalMethod || !accountValue) {
      showNotification({ title: 'تنبيه', message: 'يرجى إدخال رقم الحساب/المحفظة', type: 'warning' });
      return;
    }

    setSaving(true);
    try {
      const res = await client.post('/merchant/payment-settings/', {
        merchant_id: activeMerchant.id,
        payment_method: selectedGlobalMethod.id,
        account_field_name: fieldName,
        account_field_value: accountValue,
        is_active: true
      });
      if (res.data) {
        showNotification({ title: 'تمت الإضافة', message: 'تم تفعيل وسيلة الدفع بنجاح', type: 'success' });
        setShowAddModal(false);
        setAccountValue('');
        setSelectedGlobalMethod(null);
        fetchData();
      }
    } catch (err) {
      console.error(err);
    } finally {
      setSaving(false);
    }
  };

  const toggleMethodStatus = async (method) => {
    try {
      const nextStatus = !method.is_active;
      const res = await client.patch(`/merchant/payment-settings/${method.id}/`, {
        is_active: nextStatus
      });
      if (res.data) {
          setMerchantMethods(prev => prev.map(m => m.id === method.id ? { ...m, is_active: nextStatus } : m));
          showNotification({ 
            title: nextStatus ? 'تم التفعيل' : 'تم التعطيل', 
            message: nextStatus ? 'الوسيلة الآن متاحة لعملائك' : 'الوسيلة لم تعد تظهر في المتجر',
            type: 'success' 
          });
      }
    } catch (err) {
      showNotification({ title: 'خطأ', message: 'فشل في تحديث الحالة', type: 'error' });
    }
  };

  const deleteMethod = (method) => {
    Alert.alert(
      'حذف وسيلة الدفع',
      `هل أنت متأكد من حذف ${method.method_name} من متجرك؟`,
      [
        { text: 'إلغاء', style: 'cancel' },
        { 
          text: 'حذف نهائي', 
          style: 'destructive', 
          onPress: async () => {
            try {
              await client.delete(`/merchant/payment-settings/${method.id}/`);
              setMerchantMethods(prev => prev.filter(m => m.id !== method.id));
              showNotification({ title: 'تم الحذف', message: 'تم حذف وسيلة الدفع', type: 'success' });
            } catch (err) {
              showNotification({ title: 'خطأ', message: 'فشل في الحذف', type: 'error' });
            }
          }
        }
      ]
    );
  };

  const headerOpacity = scrollY.interpolate({
    inputRange: [60, 120],
    outputRange: [0, 1],
    extrapolate: 'clamp',
  });

  if (loading) {
    return (
      <View style={[styles.root, { justifyContent: 'center', alignItems: 'center' }]}>
        <ActivityIndicator size="large" color={pColor} />
      </View>
    );
  }

  return (
    <View style={styles.root}>
      <StatusBar barStyle="light-content" translucent backgroundColor="transparent" />

      {/* Floating Header */}
      <View style={styles.header}>
        <Animated.View style={[StyleSheet.absoluteFill, { opacity: headerOpacity }]}>
          <BlurView intensity={Platform.OS === 'ios' ? 60 : 100} tint="dark" style={StyleSheet.absoluteFill} />
          <LinearGradient colors={BRAND.gradients.primary} style={[StyleSheet.absoluteFill, { opacity: 0.92 }]} />
        </Animated.View>
        
        <SafeAreaView edges={['top']} style={styles.headerSafe}>
          <View style={styles.headerContent}>
            <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn} activeOpacity={0.7}>
              <Feather name="arrow-right" size={24} color="#FFF" />
            </TouchableOpacity>
            <Animated.Text style={[styles.headerTitle, { opacity: headerOpacity }]} numberOfLines={1}>
                إعدادات الدفع الرقمي
            </Animated.Text>
            <Logo variant="circle" size={32} />
          </View>
        </SafeAreaView>
      </View>

      <Animated.ScrollView 
        contentContainerStyle={[styles.scroll, { opacity: fadeAnim }]} 
        showsVerticalScrollIndicator={false}
        onScroll={Animated.event([{ nativeEvent: { contentOffset: { y: scrollY } } }], { useNativeDriver: false })}
        scrollEventThrottle={16}
      >
        <View style={styles.heroSection}>
          <LinearGradient colors={BRAND.gradients.primary} style={styles.heroGradient}>
            <View style={styles.heroIconContainer}>
                <View style={styles.heroIconCircle}>
                    <Feather name="shield" size={42} color="#FFF" />
                </View>
                <View style={styles.heroBadge}>
                    <Text style={styles.heroBadgeText}>آمن وموثوق</Text>
                </View>
            </View>
            <Text style={styles.heroTitle}>وسائل السداد</Text>
            <Text style={styles.heroSubtitle}>سهّل على عملائك الدفع عبر توفير حساباتك البنكية ومحافظك الرقمية في مكان واحد.</Text>
          </LinearGradient>
        </View>

        <View style={styles.mainContainer}>
            {/* Existing Methods */}
            <View style={styles.section}>
                <View style={styles.sectionHeader}>
                    <View style={styles.sectionIconWrap}>
                        <Feather name="credit-card" size={18} color={pColor} />
                    </View>
                    <Text style={styles.sectionLabel}>الوسائل المفعلة بمتجرك</Text>
                </View>

                {merchantMethods.length === 0 ? (
                    <View style={styles.emptyCard}>
                        <View style={styles.emptyIconWrap}>
                            <MaterialCommunityIcons name="credit-card-plus-outline" size={40} color={BRAND.colors.slate[200]} />
                        </View>
                        <Text style={styles.emptyText}>ابدأ بتفعيل أول وسيلة دفع</Text>
                        <Text style={styles.emptySubtext}>اختر من القائمة أدناه وأضف بيانات التحصيل الخاصة بك</Text>
                    </View>
                ) : (
                    merchantMethods.map((item, idx) => (
                        <MethodCard 
                            key={item.id} 
                            item={item} 
                            onToggle={toggleMethodStatus} 
                            onDelete={deleteMethod}
                            pColor={pColor}
                            index={idx}
                        />
                    ))
                )}
            </View>

            {/* Available to Add */}
            <View style={styles.section}>
                <View style={styles.sectionHeader}>
                    <View style={styles.sectionIconWrap}>
                        <Feather name="grid" size={18} color={pColor} />
                    </View>
                    <Text style={styles.sectionLabel}>وسائل متاحة للإضافة</Text>
                </View>

                <View style={styles.addGrid}>
                    {globalMethods
                        .filter(gm => !merchantMethods.some(mm => mm.payment_method === gm.id))
                        .map((gm, idx) => (
                            <TouchableOpacity 
                                key={gm.id} 
                                style={styles.gridItem}
                                activeOpacity={0.85}
                                onPress={() => {
                                    setSelectedGlobalMethod(gm);
                                    setAccountValue('');
                                    setFieldName(gm.account_field_name || 'رقم الحساب');
                                    setShowAddModal(true);
                                }}
                            >
                                <View style={styles.gridLogoWrap}>
                                    {gm.logo ? (
                                        <Image source={{ uri: gm.logo }} style={styles.gridLogo} resizeMode="contain" />
                                    ) : (
                                        <MaterialCommunityIcons name="wallet-outline" size={24} color={pColor} />
                                    )}
                                </View>
                                <Text style={styles.gridName} numberOfLines={1}>{gm.name}</Text>
                                <View style={[styles.gridPlus, { backgroundColor: pColor + '15' }]}>
                                    <Feather name="plus" size={14} color={pColor} />
                                </View>
                            </TouchableOpacity>
                        ))
                    }
                </View>
            </View>
        </View>
        <View style={{ height: 60 }} />
      </Animated.ScrollView>

      {/* Modal Overlay */}
      {showAddModal && (
        <View style={styles.overlay}>
          <TouchableOpacity 
            style={StyleSheet.absoluteFill} 
            activeOpacity={1} 
            onPress={() => setShowAddModal(false)}
          >
            <BlurView intensity={25} tint="dark" style={StyleSheet.absoluteFill} />
          </TouchableOpacity>
          
          <Animated.View style={styles.modalSheet}>
            <View style={styles.modalDragIndicator} />
            
            <View style={styles.modalHeader}>
                <View style={styles.modalTitleRow}>
                    <View style={[styles.modalIconWrap, { backgroundColor: pColor + '15' }]}>
                        <MaterialCommunityIcons name="shield-edit" size={28} color={pColor} />
                    </View>
                    <View>
                        <Text style={styles.modalTitle}>تفعيل وسيلة جديدة</Text>
                        <Text style={styles.modalSubtitle}>{selectedGlobalMethod?.name}</Text>
                    </View>
                </View>
                <TouchableOpacity onPress={() => setShowAddModal(false)} style={styles.modalClose} activeOpacity={0.7}>
                    <Feather name="x" size={20} color={BRAND.colors.slate[400]} />
                </TouchableOpacity>
            </View>

            <ScrollView style={styles.modalBody} showsVerticalScrollIndicator={false} bounces={false}>
                <PremiumInput 
                    label="رقم الحساب أو معرف المحفظة"
                    value={accountValue}
                    onChangeText={setAccountValue}
                    placeholder="مثال: 77XXXXXXX"
                    icon="hash"
                    keyboardType="numeric"
                />

                <View style={{ height: 24 }} />

                <PremiumInput 
                    label="اسم الحقل الظاهر للعميل"
                    value={fieldName}
                    onChangeText={setFieldName}
                    placeholder="مثال: رقم الحساب، حساب الكريمي"
                    icon="edit-3"
                />

                <View style={styles.modalInfoBox}>
                    <Feather name="alert-circle" size={16} color={BRAND.colors.slate[400]} />
                    <Text style={styles.modalInfoText}>سيتمكن العميل من رؤية هذه البيانات عند اختيار هذه الوسيلة لإتمام الطلب.</Text>
                </View>

                <TouchableOpacity 
                    style={styles.submitContainer}
                    onPress={handleAddMethod}
                    disabled={saving}
                    activeOpacity={0.9}
                >
                    <LinearGradient
                        colors={BRAND.gradients.primary}
                        start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
                        style={styles.submitBtn}
                    >
                        {saving ? (
                            <ActivityIndicator color="#fff" />
                        ) : (
                            <View style={styles.submitRow}>
                                <Text style={styles.submitText}>تفعيل وإضافة للعملاء</Text>
                                <Feather name="arrow-left" size={20} color="#FFF" />
                            </View>
                        )}
                    </LinearGradient>
                </TouchableOpacity>
            </ScrollView>
          </Animated.View>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: BRAND.colors.slate[50] },
  
  header: { 
    position: 'absolute', top: 0, left: 0, right: 0, zIndex: 100, 
    height: Platform.OS === 'ios' ? 104 : 84,
  },
  headerSafe: { flex: 1 },
  headerContent: { 
    flex: 1, flexDirection: 'row', alignItems: 'center', 
    justifyContent: 'space-between', paddingHorizontal: 20 
  },
  headerTitle: { fontSize: 18, fontFamily: BRAND.typography.extraBold, color: '#FFF' },
  backBtn: { 
    width: 44, height: 44, borderRadius: 15, 
    backgroundColor: 'rgba(255,255,255,0.15)', justifyContent: 'center', alignItems: 'center',
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.2)'
  },

  scroll: { paddingBottom: 60 },
  
  heroSection: { height: 320 },
  heroGradient: { 
    flex: 1, padding: 30, paddingTop: Platform.OS === 'ios' ? 120 : 100, 
    alignItems: 'center', borderBottomLeftRadius: 50, borderBottomRightRadius: 50,
    paddingBottom: 80
  },
  heroIconContainer: { marginBottom: 20, alignItems: 'center' },
  heroIconCircle: { 
    width: 86, height: 86, borderRadius: 30, backgroundColor: 'rgba(255,255,255,0.12)',
    justifyContent: 'center', alignItems: 'center',
    borderWidth: 1.5, borderColor: 'rgba(255,255,255,0.25)'
  },
  heroBadge: { 
    position: 'absolute', bottom: -10, backgroundColor: BRAND.colors.accent,
    paddingHorizontal: 12, paddingVertical: 4, borderRadius: 10,
    elevation: 5, shadowOpacity: 0.3, shadowRadius: 5
  },
  heroBadgeText: { fontSize: 10, fontFamily: BRAND.typography.extraBold, color: '#FFF' },
  heroTitle: { fontSize: 24, fontFamily: BRAND.typography.extraBold, color: '#FFF', marginBottom: 10, textAlign: 'center' },
  heroSubtitle: { 
    fontSize: 13, color: 'rgba(255,255,255,0.85)', textAlign: 'center', 
    lineHeight: 20, paddingHorizontal: 20 
  },

  mainContainer: { paddingHorizontal: 20, marginTop: 20 },

  section: { marginBottom: 35 },
  sectionHeader: { 
    flexDirection: 'row', alignItems: 'center', gap: 12, 
    marginBottom: 20, paddingHorizontal: 12 
  },
  sectionIconWrap: { 
    width: 36, height: 36, borderRadius: 12, backgroundColor: '#FFF', 
    justifyContent: 'center', alignItems: 'center', elevation: 4, 
    shadowColor: '#000', shadowOpacity: 0.08, shadowRadius: 8 
  },
  sectionLabel: { fontSize: 16, fontFamily: BRAND.typography.extraBold, color: BRAND.colors.slate[800] },

  methodCard: { 
    backgroundColor: '#FFF', borderRadius: 32, padding: 22, marginBottom: 16,
    elevation: 8, shadowColor: BRAND.colors.primary, shadowOpacity: 0.08, shadowRadius: 20,
    borderWidth: 1, borderColor: BRAND.colors.slate[100]
  },
  methodTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
  methodInfo: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 15 },
  methodLogoContainer: { 
    width: 58, height: 58, borderRadius: 20, backgroundColor: BRAND.colors.slate[50],
    justifyContent: 'center', alignItems: 'center', overflow: 'hidden',
    borderWidth: 1, borderColor: BRAND.colors.slate[100]
  },
  methodLogo: { width: '85%', height: '85%', resizeMode: 'contain' },
  methodNameText: { fontSize: 18, fontFamily: BRAND.typography.extraBold, color: BRAND.colors.slate[900], textAlign: 'left' },
  statusRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 4 },
  statusDot: { width: 8, height: 8, borderRadius: 4 },
  statusText: { fontSize: 12, fontFamily: BRAND.typography.extraBold, color: BRAND.colors.slate[400] },
  
  methodActions: { flexDirection: 'row', gap: 12 },
  actionBtn: { 
    width: 44, height: 44, borderRadius: 16, justifyContent: 'center', 
    alignItems: 'center', borderWidth: 1, borderColor: 'rgba(0,0,0,0.04)' 
  },
  actionBtnDelete: { 
    width: 44, height: 44, borderRadius: 16, backgroundColor: BRAND.colors.danger + '08',
    justifyContent: 'center', alignItems: 'center'
  },

  methodDataBox: { 
    flexDirection: 'row',
    backgroundColor: BRAND.colors.slate[50], borderRadius: 24, 
    padding: 18, overflow: 'hidden'
  },
  dataAccentLine: { position: 'absolute', top: 0, bottom: 0, left: 0, width: 5 },
  dataLabelRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 6 },
  dataLabel: { fontSize: 12, fontFamily: BRAND.typography.extraBold, color: BRAND.colors.slate[400], textTransform: 'uppercase', letterSpacing: 0.5 },
  dataValue: { fontSize: 18, fontFamily: BRAND.typography.extraBold, color: BRAND.colors.slate[800], textAlign: 'left' },

  emptyCard: { 
    padding: 45, alignItems: 'center', backgroundColor: '#FFF', 
    borderRadius: 35, borderStyle: 'dashed', borderWidth: 2, 
    borderColor: BRAND.colors.slate[200] 
  },
  emptyIconWrap: { width: 80, height: 80, borderRadius: 40, backgroundColor: BRAND.colors.slate[50], justifyContent: 'center', alignItems: 'center', marginBottom: 15 },
  emptyText: { fontSize: 17, fontFamily: BRAND.typography.extraBold, color: BRAND.colors.slate[800], marginTop: 5 },
  emptySubtext: { fontSize: 14, color: BRAND.colors.slate[400], textAlign: 'center', marginTop: 8, lineHeight: 22, paddingHorizontal: 10 },

  addGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 18 },
  gridItem: { 
    width: (width - 58) / 2, backgroundColor: '#FFF', borderRadius: 28, 
    padding: 18, alignItems: 'center', elevation: 5, shadowOpacity: 0.05, 
    shadowRadius: 15, borderWidth: 1.5, borderColor: BRAND.colors.slate[50] 
  },
  gridLogoWrap: { 
    width: 64, height: 64, borderRadius: 22, backgroundColor: BRAND.colors.slate[50],
    justifyContent: 'center', alignItems: 'center', marginBottom: 14,
    borderWidth: 1, borderColor: BRAND.colors.slate[100]
  },
  gridLogo: { width: '75%', height: '75%' },
  gridName: { fontSize: 15, fontFamily: BRAND.typography.extraBold, color: BRAND.colors.slate[800], textAlign: 'left' },
  gridPlus: { 
    position: 'absolute', top: 14, right: 14, width: 26, height: 26, 
    borderRadius: 13, justifyContent: 'center', alignItems: 'center',
    elevation: 3, shadowOpacity: 0.1
  },

  overlay: { ...StyleSheet.absoluteFillObject, justifyContent: 'flex-end', zIndex: 1000 },
  modalSheet: { 
    backgroundColor: '#FFF', borderTopLeftRadius: 45, borderTopRightRadius: 45, 
    padding: 26, paddingBottom: Platform.OS === 'ios' ? 45 : 30,
    maxHeight: height * 0.85, elevation: 30, shadowColor: '#000', shadowOpacity: 0.25, shadowRadius: 30
  },
  modalDragIndicator: { 
    width: 44, height: 5, borderRadius: 3, backgroundColor: BRAND.colors.slate[200], 
    alignSelf: 'center', marginBottom: 25 
  },
  modalHeader: { 
    flexDirection: 'row', justifyContent: 'space-between', 
    alignItems: 'center', marginBottom: 35 
  },
  modalTitleRow: { flexDirection: 'row', alignItems: 'center', gap: 18 },
  modalIconWrap: { width: 60, height: 60, borderRadius: 22, justifyContent: 'center', alignItems: 'center' },
  modalTitle: { fontSize: 20, fontFamily: BRAND.typography.extraBold, color: BRAND.colors.slate[900] },
  modalSubtitle: { fontSize: 15, fontFamily: BRAND.typography.extraBold, color: BRAND.colors.slate[400], marginTop: 2 },
  modalClose: { 
    width: 44, height: 44, borderRadius: 22, backgroundColor: BRAND.colors.slate[50], 
    justifyContent: 'center', alignItems: 'center' 
  },
  modalBody: { paddingBottom: 20 },
  modalInfoBox: { 
    flexDirection: 'row', alignItems: 'center', gap: 10, 
    backgroundColor: BRAND.colors.slate[50], padding: 15, borderRadius: 16, marginTop: 15 
  },
  modalInfoText: { flex: 1, fontSize: 12, color: BRAND.colors.slate[500], textAlign: 'left', lineHeight: 18 },
  submitContainer: { marginTop: 35 },
  submitBtn: { height: 68, borderRadius: 24, justifyContent: 'center', alignItems: 'center' },
  submitRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  submitText: { color: '#FFF', fontSize: 18, fontFamily: BRAND.typography.extraBold }
});
