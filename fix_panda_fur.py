from PIL import Image
import os

def fix_panda_fur(image_path):
    try:
        img = Image.open(image_path).convert("RGBA")
        datas = img.getdata()

        new_data = []
        fixed_count = 0
        
        for item in datas:
            r, g, b, a = item
            # If the pixel is white (or near white) and fully transparent
            if r > 240 and g > 240 and b > 240 and a == 0:
                new_data.append((255, 255, 255, 255)) # Make it opaque white
                fixed_count += 1
            else:
                new_data.append(item)

        img.putdata(new_data)
        img.save(image_path, "PNG")
        print(f"Fixed {fixed_count} transparent white pixels in {image_path}")
    except Exception as e:
        print(f"Error processing {image_path}: {e}")

if __name__ == "__main__":
    fix_panda_fur("d:/HueyWorld/static/assets/skin_panda.png")
