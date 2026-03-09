import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  TouchableWithoutFeedback,
  Keyboard,
  TextInput,
  ActivityIndicator,
  Image,
  ScrollView,
} from "react-native";
import { Ionicons, Feather } from "@expo/vector-icons";
import { useAuth } from "../context/AuthContext";

export default function AuthModal({ visible, onClose, onSuccess }) {
  const { unifiedLoginPhone, login } = useAuth();
  const [activeTab, setActiveTab] = useState("customer"); // 'customer' or 'merchant'

  // Customer Form State
  const [phone, setPhone] = useState("");
  const [phoneError, setPhoneError] = useState("");
  const [acceptedTerms, setAcceptedTerms] = useState(false);

  // Merchant Form State
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);

  // Global State
  const [loading, setLoading] = useState(false);
  const [globalError, setGlobalError] = useState("");

  // Validate Yemeni Phone roughly on Frontend
  const validatePhone = (input) => {
    const raw = input.replace(/[\s\-\(\)]/g, "");
    let normalized = raw;
    if (normalized.startsWith("+967")) normalized = normalized.substring(4);
    if (normalized.startsWith("00967")) normalized = normalized.substring(5);

    if (normalized.length !== 9 || !normalized.startsWith("7")) {
      return false;
    }
    return true;
  };

  const handleCustomerSubmit = async () => {
    setGlobalError("");
    setPhoneError("");

    if (!phone.trim()) {
      setPhoneError("حقل رقم الهاتف مطلوب");
      return;
    }
    if (!validatePhone(phone)) {
      setPhoneError("رقم هاتف غير صالح. يجب أن يتكون من 9 أرقام ويبدأ بـ 7");
      return;
    }
    if (!acceptedTerms) {
      setGlobalError("يجب الموافقة على سياسة الخصوصية للمتابعة");
      return;
    }

    setLoading(true);
    try {
      // Pass raw phone, backend will normalize
      const result = await unifiedLoginPhone(phone);
      if (result.success) {
        onClose();
        if (onSuccess) onSuccess(result.user);
      } else {
        setGlobalError(result.message || "حدث خطأ غير متوقع");
      }
    } catch (err) {
      setGlobalError("فشل الاتصال بالخادم. حاول مرة أخرى.");
    } finally {
      setLoading(false);
    }
  };

  const handleMerchantSubmit = async () => {
    setGlobalError("");
    if (!username.trim() || !password.trim()) {
      setGlobalError("يرجى إدخال اسم المستخدم وكلمة المرور");
      return;
    }

    setLoading(true);
    try {
      const result = await login(username, password);
      // login auth context function will receive the 403 error message if restricted
      if (result.success) {
        onClose();
        if (onSuccess) onSuccess(result.user);
      } else {
        setGlobalError(
          result.message || "بيانات الدخول غير صحيحة أو لا تملك صلاحية التاجر",
        );
      }
    } catch (err) {
      setGlobalError("فشل الاتصال بالخادم. حاول مرة أخرى.");
    } finally {
      setLoading(false);
    }
  };

  if (!visible) return null;

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
    >
      <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
        <View style={styles.overlay}>
          <KeyboardAvoidingView
            behavior={Platform.OS === "ios" ? "padding" : "height"}
            style={styles.keyboardView}
          >
            <View style={styles.modalContent}>
              {/* Logo Header Header */}
              <View style={styles.logoContainer}>
                <Image
                  source={require("../../assets/images/logo.png")}
                  style={styles.logoImage}
                />
              </View>

              {/* Close Button */}
              <TouchableOpacity style={styles.closeButton} onPress={onClose}>
                <Ionicons name="close" size={24} color="#64748b" />
              </TouchableOpacity>

              {/* Custom Tabs */}
              <View style={styles.tabsContainer}>
                {/* Customer Tab */}
                <TouchableOpacity
                  style={[
                    styles.tabButton,
                    activeTab === "customer" && styles.activeTabButton,
                  ]}
                  onPress={() => {
                    setActiveTab("customer");
                    setGlobalError("");
                  }}
                >
                  <View
                    style={[
                      styles.tabIconBg,
                      activeTab === "customer" && styles.activeTabIconBg,
                    ]}
                  >
                    <Ionicons
                      name="person"
                      size={20}
                      color={activeTab === "customer" ? "#fff" : "#94a3b8"}
                    />
                  </View>
                  <Text
                    style={[
                      styles.tabText,
                      activeTab === "customer" && styles.activeTabText,
                    ]}
                  >
                    العملاء
                  </Text>
                </TouchableOpacity>

                {/* Merchant Tab */}
                <TouchableOpacity
                  style={[
                    styles.tabButton,
                    activeTab === "merchant" && styles.activeTabButton,
                  ]}
                  onPress={() => {
                    setActiveTab("merchant");
                    setGlobalError("");
                  }}
                >
                  <View
                    style={[
                      styles.tabIconBg,
                      activeTab === "merchant" && styles.activeTabIconBg,
                    ]}
                  >
                    <Ionicons
                      name="storefront"
                      size={20}
                      color={activeTab === "merchant" ? "#fff" : "#94a3b8"}
                    />
                  </View>
                  <Text
                    style={[
                      styles.tabText,
                      activeTab === "merchant" && styles.activeTabText,
                    ]}
                  >
                    التجار
                  </Text>
                </TouchableOpacity>
              </View>

              <ScrollView
                showsVerticalScrollIndicator={false}
                keyboardShouldPersistTaps="handled"
                contentContainerStyle={styles.scrollContent}
              >
                <Text style={styles.welcomeTitle}>
                  مرحباً بعودتك.. قم بتسجيل الدخول
                </Text>

                {globalError ? (
                  <Text style={styles.errorTextCenter}>{globalError}</Text>
                ) : null}

                {/* --- CUSTOMER LOGIC --- */}
                {activeTab === "customer" && (
                  <View style={styles.formContainer}>
                    {/* Google Login Mock */}
                    <TouchableOpacity style={styles.googleButton}>
                      <Ionicons name="logo-google" size={20} color="#EA4335" />
                      <Text style={styles.googleButtonText}>
                        المتابعة باستخدام Google
                      </Text>
                    </TouchableOpacity>

                    <View style={styles.dividerRow}>
                      <View style={styles.dividerLine} />
                      <Text style={styles.dividerText}>أو برقم الهاتف</Text>
                      <View style={styles.dividerLine} />
                    </View>

                    <View style={styles.inputWrapper}>
                      <Text style={styles.inputLabelAbsolute}>رقم الموبايل</Text>
                      <View
                        style={[
                          styles.phoneInputContainer,
                          phoneError && styles.inputErrorBorder,
                        ]}
                      >
                        <TextInput
                          style={styles.phoneInput}
                          placeholder="77X XXX XXX"
                          keyboardType="phone-pad"
                          value={phone}
                          onChangeText={(t) => {
                            setPhone(t);
                            setPhoneError("");
                          }}
                          textAlign="right"
                        />
                        <View style={styles.phonePrefixBox}>
                          <Text style={styles.phonePrefixText}>+967</Text>
                        </View>
                      </View>
                      {phoneError ? (
                        <Text style={styles.errorText}>{phoneError}</Text>
                      ) : null}
                    </View>

                    <TouchableOpacity
                      style={styles.checkboxRow}
                      onPress={() => setAcceptedTerms(!acceptedTerms)}
                      activeOpacity={0.7}
                    >
                      <Ionicons
                        name={acceptedTerms ? "checkbox" : "square-outline"}
                        size={22}
                        color={acceptedTerms ? "#D97706" : "#94a3b8"}
                      />
                      <Text style={styles.checkboxText}>
                        أوافق على سياسة الخصوصية
                      </Text>
                    </TouchableOpacity>

                    <View style={styles.actionButtonsRow}>
                      <TouchableOpacity
                        style={styles.cancelBtn}
                        onPress={onClose}
                      >
                        <Text style={styles.cancelBtnText}>إلغاء</Text>
                      </TouchableOpacity>
                      <TouchableOpacity
                        style={styles.submitBtn}
                        onPress={handleCustomerSubmit}
                        disabled={loading}
                      >
                        {loading ? (
                          <ActivityIndicator color="#fff" />
                        ) : (
                          <Text style={styles.submitBtnText}>متابعة</Text>
                        )}
                      </TouchableOpacity>
                    </View>
                  </View>
                )}

                {/* --- MERCHANT LOGIC --- */}
                {activeTab === "merchant" && (
                  <View style={styles.formContainer}>
                    <View style={[styles.inputWrapper, { marginTop: 10 }]}>
                      <Text style={styles.inputLabelAbsolute}>اسم المستخدم</Text>
                      <TextInput
                        style={styles.standardInput}
                        placeholder="أدخل اسم المستخدم"
                        value={username}
                        onChangeText={setUsername}
                        textAlign="right"
                        autoCapitalize="none"
                      />
                    </View>

                    <View style={[styles.inputWrapper, { marginTop: 15 }]}>
                      <Text style={styles.inputLabelAbsolute}>كلمة المرور</Text>
                      <View style={styles.passwordContainer}>
                        <TouchableOpacity
                          onPress={() => setShowPassword(!showPassword)}
                          style={styles.eyeIcon}
                        >
                          <Feather
                            name={showPassword ? "eye" : "eye-off"}
                            size={20}
                            color="#94a3b8"
                          />
                        </TouchableOpacity>
                        <TextInput
                          style={styles.passwordInput}
                          placeholder="••••••••"
                          secureTextEntry={!showPassword}
                          value={password}
                          onChangeText={setPassword}
                          textAlign="right"
                        />
                      </View>
                    </View>

                    <TouchableOpacity style={styles.forgotPasswordLayout}>
                      <Text style={styles.forgotPasswordText}>
                        نسيت كلمة المرور؟
                      </Text>
                    </TouchableOpacity>

                    <View style={styles.joinNowLayout}>
                      <Text style={styles.joinNowText}>
                        ليس لديك حساب تجاري؟{" "}
                      </Text>
                      <TouchableOpacity>
                        <Text style={styles.joinNowLink}>انضم إلينا الآن</Text>
                      </TouchableOpacity>
                    </View>

                    <View style={styles.actionButtonsRow}>
                      <TouchableOpacity
                        style={styles.cancelBtn}
                        onPress={onClose}
                      >
                        <Text style={styles.cancelBtnText}>إلغاء</Text>
                      </TouchableOpacity>
                      <TouchableOpacity
                        style={styles.submitBtn}
                        onPress={handleMerchantSubmit}
                        disabled={loading}
                      >
                        {loading ? (
                          <ActivityIndicator color="#fff" />
                        ) : (
                          <Text style={styles.submitBtnText}>متابعة</Text>
                        )}
                      </TouchableOpacity>
                    </View>
                  </View>
                )}
              </ScrollView>
            </View>
          </KeyboardAvoidingView>
        </View>
      </TouchableWithoutFeedback>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "center",
    paddingHorizontal: 20,
  },
  keyboardView: {
    width: "100%",
  },
  modalContent: {
    backgroundColor: "#FAF9F6", // Off-white/slate-50 premium feel
    borderRadius: 32,
    padding: 24,
    paddingTop: 40,
    width: "100%",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.25,
    shadowRadius: 20,
    elevation: 20,
    position: "relative",
    maxHeight: 650, // Added to prevent modal from stretching too much on large screens
  },
  scrollContent: {
    paddingBottom: 10,
  },
  logoContainer: {
    position: "absolute",
    top: -30,
    alignSelf: "center",
    width: 64,
    height: 64,
    backgroundColor: "#fff",
    borderRadius: 20,
    justifyContent: "center",
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 6,
    elevation: 5,
  },
  logoImage: {
    width: 40,
    height: 40,
    resizeMode: "contain",
  },
  closeButton: {
    position: "absolute",
    top: 20,
    right: 20,
    zIndex: 10,
  },
  tabsContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 24,
    marginTop: 10,
  },
  tabButton: {
    flex: 1,
    backgroundColor: "#fff",
    borderRadius: 16,
    paddingVertical: 18,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1.5,
    borderColor: "#e2e8f0",
    marginHorizontal: 8,
  },
  activeTabButton: {
    borderColor: "#D97706", // Premium Orange/Amber outline
  },
  tabIconBg: {
    width: 42,
    height: 42,
    borderRadius: 12,
    backgroundColor: "#f1f5f9",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 8,
  },
  activeTabIconBg: {
    backgroundColor: "#D97706",
  },
  tabText: {
    fontSize: 16,
    fontWeight: "bold",
    color: "#64748b",
  },
  activeTabText: {
    color: "#D97706",
  },
  welcomeTitle: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#0f172a",
    textAlign: "center",
    marginBottom: 20,
  },
  formContainer: {
    width: "100%",
  },
  googleButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#fff",
    borderWidth: 1,
    borderColor: "#e2e8f0",
    borderRadius: 14,
    paddingVertical: 14,
    marginBottom: 24,
  },
  googleButtonText: {
    fontSize: 14,
    fontWeight: "600",
    color: "#334155",
    marginLeft: 10,
  },
  dividerRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 24,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: "#e2e8f0",
  },
  dividerText: {
    paddingHorizontal: 12,
    color: "#64748b",
    fontSize: 14,
    fontWeight: "500",
  },
  inputWrapper: {
    position: "relative",
    marginBottom: 16,
  },
  inputLabelAbsolute: {
    position: "absolute",
    top: -10,
    right: 16,
    backgroundColor: "#FAF9F6",
    paddingHorizontal: 6,
    zIndex: 2,
    fontSize: 12,
    color: "#94a3b8",
    fontWeight: "600",
  },
  phoneInputContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#fff",
    borderWidth: 1,
    borderColor: "#cbd5e1",
    borderRadius: 14,
    height: 56,
  },
  phoneInput: {
    flex: 1,
    paddingHorizontal: 16,
    fontSize: 16,
    color: "#0f172a",
    height: "100%",
  },
  phonePrefixBox: {
    paddingHorizontal: 16,
    borderLeftWidth: 1,
    borderLeftColor: "#e2e8f0",
    justifyContent: "center",
    height: "100%",
  },
  phonePrefixText: {
    fontSize: 16,
    fontWeight: "bold",
    color: "#334155",
  },
  standardInput: {
    backgroundColor: "#fff",
    borderWidth: 1,
    borderColor: "#cbd5e1",
    borderRadius: 14,
    height: 56,
    paddingHorizontal: 16,
    fontSize: 16,
    color: "#0f172a",
  },
  passwordContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#fff",
    borderWidth: 1,
    borderColor: "#cbd5e1",
    borderRadius: 14,
    height: 56,
  },
  passwordInput: {
    flex: 1,
    paddingHorizontal: 16,
    fontSize: 16,
    color: "#0f172a",
    height: "100%",
  },
  eyeIcon: {
    paddingHorizontal: 16,
    height: "100%",
    justifyContent: "center",
  },
  inputErrorBorder: {
    borderColor: "#ef4444",
  },
  errorText: {
    color: "#ef4444",
    fontSize: 12,
    marginTop: 6,
    textAlign: "right",
    paddingHorizontal: 8,
  },
  errorTextCenter: {
    color: "#ef4444",
    fontSize: 14,
    marginBottom: 16,
    textAlign: "center",
    fontWeight: "500",
  },
  checkboxRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "flex-end",
    marginBottom: 24,
    marginTop: 8,
  },
  checkboxText: {
    fontSize: 14,
    color: "#475569",
    marginRight: 8,
  },
  forgotPasswordLayout: {
    alignSelf: "flex-start",
    marginTop: 4,
    marginBottom: 20,
  },
  forgotPasswordText: {
    fontSize: 14,
    fontWeight: "bold",
    color: "#0f172a",
  },
  joinNowLayout: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 24,
  },
  joinNowText: {
    fontSize: 14,
    color: "#0f172a",
    fontWeight: "600",
  },
  joinNowLink: {
    fontSize: 14,
    color: "#1e293b",
    fontWeight: "900",
  },
  actionButtonsRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: 10,
  },
  cancelBtn: {
    flex: 1,
    height: 54,
    borderWidth: 1,
    borderColor: "#cbd5e1",
    backgroundColor: "#fff",
    borderRadius: 14,
    justifyContent: "center",
    alignItems: "center",
    marginRight: 8,
  },
  cancelBtnText: {
    fontSize: 16,
    fontWeight: "bold",
    color: "#64748b",
  },
  submitBtn: {
    flex: 1,
    height: 54,
    backgroundColor: "#D97706",
    borderRadius: 14,
    justifyContent: "center",
    alignItems: "center",
    marginLeft: 8,
    shadowColor: "#D97706",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
    elevation: 4,
  },
  submitBtnText: {
    fontSize: 16,
    fontWeight: "bold",
    color: "#fff",
  },
});
