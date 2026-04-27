import React, { useState, useContext, useEffect } from 'react';
import { View, TouchableOpacity, StyleSheet, ActivityIndicator, KeyboardAvoidingView, Platform, Alert, Dimensions, ScrollView } from 'react-native';
import { Feather, Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { AuthContext } from '../context/AuthContext';
import { useNotifications } from '../context/NotificationContext';
import Logo from '../components/Logo';
import { BRAND } from '../theme/brand';
import Text from '../components/AppText';
import TextInput from '../components/AppTextInput';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

export default function LoginScreen({ route, navigation }) {
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

  const { primaryColor: initialPrimaryColor } = route.params || {};
  const primaryColor = initialPrimaryColor || BRAND.colors.primary;

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
    }
  };

  const handlePostLogin = (result) => {
    if (result.scope === 'driver') {
      navigation.reset({ index: 0, routes: [{ name: 'DriverDashboard' }] });
    } else if (result.scope === 'merchant') {
      navigation.reset({ index: 0, routes: [{ name: 'MerchantTabs' }] });
    } else {
      // Visitor or other
      navigation.reset({ index: 0, routes: [{ name: 'Home' }] });
    }
  };

  const handleLogin = async () => {
    if (!username.trim() || !password) {
      showNotification({ title: 'تنبيه', message: 'يرجى إدخال اسم المستخدم وكلمة المرور.', type: 'warning' });
      return;
    }
    setLoading(true);
    const result = await login(username.trim(), password.trim());
    setLoading(false);

    if (!result.success) {
      showNotification({ title: 'فشل تسجيل الدخول', message: result.message, type: 'error' });
      return;
    }

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
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 64 : 0}
    >
      <LinearGradient colors={['#F8FAFC', '#F1F5F9']} style={StyleSheet.absoluteFill} />
      
      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        <View style={styles.header}>
          <Logo size={120} style={styles.logo} />
          <Text style={styles.title}>لوحة تحكم رواج</Text>
          <Text style={styles.subtitle}>تسجيل الدخول لإدارة متجرك الذكي</Text>
        </View>

        <View style={styles.formCard}>
          {/* Username */}
          <View style={styles.field}>
            <Text style={styles.label}>اسم المستخدم</Text>
            <View style={styles.inputBox}>
              <Feather name="user" size={18} color="#94A3B8" />
              <TextInput
                style={styles.input}
                value={username}
                onChangeText={setUsername}
                autoCapitalize="none"
                placeholder="رقم الهاتف أو البريد"
                placeholderTextColor="#CBD5E1"
                textAlign="right"
              />
            </View>
          </View>

          {/* Password */}
          <View style={styles.field}>
            <Text style={styles.label}>كلمة المرور</Text>
            <View style={styles.inputBox}>
              <TouchableOpacity onPress={() => setShowPassword(p => !p)}>
                <Feather name={showPassword ? 'eye-off' : 'eye'} size={18} color="#94A3B8" />
              </TouchableOpacity>
              <TextInput
                style={styles.input}
                value={password}
                onChangeText={setPassword}
                secureTextEntry={!showPassword}
                placeholder="أدخل كلمة المرور"
                placeholderTextColor="#CBD5E1"
                textAlign="right"
                autoCapitalize="none"
                autoCorrect={false}
              />
            </View>
          </View>

          <View style={styles.actionRow}>
            <TouchableOpacity
              style={[styles.mainBtn, { shadowColor: primaryColor }, loading && { opacity: 0.7 }]}
              onPress={handleLogin}
              disabled={loading}
            >
              <LinearGradient 
                colors={[primaryColor, BRAND.colors.slate[900]]}
                start={{x:0, y:0}} end={{x:1, y:1}}
                style={styles.btnGradient}
              >
                {loading
                  ? <ActivityIndicator color="#fff" />
                  : <Text style={styles.btnText}>تسجيل الدخول</Text>
                }
              </LinearGradient>
            </TouchableOpacity>

            {biometricsAvailable && biometricsEnabled && (
              <TouchableOpacity
                style={[styles.biometricBtn, { borderColor: primaryColor + '40' }]}
                onPress={handleBiometricLogin}
                activeOpacity={0.7}
              >
                <Ionicons name="finger-print" size={28} color={primaryColor} />
              </TouchableOpacity>
            )}
          </View>
        </View>

        <View style={styles.footerLinks}>
          <TouchableOpacity
            style={styles.secondaryLink}
            onPress={() => navigation.navigate('MerchantRegistration')}
          >
            <Text style={styles.secondaryLinkLabel}>ليس لديك متجر؟ </Text>
            <Text style={[styles.secondaryLinkText, { color: primaryColor }]}>انضم إلينا الآن</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.backToStore}
            onPress={() => navigation.navigate('Home')}
          >
            <Text style={[styles.backText, { color: BRAND.colors.slate[400] }]}>العودة للمتجر</Text>
            <Feather name="arrow-left" size={14} color={BRAND.colors.slate[400]} />
          </TouchableOpacity>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#F8FAFC' },
  scrollContent: {
    flexGrow: 1,
    padding: 24,
    paddingTop: 60,
    paddingBottom: 40
  },
  header: { alignItems: 'center', marginBottom: 35 },
  logo: { marginBottom: 20 },
  title: { fontSize: 28, color: BRAND.colors.slate[900], textAlign: 'center', marginBottom: 6, fontFamily: BRAND.typography.extraBold },
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
    marginBottom: 30,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.8)',
  },
  field: { marginBottom: 22 },
  label: { fontSize: 13, color: BRAND.colors.slate[700], marginBottom: 10, textAlign: 'right', fontFamily: BRAND.typography.bold },
  inputBox: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: '#F8FAFC', borderWidth: 1.5, borderColor: '#E2E8F0',
    borderRadius: 18, paddingHorizontal: 16, height: 56,
  },
  input: { flex: 1, fontSize: 15, color: BRAND.colors.slate[900], marginHorizontal: 12, fontFamily: BRAND.typography.regular },
  
  actionRow: { flexDirection: 'row', alignItems: 'center', gap: 15, marginTop: 10 },
  mainBtn: {
    flex: 1,
    height: 58,
    borderRadius: 18,
    overflow: 'hidden',
    elevation: 8,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
  },
  btnGradient: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  btnText: { color: '#fff', fontSize: 17, fontFamily: BRAND.typography.extraBold },
  
  biometricBtn: {
    width: 58, height: 58, borderRadius: 18,
    backgroundColor: '#fff', borderWidth: 1.5,
    justifyContent: 'center', alignItems: 'center',
    elevation: 4, shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 5,
  },
  
  footerLinks: { alignItems: 'center', gap: 20 },
  secondaryLink: { flexDirection: 'row', alignItems: 'center' },
  secondaryLinkLabel: { fontSize: 15, color: BRAND.colors.slate[600], fontFamily: BRAND.typography.bold },
  secondaryLinkText: { fontSize: 15, fontFamily: BRAND.typography.extraBold },
  backToStore: { flexDirection: 'row', alignItems: 'center', gap: 8, opacity: 0.8 },
  backText: { fontSize: 14, fontFamily: BRAND.typography.bold },
});
