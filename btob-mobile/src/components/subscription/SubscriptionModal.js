import React, { useState, useEffect } from 'react';
import { View, Modal, ScrollView, TouchableOpacity, ActivityIndicator, Alert } from 'react-native';
import { Feather } from '@expo/vector-icons';
import client from '../../api/client';
import { useAuth } from '../../context/AuthContext';
import { useNavigation } from '@react-navigation/native';
import { BRAND } from '../../theme/brand';
import styles from './styles';
import PlanCard from './PlanCard';
import Benefit from './Benefit';
import Text from '../AppText';

export default function SubscriptionModal({ visible, onClose }) {
  const { activeMerchant, subErrorData, setSubErrorData } = useAuth();
  const navigation = useNavigation();
  const [plans, setPlans] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedPlan, setSelectedPlan] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (visible) {
      fetchPlans();
    }
  }, [visible]);

  const isUnderReview = subErrorData?.error_code === 'PAYMENT_UNDER_REVIEW';

  const fetchPlans = async () => {
    setLoading(true);
    try {
      const res = await client.get('/subscriptions/plans/');
      if (res.data.success) {
        setPlans(res.data.plans);
        if (res.data.plans.length > 0) setSelectedPlan(res.data.plans[0]);
      }
    } catch (error) {
      console.error('Fetch plans error', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSubscribe = async () => {
    if (!selectedPlan) return;
    setSubmitting(true);
    try {
      const res = await client.post('/subscriptions/subscribe/', {
        merchant_id: activeMerchant.id,
        plan_id: selectedPlan.id
      });
      if (res.data.success) {
        onClose();
        navigation.navigate('SubscriptionPayment', { subscription: res.data.subscription });
      }
    } catch (error) {
      Alert.alert('خطأ', error.response?.data?.message || 'فشلت عملية الاشتراك');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={styles.overlay}>
        <View style={styles.modalSheet}>
          <View style={styles.handle} />
          
          <View style={styles.header}>
            <Text style={styles.title}>
              {isUnderReview ? 'طلبك قيد المراجعة' : 'تنبيه: يلزم الاشتراك'}
            </Text>
            <Text style={styles.subtitle}>
              {isUnderReview 
                ? subErrorData.message 
                : 'يبدو أن اشتراكك قد انتهى أو لم يتم تفعيله بعد. اختر باقة للمتابعة.'
              }
            </Text>
            {isUnderReview && subErrorData.contact_number && (
              <View style={styles.contactBox}>
                <Text style={styles.contactText}>للتواصل والتفعيل السريع: {subErrorData.contact_number}</Text>
                <Feather name="phone-call" size={16} color={BRAND.colors.slate[600]} style={{ marginStart: 10 }} />
              </View>
            )}
          </View>

          {loading ? (
            <View style={styles.loaderWrap}>
              <ActivityIndicator size="large" color={BRAND.colors.primary} />
            </View>
          ) : (
            <ScrollView style={styles.plansScroll} showsVerticalScrollIndicator={false}>
              {plans.map(plan => (
                <PlanCard 
                  key={plan.id} 
                  plan={plan} 
                  isSelected={selectedPlan?.id === plan.id} 
                  onSelect={() => setSelectedPlan(plan)}
                />
              ))}
              
              {selectedPlan?.features?.length > 0 && (
                <View style={styles.benefitsBox}>
                  <Text style={styles.benefitsTitle}>مميزات باقة {selectedPlan.name}:</Text>
                  {selectedPlan.features.map(feat => (
                    <Benefit key={feat.id} item={feat.title} isIncluded={feat.is_included} />
                  ))}
                </View>
              )}
            </ScrollView>
          )}

          <View style={styles.footer}>
            {!isUnderReview && (
              <TouchableOpacity 
                style={[styles.subscribeBtn, { backgroundColor: BRAND.colors.primary }]} 
                onPress={handleSubscribe}
                disabled={submitting || loading}
              >
                {submitting ? (
                  <ActivityIndicator color={BRAND.colors.white} />
                ) : (
                  <Text style={styles.subscribeBtnText}>اشتراك ومتابعة</Text>
                )}
              </TouchableOpacity>
            )}
            
            <TouchableOpacity 
              style={styles.cancelBtn} 
              onPress={() => {
                setSubErrorData(null);
                onClose();
              }}
            >
              <Text style={styles.cancelBtnText}>إلغاء</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}
