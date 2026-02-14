/**
 * Rawaaj Navigation Logic
 * Handles sidebar toggling, dropdowns, and active state management.
 */

document.addEventListener('DOMContentLoaded', function () {
    const body = document.body;
    const sidebarOverlay = document.createElement('div');
    sidebarOverlay.className = 'sidebar-overlay';
    body.appendChild(sidebarOverlay);

    // --- Sidebar Toggle Logic ---
    window.toggleSidebar = function () {
        body.classList.toggle('sidebar-open');
    };

    sidebarOverlay.addEventListener('click', function () {
        body.classList.remove('sidebar-open');
    });

    // --- Store Switcher Logic (Dropdown) ---
    const storeSwitcherBtn = document.getElementById('storeSwitcherBtn');
    const storeDropdown = document.getElementById('storeDropdown');

    if (storeSwitcherBtn && storeDropdown) {
        storeSwitcherBtn.addEventListener('click', function (e) {
            e.stopPropagation();
            storeDropdown.classList.toggle('hidden');
        });

        // Close dropdown when clicking outside
        document.addEventListener('click', function (e) {
            if (!storeSwitcherBtn.contains(e.target) && !storeDropdown.contains(e.target)) {
                storeDropdown.classList.add('hidden');
            }
        });
    }

    // --- Quick Create Dropdown Logic ---
    const quickCreateBtn = document.getElementById('quickCreateBtn');
    const quickCreateMenu = document.getElementById('quickCreateMenu');

    if (quickCreateBtn && quickCreateMenu) {
        quickCreateBtn.addEventListener('click', function (e) {
            e.stopPropagation();
            quickCreateMenu.classList.toggle('hidden');
        });

        document.addEventListener('click', function (e) {
            if (!quickCreateBtn.contains(e.target) && !quickCreateMenu.contains(e.target)) {
                quickCreateMenu.classList.add('hidden');
            }
        });
    }

    // --- User Menu Dropdown Logic (New) ---
    const userMenuBtn = document.getElementById('userMenuBtn');
    const userMenuDropdown = document.getElementById('userMenuDropdown');

    if (userMenuBtn && userMenuDropdown) {
        userMenuBtn.addEventListener('click', function (e) {
            e.stopPropagation();
            userMenuDropdown.classList.toggle('hidden');
        });

        document.addEventListener('click', function (e) {
            if (!userMenuBtn.contains(e.target) && !userMenuDropdown.contains(e.target)) {
                userMenuDropdown.classList.add('hidden');
            }
        });
    }

    // --- Active Link Highlight ---
    // Automatically highlight the current nav item based on URL
    const currentPath = window.location.pathname;
    const navLinks = document.querySelectorAll('.nav-item');

    navLinks.forEach(link => {
        const href = link.getAttribute('href');
        if (href && href !== '#' && (currentPath === href || currentPath.startsWith(href))) {
            // Simple exact match or prefix match
            // Ideally backend sets 'active' class, but this is a good client-side fallback
            if (href !== '/' || currentPath === '/') { // Avoid everything matching root
                link.classList.add('active');

                // Expand parent group if expandable (future feature)
            }
        }
    });
});
