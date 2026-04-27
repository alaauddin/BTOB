import React, { useState, useEffect } from 'react';
import { View, StyleSheet, Modal, TouchableOpacity, Image, ActivityIndicator, ScrollView, Alert, Platform, Pressable } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { BlurView } from 'expo-blur';
import { LinearGradient } from 'expo-linear-gradient';
import * as ImagePicker from 'expo-image-picker';
import client from '../api/client';
import { useNotifications } from '../context/NotificationContext';
import Text from './AppText';
import { BRAND } from '../theme/brand';

export default function BrandGenModal({ visible, onClose, onSuccess, merchantId }) {
  const { showNotification } = useNotifications();
  const [isAiGenerating, setIsAiGenerating] = useState(false);
  const [aiTempLogo, setAiTempLogo] = useState(null);

  // Pre-request permissions when modal opens
  useEffect(() => {
    if (visible) {
      (async () => {
        const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
        if (status !== 'granted') {
          // We don't alert here to avoid annoying the user on open, 
          // we only alert if they actually try to pick and it's still denied.
        }
      })();
      // Reset state on open
      setAiTempLogo(null);
      setIsAiGenerating(false);
    }
  }, [visible]);

  const pickAiLogo = async () => {
    try {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') {
        showNotification({ title: 'عذراً', message: 'نحتاج إلى إذن الوصول للصور لتتمكن من اختيار الشعار', type: 'warning' });
        return;
      }

      let result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: 'images',
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.8,
      });

      if (!result.canceled && result.assets && result.assets.length > 0) {
        setAiTempLogo(result.assets[0]);
      }
    } catch (error) {
      console.error('Pick Image Error:', error);
      showNotification({ title: 'خطأ', message: 'حدث خطأ أثناء اختيار الصورة', type: 'error' });
    }
  };

  const generateAIColors = async () => {
    if (!merchantId || !aiTempLogo) {
        showNotification({ title: 'تنبيه', message: 'يرجى رفع الشعار اولا', type: 'warning' });
        return;
    }

    setIsAiGenerating(true);
    try {
        const logoFormData = new FormData();
        logoFormData.append('merchant_id', merchantId);
        
        const u = aiTempLogo.uri;
        logoFormData.append('logo', {
            uri: u, name: u.split('/').pop() || 'logo.jpg', type: 'image/jpeg'
        });

        const res = await client.post('/merchant/generate-ai-colors/', logoFormData, {
            headers: { 'Content-Type': 'multipart/form-data' }
        });

        if (res.data.success && res.data.colors) {
            onSuccess(res.data.colors);
            showNotification({
                title: 'تم التنسيق الذكي',
                message: 'تم استخراج الألوان المتناسقة من شعارك بنجاح!',
                type: 'success'
            });
            onClose();
        }
    } catch (err) {
        console.error('AI Color Gen Error:', err);
    } finally {
        setIsAiGenerating(false);
    }
  };

  return (
    <Modal
      visible={visible}
      animationType="fade"
      transparent={true}
      onRequestClose={onClose}
    >
      <View style={styles.modalOverlay}>
        <BlurView intensity={30} tint="dark" style={StyleSheet.absoluteFill} />
        <View style={styles.aiModalContent}>
          
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>تنسيق ألوان المتجر بالذكاء الاصطناعي</Text>
            <TouchableOpacity onPress={onClose} style={styles.closeModalBtn} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
              <Feather name="x" size={20} color="#64748B" />
            </TouchableOpacity>
          </View>

          <ScrollView 
            showsVerticalScrollIndicator={false} 
            contentContainerStyle={{ paddingBottom: 40 }}
            keyboardShouldPersistTaps="handled"
            removeClippedSubviews={false}
          >
            <View style={styles.aiIntroSec}>
              <View style={styles.aiIconLarge}>
                <Feather name="zap" size={32} color="#FFF" />
              </View>
              <Text style={styles.aiIntroTitle}>تحليل الشعار واستخراج الهوية</Text>
              <Text style={styles.aiIntroDesc}>
                سيقوم الذكاء الاصطناعي بتحليل شعارك واستخراج لوحة ألوان متناسقة تناسب علامتك التجارية وتضمن أفضل تجربة مستخدم.
              </Text>
            </View>

            <View style={styles.logoSelectionCard}>
              <Text style={styles.logoSelectionLabel}>الشعار المطلوب تحليله:</Text>
              <Pressable 
                style={({ pressed }) => [
                  styles.logoPreviewLarge,
                  { opacity: pressed ? 0.6 : 1, transform: [{ scale: pressed ? 0.98 : 1 }] }
                ]} 
                onPress={pickAiLogo}
                hitSlop={15}
              >
                {aiTempLogo ? (
                  <Image source={{ uri: aiTempLogo.uri }} style={styles.logoPreviewImg} />
                ) : (
                  <View style={styles.logoPlaceholderAI}>
                    <Feather name="image" size={40} color="#CBD5E1" />
                    <Text style={styles.placeholderTextAI}>اضغط لاختيار شعار</Text>
                  </View>
                )}
                <View style={styles.changeLogoOverlay}>
                  <Feather name="camera" size={16} color="#FFF" />
                  <Text style={styles.changeLogoText}>تغيير الشعار</Text>
                </View>
              </Pressable>
            </View>

            <View style={styles.aiWarningNote}>
              <Feather name="info" size={16} color="#6366F1" />
              <Text style={styles.warningNoteText}>
                يفضل استخدام شعار بخلفية شفافة أو لون موحد للحصول على أفضل النتائج.
              </Text>
            </View>

            <TouchableOpacity 
              style={[styles.generateActionBtn, !aiTempLogo && { opacity: 0.6 }]}
              disabled={isAiGenerating || !aiTempLogo}
              onPress={generateAIColors}
              activeOpacity={0.8}
            >
              <LinearGradient
                colors={isAiGenerating ? ['#6366F1', '#4F46E5'] : ['#8B5CF6', '#6366F1']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.generateGradient}
              >
                {isAiGenerating ? (
                  <View style={styles.generatingState}>
                    <ActivityIndicator color="#FFF" style={{ marginRight: 10 }} />
                    <Text style={styles.generateActionText}>جاري التحليل...</Text>
                  </View>
                ) : (
                  <>
                    <Feather name="zap" size={20} color="#FFF" />
                    <Text style={styles.generateActionText}>توليد الهوية الذكية</Text>
                  </>
                )}
              </LinearGradient>
            </TouchableOpacity>

            <TouchableOpacity 
              onPress={onClose} 
              style={styles.cancelLink}
              activeOpacity={0.6}
            >
              <Text style={styles.cancelLinkText}>إلغاء</Text>
            </TouchableOpacity>
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  modalOverlay: { flex: 1, justifyContent: 'flex-end' },
  aiModalContent: {
    backgroundColor: '#FFF', borderTopLeftRadius: 32, borderTopRightRadius: 32,
    paddingTop: 8, paddingBottom: Platform.OS === 'ios' ? 40 : 20,
    maxHeight: '90%', shadowColor: '#000', shadowOffset: { width: 0, height: -10 },
    shadowOpacity: 0.1, shadowRadius: 20, elevation: 20
  },
  modalHeader: {
    flexDirection: 'row-reverse', justifyContent: 'space-between', alignItems: 'center',
    paddingHorizontal: 20, paddingVertical: 16, borderBottomWidth: 1, borderBottomColor: '#F1F5F9'
  },
  modalTitle: { fontSize: 16, fontFamily: BRAND.typography.extraBold, color: '#0F172A', textAlign: 'auto' },
  closeModalBtn: { width: 36, height: 36, borderRadius: 18, backgroundColor: '#F8FAFC', justifyContent: 'center', alignItems: 'center' },
  
  aiIntroSec: { alignItems: 'center', padding: 24, paddingBottom: 16 },
  aiIconLarge: {
    width: 64, height: 64, borderRadius: 20, backgroundColor: '#8B5CF6',
    justifyContent: 'center', alignItems: 'center', marginBottom: 16,
    shadowColor: '#8B5CF6', shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3, shadowRadius: 15, elevation: 10
  },
  aiIntroTitle: { fontSize: 20, fontFamily: BRAND.typography.extraBold, color: '#1E293B', marginBottom: 8, textAlign: 'center' },
  aiIntroDesc: { fontSize: 14, color: '#64748B', textAlign: 'center', lineHeight: 22, paddingHorizontal: 20 },
  
  logoSelectionCard: {
    margin: 20, padding: 20, borderRadius: 24, backgroundColor: '#F8FAFC',
    borderWidth: 2, borderColor: '#F1F5F9', borderStyle: 'dashed'
  },
  logoSelectionLabel: { fontSize: 14, fontFamily: BRAND.typography.bold, color: '#475569', marginBottom: 16, textAlign: 'auto' },
  logoPreviewLarge: {
    aspectRatio: 1, backgroundColor: '#FFF', borderRadius: 20, overflow: 'hidden',
    borderWidth: 1, borderColor: '#E2E8F0', justifyContent: 'center', alignItems: 'center'
  },
  logoPreviewImg: { width: '100%', height: '100%', resizeMode: 'contain' },
  logoPlaceholderAI: { alignItems: 'center', gap: 12 },
  placeholderTextAI: { fontSize: 14, color: '#94A3B8', fontFamily: BRAND.typography.semiBold },
  changeLogoOverlay: {
    position: 'absolute', bottom: 12, alignSelf: 'center',
    flexDirection: 'row-reverse', alignItems: 'center', gap: 6,
    backgroundColor: 'rgba(15, 23, 42, 0.7)', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 12
  },
  changeLogoText: { color: '#FFF', fontSize: 11, fontFamily: BRAND.typography.bold },
  
  aiWarningNote: {
    flexDirection: 'row-reverse', alignItems: 'center', gap: 10,
    marginHorizontal: 24, marginBottom: 24, padding: 12,
    backgroundColor: '#F5F3FF', borderRadius: 12
  },
  warningNoteText: { flex: 1, fontSize: 12, color: '#6366F1', fontFamily: BRAND.typography.semiBold, textAlign: 'auto' },
  
  generateActionBtn: { marginHorizontal: 20, marginBottom: 16, borderRadius: 20, overflow: 'hidden', elevation: 8, shadowColor: '#6366F1', shadowOpacity: 0.3, shadowRadius: 10 },
  generateGradient: {
    height: 60, flexDirection: 'row-reverse', alignItems: 'center',
    justifyContent: 'center', gap: 10
  },
  generateActionText: { color: '#FFF', fontSize: 17, fontFamily: BRAND.typography.extraBold },
  generatingState: { 
    flexDirection: 'row-reverse', 
    alignItems: 'center', justifyContent: 'center'
  },
  
  cancelLink: { paddingVertical: 12, alignItems: 'center' },
  cancelLinkText: { color: '#94A3B8', fontSize: 14, fontFamily: BRAND.typography.extraBold },
});
