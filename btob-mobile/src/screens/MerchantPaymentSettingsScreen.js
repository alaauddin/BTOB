import React, { useState, useEffect } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  ActivityIndicator, Alert, TextInput, Platform, Image
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Feather, Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { useAuth } from '../context/AuthContext';
import { useNotifications } from '../context/NotificationContext';
import client from '../api/client';
import { LinearGradient } from 'expo-linear-gradient';

export default function MerchantPaymentSettingsScreen() {
  const navigation = useNavigation();
  const { activeMerchant } = useAuth();
  const { showNotification } = useNotifications();
  const primaryColor = activeMerchant?.primary_color || '#2B5876';


  const [loading, setLoading] = useState(true);
  const [globalMethods, setGlobalMethods] = useState([]);
  const [merchantMethods, setMerchantMethods] = useState([]);
  const [showAddModal, setShowAddModal] = useState(false);
  const [selectedGlobalMethod, setSelectedGlobalMethod] = useState(null);
  const [accountValue, setAccountValue] = useState('');
  const [fieldName, setFieldName] = useState('رقم الحساب');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [globalsRes, merchantRes] = await Promise.all([
        client.get('/payment-methods/'),
        client.get(`/merchant/payment-settings/?merchant_id=${activeMerchant.id}`)
      ]);
      const globals = globalsRes.data.results || globalsRes.data;
      // Filter out Cash on Delivery (already system default)
      setGlobalMethods(globals.filter(m => m.id !== 3 && m.name.toLowerCase() !== 'cash on delivery'));
      setMerchantMethods(merchantRes.data.results || merchantRes.data);
    } catch (err) {
      // Handled globally
    } finally {

      setLoading(false);
    }
  };

  const handleAddMethod = async () => {
    if (!selectedGlobalMethod || (!accountValue && selectedGlobalMethod.requires_proof)) {
      showNotification({ title: 'تنبيه', message: 'يرجى إكمال البيانات المطلوبة', type: 'warning' });
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
        showNotification({ title: 'تمت الإضافة', message: 'تمت إضافة وسيلة الدفع بنجاح', type: 'success' });
        setShowAddModal(false);
        setAccountValue('');
        setSelectedGlobalMethod(null);
        fetchData();
      }
    } catch (err) {
      // Handled globally
    } finally {

      setSaving(false);
    }
  };

  const toggleMethodStatus = async (method) => {
    try {
      await client.patch(`/merchant/payment-settings/${method.id}/`, {
        is_active: !method.is_active
      });
      fetchData();
    } catch (err) {
      showNotification({ title: 'خطأ', message: 'فشل في تحديث الحالة', type: 'error' });
    }
  };

  const deleteMethod = (method) => {
    Alert.alert(
      'حذف',
      `هل أنت متأكد من حذف ${method.method_name}؟`,
      [
        { text: 'إلغاء', style: 'cancel' },
        { 
          text: 'حذف', 
          style: 'destructive', 
          onPress: async () => {
            try {
              await client.delete(`/merchant/payment-settings/${method.id}/`);
              fetchData();
            } catch (err) {
              showNotification({ title: 'خطأ', message: 'فشل في الحذف', type: 'error' });
            } finally {
            }
          }
        }
      ]
    );
  };

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color={primaryColor} />
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Feather name="arrow-right" size={24} color="#334155" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>إعدادات الدفع</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView contentContainerStyle={styles.scroll}>
        <View style={styles.infoBox}>
          <Feather name="shield" size={40} color={primaryColor} />
          <Text style={styles.infoTitle}>وسائل الدفع للمتجر</Text>
          <Text style={styles.infoSubtitle}>
            قم بتفعيل وسائل الدفع التي ترغب في توفيرها لعملائك ليتمكنوا من إرفاق إيصالات السداد.
          </Text>
        </View>

        {/* Existing Methods */}
        <View style={styles.section}>
          <Text style={styles.sectionLabel}>الوسائل المفعلة</Text>
          {merchantMethods.length === 0 ? (
            <View style={styles.emptyCard}>
              <Text style={styles.emptyText}>لم تقم بإضافة أي وسيلة دفع بعد</Text>
            </View>
          ) : (
            merchantMethods.map(item => (
              <View key={item.id} style={styles.methodCard}>
                <View style={styles.methodMain}>
              <View style={styles.iconCircle}>
                {item.method_logo ? (
                  <Image source={{ uri: item.method_logo }} style={styles.methodLogo} resizeMode="contain" />
                ) : (
                  <Ionicons name="wallet-outline" size={24} color={primaryColor} />
                )}
              </View>
              <View style={styles.methodInfo}>
                <View style={styles.methodHeaderRow}>
                  <Text style={styles.methodName}>{item.method_name}</Text>
                  <Text style={styles.fieldNameTag}>{item.account_field_name}</Text>
                </View>
                    {item.account_field_value ? (
                      <Text style={styles.methodValue}>{item.account_field_value}</Text>
                    ) : null}
                  </View>
                </View>
                <View style={styles.methodActions}>
                  <TouchableOpacity 
                    onPress={() => toggleMethodStatus(item)}
                    style={[styles.actionBtn, { backgroundColor: item.is_active ? '#10B98120' : '#F1F5F9' }]}
                  >
                    <Feather 
                      name={item.is_active ? "eye" : "eye-off"} 
                      size={18} 
                      color={item.is_active ? "#059669" : "#64748B"} 
                    />
                  </TouchableOpacity>
                  <TouchableOpacity onPress={() => deleteMethod(item)} style={styles.actionBtnDelete}>
                    <Feather name="trash-2" size={18} color="#DC2626" />
                  </TouchableOpacity>
                </View>
              </View>
            ))
          )}
        </View>

        {/* Available to Add */}
        <View style={styles.section}>
          <Text style={styles.sectionLabel}>إضافة وسيلة جديدة</Text>
          <View style={styles.grid}>
            {globalMethods
              .filter(gm => !merchantMethods.some(mm => mm.payment_method === gm.id))
              .map(gm => (
                <TouchableOpacity 
                  key={gm.id} 
                  style={styles.gridItem}
                  onPress={() => {
                    setSelectedGlobalMethod(gm);
                    setShowAddModal(true);
                  }}
                >
                  <LinearGradient
                    colors={['#FFFFFF', '#F8FAFC']}
                    style={styles.gridInner}
                  >
                    <View style={styles.addCircle}>
                      <Ionicons name="add" size={24} color={primaryColor} />
                    </View>
                    <Text style={styles.gridLabel}>{gm.name}</Text>
                  </LinearGradient>
                </TouchableOpacity>
              ))
            }
          </View>
        </View>
      </ScrollView>

      {/* Add Modal (Simulated inline) */}
      {showAddModal && (
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>إعداد {selectedGlobalMethod?.name}</Text>
            <Text style={styles.modalLabel}>رقم الحساب أو معرف المحفظة</Text>
            <TextInput
              style={styles.input}
              placeholder="مثال: 77XXXXXXX"
              value={accountValue}
              onChangeText={setAccountValue}
              keyboardType="numeric"
              textAlign="right"
            />

            <Text style={styles.modalLabel}>تسمية الحقل (مثلاً: رقم المحفظة، حساب رقم)</Text>
            <TextInput
              style={styles.input}
              placeholder="رقم الحساب"
              value={fieldName}
              onChangeText={setFieldName}
              textAlign="right"
            />
            <View style={styles.modalBtns}>
              <TouchableOpacity 
                style={[styles.modalBtn, { backgroundColor: primaryColor }]} 
                onPress={handleAddMethod}
                disabled={saving}
              >
                {saving ? <ActivityIndicator color="#fff" /> : <Text style={styles.modalBtnText}>تفعيل</Text>}
              </TouchableOpacity>
              <TouchableOpacity 
                style={[styles.modalBtn, styles.modalBtnCancel]} 
                onPress={() => setShowAddModal(false)}
              >
                <Text style={styles.modalBtnTextCancel}>إلغاء</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F8FAFC' },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  header: {
    flexDirection: 'row-reverse', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 20, paddingVertical: 15, backgroundColor: '#fff',
    borderBottomWidth: 1, borderBottomColor: '#F1F5F9'
  },
  backBtn: { padding: 8 },
  headerTitle: { fontSize: 18, fontWeight: '800', color: '#1E293B' },
  scroll: { padding: 20 },
  infoBox: { alignItems: 'center', marginBottom: 30, backgroundColor: '#fff', padding: 20, borderRadius: 24, elevation: 2, shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 10 },
  infoTitle: { fontSize: 18, fontWeight: '800', color: '#1E293B', marginTop: 12 },
  infoSubtitle: { fontSize: 14, color: '#64748B', textAlign: 'center', marginTop: 8, lineHeight: 22 },
  section: { marginBottom: 25 },
  sectionLabel: { fontSize: 15, fontWeight: '800', color: '#94A3B8', marginBottom: 15, textAlign: 'right' },
  emptyCard: { padding: 30, alignItems: 'center', backgroundColor: '#F1F5F9', borderRadius: 20, borderStyle: 'dashed', borderWidth: 1, borderColor: '#CBD5E1' },
  emptyText: { color: '#94A3B8', fontWeight: '600' },
  methodCard: {
    backgroundColor: '#fff', borderRadius: 20, padding: 16, marginBottom: 12,
    flexDirection: 'row-reverse', justifyContent: 'space-between', alignItems: 'center',
    elevation: 3, shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 8,
  },
  methodMain: { flexDirection: 'row-reverse', alignItems: 'center', flex: 1 },
  iconCircle: { width: 44, height: 44, borderRadius: 12, backgroundColor: '#F1F5F9', justifyContent: 'center', alignItems: 'center', overflow: 'hidden' },
  methodLogo: { width: '80%', height: '80%' },
  methodInfo: { marginRight: 15, alignItems: 'flex-start', flex: 1 },
  methodHeaderRow: { flexDirection: 'row-reverse', alignItems: 'center', gap: 8, marginBottom: 2 },
  methodName: { fontSize: 16, fontWeight: '800', color: '#1E293B' },
  fieldNameTag: { fontSize: 10, color: '#94A3B8', backgroundColor: '#F1F5F9', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 6 },
  methodValue: { fontSize: 14, fontWeight: '600', color: '#64748B' },
  methodActions: { flexDirection: 'row', gap: 8 },
  actionBtn: { width: 36, height: 36, borderRadius: 10, justifyContent: 'center', alignItems: 'center' },
  actionBtnDelete: { width: 36, height: 36, borderRadius: 10, backgroundColor: '#FEF2F2', justifyContent: 'center', alignItems: 'center' },
  grid: { flexDirection: 'row-reverse', flexWrap: 'wrap', gap: 12 },
  gridItem: { width: '48%', height: 120, borderRadius: 24, overflow: 'hidden', elevation: 2, shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 8 },
  gridInner: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 15 },
  addCircle: { width: 40, height: 40, borderRadius: 20, backgroundColor: '#F1F5F9', justifyContent: 'center', alignItems: 'center', marginBottom: 10 },
  gridLabel: { fontSize: 14, fontWeight: '800', color: '#334155' },
  modalOverlay: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(15, 23, 42, 0.6)', justifyContent: 'center', padding: 20, zIndex: 100 },
  modalContent: { backgroundColor: '#fff', borderRadius: 32, padding: 25 },
  modalTitle: { fontSize: 20, fontWeight: '800', color: '#1E293B', marginBottom: 20, textAlign: 'center' },
  modalLabel: { fontSize: 14, fontWeight: '700', color: '#64748B', marginBottom: 10, textAlign: 'right' },
  input: { backgroundColor: '#F8FAFC', borderRadius: 16, height: 56, paddingHorizontal: 20, fontSize: 16, fontWeight: '600', borderWidth: 1, borderColor: '#F1F5F9', marginBottom: 20 },
  modalBtns: { gap: 10 },
  modalBtn: { height: 56, borderRadius: 16, justifyContent: 'center', alignItems: 'center' },
  modalBtnCancel: { backgroundColor: '#F1F5F9' },
  modalBtnText: { color: '#fff', fontSize: 16, fontWeight: '800' },
  modalBtnTextCancel: { color: '#64748B', fontSize: 16, fontWeight: '800' },
});
