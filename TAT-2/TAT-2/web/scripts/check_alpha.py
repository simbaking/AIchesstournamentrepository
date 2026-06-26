from PIL import Image
import sys

try:
    img = Image.open('/Users/chang/Anitgravity/chess/web/public/assets/lion.png')
    print(f"Mode: {img.mode}")
    if img.mode == 'RGBA':
        # Check if there are any pixels with alpha < 255
        extrema = img.getextrema()
        alpha_extrema = extrema[3]
        print(f"Alpha extrema: {alpha_extrema}")
        if alpha_extrema[0] < 255:
             print("Transparency detected.")
        else:
             print("Image is RGBA but fully opaque.")
    elif 'transparency' in img.info:
        print("Transparency info present in palette image.")
    else:
        print("No alpha channel detected.")
except Exception as e:
    print(f"Error: {e}")
