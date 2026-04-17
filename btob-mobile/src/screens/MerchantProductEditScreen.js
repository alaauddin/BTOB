import React, { useState, useEffect, useCallback } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, TextInput,
  ScrollView, Image, ActivityIndicator, Alert, KeyboardAvoidingView,
  Platform, Dimensions, Switch
} from 'react-native';
import { Feather, Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Video, ResizeMode } from 'expo-av';
import { LinearGradient } from 'expo-linear-gradient';
import client from '../api/client';
import { useAuth } from '../context/AuthContext';
import { useNotifications } from '../context/NotificationContext';

const { width } = Dimensions.get('window');

export default function MerchantProductEditScreen({ route, navigation }) {
  const { product, categories = [] } = route.params || {};
  const isEdit = !!product;
  const { activeMerchant } = useAuth();
  const { showNotification } = useNotifications();
  const primaryColor = activeMerchant?.primary_color || '#2B5876';

  const [loading, setLoading] = useState(false);
  
  // Form State
  const [name, setName] = useState(product?.name || '');
  const [price, setPrice] = useState(String(product?.price || ''));
  const [stock, setStock] = useState(String(product?.stock || '0'));
  const [description, setDescription] = useState(product?.description || '');
  const [categoryId, setCategoryId] = useState(product?.category_id || categories?.[0]?.id);
  const [isActive, setIsActive] = useState(product?.is_active ?? true);
  const [isNew, setIsNew] = useState(product?.is_new ?? false);
  
  // Media State
  const [mainImage, setMainImage] = useState(null);
  const [mainImagePreview, setMainImagePreview] = useState(product?.image_url || null);
  const [additionalImages, setAdditionalImages] = useState([]);
  const [existingAdditionalImages, setExistingAdditionalImages] = useState(product?.extra_images || []);

  const [variations, setVariations] = useState(product?.attributes || []);

  // Video State
  const [video, setVideo] = useState(null);
  const [videoPreview, setVideoPreview] = useState(product?.video_url || null);

  const pickMainImage = async () => {
    let result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.7,
    });

    if (!result.canceled) {
      setMainImage(result.assets[0]);
      setMainImagePreview(result.assets[0].uri);
    }
  };

  const pickAdditionalImages = async () => {
    let result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsMultipleSelection: true,
      quality: 0.7,
    });

    if (!result.canceled) {
      setAdditionalImages([...additionalImages, ...result.assets]);
    }
  };

  const pickVideo = async () => {
    let result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Videos,
      allowsEditing: true,
      quality: 0.7,
    });

    if (!result.canceled) {
      setVideo(result.assets[0]);
      setVideoPreview(result.assets[0].uri);
    }
  };

  const addVariationGroup = () => {
    setVariations([...variations, { name: '', options: [{ value: '', price_modifier: 0 }] }]);
  };

  const updateVariationGroupName = (index, value) => {
    const next = [...variations];
    next[index].name = value;
    setVariations(next);
  };

  const addOption = (groupIndex) => {
    const next = [...variations];
    next[groupIndex].options.push({ value: '', price_modifier: 0 });
    setVariations(next);
  };

  const updateOption = (groupIndex, optIndex, field, value) => {
    const next = [...variations];
    next[groupIndex].options[optIndex][field] = value;
    setVariations(next);
  };

  const removeOption = (groupIndex, optIndex) => {
    const next = [...variations];
    next[groupIndex].options.splice(optIndex, 1);
    if (next[groupIndex].options.length === 0) {
      next.splice(groupIndex, 1);
    }
    setVariations(next);
  };

  const handleSave = async () => {
    if (!name.trim()) return showNotification({ title: 'خطأ', message: 'يرجى إدخال اسم المنتج', type: 'warning' });
    if (!price.trim()) return showNotification({ title: 'خطأ', message: 'يرجى إدخال السعر', type: 'warning' });
    if (!categoryId) return showNotification({ title: 'خطأ', message: 'يرجى اختيار القسم', type: 'warning' });

    setLoading(true);
    try {
      const formData = new FormData();
      formData.append('name', name);
      formData.append('price', price);
      formData.append('stock', stock);
      formData.append('description', description);
      formData.append('category_id', categoryId);
      formData.append('is_active', isActive);
      formData.append('is_new', isNew);
      formData.append('merchant_id', activeMerchant.id);

      // Simple Variations processing: only send non-empty ones
      const cleanedVariations = (variations || []).filter(v => 
        v && v.name && typeof v.name === 'string' && v.name.trim() && 
        v.options && Array.isArray(v.options) && v.options.some(o => o && o.value && typeof o.value === 'string' && o.value.trim())
      );
      formData.append('variations', JSON.stringify(cleanedVariations));

      if (mainImage) {
        const uriParts = mainImage.uri.split('.');
        const fileType = uriParts[uriParts.length - 1];
        formData.append('image', {
          uri: mainImage.uri,
          name: `main_${Date.now()}.${fileType}`,
          type: `image/${fileType}`,
        });
      }

      additionalImages.forEach((img, idx) => {
        const uriParts = img.uri.split('.');
        const fileType = uriParts[uriParts.length - 1];
        formData.append('additional_images', {
          uri: img.uri,
          name: `gal_${idx}_${Date.now()}.${fileType}`,
          type: `image/${fileType}`,
        });
      });

      if (video) {
        const uriParts = video.uri.split('.');
        const fileType = uriParts[uriParts.length - 1] || 'mp4';
        formData.append('video', {
          uri: video.uri,
          name: `vid_${Date.now()}.${fileType}`,
          type: `video/${fileType}`,
        });
      }

      let res;
      if (isEdit) {
        formData.append('product_id', product.id);
        res = await client.patch('/merchant/products/', formData, {
          headers: { 'Content-Type': 'multipart/form-data' },
        });
      } else {
        res = await client.post('/merchant/products/', formData, {
          headers: { 'Content-Type': 'multipart/form-data' },
        });
      }

      if (res.data.success) {
        showNotification({ 
          title: 'نجاح', 
          message: isEdit ? 'تم تحديث المنتج بنجاح' : 'تم إضافة المنتج بنجاح', 
          type: 'success' 
        });
        navigation.goBack();
        if (route.params?.onSaved) route.params.onSaved();
      }
    } catch (err) {
      console.error('Save error', err.response?.data || err);
      showNotification({ title: 'خطأ', message: 'فشل في حفظ المنتج', type: 'error' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.root} edges={['top', 'bottom']}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Feather name="arrow-right" size={24} color="#0F172A" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{isEdit ? 'تعديل منتج' : 'منتج جديد'}</Text>
        <View style={{ width: 40 }} />
      </View>

      <KeyboardAvoidingView 
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'} 
        style={{ flex: 1 }}
      >
        <ScrollView style={styles.form} showsVerticalScrollIndicator={false}>
          {/* Media Section */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>الصور والوسائط</Text>
            <View style={styles.mediaRow}>
              <TouchableOpacity style={styles.mainImagePicker} onPress={pickMainImage}>
                {mainImagePreview ? (
                  <Image source={{ uri: mainImagePreview }} style={styles.mainImage} />
                ) : (
                  <View style={styles.imagePlaceholder}>
                    <Feather name="image" size={32} color="#CBD5E1" />
                    <Text style={styles.placeholderText}>الصورة الأساسية</Text>
                  </View>
                )}
                <View style={[styles.editBadge, { backgroundColor: primaryColor }]}>
                  <Feather name="camera" size={14} color="#fff" />
                </View>
              </TouchableOpacity>

              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.galleryScroller}>
                <TouchableOpacity style={styles.addGalleryBtn} onPress={pickAdditionalImages}>
                  <Feather name="plus" size={24} color="#64748B" />
                </TouchableOpacity>
                
                {additionalImages.map((img, i) => (
                  <View key={`new-${i}`} style={styles.galleryItem}>
                    <Image source={{ uri: img.uri }} style={styles.galleryImg} />
                    <TouchableOpacity 
                      style={styles.removeImgBtn} 
                      onPress={() => setAdditionalImages(additionalImages.filter((_, idx) => idx !== i))}
                    >
                      <Feather name="x" size={12} color="#fff" />
                    </TouchableOpacity>
                  </View>
                ))}
                
                {existingAdditionalImages.map((url, i) => (
                  <View key={`ext-${i}`} style={styles.galleryItem}>
                    <Image source={{ uri: url }} style={styles.galleryImg} />
                  </View>
                ))}
              </ScrollView>
            </View>

            {/* Video Preview Section */}
            {videoPreview && (
              <View style={styles.videoPreviewContainer}>
                <Video
                  source={{ uri: videoPreview }}
                  style={styles.videoPreview}
                  useNativeControls
                  resizeMode={ResizeMode.COVER}
                />
                <TouchableOpacity 
                   style={styles.removeVideoBtn}
                   onPress={() => { setVideo(null); setVideoPreview(null); }}
                >
                   <Feather name="trash-2" size={16} color="#fff" />
                   <Text style={{ color: '#fff', fontSize: 12, fontWeight: '700', marginLeft: 5 }}>إزالة الفيديو</Text>
                </TouchableOpacity>
              </View>
            )}

            {!videoPreview && (
              <TouchableOpacity style={styles.addVideoBtn} onPress={pickVideo}>
                <Feather name="video" size={20} color={primaryColor} />
                <Text style={{ color: primaryColor, fontWeight: '700', marginLeft: 10 }}>إضافة فيديو للمنتج</Text>
              </TouchableOpacity>
            )}
          </View>

          {/* Basic Info Section */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>المعلومات الأساسية</Text>
            
            <View style={styles.inputCard}>
              <Text style={styles.label}>اسم المنتج</Text>
              <TextInput 
                style={styles.input} 
                value={name} 
                onChangeText={setName} 
                placeholder="أدخل اسم المنتج..."
                textAlign="right"
              />

              <View style={styles.formRow}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.label}>السعر (ر.ي)</Text>
                  <TextInput 
                    style={styles.input} 
                    value={price} 
                    onChangeText={setPrice} 
                    keyboardType="numeric"
                    placeholder="0.00"
                    textAlign="right"
                  />
                </View>
                <View style={{ width: 15 }} />
                <View style={{ flex: 1 }}>
                  <Text style={styles.label}>المخزون</Text>
                  <TextInput 
                    style={styles.input} 
                    value={stock} 
                    onChangeText={setStock} 
                    keyboardType="numeric"
                    placeholder="0"
                    textAlign="right"
                  />
                </View>
              </View>

              <Text style={styles.label}>القسم</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.catRow}>
                {categories.map(cat => (
                  <TouchableOpacity 
                    key={cat.id} 
                    onPress={() => setCategoryId(cat.id)}
                    style={[styles.catChip, categoryId === cat.id && { backgroundColor: primaryColor, borderColor: primaryColor }]}
                  >
                    <Text style={[styles.catText, categoryId === cat.id && { color: '#fff' }]}>{cat.name}</Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>

              <Text style={styles.label}>وصف المنتج</Text>
              <TextInput 
                style={[styles.input, styles.textArea]} 
                value={description} 
                onChangeText={setDescription} 
                multiline
                placeholder="اكتب تفاصيل المنتج..."
                textAlign="right"
              />
            </View>
          </View>

          {/* Variations Section */}
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>الخيارات (المقاس، اللون، إلخ)</Text>
              <TouchableOpacity onPress={addVariationGroup}>
                <Text style={{ color: primaryColor, fontWeight: '700', fontSize: 13 }}>+ إضافة مجموعة</Text>
              </TouchableOpacity>
            </View>

            {variations.map((group, gIdx) => (
              <View key={gIdx} style={styles.variationGroup}>
                <View style={styles.groupHeader}>
                  <TextInput 
                    style={styles.groupTitleInput}
                    value={group.name}
                    onChangeText={(val) => updateVariationGroupName(gIdx, val)}
                    placeholder="اسم المجموعة (مثلاً: اللون)"
                    textAlign="right"
                  />
                  <TouchableOpacity onPress={() => {
                    const next = [...variations];
                    next.splice(gIdx, 1);
                    setVariations(next);
                  }}>
                    <Feather name="trash-2" size={16} color="#EF4444" />
                  </TouchableOpacity>
                </View>

                {(group.options || []).map((opt, oIdx) => (
                  <View key={oIdx} style={styles.optionRow}>
                    <TouchableOpacity onPress={() => removeOption(gIdx, oIdx)}>
                      <Feather name="minus-circle" size={20} color="#EF4444" />
                    </TouchableOpacity>
                    
                    <View style={styles.priceModInput}>
                      <Text style={styles.plusSign}>+</Text>
                      <TextInput 
                        style={styles.modInput}
                        value={String(opt.price_modifier)}
                        onChangeText={(val) => updateOption(gIdx, oIdx, 'price_modifier', val)}
                        keyboardType="numeric"
                        placeholder="0"
                      />
                    </View>

                    <TextInput 
                      style={[styles.input, { flex: 1, height: 44 }]}
                      value={opt.value}
                      onChangeText={(val) => updateOption(gIdx, oIdx, 'value', val)}
                      placeholder="القيمة (مثلاً: أحمر)"
                      textAlign="right"
                    />
                  </View>
                ))}
                
                <TouchableOpacity style={styles.addOptBtn} onPress={() => addOption(gIdx)}>
                  <Feather name="plus-circle" size={16} color={primaryColor} />
                  <Text style={{ color: primaryColor, fontWeight: '600', fontSize: 12 }}>إضافة قيمة</Text>
                </TouchableOpacity>
              </View>
            ))}
          </View>

          {/* Settings Section */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>الإعدادات</Text>
            <View style={styles.inputCard}>
              <View style={styles.switchRow}>
                <View>
                  <Text style={styles.switchLabel}>الحالة (نشط/مخفي)</Text>
                  <Text style={styles.switchSublabel}>هل يظهر المنتج للعملاء في المتجر؟</Text>
                </View>
                <Switch 
                  value={isActive} 
                  onValueChange={setIsActive} 
                  trackColor={{ true: primaryColor }}
                />
              </View>
              <View style={[styles.switchRow, { borderTopWidth: 1, borderTopColor: '#F1F5F9', marginTop: 15, paddingTop: 15 }]}>
                <View>
                  <Text style={styles.switchLabel}>منتج جديد</Text>
                  <Text style={styles.switchSublabel}>عرض شارة "جديد" على المنتج</Text>
                </View>
                <Switch 
                  value={isNew} 
                  onValueChange={setIsNew} 
                  trackColor={{ true: primaryColor }}
                />
              </View>
            </View>
          </View>
          
          <View style={{ height: 100 }} />
        </ScrollView>
      </KeyboardAvoidingView>

      {/* Persistent Save Button */}
      <View style={styles.footer}>
        <TouchableOpacity 
          style={[styles.saveBtn, { backgroundColor: primaryColor, opacity: loading ? 0.7 : 1 }]} 
          onPress={handleSave}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <>
              <Text style={styles.saveText}>{isEdit ? 'حفظ التغييرات' : 'إضافة المنتج للمتجر'}</Text>
              <Feather name="check-circle" size={20} color="#fff" />
            </>
          )}
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#F8FAFC' },
  header: {
    flexDirection: 'row-reverse',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 15,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  headerTitle: { fontSize: 18, fontWeight: '800', color: '#0F172A' },
  backBtn: { padding: 8, backgroundColor: '#F1F5F9', borderRadius: 12 },

  form: { flex: 1, padding: 20 },
  section: { marginBottom: 30 },
  sectionHeader: { flexDirection: 'row-reverse', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  sectionTitle: { fontSize: 15, fontWeight: '800', color: '#64748B', marginBottom: 12, textAlign: 'right' },
  
  mediaRow: { flexDirection: 'row-reverse', alignItems: 'center' },
  mainImagePicker: {
    width: 100,
    height: 100,
    borderRadius: 20,
    backgroundColor: '#fff',
    borderWidth: 2,
    borderColor: '#E2E8F0',
    borderStyle: 'dashed',
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative'
  },
  mainImage: { width: '100%', height: '100%', borderRadius: 18 },
  imagePlaceholder: { alignItems: 'center' },
  placeholderText: { fontSize: 9, color: '#94A3B8', marginTop: 4, fontWeight: '700' },
  editBadge: {
    position: 'absolute',
    bottom: -5,
    right: -5,
    width: 28,
    height: 28,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#fff'
  },
  
  galleryScroller: { marginRight: 15 },
  addGalleryBtn: {
    width: 60,
    height: 60,
    borderRadius: 15,
    backgroundColor: '#F1F5F9',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderStyle: 'dashed',
    marginRight: 10
  },
  galleryItem: { position: 'relative', marginRight: 10 },
  galleryImg: { width: 60, height: 60, borderRadius: 15 },
  removeImgBtn: {
    position: 'absolute',
    top: -5,
    right: -5,
    backgroundColor: '#EF4444',
    width: 18,
    height: 18,
    borderRadius: 9,
    justifyContent: 'center',
    alignItems: 'center'
  },

  inputCard: {
    backgroundColor: '#fff',
    borderRadius: 20,
    padding: 20,
    borderWidth: 1,
    borderColor: '#F1F5F9',
  },
  label: { fontSize: 13, fontWeight: '700', color: '#475569', marginBottom: 8, textAlign: 'right' },
  input: {
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 12,
    padding: 12,
    fontSize: 14,
    color: '#0F172A',
    marginBottom: 20
  },
  formRow: { flexDirection: 'row-reverse' },
  textArea: { height: 100, textAlignVertical: 'top' },
  catRow: { flexDirection: 'row-reverse', gap: 10, paddingBottom: 10, marginBottom: 10 },
  catChip: {
    paddingHorizontal: 15,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: '#F1F5F9',
    borderWidth: 1,
    borderColor: '#E2E8F0'
  },
  catText: { fontSize: 12, fontWeight: '700', color: '#64748B' },

  variationGroup: {
    backgroundColor: '#fff',
    borderRadius: 20,
    padding: 15,
    marginBottom: 15,
    borderWidth: 1,
    borderColor: '#F1F5F9',
  },
  groupHeader: { flexDirection: 'row-reverse', justifyContent: 'space-between', alignItems: 'center', marginBottom: 15 },
  groupTitleInput: { fontSize: 14, fontWeight: '800', color: '#0F172A', flex: 1, marginLeft: 10 },
  
  optionRow: { flexDirection: 'row-reverse', alignItems: 'center', gap: 10, marginBottom: 10 },
  priceModInput: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    backgroundColor: '#F0F9FF',
    borderRadius: 12,
    paddingHorizontal: 10,
    height: 44,
    borderWidth: 1,
    borderColor: '#BAE6FD'
  },
  plusSign: { fontSize: 12, color: '#0369A1', fontWeight: '800' },
  modInput: { width: 40, textAlign: 'center', fontSize: 13, fontWeight: '700', color: '#0369A1' },
  addOptBtn: { flexDirection: 'row-reverse', alignItems: 'center', gap: 6, marginTop: 5 },

  switchRow: { flexDirection: 'row-reverse', justifyContent: 'space-between', alignItems: 'center' },
  switchLabel: { fontSize: 14, fontWeight: '700', color: '#1E293B', textAlign: 'right' },
  switchSublabel: { fontSize: 11, color: '#94A3B8', marginTop: 2, textAlign: 'right' },

  footer: {
    padding: 20,
    backgroundColor: '#fff',
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
  },
  saveBtn: {
    height: 56,
    borderRadius: 16,
    flexDirection: 'row-reverse',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8
  },
  saveText: { color: '#fff', fontSize: 16, fontWeight: '800' },

  // Video Preview Styles
  videoPreviewContainer: {
    marginTop: 20,
    backgroundColor: '#000',
    borderRadius: 20,
    overflow: 'hidden',
    position: 'relative'
  },
  videoPreview: {
    width: '100%',
    height: 200,
  },
  removeVideoBtn: {
    position: 'absolute',
    top: 15,
    left: 15,
    backgroundColor: 'rgba(239, 68, 68, 0.9)',
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 12,
  },
  addVideoBtn: {
    marginTop: 15,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderStyle: 'dashed',
    borderRadius: 15,
    paddingVertical: 12,
  }
});
