# 📦 Wholesale Market & Sourcing Specification

This document details the logic, data flow, and business rules for the Wholesale (B2B) Marketplace.

## 1. Governance & Access Control
The Wholesale Market is a restricted zone within the platform.
*   **Visibility**: Only `Supplier` accounts with `can_buy_wholesale = True` can access the `/wholesale-market/` route.
*   **Onboarding**: Merchants can be granted wholesale access via the internal admin panel or through automated criteria (e.g., store activity).

## 2. Wholesaler Architecture
| Entity | Role | Key Attributes |
| :--- | :--- | :--- |
| `WholesaleSupplier` | Source Entity | Name, Contact, Address, Active Status |
| `WholesaleProduct` | Sourcing Asset | `purchase_price`, `sale_price`, `stock`, `video` |

### Profit Calculation Logic:
`Potential Profit = Suggested Sale Price - Purchase Price`
*   This calculation is displayed to merchants in the sourcing modal to help them make rapid inventory decisions.

## 3. The Sourcing (Inheritance) Workflow
When a merchant clicks "Source Product", the following sequence occurs:

1.  **Record Creation**: A new `core.Product` is created for the merchant.
2.  **Origin Linking**: `new_product.wholesale_origin` is set to the source `WholesaleProduct`.
3.  **Cost Persistence**: `new_product.purchase_cost` is locked to the current `purchase_price` of the wholesaler.
4.  **Media Duplication**:
    *   The main image, all additional images, and the demonstration video are physically copied to the merchant's media folder.
    *   *Rationale*: This ensures the merchant's store remains functional even if the source wholesaler deletes their catalog item.
5.  **Default Inventory**: Inherited products are initialized with a default stock of **10 units**.

## 4. Retail Pricing Rules
*   **Suggested Price**: Defaulted to `wp.sale_price`.
*   **Override**: Merchants can provide a `custom_price` during the import process.
*   **Profit Tracking**: The merchant's dashboard uses `purchase_cost` vs `price` to calculate real-time net profit on sales.

## 5. UI/UX Components
- **Marketplace Grid**: Displays products with a "Profit Badge" emphasizing potential earnings.
- **Sourcing Modal**: Allows merchants to review descriptions, videos, and adjust their retail price before importing.
- **Inheritance Badge**: On the merchant's product list, sourced items are marked with an icon linking back to the source wholesaler.

## 🛠️ Technical Implementation Details
- **View Location**: `core.views.MyMerchant.wholesale_market`
- **AJAX Actions**: 
    - `get_wholesale_product_details_ajax`: Fetching data for the modal.
    - `inherit_wholesale_product_ajax`: Executing the deep clone.
- **Data Model**: `core.db.wholesale.py` and wholesale fields in `core.db.product.py`.
