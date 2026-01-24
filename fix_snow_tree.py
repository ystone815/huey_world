from PIL import Image

# Load the snow tree image
img = Image.open('static/assets/snow_tree.png').convert('RGBA')
data = img.getdata()

print(f"Image size: {img.size}")
print(f"Corner pixel: {img.getpixel((0, 0))}")

# Remove white/light background
new_data = []
for item in data:
    r, g, b, a = item
    
    # Check if pixel is white or very light (near white)
    if r > 240 and g > 240 and b > 240:
        # Make transparent
        new_data.append((0, 0, 0, 0))
    else:
        # Keep the pixel
        new_data.append(item)

img.putdata(new_data)
img.save('static/assets/snow_tree.png')
print("Snow tree background removed and saved!")
