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
    if (modal) modal.classList.remove('hidden');
    if (actionCallback) pendingAction = actionCallback;
    // Default to client tab
    switchLoginTab('client');
};

window.closeLoginModal = function () {
    const modal = document.getElementById('loginModal');
    if (modal) modal.classList.add('hidden');
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
    const privacyContainer = document.querySelector('#loginModal .bg-gray-50 .mb-4.text-right');
    const indicator = document.getElementById('tab-indicator');

    if (tab === 'client') {
        if (clientContent) clientContent.classList.remove('hidden');
        if (merchantContent) merchantContent.classList.add('hidden');
        if (clientTab) clientTab.classList.add('active');
        if (merchantTab) merchantTab.classList.remove('active');
        if (indicator) indicator.style.transform = 'translateX(0)';
        if (privacyContainer) privacyContainer.style.display = 'block';
    } else {
        if (clientContent) clientContent.classList.add('hidden');
        if (merchantContent) merchantContent.classList.remove('hidden');
        if (merchantTab) merchantTab.classList.add('active');
        if (clientTab) clientTab.classList.remove('active');
        // Move indicator to the start (left in RTL)
        if (indicator) indicator.style.transform = 'translateX(-100%)';
        if (privacyContainer) privacyContainer.style.display = 'none';
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
function waitForJQuery(callback) {
    if (typeof $ !== 'undefined') {
        callback();
    } else {
        setTimeout(function () {
            waitForJQuery(callback);
        }, 100);
    }
}

waitForJQuery(function () {
    window.performAddToCart = function (productId, supplierId) {
        const csrftoken = getCookie('csrftoken');

        // --- Optimistic Update ---
        const totalItemsEl = $('#total-items');
        const totalItemsMobileEl = $('#total-items-mobile');
        const mobileCartCountEl = $('#mobile-cart-count');
        const itemQtyEl = $('#total-qty-items-' + productId);
        const quantityLabelEl = $("#quantity-" + productId);

        const prevTotal = parseInt(totalItemsEl.first().text()) || 0;
        const prevItemQty = parseInt(itemQtyEl.first().text()) || 0;

        // Update UI immediately
        totalItemsEl.text(prevTotal + 1);
        totalItemsMobileEl.text(prevTotal + 1);
        mobileCartCountEl.text(prevTotal + 1);
        itemQtyEl.text(prevItemQty + 1);
        quantityLabelEl.html(prevItemQty + 1);

        $('#ib-' + productId).show();
        $('#qty-ctrl-' + productId).removeClass('d-none');
        $('#add-btn-' + productId).addClass('d-none');
        $('#mobileCartBar').removeClass('d-none');

        animateCartElement('total-items');
        animateCartElement('mobile-cart-count');
        // ---------------------------

        const url = window.siteConfig.addToCartUrl.replace('/0/', '/' + productId + '/').replace('STORE_ID', supplierId);

        return $.ajax({
            url: url,
            type: "POST",
            headers: { "X-CSRFToken": csrftoken },
            success: function (response) {
                // Sync with server state
                $('#total-items').text(response.cart_items_count);
                $('#total-items-mobile').text(response.cart_items_count);
                $('#total-qty-items-' + productId).text(response.cart_item_count);
                $("#quantity-" + productId).html(response.cart_item_count);
                $('#mobile-cart-count').text(response.cart_items_count);

                if (response.cart_total !== undefined) {
                    const estimatedFee = parseFloat(window.siteConfig.estimatedFee || 0);
                    $('#mobile-cart-total').text(Math.floor(response.cart_total + estimatedFee));
                }

                if (response.cart_items_count > 0) {
                    $('#mobileCartBar').removeClass('d-none');
                } else {
                    $('#mobileCartBar').addClass('d-none');
                }

                showNotification('تمت إضافة المنتج إلى السلة بنجاح', 'success');
            },
            error: function (xhr) {
                // --- Rollback ---
                totalItemsEl.text(prevTotal);
                totalItemsMobileEl.text(prevTotal);
                mobileCartCountEl.text(prevTotal);
                itemQtyEl.text(prevItemQty);
                quantityLabelEl.html(prevItemQty);

                if (prevItemQty === 0) {
                    $('#ib-' + productId).hide();
                    $('#qty-ctrl-' + productId).addClass('d-none');
                    $('#add-btn-' + productId).removeClass('d-none');
                }
                if (prevTotal === 0) {
                    $('#mobileCartBar').addClass('d-none');
                }
                // -----------------

                const message = (xhr.responseJSON && xhr.responseJSON.message) ? xhr.responseJSON.message : 'حدث خطأ أثناء إضافة المنتج إلى السلة';
                showNotification(message, 'error');
            }
        });
    };

    window.addToCart = function (productId, supplierId) {
        if (!window.siteConfig.isAuthenticated) {
            openLoginModal(function () {
                return window.performAddToCart(productId, supplierId);
            });
        } else {
            window.performAddToCart(productId, supplierId);
        }
    };

    window.subToCart = function (productId, supplierId) {
        const csrftoken = getCookie('csrftoken');

        // --- Optimistic Update ---
        const totalItemsEl = $('#total-items');
        const totalItemsMobileEl = $('#total-items-mobile');
        const mobileCartCountEl = $('#mobile-cart-count');
        const itemQtyEl = $('#total-qty-items-' + productId);
        const quantityLabelEl = $("#quantity-" + productId);

        const prevTotal = parseInt(totalItemsEl.first().text()) || 0;
        const prevItemQty = parseInt(itemQtyEl.first().text()) || 0;

        if (prevItemQty <= 0) return;

        // Update UI immediately
        const newTotal = Math.max(0, prevTotal - 1);
        const newItemQty = prevItemQty - 1;

        totalItemsEl.text(newTotal);
        totalItemsMobileEl.text(newTotal);
        mobileCartCountEl.text(newTotal);
        itemQtyEl.text(newItemQty);
        quantityLabelEl.html(newItemQty);

        if (newItemQty === 0) {
            $('#ib-' + productId).hide();
            $('#qty-ctrl-' + productId).addClass('d-none');
            $('#add-btn-' + productId).removeClass('d-none');
        }

        if (newTotal === 0) {
            $('#mobileCartBar').addClass('d-none');
        }

        animateCartElement('total-items');
        animateCartElement('mobile-cart-count');
        // ---------------------------

        const url = window.siteConfig.subToCartUrl.replace('/0/', '/' + productId + '/').replace('STORE_ID', supplierId);

        $.ajax({
            url: url,
            type: "POST",
            headers: { "X-CSRFToken": csrftoken },
            success: function (response) {
                // Sync with server state
                $('#total-items').text(response.cart_items_count);
                $('#total-items-mobile').text(response.cart_items_count);
                $('#total-qty-items-' + productId).text(response.cart_item_count);
                $("#quantity-" + productId).html(response.cart_item_count);
                $('#mobile-cart-count').text(response.cart_items_count);

                if (response.cart_total !== undefined) {
                    const estimatedFee = parseFloat(window.siteConfig.estimatedFee || 0);
                    $('#mobile-cart-total').text(Math.floor(response.cart_total + estimatedFee));
                }

                if (response.cart_items_count === 0) {
                    $('#mobileCartBar').addClass('d-none');
                } else {
                    $('#mobileCartBar').removeClass('d-none');
                }

                showNotification('تم تحديث الكمية في السلة', 'success');
            },
            error: function (xhr) {
                // --- Rollback ---
                totalItemsEl.text(prevTotal);
                totalItemsMobileEl.text(prevTotal);
                mobileCartCountEl.text(prevTotal);
                itemQtyEl.text(prevItemQty);
                quantityLabelEl.html(prevItemQty);

                $('#ib-' + productId).show();
                $('#qty-ctrl-' + productId).removeClass('d-none');
                $('#add-btn-' + productId).addClass('d-none');
                $('#mobileCartBar').removeClass('d-none');
                // -----------------
                const message = (xhr.responseJSON && xhr.responseJSON.message) ? xhr.responseJSON.message : 'حدث خطأ أثناء تحديث السلة';
                showNotification(message, 'error');
            }
        });
    };
});

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

// Global Page Loader Logic
document.addEventListener('DOMContentLoaded', function () {
    const loader = document.getElementById('page-loader');

    // Hide loader immediately on DOM content ready (doesn't wait for images)
    if (loader) {
        setTimeout(() => {
            loader.classList.add('hidden-loader');
            if (typeof NProgress !== 'undefined') NProgress.done();
        }, 100);
    } else {
        if (typeof NProgress !== 'undefined') NProgress.done();
    }

    // Function to show loader
    window.showPageLoader = function () {
        if (loader) loader.classList.remove('hidden-loader');
        if (typeof NProgress !== 'undefined') NProgress.start();
    };

    // Trigger on internal link clicks
    document.body.addEventListener('click', function (e) {
        const link = e.target.closest('a');
        if (!link) return;

        const href = link.getAttribute('href');
        if (href &&
            !href.startsWith('#') &&
            !href.startsWith('javascript:') &&
            !href.startsWith('mailto:') &&
            !href.startsWith('tel:') &&
            !link.hasAttribute('download') &&
            link.target !== '_blank' &&
            !e.ctrlKey && !e.shiftKey && !e.metaKey && !e.altKey) {

            window.showPageLoader();
        }
    });

    // Trigger on all form submissions (except those with remote/ajax flags if any)
    document.addEventListener('submit', function (e) {
        const form = e.target;
        if (!form.hasAttribute('data-no-loader')) {
            window.showPageLoader();
        }
    });

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
        const usernameEl = document.getElementById('reset_username');
        const username = isForgotBoth ? '' : usernameEl.value;
        const submitBtn = document.getElementById('reset-submit-btn');
        const statusContainer = document.getElementById('reset-status-container');

        if (!isForgotBoth && !username) {
            showNotification('يرجى إدخال اسم المستخدم ورقم الهاتف', 'error');
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
            body: JSON.stringify({ username: username })
        })
            .then(response => response.json())
            .then(data => {
                if (statusContainer) statusContainer.classList.remove('hidden');
                if (data.success) {
                    if (data.is_forgot_both) {
                        if (statusContainer) {
                            statusContainer.className = 'rounded-xl p-4 text-right bg-blue-50 text-blue-700 text-[11px] border border-blue-100 space-y-3';
                            const message = encodeURIComponent(`مرحباً، لقد نسيت اسم المستخدم وكلمة المرور الخاصة بي. أحتاج للمساعدة في استعادة بيانات حسابي.`);
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
                            const message = encodeURIComponent(`مرحباً، لقد قمت بطلب استعادة كلمة المرور لحسابي (${data.username}).`);
                            const whatsappUrl = `https://wa.me/${data.support_phone}?text=${message}`;
                            statusContainer.innerHTML = `
                        <p class="font-bold mb-2">تم تحديث كلمة المرور!</p>
                        <p>${data.message}</p>
                        <div class="space-y-2 mt-3">
                            <a href="${whatsappUrl}" target="_blank" class="flex items-center justify-center gap-2 w-full py-2.5 bg-green-600 text-white rounded-xl font-bold hover:bg-green-700 transition-all text-xs">
                                <i class="fab fa-whatsapp text-lg"></i>
                                متابعة الطلب في واتساب
                            </a>
                            <button type="button" onclick="togglePasswordReset(false); document.getElementById('merchant_username').value='${data.username}';" class="w-full py-2.5 bg-gray-800 text-white rounded-xl font-bold text-[10px] hover:bg-gray-900 transition-all">
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

    // Handle browser back button (pageshow event)
    window.addEventListener('pageshow', function (event) {
        if (event.persisted && loader) {
            loader.classList.add('hidden-loader');
        }
    });
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
