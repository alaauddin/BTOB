import React, { useState } from 'react';
import { 
    View, Text, TextInput, TouchableOpacity, 
    StyleSheet, ActivityIndicator, KeyboardAvoidingView, Platform, ScrollView 
} from 'react-native';
import { Feather } from '@expo/vector-icons';
import client from '../api/client';
import { useNotifications } from '../context/NotificationContext';
import Logo from '../components/Logo';

export default function SignupScreen({ route, navigation }) {
    const [username, setUsername] = useState('');
    const [firstName, setFirstName] = useState('');
    const [password, setPassword] = useState('');
    const [loading, setLoading] = useState(false);
    const { showNotification } = useNotifications();

    const { primaryColor: initialPrimaryColor } = route.params || {};
    const primaryColor = initialPrimaryColor || '#2B5876';

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
            behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        >
            <ScrollView contentContainerStyle={styles.container} showsVerticalScrollIndicator={false}>
                <Logo size={140} style={styles.logo} />
                
                <Text style={styles.title}>إنشاء حساب جديد</Text>
                <Text style={styles.subtitle}>انضم إلى منصة رواج ووسع نطاق أعمالك</Text>

                <View style={styles.field}>
                    <Text style={styles.label}>رقم الهاتف (اسم المستخدم)</Text>
                    <View style={styles.inputWrap}>
                        <Feather name="phone" size={16} color="#94A3B8" style={styles.inputIcon} />
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
                    <View style={styles.inputWrap}>
                        <Feather name="user" size={16} color="#94A3B8" style={styles.inputIcon} />
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
                    <View style={styles.inputWrap}>
                        <Feather name="lock" size={16} color="#94A3B8" style={styles.inputIcon} />
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
                    style={[styles.btn, { backgroundColor: primaryColor, shadowColor: primaryColor }, loading && { opacity: 0.7 }]}
                    onPress={handleSignup}
                    disabled={loading}
                >
                    {loading ? (
                        <ActivityIndicator color="#fff" />
                    ) : (
                        <Text style={styles.btnText}>إنشاء الحساب</Text>
                    )}
                </TouchableOpacity>

                <TouchableOpacity
                    style={styles.linkBtn}
                    onPress={() => navigation.goBack()}
                >
                    <Text style={[styles.linkText, { color: primaryColor }]}>لديك حساب بالفعل؟ تسجيل الدخول</Text>
                </TouchableOpacity>
            </ScrollView>
        </KeyboardAvoidingView>
    );
}

const styles = StyleSheet.create({
    root: { flex: 1, backgroundColor: '#F8FAFC' },
    container: { padding: 28, paddingTop: 60 },
    logo: {
        alignSelf: 'center',
        marginBottom: 24,
    },
    title: { 
        fontSize: 26, 
        fontWeight: '800', 
        color: '#0F172A', 
        textAlign: 'center', 
        marginBottom: 8 
    },
    subtitle: { 
        fontSize: 14, 
        color: '#64748B', 
        textAlign: 'center', 
        marginBottom: 36 
    },
    field: { marginBottom: 20 },
    label: { 
        fontSize: 13, 
        fontWeight: '600', 
        color: '#475569', 
        marginBottom: 8, 
        textAlign: 'right' 
    },
    inputWrap: {
        flexDirection: 'row', 
        alignItems: 'center',
        backgroundColor: '#fff', 
        borderWidth: 1.5, 
        borderColor: '#E2E8F0',
        borderRadius: 12, 
        paddingHorizontal: 12, 
        height: 52,
    },
    inputIcon: { marginRight: 8 },
    input: { 
        flex: 1, 
        fontSize: 15, 
        color: '#0F172A' 
    },
    btn: {
        paddingVertical: 16,
        borderRadius: 14, 
        alignItems: 'center',
        marginTop: 12, 
        marginBottom: 24,
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3, 
        shadowRadius: 8, 
        elevation: 6,
    },
    btnText: { 
        color: '#fff', 
        fontSize: 16, 
        fontWeight: '700' 
    },
    linkBtn: { 
        alignItems: 'center' 
    },
    linkText: { 
        fontSize: 14, 
        fontWeight: '600' 
    },
});
