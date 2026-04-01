---
description: How to maintain and manage Product Attributes, Options, and Variations
---

This workflow defines the standard procedure for managing product variations (e.g., Size, Color, Material) and their corresponding price modifiers within the Raway storefront.

### 1. Data Structure Overview
- **ProductAttribute**: Defines the "category" of variation (e.g., "Size"). Linked to a specific `Product`.
- **ProductAttributeOption**: Defines the specific "value" (e.g., "XL") and an optional `price_modifier` (e.g., +500).
- **CartItem / OrderItem**: These records maintain a Many-to-Many relationship with `ProductAttributeOption` to persist the customer's selection.

### 2. Adding New Variations (Developer/Agent)
When adding or modifying variations for a product:
1. **Identify the Product**: Locate the target product ID.
2. **Create Attributes**: Ensure a `ProductAttribute` exists (e.g., "اللون").
3. **Create Options**: Add `ProductAttributeOption` records. 
   - *Tip*: Set `price_modifier` to `0.00` if the option doesn't change the base price.
4. **Link to UI**: Ensure the frontend template (`product_detail.html`) renders the selection controls.

### 3. Frontend Selection Logic
Variations are handled via `static/js/product_actions.js`:
- **State Management**: The UI should maintain a set of selected `optionIds`.
- **Price Calculation**: The frontend calculates the total price dynamically by adding any selected modifiers to the product's base price.
- **Optimistic Updates**: When a quantity changes, send all selected `optionIds` to the `AddToCartView` or `UpdateQuantityView`.

### 4. Cart & Order Persistence (Precision Pricing)
// turbo
- Always use `item.get_unit_price_with_discount()` to fetch the correct variation-aware price.
- Ensure that `CartItem` captures the `price_modifier_total` at the moment of addition to "lock" the price.
- During checkout, `ConvertCartToOrder.py` must copy these options and modifiers to the `OrderItem` to maintain historical accuracy.

### 5. UI Consistency Checklist
- [ ] **Product Page**: Selection cards should show the modifier (e.g., "+500").
- [ ] **Cart**: Each item row must list its selected options (e.g., "Size: XL").
- [ ] **Merchant Dashboard**: The merchant must see the exact variations to fulfill the order correctly.
- [ ] **Badges**: Use `refreshAllProductBadges()` to sync counts across the page after a variation is added.

### 6. Common Issues & Debugging
- **Mismatch in Totals**: Check if `get_total_price(option_ids)` is being called correctly in the view.
- **Lost Options on Refresh**: Ensure `CartItem.selected_options.all()` is being used in the template, not just the base product data.
- **Migration Errors**: If adding fields to `CartItem` or `OrderItem`, verify the `0087/0088` migrations are applied.
