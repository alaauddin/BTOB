/**
 * Shared Product Actions for Cart & Variations
 */

// Selected options state: { productId: { attributeId: optionId } }
let selectedProductOptions = {};

// Global cart state for the session: { productId: [ { selected_options: [], quantity: N } ] }
let cartState = {
    items: [],
    total_items: 0,
    cart_total: 0
};

/**
 * Initialize or Refresh Cart State
 */
function refreshCartState(storeId) {
    return fetch(`/cart/status/${storeId}/`)
        .then(res => res.json())
        .then(data => {
            if (data.success) {
                cartState.items = data.items || [];
                cartState.total_items = data.cart_items_count || 0;
                // Note: We might need cart_total here too if needed
            }
            return data;
        });
}

/**
 * Get quantity of a specific product variation from local state
 */
function getVariationQty(productId, optionIds = []) {
    const sortedTarget = [...optionIds].map(Number).sort((a, b) => a - b);
    
    // Find item with matching product and options
    const match = cartState.items.find(item => {
        if (item.product_id != productId) return false;
        const currentOpts = (item.selected_options || []).map(Number).sort((a, b) => a - b);
        return JSON.stringify(currentOpts) === JSON.stringify(sortedTarget);
    });
    
    return match ? match.quantity : 0;
}

/**
 * Update local cart state after an action
 */
function updateLocalCartState(productId, optionIds, newQty, totalItems, cartTotal) {
    const sortedTarget = [...optionIds].map(Number).sort((a, b) => a - b);
    let found = false;
    
    cartState.items = cartState.items.map(item => {
        if (item.product_id == productId) {
            const currentOpts = (item.selected_options || []).map(Number).sort((a, b) => a - b);
            if (JSON.stringify(currentOpts) === JSON.stringify(sortedTarget)) {
                found = true;
                return { ...item, quantity: newQty };
            }
        }
        return item;
    }).filter(item => item.quantity > 0);
    
    if (!found && newQty > 0) {
        cartState.items.push({
            product_id: productId,
            selected_options: sortedTarget,
            quantity: newQty
        });
    }
    
    cartState.total_items = totalItems;
    cartState.cart_total = cartTotal;

    // Dispatch event so templates can react
    document.dispatchEvent(new CustomEvent('cartUpdated', { 
        detail: { productId, optionIds, newQty, totalItems, cartTotal } 
    }));
}

/**
 * Handle Add to Cart button click
 * If product has attributes, show the options picker overlay
 */
function handleAddToCart(productId, storeId, hasAttributes) {
    if (hasAttributes) {
        showOptions(productId);
    } else {
        addToCart(productId, storeId);
    }
}

/**
 * Show options overlay for a specific product card
 */
function showOptions(productId) {
    const card = document.querySelector(`[data-product-id="${productId}"]`);
    if (!card) return;
    
    const overlay = card.querySelector('.product-options-overlay');
    if (overlay) {
        overlay.classList.add('active');
        // Reset selections for this product
        selectedProductOptions[productId] = {};
        overlay.querySelectorAll('.option-chip').forEach(c => c.classList.remove('active'));
        
        // Hide confirm button initially
        const confirmBtn = overlay.querySelector('.btn-confirm-options');
        if (confirmBtn) confirmBtn.classList.remove('visible');
    }
}

/**
 * Hide options overlay
 */
function hideOptions(productId) {
    const card = document.querySelector(`[data-product-id="${productId}"]`);
    if (!card) return;
    
    const overlay = card.querySelector('.product-options-overlay');
    if (overlay) {
        overlay.classList.remove('active');
    }
}

/**
 * Select an option chip
 */
function selectOption(element, attributeId, optionId) {
    const group = element.closest('.option-group');
    const productId = element.closest('.store-card').getAttribute('data-product-id');
    
    // UI Update
    group.querySelectorAll('.option-chip').forEach(c => c.classList.remove('active'));
    element.classList.add('active');
    
    // State Update
    if (!selectedProductOptions[productId]) {
        selectedProductOptions[productId] = {};
    }
    selectedProductOptions[productId][attributeId] = optionId;

    // Show confirm button as soon as any option is selected
    const confirmBtn = element.closest('.product-options-overlay').querySelector('.btn-confirm-options');
    if (confirmBtn) confirmBtn.classList.add('visible');
}

/**
 * Confirm options and add to cart
 */
function confirmOptions(productId, storeId) {
    const card = document.querySelector(`[data-product-id="${productId}"]`);
    const attributeGroups = card.querySelectorAll('.option-group');
    const selections = selectedProductOptions[productId] || {};
    
    // Check if all attributes have a selection
    let allSelected = true;
    attributeGroups.forEach(group => {
        const attrId = group.getAttribute('data-attribute-id');
        if (!selections[attrId]) {
            allSelected = false;
            group.classList.add('shake-error');
            setTimeout(() => group.classList.remove('shake-error'), 500);
        }
    });

    if (!allSelected) {
        showToast("الرجاء اختيار جميع الخيارات أولاً", "error");
        return;
    }

    // Prepare options array
    const optionIds = Object.values(selections);
    
    // Add to cart with options
    addToCart(productId, storeId, optionIds);
    
    // Hide overlay
    hideOptions(productId);
}

/**
 * Core Add to Cart function (Variation Aware)
 */
function addToCart(productId, storeId, optionIds = []) {
    // Delegate to global function from main_base.js if available
    if (typeof window.addToCart === 'function') {
        return window.addToCart(productId, storeId, optionIds);
    }
    
    // Fallback logic if main_base.js isn't ready
    console.warn('Global addToCart not ready, falling back to fetch');
    const csrfToken = getCookie('csrftoken');
    const payload = {
        product_id: productId,
        quantity: 1,
        selected_options: optionIds
    };

    return fetch(`/add_to_cart/${productId}/${storeId}/`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'X-CSRFToken': csrfToken,
            'X-Requested-With': 'XMLHttpRequest'
        },
        body: JSON.stringify(payload)
    })
    .then(response => response.json())
    .then(data => {
        if (data.success) {
            updateLocalCartState(productId, optionIds, data.cart_item_count, data.cart_items_count, data.cart_total);
            updateMobileCart(data);
            showNotification(data.message || "تمت الإضافة بنجاح", "success");
        } else {
            showNotification(data.message || "حدث خطأ ما", "error");
        }
    });
}

/**
 * Update mobile cart island info
 */
function updateMobileCart(data) {
    const countEl = document.querySelector('.cart-island-count');
    const totalEl = document.querySelector('.cart-island-total');
    const cartIsland = document.getElementById('mobileCartBar');

    if (cartIsland && data.total_items > 0) {
        cartIsland.parentElement.classList.remove('d-none');
        if (countEl) countEl.innerText = `${data.total_items} منتجات`;
        if (totalEl) totalEl.innerText = `${data.cart_total} ${data.currency}`;
    }
}

/**
 * Toast Notifications
 */
function showToast(message, type = 'success') {
    const toast = document.createElement('div');
    toast.className = `custom-toast ${type} animate-slide-in`;
    toast.innerHTML = `
        <div class="toast-content">
            <i class="fas ${type === 'success' ? 'fa-check-circle' : 'fa-exclamation-circle'}"></i>
            <span>${message}</span>
        </div>
    `;
    
    document.body.appendChild(toast);
    
    setTimeout(() => {
        toast.classList.replace('animate-slide-in', 'animate-fade-out');
        setTimeout(() => toast.remove(), 500);
    }, 3000);
}

// Cookie Helper
function getCookie(name) {
    let cookieValue = null;
    if (document.cookie && document.cookie !== '') {
        const cookies = document.cookie.split(';');
        for (let i = 0; i < cookies.length; i++) {
            const cookie = cookies[i].trim();
            if (cookie.substring(0, name.length + 1) === (name + '=')) {
                cookieValue = decodeURIComponent(cookie.substring(name.length + 1));
                break;
            }
        }
    }
    return cookieValue;
}

/**
 * Core Remove from Cart function (Variation Aware)
 */
function subToCart(productId, storeId, optionIds = []) {
    // Delegate to global function from main_base.js if available
    if (typeof window.subToCart === 'function') {
        return window.subToCart(productId, storeId, optionIds);
    }

    const csrfToken = getCookie('csrftoken');
    
    const payload = {
        product_id: productId,
        selected_options: optionIds
    };

    return fetch(`/sub_to_cart/${productId}/${storeId}/`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'X-CSRFToken': csrfToken,
            'X-Requested-With': 'XMLHttpRequest'
        },
        body: JSON.stringify(payload)
    })
    .then(response => response.json())
    .then(data => {
        if (data.success) {
            updateLocalCartState(productId, optionIds, data.cart_item_count, data.cart_items_count, data.cart_total);
            updateMobileCart(data);
            showNotification(data.message || "تم التحديث بنجاح", "success");
        } else {
            showNotification(data.message || "حدث خطأ ما", "error");
        }
    });
}


/**
 * Get total quantity for a specific option ID across all cart items for a product
 */
function getOptionTotalQty(productId, optionId) {
    if (!cartState || !cartState.items) return 0;
    let total = 0;
    cartState.items.forEach(item => {
        if (item.product_id == productId && (item.selected_options || []).map(Number).includes(Number(optionId))) {
            total += item.quantity;
        }
    });
    return total;
}

/**
 * Universal Refresh for all product badges and variation controls on the page
 */
function refreshAllProductBadges() {
    // Update all elements that have data-option-id
    document.querySelectorAll('[data-option-id]').forEach(el => {
        const optId = el.getAttribute('data-option-id');
        const prodId = el.getAttribute('data-product-id');
        if (!optId || !prodId) return;

        const qty = getOptionTotalQty(prodId, optId);
        
        // Find badge and control elements within or related to this chip
        // Detail page uses badge-{{id}} and ctrl-{{id}}
        // Snippets in list will use badge-{{prod}}-{{opt}} for uniqueness
        const badge = document.getElementById(`badge-${optId}`) || document.getElementById(`badge-${prodId}-${optId}`);
        const ctrl = document.getElementById(`ctrl-${optId}`) || document.getElementById(`ctrl-${prodId}-${optId}`);
        const addIcon = document.getElementById(`add-icon-${optId}`) || document.getElementById(`add-icon-${prodId}-${optId}`);

        if (badge) badge.innerText = qty;

        if (qty > 0) {
            if (badge) badge.classList.remove('hidden');
            if (ctrl) ctrl.classList.remove('hidden');
            if (addIcon) addIcon.classList.add('hidden');
        } else {
            if (badge) badge.classList.add('hidden');
            if (ctrl) ctrl.classList.add('hidden');
            if (addIcon) addIcon.classList.remove('hidden');
        }
    });

    // Also update main +/- controls for simple products in the list
    document.querySelectorAll('[id^="total-qty-items-"]').forEach(el => {
        const pid = el.id.replace('total-qty-items-', '');
        // For simple products, we just use the first item in cartState (if any) with empty options
        const qty = getVariationQty(pid, []);
        el.innerText = qty;
        
        // Sync with any other matching displays
        const displays = document.querySelectorAll(`#quantity-${pid}`);
        displays.forEach(d => d.innerText = qty);
        
        const ctrl = document.getElementById(`qty-ctrl-${pid}`);
        const addBtn = document.getElementById(`add-btn-${pid}`);
        if (qty > 0) {
            if (ctrl) ctrl.classList.remove('d-none');
            if (addBtn) addBtn.classList.add('d-none');
        } else {
            if (ctrl) ctrl.classList.add('d-none');
            if (addBtn) addBtn.classList.remove('d-none');
        }
    });
}
