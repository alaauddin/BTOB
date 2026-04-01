# Workflow: Implementing Merchant Product Management in Mobile

This workflow outlines the steps to replicate the web-based merchant product management system in the React Native mobile application.

## Phase 1: Backend API Enhancements
Ensure the `mobile_api` can handle all data types present on the web.

### 1. Update `MerchantProductSerializer`
- **Variations Support**: Add logic to handle `variations` (JSON) in `create` and `update` methods. This involves creating/updating `ProductAttribute` and `ProductOption` objects.
- **Gallery Support**: Handle `additional_images` (multipart) to populate the product's image gallery.
- **Validation**: Ensure `stock`, `price`, and `category_id` are strictly validated to prevent data corruption.

### 2. Update `MerchantProductsAPIView`
- **Filtering**: Add support for `search`, `category`, and `is_active` query parameters in the `get` method for server-side filtering (preferable for mobile performance).
- **Toggle Endpoint**: Add a specialized `patch` action or a dedicated `MerchantProductStatusAPIView` to toggle `is_active` without sending the full model.

## Phase 2: Mobile UI/UX Implementation

### 1. Product Listing Screen
- **Tabs**: Use a segmented control or horizontal tabs for "Active", "Hidden", "New", and "Discounted".
- **Search Bar**: Implement a persistent search bar in the header.
- **Product Card**:
    - Image thumbnail.
    - Title and Price (showing original and discounted price).
    - Status Badge (Active/Hidden).
    - Quick Actions: Edit (Icon), Delete (Long Press or Swipe), Share (Icon).

### 2. Product Add/Edit Screen
Due to the complexity of product data, a full-screen form is recommended over a modal on mobile.

- **Image Pickers**:
    - `expo-image-picker` for the main image and gallery.
    - Implement client-side compression (similar to the web's WebP logic) to ensure fast uploads.
- **Category Picker**: A searchable dropdown or a flat-list selector.
- **Variations Manager**:
    - An interactive section where merchants can add "Attribute Groups" (e.g., "Color").
    - Each group contains a sub-list of "Options" with their respective "Price Modifiers".
- **Video Upload**: Use `expo-image-picker` with media type `Videos`.

## Phase 3: Advanced Business Logic

### 1. Data Sync & Refresh
- Implement "Pull-to-refresh" on the product listing.
- Use `useEffect` and `useFocusEffect` to ensure the list is refreshed after a successful add/edit.

### 2. Sharing Logic
- Use the native `Share` API to generate deep links like: `btob://store/${storeId}/product/${productId}` or the public web URL.

### 3. Error Handling & Validation
- Implement field-level validation (empty name, zero price, etc.) on the frontend before sending the API request.
- Parse and display backend validation errors (e.g., "SKU already exists") in a clear `Alert` or toast.

## Phase 4: Verification & Polishing
- **Visual Audit**: Ensure consistent margins, typography, and merchant-specific branding colors.
- **Performance**: Optimize the image list and variation manager for smooth scrolling.
- **Offline Mode**: Consider basic caching for the product list to allow viewing while offline.
