from PIL import Image
import os

def check_transparency(path):
    img = Image.open(path).convert("RGBA")
    data = img.getdata()
    
    transparent_white = 0
    opaque_white = 0
    total = len(data)
    
    for r, g, b, a in data:
        if r > 240 and g > 240 and b > 240:
            if a == 0:
                transparent_white += 1
            else:
                opaque_white += 1
                
    print(f"File: {path}")
    print(f"Total pixels: {total}")
    print(f"Transparent white pixels: {transparent_white}")
    print(f"Opaque white pixels: {opaque_white}")

if __name__ == "__main__":
    check_transparency("d:/HueyWorld/static/assets/skin_panda.png")
