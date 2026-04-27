import React, { useState, useEffect } from 'react';
import { View, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator, RefreshControl, Dimensions, Animated, Image, Platform, Alert } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import client from '../api/client';
import { useAuth } from '../context/AuthContext';
import Text from '../components/AppText';
import { BRAND } from '../theme/brand';

const { width } = Dimensions.get('window');

const PlanCard = ({ plan, isSelected, onSelect, primaryColor }) => {
  const isBestValue = plan.name.includes('برو') || plan.name.includes('Pro');
  
  return (
    <TouchableOpacity 
      style={[
        styles.planCard, 
        isSelected && { borderColor: primaryColor, borderWidth: 2, backgroundColor: '#F0F9FF' }
      ]}
      onPress={onSelect}
      activeOpacity={0.8}
    >
      {isBestValue && (
        <View style={[styles.bestValueBadge, { backgroundColor: primaryColor }]}>
           <Text style={styles.bestValueText}>الأكثر طلباً</Text>
        </View>
      )}
      <View style={styles.planHeader}>
         <View style={[styles.planIconWrap, { backgroundColor: isSelected ? primaryColor : '#F1F5F9' }]}>
            <Feather name="package" size={24} color={isSelected ? '#fff' : '#64748B'} />
         </View>
         <View style={styles.planTitleWrap}>
            <Text style={styles.planName}>{plan.name}</Text>
            <Text style={styles.planDuration}>{plan.duration_days} يوم</Text>
         </View>
         <View style={styles.planPriceWrap}>
            <Text style={[styles.planPrice, { color: primaryColor }]}>{parseFloat(plan.price).toLocaleString()} {plan.currency}</Text>
         </View>
      </View>
      
      <View style={styles.planFeatures}>
         <FeatureItem text={`بحد أقصى ${plan.max_products} منتج`} isAvailable />
         <FeatureItem text={`بحد أقصى ${plan.max_categories} فئات`} isAvailable />
         <FeatureItem text="نطاق فرعي مخصص" isAvailable={plan.can_use_custom_subdomain} />
         <FeatureItem text="شراء بالجملة (Sourcing)" isAvailable={plan.can_buy_wholesale} />
         <FeatureItem text="نظام سائقي التوصيل" isAvailable={plan.enable_delivery_drivers} />
         <FeatureItem text="إخفاء شعار المنصة" isAvailable={!plan.show_system_logo} />
      </View>

      <View style={[styles.selectCircle, isSelected && { backgroundColor: primaryColor, borderColor: primaryColor }]}>
         {isSelected && <Feather name="check" size={14} color="#fff" />}
      </View>
    </TouchableOpacity>
  );
};

const FeatureItem = ({ text, isAvailable }) => (
  <View style={styles.featureItem}>
    <Feather 
      name={isAvailable ? "check-circle" : "x-circle"} 
      size={16} 
      color={isAvailable ? "#10B981" : "#94A3B8"} 
    />
    <Text style={[styles.featureText, !isAvailable && styles.featureTextDisabled]}>{text}</Text>
  </View>
);

export default function SubscriptionScreen({ navigation }) {
  const { activeMerchant } = useAuth();
  const [plans, setPlans] = useState([]);
  const [currentSub, setCurrentSub] = useState(null);
  const [loading, setLoading] = useState(true);
  const [selectedPlan, setSelectedPlan] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  const primaryColor = activeMerchant?.primary_color || '#2B5876';

  useEffect(() => {
    fetchData();
  }, [activeMerchant?.id]);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [plansRes, subRes] = await Promise.all([
        client.get('/subscriptions/plans/'),
        client.get(`/subscriptions/status/?merchant_id=${activeMerchant?.id}`)
      ]);
      
      if (plansRes.data.success) setPlans(plansRes.data.plans);
      if (subRes.data.success) setCurrentSub(subRes.data.subscription);
      
    } catch (error) {
      console.error('Subscription fetch error', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSubscribe = async () => {
    if (!selectedPlan) {
      Alert.alert('تنبيه', 'يرجى اختيار باقة أولاً');
      return;
    }
    
    setSubmitting(true);
    try {
      const res = await client.post('/subscriptions/subscribe/', {
        merchant_id: activeMerchant.id,
        plan_id: selectedPlan.id
      });
      
      if (res.data.success) {
        navigation.navigate('SubscriptionPayment', { 
          subscription: res.data.subscription 
        });
      }
    } catch (error) {
      console.error('Subscribe error', error);
      Alert.alert('خطأ', error.response?.data?.message || 'فشلت عملية الاشتراك');
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
      <StatusBar barStyle="light-content" />
      <LinearGradient colors={[primaryColor, '#4E7A96']} style={styles.header}>
        <SafeAreaView edges={['top']} style={styles.headerContent}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
            <Feather name="arrow-right" size={24} color="#fff" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>باقات الاشتراك</Text>
          <View style={{ width: 40 }} />
        </SafeAreaView>
      </LinearGradient>

      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        {currentSub && (
          <View style={styles.currentSubCard}>
            <LinearGradient colors={['#F8FAFC', '#F1F5F9']} style={styles.currentSubInner}>
              <View style={styles.statusBadge}>
                <Text style={styles.statusText}>اشتراكك الحالي</Text>
              </View>
              <Text style={styles.currentPlanName}>{currentSub.plan_name}</Text>
              <View style={styles.expiryRow}>
                <Feather name="clock" size={14} color="#64748B" />
                <Text style={styles.expiryText}>ينتهي في: {new Date(currentSub.end_date).toLocaleDateString('ar-SA')}</Text>
                <Text style={[styles.daysLeft, { color: primaryColor }]}>({currentSub.days_left} يوم متبقي)</Text>
              </View>
            </LinearGradient>
          </View>
        )}

        <View style={styles.introSection}>
          <Text style={styles.introTitle}>اختر الباقة المناسبة لنمو تجارتك</Text>
          <Text style={styles.introSub}>نقدم لك باقات متنوعة تناسب احتياجاتك وتساعدك على الوصول لعملاء أكثر</Text>
        </View>

        <View style={styles.plansList}>
          {plans.map(plan => (
            <PlanCard 
              key={plan.id} 
              plan={plan} 
              isSelected={selectedPlan?.id === plan.id}
              onSelect={() => setSelectedPlan(plan)}
              primaryColor={primaryColor}
            />
          ))}
        </View>
      </ScrollView>

      <View style={styles.footer}>
        <TouchableOpacity 
          style={[styles.submitBtn, { backgroundColor: primaryColor, opacity: selectedPlan ? 1 : 0.6 }]}
          onPress={handleSubscribe}
          disabled={!selectedPlan || submitting}
        >
          {submitting ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.submitBtnText}>اشتراك الآن</Text>
          )}
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#F8FAFC' },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  header: { paddingBottom: 20, borderBottomLeftRadius: 30, borderBottomRightRadius: 30 },
  headerContent: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, height: 60 },
  headerTitle: { color: '#fff', fontSize: 20, fontFamily: BRAND.typography.bold },
  backBtn: { width: 40, height: 40, justifyContent: 'center', alignItems: 'center' },
  
  scroll: { paddingBottom: 100 },
  introSection: { padding: 24, alignItems: 'center' },
  introTitle: { fontSize: 22, fontFamily: BRAND.typography.bold, color: '#1E293B', textAlign: 'center', marginBottom: 8 },
  introSub: { fontSize: 14, color: '#64748B', textAlign: 'center', lineHeight: 22 },
  
  currentSubCard: { padding: 16, marginTop: 10 },
  currentSubInner: { borderRadius: 20, padding: 20, borderWidth: 1, borderColor: '#E2E8F0' },
  statusBadge: { backgroundColor: '#10B981', paddingHorizontal: 12, paddingVertical: 4, borderRadius: 10, alignSelf: 'flex-start', marginBottom: 8 },
  statusText: { color: '#fff', fontSize: 11, fontFamily: BRAND.typography.bold },
  currentPlanName: { fontSize: 24, fontFamily: BRAND.typography.bold, color: '#1E293B' },
  expiryRow: { flexDirection: 'row', alignItems: 'center', marginTop: 8, gap: 6 },
  expiryText: { color: '#64748B', fontSize: 13 },
  daysLeft: { fontSize: 13, fontFamily: BRAND.typography.bold },

  plansList: { paddingHorizontal: 16, gap: 16 },
  planCard: { backgroundColor: '#fff', borderRadius: 24, padding: 20, borderWidth: 1, borderColor: '#F1F5F9', elevation: 2, shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.05, shadowRadius: 8 },
  bestValueBadge: { position: 'absolute', top: -12, left: 20, paddingHorizontal: 12, paddingVertical: 4, borderRadius: 10 },
  bestValueText: { color: '#fff', fontSize: 11, fontFamily: BRAND.typography.bold },
  planHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 20 },
  planIconWrap: { width: 50, height: 50, borderRadius: 15, justifyContent: 'center', alignItems: 'center' },
  planTitleWrap: { flex: 1, marginLeft: 12 },
  planName: { fontSize: 18, fontFamily: BRAND.typography.bold, color: '#1E293B' },
  planDuration: { fontSize: 12, color: '#94A3B8' },
  planPriceWrap: { alignItems: 'flex-end' },
  planPrice: { fontSize: 20, fontFamily: BRAND.typography.bold },
  
  planFeatures: { gap: 12, marginBottom: 20 },
  featureItem: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  featureText: { fontSize: 14, color: '#475569' },
  featureTextDisabled: { color: '#94A3B8', textDecorationLine: 'line-through' },
  
  selectCircle: { width: 24, height: 24, borderRadius: 12, borderWidth: 2, borderColor: '#E2E8F0', alignSelf: 'flex-end', justifyContent: 'center', alignItems: 'center' },
  
  footer: { position: 'absolute', bottom: 0, left: 0, right: 0, backgroundColor: '#fff', padding: 20, borderTopWidth: 1, borderTopColor: '#F1F5F9' },
  submitBtn: { height: 56, borderRadius: 16, justifyContent: 'center', alignItems: 'center' },
  submitBtnText: { color: '#fff', fontSize: 18, fontFamily: BRAND.typography.bold }
});
