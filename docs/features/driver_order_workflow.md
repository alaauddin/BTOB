# Delivery Driver Order Workflow

## Overview
This document outlines the workflow and API endpoints used to advance an active order's status from within the driver dashboard. Initially, drivers were able to select **any** workflow status arbitrarily, which caused logic skips. This has been updated to force sequential "Next Step" progression.

## 1. Advancing the Order (`move_to_next_status`)
Instead of accepting a direct `slug` from the driver, the view `driver_update_order_status` in `delivery_driver_views.py` now leverages the `order.move_to_next_status()` backend model method.

**Steps It Takes:**
1. Retrieves the current `WorkflowStep` based on the active `pipeline_status`.
2. Queries the `WorkflowStep` table for the very next step based on `priority` (priority > current_priority).
3. Evaluates checks before confirming the move:
   - **Payment Checks**: If the *current* step requires payment, the order total must be equal to or less than the `OrderPaymentReference` sum.
   - **Driver Checks**: If the *current* step requires a driver, it ensures `order.delivery_driver` is not null.
   - **Stock Checks**: If the *next* step requires stock reduction (`decrease_stock=True`), it verifies available inventory and deducts quantities simultaneously.

## 2. Driver Dashboard UX Integration
The `driver_dashboard.html` template utilizes the SweetAlert2 plugin (`Swal`) for a seamless mobile experience. Instead of a dropdown with all statuses, the driver sees a modal asking if they want to move the "Order to the Next Step". 

The name of the next logical step is fetched from the backend (`order.get_next_status.name`) preventing confusing status jumps and ensuring strict business logic is maintained across the order cycle.
