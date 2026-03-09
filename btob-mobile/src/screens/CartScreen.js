import React, { useState, useEffect } from 'react';
import { View, Text, FlatList, StyleSheet, ActivityIndicator, TouchableOpacity, Image, DeviceEventEmitter } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import client from '../api/client';
import CheckoutModal from '../components/CheckoutModal';

export default function CartScreen({ route, navigation }) {
    const { supplierId } = route.params || {};
    const [cart, setCart] = useState(null);
    const [loading, setLoading] = useState(true);
    const [isCheckoutModalVisible, setCheckoutModalVisible] = useState(false);

    useEffect(() => {
        if (supplierId) {
            fetchCart();
        } else {
            console.error("No supplierId provided to CartScreen");
            setLoading(false);
        }
    }, [supplierId]);

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

    const handleUpdateQuantity = async (productId, currentQty, change) => {
        const newQty = currentQty + change;
        if (newQty < 0) return;

        // Optimistic update
        setCart(prev => {
            if (!prev) return prev;
            const updatedItems = prev.items.map(item => {
                if (item.product.id === productId) {
                    return { ...item, quantity: newQty };
                }
                return item;
            }).filter(item => item.quantity > 0);
            return { ...prev, items: updatedItems };
        });

        try {
            const response = await client.post('/carts/update_quantity/', {
                product_id: productId,
                quantity: newQty
            });
            if (!response.data.success) {
                fetchCart(); // Revert
            } else {
                DeviceEventEmitter.emit(`cart_updated_${supplierId}`, response.data.cart_count);
            }
        } catch (error) {
            fetchCart(); // Revert
            console.error("Update error", error);
        }
    };

    const renderCartItem = ({ item }) => {
        const product = item.product;
        const imageUrl = product.image || (product.images && product.images.length > 0 ? product.images[0].image : null);

        return (
            <View style={styles.card}>
                <View style={styles.imageContainer}>
                    {imageUrl ? (
                        <Image source={{ uri: imageUrl }} style={styles.productImage} />
                    ) : (
                        <View style={[styles.productImage, styles.placeholderImage]} />
                    )}
                </View>

                <View style={styles.cardContent}>
                    <View style={styles.cardHeader}>
                        <Text style={styles.boldText} numberOfLines={2}>{product.name}</Text>
                        <TouchableOpacity
                            onPress={() => handleUpdateQuantity(product.id, item.quantity, -item.quantity)}
                            style={styles.deleteButton}
                        >
                            <Ionicons name="trash-outline" size={20} color="#ef4444" />
                        </TouchableOpacity>
                    </View>

                    <Text style={styles.priceText}>{parseFloat(product.price).toFixed(2)} ر.ي</Text>

                    <View style={styles.actionRow}>
                        <View style={styles.quantityController}>
                            <TouchableOpacity style={styles.qtyBtn} onPress={() => handleUpdateQuantity(product.id, item.quantity, -1)}>
                                <Ionicons name="remove" size={16} color="#2B5876" />
                            </TouchableOpacity>
                            <Text style={styles.qtyNumber}>{item.quantity}</Text>
                            <TouchableOpacity style={[styles.qtyBtn, { backgroundColor: '#2B5876' }]} onPress={() => handleUpdateQuantity(product.id, item.quantity, 1)}>
                                <Ionicons name="add" size={16} color="#fff" />
                            </TouchableOpacity>
                        </View>
                        <Text style={styles.subtotalText}>
                            المجموع: {(item.quantity * parseFloat(product.price)).toFixed(2)}
                        </Text>
                    </View>
                </View>
            </View>
        );
    };

    if (loading) {
        return (
            <View style={styles.centerMode}>
                <ActivityIndicator size="large" color="#2B5876" />
            </View>
        );
    }

    return (
        <View style={styles.container}>
            {!cart || !cart.items || cart.items.length === 0 ? (
                <View style={styles.emptyContainer}>
                    <Ionicons name="cart-outline" size={80} color="#cbd5e1" style={styles.emptyIcon} />
                    <Text style={styles.emptyTitle}>سلة التسوق فارغة</Text>
                    <Text style={styles.emptySubtitle}>اكتشف المزيد من المنتجات المذهلة وتسوق الآن!</Text>
                    <TouchableOpacity
                        style={styles.continueShoppingBtn}
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
                    <View style={styles.checkoutFooter}>
                        <View style={styles.totalRow}>
                            <Text style={styles.totalLabel}>الإجمالي الكلي:</Text>
                            <Text style={styles.totalAmount}>
                                {cart.items.reduce((sum, item) => sum + (item.quantity * parseFloat(item.product.price)), 0).toFixed(2)} ر.ي
                            </Text>
                        </View>
                        <TouchableOpacity style={styles.checkoutButton} onPress={() => setCheckoutModalVisible(true)}>
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
