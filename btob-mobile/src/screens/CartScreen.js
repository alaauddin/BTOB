import React, { useState, useEffect } from 'react';
import { View, Text, FlatList, StyleSheet, ActivityIndicator, TouchableOpacity, Image, DeviceEventEmitter } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import client from '../api/client';
import CheckoutModal from '../components/CheckoutModal';
import { getSupplierTheme } from '../theme/supplierTheme';

export default function CartScreen({ route, navigation }) {
    const { supplierId, primaryColor: initialPrimaryColor } = route.params || {};
    const [cart, setCart] = useState(null);
    const [supplierData, setSupplierData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [isCheckoutModalVisible, setCheckoutModalVisible] = useState(false);

    const theme = getSupplierTheme(supplierData);

    useEffect(() => {
        if (supplierId && String(supplierId) !== 'undefined') {
            fetchCart();
            fetchSupplierProfile();
        } else {
            setLoading(false);
        }
    }, [supplierId]);

    const fetchSupplierProfile = async () => {
        try {
            // Use the router's detail endpoint which uses the numeric ID
            const response = await client.get(`/stores/${supplierId}/profile/`);
            if (response.data && response.data.success) {
                setSupplierData(response.data.supplier);
            }
        } catch (error) {
            console.error("Error fetching supplier profile in Cart", error);
        }
    };

    const fetchCart = async () => {
        try {
            const response = await client.get(`/carts/get_supplier_cart/?supplier_id=${supplierId}`);
            if (response.data.success) {
                setCart(response.data.cart);
                DeviceEventEmitter.emit(`cart_updated_${supplierId}`, response.data.cart_count);
            }
        } catch (error) {
            console.error('Error fetching cart', error);
        } finally {
            setLoading(false);
        }
    };

    const [updatingItems, setUpdatingItems] = useState(new Set());

    const handleUpdateQuantity = async (productId, currentQty, change, selectedOptions = []) => {
        const newQty = currentQty + change;
        if (newQty < 0) return;

        // Extract option IDs for the API
        const selectedOptionIds = (selectedOptions || []).map(opt => opt.id).sort();
        const itemKey = `${productId}_${JSON.stringify(selectedOptionIds)}`;
        
        if (updatingItems.has(itemKey)) return; // Tap blocker

        setUpdatingItems(prev => new Set(prev).add(itemKey));

        // Optimistic update
        setCart(prev => {
            if (!prev) return prev;
            const updatedItems = prev.items.map(item => {
                const itemOptionIds = (item.selected_options_details || []).map(o => o.id).sort();
                const isMatch = item.product.id === productId && 
                               JSON.stringify(itemOptionIds) === JSON.stringify(selectedOptionIds);
                
                if (isMatch) {
                    return { ...item, quantity: newQty };
                }
                return item;
            }).filter(item => item.quantity > 0);
            return { ...prev, items: updatedItems };
        });

        try {
            const response = await client.post('/carts/update_quantity/', {
                product_id: productId,
                quantity: newQty,
                selected_options: selectedOptionIds
            });
            if (!response.data.success) {
                fetchCart(); // Revert
            } else {
                DeviceEventEmitter.emit(`cart_updated_${supplierId}`, response.data.cart_count);
            }
        } catch (error) {
            fetchCart(); // Revert
            console.error("Update error", error);
        } finally {
            setUpdatingItems(prev => {
                const next = new Set(prev);
                next.delete(itemKey);
                return next;
            });
        }
    };

    const renderCartItem = ({ item }) => {
        const product = item.product;
        const imageUrl = product.image || (product.images && product.images.length > 0 ? product.images[0].image : null);

        // Calculate unit price from item fields (locked/variation aware)
        const lockedPrice = item.discount_price || item.price || product.price;
        const totalUnitPrice = parseFloat(lockedPrice) + parseFloat(item.price_modifier_total || 0);

        return (
            <View style={[styles.card, { shadowColor: theme.shadow || '#94a3b8' }]}>
                <View style={styles.imageContainer}>
                    {imageUrl ? (
                        <Image source={{ uri: imageUrl }} style={styles.productImage} />
                    ) : (
                        <View style={[styles.productImage, styles.placeholderImage]} />
                    )}
                </View>

                <View style={styles.cardContent}>
                    <View style={styles.cardHeader}>
                        <View style={{ flex: 1 }}>
                            <Text style={styles.boldText} numberOfLines={2}>{product.name}</Text>
                            {/* Selected Options Badges */}
                            {item.selected_options_details && item.selected_options_details.length > 0 && (
                                <View style={styles.optionsContainer}>
                                    {item.selected_options_details.map((opt) => (
                                        <View key={opt.id} style={styles.optionBadge}>
                                            <Text style={styles.optionBadgeText}>{opt.attribute_name}: {opt.value}</Text>
                                        </View>
                                    ))}
                                </View>
                            )}
                        </View>
                        <TouchableOpacity
                            onPress={() => handleUpdateQuantity(product.id, item.quantity, -item.quantity, item.selected_options_details)}
                            style={styles.deleteButton}
                        >
                            <Ionicons name="trash-outline" size={20} color="#ef4444" />
                        </TouchableOpacity>
                    </View>

                    <Text style={styles.priceText}>{totalUnitPrice.toFixed(2)} ر.ي</Text>

                    <View style={styles.actionRow}>
                        <View style={styles.quantityController}>
                            {(() => {
                                const itemOptionIds = (item.selected_options_details || []).map(o => o.id).sort();
                                const itemKey = `${product.id}_${JSON.stringify(itemOptionIds)}`;
                                const isUpdating = updatingItems.has(itemKey);

                                return (
                                    <>
                                        <TouchableOpacity 
                                            style={[styles.qtyBtn, isUpdating && { opacity: 0.5 }]} 
                                            onPress={() => handleUpdateQuantity(product.id, item.quantity, -1, item.selected_options_details)}
                                            disabled={isUpdating}
                                        >
                                            <Ionicons name="remove" size={16} color={theme.primary} />
                                        </TouchableOpacity>
                                        
                                        <View style={{ width: 30, alignItems: 'center' }}>
                                            {isUpdating ? (
                                                <ActivityIndicator size="small" color={theme.primary} />
                                            ) : (
                                                <Text style={styles.qtyNumber}>{item.quantity}</Text>
                                            )}
                                        </View>

                                        <TouchableOpacity 
                                            style={[styles.qtyBtn, { backgroundColor: theme.primary }, isUpdating && { opacity: 0.5 }]} 
                                            onPress={() => handleUpdateQuantity(product.id, item.quantity, 1, item.selected_options_details)}
                                            disabled={isUpdating}
                                        >
                                            <Ionicons name="add" size={16} color="#fff" />
                                        </TouchableOpacity>
                                    </>
                                );
                            })()}
                        </View>
                        <Text style={styles.subtotalText}>
                            المجموع: {parseFloat(item.subtotal_with_discount).toFixed(2)}
                        </Text>
                    </View>
                </View>
            </View>
        );
    };

    if (loading) {
        return (
            <View style={[styles.centerMode, { backgroundColor: theme.bg }]}>
                <ActivityIndicator size="large" color={theme.primary} />
            </View>
        );
    }

    return (
        <View style={[styles.container, { backgroundColor: theme.bg }]}>
            {!cart || !cart.items || cart.items.length === 0 ? (
                <View style={styles.emptyContainer}>
                    <Ionicons name="cart-outline" size={80} color={theme.primaryMuted || "#cbd5e1"} style={styles.emptyIcon} />
                    <Text style={[styles.emptyTitle, { color: theme.text }]}>سلة التسوق فارغة</Text>
                    <Text style={[styles.emptySubtitle, { color: theme.textMuted }]}>اكتشف المزيد من المنتجات المذهلة وتسوق الآن!</Text>
                    <TouchableOpacity
                        style={[styles.continueShoppingBtn, { backgroundColor: theme.primary, shadowColor: theme.primary }]}
                        onPress={() => navigation.goBack()}
                    >
                        <Text style={styles.continueShoppingText}>متابعة التسوق</Text>
                    </TouchableOpacity>
                </View>
            ) : (
                <>
                    <FlatList
                        data={cart.items}
                        keyExtractor={(item) => item.id.toString()}
                        renderItem={renderCartItem}
                        contentContainerStyle={styles.listContainer}
                        showsVerticalScrollIndicator={false}
                    />
                        <View style={[styles.checkoutFooter, { backgroundColor: theme.footer }]}>
                        <View style={styles.totalRow}>
                            <Text style={[styles.totalLabel, { color: theme.footerText }]}>الإجمالي الكلي:</Text>
                            <Text style={[styles.totalAmount, { color: theme.primary }]}>
                                {cart.items.reduce((sum, item) => sum + parseFloat(item.subtotal_with_discount), 0).toFixed(2)} ر.ي
                            </Text>
                        </View>
                        <TouchableOpacity style={[styles.checkoutButton, { backgroundColor: theme.primary, shadowColor: theme.primary }]} onPress={() => setCheckoutModalVisible(true)}>
                            <Text style={styles.checkoutButtonText}>إتمام الطلب</Text>
                            <Ionicons name="chevron-back" size={20} color="#fff" />
                        </TouchableOpacity>
                    </View>
                </>
            )}

            <CheckoutModal
                visible={isCheckoutModalVisible}
                onClose={() => setCheckoutModalVisible(false)}
                cart={cart}
                supplierId={supplierId}
                supplierData={supplierData}
                primaryColor={theme.primary}
                onSuccess={() => {
                    DeviceEventEmitter.emit(`cart_updated_${supplierId}`, 0);
                    navigation.goBack();
                }}
            />
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#F8FAFC',
    },
    centerMode: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: '#F8FAFC',
    },
    emptyContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        padding: 24,
    },
    emptyIcon: {
        marginBottom: 20,
        opacity: 0.8,
    },
    emptyTitle: {
        fontSize: 22,
        fontWeight: 'bold',
        color: '#1e293b',
        marginBottom: 8,
    },
    emptySubtitle: {
        fontSize: 15,
        color: '#64748b',
        textAlign: 'center',
        marginBottom: 32,
    },
    continueShoppingBtn: {
        backgroundColor: '#2B5876',
        paddingHorizontal: 32,
        paddingVertical: 14,
        borderRadius: 24,
        shadowColor: '#2B5876',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 8,
        elevation: 5,
    },
    continueShoppingText: {
        color: '#fff',
        fontSize: 16,
        fontWeight: 'bold',
    },
    listContainer: {
        padding: 16,
        paddingBottom: 24,
    },
    card: {
        backgroundColor: '#fff',
        borderRadius: 16,
        marginBottom: 16,
        elevation: 3,
        shadowColor: '#94a3b8',
        shadowOpacity: 0.15,
        shadowRadius: 8,
        shadowOffset: { width: 0, height: 4 },
        flexDirection: 'row',
        overflow: 'hidden',
    },
    imageContainer: {
        width: 100,
        backgroundColor: '#f1f5f9',
        justifyContent: 'center',
        alignItems: 'center',
    },
    productImage: {
        width: 100,
        height: 120,
        resizeMode: 'cover',
    },
    placeholderImage: {
        backgroundColor: '#e2e8f0',
    },
    cardContent: {
        flex: 1,
        padding: 14,
        justifyContent: 'space-between',
    },
    cardHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
    },
    boldText: {
        flex: 1,
        fontWeight: 'bold',
        fontSize: 15,
        color: '#0f172a',
        textAlign: 'right',
        marginRight: 8,
        lineHeight: 20,
    },
    deleteButton: {
        padding: 4,
        backgroundColor: '#fef2f2',
        borderRadius: 8,
    },
    priceText: {
        color: '#10b981', // Emerald green
        fontWeight: 'bold',
        fontSize: 16,
        marginVertical: 6,
        textAlign: 'right',
    },
    actionRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'flex-end',
        marginTop: 8,
    },
    subtotalText: {
        fontSize: 13,
        color: '#64748b',
        fontWeight: '600',
    },
    optionsContainer: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        marginTop: 4,
        gap: 4,
    },
    optionBadge: {
        backgroundColor: '#f1f5f9',
        paddingHorizontal: 8,
        paddingVertical: 2,
        borderRadius: 4,
        borderWidth: 1,
        borderColor: '#e2e8f0',
    },
    optionBadgeText: {
        fontSize: 10,
        color: '#475569',
        fontFamily: 'System',
    },
    quantityController: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#fff',
        borderRadius: 20,
        borderWidth: 1,
        borderColor: '#e2e8f0',
        padding: 2,
    },
    qtyBtn: {
        width: 28,
        height: 28,
        backgroundColor: '#f1f5f9',
        borderRadius: 14,
        alignItems: 'center',
        justifyContent: 'center',
    },
    qtyNumber: {
        marginHorizontal: 12,
        fontSize: 15,
        fontWeight: 'bold',
        color: '#1e293b'
    },
    checkoutFooter: {
        paddingHorizontal: 20,
        paddingVertical: 16,
        backgroundColor: '#fff',
        borderTopLeftRadius: 24,
        borderTopRightRadius: 24,
        elevation: 10,
        shadowColor: '#000',
        shadowOpacity: 0.1,
        shadowRadius: 12,
        shadowOffset: { width: 0, height: -4 },
    },
    totalRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 16,
    },
    totalLabel: {
        fontSize: 16,
        fontWeight: 'bold',
        color: '#64748b'
    },
    totalAmount: {
        fontSize: 22,
        fontWeight: 'bold',
        color: '#2B5876'
    },
    checkoutButton: {
        backgroundColor: '#2B5876',
        paddingVertical: 16,
        borderRadius: 12,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        shadowColor: '#2B5876',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 8,
        elevation: 4,
    },
    checkoutButtonText: {
        color: '#fff',
        fontSize: 18,
        fontWeight: 'bold',
        marginRight: 8,
    },
});
