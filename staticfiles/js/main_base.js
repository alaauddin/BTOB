// main_base.js

// Global configuration object (passed from base.html)
window.siteConfig = window.siteConfig || {};

// Update greeting based on time of day
document.addEventListener('DOMContentLoaded', function () {
    const hour = new Date().getHours();
    const greetingText = document.getElementById('greeting-text');
    const greetingIcon = document.getElementById('greeting-icon');

    if (greetingText && greetingIcon) {
        if (hour >= 5 && hour < 12) {
            greetingText.textContent = 'صباح الخير';
            greetingIcon.className = 'fas fa-sun text-yellow-500 ml-2';
        } else if (hour >= 12 && hour < 17) {
            greetingText.textContent = 'طاب مساؤك';
            greetingIcon.className = 'fas fa-sun text-orange-500 ml-2';
        } else if (hour >= 17 && hour < 21) {
            greetingText.textContent = 'مساء الخير';
            greetingIcon.className = 'fas fa-moon text-indigo-500 ml-2';
        } else {
            greetingText.textContent = 'تصبح على خير';
            greetingIcon.className = 'fas fa-moon text-blue-500 ml-2';
        }
    }
});

(function () {
    // Unregister service workers (best-effort)
    if ('serviceWorker' in navigator) {
        try {
            navigator.serviceWorker.getRegistrations().then(regs => regs.forEach(r => { try { r.unregister(); } catch (e) { } }));
        } catch (e) { }
    }
})();

// Global helper: animate a cart/count element with a short scale effect
function animateCartElement(target) {
    try {
        var el = null;
        if (!target) {
            el = document.getElementById('total-items') || document.querySelector('.floating-cart-badge');
        } else if (typeof target === 'string') {
            el = document.getElementById(target) || document.querySelector(target);
        } else {
            el = target;
        }

        if (!el) return;

        // apply a transient transform for a pop effect
        el.style.transition = 'transform 260ms cubic-bezier(0.2, 0.8, 0.2, 1)';
        el.style.transform = 'scale(1.18)';
        // ensure reflow
        void el.offsetWidth;
        window.setTimeout(function () {
            el.style.transform = '';
        }, 260);
    } catch (e) {
        // fail silently
        console.warn('animateCartElement error', e);
    }
}

// Expose globally
window.animateCartElement = animateCartElement;

// Global helper: initialize modal handling (no-op safe implementation)
function initializeModalHandling() {
    try {
        // simple delegated toggles for data-modal-target attributes
        document.querySelectorAll('[data-modal-target]').forEach(function (btn) {
            if (btn.__modal_init) return; btn.__modal_init = true;
            btn.addEventListener('click', function (e) {
                var sel = btn.getAttribute('data-modal-target');
                if (!sel) return;
                var modal = document.querySelector(sel);
                if (!modal) return;
                modal.classList.toggle('hidden');
            });
        });

        // close buttons inside modals: data-modal-close
        document.querySelectorAll('[data-modal-close]').forEach(function (btn) {
            if (btn.__modal_close_init) return; btn.__modal_close_init = true;
            btn.addEventListener('click', function (e) {
                var modal = btn.closest('.modal') || document.querySelector(btn.getAttribute('data-modal-close'));
                if (modal) modal.classList.add('hidden');
            });
        });
    } catch (e) {
        console.warn('initializeModalHandling error', e);
    }
}

window.initializeModalHandling = initializeModalHandling;

// --- Auth & Login Modal Logic ---
let pendingAction = null;

window.openLoginModal = function (actionCallback) {
    const modal = document.getElementById('loginModal');
    if (modal) {
        modal.classList.remove('hidden');
        document.body.classList.add('overflow-hidden');
    }
    if (actionCallback) pendingAction = actionCallback;
    // Default to client tab
    switchLoginTab('client');
};

window.closeLoginModal = function () {
    const modal = document.getElementById('loginModal');
    if (modal) {
        modal.classList.add('hidden');
        document.body.classList.remove('overflow-hidden');
    }
    pendingAction = null;
    const errorDiv = document.getElementById('loginError');
    if (errorDiv) errorDiv.classList.add('hidden');
};

let currentActiveTab = 'client';

window.switchLoginTab = function (tab) {
    currentActiveTab = tab;
    const clientContent = document.getElementById('client-login-content');
    const merchantContent = document.getElementById('merchant-login-content');
    const clientTab = document.getElementById('tab-client');
    const merchantTab = document.getElementById('tab-merchant');
    const indicator = document.getElementById('tab-indicator');

    if (tab === 'client') {
        if (clientContent) clientContent.classList.remove('hidden');
        if (merchantContent) merchantContent.classList.add('hidden');
        if (clientTab) clientTab.classList.add('active');
        if (merchantTab) merchantTab.classList.remove('active');
        if (indicator) indicator.style.transform = 'translateX(0)';
    } else {
        if (clientContent) clientContent.classList.add('hidden');
        if (merchantContent) merchantContent.classList.remove('hidden');
        if (merchantTab) merchantTab.classList.add('active');
        if (clientTab) clientTab.classList.remove('active');
        // Move indicator to the start (left in RTL)
        if (indicator) indicator.style.transform = 'translateX(-100%)';
    }
    const errorDiv = document.getElementById('loginError');
    if (errorDiv) errorDiv.classList.add('hidden');
};

window.handleLoginSubmit = function () {
    if (currentActiveTab === 'client') {
        handleClientAuthSubmit();
    } else {
        handleMerchantAuthSubmit();
    }
};

function handleClientAuthSubmit() {
    const phone = document.getElementById('auth_phone').value;
    const errorDiv = document.getElementById('loginError');
    const submitBtn = document.getElementById('authSubmitBtn');
    const csrftoken = getCookie('csrftoken');
    const privacyCheckbox = document.getElementById('privacy_policy_checkbox');

    // Validate privacy policy checkbox
    if (privacyCheckbox && !privacyCheckbox.checked) {
        errorDiv.querySelector('.error-text').textContent = 'يجب الموافقة على سياسة الخصوصية للمتابعة';
        errorDiv.classList.remove('hidden');
        privacyCheckbox.focus();
        return;
    }

    if (!phone) {
        errorDiv.querySelector('.error-text').textContent = 'رقم الهاتف مطلوب';
        errorDiv.classList.remove('hidden');
        return;
    }

    const originalText = submitBtn.textContent;
    submitBtn.disabled = true;
    submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin ml-2"></i> جاري المعالجة...';
    errorDiv.classList.add('hidden');

    fetch('/api/unified-auth/', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'X-CSRFToken': csrftoken
        },
        body: JSON.stringify({ phone })
    })
        .then(response => response.json())
        .then(data => {
            if (data.success) {
                showNotification(data.message, 'success');
                handlePostAuth(data);
            } else {
                errorDiv.querySelector('.error-text').textContent = data.message || 'حدث خطأ غير متوقع';
                errorDiv.classList.remove('hidden');
            }
        })
        .catch(error => {
            console.error(error);
            errorDiv.querySelector('.error-text').textContent = 'حدث خطأ في الاتصال';
            errorDiv.classList.remove('hidden');
        })
        .finally(() => {
            submitBtn.disabled = false;
            submitBtn.innerHTML = originalText;
        });
}

function handleMerchantAuthSubmit() {
    const username = document.getElementById('merchant_username').value;
    const password = document.getElementById('merchant_password').value;
    const errorDiv = document.getElementById('loginError');
    const submitBtn = document.getElementById('authSubmitBtn');
    const csrftoken = getCookie('csrftoken');

    if (!username || !password) {
        errorDiv.querySelector('.error-text').textContent = 'اسم المستخدم وكلمة المرور مطلوبان';
        errorDiv.classList.remove('hidden');
        return;
    }

    const originalText = submitBtn.textContent;
    submitBtn.disabled = true;
    submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin ml-2"></i> جاري الدخول...';
    errorDiv.classList.add('hidden');

    fetch('/api/merchant-login/', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'X-CSRFToken': csrftoken
        },
        body: JSON.stringify({ username, password })
    })
        .then(response => response.json())
        .then(data => {
            if (data.success) {
                showNotification(data.message, 'success');
                if (data.redirect_url) {
                    window.location.href = data.redirect_url;
                } else {
                    window.location.reload();
                }
            } else {
                errorDiv.querySelector('.error-text').textContent = data.message || 'حدث خطأ غير متوقع';
                errorDiv.classList.remove('hidden');
            }
        })
        .catch(error => {
            console.error(error);
            errorDiv.querySelector('.error-text').textContent = 'حدث خطأ في الاتصال';
            errorDiv.classList.remove('hidden');
        })
        .finally(() => {
            submitBtn.disabled = false;
            submitBtn.innerHTML = originalText;
        });
}

function handlePostAuth(data) {
    const actionToRun = pendingAction;
    closeLoginModal();
    document.body.classList.remove('overflow-hidden');
    window.siteConfig.isAuthenticated = true;

    if (actionToRun) {
        const actionResult = actionToRun();
        if (actionResult && typeof actionResult.always === 'function') {
            actionResult.always(() => window.location.reload());
        } else if (actionResult && typeof actionResult.then === 'function') {
            actionResult.then(() => window.location.reload()).catch(() => window.location.reload());
        } else {
            window.location.reload();
        }
    } else {
        window.location.reload();
    }
}

// --- Cart Logic ---
window.performAddToCart = function (productId, supplierId, selectedOptions = []) {
    if (typeof performAddToCart === 'function' && window.performAddToCart !== performAddToCart) {
        return performAddToCart(productId, supplierId, selectedOptions);
    }

    const csrftoken = getCookie('csrftoken');

    // --- Optimistic Update ---
    const totalItemsEl = document.getElementById('total-items');
    const totalItemsMobileEl = document.getElementById('total-items-mobile');
    const mobileCartCountEl = document.getElementById('mobile-cart-count');
    const itemQtyEl = document.getElementById('total-qty-items-' + productId);
    const quantityLabelEl = document.getElementById('quantity-' + productId);

    const prevTotal = totalItemsEl ? (parseInt(totalItemsEl.textContent) || 0) : 0;
    const prevItemQty = itemQtyEl ? (parseInt(itemQtyEl.textContent) || 0) : 0;

    // Update UI immediately
    if (totalItemsEl) {
        totalItemsEl.textContent = prevTotal + 1;
        totalItemsEl.classList.remove('hidden');
    }
    if (totalItemsMobileEl) totalItemsMobileEl.textContent = prevTotal + 1;
    if (mobileCartCountEl) mobileCartCountEl.textContent = prevTotal + 1;
    if (itemQtyEl) itemQtyEl.textContent = prevItemQty + 1;
    if (quantityLabelEl) quantityLabelEl.textContent = prevItemQty + 1;

    const ibEl = document.getElementById('ib-' + productId);
    if (ibEl) ibEl.style.display = 'block';
    const qtyCtrlEl = document.getElementById('qty-ctrl-' + productId);
    if (qtyCtrlEl) qtyCtrlEl.classList.remove('d-none');
    const addBtnEl = document.getElementById('add-btn-' + productId);
    if (addBtnEl) addBtnEl.classList.add('d-none');
    const mobileCartBar = document.getElementById('mobileCartBar');
    if (mobileCartBar) mobileCartBar.classList.remove('d-none');

    animateCartElement('total-items');
    animateCartElement('mobile-cart-count');
    // ---------------------------

    const url = window.siteConfig && window.siteConfig.addToCartUrl 
        ? window.siteConfig.addToCartUrl.replace('/0/', '/' + productId + '/').replace('STORE_ID', supplierId)
        : `/add_to_cart/${productId}/${supplierId}/`;

    return fetch(url, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'X-CSRFToken': csrftoken,
            'X-Requested-With': 'XMLHttpRequest'
        },
        body: JSON.stringify({ selected_options: selectedOptions, quantity: 1 })
    })
    .then(response => {
        if (!response.ok) {
            return response.json().then(err => Promise.reject(err));
        }
        return response.json();
    })
    .then(response => {
        // Sync with server state
        if (totalItemsEl) {
            totalItemsEl.textContent = response.cart_items_count;
            if (response.cart_items_count > 0) totalItemsEl.classList.remove('hidden');
            else totalItemsEl.classList.add('hidden');
        }
        if (totalItemsMobileEl) totalItemsMobileEl.textContent = response.cart_items_count;
        if (itemQtyEl) itemQtyEl.textContent = response.cart_item_count;
        if (quantityLabelEl) quantityLabelEl.textContent = response.cart_item_count;
        if (mobileCartCountEl) mobileCartCountEl.textContent = response.cart_items_count;

        if (response.cart_total !== undefined) {
            const estimatedFee = parseFloat(window.siteConfig.estimatedFee || 0);
            const mobileTotalEl = document.getElementById('mobile-cart-total');
            if (mobileTotalEl) mobileTotalEl.textContent = Math.floor(response.cart_total + estimatedFee);
        }

        if (mobileCartBar) {
            if (response.cart_items_count > 0) mobileCartBar.classList.remove('d-none');
            else mobileCartBar.classList.add('d-none');
        }

        if (typeof updateLocalCartState === 'function') {
            updateLocalCartState(productId, selectedOptions, response.cart_item_count, response.cart_items_count, response.cart_total);
        }

        showNotification('تمت إضافة المنتج إلى السلة بنجاح', 'success');

        // Meta Pixel: AddToCart event
        if (typeof fbq !== 'undefined') {
            fbq('track', 'AddToCart', {
                content_ids: [String(productId)],
                content_type: 'product',
                variation_ids: selectedOptions
            });
        }
        return response;
    })
    .catch(err => {
        // --- Rollback ---
        if (totalItemsEl) {
            totalItemsEl.textContent = prevTotal;
            if (prevTotal === 0) totalItemsEl.classList.add('hidden');
        }
        if (totalItemsMobileEl) totalItemsMobileEl.textContent = prevTotal;
        if (mobileCartCountEl) mobileCartCountEl.textContent = prevTotal;
        if (itemQtyEl) itemQtyEl.textContent = prevItemQty;
        if (quantityLabelEl) quantityLabelEl.textContent = prevItemQty;

        if (prevItemQty === 0) {
            if (ibEl) ibEl.style.display = 'none';
            if (qtyCtrlEl) qtyCtrlEl.classList.add('d-none');
            if (addBtnEl) addBtnEl.classList.remove('d-none');
        }
        if (prevTotal === 0 && mobileCartBar) {
            mobileCartBar.classList.add('d-none');
        }
        // -----------------

        const message = (err && err.message) ? err.message : 'حدث خطأ أثناء إضافة المنتج إلى السلة';
        showNotification(message, 'error');
    });
};

window.addToCart = function (productId, supplierId, selectedOptions = []) {
    if (!window.siteConfig.isAuthenticated) {
        openLoginModal(function () {
            return window.performAddToCart(productId, supplierId, selectedOptions);
        });
    } else {
        return window.performAddToCart(productId, supplierId, selectedOptions);
    }
};

window.subToCart = function (productId, supplierId, selectedOptions = []) {
    const csrftoken = getCookie('csrftoken');

    // --- Optimistic Update ---
    const totalItemsEl = document.getElementById('total-items');
    const totalItemsMobileEl = document.getElementById('total-items-mobile');
    const mobileCartCountEl = document.getElementById('mobile-cart-count');
    const itemQtyEl = document.getElementById('total-qty-items-' + productId);
    const quantityLabelEl = document.getElementById('quantity-' + productId);

    const prevTotal = totalItemsEl ? (parseInt(totalItemsEl.textContent) || 0) : 0;
    const prevItemQty = itemQtyEl ? (parseInt(itemQtyEl.textContent) || 0) : 0;

    if (prevItemQty <= 0) return;

    // Update UI immediately
    const newTotal = Math.max(0, prevTotal - 1);
    const newItemQty = prevItemQty - 1;

    if (totalItemsEl) {
        totalItemsEl.textContent = newTotal;
        if (newTotal === 0) totalItemsEl.classList.add('hidden');
    }
    if (totalItemsMobileEl) totalItemsMobileEl.textContent = newTotal;
    if (mobileCartCountEl) mobileCartCountEl.textContent = newTotal;
    if (itemQtyEl) itemQtyEl.textContent = newItemQty;
    if (quantityLabelEl) quantityLabelEl.textContent = newItemQty;

    const ibEl = document.getElementById('ib-' + productId);
    const qtyCtrlEl = document.getElementById('qty-ctrl-' + productId);
    const addBtnEl = document.getElementById('add-btn-' + productId);
    const mobileCartBar = document.getElementById('mobileCartBar');

    if (newItemQty === 0) {
        if (ibEl) ibEl.style.display = 'none';
        if (qtyCtrlEl) qtyCtrlEl.classList.add('d-none');
        if (addBtnEl) addBtnEl.classList.remove('d-none');
    }

    if (newTotal === 0 && mobileCartBar) {
        mobileCartBar.classList.add('d-none');
    }

    animateCartElement('total-items');
    animateCartElement('mobile-cart-count');
    // ---------------------------

    const url = window.siteConfig && window.siteConfig.subToCartUrl
        ? window.siteConfig.subToCartUrl.replace('/0/', '/' + productId + '/').replace('STORE_ID', supplierId)
        : `/sub_to_cart/${productId}/${supplierId}/`;

    return fetch(url, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'X-CSRFToken': csrftoken,
            'X-Requested-With': 'XMLHttpRequest'
        },
        body: JSON.stringify({ selected_options: selectedOptions })
    })
    .then(response => {
        if (!response.ok) {
            return response.json().then(err => Promise.reject(err));
        }
        return response.json();
    })
    .then(response => {
        // Sync with server state
        if (totalItemsEl) {
            totalItemsEl.textContent = response.cart_items_count;
            if (response.cart_items_count > 0) totalItemsEl.classList.remove('hidden');
            else totalItemsEl.classList.add('hidden');
        }
        if (totalItemsMobileEl) totalItemsMobileEl.textContent = response.cart_items_count;
        if (itemQtyEl) itemQtyEl.textContent = response.cart_item_count;
        if (quantityLabelEl) quantityLabelEl.textContent = response.cart_item_count;
        if (mobileCartCountEl) mobileCartCountEl.textContent = response.cart_items_count;

        if (response.cart_total !== undefined) {
            const estimatedFee = parseFloat(window.siteConfig.estimatedFee || 0);
            const mobileTotalEl = document.getElementById('mobile-cart-total');
            if (mobileTotalEl) mobileTotalEl.textContent = Math.floor(response.cart_total + estimatedFee);
        }

        if (mobileCartBar) {
            if (response.cart_items_count === 0) mobileCartBar.classList.add('d-none');
            else mobileCartBar.classList.remove('d-none');
        }

        if (typeof updateLocalCartState === 'function') {
            updateLocalCartState(productId, selectedOptions, response.cart_item_count, response.cart_items_count, response.cart_total);
        }

        showNotification('تم تحديث الكمية في السلة', 'success');
        return response;
    })
    .catch(err => {
        // --- Rollback ---
        if (totalItemsEl) {
            totalItemsEl.textContent = prevTotal;
            if (prevTotal > 0) totalItemsEl.classList.remove('hidden');
        }
        if (totalItemsMobileEl) totalItemsMobileEl.textContent = prevTotal;
        if (mobileCartCountEl) mobileCartCountEl.textContent = prevTotal;
        if (itemQtyEl) itemQtyEl.textContent = prevItemQty;
        if (quantityLabelEl) quantityLabelEl.textContent = prevItemQty;

        if (ibEl) ibEl.style.display = 'block';
        if (qtyCtrlEl) qtyCtrlEl.classList.remove('d-none');
        if (addBtnEl) addBtnEl.classList.add('d-none');
        if (mobileCartBar) mobileCartBar.classList.remove('d-none');
        // -----------------
        const message = (err && err.message) ? err.message : 'حدث خطأ أثناء تحديث السلة';
        showNotification(message, 'error');
    });
};

window.performToggleWishlist = function (productId) {
    const btn = document.querySelector(`[data-product-id="${productId}"] .wishlist-btn-float`) ||
        document.querySelector(`[data-product-id="${productId}"] .wishlist-btn`) ||
        document.querySelector(`.wishlist-btn[data-product-id="${productId}"]`);

    if (!btn) {
        console.error('Wishlist button not found for product:', productId);
        return;
    }

    const icon = btn.querySelector('i');
    const csrftoken = getCookie('csrftoken');

    // Optimistic UI update
    const isCurrentlyActive = btn.classList.contains('active');

    // Toggle visual state immediately
    btn.classList.toggle('active');
    if (icon) {
        icon.className = isCurrentlyActive ? 'far fa-heart' : 'fas fa-heart';
    }

    // Add subtle pop animation
    btn.style.transition = 'transform 0.2s cubic-bezier(0.175, 0.885, 0.32, 1.275)';
    btn.style.transform = 'scale(1.25)';
    setTimeout(() => btn.style.transform = 'scale(1)', 200);

    // Use jQuery if available, fallback to fetch if not (though performToggle is usually called after login which implies page load)
    if (typeof $ !== 'undefined') {
        return $.ajax({
            url: `/wishlist/toggle/${productId}/`,
            type: "POST",
            headers: {
                'X-CSRFToken': csrftoken,
                'X-Requested-With': 'XMLHttpRequest'
            },
            success: function (response) {
                if (response.success) {
                    if (response.message) showNotification(response.message, 'success');
                } else {
                    btn.classList.toggle('active');
                    if (icon) icon.className = isCurrentlyActive ? 'fas fa-heart' : 'far fa-heart';
                    showNotification(response.message || 'حدث خطأ أثناء تحديث قائمة الأمنيات', 'error');
                }
            },
            error: function (xhr) {
                btn.classList.toggle('active');
                if (icon) icon.className = isCurrentlyActive ? 'fas fa-heart' : 'far fa-heart';
                const message = (xhr.responseJSON && xhr.responseJSON.message) ? xhr.responseJSON.message : 'حدث خطأ في الاتصال';
                showNotification(message, 'error');
            }
        });
    } else {
        return fetch(`/wishlist/toggle/${productId}/`, {
            method: 'POST',
            headers: {
                'X-CSRFToken': csrftoken,
                'X-Requested-With': 'XMLHttpRequest',
                'Content-Type': 'application/json'
            }
        })
            .then(res => res.json())
            .then(data => {
                if (data.success) {
                    if (data.message) showNotification(data.message, 'success');
                } else {
                    btn.classList.toggle('active');
                    if (icon) icon.className = isCurrentlyActive ? 'fas fa-heart' : 'far fa-heart';
                    showNotification(data.message || 'حدث خطأ أثناء تحديث قائمة الأمنيات', 'error');
                }
            })
            .catch(err => {
                btn.classList.toggle('active');
                if (icon) icon.className = isCurrentlyActive ? 'fas fa-heart' : 'far fa-heart';
                showNotification('حدث خطأ في الاتصال', 'error');
            });
    }
};

window.toggleWishlist = function (productId) {
    if (!window.siteConfig.isAuthenticated) {
        if (typeof openLoginModal === 'function') {
            openLoginModal(function () {
                return window.performToggleWishlist(productId);
            });
        } else {
            window.location.href = '/login/';
        }
    } else {
        window.performToggleWishlist(productId);
    }
};

// Helper to get CSRF token
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

window.getCookie = getCookie;

/**
 * Track a WhatsApp inquiry button click for analytics.
 * Fire-and-forget — silently ignores errors so it never blocks navigation.
 * @param {number} productId - The product being inquired about.
 */
function trackWaInquiry(productId) {
    fetch(`/wa-inquiry-click/${productId}/`, {
        method: 'POST',
        headers: {
            'X-CSRFToken': getCookie('csrftoken'),
            'X-Requested-With': 'XMLHttpRequest'
        }
    }).catch(() => { });
}
window.trackWaInquiry = trackWaInquiry;


window.handlePhoneValidation = function (input) {
    const errorMsg = document.getElementById('phone-validation-msg');
    const submitBtn = document.getElementById('authSubmitBtn');
    const val = input.value;

    // Yemeni mobile prefixes: 70, 71, 73, 77, 78
    // Total length excluding country code is 9 digits
    const yemeniMobileRegex = /^(70|71|73|77|78)[0-9]{7}$/;

    if (val.length === 0) {
        if (errorMsg) errorMsg.classList.add('hidden');
        input.classList.remove('border-red-500', 'text-red-900', 'focus:ring-red-500');
        input.classList.add('border-gray-100', 'focus:ring-[var(--primary-color)]');
        if (submitBtn) submitBtn.disabled = false;
        return;
    }

    if (val.length === 9) {
        if (!yemeniMobileRegex.test(val)) {
            if (errorMsg) {
                errorMsg.textContent = 'رقم غير صحيح. يرجى التأكد من أن الرقم يبدأ بـ 77, 73, 71, 70 او 78';
                errorMsg.classList.remove('hidden');
            }
            input.classList.add('border-red-500', 'text-red-900', 'focus:ring-red-500');
            input.classList.remove('border-gray-100', 'focus:ring-[var(--primary-color)]');
            if (submitBtn) submitBtn.disabled = true;
        } else {
            if (errorMsg) errorMsg.classList.add('hidden');
            input.classList.remove('border-red-500', 'text-red-900', 'focus:ring-red-500');
            input.classList.add('border-green-500', 'focus:ring-green-500'); // Green for valid
            if (submitBtn) submitBtn.disabled = false;
        }
    } else {
        // Formatting while typing
        if (errorMsg) errorMsg.classList.add('hidden');
        input.classList.remove('border-red-500', 'text-red-900', 'focus:ring-red-500', 'border-green-500', 'focus:ring-green-500');
        input.classList.add('border-gray-100', 'focus:ring-[var(--primary-color)]');
        if (submitBtn) submitBtn.disabled = false;
    }
};

window.showNotification = function (message, type = 'info') {
    // Define colors based on type using CSS variables
    const config = {
        success: { icon: 'fa-check-circle', color: 'var(--success-color)', bg: 'rgba(34, 197, 94, 0.95)' },
        error: { icon: 'fa-exclamation-circle', color: 'var(--danger-color)', bg: 'rgba(239, 68, 68, 0.95)' },
        warning: { icon: 'fa-exclamation-triangle', color: 'var(--warning-color)', bg: 'rgba(251, 191, 36, 0.95)' },
        info: { icon: 'fa-info-circle', color: 'var(--primary-color)', bg: 'var(--primary-color)' }
    };

    const styles = config[type] || config.info;

    const notification = document.createElement('div');

    // Fixed positioning with explicit z-index and top offset to clear navbar
    notification.className = 'fixed top-24 left-4 right-4 md:left-auto md:right-6 md:w-auto md:max-w-sm rounded-xl shadow-lg text-white transform transition-all duration-300 ease-out flex items-stretch overflow-hidden';

    notification.style.zIndex = '99999'; // Ensure it's above everything including navbar (z-50)
    notification.style.backgroundColor = '#ffffff';
    notification.style.borderLeft = `6px solid ${styles.color}`;
    notification.style.color = '#333';

    // Glass effect styles
    notification.style.backdropFilter = 'blur(12px)';
    notification.style.border = '1px solid rgba(255,255,255,0.4)';

    // Initial State for Animation
    notification.style.opacity = '0';
    notification.style.transform = 'translateY(-20px)';

    notification.innerHTML = `
        <div class="flex items-center p-3 md:p-4 w-full" style="background-color: rgba(255, 255, 255, 0.8);">
            <div class="flex-shrink-0 ml-3">
                <i class="fas ${styles.icon} text-xl md:text-2xl" style="color: ${styles.color}"></i>
            </div>
            <div class="flex-1 mr-2">
                <p class="text-sm md:text-base font-bold text-gray-800 leading-tight">${message}</p>
            </div>
            <button onclick="this.closest('div.fixed').remove()" class="mr-3 text-gray-400 hover:text-gray-600 transition-colors">
                <i class="fas fa-times"></i>
            </button>
        </div>
    `;

    // Add to page
    document.body.appendChild(notification);

    // Animate in
    requestAnimationFrame(() => {
        requestAnimationFrame(() => {
            notification.style.opacity = '1';
            notification.style.transform = 'translateY(0)';
        });
    });

    // Auto Remove
    setTimeout(() => {
        notification.style.opacity = '0';
        notification.style.transform = 'translateY(-20px)';
        setTimeout(() => {
            if (notification.parentNode) notification.parentNode.removeChild(notification);
        }, 300);
    }, 4000);
};

// No-op loader stubs (loader removed)
document.addEventListener('DOMContentLoaded', function () {
    window.showPageLoader = function () { };
    window.hidePageLoader = function () { };

    function setupDropdown(btnId, dropdownId) {
        const btn = document.getElementById(btnId);
        const dropdown = document.getElementById(dropdownId);

        if (btn && dropdown) {
            btn.addEventListener('click', function (e) {
                e.stopPropagation();
                dropdown.classList.toggle('hidden');
            });

            // Close when clicking outside
            document.addEventListener('click', function (e) {
                if (!btn.contains(e.target) && !dropdown.contains(e.target)) {
                    dropdown.classList.add('hidden');
                }
            });
        }
    }

    setupDropdown('user-menu-button', 'user-dropdown');
    setupDropdown('guest-menu-button', 'guest-dropdown');

    // --- Password Reset Logic ---
    window.togglePasswordReset = function (show) {
        const loginForm = document.getElementById('merchantAuthForm');
        const merchantContent = document.getElementById('merchant-login-content');
        const resetContent = document.getElementById('password-reset-content');

        if (show) {
            if (loginForm) loginForm.classList.add('hidden');
            if (resetContent) resetContent.classList.remove('hidden');
            if (merchantContent) {
                merchantContent.querySelector('h3').classList.add('hidden');
                merchantContent.querySelector('.mb-3').classList.add('hidden');
                merchantContent.querySelector('p').classList.add('hidden');
            }
        } else {
            if (loginForm) loginForm.classList.remove('hidden');
            if (resetContent) resetContent.classList.add('hidden');
            if (merchantContent) {
                merchantContent.querySelector('h3').classList.remove('hidden');
                merchantContent.querySelector('.mb-3').classList.remove('hidden');
                merchantContent.querySelector('p').classList.remove('hidden');
            }
            const resetUsername = document.getElementById('reset_username');
            if (resetUsername) resetUsername.value = '';
            const statusContainer = document.getElementById('reset-status-container');
            if (statusContainer) {
                statusContainer.classList.add('hidden');
                statusContainer.innerHTML = '';
            }
        }
    };

    window.handlePasswordResetRequest = function (isForgotBoth = false) {
        const phoneEl = document.getElementById('reset_phone');
        const phone = isForgotBoth ? '' : phoneEl.value;
        const submitBtn = document.getElementById('reset-submit-btn');
        const statusContainer = document.getElementById('reset-status-container');

        if (!isForgotBoth && !phone) {
            showNotification('يرجى إدخال رقم الهاتف', 'error');
            return;
        }

        if (submitBtn) {
            submitBtn.disabled = true;
            submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin ml-2"></i>جاري التحقق...';
        }

        fetch('/api/password-reset-request/', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'X-CSRFToken': getCookie('csrftoken')
            },
            body: JSON.stringify({ phone: phone })
        })
            .then(response => response.json())
            .then(data => {
                if (statusContainer) statusContainer.classList.remove('hidden');
                if (data.success) {
                    if (data.is_forgot_both) {
                        if (statusContainer) {
                            statusContainer.className = 'rounded-xl p-4 text-right bg-blue-50 text-blue-700 text-[11px] border border-blue-100 space-y-3';
                            const message = encodeURIComponent(`مرحباً، لقد نسيت رقم الهاتف وكلمة المرور الخاصة بي. أحتاج للمساعدة في استعادة بيانات حسابي.`);
                            const whatsappUrl = `https://wa.me/${data.support_phone}?text=${message}`;
                            statusContainer.innerHTML = `
                            <p class="font-bold mb-2">استعادة بيانات الحساب</p>
                            <p>${data.message}</p>
                            <div class="space-y-2 mt-3">
                                <a href="${whatsappUrl}" target="_blank" class="flex items-center justify-center gap-2 w-full py-2.5 bg-blue-600 text-white rounded-xl font-bold hover:bg-blue-700 transition-all">
                                    <i class="fab fa-whatsapp text-lg"></i>
                                    تواصل مع الدعم الفني
                                </a>
                                <button type="button" onclick="togglePasswordReset(false)" class="w-full py-2.5 bg-gray-800 text-white rounded-xl font-bold text-[10px] hover:bg-gray-900 transition-all">
                                    العودة لتسجيل الدخول
                                </button>
                            </div>
                        `;
                        }
                    } else {
                        if (statusContainer) {
                            statusContainer.className = 'rounded-xl p-4 text-right bg-green-50 text-green-700 text-[11px] border border-green-100 space-y-3';
                            const message = encodeURIComponent(`مرحباً، لقد قمت بطلب استعادة كلمة المرور لحسابي (${data.phone}).`);
                            const whatsappUrl = `https://wa.me/${data.support_phone}?text=${message}`;
                            statusContainer.innerHTML = `
                        <p class="font-bold mb-2">تم تحديث كلمة المرور!</p>
                        <p>${data.message}</p>
                        <div class="space-y-2 mt-3">
                            <a href="${whatsappUrl}" target="_blank" class="flex items-center justify-center gap-2 w-full py-2.5 bg-green-600 text-white rounded-xl font-bold hover:bg-green-700 transition-all text-xs">
                                <i class="fab fa-whatsapp text-lg"></i>
                                متابعة الطلب في واتساب
                            </a>
                            <button type="button" onclick="togglePasswordReset(false); document.getElementById('merchant_username').value='${data.phone}';" class="w-full py-2.5 bg-gray-800 text-white rounded-xl font-bold text-[10px] hover:bg-gray-900 transition-all">
                                الذهاب لصفحة تسجيل الدخول
                            </button>
                        </div>
                    `;
                        }
                    }
                    if (submitBtn) submitBtn.classList.add('hidden');
                } else {
                    if (statusContainer) {
                        statusContainer.className = 'rounded-xl p-3 text-right bg-red-50 text-red-600 text-[11px] border border-red-100';
                        statusContainer.innerHTML = `<i class="fas fa-exclamation-circle ml-2"></i>${data.message}`;
                    }
                    if (submitBtn) {
                        submitBtn.innerHTML = 'تحقق من الحساب';
                        submitBtn.disabled = false;
                    }
                }
            })
            .catch(error => {
                console.error('Error:', error);
                showNotification('حدث خطأ في النظام. يرجى المحاولة لاحقاً.', 'error');
                if (submitBtn) {
                    submitBtn.disabled = false;
                    submitBtn.innerHTML = 'تحقق من الحساب';
                }
            });
    };
    // ---------------------------

    // Global Password Toggle Helper
    window.togglePasswordVisibility = function (inputId, iconId) {
        const passwordInput = document.getElementById(inputId);
        const toggleIcon = document.getElementById(iconId);

        if (passwordInput.type === 'password') {
            passwordInput.type = 'text';
            toggleIcon.classList.remove('fa-eye');
            toggleIcon.classList.add('fa-eye-slash');
        } else {
            passwordInput.type = 'password';
            toggleIcon.classList.remove('fa-eye-slash');
            toggleIcon.classList.add('fa-eye');
        }
    };

    // --- UI/UX Enhanced Scrolling Dynamics ---
    const navbar = document.querySelector('.curved-navbar');
    if (navbar) {
        window.addEventListener('scroll', function () {
            let scrollTop = window.pageYOffset || document.documentElement.scrollTop;

            if (scrollTop > 50) {
                navbar.classList.add('navbar-scrolled');
            } else {
                navbar.classList.remove('navbar-scrolled');
            }
        }, { passive: true });
    }

});

// Intercept Google Login in Modal
document.addEventListener('DOMContentLoaded', function () {
    const googleBtn = document.getElementById('google-login-modal');
    const privacyCheckbox = document.getElementById('privacy_policy_checkbox');
    const privacyErrorMsg = document.getElementById('loginError');

    if (googleBtn && privacyCheckbox) {
        googleBtn.addEventListener('click', function (e) {
            if (!privacyCheckbox.checked) {
                e.preventDefault();
                if (privacyErrorMsg) {
                    privacyErrorMsg.querySelector('.error-text').textContent = 'يجب الموافقة على سياسة الخصوصية للمتابعة';
                    privacyErrorMsg.classList.remove('hidden');
                }
                privacyCheckbox.focus();
            }
        });
    }
});

// === User Dropdown Menu Functions ===
window.toggleUserDropdown = function (event) {
    event.stopPropagation();
    const dropdown = document.getElementById('userDropdownMenu');
    if (dropdown) {
        dropdown.classList.toggle('hidden');
    }
};

window.closeUserDropdown = function () {
    const dropdown = document.getElementById('userDropdownMenu');
    if (dropdown) {
        dropdown.classList.add('hidden');
    }
};

// Close dropdown when clicking outside
document.addEventListener('click', function (event) {
    const dropdown = document.getElementById('userDropdownMenu');
    const button = document.getElementById('userMenuBtn');

    if (dropdown && button &&
        !dropdown.contains(event.target) &&
        !button.contains(event.target)) {
        dropdown.classList.add('hidden');
    }
});
