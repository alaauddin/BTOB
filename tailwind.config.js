/** @type {import('tailwindcss').Config} */
module.exports = {
    content: [
        './core/templates/**/*.html',
        './accounts/templates/**/*.html',
        './service_provider/templates/**/*.html',
        './static/js/**/*.js'
    ],
    theme: {
        extend: {
            colors: {
                brand: {
                    primary: '#2B5876',  // Trust Blue
                    secondary: '#D48231', // Action Orange
                    accent: '#8BB8D1',   // Info Blue
                },
                bg: {
                    soft: '#F8FAFC',
                    main: '#FFFFFF'
                }
            },
            fontFamily: {
                sans: ['Cairo', 'Tajawal', 'sans-serif'],
            },
            boxShadow: {
                'saas': '0 1px 3px 0 rgba(0, 0, 0, 0.05)',
                'saas-hover': '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
            }
        },
    },
    plugins: [],
}
