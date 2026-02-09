from django.shortcuts import render


def landing_page(request):
    """Landing page for business owners to join"""
    return render(request, 'landing.html')
