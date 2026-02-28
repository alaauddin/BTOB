import os
import re

VIEWS_DIR = '/home/alauddin/Documents/ala/btob/BTOB/core/views'

# Patterns to replace with supplier = get_active_supplier(request)
# Pattern 1: the big if/else in MyMerchant.py and others
pattern1 = re.compile(r"^[ \t]*if request\.user\.is_superuser and request\.GET\.get\('supplier_id'\):\n[ \t]*supplier_id = request\.GET\.get\('supplier_id'\)\n[ \t]*supplier = Supplier\.objects\.filter\(id=supplier_id\)\.first\(\)\n[ \t]*else:\n(?:[ \t]*#.*\n)*[ \t]*supplier = getattr\(request\.user, 'supplier', None\)", re.MULTILINE)

# Pattern 1b: slightly different in quick_update_stock
pattern1b = re.compile(r"^[ \t]*if request\.user\.is_superuser and \(request\.POST\.get\('supplier_id'\) or request\.GET\.get\('supplier_id'\)\):\n[ \t]*supplier_id = request\.POST\.get\('supplier_id'\) or request\.GET\.get\('supplier_id'\)\n[ \t]*supplier = get_object_or_404\(Supplier, id=supplier_id\)\n[ \t]*else:\n[ \t]*supplier = getattr\(request\.user, 'supplier', None\)", re.MULTILINE)

# Pattern 2: simple getattr
pattern2 = re.compile(r"supplier\s*=\s*getattr\(request\.user,\s*'supplier',\s*None\)")

# Pattern 3: Supplier.objects.filter(user=request.user).first()
pattern3 = re.compile(r"supplier\s*=\s*Supplier\.objects\.filter\(user=request\.user\)\.first\(\)")

# Pattern 4: Supplier.objects.get(user=request.user)
pattern4 = re.compile(r"supplier\s*=\s*Supplier\.objects\.get\(user=request\.user\)")

# Pattern 5: get_object_or_404(Supplier, user=request.user)
pattern5 = re.compile(r"supplier\s*=\s*get_object_or_404\(Supplier,\s*user=request\.user\)")

# Pattern 6: settings form where supplier could be POST
pattern6 = re.compile(r"^[ \t]*if request\.user\.is_superuser:\n[ \t]*if request\.POST\.get\('supplier_id'\):\n[ \t]*supplier = Supplier\.objects\.filter\(id=request\.POST\.get\('supplier_id'\)\)\.first\(\)\n[ \t]*elif request\.GET\.get\('supplier_id'\):\n[ \t]*supplier = Supplier\.objects\.filter\(id=request\.GET\.get\('supplier_id'\)\)\.first\(\)\n\n[ \t]*if not supplier:\n[ \t]*supplier = getattr\(request\.user, 'supplier', None\)", re.MULTILINE)

repl_str = "supplier = get_active_supplier(request)"

for root, _, files in os.walk(VIEWS_DIR):
    for filename in files:
        if not filename.endswith('.py'): continue
        filepath = os.path.join(root, filename)
        with open(filepath, 'r') as f:
            content = f.read()
            
        original_content = content
        
        # apply regexes
        # Use a function to dynamically replace with the right indentation
        def repl_func(match):
            indent = match.group(0).split('if')[0] if 'if' in match.group(0) else match.group(0).split('supplier')[0]
            if not indent.strip() == '':
                # meaning it starts with whitespaces
                indent = match.group(0)[:len(match.group(0)) - len(match.group(0).lstrip())]
            return indent + "supplier = get_active_supplier(request)"
            
        content = pattern1.sub(repl_func, content)
        content = pattern1b.sub(repl_func, content)
        content = pattern6.sub(repl_func, content)
        content = pattern2.sub("supplier = get_active_supplier(request)", content)
        content = pattern3.sub("supplier = get_active_supplier(request)", content)
        content = pattern4.sub("supplier = get_active_supplier(request)", content)
        content = pattern5.sub("supplier = get_active_supplier(request)", content)
        
        if content != original_content:
            # Need to add import
            if "from core.utils.merchant_utils import get_active_supplier" not in content:
                # Add to top after other imports
                lines = content.split('\n')
                import_idx = 0
                for i, line in enumerate(lines):
                    if line.startswith('import ') or line.startswith('from '):
                        import_idx = i
                lines.insert(import_idx + 1, "from core.utils.merchant_utils import get_active_supplier")
                content = '\n'.join(lines)
                
            with open(filepath, 'w') as f:
                f.write(content)
            print(f"Updated {filename}")

