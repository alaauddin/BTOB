---
description: How to maintain and update the Suppliers List page assets
---

# Suppliers List Workflow

This workflow provides guidance on how to update and maintain the Suppliers List page and its associated assets (`suppliers_list.html`, `suppliers_list.css`, `suppliers_list.js`).

## 1. Asset Structure
- **Template**: `/core/templates/suppliers_list.html`
- **Styles**: `/static/css/suppliers_list.css` (Premium Design System)
- **Logic**: `/static/js/suppliers_list.js` (Filtering, Swiper, Spotlight Tour)

## 2. Modifying Styles
When adding or updating styles:
1.  Open `/static/css/suppliers_list.css`.
2.  Use the defined **Design Tokens** (e.g., `--primary`, `--shadow-soft`) for consistency.
3.  Ensure responsiveness by adding rules for both mobile and desktop (`@media` queries).
4.  Maintain the "Premium Design System" principles: glassmorphism, smooth gradients, and micro-animations.

## 3. Updating Logic
When adding or updating JavaScript logic:
1.  Open `/static/js/suppliers_list.js`.
2.  **View Modes**: Use `setViewMode(mode)` to switch between 'store' and 'product'.
3.  **Universal Filtering**: The `applyFilters()` function now synchronizes searches and category filters across both `#storeViewSection` and `#productViewSection`. Use `handleEmptyState()` for UI feedback.
4.  **Swiper**: Adding new swipers should be done in the `DOMContentLoaded` listener.
5.  **Spotlight Tour**: Update `buildTourData` with new step targets and descriptions.

## 4. Template Changes
When modifying the template:
1.  Open `/core/templates/suppliers_list.html`.
2.  **Stores**: Modify elements inside `id="storeViewSection"`.
3.  **Products**: Modify elements inside `id="productViewSection"`.
4.  **Cards**: 
    - Supplier cards require `data-name`, `data-categories`, and `data-category-names`.
    - Product cards require `data-name`, `data-category`, and `data-price`.
5.  Ensure `extra_css` and `extra_js` blocks at the top and bottom are kept intact.

## 5. Verification
After making changes:
- [ ] Toggle between Store and Product views.
- [ ] Verify search filters both stores and products.
- [ ] Check category pills correctly filter both views.
- [ ] Ensure "No Results" messages appear correctly.
- [ ] Test the spotlight tour if new steps were added.
