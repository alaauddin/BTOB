import React, { useState, useEffect, useCallback } from 'react';
import { View, StyleSheet, TouchableOpacity, ScrollView, Image, ActivityIndicator, Alert, KeyboardAvoidingView, Platform, Dimensions, Switch, StatusBar } from 'react-native';
import { Feather, Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Video, ResizeMode } from 'expo-av';
import { LinearGradient } from 'expo-linear-gradient';
import client from '../api/client';
import Logo from '../components/Logo';
import { useAuth } from '../context/AuthContext';
import { useNotifications } from '../context/NotificationContext';
import { BRAND } from '../theme/brand';
import Text from '../components/AppText';
import TextInput from '../components/AppTextInput';

const { width } = Dimensions.get('window');

const FormSection = ({ title, icon, children }) => (
  <View style={styles.section}>
    <View style={styles.sectionHeader}>
       <View style={styles.sectionIconTitle}>
          <Feather name={icon} size={16} color={BRAND.colors.primary} />
          <Text style={styles.sectionTitle}>{title}</Text>
       </View>
    </View>
    <View style={styles.sectionBody}>
       {children}
    </View>
  </View>
);

const InputField = ({ label, icon, ...props }) => (
  <View style={styles.inputGroup}>
    <View style={styles.labelRow}>
       <Feather name={icon} size={12} color="#94A3B8" />
       <Text style={styles.inputLabel}>{label}</Text>
    </View>
    <TextInput 
      style={[styles.input, props.multiline && styles.textArea]} 
      placeholderTextColor="#CBD5E1"
      {...props} 
    />
  </View>
);

export default function MerchantProductEditScreen({ route, navigation }) {
  const { product, categories = [] } = route.params || {};
  const isEdit = !!product;
  const { activeMerchant } = useAuth();
  const { showNotification } = useNotifications();

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
      mediaTypes: ImagePicker.MediaType.Images,
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
      mediaTypes: ImagePicker.MediaType.Images,
      allowsMultipleSelection: true,
      quality: 0.7,
    });

    if (!result.canceled) {
      setAdditionalImages([...additionalImages, ...result.assets]);
    }
  };

  const pickVideo = async () => {
    let result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaType.Videos,
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

  const primaryColor = BRAND.colors.primary;

  return (
    <View style={styles.root}>
      <StatusBar barStyle="light-content" translucent backgroundColor="transparent" />
      
      <LinearGradient colors={BRAND.gradients.primary} style={styles.headerGradient}>
        <SafeAreaView edges={['top']} style={styles.safeHeader}>
           <View style={styles.headerContent}>
              <TouchableOpacity onPress={() => navigation.goBack()} style={styles.headerBtn}>
                 <Feather name="arrow-right" size={24} color="#FFF" />
              </TouchableOpacity>
              <Text style={styles.headerTitle}>{isEdit ? 'تعديل منتج' : 'إضافة منتج جديد'}</Text>
              <Logo variant="circle" size={32} />
           </View>
        </SafeAreaView>
      </LinearGradient>

      <KeyboardAvoidingView 
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'} 
        style={{ flex: 1 }}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 64 : 0}
      >
        <ScrollView style={styles.form} showsVerticalScrollIndicator={false} contentContainerStyle={{ flexGrow: 1, paddingBottom: 120 }}>
          
          {/* ── Media ── */}
          <FormSection title="الصور والوسائط" icon="image">
            <View style={styles.mediaContainer}>
              <TouchableOpacity style={styles.mainImagePicker} onPress={pickMainImage}>
                {mainImagePreview ? (
                  <Image source={{ uri: mainImagePreview }} style={styles.mainImage} />
                ) : (
                  <View style={styles.imagePlaceholder}>
                    <LinearGradient colors={['#F8FAFC', '#F1F5F9']} style={styles.placeholderGradient}>
                       <Feather name="plus" size={32} color="#CBD5E1" />
                       <Text style={styles.placeholderText}>الصورة الأساسية</Text>
                    </LinearGradient>
                  </View>
                )}
                <View style={[styles.editBadge, { backgroundColor: primaryColor }]}>
                  <Feather name="camera" size={14} color="#FFF" />
                </View>
              </TouchableOpacity>

              <View style={styles.galleryRow}>
                <TouchableOpacity style={styles.addGalleryBtn} onPress={pickAdditionalImages}>
                  <Feather name="grid" size={20} color="#64748B" />
                  <Text style={styles.addGalText}>معرض الصور</Text>
                </TouchableOpacity>
                
                <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.galleryScroll}>
                  {additionalImages.map((img, i) => (
                    <View key={`new-${i}`} style={styles.galleryItem}>
                      <Image source={{ uri: img.uri }} style={styles.galleryImg} />
                      <TouchableOpacity style={styles.removeImgBtn} onPress={() => setAdditionalImages(additionalImages.filter((_, idx) => idx !== i))}>
                        <Feather name="x" size={12} color="#FFF" />
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

              {videoPreview ? (
                <View style={styles.videoCard}>
                  <Video source={{ uri: videoPreview }} style={styles.videoPreview} useNativeControls resizeMode={ResizeMode.COVER} />
                  <TouchableOpacity style={styles.removeVideoBtn} onPress={() => { setVideo(null); setVideoPreview(null); }}>
                    <Feather name="trash-2" size={16} color="#FFF" />
                    <Text style={styles.removeVideoText}>إزالة الفيديو</Text>
                  </TouchableOpacity>
                </View>
              ) : (
                <TouchableOpacity style={styles.addVideoBtn} onPress={pickVideo}>
                  <Feather name="video" size={18} color={primaryColor} />
                  <Text style={[styles.addVideoText, { color: primaryColor }]}>أضف فيديو ترويجي للمنتج</Text>
                </TouchableOpacity>
              )}
            </View>
          </FormSection>

          {/* ── Basic Info ── */}
          <FormSection title="المعلومات الأساسية" icon="edit-3">
             <View style={styles.inputCard}>
               <InputField 
                 label="اسم المنتج" 
                 icon="box" 
                 value={name} 
                 onChangeText={setName} 
                 placeholder="أدخل الاسم بوضوح..." 
               />

               <View style={styles.priceRow}>
                 <View style={{ flex: 1.2 }}>
                   <InputField label="السعر (د.ك)" icon="dollar-sign" value={price} onChangeText={setPrice} keyboardType="numeric" placeholder="0.00" />
                 </View>
                 <View style={{ flex: 1 }}>
                   <InputField label="المخزون" icon="layers" value={stock} onChangeText={setStock} keyboardType="numeric" placeholder="0" />
                 </View>
               </View>

               <Text style={styles.subLabel}>التصنيف</Text>
               <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.catRow}>
                 {categories.map(cat => (
                   <TouchableOpacity 
                     key={cat.id} 
                     onPress={() => setCategoryId(cat.id)}
                     style={[styles.catChip, categoryId === cat.id && { backgroundColor: primaryColor, borderColor: primaryColor }]}
                   >
                     <Text style={[styles.catText, categoryId === cat.id && { color: '#FFF' }]}>{cat.name}</Text>
                   </TouchableOpacity>
                 ))}
               </ScrollView>

               <InputField label="الوصف" icon="align-right" value={description} onChangeText={setDescription} multiline placeholder="اكتب تفاصيل ومواصفات المنتج..." />
             </View>
          </FormSection>

          {/* ── Variations ── */}
          <FormSection title="الخيارات والبدائل" icon="copy">
             <TouchableOpacity style={styles.addGroupBtn} onPress={addVariationGroup}>
                <Feather name="plus-circle" size={18} color={primaryColor} />
                <Text style={[styles.addGroupText, { color: primaryColor }]}>إضافة مجموعة خيارات (مثلاً: المقاس)</Text>
             </TouchableOpacity>

             {variations.map((group, gIdx) => (
               <View key={gIdx} style={styles.variationCard}>
                 <View style={styles.groupHeader}>
                   <View style={styles.groupTitleWrap}>
                      <Feather name="tag" size={14} color={primaryColor} />
                      <TextInput style={styles.groupTitleInput} value={group.name} onChangeText={(val) => updateVariationGroupName(gIdx, val)} placeholder="اسم المجموعة..." />
                   </View>
                   <TouchableOpacity onPress={() => { const next = [...variations]; next.splice(gIdx, 1); setVariations(next); }}>
                     <Feather name="trash-2" size={18} color="#EF4444" />
                   </TouchableOpacity>
                 </View>

                 {group.options.map((opt, oIdx) => (
                   <View key={oIdx} style={styles.optionRow}>
                     <View style={styles.optValInput}>
                        <TextInput style={styles.flexInput} value={opt.value} onChangeText={(val) => updateOption(gIdx, oIdx, 'value', val)} placeholder="القيمة..." />
                     </View>
                     <View style={styles.optPriceInput}>
                        <Text style={styles.plusSign}>+</Text>
                        <TextInput style={styles.priceModInput} value={String(opt.price_modifier)} onChangeText={(val) => updateOption(gIdx, oIdx, 'price_modifier', val)} keyboardType="numeric" placeholder="0" />
                     </View>
                     <TouchableOpacity style={styles.optRemove} onPress={() => removeOption(gIdx, oIdx)}>
                        <Feather name="x" size={18} color="#CBD5E1" />
                     </TouchableOpacity>
                   </View>
                 ))}
                 
                 <TouchableOpacity style={styles.addOptLine} onPress={() => addOption(gIdx)}>
                   <Feather name="plus" size={14} color={primaryColor} />
                   <Text style={[styles.addOptText, { color: primaryColor }]}>إضافة اختيار</Text>
                 </TouchableOpacity>
               </View>
             ))}
          </FormSection>

          {/* ── Visibility ── */}
          <FormSection title="الإعدادات" icon="settings">
             <View style={styles.settingCard}>
                <View style={styles.switchItem}>
                   <View>
                      <Text style={styles.switchTitle}>تفعيل المنتج</Text>
                      <Text style={styles.switchDesc}>يظهر للعملاء عند التفعيل</Text>
                   </View>
                   <Switch value={isActive} onValueChange={setIsActive} trackColor={{ true: primaryColor }} />
                </View>
                <View style={styles.divider} />
                <View style={styles.switchItem}>
                   <View>
                      <Text style={styles.switchTitle}>تمييز كـ "جديد"</Text>
                      <Text style={styles.switchDesc}>عرض شارة المنتج الجديد</Text>
                   </View>
                   <Switch value={isNew} onValueChange={setIsNew} trackColor={{ true: primaryColor }} />
                </View>
             </View>
          </FormSection>

        </ScrollView>
      </KeyboardAvoidingView>

      <View style={styles.footer}>
        <TouchableOpacity 
          style={[styles.saveBtn, { backgroundColor: primaryColor }]} 
          onPress={handleSave}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator color="#FFF" />
          ) : (
            <LinearGradient colors={BRAND.gradients.primary} style={styles.saveGradient}>
               <Feather name="check" size={20} color="#FFF" />
               <Text style={styles.saveBtnText}>{isEdit ? 'تحديث البيانات' : 'إضافة المنتج للمتجر'}</Text>
            </LinearGradient>
          )}
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#F8FAFC' },
  headerGradient: { borderBottomLeftRadius: 30, borderBottomRightRadius: 30, paddingBottom: 15 },
  safeHeader: { paddingTop: Platform.OS === 'android' ? StatusBar.currentHeight : 0 },
  headerContent: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, height: 60 },
  headerBtn: { width: 44, height: 44, justifyContent: 'center', alignItems: 'center' },
  headerTitle: { fontSize: 20, fontFamily: BRAND.typography.bold, color: '#FFF' },

  form: { flex: 1, padding: 16 },
  section: { marginBottom: 24 },
  sectionHeader: { marginBottom: 12 },
  sectionIconTitle: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  sectionTitle: { fontSize: 15, fontFamily: BRAND.typography.bold, color: '#1E293B' },
  sectionBody: { gap: 12 },

  mediaContainer: { gap: 16 },
  mainImagePicker: { width: 140, height: 140, alignSelf: 'center', borderRadius: 24, overflow: 'hidden', borderWidth: 2, borderColor: '#E2E8F0', borderStyle: 'dashed' },
  mainImage: { width: '100%', height: '100%' },
  imagePlaceholder: { flex: 1 },
  placeholderGradient: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  placeholderText: { fontSize: 11, color: '#94A3B8', marginTop: 8, fontFamily: BRAND.typography.bold },
  editBadge: { position: 'absolute', bottom: 10, right: 10, width: 32, height: 32, borderRadius: 16, justifyContent: 'center', alignItems: 'center', borderWidth: 2, borderColor: '#FFF' },

  galleryRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  addGalleryBtn: { width: 80, height: 80, borderRadius: 20, backgroundColor: '#FFF', borderStyle: 'dashed', borderWidth: 1, borderColor: '#E2E8F0', justifyContent: 'center', alignItems: 'center', gap: 6 },
  addGalText: { fontSize: 9, color: '#64748B', fontFamily: BRAND.typography.bold },
  galleryScroll: { gap: 10 },
  galleryItem: { width: 80, height: 80, borderRadius: 20, overflow: 'hidden', borderWidth: 1, borderColor: '#F1F5F9' },
  galleryImg: { width: '100%', height: '100%' },
  removeImgBtn: { position: 'absolute', top: 5, right: 5, backgroundColor: '#EF4444', width: 20, height: 20, borderRadius: 10, justifyContent: 'center', alignItems: 'center' },

  videoCard: { borderRadius: 20, overflow: 'hidden', backgroundColor: '#000', elevation: 4 },
  videoPreview: { width: '100%', height: 180 },
  removeVideoBtn: { position: 'absolute', top: 12, right: 12, flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(239, 68, 68, 0.9)', paddingHorizontal: 12, paddingVertical: 8, borderRadius: 12, gap: 6 },
  removeVideoText: { color: '#FFF', fontSize: 12, fontFamily: BRAND.typography.bold },
  addVideoBtn: { height: 56, borderRadius: 16, backgroundColor: '#FFF', borderWidth: 1, borderColor: '#E2E8F0', borderStyle: 'dashed', flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 10 },
  addVideoText: { fontSize: 14, fontFamily: BRAND.typography.bold },

  inputCard: { backgroundColor: '#FFF', borderRadius: 24, padding: 20, borderWidth: 1, borderColor: '#F1F5F9', elevation: 2 },
  inputGroup: { marginBottom: 16 },
  labelRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 8 },
  inputLabel: { fontSize: 13, fontFamily: BRAND.typography.bold, color: '#64748B' },
  input: { backgroundColor: '#F8FAFC', borderRadius: 14, paddingHorizontal: 16, height: 52, borderWidth: 1, borderColor: '#E2E8F0', fontSize: 15, color: '#1E293B', textAlign: 'auto' },
  textArea: { height: 100, paddingTop: 12, textAlignVertical: 'top' },
  priceRow: { flexDirection: 'row', gap: 16 },
  subLabel: { fontSize: 13, fontFamily: BRAND.typography.bold, color: '#64748B', marginBottom: 10 },
  catRow: { gap: 10, paddingBottom: 15 },
  catChip: { paddingHorizontal: 20, paddingVertical: 10, borderRadius: 14, backgroundColor: '#F1F5F9', borderWidth: 1, borderColor: '#E2E8F0' },
  catText: { fontSize: 13, fontFamily: BRAND.typography.bold, color: '#64748B' },

  addGroupBtn: { height: 50, borderRadius: 14, backgroundColor: '#FFF', borderWidth: 1, borderColor: '#E2E8F0', borderStyle: 'dashed', flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 8, marginBottom: 15 },
  addGroupText: { fontSize: 13, fontFamily: BRAND.typography.bold },
  variationCard: { backgroundColor: '#FFF', borderRadius: 20, padding: 16, marginBottom: 16, borderWidth: 1, borderColor: '#F1F5F9' },
  groupHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16, paddingBottom: 12, borderBottomWidth: 1, borderBottomColor: '#F8FAFC' },
  groupTitleWrap: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 8 },
  groupTitleInput: { flex: 1, fontSize: 15, fontFamily: BRAND.typography.bold, color: '#1E293B', textAlign: 'auto' },
  optionRow: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 12 },
  optValInput: { flex: 1.5, backgroundColor: '#F8FAFC', borderRadius: 10, height: 44, paddingHorizontal: 12, borderWidth: 1, borderColor: '#E2E8F0' },
  flexInput: { flex: 1, fontSize: 14, color: '#1E293B', textAlign: 'auto' },
  optPriceInput: { flex: 1, flexDirection: 'row', alignItems: 'center', backgroundColor: '#F0F9FF', borderRadius: 10, height: 44, paddingHorizontal: 10, borderWidth: 1, borderColor: '#BAE6FD' },
  plusSign: { fontSize: 14, fontFamily: BRAND.typography.bold, color: '#0369A1', marginRight: 4 },
  priceModInput: { flex: 1, fontSize: 14, fontFamily: BRAND.typography.bold, color: '#0369A1', textAlign: 'center' },
  optRemove: { width: 32, height: 32, justifyContent: 'center', alignItems: 'center' },
  addOptLine: { flexDirection: 'row', alignItems: 'center', gap: 6, alignSelf: 'flex-start', marginTop: 4 },
  addOptText: { fontSize: 12, fontFamily: BRAND.typography.bold },

  settingCard: { backgroundColor: '#FFF', borderRadius: 24, padding: 20, borderWidth: 1, borderColor: '#F1F5F9' },
  switchItem: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  switchTitle: { fontSize: 15, fontFamily: BRAND.typography.bold, color: '#1E293B' },
  switchDesc: { fontSize: 11, color: '#94A3B8', marginTop: 2 },
  divider: { height: 1, backgroundColor: '#F1F5F9', marginVertical: 16 },

  footer: { position: 'absolute', bottom: 0, left: 0, right: 0, padding: 20, backgroundColor: '#FFF', borderTopWidth: 1, borderTopColor: '#F1F5F9' },
  saveBtn: { height: 58, borderRadius: 18, overflow: 'hidden' },
  saveGradient: { flex: 1, flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 12 },
  saveBtnText: { color: '#FFF', fontSize: 16, fontFamily: BRAND.typography.bold },
});
