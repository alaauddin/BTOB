/* Neo-Premium Order Details Interactivity */
document.addEventListener('DOMContentLoaded', function () {
    // Entrance Animations
    const animatedElements = document.querySelectorAll('.glass-card, .order-item-row, .order-stats-bar, .payment-promo-card');

    animatedElements.forEach((el, index) => {
        el.style.opacity = '0';
        el.style.transform = 'translateY(20px)';
        el.style.transition = 'all 0.6s cubic-bezier(0.22, 1, 0.36, 1)';

        setTimeout(() => {
            el.style.opacity = '1';
            el.style.transform = 'translateY(0)';
        }, index * 100);
    });

    // Image Hover Effects
    const itemImages = document.querySelectorAll('.item-img-box img');
    itemImages.forEach(img => {
        img.addEventListener('mouseenter', () => {
            img.style.transform = 'scale(1.1)';
        });
        img.addEventListener('mouseleave', () => {
            img.style.transform = 'scale(1)';
        });
        img.style.transition = 'transform 0.4s ease';
    });
});
