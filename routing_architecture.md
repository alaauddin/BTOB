# Routing & Navigation Flow Architecture

## 1. Analysis of Current State

The current routing system is function-centric rather than user-centric, leading to a fragmented experience.

### Core Problems Identified
*   **Fragmented Context**: URLs like `/add-product/` lack context. Does it belong to a store? Which one?
*   **Ambiguous Entry Points**: Routes like `/merchant/login/` vs `/accounts/login/` create confusion about where to start.
*   **Redundant ID Passing**: Almost every URL requires `<str:store_id>`, making URLs brittle and hard to share.
*   **Missing Hierarchy**: `products/<store_id>/` and `merchant-products/` sit at the same root level, despite serving completely different purposes (Buyer vs Seller).

---

## 2. Proposed Architecture (Flow-Based)

We will split the application into two distinct namespaces based on **User Intent**:

1.  **Dashboard (`/dashboard/`)**: The Merchant Operating System.
2.  **Storefront (`/store/`)**: The Buyer Experience.

### A. Dashboard Flow (Merchant)
*Context*: Authenticated Merchant, managing their active store.

| Route | View / Action | Purpose |
| :--- | :--- | :--- |
| `/dashboard/` | `dashboard_overview` | Business at a glance. |
| `/dashboard/metrics/` | `analytics_view` | Deep dive into numbers. |
| `/dashboard/products/` | `product_list` | Inventory management. |
| `/dashboard/products/new/` | `product_create` | Add new inventory. |
| `/dashboard/products/<id>/` | `product_edit` | Edit specific item. |
| `/dashboard/orders/` | `order_management` | Process incoming orders. |
| `/dashboard/orders/<id>/` | `order_process` | Fulfill a specific order. |
| `/dashboard/settings/` | `store_settings` | Configure store/brand. |

### B. Storefront Flow (Buyer)
*Context*: Visitor/Buyer, exploring a specific brand.

| Route | View / Action | Purpose |
| :--- | :--- | :--- |
| `/store/<slug>/` | `store_home` | Brand Landing Page. |
| `/store/<slug>/shop/` | `store_catalog` | Browse products. |
| `/store/<slug>/p/<id>/` | `product_canonical` | SEO-friendly product detail. |
| `/store/<slug>/cart/` | `cart_view` | Review basket. |
| `/store/<slug>/checkout/` | `checkout_view` | Strict conversion funnel. |
| `/store/<slug>/track/<id>/` | `order_tracking` | Post-purchase experience. |
| `/store/<slug>/account/` | `buyer_account` | Repeat customer history. |

### C. Onboarding (Activation)
*Context*: User converting to Merchant.

| Route | View / Action | Purpose |
| :--- | :--- | :--- |
| `/start/` | `onboarding_start` | Value prop & signup. |
| `/start/setup/` | `store_creation` | Create first store. |
| `/start/welcome/` | `onboarding_success` | "First Product" nudge. |

---

## 3. Intelligent Redirects & Guards

We will implement a `NavigationMiddleware` to handle flow logic automatically.

| Situation | Action / Redirect |
| :--- | :--- |
| User hits `/dashboard/` but has no store | → Redirect to `/start/setup/` |
| Visitor hits `/checkout/` | → Redirect to `/login/?next=/checkout/` |
| User accesses Store A's dashboard but owns Store B | → 403 Forbidden or Switch Context |
| Authenticated User hits `/start/` | → Redirect to `/dashboard/` |

---

## 4. Middleware Logic Plan

```python
class FlowControlMiddleware:
    def process_view(self, request, view_func, view_args, view_kwargs):
        user = request.user
        path = request.path
        
        # 1. Dashboard Guard
        if path.startswith('/dashboard/'):
            if not user.is_authenticated:
                return redirect('login')
            if not user.has_store:
                return redirect('onboarding_setup')
                
        # 2. Store Context Injection
        if 'store_slug' in view_kwargs:
            request.current_store = get_object_or_404(Supplier, store_id=view_kwargs['store_slug'])
```

---

## 5. Migration Strategy

To avoid breaking existing links, we will map legacy routes to new ones using `RedirectView`.

### Deprecated Routes
*   `/my-merchant/` → `/dashboard/`
*   `/add-product/` → `/dashboard/products/new/`
*   `/products/<store_id>/` → `/store/<slug>/shop/`
*   `/join-business/` → `/start/setup/`

These changes will establish a predictable, professional, and scalable navigation structure.
