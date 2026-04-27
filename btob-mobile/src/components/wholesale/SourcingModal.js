import React, { useState, useEffect } from 'react';
import { View, StyleSheet, TouchableOpacity, Image, Modal, ScrollView, ActivityIndicator, Platform } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { adjustColor } from '../../utils/color';
import Text from '../AppText';
import TextInput from '../AppTextInput';
import { BRAND } from '../../theme/brand';

/**
 * SourcingModal.js
 * 
 * A modal component for configuring and confirming the import (sourcing) 
 * of a wholesale product into the merchant's store.
 */
const SourcingModal = ({ visible, product, onClose, onSource, primaryColor }) => {
  const [customPrice, setCustomPrice] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (product) {
      setCustomPrice(product.sale_price.toString());
    }
  }, [product]);

  const handleSource = async () => {
    if (!product?.id) return;
    setIsSubmitting(true);
    try {
      await onSource(product.id, customPrice);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!product) return null;

  const profit = parseFloat(customPrice || 0) - parseFloat(product.purchase_price);

  return (
    <Modal visible={visible} animationType="slide" transparent>
      <View style={styles.modalOverlay}>
        <View style={styles.modalContent}>
          <View style={styles.modalHeader}>
            <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
              <Feather name="x" size={24} color="#64748B" />
            </TouchableOpacity>
            <Text style={styles.modalTitle}>استيراد منتج</Text>
          </View>

          <ScrollView showsVerticalScrollIndicator={false}>
            <Image source={{ uri: product.image }} style={styles.modalImage} />
            
            <View style={styles.modalBody}>
              <Text style={styles.modalProductName}>{product.name}</Text>
              <Text style={styles.modalWholesaler}>{product.wholesaler_name} • {product.category_name}</Text>
              
              <View style={styles.statsRow}>
                <View style={[styles.statItem, { backgroundColor: '#F1F5F9' }]}>
                  <Text style={styles.statLabel}>تكلفة الجملة</Text>
                  <Text style={styles.statValue}>{product.purchase_price} ر.ي</Text>
                </View>
                <View style={[styles.statItem, { backgroundColor: adjustColor(primaryColor, 180) }]}>
                  <Text style={[styles.statLabel, { color: primaryColor }]}>ربحك المتوقع</Text>
                  <Text style={[styles.statValue, { color: primaryColor }]}>{profit.toFixed(0)} ر.ي</Text>
                </View>
              </View>

              <View style={styles.inputSec}>
                <Text style={styles.inputLabel}>حدد سعر البيع في متجرك</Text>
                <View style={styles.priceInputRow}>
                  <TextInput
                    style={styles.priceInput}
                    value={customPrice}
                    onChangeText={setCustomPrice}
                    keyboardType="numeric"
                    placeholder="أدخل السعر..."
                  />
                  <Text style={styles.currencyLabel}>ر.ي</Text>
                </View>
                <Text style={styles.inputHint}>السعر المقترح من المورد: {product.sale_price} ر.ي</Text>
              </View>

              <View style={styles.infoCard}>
                <Feather name="info" size={18} color="#3B82F6" />
                <Text style={styles.infoText}>
                  عند الاستيراد، سيتم نسخ بيانات المنتج وصوره إلى متجرك، وستتمكن من تعديلها لاحقاً.
                </Text>
              </View>
            </View>
          </ScrollView>

          <View style={styles.modalFooter}>
            <TouchableOpacity 
              style={[styles.sourceBtn, { backgroundColor: primaryColor }]}
              onPress={handleSource}
              disabled={isSubmitting}
            >
              {isSubmitting ? (
                <ActivityIndicator color="#FFF" />
              ) : (
                <>
                  <Feather name="download-cloud" size={20} color="#FFF" style={{ marginLeft: 8 }} />
                  <Text style={styles.sourceBtnText}>تأكيد الاستيراد</Text>
                </>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#FFF',
    borderTopLeftRadius: 32,
    borderTopRightRadius: 32,
    height: '90%',
  },
  modalHeader: {
    flexDirection: 'row-reverse',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  modalTitle: {
    fontSize: 18,
    fontFamily: BRAND.typography.extraBold,
    color: '#1E293B',
  },
  closeBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#F8FAFC',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalImage: {
    width: '100%',
    height: 250,
    resizeMode: 'cover',
  },
  modalBody: {
    padding: 20,
  },
  modalProductName: {
    fontSize: 22,
    fontFamily: BRAND.typography.extraBold,
    color: '#0F172A',
    textAlign: 'auto',
  },
  modalWholesaler: {
    fontSize: 14,
    color: '#64748B',
    textAlign: 'auto',
    marginTop: 4,
  },
  statsRow: {
    flexDirection: 'row-reverse',
    gap: 12,
    marginTop: 20,
  },
  statItem: {
    flex: 1,
    padding: 16,
    borderRadius: 16,
    alignItems: 'center',
  },
  statLabel: {
    fontSize: 12,
    color: '#64748B',
    marginBottom: 4,
  },
  statValue: {
    fontSize: 16,
    fontFamily: BRAND.typography.extraBold,
    color: '#1E293B',
  },
  inputSec: {
    marginTop: 24,
  },
  inputLabel: {
    fontSize: 15,
    fontFamily: BRAND.typography.bold,
    color: '#334155',
    textAlign: 'auto',
    marginBottom: 12,
  },
  priceInputRow: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    paddingHorizontal: 16,
  },
  priceInput: {
    flex: 1,
    height: 56,
    fontSize: 20,
    fontFamily: BRAND.typography.bold,
    color: '#1E293B',
    textAlign: 'auto',
  },
  currencyLabel: {
    fontSize: 16,
    fontFamily: BRAND.typography.extraBold,
    color: '#94A3B8',
    marginRight: 10,
  },
  inputHint: {
    fontSize: 12,
    color: '#94A3B8',
    textAlign: 'auto',
    marginTop: 8,
  },
  infoCard: {
    flexDirection: 'row-reverse',
    backgroundColor: '#EFF6FF',
    padding: 16,
    borderRadius: 16,
    marginTop: 24,
    gap: 12,
    alignItems: 'center',
  },
  infoText: {
    flex: 1,
    fontSize: 13,
    color: '#1E40AF',
    lineHeight: 20,
    textAlign: 'auto',
  },
  modalFooter: {
    padding: 20,
    paddingBottom: Platform?.OS === 'ios' ? 40 : 20,
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
  },
  sourceBtn: {
    height: 56,
    borderRadius: 16,
    flexDirection: 'row-reverse',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 10,
    elevation: 4,
  },
  sourceBtnText: {
    color: '#FFF',
    fontSize: 16,
    fontFamily: BRAND.typography.extraBold,
  },
});

export default SourcingModal;
