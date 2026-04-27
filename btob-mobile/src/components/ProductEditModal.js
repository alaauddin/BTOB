import React, { useState, useEffect } from 'react';
import { View, StyleSheet, Modal, TouchableOpacity, ScrollView, Image, ActivityIndicator, Alert, KeyboardAvoidingView, Platform, Dimensions } from 'react-native';
import { Feather, Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import client from '../api/client';
import { useNotifications } from '../context/NotificationContext';
import Text from './AppText';
import TextInput from './AppTextInput';
import { BRAND } from '../theme/brand';

const { height } = Dimensions.get('window');

export default function ProductEditModal({ visible, product, categories, onClose, onSaved }) {
    const isEdit = !!product;
    const { showNotification } = useNotifications();
    const [loading, setLoading] = useState(false);
    
    // Form State
    const [name, setName] = useState('');
    const [price, setPrice] = useState('');
    const [stock, setStock] = useState('');
    const [description, setDescription] = useState('');
    const [categoryId, setCategoryId] = useState(null);
    const [isActive, setIsActive] = useState(true);
    const [isNew, setIsNew] = useState(false);
    
    // Media State
    const [mainImage, setMainImage] = useState(null);
    const [mainImagePreview, setMainImagePreview] = useState(null);

    useEffect(() => {
        if (visible) {
            if (product) {
                setName(product.name || '');
                setPrice(String(product.price || ''));
                setStock(String(product.stock || '0'));
                setDescription(product.description || '');
                setCategoryId(product.category_id || null);
                setIsActive(product.is_active ?? true);
                setIsNew(product.is_new ?? false);
                setMainImagePreview(product.image_url || null);
                setMainImage(null);
            } else {
                setName('');
                setPrice('');
                setStock('');
                setDescription('');
                setCategoryId(categories.length > 0 ? categories[0].id : null);
                setIsActive(true);
                setIsNew(true);
                setMainImage(null);
                setMainImagePreview(null);
            }
        }
    }, [visible, product]);

    const pickImage = async () => {
        const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
        if (status !== 'granted') {
            showNotification({ title: 'عذراً', message: 'نحتاج إذن الوصول للصور لرفع صورة المنتج', type: 'warning' });
            return;
        }

        let result = await ImagePicker.launchImageLibraryAsync({
            mediaTypes: ImagePicker.MediaTypeOptions.Images,
            allowsEditing: true,
            aspect: [1, 1],
            quality: 0.8,
        });

        if (!result.canceled) {
            setMainImage(result.assets[0]);
            setMainImagePreview(result.assets[0].uri);
        }
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

            if (mainImage) {
                const uriParts = mainImage.uri.split('.');
                const fileType = uriParts[uriParts.length - 1];
                formData.append('image', {
                    uri: mainImage.uri,
                    name: `product_${Date.now()}.${fileType}`,
                    type: `image/${fileType}`,
                });
            }

            let res;
            if (isEdit) {
                formData.append('product_id', product.id);
                res = await client.patch('/merchant/products/', formData, {
                    headers: { 'Content-Type': 'multipart/form-data' },
                });
            } else {
                formData.append('merchant_id', (await client.getAuthMerchantId()) || '');
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
                onSaved();
                onClose();
            }
        } catch (err) {
            console.error('Save product error', err.response?.data || err);
            showNotification({ title: 'خطأ', message: 'حدث خطأ أثناء حفظ المنتج', type: 'error' });
        } finally {
            setLoading(false);
        }
    };

    return (
        <Modal visible={visible} animationType="slide" transparent>
            <KeyboardAvoidingView 
                behavior={Platform.OS === 'ios' ? 'padding' : 'height'} 
                style={styles.overlay}
            >
                <View style={styles.container}>
                    <View style={styles.header}>
                        <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
                            <Ionicons name="close" size={24} color="#64748B" />
                        </TouchableOpacity>
                        <Text style={styles.title}>{isEdit ? 'تعديل منتج' : 'إضافة منتج جديد'}</Text>
                        <View style={{ width: 40 }} />
                    </View>

                    <ScrollView style={styles.form} showsVerticalScrollIndicator={false}>
                        {/* Image Picker */}
                        <TouchableOpacity style={styles.imagePicker} onPress={pickImage}>
                            {mainImagePreview ? (
                                <Image source={{ uri: mainImagePreview }} style={styles.imagePreview} />
                            ) : (
                                <View style={styles.imagePlaceholder}>
                                    <Feather name="image" size={40} color="#CBD5E1" />
                                    <Text style={styles.imagePlaceholderText}>اختر صورة المنتج</Text>
                                </View>
                            )}
                            <View style={styles.editImageBadge}>
                                <Feather name="camera" size={14} color="#fff" />
                            </View>
                        </TouchableOpacity>

                        {/* Name Input */}
                        <View style={styles.inputGroup}>
                            <Text style={styles.label}>اسم المنتج</Text>
                            <TextInput
                                style={styles.input}
                                value={name}
                                onChangeText={setName}
                                placeholder="مثال: قميص قطني فاخر"
                                textAlign="right"
                            />
                        </View>

                        {/* Price & Stock Row */}
                        <View style={styles.row}>
                            <View style={[styles.inputGroup, { flex: 1 }]}>
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
                            <View style={{ width: 15 }} />
                            <View style={[styles.inputGroup, { flex: 1 }]}>
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
                        </View>

                        {/* Category Dropdown (Simplified as Horizontal List for Wow factor) */}
                        <View style={styles.inputGroup}>
                            <Text style={styles.label}>القسم</Text>
                            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.categoryScroller}>
                                {categories.map(cat => (
                                    <TouchableOpacity 
                                        key={cat.id}
                                        onPress={() => setCategoryId(cat.id)}
                                        style={[
                                            styles.catChip,
                                            categoryId === cat.id && styles.catChipActive
                                        ]}
                                    >
                                        <Text style={[
                                            styles.catChipText,
                                            categoryId === cat.id && styles.catChipTextActive
                                        ]}>
                                            {cat.name}
                                        </Text>
                                    </TouchableOpacity>
                                ))}
                            </ScrollView>
                        </View>

                        {/* Description */}
                        <View style={styles.inputGroup}>
                            <Text style={styles.label}>وصف المنتج</Text>
                            <TextInput
                                style={[styles.input, styles.textArea]}
                                value={description}
                                onChangeText={setDescription}
                                placeholder="اكتب تفاصيل المنتج هنا..."
                                multiline
                                numberOfLines={4}
                                textAlign="right"
                            />
                        </View>

                        {/* Toggles */}
                        <View style={styles.toggleRow}>
                            <TouchableOpacity 
                                style={[styles.toggleBtn, isActive && styles.toggleBtnActive]}
                                onPress={() => setIsActive(!isActive)}
                            >
                                <Feather name={isActive ? "eye" : "eye-off"} size={16} color={isActive ? "#fff" : "#64748B"} />
                                <Text style={[styles.toggleBtnText, isActive && styles.toggleBtnTextActive]}>
                                    {isActive ? "نشط" : "مخفي"}
                                </Text>
                            </TouchableOpacity>

                            <TouchableOpacity 
                                style={[styles.toggleBtn, isNew && styles.toggleBtnActive]}
                                onPress={() => setIsNew(!isNew)}
                            >
                                <Feather name="star" size={16} color={isNew ? "#fff" : "#64748B"} />
                                <Text style={[styles.toggleBtnText, isNew && styles.toggleBtnTextActive]}>
                                    {isNew ? "منتج جديد" : "عادي"}
                                </Text>
                            </TouchableOpacity>
                        </View>
                        
                        <View style={{ height: 100 }} />
                    </ScrollView>

                    {/* Footer Actions */}
                    <View style={styles.footer}>
                        <TouchableOpacity 
                            style={[styles.saveBtn, { opacity: loading ? 0.7 : 1 }]}
                            onPress={handleSave}
                            disabled={loading}
                        >
                            {loading ? (
                                <ActivityIndicator color="#fff" />
                            ) : (
                                <>
                                    <Text style={styles.saveBtnText}>{isEdit ? 'تحديث التغييرات' : 'إضافة المنتج'}</Text>
                                    <Feather name="check" size={20} color="#fff" />
                                </>
                            )}
                        </TouchableOpacity>
                    </View>
                </View>
            </KeyboardAvoidingView>
        </Modal>
    );
}

const styles = StyleSheet.create({
    overlay: { flex: 1, backgroundColor: 'rgba(15, 23, 42, 0.5)', justifyContent: 'flex-end' },
    container: { 
        backgroundColor: '#fff', 
        height: height * 0.9, 
        borderTopLeftRadius: 30, 
        borderTopRightRadius: 30,
        overflow: 'hidden'
    },
    header: {
        flexDirection: 'row-reverse',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: 20,
        borderBottomWidth: 1,
        borderBottomColor: '#F1F5F9',
    },
    closeBtn: { padding: 8, backgroundColor: '#F1F5F9', borderRadius: 12 },
    title: { fontSize: 18, fontFamily: BRAND.typography.extraBold, color: '#0F172A' },
    
    form: { padding: 20 },
    
    imagePicker: {
        width: 150,
        height: 150,
        alignSelf: 'center',
        borderRadius: 20,
        backgroundColor: '#F8FAFC',
        borderWidth: 1,
        borderColor: '#E2E8F0',
        borderStyle: 'dashed',
        marginBottom: 25,
        justifyContent: 'center',
        alignItems: 'center',
        position: 'relative'
    },
    imagePreview: { width: '100%', height: '100%', borderRadius: 19 },
    imagePlaceholder: { alignItems: 'center' },
    imagePlaceholderText: { fontSize: 12, color: '#94A3B8', marginTop: 8, fontFamily: BRAND.typography.semiBold },
    editImageBadge: {
        position: 'absolute',
        bottom: -10,
        right: -10,
        width: 32,
        height: 32,
        borderRadius: 16,
        backgroundColor: '#2B5876',
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 3,
        borderColor: '#fff'
    },

    inputGroup: { marginBottom: 20 },
    label: { fontSize: 14, fontFamily: BRAND.typography.bold, color: '#475569', marginBottom: 8, textAlign: 'auto' },
    input: {
        backgroundColor: '#F8FAFC',
        borderWidth: 1,
        borderColor: '#E2E8F0',
        borderRadius: 12,
        padding: 15,
        fontSize: 15,
        color: '#0F172A',
    },
    textArea: { height: 100, textAlignVertical: 'top' },
    row: { flexDirection: 'row-reverse' },
    
    categoryScroller: { flexDirection: 'row-reverse', gap: 10, paddingBottom: 5 },
    catChip: {
        paddingHorizontal: 16,
        paddingVertical: 10,
        borderRadius: 12,
        backgroundColor: '#F1F5F9',
        borderWidth: 1,
        borderColor: '#E2E8F0'
    },
    catChipActive: { backgroundColor: '#2B5876', borderColor: '#2B5876' },
    catChipText: { fontSize: 13, fontFamily: BRAND.typography.semiBold, color: '#64748B' },
    catChipTextActive: { color: '#fff' },

    toggleRow: { flexDirection: 'row-reverse', gap: 12, marginBottom: 20 },
    toggleBtn: {
        flex: 1,
        flexDirection: 'row-reverse',
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 12,
        borderRadius: 12,
        backgroundColor: '#F1F5F9',
        gap: 8,
        borderWidth: 1,
        borderColor: '#E2E8F0'
    },
    toggleBtnActive: { backgroundColor: '#2B5876', borderColor: '#2B5876' },
    toggleBtnText: { fontSize: 14, fontFamily: BRAND.typography.bold, color: '#64748B' },
    toggleBtnTextActive: { color: '#fff' },

    footer: {
        position: 'absolute',
        bottom: 0,
        left: 0,
        right: 0,
        padding: 20,
        backgroundColor: '#fff',
        borderTopWidth: 1,
        borderTopColor: '#F1F5F9',
        paddingBottom: Platform.OS === 'ios' ? 40 : 20
    },
    saveBtn: {
        backgroundColor: '#2B5876',
        height: 56,
        borderRadius: 16,
        flexDirection: 'row-reverse',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 10,
        elevation: 4,
        shadowColor: '#2B5876',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 8,
    },
    saveBtnText: { color: '#fff', fontSize: 16, fontFamily: BRAND.typography.extraBold }
});
