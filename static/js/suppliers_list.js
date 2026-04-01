let currentCategoryId = 'all';

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

function applyFilters() {
    const searchText = document.getElementById('supplierSearchInput').value.toLowerCase();
    const cards = document.querySelectorAll('.supplier-card-container');
    let visibleCount = 0;

    cards.forEach(card => {
        const name = card.getAttribute('data-name');
        const categoryNames = card.getAttribute('data-category-names');
        const categories = card.getAttribute('data-categories').split(',');
        
        const matchesCategory = (currentCategoryId === 'all' || categories.includes(currentCategoryId));
        const matchesSearch = (name.includes(searchText) || categoryNames.includes(searchText));

        if (matchesCategory && matchesSearch) {
            card.style.display = 'block';
            visibleCount++;
        } else {
            card.style.display = 'none';
        }
    });

    // Handle no results state
    const emptyState = document.getElementById('noSuppliersMessage');
    if (visibleCount === 0) {
        if (!emptyState) {
            const grid = document.getElementById('supplierGrid');
            if (grid) {
                const message = document.createElement('div');
                message.id = 'noSuppliersMessage';
                message.className = 'col-12 w-full text-center py-5';
                message.innerHTML = `
                    <div class="no-suppliers">
                        <i class="fas fa-search-minus mb-3" style="font-size: 3rem; color: #e2e8f0;"></i>
                        <h3 class="text-slate-800">لا توجد نتائج</h3>
                        <p class="text-slate-400">لم نجد أي موردين يطابقون بحثك الحالي.</p>
                    </div>
                `;
                grid.appendChild(message);
            }
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
