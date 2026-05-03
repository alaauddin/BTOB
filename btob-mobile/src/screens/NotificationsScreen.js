import React, { useState, useEffect, useMemo } from 'react';
import { View, FlatList, TouchableOpacity, StyleSheet, ActivityIndicator, RefreshControl, Image, Platform } from 'react-native';
import { BlurView } from 'expo-blur';
import { LinearGradient } from 'expo-linear-gradient';
import { Feather } from '@expo/vector-icons';
import { useNotifications } from '../context/NotificationContext';
import { BRAND } from '../theme/brand';
import { THEME } from '../theme/profileTheme';
import Text from '../components/AppText';

const NOTIFICATION_ICONS = {
    info: { name: 'info', color: BRAND.colors.primary },
    success: { name: 'check-circle', color: '#10B981' },
    warning: { name: 'alert-triangle', color: '#F59E0B' },
    error: { name: 'alert-circle', color: '#EF4444' },
    order: { name: 'shopping-bag', color: BRAND.colors.primary },
    chat: { name: 'message-square', color: BRAND.colors.secondary },
};

export default function NotificationsScreen() {
    const { notifications, markAsRead, markAllAsRead, fetchNotifications } = useNotifications();
    const [refreshing, setRefreshing] = useState(false);
    const [filter, setFilter] = useState('all'); // 'all' or 'unread'

    const filteredNotifications = useMemo(() => {
        if (filter === 'unread') {
            return notifications.filter(n => !n.is_read);
        }
        return notifications;
    }, [notifications, filter]);

    const onRefresh = async () => {
        setRefreshing(true);
        await fetchNotifications();
        setRefreshing(false);
    };

    const renderItem = ({ item }) => {
        const icon = NOTIFICATION_ICONS[item.notification_type] || NOTIFICATION_ICONS.info;
        
        return (
            <TouchableOpacity 
                activeOpacity={0.7}
                style={[styles.notificationItem, !item.is_read && styles.unreadItem]}
                onPress={() => markAsRead(item.id)}
            >
                <LinearGradient
                    colors={[icon.color, icon.color + 'AA']}
                    style={styles.iconGradient}
                >
                    <Feather name={icon.name} size={20} color="#FFF" />
                </LinearGradient>

                <View style={styles.content}>
                    <View style={styles.row}>
                        <Text style={styles.title}>{item.title}</Text>
                        <Text style={styles.time}>
                            {new Date(item.created_at).toLocaleDateString([], { month: 'short', day: 'numeric' })}
                        </Text>
                    </View>
                    <Text style={styles.message} numberOfLines={2}>{item.message}</Text>
                    {item.image && (
                        <Image 
                            source={{ uri: item.image }} 
                            style={styles.notificationImage}
                            resizeMode="cover"
                        />
                    )}
                </View>
                {!item.is_read && (
                    <LinearGradient 
                        colors={[BRAND.colors.primary, BRAND.colors.secondary]} 
                        style={styles.unreadDot} 
                    />
                )}
            </TouchableOpacity>
        );
    };

    return (
        <View style={styles.container}>
            <View style={styles.headerContainer}>
                <BlurView intensity={Platform.OS === 'ios' ? 90 : 150} tint="light" style={styles.blurHeader}>
                    <View style={styles.headerContent}>
                        <View style={styles.headerTop}>
                            <Text style={styles.headerTitle}>الإشعارات</Text>
                            {notifications.some(n => !n.is_read) && (
                                <TouchableOpacity onPress={markAllAsRead}>
                                    <Text style={styles.markAll}>قراءة الكل</Text>
                                </TouchableOpacity>
                            )}
                        </View>
                        
                        <View style={styles.filterTabs}>
                            {['all', 'unread'].map((f) => (
                                <TouchableOpacity 
                                    key={f}
                                    onPress={() => setFilter(f)}
                                    style={[styles.filterPill, filter === f && styles.activePill]}
                                >
                                    <Text style={[styles.filterText, filter === f && styles.activeFilterText]}>
                                        {f === 'all' ? 'الكل' : 'غير مقروءة'}
                                    </Text>
                                </TouchableOpacity>
                            ))}
                        </View>
                    </View>
                </BlurView>
            </View>

            <FlatList
                data={filteredNotifications}
                renderItem={renderItem}
                keyExtractor={(item) => item.id.toString()}
                contentContainerStyle={styles.list}
                showsVerticalScrollIndicator={false}
                refreshControl={
                    <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[BRAND.colors.primary]} />
                }
                ListEmptyComponent={
                    <View style={styles.empty}>
                        <View style={styles.emptyIconContainer}>
                             <Feather name="bell-off" size={64} color={THEME.colors.slate[200]} />
                        </View>
                        <Text style={styles.emptyText}>لا توجد إشعارات حالياً</Text>
                    </View>
                }
            />
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#FDFDFD' },
    headerContainer: {
        zIndex: 10,
        backgroundColor: 'transparent',
    },
    blurHeader: {
        paddingTop: Platform.OS === 'ios' ? 60 : 40,
        paddingBottom: 15,
        borderBottomWidth: 1,
        borderBottomColor: 'rgba(0,0,0,0.05)',
    },
    headerContent: {
        paddingHorizontal: 20,
    },
    headerTop: {
        flexDirection: 'row-reverse',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 15,
    },
    headerTitle: { 
        fontSize: 28, 
        fontFamily: BRAND.typography.extraBold, 
        color: THEME.colors.slate[900],
        letterSpacing: -0.5
    },
    markAll: { fontSize: 14, color: BRAND.colors.primary, fontFamily: BRAND.typography.bold },
    
    filterTabs: {
        flexDirection: 'row-reverse',
        backgroundColor: '#F1F5F9',
        borderRadius: 12,
        padding: 4,
    },
    filterPill: {
        flex: 1,
        paddingVertical: 8,
        alignItems: 'center',
        borderRadius: 10,
    },
    activePill: {
        backgroundColor: '#FFF',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
        elevation: 2,
    },
    filterText: {
        fontSize: 14,
        fontFamily: BRAND.typography.bold,
        color: THEME.colors.slate[500],
    },
    activeFilterText: {
        color: BRAND.colors.primary,
    },

    list: { 
        padding: 16,
        paddingTop: 10 
    },
    notificationItem: { 
        flexDirection: 'row-reverse', 
        padding: 16, 
        backgroundColor: '#FFF',
        borderRadius: 24,
        marginBottom: 12,
        shadowColor: '#64748B',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.05,
        shadowRadius: 12,
        elevation: 3,
        borderWidth: 1,
        borderColor: '#F1F5F9'
    },
    unreadItem: {
        borderColor: BRAND.colors.primary + '20',
        backgroundColor: '#FFFFFF',
        shadowOpacity: 0.08,
    },
    iconGradient: {
        width: 48,
        height: 48,
        borderRadius: 16,
        justifyContent: 'center',
        alignItems: 'center',
    },
    content: { flex: 1, marginRight: 16, alignItems: 'flex-end' },
    row: { 
        flexDirection: 'row-reverse', 
        justifyContent: 'space-between', 
        width: '100%', 
        alignItems: 'center',
        marginBottom: 4
    },
    title: { 
        fontSize: 16, 
        fontFamily: BRAND.typography.extraBold, 
        color: THEME.colors.slate[800],
    },
    time: { fontSize: 12, color: THEME.colors.slate[400], fontFamily: BRAND.typography.medium },
    message: { 
        fontSize: 14, 
        color: THEME.colors.slate[500], 
        lineHeight: 20,
        textAlign: 'right' 
    },
    notificationImage: {
        width: '100%',
        height: 180,
        borderRadius: 18,
        marginTop: 12,
        backgroundColor: '#F8FAFC'
    },
    unreadDot: { 
        width: 10, 
        height: 10, 
        borderRadius: 5, 
        marginLeft: 12,
        alignSelf: 'center'
    },
    empty: { alignItems: 'center', marginTop: 120 },
    emptyIconContainer: {
        width: 120,
        height: 120,
        borderRadius: 60,
        backgroundColor: '#F1F5F9',
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 20
    },
    emptyText: { fontSize: 18, color: THEME.colors.slate[400], fontFamily: BRAND.typography.bold }
});
