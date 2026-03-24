# Feature: Merchant Profile & Image Integration

## Overview
This feature ensures that merchant logos, cover photos, and product images are consistently and reliably displayed across the mobile application using absolute URLs. It heavily involves updates to the backend serializers to inject request contexts, as well as UI enhancements on the mobile app.

## Backend Changes
- **Serializers (`mobile_api/serializers.py`)**: 
  - Updated `MerchantMiniSerializer`, `MerchantOrderItemSerializer`, and `MerchantOrderSerializer` to serialize image paths as absolute URLs by utilizing `request.build_absolute_uri()`.
  - Corrected the related manager name in `MerchantOrderItemSerializer.get_product_images` to use `.additional_images` instead of the broken `.images` reference.
- **Views (`mobile_api/views.py`)**: 
  - Fixed N+1 query performance issues by updating `prefetch_related` calls to properly use `order_items__product__additional_images`.
  - Modified standard view responses (such as `_merchant_list_data`, `MerchantDashboardAPIView`, `MerchantSwitchAPIView`, and `LoginAPIView`) to accurately pass the `request` context down to the serializers to facilitate the absolute URL generation.
  - Enhanced superuser access permissions so superusers can receive and manage the full list of active merchants.

## Frontend Changes (Mobile App)
- **`MerchantProfileScreen.js`**: 
  - Redesigned to feature a top cover banner and a prominent merchant logo.
  - Upgraded to explicitly fetch fresh data from the dashboard API rather than relying solely on potentially stale `AsyncStorage` data, thereby resolving the missing logos bug in the "Managed Merchants" section.
- **`MerchantDashboardScreen.js`**: 
  - Welcome strip was redesigned to set the merchant's cover image as the background and overlap the logo effectively in the corner.
- **`MerchantOrderDetailScreen.js`**: 
  - Rewritten to support rendering horizontal product image strips corresponding to the items inside an order, alongside displaying merchant branding in the header.
- **`CustomHeader.js`**: 
  - Tweaked to accurately display the active merchant logo in the "Switch Merchant" modal/drawer.

## How to Test or Replicate
1. Start the Django development server and Mobile Expo server.
2. Log in as a merchant or a superuser on the mobile app.
3. Check the **Dashboard** welcome strip: ensure the cover and logo load correctly without broken image icons.
4. Open the **Side Menu** and click "Switch Merchant": confirm that mini-logos appear alongside each merchant's row.
5. Tap on the **Profile (الحساب)** tab: verify the large cover banner, main logo, and managed store logos at the bottom are visible.
6. Open any **Order Details**: ensure the thumbnail images for the purchased products render correctly.
