import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity,
  Image, ActivityIndicator, TextInput, RefreshControl,
  StatusBar, Dimensions, Alert, Platform
} from 'react-native';
import { Feather, Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import client from '../api/client';
import { useAuth } from '../context/AuthContext';
import { useNotifications } from '../context/NotificationContext';
import { BRAND } from '../theme/brand';
import Logo from '../components/Logo';

const { width } = Dimensions.get('window');

const FILTERS = [
  { id: 'all', label: 'الكل', icon: 'grid' },
  { id: 'active', label: 'نشط', icon: 'eye' },
  { id: 'inactive', label: 'مخفي', icon: 'eye-off' },
];

export default function MerchantProductsScreen({ navigation }) {
  const { activeMerchant } = useAuth();
  const { showNotification } = useNotifications();

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
      if (error.response?.status !== 402) {
        console.error('Fetch error', error);
        showNotification({ title: 'خطأ', message: 'فشل في تحميل البيانات', type: 'error' });
      }
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

  const primaryColor = BRAND.colors.primary;
  const curr = activeMerchant?.currency?.symbol || 'د.ك';

  if (loading && !refreshing) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color={primaryColor} />
        <Text style={styles.loadingText}>جاري التحميل...</Text>
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
            <View style={styles.headerInfo}>
              <Text style={styles.headerTitle}>المنتجات</Text>
              <View style={styles.badgeRow}>
                 <View style={styles.miniBadge}>
                    <Text style={styles.miniBadgeText}>{stats.total} إجمالي</Text>
                 </View>
              </View>
            </View>
            
            <TouchableOpacity style={styles.addButton} onPress={openAddScreen}>
              <LinearGradient colors={['rgba(255,255,255,0.3)', 'rgba(255,255,255,0.1)']} style={styles.addBtnInner}>
                 <Feather name="plus" size={20} color="#FFF" />
                 <Text style={styles.addBtnText}>إضافة</Text>
              </LinearGradient>
            </TouchableOpacity>
          </View>

          <View style={styles.searchSection}>
            <View style={styles.searchBar}>
              <Feather name="search" size={18} color="rgba(255,255,255,0.6)" />
              <TextInput 
                style={styles.searchInput} 
                placeholder="ابحث عن منتج..." 
                value={searchQuery} 
                onChangeText={setSearchQuery} 
                placeholderTextColor="rgba(255,255,255,0.5)" 
              />
              {searchQuery.length > 0 && (
                <TouchableOpacity onPress={() => setSearchQuery('')}>
                  <Ionicons name="close-circle" size={18} color="rgba(255,255,255,0.4)" />
                </TouchableOpacity>
              )}
            </View>
          </View>
        </SafeAreaView>
      </LinearGradient>

      <View style={styles.tabContainer}>
        {FILTERS.map(tab => (
          <TouchableOpacity 
            key={tab.id} 
            onPress={() => setActiveTab(tab.id)} 
            style={[styles.tabItem, activeTab === tab.id && { borderBottomColor: primaryColor }]}
          >
            <Feather name={tab.icon} size={14} color={activeTab === tab.id ? primaryColor : '#94A3B8'} />
            <Text style={[styles.tabText, activeTab === tab.id && { color: primaryColor, fontWeight: 'bold' }]}>{tab.label}</Text>
          </TouchableOpacity>
        ))}
      </View>

      <FlatList
        data={products}
        keyExtractor={item => item.id.toString()}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={primaryColor} />}
        ListHeaderComponent={() => (
          <View style={styles.categoryScrollWrap}>
             <FlatList
                horizontal
                data={[{ id: null, name: 'كل الفئات' }, ...categories]}
                keyExtractor={item => (item.id || 'all').toString()}
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.categoryList}
                renderItem={({ item }) => (
                  <TouchableOpacity 
                    onPress={() => setSelectedCategoryId(item.id)} 
                    style={[
                      styles.categoryChip, 
                      selectedCategoryId === item.id && { backgroundColor: primaryColor, borderColor: primaryColor }
                    ]}
                  >
                    <Text style={[styles.categoryChipText, selectedCategoryId === item.id && { color: '#FFF' }]}>{item.name}</Text>
                  </TouchableOpacity>
                )}
              />
          </View>
        )}
        ListEmptyComponent={() => (
          <View style={styles.emptyContainer}>
            <View style={styles.emptyIconContainer}>
               <MaterialCommunityIcons name="package-variant" size={64} color="#CBD5E1" />
            </View>
            <Text style={styles.emptyText}>لا توجد منتجات حالياً</Text>
            <Text style={styles.emptySubtext}>ابدأ بإضافة منتجاتك للظهور في المتجر</Text>
            <TouchableOpacity style={[styles.emptyAddBtn, { backgroundColor: primaryColor }]} onPress={openAddScreen}>
               <Text style={styles.emptyAddBtnText}>أضف أول منتج</Text>
            </TouchableOpacity>
          </View>
        )}
        renderItem={({ item }) => (
          <TouchableOpacity 
            style={styles.card} 
            activeOpacity={0.8}
            onPress={() => openEditScreen(item)}
          >
            <View style={styles.cardMain}>
              <View style={styles.imageWrap}>
                {item.image_url ? (
                  <Image source={{ uri: item.image_url }} style={styles.productImage} />
                ) : (
                  <View style={styles.placeholderImage}>
                    <Ionicons name="image-outline" size={32} color="#CBD5E1" />
                  </View>
                )}
                {!item.is_active && (
                  <View style={styles.inactiveOverlay}>
                    <Text style={styles.inactiveText}>مخفي</Text>
                  </View>
                )}
                {item.is_new && (
                  <View style={[styles.newBadge, { backgroundColor: BRAND.colors.secondary }]}>
                    <Text style={styles.newBadgeText}>جديد</Text>
                  </View>
                )}
              </View>

              <View style={styles.infoCol}>
                <View style={styles.nameHeader}>
                  <Text style={styles.productName} numberOfLines={1}>{item.name}</Text>
                  <TouchableOpacity 
                    onPress={() => toggleProductStatus(item)}
                    style={[styles.statusToggle, { backgroundColor: item.is_active ? '#F0FDF4' : '#F8FAFC' }]}
                  >
                    <Feather name={item.is_active ? "eye" : "eye-off"} size={14} color={item.is_active ? '#16A34A' : "#94A3B8"} />
                  </TouchableOpacity>
                </View>

                <View style={styles.priceContainer}>
                   <View style={styles.currentPriceBox}>
                      <Text style={[styles.priceValue, { color: primaryColor }]}>{parseFloat(item.price_after_discount || item.price).toLocaleString()}</Text>
                      <Text style={[styles.currency, { color: primaryColor }]}>{curr}</Text>
                   </View>
                   {item.has_discount && (
                     <Text style={styles.oldPrice}>{parseFloat(item.price).toLocaleString()} {curr}</Text>
                   )}
                </View>

                <View style={styles.cardFooter}>
                   <View style={[
                     styles.stockBadge, 
                     item.stock > 0 ? (item.stock < 10 ? styles.bgOrange : styles.bgGreen) : styles.bgRed
                   ]}>
                      <Text style={[
                        styles.stockText, 
                        item.stock > 0 ? (item.stock < 10 ? styles.textOrange : styles.textGreen) : styles.textRed
                      ]}>
                        {item.stock > 0 ? `المخزون: ${item.stock}` : 'نفذ الكمية'}
                      </Text>
                   </View>
                   
                   <View style={styles.quickActions}>
                      <TouchableOpacity onPress={() => deleteProduct(item.id)} style={styles.trashBtn}>
                         <Feather name="trash-2" size={16} color="#EF4444" />
                      </TouchableOpacity>
                      <TouchableOpacity onPress={() => openEditScreen(item)} style={styles.editBtn}>
                         <Feather name="edit-3" size={16} color={primaryColor} />
                      </TouchableOpacity>
                   </View>
                </View>
              </View>
            </View>
          </TouchableOpacity>
        )}
      />

      <TouchableOpacity 
        style={styles.offersFab} 
        onPress={() => navigation.navigate('MerchantOffers')}
      >
        <LinearGradient colors={BRAND.gradients.secondary} style={styles.fabGradient}>
          <MaterialCommunityIcons name="tag-multiple" size={26} color="#FFF" />
          <View style={styles.fabDot} />
        </LinearGradient>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#F8FAFC' },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#F8FAFC' },
  loadingText: { marginTop: 12, color: '#64748B', fontSize: 14 },
  
  headerGradient: { borderBottomLeftRadius: 30, borderBottomRightRadius: 30, paddingBottom: 20 },
  safeHeader: { paddingTop: Platform.OS === 'android' ? StatusBar.currentHeight : 0 },
  headerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    height: 70
  },
  headerRight: { marginRight: 12 },
  headerInfo: { flex: 1 },
  headerTitle: { fontSize: 26, fontWeight: 'bold', color: '#FFF' },
  badgeRow: { flexDirection: 'row', marginTop: 4 },
  miniBadge: { backgroundColor: 'rgba(255,255,255,0.2)', paddingHorizontal: 8, paddingVertical: 2, borderRadius: 6 },
  miniBadgeText: { color: '#FFF', fontSize: 10, fontWeight: 'bold' },
  
  addButton: { borderRadius: 14, overflow: 'hidden' },
  addBtnInner: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 10, gap: 8 },
  addBtnText: { color: '#FFF', fontSize: 14, fontWeight: 'bold' },

  searchSection: { paddingHorizontal: 20, marginTop: 10 },
  searchBar: {
    backgroundColor: 'rgba(255,255,255,0.15)',
    flexDirection: 'row',
    alignItems: 'center',
    height: 50,
    borderRadius: 15,
    paddingHorizontal: 15,
    gap: 12,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)'
  },
  searchInput: { flex: 1, color: '#FFF', fontSize: 15, textAlign: 'right' },

  tabContainer: {
    flexDirection: 'row',
    backgroundColor: '#FFF',
    paddingHorizontal: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
    marginTop: -10,
    marginHorizontal: 20,
    borderRadius: 15,
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4
  },
  tabItem: { flex: 1, paddingVertical: 14, alignItems: 'center', justifyContent: 'center', flexDirection: 'row', gap: 8, borderBottomWidth: 3, borderBottomColor: 'transparent' },
  tabText: { fontSize: 13, color: '#94A3B8' },

  categoryScrollWrap: { paddingVertical: 15 },
  categoryList: { paddingHorizontal: 20, gap: 10 },
  categoryChip: { paddingHorizontal: 18, paddingVertical: 10, borderRadius: 12, backgroundColor: '#FFF', borderWidth: 1, borderColor: '#E2E8F0' },
  categoryChipText: { fontSize: 13, fontWeight: 'bold', color: '#64748B' },

  listContent: { paddingBottom: 120 },
  card: {
    backgroundColor: '#FFF',
    marginHorizontal: 20,
    borderRadius: 24,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#F1F5F9',
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05,
    shadowRadius: 8
  },
  cardMain: { flexDirection: 'row', padding: 16, gap: 16 },
  imageWrap: { width: 100, height: 100, borderRadius: 20, backgroundColor: '#F8FAFC', overflow: 'hidden', borderWidth: 1, borderColor: '#F1F5F9' },
  productImage: { width: '100%', height: '100%' },
  placeholderImage: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  inactiveOverlay: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(255,255,255,0.7)', justifyContent: 'center', alignItems: 'center' },
  inactiveText: { fontSize: 12, fontWeight: 'bold', color: '#EF4444' },
  newBadge: { position: 'absolute', top: 0, right: 0, paddingHorizontal: 8, paddingVertical: 2, borderBottomLeftRadius: 12 },
  newBadgeText: { color: '#FFF', fontSize: 9, fontWeight: 'bold' },

  infoCol: { flex: 1, justifyContent: 'space-between' },
  nameHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  productName: { fontSize: 16, fontWeight: 'bold', color: '#1E293B', flex: 1 },
  statusToggle: { width: 32, height: 32, borderRadius: 10, justifyContent: 'center', alignItems: 'center' },

  priceContainer: { flexDirection: 'row', alignItems: 'baseline', gap: 8, marginTop: 4 },
  currentPriceBox: { flexDirection: 'row', alignItems: 'baseline', gap: 4 },
  priceValue: { fontSize: 20, fontWeight: 'bold' },
  currency: { fontSize: 12, fontWeight: 'bold' },
  oldPrice: { fontSize: 12, color: '#94A3B8', textDecorationLine: 'line-through' },

  cardFooter: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 12 },
  stockBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8 },
  stockText: { fontSize: 11, fontWeight: 'bold' },
  quickActions: { flexDirection: 'row', gap: 10 },
  trashBtn: { width: 36, height: 36, borderRadius: 10, backgroundColor: '#FEF2F2', justifyContent: 'center', alignItems: 'center' },
  editBtn: { width: 36, height: 36, borderRadius: 10, backgroundColor: '#F0F9FF', justifyContent: 'center', alignItems: 'center' },

  bgGreen: { backgroundColor: '#DCFCE7' },
  textGreen: { color: '#166534' },
  bgOrange: { backgroundColor: '#FFEDD5' },
  textOrange: { color: '#9A3412' },
  bgRed: { backgroundColor: '#FEE2E2' },
  textRed: { color: '#B91C1C' },

  emptyContainer: { alignItems: 'center', marginTop: 60, paddingHorizontal: 40 },
  emptyIconContainer: { width: 120, height: 120, borderRadius: 60, backgroundColor: '#F1F5F9', justifyContent: 'center', alignItems: 'center', marginBottom: 24 },
  emptyText: { color: '#1E293B', fontSize: 20, fontWeight: 'bold', marginBottom: 8 },
  emptySubtext: { color: '#64748B', fontSize: 14, textAlign: 'center', lineHeight: 22, marginBottom: 24 },
  emptyAddBtn: { paddingHorizontal: 30, paddingVertical: 14, borderRadius: 16, elevation: 4 },
  emptyAddBtnText: { color: '#FFF', fontSize: 16, fontWeight: 'bold' },

  offersFab: { position: 'absolute', bottom: 30, left: 30, borderRadius: 30, elevation: 8 },
  fabGradient: { width: 64, height: 64, borderRadius: 32, justifyContent: 'center', alignItems: 'center' },
  fabDot: { position: 'absolute', top: 15, right: 15, width: 10, height: 10, borderRadius: 5, backgroundColor: '#FFF', borderWidth: 2, borderColor: BRAND.colors.secondary },
});
