import React, { useState, useEffect, useCallback } from "react";
import { View, FlatList, TouchableOpacity, StyleSheet, ActivityIndicator, Image, Dimensions, RefreshControl } from 'react-native';
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from 'expo-linear-gradient';
import { useNavigation } from "@react-navigation/native";
import { BRAND } from "../theme/brand";
import client from "../api/client";
import { useAuth } from "../context/AuthContext";
import Text from '../components/AppText';

const { width } = Dimensions.get("window");
const CARD_WIDTH = (width - 48) / 2;

export default function WishlistScreen() {
    const navigation = useNavigation();
    const { user } = useAuth();
    const [wishlist, setWishlist] = useState([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);

    const fetchWishlist = async () => {
        try {
            const response = await client.get('wishlist/');
            if (response.data.success) {
                setWishlist(response.data.wishlist || []);
            }
        } catch (error) {
            console.error("Error fetching wishlist", error);
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    };

    useEffect(() => {
        if (user) {
            fetchWishlist();
        } else {
            setLoading(false);
        }
    }, [user]);

    const onRefresh = useCallback(() => {
        setRefreshing(true);
        fetchWishlist();
    }, []);

    const handleRemove = async (productId) => {
        try {
            const response = await client.post(`wishlist/toggle/${productId}/`);
            if (response.data.success) {
                setWishlist(prev => prev.filter(item => item.product.id !== productId));
            }
        } catch (error) {
            console.error("Error removing from wishlist", error);
        }
    };

    const renderItem = ({ item }) => {
        const product = item.product;
        const imageUrl = product.image;

        return (
            <TouchableOpacity 
                style={styles.card}
                onPress={() => navigation.navigate("ProductDetails", { productId: product.id })}
            >
                <View style={styles.imageContainer}>
                    {imageUrl ? (
                        <Image source={{ uri: imageUrl }} style={styles.image} />
                    ) : (
                        <View style={styles.placeholder}>
                            <Ionicons name="image-outline" size={32} color="#CBD5E1" />
                        </View>
                    )}
                    <TouchableOpacity 
                        style={styles.removeBtn}
                        onPress={() => handleRemove(product.id)}
                    >
                        <Ionicons name="trash-outline" size={18} color="#EF4444" />
                    </TouchableOpacity>
                </View>
                <View style={styles.info}>
                    <Text style={styles.name} numberOfLines={1}>{product.name}</Text>
                    <Text style={styles.price}>{product.price} ر.ي</Text>
                </View>
            </TouchableOpacity>
        );
    };

    if (!user) {
        return (
            <View style={styles.center}>
                <Ionicons name="heart-dislike-outline" size={64} color="#CBD5E1" />
                <Text style={styles.emptyText}>يرجى تسجيل الدخول لعرض المفضلة</Text>
            </View>
        );
    }

    if (loading) {
        return (
            <View style={styles.center}>
                <ActivityIndicator size="large" color={BRAND.colors.primary} />
            </View>
        );
    }

    return (
        <View style={styles.container}>
            <View style={styles.header}>
                <Text style={styles.title}>المفضلة</Text>
                <Text style={styles.subtitle}>{wishlist.length} منتجات</Text>
            </View>

            {wishlist.length > 0 ? (
                <FlatList
                    data={wishlist}
                    renderItem={renderItem}
                    keyExtractor={item => item.id.toString()}
                    numColumns={2}
                    contentContainerStyle={styles.list}
                    refreshControl={
                        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} color={BRAND.colors.primary} />
                    }
                />
            ) : (
                <View style={styles.center}>
                    <Ionicons name="heart-outline" size={64} color="#CBD5E1" />
                    <Text style={styles.emptyText}>قائمة المفضلة فارغة</Text>
                    <TouchableOpacity 
                        style={styles.shopBtn}
                        onPress={() => navigation.navigate("Home")}
                    >
                        <Text style={styles.shopBtnText}>تسوق الآن</Text>
                    </TouchableOpacity>
                </View>
            )}
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#F8FAFC',
    },
    header: {
        padding: 24,
        backgroundColor: '#FFF',
        borderBottomWidth: 1,
        borderBottomColor: '#F1F5F9',
    },
    title: {
        fontSize: 28,
        fontFamily: BRAND.typography.extraBold,
        color: '#0F172A',
    },
    subtitle: {
        fontSize: 14,
        color: '#64748B',
        marginTop: 4,
        fontFamily: BRAND.typography.medium,
    },
    list: {
        padding: 16,
    },
    card: {
        width: CARD_WIDTH,
        backgroundColor: '#FFF',
        borderRadius: 20,
        marginBottom: 16,
        marginHorizontal: 4,
        overflow: 'hidden',
        borderWidth: 1,
        borderColor: '#F1F5F9',
        elevation: 2,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.05,
        shadowRadius: 8,
    },
    imageContainer: {
        width: '100%',
        height: CARD_WIDTH,
        backgroundColor: '#F1F5F9',
    },
    image: {
        width: '100%',
        height: '100%',
        resizeMode: 'cover',
    },
    placeholder: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    removeBtn: {
        position: 'absolute',
        top: 8,
        right: 8,
        width: 32,
        height: 32,
        borderRadius: 16,
        backgroundColor: 'rgba(255, 255, 255, 0.9)',
        justifyContent: 'center',
        alignItems: 'center',
    },
    info: {
        padding: 12,
    },
    name: {
        fontSize: 14,
        fontFamily: BRAND.typography.bold,
        color: '#1E293B',
    },
    price: {
        fontSize: 15,
        fontFamily: BRAND.typography.extraBold,
        color: BRAND.colors.primary,
        marginTop: 4,
    },
    center: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        padding: 20,
    },
    emptyText: {
        fontSize: 16,
        color: '#64748B',
        marginTop: 16,
        textAlign: 'center',
        fontFamily: BRAND.typography.medium,
    },
    shopBtn: {
        marginTop: 24,
        paddingHorizontal: 32,
        paddingVertical: 12,
        backgroundColor: BRAND.colors.primary,
        borderRadius: 12,
    },
    shopBtnText: {
        color: '#FFF',
        fontSize: 16,
        fontFamily: BRAND.typography.bold,
    },
});
