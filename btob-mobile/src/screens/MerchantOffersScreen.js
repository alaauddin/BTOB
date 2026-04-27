import React, { useState, useEffect, useCallback } from 'react';
import { View, StyleSheet, FlatList, TouchableOpacity, ActivityIndicator, RefreshControl, Dimensions, Alert, Image, StatusBar, Platform } from 'react-native';
import { Feather, MaterialCommunityIcons, Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { useAuth } from '../context/AuthContext';
import { useNotifications } from '../context/NotificationContext';
import client from '../api/client';
import OfferEditModal from '../components/OfferEditModal';
import { BRAND } from '../theme/brand';
import Logo from '../components/Logo';
import Text from '../components/AppText';

const { width } = Dimensions.get('window');

const OfferCard = ({ item, curr, onDelete }) => {
    const today = new Date();
    const toDate = new Date(item.to_date);
    const isExpired = toDate < today;
    const primaryColor = BRAND.colors.primary;

    return (
        <View style={styles.card}>
            <View style={styles.cardContent}>
                <View style={styles.cardTop}>
                    <View style={styles.productBlock}>
                        <View style={[styles.productIconBox, { backgroundColor: primaryColor + '10' }]}>
                           <MaterialCommunityIcons name="tag-outline" size={20} color={primaryColor} />
                        </View>
                        <View style={styles.textContainer}>
                           <Text style={styles.productName} numberOfLines={1}>{item.product_name}</Text>
                           <Text style={styles.priceInfo}>السعر الأصلي: {parseFloat(item.product_price).toLocaleString()} {curr}</Text>
                        </View>
                    </View>
                    <View style={[styles.percentageBadge, { backgroundColor: BRAND.colors.secondary }]}>
                        <Text style={styles.percentageText}>{item.discount_percentage}%-</Text>
                    </View>
                </View>

                <View style={styles.middleRow}>
                    <View style={styles.infoPill}>
                        <View style={[styles.statusDot, { backgroundColor: isExpired ? '#EF4444' : (item.is_active ? '#22C55E' : '#94A3B8') }]} />
                        <Text style={styles.statusLabel}>
                            {isExpired ? 'منتهي' : (item.is_active ? 'نشط' : 'متوقف')}
                        </Text>
                    </View>
                    <View style={styles.dateBlock}>
                        <Feather name="calendar" size={12} color="#94A3B8" />
                        <Text style={styles.dateRangeText}>{item.from_date} ↔ {item.to_date}</Text>
                    </View>
                </View>

                <View style={styles.cardFooter}>
                    <TouchableOpacity style={styles.deleteBtn} onPress={() => onDelete(item)}>
                        <Feather name="trash-2" size={14} color="#EF4444" />
                        <Text style={styles.deleteText}>إزالة العرض</Text>
                    </TouchableOpacity>
                    
                    <View style={styles.verifiedBox}>
                       <Ionicons name="shield-checkmark" size={14} color="#10B981" />
                       <Text style={styles.verifiedText}>عرض معتمد</Text>
                    </View>
                </View>
            </View>
        </View>
    );
};

export default function MerchantOffersScreen() {
    const { activeMerchant } = useAuth();
    const { showNotification } = useNotifications();
    const primaryColor = BRAND.colors.primary;
    const curr = activeMerchant?.currency?.symbol || 'د.ك';

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
                client.get(`/merchant/offers/?merchant_id=${activeMerchant?.id}`),
                client.get(`/merchant/products/?merchant_id=${activeMerchant?.id}`)
            ]);
            if (offRes.data.success) setOffers(offRes.data.offers);
            if (prodRes.data.success) setProducts(prodRes.data.products);
        } catch (err) {
            if (err.response?.status !== 402) {
                console.error('Fetch offers error', err);
                showNotification({ title: 'خطأ', message: 'فشل في تحميل البيانات', type: 'error' });
            }
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
            'حذف العرض',
            'هل أنت متأكد من رغبتك في حذف هذا العرض الترويجي بشكل نهائي؟',
            [
                { text: 'تراجع', style: 'cancel' },
                { 
                    text: 'تأكيد الحذف', 
                    style: 'destructive',
                    onPress: async () => {
                        try {
                            const res = await client.delete(`/merchant/offers/?offer_id=${offer.id}&merchant_id=${activeMerchant?.id}`);
                            if (res.data.success) {
                                setOffers(prev => prev.filter(o => o.id !== offer.id));
                                showNotification({ title: 'نجاح', message: 'تم حذف العرض بنجاح', type: 'success' });
                            }
                        } catch (err) {
                            showNotification({ title: 'خطأ', message: 'فشل في حذف العرض', type: 'error' });
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
                <Text style={styles.loadingText}>جاري تحميل العروض...</Text>
            </View>
        );
    }

    return (
        <View style={styles.root}>
            <StatusBar barStyle="light-content" translucent backgroundColor="transparent" />
            
            <LinearGradient colors={BRAND.gradients.primary} style={styles.headerGradient}>
                <SafeAreaView edges={['top']} style={styles.safeHeader}>
                    <View style={styles.headerContent}>
                        <View style={styles.headerRight}>
                            <Logo variant="circle" size={36} />
                        </View>
                        <View style={styles.titleArea}>
                            <Text style={styles.headerTitle}>العروض</Text>
                            <View style={styles.activeBadge}>
                               <Text style={styles.activeBadgeText}>{offers.length} عروض نشطة</Text>
                            </View>
                        </View>
                        
                        <TouchableOpacity 
                            style={styles.addButton}
                            onPress={() => setModalVisible(true)}
                        >
                            <LinearGradient colors={['rgba(255,255,255,0.3)', 'rgba(255,255,255,0.1)']} style={styles.addBtnInner}>
                                <Feather name="plus" size={20} color="#FFF" />
                                <Text style={styles.addBtnText}>إنشاء</Text>
                            </LinearGradient>
                        </TouchableOpacity>
                    </View>
                </SafeAreaView>
            </LinearGradient>

            <FlatList
                data={offers}
                keyExtractor={item => item.id.toString()}
                renderItem={({ item }) => (
                    <OfferCard 
                        item={item} 
                        curr={curr} 
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
                        <View style={styles.emptyIconBox}>
                           <MaterialCommunityIcons name="tag-multiple-outline" size={64} color="#CBD5E1" />
                        </View>
                        <Text style={styles.emptyTitle}>قائمة العروض فارغة</Text>
                        <Text style={styles.emptySubtitle}>قم بإضافة عروض ترويجية لزيادة مبيعاتك وجذب المزيد من العملاء</Text>
                        <TouchableOpacity style={[styles.emptyBtn, { backgroundColor: primaryColor }]} onPress={() => setModalVisible(true)}>
                           <Text style={styles.emptyBtnText}>ابدأ الآن</Text>
                        </TouchableOpacity>
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
        </View>
    );
}

const styles = StyleSheet.create({
    root: { flex: 1, backgroundColor: '#F8FAFC' },
    centered: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#F8FAFC' },
    loadingText: { marginTop: 12, color: '#64748B', fontSize: 13 },
    
    headerGradient: { borderBottomLeftRadius: 30, borderBottomRightRadius: 30, paddingBottom: 15 },
    safeHeader: { paddingTop: Platform.OS === 'android' ? StatusBar.currentHeight : 0 },
    headerContent: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, height: 70 },
    headerRight: { marginRight: 15 },
    titleArea: { flex: 1 },
    headerTitle: { fontSize: 26, fontFamily: BRAND.typography.bold, color: '#FFF' },
    activeBadge: { backgroundColor: 'rgba(255,255,255,0.2)', paddingHorizontal: 8, paddingVertical: 2, borderRadius: 6, alignSelf: 'flex-start', marginTop: 4 },
    activeBadgeText: { color: '#FFF', fontSize: 10, fontFamily: BRAND.typography.bold },
    
    addButton: { borderRadius: 12, overflow: 'hidden' },
    addBtnInner: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 10, gap: 8 },
    addBtnText: { color: '#FFF', fontSize: 14, fontFamily: BRAND.typography.bold },

    listContent: { paddingHorizontal: 20, paddingBottom: 40, paddingTop: 20 },
    card: {
        backgroundColor: '#FFF',
        borderRadius: 24,
        marginBottom: 16,
        borderWidth: 1,
        borderColor: '#F1F5F9',
        elevation: 3,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.05,
        shadowRadius: 8,
        overflow: 'hidden'
    },
    cardContent: { padding: 20 },
    cardTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
    productBlock: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 12 },
    productIconBox: { width: 40, height: 40, borderRadius: 12, justifyContent: 'center', alignItems: 'center' },
    textContainer: { flex: 1 },
    productName: { fontSize: 16, fontFamily: BRAND.typography.bold, color: '#1E293B' },
    priceInfo: { fontSize: 12, color: '#94A3B8', marginTop: 2 },
    
    percentageBadge: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 10 },
    percentageText: { color: '#FFF', fontSize: 18, fontFamily: BRAND.typography.extraBold },

    middleRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: '#F8FAFC', padding: 12, borderRadius: 14 },
    infoPill: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: '#FFF', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8, borderWidth: 1, borderColor: '#F1F5F9' },
    statusDot: { width: 8, height: 8, borderRadius: 4 },
    statusLabel: { fontSize: 12, fontFamily: BRAND.typography.bold, color: '#475569' },
    
    dateBlock: { flexDirection: 'row', alignItems: 'center', gap: 6 },
    dateRangeText: { fontSize: 11, color: '#64748B', fontFamily: BRAND.typography.bold },

    cardFooter: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 16, paddingTop: 16, borderTopWidth: 1, borderTopColor: '#F1F5F9' },
    deleteBtn: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: '#FEF2F2', paddingHorizontal: 12, paddingVertical: 8, borderRadius: 10 },
    deleteText: { fontSize: 12, fontFamily: BRAND.typography.bold, color: '#EF4444' },
    
    verifiedBox: { flexDirection: 'row', alignItems: 'center', gap: 6 },
    verifiedText: { fontSize: 11, fontFamily: BRAND.typography.bold, color: '#10B981' },

    emptyContainer: { alignItems: 'center', marginTop: 60, paddingHorizontal: 40 },
    emptyIconBox: { width: 120, height: 120, borderRadius: 60, backgroundColor: '#F1F5F9', justifyContent: 'center', alignItems: 'center', marginBottom: 24 },
    emptyTitle: { fontSize: 20, fontFamily: BRAND.typography.bold, color: '#1E293B', marginBottom: 8 },
    emptySubtitle: { fontSize: 14, color: '#64748B', textAlign: 'center', lineHeight: 22, marginBottom: 24 },
    emptyBtn: { paddingHorizontal: 40, paddingVertical: 14, borderRadius: 16, elevation: 4 },
    emptyBtnText: { color: '#FFF', fontSize: 16, fontFamily: BRAND.typography.bold },
});
