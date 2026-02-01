/* Premium Bottom Navigation - Global Logic */
document.addEventListener('DOMContentLoaded', function () {
    const navItems = document.querySelectorAll('.nav-item');
    const blob = document.getElementById('navBlob');
    const container = document.querySelector('.bottom-nav-container');

    if (!container || !blob) return;

    function updateBlobPosition(activeItem) {
        if (!activeItem) return;

        // For the center item, we hide the blob
        if (activeItem.classList.contains('nav-item-center')) {
            blob.style.opacity = '0';
            blob.style.transform = 'scale(0) translateY(-50%)';
            return;
        }

        // Calculate position relative to container
        const itemRect = activeItem.getBoundingClientRect();
        const containerRect = container.getBoundingClientRect();

        // Position the blob (Enclosing both icon and hidden/visible text)
        blob.style.opacity = '1';
        blob.style.width = `${itemRect.width}px`;
        blob.style.left = `${itemRect.left - containerRect.left}px`;
        blob.style.transform = 'translateY(-50%) scale(1)';
    }

    navItems.forEach((item) => {
        item.addEventListener('click', function (e) {
            // For search, we might want to focus input without navigating
            if (this.classList.contains('focus-search') && document.getElementById('supplierSearchInput')) {
                e.preventDefault();
                document.getElementById('supplierSearchInput').focus();
            }

            navItems.forEach(i => i.classList.remove('active'));
            if (!this.classList.contains('nav-item-center')) {
                this.classList.add('active');
            }
            updateBlobPosition(this);
        });
    });

    // Initialize position
    setTimeout(() => {
        const activeItem = document.querySelector('.nav-item.active');
        if (activeItem) {
            updateBlobPosition(activeItem);
        }
    }, 300);

    // Handle resize
    window.addEventListener('resize', () => {
        const activeItem = document.querySelector('.nav-item.active');
        updateBlobPosition(activeItem);
    });
});
