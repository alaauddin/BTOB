# Merchant Settings Specification (API & UI)

This document defines the configuration fields for the Merchant Dashboard and their intended behavior for the Mobile App.

## 1. Store Identity & Contact
| Field (DB) | Label (Arabic) | Type | Mutability | Visibility |
| :--- | :--- | :--- | :--- | :--- |
| `name` | اسم المتجر | String | Mutable | Public |
| `phone` | رقم التواصل للعمل | String | **Read-Only** | Public (Footer) |
| `secondary_phone`| رقم هاتف إضافي | String | Mutable | Public (Footer) |
| `address` | العنوان | String | Mutable | Public (Footer) |
| `city` | المدينة | Choice | Mutable | Public |
| `country` | الدولة | Choice | Mutable | Public |

> [!IMPORTANT]
> The `phone` field is locked for merchants to ensure identity consistency. Changes must be requested via support.

## 2. Branding & Visual Identity
| Field (DB) | Label (Arabic) | Type | Usage in App |
| :--- | :--- | :--- | :--- |
| `profile_picture` | شعار المتجر | Image | App Header & Drawer |
| `panal_picture` | صورة الغلاف | Image | Store Front Header |
| `primary_color` | اللون الأساسي | HEX | Buttons, Primary CTAs |
| `secondary_color`| اللون الثانوي | HEX | Sub-headers, secondary icons |
| `navbar_color` | لون التذييل/نص الشريط السفلي | HEX | Bottom Navigation Text (in App) |
| `navbar_text_color`| لون نصوص الشريط العلوي | HEX | Header Text color |
| `footer_color` | لون التذييل | HEX | Background of Bottom Navigation |

## 3. Social Media & Presence
| Field (DB) | Label (Arabic) | Type | Component |
| :--- | :--- | :--- | :--- |
| `subdomain` | النطاق الفرعي | String | Store URL Generation |
| `facebook_url` | رابط فيسبوك | URL | Social Icon Action |
| `instagram_url` | رابط انستقرام | URL | Social Icon Action |
| `twitter_url` | رابط تويتر | URL | Social Icon Action |
| `tiktok_url` | رابط تيك توك | URL | Social Icon Action |

## 4. Store Configuration & Preferences
| Field (DB) | Label (Arabic) | Default | Effect |
| :--- | :--- | :--- | :--- |
| `currency` | العملة | Choice | All price formatting |
| `show_order_amounts`| عرض مبالغ الطلبات| True | Hide/Show revenue in App Dashboard |
| `show_platform_ads` | عرض إعلانات المنصة| True | Enable Platform Banner Ads |
| `show_system_logo` | عرض شعار المنصة | True | Show platform logo alongside store logo |

## 5. Legals & Policies
| Field (DB) | Label (Arabic) | Type | Screen |
| :--- | :--- | :--- | :--- |
| `return_policy` | سياسة الاستبدال | Text | Cart & Product Detail |
| `footer_description`| وصف التذييل | Text | "About" Section in App |

## 🛠️ Mapping Rules for Mobile App:
- **Theme Engine**: The App should dynamically apply `primary_color` to all `ElevatedButton` or `TouchableOpacity` components.
- **Contact Sync**: The `phone` and `secondary_phone` should be mapped to `tel:` link protocols in the "About" screen.
- **Authentication**: User profile phone (read-only) must remain the primary key for identity, separate from the `secondary_phone` business contact.
