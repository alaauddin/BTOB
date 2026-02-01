/* Order List Interactivity - Premium JS */
document.addEventListener('DOMContentLoaded', function () {
    const filterChips = document.querySelectorAll('.filter-chip');
    const orderCards = document.querySelectorAll('.order-premium-card');

    // Smooth Filtering
    filterChips.forEach(chip => {
        chip.addEventListener('click', function () {
            // Update Active State
            filterChips.forEach(c => c.classList.remove('active'));
            this.classList.add('active');

            const selectedStatus = this.getAttribute('data-status');

            orderCards.forEach(card => {
                const cardStatus = card.getAttribute('data-status');

                if (selectedStatus === 'all' || cardStatus === selectedStatus) {
                    card.style.display = 'block';
                    // Re-trigger entrance animation
                    card.style.animation = 'none';
                    card.offsetHeight; // trigger reflow
                    card.style.animation = 'cardEntrance 0.5s ease forwards';
                } else {
                    card.style.display = 'none';
                }
            });
        });
    });

    // Intersection Observer for Scroll Animations
    const observerOptions = {
        threshold: 0.1,
        rootMargin: '0px 0px -50px 0px'
    };

    const cardObserver = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.classList.add('visible');
                cardObserver.unobserve(entry.target);
            }
        });
    }, observerOptions);

    orderCards.forEach((card, index) => {
        // Set staggered delay
        card.style.setProperty('--card-index', index);
        cardObserver.observe(card);
    });
});

/* Added dynamically to avoid CSS clutter for specialized animations */
const style = document.createElement('style');
style.innerHTML = `
    .order-premium-card {
        opacity: 0;
        transform: translateY(30px);
        transition: opacity 0.6s ease, transform 0.6s cubic-bezier(0.34, 1.56, 0.64, 1);
    }
    
    .order-premium-card.visible {
        opacity: 1;
        transform: translateY(0);
    }

    @keyframes cardEntrance {
        from {
            opacity: 0;
            transform: scale(0.95) translateY(10px);
        }
        to {
            opacity: 1;
            transform: scale(1) translateY(0);
        }
    }
`;
document.head.appendChild(style);
