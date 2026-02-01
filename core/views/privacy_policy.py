"""
View for the Privacy Policy page.

This module provides a simple view to render the privacy policy page.
"""

from django.shortcuts import render


def privacy_policy(request):
    """
    Render the privacy policy page.

    Args:
        request: The HTTP request object.

    Returns:
        HttpResponse: The rendered privacy policy template.
    """
    return render(request, 'privacy_policy.html')
