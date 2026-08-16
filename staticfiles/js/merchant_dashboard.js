/**
 * Merchant Dashboard Logic
 * Refactored for BTOB Platform
 */

// Global variables for Map and Charts
let map, marker;
let visitorsChart = null;
let productsChart = null;
let cropper;
let croppedProfileBlob = null;

/**
 * Toggle dashboard background dimming when modals are active
 */
function toggleModalFocus(active) {
    if (active) {
        document.body.classList.add('modal-active');
    } else {
        document.body.classList.remove('modal-active');
    }
}

/**
 * Checklist Modal Controls
 */
function openChecklistModal() {
    const modal = document.getElementById('checklist-modal');
    if (!modal) return;
    modal.classList.remove('hidden');
    modal.classList.add('flex');
    document.body.style.overflow = 'hidden';
    toggleModalFocus(true);
}

function closeChecklistModal() {
    const modal = document.getElementById('checklist-modal');
    if (!modal) return;
    modal.classList.add('hidden');
    modal.classList.remove('flex');
    document.body.style.overflow = '';
    toggleModalFocus(false);
}

/**
 * Store Settings Modal Controls
 */
function openSettingsModal() {
    const modal = document.getElementById('settings-modal');
    if (!modal) return;
    modal.classList.remove('hidden');
    document.body.style.overflow = 'hidden';
    toggleModalFocus(true);
    
    // Initialize map when modal opens
    setTimeout(() => {
        const latInput = document.getElementById('id_latitude');
        const lngInput = document.getElementById('id_longitude');
        const lat = latInput ? parseFloat(latInput.value) || 15.3694 : 15.3694;
        const lng = lngInput ? parseFloat(lngInput.value) || 44.1910 : 44.1910;
        
        if (!map && typeof L !== 'undefined') {
            map = L.map('selection-map').setView([lat, lng], 13);
            L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
                attribution: '&copy; OpenStreetMap contributors'
            }).addTo(map);
            
            marker = L.marker([lat, lng], {draggable: true}).addTo(map);
            
            marker.on('dragend', function(e) {
                const position = marker.getLatLng();
                if (latInput) latInput.value = position.lat.toFixed(6);
                if (lngInput) lngInput.value = position.lng.toFixed(6);
            });

            map.on('click', function(e) {
                marker.setLatLng(e.latlng);
                if (latInput) latInput.value = e.latlng.lat.toFixed(6);
                if (lngInput) lngInput.value = e.latlng.lng.toFixed(6);
            });
        } else if (map) {
            map.invalidateSize();
        }
    }, 100);
}

function closeSettingsModal() {
    const modal = document.getElementById('settings-modal');
    if (!modal) return;
    modal.classList.add('hidden');
    document.body.style.overflow = '';
    toggleModalFocus(false);
}

/**
 * Copy Store Link utility
 */
function copyStoreLink() {
    const copyText = document.getElementById("storeLink");
    if (!copyText) return;
    
    const showSuccess = () => {
        if (typeof Swal !== 'undefined') {
            Swal.fire({
                icon: 'success',
                title: 'تم النسخ!',
                text: 'تم نسخ رابط المتجر إلى الحافظة',
                timer: 1500,
                showConfirmButton: false,
                toast: true,
                position: 'top-end'
            });
        }
    };

    if (navigator.clipboard) {
        navigator.clipboard.writeText(copyText.value).then(showSuccess, (err) => {
            console.error('Could not copy text: ', err);
        });
    } else {
        copyText.select();
        copyText.setSelectionRange(0, 99999);
        document.execCommand("copy");
        showSuccess();
    }
}

/**
 * Image Processing & Cropper
 */
function initImageHandlers() {
    const profileInput = document.getElementById('profile_input');
    const bannerInput = document.getElementById('banner_input');
    const cropperModal = document.getElementById('cropper-modal');
    const croppingImg = document.getElementById('cropping-image');

    if (profileInput) {
        profileInput.onchange = function() {
            if (this.files && this.files[0]) {
                const MAX_FILE_SIZE_MB = 5;
                if (this.files[0].size > MAX_FILE_SIZE_MB * 1024 * 1024) {
                    const sizeMB = (this.files[0].size / 1024 / 1024).toFixed(1);
                    Swal.fire({
                        icon: 'error',
                        title: 'حجم الصورة كبير جداً',
                        html: `حجم الصورة <b>${sizeMB}MB</b>.<br>الحد الأقصى المسموح هو <b>${MAX_FILE_SIZE_MB}MB</b>.`,
                        confirmButtonText: 'فهمت',
                        confirmButtonColor: '#ef4444'
                    });
                    this.value = '';
                    return;
                }
                const reader = new FileReader();
                reader.onload = function(e) {
                    croppingImg.src = e.target.result;
                    cropperModal.classList.remove('hidden');
                    if (cropper) cropper.destroy();
                    if (typeof Cropper !== 'undefined') {
                        cropper = new Cropper(croppingImg, {
                            aspectRatio: 1,
                            viewMode: 1,
                            dragMode: 'move',
                            guides: true,
                            cropBoxMovable: true,
                            cropBoxResizable: true,
                            toggleDragModeOnDblclick: false,
                        });
                    }
                };
                reader.readAsDataURL(this.files[0]);
            }
        };
    }

    if (bannerInput) {
        bannerInput.onchange = async function() {
            if (this.files && this.files[0]) {
                const MAX_FILE_SIZE_MB = 5;
                if (this.files[0].size > MAX_FILE_SIZE_MB * 1024 * 1024) {
                    const sizeMB = (this.files[0].size / 1024 / 1024).toFixed(1);
                    Swal.fire({
                        icon: 'error',
                        title: 'حجم الصورة كبير جداً',
                        html: `حجم الصورة <b>${sizeMB}MB</b>.<br>الحد الأقصى المسموح هو <b>${MAX_FILE_SIZE_MB}MB</b>.`,
                        confirmButtonText: 'فهمت',
                        confirmButtonColor: '#ef4444'
                    });
                    this.value = '';
                    return;
                }
                const compressed = await compressImageToWebP(this.files[0]);
                const dt = new DataTransfer();
                dt.items.add(compressed);
                this.files = dt.files;

                const preview = document.getElementById('banner_preview');
                if (preview) {
                    preview.src = URL.createObjectURL(compressed);
                    preview.classList.remove('hidden');
                }
            }
        };
    }
}

function closeCropper() {
    const cropperModal = document.getElementById('cropper-modal');
    const profileInput = document.getElementById('profile_input');
    if (cropperModal) cropperModal.classList.add('hidden');
    if (profileInput) profileInput.value = '';
    croppedProfileBlob = null;
    if (cropper) cropper.destroy();
}

function applyCrop() {
    if (!cropper) return;
    const sourceCanvas = cropper.getCroppedCanvas({ width: 512, height: 512 });
    const roundedCanvas = document.createElement('canvas');
    const ctx = roundedCanvas.getContext('2d');
    roundedCanvas.width = sourceCanvas.width;
    roundedCanvas.height = sourceCanvas.height;

    ctx.beginPath();
    ctx.arc(roundedCanvas.width / 2, roundedCanvas.height / 2, Math.min(roundedCanvas.width, roundedCanvas.height) / 2, 0, 2 * Math.PI);
    ctx.closePath();
    ctx.clip();
    ctx.drawImage(sourceCanvas, 0, 0);
    
    roundedCanvas.toBlob((blob) => {
        croppedProfileBlob = blob;
        const preview = document.getElementById('profile_preview');
        const profileInput = document.getElementById('profile_input');
        if (preview) {
            preview.src = URL.createObjectURL(blob);
            preview.classList.remove('hidden');
        }
        if (profileInput) {
            const file = new File([blob], "cropped_logo.webp", {type: "image/webp"});
            const container = new DataTransfer();
            container.items.add(file);
            profileInput.files = container.files;
        }
        document.getElementById('cropper-modal').classList.add('hidden');
    }, 'image/webp', 0.85);
}

async function compressImageToWebP(file, maxSizeKB = 150) {
    if (!file.type.startsWith('image/')) return file;
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
                const MAX_DIM = 1600;
                if (width > height) {
                    if (width > MAX_DIM) { height *= MAX_DIM / width; width = MAX_DIM; }
                } else {
                    if (height > MAX_DIM) { width *= MAX_DIM / height; height = MAX_DIM; }
                }
                canvas.width = width;
                canvas.height = height;
                canvas.getContext('2d').drawImage(img, 0, 0, width, height);
                let quality = 0.9;
                const minQuality = 0.3;
                const processBlob = (blob) => {
                    if (blob.size <= maxSizeKB * 1024 || quality <= minQuality) {
                        const compressedName = file.name.replace(/\.[^/.]+$/, '.webp');
                        resolve(new File([blob], compressedName, { type: 'image/webp', lastModified: Date.now() }));
                    } else {
                        quality -= 0.1;
                        canvas.toBlob(processBlob, 'image/webp', quality);
                    }
                };
                canvas.toBlob(processBlob, 'image/webp', quality);
            };
        };
    });
}

/**
 * Form Submission Handlers
 */
function initFormHandlers() {
    const settingsForm = document.getElementById('settingsForm');
    if (settingsForm) {
        settingsForm.addEventListener('submit', function(e) {
            e.preventDefault();
            const formData = new FormData(this);
            if (croppedProfileBlob) {
                formData.set('profile_picture', croppedProfileBlob, 'cropped_logo.webp');
            }
            
            Swal.fire({
                title: 'جاري الحفظ...',
                allowOutsideClick: false,
                didOpen: () => { Swal.showLoading(); }
            });

            fetch(this.action, {
                method: 'POST',
                body: formData,
                headers: {
                    'X-Requested-With': 'XMLHttpRequest',
                    'X-CSRFToken': formData.get('csrfmiddlewaretoken')
                }
            })
            .then(res => res.json())
            .then(data => {
                if (data.success) {
                    Swal.fire({
                        icon: 'success',
                        title: 'تم التحديث',
                        text: 'تم حفظ إعدادات المتجر بنجاح',
                        timer: 1500,
                        showConfirmButton: false
                    }).then(() => location.reload());
                } else {
                    const errorMsg = data.errors ? Object.values(data.errors).flat().join('\n') : 'فشل تحديث الإعدادات';
                    Swal.fire('خطأ', errorMsg, 'error');
                }
            })
            .catch(err => {
                console.error(err);
                Swal.fire('خطأ', 'حدث خطأ في الاتصال', 'error');
            });
        });
    }
}

/**
 * Analytics Charts
 */
function switchChart(type) {
    const visitorsBtn = document.getElementById('toggle-visitors');
    const productsBtn = document.getElementById('toggle-products');
    const visitorsContainer = document.getElementById('visitors-chart-container');
    const productsContainer = document.getElementById('products-chart-container');

    if (type === 'visitors') {
        if (visitorsBtn) visitorsBtn.className = "flex-1 sm:px-6 h-full rounded-xl text-xs font-black transition-all bg-white text-blue-600 shadow-sm border border-gray-200/50";
        if (productsBtn) productsBtn.className = "flex-1 sm:px-6 h-full rounded-xl text-xs font-bold transition-all text-gray-500 hover:text-gray-700";
        if (visitorsContainer) visitorsContainer.classList.remove('hidden');
        if (productsContainer) productsContainer.classList.add('hidden');
    } else {
        if (productsBtn) productsBtn.className = "flex-1 sm:px-6 h-full rounded-xl text-xs font-black transition-all bg-white text-purple-600 shadow-sm border border-gray-200/50";
        if (visitorsBtn) visitorsBtn.className = "flex-1 sm:px-6 h-full rounded-xl text-xs font-bold transition-all text-gray-500 hover:text-gray-700";
        if (productsContainer) productsContainer.classList.remove('hidden');
        if (visitorsContainer) visitorsContainer.classList.add('hidden');
        if (productsChart) productsChart.update();
    }
}

function initAnalytics(config) {
    const ctxVisitors = document.getElementById('visitorsChart');
    if (ctxVisitors && config.visitorLabels) {
        visitorsChart = new Chart(ctxVisitors.getContext('2d'), {
            type: 'line',
            data: {
                labels: config.visitorLabels.map(d => d.split('-').slice(1).join('/')),
                datasets: [{
                    label: 'عدد الزيارات',
                    data: config.visitorData,
                    borderColor: '#3b82f6',
                    backgroundColor: 'rgba(59, 130, 246, 0.1)',
                    borderWidth: 3,
                    fill: true,
                    tension: 0.4,
                    pointRadius: 2,
                    pointHoverRadius: 6,
                    pointBackgroundColor: '#3b82f6',
                    pointBorderColor: '#fff',
                    pointBorderWidth: 2
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: { display: false },
                    tooltip: {
                        mode: 'index',
                        intersect: false,
                        backgroundColor: '#1e293b',
                        titleFont: { family: 'Tajawal', weight: 'bold' },
                        bodyFont: { family: 'Tajawal' },
                        padding: 12,
                        cornerRadius: 12
                    }
                },
                scales: {
                    x: {
                        grid: { display: false },
                        ticks: { font: { family: 'Tajawal', size: 10 }, color: '#94a3b8' }
                    },
                    y: {
                        beginAtZero: true,
                        grid: { color: '#f1f5f9' },
                        ticks: { font: { family: 'Tajawal', size: 10 }, color: '#94a3b8' }
                    }
                }
            }
        });
    }

    const ctxProducts = document.getElementById('productsChart');
    if (ctxProducts && config.productLabels) {
        productsChart = new Chart(ctxProducts.getContext('2d'), {
            type: 'bar',
            data: {
                labels: config.productLabels,
                datasets: [{
                    label: 'عدد المشاهدات',
                    data: config.productViews,
                    backgroundColor: '#8b5cf6',
                    borderRadius: 8,
                    barThickness: 20
                }]
            },
            options: {
                indexAxis: 'y',
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: { display: false },
                    tooltip: {
                        backgroundColor: '#1e293b',
                        titleFont: { family: 'Tajawal', weight: 'bold' },
                        bodyFont: { family: 'Tajawal' },
                        padding: 12,
                        cornerRadius: 12
                    }
                },
                scales: {
                    x: {
                        beginAtZero: true,
                        grid: { color: '#f1f5f9' },
                        ticks: { font: { family: 'Tajawal', size: 10 }, color: '#94a3b8' }
                    },
                    y: {
                        grid: { display: false },
                        ticks: { font: { family: 'Tajawal', size: 10 }, color: '#1e293b', weight: 'bold' }
                    }
                }
            }
        });
    }
}

/**
 * Onboarding Progress Logic
 */
function updateOnboardingProgress(config) {
    if (!config) return;
    const { hasLogo, hasCover, hasLocation, hasCurrency, hasSubdomain, hasProducts, showAgreement } = config;

    let percent = showAgreement ? 30 : 20;
    if (!showAgreement) percent += 10;
    if (hasLogo) percent += 10;
    if (hasCover) percent += 10;
    if (hasLocation) percent += 10;
    if (hasCurrency) percent += 10;
    if (hasProducts) percent += 20;
    if (hasSubdomain) percent += 10;

    const bar = document.getElementById('progress-bar');
    const text = document.getElementById('progress-percent');
    const suggestion = document.getElementById('progress-suggestion');
    
    if (bar && text) {
        bar.style.width = percent + '%';
        text.innerText = percent + '%';
        
        const markers = {
            'marker-logo': hasLogo,
            'marker-cover': hasCover,
            'marker-location': hasLocation,
            'marker-currency': hasCurrency,
            'marker-products': hasProducts,
            'marker-subdomain': hasSubdomain
        };

        Object.keys(markers).forEach(id => {
            const marker = document.getElementById(id);
            if (marker) {
                if (markers[id]) {
                    marker.classList.add('active');
                } else {
                    marker.classList.remove('active');
                }
            }
        });

        if (percent === 100) {
            if (suggestion) suggestion.innerText = "متجرك جاهز تماماً للانطلاق! 🌟";
        } else if (percent >= 80) {
            if (suggestion) suggestion.innerText = "خطوة واحدة تفصلك عن النجاح! 🎯";
        } else if (percent >= 50) {
            if (suggestion) suggestion.innerText = "أداء رائع! استمر في بناء متجرك 🚀";
        } else {
            if (suggestion) suggestion.innerText = "أكمل الخطوات المتبقية لزيادة مبيعاتك بنسبة 300%";
        }
    }
}

/**
 * Inherit Product Logic
 */
function inheritProduct(btn, productId, productName, suggestedPrice, csrfToken) {
    Swal.fire({
        title: 'تحديد سعر البيع',
        text: `تم اقتراح سعر بيع ${suggestedPrice} لهذا المنتج. يمكنك تغييره الآن:`,
        input: 'number',
        inputValue: suggestedPrice,
        inputAttributes: { min: 0, step: '0.01', autofocus: 'autofocus' },
        showCancelButton: true,
        confirmButtonColor: '#2563eb',
        cancelButtonColor: '#64748b',
        confirmButtonText: 'إضافة لمتجري',
        cancelButtonText: 'إلغاء',
        borderRadius: '24px',
        inputValidator: (value) => {
            if (!value || value <= 0) return 'يرجى إدخال سعر صالح أكبر من صفر';
        }
    }).then((result) => {
        if (result.isConfirmed) {
            const finalPrice = result.value;
            const originalText = btn.innerHTML;
            btn.disabled = true;
            btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i>';

            fetch(`/inherit-product/${productId}/`, {
                method: 'POST',
                headers: {
                    'X-CSRFToken': csrfToken,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ custom_price: finalPrice })
            })
            .then(response => response.json())
            .then(data => {
                if (data.success) {
                    Swal.fire({
                        title: 'تمت الإضافة! 🎉',
                        text: data.message,
                        icon: 'success',
                        confirmButtonText: 'حسناً',
                        borderRadius: '24px'
                    }).then(() => location.reload());
                } else {
                    Swal.fire('خطأ!', data.message, 'error');
                    btn.disabled = false;
                    btn.innerHTML = originalText;
                }
            })
            .catch(error => {
                console.error('Error:', error);
                btn.disabled = false;
                btn.innerHTML = originalText;
            });
        }
    });
}

/**
 * Terms Agreement Logic
 */
function initTermsHandler(csrfToken, supplierId) {
    const checkbox = document.getElementById('agree-checkbox');
    const agreeBtn = document.getElementById('agree-btn');
    const termsModal = document.getElementById('terms-modal');
    
    if (!termsModal || !checkbox || !agreeBtn) return;
    
    checkbox.addEventListener('change', function() {
        if (this.checked) {
            agreeBtn.disabled = false;
            agreeBtn.classList.remove('bg-gray-300', 'text-gray-500', 'cursor-not-allowed');
            agreeBtn.classList.add('bg-gradient-to-r', 'from-blue-600', 'to-purple-600', 'text-white', 'hover:shadow-xl', 'hover:-translate-y-1', 'cursor-pointer');
        } else {
            agreeBtn.disabled = true;
            agreeBtn.classList.add('bg-gray-300', 'text-gray-500', 'cursor-not-allowed');
            agreeBtn.classList.remove('bg-gradient-to-r', 'from-blue-600', 'to-purple-600', 'text-white', 'hover:shadow-xl', 'hover:-translate-y-1', 'cursor-pointer');
        }
    });
    
    agreeBtn.addEventListener('click', function() {
        if (!checkbox.checked) return;
        const originalText = this.innerHTML;
        this.innerHTML = '<i class="fas fa-spinner fa-spin ml-2"></i> جاري الحفظ...';
        this.disabled = true;
        
        const formData = new FormData();
        if (supplierId) formData.append('supplier_id', supplierId);
        
        fetch('/agree-to-terms/', {
            method: 'POST',
            body: formData,
            headers: {
                'X-CSRFToken': csrfToken,
                'X-Requested-With': 'XMLHttpRequest'
            }
        })
        .then(res => res.json())
        .then(data => {
            if (data.success) {
                termsModal.style.opacity = '0';
                setTimeout(() => {
                    termsModal.remove();
                    document.body.style.overflow = '';
                    if (typeof Swal !== 'undefined') {
                        Swal.fire({ icon: 'success', title: 'مرحباً بك!', text: 'تم قبول الشروط بنجاح', timer: 2000, showConfirmButton: false });
                    }
                }, 300);
            } else {
                agreeBtn.innerHTML = originalText;
                agreeBtn.disabled = false;
                Swal.fire('خطأ', data.message || 'فشل حفظ الموافقة', 'error');
            }
        })
        .catch(err => {
            console.error(err);
            agreeBtn.innerHTML = originalText;
            agreeBtn.disabled = false;
            Swal.fire('خطأ', 'حدث خطأ في الاتصال', 'error');
        });
    });
    
    document.body.style.overflow = 'hidden';
}

/**
 * Helper for specialized forms submission (Branding, Map, etc.)
 */
function submitForm(event, formId, formType) {
    if (event) event.preventDefault();
    const form = document.getElementById(formId);
    if (!form) return;
    const formData = new FormData(form);
    
    // Show loader
    if (typeof Swal !== 'undefined') {
        Swal.fire({
            title: 'جاري الحفظ...',
            allowOutsideClick: false,
            didOpen: () => { Swal.showLoading(); }
        });
    }

    const actionUrl = form.getAttribute('action') || '/dashboard/settings/update/'; 

    fetch(actionUrl, {
        method: 'POST',
        body: formData,
        headers: {
            'X-Requested-With': 'XMLHttpRequest',
            'X-CSRFToken': formData.get('csrfmiddlewaretoken')
        }
    })
    .then(res => res.json())
    .then(data => {
        if (data.success) {
            if (typeof Swal !== 'undefined') {
                Swal.fire({
                    icon: 'success',
                    title: 'تم التحديث',
                    text: 'تم الحفظ بنجاح',
                    timer: 1500,
                    showConfirmButton: false
                }).then(() => location.reload());
            } else {
                location.reload();
            }
        } else {
            const errorMsg = data.errors ? Object.values(data.errors).flat().join('\n') : 'فشل التحديث';
            if (typeof Swal !== 'undefined') {
                Swal.fire('خطأ', errorMsg, 'error');
            } else {
                alert(errorMsg);
            }
        }
    })
    .catch(err => {
        console.error(err);
        if (typeof Swal !== 'undefined') {
            Swal.fire('خطأ', 'حدث خطأ في الاتصال', 'error');
        } else {
            alert('حدث خطأ في الاتصال');
        }
    });
}

// Export initialization function
window.initMerchantDashboard = function(config) {
    initImageHandlers();
    initFormHandlers();
    initAnalytics(config);
    initTermsHandler(config.csrfToken, config.supplierId);
    
    setTimeout(() => {
        updateOnboardingProgress(config.onboarding);
    }, 800);
};
