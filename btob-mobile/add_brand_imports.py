
import os
import re

files = [
    "src/components/AuthModal.js",
    "src/components/OnboardingModal.js",
    "src/components/StandardToast.js",
    "src/components/profile/ProfileHero.js",
    "src/components/profile/DeviceMockup.js",
    "src/components/OfferEditModal.js",
    "src/components/BrandGenModal.js",
    "src/components/ProductEditModal.js",
    "src/components/wholesale/SourcingModal.js",
    "src/components/wholesale/WholesaleProductCard.js",
    "src/screens/SubscriptionScreen.js",
    "src/screens/DriverDashboardScreen.js",
    "src/screens/WholesaleMarketScreen.js",
    "src/screens/DriverTrackingLayer.js",
    "src/screens/DriverTrackingScreen.js"
]

for file_path in files:
    full_path = os.path.join("/home/alauddin/Documents/ala/btob/BTOB/btob-mobile", file_path)
    if not os.path.exists(full_path):
        print(f"Skipping {file_path}, not found.")
        continue
    
    with open(full_path, 'r') as f:
        content = f.read()
    
    if "import { BRAND }" in content:
        print(f"Skipping {file_path}, already imported.")
        continue
    
    # Calculate depth to theme/brand
    depth = file_path.count('/')
    rel_path = "../" * (depth - 1) + "theme/brand"
    
    import_line = f"import {{ BRAND }} from '{rel_path}';\n"
    
    # Insert after last import or at top
    lines = content.split('\n')
    last_import_idx = -1
    for i, line in enumerate(lines):
        if line.startswith("import "):
            last_import_idx = i
    
    if last_import_idx != -1:
        lines.insert(last_import_idx + 1, import_line.strip())
    else:
        lines.insert(0, import_line.strip())
        
    with open(full_path, 'w') as f:
        f.write('\n'.join(lines))
    print(f"Added import to {file_path}")
