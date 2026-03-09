import React, { useState, useEffect, useContext } from "react";
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  TextInput,
  Image,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import client from "../api/client";
import { AuthContext } from "../context/AuthContext";
import CustomHeader from "../components/CustomHeader";

export default function HomeScreen({ navigation }) {
  const [homeData, setHomeData] = useState({
    categories: [],
    supplier_ads: [],
    platform_ads: [],
    producing_families: [],
    all_suppliers: [],
  });
  const [loading, setLoading] = useState(true);
  const { logout, user } = useContext(AuthContext);
  const [activeFilter, setActiveFilter] = useState("الكل");

  useEffect(() => {
    fetchHomeData();
  }, []);

  const fetchHomeData = async () => {
    try {
      const response = await client.get("/home/");
      if (response.data.success) {
        setHomeData(response.data);
      }
    } catch (error) {
      console.error("Error fetching home data", error);
    } finally {
      setLoading(false);
    }
  };

  // Filter the All Stores list based on selected category pill
  const filteredSuppliers =
    activeFilter === "الكل"
      ? homeData.all_suppliers
      : homeData.all_suppliers.filter(
          (supplier) =>
            supplier.category &&
            supplier.category.some((cat) => cat.name === activeFilter),
        );

  const renderStoreItem = ({ item }) => (
    <View style={styles.cardContainer}>
      <View style={styles.card}>
        {/* Cover Image */}
        <View style={styles.coverImageContainer}>
          {item.panal_picture ? (
            <Image
              source={{ uri: item.panal_picture }}
              style={styles.coverImage}
              resizeMode="cover"
            />
          ) : (
            <View style={styles.coverImagePlaceholder} />
          )}
        </View>

        {/* Circular Logo overlapping the cover */}
        <View style={styles.logoWrapper}>
          <View style={styles.storeLogoCircle}>
            <Image
              source={
                item.profile_picture
                  ? { uri: item.profile_picture }
                  : require("../../assets/images/logo.png")
              }
              style={
                item.profile_picture
                  ? styles.storeLogoImage
                  : styles.placeholderLogo
              }
              resizeMode={item.profile_picture ? "cover" : "contain"}
            />
          </View>
        </View>

        {/* Store Info */}
        <View style={styles.storeInfoContainer}>
          <Text style={styles.storeName} numberOfLines={1}>
            {item.name}
          </Text>

          <View style={styles.locationRow}>
            <Text style={styles.locationText}>صنعاء, اليمن</Text>
            <Ionicons name="location" size={12} color="#D48231" />
          </View>

          <View style={styles.badgeContainer}>
            <Text style={styles.storeTypeBadge}>
              {item.category && item.category.length > 0
                ? item.category.map((c) => c.name).join("، ")
                : item.is_factory
                  ? "مصنع"
                  : "تاجر جملة"}
            </Text>
          </View>

          {/* Bottom Row: Rating + Visit Button */}
          <View style={styles.cardBottomRow}>
            <TouchableOpacity
              style={styles.visitButton}
              onPress={() =>
                navigation.navigate("Products", { storeId: item.store_id })
              }
            >
              <Text style={styles.visitButtonText}>زيارة المتجر</Text>
              <Ionicons
                name="arrow-back"
                size={14}
                color="#fff"
                style={{ marginLeft: 4 }}
              />
            </TouchableOpacity>

            <View style={styles.ratingContainer}>
              <Text style={styles.ratingText}>5.0</Text>
              <Ionicons name="star" size={14} color="#FFC107" />
            </View>
          </View>
        </View>
      </View>
    </View>
  );

  const renderProducingFamilyItem = ({ item }) => (
    <TouchableOpacity
      style={styles.familyCard}
      onPress={() =>
        navigation.navigate("Products", { storeId: item.store_id })
      }
    >
      <View style={styles.familyLogoContainer}>
        <Image
          source={
            item.profile_picture
              ? { uri: item.profile_picture }
              : require("../../assets/images/logo.png")
          }
          style={
            item.profile_picture
              ? styles.familyLogoImage
              : styles.placeholderLogo
          }
          resizeMode={item.profile_picture ? "cover" : "contain"}
        />
      </View>
      <Text style={styles.familyName} numberOfLines={1}>
        {item.name}
      </Text>
      <View style={styles.familyBadge}>
        <Text style={styles.familyBadgeText}>أسرة منتجة</Text>
      </View>
    </TouchableOpacity>
  );

  const renderPlatformAdItem = ({ item }) => {
    const product = item.product;
    if (!product) return null;

    return (
      <TouchableOpacity
        style={styles.offerCard}
        onPress={() =>
          navigation.navigate("ProductDetails", { productId: product.id })
        }
      >
        <View style={styles.offerImageContainer}>
          <Image source={{ uri: product.image }} style={styles.offerImage} />
          {product.has_discount && (
            <View style={styles.discountBadge}>
              <Text style={styles.discountBadgeText}>
                {product.discount_percentage}% OFF
              </Text>
            </View>
          )}
        </View>
        <View style={styles.offerInfoContainer}>
          <View style={styles.offerHeaderRow}>
            <View style={styles.offerSupplierLogoContainer}>
              <Image
                source={
                  product.supplier?.profile_picture
                    ? { uri: product.supplier.profile_picture }
                    : require("../../assets/images/logo.png")
                }
                style={styles.offerSupplierLogo}
              />
            </View>
            <Text
              style={[styles.offerProductName, { flex: 1 }]}
              numberOfLines={2}
            >
              {product.name}
            </Text>
          </View>
          <View style={styles.priceContainer}>
            {product.has_discount ? (
              <>
                <Text style={styles.newPrice}>
                  {parseFloat(product.price_after_discount).toFixed(2)}{" "}
                  {product.supplier?.currency?.symbol || "$"}
                </Text>
                <Text style={styles.oldPrice}>
                  {parseFloat(product.price).toFixed(2)}{" "}
                  {product.supplier?.currency?.symbol || "$"}
                </Text>
              </>
            ) : (
              <Text style={styles.newPrice}>
                {parseFloat(product.price).toFixed(2)}{" "}
                {product.supplier?.currency?.symbol || "$"}
              </Text>
            )}
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  const renderHeader = () => (
    <View style={styles.listHeaderContainer}>
      {/* Search Bar */}
      <View style={styles.searchContainer}>
        <Ionicons
          name="search"
          size={20}
          color="#888"
          style={styles.searchIcon}
        />
        <TextInput
          style={styles.searchInput}
          placeholder="...ابحث عن متجر أو تصنيف"
          placeholderTextColor="#aaa"
          textAlign="left"
        />
      </View>

      {/* Supplier Ads Carousel */}
      {homeData.supplier_ads && homeData.supplier_ads.length > 0 && (
        <View style={styles.sectionContainer}>
          <Text style={styles.sectionTitle}>إعلانات المتاجر</Text>
          <FlatList
            horizontal
            showsHorizontalScrollIndicator={false}
            data={homeData.supplier_ads}
            keyExtractor={(item) => item.id.toString()}
            renderItem={({ item }) => (
              <TouchableOpacity style={styles.adCard}>
                <Image source={{ uri: item.image }} style={styles.adImage} />
              </TouchableOpacity>
            )}
            contentContainerStyle={styles.horizontalList}
          />
        </View>
      )}

      {/* Platform Ads (Exclusive Offers) Carousel */}
      {homeData.platform_ads.length > 0 && (
        <View style={[styles.sectionContainer, { marginTop: 10 }]}>
          <Text style={styles.sectionTitle}>عروض حصرية</Text>
          <FlatList
            horizontal
            showsHorizontalScrollIndicator={false}
            data={homeData.platform_ads}
            keyExtractor={(item) => item.id.toString()}
            renderItem={renderPlatformAdItem}
            contentContainerStyle={styles.horizontalList}
          />
        </View>
      )}

      {/* Categories Pills */}
      <View style={styles.sectionContainer}>
        <FlatList
          horizontal
          showsHorizontalScrollIndicator={false}
          data={[{ id: "all", name: "الكل" }, ...homeData.categories]}
          keyExtractor={(item) => item.id.toString()}
          contentContainerStyle={styles.filtersContainer}
          renderItem={({ item }) => {
            const isSelected = activeFilter === item.name;
            return (
              <TouchableOpacity
                style={[
                  styles.filterPill,
                  isSelected && styles.activeFilterPill,
                ]}
                onPress={() => setActiveFilter(item.name)}
              >
                {item.id === "all" && (
                  <Ionicons
                    name="grid"
                    size={14}
                    color={isSelected ? "#fff" : "#2B5876"}
                    style={{ marginRight: 4 }}
                  />
                )}
                <Text
                  style={[
                    styles.filterText,
                    isSelected && styles.activeFilterText,
                  ]}
                >
                  {item.name}
                </Text>
              </TouchableOpacity>
            );
          }}
        />
      </View>

      {/* General Stores Header */}
      <View
        style={[
          styles.sectionHeaderRow,
          { marginTop: 16, paddingHorizontal: 4 },
        ]}
      >
        <Text style={styles.sectionTitle}>كافة المتاجر</Text>
        <View style={styles.sectionTitleAccent} />
      </View>
    </View>
  );

  const renderFooter = () => {
    if (
      !homeData.producing_families ||
      homeData.producing_families.length === 0
    ) {
      return null;
    }
    return (
      <View
        style={[
          styles.sectionContainer,
          { marginTop: 20, marginBottom: 30, paddingHorizontal: 16 },
        ]}
      >
        <View style={styles.sectionHeaderRow}>
          <Text style={styles.sectionTitle}>متاجر الأسر المنتجة</Text>
          <View style={styles.sectionTitleAccent} />
        </View>
        <FlatList
          horizontal
          showsHorizontalScrollIndicator={false}
          data={homeData.producing_families}
          keyExtractor={(item) => `family-${item.id}`}
          renderItem={renderProducingFamilyItem}
          contentContainerStyle={styles.horizontalList}
        />
      </View>
    );
  };

  if (loading) {
    return (
      <View style={styles.centerMode}>
        <ActivityIndicator size="large" color="#2B5876" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <CustomHeader onMenuPress={() => console.log("Menu pressed")} />

      <FlatList
        data={filteredSuppliers}
        keyExtractor={(item) => item.id.toString()}
        renderItem={renderStoreItem}
        numColumns={2}
        ListHeaderComponent={renderHeader}
        ListFooterComponent={renderFooter}
        contentContainerStyle={styles.mainScroll}
        ListEmptyComponent={
          <Text style={styles.emptyText}>لا توجد متاجر متاحة حالياً.</Text>
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f9fafd",
  },
  centerMode: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  mainScroll: {
    paddingBottom: 20,
  },
  listHeaderContainer: {
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 8,
  },
  searchContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#fff",
    borderRadius: 12,
    paddingHorizontal: 16,
    height: 50,
    borderWidth: 1,
    borderColor: "#eee",
    marginBottom: 16,
  },
  searchIcon: {
    marginLeft: 8,
  },
  searchInput: {
    flex: 1,
    height: "100%",
    fontFamily: "System", // Typically you'd use Cairo or Tajawal here if loaded
    fontSize: 14,
  },
  filtersContainer: {
    paddingBottom: 16,
  },
  filterPill: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#fff",
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    marginLeft: 8,
    borderWidth: 1,
    borderColor: "#eee",
  },
  activeFilterPill: {
    backgroundColor: "#2B5876",
    borderColor: "#2B5876",
  },
  filterText: {
    fontSize: 12,
    fontWeight: "600",
    color: "#2B5876",
  },
  activeFilterText: {
    color: "#fff",
  },
  cardContainer: {
    flex: 1,
    padding: 8,
    maxWidth: "50%",
  },
  card: {
    backgroundColor: "#fff",
    borderRadius: 16,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: "#f0f0f0",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  coverImageContainer: {
    height: 80,
    backgroundColor: "#f2e8e3", // soft peach from the screenshot
  },
  coverImagePlaceholder: {
    flex: 1,
  },
  logoWrapper: {
    alignItems: "center",
    marginTop: -25, // pull up to overlap
  },
  storeLogoCircle: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: "#fff",
    justifyContent: "center",
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 3,
    borderWidth: 2,
    borderColor: "#fff",
    overflow: "hidden",
  },
  storeLogoImage: {
    width: "100%",
    height: "100%",
  },
  placeholderLogo: {
    width: 35,
    height: 35,
  },
  coverImage: {
    width: "100%",
    height: "100%",
  },
  storeInfoContainer: {
    padding: 12,
    alignItems: "center",
  },
  storeName: {
    fontSize: 14,
    fontWeight: "bold",
    color: "#1e293b",
    marginBottom: 4,
  },
  locationRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 8,
  },
  locationText: {
    fontSize: 11,
    color: "#94a3b8",
    marginRight: 4,
  },
  badgeContainer: {
    backgroundColor: "#f8fafc",
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    marginBottom: 12,
  },
  storeTypeBadge: {
    fontSize: 10,
    color: "#475569",
    fontWeight: "600",
  },
  cardBottomRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    width: "100%",
    marginTop: 4,
  },
  visitButton: {
    flexDirection: "row",
    backgroundColor: "#2B5876",
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    alignItems: "center",
  },
  visitButtonText: {
    color: "#fff",
    fontSize: 11,
    fontWeight: "bold",
  },
  ratingContainer: {
    flexDirection: "row",
    alignItems: "center",
  },
  ratingText: {
    fontSize: 12,
    fontWeight: "bold",
    color: "#1e293b",
    marginRight: 4,
  },
  emptyText: {
    textAlign: "center",
    marginTop: 40,
    color: "#94a3b8",
  },
  sectionContainer: {
    marginBottom: 16,
  },
  sectionHeaderRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 12,
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
    backgroundColor: "#D48231",
    marginRight: 8,
    borderRadius: 2,
  },
  horizontalList: {
    paddingVertical: 4,
  },
  adCard: {
    width: 300,
    height: 140,
    borderRadius: 16,
    overflow: "hidden",
    marginLeft: 12,
    backgroundColor: "#eee",
  },
  adImage: {
    width: "100%",
    height: "100%",
    resizeMode: "cover",
  },
  offerCard: {
    width: 160,
    backgroundColor: "#fff",
    borderRadius: 12,
    overflow: "hidden",
    marginLeft: 12,
    borderWidth: 1,
    borderColor: "#f0f0f0",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  offerImageContainer: {
    height: 120,
    width: "100%",
    position: "relative",
    backgroundColor: "#f8fafc",
  },
  offerImage: {
    width: "100%",
    height: "100%",
    resizeMode: "cover",
  },
  discountBadge: {
    position: "absolute",
    top: 8,
    left: 8,
    backgroundColor: "#ef4444",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  discountBadgeText: {
    color: "#fff",
    fontSize: 10,
    fontWeight: "bold",
  },
  offerInfoContainer: {
    padding: 10,
  },
  offerProductName: {
    fontSize: 12,
    fontWeight: "600",
    color: "#1e293b",
    textAlign: "left",
    height: 34, // roughly 2 lines
  },
  offerHeaderRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    marginBottom: 6,
  },
  offerSupplierLogoContainer: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: "#f8fafc",
    marginRight: 6,
    borderWidth: 1,
    borderColor: "#e2e8f0",
    overflow: "hidden",
    justifyContent: "center",
    alignItems: "center",
    marginTop: 2,
  },
  offerSupplierLogo: {
    width: "100%",
    height: "100%",
    resizeMode: "cover",
  },
  priceContainer: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "flex-start",
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
  familyCard: {
    width: 140,
    backgroundColor: "#fff",
    borderRadius: 16,
    padding: 12,
    alignItems: "center",
    marginHorizontal: 8,
    borderWidth: 1,
    borderColor: "#f0f0f0",
    shadowColor: "#D48231",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 6,
    elevation: 3,
  },
  familyLogoContainer: {
    width: 70,
    height: 70,
    borderRadius: 35,
    backgroundColor: "#f8fafc",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 10,
    borderWidth: 2,
    borderColor: "#D48231",
    overflow: "hidden",
  },
  familyLogoImage: {
    width: "100%",
    height: "100%",
  },
  familyName: {
    fontSize: 13,
    fontWeight: "bold",
    color: "#2B5876",
    textAlign: "center",
    marginBottom: 8,
  },
  familyBadge: {
    backgroundColor: "#e0f2fe",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  familyBadgeText: {
    fontSize: 10,
    color: "#0284c7",
    fontWeight: "bold",
  },
});
