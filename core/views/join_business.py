from django.shortcuts import render, redirect
from django.contrib import messages
from core.forms import BusinessRequestForm

def join_business(request):
    if request.method == 'POST':
        form = BusinessRequestForm(request.POST)
        if form.is_valid():
            form.save()
            messages.success(request, 'تم إرسال طلبك بنجاح! سنتواصل معك قريباً.')
            return redirect('join_business')
    else:
        form = BusinessRequestForm()
    
    return render(request, 'join_business.html', {'business_form': form})
