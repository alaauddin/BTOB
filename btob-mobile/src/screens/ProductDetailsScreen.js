import React, { useState, useEffect, useRef } from "react";
import {
  View,
  Text,
  StyleSheet,
  Image,
  ScrollView,
  FlatList,
  ActivityIndicator,
  TouchableOpacity,
  Dimensions,
  Animated,
  DeviceEventEmitter,
  StatusBar,
} from "react-native";
import { Ionicons, Feather } from "@expo/vector-icons";
import { SafeAreaView } from "react-native-safe-area-context";
import { Alert } from "react-native";
import { Video, ResizeMode } from "expo-av";
import client from "../api/client";
import { useAuth } from "../context/AuthContext";
import { useNotifications } from "../context/NotificationContext";
import AuthModal from "../components/AuthModal";
import CartIconBadge from "../components/CartIconBadge";

const { width, height } = Dimensions.get("window");
const HERO_HEIGHT = height * 0.45;

export default function ProductDetailsScreen({ route, navigation }) {
  const { productId } = route.params;
  const [product, setProduct] = useState(null);
  const [loading, setLoading] = useState(true);
  const [authModalVisible, setAuthModalVisible] = useState(false);
  const { user } = useAuth();
  const { showNotification } = useNotifications();

  const [quantity, setQuantity] = useState(1);
  const [cartQty, setCartQty] = useState(0);
  const [addingToCart, setAddingToCart] = useState(false);
  const [selectedOptions, setSelectedOptions] = useState({}); // { attributeId: optionId }
  const [validationErrorIds, setValidationErrorIds] = useState([]); // Array of missing attribute IDs

  // Media gallery state
  const [activeSlide, setActiveSlide] = useState(0);
  const videoRef = useRef(null);
  const scrollViewRef = useRef(null);
  const attributeRefs = useRef({}); // { attributeId: ref }

  // For scroll animation on header
  const scrollY = new Animated.Value(0);

  useEffect(() => {
    fetchProductDetails();
  }, [productId]);

  useEffect(() => {
    if (user && product?.supplier?.id) {
      // If product has attributes, we only fetch qty once all are selected
      const entries = Object.entries(selectedOptions);
      if (!product.attributes || product.attributes.length === 0) {
        fetchCartQty([]);
      } else if (entries.length === product.attributes.length) {
        fetchCartQty();
      } else {
        setCartQty(0);
      }
    }
  }, [user, product, selectedOptions]);

  /**
   * Build the ordered list of media slides from the product:
   *  [primary image, ...extra images, video (if present)]
   */
  const buildMediaSlides = (prod) => {
    if (!prod) return [];
    const slides = [];

    // Primary image
    if (prod.image) {
      slides.push({ type: "image", uri: prod.image });
    }

    // Extra photos
    if (Array.isArray(prod.images)) {
      prod.images.forEach((img) => {
        if (img.image) slides.push({ type: "image", uri: img.image });
      });
    }

    // Video slide last
    if (prod.video) {
      slides.push({ type: "video", uri: prod.video });
    }

    return slides;
  };

  const fetchCartQty = async (optionsOverride = null) => {
    if (!user || !product?.supplier?.id) return;

    try {
      // If product has attributes, we need to know the qty for the SPECIFIC variant
      const options = optionsOverride || Object.values(selectedOptions);
      const payload = {
        product_id: product.id,
        selected_options: options,
        supplier_id: product.supplier.id
      };

      const response = await client.post("/carts/get_item_quantity/", payload);
      if (response.data.success) {
        setCartQty(response.data.quantity);
        DeviceEventEmitter.emit(
          `cart_updated_${product.supplier.id}`,
          response.data.cart_count,
        );
      }
    } catch (error) {
      console.error("Error fetching cart qty", error);
    }
  };

  const fetchProductDetails = async () => {
    try {
      const response = await client.get(`/products/${productId}/`);
      setProduct(response.data);
    } catch (error) {
      console.error("Error fetching product details", error);
    } finally {
      setLoading(false);
    }
  };

  const handleIncrement = () => setQuantity((prev) => prev + 1);
  const handleDecrement = () => {
    if (quantity > 1) setQuantity((prev) => prev - 1);
  };

  const handleUpdateQuantity = async (change, setToZero = false) => {
    if (!user) {
      setAuthModalVisible(true);
      return;
    }

    // Check if all attributes have a selected option
    if (!setToZero && product.attributes && product.attributes.length > 0) {
      const missingAttributeIds = product.attributes
        .filter(attr => !selectedOptions[attr.id])
        .map(attr => attr.id);

      if (missingAttributeIds.length > 0) {
        setValidationErrorIds(missingAttributeIds);
        
        // Scroll to the first missing attribute
        const firstMissingId = missingAttributeIds[0];
        if (attributeRefs.current[firstMissingId]) {
          attributeRefs.current[firstMissingId].measureLayout(
            Animated.findNodeHandle(scrollViewRef.current),
            (x, y) => {
              scrollViewRef.current.scrollTo({ y: y - 100, animated: true });
            }
          );
        }

        showNotification({ 
          title: "تنبيه", 
          message: "الرجاء اختيار كافة الخيارات المطلوبة (مثل المقاس واللون)", 
          type: "warning" 
        });
        return;
      }
    }
    setValidationErrorIds([]);

    setAddingToCart(true);
    let newQty;
    const oldQty = cartQty;

    if (setToZero) {
      newQty = 0;
    } else if (cartQty === 0) {
      newQty = quantity;
    } else {
      newQty = cartQty + change;
    }

    if (newQty < 0) newQty = 0;

    // 1. Optimistic Update
    setCartQty(newQty);

    try {
      const isInitialAdd = oldQty === 0 && !setToZero;
      const endpoint = isInitialAdd ? "/carts/add_item/" : "/carts/update_quantity/";
      
      const payload = {
        product_id: product.id,
        quantity: newQty,
        selected_options: Object.values(selectedOptions)
      };

      const response = await client.post(endpoint, payload);
      
      if (!response.data.success) {
        setCartQty(oldQty); // Rollback
        showNotification({ title: "تنبيه", message: response.data.message || "حدث خطأ ما", type: "error" });
      } else {
        // Update precise state from server count
        if (response.data.quantity !== undefined) {
          setCartQty(response.data.quantity);
        }
        
        DeviceEventEmitter.emit(`cart_updated_${product.supplier.id}`, response.data.cart_count);
        
        if (isInitialAdd) {
          showNotification({ title: "نجاح", message: "تم إضافة المنتج إلى السلة بنجاح!", type: "success" });
        }
      }
    } catch (error) {
      setCartQty(oldQty); // Rollback
      console.error("Add/Update to cart error", error);
      showNotification({ title: "خطأ", message: "فشل في تحديث السلة. تحقق من اتصالك بالإنترنت.", type: "error" });
    } finally {
      setAddingToCart(false);
    }
  };

  if (loading) {
    return (
      <View style={styles.centerMode}>
        <ActivityIndicator size="large" color="#2B5876" />
      </View>
    );
  }

  if (!product) {
    return (
      <View style={styles.centerMode}>
        <Ionicons name="alert-circle-outline" size={60} color="#ccc" />
        <Text style={styles.errorText}>المنتج غير موجود</Text>
        <TouchableOpacity
          style={styles.backButtonEmpty}
          onPress={() => navigation.goBack()}
        >
          <Text style={styles.backButtonTextEmpty}>العودة للخلف</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const currencySymbol = product.supplier?.currency?.symbol || "$";
  const basePrice = product.has_discount
    ? product.price_after_discount
    : product.price;
  
  // Calculate price modifiers from selected options
  const modifierTotal = Object.values(selectedOptions).reduce((sum, optId) => {
    // Find the option object in product attributes
    for (const attr of (product.attributes || [])) {
      const option = (attr.options || []).find(o => o.id === optId);
      if (option) return sum + parseFloat(option.price_modifier || 0);
    }
    return sum;
  }, 0);

  const finalPrice = parseFloat(basePrice) + modifierTotal;
  const totalPrice = (finalPrice * quantity).toFixed(2);
  const primaryColor = product.supplier?.primary_color || "#2B5876";
  const mediaSlides = buildMediaSlides(product);

  const isSelectionComplete = !product.attributes || product.attributes.length === 0 || 
    product.attributes.every(attr => !!selectedOptions[attr.id]);

  // ─────────────────────────────────────────────────────────────────
  // Render a single media slide (image or video)
  // ─────────────────────────────────────────────────────────────────
  const renderSlide = ({ item }) => {
    if (item.type === "video") {
      return (
        <View style={styles.slideContainer}>
          <Video
            ref={videoRef}
            source={{ uri: item.uri }}
            style={styles.heroVideo}
            resizeMode={ResizeMode.COVER}
            useNativeControls
            isLooping={false}
          />
          {/* Video label badge */}
          <View style={styles.videoBadge}>
            <Ionicons name="play-circle" size={16} color="#fff" />
            <Text style={styles.videoBadgeText}>فيديو المنتج</Text>
          </View>
        </View>
      );
    }
    return (
      <View style={styles.slideContainer}>
        <Image source={{ uri: item.uri }} style={styles.heroImage} />
      </View>
    );
  };

  return (
    <View style={styles.container}>
      <StatusBar
        barStyle="dark-content"
        backgroundColor="transparent"
        translucent
      />

      {/* Floating Back Button & Header Actions */}
      <View style={styles.floatingHeader}>
        <TouchableOpacity
          style={styles.iconButton}
          onPress={() => navigation.goBack()}
        >
          <Ionicons name="arrow-forward" size={24} color="#1e293b" />
        </TouchableOpacity>
        <View style={styles.rightHeaderActions}>
          <TouchableOpacity style={[styles.iconButton, { marginRight: 10 }]}>
            <Feather name="heart" size={22} color="#1e293b" />
          </TouchableOpacity>
          <TouchableOpacity style={[styles.iconButton, { marginRight: 10 }]}>
            <Feather name="share-2" size={22} color="#1e293b" />
          </TouchableOpacity>
          <View style={styles.iconButton}>
            <CartIconBadge supplierId={product.supplier?.id} size={22} />
          </View>
        </View>
      </View>

      <Animated.ScrollView
        ref={scrollViewRef}
        style={styles.scrollView}
        showsVerticalScrollIndicator={false}
        onScroll={Animated.event(
          [{ nativeEvent: { contentOffset: { y: scrollY } } }],
          { useNativeDriver: false },
        )}
        scrollEventThrottle={16}
      >
        {/* ── Hero Media Gallery ── */}
        <View style={styles.heroContainer}>
          {mediaSlides.length > 0 ? (
            <>
              <FlatList
                data={mediaSlides}
                renderItem={renderSlide}
                keyExtractor={(_, idx) => String(idx)}
                horizontal
                pagingEnabled
                showsHorizontalScrollIndicator={false}
                onMomentumScrollEnd={(e) => {
                  const idx = Math.round(
                    e.nativeEvent.contentOffset.x / width,
                  );
                  setActiveSlide(idx);
                  // Pause video when user swipes away from it
                  if (videoRef.current) {
                    videoRef.current.pauseAsync().catch(() => {});
                  }
                }}
              />

              {/* Discount badge (shown on all slides) */}
              {product.has_discount && (
                <View style={styles.premiumDiscountBadge}>
                  <Text style={styles.premiumDiscountText}>
                    خصم {product.discount_percentage}%
                  </Text>
                </View>
              )}

              {/* Dot pagination — only shown when there are 2+ slides */}
              {mediaSlides.length > 1 && (
                <View style={styles.dotRow}>
                  {(mediaSlides || []).map((slide, idx) => (
                    <View
                      key={idx}
                      style={[
                        styles.dot,
                        idx === activeSlide
                          ? [styles.dotActive, { backgroundColor: primaryColor }]
                          : styles.dotInactive,
                        // Give the video dot a slightly distinct icon-like look
                        slide.type === "video" && styles.dotVideo,
                      ]}
                    />
                  ))}
                </View>
              )}

              {/* Media counter badge (e.g. "2 / 4") */}
              {mediaSlides.length > 1 && (
                <View style={styles.counterBadge}>
                  <Text style={styles.counterText}>
                    {activeSlide + 1} / {mediaSlides.length}
                  </Text>
                </View>
              )}
            </>
          ) : (
            // Fallback: no media at all
            <View style={[styles.slideContainer, { backgroundColor: "#f1f5f9" }]}>
              <Ionicons name="image-outline" size={60} color="#cbd5e1" />
            </View>
          )}
        </View>

        {/* Main Content Area */}
        <View style={styles.contentContainer}>
          {/* Title & Category */}
          <View style={styles.headerSection}>
            <View style={styles.categoryRow}>
              <Text style={styles.categoryText}>
                {product.category?.category?.name || "تصنيف المنتج"}
              </Text>
              <View style={styles.ratingMock}>
                <Ionicons name="star" size={14} color="#F59E0B" />
                <Text style={styles.ratingText}>4.8 (120 تقييم)</Text>
              </View>
            </View>
            <Text style={styles.productTitle}>{product.name}</Text>
          </View>

          {/* Pricing Section */}
          <View style={styles.pricingSection}>
            <View style={styles.pricingColumn}>
              {product.has_discount && (
                <Text style={styles.oldPriceAbsolute}>
                  {parseFloat(product.price).toFixed(2)} {currencySymbol}
                </Text>
              )}
              <View style={styles.currentPriceRow}>
                <Text style={[styles.currencySymbol, { color: primaryColor }]}>
                  {currencySymbol}
                </Text>
                <Text
                  style={[styles.currentPriceNumber, { color: primaryColor }]}
                >
                  {parseFloat(finalPrice).toFixed(2)}
                </Text>
              </View>
            </View>

            {cartQty === 0 && (
              <View style={styles.quantitySection}>
                <Text style={styles.sectionTitle}>الكمية</Text>
                <View style={styles.quantityContainer}>
                  <TouchableOpacity
                    style={styles.qtyButton}
                    onPress={handleDecrement}
                  >
                    <Ionicons name="remove" size={20} color="#64748b" />
                  </TouchableOpacity>
                  <Text style={styles.qtyText}>{quantity}</Text>
                  <TouchableOpacity
                    style={styles.qtyButton}
                    onPress={handleIncrement}
                  >
                    <Ionicons name="add" size={20} color="#0f172a" />
                  </TouchableOpacity>
                </View>
              </View>
            )}
          </View>

          {/* Divider */}
          <View style={styles.divider} />

          {/* Supplier Premium Card */}
          {product.supplier && (
            <TouchableOpacity
              style={styles.supplierCard}
              onPress={() =>
                navigation.navigate("Products", {
                  storeId: product.supplier.store_id,
                })
              }
              activeOpacity={0.7}
            >
              <Image
                source={
                  product.supplier.profile_picture
                    ? { uri: product.supplier.profile_picture }
                    : require("../../assets/images/logo.png")
                }
                style={styles.supplierAvatar}
              />
              <View style={styles.supplierInfo}>
                <Text style={styles.supplierNameLabel}>يباع بواسطة متجر</Text>
                <Text style={styles.supplierName}>{product.supplier.name}</Text>
              </View>
              <View style={styles.supplierArrow}>
                <Ionicons name="chevron-back" size={20} color="#94a3b8" />
              </View>
            </TouchableOpacity>
          )}

          {/* Variations / Attributes Selection */}
          {product.attributes && product.attributes.length > 0 && (
            <View style={styles.variationsSection}>
              {(product.attributes || []).map((attr) => {
                const isError = validationErrorIds.includes(attr.id);
                return (
                  <View 
                    key={attr.id} 
                    ref={el => attributeRefs.current[attr.id] = el}
                    style={[styles.attributeContainer, isError && styles.errorAttributeContainer]}
                  >
                    <View style={styles.attributeTitleRow}>
                      <Text style={[styles.attributeTitle, isError && { color: "#ef4444" }]}>{attr.name}</Text>
                      <Text style={isError ? styles.requiredTextError : styles.requiredText}>(مطلوب)</Text>
                    </View>
                    <View style={styles.optionsRow}>
                      {(attr.options || []).map((opt) => {
                        const isSelected = selectedOptions[attr.id] === opt.id;
                        const hasModifier = parseFloat(opt.price_modifier) !== 0;
                        return (
                          <TouchableOpacity
                            key={opt.id}
                            style={[
                              styles.optionChip,
                              isSelected && { borderColor: primaryColor, backgroundColor: primaryColor + "08" },
                              isError && !isSelected && { borderColor: "#fecaca" }
                            ]}
                            onPress={() => {
                              setSelectedOptions(prev => ({ ...prev, [attr.id]: opt.id }));
                              setValidationErrorIds(prev => prev.filter(id => id !== attr.id));
                              // Reset quantity when shifting between variants for a cleaner UI
                              if (selectedOptions[attr.id] !== opt.id) {
                                setQuantity(1);
                              }
                            }}
                          >
                            <Text style={[styles.optionText, isSelected && { color: primaryColor, fontWeight: "bold" }]}>
                              {opt.value}
                            </Text>
                            {hasModifier && (
                              <Text style={[styles.modifierText, isSelected && { color: primaryColor }]}>
                                {parseFloat(opt.price_modifier) > 0 ? "+" : ""}{parseFloat(opt.price_modifier).toFixed(0)}
                              </Text>
                            )}
                          </TouchableOpacity>
                        );
                      })}
                    </View>
                  </View>
                );
              })}
              <View style={styles.divider} />
            </View>
          )}

          {/* Specifications / Highlights */}
          <View style={styles.highlightsContainer}>
            <View style={styles.highlightItem}>
              <View
                style={[
                  styles.highlightIconBg,
                  { backgroundColor: primaryColor + "15" },
                ]}
              >
                <Feather name="shield" size={18} color={primaryColor} />
              </View>
              <Text style={styles.highlightText}>منتج أصلي 100%</Text>
            </View>
            <View style={styles.highlightItem}>
              <View
                style={[
                  styles.highlightIconBg,
                  { backgroundColor: primaryColor + "15" },
                ]}
              >
                <Feather name="truck" size={18} color={primaryColor} />
              </View>
              <Text style={styles.highlightText}>توصيل سريع</Text>
            </View>
            <View style={styles.highlightItem}>
              <View
                style={[
                  styles.highlightIconBg,
                  { backgroundColor: primaryColor + "15" },
                ]}
              >
                <Feather name="refresh-ccw" size={18} color={primaryColor} />
              </View>
              <Text style={styles.highlightText}>إرجاع خلال 14 يوم</Text>
            </View>
          </View>

          {/* Description */}
          {product.description && (
            <View style={styles.descriptionSection}>
              <Text style={styles.sectionTitle}>نظرة عامة على المنتج</Text>
              <Text style={styles.descriptionText}>{product.description}</Text>
            </View>
          )}

          {/* Spacer for bottom bar */}
          <View style={{ height: 100 }} />
        </View>
      </Animated.ScrollView>

      {/* Sticky Bottom Bar */}
      <View style={styles.bottomBar}>
        <View style={styles.totalContainer}>
          <Text style={styles.totalLabel}>{isSelectionComplete ? "السعر الإجمالي" : "يبدأ من"}</Text>
          <View style={{ flexDirection: "row", alignItems: "baseline" }}>
            <Text style={styles.currentPriceNumber}>
              {cartQty > 0
                ? (parseFloat(finalPrice) * cartQty).toFixed(2)
                : (isSelectionComplete ? totalPrice : parseFloat(basePrice).toFixed(2))}
            </Text>
            <Text style={styles.currencySymbol}>{currencySymbol}</Text>
          </View>
        </View>

        {cartQty > 0 ? (
          <View
            style={[
              styles.interactiveCartContainer,
              { borderColor: primaryColor },
            ]}
          >
            <TouchableOpacity
              style={[
                styles.interactiveQtyButton,
                { backgroundColor: primaryColor + "15" },
              ]}
              onPress={() => handleUpdateQuantity(-1)}
              disabled={addingToCart}
            >
              <Ionicons name="remove" size={24} color={primaryColor} />
            </TouchableOpacity>

            <Text style={[styles.interactiveQtyText, { color: primaryColor }]}>
              {cartQty}
            </Text>

            <TouchableOpacity
              style={[
                styles.interactiveQtyButton,
                { backgroundColor: primaryColor },
              ]}
              onPress={() => handleUpdateQuantity(1)}
              disabled={addingToCart}
            >
              <Ionicons name="add" size={24} color="#fff" />
            </TouchableOpacity>
          </View>
        ) : (
          <TouchableOpacity
            style={[
              styles.addToCartBtn,
              { backgroundColor: primaryColor },
              addingToCart && { opacity: 0.7 },
            ]}
            onPress={() => handleUpdateQuantity(0, false)}
            disabled={addingToCart}
          >
            {addingToCart ? (
              <ActivityIndicator color="#fff" size="small" />
            ) : (
              <>
                <Ionicons
                  name={isSelectionComplete ? "cart" : "list"}
                  size={20}
                  color="#fff"
                  style={{ marginRight: 8 }}
                />
                <Text style={styles.addToCartText}>
                  {isSelectionComplete ? `إضافة ${totalPrice} ${currencySymbol} للسلة` : "اختر الخيارات"}
                </Text>
              </>
            )}
          </TouchableOpacity>
        )}
      </View>

      {/* Auth Modal for Guests */}
      <AuthModal
        visible={authModalVisible}
        onClose={() => setAuthModalVisible(false)}
        onSuccess={(loggedInUser) => {
          fetchCartQty();
        }}
      />
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
    backgroundColor: "#fff",
  },
  errorText: {
    fontSize: 18,
    color: "#64748b",
    marginTop: 16,
    fontFamily: "System",
  },
  backButtonEmpty: {
    marginTop: 20,
    paddingHorizontal: 24,
    paddingVertical: 12,
    backgroundColor: "#2B5876",
    borderRadius: 8,
  },
  backButtonTextEmpty: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "bold",
  },
  floatingHeader: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    zIndex: 100,
    flexDirection: "row",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingTop: StatusBar.currentHeight + 10 || 50,
  },
  rightHeaderActions: {
    flexDirection: "row",
  },
  iconButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: "rgba(255, 255, 255, 0.85)",
    justifyContent: "center",
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  scrollView: {
    flex: 1,
  },

  // ── Gallery ──────────────────────────────────────────────────────
  heroContainer: {
    width: width,
    height: HERO_HEIGHT,
    backgroundColor: "#fff",
    position: "relative",
    overflow: "hidden",
  },
  slideContainer: {
    width: width,
    height: HERO_HEIGHT,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#fff",
  },
  heroImage: {
    width: "100%",
    height: "100%",
    resizeMode: "cover",
  },
  heroVideo: {
    width: "100%",
    height: "100%",
  },
  videoBadge: {
    position: "absolute",
    bottom: 60,
    left: 20,
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(0,0,0,0.55)",
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 20,
    gap: 4,
  },
  videoBadgeText: {
    color: "#fff",
    fontSize: 12,
    fontWeight: "600",
  },
  dotRow: {
    position: "absolute",
    bottom: 14,
    left: 0,
    right: 0,
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    gap: 6,
  },
  dot: {
    borderRadius: 5,
  },
  dotActive: {
    width: 20,
    height: 7,
  },
  dotInactive: {
    width: 7,
    height: 7,
    backgroundColor: "rgba(255,255,255,0.5)",
  },
  dotVideo: {
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.8)",
  },
  counterBadge: {
    position: "absolute",
    top: StatusBar.currentHeight + 60 || 100,
    right: 16,
    backgroundColor: "rgba(0,0,0,0.45)",
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  counterText: {
    color: "#fff",
    fontSize: 12,
    fontWeight: "600",
  },
  premiumDiscountBadge: {
    position: "absolute",
    bottom: 40,
    right: 20,
    backgroundColor: "#ef4444",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    shadowColor: "#ef4444",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  premiumDiscountText: {
    color: "#fff",
    fontSize: 14,
    fontWeight: "900",
    letterSpacing: 0.5,
  },

  // ── Content ────────────────────────────────────────────────────
  contentContainer: {
    backgroundColor: "#fff",
    borderTopLeftRadius: 32,
    borderTopRightRadius: 32,
    marginTop: -30,
    paddingHorizontal: 24,
    paddingTop: 32,
    minHeight: height * 0.6,
  },
  headerSection: {
    marginBottom: 20,
  },
  categoryRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 8,
  },
  categoryText: {
    fontSize: 14,
    color: "#3b82f6",
    fontWeight: "600",
    backgroundColor: "#eff6ff",
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 6,
  },
  ratingMock: {
    flexDirection: "row",
    alignItems: "center",
  },
  ratingText: {
    fontSize: 13,
    color: "#64748b",
    fontWeight: "500",
    marginLeft: 4,
  },
  productTitle: {
    fontSize: 24,
    fontWeight: "900",
    color: "#0f172a",
    lineHeight: 32,
    textAlign: "left",
  },
  pricingSection: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-end",
    marginBottom: 24,
  },
  pricingColumn: {
    flex: 1,
  },
  oldPriceAbsolute: {
    fontSize: 15,
    color: "#94a3b8",
    textDecorationLine: "line-through",
    marginBottom: 2,
    textAlign: "left",
  },
  currentPriceRow: {
    flexDirection: "row",
    alignItems: "flex-start",
  },
  currencySymbol: {
    fontSize: 16,
    fontWeight: "bold",
    color: "#2B5876",
    marginTop: 4,
    marginRight: 4,
  },
  currentPriceNumber: {
    fontSize: 32,
    fontWeight: "900",
    color: "#2B5876",
    letterSpacing: -0.5,
  },
  quantitySection: {},
  quantityContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#f8fafc",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#e2e8f0",
    padding: 4,
  },
  qtyButton: {
    width: 36,
    height: 36,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#fff",
    borderRadius: 10,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  qtyText: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#0f172a",
    marginHorizontal: 16,
    minWidth: 20,
    textAlign: "center",
  },
  divider: {
    height: 1,
    backgroundColor: "#f1f5f9",
    marginBottom: 24,
  },
  supplierCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#f8fafc",
    padding: 16,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#e2e8f0",
    marginBottom: 24,
  },
  supplierAvatar: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: "#fff",
    borderWidth: 2,
    borderColor: "#fff",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    marginRight: 16,
  },
  supplierInfo: {
    flex: 1,
  },
  supplierNameLabel: {
    fontSize: 12,
    color: "#64748b",
    fontWeight: "500",
    marginBottom: 4,
    textAlign: "left",
  },
  supplierName: {
    fontSize: 16,
    fontWeight: "bold",
    color: "#0f172a",
    textAlign: "left",
  },
  supplierArrow: {
    width: 32,
    height: 32,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#e2e8f0",
    borderRadius: 16,
  },
  highlightsContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 28,
    backgroundColor: "#fff",
  },
  highlightItem: {
    alignItems: "center",
    flex: 1,
  },
  highlightIconBg: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: "#f0f9ff",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 8,
  },
  highlightText: {
    fontSize: 11,
    fontWeight: "600",
    color: "#475569",
    textAlign: "center",
  },
  descriptionSection: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#0f172a",
    marginBottom: 12,
    textAlign: "left",
  },
  descriptionText: {
    fontSize: 15,
    color: "#475569",
    lineHeight: 26,
    textAlign: "left",
  },

  // ── Bottom Bar ─────────────────────────────────────────────────
  bottomBar: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: "#fff",
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 24,
    paddingTop: 16,
    paddingBottom: 28,
    borderTopWidth: 1,
    borderTopColor: "#f1f5f9",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.05,
    shadowRadius: 10,
    elevation: 10,
  },
  totalContainer: {
    flex: 1,
  },
  totalLabel: {
    fontSize: 12,
    color: "#64748b",
    fontWeight: "500",
    marginBottom: 4,
    textAlign: "left",
  },
  variationsSection: {
    marginBottom: 8,
  },
  attributeContainer: {
    marginBottom: 20,
  },
  attributeTitle: {
    fontSize: 16,
    fontWeight: "bold",
    color: "#1e293b",
    textAlign: "left",
  },
  attributeTitleRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
  },
  requiredText: {
    fontSize: 12,
    color: "#94a3b8",
  },
  requiredTextError: {
    fontSize: 12,
    color: "#ef4444",
    fontWeight: "bold",
  },
  errorAttributeContainer: {
    backgroundColor: "#fff5f5",
    padding: 8,
    borderRadius: 12,
    marginHorizontal: -8,
  },
  optionsRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
  },
  optionChip: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: "#e2e8f0",
    backgroundColor: "#fff",
    minWidth: 60,
    alignItems: "center",
    justifyContent: "center",
  },
  optionText: {
    fontSize: 14,
    color: "#475569",
  },
  modifierText: {
    fontSize: 10,
    color: "#94a3b8",
    marginTop: 2,
  },
  addToCartBtn: {
    backgroundColor: "#2B5876",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 24,
    paddingVertical: 14,
    borderRadius: 14,
    shadowColor: "#2B5876",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  },
  addToCartText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "bold",
  },
  interactiveCartContainer: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    borderWidth: 2,
    borderRadius: 14,
    height: 52,
    width: 140,
    overflow: "hidden",
  },
  interactiveQtyButton: {
    flex: 1,
    height: "100%",
    justifyContent: "center",
    alignItems: "center",
  },
  interactiveQtyText: {
    fontSize: 18,
    fontWeight: "bold",
    paddingHorizontal: 8,
  },
});
