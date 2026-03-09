import React, { useState, useEffect, useRef } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, DeviceEventEmitter } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import client from '../api/client';
import { useAuth } from '../context/AuthContext';

// Global cache dictionary to prevent fetch spamming across unmounts in React Navigation
const hasFetchedForSupplier = {};

export default function CartIconBadge({ supplierId, iconColor = "#1e293b", size = 22 }) {
    const [itemCount, setItemCount] = useState(0);
    const { user } = useAuth();
    const navigation = useNavigation();

    useEffect(() => {
        let subscription;
        if (user && supplierId) {
            // Only fetch from network if we haven't fetched for this specific supplier yet
            if (!hasFetchedForSupplier[supplierId]) {
                fetchCartCount();
                hasFetchedForSupplier[supplierId] = true;
            }
            subscription = DeviceEventEmitter.addListener(`cart_updated_${supplierId}`, (newCount) => {
                setItemCount(newCount);
            });
        } else {
            setItemCount(0);
        }

        return () => {
            if (subscription) {
                subscription.remove();
            }
        }
    }, [supplierId, user]);

    const fetchCartCount = async () => {
        try {
            const response = await client.get(`/carts/count/?supplier_id=${supplierId}`);
            if (response.data.success) {
                setItemCount(response.data.count);
            }
        } catch (error) {
            // Silently fail to not spam warnings if offline
        }
    };

    const handlePress = () => {
        navigation.navigate("Cart", { supplierId });
    };

    return (
        <TouchableOpacity onPress={handlePress} style={styles.container}>
            <Feather name="shopping-bag" size={size} color={iconColor} />
            {itemCount > 0 && (
                <View style={styles.badgeContainer}>
                    <Text style={styles.badgeText}>{itemCount > 99 ? '99+' : itemCount}</Text>
                </View>
            )}
        </TouchableOpacity>
    );
}

const styles = StyleSheet.create({
    container: {
        padding: 4,
        position: 'relative',
        justifyContent: 'center',
        alignItems: 'center',
    },
    badgeContainer: {
        position: 'absolute',
        top: -2,
        right: -4,
        backgroundColor: '#ef4444', // Red-500
        borderRadius: 10,
        minWidth: 18,
        height: 18,
        justifyContent: 'center',
        alignItems: 'center',
        paddingHorizontal: 4,
        borderWidth: 1.5,
        borderColor: '#fff',
    },
    badgeText: {
        color: '#fff',
        fontSize: 10,
        fontWeight: 'bold',
        textAlign: 'center',
    },
});
