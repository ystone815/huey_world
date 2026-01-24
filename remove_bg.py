from PIL import Image, ImageDraw

def remove_background(input_path, output_path, target_color=(255, 0, 255), tolerance=30):
    """
    Remove a specific background color from an image.
    
    Args:
        input_path: Path to input image
        output_path: Path to save output image
        target_color: RGB tuple of color to remove (default: magenta #FF00FF)
        tolerance: Color matching tolerance (0-255)
    """
    img = Image.open(input_path).convert("RGBA")
    data = img.getdata()
    
    new_data = []
    for item in data:
        r, g, b, a = item
        
        # Check if pixel matches target color within tolerance
        r_match = abs(r - target_color[0]) <= tolerance
        g_match = abs(g - target_color[1]) <= tolerance
        b_match = abs(b - target_color[2]) <= tolerance
        
        # Also check for magenta-tinted pixels (anti-aliasing artifacts)
        # Magenta has high R and B, but low G
        is_magenta_tinted = (r > 200 and b > 200 and g < 150) or \
                           (r + b > g * 2.5 and r > 100 and b > 100)
        
        if (r_match and g_match and b_match) or is_magenta_tinted:
            # Make this pixel transparent
            new_data.append((0, 0, 0, 0))
        else:
            # Keep the pixel as is
            new_data.append(item)
    
    img.putdata(new_data)
    img.save(output_path)
    print(f"Processed image saved to {output_path}")

if __name__ == "__main__":
    import sys
    if len(sys.argv) < 3:
        print("Usage: python remove_bg.py input.png output.png")
    else:
        remove_background(sys.argv[1], sys.argv[2])
