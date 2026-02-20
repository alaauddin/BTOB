function showSubTab(tabId) {
    document.querySelectorAll('.subtab-content').forEach(tab => tab.classList.add('hidden'));
    document.querySelectorAll('.tab-btn').forEach(btn => btn.classList.remove('active'));

    document.getElementById(tabId + '-subtab').classList.remove('hidden');
    event.currentTarget.classList.add('active');

    // Update hash
    history.replaceState(null, null, '#' + tabId);
}

// Restore tab from hash
window.addEventListener('load', () => {
    const hash = window.location.hash.replace('#', '');
    if (hash && document.getElementById(hash + '-subtab')) {
        showSubTab(hash);
    }
});

/**
 * Compresses an image file to be under maxSizeKB while maintaining quality.
 */
async function compressImage(file, maxSizeKB = 150) {
    if (!file.type.startsWith('image/') || file.size <= maxSizeKB * 1024) {
        return file;
    }

    return new Promise((resolve) => {
        const reader = new FileReader();
        reader.readAsDataURL(file);
        reader.onload = (event) => {
            const img = new Image();
            img.src = event.target.result;
            img.onload = () => {
                const canvas = document.createElement('canvas');
                let width = img.width;
                let height = img.height;

                // Max dimensions to avoid huge canvas and keep file size low
                const MAX_WIDTH = 1600;
                const MAX_HEIGHT = 1600;

                if (width > height) {
                    if (width > MAX_WIDTH) {
                        height *= MAX_WIDTH / width;
                        width = MAX_WIDTH;
                    }
                } else {
                    if (height > MAX_HEIGHT) {
                        width *= MAX_HEIGHT / height;
                        height = MAX_HEIGHT;
                    }
                }

                canvas.width = width;
                canvas.height = height;
                const ctx = canvas.getContext('2d');
                ctx.drawImage(img, 0, 0, width, height);

                // Iterative compression
                let quality = 0.9;
                const minQuality = 0.3;

                const processBlob = (blob) => {
                    if (blob.size <= maxSizeKB * 1024 || quality <= minQuality) {
                        const compressedFile = new File([blob], file.name, {
                            type: 'image/jpeg',
                            lastModified: Date.now()
                        });
                        console.log(`Compressed ${file.name}: ${(file.size / 1024).toFixed(2)}KB -> ${(compressedFile.size / 1024).toFixed(2)}KB`);
                        resolve(compressedFile);
                    } else {
                        quality -= 0.1;
                        canvas.toBlob(processBlob, 'image/jpeg', quality);
                    }
                };

                canvas.toBlob(processBlob, 'image/jpeg', quality);
            };
        };
    });
}

async function handleImageUpload(inputElement, maxSizeKB = 150) {
    const files = Array.from(inputElement.files);
    if (files.length === 0) return;

    const dataTransfer = new DataTransfer();

    for (const file of files) {
        if (file.type.startsWith('image/')) {
            const compressed = await compressImage(file, maxSizeKB);
            dataTransfer.items.add(compressed);
        } else {
            dataTransfer.items.add(file);
        }
    }

    inputElement.files = dataTransfer.files;

    if (!inputElement._isCompressing) {
        inputElement._isCompressing = true;
        inputElement.dispatchEvent(new Event('change', { bubbles: true }));
        setTimeout(() => inputElement._isCompressing = false, 100);
    }
}

function updateModalStatusBtn(productId, isActive) {
    const btn = document.getElementById('modalDeleteBtn');
    if (!btn) return;

    if (productId) {
        btn.classList.remove('hidden');
        btn.onclick = () => confirmToggleProductStatus(productId, isActive);

        btn.classList.remove('bg-orange-50', 'text-orange-500', 'hover:bg-orange-100', 'bg-green-50', 'text-green-500', 'hover:bg-green-100', 'bg-red-50', 'text-red-500', 'hover:bg-red-100');

        if (isActive) {
            btn.classList.add('bg-orange-50', 'text-orange-500', 'hover:bg-orange-100');
            btn.innerHTML = '<i class="fas fa-eye-slash ml-1"></i> تعطيل';
        } else {
            btn.classList.add('bg-green-50', 'text-green-500', 'hover:bg-green-100');
            btn.innerHTML = '<i class="fas fa-eye ml-1"></i> تنشيط';
        }
    } else {
        btn.classList.add('hidden');
        btn.onclick = null;
    }
}

function confirmToggleProductStatus(productId, isActive) {
    Swal.fire({
        title: isActive ? 'تعطيل المنتج؟' : 'تنشيط المنتج؟',
        text: isActive ? "لن يظهر هذا المنتج للعملاء بعد التعطيل." : "سيظهر هذا المنتج للعملاء مرة أخرى.",
        icon: isActive ? 'warning' : 'info',
        showCancelButton: true,
        confirmButtonColor: isActive ? '#ef4444' : '#10b981',
        cancelButtonColor: '#cbd5e1',
        confirmButtonText: isActive ? 'نعم، تعطيل' : 'نعم، تنشيط',
        cancelButtonText: 'إلغاء'
    }).then((result) => {
        if (result.isConfirmed) {
            toggleProductStatus(productId);
        }
    });
}

function toggleProductStatus(productId) {
    fetch(`/toggle-product-status/${productId}/`, {
        method: 'POST',
        headers: {
            'X-CSRFToken': document.querySelector('[name=csrfmiddlewaretoken]').value,
            'X-Requested-With': 'XMLHttpRequest'
        }
    })
        .then(response => response.json())
        .then(data => {
            if (data.success) {
                showNotification(data.message, 'success');
                // Update specific row UI instead of reload if possible, but reload for consistency
                setTimeout(() => location.reload(), 1000);
            } else {
                showNotification(data.message || 'فشل في تحديث الحالة', 'error');
            }
        })
        .catch(error => {
            console.error('Error toggling product status:', error);
            showNotification('حدث خطأ أثناء الاتصال بالخادم', 'error');
        });
}

function deleteProduct(productId) {
    Swal.fire({
        title: 'هل أنت متأكد؟',
        text: "لن تتمكن من التراجع عن هذا الإجراء!",
        icon: 'warning',
        showCancelButton: true,
        confirmButtonColor: '#ef4444',
        cancelButtonColor: '#cbd5e1',
        confirmButtonText: 'نعم، احذف',
        cancelButtonText: 'إلغاء'
    }).then((result) => {
        if (result.isConfirmed) {
            fetch(`/delete-product/${productId}/`, {
                method: 'POST',
                headers: {
                    'X-CSRFToken': document.querySelector('[name=csrfmiddlewaretoken]').value,
                    'X-Requested-With': 'XMLHttpRequest'
                }
            })
                .then(res => res.json())
                .then(data => {
                    if (data.success) {
                        showNotification('تم حذف المنتج بنجاح', 'success');
                        setTimeout(() => location.reload(), 1000);
                    } else {
                        showNotification(data.message, 'error');
                    }
                });
        }
    });
}

function shareProduct(productId, productName) {
    const url = `${window.merchantConfig.host}/${window.merchantConfig.storeId}/details/${productId}/`;

    const fbShareUrl = `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(url)}`;

    // Properly format the WhatsApp message with a newline
    const waText = encodeURIComponent(`شاهد هذا المنتج: ${productName}\n${url}`);
    const waShareUrl = `https://api.whatsapp.com/send?text=${waText}`;

    // Escape productName to prevent quotes from breaking the template
    const safeProductName = productName.replace(/'/g, "\\'").replace(/"/g, '&quot;');

    Swal.fire({
        title: 'مشاركة المنتج',
        html: `
            <div class="flex flex-col gap-3 mt-4 font-sans px-2">
                <a href="${waShareUrl}" target="_blank" class="w-full flex items-center justify-center gap-2 py-3 text-white rounded-xl font-bold transition-colors" style="background-color: #25D366 !important; text-decoration: none;">
                    <i class="fab fa-whatsapp text-xl"></i>
                    مشاركة عبر واتساب
                </a>
                <a href="${fbShareUrl}" target="_blank" class="w-full flex items-center justify-center gap-2 py-3 text-white rounded-xl font-bold transition-colors" style="background-color: #1877F2 !important; text-decoration: none;">
                    <i class="fab fa-facebook-f text-xl"></i>
                    مشاركة عبر فيسبوك
                </a>
                <button onclick="copyToClipboard('${url}')" class="w-full flex items-center justify-center gap-2 py-3 bg-slate-100 text-slate-700 rounded-xl font-bold hover:bg-slate-200 transition-colors border-0 cursor-pointer" style="background-color: #f1f5f9 !important; color: #334155 !important;">
                    <i class="fas fa-link text-lg"></i>
                    نسخ الرابط
                </button>
            </div>
        `,
        showConfirmButton: false,
        showCloseButton: true,
        customClass: {
            popup: 'rounded-2xl shadow-xl',
        }
    });
}

window.copyToClipboard = function (text) {
    if (navigator.clipboard) {
        navigator.clipboard.writeText(text).then(() => {
            showNotification('تم نسخ الرابط بنجاح!', 'success');
            Swal.close();
        }).catch(() => {
            showNotification('فشل نسخ الرابط', 'error');
        });
    } else {
        // Fallback for older browsers
        const textArea = document.createElement("textarea");
        textArea.value = text;
        document.body.appendChild(textArea);
        textArea.focus();
        textArea.select();
        try {
            document.execCommand('copy');
            showNotification('تم نسخ الرابط بنجاح!', 'success');
            Swal.close();
        } catch (err) {
            showNotification('فشل نسخ الرابط', 'error');
        }
        document.body.removeChild(textArea);
    }
};

function openAddOfferModal(productId) {
    // Redirect to add offer page with product context and return URL
    const next = encodeURIComponent(window.location.pathname + window.location.search);
    let url = `/add-offer/?product_id=${productId}&next=${next}`;
    const urlParams = new URLSearchParams(window.location.search);
    const supplierId = urlParams.get('supplier_id');
    if (supplierId) {
        url += `&supplier_id=${supplierId}`;
    }
    window.location.href = url;
}

function editOffer(offerId) {
    // Redirect to edit offer page with return URL
    const next = encodeURIComponent(window.location.pathname + window.location.search);
    window.location.href = `/edit-offer/${offerId}/?next=${next}`;
}

function openPromotionModal() {
    // If snippet exists, show it
    const modal = document.getElementById('promotion-modal');
    if (modal) {
        modal.classList.remove('hidden');
    } else {
        window.location.href = '/request-promotion/';
    }
}

function openAddProductModal() {
    resetModal();
    updateModalStatusBtn(null);
    document.getElementById('modal-title').textContent = 'إضافة منتج جديد';
    document.getElementById('submitBtnText').textContent = 'إضافة المنتج';
    document.getElementById('productForm').action = window.merchantConfig.addProductUrl;
    document.getElementById('product-modal').classList.remove('hidden');
}

function editProduct(productId) {
    resetModal();
    const btn = (typeof event !== 'undefined' && event.currentTarget) ? event.currentTarget : null;
    if (btn) btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i>';

    fetch(`/edit-product/${productId}/`, {
        headers: { 'X-Requested-With': 'XMLHttpRequest' }
    })
        .then(response => response.json())
        .then(data => {
            if (data.success) {
                const p = data.product;
                document.getElementById('edit-product-id').value = p.id;
                document.getElementById('id_name').value = p.name;
                document.getElementById('id_description').value = p.description;
                document.getElementById('id_price').value = p.price;
                if (p.category_id) document.getElementById('id_category').value = p.category_id;
                document.getElementById('id_stock').value = p.stock || 0;
                document.getElementById('id_is_new').checked = p.is_new;

                if (p.image_url) {
                    document.getElementById('modalPreviewImage').src = p.image_url;
                    document.getElementById('modalFilePreview').classList.remove('hidden');
                    document.getElementById('modalFileUploadContent').classList.add('hidden');
                }

                document.getElementById('modal-title').textContent = 'تعديل المنتج';
                document.getElementById('submitBtnText').textContent = 'حفظ التغييرات';
                document.getElementById('productForm').action = `/edit-product/${productId}/`;
                updateModalStatusBtn(productId, p.is_active);

                document.getElementById('product-modal').classList.remove('hidden');
            }
        })
        .finally(() => {
            if (btn) btn.innerHTML = '<i class="fas fa-edit"></i> تعديل';
        });
}

function closeProductModal() {
    document.getElementById('product-modal').classList.add('hidden');
}

function resetModal() {
    document.getElementById('productForm').reset();
    document.getElementById('edit-product-id').value = '';
    document.getElementById('modalFilePreview').classList.add('hidden');
    document.getElementById('modalFileUploadContent').classList.remove('hidden');
    document.getElementById('modalVideoPreview').classList.add('hidden');
    document.getElementById('modalVideoUploadContent').classList.remove('hidden');

    const countBadge = document.getElementById('additional-images-count');
    if (countBadge) countBadge.classList.add('hidden');

    updateModalStatusBtn(null);
    document.querySelectorAll('.error-message').forEach(el => el.classList.add('hidden'));
}

document.getElementById('productForm').addEventListener('submit', function (e) {
    e.preventDefault();
    const btn = document.getElementById('modalSubmitBtn');
    const spinner = btn.querySelector('.loading-spinner');
    const text = document.getElementById('submitBtnText');

    btn.disabled = true;
    spinner.classList.remove('hidden');
    text.classList.add('opacity-0');

    const formData = new FormData(this);

    fetch(this.action, {
        method: 'POST',
        body: formData,
        headers: {
            'X-Requested-With': 'XMLHttpRequest',
            'X-CSRFToken': document.querySelector('[name=csrfmiddlewaretoken]').value
        }
    })
        .then(res => res.json())
        .then(data => {
            if (data.success) {
                showNotification(data.message, 'success');
                setTimeout(() => window.location.reload(), 1000);
            } else {
                if (data.errors) {
                    for (const [field, msg] of Object.entries(data.errors)) {
                        const err = document.getElementById(`${field}-error`);
                        if (err) {
                            err.textContent = msg;
                            err.classList.remove('hidden');
                        }
                    }
                } else {
                    showNotification(data.message, 'error');
                }
            }
        })
        .catch(err => {
            console.error(err);
            showNotification('حدث خطأ في الاتصال', 'error');
        })
        .finally(() => {
            btn.disabled = false;
            spinner.classList.add('hidden');
            text.classList.remove('opacity-0');
        });
});

window.openCategoryModal = () => document.getElementById('category-modal').classList.remove('hidden');
window.closeCategoryModal = () => document.getElementById('category-modal').classList.add('hidden');
window.toggleNewParentInput = (val) => {
    document.getElementById('new-parent-container').classList.toggle('hidden', val !== 'new');
};

window.submitCategory = () => {
    const parentId = document.getElementById('parent-category-select').value;
    const newParentName = document.getElementById('new-parent-name').value;
    const subName = document.getElementById('subcategory-name').value;
    const btn = document.getElementById('submitCategoryBtn');

    if ((parentId === 'new' && !newParentName) || !subName) {
        showNotification('يرجى ملء جميع الحقول', 'error');
        return;
    }

    btn.disabled = true;
    const formData = new FormData();
    formData.append('parent_id', parentId);
    formData.append('new_parent_name', newParentName);
    formData.append('subcategory_name', subName);
    formData.append('supplier_id', window.merchantConfig.supplierId);

    fetch(window.merchantConfig.addCategoryAjaxUrl, {
        method: 'POST',
        body: formData,
        headers: {
            'X-Requested-With': 'XMLHttpRequest',
            'X-CSRFToken': window.merchantConfig.csrfToken
        }
    })
        .then(res => res.json())
        .then(data => {
            if (data.success) {
                const select = document.getElementById('id_category');
                const opt = new Option(data.category.name, data.category.id, true, true);
                select.add(opt);
                closeCategoryModal();
                showNotification('تمت إضافة الفئة بنجاح', 'success');
            } else {
                showNotification(data.message, 'error');
            }
        })
        .finally(() => btn.disabled = false);
};

// --- Real-time Filtering V2 ---
const productSearch = document.getElementById('productSearch');
const categoryFilter = document.getElementById('categoryFilter');
const productGrid = document.getElementById('mainProductGrid');
const noResults = document.getElementById('noResults');
let currentStatusFilter = 'all';

function toggleFilters() {
    const content = document.getElementById('collapsibleFilters');
    const btn = document.getElementById('filterToggleBtn');
    content.classList.toggle('show');
    btn.classList.toggle('active');
}

function filterByStatus(status) {
    currentStatusFilter = status;

    // Update Tabs UI
    document.querySelectorAll('.status-tab').forEach(tab => {
        tab.classList.toggle('active', tab.dataset.status === status);
    });

    filterProducts();
}

function filterProducts() {
    const searchTerm = productSearch ? productSearch.value.toLowerCase() : '';
    const selectedCat = categoryFilter ? categoryFilter.value : '';
    const products = document.querySelectorAll('.product-row');
    let visibleCount = 0;

    products.forEach(p => {
        const name = p.getAttribute('data-name');
        const category = p.getAttribute('data-category');
        const isActive = p.getAttribute('data-is-active') === 'true';
        const isNew = p.getAttribute('data-is-new') === 'true';
        const hasOffer = p.getAttribute('data-has-offer') === 'true';

        const matchesSearch = name.includes(searchTerm);
        const matchesCategory = selectedCat === '' || category === selectedCat;

        let matchesStatus = true;
        if (currentStatusFilter === 'active') matchesStatus = isActive;
        else if (currentStatusFilter === 'inactive') matchesStatus = !isActive;
        else if (currentStatusFilter === 'new') matchesStatus = isNew;
        else if (currentStatusFilter === 'offered') matchesStatus = hasOffer;

        if (matchesSearch && matchesCategory && matchesStatus) {
            p.classList.remove('hidden');
            p.classList.add('animate-row');
            visibleCount++;
        } else {
            p.classList.add('hidden');
            p.classList.remove('animate-row');
        }
    });

    if (visibleCount === 0 && productGrid) {
        if (noResults) noResults.classList.remove('hidden');
    } else if (noResults) {
        if (noResults) noResults.classList.add('hidden');
    }
}

function toggleRowDropdown(e) {
    e.stopPropagation();
    const dropdown = e.currentTarget.nextElementSibling;

    // Close other open dropdowns
    document.querySelectorAll('.dropdown-menu-row.show').forEach(el => {
        if (el !== dropdown) el.classList.remove('show');
    });

    dropdown.classList.toggle('show');
}

// Close dropdowns on outside click
document.addEventListener('click', () => {
    document.querySelectorAll('.dropdown-menu-row.show').forEach(el => {
        el.classList.remove('show');
    });
});

function showNotification(message, type = 'success') {
    const toast = document.createElement('div');
    toast.className = `custom-toast toast-${type}`;
    toast.innerHTML = `
        <div class="toast-content">
            <i class="fas ${type === 'success' ? 'fa-check-circle' : 'fa-exclamation-circle'}"></i>
            <span>${message}</span>
        </div>
    `;
    document.body.appendChild(toast);

    setTimeout(() => {
        toast.classList.add('show');
        setTimeout(() => {
            toast.classList.remove('show');
            setTimeout(() => toast.remove(), 400);
        }, 3000);
    }, 100);
}
