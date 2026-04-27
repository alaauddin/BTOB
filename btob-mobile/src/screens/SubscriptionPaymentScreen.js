import React, { useState, useEffect } from 'react';
import { View, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator, Dimensions, Alert, Image, KeyboardAvoidingView, Platform } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import * as ImagePicker from 'expo-image-picker';
import client from '../api/client';
import { useAuth } from '../context/AuthContext';
import { BRAND } from '../theme/brand';
import Text from '../components/AppText';
import TextInput from '../components/AppTextInput';

const { width } = Dimensions.get('window');

const DynamicField = ({ field, value, onChange }) => {
  const [image, setImage] = useState(null);

  const pickImage = async () => {
    let result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      quality: 0.7,
    });

    if (!result.canceled) {
      const uri = result.assets[0].uri;
      setImage(uri);
      onChange(uri);
    }
  };

  if (field.field_type === 'pic') {
    return (
      <View style={styles.fieldGroup}>
        <Text style={styles.fieldLabel}>{field.label} {field.is_required && <Text style={{color: 'red'}}>*</Text>}</Text>
        <TouchableOpacity style={styles.imagePicker} onPress={pickImage}>
          {image ? (
            <Image source={{ uri: image }} style={styles.pickedImage} />
          ) : (
            <View style={styles.imagePlaceholder}>
              <Feather name="camera" size={32} color="#94A3B8" />
              <Text style={styles.imagePlaceholderText}>اضغط لرفع صورة</Text>
            </View>
          )}
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={styles.fieldGroup}>
      <Text style={styles.fieldLabel}>{field.label} {field.is_required && <Text style={{color: 'red'}}>*</Text>}</Text>
      <TextInput
        style={styles.input}
        placeholder={field.placeholder || field.label}
        value={value}
        onChangeText={onChange}
        keyboardType={field.field_type === 'number' ? 'numeric' : 'default'}
      />
    </View>
  );
};

export default function SubscriptionPaymentScreen({ route, navigation }) {
  const { subscription } = route.params;
  const { activeMerchant } = useAuth();
  
  const [methods, setMethods] = useState([]);
  const [selectedMethod, setSelectedMethod] = useState(null);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState({});
  const [submitting, setSubmitting] = useState(false);

  const primaryColor = BRAND.colors.primary;

  useEffect(() => {
    fetchMethods();
  }, []);

  const fetchMethods = async () => {
    try {
      const res = await client.get('/subscriptions/payment-methods/');
      if (res.data.success) {
        setMethods(res.data.methods);
        if (res.data.methods.length > 0) {
          setSelectedMethod(res.data.methods[0]);
        }
      }
    } catch (error) {
      console.error('Fetch methods error', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async () => {
    // Basic validation
    if (!selectedMethod) return;
    
    for (const field of selectedMethod.fields) {
      if (field.is_required && !form[field.id]) {
        Alert.alert('تنبيه', `يرجى إكمال الحقل: ${field.label}`);
        return;
      }
    }

    setSubmitting(true);
    try {
      const formData = new FormData();
      formData.append('subscription_id', subscription.id);
      formData.append('method_id', selectedMethod.id);
      
      const submitted_data = {};
      selectedMethod.fields.forEach(f => {
        if (f.field_type !== 'pic') {
          submitted_data[f.id] = form[f.id];
        } else if (form[f.id]) {
          // Add pic to FormData directly
          const uri = form[f.id];
          const name = uri.split('/').pop();
          const match = /\.(\w+)$/.exec(name);
          const type = match ? `image/${match[1]}` : `image`;
          formData.append('receipt', { uri, name, type });
        }
      });
      
      formData.append('submitted_data', JSON.stringify(submitted_data));

      const res = await client.post('/subscriptions/submit-payment/', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });

      if (res.data.success) {
        Alert.alert('تم بنجاح', 'تم إرسال بيانات الدفع للمراجعة. سيتم تفعيل اشتراكك قريباً.', [
          { text: 'حسناً', onPress: () => navigation.navigate('MerchantTabs', { screen: 'Dashboard' }) }
        ]);
      }
    } catch (error) {
      console.error('Payment submit error', error);
      Alert.alert('خطأ', 'فشلت عملية إرسال الدفع، يرجى المحاولة لاحقاً');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color={primaryColor} />
      </View>
    );
  }

  return (
    <View style={styles.root}>
      <LinearGradient colors={BRAND.gradients.primary} style={styles.header}>
        <SafeAreaView edges={['top']} style={styles.headerContent}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
            <Feather name="arrow-right" size={24} color="#fff" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>إكمال الدفع</Text>
          <View style={{ width: 40 }} />
        </SafeAreaView>
      </LinearGradient>

      <KeyboardAvoidingView 
        style={{ flex: 1 }} 
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 64 : 0}
      >
        <ScrollView contentContainerStyle={styles.scroll}>
        <View style={styles.summaryCard}>
          <Text style={styles.summaryLabel}>باقة {subscription.plan_name}</Text>
          <Text style={[styles.summaryAmount, { color: BRAND.colors.primary }]}>
            {subscription.plan_price} {subscription.plan_currency}
          </Text>
        </View>

        <Text style={styles.sectionTitle}>اختر طريقة الدفع</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.methodsRow}>
          {methods.map(method => (
            <TouchableOpacity 
              key={method.id} 
              style={[styles.methodItem, selectedMethod?.id === method.id && { borderColor: BRAND.colors.primary, borderWidth: 2, backgroundColor: '#F0F9FF' }]}
              onPress={() => {
                setSelectedMethod(method);
                setForm({});
              }}
            >
              {method.logo ? (
                <Image source={{ uri: method.logo }} style={styles.methodLogo} />
              ) : (
                <View style={[styles.methodIcon, { backgroundColor: selectedMethod?.id === method.id ? BRAND.colors.primary : '#F1F5F9' }]}>
                   <Feather name="credit-card" size={20} color="#fff" />
                </View>
              )}
              <Text style={styles.methodName}>{method.name}</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>

        {selectedMethod && (
          <View style={styles.formContainer}>
            {selectedMethod.instructions && (
              <View style={styles.instructionsBox}>
                <Feather name="info" size={18} color={primaryColor} />
                <Text style={styles.instructionsText}>{selectedMethod.instructions}</Text>
              </View>
            )}

            {selectedMethod.fields.map(field => (
              <DynamicField 
                key={field.id} 
                field={field} 
                value={form[field.id]} 
                onChange={(val) => setForm({...form, [field.id]: val})} 
              />
            ))}
          </View>
        )}
        </ScrollView>
      </KeyboardAvoidingView>

      <View style={styles.footer}>
        <TouchableOpacity 
          style={[styles.submitBtn, { backgroundColor: primaryColor }]}
          onPress={handleSubmit}
          disabled={submitting}
        >
          {submitting ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.submitBtnText}>تأكيد الدفع</Text>
          )}
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#F8FAFC' },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  header: { paddingBottom: 15, borderBottomLeftRadius: 25, borderBottomRightRadius: 25 },
  headerContent: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, height: 60 },
  headerTitle: { color: '#fff', fontSize: 18, fontFamily: BRAND.typography.bold },
  backBtn: { width: 40, height: 40, justifyContent: 'center', alignItems: 'center' },

  scroll: { flexGrow: 1, paddingBottom: 100 },
  summaryCard: { backgroundColor: '#fff', margin: 16, padding: 20, borderRadius: 20, alignItems: 'center', borderWidth: 1, borderColor: '#F1F5F9' },
  summaryLabel: { fontSize: 14, color: '#64748B', marginBottom: 4 },
  summaryAmount: { fontSize: 28, fontFamily: BRAND.typography.bold },

  sectionTitle: { fontSize: 16, fontFamily: BRAND.typography.bold, color: '#1E293B', marginHorizontal: 20, marginTop: 10, marginBottom: 12 },
  methodsRow: { paddingHorizontal: 16, gap: 12, marginBottom: 20 },
  methodItem: { width: 100, height: 100, backgroundColor: '#fff', borderRadius: 20, justifyContent: 'center', alignItems: 'center', borderWidth: 1, borderColor: '#F1F5F9' },
  methodLogo: { width: 40, height: 40, borderRadius: 10, marginBottom: 8 },
  methodIcon: { width: 40, height: 40, borderRadius: 10, justifyContent: 'center', alignItems: 'center', marginBottom: 8 },
  methodName: { fontSize: 12, fontFamily: BRAND.typography.semiBold, color: '#475569', textAlign: 'center' },

  formContainer: { paddingHorizontal: 16 },
  instructionsBox: { backgroundColor: '#F0F9FF', padding: 16, borderRadius: 15, flexDirection: 'row', gap: 10, marginBottom: 20 },
  instructionsText: { flex: 1, fontSize: 13, color: BRAND.colors.primary, lineHeight: 20 },
  
  fieldGroup: { marginBottom: 16 },
  fieldLabel: { fontSize: 14, fontFamily: BRAND.typography.semiBold, color: '#475569', marginBottom: 8 },
  input: { backgroundColor: '#fff', height: 50, borderRadius: 12, paddingHorizontal: 15, borderWidth: 1, borderColor: '#E2E8F0' },
  
  imagePicker: { backgroundColor: '#fff', height: 150, borderRadius: 12, borderWidth: 1, borderColor: '#E2E8F0', borderStyle: 'dashed', justifyContent: 'center', alignItems: 'center', overflow: 'hidden' },
  imagePlaceholder: { alignItems: 'center', gap: 8 },
  imagePlaceholderText: { color: '#94A3B8', fontSize: 14 },
  pickedImage: { width: '100%', height: '100%' },

  footer: { position: 'absolute', bottom: 0, left: 0, right: 0, backgroundColor: '#fff', padding: 20, borderTopWidth: 1, borderTopColor: '#F1F5F9' },
  submitBtn: { height: 56, borderRadius: 16, justifyContent: 'center', alignItems: 'center' },
  submitBtnText: { color: '#fff', fontSize: 18, fontFamily: BRAND.typography.bold }
});
