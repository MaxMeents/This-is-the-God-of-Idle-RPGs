import os
import sys
from pathlib import Path
from PIL import Image

def convert_to_webp(root_dir):
    print(f"Starting WebP conversion in {root_dir}...")
    converted_count = 0
    error_count = 0
    skipped_count = 0

    for dirpath, dirnames, filenames in os.walk(root_dir):
        for filename in filenames:
            if filename.lower().endswith('.png'):
                png_path = Path(dirpath) / filename
                webp_path = png_path.with_suffix('.webp')

                # Skip if webp already exists and is newer? 
                # For now, just overwrite or skip if exists to save time if re-running
                if webp_path.exists():
                     # print(f"Skipping {filename}, WebP already exists.")
                     skipped_count += 1
                     continue

                try:
                    with Image.open(png_path) as img:
                        # Save as WebP, lossless for best quality/size balance for sprites
                        img.save(webp_path, 'WEBP', lossless=True, quality=100)
                        print(f"Converted: {png_path} -> {webp_path}")
                        converted_count += 1
                except Exception as e:
                    print(f"Error converting {png_path}: {e}")
                    error_count += 1

    print(f"\nMigration Complete.")
    print(f"Converted: {converted_count}")
    print(f"Skipped: {skipped_count}")
    print(f"Errors: {error_count}")

if __name__ == "__main__":
    # Default to current directory if no arg provided
    target_dir = sys.argv[1] if len(sys.argv) > 1 else "."
    convert_to_webp(target_dir)
