import os
from PIL import Image

# 1. Bypasses the "Decompression Bomb" warning for high-res Nikon files
Image.MAX_IMAGE_PIXELS = None

input_dir = "images/sigiriya/"
output_dir = "images/sigiriya_webp/"

if not os.path.exists(output_dir):
    os.makedirs(output_dir)

for filename in os.listdir(input_dir):
    # 2. Ignore hidden system files (like ._SS8_8890) and only process actual images
    if filename.startswith(".") or not filename.lower().endswith((".jpg", ".jpeg")):
        continue

    try:
        img = Image.open(os.path.join(input_dir, filename))

        # 3. Optional: Resize to 2500px width for better web performance
        if img.width > 2500:
            ratio = 2500 / float(img.width)
            new_height = int(float(img.height) * float(ratio))
            img = img.resize((2500, new_height), Image.Resampling.LANCZOS)

        clean_name = os.path.splitext(filename)[0]
        output_path = os.path.join(output_dir, f"{clean_name}.webp")

        # 4. Save as WebP (80 quality is perfect for wildlife detail)
        img.save(output_path, "webp", quality=80, optimize=True)
        print(f"Successfully converted: {filename}")

    except Exception as e:
        print(f"Skipping {filename}: {e}")
