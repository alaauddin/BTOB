# 🚀 Smart Branding Engine: Documentation

Our branding engine is a high-performance design system that combines AI-driven analysis with curated design templates to ensure every merchant has a premium-looking store.

## 1. 🤖 AI Color Extraction (AI Magic)
The "Smart Coordination" feature uses **OpenAI Vision (GPT-4o)** to analyze the merchant's uploaded logo.

### 🧠 Logic Flow:
1.  **Visual Parsing**: The AI identifies the primary brand colors from the logo.
2.  **Mathematical Constraints**: It applies senior UI/UX contrast rules:
    *   **WCAG 7:1 Ratio**: Ensures high legibility between text and background.
    *   **Polarity Rule**: Automatically detects background luminance. If <40%, text is set to white. If >60%, text is set to dark slate.
    *   **The CTA Rule**: Derives a vibrant `accent_color` that is distinct from the primary brand colors to draw attention to "Buy Now" buttons.

## 2. 🎭 Curated Design Templates
We provide 5 industry-standard presets for merchants who want a professional look instantly:

| Template | Concept | Primary | Secondary | Vibe |
| :--- | :--- | :--- | :--- | :--- |
| **Modern (Indigo)** | Tech/Modern | `#4F46E5` | `#0F172A` | Clean, reliable, professional. |
| **Luxury (Amber)** | High-end/Gold | `#B45309` | `#451A03` | Premium, warm, expensive. |
| **Nature (Green)** | Organic/Health | `#065F46` | `#064E3B` | Fresh, eco-friendly, calm. |
| **Royal (Purple)** | Creative/Lux | `#7C3AED` | `#2E1065` | Innovative, bold, elegant. |
| **Minimal (Steel)** | Essential | `#1E293B` | `#FFFFFF` | Focus on content, sharp. |

## 3. 🖥️ Real-time Preview Engine
The modal includes a "Live Mockup" that synchronizes with user changes without a page refresh:
*   **Pickr Integration**: Uses a Nano-theme color picker for high-precision HEX selection.
*   **Contextual Sync**: Changing a color instantly updates the corresponding element in the mini-mockup (Navbar, Footer, Buttons).
*   **Contrast Guard**: An invisible engine calculates the Delta-E (color difference) and displays an **"Excellent Contrast"** badge only when the pairing is mathematically safe for users.

## 📐 Implementation Architecture
- **Frontend**: TailwindCSS + Vanilla JS for reactive UI updates.
- **Backend**: Django View `GenerateAIColorsView` utilizing OpenAI's Vision API.
- **Data Flow**: Colors are returned as a JSON object, previewed in the modal, and committed to the database only upon saving.
