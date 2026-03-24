# Delivery Driver Auth & Dashboard Setup

## Overview
This document details the authentication and routing flow created for Delivery Drivers. Drivers need a dedicated, restricted workspace separate from the merchant and storefront views.

## 1. Authentication Logic
When a driver logs into the system using the standard login forms (`ajax_merchant_login_view` or `MerchantLoginView`), the backend checks if the authenticated user has an active `DeliveryDriver` profile.

**Key Check:**
```python
driver = DeliveryDriver.objects.filter(user=request.user, is_active=True).first()
if driver:
    # Redirect to driver dashboard instead of merchant dashboard
    return redirect('driver_dashboard')
```

## 2. Driver Security Middleware (`DriverRedirectMiddleware`)
To prevent drivers from URL-guessing their way into the admin console, merchant dashboard, or storefronts, a custom middleware was implemented in `core/middleware.py`.

**Behavior:**
- Intercepts **every** request.
- Checks if the user is authenticated and holds an active `DeliveryDriver` profile.
- Restricts the driver to paths starting with:
  - `/driver-dashboard/`
  - `/driver-update-status/`
  - `/driver-map/`
  - `/logout/`
  - `/static/` and `/media/` (for necessary page assets)

If an active driver navigates elsewhere, they are hard-redirected back to `/driver-dashboard/`.

## 3. Driver Dashboard UI (`driver_dashboard.html`)
A mobile-first, responsive dashboard was built for drivers using Bootstrap 5. 

**Features:**
- **Driver Stats:** Shows total active orders, completed (delivered) orders, and total lifetime orders.
- **Tab Layout:** A toggle switch separates "Active Orders" and "Delivered Orders".
- **Order Cards:** Each order is displayed with customer details, phone number, location, and the current workflow step.
- **Action Buttons:** Drivers can trigger WhatsApp messages, phone calls, map tracking, and status updates directly from the order card.
