/**
 * Product Tour — Interactive Walkthrough Engine
 * 
 * Guides first-time merchants through the Product Management page.
 * Pure vanilla JS, no dependencies. RTL-aware positioning.
 *
 * Usage: auto-starts on DOMContentLoaded when the tour CSS/JS is loaded
 * (only loaded when `has_seen_products_tour` is False in template).
 */

(function () {
    'use strict';

    // =========================================================================
    // Tour Step Configuration
    // =========================================================================
    const TOUR_STEPS = [
        {
            selector: '.page-title-row .action-btn',
            title: 'إضافة منتج جديد',
            description: 'اضغط هنا لإضافة أول منتج في متجرك. يمكنك إضافة الصورة والسعر والوصف والمخزون.',
            position: 'bottom',
            icon: 'fas fa-plus-circle'
        },
        {
            selector: '.stats-summary-card',
            title: 'ملخص الإحصائيات',
            description: 'هنا تجد إحصائيات منتجاتك: إجمالي المنتجات، المنتجات النشطة، المخفية، والعروض الحالية.',
            position: 'bottom',
            icon: 'fas fa-chart-bar'
        },
        {
            selector: '.status-tabs-container',
            title: 'تصفية حسب الحالة',
            description: 'استخدم هذه التبويبات لتصفية المنتجات: جميع المنتجات، نشط، مخفي، جديد، أو المنتجات ذات العروض.',
            position: 'bottom',
            icon: 'fas fa-filter'
        },
        {
            selector: '#filterToggleBtn',
            title: 'البحث والتصنيف',
            description: 'اضغط لفتح خيارات البحث بالاسم والتصفية حسب القسم للوصول السريع لمنتجاتك.',
            position: 'bottom',
            icon: 'fas fa-search'
        },
        {
            selector: '.products-table-wrapper',
            title: 'جدول المنتجات',
            description: 'هنا تظهر جميع منتجاتك مع تفاصيلها: الصورة، الفئة، التقييم، المخزون، السعر، والحالة.',
            position: 'top',
            icon: 'fas fa-table'
        },
        {
            selector: '.toggle-switch',
            title: 'تفعيل / إخفاء المنتج',
            description: 'استخدم هذا الزر للتحكم بظهور المنتج في واجهة المتجر. المنتج المخفي لن يراه العملاء.',
            position: 'top',
            icon: 'fas fa-toggle-on'
        },
        {
            selector: '.row-actions .btn-row-action[title="تعديل"]',
            title: 'تعديل المنتج',
            description: 'اضغط هنا لتعديل بيانات المنتج: الاسم، الوصف، السعر، الصورة، أو المخزون.',
            position: 'top',
            icon: 'fas fa-edit'
        },
        {
            selector: '.row-actions .btn-row-action[title="مشاركة"]',
            title: 'مشاركة المنتج',
            description: 'شارك رابط المنتج مع عملائك عبر واتساب أو وسائل التواصل الاجتماعي لزيادة المبيعات.',
            position: 'top',
            icon: 'fas fa-share-alt'
        },
        {
            selector: '.row-actions .btn-row-action[title="إضافة عرض"]',
            title: 'إضافة عرض خاص',
            description: 'أضف خصمًا أو عرضًا خاصًا على هذا المنتج لجذب المزيد من العملاء.',
            position: 'top',
            icon: 'fas fa-tag'
        }
    ];

    const STORAGE_KEY = 'btob_products_tour_completed';
    const API_URL = '/api/tour-complete/';

    // =========================================================================
    // State
    // =========================================================================
    let currentStep = -1;
    let overlayEl = null;
    let tooltipEl = null;
    let welcomeEl = null;
    let previousHighlight = null;

    // =========================================================================
    // DOM Helpers
    // =========================================================================

    /**
     * Create an HTML element from a template string.
     *
     * @param {string} html - The HTML string to parse.
     * @returns {HTMLElement} The first element child.
     */
    function createElement(html) {
        const div = document.createElement('div');
        div.innerHTML = html.trim();
        return div.firstElementChild;
    }

    /**
     * Retrieve the CSRF token from cookies or the page config.
     *
     * @returns {string} CSRF token value.
     */
    function getCSRFToken() {
        // Try window config first (set in base.html)
        if (window.siteConfig && window.siteConfig.csrfToken) {
            return window.siteConfig.csrfToken;
        }
        if (window.merchantConfig && window.merchantConfig.csrfToken) {
            return window.merchantConfig.csrfToken;
        }
        // Fallback to cookie
        const cookies = document.cookie.split(';');
        for (let c of cookies) {
            c = c.trim();
            if (c.startsWith('csrftoken=')) {
                return c.substring('csrftoken='.length);
            }
        }
        return '';
    }

    // =========================================================================
    // Overlay
    // =========================================================================

    /** Create and insert the dark backdrop overlay. */
    function createOverlay() {
        overlayEl = createElement('<div class="tour-overlay"></div>');
        overlayEl.addEventListener('click', endTour);
        document.body.appendChild(overlayEl);
        // Trigger reflow then activate
        requestAnimationFrame(() => overlayEl.classList.add('active'));
    }

    /** Remove the overlay from the DOM. */
    function removeOverlay() {
        if (overlayEl) {
            overlayEl.classList.remove('active');
            setTimeout(() => {
                if (overlayEl && overlayEl.parentNode) overlayEl.remove();
                overlayEl = null;
            }, 350);
        }
    }

    // =========================================================================
    // Tooltip
    // =========================================================================

    /** Create the tooltip element (hidden initially). */
    function createTooltip() {
        tooltipEl = createElement(`
            <div class="tour-tooltip" role="dialog" aria-label="جولة تعريفية">
                <div class="tour-tooltip-arrow"></div>
                <div class="tour-tooltip-accent"></div>
                <div class="tour-tooltip-body">
                    <div class="tour-tooltip-step-badge">
                        <i class="fas fa-walking"></i>
                        <span class="tour-step-indicator"></span>
                    </div>
                    <h4 class="tour-tooltip-title"></h4>
                    <p class="tour-tooltip-description"></p>
                </div>
                <div class="tour-tooltip-footer">
                    <div class="tour-progress"></div>
                    <div class="tour-tooltip-footer-buttons">
                        <button class="tour-btn tour-btn-skip" data-action="skip">
                            تخطي <i class="fas fa-times"></i>
                        </button>
                        <button class="tour-btn tour-btn-prev" data-action="prev">
                            <i class="fas fa-arrow-right"></i> السابق
                        </button>
                        <button class="tour-btn tour-btn-next" data-action="next">
                            التالي <i class="fas fa-arrow-left"></i>
                        </button>
                    </div>
                </div>
            </div>
        `);

        // Event delegation for buttons
        tooltipEl.addEventListener('click', function (e) {
            const btn = e.target.closest('[data-action]');
            if (!btn) return;
            const action = btn.dataset.action;
            if (action === 'next' || action === 'finish') nextStep();
            else if (action === 'prev') prevStep();
            else if (action === 'skip') endTour();
        });

        document.body.appendChild(tooltipEl);
    }

    /**
     * Update and position the tooltip for a given step index.
     *
     * @param {number} stepIndex - Zero-based index into TOUR_STEPS.
     */
    function showTooltipForStep(stepIndex) {
        const step = TOUR_STEPS[stepIndex];
        if (!step || !tooltipEl) return;

        // Update content
        tooltipEl.querySelector('.tour-step-indicator').textContent =
            `الخطوة ${stepIndex + 1} من ${TOUR_STEPS.length}`;
        tooltipEl.querySelector('.tour-tooltip-title').textContent = step.title;
        tooltipEl.querySelector('.tour-tooltip-description').textContent = step.description;

        // Update step badge icon
        const badgeIcon = tooltipEl.querySelector('.tour-tooltip-step-badge i');
        badgeIcon.className = step.icon || 'fas fa-walking';

        // Update progress dots
        const progressContainer = tooltipEl.querySelector('.tour-progress');
        progressContainer.innerHTML = TOUR_STEPS.map((_, i) => {
            let cls = 'tour-progress-dot';
            if (i === stepIndex) cls += ' active';
            else if (i < stepIndex) cls += ' completed';
            return `<div class="${cls}"></div>`;
        }).join('');

        // Update buttons
        const prevBtn = tooltipEl.querySelector('[data-action="prev"]');
        const nextBtn = tooltipEl.querySelector('[data-action="next"]');

        prevBtn.style.display = stepIndex === 0 ? 'none' : '';

        if (stepIndex === TOUR_STEPS.length - 1) {
            nextBtn.className = 'tour-btn tour-btn-finish';
            nextBtn.dataset.action = 'finish';
            nextBtn.innerHTML = 'إنهاء <i class="fas fa-check"></i>';
        } else {
            nextBtn.className = 'tour-btn tour-btn-next';
            nextBtn.dataset.action = 'next';
            nextBtn.innerHTML = 'التالي <i class="fas fa-arrow-left"></i>';
        }

        // Position tooltip
        tooltipEl.classList.remove('active');
        positionTooltip(step);
        requestAnimationFrame(() => tooltipEl.classList.add('active'));
    }

    /**
     * Dynamically position the tooltip relative to the target element.
     * Falls back to center-screen if target is not found.
     *
     * @param {Object} step - The step configuration object.
     */
    function positionTooltip(step) {
        const target = document.querySelector(step.selector);
        if (!target) {
            // Fallback: center
            tooltipEl.style.top = '50%';
            tooltipEl.style.left = '50%';
            tooltipEl.style.transform = 'translate(-50%, -50%)';
            tooltipEl.removeAttribute('data-position');
            return;
        }

        const rect = target.getBoundingClientRect();
        const tooltipRect = tooltipEl.getBoundingClientRect();
        const scrollY = window.scrollY || window.pageYOffset;
        const vw = window.innerWidth;
        const vh = window.innerHeight;
        const gap = 16;

        let preferredPosition = step.position || 'bottom';
        let top, left;

        // Check if preferred position fits, otherwise flip
        if (preferredPosition === 'bottom' && (rect.bottom + gap + tooltipRect.height > vh)) {
            preferredPosition = 'top';
        } else if (preferredPosition === 'top' && (rect.top - gap - tooltipRect.height < 0)) {
            preferredPosition = 'bottom';
        }

        const arrow = tooltipEl.querySelector('.tour-tooltip-arrow');

        switch (preferredPosition) {
            case 'bottom':
                top = rect.bottom + gap;
                // RTL: align right edge with target right edge
                left = rect.right - tooltipRect.width;
                break;
            case 'top':
                top = rect.top - tooltipRect.height - gap;
                left = rect.right - tooltipRect.width;
                break;
            case 'left':
                top = rect.top + (rect.height / 2) - (tooltipRect.height / 2);
                left = rect.left - tooltipRect.width - gap;
                break;
            case 'right':
                top = rect.top + (rect.height / 2) - (tooltipRect.height / 2);
                left = rect.right + gap;
                break;
        }

        // Clamp to viewport
        left = Math.max(12, Math.min(left, vw - tooltipRect.width - 12));
        top = Math.max(12, Math.min(top, vh - tooltipRect.height - 12));

        tooltipEl.style.position = 'fixed';
        tooltipEl.style.top = top + 'px';
        tooltipEl.style.left = left + 'px';
        tooltipEl.style.transform = 'none';
        tooltipEl.setAttribute('data-position', preferredPosition);

        // Position arrow relative to target center
        if (arrow) {
            const targetCenterX = rect.left + rect.width / 2;
            const tooltipLeft = left;
            let arrowLeft = targetCenterX - tooltipLeft - 8; // 8 = half arrow width
            arrowLeft = Math.max(16, Math.min(arrowLeft, tooltipRect.width - 32));

            if (preferredPosition === 'bottom' || preferredPosition === 'top') {
                arrow.style.left = arrowLeft + 'px';
                arrow.style.right = 'auto';
                arrow.style.top = preferredPosition === 'bottom' ? '-7px' : '';
                arrow.style.bottom = preferredPosition === 'top' ? '-7px' : '';
            }
        }
    }

    // =========================================================================
    // Highlight
    // =========================================================================

    /**
     * Add highlight styling to the target element for the given step.
     *
     * @param {number} stepIndex - Zero-based index into TOUR_STEPS.
     */
    function highlightTarget(stepIndex) {
        // Remove previous highlight
        clearHighlight();

        const step = TOUR_STEPS[stepIndex];
        const target = document.querySelector(step.selector);
        if (!target) return;

        target.classList.add('tour-highlight');
        previousHighlight = target;

        // Scroll into view if needed
        const rect = target.getBoundingClientRect();
        if (rect.top < 80 || rect.bottom > window.innerHeight - 80) {
            target.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
    }

    /** Remove highlight class from the previously highlighted element. */
    function clearHighlight() {
        if (previousHighlight) {
            previousHighlight.classList.remove('tour-highlight');
            previousHighlight = null;
        }
    }

    // =========================================================================
    // Welcome Card
    // =========================================================================

    /** Show a welcome card before starting the step-by-step tour. */
    function showWelcome() {
        createOverlay();

        welcomeEl = createElement(`
            <div class="tour-welcome-card" role="dialog" aria-label="مرحباً">
                <div class="tour-welcome-icon">
                    <i class="fas fa-rocket"></i>
                </div>
                <h3 class="tour-welcome-title">مرحباً بك في إدارة المنتجات! 🎉</h3>
                <p class="tour-welcome-text">
                    دعنا نأخذك في جولة سريعة للتعرف على أهم الأدوات<br>
                    التي ستساعدك في إدارة منتجات متجرك باحترافية.
                </p>
                <div class="tour-welcome-actions">
                    <button class="tour-btn tour-btn-skip" id="tour-skip-welcome">
                        لاحقاً
                    </button>
                    <button class="tour-btn tour-btn-next" id="tour-start-btn">
                        ابدأ الجولة <i class="fas fa-arrow-left"></i>
                    </button>
                </div>
            </div>
        `);

        document.body.appendChild(welcomeEl);
        requestAnimationFrame(() => welcomeEl.classList.add('active'));

        welcomeEl.querySelector('#tour-start-btn').addEventListener('click', function () {
            dismissWelcome();
            startSteps();
        });

        welcomeEl.querySelector('#tour-skip-welcome').addEventListener('click', function () {
            dismissWelcome();
            endTour();
        });
    }

    /** Remove the welcome card from the DOM with an animation. */
    function dismissWelcome() {
        if (welcomeEl) {
            welcomeEl.classList.remove('active');
            setTimeout(() => {
                if (welcomeEl && welcomeEl.parentNode) welcomeEl.remove();
                welcomeEl = null;
            }, 350);
        }
    }

    // =========================================================================
    // Tour Controls
    // =========================================================================

    /** Begin the step-by-step tour (after welcome card). */
    function startSteps() {
        createTooltip();
        currentStep = 0;
        highlightTarget(currentStep);
        // Small delay so scroll settles
        setTimeout(() => showTooltipForStep(currentStep), 400);
    }

    /** Advance to the next step, or finish if on the last step. */
    function nextStep() {
        if (currentStep >= TOUR_STEPS.length - 1) {
            endTour();
            return;
        }
        currentStep++;
        tooltipEl.classList.remove('active');
        setTimeout(() => {
            highlightTarget(currentStep);
            setTimeout(() => showTooltipForStep(currentStep), 300);
        }, 200);
    }

    /** Go back to the previous step. */
    function prevStep() {
        if (currentStep <= 0) return;
        currentStep--;
        tooltipEl.classList.remove('active');
        setTimeout(() => {
            highlightTarget(currentStep);
            setTimeout(() => showTooltipForStep(currentStep), 300);
        }, 200);
    }

    /** End the tour (whether finished or skipped). Persists the flag. */
    function endTour() {
        clearHighlight();

        // Animate out tooltip
        if (tooltipEl) {
            tooltipEl.classList.remove('active');
            setTimeout(() => {
                if (tooltipEl && tooltipEl.parentNode) tooltipEl.remove();
                tooltipEl = null;
            }, 350);
        }

        removeOverlay();
        dismissWelcome();

        // Persist completion
        markTourComplete();

        currentStep = -1;
    }

    /**
     * Mark the tour as complete both in localStorage and on the server.
     * Uses a fire-and-forget POST to the Django API endpoint.
     */
    function markTourComplete() {
        // Local flag
        try {
            localStorage.setItem(STORAGE_KEY, 'true');
        } catch (e) {
            // localStorage may be unavailable (private browsing)
        }

        // Server flag
        fetch(API_URL, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'X-CSRFToken': getCSRFToken()
            },
            body: JSON.stringify({ tour: 'products' })
        }).catch(function () {
            // Silently fail — tour state is also in localStorage
        });
    }

    // =========================================================================
    // Initialization
    // =========================================================================

    /**
     * Check localStorage and start the tour if not already completed.
     * The backend also gates this via the template conditional, so
     * this is a double-check for edge cases (e.g. multi-tab).
     */
    function init() {
        try {
            if (localStorage.getItem(STORAGE_KEY) === 'true') return;
        } catch (e) {
            // localStorage unavailable, proceed anyway
        }

        // Wait for any page loader to finish
        setTimeout(showWelcome, 800);
    }

    // Kick off when DOM is ready
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }

    // Handle window resize — reposition tooltip
    let resizeTimer;
    window.addEventListener('resize', function () {
        clearTimeout(resizeTimer);
        resizeTimer = setTimeout(function () {
            if (currentStep >= 0 && tooltipEl) {
                positionTooltip(TOUR_STEPS[currentStep]);
            }
        }, 150);
    });

})();
