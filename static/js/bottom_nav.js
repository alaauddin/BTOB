/* Liquid Bottom Navigation - Animation Logic */
document.addEventListener('DOMContentLoaded', function () {
    const navItems = document.querySelectorAll('.liquid-nav-item');
    const indicator = document.querySelector('.nav-indicator');

    if (!indicator) return;

    function moveIndicator(targetItem) {
        const index = targetItem.dataset.index;
        const width = targetItem.offsetWidth;
        // Calculate offset to center the indicator on the target item
        const offset = targetItem.offsetLeft + (width / 2) - (indicator.offsetWidth / 2);

        indicator.style.left = `${offset}px`;
    }

    navItems.forEach((item) => {
        item.addEventListener('click', function (e) {
            // Remove active from all
            navItems.forEach(i => i.classList.remove('active'));
            // Add to current
            this.classList.add('active');

            moveIndicator(this);

            // If it's the Imagine (AI) tab, we can add a special effect or ripple
            if (this.dataset.index == "2") {
                this.classList.add('ai-glow');
                setTimeout(() => this.classList.remove('ai-glow'), 1000);
            }
        });
    });

    // Initialize position of indicator
    function initNav() {
        const activeItem = document.querySelector('.liquid-nav-item.active');
        if (activeItem) {
            moveIndicator(activeItem);
        }
    }

    // Call init after a short delay to ensure layout is ready
    setTimeout(initNav, 100);

    // Handle resize
    window.addEventListener('resize', initNav);
});
