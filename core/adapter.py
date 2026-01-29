from allauth.socialaccount.adapter import DefaultSocialAccountAdapter
from django.contrib.auth import get_user_model

User = get_user_model()

class CustomSocialAccountAdapter(DefaultSocialAccountAdapter):
    def pre_social_login(self, request, sociallogin):
        """
        Invoked just after a user successfully authenticates via a social provider,
        but before the login is actually processed.
        
        This will automatically link the social account to an existing local account
        if the emails match.
        """
        # 1. Ignore if sociallogin is already associated with a user
        if sociallogin.is_existing:
            return

        # 2. Check if we have an email
        if not sociallogin.email_address:
            return

        # 3. Try to find a user with this email
        try:
            user = User.objects.get(email=sociallogin.email_address)
            # 4. Link the social account to this user
            sociallogin.connect(request, user)
        except User.DoesNotExist:
            pass
