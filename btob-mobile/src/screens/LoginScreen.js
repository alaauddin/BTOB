import React, { useState, useContext } from 'react';
import {
  View, Text, TextInput, TouchableOpacity,
  StyleSheet, ActivityIndicator, Alert, KeyboardAvoidingView, Platform,
} from 'react-native';
import { Feather } from '@expo/vector-icons';
import { AuthContext } from '../context/AuthContext';

export default function LoginScreen({ navigation }) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const { login } = useContext(AuthContext);

  const handleLogin = async () => {
    if (!username.trim() || !password) {
      Alert.alert('تنبيه', 'يرجى إدخال اسم المستخدم وكلمة المرور.');
      return;
    }
    setLoading(true);
    const result = await login(username.trim(), password);
    setLoading(false);

    if (!result.success) {
      Alert.alert('فشل تسجيل الدخول', result.message);
      return;
    }

    // Merchant login → go straight to the tab navigator, replacing the stack
    navigation.reset({ index: 0, routes: [{ name: 'MerchantTabs' }] });
  };

  return (
    <KeyboardAvoidingView
      style={styles.root}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <View style={styles.container}>
        {/* Icon */}
        <View style={styles.iconWrap}>
          <Feather name="briefcase" size={40} color="#2B5876" />
        </View>
        <Text style={styles.title}>لوحة تحكم التاجر</Text>
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

        {/* Submit */}
        <TouchableOpacity
          style={[styles.btn, loading && { opacity: 0.7 }]}
          onPress={handleLogin}
          disabled={loading}
        >
          {loading
            ? <ActivityIndicator color="#fff" />
            : <Text style={styles.btnText}>تسجيل الدخول</Text>
          }
        </TouchableOpacity>

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
  iconWrap: {
    width: 80, height: 80, borderRadius: 40,
    backgroundColor: '#EBF5FF', justifyContent: 'center', alignItems: 'center',
    alignSelf: 'center', marginBottom: 20,
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
  linkBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6 },
  linkText: { color: '#2B5876', fontSize: 14, fontWeight: '600' },
});
