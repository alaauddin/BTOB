let currentCategoryId = 'all';
let currentViewMode = 'store'; // 'store' or 'product'

/**
 * Switch between Store View and Product View
 * @param {string} mode - 'store' or 'product'
 */
function setViewMode(mode) {
    currentViewMode = mode;
    
    // Update Toggle Buttons UI
    const storeBtn = document.getElementById('storeModeBtn');
    const productBtn = document.getElementById('productModeBtn');
    const storeView = document.getElementById('storeViewSection');
    const productView = document.getElementById('productViewSection');

    if (mode === 'store') {
        storeBtn.classList.add('active');
        productBtn.classList.remove('active');
        storeView.classList.remove('hidden-view');
        productView.classList.add('hidden-view');
    } else {
        storeBtn.classList.remove('active');
        productBtn.classList.add('active');
        storeView.classList.add('hidden-view');
        productView.classList.remove('hidden-view');
    }

    // Re-apply filters for the new view
    applyFilters();
}

/**
 * Filter by category from the pill navigation
 */
function setCategory(categoryId) {
    currentCategoryId = categoryId;
    
    // Update active pill UI
    document.querySelectorAll('.category-pill').forEach(btn => {
        if (btn.getAttribute('data-category') === categoryId) {
            btn.classList.add('active');
        } else {
            btn.classList.remove('active');
        }
    });

    applyFilters();
}

/**
 * Universal filter for both Stores and Products
 */
function applyFilters() {
    const searchText = document.getElementById('supplierSearchInput').value.toLowerCase();
    
    // Filter Stores
    const storeCards = document.querySelectorAll('#storeViewSection .supplier-card-container');
    let visibleStores = 0;
    storeCards.forEach(card => {
        const name = card.getAttribute('data-name');
        const categoryNames = card.getAttribute('data-category-names');
        const categories = card.getAttribute('data-categories').split(',');
        
        const matchesCategory = (currentCategoryId === 'all' || categories.includes(currentCategoryId));
        const matchesSearch = (name.includes(searchText) || categoryNames.includes(searchText));

        if (matchesCategory && matchesSearch) {
            card.style.display = 'block';
            visibleStores++;
        } else {
            card.style.display = 'none';
        }
    });

    // Filter Products
    const productCards = document.querySelectorAll('#productViewSection .product-card-container');
    let visibleProducts = 0;
    productCards.forEach(card => {
        const name = card.getAttribute('data-name');
        const category = card.getAttribute('data-category');
        
        const matchesCategory = (currentCategoryId === 'all' || category === currentCategoryId);
        const matchesSearch = name.includes(searchText);

        if (matchesCategory && matchesSearch) {
            card.style.display = 'block';
            visibleProducts++;
        } else {
            card.style.display = 'none';
        }
    });

    // Handle Empty States
    handleEmptyState('store', visibleStores);
    handleEmptyState('product', visibleProducts);
}

/**
 * Cart & Options Logic
 */
let selectedOptions = {}; // Tracks { productId: { attrId: optId } }

function handleAddToCart(event, productId) {
    if (event) event.stopPropagation();
    
    // Check if product has options
    const cardContainer = document.querySelector(`#product-card-${productId}`).closest('.product-card-container');
    const hasOptions = cardContainer.getAttribute('data-has-options') === 'true';

    if (hasOptions) {
        showOptions(productId);
    } else {
        addToCart(productId, []);
    }
}

function showOptions(productId) {
    const overlay = document.getElementById(`options-${productId}`);
    if (overlay) overlay.classList.add('active');
    
    // Initialize state if not exists
    if (!selectedOptions[productId]) {
        selectedOptions[productId] = {};
    }
}

function hideOptions(event, productId) {
    if (event) event.stopPropagation();
    const overlay = document.getElementById(`options-${productId}`);
    if (overlay) overlay.classList.remove('active');
}

function selectOption(element, productId, attrId, optId, priceModifier) {
    // 1. Update UI
    const group = element.closest('.option-chips');
    group.querySelectorAll('.option-chip').forEach(chip => chip.classList.remove('selected'));
    element.classList.add('selected');

    // 2. Update State
    if (!selectedOptions[productId]) selectedOptions[productId] = {};
    selectedOptions[productId][attrId] = optId;
}

function confirmAndAdd(event, productId) {
    if (event) event.stopPropagation();
    
    // Check if all attributes have a selection
    const overlay = document.getElementById(`options-${productId}`);
    const totalGroups = overlay.querySelectorAll('.option-group').length;
    const selections = Object.keys(selectedOptions[productId] || {}).length;

    if (selections < totalGroups) {
        alert('يرجى اختيار جميع الخيارات المطلوبة');
        return;
    }

    const optionIds = Object.values(selectedOptions[productId]);
    addToCart(productId, optionIds);
    hideOptions(null, productId);
}

/**
 * Standard Add to Cart API Call
 */
async function addToCart(productId, optionIds) {
    try {
        const response = await fetch('/api/cart/add_item/', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'X-CSRFToken': getCookie('csrftoken')
            },
            body: JSON.stringify({
                product_id: productId,
                quantity: 1,
                selected_options: optionIds
            })
        });

        const data = await response.json();
        if (data.success) {
            showToast('تمت الإضافة بنجاح', 'success');
            // Update cart count if exists
            const cartCountEls = document.querySelectorAll('.cart-count-badge');
            cartCountEls.forEach(el => el.textContent = data.cart.total_items || data.cart_count);
        } else {
            showToast(data.message || 'حدث خطأ ما', 'error');
        }
    } catch (err) {
        console.error('Cart Error:', err);
        showToast('حدث خطأ في الاتصال بالسيرفر', 'error');
    }
}

function showToast(message, type = 'success') {
    // Check if toast container exists
    let toast = document.getElementById('app-toast');
    if (!toast) {
        toast = document.createElement('div');
        toast.id = 'app-toast';
        toast.style.cssText = 'position: fixed; bottom: 20px; left: 50%; transform: translateX(-50%); z-index: 1000; transition: all 0.5s ease;';
        document.body.appendChild(toast);
    }
    
    const banner = document.createElement('div');
    const bgColor = type === 'success' ? '#10b981' : '#f43f5e';
    banner.style.cssText = `background: ${bgColor}; color: white; padding: 12px 24px; border-radius: 12px; font-weight: 700; margin-top: 10px; box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.1); display: flex; align-items: center; gap: 8px; font-size: 14px;`;
    banner.innerHTML = `<i class="fas ${type === 'success' ? 'fa-check-circle' : 'fa-exclamation-circle'}"></i> <span>${message}</span>`;
    
    toast.appendChild(banner);
    setTimeout(() => {
        banner.style.opacity = '0';
        banner.style.transform = 'translateY(20px)';
        setTimeout(() => banner.remove(), 500);
    }, 3000);
}

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
 * Show/Hide empty state messages
 */
function handleEmptyState(type, count) {
    const sectionId = type === 'store' ? 'storeViewSection' : 'productViewSection';
    const gridSelector = type === 'store' ? '.supplier-marquee-section' : '.products-grid-premium';
    const messageId = `no-${type}-message`;
    const section = document.getElementById(sectionId);
    if (!section) return;

    let emptyState = document.getElementById(messageId);
    
    if (count === 0) {
        if (!emptyState) {
            const grid = section.querySelector(gridSelector) || section.querySelector('.container');
            const message = document.createElement('div');
            message.id = messageId;
            message.className = 'col-12 w-full text-center py-12';
            message.innerHTML = `
                <div class="no-results-premium opacity-60">
                    <i class="fas fa-search-minus mb-4" style="font-size: 4rem;"></i>
                    <h3 class="text-xl font-bold">لا توجد نتائج تطابق بحثك</h3>
                    <p>جرب كلمات بحث أخرى أو تصنيفات مختلفة</p>
                </div>
            `;
            grid.appendChild(message);
        }
    } else {
        if (emptyState) emptyState.remove();
    }
}

// Spotlight Tour Logic
function buildTourData() {
    const steps = [];
    
    // 1. Categories (Always good to have)
    if (document.querySelector('.category-nav-wrapper')) {
        steps.push({
            title: "سهولة الاستكشاف",
            desc: "استخدم شريط التصنيفات للوصول السريع إلى ما تبحث عنه من ملابس، إلكترونيات، أو أسر منتجة.",
            target: ".category-nav-wrapper",
            pos: "bottom"
        });
    }

    // 2. Platform Ads
    if (document.querySelector('.platform-ads-section')) {
        steps.push({
            title: "عروض رواج",
            desc: "شاهد أحدث العروض الحصرية والمميزة من مختلف المتاجر في مكان واحد.",
            target: ".platform-ads-section",
            pos: "bottom"
        });
    }

    // 3. Main Suppliers
    if (document.querySelector('.supplier-card')) {
        steps.push({
            title: "تسوق من المتاجر",
            desc: "انقر على أي متجر لاستعراض منتجاته الحصرية. يمكنك أيضاً رؤية تقييمات العملاء هنا.",
            target: ".supplier-card",
            pos: "bottom"
        });
    }

    // 4. Producing Families
    if (document.querySelector('.producing-families-wrapper')) {
        steps.push({
            title: "الأسر المنتجة",
            desc: "ادعم المنتجات المنزلية الفريدة وتسوق مباشرة من متاجر الأسر المنتجة.",
            target: ".producing-families-wrapper .supplier-card-premium",
            pos: "top"
        });
    }

    // 5. Join Us
    if (document.querySelector('.business-join-wrapper')) {
        steps.push({
            title: "كن شريكنا",
            desc: "هل لديك عمل تجاري؟ انضم إلينا الآن واعرض منتجاتك لآلاف العملاء بسهولة.",
            target: ".business-join-wrapper",
            pos: "top"
        });
    }

    return steps;
}

let tourSteps = [];
let currentStepIndex = 0;

function startTour() {
    if (localStorage.getItem('tour_completed')) return;
    
    const spotlight = document.getElementById('tour-spotlight');
    const tooltip = document.getElementById('tour-tooltip');
    
    if (!spotlight || !tooltip) return;

    tourSteps = buildTourData();
    if (tourSteps.length === 0) return;

    // Update dot indicators
    const dotContainer = document.querySelector('.tour-dot-container');
    if (dotContainer) {
        dotContainer.innerHTML = tourSteps.map((_, i) => `<div class="tour-dot" data-step="${i+1}"></div>`).join('');
    }

    setTimeout(() => {
        spotlight.classList.add('active');
        tooltip.classList.add('active');
        renderStep(0);
    }, 1500);
}

function renderStep(index) {
    const spotlight = document.getElementById('tour-spotlight');
    const tooltip = document.getElementById('tour-tooltip');
    if (!spotlight || !tooltip) return;

    const data = tourSteps[index];
    const targetEl = document.querySelector(data.target);
    if (!targetEl) {
        // If target disappeared, try next or finish
        if (index + 1 < tourSteps.length) return renderStep(index + 1);
        return finishTour();
    }

    // Scroll to element
    targetEl.scrollIntoView({ behavior: 'smooth', block: 'center' });

    setTimeout(() => {
        const rect = targetEl.getBoundingClientRect();
        const padding = 10;
        
        // Update spotlight (using viewport-relative coordinates for fixed overlay)
        spotlight.style.setProperty('--sx', `${rect.left - padding}px`);
        spotlight.style.setProperty('--sy', `${rect.top - padding}px`);
        spotlight.style.setProperty('--ex', `${rect.right + padding}px`);
        spotlight.style.setProperty('--ey', `${rect.bottom + padding}px`);

        // Position tooltip
        const tooltipRect = tooltip.getBoundingClientRect();
        let top, left;

        if (data.pos === 'bottom') {
            top = rect.bottom + 20;
            left = rect.left + (rect.width / 2) - (tooltipRect.width / 2);
        } else {
            top = rect.top - tooltipRect.height - 20;
            left = rect.left + (rect.width / 2) - (tooltipRect.width / 2);
        }

        // Boundary checks
        left = Math.max(10, Math.min(left, window.innerWidth - tooltipRect.width - 10));
        top = Math.max(10, Math.min(top, window.innerHeight - tooltipRect.height - 10));

        tooltip.style.top = `${top}px`;
        tooltip.style.left = `${left}px`;

        // Update content
        const titleEl = document.getElementById('tooltip-title');
        const descEl = document.getElementById('tooltip-desc');
        const nextBtn = document.getElementById('tour-next-btn');

        if (titleEl) titleEl.textContent = data.title;
        if (descEl) descEl.textContent = data.desc;
        if (nextBtn) nextBtn.textContent = index === tourSteps.length - 1 ? 'ابدأ الاستخدام' : 'التالي';

        // Update dots
        document.querySelectorAll('.tour-dot').forEach((dot, i) => {
            dot.classList.toggle('active', i === index);
        });
    }, 300);
}

function nextTourStep() {
    currentStepIndex++;
    if (currentStepIndex >= tourSteps.length) {
        finishTour();
    } else {
        renderStep(currentStepIndex);
    }
}

function finishTour() {
    const spotlight = document.getElementById('tour-spotlight');
    const tooltip = document.getElementById('tour-tooltip');
    if (spotlight) spotlight.classList.remove('active');
    if (tooltip) tooltip.classList.remove('active');
    localStorage.setItem('tour_completed', 'true');
}

// Swiper Initializations
document.addEventListener('DOMContentLoaded', function() {
    // Start Tour
    startTour();

    // Initialize Main Ads Swiper with Premium Momentum
    if (document.querySelector('.main-ads-swiper')) {
        const mainAdsSwiper = new Swiper('.main-ads-swiper', {
            loop: true,
            autoplay: {
                delay: 5000,
                disableOnInteraction: false,
            },
            speed: 400, // Faster for mobile
            effect: 'fade',
            fadeEffect: {
                crossFade: true
            },
            pagination: {
                el: '.swiper-pagination',
                clickable: true,
            },
            // Premium momentum
            freeMode: false,
            freeModeSticky: true,
            followFinger: true,
            resistanceRatio: 0.85,
        });
    }

    // Initialize Platform Offers Swiper with Smooth Momentum
    if (document.querySelector('.platform-offers-swiper')) {
        const platformOffersSwiper = new Swiper('.platform-offers-swiper', {
            slidesPerView: 'auto',
            spaceBetween: 12, // Tighter for mobile
            loop: false,
            freeMode: true,
            freeModeSticky: false,
            freeModeMinimumVelocity: 0.15, // Snappier
            freeModeDecelerationRatio: 0.6, // Faster stop
            scrollbar: {
                el: '.swiper-scrollbar',
                draggable: true,
                hide: false,
                dragSize: 60, // Smaller for mobile
            },
            breakpoints: {
                480: {
                    spaceBetween: 16,
                },
                640: {
                    spaceBetween: 16,
                },
                768: {
                    spaceBetween: 20,
                },
                1024: {
                    spaceBetween: 20,
                },
            }
        });
    }

    // Initialize Supplier Marquee Left with Smooth Scroll
    if (document.querySelector('.supplier-marquee-left')) {
        const supplierMarqueeLeft = new Swiper('.supplier-marquee-left', {
            slidesPerView: 'auto',
            spaceBetween: 12,
            loop: true,
            speed: 600, // Faster
            allowTouchMove: true,
            freeMode: true,
            freeModeSticky: false,
            autoplay: {
                delay: 2500,
                disableOnInteraction: false,
            },
        });
    }

    // Initialize Supplier Marquee Right with Reverse Scroll
    if (document.querySelector('.supplier-marquee-right')) {
        const supplierMarqueeRight = new Swiper('.supplier-marquee-right', {
            slidesPerView: 'auto',
            spaceBetween: 12,
            loop: true,
            speed: 600, // Faster
            allowTouchMove: true,
            freeMode: true,
            freeModeSticky: false,
            autoplay: {
                delay: 2500,
                disableOnInteraction: false,
                reverseDirection: true,
            },
        });
    }
});
