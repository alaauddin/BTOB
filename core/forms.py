from django import forms
from django.db import models
from django.contrib.auth.models import User
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

    def clean_phone(self):
        phone = self.cleaned_data.get('phone')
        if phone:
            # Remove any spaces or dashes
            phone = phone.replace(' ', '').replace('-', '')
            
            # Basic Yemeni mobile number validation (9 digits, starts with 77, 73, 71, or 70)
            import re
            yemeni_pattern = r'^(77|73|71|70)\d{7}$'
            if not re.match(yemeni_pattern, phone):
                raise forms.ValidationError('يرجى إدخال رقم هاتف يمني صحيح (مثلاً: 77XXXXXXX)')
        
        return phone


class MerchantSignupForm(forms.Form):
    # User account fields
    username = forms.CharField(
        max_length=150,
        label='اسم المستخدم',
        widget=forms.TextInput(attrs={
            'class': 'w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-[var(--primary-color)] outline-none transition-all',
            'placeholder': 'اختر اسم مستخدم فريد'
        })
    )
    password = forms.CharField(
        label='كلمة المرور',
        widget=forms.PasswordInput(attrs={
            'class': 'w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-[var(--primary-color)] outline-none transition-all',
            'placeholder': '••••••••'
        })
    )
    password_confirm = forms.CharField(
        label='تأكيد كلمة المرور',
        widget=forms.PasswordInput(attrs={
            'class': 'w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-[var(--primary-color)] outline-none transition-all',
            'placeholder': '••••••••'
        })
    )

    # Business/Supplier fields
    business_name = forms.CharField(
        max_length=100,
        label='اسم النشاط التجاري',
        widget=forms.TextInput(attrs={
            'class': 'w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-[var(--primary-color)] outline-none transition-all',
            'placeholder': 'مثال: متجر الهواتف الذكية'
        })
    )
    owner_name = forms.CharField(
        max_length=200,
        label='اسم صاحب النشاط',
        widget=forms.TextInput(attrs={
            'class': 'w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-[var(--primary-color)] outline-none transition-all',
            'placeholder': 'الاسم الكامل'
        })
    )
    email = forms.EmailField(
        label='البريد الإلكتروني',
        widget=forms.EmailInput(attrs={
            'class': 'w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-[var(--primary-color)] outline-none transition-all',
            'placeholder': 'email@example.com'
        })
    )
    phone = forms.CharField(
        label='رقم الهاتف (واتساب)',
        widget=forms.TextInput(attrs={
            'class': 'w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-[var(--primary-color)] outline-none transition-all',
            'placeholder': '77XXXXXXX'
        })
    )
    secondary_phone = forms.CharField(
        label='رقم هاتف إضافي (اختياري)',
        required=False,
        widget=forms.TextInput(attrs={
            'class': 'w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-[var(--primary-color)] outline-none transition-all',
            'placeholder': '7XXXXXXXX'
        })
    )
    business_type = forms.CharField(
        max_length=100,
        label='نوع النشاط',
        widget=forms.TextInput(attrs={
            'class': 'w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-[var(--primary-color)] outline-none transition-all',
            'placeholder': 'مثال: إلكترونيات، مطعم، ملابس'
        })
    )
    city = forms.ChoiceField(
        choices=CITY_CHO,
        label='المدينة',
        widget=forms.Select(attrs={
            'class': 'w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-[var(--primary-color)] outline-none transition-all cursor-pointer'
        })
    )
    country = forms.ChoiceField(
        choices=COUNTRY_CHO,
        label='الدولة',
        widget=forms.Select(attrs={
            'class': 'w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-[var(--primary-color)] outline-none transition-all cursor-pointer'
        })
    )

    def clean_username(self):
        username = self.cleaned_data.get('username')
        if User.objects.filter(username=username).exists():
            raise forms.ValidationError('اسم المستخدم هذا موجود مسبقاً، يرجى اختيار اسم آخر')
        return username

    def clean_phone(self):
        phone = self.cleaned_data.get('phone')
        if phone:
            phone = phone.replace(' ', '').replace('-', '')
            import re
            yemeni_pattern = r'^(77|73|71|70)\d{7}$'
            if not re.match(yemeni_pattern, phone):
                raise forms.ValidationError('يرجى إدخال رقم هاتف يمني صحيح (مثلاً: 77XXXXXXX)')
        return phone

    def clean_secondary_phone(self):
        phone = self.cleaned_data.get('secondary_phone')
        if phone:
            phone = phone.replace(' ', '').replace('-', '')
            import re
            yemeni_pattern = r'^(77|73|71|70|0)\d{7,9}$' # More flexible for secondary
            if not re.match(yemeni_pattern, phone):
                raise forms.ValidationError('يرجى إدخال رقم هاتف صحيح')
        return phone

    def clean(self):
        cleaned_data = super().clean()
        password = cleaned_data.get('password')
        password_confirm = cleaned_data.get('password_confirm')

        if password and password_confirm and password != password_confirm:
            self.add_error('password_confirm', 'كلمتا المرور غير متطابقتين')
        
        return cleaned_data


class SupplierSettingsForm(forms.ModelForm):
    class Meta:
        model = Supplier
        fields = [
            'name', 'phone', 'secondary_phone', 'address', 'city', 'country', 
            'primary_color', 'secondary_color', 'navbar_color', 
            'footer_color', 'text_color', 'accent_color',
            'profile_picture', 'panal_picture', 'latitude', 'longitude', 
            'show_order_amounts', 'show_platform_ads', 'show_system_logo',
            'return_policy'
        ]
        widgets = {
            'name': forms.TextInput(attrs={
                'class': 'w-full px-4 py-2.5 rounded-xl border border-gray-200 focus:border-blue-500 focus:ring-4 focus:ring-blue-50 transition-all outline-none text-sm',
                'placeholder': 'اسم المتجر'
            }),
            'phone': forms.TextInput(attrs={
                'class': 'w-full px-4 py-2.5 rounded-xl border border-gray-200 focus:border-blue-500 focus:ring-4 focus:ring-blue-50 transition-all outline-none text-sm',
                'placeholder': 'رقم الهاتف'
            }),
            'secondary_phone': forms.TextInput(attrs={
                'class': 'w-full px-4 py-2.5 rounded-xl border border-gray-200 focus:border-blue-500 focus:ring-4 focus:ring-blue-50 transition-all outline-none text-sm',
                'placeholder': 'رقم هاتف إضافي (اختياري)'
            }),
            'address': forms.TextInput(attrs={
                'class': 'w-full px-4 py-2.5 rounded-xl border border-gray-200 focus:border-blue-500 focus:ring-4 focus:ring-blue-50 transition-all outline-none text-sm',
                'placeholder': 'العنوان التفصيلي'
            }),
            'city': forms.Select(attrs={
                'class': 'w-full px-4 py-2.5 rounded-xl border border-gray-200 focus:border-blue-500 focus:ring-4 focus:ring-blue-50 transition-all outline-none text-sm cursor-pointer'
            }),
            'country': forms.Select(attrs={
                'class': 'w-full px-4 py-2.5 rounded-xl border border-gray-200 focus:border-blue-500 focus:ring-4 focus:ring-blue-50 transition-all outline-none text-sm cursor-pointer'
            }),
            'primary_color': forms.TextInput(attrs={'type': 'color', 'class': 'w-12 h-12 rounded-lg border-0 cursor-pointer p-0 overflow-hidden'}),
            'secondary_color': forms.TextInput(attrs={'type': 'color', 'class': 'w-12 h-12 rounded-lg border-0 cursor-pointer p-0 overflow-hidden'}),
            'navbar_color': forms.TextInput(attrs={'type': 'color', 'class': 'w-12 h-12 rounded-lg border-0 cursor-pointer p-0 overflow-hidden'}),
            'footer_color': forms.TextInput(attrs={'type': 'color', 'class': 'w-12 h-12 rounded-lg border-0 cursor-pointer p-0 overflow-hidden'}),
            'text_color': forms.TextInput(attrs={'type': 'color', 'class': 'w-12 h-12 rounded-lg border-0 cursor-pointer p-0 overflow-hidden'}),
            'accent_color': forms.TextInput(attrs={'type': 'color', 'class': 'w-12 h-12 rounded-lg border-0 cursor-pointer p-0 overflow-hidden'}),
            
            'profile_picture': forms.FileInput(attrs={'class': 'hidden', 'accept': 'image/*', 'id': 'profile_input'}),
            'panal_picture': forms.FileInput(attrs={'class': 'hidden', 'accept': 'image/*', 'id': 'banner_input'}),
            
            'latitude': forms.HiddenInput(),
            'longitude': forms.HiddenInput(),
            
            'show_order_amounts': forms.CheckboxInput(attrs={'class': 'sr-only peer'}),
            'show_platform_ads': forms.CheckboxInput(attrs={'class': 'sr-only peer'}),
            'show_system_logo': forms.CheckboxInput(attrs={'class': 'sr-only peer'}),
            
            'return_policy': forms.Textarea(attrs={
                'class': 'w-full px-4 py-3 rounded-xl border border-gray-200 focus:border-blue-500 focus:ring-4 focus:ring-blue-50 transition-all outline-none text-sm resize-none',
                'placeholder': 'اكتب هنا سياسة الاستبدال والاسترجاع التي ستظهر للعملاء في السلة...',
                'rows': 4
            }),
        }
        labels = {
            'name': 'اسم المتجر',
            'phone': 'رقم الهاتف (واتساب)',
            'address': 'العنوان',
            'city': 'المدينة',
            'country': 'الدولة',
            'primary_color': 'اللون الأساسي',
            'secondary_color': 'اللون الثانوي',
            'navbar_color': 'لون الشريط العلوي',
            'footer_color': 'لون التذييل',
            'text_color': 'لون النصوص',
            'accent_color': 'لون التميز',
            'profile_picture': 'شعار المتجر',
            'panal_picture': 'صورة الغلاف',
            'show_order_amounts': 'عرض مبالغ الطلبات',
            'show_platform_ads': 'عرض إعلانات المنصة',
            'show_system_logo': 'عرض شعار المنصة العام',
            'return_policy': 'سياسة الاستبدال والاسترجاع'
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
