# Online Payment & Receipt Verification Workflow

This documentation details the implementation and technical requirements for the **Online Payment & Receipt Verification** feature. It serves as a blueprint for developers building the API and Mobile Application integration.

---

## 🏗️ 1. Architecture & Data Model

The system uses a flexible "Supplier-Configured" model where global payment methods are instantiated by individual suppliers with their own account details.

### 1.1 Model Definitions (Django)

#### `core.models.PaymentMethod` (Global)
Global list of supported providers.
*   `name`: Name of the provider (e.g., Kuraimi, Wallet).
*   `logo`: Provider icon.
*   `requires_proof`: Boolean (Defaults to True).

#### `core.models.SupplierPaymentMethod` (Merchant Config)
Configuration for how a specific merchant accepts a specific global payment method.
*   `supplier`: Link to Merchant.
*   `payment_method`: Link to Global Method.
*   `account_field_name`: Label for the account (e.g., "Wallet Number").
*   `account_field_value`: The actual ID/Number (e.g., "779923330").
*   `is_active`: Toggle for storefront visibility.

#### `core.models.PaymentTransaction` (Submission)
The record of a customer's specific payment attempt.
*   `order`: The target order.
*   `user`: Customer who paid.
*   `supplier_payment_method`: The specific config used.
*   `receipt`: Image upload of the transaction proof.
*   `status`: `pending` (Default), `verified`, `rejected`.

---

## 🛒 2. Customer Workflow (Storefront / Client App)

This is the order flow from the customer's perspective.

### Step 1: Selection
*   Client Displays payment selection in a **2-column grid**.
*   Options include **Cash on Delivery (COD)** and various **Online Methods**.

### Step 2: Transition to Online Checkout
*   If an online method is selected, an **Attach Receipt** section must appear.
*   **Validation**: Submitting the order without an attached image is **blocked** for online methods.

### Step 3: Information Display & Copy
*   A **Highlighed Summary Card** appears when an online method is selected.
*   Content: Provider Logo, Provider Name, Account Field Label, and Account Value.
*   **Copy Feature**: A "Copy" button with a checkmark animation allows users to quickly copy the account number to their clipboard.

### Step 4: Order Submission
*   The payload is sent via `Multipart/FormData` to handle the binary image file.
*   On Success: The backend creates the `Order` AND the `PaymentTransaction`.

---

## 👨‍💼 3. Merchant Workflow (Backend / Dashboard)

How the merchant verifies the incoming payments.

### Step 1: Order List
*   Orders appear with their pipeline status (e.g., "Pending", "Confirmed").

### Step 2: Quick View & Verification
*   Merchant opens the **Quick View Modal**.
*   A **Compact Payment Block** shows:
    *   Payment method logo/name.
    *   Status badge (Default: "Pending Verification").
    *   Clickable **Receipt Thumbnail** (70x70px square for space efficiency).
    *   **Action Buttons**: "Verify" (تفعيل) or "Reject" (رفض).

### Step 3: AJAX Processing
*   Verification actions are processed via **AJAX**.
*   The modal refreshes its data in-place to show the new status and updated order workflow stepper.

---

## 📡 4. Technical Specifications for API/Mobile App

### 4.1 Order Creation (POST)
When porting this to the mobile app, the checkout endpoint must accept:
- `payment_method_id`: The database ID of the `SupplierPaymentMethod`.
- `receipt`: The image file (Multipart).

### 4.2 Quick View (GET)
The API returns a `payment` JSON block:
```json
"payment": {
    "method_name": "Kuraimi",
    "method_logo": "/media/logos/kuraimi.png",
    "has_transaction": true,
    "transaction": {
        "id": 88,
        "status": "pending",
        "status_display": "Pending Verification",
        "receipt_url": "/media/receipts/order_88.jpg"
    }
}
```

### 4.3 Payment Verification (POST)
Endpoint: `/payments/verify/<transaction_id>/`
Response: JSON `{ "success": true, "message": "Payment verified." }`

---

## 🛠️ 5. Important Implementation Rules

> [!CAUTION]
> **Audit Integrity**: Never update an order's payment status manually without creating/updating a `PaymentTransaction` record. The transaction record is the official proof tied to the receipt image.

> [!TIP]
> **UX Excellence**: Always ensure the copy icon provides visual feedback (e.g., switching to a checkmark) to prevent users from double-clicking and feeling uncertain if the copy worked.
