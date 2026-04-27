import React, { useState, useEffect, useContext, useMemo } from "react";
import { View, FlatList, TouchableOpacity, StyleSheet, ActivityIndicator, Image, Dimensions, RefreshControl } from 'react-native';
import { Ionicons, Feather, MaterialCommunityIcons } from "@expo/vector-icons";
import { LinearGradient } from 'expo-linear-gradient';
import client from "../api/client";
import { AuthContext } from "../context/AuthContext";
import CustomHeader from "../components/CustomHeader";
import MerchantCardStack from "../components/MerchantCardStack";
import { BRAND } from "../theme/brand";
import Text from '../components/AppText';
import TextInput from '../components/AppTextInput';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

export default function HomeScreen({ navigation }) {
  const [homeData, setHomeData] = useState({
    categories: [],
    supplier_ads: [],
    platform_ads: [],
    producing_families: [],
    all_suppliers: [],
  });
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const { user } = useContext(AuthContext);
  const [activeFilter, setActiveFilter] = useState("الكل");

  useEffect(() => {
    fetchHomeData();
  }, []);

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchHomeData();
    setRefreshing(false);
  };

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

  const filteredSuppliers = useMemo(() => {
    return activeFilter === "الكل"
      ? homeData.all_suppliers
      : homeData.all_suppliers.filter(
          (supplier) =>
            supplier.category &&
            supplier.category.some((cat) => cat.name === activeFilter),
        );
  }, [activeFilter, homeData.all_suppliers]);

  const renderProducingFamilyItem = ({ item }) => (
    <TouchableOpacity
      style={styles.familyCard}
      onPress={() => navigation.navigate("Products", { storeId: item.store_id })}
    >
      <View style={styles.familyLogoContainer}>
        <Image
          source={item.profile_picture ? { uri: item.profile_picture } : require("../../assets/images/logo.png")}
          style={item.profile_picture ? styles.familyLogoImage : styles.placeholderLogo}
          resizeMode={item.profile_picture ? "cover" : "contain"}
        />
      </View>
      <Text style={styles.familyName} numberOfLines={1}>{item.name}</Text>
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
        activeOpacity={0.9}
        style={styles.enhancedOfferCard}
        onPress={() => navigation.navigate("ProductDetails", { productId: product.id })}
      >
        {/* Product Image Section */}
        <View style={styles.offerImageFrame}>
          <Image source={{ uri: product.image }} style={styles.offerImageFull} />
          
          {/* Floating Merchant Logo for Context */}
          <View style={styles.offerMerchantFloating}>
            <Image 
              source={product.supplier?.profile_picture ? { uri: product.supplier.profile_picture } : require("../../assets/images/logo.png")} 
              style={styles.offerMerchantImg}
            />
          </View>

          {/* Creative Slanted Discount Badge */}
          {product.has_discount && (
            <View style={styles.slantedBadge}>
              <LinearGradient 
                colors={['#FF3366', '#FF5E3A']} 
                start={{x:0, y:0}} end={{x:1, y:1}}
                style={styles.slantedGradient}
              >
                <Text style={styles.slantedText}>-{product.discount_percentage}%</Text>
              </LinearGradient>
            </View>
          )}
        </View>

        {/* Product Info Section */}
        <View style={styles.offerDetailBox}>
          <Text style={styles.offerNameLabel} numberOfLines={1}>{product.name}</Text>
          <View style={styles.offerPriceRow}>
            <Text style={styles.offerPriceValue}>
              {parseFloat(product.price_after_discount || product.price).toFixed(0)}
              <Text style={styles.offerCurrency}> ر.ي</Text>
            </Text>
            {product.has_discount && (
              <Text style={styles.offerOldPrice}>
                {parseFloat(product.price).toFixed(0)}
              </Text>
            )}
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  const renderHeader = () => (
    <View style={styles.listHeaderContainer}>
      {/* 1. Creative Hero Ads Section */}
      {homeData.supplier_ads && homeData.supplier_ads.length > 0 && (
        <View style={styles.heroSection}>
          <FlatList
            horizontal
            pagingEnabled
            showsHorizontalScrollIndicator={false}
            data={homeData.supplier_ads}
            keyExtractor={(item) => `ad-${item.id}`}
            renderItem={({ item }) => (
              <TouchableOpacity activeOpacity={0.95} style={styles.heroAdWrapper}>
                <Image source={{ uri: item.image }} style={styles.heroAdImage} />
                <LinearGradient
                  colors={['transparent', 'rgba(0,0,0,0.6)']}
                  style={StyleSheet.absoluteFill}
                />
              </TouchableOpacity>
            )}
          />
        </View>
      )}

      {/* 2. Glassmorphic CTA Banner */}
      <View style={styles.ctaWrapper}>
        <TouchableOpacity 
          activeOpacity={0.9} 
          style={styles.glassCta}
          onPress={() => navigation.navigate('MerchantRegistration')}
        >
          <LinearGradient
            colors={[BRAND.colors.primary, BRAND.colors.slate[900]]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.ctaGradient}
          >
            <View style={styles.ctaTextGroup}>
              <Text style={styles.ctaMainText}>انضم لنخبة التجار</Text>
              <Text style={styles.ctaSubText}>عروض حصرية ووصول أوسع</Text>
            </View>
            <View style={styles.ctaCircle}>
              <Feather name="trending-up" size={20} color="#fff" />
            </View>
          </LinearGradient>
        </TouchableOpacity>
      </View>

      {/* 3. Modern horizontal Offers */}
      {homeData.platform_ads.length > 0 && (
        <View style={styles.sectionContainer}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>أقوى العروض</Text>
            <TouchableOpacity><Text style={styles.seeAllText}>عرض الكل</Text></TouchableOpacity>
          </View>
          <FlatList
            horizontal
            showsHorizontalScrollIndicator={false}
            data={homeData.platform_ads}
            keyExtractor={(item) => `offer-${item.id}`}
            renderItem={renderPlatformAdItem}
            contentContainerStyle={styles.horizontalScrollPadding}
          />
        </View>
      )}

      {/* 4. Visual Category Filters */}
      <View style={styles.categoriesSection}>
        <FlatList
          horizontal
          showsHorizontalScrollIndicator={false}
          data={[{ id: "all", name: "الكل", image: null }, ...homeData.categories]}
          keyExtractor={(item) => `cat-v2-${item.id}`}
          contentContainerStyle={styles.categoriesScroll}
          renderItem={({ item }) => {
            const isSelected = activeFilter === item.name;
            return (
              <TouchableOpacity
                onPress={() => setActiveFilter(item.name)}
                style={styles.categoryItem}
              >
                <View style={[
                  styles.categoryIconCircle,
                  isSelected && styles.activeCategoryCircle,
                  { borderColor: isSelected ? BRAND.colors.secondary : '#F1F5F9' }
                ]}>
                  {item.id === "all" ? (
                    <LinearGradient 
                      colors={isSelected ? [BRAND.colors.primary, BRAND.colors.slate[900]] : ['#F8FAFC', '#E2E8F0']}
                      style={styles.categoryImgContainer}
                    >
                      <Ionicons name="grid" size={20} color={isSelected ? "#fff" : BRAND.colors.primary} />
                    </LinearGradient>
                  ) : (
                    <View style={styles.categoryImgContainer}>
                      {item.image ? (
                        <Image source={{ uri: item.image }} style={styles.categoryImage} />
                      ) : (
                        <View style={[styles.categoryImage, { backgroundColor: BRAND.colors.slate[100], justifyContent: 'center', alignItems: 'center' }]}>
                           <MaterialCommunityIcons name="tag-outline" size={20} color={BRAND.colors.primary} />
                        </View>
                      )}
                    </View>
                  )}
                </View>
                <Text style={[
                  styles.categoryLabel,
                  isSelected && styles.activeCategoryLabel
                ]}>
                  {item.name}
                </Text>
              </TouchableOpacity>
            );
          }}
        />
      </View>

      {/* 5. The Discovery Orbit Title */}
      <View style={styles.discoveryHeader}>
         <View style={styles.discoveryLine} />
         <Text style={styles.discoveryTitle}>اكتشف عالم المتاجر</Text>
         <View style={styles.discoveryLine} />
      </View>

      <MerchantCardStack 
        merchants={filteredSuppliers} 
        onNavigate={(storeId) => navigation.navigate("Products", { storeId })}
      />
    </View>
  );

  const renderFooter = () => (
    homeData.producing_families?.length > 0 && (
      <View style={styles.footerSection}>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>الأسر المنتجة</Text>
        </View>
        <FlatList
          horizontal
          showsHorizontalScrollIndicator={false}
          data={homeData.producing_families}
          keyExtractor={(item) => `fam-${item.id}`}
          renderItem={renderProducingFamilyItem}
          contentContainerStyle={styles.horizontalScrollPadding}
        />
      </View>
    )
  );

  if (loading) {
    return (
      <View style={styles.centerMode}>
        <ActivityIndicator size="large" color={BRAND.colors.primary} />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <CustomHeader />
      <FlatList
        data={[]}
        renderItem={null}
        ListHeaderComponent={renderHeader}
        ListFooterComponent={renderFooter}
        contentContainerStyle={styles.mainContent}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            colors={[BRAND.colors.primary]}
            tintColor={BRAND.colors.primary}
          />
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F8FAFC' },
  centerMode: { flex: 1, justifyContent: "center", alignItems: "center" },
  mainContent: { paddingBottom: 40 },
  listHeaderContainer: { paddingTop: 10 },
  
  // Hero Section
  heroSection: { height: 200, marginBottom: 20 },
  heroAdWrapper: { width: SCREEN_WIDTH, height: '100%', paddingHorizontal: 15 },
  heroAdImage: { width: '100%', height: '100%', borderRadius: 24, resizeMode: 'cover' },
  
  // CTA Banner
  ctaWrapper: { paddingHorizontal: 15, marginBottom: 25 },
  glassCta: { borderRadius: 24, overflow: 'hidden', elevation: 8, shadowColor: '#000', shadowOffset: { width: 0, height: 10 }, shadowOpacity: 0.2, shadowRadius: 15 },
  ctaGradient: { flexDirection: 'row', alignItems: 'center', padding: 20, justifyContent: 'space-between' },
  ctaTextGroup: { flex: 1 },
  ctaMainText: { color: '#fff', fontSize: 18, marginBottom: 4, fontFamily: BRAND.typography.extraBold },
  ctaSubText: { color: 'rgba(255,255,255,0.7)', fontSize: 12, fontFamily: BRAND.typography.bold },
  ctaCircle: { width: 44, height: 44, borderRadius: 22, backgroundColor: 'rgba(255,255,255,0.2)', justifyContent: 'center', alignItems: 'center', borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)' },
  
  // Section Headers
  sectionContainer: { marginBottom: 25 },
  sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 20, marginBottom: 15 },
  sectionTitle: { fontSize: 20, color: BRAND.colors.primary, fontFamily: BRAND.typography.extraBold },
  seeAllText: { fontSize: 12, color: BRAND.colors.secondary, fontFamily: BRAND.typography.bold },
  
  // Glossy Glass Offers (Creative v2)
  enhancedOfferCard: {
    width: 170,
    backgroundColor: '#fff',
    borderRadius: 28,
    marginEnd: 18,
    elevation: 12,
    shadowColor: BRAND.colors.primary,
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.15,
    shadowRadius: 15,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.8)',
    zIndex: 50,
  },
  offerImageFrame: {
    height: 160,
    width: '100%',
    backgroundColor: '#F1F5F9',
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    overflow: 'hidden',
  },
  offerImageFull: {
    width: '100%',
    height: '100%',
    resizeMode: 'cover',
  },
  offerMerchantFloating: {
    position: 'absolute',
    top: 10,
    left: 10,
    width: 36,
    height: 36,
    borderRadius: 12,
    backgroundColor: 'rgba(255,255,255,0.9)',
    elevation: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    padding: 3,
    zIndex: 100,
    borderWidth: 1,
    borderColor: '#fff',
  },
  offerMerchantImg: {
    width: '100%',
    height: '100%',
    borderRadius: 10,
  },
  slantedBadge: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    backgroundColor: '#FF3366',
    borderTopLeftRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 6,
    zIndex: 60,
  },
  slantedText: {
    color: '#fff',
    fontSize: 12,
    fontFamily: BRAND.typography.extraBold,
  },
  offerDetailBox: {
    padding: 14,
    backgroundColor: '#fff',
    borderBottomLeftRadius: 28,
    borderBottomRightRadius: 28,
  },
  offerNameLabel: {
    fontSize: 14,
    color: BRAND.colors.slate[900],
    marginBottom: 8,
    fontFamily: BRAND.typography.bold,
  },
  offerPriceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  offerPriceValue: {
    fontSize: 18,
    color: BRAND.colors.primary,
    fontFamily: BRAND.typography.extraBold,
  },
  offerCurrency: {
    fontSize: 10,
    fontFamily: BRAND.typography.bold,
  },
  offerOldPrice: {
    fontSize: 11,
    color: BRAND.colors.slate[400],
    textDecorationLine: 'line-through',
    fontFamily: BRAND.typography.medium,
  },
  horizontalScrollPadding: {
    paddingHorizontal: 20,
    paddingVertical: 15,
  },
  
  // Visual Categories
  categoriesSection: {
    marginBottom: 25,
  },
  categoriesScroll: {
    paddingHorizontal: 15,
    paddingTop: 5,
  },
  categoryItem: {
    alignItems: 'center',
    marginEnd: 18,
    width: 65,
  },
  categoryIconCircle: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: '#fff',
    borderWidth: 2,
    padding: 3,
    marginBottom: 8,
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 6,
  },
  activeCategoryCircle: {
    elevation: 8,
    shadowColor: BRAND.colors.secondary,
    shadowOpacity: 0.3,
  },
  categoryImgContainer: {
    flex: 1,
    borderRadius: 30,
    overflow: 'hidden',
    justifyContent: 'center',
    alignItems: 'center',
  },
  categoryImage: {
    width: '100%',
    height: '100%',
    resizeMode: 'cover',
  },
  categoryLabel: {
    fontSize: 11,
    color: BRAND.colors.slate[500],
    textAlign: 'center',
    fontFamily: BRAND.typography.bold,
  },
  activeCategoryLabel: {
    color: BRAND.colors.primary,
    fontFamily: BRAND.typography.extraBold,
  },
  
  // Discovery Header
  discoveryHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 15, marginBottom: -10, paddingHorizontal: 30 },
  discoveryLine: { flex: 1, height: 1, backgroundColor: '#E2E8F0' },
  discoveryTitle: { fontSize: 14, color: BRAND.colors.slate[400], textTransform: 'uppercase', letterSpacing: 1, fontFamily: BRAND.typography.bold },
 
  // Footer Section
  footerSection: { marginTop: 10 },
  familyCard: { width: 120, alignItems: 'center', marginEnd: 20 },
  familyLogoContainer: { width: 70, height: 70, borderRadius: 35, backgroundColor: '#fff', elevation: 4, padding: 2, borderWidth: 2, borderColor: BRAND.colors.secondary, marginBottom: 8 },
  familyLogoImage: { width: '100%', height: '100%', borderRadius: 33 },
  placeholderLogo: { width: '60%', height: '60%' },
  familyName: { fontSize: 12, color: BRAND.colors.primary, textAlign: 'center', marginBottom: 4, fontFamily: BRAND.typography.bold },
  familyBadge: { backgroundColor: BRAND.colors.secondary + '20', paddingHorizontal: 8, paddingVertical: 2, borderRadius: 6 },
  familyBadgeText: { fontSize: 9, color: BRAND.colors.secondary, fontFamily: BRAND.typography.extraBold }
});

