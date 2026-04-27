import React, { useState } from 'react';
import { View, TouchableOpacity, StyleSheet, ActivityIndicator, KeyboardAvoidingView, Platform, ScrollView, Dimensions } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import client from '../api/client';
import { useNotifications } from '../context/NotificationContext';
import Logo from '../components/Logo';
import { BRAND } from '../theme/brand';
import Text from '../components/AppText';
import TextInput from '../components/AppTextInput';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

export default function SignupScreen({ route, navigation }) {
    const [username, setUsername] = useState('');
    const [firstName, setFirstName] = useState('');
    const [password, setPassword] = useState('');
    const [loading, setLoading] = useState(false);
    const { showNotification } = useNotifications();

    const { primaryColor: initialPrimaryColor } = route.params || {};
    const primaryColor = initialPrimaryColor || BRAND.colors.primary;

    const handleSignup = async () => {
        if (!username || !password) {
            showNotification({ title: 'خطأ', message: 'اسم المستخدم وكلمة المرور مطلوبان.', type: 'error' });
            return;
        }

        setLoading(true);
        try {
            const response = await client.post('/auth/signup/', {
                username,
                first_name: firstName,
                password,
            });

            if (response.data.success) {
                showNotification({ title: 'نجاح', message: 'تم إنشاء الحساب بنجاح! يمكنك تسجيل الدخول الآن.', type: 'success' });
                navigation.navigate('Login', { primaryColor });
            } else {
                showNotification({ title: 'خطأ', message: response.data.message || 'فشل إنشاء الحساب', type: 'error' });
            }
        } catch (error) {
            showNotification({ title: 'خطأ', message: error.response?.data?.message || 'حدث خطأ في الاتصال بالخادم', type: 'error' });
        } finally {
            setLoading(false);
        }
    };

    return (
        <KeyboardAvoidingView 
            style={styles.root}
            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
            keyboardVerticalOffset={Platform.OS === 'ios' ? 64 : 0}
        >
            <LinearGradient colors={['#F8FAFC', '#F1F5F9']} style={StyleSheet.absoluteFill} />
            
            <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
                <View style={styles.header}>
                    <Logo size={100} style={styles.logo} />
                    <Text style={styles.title}>إنشاء حساب جديد</Text>
                    <Text style={styles.subtitle}>انضم إلى منصة رواج ووسع نطاق أعمالك</Text>
                </View>

                <View style={styles.formCard}>
                    <View style={styles.field}>
                        <Text style={styles.label}>رقم الهاتف (اسم المستخدم)</Text>
                        <View style={styles.inputBox}>
                            <Feather name="phone" size={18} color="#94A3B8" />
                            <TextInput
                                style={styles.input}
                                value={username}
                                onChangeText={setUsername}
                                autoCapitalize="none"
                                keyboardType="phone-pad"
                                placeholder="77XXXXXXX"
                                placeholderTextColor="#CBD5E1"
                                textAlign="right"
                            />
                        </View>
                    </View>

                    <View style={styles.field}>
                        <Text style={styles.label}>الاسم الكامل (اختياري)</Text>
                        <View style={styles.inputBox}>
                            <Feather name="user" size={18} color="#94A3B8" />
                            <TextInput
                                style={styles.input}
                                value={firstName}
                                onChangeText={setFirstName}
                                placeholder="أدخل اسمك الكامل"
                                placeholderTextColor="#CBD5E1"
                                textAlign="right"
                            />
                        </View>
                    </View>

                    <View style={styles.field}>
                        <Text style={styles.label}>كلمة المرور</Text>
                        <View style={styles.inputBox}>
                            <Feather name="lock" size={18} color="#94A3B8" />
                            <TextInput
                                style={styles.input}
                                value={password}
                                onChangeText={setPassword}
                                secureTextEntry
                                placeholder="أدخل كلمة المرور"
                                placeholderTextColor="#CBD5E1"
                                textAlign="right"
                            />
                        </View>
                    </View>

                    <TouchableOpacity
                        style={[styles.mainBtn, { shadowColor: primaryColor }, loading && { opacity: 0.7 }]}
                        onPress={handleSignup}
                        disabled={loading}
                    >
                        <LinearGradient 
                            colors={[primaryColor, BRAND.colors.slate[900]]}
                            start={{x:0, y:0}} end={{x:1, y:1}}
                            style={styles.btnGradient}
                        >
                            {loading ? (
                                <ActivityIndicator color="#fff" />
                            ) : (
                                <Text style={styles.btnText}>إنشاء الحساب</Text>
                            )}
                        </LinearGradient>
                    </TouchableOpacity>
                </View>

                <TouchableOpacity
                    style={styles.linkBtn}
                    onPress={() => navigation.goBack()}
                >
                    <Text style={styles.linkLabel}>لديك حساب بالفعل؟ </Text>
                    <Text style={[styles.linkText, { color: primaryColor }]}>تسجيل الدخول</Text>
                </TouchableOpacity>
            </ScrollView>
        </KeyboardAvoidingView>
    );
}

const styles = StyleSheet.create({
    root: { flex: 1, backgroundColor: '#F8FAFC' },
    scrollContent: { flexGrow: 1, padding: 24, paddingTop: 60, paddingBottom: 40 },
    header: { alignItems: 'center', marginBottom: 30 },
    logo: { marginBottom: 20 },
    title: { fontSize: 26, color: BRAND.colors.slate[900], textAlign: 'center', marginBottom: 8, fontFamily: BRAND.typography.extraBold },
    subtitle: { fontSize: 14, color: BRAND.colors.slate[500], textAlign: 'center', fontFamily: BRAND.typography.bold },
    
    formCard: {
        backgroundColor: '#fff',
        borderRadius: 32,
        padding: 24,
        elevation: 12,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 10 },
        shadowOpacity: 0.08,
        shadowRadius: 20,
        marginBottom: 25,
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.8)',
    },
    field: { marginBottom: 20 },
    label: { fontSize: 13, color: BRAND.colors.slate[700], marginBottom: 10, textAlign: 'right', fontFamily: BRAND.typography.bold },
    inputBox: {
        flexDirection: 'row', alignItems: 'center',
        backgroundColor: '#F8FAFC', borderWidth: 1.5, borderColor: '#E2E8F0',
        borderRadius: 18, paddingHorizontal: 16, height: 56,
    },
    input: { flex: 1, fontSize: 15, color: BRAND.colors.slate[900], marginHorizontal: 12, fontFamily: BRAND.typography.regular },
    
    mainBtn: {
        height: 58,
        borderRadius: 18,
        overflow: 'hidden',
        elevation: 8,
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.3,
        shadowRadius: 12,
        marginTop: 10,
    },
    btnGradient: { flex: 1, justifyContent: 'center', alignItems: 'center' },
    btnText: { color: '#fff', fontSize: 17, fontFamily: BRAND.typography.extraBold },
    
    linkBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', marginTop: 10 },
    linkLabel: { fontSize: 15, color: BRAND.colors.slate[600], fontFamily: BRAND.typography.bold },
    linkText: { fontSize: 15, fontFamily: BRAND.typography.extraBold },
});
