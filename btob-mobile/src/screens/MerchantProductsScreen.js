import React, { useState, useEffect, useCallback } from 'react';
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity, Image,
  ActivityIndicator, RefreshControl, TextInput, Dimensions,
} from 'react-native';
import { Feather } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuth } from '../context/AuthContext';
import client from '../api/client';

const { width } = Dimensions.get('window');

const ProductCard = ({ item, primaryColor }) => {
  const isLowStock = item.stock > 0 && item.stock <= 5;
  const isOutOfStock = item.stock === 0;

  return (
    <TouchableOpacity style={styles.card} activeOpacity={0.9}>
      <View style={styles.imageContainer}>
        {item.image ? (
          <Image source={{ uri: item.image }} style={styles.productImage} />
        ) : (
          <View style={styles.placeholderImage}>
            <Feather name="package" size={32} color="#CBD5E1" />
          </View>
        )}
        {!item.is_active && (
          <View style={styles.inactiveOverlay}>
            <Text style={styles.inactiveText}>غير نشط</Text>
          </View>
        )}
      </View>

      <View style={styles.infoContainer}>
        <Text style={styles.productName} numberOfLines={1}>{item.name}</Text>
        
        <View style={styles.priceRow}>
          <Text style={[styles.price, { color: primaryColor }]}>
            {parseFloat(item.price).toFixed(0)} <Text style={styles.currency}>ر.ي</Text>
          </Text>
          {item.has_discount && (
            <Text style={styles.oldPrice}>{parseFloat(item.price * 1.2).toFixed(0)}</Text>
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
              {isOutOfStock ? 'نفذ المخزون' : (isLowStock ? `مخزون منخفض: ${item.stock}` : `متوفر: ${item.stock}`)}
            </Text>
          </View>
        </View>
      </View>

      <TouchableOpacity style={styles.editButton}>
        <Feather name="edit-2" size={16} color="#64748B" />
      </TouchableOpacity>
    </TouchableOpacity>
  );
};

export default function MerchantProductsScreen() {
  const { activeMerchant } = useAuth();
  const primaryColor = activeMerchant?.primary_color || '#2B5876';

  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  const fetchProducts = useCallback(async (silent = false) => {
    if (!activeMerchant?.id) return;
    if (!silent) setLoading(true);
    try {
      const res = await client.get(`/merchant/products/?merchant_id=${activeMerchant.id}`);
      if (res.data.success) {
        setProducts(res.data.products);
      }
    } catch (err) {
      console.error('Fetch products error', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [activeMerchant?.id]);

  useEffect(() => {
    fetchProducts();
  }, [fetchProducts]);

  const onRefresh = () => {
    setRefreshing(true);
    fetchProducts(true);
  };

  const filteredProducts = products.filter(p => 
    p.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const stats = {
    total: products.length,
    lowStock: products.filter(p => p.stock > 0 && p.stock <= 5).length,
    outOfStock: products.filter(p => p.stock === 0).length,
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
        <Text style={styles.headerTitle}>المنتجات</Text>
        <TouchableOpacity style={[styles.addButton, { backgroundColor: primaryColor }]}>
          <Feather name="plus" size={20} color="#fff" />
          <Text style={styles.addButtonText}>إضافة منتج</Text>
        </TouchableOpacity>
      </View>

      {/* Stats Strip */}
      <View style={styles.statsStrip}>
        <View style={styles.statItem}>
          <Text style={styles.statValue}>{stats.total}</Text>
          <Text style={styles.statLabel}>إجمالي</Text>
        </View>
        <View style={[styles.statDivider, { backgroundColor: primaryColor + '20' }]} />
        <View style={styles.statItem}>
          <Text style={[styles.statValue, { color: '#F59E0B' }]}>{stats.lowStock}</Text>
          <Text style={styles.statLabel}>منخفض</Text>
        </View>
        <View style={[styles.statDivider, { backgroundColor: primaryColor + '20' }]} />
        <View style={styles.statItem}>
          <Text style={[styles.statValue, { color: '#EF4444' }]}>{stats.outOfStock}</Text>
          <Text style={styles.statLabel}>نفذت</Text>
        </View>
      </View>

      {/* Search Bar */}
      <View style={styles.searchContainer}>
        <View style={styles.searchBar}>
          <Feather name="search" size={18} color="#94A3B8" />
          <TextInput
            style={styles.searchInput}
            placeholder="بحث عن منتج..."
            value={searchQuery}
            onChangeText={setSearchQuery}
            placeholderTextColor="#94A3B8"
          />
          {searchQuery !== '' && (
            <TouchableOpacity onPress={() => setSearchQuery('')}>
              <Feather name="x-circle" size={18} color="#94A3B8" />
            </TouchableOpacity>
          )}
        </View>
      </View>

      <FlatList
        data={filteredProducts}
        keyExtractor={item => item.id.toString()}
        renderItem={({ item }) => <ProductCard item={item} primaryColor={primaryColor} />}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={primaryColor} />
        }
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Feather name="package" size={48} color="#CBD5E1" />
            <Text style={styles.emptyText}>لا توجد منتجات مطابقة للبحث</Text>
          </View>
        }
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#F8FAFC' },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 15,
    backgroundColor: '#fff',
  },
  headerTitle: { fontSize: 22, fontWeight: '800', color: '#0F172A' },
  addButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
    gap: 6,
  },
  addButtonText: { color: '#fff', fontSize: 13, fontWeight: '700' },

  statsStrip: {
    flexDirection: 'row',
    backgroundColor: '#fff',
    marginHorizontal: 20,
    marginTop: 10,
    borderRadius: 15,
    padding: 15,
    justifyContent: 'space-around',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#F1F5F9',
  },
  statItem: { alignItems: 'center' },
  statValue: { fontSize: 18, fontWeight: '800', color: '#0F172A' },
  statLabel: { fontSize: 11, color: '#64748B', marginTop: 2 },
  statDivider: { width: 1, height: 25 },

  searchContainer: { paddingHorizontal: 20, paddingVertical: 15 },
  searchBar: {
    backgroundColor: '#fff',
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    height: 48,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    gap: 10,
  },
  searchInput: { flex: 1, fontSize: 14, color: '#0F172A', textAlign: 'right' },

  listContent: { paddingHorizontal: 20, paddingBottom: 100 },
  card: {
    backgroundColor: '#fff',
    borderRadius: 16,
    flexDirection: 'row',
    padding: 12,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#F1F5F9',
    position: 'relative',
  },
  imageContainer: {
    width: 80,
    height: 80,
    borderRadius: 12,
    backgroundColor: '#F8FAFC',
    overflow: 'hidden',
  },
  productImage: { width: '100%', height: '100%', resizeMode: 'cover' },
  placeholderImage: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  inactiveOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(255,255,255,0.7)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  inactiveText: { fontSize: 10, fontWeight: '700', color: '#64748B' },

  infoContainer: { flex: 1, marginLeft: 15, justifyContent: 'space-between' },
  productName: { fontSize: 15, fontWeight: '700', color: '#0F172A', textAlign: 'left' },
  priceRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  price: { fontSize: 16, fontWeight: '800' },
  currency: { fontSize: 11, fontWeight: '500' },
  oldPrice: { fontSize: 12, color: '#94A3B8', textDecorationLine: 'line-through' },

  stockRow: { marginTop: 6 },
  stockBadge: {
    alignSelf: 'flex-start',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  stockText: { fontSize: 10, fontWeight: '700' },
  
  bgGreen: { backgroundColor: '#DCFCE7' },
  textGreen: { color: '#166534' },
  bgOrange: { backgroundColor: '#FFEDD5' },
  textOrange: { color: '#9A3412' },
  bgRed: { backgroundColor: '#FEE2E2' },
  textRed: { color: '#991B1B' },

  editButton: {
    position: 'absolute',
    top: 12,
    right: 12,
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#F8FAFC',
    justifyContent: 'center',
    alignItems: 'center',
  },

  emptyContainer: { alignItems: 'center', marginTop: 60, gap: 12 },
  emptyText: { color: '#94A3B8', fontSize: 14, fontWeight: '500' },
});
