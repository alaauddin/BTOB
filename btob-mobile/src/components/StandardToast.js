import React, { useEffect, useRef } from 'react';
import { View, StyleSheet, Animated, Dimensions, TouchableOpacity, Platform } from 'react-native';
import { BlurView } from 'expo-blur';
import { Feather, Ionicons } from '@expo/vector-icons';
import Text from './AppText';
import { BRAND } from '../theme/brand';

const { width } = Dimensions.get('window');

const StandardToast = ({ 
    visible, title, message, type = 'error', 
    onClose, isNetworkError = false 
}) => {
    const translateY = useRef(new Animated.Value(-100)).current;
    const opacity = useRef(new Animated.Value(0)).current;

    useEffect(() => {
        if (visible) {
            Animated.parallel([
                Animated.spring(translateY, {
                    toValue: 60, // Position from top
                    useNativeDriver: true,
                    bounciness: 12,
                }),
                Animated.timing(opacity, {
                    toValue: 1,
                    duration: 300,
                    useNativeDriver: true,
                })
            ]).start();
        } else {
            Animated.parallel([
                Animated.timing(translateY, {
                    toValue: -100,
                    duration: 300,
                    useNativeDriver: true,
                }),
                Animated.timing(opacity, {
                    toValue: 0,
                    duration: 300,
                    useNativeDriver: true,
                })
            ]).start();
        }
    }, [visible]);

    if (!visible && opacity._value === 0) return null;

    const getIcon = () => {
        switch (type) {
            case 'success': return <Ionicons name="checkmark-circle" size={28} color="#10b981" />;
            case 'warning': return <Ionicons name="warning" size={28} color="#f59e0b" />;
            case 'info': return <Ionicons name="information-circle" size={28} color="#3b82f6" />;
            default: return <Ionicons name="alert-circle" size={28} color="#ef4444" />;
        }
    };

    const getBorderColor = () => {
        switch (type) {
            case 'success': return '#10b98144';
            case 'warning': return '#f59e0b44';
            case 'info': return '#3b82f644';
            default: return '#ef444444';
        }
    };

    return (
        <Animated.View style={[
            styles.container, 
            { 
                transform: [{ translateY }],
                opacity,
                borderColor: getBorderColor(),
            }
        ]}>
            <BlurView intensity={90} tint="light" style={styles.blurContainer}>
                <View style={styles.content}>
                    <View style={styles.iconWrapper}>
                        {getIcon()}
                    </View>
                    <View style={styles.textWrapper}>
                        <Text style={styles.title}>{title}</Text>
                        <Text style={styles.message} numberOfLines={2}>
                            {message}
                        </Text>
                    </View>
                    <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
                        <Feather name="x" size={18} color="#94a3b8" />
                    </TouchableOpacity>
                </View>
                
                {isNetworkError && (
                    <View style={styles.networkBadge}>
                        <Text style={styles.networkBadgeText}>مشكلة في الشبكة</Text>
                    </View>
                )}
            </BlurView>
        </Animated.View>
    );
};

const styles = StyleSheet.create({
    container: {
        position: 'absolute',
        top: 0,
        left: 20,
        right: 20,
        zIndex: 9999,
        borderRadius: 20,
        borderWidth: 1.5,
        elevation: 10,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 10 },
        shadowOpacity: 0.1,
        shadowRadius: 20,
        overflow: 'hidden',
    },
    blurContainer: {
        padding: 16,
        paddingTop: 18,
    },
    content: {
        flexDirection: 'row-reverse', // RTL compatibility
        alignItems: 'center',
    },
    iconWrapper: {
        marginLeft: 14,
    },
    textWrapper: {
        flex: 1,
        alignItems: 'flex-end', // RTL alignment
    },
    title: {
        fontSize: 16,
        fontFamily: BRAND.typography.extraBold,
        color: '#1e293b',
        marginBottom: 2,
        fontFamily: Platform.OS === 'ios' ? 'System' : 'serif', // Placeholder for Arabic font
    },
    message: {
        fontSize: 13,
        color: '#64748b',
        lineHeight: 18,
        textAlign: 'auto',
    },
    closeBtn: {
        padding: 4,
        marginRight: 8,
    },
    networkBadge: {
        backgroundColor: '#f59e0b15',
        alignSelf: 'flex-end',
        marginTop: 8,
        paddingHorizontal: 10,
        paddingVertical: 2,
        borderRadius: 8,
        borderWidth: 1,
        borderColor: '#f59e0b33',
    },
    networkBadgeText: {
        fontSize: 10,
        fontFamily: BRAND.typography.bold,
        color: '#d97706',
    }
});

export default StandardToast;
