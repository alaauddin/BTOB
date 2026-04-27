import React, { useState } from 'react';
import { View, StyleSheet, Modal, TouchableOpacity, ScrollView, ActivityIndicator, Alert, KeyboardAvoidingView, Platform, Dimensions } from 'react-native';
import { Feather, Ionicons } from '@expo/vector-icons';
import client from '../api/client';

import { useNotifications } from '../context/NotificationContext';
import Text from './AppText';
import TextInput from './AppTextInput';
import { BRAND } from '../theme/brand';

const { height } = Dimensions.get('window');

export default function OfferEditModal({ visible, onClose, products, onSaved, primaryColor }) {
    const { showNotification } = useNotifications();
    const [loading, setLoading] = useState(false);
    
    // Form State
    const [selectedProductId, setSelectedProductId] = useState(null);
    const [discount, setDiscount] = useState('');
    const [fromDate, setFromDate] = useState(new Date().toISOString().split('T')[0]);
    const [toDate, setToDate] = useState(new Date(Date.now() + 7 * 86400000).toISOString().split('T')[0]);

    const handleSave = async () => {
        if (!selectedProductId) return showNotification({ title: 'خطأ', message: 'يرجى اختيار المنتج', type: 'warning' });
        if (!discount || isNaN(discount)) return showNotification({ title: 'خطأ', message: 'يرجى إدخال نسبة الخصم', type: 'warning' });
        
        const discountVal = parseFloat(discount) / 100;
        if (discountVal <= 0 || discountVal >= 1) return showNotification({ title: 'خطأ', message: 'نسبة الخصم يجب أن تكون بين 1% و 99%', type: 'warning' });

        setLoading(true);
        try {
            const res = await client.post('/merchant/offers/', {
                product: selectedProductId,
                discount_precentage: discountVal,
                from_date: fromDate,
                to_date: toDate,
                is_active: true
            });

            if (res.data.success) {
                showNotification({ title: 'نجاح', message: 'تم إضافة العرض بنجاح', type: 'success' });
                onSaved();
                onClose();
                // Reset form
                setDiscount('');
                setSelectedProductId(null);
            }
        } catch (err) {
            console.error('Save offer error', err.response?.data || err);
            showNotification({ title: 'خطأ', message: 'فشل في إنشاء العرض', type: 'error' });
        } finally {
            setLoading(false);
        }
    };

    return (
        <Modal visible={visible} animationType="fade" transparent>
            <KeyboardAvoidingView 
                behavior={Platform.OS === 'ios' ? 'padding' : 'height'} 
                style={styles.overlay}
            >
                <View style={styles.container}>
                    <View style={styles.header}>
                        <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
                            <Ionicons name="close" size={24} color="#64748B" />
                        </TouchableOpacity>
                        <Text style={styles.title}>إنشاء عرض ترويجي</Text>
                        <View style={{ width: 40 }} />
                    </View>

                    <ScrollView style={styles.form} showsVerticalScrollIndicator={false}>
                        {/* Product Selection */}
                        <Text style={styles.label}>اختر المنتج</Text>
                        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.prodScroller}>
                            {products.map(prod => (
                                <TouchableOpacity 
                                    key={prod.id}
                                    onPress={() => setSelectedProductId(prod.id)}
                                    style={[
                                        styles.prodChip,
                                        selectedProductId === prod.id && { borderColor: primaryColor, backgroundColor: primaryColor + '10' }
                                    ]}
                                >
                                    <Text style={[
                                        styles.prodChipText,
                                        selectedProductId === prod.id && { color: primaryColor }
                                    ]}>
                                        {prod.name}
                                    </Text>
                                    <Text style={styles.prodPrice}>{parseFloat(prod.price).toLocaleString()} ر.ي</Text>
                                </TouchableOpacity>
                            ))}
                        </ScrollView>

                        {/* Discount Percentage */}
                        <View style={styles.inputGroup}>
                            <Text style={styles.label}>نسبة الخصم (%)</Text>
                            <View style={styles.inputWrapper}>
                                <TextInput
                                    style={styles.input}
                                    value={discount}
                                    onChangeText={setDiscount}
                                    keyboardType="numeric"
                                    placeholder="مثال: 25"
                                    textAlign="right"
                                />
                                <Feather name="percent" size={18} color="#94A3B8" style={styles.inputIcon} />
                            </View>
                        </View>

                        {/* Date Selection (Simplified as Text Inputs for now) */}
                        <View style={styles.row}>
                            <View style={{ flex: 1 }}>
                                <Text style={styles.label}>إلى تاريخ</Text>
                                <TextInput
                                    style={styles.input}
                                    value={toDate}
                                    onChangeText={setToDate}
                                    placeholder="YYYY-MM-DD"
                                    textAlign="right"
                                />
                            </View>
                            <View style={{ width: 15 }} />
                            <View style={{ flex: 1 }}>
                                <Text style={styles.label}>من تاريخ</Text>
                                <TextInput
                                    style={styles.input}
                                    value={fromDate}
                                    onChangeText={setFromDate}
                                    placeholder="YYYY-MM-DD"
                                    textAlign="right"
                                />
                            </View>
                        </View>

                        <View style={styles.tipBox}>
                            <Feather name="info" size={16} color={primaryColor} />
                            <Text style={styles.tipText}>سيظهر هذا العرض تلقائياً للعملاء كخصم مباشر على المنتج خلال الفترة المحددة.</Text>
                        </View>

                        <View style={{ height: 100 }} />
                    </ScrollView>

                    <View style={styles.footer}>
                        <TouchableOpacity 
                            style={[styles.saveBtn, { backgroundColor: primaryColor, opacity: loading ? 0.7 : 1 }]}
                            onPress={handleSave}
                            disabled={loading}
                        >
                            {loading ? (
                                <ActivityIndicator color="#fff" />
                            ) : (
                                <Text style={styles.saveBtnText}>تفعيل العرض</Text>
                            )}
                        </TouchableOpacity>
                    </View>
                </View>
            </KeyboardAvoidingView>
        </Modal>
    );
}

const styles = StyleSheet.create({
    overlay: { flex: 1, backgroundColor: 'rgba(15, 23, 42, 0.4)', justifyContent: 'center', padding: 20 },
    container: { 
        backgroundColor: '#fff', 
        borderRadius: 24, 
        maxHeight: height * 0.8,
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
    
    label: { fontSize: 14, fontFamily: BRAND.typography.bold, color: '#475569', marginBottom: 12, textAlign: 'auto' },
    
    prodScroller: { flexDirection: 'row-reverse', gap: 10, paddingBottom: 20 },
    prodChip: {
        padding: 12,
        borderRadius: 15,
        backgroundColor: '#F8FAFC',
        borderWidth: 1,
        borderColor: '#E2E8F0',
        minWidth: 120,
        alignItems: 'center'
    },
    prodChipText: { fontSize: 13, fontFamily: BRAND.typography.bold, color: '#64748B', textAlign: 'center' },
    prodPrice: { fontSize: 11, color: '#94A3B8', marginTop: 4 },

    inputGroup: { marginBottom: 20 },
    inputWrapper: { position: 'relative' },
    input: {
        backgroundColor: '#F8FAFC',
        borderWidth: 1,
        borderColor: '#E2E8F0',
        borderRadius: 12,
        padding: 15,
        fontSize: 15,
        color: '#0F172A',
    },
    inputIcon: { position: 'absolute', left: 15, top: 15 },
    
    row: { flexDirection: 'row-reverse', marginBottom: 20 },

    tipBox: {
        flexDirection: 'row-reverse',
        backgroundColor: '#F0F9FF',
        padding: 15,
        borderRadius: 12,
        gap: 10,
        alignItems: 'center'
    },
    tipText: { flex: 1, fontSize: 12, color: '#0369A1', lineHeight: 18, textAlign: 'auto' },

    footer: {
        padding: 20,
        borderTopWidth: 1,
        borderTopColor: '#F1F5F9'
    },
    saveBtn: {
        height: 52,
        borderRadius: 14,
        alignItems: 'center',
        justifyContent: 'center',
    },
    saveBtnText: { color: '#fff', fontSize: 15, fontFamily: BRAND.typography.extraBold }
});
