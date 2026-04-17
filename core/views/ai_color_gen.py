import base64
import json
import os
import openai
from django.http import JsonResponse
from django.views import View
from django.contrib.auth.mixins import LoginRequiredMixin
from core.db.supplier import Supplier

class GenerateAIColorsView(LoginRequiredMixin, View):
    """
    View to handle logo upload and extraction of brand colors using OpenAI Vision.
    """
    def post(self, request, *args, **kwargs):
        if 'logo' not in request.FILES:
            return JsonResponse({'error': 'No logo provided'}, status=400)

        logo_file = request.FILES['logo']
        supplier_id = request.POST.get('supplier_id')
        
        try:
            supplier = Supplier.objects.get(id=supplier_id, user=request.user)
        except Supplier.DoesNotExist:
            return JsonResponse({'error': 'Supplier not found'}, status=404)

        # Read and encode image to base64
        try:
            image_data = logo_file.read()
            base64_image = base64.b64encode(image_data).decode('utf-8')
        except Exception as e:
            return JsonResponse({'error': f'Failed to process image: {str(e)}'}, status=500)

        # Initialize OpenAI Client
        api_key = os.getenv('OPENAI_API_KEY')
        if not api_key:
            return JsonResponse({'error': 'OpenAI API key not configured'}, status=500)
            
        client = openai.OpenAI(api_key=api_key)

        # Construct the Prompt
        prompt = (
            """
                ### ROLE: Senior UI/UX Engineer (E-commerce Specialist)

                ### TASK: 
                Analyze the uploaded logo and extract a 7-color high-contrast palette. This is for a production-level web store.

                ### STRICT JSON STRUCTURE (Output ONLY this):
                {
                "primary_color": "Hex",
                "secondary_color": "Hex",
                "navbar_color": "Hex",
                "navbar_text_color": "Hex",
                "footer_color": "Hex",
                "text_color": "Hex (High Contrast vs Footer BG)",
                "accent_color": "Hex (High-Visibility CTA)"
                }

                ### MATHEMATICAL CONSTRAINTS:
                1. **Footer Logic:** `text_color` is the foreground for `footer_color`. They MUST achieve a 7:1 contrast ratio.
                2. **Navbar Logic:** `navbar_text_color` is the foreground for `navbar_color`. They MUST achieve a 7:1 contrast ratio.
                3. **Polarity Rule:** If background is DARK (Luminance < 40%), text MUST be #FFFFFF. If background is LIGHT (Luminance > 60%), text MUST be #000000 or #1E293B.
                4. **The CTA Rule:** `accent_color` MUST be the most vibrant, "attention-grabbing" color for 'Add to Cart' buttons. It must stand out significantly from all other colors.

                ### RULES FOR GENERATION:
                - NO conversational text. 
                - NO markdown triple backticks unless required by the parser.
                - NO explanations. 
                - Do NOT return null. If a color is missing, derive it from logo theory.
            """
        )

        try:
            response = client.chat.completions.create(
                model="gpt-4o",
                messages=[
                    {
                        "role": "user",
                        "content": [
                            {"type": "text", "text": prompt},
                            {
                                "type": "image_url",
                                "image_url": {
                                    "url": f"data:image/jpeg;base64,{base64_image}",
                                },
                            },
                        ],
                    }
                ],
                max_tokens=300,
                response_format={"type": "json_object"}
            )
            
            # Parse the JSON response
            colors_json = json.loads(response.choices[0].message.content)
            
            # Basic validation of keys
            required_keys = [
                'primary_color', 'secondary_color', 'navbar_color', 
                'navbar_text_color', 'footer_color', 'text_color', 'accent_color'
            ]
            
            for key in required_keys:
                if key not in colors_json:
                    # Fallback to defaults or partial update
                    pass
            
            # Return colors to frontend for preview (not saving to DB yet to allow user review)
            return JsonResponse({
                'success': True,
                'colors': colors_json
            })

        except Exception as e:
            return JsonResponse({'error': f'AI Generation failed: {str(e)}'}, status=500)
