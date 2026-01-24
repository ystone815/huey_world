from PIL import Image

# Load the image
img = Image.open('static/assets/npc_roach2.png').convert('RGBA')
data = img.getdata()

print(f"Image size: {img.size}")
print(f"Corner pixel: {img.getpixel((0, 0))}")

# Remove white background
new_data = []
for item in data:
    r, g, b, a = item
    
    # Check if pixel is white or near-white
    if r > 240 and g > 240 and b > 240:
        # Make transparent
        new_data.append((0, 0, 0, 0))
    else:
        # Keep the pixel
        new_data.append(item)

img.putdata(new_data)
img.save('static/assets/npc_roach2.png')
print("Background removed and saved!")
