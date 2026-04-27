import React, { useState, useEffect } from 'react';
import { View, FlatList, TouchableOpacity, StyleSheet, ActivityIndicator, Image } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { Feather } from '@expo/vector-icons';
import { chatApi } from '../api/chat';
import { THEME } from '../theme/profileTheme';
import { BRAND } from '../theme/brand';
import Text from '../components/AppText';

export default function ChatListScreen() {
    const navigation = useNavigation();
    const [threads, setThreads] = useState([]);
    const [loading, setLoading] = useState(true);

    const fetchThreads = async () => {
        try {
            const res = await chatApi.getThreads();
            setThreads(res.data);
        } catch (err) {
            console.error('Failed to fetch threads', err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        const unsubscribe = navigation.addListener('focus', fetchThreads);
        return unsubscribe;
    }, [navigation]);

    const renderItem = ({ item }) => (
        <TouchableOpacity 
            style={styles.threadItem}
            onPress={() => navigation.navigate('Chat', { thread: item })}
        >
            <View style={styles.avatar}>
                {item.other_party_avatar ? (
                    <Image source={{ uri: item.other_party_avatar }} style={styles.avatarImg} />
                ) : (
                    <Text style={styles.avatarText}>{item.other_party_name[0]}</Text>
                )}
            </View>
            <View style={styles.threadInfo}>
                <View style={styles.threadHeader}>
                    <Text style={styles.supplierName}>{item.other_party_name}</Text>
                    <Text style={styles.time}>
                        {new Date(item.updated_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </Text>
                </View>
                <Text style={styles.lastMessage} numberOfLines={1}>
                    {item.last_message?.text || 'بدء محادثة جديدة...'}
                </Text>
            </View>
            {item.last_message && !item.last_message.is_read && item.last_message.sender_name !== 'me' && (
                <View style={styles.unreadDot} />
            )}
        </TouchableOpacity>
    );


    if (loading) {
        return (
            <View style={styles.centered}>
                <ActivityIndicator size="large" color={BRAND.colors.primary} />
            </View>
        );
    }

    return (
        <View style={styles.container}>
            <View style={styles.header}>
                <Text style={styles.title}>المحادثات</Text>
            </View>
            <FlatList
                data={threads}
                renderItem={renderItem}
                keyExtractor={(item) => item.id.toString()}
                contentContainerStyle={styles.list}
                ListEmptyComponent={
                    <View style={styles.empty}>
                        <Feather name="message-square" size={64} color={THEME.colors.slate[200]} />
                        <Text style={styles.emptyText}>لا توجد محادثات نشطة حالياً</Text>
                    </View>
                }
            />
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#FFF' },
    centered: { flex: 1, justifyContent: 'center', alignItems: 'center' },
    header: { padding: 20, paddingTop: 60, borderBottomWidth: 1, borderBottomColor: '#F1F5F9' },
    title: { fontSize: 24, fontFamily: BRAND.typography.extraBold, color: THEME.colors.slate[900], textAlign: 'auto' },
    list: { padding: 10 },
    threadItem: { 
        flexDirection: 'row-reverse', 
        alignItems: 'center', 
        padding: 15, 
        backgroundColor: '#FFF',
        borderRadius: 20,
        marginBottom: 10,
        borderWidth: 1,
        borderColor: '#F1F5F9'
    },
    avatar: { 
        width: 50, 
        height: 50, 
        borderRadius: 25, 
        backgroundColor: BRAND.colors.primary + '20', 
        justifyContent: 'center', 
        alignItems: 'center',
        overflow: 'hidden'
    },
    avatarImg: { width: '100%', height: '100%' },
    avatarText: { fontSize: 20, fontFamily: BRAND.typography.extraBold, color: BRAND.colors.primary },

    threadInfo: { flex: 1, marginRight: 15, alignItems: 'flex-end' },
    threadHeader: { flexDirection: 'row-reverse', justifyContent: 'space-between', width: '100%' },
    supplierName: { fontSize: 16, fontFamily: BRAND.typography.extraBold, color: THEME.colors.slate[800] },
    time: { fontSize: 12, color: THEME.colors.slate[400] },
    lastMessage: { fontSize: 14, color: THEME.colors.slate[500], marginTop: 4 },
    unreadDot: { width: 10, height: 10, borderRadius: 5, backgroundColor: BRAND.colors.primary, marginLeft: 10 },
    empty: { alignItems: 'center', marginTop: 100 },
    emptyText: { marginTop: 20, fontSize: 16, color: THEME.colors.slate[400], fontFamily: BRAND.typography.extraBold }
});
