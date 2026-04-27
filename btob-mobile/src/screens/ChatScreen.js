import React, { useState, useEffect, useRef } from 'react';
import { View, StyleSheet, FlatList, TouchableOpacity, KeyboardAvoidingView, Platform, ActivityIndicator, SafeAreaView, Keyboard, ImageBackground, Image } from 'react-native';
import { Feather, Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useChat } from '../context/ChatContext';
import { chatApi } from '../api/chat';
import { useAuth } from '../context/AuthContext';
import { THEME } from '../theme/profileTheme';
import { BRAND } from '../theme/brand';
import Text from '../components/AppText';
import TextInput from '../components/AppTextInput';

export default function ChatScreen({ route, navigation }) {
    const { thread } = route.params;
    const { user } = useAuth();
    const { messages, setMessages, sendMessage, connected } = useChat(thread.id);
    const [inputText, setInputText] = useState('');
    const [loading, setLoading] = useState(true);
    const flatListRef = useRef();

    useEffect(() => {
        const fetchHistory = async () => {
            try {
                const res = await chatApi.getMessages(thread.id);
                setMessages(res.data);
            } catch (err) {
                console.error('Failed to fetch messages', err);
            } finally {
                setLoading(false);
            }
        };
        fetchHistory();
    }, [thread.id, setMessages]);

    useEffect(() => {
        if (messages.length > 0) {
            setTimeout(() => {
                flatListRef.current?.scrollToEnd({ animated: true });
            }, 100);
        }
    }, [messages]);

    useEffect(() => {
        const keyboardDidShowListener = Keyboard.addListener(
            'keyboardDidShow',
            () => {
                flatListRef.current?.scrollToEnd({ animated: true });
            }
        );
        return () => keyboardDidShowListener.remove();
    }, []);

    const handleSend = () => {
        if (inputText.trim() && connected) {
            sendMessage(inputText.trim());
            setInputText('');
        }
    };

    const primaryColor = thread.primary_color || BRAND.colors.primary;
    const secondaryColor = thread.secondary_color || '#FFF';

    const renderMessage = ({ item, index }) => {
        const isMine = item.sender === user?.id;
        const prevMessage = messages[index - 1];
        const showDateHeader = !prevMessage || 
            new Date(item.created_at).toDateString() !== new Date(prevMessage.created_at).toDateString();

        const formatDate = (dateString) => {
            const date = new Date(dateString);
            const today = new Date();
            const yesterday = new Date();
            yesterday.setDate(today.getDate() - 1);

            if (date.toDateString() === today.toDateString()) return 'اليوم';
            if (date.toDateString() === yesterday.toDateString()) return 'أمس';
            return date.toLocaleDateString('ar-YE', { weekday: 'long', day: 'numeric', month: 'long' });
        };

        const isSupplier = item.sender && item.sender !== thread.customer;

        return (
            <View>
                {showDateHeader && (
                    <View style={styles.dateHeader}>
                        <View style={styles.dateLine} />
                        <Text style={styles.dateText}>{formatDate(item.created_at)}</Text>
                        <View style={styles.dateLine} />
                    </View>
                )}
                <View style={[styles.messageRow, isMine ? styles.myRow : styles.theirRow]}>
                    {isSupplier ? (
                        <>
                            {/* In RTL: First child is Rightmost. 
                                For "My" messages on Right, Avatar should be First.
                                For "Their" messages on Left, Avatar should be Second. */}
                            {isMine && (
                                <View style={[styles.miniAvatar, { backgroundColor: primaryColor + '15' }]}>
                                    <Text style={[styles.miniAvatarText, { color: primaryColor }]}>{thread.supplier_name[0]}</Text>
                                </View>
                            )}
                            <View style={[styles.bubble, isMine ? styles.myBubble : styles.theirBubble, isMine && { backgroundColor: primaryColor, overflow: 'hidden' }]}>
                                {isMine ? (
                                    <LinearGradient
                                        colors={[primaryColor, primaryColor + 'E6']}
                                        start={{ x: 0, y: 0 }}
                                        end={{ x: 1, y: 1 }}
                                        style={StyleSheet.absoluteFill}
                                    />
                                ) : null}
                                <Text style={isMine ? styles.myText : styles.theirText}>{item.text}</Text>
                                <View style={styles.timeRow}>
                                    <Text style={isMine ? styles.myTime : styles.theirTime}>
                                        {new Date(item.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                    </Text>
                                    {isMine && <Ionicons name="checkmark-done" size={14} color="rgba(255,255,255,0.6)" />}
                                </View>
                            </View>
                            {!isMine && (
                                <View style={[styles.miniAvatar, { backgroundColor: primaryColor + '15' }]}>
                                    <Text style={[styles.miniAvatarText, { color: primaryColor }]}>{thread.supplier_name[0]}</Text>
                                </View>
                            )}
                        </>
                    ) : (
                        <View style={[styles.bubble, isMine ? styles.myBubble : styles.theirBubble, isMine && { backgroundColor: primaryColor }]}>
                            {isMine ? (
                                <LinearGradient
                                    colors={[primaryColor, primaryColor + 'E6']}
                                    start={{ x: 0, y: 0 }}
                                    end={{ x: 1, y: 1 }}
                                    style={StyleSheet.absoluteFill}
                                />
                            ) : null}
                            <Text style={isMine ? styles.myText : styles.theirText}>{item.text}</Text>
                            <View style={styles.timeRow}>
                                <Text style={isMine ? styles.myTime : styles.theirTime}>
                                    {new Date(item.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                </Text>
                                {isMine && <Ionicons name="checkmark-done" size={14} color="rgba(255,255,255,0.6)" />}
                            </View>
                        </View>
                    )}
                </View>
            </View>
        );
    };

    return (
        <SafeAreaView style={styles.container}>
            {/* Header */}
            <View style={[styles.header, { backgroundColor: primaryColor }]}>
                <View style={styles.headerContent}>
                    <TouchableOpacity onPress={() => navigation.goBack()} style={styles.iconBtn}>
                        <Ionicons name="chevron-forward" size={28} color="#FFF" />
                    </TouchableOpacity>
                    
                    <View style={styles.headerInfo}>
                        <Text style={[styles.headerName, { color: '#FFF' }]}>{thread.other_party_name}</Text>
                        <View style={styles.statusRow}>
                            <View style={[styles.statusDot, { backgroundColor: connected ? THEME.colors.emerald : THEME.colors.rose }]} />
                            <Text style={[styles.statusText, { color: '#FFF' }]}>{connected ? 'نشط الآن' : 'غير متصل'}</Text>
                        </View>
                    </View>
                </View>
            </View>


            <KeyboardAvoidingView 
                style={{ flex: 1 }} 
                behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
                keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}
            >

                <View style={{ flex: 1 }}>
                    {loading ? (
                        <View style={styles.centered}>
                            <ActivityIndicator size="large" color={BRAND.colors.primary} />
                        </View>
                    ) : (
                        <FlatList
                            ref={flatListRef}
                            data={messages}
                            renderItem={renderMessage}
                            keyExtractor={(item, idx) => item.id?.toString() || idx.toString()}
                            contentContainerStyle={styles.messageList}
                            onContentSizeChange={() => flatListRef.current?.scrollToEnd({ animated: true })}
                            showsVerticalScrollIndicator={false}
                        />
                    )}
                </View>

                {/* Modern Input Area */}
                <View style={styles.inputWrapper}>
                    <View style={styles.inputPill}>
                        <TouchableOpacity 
                            style={[styles.sendCircle, { backgroundColor: inputText.trim() && connected ? BRAND.colors.primary : '#E2E8F0' }]} 
                            onPress={handleSend}
                            disabled={!inputText.trim() || !connected}
                        >
                            <MaterialCommunityIcons name="send" size={22} color="#FFF" style={{ transform: [{ rotate: '180deg' }] }} />
                        </TouchableOpacity>
                        
                        <TextInput
                            style={styles.input}
                            placeholder="اكتب رسالتك..."
                            placeholderTextColor="#94A3B8"
                            value={inputText}
                            onChangeText={setInputText}
                            multiline
                            maxHeight={120}
                        />

                        <TouchableOpacity style={styles.attachBtn}>
                            <Feather name="plus" size={24} color="#94A3B8" />
                        </TouchableOpacity>
                    </View>
                </View>
            </KeyboardAvoidingView>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#F1F5F9' },
    centered: { flex: 1, justifyContent: 'center', alignItems: 'center' },
    header: { 
        backgroundColor: '#FFF', 
        paddingTop: Platform.OS === 'android' ? 10 : 0,
        borderBottomWidth: 1, 
        borderBottomColor: '#E2E8F0',
        zIndex: 10
    },
    headerContent: {
        flexDirection: 'row', 
        alignItems: 'center', 
        paddingHorizontal: 15,
        paddingVertical: 12,
    },
    iconBtn: { width: 40, height: 40, justifyContent: 'center', alignItems: 'center' },
    headerInfo: { flex: 1, alignItems: 'flex-end', marginRight: 12 },
    headerName: { fontSize: 18, fontFamily: BRAND.typography.extraBold, color: THEME.colors.slate[800], letterSpacing: -0.5 },
    statusRow: { flexDirection: 'row-reverse', alignItems: 'center', gap: 6, marginTop: 2 },
    statusDot: { width: 8, height: 8, borderRadius: 4, borderWidth: 1, borderColor: '#FFF' },
    statusText: { fontSize: 12, color: THEME.colors.slate[400], fontFamily: BRAND.typography.bold },
    headerAvatarWrapper: { position: 'relative' },
    headerAvatarImg: { width: 48, height: 48, borderRadius: 24, backgroundColor: '#F1F5F9' },
    headerAvatarFallback: { width: 48, height: 48, borderRadius: 24, backgroundColor: BRAND.colors.primary + '15', justifyContent: 'center', alignItems: 'center' },
    avatarText: { fontSize: 20, fontFamily: BRAND.typography.extraBold, color: BRAND.colors.primary },
    onlineBadge: { position: 'absolute', bottom: 2, right: 2, width: 12, height: 12, borderRadius: 6, backgroundColor: THEME.colors.emerald, borderWidth: 2, borderColor: '#FFF' },
    
    messageList: { padding: 20, paddingBottom: 30 },
    dateHeader: { flexDirection: 'row', alignItems: 'center', marginVertical: 20, gap: 15 },
    dateLine: { flex: 1, height: 1, backgroundColor: '#E2E8F0' },
    dateText: { fontSize: 12, color: '#94A3B8', fontFamily: BRAND.typography.extraBold, backgroundColor: '#F1F5F9', paddingHorizontal: 10 },

    messageRow: { marginBottom: 16, flexDirection: 'row', alignItems: 'flex-end' },
    myRow: { justifyContent: 'flex-start' }, // Right side in RTL
    theirRow: { justifyContent: 'flex-end' }, // Left side in RTL
    
    miniAvatar: { 
        width: 32, 
        height: 32, 
        borderRadius: 16, 
        backgroundColor: BRAND.colors.primary + '15', 
        justifyContent: 'center', 
        alignItems: 'center', 
        marginHorizontal: 8 
    },

    miniAvatarText: { 
        fontSize: 14, 
        fontFamily: BRAND.typography.extraBold, 
        color: BRAND.colors.primary,
        textAlign: 'center',
        includeFontPadding: false,
        textAlignVertical: 'center'
    },


    bubble: { maxWidth: '75%', padding: 14, borderRadius: 24, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 5, elevation: 2 },
    myBubble: { borderTopLeftRadius: 4 },
    theirBubble: { backgroundColor: '#FFF', borderTopRightRadius: 4 },

    
    myText: { color: '#FFF', fontSize: 15, fontFamily: BRAND.typography.semiBold, lineHeight: 22, textAlign: 'auto' },
    theirText: { color: THEME.colors.slate[800], fontSize: 15, fontFamily: BRAND.typography.semiBold, lineHeight: 22, textAlign: 'auto' },
    
    timeRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'flex-end', gap: 4, marginTop: 4 },
    myTime: { color: 'rgba(255,255,255,0.7)', fontSize: 10, fontFamily: BRAND.typography.bold },
    theirTime: { color: THEME.colors.slate[400], fontSize: 10, fontFamily: BRAND.typography.bold, marginTop: 4, textAlign: 'left' },

    inputWrapper: { 
        paddingHorizontal: 20, 
        paddingVertical: 15,
        backgroundColor: '#FFF',
        borderTopWidth: 1,
        borderTopColor: '#F1F5F9'
    },
    inputPill: { 
        flexDirection: 'row', 
        backgroundColor: '#F8FAFC', 
        borderRadius: 30, 
        paddingHorizontal: 8, 
        paddingVertical: 8,
        alignItems: 'center',
        borderWidth: 1,
        borderColor: '#E2E8F0'
    },
    input: { 
        flex: 1, 
        paddingHorizontal: 12, 
        paddingVertical: 8, 
        fontSize: 16, 
        fontFamily: BRAND.typography.bold, 
        color: THEME.colors.slate[800],
        textAlign: 'auto'
    },
    attachBtn: { width: 40, height: 40, justifyContent: 'center', alignItems: 'center' },
    sendCircle: { 
        width: 44, 
        height: 44, 
        borderRadius: 22, 
        justifyContent: 'center', 
        alignItems: 'center',
        shadowColor: BRAND.colors.primary,
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.2,
        shadowRadius: 8,
        elevation: 4
    }
});
