import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Image,
  Dimensions,
  ScrollView,
  Alert,
  DeviceEventEmitter,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import client from "../api/client";
import { useAuth } from "../context/AuthContext";
import AuthModal from "../components/AuthModal";
import CartIconBadge from "../components/CartIconBadge";

const { width } = Dimensions.get("window");

export default function ProductListScreen({ route, navigation }) {
  const { storeId } = route.params;
  const [storeData, setStoreData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [authModalVisible, setAuthModalVisible] = useState(false);
  const { user } = useAuth();
  const [addingToCartId, setAddingToCartId] = useState(null);
  const [cartItems, setCartItems] = useState({}); // { product_id: quantity }
  const [cartCount, setCartCount] = useState(0);

  useEffect(() => {
    fetchStoreProfile();
  }, [storeId]);

  useEffect(() => {
    if (user) {
      fetchCartItems();
    }
  }, [storeId, user]);

  useEffect(() => {
    if (storeData?.supplier?.id) {
      navigation.setOptions({
        headerRight: () => (
          <View style={{ marginRight: 15 }}>
            <CartIconBadge supplierId={storeData.supplier.id} size={24} />
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
      }
    } catch (error) {
      console.error("Error fetching store profile", error);
    } finally {
      setLoading(false);
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
        Alert.alert("تنبيه", response.data.message || "حدث خطأ ما");
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
      Alert.alert("خطأ", "فشل في تحديث السلة. تحقق من اتصالك بالإنترنت.");
    } finally {
      setAddingToCartId(null);
    }
  };

  const renderProductItem = React.useCallback(
    ({ item }) => {
      const imageUrl =
        item.image ||
        (item.images && item.images.length > 0 ? item.images[0].image : null);
      const currencySymbol = storeData?.supplier?.currency?.symbol || "$";
      const finalPrice = item.has_discount
        ? item.price_after_discount
        : item.price;

      // Dynamic styling
      const primaryColor = storeData?.supplier?.primary_color || "#2B5876";

      return (
        <TouchableOpacity
          style={styles.productCard}
          onPress={() =>
            navigation.navigate("ProductDetails", { productId: item.id })
          }
        >
          <View style={styles.productImageContainer}>
            {imageUrl ? (
              <Image source={{ uri: imageUrl }} style={styles.productImage} />
            ) : (
              <View style={[styles.productImage, styles.placeholderImage]} />
            )}
            {item.has_discount && (
              <View style={styles.discountBadge}>
                <Text style={styles.discountBadgeText}>
                  {item.discount_percentage}% OFF
                </Text>
              </View>
            )}
            {item.is_new && !item.has_discount && (
              <View
                style={[styles.newBadge, { backgroundColor: primaryColor }]}
              >
                <Text style={styles.newBadgeText}>جديد</Text>
              </View>
            )}
          </View>
          <View style={styles.productInfo}>
            <Text style={styles.productName} numberOfLines={2}>
              {item.name}
            </Text>
            <View style={styles.priceContainer}>
              {item.has_discount ? (
                <>
                  <Text style={[styles.newPrice, { color: primaryColor }]}>
                    {parseFloat(finalPrice).toFixed(2)} {currencySymbol}
                  </Text>
                  <Text style={styles.oldPrice}>
                    {parseFloat(item.price).toFixed(2)}
                  </Text>
                </>
              ) : (
                <Text style={[styles.newPrice, { color: primaryColor }]}>
                  {parseFloat(item.price).toFixed(2)} {currencySymbol}
                </Text>
              )}
            </View>

            {/* Interactive Cart Button */}
            {cartItems[item.id] > 0 ? (
              <View
                style={[
                  styles.quantityController,
                  { borderColor: primaryColor },
                ]}
              >
                <TouchableOpacity
                  style={[
                    styles.qtyButton,
                    { backgroundColor: primaryColor + "15" },
                  ]}
                  onPress={() =>
                    handleUpdateQuantity(item.id, cartItems[item.id], -1)
                  }
                  disabled={addingToCartId === item.id}
                >
                  <Ionicons name="remove" size={18} color={primaryColor} />
                </TouchableOpacity>

                <Text style={[styles.qtyText, { color: primaryColor }]}>
                  {cartItems[item.id]}
                </Text>

                <TouchableOpacity
                  style={[styles.qtyButton, { backgroundColor: primaryColor }]}
                  onPress={() =>
                    handleUpdateQuantity(item.id, cartItems[item.id], 1)
                  }
                  disabled={addingToCartId === item.id}
                >
                  <Ionicons name="add" size={18} color="#fff" />
                </TouchableOpacity>
              </View>
            ) : (
              <TouchableOpacity
                style={[
                  styles.addToCartButton,
                  { backgroundColor: primaryColor },
                  addingToCartId === item.id && { opacity: 0.7 },
                ]}
                onPress={() => handleUpdateQuantity(item.id, 0, 1)}
                disabled={addingToCartId === item.id}
              >
                {addingToCartId === item.id ? (
                  <ActivityIndicator color="#fff" size="small" />
                ) : (
                  <>
                    <Ionicons
                      name="cart-outline"
                      size={16}
                      color="#fff"
                      style={{ marginRight: 4 }}
                    />
                    <Text style={styles.addToCartText}>أضف للسلة</Text>
                  </>
                )}
              </TouchableOpacity>
            )}
          </View>
        </TouchableOpacity>
      );
    },
    [storeData, cartItems, addingToCartId, navigation],
  );

  if (loading) {
    return (
      <View style={styles.centerMode}>
        <ActivityIndicator size="large" color="#2B5876" />
      </View>
    );
  }

  if (!storeData || !storeData.supplier) {
    return (
      <View style={styles.centerMode}>
        <Text style={styles.emptyText}>لم يتم العثور على المتجر</Text>
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

  const primaryColor = supplier.primary_color || "#2B5876";

  return (
    <View style={styles.container}>
      <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
        {/* Store Header / Profile */}
        <View style={styles.headerContainer}>
          <View style={styles.coverImageContainer}>
            {supplier.panal_picture ? (
              <Image
                source={{ uri: supplier.panal_picture }}
                style={styles.coverImage}
              />
            ) : (
              <View
                style={[
                  styles.coverImagePlaceholder,
                  { backgroundColor: primaryColor },
                ]}
              />
            )}
          </View>
          <View style={styles.profileSection}>
            <View
              style={[
                styles.logoWrapper,
                { borderColor: primaryColor, borderWidth: 2 },
              ]}
            >
              <Image
                source={
                  supplier.profile_picture
                    ? { uri: supplier.profile_picture }
                    : require("../../assets/images/logo.png")
                }
                style={styles.storeLogo}
              />
            </View>
            <View style={styles.storeInfoWrapper}>
              <Text style={styles.storeName}>{supplier.name}</Text>
              <View style={styles.storeMetaRow}>
                <Ionicons name="location" size={12} color="#94a3b8" />
                <Text style={styles.storeMetaText}>صنعاء, اليمن</Text>
              </View>
              <View
                style={[
                  styles.badgeContainer,
                  { backgroundColor: primaryColor + "20" },
                ]}
              >
                <Text style={[styles.storeTypeBadge, { color: primaryColor }]}>
                  {supplier.category && supplier.category.length > 0
                    ? supplier.category.map((c) => c.name).join("، ")
                    : supplier.is_factory
                      ? "مصنع"
                      : "تاجر جملة"}
                </Text>
              </View>
            </View>
          </View>
        </View>

        {/* Supplier Ads Carousel */}
        {supplier_ads && supplier_ads.length > 0 && (
          <View style={styles.sectionContainer}>
            <FlatList
              horizontal
              showsHorizontalScrollIndicator={false}
              data={supplier_ads}
              keyExtractor={(item) => item.id.toString()}
              renderItem={({ item }) => (
                <View style={styles.adCard}>
                  <Image source={{ uri: item.image }} style={styles.adImage} />
                </View>
              )}
              contentContainerStyle={styles.adsList}
            />
          </View>
        )}

        {/* Exclusive Offers */}
        {offer_products && offer_products.length > 0 && (
          <View style={styles.sectionContainer}>
            <View style={styles.sectionHeaderRow}>
              <Text style={styles.sectionTitle}>مهرجان الخصومات</Text>
              <View
                style={[
                  styles.sectionTitleAccent,
                  { backgroundColor: primaryColor },
                ]}
              />
            </View>
            <FlatList
              horizontal
              showsHorizontalScrollIndicator={false}
              data={offer_products}
              keyExtractor={(item) => item.id.toString()}
              renderItem={renderProductItem}
              extraData={cartItems}
              contentContainerStyle={styles.horizontalList}
            />
          </View>
        )}

        {/* New Arrivals */}
        {new_products && new_products.length > 0 && (
          <View style={styles.sectionContainer}>
            <View style={styles.sectionHeaderRow}>
              <Text style={styles.sectionTitle}>وصل حديثاً</Text>
              <View
                style={[
                  styles.sectionTitleAccent,
                  { backgroundColor: primaryColor },
                ]}
              />
            </View>
            <FlatList
              horizontal
              showsHorizontalScrollIndicator={false}
              data={new_products}
              keyExtractor={(item) => item.id.toString()}
              renderItem={renderProductItem}
              extraData={cartItems}
              contentContainerStyle={styles.horizontalList}
            />
          </View>
        )}

        {/* All Store Products */}
        {other_products && (
          <View style={styles.sectionContainer}>
            <View style={styles.sectionHeaderRow}>
              <Text style={styles.sectionTitle}>كافة المنتجات</Text>
              <View
                style={[
                  styles.sectionTitleAccent,
                  { backgroundColor: primaryColor },
                ]}
              />
            </View>

            {other_products.length > 0 ? (
              <View style={styles.gridContainer}>
                {other_products.map((item) => (
                  <View key={item.id} style={styles.gridItemWrapper}>
                    {renderProductItem({ item })}
                  </View>
                ))}
              </View>
            ) : (
              <Text style={styles.emptyText}>لا توجد منتجات أخرى لعرضها.</Text>
            )}
          </View>
        )}

        <View style={{ height: cartCount > 0 ? 100 : 40 }} />

        {/* Auth Modal for Guests */}
        <AuthModal
          visible={authModalVisible}
          onClose={() => setAuthModalVisible(false)}
          onSuccess={(loggedInUser) => {
            fetchCartItems();
          }}
        />
      </ScrollView>

      {/* Floating View Cart Button */}
      {cartCount > 0 && (
        <View style={styles.floatingCartContainer}>
          <TouchableOpacity
            style={[
              styles.floatingCartButton,
              { backgroundColor: primaryColor },
            ]}
            onPress={() =>
              navigation.navigate("Cart", {
                supplierId: storeData?.supplier?.id || storeId,
              })
            }
          >
            <View style={styles.floatingCartBadge}>
              <Text
                style={[styles.floatingCartBadgeText, { color: primaryColor }]}
              >
                {cartCount}
              </Text>
            </View>
            <Text style={styles.floatingCartText}>مشاهدة السلة</Text>
            <Ionicons name="cart" size={24} color="#fff" />
          </TouchableOpacity>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f1f5f9",
  },
  centerMode: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  headerContainer: {
    backgroundColor: "#fff",
    marginBottom: 16,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#e2e8f0",
  },
  coverImageContainer: {
    width: "100%",
    height: 140,
    backgroundColor: "#cbd5e1",
  },
  coverImage: {
    width: "100%",
    height: "100%",
    resizeMode: "cover",
  },
  coverImagePlaceholder: {
    flex: 1,
  },
  profileSection: {
    flexDirection: "row",
    paddingHorizontal: 16,
    marginTop: -35, // Overlap cover
  },
  logoWrapper: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: "#fff",
    padding: 4,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 4,
  },
  storeLogo: {
    width: "100%",
    height: "100%",
    borderRadius: 36,
    resizeMode: "cover",
  },
  storeInfoWrapper: {
    flex: 1,
    marginLeft: 16,
    marginTop: 40, // Push down to clear overlap
  },
  storeName: {
    fontSize: 20,
    fontWeight: "900",
    color: "#0f172a",
    textAlign: "left",
  },
  storeMetaRow: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 4,
    marginBottom: 8,
  },
  storeMetaText: {
    fontSize: 12,
    color: "#94a3b8",
    marginLeft: 4,
  },
  badgeContainer: {
    alignSelf: "flex-start",
    backgroundColor: "#e0f2fe",
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  storeTypeBadge: {
    fontSize: 10,
    color: "#0284c7",
    fontWeight: "bold",
  },
  sectionContainer: {
    marginBottom: 20,
  },
  sectionHeaderRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 12,
    paddingHorizontal: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#1e293b",
    textAlign: "left",
  },
  sectionTitleAccent: {
    width: 4,
    height: 18,
    backgroundColor: "#2B5876",
    marginRight: 8,
    borderRadius: 2,
  },
  adsList: {
    paddingHorizontal: 16,
  },
  adCard: {
    width: width - 80,
    height: 140,
    borderRadius: 12,
    overflow: "hidden",
    marginRight: 12,
    backgroundColor: "#e2e8f0",
  },
  adImage: {
    width: "100%",
    height: "100%",
    resizeMode: "cover",
  },
  horizontalList: {
    paddingHorizontal: 12,
  },
  productCard: {
    width: 160,
    backgroundColor: "#fff",
    borderRadius: 12,
    overflow: "hidden",
    marginHorizontal: 4,
    borderWidth: 1,
    borderColor: "#f0f0f0",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  productImageContainer: {
    height: 140,
    backgroundColor: "#f8fafc",
    position: "relative",
  },
  productImage: {
    width: "100%",
    height: "100%",
    resizeMode: "cover",
  },
  placeholderImage: {
    backgroundColor: "#e2e8f0",
  },
  discountBadge: {
    position: "absolute",
    top: 8,
    left: 8,
    backgroundColor: "#ef4444",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  discountBadgeText: {
    color: "#fff",
    fontSize: 10,
    fontWeight: "bold",
  },
  newBadge: {
    position: "absolute",
    top: 8,
    left: 8,
    backgroundColor: "#10b981",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  newBadgeText: {
    color: "#fff",
    fontSize: 10,
    fontWeight: "bold",
  },
  productInfo: {
    padding: 10,
    flex: 1,
    justifyContent: "space-between",
  },
  productName: {
    fontSize: 12,
    fontWeight: "600",
    color: "#1e293b",
    textAlign: "left",
    height: 34,
    marginBottom: 8,
  },
  priceContainer: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 10,
  },
  newPrice: {
    fontSize: 14,
    fontWeight: "bold",
    color: "#2B5876",
    marginRight: 6,
  },
  oldPrice: {
    fontSize: 10,
    color: "#94a3b8",
    textDecorationLine: "line-through",
  },
  addToCartButton: {
    flexDirection: "row",
    backgroundColor: "#2B5876",
    paddingVertical: 8,
    borderRadius: 8,
    justifyContent: "center",
    alignItems: "center",
  },
  addToCartText: {
    color: "#fff",
    fontSize: 12,
    fontWeight: "bold",
  },
  quantityController: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    borderWidth: 1.5,
    borderRadius: 8,
    height: 34,
    overflow: "hidden",
  },
  qtyButton: {
    width: 34,
    height: "100%",
    justifyContent: "center",
    alignItems: "center",
  },
  qtyText: {
    fontSize: 14,
    fontWeight: "bold",
  },
  gridContainer: {
    flexDirection: "row",
    flexWrap: "wrap",
    paddingHorizontal: 12,
  },
  gridItemWrapper: {
    width: "50%",
    paddingHorizontal: 4,
    marginBottom: 16,
  },
  emptyText: {
    textAlign: "center",
    marginTop: 20,
    color: "#94a3b8",
  },
  floatingCartContainer: {
    position: "absolute",
    bottom: 20,
    left: 20,
    right: 20,
  },
  floatingCartButton: {
    backgroundColor: "#10b981", // Emerald green for high visibility
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 14,
    borderRadius: 30,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 5,
    elevation: 6,
  },
  floatingCartText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "bold",
    marginHorizontal: 12,
  },
  floatingCartBadge: {
    backgroundColor: "#fff",
    borderRadius: 12,
    minWidth: 24,
    height: 24,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 6,
  },
  floatingCartBadgeText: {
    color: "#10b981",
    fontSize: 12,
    fontWeight: "bold",
  },
});
