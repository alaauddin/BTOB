import React, { useState, useEffect } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  ActivityIndicator, Alert, TextInput, Platform, Image,
  Animated, Dimensions
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Feather, Ionicons } from '@expo/vector-icons';
import { BlurView } from 'expo-blur';
import { LinearGradient } from 'expo-linear-gradient';
import { useNavigation } from '@react-navigation/native';
import { useAuth } from '../context/AuthContext';
import { useNotifications } from '../context/NotificationContext';
import client from '../api/client';
import { THEME } from '../theme/profileTheme';
import { styles as profileStyles } from '../theme/profileStyles';

const { width } = Dimensions.get('window');

export default function MerchantPaymentSettingsScreen() {
  const navigation = useNavigation();
  const { activeMerchant } = useAuth();
  const { showNotification } = useNotifications();
  
  const primaryColor = activeMerchant?.primary_color || THEME.colors.primary;

  const [loading, setLoading] = useState(true);
  const [globalMethods, setGlobalMethods] = useState([]);
  const [merchantMethods, setMerchantMethods] = useState([]);
  const [showAddModal, setShowAddModal] = useState(false);
  const [selectedGlobalMethod, setSelectedGlobalMethod] = useState(null);
  const [accountValue, setAccountValue] = useState('');
  const [fieldName, setFieldName] = useState('رقم الحساب');
  const [saving, setSaving] = useState(false);

  // Animations
  const fadeAnim = useState(new Animated.Value(0))[0];

  useEffect(() => {
    fetchData();
  }, []);

  useEffect(() => {
    if (!loading) {
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 500,
        useNativeDriver: true,
      }).start();
    }
  }, [loading]);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [globalsRes, merchantRes] = await Promise.all([
        client.get('/payment-methods/'),
        client.get(`/merchant/payment-settings/?merchant_id=${activeMerchant.id}`)
      ]);
      const globals = globalsRes.data.results || globalsRes.data;
      // Filter out Cash on Delivery and inactive ones
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

  if (loading) {
    return (
      <SafeAreaView style={[styles.container, { justifyContent: 'center', alignItems: 'center' }]}>
        <ActivityIndicator size="large" color={primaryColor} />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Feather name="chevron-right" size={26} color={THEME.colors.slate[800]} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>إعدادات الدفع الإلكتروني</Text>
        <View style={{ width: 44 }} />
      </View>

      <Animated.ScrollView contentContainerStyle={[styles.scroll, { opacity: fadeAnim }]} showsVerticalScrollIndicator={false}>
        <View style={styles.infoBox}>
          <View style={[styles.infoIconWrap, { backgroundColor: primaryColor + '15' }]}>
             <Feather name="shield" size={32} color={primaryColor} />
          </View>
          <Text style={styles.infoTitle}>التحصيل الرقمي</Text>
          <Text style={styles.infoSubtitle}>
            فعل وسائل الدفع الإلكتروني لتمكين عملائك من إرفاق إيصالات السداد وتسهيل عملية التحقق المالي.
          </Text>
        </View>

        {/* Existing Methods */}
        <View style={styles.section}>
          <Text style={styles.sectionLabel}>الوسائل المفعلة</Text>
          {merchantMethods.length === 0 ? (
            <View style={styles.emptyCard}>
              <Feather name="credit-card" size={40} color={THEME.colors.slate[300]} />
              <Text style={styles.emptyText}>لم تقم بإضافة أي وسيلة دفع بعد</Text>
            </View>
          ) : (
            merchantMethods.map(item => (
              <View key={item.id} style={styles.methodCard}>
                <View style={[styles.methodLogoWrap, { backgroundColor: THEME.colors.slate[50] }]}>
                  {item.method_logo ? (
                    <Image source={{ uri: item.method_logo }} style={styles.methodLogo} resizeMode="contain" />
                  ) : (
                    <Feather name="wallet" size={22} color={primaryColor} />
                  )}
                </View>
                
                <View style={styles.methodBody}>
                   <View style={styles.methodMeta}>
                      <Text style={styles.methodName}>{item.method_name}</Text>
                      <View style={styles.tagWrap}>
                         <Text style={styles.tagText}>{item.account_field_name}</Text>
                      </View>
                   </View>
                   <Text style={styles.accountText}>{item.account_field_value}</Text>
                </View>

                <View style={styles.methodActions}>
                  <TouchableOpacity 
                    onPress={() => toggleMethodStatus(item)}
                    style={[styles.miniAction, { borderColor: item.is_active ? '#10B981' : THEME.colors.slate[200] }]}
                  >
                    <Feather 
                      name={item.is_active ? "eye" : "eye-off"} 
                      size={16} 
                      color={item.is_active ? "#10B981" : THEME.colors.slate[400]} 
                    />
                  </TouchableOpacity>
                  <TouchableOpacity onPress={() => deleteMethod(item)} style={styles.miniActionDelete}>
                    <Feather name="trash-2" size={16} color={THEME.colors.rose} />
                  </TouchableOpacity>
                </View>
              </View>
            ))
          )}
        </View>

        {/* Available to Add */}
        <View style={styles.section}>
          <Text style={styles.sectionLabel}>إضافة وسيلة جديدة</Text>
          <View style={styles.addGrid}>
            {globalMethods
              .filter(gm => !merchantMethods.some(mm => mm.payment_method === gm.id))
              .map(gm => (
                <TouchableOpacity 
                  key={gm.id} 
                  style={styles.gridItem}
                  onPress={() => {
                    setSelectedGlobalMethod(gm);
                    setAccountValue('');
                    setFieldName(gm.account_field_name || 'رقم الحساب');
                    setShowAddModal(true);
                  }}
                >
                  <View style={styles.gridIconWrap}>
                     <Feather name="plus" size={18} color={primaryColor} />
                  </View>
                  <Text style={styles.gridText}>{gm.name}</Text>
                </TouchableOpacity>
              ))
            }
          </View>
        </View>
      </Animated.ScrollView>

      {/* Modern Add Modal */}
      {showAddModal && (
        <View style={styles.overlay}>
          <BlurView intensity={20} tint="dark" style={StyleSheet.absoluteFill} />
          <Animated.View style={styles.modalContent}>
            <View style={styles.modalHeader}>
               <Text style={styles.modalTitle}>إعداد {selectedGlobalMethod?.name}</Text>
               <TouchableOpacity onPress={() => setShowAddModal(false)} style={styles.closeBtn}>
                  <Feather name="x" size={20} color={THEME.colors.slate[400]} />
               </TouchableOpacity>
            </View>

            <View style={styles.modalBody}>
               <Text style={styles.inputLabel}>رقم الحساب أو معرف المحفظة</Text>
               <View style={styles.inputWrap}>
                  <Feather name="hash" size={18} color={THEME.colors.slate[300]} style={{ marginLeft: 12 }} />
                  <TextInput
                    style={styles.input}
                    placeholder="مثال: 77XXXXXXX"
                    value={accountValue}
                    onChangeText={setAccountValue}
                    keyboardType="numeric"
                    textAlign="right"
                    placeholderTextColor={THEME.colors.slate[300]}
                  />
               </View>

               <Text style={styles.inputLabel}>تسمية الحقل (اختياري)</Text>
               <View style={styles.inputWrap}>
                  <Feather name="edit-3" size={18} color={THEME.colors.slate[300]} style={{ marginLeft: 12 }} />
                  <TextInput
                    style={styles.input}
                    placeholder="مثال: رقم الحساب"
                    value={fieldName}
                    onChangeText={setFieldName}
                    textAlign="right"
                    placeholderTextColor={THEME.colors.slate[300]}
                  />
               </View>

               <TouchableOpacity 
                 onPress={handleAddMethod}
                 disabled={saving}
               >
                 <LinearGradient
                   colors={['#8B5CF6', '#6366F1']}
                   start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
                   style={styles.submitBtn}
                 >
                   {saving ? <ActivityIndicator color="#fff" /> : <Text style={styles.submitBtnText}>تفعيل الوسيلة</Text>}
                 </LinearGradient>
               </TouchableOpacity>
            </View>
          </Animated.View>
        </View>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: THEME.colors.slate[50] },
  header: { 
    flexDirection: 'row-reverse', alignItems: 'center', justifyContent: 'space-between', 
    paddingHorizontal: 16, height: 64, backgroundColor: '#FFF',
    borderBottomWidth: 1, borderBottomColor: THEME.colors.slate[100]
  },
  headerTitle: { fontSize: 17, fontWeight: '800', color: THEME.colors.slate[800] },
  backBtn: { width: 44, height: 44, justifyContent: 'center', alignItems: 'center' },
  scroll: { padding: 20 },
  
  infoBox: { alignItems: 'center', marginBottom: 32 },
  infoIconWrap: { width: 72, height: 72, borderRadius: 24, justifyContent: 'center', alignItems: 'center', marginBottom: 16 },
  infoTitle: { fontSize: 22, fontWeight: '900', color: THEME.colors.slate[900] },
  infoSubtitle: { fontSize: 14, color: THEME.colors.slate[500], textAlign: 'center', marginTop: 8, lineHeight: 22, paddingHorizontal: 20 },

  section: { marginBottom: 32 },
  sectionLabel: { fontSize: 13, fontWeight: '900', color: THEME.colors.slate[400], marginBottom: 16, textAlign: 'right', textTransform: 'uppercase', letterSpacing: 0.5 },
  
  methodCard: { 
    backgroundColor: '#FFF', borderRadius: 24, padding: 16, marginBottom: 12, borderWeight: 1, borderColor: THEME.colors.slate[100],
    flexDirection: 'row-reverse', alignItems: 'center', elevation: 2, shadowOpacity: 0.05, shadowRadius: 10
  },
  methodLogoWrap: { width: 48, height: 48, borderRadius: 14, justifyContent: 'center', alignItems: 'center', overflow: 'hidden' },
  methodLogo: { width: '80%', height: '80%' },
  methodBody: { flex: 1, marginRight: 16, alignItems: 'flex-start' },
  methodMeta: { flexDirection: 'row-reverse', alignItems: 'center', gap: 8, marginBottom: 4 },
  methodName: { fontSize: 16, fontWeight: '800', color: THEME.colors.slate[800] },
  tagWrap: { backgroundColor: THEME.colors.slate[50], paddingHorizontal: 8, paddingVertical: 2, borderRadius: 6 },
  tagText: { fontSize: 10, color: THEME.colors.slate[400], fontWeight: '700' },
  accountText: { fontSize: 14, fontWeight: '600', color: THEME.colors.slate[500], textAlign: 'right' },
  methodActions: { flexDirection: 'row', gap: 10 },
  miniAction: { width: 34, height: 34, borderRadius: 10, borderWeight: 1.5, justifyContent: 'center', alignItems: 'center' },
  miniActionDelete: { width: 34, height: 34, borderRadius: 10, backgroundColor: THEME.colors.rose + '10', justifyContent: 'center', alignItems: 'center' },

  emptyCard: { padding: 40, alignItems: 'center', backgroundColor: '#FFF', borderRadius: 24, borderStyle: 'dashed', borderWidth: 2, borderColor: THEME.colors.slate[200] },
  emptyText: { color: THEME.colors.slate[300], fontWeight: '700', marginTop: 12 },

  addGrid: { flexDirection: 'row-reverse', flexWrap: 'wrap', gap: 12 },
  gridItem: { width: (width - 56) / 2, backgroundColor: '#FFF', borderRadius: 20, padding: 16, alignItems: 'center', elevation: 2, shadowOpacity: 0.05, shadowRadius: 10, borderWeight: 1, borderColor: THEME.colors.slate[100] },
  gridIconWrap: { width: 32, height: 32, borderRadius: 10, backgroundColor: THEME.colors.slate[50], justifyContent: 'center', alignItems: 'center', marginBottom: 10 },
  gridText: { fontSize: 14, fontWeight: '800', color: THEME.colors.slate[700] },

  overlay: { ...StyleSheet.absoluteFillObject, justifyContent: 'flex-end', zIndex: 1000 },
  modalContent: { backgroundColor: '#FFF', borderTopLeftRadius: 32, borderTopRightRadius: 32, padding: 24, paddingBottom: Platform.OS === 'ios' ? 40 : 24 },
  modalHeader: { flexDirection: 'row-reverse', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 },
  modalTitle: { fontSize: 20, fontWeight: '900', color: THEME.colors.slate[900] },
  closeBtn: { width: 36, height: 36, borderRadius: 18, backgroundColor: THEME.colors.slate[50], justifyContent: 'center', alignItems: 'center' },
  modalBody: { gap: 16 },
  inputLabel: { fontSize: 13, fontWeight: '800', color: THEME.colors.slate[500], textAlign: 'right', marginBottom: -8 },
  inputWrap: { flexDirection: 'row-reverse', alignItems: 'center', backgroundColor: THEME.colors.slate[50], borderRadius: 16, height: 56, paddingHorizontal: 16, borderWidth: 1, borderColor: THEME.colors.slate[100] },
  input: { flex: 1, fontSize: 16, fontWeight: '700', color: THEME.colors.slate[800] },
  submitBtn: { height: 60, borderRadius: 20, justifyContent: 'center', alignItems: 'center', marginTop: 10 },
  submitBtnText: { color: '#FFF', fontSize: 17, fontWeight: '900' }
});
