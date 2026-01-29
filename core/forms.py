from django import forms
from django.db import models
from .models import *



class ShippingAddressForm(forms.ModelForm):
    latitude = forms.DecimalField(required=False, widget=forms.HiddenInput())
    longitude = forms.DecimalField(required=False, widget=forms.HiddenInput())

    class Meta:
        model = ShippingAddress
        fields = ['address_line1', 'phone', 'address_line2', 'latitude', 'longitude']
        widgets = {
             'address_line1': forms.TextInput(attrs={
                'class': 'form-control',
                'placeholder': 'الموقع (العنوان)',
            }),
            'phone': forms.NumberInput(attrs={
                'class': 'form-control',
                'placeholder': 'رقم الهاتف'
            }),
            'address_line2': forms.Textarea(attrs={
                'class': 'form-control',
                'placeholder': 'ملاحظات إضافية (اختياري)',
                'rows': 3
            }),
            'latitude': forms.HiddenInput(),
            'longitude': forms.HiddenInput(),
        }
        labels = {
            'address_line1': 'الموقع',
            'phone': 'رقم الهاتف',
            'address_line2': 'ملاحظات',
        }



class ProductForm(forms.ModelForm):
    class Meta:
        model = Product
        fields = ['name', 'description', 'price', 'stock', 'category', 'image', 'video', 'is_new']
        widgets = {
            'name': forms.TextInput(attrs={
                'class': 'w-full px-4 py-3 rounded-xl border border-gray-300 focus:border-blue-500 focus:ring-2 focus:ring-blue-200 transition-all',
                'placeholder': 'اسم المنتج'
            }),
            'description': forms.Textarea(attrs={
                'class': 'w-full px-4 py-3 rounded-xl border border-gray-300 focus:border-blue-500 focus:ring-2 focus:ring-blue-200 transition-all resize-none',
                'placeholder': 'وصف المنتج',
                'rows': 4
            }),
            'price': forms.NumberInput(attrs={
                'class': 'w-full px-4 py-3 rounded-xl border border-gray-300 focus:border-blue-500 focus:ring-2 focus:ring-blue-200 transition-all',
                'placeholder': '0.00',
                'step': '0.01',
                'min': '0'
            }),
            'stock': forms.NumberInput(attrs={
                'class': 'w-full px-4 py-3 rounded-xl border border-gray-300 focus:border-blue-500 focus:ring-2 focus:ring-blue-200 transition-all',
                'placeholder': '0',
                'min': '0'
            }),
            'category': forms.Select(attrs={
                'class': 'w-full px-4 py-3 rounded-xl border border-gray-300 focus:border-blue-500 focus:ring-2 focus:ring-blue-200 transition-all'
            }),
            'image': forms.FileInput(attrs={
                'class': 'w-full px-4 py-3 rounded-xl border-2 border-dashed border-gray-300 focus:border-blue-500 transition-all',
                'accept': 'image/*'
            }),
            'video': forms.FileInput(attrs={
                'class': 'w-full px-4 py-3 rounded-xl border-2 border-dashed border-gray-300 focus:border-blue-500 transition-all',
                'accept': 'video/*'
            }),
            'is_new': forms.CheckboxInput(attrs={
                'class': 'w-5 h-5 text-blue-600 rounded focus:ring-2 focus:ring-blue-200'
            })
        }
        labels = {
            'name': 'اسم المنتج',
            'description': 'وصف المنتج',
            'price': 'السعر',
            'stock': 'المخزون المتوفر',
            'category': 'فئة المنتج',
            'image': 'صورة المنتج الرئيسية',
            'video': 'فيديو المنتج (اختياري)',
            'is_new': 'منتج جديد'
        }

    def __init__(self, *args, **kwargs):
        supplier = kwargs.pop('supplier', None)
        super().__init__(*args, **kwargs)
        
        if supplier:
            # Show all categories as they are now general
            self.fields['category'].queryset = ProductCategory.objects.all()
        
        # Add required attribute to required fields
        self.fields['name'].required = True
        self.fields['description'].required = True
        self.fields['price'].required = True
        self.fields['category'].required = True
        self.fields['image'].required = True


class ProductOfferForm(forms.ModelForm):
    class Meta:
        model = ProductOffer
        fields = ['product', 'discount_precentage', 'from_date', 'to_date', 'is_active']
        widgets = {
            'product': forms.Select(attrs={
                'class': 'w-full px-4 py-3 rounded-xl border border-gray-300 focus:border-green-500 focus:ring-2 focus:ring-green-200 transition-all'
            }),
            'discount_precentage': forms.NumberInput(attrs={
                'class': 'w-full px-4 py-3 rounded-xl border border-gray-300 focus:border-green-500 focus:ring-2 focus:ring-green-200 transition-all',
                'placeholder': '0.00',
                'step': '0.01',
                'min': '0.01',
                'max': '0.99'
            }),
            'from_date': forms.DateInput(attrs={
                'class': 'w-full px-4 py-3 rounded-xl border border-gray-300 focus:border-green-500 focus:ring-2 focus:ring-green-200 transition-all',
                'type': 'date'
            }),
            'to_date': forms.DateInput(attrs={
                'class': 'w-full px-4 py-3 rounded-xl border border-gray-300 focus:border-green-500 focus:ring-2 focus:ring-green-200 transition-all',
                'type': 'date'
            }),
            'is_active': forms.CheckboxInput(attrs={
                'class': 'w-5 h-5 text-green-600 rounded focus:ring-2 focus:ring-green-200'
            })
        }
        labels = {
            'product': 'المنتج',
            'discount_precentage': 'نسبة الخصم (%)',
            'from_date': 'تاريخ البداية',
            'to_date': 'تاريخ النهاية',
            'is_active': 'عرض نشط'
        }

    def __init__(self, *args, **kwargs):
        supplier = kwargs.pop('supplier', None)
        super().__init__(*args, **kwargs)
        
        if supplier:
            # Filter products to only show those belonging to the supplier
            # and exclude products that already have active offers
            from django.utils import timezone
            today = timezone.now().date()
            
            self.fields['product'].queryset = Product.objects.filter(
                supplier=supplier
            ).distinct()
        
        # Add required attribute to required fields
        self.fields['product'].required = True
        self.fields['discount_precentage'].required = True
        self.fields['from_date'].required = True
        self.fields['to_date'].required = True
        
        # Set default value for is_active
        self.fields['is_active'].initial = True

    def clean_discount_precentage(self):
        discount = self.cleaned_data.get('discount_precentage')
        if discount is not None:
            if discount <= 0:
                raise forms.ValidationError('نسبة الخصم يجب أن تكون أكبر من صفر')
            if discount >= 1:
                raise forms.ValidationError('نسبة الخصم يجب أن تكون أقل من 100%')
            
        return discount

    def clean(self):
        cleaned_data = super().clean()
        from_date = cleaned_data.get('from_date')
        to_date = cleaned_data.get('to_date')
        product = cleaned_data.get('product')
        discount_precentage = cleaned_data.get('discount_precentage')
        
        if from_date and to_date:
            if from_date >= to_date:
                raise forms.ValidationError('تاريخ النهاية يجب أن يكون بعد تاريخ البداية')
            
            # Check for overlapping offers for the same product
            if product:
                from django.utils import timezone
                overlapping_offers = ProductOffer.objects.filter(
                    product=product,
                    is_active=True
                ).filter(
                    models.Q(from_date__lte=to_date) & models.Q(to_date__gte=from_date)
                )
                
                if self.instance.pk:
                    overlapping_offers = overlapping_offers.exclude(pk=self.instance.pk)
                
                if overlapping_offers.exists():
                    raise forms.ValidationError('يوجد عرض نشط آخر لهذا المنتج في نفس الفترة الزمنية')
        
        return cleaned_data


class SupplierAdsForm(forms.ModelForm):
    class Meta:
        model = SupplierAds
        fields = ['title', 'description', 'image', 'is_active', 'product']
        widgets = {
            'title': forms.TextInput(attrs={
                'class': 'w-full px-4 py-3 rounded-xl border border-gray-300 focus:border-orange-500 focus:ring-2 focus:ring-orange-200 transition-all',
                'placeholder': 'عنوان الإعلان'
            }),
            'description': forms.Textarea(attrs={
                'class': 'w-full px-4 py-3 rounded-xl border border-gray-300 focus:border-orange-500 focus:ring-2 focus:ring-orange-200 transition-all resize-none',
                'placeholder': 'وصف الإعلان',
                'rows': 4
            }),
            'image': forms.FileInput(attrs={
                'class': 'w-full px-4 py-3 rounded-xl border-2 border-dashed border-gray-300 focus:border-orange-500 transition-all',
                'accept': 'image/*'
            }),
            'is_active': forms.CheckboxInput(attrs={
                'class': 'w-5 h-5 text-orange-600 rounded focus:ring-2 focus:ring-orange-200'
            }),
            'product': forms.Select(attrs={
                'class': 'w-full px-4 py-3 rounded-xl border border-gray-300 focus:border-orange-500 focus:ring-2 focus:ring-orange-200 transition-all'
            })
        }
        labels = {
            'title': 'عنوان الإعلان',
            'description': 'وصف الإعلان',
            'image': 'صورة الإعلان',
            'is_active': 'إعلان نشط',
            'product': 'المنتج الملحق (اختياري)'
        }

    def __init__(self, *args, **kwargs):
        supplier = kwargs.pop('supplier', None)
        super().__init__(*args, **kwargs)
        
        if supplier:
            self.fields['product'].queryset = Product.objects.filter(supplier=supplier)
        
        # Add required attribute to required fields
        self.fields['title'].required = True
        self.fields['description'].required = True
        # Image is not required in edit mode if it already exists
        if not self.instance.pk:
            self.fields['image'].required = True
        else:
            self.fields['image'].required = False
            
        # Set default value for is_active
        if not self.instance.pk:
            self.fields['is_active'].initial = True

    def clean_title(self):
        title = self.cleaned_data.get('title')
        if title and len(title.strip()) < 5:
            raise forms.ValidationError('عنوان الإعلان يجب أن يكون 5 أحرف على الأقل')
        return title

    def clean_description(self):
        description = self.cleaned_data.get('description')
        if description and len(description.strip()) < 10:
            raise forms.ValidationError('وصف الإعلان يجب أن يكون 10 أحرف على الأقل')
        return description

    def clean_image(self):
        image = self.cleaned_data.get('image')
        if image:
            # Check file size (max 5MB)
            if image.size > 5 * 1024 * 1024:
                raise forms.ValidationError('حجم الصورة يجب أن يكون أقل من 5 ميجابايت')
            
            # Check file type
            if not image.name.lower().endswith(('.png', '.jpg', '.jpeg', '.gif', '.webp')):
                raise forms.ValidationError('نوع الملف غير مدعوم. يرجى اختيار صورة بصيغة PNG, JPG, JPEG, GIF, أو WebP')
        
        return image



class PlatformOfferAdForm(forms.ModelForm):
    class Meta:
        model = PlatformOfferAd
        fields = ['product', 'description', 'start_date', 'end_date']
        widgets = {
            'product': forms.Select(attrs={
                'class': 'w-full px-4 py-3 rounded-xl border border-gray-300 focus:border-blue-500 focus:ring-2 focus:ring-blue-100 transition-all text-sm',
                'onchange': 'handleProductSelect(this.value)'
            }),
            'description': forms.Textarea(attrs={
                'class': 'w-full px-4 py-3 rounded-xl border border-gray-300 focus:border-blue-500 focus:ring-2 focus:ring-blue-100 transition-all resize-none text-sm',
                'placeholder': 'صف العرض المميز هنا...',
                'rows': 4
            }),
            'start_date': forms.DateInput(attrs={
                'class': 'w-full px-4 py-3 rounded-xl border border-gray-300 focus:border-blue-500 focus:ring-2 focus:ring-blue-100 transition-all text-sm',
                'type': 'date'
            }),
            'end_date': forms.DateInput(attrs={
                'class': 'w-full px-4 py-3 rounded-xl border border-gray-300 focus:border-blue-500 focus:ring-2 focus:ring-blue-100 transition-all text-sm',
                'type': 'date'
            })
        }
        labels = {
            'product': 'المنتج المختار',
            'description': 'وصف العرض (سيظهر للجميع)',
            'start_date': 'تاريخ البدء',
            'end_date': 'تاريخ الانتهاء'
        }

    def __init__(self, *args, **kwargs):
        supplier = kwargs.pop('supplier', None)
        super().__init__(*args, **kwargs)
        if supplier:
            self.fields['product'].queryset = Product.objects.filter(supplier=supplier)
            
        # Add required attribute
        for field in self.fields:
            self.fields[field].required = True

    def clean(self):
        cleaned_data = super().clean()
        start_date = cleaned_data.get('start_date')
        end_date = cleaned_data.get('end_date')

        if start_date and end_date and start_date > end_date:
            raise forms.ValidationError('تاريخ البدء يجب أن يكون قبل تاريخ الانتهاء')
        
        return cleaned_data


class BusinessRequestForm(forms.ModelForm):
    class Meta:
        model = BusinessRequest
        fields = ['name', 'owner_name', 'email', 'phone', 'business_type', 'message']
        widgets = {
            'name': forms.TextInput(attrs={
                'class': 'w-full px-4 py-3.5 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-[var(--primary-color)] focus:border-transparent outline-none transition-all placeholder-gray-400',
                'placeholder': 'اسم النشاط التجاري (مثال: متجر عرطات)'
            }),
            'owner_name': forms.TextInput(attrs={
                'class': 'w-full px-4 py-3.5 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-[var(--primary-color)] focus:border-transparent outline-none transition-all placeholder-gray-400',
                'placeholder': 'اسم صاحب النشاط الكامل'
            }),
            'email': forms.EmailInput(attrs={
                'class': 'w-full px-4 py-3.5 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-[var(--primary-color)] focus:border-transparent outline-none transition-all placeholder-gray-400',
                'placeholder': 'البريد الإلكتروني'
            }),
            'phone': forms.TextInput(attrs={
                'class': 'w-full px-4 py-3.5 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-[var(--primary-color)] focus:border-transparent outline-none transition-all placeholder-gray-400',
                'placeholder': 'رقم الهاتف (واتساب)'
            }),
            'business_type': forms.TextInput(attrs={
                'class': 'w-full px-4 py-3.5 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-[var(--primary-color)] focus:border-transparent outline-none transition-all placeholder-gray-400',
                'placeholder': 'نوع النشاط (مثال: مطعم، محل ملابس)'
            }),
            'message': forms.Textarea(attrs={
                'class': 'w-full px-4 py-3.5 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-[var(--primary-color)] focus:border-transparent outline-none transition-all placeholder-gray-400 resize-none',
                'placeholder': 'أخبرنا المزيد عن نشاطك...',
                'rows': 4
            }),
        }
        labels = {
            'name': 'اسم النشاط التجاري',
            'owner_name': 'اسم صاحب النشاط',
            'email': 'البريد الإلكتروني',
            'phone': 'رقم الهاتف',
            'business_type': 'نوع النشاط',
            'message': 'رسالة إضافية',
        }


class SupplierSettingsForm(forms.ModelForm):
    class Meta:
        model = Supplier
        fields = [
            'name', 'phone', 'address', 'city', 'country', 
            'primary_color', 'secondary_color', 'accent_color',
            'profile_picture', 'latitude', 'longitude'
        ]
        widgets = {
            'name': forms.TextInput(attrs={
                'class': 'w-full px-4 py-2 rounded-lg border border-gray-300 focus:border-blue-500 transition-all',
                'placeholder': 'اسم المتجر'
            }),
            'phone': forms.TextInput(attrs={
                'class': 'w-full px-4 py-2 rounded-lg border border-gray-300 focus:border-blue-500 transition-all',
                'placeholder': 'رقم الهاتف'
            }),
            'address': forms.TextInput(attrs={
                'class': 'w-full px-4 py-2 rounded-lg border border-gray-300 focus:border-blue-500 transition-all',
                'placeholder': 'العنوان'
            }),
            'city': forms.Select(attrs={
                'class': 'w-full px-4 py-2 rounded-lg border border-gray-300 focus:border-blue-500 transition-all'
            }),
            'country': forms.Select(attrs={
                'class': 'w-full px-4 py-2 rounded-lg border border-gray-300 focus:border-blue-500 transition-all'
            }),
            'primary_color': forms.TextInput(attrs={
                'class': 'w-full px-4 py-2 rounded-lg border border-gray-300 focus:border-blue-500 transition-all color-picker-input',
                'type': 'color'
            }),
            'secondary_color': forms.TextInput(attrs={
                'class': 'w-full px-4 py-2 rounded-lg border border-gray-300 focus:border-blue-500 transition-all color-picker-input',
                'type': 'color'
            }),
            'accent_color': forms.TextInput(attrs={
                'class': 'w-full px-4 py-2 rounded-lg border border-gray-300 focus:border-blue-500 transition-all color-picker-input',
                'type': 'color'
            }),
            'profile_picture': forms.FileInput(attrs={
                'class': 'w-full px-4 py-2 rounded-lg border border-gray-300 focus:border-blue-500 transition-all',
                'accept': 'image/*'
            }),
            'latitude': forms.HiddenInput(),
            'longitude': forms.HiddenInput(),
        }
        labels = {
            'name': 'اسم المتجر',
            'phone': 'رقم الهاتف',
            'address': 'العنوان',
            'city': 'المدينة',
            'country': 'الدولة',
            'primary_color': 'اللون الأساسي',
            'secondary_color': 'اللون الثانوي',
            'accent_color': 'لون التمييز',
            'profile_picture': 'شعار المتجر'
        }


class SupplierAdPlatfromForm(forms.ModelForm):
    class Meta:
        model = SupplierAdPlatfrom
        fields = ['image']
        widgets = {
            'image': forms.FileInput(attrs={
                'class': 'w-full px-4 py-3 rounded-xl border-2 border-dashed border-gray-300 focus:border-purple-500 transition-all',
                'accept': 'image/*'
            })
        }
        labels = {
            'image': 'صورة الإعلان (بانر)'
        }

    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        if not self.instance.pk:
            self.fields['image'].required = True
        else:
            self.fields['image'].required = False
            
    def clean_image(self):
        image = self.cleaned_data.get('image')
        if image:
            if image.size > 10 * 1024 * 1024:
                raise forms.ValidationError('حجم الصورة يجب أن يكون أقل من 10 ميجابايت')
            if not image.name.lower().endswith(('.png', '.jpg', '.jpeg', '.gif', '.webp')):
                raise forms.ValidationError('صيغة الملف غير مدعومة')
        return image
