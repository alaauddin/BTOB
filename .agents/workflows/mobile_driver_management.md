---
description: Implementing the Delivery Driver Management feature for the Merchant Mobile App
---

# Workflow: Implementing Delivery Driver Management (Mobile)

Follow these steps to migrate the web-based "Driver Management" functionality to the React Native app.

### 1. Backend Serialization
- **File**: `mobile_api/serializers/merchant.py`
- **Component**: Create a `MerchantDriverSerializer`.
- **Fields**: Include `id`, `name` (from `User.get_full_name`), `phone`, `username`, and `is_active`.
- **Logic**: Use `serializers.SerializerMethodField` for name and username retrieval from the nested `User`.

### 2. Backend API Endpoint: Driver List & Create
- **File**: `mobile_api/views/merchant.py`
- **Class**: `MerchantDriversAPIView(APIView)`
- **Methods**:
    - `GET`: Returns a serialized list of all drivers for the `merchant_id`.
    - `POST`: Validates inputs (name, phone, username, password) and handles `User.objects.create_user` + `DeliveryDriver.objects.create`.
- **Error Handling**: Implement checks for unique `username` and `phone` as in `delivery_driver_views.py`.

### 3. Backend API Endpoint: Toggle Status
- **File**: `mobile_api/views/merchant.py`
- **Class**: `MerchantDriverToggleAPIView(APIView)`
- **Method**: `POST`
- **Logic**: Toggles the `is_active` field on the specific `DeliveryDriver` record.

### 4. Frontend Component: `MerchantDriversScreen.js`
- **UI Structure**:
    - Header with "Active" and "Total" driver counters.
    - FlatList with `DriverCard` components.
    - Floating Action Button (FAB) for adding new driver.
- **Interactions**: Tapping the status switch/button calls the toggle API and updates local state.

### 5. Frontend UI: Add Driver Form
- **Component**: `AddDriverModal.js` or separate screen.
- **Fields**: First Name, Phone, Username (Login), Password.
- **Validation**: Ensure phone format is correct and all required fields are filled.
- **Submit**: Call the `POST` API and refresh the driver list upon success.

### 6. Design & Aesthetic Guidelines
- **Visuals**: Use premium "Glassmorphism" cards similar to the web's `glass-card`.
- **Consistency**: Use `primary_color` (Theme) for active status and `accent_color` (Orange) for icons.
- **UX**: Implement Haptic Feedback on toggling status and show intuitive loading states.

### 7. Verification Steps
- **List Verification**: Open the screen and ensure drivers are listed with correct status labels.
- **Registration Test**: Successfully register a new driver and verify they can log in to the driver dashboard.
- **Duplicate Check**: Attempt to register a driver with an existing username and confirm the alert message appears.
- **RTL Audit**: Ensure the counters and list items align correctly for Arabic (right-to-left).
