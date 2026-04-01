---
description: Implementing the Order Quick View feature for the Merchant Mobile App
---

# Workflow: Implementing Order Quick View (Mobile)

Follow these steps to migrate the web-based "Order Quick View" functionality to the React Native app.

### 1. API Verification
- **Endpoint**: Ensure `/api/merchant/order-quick-view/<id>/` is available in the mobile API.
- **Fields**: Verify it returns `workflow_steps`, `items` (with variations), and `contact` (with phone/address).

### 2. Frontend Component: `OrderQuickViewBottomSheet.js`
- **Container**: Use `gorhom/react-native-bottom-sheet` or a standard `Modal` (overlay).
- **Header**: Large Order ID, Customer Name, and Address.
- **Actions Row**: Implement Phone Call, WhatsApp, and Google Maps shortcuts.

### 3. Interactive Stepper (Workflow) Logic
- **UI**: A horizontal ScrollView with status badges.
- **Status Update**: On tap, call the status update endpoint.
- **Driver Guard**: If current step is `Delivery` but no driver is assigned, prompt to assign a driver first.

### 4. Driver Assignment Integration
- **Selection**: A localized picker/dropdown showing available drivers.
- **Assign Logic**: Call the driver assignment API and refresh the quick view state.

### 5. Detailed Itemization
- **List**: Clear product names with variant badges (Size, Color).
- **Financials**: Detailed breakdown (Subtotal, Discount, Delivery, Total).

### 6. Implementation in `MerchantOrdersScreen.js`
- **Trigger**: Replace the "View Details" click with "Open Quick View".
- **Interaction**: Provide a "View Full Details" button at the bottom of the sheet to navigate to the complete `MerchantOrderDetailScreen`.

### 7. Final Polish
- **Haptics**: Add light vibration feedback on status changes.
- **RTL Support**: Ensure layout mirrors correctly for Arabic.
- **Visuals**: Use consistent icons (Feather, Ionicons) as seen in the detail screen.
