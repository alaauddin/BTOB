import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity, Image,
  ActivityIndicator, RefreshControl, TextInput, Dimensions,
  StatusBar, Animated, Alert
} from 'react-native';
import { Feather, Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { useAuth } from '../context/AuthContext';
import client from '../api/client';
import ProductEditModal from '../components/ProductEditModal';

const { width } = Dimensions.get('window');

const ProductCard = ({ item, primaryColor, onEdit, onToggleActive, onDelete }) => {
  const isLowStock = item.stock > 0 && item.stock <= 5;
  const isOutOfStock = item.stock === 0;

  return (
    <Animated.View style={styles.card}>
      <View style={styles.cardRow}>
        {/* Product Image Section */}
        <View style={styles.imageContainer}>
          {item.image_url ? (
            <Image source={{ uri: item.image_url }} style={styles.productImage} />
          ) : (
            <View style={styles.placeholderImage}>
              <Feather name="package" size={28} color="#CBD5E1" />
            </View>
          )}
          {!item.is_active && (
            <View style={styles.inactiveOverlay}>
              <Text style={styles.inactiveText}>مخفي</Text>
            </View>
          )}
          {item.is_new && (
            <View style={[styles.newBadge, { backgroundColor: primaryColor }]}>
              <Text style={styles.newBadgeText}>جديد</Text>
            </View>
          )}
        </View>

        {/* Info Section */}
        <View style={styles.infoContainer}>
          <View style={styles.nameRow}>
            <Text style={styles.productName} numberOfLines={1}>{item.name}</Text>
            <TouchableOpacity onPress={() => onToggleActive(item)} style={styles.visibilityIcon}>
              <Feather 
                name={item.is_active ? "eye" : "eye-off"} 
                size={16} 
                color={item.is_active ? primaryColor : "#94A3B8"} 
              />
            </TouchableOpacity>
          </View>
          
          <View style={styles.priceRow}>
            <Text style={[styles.price, { color: primaryColor }]}>
              {parseFloat(item.price_after_discount || item.price).toLocaleString()} <Text style={styles.currencySymbol}>ر.ي</Text>
            </Text>
            {item.has_discount && (
              <Text style={styles.oldPrice}>{parseFloat(item.price).toLocaleString()}</Text>
            )}
          </View>

          <View style={styles.stockRow}>
            <View style={[
              styles.stockBadge,
              isOutOfStock ? styles.bgRed : (isLowStock ? styles.bgOrange : styles.bgGreen)
            ]}>
              <Text style={[
                styles.stockText,
                isOutOfStock ? styles.textRed : (isLowStock ? styles.textOrange : styles.textGreen)
              ]}>
                {isOutOfStock ? 'نفذ المخزون' : (isLowStock ? `مخزون منخفض: ${item.stock}` : `المخزون: ${item.stock}`)}
              </Text>
            </View>
          </View>
        </View>
      </View>

      {/* Actions Strip */}
      <View style={styles.cardActions}>
        <TouchableOpacity style={styles.actionBtn} onPress={() => onEdit(item)}>
          <Feather name="edit-3" size={16} color="#64748B" />
          <Text style={styles.actionBtnText}>تعديل</Text>
        </TouchableOpacity>
        <View style={styles.actionDivider} />
        <TouchableOpacity style={styles.actionBtn} onPress={() => onDelete(item)}>
          <Feather name="trash-2" size={16} color="#EF4444" />
          <Text style={[styles.actionBtnText, { color: '#EF4444' }]}>حذف</Text>
        </TouchableOpacity>
      </View>
    </Animated.View>
  );
};

export default function MerchantProductsScreen({ navigation }) {
  const { activeMerchant } = useAuth();
  const primaryColor = activeMerchant?.primary_color || '#2B5876';
// ... (lines truncated for brevity, but I'll replace the whole function if needed, or just the onPress)

  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [selectedCategoryId, setSelectedCategoryId] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  
  // Modal State
  const [editModalVisible, setEditModalVisible] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState(null);

  const fetchData = useCallback(async (silent = false) => {
    if (!activeMerchant?.id) return;
    if (!silent) setLoading(true);
    try {
      const [prodRes, catRes] = await Promise.all([
        client.get(`/merchant/products/?merchant_id=${activeMerchant.id}`),
        client.get(`/merchant/product-categories/`)
      ]);
      
      if (prodRes.data.success) setProducts(prodRes.data.products);
      if (catRes.data.success) setCategories(catRes.data.categories);
      
    } catch (err) {
      console.error('Fetch error', err);
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

  const filteredProducts = useMemo(() => {
    return products.filter(p => {
      const matchesSearch = p.name.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesCategory = selectedCategoryId ? p.category_id === selectedCategoryId : true;
      return matchesSearch && matchesCategory;
    });
  }, [products, searchQuery, selectedCategoryId]);

  const stats = {
    total: products.length,
    lowStock: products.filter(p => p.stock > 0 && p.stock <= 5).length,
    hidden: products.filter(p => !p.is_active).length,
  };

  const handleToggleActive = async (product) => {
    try {
      const res = await client.patch('/merchant/products/', {
        product_id: product.id,
        is_active: !product.is_active
      });
      if (res.data.success) {
        setProducts(prev => prev.map(p => p.id === product.id ? res.data.product : p));
      }
    } catch (err) {
      Alert.alert('خطأ', 'فشل في تحديث حالة المنتج');
    }
  };

  const handleDelete = (product) => {
    Alert.alert(
      'حذف المنتج',
      `هل أنت متأكد من حذف "${product.name}"؟ لا يمكن التراجع عن هذا الإجراء.`,
      [
        { text: 'إلغاء', style: 'cancel' },
        { 
          text: 'حذف', 
          style: 'destructive',
          onPress: async () => {
            try {
              const res = await client.delete(`/merchant/products/?product_id=${product.id}`);
              if (res.data.success) {
                setProducts(prev => prev.filter(p => p.id !== product.id));
              }
            } catch (err) {
              Alert.alert('خطأ', 'فشل في حذف المنتج');
            }
          }
        }
      ]
    );
  };

  const openAddModal = () => {
    setSelectedProduct(null);
    setEditModalVisible(true);
  };

  const openEditModal = (product) => {
    setSelectedProduct(product);
    setEditModalVisible(true);
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
      
      {/* Premium Header */}
      <View style={styles.header}>
        <View>
          <Text style={styles.headerTitle}>قائمة المنتجات</Text>
          <Text style={styles.headerSubtitle}>{stats.total} منتج مسجل</Text>
        </View>
        <TouchableOpacity 
          style={[styles.addButton, { backgroundColor: primaryColor }]}
          onPress={openAddModal}
        >
          <Feather name="plus" size={20} color="#fff" />
          <Text style={styles.addButtonText}>منتج جديد</Text>
        </TouchableOpacity>
      </View>

      {/* Dynamic Filter Strip */}
      <View style={styles.filterSection}>
        <View style={styles.searchBar}>
          <Feather name="search" size={18} color="#94A3B8" />
          <TextInput
            style={styles.searchInput}
            placeholder="البحث بالاسم..."
            value={searchQuery}
            onChangeText={setSearchQuery}
            placeholderTextColor="#94A3B8"
          />
        </View>
        
        <FlatList
          horizontal
          data={[{ id: null, name: 'الكل' }, ...categories]}
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
              <Text style={[
                styles.categoryChipText,
                selectedCategoryId === item.id && { color: '#fff' }
              ]}>
                {item.name}
              </Text>
            </TouchableOpacity>
          )}
        />
      </View>

      {/* Stats Cards */}
      <View style={styles.statsStrip}>
        <View style={[styles.statBox, { borderRightWidth: 1, borderColor: '#F1F5F9' }]}>
          <Text style={[styles.statValue, { color: '#F59E0B' }]}>{stats.lowStock}</Text>
          <Text style={styles.statLabel}>مخزون منخفض</Text>
        </View>
        <View style={styles.statBox}>
          <Text style={[styles.statValue, { color: '#64748B' }]}>{stats.hidden}</Text>
          <Text style={styles.statLabel}>منتجات مخفية</Text>
        </View>
      </View>

      <FlatList
        data={filteredProducts}
        keyExtractor={item => item.id.toString()}
        renderItem={({ item }) => (
          <ProductCard 
            item={item} 
            primaryColor={primaryColor} 
            onEdit={openEditModal}
            onToggleActive={handleToggleActive}
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
            <View style={styles.emptyIconContainer}>
              <Feather name="box" size={48} color="#CBD5E1" />
            </View>
            <Text style={styles.emptyText}>لم يتم العثور على منتجات</Text>
            <Text style={styles.emptySubtext}>حاول تغيير الفلاتر أو إضافة منتج جديد</Text>
          </View>
        }
      />

      {/* Floating Action for Offers */}
      <TouchableOpacity 
        style={[styles.offersFab, { backgroundColor: primaryColor }]}
        onPress={() => navigation.navigate('MerchantOffers')}
      >
        <LinearGradient
          colors={[primaryColor, primaryColor + 'CC']}
          style={styles.fabGradient}
        >
          <Ionicons name="pricetag-outline" size={24} color="#fff" />
        </LinearGradient>
      </TouchableOpacity>

      <ProductEditModal
        visible={editModalVisible}
        product={selectedProduct}
        categories={categories}
        onClose={() => setEditModalVisible(false)}
        onSaved={fetchData}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#F8FAFC' },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#fff' },
  loadingText: { marginTop: 12, color: '#64748B', fontSize: 14, fontWeight: '500' },
  
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
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  addButtonText: { color: '#fff', fontSize: 14, fontWeight: '700' },

  filterSection: { backgroundColor: '#fff', paddingBottom: 15 },
  searchBar: {
    backgroundColor: '#F1F5F9',
    flexDirection: 'row-reverse',
    alignItems: 'center',
    marginHorizontal: 20,
    marginTop: 15,
    paddingHorizontal: 15,
    height: 48,
    borderRadius: 15,
    gap: 12,
  },
  searchInput: { flex: 1, fontSize: 15, color: '#0F172A', textAlign: 'right' },
  
  categoryList: { paddingHorizontal: 20, marginTop: 15, gap: 10, flexDirection: 'row-reverse' },
  categoryChip: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  categoryChipText: { fontSize: 13, fontWeight: '600', color: '#64748B' },

  statsStrip: {
    flexDirection: 'row-reverse',
    backgroundColor: '#fff',
    marginHorizontal: 20,
    marginTop: 15,
    borderRadius: 16,
    paddingVertical: 15,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
  },
  statBox: { flex: 1, alignItems: 'center' },
  statValue: { fontSize: 20, fontWeight: '800', color: '#0F172A' },
  statLabel: { fontSize: 12, color: '#64748B', marginTop: 4, fontWeight: '500' },

  listContent: { paddingHorizontal: 20, paddingBottom: 120, paddingTop: 15 },
  card: {
    backgroundColor: '#fff',
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
  cardRow: {
    flexDirection: 'row-reverse',
    padding: 15,
  },
  imageContainer: {
    width: 90,
    height: 90,
    borderRadius: 15,
    backgroundColor: '#F8FAFC',
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#F1F5F9',
  },
  productImage: { width: '100%', height: '100%', resizeMode: 'cover' },
  placeholderImage: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  inactiveOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(255,255,255,0.7)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  inactiveText: { fontSize: 12, fontWeight: '800', color: '#EF4444' },
  newBadge: {
    position: 'absolute',
    top: 0,
    left: 0,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderBottomRightRadius: 10,
  },
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
  stockBadge: {
    alignSelf: 'flex-end',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
  },
  stockText: { fontSize: 11, fontWeight: '700' },
  
  cardActions: {
    flexDirection: 'row-reverse',
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
    backgroundColor: '#FAFCFE',
  },
  actionBtn: {
    flex: 1,
    flexDirection: 'row-reverse',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    gap: 8,
  },
  actionBtnText: { fontSize: 13, fontWeight: '700', color: '#64748B' },
  actionDivider: { width: 1, height: '100%', backgroundColor: '#F1F5F9' },

  bgGreen: { backgroundColor: '#DCFCE7' },
  textGreen: { color: '#166534' },
  bgOrange: { backgroundColor: '#FFEDD5' },
  textOrange: { color: '#9A3412' },
  bgRed: { backgroundColor: '#FEE2E2' },
  textRed: { color: '#B91C1C' },

  emptyContainer: { alignItems: 'center', marginTop: 40, paddingHorizontal: 40 },
  emptyIconContainer: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: '#F1F5F9',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
  },
  emptyText: { color: '#1E293B', fontSize: 18, fontWeight: '800', marginBottom: 8 },
  emptySubtext: { color: '#64748B', fontSize: 14, textAlign: 'center', lineHeight: 20 },

  offersFab: {
    position: 'absolute',
    bottom: 30,
    left: 25,
    borderRadius: 30,
    elevation: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
  },
  fabGradient: {
    width: 60,
    height: 60,
    borderRadius: 30,
    justifyContent: 'center',
    alignItems: 'center',
  },
});

