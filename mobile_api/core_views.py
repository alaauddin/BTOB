from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status
from core.models import Currency

class CurrenciesAPIView(APIView):
    def get(self, request):
        currencies = Currency.objects.all()
        data = [
            {
                'id': c.id,
                'name': c.name,
                'code': c.code,
                'symbol': c.symbol,
            }
            for c in currencies
        ]
        return Response({
            'success': True,
            'currencies': data
        })
