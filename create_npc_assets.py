import zlib, struct, os

def make_png(width, height, pixels):
    # pixels is a list of [r, g, b, a]
    line_len = width * 4
    png_data = b"".join(b"\x00" + b"".join(struct.pack("4B", *p) for p in pixels[i*width:(i+1)*width]) for i in range(height))
    
    def chunk(type, data):
        return struct.pack(">I", len(data)) + type + data + struct.pack(">I", zlib.crc32(type + data) & 0xffffffff)

    return (b"\x89PNG\r\n\x1a\n" +
            chunk(b"IHDR", struct.pack(">2I5B", width, height, 8, 6, 0, 0, 0)) +
            chunk(b"IDAT", zlib.compress(png_data)) +
            chunk(b"IEND", b""))

def save_npc_roach(path):
    w, h = 32, 32
    pixels = [[0,0,0,0]] * (w * h)
    
    # Body (Dark Brown)
    for y in range(10, 22):
        for x in range(8, 24):
            pixels[y*w + x] = [101, 67, 33, 255]
            
    # Head 
    for y in range(6, 10):
        for x in range(12, 20):
            pixels[y*w + x] = [70, 40, 10, 255]
            
    # Legs (Black)
    for i in [-2, 0, 2]:
        for x in range(4, 28):
            y = 16 + i
            if x < 8 or x > 23:
                pixels[y*w + x] = [0, 0, 0, 255]
                
    # Antennae
    for i in range(2, 7):
        pixels[i*w + 13] = [0, 0, 0, 255]
        pixels[i*w + 18] = [0, 0, 0, 255]

    with open(path, "wb") as f:
        f.write(make_png(w, h, pixels))

def save_npc_sheep(path):
    w, h = 32, 32
    pixels = [[0,0,0,0]] * (w * h)
    
    # Fluffy Body (White/Grey)
    for y in range(8, 24):
        for x in range(6, 26):
            # Simple circle-like cloud
            dist = ((x-16)**2 + (y-16)**2)**0.5
            if dist < 10:
                pixels[y*w + x] = [255, 255, 255, 255]
            elif dist < 11:
                pixels[y*w + x] = [200, 200, 200, 255] # Outline
                
    # Face (Beige)
    for y in range(12, 18):
        for x in range(14, 18):
            pixels[y*w + x] = [245, 222, 179, 255]
            
    # Eyes
    pixels[14*w + 15] = [0, 0, 0, 255]
    pixels[14*w + 17] = [0, 0, 0, 255]

    with open(path, "wb") as f:
        f.write(make_png(w, h, pixels))

if __name__ == "__main__":
    roach_path = "static/assets/npc_roach.png"
    sheep_path = "static/assets/npc_sheep.png"
    save_npc_roach(roach_path)
    save_npc_sheep(sheep_path)
    print("NPC assets created successfully.")
