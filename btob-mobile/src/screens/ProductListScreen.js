import React, { useState, useEffect } from "react";
import { View, FlatList, TouchableOpacity, StyleSheet, ActivityIndicator, Image, Dimensions, ScrollView, Alert, DeviceEventEmitter, Animated } from 'react-native';
import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import { LinearGradient } from 'expo-linear-gradient';
import { BlurView } from 'expo-blur';
import { BRAND } from "../theme/brand";
import client from "../api/client";
import { useAuth } from "../context/AuthContext";
import { useNotifications } from "../context/NotificationContext";
import AuthModal from "../components/AuthModal";
import CartIconBadge from "../components/CartIconBadge";
import { getSupplierTheme } from "../theme/supplierTheme";
import { chatApi } from "../api/chat";
import Text from '../components/AppText';


const { width } = Dimensions.get("window");

export default function ProductListScreen({ route, navigation }) {
  const { storeId } = route.params;
  const { showNotification } = useNotifications();
  const [storeData, setStoreData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [authModalVisible, setAuthModalVisible] = useState(false);
  const { user } = useAuth();
  const [addingToCartId, setAddingToCartId] = useState(null);
  const [cartItems, setCartItems] = useState({}); // { product_id: quantity }
  const [cartCount, setCartCount] = useState(0);
  const [wishlistItems, setWishlistItems] = useState({}); // { product_id: boolean }
  const [togglingWishlistId, setTogglingWishlistId] = useState(null);

  useEffect(() => {
    if (!storeId || String(storeId) === 'undefined') {
      setLoading(false);
      return;
    }
    fetchStoreProfile();
  }, [storeId]);

  useEffect(() => {
    if (user && storeId && storeId !== 'undefined') {
      fetchCartItems();
    }
  }, [storeId, user]);

  useEffect(() => {
    if (storeData?.supplier) {
      const theme = getSupplierTheme(storeData.supplier);
      navigation.setOptions({
        headerStyle: {
          backgroundColor: theme.navbar,
          elevation: 0,
          shadowOpacity: 0,
        },
        headerTintColor: theme.navbarText,
        headerTitleStyle: {
          fontFamily: BRAND.typography.bold,
        },
        headerRight: () => (
          <View style={{ marginRight: 15 }}>
            <CartIconBadge
              supplierId={storeData.supplier.id}
              size={24}
              badgeColor={theme.primary}
              iconColor={theme.navbarText}
            />
          </View>
        ),
      });
    }
  }, [navigation, storeData]);

  const fetchCartItems = async () => {
    try {
      const response = await client.get(
        `/carts/get_supplier_cart/?supplier_id=${storeId}`,
      );
      if (response.data.success && response.data.cart) {
        // Map items to a dictionary of {product_id: quantity}
        const itemsMap = {};
        response.data.cart.items.forEach((item) => {
          itemsMap[item.product.id] = item.quantity;
        });
        setCartItems({ ...itemsMap });
        setCartCount(response.data.cart_count);
        const emitId =
          storeData && storeData.supplier ? storeData.supplier.id : storeId;
        DeviceEventEmitter.emit(
          `cart_updated_${emitId}`,
          response.data.cart_count,
        );
      } else {
        setCartItems({});
        setCartCount(0);
      }
    } catch (error) {
      console.error("Error fetching cart items", error);
    }
  };

  const fetchStoreProfile = async () => {
    try {
      const response = await client.get(`/stores/${storeId}/profile/`);
      if (response.data.success) {
        setStoreData(response.data);

        // Initialize Wishlist State
        const initialWishlist = {};
        [
          ...(response.data.offer_products || []),
          ...(response.data.new_products || []),
          ...(response.data.other_products || [])
        ].forEach(p => {
          initialWishlist[p.id] = p.is_wishlisted;
        });
        setWishlistItems(initialWishlist);
      }
    } catch (error) {
      console.error("Error fetching store profile", error);
    } finally {
      setLoading(false);
    }
  };

  const handleToggleWishlist = async (productId) => {
    if (!user) {
      setAuthModalVisible(true);
      return;
    }

    const currentState = wishlistItems[productId];
    // Optimistic Update
    setWishlistItems(prev => ({ ...prev, [productId]: !currentState }));
    setTogglingWishlistId(productId);

    try {
      const response = await client.post(`/wishlist/toggle/${productId}/`);
      if (response.data.success) {
        // Confirm server state
        setWishlistItems(prev => ({ ...prev, [productId]: response.data.is_wishlisted }));
        showNotification({
          title: response.data.action === 'added' ? "تم الإضافة" : "تم الإزالة",
          message: response.data.message,
          type: "success"
        });
      } else {
        // Revert on failure
        setWishlistItems(prev => ({ ...prev, [productId]: currentState }));
        showNotification({ title: "خطأ", message: "حدث خطأ ما", type: "error" });
      }
    } catch (error) {
      // Revert on failure
      setWishlistItems(prev => ({ ...prev, [productId]: currentState }));
      showNotification({ title: "خطأ", message: "فشل الاتصال بالخادم", type: "error" });
    } finally {
      setTogglingWishlistId(null);
    }
  };

  const handleUpdateQuantity = async (productId, currentQty, change) => {
    if (!user) {
      setAuthModalVisible(true);
      return;
    }

    const newQty = currentQty + change;
    if (newQty < 0) return;

    // Optimistic UI update
    setCartItems((prev) => ({
      ...prev,
      [productId]: newQty,
    }));

    setAddingToCartId(productId);
    try {
      const response = await client.post("/carts/update_quantity/", {
        product_id: productId,
        quantity: newQty,
      });
      if (!response.data.success) {
        // Revert on failure
        setCartItems((prev) => ({
          ...prev,
          [productId]: currentQty,
        }));
        showNotification({ title: "تنبيه", message: response.data.message || "حدث خطأ ما", type: "error" });
      } else {
        setCartCount(response.data.cart_count);
        DeviceEventEmitter.emit(
          `cart_updated_${storeData.supplier.id}`,
          response.data.cart_count,
        );
      }
    } catch (error) {
      // Revert on failure
      setCartItems((prev) => ({
        ...prev,
        [productId]: currentQty,
      }));
      console.error("Update quantity error", error);
      showNotification({ title: "خطأ", message: "فشل في تحديث السلة. تحقق من اتصالك بالإنترنت.", type: "error" });
    } finally {
      setAddingToCartId(null);
    }
  };

  const handleStartChat = async () => {
    if (!user) {
      setAuthModalVisible(true);
      return;
    }
    try {
      setLoading(true);
      const res = await chatApi.startThread(storeData.supplier.id);
      navigation.navigate('Chat', { thread: res.data });
    } catch (err) {
      console.error('Failed to start chat', err);
      showNotification({ title: 'خطأ', message: 'فشل في بدء المحادثة', type: 'error' });
    } finally {
      setLoading(false);
    }
  };


  const renderProductItem = React.useCallback(
    ({ item }) => {
      const imageUrl =
        item.image ||
        (item.images && item.images.length > 0 ? item.images[0].image : null);
      const currencySymbol = storeData?.supplier?.currency?.symbol || "$";

      // Dynamic styling
      const theme = getSupplierTheme(storeData?.supplier);

      return (
        <TouchableOpacity
          style={styles.productCard}
          activeOpacity={0.9}
          onPress={() =>
            navigation.navigate("ProductDetails", { productId: item.id })
          }
        >
          <View style={[styles.productImageContainer, { backgroundColor: theme.primaryMuted }]}>
            {imageUrl ? (
              <Image source={{ uri: imageUrl }} style={styles.productImage} />
            ) : (
              <View style={[styles.productImage, styles.placeholderImage]}>
                <Ionicons name="image-outline" size={32} color={theme.shadow} />
              </View>
            )}

            {/* Badges Layout */}
            <View style={styles.badgeOverlay}>
              {item.has_discount && (
                <LinearGradient
                  colors={['#ef4444', '#b91c1c']}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                  style={styles.discountBadge}
                >
                  <Text style={styles.discountBadgeText}>
                    -{item.discount_percentage}%
                  </Text>
                </LinearGradient>
              )}
              {item.is_new && !item.has_discount && (
                <LinearGradient
                  colors={[theme.primary, theme.primary + 'cc']}
                  style={styles.newBadge}
                >
                  <Text style={styles.newBadgeText}>جديد</Text>
                </LinearGradient>
              )}
            </View>

            <TouchableOpacity
              style={[styles.wishlistHeart, { backgroundColor: theme.secondary + 'aa' }]}
              onPress={() => handleToggleWishlist(item.id)}
              disabled={togglingWishlistId === item.id}
            >
              {togglingWishlistId === item.id ? (
                <ActivityIndicator size="small" color={theme.primary} />
              ) : (
                <Ionicons
                  name={wishlistItems[item.id] ? "heart" : "heart-outline"}
                  size={18}
                  color={wishlistItems[item.id] ? "#ef4444" : theme.primary}
                />
              )}
            </TouchableOpacity>
          </View>

          <View style={styles.productInfo}>
            <View>
              <Text style={[styles.productName, { color: theme.text }]} numberOfLines={2}>
                {item.name}
              </Text>

              <View style={styles.priceContainer}>
                {item.has_discount ? (
                  <View style={styles.priceRow}>
                    <Text style={[styles.newPrice, { color: theme.primary }]}>
                      {parseFloat(item.price_after_discount).toFixed(2)} <Text style={styles.currencySmall}>{currencySymbol}</Text>
                    </Text>
                    <Text style={[styles.oldPrice, { color: theme.textMuted }]}>
                      {parseFloat(item.price).toFixed(2)}
                    </Text>
                  </View>
                ) : (
                  <Text style={[styles.newPrice, { color: theme.primary }]}>
                    {parseFloat(item.price).toFixed(2)} <Text style={styles.currencySmall}>{currencySymbol}</Text>
                  </Text>
                )}
                {item.has_attributes && (
                  <View style={[styles.attributeBadge, { backgroundColor: theme.primaryMuted }]}>
                    <Text style={[styles.attributeText, { color: theme.primary }]}>خيارات</Text>
                  </View>
                )}
              </View>
            </View>

            {/* Action Button */}
            <View style={styles.cardActionArea}>
              {item.has_attributes ? (
                <TouchableOpacity
                  style={[styles.optionsButton, { borderColor: theme.shadow }]}
                  onPress={() => navigation.navigate("ProductDetails", { productId: item.id })}
                >
                  <Text style={[styles.optionsButtonText, { color: theme.primary }]}>التفاصيل</Text>
                  <Ionicons name="chevron-back" size={14} color={theme.primary} />
                </TouchableOpacity>
              ) : cartItems[item.id] > 0 ? (
                <View style={[styles.quantityPill, { backgroundColor: theme.primary }]}>
                  <TouchableOpacity
                    style={styles.pillButton}
                    onPress={() => handleUpdateQuantity(item.id, cartItems[item.id], -1)}
                    disabled={addingToCartId === item.id}
                  >
                    <Ionicons name="remove" size={18} color="#fff" />
                  </TouchableOpacity>

                  <View style={styles.pillValueContainer}>
                    {addingToCartId === item.id ? (
                      <ActivityIndicator size="small" color="#fff" />
                    ) : (
                      <Text style={styles.pillText}>{cartItems[item.id]}</Text>
                    )}
                  </View>

                  <TouchableOpacity
                    style={styles.pillButton}
                    onPress={() => handleUpdateQuantity(item.id, cartItems[item.id], 1)}
                    disabled={addingToCartId === item.id}
                  >
                    <Ionicons name="add" size={18} color="#fff" />
                  </TouchableOpacity>
                </View>
              ) : (
                <TouchableOpacity
                  style={[styles.addButton, { backgroundColor: theme.primary }]}
                  onPress={() => handleUpdateQuantity(item.id, 0, 1)}
                  disabled={addingToCartId === item.id}
                >
                  {addingToCartId === item.id ? (
                    <ActivityIndicator color="#fff" size="small" />
                  ) : (
                    <>
                      <Text style={styles.addButtonText}>أضف</Text>
                      <Ionicons name="cart-outline" size={16} color="#fff" />
                    </>
                  )}
                </TouchableOpacity>
              )}
            </View>
          </View>
        </TouchableOpacity>
      );
    },
    [storeData, cartItems, addingToCartId, navigation, wishlistItems, togglingWishlistId],
  );

  if (loading) {
    return (
      <View style={styles.centerMode}>
        <ActivityIndicator size="large" color={BRAND.colors.primary} />
      </View>
    );
  }

  if (!storeData || !storeData.supplier) {
    return (
      <View style={styles.centerMode}>
        <Ionicons name="alert-circle-outline" size={64} color="#94a3b8" />
        <Text style={styles.emptyText}>المتجر غير متوفر حالياً</Text>
      </View>
    );
  }

  const {
    supplier,
    supplier_ads,
    offer_products,
    new_products,
    other_products,
  } = storeData;

  const theme = getSupplierTheme(supplier);

  return (
    <View style={[styles.container, { backgroundColor: theme.bg }]}>
      <ScrollView
        style={styles.container}
        showsVerticalScrollIndicator={false}
      >
        {/* Modern Store Hero */}
        <View style={styles.heroContainer}>
          <View style={styles.heroCoverWrapper}>
            {supplier.panal_picture ? (
              <Image source={{ uri: supplier.panal_picture }} style={styles.heroCover} />
            ) : (
              <LinearGradient colors={[theme.primary, theme.accent]} style={styles.heroCover} />
            )}
            <LinearGradient
              colors={['transparent', 'rgba(0,0,0,0.4)']}
              style={StyleSheet.absoluteFill}
            />
          </View>

          <View style={styles.heroContent}>
            <View style={[styles.premiumLogoWrapper, { shadowColor: theme.shadow }]}>
              <Image
                source={supplier.profile_picture ? { uri: supplier.profile_picture } : require("../../assets/images/logo.png")}
                style={styles.heroLogo}
              />
            </View>

            <View style={styles.heroTextContent}>
              <Text style={[styles.heroStoreName, { color: theme.text }]}>{supplier.name}</Text>
              <View style={styles.heroMetaRow}>
                <View style={styles.heroLocationRow}>
                  <Ionicons name="location-outline" size={14} color={theme.textMuted} />
                  <Text style={[styles.heroLocationText, { color: theme.textMuted }]}>صنعاء، اليمن</Text>
                </View>
              </View>
            </View>

            <TouchableOpacity
              style={[styles.heroChatButton, { backgroundColor: theme.primary }]}
              onPress={handleStartChat}
            >
              <Ionicons name="chatbubble-ellipses" size={24} color="#FFF" />
            </TouchableOpacity>
          </View>
        </View>




        {/* Supplier Ads */}
        {supplier_ads && supplier_ads.length > 0 && (
          <View style={styles.sectionMargin}>
            <FlatList
              horizontal
              showsHorizontalScrollIndicator={false}
              data={supplier_ads}
              keyExtractor={(item) => item.id.toString()}
              renderItem={({ item }) => (
                <TouchableOpacity style={styles.premiumAdCard} activeOpacity={0.9}>
                  <Image source={{ uri: item.image }} style={styles.premiumAdImage} />
                  <LinearGradient colors={['transparent', 'rgba(0,0,0,0.1)']} style={StyleSheet.absoluteFill} />
                </TouchableOpacity>
              )}
              contentContainerStyle={styles.premiumAdsList}
              snapToInterval={width - 48}
              decelerationRate="fast"
            />
          </View>
        )}

        {/* Exclusive Offers */}
        {offer_products && offer_products.length > 0 && (
          <View style={styles.sectionMargin}>
            <View style={styles.modernSectionHeader}>
              <View style={styles.sectionTitleGroup}>
                <Text style={[styles.modernSectionTitle, { color: theme.text }]}>عروض حصرية</Text>
                <View style={[styles.titleDot, { backgroundColor: theme.primary }]} />
              </View>
              <TouchableOpacity>
                <Text style={[styles.seeAllLink, { color: theme.primary }]}>عرض الكل</Text>
              </TouchableOpacity>
            </View>
            <FlatList
              horizontal
              showsHorizontalScrollIndicator={false}
              data={offer_products}
              keyExtractor={(item) => item.id.toString()}
              renderItem={renderProductItem}
              extraData={cartItems}
              contentContainerStyle={styles.premiumHorizontalList}
            />
          </View>
        )}

        {/* New Arrivals */}
        {new_products && new_products.length > 0 && (
          <View style={styles.sectionMargin}>
            <View style={styles.modernSectionHeader}>
              <View style={styles.sectionTitleGroup}>
                <Text style={[styles.modernSectionTitle, { color: theme.text }]}>وصل حديثاً</Text>
                <View style={[styles.titleDot, { backgroundColor: theme.primary }]} />
              </View>
            </View>
            <FlatList
              horizontal
              showsHorizontalScrollIndicator={false}
              data={new_products}
              keyExtractor={(item) => item.id.toString()}
              renderItem={renderProductItem}
              extraData={cartItems}
              contentContainerStyle={styles.premiumHorizontalList}
            />
          </View>
        )}

        {/* All Products Grid */}
        {other_products && (
          <View style={styles.sectionMargin}>
            <View style={styles.modernSectionHeader}>
              <View style={styles.sectionTitleGroup}>
                <Text style={[styles.modernSectionTitle, { color: theme.text }]}>جميع المنتجات</Text>
                <View style={[styles.titleDot, { backgroundColor: theme.primary }]} />
              </View>
            </View>

            {other_products.length > 0 ? (
              <View style={styles.premiumGrid}>
                {other_products.map((item) => (
                  <View key={item.id} style={styles.premiumGridItem}>
                    {renderProductItem({ item })}
                  </View>
                ))}
              </View>
            ) : (
              <View style={styles.emptyGridState}>
                <Text style={styles.emptyText}>لا توجد منتجات إضافية حالياً</Text>
              </View>
            )}
          </View>
        )}

        <View style={{ height: cartCount > 0 ? 120 : 40 }} />

        {/* Auth Modal */}
        <AuthModal
          visible={authModalVisible}
          onClose={() => setAuthModalVisible(false)}
          primaryColor={theme.primary}
          onSuccess={() => fetchCartItems()}
        />
      </ScrollView>

      {/* Modern Floating Action Bar */}
      {cartCount > 0 && (
        <Animated.View style={styles.modernFloatingBar}>
          <TouchableOpacity
            style={[styles.premiumCartFAB, { backgroundColor: theme.primary, shadowColor: theme.primary }]}
            activeOpacity={0.85}
            onPress={() => navigation.navigate("Cart", { supplierId: storeData?.supplier?.id || storeId })}
          >
            <View style={styles.fabLeft}>
              <View style={styles.fabBadge}>
                <Text style={[styles.fabBadgeText, { color: theme.primary }]}>{cartCount}</Text>
              </View>
              <Text style={styles.fabTitle}>عرض سلة المشتريات</Text>
            </View>
            <View style={styles.fabRight}>
              <Ionicons name="cart" size={24} color="#fff" />
              <View style={styles.fabArrow}>
                <Ionicons name="chevron-back" size={18} color="#fff" />
              </View>
            </View>
          </TouchableOpacity>
        </Animated.View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  centerMode: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: '#fff',
  },
  /* Hero Section */
  heroContainer: {
    backgroundColor: "#fff",
    paddingBottom: 24,
  },
  heroCoverWrapper: {
    width: "100%",
    height: 180,
    backgroundColor: "#f1f5f9",
  },
  heroCover: {
    width: "100%",
    height: "100%",
    resizeMode: "cover",
  },
  heroContent: {
    flexDirection: "row",
    paddingHorizontal: 20,
    marginTop: -40,
  },
  premiumLogoWrapper: {
    width: 90,
    height: 90,
    borderRadius: 24,
    backgroundColor: "#fff",
    padding: 3,
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.15,
    shadowRadius: 15,
    elevation: 8,
  },
  heroLogo: {
    width: "100%",
    height: "100%",
    borderRadius: 21,
    resizeMode: "cover",
  },
  heroTextContent: {
    flex: 1,
    marginLeft: 16,
    marginTop: 45,
  },
  heroStoreName: {
    fontSize: 22,
    fontFamily: BRAND.typography.extraBold,
    textAlign: "left",
    letterSpacing: -0.5,
  },
  heroMetaRow: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 6,
    gap: 8,
  },
  typeBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
  },
  typeBadgeText: {
    fontSize: 11,
    fontFamily: BRAND.typography.extraBold,
  },
  heroLocationRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  heroLocationText: {
    fontSize: 13,
    color: "#64748b",
    fontFamily: BRAND.typography.medium,
  },
  heroChatButton: {
    width: 50,
    height: 50,
    borderRadius: 25,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 40,
    marginLeft: 'auto',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 5
  },
  /* Sticky Search Bar */

  stickySearchContainer: {
    paddingHorizontal: 20,
    paddingVertical: 12,
    zIndex: 10,
  },
  searchPill: {
    flexDirection: 'row',
    alignItems: 'center',
    height: 48,
    borderRadius: 24,
    paddingHorizontal: 16,
    borderWidth: 1,
    gap: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.03,
    shadowRadius: 4,
    elevation: 2,
  },
  searchPillText: {
    fontSize: 14,
    color: '#94a3b8',
    fontFamily: BRAND.typography.medium,
    flex: 1,
    textAlign: 'auto'
  },
  /* Section & Ads */
  sectionMargin: {
    marginBottom: 28,
  },
  modernSectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 16,
    paddingHorizontal: 20,
  },
  sectionTitleGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  modernSectionTitle: {
    fontSize: 19,
    fontFamily: BRAND.typography.extraBold,
    letterSpacing: -0.3,
  },
  titleDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  seeAllLink: {
    fontSize: 14,
    fontFamily: BRAND.typography.bold,
  },
  premiumAdsList: {
    paddingHorizontal: 20,
    gap: 12,
  },
  premiumAdCard: {
    width: width - 80,
    height: 160,
    borderRadius: 24,
    overflow: "hidden",
    backgroundColor: "#f1f5f9",
  },
  premiumAdImage: {
    width: "100%",
    height: "100%",
    resizeMode: "cover",
  },
  /* Product Cards */
  premiumHorizontalList: {
    paddingHorizontal: 16,
    gap: 4,
  },
  productCard: {
    width: 175,
    backgroundColor: "#fff",
    borderRadius: 28,
    marginHorizontal: 6,
    padding: 8,
    shadowColor: "#0f172a",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.05,
    shadowRadius: 16,
    elevation: 4,
    borderWidth: 1,
    borderColor: '#f1f5f9',
  },
  productImageContainer: {
    height: 155,
    borderRadius: 22,
    overflow: "hidden",
    position: "relative",
    justifyContent: 'center',
    alignItems: 'center',
  },
  productImage: {
    width: "100%",
    height: "100%",
    resizeMode: "contain",
  },
  placeholderImage: {
    width: '100%',
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
  },
  badgeOverlay: {
    position: 'absolute',
    top: 10,
    left: 10,
    gap: 6,
  },
  discountBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  discountBadgeText: {
    color: "#fff",
    fontSize: 11,
    fontFamily: BRAND.typography.extraBold,
  },
  newBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  newBadgeText: {
    color: "#fff",
    fontSize: 11,
    fontFamily: BRAND.typography.extraBold,
  },
  wishlistHeart: {
    position: 'absolute',
    top: 10,
    right: 10,
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },
  productInfo: {
    paddingTop: 12,
    paddingHorizontal: 4,
    paddingBottom: 4,
    flex: 1,
    justifyContent: 'space-between'
  },
  productName: {
    fontSize: 14,
    fontFamily: BRAND.typography.bold,
    lineHeight: 18,
    height: 36,
    marginBottom: 6,
  },
  priceContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  priceRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 4,
  },
  newPrice: {
    fontSize: 16,
    fontFamily: BRAND.typography.extraBold,
  },
  currencySmall: {
    fontSize: 11,
    fontFamily: BRAND.typography.bold,
  },
  oldPrice: {
    fontSize: 11,
    textDecorationLine: "line-through",
    fontFamily: BRAND.typography.medium
  },
  attributeBadge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },
  attributeText: {
    fontSize: 10,
    fontFamily: BRAND.typography.extraBold,
  },
  cardActionArea: {
    marginTop: 'auto',
  },
  addButton: {
    flexDirection: "row",
    height: 40,
    borderRadius: 14,
    justifyContent: "center",
    alignItems: "center",
    gap: 8,
  },
  addButtonText: {
    color: "#fff",
    fontSize: 14,
    fontFamily: BRAND.typography.extraBold,
  },
  optionsButton: {
    flexDirection: "row",
    height: 40,
    borderRadius: 14,
    borderWidth: 1,
    justifyContent: "center",
    alignItems: "center",
    gap: 4,
  },
  optionsButtonText: {
    fontSize: 13,
    fontFamily: BRAND.typography.bold,
  },
  quantityPill: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    height: 40,
    borderRadius: 14,
    paddingHorizontal: 4,
  },
  pillButton: {
    width: 32,
    height: 32,
    justifyContent: "center",
    alignItems: "center",
  },
  pillValueContainer: {
    flex: 1,
    alignItems: 'center',
  },
  pillText: {
    color: "#fff",
    fontSize: 16,
    fontFamily: BRAND.typography.extraBold,
  },
  /* Grid Layout */
  premiumGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    paddingHorizontal: 14,
  },
  premiumGridItem: {
    width: "50%",
    paddingHorizontal: 2,
    marginBottom: 20,
  },
  emptyGridState: {
    paddingVertical: 60,
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 16,
    color: "#94a3b8",
    fontFamily: BRAND.typography.semiBold,
  },
  /* Floating Action Bar */
  modernFloatingBar: {
    position: "absolute",
    bottom: 30,
    left: 20,
    right: 20,
    zIndex: 100,
  },
  premiumCartFAB: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderRadius: 24,
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.3,
    shadowRadius: 20,
    elevation: 10,
  },
  fabLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  fabBadge: {
    backgroundColor: "#fff",
    minWidth: 28,
    height: 28,
    borderRadius: 14,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 6,
  },
  fabBadgeText: {
    fontSize: 14,
    fontFamily: BRAND.typography.extraBold,
  },
  fabTitle: {
    color: "#fff",
    fontSize: 16,
    fontFamily: BRAND.typography.extraBold,
    letterSpacing: -0.2,
  },
  fabRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  fabArrow: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: 'rgba(255,255,255,0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
});
