import React, { useState, useContext, useEffect } from 'react';
import {
  View, Text, TextInput, TouchableOpacity,
  StyleSheet, ActivityIndicator, KeyboardAvoidingView, Platform, Alert,
} from 'react-native';
import { Feather, Ionicons } from '@expo/vector-icons';
import { AuthContext } from '../context/AuthContext';
import { useNotifications } from '../context/NotificationContext';
import Logo from '../components/Logo';

export default function LoginScreen({ navigation }) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const { 
    login, 
    biometricsAvailable, 
    biometricsEnabled, 
    enableBiometrics, 
    loginWithBiometrics,
  } = useContext(AuthContext);
  const { showNotification } = useNotifications();

  // Auto-trigger biometric login if enabled
  useEffect(() => {
    if (biometricsAvailable && biometricsEnabled) {
      handleBiometricLogin();
    }
  }, [biometricsAvailable, biometricsEnabled]);

  const handleBiometricLogin = async () => {
    const result = await loginWithBiometrics();
    if (result && result.success) {
      handlePostLogin(result);
    } else if (result && result.message !== 'Cancel') {
       // Only show error if didn't cancel manually
       // showNotification({ title: 'خطأ', message: result.message, type: 'error' });
    }
  };

  const handlePostLogin = (result) => {
    // Redirect based on scope
    if (result.scope === 'driver') {
      navigation.reset({ index: 0, routes: [{ name: 'DriverDashboard' }] });
    } else {
      navigation.reset({ index: 0, routes: [{ name: 'MerchantTabs' }] });
    }
  };

  const handleLogin = async () => {
    if (!username.trim() || !password) {
      showNotification({ title: 'تنبيه', message: 'يرجى إدخال اسم المستخدم وكلمة المرور.', type: 'warning' });
      return;
    }
    setLoading(true);
    const result = await login(username.trim(), password);
    setLoading(false);

    if (!result.success) {
      showNotification({ title: 'فشل تسجيل الدخول', message: result.message, type: 'error' });
      return;
    }

    // After successful manual login, prompt to enable biometrics if supported
    if (biometricsAvailable && !biometricsEnabled) {
      Alert.alert(
        'تفعيل البصمة',
        'هل تريد تفعيل الدخول السريع باستخدام البصمة مستقبلاً؟',
        [
          { text: 'ليس الآن', style: 'cancel', onPress: () => handlePostLogin(result) },
          { 
            text: 'تفعيل', 
            onPress: async () => {
              await enableBiometrics(username.trim(), password);
              showNotification({ title: 'نجاح', message: 'تم تفعيل الدخول بالبصمة', type: 'success' });
              handlePostLogin(result);
            } 
          },
        ]
      );
    } else {
      handlePostLogin(result);
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.root}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <View style={styles.container}>
        {/* Logo */}
        <Logo size={160} style={styles.logo} />
        
        <Text style={styles.title}>لوحة تحكم رواج</Text>
        <Text style={styles.subtitle}>تسجيل الدخول بحساب التاجر</Text>

        {/* Username */}
        <View style={styles.field}>
          <Text style={styles.label}>اسم المستخدم</Text>
          <View style={styles.inputWrap}>
            <Feather name="user" size={16} color="#94A3B8" style={styles.inputIcon} />
            <TextInput
              style={styles.input}
              value={username}
              onChangeText={setUsername}
              autoCapitalize="none"
              placeholder="أدخل اسم المستخدم"
              placeholderTextColor="#CBD5E1"
              textAlign="right"
            />
          </View>
        </View>

        {/* Password */}
        <View style={styles.field}>
          <Text style={styles.label}>كلمة المرور</Text>
          <View style={styles.inputWrap}>
            <TouchableOpacity
              onPress={() => setShowPassword(p => !p)}
              style={styles.inputIcon}
            >
              <Feather name={showPassword ? 'eye-off' : 'eye'} size={16} color="#94A3B8" />
            </TouchableOpacity>
            <TextInput
              style={styles.input}
              value={password}
              onChangeText={setPassword}
              secureTextEntry={!showPassword}
              placeholder="أدخل كلمة المرور"
              placeholderTextColor="#CBD5E1"
              textAlign="right"
            />
          </View>
        </View>

        {/* Submit & Biometric */}
        <View style={styles.actionRow}>
          <TouchableOpacity
            style={[styles.btn, loading && { opacity: 0.7 }, { flex: 1, marginBottom: 0 }]}
            onPress={handleLogin}
            disabled={loading}
          >
            {loading
              ? <ActivityIndicator color="#fff" />
              : <Text style={styles.btnText}>تسجيل الدخول</Text>
            }
          </TouchableOpacity>

          {biometricsAvailable && biometricsEnabled && (
            <TouchableOpacity
              style={styles.biometricBtn}
              onPress={handleBiometricLogin}
              activeOpacity={0.7}
            >
              <Ionicons name="finger-print" size={28} color="#2B5876" />
            </TouchableOpacity>
          )}
        </View>

        {/* Back to Store */}
        <TouchableOpacity
          style={styles.linkBtn}
          onPress={() => navigation.navigate('Home')}
        >
          <Feather name="arrow-right" size={14} color="#2B5876" />
          <Text style={styles.linkText}>العودة للمتجر</Text>
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#F8FAFC' },
  container: { flex: 1, padding: 28, justifyContent: 'center' },
  logo: {
    alignSelf: 'center',
    marginBottom: 30,
  },
  title: { fontSize: 26, fontWeight: '800', color: '#0F172A', textAlign: 'center', marginBottom: 6 },
  subtitle: { fontSize: 14, color: '#64748B', textAlign: 'center', marginBottom: 36 },
  field: { marginBottom: 18 },
  label: { fontSize: 13, fontWeight: '600', color: '#475569', marginBottom: 8, textAlign: 'right' },
  inputWrap: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: '#fff', borderWidth: 1.5, borderColor: '#E2E8F0',
    borderRadius: 12, paddingHorizontal: 12, height: 50,
  },
  inputIcon: { marginRight: 8 },
  input: { flex: 1, fontSize: 15, color: '#0F172A' },
  btn: {
    backgroundColor: '#2B5876', paddingVertical: 15,
    borderRadius: 14, alignItems: 'center',
    marginTop: 8, marginBottom: 20,
    shadowColor: '#2B5876', shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3, shadowRadius: 8, elevation: 6,
  },
  btnText: { color: '#fff', fontSize: 16, fontWeight: '700' },
  actionRow: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 20, marginTop: 8 },
  biometricBtn: {
    width: 52, height: 52, borderRadius: 14,
    backgroundColor: '#fff', borderWidth: 1.5, borderColor: '#2B5876',
    justifyContent: 'center', alignItems: 'center',
    shadowColor: '#2B5876', shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1, shadowRadius: 4, elevation: 2,
  },
  linkBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6 },
  linkText: { color: '#2B5876', fontSize: 14, fontWeight: '600' },
});
