from PIL import Image
import os

def chroma_key(image_path, output_path, key_color=(255, 0, 255)):
    try:
        if not os.path.exists(image_path):
            print(f"File not found: {image_path}")
            return

        img = Image.open(image_path)
        img = img.convert("RGBA")
        datas = img.getdata()

        newData = []
        
        # Hue-based Logic for Magenta/Purple Removal
        # Magenta is Red + Blue. Green is the enemy.
        # Logic:
        # 1. Red must be > Green + margin
        # 2. Blue must be > Green + margin
        # 3. Red and Blue should be somewhat balanced (to avoid pure Red or pure Blue)
        
        margin = 20
        balance = 60 # Max difference between Red and Blue
        
        for item in datas:
            # item is (R, G, B, A)
            r, g, b = item[0], item[1], item[2]
            
            # Check if pixel is "Magenta-ish"
            # It implies R and B are dominant over G.
            
            is_magenta_ish = (
                r > g + margin and
                b > g + margin and
                abs(r - b) < balance
            )
            
            if is_magenta_ish:
                 newData.append((255, 255, 255, 0)) # Transparent
            else:
                 newData.append(item)

        img.putdata(newData)
        img.save(output_path, "PNG")
        print(f"Saved transparent image to {output_path}")
    except Exception as e:
        print(f"Error processing {image_path}: {e}")

base_dir = r"C:\Users\stone\.gemini\antigravity\brain\23f87ee4-dd39-4255-963b-8f1b033ffcbd"
target_dir = r"d:\HueyWorld\static\assets"

chroma_key(os.path.join(base_dir, "character_magenta_1768742880939.png"), os.path.join(target_dir, "character.png"))
chroma_key(os.path.join(base_dir, "tree_magenta_1768742898436.png"), os.path.join(target_dir, "tree.png"))
