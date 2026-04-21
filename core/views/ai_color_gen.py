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

        # Construct the Expert Prompt
        prompt = (
            """
                ### ROLE: World-Class Visual Identity & Brand Strategist (خبير تصميم هويات بصرية)
                
                ### YOUR PHILOSOPHY:
                You do not just pick colors; you create an emotional experience. You understand "تجانس الألوان" (Color Harmony) and the psychology of premium e-commerce. You act with artistic intuition (احساس) to ensure the brand feels alive, professional, and trustworthy.

                ### TASK: 
                Analyze the uploaded logo and design a master-level 7-color visual identity. 
                Every color must serve a specific functional and aesthetic purpose in the design system.

                ### VISUAL MAPPING (Where your colors will live):
                1. `primary_color`: The soul of the brand. Used for main buttons, focus states, and key identity elements.
                2. `secondary_color`: The atmosphere. Used as the main background of the store and surfaces. It must provide a clean canvas for products.
                3. `navbar_color`: The anchor. The background of the top navigation bar. 
                4. `navbar_text_color`: The clarity. Labels and icons inside the navbar.
                5. `footer_color`: The foundation. The background of the bottom store footer and action bars.
                6. `footer_text_color`: The signature. Copyright text, links, and icons in the footer.
                7. `accent_color`: The trigger. High-vibrancy "Call to Action" color for 'Add to Cart'. It must 'pop' against everything else.

                ### STRICT JSON STRUCTURE (Output ONLY this):
                {
                "primary_color": "Hex",
                "secondary_color": "Hex",
                "navbar_color": "Hex",
                "navbar_text_color": "Hex",
                "footer_color": "Hex",
                "footer_text_color": "Hex",
                "accent_color": "Hex"
                }

                ### THE GOLDEN RULES:
                - **Harmony (تجانس):** The palette must be perfectly balanced. No clashing tones. Use analogous, complementary, or triadic theory based on the logo.
                - **Accessibility:** Text colors (`navbar_text_color`, `footer_text_color`) MUST maintain a 7:1 contrast ratio against their backgrounds.
                - **Elegance:** Avoid generic web-safe colors. Think about texture, depth, and luxury.
                - **Conversion:** The `accent_color` MUST be the most vibrant and attention-grabbing color.
                
                ### FINAL INSTRUCTION:
                Be decisive. Be an artist. Output ONLY the JSON object.
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
                'navbar_text_color', 'footer_color', 'footer_text_color', 'accent_color'
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
