# analyze_colors.py
# This script loads a screenshot PNG and approximates the proportion of three UI colors:
# orange (primary), blue (accent), and gold (secondary). It uses the CSS variable
# values defined in style.css for reference.

import sys
from pathlib import Path
from PIL import Image
import numpy as np

# Define target colors (RGB) matching the CSS variables in style.css
ORANGE = (249, 115, 22)   # #f97316 (primary)
BLUE   = (59, 130, 246)   # #3b82f6 (accent)
GOLD   = (255, 215, 0)    # #ffd700 (gold)

# Simple Euclidean distance threshold to consider a pixel as belonging to a color
THRESHOLD = 40

def color_distance(c1, c2):
    return sum((a - b) ** 2 for a, b in zip(c1, c2)) ** 0.5

def classify_pixel(pixel):
    d_orange = color_distance(pixel, ORANGE)
    d_blue   = color_distance(pixel, BLUE)
    d_gold   = color_distance(pixel, GOLD)
    min_dist = min(d_orange, d_blue, d_gold)
    if min_dist > THRESHOLD:
        return None
    if min_dist == d_orange:
        return 'orange'
    if min_dist == d_blue:
        return 'blue'
    return 'gold'

def main(image_path):
    img = Image.open(image_path).convert('RGB')
    arr = np.array(img)
    total = arr.shape[0] * arr.shape[1]
    counts = {'orange': 0, 'blue': 0, 'gold': 0}
    for y in range(arr.shape[0]):
        for x in range(arr.shape[1]):
            cls = classify_pixel(tuple(arr[y, x]))
            if cls:
                counts[cls] += 1
    # Compute percentages
    for k in counts:
        percent = (counts[k] / total) * 100
        print(f"{k}: {percent:.2f}% ({counts[k]} / {total} pixels)")

if __name__ == '__main__':
    if len(sys.argv) != 2:
        print('Usage: python analyze_colors.py <image_path>')
        sys.exit(1)
    main(sys.argv[1])
