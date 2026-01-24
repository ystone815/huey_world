from PIL import Image, ImageDraw

def remove_background(input_path, output_path):
    img = Image.open(input_path).convert("RGBA")
    width, height = img.size
    
    # Target color (white/off-white) to remove from edges
    # We use flood fill from the corners
    data = img.getdata()
    
    # Use ImageDraw.floodfill to mark background
    # We'll create a mask
    mask = Image.new("L", (width, height), 0)
    
    # Fill from the four corners if they are close to white
    target_color = (255, 255, 255, 255)
    
    # Tolerance for "white"
    def is_white(rgba):
        return rgba[0] > 240 and rgba[1] > 240 and rgba[2] > 240
    
    # We'll use a flood fill on a copy to find the background
    bg_mask = Image.new("L", (width, height), 0)
    draw = ImageDraw.Draw(bg_mask)
    
    # Check corners
    corners = [(0, 0), (width-1, 0), (0, height-1), (width-1, height-1)]
    for x, y in corners:
        if is_white(img.getpixel((x, y))):
            ImageDraw.floodfill(img, (x, y), (0, 0, 0, 0), thresh=20)
            
    # The floodfill above actually modified the image.
    # We want to make sure the "filled" areas are truly transparent.
    # Pillow's floodfill with (0,0,0,0) on an RGBA image works if the image is in RGBA.
    
    img.save(output_path)
    print(f"Processed image saved to {output_path}")

if __name__ == "__main__":
    import sys
    if len(sys.argv) < 3:
        print("Usage: python remove_bg.py input.png output.png")
    else:
        remove_background(sys.argv[1], sys.argv[2])
