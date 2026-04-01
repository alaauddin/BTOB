import React, { useState, useEffect, useCallback } from 'react';
import {
    View, Text, StyleSheet, FlatList, TouchableOpacity, 
    ActivityIndicator, RefreshControl, Dimensions, Alert, Image
} from 'react-native';
import { Feather, MaterialCommunityIcons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { useAuth } from '../context/AuthContext';
import client from '../api/client';
import OfferEditModal from '../components/OfferEditModal';

const { width } = Dimensions.get('window');

const OfferCard = ({ item, primaryColor, onDelete }) => {
    const today = new Date();
    const toDate = new Date(item.to_date);
    const isExpired = toDate < today;

    return (
        <View style={styles.card}>
            <LinearGradient
                colors={['#fff', '#F8FAFC']}
                style={styles.cardGradient}
            >
                <View style={styles.cardHeader}>
                    <View style={styles.productInfo}>
                        <Text style={styles.productName}>{item.product_name}</Text>
                        <Text style={styles.originalPrice}>السعر الأصلي: {parseFloat(item.product_price).toLocaleString()} ر.ي</Text>
                    </View>
                    <View style={[styles.discountBadge, { backgroundColor: primaryColor + '15' }]}>
                        <Text style={[styles.discountText, { color: primaryColor }]}>{item.discount_percentage}%-</Text>
                    </View>
                </View>

                <View style={styles.divider} />

                <View style={styles.cardBody}>
                    <View style={styles.statusRow}>
                        <View style={[styles.statusIndicator, { backgroundColor: isExpired ? '#EF4444' : (item.is_active ? '#22C55E' : '#94A3B8') }]} />
                        <Text style={styles.statusText}>
                            {isExpired ? 'منتهي' : (item.is_active ? 'نشط حالياً' : 'متوقف')}
                        </Text>
                    </View>

                    <View style={styles.dateRow}>
                        <Feather name="calendar" size={14} color="#64748B" />
                        <Text style={styles.dateText}>من {item.from_date} إلى {item.to_date}</Text>
                    </View>
                </View>

                <View style={styles.actions}>
                    <TouchableOpacity style={styles.deleteBtn} onPress={() => onDelete(item)}>
                        <Feather name="trash-2" size={16} color="#EF4444" />
                        <Text style={styles.deleteBtnText}>إلغاء العرض</Text>
                    </TouchableOpacity>
                </View>
            </LinearGradient>
        </View>
    );
};

export default function MerchantOffersScreen() {
    const { activeMerchant } = useAuth();
    const primaryColor = activeMerchant?.primary_color || '#2B5876';

    const [offers, setOffers] = useState([]);
    const [products, setProducts] = useState([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [modalVisible, setModalVisible] = useState(false);

    const fetchData = useCallback(async (silent = false) => {
        if (!activeMerchant?.id) return;
        if (!silent) setLoading(true);
        try {
            const [offRes, prodRes] = await Promise.all([
                client.get(`/merchant/offers/?merchant_id=${activeMerchant.id}`),
                client.get(`/merchant/products/?merchant_id=${activeMerchant.id}`)
            ]);
            if (offRes.data.success) setOffers(offRes.data.offers);
            if (prodRes.data.success) setProducts(prodRes.data.products);
        } catch (err) {
            console.error('Fetch offers error', err);
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    }, [activeMerchant?.id]);

    useEffect(() => {
        fetchData();
    }, [fetchData]);

    const onRefresh = () => {
        setRefreshing(true);
        fetchData(true);
    };

    const handleDelete = (offer) => {
        Alert.alert(
            'إلغاء العرض',
            'هل أنت متأكد من رغبتك في حذف هذا العرض الترويجي؟',
            [
                { text: 'تراجع', style: 'cancel' },
                { 
                    text: 'تأكيد الحذف', 
                    style: 'destructive',
                    onPress: async () => {
                        try {
                            const res = await client.delete(`/merchant/offers/?offer_id=${offer.id}&merchant_id=${activeMerchant.id}`);
                            if (res.data.success) {
                                setOffers(prev => prev.filter(o => o.id !== offer.id));
                            }
                        } catch (err) {
                            Alert.alert('خطأ', 'فشل في حذف العرض');
                        }
                    }
                }
            ]
        );
    };

    if (loading && !refreshing) {
        return (
            <View style={styles.centered}>
                <ActivityIndicator size="large" color={primaryColor} />
            </View>
        );
    }

    return (
        <SafeAreaView style={styles.root} edges={['top']}>
            <View style={styles.header}>
                <View>
                    <Text style={styles.headerTitle}>العروض الترويجية</Text>
                    <Text style={styles.headerSubtitle}>إدارة الخصومات والحملات</Text>
                </View>
                <TouchableOpacity 
                    style={[styles.addButton, { backgroundColor: primaryColor }]}
                    onPress={() => setModalVisible(true)}
                >
                    <Feather name="plus" size={20} color="#fff" />
                    <Text style={styles.addButtonText}>عرض جديد</Text>
                </TouchableOpacity>
            </View>

            <FlatList
                data={offers}
                keyExtractor={item => item.id.toString()}
                renderItem={({ item }) => (
                    <OfferCard 
                        item={item} 
                        primaryColor={primaryColor} 
                        onDelete={handleDelete}
                    />
                )}
                contentContainerStyle={styles.listContent}
                showsVerticalScrollIndicator={false}
                refreshControl={
                    <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={primaryColor} />
                }
                ListEmptyComponent={
                    <View style={styles.emptyContainer}>
                        <MaterialCommunityIcons name="tag-off-outline" size={64} color="#CBD5E1" />
                        <Text style={styles.emptyTitle}>لا توجد عروض فعالة</Text>
                        <Text style={styles.emptySubtitle}>ابدأ بإضافة خصومات لزيادة مبيعاتك!</Text>
                    </View>
                }
            />

            <OfferEditModal 
                visible={modalVisible}
                onClose={() => setModalVisible(false)}
                products={products}
                onSaved={fetchData}
                primaryColor={primaryColor}
            />
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    root: { flex: 1, backgroundColor: '#F8FAFC' },
    centered: { flex: 1, justifyContent: 'center', alignItems: 'center' },
    
    header: {
        flexDirection: 'row-reverse',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingHorizontal: 20,
        paddingVertical: 18,
        backgroundColor: '#fff',
        borderBottomWidth: 1,
        borderBottomColor: '#F1F5F9',
    },
    headerTitle: { fontSize: 24, fontWeight: '800', color: '#0F172A', textAlign: 'right' },
    headerSubtitle: { fontSize: 13, color: '#64748B', textAlign: 'right', marginTop: 2 },
    addButton: {
        flexDirection: 'row-reverse',
        alignItems: 'center',
        paddingHorizontal: 16,
        paddingVertical: 10,
        borderRadius: 12,
        gap: 8,
    },
    addButtonText: { color: '#fff', fontSize: 14, fontWeight: '700' },

    listContent: { paddingHorizontal: 20, paddingBottom: 40, paddingTop: 15 },
    card: {
        borderRadius: 20,
        marginBottom: 16,
        elevation: 3,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.08,
        shadowRadius: 6,
        overflow: 'hidden',
        borderWidth: 1,
        borderColor: '#F1F5F9',
    },
    cardGradient: { padding: 18 },
    cardHeader: { flexDirection: 'row-reverse', justifyContent: 'space-between', alignItems: 'flex-start' },
    productInfo: { flex: 1, marginRight: 12 },
    productName: { fontSize: 17, fontWeight: '800', color: '#0F172A', textAlign: 'right' },
    originalPrice: { fontSize: 13, color: '#94A3B8', textAlign: 'right', marginTop: 4 },
    
    discountBadge: {
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 10,
    },
    discountText: { fontSize: 18, fontWeight: '900' },

    divider: { height: 1, backgroundColor: '#F1F5F9', marginVertical: 15 },
    
    cardBody: { flexDirection: 'row-reverse', justifyContent: 'space-between', alignItems: 'center' },
    statusRow: { flexDirection: 'row-reverse', alignItems: 'center', gap: 8 },
    statusIndicator: { width: 8, height: 8, borderRadius: 4 },
    statusText: { fontSize: 13, color: '#475569', fontWeight: '600' },
    
    dateRow: { flexDirection: 'row-reverse', alignItems: 'center', gap: 6 },
    dateText: { fontSize: 12, color: '#64748B', fontWeight: '500' },

    actions: { 
        borderTopWidth: 1, 
        borderTopColor: '#F1F5F9', 
        marginTop: 15, 
        paddingTop: 15,
        alignItems: 'flex-start'
    },
    deleteBtn: { flexDirection: 'row-reverse', alignItems: 'center', gap: 6 },
    deleteBtnText: { fontSize: 13, fontWeight: '700', color: '#EF4444' },

    emptyContainer: { alignItems: 'center', marginTop: 80 },
    emptyTitle: { fontSize: 18, fontWeight: '800', color: '#1E293B', marginTop: 20 },
    emptySubtitle: { fontSize: 14, color: '#64748B', textAlign: 'center', marginTop: 8 },
});
