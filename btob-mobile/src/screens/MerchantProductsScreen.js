import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity,
  Image, ActivityIndicator, TextInput, RefreshControl,
  StatusBar, Dimensions, Alert
} from 'react-native';
import { Feather, Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import client from '../api/client';
import { useAuth } from '../context/AuthContext';
import { useNotifications } from '../context/NotificationContext';

const { width } = Dimensions.get('window');

const FILTERS = [
  { id: 'all', label: 'الكل', icon: 'list' },
  { id: 'active', label: 'نشط', icon: 'eye' },
  { id: 'inactive', label: 'مخفي', icon: 'eye-off' },
];

export default function MerchantProductsScreen({ navigation }) {
  const { activeMerchant } = useAuth();
  const { showNotification } = useNotifications();
  const primaryColor = activeMerchant?.primary_color || '#2B5876';

  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategoryId, setSelectedCategoryId] = useState(null);
  const [activeTab, setActiveTab] = useState('all');
  const [stats, setStats] = useState({ total: 0, active: 0, inactive: 0 });

  const fetchData = useCallback(async (isRefresh = false) => {
    if (!activeMerchant?.id) return;
    if (!isRefresh) setLoading(true);
    try {
      const prodRes = await client.get('/merchant/products/', {
        params: {
          merchant_id: activeMerchant?.id,
          q: searchQuery,
          category_id: selectedCategoryId,
          status: activeTab
        }
      });
      if (prodRes.data.success) {
        setProducts(prodRes.data.products || []);
        const total = (prodRes.data.products || []).length;
        setStats({ total, active: total, inactive: 0 });
      }

      const catRes = await client.get('/merchant/product-categories/');
      if (catRes.data.success) {
        setCategories(catRes.data.categories || []);
      }
    } catch (error) {
      console.error('Fetch error', error);
      showNotification({ title: 'خطأ', message: 'فشل في تحميل البيانات', type: 'error' });
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [activeMerchant?.id, searchQuery, selectedCategoryId, activeTab]);

  useEffect(() => {
    const delayDebounceFn = setTimeout(() => {
      fetchData();
    }, 500);
    return () => clearTimeout(delayDebounceFn);
  }, [searchQuery, selectedCategoryId, activeTab, fetchData]);

  const onRefresh = () => {
    setRefreshing(true);
    fetchData(true);
  };

  const toggleProductStatus = async (product) => {
    try {
      const res = await client.patch('/merchant/products/', {
        product_id: product.id,
        is_active: !product.is_active
      });
      if (res.data.success) {
        fetchData(true);
      }
    } catch (e) {
      showNotification({ title: 'خطأ', message: 'فشل في تحديث الحالة', type: 'error' });
    }
  };

  const deleteProduct = (productId) => {
    Alert.alert('تنبيه', 'هل أنت متأكد من حذف هذا المنتج؟', [
      { text: 'إلغاء', style: 'cancel' },
      { 
        text: 'حذف', 
        style: 'destructive',
        onPress: async () => {
          try {
            const res = await client.delete('/merchant/products/', { params: { product_id: productId } });
            if (res.data.success) fetchData(true);
          } catch (e) {
            showNotification({ title: 'خطأ', message: 'فشل الحذف', type: 'error' });
          }
        }
      }
    ]);
  };

  const openAddScreen = () => {
    navigation.navigate('MerchantProductEdit', { categories, onSaved: fetchData });
  };

  const openEditScreen = (product) => {
    navigation.navigate('MerchantProductEdit', { product, categories, onSaved: fetchData });
  };

  if (loading && !refreshing) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color={primaryColor} />
        <Text style={styles.loadingText}>جاري التحميل...</Text>
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.root} edges={['top']}>
      <StatusBar barStyle="dark-content" />
      <View style={styles.header}>
        <View>
          <Text style={styles.headerTitle}>قائمة المنتجات</Text>
          <Text style={styles.headerSubtitle}>{stats.total} منتج مسجل</Text>
        </View>
        <TouchableOpacity style={[styles.addButton, { backgroundColor: primaryColor }]} onPress={openAddScreen}>
          <Feather name="plus" size={20} color="#fff" />
          <Text style={styles.addButtonText}>منتج جديد</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.tabContainer}>
        {(FILTERS || []).map(tab => (
          <TouchableOpacity key={tab.id} onPress={() => setActiveTab(tab.id)} style={[styles.tabItem, activeTab === tab.id && { borderBottomColor: primaryColor }]}>
            <Feather name={tab.id === 'all' ? 'list' : (tab.id === 'active' ? 'eye' : 'eye-off')} size={14} color={activeTab === tab.id ? primaryColor : '#94A3B8'} />
            <Text style={[styles.tabText, activeTab === tab.id && { color: primaryColor, fontWeight: '800' }]}>{tab.label}</Text>
          </TouchableOpacity>
        ))}
      </View>

      <View style={styles.filterSection}>
        <View style={styles.searchBar}>
          <Feather name="search" size={18} color="#94A3B8" />
          <TextInput style={styles.searchInput} placeholder="البحث بالاسم..." value={searchQuery} onChangeText={setSearchQuery} placeholderTextColor="#94A3B8" />
        </View>
        <FlatList
          horizontal
          data={[{ id: null, name: 'الكل' }, ...(categories || [])]}
          keyExtractor={item => (item.id || 'all').toString()}
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.categoryList}
          renderItem={({ item }) => (
            <TouchableOpacity onPress={() => setSelectedCategoryId(item.id)} style={[styles.categoryChip, selectedCategoryId === item.id && { backgroundColor: primaryColor, borderColor: primaryColor }]}>
              <Text style={[styles.categoryChipText, selectedCategoryId === item.id && { color: '#fff' }]}>{item.name}</Text>
            </TouchableOpacity>
          )}
        />
      </View>

      <FlatList
        data={products}
        keyExtractor={item => item.id.toString()}
        contentContainerStyle={styles.listContent}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        ListEmptyComponent={() => (
          <View style={styles.emptyContainer}>
            <View style={styles.emptyIconContainer}><Feather name="package" size={50} color="#CBD5E1" /></View>
            <Text style={styles.emptyText}>لا يوجد منتجات</Text>
            <Text style={styles.emptySubtext}>لم نجد أي منتجات تطابق بحثك أو في هذا القسم.</Text>
          </View>
        )}
        renderItem={({ item }) => (
          <View style={styles.card}>
            <View style={styles.cardRow}>
              <View style={styles.imageContainer}>
                {item.image_url ? (
                  <Image source={{ uri: item.image_url }} style={styles.productImage} />
                ) : (
                  <View style={styles.placeholderImage}><Ionicons name="image-outline" size={30} color="#CBD5E1" /></View>
                )}
                {!item.is_active && <View style={styles.inactiveOverlay}><Text style={styles.inactiveText}>مخفي</Text></View>}
                {item.is_new && <LinearGradient colors={[primaryColor, primaryColor + '99']} style={styles.newBadge}><Text style={styles.newBadgeText}>NEW</Text></LinearGradient>}
              </View>
              <View style={styles.infoContainer}>
                <View style={styles.nameRow}>
                  <Text style={styles.productName} numberOfLines={1}>{item.name}</Text>
                  <TouchableOpacity onPress={() => toggleProductStatus(item)} style={styles.visibilityIcon}><Feather name={item.is_active ? "eye" : "eye-off"} size={16} color={item.is_active ? primaryColor : "#94A3B8"} /></TouchableOpacity>
                </View>
                <View style={styles.priceRow}>
                  <Text style={[styles.price, { color: primaryColor }]}>{item.price_after_discount || item.price}</Text>
                  <Text style={[styles.currencySymbol, { color: primaryColor }]}>ر.ي</Text>
                  {item.has_discount && <Text style={styles.oldPrice}>{item.price} ر.ي</Text>}
                </View>
                <View style={styles.stockRow}>
                  <View style={[styles.stockBadge, item.stock > 0 ? (item.stock < 10 ? styles.bgOrange : styles.bgGreen) : styles.bgRed]}>
                    <Text style={[styles.stockText, item.stock > 0 ? (item.stock < 10 ? styles.textOrange : styles.textGreen) : styles.textRed]}>{item.stock > 0 ? `متوفر: ${item.stock}` : 'غير متوفر'}</Text>
                  </View>
                </View>
              </View>
            </View>
            <View style={styles.cardActions}>
              <TouchableOpacity onPress={() => openEditScreen(item)} style={styles.actionBtn}><Feather name="edit-2" size={14} color="#64748B" /><Text style={styles.actionBtnText}>تعديل</Text></TouchableOpacity>
              <View style={styles.actionDivider} />
              <TouchableOpacity onPress={() => deleteProduct(item.id)} style={styles.actionBtn}><Feather name="trash-2" size={14} color="#EF4444" /><Text style={[styles.actionBtnText, { color: '#EF4444' }]}>حذف</Text></TouchableOpacity>
            </View>
          </View>
        )}
      />
      <TouchableOpacity style={styles.offersFab} onPress={() => navigation.navigate('MerchantOffers')}>
        <LinearGradient colors={[primaryColor, primaryColor + 'cc']} style={styles.fabGradient}><Ionicons name="pricetag-outline" size={24} color="#fff" /></LinearGradient>
      </TouchableOpacity>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#F8FAFC' },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#fff' },
  loadingText: { marginTop: 12, color: '#64748B', fontSize: 14, fontWeight: '500' },
  header: { flexDirection: 'row-reverse', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 20, paddingVertical: 18, backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: '#F1F5F9' },
  headerTitle: { fontSize: 24, fontWeight: '800', color: '#0F172A', textAlign: 'right' },
  headerSubtitle: { fontSize: 13, color: '#64748B', textAlign: 'right', marginTop: 2 },
  addButton: { flexDirection: 'row-reverse', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 10, borderRadius: 12, gap: 8, elevation: 4 },
  addButtonText: { color: '#fff', fontSize: 14, fontWeight: '700' },
  tabContainer: { flexDirection: 'row-reverse', backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: '#F1F5F9', paddingHorizontal: 10 },
  tabItem: { flex: 1, paddingVertical: 12, alignItems: 'center', justifyContent: 'center', flexDirection: 'row-reverse', gap: 6, borderBottomWidth: 3, borderBottomColor: 'transparent' },
  tabText: { fontSize: 13, fontWeight: '600', color: '#94A3B8' },
  filterSection: { backgroundColor: '#fff', paddingBottom: 15, borderBottomWidth: 1, borderBottomColor: '#F1F5F9' },
  searchBar: { backgroundColor: '#F1F5F9', flexDirection: 'row-reverse', alignItems: 'center', marginHorizontal: 20, marginTop: 15, paddingHorizontal: 15, height: 48, borderRadius: 15, gap: 12 },
  searchInput: { flex: 1, fontSize: 15, color: '#0F172A', textAlign: 'right' },
  categoryList: { paddingHorizontal: 20, marginTop: 15, gap: 10, flexDirection: 'row-reverse' },
  categoryChip: { paddingHorizontal: 16, paddingVertical: 8, borderRadius: 20, backgroundColor: '#fff', borderWidth: 1, borderColor: '#E2E8F0' },
  categoryChipText: { fontSize: 13, fontWeight: '600', color: '#64748B' },
  listContent: { paddingHorizontal: 20, paddingBottom: 120, paddingTop: 15 },
  card: { backgroundColor: '#fff', borderRadius: 20, marginBottom: 16, elevation: 3, overflow: 'hidden', borderWidth: 1, borderColor: '#F1F5F9' },
  cardRow: { flexDirection: 'row-reverse', padding: 15 },
  imageContainer: { width: 90, height: 90, borderRadius: 15, backgroundColor: '#F8FAFC', overflow: 'hidden', borderWidth: 1, borderColor: '#F1F5F9' },
  productImage: { width: '100%', height: '100%', resizeMode: 'cover' },
  placeholderImage: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  inactiveOverlay: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(255,255,255,0.7)', justifyContent: 'center', alignItems: 'center' },
  inactiveText: { fontSize: 12, fontWeight: '800', color: '#EF4444' },
  newBadge: { position: 'absolute', top: 0, left: 0, paddingHorizontal: 8, paddingVertical: 2, borderBottomRightRadius: 10 },
  newBadgeText: { color: '#fff', fontSize: 9, fontWeight: '800' },
  infoContainer: { flex: 1, marginRight: 15, justifyContent: 'space-between' },
  nameRow: { flexDirection: 'row-reverse', justifyContent: 'space-between', alignItems: 'center' },
  productName: { fontSize: 17, fontWeight: '800', color: '#0F172A', textAlign: 'right', flex: 1 },
  visibilityIcon: { padding: 4 },
  priceRow: { flexDirection: 'row-reverse', alignItems: 'center', gap: 10, marginTop: 4 },
  price: { fontSize: 18, fontWeight: '800' },
  currencySymbol: { fontSize: 12, fontWeight: '600' },
  oldPrice: { fontSize: 13, color: '#94A3B8', textDecorationLine: 'line-through' },
  stockRow: { marginTop: 8 },
  stockBadge: { alignSelf: 'flex-end', paddingHorizontal: 10, paddingVertical: 5, borderRadius: 8 },
  stockText: { fontSize: 11, fontWeight: '700' },
  cardActions: { flexDirection: 'row-reverse', borderTopWidth: 1, borderTopColor: '#F1F5F9', backgroundColor: '#FAFCFE' },
  actionBtn: { flex: 1, flexDirection: 'row-reverse', alignItems: 'center', justifyContent: 'center', paddingVertical: 12, gap: 8 },
  actionBtnText: { fontSize: 13, fontWeight: '700', color: '#64748B' },
  actionDivider: { width: 1, height: '100%', backgroundColor: '#F1F5F9' },
  bgGreen: { backgroundColor: '#DCFCE7' },
  textGreen: { color: '#166534' },
  bgOrange: { backgroundColor: '#FFEDD5' },
  textOrange: { color: '#9A3412' },
  bgRed: { backgroundColor: '#FEE2E2' },
  textRed: { color: '#B91C1C' },
  emptyContainer: { alignItems: 'center', marginTop: 40, paddingHorizontal: 40 },
  emptyIconContainer: { width: 100, height: 100, borderRadius: 50, backgroundColor: '#F1F5F9', justifyContent: 'center', alignItems: 'center', marginBottom: 20 },
  emptyText: { color: '#1E293B', fontSize: 18, fontWeight: '800', marginBottom: 8 },
  emptySubtext: { color: '#64748B', fontSize: 14, textAlign: 'center', lineHeight: 20 },
  offersFab: { position: 'absolute', bottom: 30, left: 25, borderRadius: 30, elevation: 8 },
  fabGradient: { width: 60, height: 60, borderRadius: 30, justifyContent: 'center', alignItems: 'center' },
});
