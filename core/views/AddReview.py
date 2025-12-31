from django.views import View
from django.shortcuts import get_object_or_404
from django.http import JsonResponse
from django.contrib.auth.mixins import LoginRequiredMixin
from django.utils.decorators import method_decorator
from django.views.decorators.csrf import csrf_exempt
import json
from core.models import Product, Review, Supplier

class AddReviewView(LoginRequiredMixin, View):
    def post(self, request, product_id, store_id):
        try:
            data = json.loads(request.body)
            rating = int(data.get('rating', 0))
            comment = data.get('comment', '').strip()

            if not (1 <= rating <= 5):
                return JsonResponse({'success': False, 'message': 'الرجاء اختيار تقييم بين 1 و 5 نجوم'}, status=400)
            
            if not comment:
                return JsonResponse({'success': False, 'message': 'الرجاء كتابة تعليق'}, status=400)

            product = get_object_or_404(Product, pk=product_id)
            supplier = get_object_or_404(Supplier, store_id=store_id)

            # Create or update review (one review per user per product)
            review, created = Review.objects.update_or_create(
                user=request.user,
                product=product,
                defaults={
                    'rating': rating,
                    'comment': comment
                }
            )

            # Recalculate stats
            total_reviews = product.review_set.count()
            avg_rating = product.get_average_rating() # Model method should handle calculation

            return JsonResponse({
                'success': True,
                'message': 'تم إضافة تقييمك بنجاح' if created else 'تم تحديث تقييمك بنجاح',
                'review': {
                    'user': request.user.username,
                    'rating': review.rating,
                    'comment': review.comment,
                    'initial': request.user.username[0].upper() if request.user.username else 'U'
                },
                'new_stats': {
                    'total': total_reviews,
                    'average': avg_rating
                }
            })

        except json.JSONDecodeError:
             return JsonResponse({'success': False, 'message': 'بيانات غير صالحة'}, status=400)
        except Exception as e:
            return JsonResponse({'success': False, 'message': str(e)}, status=500)
