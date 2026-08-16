/**
 * Shared Product Actions for Cart & Variations
 */

// Selected options state: { productId: { attributeId: optionId } }
let selectedProductOptions = {};

// Global cart state for the session: { items: [ { product_id, selected_options: [], quantity: N } ], total_items: N, cart_total: N }
let cartState = {
    items: [],
    total_items: 0,
    cart_total: 0
};
window.cartState = cartState;

/**
 * Helper to normalize arguments regardless of call signature
 * Supports: (productId, storeId, optionIds) OR (productId, optionIds) OR (productId)
 */
function normalizeCartArgs(productId, storeId, optionIds) {
    let cleanStoreId = storeId;
    let cleanOptionIds = optionIds || [];

    if (Array.isArray(storeId)) {
        cleanOptionIds = storeId;
        cleanStoreId = '';
    }

    if (!cleanStoreId) {
        const card = document.querySelector(`[data-product-id="${productId}"]`);
        if (card) {
            cleanStoreId = card.getAttribute('data-store-id') || (card.closest('[data-store-id]') ? card.closest('[data-store-id]').getAttribute('data-store-id') : '');
        }
        if (!cleanStoreId && window.siteConfig && window.siteConfig.storeId) {
            cleanStoreId = window.siteConfig.storeId;
        }
    }

    return {
        productId,
        storeId: cleanStoreId || '',
        optionIds: cleanOptionIds
    };
}

/**
 * Initialize or Refresh Cart State from Server
 */
function refreshCartState(storeId) {
    const url = storeId ? `/cart/status/${storeId}/` : '/cart/status/';
    return fetch(url)
        .then(res => res.json())
        .then(data => {
            if (data.success) {
                cartState.items = data.items || [];
                cartState.total_items = data.cart_items_count || 0;
                window.cartState = cartState;
            }
            return data;
        })
        .catch(err => {
            console.error('refreshCartState error:', err);
            return { success: false, items: [], cart_items_count: 0 };
        });
}

/**
 * Get quantity of a specific product variation from local state
 */
function getVariationQty(productId, optionIds = []) {
    const sortedTarget = [...optionIds].map(Number).sort((a, b) => a - b);
    
    // Find item with matching product and options
    const match = (cartState.items || []).find(item => {
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
    
    cartState.items = (cartState.items || []).map(item => {
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
    if (cartTotal !== undefined) {
        cartState.cart_total = cartTotal;
    }
    window.cartState = cartState;

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
        addToCart(productId, storeId, []);
    }
}

/**
 * Show options overlay for a specific product card
 */
function showOptions(productId) {
    const card = document.querySelector(`[data-product-id="${productId}"]`) || document.getElementById(`product-card-${productId}`);
    if (!card) return;
    
    const overlay = card.querySelector('.product-options-overlay') || document.getElementById(`options-${productId}`);
    if (overlay) {
        overlay.classList.add('active');
        selectedProductOptions[productId] = {};
        overlay.querySelectorAll('.option-chip').forEach(c => c.classList.remove('active', 'selected'));
        
        const confirmBtn = overlay.querySelector('.btn-confirm-options, .confirm-options-btn');
        if (confirmBtn) confirmBtn.classList.remove('visible');
    }
}

/**
 * Hide options overlay
 */
function hideOptions(productId) {
    const card = document.querySelector(`[data-product-id="${productId}"]`) || document.getElementById(`product-card-${productId}`);
    const overlay = (card && card.querySelector('.product-options-overlay')) || document.getElementById(`options-${productId}`);
    if (overlay) {
        overlay.classList.remove('active');
    }
}

/**
 * Select an option chip
 */
function selectOption(element, attributeId, optionId, optModifier) {
    const group = element.closest('.option-group, .option-chips');
    const card = element.closest('.store-card, .product-card-container, .product-card-premium');
    const productId = card ? (card.getAttribute('data-product-id') || card.id.replace('product-card-', '')) : null;
    if (!productId) return;
    
    // UI Update
    if (group) {
        group.querySelectorAll('.option-chip').forEach(c => c.classList.remove('active', 'selected'));
    }
    element.classList.add('active', 'selected');
    
    // State Update
    if (!selectedProductOptions[productId]) {
        selectedProductOptions[productId] = {};
    }
    selectedProductOptions[productId][attributeId] = optionId;

    // Show confirm button
    const overlay = element.closest('.product-options-overlay');
    if (overlay) {
        const confirmBtn = overlay.querySelector('.btn-confirm-options, .confirm-options-btn');
        if (confirmBtn) confirmBtn.classList.add('visible');
    }
}

/**
 * Confirm options and add to cart
 */
function confirmOptions(productId, storeId) {
    const card = document.querySelector(`[data-product-id="${productId}"]`) || document.getElementById(`product-card-${productId}`);
    if (!card) return;
    const overlay = card.querySelector('.product-options-overlay') || document.getElementById(`options-${productId}`);
    const attributeGroups = overlay ? overlay.querySelectorAll('.option-group') : [];
    const selections = selectedProductOptions[productId] || {};
    
    // Check if all attributes have a selection
    let allSelected = true;
    attributeGroups.forEach(group => {
        const attrId = group.getAttribute('data-attribute-id');
        if (attrId && !selections[attrId]) {
            allSelected = false;
            group.classList.add('shake-error');
            setTimeout(() => group.classList.remove('shake-error'), 500);
        }
    });

    if (!allSelected && attributeGroups.length > 0) {
        showNotification("الرجاء اختيار جميع الخيارات أولاً", "error");
        return;
    }

    const optionIds = Object.values(selections);
    addToCart(productId, storeId, optionIds);
    hideOptions(productId);
}

/**
 * Core Add to Cart Network Action (Variation Aware)
 */
async function performAddToCart(productId, storeId, optionIds = []) {
    const norm = normalizeCartArgs(productId, storeId, optionIds);
    const csrfToken = getCookie('csrftoken');
    const payload = {
        product_id: norm.productId,
        quantity: 1,
        selected_options: norm.optionIds
    };

    let url = `/api/cart/add_item/`;
    if (norm.storeId) {
        url = window.siteConfig && window.siteConfig.addToCartUrl 
            ? window.siteConfig.addToCartUrl.replace('/0/', '/' + norm.productId + '/').replace('STORE_ID', norm.storeId)
            : `/add_to_cart/${norm.productId}/${norm.storeId}/`;
    }

    try {
        const response = await fetch(url, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'X-CSRFToken': csrfToken,
                'X-Requested-With': 'XMLHttpRequest'
            },
            body: JSON.stringify(payload)
        });

        const data = await response.json();
        if (data.success) {
            const itemCount = data.cart_item_count !== undefined ? data.cart_item_count : 1;
            const itemsCount = data.cart_items_count !== undefined ? data.cart_items_count : (data.cart ? data.cart.total_items : 1);
            
            updateLocalCartState(norm.productId, norm.optionIds, itemCount, itemsCount, data.cart_total);
            updateMobileCart(data);
            
            // Sync badges across page
            syncDomCartBadges(norm.productId, data);

            if (typeof animateCartElement === 'function') {
                animateCartElement('total-items');
                animateCartElement('mobile-cart-count');
            }

            if (typeof fbq !== 'undefined') {
                fbq('track', 'AddToCart', {
                    content_ids: [String(norm.productId)],
                    content_type: 'product',
                    variation_ids: norm.optionIds
                });
            }

            showNotification(data.message || "تمت إضافة المنتج إلى السلة بنجاح", "success");
            return data;
        } else {
            showNotification(data.message || "حدث خطأ أثناء إضافة المنتج إلى السلة", "error");
            return data;
        }
    } catch (err) {
        console.error('addToCart error:', err);
        showNotification("حدث خطأ في الاتصال بالسيرفر", "error");
    }
}

/**
 * Entry-point Add to Cart with Auth Interception
 */
function addToCart(productId, storeId, optionIds = []) {
    const norm = normalizeCartArgs(productId, storeId, optionIds);
    if (window.siteConfig && !window.siteConfig.isAuthenticated) {
        if (typeof window.openLoginModal === 'function') {
            window.openLoginModal(function () {
                return performAddToCart(norm.productId, norm.storeId, norm.optionIds);
            });
            return;
        }
    }
    return performAddToCart(norm.productId, norm.storeId, norm.optionIds);
}

/**
 * Core Remove from Cart Network Action (Variation Aware)
 */
async function performSubToCart(productId, storeId, optionIds = []) {
    const norm = normalizeCartArgs(productId, storeId, optionIds);
    const csrfToken = getCookie('csrftoken');
    const payload = {
        product_id: norm.productId,
        selected_options: norm.optionIds
    };

    let url = `/api/cart/sub_item/`;
    if (norm.storeId) {
        url = window.siteConfig && window.siteConfig.subToCartUrl
            ? window.siteConfig.subToCartUrl.replace('/0/', '/' + norm.productId + '/').replace('STORE_ID', norm.storeId)
            : `/sub_to_cart/${norm.productId}/${norm.storeId}/`;
    }

    try {
        const response = await fetch(url, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'X-CSRFToken': csrfToken,
                'X-Requested-With': 'XMLHttpRequest'
            },
            body: JSON.stringify(payload)
        });

        const data = await response.json();
        if (data.success) {
            const itemCount = data.cart_item_count !== undefined ? data.cart_item_count : 0;
            const itemsCount = data.cart_items_count !== undefined ? data.cart_items_count : (data.cart ? data.cart.total_items : 0);

            updateLocalCartState(norm.productId, norm.optionIds, itemCount, itemsCount, data.cart_total);
            updateMobileCart(data);
            syncDomCartBadges(norm.productId, data);

            if (typeof animateCartElement === 'function') {
                animateCartElement('total-items');
                animateCartElement('mobile-cart-count');
            }

            showNotification(data.message || "تم تحديث الكمية في السلة", "success");
            return data;
        } else {
            showNotification(data.message || "حدث خطأ أثناء تحديث السلة", "error");
            return data;
        }
    } catch (err) {
        console.error('subToCart error:', err);
        showNotification("حدث خطأ في الاتصال بالسيرفر", "error");
    }
}

/**
 * Entry-point Sub from Cart
 */
function subToCart(productId, storeId, optionIds = []) {
    const norm = normalizeCartArgs(productId, storeId, optionIds);
    return performSubToCart(norm.productId, norm.storeId, norm.optionIds);
}

/**
 * Sync UI Badge and Controls on Cart Updates
 */
function syncDomCartBadges(productId, data) {
    const totalItems = data.cart_items_count !== undefined ? data.cart_items_count : (data.cart ? data.cart.total_items : 0);
    const itemQty = data.cart_item_count !== undefined ? data.cart_item_count : 0;

    // Header badges
    document.querySelectorAll('#total-items, .floating-cart-badge, .cart-count-badge').forEach(el => {
        el.textContent = totalItems;
        if (totalItems > 0) el.classList.remove('hidden');
        else el.classList.add('hidden');
    });

    document.querySelectorAll('#total-items-mobile').forEach(el => {
        el.textContent = totalItems;
    });

    document.querySelectorAll('#mobile-cart-count, .cart-island-count').forEach(el => {
        el.textContent = totalItems;
    });

    // Product item quantity displays
    document.querySelectorAll(`#total-qty-items-${productId}, #quantity-${productId}`).forEach(el => {
        el.textContent = itemQty;
    });

    // Qty controls and Add button toggles
    const qtyCtrl = document.getElementById(`qty-ctrl-${productId}`);
    const addBtn = document.getElementById(`add-btn-${productId}`);
    const indicatorBadge = document.getElementById(`ib-${productId}`);

    if (itemQty > 0) {
        if (qtyCtrl) qtyCtrl.classList.remove('d-none');
        if (addBtn) addBtn.classList.add('d-none');
        if (indicatorBadge) indicatorBadge.style.display = 'block';
    } else {
        if (qtyCtrl) qtyCtrl.classList.add('d-none');
        if (addBtn) addBtn.classList.remove('d-none');
        if (indicatorBadge) indicatorBadge.style.display = 'none';
    }

    // Mobile cart bar
    const mobileCartBar = document.getElementById('mobileCartBar');
    if (mobileCartBar) {
        if (totalItems > 0) {
            mobileCartBar.classList.remove('d-none');
            if (mobileCartBar.parentElement && mobileCartBar.parentElement.classList.contains('cart-island-wrapper')) {
                mobileCartBar.parentElement.classList.remove('d-none');
            }
        } else {
            mobileCartBar.classList.add('d-none');
        }
    }

    // Mobile cart total
    if (data.cart_total !== undefined) {
        const estimatedFee = parseFloat((window.siteConfig && window.siteConfig.estimatedFee) || 0);
        document.querySelectorAll('#mobile-cart-total, .cart-island-total').forEach(el => {
            el.textContent = `${Math.floor(data.cart_total + estimatedFee)} ${data.currency || ''}`;
        });
    }
}

/**
 * Update mobile cart island info
 */
function updateMobileCart(data) {
    const countEl = document.querySelector('.cart-island-count');
    const totalEl = document.querySelector('.cart-island-total');
    const cartIsland = document.getElementById('mobileCartBar');

    const totalItems = data.total_items !== undefined ? data.total_items : (data.cart_items_count !== undefined ? data.cart_items_count : (data.cart ? data.cart.total_items : 0));
    const cartTotal = data.cart_total !== undefined ? data.cart_total : (data.cart ? data.cart.total_price : 0);

    if (cartIsland && totalItems > 0) {
        if (cartIsland.parentElement) cartIsland.parentElement.classList.remove('d-none');
        cartIsland.classList.remove('d-none');
        if (countEl) countEl.innerText = `${totalItems} منتجات`;
        if (totalEl && cartTotal !== undefined) totalEl.innerText = `${cartTotal} ${data.currency || ''}`;
    }
}

/**
 * Toast / Notification Helper
 */
function showToast(message, type = 'success') {
    if (typeof window.showNotification === 'function') {
        window.showNotification(message, type);
        return;
    }
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
    document.querySelectorAll('[data-option-id]').forEach(el => {
        const optId = el.getAttribute('data-option-id');
        const prodId = el.getAttribute('data-product-id');
        if (!optId || !prodId) return;

        const qty = getOptionTotalQty(prodId, optId);
        
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

// Attach globally
window.cartState = cartState;
window.refreshCartState = refreshCartState;
window.getVariationQty = getVariationQty;
window.updateLocalCartState = updateLocalCartState;
window.handleAddToCart = handleAddToCart;
window.showOptions = showOptions;
window.hideOptions = hideOptions;
window.selectOption = selectOption;
window.confirmOptions = confirmOptions;
window.performAddToCart = performAddToCart;
window.addToCart = addToCart;
window.performSubToCart = performSubToCart;
window.subToCart = subToCart;
window.getOptionTotalQty = getOptionTotalQty;
window.refreshAllProductBadges = refreshAllProductBadges;
