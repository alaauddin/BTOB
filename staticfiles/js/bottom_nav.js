/* =====================================================
   PREMIUM FLOATING BOTTOM NAVIGATION - Animation Logic
   ===================================================== */

document.addEventListener('DOMContentLoaded', function () {
    const navItems = document.querySelectorAll('.liquid-nav-item');
    const indicator = document.querySelector('.nav-indicator');

    if (!indicator) return;

    /**
     * Move indicator to target item with spring animation
     */
    function moveIndicator(targetItem) {
        const index = targetItem.dataset.index;
        const width = targetItem.offsetWidth;

        // Calculate offset to center the indicator on the target item
        const offset = targetItem.offsetLeft + (width / 2) - (indicator.offsetWidth / 2);

        indicator.style.left = `${offset}px`;
    }

    /**
     * Add tap feedback animation
     */
    function addTapFeedback(item) {
        // Visual feedback scale animation handled by CSS :active state
        // Add subtle bounce after tap
        setTimeout(() => {
            item.style.transform = 'scale(1.05)';
            setTimeout(() => {
                item.style.transform = 'scale(1)';
            }, 150);
        }, 100);
    }

    // Attach click handlers to navigation items
    navItems.forEach((item) => {
        item.addEventListener('click', function (e) {
            // Don't reactivate if already active
            if (this.classList.contains('active')) {
                return;
            }

            // Remove active from all items
            navItems.forEach(i => i.classList.remove('active'));

            // Add to current item
            this.classList.add('active');

            // Move indicator smoothly
            moveIndicator(this);

            // Add tap feedback
            addTapFeedback(this);
        });

        // Optional: Add hover preview on desktop
        if (window.matchMedia('(hover: hover)').matches) {
            item.addEventListener('mouseenter', function () {
                if (!this.classList.contains('active')) {
                    const icon = this.querySelector('.nav-icon');
                    if (icon) {
                        icon.style.transform = 'scale(1.1)';
                    }
                }
            });

            item.addEventListener('mouseleave', function () {
                if (!this.classList.contains('active')) {
                    const icon = this.querySelector('.nav-icon');
                    if (icon) {
                        icon.style.transform = 'scale(1)';
                    }
                }
            });
        }
    });

    /**
     * Initialize navigation - position indicator on active item
     */
    function initNav() {
        const activeItem = document.querySelector('.liquid-nav-item.active');
        if (activeItem) {
            moveIndicator(activeItem);
        } else if (navItems.length > 0) {
            // Default to first item if none active
            navItems[0].classList.add('active');
            moveIndicator(navItems[0]);
        }
    }

    // Initialize after layout is ready
    setTimeout(initNav, 100);

    // Handle window resize - reposition indicator
    let resizeTimeout;
    window.addEventListener('resize', function () {
        clearTimeout(resizeTimeout);
        resizeTimeout = setTimeout(initNav, 150);
    });

    // Handle orientation change on mobile
    window.addEventListener('orientationchange', function () {
        setTimeout(initNav, 200);
    });
});
