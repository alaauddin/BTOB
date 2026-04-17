import React, { useState, useEffect, useCallback } from 'react';
// Refactored Wholesale Market Screen
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity,
  ActivityIndicator, TextInput, RefreshControl, Alert, StatusBar
} from 'react-native';
import { Feather } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuth } from '../context/AuthContext';
import { useNotifications } from '../context/NotificationContext';
import client from '../api/client';
import { adjustColor } from '../utils/color';

// Modular Components
import WholesaleProductCard from '../components/wholesale/WholesaleProductCard';
import SourcingModal from '../components/wholesale/SourcingModal';

/**
 * WholesaleMarketScreen.js
 * 
 * The main screen for the Wholesale Market feature.
 * Provides product discovery, search, filtering, and the sourcing (inheritance) workflow.
 */
export default function WholesaleMarketScreen() {
  const { activeMerchant } = useAuth();
  const { showNotification } = useNotifications();
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [modalVisible, setModalVisible] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [suppliers, setSuppliers] = useState([]);
  const [selectedSupplierId, setSelectedSupplierId] = useState(null);

  const primaryColor = activeMerchant?.primary_color || '#2B5876';

  const fetchProducts = useCallback(async (isRefresh = false) => {
    if (!activeMerchant?.id) return;
    if (!isRefresh) setLoading(true);
    
    try {
      const res = await client.get('/merchant/wholesale/products/', {
        params: {
          merchant_id: activeMerchant?.id,
          q: searchQuery,
          wholesaler_id: selectedSupplierId
        }
      });
      const data = Array.isArray(res.data) ? res.data : (res.data.results || []);
      setProducts(data);
    } catch (err) {
      console.error('Fetch products error', err);
      showNotification({ title: 'خطأ', message: 'فشل تحميل المنتجات من سوق الجملة', type: 'error' });
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [activeMerchant?.id, searchQuery, selectedSupplierId]);

  const fetchSuppliers = useCallback(async () => {
    try {
      const res = await client.get('/merchant/wholesale/suppliers/');
      const data = Array.isArray(res.data) ? res.data : (res.data.results || []);
      setSuppliers(data);
    } catch (err) {
      console.error('Fetch suppliers error', err);
    }
  }, []);

  useEffect(() => {
    fetchProducts();
  }, [fetchProducts]);

  useEffect(() => {
    fetchSuppliers();
  }, [fetchSuppliers]);

  const onRefresh = () => {
    setRefreshing(true);
    fetchProducts(true);
  };

  const handleSourceProduct = async (productId, customPrice) => {
    try {
      const res = await client.post(`/merchant/wholesale/products/${productId}/inherit/`, {
        merchant_id: activeMerchant?.id,
        sale_price: customPrice
      });

      if (res.data.success) {
        showNotification({ title: 'نجاح', message: res.data.message, type: 'success' });
        setModalVisible(false);
        setSelectedProduct(null);
        fetchProducts(true);
      }
    } catch (error) {
      console.error('Sourcing error', error.response?.data || error);
      showNotification({ title: 'خطأ', message: error.response?.data?.message || 'فشل استيراد المنتج', type: 'error' });
    }
  };

  if (loading && !refreshing) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color={primaryColor} />
        <Text style={styles.loadingText}>جاري تحميل سوق الجملة...</Text>
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <StatusBar barStyle="dark-content" backgroundColor="#FFF" />
      
      {/* ── Search Header ── */}
      <View style={styles.header}>
        <Text style={styles.title}>سوق الجملة</Text>
        <Text style={styles.subtitle}>اكتشف أفضل المنتجات لمتجرك بأسعار تنافسية</Text>
        
        <View style={styles.searchBar}>
          <Feather name="search" size={20} color="#94A3B8" />
          <TextInput
            placeholder="ابحث عن منتجات، فئات..."
            style={styles.searchInput}
            value={searchQuery}
            onChangeText={setSearchQuery}
            textAlign="right"
          />
        </View>
      </View>

      {/* ── Suppliers Filter ── */}
      <View style={styles.filterSection}>
        <FlatList
          horizontal
          data={[{ id: null, name: 'الكل' }, ...suppliers]}
          keyExtractor={item => (item.id || 'all').toString()}
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.supplierList}
          renderItem={({ item }) => (
            <TouchableOpacity 
              onPress={() => setSelectedSupplierId(item.id)} 
              style={[
                styles.supplierChip, 
                selectedSupplierId === item.id && { 
                  backgroundColor: primaryColor, 
                  borderColor: primaryColor 
                }
              ]}
            >
              <Text style={[
                styles.supplierChipText, 
                selectedSupplierId === item.id && { color: '#fff' }
              ]}>
                {item.name}
              </Text>
            </TouchableOpacity>
          )}
        />
      </View>

      {/* ── Products Grid ── */}
      <FlatList
        data={products}
        keyExtractor={item => item?.id?.toString() || Math.random().toString()}
        numColumns={2}
        contentContainerStyle={styles.listContent}
        columnWrapperStyle={styles.columnWrapper}
        renderItem={({ item }) => (
          <WholesaleProductCard 
            item={item} 
            primaryColor={primaryColor}
            onPress={() => {
              if (item.is_inherited) {
                showNotification({ title: 'تنبيه', message: 'هذا المنتج موجود بالفعل في متجرك', type: 'warning' });
              } else {
                setSelectedProduct(item);
                setModalVisible(true);
              }
            }}
          />
        )}
        refreshControl={
          <RefreshControl 
            refreshing={refreshing} 
            onRefresh={onRefresh} 
            tintColor={primaryColor} 
          />
        }
        ListEmptyComponent={
          <View style={styles.emptyWrap}>
            <Feather name="package" size={48} color="#E2E8F0" />
            <Text style={styles.emptyText}>لا توجد منتجات متاحة حالياً</Text>
          </View>
        }
      />

      {/* ── Sourcing Interaction ── */}
      <SourcingModal
        visible={modalVisible}
        product={selectedProduct}
        primaryColor={primaryColor}
        onClose={() => {
          setModalVisible(false);
          setSelectedProduct(null);
        }}
        onSource={handleSourceProduct}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#FFF',
  },
  loadingText: {
    marginTop: 12,
    color: '#64748B',
    fontSize: 14,
  },
  header: {
    padding: 20,
    backgroundColor: '#FFF',
    borderBottomLeftRadius: 32,
    borderBottomRightRadius: 32,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05,
    shadowRadius: 10,
    elevation: 4,
  },
  title: {
    fontSize: 24,
    fontWeight: '800',
    color: '#0F172A',
    textAlign: 'right',
  },
  subtitle: {
    fontSize: 14,
    color: '#64748B',
    textAlign: 'right',
    marginTop: 4,
    marginBottom: 20,
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F1F5F9',
    borderRadius: 16,
    paddingHorizontal: 16,
    height: 52,
  },
  searchInput: {
    flex: 1,
    fontSize: 15,
    color: '#1E293B',
    marginRight: 10,
  },
  listContent: {
    padding: 16,
    paddingBottom: 100,
  },
  columnWrapper: {
    justifyContent: 'space-between',
  },
  emptyWrap: {
    alignItems: 'center',
    marginTop: 100,
  },
  emptyText: {
    marginTop: 12,
    color: '#94A3B8',
    fontSize: 16,
  },
  filterSection: {
    backgroundColor: '#FFF',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  supplierList: {
    paddingHorizontal: 20,
    flexDirection: 'row-reverse',
    gap: 10,
  },
  supplierChip: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    minWidth: 60,
    alignItems: 'center',
  },
  supplierChipText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#64748B',
  },
});
