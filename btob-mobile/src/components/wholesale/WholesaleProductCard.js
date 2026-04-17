import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Image } from 'react-native';
import { Feather } from '@expo/vector-icons';

/**
 * WholesaleProductCard.js
 * 
 * A reusable card component for displaying a wholesale product in the market grid.
 */
const WholesaleProductCard = ({ item, onPress, primaryColor }) => (
  <TouchableOpacity 
    style={styles.productCard} 
    onPress={onPress}
    activeOpacity={0.8}
  >
    <View style={styles.imageContainer}>
      <Image source={{ uri: item.image }} style={styles.productImage} />
      {item.is_inherited && (
        <View style={styles.inheritedBadge}>
          <Feather name="check-circle" size={12} color="#FFF" />
          <Text style={styles.inheritedText}>موجود</Text>
        </View>
      )}
      <View style={styles.profitBadge}>
        <Text style={styles.profitText}>ربح {parseFloat(item.potential_profit).toFixed(0)} ر.ي</Text>
      </View>
    </View>
    
    <View style={styles.productInfo}>
      <Text style={styles.productName} numberOfLines={1}>{item.name}</Text>
      <Text style={styles.categoryName}>{item.category_name}</Text>
      
      <View style={styles.priceRow}>
        <View>
          <Text style={styles.priceLabel}>الجملة</Text>
          <Text style={styles.priceValue}>{item.purchase_price} ر.ي</Text>
        </View>
        <View style={styles.priceDivider} />
        <View>
          <Text style={styles.priceLabel}>البيع المقترح</Text>
          <Text style={[styles.priceValue, { color: primaryColor }]}>{item.sale_price} ر.ي</Text>
        </View>
      </View>
    </View>
  </TouchableOpacity>
);

const styles = StyleSheet.create({
  productCard: {
    backgroundColor: '#fff',
    borderRadius: 16,
    marginBottom: 16,
    width: '48%', // Adjusted for grid spacing
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 3,
    overflow: 'hidden',
  },
  imageContainer: {
    width: '100%',
    height: 140,
    backgroundColor: '#F8FAFC',
  },
  productImage: {
    width: '100%',
    height: '100%',
    resizeMode: 'cover',
  },
  inheritedBadge: {
    position: 'absolute',
    top: 8,
    right: 8,
    backgroundColor: '#10B981',
    flexDirection: 'row-reverse',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    gap: 4,
  },
  inheritedText: {
    color: '#FFF',
    fontSize: 10,
    fontWeight: '800',
  },
  profitBadge: {
    position: 'absolute',
    bottom: 8,
    left: 8,
    backgroundColor: 'rgba(51, 65, 85, 0.85)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  profitText: {
    color: '#FFF',
    fontSize: 11,
    fontWeight: '800',
  },
  productInfo: {
    padding: 12,
  },
  productName: {
    fontSize: 14,
    fontWeight: '800',
    color: '#1E293B',
    textAlign: 'right',
    marginBottom: 2,
  },
  categoryName: {
    fontSize: 11,
    color: '#94A3B8',
    textAlign: 'right',
    marginBottom: 10,
  },
  priceRow: {
    flexDirection: 'row-reverse',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  priceLabel: {
    fontSize: 9,
    color: '#64748B',
    textAlign: 'right',
  },
  priceValue: {
    fontSize: 13,
    fontWeight: '800',
    color: '#1E293B',
  },
  priceDivider: {
    width: 1,
    height: 20,
    backgroundColor: '#F1F5F9',
  },
});

export default WholesaleProductCard;
