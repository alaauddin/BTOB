import React, { useState } from "react";
import {
  View,
  Text,
  Image,
  StyleSheet,
  TouchableOpacity,
  Modal,
  FlatList,
  ActivityIndicator,
  Platform,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons, Feather } from "@expo/vector-icons";
import { useNavigation } from "@react-navigation/native";
import { useAuth } from "../context/AuthContext";
import AuthModal from "./AuthModal";

/**
 * CustomHeader — self-managing app header.
 * Handles: navigation menu, merchant switcher, logout (with stack reset).
 */
export default function CustomHeader() {
  const navigation = useNavigation();
  const {
    user, logout, isMerchant,
    activeMerchant, manageableMerchants,
    setActiveMerchant, updateMerchantList,
  } = useAuth();

  const [menuVisible, setMenuVisible] = useState(false);
  const [switcherVisible, setSwitcherVisible] = useState(false);
  const [switchingId, setSwitchingId] = useState(null);
  const [authModalVisible, setAuthModalVisible] = useState(false);

  // ── Navigation helpers ─────────────────────────────────────────
  const closeMenu = () => setMenuVisible(false);

  const go = (screen, params) => {
    closeMenu();
    navigation.navigate(screen, params);
  };

  /** Logout then hard-reset to Home so the user leaves the dashboard */
  const handleLogout = async () => {
    closeMenu();
    await logout();
    navigation.reset({ index: 0, routes: [{ name: "Home" }] });
  };

  // ── Merchant switch ────────────────────────────────────────────
  const openSwitcher = () => {
    closeMenu();
    setSwitcherVisible(true);
  };

  const handleSwitch = async (merchant) => {
    if (merchant.id === activeMerchant?.id) {
      setSwitcherVisible(false);
      return;
    }
    setSwitchingId(merchant.id);
    try {
      const client = (await import("../api/client")).default;
      const res = await client.post("/merchant/switch/", { merchant_id: merchant.id });
      if (res.data.success) {
        await setActiveMerchant(res.data.merchant);
        await updateMerchantList(res.data.manageable_merchants);
      }
    } catch (err) {
      console.error("Switch merchant error", err);
    } finally {
      setSwitchingId(null);
      setSwitcherVisible(false);
    }
  };

  // ── Menu items ─────────────────────────────────────────────────
  const buildMenuItems = () => {
    if (isMerchant) {
      const items = [
        { icon: 'grid',         label: 'لوحة التحكم',   onPress: () => go('MerchantTabs'),                              accent: '#2B5876' },
        { icon: 'package',      label: 'المنتجات',     onPress: () => go('MerchantTabs', { screen: 'Products' }),     accent: '#3B82F6' },
        { icon: 'shopping-bag', label: 'الطلبات',        onPress: () => go('MerchantTabs', { screen: 'Orders', params: { merchantId: activeMerchant?.id } }), accent: '#8B5CF6' },
        { icon: 'shopping-bag', label: 'عرض متجري',    onPress: () => activeMerchant?.store_id && go('MerchantTabs', { screen: 'StoreView', params: { storeId: activeMerchant.store_id } }), accent: '#10B981' },
      ];
      if (manageableMerchants.length > 1) {
        items.push({ icon: "repeat", label: "تبديل المتجر", onPress: openSwitcher, accent: "#F59E0B" });
      }
      items.push({ icon: "home", label: "الرئيسية", onPress: () => go("Home"), accent: "#64748B" });
      items.push({ icon: "log-out", label: "تسجيل الخروج", onPress: handleLogout, accent: "#EF4444", danger: true });
      return items;
    }

    if (user) {
      return [
        { icon: "home",     label: "الرئيسية",       onPress: () => go("Home"),   accent: "#2B5876" },
        { icon: "log-out",  label: "تسجيل الخروج",   onPress: handleLogout,       accent: "#EF4444", danger: true },
      ];
    }

    // Guest
    return [
      { icon: "briefcase",  label: "دخول كتاجر (اسم مستخدم)",  onPress: () => { closeMenu(); navigation.navigate("Login"); },             accent: "#2B5876" },
      { icon: "smartphone", label: "دخول برقم الهاتف",          onPress: () => { closeMenu(); setAuthModalVisible(true); },               accent: "#2B5876" },
    ];
  };

  const menuItems = buildMenuItems();

  return (
    <>
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.headerContainer}>
          {/* ☰ Menu button */}
          <TouchableOpacity onPress={() => setMenuVisible(true)} style={styles.menuButton}>
            <Ionicons name="menu" size={28} color="#2B5876" />
          </TouchableOpacity>

          {/* Logo */}
          <View style={styles.logoContainer}>
            {isMerchant && activeMerchant ? (
              // Show active merchant name when in merchant context
              <Text style={styles.merchantNameInHeader} numberOfLines={1}>
                {activeMerchant.name}
              </Text>
            ) : (
              <Image
                source={require("../../assets/images/logo.png")}
                style={styles.logo}
                resizeMode="contain"
              />
            )}
          </View>

          {/* User avatar */}
          <View style={styles.rightActionsContainer}>
            {user ? (
              <View style={[styles.userAvatar, isMerchant && { backgroundColor: activeMerchant?.primary_color || "#2B5876" }]}>
                <Text style={styles.userAvatarText}>
                  {(user.first_name?.[0] || user.username?.[0] || "U").toUpperCase()}
                </Text>
              </View>
            ) : (
              <View style={{ width: 40 }} />
            )}
          </View>
        </View>
      </SafeAreaView>

      {/* ── Menu bottom sheet ── */}
      <Modal visible={menuVisible} transparent animationType="slide" onRequestClose={closeMenu} statusBarTranslucent>
        <TouchableOpacity style={styles.overlay} activeOpacity={1} onPress={closeMenu}>
          <TouchableOpacity activeOpacity={1} style={styles.sheet}>
            <View style={styles.handle} />

            {/* User info */}
            <View style={styles.userInfoRow}>
              {user ? (
                <>
                  <View style={[styles.menuAvatar, isMerchant && { backgroundColor: activeMerchant?.primary_color || "#2B5876" }]}>
                    <Text style={styles.menuAvatarText}>
                      {(user.first_name?.[0] || user.username?.[0] || "U").toUpperCase()}
                    </Text>
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.menuUserName}>{user.first_name || user.username}</Text>
                    <Text style={styles.menuUserRole}>
                      {isMerchant ? `تاجر — ${activeMerchant?.name || ""}` : "مستخدم"}
                    </Text>
                  </View>
                </>
              ) : (
                <Text style={styles.guestLabel}>مرحباً، زائر 👋</Text>
              )}
            </View>

            <View style={styles.divider} />

            {/* Items */}
            {menuItems.map((item, idx) => (
              <TouchableOpacity
                key={idx}
                style={styles.menuItem}
                onPress={item.onPress}
                activeOpacity={0.7}
              >
                <View style={[styles.menuItemIcon, { backgroundColor: item.accent + "18" }]}>
                  <Feather name={item.icon} size={18} color={item.accent} />
                </View>
                <Text style={[styles.menuItemLabel, item.danger && { color: "#EF4444" }]}>
                  {item.label}
                </Text>
                <Feather name="chevron-left" size={16} color="#CBD5E1" />
              </TouchableOpacity>
            ))}

            <View style={{ height: 20 }} />
          </TouchableOpacity>
        </TouchableOpacity>
      </Modal>

      {/* ── Merchant Switcher sheet ── */}
      <Modal visible={switcherVisible} transparent animationType="slide" onRequestClose={() => setSwitcherVisible(false)} statusBarTranslucent>
        <TouchableOpacity style={styles.overlay} activeOpacity={1} onPress={() => setSwitcherVisible(false)}>
          <TouchableOpacity activeOpacity={1} style={styles.sheet}>
            <View style={styles.handle} />
            <Text style={styles.sheetTitle}>اختر المتجر</Text>
            <FlatList
              data={manageableMerchants}
              keyExtractor={(m) => String(m.id)}
              ItemSeparatorComponent={() => <View style={styles.divider} />}
              renderItem={({ item }) => {
                const isActive = item.id === activeMerchant?.id;
                const isSwitching = item.id === switchingId;
                return (
                  <TouchableOpacity
                    style={[styles.switcherItem, isActive && { backgroundColor: "#F0F9FF" }]}
                    onPress={() => handleSwitch(item)}
                    disabled={!!switchingId}
                  >
                    <View style={[styles.switcherDot, { backgroundColor: item.primary_color || "#2B5876" }]} />
                    <Text style={[styles.switcherName, isActive && { fontWeight: "700", color: item.primary_color || "#2B5876" }]}>
                      {item.name}
                    </Text>
                    {isSwitching
                      ? <ActivityIndicator size="small" color={item.primary_color || "#2B5876"} />
                      : isActive
                        ? <Feather name="check-circle" size={20} color={item.primary_color || "#2B5876"} />
                        : null}
                  </TouchableOpacity>
                );
              }}
            />
            <View style={{ height: 20 }} />
          </TouchableOpacity>
        </TouchableOpacity>
      </Modal>

      {/* Auth Modal (phone login) */}
      <AuthModal
        visible={authModalVisible}
        onClose={() => setAuthModalVisible(false)}
        onSuccess={() => setAuthModalVisible(false)}
      />
    </>
  );
}

/* ── Styles ─────────────────────────────────────────────────────── */
const styles = StyleSheet.create({
  safeArea: { backgroundColor: "#ffffff" },
  headerContainer: {
    flexDirection: "row", alignItems: "center", justifyContent: "space-between",
    height: 60, backgroundColor: "#ffffff", paddingHorizontal: 16,
    borderBottomWidth: 1, borderBottomColor: "#f0f0f0",
    elevation: 2, shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.08, shadowRadius: 3,
  },
  menuButton: { padding: 6, backgroundColor: "#e9f0f5", borderRadius: 10 },
  logoContainer: { flex: 1, alignItems: "center", justifyContent: "center" },
  logo: { height: 40, width: 120 },
  merchantNameInHeader: { fontSize: 17, fontWeight: "700", color: "#0F172A" },
  rightActionsContainer: { minWidth: 40, alignItems: "center", justifyContent: "center" },
  userAvatar: { width: 36, height: 36, borderRadius: 18, backgroundColor: "#2B5876", justifyContent: "center", alignItems: "center" },
  userAvatarText: { color: "#fff", fontSize: 14, fontWeight: "700" },

  overlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.45)", justifyContent: "flex-end" },
  sheet: {
    backgroundColor: "#fff", borderTopLeftRadius: 28, borderTopRightRadius: 28,
    paddingHorizontal: 20, paddingTop: 12,
    paddingBottom: Platform.OS === "ios" ? 36 : 24,
  },
  handle: { width: 40, height: 4, borderRadius: 2, backgroundColor: "#E2E8F0", alignSelf: "center", marginBottom: 20 },
  sheetTitle: { fontSize: 18, fontWeight: "700", color: "#0F172A", textAlign: "center", marginBottom: 16 },

  userInfoRow: { flexDirection: "row", alignItems: "center", gap: 14, marginBottom: 16, paddingHorizontal: 4 },
  menuAvatar: { width: 48, height: 48, borderRadius: 24, backgroundColor: "#2B5876", justifyContent: "center", alignItems: "center" },
  menuAvatarText: { color: "#fff", fontSize: 18, fontWeight: "700" },
  menuUserName: { fontSize: 16, fontWeight: "700", color: "#0F172A" },
  menuUserRole: { fontSize: 12, color: "#64748B", marginTop: 2 },
  guestLabel: { fontSize: 16, fontWeight: "600", color: "#0F172A" },
  divider: { height: 1, backgroundColor: "#F1F5F9", marginVertical: 4 },

  menuItem: { flexDirection: "row", alignItems: "center", gap: 14, paddingVertical: 13, borderRadius: 12, paddingHorizontal: 4 },
  menuItemIcon: { width: 42, height: 42, borderRadius: 12, justifyContent: "center", alignItems: "center" },
  menuItemLabel: { flex: 1, fontSize: 15, fontWeight: "600", color: "#0F172A", textAlign: "right" },

  switcherItem: { flexDirection: "row", alignItems: "center", gap: 14, paddingVertical: 14, paddingHorizontal: 4, borderRadius: 12 },
  switcherDot: { width: 12, height: 12, borderRadius: 6 },
  switcherName: { flex: 1, fontSize: 15, color: "#0F172A", fontWeight: "500" },
});
