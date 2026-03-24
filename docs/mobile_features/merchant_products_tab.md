# Feature: Merchant Products Tab

## Overview
This feature introduces a dedicated "Products" (المنتجات) tab to the merchant's bottom navigation bar. It enables merchants to easily browse their inventory, monitor real-time stock statuses, and search through their existing products within a premium mobile UI.

## Backend Changes
- **Serializers (`mobile_api/serializers.py`)**: 
  - Implemented `MerchantProductSerializer` tailored specifically for the merchant view.
  - Dynamically builds absolute URLs for the main `image`, `video`, and all `extra_images` ensuring assets load flawlessly on mobile devices.
  - Injects computed fields for `price_after_discount` and `has_discount`.
- **Views (`mobile_api/views.py`)**: 
  - Created a new `MerchantProductsAPIView` (`GET /api/merchant/products/?merchant_id=X`) that lists all products bound to a target merchant.
  - Protected the endpoint using the internal `_assert_merchant_access` helper function to block unauthorized access.
  - Optimized the product list query by prefetching `additional_images`.
- **URLs (`mobile_api/urls.py`)**: 
  - Exposed and registered the new endpoint at `path('merchant/products/', MerchantProductsAPIView.as_view(), name='merchant_products')`.

## Frontend Changes (Mobile App)
- **`MerchantProductsScreen.js` (NEW)**: 
  - Developed a standalone screen showcasing the merchant's products in a vertical card list.
  - Embedded a sticky search bar to filter products by name in real-time.
  - Structured color-coded visual stock indicators highlighting inventory health (Green: In Stock, Orange: Low Stock <= 5, Red: Out of Stock / Inactive).
  - Attached a summarized "Stats Strip" outlining the total catalog size, low stock item count, and out-of-stock item count.
- **`MerchantTabNavigator.js`**: 
  - Injected the "المنتجات" (Products) screen route as a core tab sporting a package icon (`Feather` package icon) into the bottom navigation bar.
- **`MerchantDashboardScreen.js`**: 
  - Linked the existing "المنتجات" KPI statistical card to navigate specifically to the new Products screen upon tap.
  - Attached a "منتج جديد" (New Product) quick-action tile to smoothly transition to the Products screen.
- **`CustomHeader.js`**: 
  - Added an accessible "المنتجات" shortcut right onto the global side menu, empowering merchants to jump to their products from anywhere in the app context.

## How to Test or Replicate
1. Re-launch the Expo server to ensure the newly added `MerchantProductsScreen.js` resolves.
2. Log in to the mobile app using a valid merchant account.
3. Look at the bottom navigation bar and tap the new **Products (المنتجات)** tab.
4. Verify the product data loads successfully, complete with their corresponding images.
5. Use the text input at the top to filter items instantly.
6. Verify the Stock Labels (متوفر, مخزون منخفض, نفذ المخزون).
7. Go back to the **Dashboard** and tap the "المنتجات" KPI card to confirm it correctly loops you back into the Products tab.
